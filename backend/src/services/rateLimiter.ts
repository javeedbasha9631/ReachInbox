import Redis from 'ioredis';

const RATE_LIMIT_PREFIX = 'rate-limit';

export class RateLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  private getWindowKey(senderId: string, date: Date): string {
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const dateStr = date.toISOString().split('T')[0];
    return `${RATE_LIMIT_PREFIX}:${senderId}:${dateStr}T${hour}`;
  }

  async getCurrentCount(senderId: string): Promise<number> {
    const key = this.getWindowKey(senderId, new Date());
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async increment(senderId: string): Promise<number> {
    const key = this.getWindowKey(senderId, new Date());
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 7200);
    }
    return count;
  }

  async canSend(senderId: string, hourlyLimit: number): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const currentCount = await this.getCurrentCount(senderId);

    if (currentCount >= hourlyLimit) {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
      const retryAfterMs = nextHour.getTime() - now.getTime();

      return { allowed: false, retryAfterMs };
    }

    return { allowed: true };
  }
}
