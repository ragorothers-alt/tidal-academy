/* 潮汐小島 · 四季：依日期（或設定）決定季節。冬天整座島積雪、海水轉深藍、天色偏冷、下雨改成下雪；
   秋天樹葉轉成黃橙紅；春天草地嫩綠、飄落櫻花瓣。季節切換時慢慢過渡，不會一瞬間變色。 */
import * as THREE from 'three';
import { scene, bend, U, skyU, sun, hemi, water, renderer } from './engine.js';
import { S } from './state.js';
import * as memo from './memo.js';

export const NAMES = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
export const ORDER = ['auto', 'spring', 'summer', 'autumn', 'winter'];
/** 依月份（北半球）：3–5 春、6–8 夏、9–11 秋、12–2 冬 */
export function auto(d) { const m = (d || new Date()).getMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }
export const pref = () => (S().settings || {}).season || 'auto';
let date = new Date();
export const current = () => (pref() === 'auto' ? auto(date) : pref());
export const winter = () => current() === 'winter';
/** 目標強度：秋天越接近 11 月紅葉越多 */
function target() {
  const s = current(), m = date.getMonth() + 1, auto0 = pref() === 'auto';
  return { snow: s === 'winter' ? depth().v : 0, fall: s === 'autumn' ? (auto0 ? (m === 9 ? 0.4 : m === 10 ? 0.8 : 1) : 1) : 0, bloom: s === 'spring' ? 1 : 0 };
}

/* ---------- 飄落物：冬天雪花、春天櫻花瓣、秋天落葉（同一組粒子，依季節換顏色與動態） ---------- */
const N = 900, BOX = { x: 30, y: 14, z: 24 };
const flake = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c = cv.getContext('2d');
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const petal = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(16, 16, 13, 8, 0.5, 0, Math.PI * 2); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const pos = new Float32Array(N * 3), seed = new Float32Array(N), spd = new Float32Array(N);
for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * BOX.x; pos[i * 3 + 1] = Math.random() * BOX.y; pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z; seed[i] = Math.random() * 100; spd[i] = 0.7 + Math.random() * 0.6; }
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const mat = bend(new THREE.PointsMaterial({ map: flake, size: 0.11, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, color: '#ffffff', fog: true }));
const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; scene.add(pts);
const wrap = (v, L) => ((((v + L / 2) % L) + L) % L) - L / 2;

/* 積雪深度（存檔）：冬天平時 0.7（薄雪，草地露出斑塊），下雪時每分鐘 +0.06 直到 1（厚雪），放晴後每分鐘 -0.015 慢慢融回 0.7；離線時間也算融雪 */
const BASE = 0.7;
function depth() {
  const s = S(); if (!s.snowDepth) s.snowDepth = { v: BASE, at: Date.now() };
  const d = s.snowDepth, gone = (Date.now() - (d.at || Date.now())) / 60000;
  if (gone > 1) d.v = Math.max(BASE, d.v - gone * 0.015);
  d.at = Date.now(); return d;
}
export const snowDepth = () => (winter() ? depth().v : 0);
const K = { snow: 0, fall: 0, bloom: 0 }, fallK = { v: 0 }, auroraK = { v: 0 };
export const debug = { aurora: null };   // 測試用：強制顯示／隱藏極光
const dayHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
let first = true;
const C = { seaW: new THREE.Color('#2f6c9e'), riverW: new THREE.Color('#2c5c92'), riverBase: null, topW: new THREE.Color('#a9bfe2'), botW: new THREE.Color('#eef2fa'), fogW: new THREE.Color('#dfe6f2'), hgW: new THREE.Color('#c9d2e6'), sunW: new THREE.Color('#fff6ee'),
  pink: new THREE.Color('#ffc4d8'), leaf: new THREE.Color('#e8913a'), white: new THREE.Color('#ffffff') };
/**
 * 每幀（在天氣更新之後）：
 * ctx = { date, inside（室內、博物館、神秘島時不顯示季節）, focus（鏡頭焦點）, wet（下雨／雪）, cloudy, night }
 */
export function update(dt, t, ctx) {
  date = ctx.date || date;
  if (winter() && !ctx.inside) { const d = depth(); d.v = THREE.MathUtils.clamp(d.v + (ctx.wet ? 0.06 : ctx.cloudy ? 0 : -0.015) * dt / 60, BASE, 1); }
  const tg = target(), a = first ? 1 : Math.min(1, dt * 0.35); first = false;
  for (const k in K) K[k] += (tg[k] - K[k]) * a;
  const out = !ctx.inside;
  // 回憶錄：每年第一次看到這個季節的景色（只在依日期換季時記）
  if (out && pref() === 'auto' && !first) {
    const y = date.getFullYear(), c = current(), M = { winter: [K.snow > 0.6, `${y} 年的第一場雪`, '整座島都變白了', '❄️'], spring: [K.bloom > 0.9, `${y} 年的櫻花開了`, '廣場的櫻花樹開滿了花', '🌸'], autumn: [K.fall > 0.5, `${y} 年的秋天`, '樹葉一棵一棵轉紅了', '🍁'], summer: [K.snow + K.fall + K.bloom < 0.05, `${y} 年的夏天`, '天空好藍、海好亮', '🌻'] }[c];
    if (M && M[0]) memo.add(M[1], M[2], { key: `season:${y}:${c}`, icon: M[3] });
  }
  U.uSnow.value = out ? K.snow : 0; U.uFall.value = out ? K.fall : 0; U.uBloom.value = out ? K.bloom : 0;
  // 極光：冬天晴朗的夜晚（約一半的日子）會出現
  { const d = date, k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate() - (d.getHours() < 6 ? 1 : 0)}`;
    const on = debug.aurora != null ? debug.aurora && out : out && current() === 'winter' && ctx.night > 0.7 && !ctx.wet && !ctx.cloudy && dayHash(k + ':aurora') < 0.5;
    auroraK.v += ((on ? 1 : 0) - auroraK.v) * Math.min(1, dt * 0.25); skyU.aurora.value = auroraK.v;
    if (on && auroraK.v > 0.6) memo.add(`${d.getFullYear()} 年冬天看到了極光`, '北方的天空在發光', { key: 'aurora:' + d.getFullYear(), icon: '🌌' }); }
  if (!out) { pts.visible = false; return; }
  const w = K.snow;
  if (w > 0.001) {
    // 冬天：海與河轉深藍、天空偏冷帶雲、地面反光讓陰影帶一點藍紫
    if (water.sea) { water.sea.color.lerp(C.seaW, w * 0.8); water.sea.opacity = 0.62 + w * 0.22; }
    if (water.river) { if (!C.riverBase) C.riverBase = water.river.color.clone(); water.river.color.copy(C.riverBase).lerp(C.riverW, w * 0.85); water.river.opacity = 0.78 + w * 0.15; }
    const day = 1 - ctx.night;
    skyU.top.value.lerp(C.topW, w * 0.45 * day); skyU.bot.value.lerp(C.botW, w * 0.5 * day);
    skyU.cover.value = Math.max(skyU.cover.value, 0.3 + w * 0.35);
    scene.fog.color.lerp(C.fogW, w * 0.35 * day);
    hemi.groundColor.lerp(C.hgW, w * 0.5);
    sun.color.lerp(C.sunW, w * 0.4 * day);
    if (ctx.wet) { renderer.toneMappingExposure *= 1 + w * 0.16; scene.fog.color.lerp(C.fogW, w * 0.5 * day); }   // 下雪天是明亮的陰天，不像雨天那麼暗
  } else { if (water.river && C.riverBase) { water.river.color.copy(C.riverBase); water.river.opacity = 0.78; } if (water.sea) water.sea.opacity = 0.62; }
  // 飄落物：冬天下雪（雨天大雪、陰天小雪、晴天偶爾幾片）；春天櫻花瓣；秋天落葉
  const snowAmt = w * (ctx.wet ? 1 : ctx.cloudy ? 0.45 : 0.08), petalAmt = K.bloom * (ctx.wet ? 0 : 0.22), leafAmt = 0;   // v7.5：秋葉改成從樹冠飄下來（details.js），這裡不再撒一片跟著鏡頭的落葉
  const amt = Math.max(snowAmt, petalAmt, leafAmt); fallK.v += (amt - fallK.v) * Math.min(1, dt * 0.5);
  const kind = snowAmt >= petalAmt && snowAmt >= leafAmt ? 'snow' : petalAmt >= leafAmt ? 'petal' : 'leaf';
  pts.visible = fallK.v > 0.01;
  if (!pts.visible) return;
  const n = Math.max(8, Math.round(N * fallK.v)); geo.setDrawRange(0, n);
  const snow = kind === 'snow', heavy = snow && ctx.wet;
  mat.map = snow ? flake : petal; mat.size = snow ? (heavy ? 0.19 : 0.15) : 0.16;
  mat.color.copy(snow ? C.white : kind === 'petal' ? C.pink : C.leaf);
  mat.opacity = (snow ? 0.92 : 0.95) * (1 - ctx.night * 0.35);
  const f = ctx.focus, fallV = snow ? (heavy ? 1.5 : 1) : 0.55;
  for (let i = 0; i < n; i++) {
    const k = i * 3, s = seed[i];
    pos[k] += (Math.sin(t * 0.7 + s) * (snow ? 0.35 : 0.9) + (snow ? 0.15 : 0.4)) * dt;
    pos[k + 1] -= spd[i] * fallV * dt;
    pos[k + 2] += Math.cos(t * 0.6 + s * 1.3) * (snow ? 0.25 : 0.6) * dt;
    pos[k] = f.x + wrap(pos[k] - f.x, BOX.x); pos[k + 2] = f.z + wrap(pos[k + 2] - f.z, BOX.z);
    if (pos[k + 1] < f.y - 3) pos[k + 1] += BOX.y; else if (pos[k + 1] > f.y - 3 + BOX.y) pos[k + 1] -= BOX.y;
  }
  geo.attributes.position.needsUpdate = true;
}
/** 冬天的強度（0–1，給腳印、吐氣等效果用） */
export const snowK = () => U.uSnow.value;

/* ---------- 季節標題：大字＋月份與一句季節的話，淡入淡出 ---------- */
const BANNER = { spring: ['春', '櫻花開了，島上的空氣是甜的', '#ff9fb8'], summer: ['夏', '海好亮，蟬在樹上唱歌', '#3fb7e0'], autumn: ['秋', '樹葉一片一片轉紅', '#e8833a'], winter: ['冬', '雪落在島上，好安靜', '#7aa8e0'] };
let lastBanner = '';
export function banner(force) {
  const c = current(); if (!force && c === lastBanner) return; lastBanner = c;
  const [ch, line, col] = BANNER[c], m = date.getMonth() + 1;
  const el = document.createElement('div'); el.className = 'season-banner' + ((S().guide || {}).fin ? '' : ' small'); el.style.setProperty('--sc', col);   // v8.6 新手引導中：小一點，不蓋住第一次操作
  el.innerHTML = `<b>${ch}</b><span>${pref() === 'auto' ? m + ' 月 · ' : ''}潮汐小島</span><small>${line}</small>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 4200);
}
