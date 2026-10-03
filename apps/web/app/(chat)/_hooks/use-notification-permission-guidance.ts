'use client';

import { useSyncExternalStore } from 'react';
import { promptAndSyncDesktopNotifications } from '../_helpers/desktop-notifications';
import {
  dismissNotificationPermissionGuidance,
  getNotificationPermissionBannerKind,
  getNotificationPermissionHelp,
  getNotificationPermissionHelpKind,
  getNotificationPermissionHelpServerSnapshot,
  subscribeNotificationPermissionGuidance,
} from '../_helpers/notification-permission-guidance';

export function useNotificationPermissionHelp() {
  const kind = useSyncExternalStore(
    subscribeNotificationPermissionGuidance,
    getNotificationPermissionHelpKind,
    getNotificationPermissionHelpServerSnapshot,
  );

  return getNotificationPermissionHelp(kind);
}

export function useNotificationPermissionBanner() {
  const kind = useSyncExternalStore(
    subscribeNotificationPermissionGuidance,
    getNotificationPermissionBannerKind,
    getNotificationPermissionHelpServerSnapshot,
  );

  return {
    help: getNotificationPermissionHelp(kind),
    dismiss: dismissNotificationPermissionGuidance,
    ask: promptAndSyncDesktopNotifications,
  };
}
