'use client';

import { useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ATTACHMENT_ACCEPT_ATTR,
  MAX_THREAD_ATTACHMENTS,
} from '@/lib/attachment-mime';
import { cn } from '@/lib/utils';
import { useUpdateChannel } from '@chat/_hooks/use-channels';
import type { Channel } from '@chat/_libs/channels';
import {
  ticketDisplayId,
  ticketPrefixOf,
} from '@chat/_helpers/ticket-fields';
import { useAttachmentUploads } from '../_hooks/use-attachment-uploads';
import { AttachmentPreviewTray } from './attachment-preview-tray';
import { ChannelDropZone } from './channel-drop-overlay';
import { MessageAttachments } from './message-attachments';
import { TicketProperties } from './ticket-properties';

const TICKET_DETAILS_PARAM = 'details';
const TICKET_DETAILS_COLLAPSED = 'collapsed';

export function ThreadIssueHeader({
  workspaceId,
  channel,
  parentChannel,
}: {
  workspaceId: string;
  channel: Channel;
  parentChannel?: Channel;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeByServerIdRef = useRef<(id: string) => void>(() => undefined);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const detailsOpen =
    searchParams.get(TICKET_DETAILS_PARAM) !== TICKET_DETAILS_COLLAPSED;
  const updateChannel = useUpdateChannel(workspaceId);
  const uploads = useAttachmentUploads(channel.id, {
    onUploaded: (attachmentId) => {
      updateChannel.mutate(
        {
          channelId: channel.id,
          addAttachmentIds: [attachmentId],
        },
        {
          onSuccess: () => removeByServerIdRef.current(attachmentId),
        },
      );
    },
  });
  removeByServerIdRef.current = uploads.removeByServerId;

  const savedAttachments = channel.attachments ?? [];
  const savedIds = new Set(savedAttachments.map((attachment) => attachment.id));
  const pendingItems = uploads.items.filter(
    (item) => !item.serverId || !savedIds.has(item.serverId),
  );
  const remainingSlots =
    MAX_THREAD_ATTACHMENTS - savedAttachments.length - pendingItems.length;

  function setDetailsOpen(open: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (open) params.delete(TICKET_DETAILS_PARAM);
    else params.set(TICKET_DETAILS_PARAM, TICKET_DETAILS_COLLAPSED);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function saveTitle(value: string, input: HTMLInputElement) {
    const name = value.trim();
    if (!name) {
      input.value = channel.name;
      toast.error('Ticket title is required');
      return;
    }
    if (name === channel.name) return;
    updateChannel.mutate({ channelId: channel.id, name });
  }

  function saveDescription(value: string) {
    const description = value.trim() || null;
    if (description === (channel.description ?? null)) return;
    updateChannel.mutate({ channelId: channel.id, description });
  }

  function addFiles(files: File[]) {
    if (remainingSlots <= 0) {
      toast.error(`Max ${MAX_THREAD_ATTACHMENTS} attachments per ticket`);
      return;
    }
    if (files.length > remainingSlots) {
      toast.error(`Max ${MAX_THREAD_ATTACHMENTS} attachments per ticket`);
    }
    uploads.addFiles(files.slice(0, Math.max(remainingSlots, 0)));
  }

  function removeSaved(attachmentId: string) {
    uploads.removeByServerId(attachmentId);
    updateChannel.mutate({
      channelId: channel.id,
      removeAttachmentIds: [attachmentId],
    });
  }

  return (
    <Collapsible
      open={detailsOpen}
      onOpenChange={setDetailsOpen}
      className="shrink-0 border-b"
    >
      <div
        className={cn(
          'relative px-4',
          detailsOpen ? 'py-4' : 'py-2',
        )}
      >
        <ChannelDropZone
          onAdd={addFiles}
          className="relative flex w-full flex-col gap-3 pr-10"
        >
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,0.35fr)] items-start gap-x-4">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="min-w-0">
                {channel.ticketNumber ? (
                  <p className="text-xs text-muted-foreground">
                    {ticketDisplayId(
                      ticketPrefixOf(parentChannel ?? channel),
                      channel.ticketNumber,
                    )}
                  </p>
                ) : null}
                <Input
                  key={`title-${channel.id}-${channel.name}`}
                  aria-label="Ticket title"
                  defaultValue={channel.name}
                  className="h-auto border-transparent bg-transparent px-0 py-1 text-lg font-semibold shadow-none md:text-lg dark:bg-transparent"
                  onBlur={(e) =>
                    saveTitle(e.currentTarget.value, e.currentTarget)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      e.currentTarget.value = channel.name;
                      e.currentTarget.blur();
                    }
                  }}
                />
              </div>
              <CollapsibleContent>
                <div className="max-h-72 overflow-y-auto">
                  <div className="flex flex-col gap-3 pr-3">
                    <Textarea
                      key={`description-${channel.id}-${channel.description ?? ''}`}
                      aria-label="Ticket description"
                      defaultValue={channel.description ?? ''}
                      placeholder="Add description..."
                      className="min-h-16 border-transparent bg-transparent px-0 text-sm text-muted-foreground shadow-none dark:bg-transparent"
                      onBlur={(e) => saveDescription(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.currentTarget.value = channel.description ?? '';
                          e.currentTarget.blur();
                        }
                      }}
                    />
                    <MessageAttachments
                      attachments={savedAttachments}
                      onRemove={removeSaved}
                      compact
                    />
                    <AttachmentPreviewTray
                      items={pendingItems}
                      onRemove={uploads.remove}
                      onRetry={uploads.retry}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      hidden
                      accept={ATTACHMENT_ACCEPT_ATTR}
                      onChange={(e) => {
                        addFiles(Array.from(e.target.files ?? []));
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      disabled={remainingSlots <= 0}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip data-icon="inline-start" />
                      Add files
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
            <CollapsibleContent>
              <TicketProperties
                workspaceId={workspaceId}
                channel={channel}
              />
            </CollapsibleContent>
          </div>
        </ChannelDropZone>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-4 top-3 z-10"
              aria-expanded={detailsOpen}
              aria-label={
                detailsOpen ? 'Minimize ticket' : 'Expand ticket'
              }
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              <ChevronDown
                className={cn(
                  'transition-transform',
                  detailsOpen && 'rotate-180',
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {detailsOpen ? 'Minimize ticket' : 'Expand ticket'}
          </TooltipContent>
        </Tooltip>
      </div>
    </Collapsible>
  );
}
