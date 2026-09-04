'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  fetchPinnedMessages,
  pinMessage,
  unpinMessage,
  pinsQueryKey,
  type Message,
  type PinnedMessage,
  type PinnedMessagesResponse,
} from '../_libs/messages';

const PINS_STALE_TIME_MS = 5 * 60 * 1000;

export function usePinnedMessages(channelId: string, enabled = true) {
  return useQuery({
    queryKey: pinsQueryKey(channelId),
    queryFn: ({ signal }) => fetchPinnedMessages(channelId, { signal }),
    enabled: !!channelId && enabled,
    staleTime: PINS_STALE_TIME_MS,
  });
}

export function usePinMessage(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => pinMessage(channelId, messageId),
    onSuccess: (pin) => {
      addPinToCache(queryClient, channelId, pin);
    },
  });
}

export function useUnpinMessage(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => unpinMessage(channelId, messageId),
    onSuccess: (_, messageId) => {
      removePinFromCache(queryClient, channelId, messageId);
    },
  });
}

export function addPinToCache(
  queryClient: QueryClient,
  channelId: string,
  pin: PinnedMessage,
) {
  queryClient.setQueryData<PinnedMessagesResponse>(
    pinsQueryKey(channelId),
    (old) => {
      if (!old) {
        return { canManageMessages: true, data: [pin] };
      }
      if (old.data.some((item) => item.messageId === pin.messageId)) {
        return old;
      }
      return { ...old, data: [pin, ...old.data] };
    },
  );
}

export function removePinFromCache(
  queryClient: QueryClient,
  channelId: string,
  messageId: string,
) {
  queryClient.setQueryData<PinnedMessagesResponse>(
    pinsQueryKey(channelId),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.filter((item) => item.messageId !== messageId),
      };
    },
  );
}

export function updatePinnedMessageInCache(
  queryClient: QueryClient,
  channelId: string,
  message: Message,
) {
  queryClient.setQueryData<PinnedMessagesResponse>(
    pinsQueryKey(channelId),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((item) =>
          item.messageId === message.id ? { ...item, message } : item,
        ),
      };
    },
  );
}
