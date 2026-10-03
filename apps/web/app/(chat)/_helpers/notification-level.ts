import { AtSign, Bell, BellOff, type LucideIcon } from 'lucide-react';
import type {
  NotificationLevel,
  NotificationSettings,
} from '../_libs/notification-settings';

export const NOTIFICATION_LEVELS: NotificationLevel[] = [
  'all',
  'mentions',
  'muted',
];

export const NOTIFICATION_LEVEL_META: Record<
  NotificationLevel,
  { label: string; description: string; icon: LucideIcon }
> = {
  all: {
    label: 'All messages',
    description: 'Sound and popup for every message',
    icon: Bell,
  },
  mentions: {
    label: 'Mentions only',
    description: 'Only when you are tagged, or @all is used',
    icon: AtSign,
  },
  muted: {
    label: 'Mute',
    description: 'No sound or popup, not even for mentions',
    icon: BellOff,
  },
};

export function parseNotificationLevel(
  value: string,
): NotificationLevel | null {
  return NOTIFICATION_LEVELS.find((level) => level === value) ?? null;
}

export function notificationLevelOf(
  settings: NotificationSettings | undefined,
  channelId: string,
): NotificationLevel {
  return settings?.[channelId] ?? 'all';
}

export function withNotificationLevel(
  settings: NotificationSettings | undefined,
  channelId: string,
  level: NotificationLevel,
): NotificationSettings {
  const next: NotificationSettings = { ...settings };
  if (level === 'all') delete next[channelId];
  else next[channelId] = level;
  return next;
}

/**
 * Unread counts for channels the user is still notified about. Quiet channels
 * (mentions only / muted) stay bold in the sidebar but don't count towards
 * badges or the tab title.
 */
export function loudUnreadCounts(
  counts: Record<string, number> | undefined,
  settings: NotificationSettings | undefined,
): Record<string, number> | undefined {
  if (!counts || !settings) return counts;
  return Object.fromEntries(
    Object.entries(counts).filter(
      ([channelId]) => notificationLevelOf(settings, channelId) === 'all',
    ),
  );
}
