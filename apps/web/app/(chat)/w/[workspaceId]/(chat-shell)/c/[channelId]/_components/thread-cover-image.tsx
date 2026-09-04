'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAttachmentDownloadUrl } from '../_hooks/use-attachment-download-url';
import type { ThreadAttachment } from '@chat/_libs/channels';

export function ThreadCoverImage({
  attachment,
  className,
}: {
  attachment: ThreadAttachment;
  className?: string;
}) {
  const { data, isLoading, isError } = useAttachmentDownloadUrl(attachment.id);

  if (isError) {
    return (
      <div
        className={cn(
          'flex aspect-video items-center justify-center bg-muted text-xs text-muted-foreground',
          className,
        )}
      >
        Failed to load image
      </div>
    );
  }

  if (isLoading || !data?.url) {
    return (
      <div
        className={cn(
          'flex aspect-video items-center justify-center bg-muted',
          className,
        )}
      >
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={data.url}
      alt={attachment.filename}
      className={cn('aspect-video w-full object-cover', className)}
    />
  );
}
