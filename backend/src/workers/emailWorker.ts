import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { config } from '../config';
import prisma from '../db/prisma';
import { sendEmail } from '../services/email';
import { RateLimiter } from '../services/rateLimiter';
import { EmailJobData } from '../types';
import { getEmailQueue } from '../queues/emailQueue';

let _worker: Worker | null = null;
let _safetyInterval: ReturnType<typeof setInterval> | null = null;

const STUCK_TIMEOUT_MS = 2 * 60 * 1000;
const SAFETY_POLL_MS = 15 * 1000;

export async function recoverStuckEmails(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STUCK_TIMEOUT_MS);
    const stuck = await prisma.email.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: cutoff },
      },
    });

    if (stuck.length === 0) return;

    console.log(`Recovering ${stuck.length} stuck PROCESSING email(s)`);

    for (const email of stuck) {
      try {
        const queue = getEmailQueue();
        const bullJobId = `email-${email.id}-recovery-${Date.now()}`;
        await queue.add('send-email', {
          emailId: email.id,
          userId: email.userId,
          senderId: email.senderId,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          hourlyLimit: email.hourlyLimit,
          delayMs: email.delayMs,
          senderName: 'ReachInbox',
        } as EmailJobData, {
          delay: 0,
          jobId: bullJobId,
          removeOnComplete: 100,
          removeOnFail: 200,
        });

        await prisma.email.update({
          where: { id: email.id },
          data: { status: 'SCHEDULED', jobId: bullJobId },
        });

        console.log(`Re-queued stuck email ${email.id}`);
      } catch (err) {
        console.error(`Failed to recover email ${email.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to recover stuck emails:', err);
  }
}

async function processDirectly(emailId: string): Promise<void> {
  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email || email.status !== 'SCHEDULED') return;

  const now = Date.now();
  const scheduledMs = email.scheduledAt.getTime();
  if (scheduledMs > now) return;

  console.log(`Direct-send: processing overdue email ${emailId}`);

  await prisma.email.update({
    where: { id: emailId },
    data: { status: 'PROCESSING', attempts: { increment: 1 } },
  });

  const rateLimiter = new RateLimiter(createRedisConnection());
  const rateCheck = await rateLimiter.canSend(email.senderId, email.hourlyLimit);
  if (!rateCheck.allowed) {
    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'SCHEDULED' },
    });
    console.log(`Direct-send: rate limited for ${emailId}, will retry later`);
    return;
  }

  try {
    const result = await Promise.race([
      sendEmail(
        config.gmail.user,
        'ReachInbox',
        email.recipient,
        email.subject,
        email.body
      ),
      new Promise<{ success: false; error: string }>((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout after 30s')), 30000)
      ),
    ]);

    if (result.success) {
      await rateLimiter.increment(email.senderId);
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'SENT', sentAt: new Date(), error: null },
      });
      console.log(`Direct-send: email ${emailId} sent to ${email.recipient}`);
    } else {
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'FAILED', error: result.error || 'Send failed' },
      });
      console.error(`Direct-send: email ${emailId} failed: ${result.error}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Send failed';
    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'FAILED', error: errMsg },
    });
    console.error(`Direct-send: email ${emailId} threw: ${errMsg}`);
  }
}

async function safetyNetPoll(): Promise<void> {
  try {
    const overdue = await prisma.email.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    if (overdue.length > 0) {
      console.log(`Safety net: found ${overdue.length} overdue email(s)`);
    }

    for (const email of overdue) {
      await processDirectly(email.id);
    }
  } catch (err) {
    console.error('Safety net poll error:', err);
  }
}

async function recoverAndProcess(): Promise<void> {
  await recoverStuckEmails();
  await safetyNetPoll();
}

export function getEmailWorker(): Worker | null {
  return _worker;
}

export async function startEmailWorker(): Promise<Worker> {
  await recoverAndProcess();

  const connection = createRedisConnection();
  const rateLimiter = new RateLimiter(connection);

  _worker = new Worker(
    'emailQueue',
    async (job: Job<EmailJobData>) => {
      const {
        emailId,
        recipient,
        subject,
        body,
        senderId,
        hourlyLimit,
        senderName,
      } = job.data;

      console.log(`Processing email job ${job.id} for ${recipient}`);

      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        console.error(`Email record not found for job ${job.id}`);
        return { skipped: true, reason: 'record_not_found' };
      }

      if (emailRecord.status === 'SENT') {
        console.log(`Email ${emailId} already sent. Skipping.`);
        return { skipped: true, reason: 'already_sent' };
      }

      if (emailRecord.status === 'PROCESSING') {
        const timeSinceUpdate = Date.now() - emailRecord.updatedAt.getTime();
        if (timeSinceUpdate < 60000) {
          console.log(`Email ${emailId} is being processed by another worker. Skipping.`);
          return { skipped: true, reason: 'already_processing' };
        }
      }

      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

      const rateCheck = await rateLimiter.canSend(senderId, hourlyLimit);
      if (!rateCheck.allowed) {
        console.log(`Rate limit reached for sender ${senderId}. Rescheduling job.`);
        await prisma.email.update({
          where: { id: emailId },
          data: { status: 'SCHEDULED' },
        });

        const retryDelayMs = rateCheck.retryAfterMs || 3600000;
        const queue = getEmailQueue();
        await queue.add(`reschedule-${emailId}`, job.data, {
          delay: retryDelayMs,
          jobId: `email-${emailId}-reschedule-${Date.now()}`,
          removeOnComplete: 100,
          removeOnFail: 200,
        });

        console.log(`Email ${emailId} rescheduled for ${retryDelayMs}ms from now`);
        return { rescheduled: true, retryAfterMs: retryDelayMs };
      }

      const fromEmail = config.gmail.user;

      let result;
      try {
        result = await Promise.race([
          sendEmail(
            fromEmail,
            senderName || 'ReachInbox',
            recipient,
            subject,
            body
          ),
          new Promise<{ success: false; error: string }>((_, reject) =>
            setTimeout(() => reject(new Error('SMTP timeout after 30s')), 30000)
          ),
        ]);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Send failed';
        console.error(`Email ${emailId} send threw: ${errMsg}`);
        await prisma.email.update({
          where: { id: emailId },
          data: { status: 'FAILED', error: errMsg },
        });
        return { success: false, error: errMsg };
      }

      if (result.success) {
        await rateLimiter.increment(senderId);
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            error: null,
          },
        });
        console.log(`Email ${emailId} sent successfully to ${recipient}`);
        return { success: true, messageId: result.messageId };
      } else {
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            error: result.error || 'Unknown error',
          },
        });
        console.error(`Email ${emailId} failed: ${result.error}`);
        return { success: false, error: result.error };
      }
    },
    {
      connection,
      concurrency: config.workerConcurrency,
    }
  );

  _worker.on('failed', async (job, error) => {
    if (!job) return;
    console.error(`Job ${job.id} failed for email ${job.data.emailId}:`, error.message);
    try {
      await prisma.email.update({
        where: { id: job.data.emailId },
        data: { status: 'FAILED', error: error.message },
      });
    } catch {}
  });

  _worker.on('completed', (job, result) => {
    if (result && typeof result === 'object' && 'rescheduled' in result) {
      return;
    }
    console.log(`Job ${job.id} completed for email ${job.data.emailId}`);
  });

  _safetyInterval = setInterval(() => {
    recoverAndProcess().catch((err) => {
      console.error('Safety net error:', err);
    });
  }, SAFETY_POLL_MS);

  console.log(`Email worker started with concurrency ${config.workerConcurrency}`);
  console.log(`Safety net polling every ${SAFETY_POLL_MS / 1000}s`);
  return _worker;
}

export async function stopEmailWorker(): Promise<void> {
  if (_safetyInterval) {
    clearInterval(_safetyInterval);
    _safetyInterval = null;
  }
  if (_worker) {
    await _worker.close();
    _worker = null;
    console.log('Email worker stopped');
  }
}
