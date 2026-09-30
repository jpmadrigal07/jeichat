import { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';

const DISALLOWED_TAGS = new Set([
  'iframe',
  'script',
  'style',
  'form',
  'button',
  'link',
  'meta',
  'video',
  'audio',
  'source',
  'track',
  'object',
  'embed',
]);

const SAFE_HREF_PROTOCOLS = ['http', 'https', 'mailto'] as const;
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export const chatSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (tag) => !DISALLOWED_TAGS.has(tag),
  ),
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'title', 'className'],
    span: ['className'],
    pre: ['className'],
    img: ['alt'],
    '*': (defaultSchema.attributes?.['*'] ?? []).filter(
      (attribute) => attribute !== 'id' && attribute !== 'style',
    ),
  },
  protocols: {
    ...defaultSchema.protocols,
    href: [...SAFE_HREF_PROTOCOLS],
    cite: ['http', 'https'],
  },
};

export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return SAFE_URL_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function transformChatUrl(href: string): string {
  return isSafeHref(href) ? href : '';
}

const ATTACHMENT_IMAGE_SRC_RE =
  /^attachment:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ATTACHMENT_PATH_SRC_RE =
  /^\/attachments\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTicketAttachmentImageSrc(src: string): boolean {
  const value = src.trim();
  return (
    ATTACHMENT_IMAGE_SRC_RE.test(value) || ATTACHMENT_PATH_SRC_RE.test(value)
  );
}

export function transformTicketImageUrl(src: string): string {
  return isTicketAttachmentImageSrc(src) ? src.trim() : '';
}

export const ticketSanitizeSchema: SanitizeSchema = {
  ...chatSanitizeSchema,
  attributes: {
    ...chatSanitizeSchema.attributes,
    img: ['alt', 'src'],
  },
  protocols: {
    ...chatSanitizeSchema.protocols,
    src: [...(chatSanitizeSchema.protocols?.src ?? []), 'attachment'],
  },
};
