import { createAuthClient } from 'better-auth/react';

function normalizeBaseUrl(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

const baseURL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
});
