/* 潮汐小島 · 拍照模式：按 P 隱藏介面，拖曳旋轉鏡頭、滾輪縮放，選濾鏡後拍照；
   照片存在這台裝置的相簿（IndexedDB，最多 30 張），可以下載。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { dayKey } from './quiz.js';
import * as miles from './miles.js';

export const FILTERS = [
  ['原色', ''], ['暖陽', 'sepia(.25) saturate(1.25) brightness(1.05)'], ['懷舊', 'sepia(.6) contrast(.95) brightness(1.02)'],
  ['黑白', 'grayscale(1) contrast(1.1)'], ['夢幻', 'saturate(1.35) brightness(1.08) hue-rotate(-10deg)'], ['清涼', 'saturate(1.1) hue-rotate(12deg) brightness(1.04)']
];
let on = false, bar = null, filter = 0, want = false, yaw = 0, pitch = 0, drag = null;
export const active = () => on;
/** 鏡頭偏移：依拖曳角度旋轉原本的鏡頭位置 */
export function offset(base) {
  const r = Math.hypot(base.x, base.z), y0 = Math.atan2(base.y, r), len = base.length(), p = Math.max(0.12, Math.min(1.35, y0 + pitch));
  return base.clone().set(Math.sin(yaw) * Math.cos(p) * len, Math.sin(p) * len, Math.cos(yaw) * Math.cos(p) * len);
}
export function toggle(indoor) { if (on) stop(); else start(indoor); }
function start(indoor) {
  on = true; yaw = 0; pitch = 0; document.body.classList.add('photo');
  bar = ui.el('div', 'photo-bar');
  bar.innerHTML = `<div class="pf">${FILTERS.map(([n], i) => `<button type="button" data-f="${i}"${i === filter ? ' class="on"' : ''}>${n}</button>`).join('')}</div><button type="button" class="shot" title="拍照（E）">📸</button><button type="button" class="pa">相簿</button><button type="button" class="px">✕</button><small>${matchMedia('(pointer: coarse)').matches ? (indoor ? '按 📸 拍照 · ✕ 離開' : '拖曳旋轉鏡頭 · 按 📸 拍照 · ✕ 離開') : indoor ? 'E 拍照 · Esc 離開' : '拖曳旋轉鏡頭 · 滾輪縮放 · E 拍照 · Esc 離開'}</small>`;
  document.body.appendChild(bar);
  bar.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { filter = +b.dataset.f; bar.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); apply(); }; });
  bar.querySelector('.shot').onclick = () => { want = true; };
  bar.querySelector('.pa').onclick = () => album();
  bar.querySelector('.px').onclick = stop;
  apply(); Audio.sfx('pop');
}
export function stop() { on = false; document.body.classList.remove('photo'); if (bar) bar.remove(); bar = null; document.getElementById('cv').style.filter = ''; }
const apply = () => { document.getElementById('cv').style.filter = FILTERS[filter][1]; };
export function key(e) {
  if (!on) return false;
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); want = true; }
  else if (e.code === 'Escape' || e.code === 'KeyP') stop();
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') yaw -= 0.12; else if (e.code === 'ArrowRight' || e.code === 'KeyD') yaw += 0.12;
  else if (e.code === 'ArrowUp' || e.code === 'KeyW') pitch = Math.min(0.6, pitch + 0.08); else if (e.code === 'ArrowDown' || e.code === 'KeyS') pitch = Math.max(-0.7, pitch - 0.08);
  return true;
}
export function pointerDown(e) { if (!on) return false; drag = { x: e.clientX, y: e.clientY, yaw, pitch }; return true; }
export function pointerMove(e) { if (!on || !drag) return; yaw = drag.yaw - (e.clientX - drag.x) * 0.008; pitch = Math.max(-0.7, Math.min(0.6, drag.pitch + (e.clientY - drag.y) * 0.005)); }
export function pointerUp() { drag = null; }
/** 每幀渲染之後呼叫：有拍照要求就從畫布擷取 */
export function grab(canvas) {
  if (!want) return; want = false;
  const W = Math.min(1280, canvas.width), H = Math.round(canvas.height * W / canvas.width), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.filter = FILTERS[filter][1] || 'none'; g.drawImage(canvas, 0, 0, W, H); g.filter = 'none';
  const fs = Math.round(W / 48); g.font = `800 ${fs}px system-ui, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'bottom';
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillText(`潮汐小島 ${dayKey().replace(/-/g, '.')}`, W - fs * 0.9 + 2, H - fs * 0.7 + 2); g.fillStyle = 'rgba(255,255,255,.92)'; g.fillText(`潮汐小島 ${dayKey().replace(/-/g, '.')}`, W - fs * 0.9, H - fs * 0.7);
  const url = c.toDataURL('image/jpeg', 0.86);
  flash(); Audio.sfx('catch'); miles.add('photo');
  put({ t: Date.now(), day: dayKey(), url }).then(n => ui.toast(`拍好了！相簿裡有 ${n} 張照片`)).catch(() => ui.toast('這台裝置無法儲存照片，請直接下載', 'bad'));
  lastUrl = url;
}
let lastUrl = null;
function flash() { if (ui.REDUCE.matches) return; const f = ui.el('div', 'photo-flash');   // v8.6 減少動態效果：不白閃
  document.body.appendChild(f); setTimeout(() => f.remove(), 450); }

/* ---------- 相簿（IndexedDB） ---------- */
const DB = 'tidal-isle-photos', ST = 'photos', MAX = 30;
function db() { return new Promise((res, rej) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 't' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function all() { const d = await db(); return new Promise((res, rej) => { const q = d.transaction(ST).objectStore(ST).getAll(); q.onsuccess = () => res(q.result.sort((a, b) => b.t - a.t)); q.onerror = () => rej(q.error); }); }
async function put(p) {
  const d = await db(); await new Promise((res, rej) => { const tx = d.transaction(ST, 'readwrite'); tx.objectStore(ST).put(p); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  const list = await all(); if (list.length > MAX) await Promise.all(list.slice(MAX).map(x => del(x.t)));
  return Math.min(MAX, list.length);
}
async function del(t) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction(ST, 'readwrite'); tx.objectStore(ST).delete(t); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
export async function album() {
  let list = []; try { list = await all(); } catch (e) { if (lastUrl) list = [{ t: 0, day: dayKey(), url: lastUrl }]; }
  const body = ui.el('div', 'album');
  const paint = () => {
    body.innerHTML = list.length ? '' : '<p class="muted">還沒有照片。按 P 進入拍照模式，E 拍照。</p>';
    const grid = ui.el('div', 'al-grid');
    list.forEach(p => { const b = ui.el('button', 'al-cell', `<img src="${p.url}" alt=""><small>${p.day}</small>`); b.type = 'button'; b.onclick = () => view(p); grid.appendChild(b); });
    body.appendChild(grid);
  };
  const view = p => {
    body.innerHTML = '';
    const v = ui.el('div', 'al-view', `<img src="${p.url}" alt=""><div class="al-act"></div>`), act = v.querySelector('.al-act');
    const dl = ui.el('a', 'btn gold', '下載'); dl.href = p.url; dl.download = `tidal-isle-${p.day}-${p.t}.jpg`;
    const rm = ui.el('button', 'btn', '刪除'); rm.type = 'button'; rm.onclick = async () => { try { await del(p.t); } catch (e) { /* 沒有 IndexedDB */ } list = list.filter(x => x !== p); paint(); };
    const back = ui.el('button', 'btn', '返回'); back.type = 'button'; back.onclick = paint;
    act.append(dl, rm, back); body.appendChild(v);
  };
  paint(); ui.panel(`相簿（${list.length} / ${MAX}）`, body, { cls: 'shop-p' });
}
