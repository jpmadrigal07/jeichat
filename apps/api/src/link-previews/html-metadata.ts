export type PageImage = {
  url: string;
  type: string | null;
  width: number | null;
  height: number | null;
};

export type PageMetadata = {
  title: string | null;
  description: string | null;
  siteName: string | null;
  ogType: string | null;
  twitterCard: string | null;
  hasVideo: boolean;
  images: PageImage[];
};

const MAX_TAG_LENGTH = 4096;
const MAX_IMAGE_URL_LENGTH = 2048;
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(value: string): string {
  return value.replace(
    /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]{2,6}));/gi,
    (match, decimal?: string, hex?: string, name?: string) => {
      if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? match;
      const codePoint = decimal ? parseInt(decimal, 10) : parseInt(hex!, 16);
      if (codePoint === 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    },
  );
}

export function cleanText(value: string | null | undefined, max: number) {
  if (!value) return null;
  const text = decodeEntities(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Yields each `<meta ...>` tag. Hand-rolled instead of a regex so a hostile
 * page cannot trigger catastrophic backtracking: a tag is abandoned at the
 * first raw `<` outside quotes or after MAX_TAG_LENGTH characters.
 */
function* metaTags(html: string): Generator<string> {
  const lower = html.toLowerCase();
  let from = 0;
  for (;;) {
    const start = lower.indexOf('<meta', from);
    if (start === -1) return;
    from = start + 5;
    const next = html[start + 5];
    if (next !== undefined && !/[\s/]/.test(next)) continue;

    let quote: string | null = null;
    const limit = Math.min(html.length, start + MAX_TAG_LENGTH);
    for (let index = start + 5; index < limit; index += 1) {
      const char = html[index];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '<') {
        break;
      } else if (char === '>') {
        yield html.slice(start, index + 1);
        from = index + 1;
        break;
      }
    }
  }
}

const ATTRIBUTE_PATTERN =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const body = tag.slice(5, tag.endsWith('>') ? -1 : undefined);
  for (const match of body.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1].toLowerCase();
    if (attributes.has(name)) continue;
    attributes.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

/** Resolves `value` against `base`, keeping only http(s) URLs of sane length. */
export function resolveHttpUrl(value: string, base: string): string | null {
  const trimmed = decodeEntities(value).trim();
  if (!trimmed || trimmed.length > MAX_IMAGE_URL_LENGTH) return null;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Mixed content is blocked on https pages, and nearly every host serves https.
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.toString();
  } catch {
    return null;
  }
}

function toDimension(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 20_000
    ? parsed
    : null;
}

/** Extracts Open Graph / Twitter card / basic metadata from the head of a page. */
export function parseHtmlMetadata(html: string, baseUrl: string): PageMetadata {
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd === -1 ? html : html.slice(0, headEnd);

  const og = new Map<string, string>();
  const twitter = new Map<string, string>();
  let description: string | undefined;
  const images: PageImage[] = [];
  const twitterImages: string[] = [];
  let hasVideo = false;

  for (const tag of metaTags(head)) {
    const attributes = parseAttributes(tag);
    const key = (
      attributes.get('property') ??
      attributes.get('name') ??
      attributes.get('itemprop') ??
      ''
    ).toLowerCase();
    const content = attributes.get('content');
    if (!key || content === undefined) continue;

    switch (key) {
      case 'og:image':
      case 'og:image:url': {
        const url = resolveHttpUrl(content, baseUrl);
        if (url) images.push({ url, type: null, width: null, height: null });
        break;
      }
      case 'og:image:secure_url': {
        const url = resolveHttpUrl(content, baseUrl);
        const last = images[images.length - 1];
        if (url && last) last.url = url;
        else if (url) images.push({ url, type: null, width: null, height: null });
        break;
      }
      case 'og:image:type': {
        const last = images[images.length - 1];
        if (last) last.type = content.trim().toLowerCase() || null;
        break;
      }
      case 'og:image:width': {
        const last = images[images.length - 1];
        if (last) last.width = toDimension(content);
        break;
      }
      case 'og:image:height': {
        const last = images[images.length - 1];
        if (last) last.height = toDimension(content);
        break;
      }
      case 'twitter:image':
      case 'twitter:image:src': {
        const url = resolveHttpUrl(content, baseUrl);
        if (url) twitterImages.push(url);
        break;
      }
      case 'og:video':
      case 'og:video:url':
      case 'og:video:secure_url':
        hasVideo = true;
        break;
      case 'description':
        description ??= content;
        break;
      default:
        if (key.startsWith('og:') && !og.has(key)) og.set(key, content);
        else if (key.startsWith('twitter:') && !twitter.has(key)) {
          twitter.set(key, content);
        }
    }
  }

  if (images.length === 0) {
    for (const url of twitterImages) {
      images.push({ url, type: null, width: null, height: null });
    }
  }

  const titleTag = /<title[^>]*>([\s\S]{0,1000}?)<\/title>/i.exec(head)?.[1];

  return {
    title: cleanText(
      og.get('og:title') ?? twitter.get('twitter:title') ?? titleTag,
      200,
    ),
    description: cleanText(
      og.get('og:description') ?? twitter.get('twitter:description') ?? description,
      400,
    ),
    siteName: cleanText(og.get('og:site_name'), 100),
    ogType: og.get('og:type')?.trim().toLowerCase() ?? null,
    twitterCard: twitter.get('twitter:card')?.trim().toLowerCase() ?? null,
    hasVideo,
    images,
  };
}
