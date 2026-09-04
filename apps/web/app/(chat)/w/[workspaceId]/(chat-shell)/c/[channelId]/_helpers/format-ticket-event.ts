import {
  ticketPriorityOf,
  ticketStatusOf,
  TICKET_PRIORITY_META,
  TICKET_STATUS_META,
} from '@chat/_helpers/ticket-fields';
import type {
  TicketEvent,
  TicketEventAssignee,
  TicketEventLabel,
} from '../_libs/channel-events';

export type TicketEventCopy = {
  actorName: string;
  text: string;
  verb: string;
  detail: string | null;
};

function asAssignee(value: unknown): TicketEventAssignee | null {
  if (!value || typeof value !== 'object') return null;
  if (!('id' in value) || !('name' in value)) return null;
  const id = value.id;
  const name = value.name;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  return { id, name };
}

function asLabels(value: unknown): TicketEventLabel[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    if (!('id' in item) || !('name' in item) || !('color' in item)) return [];
    if (
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.color !== 'string'
    ) {
      return [];
    }
    return [{ id: item.id, name: item.name, color: item.color }];
  });
}

function asStatusLabel(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'No status';
  return TICKET_STATUS_META[ticketStatusOf(value)].label;
}

function asPriorityLabel(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return TICKET_PRIORITY_META.none.label;
  }
  return TICKET_PRIORITY_META[ticketPriorityOf(value)].label;
}

function formatDue(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function formatTicketEvent(event: TicketEvent): TicketEventCopy {
  const actorName = event.actor?.name ?? 'Someone';

  switch (event.type) {
    case 'ticket_created':
      return {
        actorName,
        text: 'created this ticket',
        verb: 'created',
        detail: null,
      };
    case 'status_changed': {
      const detail = `${asStatusLabel(event.fromValue)} → ${asStatusLabel(event.toValue)}`;
      return {
        actorName,
        text: `moved ${detail}`,
        verb: 'moved',
        detail,
      };
    }
    case 'priority_changed': {
      const label = asPriorityLabel(event.toValue);
      return {
        actorName,
        text: `set priority to ${label}`,
        verb: 'set',
        detail: `to ${label}`,
      };
    }
    case 'assignee_changed': {
      const to = asAssignee(event.toValue);
      return {
        actorName,
        text: to ? `assigned to ${to.name}` : 'unassigned',
        verb: to ? 'assigned' : 'unassigned',
        detail: to ? `to ${to.name}` : null,
      };
    }
    case 'due_changed': {
      const to = formatDue(event.toValue);
      const text = to ? `set due date to ${to}` : 'removed the due date';
      return { actorName, text, verb: text, detail: null };
    }
    case 'labels_changed': {
      const from = asLabels(event.fromValue);
      const to = asLabels(event.toValue);
      const fromIds = new Set(from.map((label) => label.id));
      const toIds = new Set(to.map((label) => label.id));
      const added = to
        .filter((label) => !fromIds.has(label.id))
        .map((label) => label.name);
      const removed = from
        .filter((label) => !toIds.has(label.id))
        .map((label) => label.name);
      if (added.length && removed.length) {
        const text = `added ${joinNames(added)} and removed ${joinNames(removed)}`;
        return { actorName, text, verb: text, detail: null };
      }
      if (added.length) {
        const text = `added ${joinNames(added)}`;
        return { actorName, text, verb: text, detail: null };
      }
      if (removed.length) {
        const text = `removed ${joinNames(removed)}`;
        return { actorName, text, verb: text, detail: null };
      }
      return { actorName, text: 'updated labels', verb: 'updated labels', detail: null };
    }
  }
}
