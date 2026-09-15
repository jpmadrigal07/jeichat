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

const recentTags = new Map();
const DEDUPE_MS = 2000;

async function displayNotification(title, options) {
  const tag = options.tag || 'jeichat:message';
  const now = Date.now();
  const lastShown = recentTags.get(tag) ?? 0;
  if (now - lastShown < DEDUPE_MS) return;
  recentTags.set(tag, now);

  await self.registration.showNotification(title || 'JeiChat', {
    body: options.body || 'New message',
    icon: options.icon || '/icons/icon-192.png',
    badge: options.badge || '/icons/icon-192.png',
    tag,
    renotify: false,
    data: options.data || { href: '/' },
    silent: options.silent ?? false,
    sound: '/sounds/notification.wav',
  });
}

async function handlePush(event) {
  if (!event.data) return;

  const payload = event.data.json();
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Looking at JeiChat: the in-app toast already covered this.
  if (windowClients.some((client) => client.focused)) return;

  const hasClient = windowClients.length > 0;
  await displayNotification(payload.title, {
    body: payload.body,
    icon: payload.icon,
    tag: payload.tag,
    data: { href: payload.href || '/' },
    // Open window already plays the JeiChat sound; keep the toast silent then.
    silent: hasClient,
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
