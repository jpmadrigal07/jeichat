'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { attachmentFileUrl } from '../_helpers/attachment-file-url';

export function ChannelAttachmentLightbox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const attachmentId = searchParams.get('lightbox');
  const isOpen = !!attachmentId;

  const closeLightbox = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('lightbox');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeLightbox()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-zinc-950 p-0 text-zinc-100 ring-0 shadow-2xl sm:h-auto sm:w-full sm:max-w-[min(90vw,1200px)] sm:rounded-xl sm:p-4"
      >
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 z-20 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100 sm:top-4 sm:right-4"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
        <DialogTitle className="sr-only">Attachment preview</DialogTitle>
        {attachmentId ? (
          /* Pinch / double-tap / wheel zoom — page zoom is disabled in the root viewport. Keyed so each image opens unzoomed. */
          <TransformWrapper
            key={attachmentId}
            minScale={1}
            maxScale={6}
            centerZoomedOut
            doubleClick={{ mode: 'toggle', step: 1.5 }}
          >
            <TransformComponent
              wrapperClass="size-full! min-h-0 flex-1 touch-none sm:h-[85vh]!"
              contentClass="size-full!"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachmentFileUrl(attachmentId)}
                alt="Attachment preview"
                className="size-full object-contain"
              />
            </TransformComponent>
          </TransformWrapper>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
