const CACHE_NAME = "hs-height-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// --------------------------------------------------
// INSTALL
// --------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// --------------------------------------------------
// ACTIVATE
// --------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// --------------------------------------------------
// FETCH
// --------------------------------------------------
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Ignore external resources.
  if (url.origin !== self.location.origin) {
    return;
  }

  // ------------------------------------------------
  // HTML / NAVIGATION
  // Network first.
  // ------------------------------------------------
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );

    return;
  }

  // ------------------------------------------------
  // Other same-origin files
  // Network first, cache as offline fallback.
  // ------------------------------------------------
  event.respondWith(
    fetch(request, { cache: "no-store" })
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, copy);
            });
        }

        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            return new Response("", {
              status: 503,
              statusText: "Offline"
            });
          });
      })
  );
});
