'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  isRunnableSearch,
  parseSearchQuery,
} from '../_helpers/parse-search-query';
import {
  searchQueryKey,
  searchWorkspace,
} from '../_libs/search';
import {
  clearSearchHistory,
  getSearchHistory,
  getSearchHistoryServerSnapshot,
  pushSearchHistory,
  subscribeSearchHistory,
} from '../_libs/search-history';

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

export function useWorkspaceSearch(workspaceId: string, query: string) {
  const parsed = parseSearchQuery(query);
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const runnable = isRunnableSearch(parseSearchQuery(debouncedQuery));

  const results = useQuery({
    queryKey: searchQueryKey(workspaceId, debouncedQuery),
    queryFn: ({ signal }) => searchWorkspace(workspaceId, debouncedQuery, { signal }),
    enabled: Boolean(workspaceId) && runnable,
  });

  return { parsed, results };
}

export function useSearchHistory(workspaceId: string) {
  const history = useSyncExternalStore(
    subscribeSearchHistory,
    () => getSearchHistory(workspaceId),
    getSearchHistoryServerSnapshot,
  );

  return {
    history,
    remember: (query: string) => pushSearchHistory(workspaceId, query),
    clear: () => clearSearchHistory(workspaceId),
  };
}
