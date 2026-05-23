/* Realtorai service worker.
 *
 * Scope: installable PWA + push notifications. Deliberately minimal — we do
 * NOT cache application responses because:
 *   - Stale CRM data is worse than no data; loading a "ghost" lead from a
 *     cached response would actively mislead the user.
 *   - Next.js handles its own static-asset versioning; layering SW caching
 *     on top would fight that.
 *
 * What we do cache: a tiny offline page (TODO: add /offline route) so that
 * an offline navigation request can fall back to a usable shell instead of
 * the browser's network-error page.
 *
 * Push events: when the server pushes via VAPID, we surface a native
 * notification. Click → focus the app and navigate to the deep link.
 */

const CACHE_NAME = 'realtorai-shell-v1';
const PRECACHE = ['/icons/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Evict any prior shell cache versions so we don't bloat user disk.
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Cache-first only for our shell assets; everything else goes to the network.
// The CRM is a live-data product — caching API responses is a footgun.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (PRECACHE.some((path) => url.pathname === path)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
    );
  }
});

// --- Push notifications --------------------------------------------------
// Payload shape (from the server side push-sender):
//   { title, body, url?, tag?, data? }
// `tag` lets us collapse stacked notifications for the same lead.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Server might have sent a bare string for ad-hoc tests; surface it as
    // the body with a generic title so debug pushes still show up.
    payload = { title: 'Realtorai', body: event.data.text() };
  }
  const title = payload.title || 'Realtorai';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: payload.tag || undefined,
    data: { url: payload.url || '/dashboard', ...(payload.data || {}) },
    dir: 'rtl',
    lang: 'he',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // If a tab is already open on the same origin, focus + navigate it
      // rather than spawning yet another.
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // navigate() rejects on cross-origin or if the client is
              // pinned to a different doc; in that case just open a new
              // window so the click still does something useful.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
