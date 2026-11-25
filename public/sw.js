// Service worker de EvalúaQR: permite instalar la app y muestra una página sin conexión.
// No guarda en caché páginas con datos personales: todo se pide siempre a la red.
const CACHE = "evaluaqr-v1";
const OFFLINE = "/offline.html";
const ASSETS = [OFFLINE, "/pwa/icon-192.png", "/brand/evaluaqr-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
