import { BadRequestException } from '@nestjs/common';

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

export const DEFAULT_WORKSPACE_LABELS: { name: string; color: LabelColor }[] = [
  { name: 'Bug', color: 'red' },
  { name: 'Duplicate', color: 'red' },
  { name: 'Feature', color: 'purple' },
  { name: 'Improvement', color: 'blue' },
];

export const DEFAULT_TICKET_STATUS: TicketStatus = 'todo';
export const DEFAULT_TICKET_PRIORITY: TicketPriority = 'none';
export const MAX_TICKET_DESCRIPTION_LENGTH = 5000;

function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

function isTicketPriority(value: string): value is TicketPriority {
  return (TICKET_PRIORITIES as readonly string[]).includes(value);
}

export function parseTicketStatus(value: unknown): TicketStatus {
  if (typeof value !== 'string' || !isTicketStatus(value)) {
    throw new BadRequestException('Invalid ticket status');
  }
  return value;
}

export function parseTicketPriority(value: unknown): TicketPriority {
  if (typeof value !== 'string' || !isTicketPriority(value)) {
    throw new BadRequestException('Invalid ticket priority');
  }
  return value;
}

export function parseTicketDescription(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid ticket description');
  }
  const description = value.trim() || null;
  if (description && description.length > MAX_TICKET_DESCRIPTION_LENGTH) {
    throw new BadRequestException(
      `Ticket description must be ${MAX_TICKET_DESCRIPTION_LENGTH} characters or fewer`,
    );
  }
  return description;
}

export function parseTicketDueAt(value: string): Date {
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.getTime())) {
    throw new BadRequestException('Invalid due date');
  }
  return dueAt;
}

function isLabelColor(value: string): value is LabelColor {
  return (LABEL_COLORS as readonly string[]).includes(value);
}

export function parseLabelColor(value: unknown): LabelColor {
  if (typeof value !== 'string' || !isLabelColor(value)) {
    throw new BadRequestException('Invalid label color');
  }
  return value;
}

export function parseLabelName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid label name');
  }
  const name = value.trim();
  if (!name || name.length > 32) {
    throw new BadRequestException('Label name must be 1 to 32 characters');
  }
  return name;
}

export function parseLabelIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 20) {
    throw new BadRequestException('Invalid labels');
  }
  const ids = [
    ...new Set(
      value.filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  if (ids.length !== value.length) {
    throw new BadRequestException('Invalid labels');
  }
  return ids;
}

export function parseWatcherIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new BadRequestException('Invalid watchers');
  }
  const ids = [
    ...new Set(
      value.filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  if (ids.length !== value.length) {
    throw new BadRequestException('Invalid watchers');
  }
  return ids;
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

export function parseChannelKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Invalid channel key');
  }
  const key = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,5}$/.test(key)) {
    throw new BadRequestException(
      'Channel key must be 2 to 5 letters or numbers',
    );
  }
  return key;
}
