'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  parseSidebarChannelOrder,
  serializeSidebarChannelOrder,
  SIDEBAR_CHANNEL_ORDER_STORAGE_PREFIX,
  sidebarChannelOrderKey,
  sortTopLevelChannels,
} from '../_helpers/sidebar-channel-order';

const CHANGE_EVENT = 'jeichat:sidebar-channel-order-change';
const cache = new Map<string, string[]>();

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readOrder(workspaceId: string): string[] {
  if (!workspaceId) return [];
  try {
    const next = parseSidebarChannelOrder(
      localStorage.getItem(sidebarChannelOrderKey(workspaceId)),
    );
    const prev = cache.get(workspaceId);
    if (prev && arraysEqual(prev, next)) return prev;
    cache.set(workspaceId, next);
    return next;
  } catch {
    return [];
  }
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function persistOrder(workspaceId: string, order: string[]) {
  cache.set(workspaceId, order);
  try {
    const key = sidebarChannelOrderKey(workspaceId);
    if (order.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, serializeSidebarChannelOrder(order));
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
      event.key.startsWith(SIDEBAR_CHANNEL_ORDER_STORAGE_PREFIX)
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

export function useSidebarChannelOrder(workspaceId: string) {
  const order = useSyncExternalStore(
    subscribe,
    () => readOrder(workspaceId),
    () => [],
  );

  const setOrder = useCallback(
    (next: string[]) => {
      const current = readOrder(workspaceId);
      if (arraysEqual(current, next)) return;
      persistOrder(workspaceId, next);
    },
    [workspaceId],
  );

  const sortTopLevel = useCallback(
    <T extends { id: string }>(channels: T[]) =>
      sortTopLevelChannels(channels, order),
    [order],
  );

  return { order, setOrder, sortTopLevel };
}
