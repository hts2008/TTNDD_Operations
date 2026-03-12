/**
 * TTNDD_OPS Service Worker — Offline-first PWA support (T-0116)
 * 
 * Caching strategy:
 * - Static assets: Cache-first (CSS, JS, images)
 * - API calls: Network-first with offline fallback
 * - Offline packs: Stored in dedicated cache
 */

const CACHE_VERSION = 'ttndd-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const PACK_CACHE = `${CACHE_VERSION}-packs`;

const STATIC_URLS = [
  '/',
  '/offline',
];

// ── Install: Pre-cache static shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_URLS))
  );
  self.skipWaiting();
});

// ── Activate: Clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('ttndd-') && key !== STATIC_CACHE && key !== API_CACHE && key !== PACK_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Strategy router ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Offline pack requests → pack cache
  if (url.pathname.includes('/offline-packs/')) {
    event.respondWith(packFirst(event.request));
    return;
  }

  // API requests → network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // Static assets → cache-first
  event.respondWith(cacheFirst(event.request, STATIC_CACHE));
});

// ── Strategies ──

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ offline: true, error: 'No cached data' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function packFirst(request) {
  // Offline packs are stored permanently until explicitly evicted
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PACK_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(JSON.stringify({ offline: true, error: 'Pack not cached' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Background Sync (when supported) ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-results') {
    event.waitUntil(syncOfflineResults());
  }
});

async function syncOfflineResults() {
  // The offline-queue module handles IndexedDB → API sync
  // This is triggered when connectivity is restored
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_TRIGGER', tag: 'sync-offline-results' });
  }
}
