/* 潮汐小島 · v9.9 雲霧茶村：從燈籠港車站搭登山小火車上山的茶鄉（靈感來自阿里山森林鐵路、凍頂與坪林的茶園、紅瓦三合院）。
   由 lantern.js 轉交（主島只知道「在燈籠港」）：進來時燈籠港把每幀、提示與按鍵交給這裡，回去時再交還。
   建築與擺設是 Tripo 模型（models/tv_*.js，Codex 畫設定圖），村民是 Tripo 人形模型；文字在 data/teavillage.js。
   座標：+Z 是南（月台、鐵道），-Z 是北（製茶廠、懸崖外的雲海）；溪水在東邊由北往南流，拱橋過溪就是三合院與茶園。 */
import * as THREE from 'three';
import { camera, M, mesh, TERRAIN, skyU, hourNow } from './engine.js';
import * as actors from './actors.js';
import * as post from './post.js';
import { animate, chibi, gesture, lookAt, setExpr } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, dayKey } from './state.js';
import { pickQ, record, pick } from './quiz.js';
import * as memo from './memo.js';

const D = () => I.TEA || {};
const LAND = 0.35, NIGHT_SUN = new THREE.Color('#9fb4ff'), NIGHT_SKY = new THREE.Color('#8aa3d6'), NIGHT_GND = new THREE.Color('#3c4a40'), CLOUD = new THREE.Color('#f3f6f8');
export let inside = false;
let P = null, onBack = null, sc = null, cloudMat = null, cloudMat2 = null, waterMat = null, view = 0;
const camPos = new THREE.Vector3(), boxes = [], folk = [], fades = [], puffs = [], ray = new THREE.Ray(), hitV = new THREE.Vector3(), headV = new THREE.Vector3(), lookV = new THREE.Vector3();
const st = () => { const s = S(); return s.teavillage || (s.teavillage = {}); };

/* ---------- 擺設：模型 id、x、z、正面朝向（0 朝南 +Z、π/2 朝東 +X）、高度（公尺）、碰撞（1 整個外框、數字是外框縮放、'posts' 只有兩側柱子、'trunk' 只有樹幹、0 不擋路）、鏡像 ---------- */
const E = Math.PI / 2, W = -Math.PI / 2, N = Math.PI;
const PLACE = [
  // 月台與車站：站房正面朝村子（北），背後是月台和鐵道
  ['tv_station', -5.6, 14.0, N, 5.0, 0.95], ['tv_train', -3.0, 19.7, 0, 2.8, 1],
  ['tv_tea_stall', 5.2, 13.4, W, 2.6, 0.85], ['tv_signpost', 1.9, 11.2, 0.3, 2.4, 0.5], ['tv_shrine', -2.9, 8.6, E, 2.0, 0.9],
  // 西側：民宿、茶藝館、分校
  ['tv_lodge', -12.0, 9.6, E, 6.4, 0.92], ['tv_teahouse', -11.5, 0.6, E, 5.2, 0.92], ['tv_school', -12.0, -11.0, E, 4.6, 0.92],
  ['tv_water_jar', -7.6, 4.6, 0, 1.0, 0.8], ['tv_bench', -7.8, -5.6, E, 0.9, 0.8],
  // 北邊：製茶廠與曬茶、炒茶
  ['tv_teafactory', 0, -15.6, 0, 7.5, 0.92], ['tv_roaster', -4.4, -9.8, 0.4, 1.5, 0.8], ['tv_drying_rack', 4.4, -9.8, -0.4, 2.0, 0.8],
  ['tv_tea_basket', 2.6, -8.6, 0, 0.8, 0.7], ['tv_cart', -6.8, -12.6, E, 1.2, 0.8],
  // 西北的懸崖邊：雲海觀景台、涼亭
  ['tv_cloud_deck', -15.4, -21.0, 0, 2.4, 0.9], ['tv_pavilion', -7.6, -20.4, 0, 4.2, 'posts'], ['tv_bench', -4.4, -19.2, W, 0.9, 0.8],
  ['tv_stone_steps', -19.4, -14.4, E, 1.8, 0.9],
  // 東邊過溪：三合院、工寮、茶園梯田
  ['tv_bridge', 7.0, 4.0, 0, 1.6, 0], ['tv_sanheyuan', 15.0, 8.0, W, 5.0, 0.9], ['tv_millstone', 10.8, 13.0, 0, 1.1, 0.8], ['tv_water_jar', 10.6, 2.6, 0, 1.0, 0.8],
  ['tv_hut', 12.0, -17.6, 0, 3.2, 0.9], ['tv_fence', 10.2, -1.6, 0, 1.2, 0.9],
  ['tv_tea_row', 12.0, -4.0, 0, 1.0, 1], ['tv_tea_row', 12.0, -7.0, 0, 1.0, 1], ['tv_tea_row', 12.0, -10.0, 0, 1.0, 1], ['tv_tea_row', 12.0, -13.0, 0, 1.0, 1],
  ['tv_terrace', 18.6, -1.2, W, 1.6, 1], ['tv_terrace', 18.6, -4.8, W, 1.6, 1], ['tv_terrace', 18.6, -8.4, W, 1.6, 1], ['tv_terrace', 18.6, -12.0, W, 1.6, 1], ['tv_terrace', 18.6, -15.6, W, 1.6, 1],
  ['tv_tea_row', -7.0, -3.4, 0, 1.0, 1], ['tv_tea_bush', -4.4, -4.0, 0, 0.9, 0.8], ['tv_tea_bush', 4.4, -3.0, 0, 0.9, 0.8], ['tv_tea_bush', -4.0, 4.6, 0, 0.9, 0.8], ['tv_tea_bush', 9.8, 9.4, 0, 0.9, 0.8],
  // 樹：紅檜神木、樟樹、山櫻花、竹叢
  ['tv_sacred_tree', 16.4, -19.8, 0, 14, 'trunk'], ['tv_camphor', -19.0, 4.4, 0, 7.5, 'trunk'], ['tv_camphor', 19.2, 14.8, 0, 7.0, 'trunk'],
  ['tv_cherry', -6.4, 6.8, 0, 4.6, 'trunk'], ['tv_cherry', 5.0, -5.6, 0, 4.4, 'trunk'], ['tv_cherry', 9.8, 16.0, 0, 4.8, 'trunk'], ['tv_cherry', -17.6, -8.0, 0, 5.0, 'trunk'],
  ['tv_bamboo', -19.6, -3.4, 0, 7.0, 'trunk'], ['tv_bamboo', -18.4, 16.0, 0, 6.6, 'trunk'], ['tv_bamboo', 19.8, 3.2, 0, 7.0, 'trunk'], ['tv_bamboo', 8.4, -21.0, 0, 6.6, 'trunk'],
  ['tv_rock', -18.6, -18.6, 0.6, 1.8, 0.85], ['tv_rock', 19.0, -17.0, 2.2, 1.6, 0.85], ['tv_rock', -8.8, 16.8, 1.2, 1.2, 0.85],
  // 山徑路燈（晚上亮）
  ['tv_lamp', -2.1, 12.0, E, 3.2, 0.5], ['tv_lamp', 2.1, 4.8, W, 3.2, 0.5], ['tv_lamp', -2.1, -2.8, E, 3.2, 0.5], ['tv_lamp', 2.1, -8.4, W, 3.2, 0.5], ['tv_lamp', 5.0, 5.6, E, 3.2, 0.5], ['tv_lamp', -12.4, -17.6, E, 3.2, 0.5]
];
/** 模型本身的正面方向修正：這一批 Tripo 模型的建築正面大多朝 +X（四向算圖確認），轉 -90° 讓正面朝 +Z；長椅、推車、涼亭、樹與小擺設不用轉 */
const YAW0 = Object.fromEntries(['tv_station', 'tv_train', 'tv_teafactory', 'tv_sanheyuan', 'tv_teahouse', 'tv_lodge', 'tv_school', 'tv_shrine', 'tv_cloud_deck', 'tv_bridge', 'tv_hut', 'tv_tea_stall', 'tv_roaster', 'tv_drying_rack', 'tv_terrace', 'tv_stone_steps', 'tv_fence'].map(id => [id, -Math.PI / 2]));

/* ---------- 村民：家（x、z、閒晃半徑）；名字、顏色與台詞在 data/teavillage.js ---------- */
const HOMES = { tv_ama: [11.6, -1.0, 1.6], tv_shifu: [1.6, -9.6, 0.8], tv_lin: [15.0, -16.6, 1.2], tv_teacher: [-8.4, -12.6, 1.0], tv_conductor: [2.6, 17.0, 0.6], tv_chaguan: [-7.2, 0.8, 0.6], tv_yun: [-12.6, -17.6, 1.0], tv_xiaoman: [-7.0, -9.8, 1.2] };

/* ---------- 地形：村子是一塊平台，東西南三面是山坡，北邊是懸崖、崖下是雲海 ---------- */
const STREAM = { x0: 6.15, x1: 7.85, z0: -2.2, z1: 23 }, BRIDGE = { x0: 5.2, x1: 8.8, z0: 3.45, z1: 4.55 };
const inStream = (x, z) => x > STREAM.x0 && x < STREAM.x1 && z > STREAM.z0 && z < STREAM.z1;
const paved = (x, z) => (Math.abs(x) < 1.7 && z > -10 && z < 17.6) || (Math.hypot(x, z - 1) < 4.6) || (Math.abs(x) < 9 && z > 16.6 && z < 18.8) || (Math.abs(x) < 7 && z > -11.6 && z < -8.2) || (x > -15 && x < -4 && z > -20.4 && z < -17.4) || (z > 3.4 && z < 4.6 && x > -9 && x < 12);
const field = (x, z) => x > 9 && x < 20 && z > -15.5 && z < -1;
function height(x, z) {
  const dx = Math.max(0, Math.abs(x) - 21.5), dzs = Math.max(0, z - 21), dzn = Math.max(0, -z - 23.5);
  if (dzn > 0) return LAND - Math.min(9, dzn * dzn * 0.9 + dzn * 1.4);   // 北邊懸崖往下掉進雲海
  const hill = Math.hypot(dx, dzs);
  if (hill > 0) return LAND + hill * 0.85 + Math.sin(x * 0.31 + z * 0.17) * Math.min(1, hill * 0.2) * 1.2;
  if (inStream(x, z)) return LAND - 0.62;
  return LAND;
}
function ground() {
  const X0 = -44, X1 = 44, Z0 = -40, Z1 = 40, G1 = new THREE.Color('#6f9e3a'), G2 = new THREE.Color('#4f8030'), STONE = new THREE.Color('#bdb3a3'), STONE2 = new THREE.Color('#a49a8a'), SOIL = new THREE.Color('#8a7350'), BED = new THREE.Color('#6d6a58'), ROCK = new THREE.Color('#7c7a72'), col = new THREE.Color();
  const nx = X1 - X0, nz = Z1 - Z0, P3 = [], C = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = X0 + i, z = Z0 + j, y = height(x, z);
    if (inStream(x, z)) col.copy(BED);
    else if (y < LAND - 0.3) col.copy(ROCK).lerp(G2, 0.25);
    else if (paved(x, z)) col.copy(STONE).lerp(STONE2, 0.5 + 0.5 * Math.sin(x * 2.1 + z * 1.3) * Math.sin(x * 0.7 - z * 1.9));
    else if (field(x, z)) col.copy(SOIL).lerp(G2, 0.35 + 0.2 * Math.sin(z * 1.9));
    else col.copy(G1).lerp(G2, 0.35 + 0.35 * Math.sin(x * 0.43 + z * 0.31) * Math.sin(x * 0.27 - z * 0.39));
    P3.push(x, y, z); C.push(col.r, col.g, col.b);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, TERRAIN); m.receiveShadow = true; return m;
}
/** 鐵道：月台南邊東西向的兩條鐵軌與枕木，兩頭沒入山坡 */
function railway() {
  const g = new THREE.Group(), steel = M('#6b6f74', { metalness: 0.6, roughness: 0.4 }), sleeper = M('#5a4636', { roughness: 0.9 }), bed = M('#8d8678', { roughness: 1 });
  g.add(mesh(new THREE.BoxGeometry(64, 0.12, 2.6), bed, 0, LAND + 0.02, 19.7, { noCast: true }));
  [-0.55, 0.55].forEach(dz => g.add(mesh(new THREE.BoxGeometry(64, 0.1, 0.08), steel, 0, LAND + 0.2, 19.7 + dz, { noCast: true })));
  for (let x = -31; x <= 31; x += 0.9) g.add(mesh(new THREE.BoxGeometry(0.22, 0.08, 1.7), sleeper, x, LAND + 0.11, 19.7, { noCast: true }));
  g.add(mesh(new THREE.BoxGeometry(18, 0.3, 1.8), M('#b8ad9c', { roughness: 0.9 }), 0, LAND + 0.15, 17.7));   // 石砌月台
  return g;
}
/** 溪水：細長的水面，拱橋從上面跨過 */
function stream() {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(STREAM.x1 - STREAM.x0 + 0.3, STREAM.z1 - STREAM.z0), waterMat = waterMat || new THREE.MeshStandardMaterial({ color: '#4f93a0', roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.set((STREAM.x0 + STREAM.x1) / 2, LAND - 0.32, (STREAM.z0 + STREAM.z1) / 2); water.userData.water = true; return water;
}
/** 遠山與崖下的雲海：山是幾座霧裡的錐形，雲海是兩層白色平面加上慢慢飄的雲團 */
function scenery() {
  const g = new THREE.Group(), hillM = M('#4d6b52', { roughness: 1 }), farM = M('#6f8a86', { roughness: 1 });
  [[-70, -10, 30, 26], [-62, 30, 24, 20], [64, -20, 32, 28], [70, 24, 26, 22], [0, 78, 30, 22], [-36, 70, 22, 18], [40, 70, 26, 20], [-50, -80, 34, 30], [10, -95, 40, 34], [60, -78, 30, 26], [-90, -45, 36, 24]].forEach(([x, z, h, r], i) => {
    const m = mesh(new THREE.ConeGeometry(r, h, 7, 1), z < -40 ? farM : hillM, x, (z < -40 ? -7 : LAND) + h / 2 - 2, z, { noCast: true }); m.rotation.y = i * 0.7; g.add(m);
  });
  cloudMat = cloudMat || new THREE.MeshStandardMaterial({ color: CLOUD, roughness: 1, transparent: true, opacity: 0.94 });
  cloudMat2 = cloudMat2 || new THREE.MeshStandardMaterial({ color: CLOUD, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), cloudMat); sea.rotation.x = -Math.PI / 2; sea.position.y = -5.2; g.add(sea);
  const sea2 = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), cloudMat2); sea2.rotation.x = -Math.PI / 2; sea2.position.y = -4.3; g.add(sea2);
  puffs.length = 0;
  const geo = new THREE.SphereGeometry(1, 12, 8);
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 1.2 + Math.PI * 0.9, r = 34 + (k * 37 % 40), p = new THREE.Mesh(geo, cloudMat2);
    p.position.set(Math.cos(a) * r, -4.4 + (k % 4) * 0.35, -26 + Math.sin(a) * r * 0.9 - 10); p.scale.set(7 + (k * 13 % 9), 1.4 + (k % 3) * 0.5, 4 + (k * 7 % 5));
    p.userData.drift = 0.25 + (k % 5) * 0.08; g.add(p); puffs.push(p);
  }
  return g;
}

/** 把模型縮放到指定高度、底部貼地，回傳複製出來的群組 */
function fit(gl, h, flip) {
  const box = new THREE.Box3().setFromObject(gl.scene), H = box.max.y - box.min.y || 1, s = h / H, m = gl.scene.clone(true);
  const g = new THREE.Group(); m.scale.set(flip ? -s : s, s, s); m.position.set(-(box.min.x + box.max.x) / 2 * (flip ? -s : s), -box.min.y * s, -(box.min.z + box.max.z) / 2 * s); g.add(m);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.shared = true; } });
  return g;
}
/** 高的建築擋在鏡頭和玩家之間時變半透明 */
function fader(g) {
  const mats = [];
  g.traverse(o => { if (!o.isMesh) return; const m = o.material.clone(); m.defines = Object.assign({}, o.material.defines); o.material = m; o.userData.shared = false; mats.push(m); });
  g.updateMatrixWorld(true); fades.push({ box: new THREE.Box3().setFromObject(g), mats, a: 1 });
}
function fadeTick(dt) {
  headV.copy(P.position).setY(P.position.y + 1.0); ray.origin.copy(camera.position); ray.direction.subVectors(headV, camera.position);
  const dist = ray.direction.length(); ray.direction.divideScalar(dist || 1);
  fades.forEach(f => {
    const hit = !view && ray.intersectBox(f.box, hitV), want = hit && camera.position.distanceTo(hitV) < dist - 0.4 ? 0.22 : 1;
    f.a += (want - f.a) * Math.min(1, dt * 6); const tr = f.a < 0.97;
    f.mats.forEach(m => { if (m.transparent !== tr) { m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } m.opacity = tr ? f.a : 1; });
  });
}
/** 擺好以後的碰撞框（世界座標的外框，可縮小；涼亭只擋柱子、樹只擋樹幹） */
function collide(g, kind) {
  if (!kind) return;
  g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, hx = (b.max.x - b.min.x) / 2, hz = (b.max.z - b.min.z) / 2;
  if (kind === 'trunk') { const r = Math.min(1.1, Math.max(0.35, Math.min(hx, hz) * 0.25)); boxes.push({ x0: cx - r, x1: cx + r, z0: cz - r, z1: cz + r }); return; }
  if (kind === 'posts') { const w = Math.min(0.6, hx * 0.2); [-1, 1].forEach(sx => [-1, 1].forEach(sz => boxes.push({ x0: cx + sx * (hx - w) - w / 2, x1: cx + sx * (hx - w) + w / 2, z0: cz + sz * (hz - w) - w / 2, z1: cz + sz * (hz - w) + w / 2 }))); return; }
  const k = typeof kind === 'number' ? kind : 1; boxes.push({ x0: cx - hx * k, x1: cx + hx * k, z0: cz - hz * k, z1: cz + hz * k });
}
function build() {
  sc = new THREE.Scene(); const sky = new THREE.Color('#d6e6f2'); sc.background = sky; sc.fog = new THREE.Fog(sky, 34, 120);
  const hemi = new THREE.HemisphereLight('#eef4ff', '#7da062', 1.1), sun = new THREE.DirectionalLight('#fff2dc', 2.2); sc.add(hemi);
  sun.position.set(-12, 20, 10); sun.castShadow = true; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, far: 90 }); sc.add(sun, sun.target);
  const lamps = new THREE.Group(); sc.add(lamps);
  sc.userData.amb = { hemi, sun, lamps };
  sc.add(ground(), railway(), stream(), scenery());
  boxes.length = 0; fades.length = 0;
  PLACE.forEach(([id, x, z, face, h, col, flip]) => actors.READY.has(id) && actors.loadModel(id, 'plain').then(gl => {   // 還沒做好的模型先跳過
    const g = fit(gl, h, flip); g.position.set(x, LAND, z); g.rotation.y = face + (flip ? -1 : 1) * (YAW0[id] || 0);
    if (id === 'tv_bridge') g.position.y = LAND - 0.5;   // 橋墩站在溪床上
    if (id === 'tv_lamp') { const l = new THREE.PointLight('#ffcf8a', 0, 7, 1.8); l.position.set(x, LAND + h * 0.8, z); lamps.add(l); }
    sc.add(g); collide(g, col); if ((h >= 3.4 && col !== 'trunk') || id === 'tv_train') fader(g);   // 月台南邊的火車擋在鏡頭前也要變淡
  }).catch(() => {}));
  // 溪水兩岸擋住（只有拱橋能過），鐵道擋住
  boxes.push({ x0: STREAM.x0 - 0.1, x1: STREAM.x1 + 0.1, z0: STREAM.z0, z1: BRIDGE.z0 }, { x0: STREAM.x0 - 0.1, x1: STREAM.x1 + 0.1, z0: BRIDGE.z1, z1: STREAM.z1 });
  folk.length = 0; (D().residents || []).forEach(r => { const h = HOMES[r.id]; if (h) folk.push(resident(r, h)); });
}
function resident(r, [x, z, rad]) {
  const m = chibi({ kind: 'human', shirt: r.color || '#7cc7ff', pants: '#4a4f62', hair: '#3a2a22', shoe: '#5a4a3a' });
  m.position.set(x, LAND, z); m.rotation.y = Math.random() * 6.28; m.traverse(o => { o.frustumCulled = false; }); sc.add(m); actors.dress(m, r.id);
  return { r, m, home: [x, z], rad, target: null, wait: 1 + Math.random() * 3, sp: { name: r.name, color: r.color, voice: r.voice || 400, mesh: m } };
}

/* ---------- 進出（由燈籠港車站呼叫） ---------- */
export function enter(player, back) {
  P = player; onBack = back;
  ui.iris(); if (!sc) build();
  inside = true; view = 0;
  sc.add(P); P.position.set(0, LAND + 0.15, 17.4); P.rotation.y = N; camPos.set(0, 10, 28.4);
  Audio.sfx('open');
}
function leave() {
  ui.iris(); inside = false; view = 0; onBack && onBack(); Audio.sfx('open');
}
export const conductor = () => Object.assign({ name: '紅綾列車長', color: '#9a3a3a', voice: 260 }, (D().train || {}).conductor || {});
const night = () => skyU.night.value > 0.5;
/** 燈籠港車站：問要不要搭小火車上山；答應就進茶村 */
export async function ride(player, back) {
  const T = D().train || {};
  const i = await ui.ask(conductor(), pick(night() && T.night ? T.night : T.go || ['要搭登山小火車去雲霧茶村嗎？免費的。']), ['上車', '下次吧'], { keys: true });
  if (i !== 0) return;
  ui.closeDialog(); enter(player, back);
  const s = st(); if (!s.visits) await ui.say(conductor(), pick(T.arrive || ['雲霧茶村到了，歡迎上山。']));
  s.visits = (s.visits || 0) + 1; save();
}

/* ---------- 每幀 ---------- */
const onBridge = (x, z) => x > BRIDGE.x0 && x < BRIDGE.x1 && z > BRIDGE.z0 && z < BRIDGE.z1;
const onLand = (x, z) => x > -20.6 && x < 20.6 && z > -22.8 && z < 18.4 && (!inStream(x, z) || onBridge(x, z));
const blocked = (x, z) => !onBridge(x, z) && boxes.some(b => x > b.x0 - 0.28 && x < b.x1 + 0.28 && z > b.z0 - 0.28 && z < b.z1 + 0.28);
const footY = (x, z) => (onBridge(x, z) ? LAND + 0.42 * Math.sin(Math.PI * (x - BRIDGE.x0) / (BRIDGE.x1 - BRIDGE.x0)) : LAND);   // 拱橋中間比較高
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  if (moving && !locked && !view) {
    ix /= len; iz /= len; const sp = run ? 4.8 : 2.8 * (0.3 + 0.7 * Math.min(1, len)), nx = P.position.x + ix * sp * dt, nz = P.position.z + iz * sp * dt;
    const ok = (x, z) => onLand(x, z) && !blocked(x, z);
    if (ok(nx, nz)) { P.position.x = nx; P.position.z = nz; } else if (ok(nx, P.position.z)) P.position.x = nx; else if (ok(P.position.x, nz)) P.position.z = nz;   // 貼著牆滑過去
    P.rotation.y = Math.atan2(ix, iz);
  }
  P.position.y = footY(P.position.x, P.position.z);
  animate(P, dt, moving && !locked && !view ? (run ? 2 : 1) : 0, t);
  folk.forEach(f => walk(f, dt, t));
  puffs.forEach(p => { p.position.x += p.userData.drift * dt; if (p.position.x > 90) p.position.x = -90; });
  const za = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.8 : 1, tx = P.position.x, tz = P.position.z;
  if (view) {   // 雲海望遠鏡：鏡頭飛到觀景台上空，往北看崖下的雲海
    camPos.lerp(lookV.set(-15.4, 6.5, -15.5), Math.min(1, dt * 1.6)); camera.position.copy(camPos); camera.lookAt(-14, -2.5, -60);
  } else {
    camPos.lerp(lookV.set(tx, 9.5 * za, tz + 11 * za), Math.min(1, dt * 3)); camera.position.copy(camPos); camera.lookAt(tx, 1.0, tz - 1.5);
  }
  fadeTick(dt);
  // 時間跟著主島走：晚上主光換成月光、路燈亮起來、雲海變暗
  const n = skyU.night.value, amb = sc.userData.amb;
  sc.background.copy(skyU.bot.value).lerp(CLOUD, 0.25 * (1 - n)); sc.fog.color.copy(sc.background);
  amb.hemi.intensity = 1.1 * (1 - n * 0.45); amb.hemi.color.set('#eef4ff').lerp(NIGHT_SKY, n); amb.hemi.groundColor.set('#7da062').lerp(NIGHT_GND, n);
  amb.sun.intensity = 2.2 * (1 - n * 0.72); amb.sun.color.set('#fff2dc').lerp(NIGHT_SUN, n);
  amb.lamps.children.forEach(l => { l.intensity = n > 0.35 ? 6 * Math.min(1, (n - 0.35) * 3) : 0; });
  cloudMat.color.copy(CLOUD).multiplyScalar(1 - n * 0.62); cloudMat2.color.copy(cloudMat.color); waterMat.color.set('#4f93a0').multiplyScalar(1 - n * 0.6);
  const fx = post.fx, dof0 = fx.dof; fx.golden = 0; fx.clear = 1; fx.sunVis = 0; fx.night = n; fx.focus = camera.position.distanceTo(P.position); fx.dof = view ? 0 : dof0 * 0.6; fx.haze.copy(sc.background);
  post.render(t, sc, camera);
  fx.dof = dof0;
}
/** 村民在家附近慢慢走；跟你說話時停下來看著你 */
function walk(f, dt, t) {
  const m = f.m; let mv = 0;
  if (f.talk) { m.rotation.y = Math.atan2(P.position.x - m.position.x, P.position.z - m.position.z); lookAt(m, P.position.clone().setY(P.position.y + 1.1)); animate(m, dt, 0, t); return; }
  f.wait -= dt;
  if (f.wait <= 0 && !f.target) { const a = Math.random() * 6.28, d = Math.random() * f.rad; f.target = [f.home[0] + Math.cos(a) * d, f.home[1] + Math.sin(a) * d]; }
  if (f.target) {
    const dx = f.target[0] - m.position.x, dz = f.target[1] - m.position.z, d = Math.hypot(dx, dz);
    if (d < 0.15 || f.wait < -8) { f.target = null; f.wait = 3 + Math.random() * 6; }
    else { const s = 1.0 * dt, nx = m.position.x + dx / d * s, nz = m.position.z + dz / d * s; if (blocked(nx, nz) || !onLand(nx, nz)) { f.target = null; f.wait = 2; } else { m.position.x = nx; m.position.z = nz; m.rotation.y = Math.atan2(dx, dz); mv = 1; } }
  }
  m.position.y = footY(m.position.x, m.position.z);
  lookAt(m, Math.hypot(P.position.x - m.position.x, P.position.z - m.position.z) < 3.5 ? P.position.clone().setY(P.position.y + 1.1) : null);
  animate(m, dt, mv, t, 0.8);
}

/* ---------- 互動 ---------- */
const near = (x, z, r) => Math.hypot(P.position.x - x, P.position.z - z) < r;
const nearFolk = () => folk.filter(f => near(f.m.position.x, f.m.position.z, 1.9)).sort((a, b) => Math.hypot(a.m.position.x - P.position.x, a.m.position.z - P.position.z) - Math.hypot(b.m.position.x - P.position.x, b.m.position.z - P.position.z))[0] || null;
const atTrain = () => near(0, 17.6, 1.5);
const atFactory = () => near(0, -10.4, 1.6);
const atDeck = () => near(-15.4, -18.4, 1.6);
const atShrine = () => near(-1.6, 8.6, 1.2);
export function hint() { if (atTrain()) return '搭小火車回燈籠港'; if (atFactory()) return '和黃師傅一起製茶'; const f = nearFolk(); if (f) return `和${f.r.name}聊天`; if (atDeck()) return '用望遠鏡看雲海'; if (atShrine()) return '向土地公問好'; return ''; }
export function handler() { if (atTrain()) return home; if (atFactory()) return makeTea; const f = nearFolk(); if (f) return () => chat(f); if (atDeck()) return clouds; if (atShrine()) return shrine; return null; }
async function home() {
  const T = D().train || {};
  if (await ui.ask(conductor(), pick(T.back || ['要下山回燈籠港了嗎？']), ['回去', '再逛逛'], { keys: true }) !== 0) return;
  ui.closeDialog(); leave();
}
async function chat(f) {
  const r = f.r, s = st(); s.met = s.met || {}; f.talk = true; setExpr(f.m, 'happy', 2);
  try {
    if (!s.met[r.id]) { s.met[r.id] = dayKey(); save(); gesture(f.m, 'wave', 2.2); for (const l of r.first || []) await ui.say(f.sp, l); return; }   // 第一次見面先揮手
    if (r.id === 'tv_chaguan' && s.tea === dayKey() && s.cup) {   // 今天做的茶，茶藝館主人幫你泡一壺
      await ui.say(f.sp, `今天做的${s.cup.grade}${s.cup.name}，我替你泡一壺吧。`);
      if (s.cup.note) await ui.say(f.sp, s.cup.note);
      return;
    }
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
const STEPS = [{ name: '萎凋', intro: '先讓茶菁攤開散掉水氣，我們先答一題。', good: '葉子攤得剛剛好。', soft: '不要緊，茶還能繼續做。' }, { name: '炒菁', intro: '鍋熱了，炒菁之前先答一題。', good: '火候抓得很準。', soft: '火大了一點，下一道再補回來。' }, { name: '揉捻', intro: '最後揉捻成形，再答一題。', good: '揉得緊實漂亮。', soft: '形狀鬆了些，喝起來一樣暖。' }];
/** 製茶廠：每天做一次茶——萎凋、炒菁、揉捻三道工序前各答一題最需要加強的科目，答對題數決定茶的等級 */
async function makeTea() {
  const F = D().factory || {}, shifu = folk.find(f => f.r.id === 'tv_shifu'), sp = shifu ? shifu.sp : { name: '黃師傅', color: '#2f5d46', voice: 220 }, s = st(), S0 = S();
  if (shifu) shifu.talk = true;
  try {
    if (!s.factoryMet) { s.factoryMet = 1; save(); for (const l of F.intro || []) await ui.say(sp, l); }
    if (s.tea === dayKey()) { await ui.say(sp, pick(F.again || ['今天的茶已經做好了，明天再來吧。'])); return; }
    if (await ui.ask(sp, '要一起做今天的茶嗎？三道工序前各答一題你需要加強的科目，答對越多，茶越好。', ['來做茶', '下次吧'], { keys: true }) !== 0) return;
    const sid = weakSid(); if (!sid) { await ui.say(sp, '今天的茶菁還沒準備好，改天再來吧。'); return; }
    await ui.say(sp, `今天的題目是${(TA.subject(sid) || {}).name || ''}。`);
    let ok = 0; const steps = (F.steps && F.steps.length >= 3 ? F.steps : STEPS).slice(0, 3);
    for (const stp of steps) {
      await ui.say(sp, `【${stp.name}】${stp.intro}`);
      const q = pickQ(sid, 3); if (!q) break;
      const a = await ui.ask(sp, q.q, q.o, { answer: q.a, abc: true, keys: true, html: true }), good = a === q.a; record(q, good);
      if (good) { ok++; Audio.sfx('ok'); if (stp.good) await ui.say(sp, stp.good); } else { Audio.sfx('bad'); await ui.explain(sp, q); if (stp.soft) await ui.say(sp, stp.soft); }
    }
    const grade = ((F.grades || []).find(g => ok >= g.min) || { grade: ['參等', '貳等', '頭等', '特等'][ok] || '參等' }).grade, pool = (F.teas || []).filter(x => x.grade === grade), tea = pick(pool.length ? pool : F.teas && F.teas.length ? F.teas : [{ grade, name: '山嵐烏龍', note: '', advice: '' }]);
    s.tea = dayKey(); s.teas = (s.teas || 0) + 1; s.cup = { grade, name: tea.name, note: tea.note || '' };
    const first = s.teas === 1, bells = 200 + ok * 100; S0.bells += bells; if (first) TA.S.gems = (TA.S.gems || 0) + 20;
    S0.stats = S0.stats || {}; S0.stats.teaMade = (S0.stats.teaMade || 0) + 1; save(); TA.emit && TA.emit('wallet');
    Audio.sfx('catch'); ui.emote(P, '🍵', '#7ab87a');
    if (shifu && ok >= 3) gesture(shifu.m, 'cheer', 2.5);   // 三題全對，黃師傅也忍不住歡呼
    await ui.say(sp, `三道工序完成，答對 ${ok} 題。今天的茶是——<b>${grade}・${tea.name}</b>`, { html: true });
    if (tea.note) await ui.say(sp, tea.note);
    if (tea.advice) await ui.say(sp, `讀書的提醒：${tea.advice}`);
    memo.add(`在雲霧茶村做出${grade}的${tea.name}`, tea.advice || '', { key: 'tv_tea:' + dayKey(), icon: '🍵' });
    await ui.say(sp, `${pick(F.thanks || ['茶葉收好，讀書也慢慢來。'])}（製茶廠送你 ${bells} 鈴錢${first ? '、第一次做茶再送 20 潮晶' : ''}）`);
  } finally { if (shifu) shifu.talk = false; }
}
/** 雲海觀景台：免費望遠鏡，鏡頭飛到崖邊看雲海；看到的句子依時段變化 */
async function clouds() {
  const C = D().clouds || {}, h = hourNow.value, part = h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'dusk' : 'night';
  const yun = folk.find(f => f.r.id === 'tv_yun'), sp = { name: '望遠鏡', color: '#5f6b3a', voice: 200 };
  view = 1; Audio.sfx('open');
  try {
    await ui.say(sp, pick(C[part] && C[part].length ? C[part] : ['崖下的雲海慢慢流動，像一條白色的河。']));
    const s = st(); s.clouds = (s.clouds || 0) + 1; save();
    if (yun && s.clouds === 1) { yun.talk = true; try { await ui.say(yun.sp, '看到了嗎？雲海每一分鐘都不一樣，所以我才一直來。'); } finally { yun.talk = false; } }
  } finally { view = 0; }
}
/** 山路邊的土地公廟 */
async function shrine() {
  ui.emote(P, '🙏', '#c0533a');
  await ui.say({ name: '土地公廟', color: '#c0533a', voice: 200 }, pick(D().shrine && D().shrine.length ? D().shrine : ['小小的廟前擺著一爐香，風吹過山徑，很安靜。']));
}
export const debugEnter = (player, back) => enter(player, back || (() => {}));
export const debug = { folk, player: () => P, boxes };   // 測試用
