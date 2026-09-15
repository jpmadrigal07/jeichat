import { createServer } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import {
  sessionE2eMetaPath,
  type SessionE2eMeta,
} from './helpers/session-e2e-meta';

const API_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(API_ROOT, '../..');
const MIGRATIONS_FOLDER = join(API_ROOT, 'src/database/drizzle');

function readRootEnvFile(): Record<string, string> {
  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return {};
  return parse(readFileSync(envPath));
}

function assertSafeTestDatabaseUrl(testUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(testUrl);
  } catch {
    throw new Error(`TEST_DATABASE_URL is not a valid URL: ${testUrl}`);
  }

  const prodUrl = readRootEnvFile().DATABASE_URL?.trim();
  if (prodUrl && testUrl === prodUrl) {
    throw new Error(
      'TEST_DATABASE_URL must not equal .env DATABASE_URL. Use a disposable jeichat_test database.',
    );
  }

  const host = parsed.hostname;
  const local = host === 'localhost' || host === '127.0.0.1';
  if (!local && process.env.CI !== 'true') {
    throw new Error(
      `TEST_DATABASE_URL host must be localhost or 127.0.0.1 (got ${host}). Set CI=true to override.`,
    );
  }
}

function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to bind an ephemeral port'));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) reject(error);
        else resolvePort(port);
      });
    });
  });
}

async function waitForHttp(url: string, timeoutMs: number) {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(
    `API did not become ready at ${url}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function migrateTestDatabase(connectionString: string) {
  const pool = new Pool({ connectionString });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}

function spawnApi(env: NodeJS.ProcessEnv): ChildProcess {
  return spawn('bun', ['dist/main.js'], {
    cwd: API_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export default async function globalSetup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!testDatabaseUrl) {
    throw new Error(
      'TEST_DATABASE_URL is required to start session e2e (the runner should skip before Jest when unset locally).',
    );
  }

  assertSafeTestDatabaseUrl(testDatabaseUrl);
  await migrateTestDatabase(testDatabaseUrl);

  const { execSync } = await import('node:child_process');
  execSync('bun run build', { cwd: API_ROOT, stdio: 'inherit' });

  const port = await getFreePort();
  const origin = `http://127.0.0.1:${port}`;
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const creatorEmails = [
    `owner-a-${runId}@session-e2e.test`,
    `owner-b-${runId}@session-e2e.test`,
  ];

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: testDatabaseUrl,
    POSTGRES_URL: '',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
    AUTH_SECONDARY_STORAGE: 'memory',
    R2_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET: 'jeichat-attachments-test',
    R2_ENDPOINT: 'https://test-account-id.r2.cloudflarestorage.com',
    R2_REGION: 'auto',
    BETTER_AUTH_URL: origin,
    WEB_ORIGIN: origin,
    AUTH_COOKIE_DOMAIN: 'false',
    WORKSPACE_CREATOR_EMAILS: creatorEmails.join(','),
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: '',
    BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long!!',
    NODE_ENV: 'test',
  };

  const child = spawnApi(childEnv);
  child.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(chunk);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(chunk);
  });

  const meta: SessionE2eMeta = {
    baseUrl: origin,
    origin,
    port,
    pid: child.pid ?? 0,
    runId,
    creatorEmails,
  };

  try {
    await waitForHttp(origin, 30_000);
  } catch (error) {
    if (child.pid) {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        // already exited
      }
    }
    throw error;
  }

  writeFileSync(sessionE2eMetaPath(), JSON.stringify(meta), 'utf8');
}
