import { Redis } from '@upstash/redis';

/**
 * Better Auth secondary storage backed by Upstash Redis (REST).
 *
 * Better Auth uses secondary storage for session-related keys and rate limiting so
 * those reads/writes can stay off Postgres; durable rows remain in Neon.
 *
 * @see https://www.better-auth.com/docs/concepts/database#secondary-storage
 */
export function createUpstashSecondaryStorage() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return undefined;
  }

  const redis = new Redis({ url, token });

  return {
    async get(key: string): Promise<unknown> {
      try {
        const value = await redis.get(key);
        if (value === null || value === undefined) {
          return null;
        }
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      } catch (error) {
        console.error('[better-auth] Redis get error:', error);
        return null;
      }
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      try {
        const stringValue =
          typeof value === 'string' ? value : JSON.stringify(value);
        if (ttl !== undefined) {
          await redis.set(key, stringValue, { ex: ttl });
        } else {
          await redis.set(key, stringValue);
        }
      } catch (error) {
        console.error('[better-auth] Redis set error:', error);
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      try {
        await redis.del(key);
      } catch (error) {
        console.error('[better-auth] Redis delete error:', error);
        throw error;
      }
    },
  };
}
