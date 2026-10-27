/* 潮汐小島 · 室外的燈光設計（v8.0）：步道柱燈、橋欄杆牆腳的藏燈、階梯的嵌燈、大樹的投光、渾天儀的重點光、廣場與市集的串燈。
   照明設計的原則：分層（月光是冷藍的環境光；步道的低燈是動線光；廣場、地標與樹是重點光；門窗是建築光），
   明暗有節奏（地上「光圈—暗—光圈」，燈與燈之間留暗），廣場最亮、主街次之、住宅巷再暗一點、海邊與高地最暗。
   光交給 glow.js 的燈光格子（每盞登記一個有光錐的發光點）；這裡只做燈具本身：海軍藍與黃銅的小燈具，
   同一種零件全島共用 InstancedMesh，燈芯白天是奶油色、晚上亮起來（engine.nightMats）。 */
import * as THREE from 'three';
import { scene, M, nightMats } from './engine.js';
import { groundAt, warp, tileAt, BRIDGES, STAIRS } from './terrain.js';
import { blocked, onRoad, colliders, chunkInstances, trees, SITES } from './props.js';
import * as glow from './glow.js';

const PLAN = window.TA.ISLE.PLAN;
const navy = M('#253346', { roughness: 0.62, metalness: 0.3 }, 'metal'), brass = M('#b69663', { roughness: 0.42, metalness: 0.6 }, 'metal');
const core = M('#ffe9cc', { emissive: new THREE.Color('#ffb46a'), emissiveIntensity: 0, roughness: 0.5 }, 'lampcore');
const slot = M('#ffe9cc', { emissive: new THREE.Color('#ffb46a'), emissiveIntensity: 0, roughness: 0.6 }, 'lampslot');
const stone = M('#e6dccb', {}, 'stone');
core.userData.glowK = 1.0; slot.userData.glowK = 0.55; nightMats.push(core, slot);   // 燈芯：晚上亮成琥珀色的一圈，白天是奶白的霧玻璃；藏起來的燈帶更暗（看得到光、看不到燈）

/** 幾個幾何合成一個（各自先擺好位置） */
function merge(list) {
  const P = [], Nn = [];
  list.forEach(g => { const q = g.index ? g.toNonIndexed() : g; P.push(...q.attributes.position.array); Nn.push(...q.attributes.normal.array); });
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return o;
}
const cyl = (r0, r1, h, y, n = 12) => new THREE.CylinderGeometry(r0, r1, h, n).translate(0, y, 0);
const part = (geo, mat) => ({ geo, mat, local: new THREE.Matrix4(), cast: false });
const at = (x, y, z, ry = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, s, s));
const OK_TILE = new Set([0, 1, 2, 5]);   // 沙灘、草地、台地、山頂（不放在水裡、階梯與橋上）
const NEAR = { lamp: 2.2, crystal: 1.6, lantern: 2.0, garden: 2.0, bollard: 4.5, uplight: 1.2, accent: 1.2 };   // 離已有的燈多遠以內就不再放（同一處不疊兩盞）
const crowded = (x, z) => glow.around(x, z, 4.5).some(e => Math.hypot(e.x - x, e.z - z) < (NEAR[e.kind] || 0));

/* ---------- 步道柱燈：高 0.6 公尺的海軍藍小柱，帽下一圈燈芯，光往下 ---------- */
const BOLLARD = [part(merge([cyl(0.1, 0.11, 0.05, 0.025), cyl(0.062, 0.072, 0.45, 0.275)]), navy), part(cyl(0.068, 0.068, 0.06, 0.53), core), part(merge([cyl(0.11, 0.085, 0.05, 0.585), cyl(0.04, 0.09, 0.035, 0.627)]), brass)];
const ROUTE = { 'Starward Main Street': 7, 'Academy Promenade': 8, 'Academy West Court': 8, 'Academy East Court': 8, 'Observatory Walk': 8, 'East Stair Approach': 8,
  'Lighthouse Walk': 12, 'Highland Path': 12, 'Spring Walk': 12, 'Summit Walk': 12, 'Camp Beach Walk': 12, 'South Meadow Walk': 12 };   // 每幾公尺一盞：主街最密，住宅巷 9.5，海邊與自然步道最疏
const bollards = [];
function bollard(x, z) {
  const y = groundAt(x, z);
  bollards.push(at(x, y, z)); colliders.push({ x, z, r: 0.14 });
  glow.emit({ x, y: y + 0.52, z, kind: 'bollard', axis: [0, -1, 0] });
}
function routeLights() {
  for (const r of PLAN.roads) {
    if (!/^(stone|earth|sand)$/.test(r.kind)) continue;
    const step = ROUTE[r.name] || 9.5, off = r.w / 2 + 0.42;
    let acc = step * 0.5, side = 1;
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (; acc < L; acc += step) {
        // 這一側放不下（樹、花台、建築、別條路）就試另一側，再前後挪一點；都不行就跳過
        let done = false;
        for (const [sd, ds] of [[side, 0], [-side, 0], [side, 1], [side, -1], [-side, 1], [-side, -1]]) {
          const s = Math.min(Math.max(acc + ds, 0), L), [x, z] = warp(a[0] + ux * s - uz * sd * off, a[1] + uz * s + ux * sd * off);
          if (!OK_TILE.has(tileAt(x, z)) || onRoad(x, z) || blocked(x, z, 0.4) || crowded(x, z)) continue;
          bollard(x, z); side = -sd; done = true; break;
        }
        if (!done) side = -side;
      }
      acc -= L;
    }
  }
}

/* ---------- 橋：欄杆牆腳藏一段段燈帶（上面一片石擋簷遮住燈），光落在橋面上（不勾整條亮線，段與段之間留暗） ---------- */
const strips = [];   // 細長燈帶的矩陣（單位長度的燈芯與擋簷，沿橋拉長、順著橋面的坡度）
function bridgeLights() {
  BRIDGES.forEach(br => {
    const [ax, az] = warp(br.a[0], br.a[1]), [bx, bz] = warp(br.b[0], br.b[1]), dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const ts = L > 5 ? [0.2, 0.5, 0.8] : [0.3, 0.7];
    ts.forEach(t => [-1, 1].forEach(sd => {
      const ox = -uz * sd * (br.w / 2 - 0.02), oz = ux * sd * (br.w / 2 - 0.02), x = ax + dx * t + ox, z = az + dz * t + oz;
      const y = br.base + 0.02 + 0.45 * Math.sin(Math.PI * t) + 0.16, slope = Math.atan(0.45 * Math.PI / L * Math.cos(Math.PI * t));
      strips.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.atan2(dz, dx) + (sd > 0 ? Math.PI : 0), sd > 0 ? -slope : slope, 'YXZ')), new THREE.Vector3(0.8, 1, 1)));
      glow.emit({ x: x - ox * 0.06, y, z: z - oz * 0.06, kind: 'rail', axis: [-ox, -0.55, -oz] });
    }));
  });
}

/* ---------- 階梯：兩側牆腳每隔一段一盞小嵌燈，照下一階的踏面 ---------- */
const steps = [];
function stairLights() {
  STAIRS.forEach(st => {
    if (!st.a || !st.b) return;
    const [ax, az] = warp(st.a[0], st.a[1]), [bx, bz] = warp(st.b[0], st.b[1]), dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    [0.22, 0.5, 0.78].forEach((t, i) => {
      const sd = i % 2 ? 1 : -1, ox = -uz * sd * (st.w / 2 - 0.2), oz = ux * sd * (st.w / 2 - 0.2), x = ax + dx * t + ox, z = az + dz * t + oz;   // 階梯模型兩側的矮牆內緣
      const y = st.y0 + (st.y1 - st.y0) * t + 0.16;
      steps.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(dz, dx)), new THREE.Vector3(1, 1, 1)));
      glow.emit({ x, y, z, kind: 'step', axis: [-ox * 1.5 + ux * 0.4, -1, -oz * 1.5 + uz * 0.4] });
    });
  });
}

/* ---------- 重點光：大樹從地面往上照亮樹冠下緣、渾天儀底座兩側的小投光、博物館柱廊的下照燈、館前與飯店前的樹 ---------- */
const cans = [];
function upAt(x, z, tx, ty, tz, kind) {
  const y = groundAt(x, z); cans.push(at(x, y, z));
  glow.emit({ x, y: y + 0.12, z, kind, axis: [tx - x, ty - y - 0.12, tz - z] });
}
function accentLights() {
  const big = PLAN.landmarks.find(l => l.kind === 'great-tree');
  if (big) {
    const [x, z] = warp(big.x, big.z), y = groundAt(x, z), pc = SITES.plaza, a0 = Math.atan2(pc.z - z, pc.x - x);
    [a0 - 0.55, a0 + 0.55].forEach(a => upAt(x + Math.cos(a) * 1.95, z + Math.sin(a) * 1.95, x, y + 3.4, z, 'uplight'));   // 樹座石圈外、朝廣場的那一側：從廣場看過去樹冠下緣是暖的
  }
  const f = SITES.fountain;
  if (f) { const y = groundAt(f.x, f.z), pc = SITES.plaza; [-0.9, 0.9].forEach(da => { const a = Math.atan2(pc.z + 6 - f.z, pc.x - f.x) + da; upAt(f.x + Math.cos(a) * 2.0, f.z + Math.sin(a) * 2.0, f.x, y + 1.9, f.z, 'accent'); }); }
  // 博物館柱廊、飯店拱廊下一盞往下照的燈：門口、台階與柱腳亮，山牆、圓頂與二樓留在月光裡
  [['museum', 0.9, 4], ['hotel', 0.7, 3]].forEach(([k, out, pw]) => {
    const d = PLAN.sites[k] && PLAN.sites[k].door; if (!d) return; const [x, z] = warp(d[0], d[1] + out);
    glow.emit({ x, y: groundAt(x, z) + 2.6, z, kind: 'accent', power: pw, cone: 0.3, axis: [0, -1, 0.35] });
  });
  // 博物館、飯店門前各挑一棵最近的樹（不是棕櫚，在正門那一側：建築都朝南 +z）投光
  ['museum', 'hotel'].forEach(k => {
    const d = PLAN.sites[k] && PLAN.sites[k].door; if (!d) return; const [sx, sz] = warp(d[0], d[1]), s = { x: sx, z: sz };
    const t = trees.filter(o => o.kind !== 'palm' && o.z > s.z - 1 && Math.hypot(o.x - s.x, o.z - s.z) < 10).sort((p, q) => Math.hypot(p.x - s.x, p.z - s.z) - Math.hypot(q.x - s.x, q.z - s.z))[0];
    if (!t) return; const a = Math.atan2(s.z - t.z, s.x - t.x), x = t.x + Math.cos(a) * 0.8, z = t.z + Math.sin(a) * 0.8;
    if (!blocked(x, z, 0.1)) upAt(x, z, t.x, groundAt(t.x, t.z) + 2.4 * t.s, t.z, 'uplight');
  });
}

/* ---------- 串燈：廣場三面與市集攤位前一串串的小燈泡（燈泡只是發光的小球，一串只配一兩個實光點） ---------- */
const bulbs = [], wires = [];
/** 從 A 拉到 B（[x, z, 離地高度]），中間垂下 sag 公尺；每 0.45 公尺一顆燈泡 */
function festoon(A, B, sag) {
  const ya = groundAt(A[0], A[1]) + A[2], yb = groundAt(B[0], B[1]) + B[2], L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(3, Math.round(L / 0.45));
  const p = t => new THREE.Vector3(A[0] + (B[0] - A[0]) * t, ya + (yb - ya) * t - 4 * sag * t * (1 - t), A[1] + (B[1] - A[1]) * t);
  for (let i = 1; i < n; i++) { const v = p(i / n); bulbs.push(at(v.x, v.y - 0.05, v.z)); }
  wires.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map(p)), 24, 0.008, 4, false));
  (L > 5 ? [0.3, 0.7] : [0.5]).forEach(t => { const v = p(t); glow.emit({ x: v.x, y: v.y - 0.1, z: v.z, kind: 'festoon', axis: [0, -1, 0] }); });
}
/** 找 (x, z) 附近的路燈或旗桿當串燈的掛點；沒有就立一根細的海軍藍燈桿 */
const masts = [];
function anchor(x, z, h) {
  const l = glow.around(x, z, 1.2).find(e => e.kind === 'lamp');
  if (l) return [l.x, l.z, h];
  if (!blocked(x, z, 0.3)) { masts.push(at(x, groundAt(x, z), z)); colliders.push({ x, z, r: 0.08 }); }
  return [x, z, h];
}
function festoons() {
  const pc = SITES.plaza; if (!pc) return;
  const [px, pz] = [pc.x, pc.z], ring = a => [px + Math.cos(a) * 7, pz + Math.sin(a) * 7];   // 廣場石板地外圈四盞路燈（props.decorations 擺的）
  const sw = anchor(...ring(2.35), 2.6), se = anchor(...ring(0.8), 2.6), nw = anchor(...ring(3.9), 2.6), ne = anchor(...ring(5.5), 2.6);
  const bn = PLAN.props.banners.slice(0, 2).map(([x, z]) => [...warp(x, z), 2.9]);   // 廣場南緣的兩根旗桿
  festoon(sw, se, 0.45);   // 南緣：從溪邊走進廣場，頭上一串燈
  if (bn.length === 2) { festoon(bn[0], nw, 0.4); festoon(bn[1], ne, 0.4); }   // 東西兩側：旗桿拉到北邊的路燈，留下北面（大樹與夜祭拱門）不遮
  PLAN.landmarks.filter(l => l.kind === 'market').forEach(l => {   // 市集攤位：棚前一小串，雨棚下一段燈帶照商品
    const [x, z] = warp(l.x, l.z);
    festoon([x - 0.95, z + 0.62, 2.3], [x + 0.95, z + 0.62, 2.3], 0.14);
    glow.emit({ x, y: groundAt(x, z) + 2.0, z: z + 0.45, kind: 'eave', axis: [0, -1, 0.25] });
  });
}

routeLights(); bridgeLights(); stairLights(); accentLights(); festoons();
if (bulbs.length) chunkInstances([part(new THREE.SphereGeometry(0.042, 8, 6), core)], bulbs, null, true);
if (wires.length) { const w = new THREE.Mesh(merge(wires), navy); w.matrixAutoUpdate = false; scene.add(w); }   // 電線合成一個網格（用自己的包圍球做視錐剔除）
if (masts.length) chunkInstances([part(merge([cyl(0.09, 0.1, 0.12, 0.06), cyl(0.032, 0.04, 2.7, 1.4, 8)]), navy), part(new THREE.SphereGeometry(0.05, 10, 8).translate(0, 2.78, 0), brass)], masts, null, true);
if (bollards.length) chunkInstances(BOLLARD, bollards, null, true);
if (strips.length) chunkInstances([part(new THREE.BoxGeometry(1, 0.025, 0.025).translate(0, 0, 0.0125), slot), part(new THREE.BoxGeometry(1.06, 0.03, 0.08).translate(0, 0.03, 0.035), stone)], strips, null, true);   // 燈帶貼著牆面（局部 +z 朝橋面），上面一片石擋簷
if (steps.length) chunkInstances([part(new THREE.BoxGeometry(0.2, 0.05, 0.03), core), part(new THREE.BoxGeometry(0.26, 0.012, 0.06).translate(0, 0.032, 0), navy)], steps, null, true);   // 嵌燈上緣一片小遮光板
if (cans.length) chunkInstances([part(merge([cyl(0.06, 0.07, 0.09, 0.045)]), navy), part(cyl(0.045, 0.045, 0.01, 0.094), core)], cans, null, true);
/** 除錯：各種新燈具的數量 */
export const counts = () => ({ bollards: bollards.length, strips: strips.length, steps: steps.length, cans: cans.length, bulbs: bulbs.length, wires: wires.length, masts: masts.length });
