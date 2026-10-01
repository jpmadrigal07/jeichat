import type { Message } from '../_libs/messages';

/** Consecutive messages from one sender within this window share a header. */
export const MESSAGE_GROUP_WINDOW_MS = 10 * 60 * 1000;

/**
 * Whether `message` continues the group started by `previous`, so its avatar
 * and name are hidden. `previous` must be the message directly above it in the
 * timeline; callers pass `null` when the row above is a date separator or a
 * ticket event, which always starts a new group.
 */
export function isGroupedWithPrevious(
  message: Message,
  previous: Message | null,
): boolean {
  if (!previous) return false;
  if (previous.senderId !== message.senderId) return false;
  // Replies show their quoted preview above the header, so keep them anchored.
  if (message.replyToId) return false;

  const gap =
    new Date(message.createdAt).getTime() -
    new Date(previous.createdAt).getTime();
  return gap >= 0 && gap <= MESSAGE_GROUP_WINDOW_MS;
}
