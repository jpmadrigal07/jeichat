import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { createAuthClient } from 'better-auth/client';

function normalizeBaseUrl(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

const baseURL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

/** Same-origin server calls to the Nest Better Auth routes (`/api/auth/*`). */
export const serverAuthClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
});

type ServerSession = Awaited<ReturnType<typeof serverAuthClient.getSession>>;

const NO_SESSION: ServerSession = { data: null, error: null };

/**
 * Session for the current request: forwards the browser `Cookie` header to the API.
 * Wrapped in `cache` so multiple Server Components / actions in one render share one fetch.
 *
 * Network failures (API still compiling, refused connection) return an empty
 * session instead of throwing — otherwise every page 500s during `bun dev` startup.
 */
export const getServerSession = cache(async (): Promise<ServerSession> => {
  const h = await headers();
  const cookie = h.get('cookie');

  try {
    return await serverAuthClient.getSession({
      fetchOptions: {
        headers: cookie ? { cookie } : undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`getServerSession failed: ${message}`);
    return NO_SESSION;
  }
});
