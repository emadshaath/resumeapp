// sw.js — Service worker for rezm.ai PWA
const CACHE_NAME = "rezmai-v1";
const STATIC_ASSETS = ["/icon.svg"];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback for navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // For navigation requests (HTML pages), use network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // For static assets, cache-first
  if (
    request.url.includes("/icon.svg") ||
    request.url.includes("/manifest.webmanifest")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Everything else: network-only (API calls, dynamic pages)
});
