/* 潮汐小島 · 回憶錄：島上的重要時刻（第一條魚、稀有生物、第一場雪、和島民一起看夕陽……）自動記下一行字和一張小照片，
   也可以自己寫下今天的心情。文字跟著存檔（S().memo），照片存在這台裝置的 IndexedDB；一年後的同一天會提醒「一年前的今天」。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { dayKey } from './quiz.js';

const DB = 'tidal-isle-memo', ST = 'shots', MAX = 120;
function db() { return new Promise((res, rej) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function putImg(k, url) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction(ST, 'readwrite'); tx.objectStore(ST).put(url, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
async function getImg(k) { const d = await db(); return new Promise((res, rej) => { const q = d.transaction(ST).objectStore(ST).get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); }
async function delImg(k) { const d = await db(); return new Promise(res => { const tx = d.transaction(ST, 'readwrite'); tx.objectStore(ST).delete(k); tx.oncomplete = res; tx.onerror = res; }); }

const list = () => { const s = S(); s.memo = s.memo || []; return s.memo; };
const keys = () => { const s = S(); s.memoKeys = s.memoKeys || {}; return s.memoKeys; };
let pending = null;
/**
 * 記下一個時刻。opt.key：同一個 key 只記一次（例如 'snow:2026'）；opt.icon：前面的小圖示；opt.shot === false 不拍照
 * 照片在下一次畫面算繪後擷取（grab）
 */
export function add(title, sub, opt) {
  opt = opt || {};
  if (opt.key) { const K = keys(); if (K[opt.key]) return false; K[opt.key] = 1; }
  const e = { t: Date.now(), d: dayKey(), title, sub: sub || '', icon: opt.icon || '✨', img: false };
  const L = list(); L.push(e); while (L.length > MAX) { const old = L.shift(); if (old.img) delImg(old.t); }
  save();
  if (opt.shot !== false) pending = e;
  if (!opt.quiet) setTimeout(() => ui.toast(`📔 記進回憶錄：${title}`), 1600);
  return true;
}
/** 每幀算繪之後呼叫：有待拍的回憶就擷取一張小照片 */
export function grab(canvas) {
  if (!pending) return; const e = pending; pending = null;
  try {
    const W = 320, H = Math.round(canvas.height * W / canvas.width), c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(canvas, 0, 0, W, H);
    putImg(e.t, c.toDataURL('image/jpeg', 0.72)).then(() => { e.img = true; save(); }).catch(() => {});
  } catch (err) { /* 擷取失敗就只留文字 */ }
}
/** 新的一天：一年前（或更早）的同一天有回憶就提醒 */
export function anniversary() {
  const today = dayKey(), md = today.slice(5), y = +today.slice(0, 4);
  const hit = list().filter(e => e.d.slice(5) === md && +e.d.slice(0, 4) < y);
  if (!hit.length) return;
  const e = hit[hit.length - 1], n = y - +e.d.slice(0, 4);
  setTimeout(() => ui.toast(`📔 ${n} 年前的今天：${e.title}`), 4200);
}
const fmt = d => `${+d.slice(5, 7)} 月 ${+d.slice(8, 10)} 日`;
export async function open() {
  const body = ui.el('div', 'memo');
  const paint = async () => {
    const L = list().slice().reverse();
    body.innerHTML = `<div class="mm-top"><span>共 ${L.length} 個回憶</span></div>`;
    const write = ui.el('button', 'btn gold', '✏️ 寫下今天'); write.type = 'button'; write.onclick = () => diary(paint); body.querySelector('.mm-top').appendChild(write);
    if (!L.length) { body.appendChild(ui.el('p', 'muted', '還沒有回憶。釣到第一條魚、和島民一起看夕陽、遇到第一場雪……這些時刻都會自動記在這裡。')); return; }
    let month = '';
    const wrap = ui.el('div', 'mm-list');
    for (const e of L) {
      const m = e.d.slice(0, 7); if (m !== month) { month = m; wrap.appendChild(ui.el('h4', 'mm-month', `${m.slice(0, 4)} 年 ${+m.slice(5)} 月`)); }
      const card = ui.el('div', 'mm-card', `<div class="mm-pic">${e.img ? '' : `<span>${e.icon}</span>`}</div><div class="mm-txt"><small>${fmt(e.d)}</small><b>${e.icon} ${ui.esc(e.title)}</b>${e.sub ? `<p>${ui.esc(e.sub)}</p>` : ''}</div>`);
      if (e.img) getImg(e.t).then(u => { if (u) { const im = new Image(); im.src = u; im.alt = ''; card.querySelector('.mm-pic').appendChild(im); card.querySelector('.mm-pic').onclick = () => zoom(u, e); } }).catch(() => {});
      wrap.appendChild(card);
    }
    body.appendChild(wrap);
  };
  const zoom = (u, e) => { const z = ui.el('div', 'mm-zoom', `<img src="${u}" alt=""><b>${ui.esc(e.title)}</b><small>${e.d}</small>`); z.onclick = () => z.remove(); body.appendChild(z); };
  await paint(); ui.panel('回憶錄', body, { cls: 'memo-p' });
}
function diary(back) {
  const body = ui.el('div', 'mm-write', `<label>今天想記下什麼？<textarea maxlength="80" rows="3" placeholder="例如：第一次把三角函數的題目全部答對！"></textarea></label><p class="muted">會連同現在的島上風景一起收進回憶錄。</p>`);
  const ta = body.querySelector('textarea'), ok = ui.el('button', 'btn gold', '記下來'), no = ui.el('button', 'btn', '返回'); ok.type = no.type = 'button';
  ok.onclick = () => { const t = ta.value.trim(); if (!t) { ui.toast('寫一點什麼吧'); return; } ui.closePanel(); add(t, '我的日記', { icon: '✏️', quiet: true }); Audio.sfx('catch'); ui.toast('記進回憶錄了'); };
  no.onclick = () => open();
  body.append(ok, no); ui.panel('寫下今天', body, { cls: 'memo-p' }); setTimeout(() => ta.focus(), 50); void back;
}
