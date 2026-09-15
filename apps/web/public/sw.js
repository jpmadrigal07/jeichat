self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Chrome requires a fetch handler before it will offer "Install app".
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href =
    typeof event.notification.data?.href === 'string'
      ? event.notification.data.href
      : '/';
  event.waitUntil(openHref(href));
});

async function handlePush(event) {
  if (!event.data) return;

  const payload = event.data.json();
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  if (windowClients.some((client) => client.focused)) return;

  const hasClient = windowClients.length > 0;
  for (const client of windowClients) {
    client.postMessage({ type: 'jeichat:play-sound' });
  }

  await self.registration.showNotification(payload.title || 'JeiChat', {
    body: payload.body || 'New message',
    icon: payload.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'jeichat:message',
    renotify: true,
    data: { href: payload.href || '/' },
    silent: hasClient,
    sound: '/sounds/notification.wav',
  });
}

async function openHref(href) {
  const url = new URL(href, self.location.origin);
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    if (!client.url.startsWith(self.location.origin)) continue;
    await client.focus();
    client.postMessage({ type: 'jeichat:navigate', href: `${url.pathname}${url.search}` });
    return;
  }

  await self.clients.openWindow(url.href);
}
