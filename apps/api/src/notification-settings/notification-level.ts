export const NOTIFICATION_LEVELS = ['all', 'mentions', 'muted'] as const;

export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

export const DEFAULT_NOTIFICATION_LEVEL: NotificationLevel = 'all';

export function parseNotificationLevel(
  value: unknown,
): NotificationLevel | null {
  return NOTIFICATION_LEVELS.find((level) => level === value) ?? null;
}

/**
 * Splits a channel's recipients by how loudly each should hear about a message.
 * - all: always loud
 * - mentions: loud only when mentioned (by name or `@all`)
 * - muted: never loud, even when mentioned
 * Quiet recipients still get their unread count updated, just no sound, popup
 * or push.
 */
export function splitRecipientsByLevel(input: {
  recipientIds: string[];
  mentionedIds: string[];
  levels: Map<string, NotificationLevel>;
}): { loudIds: string[]; quietIds: string[] } {
  const mentioned = new Set(input.mentionedIds);
  const loudIds: string[] = [];
  const quietIds: string[] = [];

  for (const id of input.recipientIds) {
    const level = input.levels.get(id) ?? DEFAULT_NOTIFICATION_LEVEL;
    const loud = level === 'all' || (level === 'mentions' && mentioned.has(id));
    (loud ? loudIds : quietIds).push(id);
  }

  return { loudIds, quietIds };
}
