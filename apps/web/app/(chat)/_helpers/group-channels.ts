import type { Channel } from '../_libs/channels';
import {
  TICKET_STATUSES,
  ticketStatusOf,
  type TicketStatus,
} from './ticket-fields';

export function groupChannelsByParent(channels: Channel[]) {
  const topLevel: Channel[] = [];
  const threadsByParent = new Map<string, Channel[]>();

  for (const channel of channels) {
    if (!channel.parentId) {
      topLevel.push(channel);
      continue;
    }

    const threads = threadsByParent.get(channel.parentId) ?? [];
    threads.push(channel);
    threadsByParent.set(channel.parentId, threads);
  }

  for (const threads of threadsByParent.values()) {
    threads.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return { topLevel, threadsByParent };
}

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
