'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Columns3, MessageSquare, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  channelBoardHref,
  channelPageHref,
  type Channel,
  type TicketLayout,
} from '@chat/_libs/channels';
import { createThreadHref } from '@chat/_components/create-thread-dialog';
import {
  ChatPageHeader,
  type ChatLinearParent,
} from '@chat/_components/chat-page-header';
import type { ChatCrumb } from '@chat/_components/chat-breadcrumbs';
import { ExportDialog } from './export-dialog';
import { PinnedMessagesPopoverHost } from './pinned-messages-popover';
import {
  ChannelHeaderOverflowMenu,
  type ChannelHeaderOverflowMenuProps,
} from './channel-header-overflow-menu';
import { MembersSidebarToggle } from '@chat/_components/members-sidebar-toggle';
import { WorkspaceSearch } from '@chat/_components/workspace-search';
import { ChannelTypeIcon } from '@chat/_components/channel-type-icon';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import {
  channelBreadcrumbLabel,
  channelDisplayName,
  isDmChannel,
} from '@chat/_helpers/channel-display';
import { TicketArchiveMenu } from './ticket-property-menus';

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
  const isDm = isDmChannel(channel);
  const onBoard = view === 'threads' && !isThread;

  const backHref =
    isThread && parentChannel
      ? channelPageHref(workspaceId, parentChannel.id)
      : `/w/${workspaceId}`;

  const backLabel =
    isThread && parentChannel
      ? `Back to ${channelBreadcrumbLabel(parentChannel)}`
      : 'Back to channels';

  const crumbs = buildChannelHeaderCrumbs({
    channel,
    parentChannel,
    onBoard,
    workspaceId,
  });

  const { linearTitle, linearParent } = buildChannelHeaderLinear({
    channel,
    parentChannel,
    onBoard,
    workspaceId,
  });

  const leading =
    isDm && channel?.dmPeer ? (
      <PresenceAvatar
        userId={channel.dmPeer.id}
        name={channel.dmPeer.name}
        image={channel.dmPeer.image}
        size="sm"
        showOffline
        className="shrink-0"
      />
    ) : !isThread && !isDm && channel ? (
      <ChannelTypeIcon
        isPrivate={channel.isPrivate}
        className="h-4 w-4 shrink-0 text-muted-foreground max-md:hidden"
      />
    ) : null;

  return (
    <ChatPageHeader
      backHref={backHref}
      backLabel={backLabel}
      linearTitle={linearTitle}
      linearParent={linearParent}
      crumbs={crumbs}
      leading={leading}
      actions={
        <>
          {isThread && channel ? (
            <>
              {parentChannel ? (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="max-md:hidden"
                >
                  <Link href={channelBoardHref(workspaceId, parentChannel.id)}>
                    <Columns3 data-icon="inline-start" />
                    Board
                  </Link>
                </Button>
              ) : null}
              <TicketArchiveMenu
                workspaceId={workspaceId}
                channelId={channel.id}
                parentChannelId={channel.parentId}
                archivedAt={channel.archivedAt}
                variant="button"
                className="max-md:hidden"
              />
            </>
          ) : null}
          {!isThread && channel && !isDm ? (
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
          <div className="hidden shrink-0 items-center gap-1 md:flex">
            <ExportDialog channelId={channelId} channel={channel} />
            <PinnedMessagesPopoverHost channelId={channelId} />
          </div>
          <MembersSidebarToggle className="max-md:hidden" />
          <Suspense
            fallback={
              <ChannelHeaderOverflowMenu
                workspaceId={workspaceId}
                channelId={channelId}
                channel={channel}
                parentChannel={parentChannel}
                view={view}
                layout={layout}
                isThread={isThread}
                isTicketChannel={Boolean(!isThread && channel && !isDm)}
              />
            }
          >
            <ChannelHeaderOverflowMenuFromSearch
              workspaceId={workspaceId}
              channelId={channelId}
              channel={channel}
              parentChannel={parentChannel}
              view={view}
              layout={layout}
              isThread={isThread}
              isTicketChannel={Boolean(!isThread && channel && !isDm)}
            />
          </Suspense>
          <div className="md:ml-3">
            <WorkspaceSearch workspaceId={workspaceId} />
          </div>
        </>
      }
    />
  );
}

function buildChannelHeaderLinear({
  channel,
  parentChannel,
  onBoard,
  workspaceId,
}: {
  channel: Channel | undefined;
  parentChannel: Channel | undefined;
  onBoard: boolean;
  workspaceId: string;
}): { linearTitle: string; linearParent?: ChatLinearParent } {
  if (channel?.parentId && parentChannel) {
    return {
      linearTitle: channel ? channelDisplayName(channel) : 'Ticket',
      linearParent: {
        label: channelBreadcrumbLabel(parentChannel),
        href: channelPageHref(workspaceId, parentChannel.id),
      },
    };
  }

  if (!channel) {
    return { linearTitle: 'Loading…' };
  }

  if (onBoard && !isDmChannel(channel)) {
    return {
      linearTitle: 'Board',
      linearParent: {
        label: channelBreadcrumbLabel(channel),
        href: channelPageHref(workspaceId, channel.id),
      },
    };
  }

  return {
    linearTitle: channelBreadcrumbLabel(channel),
  };
}

function buildChannelHeaderCrumbs({
  channel,
  parentChannel,
  onBoard,
  workspaceId,
}: {
  channel: Channel | undefined;
  parentChannel: Channel | undefined;
  onBoard: boolean;
  workspaceId: string;
}): ChatCrumb[] {
  if (channel?.parentId && parentChannel) {
    return [
      {
        label: channelBreadcrumbLabel(parentChannel),
        href: channelPageHref(workspaceId, parentChannel.id),
      },
      {
        label: channel ? channelDisplayName(channel) : 'Ticket',
      },
    ];
  }

  if (!channel) {
    return [{ label: 'Loading…' }];
  }

  // The leading ChannelTypeIcon already renders the # / lock, so use the bare name.
  if (onBoard && !isDmChannel(channel)) {
    return [
      {
        label: channelDisplayName(channel),
        href: channelPageHref(workspaceId, channel.id),
      },
      { label: 'Board' },
    ];
  }

  return [{ label: channelDisplayName(channel) }];
}

function ChannelHeaderTicketActionsFromSearch(
  props: Omit<ChannelHeaderTicketActionsProps, 'search'>,
) {
  const searchParams = useSearchParams();
  return <ChannelHeaderTicketActions {...props} search={searchParams} />;
}

function ChannelHeaderOverflowMenuFromSearch(
  props: Omit<ChannelHeaderOverflowMenuProps, 'createThreadHref'>,
) {
  const searchParams = useSearchParams();
  const createThreadHrefValue = createThreadHref(
    props.channelId,
    props.view === 'threads'
      ? { layout: props.layout, search: searchParams }
      : undefined,
  );
  return (
    <ChannelHeaderOverflowMenu
      {...props}
      createThreadHref={createThreadHrefValue}
    />
  );
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
  const mode = view === 'threads' ? 'threads' : 'messages';

  return (
    <>
      <ToggleGroup
        type="single"
        value={mode}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label="Channel view"
      >
        <ToggleGroupItem value="messages" asChild>
          <Link href={channelPageHref(workspaceId, channelId)}>
            <MessageSquare data-icon="inline-start" />
            <span className="max-md:sr-only">Chat</span>
          </Link>
        </ToggleGroupItem>
        <ToggleGroupItem value="threads" asChild>
          <Link
            href={channelBoardHref(
              workspaceId,
              channelId,
              layout,
              search,
            )}
          >
            <Columns3 data-icon="inline-start" />
            <span className="max-md:sr-only">Board</span>
          </Link>
        </ToggleGroupItem>
      </ToggleGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="max-md:hidden"
          >
            <Link
              href={createThreadHref(
                channelId,
                view === 'threads' ? { layout, search } : undefined,
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
