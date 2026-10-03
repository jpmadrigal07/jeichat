'use client';

import { cn } from '@/lib/utils';
import { useSearchPanel } from '../_hooks/use-search-panel';
import { SearchResults } from './search-results-list';
import { WorkspaceSearch } from './workspace-search';

/** Discord-style results column, docked to the right of the page on desktop. */
export function SearchResultsPanel({ workspaceId }: { workspaceId: string }) {
  const { panelOpen } = useSearchPanel();
  if (!panelOpen) return null;

  return (
    <aside
      aria-label="Search results"
      className={cn(
        'animate-in fade-in slide-in-from-right-4 hidden w-80 shrink-0 flex-col border-l bg-background duration-200 md:flex lg:w-96',
        // Below lg the panel floats over the page instead of squeezing it.
        'max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:shadow-xl',
      )}
    >
      {/* The search box moves here from the page header while the panel is open;
          its ✕ clears the search and closes the panel. */}
      <div className="flex h-12 shrink-0 items-center border-b px-3">
        <WorkspaceSearch workspaceId={workspaceId} placement="panel" />
      </div>
      <SearchResults workspaceId={workspaceId} />
    </aside>
  );
}
