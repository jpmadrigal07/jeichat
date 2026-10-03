'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  isRunnableSearch,
  parseSearchQuery,
  withoutIncompleteFilter,
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
  // Judge runnability before trimming: the space after a trailing `from:name`
  // is what marks that filter as finished rather than still being typed.
  const debouncedQuery = useDebouncedValue(query, 250);
  const runnable = isRunnableSearch(parseSearchQuery(debouncedQuery));
  // A filter still being typed would otherwise be searched for as plain text.
  const searchText = withoutIncompleteFilter(debouncedQuery).trim();

  const results = useQuery({
    queryKey: searchQueryKey(workspaceId, searchText),
    queryFn: ({ signal }) => searchWorkspace(workspaceId, searchText, { signal }),
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
