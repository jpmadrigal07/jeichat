'use client';

import { useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** Matches Tailwind's `md` breakpoint. False on the server and first paint. */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}
