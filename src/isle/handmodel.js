/* 潮汐小島 · 第一人稱的手（v9.24.2）：照角色右手骨架的關節位置（待機姿勢），程式化長出手掌、四指、拇指、指甲、前臂與袖口。
   以前是把角色模型的手臂直接切下來放到鏡頭前：遠看的低面數模型放到眼前，手指是幾個方塊、袖口破洞。
   座標是手骨頭（RightHand）的座標：+y 手腕往手指、+z 掌心、+x 拇指側。膚色與袖子的顏色取自角色自己的貼圖。 */
import * as THREE from 'three';

const V3 = THREE.Vector3, FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
function builder() {
  const p = [], c = [], ix = [];
  const v = (q, col) => { p.push(q.x, q.y, q.z); c.push(col.r, col.g, col.b); return p.length / 3 - 1; };
  const rows = (R, close) => { for (let r = 0; r < R.length - 1; r++) { const n = R[r].length; for (let k = 0; k < (close ? n : n - 1); k++) { const k1 = (k + 1) % n; ix.push(R[r][k], R[r + 1][k], R[r + 1][k1], R[r][k], R[r + 1][k1], R[r][k1]); } } };
  const fan = (center, row, flip) => { for (let k = 0; k < row.length; k++) { const k1 = (k + 1) % row.length; flip ? ix.push(center, row[k1], row[k]) : ix.push(center, row[k], row[k1]); } };
  const geo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(ix); g.computeVertexNormals(); g.computeBoundingSphere(); return g; };
  return { v, rows, fan, geo };
}
const _q = new THREE.Quaternion(), _t = new V3();
/** 沿中心線掃出一條管子：samples = [{ p, rb, rn, u }]（rb：寬、rn：厚）；n0：起點的掌心方向。回傳每一圈的座標架（做指甲用） */
function sweep(B, samples, n0, seg, colOf, capStart) {
  const R = [], F = []; let n = null; const tPrev = new V3();
  samples.forEach((s, i) => {
    const t = samples[Math.min(i + 1, samples.length - 1)].p.clone().sub(samples[Math.max(i - 1, 0)].p).normalize();
    if (!n) n = n0.clone().addScaledVector(t, -n0.dot(t)).normalize(); else { n.applyQuaternion(_q.setFromUnitVectors(tPrev, t)); n.addScaledVector(t, -n.dot(t)).normalize(); }
    tPrev.copy(t); const b = new V3().crossVectors(t, n).normalize(), row = [];
    for (let k = 0; k < seg; k++) { const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); row.push(B.v(_t.copy(s.p).addScaledVector(b, ca * s.rb).addScaledVector(n, sa * s.rn), colOf(s.u, sa, ca))); }
    R.push(row); F.push({ p: s.p, t, n: n.clone(), b, rb: s.rb, rn: s.rn, u: s.u });
  });
  B.rows(R, true);
  const last = samples[samples.length - 1]; B.fan(B.v(last.p.clone().addScaledVector(F[F.length - 1].t, Math.min(last.rb, last.rn) * 0.6), colOf(1, 0, 0)), R[R.length - 1], true);
  if (capStart) B.fan(B.v(samples[0].p, colOf(0, 0, 0)), R[0], false);
  return F;
}
/** 一根手指：沿關節的平滑曲線，指節略粗、指尖收圓，背面貼一片指甲 */
function finger(B, joints, r0, n0, col, nail) {
  const pre = joints[0].clone().addScaledVector(joints[0].clone().sub(joints[1]).normalize(), r0 * 1.1), curve = new THREE.CatmullRomCurve3([pre, ...joints], false, 'centripetal'), L = curve.getLength();
  const sJ = []; { let acc = 0; const pts = [pre, ...joints]; for (let i = 1; i < pts.length; i++) { acc += pts[i].distanceTo(pts[i - 1]); sJ.push(acc); } } const Lp = sJ[sJ.length - 1]; sJ.forEach((s, i) => { sJ[i] = s / Lp * L; });   // 各關節的弧長（近似）
  const rTip = r0 * 0.8, ss = []; for (let i = 0; i <= 13; i++) ss.push((L - rTip) * i / 13); for (const th of [0.38, 0.72, 1.02, 1.28]) ss.push(L - rTip + rTip * Math.sin(th));
  for (const j of [1, 2]) for (const d of [-0.3, 0, 0.3]) ss.push(sJ[j] + d * r0); ss.sort((a, b) => a - b);   // 指節的摺痕要有頂點才畫得出來
  const samples = ss.map(s => {
    const u = s / L; let r = r0 * (1 - 0.2 * u);
    for (const j of [1, 2]) r *= 1 + 0.07 * Math.exp(-(((s - sJ[j]) / (r0 * 0.9)) ** 2));   // 指節
    if (s > L - rTip) r = rTip * Math.sqrt(Math.max(0.02, 1 - ((s - (L - rTip)) / rTip) ** 2));
    return { p: curve.getPointAt(Math.min(1, u)), rb: r, rn: r * 0.9, u };
  });
  const crease = u => Math.exp(-(((u * L - sJ[1]) / (r0 * 0.2)) ** 2)) + Math.exp(-(((u * L - sJ[2]) / (r0 * 0.2)) ** 2));
  const tint = (u, side) => _c.copy(col.skin).lerp(col.palm, Math.max(0, side) * 0.55).lerp(col.flush, 0.3 * THREE.MathUtils.smoothstep(u, 0.72, 1) + 0.12 * Math.max(0, -side) * (Math.exp(-(((u * L - sJ[1]) / (r0 * 0.8)) ** 2)) + Math.exp(-(((u * L - sJ[2]) / (r0 * 0.8)) ** 2)))).lerp(col.crease, Math.min(1, crease(u)) * (0.3 + 0.3 * Math.max(0, side))).clone();
  const F = sweep(B, samples, n0, 10, tint, false);
  if (!nail) return;
  // 指甲：最後一節背面的一小片，略高於皮膚
  const a0 = L - rTip * 2.5, a1 = L - rTip * 0.32, NR = [];
  for (let i = 0; i <= 4; i++) {
    const s = a0 + (a1 - a0) * i / 4, f = frameAt(F, s / L), w = (i === 0 ? 0.62 : i === 4 ? 0.5 : 0.78) * (0.95 - 0.1 * i / 4), row = [];
    for (let k = 0; k <= 4; k++) { const a = -Math.PI / 2 + (k / 4 - 0.5) * 2 * w, lift = 1.05 + 0.03 * Math.cos((k / 4 - 0.5) * Math.PI); row.push(B.v(_t.copy(f.p).addScaledVector(f.b, Math.cos(a) * f.rb * lift).addScaledVector(f.n, Math.sin(a) * f.rn * lift), i === 4 ? col.nailTip : col.nail)); }
    NR.push(row);
  }
  B.rows(NR, false);
}
const _c = new THREE.Color();
function frameAt(F, u) {   // 兩圈之間內插
  let i = 0; while (i < F.length - 2 && F[i + 1].u < u) i++;
  const a = F[i], b = F[i + 1], k = THREE.MathUtils.clamp((u - a.u) / Math.max(1e-6, b.u - a.u), 0, 1);
  return { p: a.p.clone().lerp(b.p, k), n: a.n.clone().lerp(b.n, k).normalize(), b: a.b.clone().lerp(b.b, k).normalize(), rb: a.rb + (b.rb - a.rb) * k, rn: a.rn + (b.rn - a.rn) * k };
}
/** 沿固定軸放樣（手掌、前臂、袖子）：rings = [{ c（中心）, rb, rn, col, wr（皺褶量）, pw（超橢圓指數）, bx（這一圈自己的寬度軸） }] */
function loft(B, rings, bx, bz, seg, capStart, capEnd) {
  const R = rings.map((g, gi) => { const row = []; for (let k = 0; k < seg; k++) {
    const a = k / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), pw = g.pw || 1, ex = Math.sign(ca) * Math.abs(ca) ** pw, ez = Math.sign(sa) * Math.abs(sa) ** pw, w = 1 + (g.wr || 0) * (Math.sin(a * 3 + gi * 1.7) * 0.6 + Math.sin(a * 5 - gi * 2.3) * 0.4);
    row.push(B.v(_t.copy(g.c).addScaledVector(g.bx || bx, ex * g.rb * w).addScaledVector(bz, ez * g.rn * w), typeof g.col === 'function' ? g.col(sa, ca) : g.col)); } return row; });
  B.rows(R, true);
  if (capStart) B.fan(B.v(rings[0].c, typeof rings[0].col === 'function' ? rings[0].col(0, 0) : rings[0].col), R[0], false);
  if (capEnd) { const g = rings[rings.length - 1]; B.fan(B.v(g.c, typeof g.col === 'function' ? g.col(0, 0) : g.col), R[R.length - 1], true); }
}

/** J：手骨頭座標下的關節（Vector3）：ForeArm、Index1..4、Middle1..4、Ring1..4、Pinky1..4、Thumb1..4；col：{ skin, sleeve, trim }（THREE.Color） */
export function buildHand(J, colIn) {
  const B = builder(), bases = FINGERS.map(f => J[f + '1']), K = bases.reduce((a, q) => a.add(q), new V3()).multiplyScalar(0.25), S = K.length() / 0.0476;   // S：這個角色的手相對基準大小
  const skin = colIn.skin, col = { skin, palm: skin.clone().lerp(new THREE.Color('#f6ddd2'), 0.5), flush: skin.clone().lerp(new THREE.Color('#d98b7c'), 0.6), nail: skin.clone().lerp(new THREE.Color('#f8e6e0'), 0.6), nailTip: skin.clone().lerp(new THREE.Color('#fbf4ee'), 0.85), crease: skin.clone().multiply(new THREE.Color(0.72, 0.56, 0.52)) };
  const X = new V3(1, 0, 0), Z = new V3(0, 0, 1), yK = K.clone().normalize();
  // 手掌：手腕到指根的一塊圓角厚板，指根那一端照食指到小指的連線斜切
  const slope = (J.Index1.clone().sub(J.Pinky1).dot(yK)) / Math.max(1e-4, J.Index1.x - J.Pinky1.x), hwK = Math.abs(J.Index1.x - J.Pinky1.x) / 2 + 0.006 * S;
  const pz = Z.clone().addScaledVector(yK, -Z.dot(yK)).normalize(), px = new V3().crossVectors(yK, pz).normalize(), sk = (sa) => _c.copy(col.skin).lerp(col.palm, Math.max(0, sa) * 0.6).clone();
  const shear = px.clone().addScaledVector(yK, slope * 0.85).normalize();   // 指根那一端的寬度軸：食指側往前、小指側往後
  const palmRing = (t, k) => ({ c: K.clone().multiplyScalar(t), rb: (0.0128 * S * (1 - t) + hwK * t) * k, rn: (0.0092 * (1 - t) + 0.0078 * t) * S * k, col: sk, pw: 0.72, bx: px.clone().lerp(shear, THREE.MathUtils.smoothstep(t, 0.1, 0.8)).normalize() });
  loft(B, [palmRing(-0.03, 1), palmRing(0.22, 1), palmRing(0.5, 1), palmRing(0.78, 1), palmRing(0.96, 1), palmRing(1.05, 0.78)], px, pz, 14, true, true);
  // 四指
  const R0 = { Index: 0.0056, Middle: 0.0058, Ring: 0.0054, Pinky: 0.0047 };
  FINGERS.forEach(f => finger(B, [1, 2, 3, 4].map(i => J[f + i]), R0[f] * S, Z, col, true));
  // 拇指與魚際
  const T = [1, 2, 3, 4].map(i => J['Thumb' + i]), tn = K.clone().multiplyScalar(0.55).sub(T[1]).normalize();
  finger(B, T, 0.0066 * S, tn, col, true);
  { const c = T[0].clone().lerp(K.clone().multiplyScalar(0.3), 0.45).addScaledVector(pz, 0.002 * S), d = T[1].clone().sub(T[0]).normalize(), e1 = new V3().crossVectors(d, pz).normalize(), e2 = new V3().crossVectors(e1, d).normalize(), rings = [];
    for (let i = 0; i <= 6; i++) { const u = i / 6 * 2 - 1, r = Math.sqrt(Math.max(0.03, 1 - u * u)); rings.push({ c: c.clone().addScaledVector(d, u * 0.017 * S), rb: 0.0105 * S * r, rn: 0.0088 * S * r, col: sk }); }
    loft(B, rings, e1, e2, 10, true, true); }
  // 前臂（袖口到手腕露出的一小段）與袖子
  const ax = J.ForeArm.clone().normalize(), bx = X.clone().addScaledVector(ax, -X.dot(ax)).normalize(), bz = new V3().crossVectors(bx, ax).normalize(); if (bz.dot(Z) < 0) bz.negate();
  const at = d => ax.clone().multiplyScalar(d * S), sleeve = colIn.sleeve, trim = colIn.trim, dark = sleeve.clone().multiplyScalar(0.28);
  loft(B, [{ c: at(-0.004), rb: 0.0128 * S, rn: 0.0096 * S, col: sk, pw: 0.8 }, { c: at(0.018), rb: 0.0132 * S, rn: 0.0106 * S, col: sk, pw: 0.85 }, { c: at(0.052), rb: 0.015 * S, rn: 0.0124 * S, col: sk }], bx, bz, 14, false, false);
  const sl = (d, rb, rn, c, wr) => ({ c: at(d), rb: rb * S, rn: rn * S, col: c, wr });
  loft(B, [sl(0.052, 0.0152, 0.0128, dark), sl(0.032, 0.017, 0.0148, dark), sl(0.0292, 0.0214, 0.0194, trim), sl(0.0312, 0.0232, 0.0212, trim), sl(0.0425, 0.0234, 0.0214, trim), sl(0.044, 0.0222, 0.0202, sleeve),
    sl(0.058, 0.0232, 0.0212, sleeve, 0.03), sl(0.085, 0.0252, 0.0232, sleeve, 0.045), sl(0.125, 0.0278, 0.0258, sleeve, 0.05), sl(0.18, 0.0305, 0.0285, sleeve, 0.045), sl(0.25, 0.033, 0.031, sleeve, 0.04), sl(0.34, 0.035, 0.033, sleeve, 0.03)], bx, bz, 20, false, false);
  return B.geo();
}

/** 手的材質：頂點色 + 一點環境補光（背光、黃昏、夜裡不會黑成一團） */
export function handMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide }), fill = { value: new THREE.Color(0, 0, 0) };
  m.onBeforeCompile = sh => { sh.uniforms.uFpFill = fill; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFpFill;').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n  reflectedLight.indirectDiffuse += material.diffuseColor * uFpFill;'); };
  m.userData.fill = fill; m.name = 'fp-hand';
  return m;
}
