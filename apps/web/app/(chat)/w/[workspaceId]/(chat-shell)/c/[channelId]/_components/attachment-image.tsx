'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { attachmentFileUrl } from '../_helpers/attachment-file-url';
import type { MessageAttachment } from '../_libs/messages';

type AttachmentImageProps = {
  attachment: MessageAttachment;
  size?: 'default' | 'sm';
};

export function AttachmentImage({
  attachment,
  size = 'default',
}: AttachmentImageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const compact = size === 'sm';

  const openLightbox = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lightbox', attachment.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [attachment.id, pathname, router, searchParams]);

  return (
    <button
      type="button"
      className={cn(
        'relative block overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        compact ? 'size-16' : 'max-h-40 max-w-60',
      )}
      onClick={openLightbox}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachmentFileUrl(attachment.id)}
        alt={attachment.filename}
        className={
          compact ? 'size-full object-cover' : 'max-h-40 max-w-60 object-contain'
        }
      />
    </button>
  );
}
