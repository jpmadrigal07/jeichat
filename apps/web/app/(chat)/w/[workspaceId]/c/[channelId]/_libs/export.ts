import { api } from '@/lib/api';

export async function fetchExportMarkdown(
  channelId: string,
  from?: string,
  to?: string,
  ctx?: { signal?: AbortSignal },
): Promise<string> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const { data } = await api.get<string>(
    `/channels/${channelId}/export`,
    { params, signal: ctx?.signal, responseType: 'text' },
  );
  return data;
}
