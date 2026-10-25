/* 潮汐小島 · 空氣中的光點：白天是一閃一閃的金色與淡青色光粒（日系奇幻的魔法感），黃金時段在逆光裡更亮；夜晚換成慢慢飄的螢火蟲。跟著鏡頭附近重複循環。 */
import * as THREE from 'three';
import { scene, bend, camera, skyU } from './engine.js';

const N = 220, BOX = { x: 16, y: 5, z: 12 };
const tex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const pos = new Float32Array(N * 3), seed = new Float32Array(N);
for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * BOX.x; pos[i * 3 + 1] = Math.random() * BOX.y; pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z; seed[i] = Math.random() * 100; }
const cols = new Float32Array(N * 3), tint = new Float32Array(N);   // 每顆光點的亮度（閃爍）與色相（金或淡青）
for (let i = 0; i < N; i++) tint[i] = Math.random() < 0.3 ? 1 : 0;
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
const mat = bend(new THREE.PointsMaterial({ map: tex, size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffffff', vertexColors: true, fog: false }));
const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
const wrap = (v, L) => ((((v + L / 2) % L) + L) % L) - L / 2;
const col = new THREE.Color(), DAY = new THREE.Color('#ffe2a0'), MAGIC = new THREE.Color('#bff4ff'), FLY = new THREE.Color('#d8ff8a'), c1 = new THREE.Color();
/** center：鏡頭看向的點；golden 0–1；night 0–1；clear 晴朗度 */
export function update(dt, t, center, golden, night, clear) {
  const a = pos, fly = THREE.MathUtils.smoothstep(night, 0.5, 0.9);
  for (let i = 0; i < N; i++) {
    const k = i * 3, s = seed[i];
    a[k] += (Math.sin(t * 0.3 + s) * 0.12 + 0.05) * dt; a[k + 1] += (Math.sin(t * 0.5 + s * 1.7) * 0.08 + (fly ? 0.02 : 0.03)) * dt; a[k + 2] += Math.cos(t * 0.27 + s) * 0.1 * dt;
    // 在鏡頭周圍的方盒裡循環
    a[k] = center.x + wrap(a[k] - center.x, BOX.x); a[k + 2] = center.z + wrap(a[k + 2] - center.z, BOX.z);
    a[k + 1] = center.y - 0.5 + (((a[k + 1] - center.y + 0.5) % BOX.y) + BOX.y) % BOX.y;
  }
  geo.attributes.position.needsUpdate = true;
  // 閃爍：每顆光點各自忽明忽暗，偶爾亮成一個星點。白天只有逆光（朝著太陽看）的光點亮——像陽光裡的浮塵；
  // 順光與側光的大多看不見，不會在藍天上變成一顆顆白天的星星（v7.0）。夜裡的螢火蟲不管方向
  const cp = camera.position, sd = skyU.sunDir.value, dayK = 1 - fly;
  for (let i = 0; i < N; i++) {
    const s = seed[i], tw = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * (1.3 + (s % 1.7)) + s * 3.1), 3);
    const dx = a[i * 3] - cp.x, dy = a[i * 3 + 1] - cp.y, dz = a[i * 3 + 2] - cp.z, bl = Math.max(0, (dx * sd.x + dy * sd.y + dz * sd.z) / (Math.hypot(dx, dy, dz) + 1e-4));
    const lit = (i % 5 < 2 ? 0.12 : 0) + Math.pow(bl, 4) * 1.6;   // 五顆裡兩顆在順光下還看得到一點點
    c1.copy(tint[i] ? MAGIC : DAY).lerp(FLY, fly).multiplyScalar(tw * (dayK * lit + fly));
    cols[i * 3] = c1.r; cols[i * 3 + 1] = c1.g; cols[i * 3 + 2] = c1.b;
  }
  geo.attributes.color.needsUpdate = true;
  const day = (0.5 + golden * 0.5) * (1 - night) * clear, flies = fly * clear * (0.55 + Math.sin(t * 2.1) * 0.1);
  mat.opacity = Math.max(day, flies);
  mat.size = flies > day ? 0.12 : 0.11 + golden * 0.07;
  pts.visible = mat.opacity > 0.02;
}
export const setVisible = v => { pts.visible = v; };
