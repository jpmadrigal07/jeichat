import type { Channel } from '../_libs/channels';
import {
  TICKET_STATUSES,
  compareTicketBoardPosition,
  isTicketArchived,
  ticketStatusOf,
  type TicketStatus,
} from './ticket-fields';

export function groupChannelsByParent(channels: Channel[]) {
  const topLevel: Channel[] = [];
  const dms: Channel[] = [];
  const threadsByParent = new Map<string, Channel[]>();

  for (const channel of channels) {
    if (channel.parentId) {
      if (isTicketArchived(channel)) continue;
      const threads = threadsByParent.get(channel.parentId) ?? [];
      threads.push(channel);
      threadsByParent.set(channel.parentId, threads);
      continue;
    }

    if (channel.channelType === 'dm') {
      dms.push(channel);
      continue;
    }

    topLevel.push(channel);
  }

  for (const threads of threadsByParent.values()) {
    threads.sort(
      (a, b) =>
        compareTicketBoardPosition(a, b) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  dms.sort((a, b) => dmActivityTime(b) - dmActivityTime(a));

  return { topLevel, dms, threadsByParent };
}

/** Latest message time, or creation time for a DM with no messages yet. */
export function dmActivityTime(channel: Channel) {
  return Date.parse(channel.lastMessageAt ?? channel.createdAt);
}

export const SIDEBAR_TICKETS_PER_STATUS = 9;

export function groupTicketsByStatus<T extends Channel>(tickets: T[]) {
  return TICKET_STATUSES.flatMap((status) => {
    const items = tickets.filter(
      (ticket) => ticketStatusOf(ticket.status) === status,
    );
    return items.length > 0 ? [{ status, tickets: items }] : [];
  });
}

const COLLAPSED_TICKET_STATUSES = new Set<TicketStatus>([
  'done',
  'cancelled',
]);

export function isTicketStatusOpenByDefault(
  status: TicketStatus,
  hasActiveTicket: boolean,
) {
  if (hasActiveTicket) return true;
  return !COLLAPSED_TICKET_STATUSES.has(status);
}
