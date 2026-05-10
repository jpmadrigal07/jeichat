import { api, unreachableDemoApi } from '@/lib/api';

/** Path Nest does not define → default 404 JSON (no retry for 4xx). */
const DEMO_404_PATH = '/client-demo-unknown-route';

export const httpDemoQueryKeys = {
  notFound: ['http-demo', '404'] as const,
  unreachable: ['http-demo', 'unreachable'] as const,
  slow: ['http-demo', 'slow'] as const,
};

export async function fetchDemo404(ctx?: {
  signal?: AbortSignal;
}): Promise<void> {
  await api.get(DEMO_404_PATH, { signal: ctx?.signal });
}

export async function fetchDemoUnreachable(ctx?: {
  signal?: AbortSignal;
}): Promise<void> {
  await unreachableDemoApi.get('/x', { signal: ctx?.signal });
}

export type DemoSlowResponse = { ok: true };

/**
 * Waits on the server (~25s) so you can cancel from the UI before it completes.
 * Per-request `timeout: 0` disables Axios’s deadline so cancellation is visible (not a timeout).
 */
export async function fetchDemoSlow(ctx?: {
  signal?: AbortSignal;
}): Promise<DemoSlowResponse> {
  const { data } = await api.get<DemoSlowResponse>('/demo/slow', {
    signal: ctx?.signal,
    timeout: 0,
  });
  return data;
}
