'use client';

import { useSyncExternalStore } from 'react';
import {
  getDesktopNotificationPermission,
  getDesktopNotificationPermissionServerSnapshot,
  getDesktopNotificationsEnabled,
  getDesktopNotificationsServerSnapshot,
  requestDesktopNotificationPermission,
  setDesktopNotificationsEnabled,
  showDesktopNotificationPreview,
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
      void requestDesktopNotificationPermission().then((nextPermission) => {
        if (nextPermission !== 'granted') return;
        void syncPushSubscription(true);
        void showDesktopNotificationPreview();
      });
    },
  };
}
