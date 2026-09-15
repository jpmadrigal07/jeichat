import { isPwaInstalled, subscribePwaInstall } from '@/lib/pwa';
import {
  getDesktopNotificationPermission,
  getDesktopNotificationsEnabled,
  subscribeDesktopNotifications,
} from './desktop-notifications';
import { isIosDevice, isMacSafari } from './notification-platform';

const DISMISS_KEY = 'jeichat:notification-guidance:v1';

export type NotificationPermissionHelpKind =
  | 'ios-safari'
  | 'ios-home-screen'
  | 'mac-safari'
  | 'blocked';

export type NotificationPermissionHelp = {
  kind: NotificationPermissionHelpKind;
  title: string;
  description: string;
  canAsk: boolean;
};

const HELP: Record<
  NotificationPermissionHelpKind,
  Pick<NotificationPermissionHelp, 'title' | 'description'>
> = {
  'ios-safari': {
    title: 'Allow notifications on iPhone or iPad',
    description:
      'Add JeiChat to your Home Screen, then open that icon. iOS can only ask for permission from the installed app. Tap Share, then Add to Home Screen.',
  },
  'ios-home-screen': {
    title: 'Allow notifications in iOS Settings',
    description:
      'Notifications are blocked for this app. Enable them in Settings → Notifications → JeiChat.',
  },
  'mac-safari': {
    title: 'Allow notifications in Safari',
    description:
      'If Safari does not ask, allow JeiChat in Safari → Settings → Websites → Notifications. Also turn Safari on in System Settings → Notifications.',
  },
  blocked: {
    title: 'Notifications are blocked',
    description:
      "Allow JeiChat in this browser's site settings to get a system alert for new messages.",
  },
};

const guidanceListeners = new Set<() => void>();

function isInstalledApp() {
  return isPwaInstalled();
}

export function getNotificationPermissionHelpKind(): NotificationPermissionHelpKind | null {
  if (typeof window === 'undefined') return null;
  if (!getDesktopNotificationsEnabled()) return null;

  const permission = getDesktopNotificationPermission();
  if (permission === 'granted') return null;

  if (isIosDevice()) {
    if (!isInstalledApp()) return 'ios-safari';
    if (permission === 'denied') return 'ios-home-screen';
    return null;
  }

  if (isMacSafari()) return 'mac-safari';
  if (permission === 'denied') return 'blocked';
  return null;
}

export function getNotificationPermissionHelp(
  kind: NotificationPermissionHelpKind | null = getNotificationPermissionHelpKind(),
): NotificationPermissionHelp | null {
  if (!kind) return null;

  return {
    kind,
    ...HELP[kind],
    canAsk:
      kind === 'mac-safari' &&
      getDesktopNotificationPermission() === 'default',
  };
}

function readDismissedKind() {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function getNotificationPermissionBannerKind(): NotificationPermissionHelpKind | null {
  const kind = getNotificationPermissionHelpKind();
  if (!kind) return null;
  if (readDismissedKind() === kind) return null;
  return kind;
}

export function getNotificationPermissionHelpServerSnapshot(): null {
  return null;
}

export function subscribeNotificationPermissionGuidance(onChange: () => void) {
  guidanceListeners.add(onChange);
  const unsubDesktop = subscribeDesktopNotifications(onChange);
  const unsubPwa = subscribePwaInstall(onChange);
  return () => {
    guidanceListeners.delete(onChange);
    unsubDesktop();
    unsubPwa();
  };
}

export function dismissNotificationPermissionGuidance() {
  const kind = getNotificationPermissionHelpKind();
  if (!kind) return;

  try {
    localStorage.setItem(DISMISS_KEY, kind);
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }

  for (const listener of guidanceListeners) listener();
}
