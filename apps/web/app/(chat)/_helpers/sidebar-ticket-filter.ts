import type { Channel } from '../_libs/channels';
import {
  TICKET_STATUSES,
  ticketStatusOf,
  type TicketStatus,
} from './ticket-fields';

export const SIDEBAR_TICKET_FILTER_STORAGE_PREFIX =
  'jeichat:sidebar-ticket-filter:v2:';

export type SidebarTicketFilter = {
  statuses: TicketStatus[] | null;
  assignedToMe: boolean;
};

export type SidebarTicketFiltersByChannel = Record<
  string,
  SidebarTicketFilter
>;

export const DEFAULT_SIDEBAR_TICKET_FILTER: SidebarTicketFilter = {
  statuses: null,
  assignedToMe: false,
};

export const EMPTY_SIDEBAR_TICKET_FILTERS: SidebarTicketFiltersByChannel = {};

function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export function sidebarTicketFilterKey(workspaceId: string) {
  return `${SIDEBAR_TICKET_FILTER_STORAGE_PREFIX}${workspaceId}`;
}

export function sidebarTicketFilterEquals(
  a: SidebarTicketFilter,
  b: SidebarTicketFilter,
) {
  if (a.assignedToMe !== b.assignedToMe) return false;
  if (a.statuses === b.statuses) return true;
  if (!a.statuses || !b.statuses) return false;
  if (a.statuses.length !== b.statuses.length) return false;
  const other = new Set(b.statuses);
  return a.statuses.every((status) => other.has(status));
}

export function sidebarTicketFiltersEqual(
  a: SidebarTicketFiltersByChannel,
  b: SidebarTicketFiltersByChannel,
) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((channelId) => {
    const left = a[channelId];
    const right = b[channelId];
    return left !== undefined && right !== undefined
      ? sidebarTicketFilterEquals(left, right)
      : false;
  });
}

export function parseSidebarTicketFilter(
  value: unknown,
): SidebarTicketFilter | null {
  if (!value || typeof value !== 'object') return null;
  const assignedToMe =
    'assignedToMe' in value && value.assignedToMe === true;
  if (!('statuses' in value) || !Array.isArray(value.statuses)) {
    return { assignedToMe, statuses: null };
  }
  const next = value.statuses.filter(
    (item): item is TicketStatus =>
      typeof item === 'string' && isTicketStatus(item),
  );
  if (next.length === 0) return { assignedToMe, statuses: [] };
  if (next.length >= TICKET_STATUSES.length) {
    return { assignedToMe, statuses: null };
  }
  return { assignedToMe, statuses: next };
}

export function parseSidebarTicketFilters(
  raw: string | null,
): SidebarTicketFiltersByChannel {
  if (!raw) return EMPTY_SIDEBAR_TICKET_FILTERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return EMPTY_SIDEBAR_TICKET_FILTERS;
    }
    const filters: SidebarTicketFiltersByChannel = {};
    for (const [channelId, value] of Object.entries(parsed)) {
      if (channelId === 'assignedToMe' || channelId === 'statuses') continue;
      const filter = parseSidebarTicketFilter(value);
      if (!filter || sidebarTicketFilterEquals(filter, DEFAULT_SIDEBAR_TICKET_FILTER)) {
        continue;
      }
      filters[channelId] = filter;
    }
    return Object.keys(filters).length === 0
      ? EMPTY_SIDEBAR_TICKET_FILTERS
      : filters;
  } catch {
    return EMPTY_SIDEBAR_TICKET_FILTERS;
  }
}

export function channelSidebarTicketFilter(
  filters: SidebarTicketFiltersByChannel,
  channelId: string,
) {
  return filters[channelId] ?? DEFAULT_SIDEBAR_TICKET_FILTER;
}

export function hasActiveSidebarTicketFilter(filter: SidebarTicketFilter) {
  return filter.assignedToMe || filter.statuses !== null;
}

export function isSidebarStatusChecked(
  filter: SidebarTicketFilter,
  status: TicketStatus,
) {
  return !filter.statuses || filter.statuses.includes(status);
}

export function toggleSidebarStatus(
  filter: SidebarTicketFilter,
  status: TicketStatus,
): SidebarTicketFilter {
  const current = filter.statuses ?? [...TICKET_STATUSES];
  const next = current.includes(status)
    ? current.filter((value) => value !== status)
    : [...current, status];
  const statuses =
    next.length === 0
      ? []
      : next.length === TICKET_STATUSES.length
        ? null
        : next;
  return { ...filter, statuses };
}

export function filterSidebarTickets(
  tickets: Channel[],
  filter: SidebarTicketFilter,
  userId: string,
  activeChannelId?: string,
) {
  if (!hasActiveSidebarTicketFilter(filter)) return tickets;

  const statusSet = filter.statuses ? new Set(filter.statuses) : null;

  return tickets.filter((ticket) => {
    if (ticket.id === activeChannelId) return true;
    if (filter.assignedToMe && ticket.assigneeId !== userId) return false;
    if (statusSet && !statusSet.has(ticketStatusOf(ticket.status))) {
      return false;
    }
    return true;
  });
}
