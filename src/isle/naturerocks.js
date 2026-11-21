/* W08 · rounded boulders and low coastal shelves; surface strata/pits/tide marks come from tex_rock.js in engine.js's stone shader. */
import * as THREE from 'three';
import { natureMaterial, mergeNatureGeometry, natureRandom } from './naturemodels.js';

const CACHE = new Map();
export const ROCK_IDS = new Set(['prop_boulder', 'prop_shorerock']);

/* v9.23.5 風化的石頭：以前是 12×7 的光滑橢球（輪廓看得到折角、底部往內收成一圈陰影很深的凹槽，顏色是淡粉紫）。
   現在面數多一倍，表面有大小不一的鼓包，再用幾個隨機方向的平面削出風化的平整面；下半部往外張開，像半埋在地裡的大石頭露出來的那一截。
   顏色是自然的灰褐：靠地面深、頂部被太陽曬得淺；海邊的礁石靠水那一段是濕的深色、帶一點藻綠，島上的圓石頂上長苔。 */
/* v9.26 岩體重做（評審：底邊是規則的多邊形、一顆顆圓麵包頂、旁邊排一列一樣大的圓石，看不出被同一片海侵蝕）：
   海岸礁石改成一圈圈輪廓疊成的層狀岩板（ledgeRock）：底邊打散、側面用兩組共同方向的節理削平（礁石不旋轉，每顆都對著同樣的方向）、
   頂面是平的層面、往一兩側各退一階、沙面上方有浪掏的凹痕；碎石一群群半埋在礁石腳下。島上的圓石（rockMass）外形也打散、頂面略平。岩層、孔洞、潮痕交給著色器 */
const TAU = Math.PI * 2, J = .42, sm = THREE.MathUtils.smoothstep;   // J：共同的節理方向（和北海岸的石柱一樣）
function rockMass(rx, ry, rz, at, seed, o) {
  const g = new THREE.SphereGeometry(1, 22, 14), p = g.attributes.position, colors = [], r = natureRandom(seed);
  const ph = [r() * TAU, r() * TAU, r() * TAU, r() * TAU], v = new THREE.Vector3(), cuts = [];
  for (let k = 0; k < 4; k++) { const a = J + k * Math.PI / 2 + (r() - .5) * .2, c = .7 + r() * .22; cuts.push([new THREE.Vector3(Math.cos(a), (r() - .5) * .12, Math.sin(a)).normalize(), c]); }   // 節理：平直的側面
  for (let k = 0; k < 2; k++) { const a = r() * TAU, e = .45 + r() * .4; cuts.push([new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)), .8 + r() * .1]); }   // 斜削的肩
  const lump = (x, y, z) => Math.sin(x * 3.1 + ph[0]) * Math.sin(y * 2.7 + ph[1]) * Math.sin(z * 3.3 - ph[0]);
  const low = new THREE.Color('#7e7a70'), high = new THREE.Color('#b4ad9f'), moss = new THREE.Color('#7d9166');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.atan2(z, x), out = 1 + .085 * Math.sin(2 * th + ph[1]) + .055 * Math.sin(3 * th + ph[2]) + .03 * Math.sin(5 * th + ph[3]);   // 底邊的外形：不是規則的多邊形
    v.set(x * out, y, z * out).multiplyScalar(1 + .055 * lump(x, y, z) + .03 * lump(x * 2.3 + 1, y * 2.3, z * 2.3 - 2));
    for (const [n, c] of cuts) { const d = v.dot(n); if (d > c) v.addScaledVector(n, (c - d) * .88); }   // 削平：超出平面的部分壓回去
    let top = o.top; const yb = v.y + .05 * v.x + .022 * v.z;
    for (const [a, t, d] of o.steps) top -= d * sm(v.x * Math.cos(a) + v.z * Math.sin(a), t - .12, t + .12);   // 一道直的階：那一側的上層崩掉了
    if (yb > top) v.y -= (yb - top) * .86;   // 頂面順著層理：大致是平的（和著色器同一個微傾）
    if (y < 0) { const hr = Math.hypot(v.x, v.z), t = sm(-y, 0, .4) * o.flare; if (hr > 1e-4) { const k = 1 + (((1 + .28 * -y) * Math.hypot(v.x, v.y, v.z)) / hr - 1) * t; v.x *= k; v.z *= k; } v.y *= .62; }   // 下半部往外張開、壓扁：埋在地裡的那一截（圓石埋得淺，張得少：不像一頂帽簷）
    p.setXYZ(i, v.x * rx + at[0], v.y * ry + at[1], v.z * rz + at[2]);
    const tone = lump(x * 1.7 + 3, y * 1.9, z * 1.6 + 5) * .12, c = low.clone().lerp(high, THREE.MathUtils.clamp(sm(y, -.25, .6) + tone, 0, 1));
    if (y > .4 && Math.sin(x * 4 + z * 5 + ph[0]) > -.1) c.lerp(moss, .7 * sm(y, .4, .65));   // 頂上長苔
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals(); return g;
}
/** 海岸礁石：一圈圈的輪廓疊成一整塊（法線共用）。沙面上方是兩三層厚薄不一的岩板：每一層在某一側崩掉、往內退成一道階，
    沙面上方一點點是浪掏出來的凹痕，頂面是平的層面、邊緣圓一點；側面用共同方向的節理削平。sand：在模型座標裡沙面大約多高 */
function ledgeRock(seed, rx, rz, sand, H, steps) {
  const r = natureRandom(seed), n = 24, ph = [r() * TAU, r() * TAU, r() * TAU, r() * TAU], pos = [], idx = [], cols = [];
  const prof = [[-.3, 1.2], [-.12, 1.1], [0, 1.02], [.06, .94], [.12, .97]];
  steps.forEach(([, , y0], k) => prof.push([y0 - .025, .99 - k * .02], [y0 + .02, .94 - k * .02]));   // 每一層的上緣：下面那層是一道唇，上面那層退一點
  prof.push([H - .07, .95], [H - .03, .87], [H, .7]);
  const joints = [0, 1, 2, 3].map(k => { const a = J + k * Math.PI / 2 + (r() - .5) * .2; return [Math.cos(a), Math.sin(a), .76 + r() * .14, -9]; })
    .concat(steps.map(([a, c, y0]) => [Math.cos(a), Math.sin(a), c, y0]));   // 節理；階：那一側在 y0 以上的岩板崩掉，往內退到 c
  const low = new THREE.Color('#857f74'), high = new THREE.Color('#b3ab9c'), c = new THREE.Color();
  prof.sort((p, q) => p[0] - q[0]).forEach(([y, f]) => {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n, k = f * (1 + .09 * Math.sin(2 * a + ph[0]) + .05 * Math.sin(3 * a + ph[1] + y * 2) + .03 * Math.sin(5 * a + ph[2]) + .02 * Math.sin(9 * a + y * 8 + ph[3]));
      let x = Math.cos(a) * k, z = Math.sin(a) * k;
      for (const [jx, jz, cc, y0] of joints) { const on = sm(y, y0 - .01, y0 + .01), dd = x * jx + z * jz; if (on > 0 && dd > cc) { x -= jx * (dd - cc) * .92 * on; z -= jz * (dd - cc) * .92 * on; } }
      pos.push(x * rx, sand + y, z * rz);
      c.copy(low).lerp(high, sm(y, -.05, H * .8)).multiplyScalar(1 + .05 * Math.sin(x * 4 + z * 3 + ph[0])); cols.push(c.r, c.g, c.b);
    }
  });
  const m = prof.length; pos.push(0, sand - .3, 0, 0, sand + H, 0); cols.push(low.r, low.g, low.b, high.r, high.g, high.b);
  for (let j = 0; j < m - 1; j++) for (let i = 0; i < n; i++) { const a = j * n + i, b = j * n + (i + 1) % n; idx.push(a, a + n, b + n, a, b + n, b); }
  for (let i = 0; i < n; i++) idx.push(m * n, i, (i + 1) % n, m * n + 1, (m - 1) * n + (i + 1) % n, (m - 1) * n + i);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** 非索引幾何的平滑法線：同一個位置的頂點共用法線 */
function smoothNormals(g) {
  g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, acc = new Map(), key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
  for (let i = 0; i < p.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
  for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
}
/** 礁石腳下的碎石：一群群大小不一、半埋在沙裡（埋著的那一截往外張，沙面高低不同也不會浮起來）。spots：[方向, 離中心（主岩半徑的倍數）, 顆數, 最大的那顆多大] */
function rubble(seed, rx, rz, sandY, spots) {
  const r = natureRandom(seed), out = [], col = new THREE.Color('#a19a8b'), c = new THREE.Color();
  for (const [a0, d0, n, size] of spots) for (let j = 0; j < n; j++) {
    const a = a0 + (j ? (r() - .5) * 1.1 : 0), d = d0 + (j ? (r() - .4) * .12 : 0), s = size * (j ? .3 + r() * .5 : 1), top = sandY + s * (.35 + r() * .3), ph = r() * TAU, cut = [r() * TAU, r() * TAU];   // 沿著礁石腳散開（不是往外排成一列）
    const g = new THREE.IcosahedronGeometry(1, 1), q = g.attributes.position, cols = [];
    for (let i = 0; i < q.count; i++) {
      let x = q.getX(i), y = q.getY(i), z = q.getZ(i); const k = 1 + .16 * Math.sin(x * 2.3 + ph) * Math.sin(z * 2.9 - ph) + .1 * Math.sin(y * 3.1 + x * 1.7 + ph);
      x = Math.sign(x) * Math.abs(x) ** .6 * k; y = Math.sign(y) * Math.abs(y) ** .6 * k; z = Math.sign(z) * Math.abs(z) ** .6 * k;   // 有稜角的碎岩板，不是圓卵石
      for (const ca of cut) { const dd = x * Math.cos(ca) + z * Math.sin(ca); if (dd > .78) { x -= Math.cos(ca) * (dd - .78) * .9; z -= Math.sin(ca) * (dd - .78) * .9; } }   // 斷口：平直的一面
      if (y > .45) y = .45 + (y - .45) * .25; if (y < 0) { x *= 1 - y * .4; z *= 1 - y * .4; }   // 頂面平；埋著的那一截往外張
      q.setXYZ(i, x, y, z); c.copy(col).multiplyScalar(.9 + .1 * Math.sin(x * 3 + ph) + (j ? 0 : -.05)); cols.push(c.r, c.g, c.b);
    }
    const ys = (top - sandY * .3) / 1.5; g.scale(s * (.9 + r() * .5), ys, s * (.7 + r() * .4)); g.rotateY(r() * TAU); g.translate(Math.cos(a) * d * rx, top - ys * .5, Math.sin(a) * d * rz);
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); smoothNormals(g); out.push(g);
  }
  return out;
}
/* 海岸礁石的四種：主岩 rx、rz；沙面以上多高；兩道階 [朝哪個方向, 退到離中心多遠（主岩半徑的倍數）, 從多高開始]；碎石群 [方向, 離中心（主岩半徑的倍數）, 顆數, 最大那顆多大] */
const SHORE = [
  { m: [1, .84], H: .46, steps: [[.6, .3, .17], [2.9, .62, .31]], rub: [[2.4, 1.1, 4, .17], [4.6, 1.08, 3, .12]] },
  { m: [.92, 1], H: .42, steps: [[3.4, .38, .15], [5.6, .55, .28]], rub: [[.3, 1.1, 3, .15], [3.9, 1.08, 4, .12]] },
  { m: [1, .72], H: .48, steps: [[5.2, .24, .2], [1.4, .66, .34]], rub: [[1.7, 1.12, 5, .16]] },
  { m: [.84, .95], H: .44, steps: [[2.1, .34, .16], [4.4, .5, .3]], rub: [[5.6, 1.1, 3, .14], [2.9, 1.12, 3, .11]] }
];
function model(id, variant) {
  const root = new THREE.Group(), main = [], coast = id === 'prop_shorerock'; let extra = [];
  if (coast) {
    const S = SHORE[variant], [x, z] = S.m;
    main.push(ledgeRock(97 + variant, x, z, .3, S.H, S.steps));   // 一整塊疊層的礁石（以前是一顆大圓餅上面再疊一顆小圓頂）
    extra = rubble(131 + variant, x, z, .3, S.rub);
  } else {
    const shapes = [[.58, .72, .48], [.63, .61, .5], [.56, .66, .57]], [x, y, z] = shapes[variant];
    main.push(rockMass(x, y, z, [0, y * .51, 0], 211 + variant, { top: .7, steps: [[variant * 2.1, .4, .12]], flare: .35 }));   // 島上的圓石：外形打散、頂面略平，仍是圓潤的大石頭
  }
  // Move geometry, rather than the root, so fit() preserves a true bottom-centred origin.
  // Preserve the old GLB height/width envelope when fit() applies the caller's w.
  // Audited normalized bounds: boulder 2.8400213 x 1.3; coast 3.9423704 x 1.3.
  const b = new THREE.Box3(); main.forEach(g => { g.computeBoundingBox(); b.union(g.boundingBox); });
  const c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3()), ratio = coast ? 1.3 / 3.9423703703703703 : 1.3 / 2.840021344717183, sy = Math.max(size.x, size.z) * ratio / size.y;
  const xf = new THREE.Matrix4().makeScale(1, sy, 1).multiply(new THREE.Matrix4().makeTranslation(-c.x, -b.min.y, -c.z));
  [...main, ...extra].forEach(g => g.applyMatrix4(xf));
  const mesh = new THREE.Mesh(mergeNatureGeometry([...main, ...extra]), natureMaterial('#ffffff', 'stone', true));
  mesh.name = coast ? 'rounded-coastal-shelves' : 'moss-topped-rounded-boulder'; mesh.receiveShadow = true; mesh.castShadow = true; mesh.frustumCulled = false; root.add(mesh);   // v9.23.5 石頭會投影子（以前不投，像浮在地上）
  mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
  root.userData.natureBounds = { min: [b.min.x - c.x, 0, b.min.z - c.z], max: [b.max.x - c.x, size.y * sy, b.max.z - c.z] };   // fit() 依主岩的大小縮放（碎石不算，礁石不會因為腳下多了碎石而變小）
  root.name = id; root.userData.natureProcedural = true; root.userData.natureVariant = variant; return { scene: root };
}
/** prop_boulder: 3 shared templates; prop_shorerock: 4. fit() keeps caller w/sink unchanged. */
export function natureRockModel(id, variant=0) {
  if(!ROCK_IDS.has(id)) return null;
  variant %= id==='prop_boulder'?3:4;const key=`${id}|${variant}`;
  if(!CACHE.has(key)) CACHE.set(key,model(id,variant));return CACHE.get(key);
}
