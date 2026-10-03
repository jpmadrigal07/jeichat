import { api } from '@/lib/api';

export type NotificationLevel = 'all' | 'mentions' | 'muted';

/** Non-default levels keyed by channel id; a missing channel means "all". */
export type NotificationSettings = Record<string, NotificationLevel>;

export function notificationSettingsQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'notification-settings'] as const;
}

export async function fetchNotificationSettings(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<NotificationSettings> {
  const { data } = await api.get<NotificationSettings>(
    `/workspaces/${workspaceId}/notification-settings`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function updateNotificationLevel(
  workspaceId: string,
  channelId: string,
  level: NotificationLevel,
): Promise<{ channelId: string; level: NotificationLevel }> {
  const { data } = await api.put<{
    channelId: string;
    level: NotificationLevel;
  }>(`/workspaces/${workspaceId}/notification-settings/${channelId}`, {
    level,
  });
  return data;
}
