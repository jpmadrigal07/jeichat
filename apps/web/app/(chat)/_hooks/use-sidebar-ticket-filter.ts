'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_SIDEBAR_TICKET_FILTER,
  EMPTY_SIDEBAR_TICKET_FILTERS,
  parseSidebarTicketFilters,
  sidebarTicketFilterEquals,
  sidebarTicketFilterKey,
  sidebarTicketFiltersEqual,
  SIDEBAR_TICKET_FILTER_STORAGE_PREFIX,
  type SidebarTicketFilter,
  type SidebarTicketFiltersByChannel,
} from '../_helpers/sidebar-ticket-filter';

const CHANGE_EVENT = 'jeichat:sidebar-ticket-filter-change';
const cache = new Map<string, SidebarTicketFiltersByChannel>();

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readFilters(workspaceId: string): SidebarTicketFiltersByChannel {
  if (!workspaceId) return EMPTY_SIDEBAR_TICKET_FILTERS;
  try {
    const next = parseSidebarTicketFilters(
      localStorage.getItem(sidebarTicketFilterKey(workspaceId)),
    );
    const prev = cache.get(workspaceId);
    if (prev && sidebarTicketFiltersEqual(prev, next)) return prev;
    cache.set(workspaceId, next);
    return next;
  } catch {
    return EMPTY_SIDEBAR_TICKET_FILTERS;
  }
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key &&
      event.key.startsWith(SIDEBAR_TICKET_FILTER_STORAGE_PREFIX)
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

export function useSidebarTicketFilters(workspaceId: string) {
  const filters = useSyncExternalStore(
    subscribe,
    () => readFilters(workspaceId),
    () => EMPTY_SIDEBAR_TICKET_FILTERS,
  );

  const setChannelFilter = useCallback(
    (channelId: string, next: SidebarTicketFilter) => {
      const current = readFilters(workspaceId);
      const filtersByChannel: SidebarTicketFiltersByChannel = { ...current };
      if (sidebarTicketFilterEquals(next, DEFAULT_SIDEBAR_TICKET_FILTER)) {
        delete filtersByChannel[channelId];
      } else {
        filtersByChannel[channelId] = next;
      }
      cache.set(workspaceId, filtersByChannel);
      try {
        const key = sidebarTicketFilterKey(workspaceId);
        if (Object.keys(filtersByChannel).length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(filtersByChannel));
        }
      } catch {
        // Ignore quota / private-mode failures.
      }
      notify();
    },
    [workspaceId],
  );

  return { filters, setChannelFilter };
}
