import nodemailer from 'nodemailer';
import { config } from '../config';

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    if (!config.gmail.user || !config.gmail.appPassword) {
      throw new Error('Gmail SMTP credentials not configured (GMAIL_USER / GMAIL_APP_PASSWORD)');
    }
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.appPassword,
      },
    });
  }
  return _transporter;
}

export async function sendEmail(
  from: string,
  senderName: string,
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  try {
    const transporter = getTransporter();
    const htmlBody = body.replace(/\n/g, '<br>');

    const info = await transporter.sendMail({
      from: `"${senderName || 'ReachInbox'}" <${config.gmail.user}>`,
      to,
      subject,
      html: `<div style="font-family: Arial, sans-serif;">${htmlBody}</div>`,
    });

    console.log(`Email sent to ${to}, Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const err = error as Error;
    console.error(`Email send failed to ${to}:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}
