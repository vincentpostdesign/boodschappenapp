// Service worker: pushmeldingen en een eenvoudige offline-terugval.
const CACHE = "boodschappen-v4";
const OFFLINE_URLS = ["/", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE_URLS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Pagina's: eerst netwerk (altijd de actuele lijst), bij geen verbinding de laatst bekende versie.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Boodschappen";
  // Rood bolletje op het app-icoon (iOS 16.4+ en Android), zodat een gemiste melding zichtbaar blijft.
  const badge =
    "setAppBadge" in self.navigator
      ? (typeof data.count === "number" && data.count > 0 ? self.navigator.setAppBadge(data.count) : self.navigator.setAppBadge()).catch(() => {})
      : Promise.resolve();
  event.waitUntil(
    Promise.all([
      badge,
      self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag,
        timestamp: Date.now(),
        data: { url: data.url || "/" },
        actions: data.actions || [],
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let url = (event.notification.data && event.notification.data.url) || "/";
  // Actieknop "Op de lijst" bij een watchlist-aanbieding
  if (event.action === "op-de-lijst" && url.includes("hit=")) url = url + "&toevoegen=1";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
