'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { channelDisplayName } from '../_helpers/channel-display';
import { formatHitTime } from '../_helpers/format-hit-time';
import { isRunnableSearch } from '../_helpers/parse-search-query';
import { personInitials } from '../_helpers/ticket-fields';
import { useChannels } from '../_hooks/use-channels';
import { useSearchPanel } from '../_hooks/use-search-panel';
import { useSearchHistory, useWorkspaceSearch } from '../_hooks/use-search';
import { SEARCH_RESULT_LIMIT, type SearchHit } from '../_libs/search';
import { messagePageHref } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_libs/messages';
import { ChannelTypeIcon } from './channel-type-icon';

type SearchHitGroup = {
  channelId: string;
  channel: SearchHit['channel'];
  hits: SearchHit[];
};

/** Groups hits by channel, ordered by each channel's newest hit. */
function groupHitsByChannel(hits: SearchHit[]): SearchHitGroup[] {
  const groups = new Map<string, SearchHitGroup>();
  for (const hit of hits) {
    const group = groups.get(hit.channelId);
    if (group) group.hits.push(hit);
    else
      groups.set(hit.channelId, {
        channelId: hit.channelId,
        channel: hit.channel,
        hits: [hit],
      });
  }
  return [...groups.values()];
}

function resultCountLabel(count: number) {
  return `${count} ${count === 1 ? 'result' : 'results'}`;
}

/**
 * Results for the current search, grouped by channel. Fills its parent (a
 * flex column), so it serves both the desktop panel and the mobile page.
 */
export function SearchResults({ workspaceId }: { workspaceId: string }) {
  const { query } = useSearchPanel();
  const { parsed, results } = useWorkspaceSearch(workspaceId, query);
  const { data: channels } = useChannels(workspaceId);
  const { remember } = useSearchHistory(workspaceId);

  const hits = results.data ?? [];
  const groups = groupHitsByChannel(hits);
  const runnable = isRunnableSearch(parsed);
  const loading = runnable && results.isFetching && hits.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hits.length > 0 ? (
        <h2 className="shrink-0 px-4 pt-3 text-xs font-semibold text-muted-foreground">
          {resultCountLabel(hits.length)}
        </h2>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : hits.length === 0 ? (
        <Empty className="border-0 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No results</EmptyTitle>
            <EmptyDescription>
              {runnable
                ? 'Try a different query or filter.'
                : 'Add some text or a filter to search.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-3">
            {groups.map((group) => {
              const channel = channels?.find(
                (item) => item.id === group.channelId,
              );
              return (
                <section key={group.channelId} className="flex flex-col gap-1.5">
                  <h3 className="flex items-center gap-1 px-1 text-xs font-semibold">
                    {group.channel.parentId ? null : (
                      <ChannelTypeIcon
                        isPrivate={Boolean(channel?.isPrivate)}
                        className="size-3.5 text-muted-foreground"
                      />
                    )}
                    <span className="truncate">
                      {channel
                        ? channelDisplayName(channel)
                        : group.channel.name}
                    </span>
                  </h3>
                  {group.hits.map((hit) => (
                    <SearchResultCard
                      key={hit.id}
                      hit={hit}
                      workspaceId={workspaceId}
                      onSelect={() => remember(query)}
                    />
                  ))}
                </section>
              );
            })}
            {hits.length >= SEARCH_RESULT_LIMIT ? (
              <p className="px-1 text-center text-xs text-muted-foreground">
                Showing the {SEARCH_RESULT_LIMIT} most recent matches. Add a
                filter to narrow it down.
              </p>
            ) : null}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function SearchResultCard({
  hit,
  workspaceId,
  onSelect,
}: {
  hit: SearchHit;
  workspaceId: string;
  onSelect: () => void;
}) {
  return (
    <Card className="gap-0 py-0 transition-colors hover:bg-muted/50">
      <Link
        href={messagePageHref(workspaceId, hit.channel, hit.id)}
        onClick={onSelect}
        className="flex items-start gap-2.5 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Avatar size="sm">
          <AvatarImage src={hit.sender.image ?? undefined} alt="" />
          <AvatarFallback>{personInitials(hit.sender.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">
              {hit.sender.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatHitTime(hit.createdAt)}
            </span>
          </div>
          <p
            className={cn(
              'line-clamp-4 text-xs/relaxed break-words whitespace-pre-wrap',
              hit.content ? 'text-foreground/90' : 'text-muted-foreground italic',
            )}
          >
            {hit.content || 'Attachment'}
          </p>
        </div>
      </Link>
    </Card>
  );
}
