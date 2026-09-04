import type { Message } from '../_libs/messages';
import type { TicketEvent } from '../_libs/channel-events';

export type TicketTimelineEntry =
  | { type: 'message'; message: Message }
  | { type: 'event'; event: TicketEvent };

function createdAtOf(entry: TicketTimelineEntry): string {
  return entry.type === 'message'
    ? entry.message.createdAt
    : entry.event.createdAt;
}

function idOf(entry: TicketTimelineEntry): string {
  return entry.type === 'message' ? entry.message.id : entry.event.id;
}

export function mergeTicketTimeline(
  messages: Message[],
  events: TicketEvent[],
  hasOlderMessages: boolean,
): TicketTimelineEntry[] {
  const oldestLoaded = messages.at(-1)?.createdAt;
  const visibleEvents =
    !hasOlderMessages || !oldestLoaded
      ? events
      : events.filter((event) => event.createdAt >= oldestLoaded);

  const entries: TicketTimelineEntry[] = [
    ...messages.map((message) => ({ type: 'message' as const, message })),
    ...visibleEvents.map((event) => ({ type: 'event' as const, event })),
  ];

  return [...entries].sort((a, b) => {
    const aAt = createdAtOf(a);
    const bAt = createdAtOf(b);
    if (aAt !== bAt) return aAt < bAt ? 1 : -1;
    if (a.type !== b.type) return a.type === 'message' ? -1 : 1;
    const aId = idOf(a);
    const bId = idOf(b);
    return aId < bId ? 1 : -1;
  });
}
