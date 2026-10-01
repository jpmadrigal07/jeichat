export const MAX_PREVIEWS_PER_MESSAGE = 3;
const MAX_URL_LENGTH = 2048;

const FENCED_CODE = /```[\s\S]*?(?:```|$)/g;
const INLINE_CODE = /`[^`\n]*`/g;
const URL_PATTERN = /https?:\/\/[^\s<>]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?'"*_~]+$/;

function count(value: string, char: string): number {
  return value.split(char).length - 1;
}

/** Drops sentence punctuation and closing brackets that belong to the prose, not the URL. */
function trimUrl(raw: string): string {
  let url = raw;
  for (;;) {
    const before = url;
    url = url.replace(TRAILING_PUNCTUATION, '');
    if (url.endsWith(')') && count(url, ')') > count(url, '(')) {
      url = url.slice(0, -1);
    }
    if (url.endsWith(']') && count(url, ']') > count(url, '[')) {
      url = url.slice(0, -1);
    }
    if (url === before) return url;
  }
}

/**
 * Finds the http(s) URLs in a chat message that should get a preview, in order
 * of appearance. Skips code, `<url>` (Discord's "no embed" convention), URLs
 * on `ignoredOrigins` (the app's own pages, which need a login), and caps the
 * count so one message cannot fan out into many outbound requests.
 */
export function extractPreviewUrls(
  content: string,
  ignoredOrigins: readonly string[] = [],
  limit = MAX_PREVIEWS_PER_MESSAGE,
): string[] {
  // Blank out code rather than removing it so `<` / `>` neighbours stay accurate.
  const text = content
    .replace(FENCED_CODE, (block) => ' '.repeat(block.length))
    .replace(INLINE_CODE, (span) => ' '.repeat(span.length));

  const found: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const candidate = trimUrl(match[0]);
    const end = start + match[0].length;

    if (text[start - 1] === '<' && text[end] === '>') continue;
    if (candidate.length > MAX_URL_LENGTH) continue;

    let origin: string;
    try {
      origin = new URL(candidate).origin;
    } catch {
      continue;
    }
    if (ignoredOrigins.includes(origin) || seen.has(candidate)) continue;

    seen.add(candidate);
    found.push(candidate);
    if (found.length >= limit) break;
  }

  return found;
}
