export type SearchHasFilter = 'file' | 'link';

export type SearchFilterKey = 'from' | 'in' | 'has' | 'mentions';

export type ParsedSearchQuery = {
  text: string;
  from: string | null;
  in: string | null;
  has: SearchHasFilter | null;
  mentions: string | null;
  incomplete: SearchFilterKey | null;
  incompleteQuery: string;
};

const COMPLETE_FILTER_RE =
  /(from|in|has|mentions):\s*(?:"([^"]+)"|(\S+))/gi;

function parseHas(value: string): SearchHasFilter | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'file') return 'file';
  if (normalized === 'link' || normalized === 'embed') return 'link';
  return null;
}

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trailing = raw.match(
    /(?:^|\s)(from|in|has|mentions):(\s*)(\S*)(\s*)$/i,
  );

  let working = raw;
  let incomplete: SearchFilterKey | null = null;
  let incompleteQuery = '';

  if (trailing) {
    const key = trailing[1]?.toLowerCase() as SearchFilterKey | undefined;
    const value = trailing[3] ?? '';
    const trailingSpace = trailing[4] ?? '';
    if (key && (!value || !trailingSpace)) {
      incomplete = key;
      incompleteQuery = value;
      working = raw.slice(0, trailing.index).trimEnd();
    }
  }

  const parsed: ParsedSearchQuery = {
    text: '',
    from: null,
    in: null,
    has: null,
    mentions: null,
    incomplete,
    incompleteQuery,
  };

  let remaining = working;
  for (const match of working.matchAll(COMPLETE_FILTER_RE)) {
    const key = match[1]?.toLowerCase();
    const value = (match[2] ?? match[3] ?? '').trim();
    if (!key || !value) continue;

    if (key === 'from') parsed.from = value.replace(/^@/, '');
    if (key === 'in') parsed.in = value.replace(/^#/, '');
    if (key === 'has') parsed.has = parseHas(value);
    if (key === 'mentions') parsed.mentions = value.replace(/^@/, '');

    remaining = remaining.replace(match[0], ' ');
  }

  parsed.text = remaining.replace(/\s+/g, ' ').trim();
  return parsed;
}

export function isRunnableSearch(parsed: ParsedSearchQuery) {
  return Boolean(
    parsed.text || parsed.from || parsed.in || parsed.has || parsed.mentions,
  );
}

export function applySearchFilter(
  query: string,
  key: SearchFilterKey,
  value?: string,
) {
  const withoutIncomplete = query
    .replace(/(?:^|\s)(from|in|has|mentions):\s*\S*$/i, '')
    .trimEnd();
  const prefix = withoutIncomplete ? `${withoutIncomplete} ` : '';
  if (!value) return `${prefix}${key}:`;
  const encoded = /\s/.test(value) ? `"${value}"` : value;
  return `${prefix}${key}:${encoded} `;
}

export type SearchQueryToken =
  | { kind: 'text'; value: string }
  | { kind: 'filter'; key: SearchFilterKey; value: string };

export function tokenizeSearchQuery(raw: string): SearchQueryToken[] {
  const tokens: SearchQueryToken[] = [];
  const re = /(from|in|has|mentions):\s*(?:"([^"]+)"|(\S+))/gi;
  let lastIndex = 0;
  for (const match of raw.matchAll(re)) {
    const start = match.index ?? 0;
    const before = raw.slice(lastIndex, start).trim();
    if (before) tokens.push({ kind: 'text', value: before });
    const key = match[1]?.toLowerCase() as SearchFilterKey | undefined;
    const value = (match[2] ?? match[3] ?? '').trim();
    if (key && value) {
      tokens.push({ kind: 'filter', key, value });
    }
    lastIndex = start + match[0].length;
  }
  const after = raw.slice(lastIndex).trim();
  if (after) tokens.push({ kind: 'text', value: after });
  return tokens;
}
