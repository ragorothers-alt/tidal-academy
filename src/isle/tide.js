/* 潮汐小島 · 潮汐與潮池：依月相與時間算出潮位（簡化半日潮），海面跟著漲退；
   退潮時沙灘邊出現潮池，徒手撿拾潮間帶生物要答對地科「海洋」單元的題目。 */
import * as THREE from 'three';
import { scene, M, mesh, bend } from './engine.js';
import { tileAt, groundAt, seaMesh } from './terrain.js';
import { blocked } from './props.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { I, S, save, addItem, icon, stars, list } from './state.js';
import { pickQU, pickQ, record, dayKey, fairSec } from './quiz.js';
import { tideAt, tideTable, moonAge, moonPhase, tideRange } from './astro.js';
import * as miles from './miles.js';
import * as feel from './feel.js';

const LOW = -0.35, W = [0, 10, 6, 3, 1.2, 0.4];
let P = null, level = 0, pools = [], poolKey = '', busy = false;
const group = new THREE.Group(); scene.add(group);
export const isBusy = () => busy;
export function init(player) {
  P = player;
  const s = S(); list('sea').filter(x => !x.price && s.dex.sea[x.id] && !s.museum.sea[x.id]).forEach(x => { s.museum.sea[x.id] = s.dex.sea[x.id]; });   // 以前拍過照的保育類：補進博物館
}
export const now = date => tideAt(date || new Date());
export function state(date) { const d = date || new Date(), h = tideAt(d), h2 = tideAt(new Date(d.getTime() + 20 * 6e4)); return { h, rising: h2 > h, low: h < LOW }; }
export const icon2 = date => { const s = state(date); return s.low ? '🦀' : s.rising ? '🌊↑' : '🌊↓'; };

/* ---------- 潮池 ---------- */
function seeded(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function spots() {
  const r = seeded([...dayKey()].reduce((a, c) => a * 31 + c.charCodeAt(0), 5) >>> 0 || 1), out = [];
  for (let k = 0; k < 1500 && out.length < 6; k++) {
    const x = Math.round((r() - 0.5) * 90) + 0.5, z = Math.round((r() - 0.5) * 90) + 0.5;   // v6.79 的島延伸到 ±44
    if (tileAt(x, z) !== 0 || blocked(x, z, 0.8)) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => tileAt(x + dx, z + dz) === -1)) continue;
    if (out.some(o => Math.hypot(o.x - x, o.z - z) < 6)) continue;
    out.push({ x, z });
  }
  return out;
}
function roll(where) {
  const m = new Date().getMonth() + 1, pool = (I.SEALIFE || []).filter(sp => sp.where === where && (!sp.months || sp.months.includes(m)));
  if (!pool.length) return null; let sum = pool.reduce((a, sp) => a + (W[sp.rarity] || 1), 0), x = Math.random() * sum;
  for (const sp of pool) { x -= W[sp.rarity] || 1; if (x <= 0) return sp; } return pool[0];
}
const shadowMat = bend(new THREE.MeshBasicMaterial({ color: '#173c4a', transparent: true, opacity: 0.45, depthWrite: false }));
function showPools(on) {
  while (group.children.length) group.remove(group.children[0]); pools = [];
  if (!on || !(I.SEALIFE || []).length) return;
  const D = S(); D.tidePools = D.tidePools && D.tidePools.d === dayKey() ? D.tidePools : { d: dayKey(), got: {} };
  spots().forEach((o, i) => {
    const y = groundAt(o.x, o.z), g = new THREE.Group(); g.position.set(o.x, y + 0.012, o.z);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), bend(new THREE.MeshStandardMaterial({ color: '#4fb8c8', transparent: true, opacity: 0.75, roughness: 0.15 }))); pool.rotation.x = -Math.PI / 2; pool.scale.set(1.25, 0.9, 1); g.add(pool);
    [[0.75, 0.1], [-0.7, -0.25], [0.2, 0.6]].forEach(([a, b], k) => g.add(mesh(new THREE.DodecahedronGeometry(0.16 + k * 0.03, 0), M('#8a8478', { flatShading: true }), a, 0.06, b)));
    const mud = i % 3 === 2, n = (D.tidePools.got[i] || 0), cr = [];
    if (mud) { pool.material.color.set('#8a7a5a'); pool.material.opacity = 0.55; g.children.slice(1).forEach(c => { c.visible = false; }); for (let h = 0; h < 5; h++) g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 8), M('#4a3a2a'), Math.cos(h * 1.3) * 0.35, 0.012, Math.sin(h * 1.7) * 0.25, { noCast: true })); }
    for (let k = n; k < 2; k++) { const sp = roll(mud ? 'mud' : k ? 'rock' : 'pool'); if (!sp) continue; const s = new THREE.Mesh(new THREE.CircleGeometry(0.1 + sp.size * 0.04, 10), shadowMat); s.rotation.x = -Math.PI / 2; s.position.set((k ? 0.55 : -0.15) + Math.random() * 0.1, 0.02 + (k ? 0.12 : 0), (k ? -0.1 : 0.1)); g.add(s); cr.push({ sp, s, ph: Math.random() * 6 }); }
    g.traverse(m => { m.frustumCulled = false; }); group.add(g);
    pools.push({ i, o, g, cr, mud });
  });
}
/** 每幀：海面高度、潮池出現與否 */
export function update(dt, t, dateOverride) {
  const st = state(dateOverride); level += (st.h - level) * Math.min(1, dt * 0.5);
  seaMesh.position.y = 0.02 + level * 0.2;
  const key = (st.low ? 'low' : 'high') + dayKey();
  if (key !== poolKey) { poolKey = key; showPools(st.low); }
  pools.forEach(p => p.cr.forEach(c => { c.s.position.x += Math.sin(t * 1.3 + c.ph) * dt * 0.05; c.s.position.z += Math.cos(t * 1.1 + c.ph) * dt * 0.05; }));
}
export function refresh() { poolKey = ''; }
function facing() {
  if (!P || !pools.length) return null;
  const fx = P.position.x + Math.sin(P.rotation.y) * 0.9, fz = P.position.z + Math.cos(P.rotation.y) * 0.9;
  return pools.find(p => p.cr.length && (Math.hypot(p.o.x - fx, p.o.z - fz) < 1.1 || Math.hypot(p.o.x - P.position.x, p.o.z - P.position.z) < 1.0)) || null;
}
export const hint = tool => { const p = !tool && facing(); return p ? (p.mud ? '在泥灘上觀察' : '在潮池裡找生物') : ''; };
export function handler(tool) { const p = !tool && facing(); return p ? () => catchIn(p) : null; }
const POOL = { name: '潮池', color: '#2f9ab0', voice: 560 };
async function catchIn(p) {
  const c = p.cr[0], sp = c.sp; busy = true;
  try {
    const q = pickQU(['es-ocean'], 3) || pickQ('earth', 3); if (!q) return;
    const i = await ui.ask(POOL, `${sp.where === 'rock' ? '潮池邊的岩石上' : sp.where === 'mud' ? '泥灘上' : '潮池裡'}有東西！${q.q}`, q.o, { answer: q.a, abc: true, keys: true, html: true, timer: fairSec(25, q) });
    const ok = i === q.a; record(q, ok); ui.closeDialog(); feel.note(feel.hit(ok));
    const D = S().tidePools; D.got[p.i] = (D.got[p.i] || 0) + 1; p.g.remove(c.s); p.cr.shift(); save();
    if (!ok) { Audio.sfx('bad'); await ui.explain(null, q, `這次沒有完成${sp.name}的觀察紀錄……`); return; }
    miles.add('sea'); const s = S(), first = !s.dex.sea[sp.id]; s.dex.sea[sp.id] = s.dex.sea[sp.id] || Date.now();
    if (!sp.price) s.museum.sea[sp.id] = s.museum.sea[sp.id] || Date.now();   // 保育類只拍照、不採集（不會進口袋）：照片直接送進博物館展示
    const room = sp.price > 0 ? addItem({ k: 'sea', id: sp.id }) : true; save();
    await ui.card({ icon: icon(sp.id, 'sea'), title: `找到了${sp.name}！`, sub: sp.price > 0 ? '海洋題答對了！' : '海洋題答對了！已在原位拍照記錄，讓珊瑚繼續留在原處，不觸碰、不採集。照片已經送到博物館的潮池展區。', extra: `<span class="stars">${stars(sp.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}${room ? '' : '<em>口袋滿了，只好放回去。</em>'}` });
    await challenge.keepGoing(POOL, q);
  } finally { busy = false; }
}

/* ---------- 潮汐表（手機） ---------- */
export function openTable(date) {
  const d = date || new Date(), age = moonAge(d), tab = tideTable(d), st = state(d), body = ui.el('div', 'tide');
  const fmt = t => `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.round((t % 1) * 60) % 60).padStart(2, '0')}`;
  const W2 = 320, H2 = 110, pts = []; for (let m = 0; m <= 1440; m += 20) { const dd = new Date(d); dd.setHours(0, m, 0, 0); pts.push(`${(m / 1440 * W2).toFixed(1)},${(H2 / 2 - tideAt(dd) * H2 * 0.42).toFixed(1)}`); }
  const nx = (d.getHours() + d.getMinutes() / 60) / 24 * W2;
  body.innerHTML = `<p><b>${moonPhase(age)}</b>（月齡 ${age.toFixed(1)} 天）· ${tideRange(age) > 0.85 ? '大潮' : tideRange(age) < 0.55 ? '小潮' : '中潮'} · 現在${st.low ? '潮位較低，潮池露出了！' : st.rising ? '漲潮中' : '退潮中'}</p>
    <svg viewBox="0 0 ${W2} ${H2}" class="tide-svg"><rect x="0" y="${H2 / 2 - LOW * H2 * 0.42}" width="${W2}" height="${H2}" fill="#f3e2b8"/><polyline points="${pts.join(' ')}" fill="none" stroke="#2f9ab0" stroke-width="3"/><line x1="${nx}" x2="${nx}" y1="0" y2="${H2}" stroke="#ff7a5a" stroke-width="2" stroke-dasharray="4 3"/></svg>
    <div class="tide-row">${tab.map(x => `<span class="${x.high ? 'hi' : 'lo'}">${x.high ? '滿潮' : '乾潮'} ${fmt(x.t)}</span>`).join('')}</div>
    <p class="muted">潮汐主要由月球引力造成：月亮過中天與下中天附近滿潮，兩次滿潮相隔約 12 小時 25 分，所以每天的潮時約晚 50 分鐘。新月、滿月前後，太陽、地球與月球接近共線，日月的引潮效應相互加強，通常形成潮差較大的大潮；上、下弦月前後則通常形成小潮。本圖採簡化的半日潮模型示意，實際潮汐還受地形與海流影響（台灣各地潮型也不同）。圖中沙色區域表示潮位低於探索門檻，這時沙灘邊會露出潮池與泥灘。</p>`;
  ui.panel('潮汐表', body, { cls: 'phone' });
}
export const debug = () => pools.map(p => [p.o.x, p.o.z, p.cr.map(c => c.sp.id)]);
