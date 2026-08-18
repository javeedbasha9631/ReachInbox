import { google } from 'googleapis';
import { config } from '../config';
import prisma from '../db/prisma';

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function getGmailClient(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.refreshToken) {
    throw new Error('Gmail not authorized. Please sign in with Google again to grant email sending permission.');
  }

  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    'postmessage'
  );

  oauth2Client.setCredentials({
    refresh_token: user.refreshToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function createRawEmail(
  fromName: string,
  fromEmail: string,
  to: string,
  subject: string,
  htmlBody: string
): string {
  const message = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    htmlBody,
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendEmail(
  from: string,
  senderName: string,
  to: string,
  subject: string,
  body: string,
  userId?: string
): Promise<SendResult> {
  try {
    if (!userId) {
      throw new Error('User ID required for Gmail API');
    }

    const gmail = await getGmailClient(userId);
    const htmlBody = body.replace(/\n/g, '<br>');
    const fromEmail = config.gmail.user || from;
    const displayName = senderName || 'ReachInbox';

    const raw = createRawEmail(displayName, fromEmail, to, subject, `<div style="font-family: Arial, sans-serif;">${htmlBody}</div>`);

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log(`Email sent to ${to}, Gmail ID: ${result.data.id}`);
    return {
      success: true,
      messageId: result.data.id || 'unknown',
    };
  } catch (error) {
    const err = error as any;
    const message = err?.message || 'Unknown error';
    console.error(`Email send failed to ${to}:`, message);
    return {
      success: false,
      error: message,
    };
  }
}
