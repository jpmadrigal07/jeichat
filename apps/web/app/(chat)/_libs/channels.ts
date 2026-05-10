import { api } from '@/lib/api';

export type Channel = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export function channelsQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'channels'] as const;
}

export async function fetchChannels(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<Channel[]> {
  const { data } = await api.get<Channel[]>(
    `/workspaces/${workspaceId}/channels`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function fetchChannel(
  workspaceId: string,
  channelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<Channel> {
  const { data } = await api.get<Channel>(
    `/workspaces/${workspaceId}/channels/${channelId}`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function createChannel(
  workspaceId: string,
  payload: { name: string; description?: string },
): Promise<Channel> {
  const { data } = await api.post<Channel>(
    `/workspaces/${workspaceId}/channels`,
    payload,
  );
  return data;
}

export async function updateChannel(
  workspaceId: string,
  channelId: string,
  payload: { name?: string; description?: string | null },
): Promise<Channel> {
  const { data } = await api.patch<Channel>(
    `/workspaces/${workspaceId}/channels/${channelId}`,
    payload,
  );
  return data;
}

export async function deleteChannel(
  workspaceId: string,
  channelId: string,
): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/channels/${channelId}`);
}
