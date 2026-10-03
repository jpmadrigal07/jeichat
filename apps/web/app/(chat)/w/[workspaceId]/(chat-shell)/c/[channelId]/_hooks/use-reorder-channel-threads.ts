'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  channelThreadsQueryKey,
  channelsQueryKey,
  reorderChannelThreads,
  type Channel,
  type ChannelThread,
} from '@chat/_libs/channels';
import { channelEventsQueryKey } from '../_libs/channel-events';

type ReorderVars = { status: string; ticketIds: string[] };

function applyOrder<T extends Channel>(tickets: T[], vars: ReorderVars): T[] {
  const positions = new Map(vars.ticketIds.map((id, index) => [id, index]));
  return tickets.map((ticket) => {
    const boardPosition = positions.get(ticket.id);
    if (boardPosition === undefined) return ticket;
    return { ...ticket, status: vars.status, boardPosition };
  });
}

/** Persist a board column's manual order (and move any dropped-in tickets). */
export function useReorderChannelThreads(
  workspaceId: string,
  channelId: string,
) {
  const queryClient = useQueryClient();
  const threadsKey = channelThreadsQueryKey(workspaceId, channelId);
  const channelsKey = channelsQueryKey(workspaceId);

  return useMutation({
    mutationFn: (vars: ReorderVars) =>
      reorderChannelThreads(workspaceId, channelId, vars),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: threadsKey, exact: true });
      await queryClient.cancelQueries({ queryKey: channelsKey, exact: true });
      const previousThreads =
        queryClient.getQueryData<ChannelThread[]>(threadsKey);
      const previousChannels = queryClient.getQueryData<Channel[]>(channelsKey);
      queryClient.setQueryData<ChannelThread[]>(threadsKey, (old) =>
        old ? applyOrder(old, vars) : old,
      );
      queryClient.setQueryData<Channel[]>(channelsKey, (old) =>
        old ? applyOrder(old, vars) : old,
      );
      return { previousThreads, previousChannels };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData(threadsKey, context.previousThreads);
      }
      if (context?.previousChannels) {
        queryClient.setQueryData(channelsKey, context.previousChannels);
      }
    },
    onSuccess: (threads) => {
      queryClient.setQueryData(threadsKey, threads);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: channelsKey, exact: true });
      queryClient.invalidateQueries({
        queryKey: channelEventsQueryKey(workspaceId, channelId),
      });
    },
  });
}
