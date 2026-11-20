/* 潮汐小島 · 空中的小動靜（v9.24.6）：白天順風飄過的種子絨毛（春夏多、秋天少、冬天沒有），晴朗的夜裡偶爾劃過的流星（流星雨期間多）。
   純氛圍：不能互動。種子是一個 Points（跟著鏡頭的方盒繞回），流星是一條貼在天上的細長光帶。 */
import * as THREE from 'three';
import { scene, bend, camera, U, skyU } from './engine.js';
import { groundAt } from './terrain.js';
import * as seasons from './seasons.js';
import { I } from './state.js';
import { activeShower } from './astro.js';

/* ---------- 種子絨毛 ---------- */
const N = 30, BOX = { x: 30, y: 7, z: 24 };
const fluff = (() => {   // 一顆蒲公英種子：中心一點、往外張開的細絨
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); c.translate(32, 32);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.16, 'rgba(255,255,255,0.6)'); g.addColorStop(0.42, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-32, -32, 64, 64);
  c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + (i % 2) * 0.1, L = 20 + (i % 3) * 4; c.beginPath(); c.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(0, 0, 3.2, 0, 7); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const pos = new Float32Array(N * 3), seed = new Float32Array(N);
for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * BOX.x; pos[i * 3 + 1] = 0.5 + Math.random() * BOX.y; pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z; seed[i] = Math.random() * 100; }
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const mat = bend(new THREE.PointsMaterial({ map: fluff, size: 0.17, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, color: '#fffaf0', fog: true }));
{ const compile = mat.onBeforeCompile; mat.onBeforeCompile = (sh, rd) => { compile(sh, rd); sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', '#include <fog_vertex>\n  gl_PointSize = clamp(gl_PointSize, 3.0, 22.0);'); }; }
const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; pts.visible = false; scene.add(pts);
const wrap = (v, L) => ((((v + L / 2) % L) + L) % L) - L / 2;
let amount = 0;

/* ---------- 流星 ---------- */
const R = 260, starGeo = new THREE.PlaneGeometry(1, 1), starMat = new THREE.ShaderMaterial({
  transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, uniforms: { uK: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform float uK; varying vec2 vUv; void main(){ float head = smoothstep(0.0, 1.0, vUv.x), w = 1.0 - abs(vUv.y - 0.5) * 2.0; float a = pow(head, 2.2) * pow(max(w, 0.0), 2.0) * uK; gl_FragColor = vec4(vec3(0.82, 0.9, 1.0) * a * 1.6 + vec3(1.0) * pow(head, 12.0) * pow(max(w, 0.0), 6.0) * uK, a); }'
}), star = new THREE.Mesh(starGeo, starMat);
star.frustumCulled = false; star.renderOrder = -3; star.visible = false; star.raycast = () => {}; scene.add(star);
let nextAt = 8 + Math.random() * 20, fly = null, showerOn = false, showerCheck = 0;
const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vP = new THREE.Vector3(), vD = new THREE.Vector3(), vUp = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), M4 = new THREE.Matrix4();
const dirOf = (az, el, v) => v.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
export const debug = { force: false };   // 測試用：下一格立刻放一顆流星

/** 每格更新。look：鏡頭看向的點；night 0–1；clear 晴朗度 0–1；show：在主島戶外；date：遊戲裡的日期 */
export function update(dt, t, look, night, clear, show, date) {
  // 種子：白天、晴天、不是冬天
  const s = seasons.current(), want = show ? (s === 'spring' ? 1 : s === 'summer' ? 0.75 : s === 'autumn' ? 0.35 : 0) * (1 - THREE.MathUtils.smoothstep(night, 0.15, 0.5)) * THREE.MathUtils.smoothstep(clear, 0.5, 0.95) : 0;
  amount += (want - amount) * Math.min(1, dt * 0.6);
  pts.visible = amount > 0.02;
  if (pts.visible) {
    const wd = U.uWindDir.value, wk = U.uWind.value, n = Math.max(1, Math.round(N * amount));
    for (let i = 0; i < n; i++) {
      const k = i * 3, sd = seed[i], sp = (0.45 + (sd % 0.6)) * wk;
      const x = pos[k] + (wd.x * sp + Math.sin(t * 0.5 + sd) * 0.25) * dt, z = pos[k + 2] + (wd.y * sp + Math.cos(t * 0.43 + sd * 1.7) * 0.25) * dt;
      pos[k] = look.x + wrap(x - look.x, BOX.x); pos[k + 2] = look.z + wrap(z - look.z, BOX.z);
      const moved = Math.abs(pos[k] - x) > 1 || Math.abs(pos[k + 2] - z) > 1;
      let y = pos[k + 1] + (Math.sin(t * 0.7 + sd * 2.3) * 0.22 + Math.sin(t * 0.23 + sd) * 0.12 - 0.02) * dt;
      if (moved || i % 10 === Math.floor(t * 10) % 10) { const gy = groundAt(pos[k], pos[k + 2]); if (moved) y = gy + 0.6 + (sd % 1) * 4.2; y = Math.max(gy + 0.35, Math.min(gy + BOX.y, y)); }
      pos[k + 1] = y;
    }
    geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.85 * Math.min(1, amount * 1.6); mat.color.copy(skyU.sunCol.value).lerp(WHITE, 0.6);
  }
  // 流星：夜裡、晴天
  const dark = show ? THREE.MathUtils.smoothstep(night, 0.75, 0.95) * THREE.MathUtils.smoothstep(clear, 0.6, 0.95) : 0;
  showerCheck -= dt; if (showerCheck < 0) { showerCheck = 30; showerOn = !!activeShower((I && I.METEOR_SHOWERS) || [], date || new Date()); }
  if (!fly) {
    nextAt -= dt * (dark > 0.5 ? 1 : 0);
    if ((nextAt < 0 || debug.force) && dark > 0.5) {
      debug.force = false; nextAt = showerOn ? 3 + Math.random() * 6 : 16 + Math.random() * 34;
      // 起點：鏡頭前方左右各 70 度內、仰角 28–62 度；往斜下方劃 9–20 度
      camera.getWorldDirection(vD); const az0 = Math.atan2(vD.x, -vD.z) + (Math.random() - 0.5) * 2.4, el0 = 0.5 + Math.random() * 0.58, len = 0.16 + Math.random() * 0.2, slant = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.9);
      fly = { a: dirOf(az0, el0, new THREE.Vector3()), b: dirOf(az0 + Math.cos(slant) * len * Math.sign(slant), el0 - Math.abs(Math.sin(slant)) * len, new THREE.Vector3()), t: 0, T: 0.45 + Math.random() * 0.5, w: 0.5 + Math.random() * 0.5 };
    }
  }
  if (fly) {
    fly.t += dt; const u = fly.t / fly.T;
    if (u >= 1.25 || dark < 0.2) { fly = null; star.visible = false; }
    else {
      const head = Math.min(1, u), tail = Math.max(0, u - 0.42);   // 頭往前跑、尾巴跟上來
      vA.copy(fly.a).lerp(fly.b, tail).normalize(); vB.copy(fly.a).lerp(fly.b, head).normalize();
      vP.copy(vA).add(vB).multiplyScalar(0.5 * R).add(camera.position); X.copy(vB).sub(vA); const L = Math.max(0.5, X.length() * R); X.normalize();
      vUp.copy(vP).sub(camera.position).normalize(); Y.crossVectors(vUp, X).normalize(); Z.crossVectors(X, Y);
      star.matrixAutoUpdate = false; star.matrix.copy(M4.makeBasis(X, Y, Z)).scale(vD.set(L, 1.5 * fly.w, 1)).setPosition(vP); star.matrixWorldNeedsUpdate = true;
      starMat.uniforms.uK.value = dark * Math.min(1, u * 6) * (1 - THREE.MathUtils.smoothstep(u, 0.85, 1.25)); star.visible = true;
    }
  }
}
const WHITE = new THREE.Color('#ffffff');
export const setVisible = v => { if (!v) { pts.visible = false; star.visible = false; } };
