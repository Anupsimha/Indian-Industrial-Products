// Minimal service worker — required for PWA installability.
// No caching logic; the app requires network connectivity.

self.addEventListener('install', () => {
  // Activate immediately, skip waiting for old SW to be released
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients so the SW is active immediately
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch — no caching, just satisfy the SW requirement
self.addEventListener('fetch', () => {
  // Intentionally empty: let the browser handle all requests normally.
  // Not calling event.respondWith() means the default network behavior is used.
});
