require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
  console.log('Gmail User:', process.env.GMAIL_USER);
  console.log('App Password:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"ReachInbox Test" <' + process.env.GMAIL_USER + '>',
      to: process.env.GMAIL_USER,
      subject: 'Gmail SMTP Test - ' + new Date().toISOString(),
      html: '<h2>Test Email</h2><p>If you receive this, Gmail SMTP is working correctly.</p><p>Sent at: ' + new Date().toISOString() + '</p>',
    });
    console.log('SUCCESS! Message ID:', info.messageId);
    console.log('Response:', JSON.stringify(info, null, 2));
  } catch (e) {
    console.log('FAILED:', e.message);
    console.log('Full error:', JSON.stringify(e, null, 2));
  }
}

test();
