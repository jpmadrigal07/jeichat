'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  AtSign,
  File,
  Hash,
  Link2,
  Paperclip,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { filterMentionMembers } from '../_helpers/mentions';
import {
  applySearchFilter,
  tokenizeSearchQuery,
  type SearchFilterKey,
} from '../_helpers/parse-search-query';
import { useChannels } from '../_hooks/use-channels';
import { useWorkspaceSearch, useSearchHistory } from '../_hooks/use-search';
import { useWorkspaces, useWorkspaceMembers } from '../_hooks/use-workspaces';
import { channelDisplayName } from '../_helpers/channel-display';
import { ChannelTypeIcon } from './channel-type-icon';
import type { SearchHit } from '../_libs/search';
import { messagePageHref } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_libs/messages';
import { personInitials } from '../_helpers/ticket-fields';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const FILTERS: {
  key: SearchFilterKey;
  label: string;
  hint: string;
  icon: typeof UserRound;
}[] = [
  {
    key: 'from',
    label: 'From a specific user',
    hint: 'from: user',
    icon: UserRound,
  },
  {
    key: 'in',
    label: 'Sent in a specific channel',
    hint: 'in: channel',
    icon: Hash,
  },
  {
    key: 'has',
    label: 'Includes a specific type of data',
    hint: 'has: link, embed or file',
    icon: Paperclip,
  },
  {
    key: 'mentions',
    label: 'Mentions a specific user',
    hint: 'mentions: user',
    icon: AtSign,
  },
];

const HAS_OPTIONS = [
  { value: 'file', label: 'File', icon: File },
  { value: 'link', label: 'Link', icon: Link2 },
] as const;

function formatHitTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function snippet(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117)}…`;
}

function channelLabel(name: string, parentId: string | null) {
  return parentId ? name : `#${name}`;
}

function HistoryQuery({ query }: { query: string }) {
  const tokens = tokenizeSearchQuery(query);
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
      {tokens.map((token, index) =>
        token.kind === 'filter' ? (
          <Badge key={`${token.key}-${index}`} variant="secondary">
            {token.key}: {token.value}
          </Badge>
        ) : (
          <span key={`text-${index}`} className="truncate">
            {token.value}
          </span>
        ),
      )}
    </span>
  );
}

export function WorkspaceSearch({ workspaceId }: { workspaceId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: workspaces } = useWorkspaces();
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: channels } = useChannels(workspaceId);
  const { parsed, results } = useWorkspaceSearch(workspaceId, query);
  const { history, remember, clear } = useSearchHistory(workspaceId);
  const workspaceName =
    workspaces?.find((workspace) => workspace.id === workspaceId)?.name ??
    'workspace';

  const runnable = Boolean(
    parsed.text || parsed.from || parsed.in || parsed.has || parsed.mentions,
  );

  function setQueryAndFocus(next: string) {
    setQuery(next);
    setOpen(true);
    queueMicrotask(() => {
      const node = inputRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(next.length, next.length);
    });
  }

  function insertFilter(key: SearchFilterKey, value?: string) {
    setQueryAndFocus(applySearchFilter(query, key, value));
  }

  function commitQuery(next = query) {
    const trimmed = next.trim();
    if (trimmed) remember(trimmed);
  }

  const suggestionMembers =
    parsed.incomplete === 'from' || parsed.incomplete === 'mentions'
      ? filterMentionMembers(members ?? [], parsed.incompleteQuery).slice(0, 8)
      : [];

  const suggestionChannels =
    parsed.incomplete === 'in'
      ? (channels ?? [])
          .filter((channel) =>
            channelDisplayName(channel)
              .toLowerCase()
              .includes(parsed.incompleteQuery.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  const showSuggestions = Boolean(parsed.incomplete);
  const showResults = !showSuggestions && runnable;
  const hits = results.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div className="relative w-44 lg:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpen(false);
                inputRef.current?.blur();
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                commitQuery();
              }
            }}
            placeholder={`Search ${workspaceName}`}
            className="pr-2 pl-7"
            aria-label={`Search ${workspaceName}`}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className="max-h-80 w-80 gap-0 overflow-x-hidden overflow-y-auto overscroll-contain p-1 lg:w-96 data-closed:overflow-hidden"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {showSuggestions ? (
          <div className="flex flex-col p-1">
            {parsed.incomplete === 'has'
              ? HAS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start py-2 font-normal"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertFilter('has', option.value)}
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
                className="h-auto w-full justify-start py-2 font-normal"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  insertFilter(parsed.incomplete ?? 'from', member.name)
                }
              >
                <Avatar size="sm">
                  <AvatarImage src={member.image ?? undefined} alt="" />
                  <AvatarFallback>
                    {personInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.name}</span>
              </Button>
            ))}
            {suggestionChannels.map((channel) => (
              <Button
                key={channel.id}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start py-2 font-normal"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  insertFilter('in', channelDisplayName(channel))
                }
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
        ) : null}

        {showResults ? (
          results.isFetching && hits.length === 0 ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : hits.length === 0 ? (
            <Empty className="border-0 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>No results</EmptyTitle>
                <EmptyDescription>
                  Try a different query or filter.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col p-1">
              {hits.map((hit) => (
                <SearchHitRow
                  key={hit.id}
                  hit={hit}
                  workspaceId={workspaceId}
                  onSelect={() => {
                    commitQuery();
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          )
        ) : null}

        {!showSuggestions && !showResults ? (
          <div className="flex flex-col">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Filters
            </p>
            <div className="flex flex-col">
              {FILTERS.map((filter) => {
                const Icon = filter.icon;
                return (
                  <Button
                    key={filter.key}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start py-2 font-normal"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertFilter(filter.key)}
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
            {history.length > 0 ? (
              <>
                <Separator className="my-1" />
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    History
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clear}
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
                      className="h-auto w-full justify-start py-2 font-normal"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setQueryAndFocus(item.endsWith(' ') ? item : `${item} `);
                        commitQuery(item);
                      }}
                    >
                      <Search />
                      <HistoryQuery query={item} />
                    </Button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function SearchHitRow({
  hit,
  workspaceId,
  onSelect,
}: {
  hit: SearchHit;
  workspaceId: string;
  onSelect: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="h-auto w-full justify-start py-2 font-normal"
      asChild
    >
      <Link
        href={messagePageHref(workspaceId, hit.channelId, hit.id)}
        onClick={onSelect}
      >
        <Avatar size="sm">
          <AvatarImage src={hit.sender.image ?? undefined} alt="" />
          <AvatarFallback>{personInitials(hit.sender.name)}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <span className="flex w-full min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">
              {hit.sender.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {channelLabel(hit.channel.name, hit.channel.parentId)}
            </span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatHitTime(hit.createdAt)}
            </span>
          </span>
          <span
            className={cn(
              'w-full truncate text-xs text-muted-foreground',
              !hit.content && 'italic',
            )}
          >
            {hit.content ? snippet(hit.content) : 'Attachment'}
          </span>
        </span>
      </Link>
    </Button>
  );
}
