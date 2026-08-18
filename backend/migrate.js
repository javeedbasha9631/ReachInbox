const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$executeRawUnsafe('ALTER TABLE "Email" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT')
  .then(r => { console.log('Column added:', r); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
