import { existsSync, readFileSync } from 'node:fs';
import request from 'supertest';
import { Pool } from 'pg';
import { io, type Socket } from 'socket.io-client';
import {
  sessionE2eMetaPath,
  type SessionE2eMeta,
} from './session-e2e-meta';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type SessionAgent = {
  agent: ReturnType<typeof request.agent>;
  user: SessionUser;
  cookieHeader: string;
};

let cachedMeta: SessionE2eMeta | null = null;

export function loadSessionE2eMeta(): SessionE2eMeta {
  if (cachedMeta) return cachedMeta;
  const path = sessionE2eMetaPath();
  if (!existsSync(path)) {
    throw new Error(
      `Session e2e meta missing at ${path}. Did globalSetup start the API?`,
    );
  }
  cachedMeta = JSON.parse(readFileSync(path, 'utf8')) as SessionE2eMeta;
  return cachedMeta;
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function guestEmail(): string {
  return `guest-${uniqueSuffix()}@session-e2e.test`;
}

export async function resetPublicTables(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL?.trim();
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required to reset session e2e tables');
  }

  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query<{ tablename: string }>(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename <> '__drizzle_migrations'`,
    );
    if (rows.length === 0) return;
    const list = rows.map((row) => `"${row.tablename}"`).join(', ');
    await pool.query(`TRUNCATE TABLE ${list} CASCADE`);
  } finally {
    await pool.end();
  }
}

export function createAgent() {
  const meta = loadSessionE2eMeta();
  return request.agent(meta.baseUrl).set('Origin', meta.origin);
}

export async function signUp(
  email: string,
  name = 'Session E2E',
): Promise<SessionAgent> {
  const meta = loadSessionE2eMeta();
  const agent = createAgent();
  const response = await agent.post('/api/auth/sign-up/email').send({
    email,
    password: 'password-123',
    name,
  });

  if (response.status !== 200) {
    throw new Error(
      `sign-up failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }

  const cookieHeader =
    cookieHeaderFromAgent(agent, meta.baseUrl) ||
    cookiesFromSetCookie(response.headers['set-cookie']);

  if (!cookieHeader) {
    throw new Error('sign-up did not set a session cookie');
  }

  const user = response.body.user as SessionUser | undefined;
  if (!user?.id) {
    const me = await agent.get('/auth/me').expect(200);
    return {
      agent,
      user: me.body.user as SessionUser,
      cookieHeader,
    };
  }

  return {
    agent,
    user,
    cookieHeader,
  };
}

export async function signUpCreator(index: 0 | 1 = 0): Promise<SessionAgent> {
  const meta = loadSessionE2eMeta();
  const email = meta.creatorEmails[index];
  if (!email) {
    throw new Error('globalSetup did not record creator emails');
  }
  return signUp(email, index === 0 ? 'Owner A' : 'Owner B');
}

function cookiesFromSetCookie(
  header: string | string[] | undefined,
): string {
  const list = !header ? [] : Array.isArray(header) ? header : [header];
  return list
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter((part): part is string => Boolean(part))
    .join('; ');
}

function cookieHeaderFromAgent(
  agent: ReturnType<typeof request.agent>,
  baseUrl: string,
): string {
  const jar = (
    agent as unknown as {
      jar?: { getCookieString: (url: string) => string };
    }
  ).jar;
  if (!jar) return '';
  try {
    return jar.getCookieString(baseUrl) || '';
  } catch {
    return '';
  }
}

export function connectSocket(cookieHeader: string): Socket {
  const meta = loadSessionE2eMeta();
  return io(meta.baseUrl, {
    transports: ['websocket'],
    autoConnect: true,
    extraHeaders: {
      Cookie: cookieHeader,
      Origin: meta.origin,
    },
  });
}

export function connectSocketWithoutCookie(): Socket {
  const meta = loadSessionE2eMeta();
  return io(meta.baseUrl, {
    transports: ['websocket'],
    autoConnect: true,
    extraHeaders: {
      Origin: meta.origin,
    },
  });
}

export function waitForConnect(socket: Socket): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      reject(new Error('Timed out waiting for socket connect'));
    }, 4000);
    function onConnect() {
      clearTimeout(timer);
      socket.off('connect_error', onError);
      resolve();
    }
    function onError(error: Error) {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      reject(error);
    }
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

export function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    function onEvent(payload: T) {
      clearTimeout(timer);
      resolve(payload);
    }
    socket.once(event, onEvent);
  });
}

export function expectNoEvent(
  socket: Socket,
  event: string,
  waitMs = 400,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      resolve();
    }, waitMs);
    function onEvent(payload: unknown) {
      clearTimeout(timer);
      reject(
        new Error(
          `Unexpected ${event}: ${JSON.stringify(payload).slice(0, 200)}`,
        ),
      );
    }
    socket.once(event, onEvent);
  });
}

export async function disconnectSocket(socket: Socket): Promise<void> {
  if (socket.connected) {
    socket.disconnect();
  } else {
    socket.close();
  }
}
