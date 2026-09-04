import { api } from '@/lib/api';
import { channelsQueryKey } from './channels';

export type ChannelMember = {
  id: string;
  channelId: string;
  userId: string;
  addedBy: string;
  addedAt: string;
  name: string;
  email: string;
  image: string | null;
};

export type ChannelMembersResponse = {
  isPrivate: boolean;
  canManage: boolean;
  data: ChannelMember[];
};

export function channelMembersQueryKey(
  workspaceId: string,
  channelId: string,
) {
  return [...channelsQueryKey(workspaceId), channelId, 'members'] as const;
}

export async function fetchChannelMembers(
  workspaceId: string,
  channelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<ChannelMembersResponse> {
  const { data } = await api.get<ChannelMembersResponse>(
    `/workspaces/${workspaceId}/channels/${channelId}/members`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function addChannelMember(
  workspaceId: string,
  channelId: string,
  userId: string,
): Promise<ChannelMember> {
  const { data } = await api.post<ChannelMember>(
    `/workspaces/${workspaceId}/channels/${channelId}/members`,
    { userId },
  );
  return data;
}

export async function removeChannelMember(
  workspaceId: string,
  channelId: string,
  userId: string,
): Promise<void> {
  await api.delete(
    `/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`,
  );
}
