'use client';

import { Suspense, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  ATTACHMENT_ACCEPT_ATTR,
  countAttachmentKinds,
  MAX_DOCUMENT_ATTACHMENTS,
  MAX_IMAGE_ATTACHMENTS,
} from '@/lib/attachment-mime';
import { MAX_TICKET_DESCRIPTION_LENGTH } from '../_helpers/ticket-fields';
import { useChannels, useCreateThread } from '../_hooks/use-channels';
import { useWorkspaceMembers } from '../_hooks/use-workspaces';
import { taggableTicketsForChannel, taggableChannels } from '../_helpers/ticket-mentions';
import { useAttachmentUploads } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_hooks/use-attachment-uploads';
import { AttachmentPreviewTray } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_components/attachment-preview-tray';
import { MarkdownWritePreview } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_components/markdown-write-preview';

export const CREATE_THREAD_PARAM = 'create-thread';
export const CREATE_STATUS_PARAM = 'create-status';

export function createThreadHref(
  channelId: string,
  options?: {
    view?: string;
    layout?: string;
    status?: string;
    search?: Pick<URLSearchParams, 'toString'>;
  },
) {
  const params = new URLSearchParams(options?.search?.toString() ?? '');
  if (options?.view) params.set('view', options.view);
  if (options?.layout === 'list') params.set('layout', 'list');
  else if (options?.layout === 'card') params.delete('layout');
  params.set(CREATE_THREAD_PARAM, channelId);
  if (options?.status) params.set(CREATE_STATUS_PARAM, options.status);
  else params.delete(CREATE_STATUS_PARAM);
  return `?${params.toString()}`;
}

export function CreateThreadDialogHost({
  workspaceId,
}: {
  workspaceId: string;
}) {
  return (
    <Suspense fallback={null}>
      <CreateThreadDialogFromSearch workspaceId={workspaceId} />
    </Suspense>
  );
}

function CreateThreadDialogFromSearch({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const channelId = searchParams.get(CREATE_THREAD_PARAM);
  const status = searchParams.get(CREATE_STATUS_PARAM);

  return (
    <CreateThreadDialog
      workspaceId={workspaceId}
      channelId={channelId}
      status={status}
      open={!!channelId}
      onOpenChange={(open) => {
        if (!open) {
          const params = new URLSearchParams(searchParams.toString());
          params.delete(CREATE_THREAD_PARAM);
          params.delete(CREATE_STATUS_PARAM);
          const query = params.toString();
          router.replace(query ? `${pathname}?${query}` : pathname);
        }
      }}
    />
  );
}

function CreateThreadDialog({
  workspaceId,
  channelId,
  status,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  channelId: string | null;
  status: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createThread = useCreateThread(workspaceId);
  const { data: channels } = useChannels(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const parentChannel = channels?.find((channel) => channel.id === channelId);
  const tickets = taggableTicketsForChannel(channels ?? [], parentChannel);
  const hashChannels = taggableChannels(channels ?? []);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploads = useAttachmentUploads(channelId ?? '');
  const uploadCounts = countAttachmentKinds(
    uploads.items.map((item) => item.file),
  );
  const atUploadLimit =
    uploadCounts.images >= MAX_IMAGE_ATTACHMENTS &&
    uploadCounts.documents >= MAX_DOCUMENT_ATTACHMENTS;

  function handleOpenChange(next: boolean) {
    if (!next) uploads.reset();
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!channelId) return;

    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const description =
      (formData.get('description') as string).trim() || undefined;
    if (!name) return;

    createThread.mutate(
      {
        channelId,
        name,
        description,
        attachmentIds: uploads.readyServerIds,
        status: status ?? undefined,
      },
      {
        onSuccess: (thread) => {
          uploads.reset();
          router.push(`/w/${workspaceId}/c/${thread.id}`);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a ticket</DialogTitle>
          <DialogDescription>
            Give it a title, optional description, and files.
          </DialogDescription>
        </DialogHeader>
        <form
          key={channelId ?? 'closed'}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="thread-title">Title</Label>
            <Input
              id="thread-title"
              name="name"
              placeholder="e.g. Fix login timeout on staging"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="thread-description">Description</Label>
            <MarkdownWritePreview
              id="thread-description"
              name="description"
              placeholder="What is this ticket about? Use @ and # to mention people, tickets, or messages."
              maxLength={MAX_TICKET_DESCRIPTION_LENGTH}
              rows={4}
              workspaceId={workspaceId}
              members={members}
              tickets={tickets}
              channels={hashChannels}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Files</Label>
            <AttachmentPreviewTray
              items={uploads.items}
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
                uploads.addFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={!channelId || atUploadLimit}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip data-icon="inline-start" />
              Add files
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                !channelId ||
                createThread.isPending ||
                uploads.isAnyUploading ||
                uploads.items.some((item) => item.status === 'error')
              }
            >
              {createThread.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
