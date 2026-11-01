/* 오프라인용 파일 — 앱 화면(이 폴더의 파일)과 글꼴·차트 라이브러리만 기기에 저장. 가계부 데이터 요청(POST)은 건드리지 않음 */
const VERSION = '74f2d94af6';
const SHELL = 'budget-shell-' + VERSION, CDN = 'budget-cdn-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('budget-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // 화면: 인터넷이 되면 새 버전, 안 되면 저장해 둔 화면
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(SHELL).then(s => s.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
    return;
  }
  if (CDN_HOSTS.includes(url.hostname)) {
    // 글꼴·차트: 저장본으로 바로 보여 주고 뒤에서 갱신
    e.respondWith(caches.open(CDN).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
