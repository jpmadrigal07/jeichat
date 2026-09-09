'use client';

import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttachmentDownloadUrl } from '../_hooks/use-attachment-download-url';
import type { MessageAttachment } from '../_libs/messages';
import { cn } from '@/lib/utils';
import { AttachmentFileCard } from './attachment-file-card';
import { AttachmentImage } from './attachment-image';

type MessageAttachmentsProps = {
  attachments: MessageAttachment[];
  onRemove?: (attachmentId: string) => void;
  compact?: boolean;
  className?: string;
};

function AttachmentVideo({ attachment }: { attachment: MessageAttachment }) {
  const { data, isLoading, isError } = useAttachmentDownloadUrl(
    attachment.id,
    true,
  );

  if (isError) {
    return (
      <p className="text-xs text-destructive">Failed to load video</p>
    );
  }

  if (isLoading || !data?.url) {
    return (
      <div className="flex max-w-[400px] items-center justify-center rounded-lg border bg-muted/50 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <video
      controls
      preload="metadata"
      src={data.url}
      className="max-h-[300px] max-w-[400px] rounded-lg"
    />
  );
}

function AttachmentAudio({ attachment }: { attachment: MessageAttachment }) {
  const { data, isLoading, isError } = useAttachmentDownloadUrl(
    attachment.id,
    true,
  );

  if (isError) {
    return (
      <p className="text-xs text-destructive">Failed to load audio</p>
    );
  }

  if (isLoading || !data?.url) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading audio…</span>
      </div>
    );
  }

  return <audio controls src={data.url} className="max-w-full" />;
}

function AttachmentItem({
  attachment,
  compact,
}: {
  attachment: MessageAttachment;
  compact?: boolean;
}) {
  const { contentType } = attachment;

  if (contentType.startsWith('image/')) {
    return (
      <AttachmentImage
        attachment={attachment}
        size={compact ? 'sm' : 'default'}
      />
    );
  }
  if (!compact && contentType.startsWith('video/')) {
    return <AttachmentVideo attachment={attachment} />;
  }
  if (!compact && contentType.startsWith('audio/')) {
    return <AttachmentAudio attachment={attachment} />;
  }
  return <AttachmentFileCard attachment={attachment} className={compact ? 'w-full max-w-none' : undefined} />;
}

function RemovableAttachment({
  id,
  filename,
  onRemove,
  className,
  children,
}: {
  id: string;
  filename: string;
  onRemove?: (attachmentId: string) => void;
  className?: string;
  children: ReactNode;
}) {
  if (!onRemove) return children;

  return (
    <div className={cn('group relative w-fit', className)}>
      {children}
      <Button
        type="button"
        size="icon-xs"
        variant="secondary"
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
        aria-label={`Remove ${filename}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove(id);
        }}
      >
        <X />
      </Button>
    </div>
  );
}

export function MessageAttachments({
  attachments,
  onRemove,
  compact,
  className,
}: MessageAttachmentsProps) {
  if (!attachments.length) return null;

  const images = attachments.filter((a) =>
    a.contentType.startsWith('image/'),
  );
  const others = attachments.filter(
    (a) => !a.contentType.startsWith('image/'),
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {images.map((attachment) => (
            <RemovableAttachment
              key={attachment.id}
              id={attachment.id}
              filename={attachment.filename}
              onRemove={onRemove}
            >
              <AttachmentImage
                attachment={attachment}
                size={compact ? 'sm' : 'default'}
              />
            </RemovableAttachment>
          ))}
        </div>
      ) : null}
      {others.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {others.map((attachment) => (
            <RemovableAttachment
              key={attachment.id}
              id={attachment.id}
              filename={attachment.filename}
              onRemove={onRemove}
              className={compact ? 'w-full' : undefined}
            >
              <AttachmentItem attachment={attachment} compact={compact} />
            </RemovableAttachment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
