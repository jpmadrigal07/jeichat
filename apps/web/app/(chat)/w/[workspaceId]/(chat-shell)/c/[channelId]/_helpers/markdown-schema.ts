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
