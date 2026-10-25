/* 潮汐小島 · 環境細節（v6.16）：沙灘邊層層疊疊的海岸岩石、秋天樹下的落葉、春天櫻花樹下的落花、秋天松林裡的蘑菇。
   使用自己的亂數，不影響 props.js 的佈置順序。季節的東西依 uFall / uBloom 顯示。 */
import * as THREE from 'three';
import { scene, M, mesh, U, bend } from './engine.js';
import { N, C, T, tileAt, groundAt } from './terrain.js';
import { trees, blocked, colliders, rockGeo, seats, PIER, SITES, mergeStatic } from './props.js';

let seed = 4242;
const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* ---------- 海岸岩石：沙灘緊鄰海的地方，2–4 塊扁平的岩板疊在一起（可以站上去） ---------- */
function shoreRocks() {
  const cand = [];
  for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
    if (T(x, z) !== 0) continue;
    const sea = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => T(x + dx, z + dz) === -1);
    if (sea.length) cand.push([x - C + 0.5, z - C + 0.5, sea[0]]);
  }
  cand.sort(() => r() - 0.5);
  const placed = [], stone = M('#b3a796', { vertexColors: true, roughness: 0.95 }, 'stone');
  for (const [x, z, [dx, dz]] of cand) {
    if (placed.length >= 42) break;   // v6.79 的島大、海岸長：參考圖裡海岸邊一路都是礁石
    if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 4.5)) continue;
    if (Math.abs(x - PIER.x) < 3 && z > PIER.z - 3) continue;
    if (blocked(x, z, 1.4) || seats.some(st => Math.hypot(st.x - x, st.z - z) < 3)) continue;
    // 往海那邊挪一點，讓岩石一半泡在浪裡
    const cx = x + dx * 0.45, cz = z + dz * 0.45, y = Math.max(0.05, groundAt(x, z) - 0.2), g = new THREE.Group(); g.position.set(cx, y, cz);
    const n = 2 + Math.floor(r() * 3);
    let top = 0;
    for (let i = 0; i < n; i++) {
      const s = (1.25 - i * 0.28) * (0.8 + r() * 0.4), m = new THREE.Mesh(rockGeo(0.6 * s), stone);
      m.scale.set(1.5 + r() * 0.4, 0.42 + r() * 0.1, 1.1 + r() * 0.3); m.position.set((r() - 0.5) * 0.5, top + 0.12 * s, (r() - 0.5) * 0.5); m.rotation.y = r() * 6.28;
      m.castShadow = m.receiveShadow = true; g.add(m); top += 0.22 * s;
    }
    g.userData.prop = { id: 'prop_shorerock', w: 1.9 + r() * 0.5, sink: 0.12 };   // 有模型就換成帶藤壺與海藻的礁石
    scene.add(g); colliders.push({ x: cx, z: cz, r: 0.75 }); placed.push([x, z]);
  }
}

/* ---------- 地上的落葉與落花：一片片貼地的小圖片（InstancedMesh），依季節淡入 ---------- */
const leafTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(32, 4); c.quadraticCurveTo(58, 26, 32, 60); c.quadraticCurveTo(6, 26, 32, 4); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 8); c.lineTo(32, 56); c.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const petalTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { c.save(); c.translate(32, 32); c.rotate(i / 5 * Math.PI * 2); c.beginPath(); c.ellipse(0, -14, 9, 15, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  c.fillStyle = 'rgba(255,200,80,1)'; c.beginPath(); c.arc(32, 32, 5, 0, 7); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
function scatter(map, kinds, per, radius, cols, size) {
  const list = [];
  trees.forEach(t => { if (!kinds.includes(t.kind)) return; for (let i = 0; i < per; i++) { const a = r() * 6.28, d = 0.3 + Math.sqrt(r()) * radius * t.s, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d, tt = tileAt(x, z); if (tt === 1 || tt === 2 || tt === 5) list.push([x, z]); } });
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = bend(new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide, depthWrite: true }), 'char');
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.count = list.length; im.receiveShadow = true; im.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  list.forEach(([x, z], i) => { m4.compose(v.set(x, groundAt(x, z) + 0.05 + (i % 7) * 0.004, z), q.setFromEuler(e.set((r() - 0.5) * 0.2, r() * 6.28, (r() - 0.5) * 0.2)), sc.setScalar(size * (0.7 + r() * 0.6))); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(cols[Math.floor(r() * cols.length)])); });
  im.visible = false; scene.add(im); return im;
}
/* ---------- 蘑菇：秋天松林地面冒出的小蘑菇（紅帽白點、褐色） ---------- */
function mushrooms() {
  const g = new THREE.Group(), stem = M('#f4ead8', {}, 'char'), caps = [M('#e05a48', {}, 'char'), M('#a8724a', {}, 'char'), M('#d89a4a', {}, 'char')], dot = M('#ffffff', {}, 'char');
  let n = 0;
  trees.forEach(t => {
    if (t.kind !== 'cedar' || n > 60 || r() > 0.45) return;
    const k = 1 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) {
      const a = r() * 6.28, d = 0.6 + r() * 0.6, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d, y = groundAt(x, z), s = 0.7 + r() * 0.6, ci = Math.floor(r() * 3);
      if (blocked(x, z, 0.1, c => c.r && c.r < 0.6)) continue;
      const m = new THREE.Group(); m.position.set(x, y, z); m.scale.setScalar(s);
      m.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), stem, 0, 0.06, 0, { noCast: true }));
      const cap = mesh(new THREE.SphereGeometry(0.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), caps[ci], 0, 0.11, 0, { noCast: true }); cap.scale.y = 0.8; m.add(cap);
      if (ci === 0) for (let j = 0; j < 3; j++) m.add(mesh(new THREE.SphereGeometry(0.014, 5, 4), dot, Math.cos(j * 2.1) * 0.04, 0.16, Math.sin(j * 2.1) * 0.04, { noCast: true }));
      g.add(m); n++;
    }
  });
  mergeStatic(g); g.visible = false; scene.add(g); return g;   // 一百多個小零件合併成幾個網格
}
let plane = null;
/** 機翼：圓角的平面輪廓、邊緣帶一點斜角（原本是長方塊） */
function wingGeo(span, chord, thick, r) {
  const sh = new THREE.Shape(), x = span / 2, y = chord / 2;
  sh.moveTo(-x + r, -y); sh.lineTo(x - r, -y); sh.quadraticCurveTo(x, -y, x, -y + r); sh.lineTo(x, y - r); sh.quadraticCurveTo(x, y, x - r, y); sh.lineTo(-x + r, y); sh.quadraticCurveTo(-x, y, -x, y - r); sh.lineTo(-x, -y + r); sh.quadraticCurveTo(-x, -y, -x + r, -y);
  const b = thick * 0.35, g = new THREE.ExtrudeGeometry(sh, { depth: thick - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 6 });
  return g.rotateX(-Math.PI / 2).translate(0, -thick / 2 + b, 0);
}
function seaplane() {
  const g = new THREE.Group(), white = M('#f6f4ee', { roughness: 0.5 }, 'char'), blue = M('#3f8fd8', { roughness: 0.5 }, 'char'), yel = M('#ffd23f', {}, 'char'), dark = M('#3a4250', {}, 'char'), glass = M('#9fd8f0', { roughness: 0.15, metalness: 0.2 }, 'char');
  const body = mesh(new THREE.CapsuleGeometry(0.42, 2.2, 6, 14), white, 0, 1.15, 0); body.rotation.x = Math.PI / 2; g.add(body);
  const stripe = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.22, 16, 1, true), blue, 0, 1.15, 0.3); stripe.rotation.x = Math.PI / 2; g.add(stripe);
  const win = mesh(new THREE.SphereGeometry(0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass, 0, 1.38, 0.75); win.scale.set(0.9, 0.6, 1.2); g.add(win);
  g.add(mesh(wingGeo(4.2, 0.8, 0.13, 0.32), white, 0, 1.62, 0.2), mesh(new THREE.BoxGeometry(0.42, 0.03, 0.76), blue, -1.64, 1.685, 0.2), mesh(new THREE.BoxGeometry(0.42, 0.03, 0.76), blue, 1.64, 1.685, 0.2), mesh(new THREE.BoxGeometry(0.5, 0.03, 0.78), blue, 0, 1.685, 0.2));   // 白色機翼、只有翼尖和中央漆藍色（整片藍色太搶眼）
  g.add(mesh(wingGeo(1.5, 0.45, 0.08, 0.18), white, 0, 1.3, -1.35)); const fin = mesh(new THREE.BoxGeometry(0.06, 0.6, 0.5), blue, 0, 1.6, -1.4); fin.rotation.x = -0.25; g.add(fin);
  const hub = mesh(new THREE.ConeGeometry(0.16, 0.3, 12), yel, 0, 1.15, 1.62); hub.rotation.x = Math.PI / 2; g.add(hub);
  const prop = new THREE.Group(); prop.position.set(0, 1.15, 1.7); [0, Math.PI / 2].forEach(a => { const b = mesh(new THREE.BoxGeometry(0.08, 1.1, 0.03), dark, 0, 0, 0, { noCast: true }); b.rotation.z = a + 0.3; prop.add(b); }); g.add(prop);
  [-0.75, 0.75].forEach(dx => { const f = mesh(new THREE.CapsuleGeometry(0.16, 1.9, 4, 10), white, dx, 0.22, 0.1); f.rotation.x = Math.PI / 2; g.add(f); [-0.5, 0.6].forEach(dz => g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), dark, dx * 0.7, 0.62, dz))); });
  const [x, z] = SITES.seaplane ? [SITES.seaplane.x, SITES.seaplane.z] : [PIER.x + 2.9, PIER.z + 3.4]; g.position.set(x, 0, z); g.rotation.y = 0.35; scene.add(g); colliders.push({ x, z, r: 1.1 });   // 規劃的位置：碼頭東邊的海面
  g.userData = { prop };
  return g;
}
let leaves = null, petals = null, shrooms = null;
export function build() {
  shoreRocks();
  leaves = scatter(leafTex, ['round', 'pink'], 22, 1.6, ['#e8913a', '#d8542e', '#f2b73c', '#b8462a', '#c8a03a'], 0.42);
  petals = scatter(petalTex, ['pink'], 26, 1.8, ['#ffd0e0', '#ffe4ee', '#ffb8d0'], 0.28);
  shrooms = mushrooms();
  plane = seaplane();
}
export const debug = () => ({ mesh: leaves, leaves: leaves && leaves.count, petals: petals && petals.count, shrooms: shrooms && shrooms.children.length, lv: leaves && leaves.visible });
export function update(t) {
  if (!leaves) return;
  if (plane) { plane.position.y = Math.sin(t * 1.1) * 0.05 - 0.04; plane.rotation.z = Math.sin(t * 0.8) * 0.025; plane.rotation.x = Math.sin(t * 0.9 + 1) * 0.015; plane.userData.prop.rotation.z = Math.sin(t * 0.3) * 0.2; }
  const fall = U.uFall.value, bloom = U.uBloom.value;
  leaves.visible = fall > 0.3; shrooms.visible = fall > 0.3; petals.visible = bloom > 0.3;
}
