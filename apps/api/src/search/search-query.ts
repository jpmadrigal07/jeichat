export type SearchHasFilter = 'file' | 'link';

export type ParsedSearchQuery = {
  text: string;
  from: string | null;
  in: string | null;
  has: SearchHasFilter | null;
  mentions: string | null;
};

const FILTER_RE =
  /(from|in|has|mentions):\s*(?:"([^"]+)"|(\S+))/gi;

function parseHas(value: string): SearchHasFilter | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'file') return 'file';
  if (normalized === 'link' || normalized === 'embed') return 'link';
  return null;
}

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const parsed: ParsedSearchQuery = {
    text: '',
    from: null,
    in: null,
    has: null,
    mentions: null,
  };

  let remaining = raw;
  for (const match of raw.matchAll(FILTER_RE)) {
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

export function isSearchQueryEmpty(parsed: ParsedSearchQuery) {
  return (
    !parsed.text &&
    !parsed.from &&
    !parsed.in &&
    !parsed.has &&
    !parsed.mentions
  );
}
