/* 潮汐小島 · service worker（v8.9.2，網頁版離線遊玩）：build.py 依建置結果填入下面的版本與檔案清單（底線包起來的那幾個值）。
   遊戲本體（網頁、帶雜湊的程式與資料、圖示）安裝時就存起來；網頁每次先上網拿新版，沒有網路時用存起來的那份；
   其他（角色模型、配樂、示意圖）玩到時才存，也可以由設定一次下載全部。換版時刪掉舊的本體快取；模型快取跟著模型內容的雜湊換，模型沒變就不必重新下載。
   新版裝好後先等著，玩家按「更新」（頁面送 skipWaiting）才換手，不會玩到一半突然換掉。 */
const VERSION = '__VERSION__', CORE = __CORE__, EXTRA = __EXTRA__;
const CORE_C = 'tidal-core-' + VERSION, EXTRA_C = 'tidal-extra-__EXTRA_V__';
const BASE = new URL('./', self.location).pathname;
const rel = u => (u.pathname.startsWith(BASE) ? u.pathname.slice(BASE.length) : u.pathname);
const EXTRA_SET = new Set(EXTRA);

self.addEventListener('install', e => { e.waitUntil(caches.open(CORE_C).then(c => c.addAll(CORE))); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('tidal-') && k !== CORE_C && k !== EXTRA_C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;   // 字型等外部資源、laya 轉送交給瀏覽器
  if (req.mode === 'navigate') {   // 網頁：先上網（拿到新版），沒網路才用存起來的
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CORE_C).then(ca => ca.put(req, c)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match('isle.html'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok && EXTRA_SET.has(rel(url))) { const c = r.clone(); caches.open(EXTRA_C).then(ca => ca.put(req, c)); }   // 模型、配樂、示意圖：玩到時存起來
    return r;
  })));
});

self.addEventListener('message', e => {
  const d = e.data, port = e.ports && e.ports[0];
  if (d === 'skipWaiting') { self.skipWaiting(); return; }
  if (!d || !port) return;
  if (d.type === 'status') {   // 已經存了幾個模型與配樂
    e.waitUntil(caches.open(EXTRA_C).then(c => c.keys()).then(ks => { const have = new Set(ks.map(k => rel(new URL(k.url)))); port.postMessage({ version: VERSION, cached: EXTRA.filter(p => have.has(p)).length, total: EXTRA.length }); }));
  }
  if (d.type === 'cacheAll') {   // 一次下載全部，邊下載邊回報進度
    e.waitUntil((async () => {
      const c = await caches.open(EXTRA_C); let done = 0, failed = 0;
      for (const p of EXTRA) {
        try { if (!(await c.match(p))) { const r = await fetch(p); if (r.ok) await c.put(p, r); else failed++; } } catch (x) { failed++; }
        done++; port.postMessage({ done, total: EXTRA.length, failed });
      }
    })());
  }
});
