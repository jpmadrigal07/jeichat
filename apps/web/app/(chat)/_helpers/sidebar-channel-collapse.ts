export const SIDEBAR_CHANNEL_COLLAPSE_STORAGE_PREFIX =
  'jeichat:sidebar-channel-collapse:v1:';

export const EMPTY_COLLAPSED_CHANNEL_IDS: ReadonlySet<string> = new Set();

export function sidebarChannelCollapseKey(workspaceId: string) {
  return `${SIDEBAR_CHANNEL_COLLAPSE_STORAGE_PREFIX}${workspaceId}`;
}

export function collapsedChannelIdsEqual(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
) {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

export function parseCollapsedChannelIds(raw: string | null): ReadonlySet<string> {
  if (!raw) return EMPTY_COLLAPSED_CHANNEL_IDS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_COLLAPSED_CHANNEL_IDS;
    const ids = parsed.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
    if (ids.length === 0) return EMPTY_COLLAPSED_CHANNEL_IDS;
    return new Set(ids);
  } catch {
    return EMPTY_COLLAPSED_CHANNEL_IDS;
  }
}

export function serializeCollapsedChannelIds(ids: ReadonlySet<string>) {
  return JSON.stringify([...ids]);
}

export function isChannelFolderCollapsed(
  collapsedIds: ReadonlySet<string>,
  channelId: string,
) {
  return collapsedIds.has(channelId);
}
