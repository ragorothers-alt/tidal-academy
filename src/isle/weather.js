/* 潮汐小島 · 天氣：依日期與時段決定晴／陰／雨（梅雨與颱風季較常下雨）。雨絲、天色、雨聲、雨傘、雨後彩虹。 */
import * as THREE from 'three';
import { scene, bend, sun, hemi, skyU, water, renderer, U } from './engine.js';
import { dayKey } from './quiz.js';
import { winter } from './seasons.js';

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
let rainK = 0, cloudK = 0, bowK = 0, override = null;
export const raining = () => now === 'rain' || now === 'storm';
export const stormy = () => now === 'storm';
export const setOverride = w => { override = w; };
/** 陰雨的程度 0–1（積雲、浮空島、城堡、遠景跟著變灰：遠方不會還是晴天的亮白） */
export const gloom = () => Math.max(cloudK * 0.55, rainK);

/* ---------- 雨絲 ---------- */
const N = 700, BOX = 26;
const pos = new Float32Array(N * 6), speed = new Float32Array(N);
for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * BOX * 2, y = Math.random() * 14, z = (Math.random() - 0.5) * BOX * 2; pos.set([x, y, z, x - 0.05, y - 0.55, z], i * 6); speed[i] = 14 + Math.random() * 6; }
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const mat = bend(new THREE.LineBasicMaterial({ color: '#cfe4ff', transparent: true, opacity: 0, depthWrite: false }));
const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; lines.renderOrder = 4; scene.add(lines);

/* ---------- 彩虹（俯視鏡頭幾乎看不到天空，改用畫面上方的光環） ---------- */
const bowEl = document.createElement('div'); bowEl.className = 'rainbow'; document.body.appendChild(bowEl);

const grey = new THREE.Color('#8f98a6'), greyTop = new THREE.Color('#7a8292');
/** 每幀：在 applyTime 之後呼叫，套用天氣對光線與畫面的影響 */
export function update(dt, hour, night, focus, onChange) {
  const d = new Date(), w = override || at(d, hour);
  if (w !== now) { const prev = now; now = w; onChange && onChange(w, prev); if (prev === 'rain' && w !== 'rain' && w !== 'storm' && hour >= 7 && hour < 17) bowK = 1; }
  const wet = now === 'rain' || now === 'storm';
  rainK += ((wet ? 1 : 0) - rainK) * Math.min(1, dt * 0.6);
  U.uWind.value += ((now === 'storm' ? 3.2 : 1) - U.uWind.value) * Math.min(1, dt * 0.5);
  cloudK += ((now === 'clear' ? 0 : 1) - cloudK) * Math.min(1, dt * 0.4);
  bowK = Math.max(0, bowK - dt / 240);
  // 光線
  const dim = cloudK * 0.35 + rainK * 0.4 + (now === 'storm' ? 0.1 : 0);   // v6.93：雨天的影子再淡一點（陰天沒有強烈的直射光）
  sun.intensity *= 1 - dim; hemi.intensity *= 1 - rainK * 0.3; renderer.toneMappingExposure *= 1 - rainK * 0.12;
  { const gk = (cloudK * 0.5 + rainK * 0.45) * (1 - night * 0.6); skyU.top.value.lerp(greyTop, gk); skyU.mid.value.lerp(grey, gk * 0.9); skyU.bot.value.lerp(grey, gk * 0.85); }   // 陰天灰一半；下雨整片天空是柔和的灰藍（v6.93：低空那一段以前沒有變灰，雨天還看得到藍天）
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
  bowEl.style.opacity = (bowK * 0.55 * (1 - night)).toFixed(3);
  return rainK;
}
export const icon = () => (now === 'storm' ? '🌀' : now === 'rain' ? (winter() ? '🌨' : '🌧') : now === 'cloudy' ? '☁' : bowK > 0.05 ? '🌈' : null);
