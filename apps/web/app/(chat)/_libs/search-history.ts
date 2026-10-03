const STORAGE_PREFIX = 'jeichat:search-history:v1:';
const MAX_HISTORY = 8;
const EMPTY_HISTORY: string[] = [];

const listeners = new Set<() => void>();
const snapshotCache = new Map<string, string[]>();

function storageKey(workspaceId: string) {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

function emitChange() {
  snapshotCache.clear();
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeSearchHistory(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function sameHistory(a: string[], b: string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

export function getSearchHistory(workspaceId: string): string[] {
  if (!workspaceId) return EMPTY_HISTORY;

  const cached = snapshotCache.get(workspaceId);
  if (cached) return cached;

  try {
    const stored = localStorage.getItem(storageKey(workspaceId));
    if (!stored) {
      snapshotCache.set(workspaceId, EMPTY_HISTORY);
      return EMPTY_HISTORY;
    }
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      snapshotCache.set(workspaceId, EMPTY_HISTORY);
      return EMPTY_HISTORY;
    }
    const next = parsed.filter((item): item is string => typeof item === 'string');
    const prev = snapshotCache.get(workspaceId);
    if (prev && sameHistory(prev, next)) return prev;
    snapshotCache.set(workspaceId, next);
    return next;
  } catch {
    snapshotCache.set(workspaceId, EMPTY_HISTORY);
    return EMPTY_HISTORY;
  }
}

export function getSearchHistoryServerSnapshot(): string[] {
  return EMPTY_HISTORY;
}

export function pushSearchHistory(workspaceId: string, query: string) {
  const trimmed = query.trim();
  if (!workspaceId || !trimmed) return;

  const next = [
    trimmed,
    ...getSearchHistory(workspaceId).filter((item) => item !== trimmed),
  ].slice(0, MAX_HISTORY);

  try {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(next));
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }

  emitChange();
}

export function clearSearchHistory(workspaceId: string) {
  if (!workspaceId) return;
  try {
    localStorage.removeItem(storageKey(workspaceId));
  } catch {
    // Ignore storage failures
  }
  emitChange();
}
