import { Redis } from '@upstash/redis';

export type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxHits: number;
};

const BOT_LIMIT: RateLimitOptions = {
  keyPrefix: 'bot-rl',
  windowMs: 10_000,
  maxHits: 60,
};

/** Fixed-window limiter; Redis-backed when Upstash is configured so limits hold across instances. */
export class BotRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly redis: Redis | null;

  constructor(private readonly options: RateLimitOptions = BOT_LIMIT) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    this.redis = url && token ? new Redis({ url, token }) : null;
  }

  async consume(id: string): Promise<boolean> {
    const { keyPrefix, windowMs, maxHits } = this.options;
    if (this.redis) {
      const key = `${keyPrefix}:${id}`;
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.pexpire(key, windowMs);
      }
      return count <= maxHits;
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = (this.hits.get(id) ?? []).filter((at) => at > windowStart);
    if (recent.length >= maxHits) {
      this.hits.set(id, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(id, recent);
    return true;
  }
}
