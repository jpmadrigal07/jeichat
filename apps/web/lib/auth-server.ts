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

/**
 * Session for the current request: forwards the browser `Cookie` header to the API.
 * Wrapped in `cache` so multiple Server Components / actions in one render share one fetch.
 */
export const getServerSession = cache(async () => {
  const h = await headers();
  return serverAuthClient.getSession({
    fetchOptions: {
      headers: h,
    },
  });
});
