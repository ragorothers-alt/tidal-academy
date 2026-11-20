/* 潮汐小島 · 潮線上的小東西（v9.24.4）：沙灘靠海的那一帶，一小堆一小堆被浪推上來的海藻、扇貝、螺殼、海星與漂流木。
   純裝飾（撿得起來的貝殼與漂流木在 diy.js）；每一種一個 InstancedMesh，位置固定（自己的亂數，不影響其他佈置）。 */
import * as THREE from 'three';
import { scene, bend } from './engine.js';
import { N, C, T, tileAt, groundAt } from './terrain.js';
import { blocked, onRoad, PIER } from './props.js';

let seed = 90210;
const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const geoOf = (p, ix) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ix); g.computeVertexNormals(); return g; };

/** 扇貝：從殼頂往外張開的扇形，殼面一道道放射的稜；半徑 1、殼頂在原點、開口朝 +z */
function scallop() {
  const p = [0, 0.02, 0], ix = [], RIBS = 9, COLS = RIBS * 2, RINGS = [0.3, 0.62, 0.86, 1];
  RINGS.forEach((rr, j) => { for (let i = 0; i <= COLS; i++) { const a = -1.12 + 2.24 * i / COLS, ridge = i % 2 ? 1 : 0.9, R = rr * (j === 3 ? ridge * (1 - 0.05 * Math.abs(i / COLS - 0.5)) : 1); p.push(Math.sin(a) * R, (0.3 * Math.sin(Math.PI * Math.min(1, rr * 0.92)) + 0.03) * (i % 2 ? 1 : 0.78) * (j === 3 ? 0.25 : 1), Math.cos(a) * R); } });
  const W = COLS + 1; for (let i = 0; i < COLS; i++) ix.push(0, 1 + i, 2 + i);
  for (let j = 0; j < RINGS.length - 1; j++) for (let i = 0; i < COLS; i++) { const a = 1 + j * W + i, b = a + W; ix.push(a, b, b + 1, a, b + 1, a + 1); }
  const base = p.length / 3; p.push(-0.22, 0.02, -0.1, 0.22, 0.02, -0.1, 0.16, 0.04, 0.12, -0.16, 0.04, 0.12); ix.push(base, base + 3, base + 2, base, base + 2, base + 1);   // 殼頂兩側的耳
  return geoOf(p, ix);
}
/** 螺殼：一圈圈往尖端收的紡錘形，躺在沙上；長 1、尖端朝 +z */
function whelk() {
  const p = [], ix = [], SEG = 9, PROF = [[-0.5, 0.02], [-0.42, 0.15], [-0.25, 0.27], [-0.05, 0.3], [0.08, 0.22], [0.16, 0.24], [0.26, 0.15], [0.33, 0.16], [0.41, 0.08], [0.5, 0.01]];
  PROF.forEach(([z, rad]) => { for (let i = 0; i < SEG; i++) { const a = i / SEG * Math.PI * 2 + z * 2.2; p.push(Math.cos(a) * rad, Math.sin(a) * rad + 0.24, z); } });
  for (let j = 0; j < PROF.length - 1; j++) for (let i = 0; i < SEG; i++) { const a = j * SEG + i, b = j * SEG + (i + 1) % SEG; ix.push(a, a + SEG, b + SEG, a, b + SEG, b); }
  return geoOf(p, ix);
}
/** 海星：五隻腕、中央鼓起；半徑 1 */
function starfish() {
  const p = [0, 0.2, 0], ix = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, R = i % 2 ? 0.36 : 1; p.push(Math.sin(a) * R, i % 2 ? 0.1 : 0.03, Math.cos(a) * R); }
  for (let i = 0; i < 5; i++) { const a = (i * 2) / 10 * Math.PI * 2; p.push(Math.sin(a) * 0.52, 0.15, Math.cos(a) * 0.52); }   // 每隻腕背上的稜
  for (let i = 0; i < 5; i++) { const tip = 1 + i * 2, l = 1 + (i * 2 + 9) % 10, rr = 1 + (i * 2 + 1) % 10, ridge = 11 + i; ix.push(0, l, ridge, 0, ridge, rr, l, tip, ridge, ridge, tip, rr); }
  return geoOf(p, ix);
}
/** 海藻：一小堆纏在一起的皺帶子（長短、方向、彎度都不一樣，不從同一點散開，免得像海星）；半徑約 1 */
function seaweed() {
  const p = [], ix = [];
  for (let s = 0; s < 10; s++) {
    const a0 = r() * 6.28, L = 0.3 + r() * r() * 0.9, w = 0.05 + r() * 0.06, curl = (r() - 0.5) * 3.2, ox = (r() - 0.5) * 0.5, oz = (r() - 0.5) * 0.5, lift = r() * 0.03, base = p.length / 3, SEGS = 8;
    let x = ox, z = oz;
    for (let k = 0; k <= SEGS; k++) { const t = k / SEGS, a = a0 + curl * t + Math.sin(t * 5 + s) * 0.3, nx = Math.cos(a), nz = -Math.sin(a), ww = w * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, t * 1.2 + 0.1))) * (1 + 0.35 * Math.sin(t * 14 + s * 3)), y = 0.01 + lift + 0.035 * Math.abs(Math.sin(t * 6 + s * 2));
      p.push(x - nx * ww, y + 0.014 * Math.sin(t * 15 + s), z - nz * ww, x + nx * ww, y - 0.01 * Math.sin(t * 15 + s), z + nz * ww); x += Math.sin(a) * L / SEGS; z += Math.cos(a) * L / SEGS; }
    for (let k = 0; k < SEGS; k++) { const a = base + k * 2; ix.push(a, a + 2, a + 3, a, a + 3, a + 1); }
  }
  return geoOf(p, ix);
}/** 漂流木：被海水磨圓、微微彎的一截枝幹；長 1、沿 x */
function stick() {
  const p = [], ix = [], SEG = 6, RINGS = 6;
  for (let j = 0; j <= RINGS; j++) { const t = j / RINGS, rad = 0.055 * (0.55 + 0.45 * Math.sin(Math.PI * (0.12 + t * 0.8))) * (1 + 0.15 * Math.sin(t * 9)); for (let i = 0; i < SEG; i++) { const a = i / SEG * Math.PI * 2; p.push(t - 0.5, 0.05 + Math.sin(a) * rad + 0.03 * Math.sin(t * 3.1), Math.cos(a) * rad + 0.05 * Math.sin(t * 2.4)); } }
  for (let j = 0; j < RINGS; j++) for (let i = 0; i < SEG; i++) { const a = j * SEG + i, b = j * SEG + (i + 1) % SEG; ix.push(a, b, b + SEG, a, b + SEG, a + SEG); }
  const e0 = p.length / 3; p.push(-0.5, 0.05, 0, 0.5, 0.05 + 0.03 * Math.sin(3.1), 0.05 * Math.sin(2.4)); for (let i = 0; i < SEG; i++) { ix.push(e0, (i + 1) % SEG, i, e0 + 1, RINGS * SEG + i, RINGS * SEG + (i + 1) % SEG); }
  return geoOf(p, ix);
}

export function build() {
  // 靠海的沙格：自己是沙，隔壁（一格或兩格內）是海
  const near = (x, z, d) => { for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) if (T(x + dx, z + dz) === -1) return true; return false; };
  const cand = [];
  for (let z = 2; z < N - 2; z++) for (let x = 2; x < N - 2; x++) if (T(x, z) === 0 && near(x, z, 2)) cand.push([x - C + 0.5, z - C + 0.5, near(x, z, 1)]);
  cand.sort(() => r() - 0.5);
  const K = { scallop: [], whelk: [], star: [], weed: [], stick: [] }, spots = [];
  const ok = (x, z) => tileAt(x, z) === 0 && !onRoad(x, z) && !blocked(x, z, 0.3) && !(Math.abs(x - PIER.x) < 2.2 && z > PIER.z - 1.5);
  for (const [cx0, cz0, edge] of cand) {
    if (spots.length >= 64) break;
    const cx = cx0 + (r() - 0.5) * 0.7, cz = cz0 + (r() - 0.5) * 0.7;
    if (!ok(cx, cz) || spots.some(s => Math.hypot(s[0] - cx, s[1] - cz) < 2.6)) continue;
    spots.push([cx, cz]);
    const put = (list, d, s) => { const a = r() * 6.28, x = cx + Math.cos(a) * d * r(), z = cz + Math.sin(a) * d * r(); if (ok(x, z)) list.push([x, z, s, r() * 6.28]); };
    if (r() < 0.62) put(K.weed, 0.2, 0.34 + r() * 0.3);
    for (let i = 0, n = 2 + Math.floor(r() * 4); i < n; i++) put(K.scallop, 0.9, 0.045 + r() * 0.04);
    if (r() < 0.55) put(K.whelk, 0.8, 0.09 + r() * 0.06);
    if (r() < 0.3) put(K.stick, 0.9, 0.35 + r() * 0.4);
    if (edge && r() < 0.3) put(K.star, 0.6, 0.085 + r() * 0.05);
  }
  const TONES = { scallop: ['#f1e6d6', '#e9c9b0', '#f4efe6', '#dcb7a0', '#e8dccb', '#c9a48e'], whelk: ['#d9c2a2', '#c9a680', '#e6d8c2', '#b98f6c'], star: ['#d9743c', '#c9532f', '#e09a48', '#b8612e'], weed: ['#4c5230', '#5a4a2c', '#3f4a2c', '#6a5a30'], stick: ['#a39a8c', '#8f8576', '#b3aa9a'] };
  const GEO = { scallop: scallop(), whelk: whelk(), star: starfish(), weed: seaweed(), stick: stick() }, ROUGH = { scallop: 0.5, whelk: 0.45, star: 0.85, weed: 0.6, stick: 0.95 };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), out = {};
  for (const k of Object.keys(K)) {
    const list = K[k], im = new THREE.InstancedMesh(GEO[k], bend(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: ROUGH[k], side: THREE.DoubleSide })), Math.max(1, list.length));
    im.count = list.length; im.receiveShadow = true; im.castShadow = k === 'stick' || k === 'whelk'; im.frustumCulled = false; im.name = 'wrack-' + k;
    list.forEach(([x, z, s, a], i) => {
      const tilt = k === 'scallop' ? (r() - 0.5) * 0.5 : k === 'whelk' ? (r() - 0.5) * 0.3 : 0;
      m4.compose(p.set(x, groundAt(x, z) + (k === 'whelk' ? -s * 0.06 : 0.002), z), q.setFromEuler(e.set(tilt, a, (r() - 0.5) * (k === 'scallop' ? 0.4 : 0.1))), sc.set(s, s * (k === 'weed' ? 0.6 : 1), s));
      im.setMatrixAt(i, m4); im.setColorAt(i, col.set(TONES[k][Math.floor(r() * TONES[k].length)]).multiplyScalar(0.9 + r() * 0.2));
    });
    scene.add(im); out[k] = list.length;
  }
  return out;
}
