/**
 * EverUndang Service Worker
 *
 * Provides offline support, caching strategies, and push notifications
 * for the Progressive Web App experience.
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "everundang-v1";
const STATIC_CACHE_NAME = "everundang-static-v1";
const DYNAMIC_CACHE_NAME = "everundang-dynamic-v1";
const API_CACHE_NAME = "everundang-api-v1";

// Resources to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// API endpoints to cache with network-first strategy
const CACHEABLE_API_PATTERNS = [
  /\/api\/invitations\/slug\/.+/,
  /\/api\/invitations\/.+\/guestbook/,
];

// API endpoints that should never be cached
const NO_CACHE_API_PATTERNS = [
  /\/api\/invitations\/.+\/rsvp$/,
  /\/api\/auth/,
  /\/api\/admin/,
];

/**
 * Install event - cache static assets
 */
self.addEventListener("install", (event: ExtendableEvent) => {
  console.log("[ServiceWorker] Install");

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("[ServiceWorker] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener("activate", (event: ExtendableEvent) => {
  console.log("[ServiceWorker] Activate");

  const cacheWhitelist = [
    STATIC_CACHE_NAME,
    DYNAMIC_CACHE_NAME,
    API_CACHE_NAME,
  ];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log("[ServiceWorker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

/**
 * Determine caching strategy based on request
 */
function getCachingStrategy(
  request: Request
): "cache-first" | "network-first" | "network-only" | "stale-while-revalidate" {
  const url = new URL(request.url);

  // API requests
  if (url.pathname.startsWith("/api/")) {
    // Never cache sensitive endpoints
    if (NO_CACHE_API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
      return "network-only";
    }

    // Cache invitation data with network-first
    if (CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
      return "network-first";
    }

    // Default to network-only for other API calls
    return "network-only";
  }

  // Static assets - cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico)$/)
  ) {
    return "cache-first";
  }

  // HTML pages - stale while revalidate
  if (url.pathname.endsWith(".html") || url.pathname === "/") {
    return "stale-while-revalidate";
  }

  // Default strategy
  return "network-first";
}

/**
 * Cache-first strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline fallback if available
    return createOfflineResponse(request);
  }
}

/**
 * Network-first strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return createOfflineResponse(request);
  }
}

/**
 * Stale-while-revalidate strategy
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

/**
 * Network-only strategy
 * Always go to network, no caching
 */
async function networkOnly(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    return createOfflineResponse(request);
  }
}

/**
 * Create offline fallback response
 */
function createOfflineResponse(request: Request): Response {
  const url = new URL(request.url);

  // API offline response
  if (url.pathname.startsWith("/api/")) {
    return new Response(
      JSON.stringify({
        error: "offline",
        message: "You appear to be offline. Please check your connection.",
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // HTML offline page
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - EverUndang</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 20px;
        }
        .container { max-width: 400px; }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        p { opacity: 0.9; margin-bottom: 1.5rem; line-height: 1.6; }
        button {
          background: white;
          color: #764ba2;
          border: none;
          padding: 12px 24px;
          font-size: 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: transform 0.2s;
        }
        button:hover { transform: scale(1.05); }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📵</div>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Some features may not be available until you're back online.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
    `,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}

/**
 * Fetch event - intercept network requests
 */
self.addEventListener("fetch", (event: FetchEvent) => {
  const request = event.request;

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith("http")) {
    return;
  }

  const strategy = getCachingStrategy(request);

  switch (strategy) {
    case "cache-first":
      event.respondWith(cacheFirst(request));
      break;
    case "network-first":
      event.respondWith(networkFirst(request));
      break;
    case "stale-while-revalidate":
      event.respondWith(staleWhileRevalidate(request));
      break;
    case "network-only":
      event.respondWith(networkOnly(request));
      break;
  }
});

/**
 * Message event - handle messages from main thread
 */
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      })
    );
  }

  if (event.data && event.data.type === "GET_CACHE_SIZE") {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ type: "CACHE_SIZE", size });
      })
    );
  }
});

/**
 * Calculate total cache size
 */
async function getCacheSize(): Promise<number> {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

/**
 * Push notification event
 */
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options: NotificationOptions = {
      body: data.body || "You have a new notification",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/",
        dateOfArrival: Date.now(),
      },
      actions: data.actions || [],
      tag: data.tag || "everundang-notification",
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || "EverUndang",
        options
      )
    );
  } catch (error) {
    console.error("[ServiceWorker] Push event error:", error);
  }
});

/**
 * Notification click event
 */
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        return self.clients.openWindow(urlToOpen);
      })
  );
});

/**
 * Background sync event
 */
self.addEventListener("sync", (event: SyncEvent) => {
  console.log("[ServiceWorker] Sync event:", event.tag);

  if (event.tag === "sync-rsvps") {
    event.waitUntil(syncPendingRsvps());
  }

  if (event.tag === "sync-guestbook") {
    event.waitUntil(syncPendingGuestbookEntries());
  }
});

/**
 * Sync pending RSVPs when back online
 */
async function syncPendingRsvps(): Promise<void> {
  // Implementation would read from IndexedDB and sync with server
  console.log("[ServiceWorker] Syncing pending RSVPs...");
}

/**
 * Sync pending guestbook entries when back online
 */
async function syncPendingGuestbookEntries(): Promise<void> {
  // Implementation would read from IndexedDB and sync with server
  console.log("[ServiceWorker] Syncing pending guestbook entries...");
}

// Type declarations for service worker events
interface SyncEvent extends ExtendableEvent {
  tag: string;
}

export {};
