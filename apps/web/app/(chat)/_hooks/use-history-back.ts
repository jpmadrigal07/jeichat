'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { canGoBackInApp } from '@chat/_helpers/navigation-history';

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
