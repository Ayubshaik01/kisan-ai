const CACHE_NAME = "kisanai-offline-v4";

const OFFLINE_ROUTES = [
  "/",
  "/diagnose",
  "/library",
  "/history",
  "/saved",
  "/assistant",
  "/weather",
  "/calculator",
  "/yield-estimator",
  "/market",
  "/profile",
  "/profile/offline",
  "/notifications",
  "/help",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/logo.svg",
  "/favicon.svg",
  "/models/rice_mobilenetv3.onnx",
  "/models/chilli_mobilenetv3.onnx",
  "/models/rice_hgb_model.json",
  "/models/chilli_hgb_model.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_ROUTES).catch((e) => console.warn("Cache prefill warning:", e)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;

  // Navigations: network-first, fall back to cached shell when offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached || Response.error())),
    );
    return;
  }

  // Model weights and heavy binary assets: cache-first with network fallback
  if (request.url.includes("/models/") || request.url.includes("/fonts/")) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
      )
    );
    return;
  }

  // Application code (JS, CSS, SVGs): network-first so new releases appear immediately, cache fallback for offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});
