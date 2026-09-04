'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import {
  fetchInbox,
  fetchInboxUnreadCount,
  inboxQueryKey,
  inboxUnreadQueryKey,
  markAllInboxRead,
  markInboxNotificationRead,
  type InboxListResponse,
  type InboxNotification,
} from '../_libs/inbox';

export function useInbox(workspaceId: string) {
  return useQuery({
    queryKey: inboxQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchInbox(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useInboxUnreadCount(workspaceId: string) {
  return useQuery({
    queryKey: inboxUnreadQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchInboxUnreadCount(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useMarkInboxRead(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      markInboxNotificationRead(workspaceId, notificationId),
    onSuccess: (result, notificationId) => {
      queryClient.setQueryData(
        inboxUnreadQueryKey(workspaceId),
        result,
      );
      queryClient.setQueryData<InboxListResponse>(
        inboxQueryKey(workspaceId),
        (current) => {
          if (!current) return current;
          return {
            unreadCount: result.unreadCount,
            items: current.items.map((item) =>
              item.id === notificationId
                ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
                : item,
            ),
          };
        },
      );
    },
  });
}

export function useMarkAllInboxRead(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllInboxRead(workspaceId),
    onSuccess: (result) => {
      queryClient.setQueryData(inboxUnreadQueryKey(workspaceId), result);
      queryClient.setQueryData<InboxListResponse>(
        inboxQueryKey(workspaceId),
        (current) => {
          if (!current) return current;
          const readAt = new Date().toISOString();
          return {
            unreadCount: 0,
            items: current.items.map((item) => ({
              ...item,
              readAt: item.readAt ?? readAt,
            })),
          };
        },
      );
    },
  });
}

export function useInboxSocket(workspaceId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleNotification = (notification: InboxNotification) => {
      if (notification.workspaceId !== workspaceId) return;
      queryClient.setQueryData<{ unreadCount: number }>(
        inboxUnreadQueryKey(workspaceId),
        (current) => ({ unreadCount: (current?.unreadCount ?? 0) + 1 }),
      );
      queryClient.setQueryData<InboxListResponse>(
        inboxQueryKey(workspaceId),
        (current) => {
          if (!current) return current;
          if (current.items.some((item) => item.id === notification.id)) {
            return current;
          }
          return {
            unreadCount: current.unreadCount + 1,
            items: [notification, ...current.items],
          };
        },
      );
    };

    socket.on('inbox_notification', handleNotification);
    return () => {
      socket.off('inbox_notification', handleNotification);
    };
  }, [queryClient, workspaceId]);
}
