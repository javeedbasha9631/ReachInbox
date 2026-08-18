require('dotenv').config();
const Redis = require('ioredis');

async function check() {
  const redis = new Redis({ host: 'localhost', port: 6380 });
  
  // Check if any jobs are waiting/active/delayed
  const keys = await redis.keys('bull:emailQueue:*');
  console.log('All bull keys:', keys.length);
  
  for (const key of keys.sort()) {
    const type = await redis.type(key);
    let info = '';
    if (type === 'list') {
      const len = await redis.llen(key);
      info = ` (list, ${len} items)`;
      if (len > 0 && len <= 3) {
        const items = await redis.lrange(key, 0, -1);
        info += ` items: ${items.map(i => i.substring(0, 80)).join(', ')}`;
      }
    } else if (type === 'set') {
      const members = await redis.smembers(key);
      info = ` (set, ${members.length} members)`;
    } else if (type === 'zset') {
      const count = await redis.zcard(key);
      info = ` (zset, ${count} members)`;
    }
    console.log(key + info);
  }
  
  redis.disconnect();
}

check().catch(e => { console.error(e.message); process.exit(1); });
