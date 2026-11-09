/* 潮汐小島 · v9.8 燈籠港：隔著海峽的東方奇幻港鎮（靈感來自台灣的老街、廟宇與日治時期的木造車站）。
   主島碼頭西側停著渡輪，免費來回；到了是獨立的場景（像 trip.js）：碼頭、牌樓、紅磚老街、文昌廟、車站、書院、榕樹與土地公祠。
   建築與擺設是 Tripo 模型（models/lp_*.js，Codex 畫設定圖），鎮民是 Tripo 人形模型；文字在 data/lantern.js。
   座標：+Z 是南（碼頭、海），-Z 是北（文昌廟）。 */
import * as THREE from 'three';
import { camera, M, mesh, U, CURVE, bend, TERRAIN, skyU, scene as mainScene } from './engine.js';
import * as actors from './actors.js';
import * as post from './post.js';
import { PIER } from './props.js';
import { rectPavers } from './plazamodels.js';
import { animate, chibi, gesture, lookAt, setExpr } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, dayKey } from './state.js';
import { pickQ, record, pick } from './quiz.js';
import * as memo from './memo.js';
import * as tea from './tea.js';   // v9.9 車站通車：搭登山小火車去雲霧茶村

const D = () => I.LANTERN || {};
const LAND = 0.35, NIGHT_SUN = new THREE.Color('#9fb4ff'), NIGHT_SKY = new THREE.Color('#8aa3d6'), NIGHT_GND = new THREE.Color('#414c46');
export let inside = false;
let P = null, onExit = null, sc = null, savedCurve = CURVE, seaMat = null, deepMat = null;
const camPos = new THREE.Vector3(), boxes = [], folk = [], fades = [], ray = new THREE.Ray(), hitV = new THREE.Vector3(), headV = new THREE.Vector3();
const st = () => { const s = S(); return s.lantern || (s.lantern = {}); };

/* ---------- 擺設：模型 id、x、z、正面朝向（0 朝南 +Z、π/2 朝東 +X）、高度（公尺）、碰撞（1 整個外框、數字是外框縮放、'posts' 只有兩側柱子、'trunk' 只有樹幹、0 不擋路）、鏡像 ---------- */
const E = Math.PI / 2, W = -Math.PI / 2, N = Math.PI;
const PLACE = [
  ['lp_pier_hall', 0, 18.4, 0, 3.6, 0],   // 開放的候船亭，從碼頭穿過去進鎮
  ['lp_archway', 0, 14.2, 0, 5.0, 'posts'],
  ['lp_shop_book', -5.0, 10.4, E, 5.4, 1], ['lp_shop_tea', -5.0, 7.0, E, 5.4, 1], ['lp_shop_ice', -5.0, 0.2, E, 5.4, 1], ['lp_shop_lantern', -5.0, -3.2, E, 5.4, 1],   // 店屋深約 5.1 公尺，騎樓面對街道（x = ±2.45）；z = 3.6 留一條橫巷
  ['lp_shop_grocery', 5.0, 10.4, W, 5.4, 1], ['lp_shop_noodle', 5.0, 7.0, W, 5.4, 1], ['lp_shop_house', 5.0, 0.2, W, 5.4, 1], ['lp_shop_lantern', 5.0, -3.2, W, 5.4, 1, true],
  ['lp_temple', 0, -16.5, 0, 6.2, 0.9],
  ['lp_censer', 0, -10.6, 0, 1.6, 0.8], ['lp_lion', -2.7, -12.4, 0.15, 1.7, 0.8], ['lp_lion', 2.7, -12.4, -0.15, 1.7, 0.8, true],
  ['lp_teatable', -6.2, -10.2, 0, 1.0, 0.7],
  ['lp_banyan', -12.5, -5.0, 0, 8.0, 'trunk'], ['lp_well', -8.6, 0.8, E, 2.0, 0.8], ['lp_bench', -10.6, -1.6, E, 1.0, 0.8],
  ['lp_postoffice', -13.2, 9.0, E, 5.6, 0.95], ['lp_mailbox', -9.5, 11.9, E, 1.3, 0.8],
  ['lp_academy', 12.5, -13.0, 0, 5.4, 0.9],
  ['lp_station', 14.0, 5.0, W, 5.0, 0.95], ['lp_train', 19.6, 4.5, 0, 2.6, 1], ['lp_busstop', 9.0, 12.6, 0, 2.6, 0.8],
  ['lp_market_stall', -7.0, 15.4, 0, 2.6, 0.85], ['lp_crates', 6.6, 16.4, 0, 1.4, 0.85],
  ['lp_lamp', -2.15, 12.4, E, 3.2, 0.5], ['lp_lamp', 2.15, 12.4, W, 3.2, 0.5], ['lp_lamp', -2.15, 5.15, E, 3.2, 0.5], ['lp_lamp', 2.15, 5.15, W, 3.2, 0.5], ['lp_lamp', -2.15, -1.6, E, 3.2, 0.5], ['lp_lamp', 2.15, -1.6, W, 3.2, 0.5],
  ['lp_bike', -2.0, 1.3, E, 1.0, 0.8], ['lp_scooter', 1.95, 8.6, W, 1.1, 0.8], ['lp_cart', 1.3, -0.4, W, 2.0, 0.8], ['lp_planters', 2.0, 1.4, W, 1.2, 0.8], ['lp_planters', -2.0, 9.0, E, 1.2, 0.8, true],
  ['lp_fishboat', -3.7, 22.6, 0, 2.4, 0], ['lp_ferry', 3.05, 22.6, 0, 2.6, 0]   // 船身沿著碼頭，船頭朝外海
];
const TREES = [[-18, -18], [-15, -21], [-8.5, -21], [-5.6, -19.5], [5.6, -19.5], [8.5, -21], [16, -19], [19, -12], [-19, -10], [-19, 2], [-18, 14], [18, 12.5], [19, -2], [-16, -14], [16.5, -3.5], [-17, 6.5]];   // 橫巷旁邊不種樹，免得擋住鏡頭
/** 模型本身的正面方向修正（大部分 Tripo 模型正面朝 +Z；石獅朝 -X）；鏡像的模型反過來轉 */
const YAW0 = { lp_lion: Math.PI / 2 };

/* ---------- 鎮民：家（x、z、閒晃半徑）；名字、顏色與台詞在 data/lantern.js ---------- */
const HOMES = { lp_wen: [0, -12.2, 1.2], lp_shulan: [-2.0, 10.4, 0.6], lp_chayi: [-2.0, 7.0, 0.6], lp_bingbing: [-2.0, 0.2, 0.6], lp_mian: [2.0, 7.0, 0.6], lp_chen: [9.3, 4.2, 0.8], lp_axin: [0, 4.0, 5.0], lp_kui: [11.4, -8.8, 1.2], lp_heng: [13.4, -8.8, 1.2] };

/* ---------- 主島：碼頭西側的渡輪 ---------- */
const DOCK = () => [PIER.x - PIER.hw + 0.35, PIER.z + PIER.len - 1.6];
export function init(player, exitCb) {
  P = player; onExit = exitCb;
  if (actors.READY.has('lp_ferry')) actors.loadModel('lp_ferry', 'plain').then(gl => {
    const m = fit(gl, 2.6); m.rotation.y = YAW0.lp_ferry || 0;   // 船身沿著碼頭（南北向），船頭朝外海
    m.position.x = PIER.x - PIER.hw - 1.55; m.position.z = PIER.z + PIER.len - 3.0; m.position.y += -0.25;   // 靠在碼頭西側；船底一部分在水面下
    m.traverse(o => { o.frustumCulled = false; }); mainScene.add(m);
  }).catch(() => {});
}
const atDock = () => P && !inside && Math.hypot(P.position.x - DOCK()[0], P.position.z - DOCK()[1]) < 1.2;
export const hint = () => (atDock() ? '搭渡輪去燈籠港' : '');
export function handler() { return atDock() ? depart : null; }
const captain = () => Object.assign({ name: '渡輪船長', color: '#3f7fa8', voice: 300 }, (D().ferry || {}).captain || {});
const night = () => skyU.night.value > 0.5;
async function depart() {
  const F = D().ferry || {};
  const i = await ui.ask(captain(), pick(night() && F.night ? F.night : F.go || ['要去燈籠港嗎？渡輪隨時都有，免費的。']), ['出發', '下次吧'], { keys: true });
  if (i !== 0) return;
  ui.closeDialog(); enter();
  const s = st(); if (!s.visits) await ui.say(captain(), pick(F.arrive || ['到了！這裡是燈籠港。']));
  s.visits = (s.visits || 0) + 1; save();
}

/* ---------- 場景 ---------- */
/** 把模型縮放到指定高度、底部貼地，回傳複製出來的群組 */
function fit(gl, h, flip) {
  const box = new THREE.Box3().setFromObject(gl.scene), H = box.max.y - box.min.y || 1, s = h / H, m = gl.scene.clone(true);
  const g = new THREE.Group(); m.scale.set(flip ? -s : s, s, s); m.position.set(-(box.min.x + box.max.x) / 2 * (flip ? -s : s), -box.min.y * s, -(box.min.z + box.max.z) / 2 * s); g.add(m);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.shared = true; } });
  return g;
}
/** 高的建築擋在鏡頭和玩家之間時變半透明：這一份擺設用自己的材質，才不會連同款的另一棟一起變淡 */
function fader(g) {
  const mats = [];
  g.traverse(o => { if (!o.isMesh) return; const m = o.material.clone(); m.defines = Object.assign({}, o.material.defines); bend(m, 'plain'); o.material = m; o.userData.shared = false; mats.push(m); });
  g.updateMatrixWorld(true); fades.push({ box: new THREE.Box3().setFromObject(g), mats, a: 1 });
}
function fadeTick(dt) {
  headV.copy(P.position).setY(P.position.y + 1.0); ray.origin.copy(camera.position); ray.direction.subVectors(headV, camera.position);
  const dist = ray.direction.length(); ray.direction.divideScalar(dist || 1);
  fades.forEach(f => {
    const hit = ray.intersectBox(f.box, hitV), want = hit && camera.position.distanceTo(hitV) < dist - 0.4 ? 0.22 : 1;
    f.a += (want - f.a) * Math.min(1, dt * 6); const tr = f.a < 0.97;
    f.mats.forEach(m => { if (m.transparent !== tr) { m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } m.opacity = tr ? f.a : 1; });
  });
}
/** 擺好以後的碰撞框（以世界座標的外框為準，可縮小；牌樓只擋兩側柱子、榕樹只擋樹幹） */
function collide(g, kind) {
  if (!kind) return;
  g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, hx = (b.max.x - b.min.x) / 2, hz = (b.max.z - b.min.z) / 2;
  if (kind === 'trunk') { boxes.push({ x0: cx - 1.1, x1: cx + 1.1, z0: cz - 1.1, z1: cz + 1.1 }); return; }
  if (kind === 'posts') { const w = Math.min(1.0, hx * 0.3); [-1, 1].forEach(sd => boxes.push({ x0: cx + sd * (hx - w / 2) - w / 2, x1: cx + sd * (hx - w / 2) + w / 2, z0: cz - hz, z1: cz + hz })); return; }
  const k = typeof kind === 'number' ? kind : 1; boxes.push({ x0: cx - hx * k, x1: cx + hx * k, z0: cz - hz * k, z1: cz + hz * k });
}
const HARBOR = '#2a6274';   // v9.15 半寫實：港內的海水是深一點的藍綠（以前亮青色 #4fb6d6）
/** 地面：草地、石板（老街、廟埕、碼頭前）、沙灘，邊緣斜進海裡 */
const PAVED = [[-8.5, -21, 8.5, -8.4], [-2.9, -9, 2.9, 17.6], [-12, 2.3, 12.2, 4.9], [-9.6, 15, 9.6, 17.8], [7, -10.5, 15.5, -8]];   // 廟埕、老街、橫街、碼頭前、廟旁的小巷（x0, z0, x1, z1）
const paved = (x, z) => PAVED.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
function ground() {
  const X0 = -24, X1 = 24, Z0 = -26, Z1 = 22, G1 = new THREE.Color('#6d8c45'), G2 = new THREE.Color('#53723a'), STONE = new THREE.Color('#857c70'), STONE2 = new THREE.Color('#766e63'), SAND = new THREE.Color('#dccaa2'), BED = new THREE.Color('#8aa89a'), col = new THREE.Color();
  const nx = X1 - X0, nz = Z1 - Z0, P3 = [], C = [], idx = [];
  const edge = (x, z) => Math.max(Math.abs(x) - 21, z < 0 ? -z - 23 : z - 18.6, Math.hypot(Math.max(0, Math.abs(x) - 18), Math.max(0, -z - 20)) - 3);   // 離海岸的距離（> 0 在海裡）
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = X0 + i, z = Z0 + j, e = edge(x, z); let y = LAND;
    if (e > -1.2) { const u = Math.min(1, (e + 1.2) / 3.2); y = LAND - u * 1.3; col.copy(SAND).lerp(BED, Math.max(0, u - 0.35) / 0.65); }
    else if (paved(x, z)) col.copy(STONE).lerp(STONE2, 0.5 + 0.5 * Math.sin(x * 2.1 + z * 1.3) * Math.sin(x * 0.7 - z * 1.9));
    else col.copy(G1).lerp(G2, 0.35 + 0.35 * Math.sin(x * 0.43 + z * 0.31) * Math.sin(x * 0.27 - z * 0.39));
    P3.push(x, y, z); C.push(col.r, col.g, col.b);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, TERRAIN); m.receiveShadow = true;
  m.add(rectPavers(PAVED, () => LAND + 0.025, (x, z) => edge(x, z) < -1.5, 7));   // v9.17 半寫實：老街與廟埕鋪上一塊塊錯縫的灰褐石板，石縫露出底下深色的砂（以前一整片平的米色，像水泥地）
  return m;
}
/** 木棧碼頭：從岸邊往南伸進海裡 */
function pier() {
  const g = new THREE.Group(), wood = M('#8f7659', { roughness: 0.88 }, 'wood'), dark = M('#5e4936', {}, 'wood');   // v9.15：風吹日曬的灰褐木板，有木紋與一塊塊板子的深淺
  g.add(mesh(new THREE.BoxGeometry(3.0, 0.18, 8.4), wood, 0, 0.42, 23.0));
  for (let k = 0; k < 8; k++) g.add(mesh(new THREE.BoxGeometry(3.0, 0.02, 0.04), dark, 0, 0.52, 19.2 + k * 1.05, { noCast: true }));   // 木板縫
  [-1, 1].forEach(sd => { for (let k = 0; k < 4; k++) g.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.6, 8), dark, sd * 1.4, -0.3, 19.6 + k * 2.4)); });   // 樁
  return g;
}
function build() {
  sc = new THREE.Scene(); const sky = new THREE.Color('#cfe8ff'); sc.background = sky; sc.fog = new THREE.Fog(sky, 40, 95);
  const hemi = new THREE.HemisphereLight('#e8f2ff', '#7d8a5a', 1.1), sun = new THREE.DirectionalLight('#fff4e0', 2.3); sc.add(hemi);
  sun.position.set(10, 18, 8); sun.castShadow = true; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, far: 80 }); sc.add(sun, sun.target);
  const lamps = new THREE.Group(); sc.add(lamps);
  sc.userData.amb = { hemi, sun, lamps };
  seaMat = seaMat || bend(new THREE.MeshStandardMaterial({ color: HARBOR, roughness: 0.1, transparent: true, opacity: 0.86 }), 'water');
  deepMat = deepMat || new THREE.MeshBasicMaterial({ color: new THREE.Color(HARBOR).multiplyScalar(0.7), fog: true });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.05; sea.receiveShadow = true; sc.add(sea);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), deepMat); deep.rotation.x = -Math.PI / 2; deep.position.y = -1.2; sc.add(deep);
  sc.add(ground(), pier());
  boxes.length = 0; fades.length = 0;
  PLACE.forEach(([id, x, z, face, h, col, flip]) => actors.READY.has(id) && actors.loadModel(id, 'plain').then(gl => {   // 還沒做好的模型先跳過
    const g = fit(gl, h, flip); g.position.set(x, LAND, z); g.rotation.y = face + (flip ? -1 : 1) * (YAW0[id] || 0);
    if (id === 'lp_fishboat' || id === 'lp_ferry') { g.position.y = -0.25; g.userData.bob = Math.random() * 6; }
    if (id === 'lp_lamp') { const l = new THREE.PointLight('#ffcf8a', 0, 7, 1.8); l.position.set(x, LAND + h * 0.86, z); lamps.add(l); }
    sc.add(g); collide(g, col); if (h >= 3.4) fader(g);
  }).catch(() => {}));
  // 水邊的界線：海岸、碼頭兩側
  boxes.push({ x0: -1.4, x1: 1.4, z0: 26.9, z1: 28 });
  if (actors.READY.has('prop_tree')) actors.loadModel('prop_tree', 'sway').then(gl => TREES.forEach(([x, z], i) => {   // 鎮的外圍種一圈主島的闊葉樹，廟後面不要直接看到海
    const g = fit(gl, 3.6 + (i % 3) * 0.5); g.position.set(x, LAND, z); g.rotation.y = i * 1.7; sc.add(g); boxes.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4 });
  })).catch(() => {});
  folk.length = 0; (D().residents || []).forEach(r => { const h = HOMES[r.id]; if (h) folk.push(resident(r, h)); });
}
function resident(r, [x, z, rad]) {
  const m = chibi({ kind: 'human', shirt: r.color || '#7cc7ff', pants: '#4a4f62', hair: '#3a2a22', shoe: '#5a4a3a' });
  m.position.set(x, LAND, z); m.rotation.y = Math.random() * 6.28; m.traverse(o => { o.frustumCulled = false; }); sc.add(m); actors.dress(m, r.id);
  return { r, m, home: [x, z], rad, target: null, wait: 1 + Math.random() * 3, sp: { name: r.name, color: r.color, voice: r.voice || 400, mesh: m } };
}

/* ---------- 進出 ---------- */
function enter() {
  ui.iris(); if (!sc) build();
  inside = true; savedCurve = U.uCurve.value; U.uCurve.value = 0;
  sc.add(P); P.position.set(0, LAND + 0.15, 25.2); P.rotation.y = N; camPos.set(0, 10, 36);
  document.body.classList.add('in-trip'); Audio.sfx('open');
}
function leave() {
  ui.iris(); inside = false; U.uCurve.value = savedCurve || CURVE; document.body.classList.remove('in-trip');
  mainScene.add(P); onExit && onExit(); Audio.sfx('open');
}

/* ---------- 每幀 ---------- */
const onPierDeck = (x, z) => Math.abs(x) < 1.3 && z > 17.6 && z < 26.8;
const onLand = (x, z) => x > -20.6 && x < 20.6 && z > -22.4 && z < 18.2;
const blocked = (x, z) => boxes.some(b => x > b.x0 - 0.28 && x < b.x1 + 0.28 && z > b.z0 - 0.28 && z < b.z1 + 0.28);
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  if (tea.inside) return tea.tick(dt, t, ix, iz, len, moving, run, locked);   // 在茶村裡由茶村自己畫
  if (moving && !locked) {
    ix /= len; iz /= len; const sp = run ? 4.8 : 2.8 * (0.3 + 0.7 * Math.min(1, len)), nx = P.position.x + ix * sp * dt, nz = P.position.z + iz * sp * dt;
    const ok = (x, z) => (onLand(x, z) || onPierDeck(x, z)) && !blocked(x, z);
    if (ok(nx, nz)) { P.position.x = nx; P.position.z = nz; } else if (ok(nx, P.position.z)) P.position.x = nx; else if (ok(P.position.x, nz)) P.position.z = nz;   // 貼著牆滑過去
    P.rotation.y = Math.atan2(ix, iz);
  }
  P.position.y = onPierDeck(P.position.x, P.position.z) && !onLand(P.position.x, P.position.z) ? 0.51 : LAND;
  animate(P, dt, moving && !locked ? (run ? 2 : 1) : 0, t);
  folk.forEach(f => walk(f, dt, t));
  sc.children.forEach(o => { if (o.userData.bob != null) { o.position.y = -0.25 + Math.sin(t * 0.9 + o.userData.bob) * 0.05; o.rotation.z = Math.sin(t * 0.7 + o.userData.bob) * 0.015; } });
  const za = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.8 : 1, tx = P.position.x, tz = P.position.z;
  camPos.lerp(new THREE.Vector3(tx, 9.5 * za, tz + 11 * za), Math.min(1, dt * 3));
  camera.position.copy(camPos); camera.lookAt(tx, 1.0, tz - 1.5); fadeTick(dt);
  // 時間跟著主島走：晚上主光換成月光、街燈亮起來
  const n = skyU.night.value, amb = sc.userData.amb;
  sc.background.copy(skyU.bot.value); sc.fog.color.copy(skyU.bot.value);
  amb.hemi.intensity = 1.1 * (1 - n * 0.45); amb.hemi.color.set('#e8f2ff').lerp(NIGHT_SKY, n); amb.hemi.groundColor.set('#7d8a5a').lerp(NIGHT_GND, n);
  amb.sun.intensity = 2.3 * (1 - n * 0.72); amb.sun.color.set('#fff4e0').lerp(NIGHT_SUN, n);
  amb.lamps.children.forEach(l => { l.intensity = n > 0.35 ? 6 * Math.min(1, (n - 0.35) * 3) : 0; });
  seaMat.color.set(HARBOR).multiplyScalar(1 - n * 0.55); deepMat.color.set(HARBOR).multiplyScalar(0.7 * (1 - n * 0.6));
  const fx = post.fx, dof0 = fx.dof; fx.golden = 0; fx.clear = 1; fx.sunVis = 0; fx.night = n; fx.focus = camera.position.distanceTo(P.position); fx.dof = dof0 * 0.6; fx.haze.copy(sc.background);
  post.render(t, sc, camera);
  fx.dof = dof0;
}
/** 鎮民在家附近慢慢走；跟你說話時停下來看著你 */
function walk(f, dt, t) {
  const m = f.m; let mv = 0;
  if (f.talk) { m.rotation.y = Math.atan2(P.position.x - m.position.x, P.position.z - m.position.z); lookAt(m, P.position.clone().setY(P.position.y + 1.1)); animate(m, dt, 0, t); return; }
  f.wait -= dt;
  if (f.wait <= 0 && !f.target) { const a = Math.random() * 6.28, d = Math.random() * f.rad; f.target = [f.home[0] + Math.cos(a) * d, f.home[1] + Math.sin(a) * d]; }
  if (f.target) {
    const dx = f.target[0] - m.position.x, dz = f.target[1] - m.position.z, d = Math.hypot(dx, dz);
    if (d < 0.15 || f.wait < -8) { f.target = null; f.wait = 3 + Math.random() * 6; }
    else { const s = 1.0 * dt, nx = m.position.x + dx / d * s, nz = m.position.z + dz / d * s; if (blocked(nx, nz)) { f.target = null; f.wait = 2; } else { m.position.x = nx; m.position.z = nz; m.rotation.y = Math.atan2(dx, dz); mv = 1; } }
  }
  lookAt(m, Math.hypot(P.position.x - m.position.x, P.position.z - m.position.z) < 3.5 ? P.position.clone().setY(P.position.y + 1.1) : null);
  animate(m, dt, mv, t, 0.8);
}

/* ---------- 互動 ---------- */
const near = (x, z, r) => Math.hypot(P.position.x - x, P.position.z - z) < r;
const nearFolk = () => folk.filter(f => near(f.m.position.x, f.m.position.z, 1.9)).sort((a, b) => Math.hypot(a.m.position.x - P.position.x, a.m.position.z - P.position.z) - Math.hypot(b.m.position.x - P.position.x, b.m.position.z - P.position.z))[0] || null;
const atFerry = () => near(1.0, 25.6, 1.5);
const atTemple = () => near(0, -12.9, 1.6);
const atStation = () => near(11.4, 5.0, 1.3);   // 木造車站門口
/** 從茶村搭小火車回來：站在車站門口，面向老街 */
const backFromTea = () => { sc.add(P); P.position.set(11.4, LAND + 0.15, 5.0); P.rotation.y = W; camPos.set(11.4, 10, 16); };
export function townHint() { if (tea.inside) return tea.hint(); if (atFerry()) return '搭渡輪回潮汐小島'; if (atStation()) return '搭小火車去雲霧茶村'; const f = nearFolk(); if (f) return `和${f.r.name}聊天`; if (atTemple()) return '參拜文昌帝君'; return ''; }
export function townHandler() { if (tea.inside) return tea.handler(); if (atFerry()) return home; if (atStation()) return () => tea.ride(P, backFromTea); const f = nearFolk(); if (f) return () => chat(f); if (atTemple()) return pray; return null; }
async function home() {
  const F = D().ferry || {};
  if (await ui.ask(captain(), pick(F.back || ['要回潮汐小島了嗎？']), ['回去', '再逛逛'], { keys: true }) !== 0) return;
  ui.closeDialog(); leave();
}
async function chat(f) {
  const r = f.r, s = st(); s.met = s.met || {}; f.talk = true; setExpr(f.m, 'happy', 2);
  try {
    if (!s.met[r.id]) { s.met[r.id] = dayKey(); save(); gesture(f.m, 'wave', 2.2); for (const l of r.first || []) await ui.say(f.sp, l); return; }   // 第一次見面先揮手
    await ui.say(f.sp, pick(night() && r.night && r.night.length ? r.night : r.greet || ['你好！']));
    if (r.chat && r.chat.length) await ui.say(f.sp, pick(r.chat));
  } finally { f.talk = false; }
}
/** 最需要加強的科目：考科裡精熟度最低的兩科之一 */
function weakSid() {
  const L = window.TA.L, subs = (L.trackSubjects ? L.trackSubjects() : TA.SUBJECTS.map(s => s.id)).filter(sid => pickQ(sid, 3));
  const by = subs.map(sid => [sid, (L.subjectStats(sid) || {}).mastery || 0]).sort((a, b) => a[1] - b[1]);
  return by.length ? by[Math.floor(Math.random() * Math.min(2, by.length))][0] : null;
}
/** 文昌廟：每天求一次籤——回答三題最需要加強的科目，依答對題數抽籤 */
async function pray() {
  const T = D().temple || {}, wen = folk.find(f => f.r.id === 'lp_wen'), sp = wen ? wen.sp : { name: '文伯', color: '#3b4f7a', voice: 260 }, s = st(), S0 = S();
  if (wen) wen.talk = true;
  try {
    if (!s.templeMet) { s.templeMet = 1; save(); for (const l of T.intro || []) await ui.say(sp, l); }
    if (s.pray === dayKey()) { await ui.say(sp, pick(T.again || ['今天已經求過籤了，明天再來吧。'])); return; }
    if (await ui.ask(sp, '要求一支讀書籤嗎？先回答三題你最需要加強的科目，答對越多題，籤越好。', ['求籤', '下次吧'], { keys: true }) !== 0) return;
    const sid = weakSid(); if (!sid) { await ui.say(sp, '今天題目準備不及，改天再來吧。'); return; }
    await ui.say(sp, `${pick(T.pre || ['先靜下心來。'])}（${(TA.subject(sid) || {}).name || ''}）`);
    let ok = 0;
    for (let k = 0; k < 3; k++) {
      const q = pickQ(sid, 3); if (!q) break;
      const a = await ui.ask(sp, q.q, q.o, { answer: q.a, abc: true, keys: true, html: true }), good = a === q.a; record(q, good);
      if (good) { ok++; Audio.sfx('ok'); } else { Audio.sfx('bad'); await ui.explain(sp, q); }
    }
    const rank = ((T.ranks || []).find(r => ok >= r.min) || { rank: '小吉' }).rank, pool = (T.slips || []).filter(x => x.rank === rank), slip = pick(pool.length ? pool : T.slips || [{ rank, poem: '', meaning: '', advice: '' }]);
    s.pray = dayKey(); s.prays = (s.prays || 0) + 1; const first = s.prays === 1, bells = 200 + ok * 100; S0.bells += bells; if (first) TA.S.gems = (TA.S.gems || 0) + 20;
    S0.stats = S0.stats || {}; S0.stats.lanternPray = (S0.stats.lanternPray || 0) + 1; save(); TA.emit && TA.emit('wallet');
    Audio.sfx('catch'); ui.emote(P, '🏮', '#ff7b5a');
    if (wen && ok >= 3) gesture(wen.m, 'cheer', 2.5);   // 三題全對，文伯替你歡呼
    await ui.say(sp, `答對 ${ok} 題。抽到的是——<b>${slip.rank}</b>`, { html: true });
    if (slip.poem) await ui.say(sp, slip.poem.split(/[，。]/).filter(Boolean).join('<br>'), { html: true });
    if (slip.meaning) await ui.say(sp, slip.meaning);
    if (slip.advice) await ui.say(sp, `讀書的提醒：${slip.advice}`);
    memo.add(`在燈籠港的文昌廟抽到${slip.rank}`, slip.advice || '', { key: 'lp_pray:' + dayKey(), icon: '🏮' });
    await ui.say(sp, `${pick(T.thanks || ['祝你讀書順利。'])}（廟方回禮 ${bells} 鈴錢${first ? '、第一次求籤再送 20 潮晶' : ''}）`);
  } finally { if (wen) wen.talk = false; }
}
export const debugEnter = () => enter();
export const debugTea = () => { if (!inside) enter(); tea.enter(P, backFromTea); };   // 測試用：直接進茶村
export const debug = { folk, player: () => P, dock: DOCK, tea: tea.debug };   // 測試用：鎮民、玩家、主島的渡輪碼頭、茶村
