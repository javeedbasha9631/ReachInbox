import { Request, Response } from 'express';
import prisma from '../db/prisma';

export async function getSenders(_req: Request, res: Response): Promise<void> {
  try {
    const senders = await prisma.sender.findMany({
      select: {
        id: true,
        email: true,
        smtpHost: true,
        smtpPort: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: senders });
  } catch (error) {
    console.error('Get senders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch senders' });
  }
}

export async function createSender(req: Request, res: Response): Promise<void> {
  try {
    const { email, smtpHost, smtpPort, smtpUser, smtpPassword } = req.body;

    if (!email || !smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      res.status(400).json({ success: false, error: 'All fields are required' });
      return;
    }

    const sender = await prisma.sender.create({
      data: {
        email,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPassword,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: sender.id,
        email: sender.email,
        smtpHost: sender.smtpHost,
        smtpPort: sender.smtpPort,
        createdAt: sender.createdAt,
      },
    });
  } catch (error) {
    console.error('Create sender error:', error);
    res.status(500).json({ success: false, error: 'Failed to create sender' });
  }
}
