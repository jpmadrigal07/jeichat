'use client';

import { useSyncExternalStore } from 'react';
import {
  canPromptBrowserNotificationPermission,
  getDesktopNotificationPermission,
  getDesktopNotificationPermissionServerSnapshot,
  getDesktopNotificationsEnabled,
  getDesktopNotificationsServerSnapshot,
  promptAndSyncDesktopNotifications,
  setDesktopNotificationsEnabled,
  subscribeDesktopNotifications,
  syncPushSubscription,
} from '../_helpers/desktop-notifications';

export function useDesktopNotifications() {
  const enabled = useSyncExternalStore(
    subscribeDesktopNotifications,
    getDesktopNotificationsEnabled,
    getDesktopNotificationsServerSnapshot,
  );
  const permission = useSyncExternalStore(
    subscribeDesktopNotifications,
    getDesktopNotificationPermission,
    getDesktopNotificationPermissionServerSnapshot,
  );

  return {
    enabled,
    permission,
    setEnabled: (nextEnabled: boolean) => {
      setDesktopNotificationsEnabled(nextEnabled);
      if (!nextEnabled) {
        void syncPushSubscription(false);
        return;
      }
      if (getDesktopNotificationPermission() === 'granted') {
        void syncPushSubscription(true);
        return;
      }
      if (!canPromptBrowserNotificationPermission()) return;
      void promptAndSyncDesktopNotifications();
    },
  };
}
