import { Redis } from '@upstash/redis';

/**
 * Better Auth secondary storage backed by Upstash Redis (REST).
 *
 * Better Auth uses secondary storage for session-related keys and rate limiting so
 * those reads/writes can stay off Postgres; durable rows remain in Neon.
 *
 * Set AUTH_SECONDARY_STORAGE=memory for tests so sessions never touch Upstash
 * and do not require a Postgres `session` table.
 *
 * @see https://www.better-auth.com/docs/concepts/database#secondary-storage
 */

type SecondaryStorage = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

type MemoryEntry = {
  value: string;
  expiresAt: number | null;
};

export function createMemorySecondaryStorage(): SecondaryStorage {
  const store = new Map<string, MemoryEntry>();

  return {
    async get(key: string): Promise<unknown> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt != null && Date.now() >= entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key: string, value: string, ttl?: number): Promise<void> {
      store.set(key, {
        value,
        expiresAt:
          ttl !== undefined ? Date.now() + ttl * 1000 : null,
      });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

export function createUpstashSecondaryStorage(): SecondaryStorage | undefined {
  if (process.env.AUTH_SECONDARY_STORAGE?.trim() === 'memory') {
    return createMemorySecondaryStorage();
  }

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
