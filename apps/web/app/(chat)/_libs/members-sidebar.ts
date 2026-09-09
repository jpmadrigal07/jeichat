const STORAGE_KEY = 'jeichat:members-sidebar:v1';
const DEFAULT_OPEN = false;

const listeners = new Set<() => void>();

function readStoredOpen() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '0') return false;
    if (stored === '1') return true;
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }

  return DEFAULT_OPEN;
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeMembersSidebar(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getMembersSidebarOpen() {
  return readStoredOpen();
}

export function getMembersSidebarServerSnapshot() {
  return DEFAULT_OPEN;
}

export function setMembersSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }

  emitChange();
}
