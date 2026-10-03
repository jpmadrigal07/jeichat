'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import {
  presenceQueryKey,
  type PresenceSnapshot,
  type PresenceUpdate,
} from '../_libs/presence';
import { useWorkspaces, useWorkspaceMembershipSocket } from './use-workspaces';

const EMPTY_WORKSPACE_IDS: string[] = [];

export function usePresenceSocket(workspaceIds: string[]) {
  const queryClient = useQueryClient();
  const joinedRef = useRef(new Set<string>());

  useEffect(() => {
    if (workspaceIds.length === 0) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const syncJoins = () => {
      const currentWorkspaceIds = new Set(workspaceIds);

      for (const workspaceId of workspaceIds) {
        socket.emit('join_workspace', { workspaceId });
        joinedRef.current.add(workspaceId);
      }

      for (const joinedWorkspaceId of [...joinedRef.current]) {
        if (currentWorkspaceIds.has(joinedWorkspaceId)) continue;
        socket.emit('leave_workspace', { workspaceId: joinedWorkspaceId });
        joinedRef.current.delete(joinedWorkspaceId);
      }
    };

    socket.on('connect', syncJoins);
    if (socket.connected) syncJoins();

    return () => {
      socket.off('connect', syncJoins);
    };
  }, [workspaceIds]);

  useEffect(() => {
    const socket = getSocket();

    const handleSnapshot = (payload: PresenceSnapshot) => {
      queryClient.setQueryData(
        presenceQueryKey(payload.workspaceId),
        payload.userIds,
      );
    };

    const handleUpdate = (payload: PresenceUpdate) => {
      queryClient.setQueryData<string[]>(
        presenceQueryKey(payload.workspaceId),
        (current) => {
          const next = new Set(current ?? []);
          if (payload.online) {
            next.add(payload.userId);
          } else {
            next.delete(payload.userId);
          }
          return [...next];
        },
      );
    };

    socket.on('presence_snapshot', handleSnapshot);
    socket.on('presence_update', handleUpdate);

    return () => {
      socket.off('presence_snapshot', handleSnapshot);
      socket.off('presence_update', handleUpdate);
    };
  }, [queryClient]);

  useEffect(() => {
    return () => {
      const socket = getSocket();
      for (const workspaceId of joinedRef.current) {
        socket.emit('leave_workspace', { workspaceId });
      }
      joinedRef.current.clear();
    };
  }, []);
}

export function useWorkspacePresenceSocket() {
  useWorkspaceMembershipSocket();
  const { data: workspaces } = useWorkspaces();
  const workspaceIds = useMemo(
    () => workspaces?.map((workspace) => workspace.id) ?? EMPTY_WORKSPACE_IDS,
    [workspaces],
  );

  usePresenceSocket(workspaceIds);
}

export function useOnlineUserIds(workspaceId: string | undefined) {
  return useQuery({
    queryKey: presenceQueryKey(workspaceId ?? ''),
    queryFn: (): string[] => [],
    enabled: false,
    staleTime: Infinity,
  });
}

export function useIsOnline(
  workspaceId: string | undefined,
  userId: string | undefined,
) {
  const { data: userIds } = useOnlineUserIds(workspaceId);
  if (!workspaceId || !userId) return false;
  return (userIds ?? []).includes(userId);
}
