/* 潮汐小島 · 海鷗（v9.24.1）：沿著海岸盤旋滑翔的幾隻，和站在沙灘、碼頭上的幾隻（走近會飛走，過一陣子再飛回來）。
   模型是程式化建模：身體、頭、兩節翅膀（肩到腕、腕到翼尖，拍翅時外節慢半拍）、收起的翅膀與腳（只有站著時看得到）。
   遠景的鳥群（fantasy.js）也用同一個模型。純氛圍：不能互動、不進圖鑑。 */
import * as THREE from 'three';
import { scene, bend, skyU } from './engine.js';

const C = h => new THREE.Color(h);
const WHITE = C('#f1f0ec'), GREY = C('#aeb6bc'), DARK = C('#8e979e'), BLACK = C('#1b1c20'), BEAK = C('#e0a326'), LEG = C('#d08a66'), EYE = C('#111114');

/* ---------- 建模 ---------- */
function builder() {
  const p = [], c = [], ix = [];
  const v = (x, y, z, col) => { p.push(x, y, z); c.push(col.r, col.g, col.b); return p.length / 3 - 1; };
  const B = {
    v,
    /** 沿 z 軸放樣：rings = [z, rx, ry, y]，colOf(z, up) 給頂點色（up：1 = 背、-1 = 腹） */
    loft(rings, seg, colOf, ox = 0) {
      const rows = rings.map(([z, rx, ry, y]) => { const row = []; for (let k = 0; k < seg; k++) { const a = k / seg * Math.PI * 2, up = Math.cos(a); row.push(v(ox + Math.sin(a) * rx, y + up * ry, z, colOf(z, up))); } return row; });
      for (let r = 0; r < rows.length - 1; r++) for (let k = 0; k < seg; k++) { const k1 = (k + 1) % seg; ix.push(rows[r][k], rows[r + 1][k1], rows[r + 1][k], rows[r][k], rows[r][k1], rows[r + 1][k1]); }
      const a = rings[0], b = rings[rings.length - 1], ca = v(ox, a[3], a[0], colOf(a[0], 0)), cb = v(ox, b[3], b[0], colOf(b[0], 0));
      for (let k = 0; k < seg; k++) { const k1 = (k + 1) % seg; ix.push(ca, rows[0][k], rows[0][k1], cb, rows[rows.length - 1][k1], rows[rows.length - 1][k]); }
    },
    box(cx, cy, cz, sx, sy, sz, col) {
      const o = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([a, b2, d]) => [cx + a * sx / 2, cy + b2 * sy / 2, cz + d * sz / 2]);
      [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]].forEach(f => { const q = f.map(i => v(o[i][0], o[i][1], o[i][2], col)); ix.push(q[0], q[1], q[2], q[0], q[2], q[3]); });
    },
    /** 一片翼面：stations = [x, 前緣 z, 後緣 z, 拱高, 顏色] */
    plate(st) {
      const rows = st.map(([x, le, te, cam, col, edge]) => [v(x, 0, le, edge || col), v(x, cam, (le + te) / 2 + (le - te) * 0.12, col), v(x, 0, te, edge || col)]);
      for (let r = 0; r < rows.length - 1; r++) for (let k = 0; k < 2; k++) ix.push(rows[r][k], rows[r + 1][k], rows[r + 1][k + 1], rows[r][k], rows[r + 1][k + 1], rows[r][k + 1]);
    },
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(ix); g.computeVertexNormals(); return g; }
  };
  return B;
}
let GEO = null;
function geos() {
  if (GEO) return GEO;
  const mantle = (z, up) => (up > 0.25 && z > -0.17 && z < 0.12 ? GREY : WHITE);
  let b = builder();   // 身體與尾羽
  b.loft([[-0.21, 0.014, 0.012, 0.012], [-0.14, 0.046, 0.04, 0.004], [-0.04, 0.074, 0.068, -0.004], [0.07, 0.078, 0.072, 0], [0.15, 0.058, 0.056, 0.014], [0.2, 0.036, 0.036, 0.028]], 10, mantle);
  b.plate([[-0.062, -0.3, -0.33, 0, WHITE], [-0.03, -0.16, -0.345, 0.004, WHITE], [0.03, -0.16, -0.345, 0.004, WHITE], [0.062, -0.3, -0.33, 0, WHITE]]);
  const body = b.geo();
  b = builder();   // 頭、喙、眼
  b.loft([[-0.01, 0.034, 0.034, 0], [0.03, 0.043, 0.044, 0.004], [0.066, 0.038, 0.038, 0.004], [0.092, 0.02, 0.02, -0.002]], 10, () => WHITE);
  b.loft([[0.088, 0.012, 0.013, -0.004], [0.125, 0.009, 0.011, -0.007], [0.155, 0.003, 0.004, -0.014]], 6, () => BEAK);
  b.box(0.035, 0.014, 0.058, 0.008, 0.011, 0.011, EYE); b.box(-0.035, 0.014, 0.058, 0.008, 0.011, 0.011, EYE);
  const head = b.geo();
  b = builder();   // 翅膀內節（肩到腕）
  b.plate([[0, 0.072, -0.088, 0.012, GREY, DARK], [0.15, 0.09, -0.076, 0.016, GREY, DARK], [0.3, 0.1, -0.06, 0.013, GREY, DARK]]);
  const inner = b.geo();
  b = builder();   // 翅膀外節（腕到翼尖）：尖端是黑的
  b.plate([[0, 0.1, -0.06, 0.013, GREY, DARK], [0.14, 0.078, -0.066, 0.01, GREY, DARK], [0.26, 0.022, -0.082, 0.006, BLACK], [0.38, -0.07, -0.1, 0, BLACK]]);
  const outer = b.geo();
  b = builder();   // 收起的翅膀：貼在身體兩側，翼尖在尾巴上方交疊
  for (const s of [-1, 1]) b.loft([[0.1, 0.01, 0.026, 0.02], [0.02, 0.02, 0.05, 0.016], [-0.1, 0.019, 0.042, 0.02], [-0.2, 0.012, 0.022, 0.03], [-0.31, 0.003, 0.006, 0.04]], 6, z => (z < -0.17 ? BLACK : GREY), s * 0.062);
  const fold = b.geo();
  b = builder();   // 腳
  for (const s of [-1, 1]) { b.box(s * 0.026, -0.11, -0.01, 0.008, 0.1, 0.008, LEG); b.box(s * 0.026, -0.158, 0.008, 0.024, 0.004, 0.04, LEG); }
  const legs = b.geo();
  // 遠景用的簡化版：身體和頭合成一塊；每邊翅膀一整片（外節固定往下折一點，像滑翔時的 M 形），左翼是右翼的鏡像
  const far = join([body, head.clone().translate(0, 0.03, 0.185)]), wingR = join([inner, outer.clone().rotateZ(-0.25).translate(0.3, 0, 0)]);
  const wingL = wingR.clone().scale(-1, 1, 1); { const ix = wingL.index.array; for (let i = 0; i < ix.length; i += 3) { const s = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = s; } wingL.computeVertexNormals(); }
  return (GEO = { body, head, inner, outer, fold, legs, far, wingR, wingL });
}
/** 把幾個只有位置、顏色與索引的幾何合成一個 */
function join(list) {
  const p = [], c = [], ix = []; let base = 0;
  for (const g of list) { p.push(...g.attributes.position.array); c.push(...g.attributes.color.array); for (const i of g.index.array) ix.push(i + base); base += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(ix); g.computeVertexNormals(); return g;
}
const STUB = { rotation: { z: 0 } };
/** 一隻海鷗。mat 要是開了 vertexColors 的材質；fold／legs 只有站著時顯示。
    lod（v9.24.8，場景物件少一點）：'far' 遠景鳥群——身體一塊、翅膀左右各一片，4 個物件 3 次繪製；'fly' 只會飛的——沒有收起的翅膀與腳；不給就是完整的 12 個物件 */
export function makeGull(mat, lod) {
  const G = geos(), g = new THREE.Group(), M = geo => new THREE.Mesh(geo, mat); g.rotation.order = 'YXZ';
  if (lod === 'far') {
    const body = M(G.far), R = { inner: M(G.wingR), outer: STUB }, L = { inner: M(G.wingL), outer: STUB };
    R.inner.position.set(0.05, 0.045, 0.05); L.inner.position.set(-0.05, 0.045, 0.05); g.add(body, R.inner, L.inner);
    return { g, tilt: g, body, head: body, R, L, flat: true };
  }
  const tilt = new THREE.Group(), body = M(G.body), head = M(G.head); head.position.set(0, 0.03, 0.185);
  const wing = s => { const piv = new THREE.Group(); piv.position.set(0.05 * s, 0.045, 0.05); piv.scale.x = s; const inner = M(G.inner), outer = M(G.outer); outer.position.x = 0.3; inner.add(outer); piv.add(inner); return { piv, inner, outer }; };
  const R = wing(1), L = wing(-1); let fold = null, legs = null;
  tilt.add(body, head, R.piv, L.piv); g.add(tilt);
  if (lod !== 'fly') { fold = M(G.fold); legs = M(G.legs); tilt.add(fold); g.add(legs); fold.visible = legs.visible = false; }
  return { g, tilt, body, head, R, L, fold, legs };
}
/** 翅膀姿勢：k = 0 滑翔、1 拍翅；ph 是拍翅相位 */
export function wings(o, k, ph) {
  const a = 0.14 * (1 - k) + k * (0.08 + 0.62 * Math.sin(ph)), b = -0.3 * (1 - k) + k * (-0.2 + 0.5 * Math.sin(ph - 1.0));
  o.R.inner.rotation.z = a; o.L.inner.rotation.z = o.flat ? -a : a; o.R.outer.rotation.z = o.L.outer.rotation.z = b;
}
function standing(o, on) { o.fold.visible = o.legs.visible = on; o.R.piv.visible = o.L.piv.visible = !on; }
/** 看不到的海鷗不留在場景裡（three 每格都會更新場景裡每個物件的矩陣，藏起來的也算） */
const put = (o, v) => { if (v) { if (!o.g.parent) scene.add(o.g); } else if (o.g.parent) scene.remove(o.g); o.g.visible = v; };

/* ---------- 島上的海鷗 ---------- */
let ctx = null, mat = null, shown = true, lastP = null, pSpeed = 0;
const soar = [], perch = [], spots = [];
const COAST = 44, rnd = (a, b) => a + Math.random() * (b - a), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
/** c：ground(x, z)、isWater(x, z)、player、pier { x, z, len, hw } */
export function init(c) {
  ctx = c; mat = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide, emissive: '#93a7bd', emissiveIntensity: 0.3 }));
  for (let i = 0; i < 5; i++) {
    const o = makeGull(mat, 'fly'); o.g.scale.setScalar(rnd(0.95, 1.15)); o.g.traverse(m => { m.frustumCulled = false; }); o.g.visible = false;
    soar.push(Object.assign(o, { ang: rnd(-3, 3), offA: [-0.5, -0.18, 0.12, 0.42, 0.85][i], R0: rnd(7, 13), ph: rnd(0, 6), dir: i % 2 ? 1 : -1, alt: rnd(5.5, 12), spd: rnd(5.5, 7.5), out: 70, out0: rnd(-3, 9), flapT: rnd(2, 6), flap: 0, fph: rnd(0, 6), on: false }));
  }
  for (let i = 0; i < 5; i++) {
    const o = makeGull(mat); o.g.scale.setScalar(rnd(0.95, 1.15)); o.g.traverse(m => { m.frustumCulled = false; if (m.isMesh) m.castShadow = true; }); o.g.visible = false;
    perch.push(Object.assign(o, { st: 'away', t: rnd(1, 8) + i * 3, spot: null, look: 0, lookTo: 0, lookT: 1, fph: rnd(0, 6), from: new THREE.Vector3(), dirX: 0, dirZ: 1 }));
  }
}
function findSpots() {   // 第一次更新才找（init 時 main.js 的 isWater 還沒準備好）
  const c = ctx;
  for (let k = 0; k < 20; k++) {   // 沙灘上能站的位置：每個方向從外海往內找到第一塊沙
    const a = k / 20 * Math.PI * 2 + 0.17;
    for (let r = 49; r > 30; r -= 0.5) { const x = Math.sin(a) * r, z = Math.cos(a) * r; if (c.isWater(x, z)) continue; const x2 = Math.sin(a) * (r - 1.4), z2 = Math.cos(a) * (r - 1.4), y = c.ground(x2, z2); if (y < 0.62 && !c.isWater(x2, z2)) spots.push({ x: x2, z: z2, y, a }); break; }
  }
  const P = c.pier; for (const f of [0.3, 0.62, 0.9]) for (const s of [-1, 1]) spots.push({ x: P.x + s * (P.hw - 0.16), z: P.z + P.len * f, y: 0.47, a: Math.atan2(P.x, P.z + P.len * f) });
}
function freeSpot(p, avoid) {
  const near = spots.filter(s => !s.by && s !== avoid && Math.hypot(s.x - p.x, s.z - p.z) < 48 && Math.hypot(s.x - p.x, s.z - p.z) > 7);
  return near.length ? near[Math.floor(Math.random() * near.length)] : null;
}
const sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
/** 每格更新（fantasy.update 呼叫）：show = 在主島戶外 */
export function update(dt, t, night, show) {
  if (!ctx) return;
  if (show !== shown) { shown = show; if (!show) { soar.forEach(o => put(o, false)); perch.forEach(o => put(o, false)); } }
  if (!show) return;
  if (!spots.length) findSpots();
  const p = ctx.player.position, rain = skyU.wx.value.x, storm = skyU.wx.value.y, dark = night > 0.55;
  if (lastP) { const mv = Math.hypot(p.x - lastP.x, p.z - lastP.z); if (mv < 1.5) pSpeed += (mv / Math.max(dt, 1e-3) - pSpeed) * Math.min(1, dt * 6); } else lastP = new THREE.Vector3();   // 瞬間移動（進出建築、搭船）不算跑過來
  lastP.copy(p); mat.emissiveIntensity = 0.3 * (1 - night * 0.8);   // 天空與海面的反光：背光的鳥不會是一團黑
  const pa = Math.atan2(p.x, p.z), inland = Math.hypot(p.x, p.z) < 10, want = dark || storm > 0.3 ? 0 : rain > 0.4 ? 2 : 5;

  soar.forEach((o, i) => {
    const on = i < want; if (on && !o.on) { o.on = true; o.ang = pa + o.offA + rnd(-0.4, 0.4); } o.on = on;
    o.out += ((on ? o.out0 : 75) - o.out) * Math.min(1, dt * (on ? 0.35 : 0.22));
    if (!on && o.out > 66) { put(o, false); return; }
    if (!inland) o.ang += Math.max(-0.07 * dt, Math.min(0.07 * dt, wrap(pa + o.offA - o.ang)));
    const R = o.R0 + 3 * Math.sin(t * 0.07 + i * 1.9), ax = Math.sin(o.ang) * (COAST + o.out), az = Math.cos(o.ang) * (COAST + o.out);
    o.ph += o.dir * o.spd / R * dt;
    const cp = Math.cos(o.ph), sp = Math.sin(o.ph), y = o.alt + 1.8 * Math.sin(t * 0.13 + i * 2.1) + (on ? 0 : (o.out - o.out0) * 0.12), climb = 1.8 * 0.13 * Math.cos(t * 0.13 + i * 2.1);
    o.g.position.set(ax + cp * R, y, az + sp * R); put(o, true);
    o.g.rotation.set(-climb * 0.12, Math.atan2(-sp * o.dir, cp * o.dir), o.dir * 0.38);   // 朝切線方向飛，往圓心側傾
    o.flapT -= dt; if (o.flapT < 0) { o.flapOn = !o.flapOn; o.flapT = o.flapOn ? rnd(1.2, 2.6) : rnd(3.5, 9); }
    o.flap += ((o.flapOn ? 1 : 0) - o.flap) * Math.min(1, dt * 3); o.fph += dt * 8.5;
    wings(o, o.flap * 0.85, o.fph);
    o.tilt.rotation.z = Math.sin(t * 0.9 + i) * 0.05; o.head.rotation.y = Math.sin(t * 0.4 + i * 3) * 0.25;
    if (dbg.pin && i === 0) { o.g.position.set(dbg.pin[0], dbg.pin[1], dbg.pin[2]); o.g.rotation.set(0, dbg.pin[3], dbg.pin[4] || 0); put(o, true); }
  });

  const hide = storm > 0.3;
  perch.forEach((o, i) => {
    const s = o.spot;
    if (o.st === 'away') {
      put(o, false); o.t -= dt;
      if (o.t < 0 && !hide) { const ns = freeSpot(p); if (!ns) { o.t = 4; return; } ns.by = o; o.spot = ns; o.st = 'arrive'; o.t = 0; o.dirX = Math.sin(ns.a + rnd(-0.5, 0.5)); o.dirZ = Math.cos(ns.a + rnd(-0.5, 0.5)); o.face = Math.atan2(-o.dirX, -o.dirZ); standing(o, false); }
      return;
    }
    put(o, true);
    if (o.st === 'arrive') {   // 從外海滑進來：最後一秒仰身、張翅減速
      o.t += dt; const T = 6.5, u = Math.min(1, o.t / T), e = 1 - u, d = 34 * e * e, h = 0.16 + 7.5 * e * e * (0.55 + 0.45 * e), flare = sm(0.78, 1, u);
      o.g.position.set(s.x + o.dirX * d, s.y + h, s.z + o.dirZ * d); o.g.rotation.set(-0.1 - flare * 0.55, o.face, Math.sin(o.t * 1.3) * 0.12 * e);
      o.fph += dt * (7 + flare * 9); wings(o, 0.25 + flare * 0.75, o.fph); o.tilt.rotation.set(0, 0, 0); o.head.rotation.set(0, 0, 0);
      if (u >= 1) { o.st = 'sit'; o.t = 0; standing(o, true); o.lookT = rnd(1, 3); o.face += rnd(-1.2, 1.2); }
      return;
    }
    if (o.st === 'flee') {   // 受驚：先往上蹬、拍幾下，再朝外海飛走
      o.t += dt; const u = o.t; o.d += (1.6 + 6.6 * sm(0, 2.2, u)) * dt;
      const h = 0.16 + 5.5 * (1 - Math.exp(-u / 1.5)) + u * 0.35, d = o.d;
      o.g.position.set(o.from.x + o.dirX * d, o.from.y + h, o.from.z + o.dirZ * d);
      o.g.rotation.set(-0.5 * Math.exp(-u / 1.2) - 0.06, Math.atan2(o.dirX, o.dirZ), 0); o.fph += dt * (13 - 4 * sm(0, 3, u)); wings(o, 1, o.fph); o.tilt.rotation.set(0, 0, 0); o.head.rotation.set(0, 0, 0);
      if (u > 9) { o.st = 'away'; o.t = rnd(25, 70); if (o.spot) o.spot.by = null; o.spot = null; }
      return;
    }
    // 站著：轉頭張望、偶爾理毛；夜裡把頭埋到背上睡
    const dP = Math.hypot(p.x - s.x, p.z - s.z), far = dP > 80;
    if (hide || far) { o.st = 'away'; o.t = far ? rnd(2, 6) : rnd(20, 40); s.by = null; o.spot = null; put(o, false); return; }
    const scared = !dbg.calm && (dP < 2.6 + Math.min(3.4, pSpeed * 0.9) || perch.some(q => q !== o && q.st === 'flee' && q.t > 0.25 && q.t < 0.9 && Math.hypot(q.from.x - s.x, q.from.z - s.z) < 5));
    if (scared) { o.st = 'flee'; o.t = 0; o.d = 0; o.from.set(s.x, s.y, s.z); const ax = s.x - p.x, az = s.z - p.z, al = Math.hypot(ax, az) || 1, sx = Math.sin(s.a), sz = Math.cos(s.a); let dx = ax / al * 0.6 + sx * 0.7, dz = az / al * 0.6 + sz * 0.7; const dl = Math.hypot(dx, dz) || 1; o.dirX = dx / dl; o.dirZ = dz / dl; standing(o, false); return; }
    o.t += dt; o.lookT -= dt; if (o.lookT < 0) { o.lookT = rnd(1.2, 4.5); o.lookTo = Math.random() < 0.2 ? 9 : rnd(-1.1, 1.1); }
    const sleep = dark, preen = o.lookTo === 9 && !sleep;
    o.look += ((sleep ? 1.25 : preen ? 1.9 : o.lookTo) - o.look) * Math.min(1, dt * (preen || sleep ? 3 : 7));
    o.g.position.set(s.x, s.y + 0.162 * o.g.scale.y - (sleep || rain > 0.4 ? 0.035 : 0), s.z); o.g.rotation.set(0, o.face, 0);
    o.tilt.rotation.set(-0.3 + (sleep ? 0.12 : 0) + Math.sin(t * 1.1 + i * 2) * 0.012, 0, 0);
    o.head.rotation.set(preen ? 0.5 : sleep ? 0.45 : 0, o.look, 0); o.head.position.set(0, 0.03 - (sleep ? 0.006 : 0), 0.185 - (sleep ? 0.03 : 0));   // 睡覺：頭縮起來、轉向一側
  });
}
export const dbg = { calm: false, pin: null };   // 測試用：靠近也不飛走
export const debug = () => ({ spots: spots.length, soar: soar.map(o => [o.on, +o.g.position.x.toFixed(1), +o.g.position.y.toFixed(1), +o.g.position.z.toFixed(1)]), perch: perch.map(o => [o.st, o.spot && +o.spot.x.toFixed(1), o.spot && +o.spot.z.toFixed(1)]) });
