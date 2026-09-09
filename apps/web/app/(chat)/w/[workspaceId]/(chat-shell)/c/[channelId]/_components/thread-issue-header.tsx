'use client';

import { useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ATTACHMENT_ACCEPT_ATTR,
  countAttachmentKinds,
  MAX_DOCUMENT_ATTACHMENTS,
  MAX_IMAGE_ATTACHMENTS,
} from '@/lib/attachment-mime';
import { cn } from '@/lib/utils';
import { useUpdateChannel } from '@chat/_hooks/use-channels';
import type { Channel } from '@chat/_libs/channels';
import type { MentionableMember } from '@chat/_helpers/mentions';
import {
  ticketDisplayId,
  ticketPrefixOf,
} from '@chat/_helpers/ticket-fields';
import type { TaggableTicket } from '@chat/_helpers/ticket-mentions';
import { useAttachmentUploads } from '../_hooks/use-attachment-uploads';
import { AttachmentPreviewTray } from './attachment-preview-tray';
import { ChannelDropZone } from './channel-drop-overlay';
import { MessageAttachments } from './message-attachments';
import { TicketDescription } from './ticket-description';
import { TicketProperties } from './ticket-properties';

const TICKET_DETAILS_PARAM = 'details';
const TICKET_DETAILS_COLLAPSED = 'collapsed';

export function ThreadIssueHeader({
  workspaceId,
  channel,
  parentChannel,
  members,
  tickets,
}: {
  workspaceId: string;
  channel: Channel;
  parentChannel?: Channel;
  members: MentionableMember[];
  tickets: TaggableTicket[];
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
  const pendingIds = new Set(
    uploads.items.flatMap((item) =>
      item.serverId ? [item.serverId] : [],
    ),
  );
  const savedOnly = savedAttachments.filter(
    (attachment) => !pendingIds.has(attachment.id),
  );
  const counts = countAttachmentKinds([
    ...savedOnly,
    ...pendingItems.map((item) => item.file),
  ]);
  const atUploadLimit =
    counts.images >= MAX_IMAGE_ATTACHMENTS &&
    counts.documents >= MAX_DOCUMENT_ATTACHMENTS;

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

  function saveDescription(description: string | null) {
    updateChannel.mutate({ channelId: channel.id, description });
  }

  function addFiles(files: File[]) {
    uploads.addFiles(files, countAttachmentKinds(savedOnly));
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
      <div className={cn(detailsOpen && 'max-h-72 overflow-y-auto')}>
        <ChannelDropZone
            onAdd={addFiles}
            className={cn(
              'relative flex w-full flex-col gap-3 px-4',
              detailsOpen ? 'py-4' : 'py-2',
            )}
          >
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
            <div
              className={cn(
                'grid w-full items-start gap-x-4',
                detailsOpen
                  ? 'grid-cols-1 sm:grid-cols-[2fr_1fr]'
                  : 'grid-cols-1',
              )}
            >
            <div className="flex min-w-0 flex-col gap-3">
              <div className="min-w-0 pr-10">
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
                <TicketDescription
                  key={channel.id}
                  workspaceId={workspaceId}
                  description={channel.description}
                  members={members}
                  tickets={tickets}
                  onSave={saveDescription}
                />
              </CollapsibleContent>
            </div>
            <CollapsibleContent className="min-w-0">
              <div className="flex min-w-0 flex-col gap-3">
                <TicketProperties
                  workspaceId={workspaceId}
                  channel={channel}
                  className="min-w-0"
                />
                <div className="flex min-w-0 flex-col gap-2 px-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Attachments
                  </p>
                  <div className="flex min-w-0 flex-col gap-2">
                    <MessageAttachments
                      attachments={savedAttachments}
                      onRemove={removeSaved}
                      compact
                    />
                    <AttachmentPreviewTray
                      items={pendingItems}
                      onRemove={uploads.remove}
                      onRetry={uploads.retry}
                      fullWidth
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
                      disabled={atUploadLimit}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip data-icon="inline-start" />
                      Add files
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
            </div>
          </ChannelDropZone>
      </div>
    </Collapsible>
  );
}
