'use client';

import { useCallback, type KeyboardEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { isPreviousEntry } from '@chat/_helpers/navigation-history';
import { attachmentFileUrl } from '../_helpers/attachment-file-url';
import {
  LIGHTBOX_GALLERY_PARAM,
  LIGHTBOX_PARAM,
  lightboxGallery,
} from '../_helpers/lightbox-params';

export function ChannelAttachmentLightbox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const attachmentId = searchParams.get(LIGHTBOX_PARAM);
  const isOpen = !!attachmentId;
  const gallery = attachmentId
    ? lightboxGallery(searchParams, attachmentId)
    : [];
  const index = attachmentId ? gallery.indexOf(attachmentId) : -1;
  const previousId = index > 0 ? gallery[index - 1] : null;
  const nextId =
    index >= 0 && index < gallery.length - 1 ? gallery[index + 1] : null;

  const closeLightbox = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(LIGHTBOX_PARAM);
    params.delete(LIGHTBOX_GALLERY_PARAM);
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    // Opening pushed an entry — pop it so the preview doesn't stay in history
    // (the back button would reopen it). Deep links have nothing to pop.
    if (isPreviousEntry(href)) {
      router.back();
    } else {
      router.replace(href, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  // Replace rather than push so stepping through images keeps a single history
  // entry — closeLightbox's back() still lands on the page that opened it.
  const showAttachment = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(LIGHTBOX_PARAM, id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' && previousId) {
      event.preventDefault();
      showAttachment(previousId);
    } else if (event.key === 'ArrowRight' && nextId) {
      event.preventDefault();
      showAttachment(nextId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeLightbox()}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={handleKeyDown}
        className="flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-zinc-950 p-0 text-zinc-100 ring-0 shadow-2xl sm:h-[85vh] sm:w-full sm:max-w-[min(90vw,1200px)] sm:rounded-xl sm:p-4"
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
        {previousId ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 left-2 z-20 -translate-y-1/2 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100 sm:left-4"
            aria-label="Previous image"
            onClick={() => showAttachment(previousId)}
          >
            <ChevronLeft className="size-4" />
          </Button>
        ) : null}
        {nextId ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-2 z-20 -translate-y-1/2 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100 sm:right-4"
            aria-label="Next image"
            onClick={() => showAttachment(nextId)}
          >
            <ChevronRight className="size-4" />
          </Button>
        ) : null}
        <DialogTitle className="sr-only">Attachment preview</DialogTitle>
        {attachmentId ? (
          /* Pinch / double-tap / wheel zoom — page zoom is disabled in the root viewport. Keyed so each image opens unzoomed.
             The dialog needs a definite height at every breakpoint so flex-1 can bound the image; with an auto height, tall images overflow. */
          <TransformWrapper
            key={attachmentId}
            minScale={1}
            maxScale={6}
            centerZoomedOut
            doubleClick={{ mode: 'toggle', step: 1.5 }}
          >
            <TransformComponent
              wrapperClass="size-full! min-h-0 flex-1 touch-none"
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
