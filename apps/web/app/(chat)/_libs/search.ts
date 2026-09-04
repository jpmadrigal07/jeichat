import { api } from '@/lib/api';

export type SearchHit = {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
  hasAttachment: boolean;
  channel: {
    id: string;
    name: string;
    parentId: string | null;
  };
  sender: {
    name: string;
    image: string | null;
  };
};

export function searchQueryKey(workspaceId: string, q: string) {
  return ['workspaces', workspaceId, 'search', q] as const;
}

export async function searchWorkspace(
  workspaceId: string,
  q: string,
  ctx?: { signal?: AbortSignal },
): Promise<SearchHit[]> {
  const { data } = await api.get<SearchHit[]>(
    `/workspaces/${workspaceId}/search`,
    { params: { q }, signal: ctx?.signal },
  );
  return data;
}
