const CACHE_NAME = "hs-height-v3";

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

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate
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

// Fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Don't interfere with external resources
  if (url.origin !== self.location.origin) return;

  /*
   * HTML/navigation:
   * Always try the network first.
   * This makes new deployments appear as soon as the
   * browser can reach the server.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );

    return;
  }

  /*
   * JavaScript and CSS:
   * Network first.
   * If online, always get the latest version.
   * If offline, use the cached version.
   */
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((networkResponse) => {

          if (networkResponse.ok) {
            const copy = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, copy);
              });
          }

          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );

    return;
  }

  /*
   * Other same-origin resources:
   * Cache first, then network.
   */
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {

            if (
              networkResponse.ok &&
              networkResponse.type === "basic"
            ) {
              const copy = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, copy);
                });
            }

            return networkResponse;
          });
      })
      .catch(() => {
        return new Response("", {
          status: 503,
          statusText: "Offline"
        });
      })
  );
});
