/* Wortzi offline support.
   After you change any file, raise VERSION so phones fetch the new files. */
const VERSION = "wortzi-1.8.0";
const AUDIO_CACHE = "wortzi-audio";
const STT_CACHE = "wortzi-stt";   // offline listening engine and German model (about 45 MB), downloaded only when the learner asks // recordings: kept across updates, filled as words are played
const CORE = [
  "./", "index.html", "manifest.webmanifest",
  "assets/css/app.css", "assets/css/fonts.css", "assets/js/app.js",
  "data/deck.txt", "data/guide.html", "data/stories.json", "data/extras.json",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/favicon-32.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(new Request(u, {cache: "reload"})).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== AUDIO_CACHE && k !== STT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// A recording never changes: keep it, and answer the "Range" requests that iPhones send for audio
async function audioResponse(req){
  const url = new URL(req.url), key = url.origin + url.pathname;
  const c = await caches.open(AUDIO_CACHE);
  let full = await c.match(key);
  if (!full) {
    const r = await fetch(key);
    if (!r.ok) return r;
    await c.put(key, r.clone());
    full = r;
  }
  const range = req.headers.get("range");
  if (!range) return full;
  const buf = await full.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }
  return new Response(buf.slice(start, end + 1), {status: 206, headers: {"Content-Type": "audio/mpeg", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes"}});
}
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.includes("/audio/") && url.pathname.endsWith(".mp3")) { e.respondWith(audioResponse(e.request)); return; }
  if (url.pathname.includes("/stt/")) { // big, rarely changes: cache first, keep across updates
    e.respondWith(caches.open(STT_CACHE).then(c => c.match(url.origin + url.pathname).then(hit => hit || fetch(url.origin + url.pathname).then(r => { if (r.ok) c.put(url.origin + url.pathname, r.clone()); return r; }))));
    return;
  }
  if (e.request.headers.has("range")) return;
  // pages, code and lessons: newest from the network when online, the saved copy when offline
  const fresh = /\.(txt|json|html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (fresh) {
    e.respondWith(fetch(e.request, {cache: "no-cache"}).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, {ignoreSearch: true})));
  } else {     // fonts and icons: cache first
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })));
  }
});
