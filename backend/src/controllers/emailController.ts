import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { addEmailJob } from '../queues/emailQueue';
import { config } from '../config';
import { ScheduleEmailRequest } from '../types';
import { retryEmail } from '../workers/emailWorker';

export async function scheduleEmails(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }



    const {
      subject,
      body,
      recipients,
      startTime,
      delayBetweenEmails,
      hourlyLimit,
      senderName,
    }: ScheduleEmailRequest = req.body;

    if (!subject || !subject.trim()) {
      res.status(400).json({ success: false, error: 'Subject is required' });
      return;
    }
    if (!body || !body.trim()) {
      res.status(400).json({ success: false, error: 'Body is required' });
      return;
    }
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ success: false, error: 'At least one recipient is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipients.filter((r: string) => emailRegex.test(r));
    if (validRecipients.length === 0) {
      res.status(400).json({ success: false, error: 'No valid email addresses found' });
      return;
    }

    const seen = new Set<string>();
    const uniqueRecipients: string[] = [];
    for (const r of validRecipients) {
      const key = r.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecipients.push(r);
      }
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid start time' });
      return;
    }

    const delay = Number(delayBetweenEmails) || config.defaultDelayMs;
    const limit = Number(hourlyLimit) || config.maxEmailsPerHourPerSender;

    if (delay < 0) {
      res.status(400).json({ success: false, error: 'Delay must be non-negative' });
      return;
    }
    if (limit <= 0) {
      res.status(400).json({ success: false, error: 'Hourly limit must be positive' });
      return;
    }

    let defaultSender = await prisma.sender.findFirst();
    if (!defaultSender) {
      defaultSender = await prisma.sender.create({
        data: {
          email: config.gmail.user,
          smtpHost: 'gmail-api',
          smtpPort: 443,
          smtpUser: config.gmail.user,
          smtpPassword: 'gmail-api',
        },
      });
    }

    const now = Date.now();
    const startMs = start.getTime();
    const baseDelay = Math.max(0, startMs - now);

    const createdEmails = [];

    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i];

      const emailRecord = await prisma.email.create({
        data: {
          userId: req.user.id,
          senderId: defaultSender.id,
          recipient,
          subject: subject.trim(),
          body: body.trim(),
          scheduledAt: new Date(startMs + i * delay),
          jobId: `pending-${Date.now()}-${i}-${recipient}`,
          hourlyLimit: limit,
          delayMs: delay,
        },
      });

      const jobDelay = baseDelay + i * delay;

      const bullJobId = await addEmailJob(
        {
          emailId: emailRecord.id,
          userId: req.user.id,
          senderId: defaultSender.id,
          recipient,
          subject: subject.trim(),
          body: body.trim(),
          hourlyLimit: limit,
          delayMs: delay,
          senderName: senderName || req.user.name || 'ReachInbox',
        },
        jobDelay
      );

      await prisma.email.update({
        where: { id: emailRecord.id },
        data: { jobId: bullJobId },
      });

      createdEmails.push({ ...emailRecord, jobId: bullJobId });
    }

    res.status(201).json({
      success: true,
      data: {
        emails: createdEmails,
        totalScheduled: createdEmails.length,
      },
      message: `${createdEmails.length} emails scheduled successfully`,
    });
  } catch (error) {
    console.error('Schedule emails error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to schedule emails';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function getScheduledEmails(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const emails = await prisma.email.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['SCHEDULED', 'PROCESSING'] },
      },
      include: { sender: { select: { id: true, email: true } } },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ success: true, data: emails });
  } catch (error) {
    console.error('Get scheduled emails error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch scheduled emails';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function getSentEmails(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const emails = await prisma.email.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['SENT', 'FAILED'] },
      },
      include: { sender: { select: { id: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: emails });
  } catch (error) {
    console.error('Get sent emails error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch sent emails';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function getHistoryEmails(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const emails = await prisma.email.findMany({
      where: { userId: req.user.id },
      include: { sender: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: emails.length,
      scheduled: emails.filter((e) => e.status === 'SCHEDULED').length,
      processing: emails.filter((e) => e.status === 'PROCESSING').length,
      sent: emails.filter((e) => e.status === 'SENT').length,
      failed: emails.filter((e) => e.status === 'FAILED').length,
    };

    res.json({ success: true, data: { emails, stats } });
  } catch (error) {
    console.error('Get history emails error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch email history';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function deleteEmail(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const email = await prisma.email.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!email) {
      res.status(404).json({ success: false, error: 'Email not found' });
      return;
    }

    if (email.status === 'SCHEDULED' || email.status === 'PROCESSING') {
      res.status(400).json({ success: false, error: 'Cannot delete scheduled emails. Cancel them first.' });
      return;
    }

    await prisma.email.delete({ where: { id } });
    res.json({ success: true, message: 'Email deleted' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete email' });
  }
}

export async function clearHistory(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const result = await prisma.email.deleteMany({
      where: {
        userId: req.user.id,
        status: { in: ['SENT', 'FAILED'] },
      },
    });

    res.json({ success: true, message: `Cleared ${result.count} email(s) from history` });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear history' });
  }
}

export async function retryEmailById(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const email = await prisma.email.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!email) {
      res.status(404).json({ success: false, error: 'Email not found' });
      return;
    }

    if (email.status !== 'FAILED') {
      res.status(400).json({ success: false, error: 'Only failed emails can be retried' });
      return;
    }

    const result = await retryEmail(id);

    if (result.success) {
      const updated = await prisma.email.findUnique({
        where: { id },
        include: { sender: { select: { id: true, email: true } } },
      });
      res.json({ success: true, data: updated, message: 'Email retry successful' });
    } else {
      const updated = await prisma.email.findUnique({
        where: { id },
        include: { sender: { select: { id: true, email: true } } },
      });
      res.json({ success: false, data: updated, error: result.error || 'Retry failed' });
    }
  } catch (error) {
    console.error('Retry email error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to retry email';
    res.status(500).json({ success: false, error: msg });
  }
}

export async function getEmailById(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const email = await prisma.email.findFirst({
      where: { id, userId: req.user.id },
      include: { sender: { select: { id: true, email: true } } },
    });

    if (!email) {
      res.status(404).json({ success: false, error: 'Email not found' });
      return;
    }

    res.json({ success: true, data: email });
  } catch (error) {
    console.error('Get email by id error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email' });
  }
}
