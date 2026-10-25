/* 潮汐小島 · 數學謎題石碑：島上三塊古老石碑，每天各刻著一道數學題庫的題目（同一份題庫與作答紀錄；
   依日期與石碑編號固定挑選，三塊出自不同單元）。每塊每天可以答一次，答對有鈴錢，三塊都解開再加碼；答對後可以接著連續挑戰。 */
import * as THREE from 'three';
import { scene, M, mesh } from './engine.js';
import { tileAt, groundAt } from './terrain.js';
import { blocked, colliders, label, SITES, homes, PLAZA } from './props.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { dayKey, record } from './quiz.js';
import * as miles from './miles.js';

let P = null, hooks = {};
export const stones = [];
const near = (x, z, r) => P && Math.hypot(P.position.x - x, P.position.z - z) < r;
function place() {
  const spots = [[-24, 2], [33, -13], [10, 33], [31, 10], [-14, -30], [-36, 8]];   // v6.79 新島：西邊草原、燈塔海角、南邊草地、東花園、水道橋下、西海岸
  for (const [cx, cz] of spots) {
    if (stones.length >= 3) break;
    let best = null;
    for (let k = 0; k < 60 && !best; k++) {
      const x = cx + (k % 8 - 4) * 0.5, z = cz + Math.floor(k / 8 - 4) * 0.5, t = tileAt(x, z);
      const land = (px, pz) => tileAt(px, pz) === t && Math.abs(groundAt(px, pz) - groundAt(x, z)) < 0.05;
      if ((t !== 1 && t !== 2) || ![[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3], [-0.7, 1.0], [0.7, 1.0], [0, 1.6], [-0.7, 1.6], [0.7, 1.6]].every(([dx, dz]) => land(x + dx, z + dz)) || blocked(x, z, 0.9) || blocked(x, z + 1.1, 0.5) || homes.some(h => Math.hypot(h.x - x, h.z - z) < 3.5) || Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 5) continue;
      if (Object.values(SITES).some(s => s && s.x != null && Math.hypot(s.x - x, s.z - z) < 4) || stones.some(s => Math.hypot(s.x - x, s.z - z) < 8)) continue;
      best = [x, z];
    }
    if (!best) continue;
    const [x, z] = best, g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
    g.add(mesh(new THREE.BoxGeometry(1.1, 0.18, 0.55), M('#9a958a'), 0, 0.09, 0));
    const slab = mesh(new THREE.BoxGeometry(0.85, 1.25, 0.22), M('#b8b2a4', { flatShading: true }), 0, 0.8, 0); g.add(slab);
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.7, 0.02), M('#8a8578'), 0, 0.85, 0.12));
    const sym = label(['∑', 'π', '√'][stones.length], '#5a5f6a', 0.5, 0.5); sym.position.set(0, 0.95, 0.135); g.add(sym);
    g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), M('#7fbf6a'), 0.4, 0.2, 0.2), mesh(new THREE.SphereGeometry(0.09, 8, 6), M('#6fae5a'), -0.42, 0.18, 0.18));
    g.traverse(o => { o.frustumCulled = false; }); scene.add(g); colliders.push({ x, z, r: 0.55 });
    stones.push({ x, z, k: stones.length, g });
  }
}
export function init(player, h) { P = player; hooks = h || {}; place(); }
const data = () => { const s = S(), d = dayKey(); if (!s.tablets || s.tablets.d !== d) s.tablets = { d, done: {} }; return s.tablets; };
const front = () => stones.find(s => near(s.x, s.z + 0.9, 1.0));
export const hint = () => { const s = front(); const d = s && data().done[s.k]; return s ? (d === 'ok' ? '看石碑（今天已解開）' : d ? '看石碑（今天已作答）' : '解開石碑上的數學題') : ''; };
export function handler() { const s = front(); return s ? () => read(s) : null; }
const TAB = { name: '數學石碑', color: '#8a8578', voice: 220 };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const fits = q => q && !q.pid && (!q.type || q.type === 'single');   // 單選題（不限長度：長題目會用大題目面板）
/** 今天第 k 塊石碑的題目：從數學題庫固定挑一題（同一天重新整理也一樣），三塊出自不同單元 */
function dailyQ(day, k) {
  const L = window.TA.L, all = (L.BY_SUBJECT.math || []).map(id => L.Q[id]).filter(fits);
  if (!all.length) return null;
  const units = [...new Set(all.map(q => q.unit))].sort(), u = units[(hash(day + ':tablet') + k * 3) % units.length];
  const pool = all.filter(q => q.unit === u), list = pool.length ? pool : all;
  return list[hash(day + '#' + k) % list.length];
}
async function read(st) {
  const D = data(), q = window.TA.L.view(dailyQ(D.d, st.k));   // 選項順序每次打亂
  if (!q) { await ui.say(TAB, '石碑上的字跡模糊，看不清楚……'); return; }
  if (D.done[st.k]) { await ui.say(TAB, D.done[st.k] === 'ok' ? '今天的題目已經解開了。明天石碑會浮現新的題目。' : '今天這塊石碑已經作答過了（答錯）。三塊都答對才有加碼，明天再挑戰吧。'); return; }
  const i = await ui.ask(TAB, `石碑上刻著：${q.q}`, q.o, { abc: true, keys: true, html: true }), ok = i === q.a;
  if (dayKey() !== D.d) { ui.toast('日期換了，石碑上的題目也換成今天的了'); return; }
  // 先把獎勵與紀錄一次結算存檔，再顯示解析（避免中途重新整理漏發）
  record(q, ok);   // 同一份作答紀錄（答錯會記進錯題）
  const s = S(); D.done[st.k] = ok ? 'ok' : 'no'; let bonus = false;
  if (ok) { s.bells += 600; if (stones.every(t => D.done[t.k] === 'ok') && !D.bonus) { D.bonus = true; bonus = true; s.bells += 1000; s.stats = s.stats || {}; s.stats.tablets = (s.stats.tablets || 0) + 1; } }
  save();
  if (!ok) { Audio.sfx('bad'); await ui.say(TAB, `正確答案是 ${ui.ansOf(q)}。`, { html: true }); await ui.say(TAB, q.e, { html: true }); return; }
  Audio.sfx('catch'); miles.add('puzzle');
  await ui.say(TAB, '石碑發出微光——答對了！得到 600 鈴錢。'); await ui.say(TAB, q.e, { html: true });
  if (bonus) await ui.card({ icon: '', title: '三塊石碑全部解開！', sub: '額外獎勵 1,000 鈴錢。明天會有新的題目。' });
  await challenge.keepGoing(TAB, q);   // 石碑接著浮現新的數學題（數學題庫，越答越難）
  hooks.paint && hooks.paint();
}
