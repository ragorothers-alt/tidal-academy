/* 潮汐小島 · 小群的浮塵與螢火蟲：奶油金、少量粉紫、夜裡的鼠尾草綠；九成貼地或停在低樹冠旁。 */
import * as THREE from 'three';
import { scene, bend, camera, skyU } from './engine.js';
import { groundAt } from './terrain.js';

const N = 220, GROUP = 6, LOW = 198, BOX = { x: 16, y: 5, z: 12 };
const tex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.85)'); g.addColorStop(0.72, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const pos = new Float32Array(N * 3), seed = new Float32Array(N), tint = new Float32Array(N);
// 沿用原本每顆五次亂數的初始化次數，避免影響共用場景後續的隨機配置。
for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * BOX.x; pos[i * 3 + 1] = Math.random() * BOX.y; pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z; seed[i] = Math.random() * 100; }
for (let i = 0; i < N; i++) tint[i] = Math.random() < 0.09 ? 1 : 0;
const anchors = new Float32Array(LOW / GROUP * 2), gy = new Float32Array(N).fill(-99);
for (let i = 0; i < LOW / GROUP; i++) { anchors[i * 2] = pos[i * GROUP * 3]; anchors[i * 2 + 1] = pos[i * GROUP * 3 + 2]; }
const cols = new Float32Array(N * 3);
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
// 固定小像素足跡：近處不變成大光球，遠處仍是柔光點；一個 Points／一個材質。
const mat = bend(new THREE.PointsMaterial({ map: tex, size: 4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffffff', vertexColors: true, fog: false }));
const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
const wrap = (v, L) => ((((v + L / 2) % L) + L) % L) - L / 2;
const DAY = new THREE.Color('#f6d8a8'), MAGIC = new THREE.Color('#d4c3ec'), FLY = new THREE.Color('#d5e4bc'), c1 = new THREE.Color();
let frame = 0;
/** center：鏡頭看向的點；golden 0–1；night 0–1；clear 晴朗度 */
export function update(dt, t, center, golden, night, clear) {
  const fly = THREE.MathUtils.smoothstep(night, 0.5, 0.9), cp = camera.position, sd = skyU.sunDir.value; frame++;
  for (let g = 0; g < LOW / GROUP; g++) {
    const k = g * 2, s = seed[g * GROUP];
    anchors[k] = center.x + wrap(anchors[k] + (Math.sin(t * 0.22 + s) * 0.04 + 0.025) * dt - center.x, BOX.x);
    anchors[k + 1] = center.z + wrap(anchors[k + 1] + Math.cos(t * 0.19 + s) * 0.04 * dt - center.z, BOX.z);
  }
  for (let i = 0; i < N; i++) {
    const k = i * 3, s = seed[i], low = i < LOW;
    const prevX = pos[k], prevZ = pos[k + 2];
    let wrapped = false;
    if (low) {
      const g = Math.floor(i / GROUP) * 2, angle = (i % GROUP) * Math.PI / 3 + s;
      pos[k] = anchors[g] + Math.cos(angle + t * 0.12) * (0.22 + (s % 0.32));
      pos[k + 2] = anchors[g + 1] + Math.sin(angle + t * 0.1) * (0.22 + (s % 0.32));
    } else {
      const x = pos[k] + 0.045 * dt, z = pos[k + 2] + Math.cos(t * 0.2 + s) * 0.04 * dt;
      pos[k] = center.x + wrap(x - center.x, BOX.x); pos[k + 2] = center.z + wrap(z - center.z, BOX.z);
      wrapped = Math.abs(pos[k] - x) > 1 || Math.abs(pos[k + 2] - z) > 1;
    }
    wrapped = wrapped || Math.abs(pos[k] - prevX) > 1 || Math.abs(pos[k + 2] - prevZ) > 1;
    if (wrapped || gy[i] < -90 || i % 8 === frame % 8) gy[i] = groundAt(pos[k], pos[k + 2]);
    const height = low ? 0.32 + (s % 1) * (1.7 - fly * 0.85) + Math.sin(t * 0.6 + s) * 0.1 : 2.4 + (s % 2.2);
    pos[k + 1] = gy[i] + height;
    const dx = pos[k] - cp.x, dy = pos[k + 1] - cp.y, dz = pos[k + 2] - cp.z, distance = Math.hypot(dx, dy, dz);
    const fade = THREE.MathUtils.smoothstep(distance, 0.65, 1.4) * (1 - THREE.MathUtils.smoothstep(distance, 8, 12));
    const bl = Math.max(0, (dx * sd.x + dy * sd.y + dz * sd.z) / (distance + 1e-4));
    const lit = (low && i % 5 < 2 ? 0.06 : 0) + Math.pow(bl, 4) * 1.2;
    const g = Math.floor(i / GROUP) * 2;
    const patch = low ? THREE.MathUtils.smoothstep(Math.sin(anchors[g] * 0.55 + 1.3) * Math.sin(anchors[g + 1] * 0.48 - 0.7), 0.05, 0.4) : 0;
    // 每顆的慢明滅相位獨立；高處一成只有微弱逆光浮塵，夜裡不變成星幕。
    const tw = 0.16 + 0.84 * Math.pow(0.5 + 0.5 * Math.sin(t * (0.65 + (s % 0.6)) + s * 3.1), 2);
    c1.copy(tint[i] ? MAGIC : DAY).lerp(tint[i] ? MAGIC : FLY, fly).multiplyScalar(tw * fade * ((1 - fly) * lit * (low ? 1 : 0.08) + fly * patch));
    cols[k] = c1.r; cols[k + 1] = c1.g; cols[k + 2] = c1.b;
  }
  geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  const day = (0.42 + golden * 0.3) * (1 - night) * clear, flies = fly * clear * 0.55;
  mat.opacity = Math.max(day, flies); mat.size = 3.5 + Math.max(fly, golden) * 0.5;
  pts.visible = mat.opacity > 0.02;
}
export const setVisible = v => { pts.visible = v; };
