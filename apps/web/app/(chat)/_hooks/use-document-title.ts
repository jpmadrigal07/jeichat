'use client';

import { usePathname } from 'next/navigation';
import { useChannels } from './use-channels';
import { useInboxUnreadCount } from './use-inbox';
import { useInactiveWorkspaceUnreadTotals } from './use-inactive-workspace-unread-totals';
import { useUnreadCounts } from './use-unread-counts';
import { useWorkspaces } from './use-workspaces';
import { sumUnreadCounts } from '../_helpers/format-unread-count';
import {
  APP_TITLE,
  buildDocumentTitle,
  parseDocumentTitleRoute,
  titleUnreadCount,
} from '../_helpers/document-title';
import type { Workspace } from '../_libs/workspaces';

const NO_WORKSPACES: Workspace[] = [];

export function useDocumentTitle() {
  const pathname = usePathname();
  const route = parseDocumentTitleRoute(pathname);
  const workspaceId = 'workspaceId' in route ? route.workspaceId : '';
  const channelId = 'channelId' in route ? route.channelId : undefined;

  const { data: workspaces } = useWorkspaces();
  const { data: channels } = useChannels(workspaceId);
  const { data: unreadCounts } = useUnreadCounts(workspaceId);
  const { data: inboxUnread } = useInboxUnreadCount(workspaceId);
  const otherWorkspaceTotals = useInactiveWorkspaceUnreadTotals(
    workspaceId ? (workspaces ?? NO_WORKSPACES) : NO_WORKSPACES,
    workspaceId || undefined,
  );

  const workspaceName = workspaces?.find(
    (workspace) => workspace.id === workspaceId,
  )?.name;
  const channel = channelId
    ? channels?.find((item) => item.id === channelId)
    : undefined;
  const parentChannel = channel?.parentId
    ? channels?.find((item) => item.id === channel.parentId)
    : undefined;

  return (
    buildDocumentTitle({
      route,
      workspaceName,
      channel,
      parentChannel,
      unreadCount: titleUnreadCount({
        unreadCounts,
        currentChannelId: channelId,
        inboxUnread: inboxUnread?.unreadCount ?? 0,
        otherWorkspaceUnreads: sumUnreadCounts(otherWorkspaceTotals),
      }),
    }) || APP_TITLE
  );
}
