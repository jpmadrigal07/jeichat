'use client';

import { Suspense, useRef } from 'react';
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
import { useChannels, useUpdateChannel } from '@chat/_hooks/use-channels';
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
  TicketAssigneeIconMenu,
  TicketLabelsMenu,
  TicketPriorityIconMenu,
  TicketStatusIconMenu,
  type TicketMenuMember,
} from './ticket-property-menus';
import {
  channelPageHref,
  type ChannelThread,
  type TicketLayout,
} from '@chat/_libs/channels';
import { useChannelThreads } from '../_hooks/use-channel-threads';
import {
  formatMessageCount,
  formatThreadActivity,
} from '../_helpers/format-thread-activity';
import {
  TICKET_STATUSES,
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
    <Suspense fallback={<TicketListSkeleton layout={layout} />}>
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
  const visibleThreads = (threads ?? []).filter((thread) => {
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
  const boardStatuses =
    filters.completed === 'none'
      ? TICKET_STATUSES.filter(
          (status) => status !== 'done' && status !== 'cancelled',
        )
      : TICKET_STATUSES;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TicketFilterBar
        workspaceId={workspaceId}
        channelId={channelId}
        layout={layout}
      />
      {isPending ? (
        <TicketListSkeleton layout={layout} />
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
                  view: 'threads',
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
      ) : layout === 'list' ? (
        <TicketListView
          workspaceId={workspaceId}
          threads={visibleThreads}
          unreadCounts={unreadCounts}
          membersById={membersById}
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
        />
      )}
    </div>
  );
}

function TicketListSkeleton({ layout }: { layout: TicketLayout }) {
  if (layout === 'list') {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-3">
      {TICKET_STATUSES.map((status) => (
        <div
          key={status}
          className="flex w-60 shrink-0 flex-col rounded-md bg-muted/40"
        >
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <Skeleton className="size-3.5 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 px-1.5 pt-1.5 pb-1.5">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        </div>
      ))}
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
}: {
  workspaceId: string;
  channelId: string;
  ticketPrefix: string;
  threads: ChannelThread[];
  numbers: Map<string, number>;
  statuses: readonly TicketStatus[];
  unreadCounts: Record<string, number> | undefined;
  membersById: Map<string, { name: string; image: string | null }>;
  searchParams: Pick<URLSearchParams, 'toString'>;
}) {
  const updateChannel = useUpdateChannel(workspaceId);
  const members: TicketMenuMember[] = Array.from(
    membersById,
    ([userId, member]) => ({
      userId,
      name: member.name,
      image: member.image,
    }),
  );
  const ticketsByStatus = new Map<TicketStatus, ChannelThread[]>(
    statuses.map((status) => [status, []]),
  );
  for (const thread of threads) {
    ticketsByStatus.get(ticketStatusOf(thread.status))?.push(thread);
  }
  const statusByTicketId = new Map(
    threads.map((thread) => [thread.id, ticketStatusOf(thread.status)]),
  );

  function moveTicket(ticketId: string, status: TicketStatus) {
    if (statusByTicketId.get(ticketId) === status) return;
    updateChannel.mutate({ channelId: ticketId, status });
  }

  return (
    <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-3">
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
          onMove={moveTicket}
        />
      ))}
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
  onMove: (ticketId: string, status: TicketStatus) => void;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const StatusIcon = TICKET_STATUS_META[status].icon;
  const statusLabel = TICKET_STATUS_META[status].label;
  const createHref = createThreadHref(channelId, {
    view: 'threads',
    status,
    search: searchParams,
  });

  function setDropTarget(on: boolean) {
    if (on) {
      columnRef.current?.setAttribute('data-drop', 'true');
      return;
    }
    columnRef.current?.removeAttribute('data-drop');
  }

  return (
    <div className="group/column flex h-full w-60 shrink-0 flex-col rounded-md bg-muted/40">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
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
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 pt-1.5 pb-1.5 ring-1 ring-transparent data-drop:bg-muted data-drop:ring-ring"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
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
          dragDepthRef.current = 0;
          setDropTarget(false);
          const ticketId = event.dataTransfer.getData('text/plain');
          if (ticketId) onMove(ticketId, status);
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
}: {
  workspaceId: string;
  displayId: string;
  status: TicketStatus;
  thread: ChannelThread;
  unreadLabel: string | null;
  members: TicketMenuMember[];
}) {
  const priority = ticketPriorityOf(thread.priority);

  return (
    <Link
      href={channelPageHref(workspaceId, thread.id)}
      draggable
      className="min-w-0 active:cursor-grabbing"
      onDragStart={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('button')
        ) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData('text/plain', thread.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
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
            <TicketAssigneeIconMenu
              workspaceId={workspaceId}
              channelId={thread.id}
              assigneeId={thread.assigneeId}
              members={members}
            />
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
}: {
  workspaceId: string;
  threads: ChannelThread[];
  unreadCounts: Record<string, number> | undefined;
  membersById: Map<string, { name: string; image: string | null }>;
}) {
  return (
    <ScrollArea className="flex-1">
      <Table>
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
  membersById: Map<string, { name: string; image: string | null }>;
}) {
  const meta = TICKET_STATUS_META[status];
  const StatusIcon = meta.icon;

  return (
    <Collapsible
      defaultOpen={isTicketStatusOpenByDefault(status, false)}
      className="group/status contents"
    >
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="p-0">
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
        <TableBody>
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
  membersById: Map<string, { name: string; image: string | null }>;
}) {
  const href = channelPageHref(workspaceId, thread.id);
  const priority = ticketPriorityOf(thread.priority);
  const PriorityIcon = TICKET_PRIORITY_META[priority].icon;
  const assignee = thread.assigneeId
    ? membersById.get(thread.assigneeId)
    : undefined;
  const dueDate = thread.dueAt ? new Date(thread.dueAt) : undefined;

  return (
    <TableRow className="relative">
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
    </TableRow>
  );
}
