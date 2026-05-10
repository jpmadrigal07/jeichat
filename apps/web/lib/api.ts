import axios, { type AxiosInstance } from 'axios';
import { axiosErrorToApiError } from '@/lib/api-error';

function normalizeBaseUrl(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

const baseURL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

/**
 * Defaults shared by the production client and small demo clients (same interceptors).
 */
function createAxiosInstance(
  overrides: Record<string, unknown>,
): AxiosInstance {
  const instance = axios.create({
    allowAbsoluteUrls: false,
    headers: {
      common: {
        Accept: 'application/json',
      },
      post: { 'Content-Type': 'application/json' },
      put: { 'Content-Type': 'application/json' },
      patch: { 'Content-Type': 'application/json' },
    },
    responseType: 'json',
    timeout: 30_000,
    timeoutErrorMessage: 'Request timed out',
    withCredentials: process.env.NEXT_PUBLIC_API_CREDENTIALS === 'true',
    maxRedirects: 3,
    paramsSerializer: { indexes: null },
    transitional: {
      clarifyTimeoutError: true,
    },
    ...overrides,
  });
  instance.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(axiosErrorToApiError(error)),
  );
  return instance;
}

/**
 * Shared Axios instance for the Nest API. Set `NEXT_PUBLIC_API_URL` in `.env` (see repo `.env.example`).
 *
 * Pass `{ signal }` from TanStack Query's `queryFn` / `mutationFn` so navigations and cache
 * invalidation abort in-flight requests (`AbortController`).
 */
export const api = createAxiosInstance({
  baseURL,
});

/**
 * Intentionally unreachable host/port — connection refused, for testing React Query retry
 * (no HTTP status; retries once by default in `Providers`).
 */
export const unreachableDemoApi = createAxiosInstance({
  baseURL: 'http://127.0.0.1:59999',
  timeout: 8_000,
});
