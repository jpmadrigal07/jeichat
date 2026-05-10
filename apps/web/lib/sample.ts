import { api } from '@/lib/api';

export type SampleResponse = {
  message: string;
  servedAt: string;
};

export const sampleQueryKey = ['sample'] as const;

export type FetchSampleContext = {
  /** Forward from `useQuery` / `useMutation` so Axios can abort when the query is cancelled. */
  signal?: AbortSignal;
};

/**
 * Fetches `GET /sample`. Errors are normalized to {@link ApiError} by `@/lib/api` interceptors.
 */
export async function fetchSample(
  ctx?: FetchSampleContext,
): Promise<SampleResponse> {
  const { data } = await api.get<SampleResponse>('/sample', {
    signal: ctx?.signal,
  });
  return data;
}
