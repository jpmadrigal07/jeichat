'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { channelsQueryKey, fetchChannels } from '../_libs/channels';
import { incrementUnreadCount } from './use-unread-counts';
import type { Message } from '../w/[workspaceId]/c/[channelId]/_libs/messages';
import type { Workspace } from '../_libs/workspaces';

type UseGlobalUnreadSocketOptions = {
  workspaces: Workspace[];
  activeChannelId?: string;
  userId: string;
};

export function useGlobalUnreadSocket({
  workspaces,
  activeChannelId,
  userId,
}: UseGlobalUnreadSocketOptions) {
  const queryClient = useQueryClient();
  const activeChannelIdRef = useRef(activeChannelId);
  activeChannelIdRef.current = activeChannelId;
  const joinedChannelsRef = useRef(new Set<string>());

  const channelQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: channelsQueryKey(workspace.id),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        fetchChannels(workspace.id, { signal }),
      enabled: workspaces.length > 0,
    })),
  });

  const channelEntries = useMemo(() => {
    const entries: { channelId: string; workspaceId: string }[] = [];

    workspaces.forEach((workspace, index) => {
      for (const channel of channelQueries[index]?.data ?? []) {
        entries.push({ channelId: channel.id, workspaceId: workspace.id });
      }
    });

    return entries;
  }, [workspaces, channelQueries]);

  const channelIds = useMemo(
    () => channelEntries.map((entry) => entry.channelId),
    [channelEntries],
  );

  const channelToWorkspace = useMemo(
    () =>
      new Map(
        channelEntries.map((entry) => [entry.channelId, entry.workspaceId]),
      ),
    [channelEntries],
  );

  useEffect(() => {
    if (channelIds.length === 0) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const currentChannelIds = new Set(channelIds);

    for (const channelId of channelIds) {
      if (joinedChannelsRef.current.has(channelId)) continue;
      socket.emit('join_channel', { channelId });
      joinedChannelsRef.current.add(channelId);
    }

    for (const joinedChannelId of joinedChannelsRef.current) {
      if (currentChannelIds.has(joinedChannelId)) continue;
      socket.emit('leave_channel', { channelId: joinedChannelId });
      joinedChannelsRef.current.delete(joinedChannelId);
    }
  }, [channelIds]);

  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (message: Message) => {
      if (message.senderId === userId) return;
      if (message.channelId === activeChannelIdRef.current) return;

      const workspaceId = channelToWorkspace.get(message.channelId);
      if (!workspaceId) return;

      incrementUnreadCount(queryClient, workspaceId, message.channelId);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [channelToWorkspace, queryClient, userId]);

  useEffect(() => {
    return () => {
      const socket = getSocket();
      for (const channelId of joinedChannelsRef.current) {
        socket.emit('leave_channel', { channelId });
      }
      joinedChannelsRef.current.clear();
    };
  }, []);
}
