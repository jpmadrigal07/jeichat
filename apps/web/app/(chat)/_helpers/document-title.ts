import { ticketDisplayId, ticketPrefixOf } from './ticket-fields';

export const APP_TITLE = 'JeiChat';

export type DocumentTitleRoute =
  | { kind: 'app' }
  | { kind: 'account-settings' }
  | { kind: 'workspace'; workspaceId: string }
  | { kind: 'inbox'; workspaceId: string }
  | { kind: 'workspace-settings'; workspaceId: string }
  | { kind: 'channel'; workspaceId: string; channelId: string }
  | { kind: 'channel-settings'; workspaceId: string; channelId: string };

type TitleChannel = {
  name: string;
  parentId: string | null;
  ticketNumber: number | null;
  channelType?: 'channel' | 'dm';
  dmPeer?: { name: string } | null;
};

type TitleParentChannel = {
  name: string;
  ticketKey?: string | null;
};

export function parseDocumentTitleRoute(pathname: string): DocumentTitleRoute {
  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    return { kind: 'account-settings' };
  }

  const workspaceSettings = pathname.match(/^\/w\/([^/]+)\/settings(?:\/|$)/);
  if (workspaceSettings?.[1]) {
    return {
      kind: 'workspace-settings',
      workspaceId: workspaceSettings[1],
    };
  }

  const channelSettings = pathname.match(
    /^\/w\/([^/]+)\/c\/([^/]+)\/settings(?:\/|$)/,
  );
  if (channelSettings?.[1] && channelSettings[2]) {
    return {
      kind: 'channel-settings',
      workspaceId: channelSettings[1],
      channelId: channelSettings[2],
    };
  }

  const inbox = pathname.match(/^\/w\/([^/]+)\/inbox(?:\/|$)/);
  if (inbox?.[1]) {
    return { kind: 'inbox', workspaceId: inbox[1] };
  }

  const channel = pathname.match(/^\/w\/([^/]+)\/c\/([^/]+)(?:\/|$)/);
  if (channel?.[1] && channel[2]) {
    return {
      kind: 'channel',
      workspaceId: channel[1],
      channelId: channel[2],
    };
  }

  const workspace = pathname.match(/^\/w\/([^/]+)(?:\/|$)/);
  if (workspace?.[1]) {
    return { kind: 'workspace', workspaceId: workspace[1] };
  }

  return { kind: 'app' };
}

export function formatChannelTitleLabel(
  channel: TitleChannel,
  parent?: TitleParentChannel | null,
): string {
  if (channel.channelType === 'dm' && channel.dmPeer) {
    return channel.dmPeer.name;
  }
  if (!channel.parentId) return `#${channel.name}`;

  const prefixSource = parent ?? { name: channel.name, ticketKey: null };
  if (channel.ticketNumber && channel.ticketNumber > 0) {
    return `${ticketDisplayId(ticketPrefixOf(prefixSource), channel.ticketNumber)} ${channel.name}`;
  }
  return channel.name;
}

export function joinTitleParts(
  parts: Array<string | null | undefined>,
): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' | ');
}

export function withUnreadPrefix(unreadCount: number, title: string): string {
  if (unreadCount <= 0) return title;
  const count = unreadCount > 99 ? '99+' : String(unreadCount);
  return `(${count}) ${title}`;
}

export function titleUnreadCount({
  unreadCounts,
  currentChannelId,
  inboxUnread = 0,
  otherWorkspaceUnreads = 0,
}: {
  unreadCounts?: Record<string, number>;
  currentChannelId?: string;
  inboxUnread?: number;
  otherWorkspaceUnreads?: number;
}): number {
  let total = inboxUnread + otherWorkspaceUnreads;
  if (!unreadCounts) return total;

  for (const [channelId, count] of Object.entries(unreadCounts)) {
    if (channelId === currentChannelId) continue;
    total += count;
  }

  return total;
}

export function buildDocumentTitle({
  route,
  workspaceName,
  channel,
  parentChannel,
  unreadCount,
}: {
  route: DocumentTitleRoute;
  workspaceName?: string | null;
  channel?: TitleChannel | null;
  parentChannel?: TitleParentChannel | null;
  unreadCount: number;
}): string {
  const channelLabel = channel
    ? formatChannelTitleLabel(channel, parentChannel)
    : null;

  let title: string;
  switch (route.kind) {
    case 'account-settings':
      title = joinTitleParts(['Settings', APP_TITLE]);
      break;
    case 'workspace-settings':
      title = joinTitleParts(['Settings', workspaceName, APP_TITLE]);
      break;
    case 'inbox':
      title = joinTitleParts(['Inbox', workspaceName, APP_TITLE]);
      break;
    case 'channel':
    case 'channel-settings':
      title = joinTitleParts([channelLabel, workspaceName, APP_TITLE]);
      break;
    case 'workspace':
      title = joinTitleParts([workspaceName, APP_TITLE]);
      break;
    default:
      title = APP_TITLE;
  }

  return withUnreadPrefix(unreadCount, title);
}
