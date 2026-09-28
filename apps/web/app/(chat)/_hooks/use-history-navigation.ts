'use client';

import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import {
  canGoBackInApp,
  canGoForwardInApp,
  subscribeToNavigation,
} from '@chat/_helpers/navigation-history';

const getServerSnapshot = () => false;

/** Browser-style back/forward state, kept in sync with the history stack. */
export function useHistoryNavigation() {
  const router = useRouter();
  const canGoBack = useSyncExternalStore(
    subscribeToNavigation,
    canGoBackInApp,
    getServerSnapshot,
  );
  const canGoForward = useSyncExternalStore(
    subscribeToNavigation,
    canGoForwardInApp,
    getServerSnapshot,
  );

  return {
    canGoBack,
    canGoForward,
    goBack: () => router.back(),
    goForward: () => router.forward(),
  };
}
