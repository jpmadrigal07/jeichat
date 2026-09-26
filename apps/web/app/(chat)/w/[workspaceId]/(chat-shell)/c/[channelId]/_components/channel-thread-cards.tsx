'use client';

import { Suspense, useRef, type DragEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  MessageSquare,
  MessageSquarePlus,
  Plus,
  Search,
  UserRound,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChannels } from '@chat/_hooks/use-channels';
import { useUnreadCounts } from '@chat/_hooks/use-unread-counts';
import { useWorkspaceMembers } from '@chat/_hooks/use-workspaces';
import { formatUnreadCount } from '@chat/_helpers/format-unread-count';
import {
  groupTicketsByStatus,
  isTicketStatusOpenByDefault,
} from '@chat/_helpers/group-channels';
import { createThreadHref } from '@chat/_components/create-thread-dialog';
import { TicketFilterBar } from './ticket-filter-bar';
import {
  TicketArchiveMenu,
  TicketAssigneeIconMenu,
  TicketLabelsMenu,
  TicketPriorityIconMenu,
  TicketStatusIconMenu,
  type TicketMenuMember,
} from './ticket-property-menus';
import {
  conversationPageHref,
  type ChannelThread,
  type TicketLayout,
} from '@chat/_libs/channels';
import { useChannelThreads } from '../_hooks/use-channel-threads';
import { useReorderChannelThreads } from '../_hooks/use-reorder-channel-threads';
import {
  formatMessageCount,
  formatThreadActivity,
} from '../_helpers/format-thread-activity';
import {
  clearTicketDropIndicator,
  reorderedTicketIds,
  showTicketDropIndicator,
  ticketBelowPointer,
  ticketDragTargets,
} from '../_helpers/ticket-drag-order';
import {
  TICKET_STATUSES,
  compareTicketBoardPosition,
  isTicketArchived,
  ticketDisplayId,
  ticketPrefixOf,
  ticketPriorityOf,
  ticketStatusOf,
  TICKET_PRIORITY_META,
  TICKET_STATUS_META,
  type TicketStatus,
} from '@chat/_helpers/ticket-fields';
import {
  parseTicketFilters,
  ticketMatchesFilters,
  ticketMatchesSearch,
} from '@chat/_helpers/ticket-filters';

export function ChannelThreadCards({
  workspaceId,
  channelId,
  layout,
  userId,
}: {
  workspaceId: string;
  channelId: string;
  layout: TicketLayout;
  userId: string;
}) {
  return (
    <Suspense fallback={<TicketListSkeleton layout={layout} isMobile={false} />}>
      <ChannelThreadCardsInner
        workspaceId={workspaceId}
        channelId={channelId}
        layout={layout}
        userId={userId}
      />
    </Suspense>
  );
}

function ChannelThreadCardsInner({
  workspaceId,
  channelId,
  layout,
  userId,
}: {
  workspaceId: string;
  channelId: string;
  layout: TicketLayout;
  userId: string;
}) {
  const searchParams = useSearchParams();
  const filters = parseTicketFilters(searchParams);
  const { data: threads, isPending } = useChannelThreads(
    workspaceId,
    channelId,
  );
  const { data: unreadCounts } = useUnreadCounts(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: channels } = useChannels(workspaceId);
  const membersById = new Map(
    (members ?? []).map((member) => [member.userId, member]),
  );
  const parentChannel = channels?.find((channel) => channel.id === channelId);
  const ticketPrefix = ticketPrefixOf(parentChannel ?? { name: '' });
  const numbers = ticketNumberById(threads ?? []);
  const activeThreads = (threads ?? []).filter(
    (thread) => !isTicketArchived(thread),
  );
  const visibleThreads = activeThreads.filter((thread) => {
    const displayId = ticketDisplayId(
      ticketPrefix,
      numbers.get(thread.id) ?? 0,
    );
    const assigneeName = thread.assigneeId
      ? membersById.get(thread.assigneeId)?.name
      : undefined;
    return (
      ticketMatchesSearch(thread, filters.q, displayId, assigneeName) &&
      ticketMatchesFilters(thread, filters, userId)
    );
  });
  visibleThreads.sort(compareTicketBoardPosition);
  const reorderThreads = useReorderChannelThreads(workspaceId, channelId);

  function moveTicket(
    ticketId: string,
    status: TicketStatus,
    beforeTicketId: string | null,
  ) {
    const ticketIds = reorderedTicketIds({
      activeThreads,
      visibleThreads,
      ticketId,
      status,
      beforeTicketId,
    });
    if (ticketIds) reorderThreads.mutate({ status, ticketIds });
  }
  const boardStatuses =
    filters.completed === 'none'
      ? TICKET_STATUSES.filter(
          (status) => status !== 'done' && status !== 'cancelled',
        )
      : TICKET_STATUSES;
  const isMobile = useIsMobile();
  const ticketMenuMembers: TicketMenuMember[] = Array.from(
    membersById,
    ([memberUserId, member]) => ({
      userId: memberUserId,
      name: member.name,
      image: member.image,
      isBot: member.isBot,
    }),
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <TicketFilterBar
        workspaceId={workspaceId}
        channelId={channelId}
        layout={layout}
      />
      {isPending ? (
        <TicketListSkeleton layout={layout} isMobile={isMobile} />
      ) : !threads?.length ? (
        <Empty className="flex-1 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare />
            </EmptyMedia>
            <EmptyTitle>No tickets yet</EmptyTitle>
            <EmptyDescription>
              Create a ticket to start a focused conversation in this channel.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link
                href={createThreadHref(channelId, {
                  layout,
                  search: searchParams,
                })}
              >
                <MessageSquarePlus data-icon="inline-start" />
                Create ticket
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : visibleThreads.length === 0 ? (
        <Empty className="flex-1 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No matching tickets</EmptyTitle>
            <EmptyDescription>
              Try a different search or clear filters to see all tickets.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isMobile ? (
        <TicketMobileBucketView
          workspaceId={workspaceId}
          channelId={channelId}
          ticketPrefix={ticketPrefix}
          layout={layout}
          threads={visibleThreads}
          numbers={numbers}
          statuses={boardStatuses}
          unreadCounts={unreadCounts}
          members={ticketMenuMembers}
          searchParams={searchParams}
        />
      ) : layout === 'list' ? (
        <TicketListView
          workspaceId={workspaceId}
          threads={visibleThreads}
          unreadCounts={unreadCounts}
          membersById={membersById}
          onMove={moveTicket}
        />
      ) : (
        <TicketBoardView
          workspaceId={workspaceId}
          channelId={channelId}
          ticketPrefix={ticketPrefix}
          threads={visibleThreads}
          numbers={numbers}
          statuses={boardStatuses}
          unreadCounts={unreadCounts}
          membersById={membersById}
          searchParams={searchParams}
          onMove={moveTicket}
        />
      )}
    </div>
  );
}

function TicketListSkeleton({
  layout,
  isMobile,
}: {
  layout: TicketLayout;
  isMobile: boolean;
}) {
  if (isMobile || layout === 'list') {
    return (
      <div className="flex flex-col gap-3 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="absolute inset-0 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-h-0 items-stretch gap-2 p-3">
        {TICKET_STATUSES.map((status) => (
          <div
            key={status}
            className="flex h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden rounded-md bg-muted/40"
          >
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <Skeleton className="size-3.5 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-1.5 pt-1.5 pb-1.5">
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

function ticketNumberById(threads: ChannelThread[]): Map<string, number> {
  const numbers = new Map<string, number>();
  const used = new Set<number>();
  for (const thread of threads) {
    if (thread.ticketNumber && thread.ticketNumber > 0) {
      numbers.set(thread.id, thread.ticketNumber);
      used.add(thread.ticketNumber);
    }
  }
  const remaining = threads.filter((thread) => !numbers.has(thread.id));
  remaining.sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  let next = 1;
  for (const thread of remaining) {
    while (used.has(next)) next += 1;
    numbers.set(thread.id, next);
    used.add(next);
    next += 1;
  }
  return numbers;
}

/** GitHub Projects–style mobile: grouped buckets, no horizontal kanban or drag. */
function TicketMobileBucketView({
  workspaceId,
  channelId,
  ticketPrefix,
  layout,
  threads,
  numbers,
  statuses,
  unreadCounts,
  members,
  searchParams,
}: {
  workspaceId: string;
  channelId: string;
  ticketPrefix: string;
  layout: TicketLayout;
  threads: ChannelThread[];
  numbers: Map<string, number>;
  statuses: readonly TicketStatus[];
  unreadCounts: Record<string, number> | undefined;
  members: TicketMenuMember[];
  searchParams: Pick<URLSearchParams, 'toString'>;
}) {
  const ticketsByStatus = new Map<TicketStatus, ChannelThread[]>(
    statuses.map((status) => [status, []]),
  );
  for (const thread of threads) {
    ticketsByStatus.get(ticketStatusOf(thread.status))?.push(thread);
  }

  return (
    <ScrollArea className="min-h-0 flex-1 overflow-hidden">
      <div className="flex flex-col gap-1 p-2 pb-4">
        {statuses.map((status) => {
          const tickets = ticketsByStatus.get(status) ?? [];
          if (tickets.length === 0) return null;
          return (
            <TicketMobileStatusBucket
              key={status}
              workspaceId={workspaceId}
              channelId={channelId}
              ticketPrefix={ticketPrefix}
              layout={layout}
              status={status}
              tickets={tickets}
              numbers={numbers}
              unreadCounts={unreadCounts}
              members={members}
              searchParams={searchParams}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}

function TicketMobileStatusBucket({
  workspaceId,
  channelId,
  ticketPrefix,
  layout,
  status,
  tickets,
  numbers,
  unreadCounts,
  members,
  searchParams,
}: {
  workspaceId: string;
  channelId: string;
  ticketPrefix: string;
  layout: TicketLayout;
  status: TicketStatus;
  tickets: ChannelThread[];
  numbers: Map<string, number>;
  unreadCounts: Record<string, number> | undefined;
  members: TicketMenuMember[];
  searchParams: Pick<URLSearchParams, 'toString'>;
}) {
  const meta = TICKET_STATUS_META[status];
  const StatusIcon = meta.icon;
  const createHref = createThreadHref(channelId, {
    status,
    search: searchParams,
  });

  return (
    <Collapsible
      defaultOpen={isTicketStatusOpenByDefault(status, false)}
      className="group/bucket rounded-md border bg-muted/20"
    >
      <div className="flex items-center gap-1 px-1 py-0.5">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-9 min-w-0 flex-1 justify-start font-normal"
          >
            <ChevronRight
              data-icon="inline-start"
              className="transition-transform group-data-[state=open]/bucket:rotate-90"
            />
            <StatusIcon className={cn('shrink-0', meta.iconClassName)} />
            <span className="truncate">{meta.label}</span>
            <Badge variant="secondary">{tickets.length}</Badge>
          </Button>
        </CollapsibleTrigger>
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={createHref}>
            <Plus />
            <span className="sr-only">Create ticket in {meta.label}</span>
          </Link>
        </Button>
      </div>
      <CollapsibleContent className="flex flex-col gap-1.5 px-2 pb-2">
        {tickets.map((thread) =>
          layout === 'card' ? (
            <TicketBoardCard
              key={thread.id}
              workspaceId={workspaceId}
              displayId={ticketDisplayId(
                ticketPrefix,
                numbers.get(thread.id) ?? 1,
              )}
              status={ticketStatusOf(thread.status)}
              thread={thread}
              unreadLabel={formatUnreadCount(unreadCounts?.[thread.id] ?? 0)}
              members={members}
              enableDrag={false}
            />
          ) : (
            <TicketMobileListItem
              key={thread.id}
              workspaceId={workspaceId}
              thread={thread}
              unreadLabel={formatUnreadCount(unreadCounts?.[thread.id] ?? 0)}
              members={members}
            />
          ),
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function TicketMobileListItem({
  workspaceId,
  thread,
  unreadLabel,
  members,
}: {
  workspaceId: string;
  thread: ChannelThread;
  unreadLabel: string | null;
  members: TicketMenuMember[];
}) {
  const href = conversationPageHref(workspaceId, thread);
  const priority = ticketPriorityOf(thread.priority);
  const PriorityIcon = TICKET_PRIORITY_META[priority].icon;
  const status = ticketStatusOf(thread.status);

  return (
    <div className="relative flex items-start gap-2 rounded-md border bg-card p-2">
      <Link href={href} className="absolute inset-0" tabIndex={-1}>
        <span className="sr-only">{thread.name}</span>
      </Link>
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="pointer-events-auto relative z-10">
            <TicketStatusIconMenu
              workspaceId={workspaceId}
              channelId={thread.id}
              status={status}
            />
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{thread.name}</span>
          {unreadLabel ? (
            <Badge variant="destructive">{unreadLabel}</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <PriorityIcon
            className={cn(
              'size-3.5 shrink-0',
              TICKET_PRIORITY_META[priority].iconClassName,
            )}
          />
          <span className="pointer-events-auto relative z-10">
            <TicketAssigneeIconMenu
              workspaceId={workspaceId}
              channelId={thread.id}
              assigneeId={thread.assigneeId}
              members={members}
            />
          </span>
        </div>
      </div>
      <TicketArchiveMenu
        workspaceId={workspaceId}
        channelId={thread.id}
        archivedAt={thread.archivedAt}
        size="icon-xs"
        stopCardGestures
        className="relative z-10 shrink-0"
      />
    </div>
  );
}

type TicketMoveHandler = (
  ticketId: string,
  status: TicketStatus,
  beforeTicketId: string | null,
) => void;

function startTicketDrag(event: DragEvent, ticketId: string) {
  if (event.target instanceof Element && event.target.closest('button')) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData('text/plain', ticketId);
  event.dataTransfer.effectAllowed = 'move';
}

function TicketBoardView({
  workspaceId,
  channelId,
  ticketPrefix,
  threads,
  numbers,
  statuses,
  unreadCounts,
  membersById,
  searchParams,
  onMove,
}: {
  workspaceId: string;
  channelId: string;
  ticketPrefix: string;
  threads: ChannelThread[];
  numbers: Map<string, number>;
  statuses: readonly TicketStatus[];
  unreadCounts: Record<string, number> | undefined;
  membersById: Map<string, { name: string; image: string | null; isBot?: boolean }>;
  searchParams: Pick<URLSearchParams, 'toString'>;
  onMove: TicketMoveHandler;
}) {
  const members: TicketMenuMember[] = Array.from(
    membersById,
    ([userId, member]) => ({
      userId,
      name: member.name,
      image: member.image,
      isBot: member.isBot,
    }),
  );
  const ticketsByStatus = new Map<TicketStatus, ChannelThread[]>(
    statuses.map((status) => [status, []]),
  );
  for (const thread of threads) {
    ticketsByStatus.get(ticketStatusOf(thread.status))?.push(thread);
  }

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="absolute inset-0 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-h-0 items-stretch gap-2 p-3">
        {statuses.map((status) => (
          <TicketBoardColumn
            key={status}
            workspaceId={workspaceId}
            channelId={channelId}
            ticketPrefix={ticketPrefix}
            numbers={numbers}
            status={status}
            tickets={ticketsByStatus.get(status) ?? []}
            unreadCounts={unreadCounts}
            members={members}
            searchParams={searchParams}
            onMove={onMove}
          />
        ))}
        </div>
      </div>
    </div>
  );
}

function TicketBoardColumn({
  workspaceId,
  channelId,
  ticketPrefix,
  numbers,
  status,
  tickets,
  unreadCounts,
  members,
  searchParams,
  onMove,
}: {
  workspaceId: string;
  channelId: string;
  ticketPrefix: string;
  numbers: Map<string, number>;
  status: TicketStatus;
  tickets: ChannelThread[];
  unreadCounts: Record<string, number> | undefined;
  members: TicketMenuMember[];
  searchParams: Pick<URLSearchParams, 'toString'>;
  onMove: TicketMoveHandler;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const StatusIcon = TICKET_STATUS_META[status].icon;
  const statusLabel = TICKET_STATUS_META[status].label;
  const createHref = createThreadHref(channelId, {
    status,
    search: searchParams,
  });

  function setDropTarget(on: boolean) {
    if (on) {
      columnRef.current?.setAttribute('data-drop', 'true');
      return;
    }
    columnRef.current?.removeAttribute('data-drop');
    clearTicketDropIndicator(columnRef.current);
  }

  return (
    <div className="group/column flex h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden rounded-md bg-muted/40">
      <div className="flex shrink-0 items-center gap-1.5 px-2 py-1.5">
        <StatusIcon
          className={cn(
            'shrink-0',
            TICKET_STATUS_META[status].iconClassName,
          )}
        />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {statusLabel}
        </span>
        <Badge variant="secondary">{tickets.length}</Badge>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" asChild>
              <Link href={createHref}>
                <Plus />
                <span className="sr-only">Create ticket in {statusLabel}</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create ticket</TooltipContent>
        </Tooltip>
      </div>
      <div
        ref={columnRef}
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-1.5 pt-1.5 pb-1.5 ring-1 ring-transparent data-drop:bg-muted data-drop:ring-ring"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          showTicketDropIndicator(
            columnRef.current,
            ticketDragTargets(columnRef.current),
            event.clientY,
          );
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepthRef.current += 1;
          setDropTarget(true);
        }}
        onDragLeave={() => {
          dragDepthRef.current -= 1;
          if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0;
            setDropTarget(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          const beforeTicketId =
            ticketBelowPointer(
              ticketDragTargets(columnRef.current),
              event.clientY,
            )?.dataset.ticketId ?? null;
          dragDepthRef.current = 0;
          setDropTarget(false);
          const ticketId = event.dataTransfer.getData('text/plain');
          if (ticketId) onMove(ticketId, status, beforeTicketId);
        }}
      >
        {tickets.map((thread) => (
          <TicketBoardCard
            key={thread.id}
            workspaceId={workspaceId}
            displayId={ticketDisplayId(ticketPrefix, numbers.get(thread.id) ?? 1)}
            status={status}
            thread={thread}
            unreadLabel={formatUnreadCount(unreadCounts?.[thread.id] ?? 0)}
            members={members}
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="w-full invisible group-hover/column:visible focus-visible:visible"
        >
          <Link href={createHref}>
            <Plus />
            <span className="sr-only">Create ticket in {statusLabel}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

function TicketBoardCard({
  workspaceId,
  displayId,
  status,
  thread,
  unreadLabel,
  members,
  enableDrag = true,
}: {
  workspaceId: string;
  displayId: string;
  status: TicketStatus;
  thread: ChannelThread;
  unreadLabel: string | null;
  members: TicketMenuMember[];
  enableDrag?: boolean;
}) {
  const priority = ticketPriorityOf(thread.priority);

  return (
    <Link
      href={conversationPageHref(workspaceId, thread)}
      draggable={enableDrag}
      data-ticket-id={enableDrag ? thread.id : undefined}
      className={cn(
        'group/card relative min-w-0',
        enableDrag &&
          'active:cursor-grabbing data-drop-before:before:absolute data-drop-before:before:inset-x-0 data-drop-before:before:-top-1 data-drop-before:before:h-0.5 data-drop-before:before:rounded-full data-drop-before:before:bg-primary data-drop-after:after:absolute data-drop-after:after:inset-x-0 data-drop-after:after:-bottom-1 data-drop-after:after:h-0.5 data-drop-after:after:rounded-full data-drop-after:after:bg-primary',
      )}
      onDragStart={
        enableDrag
          ? (event) => startTicketDrag(event, thread.id)
          : undefined
      }
    >
      <Card size="sm" className="gap-1.5 hover:bg-muted/50">
        <CardHeader className="gap-1.5 py-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-muted-foreground tabular-nums">
                {displayId}
              </span>
              {unreadLabel ? (
                <Badge variant="destructive">{unreadLabel}</Badge>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center">
              <TicketArchiveMenu
                workspaceId={workspaceId}
                channelId={thread.id}
                archivedAt={thread.archivedAt}
                size="icon-xs"
                stopCardGestures
                className="relative z-10 md:opacity-0 md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100 aria-expanded:opacity-100"
              />
              <TicketAssigneeIconMenu
                workspaceId={workspaceId}
                channelId={thread.id}
                assigneeId={thread.assigneeId}
                members={members}
              />
            </div>
          </div>
          <CardTitle className="flex items-start gap-1.5 font-normal leading-snug">
            <TicketStatusIconMenu
              workspaceId={workspaceId}
              channelId={thread.id}
              status={status}
            />
            <span className="line-clamp-2">{thread.name}</span>
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 pt-0">
          <div className="flex flex-wrap items-center gap-1">
            <TicketPriorityIconMenu
              workspaceId={workspaceId}
              channelId={thread.id}
              priority={priority}
            />
            {(thread.labels?.length ?? 0) > 0 ? (
              <TicketLabelsMenu
                workspaceId={workspaceId}
                channelId={thread.id}
                selected={thread.labels ?? []}
              />
            ) : null}
          </div>
          <span className="text-muted-foreground">
            Created {format(new Date(thread.createdAt), 'MMM d')}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function TicketListView({
  workspaceId,
  threads,
  unreadCounts,
  membersById,
  onMove,
}: {
  workspaceId: string;
  threads: ChannelThread[];
  unreadCounts: Record<string, number> | undefined;
  membersById: Map<string, { name: string; image: string | null; isBot?: boolean }>;
  onMove: TicketMoveHandler;
}) {
  const tableRef = useRef<HTMLTableElement>(null);

  /** Status group under the pointer and its visible rows. */
  function dropGroup(target: EventTarget) {
    const group =
      target instanceof Element
        ? target.closest<HTMLElement>('tbody[data-status]')
        : null;
    const status = group?.dataset.status as TicketStatus | undefined;
    if (!status) return null;
    return {
      status,
      rows: ticketDragTargets(tableRef.current, `tbody[data-status="${status}"]`),
    };
  }

  return (
    <ScrollArea className="min-h-0 flex-1 overflow-hidden">
      <Table
        ref={tableRef}
        onDragOver={(event) => {
          const group = dropGroup(event.target);
          if (!group) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          showTicketDropIndicator(tableRef.current, group.rows, event.clientY);
        }}
        onDragLeave={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            tableRef.current?.contains(event.relatedTarget)
          ) {
            return;
          }
          clearTicketDropIndicator(tableRef.current);
        }}
        onDrop={(event) => {
          const group = dropGroup(event.target);
          clearTicketDropIndicator(tableRef.current);
          if (!group) return;
          event.preventDefault();
          const ticketId = event.dataTransfer.getData('text/plain');
          const beforeTicketId =
            ticketBelowPointer(group.rows, event.clientY)?.dataset.ticketId ??
            null;
          if (ticketId) onMove(ticketId, group.status, beforeTicketId);
        }}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="hidden w-28 sm:table-cell">Priority</TableHead>
            <TableHead className="hidden w-40 md:table-cell">
              Assignee
            </TableHead>
            <TableHead className="hidden w-28 lg:table-cell">Due</TableHead>
            <TableHead className="hidden w-40 text-right lg:table-cell">
              Activity
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        {groupTicketsByStatus(threads).map((group) => (
          <TicketListStatusGroup
            key={group.status}
            workspaceId={workspaceId}
            status={group.status}
            tickets={group.tickets}
            unreadCounts={unreadCounts}
            membersById={membersById}
          />
        ))}
      </Table>
    </ScrollArea>
  );
}

function TicketListStatusGroup({
  workspaceId,
  status,
  tickets,
  unreadCounts,
  membersById,
}: {
  workspaceId: string;
  status: TicketStatus;
  tickets: ChannelThread[];
  unreadCounts: Record<string, number> | undefined;
  membersById: Map<string, { name: string; image: string | null; isBot?: boolean }>;
}) {
  const meta = TICKET_STATUS_META[status];
  const StatusIcon = meta.icon;

  return (
    <Collapsible
      defaultOpen={isTicketStatusOpenByDefault(status, false)}
      className="group/status contents"
    >
      <TableBody data-status={status}>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="p-0">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full min-w-0 justify-start px-2 font-normal text-muted-foreground"
              >
                <ChevronRight
                  data-icon="inline-start"
                  className="transition-transform group-data-[state=open]/status:rotate-90"
                />
                <StatusIcon className={meta.iconClassName} />
                <span className="truncate">{meta.label}</span>
                <Badge variant="secondary">{tickets.length}</Badge>
              </Button>
            </CollapsibleTrigger>
          </TableCell>
        </TableRow>
      </TableBody>
      <CollapsibleContent asChild>
        <TableBody data-status={status}>
          {tickets.map((thread) => (
            <TicketListRow
              key={thread.id}
              workspaceId={workspaceId}
              thread={thread}
              unreadLabel={formatUnreadCount(unreadCounts?.[thread.id] ?? 0)}
              membersById={membersById}
            />
          ))}
        </TableBody>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TicketListRow({
  workspaceId,
  thread,
  unreadLabel,
  membersById,
}: {
  workspaceId: string;
  thread: ChannelThread;
  unreadLabel: string | null;
  membersById: Map<string, { name: string; image: string | null; isBot?: boolean }>;
}) {
  const href = conversationPageHref(workspaceId, thread);
  const priority = ticketPriorityOf(thread.priority);
  const PriorityIcon = TICKET_PRIORITY_META[priority].icon;
  const assignee = thread.assigneeId
    ? membersById.get(thread.assigneeId)
    : undefined;
  const dueDate = thread.dueAt ? new Date(thread.dueAt) : undefined;

  return (
    <TableRow
      draggable
      data-ticket-id={thread.id}
      className="group/row relative active:cursor-grabbing data-drop-before:before:absolute data-drop-before:before:inset-x-0 data-drop-before:before:top-0 data-drop-before:before:h-0.5 data-drop-before:before:bg-primary data-drop-after:after:absolute data-drop-after:after:inset-x-0 data-drop-after:after:bottom-0 data-drop-after:after:h-0.5 data-drop-after:after:bg-primary"
      onDragStart={(event) => startTicketDrag(event, thread.id)}
    >
      <TableCell className="max-w-0">
        <Link href={href} className="absolute inset-0" tabIndex={-1}>
          <span className="sr-only">{thread.name}</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={href}
            className="relative z-10 min-w-0 truncate font-medium"
          >
            {thread.name}
          </Link>
          {unreadLabel ? (
            <Badge variant="destructive">{unreadLabel}</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PriorityIcon
            className={cn(
              'shrink-0',
              TICKET_PRIORITY_META[priority].iconClassName,
            )}
          />
          {priority === 'none' ? '—' : TICKET_PRIORITY_META[priority].label}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {assignee ? (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={assignee.image ?? undefined} alt="" />
              <AvatarFallback>
                {assignee.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{assignee.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserRound className="shrink-0" />
            Unassigned
          </div>
        )}
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">
        {dueDate ? format(dueDate, 'MMM d') : '—'}
      </TableCell>
      <TableCell className="hidden text-right text-muted-foreground lg:table-cell">
        {formatMessageCount(thread.messageCount)}
        {' · '}
        {formatThreadActivity(thread.lastMessageAt ?? thread.createdAt)}
      </TableCell>
      <TableCell className="w-10 text-right">
        <TicketArchiveMenu
          workspaceId={workspaceId}
          channelId={thread.id}
          archivedAt={thread.archivedAt}
          size="icon-xs"
          stopCardGestures
          className="relative z-10 md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100 aria-expanded:opacity-100"
        />
      </TableCell>
    </TableRow>
  );
}
