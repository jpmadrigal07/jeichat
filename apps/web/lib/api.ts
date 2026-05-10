import axios from 'axios';

function normalizeBaseUrl(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

const baseURL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

/**
 * Shared Axios instance for the Nest API. Set `NEXT_PUBLIC_API_URL` in `.env` (see repo `.env.example`).
 */
export const api = axios.create({
  baseURL,
  /** Resolve `url` only against `baseURL` (no accidental absolute-URL override of the API host). */
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
  /** REST APIs rarely need long redirect chains; keeps behavior predictable. */
  maxRedirects: 3,
  /** `?id=1&id=2` style arrays — common for Nest/Express query parsers. */
  paramsSerializer: { indexes: null },
  transitional: {
    clarifyTimeoutError: true,
  },
});
