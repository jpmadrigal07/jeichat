'use client';

import { useSyncExternalStore } from 'react';
import {
  getInboxNotificationSoundEnabled,
  getInboxNotificationSoundServerSnapshot,
  playInboxNotificationSound,
  setInboxNotificationSoundEnabled,
  subscribeInboxNotificationSound,
} from '../_helpers/inbox-notification-sound';

export function useInboxNotificationSound() {
  const enabled = useSyncExternalStore(
    subscribeInboxNotificationSound,
    getInboxNotificationSoundEnabled,
    getInboxNotificationSoundServerSnapshot,
  );

  return {
    enabled,
    setEnabled: (nextEnabled: boolean) => {
      setInboxNotificationSoundEnabled(nextEnabled);
      if (nextEnabled) playInboxNotificationSound();
    },
  };
}
