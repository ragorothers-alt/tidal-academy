/* 潮汐小島 · 游泳與潛點（v9.0）：在阿潮的店買了潛水衣，就能從沙灘走進海裡游泳（以前一下水就被浪推回岸邊）。
   海面上冒泡泡的地方是潛點，游過去按 E 潛下去（dive.js）。潛點每天換位置、潛過的當天就不再冒泡；
   潮位會改變潛得到的範圍：退潮時珊瑚礁太淺潛不下去，漲潮時離岸較遠的外海深水潛點才會出現。 */
import * as THREE from 'three';
import { scene, bend } from './engine.js';
import { N, C, T, warp, tileAt, seaMesh } from './terrain.js';
import { onPier } from './props.js';
import { S, save } from './state.js';
import { dayKey } from './quiz.js';
import * as tide from './tide.js';

export const SINK = 1.05;   // 游泳時腳比海面低多少（肩膀在水面上）
export const WHERE = { shallow: '淺灘', seagrass: '海草床', reef: '珊瑚礁', deep: '外海深處' };
const EDGE = C - 2.5;   // 網格邊緣再往內：再遠就是看不到底的外海
/** 穿著潛水衣 */
export const has = () => !!S().wetsuit;
/** 這裡是可以游泳的海（不含河、碼頭、網格外的外海） */
export const sea = (x, z) => Math.abs(x) < EDGE && Math.abs(z) < EDGE && tileAt(x, z) === -1 && !onPier(x, z);
/** 現在的潮位能潛的地形：退潮時珊瑚礁太淺、漲潮時才到得了外海 */
export function open(where, lv = tide.lvl()) { return where === 'reef' ? lv > -0.45 : where === 'deep' ? lv > 0.25 : true; }

/* ---------- 離岸距離（格）：從陸地往海裡一格一格擴散 ---------- */
let dist = null;
function distances() {
  if (dist) return dist;
  dist = new Float32Array(N * N).fill(1e9); const q = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) !== -1) { dist[z * N + x] = 0; q.push(z * N + x); }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], x = k % N, z = (k - x) / N;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
      const j = nz * N + nx; if (dist[j] > dist[k] + 1) { dist[j] = dist[k] + 1; q.push(j); }
    }
  }
  return dist;
}

/* ---------- 今天的潛點 ---------- */
const PLAN = [['shallow', 2, 4], ['shallow', 2, 5], ['seagrass', 3, 6], ['seagrass', 4, 8], ['reef', 5, 10], ['reef', 6, 11], ['deep', 11, 99]];   // 地形、離岸最近、最遠（格）
let spots = [], key = '';
const group = new THREE.Group(); scene.add(group);
const bubGeo = new THREE.SphereGeometry(0.05, 6, 4), ringGeo = new THREE.RingGeometry(0.42, 0.55, 28).rotateX(-Math.PI / 2);
const bubMat = bend(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false }));
const ringMat = bend(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
function seeded(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function build(day) {
  group.clear(); spots = [];
  const D = distances(), rnd = seeded([...day].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1), taken = [];
  PLAN.forEach(([where, lo, hi], i) => {
    const cand = [];
    for (let z = 2; z < N - 2; z++) for (let x = 2; x < N - 2; x++) {
      const d = D[z * N + x]; if (d < lo || d > hi) continue;
      const [wx, wz] = warp(x - C + 0.5, z - C + 0.5);
      if (sea(wx, wz) && sea(wx + 1.2, wz) && sea(wx - 1.2, wz) && sea(wx, wz + 1.2) && sea(wx, wz - 1.2) && !taken.some(([ax, az]) => Math.hypot(ax - wx, az - wz) < 9)) cand.push([wx, wz]);
    }
    if (!cand.length) return;
    const [x, z] = cand[Math.floor(rnd() * cand.length)]; taken.push([x, z]);
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.renderOrder = 2; g.add(ring);
    const bubs = []; for (let b = 0; b < 7; b++) { const m = new THREE.Mesh(bubGeo, bubMat); m.renderOrder = 2; g.add(m); bubs.push({ m, t: rnd() * 1.4, x: 0, z: 0 }); }
    spots.push({ i, where, x, z, g, ring, bubs });
  });
}
const used = () => { const s = S(); if (!s.dives || s.dives.d !== dayKey()) s.dives = { d: dayKey(), used: [] }; return s.dives.used; };
/** 潛過的潛點：今天不再冒泡 */
export function use(sp) { const u = used(); if (!u.includes(sp.i)) u.push(sp.i); save(); }
const live = sp => !used().includes(sp.i) && open(sp.where);
/** 游到旁邊的潛點（沒有就回傳 null） */
export function near(x, z) { let best = null, bd = 1.6; for (const sp of spots) { const d = Math.hypot(sp.x - x, sp.z - z); if (d < bd && live(sp)) { bd = d; best = sp; } } return best; }
/** 每幀：潛點的泡泡與水圈（沒有潛水衣就不顯示） */
export function update(dt, t) {
  const d = dayKey(); if (d !== key) { key = d; build(d); }
  const on = has(), y = seaMesh.position.y;
  group.visible = on; if (!on) return;
  for (const sp of spots) {
    const vis = live(sp); sp.g.visible = vis; if (!vis) continue;
    sp.g.position.y = y; sp.ring.scale.setScalar(1 + 0.18 * Math.sin(t * 2.2 + sp.i)); ringMat.opacity = 0.28 + 0.1 * Math.sin(t * 2.2);
    for (const b of sp.bubs) {
      b.t += dt; if (b.t > 1.4) { b.t = 0; b.x = (Math.random() - 0.5) * 0.7; b.z = (Math.random() - 0.5) * 0.7; }
      const k = b.t / 1.4; b.m.position.set(b.x, -0.05 + k * 0.22, b.z); b.m.scale.setScalar(k < 0.85 ? 0.6 + k : (1 - k) * 9);   // 冒上來、在水面破掉
    }
  }
}
export const debug = () => spots.map(sp => ({ i: sp.i, where: sp.where, x: +sp.x.toFixed(1), z: +sp.z.toFixed(1), live: live(sp) }));
