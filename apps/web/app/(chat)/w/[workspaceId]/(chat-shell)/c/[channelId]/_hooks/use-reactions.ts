'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  messagesQueryKey,
  toggleMessageReaction,
  reactionsWithViewer,
  type MessageReactionsPayload,
  type MessagesResponse,
} from '../_libs/messages';
import { updatePinnedMessageReactionsInCache } from './use-pins';

export function updateMessageReactionsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string,
  payload: MessageReactionsPayload,
  currentUserId: string,
) {
  const reactions = reactionsWithViewer(payload.reactions, currentUserId);

  queryClient.setQueryData<{
    pages: MessagesResponse[];
    pageParams: (string | undefined)[];
  }>(messagesQueryKey(channelId), (old) => {
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
  });

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
