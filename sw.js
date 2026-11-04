const APP = 'nagoya-trip-';
const CACHE = APP + 'v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
// 같은 사이트(joongji1.github.io)의 다른 여행 앱 캐시는 건드리지 않고, 이 앱의 옛 버전만 지우기
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(APP) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 글꼴: 한 번 받아 두고 오프라인에서도 사용
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch (err) { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (url.origin !== location.origin) return; // 지도·전화 링크 등은 그대로
  // 앱 파일: 캐시 우선, 온라인이면 뒤에서 새 버전으로 갱신
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || c.match('./index.html');
  }));
});
