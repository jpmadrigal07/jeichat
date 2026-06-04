import { api } from '@/lib/api';

export type MessageAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
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
};

export async function fetchAttachmentDownloadUrl(
  attachmentId: string,
  ctx?: { signal?: AbortSignal },
): Promise<{ url: string; filename: string; contentType: string }> {
  const { data } = await api.get<{
    url: string;
    filename: string;
    contentType: string;
  }>(`/attachments/${attachmentId}/download-url`, {
    signal: ctx?.signal,
  });
  return data;
}

export type MessagesResponse = {
  data: Message[];
  nextCursor: string | null;
};

/** Messages loaded per infinite-query page (initial channel open + each scroll-up fetch). */
export const MESSAGES_PAGE_SIZE = 50;

export function messagesQueryKey(channelId: string) {
  return ['channels', channelId, 'messages'] as const;
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
  cursor?: string,
  ctx?: { signal?: AbortSignal },
): Promise<MessagesResponse> {
  const params: Record<string, string> = {
    limit: String(MESSAGES_PAGE_SIZE),
  };
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
