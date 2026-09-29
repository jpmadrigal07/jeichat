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

  // The default size reserves a fixed-height slot before the image loads.
  // Attachments carry no dimensions, so an unloaded <img> would be ~0px tall
  // and then grow, shifting the virtualized message list after the initial
  // scroll-to-bottom has already settled.
  return (
    <button
      type="button"
      className={cn(
        'relative overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        compact
          ? 'block size-16'
          : 'flex h-40 min-w-24 max-w-full items-center justify-center bg-muted sm:max-w-60',
      )}
      onClick={openLightbox}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachmentFileUrl(attachment.id)}
        alt={attachment.filename}
        className={cn(
          'text-xs text-muted-foreground',
          compact
            ? 'size-full object-cover'
            : 'max-h-full max-w-full object-contain',
        )}
      />
    </button>
  );
}
