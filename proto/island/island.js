/* 潮汐小島 · 動森風玩法預覽：滾筒地平線、低多邊形小島、現實時間日夜、和島民聊天答題。 */
import * as THREE from 'three';

const TA = window.TA;
const $ = id => document.getElementById(id);

/* ---------- 渲染器 ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('cv'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 500);
scene.fog = new THREE.Fog(0xcfeeff, 60, 150);

/* ---------- 滾筒地平線：在視空間把遠處往下彎 ---------- */
const U = { uCurve: { value: 0.0055 }, uTime: { value: 0 } };
function bend(mat, kind) {
  kind = kind || 'plain';
  mat.onBeforeCompile = sh => {
    sh.uniforms.uCurve = U.uCurve; sh.uniforms.uTime = U.uTime;
    let v = 'uniform float uCurve;\nuniform float uTime;\n' + sh.vertexShader;
    if (kind === 'sway') v = v.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 wp0 = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float sw = max(position.y, 0.0);
      transformed.x += sin(uTime * 1.3 + wp0.x * 0.7 + wp0.z * 0.4) * 0.035 * sw;
      transformed.z += cos(uTime * 1.1 + wp0.z * 0.6) * 0.025 * sw;`);
    if (kind === 'water') v = v.replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed.y += sin(uTime * 0.9 + position.x * 0.35 + position.z * 0.2) * 0.06 + sin(uTime * 1.4 - position.z * 0.5) * 0.04;`);
    v = v.replace('#include <project_vertex>', `#include <project_vertex>
      mvPosition.y -= mvPosition.z * mvPosition.z * uCurve;
      gl_Position = projectionMatrix * mvPosition;`);
    sh.vertexShader = v;
  };
  mat.customProgramCacheKey = () => 'bend-' + kind;
  return mat;
}
const MATS = {};
function M(color, o, kind) {
  const key = color + (kind || '') + JSON.stringify(o || {});
  if (MATS[key]) return MATS[key];
  const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9, metalness: 0 }, o || {}));
  return (MATS[key] = bend(m, kind));
}
const VC = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));

/* ---------- 亂數與雜訊 ---------- */
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/* ---------- 地形：-1 海、0 沙灘、1 草地、2 高台、3 河、4 坡道 ---------- */
const N = 64, C = N / 2;
const tile = new Int8Array(N * N).fill(-1);
const inb = (x, z) => x >= 0 && z >= 0 && x < N && z < N;
const T = (x, z) => (inb(x, z) ? tile[z * N + x] : -1);
const setT = (x, z, t) => { if (inb(x, z)) tile[z * N + x] = t; };
const RIVER = [[-6, -6.5], [-3, -2], [2, 1.5], [6, 6], [10, 11], [14, 15.5], [19, 19.5], [25, 25]];
function distSeg(px, pz, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t); }
const riverDist = (x, z) => { let d = 1e9; for (let i = 0; i < RIVER.length - 1; i++) d = Math.min(d, distSeg(x, z, RIVER[i], RIVER[i + 1])); return d; };
for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
  const wx = x - C + 0.5, wz = z - C + 0.5, ang = Math.atan2(wz, wx), r = Math.hypot(wx, wz * 1.08);
  const edge = 23 + 2.2 * Math.sin(ang * 3 + 1) + 1.4 * Math.sin(ang * 5 + 2) + (noise(x * 0.15, z * 0.15) - 0.5) * 2.4;
  let t = r < edge - 3.4 ? 1 : r < edge ? 0 : -1;
  const pr = Math.hypot(wx / 11, (wz + 12.5) / 7) + (noise(x * 0.3 + 9, z * 0.3) - 0.5) * 0.22;
  if (t === 1 && pr < 1 && r < edge - 6) t = 2;
  const rd = riverDist(wx, wz);
  if (t === 1 && rd < 1.15) t = 3;
  if (t === 0 && rd < 1.15) t = -1;
  tile[z * N + x] = t;
}
// 坡道：高台南緣，兩格
const RAMP_X = [C + 4, C + 5];
let rampZ = 0;
for (let z = 2; z < C; z++) if (T(RAMP_X[0], z) === 2 && T(RAMP_X[0], z + 1) === 1) { rampZ = z; break; }
RAMP_X.forEach(x => { setT(x, rampZ, 4); setT(x, rampZ + 1, 4); if (T(x, rampZ - 1) !== 2) setT(x, rampZ - 1, 2); });
// 橋：廣場往商店
const BRIDGE = [];
{ const bz = C + 2; for (let x = C; x < C + 9; x++) if (T(x, bz) === 3 || T(x, bz + 1) === 3) { BRIDGE.push([x, bz], [x, bz + 1]); } }
const isBridge = (x, z) => BRIDGE.some(b => b[0] === x && b[1] === z);

const HT = { '-1': -1.1, 0: 0.35, 1: 1.0, 2: 3.0, 3: 0.2 };
function tileTop(x, z, fz) {
  const t = T(x, z);
  if (t === 4) { const z0 = rampZ, k = ((z - z0) + (fz == null ? 0.5 : fz)) / 2; return 3 - k * 2; }
  return HT[t];
}

/* ---------- 地形網格 ---------- */
function buildTerrain() {
  const P = [], Cc = [];
  const col = new THREE.Color();
  const push = (x, y, z, c) => { P.push(x, y, z); Cc.push(c.r, c.g, c.b); };
  const quad = (a, b, c, d, ca, cb, cc, cd) => { push(...a, ca); push(...b, cb); push(...c, cc); push(...a, ca); push(...c, cc); push(...d, cd); };
  const grassC = (x, z, hi) => { const n = noise(x * 0.35, z * 0.35), n2 = noise(x * 1.7 + 5, z * 1.7); const c = new THREE.Color(hi ? '#8fd66a' : '#84cf5c').lerp(new THREE.Color(hi ? '#79c65a' : '#6fbd4f'), n * 0.8); c.offsetHSL(0, 0, (n2 - 0.5) * 0.05); return c; };
  const sandC = (x, z) => new THREE.Color('#f6e7b8').lerp(new THREE.Color('#ead39a'), noise(x * 0.5, z * 0.5) * 0.7);
  const cornerC = (t, x, z) => t === 0 ? sandC(x, z) : t === 3 ? new THREE.Color('#9fd8c8') : grassC(x, z, t === 2);
  const lip = new THREE.Color('#6cbf4e'), cliffT = new THREE.Color('#b48a5c'), cliffB = new THREE.Color('#946c45'), sandW = new THREE.Color('#e3cc90'), sandWB = new THREE.Color('#c9b07a');
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const t = T(x, z); if (t < 0) continue;
    const X = x - C, Z = z - C;
    const h00 = tileTop(x, z, 0), h01 = tileTop(x, z, 1);
    quad([X, h00, Z], [X, h01, Z + 1], [X + 1, h01, Z + 1], [X + 1, h00, Z], cornerC(t, X, Z), cornerC(t, X, Z + 1), cornerC(t, X + 1, Z + 1), cornerC(t, X + 1, Z));
    // 側壁
    const h = (h00 + h01) / 2;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
      const nt = T(x + dx, z + dz);
      if (t === 4 && nt === 4) return;
      let nh = nt === 4 ? 1 : HT[nt];
      if (t === 4 && nt === 2) return;
      if (t === 2 && nt === 4) nh = 3 - 0.01;
      if (nh >= h - 0.01) return;
      let a, b; // 邊的兩端（由外看逆時針）
      if (dx === 1) { a = [X + 1, Z + 1]; b = [X + 1, Z]; }
      else if (dx === -1) { a = [X, Z]; b = [X, Z + 1]; }
      else if (dz === 1) { a = [X, Z + 1]; b = [X + 1, Z + 1]; }
      else { a = [X + 1, Z]; b = [X, Z]; }
      const ha = t === 4 ? tileTop(x, z, dz === 1 ? 1 : dz === -1 ? 0 : (a[1] - Z)) : h, hb = t === 4 ? tileTop(x, z, dz === 1 ? 1 : dz === -1 ? 0 : (b[1] - Z)) : h;
      if (t === 0) { quad([a[0], nh, a[1]], [a[0], ha, a[1]], [b[0], hb, b[1]], [b[0], nh, b[1]], sandWB, sandW, sandW, sandWB); return; }
      const l = 0.14;
      quad([a[0], ha - l, a[1]], [a[0], ha, a[1]], [b[0], hb, b[1]], [b[0], hb - l, b[1]], lip, lip, lip, lip);
      quad([a[0], nh, a[1]], [a[0], ha - l, a[1]], [b[0], hb - l, b[1]], [b[0], nh, b[1]], cliffB, cliffT, cliffT, cliffB);
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, VC); m.receiveShadow = true; m.castShadow = true;
  return m;
}
const terrain = buildTerrain();
scene.add(terrain);

// 海床：近岸淺沙、遠處深藍
{
  const g = new THREE.CircleGeometry(160, 96, 0, Math.PI * 2); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cols = [];
  const shallow = new THREE.Color('#e8dca8'), mid = new THREE.Color('#47b9c9'), deep = new THREE.Color('#1f6fa0');
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i)), k1 = THREE.MathUtils.smoothstep(r, 22, 30), k2 = THREE.MathUtils.smoothstep(r, 30, 60);
    p.setY(i, -0.7 - k1 * 2.5 - k2 * 6);
    const c = shallow.clone().lerp(mid, k1).lerp(deep, k2); cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, VC); m.receiveShadow = true; scene.add(m);
}
// 海面
const waterMat = bend(new THREE.MeshStandardMaterial({ color: '#56d2e0', transparent: true, opacity: 0.62, roughness: 0.12, metalness: 0.05 }), 'water');
{ const g = new THREE.PlaneGeometry(320, 320, 160, 160); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, waterMat); m.position.y = 0.02; m.receiveShadow = true; scene.add(m); }
// 河面
const riverMat = bend(new THREE.MeshStandardMaterial({ color: '#6fe0e6', transparent: true, opacity: 0.7, roughness: 0.1 }), 'water');
{
  const P = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) === 3) { const X = x - C, Z = z - C, y = 0.7; P.push(X, y, Z, X, y, Z + 1, X + 1, y, Z + 1, X, y, Z, X + 1, y, Z + 1, X + 1, y, Z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, riverMat));
}
// 浪花：沙灘外緣
const foamMat = bend(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }));
{
  const P = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (T(x, z) !== 0) continue; const X = x - C, Z = z - C, y = 0.1, w = 0.35;
    if (T(x + 1, z) === -1) P.push(X + 1, y, Z, X + 1, y, Z + 1, X + 1 + w, y, Z + 1, X + 1, y, Z, X + 1 + w, y, Z + 1, X + 1 + w, y, Z);
    if (T(x - 1, z) === -1) P.push(X - w, y, Z, X - w, y, Z + 1, X, y, Z + 1, X - w, y, Z, X, y, Z + 1, X, y, Z);
    if (T(x, z + 1) === -1) P.push(X, y, Z + 1, X, y, Z + 1 + w, X + 1, y, Z + 1 + w, X, y, Z + 1, X + 1, y, Z + 1 + w, X + 1, y, Z + 1);
    if (T(x, z - 1) === -1) P.push(X, y, Z - w, X, y, Z, X + 1, y, Z, X, y, Z - w, X + 1, y, Z, X + 1, y, Z - w);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  scene.add(new THREE.Mesh(g, foamMat));
}

/* ---------- 天空 ---------- */
const skyU = { top: { value: new THREE.Color('#5ec2ff') }, bot: { value: new THREE.Color('#d8f3ff') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#fff4d6') }, night: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; varying vec3 vD;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
    void main(){ float y = clamp(vD.y * 1.6 + 0.15, 0.0, 1.0); vec3 c = mix(bot, top, pow(y, 0.8));
      float s = max(dot(normalize(vD), sunDir), 0.0); c += sunCol * (pow(s, 600.0) * 3.0 + pow(s, 8.0) * 0.18);
      vec3 q = floor(vD * 220.0); float st = step(0.996, h(q)) * night * smoothstep(0.05, 0.4, vD.y); c += vec3(st);
      gl_FragColor = vec4(c, 1.0); }`
}));
sky.renderOrder = -1; scene.add(sky);

/* ---------- 光源 ---------- */
const hemi = new THREE.HemisphereLight('#cfeaff', '#8ab868', 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

/* ---------- 物件工具 ---------- */
const colliders = [];   // {x,z,r} 或 {x0,z0,x1,z1}
const nightMats = [];   // 夜晚發光的窗戶與燈
const lamps = [];
function mesh(geo, mat, x, y, z, opt) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = !(opt && opt.noCast); m.receiveShadow = true; return m;
}
const groundAt = (x, z) => { const tx = Math.floor(x + C), tz = Math.floor(z + C); if (isBridge(tx, tz)) return 1.12; const t = T(tx, tz); if (t === 4) return tileTop(tx, tz, (z + C) - tz); return HT[t] == null ? 0 : HT[t]; };

function tree(x, z, s, kind) {
  const g = new THREE.Group(), y = groundAt(x, z);
  g.position.set(x, y, z); s = s || 1;
  if (kind === 'palm') {
    let px = 0, py = 0;
    for (let i = 0; i < 6; i++) { const seg = mesh(new THREE.CylinderGeometry(0.12 * s, 0.15 * s, 0.5 * s, 7), M('#a57a4f'), px, py + 0.25 * s, 0); seg.rotation.z = -0.08 * i; g.add(seg); px += 0.05 * i * s; py += 0.48 * s; }
    const top = new THREE.Group(); top.position.set(px, py, 0); g.add(top);
    for (let i = 0; i < 7; i++) { const lf = mesh(new THREE.SphereGeometry(0.5 * s, 8, 6), M('#55b356', {}, 'sway'), 0, 0, 0); lf.scale.set(1.6, 0.12, 0.38); lf.position.set(Math.cos(i * 0.9) * 0.7 * s, -0.12 * s, Math.sin(i * 0.9) * 0.7 * s); lf.rotation.y = -i * 0.9; lf.rotation.z = -0.35; top.add(lf); }
    for (let i = 0; i < 3; i++) top.add(mesh(new THREE.SphereGeometry(0.12 * s, 8, 6), M('#8a5a2b'), Math.cos(i * 2.1) * 0.15, -0.2 * s, Math.sin(i * 2.1) * 0.15));
  } else if (kind === 'cedar') {
    g.add(mesh(new THREE.CylinderGeometry(0.13 * s, 0.17 * s, 0.8 * s, 7), M('#7a5238'), 0, 0.4 * s, 0));
    [[1.0, 0.9], [0.8, 1.55], [0.55, 2.15]].forEach(([r, h]) => g.add(mesh(new THREE.ConeGeometry(r * s, 1.0 * s, 9), M('#3f9a5e', {}, 'sway'), 0, h * s, 0)));
  } else {
    g.add(mesh(new THREE.CylinderGeometry(0.13 * s, 0.2 * s, 1.2 * s, 7), M('#8a5a3b'), 0, 0.6 * s, 0));
    const leaf = M(kind === 'pink' ? '#ffb3cf' : '#58b34d', {}, 'sway');
    [[0, 1.75, 0, 0.85], [0.45, 1.45, 0.2, 0.62], [-0.42, 1.5, -0.15, 0.6], [0.05, 2.25, -0.05, 0.55]].forEach(([a, b, c, r]) => { const m = mesh(new THREE.IcosahedronGeometry(r * s, 1), leaf, a * s, b * s, c * s); g.add(m); });
    if (kind !== 'pink') for (let i = 0; i < 3; i++) { const a = i * 2.2 + rnd(); g.add(mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), M('#ff8a3d'), Math.cos(a) * 0.72 * s, 1.55 * s + rnd() * 0.3, Math.sin(a) * 0.72 * s)); }
  }
  g.rotation.y = rnd() * 6.28;
  scene.add(g); colliders.push({ x, z, r: 0.35 * s });
  return g;
}
function bush(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  const c = rnd() < 0.5 ? '#4fa64a' : '#5cb85c';
  g.add(mesh(new THREE.IcosahedronGeometry(0.42, 1), M(c, {}, 'sway'), 0, 0.3, 0), mesh(new THREE.IcosahedronGeometry(0.32, 1), M(c, {}, 'sway'), 0.32, 0.22, 0.1));
  const fc = ['#ff7a9a', '#ffffff', '#ffd23f'][Math.floor(rnd() * 3)];
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), M(fc), Math.cos(i * 1.7) * 0.35, 0.45 + rnd() * 0.15, Math.sin(i * 1.7) * 0.3, { noCast: true }));
  scene.add(g); colliders.push({ x, z, r: 0.4 });
}
function rock(x, z, s) {
  const y = groundAt(x, z), m = mesh(new THREE.IcosahedronGeometry(0.45 * s, 0), M('#bdb6aa', { flatShading: true }), x, y + 0.2 * s, z);
  m.scale.set(1.2, 0.75, 1); m.rotation.set(rnd(), rnd() * 6, rnd()); scene.add(m); colliders.push({ x, z, r: 0.45 * s });
}
function boxC(x0, z0, x1, z1) { colliders.push({ x0, z0, x1, z1 }); }
function label(text, color, w, h) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = color || '#6b4f3a'; c.beginPath(); c.roundRect(8, 8, 496, 112, 40); c.fill();
  c.fillStyle = '#fff'; c.font = '800 64px "M PLUS Rounded 1c", "Microsoft JhengHei", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w || 2, h || 0.5), bend(new THREE.MeshBasicMaterial({ map: tex, transparent: true })));
}
function windowMat() { const m = M('#bfe8ff', { emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 0, roughness: 0.3 }); if (!nightMats.includes(m)) nightMats.push(m); return m; }

function house(x, z, roof) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  g.add(mesh(new THREE.BoxGeometry(3.3, 0.3, 3.3), M('#cdbfa6'), 0, 0.15, 0));
  g.add(mesh(new THREE.BoxGeometry(3, 1.9, 3), M('#fff3dc'), 0, 1.25, 0));
  const r = mesh(new THREE.ConeGeometry(2.55, 1.5, 4), M(roof || '#ef6f5e'), 0, 2.95, 0); r.rotation.y = Math.PI / 4; g.add(r);
  g.add(mesh(new THREE.BoxGeometry(0.8, 1.25, 0.08), M('#8a5a3b'), 0, 0.92, 1.52));
  g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), M('#ffd36b'), 0.25, 0.95, 1.58));
  [-0.95, 0.95].forEach(wx => { g.add(mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), windowMat(), wx, 1.45, 1.52)); g.add(mesh(new THREE.BoxGeometry(0.74, 0.08, 0.12), M('#ffffff'), wx, 1.1, 1.55)); });
  g.add(mesh(new THREE.BoxGeometry(0.4, 1, 0.4), M('#b9705a'), 0.9, 3.3, -0.5));
  // 信箱
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), M('#7a5238'), 1.9, 0.55, 1.6), mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), M('#5fa8ff'), 1.9, 1.05, 1.6));
  scene.add(g); boxC(x - 1.6, z - 1.6, x + 1.6, z + 1.6); colliders.push({ x: x + 1.9, z: z + 1.6, r: 0.25 });
  return g;
}
function museum(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  g.add(mesh(new THREE.BoxGeometry(7.2, 0.35, 5.2), M('#d9cdb6'), 0, 0.17, 0));
  g.add(mesh(new THREE.BoxGeometry(6.4, 2.8, 4), M('#efe6d4'), 0, 1.75, -0.3));
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.22, 0.25, 2.8, 12), M('#fffaf0'), -2.4 + i * 1.6, 1.75, 2.05));
  g.add(mesh(new THREE.BoxGeometry(7, 0.35, 5), M('#d8cfbf'), 0, 3.3, 0));
  const shape = new THREE.Shape(); shape.moveTo(-3.5, 0); shape.lineTo(3.5, 0); shape.lineTo(0, 1.3); shape.closePath();
  const ped = mesh(new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false }), M('#5b8fd6'), 0, 3.47, -2.5); g.add(ped);
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.8, 0.1), M('#6b4f3a'), 0, 1.25, 1.72));
  [-1.9, 1.9].forEach(wx => g.add(mesh(new THREE.BoxGeometry(0.9, 1.1, 0.1), windowMat(), wx, 1.9, 1.72)));
  const sg = label('潮汐博物館', '#5b8fd6', 2.6, 0.62); sg.position.set(0, 3.9, 2.56); g.add(sg);
  scene.add(g); boxC(x - 3.6, z - 2.6, x + 3.6, z + 1.9);
}
function shop(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  g.add(mesh(new THREE.BoxGeometry(3.6, 0.25, 3), M('#cdbfa6'), 0, 0.12, 0));
  g.add(mesh(new THREE.BoxGeometry(3.4, 2.1, 2.8), M('#ffe9a8'), 0, 1.3, 0));
  g.add(mesh(new THREE.BoxGeometry(3.7, 0.3, 3.1), M('#7bc96f'), 0, 2.5, 0));
  for (let i = 0; i < 7; i++) { const a = mesh(new THREE.BoxGeometry(0.5, 0.06, 1), M(i % 2 ? '#ffffff' : '#ff8a7a'), -1.5 + i * 0.5, 2.05, 1.75); a.rotation.x = 0.45; g.add(a); }
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), windowMat(), -0.6, 1.2, 1.42), mesh(new THREE.BoxGeometry(0.75, 1.3, 0.08), M('#8a5a3b'), 0.9, 0.9, 1.42));
  const sg = label('潮汐商店', '#5fbf6a', 2.0, 0.5); sg.position.set(0, 2.95, 1.6); g.add(sg);
  scene.add(g); boxC(x - 1.8, z - 1.5, x + 1.8, z + 1.5);
}
function lighthouse(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.CylinderGeometry(0.85 - i * 0.08, 0.92 - i * 0.08, 1, 16), M(i % 2 ? '#ef6f5e' : '#ffffff'), 0, 0.5 + i, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 12), M('#fff6c0', { emissive: new THREE.Color('#ffe08a'), emissiveIntensity: 0.4 }), 0, 5.4, 0));
  g.add(mesh(new THREE.ConeGeometry(0.8, 0.8, 12), M('#ef6f5e'), 0, 6.2, 0));
  const pl = new THREE.PointLight('#ffd98a', 0, 26, 1.6); pl.position.set(0, 5.4, 0); g.add(pl); lamps.push(pl);
  scene.add(g); colliders.push({ x, z, r: 1 });
}
function lamp(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 2, 8), M('#4a4f5c'), 0, 1, 0));
  const head = M('#fff6d8', { emissive: new THREE.Color('#ffc870'), emissiveIntensity: 0 }); nightMats.push(head);
  g.add(mesh(new THREE.SphereGeometry(0.22, 12, 8), head, 0, 2.1, 0), mesh(new THREE.ConeGeometry(0.28, 0.2, 10), M('#4a4f5c'), 0, 2.32, 0));
  const pl = new THREE.PointLight('#ffc870', 0, 9, 1.8); pl.position.set(0, 2.1, 0); g.add(pl); lamps.push(pl);
  scene.add(g); colliders.push({ x, z, r: 0.18 });
}
function bench(x, z, ry) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0;
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.08, 0.45), M('#c48a54'), 0, 0.45, 0), mesh(new THREE.BoxGeometry(1.4, 0.4, 0.06), M('#c48a54'), 0, 0.7, -0.2));
  [-0.6, 0.6].forEach(bx => g.add(mesh(new THREE.BoxGeometry(0.06, 0.45, 0.4), M('#5a5f6a'), bx, 0.22, 0)));
  scene.add(g); colliders.push({ x, z, r: 0.55 });
}
function pier(x, z, len) {
  const g = new THREE.Group(); g.position.set(x, 0.42, z);
  for (let i = 0; i < len * 2; i++) g.add(mesh(new THREE.BoxGeometry(1.8, 0.1, 0.45), M(i % 2 ? '#c99a62' : '#b98a55'), 0, 0, i * 0.5));
  for (let i = 0; i <= len; i += 2) [-0.85, 0.85].forEach(px => g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), M('#8a6038'), px, -0.5, i)));
  scene.add(g);
}
function stones(path) {
  const geo = new THREE.CylinderGeometry(0.3, 0.32, 0.06, 10), mat = M('#efe3c6');
  for (let i = 0; i < path.length - 1; i++) {
    const [a, b] = [path[i], path[i + 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / 0.85);
    for (let k = 0; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t + (rnd() - 0.5) * 0.2, z = a[1] + (b[1] - a[1]) * t + (rnd() - 0.5) * 0.2; const tt = T(Math.floor(x + C), Math.floor(z + C)); if (tt === 3 || tt < 0 || tt === 4) continue; const m = mesh(geo, mat, x, groundAt(x, z) + 0.03, z, { noCast: true }); m.scale.setScalar(0.8 + rnd() * 0.4); scene.add(m); }
  }
}

/* ---------- 擺設 ---------- */
const PLAZA = [-1, 4];
house(-9, 4, '#ef6f5e');
house(-12, 11, '#6fa8ef');
museum(0, -13.2);
shop(9.5, 3.4);
lighthouse(20.5, -4);
pier(-0.5, 21.6, 6);
tree(PLAZA[0], PLAZA[1] - 0.5, 1.9, 'pink');
bench(PLAZA[0] - 2.3, PLAZA[1] + 1.4, 0.6); bench(PLAZA[0] + 2.2, PLAZA[1] + 1.4, -0.6);
[[-4, 1.5], [3.5, 7.5], [-5.5, -3], [6.5, -3.5], [-2.2, 15.5]].forEach(([x, z]) => lamp(x, z));
// 橋
{
  const bx = BRIDGE.length ? BRIDGE.reduce((a, b) => a + b[0], 0) / BRIDGE.length - C + 0.5 : 4, bz = C + 2 - C + 1;
  const xs = BRIDGE.map(b => b[0] - C); const x0 = Math.min(...xs) - 0.6, x1 = Math.max(...xs) + 1.6, len = x1 - x0;
  const g = new THREE.Group(); g.position.set((x0 + x1) / 2, 1.0, bz);
  g.add(mesh(new THREE.BoxGeometry(len, 0.18, 2), M('#c99a62'), 0, 0.06, 0));
  [-0.95, 0.95].forEach(pz => { g.add(mesh(new THREE.BoxGeometry(len, 0.08, 0.08), M('#a57a4f'), 0, 0.6, pz)); for (let i = 0; i <= 3; i++) g.add(mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), M('#a57a4f'), -len / 2 + (len / 3) * i, 0.3, pz)); });
  scene.add(g); void bx;
}
stones([[-9, 6], [-6, 6], [PLAZA[0] - 1, PLAZA[1] + 2.5]]);
stones([[PLAZA[0] + 2.5, 3], [7.4, 3], [9.3, 5.7]]);
stones([[PLAZA[0], PLAZA[1] - 2.5], [3, -1.5], [RAMP_X[0] - C + 1, rampZ - C + 3.2]]);
stones([[RAMP_X[0] - C + 1, rampZ - C - 0.5], [1, -10.4]]);
stones([[PLAZA[0], PLAZA[1] + 3], [0, 12], [-0.5, 18]]);
// 樹、灌木、岩石、花
const occupied = (x, z, r) => colliders.some(c => c.r ? Math.hypot(c.x - x, c.z - z) < c.r + r : x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r);
const nearPath = (x, z) => Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 4.2 || Math.abs(x - 0) < 1.2 && z > 5 && z < 19 || Math.abs(z - 3.2) < 1.5 && x > -10 && x < 10 || Math.abs(z - 6) < 1.2 && x > -10 && x < -2;
for (let k = 0; k < 900; k++) {
  const x = (rnd() - 0.5) * N, z = (rnd() - 0.5) * N, t = T(Math.floor(x + C), Math.floor(z + C));
  if (nearPath(x, z) || occupied(x, z, 1.2)) continue;
  if (t === 1 && rnd() < 0.06) tree(x, z, 0.9 + rnd() * 0.3, rnd() < 0.15 ? 'pink' : 'round');
  else if (t === 2 && rnd() < 0.07) tree(x, z, 0.9 + rnd() * 0.3, 'cedar');
  else if (t === 0 && rnd() < 0.025 && riverDist(x, z) > 2) tree(x, z, 1, 'palm');
  else if ((t === 1 || t === 2) && rnd() < 0.03) bush(x, z);
  else if ((t === 0 || t === 2) && rnd() < 0.012) rock(x, z, 0.7 + rnd() * 0.5);
}
{
  const geo = new THREE.SphereGeometry(0.075, 6, 4), mat = bend(new THREE.MeshStandardMaterial({ roughness: 0.8 }));
  const inst = new THREE.InstancedMesh(geo, mat, 700); const m4 = new THREE.Matrix4(), col = new THREE.Color(); let n = 0;
  const pal = ['#ffffff', '#ff8fb1', '#ffd23f', '#b38bff', '#ff7a5a'];
  for (let k = 0; k < 3000 && n < 700; k++) {
    const cx = (rnd() - 0.5) * N, cz = (rnd() - 0.5) * N, t = T(Math.floor(cx + C), Math.floor(cz + C));
    if ((t !== 1 && t !== 2) || nearPath(cx, cz) || occupied(cx, cz, 0.6)) continue;
    const c = pal[Math.floor(rnd() * pal.length)];
    for (let j = 0; j < 5 && n < 700; j++) { const x = cx + (rnd() - 0.5) * 1.2, z = cz + (rnd() - 0.5) * 1.2; if (T(Math.floor(x + C), Math.floor(z + C)) !== t) continue; m4.makeTranslation(x, groundAt(x, z) + 0.1, z); inst.setMatrixAt(n, m4); inst.setColorAt(n, col.set(c)); n++; }
  }
  inst.count = n; inst.receiveShadow = true; scene.add(inst);
}

/* ---------- 角色 ---------- */
function eyes(g, y, z, big) {
  [-1, 1].forEach(s => {
    const e = mesh(new THREE.SphereGeometry(big ? 0.075 : 0.055, 12, 8), M('#2b2230', { roughness: 0.3 }), s * (big ? 0.13 : 0.12), y, z, { noCast: true }); e.scale.set(1, 1.35, 0.5);
    const hl = mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), s * (big ? 0.13 : 0.12) + 0.02, y + 0.03, z + 0.03, { noCast: true }); bend(hl.material);
    g.add(e, hl); (g.userData.eyes = g.userData.eyes || []).push(e, hl);
  });
}
function chibi(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = o.fur || '#ffd9b8';
  const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.18, 4, 12), M(o.shirt), 0, 0.5, 0); torso.scale.set(1.1, 1, 0.9); body.add(torso);
  const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.09, 0.32, 0); p.add(mesh(new THREE.CapsuleGeometry(0.065, 0.14, 4, 8), M(o.pants || skin), 0, -0.13, 0)); p.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), M(o.shoe || '#6b4f3a'), 0, -0.24, 0.03)); body.add(p); return p; });
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.25, 0.62, 0); const a = mesh(new THREE.CapsuleGeometry(0.055, 0.16, 4, 8), M(o.shirt), 0, -0.1, 0); p.add(a); p.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), M(skin), 0, -0.22, 0)); p.rotation.z = s * 0.25; body.add(p); return p; });
  const head = new THREE.Group(); head.position.y = 1.08; body.add(head);
  const hm = mesh(new THREE.SphereGeometry(0.37, 24, 18), M(skin), 0, 0, 0); hm.scale.set(1.08, 0.95, 1); head.add(hm);
  const big = o.kind === 'owl';
  eyes(head, big ? 0.02 : 0.02, 0.33, big);
  [-1, 1].forEach(s => { const c = mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#ff9fb0', { transparent: true, opacity: 0.75 }), s * 0.22, -0.08, 0.3, { noCast: true }); c.scale.set(1, 0.6, 0.3); head.add(c); });
  if (o.kind === 'human') {
    const hair = mesh(new THREE.SphereGeometry(0.4, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), M(o.hair), 0, 0.05, -0.03); hair.scale.set(1.08, 1, 1.05); head.add(hair);
    const bang = mesh(new THREE.SphereGeometry(0.2, 12, 8), M(o.hair), 0.12, 0.24, 0.24); bang.scale.set(1.4, 0.55, 0.6); head.add(bang);
    head.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), M('#d0705a'), 0, -0.12, 0.35, { noCast: true }));
  } else {
    const snout = mesh(new THREE.SphereGeometry(0.12, 12, 8), M(o.inner || '#ffffff'), 0, -0.1, 0.3, { noCast: true }); snout.scale.set(1.3, 0.8, 0.7);
    if (!big) { head.add(snout); head.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), M('#ff7a8a'), 0, -0.05, 0.38, { noCast: true })); }
    if (o.kind === 'cat') [-1, 1].forEach(s => { const e = mesh(new THREE.ConeGeometry(0.12, 0.24, 4), M(skin), s * 0.2, 0.33, 0); e.rotation.z = -s * 0.35; e.rotation.y = Math.PI / 4; head.add(e); const ei = mesh(new THREE.ConeGeometry(0.06, 0.14, 4), M(o.inner), s * 0.2, 0.31, 0.04, { noCast: true }); ei.rotation.copy(e.rotation); head.add(ei); });
    if (o.kind === 'bunny') [-1, 1].forEach(s => { const e = mesh(new THREE.CapsuleGeometry(0.07, 0.36, 4, 8), M(skin), s * 0.12, 0.52, -0.02); e.rotation.z = -s * 0.15; head.add(e); const ei = mesh(new THREE.CapsuleGeometry(0.035, 0.28, 4, 6), M(o.inner), s * 0.12, 0.52, 0.04, { noCast: true }); ei.rotation.z = -s * 0.15; head.add(ei); });
    if (big) {
      [-1, 1].forEach(s => { const r = mesh(new THREE.SphereGeometry(0.13, 16, 10), M('#ffffff'), s * 0.13, 0.02, 0.29, { noCast: true }); r.scale.set(1, 1, 0.35); head.add(r); const t = mesh(new THREE.ConeGeometry(0.06, 0.18, 6), M(skin), s * 0.24, 0.32, 0); t.rotation.z = -s * 0.5; head.add(t); });
      const beak = mesh(new THREE.ConeGeometry(0.05, 0.13, 8), M('#ffb347'), 0, -0.1, 0.37, { noCast: true }); beak.rotation.x = Math.PI / 2 + 0.4; head.add(beak);
      const belly = mesh(new THREE.SphereGeometry(0.17, 12, 8), M(o.inner), 0, 0.5, 0.12, { noCast: true }); belly.scale.set(1, 1.1, 0.6); body.add(belly);
    }
    if (o.kind === 'cat') { const tl = mesh(new THREE.CapsuleGeometry(0.04, 0.35, 4, 6), M(skin), 0, 0.45, -0.24); tl.rotation.x = -0.9; body.add(tl); }
    if (o.kind === 'bunny') body.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), M('#ffffff'), 0, 0.38, -0.2));
    if (o.acc === 'glasses') { const gm = M('#3a3040'); [-1, 1].forEach(s => { const r = mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16), gm, s * 0.13, 0.02, 0.36, { noCast: true }); head.add(r); }); }
    if (o.acc === 'brush') { const b = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), M('#7a5238'), 0, 0, 0); b.position.set(0, -0.32, 0.05); b.rotation.x = 0.4; arms[1].add(b); }
  }
  root.userData = { body, head, legs, arms, walk: 0, speed: 0, blink: 2 + Math.random() * 3 };
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return root;
}
function animate(ch, dt, moving, t) {
  const u = ch.userData;
  u.speed += ((moving ? 1 : 0) - u.speed) * Math.min(1, dt * 10);
  u.walk += dt * (moving === 2 ? 15 : 10) * u.speed;
  const sw = Math.sin(u.walk) * 0.7 * u.speed;
  u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw;
  u.arms[0].rotation.x = -sw * 0.8; u.arms[1].rotation.x = sw * 0.8;
  u.body.position.y = Math.abs(Math.sin(u.walk)) * 0.06 * u.speed + Math.sin(t * 2) * 0.008;
  u.head.rotation.z = Math.sin(u.walk * 0.5) * 0.05 * u.speed;
  u.blink -= dt; const eyes = u.head.userData.eyes || [];
  const close = u.blink < 0.12; eyes.forEach((e, i) => { if (i % 2 === 0) e.scale.y = close ? 0.15 : 1.35; else e.visible = !close; });
  if (u.blink < 0) u.blink = 2 + Math.random() * 4;
}

const player = chibi({ kind: 'human', shirt: '#7cc7ff', pants: '#5a6fb0', hair: '#5a3a2a', shoe: '#ff8a6a' });
player.position.set(PLAZA[0] + 1.5, groundAt(PLAZA[0] + 1.5, PLAZA[1] + 3), PLAZA[1] + 3);
scene.add(player);

const VILLAGERS = [
  { sid: 'english', name: 'Lexi', kind: 'bunny', fur: '#f7eef4', inner: '#ffb3c8', shirt: '#7cc7ff', pants: '#f7eef4', home: [-4.5, 8.5], range: 4,
    hi: ['Hi there! 今天天氣真好～', 'Morning! 我剛背完十個新單字！', '嘿！要不要跟我玩個英文小問答？'], ok: ['Awesome! 你真的很厲害！', 'Perfect! 我要把這題記下來～'], bad: ['Oops！沒關係，明天我再問你一次！'] },
  { sid: 'chinese', name: '墨言', kind: 'cat', fur: '#5a5f6e', inner: '#f2c6c6', shirt: '#efe6d0', pants: '#5a5f6e', acc: 'brush', home: [-10, 9.5], range: 3,
    hi: ['喵……今天想寫一首詩。', '你知道「莞爾」的莞怎麼念嗎？喵～', '讀書累了，就來樹下坐坐吧。'], ok: ['喵！答得漂亮。', '不錯不錯，賞你一條小魚乾。'], bad: ['喵嗚……這個字很容易念錯呢。'] },
  { sid: 'history', name: '史遙', kind: 'owl', fur: '#9b7a55', inner: '#f4e6c8', shirt: '#7a5aa8', pants: '#9b7a55', acc: 'glasses', home: [0.5, -9.6], range: 2,
    hi: ['呼呼……歡迎來到博物館！', '我最喜歡化石和古文書了，呼～', '每件展品背後，都有一段時代的故事。'], ok: ['呼呼！太棒了，這可以寫進展覽說明！', '答對了！你很有歷史學家的眼光。'], bad: ['呼……再看一次時代背景，你一定懂的。'] }
];
VILLAGERS.forEach(v => {
  v.sub = TA.subject(v.sid); v.mesh = chibi(v); const [x, z] = v.home;
  v.mesh.position.set(x, groundAt(x, z), z); v.target = [x, z]; v.wait = 1 + Math.random() * 3; v.face = 0;
  scene.add(v.mesh);
  v.tag = document.createElement('div'); v.tag.className = 'tag'; v.tag.style.setProperty('--c', v.sub.color); v.tag.innerHTML = `${v.name}<small>${v.sub.name}</small>`; $('labels').appendChild(v.tag);
});

/* ---------- 蝴蝶、魚影 ---------- */
const flies = [];
for (let i = 0; i < 8; i++) {
  const g = new THREE.Group(), c = ['#ffd23f', '#ffffff', '#ff9fd0', '#8fd0ff'][i % 4];
  const wm = bend(new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  const w1 = new THREE.Mesh(new THREE.CircleGeometry(0.13, 8), wm), w2 = w1.clone();
  w1.position.x = 0.1; w2.position.x = -0.1; const L = new THREE.Group(), R = new THREE.Group(); L.add(w1); R.add(w2); g.add(L, R);
  g.userData = { L, R, cx: (rnd() - 0.5) * 30, cz: (rnd() - 0.5) * 30, ph: rnd() * 6 };
  scene.add(g); flies.push(g);
}
const fishes = [];
for (let i = 0; i < 9; i++) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), bend(new THREE.MeshBasicMaterial({ color: '#0b3550', transparent: true, opacity: 0.32, depthWrite: false })));
  m.rotation.x = -Math.PI / 2; m.scale.set(0.5 + rnd() * 0.6, 1, 1); m.userData = { a: rnd() * 6.28, r: 25 + rnd() * 6, sp: 0.03 + rnd() * 0.04 };
  scene.add(m); fishes.push(m);
}
const puffs = [];
function puff(x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bend(new THREE.MeshBasicMaterial({ color: '#fffaf0', transparent: true, opacity: 0.8 })));
  m.position.set(x + (Math.random() - 0.5) * 0.2, y + 0.05, z + (Math.random() - 0.5) * 0.2); m.userData.t = 0; scene.add(m); puffs.push(m);
}

/* ---------- 時間與光照 ---------- */
let hourOverride = null;
const KEYS = [
  [0, { top: '#10285a', bot: '#3a5c9c', sun: '#a8c4ff', si: 0.95, hs: '#7290d0', hg: '#2c3c4c', hi: 0.95, fog: '#2a4274', exp: 1.05, night: 1 }],
  [5, { top: '#1d3468', bot: '#6a6a9a', sun: '#b0c0ff', si: 0.9, hs: '#7a8ac0', hg: '#2a3a3a', hi: 0.9, fog: '#4a5a8a', exp: 1.0, night: 0.8 }],
  [6.5, { top: '#ffb38a', bot: '#ffe2c0', sun: '#ffcf9a', si: 1.5, hs: '#ffd8b8', hg: '#7a9a6a', hi: 0.85, fog: '#ffdcc0', exp: 1, night: 0 }],
  [9, { top: '#5ec2ff', bot: '#d4f1ff', sun: '#fff4e0', si: 2.6, hs: '#cfeaff', hg: '#8ab868', hi: 1.1, fog: '#cfeeff', exp: 1, night: 0 }],
  [16, { top: '#5ec2ff', bot: '#d4f1ff', sun: '#fff0d8', si: 2.5, hs: '#cfeaff', hg: '#8ab868', hi: 1.05, fog: '#cfeeff', exp: 1, night: 0 }],
  [18, { top: '#6a7fd8', bot: '#ffae84', sun: '#ff9a5a', si: 1.6, hs: '#ffc0a0', hg: '#6a7a5a', hi: 0.8, fog: '#ffc0a0', exp: 1, night: 0.1 }],
  [19.5, { top: '#24386e', bot: '#c88a9a', sun: '#c8b0ff', si: 0.9, hs: '#8a8ac0', hg: '#2c3c3c', hi: 0.85, fog: '#5a5a8a', exp: 1.0, night: 0.7 }],
  [21, { top: '#10285a', bot: '#3a5c9c', sun: '#a8c4ff', si: 0.95, hs: '#7290d0', hg: '#2c3c4c', hi: 0.95, fog: '#2a4274', exp: 1.05, night: 1 }],
  [24, { top: '#10285a', bot: '#3a5c9c', sun: '#a8c4ff', si: 0.95, hs: '#7290d0', hg: '#2c3c4c', hi: 0.95, fog: '#2a4274', exp: 1.05, night: 1 }]
];
const ca = new THREE.Color(), cb = new THREE.Color();
const lerpC = (a, b, k) => ca.set(a).lerp(cb.set(b), k).clone();
function applyTime(h) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, A] = KEYS[i], [h1, B] = KEYS[i + 1], k = THREE.MathUtils.smoothstep(h, h0, h1);
  skyU.top.value.copy(lerpC(A.top, B.top, k)); skyU.bot.value.copy(lerpC(A.bot, B.bot, k));
  sun.color.copy(lerpC(A.sun, B.sun, k)); sun.intensity = A.si + (B.si - A.si) * k;
  hemi.color.copy(lerpC(A.hs, B.hs, k)); hemi.groundColor.copy(lerpC(A.hg, B.hg, k)); hemi.intensity = A.hi + (B.hi - A.hi) * k;
  scene.fog.color.copy(lerpC(A.fog, B.fog, k));
  renderer.toneMappingExposure = A.exp + (B.exp - A.exp) * k;
  const night = A.night + (B.night - A.night) * k; skyU.night.value = night;
  // 太陽／月亮方位：白天東昇西落，夜晚改用月光
  const day = h >= 6 && h <= 19, t = day ? (h - 6) / 13 : ((h + 24 - 19) % 24) / 11;
  const ang = t * Math.PI;
  const dir = new THREE.Vector3(Math.cos(ang) * 0.8, Math.sin(ang) * 0.85 + 0.25, 0.55).normalize();
  skyU.sunDir.value.copy(dir); skyU.sunCol.value.copy(sun.color).multiplyScalar(day ? 1 : 0.4);
  nightMats.forEach(m => { m.emissiveIntensity = night * 1.6; });
  lamps.forEach(l => { l.intensity = night * 6; });
  waterMat.color.set(night > 0.5 ? '#2e6f9a' : '#56d2e0');
  return dir;
}

/* ---------- 輸入 ---------- */
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); interact(); }
  if (e.code === 'Tab') { e.preventDefault(); togglePhone(); }
  if (dlg.choosing && /^Digit[1-4]$/.test(e.code)) pickChoice(+e.code.slice(5) - 1);
  if (dlg.choosing && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) { dlg.hl = (dlg.hl + (e.code === 'ArrowUp' ? -1 : 1) + dlg.n) % dlg.n; paintHl(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
let moveTo = null;
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
$('cv').addEventListener('pointerdown', e => {
  hideHint();
  if (dlg.open) { interact(); return; }
  mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const vs = ray.intersectObjects(VILLAGERS.map(v => v.mesh), true);
  if (vs.length) { const v = VILLAGERS.find(v => vs[0].object.parent && isChild(v.mesh, vs[0].object)); if (v) { moveTo = { x: v.mesh.position.x, z: v.mesh.position.z, talk: v }; return; } }
  const hit = ray.intersectObject(terrain)[0]; if (hit) moveTo = { x: hit.point.x, z: hit.point.z };
});
const isChild = (root, o) => { while (o) { if (o === root) return true; o = o.parent; } return false; };
let hintT = 0; function hideHint() { if (!hintT) { hintT = 1; setTimeout(() => $('hint').classList.add('off'), 4000); } }

/* ---------- 移動與碰撞 ---------- */
function walkable(x, z, fromY) {
  const tx = Math.floor(x + C), tz = Math.floor(z + C), t = T(tx, tz);
  if (!isBridge(tx, tz) && (t < 0 || t === 3)) return false;
  if (Math.abs(groundAt(x, z) - fromY) > 0.7) return false;
  for (const c of colliders) {
    if (c.r) { if (Math.hypot(c.x - x, c.z - z) < c.r + 0.25) return false; }
    else if (x > c.x0 - 0.25 && x < c.x1 + 0.25 && z > c.z0 - 0.25 && z < c.z1 + 0.25) return false;
  }
  for (const v of VILLAGERS) if (v.mesh !== this && Math.hypot(v.mesh.position.x - x, v.mesh.position.z - z) < 0.55) return false;
  return true;
}
function stepChar(ch, dx, dz, dt, speed) {
  const p = ch.position, y = groundAt(p.x, p.z);
  const nx = p.x + dx * speed * dt, nz = p.z + dz * speed * dt;
  const ok = (x, z) => walkable.call(ch, x, z, y);
  if (ok(nx, nz)) { p.x = nx; p.z = nz; } else if (ok(nx, p.z)) p.x = nx; else if (ok(p.x, nz)) p.z = nz; else return false;
  return true;
}
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * k; };

/* ---------- 對話 ---------- */
const dlg = { open: false, typing: false, choosing: false, queue: [], v: null, hl: 0, n: 0 };
let near = null;
const plain = s => String(s || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '');
const FR = JSON.parse(localStorage.getItem('isle-fr') || '{}');
let bells = +(localStorage.getItem('isle-bells') || 1200), answered = +(localStorage.getItem('isle-ans-' + new Date().toDateString()) || 0);
function pickQ(sid) {
  const qs = (TA.DATA.units[sid] || []).flatMap(u => u.questions || []).filter(q => !q.pid && q.type !== 'multi' && plain(q.q).length < 80 && q.o.every(o => plain(o).length < 40));
  return qs[Math.floor(Math.random() * qs.length)];
}
let audio = null;
function blip(pitch) {
  if (!audio) return; const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain(), f = audio.createBiquadFilter();
  o.type = 'square'; o.frequency.value = pitch * (0.85 + Math.random() * 0.4); f.type = 'lowpass'; f.frequency.value = 1800;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(f); f.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.08);
}
function chime(ok) {
  if (!audio) return; const t = audio.currentTime;
  (ok ? [72, 76, 79, 84] : [64, 60]).forEach((n, i) => { const o = audio.createOscillator(), g = audio.createGain(); o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (n - 69) / 12); g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5); o.connect(g); g.connect(audio.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.6); });
}
function say(v, text, then) {
  dlg.open = true; dlg.v = v; $('dlg').hidden = false; $('choices').innerHTML = '';
  $('dlgName').textContent = v ? v.name : '你'; $('dlg').style.setProperty('--c', v ? v.sub.color : '#7cc7ff');
  const el = $('dlgText'); el.textContent = ''; $('dlgNext').classList.add('off');
  dlg.typing = true; dlg.then = then; dlg.full = text; let i = 0;
  clearInterval(dlg.timer);
  dlg.timer = setInterval(() => {
    i++; el.textContent = text.slice(0, i); if (i % 2 === 0 && /\S/.test(text[i - 1] || '')) blip(v ? v.pitch : 300);
    if (i >= text.length) { clearInterval(dlg.timer); dlg.typing = false; if (!dlg.choosing) $('dlgNext').classList.remove('off'); if (dlg.onDone) { const f = dlg.onDone; dlg.onDone = null; f(); } }
  }, 32);
}
function interact() {
  if (phoneOpen) return;
  if (dlg.open) {
    if (dlg.choosing) { pickChoice(dlg.hl); return; }
    if (dlg.typing) { clearInterval(dlg.timer); dlg.typing = false; $('dlgText').textContent = dlg.full; $('dlgNext').classList.remove('off'); if (dlg.onDone) { const f = dlg.onDone; dlg.onDone = null; f(); } return; }
    const f = dlg.then; dlg.then = null; if (f) f(); else closeDlg(); return;
  }
  if (near) talk(near);
}
function closeDlg() { dlg.open = false; dlg.choosing = false; $('dlg').hidden = true; if (dlg.v) dlg.v.talking = false; }
function talk(v) {
  v.talking = true; v.pitch = v.kind === 'owl' ? 230 : v.kind === 'cat' ? 380 : 470;
  const q = pickQ(v.sid);
  say(v, pick(v.hi), () => {
    if (!q) { say(v, '今天就先聊到這裡吧！'); return; }
    dlg.onDone = () => askChoices(v, q);
    say(v, plain(q.q));
  });
}
const pick = a => a[Math.floor(Math.random() * a.length)];
function askChoices(v, q) {
  dlg.choosing = true; dlg.q = q; dlg.hl = 0; dlg.n = q.o.length; $('dlgNext').classList.add('off');
  $('choices').innerHTML = '';
  q.o.forEach((o, i) => { const b = document.createElement('button'); b.className = 'choice'; b.type = 'button'; b.style.animationDelay = (i * 0.05) + 's'; b.textContent = plain(o); b.onclick = e => { e.stopPropagation(); pickChoice(i); }; b.onmouseenter = () => { dlg.hl = i; paintHl(); }; $('choices').appendChild(b); });
  paintHl();
}
function paintHl() { [...$('choices').children].forEach((b, i) => b.classList.toggle('hl', i === dlg.hl)); }
function pickChoice(i) {
  if (!dlg.choosing) return;
  const v = dlg.v, q = dlg.q, ok = i === q.a; dlg.choosing = false; $('choices').innerHTML = '';
  answered++; localStorage.setItem('isle-ans-' + new Date().toDateString(), answered);
  chime(ok);
  if (ok) {
    FR[v.sid] = Math.min(10, (FR[v.sid] || 0) + 1); localStorage.setItem('isle-fr', JSON.stringify(FR));
    const gain = 100 * (q.d || 1); bells += gain; localStorage.setItem('isle-bells', bells);
    emote(v.mesh, '♪', '#ff7b9c'); floatText(player, `+${gain} 鈴錢`);
    say(v, pick(v.ok) + `（好感度 ${'♥'.repeat(Math.ceil(FR[v.sid] / 2))}）`);
  } else {
    emote(v.mesh, '💧', '#5fa8ff');
    say(v, `${pick(v.bad)}正確答案是「${plain(q.o[q.a])}」。`, () => say(v, plain(q.e).slice(0, 110) + (plain(q.e).length > 110 ? '…' : ''), () => say(v, '明天我再問你一次喔！')));
  }
  paintHud();
}
function screenOf(obj, dy) {
  const p = new THREE.Vector3(); obj.getWorldPosition(p); p.y += dy;
  p.applyMatrix4(camera.matrixWorldInverse); p.y -= p.z * p.z * U.uCurve.value; p.applyMatrix4(camera.projectionMatrix);
  return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight, p.z < 1];
}
function emote(obj, text, color) {
  const el = document.createElement('div'); el.className = 'emote'; el.textContent = text; el.style.color = color; $('labels').appendChild(el);
  const t0 = performance.now(); const tick = () => { const [x, y] = screenOf(obj, 1.9); el.style.left = x + 'px'; el.style.top = y + 'px'; if (performance.now() - t0 < 1600) requestAnimationFrame(tick); else el.remove(); }; tick();
}
function floatText(obj, text) {
  const el = document.createElement('div'); el.className = 'float'; el.textContent = text; $('labels').appendChild(el);
  const [x, y] = screenOf(obj, 1.7); el.style.left = x + 'px'; el.style.top = y + 'px'; setTimeout(() => el.remove(), 1400);
}

/* ---------- 手機 ---------- */
let phoneOpen = false;
$('phoneBtn').onclick = () => togglePhone();
$('phClose').onclick = () => togglePhone(false);
function togglePhone(force) {
  phoneOpen = force == null ? !phoneOpen : force; $('phone').hidden = !phoneOpen; if (phoneOpen) phoneHome();
}
function phoneHome() {
  const apps = [['島民', '🐰', '#ffb3c8', phoneVillagers], ['地圖', '🗺', '#9fe0a0', phoneMap], ['博物館', '🦴', '#b9d0ff', () => phoneSoon('博物館圖鑑：魚＝英文單字、蟲＝字音字形、化石＝潮汐筆記')], ['今日複習', '📚', '#ffd36b', () => phoneSoon(`今天在島上答了 ${answered} 題。正式版會把到期複習變成島上的掉落物。`)], ['時間', '⏰', '#ffc0a0', phoneTime], ['DIY', '🔨', '#e0c0ff', () => phoneSoon('DIY 配方：沿用「配方試煉」，答對才學得會。')]];
  const b = $('phBody'); b.innerHTML = '<div class="apps"></div>';
  apps.forEach(([n, ic, c, fn]) => { const a = document.createElement('button'); a.className = 'app'; a.type = 'button'; a.innerHTML = `<i style="--c:${c}">${ic}</i>${n}`; a.onclick = fn; b.firstChild.appendChild(a); });
}
function back() { const btn = document.createElement('button'); btn.className = 'ph-back'; btn.type = 'button'; btn.textContent = '← 返回'; btn.onclick = phoneHome; return btn; }
function phoneSoon(text) { const b = $('phBody'); b.innerHTML = `<p style="font-weight:700;line-height:1.8">${text}</p>`; b.appendChild(back()); }
function phoneVillagers() {
  const b = $('phBody'); b.innerHTML = '<div class="ph-list"></div>';
  VILLAGERS.forEach(v => { const f = FR[v.sid] || 0; const r = document.createElement('div'); r.className = 'ph-row'; r.innerHTML = `<span class="av" style="--c:${v.sub.color}">${v.sub.short}</span><div><b>${v.name}</b><small>${v.sub.name}導師 · 好感度 <span class="hearts">${'♥'.repeat(Math.ceil(f / 2)) + '♡'.repeat(5 - Math.ceil(f / 2))}</span></small></div>`; b.firstChild.appendChild(r); });
  b.appendChild(back());
}
function phoneMap() {
  const b = $('phBody'); b.innerHTML = ''; const cv = document.createElement('canvas'); cv.width = N * 4; cv.height = N * 4; cv.className = 'ph-map'; const c = cv.getContext('2d');
  const col = { '-1': '#4cc9d8', 0: '#f6e7b8', 1: '#84cf5c', 2: '#6fbd4f', 3: '#6fe0e6', 4: '#c9a87a' };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { c.fillStyle = isBridge(x, z) ? '#c99a62' : col[T(x, z)]; c.fillRect(x * 4, z * 4, 4, 4); }
  const dot = (x, z, cl, r) => { c.fillStyle = cl; c.beginPath(); c.arc((x + C) * 4, (z + C) * 4, r, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); };
  VILLAGERS.forEach(v => dot(v.mesh.position.x, v.mesh.position.z, v.sub.color, 6));
  dot(player.position.x, player.position.z, '#ff7a5a', 7);
  b.appendChild(cv); b.appendChild(back());
}
function phoneTime() {
  const b = $('phBody'); b.innerHTML = `<div class="ph-set"><label>預覽時間（拖曳看日夜變化）<input type="range" min="0" max="24" step="0.25" value="${hourOverride ?? nowHour()}"></label><p style="font-size:13px;color:#9a7d62">正式版跟現實時間同步。</p></div>`;
  const inp = b.querySelector('input'); inp.oninput = () => { hourOverride = +inp.value; };
  const r = document.createElement('button'); r.className = 'ph-back'; r.type = 'button'; r.textContent = '回到現實時間'; r.style.marginRight = '8px'; r.onclick = () => { hourOverride = null; phoneTime(); };
  b.appendChild(r); b.appendChild(back());
}

/* ---------- HUD ---------- */
const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
function paintHud() {
  const d = new Date(), h = hourOverride ?? nowHour(), hh = Math.floor(h), mm = Math.floor((h % 1) * 60);
  $('hm').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('date').textContent = `${d.getMonth() + 1}月${d.getDate()}日（${'日一二三四五六'[d.getDay()]}）`;
  $('wx').textContent = h >= 6 && h < 18.5 ? '☀' : '🌙';
  const exam = Math.ceil((new Date('2027-01-22') - new Date(d.toDateString())) / 864e5);
  $('exam').textContent = `學測 D-${exam}`; $('goal').textContent = `今日 ${answered} / 30`;
  $('bells').textContent = bells.toLocaleString();
}
paintHud(); setInterval(paintHud, 5000);

/* ---------- 音樂（悠閒的整點 BGM 風格） ---------- */
function startAudio() {
  if (audio) return; audio = new (window.AudioContext || window.webkitAudioContext)();
  const master = audio.createGain(); master.gain.value = 0.5; master.connect(audio.destination);
  // 海浪
  const len = audio.sampleRate * 2, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource(); src.buffer = buf; src.loop = true; const lp = audio.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const wg = audio.createGain(); wg.gain.value = 0.05;
  const lfo = audio.createOscillator(), lg = audio.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.035; lfo.connect(lg); lg.connect(wg.gain); lfo.start();
  src.connect(lp); lp.connect(wg); wg.connect(master); src.start();
  // 旋律：五聲音階的撥弦＋低音
  const scale = [0, 2, 4, 7, 9, 12, 14, 16], chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const note = (m, t, dur, vol, type) => { const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); };
  let step = 0, next = audio.currentTime + 0.2; const spb = 60 / 92 / 2;
  setInterval(() => {
    while (next < audio.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % 4, ch = chords[bar], night = skyU.night.value > 0.5;
      if (step % 8 === 0) ch.forEach(n => note(n - 12, next, spb * 7, 0.035, 'sine'));
      if (step % 8 === 0) note(ch[0] - 24, next, spb * 3, 0.06, 'triangle');
      if (Math.random() < (night ? 0.35 : 0.6) && step % 2 === 0 || step % 8 === 4) { const m = (night ? 67 : 72) + scale[Math.floor(Math.random() * scale.length)]; note(m, next, spb * 2.5, 0.03, 'triangle'); }
      next += spb; step++;
    }
  }, 100);
}
$('start').onclick = () => { $('splash').classList.add('out'); setTimeout(() => $('splash').remove(), 700); startAudio(); };

/* ---------- 主迴圈 ---------- */
const clock = new THREE.Clock();
const camOff = new THREE.Vector3(0, 12.5, 15.5), camPos = new THREE.Vector3(), look = new THREE.Vector3();
let zoom = 1;
addEventListener('wheel', e => { zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.001, 0.6, 1.5); }, { passive: true });
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
camPos.copy(player.position).add(camOff);
let puffT = 0;

function frame() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  U.uTime.value = t;
  // 玩家
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (dlg.open || phoneOpen) { ix = iz = 0; moveTo = null; }
  $('hint').style.visibility = dlg.open ? 'hidden' : '';
  if (ix || iz) moveTo = null;
  if (moveTo) { const dx = moveTo.x - player.position.x, dz = moveTo.z - player.position.z, d = Math.hypot(dx, dz); const stopAt = moveTo.talk ? 1.3 : 0.15; if (d < stopAt) { const v = moveTo.talk; moveTo = null; if (v) { player.rotation.y = Math.atan2(dx, dz); talk(v); } } else { ix = dx / d; iz = dz / d; } }
  const run = keys.ShiftLeft || keys.ShiftRight, len = Math.hypot(ix, iz), moving = len > 0.01;
  if (moving) {
    ix /= len; iz /= len;
    const moved = stepChar(player, ix, iz, dt, run ? 6 : 3.4);
    if (!moved && moveTo) moveTo = null;
    player.rotation.y = angLerp(player.rotation.y, Math.atan2(ix, iz), Math.min(1, dt * 12));
    if (run && (puffT -= dt) < 0) { puffT = 0.12; puff(player.position.x, player.position.y, player.position.z); }
  }
  player.position.y += (groundAt(player.position.x, player.position.z) - player.position.y) * Math.min(1, dt * 14);
  animate(player, dt, moving ? (run ? 2 : 1) : 0, t);
  // 島民
  near = null; let best = 2.4;
  VILLAGERS.forEach(v => {
    const m = v.mesh, dpx = player.position.x - m.position.x, dpz = player.position.z - m.position.z, dp = Math.hypot(dpx, dpz);
    let mv = 0;
    if (v.talking || dp < 2.4) { m.rotation.y = angLerp(m.rotation.y, Math.atan2(dpx, dpz), Math.min(1, dt * 6)); }
    else {
      v.wait -= dt;
      if (v.wait <= 0) { v.target = [v.home[0] + (Math.random() - 0.5) * v.range * 2, v.home[1] + (Math.random() - 0.5) * v.range * 2]; v.wait = 3 + Math.random() * 5; }
      const dx = v.target[0] - m.position.x, dz = v.target[1] - m.position.z, d = Math.hypot(dx, dz);
      if (d > 0.2) { if (stepChar(m, dx / d, dz / d, dt, 1.4)) { mv = 1; m.rotation.y = angLerp(m.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6)); } else v.target = [m.position.x, m.position.z]; }
    }
    m.position.y += (groundAt(m.position.x, m.position.z) - m.position.y) * Math.min(1, dt * 10);
    animate(m, dt, mv, t);
    if (dp < best && !dlg.open) { best = dp; near = v; }
    const [sx, sy, vis] = screenOf(m, 1.75); v.tag.style.left = sx + 'px'; v.tag.style.top = sy + 'px'; v.tag.style.opacity = vis && dp < 9 && !v.talking ? 1 : 0;
  });
  // 交談提示
  let pr = $('labels').querySelector('.prompt');
  if (near && !dlg.open) { if (!pr) { pr = document.createElement('div'); pr.className = 'prompt'; pr.innerHTML = '<kbd>空白鍵</kbd>聊天'; $('labels').appendChild(pr); } const [x, y] = screenOf(near.mesh, 2.25); pr.style.left = x + 'px'; pr.style.top = y + 'px'; }
  else if (pr) pr.remove();
  // 蝴蝶、魚影、腳步煙塵
  const night = skyU.night.value;
  flies.forEach((f, i) => { const u = f.userData, a = t * 0.4 + u.ph; f.visible = night < 0.5; f.position.set(u.cx + Math.sin(a) * 3, groundAt(u.cx, u.cz) + 1 + Math.sin(t * 2 + i) * 0.3, u.cz + Math.cos(a * 1.3) * 3); f.rotation.y = a; u.L.rotation.y = Math.sin(t * 18 + i) * 0.9; u.R.rotation.y = -u.L.rotation.y; });
  fishes.forEach(f => { const u = f.userData; u.a += u.sp * dt * 3; f.position.set(Math.cos(u.a) * u.r, -0.25, Math.sin(u.a) * u.r * 0.95); f.rotation.z = -u.a; });
  for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.userData.t += dt; p.scale.setScalar(1 + p.userData.t * 4); p.material.opacity = 0.8 * (1 - p.userData.t / 0.5); p.position.y += dt * 0.5; if (p.userData.t > 0.5) { scene.remove(p); puffs.splice(i, 1); } }
  // 光照與鏡頭
  const sdir = applyTime(hourOverride ?? nowHour());
  look.set(player.position.x, player.position.y + 0.8, player.position.z);
  camPos.lerp(look.clone().add(camOff.clone().multiplyScalar(zoom)), Math.min(1, dt * 4));
  camera.position.copy(camPos); camera.lookAt(look);
  sun.position.copy(look).addScaledVector(sdir, 50); sun.target.position.copy(look);
  sky.position.copy(camera.position);
  foamMat.opacity = 0.45 + Math.sin(t * 1.6) * 0.2;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__isle = { scene, camera, player, VILLAGERS, setHour: h => { hourOverride = h; paintHud(); }, talk, renderer, frame };
