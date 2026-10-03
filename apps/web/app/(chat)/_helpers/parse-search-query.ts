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

const TRAILING_FILTER_RE = /(?:^|\s)(from|in|has|mentions):(\s*)(\S*)(\s*)$/i;

/** A filter at the very end of the query that the user is still typing. */
function findIncompleteFilter(raw: string) {
  const trailing = raw.match(TRAILING_FILTER_RE);
  if (!trailing) return null;

  const key = trailing[1]?.toLowerCase() as SearchFilterKey | undefined;
  const value = trailing[3] ?? '';
  const trailingSpace = trailing[4] ?? '';
  if (!key || (value && trailingSpace)) return null;

  return { key, value, index: trailing.index ?? 0 };
}

/** The query without a trailing filter that is still being typed (`from:ju`). */
export function withoutIncompleteFilter(raw: string) {
  const incomplete = findIncompleteFilter(raw);
  return incomplete ? raw.slice(0, incomplete.index) : raw;
}

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trailing = findIncompleteFilter(raw);

  let working = raw;
  let incomplete: SearchFilterKey | null = null;
  let incompleteQuery = '';

  if (trailing) {
    incomplete = trailing.key;
    incompleteQuery = trailing.value;
    working = raw.slice(0, trailing.index).trimEnd();
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

export type SearchFilterChip = { key: SearchFilterKey; value: string };

/**
 * What the search box holds: completed filters shown as badges, plus the free
 * text (or half-typed filter) still in the input.
 */
export type SearchInputState = {
  chips: SearchFilterChip[];
  draft: string;
};

export const EMPTY_SEARCH_INPUT: SearchInputState = { chips: [], draft: '' };

// Only at a word start, so "main:foo" is not mistaken for an `in:` filter.
const CHIP_FILTER_RE = /(?<=^|\s)(from|in|has|mentions):\s*(?:"([^"]+)"|(\S+))/gi;

function normalizeFilterValue(key: SearchFilterKey, value: string) {
  if (key === 'from' || key === 'mentions') return value.replace(/^@/, '');
  if (key === 'in') return value.replace(/^#/, '');
  return value;
}

export function serializeSearchFilter({ key, value }: SearchFilterChip) {
  return `${key}:${/\s/.test(value) ? `"${value}"` : value}`;
}

/** Moves every completed `key:value` in `raw` into chips; the rest is the draft. */
export function absorbFilterChips(
  chips: SearchFilterChip[],
  raw: string,
  { final = false }: { final?: boolean } = {},
): SearchInputState {
  // While typing, a trailing filter without a space is still being edited.
  const incomplete = final ? null : findIncompleteFilter(raw);
  const body = incomplete ? raw.slice(0, incomplete.index) : raw;
  const tail = incomplete ? raw.slice(incomplete.index) : '';

  let next = chips;
  let absorbed = false;
  const rest = body.replace(
    CHIP_FILTER_RE,
    (match, rawKey: string, quoted?: string, bare?: string) => {
      const key = rawKey.toLowerCase() as SearchFilterKey;
      const value = normalizeFilterValue(key, (quoted ?? bare ?? '').trim());
      if (!value) return match;

      // The API honours one value per filter, so a new one replaces the old.
      next = [...next.filter((chip) => chip.key !== key), { key, value }];
      absorbed = true;
      return '';
    },
  );

  if (!absorbed) return { chips, draft: raw };
  return {
    chips: next,
    draft: `${rest.replace(/\s{2,}/g, ' ')}${tail}`.trimStart(),
  };
}

/** The query string sent to the API for a search box state. */
export function joinSearchQuery({ chips, draft }: SearchInputState) {
  // Each chip ends in a space so the parser sees it as finished, not mid-typing.
  return `${chips.map((chip) => `${serializeSearchFilter(chip)} `).join('')}${draft}`;
}

/** Builds search box state from a stored query string (e.g. a history entry). */
export function searchInputFromQuery(raw: string): SearchInputState {
  return absorbFilterChips([], raw, { final: true });
}
