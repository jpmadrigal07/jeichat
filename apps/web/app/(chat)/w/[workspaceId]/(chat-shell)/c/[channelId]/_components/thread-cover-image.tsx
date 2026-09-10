'use client';

import type { ThreadAttachment } from '@chat/_libs/channels';
import { cn } from '@/lib/utils';
import { attachmentFileUrl } from '../_helpers/attachment-file-url';

export function ThreadCoverImage({
  attachment,
  className,
}: {
  attachment: ThreadAttachment;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={attachmentFileUrl(attachment.id)}
      alt={attachment.filename}
      className={cn('aspect-video w-full object-cover', className)}
    />
  );
}
