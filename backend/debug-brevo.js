require('dotenv').config();
const { BrevoClient } = require('@getbrevo/brevo');

async function test() {
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  
  // Test 1: Basic send
  console.log('--- TEST 1: Direct Brevo Send ---');
  try {
    const r = await client.transactionalEmails.sendTransacEmail({
      subject: 'ReachInbox Debug Test',
      htmlContent: '<html><body><h3>Debug Test</h3><p>This is a debug test email sent at ' + new Date().toISOString() + '</p></body></html>',
      sender: { email: process.env.BREVO_FROM_EMAIL, name: 'ReachInbox Debug' },
      to: [{ email: 'javidbasha7869@gmail.com' }],
    });
    console.log('Response:', JSON.stringify(r, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
    console.log('Body:', JSON.stringify(e.response?.body || e.body || 'none'));
  }
  
  // Test 2: Check account info
  console.log('\n--- TEST 2: Account Info ---');
  try {
    const account = await client.account.getSMTPKeyInformation();
    console.log('SMTP Key info:', JSON.stringify(account, null, 2));
  } catch (e) {
    console.log('Account error:', e.message);
  }
  
  // Test 3: Check blocked contacts
  console.log('\n--- TEST 3: Check for blocks ---');
  try {
    const blocked = await client.contacts.getBlockedContacts({ email: 'javidbasha7869@gmail.com' });
    console.log('Blocked:', JSON.stringify(blocked, null, 2));
  } catch (e) {
    console.log('Block check error:', e.message);
  }
}

test();
