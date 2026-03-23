/* ================================================================
   LogiFlow Service Worker v1.0
   Strategy:
     - Static assets  → Cache First (serve fast, update in background)
     - API calls      → Network First (fresh data, fallback to cache)
     - Offline queue  → IndexedDB for mutations when offline
   ================================================================ */

const SW_VERSION  = 'lf-v1.0.0';
const CACHE_STATIC = `${SW_VERSION}-static`;
const CACHE_API    = `${SW_VERSION}-api`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/offline.html',
  '/pages/login.html',
  '/pages/register.html',
  '/pages/dashboard.html',
  '/pages/track.html',
  '/css/main.css',
  '/js/app.js',
  '/js/auth.js',
  '/manifest.json',
  // Fonts cached via fetch handlers below
];

const API_CACHE_ROUTES = [
  '/api/shipments',
  '/api/companies',
  '/api/profile',
  '/api/notifications',
];

/* ─── Install ─── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      // Cache what we can, ignore failures for missing files
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ─── Activate: Clean old caches ─── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_API)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─── Fetch Strategy ─── */
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET for API (handle via background sync)
  if (request.method !== 'GET') return;

  // Skip cross-origin (except fonts/CDN)
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  // API routes: Network First → Cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirstAPI(request));
    return;
  }

  // Google Fonts: Cache First
  if (isFont) {
    e.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Static assets: Cache First → Network fallback → Offline page
  e.respondWith(cacheFirstWithOfflineFallback(request));
});

async function networkFirstAPI(request) {
  const cache = await caches.open(CACHE_API);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'offline', message: 'No internet connection' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(request, cacheName = CACHE_STATIC) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(cacheName);
  cache.put(request, response.clone());
  return response;
}

async function cacheFirstWithOfflineFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      const offline = await caches.match('/pages/offline.html');
      if (offline) return offline;
    }
    return new Response('Offline', { status: 503 });
  }
}

/* ─── Background Sync ─── */
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-shipments')   e.waitUntil(syncShipments());
  if (e.tag === 'sync-gate-entry')  e.waitUntil(syncGateEntries());
  if (e.tag === 'sync-tracking')    e.waitUntil(syncTrackingUpdates());
});

async function syncShipments() {
  const items = await getQueueItems('offlineShipments');
  for (const item of items) {
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${item.token}` },
        body: JSON.stringify(item.data)
      });
      if (res.ok) await removeQueueItem('offlineShipments', item.id);
    } catch { /* will retry on next sync */ }
  }
}

async function syncGateEntries() {
  const items = await getQueueItems('offlineGateEntries');
  for (const item of items) {
    try {
      const res = await fetch('/api/gate-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${item.token}` },
        body: JSON.stringify(item.data)
      });
      if (res.ok) await removeQueueItem('offlineGateEntries', item.id);
    } catch {}
  }
}

async function syncTrackingUpdates() {
  const items = await getQueueItems('offlineTracking');
  for (const item of items) {
    try {
      const res = await fetch(`/api/shipments/${item.data.shipmentId}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${item.token}` },
        body: JSON.stringify(item.data)
      });
      if (res.ok) await removeQueueItem('offlineTracking', item.id);
    } catch {}
  }
}

/* ─── Push Notifications ─── */
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const data = e.data.json();

  const options = {
    body: data.body || 'New update from LogiFlow',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'logiflow-notification',
    data: { url: data.url || '/pages/dashboard.html' },
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: data.priority === 'high',
  };

  // Color-code by type
  if (data.type === 'shipment_delivered') options.icon = '/icons/icon-delivered.png';
  if (data.type === 'payment_received')   options.icon = '/icons/icon-payment.png';
  if (data.type === 'alert')             options.requireInteraction = true;

  e.waitUntil(
    self.registration.showNotification(data.title || 'LogiFlow', options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* ─── IndexedDB helpers ─── */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('logiflow-offline', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      ['offlineShipments', 'offlineGateEntries', 'offlineTracking'].forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function getQueueItems(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function removeQueueItem(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
