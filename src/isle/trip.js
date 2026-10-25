/* 潮汐小島 · 神秘島：在碼頭盡頭用一張潮汐券搭船，到一座隨機主題的小島。
   島上有 8 個資源點，每個點答一題該主題科目的題目，答對就能帶走稀有的魚、蟲、礦石、水果或星之碎片。 */
import * as THREE from 'three';
import { renderer, camera, M, mesh, U, CURVE, bend, TERRAIN, skyU, scene as mainScene } from './engine.js';
import { tuftKit } from './grass.js';
import { loadModel } from './actors.js';
import * as post from './post.js';
import { PIER, flowerGeos, modelClone } from './props.js';
import { animate } from './chars.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { I, S, save, addItem, icon, stars, available, list } from './state.js';
import { pickQ, vocabQ, record, pick } from './quiz.js';
import * as miles from './miles.js';
import * as fieldnote from './fieldnote.js';
import { MATS } from './diy.js';

export const THEMES = [
  { id: 'fish', name: '魚群島', sid: 'english', sea: '#3fb8d8', node: 'fish', desc: '海面滿是魚影，答對英文單字就能釣起稀有的魚。' },
  { id: 'bug', name: '花海島', sid: 'chinese', sea: '#56d2e0', node: 'flower', desc: '花叢裡停著許多昆蟲，答對國文題就能抓到稀有的蟲。' },
  { id: 'rock', name: '礦石島', sid: 'earth', sea: '#4aa8c8', node: 'rock', desc: '島上到處是奇特的岩石，答對地科題就能敲出礦石。' },
  { id: 'fruit', name: '果樹島', sid: 'biology', sea: '#56d2e0', node: 'tree', desc: '結實纍纍的果樹島，答對生物題就能搖下大量水果與樹枝。' },
  { id: 'star', name: '星砂島', sid: 'physics', sea: '#5a7ad8', node: 'star', desc: '傳說流星落下的沙灘，答對物理題就能撿到星之碎片。' }
];
const R = 8.5, SEA = {}, DEEP = {}, NIGHT_SUN = new THREE.Color('#9fb4ff'), NIGHT_SKY = new THREE.Color('#8aa3d6'), NIGHT_GND = new THREE.Color('#414c46');   // 海面與深水的材質依主題快取（水面材質會登記到全域的環境反射清單）
export let inside = false;
let P = null, onExit = null, theme = null, nodes = [], tripScene = null, camPos = new THREE.Vector3(), boatMain = null, savedCurve = 0.0055;
export const tickets = () => S().tickets || 0;
export function addTickets(n) { const s = S(); s.tickets = (s.tickets || 0) + n; save(); }

/* ---------- 碼頭的船（主島） ---------- */
/** 小木船：弧形船身（船頭收尖、船底圓弧）、船舷一圈白色腰線、船裡的木地板與座板、桅杆、三角帆與小旗 */
function hullGeo(col) {
  const N = 16, S = 10, L = 2.3, P = [], C = [], idx = [], base = new THREE.Color(col), dark = base.clone().multiplyScalar(0.72), white = new THREE.Color('#fff6e6'), c = new THREE.Color();
  for (let i = 0; i <= N; i++) {
    const t = i / N, z = -1.0 + t * L, bow = Math.max(0, (t - 0.6) / 0.4), w = 0.52 * Math.sqrt(Math.max(0, 1 - bow * bow)) * (t < 0.1 ? 0.88 + t * 1.2 : 1);
    const keel = 0.03 + bow * bow * 0.2, top = 0.42 + bow * bow * 0.14;   // 船頭翹起來
    for (let j = 0; j <= S; j++) {
      const a = j / S * Math.PI, x = -Math.cos(a) * w, y = top - Math.sin(a) * (top - keel);
      P.push(x, y, z);
      c.copy(y > top - 0.07 ? white : y > top - 0.1 ? dark : base).lerp(dark, Math.max(0, 0.25 - (y - keel)) * 1.6); C.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < S; j++) { const a = i * (S + 1) + j, b = a + S + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const st = P.length / 3; P.push(0, 0.24, -1.0); C.push(base.r, base.g, base.b);   // 船尾板（扇形補起來）
  for (let j = 0; j < S; j++) idx.push(st, j + 1, j);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function boat(col) {
  if (!col) { const pm = modelClone('PROPMODELS', 'boat'); if (pm) { const g = new THREE.Group(); g.add(pm); g.traverse(o => { o.frustumCulled = false; }); return g; } }   // 碼頭的船：Codex 重建的白藍小木船
  const g = new THREE.Group(), hc = col || '#c99a62';
  g.add(mesh(hullGeo(hc), M('#ffffff', { vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }), 0, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.66, 0.04, 1.5), M('#b8875a'), 0, 0.17, -0.05, { noCast: true }));   // 船底木板
  for (let k = 0; k < 4; k++) g.add(mesh(new THREE.BoxGeometry(0.012, 0.045, 1.5), M('#8f6440'), -0.25 + k * 0.17, 0.172, -0.05, { noCast: true }));   // 木板縫
  g.add(mesh(new THREE.BoxGeometry(0.94, 0.06, 0.26), M('#a87a48'), 0, 0.36, -0.45), mesh(new THREE.BoxGeometry(0.9, 0.06, 0.22), M('#a87a48'), 0, 0.36, 0.55));   // 兩塊座板
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.9, 8), M('#8a5a3b'), 0, 1.15, 0.2));   // 桅杆
  const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, 0.26, 0, 1.95, 0.26, 0, 0.55, -0.75], 3)); sail.computeVertexNormals();
  const sm = mesh(sail, M('#fff3dc', { side: THREE.DoubleSide, roughness: 0.95 }), 0.04, 0, 0); g.add(sm);   // 三角帆
  const flag = new THREE.BufferGeometry(); flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 2.08, 0.22, 0, 1.94, 0.22, 0, 2.01, 0.52], 3)); flag.computeVertexNormals();
  g.add(mesh(flag, M('#ef6f5e', { side: THREE.DoubleSide }), 0, 0, 0, { noCast: true }));   // 小旗
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.075, 0.05, 8), M('#3a3f4a'), 0, 0.585, 0.33, { noCast: true }), mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), M('#3a3f4a'), 0, 0.43, 0.33, { noCast: true }), mesh(new THREE.SphereGeometry(0.065, 10, 8), M('#ffe2a0', { emissive: new THREE.Color('#ffc870'), emissiveIntensity: 1.4 }), 0, 0.5, 0.33, { noCast: true }));   // 桅杆下的小提燈（晚上在泛光裡亮起來）
  g.traverse(o => { o.frustumCulled = false; }); return g;
}
export function init(player, exitCb) {
  P = player; onExit = exitCb;
  boatMain = boat(); boatMain.position.set(PIER.x + PIER.hw + 0.75, 0.0, PIER.z + PIER.len - 0.9); mainScene.add(boatMain);   // 停在碼頭東側（碼頭寬度依模型而定）
}
const atDock = () => P && !inside && Math.hypot(P.position.x - PIER.x, P.position.z - (PIER.z + PIER.len - 0.6)) < 1.2;
export const hint = () => (atDock() ? `搭船去神秘島（潮汐券 ${tickets()} 張）` : '');
export function handler() { return atDock() ? depart : null; }
const CAPTAIN = { name: '船長海鷗', color: '#5ab0c8', voice: 380 };
async function depart() {
  if (!tickets()) { await ui.say(CAPTAIN, '想去神秘島嗎？要一張潮汐券喔。潮汐券可以用潮汐里程兌換，阿潮的商店也賣。'); return; }
  const i = await ui.ask(CAPTAIN, `用一張潮汐券（你有 ${tickets()} 張）出發去神秘島嗎？每次會隨機前往一座主題島！`, ['出發！', '下次吧']);
  if (i !== 0) return;
  const last = S().lastTrip, pool = THEMES.filter(t => t.id !== last && (t.id === 'fish' ? vocabQ() || pickQ('english', 3) : pickQ(t.sid, 3)));
  if (!pool.length) { await ui.say(CAPTAIN, '今天海象不太好，先不要出航吧。'); return; }
  const s = S(); s.tickets--; s.stats = s.stats || {}; s.stats.trips = (s.stats.trips || 0) + 1;
  theme = pick(pool); s.lastTrip = theme.id; save(); ui.closeDialog(); enter();
  await ui.say(CAPTAIN, `抵達「${theme.name}」！${theme.desc}島上有 8 個地方可以探索，探索完回到船邊就能回家。`);
}

/* ---------- 神秘島場景 ---------- */
function rnd(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function build() {
  const sky = new THREE.Color('#cfe8ff'); const sc = new THREE.Scene(); sc.background = sky; sc.fog = new THREE.Fog(sky, 32, 80);
  const hemi = new THREE.HemisphereLight('#e8f2ff', '#8ab868', 1.1); sc.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e0', 2.3);
  // 夜空的星星（晚上才出現）
  const SN = 420, sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { const a = Math.random() * 6.283, e = 0.15 + Math.random() * 1.2, d = 70; sp.set([Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff8e0', size: 0.35, transparent: true, opacity: 0, depthWrite: false, fog: false })); sc.add(stars);
  sc.userData.amb = { hemi, sun, stars }; sun.position.set(8, 16, 6); sun.castShadow = true; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); sc.add(sun, sun.target);
  // 海：和主島一樣的水面材質（波紋、反光），顏色依主題
  const sea = new THREE.Mesh(new THREE.CircleGeometry(90, 64), SEA[theme.id] || (SEA[theme.id] = bend(new THREE.MeshStandardMaterial({ color: theme.sea, roughness: 0.12, transparent: true, opacity: 0.78 }), 'water'))); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.05; sea.receiveShadow = true; sc.add(sea);
  sc.add(ground());
  const deep = new THREE.Mesh(new THREE.CircleGeometry(90, 48), DEEP[theme.id] || (DEEP[theme.id] = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.sea).multiplyScalar(0.72), fog: true }))); deep.userData.base = new THREE.Color(theme.sea).multiplyScalar(0.72); sc.userData.deep = deep; deep.rotation.x = -Math.PI / 2; deep.position.y = -0.9; sc.add(deep);   // 海面下方的深水色
  const dock = boat('#ef6f5e'); dock.position.set(0, -0.05, R + 1.9); sc.add(dock);
  const r = rnd((Date.now() % 2147483646) + 1);
  nodes = [];
  for (let k = 0; k < 400 && nodes.length < 8; k++) {
    const a = r() * Math.PI * 2, d = 1.5 + r() * (theme.node === 'fish' ? 1.0 : R - 3), fish = theme.node === 'fish';
    const x = Math.cos(a) * (fish ? R + 3.5 : d), z = Math.sin(a) * (fish ? R + 3.5 : d);
    if (z > R - 1 && Math.abs(x) < 2.5) continue;
    if (nodes.some(n => Math.hypot(n.x - x, n.z - z) < 2.4)) continue;
    const g = node(theme.node, r); g.position.set(x, fish ? -0.02 : 0.35, z); sc.add(g);
    nodes.push({ x, z, bx: x, bz: z, g, done: false, reach: fish ? 3.6 : 1.4 });
  }
  sc.traverse(o => { if (o.isMesh) { o.castShadow = o !== sea; o.receiveShadow = true; o.frustumCulled = false; } });
  tufts(sc, r); dress(sc, r);
  return sc;
}
/* ---------- 島的地形：草地、沙灘、淺灘，海岸線有一點起伏（不是正圓） ---------- */
const edge = (a, k) => Math.sin(a * 3 + k) * 0.28 + Math.sin(a * 5 - k * 2) * 0.16 + Math.sin(a * 9 + k * 3) * 0.08;
function ground() {
  const SEG = 96, RING = [0, 0.3, 0.55, 0.75, 0.88, 0.94, 1.0, 1.04, 1.1, 1.17, 1.26, 1.36], k = (theme.id.charCodeAt(0) % 7) * 0.9;
  const rock = theme.id === 'rock', star = theme.id === 'star';
  const G1 = new THREE.Color(rock ? '#9aa56e' : '#86b03a'), G2 = new THREE.Color(rock ? '#7e8a5a' : '#64962c'), SAND = new THREE.Color(star ? '#ece4ff' : '#f6e7c0'), SANDW = new THREE.Color(star ? '#c8bce8' : '#d9c08a'), BED = new THREE.Color('#9fd8c8'), DEEP = new THREE.Color(theme.sea).multiplyScalar(0.72);
  const P = [], C = [], col = new THREE.Color();
  // 每一圈：半徑（相對於草地邊緣 Rg）、高度、顏色
  const ring = (a, j) => {
    const Rg = R - 0.9 + edge(a, k) * 0.9, Rs = R + 1.15 + edge(a, k + 1) * 0.5;   // 草地邊緣、沙灘外緣（走得到的範圍 R+0.9 以內都是平的）
    const t = RING[j]; let rad, y;
    if (t <= 0.94) { rad = Rg * t / 0.94; y = 0.35; const x = Math.cos(a) * rad, z = Math.sin(a) * rad; col.copy(G1).lerp(G2, 0.35 + 0.35 * Math.sin(x * 0.43 + z * 0.31) * Math.sin(x * 0.27 - z * 0.39)).offsetHSL(0, 0, (Math.sin(x * 1.7 + z * 2.3) + Math.sin(x * 0.6 - z * 1.1)) * 0.012); }
    else if (t <= 1.04) { const u = (t - 0.94) / 0.1; rad = Rg + (Rs - Rg) * u; y = 0.35 - u * 0.07; col.copy(SAND).lerp(G1, 0.35 * (1 - u)); }   // 草地和沙灘交界混一點草色
    else if (t <= 1.1) { const u = (t - 1.04) / 0.06; rad = Rs + u * 0.6; y = 0.28 - u * 0.3; col.copy(SAND).lerp(SANDW, u); }   // 濕沙往水裡斜下去
    else { const u = (t - 1.1) / 0.26; rad = Rs + 0.6 + u * 3.2; y = -0.02 - u * 0.86; col.copy(SANDW).lerp(BED, Math.min(1, u * 1.4)).lerp(DEEP, Math.max(0, u - 0.55) / 0.45); }   // 淺灘：水底慢慢變藍綠，最外圈接到深水色
    return [Math.cos(a) * rad, y, Math.sin(a) * rad, col.r, col.g, col.b];
  };
  const V = [];
  for (let i = 0; i <= SEG; i++) { const a = i / SEG * Math.PI * 2; V.push(RING.map((_, j) => ring(a, j))); }
  const put = v => { P.push(v[0], v[1], v[2]); C.push(v[3], v[4], v[5]); };
  for (let i = 0; i < SEG; i++) for (let j = 0; j < RING.length - 1; j++) { const a = V[i][j], b = V[i + 1][j], c = V[i + 1][j + 1], d = V[i][j + 1]; put(a); put(b); put(c); put(a); put(c); put(d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, TERRAIN); m.receiveShadow = true; m.userData.ground = true; m.userData.own = true; return m;
}
/** 草叢：和主島同一種草（tuftKit），只長在草地上；資源點與上岸的路留空 */
function tufts(sc, r) {
  const per = S().settings && S().settings.lowPerf ? 4 : 9, pts = [], k = (theme.id.charCodeAt(0) % 7) * 0.9;
  for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) for (let n = 0; n < per; n++) {
    const px = x + r() - 0.5, pz = z + r() - 0.5, a = Math.atan2(pz, px), d = Math.hypot(px, pz);
    if (d > R - 1.2 + edge(a, k) * 0.9) continue;
    if (pz > R - 3.5 && Math.abs(px) < 0.9) continue;   // 從船走上來的那條路
    if (nodes.some(nd => Math.hypot(nd.x - px, nd.z - pz) < 0.6)) continue;
    const clump = 0.5 + 0.5 * Math.sin(px * 0.55 + 1.3) * Math.sin(pz * 0.47 - 0.7); if (r() > 0.45 + clump * 0.6) continue;
    pts.push([px, pz, 0.55 + clump * 0.6 + r() * 0.3, r() * 6.28]);
  }
  if (!pts.length) return;
  const kit = tuftKit(), im = new THREE.InstancedMesh(kit.geo, kit.mat, pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
  pts.forEach(([x, z, s, rot], i) => { m4.compose(v.set(x, 0.33, z), q.setFromEuler(e.set(0, rot, 0)), s3.setScalar(s)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setRGB(0.85 + r() * 0.25, 0.92 + r() * 0.16, 0.75 + r() * 0.2)); });
  im.receiveShadow = true; im.frustumCulled = false; im.raycast = () => {}; im.userData.own = true; sc.add(im);
}
/** 岸邊幾棵椰子樹與礁石（主島已經載入過的模型，直接複製） */
function dress(sc, r) {
  const k = (theme.id.charCodeAt(0) % 7) * 0.9, spots = [];
  for (let i = 0; i < 40 && spots.length < 9; i++) {
    const a = r() * Math.PI * 2; if (Math.sin(a) > 0.75) continue;   // 船的那一側（畫面前方）不擺，免得擋住
    if (spots.some(s => Math.abs(Math.atan2(Math.sin(s.a - a), Math.cos(s.a - a))) < 0.45)) continue;
    spots.push({ a, palm: spots.length < 4 });
  }
  const put = (id, kind, h, list) => loadModel(id, kind).then(gl => {
    if (!tripScene || tripScene !== sc) return;   // 已經離開了
    const box = new THREE.Box3().setFromObject(gl.scene), H = box.max.y - box.min.y || 1;
    list.forEach(sp => {
      const m = gl.scene.clone(true), s = h * (0.85 + r() * 0.3) / H; m.scale.setScalar(s); m.rotation.y = r() * 6.28;
      const d = sp.palm ? R - 0.6 + edge(sp.a, k) * 0.9 : R + 1.6 + edge(sp.a, k + 1) * 0.5;
      m.position.set(Math.cos(sp.a) * d, (sp.palm ? 0.33 : -0.15) - box.min.y * s, Math.sin(sp.a) * d);
      if (nodes.some(nd => Math.hypot(nd.x - m.position.x, nd.z - m.position.z) < 1.6)) return;
      m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.userData.shared = true; } }); sc.add(m);
    });
  }).catch(() => {});
  put('prop_palm', 'pine', 3.4, spots.filter(s => s.palm)); put('prop_shorerock', 'stone', 0.7, spots.filter(s => !s.palm));
}
const FMAT = { stem: M('#4f9a3a'), core: M('#ffcf3a', { roughness: 0.6 }), heads: {}, head(c) { return this.heads[c] || (this.heads[c] = M(c, { roughness: 0.7, side: THREE.DoubleSide })); } };   // 主島的花材質（'flower'）是給 InstancedMesh 用的，這裡是一般網格
function node(kind, r) {
  const g = new THREE.Group();
  if (kind === 'fish') { const m = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: '#06283c', transparent: true, opacity: 0.62, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.scale.set(0.6, 1, 1); g.add(m); }
  else if (kind === 'flower') {   // 一叢主島的野花（放大一點，看得出是資源點）
    const F = flowerGeos();
    ['#ff7a9a', '#ffd23f', '#ffffff', '#b9a2ff', '#ff9a4a', '#ffffff', '#ff8fb1'].forEach((c, i) => {
      const a = i * 0.9 + r() * 0.4, d = i ? 0.2 + (i % 3) * 0.12 : 0, s = 2.3 + r() * 0.6, f = new THREE.Group(); f.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); f.rotation.set((r() - 0.5) * 0.3, r() * 6.28, (r() - 0.5) * 0.3); f.scale.setScalar(s);
      f.add(mesh(F.stemG, FMAT.stem, 0, 0, 0, { noCast: true }), mesh(F.headG, FMAT.head(c), 0, 0, 0), mesh(F.coreG, FMAT.core, 0, 0, 0, { noCast: true })); f.children.forEach(o => { o.userData.shared = true; }); g.add(f);
    }); const bfly = mesh(new THREE.BoxGeometry(0.22, 0.02, 0.12), M('#ff9a3a'), 0, 0.75, 0); g.add(bfly); g.userData.fly = bfly; }
  else if (kind === 'rock') { const m = mesh(new THREE.IcosahedronGeometry(0.55, 0), M(pick(['#bdb6aa', '#a8a0b8', '#c8b8a0']), { flatShading: true }), 0, 0.3, 0); m.scale.set(1.2, 0.8, 1); m.rotation.set(r(), r() * 6, r()); g.add(m); g.add(mesh(new THREE.OctahedronGeometry(0.12, 0), M('#b9e0ff', { emissive: new THREE.Color('#7fd0ff'), emissiveIntensity: 0.6 }), 0.25, 0.6, 0.2)); }
  else if (kind === 'tree') { g.add(mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.3, 7), M('#8a5a3b'), 0, 0.65, 0)); [[0, 1.85, 0, 0.9], [0.45, 1.55, 0.2, 0.62], [-0.42, 1.6, -0.15, 0.6]].forEach(([a, b, c, rr]) => g.add(mesh(new THREE.IcosahedronGeometry(rr, 1), M('#58b34d'), a, b, c))); for (let i = 0; i < 5; i++) { const a = i * 1.3; g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), M('#ff8a3d'), Math.cos(a) * 0.75, 1.5 + (i % 2) * 0.3, Math.sin(a) * 0.75)); } }
  else { const m = mesh(new THREE.OctahedronGeometry(0.2, 0), M('#ffe14a', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 1.2 }), 0, 0.35, 0); g.add(m); const l = new THREE.PointLight('#ffe08a', 1.2, 3); l.position.y = 0.5; g.add(l); }
  g.traverse(o => { o.frustumCulled = false; });
  if (kind === 'tree' || kind === 'rock') upgrade(g, kind, r);
  return g;
}
/** 果樹換成主島的闊葉樹模型＋橘色果實；岩石換成大石頭模型＋發光的礦石 */
function upgrade(g, kind, r) {
  const id = kind === 'tree' ? 'prop_tree' : 'prop_boulder', h = kind === 'tree' ? 2.5 : 0.8, rot = r() * 6.28, sc0 = 0.9 + r() * 0.2;
  loadModel(id, kind === 'tree' ? 'sway' : 'stone').then(gl => {
    const box = new THREE.Box3().setFromObject(gl.scene), H = box.max.y - box.min.y || 1, s = h * sc0 / H, m = gl.scene.clone(true);
    m.scale.setScalar(s); m.rotation.y = rot; m.position.y = -box.min.y * s;   // 資源點群組的原點就在地面上
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.userData.shared = true; } });
    const keep = [];
    if (kind === 'tree') { for (let i = 0; i < 6; i++) { const a = i * 1.05 + rot, f = mesh(new THREE.SphereGeometry(0.11, 10, 8), M('#ff8a3d'), Math.cos(a) * 0.55, 1.15 + (i % 3) * 0.28, Math.sin(a) * 0.55); keep.push(f); } }
    else keep.push(...g.children.filter(c => c.geometry && c.geometry.type === 'OctahedronGeometry').map(c => { c.position.set(0.12, h * sc0 + 0.06, 0.1); return c; }));   // 礦石留著，擺到石頭上
    g.children.slice().forEach(c => g.remove(c)); g.add(m, ...keep);
  }).catch(() => {});
}
function enter() {
  ui.iris(); tripScene = build(); inside = true; savedCurve = U.uCurve.value; U.uCurve.value = 0;
  tripScene.add(P); P.position.set(0, 0.35, R + 0.4); P.rotation.y = Math.PI;
  camPos.set(0, 14.5, R + 16); document.body.classList.add('in-trip');
  Audio.sfx('open');
}
function leave() {
  ui.iris();
  inside = false; U.uCurve.value = savedCurve || CURVE; document.body.classList.remove('in-trip');
  mainScene.add(P); onExit && onExit();
  if (tripScene) tripScene.traverse(o => {   // 這趟自己建的幾何、草叢的實例資料與陰影貼圖；共用的模型、花、草與材質不動
    if (o.isLight && o.shadow && o.shadow.map) o.shadow.dispose();
    if (o.isPoints) { o.geometry.dispose(); o.material.dispose(); return; }   // 這趟的星空
    if (o === P || !o.isMesh || o.userData.shared) return;
    if (o.isInstancedMesh) o.dispose(); else o.geometry.dispose();
  });
  tripScene = null; Audio.sfx('open');
}
/* ---------- 每幀 ---------- */
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  if (moving && !locked) {
    ix /= len; iz /= len; const sp = run ? 4.8 : 2.8 * (0.3 + 0.7 * Math.min(1, len)), nx = P.position.x + ix * sp * dt, nz = P.position.z + iz * sp * dt;
    const r = Math.hypot(nx, nz), blocked = nodes.some(n => !n.done && theme.node !== 'fish' && theme.node !== 'star' && Math.hypot(n.x - nx, n.z - nz) < (theme.node === 'tree' ? 0.45 : 0.6));
    if (r < R + 0.9 && !blocked) { P.position.x = nx; P.position.z = nz; }
    P.rotation.y = Math.atan2(ix, iz);
  }
  animate(P, dt, moving && !locked ? (run ? 2 : 1) : 0, t);
  nodes.forEach((n, i) => { if (n.g.userData.fly) { n.g.userData.fly.position.y = 0.75 + Math.sin(t * 3 + i) * 0.06; n.g.userData.fly.rotation.y = t * 2; } if (theme.node === 'star' && !n.done) n.g.rotation.y = t; if (theme.node === 'fish') { n.x = n.bx + Math.sin(t * 0.7 + i) * 0.5; n.z = n.bz + Math.cos(t * 0.6 + i) * 0.5; n.g.position.x = n.x; n.g.position.z = n.z; } });
  const tx = P.position.x * 0.6, tz = P.position.z * 0.6, za = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.8 : 1;
  camPos.lerp(new THREE.Vector3(tx, 14.5 * za, tz + 16 * za), Math.min(1, dt * 3));
  camera.position.copy(camPos); camera.lookAt(tx, 0.4, tz);
  // 時間跟著主島走：天空與霧用主島地平線的顏色，晚上主光變成淡藍的月光、星星出來
  const n = skyU.night.value, amb = tripScene.userData.amb;
  tripScene.background.copy(skyU.bot.value); tripScene.fog.color.copy(skyU.bot.value);
  amb.hemi.intensity = 1.1 * (1 - n * 0.45); amb.hemi.color.set('#e8f2ff').lerp(NIGHT_SKY, n); amb.hemi.groundColor.set('#8ab868').lerp(NIGHT_GND, n); amb.sun.intensity = 2.3 * (1 - n * 0.72);   // 夜裡的環境光偏藍、不要暗到看不清楚島上
  amb.sun.color.set('#fff4e0').lerp(NIGHT_SUN, n); amb.stars.material.opacity = Math.max(0, n * 1.2 - 0.2); tripScene.userData.deep.material.color.copy(tripScene.userData.deep.userData.base).multiplyScalar(1 - n * 0.6);   // 深水面不受光，晚上自己變暗
  SEA[theme.id].color.set(theme.sea).multiplyScalar(1 - n * 0.55);   // 海面晚上也暗下來（島上的環境光為了看得清楚調得比較亮，海不跟著亮）
  // 和夢境島一樣走後製（泛光、調色、環境光遮蔽、對焦在角色身上的淡景深）
  const fx = post.fx, dof0 = fx.dof; fx.golden = 0; fx.clear = 1; fx.sunVis = 0; fx.night = n; fx.focus = camera.position.distanceTo(P.position); fx.dof = dof0 * 0.6; fx.haze.copy(tripScene.background);
  post.render(t, tripScene, camera);
  fx.dof = dof0;
}
const nearNode = () => nodes.find(n => !n.done && Math.hypot(n.x - P.position.x, n.z - P.position.z) < n.reach);
const nearBoat = () => Math.hypot(P.position.x, P.position.z - (R + 1.4)) < 1.6;
export function tripHint() { if (nearBoat()) return '搭船回家'; const n = nearNode(); return n ? ({ fish: '釣起魚影', flower: '捕捉花上的蟲', rock: '敲開岩石', tree: '搖樹', star: '撿星之碎片' })[theme.node] : ''; }
export function tripHandler() { if (nearBoat()) return home; const n = nearNode(); return n ? () => explore(n) : null; }
async function home() {
  const left = nodes.filter(n => !n.done).length;
  const i = await ui.ask(CAPTAIN, left ? `還有 ${left} 個地方沒探索，要回潮汐小島了嗎？` : '探索完了！要回潮汐小島了嗎？', ['回家', '再逛逛']);
  if (i !== 0) return; ui.closeDialog(); leave();
}
function question() { if (theme.id === 'fish') return vocabQ() || pickQ('english', 3); return pickQ(theme.sid, 3); }
async function explore(n) {
  const q = question(); if (!q) return;
  const SP = { name: theme.name, color: '#5ab0c8', voice: 520 };
  const i = await ui.ask(SP, q.q, q.o, { answer: q.a, abc: true, keys: true, html: true }), ok = i === q.a; record(q, ok);
  n.done = true; n.g.visible = false;
  if (!ok) {   // 答錯不是白跑一趟：生物記進觀察筆記，其他資源點留下一點基本材料
    Audio.sfx('bad'); await ui.explain(SP, q);
    const s = S(); s.mats = s.mats || {};
    if (theme.id === 'fish' || theme.id === 'bug') { const sp = rare(theme.id), noted = sp && fieldnote.add(theme.id, sp.id, theme.id === 'fish' ? 'vocab' : theme.sid); await ui.say(SP, noted ? `${sp.name}溜走了……${fieldnote.told}` : '這裡的寶物溜走了……換個地方試試吧。'); }
    else { const m = theme.id === 'rock' ? 'stone' : theme.id === 'fruit' ? 'branch' : 'shell'; s.mats[m] = (s.mats[m] || 0) + 1; save(); await ui.say(SP, `寶物溜走了，只撿到 1 個${MATS[m]}。換個地方試試吧。`); }
    return;
  }
  if (theme.id !== 'fish' && theme.id !== 'bug') Audio.sfx('catch'); await reward(SP);
  await challenge.keepGoing(SP, q);
}
function rare(k) {
  const now = available(k).filter(x => x.rarity >= 3);
  if (now.length) {   // 先抽稀有度（三星 70%、四星 25%、五星 5%；這個時段沒有的等級往下併），再抽那一級的物種
    const by = r => now.filter(x => Math.min(5, x.rarity) === r), x = Math.random() * 100, want = x < 5 ? 5 : x < 30 ? 4 : 3;
    for (let r = want; r >= 3; r--) { const g = by(r); if (g.length) return pick(g); }
    return pick(now);
  } const any = list(k).filter(x => x.rarity >= 3 && !x.weather); return any.length ? pick(any) : pick(list(k)); }
async function reward(SP) {
  const s = S(); s.mats = s.mats || {};
  if (theme.id === 'fish' || theme.id === 'bug') {
    const k = theme.id, sp = rare(k); if (!sp) return;
    const first = !s.dex[k][sp.id]; s.dex[k][sp.id] = s.dex[k][sp.id] || Date.now(); const room = addItem({ k, id: sp.id }); save(); miles.add(k);
    await ui.card({ pocket: room, icon: icon(sp.id, k), title: `${k === 'fish' ? '釣到了' : '抓到了'}${sp.name}！`, extra: `<span class="stars">${stars(sp.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}${room ? '' : '<em>口袋滿了，只好放牠走。</em>'}` });
  } else if (theme.id === 'rock') {
    const ore = Math.random() < 0.6 && addItem({ k: 'ore', id: 'ore_unknown' });
    if (!ore) { s.mats.iron = (s.mats.iron || 0) + 2; s.mats.stone = (s.mats.stone || 0) + 2; }
    save(); await ui.say(SP, ore ? '敲出一塊未鑑定的礦石！回去交給岳鑑定吧。' : '敲出 2 個鐵塊和 2 顆石頭！');
  } else if (theme.id === 'fruit') {
    s.mats.fruit = (s.mats.fruit || 0) + 3; s.mats.branch = (s.mats.branch || 0) + 2; save(); await ui.say(SP, '掉下 3 個橘子和 2 根樹枝！');
  } else { s.stars = s.stars || { book: {}, frag: 0 }; s.stars.frag = (s.stars.frag || 0) + 2; save(); await ui.say(SP, '撿到 2 顆星之碎片！'); }
}
export const debugEnter = id => { theme = THEMES.find(t => t.id === id); enter(); };
