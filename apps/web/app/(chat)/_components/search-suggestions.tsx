'use client';

import type { ReactNode } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { channelDisplayName } from '../_helpers/channel-display';
import {
  tokenizeSearchQuery,
  type SearchFilterKey,
} from '../_helpers/parse-search-query';
import { SEARCH_HAS_OPTIONS } from '../_helpers/search-filters';
import { personInitials } from '../_helpers/ticket-fields';
import type { SearchSuggestionsModel } from '../_hooks/use-search-suggestions';
import { ChannelTypeIcon } from './channel-type-icon';
import { SearchChip } from './search-input-box';

/** A stored query laid out like the search box: badges, then the text. */
export function HistoryQuery({ query }: { query: string }) {
  const tokens = tokenizeSearchQuery(query);
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
      {tokens.map((token, index) =>
        token.kind === 'filter' ? (
          <SearchChip
            key={`${token.key}-${index}`}
            chip={{ key: token.key, value: token.value }}
          />
        ) : (
          <span key={`text-${index}`} className="truncate">
            {token.value}
          </span>
        ),
      )}
    </span>
  );
}

const ROW_CLASS = 'h-auto w-full justify-start py-2 font-normal';

/**
 * What to show under the search box before there are results: the values for a
 * half-typed filter, or the filter list and history. Rows keep the input
 * focused (so the mobile keyboard stays up) by cancelling the mouse-down.
 */
export function SearchSuggestions({
  model,
  onPickFilter,
  onRunHistory,
  searchRow,
}: {
  model: SearchSuggestionsModel;
  onPickFilter: (key: SearchFilterKey, value?: string) => void;
  onRunHistory: (item: string) => void;
  /** Extra first row in the menu, e.g. the desktop "Search for …" shortcut. */
  searchRow?: ReactNode;
}) {
  const {
    parsed,
    showSuggestions,
    suggestionMembers,
    suggestionChannels,
    filterOptions,
    history,
    showHistory,
    clearHistory,
  } = model;

  if (showSuggestions) {
    return (
      <div className="flex flex-col p-1">
        {parsed.incomplete === 'has'
          ? SEARCH_HAS_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  className={ROW_CLASS}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onPickFilter('has', option.value)}
                >
                  <Icon />
                  {option.label}
                </Button>
              );
            })
          : null}
        {suggestionMembers.map((member) => (
          <Button
            key={member.userId}
            type="button"
            variant="ghost"
            className={ROW_CLASS}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              onPickFilter(parsed.incomplete ?? 'from', member.name)
            }
          >
            <Avatar size="sm">
              <AvatarImage src={member.image ?? undefined} alt="" />
              <AvatarFallback>{personInitials(member.name)}</AvatarFallback>
            </Avatar>
            <span className="truncate">{member.name}</span>
          </Button>
        ))}
        {suggestionChannels.map((channel) => (
          <Button
            key={channel.id}
            type="button"
            variant="ghost"
            className={ROW_CLASS}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPickFilter('in', channelDisplayName(channel))}
          >
            <ChannelTypeIcon
              isPrivate={channel.isPrivate && !channel.parentId}
            />
            <span className="truncate">
              {channel.parentId
                ? channel.name
                : channel.channelType === 'dm'
                  ? channelDisplayName(channel)
                  : `#${channel.name}`}
            </span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {searchRow}
      {filterOptions.length > 0 ? (
        <>
          {searchRow ? <Separator className="my-1" /> : null}
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Filters
          </p>
          <div className="flex flex-col">
            {filterOptions.map((filter) => {
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.key}
                  type="button"
                  variant="ghost"
                  className={ROW_CLASS}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onPickFilter(filter.key)}
                >
                  <Icon />
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span>{filter.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {filter.hint}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </>
      ) : null}
      {showHistory ? (
        <>
          {filterOptions.length > 0 ? <Separator className="my-1" /> : null}
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">History</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearHistory}
              aria-label="Clear search history"
            >
              <Trash2 />
            </Button>
          </div>
          <div className="flex flex-col">
            {history.map((item) => (
              <Button
                key={item}
                type="button"
                variant="ghost"
                className={ROW_CLASS}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onRunHistory(item)}
              >
                <Search />
                <HistoryQuery query={item} />
              </Button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
