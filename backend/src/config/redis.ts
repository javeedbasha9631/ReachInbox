import Redis from 'ioredis';
import { config } from './index';

export function createRedisConnection(): Redis {
  const isUpstash = config.redis.host.includes('upstash.io');

  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null,
    tls: isUpstash ? { checkServerIdentity: () => undefined } : undefined,
  });
}
