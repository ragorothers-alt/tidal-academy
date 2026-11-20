/* 潮汐小島 · 第一人稱的手（v9.24.2 起）：照角色右手骨架的大小，程式化長出手掌、四指、拇指、指甲、前臂與袖口。
   以前是把角色模型的手臂直接切下來放到鏡頭前：遠看的低面數模型放到眼前，手指是幾個方塊、袖口破洞。
   手掌是一團距離場（掌骨、魚際、指根、指蹼平滑融在一起）轉成的網格；手指照各關節的彎曲角掃出來：指節略鼓、指腹飽滿、指尖收圓、指甲是圓角的一小片。
   空手時是放鬆微彎的手；拿東西時手指一節一節彎到碰到握把為止（closeGrip），所以是真的握著傘柄、竿子、提把。
   座標是手骨頭（RightHand）的座標：+y 手腕往手指、+z 掌心、+x 拇指側。膚色與袖子的顏色取自角色自己的貼圖。 */
import * as THREE from 'three';

const V3 = THREE.Vector3, clamp = THREE.MathUtils.clamp, smooth = THREE.MathUtils.smoothstep, FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
/* 手的比例（掌長約 0.05 的手骨頭座標，實際再乘上角色的大小 S）。m：指根關節、l：三節的長度、r：指根半寬、sp：張開的角度、tilt：往拇指側收的角度、relax：放鬆時三個關節各彎多少 */
const SHAPE = {
  Index: { m: [0.0145, 0.05, -0.0008], l: [0.0195, 0.013, 0.0112], r: 0.0049, sp: 0.05, tilt: -0.05, relax: [0.3, 0.66, 0.36] },
  Middle: { m: [0.0048, 0.052, -0.0018], l: [0.0215, 0.0145, 0.0118], r: 0.0051, sp: 0, tilt: 0, relax: [0.34, 0.74, 0.38] },
  Ring: { m: [-0.0048, 0.0496, -0.001], l: [0.0196, 0.0136, 0.0114], r: 0.0048, sp: -0.05, tilt: 0.07, relax: [0.36, 0.82, 0.4] },
  Pinky: { m: [-0.0138, 0.044, 0.0014], l: [0.0156, 0.01, 0.01], r: 0.0042, sp: -0.12, tilt: 0.15, relax: [0.2, 0.96, 0.46] },
};
const THUMB = { c: [0.0115, 0.01, 0.0045], l: [0.021, 0.0155, 0.0125], r: 0.0055 };
/* 各種東西的握法。r：握把半徑、at：握在哪一點、ends：直柄的兩端（都是工具自己的座標與單位，直柄沿工具的 +y）；bar：橫把的半長（橫把沿工具的 x，或用 dir 直接給方向）；
   方向用鏡頭座標寫（x 右、y 上、z 朝自己）：fore 手腕往手肘（沒寫就照骨架的前臂）、up 手腕往指根（沒寫就順著前臂）、thumb、dir 拇指側朝哪；gamma：握把斜過手掌的角度。
   工具掛在哪、怎麼擺都沒動，只有手（和握著時前臂伸過來的方向）是照握把長出來的 */
const GRIP = {
  umbrella: { r: 0.015, at: [0, 0.115, 0], ends: [-0.05, 0.85], fore: [0.2, -0.8, 0.56], gamma: 0.36, cuff: 0.017 },   // 傘柄直立：前臂從右下方伸過來，從拇指這一側看到手指繞過傘柄；cuff：袖口往手腕拉近多少（前臂朝著鏡頭時，露出的手腕看起來會特別長）
  net: { r: 0.0205, at: [0, 0.06, 0], ends: [-0.03, 0.8], gamma: 0.36 },
  rod: { r: 0.0262, at: [0, -0.012, 0], ends: [-0.075, 0.3], gamma: 0.36 },
  shovel: { r: 0.012, at: [0, -0.035, 0], bar: 0.05, thumb: [-1, -0.3, 0], up: 'pole', fore: [0.3, -0.8, 0.52], cuff: 0.01, extra: [[[0.054, -0.03, 0], [0.052, 0.03, 0], 0.012], [[0.052, 0.03, 0], [0.02, 0.072, 0], 0.012], [[-0.054, -0.03, 0], [-0.052, 0.03, 0], 0.012], [[-0.052, 0.03, 0], [-0.02, 0.072, 0], 0.012], [[0, 0.07, 0], [0, 0.3, 0], 0.022]] },   // 握 D 形把手的橫桿，手背朝上；extra 是把手的框與桿子（拇指要避開）
  can: { r: 0.014, bar: 0.045, dir: [-0.697, 0, 0.717], fore: [0.717, -0.15, 0.68], cuff: 0.008 },   // 從上面握住提把（壺身由 fphand 的 canUpright 擺正，提把在鏡頭座標的方向是固定的）
};

function builder() {
  const p = [], c = [], ix = [], fix = [];
  const v = (q, col, a) => { p.push(q.x, q.y, q.z); c.push(col.r, col.g, col.b, a === undefined ? 1 : a); return p.length / 3 - 1; };   // 顏色的第四個數：1 是皮膚、布料，越小越亮滑（指甲）
  const vn = (q, col, n) => { const i = v(q, col); fix.push(i, n.x, n.y, n.z); return i; };   // 法線自己給（距離場的梯度）
  const rows = (R, close) => { for (let r = 0; r < R.length - 1; r++) { const n = R[r].length; for (let k = 0; k < (close ? n : n - 1); k++) { const k1 = (k + 1) % n; ix.push(R[r][k], R[r + 1][k], R[r + 1][k1], R[r][k], R[r + 1][k1], R[r][k1]); } } };
  const fan = (center, row, flip) => { for (let k = 0; k < row.length; k++) { const k1 = (k + 1) % row.length; flip ? ix.push(center, row[k1], row[k]) : ix.push(center, row[k], row[k1]); } };
  const tri = (a, b, d) => { ix.push(a, b, d); };
  const geo = () => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 4)); g.setIndex(ix); g.computeVertexNormals();
    const N = g.attributes.normal; for (let i = 0; i < fix.length; i += 4) N.setXYZ(fix[i], fix[i + 1], fix[i + 2], fix[i + 3]);
    g.computeBoundingSphere(); return g;
  };
  return { v, vn, rows, fan, tri, geo };
}
const _t = new V3(), _o = new V3(), _a = new V3(), _b = new V3(), _r = new V3(), _c = new THREE.Color();

/* ---------- 距離場：一團圓錐膠囊平滑融在一起 ---------- */
/** 一個圓錐膠囊（a 到 b，半徑 ra 到 rb）。o.flat：[軸, 比例] 沿這個軸壓扁；o.sm：和前面融合的範圍；o.pn：這一塊的掌心方向（上色用） */
function prim(a, b, ra, rb, o = {}) {
  const e = b || a, q = { ax: a.x, ay: a.y, az: a.z, dx: e.x - a.x, dy: e.y - a.y, dz: e.z - a.z, ra, rb: b ? rb : ra, sm: o.sm || 0, pn: o.pn || null, fk: 0, fx: 0, fy: 0, fz: 0 };
  q.l2 = q.dx * q.dx + q.dy * q.dy + q.dz * q.dz;
  if (o.flat) { q.fx = o.flat[0].x; q.fy = o.flat[0].y; q.fz = o.flat[0].z; q.fk = 1 / o.flat[1] - 1; }
  return q;
}
function primDist(q, x, y, z) {
  let px = x - q.ax, py = y - q.ay, pz = z - q.az;
  if (q.fk) { const d = (px * q.fx + py * q.fy + pz * q.fz) * q.fk; px += q.fx * d; py += q.fy * d; pz += q.fz * d; }   // 沿壓扁的軸把座標拉開：截面變成橢圓
  let t = q.l2 > 0 ? (px * q.dx + py * q.dy + pz * q.dz) / q.l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  px -= q.dx * t; py -= q.dy * t; pz -= q.dz * t;
  return Math.sqrt(px * px + py * py + pz * pz) - (q.ra + (q.rb - q.ra) * t);
}
function field(L, x, y, z) {   // 平滑聯集
  let d = 1e9;
  for (let i = 0; i < L.length; i++) { const q = L[i], e = primDist(q, x, y, z), k = q.sm; if (k > 0 && Math.abs(d - e) < k) { const h = (k - Math.abs(d - e)) / k; d = Math.min(d, e) - h * h * k * 0.25; } else if (e < d) d = e; }
  return d;
}
function fieldMin(L, x, y, z) { let d = 1e9; for (let i = 0; i < L.length; i++) { const e = primDist(L[i], x, y, z); if (e < d) d = e; } return d; }
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
/** 把距離場的表面變成網格（surface nets）：每個跨過表面的格子放一個頂點，沿梯度貼回表面；法線直接用梯度，所以格子粗也是圓滑的 */
function skinBlob(B, f, lo, hi, h, colOf) {
  const nx = Math.ceil((hi.x - lo.x) / h) + 1, ny = Math.ceil((hi.y - lo.y) / h) + 1, nz = Math.ceil((hi.z - lo.z) / h) + 1, val = new Float32Array(nx * ny * nz), at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[at(i, j, k)] = f(lo.x + i * h, lo.y + j * h, lo.z + k * h);
  const cell = new Int32Array(nx * ny * nz).fill(-1), P = [], N = [], g = [0, 0, 0, 0, 0, 0, 0, 0], e = h * 0.3, G = new V3();
  const grad = p => G.set(f(p.x + e, p.y, p.z) - f(p.x - e, p.y, p.z), f(p.x, p.y + e, p.z) - f(p.x, p.y - e, p.z), f(p.x, p.y, p.z + e) - f(p.x, p.y, p.z - e));
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let m = 0; for (let q = 0; q < 8; q++) { g[q] = val[at(i + (q & 1), j + (q >> 1 & 1), k + (q >> 2))]; if (g[q] < 0) m |= 1 << q; }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of EDGES) { if ((g[a] < 0) === (g[b] < 0)) continue; const t = g[a] / (g[a] - g[b]); sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2) + ((b >> 2) - (a >> 2)) * t; cnt++; }
    const p = new V3(lo.x + (i + sx / cnt) * h, lo.y + (j + sy / cnt) * h, lo.z + (k + sz / cnt) * h);
    for (let it = 0; it < 2; it++) { const d = f(p.x, p.y, p.z), l2 = grad(p).lengthSq(); if (l2 < 1e-16) break; p.addScaledVector(G, -clamp(d * 2 * e / l2, -0.6 * h / Math.sqrt(l2), 0.6 * h / Math.sqrt(l2))); }
    cell[at(i, j, k)] = P.length; P.push(p); N.push(grad(p).clone().normalize());
  }
  const id = P.map((p, i) => B.vn(p, colOf(p, N[i]), N[i]));
  const quad = (a, b, c2, d) => {
    if (a < 0 || b < 0 || c2 < 0 || d < 0) return;
    const flip = _a.subVectors(P[b], P[a]).cross(_b.subVectors(P[c2], P[a])).dot(_r.addVectors(N[a], N[c2])) < 0, q = flip ? [a, d, c2, b] : [a, b, c2, d];   // 面要朝外（跟梯度同向）
    if (P[q[0]].distanceToSquared(P[q[2]]) <= P[q[1]].distanceToSquared(P[q[3]])) { B.tri(id[q[0]], id[q[1]], id[q[2]]); B.tri(id[q[0]], id[q[2]], id[q[3]]); } else { B.tri(id[q[0]], id[q[1]], id[q[3]]); B.tri(id[q[1]], id[q[2]], id[q[3]]); }
  };
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const s = val[at(i, j, k)] < 0;
    if (j > 0 && k > 0 && s !== (val[at(i + 1, j, k)] < 0)) quad(cell[at(i, j - 1, k - 1)], cell[at(i, j, k - 1)], cell[at(i, j, k)], cell[at(i, j - 1, k)]);
    if (i > 0 && k > 0 && s !== (val[at(i, j + 1, k)] < 0)) quad(cell[at(i - 1, j, k - 1)], cell[at(i, j, k - 1)], cell[at(i, j, k)], cell[at(i - 1, j, k)]);
    if (i > 0 && j > 0 && s !== (val[at(i, j, k + 1)] < 0)) quad(cell[at(i - 1, j - 1, k)], cell[at(i, j - 1, k)], cell[at(i, j, k)], cell[at(i - 1, j, k)]);
  }
}

/* ---------- 骨架：手指的關節怎麼彎 ---------- */
/** 從指根沿 u 長出去，每一節往 n（掌心方向）彎 angs[i]。回傳關節位置 P、各節方向 U、各節的掌心方向 N */
function fk(base, u, n, lens, angs) {
  const P = [base.clone()], U = [], N = []; let cu = u, cn = n;
  for (let i = 0; i < lens.length; i++) { const c = Math.cos(angs[i]), s = Math.sin(angs[i]), nu = cu.clone().multiplyScalar(c).addScaledVector(cn, s), nn = cn.clone().multiplyScalar(c).addScaledVector(cu, -s); cu = nu; cn = nn; U.push(cu); N.push(cn); P.push(P[i].clone().addScaledVector(cu, lens[i])); }
  return { P, U, N, len: lens };
}
/** 兩條線段之間的最近距離 */
function segDist(p1, q1, p2, q2) {
  const d1 = _a.subVectors(q1, p1), d2 = _b.subVectors(q2, p2), r = _r.subVectors(p1, p2), a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r), c = d1.dot(r), b = d1.dot(d2), den = a * e - b * b;
  let s = den > 1e-14 ? clamp((b * f - c * e) / den, 0, 1) : 0, t = e > 1e-14 ? (b * s + f) / e : 0;
  if (t < 0) { t = 0; s = a > 1e-14 ? clamp(-c / a, 0, 1) : 0; } else if (t > 1) { t = 1; s = a > 1e-14 ? clamp((b - c) / a, 0, 1) : 0; }
  return _t.copy(p1).addScaledVector(d1, s).sub(_o.copy(p2).addScaledVector(d2, t)).length();
}
/** 握：關節一個一個彎到碰到東西為止。obst：[{ a, b, r }]（握把、已經擺好的手指）；floor(p)：這一點離掌面多高；first：先彎哪個關節；k：後面兩個關節一起彎的比例 */
function closeGrip(base, u, n, lens, rad, lim, obst, floor, first, k, both) {
  const ang = lens.map(() => 0), step = 0.025;
  const ok = () => { const c = fk(base, u, n, lens, ang); for (let i = 0; i < lens.length; i++) { for (const o of obst) if (segDist(c.P[i], c.P[i + 1], o.a, o.b) < o.r + rad[i]) return false; if (floor && i > 0 && floor(c.P[i + 1]) < rad[i]) return false; } return true; };
  const run = set => { for (let t = 0; t < 120; t++) { const keep = ang.slice(); if (!set()) break; if (!ok()) { keep.forEach((x, i) => { ang[i] = x; }); break; } } };
  const a = first, b = first + 1, c = first + 2;
  while (!ok() && ang[a] < lim[a]) ang[a] += step;   // 一開始就卡到：先彎到不卡為止
  if (!ok()) return null;
  if (both) run(() => { if (ang[a] >= lim[a] || ang[b] >= lim[b]) return false; ang[a] += step; ang[b] = Math.min(lim[b], ang[a] * k); return true; });   // 拇指：兩個關節先一起扣
  run(() => { if (ang[a] >= lim[a]) return false; ang[a] += step; return true; });
  if (c < lens.length) { run(() => { if (ang[b] >= lim[b]) return false; ang[b] += step; ang[c] = Math.min(lim[c], ang[b] * k); return true; }); run(() => { if (ang[c] >= lim[c]) return false; ang[c] += step; return true; }); }
  else run(() => { if (ang[b] >= lim[b]) return false; ang[b] += step; return true; });
  return ang;
}
/** 握東西時的拇指：指尖搭到 tip，三節在同一個平面裡往 w 那邊拱（指腹朝內）；盡量不穿過 obst。回傳和 fk 一樣的骨架，搆不到就回傳 null */
function thumbReach(base, tip, w, lens, rad, obst) {
  const e = tip.clone().sub(base), tot = lens[0] + lens[1] + lens[2], d = e.length() > tot * 0.9 ? tot * 0.8 : e.length(); e.normalize();   // 搆不到：往那個方向彎著伸過去，不要整根伸直
  const T = base.clone().addScaledVector(e, d), wv = w.clone().addScaledVector(e, -w.dot(e)).normalize(); let best = null, bs = 1e9;
  for (const o of obst) if (o.hard) { const ab = _a.subVectors(o.b, o.a), t = clamp(_b.subVectors(T, o.a).dot(ab) / ab.lengthSq(), 0, 1), q = _b.copy(o.a).addScaledVector(ab, t), gap = T.distanceTo(q); if (gap < o.r + rad[2] && gap > 1e-9) T.sub(q).multiplyScalar((o.r + rad[2]) / gap).add(q); }   // 指尖不能落在握把裡面
  for (let ph = 0.05; ph < 1.45; ph += 0.05) {
    const u0 = e.clone().multiplyScalar(Math.cos(ph)).addScaledVector(wv, Math.sin(ph)), P1 = base.clone().addScaledVector(u0, lens[0]), r = T.clone().sub(P1), D = r.length();
    if (D > (lens[1] + lens[2]) * 0.995 || D < Math.abs(lens[1] - lens[2]) * 1.05) continue;
    const a = Math.acos(clamp((lens[1] ** 2 + D * D - lens[2] ** 2) / (2 * lens[1] * D), -1, 1)), rn = r.normalize(), wp = wv.clone().addScaledVector(rn, -wv.dot(rn)).normalize();
    const u1 = rn.clone().multiplyScalar(Math.cos(a)).addScaledVector(wp, Math.sin(a)), P2 = P1.clone().addScaledVector(u1, lens[1]), u2 = T.clone().sub(P2).normalize(), P = [base.clone(), P1, P2, T.clone()];
    let pen = Math.abs(Math.acos(clamp(u0.dot(u1), -1, 1)) - 0.7 * Math.acos(clamp(u1.dot(u2), -1, 1)));   // 兩個關節彎得差不多才自然
    for (let i = 0; i < 3; i++) for (const o of obst) pen += Math.max(0, o.r + rad[i] - segDist(P[i], P[i + 1], o.a, o.b)) * (o.hard ? 3000 : 300);
    if (pen < bs) { bs = pen; const U = [u0, u1, u2]; best = { P, U, N: U.map(u => wv.clone().addScaledVector(u, -wv.dot(u)).normalize().negate()), len: lens }; }
  }
  return best;
}

/* ---------- 手指 ---------- */
/** 沿一串座標架掃出管子。F：[{ p, t, n, b, rb（半寬）, rd（手背側半厚）, rp（掌心側半厚） }] */
function tube(B, F, seg, colOf) {
  const R = F.map(f => { const row = []; for (let k = 0; k < seg; k++) {
    const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), rn = sa > 0 ? f.rp : f.rd;
    _t.copy(f.p).addScaledVector(f.b, ca * f.rb).addScaledVector(f.n, sa * rn); _o.copy(f.b).multiplyScalar(ca * rn).addScaledVector(f.n, sa * f.rb).normalize();
    row.push(B.v(_t, colOf(f, sa, _t, _o))); } return row; });
  B.rows(R, true); return R;
}
function frameAt(F, s) {   // 兩圈之間內插
  let i = 0; while (i < F.length - 2 && F[i + 1].s < s) i++;
  const a = F[i], b = F[i + 1], k = clamp((s - a.s) / Math.max(1e-9, b.s - a.s), 0, 1);
  return { p: a.p.clone().lerp(b.p, k), n: a.n.clone().lerp(b.n, k).normalize(), b: a.b.clone().lerp(b.b, k).normalize(), rb: a.rb + (b.rb - a.rb) * k, rd: a.rd + (b.rd - a.rd) * k };
}
/** 一根手指：每一節是直的，關節用圓弧轉過去（內側擠出摺痕、外側是圓的指節）；指節略鼓、指腹飽滿、往指尖收細，指尖收圓，背面貼一片指甲。
    c：fk 的結果；r0：指根半寬；from：從第一節的哪裡開始長（前面埋在手掌裡）；o：{ tone, ao, col, thumb } */
function finger(B, c, r0, from, o) {
  const n = c.U.length, len = c.len, bend = [], F = [], sJ = [], sMid = [];
  for (let i = 0; i < n - 1; i++) { const th = Math.acos(clamp(c.U[i].dot(c.U[i + 1]), -1, 1)), tau = Math.min(r0 * 0.95 * Math.tan(th / 2), 0.42 * Math.min(len[i], len[i + 1])); bend.push({ th, tau: th > 0.03 ? tau : 0, rho: th > 0.03 ? tau / Math.tan(th / 2) : 0 }); }
  const rTip = r0 * 0.8; let s = 0, lt = rTip * 1.3;
  const push = (p, t, nn, at) => { F.push({ p, t, n: nn, b: new V3().crossVectors(t, nn).normalize(), s: at }); };
  for (let i = 0; i < n; i++) {
    const u = c.U[i], nn = c.N[i], last = i === n - 1, t0 = i === 0 ? from * len[0] : bend[i - 1].tau, t1 = last ? len[i] : len[i] - bend[i].tau, Ls = t1 - t0, stops = [];
    if (last) { lt = Math.min(lt, Ls * 0.7); stops.push(0, (Ls - lt) * 0.5, Ls - lt); for (const th of [0.4, 0.75, 1.05, 1.3, 1.47]) stops.push(Ls - lt + lt * Math.sin(th)); } else stops.push(0, Ls / 3, Ls * 2 / 3, Ls);
    stops.forEach((d, j) => { if (i > 0 && j === 0) return; push(c.P[i].clone().addScaledVector(u, t0 + d), u, nn, s + d); });
    sMid.push(s + Ls / 2); s += Ls;
    if (last) break;
    const bd = bend[i];
    if (bd.th > 0.03) {
      const A = c.P[i].clone().addScaledVector(u, t1), steps = Math.max(2, Math.round(bd.th / 0.3));
      for (let j = 1; j <= steps; j++) { const ph = bd.th * j / steps, cs = Math.cos(ph), sn = Math.sin(ph); push(A.clone().addScaledVector(nn, bd.rho * (1 - cs)).addScaledVector(u, bd.rho * sn), u.clone().multiplyScalar(cs).addScaledVector(nn, sn), nn.clone().multiplyScalar(cs).addScaledVector(u, -sn), s + bd.rho * ph); }
      sJ.push(s + bd.rho * bd.th / 2); s += bd.rho * bd.th;
    } else sJ.push(s);
  }
  const Lt = s, tipS = Lt - lt, sD = sJ[sJ.length - 1];
  for (const f of F) {
    const u = f.s / Lt; let kn = 0, pad = 0; for (const q of sJ) kn += Math.exp(-(((f.s - q) / (r0 * 1.05)) ** 2)); sMid.forEach((q, i) => { pad += Math.exp(-(((f.s - q) / (len[i] * 0.34)) ** 2)); });
    let rb = r0 * (1 - 0.2 * u) * (1 + 0.05 * kn) * (o.thumb ? 1.04 : 1), rd = rb * (0.84 + 0.11 * kn) * (o.thumb ? 0.92 : 1), rp = rb * (0.88 + 0.12 * pad - 0.07 * kn);
    const w = smooth(f.s, sD, sD + r0); rd *= 1 - 0.08 * w + (o.root === undefined ? 0.13 : o.root) * (1 - smooth(f.s, 0, len[0] * 0.55)); rp *= 1 + 0.05 * w;   // 最後一節：甲床平一點、指腹飽一點；指根的背面厚一點，接上指根關節
    if (f.s > tipS) { const e = Math.sqrt(Math.max(0, 1 - ((f.s - tipS) / lt) ** 2)); rb *= e; rd *= e; rp *= e; }
    f.rb = rb; f.rd = rd; f.rp = rp; f.u = u; f.kn = Math.min(1, kn);
  }
  const crease = f => { let x = 0; for (const q of sJ) x += Math.exp(-(((f.s - q) / (r0 * 0.3)) ** 2)); return Math.min(1, x); };
  const colOf = (f, sa, p, nrm) => o.tone(sa, 0.44 * smooth(f.u, 0.66, 1) * (0.5 + 0.5 * Math.max(0, sa)) + 0.42 * f.kn * Math.max(0, -sa), crease(f) * (0.34 * Math.max(0, sa) + 0.08 * Math.max(0, -sa)), o.ao(p, nrm));   // 指腹、指節偏暖紅；掌心側的關節有淡淡的摺痕
  const R = tube(B, F, 12, colOf), end = c.P[n];
  B.fan(B.v(end, colOf(F[F.length - 1], 0, end, c.U[n - 1])), R[R.length - 1], true);
  // 指甲：最後一節背面的圓角小片，中間略高、邊緣貼著皮膚；前緣一小段白
  const a0 = sD + (Lt - sD) * 0.42, a1 = Lt - lt * 0.42, W = o.thumb ? 0.9 : 0.84, ref = frameAt(F, a0 + (a1 - a0) * 0.5), NR = [], TT = [0, 0.07, 0.22, 0.42, 0.62, 0.8, 0.93, 1];
  TT.forEach((t, i) => {
    const f = frameAt(F, a0 + (a1 - a0) * t), w = W * (1 - Math.abs(2 * t - 1) ** 2.6) ** (1 / 2.6), rb = t > 0.5 ? Math.max(f.rb, ref.rb * 0.95) : f.rb, rd = t > 0.5 ? Math.max(f.rd, ref.rd * 0.97) : f.rd, row = [];
    for (let k = 0; k <= 4; k++) {
      const x = k / 4 - 0.5, a = -Math.PI / 2 + x * 2 * w, edge = i === 0 || i === TT.length - 1 || k === 0 || k === 4, lift = edge ? 1.012 : 1.035 + 0.03 * Math.cos(x * Math.PI);
      if (edge && i < TT.length - 1) _c.copy(o.col.fold); else _c.copy(o.col.nail).lerp(o.col.nailTip, smooth(t, 0.84, 0.98));   // 邊緣一圈是甲溝的陰影，前緣是白的
      row.push(B.v(_t.copy(f.p).addScaledVector(f.b, Math.cos(a) * rb * lift).addScaledVector(f.n, Math.sin(a) * rd * lift), _c, edge ? 0.8 : 0.25));
    }
    NR.push(row);
  });
  B.rows(NR, false);
}

/** 沿固定軸放樣（前臂、袖子）：rings = [{ c（中心）, rb, rn, col, wr（皺褶量）, pw（超橢圓指數） }] */
function loft(B, rings, bx, bz, seg) {
  const R = rings.map((g, gi) => { const row = []; for (let k = 0; k < seg; k++) {
    const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), pw = g.pw || 1, ex = Math.sign(ca) * Math.abs(ca) ** pw, ez = Math.sign(sa) * Math.abs(sa) ** pw, w = 1 + (g.wr || 0) * (Math.sin(a * 3 + gi * 1.7) * 0.6 + Math.sin(a * 5 - gi * 2.3) * 0.4);
    row.push(B.v(_t.copy(g.c).addScaledVector(bx, ex * g.rb * w).addScaledVector(bz, ez * g.rn * w), typeof g.col === 'function' ? g.col(sa, _t) : g.col)); } return row; });
  B.rows(R, true);
}

/** 握著東西時，手要擺在哪：握把斜斜橫過掌心（拇指側在 a 的方向），手腕往指根大致朝 up。回傳手的座標換到手骨頭座標的矩陣 */
function gripFrame(g, up, S) {
  const gam = g.gamma || 0, e1 = g.a.clone().normalize(), e2 = up.clone().addScaledVector(e1, -up.dot(e1)).normalize(), e3 = new V3().crossVectors(e1, e2);
  const xb = e1.clone().multiplyScalar(Math.cos(gam)).addScaledVector(e2, -Math.sin(gam)), yb = e1.clone().multiplyScalar(Math.sin(gam)).addScaledVector(e2, Math.cos(gam));
  const M = new THREE.Matrix4().makeBasis(xb, yb, e3), G = new V3(g.gx * S, Math.min(0.047, 0.041 + 0.0186 * Math.tan(gam)) * S - 0.35 * g.r, 0.0056 * S + 0.96 * g.r);   // 握把的軸線通過掌心上方這一點
  return M.setPosition(g.o.clone().sub(G.applyMatrix4(M)));
}
/** 這種東西要怎麼握（手骨頭座標）。poseQ：手在鏡頭前的旋轉；holderPos、holderScale：工具掛在手上的位置與縮放；toolQ：工具本身的旋轉。空手回傳 null */
export function gripOf(kind, poseQ, holderPos, holderScale, toolQ) {
  const g = GRIP[kind]; if (!g) return null;
  const sc = holderScale, qi = poseQ.clone().invert(), cam = v => new V3(v[0], v[1], v[2]).normalize().applyQuaternion(qi), loc = v => holderPos.clone().add(new V3(v[0], v[1], v[2]).multiplyScalar(sc).applyQuaternion(toolQ));
  const pole = new V3(0, 1, 0).applyQuaternion(toolQ), o = loc(g.at || [0, 0, 0]), r = g.r * sc; let a = pole, obst;
  if (g.bar) { a = g.dir ? cam(g.dir) : new V3(1, 0, 0).applyQuaternion(toolQ); if (g.thumb && a.dot(cam(g.thumb)) < 0) a.negate(); obst = [{ a: o.clone().addScaledVector(a, -g.bar * sc), b: o.clone().addScaledVector(a, g.bar * sc), r }]; }   // 橫把：軸線沿工具的 x
  else obst = [{ a: loc([0, g.ends[0], 0]), b: loc([0, g.ends[1], 0]), r }];
  return { o, a, r, gamma: g.gamma || 0, gx: g.bar ? 0.0015 : 0.0048, cuff: g.cuff || 0, fore: g.fore ? cam(g.fore) : null, up: g.up === 'pole' ? pole.clone() : g.up ? cam(g.up) : null, obst, extra: (g.extra || []).map(e => ({ a: loc(e[0]), b: loc(e[1]), r: e[2] * sc })) };
}

/** J：手骨頭座標下的關節（Vector3）：ForeArm、Index1..4、Middle1..4、Ring1..4、Pinky1..4、Thumb1..4；colIn：{ skin, sleeve, trim }（THREE.Color）；grip：gripOf 的結果（空手不給） */
export function buildHand(J, colIn, grip) {
  const B = builder(), Kj = FINGERS.reduce((a, f) => a.add(J[f + '1']), new V3()).multiplyScalar(0.25), S = Kj.length() / 0.0489;   // S：這個角色的手相對基準大小
  const skin = colIn.skin, col = { skin, palm: skin.clone().lerp(new THREE.Color('#f6ddd2'), 0.5), flush: skin.clone().lerp(new THREE.Color('#cf866e'), 0.6), nail: skin.clone().lerp(new THREE.Color('#efc4bb'), 0.5), nailTip: skin.clone().lerp(new THREE.Color('#f8ece4'), 0.7), crease: skin.clone().multiply(new THREE.Color(0.72, 0.56, 0.52)), fold: skin.clone().multiply(new THREE.Color(0.86, 0.72, 0.69)) };
  const fore = (grip && grip.fore ? grip.fore.clone() : J.ForeArm.clone()).normalize(), M = new THREE.Matrix4();
  if (grip) M.copy(gripFrame(grip, grip.up || fore.clone().negate(), S));
  else { const yK = Kj.clone().normalize(), pz = new V3(0, 0, 1).addScaledVector(yK, -yK.z).normalize(); M.makeBasis(new V3().crossVectors(yK, pz), yK, pz); }   // 空手：照骨架的方向
  const xb = new V3(), yb = new V3(), zb = new V3(); M.extractBasis(xb, yb, zb);
  const C = (x, y, z) => new V3(x, y, z).multiplyScalar(S).applyMatrix4(M), D = (x, y, z) => new V3(x, y, z).transformDirection(M), W = C(0, 0, 0);
  // 骨架：空手是放鬆微彎；握著東西時彎到碰到握把
  const obst = grip ? grip.obst : null, floor = p => (_r.subVectors(p, W).dot(yb) < 0.046 * S ? _r.dot(zb) - 0.0056 * S : Infinity);
  const fingers = FINGERS.map(f => {
    const h = SHAPE[f], sp = grip ? h.sp * 0.25 : h.sp, u = D(Math.sin(sp), Math.cos(sp), 0), n = D(Math.sin(h.tilt), 0, Math.cos(h.tilt)); n.addScaledVector(u, -n.dot(u)).normalize();
    const base = C(h.m[0], h.m[1], h.m[2]), lens = h.l.map(x => x * S), r0 = h.r * S, ang = (grip && closeGrip(base, u, n, lens, [r0 * 0.8, r0 * 0.74, r0 * 0.66], [1.5, 1.85, 1.2], obst, floor, 0, 0.62)) || h.relax;
    return { c: fk(base, u, n, lens, ang), r0, base };
  });
  const tl = THUMB.l.map(x => x * S), tr = THUMB.r * S, tc = C(THUMB.c[0], THUMB.c[1], THUMB.c[2]); let thumb = null;
  if (grip) {   // 拇指：繞過握把，指腹搭在食指最後一節上；搆不到就張開到不會撞到東西，再往手指那邊扣回來
    const ob2 = obst.concat(grip.extra).map(o => ({ ...o, hard: true })).concat(fingers.flatMap(q => [0, 1, 2].map(i => ({ a: q.c.P[i], b: q.c.P[i + 1], r: q.r0 * 0.9 }))));
    const ax = obst[0].b.clone().sub(obst[0].a).normalize(), want = (tl[0] + tl[1] + tl[2]) * 0.85; let tip = null, bd = 1e9;
    for (const q of [fingers[0], fingers[1]]) for (const i of [2, 1]) {   // 食指、中指的後兩節裡，挑拇指伸過去最自然的那一節搭上去
      const m = q.c.P[i].clone().lerp(q.c.P[i + 1], 0.45), out = m.clone().sub(obst[0].a); out.addScaledVector(ax, -out.dot(ax)).normalize(); m.addScaledVector(out, q.r0 * 0.75 + tr * 0.7);
      const dd = Math.abs(m.distanceTo(tc) - want) + (q === fingers[0] ? 0 : 0.002 * S); if (dd < bd) { bd = dd; tip = m; }
    }
    thumb = thumbReach(tc, tip, D(0.55, -0.25, 0.8), tl, [tr * 0.85, tr * 0.8, tr * 0.72], ob2);
    for (let al = 0.6; al <= 1.36 && !thumb; al += 0.05) {
      const u = D(0.42 * Math.cos(al), 0.4 * Math.cos(al), 0.58 * Math.sin(al)), n = D(-0.5, 0.85, -0.1); n.addScaledVector(u, -n.dot(u)).normalize();
      const ang = closeGrip(tc, u, n, tl, [tr * 0.85, tr * 0.8, tr * 0.72], [0, 1.0, 1.3], ob2, null, 1, 1.3, true); if (ang) thumb = fk(tc, u, n, tl, ang);
    }
  }
  if (!thumb) { const u = D(0.54, 0.77, 0.34), n = D(-0.5, 0.2, 0.84); n.addScaledVector(u, -n.dot(u)).normalize(); thumb = fk(tc, u, n, tl, [0, 0.22, 0.3]); }
  // 前臂的座標架
  const bx = xb.clone().addScaledVector(fore, -xb.dot(fore)).normalize(), bz = new V3().crossVectors(bx, fore).normalize(); if (bz.dot(zb) < 0) bz.negate();
  const at = d => W.clone().addScaledVector(fore, d * S);
  // 手掌：掌骨、指根關節、指根、魚際、小魚際、虎口、手腕
  const prims = [], add = (a, b, ra, rb, o) => { prims.push(prim(a, b, ra * S, rb * S, { ...o, sm: (o.sm || 0) * S, pn: o.pn || zb })); }, knuckles = [];
  FINGERS.forEach((f, i) => {
    const h = SHAPE[f], q = fingers[i], r = h.r, pk = i === 3;   // 小指的指根關節在手的邊緣，做小一點、往掌心收，側看才不會是一顆球
    add(C(h.m[0] * 0.5, 0.006, -0.0006), C(h.m[0], h.m[1] - 0.001, h.m[2] - (pk ? -0.0004 : 0.0006)), 0.0066, r * (pk ? 0.78 : 1.04), { sm: pk ? 0.003 : 0.0045 });
    if (!pk) add(C(h.m[0], h.m[1] - 0.0006, h.m[2] - 0.0004), null, r * 0.96, 0, { sm: 0.0045 });
    knuckles.push(C(h.m[0], h.m[1], h.m[2] - 0.004));
    add(q.c.P[0], q.c.P[0].clone().addScaledVector(q.c.U[0], 0.44 * q.c.len[0]), r * (pk ? 0.86 : 0.99), r * (pk ? 0.82 : 0.86), { sm: pk ? 0.0024 : 0.0036, pn: q.c.N[0] });   // 指根：手指從這裡長出去，相鄰的融成指蹼
    const g = SHAPE[FINGERS[i + 1]]; if (g) add(C((h.m[0] + g.m[0]) * 0.25, 0.006, -0.0004), C((h.m[0] + g.m[0]) / 2, (h.m[1] + g.m[1]) / 2 - 0.002, (h.m[2] + g.m[2]) / 2 - 0.0002), 0.0064, (r + g.r) / 2, { sm: 0.0045 });   // 掌骨之間補滿：手背是一片，指根關節只微微凸出
  });
  add(C(0.0008, 0.028, 0.0012), null, 0.0168, 0, { sm: 0.004, flat: [zb, 0.36] });   // 掌心
  add(thumb.P[0], thumb.P[1], 0.0084, 0.0066, { sm: 0.006, pn: thumb.N[0] });   // 魚際
  add(thumb.P[1], thumb.P[1].clone().addScaledVector(thumb.U[1], 0.6 * tl[1]), THUMB.r * 1.12, THUMB.r * 0.94, { sm: 0.0035, pn: thumb.N[1] });
  add(thumb.P[0].clone().lerp(thumb.P[1], 0.7), C(0.0125, 0.04, 0.001), 0.0036, 0.0036, { sm: 0.007 });   // 虎口
  add(C(-0.0112, 0.009, 0.0032), C(-0.0135, 0.034, 0.0028), 0.007, 0.0052, { sm: 0.005 });   // 小魚際
  add(C(0, 0.002, 0), C(0, 0.01, 0), 0.0117, 0.0118, { sm: 0.004, flat: [zb, 0.7] });   // 手腕（手這一側）
  add(at(0.001), at(0.044), 0.0127, 0.0146, { sm: 0.003, flat: [bz, 0.78], pn: bz });   // 前臂：一路伸進袖口裡（和手是同一張皮，手腕沒有接縫）
  // 遮蔽：整隻手加上握把，縫隙、指縫、握住的地方會暗一點
  const occ = prims.slice(); fingers.forEach(q => { for (let i = 0; i < 3; i++) occ.push(prim(q.c.P[i], q.c.P[i + 1], q.r0 * (0.9 - 0.07 * i), q.r0 * (0.84 - 0.07 * i))); });
  for (let i = 1; i < 3; i++) occ.push(prim(thumb.P[i], thumb.P[i + 1], tr * (0.97 - 0.07 * i), tr * (0.9 - 0.07 * i)));
  if (grip) for (const o of obst.concat(grip.extra)) occ.push(prim(o.a, o.b, o.r, o.r));
  const ao = (p, n) => { let a = 0; for (const [d, w] of [[0.0028 * S, 0.55], [0.0075 * S, 0.45]]) a += w * clamp(fieldMin(occ, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d) / d, 0, 1); return a; };
  const tone = (side, flush, crease, a) => { _c.copy(col.skin).lerp(col.palm, smooth(side, -0.15, 0.75) * 0.68).lerp(col.flush, flush).lerp(col.crease, crease); const k = 1 - a, dz = smooth(-side, 0, 0.8); _c.r *= 1 - 0.4 * k; _c.g *= (1 - 0.56 * k) * (1 - 0.035 * dz); _c.b *= (1 - 0.6 * k) * (1 - 0.055 * dz); return _c; };   // 手背比掌心暖一點；縫隙裡偏紅褐
  const sig = 0.0028 * S, pn = new V3();
  const blobCol = (p, n) => {
    pn.set(0, 0, 0); for (const q of prims) { const d = Math.max(0, primDist(q, p.x, p.y, p.z)); pn.addScaledVector(q.pn, Math.exp(-((d / sig) ** 2))); }   // 掌心方向：照附近的零件混合
    const side = pn.lengthSq() > 1e-12 ? n.dot(pn.normalize()) : n.dot(zb); let kn = 0; for (const q of knuckles) kn += Math.exp(-((p.distanceTo(q) / (0.0075 * S)) ** 2));
    return tone(side, 0.3 * Math.min(1, kn) * Math.max(0, -side), 0, ao(p, n));
  };
  const lo = new V3(1e9, 1e9, 1e9), hi = new V3(-1e9, -1e9, -1e9);
  for (const q of prims) for (const k of [0, 1]) { const r = Math.max(q.ra, q.rb) + 0.004 * S; _t.set(q.ax + q.dx * k, q.ay + q.dy * k, q.az + q.dz * k); lo.min(_o.copy(_t).addScalar(-r)); hi.max(_o.copy(_t).addScalar(r)); }
  // 手背的伸指肌腱：從手腕往食指、中指、無名指的指根各一條，微微鼓起（不到一公釐）
  const tend = [0, 1, 2].map(i => { const h = SHAPE[FINGERS[i]]; return [h.m[0] * 0.32 * S, 0.012 * S, (h.m[0] * 0.64) * S, (h.m[1] - 0.019) * S]; }), sg2 = (0.0021 * S) ** 2;
  const ridge = (x, y, z) => {
    const px = x - W.x, py = y - W.y, pz = z - W.z, lz = px * zb.x + py * zb.y + pz * zb.z; if (lz > -0.002 * S) return 0;
    const lx = px * xb.x + py * xb.y + pz * xb.z, ly = px * yb.x + py * yb.y + pz * yb.z; let b = 0;
    for (const t of tend) { const k = clamp((ly - t[1]) / t[3], 0, 1), ex = lx - t[0] - t[2] * k; b += Math.exp(-ex * ex / sg2) * smooth(k, 0, 0.3) * (1 - smooth(k, 0.7, 1)); }
    return b * 0.0004 * S * smooth(-lz, 0.002 * S, 0.0045 * S);
  };
  skinBlob(B, (x, y, z) => field(prims, x, y, z) - ridge(x, y, z), lo, hi, 0.00185 * S, blobCol);
  const O = { tone, ao, col };
  fingers.forEach((q, i) => finger(B, q.c, q.r0, 0.03, i === 3 ? { ...O, root: 0.03 } : O));   // 小指的指根不加厚
  finger(B, { P: thumb.P.slice(1), U: thumb.U.slice(1), N: thumb.N.slice(1), len: tl.slice(1) }, tr, 0.02, { ...O, thumb: true });
  // 袖子
  const sleeve = colIn.sleeve, trim = colIn.trim, dark = sleeve.clone().multiplyScalar(0.28);
  const cs = grip ? grip.cuff : 0, sl = (d, rb, rn, c, wr) => ({ c: at(d - cs), rb: rb * S, rn: rn * S, col: c, wr });
  loft(B, [sl(0.052, 0.0152, 0.0128, dark), sl(0.032, 0.017, 0.0148, dark), sl(0.0292, 0.0214, 0.0194, trim), sl(0.0312, 0.0232, 0.0212, trim), sl(0.0425, 0.0234, 0.0214, trim), sl(0.044, 0.0222, 0.0202, sleeve),
    sl(0.058, 0.0232, 0.0212, sleeve, 0.03), sl(0.085, 0.0252, 0.0232, sleeve, 0.045), sl(0.125, 0.0278, 0.0258, sleeve, 0.05), sl(0.18, 0.0305, 0.0285, sleeve, 0.045), sl(0.25, 0.033, 0.031, sleeve, 0.04), sl(0.34, 0.035, 0.033, sleeve, 0.03)], bx, bz, 20);
  return B.geo();
}

/** 手的材質：頂點色 + 一點環境補光（背光、黃昏、夜裡不會黑成一團） */
export function handMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide }), fill = { value: new THREE.Color(0, 0, 0) };
  m.onBeforeCompile = sh => { sh.uniforms.uFpFill = fill; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFpFill;').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n  reflectedLight.indirectDiffuse += material.diffuseColor * uFpFill;').replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n#ifdef USE_COLOR_ALPHA\n  roughnessFactor = mix(0.28, roughnessFactor, vColor.a);\n#endif'); };   // 指甲比皮膚亮滑（頂點色的第四個數）
  m.userData.fill = fill; m.name = 'fp-hand';
  return m;
}
