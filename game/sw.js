// -----------------------------------------------------------------------------
//  Service worker — permet d'installer le jeu (icône écran d'accueil) et de
//  charger l'interface instantanément. On met en cache UNIQUEMENT les fichiers
//  du jeu (même origine). Spotify (streaming + SDK) passe toujours par le réseau.
//
//  Si tu modifies un fichier du jeu, change le numéro de version ci-dessous
//  (v1 -> v2 ...) pour forcer la mise à jour sur les téléphones déjà installés.
// -----------------------------------------------------------------------------
const CACHE = "hitster-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./config.js",
  "./app.js",
  "./spotify.js",
  "./scanner.js",
  "./demo-cards.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // On ne gère que les GET de notre propre origine.
  // Tout le reste (Spotify, CDN du SDK) part directement au réseau.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Navigation (ouverture de l'app, retour OAuth avec ?code=...) :
  // réseau d'abord, repli sur la page d'accueil en cache si hors-ligne.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  // Ressources : cache d'abord, sinon réseau (et on met en cache au passage).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
