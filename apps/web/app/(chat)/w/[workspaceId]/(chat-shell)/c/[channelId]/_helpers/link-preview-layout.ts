import type { MessageLinkPreview } from '../_libs/messages';

/** Tallest a bare GIF or image may render (Tailwind `max-h-72`). */
export const MEDIA_MAX_HEIGHT_PX = 288;
/** Fixed slot for bare media whose size is unknown; same as attachment images. */
export const MEDIA_UNSIZED_HEIGHT_PX = 160;

const PREVIEW_GAP_PX = 8;
/** Space between the message text and its first preview (`mt-1.5`). */
const PREVIEW_LIST_MARGIN_PX = 6;
/** Card padding, site name, title and description, without the thumbnail. */
const CARD_TEXT_HEIGHT_PX = 100;
/** Inner width of a card at its `max-w-md` cap, which its thumbnail fills. */
const CARD_THUMBNAIL_WIDTH_PX = 420;
const DEFAULT_THUMBNAIL_RATIO = 16 / 9;

/** Display size of bare media, or null when the page gave no dimensions. */
export function mediaBoxSize(
  preview: Pick<MessageLinkPreview, 'imageWidth' | 'imageHeight'>,
): { width: number; height: number } | null {
  const { imageWidth, imageHeight } = preview;
  if (!imageWidth || !imageHeight) return null;
  const scale = Math.min(1, MEDIA_MAX_HEIGHT_PX / imageHeight);
  return {
    width: Math.round(imageWidth * scale),
    height: Math.round(imageHeight * scale),
  };
}

/** Link-card thumbnails keep the page's own shape, within 1:1 and 2:1. */
export function thumbnailRatio(
  preview: Pick<MessageLinkPreview, 'imageWidth' | 'imageHeight'>,
): number {
  const { imageWidth, imageHeight } = preview;
  if (!imageWidth || !imageHeight) return DEFAULT_THUMBNAIL_RATIO;
  return Math.min(2, Math.max(1, imageWidth / imageHeight));
}

function previewHeight(preview: MessageLinkPreview): number {
  if (preview.kind === 'image') {
    if (!preview.imageUrl) return 0;
    return mediaBoxSize(preview)?.height ?? MEDIA_UNSIZED_HEIGHT_PX;
  }
  const thumbnail = preview.imageUrl
    ? Math.round(CARD_THUMBNAIL_WIDTH_PX / thumbnailRatio(preview))
    : 0;
  return CARD_TEXT_HEIGHT_PX + thumbnail;
}

/**
 * Height a message's previews add to its row. The virtualized message list sizes
 * rows from an estimate until they are measured; a row that is hundreds of pixels
 * taller than estimated makes the list drift while it settles at the bottom.
 */
export function estimateLinkPreviewsHeight(
  previews: MessageLinkPreview[] | undefined,
): number {
  const heights = (previews ?? [])
    .map(previewHeight)
    .filter((height) => height > 0);
  if (heights.length === 0) return 0;
  const total = heights.reduce((sum, height) => sum + height, 0);
  return (
    PREVIEW_LIST_MARGIN_PX + total + PREVIEW_GAP_PX * (heights.length - 1)
  );
}
