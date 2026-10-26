/* 潮汐小島 · 環境細節（v6.16）：沙灘邊層層疊疊的海岸岩石、秋天樹下的落葉、春天櫻花樹下的落花、秋天松林裡的蘑菇。
   使用自己的亂數，不影響 props.js 的佈置順序。季節的東西依 uFall / uBloom 顯示。 */
import * as THREE from 'three';
import { scene, M, mesh, U, bend } from './engine.js';
import { N, C, T, tileAt, groundAt, warp, waterY } from './terrain.js';
import { tuftKit } from './grass.js';
import { trees, blocked, colliders, rockGeo, seats, PIER, SITES, mergeStatic, onRoad } from './props.js';

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
/* v7.4（Codex 第二輪 B1）：葉子小一點（約 17–31 公分，再小遊戲鏡頭就看不出來）、多一點，七成聚成兩三堆（讀得出一片片的落葉，不是均勻撒開）；
   也落在石板路與廣場鋪面上（貼在鋪面上方）。廣場大樹（t.s ≥ 1.5）的葉子落在石座外圈，樹下兩堆疊起來的落葉堆 */
function scatter(map, kinds, per, radius, cols, size) {
  const list = [];
  trees.forEach(t => {
    if (!kinds.includes(t.kind)) return;
    const big = t.s >= 1.5, inner = big ? 1.75 : 0.3, n = big ? per * 3 : per;
    const cs = []; for (let k = 2 + Math.floor(r() * 2); k > 0; k--) { const a = r() * 6.28, d = inner + 0.2 + r() * radius * t.s * 0.55; cs.push([t.x + Math.cos(a) * d, t.z + Math.sin(a) * d]); }
    const add = (x, z, up, tilt) => { if (big && Math.hypot(x - t.x, z - t.z) < inner) return; const tt = tileAt(x, z); if (tt === 1 || tt === 2 || tt === 5) list.push([x, z, up, tilt]); };
    for (let i = 0; i < n; i++) {
      if (r() < 0.7) { const c = cs[i % cs.length], a = r() * 6.28, d = Math.sqrt(r()) * 0.6; add(c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, 0, 0.2); }
      else { const a = r() * 6.28, d = inner + Math.sqrt(r()) * radius * t.s; add(t.x + Math.cos(a) * d, t.z + Math.sin(a) * d, 0, 0.2); }
    }
    if (big) cs.slice(0, 2).forEach(c => { for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.32; add(c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, r() * 0.06 * (1 - d / 0.32), 0.9); } });   // 落葉堆：中間疊高 4–6 公分、葉子翹起來
  });
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = bend(new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide, depthWrite: true }), 'char');
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.count = list.length; im.receiveShadow = true; im.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  list.forEach(([x, z, up, tilt], i) => { m4.compose(v.set(x, groundAt(x, z) + (onRoad(x, z) ? 0.075 : 0.05) + (i % 7) * 0.004 + up, z), q.setFromEuler(e.set((r() - 0.5) * tilt, r() * 6.28, (r() - 0.5) * tilt)), sc.setScalar(size * (0.7 + r() * 0.6))); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(cols[Math.floor(r() * cols.length)])); });   // 石板路、鋪面高出地面 3–5 公分：葉子貼在上面
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
/* ---------- 碎石（v7.4，Codex 第二輪 B2）：草地與沙岸、步道交界的地方，一小群 3–5 顆 9–25 公分的灰米色小石（再小遊戲鏡頭就看不出來）（一個 InstancedMesh） ---------- */
function pebbles() {
  const geo = new THREE.IcosahedronGeometry(1, 1), P = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const k = 1 + (Math.sin(v.x * 4.1 + v.z * 2.3) * 0.5 + Math.sin(v.y * 5.7 + v.x * 1.9) * 0.5) * 0.14; v.multiplyScalar(k); v.y *= v.y < 0 ? 0.3 : 0.62; P.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const edgy = (x, z, t) => [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]].some(([dx, dz]) => { const u = tileAt(x + dx, z + dz); return u !== t && u !== -1 && u !== 3 && u !== 6; }) || [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]].some(([dx, dz]) => onRoad(x + dx, z + dz));
  const list = [];
  for (let k = 0, made = 0; k < 6000 && made < 110; k++) {
    const cx = (r() - 0.5) * 86, cz = (r() - 0.5) * 86, t = tileAt(cx, cz);
    if ((t !== 0 && t !== 1 && t !== 2) || onRoad(cx, cz) || !edgy(cx, cz, t) || blocked(cx, cz, 0.35) || seats.some(st => Math.hypot(st.x - cx, st.z - cz) < 1.5)) continue;
    const n = 3 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) { const a = r() * 6.28, d = 0.08 + r() * 0.32, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (onRoad(x, z) || [-1, 3, 6].includes(tileAt(x, z))) continue; list.push([x, z, 0.045 + r() * r() * 0.08]); }
    made++;
  }
  const mat = bend(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 }), 'stone');
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.count = list.length; im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), TONES = ['#a4a593', '#b2ae9a', '#8f9486', '#bdb6a2'];
  list.forEach(([x, z, s], i) => { m4.compose(p.set(x, groundAt(x, z) + s * 0.12, z), q.setFromEuler(e.set((r() - 0.5) * 0.4, r() * 6.28, (r() - 0.5) * 0.4)), sc.set(s * (0.8 + r() * 0.5), s, s * (0.8 + r() * 0.5))); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(TONES[Math.floor(r() * TONES.length)])); });
  scene.add(im); return im;
}
/* ---------- 池塘的睡蓮與水草（v7.4，Codex 第二輪 B4）：高地泉、柳池各兩群睡蓮（每群 4–6 片、直徑 18–28 公分，其中一群開一朵奶油白的花），
   岸邊兩三叢從水底長出來、高出水面一點的水草。只佔岸線一成多，瀑布口留空 ---------- */
function pondPlants() {
  const PLAN = globalThis.TA && globalThis.TA.ISLE && globalThis.TA.ISLE.PLAN; if (!PLAN || !PLAN.ponds) return;
  const seg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const edge = (x, z, P) => { let d = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) d = Math.min(d, seg(x, z, P[j], P[i])); return d; };
  const inside = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const falls = (PLAN.falls || []).map(f => [f.x, f.z]);
  const pick = (P, lo, hi, avoid) => {   // 池塘裡離岸 lo–hi 公尺、離瀑布口和已選的點夠遠的一點（規劃座標）
    const xs = P.map(q => q[0]), zs = P.map(q => q[1]);
    for (let k = 0; k < 400; k++) {
      const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs));
      if (!inside(x, z, P)) continue; const d = edge(x, z, P); if (d < lo || d > hi) continue;
      if (falls.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 2.6) || avoid.some(([ax, az]) => Math.hypot(ax - x, az - z) < 2.2)) continue;
      return [x, z];
    }
    return null;
  };
  const pads = [], reeds = [], flowers = [];
  PLAN.ponds.forEach(pd => {
    const used = [];
    for (let c = 0; c < 2; c++) {
      const at = pick(pd.poly, 0.55, 1.4, used); if (!at) continue; used.push(at);
      const n = 4 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28, d = Math.sqrt(r()) * 0.42, px = at[0] + Math.cos(a) * d, pz = at[1] + Math.sin(a) * d;
        if (!inside(px, pz, pd.poly) || edge(px, pz, pd.poly) < 0.25) continue;
        const [x, z] = warp(px, pz), y = waterY(x, z); if (y == null) continue;
        pads.push([x, y, z, 0.09 + r() * 0.05, r() * 6.28]);
        if (c === 0 && i === 0) flowers.push([x, y, z]);
      }
    }
    for (let c = 0; c < 3; c++) {
      const at = pick(pd.poly, 0.08, 0.3, used); if (!at) continue; used.push(at);
      const n = 4 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28, d = Math.sqrt(r()) * 0.32, px = at[0] + Math.cos(a) * d, pz = at[1] + Math.sin(a) * d;
        if (!inside(px, pz, pd.poly)) continue;
        const [x, z] = warp(px, pz), wy = waterY(x, z); if (wy == null) continue;
        reeds.push([x, groundAt(x, z), z, wy]);
      }
    }
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  if (pads.length) {   // 葉子：缺一角的圓盤，平貼水面（高出水面一點點，不和水面的起伏打架）
    const geo = new THREE.CircleGeometry(1, 14, 0.3, Math.PI * 2 - 0.6).rotateX(-Math.PI / 2);
    const mat = bend(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, side: THREE.DoubleSide }), 'char');
    const im = new THREE.InstancedMesh(geo, mat, pads.length); im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
    const PADC = ['#638965', '#7b9b68', '#6e9266'];
    pads.forEach(([x, y, z, s, rot], i) => { m4.compose(v.set(x, y + 0.025, z), q.setFromEuler(e.set(0, rot, 0)), sc.setScalar(s)); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(PADC[i % 3])); });
    scene.add(im);
  }
  if (flowers.length) {   // 睡蓮花：兩圈尖尖的花瓣（奶油白、花心淡黃）
    const g = new THREE.Group(), petal = M('#eee5cd', { roughness: 0.6 }, 'char'), core = M('#e8cf7a', {}, 'char');
    flowers.forEach(([x, y, z]) => {
      const f = new THREE.Group(); f.position.set(x, y + 0.03, z);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, m = mesh(new THREE.ConeGeometry(0.022, 0.07, 4), petal, Math.cos(a) * 0.028, 0.02, Math.sin(a) * 0.028, { noCast: true }); m.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); f.add(m); }
      f.add(mesh(new THREE.SphereGeometry(0.018, 8, 5), core, 0, 0.03, 0, { noCast: true }));
      g.add(f);
    });
    mergeStatic(g); scene.add(g);
  }
  if (reeds.length) {   // 水草：草叢拉高拉細，從水底長出來、高出水面 15–30 公分，顏色深一點（#617D57）
    const { geo, mat } = tuftKit();
    const im = new THREE.InstancedMesh(geo, mat, reeds.length); im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
    reeds.forEach(([x, y, z, wy], i) => { const hk = (wy - y + 0.15 + r() * 0.15) / 0.3; m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0, r() * 6.28, 0)), sc.set(0.75, hk, 0.75)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setRGB(0.72, 0.84, 0.7)); });
    scene.add(im);
  }
}
let leaves = null, petals = null, shrooms = null;
export function build() {
  shoreRocks();
  leaves = scatter(leafTex, ['round', 'pink'], 40, 1.7, ['#d5aa58', '#b96b43', '#9f573f', '#d8ac57', '#bd7045', '#c8a03a'], 0.24);   // 秋葉色（Codex 第二輪色票）
  petals = scatter(petalTex, ['pink'], 26, 1.8, ['#ffd0e0', '#ffe4ee', '#ffb8d0'], 0.28);
  shrooms = mushrooms();
  pebbles();
  pondPlants();
  plane = seaplane();
}
export const debug = () => ({ mesh: leaves, leaves: leaves && leaves.count, petals: petals && petals.count, shrooms: shrooms && shrooms.children.length, lv: leaves && leaves.visible });
export function update(t) {
  if (!leaves) return;
  if (plane) { plane.position.y = Math.sin(t * 1.1) * 0.05 - 0.04; plane.rotation.z = Math.sin(t * 0.8) * 0.025; plane.rotation.x = Math.sin(t * 0.9 + 1) * 0.015; plane.userData.prop.rotation.z = Math.sin(t * 0.3) * 0.2; }
  const fall = U.uFall.value, bloom = U.uBloom.value;
  leaves.visible = fall > 0.3; shrooms.visible = fall > 0.3; petals.visible = bloom > 0.3;
}
