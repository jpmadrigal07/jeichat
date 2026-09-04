import { api } from '@/lib/api';

export type ThreadAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type TicketLabel = {
  id: string;
  name: string;
  color: string;
};

export type Channel = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  dueAt: string | null;
  ticketNumber: number | null;
  ticketKey: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: ThreadAttachment[];
  labels?: TicketLabel[];
};

export function channelsQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'channels'] as const;
}

export function unreadCountsQueryKey(workspaceId: string) {
  return [...channelsQueryKey(workspaceId), 'unread'] as const;
}

export type UnreadCounts = Record<string, number>;

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
  payload: {
    name: string;
    description?: string;
    ticketKey?: string;
    isPrivate?: boolean;
    memberIds?: string[];
  },
): Promise<Channel> {
  const { data } = await api.post<Channel>(
    `/workspaces/${workspaceId}/channels`,
    payload,
  );
  return data;
}

export async function createThread(
  workspaceId: string,
  channelId: string,
  payload: {
    name: string;
    description?: string;
    attachmentIds?: string[];
    status?: string;
  },
): Promise<Channel> {
  const { data } = await api.post<Channel>(
    `/workspaces/${workspaceId}/channels/${channelId}/threads`,
    payload,
  );
  return data;
}

export type UpdateChannelPayload = {
  name?: string;
  description?: string | null;
  ticketKey?: string;
  addAttachmentIds?: string[];
  removeAttachmentIds?: string[];
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueAt?: string | null;
  labelIds?: string[];
  labels?: TicketLabel[];
  isPrivate?: boolean;
};

export async function updateChannel(
  workspaceId: string,
  channelId: string,
  payload: UpdateChannelPayload,
): Promise<Channel> {
  const { labels: _labels, ...body } = payload;
  const { data } = await api.patch<Channel>(
    `/workspaces/${workspaceId}/channels/${channelId}`,
    body,
  );
  return data;
}

export async function deleteChannel(
  workspaceId: string,
  channelId: string,
): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/channels/${channelId}`);
}

export async function fetchUnreadCounts(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<UnreadCounts> {
  const { data } = await api.get<UnreadCounts>(
    `/workspaces/${workspaceId}/channels/unread-counts`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function markChannelAsRead(
  workspaceId: string,
  channelId: string,
): Promise<void> {
  await api.post(
    `/workspaces/${workspaceId}/channels/${channelId}/read`,
  );
}

export type ChannelThread = Channel & {
  messageCount: number;
  lastMessageAt: string | null;
};

export function channelThreadsQueryKey(
  workspaceId: string,
  channelId: string,
) {
  return [...channelsQueryKey(workspaceId), channelId, 'threads'] as const;
}

export async function fetchChannelThreads(
  workspaceId: string,
  channelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<ChannelThread[]> {
  const { data } = await api.get<ChannelThread[]>(
    `/workspaces/${workspaceId}/channels/${channelId}/threads`,
    { signal: ctx?.signal },
  );
  return data;
}

export function channelPageHref(workspaceId: string, channelId: string) {
  return `/w/${workspaceId}/c/${channelId}`;
}

export type TicketLayout = 'card' | 'list';

export function parseTicketLayout(value?: string | string[]): TicketLayout {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'list' ? 'list' : 'card';
}

export function channelThreadsViewHref(
  workspaceId: string,
  channelId: string,
  layout: TicketLayout = 'card',
  currentSearch?: Pick<URLSearchParams, 'toString'>,
) {
  const params = new URLSearchParams(currentSearch?.toString() ?? '');
  params.set('view', 'threads');
  if (layout === 'list') params.set('layout', 'list');
  else params.delete('layout');
  return `${channelPageHref(workspaceId, channelId)}?${params.toString()}`;
}
