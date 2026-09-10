'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { isApiError } from '@/lib/api-error';
import {
  fetchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  messagesQueryKey,
  messagesQueryKeyPrefix,
  type Message,
  type MessagesInfiniteData,
  type MessagesPageParam,
} from '../_libs/messages';

const LATEST_PAGE_PARAM: MessagesPageParam = { kind: 'latest' };

const MESSAGES_STALE_TIME_MS = 5 * 60 * 1000;
const MESSAGES_GC_TIME_MS = 30 * 60 * 1000;

function isAtLiveTail(data: MessagesInfiniteData | undefined) {
  return !data?.pages[0]?.prevCursor;
}

export function useMessages(
  channelId: string,
  enabled = true,
  aroundMessageId?: string | null,
) {
  return useInfiniteQuery({
    queryKey: messagesQueryKey(channelId, aroundMessageId),
    queryFn: async ({ pageParam, signal }) => {
      try {
        return await fetchMessages(channelId, pageParam, { signal });
      } catch (error) {
        if (
          pageParam.kind === 'around' &&
          isApiError(error) &&
          error.statusCode === 404
        ) {
          return fetchMessages(channelId, { kind: 'latest' }, { signal });
        }
        throw error;
      }
    },
    initialPageParam: aroundMessageId
      ? { kind: 'around', messageId: aroundMessageId }
      : LATEST_PAGE_PARAM,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor
        ? { kind: 'older' as const, cursor: lastPage.nextCursor }
        : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.prevCursor
        ? { kind: 'newer' as const, cursor: firstPage.prevCursor }
        : undefined,
    enabled: !!channelId && enabled,
    staleTime: MESSAGES_STALE_TIME_MS,
    gcTime: MESSAGES_GC_TIME_MS,
    refetchOnMount: 'always',
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
      addMessageToCache(queryClient, channelId, newMessage);
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
  queryClient.setQueriesData<MessagesInfiniteData>(
    { queryKey: messagesQueryKeyPrefix(channelId) },
    (old) => {
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
    },
  );
}

export function removeMessageFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string,
  messageId: string,
) {
  queryClient.setQueriesData<MessagesInfiniteData>(
    { queryKey: messagesQueryKeyPrefix(channelId) },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.filter((m) => m.id !== messageId),
        })),
      };
    },
  );
}

export function addMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string,
  message: Message,
) {
  queryClient.setQueriesData<MessagesInfiniteData>(
    { queryKey: messagesQueryKeyPrefix(channelId) },
    (old) => {
      if (!old) return old;
      if (!isAtLiveTail(old)) return old;
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
    },
  );
}
