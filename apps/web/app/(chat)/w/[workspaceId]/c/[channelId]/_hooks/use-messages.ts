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
  type Message,
  type MessagesResponse,
} from '../_libs/messages';

export function useMessages(channelId: string) {
  return useInfiniteQuery({
    queryKey: messagesQueryKey(channelId),
    queryFn: ({ pageParam, signal }) =>
      fetchMessages(channelId, pageParam, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!channelId,
  });
}

export function useSendMessage(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => sendMessage(channelId, content),
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
