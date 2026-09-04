'use client';

import { useQuery } from '@tanstack/react-query';
import {
  channelThreadsQueryKey,
  fetchChannelThreads,
} from '@chat/_libs/channels';

export function useChannelThreads(workspaceId: string, channelId: string) {
  return useQuery({
    queryKey: channelThreadsQueryKey(workspaceId, channelId),
    queryFn: ({ signal }) =>
      fetchChannelThreads(workspaceId, channelId, { signal }),
    enabled: !!workspaceId && !!channelId,
  });
}
