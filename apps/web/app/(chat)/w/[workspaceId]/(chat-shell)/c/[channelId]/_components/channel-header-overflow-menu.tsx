'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Columns3,
  FileDown,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { DrawerAction } from '@chat/_components/drawer-action';
import { createThreadHref } from '@chat/_components/create-thread-dialog';
import { useUpdateChannel } from '@chat/_hooks/use-channels';
import {
  channelBoardHref,
  channelPageHref,
  type Channel,
  type TicketLayout,
} from '@chat/_libs/channels';
import {
  channelDisplayName,
  isDmChannel,
} from '@chat/_helpers/channel-display';
import { isTicketArchived } from '@chat/_helpers/ticket-fields';
import { ExportDialog } from './export-dialog';
import { PinnedMessagesDialogHost } from './pinned-messages-popover';
import { ArchiveTicketAlertContent } from './ticket-property-menus';

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
  /** Current query string, carried over when jumping to the board. */
  search?: Pick<URLSearchParams, 'toString'>;
  /** Opens the header's workspace search popover. */
  onOpenSearch: () => void;
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
  search,
  onOpenSearch,
}: ChannelHeaderOverflowMenuProps) {
  const router = useRouter();
  const updateChannel = useUpdateChannel(workspaceId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

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

  // Each action closes the drawer first so the next surface gets focus.
  function openSearch() {
    setMenuOpen(false);
    onOpenSearch();
  }

  function openExport() {
    setMenuOpen(false);
    setExportOpen(true);
  }

  function openPins() {
    setMenuOpen(false);
    setPinsOpen(true);
  }

  function handleArchiveClick() {
    setMenuOpen(false);
    // Archiving asks for confirmation; restoring goes straight through.
    if (archived) toggleArchived();
    else setArchiveConfirmOpen(true);
  }

  return (
    <>
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            className="md:hidden"
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent
          // Keep focus where the chosen action puts it (e.g. the search input).
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <DrawerHeader className="gap-0.5 px-4 pt-3 pb-2 text-left">
            <DrawerTitle className="truncate">
              {channel ? channelDisplayName(channel) : 'Channel'}
            </DrawerTitle>
            <DrawerDescription>More actions</DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col p-2">
            <DrawerAction onClick={openSearch}>
              <Search />
              Search
            </DrawerAction>

            {isThread && (parentChannel || channel) ? (
              <Separator className="my-1 data-horizontal:w-auto" />
            ) : null}
            {isThread && parentChannel ? (
              <DrawerClose asChild>
                <DrawerAction asChild>
                  <Link href={channelBoardHref(workspaceId, parentChannel.id)}>
                    <Columns3 />
                    Open board
                  </Link>
                </DrawerAction>
              </DrawerClose>
            ) : null}
            {isThread && channel ? (
              <DrawerAction
                onClick={handleArchiveClick}
                disabled={updateChannel.isPending}
              >
                <ArchiveIcon />
                {archiveLabel}
              </DrawerAction>
            ) : null}

            {isTicketChannel || showChatExtras || isDm ? (
              <Separator className="my-1 data-horizontal:w-auto" />
            ) : null}
            {isTicketChannel ? (
              <DrawerClose asChild>
                <DrawerAction asChild>
                  {view === 'threads' ? (
                    <Link href={channelPageHref(workspaceId, channelId)}>
                      <MessageSquare />
                      Go to Chat
                    </Link>
                  ) : (
                    <Link
                      href={channelBoardHref(
                        workspaceId,
                        channelId,
                        layout,
                        search,
                      )}
                    >
                      <Columns3 />
                      Go to Board
                    </Link>
                  )}
                </DrawerAction>
              </DrawerClose>
            ) : null}
            {isTicketChannel ? (
              <DrawerClose asChild>
                <DrawerAction asChild>
                  <Link href={createHref}>
                    <MessageSquarePlus />
                    Create ticket
                  </Link>
                </DrawerAction>
              </DrawerClose>
            ) : null}
            {showChatExtras || isDm ? (
              <DrawerClose asChild>
                <DrawerAction asChild>
                  <Link href={`/w/${workspaceId}/members`}>
                    <Users />
                    Members
                  </Link>
                </DrawerAction>
              </DrawerClose>
            ) : null}
            {showChatExtras ? (
              <>
                <DrawerAction onClick={openPins}>
                  <Pin />
                  Pinned messages
                </DrawerAction>
                <DrawerAction onClick={openExport}>
                  <FileDown />
                  Export chat
                </DrawerAction>
              </>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>

      {isThread && channel ? (
        <AlertDialog
          open={archiveConfirmOpen}
          onOpenChange={setArchiveConfirmOpen}
        >
          <ArchiveTicketAlertContent onConfirm={toggleArchived} />
        </AlertDialog>
      ) : null}

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
