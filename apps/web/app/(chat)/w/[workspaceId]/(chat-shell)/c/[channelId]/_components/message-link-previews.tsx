'use client';

import type { SyntheticEvent } from 'react';
import { X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { mediaBoxSize, thumbnailRatio } from '../_helpers/link-preview-layout';
import { useRemoveMessageLinkPreviews } from '../_hooks/use-link-previews';
import type { MessageLinkPreview } from '../_libs/messages';

type MessageLinkPreviewsProps = {
  previews: MessageLinkPreview[];
  className?: string;
  /** Set for the sender, who may remove every embed on their message. */
  removable?: { channelId: string; messageId: string };
};

const linkProps = {
  target: '_blank',
  rel: 'noopener noreferrer nofollow',
} as const;

// A thumbnail that fails to load (hotlink blocked, 404) would leave an empty
// box, so the slot hides itself instead.
function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>) {
  const slot = event.currentTarget.closest('[data-preview-slot]');
  (slot ?? event.currentTarget).classList.add('hidden');
}

/**
 * Space for bare media is reserved before the image loads: the message list is
 * virtualized, so a row that grows afterwards shifts everything below it. With
 * known dimensions that is an explicit width plus aspect ratio; without them it
 * is the same fixed-height slot attachments use.
 */
function LinkPreviewMedia({ preview }: { preview: MessageLinkPreview }) {
  if (!preview.imageUrl) return null;
  const size = mediaBoxSize(preview);
  const box = size
    ? {
        width: size.width,
        aspectRatio: `${preview.imageWidth} / ${preview.imageHeight}`,
      }
    : null;

  return (
    <a
      {...linkProps}
      href={preview.url}
      data-preview-slot
      style={box ?? undefined}
      className={cn(
        'block max-w-full overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !box && 'flex h-40 min-w-24 items-center justify-center sm:max-w-60',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview.imageUrl}
        alt={preview.title ?? 'Linked image'}
        width={preview.imageWidth ?? undefined}
        height={preview.imageHeight ?? undefined}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(
          'object-contain',
          box ? 'size-full' : 'max-h-full max-w-full',
        )}
        onError={hideBrokenImage}
      />
    </a>
  );
}

function LinkPreviewCard({ preview }: { preview: MessageLinkPreview }) {
  return (
    <Card
      size="sm"
      className="w-full max-w-md border-l-4 border-l-primary/60"
    >
      <CardContent>
        <a
          {...linkProps}
          href={preview.url}
          className="flex min-w-0 flex-col gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {preview.siteName ? (
            <span className="truncate text-xs text-muted-foreground">
              {preview.siteName}
            </span>
          ) : null}
          <span className="line-clamp-2 text-sm font-semibold text-primary hover:underline">
            {preview.title ?? preview.url}
          </span>
          {preview.description ? (
            <span className="line-clamp-3 text-xs text-muted-foreground">
              {preview.description}
            </span>
          ) : null}
          {preview.imageUrl ? (
            <span
              data-preview-slot
              className="mt-1 block overflow-hidden rounded-md bg-muted"
              style={{ aspectRatio: thumbnailRatio(preview) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
                onError={hideBrokenImage}
              />
            </span>
          ) : null}
        </a>
      </CardContent>
    </Card>
  );
}

/**
 * Discord-style dismiss for a message's embeds. A plain click asks first;
 * holding Shift removes them straight away.
 */
function RemoveEmbedsButton({
  channelId,
  messageId,
}: {
  channelId: string;
  messageId: string;
}) {
  const remove = useRemoveMessageLinkPreviews(channelId);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="secondary"
          aria-label="Remove embeds"
          title="Remove embeds (hold Shift to skip the prompt)"
          disabled={remove.isPending}
          // Hover reveals it on desktop; touch screens have no hover.
          className="absolute top-1.5 right-1.5 z-10 size-6 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover/preview:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 data-[state=open]:opacity-100"
          onClick={(event) => {
            if (!event.shiftKey) return;
            event.preventDefault();
            remove.mutate(messageId);
          }}
        >
          <X className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove embeds?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes all embeds on this message for everyone. Hold Shift
            when clicking the X to skip this prompt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => remove.mutate(messageId)}
          >
            Remove embeds
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MessageLinkPreviews({
  previews,
  className,
  removable,
}: MessageLinkPreviewsProps) {
  if (!previews.length) return null;

  return (
    <div className={cn('flex min-w-0 flex-col items-start gap-2', className)}>
      {previews.map((preview) => (
        <div
          key={preview.id}
          className={cn(
            'group/preview relative max-w-full',
            preview.kind === 'link' ? 'w-full max-w-md' : 'w-fit',
          )}
        >
          {preview.kind === 'image' ? (
            <LinkPreviewMedia preview={preview} />
          ) : (
            <LinkPreviewCard preview={preview} />
          )}
          {removable ? (
            <RemoveEmbedsButton
              channelId={removable.channelId}
              messageId={removable.messageId}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
