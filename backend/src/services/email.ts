import { config } from '../config';
import prisma from '../db/prisma';

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function getAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.refreshToken) {
    throw new Error('Gmail not authorized. Please sign in with Google again to grant email sending permission.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      refresh_token: user.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to get access token');
  }

  return data.access_token;
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

    const accessToken = await getAccessToken(userId);
    const htmlBody = body.replace(/\n/g, '<br>');
    const fromEmail = config.gmail.user || from;
    const displayName = senderName || 'ReachInbox';

    const raw = createRawEmail(displayName, fromEmail, to, subject, `<div style="font-family: Arial, sans-serif;">${htmlBody}</div>`);

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      }
    );

    const data = await response.json() as any;
    if (!response.ok) {
      const msg = data.error?.message || 'Gmail API send failed';
      console.error(`Email send failed to ${to}:`, msg);
      return { success: false, error: msg };
    }

    console.log(`Email sent to ${to}, Gmail ID: ${data.id}`);
    return { success: true, messageId: data.id || 'unknown' };
  } catch (error) {
    const err = error as Error;
    console.error(`Email send failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}
