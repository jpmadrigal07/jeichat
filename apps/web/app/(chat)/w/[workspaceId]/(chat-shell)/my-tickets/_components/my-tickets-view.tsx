'use client';

import Link from 'next/link';
import { StickyNotes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import {
  TICKET_PRIORITY_META,
  TICKET_STATUSES,
  TICKET_STATUS_META,
  ticketPriorityOf,
  ticketStatusOf,
} from '@chat/_helpers/ticket-fields';
import {
  assignedTicketLabel,
  isAssignedTicket,
} from '@chat/_helpers/ticket-filters';
import { useChannels } from '@chat/_hooks/use-channels';
import { useUnreadCounts } from '@chat/_hooks/use-unread-counts';
import { channelPageHref, type Channel } from '@chat/_libs/channels';
import { ChatPane } from '@chat/_components/chat-pane';
import { MembersSidebarToggle } from '@chat/_components/members-sidebar-toggle';
import { WorkspaceSearch } from '@chat/_components/workspace-search';

export function MyTicketsView({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const { data: channels, isPending } = useChannels(workspaceId);
  const { data: unreadCounts } = useUnreadCounts(workspaceId);
  const channelById = new Map(
    (channels ?? []).map((channel) => [channel.id, channel]),
  );
  const tickets = assignedTicketsForUser(channels ?? [], userId);

  return (
    <ChatPane
      currentUserId={userId}
      header={
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">
            My tickets
          </h1>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <MembersSidebarToggle />
            <div className="ml-3">
              <WorkspaceSearch workspaceId={workspaceId} />
            </div>
          </div>
        </div>
      }
    >
      {isPending ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Empty className="flex-1 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StickyNotes />
            </EmptyMedia>
            <EmptyTitle>No tickets assigned to you</EmptyTitle>
            <EmptyDescription>
              Tickets assigned to you will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {tickets.map((ticket) => {
            const unread = (unreadCounts?.[ticket.id] ?? 0) > 0;
            const parent = ticket.parentId
              ? channelById.get(ticket.parentId)
              : undefined;
            const status = ticketStatusOf(ticket.status);
            const StatusIcon = TICKET_STATUS_META[status].icon;
            const snippet = ticketSnippet(ticket, parent);

            return (
              <Button
                key={ticket.id}
                variant="ghost"
                asChild
                className={cn(
                  'h-auto min-h-12 w-full justify-start rounded-none border-b px-4 py-3 font-normal',
                  unread && 'bg-muted/50',
                )}
              >
                <Link href={channelPageHref(workspaceId, ticket.id)}>
                  <StatusIcon
                    className={cn(
                      'shrink-0',
                      TICKET_STATUS_META[status].iconClassName,
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span
                      className={cn(
                        'w-full truncate text-sm',
                        unread ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {assignedTicketLabel(ticket, parent)}
                    </span>
                    {snippet ? (
                      <span className="w-full truncate text-xs text-muted-foreground">
                        {snippet}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTicketTime(ticket.updatedAt)}
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </ChatPane>
  );
}

function assignedTicketsForUser(channels: Channel[], userId: string) {
  return channels
    .filter((channel) => isAssignedTicket(channel, userId))
    .sort((a, b) => {
      const statusDiff =
        TICKET_STATUSES.indexOf(ticketStatusOf(a.status)) -
        TICKET_STATUSES.indexOf(ticketStatusOf(b.status));
      if (statusDiff !== 0) return statusDiff;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

function ticketSnippet(
  ticket: Channel,
  parent?: Channel,
) {
  const parts: string[] = [];
  if (parent) parts.push(parent.name);
  const priority = ticketPriorityOf(ticket.priority);
  if (priority !== 'none') {
    parts.push(TICKET_PRIORITY_META[priority].label);
  }
  return parts.join(' · ');
}

function formatTicketTime(dateStr: string) {
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
