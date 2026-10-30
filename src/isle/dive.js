/* 潮汐小島 · 潛水（v9.0）：游到海面冒泡泡的潛點按 E，潛進一小片海底——淺灘、海草床、珊瑚礁或外海深處（swim.js 決定是哪一種）。
   - 方向鍵在水裡游（Shift 游得快，但會嚇跑游得快的生物）、空白鍵往上踢一下，放開會慢慢沉回離海底約一公尺。
   - 每次遇到 3–4 種當下出沒的海洋生物（data/marine.js：棲地、月份、時刻、潮位）。游到旁邊按 E 答一題生物或地科題：
     答對就帶回一隻、登錄圖鑑；保育類、珊瑚、硨磲貝與鸚鵡螺只拍照記錄，照片直接送進博物館的海洋館。
   - 氧氣大約 90 秒（答題時不算）。快用完、或附近沒有生物時按 E，就浮上水面回到潛點。
   - 水下的光：從下往上看的海面波光、白天斜射的光柱、海底的焦散光紋、漂浮的海雪、魚群與自己吐的泡泡；夜裡潛水時頭燈亮起。
   模型在 data/marinemodels.js 與 data/reefmodels.js（Codex 製作）。 */
import * as THREE from 'three';
import { camera, U, M, bend, CURVE, scene as mainScene } from './engine.js';
import { animate, setExpr } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as post from './post.js';
import { I, S, save, addItem, icon, stars, available, photoOnly } from './state.js';
import { pickQU, pickQ, record, fairSec } from './quiz.js';
import * as challenge from './challenge.js';
import * as miles from './miles.js';
import * as feel from './feel.js';
import * as fieldnote from './fieldnote.js';
import * as tide from './tide.js';

export let inside = false;
const DIVE = { name: '海底', color: '#2f86b8', voice: 520 };
const AIR = 90, R = 14;   // 氧氣（秒）、可以游的範圍（公尺）
export const HAB = {
  shallow: { name: '淺灘', sand: '#e8d8a8', grass: 0, water: '#62cadb', depth: 4.6, fog: 0.05, deco: [['rock_b', 5], ['rock_a', 1], ['sea_urchins', 3], ['seagrass_patch', 3], ['anemone_bed', 3], ['coral_round', 1]], fish: ['#ffd84a', '#7fd0ff'] },
  seagrass: { name: '海草床', sand: '#d2c690', grass: 1, water: '#4cb9a6', depth: 5.2, fog: 0.055, deco: [['seagrass_patch', 14], ['rock_b', 3], ['anemone_bed', 1], ['sea_urchins', 1]], fish: ['#c8e070', '#f0f0e0'] },
  reef: { name: '珊瑚礁', sand: '#ecdfbc', grass: 0, water: '#33aad6', depth: 6.6, fog: 0.045, deco: [['coral_table', 3], ['coral_branch', 6], ['coral_round', 4], ['rock_a', 3], ['anemone_bed', 3], ['sea_urchins', 2]], fish: ['#ff9a3a', '#4aa0ff'] },
  deep: { name: '外海深處', sand: '#7f8189', grass: 0, water: '#17568e', depth: 10, fog: 0.075, deco: [['rock_a', 5], ['rock_b', 4], ['coral_round', 1], ['sea_urchins', 2]], fish: ['#c0d8f0', '#8090a8'] }
};
let P = null, ctx = null, SP = null, H = null, sc = null, savedCurve = CURVE, hud = null;
let air = AIR, kick = 0, pace = 0, lean = 0, warned = false, found = 0, bubT = 1, t0 = 0;
const own = [], creatures = [], decos = [], rays = [], bubbles = [], schools = [];
let bed = null, caus = null, surf = null, snow = null, dome = null, hemi = null, sun = null, lamp = null, fill = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const O = x => (own.push(x), x);   // 這個場景自己建立的幾何與材質：離開時釋放（模型共用的材質不動）

export function init(c) { ctx = c; P = c.player; }

/* ---------- 海底地形 ---------- */
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return (hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u) * (1 - v) + (hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u) * v; }
let seed = 0;
/** 海底的高度（場景座標；水面在 H.depth） */
export function bedY(x, z) { const sx = x + seed, sz = z - seed; return 0.32 * Math.sin(sx * 0.31 + 1.3) * Math.cos(sz * 0.27) + 0.22 * (vnoise(sx * 0.35, sz * 0.35) - 0.5) + 0.08 * Math.sin((sx + sz) * 0.9) + 0.05 * Math.max(0, Math.hypot(x, z) - 15); }

/* ---------- 共用的著色器片段：會動的格狀光紋（焦散、海面波光） ---------- */
const CELL = `vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
  float cell(vec2 p, float t){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = h2(i + g); o = 0.5 + 0.45 * sin(t + 6.2831 * o); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return d2 - d1; }`;
const WV = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const CAUS_F = `uniform float uTime; uniform float uK; uniform vec3 uCol; uniform vec3 uCam; uniform float uFog; varying vec3 vW; ${CELL}
  void main(){ vec2 p = vW.xz * 0.8; p += 0.35 * sin(p.yx * 1.7 + uTime * 0.6);   // 扭曲：光紋彎彎曲曲
    float a = cell(p, uTime * 0.8), b = cell(p * 1.3 + 7.1, uTime * 1.05);
    float c = pow(1.0 - smoothstep(0.0, 0.08, a), 2.0) * pow(1.0 - smoothstep(0.0, 0.3, b), 1.5) * 1.6 + pow(1.0 - smoothstep(0.0, 0.06, b), 2.0) * 0.25;
    c *= 0.35 + 0.65 * smoothstep(0.25, 0.75, sin(vW.x * 0.21 + uTime * 0.05) * sin(vW.z * 0.17 - uTime * 0.04) * 0.5 + 0.5);   // 一片亮、一片暗
    float d = length(vW - uCam) * uFog; gl_FragColor = vec4(uCol * c * uK * exp(-d * d), 1.0); }`;
const SURF_F = `uniform float uTime; uniform vec3 uCol; uniform vec3 uHi; uniform vec3 uCam; uniform vec3 uFar; varying vec3 vW; ${CELL}
  void main(){ vec2 p = vW.xz * 0.32 + vec2(uTime * 0.05, uTime * 0.03); float c = cell(p, uTime * 0.6), l = 1.0 - smoothstep(0.0, 0.2, c);
    float win = 1.0 - smoothstep(3.0, 15.0, length(vW.xz - uCam.xz));   // 正上方亮（光從水面的窗照進來）
    float far = smoothstep(8.0, 30.0, length(vW.xz - uCam.xz));   // 遠處融進水色（不會在畫面上切出一條硬邊）
    gl_FragColor = vec4(mix(mix(uCol, uHi, clamp(l * 0.5 + win * 0.45, 0.0, 1.0)), uFar, far), mix(0.95, 0.0, far)); }`;
const RAY_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const RAY_F = `uniform float uTime; uniform float uK; uniform float uSeed; uniform vec3 uCol; varying vec2 vUv;
  void main(){ float x = abs(vUv.x - 0.5) * 2.0, e = 1.0 - smoothstep(0.15, 1.0, x), f = smoothstep(0.0, 0.9, vUv.y);
    float fl = 0.6 + 0.4 * sin(uTime * 0.7 + uSeed * 6.0 + vUv.y * 2.5); gl_FragColor = vec4(uCol * e * f * fl * uK, 1.0); }`;
let glowTexC = null;
function glowTex() {
  if (glowTexC) return glowTexC;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return (glowTexC = new THREE.CanvasTexture(cv));
}

/* ---------- 模型（第一次建立後複製；保留 userData.anim） ---------- */
const KIT = { mat: (c, o, k) => M(c, o, k), win: () => M('#bfe8ff', { roughness: 0.1 }) }, PROTO = {};
export function model(table, key) {
  const id = table + ':' + key;
  if (!(id in PROTO)) {
    const fac = ((window.TA.ISLE || {})[table] || {})[key];
    try { PROTO[id] = fac ? fac(THREE, KIT) : null; if (PROTO[id]) PROTO[id].traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
    catch (e) { console.warn('海洋模型建立失敗：' + id, e); PROTO[id] = null; }
  }
  const p = PROTO[id]; if (!p) return null;
  const c = p.clone(true); c.userData = Object.assign({}, p.userData); return c;
}
function fallback(sp) { const g = new THREE.Group(); const m = new THREE.Mesh(O(new THREE.SphereGeometry(0.12, 12, 8)), M('#f0a070')); m.scale.set(1, 0.7, 1.6); g.add(m); g.userData.anim = sp.speed ? 'swim' : 'still'; return g; }

/* ---------- 建立場景 ---------- */
function build() {
  sc = new THREE.Scene(); own.length = 0; creatures.length = decos.length = rays.length = bubbles.length = schools.length = 0;
  const night = ctx.night(), dark = 1 - night * 0.82, W = new THREE.Color(H.water).multiplyScalar(dark);
  const FOG = W.clone().lerp(new THREE.Color('#1d5f9a').multiplyScalar(dark), 0.35);
  sc.background = FOG.clone().multiplyScalar(0.8); sc.fog = new THREE.FogExp2(FOG, H.fog * 1.25 * (1 + night * 0.6));
  // 背景：往上亮、往下暗的水色
  const DU = { top: { value: W.clone().lerp(new THREE.Color('#e8fbff'), 0.35 * dark) }, bot: { value: W.clone().multiplyScalar(0.35) } };
  dome = new THREE.Mesh(O(new THREE.SphereGeometry(60, 24, 12)), O(new THREE.ShaderMaterial({ uniforms: DU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float vY; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.4, 0.7, vY)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' })));
  dome.renderOrder = -10; dome.frustumCulled = false; sc.add(dome);
  hemi = new THREE.HemisphereLight(new THREE.Color('#cfeeff').multiplyScalar(dark), new THREE.Color(H.sand).lerp(W, 0.5).multiplyScalar(0.45 * dark), 0.95); sc.add(hemi);
  sun = new THREE.DirectionalLight(new THREE.Color('#e8fbff').multiplyScalar(dark), 1.35 * dark * (H.depth > 8 ? 0.6 : 1)); sun.position.set(3, 20, 5); sc.add(sun, sun.target);
  lamp = new THREE.PointLight('#fff2d0', night > 0.4 ? 9 : 0, 9, 1.6); sc.add(lamp);   // 夜潛的頭燈
  fill = new THREE.PointLight('#cfe8ff', 0.6 + night * 1.6, 7, 2); sc.add(fill);   // 鏡頭這一側的柔光：夜裡角色不會只剩黑影
  // 海底：起伏的沙地，海草床帶點綠
  const g = O(new THREE.PlaneGeometry(46, 46, 92, 92)); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), base = new THREE.Color(H.sand), c = new THREE.Color(), green = new THREE.Color('#6f9a4a');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, bedY(x, z));
    const n = vnoise(x * 0.6 + 3, z * 0.6), m = vnoise(x * 0.15 - 7, z * 0.15 + 2);
    c.copy(base).multiplyScalar(0.72 + n * 0.2).lerp(W, 0.12); if (H.grass) c.lerp(green, Math.max(0, m - 0.35) * 0.9); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  bed = new THREE.Mesh(g, O(bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 })))); bed.receiveShadow = true; sc.add(bed);
  caus = new THREE.Mesh(g, O(new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uK: { value: 0.32 * dark * (H.depth > 8 ? 0.35 : 1) }, uCol: { value: new THREE.Color('#d8fbff') }, uCam: { value: new THREE.Vector3() }, uFog: { value: H.fog } },
    vertexShader: WV, fragmentShader: CAUS_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, fog: false })));
  sc.add(caus);
  // 從下往上看的海面
  surf = new THREE.Mesh(O(new THREE.PlaneGeometry(90, 90, 1, 1)), O(new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uCol: { value: W.clone().multiplyScalar(1.15) }, uHi: { value: new THREE.Color(night > 0.5 ? '#6f8fb0' : '#f2fdff') }, uCam: { value: new THREE.Vector3() }, uFar: { value: FOG.clone() } },
    vertexShader: WV, fragmentShader: SURF_F, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  surf.rotation.x = Math.PI / 2; surf.position.y = H.depth; sc.add(surf);
  // 光柱（白天）
  if (night < 0.5) for (let i = 0; i < 8; i++) {
    const w = 1.4 + Math.random() * 1.8, m = new THREE.Mesh(O(new THREE.PlaneGeometry(w, H.depth + 1, 1, 1).translate(0, (H.depth + 1) / 2, 0)), O(new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uSeed: { value: Math.random() }, uCol: { value: new THREE.Color('#e6fbff') } },
      vertexShader: RAY_V, fragmentShader: RAY_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })));
    const a = Math.random() * 6.28, r = 2 + Math.random() * 10; m.position.set(Math.cos(a) * r, bedY(Math.cos(a) * r, Math.sin(a) * r) - 0.3, Math.sin(a) * r); m.renderOrder = 3; sc.add(m); rays.push({ m, base: (0.12 + Math.random() * 0.1) * (H.depth > 8 ? 0.5 : 1) });
  }
  // 海雪：漂浮的小顆粒
  { const n = 360, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 24, Math.random() * H.depth, (Math.random() - 0.5) * 24], i * 3);
    const sg = O(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    snow = new THREE.Points(sg, O(new THREE.PointsMaterial({ map: glowTex(), color: '#ffffff', size: 0.07, transparent: true, opacity: 0.55 * (0.4 + dark * 0.6), depthWrite: false }))); snow.frustumCulled = false; sc.add(snow); }
  decorate(); fishSchools(); spawn();
  sc.traverse(o => { o.frustumCulled = false; });
}
/** 珊瑚、岩石、海草：散在海底，避開正中央（下潛的地方） */
function decorate() {
  const spots = [[0, 4.5, 1.8]];
  const free = (x, z, r) => Math.hypot(x, z) < R + 4 && spots.every(([a, b, rr]) => Math.hypot(a - x, b - z) > r + rr);
  H.deco.forEach(([key, n]) => {
    for (let i = 0; i < n; i++) {
      let x = 0, z = 0, ok = false; const r = key === 'coral_table' || key === 'rock_a' || key === 'seagrass_patch' ? 0.75 : 0.45;
      for (let k = 0; k < 30 && !ok; k++) { const a = Math.random() * 6.28, d = 2.5 + Math.random() * (R + 2); x = Math.cos(a) * d; z = Math.sin(a) * d; ok = free(x, z, r); }
      if (!ok) continue;
      const m = model('REEFMODELS', key); if (!m) continue;
      const s = 0.85 + Math.random() * 0.45; m.scale.setScalar(s); m.rotation.y = Math.random() * 6.28; m.position.set(x, bedY(x, z) - 0.04, z); sc.add(m);
      spots.push([x, z, r * s]); decos.push({ m, x, z, r: r * s, top: bedY(x, z) + (key === 'seagrass_patch' || key === 'anemone_bed' ? 0 : 0.45 * s), sway: m.userData.anim === 'sway', ph: Math.random() * 6 });
    }
  });
}
/** 小魚群：繞著一個點游的一群小魚（每隻是同一個網格的複本） */
let fishG = null;
/** 小魚的網格（菱形身體＋三角尾鰭；潛水與海洋館共用，不釋放） */
export function fishGeo() {
  if (fishG) return fishG;
  const v = [0, 0, 0.16, 0, 0.05, 0, 0, -0.05, 0, 0, 0, -0.09, -0.03, 0, 0.02, 0.03, 0, 0.02, 0, 0, -0.07, 0, 0.06, -0.17, 0, -0.06, -0.17];
  fishG = new THREE.BufferGeometry(); fishG.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  fishG.setIndex([0, 1, 4, 0, 4, 2, 0, 2, 5, 0, 5, 1, 3, 4, 1, 3, 2, 4, 3, 5, 2, 3, 1, 5, 6, 7, 8]); fishG.computeVertexNormals(); return fishG;
}
function fishSchools() {
  const geo = fishGeo();
  H.fish.forEach((color, k) => {
    const mat = O(new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.15, flatShading: true, side: THREE.DoubleSide }));
    const n = 14, im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false;
    const a = Math.random() * 6.28, d = 4 + Math.random() * 6;
    schools.push({ im, n, cx: Math.cos(a) * d, cz: Math.sin(a) * d, cy: bedY(Math.cos(a) * d, Math.sin(a) * d) + 1.4 + k * 0.9, r: 1.6 + Math.random(), w: (k ? -1 : 1) * (0.35 + Math.random() * 0.2), off: Array.from({ length: n }, () => [Math.random() * 0.8, (Math.random() - 0.5) * 0.6, Math.random() * 6.28]) });
    sc.add(im);
  });
}
const sm = new THREE.Matrix4(), sq = new THREE.Quaternion(), ss = new THREE.Vector3(1, 1, 1), sv = new THREE.Vector3(), se = new THREE.Euler();
function fishTick(dt, t) {
  for (const s of schools) {
    const dp = Math.hypot(P.position.x - s.cx, P.position.z - s.cz); if (dp < 2.4) { s.cx += (s.cx - P.position.x) / (dp || 1) * dt * 1.2; s.cz += (s.cz - P.position.z) / (dp || 1) * dt * 1.2; }   // 游太近：整群讓開
    const cr = Math.hypot(s.cx, s.cz); if (cr > R) { s.cx *= R / cr; s.cz *= R / cr; }
    for (let i = 0; i < s.n; i++) {
      const [ro, yo, ph] = s.off[i], a = t * s.w + i * 0.45 + ph * 0.1, r = s.r + ro;
      sv.set(s.cx + Math.cos(a) * r, s.cy + yo + Math.sin(t * 1.3 + ph) * 0.12, s.cz + Math.sin(a) * r);
      se.set(0, Math.atan2(-Math.sin(a) * Math.sign(s.w), Math.cos(a) * Math.sign(s.w)) + Math.sin(t * 9 + ph) * 0.12, 0); sq.setFromEuler(se);
      s.im.setMatrixAt(i, sm.compose(sv, sq, ss));
    }
    s.im.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- 海洋生物 ---------- */
const SPEED = [0, 0.28, 0.55, 0.9], BIG = 2.1;   // 依 speed 0–3 的游速；模型放大（小生物看得到）
const tideOK = sp => sp.tide === 'any' || (sp.tide === 'high' ? tide.lvl() > -0.1 : tide.lvl() < 0.1);
/** 這次潛水會遇到的生物：這個潛點的棲地優先，不夠再從相鄰的棲地補 */
function pickSpecies() {
  const NEXT = { shallow: ['seagrass', 'reef'], seagrass: ['shallow'], reef: ['shallow', 'deep'], deep: ['reef'] };
  const W = [0, 10, 6, 3, 1.2, 0.4], out = [], want = 3 + (Math.random() < 0.5 ? 1 : 0);
  const draw = pool => { pool = pool.filter(sp => !out.includes(sp)); if (!pool.length) return null; let r = Math.random() * pool.reduce((a, sp) => a + W[sp.rarity], 0); for (const sp of pool) { r -= W[sp.rarity]; if (r <= 0) return sp; } return pool[0]; };
  const own0 = available('marine', SP.where).filter(tideOK), near = available('marine', NEXT[SP.where] || []).filter(tideOK);
  while (out.length < want) { const sp = draw(own0) || (out.length < 3 ? draw(near) : null); if (!sp) break; out.push(sp); }
  return out;
}
function spawn() {
  const list = pickSpecies(), base = Math.random() * 6.28;
  list.forEach((sp, i) => {
    const m = model('MARINEMODELS', sp.id) || fallback(sp), anim = m.userData.anim || 'still';
    m.scale.setScalar(BIG); sc.add(m);
    const a = base + i * (6.28 / list.length) + (Math.random() - 0.5) * 0.8, d = 3.2 + Math.random() * 5.5, hx = Math.cos(a) * d, hz = Math.sin(a) * d;
    const kind = sp.speed === 0 ? 'fixed' : anim === 'crawl' || anim === 'still' || anim === 'clam' || anim === 'sway' ? 'crawl' : 'swim';
    const parts = {}; ['tail', 'finL', 'finR', 'bell', 'tentacles', 'lid'].forEach(n => { parts[n] = m.getObjectByName(n); });
    parts.arms = []; for (let k = 0; k < 16; k++) { const o = m.getObjectByName('arm' + k); if (o) parts.arms.push(o); }
    parts.legs = []; for (let k = 0; k < 16; k++) { const o = m.getObjectByName('leg' + k); if (o) parts.legs.push(o); }
    const spark = new THREE.Sprite(O(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); spark.scale.setScalar(0.3); sc.add(spark);
    const cr = { sp, m, anim, kind, parts, spark, hx, hz, ph: Math.random() * 6.28, flee: 0, dir: new THREE.Vector3(Math.cos(a + 1.6), 0, Math.sin(a + 1.6)), goal: null, y: 0 };
    const y0 = bedY(hx, hz); cr.y = kind === 'swim' ? y0 + 0.8 + Math.random() * 1.4 : y0;
    m.position.set(hx, cr.y, hz); m.rotation.y = Math.random() * 6.28;
    creatures.push(cr);
  });
}
function crTick(cr, dt, t, locked) {
  const m = cr.m, sp = cr.sp, p = m.position, ph = cr.ph, s = Math.sin;
  // 零件的動作
  if (cr.parts.tail) cr.parts.tail.rotation.y = s(t * (2 + sp.speed * 2) + ph) * 0.35;
  if (cr.parts.finL) { cr.parts.finL.rotation.z = s(t * 1.8 + ph) * 0.55; cr.parts.finR && (cr.parts.finR.rotation.z = -s(t * 1.8 + ph) * 0.55); }
  if (cr.parts.bell) { const k = Math.max(0, s(t * 2.1 + ph)); cr.parts.bell.scale.set(1 + k * 0.12, 1 - k * 0.16, 1 + k * 0.12); }
  if (cr.parts.tentacles) cr.parts.tentacles.rotation.x = s(t * 1.2 + ph) * 0.12;
  cr.parts.arms.forEach((a, i) => { a.rotation.x = s(t * 2 + i * 0.8 + ph) * 0.22; });
  cr.parts.legs.forEach((l, i) => { l.rotation.x = s(t * 9 + i * 1.3) * (cr.kind === 'crawl' && !locked ? 0.35 : 0.08); });
  if (cr.parts.lid) cr.parts.lid.rotation.x = -(0.12 + 0.12 * Math.max(0, s(t * 0.5 + ph))) * (cr.shut > 0 ? 0 : 1);
  if (cr.shut > 0) cr.shut -= dt;
  if (cr.anim === 'sway') m.rotation.z = s(t * 0.9 + ph) * 0.05;
  // 亮點：還沒觀察過的生物頭上一閃一閃（小生物從遠處也找得到）
  cr.spark.position.set(p.x, p.y + 0.45 + (cr.kind === 'swim' ? 0.15 : 0.25), p.z); cr.spark.material.opacity = cr.busy || cr.done ? 0 : 0.1 + 0.3 * Math.max(0, s(t * 2.2 + ph));
  if (locked || cr.busy || cr.kind === 'fixed') return;
  // 移動：在家附近遊蕩；被快速靠近的玩家嚇到時（游得快的生物）往反方向竄開
  const dx = p.x - P.position.x, dz = p.z - P.position.z, dp = Math.hypot(dx, dz);
  if (sp.speed >= 2 && pace > 2.2 && dp < 2.6 && cr.flee <= 0) { cr.flee = 2.2; cr.dir.set(dx / (dp || 1), 0, dz / (dp || 1)); cr.goal = null; }
  if (cr.anim === 'clam' && dp < 1.4 && pace > 2.2) cr.shut = 2;   // 貝類：被嚇到就闔起來
  const spd = (cr.kind === 'crawl' ? 0.12 + sp.speed * 0.04 : SPEED[sp.speed] || 0.3) * (cr.flee > 0 ? 3 : 1);
  if (cr.flee > 0) cr.flee -= dt;
  else {
    if (!cr.goal || Math.hypot(cr.goal.x - p.x, cr.goal.z - p.z) < 0.4) { const a = Math.random() * 6.28, d = Math.random() * (cr.kind === 'crawl' ? 2.2 : 4); cr.goal = { x: cr.hx + Math.cos(a) * d, z: cr.hz + Math.sin(a) * d, y: 0.7 + Math.random() * 1.6 }; }
    tmp.set(cr.goal.x - p.x, 0, cr.goal.z - p.z).normalize(); cr.dir.lerp(tmp, Math.min(1, dt * 0.8)).normalize();
  }
  p.x += cr.dir.x * spd * dt; p.z += cr.dir.z * spd * dt;
  const rr = Math.hypot(p.x, p.z); if (rr > R + 1) { p.x *= (R + 1) / rr; p.z *= (R + 1) / rr; cr.goal = null; }
  m.rotation.y = Math.atan2(cr.dir.x, cr.dir.z);
  const by = bedY(p.x, p.z);
  if (cr.kind === 'swim') { const gy = by + (cr.goal ? cr.goal.y : 1.2) + (cr.anim === 'pulse' ? s(t * 2.1 + ph) * 0.12 : 0); cr.y += (gy - cr.y) * Math.min(1, dt * 0.6); p.y = Math.min(cr.y, H.depth - 0.6); }
  else p.y = by;
}

/* ---------- 進出 ---------- */
export function enter(spot) {
  if (inside) return; SP = spot; H = HAB[spot.where] || HAB.shallow; seed = (spot.x * 13.7 + spot.z * 7.3) % 50;
  ui.iris(); inside = true; savedCurve = U.uCurve.value; U.uCurve.value = 0; U.uMist.value.x = 0; U.uCloud.value.x = 0;
  build(); sc.add(P); if (P.userData.hand) P.userData.hand.visible = false;   // 手上的工具收起來
  P.userData.act = 'dive'; P.userData.swimLean = 0;   // 換成潛水的姿勢（main.js 看到 'swim' 會以為被送進室內而收掉游泳）
  P.position.set(0, bedY(0, 4.5) + 2.4, 4.5); P.rotation.y = Math.PI; kick = 0; pace = 0; lean = 0;
  camPos.set(0, P.position.y + 3, P.position.z + 5.5); camLook.copy(P.position);
  air = AIR; warned = false; found = 0; bubT = 0.5; t0 = performance.now();
  hud = ui.el('div', 'dive-hud'); document.body.appendChild(hud); hudPaint();
  document.body.classList.add('in-trip', 'in-dive'); Audio.sfx('splash');
  const s = S(); s.stats = s.stats || {}; s.stats.dives = (s.stats.dives || 0) + 1; save();
  setTimeout(() => ui.toast(`潛到${H.name}了！方向鍵游、空白鍵往上踢，游到發亮的生物旁邊按 E 觀察`), 700);
}
function hudPaint() { if (hud) hud.classList.toggle('low', air < 20); if (hud) hud.innerHTML = `<b>${H.name}</b><span class="dv-air"><i style="width:${Math.max(0, air / AIR * 100).toFixed(1)}%"></i></span><small>${found ? `帶回 ${found} 種` : '氧氣'}</small>`; }
/** 浮上水面：回到島上的潛點（main.js 的 onExit 把角色放回海面） */
export function surface(why) {
  if (!inside) return;
  ui.iris(); inside = false; U.uCurve.value = savedCurve || CURVE;
  document.body.classList.remove('in-trip', 'in-dive'); if (hud) { hud.remove(); hud = null; }
  const u = P.userData; u.act = null; tilt(0);
  creatures.forEach(c => sc.remove(c.m)); decos.forEach(d => sc.remove(d.m)); sc.remove(P);
  own.forEach(o => o.dispose && o.dispose()); own.length = 0;
  creatures.length = decos.length = rays.length = bubbles.length = schools.length = 0; sc = bed = caus = surf = snow = dome = hemi = sun = lamp = fill = null;
  mainScene.add(P); Audio.sfx('splash'); ctx.onExit(SP, why);
}
/** 身體前傾成水平游的姿勢（3D 模型繞身體中心轉；Q 版身體也一樣） */
function tilt(a) {
  const u = P.userData, c = 0.75;
  if (u.gltf) { const m = u.gltf.model, B = u.gltf.base; m.rotation.x = a; m.position.set(B.x, B.y + c - c * Math.cos(a), B.z - c * Math.sin(a)); }
  else if (u.body) { u.body.rotation.x = a; u.body.position.z = -c * Math.sin(a); }
}

/* ---------- 每幀 ---------- */
export function jump() { if (inside) { kick = Math.min(3.2, kick + 1.3); Audio.sfx('jump', { pitch: -6, vol: 0.5 }); } }
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  if (!sc) return;
  const p = P.position, u = P.userData;
  if (!locked) { air -= dt; if (!warned && air < 20) { warned = true; ui.toast('氧氣快用完了，記得浮上去換氣（附近沒有生物時按 E）'); } if (air <= 0) { surface('air'); return; } }
  // 游：方向鍵（畫面方向）水平移動，空白鍵往上踢、放開慢慢沉回離海底約一公尺
  const want = moving && !locked ? (run ? 3.0 : 1.8) * Math.min(1, len) : 0; pace += (want - pace) * Math.min(1, dt * 3);
  if (moving && !locked) { const k = 1 / (len || 1), nx = ix * k, nz = iz * k; P.userData.swimDir = [nx, nz]; P.rotation.y += (((Math.atan2(nx, nz) - P.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 6); }
  const d0 = u.swimDir || [0, -1]; let nx = p.x + d0[0] * pace * dt, nz = p.z + d0[1] * pace * dt;
  const rr = Math.hypot(nx, nz); if (rr > R) { nx *= R / rr; nz *= R / rr; }
  for (const d of decos) { if (p.y > d.top + 0.3) continue; const ex = nx - d.x, ez = nz - d.z, e = Math.hypot(ex, ez); if (e < d.r + 0.25) { nx = d.x + ex / (e || 1) * (d.r + 0.25); nz = d.z + ez / (e || 1) * (d.r + 0.25); } }   // 珊瑚、岩石：繞過去或從上面游過
  p.x = nx; p.z = nz;
  kick = Math.max(0, kick - dt * 0.55);
  const floor = bedY(p.x, p.z), gy = Math.min(H.depth - 1.6, floor + 0.55 + kick); p.y += (gy - p.y) * Math.min(1, dt * 2.2);
  lean += ((pace > 0.3 ? 1.3 : 0.35) - lean) * Math.min(1, dt * 3); tilt(lean);
  u.act = 'dive'; u.swimK = Math.min(1, pace / 1.5); animate(P, dt, 0, t);   // 姿勢在 actors.js：停著踩水、游動時蛙式
  // 吐泡泡
  if ((bubT -= dt) <= 0) { bubT = 2.2 + Math.random() * 1.4; for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) blow(i); }
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.t += dt; b.m.position.y += dt * (0.7 + b.v); b.m.position.x += Math.sin(b.t * 6 + b.v * 9) * dt * 0.08; if (b.m.position.y > H.depth - 0.05 || b.t > 9) { sc.remove(b.m); bubbles.splice(i, 1); } }
  creatures.forEach(c => crTick(c, dt, t, locked)); fishTick(dt, t);
  decos.forEach(d => { if (d.sway) d.m.rotation.z = Math.sin(t * 0.8 + d.ph) * 0.04; });
  // 海雪跟著玩家繞
  { const a = snow.geometry.attributes.position, A = a.array; for (let i = 0; i < A.length; i += 3) { A[i + 1] -= dt * 0.04; A[i] += Math.sin(t * 0.3 + i) * dt * 0.03; if (A[i + 1] < bedY(A[i], A[i + 2]) - 0.1) A[i + 1] = H.depth - 0.2; let dx = A[i] - p.x, dz = A[i + 2] - p.z; if (dx > 12) A[i] -= 24; else if (dx < -12) A[i] += 24; if (dz > 12) A[i + 2] -= 24; else if (dz < -12) A[i + 2] += 24; } a.needsUpdate = true; }
  // 鏡頭：斜後上方跟著，不超出水面
  tmp.set(p.x, Math.min(H.depth - 0.35, p.y + 2.2), p.z + 5.2); camPos.lerp(tmp, Math.min(1, dt * 3)); camLook.lerp(tmp2.set(p.x, p.y + 0.7, p.z - 1.6), Math.min(1, dt * 5));
  camera.position.copy(camPos); camera.lookAt(camLook);
  caus.material.uniforms.uTime.value = t; caus.material.uniforms.uCam.value.copy(camera.position);
  surf.material.uniforms.uTime.value = t; surf.material.uniforms.uCam.value.copy(p);
  rays.forEach(r => { const m = r.m, dc = Math.hypot(m.position.x - camera.position.x, m.position.z - camera.position.z); m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z); m.material.uniforms.uTime.value = t; m.material.uniforms.uK.value = r.base * THREE.MathUtils.smoothstep(dc, 1.2, 3.5); });
  lamp.position.set(p.x, p.y + 1.2, p.z - 0.6); fill.position.set(camera.position.x, camera.position.y - 0.5, camera.position.z - 1.5);
  hudT += dt; if (hudT > 0.25) { hudT = 0; hudPaint(); }
  const fx = post.fx, dof0 = fx.dof; fx.golden = 0; fx.clear = 0.5; fx.sunVis = 0; fx.night = ctx.night(); fx.focus = camera.position.distanceTo(p); fx.dof = dof0 * 0.8; fx.haze.copy(sc.fog.color);
  post.render(t, sc, camera); fx.dof = dof0;
}
let hudT = 0;
const bubGeo = new THREE.SphereGeometry(0.035, 6, 4), bubMat = new THREE.MeshBasicMaterial({ color: '#f4fdff', transparent: true, opacity: 0.75, depthWrite: false });
function blow(i) {
  const m = new THREE.Mesh(bubGeo, bubMat), f = P.rotation.y, p = P.position;
  m.position.set(p.x + Math.sin(f) * 0.35 + (Math.random() - 0.5) * 0.1, p.y + 0.75 + i * 0.05, p.z + Math.cos(f) * 0.35 + (Math.random() - 0.5) * 0.1); m.scale.setScalar(0.6 + Math.random() * 0.9); m.frustumCulled = false;
  sc.add(m); bubbles.push({ m, t: 0, v: Math.random() * 0.4 });
}

/* ---------- 觀察與答題 ---------- */
const chest = new THREE.Vector3();
function nearest() {
  chest.copy(P.position).y += 0.5; let best = null, bd = 1.9;
  for (const c of creatures) { if (c.busy || c.done) continue; const d = Math.hypot(c.m.position.x - chest.x, c.m.position.z - chest.z), dy = Math.abs(c.m.position.y - chest.y); if (d < bd && dy < 2.2) { bd = d; best = c; } }
  return best;
}
export function hint() { if (!inside) return ''; const c = nearest(); return c ? (S().dex.marine[c.sp.id] ? `觀察${c.sp.name}` : '觀察這個生物') : '浮上水面'; }
export function handler() {
  if (!inside) return null;
  const c = nearest(); if (!c) return () => surface('up');
  return () => observe(c);
}
async function observe(c) {
  const sp = c.sp; c.busy = true; c.shut = 0;
  P.rotation.y = Math.atan2(c.m.position.x - P.position.x, c.m.position.z - P.position.z);
  const units = sp.sid === 'earth' ? ['es-ocean', 'es-climate'] : ['bi-evo', 'bi-eco'];
  const q = pickQU(units, 3) || pickQ(sp.sid, 3); if (!q) { c.busy = false; await ui.say(DIVE, '今天的題目都答過了，明天再來潛水吧！'); return; }
  c.flee = 0;
  const known = S().dex.marine[sp.id];
  const i = await ui.ask(DIVE, `${known ? sp.name : '有東西在動'}……${q.q}`, q.o, { answer: q.a, abc: true, keys: true, html: true, timer: fairSec(25, q) });
  const ok = i === q.a; record(q, ok); ui.closeDialog(); feel.note(feel.hit(ok));
  const photo = photoOnly('marine', sp);
  if (!ok) {
    Audio.sfx('bad'); c.busy = false; c.done = true; c.flee = 3; c.dir.set(c.m.position.x - P.position.x, 0, c.m.position.z - P.position.z).normalize();   // 溜走了
    setTimeout(() => { if (c.m.parent) c.m.parent.remove(c.m); if (c.spark.parent) c.spark.parent.remove(c.spark); const k = creatures.indexOf(c); if (k >= 0) creatures.splice(k, 1); }, 1600);
    const noted = fieldnote.add('marine', sp.id, sp.sid === 'earth' ? 'mearth' : 'mbio');
    await ui.explain(null, q, `${sp.name}游走了……${noted ? (photo ? '不過你記下了牠的樣子：手機「圖鑑」上方的觀察筆記裡答對一題，就能補完研究、補拍照片。' : fieldnote.told) : ''}`); return;
  }
  miles.add('marine'); found++;
  const s = S(), first = !s.dex.marine[sp.id]; s.dex.marine[sp.id] = s.dex.marine[sp.id] || Date.now();
  if (photo) s.museum.marine[sp.id] = s.museum.marine[sp.id] || Date.now();
  const room = photo ? true : addItem({ k: 'marine', id: sp.id }); save();
  Audio.sfx('ok'); setExpr(P, 'happy', 2);
  const line = ((I.MARINE_LINES || {}).catch || {})[sp.id] || '';
  await ui.card({ pocket: !photo && room, rare: sp.rarity >= 4, icon: icon(sp.id, 'marine'), title: `${photo ? '拍到了' : '找到了'}${sp.name}！`,
    sub: `${line}${photo ? '只在原處拍照記錄，不觸碰、不帶走。照片已經送到博物館的海洋館。' : ''}`,
    extra: `<span class="stars">${stars(sp.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}${!photo && !room ? '<em>口袋滿了，只好放回海裡。</em>' : ''}<small class="dv-fact">${ui.esc(sp.fact || '')}</small>` });
  c.busy = false;
  if (photo || !room) { c.done = true; c.flee = 2; }   // 拍完照、或放回海裡：牠繼續游走
  else { if (c.m.parent) c.m.parent.remove(c.m); if (c.spark.parent) c.spark.parent.remove(c.spark); const k = creatures.indexOf(c); if (k >= 0) creatures.splice(k, 1); }
  hudPaint();
  await challenge.keepGoing(DIVE, q);
}
export const debug = () => ({ where: SP && SP.where, air: +air.toFixed(1), creatures: creatures.map(c => ({ id: c.sp.id, kind: c.kind, x: +c.m.position.x.toFixed(1), y: +c.m.position.y.toFixed(1), z: +c.m.position.z.toFixed(1) })) });
