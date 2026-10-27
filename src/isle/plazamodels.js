/* W04：鋪面只有外觀，所有高度取自 terrain，沒有新增碰撞或更改可走區域。
   石縫由實際多邊形留空；共用頂點色材質，按 16m 分塊供原本的剔除器使用。 */
import * as THREE from 'three';
import { bend } from './engine.js';

const TAU = Math.PI * 2;
const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const stoneMat = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }), 'stone');   // v7.7：石面的水彩色塊、柔和明暗與零星地衣（以前是純色）
const colors = ['#d8c6b6', '#d5c2b2', '#d3bdb9', '#c6b9c9', '#dbcabb', '#bfc0ad', '#dfccbc'].map(c => new THREE.Color(c));   // 暖米、粉米、薰衣草、鼠尾草的石塊（太接近白色的鋪面在白天會整片過曝）
const buffer = () => ({ p: [], c: [] });
const RIM = [0.95, 0.935, 0.99];   // v7.7：石板邊緣暗一點、帶一點薰衣草
function tri(b, a, c, d, color, shade = 1, sc = shade, sd = shade) {
  b.p.push(...a, ...c, ...d);
  for (const s of [shade, sc, sd]) { const k = Array.isArray(s) ? s : [s, s, s]; b.c.push(color.r * k[0], color.g * k[1], color.b * k[2]); }
}
function finish(b, name) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, stoneMat); m.name = name; m.receiveShadow = true; m.frustumCulled = false;
  m.userData.w04 = true; return m;
}
/** 凸多邊形：頂面、斜倒角、真側面；底部埋地不畫。輪廓必須從 +Y 看為逆時針。 */
function slab(b, outline, surface, color, bevel = 0.018, depth = 0.07) {
  const area = outline.reduce((s, p, i) => { const q = outline[(i + 1) % outline.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  if (area < 0) outline = [...outline].reverse();
  const n = outline.length, cx = outline.reduce((s, p) => s + p[0], 0) / n, cz = outline.reduce((s, p) => s + p[1], 0) / n;
  const top = outline.map(([x, z]) => { const d = Math.hypot(x - cx, z - cz), k = Math.max(0, 1 - bevel / d); return [cx + (x - cx) * k, surface(x, z), cz + (z - cz) * k]; });
  const rim = outline.map(([x, z]) => [x, surface(x, z) - 0.014, z]);
  const bot = outline.map(([x, z]) => [x, surface(x, z) - depth, z]);
  const center = [cx, surface(cx, cz), cz];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(b, center, top[j], top[i], color, 1.07, RIM, RIM);   // v7.7：石板中間亮、邊緣暗一點，像微微鼓起的枕頭
    tri(b, top[i], top[j], rim[j], color, 0.97); tri(b, top[i], rim[j], rim[i], color, 0.97);
    tri(b, rim[i], rim[j], bot[j], color, 0.84); tri(b, rim[i], bot[j], bot[i], color, 0.84);
  }
}

/** 住宅整個外框包含屋簷、門廊、台階；不再只依舊版 4×4 房子假設。 */
export function homeClearance(homes, plan, warp) {
  const paths = plan.roads.filter(r => r.kind === 'stone').flatMap(r => r.path.slice(1).map((p, i) => [warp(...r.path[i]), warp(...p)]));
  const entries = homes.map(h => {
    h.g.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(h.g), door = h.door;
    let exit = [door[0], door[1] + 2], dist = Infinity;
    for (const [a, b] of paths) {
      const dx = b[0] - a[0], dz = b[1] - a[1], t = THREE.MathUtils.clamp(((door[0] - a[0]) * dx + (door[1] - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      const p = [a[0] + dx * t, a[1] + dz * t], d = Math.hypot(p[0] - door[0], p[1] - door[1]);
      if (d < dist) { dist = d; exit = p; }
    }
    return { box, door, exit };
  });
  const distance = (x, z, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  };
  return (x, z, pad = 0, walkway = true) => entries.some(({ box, door, exit }) =>
    (x > box.min.x - pad && x < box.max.x + pad && z > box.min.z - pad && z < box.max.z + pad) ||
    (walkway && distance(x, z, door, exit) < 0.85 + pad));
}

/** 原道路每段四邊形內鋪 0.35–0.65m 石板，七種磨角；不採用規則重複的接縫貼圖。 */
export function roadPavers(rows, { groundAt, warp, plaza, clear, clearGrass, scene, registerAt }) {
  const chunks = new Map(); let count = 0;
  for (const row of rows) {
    const { a, b, c, d, width, lift, id } = row, n = Math.max(3, Math.ceil(width / 0.62));
    const at = (u, v) => {
      const x0 = a[0] + (d[0] - a[0]) * u, z0 = a[1] + (d[1] - a[1]) * u;
      const x1 = b[0] + (c[0] - b[0]) * u, z1 = b[1] + (c[1] - b[1]) * u;
      return warp(x0 + (x1 - x0) * v, z0 + (z1 - z0) * v);
    };
    const edges = Array.from({ length: n + 1 }, (_, i) => i === 0 ? 0.025 : i === n ? 0.975 : (i + (hash(id * 17 + i) - 0.5) * 0.08) / n);
    for (let i = 0; i < n; i++) {
      const k = id * 13 + i, lo = edges[i] + 0.011 / width, hi = edges[i + 1] - 0.011 / width;
      const center = at((lo + hi) / 2, 0.5), [x, z] = center;
      if (Math.hypot(x - plaza[0], z - plaza[1]) < 6.62 || clear(x, z, 0.32, false)) continue;
      const cut = 0.08 + hash(k % 7 + 22) * 0.1, dv = 0.025;
      const outline = [[lo + (hi - lo) * cut, dv], [hi - (hi - lo) * cut, dv], [hi, dv + cut], [hi, 1 - dv - cut], [hi - (hi - lo) * cut, 1 - dv], [lo + (hi - lo) * cut, 1 - dv], [lo, 1 - dv - cut], [lo, dv + cut]].map(([u, v]) => at(u, v));
      const ys = outline.map(p => groundAt(...p));
      if (Math.max(...ys) - Math.min(...ys) > 0.13 || outline.some(p => clear(...p, 0.08, false))) continue;
      const key = Math.floor(x / 16) + ',' + Math.floor(z / 16);
      if (!chunks.has(key)) chunks.set(key, buffer());
      slab(chunks.get(key), outline, (px, pz) => groundAt(px, pz) + lift, colors[Math.floor(hash(k + 81) * colors.length)]);
      clearGrass(x, z, 0.34);
      count++;
    }
  }
  const group = new THREE.Group(); group.name = 'w04-road-pavers';
  // 32m以外只畫石板頂面：同一份輪廓、頂點色與接縫，省掉倒角／埋地側面。
  // 與貼圖LOD相比不會切換成另一套不同步的石縫。
  for (const [key, b] of chunks) {
    const m = finish(b, 'w04-road-' + key), [cx, cz] = key.split(',').map(Number).map(v => v * 16 + 8);
    const far = buffer();
    // slab每條邊固定五個三角形；第一個是頂面，另外四個為倒角與側面。
    for (let i = 0; i < b.p.length; i += 45) { far.p.push(...b.p.slice(i, i + 9)); far.c.push(...b.c.slice(i, i + 9)); }
    const fm = finish(far, 'w04-road-lod-' + key), lod = new THREE.LOD(); lod.name = 'w04-road-lod'; lod.position.set(cx, 0, cz);
    m.position.set(-cx, 0, -cz); fm.position.copy(m.position); lod.addLevel(m, 0); lod.addLevel(fm, 32);
    group.add(lod); registerAt(lod, cx, groundAt(cx, cz), cz, 12, null, 5);
  }
  group.userData.w04 = { stones: count, triangles: count * 40, materials: 1 }; scene.add(group);
  return group;
}

export function plazaModel(cx, cz, groundAt) {
  const R = 6.6, group = new THREE.Group(), b = buffer(); group.name = 'w04-plaza';
  const y = (x, z) => groundAt(x, z) + 0.045;
  const polar = (r, a) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  // 灰紫砂漿在真縫底部，不在石面上畫第二套假接縫。
  const grout = new THREE.Color('#b3a5ad');
  for (let i = 0; i < 96; i++) {
    const a = polar(R, i / 96 * TAU), c = polar(R, (i + 1) / 96 * TAU);
    tri(b, [cx, groundAt(cx, cz) + 0.005, cz], [c[0], groundAt(...c) + 0.005, c[1]], [a[0], groundAt(...a) + 0.005, a[1]], grout);
  }
  const rings = [0.94, 1.7, 2.5, 3.3, 4.15, 5.2, 5.9, R]; let stones = 0;
  for (let r = 0; r < rings.length - 1; r++) {
    const r0 = rings[r], r1 = rings[r + 1], n = Math.round(Math.PI * (r0 + r1) / 0.88), off = hash(r + 57) * TAU;
    for (let i = 0; i < n; i++) {
      const a0 = off + i / n * TAU + 0.012 / r0, a1 = off + (i + 1) / n * TAU - 0.012 / r0;
      const inner = r0 + 0.012, outer = r1 - 0.012, am = (a0 + a1) / 2;
      const outline = [polar(inner, a0), polar(outer, a0), polar(outer, am), polar(outer, a1), polar(inner, a1), polar(inner, am)];
      // 弧形塊每塊30三角形；交錯的環起點避免徑向縫貫穿。
      slab(b, outline, y, colors[Math.floor(hash(r * 81 + i) * colors.length)], 0.014, 0.08); stones++;
    }
  }
  group.add(finish(b, 'w04-plaza-stones'));
  // 中心奶油石有真正的八芒星孔；星徽低6mm、紫心再低8mm。
  const disk = new THREE.Shape(), hole = new THREE.Path(), star = new THREE.Shape();
  disk.absarc(0, 0, 0.94, 0, TAU, false);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU, r = i % 2 ? 0.28 : 0.86, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!i) { hole.moveTo(x, z); star.moveTo(x, z); } else { hole.lineTo(x, z); star.lineTo(x, z); }
  }
  hole.closePath(); star.closePath(); disk.holes.push(hole);
  const coreHole = new THREE.Path(); coreHole.absarc(0, 0, 0.22, 0, TAU, false); star.holes.push(coreHole);
  const addInlay = (shape, color, top, name) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1, curveSegments: 24, steps: 1 });
    g.rotateX(-Math.PI / 2); g.translate(cx, groundAt(cx, cz) + top - 0.049, cz);
    const m = new THREE.Mesh(g, bend(new THREE.MeshStandardMaterial({ color, roughness: 0.83 }))); m.name = name; m.receiveShadow = true; m.frustumCulled = false; group.add(m);
  };
  addInlay(disk, '#e6d6c0', 0.045, 'w04-star-socket');
  addInlay(star, '#d8bc84', 0.039, 'w04-star-inlay');
  // 紫心與砂漿共用頂點色材質，總共3材質。
  const coreB = buffer(); for (let i = 0; i < 24; i++) { const a = polar(0.215, i / 24 * TAU), c = polar(0.215, (i + 1) / 24 * TAU); tri(coreB, [cx, y(cx, cz) - 0.014, cz], [c[0], y(...c) - 0.014, c[1]], [a[0], y(...a) - 0.014, a[1]], new THREE.Color('#9186a8')); }
  group.add(finish(coreB, 'w04-star-core'));
  group.userData.w04 = { radius: R, surfaceOffset: 0.045, stones, materials: 3 };
  return group;
}
