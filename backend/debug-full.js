require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { BrevoClient } = require('@getbrevo/brevo');

async function main() {
  const p = new PrismaClient();
  
  // Show all emails with details
  const emails = await p.email.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  console.log('=== Recent Emails ===');
  for (const e of emails) {
    console.log(`${e.status} | ${e.recipient} | created: ${e.createdAt.toISOString()} | sent: ${e.sentAt ? e.sentAt.toISOString() : 'N/A'} | attempts: ${e.attempts} | error: ${e.error || 'none'}`);
  }
  
  // Send a fresh test email
  console.log('\n=== Sending Fresh Test ===');
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  try {
    const r = await client.transactionalEmails.sendTransacEmail({
      subject: 'Fresh Test - ReachInbox ' + new Date().toISOString(),
      htmlContent: '<html><body><h2>Fresh Test Email</h2><p>Sent at: ' + new Date().toISOString() + '</p><p>If you receive this, Brevo is working.</p></body></html>',
      sender: { email: process.env.BREVO_FROM_EMAIL, name: 'ReachInbox Test' },
      to: [{ email: 'javidbasha7869@gmail.com' }],
    });
    console.log('SUCCESS - messageId:', r.messageId);
  } catch (e) {
    console.log('FAILED:', e.message);
  }
  
  await p.$disconnect();
}

main();
