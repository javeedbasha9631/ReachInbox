import { Resend } from 'resend';
import { config } from '../config';

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!config.resend.apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    _resend = new Resend(config.resend.apiKey);
  }
  return _resend;
}

export async function sendEmail(
  from: string,
  senderName: string,
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  try {
    const resend = getResend();
    const htmlBody = body.replace(/\n/g, '<br>');

    const fromAddress = config.resend.fromEmail || 'onboarding@resend.dev';
    const displayName = senderName || 'ReachInbox';
    const from = `${displayName} <${fromAddress}>`;

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html: `<div style="font-family: Arial, sans-serif;">${htmlBody}</div>`,
    });

    if (error) {
      console.error(`Resend email failed to ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`Email sent to ${to}, ID: ${data?.id}`);
    return {
      success: true,
      messageId: data?.id || 'unknown',
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
