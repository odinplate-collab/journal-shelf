const V = 'v1';

const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open('shell-' + V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => !k.endsWith('-' + V)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;       // 글꼴 등 외부 자원은 건드리지 않는다

  if (url.pathname.includes('/fig/')) {
    // 그림: 캐시 우선. 한 번 본 그림은 오프라인에서도 뜬다.
    e.respondWith(caches.open('fig-' + V).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // 페이지와 셸: 네트워크 우선, 실패하면 캐시. 새 주차가 올라오면 바로 반영된다.
  e.respondWith(fetch(req).then(res => {
    if (res.ok) caches.open('shell-' + V).then(c => c.put(req, res.clone()));
    return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
});
