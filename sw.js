/* EscalaAI — Service Worker (PWA offline + notificações locais) */
const CACHE = 'escalaai-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS).catch(() => c.addAll(['./', './index.html'])))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

/* Mensagens do app -> mostra notificação (com trigger agendado quando suportado) */
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type !== 'notify') return;
  const opts = {
    body: d.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: d.tag || 'escalaai',
    renotify: true,
    vibrate: [90, 50, 90],
    data: { url: './index.html' }
  };
  if (d.at && 'showTrigger' in Notification.prototype && typeof TimestampTrigger !== 'undefined') {
    try { opts.showTrigger = new TimestampTrigger(d.at); } catch (err) {}
  }
  if (opts.showTrigger) {
    e.waitUntil(self.registration.showNotification(d.title || 'EscalaAI', opts));
    return;
  }
  if (d.at && !opts.showTrigger) return; /* agendamento futuro: o app cuida via setTimeout */
  e.waitUntil(self.registration.showNotification(d.title || 'EscalaAI', opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./index.html');
    })
  );
});
