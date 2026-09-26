'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';

// Navigation API isn't in TypeScript's DOM lib yet.
type NavigationWithBack = { canGoBack?: boolean };

/**
 * `navigation.canGoBack` only counts same-origin entries, so it's false when
 * the page was opened directly (deep link, push notification, new tab).
 * `history.length` can't tell those apart from in-app history.
 */
function canGoBackInApp() {
  const { navigation } = window as Window & {
    navigation?: NavigationWithBack;
  };
  return navigation?.canGoBack === true;
}

/**
 * Click handler for a back `<Link>`: returns to the previous in-app page, and
 * falls through to the link's `href` when there is none to go back to.
 */
export function useHistoryBack() {
  const router = useRouter();

  return (event: MouseEvent<HTMLAnchorElement>) => {
    const isPlainClick =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;

    if (!isPlainClick || !canGoBackInApp()) return;

    event.preventDefault();
    router.back();
  };
}
