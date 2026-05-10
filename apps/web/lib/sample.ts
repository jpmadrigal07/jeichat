import { isAxiosError } from 'axios';
import { api } from '@/lib/api';

export type SampleResponse = {
  message: string;
  servedAt: string;
};

export const sampleQueryKey = ['sample'] as const;

function formatSampleError(err: unknown): string {
  if (isAxiosError(err)) {
    const detail =
      err.response?.data != null
        ? ` ${typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)}`
        : '';
    return `${err.message} (${err.response?.status ?? err.code ?? 'no response'})${detail}`.trim();
  }
  return err instanceof Error ? err.message : 'Could not reach the API.';
}

/**
 * Fetches `GET /sample`. Throws on failure so TanStack Query can populate `error` / `isError`.
 */
export async function fetchSample(): Promise<SampleResponse> {
  try {
    const { data } = await api.get<SampleResponse>('/sample');
    return data;
  } catch (err) {
    throw new Error(formatSampleError(err));
  }
}
