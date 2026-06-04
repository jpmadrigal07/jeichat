'use client';

import { Loader2 } from 'lucide-react';
import { useAttachmentDownloadUrl } from '../_hooks/use-attachment-download-url';
import type { MessageAttachment } from '../_libs/messages';
import { AttachmentFileCard } from './attachment-file-card';
import { AttachmentImage } from './attachment-image';

type MessageAttachmentsProps = {
  attachments: MessageAttachment[];
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

function AttachmentItem({ attachment }: { attachment: MessageAttachment }) {
  const { contentType } = attachment;

  if (contentType.startsWith('image/')) {
    return <AttachmentImage attachment={attachment} />;
  }
  if (contentType.startsWith('video/')) {
    return <AttachmentVideo attachment={attachment} />;
  }
  if (contentType.startsWith('audio/')) {
    return <AttachmentAudio attachment={attachment} />;
  }
  return <AttachmentFileCard attachment={attachment} />;
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments.length) return null;

  const images = attachments.filter((a) =>
    a.contentType.startsWith('image/'),
  );
  const others = attachments.filter(
    (a) => !a.contentType.startsWith('image/'),
  );

  return (
    <div className="mt-1 flex flex-col gap-2">
      {images.length > 0 && (
        <div
          className={
            images.length > 1
              ? 'grid max-w-[400px] grid-cols-2 gap-1'
              : 'flex flex-col gap-1'
          }
        >
          {images.map((attachment) => (
            <AttachmentImage key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
      {others.map((attachment) => (
        <AttachmentItem key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}
