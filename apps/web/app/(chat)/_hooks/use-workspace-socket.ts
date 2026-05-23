'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { incrementUnreadCount } from './use-unread-counts';
import type { Message } from '../w/[workspaceId]/c/[channelId]/_libs/messages';

export function useWorkspaceSocket(
  workspaceId: string,
  channelIds: string[],
  activeChannelId: string | undefined,
  userId: string,
) {
  const queryClient = useQueryClient();
  const activeChannelIdRef = useRef(activeChannelId);
  activeChannelIdRef.current = activeChannelId;

  useEffect(() => {
    if (!workspaceId || channelIds.length === 0) return;

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    for (const channelId of channelIds) {
      socket.emit('join_channel', { channelId });
    }

    const handleNewMessage = (message: Message) => {
      if (message.senderId === userId) return;
      if (message.channelId === activeChannelIdRef.current) return;

      incrementUnreadCount(queryClient, workspaceId, message.channelId);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      for (const channelId of channelIds) {
        socket.emit('leave_channel', { channelId });
      }
      socket.off('new_message', handleNewMessage);
    };
  }, [workspaceId, channelIds, userId, queryClient]);
}
