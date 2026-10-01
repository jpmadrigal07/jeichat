import { resolveHttpUrl, parseHtmlMetadata, type PageImage } from './html-metadata';
import type { FetchedDocument } from './safe-fetch';

export type ParsedLinkPreview = {
  kind: 'link' | 'image';
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
};

function isGif(image: PageImage): boolean {
  if (image.type === 'image/gif') return true;
  try {
    return new URL(image.url).pathname.toLowerCase().endsWith('.gif');
  } catch {
    return false;
  }
}

/**
 * Turns a fetched document into what the chat shows:
 * - a direct image link, or a GIF/video page such as Tenor or Giphy, renders
 *   the media itself (`kind: 'image'`);
 * - anything else with a title renders a card (`kind: 'link'`).
 * Returns null when there is nothing worth showing.
 */
export function buildLinkPreview(doc: FetchedDocument): ParsedLinkPreview | null {
  if (doc.kind === 'image') {
    const imageUrl = resolveHttpUrl(doc.finalUrl, doc.finalUrl);
    if (!imageUrl) return null;
    return {
      kind: 'image',
      title: null,
      description: null,
      siteName: null,
      imageUrl,
      imageWidth: null,
      imageHeight: null,
    };
  }

  const meta = parseHtmlMetadata(doc.html, doc.finalUrl);

  // A GIF only stands in for the whole page when the page is itself a media
  // page; an article that happens to use a GIF as its thumbnail stays a card.
  const gif = meta.images.find(isGif);
  const isMediaPage =
    meta.hasVideo ||
    meta.ogType?.startsWith('video') === true ||
    meta.twitterCard === 'player';
  if (gif && isMediaPage) {
    return {
      kind: 'image',
      title: meta.title,
      description: null,
      siteName: meta.siteName,
      imageUrl: gif.url,
      imageWidth: gif.width,
      imageHeight: gif.height,
    };
  }

  if (!meta.title) return null;

  const image = meta.images[0];
  return {
    kind: 'link',
    title: meta.title,
    description: meta.description,
    siteName: meta.siteName,
    imageUrl: image?.url ?? null,
    imageWidth: image?.width ?? null,
    imageHeight: image?.height ?? null,
  };
}
