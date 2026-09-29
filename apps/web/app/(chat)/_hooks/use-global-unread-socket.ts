'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { showMessageNotificationToast } from '../_components/message-notification-toast';
import {
  isAppInForeground,
  showDesktopMessageNotification,
} from '../_helpers/desktop-notifications';
import { playInboxNotificationSound } from '../_helpers/inbox-notification-sound';
import { channelsQueryKey, fetchChannels } from '../_libs/channels';
import type { MessageNotification } from '../_libs/message-notifications';
import type { Workspace } from '../_libs/workspaces';
import { bumpDmLastMessageAt } from './use-channels';
import { incrementUnreadCount } from './use-unread-counts';

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
  const router = useRouter();
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

  const workspaceIdByChannelRef = useRef(new Map<string, string>());
  workspaceIdByChannelRef.current = new Map(
    channelEntries.map((entry) => [entry.channelId, entry.workspaceId]),
  );

  useEffect(() => {
    if (channelIds.length === 0) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const syncJoins = () => {
      const currentChannelIds = new Set(channelIds);

      for (const channelId of channelIds) {
        socket.emit('join_channel', { channelId });
        joinedChannelsRef.current.add(channelId);
      }

      for (const joinedChannelId of [...joinedChannelsRef.current]) {
        if (currentChannelIds.has(joinedChannelId)) continue;
        socket.emit('leave_channel', { channelId: joinedChannelId });
        joinedChannelsRef.current.delete(joinedChannelId);
      }
    };

    socket.on('connect', syncJoins);
    if (socket.connected) syncJoins();

    return () => {
      socket.off('connect', syncJoins);
    };
  }, [channelIds]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleMessageNotification = (notification: MessageNotification) => {
      if (notification.message.senderId === userId) return;

      const viewingThisChannel =
        notification.channel.id === activeChannelIdRef.current;
      const inForeground = isAppInForeground();

      // Only suppress alerts when you are actually looking at this channel.
      if (viewingThisChannel && inForeground) return;

      if (!viewingThisChannel) {
        incrementUnreadCount(
          queryClient,
          notification.workspaceId,
          notification.channel.id,
        );
      }

      // Muted or mentions-only: the unread count is updated, nothing else.
      if (notification.silent) return;

      if (inForeground) {
        playInboxNotificationSound();
        showMessageNotificationToast(notification);
        return;
      }

      void showDesktopMessageNotification(notification, (href) => {
        router.push(href);
      });
    };

    // Every channel room is joined, so this fires for your own sends and for
    // muted DMs too, which `message_notification` does not cover.
    const handleNewMessage = (message: {
      channelId: string;
      createdAt: string;
    }) => {
      const messageWorkspaceId = workspaceIdByChannelRef.current.get(
        message.channelId,
      );
      if (!messageWorkspaceId) return;
      bumpDmLastMessageAt(
        queryClient,
        messageWorkspaceId,
        message.channelId,
        message.createdAt,
      );
    };

    socket.on('message_notification', handleMessageNotification);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('message_notification', handleMessageNotification);
      socket.off('new_message', handleNewMessage);
    };
  }, [queryClient, router, userId]);

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
