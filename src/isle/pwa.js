/* 潮汐小島 · 網頁版的安裝與離線（v8.9.2，PWA）：建置後的頁面註冊 service worker（build.py 產生的 sw.js），第一次打開就把遊戲本體存起來，之後沒有網路也能玩；
   角色模型、配樂與示意圖玩到時才存，也可以在設定裡一次下載全部。有新版本時畫面下方出現提示，按「更新」才重新整理換成新版。
   瀏覽器支援時，設定裡有「安裝到這台裝置」；iPhone、iPad 用 Safari 的「分享 → 加入主畫面」。開發版（本機的 src、file://）不註冊。 */
import * as ui from './ui.js';

const built = () => typeof window.__MODEL_BASE === 'string';   // 只有 build.py 產生的頁面有
let installEvt = null, waiting = null, ready = false;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function init() {
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  addEventListener('appinstalled', () => { installEvt = null; ui.toast('已經安裝到這台裝置，可以從桌面或主畫面打開'); });
  if (!built() || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then(r => {
    ready = true;
    if (r.waiting && navigator.serviceWorker.controller) offer(r.waiting);
    r.addEventListener('updatefound', () => {
      const w = r.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });   // 已經有舊版在管這一頁：新版裝好了，等玩家按更新
    });
    setInterval(() => r.update().catch(() => {}), 30 * 60 * 1000);   // 一直開著玩：每半小時看一次有沒有新版
  }).catch(e => console.warn('離線功能註冊失敗：', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (waiting) location.reload(); });   // 換成新版了（只在按了更新之後才重新整理）
}
/** 新版本裝好了：畫面下方一條提示 */
function offer(w) {
  if (document.getElementById('pwa-update')) return;
  const bar = ui.el('div', 'pwa-update', '<span>🌊 潮汐小島有新版本了</span>'); bar.id = 'pwa-update';
  const go = ui.el('button', 'btn gold', '更新'), later = ui.el('button', 'btn off', '等一下'); go.type = later.type = 'button';
  go.onclick = () => { waiting = w; go.disabled = true; go.textContent = '更新中…'; window.TA.Store.flush && window.TA.Store.flush(); w.postMessage('skipWaiting'); setTimeout(() => location.reload(), 4000); };   // 存好檔再換；萬一沒收到換手的通知，四秒後也會重新整理
  later.onclick = () => bar.remove();
  bar.append(go, later); document.body.appendChild(bar);
}
/** 問 service worker：sw 是 { type } 訊息，回傳的資料用 onMsg 收（下載全部時會一直回報進度） */
function ask(type, onMsg) {
  const c = navigator.serviceWorker && navigator.serviceWorker.controller; if (!c) return false;
  const ch = new MessageChannel(); ch.port1.onmessage = e => onMsg(e.data); c.postMessage({ type }, [ch.port2]); return true;
}
/** 設定面板裡的兩列：安裝到這台裝置、離線遊玩（row 是設定面板的排版函式，redraw 重畫面板） */
export function rows(row, redraw) {
  const out = [];
  if (installEvt) {
    const b = ui.el('button', 'btn gold', '安裝'); b.type = 'button';
    b.onclick = async () => { const e = installEvt; installEvt = null; e.prompt(); await e.userChoice.catch(() => null); redraw(); };
    out.push(row('安裝到這台裝置', '像一般 App 一樣從桌面或主畫面打開：全螢幕、沒有網址列，沒有網路也能玩', b));
  } else if (ios() && !standalone() && built()) {
    const b = ui.el('button', 'btn off', '說明'); b.type = 'button'; b.onclick = () => ui.toast('在 Safari 按下方的「分享」，選「加入主畫面」');
    out.push(row('加入主畫面', '在 Safari 按「分享」→「加入主畫面」，就能像 App 一樣從主畫面打開', b));
  }
  if (ready || (navigator.serviceWorker && navigator.serviceWorker.controller)) {
    const b = ui.el('button', 'btn', '下載全部'); b.type = 'button';
    const r = row('離線遊玩', '遊戲本體已經存在這台裝置，沒有網路也能玩。角色模型、配樂與示意圖玩到時才存；按「下載全部」一次存好（約 45 MB），之後完全不用網路', b);
    const note = r.querySelector('small');
    ask('status', d => { if (d.total) { const all = d.cached >= d.total; note.textContent += `（已存 ${d.cached}／${d.total} 個）`; if (all) { b.textContent = '已全部下載'; b.className = 'btn off'; b.disabled = true; } } });
    b.onclick = () => {
      b.disabled = true; b.textContent = '下載中…';
      const ok = ask('cacheAll', d => {
        b.textContent = `${d.done}／${d.total}`;
        if (d.done >= d.total) { b.textContent = d.failed ? '有幾個沒下載到' : '已全部下載'; ui.toast(d.failed ? `有 ${d.failed} 個檔案沒下載到，網路穩定時再按一次` : '全部下載好了：之後沒有網路也能完整遊玩', d.failed ? 'bad' : undefined); if (d.failed) b.disabled = false; }
      });
      if (!ok) { b.disabled = false; b.textContent = '下載全部'; ui.toast('離線功能還在準備中，重新整理後再試一次'); }
    };
    out.push(r);
  }
  return out;
}
