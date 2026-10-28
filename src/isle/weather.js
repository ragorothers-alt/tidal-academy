/* 潮汐小島 · 天氣：依日期與時段決定晴／陰／雨（梅雨與颱風季較常下雨）。雨絲、天色、雨聲、雨傘、雨後彩虹。 */
import * as THREE from 'three';
import { scene, bend, sun, hemi, skyU, water, renderer, U, camera } from './engine.js';
import { dayKey } from './quiz.js';
import { winter } from './seasons.js';
import { sfx } from './audio.js';

const RAIN_P = [0.2, 0.25, 0.25, 0.3, 0.45, 0.5, 0.35, 0.45, 0.4, 0.25, 0.2, 0.2];
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
let forceT = null;
export const setTyphoon = v => { forceT = v; };
/** 颱風日：7–10 月偶爾一天（依日期固定） */
export function typhoon(d) { d = d || new Date(); if (forceT != null) return forceT; const m = d.getMonth() + 1; return m >= 7 && m <= 10 && hash(ymd(d) + ':typhoon') < 0.05; }
export function afterTyphoon(d) { const today = new Date(d || new Date()), y = new Date(today); y.setDate(y.getDate() - 1); return forceT == null && !typhoon(today) && typhoon(y); }
/** 某日某時的天氣（三小時一個時段，避免忽晴忽雨） */
export function at(d, hour) {
  if (typhoon(d)) return 'storm';
  const block = Math.floor(hour / 3), r = hash(dayKey() + ':' + block), m = d.getMonth();
  return r < RAIN_P[m] ? 'rain' : r < RAIN_P[m] + 0.18 ? 'cloudy' : 'clear';
}
export let now = 'clear';
let rainK = 0, cloudK = 0, bowK = 0, override = null, stormK = 0, wetK = 0, flash = 0, boltIn = 6, thunderIn = -1;
export const raining = () => now === 'rain' || now === 'storm';
export const stormy = () => now === 'storm';
export const setOverride = w => { override = w; };
/** 陰雨的程度 0–1（積雲、浮空島、城堡、遠景跟著變灰：遠方不會還是晴天的亮白） */
export const gloom = () => Math.max(cloudK * 0.55, rainK);
/** 地面有多濕 0–1：下雨時慢慢變濕，雨停後大約兩分鐘才乾（seasons.js 交給地面材質） */
export const wetness = () => wetK;

/* ---------- 雨絲 ---------- */
const N = 700, BOX = 26;
const pos = new Float32Array(N * 6), speed = new Float32Array(N);
for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * BOX * 2, y = Math.random() * 14, z = (Math.random() - 0.5) * BOX * 2; pos.set([x, y, z, x - 0.05, y - 0.55, z], i * 6); speed[i] = 14 + Math.random() * 6; }
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const mat = bend(new THREE.LineBasicMaterial({ color: '#cfe4ff', transparent: true, opacity: 0, depthWrite: false }));
const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; lines.renderOrder = 4; scene.add(lines);

/* ---------- 彩虹：天空裡背對太陽、仰角 42° 的弧（v8.7）----------
   以前是蓋在整個畫面上的 HTML 光環：進室內、低頭看地面、轉身都在畫面同一個位置。現在放在島上的場景裡，
   跟著觀看者移動、方位固定在太陽的反方向；被建築擋住、室內看不到都是自然的結果。 */
const BOW_D = 230, BOW_R = BOW_D * Math.tan(42 * Math.PI / 180);
const bowMat = new THREE.ShaderMaterial({
  uniforms: { uK: { value: 0 } }, transparent: true, depthWrite: false, fog: false,
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uK; varying vec2 vP;
    void main(){
      float t = (length(vP) / ${BOW_R.toFixed(1)} - 0.93) / 0.07;   // 0：內側（紫）→ 1：外側（紅）
      vec3 c = t < 0.2 ? mix(vec3(0.64, 0.52, 0.95), vec3(0.45, 0.66, 1.0), t / 0.2)
        : t < 0.45 ? mix(vec3(0.45, 0.66, 1.0), vec3(0.52, 0.88, 0.58), (t - 0.2) / 0.25)
        : t < 0.65 ? mix(vec3(0.52, 0.88, 0.58), vec3(1.0, 0.89, 0.5), (t - 0.45) / 0.2)
        : t < 0.82 ? mix(vec3(1.0, 0.89, 0.5), vec3(1.0, 0.7, 0.45), (t - 0.65) / 0.17)
        : mix(vec3(1.0, 0.7, 0.45), vec3(1.0, 0.5, 0.55), (t - 0.82) / 0.18);   // 夢幻風的粉彩光譜
      float a = sin(clamp(t, 0.0, 1.0) * 3.14159) * smoothstep(0.0, 0.3, vP.y / ${BOW_R.toFixed(1)});   // 邊緣柔、兩端沒入地平線的霧裡
      gl_FragColor = vec4(c, a * uK);
      #include <colorspace_fragment>
    }`
});
const bow = new THREE.Mesh(new THREE.RingGeometry(BOW_R * 0.93, BOW_R, 128, 1, 0, Math.PI), bowMat);
bow.frustumCulled = false; bow.renderOrder = -1; bow.visible = false; scene.add(bow);
const bowDir = new THREE.Vector3();

const grey = new THREE.Color('#8f98a6'), greyTop = new THREE.Color('#7a8292'), stormTop = new THREE.Color('#4a4f63'), stormLow = new THREE.Color('#646a7c'), boltC = new THREE.Color('#e6e2ff');
/** 每幀：在 applyTime 之後呼叫，套用天氣對光線與畫面的影響 */
export function update(dt, hour, night, focus, onChange) {
  const d = new Date(), w = override || at(d, hour);
  if (w !== now) { const prev = now; now = w; onChange && onChange(w, prev); if (prev === 'rain' && w !== 'rain' && w !== 'storm' && hour >= 7 && hour < 17) bowK = 1; }
  const wet = now === 'rain' || now === 'storm';
  rainK += ((wet ? 1 : 0) - rainK) * Math.min(1, dt * 0.6);
  U.uWind.value += ((now === 'storm' ? 3.2 : 1) - U.uWind.value) * Math.min(1, dt * 0.5);
  cloudK += ((now === 'clear' ? 0 : 1) - cloudK) * Math.min(1, dt * 0.4);
  bowK = Math.max(0, bowK - dt / 240);
  stormK += ((now === 'storm' ? 1 : 0) - stormK) * Math.min(1, dt * 0.4);
  wetK += ((wet && !winter() ? 1 : 0) - wetK) * Math.min(1, dt * (wet ? 0.12 : 0.02));
  // v8.7 暴風雨：偶爾一道閃電（天空一白、隔一兩秒才打雷）
  flash = Math.max(0, flash - dt * 5);
  if (stormK > 0.6 && (boltIn -= dt) <= 0) { flash = 1; boltIn = 7 + Math.random() * 10; thunderIn = 0.6 + Math.random() * 1.6; if (Math.random() < 0.4) setTimeout(() => { flash = Math.max(flash, 0.7); }, 140); }
  if (thunderIn >= 0 && (thunderIn -= dt) < 0) sfx('thunder');
  // 光線
  const dim = cloudK * 0.35 + rainK * 0.4 + stormK * 0.12;   // v6.93：雨天的影子再淡一點（陰天沒有強烈的直射光）
  sun.intensity *= 1 - dim; hemi.intensity *= (1 - rainK * 0.3 - stormK * 0.15) + flash * 1.6; renderer.toneMappingExposure *= (1 - rainK * 0.12 - stormK * 0.08) * (1 + flash * 0.2);
  { const gk = (cloudK * 0.5 + rainK * 0.45) * (1 - night * 0.6); skyU.top.value.lerp(greyTop, gk); skyU.mid.value.lerp(grey, gk * 0.9); skyU.bot.value.lerp(grey, gk * 0.85);
    const sk = stormK * 0.6 * (1 - night * 0.6); skyU.top.value.lerp(stormTop, sk); skyU.mid.value.lerp(stormLow, sk * 0.8); skyU.bot.value.lerp(stormLow, sk * 0.6);   // 暴風雨比下雨暗一截
    if (flash > 0) { skyU.top.value.lerp(boltC, flash * 0.55); skyU.mid.value.lerp(boltC, flash * 0.5); skyU.bot.value.lerp(boltC, flash * 0.35); } }
  skyU.gloom.value = Math.min(1, gloom() * (1 - night * 0.4)) + stormK * 0.5 * (1 - night * 0.5);   // 0–1 陰雨、1–1.5 暴風雨（天空與積雲都看這個）   // 陰天灰一半；下雨整片天空是柔和的灰藍（v6.93：低空那一段以前沒有變灰，雨天還看得到藍天）
  scene.fog.color.lerp(grey, rainK * 0.45 * (1 - night * 0.5));
  scene.fog.near -= rainK * 30; scene.fog.far -= rainK * 60;   // 晴天的霧距由 applyTime 設定（engine.FOG），雨天再拉近
  if (water.sea) water.sea.color.lerp(grey, rainK * 0.35);
  // 雨絲跟著鏡頭焦點
  mat.opacity = rainK * (0.55 - night * 0.2); lines.visible = rainK > 0.02 && !winter();   // 冬天改成下雪（seasons.js）
  if (lines.visible) {
    lines.position.set(focus.x, focus.y, focus.z);
    for (let i = 0; i < N; i++) {
      const o = i * 6, dy = speed[i] * dt * (now === 'storm' ? 1.4 : 1), dx = now === 'storm' ? dy * 0.6 : 0;
      pos[o + 1] -= dy; pos[o + 4] -= dy; pos[o] -= dx; pos[o + 3] -= dx;
      if (pos[o + 4] < -1) { const x = (Math.random() - 0.5) * BOX * 2, z = (Math.random() - 0.5) * BOX * 2, y = 12 + Math.random() * 3; pos.set([x, y, z, x - 0.05, y - 0.55, z], o); }
    }
    geo.attributes.position.needsUpdate = true;
  }
  // 彩虹
  bowMat.uniforms.uK.value = bowK * 0.5 * (1 - night) * (1 - rainK);
  bow.visible = bowMat.uniforms.uK.value > 0.004;
  if (bow.visible) {   // 背對太陽：圓心在地平線下（太陽仰角那麼多），跟著觀看者
    bowDir.copy(skyU.sunDir.value).normalize();   // 天空用的太陽方向（燈光的位置會跟著鏡頭焦點移動）
    const el = Math.max(0, Math.asin(THREE.MathUtils.clamp(bowDir.y, -1, 1))), hx = -bowDir.x, hz = -bowDir.z, hl = Math.hypot(hx, hz) || 1;
    bow.position.set(camera.position.x + hx / hl * BOW_D, camera.position.y - Math.tan(el) * BOW_D, camera.position.z + hz / hl * BOW_D);
    bow.rotation.set(0, Math.atan2(-hx, -hz), 0);   // 正面朝向觀看者
  }
  return rainK;
}
export const icon = () => (now === 'storm' ? '🌀' : now === 'rain' ? (winter() ? '🌨' : '🌧') : now === 'cloudy' ? '☁' : bowK > 0.05 ? '🌈' : null);
