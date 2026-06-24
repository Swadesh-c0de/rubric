self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // A fetch handler is required by Chromium browsers to trigger the PWA installation banner.
  // We pass requests through to the network directly.
});
