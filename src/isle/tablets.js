/* 潮汐小島 · 數學謎題石碑：島上三塊古老石碑，每天各刻著一道數學題庫的題目（同一份題庫與作答紀錄；
   依日期與石碑編號固定挑選，三塊出自不同單元）。每塊每天可以答一次，答對有鈴錢，三塊都解開再加碼；答對後可以接著連續挑戰。 */
import * as THREE from 'three';
import { scene, M, mesh } from './engine.js';
import { natureMaterial } from './naturemodels.js';
import { tileAt, groundAt } from './terrain.js';
import { blocked, colliders, label, SITES, homes, PLAZA } from './props.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { dayKey, record } from './quiz.js';
import * as miles from './miles.js';

/* v9.24.8 石碑的模型：弧頂、往上略收的碑身（邊緣倒角、表面微微不平），底下一塊寬一點的基座，正面一塊磨平的題板，腳邊幾團青苔。
   碑身與基座用主島岩石的石材著色（顆粒、凹坑與裂紋），靠地面的一段顏色深、帶一點青綠。以前是三個方塊加兩顆綠球，背面整面發黑 */
let STELE = null;
function stele() {
  if (STELE) return STELE;
  const hs = (a, b, c) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return v - Math.floor(v); };
  /** 合併同位置的頂點（倒角才是圓的）、表面加一點不平、上色 */
  const finish = (g0, tone) => {
    const p0 = g0.attributes.position, map = new Map(), pos = [], idx = [];
    const ix0 = g0.index ? g0.index.array : null, n = ix0 ? ix0.length : p0.count;
    for (let k = 0; k < n; k++) { const i = ix0 ? ix0[k] : k, key = Math.round(p0.getX(i) * 2e3) + ',' + Math.round(p0.getY(i) * 2e3) + ',' + Math.round(p0.getZ(i) * 2e3); let j = map.get(key); if (j == null) { j = pos.length / 3; map.set(key, j); pos.push(p0.getX(i), p0.getY(i), p0.getZ(i)); } idx.push(j); }
    const col = [], c = new THREE.Color(), low = new THREE.Color('#77785f'), hi = new THREE.Color(tone);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2], w = 0.012;
      pos[i] += (hs(x * 9, y * 9, z * 9) - 0.5) * w; pos[i + 1] += (hs(y * 9, z * 9, x * 9) - 0.5) * w * (y > 0.02 ? 1 : 0); pos[i + 2] += (hs(z * 9, x * 9, y * 9) - 0.5) * w;
      const damp = Math.max(0, 1 - y / 0.42) * (0.55 + 0.45 * hs(x * 3, z * 3, 1)), k = 0.93 + 0.14 * hs(x * 5, y * 5, z * 5);
      c.copy(hi).lerp(low, damp * 0.6).multiplyScalar(k); col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); g0.dispose(); return g;
  };
  const body = new THREE.Shape(); body.moveTo(-0.4, 0); body.lineTo(0.4, 0); body.lineTo(0.37, 1.02); body.absellipse(0, 1.02, 0.37, 0.3, 0, Math.PI, false); body.lineTo(-0.4, 0);
  const slab = new THREE.ExtrudeGeometry(body, { depth: 0.15, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 14 }); slab.translate(0, 0.14, -0.075);
  const foot = new THREE.Shape(); foot.moveTo(-0.56, -0.27); foot.lineTo(0.56, -0.27); foot.lineTo(0.56, 0.27); foot.lineTo(-0.56, 0.27); foot.lineTo(-0.56, -0.27);
  const base = new THREE.ExtrudeGeometry(foot, { depth: 0.13, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.03, bevelSegments: 2 }); base.rotateX(-Math.PI / 2); base.translate(0, 0.03, 0);
  const a = finish(slab, '#b3ad9f'), b = finish(base, '#a39d90');
  const pa = a.attributes, pb = b.attributes, P2 = [...pa.position.array, ...pb.position.array], C2 = [...pa.color.array, ...pb.color.array], N2 = [...pa.normal.array, ...pb.normal.array], I2 = [...a.index.array, ...Array.from(b.index.array, i => i + pa.position.count)];
  const stone = new THREE.BufferGeometry(); stone.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); stone.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3)); stone.setAttribute('normal', new THREE.Float32BufferAttribute(N2, 3)); stone.setIndex(I2);
  const pan = new THREE.Shape(); pan.moveTo(-0.27, 0.55); pan.lineTo(0.27, 0.55); pan.lineTo(0.27, 1.12); pan.absellipse(0, 1.12, 0.27, 0.2, 0, Math.PI, false); pan.lineTo(-0.27, 0.55);
  const panel = new THREE.ExtrudeGeometry(pan, { depth: 0.012, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 12 }); panel.translate(0, 0, 0.1); { const n = panel.attributes.position.count, pc = new THREE.Color('#8e897b'), arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) pc.toArray(arr, i * 3); panel.setAttribute('color', new THREE.BufferAttribute(arr, 3)); }   // 題板：比碑身深一點的同一種石頭
  // 青苔：腳邊幾團扁扁的、凹凸不平的小丘
  const MP = [], MC = [], MI = [], mc = new THREE.Color();
  [[0.43, 0.16, 0.24, 0.13], [-0.45, 0.15, 0.2, 0.1], [0.5, 0.15, -0.16, 0.08], [-0.3, 0.16, 0.27, 0.07], [0.12, 0.16, 0.28, 0.06], [-0.52, 0.02, 0.02, 0.09]].forEach(([x, y, z, r], k) => {
    const s = new THREE.IcosahedronGeometry(1, 2), sp = s.attributes.position, m2 = new Map();
    for (let i = 0; i < sp.count; i++) {
      const vx = sp.getX(i), vy = sp.getY(i), vz = sp.getZ(i), bump = 1 + 0.22 * Math.sin(vx * 5 + k) * Math.cos(vz * 6 - vy * 4 + k * 1.7);
      const key = Math.round(vx * 1e3) + ',' + Math.round(vy * 1e3) + ',' + Math.round(vz * 1e3); let j = m2.get(key);
      if (j == null) { j = MP.length / 3; m2.set(key, j); MP.push(x + vx * r * bump, y + Math.max(-0.2, vy) * r * 0.5 * bump, z + vz * r * bump); mc.set(k % 2 ? '#6d8848' : '#5f7b42').multiplyScalar(0.82 + 0.3 * Math.max(0, vy)); MC.push(mc.r, mc.g, mc.b); }
      MI.push(j);
    }
    s.dispose();
  });
  const moss = new THREE.BufferGeometry(); moss.setAttribute('position', new THREE.Float32BufferAttribute(MP, 3)); moss.setAttribute('color', new THREE.Float32BufferAttribute(MC, 3)); moss.setIndex(MI); moss.computeVertexNormals();
  return (STELE = { stone, panel, moss });
}

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
    const K = stele(); g.add(mesh(K.stone, natureMaterial('#ffffff', 'stone', true), 0, 0, 0), mesh(K.panel, natureMaterial('#ffffff', 'stone', true), 0, 0, 0), mesh(K.moss, natureMaterial('#ffffff', 'plain', true), 0, 0, 0, { noCast: true }));
    const sym = label(['∑', 'π', '√'][stones.length], '#4f545e', 0.5, 0.5); sym.position.set(0, 0.95, 0.128); g.add(sym);
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
  const i = await ui.ask(TAB, `石碑上刻著：${q.q}`, q.o, { answer: q.a, abc: true, keys: true, html: true }), ok = i === q.a;
  if (dayKey() !== D.d) { ui.toast('日期換了，石碑上的題目也換成今天的了'); return; }
  // 先把獎勵與紀錄一次結算存檔，再顯示解析（避免中途重新整理漏發）
  record(q, ok);   // 同一份作答紀錄（答錯會記進錯題）
  const s = S(); D.done[st.k] = ok ? 'ok' : 'no'; let bonus = false;
  if (ok) { s.bells += 600; if (stones.every(t => D.done[t.k] === 'ok') && !D.bonus) { D.bonus = true; bonus = true; s.bells += 1000; s.stats = s.stats || {}; s.stats.tablets = (s.stats.tablets || 0) + 1; } }
  save();
  if (!ok) { Audio.sfx('bad'); await ui.explain(TAB, q); return; }
  Audio.sfx('catch'); miles.add('puzzle');
  await ui.say(TAB, '石碑發出微光——答對了！得到 600 鈴錢。'); await ui.say(TAB, q.e, { html: true });
  if (bonus) await ui.card({ icon: '', title: '三塊石碑全部解開！', sub: '額外獎勵 1,000 鈴錢。明天會有新的題目。' });
  await challenge.keepGoing(TAB, q);   // 石碑接著浮現新的數學題（數學題庫，越答越難）
  hooks.paint && hooks.paint();
}
