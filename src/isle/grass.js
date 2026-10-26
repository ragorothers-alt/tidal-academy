/* 潮汐小島 · 草叢：草地格子上散佈數千叢小草（InstancedMesh，一次繪製）。
   跟著風擺動，玩家走過會往外倒；島嶼設計鋪了步道或花圃的格子、建築與物件底下不長草。 */
import * as THREE from 'three';
import { scene, bend, camera, U, renderer, HZ } from './engine.js';
import { N, C, T, groundAt, isBridge, tileAt, cliffTops, noise, sandBank } from './terrain.js';
import { blocked, STEP_STONES, onRoad } from './props.js';
import { topNdc } from './props3d.js';
import { S } from './state.js';
import { ULTRA } from './perf.js';
import { current as seasonNow } from './seasons.js';

let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
/** 一叢草：7 片細長的葉片，每片兩個三角形（下半段、往外彎的上半段），根部顏色接近地面、葉尖受光偏黃綠 */
function tuftGeo() {
  const P = [], Cc = [], Nn = [];
  const base = new THREE.Color('#3f6c1c'), mid = new THREE.Color('#7aa236'), tips = [new THREE.Color('#c6d264'), new THREE.Color('#a8c24e'), new THREE.Color('#d8d67c')];   // v6.93：葉尖改成柔和的鼠尾草金綠（明暗差不變）   // 根部深綠、葉尖受光的金黃綠，對比明顯   // 葉尖受光偏金黃
  let bn = [0, 1, 0]; const push = (x, y, z, c) => { P.push(x, y, z); Cc.push(c.r, c.g, c.b); Nn.push(bn[0], bn[1], bn[2]); };   // 法線大致朝上（和地面同樣受光，看起來長在草地裡），每片往外偏一點：朝太陽的葉片亮、背光的暗
  const NB = ULTRA ? 10 : 16;   // 極省電：每叢 10 片葉
  for (let i = 0; i < NB; i++) {
    const a = i / NB * Math.PI * 2 + Math.random() * 0.8, r = 0.02 + Math.random() * 0.15, h = 0.085 + Math.random() * 0.17 * (i % 3 ? 1 : 1.35), w = 0.013 + Math.random() * 0.009;   // 長一點、寬一點的草葉，往外彎成弧
    const tip = tips[Math.floor(Math.random() * 3)], lean = 0.55 + Math.random() * 0.7;
    const ox = Math.cos(a) * r, oz = Math.sin(a) * r, dx = Math.cos(a), dz = Math.sin(a);
    const px = -dz * w, pz = dx * w; { const l = Math.hypot(dx * 0.32, 0.95, dz * 0.32); bn = [dx * 0.32 / l, 0.95 / l, dz * 0.32 / l]; }
    const mx = ox + dx * h * 0.18 * lean, mz = oz + dz * h * 0.18 * lean, my = h * 0.55;   // 中段
    const tx = ox + dx * h * 0.7 * lean, tz = oz + dz * h * 0.7 * lean, ty = h;   // 葉尖彎出去
    // 下半段收到中段的一點，上半段從中段的寬度收到葉尖（兩個三角形，面數只有一半，看起來一樣是彎的）
    // 下半段是連續的四邊形（中段寬度約根部的六成），上半段收成葉尖：一片完整、柔順彎曲的草葉，不會在中間掐成一點
    const ml = [mx - px * 0.62, my, mz - pz * 0.62], mr = [mx + px * 0.62, my, mz + pz * 0.62];
    push(ox - px, 0, oz - pz, base); push(ox + px, 0, oz + pz, base); push(mr[0], mr[1], mr[2], mid);
    push(ox - px, 0, oz - pz, base); push(mr[0], mr[1], mr[2], mid); push(ml[0], ml[1], ml[2], mid);
    push(ml[0], ml[1], ml[2], mid); push(mr[0], mr[1], mr[2], mid); push(tx, ty, tz, tip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  return g;
}
const PER = 20;   // 每格最多幾叢（茂密的草叢區；稀疏的草皮區會跳過一部分）
const spots = [], chunks = [], CH = 6;   // 草叢分成 6×6 公尺一塊
export let mesh = null;
let KIT = null;
/** 草叢的網格與材質（夢境島也用同一種草） */
export function tuftKit() { return KIT || (KIT = { geo: tuftGeo(), mat: bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }), 'grass') }); }
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
/** 建立草叢（要在建築、樹、物件都放好之後呼叫） */
export function init() {
for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
  const t = T(x, z); if (t !== 1 && t !== 2 && t !== 5) continue; if (isBridge(x, z)) continue;
  for (let k = 0; k < PER; k++) {
    const wx = x - C + rnd(), wz = z - C + rnd();
    // 成簇生長：雜訊高的地方是茂密的長草叢，低的地方是剪短的草皮（稀疏、矮），中間漸變
    const clump = noise(wx * 0.55 + 3.7, wz * 0.55 - 1.3) * 0.7 + noise(wx * 1.7, wz * 1.7 + 5.1) * 0.3;
    if (rnd() > 0.72 + clump * 0.7) continue;
    if (blocked(wx, wz, 0.15) || rnd() < sandBank(wx, wz) * 1.4 || onRoad(wx, wz)) continue;   // 沙洲上草越來越少；石板路上不長草
    { const tw = tileAt(wx, wz); if (tw !== 1 && tw !== 2 && tw !== 5) continue; }   // 地形扭曲後，這一點要真的落在草地上
    const tall = THREE.MathUtils.smoothstep(clump, 0.45, 0.75);
    spots.push({ x: wx, z: wz, tile: x + "," + z, s: (0.5 + tall * 0.75 + rnd() * 0.35) * (rnd() < 0.06 ? 1.5 : 1), r: rnd() * 6.28 });   // 偶爾一叢特別高的
  }
}
{ // 踏石上不長草、石邊的草矮一點：小路的輪廓清楚（用座標篩選，不改變其他草的位置）
  const keep = spots.filter(p => { for (const st of STEP_STONES) { const d = Math.hypot(p.x - st.x, p.z - st.z); if (d < st.r * 0.9) return false; if (d < st.r + 0.25) p.s *= 0.6 + 0.4 * (d - st.r * 0.9) / (st.r * 0.1 + 0.25); } return true; });
  spots.length = 0; spots.push(...keep);
}
{ // 全島的草地：一片片矮草與長草交錯（西部大草原更明顯）（雜訊決定留多少、留下的矮一點），不是一整片同樣高的草毯；用座標雜訊篩選，不改變其他草的位置
  const keep = spots.filter(p => { const W = 0.75 + 0.25 * (1 - THREE.MathUtils.smoothstep(p.x, -24, -18)); if (W <= 0) return true; const f = 0.25 + 0.65 * noise(p.x * 0.18 + 3.7, p.z * 0.18 - 1.3), h = Math.abs(Math.sin(p.x * 12.9898 + p.z * 78.233) * 43758.5453) % 1; if (h > 1 - W * (1 - f)) return false; p.s *= 1 - W * 0.25 * (1 - f); return true; });
  spots.length = 0; spots.push(...keep);
}
if (S().settings && S().settings.lowPerf) { const k = ULTRA ? 3 : 2, keep = spots.filter((p, i) => i % k === 0); keep.forEach(p => { p.s *= ULTRA ? 1.3 : 1.15; }); spots.length = 0; spots.push(...keep); }   // 省電模式：草叢減半，極省電剩三分之一（每叢稍大一點補回覆蓋），其餘位置不變
const mat = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }), 'grass');
spots.forEach(p => { p.c = [0.85 + rnd() * 0.25, 0.92 + rnd() * 0.16, 0.75 + rnd() * 0.2]; });   // 每叢顏色略有不同（亂數順序和以前一樣）
// 分塊：每 CH×CH 公尺一個 InstancedMesh，塊內順序打亂。每格依畫面剔除整塊、遠處只畫前面一部分（見 cull）
const geo = tuftGeo(), byKey = new Map();
spots.forEach(p => { const k = Math.floor(p.x / CH) + ',' + Math.floor(p.z / CH); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(p); });
byKey.forEach((list, k) => {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor((Math.abs(Math.sin(i * 12.9898 + list.length * 78.233)) * 43758.5453 % 1) * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const im = new THREE.InstancedMesh(geo, mat, list.length); im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
  list.forEach((p, i) => im.setColorAt(i, col.setRGB(...p.c)));
  let x = 0, z = 0; list.forEach(p => { x += p.x; z += p.z; });
  const ch = { im, list, x: x / list.length, z: z / list.length, y: groundAt(x / list.length, z / list.length) };
  chunks.push(ch); scene.add(im);
});
mesh = chunks[0] ? chunks[0].im : null;
bloomInit();
refresh();
fringe(mat);
}
/* v7.6 夢幻風：一部分草叢開出小花（成片聚集、群間留草），遠看是參考圖那種撒滿粉白小花的草地。
   花頭自己一組（16 公尺一塊），用和野花同一套風吹與玩家推開；位置用座標雜湊，不動草叢的亂數與位置 */
const BLOOM = { spring: ['#f4a8c8', '#f4a8c8', '#f7c6d9', '#fff3e6', '#fff3e6', '#c9b2ec'], summer: ['#ffffff', '#fff3e6', '#a9c8f0', '#c9b2ec', '#ffffff', '#cfe6f4'], autumn: ['#fbefdc', '#d48fae', '#c9b2ec', '#eec67a', '#fbefdc', '#d48fae'] };
const blooms = [], BCH = 16;
let bloomSeason = '';
/** 一朵小花（直徑約 13 公分）：五片往上翹的花瓣圍成淺杯（從側面低角度、從上面看都是一朵），花心淡黃、一根細莖；共 11 個三角形。
   只有花瓣（aTint = 1）染上這一季的花色，花心與莖維持頂點色 */
function bloomGeo() {
  const P = [], Cc = [], Nn = [], A = [], w = new THREE.Color('#ffffff'), core = new THREE.Color('#ffd98a'), stem = new THREE.Color('#5d8a34'), H = 0.25, r = 0.064;
  const push = (x, y, z, c, t) => { P.push(x, y, z); Cc.push(c.r, c.g, c.b); Nn.push(0, 1, 0); A.push(t); };
  const at = (a, d) => [Math.cos(a) * d, H + d * 0.62, Math.sin(a) * d];   // 花瓣往外越高：淺杯
  for (let i = 0; i < 5; i++) {
    const a = i * 1.2566, L = at(a - 0.36, r * 0.55), T = at(a, r), Rr = at(a + 0.36, r * 0.55);
    push(0, H, 0, core, 0); push(...L, w, 1); push(...T, w, 1);
    push(0, H, 0, core, 0); push(...T, w, 1); push(...Rr, w, 1);
  }
  push(-0.005, 0, 0, stem, 0); push(0.005, 0, 0, stem, 0); push(0, H, 0, stem, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('aTint', new THREE.Float32BufferAttribute(A, 1));
  return g;
}
function bloomInit() {
  const geo = bloomGeo(), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), byKey = new Map();
  mat.defines = { TA_FLOWERTINT: '', TA_BLOOM: '' }; bend(mat, 'flower');
  const h = (x, z, k) => Math.abs(Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453) % 1;
  spots.forEach(p => {
    const f = Math.sin(p.x * 0.37 + 1.3) * Math.sin(p.z * 0.29 - 0.7) * 0.6 + Math.sin((p.x - p.z) * 0.17 + 2.1) * 0.4;   // 一片片的花：雜訊高的地方七成五的草叢開花，其他地方兩成
    const on = THREE.MathUtils.smoothstep(f, 0, 0.7); if (h(p.x, p.z, 1) > 0.2 + 0.55 * on) return;
    for (let j = 0, n = 1 + (h(p.x, p.z, 2) < 0.3 + on * 0.4) + (h(p.x, p.z, 13) < on * 0.4); j < n; j++) {   // 花海中間一叢兩三朵
      const a = h(p.x, p.z, 3 + j) * 6.28 + j * 2.1, d = (0.03 + h(p.x, p.z, 5 + j) * 0.12) * p.s, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      const k = Math.floor(x / BCH) + ',' + Math.floor(z / BCH); if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push({ x, z, tile: p.tile, s: p.s * (0.85 + h(p.x, p.z, 7 + j) * 0.3), r: a * 3.1, t: h(p.x, p.z, 9 + j) - 0.5, c: Math.floor(h(p.x, p.z, 11 + j) * 6) });
    }
  });
  byKey.forEach(list => {
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor((Math.abs(Math.sin(i * 12.9898 + list.length * 78.233)) * 43758.5453 % 1) * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }   // 打亂：遠處少畫的是隨機的一部分
    const im = new THREE.InstancedMesh(geo, mat, list.length); im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
    let x = 0, z = 0; list.forEach(b => { x += b.x; z += b.z; });
    blooms.push({ im, list, x: x / list.length, z: z / list.length, y: groundAt(x / list.length, z / list.length) }); scene.add(im);
  });
}
/** 換季：花色換成這一季的色盤（冬天草縮進雪裡，花也收起來） */
function bloomTint(s) {
  bloomSeason = s; const pal = BLOOM[s]; if (!pal) return;
  blooms.forEach(ch => { ch.list.forEach((b, i) => ch.im.setColorAt(i, col.set(pal[b.c]))); ch.im.instanceColor.needsUpdate = true; });
}
/** 崖頂垂草：沿著懸崖上緣一叢叢往外、往下垂的草，偶爾一條長長的藤，打散崖頂筆直的線條 */
function fringe(mat) {
  const P = [], Cc = [], Nn = [];
  const base = new THREE.Color('#5f8f3e'), tip = new THREE.Color('#a8c46a'), vine = new THREE.Color('#4f7a36');
  const push = (x, y, z, c) => { P.push(x, y, z); Cc.push(c.r, c.g, c.b); Nn.push(0, 1, 0); };
  for (let i = 0; i < 9; i++) {
    const ox = (Math.random() - 0.5) * 0.3, long = i === 0 && Math.random() < 0.6, len = long ? 0.28 + Math.random() * 0.2 : 0.1 + Math.random() * 0.14, w = 0.014 + Math.random() * 0.01, out = 0.05 + Math.random() * 0.06;
    const mx = ox + (Math.random() - 0.5) * 0.04, my = -len * 0.35, mz = out + 0.03, tx = ox + (Math.random() - 0.5) * 0.08, ty = -len, tz = out * 0.8 + 0.02;
    const c1 = long ? vine : base, c2 = long ? vine : tip;
    push(ox - w, 0.02, -0.02, c1); push(ox + w, 0.02, -0.02, c1); push(mx, my, mz, c2);
    push(mx - w * 0.8, my, mz, c2); push(mx + w * 0.8, my, mz, c2); push(tx, ty, tz, c2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  const fm = new THREE.InstancedMesh(g, mat, cliffTops.length);
  cliffTops.forEach((c, i) => {
    const j = (rnd() - 0.5) * 0.16, s0 = 0.8 + rnd() * 0.5;   // 沿著崖邊前後錯開、寬窄長短各自不同、稍微扭一點：垂草不會像一把整齊的梳子
    m4.compose(v.set(c[0] + c[3] * 0.02 + c[4] * j, c[1] + 0.11, c[2] + c[4] * 0.02 - c[3] * j), q.setFromEuler(e.set(0, Math.atan2(c[3], c[4]) + (rnd() - 0.5) * 0.5, 0)), sc.set(s0 * (0.75 + rnd() * 0.6), s0 * (0.6 + rnd() * 0.7), s0));
    fm.setMatrixAt(i, m4); col.setRGB(0.88 + rnd() * 0.2, 0.92 + rnd() * 0.15, 0.8 + rnd() * 0.15); fm.setColorAt(i, col);
  });
  fm.receiveShadow = true; fm.frustumCulled = false; scene.add(fm);
}
/** 重新排列：步道、花圃格子上的草藏起來（縮成 0） */
export function refresh() {
  if (!chunks.length) return;
  const d = S().design || {};
  chunks.forEach(ch => {
    ch.list.forEach((p, i) => {
      const hide = !!d[p.tile];
      m4.compose(v.set(p.x, groundAt(p.x, p.z) - 0.02, p.z), q.setFromEuler(e.set(0, p.r, 0)), sc.setScalar(hide ? 0 : p.s));
      ch.im.setMatrixAt(i, m4);
    });
    ch.im.instanceMatrix.needsUpdate = true; if (ch.im.instanceColor) ch.im.instanceColor.needsUpdate = true;
  });
  blooms.forEach(ch => {
    ch.list.forEach((b, i) => { m4.compose(v.set(b.x, groundAt(b.x, b.z) - 0.02, b.z), q.setFromEuler(e.set(b.t * 0.6, b.r, 0)), sc.setScalar(d[b.tile] ? 0 : b.s)); ch.im.setMatrixAt(i, m4); });
    ch.im.instanceMatrix.needsUpdate = true;
  });
}
/* 每格：畫面外、沉到地平線下的草塊不畫（用和著色器一樣的滾筒彎曲把塊的中心投影到畫面上）；
   遠處的草塊只畫一部分（塊內順序已打亂，少畫的是隨機的一部分）——依草葉在畫面上有幾個像素高決定，畫面看得出一根根草的距離都是全部的草 */
const vC = new THREE.Vector3();
export function cull() {
  const F = U.uBendF.value, K = U.uCurve.value, P = camera.projectionMatrix.elements, fx = P[0], fy = P[5], M = camera.matrixWorldInverse, R = CH * 0.75 + 0.4, pxK = 0.3 * fy * renderer.domElement.height * 0.5;   // 0.3 公尺高的草葉在深度 1 時有幾個像素
  const seen = (ch, R) => {   // 這一塊在畫面上的深度（看不到是 -1）
    vC.set(ch.x, ch.y + 0.2, ch.z).applyMatrix4(M);
    const depth = -vC.z; if (depth < -R) return -1;
    const bz = Math.max(depth - F, 0); vC.y -= bz * bz * K;
    const d = Math.max(depth, 0.5), rx = R * fx / d + 0.05, ry = R * fy / d + 0.05, x = fx * vC.x / d, y = fy * vC.y / d;
    const on = Math.abs(x) < 1 + rx && Math.abs(y) < 1 + ry && !(depth - R > HZ.d && topNdc(vC.y + bz * bz * K, depth, 0.6, R, F, K, fy) < HZ.y - 0.015);   // 比地平線遠、又整塊（近端彎得比較少，要另外算）在地平線下：被彎下去的海面擋住
    return on ? Math.max(depth, 1) : -1;
  };
  const share = depth => { const px = pxK / depth; return px > (ULTRA ? 12 : 7) ? 1 : px > (ULTRA ? 6 : 3.5) ? 0.6 : 0.35; };   // 極省電：近一點就開始少畫
  for (const ch of chunks) { const depth = seen(ch, R); ch.im.visible = depth > 0; if (depth > 0) ch.im.count = Math.max(1, Math.round(ch.list.length * share(depth))); }
  const sn = U.uSnow.value > 0.3 ? 'winter' : seasonNow(); if (sn !== bloomSeason) bloomTint(sn);
  for (const ch of blooms) { const depth = BLOOM[bloomSeason] ? seen(ch, BCH * 0.75 + 0.4) : -1; ch.im.visible = depth > 0; if (depth > 0) ch.im.count = Math.max(1, Math.round(ch.list.length * share(depth))); }
}
export const count = () => spots.length;
let pend = 0;
/** 島嶼設計改變時：下一幀再一次重排（連續放很多格也只重排一次） */
export const refreshSoon = () => { if (!pend) pend = setTimeout(() => { pend = 0; refresh(); }, 0); };
