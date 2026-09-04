'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAttachmentDownloadUrl } from '../_hooks/use-attachment-download-url';
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
  const { data, isLoading, isError } = useAttachmentDownloadUrl(
    attachment.id,
    true,
  );

  const openLightbox = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lightbox', attachment.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [attachment.id, pathname, router, searchParams]);

  if (isError) {
    return (
      <p className="text-xs text-destructive">Failed to load image</p>
    );
  }

  if (isLoading || !data?.url) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center rounded-lg border bg-muted/50',
          compact ? 'size-16' : 'aspect-video min-w-30 max-h-40 max-w-60',
        )}
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        src={data.url}
        alt={attachment.filename}
        className={
          compact ? 'size-full object-cover' : 'max-h-40 max-w-60 object-contain'
        }
      />
    </button>
  );
}
