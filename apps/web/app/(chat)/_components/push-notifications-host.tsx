'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import {
  getDesktopNotificationPermission,
  getDesktopNotificationPermissionServerSnapshot,
  getDesktopNotificationsEnabled,
  getDesktopNotificationsServerSnapshot,
  subscribeDesktopNotifications,
  syncPushSubscription,
} from '../_helpers/desktop-notifications';
import { playInboxNotificationSound } from '../_helpers/inbox-notification-sound';

export function PushNotificationsHost() {
  const router = useRouter();
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

  useEffect(() => {
    void syncPushSubscription(enabled);
  }, [enabled, permission]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'jeichat:play-sound') {
        playInboxNotificationSound();
        return;
      }
      if (event.data?.type !== 'jeichat:navigate') return;
      if (typeof event.data.href !== 'string') return;
      router.push(event.data.href);
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, [router]);

  return null;
}
