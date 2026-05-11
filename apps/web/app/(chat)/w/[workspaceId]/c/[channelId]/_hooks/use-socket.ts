'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import {
  addMessageToCache,
  updateMessageInCache,
  removeMessageFromCache,
} from './use-messages';
import type { Message } from '../_libs/messages';

type TypingUser = { userId: string; userName: string };

export function useSocket(
  channelId: string,
  onTyping?: (user: TypingUser) => void,
) {
  const queryClient = useQueryClient();
  const channelIdRef = useRef(channelId);
  channelIdRef.current = channelId;

  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_channel', { channelId });

    const handleNewMessage = (message: Message) => {
      if (message.channelId === channelIdRef.current) {
        addMessageToCache(queryClient, channelIdRef.current, message);
      }
    };

    const handleMessageUpdated = (message: Message) => {
      if (message.channelId === channelIdRef.current) {
        updateMessageInCache(queryClient, channelIdRef.current, message);
      }
    };

    const handleMessageDeleted = (payload: { id: string; channelId: string }) => {
      if (payload.channelId === channelIdRef.current) {
        removeMessageFromCache(queryClient, channelIdRef.current, payload.id);
      }
    };

    const handleUserTyping = (payload: {
      channelId: string;
      userId: string;
      userName: string;
    }) => {
      if (payload.channelId === channelIdRef.current) {
        onTyping?.({ userId: payload.userId, userName: payload.userName });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.emit('leave_channel', { channelId });
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_typing', handleUserTyping);
    };
  }, [channelId, queryClient, onTyping]);

  const emitTyping = useCallback(() => {
    const socket = getSocket();
    socket.emit('typing', { channelId: channelIdRef.current });
  }, []);

  return { emitTyping };
}
