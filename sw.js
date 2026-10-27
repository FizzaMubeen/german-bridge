/* Wortzi offline support.
   After you change any file, raise VERSION so phones fetch the new files. */
const VERSION = "wortzi-1.7.0";
const AUDIO_CACHE = "wortzi-audio"; // recordings: kept across updates, filled as words are played
const CORE = [
  "./", "index.html", "manifest.webmanifest",
  "assets/css/app.css", "assets/css/fonts.css", "assets/js/app.js",
  "data/deck.txt", "data/guide.html", "data/stories.json", "data/extras.json",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/favicon-32.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== AUDIO_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || e.request.headers.has("range")) return;
  if (url.pathname.includes("/audio/") && url.pathname.endsWith(".mp3")) { // a recording never changes: cache first, keep it
    e.respondWith(caches.open(AUDIO_CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }))));
    return;
  }
  const fresh = url.pathname.endsWith(".txt") || url.pathname.endsWith(".json") || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if (fresh) { // lessons and pages: try the network first so content updates show up
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, {ignoreSearch: true})));
  } else {     // css, js, fonts, icons: cache first
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })));
  }
});
