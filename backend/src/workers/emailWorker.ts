import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { config } from '../config';
import prisma from '../db/prisma';
import { sendEmail } from '../services/email';
import { RateLimiter } from '../services/rateLimiter';
import { EmailJobData } from '../types';
import { getEmailQueue } from '../queues/emailQueue';

let _worker: Worker | null = null;

const STUCK_TIMEOUT_MS = 5 * 60 * 1000;

export async function recoverStuckEmails(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STUCK_TIMEOUT_MS);
    const stuck = await prisma.email.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: cutoff },
      },
      data: { status: 'SCHEDULED' },
    });
    if (stuck.count > 0) {
      console.log(`Recovered ${stuck.count} stuck PROCESSING email(s) back to SCHEDULED`);
    }
  } catch (err) {
    console.error('Failed to recover stuck emails:', err);
  }
}

export function getEmailWorker(): Worker | null {
  return _worker;
}

export async function startEmailWorker(): Promise<Worker> {
  await recoverStuckEmails();

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

  console.log(`Email worker started with concurrency ${config.workerConcurrency}`);
  return _worker;
}

export async function stopEmailWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    console.log('Email worker stopped');
  }
}
