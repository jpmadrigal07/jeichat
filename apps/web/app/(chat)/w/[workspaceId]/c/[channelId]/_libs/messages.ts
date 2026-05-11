import { api } from '@/lib/api';

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
};

export type MessagesResponse = {
  data: Message[];
  nextCursor: string | null;
};

export function messagesQueryKey(channelId: string) {
  return ['channels', channelId, 'messages'] as const;
}

export async function fetchMessages(
  channelId: string,
  cursor?: string,
  ctx?: { signal?: AbortSignal },
): Promise<MessagesResponse> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<MessagesResponse>(
    `/channels/${channelId}/messages`,
    { params, signal: ctx?.signal },
  );
  return data;
}

export async function sendMessage(
  channelId: string,
  content: string,
): Promise<Message> {
  const { data } = await api.post<Message>(
    `/channels/${channelId}/messages`,
    { content },
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
