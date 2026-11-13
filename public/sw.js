// Service worker: pushmeldingen en werken zonder (goede) verbinding, zoals in de winkel.
//
// - App-bestanden (/_next/static, iconen, lettertypen): bewaard en direct uit de telefoon geladen.
// - Pagina's: eerst het netwerk, maar na 3 seconden zonder antwoord de laatst bekende versie.
//   Zo blijft het scherm nooit wit hangen bij één streepje bereik.
// - Bij elke bewaarde pagina worden ook alle bestanden bewaard die die pagina nodig heeft.
// - Wijzigingen (afvinken e.d.) wachten in de app zelf tot er weer verbinding is (offline-queue).
const VERSION = "v5";
const PAGES = `pagina-${VERSION}`;
const STATIC = `bestanden-${VERSION}`;
const PAGE_TIMEOUT = 3000;
const DATA_TIMEOUT = 4000;
const PRECACHE_PAGES = ["/", "/vast", "/watchlist", "/bonnen", "/beheer"];
const PRECACHE_FILES = ["/manifest.webmanifest", "/icon-192.png", "/apple-touch-icon.png", "/favicon.svg"];

const OFFLINE_HTML = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Geen verbinding · Boodschappen</title><style>body{margin:0;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:32px;box-sizing:border-box;background:#f5f3ee;color:#1c2420;font:17px/1.4 -apple-system,system-ui,sans-serif}
h1{font-size:24px;margin:0}p{margin:0;color:#69716b}button{margin-top:8px;height:48px;border:0;border-radius:16px;background:#1f6f4a;color:#fff;font:600 16px system-ui}</style></head>
<body><p style="color:#1f6f4a;font-weight:600">Boodschappen</p><h1>Geen verbinding</h1><p>Deze pagina is nog niet eerder geopend op deze telefoon. De boodschappenlijst zelf werkt wel zonder internet.</p>
<button onclick="location.href='/'">Naar de lijst</button><button onclick="location.reload()" style="background:#fff;color:#1c2420;border:1px solid #e2ded3">Opnieuw proberen</button></body></html>`;

function isGoodPage(res) {
  return res && res.ok && !res.redirected && (res.headers.get("content-type") || "").includes("text/html");
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(() => resolve("timeout"), ms));
}

// Pagina's opslaan zonder zoekparameters (?foto=1 e.d.), zodat ze ook offline terug te vinden zijn.
function pageKey(url) {
  const u = new URL(url, self.location.origin);
  return u.origin + u.pathname;
}

/** fetch met een maximale wachttijd: bij één streepje bereik nooit eindeloos blijven hangen. */
function fetchT(input, ms, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

/** Bewaart een pagina én de app-bestanden (scripts, opmaak, lettertypen) die erin genoemd worden. */
async function storePage(key, res) {
  if (!isGoodPage(res)) return;
  const html = await res.clone().text();
  await (await caches.open(PAGES)).put(key, res);
  const files = [...new Set(html.match(/\/_next\/static\/[^"'\s\\]+?\.(?:js|css|woff2?|png|svg)/g) || [])];
  const cache = await caches.open(STATIC);
  await Promise.all(
    files.map(async (f) => {
      if (await cache.match(f)) return;
      try {
        const r = await fetchT(f, 15000);
        if (r.ok) await cache.put(f, r);
      } catch {
        /* volgende keer */
      }
    }),
  );
}

function refreshPage(path) {
  return fetchT(path, 20000, { credentials: "same-origin" })
    .then((res) => storePage(pageKey(path), res))
    .catch(() => null);
}

self.addEventListener("install", (event) => {
  // Hoofdschermen alvast bewaren (met de inlog-cookies van deze telefoon); de installatie wacht daar maximaal 20 s op.
  event.waitUntil(
    Promise.race([
      Promise.all([caches.open(STATIC).then((c) => c.addAll(PRECACHE_FILES).catch(() => {})), ...PRECACHE_PAGES.map(refreshPage)]),
      timeout(20000),
    ]),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function handlePage(event) {
  const req = event.request;
  const key = pageKey(req.url);
  const network = fetch(req).then((res) => {
    if (isGoodPage(res)) event.waitUntil(storePage(key, res.clone()));
    return res;
  });
  // Ook als het netwerk traag is: het antwoord blijft binnenkomen en ververst de bewaarde versie.
  event.waitUntil(network.then(() => {}, () => {}));

  const cached = await (await caches.open(PAGES)).match(key);
  try {
    const first = await Promise.race([network, timeout(cached ? PAGE_TIMEOUT : 15000)]);
    if (first !== "timeout") return first;
  } catch {
    /* geen netwerk */
  }
  if (cached) return cached;
  return new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Gegevens die de app tijdens het navigeren ophaalt (React Server Components): niet eindeloos wachten.
// Een snelle fout laat Next.js terugvallen op een gewone paginalading, en die komt dan uit de bewaarde versie.
async function handleData(req) {
  try {
    const first = await Promise.race([fetch(req), timeout(DATA_TIMEOUT)]);
    if (first !== "timeout") return first;
  } catch {
    /* geen netwerk */
  }
  return Response.error();
}

async function handleStatic(event) {
  const req = event.request;
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetchT(req, 20000);
  if (res.ok) event.waitUntil(cache.put(req, res.clone()).then(trimStatic));
  return res;
}

// Oude versies van de app-bestanden opruimen (meer dan 500 bestanden).
let trimming = false;
async function trimStatic() {
  if (trimming) return;
  trimming = true;
  try {
    const cache = await caches.open(STATIC);
    const keys = await cache.keys();
    for (const k of keys.slice(0, Math.max(0, keys.length - 500))) await cache.delete(k);
  } finally {
    trimming = false;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") return event.respondWith(handlePage(event));
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return event.respondWith(handleData(req));
  if (
    url.pathname.startsWith("/_next/static/") ||
    /^\/(icon|apple-touch-icon|favicon)/.test(url.pathname) ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(woff2?|png|svg|ico)$/.test(url.pathname)
  ) {
    return event.respondWith(handleStatic(event));
  }
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
  // De app vraagt om een pagina opnieuw te bewaren, bijv. de lijst nadat er iets veranderde.
  if (event.data && event.data.type === "BEWAAR" && typeof event.data.path === "string" && event.data.path.startsWith("/")) {
    event.waitUntil(refreshPage(event.data.path));
  }
});
