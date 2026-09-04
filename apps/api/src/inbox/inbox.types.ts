export const INBOX_NOTIFICATION_TYPES = ['mention', 'assigned'] as const;

export type InboxNotificationType = (typeof INBOX_NOTIFICATION_TYPES)[number];

export type InboxActor = {
  id: string;
  name: string;
  image: string | null;
};

export type InboxChannel = {
  id: string;
  name: string;
  parentId: string | null;
  ticketNumber: number | null;
  ticketKey: string | null;
};

export type InboxParentChannel = {
  id: string;
  name: string;
  ticketKey: string | null;
};

export type InboxMessage = {
  id: string;
  content: string;
};

export type InboxNotification = {
  id: string;
  workspaceId: string;
  type: InboxNotificationType;
  readAt: string | null;
  createdAt: string;
  actor: InboxActor;
  channel: InboxChannel;
  parent: InboxParentChannel | null;
  message: InboxMessage | null;
};
