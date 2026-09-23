'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Columns3,
  FileDown,
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  RotateCcw,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createThreadHref } from '@chat/_components/create-thread-dialog';
import { useMembersSidebarOpen } from '@chat/_hooks/use-members-sidebar';
import { useUpdateChannel } from '@chat/_hooks/use-channels';
import {
  channelBoardHref,
  channelPageHref,
  type Channel,
  type TicketLayout,
} from '@chat/_libs/channels';
import { isDmChannel } from '@chat/_helpers/channel-display';
import { isTicketArchived } from '@chat/_helpers/ticket-fields';
import { ExportDialog } from './export-dialog';
import { PinnedMessagesDialogHost } from './pinned-messages-popover';

export type ChannelHeaderOverflowMenuProps = {
  workspaceId: string;
  channelId: string;
  channel: Channel | undefined;
  parentChannel: Channel | undefined;
  view: 'messages' | 'threads';
  layout: TicketLayout;
  isThread: boolean;
  isTicketChannel: boolean;
  createThreadHref?: string;
};

export function ChannelHeaderOverflowMenu({
  workspaceId,
  channelId,
  channel,
  parentChannel,
  view,
  layout,
  isThread,
  isTicketChannel,
  createThreadHref: createThreadHrefProp,
}: ChannelHeaderOverflowMenuProps) {
  const router = useRouter();
  const { setOpen: setMembersOpen } = useMembersSidebarOpen();
  const updateChannel = useUpdateChannel(workspaceId);
  const [exportOpen, setExportOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);

  const isDm = isDmChannel(channel);
  const showChatExtras = Boolean(channel && !isDm);

  const createHref =
    createThreadHrefProp ??
    createThreadHref(
      channelId,
      view === 'threads' ? { layout } : undefined,
    );

  const archived = channel ? isTicketArchived(channel) : false;
  const archiveLabel = archived ? 'Restore ticket' : 'Archive ticket';
  const ArchiveIcon = archived ? RotateCcw : Archive;

  function toggleArchived() {
    if (!channel) return;
    const nextArchived = !archived;
    updateChannel.mutate({
      channelId: channel.id,
      archived: nextArchived,
    });
    if (nextArchived && channel.parentId) {
      router.replace(channelPageHref(workspaceId, channel.parentId));
    }
  }

  function openExport() {
    setExportOpen(true);
  }

  function openPins() {
    setPinsOpen(true);
  }

  function openMembers() {
    setMembersOpen(true);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="More actions"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isThread && parentChannel ? (
            <DropdownMenuItem asChild>
              <Link href={channelBoardHref(workspaceId, parentChannel.id)}>
                <Columns3 />
                Open board
              </Link>
            </DropdownMenuItem>
          ) : null}
          {isThread && channel ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                toggleArchived();
              }}
              disabled={updateChannel.isPending}
            >
              <ArchiveIcon />
              {archiveLabel}
            </DropdownMenuItem>
          ) : null}
          {isThread && (parentChannel || channel) ? (
            <DropdownMenuSeparator />
          ) : null}
          {isTicketChannel ? (
            <DropdownMenuItem asChild>
              <Link href={createHref}>
                <MessageSquarePlus />
                Create ticket
              </Link>
            </DropdownMenuItem>
          ) : null}
          {showChatExtras ? (
            <>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  openMembers();
                }}
              >
                <Users />
                Show members
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  openPins();
                }}
              >
                <Pin />
                Pinned messages
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  openExport();
                }}
              >
                <FileDown />
                Export chat
              </DropdownMenuItem>
            </>
          ) : null}
          {isDm ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                openMembers();
              }}
            >
              <Users />
              Show members
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {showChatExtras ? (
        <>
          <ExportDialog
            channelId={channelId}
            channel={channel}
            open={exportOpen}
            onOpenChange={setExportOpen}
            showTrigger={false}
          />
          <PinnedMessagesDialogHost
            channelId={channelId}
            open={pinsOpen}
            onOpenChange={setPinsOpen}
          />
        </>
      ) : null}
    </>
  );
}
