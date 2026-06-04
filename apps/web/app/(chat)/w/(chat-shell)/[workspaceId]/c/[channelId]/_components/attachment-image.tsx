'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAttachmentDownloadUrl } from '../_hooks/use-attachment-download-url';
import type { MessageAttachment } from '../_libs/messages';

type AttachmentImageProps = {
  attachment: MessageAttachment;
};

export function AttachmentImage({ attachment }: AttachmentImageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
      <div className="relative flex max-h-[300px] max-w-[400px] items-center justify-center rounded-lg border bg-muted/50 aspect-video min-w-[120px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="relative block max-w-[400px] overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={openLightbox}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.url}
        alt={attachment.filename}
        className="max-h-[300px] max-w-[400px] object-contain"
      />
    </button>
  );
}
