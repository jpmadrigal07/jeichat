'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  messagesQueryKeyPrefix,
  removeMessageLinkPreviews,
  type MessageLinkPreviewsPayload,
  type MessagesInfiniteData,
} from '../_libs/messages';
import { updatePinnedMessageLinkPreviewsInCache } from './use-pins';

/**
 * Link previews are unfurled after a message is sent, so they arrive as a
 * follow-up event. Patch only that field so a concurrent edit or reaction
 * already in the cache is not overwritten with an older copy of the message.
 */
export function updateMessageLinkPreviewsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string,
  payload: MessageLinkPreviewsPayload,
) {
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
              ? { ...message, linkPreviews: payload.linkPreviews }
              : message,
          ),
        })),
      };
    },
  );

  updatePinnedMessageLinkPreviewsInCache(
    queryClient,
    channelId,
    payload.messageId,
    payload.linkPreviews,
  );
}

export function useRemoveMessageLinkPreviews(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      removeMessageLinkPreviews(channelId, messageId),
    onSuccess: (payload) => {
      updateMessageLinkPreviewsInCache(queryClient, channelId, payload);
    },
  });
}
