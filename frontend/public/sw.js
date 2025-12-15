/**
 * EverUndang Service Worker
 * Compiled JavaScript version for browser compatibility
 */

const CACHE_NAME = "everundang-v1";
const STATIC_CACHE_NAME = "everundang-static-v1";
const DYNAMIC_CACHE_NAME = "everundang-dynamic-v1";
const API_CACHE_NAME = "everundang-api-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

const CACHEABLE_API_PATTERNS = [
  /\/api\/invitations\/slug\/.+/,
  /\/api\/invitations\/.+\/guestbook/,
];

const NO_CACHE_API_PATTERNS = [
  /\/api\/invitations\/.+\/rsvp$/,
  /\/api\/auth/,
  /\/api\/admin/,
];

// Install
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  const whitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.map((name) => {
            if (!whitelist.includes(name)) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Caching strategy
function getStrategy(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith("/api/")) {
    if (NO_CACHE_API_PATTERNS.some((p) => p.test(url.pathname))) {
      return "network-only";
    }
    if (CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname))) {
      return "network-first";
    }
    return "network-only";
  }
  
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/)) {
    return "cache-first";
  }
  
  if (url.pathname.endsWith(".html") || url.pathname === "/") {
    return "stale-while-revalidate";
  }
  
  return "network-first";
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return offlineResponse(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || offlineResponse(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  
  return cached || fetchPromise;
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (e) {
    return offlineResponse(request);
  }
}

function offlineResponse(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith("/api/")) {
    return new Response(
      JSON.stringify({ error: "offline", message: "You appear to be offline." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
  
  return new Response(
    `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Offline - EverUndang</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-align:center;padding:20px}.c{max-width:400px}h1{font-size:2rem;margin-bottom:1rem}p{opacity:.9;margin-bottom:1.5rem}button{background:#fff;color:#764ba2;border:none;padding:12px 24px;font-size:1rem;border-radius:8px;cursor:pointer;font-weight:600}.i{font-size:4rem;margin-bottom:1rem}</style>
    </head><body><div class="c"><div class="i">📵</div><h1>You're Offline</h1><p>Please check your connection and try again.</p><button onclick="location.reload()">Retry</button></div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

// Fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;
  if (!request.url.startsWith("http")) return;
  
  const strategy = getStrategy(request);
  
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

// Messages
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "EverUndang", {
        body: data.body || "New notification",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        vibrate: [100, 50, 100],
        data: { url: data.url || "/" },
        tag: data.tag || "everundang",
        renotify: true,
      })
    );
  } catch (e) {
    console.error("[SW] Push error:", e);
  }
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
