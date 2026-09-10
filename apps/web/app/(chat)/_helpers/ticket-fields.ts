import type { LucideIcon } from 'lucide-react';
import {
  Circle,
  CircleDashed,
  CircleDot,
  CircleCheck,
  CircleSlash,
  Minus,
  TriangleAlert,
  SignalHigh,
  SignalMedium,
  SignalLow,
} from 'lucide-react';

export const TICKET_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
] as const;

export const TICKET_PRIORITIES = [
  'none',
  'urgent',
  'high',
  'medium',
  'low',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const LABEL_COLORS = [
  'red',
  'purple',
  'blue',
  'green',
  'orange',
  'yellow',
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export const LABEL_COLOR_CLASS: Record<LabelColor, string> = {
  red: 'bg-label-red',
  purple: 'bg-label-purple',
  blue: 'bg-label-blue',
  green: 'bg-label-green',
  orange: 'bg-label-orange',
  yellow: 'bg-label-yellow',
};

export function labelColorClass(color: string): string {
  return color in LABEL_COLOR_CLASS
    ? LABEL_COLOR_CLASS[color as LabelColor]
    : LABEL_COLOR_CLASS.blue;
}

export function nextLabelColor(existingCount: number): LabelColor {
  return LABEL_COLORS[existingCount % LABEL_COLORS.length] ?? 'red';
}

export const DEFAULT_TICKET_STATUS: TicketStatus = 'todo';
export const DEFAULT_TICKET_PRIORITY: TicketPriority = 'none';
export const MAX_TICKET_DESCRIPTION_LENGTH = 5000;

export const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; icon: LucideIcon; iconClassName: string }
> = {
  backlog: {
    label: 'Backlog',
    icon: CircleDashed,
    iconClassName: 'text-muted-foreground',
  },
  todo: {
    label: 'Todo',
    icon: Circle,
    iconClassName: 'text-muted-foreground',
  },
  in_progress: {
    label: 'In Progress',
    icon: CircleDot,
    iconClassName: 'text-ticket-in-progress',
  },
  in_review: {
    label: 'In Review',
    icon: CircleCheck,
    iconClassName: 'text-ticket-in-review',
  },
  done: {
    label: 'Done',
    icon: CircleCheck,
    iconClassName: 'text-ticket-done',
  },
  cancelled: {
    label: 'Canceled',
    icon: CircleSlash,
    iconClassName: 'text-muted-foreground',
  },
};

export const TICKET_PRIORITY_META: Record<
  TicketPriority,
  { label: string; icon: LucideIcon; iconClassName: string }
> = {
  none: {
    label: 'No priority',
    icon: Minus,
    iconClassName: 'text-muted-foreground',
  },
  urgent: {
    label: 'Urgent',
    icon: TriangleAlert,
    iconClassName: 'text-ticket-urgent',
  },
  high: {
    label: 'High',
    icon: SignalHigh,
    iconClassName: 'text-muted-foreground',
  },
  medium: {
    label: 'Medium',
    icon: SignalMedium,
    iconClassName: 'text-muted-foreground',
  },
  low: {
    label: 'Low',
    icon: SignalLow,
    iconClassName: 'text-muted-foreground',
  },
};

export function ticketStatusOf(value: string | null | undefined): TicketStatus {
  return value && value in TICKET_STATUS_META
    ? (value as TicketStatus)
    : DEFAULT_TICKET_STATUS;
}

export function ticketPriorityOf(
  value: string | null | undefined,
): TicketPriority {
  return value && value in TICKET_PRIORITY_META
    ? (value as TicketPriority)
    : DEFAULT_TICKET_PRIORITY;
}

export function suggestChannelKey(name: string): string {
  const letters = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  if (letters.length >= 2) return letters;
  return (letters || 'TCK').padEnd(3, 'X');
}

export function ticketPrefixOf(channel: {
  ticketKey?: string | null;
  name: string;
}): string {
  const key = channel.ticketKey?.trim();
  if (key) return key.toUpperCase();
  return suggestChannelKey(channel.name);
}

export function ticketDisplayId(prefix: string, ticketNumber: number): string {
  return `${prefix}-${ticketNumber}`;
}

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (first && second) {
    return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}
