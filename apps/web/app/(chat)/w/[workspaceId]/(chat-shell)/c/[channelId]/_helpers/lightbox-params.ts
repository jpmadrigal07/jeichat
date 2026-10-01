/** Attachment id currently shown in the lightbox. */
export const LIGHTBOX_PARAM = 'lightbox';

/** Comma-separated ids of the images the lightbox can step through. */
export const LIGHTBOX_GALLERY_PARAM = 'lightboxGallery';

/** Ordered ids the lightbox can step through; always contains `current`. */
export function lightboxGallery(
  searchParams: Pick<URLSearchParams, 'get'>,
  current: string,
): string[] {
  const ids =
    searchParams.get(LIGHTBOX_GALLERY_PARAM)?.split(',').filter(Boolean) ?? [];
  return ids.includes(current) ? ids : [current];
}
