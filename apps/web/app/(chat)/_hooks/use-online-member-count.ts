'use client';

import { useMemo } from 'react';
import { useOnlineUserIds } from './use-presence';
import { useWorkspaceMembers } from './use-workspaces';

/** Number of workspace members currently online (matches the Members page). */
export function useOnlineMemberCount(workspaceId: string | undefined) {
  const { data: members } = useWorkspaceMembers(workspaceId ?? '');
  const { data: onlineIds } = useOnlineUserIds(workspaceId);

  return useMemo(() => {
    const online = new Set(onlineIds ?? []);
    return (members ?? []).filter((member) => online.has(member.userId))
      .length;
  }, [members, onlineIds]);
}
