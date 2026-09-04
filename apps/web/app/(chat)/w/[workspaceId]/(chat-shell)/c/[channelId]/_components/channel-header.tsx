'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Columns3, Hash, Lock, MessageSquare, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  channelPageHref,
  channelThreadsViewHref,
  type Channel,
  type TicketLayout,
} from '@chat/_libs/channels';
import { createThreadHref } from '@chat/_components/create-thread-dialog';
import { ExportDialog } from './export-dialog';
import { PinnedMessagesPopoverHost } from './pinned-messages-popover';
import { MembersSidebarToggle } from '@chat/_components/members-sidebar-toggle';
import { WorkspaceSearch } from '@chat/_components/workspace-search';

type ChannelViewMode = 'messages' | 'threads';

type ChannelHeaderProps = {
  channel: Channel | undefined;
  parentChannel: Channel | undefined;
  channelId: string;
  workspaceId: string;
  view: ChannelViewMode;
  layout: TicketLayout;
};

export function ChannelHeader({
  channel,
  parentChannel,
  channelId,
  workspaceId,
  view,
  layout,
}: ChannelHeaderProps) {
  const isThread = Boolean(channel?.parentId);

  return (
    <div className="flex h-12 items-center gap-2 border-b px-4 shrink-0">
      {isThread && parentChannel && channel ? (
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap text-sm">
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink asChild className="min-w-0 truncate">
                <Link href={channelPageHref(workspaceId, parentChannel.id)}>
                  #{parentChannel.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="min-w-0 truncate font-medium">
                {channel.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isThread ? (
            <MessageSquare className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : channel?.isPrivate ? (
            <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <Hash className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <h1 className="min-w-0 truncate text-sm font-semibold">
            {channel?.name ?? 'Loading...'}
          </h1>
          {channel?.description && !isThread ? (
            <span className="truncate text-xs text-muted-foreground">
              {channel.description}
            </span>
          ) : null}
        </div>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {!isThread && channel ? (
          <Suspense
            fallback={
              <ChannelHeaderTicketActions
                channelId={channelId}
                workspaceId={workspaceId}
                view={view}
                layout={layout}
              />
            }
          >
            <ChannelHeaderTicketActionsFromSearch
              channelId={channelId}
              workspaceId={workspaceId}
              view={view}
              layout={layout}
            />
          </Suspense>
        ) : null}
        <ExportDialog channelId={channelId} channel={channel} />
        <PinnedMessagesPopoverHost channelId={channelId} />
        <MembersSidebarToggle />
        <WorkspaceSearch workspaceId={workspaceId} />
      </div>
    </div>
  );
}

function ChannelHeaderTicketActionsFromSearch(
  props: Omit<ChannelHeaderTicketActionsProps, 'search'>,
) {
  const searchParams = useSearchParams();
  return <ChannelHeaderTicketActions {...props} search={searchParams} />;
}

type ChannelHeaderTicketActionsProps = {
  channelId: string;
  workspaceId: string;
  view: ChannelViewMode;
  layout: TicketLayout;
  search?: Pick<URLSearchParams, 'toString'>;
};

function ChannelHeaderTicketActions({
  channelId,
  workspaceId,
  view,
  layout,
  search,
}: ChannelHeaderTicketActionsProps) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={view === 'threads' ? 'secondary' : 'ghost'}
            size="sm"
            asChild
          >
            <Link
              href={
                view === 'threads'
                  ? channelPageHref(workspaceId, channelId)
                  : channelThreadsViewHref(
                      workspaceId,
                      channelId,
                      layout,
                      search,
                    )
              }
            >
              <Columns3 data-icon="inline-start" />
              Board
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {view === 'threads' ? 'Back to messages' : 'View board'}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link
              href={createThreadHref(
                channelId,
                view === 'threads'
                  ? { view: 'threads', layout, search }
                  : undefined,
              )}
            >
              <MessageSquarePlus />
              <span className="sr-only">Create ticket</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Create ticket</TooltipContent>
      </Tooltip>
    </>
  );
}
