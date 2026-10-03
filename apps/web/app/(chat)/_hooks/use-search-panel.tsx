'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  absorbFilterChips,
  applySearchFilter,
  EMPTY_SEARCH_INPUT,
  joinSearchQuery,
  searchInputFromQuery,
  type SearchFilterKey,
  type SearchInputState,
} from '../_helpers/parse-search-query';

type SearchPanelContextValue = SearchInputState & {
  /** The chips and draft joined into the string the API understands. */
  query: string;
  panelOpen: boolean;
  /** Typing in the box; finished filters become chips. */
  setDraft: (raw: string) => void;
  /** Picks a filter from the suggestions; without a value it starts one. */
  insertFilter: (key: SearchFilterKey, value?: string) => void;
  /**
   * Turns a half-typed filter into a chip (used when the search is submitted)
   * and returns the resulting query string.
   */
  commitDraft: () => string;
  removeLastChip: () => void;
  /** Replaces the whole box, e.g. when re-running a history entry. */
  setQuery: (raw: string) => void;
  openPanel: () => void;
  /** Empties the box and closes the results panel. */
  clear: () => void;
};

const SearchPanelContext = createContext<SearchPanelContextValue | null>(null);

/**
 * Search state lives above the pages because every page renders its own header
 * (and so its own search box), while the results panel sits beside them in the
 * shell and has to survive navigating to a result.
 */
export function SearchPanelProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState<SearchInputState>(EMPTY_SEARCH_INPUT);
  const [panelOpen, setPanelOpen] = useState(false);

  const value = useMemo<SearchPanelContextValue>(
    () => ({
      ...input,
      query: joinSearchQuery(input),
      panelOpen,
      setDraft: (raw) =>
        setInput((current) => absorbFilterChips(current.chips, raw)),
      insertFilter: (key, filterValue) =>
        setInput((current) =>
          absorbFilterChips(
            current.chips,
            applySearchFilter(current.draft, key, filterValue),
          ),
        ),
      commitDraft: () => {
        const next = absorbFilterChips(input.chips, input.draft, {
          final: true,
        });
        setInput(next);
        return joinSearchQuery(next);
      },
      removeLastChip: () =>
        setInput((current) => ({
          ...current,
          chips: current.chips.slice(0, -1),
        })),
      setQuery: (raw) => setInput(searchInputFromQuery(raw)),
      openPanel: () => setPanelOpen(true),
      clear: () => {
        setInput(EMPTY_SEARCH_INPUT);
        setPanelOpen(false);
      },
    }),
    [input, panelOpen],
  );

  return (
    <SearchPanelContext.Provider value={value}>
      {children}
    </SearchPanelContext.Provider>
  );
}

export function useSearchPanel() {
  const context = useContext(SearchPanelContext);
  if (!context) {
    throw new Error('useSearchPanel must be used inside SearchPanelProvider');
  }
  return context;
}
