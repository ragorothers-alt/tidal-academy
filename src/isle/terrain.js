/* 潮汐小島 · 地形：格子地圖（-1 海、0 沙灘、1 草地、2 高台、3 河／低地水潭、4 坡道（南北向）、5 山頂、6 高地池塘、7 坡道（東西向））、地形網格、海與河。
   v6.15 起格子擴大成 96×96：島的西邊長出「西部高地」（松林、竹林、山頂、高地池塘與瀑布），原本的島嶼範圍不變。 */
import * as THREE from 'three';
import { scene, bend, VC, TERRAIN, water, CLIFF } from './engine.js';

export const N = 96, C = N / 2;
/** 島嶼規劃（data/islandplan.js，v6.79 起的「星環學院」新島）：有規劃就照規劃的多邊形逐格分類，沒有就用舊的程序化島嶼 */
const PLAN = (globalThis.TA && globalThis.TA.ISLE && globalThis.TA.ISLE.PLAN) || null;
export const PLANNED = !!PLAN;
CLIFF.mason.value = PLAN ? 1 : 0;   // 新島：台地邊緣畫成白石擋土牆
/** 舊版格子的中心（存檔裡用格子編號記錄的資料要加上 GRID_SHIFT 換算） */
export const GRID_SHIFT = C - 32;
const tile = new Int8Array(N * N).fill(-1);
const inb = (x, z) => x >= 0 && z >= 0 && x < N && z < N;
export const T = (x, z) => (inb(x, z) ? tile[z * N + x] : -1);
const setT = (x, z, t) => { if (inb(x, z)) tile[z * N + x] = t; };
export const tileAt = (x, z) => { const [ux, uz] = unwarp(x, z); return T(Math.floor(ux + C), Math.floor(uz + C)); };

const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/* ---------- 地形扭曲：把格子的直角邊緣推成自然的曲線 ----------
   畫面上的地形、河面與海岸都經過 warp()；查詢高度、水域與格子時先用 unwarp() 換回格子座標，角色和地形就對得上。 */
const WA = 0.32;
export function warpOff(x, z) {   // 低頻讓海岸線彎曲，較高頻（約每格不同）讓相鄰轉角各自偏移、打破直線
  return [(noise(x * 0.3 + 3.1, z * 0.3 + 7.7) - 0.5) * 2 * WA + (noise(x * 0.73 + 5.3, z * 0.73 + 2.1) - 0.5) * 0.62,
          (noise(x * 0.3 + 11.3, z * 0.3 + 1.9) - 0.5) * 2 * WA + (noise(x * 0.73 + 9.7, z * 0.73 + 6.4) - 0.5) * 0.62];
}
export const warp = (x, z) => { const o = warpOff(x, z); return [x + o[0], z + o[1]]; };
/* 去階梯：格子角落上的頂點，若只有一格比它高（凸角）就往那一格的中心收、只有一格比它低（凹角）就往那一格推出去，
   斜向的海岸線、河岸與懸崖邊就從一格一格的鋸齒變成連續的斜線。同一個角落的頂點依高度各自判斷，所以牆面上下會一起對齊。 */
const CH = 0.36;
/** 角落的移動方向：看四格在這個角落的高度，只有兩種高度時——高的只有一格（凸角）就往那一格收，低的只有一格（凹角）就往那一格推。
    同一個角落的所有頂點（地面、崖頂、牆底）一起移，牆面才不會扭曲。碰到海、坡道或三種以上高度就不動。 */
function cornerShift(cx, cz) {
  const hs = [];
  for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
    const t = T(cx + dx, cz + dz); if (t === 4 || t === 7 || t === -1) return null;
    hs.push([cornerH(cx + dx, cz + dz, dx === -1 ? 1 : 0, dz === -1 ? 1 : 0), dx + 0.5, dz + 0.5]);
  }
  const lv = [...new Set(hs.map(h => h[0].toFixed(2)))]; if (lv.length !== 2) return null;
  const hi = Math.max(...lv.map(Number)), top = hs.filter(h => h[0] > hi - 0.005), low = hs.filter(h => h[0] <= hi - 0.005);
  const d = top.length === 1 ? top[0] : low.length === 1 ? low[0] : null;
  return d ? [d[1], d[2]] : null;
}
const shiftCache = new Map();
/** 格子角落 (cx, cz)（世界座標的整數點）要移多少，結果快取起來 */
function shiftAt(cx, cz) {
  const k = cx * 4096 + cz; let r = shiftCache.get(k);
  if (!r) { const d = cornerShift(cx + C, cz + C); r = d ? [d[0] * 2 * CH * 0.7071, d[1] * 2 * CH * 0.7071] : [0, 0]; shiftCache.set(k, r); }
  return r;
}
/** 所有頂點依所在格子四個角落的位移做雙線性內插：角落上的頂點就是角落的位移，邊上與牆面中間的頂點跟著兩端平順地移 */
function chamfer(P) {
  for (let i = 0; i < P.length; i += 3) {
    const X = P[i], Z = P[i + 2], fx = Math.floor(X + 1e-4), fz = Math.floor(Z + 1e-4), u = X - fx, v = Z - fz;
    const a = shiftAt(fx, fz), b = shiftAt(fx + 1, fz), c = shiftAt(fx, fz + 1), e = shiftAt(fx + 1, fz + 1);
    P[i] += (a[0] * (1 - u) + b[0] * u) * (1 - v) + (c[0] * (1 - u) + e[0] * u) * v;
    P[i + 2] += (a[1] * (1 - u) + b[1] * u) * (1 - v) + (c[1] * (1 - u) + e[1] * u) * v;
  }
}
export function unwarp(x, z) { let ux = x, uz = z; for (let i = 0; i < 3; i++) { const o = warpOff(ux, uz); ux = x - o[0]; uz = z - o[1]; } return [ux, uz]; }
/** 世界座標所在的格子（考慮地形扭曲） */
export const tileOf = (x, z) => { const [ux, uz] = unwarp(x, z); return [Math.floor(ux + C), Math.floor(uz + C)]; };

const RIVERS = PLAN ? PLAN.rivers.map(r => r.path) : [[[-6, -6.5], [-3, -2], [2, 1.5], [6, 6], [10, 11], [14, 15.5], [19, 19.5], [25, 25]]];
function distSeg(px, pz, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t); }
const pathDist = (x, z, P) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, distSeg(x, z, P[i], P[i + 1])); return d; };
export const riverDist = (x, z) => { let d = 1e9; for (const R of RIVERS) d = Math.min(d, pathDist(x, z, R)); return d; };
/* 廣場前的小溪：從西邊住家旁的泉水往東彎彎地流，在東南邊匯進大河。只改目前的地形（不影響舊版佈置用的分類，房子與樹不換位置） */
export const STREAM = PLAN ? PLAN.streams[0].path : [[-3.6, 14.3], [-1.2, 15.1], [1.5, 15.2], [4.2, 14.4], [7.5, 13.9], [10.6, 12.3]];
const STREAMS = PLAN ? PLAN.streams.map(s => s.path) : [STREAM];
export const streamDist = (x, z) => { let d = 1e9; for (const S of STREAMS) d = Math.min(d, pathDist(x, z, S)); return d - (!PLAN && Math.hypot(x - STREAM[0][0], z - STREAM[0][1]) < 1.6 ? 0.35 : 0); };   // 舊島：源頭的泉水寬一點

/* ---------- 照規劃分類（座標都是世界座標、還沒扭曲） ---------- */
function inPoly(x, z, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const edgeDist = (x, z, P) => { let d = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) d = Math.min(d, distSeg(x, z, P[j], P[i])); return d; };
/** v7.4：格子 (tx, tz) 在哪一個規劃的池塘裡（高地泉、柳池）；不是池塘回傳 null */
const pondOf = (tx, tz) => PLAN ? PLAN.ponds.find(pd => inPoly(tx - C + 0.5, tz - C + 0.5, pd.poly)) || null : null;
/** 池塘裡 (x, z)（未扭曲的座標）離岸多遠：0 = 岸邊、1 = 離岸 1.8 公尺以上 */
const pondK = (pd, x, z) => inPoly(x, z, pd.poly) ? THREE.MathUtils.smoothstep(edgeDist(x, z, pd.poly), 0, 1.8) : 0;
/** 折線加寬成帶狀（兩端平切，和規劃的 Shapely buffer 一樣）：點在帶子裡回傳沿線的進度 0–1 與到中線的距離，否則 null */
function inBand(x, z, P, w) {
  let best = null, s = 0; const L = P.reduce((a, p, i) => i ? a + Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0, 0) || 1;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, l = Math.sqrt(l2), u = ((x - a[0]) * dx + (z - a[1]) * dz) / l2;
    if ((u >= 0 || i > 0) && (u <= 1 || i < P.length - 2)) { const uc = Math.max(0, Math.min(1, u)), d = Math.hypot(x - a[0] - dx * uc, z - a[1] - dz * uc); if (d <= w / 2 && (!best || d < best.d)) best = { d, t: (s + uc * l) / L }; }
    s += l;
  }
  return best;
}
const LEVEL_T = { sea: -1, sand: 0, grass: 1, plateau: 2, river: 3, summit: 5, highpond: 6 };
function classifyPlan(wx, wz) {
  if (!inPoly(wx, wz, PLAN.coast)) return -1;
  let t = edgeDist(wx, wz, PLAN.coast) < PLAN.sandWidth || PLAN.sandZones.some(p => inPoly(wx, wz, p)) ? 0 : 1;
  for (const o of PLAN.plateaus.concat(PLAN.ponds)) if (inPoly(wx, wz, o.poly)) t = LEVEL_T[o.level];
  for (const o of PLAN.rivers.concat(PLAN.streams)) if (inBand(wx, wz, o.path, o.w)) t = 3;
  return t;
}

/**
 * 地形分類。x, z 是「舊版 64×64 格子」的編號（可以超出 0–63），雜訊都用舊編號計算，所以原本的海岸線完全不變。
 * legacy = true 時回傳 v6.15 以前的分類（props.js 用它沿用舊的亂數佈置，讓原本的樹與花不換位置）
 */
const HX = -28;   // 西部高地東緣（世界座標 x）
function classify(x, z, legacy) {
  if (PLAN) return classifyPlan(x - 32 + 0.5, z - 32 + 0.5);   // 新島沒有「舊版分類」：legacy 也照規劃
  const wx = x - 32 + 0.5, wz = z - 32 + 0.5, ang = Math.atan2(wz, wx), r = Math.hypot(wx, wz * 1.08);
  const base = 23 + 2.2 * Math.sin(ang * 3 + 1) + 1.4 * Math.sin(ang * 5 + 2) + (noise(x * 0.15, z * 0.15) - 0.5) * 2.4;
  let t = r < base - 3.4 ? 1 : r < base ? 0 : -1;
  if (!legacy) {
    // 西部高地：島的西側往外長出一大片陸地。只改動「舊版是海、或是西岸沙灘」的格子，原本的陸地與上面的東西都不動
    const west = THREE.MathUtils.smoothstep(Math.cos(ang - Math.PI), 0.05, 0.85);
    const edge = base + west * (21 + (noise(x * 0.2 + 3, z * 0.2) - 0.5) * 3);
    const fresh = t < 0 || (t === 0 && west > 0.02);
    if (fresh && west > 0.02) {
      t = r < edge - 3.4 ? 1 : r < edge ? 0 : -1;
      if (t < 0) return t;
      const hx = HX + (Math.abs(wz - 10) < 3 ? 0 : (noise(x * 0.25 + 7, z * 0.25) - 0.5) * 2.4);   // 高地東緣的懸崖（坡道那一段拉直）
      if (t === 1 && wx < hx && r < edge - 4.5) t = 2;
      if (t === 2 && Math.hypot((wx + 37) / 4.6, (wz - 2) / 5.6) + (noise(x * 0.4, z * 0.4 + 9) - 0.5) * 0.25 < 1) t = 5;   // 山頂
      const pondHi = Math.hypot((wx + 30.8) / 3.9, (wz + 8) / 2.4) < 1, pondLo = Math.hypot((wx + 25.4) / 2.7, (wz + 8) / 2.5) < 1;
      if (t === 2 && pondHi) return 6;
      if (t === 1 && (pondLo || (pondHi && wx >= hx))) return 3;
      return t;   // 新地區不套用舊的高台與河
    }
  }
  const pr = Math.hypot(wx / 11, (wz + 12.5) / 7) + (noise(x * 0.3 + 9, z * 0.3) - 0.5) * 0.22;
  if (t === 1 && pr < 1 && r < base - 6) t = 2;
  const rd = riverDist(wx, wz);
  if (t === 1 && rd < 1.15) t = 3;
  if (t === 0 && rd < 1.15) t = -1;
  if (!legacy && t === 1 && streamDist(wx, wz) < 1.05) t = 3;
  if (!legacy && t === 0 && wx > -6 && wx < 10 && wz > 15 && wz < 18) t = 1;   // 小溪南岸的沙洲一路平順地接到海灘，不留缺口
  return t;
}
for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) tile[z * N + x] = classify(x - (C - 32), z - (C - 32), false);
/* 規劃的瀑布：池塘邊緣到下游的河之間如果隔著一格陸地，鑿開成河道（瀑布要池塘緊鄰河面才畫得出來） */
if (PLAN) PLAN.falls.forEach(f => {
  const dir = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }[f.facing] || [1, 0];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const wx = x - C + 0.5, wz = z - C + 0.5, along = (wx - f.x) * dir[0] + (wz - f.z) * dir[1], side = Math.abs((wx - f.x) * dir[1] - (wz - f.z) * dir[0]);
    if (along > -0.5 && along < 1.6 && side < f.w / 2 && tile[z * N + x] === 1) tile[z * N + x] = 3;
  }
});
/** 小溪的格子：淺淺的溪床、水面幾乎和草地齊平（不像大河有一道深深的河岸） */
const creek = new Set();
for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (tile[z * N + x] === 3 && streamDist(x - C + 0.5, z - C + 0.5) < 1.3 && riverDist(x - C + 0.5, z - C + 0.5) > 1.6) creek.add(z * N + x);
export const isCreek = (x, z) => creek.has(z * N + x);
const CREEK_BED = 0.62, CREEK_WATER = 0.9;
/** 小溪南岸的沙洲（0–1）：溪邊一條淺色的細沙岸，往南漸漸變回草地；北岸是草地直接長到水邊（舊島才有） */
export function sandBank(x, z) {
  if (PLAN || x < -5.2 || x > 9) return 0;
  const d = streamDist(x, z); if (d > 3.8) return 0;
  if (streamDist(x, z - 0.6) >= d) return 0;   // 往北走沒有比較近 → 在小溪北邊
  const edge = (noise(x * 1.3 + 4, z * 1.3) - 0.5) * 0.7;
  return (1 - THREE.MathUtils.smoothstep(d, 1.7, 3.3 + edge)) * THREE.MathUtils.smoothstep(x, -5.2, -3.6);   // 溪邊是整片細沙，離溪越遠越淡、漸漸長出草
}
/** v6.15 以前的地形分類（世界座標） */
export const legacyTile = (x, z) => { const t = tileAt(x, z); return PLAN || t === 4 ? t : classify(Math.floor(x + 32), Math.floor(z + 32), true); };
/* ---------- 坡道／階梯 ----------
   舊島：兩條固定的 2×2 坡道。新島：規劃的每一道階梯（寬 w、從 a 爬到 b），沿線的高度從 from 層平順地升到 to 層；
   南北向的是 4、東西向的是 7（其他程式用這兩個值認坡道）。STAIRS 給 props.js 放階梯模型 */
export const STAIRS = [];
const STAIR_AT = new Map();   // 格子編號 → 階梯
const LEVEL_H = { sea: -1.1, sand: 0.35, grass: 1.0, plateau: 3.0, river: 0.2, summit: 5.0, highpond: 2.25 };
export const RAMP_X = [C + 4, C + 5];
export let rampZ = 0;
export const RAMP2_Z = [C + 10, C + 11];
export let ramp2X = 0;
if (PLAN) {
  PLAN.stairs.forEach(s => {
    const st = { ...s, y0: LEVEL_H[s.from], y1: LEVEL_H[s.to], ns: Math.abs(s.b[1] - s.a[1]) >= Math.abs(s.b[0] - s.a[0]) }; STAIRS.push(st);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (inBand(x - C + 0.5, z - C + 0.5, [s.a, s.b], s.w)) { setT(x, z, st.ns ? 4 : 7); STAIR_AT.set(z * N + x, st); }
  });
  const ns = STAIRS.find(s => s.ns), ew = STAIRS.find(s => !s.ns);   // 舊的匯出值：給還在用 RAMP_X／ramp2X 的程式一個大概的位置
  if (ns) { rampZ = Math.floor(Math.min(ns.a[1], ns.b[1]) + C); RAMP_X[0] = Math.floor(ns.a[0] + C) - 1; RAMP_X[1] = RAMP_X[0] + 1; }
  if (ew) { ramp2X = Math.floor(Math.min(ew.a[0], ew.b[0]) + C); RAMP2_Z[0] = Math.floor(ew.a[1] + C) - 1; RAMP2_Z[1] = RAMP2_Z[0] + 1; }
} else {
  for (let z = 2; z < C; z++) if (T(RAMP_X[0], z) === 2 && T(RAMP_X[0], z + 1) === 1) { rampZ = z; break; }
  RAMP_X.forEach(x => { setT(x, rampZ, 4); setT(x, rampZ + 1, 4); if (T(x, rampZ - 1) !== 2) setT(x, rampZ - 1, 2); });
  /* 西部高地的坡道（東西向，往東下坡）：在 z = 10 一帶找高地東緣 */
  for (let x = 2; x < C; x++) if (T(x, RAMP2_Z[0]) === 2 && T(x + 1, RAMP2_Z[0]) === 1) { ramp2X = x; break; }
  if (ramp2X) RAMP2_Z.forEach(z => { setT(ramp2X, z, 7); setT(ramp2X + 1, z, 7); if (T(ramp2X - 1, z) !== 2) setT(ramp2X - 1, z, 2); });
}
/** 階梯上 (wx, wz)（世界座標、已反扭曲）的高度 */
function stairY(st, wx, wz) {
  const dx = st.b[0] - st.a[0], dz = st.b[1] - st.a[1], t = Math.max(0, Math.min(1, ((wx - st.a[0]) * dx + (wz - st.a[1]) * dz) / (dx * dx + dz * dz)));
  return st.y0 + (st.y1 - st.y0) * t;
}
/* ---------- 橋 ----------
   舊島：廣場東邊一座平的木橋（只有河面那幾格）。新島：規劃的每一座石拱橋，橋下的格子（含兩岸）都算橋，
   橋面中間拱起來：y = 岸高 + 0.02 + 0.45·sin(π·t)（和 LMMODELS.bridge 的橋面同一個公式） */
export const BRIDGE = [], BRIDGES = [];
const BRIDGE_AT = new Map();
if (PLAN) {
  PLAN.roads.filter(r => r.kind === 'bridge').forEach(r => {
    const br = { a: r.path[0], b: r.path[r.path.length - 1], w: r.w, base: 1.0, name: r.name }; BRIDGES.push(br);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (inBand(x - C + 0.5, z - C + 0.5, [br.a, br.b], r.w)) { BRIDGE.push([x, z]); BRIDGE_AT.set(z * N + x, br); }
  });
} else { const bz = C + 2; for (let x = C; x < C + 9; x++) if (T(x, bz) === 3 || T(x, bz + 1) === 3) BRIDGE.push([x, bz], [x, bz + 1]); BRIDGE.forEach(b => BRIDGE_AT.set(b[1] * N + b[0], null)); }
export const isBridge = (x, z) => BRIDGE_AT.has(z * N + x);
function bridgeY(br, wx, wz) {
  if (!br) return 1.12;
  const dx = br.b[0] - br.a[0], dz = br.b[1] - br.a[1], t = Math.max(0, Math.min(1, ((wx - br.a[0]) * dx + (wz - br.a[1]) * dz) / (dx * dx + dz * dz)));
  return br.base + 0.02 + 0.45 * Math.sin(Math.PI * t);
}
/** 踏石：小路過小溪的地方（格子編號），踩在石頭上走過去 */
export const FORD = [];
const FORD_AT = new Set();
for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
  if (T(x, z) !== 3) continue; const wx = x - C + 0.5, wz = z - C + 0.5;
  const on = PLAN ? PLAN.roads.some(r => r.kind === 'stepping-stones' && inBand(wx, wz, r.path, r.w)) : wx > -1.6 && wx < 0.9 && wz > 12 && wz < 17;
  if (on) { FORD.push([x, z]); FORD_AT.add(z * N + x); }
}
export const isFord = (x, z) => FORD_AT.has(z * N + x);
export const FORD_Y = 0.98;   // 踏石頂端略高於小溪水面

export const HT = { '-1': -1.1, 0: 0.35, 1: 1.0, 2: 3.0, 3: 0.2, 5: 5.0, 6: 2.25 };
/** 水面高度：低地的河與水潭 0.7、高地池塘 2.75 */
export const WATER_Y = { 3: 0.7, 6: 2.75 };
export function tileTop(x, z, fz, fx) {
  const t = T(x, z);
  if ((t === 4 || t === 7) && PLAN) { const st = STAIR_AT.get(z * N + x); if (st) return stairY(st, x - C + (fx == null ? 0.5 : fx), z - C + (fz == null ? 0.5 : fz)); }
  if (t === 4) { const k = ((z - rampZ) + (fz == null ? 0.5 : fz)) / 2; return 3 - k * 2; }
  if (t === 7) { const k = ((x - ramp2X) + (fx == null ? 0.5 : fx)) / 2; return 3 - k * 2; }
  if (t === 3 && isCreek(x, z)) return CREEK_BED;
  return HT[t];
}
/** 格子角落的高度（cx, cz ∈ {0, 1}） */
const cornerH = (x, z, cx, cz) => tileTop(x, z, cz, cx);
export const groundAt = (x0, z0) => { const [x, z] = unwarp(x0, z0), tx = Math.floor(x + C), tz = Math.floor(z + C), k = tz * N + tx; if (BRIDGE_AT.has(k)) return bridgeY(BRIDGE_AT.get(k), x, z); if (FORD_AT.has(k)) return FORD_Y; const t = T(tx, tz); if ((t === 4 || t === 7) && STAIR_AT.has(k)) return stairY(STAIR_AT.get(k), x, z); if (t === 4) return tileTop(tx, tz, (z + C) - tz); if (t === 7) return tileTop(tx, tz, null, (x + C) - tx); if (t === 3 && isCreek(tx, tz)) return CREEK_BED; return HT[t] == null ? 0 : HT[t]; };
/** 某點是哪種水域：'sea' | 'river' | null */
export function waterAt(x0, z0) { const [x, z] = unwarp(x0, z0), tx = Math.floor(x + C), tz = Math.floor(z + C); if (isBridge(tx, tz) || isFord(tx, tz)) return null; const t = T(tx, tz); return t === -1 ? 'sea' : t === 3 || t === 6 ? 'river' : null; }
/** 某點的淡水水面高度（不是淡水就回傳 null） */
export const waterY = (x, z) => { const [tx, tz] = tileOf(x, z); return isCreek(tx, tz) ? CREEK_WATER : WATER_Y[T(tx, tz)] ?? null; };

/* ---------- 地形網格 ---------- */
// 明確表面分類只套用在主島網格；waves.js／trip.js 保留原 TERRAIN 的相容路徑。
// aSurface = (草, 沙, 白石[1牆身／2立體石], 水底)。不影響任何格子與高度查詢。
const surfaceMat = bend(TERRAIN.clone(), 'terrain');
surfaceMat.defines = { ...TERRAIN.defines, TA_SURFACE: '' };
/** 崖頂邊緣的取樣點 [x, y, z, 往外的方向 dx, dz]（世界座標）：grass.js 在這裡長出往下垂的草 */
export const cliffTops = [];
export const terrain = (function build() {
  const P = [], Cc = [], WALL = [], SF = [], RP = [], RC = [], RS = [];   // WALL：哪些頂點屬於崖壁（法線要平滑）
  let inWall = false, surface = [0, 0, 0, 0];
  const push = (x, y, z, c) => { P.push(x, y, z); Cc.push(c.r, c.g, c.b); WALL.push(inWall); SF.push(...surface); };
  const quad = (a, b, c, d, ca, cb, cc, cd) => { push(...a, ca); push(...b, cb); push(...c, cc); push(...a, ca); push(...c, cc); push(...d, cd); };
  const BED_SH = new THREE.Color('#c8d3b6'), BED_DP = new THREE.Color('#91afa6');   // 池底：淺岸的砂、池心的深青綠（Codex 第二輪 C6）
  const grassC = (x, z, hi) => { const n = noise(x * 0.45, z * 0.45); return new THREE.Color(hi ? '#a7bfa0' : '#9fb994').lerp(new THREE.Color(hi ? '#c4d4b4' : '#b8cba5'), n * 0.48); };
  const sandC = (x, z) => new THREE.Color('#f4e5ce').lerp(new THREE.Color('#e6ddce'), noise(x * 0.5, z * 0.5) * 0.7);   // 暖白的細沙
  const cornerC = (t, x, z, tx, tz) => t === 1 && sandBank(x, z) > 0 ? grassC(x, z, false).lerp(sandC(x, z), sandBank(x, z)) : t === 0 ? sandC(x, z) : t === 3 && isCreek(tx, tz) ? new THREE.Color('#c8d3b6').lerp(new THREE.Color('#b7c9b8'), noise(x * 0.9, z * 0.9)) : t === 3 || t === 6 ? (pondOf(tx, tz) ? BED_SH.clone().lerp(BED_DP, pondK(pondOf(tx, tz), x, z)) : new THREE.Color('#9fbdaf')) : grassC(x, z, t === 2 || t === 5);   // 小溪的溪底是淺色的細沙；池塘（v7.4）岸邊是淺色的砂底、往池心漸深
  const lip = new THREE.Color('#9fb994'), cliffT = new THREE.Color('#d8c7b4'), cliffB = new THREE.Color('#b5a6b5'), sandW = new THREE.Color('#e9dfce'), sandWB = new THREE.Color('#c7cfd0'), bankB = new THREE.Color('#bdc9b6');
  const bankSl = (x, z) => 0.42 + noise(x * 0.7, z * 0.7) * 0.18;   // 草岸斜坡在這個角點的寬度
  const rockG = new THREE.Color('#8d9d9a'), rockT = new THREE.Color('#d8c7b4'), rockB = new THREE.Color('#b5a6b5'), soil = new THREE.Color('#a89c96'), wc = new THREE.Color();
  /* 崖壁：從 b 到 a 的一面牆（底 y0、兩端的頂 yb、ya），細分成 3 × n 格。中間的頂點用世界座標的向量場水平推移，
     相鄰的牆共用的頂點推到同一個位置，轉角也不會裂開；頂與底那一排不動，和崖頂的草邊、下面的地面接得起來 */
  const cliffWall = (a, b, y0, ya, yb, dx, dz) => {
    surface = PLAN && Math.min(ya, yb) > 1.5 ? [0, 0, 1, 0] : [0, 0, 0, 0];
    const nu = 3, nv = Math.max(2, Math.round(Math.max(ya, yb) - y0) * 2), pt = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, x = b[0] + (a[0] - b[0]) * u, z = b[1] + (a[1] - b[1]) * u, top = yb + (ya - yb) * u, y = y0 + (top - y0) * v;
      let px = x, pz = z;
      if (j > 0 && j < nv) {
        const amp = 0.3 * Math.pow(Math.sin(Math.PI * v), 0.6);
        px += ((noise(x * 1.9 + y * 0.7, z * 1.9 - y * 0.5) - 0.5) + (noise(x * 4.3 + 7, y * 4.1 + z * 3.7) - 0.5) * 0.4) * amp;
        pz += ((noise(x * 1.9 - y * 0.6 + 11, z * 1.9 + y * 0.8 + 3) - 0.5) + (noise(z * 4.3 + 2, y * 4.1 - x * 3.7) - 0.5) * 0.4) * amp;
      }
      const band = 0.86 + 0.16 * noise(y * 3.4 + (x + z) * 0.25, (x - z) * 0.9), rocky = THREE.MathUtils.smoothstep(noise(x * 0.9 + 3, z * 0.9 + y * 1.3), 0.55, 0.8);
      const topSoil = THREE.MathUtils.smoothstep(v + (noise(x * 3.1, z * 3.1) - 0.5) * 0.12, 0.78, 0.9);   // 崖頂一層薄土
      wc.copy(rockB).lerp(rockT, v).lerp(rockG, rocky * 0.5).lerp(cliffT, 0.25).lerp(soil, topSoil * 0.85).multiplyScalar(band * (0.72 + 0.28 * Math.min(1, v * 2.5)));   // 灰米色岩層、灰色岩塊、牆腳較暗
      pt.push([[px, y, pz], wc.clone()]);
    }
    if (surface[2]) {
      // 沿原牆面的細分插值，凸出 3–5cm；不移動原地形頂點，頂面不高於原草皮邊。
      const wallPoint = (u, y, depth) => {
        const top = yb + (ya - yb) * u, fu = Math.min(nu - 1e-6, u * nu), fv = Math.min(nv - 1e-6, Math.max(0, (y - y0) / (top - y0) * nv));
        const i = Math.floor(fu), j = Math.floor(fv), a0 = fu - i, b0 = fv - j, p = [0, y, 0];
        for (const k of [0, 2]) p[k] = (pt[j * (nu + 1) + i][0][k] * (1 - a0) + pt[j * (nu + 1) + i + 1][0][k] * a0) * (1 - b0) + (pt[(j + 1) * (nu + 1) + i][0][k] * (1 - a0) + pt[(j + 1) * (nu + 1) + i + 1][0][k] * a0) * b0;
        p[0] += dx * depth; p[2] += dz * depth;
        chamfer(p); const [wx, wz] = warp(p[0], p[2]); return [wx, y, wz];
      };
      const stone = (u0, u1, lo, hi, depth) => {
        if (hi - lo < 0.07) return;
        const midU = (u0 + u1) * 0.5, midY = (lo + hi) * 0.5, centerBack = wallPoint(midU, midY, 0);
        const left = wallPoint(u0, midY, 0), right = wallPoint(u1, midY, 0), tangent = [(right[0] - left[0]) / (u1 - u0), (right[2] - left[2]) / (u1 - u0)];
        const len = Math.hypot(...tangent), normal = [tangent[1] / len, -tangent[0] / len];
        let lift = 0;
        for (const u of [u0, midU, u1]) for (const y of [lo, midY, hi]) { const p = wallPoint(u, y, 0); lift = Math.max(lift, (p[0] - centerBack[0]) * normal[0] + (p[2] - centerBack[2]) * normal[1]); }
        const planar = (u, y, d) => [centerBack[0] + tangent[0] * (u - midU) + normal[0] * (lift + d), y, centerBack[2] + tangent[1] * (u - midU) + normal[1] * (lift + d)];
        const du = 0.018, dy = Math.min(0.018, (hi - lo) * 0.18);
        const ring = (inset, d, back = false) => { const l = u0 + inset, r = u1 - inset, bot = lo + inset, top = hi - inset; return [[l + du, bot], [r - du, bot], [r, bot + dy], [r, top - dy], [r - du, top], [l + du, top], [l, top - dy], [l, bot + dy]].map(([u, y]) => back ? wallPoint(u, y, d) : planar(u, y, d)); };
        const rear = ring(0, -0.004, true), edge = ring(0, depth - 0.015), front = ring(0.014, depth), center = planar(midU, midY, depth);
        const color = new THREE.Color('#ece4d5');
        const tri = (a, b, c) => { for (const p of [a, b, c]) { RP.push(...p); RC.push(color.r, color.g, color.b); RS.push(0, 0, 2, 0); } };
        for (let k = 0; k < 8; k++) { const n = (k + 1) % 8; tri(center, front[n], front[k]); tri(front[k], front[n], edge[n]); tri(front[k], edge[n], edge[k]); tri(edge[k], edge[n], rear[n]); tri(edge[k], rear[n], rear[k]); }
      };
      const top = Math.min(ya, yb);
      stone(0.008, 0.992, Math.max(y0, top - 0.13), top - 0.005, 0.045);   // 每米分段的倒角壓頂；原走路高度照舊
      const row = Math.floor((y0 + top) * 0.5 / 0.38), lo = row * 0.38 + 0.018;
      if (hash(Math.floor((a[0] + b[0]) * 0.5), Math.floor((a[1] + b[1]) * 0.5)) > 0.58 && lo > y0 + 0.03 && lo + 0.34 < top - 0.17) stone(0.12, 0.88, lo, lo + 0.34, 0.04);
    }
    for (let k = 0; k < 4; k++) { const u = (k + 0.5) / 4; cliffTops.push([b[0] + (a[0] - b[0]) * u, yb + (ya - yb) * u, b[1] + (a[1] - b[1]) * u, dx, dz]); }   // 崖頂邊緣（垂草用）
    inWall = true;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const k = j * (nu + 1) + i, p00 = pt[k], p10 = pt[k + 1], p01 = pt[k + nu + 1], p11 = pt[k + nu + 2];
      quad(p00[0], p01[0], p11[0], p10[0], p00[1], p01[1], p11[1], p10[1]);
    }
    inWall = false;
  };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const t = T(x, z); if (t < 0) continue;
    surface = t === 0 ? [0, 1, 0, 0] : t === 3 || t === 6 ? [0, 0, 0, 1] : [1, 0, 0, 0];
    const X = x - C, Z = z - C, h00 = cornerH(x, z, 0, 0), h01 = cornerH(x, z, 0, 1), h11 = cornerH(x, z, 1, 1), h10 = cornerH(x, z, 1, 0);
    { const sink = PLAN && (t === 4 || t === 7) ? 0.3 : 0;   // 新島的階梯有模型：坡道面畫低一點藏在台階底下（走路高度照舊）
      quad([X, h00 - sink, Z], [X, h01 - sink, Z + 1], [X + 1, h11 - sink, Z + 1], [X + 1, h10 - sink, Z], cornerC(t, X, Z, x, z), cornerC(t, X, Z + 1, x, z), cornerC(t, X + 1, Z + 1, x, z), cornerC(t, X + 1, Z, x, z)); }
    const h = (h00 + h01 + h11 + h10) / 4, sloped = [];   // sloped：這格往外斜下去的邊（轉角要補一塊三角形）
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
      const nt = T(x + dx, z + dz);
      if (PLAN) { if ((t === 4 || t === 7) && STAIR_AT.get(z * N + x) === STAIR_AT.get((z + dz) * N + x + dx)) return; }   // 同一道階梯的格子之間不用牆
      else if ((t === 4 || t === 7) && (nt === t || nt === 2)) return;
      let nh = nt === 4 || nt === 7 ? 1 : nt === 3 && isCreek(x + dx, z + dz) ? CREEK_BED : HT[nt];
      if (PLAN && (nt === 4 || nt === 7)) {   // 旁邊是階梯：牆底到階梯在這條邊上比較低的那一端（高的那端藏在階梯面底下）
        const nx = x + dx, nz = z + dz, e = dx === 1 ? [[0, 0], [0, 1]] : dx === -1 ? [[1, 0], [1, 1]] : dz === 1 ? [[0, 0], [1, 0]] : [[0, 1], [1, 1]];
        nh = Math.min(cornerH(nx, nz, e[0][0], e[0][1]), cornerH(nx, nz, e[1][0], e[1][1]));
      } else if (t === 2 && (nt === 4 || nt === 7)) nh = 3 - 0.01;
      if (t === 7 && nt === 1) nh = 1;
      if (nh >= h - 0.01) return;
      let a, b;
      if (dx === 1) { a = [X + 1, Z + 1]; b = [X + 1, Z]; } else if (dx === -1) { a = [X, Z]; b = [X, Z + 1]; }
      else if (dz === 1) { a = [X, Z + 1]; b = [X + 1, Z + 1]; } else { a = [X + 1, Z]; b = [X, Z]; }
      const ha = t === 4 || t === 7 ? cornerH(x, z, a[0] - X, a[1] - Z) : h, hb = t === 4 || t === 7 ? cornerH(x, z, b[0] - X, b[1] - Z) : h;
      if (t === 7 && Math.max(ha, hb) <= nh + 0.01) return;
      surface = [0, 0, 0, 0];
      // 牆面的頂點順序要讓正面朝外（朝低的那一格）；反了會被當背面剔除，從外面看牆就消失、露出後面的海和天空
      if (t === 1 && nt === 0 && h - nh < 0.8 && !(sandBank(X + 0.5, Z + 0.5) > 0.5)) {   // 草地到海灘的矮岸：草皮圓圓地往沙灘斜下去（只改外觀，走路高度不變），不是一道垂直切開的土牆
        const sla = bankSl(a[0], a[1]), slb = bankSl(b[0], b[1]), gb = grassC(b[0], b[1], false), ga = grassC(a[0], a[1], false), mid = 0.55;   // 斜坡寬度每個角點各自算：相鄰兩格共用角點，坡腳連成一條線
        const mb = [b[0] + dx * slb * 0.35, nh + (hb - nh) * mid, b[1] + dz * slb * 0.35], ma = [a[0] + dx * sla * 0.35, nh + (ha - nh) * mid, a[1] + dz * sla * 0.35];
        surface = [1, 0, 0, 0];
        quad(mb, [b[0], hb, b[1]], [a[0], ha, a[1]], ma, gb.clone().multiplyScalar(0.82), gb, ga, ga.clone().multiplyScalar(0.82));
        surface = [0, 1, 0, 0];
        quad([b[0] + dx * slb, nh, b[1] + dz * slb], mb, ma, [a[0] + dx * sla, nh, a[1] + dz * sla], sandW, soil.clone().lerp(sandW, 0.35), soil.clone().lerp(sandW, 0.35), sandW);
        sloped.push({ dx, dz, a, b, ha, hb, nh, sl: (sla + slb) / 2, top: ga, bank: true });
        return;
      }
      if (nt === 3 && isCreek(x + dx, z + dz)) { const sandy = t === 1 && sandBank(X + 0.5, Z + 0.5) > 0.5, top = sandy ? sandW : lip, sl = sandy ? 0.55 : 0.25; quad([b[0] + dx * sl, nh, b[1] + dz * sl], [b[0], hb, b[1]], [a[0], ha, a[1]], [a[0] + dx * sl, nh, a[1] + dz * sl], bankB, top, top, bankB); return; }   // 岸往水裡斜下去：沙洲是一片緩緩沒入水中的淺灘，草岸短一點   // 小溪的岸很矮：草地（或沙洲）直接接到水邊，水底下是溪床的細沙，不畫岩壁與垂草
      if (t === 0 || (t === 1 && sandBank(X + 0.5, Z + 0.5) > 0.5)) { surface = [0, 1, 0, 0]; const sl = h - nh < 0.8 ? 0.5 : 0; if (sl) sloped.push({ dx, dz, a, b, ha, hb, nh, sl, top: sandW }); quad([b[0] + dx * sl, nh, b[1] + dz * sl], [b[0], hb, b[1]], [a[0], ha, a[1]], [a[0] + dx * sl, nh, a[1] + dz * sl], sandWB, sandW, sandW, sandWB); return; }   // 沙坡：矮的往外斜下去（只改外觀），不是垂直的一階   // 沙洲邊緣也是沙坡
      const l = 0.14; surface = [1, 0, 0, 0];
      { const lb = grassC(b[0], b[1], t === 2 || t === 5).multiplyScalar(0.92), la = grassC(a[0], a[1], t === 2 || t === 5).multiplyScalar(0.92); quad([b[0], hb - l, b[1]], [b[0], hb, b[1]], [a[0], ha, a[1]], [a[0], ha - l, a[1]], lb.clone().multiplyScalar(0.8), lb, la, la.clone().multiplyScalar(0.8)); }   // 崖頂的草皮邊：和旁邊草地同色、往下稍暗，不再是一整條亮綠色的邊
      cliffWall(a, b, nh, ha - l, hb - l, dx, dz);
    });
    surface = [0, 1, 0, 0];
    // 凸出的轉角：兩條互相垂直、都往外斜下去的邊在同一個角落交會，中間會留一個三角形的洞（看得到後面的海和天空）——補一塊三角形（正反兩面）
    for (const e1 of sloped) for (const e2 of sloped) {
      if (!e1.dx || !e2.dz) continue;
      const corner = [[e1.a, e1.ha], [e1.b, e1.hb]].find(([q]) => [e2.a, e2.b].some(r => Math.abs(r[0] - q[0]) < 1e-6 && Math.abs(r[1] - q[1]) < 1e-6));
      if (!corner) continue;
      const [[cx, cz], cy] = corner, p0 = [cx, cy, cz];
      if (e1.bank && e2.bank) {   // 草岸轉角：上段草色、下段土色到沙色（和兩邊的斜坡同一個分段），坡寬用這個角點的值
        const k = bankSl(cx, cz), p1 = [cx + e1.dx * k, e1.nh, cz], p2 = [cx, e2.nh, cz + e2.dz * k];
        const m1 = [cx + e1.dx * k * 0.35, e1.nh + (cy - e1.nh) * 0.55, cz], m2 = [cx, e2.nh + (cy - e2.nh) * 0.55, cz + e2.dz * k * 0.35];
        const gm = e1.top.clone().multiplyScalar(0.82), sm = soil.clone().lerp(sandW, 0.35), tri = (A, B, C, ca, cb, cc) => { push(...A, ca); push(...B, cb); push(...C, cc); push(...A, ca); push(...C, cc); push(...B, cb); };
        tri(p0, m1, m2, e1.top, gm, gm); tri(m1, p1, p2, sm, sandW, sandW); tri(m1, p2, m2, sm, sandW, sm);
      } else {
        const p1 = [cx + e1.dx * e1.sl, e1.nh, cz], p2 = [cx, e2.nh, cz + e2.dz * e2.sl];
        push(...p0, e1.top); push(...p1, sandW); push(...p2, sandW); push(...p0, e1.top); push(...p2, sandW); push(...p1, sandW);
      }
    }
  }
  const originalVertices = P.length / 3;
  for (let i = 0; i < RC.length; i++) Cc.push(RC[i]);
  for (let i = 0; i < RS.length; i++) SF.push(RS[i]);
  for (let i = 0; i < RP.length / 3; i++) WALL.push(false);
  chamfer(P);
  for (let i = 0; i < P.length; i += 3) { const [wx, wz] = warp(P[i], P[i + 2]); P[i] = wx; P[i + 2] = wz; }
  for (let i = 0; i < RP.length; i++) P.push(RP[i]);   // 凸石已在世界座標做平面倒角，避免再次扭曲正面
  { const T3 = cliffTops.flatMap(c => [c[0], c[1], c[2]]); chamfer(T3); cliffTops.forEach((c, i) => { const [wx, wz] = warp(T3[i * 3], T3[i * 3 + 2]); c[0] = wx; c[2] = wz; }); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  g.setAttribute('aSurface', new THREE.Float32BufferAttribute(SF, 4));
  g.userData.originalVertices = originalVertices; g.userData.reliefTriangles = RP.length / 9;
  g.computeVertexNormals();
  { // 崖壁的法線：同一個位置的崖壁頂點取平均，岩石起伏看起來是圓潤的凹凸，而不是一片片的三角形
    const nA = g.attributes.normal, sum = new Map(), key = i => Math.round(P[i * 3] * 200) + ',' + Math.round(P[i * 3 + 1] * 200) + ',' + Math.round(P[i * 3 + 2] * 200);
    for (let i = 0; i < WALL.length; i++) if (WALL[i]) { const k = key(i), s = sum.get(k) || [0, 0, 0]; s[0] += nA.getX(i); s[1] += nA.getY(i); s[2] += nA.getZ(i); sum.set(k, s); }
    for (let i = 0; i < WALL.length; i++) if (WALL[i]) { const s = sum.get(key(i)), L = Math.hypot(s[0], s[1], s[2]) || 1; nA.setXYZ(i, s[0] / L, s[1] / L, s[2] / L); }
  }
  const m = new THREE.Mesh(g, surfaceMat); m.receiveShadow = true; m.castShadow = true; scene.add(m);
  return m;
})();

// 海床
{
  const g = new THREE.RingGeometry(0.01, 160, 96, 90); g.rotateX(-Math.PI / 2);   // 細分的同心環：滾筒彎曲是逐頂點計算，三角形太大會整片歪掉
  const p = g.attributes.position, cols = [];
  const shallow = new THREE.Color('#e9dfcf'), mid = new THREE.Color('#c7cfcc'), deep = new THREE.Color('#879da4');   // v7.0：海床是真的沙（濕沙、深處的海草），水的顏色交給海面的吸收與散射
  // 離最近陸地的距離（格子上做一次距離轉換）：新長出的西部高地外海也有一圈淺灘
  const D = new Float32Array(N * N).fill(1e9);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) >= 0) D[z * N + x] = 0;
  for (let pass = 0; pass < 2; pass++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const zz = pass ? N - 1 - z : z, xx = pass ? N - 1 - x : x, s0 = pass ? 1 : -1; let d = D[zz * N + xx];
    [[s0, 0, 1], [0, s0, 1], [s0, s0, 1.414], [-s0, s0, 1.414]].forEach(([dx, dz, w]) => { const nx = xx + dx, nz = zz + dz; if (nx >= 0 && nz >= 0 && nx < N && nz < N) d = Math.min(d, D[nz * N + nx] + w); });
    D[zz * N + xx] = d;
  }
  const seaDist = (x, z) => { const fx = Math.min(N - 1, Math.max(0, x + C)), fz = Math.min(N - 1, Math.max(0, z + C)); return D[Math.floor(fz) * N + Math.floor(fx)] + Math.hypot(x + C - fx, z + C - fz); };
  for (let i = 0; i < p.count; i++) {
    const d = seaDist(p.getX(i), p.getZ(i)), k1 = THREE.MathUtils.smoothstep(d, 0.3, 14), k2 = THREE.MathUtils.smoothstep(d, 12, 45);
    p.setY(i, -0.45 - k1 * 1.2 - k2 * 7);   // 寬一點的淺灘（大陸棚），透亮的青綠一路漸深成湛藍
    const c = shallow.clone().lerp(mid, k1).lerp(deep, k2); cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setAttribute('aSurface', new THREE.Float32BufferAttribute(Array.from({ length: p.count }, () => [0, 1, 0, 1]).flat(), 4)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, surfaceMat); m.receiveShadow = true; scene.add(m);   // v7.0：和沙灘同一種材質（沙粒、風紋、水底焦散），淺灘接得上岸邊的沙
}
water.sea = bend(new THREE.MeshStandardMaterial({ color: '#8bb9cf', transparent: true, opacity: 0.58, roughness: 0.21, metalness: 0.02, fog: false }), 'water'); water.sea.defines = { TA_SEA: '' };   // 大海：倒影與反光帶自己算（engine.js 的 SEA_GLSL），不吃霧（遠方交給倒影的地平線色）
/* 深海的底：海面是半透明的，島外沒有海床時會透出天幕（遠方的海白成一片）；鋪一片深藍的海底（比最深的海床低一點），
   近岸看得到淺灘，越往外越是飽和的深藍。不吃霧，遠方的海一路保持海色，交給天空的地平線薄霧收邊 */
export const deepMesh = (() => { const g = new THREE.PlaneGeometry(280, 280, 70, 70); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, bend(new THREE.MeshStandardMaterial({ color: '#0c4a72', roughness: 1, fog: false }))); m.position.y = -9; m.raycast = () => {}; scene.add(m); return m; })();
// 海面每個頂點量一次水深（aDepth，海面的透明度用）：地形外沒有海床，當成很深
export const seaMesh = (() => { const g = new THREE.PlaneGeometry(320, 320, 160, 160); g.rotateX(-Math.PI / 2); { const P = g.attributes.position, dep = new Float32Array(P.count); for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); dep[i] = Math.abs(x) < C - 1 && Math.abs(z) < C - 1 ? Math.max(0, 0.02 - groundAt(x, z)) : 2; } g.setAttribute('aDepth', new THREE.BufferAttribute(dep, 1)); } const m = new THREE.Mesh(g, water.sea); m.position.y = 0.02; m.receiveShadow = true; m.renderOrder = -10; scene.add(m); return m; })();   // renderOrder：透明物裡最先畫（post.js 的第二階段）
water.river = bend(new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: 0.5, roughness: 0.26 }), 'water');   // 清透一點，看得到河床上的焦散光紋
/* 河面：每格細分成 4×4，靠岸的地方顏色淺、比較透明而且有流動的白沫（頂點顏色的 alpha 是「離岸多近」），
   河中央是較深的藍；流進沙灘或大海的那幾格，水面順著往下斜進海裡，不會浮在沙灘上 */
{
  const P = [], CL = [], PD = [], S = 4, isW = (x, z) => T(x, z) === 3 || T(x, z) === 6;
  const deep = new THREE.Color('#6998b1'), shal = new THREE.Color('#9acbc7'), cDeep = new THREE.Color('#8bb9c4'), cShal = new THREE.Color('#b0c8dd'), col = new THREE.Color();   // 青綠透亮的河水；小溪更淺更亮
  const pDeep = new THREE.Color('#2f6f72'), pShal = new THREE.Color('#85b7a2');   // 池塘（v7.4）：池心深青綠、岸邊淺綠
  const cornerY = (cx, cz, y0) => { for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const t = T(cx + dx, cz + dz); if (t === 0 || t === -1) return 0.3; } return y0; };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (!isW(x, z)) continue;
    const X = x - C, Z = z - C, y0 = isCreek(x, z) ? CREEK_WATER : WATER_Y[T(x, z)];
    const L = !isW(x - 1, z), R = !isW(x + 1, z), Nn = !isW(x, z - 1), Ss = !isW(x, z + 1);
    const dLN = !L && !Nn && !isW(x - 1, z - 1), dRN = !R && !Nn && !isW(x + 1, z - 1), dLS = !L && !Ss && !isW(x - 1, z + 1), dRS = !R && !Ss && !isW(x + 1, z + 1);
    const h00 = cornerY(x, z, y0), h10 = cornerY(x + 1, z, y0), h01 = cornerY(x, z + 1, y0), h11 = cornerY(x + 1, z + 1, y0), pd = pondOf(x, z);
    const vert = (u, v) => {
      let d = 1;
      if (L) d = Math.min(d, u); if (R) d = Math.min(d, 1 - u); if (Nn) d = Math.min(d, v); if (Ss) d = Math.min(d, 1 - v);
      if (dLN) d = Math.min(d, Math.hypot(u, v)); if (dRN) d = Math.min(d, Math.hypot(1 - u, v)); if (dLS) d = Math.min(d, Math.hypot(u, 1 - v)); if (dRS) d = Math.min(d, Math.hypot(1 - u, 1 - v));
      const e = 1 - THREE.MathUtils.smoothstep(d, 0, 0.42), y = (h00 * (1 - u) + h10 * u) * (1 - v) + (h01 * (1 - u) + h11 * u) * v;
      const pk = pd ? pondK(pd, X + u, Z + v) : 0;   // aPond：0 = 不是池塘；池塘是 0.12（岸邊）到 1（池心），著色器依它加深、少畫光網與白沫
      P.push(X + u, y, Z + v); if (isCreek(x, z)) col.copy(cDeep).lerp(cShal, 0.25 + e * 0.6); else if (pd) col.copy(pDeep).lerp(pShal, Math.max(e, 1 - pk)); else col.copy(deep).lerp(shal, e); CL.push(col.r, col.g, col.b, e); PD.push(pd ? 0.12 + 0.88 * pk : 0);
    };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u0 = i / S, u1 = (i + 1) / S, v0 = j / S, v1 = (j + 1) / S;
      vert(u0, v0); vert(u0, v1); vert(u1, v1); vert(u0, v0); vert(u1, v1); vert(u1, v0);
    }
  }
  // 河面角落：和河岸的去階梯同方向移動（只有一格是岸就往岸那邊補水、只有一格是水就把水收回去）
  // 格子裡的細分頂點依四個角的位移做雙線性內插，岸邊才會是一條直的斜線（只移角落會在 1/4 格處折出鋸齒）
  const shiftAt = (cx, cz) => { const d = cornerShift(cx + C, cz + C); return d ? [d[0] * 2 * CH * 0.7071, d[1] * 2 * CH * 0.7071] : [0, 0]; };
  for (let i = 0; i < P.length; i += 3) {
    const X = P[i], Z = P[i + 2], fx = Math.floor(X + 1e-4), fz = Math.floor(Z + 1e-4), u = X - fx, v = Z - fz;   // 和河岸用同一個判斷，河面與岸邊一起移
    const a = shiftAt(fx, fz), b = shiftAt(fx + 1, fz), c = shiftAt(fx, fz + 1), e = shiftAt(fx + 1, fz + 1);
    for (const k of [0, 1]) P[i + k * 2] += (a[k] * (1 - u) + b[k] * u) * (1 - v) + (c[k] * (1 - u) + e[k] * u) * v;
  }
  for (let i = 0; i < P.length; i += 3) { const [wx, wz] = warp(P[i], P[i + 2]); P[i] = wx; P[i + 2] = wz; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 4)); g.setAttribute('aPond', new THREE.Float32BufferAttribute(PD, 1)); g.computeVertexNormals();
  { const rm = new THREE.Mesh(g, water.river); rm.renderOrder = -10; scene.add(rm); }
}
export const foamMat = bend(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }));
{
  const P = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (T(x, z) !== 0) continue; const X = x - C, Z = z - C, y = 0.1, w = 0.35;
    if (T(x + 1, z) === -1) P.push(X + 1, y, Z, X + 1, y, Z + 1, X + 1 + w, y, Z + 1, X + 1, y, Z, X + 1 + w, y, Z + 1, X + 1 + w, y, Z);
    if (T(x - 1, z) === -1) P.push(X - w, y, Z, X - w, y, Z + 1, X, y, Z + 1, X - w, y, Z, X, y, Z + 1, X, y, Z);
    if (T(x, z + 1) === -1) P.push(X, y, Z + 1, X, y, Z + 1 + w, X + 1, y, Z + 1 + w, X, y, Z + 1, X + 1, y, Z + 1 + w, X + 1, y, Z + 1);
    if (T(x, z - 1) === -1) P.push(X, y, Z - w, X, y, Z, X + 1, y, Z, X, y, Z - w, X + 1, y, Z, X + 1, y, Z - w);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  void g;   // 靜態泡沫帶改由 waves.js 的動態浪花取代（foamMat 保留給其他地方）
}
