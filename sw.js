const CACHE_NAME = "hs-height-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/data.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // The Cache API should only handle GET requests.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Keep external resources on the network; this app shell has no
  // external runtime dependency that needs to be cached.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          // Cache successful same-origin responses for future offline use.
          if (networkResponse.ok && networkResponse.type === "basic") {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // For navigation requests, return the cached app shell so the
          // installed PWA can still open when offline.
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("", {
            status: 503,
            statusText: "Offline"
          });
        });
    })
  );
});
