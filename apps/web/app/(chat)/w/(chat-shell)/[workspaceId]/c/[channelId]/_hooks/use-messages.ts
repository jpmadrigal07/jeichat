'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  messagesQueryKey,
  MESSAGES_PAGE_SIZE,
  type Message,
  type MessagesResponse,
} from '../_libs/messages';

const MESSAGES_STALE_TIME_MS = 5 * 60 * 1000;
const MESSAGES_GC_TIME_MS = 30 * 60 * 1000;

export function useMessages(channelId: string) {
  return useInfiniteQuery({
    queryKey: messagesQueryKey(channelId),
    queryFn: ({ pageParam, signal }) =>
      fetchMessages(channelId, pageParam, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.data.length < MESSAGES_PAGE_SIZE
        ? undefined
        : (lastPage.nextCursor ?? undefined),
    enabled: !!channelId,
    staleTime: MESSAGES_STALE_TIME_MS,
    gcTime: MESSAGES_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

export function useSendMessage(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      input: string | { content: string; attachmentIds?: string[] },
    ) =>
      typeof input === 'string'
        ? sendMessage(channelId, input)
        : sendMessage(channelId, input.content, input.attachmentIds ?? []),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<{
        pages: MessagesResponse[];
        pageParams: (string | undefined)[];
      }>(messagesQueryKey(channelId), (old) => {
        if (!old) return old;
        const firstPage = old.pages[0];
        if (!firstPage) return old;
        const exists = firstPage.data.some((m) => m.id === newMessage.id);
        if (exists) return old;
        return {
          ...old,
          pages: [
            { ...firstPage, data: [newMessage, ...firstPage.data] },
            ...old.pages.slice(1),
          ],
        };
      });
    },
  });
}

export function useEditMessage(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      editMessage(channelId, messageId, content),
    onSuccess: (updatedMessage) => {
      updateMessageInCache(queryClient, channelId, updatedMessage);
    },
  });
}

export function useDeleteMessage(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(channelId, messageId),
    onSuccess: (_, messageId) => {
      removeMessageFromCache(queryClient, channelId, messageId);
    },
  });
}

export function updateMessageInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string,
  updatedMessage: Message,
) {
  queryClient.setQueryData<{
    pages: MessagesResponse[];
    pageParams: (string | undefined)[];
  }>(messagesQueryKey(channelId), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((m) =>
          m.id === updatedMessage.id ? updatedMessage : m,
        ),
      })),
    };
  });
}

export function removeMessageFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string,
  messageId: string,
) {
  queryClient.setQueryData<{
    pages: MessagesResponse[];
    pageParams: (string | undefined)[];
  }>(messagesQueryKey(channelId), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.filter((m) => m.id !== messageId),
      })),
    };
  });
}

export function addMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string,
  message: Message,
) {
  queryClient.setQueryData<{
    pages: MessagesResponse[];
    pageParams: (string | undefined)[];
  }>(messagesQueryKey(channelId), (old) => {
    if (!old) return old;
    const firstPage = old.pages[0];
    if (!firstPage) return old;
    const exists = firstPage.data.some((m) => m.id === message.id);
    if (exists) return old;
    return {
      ...old,
      pages: [
        { ...firstPage, data: [message, ...firstPage.data] },
        ...old.pages.slice(1),
      ],
    };
  });
}
