'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUnreadCounts,
  markChannelAsRead,
  unreadCountsQueryKey,
  type UnreadCounts,
} from '../_libs/channels';

export function useUnreadCounts(workspaceId: string) {
  return useQuery({
    queryKey: unreadCountsQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchUnreadCounts(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useMarkChannelRead(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channelId: string) =>
      markChannelAsRead(workspaceId, channelId),
    onSuccess: (_, channelId) => {
      queryClient.setQueryData<UnreadCounts>(
        unreadCountsQueryKey(workspaceId),
        (old) => (old ? { ...old, [channelId]: 0 } : { [channelId]: 0 }),
      );
    },
  });
}

export function incrementUnreadCount(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  channelId: string,
) {
  queryClient.setQueryData<UnreadCounts>(
    unreadCountsQueryKey(workspaceId),
    (old) => {
      const prev = old?.[channelId] ?? 0;
      return { ...old, [channelId]: prev + 1 };
    },
  );
}
