'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  EMPTY_COLLAPSED_CHANNEL_IDS,
  collapsedChannelIdsEqual,
  parseCollapsedChannelIds,
  serializeCollapsedChannelIds,
  SIDEBAR_CHANNEL_COLLAPSE_STORAGE_PREFIX,
  sidebarChannelCollapseKey,
} from '../_helpers/sidebar-channel-collapse';

const CHANGE_EVENT = 'jeichat:sidebar-channel-collapse-change';
const cache = new Map<string, ReadonlySet<string>>();

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readCollapsedIds(workspaceId: string): ReadonlySet<string> {
  if (!workspaceId) return EMPTY_COLLAPSED_CHANNEL_IDS;
  try {
    const next = parseCollapsedChannelIds(
      localStorage.getItem(sidebarChannelCollapseKey(workspaceId)),
    );
    const prev = cache.get(workspaceId);
    if (prev && collapsedChannelIdsEqual(prev, next)) return prev;
    cache.set(workspaceId, next);
    return next;
  } catch {
    return EMPTY_COLLAPSED_CHANNEL_IDS;
  }
}

function persistCollapsedIds(
  workspaceId: string,
  collapsedIds: ReadonlySet<string>,
) {
  cache.set(workspaceId, collapsedIds);
  try {
    const key = sidebarChannelCollapseKey(workspaceId);
    if (collapsedIds.size === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, serializeCollapsedChannelIds(collapsedIds));
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
  notify();
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key &&
      event.key.startsWith(SIDEBAR_CHANNEL_COLLAPSE_STORAGE_PREFIX)
    ) {
      onStoreChange();
    }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function useSidebarChannelCollapse(workspaceId: string) {
  const collapsedIds = useSyncExternalStore(
    subscribe,
    () => readCollapsedIds(workspaceId),
    () => EMPTY_COLLAPSED_CHANNEL_IDS,
  );

  const setChannelCollapsed = useCallback(
    (channelId: string, collapsed: boolean) => {
      const current = readCollapsedIds(workspaceId);
      if (current.has(channelId) === collapsed) return;
      const next = new Set(current);
      if (collapsed) {
        next.add(channelId);
      } else {
        next.delete(channelId);
      }
      persistCollapsedIds(workspaceId, next);
    },
    [workspaceId],
  );

  return { collapsedIds, setChannelCollapsed };
}
