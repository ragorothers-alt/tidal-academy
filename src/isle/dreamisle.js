/* 潮汐小島 · 夢境島（v6.19）：在自己家的床上「深度睡眠」，進入可以自由造島的夢境沙盒。
   - 三個存檔欄位，每座夢境島可以選小型／中型／大型。
   - 自由擺放樹木（可選生長階段）、花、石頭、長椅、路燈、柵欄與所有家具，不花鈴錢、不用材料；X 鍵拆掉面前的東西、R 旋轉。
   - 可以調整時間（0–24 時）與天氣（晴、雨、雪），召喚最多 10 位島民在島上散步。
   - v6.19：地形可以改造——挖河（每一層都能挖，高處的水緊鄰低處的水會形成瀑布）、蓋懸崖、斜坡、降低／填平。
   - v6.21：小路彩繪（7 種）、Z 復原、夢之碎片（每天 5 個，有的在懸崖頂或河面上空）、仰望夜空對流星許願、夢幻家具（用碎片解鎖）、夢境評價、
     蝴蝶／螢火蟲／河裡的魚影／雲朵／星空與月亮、花瓣雨與流星雨、島民會坐長椅並依情境說話、玩家也能坐下。
   - v6.20：懸崖開放到第三層；面向高兩層的懸崖蓋斜坡會切出兩格長的斜坡；可以跳躍（最多三段跳），二段跳能跳上一層懸崖、跳過一格寬的河。
   存檔 S().dreams = [ { size, name, items: [{ k, id, x, z, r, c, g }], ter: { "x,z": 1|2|3|'w<層>'|'r<方向><層>' }, paint: { "x,z": 小路 id }, shards: [[x, z, 空中]], shardDay, best, hour, weather, villagers: [sid] } | null ×3 ] */
import * as THREE from 'three';
import { renderer, camera, M, mesh, U, CURVE, bend, scene as mainScene, leafGeo, canopyCards, cardMat, CARD_DEPTH } from './engine.js';
import { tuftKit } from './grass.js';
import { animate, chibi, lookAt, setExpr, setSit } from './chars.js';
import { buildFurniture, disposeFurniture, loadThumbs, furn } from './room.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, dayKey } from './state.js';
import { pick } from './quiz.js';
import * as memo from './memo.js';
import * as post from './post.js';
import * as actors from './actors.js';

export const SIZES = { S: { name: '小型', R: 9 }, M: { name: '中型', R: 13 }, L: { name: '大型', R: 17 } };
export let inside = false;
/** 夢境島正在下雨（main.js 依這個決定撐不撐傘） */
export const raining = () => inside && !!D && D.weather === 'rain';
let P = null, ctx = null, slot = -1, D = null, sc = null, camPos = new THREE.Vector3(), savedCurve = CURVE;
let objs = new THREE.Group(), ghost = null, sel = null, rot = 0, sky = null, hemi = null, sun = null, rain = null, sparkle = null, sea = null, dome = null;
const DOME = { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } }, WHITE = new THREE.Color('#ffffff');
const dwModels = new Map();   // v8.6 島民模型每位重用一份，不碰角色與服裝共用的資源
const dwellers = [], meshOf = new Map();   // 物件 → 模型（不存進存檔）
const dreams = () => { const s = S(); s.dreams = s.dreams || [null, null, null]; while (s.dreams.length < 3) s.dreams.push(null); return s.dreams; };

// v8.6 只登記本模組這次建立的資源，共用模型、材質與貼圖不釋放。
const ownGeos = new WeakSet(), ownMats = new WeakSet();
const ownGeo = g => { ownGeos.add(g); return g; }, ownMat = m => { ownMats.add(m); return m; };
function disposeObject(root) {
  if (!root) return;
  root.traverse(o => {
    disposeFurniture(o);
    if (o.geometry && ownGeos.delete(o.geometry)) o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && ownMats.delete(m)) m.dispose(); });
  });
}
function removeObject(o) { if (o) { o.removeFromParent(); disposeObject(o); } }

/* ---------- 物件模型（不加入主島的碰撞與佈置，純粹給夢境用） ---------- */
const TREES = { round: '闊葉樹', pink: '櫻花樹', cedar: '杉樹', palm: '椰子樹', bamboo: '竹子', fruit: '果樹' };
const OUTDOOR = { rock: '石頭', bench: '長椅', lamp: '路燈', fence: '木柵欄', stone: '石板路' };
const FLOWERS = ['#ff7a9a', '#ffffff', '#ffd23f', '#b38bff', '#ff5a5a', '#7ec8ff'];
/** 小路：[名稱, 底色]，花紋在 buildTerrain 裡依 id 畫 */
const PAINTS = { stone: ['石板小路', '#e4d8bd'], brick: ['紅磚路', '#c96a4c'], plank: ['木棧道', '#c59866'], sand: ['沙地小路', '#f2e1b6'], dirt: ['泥土小徑', '#b48e66'], star: ['星砂小路', '#cfbff7'], meadow: ['花草地', '#78c658'] };
const hs = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
function treeModel(id, grow) {
  const g = new THREE.Group(), s = [0.45, 0.7, 1][grow ?? 2];
  if (id === 'palm') {
    let px = 0, py = 0;
    for (let i = 0; i < 6; i++) { const seg = mesh(ownGeo(new THREE.CylinderGeometry(0.12 * s, 0.15 * s, 0.5 * s, 7)), M('#a57a4f'), px, py + 0.25 * s, 0); seg.rotation.z = -0.08 * i; g.add(seg); px += 0.05 * i * s; py += 0.48 * s; }
    for (let i = 0; i < 7; i++) { const lf = mesh(ownGeo(new THREE.SphereGeometry(0.5 * s, 8, 6)), M('#55b356', {}, 'pine'), px + Math.cos(i * 0.9) * 0.7 * s, py - 0.12 * s, Math.sin(i * 0.9) * 0.7 * s); lf.scale.set(1.6, 0.12, 0.38); lf.rotation.y = -i * 0.9; lf.rotation.z = -0.35; g.add(lf); }
  } else if (id === 'cedar') {
    g.add(mesh(ownGeo(new THREE.CylinderGeometry(0.13 * s, 0.17 * s, 0.8 * s, 7)), M('#7a5238'), 0, 0.4 * s, 0));
    [[1.0, 0.9], [0.8, 1.55], [0.55, 2.15], [0.3, 2.62]].forEach(([r, h]) => g.add(mesh(ownGeo(new THREE.ConeGeometry(r * s, 1.0 * s, 16)), M('#3f9a5e', {}, 'pine'), 0, h * s, 0)));
  } else if (id === 'bamboo') {
    for (let i = 0; i < 6; i++) { const a = i * 1.05, h = (2.2 + (i % 3) * 0.5) * s; g.add(mesh(ownGeo(new THREE.CylinderGeometry(0.045 * s, 0.055 * s, h, 7)), M('#8fc65a', {}, 'pine'), Math.cos(a) * 0.22, h / 2, Math.sin(a) * 0.22)); const lf = mesh(ownGeo(new THREE.SphereGeometry(0.3 * s, 7, 5)), M('#6fb24a', {}, 'pine'), Math.cos(a) * 0.3, h - 0.1, Math.sin(a) * 0.3); lf.scale.set(1.3, 0.35, 0.8); g.add(lf); }
  } else {
    g.add(mesh(ownGeo(new THREE.CylinderGeometry(0.12 * s, 0.21 * s, 1.25 * s, 8)), M('#8a5a3b', {}, 'stone'), 0, 0.62 * s, 0));
    const leaf = id === 'pink' ? M('#ffb3cf', {}, 'sway') : M('#58b34d', {}, 'sway');
    [[0, 1.75, 0, 0.85], [0.45, 1.45, 0.2, 0.62], [-0.42, 1.5, -0.15, 0.6], [0.05, 2.25, -0.05, 0.55], [0.6, 1.95, -0.32, 0.42], [-0.52, 2.0, 0.34, 0.44]].forEach(([a, b, c, r], i) => { g.add(mesh(leafGeo(r * s * 0.7, i), leaf, a * s, b * s, c * s)); const cd = mesh(canopyCards(r * s, i), cardMat(id === 'pink' ? '#ffb3cf' : '#58b34d', 'sway'), a * s, b * s, c * s); cd.customDepthMaterial = CARD_DEPTH; g.add(cd); });
    if (id === 'fruit' && grow === 2) for (let i = 0; i < 5; i++) { const a = i * 1.3; g.add(mesh(ownGeo(new THREE.SphereGeometry(0.11, 8, 6)), M('#ff8a3d'), Math.cos(a) * 0.72, 1.5 + (i % 2) * 0.3, Math.sin(a) * 0.72)); }
  }
  return g;
}
function flowerModel(c) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3, r = 0.12 + (i % 2) * 0.18; g.add(mesh(ownGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 4)), M('#4f9a3a'), Math.cos(a) * r, 0.14, Math.sin(a) * r, { noCast: true }), mesh(ownGeo(new THREE.SphereGeometry(0.075, 8, 6)), M(c), Math.cos(a) * r, 0.3, Math.sin(a) * r, { noCast: true })); }
  return g;
}
function outdoorModel(id) {
  const g = new THREE.Group();
  if (id === 'rock') { const m = mesh(ownGeo(new THREE.IcosahedronGeometry(0.45, 2)), M('#bdb6aa', {}, 'stone'), 0, 0.2, 0); m.scale.set(1.2, 0.75, 1); g.add(m); }
  else if (id === 'bench') { g.add(mesh(ownGeo(new THREE.BoxGeometry(1.4, 0.08, 0.45)), M('#c48a54'), 0, 0.45, 0), mesh(ownGeo(new THREE.BoxGeometry(1.4, 0.4, 0.06)), M('#c48a54'), 0, 0.7, -0.2)); [-0.6, 0.6].forEach(bx => g.add(mesh(ownGeo(new THREE.BoxGeometry(0.06, 0.45, 0.4)), M('#5a5f6a'), bx, 0.22, 0))); }
  else if (id === 'lamp') { g.add(mesh(ownGeo(new THREE.CylinderGeometry(0.06, 0.08, 2, 8)), M('#4a4f5c'), 0, 1, 0)); const head = mesh(ownGeo(new THREE.SphereGeometry(0.22, 12, 8)), M('#fff6d8', { emissive: new THREE.Color('#ffc870'), emissiveIntensity: 0.9 }), 0, 2.1, 0); g.add(head); g.userData.head = head; }
  else if (id === 'fence') { [-0.45, 0.45].forEach(dx => g.add(mesh(ownGeo(new THREE.BoxGeometry(0.1, 0.7, 0.1)), M('#c99a62'), dx, 0.35, 0))); [0.25, 0.52].forEach(y => g.add(mesh(ownGeo(new THREE.BoxGeometry(1.0, 0.08, 0.06)), M('#b98a55'), 0, y, 0))); }
  else if (id === 'stone') { const m = mesh(ownGeo(new THREE.CylinderGeometry(0.42, 0.44, 0.06, 14)), M('#efe3c6', {}, 'stone'), 0, 0.03, 0, { noCast: true }); g.add(m); }
  return g;
}
function modelOf(it) {
  if (it.k === 'tree') return treeModel(it.id, it.g);
  if (it.k === 'flower') return flowerModel(it.c);
  if (it.k === 'out') return outdoorModel(it.id);
  const f = furn(it.id); return f ? buildFurniture(f) : new THREE.Group();
}
const footOf = it => { if (it.k !== 'furn') return [1, 1]; const f = furn(it.id); const [w, d] = (f && f.size) || [1, 1]; return it.r % 2 ? [d, w] : [w, d]; };
const solid = it => !(it.k === 'flower' || (it.k === 'out' && it.id === 'stone') || (it.k === 'furn' && (furn(it.id) || {}).cat === 'rug'));

/* ---------- 地形：格子（每格中心在整數座標），預設是第 0 層草地 ---------- */
const LV = [0.37, 1.37, 2.37, 3.37];   // 各層草地高度（0–3 層）
const TOP = LV.length - 1;
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];   // 斜坡往上的方向：+z、+x、-z、-x
function cellAt(x, z) {
  const R = SIZES[D.size].R, d = Math.hypot(x, z);
  if (d > R + 2.2) return { t: 'sea' };
  if (d > R) return { t: 'sand' };
  const v = D.ter && D.ter[x + ',' + z];
  if (v == null) return { t: 'g', lv: 0 };
  if (typeof v === 'number') return { t: 'g', lv: v };
  if (v[0] === 'w') return { t: 'w', lv: +v[1] };
  return { t: 'r', dir: +v[1], lv: +v[2] };
}
/** 格子角落高度（cx, cz ∈ {0, 1}，0 是較小的座標那一側） */
function cornerH(c, cx, cz) {
  if (c.t === 'sea') return -0.7; if (c.t === 'sand') return 0.2;
  if (c.t === 'w') return LV[c.lv] - 0.5; if (c.t === 'g') return LV[c.lv];
  return LV[c.lv] + [cz, cx, 1 - cz, 1 - cx][c.dir];
}
const waterSurf = c => LV[c.lv] - 0.14;
/** 某點的地面高度（斜坡做雙線性內插） */
function groundY(px, pz) {
  const x = Math.round(px), z = Math.round(pz), c = cellAt(x, z), fx = px - (x - 0.5), fz = pz - (z - 0.5);
  if (c.t !== 'r') return cornerH(c, 0, 0);
  const a = cornerH(c, 0, 0), b = cornerH(c, 1, 0), d = cornerH(c, 0, 1), e = cornerH(c, 1, 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (d * (1 - fx) + e * fx) * fz;
}
const topOf = (x, z) => { const c = cellAt(x, z); return c.t === 'g' ? LV[c.lv] : c.t === 'r' ? LV[c.lv] + 0.5 : 0.37; };
/* 瀑布：高處的水落到相鄰低處的水，流動條紋與底部水花 */
const fallU = { uTime: U.uTime, uCurve: U.uCurve, uBendF: U.uBendF };
const fallMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: fallU,
  vertexShader: 'uniform float uCurve; uniform float uBendF; varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mv = modelViewMatrix * vec4(position, 1.0); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; gl_Position = projectionMatrix * mv; }',
  fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main(){ float x = (vW.x + vW.z) * 3.0, y = vUv.y; float st = n(vec2(x * 2.5, y * 3.0 + uTime * 2.2)) * 0.6 + n(vec2(x * 6.0, y * 7.0 + uTime * 3.4)) * 0.4;
      vec3 c = mix(vec3(0.34, 0.74, 0.88), vec3(0.97, 0.99, 1.0), smoothstep(0.45, 0.85, st)); c = mix(c, vec3(1.0), smoothstep(0.85, 1.0, y) * 0.7 + smoothstep(0.2, 0.0, y) * 0.8);
      gl_FragColor = vec4(c, 0.78 + st * 0.2); }`
});
let terMesh = null, waterMesh = null, falls = null, waterCells = [], fallCount = 0;
/* 夢境島的地形材質：和主島一樣的草地斑駁與懸崖岩層；雙面，崖壁不論朝哪個方向都看得到 */
const terMat = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), 'terrain');
const waterMat = bend(new THREE.MeshStandardMaterial({ color: '#6fe0e6', transparent: true, opacity: 0.75, roughness: 0.1 }), 'water');
function buildTerrain() {
  if (terMesh) { sc.remove(terMesh); terMesh.geometry.dispose(); } if (waterMesh) { sc.remove(waterMesh); waterMesh.geometry.dispose(); } if (falls) { sc.remove(falls); falls.geometry.dispose(); }
  const R = SIZES[D.size].R, E = Math.ceil(R + 2.5), P2 = [], C2 = [], WP = [], FP = [], FU = [];
  const col = new THREE.Color(), push = (x, y, z, c) => { P2.push(x, y, z); C2.push(c.r, c.g, c.b); };
  const quad = (a, b, c, d, ca, cb, cc, cd) => { push(...a, ca); push(...b, cb); push(...c, cc); push(...a, ca); push(...c, cc); push(...d, cd); };
  const grassC = (x, z, lv) => col.set(['#86b03a', '#8cb540', '#92ba46', '#98bf4c'][lv]).lerp(pc.set('#64962c'), 0.35 + 0.35 * Math.sin(x * 0.43 + z * 0.31) * Math.sin(x * 0.27 - z * 0.39)).offsetHSL(0, 0, ((Math.sin(x * 1.7 + z * 2.3) + Math.sin(x * 0.6 - z * 0.9)) * 0.5) * 0.025).clone();   // 和主島一樣陽光下的黃綠，大片深淺交錯
  const SAND = new THREE.Color('#f6e7c0'), BED = new THREE.Color('#9fd8c8'), RAMP = new THREE.Color('#c9a87a'), CLT = new THREE.Color('#b48a5c'), CLB = new THREE.Color('#946c45'), LIP = new THREE.Color('#5f8f30'), SANDW = new THREE.Color('#d9c08a'), SKIRT = new THREE.Color('#56702c');
  // v8.7 草皮外緣往外、往下多一圈裙邊（約 0.07–0.13m，沿邊緣有點起伏）：崖頂不再是一刀切的直角薄片，像圓圓的土堆。只是顯示用的網格，格子與碰撞不變
  const jit = (px, pz) => 0.07 + hs(Math.round(px * 6), Math.round(pz * 6)) * 0.06, SK = 0.15;
  /* 小路：一格切成 6×6 小塊畫花紋；和不同小路相鄰的外圈混一點草色，邊緣比較柔和 */
  const pc = new THREE.Color(), FLW = ['#ff9ab8', '#ffffff', '#ffe066', '#c9a6ff'];
  const paintTop = (x, z, c, pid, grass) => {
    const y = LV[c.lv], base = new THREE.Color(PAINTS[pid][1]), X = x - 0.5, Z = z - 0.5, n = 6;
    const same = (nx, nz) => { const o = cellAt(nx, nz); return o.t === 'g' && o.lv === c.lv && D.paint[nx + ',' + nz] === pid; };
    const eW = !same(x - 1, z), eE = !same(x + 1, z), eN = !same(x, z - 1), eS = !same(x, z + 1);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const gx = x * n + i, gz = z * n + j; let col = pc.copy(base);
      if (pid === 'stone') { const r = Math.floor(gz / 2), sid = Math.floor((gx + (r & 1)) / 2); col.offsetHSL(0, -0.02, (hs(sid, r) - 0.5) * 0.14); if ((gx + (r & 1)) % 2 === 0 && hs(gx, gz) > 0.6) col.offsetHSL(0, 0, -0.05); }
      else if (pid === 'brick') { const b = Math.floor((gx + (gz & 1)) / 2); col.offsetHSL((hs(b, gz) - 0.5) * 0.03, 0, (hs(b, gz + 9) - 0.5) * 0.14); }
      else if (pid === 'plank') { const r = Math.floor(gz / 2); col.offsetHSL(0, 0, (hs(r, Math.floor((gx + r * 3) / 5)) - 0.5) * 0.12 - (gz % 2 ? 0.035 : 0)); }
      else if (pid === 'star') { col.offsetHSL(0, 0, (hs(gx, gz) - 0.5) * 0.06); if (hs(gx + 3, gz) > 0.9) col.set('#fff6cf'); }
      else if (pid === 'meadow') { col.copy(grass).offsetHSL(0, 0.03, (hs(gx, gz) - 0.5) * 0.05); if (hs(gx, gz + 5) > 0.84) col.set(FLW[Math.floor(hs(gx + 1, gz) * 4)]); }
      else col.offsetHSL(0, 0, (hs(gx, gz) - 0.5) * 0.07);
      let w = 0; const ex = (eW && i === 0) || (eE && i === n - 1), ez = (eN && j === 0) || (eS && j === n - 1);
      if (ex || ez) w = ex && ez ? 0.85 : 0.5;
      if (pid !== 'meadow' && w) col.lerp(grass, w);
      const k = col.clone(), x0 = X + i / n, x1 = X + (i + 1) / n, z0 = Z + j / n, z1 = Z + (j + 1) / n;
      quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], k, k, k, k);
    }
  };
  waterCells = [];
  for (let z = -E; z <= E; z++) for (let x = -E; x <= E; x++) {
    const c = cellAt(x, z); if (c.t === 'sea') continue;
    if (c.t === 'w') waterCells.push([x, z, c.lv]);
    const X = x - 0.5, Z = z - 0.5, h = (cx, cz) => cornerH(c, cx, cz), sk = {};
    const top = c.t === 'sand' ? SAND : c.t === 'w' ? BED : c.t === 'r' ? RAMP : grassC(x, z, c.lv), pid = c.t === 'g' && D.paint && D.paint[x + ',' + z];
    if (pid && PAINTS[pid]) paintTop(x, z, c, pid, top.clone());
    else quad([X, h(0, 0), Z], [X, h(0, 1), Z + 1], [X + 1, h(1, 1), Z + 1], [X + 1, h(1, 0), Z], top, top, top, top);
    if (c.t === 'w') { const y = waterSurf(c); WP.push(X, y, Z, X, y, Z + 1, X + 1, y, Z + 1, X, y, Z, X + 1, y, Z + 1, X + 1, y, Z); }
    // 邊緣：比鄰格高的那一側畫懸崖壁（由高的格子負責）
    [[1, 0, [1, 1], [1, 0], [0, 1], [0, 0]], [-1, 0, [0, 0], [0, 1], [1, 0], [1, 1]], [0, 1, [0, 1], [1, 1], [0, 0], [1, 0]], [0, -1, [1, 0], [0, 0], [1, 1], [0, 1]]].forEach(([dx, dz, A, B, NA, NB]) => {
      const n = cellAt(x + dx, z + dz), ha = h(...A), hb = h(...B), na = cornerH(n, ...NA), nb = cornerH(n, ...NB);
      if (ha <= na + 0.01 && hb <= nb + 0.01) return;
      const a = [X + A[0], Z + A[1]], b = [X + B[0], Z + B[1]];
      if (c.t === 'sand') {
        quad([a[0], na, a[1]], [a[0], ha, a[1]], [b[0], hb, b[1]], [b[0], nb, b[1]], SANDW, SAND, SAND, SANDW);
        if (n.t === 'sea') sk[dx + ',' + dz] = 's';
        if (n.t === 'sea') for (let s = 0; s < 3; s++) {   // v8.7 沙灘往海裡斜斜地沒入水面（以前是一塊方方正正的沙盒邊）
          const t0 = s / 3, t1 = (s + 1) / 3, x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0, x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[1] + (b[1] - a[1]) * t1, y0 = ha + (hb - ha) * t0, y1 = ha + (hb - ha) * t1, j0 = jit(x0, z0) * 3, j1 = jit(x1, z1) * 3;
          quad([x0, y0, z0], [x0 + dx * j0, y0 - 0.3, z0 + dz * j0], [x1 + dx * j1, y1 - 0.3, z1 + dz * j1], [x1, y1, z1], SAND, SANDW, SANDW, SAND);
        }
        return;
      }
      const l = c.t === 'g' ? 0.12 : 0;
      if (l) quad([a[0], ha - l, a[1]], [a[0], ha, a[1]], [b[0], hb, b[1]], [b[0], hb - l, b[1]], LIP, LIP, LIP, LIP);
      if (l && ha - na > 0.08 && hb - nb > 0.08) {   // 崖頂與草地接沙灘的那一階都有
        sk[dx + ',' + dz] = 'g';
        for (let s = 0; s < 3; s++) {
          const t0 = s / 3, t1 = (s + 1) / 3, x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0, x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[1] + (b[1] - a[1]) * t1, y0 = ha + (hb - ha) * t0, y1 = ha + (hb - ha) * t1, j0 = jit(x0, z0), j1 = jit(x1, z1);
          const d0 = Math.min(SK, (y0 - na - (nb - na) * t0) * 0.75), d1 = Math.min(SK, (y1 - na - (nb - na) * t1) * 0.75);   // 低的那一階：裙邊垂到快碰到沙面為止
          quad([x0, y0, z0], [x0 + dx * j0, y0 - d0, z0 + dz * j0], [x1 + dx * j1, y1 - d1, z1 + dz * j1], [x1, y1, z1], LIP, SKIRT, SKIRT, LIP);
        }
      }
      quad([a[0], Math.min(na, ha - l), a[1]], [a[0], ha - l, a[1]], [b[0], hb - l, b[1]], [b[0], Math.min(nb, hb - l), b[1]], CLB, CLT, CLT, CLB);
      // 瀑布：這格是水、鄰格是較低的水
      if (c.t === 'w' && n.t === 'w' && n.lv < c.lv) {
        const y1 = waterSurf(c) + 0.02, y0 = waterSurf(n), ox = dx * 0.06, oz = dz * 0.06;
        FP.push(a[0] + ox, y0, a[1] + oz, a[0] + ox, y1, a[1] + oz, b[0] + ox, y1, b[1] + oz, a[0] + ox, y0, a[1] + oz, b[0] + ox, y1, b[1] + oz, b[0] + ox, y0, b[1] + oz);
        FU.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
      }
    });
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {   // 外角：兩邊的裙邊之間補一個三角形，轉角是圓的
      const kd = sk[sx + ',0']; if (!kd || kd !== sk['0,' + sz]) return;
      const cx = sx > 0 ? 1 : 0, cz = sz > 0 ? 1 : 0, px = X + cx, pz = Z + cz, y = h(cx, cz);
      if (kd === 's') { const j = jit(px, pz) * 3; push(px, y, pz, SAND); push(px + sx * j, y - 0.3, pz, SANDW); push(px, y - 0.3, pz + sz * j, SANDW); return; }
      const j = jit(px, pz), dd = Math.min(SK, (y - cornerH(cellAt(x + sx, z + sz), 1 - cx, 1 - cz)) * 0.75);
      if (dd > 0.02) { push(px, y, pz, LIP); push(px + sx * j, y - dd, pz, SKIRT); push(px, y - dd, pz + sz * j, SKIRT); }
    });
  }
  const g = ownGeo(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3)); g.computeVertexNormals();
  terMesh = new THREE.Mesh(g, terMat); terMesh.receiveShadow = true; terMesh.castShadow = true; terMesh.frustumCulled = false; sc.add(terMesh);
  const wg = ownGeo(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.Float32BufferAttribute(WP, 3)); wg.computeVertexNormals();
  waterMesh = new THREE.Mesh(wg, waterMat); waterMesh.receiveShadow = true; waterMesh.frustumCulled = false; sc.add(waterMesh);
  const fg = ownGeo(new THREE.BufferGeometry()); fg.setAttribute('position', new THREE.Float32BufferAttribute(FP, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(FU, 2));
  falls = new THREE.Mesh(fg, fallMat); falls.renderOrder = 3; falls.frustumCulled = false; sc.add(falls);
  fallCount = FP.length / 18; resetFish();
  buildGrass();
}
/* 草叢：和主島同一種草，長在沒有鋪小路、沒有擺東西的草地格子上（地形或擺設改變時重鋪） */
let grassMesh = null;
function buildGrass() {
  if (grassMesh) { sc.remove(grassMesh); grassMesh.dispose(); grassMesh = null; }
  const R = SIZES[D.size].R, E = Math.ceil(R), used = new Set(), pts = [];
  (D.items || []).forEach(o => cellsOf(o).forEach(k => used.add(k)));
  const per = S().settings && S().settings.lowPerf ? 5 : 10;
  for (let z = -E; z <= E; z++) for (let x = -E; x <= E; x++) {
    const c = cellAt(x, z), key = x + ',' + z; if (c.t !== 'g' || used.has(key) || (D.paint && D.paint[key])) continue;
    for (let k = 0; k < per; k++) {
      const h1 = hs(x * 7 + k, z * 13 - k), h2 = hs(x * 11 - k * 3, z * 5 + k * 7), h3 = hs(x + k * 17, z - k * 19);
      const px = x - 0.5 + h1, pz = z - 0.5 + h2, clump = 0.5 + 0.5 * Math.sin(px * 0.55 + 1.3) * Math.sin(pz * 0.47 - 0.7);
      if (h3 > 0.45 + clump * 0.6) continue;   // 一片片疏密交錯
      pts.push([px, LV[c.lv], pz, 0.55 + clump * 0.6 + h3 * 0.3, h1 * 6.28]);
    }
  }
  if (!pts.length) return;
  const kit = tuftKit(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
  grassMesh = new THREE.InstancedMesh(kit.geo, kit.mat, pts.length);
  pts.forEach(([x, y, z, s, r], i) => { m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0, r, 0)), s3.setScalar(s)); grassMesh.setMatrixAt(i, m4); col.setRGB(0.85 + hs(i, 1) * 0.25, 0.92 + hs(i, 2) * 0.16, 0.75 + hs(i, 3) * 0.2); grassMesh.setColorAt(i, col); });
  grassMesh.receiveShadow = true; grassMesh.frustumCulled = false; grassMesh.raycast = () => {}; sc.add(grassMesh);
}

/* ---------- 氣氛：星空與月亮、雲朵、蝴蝶、螢火蟲、魚影、流星 ---------- */
let glowT = null;
function glowTex() {
  if (glowT) return glowT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (glowT = new THREE.CanvasTexture(c));
}
const ADDB = THREE.AdditiveBlending;
/** v8.7 造島工具的正式圖示（data/appicons.js；沒有的就沿用 emoji） */
const AIC = (k, alt) => { const s = (((window.TA || {}).ISLE || {}).APPICONS || {})[k]; return s ? `<img class="dt-ic" src="${s}" alt="">` : (alt ?? k); };
let skyG = null, starMat = null, clouds = null, flies = [], butterflies = [], fish = [], meteor = null, meteorT = 6, nightK = 0;
function buildAmbient(R) {
  // 星空與月亮：跟著玩家移動的天球，只在夜晚淡入
  skyG = new THREE.Group(); const SN = 520, sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) { const a = Math.random() * 6.28, e = 0.12 + Math.random() * 1.35, r = 80; sp.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
  const sg = ownGeo(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  starMat = ownMat(new THREE.PointsMaterial({ map: glowTex(), color: '#fff8e0', size: 1.3, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: ADDB }));
  skyG.add(new THREE.Points(sg, starMat));
  const moon = new THREE.Mesh(ownGeo(new THREE.SphereGeometry(1.5, 24, 16)), ownMat(new THREE.MeshBasicMaterial({ color: '#fff8e0', fog: false, transparent: true }))); moon.position.set(8, 22, -60); skyG.add(moon);
  const halo = new THREE.Sprite(ownMat(new THREE.SpriteMaterial({ map: glowTex(), color: '#fff0c0', transparent: true, opacity: 0.35, depthWrite: false, fog: false, blending: ADDB }))); halo.scale.set(11, 11, 1); halo.position.copy(moon.position); skyG.add(halo);
  skyG.userData = { moon, halo }; sc.add(skyG);
  // 雲朵：遠方海面上慢慢繞著島飄
  clouds = new THREE.Group(); const cm = ownMat(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#e8eeff', emissiveIntensity: 0.25 }));
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group(), a = i / 10 * 6.28 + Math.random() * 0.4, d = R + 16 + Math.random() * 18;
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(ownGeo(new THREE.SphereGeometry(1 + Math.random() * 0.9, 12, 9)), cm); b.position.set((k - 2) * 1.3, Math.random() * 0.6 + (k === 2 ? 0.6 : 0), Math.random() * 0.8); b.scale.y = 0.62; g.add(b); }
    g.position.set(Math.cos(a) * d, 2.5 + Math.random() * 4, Math.sin(a) * d); g.rotation.y = -a; clouds.add(g);
  }
  sc.add(clouds);
  // 蝴蝶（白天、花叢旁）
  butterflies = [];
  ['#ffd23f', '#ffffff', '#ff9ac0', '#9ad0ff', '#ffb35a', '#c9a6ff'].forEach((c, i) => {
    const g = new THREE.Group(), wm = ownMat(new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.6 })), wg = ownGeo(new THREE.CircleGeometry(0.11, 10));
    const w1 = new THREE.Mesh(wg, wm), w2 = new THREE.Mesh(wg, wm); w1.position.x = 0.1; w2.position.x = -0.1; w1.rotation.x = w2.rotation.x = -Math.PI / 2;
    const l = new THREE.Group(), r = new THREE.Group(); l.add(w1); r.add(w2); g.add(l, r, new THREE.Mesh(ownGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 5)), M('#3a2a20')));
    g.children[2].rotation.x = Math.PI / 2; g.userData = { l, r, ph: i * 1.7, k: i }; g.visible = false; sc.add(g); butterflies.push(g);
  });
  // 螢火蟲（夜晚、水邊與花叢附近）
  flies = [];
  for (let i = 0; i < 26; i++) { const f = new THREE.Sprite(ownMat(new THREE.SpriteMaterial({ map: glowTex(), color: '#d6ff7a', transparent: true, opacity: 0, depthWrite: false, blending: ADDB }))); f.scale.set(0.32, 0.32, 1); f.userData = { ph: Math.random() * 6.28, w: 1 + Math.random() * 1.5, a: null }; f.visible = false; sc.add(f); flies.push(f); }
  meteor = null; meteorT = 4;
}
/** 河裡的魚影：沿著相連的水格慢慢游 */
const fishMat = new THREE.MeshBasicMaterial({ color: '#1f4c5c', transparent: true, opacity: 0.32, depthWrite: false });
function resetFish() {
  fish.forEach(f => removeObject(f.m)); fish = [];
  const n = Math.min(6, Math.floor(waterCells.length / 4));
  for (let i = 0; i < n; i++) {
    const c = waterCells[Math.floor(Math.random() * waterCells.length)], m = new THREE.Mesh(ownGeo(new THREE.CircleGeometry(0.17, 12)), fishMat);
    m.rotation.x = -Math.PI / 2; m.scale.set(0.55 + Math.random() * 0.3, 1, 1); m.renderOrder = 2; m.position.set(c[0], LV[c[2]] - 0.12, c[1]); sc.add(m);
    fish.push({ m, to: null, wait: Math.random() * 2 });
  }
}
function anchorFor(i) {
  const fl = (D.items || []).filter(o => o.k === 'flower');
  const pool = waterCells.map(c => [c[0], c[1]]).concat(fl.map(o => [o.x, o.z]));
  if (pool.length && i % 3) { const a = pool[Math.floor(Math.random() * pool.length)]; return [a[0] + (Math.random() - 0.5) * 1.6, a[1] + (Math.random() - 0.5) * 1.6]; }
  const R = SIZES[D.size].R, a = Math.random() * 6.28, r = Math.random() * (R - 1); return [Math.cos(a) * r, Math.sin(a) * r];
}
/** 流星：從天空斜斜劃過（仰望天空時看得到） */
function spawnMeteor() {
  const g = new THREE.Group(), dir = new THREE.Vector3((Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 3), -(3.5 + Math.random() * 2.5), 0);
  const head = new THREE.Sprite(ownMat(new THREE.SpriteMaterial({ map: glowTex(), color: '#fffbe8', transparent: true, depthWrite: false, fog: false, blending: ADDB }))); head.scale.set(1.1, 1.1, 1); g.add(head);
  const tail = new THREE.Mesh(ownGeo(new THREE.CylinderGeometry(0, 0.09, 3.4, 6)), ownMat(new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, depthWrite: false, fog: false, blending: ADDB })));
  const back = dir.clone().normalize().negate(); tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), back); tail.position.copy(back.multiplyScalar(1.7)); g.add(tail);
  const a = new THREE.Vector3(P.position.x - dir.x * 0.5 + (Math.random() - 0.5) * 6, P.position.y + 11 + Math.random() * 4, P.position.z - 26 - Math.random() * 8);
  g.position.copy(a); sc.add(g); meteor = { g, a, b: a.clone().add(dir), t: 0, life: 1 + Math.random() * 0.4, wished: false };
}
function ambientTick(dt, t, night) {
  nightK += ((night ? 1 : 0) - nightK) * Math.min(1, dt * 1.5);
  skyG.position.set(P.position.x, 0, P.position.z); starMat.opacity = nightK * 0.95; skyG.userData.moon.material.opacity = nightK; skyG.userData.halo.material.opacity = nightK * 0.35; skyG.visible = nightK > 0.02;
  clouds.rotation.y = t * 0.006;
  // 蝴蝶
  const fl = (D.items || []).filter(o => o.k === 'flower'), day = !night && D.weather !== 'rain' && D.weather !== 'snow';
  butterflies.forEach((b, i) => {
    const u = b.userData, f = fl.length ? fl[(u.k * 7) % fl.length] : null; b.visible = day && !!f && i < Math.max(2, fl.length);
    if (!b.visible) return;
    const tt = t * 0.8 + u.ph, x = f.x + Math.sin(tt) * 0.9 + Math.sin(tt * 2.3) * 0.25, z = f.z + Math.cos(tt * 1.3) * 0.8, y = topOf(f.x, f.z) + 0.55 + Math.sin(tt * 3.1) * 0.18;
    b.rotation.y = Math.atan2(x - b.position.x, z - b.position.z); b.position.set(x, y, z);
    const fa = Math.sin(t * 22 + u.ph) * 0.9; u.l.rotation.z = fa; u.r.rotation.z = -fa;
  });
  // 螢火蟲
  flies.forEach((f, i) => {
    const u = f.userData; f.visible = nightK > 0.05 && D.weather !== 'snow'; if (!f.visible) return;
    if (!u.a || Math.random() < dt * 0.05) u.a = anchorFor(i);
    const x = u.a[0] + Math.sin(t * 0.5 * u.w + u.ph) * 0.6, z = u.a[1] + Math.cos(t * 0.4 * u.w + u.ph * 2) * 0.6;
    f.position.set(x, groundY(x, z) + 0.5 + Math.sin(t * 0.9 + u.ph) * 0.3, z);
    const bl = Math.max(0, Math.sin(t * u.w * 1.6 + u.ph)); f.material.opacity = nightK * (0.15 + 0.85 * bl * bl);
  });
  // 魚影
  fish.forEach(f => {
    const m = f.m;
    if (!f.to) { f.wait -= dt; if (f.wait > 0) return; const cx = Math.round(m.position.x), cz = Math.round(m.position.z), nb = DIRS.map(([dx, dz]) => [cx + dx, cz + dz]).concat([[cx, cz]]).filter(([x, z]) => cellAt(x, z).t === 'w'); const c = nb[Math.floor(Math.random() * nb.length)]; if (!c) return; f.to = [c[0] + (Math.random() - 0.5) * 0.6, c[1] + (Math.random() - 0.5) * 0.6]; }
    const dx = f.to[0] - m.position.x, dz = f.to[1] - m.position.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { f.to = null; f.wait = 0.5 + Math.random() * 2.5; return; }
    const v = Math.min(d, dt * 0.7); m.position.x += dx / d * v; m.position.z += dz / d * v; m.rotation.z = Math.atan2(dx, dz) + Math.PI / 2;
    const c = cellAt(Math.round(m.position.x), Math.round(m.position.z)); if (c.t === 'w') m.position.y += (LV[c.lv] - 0.12 - m.position.y) * Math.min(1, dt * 4);
    m.material.opacity = 0.32;
  });
  // 流星（晴朗或流星雨的夜晚）
  if (meteor) {
    meteor.t += dt; const k = meteor.t / meteor.life; meteor.g.position.lerpVectors(meteor.a, meteor.b, Math.min(1, k));
    const o = Math.sin(Math.min(1, k) * Math.PI); meteor.g.children.forEach(c => { c.material.opacity = o; });
    if (k >= 1) { removeObject(meteor.g); meteor = null; }
  } else if (night && (D.weather === 'clear' || D.weather === 'meteor') && (meteorT -= dt) <= 0) {
    meteorT = D.weather === 'meteor' ? 0.8 + Math.random() * 2.2 : 9 + Math.random() * 14; spawnMeteor();
  }
}

/* ---------- 場景 ---------- */
function build() {
  const R = SIZES[D.size].R; sc = new THREE.Scene();
  sky = new THREE.Color('#cfe6ff'); sc.background = sky; sc.fog = new THREE.Fog(sky, R + 18, R + 70);
  // 天空的漸層球：天頂深、靠地平線淺（原本一整片同一個顏色，和海面分不出地平線）；顏色在 lighting() 依時間更新
  dome = new THREE.Mesh(ownGeo(new THREE.SphereGeometry(400, 32, 16)), ownMat(new THREE.ShaderMaterial({ uniforms: DOME, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float vY; void main() { vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float vY; void main() { gl_FragColor = vec4(mix(bot, top, smoothstep(-0.02, 0.5, vY)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' })));
  dome.renderOrder = -10; dome.frustumCulled = false; sc.add(dome);
  hemi = new THREE.HemisphereLight('#e8f0ff', '#8ab868', 1.15); sc.add(hemi);
  sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(8, 16, 6); sun.castShadow = true; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -R - 4, right: R + 4, top: R + 4, bottom: -R - 4 }); sc.add(sun, sun.target);
  sea = new THREE.Mesh(ownGeo(new THREE.CircleGeometry(R + 80, 64)), bend(ownMat(new THREE.MeshStandardMaterial({ color: '#7fd8e8', roughness: 0.15, transparent: true, opacity: 0.85 })), 'water')); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.05; sc.add(sea);
  terMesh = waterMesh = falls = null; buildTerrain();
  // 夢境的氣氛：慢慢飄動的柔和光點
  const N = 160, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, d = Math.random() * (R + 6); pos.set([Math.cos(a) * d, 0.5 + Math.random() * 5, Math.sin(a) * d], i * 3); }
  const pg = ownGeo(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sparkle = new THREE.Points(pg, ownMat(new THREE.PointsMaterial({ map: glowTex(), color: '#fff6c8', size: 0.2, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }))); sc.add(sparkle);   // v8.7 圓形柔光（以前沒有貼圖，是一顆顆小方塊）
  // 雨與雪
  const RN = 600, rp = new Float32Array(RN * 3); for (let i = 0; i < RN; i++) rp.set([(Math.random() - 0.5) * 40, Math.random() * 14, (Math.random() - 0.5) * 40], i * 3);
  const rg = ownGeo(new THREE.BufferGeometry()); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  rain = new THREE.Points(rg, ownMat(new THREE.PointsMaterial({ color: '#dfefff', size: 0.09, transparent: true, opacity: 0.8, depthWrite: false }))); rain.visible = false; sc.add(rain);
  buildAmbient(R);
  objs = new THREE.Group(); sc.add(objs);
  (D.items || []).forEach(addMesh);
  sc.traverse(o => { o.frustumCulled = false; });
}
function addMesh(it) {
  const m = modelOf(it), [w, d] = footOf(it);
  m.position.set(it.x + (w % 2 ? 0 : 0.5), topOf(it.x, it.z), it.z + (d % 2 ? 0 : 0.5)); m.rotation.y = -it.r * Math.PI / 2;
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  m.userData.item = it; objs.add(m); meshOf.set(it, m);
}
function spawnDwellers() {
  dwellers.forEach(d => { setSit(d.m, false); lookAt(d.m, null); setExpr(d.m, null); sc.remove(d.m); }); dwellers.length = 0;
  (D.villagers || []).forEach(sid => {
    const v = ctx.villagers().find(x => x.sid === sid); if (!v) return;
    if (!dwModels.has(sid)) { const m = chibi(v); m.traverse(o => { o.frustumCulled = false; }); actors.dress(m, v.sid); dwModels.set(sid, m); }
    const m = dwModels.get(sid); setSit(m, false); lookAt(m, null); setExpr(m, null); const a = Math.random() * 6.28, r = Math.random() * SIZES[D.size].R * 0.6;
    const x = Math.cos(a) * r, z = Math.sin(a) * r; m.position.set(x, groundY(x, z), z); sc.add(m); dwellers.push({ v, m, target: null, wait: Math.random() * 3 });
  });
}

/* ---------- 夢之碎片：每座夢境島每天 5 個，有的在最高的懸崖上、有的飄在河面或半空（要跳起來拿） ---------- */
const shardGeo = new THREE.OctahedronGeometry(0.2, 0), shardMat = new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffcf5a', emissiveIntensity: 1.3, roughness: 0.25, metalness: 0.1 });
let shardMeshes = [];
const shards = () => S().dreamShard || 0;
function addShard(n, why) { const s = S(); s.dreamShard = (s.dreamShard || 0) + n; save(); hudPaint(); ui.toast(`✦ ${why}：夢之碎片 +${n}（共 ${s.dreamShard} 個）`); Audio.sfx('catch'); }
function layoutShards() {
  const today = dayKey(); if (D.shardDay === today && Array.isArray(D.shards)) return;
  D.shardDay = today; D.shards = [];
  const R = SIZES[D.size].R, cells = [];
  for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) { if (Math.hypot(x, z) > R - 1.2) continue; const c = cellAt(x, z); if ((c.t === 'g' || c.t === 'w') && !itemsOn(x, z).some(solid)) cells.push([x, z, c]); }
  const g = cells.filter(e => e[2].t === 'g'), top = g.reduce((m, e) => Math.max(m, e[2].lv), 0);
  const take = arr => arr.length ? arr.splice(Math.floor(Math.random() * arr.length), 1)[0] : null;
  const highs = top > 0 ? g.filter(e => e[2].lv === top) : [], waters = cells.filter(e => e[2].t === 'w'), rest = g.filter(e => !highs.includes(e));
  const put = (e, air) => { if (e) D.shards.push([e[0], e[1], air ? 1 : 0]); };
  put(take(highs)); put(take(highs)); put(take(waters), 1);
  while (D.shards.length < 5 && (rest.length || highs.length)) put(take(rest.length ? rest : highs), Math.random() < 0.35);
  save();
}
const shardY = s => { const c = cellAt(s[0], s[1]); return (c.t === 'w' ? waterSurf(c) : groundY(s[0], s[1])) + (s[2] ? 1.55 : 0.75); };
function spawnShards() {
  shardMeshes.forEach(removeObject); shardMeshes = [];
  (D.shards || []).forEach(s => {
    const g = new THREE.Group(), m = new THREE.Mesh(shardGeo, shardMat), h = new THREE.Sprite(ownMat(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffe690', transparent: true, opacity: 0.7, depthWrite: false, blending: ADDB })));
    h.scale.set(1, 1, 1); m.scale.y = 1.4; m.castShadow = true; g.add(m, h); g.userData.s = s; sc.add(g); shardMeshes.push(g);
  });
}
function shardTick(dt, t) {
  for (let i = shardMeshes.length - 1; i >= 0; i--) {
    const g = shardMeshes[i], s = g.userData.s, y = shardY(s) + Math.sin(t * 2 + i) * 0.08;
    g.position.set(s[0], y, s[1]); g.children[0].rotation.y = t * 1.8 + i; g.children[1].material.opacity = 0.5 + Math.sin(t * 3 + i) * 0.2;
    if (Math.hypot(P.position.x - s[0], P.position.z - s[1]) < 0.7 && Math.abs(P.position.y + 0.6 - y) < 0.65) {
      removeObject(g); shardMeshes.splice(i, 1); D.shards.splice(D.shards.indexOf(s), 1); save();
      addShard(1, s[2] ? '跳起來抓到了' : '撿到了');
      if (!D.shards.length) setTimeout(() => ui.toast('今天這座夢境島的夢之碎片都收集完了，明天再來吧'), 1600);
    }
  }
}
/* ---------- 碎片數顯示 ---------- */
let hud = null, pad = null;
function hudPaint() { if (hud) hud.innerHTML = `✦ <b>${shards()}</b><small>夢之碎片${D && D.shards && D.shards.length ? `・島上還有 ${D.shards.length} 個` : ''}</small>`; }

/* ---------- 復原（Z）：每次改動前存一份快照，最多 30 步 ---------- */
const undoStack = []; let lastGroup = null, lastSnapT = 0;
const snap = () => JSON.stringify({ items: D.items || [], ter: D.ter || {}, paint: D.paint || {} });
function edit(fn, group) {
  const b = snap(); fn(); if (snap() === b) return;
  const now = performance.now();
  if (!group || group !== lastGroup || now - lastSnapT > 1500) { undoStack.push(b); if (undoStack.length > 30) undoStack.shift(); }
  lastGroup = group || null; lastSnapT = now;
}
function rebuildAll() { objs.children.slice().forEach(removeObject); meshOf.clear(); (D.items || []).forEach(addMesh); buildTerrain(); }
function undo() {
  const b = undoStack.pop(); if (!b) { ui.toast('沒有可以復原的動作'); return; }
  const o = JSON.parse(b); D.items = o.items; D.ter = o.ter; D.paint = o.paint; lastGroup = null; rebuildAll(); save(); Audio.sfx('swish');
  ui.toast(`復原了上一步${undoStack.length ? `（還可以再復原 ${undoStack.length} 步）` : ''}`);
}

/* ---------- 進入／離開 ---------- */
const DREAMY = { name: '夢中的聲音', color: '#b9a2ff', voice: 700 };
export function init(c) { ctx = c; P = c.player; }
export async function chooser() {
  const ds = dreams();
  const opts = ds.map((d, i) => d ? `夢境島 ${i + 1}：${d.name || SIZES[d.size].name + '島'}（${(d.items || []).length} 件）` : `夢境島 ${i + 1}：（空）建立新的夢境島`).concat(['刪除一座夢境島', '還是不睡了']);
  const i = await ui.ask(DREAMY, '進入深深的睡眠……要去哪一座夢境島呢？在夢裡可以自由擺放樹、花和所有家具，也能召喚島民。', opts);
  if (i === 3) { const j = await ui.ask(DREAMY, '要刪除哪一座？刪除後就回不來了。', ds.map((d, k) => d ? `夢境島 ${k + 1}` : `（空）`).concat(['取消'])); if (j >= 0 && j < 3 && ds[j]) { ds[j] = null; save(); ui.toast(`夢境島 ${j + 1} 已經消失在夢裡了`); } return false; }
  if (i < 0 || i > 2) return false;
  if (!ds[i]) {
    const k = await ui.ask(DREAMY, '要建立多大的夢境島？', ['小型（適合精緻佈置）', '中型', '大型（可以蓋整座度假村）', '取消']);
    if (k < 0 || k > 2) return false;
    ds[i] = { size: ['S', 'M', 'L'][k], name: '', items: [], hour: 12, weather: 'clear', villagers: [] }; save();
    memo.add('第一次進入夢境島', `建立了一座${SIZES[ds[i].size].name}夢境島`, { key: 'dream:first', icon: '🌙' });
  }
  ui.closeDialog(); ctx.beforeEnter && ctx.beforeEnter(); enter(i); return true;
}
function enter(i) {
  slot = i; D = dreams()[i]; Object.assign(jmp, { air: false, v: 0, n: 0, flip: 0, squash: 0, safe: null }); ui.iris(); build(); spawnDwellers(); inside = true; savedCurve = U.uCurve.value; U.uCurve.value = 0;
  D.ter = D.ter || {}; D.paint = D.paint || {}; undoStack.length = 0; pSeat = null; look = false; layoutShards(); spawnShards(); sc.add(P); { const z0 = SIZES[D.size].R - 1.5; P.position.set(0, groundY(0, z0), z0); } P.rotation.y = Math.PI; camPos.set(0, 14, SIZES[D.size].R + 12); camLook.set(0, 0.9, SIZES[D.size].R - 3);
  hud = ui.el('div', 'dream-hud'); document.body.appendChild(hud); hudPaint();
  // 觸控裝置沒有 F／R／Z／V 鍵：左上角一排按鈕（桌機不顯示）；對話、卡片或面板開著時按了不動作（以免蓋掉正在進行的對話）
  pad = ui.el('div', 'dream-pad'); document.body.appendChild(pad);
  [['🛠', '工具', () => openTools()], ['↻', '旋轉', () => { if (sel && sel.k !== 'ter') rot = (rot + 1) % 4; else ui.toast('先選一樣要擺的東西'); }], ['↶', '復原', () => undo()], ['✨', '仰望', () => setLook(!look)], ['✕', '收起', () => { if (look) setLook(false); else if (sel) { select(null); ui.toast('收起工具'); } }]]
    .forEach(([ic, n, fn]) => { const b = ui.el('button', '', `${ic}<small>${n}</small>`); b.type = 'button'; b.onclick = e => { e.stopPropagation(); if (talkLock || ui.dialogOpen() || ui.cardOpen() || ui.panelOpen()) return; fn(); }; b.addEventListener('pointerdown', e => e.stopPropagation()); pad.appendChild(b); });
  document.body.classList.add('in-trip', 'in-dream'); Audio.sfx('open');
  setTimeout(() => ui.toast(`夢境島：F 造島工具、空白鍵跳躍、V 仰望天空、Z 復原${D.shards.length ? `。島上有 ${D.shards.length} 個夢之碎片在發光` : ''}`), 900);
}
function leave() {
  ui.iris(); inside = false; U.uCurve.value = savedCurve || CURVE; document.body.classList.remove('in-trip', 'in-dream');
  clearGhost(); sel = null; meshOf.clear(); setSit(P, false); pSeat = null; look = false; if (hud) { hud.remove(); hud = null; } if (pad) { pad.remove(); pad = null; } save();
  mainScene.add(P); disposeObject(sc); if (sun && sun.shadow) sun.shadow.dispose();
  if (grassMesh) { grassMesh.dispose(); grassMesh = null; }
  sc.clear(); objs.clear(); dwellers.length = 0; shardMeshes = []; fish = []; flies = []; butterflies = []; waterCells = [];
  dome = sea = sparkle = rain = skyG = starMat = clouds = meteor = terMesh = waterMesh = falls = sun = hemi = null;
  sc = null; Audio.sfx('open'); ctx.wake();
}

/* ---------- 造島工具 ---------- */
function clearGhost() { removeObject(ghost); ghost = null; }
function select(s) { sel = s; rot = 0; clearGhost(); if (!s || s.k === 'remove') return;
  if (s.k === 'ter' || s.k === 'paint') { ghost = new THREE.Mesh(ownGeo(new THREE.BoxGeometry(1, 0.08, 1)), ownMat(new THREE.MeshBasicMaterial({ color: s.k === 'paint' ? (s.id === 'erase' ? '#ffffff' : PAINTS[s.id][1]) : { river: '#5fc8f0', cliff: '#c8945a', ramp: '#ffd36b', lower: '#ffffff' }[s.op], transparent: true, opacity: 0.55, depthWrite: false }))); sc.add(ghost); return; } ghost = modelOf(s); ghost.traverse(o => { if (o.isMesh) { o.material = ownMat(o.material.clone()); o.material.transparent = true; o.material.opacity = 0.55; o.castShadow = false; } }); sc.add(ghost); }
const front = () => { const fx = P.position.x + Math.sin(P.rotation.y) * 1.3, fz = P.position.z + Math.cos(P.rotation.y) * 1.3; return [Math.round(fx), Math.round(fz)]; };
function cellsOf(it) { const [w, d] = footOf(it), x0 = it.x - Math.floor((w - 1) / 2), z0 = it.z - Math.floor((d - 1) / 2), out = []; for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) out.push((x0 + dx) + ',' + (z0 + dz)); return out; }
function free(it) {
  const R = SIZES[D.size].R, mine = new Set(cellsOf(it));
  let lv = null;
  for (const c of mine) { const [x, z] = c.split(',').map(Number); if (Math.hypot(x, z) > R - 0.8) return false; const t = cellAt(x, z); if (t.t !== 'g' || (lv != null && lv !== t.lv)) return false; lv = t.lv; }
  // 花叢不能和任何東西重疊；其他東西只要不和花以外的東西重疊（花會被蓋過去）
  return !(D.items || []).some(o => (it.k === 'flower' || o.k !== 'flower') && cellsOf(o).some(c => mine.has(c)));
}
const facingDir = () => { const a = P.rotation.y, sx = Math.sin(a), cz = Math.cos(a); return Math.abs(sx) > Math.abs(cz) ? (sx > 0 ? 1 : 3) : (cz > 0 ? 0 : 2); };
const itemsOn = (x, z) => (D.items || []).filter(o => cellsOf(o).includes(x + ',' + z));
function terraform(op) {
  const [x, z] = front(), key = x + ',' + z, c = cellAt(x, z), R = SIZES[D.size].R;
  if (Math.hypot(x, z) > R - 0.6) { ui.toast('海邊不能改地形'); Audio.sfx('deny'); return; }
  const on = itemsOn(x, z), solidOn = on.filter(solid);
  const set = v => { if (v === 0) delete D.ter[key]; else D.ter[key] = v; };
  if (op === 'river') {
    if (c.t === 'w') { ui.toast('這裡已經是水了'); return; }
    if (c.t !== 'g') { ui.toast('斜坡上不能挖河，先把它填平'); Audio.sfx('deny'); return; }
    if (on.length) { ui.toast('先把這格上的東西拆掉，才能挖河'); Audio.sfx('deny'); return; }
    set('w' + c.lv); if (D.paint) delete D.paint[key]; Audio.sfx('dig');
  } else if (op === 'cliff') {
    if (c.t !== 'g') { ui.toast(c.t === 'w' ? '水上不能蓋懸崖，先填平' : '斜坡不能再加高'); Audio.sfx('deny'); return; }
    if (c.lv >= TOP) { ui.toast(`懸崖最多 ${TOP} 層`); Audio.sfx('deny'); return; }
    if (Math.hypot(x - P.position.x, z - P.position.z) < 0.6) { ui.toast('站在上面不能加高'); return; }
    set(c.lv + 1); Audio.sfx('dig');
  } else if (op === 'lower') {
    if (c.t === 'w' || c.t === 'r') set(c.lv || 0);
    else if (c.lv > 0) set(c.lv - 1);
    else { ui.toast('這裡已經是平地了'); return; }
    Audio.sfx('swish');
  } else if (op === 'ramp') {
    const dir = facingDir(), [dx, dz] = DIRS[dir], nb = cellAt(x + dx, z + dz), far = cellAt(x + dx * 2, z + dz * 2);
    if (c.t !== 'g' || c.lv >= TOP) { ui.toast('斜坡要蓋在最高層以下的草地上'); Audio.sfx('deny'); return; }
    if (solidOn.length) { ui.toast('先把這格上的東西拆掉'); Audio.sfx('deny'); return; }
    if (nb.t === 'g' && nb.lv === c.lv + 1) { set('r' + dir + c.lv); Audio.sfx('dig'); }
    else if (nb.t === 'g' && nb.lv === c.lv + 2) {
      // 高兩層：把懸崖切出一道缺口，做成兩格長、一格升一層的斜坡
      const nk = (x + dx) + ',' + (z + dz);
      if (!(far.t === 'g' && far.lv === c.lv + 2)) { ui.toast('高兩層的斜坡會切進懸崖一格，懸崖要再往裡多一格同高的地面'); Audio.sfx('deny'); return; }
      if (Math.hypot(x + dx, z + dz) > R - 0.6) { ui.toast('海邊不能改地形'); Audio.sfx('deny'); return; }
      const onN = itemsOn(x + dx, z + dz);
      if (onN.some(solid)) { ui.toast('懸崖上的那一格有東西，先拆掉'); Audio.sfx('deny'); return; }
      onN.forEach(o => { D.items.splice(D.items.indexOf(o), 1); if (meshOf.has(o)) { removeObject(meshOf.get(o)); meshOf.delete(o); } });
      set('r' + dir + c.lv); D.ter[nk] = 'r' + dir + (c.lv + 1); Audio.sfx('dig'); ui.toast('切出了兩格長的斜坡');
    } else { ui.toast('斜坡的另一端要接到高一層或高兩層的懸崖（面向懸崖使用）'); Audio.sfx('deny'); return; }
  }
  // 格子上的花或地墊跟著新的高度；不能留在水裡或斜坡上的就收掉
  on.forEach(o => { const t = cellAt(x, z); if (t.t !== 'g') { D.items.splice(D.items.indexOf(o), 1); if (meshOf.has(o)) { removeObject(meshOf.get(o)); meshOf.delete(o); } } else if (meshOf.has(o)) meshOf.get(o).position.y = topOf(o.x, o.z); });
  buildTerrain(); save();
}
function paintCell(x, z, quiet) {
  const c = cellAt(x, z), k = x + ',' + z; D.paint = D.paint || {};
  if (c.t !== 'g') { if (!quiet) { ui.toast('小路要鋪在草地上'); Audio.sfx('deny'); } return; }
  if (sel.id === 'erase') { if (!D.paint[k]) { if (!quiet) ui.toast('這裡沒有小路'); return; } delete D.paint[k]; }
  else { if (D.paint[k] === sel.id) return; D.paint[k] = sel.id; }
  buildTerrain(); save(); Audio.sfx(quiet ? 'step' : 'dig');
}
const paintFront = () => { const [x, z] = front(); paintCell(x, z, false); };
function placeSel() {
  const [x, z] = front(), it = Object.assign({}, sel, { x, z, r: rot }); delete it.name;
  if (!free(it)) { ui.toast('這裡放不下'); Audio.sfx('deny'); return; }
  if ((D.items || []).length >= 400) { ui.toast('夢境島已經放滿了（最多 400 件）'); return; }
  D.items.push(it); addMesh(it); buildGrass(); save(); Audio.sfx('pop');
}
function removeFront() {
  const [x, z] = front(), key = x + ',' + z, it = (D.items || []).slice().reverse().find(o => cellsOf(o).includes(key));
  if (!it) { ui.toast('面前沒有東西可以拆'); return; }
  D.items.splice(D.items.indexOf(it), 1); if (meshOf.has(it)) { removeObject(meshOf.get(it)); meshOf.delete(it); } buildGrass(); save(); Audio.sfx('swish');
}
export function openTools() {
  const body = ui.el('div', 'dream-tools'), sec = (t) => { const s = ui.el('div', 'dt-sec', `<b>${t}</b>`); const g = ui.el('div', 'dt-grid'); s.appendChild(g); body.appendChild(s); return g; };
  const btn = (g, html, on, active) => { const b = ui.el('button', 'dt-btn' + (active ? ' on' : ''), html); b.type = 'button'; b.onclick = on; g.appendChild(b); return b; };
  const pickTool = s => { ui.closePanel(); select(s); ui.toast(s.k === 'remove' ? '拆除模式：對著東西按 E（或 X）拆掉' : s.k === 'ter' ? `${s.name}：對著面前的格子按 E${s.op === 'ramp' ? '（面向高一層或高兩層的懸崖）' : ''}、Esc 收起工具` : s.k === 'paint' ? `${s.name}：走過的格子會${s.id === 'erase' ? '擦掉小路' : '鋪上小路'}，E 處理面前一格，Z 復原、Esc 收起` : `${s.name}：E 擺在面前、R 旋轉、Esc 收起工具`); };
  const terG = sec('地形（夢裡的工程不用錢）');
  [['river', '🌊', '挖河'], ['cliff', '⛰', '蓋懸崖'], ['ramp', '↗', '斜坡'], ['lower', '⬇', '降低／填平']].forEach(([op, ic, n]) => btn(terG, `${AIC(ic)}<small>${n}</small>`, () => pickTool({ k: 'ter', op, name: n }), sel && sel.k === 'ter' && sel.op === op));
  const pg = sec('小路（選好後邊走邊鋪）');
  Object.entries(PAINTS).forEach(([id, [n, c]]) => btn(pg, `<i class="dt-dot dt-sq" style="background:${c}"></i><small>${n}</small>`, () => pickTool({ k: 'paint', id, name: n }), sel && sel.k === 'paint' && sel.id === id));
  btn(pg, `${AIC('🧽')}<small>擦掉小路</small>`, () => pickTool({ k: 'paint', id: 'erase', name: '擦掉小路' }), sel && sel.k === 'paint' && sel.id === 'erase');
  const tg = sec('樹木（同一種樹可以選小樹、中樹、大樹）');
  Object.entries(TREES).forEach(([id, n]) => [0, 1, 2].forEach(gr => btn(tg, `${AIC(['🌱', 'tree_m', 'tree_l'][gr], '🌳')}<small>${n}${['・小', '・中', ''][gr]}</small>`, () => pickTool({ k: 'tree', id, g: gr, name: n }))));
  const fg = sec('花');
  FLOWERS.forEach(c => btn(fg, `<i class="dt-dot" style="background:${c}"></i><small>花叢</small>`, () => pickTool({ k: 'flower', c, name: '花叢' })));
  const og = sec('戶外');
  Object.entries(OUTDOOR).forEach(([id, n]) => btn(og, `<small>${n}</small>`, () => pickTool({ k: 'out', id, name: n })));
  btn(og, `${AIC('🧹')}<small>拆除工具</small>`, () => pickTool({ k: 'remove' }));
  const furnG = sec('家具（夢裡的家具不用錢）');
  const dfs = (I.FURNITURE || []).filter(f => f.src === 'dream');
  if (dfs.length) {
    const un = S().dreamUnlock || [], dg = sec(`夢幻家具（✦ 夢之碎片 ${shards()} 個；解鎖後夢裡無限擺放，也會送一件到家裡）`);
    dfs.forEach(f => { const own = un.includes(f.id), b = btn(dg, `<img data-thumb="${f.id}" alt="">${own ? '' : `<em class="dt-cost">✦${f.shard}</em>`}`, () => own ? pickTool({ k: 'furn', id: f.id, name: f.name }) : unlock(f)); b.dataset.tip = f.name + (own ? '' : `（${f.shard} 個碎片解鎖）`); if (!own) b.classList.add('locked'); });
  }
  (I.FURNITURE || []).filter(f => !String(f.src).startsWith('hotel-fixed') && f.src !== 'dream').forEach(f => { const b = btn(furnG, `<img data-thumb="${f.id}" alt="">`, () => pickTool({ k: 'furn', id: f.id, name: f.name })); b.dataset.tip = f.name; });
  const vg = sec(`召喚島民（${(D.villagers || []).length} / 10）`);
  ctx.villagers().forEach(v => btn(vg, `<i class="dt-dot" style="background:${v.color}"></i><small>${ui.esc(v.name)}</small>`, () => {
    D.villagers = D.villagers || []; const i = D.villagers.indexOf(v.sid);
    if (i >= 0) D.villagers.splice(i, 1); else if (D.villagers.length < 10) D.villagers.push(v.sid); else { ui.toast('最多召喚 10 位'); return; }
    save(); spawnDwellers(); openTools();
  }, (D.villagers || []).includes(v.sid)));
  const env = sec('時間與天氣');
  const sl = ui.el('label', 'dt-time', `<span>時間 <b>${Math.floor(D.hour)}:00</b></span><input type="range" min="0" max="23.5" step="0.5" value="${D.hour}">`);
  sl.querySelector('input').oninput = e => { D.hour = +e.target.value; sl.querySelector('b').textContent = Math.floor(D.hour) + ':' + (D.hour % 1 ? '30' : '00'); save(); };
  env.appendChild(sl);
  [['clear', '☀ 晴'], ['rain', '🌧 雨'], ['snow', '❄ 雪'], ['petal', '🌸 花瓣雨'], ['meteor', '🌠 流星雨']].forEach(([w, n]) => btn(env, `<small>${n}</small>`, () => { D.weather = w; save(); openTools(); if (w === 'meteor') ui.toast(lastNight ? '流星雨開始了！按 V 仰望天空，看到流星時按 E 許願' : '流星雨要到晚上才看得到：把時間調到 20 點以後，再按 V 仰望天空'); }, D.weather === w));
  btn(env, '<small>🔭 仰望天空（V）</small>', () => { ui.closePanel(); setLook(true); });
  const isl = sec('夢境島');
  btn(isl, '<small>✏️ 取名字</small>', async () => { ui.closePanel(); const n = prompt('幫這座夢境島取個名字（最多 10 個字）', D.name || ''); if (n != null) { D.name = n.trim().slice(0, 10); save(); } });
  btn(isl, '<small>🌟 夢境評價</small>', () => { ui.closePanel(); rating(); });
  btn(isl, `<small>↶ 復原（Z）${undoStack.length ? '・' + undoStack.length : ''}</small>`, () => { undo(); openTools(); });
  btn(isl, '<small>🗑 清空島上</small>', () => { if (!confirm('要把這座夢境島上的東西全部清掉嗎？（可以用 Z 復原）')) return; edit(() => { D.items.forEach(it => meshOf.has(it) && removeObject(meshOf.get(it))); meshOf.clear(); D.items = []; save(); }); ui.toast('夢境島清空了'); });
  btn(isl, '<small>🏝 地形重來</small>', () => { if (!confirm('要把地形恢復成一整片平地嗎？（擺設會保留在原本的位置，可以用 Z 復原）')) return; undoStack.push(snap()); D.ter = {}; buildTerrain(); D.items.forEach(it => meshOf.has(it) && (meshOf.get(it).position.y = topOf(it.x, it.z))); save(); ui.toast('地形恢復成平地了'); });
  btn(isl, '<small>☀ 醒來</small>', () => { ui.closePanel(); leave(); });
  ui.panel(`${D.name || SIZES[D.size].name + '夢境島'}・造島工具`, body, { cls: 'dream-p' }); loadThumbs(body);
}
function unlock(f) {
  if (shards() < f.shard) { ui.toast(`還需要 ${f.shard - shards()} 個夢之碎片（每天在夢境島上撿、或對流星許願）`); Audio.sfx('deny'); return; }
  if (!confirm(`用 ${f.shard} 個夢之碎片解鎖「${f.name}」嗎？\n解鎖後在夢裡可以無限擺放，也會送一件到家裡的收納。`)) return;
  const s = S(); s.dreamShard -= f.shard; s.dreamUnlock = (s.dreamUnlock || []).concat(f.id); ctx.addStorage && ctx.addStorage(f.id, 1); save(); hudPaint();
  Audio.sfx('catch'); ui.toast(`解鎖了「${f.name}」！家裡的收納也多了一件`);
  memo.add('夢幻家具', `用夢之碎片解鎖了「${f.name}」`, { key: 'dream:unlock:first', icon: '✦' });
  openTools();
}

/* ---------- 夢境評價 ---------- */
function rate() {
  const it = D.items || [], trees = it.filter(o => o.k === 'tree'), fl = it.filter(o => o.k === 'flower'), fu = it.filter(o => o.k === 'furn'), outs = it.filter(o => o.k === 'out' && o.id !== 'stone');
  const ter = Object.values(D.ter || {}), paths = Object.keys(D.paint || {}).filter(k => { const [x, z] = k.split(',').map(Number); return cellAt(x, z).t === 'g'; }).length;
  const parts = [
    [trees.length >= 5, 1, '多種幾棵樹，讓島嶼有層次'],
    [new Set(trees.map(o => o.id)).size >= 3, 0.75, '混搭三種以上的樹（櫻花、杉樹、椰子樹……）'],
    [fl.length >= 8, 1, '種一片花叢，島會更有色彩'],
    [new Set(fl.map(o => o.c)).size >= 3, 0.5, '試試三種以上顏色的花'],
    [fu.length >= 6, 1, '擺幾件家具，佈置出可以停留的角落'],
    [fu.filter(o => (furn(o.id) || {}).src === 'dream').length >= 2, 0.75, '用夢之碎片解鎖夢幻家具，擺兩件在島上'],
    [outs.length >= 3, 0.5, '加上長椅、路燈或柵欄這類戶外擺設'],
    [ter.some(v => typeof v === 'number'), 0.5, '蓋一座懸崖，讓地形有高低起伏'],
    [ter.some(v => typeof v === 'string' && v[0] === 'w'), 0.5, '挖一條小河'],
    [fallCount > 0, 0.5, '讓高處的河緊鄰低處的河，做出瀑布'],
    [ter.some(v => typeof v === 'string' && v[0] === 'r'), 0.25, '蓋一道斜坡連接上下層'],
    [paths >= 12, 1, '用小路工具鋪出散步的路線'],
    [(D.villagers || []).length >= 3, 0.5, '召喚三位以上的島民來夢裡散步']
  ];
  const score = parts.reduce((a, p) => a + (p[0] ? p[1] : 0), 0), stars = Math.max(1, Math.min(5, 1 + Math.floor(score / 1.7)));
  return { stars, tips: parts.filter(p => !p[0]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(p => p[2]) };
}
async function rating() {
  const r = rate(), st = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars), nm = D.name || SIZES[D.size].name + '夢境島';
  const say = ['還是一片安靜的夢，什麼都還沒開始呢。', '夢的輪廓慢慢浮現了。', '已經是一座讓人想多待一會兒的島了。', '好美的夢！島民們一定捨不得醒來。', '這是我見過最美的夢境島……簡直不想醒來了。'][r.stars - 1];
  talkLock = true;
  try {
    await ui.say(DREAMY, `「${nm}」的夢境評價是……${st}！${say}`);
    const best = D.best || 0;
    if (r.stars > best) { const n = (r.stars - best) * 3; D.best = r.stars; save(); await ui.say(DREAMY, `第一次達到 ${r.stars} 顆星，送你 ${n} 個夢之碎片。`); addShard(n, '夢境評價'); }
    if (r.stars === 5) memo.add('五星夢境島', `「${nm}」得到了五顆星的夢境評價`, { key: 'dream:5star', icon: '🌟' });
    await ui.say(DREAMY, r.tips.length ? `想讓島更美的話，可以試試：${r.tips.join('；')}。` : '每一個角落都很用心，已經是完美的夢境島了！');
  } finally { ui.closeDialog(); talkLock = false; }
}

/* ---------- 仰望天空與許願 ---------- */
let look = false, lastWish = -99, lastTrick = -99, lastNight = false, talkLock = false;
const camLook = new THREE.Vector3(), camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3();
function setLook(on) {
  if (on === look) return; look = on; if (on) { clearGhost(); sel = null; ui.toast(lastNight ? '抬頭看夜空……看到流星劃過時按 E 許願（V 或移動回到原本視角）' : '抬頭看天空（晚上會有星星和流星；V 或移動回到原本視角）'); }
}
function wish() {
  if (!meteor || meteor.wished) return; meteor.wished = true; lastWish = performance.now() / 1000;
  const s = S(), day = dayKey(); if (!s.dreamWish || s.dreamWish.day !== day) s.dreamWish = { day, n: 0 };
  setExpr(P, 'happy', 2);
  if (s.dreamWish.n >= 5) { ui.toast('🌠 許了願！（今天從流星得到的碎片已經到上限了）'); Audio.sfx('pop'); return; }
  s.dreamWish.n++; addShard(1, '對流星許願');
  memo.add('對流星許願', '在夢境島的夜空下，對流星許了一個願望', { key: 'dream:wish', icon: '🌠' });
}

/* ---------- 坐下：長椅、沙發等座位（玩家與島民） ---------- */
let pSeat = null;
const isSeat = o => (o.k === 'out' && o.id === 'bench') || (o.k === 'furn' && (furn(o.id) || {}).cat === 'seat');
const seatTaken = o => pSeat === o || dwellers.some(d => d.seat === o);
function seatPose(o) { const m = meshOf.get(o); if (!m) return null; const ry = m.rotation.y; return { x: m.position.x, z: m.position.z, y: m.position.y + (o.k === 'out' ? 0.17 : 0.13), ry, fx: Math.sin(ry), fz: Math.cos(ry) }; }
const nearSeat = () => (D.items || []).find(o => isSeat(o) && !seatTaken(o) && meshOf.has(o) && Math.hypot(meshOf.get(o).position.x - P.position.x, meshOf.get(o).position.z - P.position.z) < 1.3 && Math.abs(meshOf.get(o).position.y - P.position.y) < 0.5);
function sitDown(o) { const s = seatPose(o); if (!s) return; pSeat = o; P.position.set(s.x, s.y, s.z); P.rotation.y = s.ry; setSit(P, true); Audio.sfx('step'); }
function standUp() { const s = pSeat && seatPose(pSeat); setSit(P, false); pSeat = null; if (s) P.position.set(s.x + s.fx * 0.85, groundY(s.x + s.fx * 0.85, s.z + s.fz * 0.85), s.z + s.fz * 0.85); }

/* ---------- 島民的台詞：依天氣、時間、所在位置與島的樣子挑情境 ---------- */
const FALLBACK = ['這裡……好像在做夢一樣。', '夢裡的島好漂亮，是你佈置的嗎？', '如果醒來也是這個樣子就好了！', '我在夢裡也有在背單字喔！', '這座島的名字叫什麼呀？'];
function dreamLine(d) {
  const L = (I.DREAMLINES || {})[d.v.sid]; if (!L) return pick(FALLBACK);
  const now = performance.now() / 1000, m = d.m, cx = Math.round(m.position.x), cz = Math.round(m.position.z), ks = ['any', 'any'];
  if (d.seat) ks.push('bench', 'bench', 'bench');
  if (now - lastWish < 30) ks.push('wish', 'wish', 'wish', 'wish');
  if (now - lastTrick < 10) ks.push('jump', 'jump', 'jump', 'jump');
  if (['rain', 'snow', 'petal'].includes(D.weather)) ks.push(D.weather, D.weather);
  if (lastNight) { ks.push('night'); if (D.weather === 'meteor') ks.push('meteor', 'meteor'); }
  if (waterCells.some(([x, z]) => Math.abs(x - cx) <= 2 && Math.abs(z - cz) <= 2)) ks.push('water');
  { const c = cellAt(cx, cz); if (c.lv >= 2) ks.push('high', 'high'); }
  if ((D.items || []).filter(o => o.k === 'flower' && Math.hypot(o.x - cx, o.z - cz) < 3.2).length >= 3) ks.push('flowers');
  const n = (D.items || []).length; if (n < 10) ks.push('sparse'); else if (n >= 60) ks.push('rich');
  const k = pick(ks.filter(k => L[k] && L[k].length)) || 'any';
  return pick(L[k] || FALLBACK).replace(/\{island\}/g, D.name || SIZES[D.size].name + '夢境島');
}
export function key(e) {
  if (!inside) return false;
  if (e.code === 'KeyF') { openTools(); return true; }
  if (e.code === 'KeyR' && sel && sel.k !== 'ter') { rot = (rot + 1) % 4; return true; }
  if (e.code === 'KeyX') { edit(removeFront); return true; }
  if (e.code === 'KeyZ') { undo(); return true; }
  if (e.code === 'KeyV') { setLook(!look); return true; }
  if (e.code === 'Escape' && look) { setLook(false); return true; }
  if (e.code === 'Escape' && sel) { select(null); ui.toast('收起工具'); return true; }
  return false;
}
const nearDweller = () => dwellers.find(d => Math.hypot(d.m.position.x - P.position.x, d.m.position.z - P.position.z) < 1.5);
export function hint() {
  if (look) return meteor && !meteor.wished ? '🌠 對流星許願' : lastNight ? '等待流星劃過……' : touch() ? '按「✕ 收起」回到原本視角' : 'V 回到原本視角';
  if (pSeat) return '移動就會站起來';
  if (sel) return sel.k === 'remove' ? '拆掉面前的東西' : sel.k === 'ter' || sel.k === 'paint' ? sel.name : `擺放${sel.name}`;
  const d = nearDweller(); if (d) return `和${d.v.name}說話`;
  return nearSeat() ? '坐下來休息' : touch() ? '造島工具' : 'F 打開造島工具';
}
const touch = () => matchMedia('(pointer: coarse)').matches;   // 觸控裝置：提示不提鍵盤
export function handler() {
  if (talkLock) return null;
  if (look) return () => { if (meteor && !meteor.wished) wish(); else ui.toast(lastNight ? '還沒有流星……再等一下' : '白天看不到流星，晚上再來吧'); };
  if (pSeat) return null;
  if (sel) return () => edit(() => (sel.k === 'remove' ? removeFront() : sel.k === 'ter' ? terraform(sel.op) : sel.k === 'paint' ? paintFront() : placeSel()));
  const d = nearDweller(); if (d) return async () => { await ui.say({ name: d.v.name, color: d.v.color, voice: d.v.voice || 400 }, dreamLine(d)); ui.closeDialog(); };
  const st = nearSeat(); if (st) return () => sitDown(st);
  return () => openTools();   // 附近沒有東西可互動：「動作」（E）直接打開造島工具
}

/* ---------- 跳躍：空白鍵（手機「跳」鈕），和主島一樣落地前最多三段跳 ---------- */
const JV = [6.4, 6.0, 7.4], GRAV = 22, jmp = { air: false, v: 0, n: 0, flip: 0, squash: 0, safe: null };
export const inAir = () => jmp.air;
export function jump() {
  if (!inside || look || jmp.n >= 3) return;
  if (pSeat) { standUp(); return; }
  jmp.air = true; jmp.n++; jmp.v = JV[jmp.n - 1];
  if (jmp.n === 3) { jmp.flip = 0.0001; lastTrick = performance.now() / 1000; dwellers.forEach(d => { if (Math.hypot(d.m.position.x - P.position.x, d.m.position.z - P.position.z) < 6) setExpr(d.m, 'happy', 1.6); }); }
  Audio.sfx(jmp.n === 1 ? 'swish' : jmp.n === 2 ? 'pop' : 'catch');
}
/** 高度：地面上貼著地走（走出崖邊會開始落下），空中受重力；落進河裡會回到上一個站穩的地方。回傳是否在空中 */
function jumpTick(dt) {
  const p = P.position, c = cellAt(Math.round(p.x), Math.round(p.z)), gy = groundY(p.x, p.z);
  if (!jmp.air) {
    if (gy < p.y - 0.3) { jmp.air = true; jmp.v = 0; }
    else { p.y = gy; if (c.t !== 'w') jmp.safe = [p.x, p.z]; return false; }
  }
  jmp.v -= GRAV * dt; p.y += jmp.v * dt;
  if (jmp.flip) jmp.flip = Math.min(1, jmp.flip + dt * 1.9);
  const floor = c.t === 'w' ? waterSurf(c) : gy;
  if (jmp.v < 0 && p.y <= floor) {   // 落地
    jmp.v = 0; jmp.flip = 0; jmp.air = false; jmp.squash = jmp.n >= 2 ? 0.35 : 0.22; jmp.n = 0;
    if (c.t === 'w') {
      Audio.sfx('plop'); ui.toast('撲通！掉進河裡了，回到岸上');
      const s = jmp.safe || [0, SIZES[D.size].R - 1.5]; p.set(s[0], groundY(s[0], s[1]), s[1]);
    } else { p.y = gy; Audio.sfx('step'); }
    return false;
  }
  return true;
}
/** 空中姿勢：舉手、縮腿；第三跳繞身體中心前空翻；落地時壓扁一下 */
function jumpPose(dt) {
  const u = P.userData, b = u.body; if (!b) return;
  if (jmp.air) {
    if (u.arms) u.arms[0].rotation.x = u.arms[1].rotation.x = -2.5; if (u.legs) { u.legs[0].rotation.x = 0.5; u.legs[1].rotation.x = -0.3; }
    const a = jmp.flip ? jmp.flip * Math.PI * 2 : 0, r = 0.55;
    b.rotation.x = a; b.position.y += r - r * Math.cos(a); b.position.z = -r * Math.sin(a);
  } else { b.rotation.x = 0; b.position.z = 0; }
  jmp.squash = Math.max(0, jmp.squash - dt * 2.2);
  const k = Math.sin(jmp.squash / 0.35 * Math.PI) * 0.18; b.scale.set(1 + k * 0.6, 1 - k, 1 + k * 0.6);
}

/* ---------- 每幀 ---------- */
const SKY = [[0, '#1d2a55', '#9fb4ff', 0.5, 0.65], [5, '#4a4a80', '#b0c0ff', 0.7, 0.7], [6.5, '#ffc8a0', '#ffcf9a', 1.5, 0.9], [9, '#78bcff', '#fff2dc', 2.6, 1.0], [16, '#82c2ff', '#fff0d6', 2.5, 0.95], [17.5, '#ffd6a0', '#ffb860', 2.0, 0.85], [19, '#d8909a', '#ff8a5a', 1.2, 0.75], [20.5, '#24386e', '#c8b0ff', 0.6, 0.7], [24, '#1d2a55', '#9fb4ff', 0.5, 0.65]];
const ca = new THREE.Color(), cb = new THREE.Color();
function lighting(h) {
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const A = SKY[i], B = SKY[i + 1], k = (h - A[0]) / (B[0] - A[0]);
  sky.copy(ca.set(A[1]).lerp(cb.set(B[1]), k));
  DOME.top.value.copy(sky).multiplyScalar(0.72); DOME.bot.value.copy(sky).lerp(WHITE, 0.28); sc.fog.color.copy(DOME.bot.value);   // 天頂深一點、地平線淺一點，霧用地平線的顏色
  sun.color.copy(ca.set(A[2]).lerp(cb.set(B[2]), k)); sun.intensity = A[3] + (B[3] - A[3]) * k; hemi.intensity = A[4] + (B[4] - A[4]) * k;
  const t = Math.max(0, Math.min(1, (h - 6) / 13)), night = h < 6 || h > 19.5;
  sun.position.set(Math.cos(t * Math.PI) * 14, Math.sin(t * Math.PI) * 14 + 3, 8); sun.target.position.set(0, 0, 0);
  sea.material.color.set(night ? '#2e5f8a' : '#7fd8e8');
  objs.children.forEach(o => { if (o.userData.head) o.userData.head.material.emissiveIntensity = night ? 1.6 : 0.2; });
  return night;
}
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  const R = SIZES[D.size].R;
  if (look && moving && !locked) setLook(false);
  if (pSeat) { if (moving && !locked) standUp(); else moving = false; }
  if (look) moving = false;
  if (moving && !locked) {
    ix /= len; iz /= len; const sp = run ? 4.8 : 2.8 * (0.3 + 0.7 * Math.min(1, len)), nx = P.position.x + ix * sp * dt, nz = P.position.z + iz * sp * dt;
    const c = Math.round(nx) + ',' + Math.round(nz), hit = (D.items || []).some(o => solid(o) && cellsOf(o).includes(c) && Math.hypot(o.x - nx, o.z - nz) < 0.75);
    // 地面上只能走上 0.3 以內的高低差（懸崖要走斜坡）；空中只要腳比地面高就能越過去，也能飛越河面
    const tc = cellAt(Math.round(nx), Math.round(nz)), up = groundY(nx, nz) > P.position.y + (jmp.air ? 0.05 : 0.3);
    if (Math.hypot(nx, nz) < R + 0.9 && !hit && tc.t !== 'sea' && (jmp.air || tc.t !== 'w') && !up) { P.position.x = nx; P.position.z = nz; }
    P.rotation.y = Math.atan2(ix, iz);
  }
  const air = pSeat ? false : jumpTick(dt);
  animate(P, dt, moving && !locked && !air ? (run ? 2 : 1) : 0, t); jumpPose(dt);
  // 小路工具：走過的格子自動鋪上（同一段路合成一步復原）
  if (sel && sel.k === 'paint' && moving && !locked && !air) {
    const x = Math.round(P.position.x), z = Math.round(P.position.z), k = x + ',' + z;
    if (cellAt(x, z).t === 'g' && (D.paint || {})[k] !== (sel.id === 'erase' ? undefined : sel.id)) edit(() => paintCell(x, z, true), 'walk');
  }
  if (ghost && sel && (sel.k === 'ter' || sel.k === 'paint')) { const [x, z] = front(), c = cellAt(x, z); ghost.position.set(x, (c.t === 'w' ? waterSurf(c) : groundY(x, z)) + 0.06, z); }
  else if (ghost) { const [x, z] = front(), it = Object.assign({}, sel, { x, z, r: rot }), [w, d] = footOf(it); ghost.position.set(x + (w % 2 ? 0 : 0.5), topOf(x, z) + 0.03, z + (d % 2 ? 0 : 0.5)); ghost.rotation.y = -rot * Math.PI / 2; const ok = free(it); ghost.traverse(o => { if (o.isMesh) { o.material.emissive = new THREE.Color(ok ? '#000000' : '#ff3030'); o.material.emissiveIntensity = ok ? 0 : 0.5; } }); }
  // 島民散步；偶爾走到空著的長椅或沙發坐一會兒
  const seats = (D.items || []).filter(o => isSeat(o) && meshOf.has(o));
  dwellers.forEach(dw => {
    const m = dw.m, dp = Math.hypot(P.position.x - m.position.x, P.position.z - m.position.z); let mv = 0;
    if (dw.seat) {
      dw.sitT -= dt; const s = seatPose(dw.seat);
      if (!s || dw.sitT <= 0 || !(D.items || []).includes(dw.seat)) { setSit(m, false); if (s) m.position.set(s.x + s.fx * 0.85, groundY(s.x + s.fx * 0.85, s.z + s.fz * 0.85), s.z + s.fz * 0.85); dw.seat = null; dw.wait = 2; }
      else { m.position.set(s.x, s.y, s.z); m.rotation.y = s.ry; lookAt(m, dp < 3 ? P.position.clone().setY(P.position.y + 1.1) : null); }
    } else if (dp < 2) { m.rotation.y = Math.atan2(P.position.x - m.position.x, P.position.z - m.position.z); lookAt(m, P.position.clone().setY(P.position.y + 1.1)); }
    else {
      dw.wait -= dt;
      if (dw.wait <= 0 || !dw.target) {
        const open = seats.filter(o => !seatTaken(o) && dwellers.every(o2 => o2.goSeat !== o));
        if (open.length && Math.random() < 0.3) { dw.goSeat = open[Math.floor(Math.random() * open.length)]; const sp = seatPose(dw.goSeat); dw.target = [sp.x + sp.fx * 0.9, sp.z + sp.fz * 0.9]; }
        else { dw.goSeat = null; const a = Math.random() * 6.28, r = Math.random() * R * 0.75; dw.target = [Math.cos(a) * r, Math.sin(a) * r]; }
        dw.wait = 6 + Math.random() * 5;
      }
      const dx = dw.target[0] - m.position.x, dz = dw.target[1] - m.position.z, dd = Math.hypot(dx, dz);
      if (dw.goSeat && dd < 0.35) { if (!seatTaken(dw.goSeat)) { dw.seat = dw.goSeat; dw.sitT = 8 + Math.random() * 10; setSit(m, true); } dw.goSeat = null; dw.target = null; }
      else if (dd > 0.2) { const nx = m.position.x + dx / dd * 1.2 * dt, nz = m.position.z + dz / dd * 1.2 * dt, c = Math.round(nx) + ',' + Math.round(nz), tc = cellAt(Math.round(nx), Math.round(nz)); if (tc.t !== 'w' && tc.t !== 'sea' && Math.abs(groundY(nx, nz) - m.position.y) < 0.3 && !(D.items || []).some(o => solid(o) && cellsOf(o).includes(c))) { m.position.x = nx; m.position.z = nz; m.rotation.y = Math.atan2(dx, dz); mv = 1; } else { dw.target = null; dw.goSeat = null; } }
      if (!dw.seat) m.position.y = groundY(m.position.x, m.position.z);
      lookAt(m, null);
    }
    animate(m, dt, mv, t);
  });
  // 時間、天氣、氣氛
  const night = lastNight = lighting(D.hour);
  ambientTick(dt, t, night); shardTick(dt, t);
  U.uSnow.value = D.weather === 'snow' ? 0.9 : 0;
  const W = D.weather, fallW = W === 'rain' || W === 'snow' || W === 'petal';
  rain.visible = fallW; rain.material.size = W === 'snow' ? 0.16 : W === 'petal' ? 0.15 : 0.07; rain.material.color.set(W === 'snow' ? '#ffffff' : W === 'petal' ? '#ffb4cf' : '#bfd8ff');
  if (rain.visible) { const p = rain.geometry.attributes.position.array, v = W === 'rain' ? 9 : W === 'petal' ? 0.9 : 1.2; for (let i = 0; i < p.length; i += 3) { p[i + 1] -= v * dt; if (W !== 'rain') { p[i] += Math.sin(t + i) * (W === 'petal' ? 0.7 : 0.3) * dt; if (W === 'petal') p[i + 2] += Math.cos(t * 0.7 + i) * 0.4 * dt; } if (p[i + 1] < 0) p[i + 1] += 14; } rain.geometry.attributes.position.needsUpdate = true; rain.position.set(P.position.x, 0, P.position.z); }
  sparkle.material.opacity = (night ? 0.7 : 0.38); sparkle.rotation.y = t * 0.02;
  const tx = P.position.x * 0.6, tz = P.position.z * 0.6, za = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.8 : 1;
  const ty = P.position.y * 0.6;   // 站上懸崖時鏡頭跟著抬高
  if (look) { camGoal.set(P.position.x, P.position.y + 1.95, P.position.z + 1.3); lookGoal.set(P.position.x, P.position.y + 5.2, P.position.z - 12); }   // 從頭頂後上方往天空看，畫面下緣留一點地平線
  else { camGoal.set(tx, 9.5 * za + ty, tz + 14 * za); lookGoal.set(tx, 0.9 + ty, tz - 1.5); }
  const k = Math.min(1, dt * 3); camPos.lerp(camGoal, k); camLook.lerp(lookGoal, k);
  camera.position.copy(camPos); camera.lookAt(camLook);
  if (dome) dome.position.copy(camera.position);   // 天空球跟著鏡頭
  // 夢境島也走後製（泛光、清透藍調色、輕微景深）；光束與黃金時段效果不用
  const fx = post.fx, dof0 = fx.dof; fx.golden = 0; fx.clear = W === 'clear' || W === 'meteor' ? 1 : 0.6; fx.sunVis = 0; fx.night = night ? 1 : 0; fx.focus = camera.position.distanceTo(P.position); fx.dof = dof0 * (look ? 0.2 : 0.7); fx.haze.copy(sky);
  post.render(t, sc, camera);
  fx.dof = dof0;
}
