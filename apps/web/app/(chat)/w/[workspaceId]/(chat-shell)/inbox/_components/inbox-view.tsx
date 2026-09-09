'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { personInitials } from '@chat/_helpers/ticket-fields';
import {
  inboxEventLabel,
  inboxItemHref,
  inboxSnippet,
} from '@chat/_helpers/inbox-copy';
import {
  useInbox,
  useMarkAllInboxRead,
  useMarkInboxRead,
} from '@chat/_hooks/use-inbox';
import { ChatPane } from '@chat/_components/chat-pane';
import { MembersSidebarToggle } from '@chat/_components/members-sidebar-toggle';
import { WorkspaceSearch } from '@chat/_components/workspace-search';

export function InboxView({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const { data, isPending } = useInbox(workspaceId);
  const markRead = useMarkInboxRead(workspaceId);
  const markAllRead = useMarkAllInboxRead(workspaceId);
  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <ChatPane
      currentUserId={userId}
      header={
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">Inbox</h1>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Mark all read
              </Button>
            ) : null}
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
      ) : items.length === 0 ? (
        <Empty className="flex-1 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>You&apos;re all caught up</EmptyTitle>
            <EmptyDescription>
              Mentions, reactions, and assignments will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {items.map((item) => {
            const unread = !item.readAt;
            const snippet = inboxSnippet(item);
            return (
              <Button
                key={item.id}
                variant="ghost"
                asChild
                className={cn(
                  'h-auto min-h-12 w-full justify-start rounded-none border-b px-4 py-3 font-normal',
                  unread && 'bg-muted/50',
                )}
              >
                <Link
                  href={inboxItemHref(workspaceId, item)}
                  onClick={() => {
                    if (unread) markRead.mutate(item.id);
                  }}
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={item.actor.image ?? undefined} alt="" />
                    <AvatarFallback>
                      {personInitials(item.actor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span
                      className={cn(
                        'w-full truncate text-sm',
                        unread ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {inboxEventLabel(item)}
                    </span>
                    {snippet ? (
                      <span className="w-full truncate text-xs text-muted-foreground">
                        {snippet}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatInboxTime(item.createdAt)}
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

function formatInboxTime(dateStr: string) {
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
