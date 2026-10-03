'use client';

import { useRef } from 'react';
import { ChatPane } from '@chat/_components/chat-pane';
import { MobileBackLink } from '@chat/_components/mobile-back-link';
import { SearchInputBox } from '@chat/_components/search-input-box';
import { SearchResults } from '@chat/_components/search-results-list';
import { SearchSuggestions } from '@chat/_components/search-suggestions';
import {
  isRunnableSearch,
  parseSearchQuery,
  type SearchFilterKey,
} from '@chat/_helpers/parse-search-query';
import { useSearchPanel } from '@chat/_hooks/use-search-panel';
import { useSearchSuggestions } from '@chat/_hooks/use-search-suggestions';
import { useWorkspaceRootCrumb } from '@chat/_hooks/use-workspace-root-crumb';
import { useWorkspaces } from '@chat/_hooks/use-workspaces';

/**
 * Mobile search: a page of its own instead of a dropdown. The box sits in the
 * header, with filter suggestions below it until there is something to search
 * for, then the results. The query lives in the shell, so going back from a
 * result lands here again with the search intact.
 */
export function SearchPageView({ workspaceId }: { workspaceId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRoot = useWorkspaceRootCrumb(workspaceId);
  const { data: workspaces } = useWorkspaces();
  const { chips, draft, insertFilter, commitDraft, setQuery } =
    useSearchPanel();
  const model = useSearchSuggestions(workspaceId);

  const workspaceName =
    workspaces?.find((workspace) => workspace.id === workspaceId)?.name ??
    'workspace';
  const showResults = model.runnable && !model.showSuggestions;

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
    focusInputEnd();
  }

  function submit() {
    const finalQuery = commitDraft();
    if (!isRunnableSearch(parseSearchQuery(finalQuery))) return;
    model.remember(finalQuery);
    // Put the keyboard away so the results are in full view.
    inputRef.current?.blur();
  }

  function runHistoryEntry(item: string) {
    setQuery(item);
    model.remember(item);
    inputRef.current?.blur();
  }

  return (
    <ChatPane
      header={
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <MobileBackLink href={workspaceRoot.href} label="Back to channels" />
          <SearchInputBox
            inputRef={inputRef}
            placeholder={`Search ${workspaceName}`}
            // Only raise the keyboard for a fresh search, not when coming back.
            autoFocus={chips.length === 0 && !draft}
            onSubmit={submit}
          />
        </div>
      }
    >
      {showResults ? (
        <SearchResults workspaceId={workspaceId} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          <SearchSuggestions
            model={model}
            onPickFilter={pickFilter}
            onRunHistory={runHistoryEntry}
          />
        </div>
      )}
    </ChatPane>
  );
}
