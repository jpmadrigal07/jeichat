'use client';

import { useEffect } from 'react';
import { registerPwaServiceWorker } from '@/lib/pwa';

export function PwaHost() {
  useEffect(() => {
    void registerPwaServiceWorker();
  }, []);

  return null;
}
