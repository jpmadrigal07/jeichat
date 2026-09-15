import {
  messageNotificationHref,
  messageNotificationSnippet,
  messageNotificationTargetLabel,
} from './message-notification-copy';
import { registerPwaServiceWorker } from '@/lib/pwa';
import { playInboxNotificationSound } from './inbox-notification-sound';
import {
  deletePushSubscription,
  fetchVapidPublicKey,
  savePushSubscription,
} from '../_libs/push-subscriptions';
import type { MessageNotification } from '../_libs/message-notifications';

const STORAGE_KEY = 'jeichat:desktop-notifications:v1';
const DEFAULT_ENABLED = true;

const listeners = new Set<() => void>();

let permissionWatcherBound = false;
let promptBound = false;

type NotificationOptionsWithRenotify = NotificationOptions & {
  renotify?: boolean;
};

function readStoredEnabled() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '0') return false;
    if (stored === '1') return true;
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }

  return DEFAULT_ENABLED;
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function notificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function vapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function notificationIconUrl(image: string | null | undefined) {
  if (image) {
    try {
      return new URL(image, window.location.origin).toString();
    } catch {
      // Ignore invalid URLs and fall through to the app icon.
    }
  }

  return new URL('/icon.png', window.location.origin).toString();
}

function bindPermissionWatcher() {
  if (permissionWatcherBound || typeof navigator === 'undefined') return;
  if (!navigator.permissions?.query) return;
  permissionWatcherBound = true;

  void navigator.permissions
    .query({ name: 'notifications' })
    .then((status) => {
      status.onchange = () => emitChange();
    })
    .catch(() => {
      // Some browsers reject this query; permission is still readable directly.
    });
}

function bindPermissionPrompt() {
  if (promptBound || typeof window === 'undefined') return;
  promptBound = true;

  const prompt = () => {
    if (!getDesktopNotificationsEnabled()) return;
    if (getDesktopNotificationPermission() !== 'default') return;
    void requestDesktopNotificationPermission();
  };

  window.addEventListener('pointerdown', prompt, { once: true, passive: true });
  window.addEventListener('keydown', prompt, { once: true });
}

bindPermissionWatcher();
bindPermissionPrompt();

export function subscribeDesktopNotifications(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getDesktopNotificationsEnabled() {
  return readStoredEnabled();
}

export function getDesktopNotificationsServerSnapshot() {
  return DEFAULT_ENABLED;
}

export function getDesktopNotificationPermission(): NotificationPermission {
  if (!notificationSupported()) return 'denied';
  return Notification.permission;
}

export function getDesktopNotificationPermissionServerSnapshot(): NotificationPermission {
  return 'default';
}

export function setDesktopNotificationsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }

  emitChange();
}

export async function requestDesktopNotificationPermission() {
  if (!notificationSupported()) return 'denied' as NotificationPermission;

  try {
    const permission = await Notification.requestPermission();
    emitChange();
    return permission;
  } catch {
    emitChange();
    return Notification.permission;
  }
}

export function canShowDesktopNotifications() {
  return (
    getDesktopNotificationsEnabled() &&
    getDesktopNotificationPermission() === 'granted'
  );
}

export function isAppInForeground() {
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'visible' && document.hasFocus();
}

export async function registerNotificationServiceWorker() {
  return registerPwaServiceWorker();
}

export async function syncPushSubscription(enabled = getDesktopNotificationsEnabled()) {
  const registration = await registerNotificationServiceWorker();
  if (!registration || !pushSupported()) return;

  const existing = await registration.pushManager.getSubscription();
  if (!enabled || getDesktopNotificationPermission() !== 'granted') {
    if (existing) {
      const endpoint = existing.endpoint;
      await existing.unsubscribe().catch(() => undefined);
      await deletePushSubscription(endpoint).catch(() => undefined);
    }
    return;
  }

  const publicKey = vapidPublicKey() || (await fetchVapidPublicKey());
  if (!publicKey) return;

  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;

  await savePushSubscription({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
}

function notificationOptions(
  notification: MessageNotification,
): NotificationOptionsWithRenotify {
  const target = messageNotificationTargetLabel(notification);
  const snippet = messageNotificationSnippet(notification);

  return {
    body: `${target}\n${snippet}`,
    icon: notificationIconUrl(notification.message.sender?.image),
    badge: '/icon.png',
    tag: `jeichat:message:${notification.workspaceId}:${notification.channel.id}`,
    renotify: true,
    silent: true,
    data: { href: messageNotificationHref(notification) },
  };
}

async function showSystemNotification(
  title: string,
  options: NotificationOptionsWithRenotify,
  onOpen?: (href: string) => void,
) {
  const registration = await registerNotificationServiceWorker();
  if (registration) {
    await registration.showNotification(title, options);
    return true;
  }

  const desktopNotification = new Notification(title, options);
  desktopNotification.onclick = () => {
    window.focus();
    const href =
      typeof options.data?.href === 'string' ? options.data.href : undefined;
    if (href) onOpen?.(href);
    desktopNotification.close();
  };
  return true;
}

export async function showDesktopNotificationPreview() {
  if (!canShowDesktopNotifications()) return false;

  try {
    playInboxNotificationSound();
    return await showSystemNotification('JeiChat', {
      body: 'You will get alerts even when JeiChat is in the background.',
      icon: notificationIconUrl(null),
      badge: '/icon.png',
      tag: 'jeichat:desktop-preview',
      silent: true,
    });
  } catch {
    return false;
  }
}

export async function showDesktopMessageNotification(
  notification: MessageNotification,
  onOpen?: (href: string) => void,
) {
  if (!canShowDesktopNotifications()) return false;
  if (isAppInForeground()) return false;

  try {
    playInboxNotificationSound();
    return await showSystemNotification(
      notification.message.sender?.name ?? 'Someone',
      notificationOptions(notification),
      onOpen,
    );
  } catch {
    return false;
  }
}
