import '../load-env';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { betterAuth } from 'better-auth';
import Sqlite from 'better-sqlite3';
import type { Pool } from 'pg';
import { getSharedPgPool } from '../database/shared-pg-pool';
import { createUpstashSecondaryStorage } from './redis-secondary-storage';

/**
 * Better Auth database layout:
 *
 * - **Primary adapter — Neon Postgres:** set `DATABASE_URL` (or `POSTGRES_URL`) to your connection string.
 *   Uses the same `pg` pool as {@link DrizzleService} via {@link getSharedPgPool} (one pool in-process).
 * - **Secondary storage — Upstash Redis:** set `UPSTASH_REDIS_REST_URL` and
 *   `UPSTASH_REDIS_REST_TOKEN`. Better Auth uses this for session keys and rate-limit
 *   counters (read-heavy paths hit Redis; see Better Auth "Secondary storage" docs).
 *
 * Without `DATABASE_URL`, local development falls back to SQLite under `data/auth.db`;
 * tests use in-memory SQLite unless `DATABASE_URL` is set.
 */

function resolveSecret(): string {
  const fromEnv = process.env.BETTER_AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test-secret-at-least-32-characters-long!!';
  }
  throw new Error(
    'Set BETTER_AUTH_SECRET to a random string of at least 32 characters (e.g. openssl rand -base64 32).',
  );
}

function resolveDatabase(): Pool | InstanceType<typeof Sqlite> {
  const connectionString =
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();

  if (connectionString) {
    const maxRaw = process.env.PG_POOL_MAX;
    const max = maxRaw != null ? Number(maxRaw) : 20;
    return getSharedPgPool({
      connectionString,
      max: Number.isFinite(max) && max > 0 ? max : 20,
    });
  }

  if (process.env.NODE_ENV === 'test') {
    return new Sqlite(':memory:');
  }

  const authDbPath =
    process.env.AUTH_DB_PATH ?? resolve(process.cwd(), 'data', 'auth.db');

  const dir = dirname(authDbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return new Sqlite(authDbPath);
}

const secondaryStorage = createUpstashSecondaryStorage();

export const auth = betterAuth({
  secret: resolveSecret(),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  trustedOrigins: (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  database: resolveDatabase(),
  ...(secondaryStorage ? { secondaryStorage } : {}),
  emailAndPassword: {
    enabled: true,
  },
});
