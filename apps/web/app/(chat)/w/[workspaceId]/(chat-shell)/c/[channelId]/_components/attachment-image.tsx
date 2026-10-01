'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { attachmentFileUrl } from '../_helpers/attachment-file-url';
import {
  LIGHTBOX_GALLERY_PARAM,
  LIGHTBOX_PARAM,
} from '../_helpers/lightbox-params';
import type { MessageAttachment } from '../_libs/messages';

type AttachmentImageProps = {
  attachment: MessageAttachment;
  size?: 'default' | 'sm';
  /** Ids of the sibling images the lightbox can step through, in order. */
  gallery?: string[];
};

export function AttachmentImage({
  attachment,
  size = 'default',
  gallery,
}: AttachmentImageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const compact = size === 'sm';

  const openLightbox = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(LIGHTBOX_PARAM, attachment.id);
    if (gallery && gallery.length > 1) {
      params.set(LIGHTBOX_GALLERY_PARAM, gallery.join(','));
    } else {
      params.delete(LIGHTBOX_GALLERY_PARAM);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [attachment.id, gallery, pathname, router, searchParams]);

  // The default size reserves a fixed-height slot before the image loads.
  // Attachments carry no dimensions, so an unloaded <img> would be ~0px tall
  // and then grow, shifting the virtualized message list after the initial
  // scroll-to-bottom has already settled.
  return (
    <button
      type="button"
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
