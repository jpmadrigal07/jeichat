import { api } from '@/lib/api';

export const TICKET_EVENT_TYPES = [
  'ticket_created',
  'status_changed',
  'priority_changed',
  'assignee_changed',
  'due_changed',
  'labels_changed',
] as const;

export const PARENT_CHANNEL_EVENT_TYPES = [
  'ticket_created',
  'status_changed',
  'priority_changed',
  'assignee_changed',
] as const;

export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];
export type ParentChannelEventType = (typeof PARENT_CHANNEL_EVENT_TYPES)[number];

const PARENT_CHANNEL_EVENT_TYPE_SET = new Set<string>(
  PARENT_CHANNEL_EVENT_TYPES,
);

export function isParentChannelEventType(
  type: string,
): type is ParentChannelEventType {
  return PARENT_CHANNEL_EVENT_TYPE_SET.has(type);
}

export type TicketEventActor = {
  id: string;
  name: string;
  image: string | null;
};

export type TicketEventAssignee = {
  id: string;
  name: string;
};

export type TicketEventLabel = {
  id: string;
  name: string;
  color: string;
};

export type TicketEventTicket = {
  id: string;
  name: string;
  displayId: string;
};

export type TicketEvent = {
  id: string;
  channelId: string;
  parentId: string | null;
  type: TicketEventType;
  fromValue: unknown;
  toValue: unknown;
  createdAt: string;
  actor: TicketEventActor | null;
  ticket: TicketEventTicket | null;
};

export function channelEventsQueryKey(workspaceId: string, channelId: string) {
  return ['workspaces', workspaceId, 'channels', channelId, 'events'] as const;
}

export async function fetchChannelEvents(
  workspaceId: string,
  channelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<TicketEvent[]> {
  const { data } = await api.get<TicketEvent[]>(
    `/workspaces/${workspaceId}/channels/${channelId}/events`,
    { signal: ctx?.signal },
  );
  return data;
}
