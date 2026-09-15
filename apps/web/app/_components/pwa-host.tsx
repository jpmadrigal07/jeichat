'use client';

import { useEffect } from 'react';
import {
  listenForPwaInstallPrompt,
  registerPwaServiceWorker,
} from '@/lib/pwa';

listenForPwaInstallPrompt();

export function PwaHost() {
  useEffect(() => {
    void registerPwaServiceWorker();
  }, []);

  return null;
}
