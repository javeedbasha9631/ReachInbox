require('dotenv').config();
const https = require('https');

function brevoApi(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.brevo.com',
      path: path,
      method: method,
      headers: {
        'Accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Check account info
  console.log('=== Account Info ===');
  try {
    const account = await brevoApi('GET', '/v3/account');
    console.log('Company:', account.companyName);
    console.log('Email:', account.email);
    console.log('Plan:', JSON.stringify(account.plan));
    console.log('Relay:', JSON.stringify(account.relay));
    console.log('SMS:', JSON.stringify(account.sms));
    console.log('Transactional:', JSON.stringify(account.transactionalEmails));
  } catch (e) { console.log('Error:', e.message); }

  // Check SMTP stats
  console.log('\n=== SMTP Statistics ===');
  try {
    const stats = await brevoApi('GET', '/v3/smtp/statistics');
    console.log(JSON.stringify(stats, null, 2));
  } catch (e) { console.log('Error:', e.message); }

  // Check email campaigns / blocked
  console.log('\n=== Sender Emails ===');
  try {
    const senders = await brevoApi('GET', '/v3/senders');
    console.log(JSON.stringify(senders, null, 2));
  } catch (e) { console.log('Error:', e.message); }
}

main();
