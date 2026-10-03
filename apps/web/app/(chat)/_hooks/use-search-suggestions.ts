'use client';

import {
  isRunnableSearch,
  parseSearchQuery,
} from '../_helpers/parse-search-query';
import { filterMentionMembers } from '../_helpers/mentions';
import { channelDisplayName } from '../_helpers/channel-display';
import { SEARCH_FILTERS } from '../_helpers/search-filters';
import { useChannels } from './use-channels';
import { useSearchHistory } from './use-search';
import { useSearchPanel } from './use-search-panel';
import { useWorkspaceMembers } from './use-workspaces';

/** What the search box can offer for the current query: filters, people, history. */
export function useSearchSuggestions(workspaceId: string) {
  const { query, chips } = useSearchPanel();
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: channels } = useChannels(workspaceId);
  const { history, remember, clear: clearHistory } =
    useSearchHistory(workspaceId);

  const parsed = parseSearchQuery(query);
  const runnable = isRunnableSearch(parsed);

  const suggestionMembers =
    parsed.incomplete === 'from' || parsed.incomplete === 'mentions'
      ? filterMentionMembers(members ?? [], parsed.incompleteQuery).slice(0, 8)
      : [];

  const suggestionChannels =
    parsed.incomplete === 'in'
      ? (channels ?? [])
          .filter(
            (channel) =>
              !channel.parentId &&
              channel.channelType !== 'voice' &&
              channelDisplayName(channel)
                .toLowerCase()
                .includes(parsed.incompleteQuery.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  // Filters already badged are not offered again.
  const usedFilterKeys = new Set(chips.map((chip) => chip.key));

  return {
    parsed,
    runnable,
    /** A filter is half typed, so offer its values instead of the menu. */
    showSuggestions: Boolean(parsed.incomplete),
    suggestionMembers,
    suggestionChannels,
    filterOptions: SEARCH_FILTERS.filter(
      (filter) => !usedFilterKeys.has(filter.key),
    ),
    history,
    showHistory: !runnable && history.length > 0,
    remember,
    clearHistory,
  };
}

export type SearchSuggestionsModel = ReturnType<typeof useSearchSuggestions>;
