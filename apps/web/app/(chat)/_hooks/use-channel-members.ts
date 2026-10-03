'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addChannelMember,
  channelMembersQueryKey,
  fetchChannelMembers,
  removeChannelMember,
} from '../_libs/channel-members';
import { channelsQueryKey } from '../_libs/channels';

export function useChannelMembers(
  workspaceId: string,
  channelId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: channelMembersQueryKey(workspaceId, channelId),
    queryFn: ({ signal }) =>
      fetchChannelMembers(workspaceId, channelId, { signal }),
    enabled: !!workspaceId && !!channelId && enabled,
  });
}

export function useAddChannelMember(workspaceId: string, channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      addChannelMember(workspaceId, channelId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelMembersQueryKey(workspaceId, channelId),
      });
      queryClient.invalidateQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
    },
  });
}

export function useRemoveChannelMember(
  workspaceId: string,
  channelId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      removeChannelMember(workspaceId, channelId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelMembersQueryKey(workspaceId, channelId),
      });
      queryClient.invalidateQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
    },
  });
}
