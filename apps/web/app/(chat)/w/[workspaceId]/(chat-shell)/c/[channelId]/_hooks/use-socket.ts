'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import {
  addMessageToCache,
  updateMessageInCache,
  removeMessageFromCache,
} from './use-messages';
import {
  addPinToCache,
  removePinFromCache,
  updatePinnedMessageInCache,
} from './use-pins';
import { updateMessageReactionsInCache } from './use-reactions';
import type { Message, MessageReactionsPayload, PinnedMessage } from '../_libs/messages';
import { addChannelEventToCache } from './use-channel-events';
import {
  isParentChannelEventType,
  type TicketEvent,
} from '../_libs/channel-events';

type TypingUser = { userId: string; userName: string };

export function useSocket(
  workspaceId: string,
  channelId: string,
  currentUserId: string,
  onTyping?: (user: TypingUser) => void,
) {
  const queryClient = useQueryClient();
  const workspaceIdRef = useRef(workspaceId);
  const channelIdRef = useRef(channelId);
  const currentUserIdRef = useRef(currentUserId);
  workspaceIdRef.current = workspaceId;
  channelIdRef.current = channelId;
  currentUserIdRef.current = currentUserId;

  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const handleNewMessage = (message: Message) => {
      if (message.channelId === channelIdRef.current) {
        addMessageToCache(queryClient, channelIdRef.current, message);
      }
    };

    const handleMessageUpdated = (message: Message) => {
      if (message.channelId === channelIdRef.current) {
        updateMessageInCache(queryClient, channelIdRef.current, message);
        updatePinnedMessageInCache(queryClient, channelIdRef.current, message);
      }
    };

    const handleMessageDeleted = (payload: { id: string; channelId: string }) => {
      if (payload.channelId === channelIdRef.current) {
        removeMessageFromCache(queryClient, channelIdRef.current, payload.id);
        removePinFromCache(queryClient, channelIdRef.current, payload.id);
      }
    };

    const handleMessagePinned = (pin: PinnedMessage) => {
      if (pin.channelId === channelIdRef.current) {
        addPinToCache(queryClient, channelIdRef.current, pin);
      }
    };

    const handleMessageUnpinned = (payload: {
      id: string;
      channelId: string;
    }) => {
      if (payload.channelId === channelIdRef.current) {
        removePinFromCache(queryClient, channelIdRef.current, payload.id);
      }
    };

    const handleMessageReactionsUpdated = (payload: MessageReactionsPayload) => {
      if (payload.channelId === channelIdRef.current) {
        updateMessageReactionsInCache(
          queryClient,
          channelIdRef.current,
          payload,
          currentUserIdRef.current,
        );
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

    const joinCurrent = () => {
      socket.emit('join_channel', { channelId: channelIdRef.current });
    };

    const handleChannelEvent = (event: TicketEvent) => {
      const current = channelIdRef.current;
      if (event.channelId === current) {
        addChannelEventToCache(
          queryClient,
          workspaceIdRef.current,
          current,
          event,
        );
        return;
      }
      if (
        event.parentId === current &&
        isParentChannelEventType(event.type)
      ) {
        addChannelEventToCache(
          queryClient,
          workspaceIdRef.current,
          current,
          event,
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('message_unpinned', handleMessageUnpinned);
    socket.on('message_reactions_updated', handleMessageReactionsUpdated);
    socket.on('channel_event', handleChannelEvent);
    socket.on('user_typing', handleUserTyping);
    socket.on('connect', joinCurrent);
    if (socket.connected) joinCurrent();

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('message_unpinned', handleMessageUnpinned);
      socket.off('message_reactions_updated', handleMessageReactionsUpdated);
      socket.off('channel_event', handleChannelEvent);
      socket.off('user_typing', handleUserTyping);
      socket.off('connect', joinCurrent);
    };
  }, [workspaceId, channelId, queryClient, onTyping]);

  const emitTyping = useCallback(() => {
    const socket = getSocket();
    socket.emit('typing', { channelId: channelIdRef.current });
  }, []);

  return { emitTyping };
}
