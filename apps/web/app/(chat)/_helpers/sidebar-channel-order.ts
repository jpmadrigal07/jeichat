export const SIDEBAR_CHANNEL_ORDER_STORAGE_PREFIX =
  'jeichat:sidebar-channel-order:v1:';

export function sidebarChannelOrderKey(workspaceId: string) {
  return `${SIDEBAR_CHANNEL_ORDER_STORAGE_PREFIX}${workspaceId}`;
}

export function parseSidebarChannelOrder(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
  } catch {
    return [];
  }
}

export function serializeSidebarChannelOrder(ids: string[]) {
  return JSON.stringify(ids);
}

export function sortTopLevelChannels<T extends { id: string }>(
  channels: T[],
  order: readonly string[],
): T[] {
  if (order.length === 0) return channels;
  const index = new Map(order.map((id, position) => [id, position]));
  return [...channels].sort((a, b) => {
    const aIndex = index.get(a.id);
    const bIndex = index.get(b.id);
    if (aIndex === undefined && bIndex === undefined) return 0;
    if (aIndex === undefined) return 1;
    if (bIndex === undefined) return -1;
    return aIndex - bIndex;
  });
}

/** Order after moving `channelId` before `beforeChannelId` (null = end). */
export function reorderedSidebarChannelIds({
  channelIds,
  channelId,
  beforeChannelId,
}: {
  channelIds: string[];
  channelId: string;
  beforeChannelId: string | null;
}): string[] | null {
  if (channelId === beforeChannelId) return null;
  const rest = channelIds.filter((id) => id !== channelId);
  const insertAt = beforeChannelId
    ? rest.indexOf(beforeChannelId)
    : rest.length;
  if (beforeChannelId && insertAt < 0) return null;
  const next = [...rest];
  next.splice(insertAt < 0 ? rest.length : insertAt, 0, channelId);
  const unchanged = next.every((id, index) => id === channelIds[index]);
  return unchanged ? null : next;
}
