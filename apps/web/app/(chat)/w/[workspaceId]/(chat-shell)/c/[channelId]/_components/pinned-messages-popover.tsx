'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  usePinnedMessages,
  useUnpinMessage,
} from '../_hooks/use-pins';
import { pinnedMessageHref, type PinnedMessage } from '../_libs/messages';

export function PinnedMessagesPopoverHost({
  channelId,
}: {
  channelId: string;
}) {
  return (
    <Suspense
      fallback={
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
          <Pin />
          <span className="sr-only">Pinned messages</span>
        </Button>
      }
    >
      <PinnedMessagesPopoverFromSearch channelId={channelId} />
    </Suspense>
  );
}

function PinnedMessagesPopoverFromSearch({
  channelId,
}: {
  channelId: string;
}) {
  const searchParams = useSearchParams();
  return (
    <PinnedMessagesPopover channelId={channelId} search={searchParams} />
  );
}

function PinnedMessagesPopover({
  channelId,
  search,
}: {
  channelId: string;
  search: Pick<URLSearchParams, 'toString'>;
}) {
  const [open, setOpen] = useState(false);
  const { data } = usePinnedMessages(channelId);
  const unpin = useUnpinMessage(channelId);
  const pins = data?.data ?? [];
  const canManageMessages = data?.canManageMessages ?? false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
            >
              <Pin className={pins.length > 0 ? 'fill-current' : undefined} />
              {pins.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {pins.length}
                </span>
              ) : null}
              <span className="sr-only">Pinned messages</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {pins.length
            ? `Pinned messages (${pins.length})`
            : 'Pinned messages'}
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <PopoverHeader className="border-b px-3 py-2">
          <PopoverTitle>Pinned messages</PopoverTitle>
        </PopoverHeader>

        {pins.length === 0 ? (
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Pin />
              </EmptyMedia>
              <EmptyTitle>No pinned messages</EmptyTitle>
              <EmptyDescription>
                Pin a message from the hover menu to keep it here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="flex flex-col p-1">
              {pins.map((pin) => (
                <PinnedMessageRow
                  key={pin.id}
                  pin={pin}
                  href={pinnedMessageHref(pin.messageId, search)}
                  canUnpin={canManageMessages}
                  onJump={() => setOpen(false)}
                  onUnpin={() => unpin.mutate(pin.messageId)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PinnedMessageRow({
  pin,
  href,
  canUnpin,
  onJump,
  onUnpin,
}: {
  pin: PinnedMessage;
  href: string;
  canUnpin: boolean;
  onJump: () => void;
  onUnpin: () => void;
}) {
  const preview = pinPreview(pin.message.content, pin.message.attachments.length);

  return (
    <div className="flex items-start gap-1 rounded-md hover:bg-accent">
      <Link
        href={href}
        onClick={onJump}
        className="min-w-0 flex-1 px-2 py-2 text-left"
      >
        <p className="truncate text-sm font-medium">
          {pin.message.sender?.name ?? 'Unknown'}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{preview}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pinned by {pin.pinnedByUser?.name ?? 'Unknown'} ·{' '}
          {formatPinnedAt(pin.pinnedAt)}
        </p>
      </Link>
      {canUnpin ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mt-1 shrink-0"
          onClick={onUnpin}
        >
          <PinOff />
          <span className="sr-only">Unpin message</span>
        </Button>
      ) : null}
    </div>
  );
}

function pinPreview(content: string, attachmentCount: number): string {
  const trimmed = content.trim();
  if (trimmed) return trimmed;
  if (attachmentCount === 1) return '1 attachment';
  if (attachmentCount > 1) return `${attachmentCount} attachments`;
  return 'Empty message';
}

function formatPinnedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
