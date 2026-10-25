/* 潮汐小島 · 西部高地（v6.15）：島的西邊新長出的一大片地區。
   東緣是一道懸崖，坡道在 z ≈ 10；高地上是松林與竹林、巨石與野花；山頂（高 5）可以三段跳或爬梯子上去，有一張看夕陽海景的長椅；
   高地池塘從懸崖落下一道瀑布，注入下方的水潭。 */
import * as THREE from 'three';
import { scene, M, mesh, U, bend } from './engine.js';
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
  g.traverse(o => { o.frustumCulled = false; }); g.userData.prop = { id: 'prop_bamboo', h: 3.4 * s }; scene.add(g); colliders.push({ x, z, r: 0.45 * s });
}
/* ---------- 瀑布：高地池塘東緣落到下方水潭，水流條紋往下流、底部白色水花與水霧 ---------- */
const fallU = { uTime: U.uTime, uCurve: U.uCurve, uBendF: U.uBendF, uNight: { value: 0 } };
const fallMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: fallU,
  vertexShader: `uniform float uCurve; uniform float uBendF; varying vec2 vUv; varying vec3 vW;
    void main(){ vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mv = modelViewMatrix * vec4(position, 1.0); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uTime; uniform float uNight; varying vec2 vUv; varying vec3 vW;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main(){
      float x = vW.z * 3.0 + vW.x * 3.0, y = vUv.y;
      float streak = n(vec2(x * 2.5, y * 3.0 + uTime * 2.2)) * 0.6 + n(vec2(x * 6.0, y * 7.0 + uTime * 3.4)) * 0.4;
      vec3 deep = vec3(0.32, 0.72, 0.86), white = vec3(0.96, 0.99, 1.0);
      vec3 c = mix(deep, white, smoothstep(0.45, 0.85, streak));
      c = mix(c, white, smoothstep(0.82, 1.0, y) * 0.7 + smoothstep(0.18, 0.0, y) * 0.8);   // 上緣的水唇、底部的白色水花
      float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
      gl_FragColor = vec4(c * mix(1.0, 0.45, uNight), (0.72 + streak * 0.25) * edge);
    }`
});
const mistPts = [], MIST = 70;
let mist = null;
function buildFalls() {
  const segs = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) === 6 && T(x + 1, z) === 3) segs.push([x + 1 - C, z - C]);
  if (!segs.length) return;
  segs.sort((a, b) => a[1] - b[1]);
  const top = WATER_Y[6] + 0.04, bot = WATER_Y[3];
  segs.forEach(([X, Z]) => {
    // 一格一片，上緣往外凸一點（水從池塘邊緣湧出來）
    const g = new THREE.PlaneGeometry(1.02, top - bot, 1, 8); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (p.getY(i) + (top - bot) / 2) / (top - bot); p.setZ(i, Math.sin(k * Math.PI * 0.5) * 0.22 * k); }
    g.rotateY(Math.PI / 2); const m = new THREE.Mesh(g, fallMat); m.position.set(X + 0.08, (top + bot) / 2, Z + 0.5); m.renderOrder = 3; m.frustumCulled = false; scene.add(m);
    mistPts.push([X + 0.4, bot + 0.05, Z + 0.5]);
  });
  // 水霧：瀑布底部慢慢升起、散開的白點
  const pos = new Float32Array(MIST * 3), seed = new Float32Array(MIST);
  for (let i = 0; i < MIST; i++) seed[i] = Math.random();
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c = cv.getContext('2d'); const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv); })();
  mist = new THREE.Points(geo, bend(new THREE.PointsMaterial({ map: tex, size: 0.55, transparent: true, opacity: 0.55, depthWrite: false, color: '#ffffff' })));
  mist.userData = { pos, seed, geo }; mist.frustumCulled = false; mist.renderOrder = 4; scene.add(mist);
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
    pos[i * 3] = o[0] + 0.2 + k * 0.9 * (0.5 + s); pos[i * 3 + 1] = o[1] + k * 1.2; pos[i * 3 + 2] = o[2] + (s - 0.5) * 1.6 + Math.sin(t + s * 9) * 0.1;
  }
  geo.attributes.position.needsUpdate = true; mist.material.opacity = 0.45 * (1 - night * 0.5);
}
