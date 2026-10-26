/* 潮汐小島 · 西部高地（v6.15）：島的西邊新長出的一大片地區。
   東緣是一道懸崖，坡道在 z ≈ 10；高地上是松林與竹林、巨石與野花；山頂（高 5）可以三段跳或爬梯子上去，有一張看夕陽海景的長椅；
   高地池塘從懸崖落下一道瀑布，注入下方的水潭。 */
import * as THREE from 'three';
import { scene, M, mesh, U, bend, cullable } from './engine.js';
import { N, C, T, tileAt, legacyTile, groundAt, WATER_Y, ramp2X, PLANNED, STAIRS, warp } from './terrain.js';
import { tree, rock, bush, bench, blocked, colliders, seats, wildFlowers, label, rnd, SITES, modelClone, mergeStatic } from './props.js';
import * as ui from './ui.js';
import { register } from './props3d.js';
import * as glow from './glow.js';
import * as Audio from './audio.js';

const PLAN = (window.TA.ISLE || {}).PLAN;
/** 佈置範圍：新島（v6.79）是規劃的西部高地台地與山頂；舊島是 v6.15 新長出的陸地 */
const inWest = PLANNED ? (x, z) => x < -16 && (tileAt(x, z) === 2 || tileAt(x, z) === 5) : (x, z) => x < -21 && legacyTile(x, z) < 0;
/* ---------- 竹子：一叢 5–8 根有竹節的細竿，頂端幾簇竹葉 ---------- */
function bamboo(x, z, s) {
  const g = new THREE.Group(), y = groundAt(x, z); g.position.set(x, y, z);
  const stalk = M('#8fc65a', { roughness: 0.6 }, 'pine'), node = M('#6a9a3e', {}, 'pine'), leaf = M('#6fb24a', {}, 'pine');
  const n = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, r = rnd() * 0.32, h = (2.1 + rnd() * 1.4) * s, px = Math.cos(a) * r, pz = Math.sin(a) * r;
    const st = mesh(new THREE.CylinderGeometry(0.045 * s, 0.055 * s, h, 7), stalk, px, h / 2, pz); st.rotation.set((rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.12); g.add(st);
    for (let k = 1; k < h / 0.42; k++) g.add(mesh(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.035, 7), node, px + st.rotation.z * -k * 0.42 * 0.5, k * 0.42, pz + st.rotation.x * k * 0.42 * 0.5, { noCast: true }));
    for (let k = 0; k < 3; k++) { const lf = mesh(new THREE.SphereGeometry(0.28 * s, 7, 5), leaf, px + (rnd() - 0.5) * 0.4, h - 0.1 - k * 0.3, pz + (rnd() - 0.5) * 0.4); lf.scale.set(1.3, 0.35, 0.8); lf.rotation.y = rnd() * 6; g.add(lf); }
  }
  g.traverse(o => { o.frustumCulled = cullable(o); }); g.userData.prop = { id: 'prop_bamboo', h: 3.4 * s }; scene.add(g); colliders.push({ x, z, r: 0.45 * s });
}
/* ---------- 瀑布：三條有厚度的弧面水流；同一材質／網格合併相鄰格，消除格線 ---------- */
const fallU = { uTime: U.uTime, uCurve: U.uCurve, uBendF: U.uBendF, uNight: { value: 0 },
  uBody: { value: new THREE.Color('#C9E9E5') }, uFoam: { value: new THREE.Color('#F1F0F3') }, uShade: { value: new THREE.Color('#BDD2E4') } };
const fallMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.FrontSide, uniforms: fallU,
  vertexShader: `uniform float uCurve; uniform float uBendF; varying vec2 vUv; varying vec3 vW; varying vec3 vNormal;
    void main(){ vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; vNormal = mat3(modelMatrix) * normal;
      vec4 mv = modelViewMatrix * vec4(position, 1.0); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uTime; uniform float uNight; uniform vec3 uBody; uniform vec3 uFoam; uniform vec3 uShade;
    varying vec2 vUv; varying vec3 vW; varying vec3 vNormal;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main(){
      float y = vUv.y, x = vW.z * 2.6;
      float streak = n(vec2(x, y * 3.2 + uTime * 1.8)) * 0.65 + n(vec2(x * 2.1, y * 5.0 + uTime * 2.4)) * 0.35;
      float lip = smoothstep(0.83, 0.99, y), foot = 1.0 - smoothstep(0.02, 0.17, y);
      vec3 c = mix(uShade, uBody, 0.50 + streak * 0.42);
      c = mix(c, uFoam, smoothstep(0.57, 0.88, streak) * 0.35 + lip * 0.22 + foot * 0.27);
      c *= (0.90 + max(normalize(vNormal).y, 0.0) * 0.10) * mix(1.0, 0.40, uNight);
      float edge = 0.22 + 0.78 * smoothstep(0.0, 0.075, vUv.x) * (1.0 - smoothstep(0.925, 1.0, vUv.x));
      float fade = smoothstep(0.0, 0.05, y);
      float shell = mix(0.28, 1.0, smoothstep(-0.25, 0.25, vNormal.x));
      gl_FragColor = vec4(c, (0.48 + streak * 0.18) * edge * fade * shell);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const mistPts = [], MIST = 70;
let mist = null;
function buildFalls() {
  const segs = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) === 6 && T(x + 1, z) === 3) segs.push([x + 1 - C, z - C]);
  if (!segs.length) return;
  segs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const runs = [];
  segs.forEach(([x, z]) => { const last = runs[runs.length - 1]; if (last && last.x === x && last.z + last.width === z) last.width++; else runs.push({ x, z, width: 1 }); });
  // 起點略沉入高池、末端沉入下潭，讓水唇與水面相交而不懸空。
  const top = WATER_Y[6] - 0.01, bot = WATER_Y[3], positions = [], uvs = [], indices = [];
  const rows = 10, cols = 4;
  runs.forEach(({ x: X, z: Z, width }, run) => {
    for (let lane = 0; lane < 3; lane++) {
      const base = positions.length / 3, phase = run * 1.7 + lane * 2.1;
      const center = Z + width * [0.17, 0.51, 0.83][lane], half = width * [0.20, 0.205, 0.19][lane];
      for (let back = 0; back < 2; back++) for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
        const t = i / rows, u = j / cols, q = u * 2 - 1, wave = Math.sin(t * Math.PI);
        const lip = Math.sin(Math.min(t / 0.18, 1) * Math.PI * 0.5);
        const depth = lane * 0.045 * wave;
        const px = X - 0.10 + lip * 0.18 + wave * 0.055 + depth + (1 - q * q) * wave * 0.025 - back * (0.035 + wave * 0.04);
        const py = top - (top - bot + 0.05) * t + Math.sin(q * 2.2 + phase) * 0.008 * Math.pow(1 - t, 5);
        const pz = center + q * half * (0.95 + Math.sin(t * 4.5 + phase) * 0.045) + Math.sin(t * 4 + phase) * wave * 0.035;
        positions.push(px, py, pz); uvs.push(u, 1 - t);
      }
      const sheet = (rows + 1) * (cols + 1);
      for (let back = 0; back < 2; back++) for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const a = base + back * sheet + i * (cols + 1) + j, b = a + cols + 1;
        if (back) indices.push(a, a + 1, b + 1, a, b + 1, b);
        else indices.push(a, b, b + 1, a, b + 1, a + 1);
      }
      // 封閉兩側與頂／底：側視仍讀得到 3.5–7.5cm 厚度。
      for (let i = 0; i < rows; i++) for (const j of [0, cols]) {
        const a = base + i * (cols + 1) + j, b = a + cols + 1;
        if (j === 0) indices.push(a, a + sheet, b + sheet, a, b + sheet, b);
        else indices.push(a, b, b + sheet, a, b + sheet, a + sheet);
      }
      for (const i of [0, rows]) for (let j = 0; j < cols; j++) {
        const a = base + i * (cols + 1) + j;
        if (i === 0) indices.push(a, a + 1, a + 1 + sheet, a, a + 1 + sheet, a + sheet);
        else indices.push(a, a + sheet, a + 1 + sheet, a, a + 1 + sheet, a + 1);
      }
    }
  });
  // 上下列朝 -Y、橫列朝 +Z；反轉索引使封閉水帶的正面朝外。
  for (let i = 0; i < indices.length; i += 3) { const b = indices[i + 1]; indices[i + 1] = indices[i + 2]; indices[i + 2] = b; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere();
  const fall = new THREE.Mesh(g, fallMat); fall.name = 'highland-waterfall'; fall.renderOrder = 3; fall.frustumCulled = false;
  fall.userData.waterfall = { ribbons: runs.length * 3, runs: runs.length, triangles: indices.length / 3 }; scene.add(fall);
  segs.forEach(([X, Z]) => mistPts.push([X + 0.13, bot + 0.035, Z + 0.5]));
  // 小尺寸、低密度的細霧只停留在落水點附近，不再是升高的一排白球。
  const pos = new Float32Array(MIST * 3), seed = new Float32Array(MIST);
  for (let i = 0; i < MIST; i++) seed[i] = Math.random();
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.40)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  mist = new THREE.Points(geo, bend(new THREE.PointsMaterial({ map: tex, size: 0.26, transparent: true, opacity: 0.30, depthWrite: false, color: '#F1F0F3' })));
  mist.name = 'highland-waterfall-mist'; mist.userData = { pos, seed, geo }; mist.frustumCulled = false; mist.renderOrder = 4; scene.add(mist);
}
/* ---------- 山頂的祠堂（v6.79 新島）：白石圓頂小亭，四根柱子，中間供著一顆發光的藍水晶 ---------- */
function shrine(x, z) {
  const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
  const m = modelClone('LMMODELS', 'shrine');
  if (m) g.add(m); else {
    const stone = M('#efe7d6', {}, 'stone'), gold = M('#d8b45a', { metalness: 0.7, roughness: 0.35 });
    g.add(mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.3, 24), stone, 0, 0.15, 0), mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.18, 24), stone, 0, 0.39, 0));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.3, 10), stone, Math.cos(a) * 1.2, 1.63, Math.sin(a) * 1.2)); }
    g.add(mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.22, 24), stone, 0, 2.86, 0), mesh(new THREE.TorusGeometry(1.42, 0.05, 6, 36).rotateX(Math.PI / 2), gold, 0, 2.98, 0));
    g.add(mesh(new THREE.SphereGeometry(1.35, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#f4efe4', {}, 'stone'), 0, 2.97, 0), mesh(new THREE.ConeGeometry(0.12, 0.6, 8), gold, 0, 4.55, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.8, 12), stone, 0, 0.88, 0), mesh(new THREE.OctahedronGeometry(0.32), M('#9fd8ff', { emissive: '#7fc8ff', emissiveIntensity: 1.0 }), 0, 1.6, 0));
  }
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r: 0.55 });
  glow.emit({ x, y: groundAt(x, z) + 1.55, z, kind: 'crystal', power: 1.1 });   // 祠堂中央的藍水晶
  [0, 1, 2, 3, 4, 5].forEach(i => { const a = i / 6 * Math.PI * 2 + Math.PI / 6; colliders.push({ x: x + Math.cos(a) * 1.2, z: z + Math.sin(a) * 1.2, r: 0.2 }); });   // 柱子（柱子之間可以走進去）
}
/* ---------- 山頂的梯子：靠近按 E 爬上／爬下 ---------- */
let ladder = null, P = null;
function buildLadder() {
  // 在山頂南側找一個「山頂格子南邊是高地」的地方
  let best = null;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) === 5 && T(x, z + 1) === 2 && T(x - 1, z) === 5 && T(x + 1, z) === 5) { const wx = x - C + 0.5, wz = z - C + 1; if (!best || Math.abs(wx + 37) < Math.abs(best[0] + 37)) best = [wx, wz]; }
  if (!best) return;
  const [x, z] = best, g = new THREE.Group(); g.position.set(x, 3, z + 0.06);
  const wood = M('#9a6a3e', {}, 'stone');
  [-0.32, 0.32].forEach(dx => g.add(mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), wood, dx, 1.15, 0)));
  for (let k = 0; k < 6; k++) g.add(mesh(new THREE.BoxGeometry(0.64, 0.06, 0.07), wood, 0, 0.3 + k * 0.36, 0.02));
  g.rotation.x = -0.12; scene.add(g);
  ladder = { x, z, bottom: [x, z + 0.75], top: [x, z - 0.8] };
}
/* ---------- 佈置：松林、竹林、巨石、野花、灌木，山頂的長椅與石碑 ---------- */
export function build(player) {
  P = player;
  // 山頂：面向西邊大海的長椅、刻著高度的石碑
  let peak = null;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) === 5 && T(x - 1, z) !== 5 && T(x + 1, z) === 5) { const wx = x - C + 0.8, wz = z - C + 0.5; if (!peak || Math.abs(wz - 2) < Math.abs(peak[1] - 2)) peak = [wx, wz]; }
  if (peak && !blocked(peak[0], peak[1], 0.9)) bench(peak[0], peak[1], -Math.PI / 2);
  const view = peak ? [peak[0] + 2.5, peak[1]] : null;   // 長椅後方留空，坐著看海時鏡頭不會被樹擋住
  if (PLANNED && SITES.shrine) shrine(SITES.shrine.x, SITES.shrine.z);
  { const [x, z] = PLANNED && SITES.shrine ? [SITES.shrine.x + 3.4, SITES.shrine.z - 1.2] : [-37, 2]; if (tileAt(x, z) === 5 && !blocked(x, z, 0.6)) { const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
      g.add(mesh(new THREE.BoxGeometry(0.7, 1.1, 0.3), M('#b8b2a6', {}, 'stone'), 0, 0.55, 0));
      const sg = label('潮汐山 · 海拔 5', '#7a8a6a', 1.0, 0.26); sg.position.set(0, 0.8, 0.17); g.add(sg); scene.add(g); colliders.push({ x, z, r: 0.45 }); } }
  let pines = 0, bams = 0, rocks0 = 0;
  if (PLANNED) {   // 規劃的竹林：指定的幾叢＋竹林範圍裡再補一些
    PLAN.props.trees.filter(t => t[0] === 'bamboo').forEach(([, px, pz]) => { const [x, z] = warp(px, pz); if (!blocked(x, z, 0.8)) { bamboo(x, z, 0.9 + rnd() * 0.3); bams++; } });
    PLAN.props.forests.filter(f => f.kind === 'bamboo').forEach(f => { const xs = f.poly.map(p => p[0]), zs = f.poly.map(p => p[1]); for (let k = 0; k < 60 && bams < 16; k++) { const [x, z] = warp(Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs)), Math.min(...zs) + rnd() * (Math.max(...zs) - Math.min(...zs))); if (!blocked(x, z, 1.0) && (tileAt(x, z) === 2 || tileAt(x, z) === 5)) { bamboo(x, z, 0.9 + rnd() * 0.3); bams++; } } });
  }
  for (let k = 0; k < 2600; k++) {
    const x = -48 + rnd() * 30, z = -40 + rnd() * 80, t = tileAt(x, z);
    if (!inWest(x, z) || t < 0 || t === 3 || t === 6 || t === 7 || blocked(x, z, 1.3)) continue;
    if (view && Math.hypot(x - view[0], z - view[1]) < 5) continue;
    if (ramp2X && Math.abs(x - (ramp2X - C + 1)) < 2.5 && Math.abs(z - 10.5) < 2.5) continue;   // 坡道口
    const nearPond = !PLANNED && Math.hypot(x + 30.8, z + 8) < 6;
    if ((t === 2 || t === 5) && nearPond && bams < 12 && rnd() < 0.35) { bamboo(x, z, 0.9 + rnd() * 0.3); bams++; }
    else if ((t === 2 || t === 5) && pines < (PLANNED ? 55 : 95) && rnd() < 0.2) { tree(x, z, 0.85 + rnd() * 0.45, 'cedar'); pines++; }
    else if (t === 1 && rnd() < 0.05) tree(x, z, 0.9 + rnd() * 0.3, rnd() < 0.2 ? 'pink' : 'round');
    else if (t === 0 && rnd() < 0.03) tree(x, z, 1, 'palm');
    else if ((t === 2 || t === 1) && rocks0 < 18 && rnd() < 0.03) { rock(x, z, 1.1 + rnd() * 1.1); rocks0++; }
    else if ((t === 1 || t === 2) && rnd() < 0.03) bush(x, z);
  }
  // 野花草原：山頂與高地上的大片小花
  const pal = ['#ffffff', '#ffd23f', '#b38bff', '#ff8fb1', '#7ec8ff'];
  for (let k = 0; k < 900; k++) {
    const x = -48 + rnd() * 30, z = -40 + rnd() * 80, t = tileAt(x, z);
    if (!inWest(x, z) || (t !== 1 && t !== 2 && t !== 5) || blocked(x, z, 0.5)) continue;
    const c = pal[Math.floor(rnd() * pal.length)];
    for (let j = 0; j < 5; j++) { const fx = x + (rnd() - 0.5) * 1.4, fz = z + (rnd() - 0.5) * 1.4; if (tileAt(fx, fz) === t) wildFlowers(fx, fz, c); }
  }
  // 坡道口的指示牌（新島：西部高地階梯的底端）
  const hs = PLANNED && STAIRS.find(s => /West Highland/.test(s.name)), sp = hs ? warp(hs.a[0] + 1.8, hs.a[1] + 0.6) : ramp2X ? [ramp2X - C + 2.6, 9.2] : null;
  if (sp) { const [x, z] = sp; if (!blocked(x, z, 0.5)) { const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), M('#8a5a3b'), 0, 0.6, 0)); const sg = label(PLANNED ? '西部高地 ↑' : '西部高地 →', '#5aa846', 1.0, 0.26); sg.position.set(0, 1.15, 0.05); sg.rotation.y = PLANNED ? 0 : -Math.PI / 2; g.add(sg); scene.add(g); colliders.push({ x, z, r: 0.25 }); } }
  buildFalls(); if (!PLANNED) buildLadder();   // 新島有通往山頂的祠堂階梯，不用梯子
}
const near = (p, r) => P && Math.hypot(P.position.x - p[0], P.position.z - p[1]) < r;
export function hint() { if (!ladder || !P) return ''; if (near(ladder.bottom, 1.0) && P.position.y < 4) return '爬上山頂'; if (near(ladder.top, 1.0) && P.position.y > 4.5) return '爬下梯子'; return ''; }
export function handler() {
  const h = hint(); if (!h) return null;
  return async () => {
    const up = h === '爬上山頂', to = up ? ladder.top : ladder.bottom;
    Audio.sfx('swish'); P.rotation.y = up ? Math.PI : 0;
    const from = P.position.clone(), y1 = groundAt(to[0], to[1]), t0 = performance.now();
    await new Promise(res => { const step = () => { const k = Math.min(1, (performance.now() - t0) / 700); P.position.set(from.x + (to[0] - from.x) * k, from.y + (y1 - from.y) * k + Math.sin(k * Math.PI) * 0.4, from.z + (to[1] - from.z) * k); if (k < 1) setTimeout(step, 16); else res(); }; step(); });
    if (up) ui.toast('山頂到了！往西邊看，夕陽會落進海裡');
  };
}
export function update(dt, t, night) {
  fallU.uNight.value = night;
  if (!mist) return;
  const { pos, seed, geo } = mist.userData;
  for (let i = 0; i < MIST; i++) {
    const s = seed[i], o = mistPts[i % mistPts.length], k = (t * 0.25 + s) % 1;
    pos[i * 3] = o[0] + 0.04 + k * 0.27 * (0.5 + s); pos[i * 3 + 1] = o[1] + Math.sin(k * Math.PI * 0.5) * 0.38; pos[i * 3 + 2] = o[2] + (s - 0.5) * 0.75 + Math.sin(t + s * 9) * 0.06;
  }
  geo.attributes.position.needsUpdate = true; mist.material.opacity = 0.30 * (1 - night * 0.5);
}
