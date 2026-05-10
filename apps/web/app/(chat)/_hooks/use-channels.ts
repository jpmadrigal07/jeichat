'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  channelsQueryKey,
} from '../_libs/channels';

export function useChannels(workspaceId: string) {
  return useQuery({
    queryKey: channelsQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchChannels(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useCreateChannel(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      createChannel(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
    },
  });
}

export function useUpdateChannel(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      ...payload
    }: {
      channelId: string;
      name?: string;
      description?: string | null;
    }) => updateChannel(workspaceId, channelId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
    },
  });
}

export function useDeleteChannel(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => deleteChannel(workspaceId, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
    },
  });
}
