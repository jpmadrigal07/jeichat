'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  messagesQueryKeyPrefix,
  toggleMessageReaction,
  reactionsWithViewer,
  type MessageReactionsPayload,
  type MessagesInfiniteData,
} from '../_libs/messages';
import { updatePinnedMessageReactionsInCache } from './use-pins';

export function updateMessageReactionsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string,
  payload: MessageReactionsPayload,
  currentUserId: string,
) {
  const reactions = reactionsWithViewer(payload.reactions, currentUserId);

  queryClient.setQueriesData<MessagesInfiniteData>(
    { queryKey: messagesQueryKeyPrefix(channelId) },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.map((message) =>
            message.id === payload.messageId
              ? { ...message, reactions }
              : message,
          ),
        })),
      };
    },
  );

  updatePinnedMessageReactionsInCache(
    queryClient,
    channelId,
    payload.messageId,
    reactions,
  );
}

export function useToggleMessageReaction(
  channelId: string,
  currentUserId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      toggleMessageReaction(channelId, messageId, emoji),
    onSuccess: (payload) => {
      updateMessageReactionsInCache(
        queryClient,
        channelId,
        payload,
        currentUserId,
      );
    },
  });
}
