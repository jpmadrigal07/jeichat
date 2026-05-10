import { isAxiosError } from 'axios';
import { api } from '@/lib/api';

export type SampleResponse = {
  message: string;
  servedAt: string;
};

export async function fetchSample(): Promise<
  { ok: true; data: SampleResponse } | { ok: false; error: string }
> {
  try {
    const { data } = await api.get<SampleResponse>('/sample');
    return { ok: true, data };
  } catch (err) {
    if (isAxiosError(err)) {
      const detail =
        err.response?.data != null
          ? ` ${typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)}`
          : '';
      return {
        ok: false,
        error: `${err.message} (${err.response?.status ?? err.code ?? 'no response'})${detail}`.trim(),
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach the API.',
    };
  }
}
