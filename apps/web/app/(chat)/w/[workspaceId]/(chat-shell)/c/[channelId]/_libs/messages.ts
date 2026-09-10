import { channelPageHref } from '@chat/_libs/channels';
import { api } from '@/lib/api';

export type MessageAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type MessageReaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  users: { id: string; name: string }[];
};

export type MessageReactionsPayload = {
  messageId: string;
  channelId: string;
  reactions: MessageReaction[];
};

export type Message = {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  sender: {
    name: string;
    image: string | null;
  } | null;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
};

export type MessagesResponse = {
  data: Message[];
  nextCursor: string | null;
  prevCursor?: string | null;
};

export type MessagesPageParam =
  | { kind: 'latest' }
  | { kind: 'around'; messageId: string }
  | { kind: 'older'; cursor: string }
  | { kind: 'newer'; cursor: string };

export type MessagesInfiniteData = {
  pages: MessagesResponse[];
  pageParams: MessagesPageParam[];
};

/** Messages loaded per infinite-query page (initial channel open + each scroll fetch). */
export const MESSAGES_PAGE_SIZE = 50;

export const MESSAGE_HIGHLIGHT_PARAM = 'message';

export function messagesQueryKey(
  channelId: string,
  aroundMessageId?: string | null,
) {
  return aroundMessageId
    ? (['channels', channelId, 'messages', aroundMessageId] as const)
    : (['channels', channelId, 'messages'] as const);
}

export function messagesQueryKeyPrefix(channelId: string) {
  return ['channels', channelId, 'messages'] as const;
}

export function pinsQueryKey(channelId: string) {
  return ['channels', channelId, 'pins'] as const;
}

export type PinnedMessage = {
  id: string;
  channelId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: string;
  pinnedByUser: {
    name: string;
    image: string | null;
  } | null;
  message: Message;
};

export type PinnedMessagesResponse = {
  canManageMessages: boolean;
  data: PinnedMessage[];
};

export function pinnedMessageHref(
  messageId: string,
  search?: Pick<URLSearchParams, 'toString'>,
) {
  const params = new URLSearchParams(search?.toString() ?? '');
  params.set(MESSAGE_HIGHLIGHT_PARAM, messageId);
  return `?${params.toString()}`;
}

export function messagePageHref(
  workspaceId: string,
  channelId: string,
  messageId: string,
) {
  const params = new URLSearchParams();
  params.set(MESSAGE_HIGHLIGHT_PARAM, messageId);
  return `${channelPageHref(workspaceId, channelId)}?${params.toString()}`;
}

export function flattenMessagePages(
  pages: MessagesResponse[] | undefined,
): Message[] {
  if (!pages?.length) return [];

  const seen = new Set<string>();
  const result: Message[] = [];

  for (const page of pages) {
    for (const message of page.data) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      result.push(message);
    }
  }

  return result;
}

export async function fetchMessages(
  channelId: string,
  pageParam: MessagesPageParam | string | undefined = { kind: 'latest' },
  ctx?: { signal?: AbortSignal },
): Promise<MessagesResponse> {
  const param: MessagesPageParam =
    typeof pageParam === 'string'
      ? { kind: 'older', cursor: pageParam }
      : (pageParam ?? { kind: 'latest' });
  const params: Record<string, string> = {
    limit: String(MESSAGES_PAGE_SIZE),
  };
  if (param.kind === 'around') params.around = param.messageId;
  if (param.kind === 'older') params.cursor = param.cursor;
  if (param.kind === 'newer') {
    params.cursor = param.cursor;
    params.direction = 'newer';
  }
  const { data } = await api.get<MessagesResponse>(
    `/channels/${channelId}/messages`,
    { params, signal: ctx?.signal },
  );
  return data;
}

export async function sendMessage(
  channelId: string,
  content: string,
  attachmentIds: string[] = [],
): Promise<Message> {
  const { data } = await api.post<Message>(
    `/channels/${channelId}/messages`,
    { content, attachmentIds },
  );
  return data;
}

export async function editMessage(
  channelId: string,
  messageId: string,
  content: string,
): Promise<Message> {
  const { data } = await api.patch<Message>(
    `/channels/${channelId}/messages/${messageId}`,
    { content },
  );
  return data;
}

export async function deleteMessage(
  channelId: string,
  messageId: string,
): Promise<void> {
  await api.delete(`/channels/${channelId}/messages/${messageId}`);
}

export async function fetchPinnedMessages(
  channelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<PinnedMessagesResponse> {
  const { data } = await api.get<PinnedMessagesResponse>(
    `/channels/${channelId}/pins`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function pinMessage(
  channelId: string,
  messageId: string,
): Promise<PinnedMessage> {
  const { data } = await api.post<PinnedMessage>(
    `/channels/${channelId}/messages/${messageId}/pin`,
  );
  return data;
}

export async function unpinMessage(
  channelId: string,
  messageId: string,
): Promise<void> {
  await api.delete(`/channels/${channelId}/messages/${messageId}/pin`);
}

export async function toggleMessageReaction(
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<MessageReactionsPayload> {
  const { data } = await api.post<MessageReactionsPayload>(
    `/channels/${channelId}/messages/${messageId}/reactions`,
    { emoji },
  );
  return data;
}

export function reactionsWithViewer(
  reactions: MessageReaction[],
  currentUserId: string,
): MessageReaction[] {
  return reactions.map((reaction) => ({
    ...reaction,
    reactedByMe: reaction.users.some((user) => user.id === currentUserId),
  }));
}
