import { api } from '@/lib/api';

export type InboxNotificationType = 'mention' | 'assigned' | 'reaction';

export type InboxNotification = {
  id: string;
  workspaceId: string;
  type: InboxNotificationType;
  readAt: string | null;
  createdAt: string;
  emoji: string | null;
  actor: {
    id: string;
    name: string;
    image: string | null;
  };
  channel: {
    id: string;
    name: string;
    parentId: string | null;
    ticketNumber: number | null;
    ticketKey: string | null;
  };
  parent: {
    id: string;
    name: string;
    ticketKey: string | null;
  } | null;
  message: {
    id: string;
    content: string;
  } | null;
};

export type InboxListResponse = {
  items: InboxNotification[];
  unreadCount: number;
};

export function inboxQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'inbox'] as const;
}

export function inboxUnreadQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'inbox', 'unread'] as const;
}

export async function fetchInbox(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<InboxListResponse> {
  const { data } = await api.get<InboxListResponse>(
    `/workspaces/${workspaceId}/inbox`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function fetchInboxUnreadCount(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<{ unreadCount: number }> {
  const { data } = await api.get<{ unreadCount: number }>(
    `/workspaces/${workspaceId}/inbox/unread-count`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function markInboxNotificationRead(
  workspaceId: string,
  notificationId: string,
): Promise<{ unreadCount: number }> {
  const { data } = await api.post<{ unreadCount: number }>(
    `/workspaces/${workspaceId}/inbox/${notificationId}/read`,
  );
  return data;
}

export async function markAllInboxRead(
  workspaceId: string,
): Promise<{ unreadCount: number }> {
  const { data } = await api.post<{ unreadCount: number }>(
    `/workspaces/${workspaceId}/inbox/read-all`,
  );
  return data;
}
