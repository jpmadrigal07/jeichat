'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  channelEventsQueryKey,
  fetchChannelEvents,
  type TicketEvent,
} from '../_libs/channel-events';

export function useChannelEvents(
  workspaceId: string,
  channelId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: channelEventsQueryKey(workspaceId, channelId),
    queryFn: ({ signal }) =>
      fetchChannelEvents(workspaceId, channelId, { signal }),
    enabled: !!workspaceId && !!channelId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function addChannelEventToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  channelId: string,
  event: TicketEvent,
) {
  queryClient.setQueryData<TicketEvent[]>(
    channelEventsQueryKey(workspaceId, channelId),
    (old) => {
      if (!old) return [event];
      if (old.some((item) => item.id === event.id)) return old;
      return [...old, event].sort((a, b) => {
        if (a.createdAt !== b.createdAt) {
          return a.createdAt < b.createdAt ? -1 : 1;
        }
        return a.id < b.id ? -1 : 1;
      });
    },
  );
}
