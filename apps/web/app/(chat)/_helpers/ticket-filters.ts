import {
  TICKET_PRIORITIES,
  ticketPriorityOf,
  ticketStatusOf,
  type TicketPriority,
  type TicketStatus,
} from './ticket-fields';

export const TICKET_FILTER_PARAM = {
  q: 'q',
  assignee: 'assignee',
  priority: 'priority',
  label: 'label',
  due: 'due',
  completed: 'completed',
} as const;

export const TICKET_ASSIGNEE_ME = 'me';
export const TICKET_ASSIGNEE_UNASSIGNED = 'unassigned';

export const TICKET_DUE_FILTERS = ['overdue', 'week'] as const;
export type TicketDueFilter = (typeof TICKET_DUE_FILTERS)[number];

export const TICKET_COMPLETED_FILTERS = ['all', 'none'] as const;
export type TicketCompletedFilter = (typeof TICKET_COMPLETED_FILTERS)[number];

export type TicketFilters = {
  q: string;
  assignee: string | null;
  priority: TicketPriority | null;
  labelId: string | null;
  due: TicketDueFilter | null;
  completed: TicketCompletedFilter;
};

const FILTER_PARAM_KEYS = Object.values(TICKET_FILTER_PARAM);

type TicketFilterable = {
  name: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  dueAt: string | null;
  labels?: { id: string; name: string }[];
};

export function emptyTicketFilters(): TicketFilters {
  return {
    q: '',
    assignee: null,
    priority: null,
    labelId: null,
    due: null,
    completed: 'all',
  };
}

function firstParam(
  searchParams: Pick<URLSearchParams, 'get'>,
  key: string,
): string | null {
  const value = searchParams.get(key)?.trim() ?? '';
  return value || null;
}

function isPriority(value: string): value is TicketPriority {
  return (TICKET_PRIORITIES as readonly string[]).includes(value);
}

function isDueFilter(value: string): value is TicketDueFilter {
  return (TICKET_DUE_FILTERS as readonly string[]).includes(value);
}

export function parseTicketFilters(
  searchParams: Pick<URLSearchParams, 'get'>,
): TicketFilters {
  const priority = firstParam(searchParams, TICKET_FILTER_PARAM.priority);
  const due = firstParam(searchParams, TICKET_FILTER_PARAM.due);
  const completed = firstParam(searchParams, TICKET_FILTER_PARAM.completed);

  return {
    q: searchParams.get(TICKET_FILTER_PARAM.q) ?? '',
    assignee: firstParam(searchParams, TICKET_FILTER_PARAM.assignee),
    priority: priority && isPriority(priority) ? priority : null,
    labelId: firstParam(searchParams, TICKET_FILTER_PARAM.label),
    due: due && isDueFilter(due) ? due : null,
    completed: completed === 'none' ? 'none' : 'all',
  };
}

export function isMyIssuesFilter(filters: TicketFilters) {
  return filters.assignee === TICKET_ASSIGNEE_ME && filters.completed === 'none';
}

export function hasActiveTicketFilters(filters: TicketFilters) {
  return (
    filters.q.trim().length > 0 ||
    filters.assignee !== null ||
    filters.priority !== null ||
    filters.labelId !== null ||
    filters.due !== null ||
    filters.completed !== 'all'
  );
}

export function clearTicketFilterParams(params: URLSearchParams) {
  for (const key of FILTER_PARAM_KEYS) {
    params.delete(key);
  }
}

export function applyMyIssuesParams(params: URLSearchParams) {
  params.set(TICKET_FILTER_PARAM.assignee, TICKET_ASSIGNEE_ME);
  params.set(TICKET_FILTER_PARAM.completed, 'none');
}

export function clearMyIssuesParams(params: URLSearchParams) {
  params.delete(TICKET_FILTER_PARAM.assignee);
  params.delete(TICKET_FILTER_PARAM.completed);
}

export function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isOpenStatus(status: TicketStatus) {
  return status !== 'done' && status !== 'cancelled';
}

function normalizeTicketSearchText(value: string) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~#>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function ticketMatchesSearch(
  thread: TicketFilterable,
  query: string,
  displayId?: string,
  assigneeName?: string,
) {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = normalizeTicketSearchText(
    [
      thread.name,
      displayId ?? '',
      displayId?.replaceAll('-', '') ?? '',
      thread.description ?? '',
      assigneeName ?? '',
      ...(thread.labels ?? []).map((label) => label.name),
    ].join(' '),
  );

  return tokens.every((token) => haystack.includes(token));
}

export function ticketMatchesFilters(
  thread: TicketFilterable,
  filters: TicketFilters,
  userId: string,
  now = new Date(),
) {
  if (filters.assignee === TICKET_ASSIGNEE_ME && thread.assigneeId !== userId) {
    return false;
  }
  if (filters.assignee === TICKET_ASSIGNEE_UNASSIGNED && thread.assigneeId) {
    return false;
  }
  if (
    filters.assignee &&
    filters.assignee !== TICKET_ASSIGNEE_ME &&
    filters.assignee !== TICKET_ASSIGNEE_UNASSIGNED &&
    thread.assigneeId !== filters.assignee
  ) {
    return false;
  }

  if (
    filters.priority &&
    ticketPriorityOf(thread.priority) !== filters.priority
  ) {
    return false;
  }

  if (
    filters.labelId &&
    !(thread.labels ?? []).some((label) => label.id === filters.labelId)
  ) {
    return false;
  }

  if (filters.completed === 'none' && !isOpenStatus(ticketStatusOf(thread.status))) {
    return false;
  }

  if (filters.due) {
    if (!thread.dueAt) return false;
    const dueAt = new Date(thread.dueAt);
    if (Number.isNaN(dueAt.getTime())) return false;
    const today = startOfLocalDay(now);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (filters.due === 'overdue' && dueAt >= today) return false;
    if (filters.due === 'week' && (dueAt < today || dueAt >= weekEnd)) {
      return false;
    }
  }

  return true;
}

export function isAssignedOpenTicket(
  ticket: { parentId: string | null; assigneeId: string | null; status: string | null },
  userId: string,
) {
  return (
    Boolean(ticket.parentId) &&
    ticket.assigneeId === userId &&
    isOpenStatus(ticketStatusOf(ticket.status))
  );
}
