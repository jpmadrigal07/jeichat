import { Redis } from '@upstash/redis';

const WINDOW_MS = 10_000;
const MAX_HITS = 60;

export class BotRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly redis: Redis | null;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    this.redis = url && token ? new Redis({ url, token }) : null;
  }

  async consume(botId: string): Promise<boolean> {
    if (this.redis) {
      const key = `bot-rl:${botId}`;
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.pexpire(key, WINDOW_MS);
      }
      return count <= MAX_HITS;
    }

    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const recent = (this.hits.get(botId) ?? []).filter(
      (at) => at > windowStart,
    );
    if (recent.length >= MAX_HITS) {
      this.hits.set(botId, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(botId, recent);
    return true;
  }
}
