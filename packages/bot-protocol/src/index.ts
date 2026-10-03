export const PROTOCOL_VERSION = 1;

export type BotUser = {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  image: string | null;
  bot: true;
  channels: BotChannelSnapshot[];
};

export type BotChannelSnapshot = {
  id: string;
  name: string;
  parentId: string | null;
  channelType: string;
  isPrivate: boolean;
};

export type MessageSender = {
  name: string | null;
  image: string | null;
  isBot: boolean;
};

export type ApiMessage = {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  sender: MessageSender | null;
  replyToId: string | null;
  attachments: unknown[];
  reactions: unknown[];
};

export type ApiChannel = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  channelType: string;
  isPrivate: boolean;
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  dueAt: string | null;
  ticketKey: string | null;
  archivedAt: string | null;
};

export type ChannelEvent = {
  id: string;
  channelId: string;
  parentId: string | null;
  type: string;
  fromValue: unknown;
  toValue: unknown;
  createdAt: string;
  actor: { id: string; name: string; image: string | null } | null;
  ticket: { id: string; name: string; displayId: string } | null;
};

export type MessageDeletedPayload = {
  id: string;
  channelId: string;
};

export type MessageReactionsPayload = {
  messageId: string;
  channelId: string;
  reactions: unknown[];
};

export type GatewayEventName =
  | "new_message"
  | "message_updated"
  | "message_deleted"
  | "message_reactions_updated"
  | "channel_event";

export type SdkEventName =
  | "ready"
  | "reconnected"
  | "messageCreate"
  | "messageUpdate"
  | "messageDelete"
  | "messageReactionsUpdate"
  | "ticketUpdate"
  | "channelUpdate";
