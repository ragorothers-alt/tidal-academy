/* 潮汐小島 · 港口的夜晚（v8.9.1）：碼頭兩側四根燈柱、靠在碼頭邊的漁船與小划船（跟著潮水上下、輕輕搖）、港口外一紅一綠的浮標（夜裡一閃一閃），
   碼頭的燈在海面上拉出一條條晃動的倒影，燈塔的光束夜裡慢慢掃過海面。
   模型在 data/harbormodels.js（Codex 製作）；燈柱的光交給 glow.js 的燈光格子，船上的窗與燈籠由 props3d.register 自動登記。 */
import * as THREE from 'three';
import { scene, camera, M, U, lampK } from './engine.js';
import { seaMesh, groundAt } from './terrain.js';
import { PIER, SITES, colliders, modelClone } from './props.js';
import { register } from './props3d.js';
import * as glow from './glow.js';

const DECK = 0.47;   // 碼頭甲板的走路高度（main.js 的 ground）
const boats = [], buoys = [], streaks = [];
let beam = null;
const tmp = new THREE.Vector3();

/* ---------- 海面上的燈影：從燈的正下方往鏡頭拉長的一條碎光，隨波左右晃 ---------- */
const STREAK_V = `uniform float uCurve; uniform float uBendF; varying vec2 vUv;
  void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; gl_Position = projectionMatrix * mv; }`;
const STREAK_F = `uniform float uTime; uniform float uK; uniform vec3 uCol; uniform float uSeed; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main(){
    float along = vUv.y, x = vUv.x - 0.5;
    float wob = (vn(vec2(along * 7.0 - uTime * 0.7 + uSeed, uTime * 0.5)) - 0.5) * 0.55 * along;   // 越遠晃得越大
    float w = 1.0 - smoothstep(0.12, 0.5, abs(x + wob));
    float bands = smoothstep(0.3, 0.72, vn(vec2(vUv.x * 5.0 + uSeed, along * 24.0 - uTime * 1.5)));   // 一段一段的碎光
    float k = w * bands * (1.0 - smoothstep(0.15, 1.0, along)) * smoothstep(0.0, 0.06, along) * uK;
    gl_FragColor = vec4(uCol * k * 1.7, k);
  }`;
const STREAK_GEO = new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2).translate(0, 0, 0.5);   // uv.y：0 在燈下，1 往鏡頭那頭
function streak(x, z, color, seed) {
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: U.uTime, uCurve: U.uCurve, uBendF: U.uBendF, uK: { value: 0 }, uCol: { value: new THREE.Color(color) }, uSeed: { value: seed } }, vertexShader: STREAK_V, fragmentShader: STREAK_F });
  const m = new THREE.Mesh(STREAK_GEO, mat); m.renderOrder = 4; m.frustumCulled = false; m.visible = false; scene.add(m);
  streaks.push({ m, x, z });
}

/* ---------- 燈塔的光束：兩道相反方向、慢慢轉的光錐，越遠越淡 ---------- */
const BEAM_V = `uniform float uCurve; uniform float uBendF; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
  void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; gl_Position = projectionMatrix * mv; }`;
const BEAM_F = `uniform float uK; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
  void main(){ float al = 1.0 - vUv.y, a = (1.0 - smoothstep(0.0, 1.0, al)) * smoothstep(0.0, 0.03, al);   // 圓錐的 uv.y：1 在燈室（窄端）
    float e = pow(abs(dot(normalize(vN), normalize(-vP))), 1.5);   // 正對著看穿光錐的地方亮、斜擦過的邊緣淡（像一束有體積的光）
    float k = a * e * uK; gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * k, k); }`;
function lighthouseBeam() {
  const lh = SITES.lighthouse; if (!lh) return;
  const g = new THREE.CylinderGeometry(0.18, 2.4, 24, 16, 1, true).rotateZ(Math.PI / 2).translate(12, 0, 0);   // 從燈室（窄端）往 +x 伸出去 24 公尺
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uCurve: U.uCurve, uBendF: U.uBendF, uK: { value: 0 } }, vertexShader: BEAM_V, fragmentShader: BEAM_F });
  beam = new THREE.Group(); beam.position.set(lh.x, groundAt(lh.x, lh.z) + 5.4, lh.z);
  [0, Math.PI].forEach(r => { const m = new THREE.Mesh(g, mat); m.rotation.y = r; m.frustumCulled = false; m.renderOrder = 5; beam.add(m); });
  beam.userData.mat = mat; beam.visible = false; scene.add(beam);
}

export function init() {
  const { x: px, z: pz, len, hw } = PIER;
  // 燈柱：甲板兩側各兩根，燈頭的手臂伸向甲板中間
  [pz + len * 0.24, pz + len * 0.66].forEach(z => [-1, 1].forEach(sd => {
    const m = modelClone('HARBORMODELS', 'pier_lamp'); if (!m) return;
    const x = px + sd * (hw - 0.14); m.position.set(x, DECK, z); m.rotation.y = sd < 0 ? 0 : Math.PI; scene.add(m); m.updateMatrixWorld(true);
    colliders.push({ x, z, r: 0.14 });
    const l = m.getObjectByName('light'); if (l) { l.getWorldPosition(tmp); glow.emit({ x: tmp.x, y: tmp.y, z: tmp.z, kind: 'lamp', power: 0.8 }); streak(tmp.x, tmp.z, '#ffc77e', z + sd); }
  }));
  // 碼頭盡頭原有的兩盞燈籠也映在海面上
  glow.around(px, pz + len, 3).filter(e => e.kind === 'lantern').forEach((e, i) => streak(e.x, e.z, '#ffc27a', 7 + i));
  // 船：漁船靠在東側（左舷的碰墊貼著碼頭）、小划船靠在西側；槳收進船裡
  const boat = (key, x, z, ry, cr) => {
    const m = modelClone('HARBORMODELS', key); if (!m) return null;
    const g = new THREE.Group(); g.position.set(x, seaMesh.position.y, z); g.rotation.y = ry; g.add(m); scene.add(g); register(g);
    const col = { x, z, r: cr }; colliders.push(col); boats.push({ g, m, key, col, home: [x, z, ry], ph: Math.random() * 6.28, y0: 0 });
    return m;
  };
  const fb = boat('fishing_boat', px + hw + 0.98, pz + len * 0.5, 0, 1.1);
  if (fb) { const l = fb.getObjectByName('light'); if (l) { l.getWorldPosition(tmp); streak(tmp.x, tmp.z, '#ffbf73', 11); } }
  const rb = boat('rowboat', px - hw - 0.72, pz + len * 0.3, 0.06, 0.8);
  if (rb) { const L = rb.getObjectByName('oarL'), R = rb.getObjectByName('oarR'); if (L) L.rotation.y += Math.PI / 2; if (R) R.rotation.y -= Math.PI / 2; }   // 靠岸時槳收在船上
  // 浮標：港口外一紅一綠，夜裡錯開閃
  [[-1, '#ff6a5a', '#ff2a1c'], [1, '#8dffae', '#1cff62']].forEach(([sd, c, e], i) => {
    const m = modelClone('HARBORMODELS', 'buoy'); if (!m) return;
    const lit = M(c, { emissive: new THREE.Color(e), emissiveIntensity: 0, roughness: 0.3 }, 'glass');
    m.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.kind === 'glass') o.material = lit; });
    const g = new THREE.Group(); g.position.set(px + sd * 4.6, seaMesh.position.y, pz + len + 5.2); g.add(m); scene.add(g);
    buoys.push({ g, lit, ph: i * 1.5, sway: Math.random() * 6.28 });
  });
  lighthouseBeam();
}

/** v9.1 碼頭西側的小划船（boat.js 坐上去划船時接手：ride 期間這裡不再讓它搖） */
export const rowboat = () => boats.find(b => b.key === 'rowboat') || null;
export function update(dt, t) {
  const sea = seaMesh.position.y, k = lampK.value;
  boats.forEach(b => { if (b.ride) return; b.g.position.y = sea + Math.sin(t * 1.1 + b.ph) * 0.025; b.g.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.03; b.g.rotation.x = Math.sin(t * 0.7 + b.ph * 1.3) * 0.015; });
  buoys.forEach(b => {
    b.g.position.y = sea + Math.sin(t * 1.4 + b.sway) * 0.05; b.g.rotation.x = Math.sin(t * 1.1 + b.sway) * 0.08; b.g.rotation.z = Math.cos(t * 0.9 + b.sway) * 0.08;
    const p = ((t + b.ph) % 3) / 3; b.lit.emissiveIntensity = k * (p < 0.12 ? 2.6 : 0.08);   // 每 3 秒亮一下
  });
  const cx = camera.position.x, cz = camera.position.z;
  streaks.forEach(s => {
    s.m.visible = k > 0.02; if (!s.m.visible) return;
    const dx = cx - s.x, dz = cz - s.z, d = Math.hypot(dx, dz);
    s.m.position.set(s.x, sea + 0.035, s.z); s.m.rotation.y = Math.atan2(dx, dz); s.m.scale.set(0.6, 1, Math.min(5.5, 1.5 + d * 0.3));
    s.m.material.uniforms.uK.value = k * (d > 70 ? 0 : 1);
  });
  if (beam) { beam.visible = k > 0.05; beam.rotation.y += dt * Math.PI * 2 / 14; beam.userData.mat.uniforms.uK.value = k * 0.28; }   // 14 秒轉一圈
}
