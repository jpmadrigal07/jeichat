'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchUnreadCounts, unreadCountsQueryKey } from '../_libs/channels';
import { sumUnreadCounts } from '../_helpers/format-unread-count';
import type { Workspace } from '../_libs/workspaces';

export function useInactiveWorkspaceUnreadTotals(
  workspaces: Workspace[],
  activeWorkspaceId?: string,
) {
  const inactiveWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.id !== activeWorkspaceId),
    [workspaces, activeWorkspaceId],
  );

  const queries = useQueries({
    queries: inactiveWorkspaces.map((workspace) => ({
      queryKey: unreadCountsQueryKey(workspace.id),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        fetchUnreadCounts(workspace.id, { signal }),
      enabled: !!workspace.id,
    })),
  });

  const queryData = queries.map((query) => query.data);

  return useMemo(() => {
    const totals: Record<string, number> = {};

    inactiveWorkspaces.forEach((workspace, index) => {
      totals[workspace.id] = sumUnreadCounts(queryData[index]);
    });

    return totals;
  }, [inactiveWorkspaces, queryData]);
}
