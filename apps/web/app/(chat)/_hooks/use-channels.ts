'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchChannels,
  createChannel,
  createOrGetDm,
  createThread,
  updateChannel,
  deleteChannel,
  channelsQueryKey,
  channelThreadsQueryKey,
  type Channel,
  type ChannelThread,
  type UpdateChannelPayload,
} from '../_libs/channels';
import { channelEventsQueryKey } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_libs/channel-events';

function isChannelThreadsQuery(
  queryKey: readonly unknown[],
  workspaceId: string,
) {
  return (
    queryKey[0] === 'workspaces' &&
    queryKey[1] === workspaceId &&
    queryKey[2] === 'channels' &&
    queryKey[4] === 'threads'
  );
}

function applyChannelPatch<T extends Channel>(
  channel: T,
  vars: UpdateChannelPayload & { channelId: string },
): T {
  const remove = new Set(vars.removeAttachmentIds ?? []);
  return {
    ...channel,
    name: vars.name ?? channel.name,
    description:
      vars.description === undefined ? channel.description : vars.description,
    ticketKey:
      vars.ticketKey === undefined ? channel.ticketKey : vars.ticketKey,
    status: vars.status === undefined ? channel.status : vars.status,
    priority: vars.priority === undefined ? channel.priority : vars.priority,
    assigneeId:
      vars.assigneeId === undefined ? channel.assigneeId : vars.assigneeId,
    dueAt: vars.dueAt === undefined ? channel.dueAt : vars.dueAt,
    isPrivate:
      vars.isPrivate === undefined ? channel.isPrivate : vars.isPrivate,
    labels: vars.labels === undefined ? channel.labels : vars.labels,
    attachments: (channel.attachments ?? []).filter(
      (attachment) => !remove.has(attachment.id),
    ),
  };
}

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
    mutationFn: (payload: {
      name: string;
      description?: string;
      ticketKey?: string;
      isPrivate?: boolean;
      memberIds?: string[];
    }) => createChannel(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
    },
  });
}

export function useCreateOrGetDm(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) =>
      createOrGetDm(workspaceId, targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
    },
  });
}

export function useCreateThread(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      name,
      description,
      attachmentIds,
      status,
    }: {
      channelId: string;
      name: string;
      description?: string;
      attachmentIds?: string[];
      status?: string;
    }) =>
      createThread(workspaceId, channelId, {
        name,
        description,
        attachmentIds,
        status,
      }),
    onSuccess: (thread, { channelId }) => {
      queryClient.invalidateQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: channelThreadsQueryKey(workspaceId, channelId),
      });
      queryClient.invalidateQueries({
        queryKey: channelEventsQueryKey(workspaceId, channelId),
      });
      queryClient.invalidateQueries({
        queryKey: channelEventsQueryKey(workspaceId, thread.id),
      });
    },
  });
}

export function useUpdateChannel(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      labels: _labels,
      ...payload
    }: UpdateChannelPayload & { channelId: string }) =>
      updateChannel(workspaceId, channelId, payload),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({
        queryKey: channelsQueryKey(workspaceId),
      });
      const previous = queryClient.getQueryData<Channel[]>(
        channelsQueryKey(workspaceId),
      );
      const previousThreads = queryClient.getQueriesData<ChannelThread[]>({
        predicate: (query) =>
          isChannelThreadsQuery(query.queryKey, workspaceId),
      });
      queryClient.setQueryData<Channel[]>(
        channelsQueryKey(workspaceId),
        (old) =>
          old?.map((channel) =>
            channel.id === vars.channelId
              ? applyChannelPatch(channel, vars)
              : channel,
          ),
      );
      queryClient.setQueriesData<ChannelThread[]>(
        {
          predicate: (query) =>
            isChannelThreadsQuery(query.queryKey, workspaceId),
        },
        (old) =>
          old?.map((thread) =>
            thread.id === vars.channelId
              ? applyChannelPatch(thread, vars)
              : thread,
          ),
      );
      return { previous, previousThreads };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          channelsQueryKey(workspaceId),
          context.previous,
        );
      }
      context?.previousThreads?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (updated, vars) => {
      queryClient.setQueryData<Channel[]>(
        channelsQueryKey(workspaceId),
        (old) =>
          old?.map((channel) => {
            if (channel.id !== updated.id) return channel;
            const replacedImages = Boolean(
              vars.addAttachmentIds?.length || vars.removeAttachmentIds?.length,
            );
            return {
              ...channel,
              ...updated,
              attachments: replacedImages
                ? (updated.attachments ?? [])
                : (channel.attachments ?? updated.attachments ?? []),
            };
          }),
      );
      if (updated.parentId) {
        queryClient.invalidateQueries({
          queryKey: channelThreadsQueryKey(workspaceId, updated.parentId),
        });
        queryClient.invalidateQueries({
          queryKey: channelEventsQueryKey(workspaceId, updated.parentId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: channelEventsQueryKey(workspaceId, updated.id),
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
