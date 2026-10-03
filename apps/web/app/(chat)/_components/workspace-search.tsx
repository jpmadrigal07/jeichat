'use client';

import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  isRunnableSearch,
  parseSearchQuery,
  type SearchFilterKey,
} from '../_helpers/parse-search-query';
import { useIsDesktop } from '../_hooks/use-is-desktop';
import { useSearchPanel } from '../_hooks/use-search-panel';
import { useSearchSuggestions } from '../_hooks/use-search-suggestions';
import { useWorkspaces } from '../_hooks/use-workspaces';
import { searchPageHref } from '../_libs/search';
import { SearchInputBox } from './search-input-box';
import { HistoryQuery, SearchSuggestions } from './search-suggestions';

export type WorkspaceSearchHandle = { open: () => void };

type WorkspaceSearchProps = {
  workspaceId: string;
  /** Lets a parent (e.g. a mobile overflow drawer) start a search. */
  ref?: Ref<WorkspaceSearchHandle>;
  /** Set false when something else opens the search on mobile. */
  showMobileTrigger?: boolean;
  /**
   * `header` is the box in a page header. While the results panel is open on
   * desktop it hides there and the `panel` copy in the panel's header takes over.
   */
  placement?: 'header' | 'panel';
};

/**
 * Desktop: a search box whose popover only offers filters and history; running
 * a search opens the results panel beside the page (see `SearchResultsPanel`).
 * Mobile: just a trigger that opens the full search page.
 */
export function WorkspaceSearch({
  workspaceId,
  ref,
  showMobileTrigger = true,
  placement = 'header',
}: WorkspaceSearchProps) {
  const isPanel = placement === 'panel';
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipFocusOpenRef = useRef(false);
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  // In the panel the box takes over from the header one, so it grabs focus on
  // mount (the dropdown stays shut until the user interacts with it).
  const attachInput = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (node && isPanel) {
        // focus() fires onFocus synchronously, so the flag never outlives it
        // (a stale flag would swallow the user's next real focus).
        skipFocusOpenRef.current = true;
        node.focus();
        skipFocusOpenRef.current = false;
      }
    },
    [isPanel],
  );
  const {
    query,
    chips,
    panelOpen,
    insertFilter,
    commitDraft,
    setQuery,
    openPanel,
    clear,
  } = useSearchPanel();
  const { data: workspaces } = useWorkspaces();
  const model = useSearchSuggestions(workspaceId);
  const workspaceName =
    workspaces?.find((workspace) => workspace.id === workspaceId)?.name ??
    'workspace';

  // The search page starts fresh each time it is opened from here.
  function openSearchPage() {
    clear();
    router.push(searchPageHref(workspaceId));
  }

  useImperativeHandle(ref, () => ({
    open: () => {
      if (isDesktop) {
        setOpen(true);
        inputRef.current?.focus();
      } else {
        openSearchPage();
      }
    },
  }));

  function focusInputEnd() {
    queueMicrotask(() => {
      const node = inputRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(node.value.length, node.value.length);
    });
  }

  function pickFilter(key: SearchFilterKey, value?: string) {
    insertFilter(key, value);
    setOpen(true);
    focusInputEnd();
  }

  function runSearch() {
    openPanel();
    setOpen(false);
  }

  function submit() {
    const finalQuery = commitDraft();
    if (!isRunnableSearch(parseSearchQuery(finalQuery))) return;
    model.remember(finalQuery);
    runSearch();
  }

  function runHistoryEntry(item: string) {
    setQuery(item);
    model.remember(item);
    runSearch();
    focusInputEnd();
  }

  function handleFocus() {
    if (skipFocusOpenRef.current) {
      skipFocusOpenRef.current = false;
      return;
    }
    setOpen(true);
  }

  const showSearchRow = model.runnable && !panelOpen;
  // Avoid an empty bubble when there is nothing left to offer.
  const menuEmpty =
    !model.showSuggestions &&
    !showSearchRow &&
    model.filterOptions.length === 0 &&
    !model.showHistory;

  // The panel's own box replaces this one while the panel is open.
  if (!isPanel && isDesktop && panelOpen) return null;

  return (
    <Popover
      open={isDesktop && open && !menuEmpty}
      onOpenChange={setOpen}
      modal={false}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            'relative',
            isPanel
              ? 'min-w-0 flex-1'
              : [
                  'md:w-44 md:transition-[width] md:duration-200 lg:w-56',
                  chips.length > 0 && 'md:w-56 lg:w-72',
                  'md:focus-within:w-64 lg:focus-within:w-80',
                ],
          )}
        >
          <SearchInputBox
            inputRef={attachInput}
            placeholder={`Search ${workspaceName}`}
            className={isPanel ? undefined : 'hidden md:flex'}
            onFocus={handleFocus}
            onClick={() => setOpen(true)}
            onEdit={() => setOpen(true)}
            onEscape={() => {
              setOpen(false);
              inputRef.current?.blur();
            }}
            onSubmit={submit}
            clearLabel={isPanel ? 'Close search' : 'Clear search'}
            alwaysShowClear={isPanel}
          />
          {showMobileTrigger && !isPanel ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              asChild
            >
              <Link
                href={searchPageHref(workspaceId)}
                aria-label={`Search ${workspaceName}`}
                onClick={() => clear()}
              >
                <Search />
              </Link>
            </Button>
          ) : null}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align={isPanel ? 'start' : 'end'}
        className={cn(
          'max-h-[min(20rem,calc(100dvh-6rem))] gap-0 overflow-x-hidden overflow-y-auto overscroll-contain p-1 data-closed:overflow-hidden',
          isPanel
            ? 'w-(--radix-popover-trigger-width)'
            : 'w-[min(24rem,calc(100vw-1rem))]',
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SearchSuggestions
          model={model}
          onPickFilter={pickFilter}
          onRunHistory={runHistoryEntry}
          searchRow={
            showSearchRow ? (
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start py-2 font-normal"
                onMouseDown={(event) => event.preventDefault()}
                onClick={submit}
              >
                <Search />
                <span className="shrink-0">Search for</span>
                <HistoryQuery query={query.trim()} />
                <span className="shrink-0 text-xs text-muted-foreground">
                  Enter
                </span>
              </Button>
            ) : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
}
