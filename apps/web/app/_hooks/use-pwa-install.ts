'use client';

import { useSyncExternalStore } from 'react';
import {
  getPwaInstallServerSnapshot,
  getPwaInstallState,
  promptPwaInstall,
  subscribePwaInstall,
} from '@/lib/pwa';

export function usePwaInstall() {
  const state = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallState,
    getPwaInstallServerSnapshot,
  );

  return {
    canInstall: state.canInstall,
    installed: state.installed,
    install: promptPwaInstall,
  };
}
