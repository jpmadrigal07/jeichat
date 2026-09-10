'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
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
        className="flex max-w-[90vw] flex-col overflow-hidden rounded-xl border-0 bg-zinc-950 p-2 text-zinc-100 ring-0 shadow-2xl sm:max-w-[min(90vw,1200px)] sm:p-4"
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
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={attachmentFileUrl(attachmentId)}
            alt="Attachment preview"
            className="max-h-[85vh] w-full object-contain"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
