require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.email.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }).then(r => {
  r.forEach(e => console.log(e.status, '|', e.recipient, '|', e.sentAt || 'no sentAt', '|', e.error || ''));
  p.$disconnect();
});
