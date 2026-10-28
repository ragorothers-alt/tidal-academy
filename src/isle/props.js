/* 潮汐小島 · 場景物件：房子、博物館、商店、燈塔、路燈、橋、樹、花草與碰撞。 */
import * as THREE from 'three';
import { scene, bend, M, mesh, nightMats, lamps, leafGeo, mergedIco, canopyCards, cardMat, CARD_DEPTH, cullable } from './engine.js';
import { register, unregister, registerAt } from './props3d.js';
import { ULTRA } from './perf.js';
import { roadPavers, plazaModel, homeClearance } from './plazamodels.js';
import * as glow from './glow.js';
import { current as seasonNow, auto as seasonAuto } from './seasons.js';
import { N, C, T, tileAt as tileNow, groundAt, riverDist, FORD_Y, warp, tileOf, isBridge, BRIDGES, STAIRS } from './terrain.js';
const tileAt = tileNow;
/** 島嶼規劃（data/islandplan.js）：v6.79 起所有建築、道路與擺設都照規劃放 */
const PLAN = (window.TA.ISLE || {}).PLAN;
if (!PLAN) throw new Error('缺少島嶼規劃（data/islandplan.js）');

let seed = 7;
export const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export const colliders = [];   // {x,z,r} 或 {x0,z0,x1,z1}
export const trees = [], rocks = [], flowerSpots = [], homes = [];
/** 可以坐下的地方：{ x, z, ry（面向）, h（座面高度，null 表示用地面高度）, n（座位數） } */
export const seats = [];
/** 在野外補種一小株花（西部高地的野花草原用；flowers 區塊建立後才可用） */
export let wildFlowers = () => {};
/** 廣場中心（規劃的廣場，套上地形扭曲）：島民聚會、節慶裝飾、雪人都以這裡為準 */
export const PLAZA = warp(PLAN.sites.plaza.x, PLAN.sites.plaza.z);
export const SITES = {};
export const BLDG = {};   // 走得進去的公共建築外觀（圖書館、博物館）：室內拍窗外全景時用（藏起外觀、找中心與朝向）
export function blocked(x, z, r, skip) {
  for (const c of colliders) {
    if (skip && (c.r ? Math.hypot(c.x - x, c.z - z) < c.r + r : x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) && skip(c)) continue;
    if (c.r) { if (Math.hypot(c.x - x, c.z - z) < c.r + r) return true; }
    else if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
  }
  return false;
}
/** 某點陷進碰撞物（含 r 的邊距）多深；0 表示沒有碰到。卡在牆角時用來判斷「這一步是不是往外走」 */
export function penetration(x, z, r, skip) {
  let worst = 0;
  for (const c of colliders) {
    let d;
    if (c.r) d = c.r + r - Math.hypot(c.x - x, c.z - z);
    else d = Math.min(x - (c.x0 - r), (c.x1 + r) - x, z - (c.z0 - r), (c.z1 + r) - z);
    if (d > 0 && !(skip && skip(c))) worst = Math.max(worst, d);
  }
  return worst;
}
const boxC = (x0, z0, x1, z1) => colliders.push({ x0, z0, x1, z1 });
/** 招牌：深藍底的牌匾、金色雙線框、象牙白的字（v6.79 的日系奇幻小鎮統一用這一種；color 只留一條細細的識別色在字下方）。
    畫布依招牌的長寬比，字不會被壓扁；受光（MeshStandard），晚上不會亮成一塊 */
export function label(text, color, w, h) {
  w = w || 2; h = h || 0.5;
  const H = 160, W = Math.round(H * w / h), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), r = H * 0.22;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2c3c72'); g.addColorStop(1, '#1b2550');
  c.fillStyle = g; c.beginPath(); c.roundRect(4, 4, W - 8, H - 8, r); c.fill();
  c.strokeStyle = '#d8b45a'; c.lineWidth = 7; c.beginPath(); c.roundRect(10, 10, W - 20, H - 20, r * 0.8); c.stroke();
  c.lineWidth = 2.5; c.beginPath(); c.roundRect(22, 22, W - 44, H - 44, r * 0.6); c.stroke();
  [[24, H / 2], [W - 24, H / 2]].forEach(([x, y]) => { c.fillStyle = '#e2bf62'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = i % 2 ? 4 : 11; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); });   // 兩端的小星
  let fs = Math.round(H * 0.5); c.font = `800 ${fs}px "M PLUS Rounded 1c", "Microsoft JhengHei", sans-serif`;
  while (c.measureText(text).width > W - 90 && fs > 20) { fs -= 4; c.font = `800 ${fs}px "M PLUS Rounded 1c", "Microsoft JhengHei", sans-serif`; }
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff4dc'; c.fillText(text, W / 2, H / 2 + 3);
  if (color) { const tw = Math.min(W - 120, c.measureText(text).width); c.fillStyle = color; c.globalAlpha = 0.85; c.fillRect(W / 2 - tw / 2, H * 0.8, tw, 5); c.globalAlpha = 1; }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), bend(new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, metalness: 0.1, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25 })));   // 一點自發光：背光面的招牌也讀得出來
}
/** 木頭招牌：風化的原木板（橫向木紋、板縫、邊緣磨損、四角的鐵釘），字是漆上去的深色字，有一點刷痕；做成有厚度的板子 */
export function woodSign(text, w, h, ink) {
  const W = 1024, H = Math.round(W * h / w), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d9c7a5'); g.addColorStop(0.5, '#cbb690'); g.addColorStop(1, '#b49e78'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const planks = 3, ph = H / planks;
  for (let i = 0; i < planks; i++) {   // 每塊板子顏色略不同，下緣一道板縫
    c.fillStyle = `rgba(${120 + Math.random() * 40},${95 + Math.random() * 30},${60 + Math.random() * 20},${0.08 + Math.random() * 0.1})`; c.fillRect(0, i * ph, W, ph);
    c.fillStyle = 'rgba(70,50,30,.45)'; c.fillRect(0, (i + 1) * ph - 3, W, 3); c.fillStyle = 'rgba(255,245,220,.25)'; c.fillRect(0, i * ph, W, 2);
  }
  for (let i = 0; i < 260; i++) {   // 木紋：細長的橫向曲線
    const y = Math.random() * H, x = Math.random() * W, L = 80 + Math.random() * 380;
    c.strokeStyle = `rgba(${90 + Math.random() * 30},${65 + Math.random() * 20},${40},${0.06 + Math.random() * 0.12})`; c.lineWidth = 1 + Math.random() * 2;
    c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + L * 0.3, y + (Math.random() - 0.5) * 6, x + L * 0.7, y + (Math.random() - 0.5) * 6, x + L, y + (Math.random() - 0.5) * 4); c.stroke();
  }
  for (let i = 0; i < 5; i++) { const x = Math.random() * W, y = Math.random() * H; c.fillStyle = 'rgba(90,60,35,.25)'; c.beginPath(); c.ellipse(x, y, 10 + Math.random() * 10, 5 + Math.random() * 4, 0, 0, 7); c.fill(); }   // 木節
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, W * 0.6); vg.addColorStop(0, 'rgba(60,40,20,0)'); vg.addColorStop(1, 'rgba(60,40,20,.35)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);   // 邊緣風化變暗
  [[26, 22], [W - 26, 22], [26, H - 22], [W - 26, H - 22]].forEach(([x, y]) => { c.fillStyle = '#4a3a2c'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.fillStyle = 'rgba(255,240,210,.5)'; c.beginPath(); c.arc(x - 2, y - 2, 3, 0, 7); c.fill(); });
  if (text) {   // 漆上去的字：深色、略有刷痕
    let fs = Math.round(H * 0.5); c.font = `900 ${fs}px "M PLUS Rounded 1c", "Microsoft JhengHei", sans-serif`;
    while (c.measureText(text).width > W * 0.86 && fs > 20) { fs -= 4; c.font = `900 ${fs}px "M PLUS Rounded 1c", "Microsoft JhengHei", sans-serif`; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,240,210,.35)'; c.fillText(text, W / 2 + 2, H / 2 + 4);
    c.fillStyle = ink || '#4a3022'; c.fillText(text, W / 2, H / 2 + 2);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`; c.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 10, 1); }
    c.globalCompositeOperation = 'source-over';
    // 刷掉的地方露出木頭：重新鋪一層淡淡的木色在字的缺口下
    c.globalCompositeOperation = 'destination-over'; c.fillStyle = '#cbb690'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const face = M('#ffffff', { map: tex, roughness: 0.85 }), edge = M('#8a6a48', {}, 'wall');
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), [edge, edge, edge, edge, face, face]); bend(face); box.castShadow = true; box.receiveShadow = true;
  [-1, 1].forEach(sd => { const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, Math.min(0.06, h * 0.12), 0.025), edge); rail.position.set(0, sd * h * 0.29, -0.0375); box.add(rail); });
  return box;
}
function windowMat() { const m = M('#bfe8ff', { emissive: new THREE.Color('#ffcda6'), emissiveIntensity: 0, roughness: 0.12, metalness: 0.1 }, 'glass'); if (!nightMats.includes(m)) nightMats.push(m); return m; }
/** 程式化建築（img2threejs 重建，data/bldmodels.js 的 TA.ISLE.BLDMODELS[key] = (THREE, kit) => Group）：有就換掉原本的外觀。
    keep 裡的物件（招牌在 keep[0]、燈塔的光源）保留；碰撞框、門口位置照舊由各建築函式設定。模型用世界尺寸設計，原本的縮放會換算到保留的物件上 */
// 貼圖以物件身分快取，不交給 M() 的 JSON options 快取（DataTexture 會被序列化）。
const PROP_CARDS = new WeakMap(), PROP_CARD_DEPTH = new WeakMap();
const BKIT = {
  mat: (c, o, k) => M(c, o, k), win: () => windowMat(),
  card: (color, texture, kind = 'pine') => {
    let cache = PROP_CARDS.get(texture); if (!cache) PROP_CARDS.set(texture, cache = new Map());
    const key = color + ':' + kind; if (cache.has(key)) return cache.get(key);
    const m = new THREE.MeshStandardMaterial({ color, map: texture, vertexColors: true, roughness: 0.94, alphaTest: 0.45, alphaToCoverage: true, side: THREE.FrontSide });
    // pine 沒有秋色貼圖分支；沿用已繪製葉片的路徑，略過大葉鱗片／細節法線，保留模型的枝團色與外向法線。
    if (kind === 'pine') m.defines = { TA_LEAFTEX: '' };
    cache.set(key, bend(m, kind)); return m;
  },
  cardDepth: (texture, kind = 'pine') => {
    let cache = PROP_CARD_DEPTH.get(texture); if (!cache) PROP_CARD_DEPTH.set(texture, cache = new Map());
    if (!cache.has(kind)) cache.set(kind, bend(new THREE.MeshDepthMaterial({ map: texture, alphaTest: 0.45, depthPacking: THREE.RGBADepthPacking, side: THREE.FrontSide }), kind));
    return cache.get(kind);   // 與可見材質共用 bend 的風及地平線變形
  }
};
/** 模型裡會動的零件（子群組 name 'anim:spin:<軸>:<每秒弧度>'，例如風車葉）：不併進靜態網格，登記成轉動的零件 */
function anims(m) {
  m.traverse(o => { const p = o.name && o.name.startsWith('anim:spin:') ? o.name.split(':') : null; if (!p) return; o.userData.prop = true; spinners.push({ o, ax: 'xyz'.includes(p[2]) ? p[2] : 'x', w: +p[3] || 1 }); });
}
export function altBuilding(key, g, keep, kit) {
  const fac = ((window.TA.ISLE || {}).BLDMODELS || {})[key]; if (!fac) return false;
  try {
    const m = fac(THREE, kit ? Object.assign({}, BKIT, kit) : BKIT); if (!(m && m.isObject3D)) throw new Error('沒有回傳 Object3D');
    const a = m.userData.sign;   // 招牌位置要在清掉 userData 之前先拿出來
    const meta = {}; ['door', 'cols', 'mailbox', 'lights', 'smoke'].forEach(k => { if (m.userData[k] != null) meta[k] = m.userData[k]; });   // v7.6：夢幻風住宅自己宣告門口、碰撞框、信箱、燈與煙囪的位置（相對房子原點）
    // 清掉建模工具留在 userData 的紀錄（mergeStatic、clone 都用不到）
    m.traverse(o => { o.userData = {}; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const sc = g.scale.x;
    [...g.children].forEach(c => { if (!keep.includes(c)) g.remove(c); });
    g.scale.setScalar(1);
    keep.forEach(k => { k.position.multiplyScalar(sc); k.scale.multiplyScalar(sc); });
    if (Array.isArray(a) && a.length === 3 && keep[0]) keep[0].position.fromArray(a);
    g.add(m); g.userData.meta = meta; anims(m); return true;
  } catch (e) { console.warn('程式化建築建立失敗，改用原本的模型：' + key, e); return false; }
}

export function tree(x, z, s, kind) {
  const g = new THREE.Group(), y = groundAt(x, z);
  g.position.set(x, y, z); s = s || 1;
  if (kind === 'palm') {
    let px = 0, py = 0;
    for (let i = 0; i < 6; i++) { const seg = mesh(new THREE.CylinderGeometry(0.12 * s, 0.15 * s, 0.5 * s, 7), M('#a57a4f'), px, py + 0.25 * s, 0); seg.rotation.z = -0.08 * i; g.add(seg); px += 0.05 * i * s; py += 0.48 * s; }
    const top = new THREE.Group(); top.position.set(px, py, 0); g.add(top);
    for (let i = 0; i < 7; i++) { const lf = mesh(new THREE.SphereGeometry(0.5 * s, 8, 6), M('#55b356', {}, 'pine')); lf.scale.set(1.6, 0.12, 0.38); lf.position.set(Math.cos(i * 0.9) * 0.7 * s, -0.12 * s, Math.sin(i * 0.9) * 0.7 * s); lf.rotation.y = -i * 0.9; lf.rotation.z = -0.35; top.add(lf); }
    for (let i = 0; i < 3; i++) top.add(mesh(new THREE.SphereGeometry(0.12 * s, 8, 6), M('#8a5a2b'), Math.cos(i * 2.1) * 0.15, -0.2 * s, Math.sin(i * 2.1) * 0.15));
  } else if (kind === 'cedar') {
    const hash = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1, key = ['pine_a', 'pine_b', 'pine_c'][Math.floor(hash * 3)];
    if (((window.TA.ISLE || {}).PROPMODELS || {})[key]) {
      const ry = rnd() * 6.28;
      const batched = instanced('PROPMODELS', key, x, z, ry, s), pm = batched ? null : modelClone('PROPMODELS', key);
      if (batched || pm) {
        if (pm) { pm.scale.setScalar(s); g.rotation.y = ry; g.add(pm); }
        scene.add(g); if (pm) register(g);
        colliders.push({ x, z, r: 0.35 * s }); trees.push({ x, z, s, kind, g });
        return g;   // 不登記 prop_pine，避免 props3d 把新松樹換回 Tripo GLB
      }
    }
    g.add(mesh(new THREE.CylinderGeometry(0.13 * s, 0.17 * s, 0.8 * s, 10), M('#6e4e36', {}, 'bark'), 0, 0.4 * s, 0));
    roots(g, s, M('#6e4e36', {}, 'bark'), x, z);
    [[1.0, 0.9], [0.8, 1.55], [0.55, 2.15], [0.3, 2.62]].forEach(([r, h], i) => { const c = mesh(new THREE.ConeGeometry(r * s, (i === 3 ? 0.7 : 1.0) * s, 16), M('#3f9a5e', {}, 'pine'), 0, h * s, 0); c.rotation.y = i * 0.6; g.add(c); });   // 常綠：秋天不變色
  } else {
    const bark = M('#7d5a40', {}, 'bark');
    g.add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.21 * s, 1.25 * s, 8), bark, 0, 0.62 * s, 0));
    roots(g, s, bark, x, z);
    // 兩根伸進樹冠的枝幹
    [[0.9, 0.55], [-1.1, 2.4]].forEach(([tilt, ang]) => { const br = mesh(new THREE.CylinderGeometry(0.035 * s, 0.07 * s, 0.75 * s, 6), bark, Math.cos(ang) * 0.2 * s, 1.3 * s, Math.sin(ang) * 0.2 * s, { noCast: true }); br.rotation.set(Math.sin(ang) * tilt * 0.6, 0, -Math.cos(ang) * tilt * 0.6); g.add(br); });
    const leaf = kind === 'pink' ? M('#5aae4e', {}, 'sakura') : M('#58b34d', {}, 'sway');   // 櫻花樹：平常是綠葉，春天才開花（engine.js 的四季著色）
    // 樹冠：大葉團加上幾團小的，輪廓更蓬鬆
    [[0, 1.75, 0, 0.85], [0.45, 1.45, 0.2, 0.62], [-0.42, 1.5, -0.15, 0.6], [0.05, 2.25, -0.05, 0.55], [0.6, 1.95, -0.32, 0.42], [-0.52, 2.0, 0.34, 0.44], [0.12, 1.32, -0.56, 0.44], [-0.18, 1.3, 0.58, 0.4]].forEach(([a, b, c, r], i) => {
      const sd = i + Math.round(x * 7 + z * 3);
      g.add(mesh(leafGeo(r * s * 0.7, sd), leaf, a * s, b * s, c * s));   // 內芯：較暗的葉團
      const cards = mesh(canopyCards(r * s, sd), cardMat(kind === 'pink' ? '#5aae4e' : '#58b34d', kind === 'pink' ? 'sakura' : 'sway'), a * s, b * s, c * s);
      cards.customDepthMaterial = CARD_DEPTH; g.add(cards);   // 外圈：細碎的葉片輪廓
    });
    const fruit = [];
    if (kind !== 'pink') for (let i = 0; i < 3; i++) { const a = i * 2.2 + rnd(); fruit.push(mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), M('#ff8a3d'), Math.cos(a) * 0.72 * s, 1.55 * s + rnd() * 0.3, Math.sin(a) * 0.72 * s)); g.add(fruit[i]); }
    g.userData.prop = { id: 'prop_tree', h: 2.75 * s, keep: fruit, kind: kind === 'pink' ? 'sakura' : 'sway' };   // 果實留著（搖樹會掉橘子）
  }
  g.rotation.y = rnd() * 6.28;
  if (kind === 'palm') g.userData.prop = { id: 'prop_palm', h: 3.4 * s }; else if (kind === 'cedar') g.userData.prop = { id: 'prop_pine', h: 3.3 * s };
  scene.add(g); colliders.push({ x, z, r: 0.35 * s }); trees.push({ x, z, s, kind, g });
  return g;
}
/** 樹根：樹幹底部往外張開的三條根（依位置決定角度，不用亂數，以免改變島上其他東西的佈置） */
function roots(g, s, mat, x, z) {
  const h0 = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  for (let i = 0; i < 3; i++) {
    const a = h0 * 6.28 + i * 2.09, r = mesh(new THREE.ConeGeometry(0.09 * s, 0.42 * s, 5), mat, Math.cos(a) * 0.16 * s, 0.07 * s, Math.sin(a) * 0.16 * s, { noCast: true });
    r.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15); g.add(r);
  }
}
export function bush(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  const c = rnd() < 0.5 ? '#4fa64a' : '#5cb85c';
  g.add(mesh(new THREE.IcosahedronGeometry(0.42, 1), M(c, {}, 'sway'), 0, 0.3, 0), mesh(new THREE.IcosahedronGeometry(0.32, 1), M(c, {}, 'sway'), 0.32, 0.22, 0.1));
  const fc = ['#ff7a9a', '#ffffff', '#ffd23f'][Math.floor(rnd() * 3)];
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), M(fc), Math.cos(i * 1.7) * 0.35, 0.45 + rnd() * 0.15, Math.sin(i * 1.7) * 0.3, { noCast: true }));
  g.rotation.y = rnd() * 6.28; g.userData.prop = { id: 'prop_shrub', w: 1.0 };   // 有模型就換成細葉灌木（四季變色、春天開花照舊）
  scene.add(g); colliders.push({ x, z, r: 0.4 }); flowerSpots.push([x, z]);
}
/** 圓潤的石頭：細分二十面體用雜訊推擠表面，頂部帶苔蘚綠（頂點色） */
export function rockGeo(r, det) {
  const g = mergedIco(r, det || 3), p = g.attributes.position, v = new THREE.Vector3(), cols = [];   // 共用頂點：岩石表面平滑
  const k1 = rnd() * 10, k2 = rnd() * 10, base = new THREE.Color('#ffffff'), moss = new THREE.Color('#9ccf7a');
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = v.clone().normalize();
    const d = 1 + Math.sin(n.x * 3.1 + k1) * Math.cos(n.z * 2.7 + k2) * 0.12 + Math.sin(n.y * 5.3 + n.x * 4.1 + k1) * 0.05;
    v.copy(n).multiplyScalar(r * d); v.y *= n.y < 0 ? 0.35 : 0.8; p.setXYZ(i, v.x, v.y, v.z);
    const c = base.clone().lerp(moss, THREE.MathUtils.smoothstep(n.y, 0.55, 0.9) * 0.85); cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); return g;
}
export function rock(x, z, s) {
  const y = groundAt(x, z), g = new THREE.Group(), m = mesh(rockGeo(0.45 * s), M('#bdb6aa', { vertexColors: true }, 'stone'), 0, 0.12 * s, 0);
  m.scale.set(1.2, 1, 1); g.add(m); g.position.set(x, y - 0.04 * s, z); g.rotation.y = rnd() * 6;
  g.userData.prop = { id: 'prop_boulder', w: 1.15 * s };   // 有模型就換成風化花崗岩
  scene.add(g); colliders.push({ x, z, r: 0.45 * s }); rocks.push({ x, z, s, m: g });
}
/**
 * 山形屋頂：兩片有厚度的屋面（屋簷外伸）、正背面的三角山牆、山牆邊的封簷板、屋脊蓋瓦與山牆上的小圓窗。
 * 屋脊沿 z 方向，山牆朝正面（+z）。w、d 是牆的寬與深，top 是牆頂高度，rise 是屋脊比牆頂高多少。
 */
export function gable(g, w, d, top, rise, roofCol, wallCol, o) {
  o = o || {};
  const ox = o.ox ?? 0.34, oz = o.oz ?? 0.26, th = 0.16, hw = w / 2, slope = rise / hw, a = Math.atan(slope);
  const hx = hw + ox, L = hx / Math.cos(a) + 0.04, rm = M(roofCol, {}, 'roof'), wood = M(o.trim || '#7a5236', {}, 'wall');
  [-1, 1].forEach(sd => {
    const slab = mesh(new THREE.BoxGeometry(L, th, d + oz * 2), rm, sd * hx / 2, top + rise - slope * hx / 2 + th * 0.45, 0);
    slab.rotation.z = -sd * a; g.add(slab);
    // 屋簷下緣的封簷板（深色木頭，讓屋簷有厚度感）
    const fas = mesh(new THREE.BoxGeometry(0.06, 0.2, d + oz * 2 + 0.02), wood, sd * (hx + 0.01), top + rise - slope * hx - 0.02, 0); g.add(fas);
    // 山牆兩側的封簷板（前後各一條，沿著屋面斜邊）
    [-1, 1].forEach(fz => { const b = mesh(new THREE.BoxGeometry(L, 0.16, 0.08), wood, sd * hx / 2, top + rise - slope * hx / 2 + 0.02, fz * (d / 2 + oz + 0.02)); b.rotation.z = -sd * a; g.add(b); });
  });
  // 三角山牆（實心三角柱，把閣樓封起來）
  const sh = new THREE.Shape(); sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(0, rise); sh.closePath();
  const tri = mesh(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }), M(wallCol, {}, 'wall'), 0, top, -d / 2); g.add(tri);
  // 屋脊蓋瓦
  const ridge = mesh(new THREE.CylinderGeometry(0.1, 0.1, d + oz * 2 + 0.06, 8), M(new THREE.Color(roofCol).multiplyScalar(0.72).getStyle(), {}, 'roof'), 0, top + rise + th * 0.7, 0);
  ridge.rotation.x = Math.PI / 2; g.add(ridge);
  // 正面山牆上的小圓窗（夜晚會亮）
  if (o.attic !== false) {
    const wy = top + rise * 0.42;
    g.add(mesh(new THREE.CircleGeometry(0.22, 20), windowMat(), 0, wy, d / 2 + 0.012));
    const fr = mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 20), M('#fffaf0'), 0, wy, d / 2 + 0.02); g.add(fr);
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.44, 0.03), M('#fffaf0'), 0, wy, d / 2 + 0.025), mesh(new THREE.BoxGeometry(0.44, 0.03, 0.03), M('#fffaf0'), 0, wy, d / 2 + 0.025));
  }
}
/** 半木造的牆面細節：石砌牆腳、四角木柱與牆頂橫樑 */
export function timber(g, w, d, base, top, o) {
  o = o || {};
  const hw = w / 2, hd = d / 2, wood = M(o.wood || '#7a5236', {}, 'wall'), h = top - base;
  g.add(mesh(new THREE.BoxGeometry(w + 0.08, o.stoneH || 0.42, d + 0.08), M(o.stone || '#b9b0a0', {}, 'stone'), 0, base + (o.stoneH || 0.42) / 2, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(mesh(new THREE.BoxGeometry(0.15, h, 0.15), wood, sx * hw, base + h / 2, sz * hd)));
  [-1, 1].forEach(sz => g.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.13, 0.08), wood, 0, top - 0.06, sz * (hd + 0.02))));
  [-1, 1].forEach(sx => g.add(mesh(new THREE.BoxGeometry(0.08, 0.13, d + 0.1), wood, sx * (hw + 0.02), top - 0.06, 0)));
}
/** 把一個群組裡不會再變動的小零件，依材質合併成一個網格（一棟房子原本約 70 個網格、陰影再畫一次，合併後只剩十幾個 draw call）。
   用物件座標做效果的材質（木板牆的牆腳髒污、葉子的明暗）不合併；有 userData.prop 的子群組（會換成 3D 模型）不動。 */
const KEEP_KIND = new Set(['sakura', 'pine']), MERGED_KIND = new Set(['wall', 'sway']), MERGED_MAT = new Map();
/** 木板牆與小盆栽的材質用物件座標做效果：合併後換成另一份（TA_MERGED，改用建築的座標或法線） */
const mergedMat = m => { if (!MERGED_KIND.has(m.userData.kind)) return m; if (!MERGED_MAT.has(m)) { const c = m.clone(); c.defines = Object.assign({}, m.defines, { TA_MERGED: '' }); MERGED_MAT.set(m, bend(c, m.userData.kind)); } return MERGED_MAT.get(m); };
/** 只差在顏色的材質（同一種表面、同樣的粗糙度與金屬感、不發光、不透明、沒有貼圖）：顏色烘進頂點色，合成一個網格。
    程式化模型一棟有十幾二十種顏色，這樣一棟只剩幾次繪製。回傳分組的鍵；不能合併的回傳 null */
const qR = r => Math.round(r * 5) / 5, qM = v => Math.round(v * 2) / 2;   // 粗糙度 0.2 一級、金屬感 0.5 一級：看不出差別，可以合併的多很多
const qMK = m => m.userData.kind === 'metal' ? 0.8 : qM(m.metalness);   // v7.6 'metal' 種類（黃銅、銅、鐵）一律 0.8 合併：0.6–0.72 的黃銅四捨五入成 0.5 會顯得灰
const colorKey = m => (m.isMeshStandardMaterial && !m.map && !m.transparent && !nightMats.includes(m) && m.emissive.getHex() === 0 && !KEEP_KIND.has(m.userData.kind))
  ? [m.userData.kind || 'plain', qR(m.roughness), qMK(m), m.side].join('|') : null;
const VC_MATS = new Map();
const vcMat = (key, m) => { if (!VC_MATS.has(key)) VC_MATS.set(key, M('#ffffff', { vertexColors: true, roughness: qR(m.roughness), metalness: qMK(m), side: m.side }, m.userData.kind === 'plain' ? undefined : m.userData.kind)); return VC_MATS.get(key); };
export function mergeStatic(g, noProxy) {   // noProxy：拿去做共用繪製零件的模型（protoParts）不做陰影替身
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), buckets = new Map(), victims = [];
  /* 一個零件：網格 c 的一段頂點（多材質的模型每個材質群組各是一段，v7.3 起也合併——img2threejs 的房子一棟原本要畫二十次） */
  const add = (c, mat, geo, start, count, whole) => {
    const ck = colorKey(mat), key = (ck ? 'C' + ck : mat.uuid) + (c.castShadow ? 's' : '') + (c.receiveShadow ? 'r' : '');
    if (!buckets.has(key)) buckets.set(key, { mat, ck, cast: c.castShadow, recv: c.receiveShadow, parts: [] });
    buckets.get(key).parts.push({ c, mat, geo, start, count, whole });
  };
  const walk = o => o.children.forEach(c => {
    if (c.userData && (c.userData.prop || c.userData.camThrough)) return;   // camThrough：鏡頭可以穿過的零件（節慶招牌），合併後這個標記會不見
    if (c.isMesh && !c.isInstancedMesh && !c.isSkinnedMesh && c.visible && c.geometry.attributes.normal) {
      const ms = Array.isArray(c.material) ? c.material : null;
      if (!ms) { if (KEEP_KIND.has(c.material.userData.kind)) return; const geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry; add(c, c.material, geo, 0, geo.attributes.position.count, true); victims.push(c); return; }
      const gs = c.geometry.groups; if (!gs.length || ms.some(m => KEEP_KIND.has(m.userData.kind))) return;
      const geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry, n = geo.attributes.position.count;   // toNonIndexed 保留群組：群組的範圍直接是頂點的範圍
      gs.forEach(gr => { const m = ms[gr.materialIndex]; if (m && gr.start < n) add(c, m, geo, gr.start, Math.min(gr.count, n - gr.start), false); });
      victims.push(c);
    } else if (!c.isMesh) walk(c);
  });
  walk(g);
  buckets.forEach(b => {
    if (b.parts.length < 2 && b.parts[0].whole) { victims.splice(victims.indexOf(b.parts[0].c), 1); return; }   // 只有一個完整的網格：留著原本的
    const colors = b.ck && b.parts.some(p => p.mat !== b.mat || p.mat.vertexColors);   // 這一組裡有不同顏色（或本來就是頂點色）：用頂點色
    const P = [], N = [], UV = [], CL = [], hasUV = b.parts.every(p => p.geo.attributes.uv), v = new THREE.Vector3();
    b.parts.forEach(({ c, mat, geo, start, count }) => {
      const pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv, col = mat.color, ca = mat.vertexColors ? geo.attributes.color : null;
      m4.multiplyMatrices(inv, c.matrixWorld); nm.getNormalMatrix(m4);
      for (let i = start; i < start + count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m4); P.push(v.x, v.y, v.z);
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
        if (hasUV) UV.push(ua.getX(i), ua.getY(i));
        if (colors) { if (ca) CL.push(ca.getX(i) * col.r, ca.getY(i) * col.g, ca.getZ(i) * col.b); else CL.push(col.r, col.g, col.b); }
      }
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    if (hasUV) geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    if (colors) geo.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3));
    const m = new THREE.Mesh(geo, mergedMat(colors ? vcMat(b.ck, b.mat) : b.mat)); m.castShadow = b.cast; m.receiveShadow = b.recv; g.add(m);
  });
  victims.forEach(c => c.parent.remove(c));
  if (!noProxy) shadowProxy(g);
}
/* 陰影替身（v7.3）：畫陰影貼圖時材質不重要，一棟建築合併完還有好幾個網格，每個都要多畫一次。
   這裡把會投影的零件（依正反面分組）再合成一個只有位置的網格，放在圖層 2——主畫面不畫，只有畫陰影貼圖時看得到（props3d 畫陰影時打開圖層 2）；
   原本的零件不再投影。之後會換成 3D 模型的子群組（userData.prop）、有自訂陰影材質（樹葉）或透明鏤空的零件不動 */
const PROXY_MAT = {};
function shadowProxy(g) {
  if (g.userData && g.userData.prop) return;
  g.updateMatrixWorld(true);
  const bySide = new Map(), inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  g.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.castShadow || !o.visible || o.customDepthMaterial || o.userData.shadowProxy) return;
    for (let q = o.parent; q && q !== g; q = q.parent) if (!q.visible || (q.userData && q.userData.prop)) return;
    const ms = [].concat(o.material); if (ms.some(m => m.transparent || m.alphaTest > 0 || m.alphaMap || m.displacementMap)) return;
    const side = ms[0].side; if (ms.some(m => m.side !== side)) return;
    if (!bySide.has(side)) bySide.set(side, []); bySide.get(side).push(o);
  });
  bySide.forEach((list, side) => {
    if (list.length < 2) return;
    const P = [];
    list.forEach(o => {
      const geo = o.geometry, pa = geo.attributes.position, idx = geo.index, n = idx ? idx.count : pa.count;
      const ranges = Array.isArray(o.material) && geo.groups.length ? geo.groups.filter(r => o.material[r.materialIndex]) : [{ start: 0, count: n }];
      m4.multiplyMatrices(inv, o.matrixWorld);
      ranges.forEach(r => { for (let k = r.start, e = Math.min(r.start + r.count, n); k < e; k++) { v.fromBufferAttribute(pa, idx ? idx.getX(k) : k).applyMatrix4(m4); P.push(v.x, v.y, v.z); } });
      o.castShadow = false;
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const m = new THREE.Mesh(geo, PROXY_MAT[side] || (PROXY_MAT[side] = new THREE.MeshBasicMaterial({ side, colorWrite: false })));
    m.castShadow = true; m.layers.set(1); m.userData.shadowProxy = true; m.raycast = () => {}; g.add(m);
  });
}
const mailbox = () => { const pm = modelClone('PROPMODELS', 'mailbox'); if (pm) { const g = new THREE.Group(); g.position.set(1.9, 0, 1.6); g.add(pm); return g; } const mb = new THREE.Group(); mb.position.set(1.9, 0.15, 1.6); mb.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), M('#7a5238'), 0, 0.4, 0), mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), M('#5fa8ff'), 0, 0.9, 0)); mb.userData.prop = { id: 'prop_mailbox', h: 1.15 }; return mb; };
/** v7.6 夢幻風住宅：模型裡標成 'stone' 的淺色面（奶油、粉白灰泥）改用 'plaster'（柔和斑駁、不畫石塊）；深一點的石基、台階照舊是石材 */
const plasterMat = (c, o, k) => M(c, o, k === 'stone' && new THREE.Color(c).getHSL({}, THREE.SRGBColorSpace).l > 0.82 ? 'plaster' : k);
const DOOR_X = { cottage_a: 0.7, cottage_b: 0.3, cottage_c: 0.93, player_home: 0.43, earth_home: 0.43 };   // 小屋模型的門不在正中央（門口台階的中心）
/** 房子：model 是 Codex 重建的小屋（cottage_a/b/c、player_home，屋頂顏色依住戶換），用世界尺寸；沒有模型就用原本的造型（s 是縮放） */
export function house(x, z, roof, wall, s, model) {
  if (model && ((window.TA.ISLE || {}).BLDMODELS || {})[model]) {
    const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z); const mb = mailbox(); g.add(mb);
    if (altBuilding(model, g, [mb], /^home_/.test(model) ? { roof, mat: plasterMat } : { roof })) {
      const me = g.userData.meta || {};
      if (me.mailbox) mb.position.set(me.mailbox[0], 0, me.mailbox[1]);
      mergeStatic(g); scene.add(g); register(g);
      if (me.cols) {   // v7.6 夢幻風住宅：碰撞框、門口、信箱、煙囪都照模型宣告的位置
        const cols = me.cols.map(([x0, z0, x1, z1]) => ({ x0: x + Math.min(x0, x1), z0: z + Math.min(z0, z1), x1: x + Math.max(x0, x1), z1: z + Math.max(z0, z1) }));
        const mp = me.mailbox || [1.9, 1.6]; cols.push({ x: x + mp[0], z: z + mp[1], r: 0.25 }); colliders.push(...cols);
        return { x, z, door: me.door ? [x + me.door[0], z + me.door[1]] : [x, z + 2.5], g, cols, roof, s: 1, model, smoke: me.smoke || null };
      }
      const box = model === 'earth_home'
        ? { x0: x - 1.61, z0: z - 1.38, x1: x + 1.61, z1: z + 1.36 }
        : { x0: x - 1.8, z0: z - 1.65, x1: x + 1.8, z1: z + 1.65 };
      const mc = { x: x + 1.9, z: z + 1.6, r: 0.25 }; colliders.push(box, mc);
      const cols = [box, mc];
      if (model === 'earth_home') {
        // 百葉箱與門邊天氣黑板都有實體，台階中央保留通往門口的路。
        const screen = { x0: x + 1.15, z0: z + 1.66, x1: x + 1.75, z1: z + 2.26 };
        const board = { x0: x - 1.4, z0: z + 1.72, x1: x - 0.7, z1: z + 2.16 };
        const posts = [-0.45, 1.31].map(dx => ({ x: x + dx, z: z + 1.62, r: 0.15 }));
        cols.push(screen, board, ...posts); colliders.push(screen, board, ...posts);
      }
      return { x, z, door: [x + (DOOR_X[model] || 0), z + 2.5], g, cols, roof, s: 1, model };
    }
  }
  return houseParts(x, z, roof, wall, s);
}
function houseParts(x, z, roof, wall, s) {
  s = s || 1;
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  g.add(mesh(new THREE.BoxGeometry(3.3, 0.3, 3.3), M('#cdbfa6', {}, 'stone'), 0, 0.15, 0));
  g.add(mesh(new THREE.BoxGeometry(3, 1.9, 3), M(wall || '#fff3dc', {}, 'wall'), 0, 1.25, 0));
  timber(g, 3, 3, 0.3, 2.2);
  gable(g, 3, 3, 2.2, 1.45, roof || '#ef6f5e', wall || '#fff3dc');
  g.add(mesh(new THREE.BoxGeometry(0.8, 1.25, 0.08), M('#8a5a3b', {}, 'wall'), 0, 0.92, 1.52));
  g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), M('#ffd36b', { metalness: 0.6, roughness: 0.3 }), 0.25, 0.95, 1.58));
  // 門框、門簷（小屋頂）與台階
  const trim = M('#fffaf0');
  g.add(mesh(new THREE.BoxGeometry(0.98, 0.09, 0.12), trim, 0, 1.6, 1.54), mesh(new THREE.BoxGeometry(0.09, 1.3, 0.12), trim, -0.45, 0.95, 1.54), mesh(new THREE.BoxGeometry(0.09, 1.3, 0.12), trim, 0.45, 0.95, 1.54));
  const aw = mesh(new THREE.BoxGeometry(1.25, 0.06, 0.55), M(roof || '#ef6f5e', {}, 'roof'), 0, 1.78, 1.72); aw.rotation.x = 0.35; g.add(aw);
  [-0.55, 0.55].forEach(bx => { const br = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), trim, bx, 1.66, 1.68); br.rotation.x = 0.7; g.add(br); });
  g.add(mesh(new THREE.BoxGeometry(1.1, 0.12, 0.45), M('#d9cdb6', {}, 'stone'), 0, 0.36, 1.78));
  [-0.95, 0.95].forEach(wx => {
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), windowMat(), wx, 1.45, 1.52));
    // 白色窗框與十字窗格
    g.add(mesh(new THREE.BoxGeometry(0.76, 0.07, 0.1), trim, wx, 1.79, 1.55), mesh(new THREE.BoxGeometry(0.76, 0.07, 0.1), trim, wx, 1.11, 1.55));
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.7, 0.1), trim, wx - 0.35, 1.45, 1.55), mesh(new THREE.BoxGeometry(0.07, 0.7, 0.1), trim, wx + 0.35, 1.45, 1.55));
    g.add(mesh(new THREE.BoxGeometry(0.04, 0.62, 0.06), trim, wx, 1.45, 1.57), mesh(new THREE.BoxGeometry(0.62, 0.04, 0.06), trim, wx, 1.45, 1.57));
    // 窗下花台
    g.add(mesh(new THREE.BoxGeometry(0.74, 0.16, 0.22), M('#a8754a', {}, 'wall'), wx, 1.0, 1.64));
    const fc = ['#ff7a9a', '#ffd23f', '#ffffff', '#b38bff'][Math.abs(Math.round(x * 3 + z + wx)) % 4];
    for (let i = 0; i < 4; i++) { g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), M('#5fae4a', {}, 'sway'), wx - 0.27 + i * 0.18, 1.12, 1.66, { noCast: true })); g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), M(fc), wx - 0.27 + i * 0.18 + 0.03, 1.18, 1.71, { noCast: true })); }
  });
  g.add(mesh(new THREE.BoxGeometry(0.4, 1, 0.4), M('#b9705a', {}, 'stone'), 0.9, 3.3, -0.5));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), M('#8a5040'), 0.9, 3.84, -0.5));
  g.add(mailbox());   // 信箱
  mergeStatic(g); scene.add(g); register(g); const h = 1.6 * s, box = { x0: x - h, z0: z - h, x1: x + h, z1: z + h }, mb = { x: x + 1.9 * s, z: z + 1.6 * s, r: 0.25 }; colliders.push(box, mb);
  return { x, z, door: [x, z + 1.6 * s + 0.9], g, cols: [box, mb], roof, s };
}
function museum(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  g.add(mesh(new THREE.BoxGeometry(7.2, 0.35, 5.2), M('#d9cdb6', {}, 'stone'), 0, 0.17, 0));
  g.add(mesh(new THREE.BoxGeometry(6.4, 2.8, 4), M('#efe6d4', {}, 'stone'), 0, 1.75, -0.3));
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.22, 0.25, 2.8, 12), M('#fffaf0'), -2.4 + i * 1.6, 1.75, 2.05));
  g.add(mesh(new THREE.BoxGeometry(7, 0.35, 5), M('#d8cfbf'), 0, 3.3, 0));
  const shape = new THREE.Shape(); shape.moveTo(-3.5, 0); shape.lineTo(3.5, 0); shape.lineTo(0, 1.3); shape.closePath();
  g.add(mesh(new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false }), M('#5b8fd6', {}, 'roof'), 0, 3.47, -2.5));
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.8, 0.1), M('#6b4f3a'), 0, 1.25, 1.72));
  [-1.9, 1.9].forEach(wx => g.add(mesh(new THREE.BoxGeometry(0.9, 1.1, 0.1), windowMat(), wx, 1.9, 1.72)));
  const sg = label('潮汐博物館', '#5b8fd6', 2.6, 0.62); sg.position.set(0, 3.9, 2.56); g.add(sg);
  altBuilding('museum', g, [sg]);
  mergeStatic(g); scene.add(g); register(g); boxC(x - 3.6, z - 2.6, x + 3.6, z + 1.9);
  SITES.museum = { x, z, front: [x + 0.5, z + 3.6] }; BLDG.museum = g;
}
function shop(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  g.add(mesh(new THREE.BoxGeometry(3.6, 0.25, 3), M('#cdbfa6', {}, 'stone'), 0, 0.12, 0));
  g.add(mesh(new THREE.BoxGeometry(3.4, 2.1, 2.8), M('#ffe9a8', {}, 'wall'), 0, 1.3, 0));
  g.add(mesh(new THREE.BoxGeometry(3.7, 0.3, 3.1), M('#7bc96f'), 0, 2.5, 0));
  for (let i = 0; i < 7; i++) { const a = mesh(new THREE.BoxGeometry(0.5, 0.06, 1), M(i % 2 ? '#ffffff' : '#ff8a7a'), -1.5 + i * 0.5, 2.05, 1.75); a.rotation.x = 0.45; g.add(a); }
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), windowMat(), -0.6, 1.2, 1.42), mesh(new THREE.BoxGeometry(0.75, 1.3, 0.08), M('#8a5a3b'), 0.9, 0.9, 1.42));
  const sg = label('潮汐商店', '#5fbf6a', 2.0, 0.5); sg.position.set(0, 2.95, 1.6); g.add(sg);
  altBuilding('shop', g, [sg]);
  mergeStatic(g); scene.add(g); register(g); boxC(x - 1.8, z - 1.5, x + 1.8, z + 1.5);
  SITES.shop = { x, z, front: [x - 0.4, z + 2.5] };
}
function lighthouse(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.CylinderGeometry(0.85 - i * 0.08, 0.92 - i * 0.08, 1, 16), M(i % 2 ? '#ef6f5e' : '#ffffff'), 0, 0.5 + i, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 12), M('#fff6c0', { emissive: new THREE.Color('#ffe08a'), emissiveIntensity: 0.4 }), 0, 5.4, 0));
  g.add(mesh(new THREE.ConeGeometry(0.8, 0.8, 12), M('#ef6f5e'), 0, 6.2, 0));
  glow.emit({ x, y: y + 5.4, z, kind: 'beacon' });   // 燈室：照亮四周 26 公尺
  g.add(mesh(new THREE.BoxGeometry(0.6, 1.0, 0.1), M('#8a5a3b'), 0, 0.5, 0.9));
  const sg = label('燈塔競技場', '#ef6f5e', 1.8, 0.45); sg.position.set(0, 1.35, 0.95); g.add(sg);
  altBuilding('lighthouse', g, [sg]);
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r: 1 });
  SITES.lighthouse = { x, z, door: [x, z + 1.75] };
}
function libraryHall(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(0.8);
  g.add(mesh(new THREE.BoxGeometry(4.8, 0.3, 3.8), M('#cdbfa6', {}, 'stone'), 0, 0.15, 0));
  g.add(mesh(new THREE.BoxGeometry(4.4, 2.4, 3.2), M('#f4ead8', {}, 'wall'), 0, 1.5, 0));
  timber(g, 4.4, 3.2, 0.3, 2.7, { stoneH: 0.5 });
  gable(g, 4.4, 3.2, 2.7, 1.5, '#5a8a5a', '#f4ead8', { attic: false });
  [-1.4, 1.4].forEach(wx => g.add(mesh(new THREE.BoxGeometry(0.9, 1.1, 0.08), windowMat(), wx, 1.6, 1.62)));
  g.add(mesh(new THREE.BoxGeometry(1.0, 1.5, 0.08), M('#6b4f3a'), 0, 1.05, 1.62));
  ['#c0392b', '#2980b9', '#27ae60', '#d4ac0d', '#8e44ad'].forEach((c, i) => g.add(mesh(new THREE.BoxGeometry(0.16, 0.42, 0.2), M(c), -0.4 + i * 0.2, 3.12, 1.74)));   // 山牆前的一排書（招牌）
  g.add(mesh(new THREE.BoxGeometry(1.3, 0.06, 0.3), M('#7a5236', {}, 'wall'), 0, 2.88, 1.72));
  const sg = label('潮汐圖書館', '#5a8a5a', 2.2, 0.55); sg.position.set(0, 2.45, 1.66); g.add(sg);
  altBuilding('library', g, [sg]);
  mergeStatic(g); scene.add(g); register(g); boxC(x - 1.95, z - 1.55, x + 1.95, z + 1.55);
  SITES.library = { x, z, door: [x, z + 2.2] }; BLDG.library = g;
}
function examHall(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(0.8);
  g.add(mesh(new THREE.BoxGeometry(4.8, 0.3, 3.8), M('#cdbfa6', {}, 'stone'), 0, 0.15, 0));
  g.add(mesh(new THREE.BoxGeometry(4.4, 2.4, 3.2), M('#eef3fb', {}, 'wall'), 0, 1.5, 0));
  g.add(mesh(new THREE.BoxGeometry(4.8, 0.3, 3.6), M('#5b8fd6'), 0, 2.85, 0));
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), M('#eef3fb'), 0, 3.6, -0.2));
  const tr = mesh(new THREE.ConeGeometry(0.95, 0.8, 4), M('#5b8fd6'), 0, 4.7, -0.2); tr.rotation.y = Math.PI / 4; g.add(tr);
  const clock = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24), M('#ffffff'), 0, 3.65, 0.42); clock.rotation.x = Math.PI / 2; g.add(clock);
  const hand = mesh(new THREE.BoxGeometry(0.04, 0.3, 0.02), M('#3a3040'), 0.06, 3.72, 0.46); hand.rotation.z = -0.6; g.add(hand);
  g.add(mesh(new THREE.BoxGeometry(1.0, 1.5, 0.08), M('#6b4f3a'), 0, 1.05, 1.62));
  [-1.5, 1.5].forEach(wx => g.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.08), windowMat(), wx, 1.7, 1.62)));
  const sg = label('潮汐考場', '#5b8fd6', 2.2, 0.55); sg.position.set(0, 2.45, 1.66); g.add(sg);
  altBuilding('exam', g, [sg]);
  mergeStatic(g); scene.add(g); register(g); boxC(x - 1.95, z - 1.55, x + 1.95, z + 1.55);
  SITES.exam = { x, z, door: [x, z + 2.2] };
}
function lamp(x, z) {   // 路燈：燈籠的光交給 glow.js（真燈池＋地上光斑＋空氣光暈）
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  if (instanced('PROPMODELS', 'lamp', x, z, 0)) { glow.emit({ x, y: y + 2.5, z, kind: 'lamp' }); colliders.push({ x, z, r: 0.2 }); return; }   // Codex 重建的黃銅燈籠路燈（燈籠中心在 2.55）
  const pm = modelClone('PROPMODELS', 'lamp');
  if (pm) { g.add(pm); mergeStatic(g); scene.add(g); register(g); glow.emit({ x, y: y + 2.5, z, kind: 'lamp' }); colliders.push({ x, z, r: 0.2 }); return; }
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 2, 8), M('#4a4f5c'), 0, 1, 0));
  const head = M('#fff6d8', { emissive: new THREE.Color('#ffc870'), emissiveIntensity: 0 }); if (!nightMats.includes(head)) nightMats.push(head);
  g.add(mesh(new THREE.SphereGeometry(0.22, 12, 8), head, 0, 2.1, 0), mesh(new THREE.ConeGeometry(0.28, 0.2, 10), M('#4a4f5c'), 0, 2.32, 0));
  glow.emit({ x, y: y + 2.1, z, kind: 'lamp', power: 0.8 });
  g.userData.prop = { id: 'prop_lamp', h: 2.5, keep: [g.children[1]] };   // 夜燈球留著（在燈籠裡發光）
  scene.add(g); colliders.push({ x, z, r: 0.18 });
}
export function bench(x, z, ry) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0;
  if (instanced('PROPMODELS', 'bench', x, z, ry)) { colliders.push({ x, z, r: 0.6 }); seats.push({ x, z, ry: ry || 0, h: y + 0.47, n: 2 }); return; }   // 白石座＋暖木的長椅（座面 0.45）
  const pm = modelClone('PROPMODELS', 'bench');
  if (pm) { g.add(pm); mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r: 0.6 }); seats.push({ x, z, ry: ry || 0, h: y + 0.47, n: 2 }); return; }
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.08, 0.45), M('#c48a54'), 0, 0.45, 0), mesh(new THREE.BoxGeometry(1.4, 0.4, 0.06), M('#c48a54'), 0, 0.7, -0.2));
  [-0.6, 0.6].forEach(bx => g.add(mesh(new THREE.BoxGeometry(0.06, 0.45, 0.4), M('#5a5f6a'), bx, 0.22, 0)));
  g.userData.prop = { id: 'prop_bench', w: 1.5 };
  scene.add(g); colliders.push({ x, z, r: 0.55 }); seats.push({ x, z, ry: ry || 0, h: y + 0.49, n: 2 });
}
/** 碼頭：從南岸的沙灘往 +z 伸進海裡（規劃的碼頭）；hw 是走道半寬（Codex 的模型 3 公尺寬，舊的木棧橋 1.8 公尺） */
export const PIER = (() => { const p = PLAN.sites.pier, [x, z] = warp(p.x, p.z - p.d / 2); return { x, z, len: p.d, hw: 0.85 }; })();
function pier() {
  const { x, z, len } = PIER, g = new THREE.Group(), m = modelClone('LMMODELS', 'pier');
  if (m) { g.position.set(x, 0.02, z); g.add(m); PIER.hw = 1.4; }   // 模型的甲板頂面 0.45（＋海面 0.02 ≈ 走路高度 0.47）
  else {
    g.position.set(x, 0.42, z);
    for (let i = 0; i < len * 2; i++) g.add(mesh(new THREE.BoxGeometry(1.8, 0.1, 0.45), M(i % 2 ? '#c99a62' : '#b98a55'), 0, 0, i * 0.5));
    for (let i = 0; i <= len; i += 2) [-0.85, 0.85].forEach(px => g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), M('#8a6038'), px, -0.5, i)));
  }
  mergeStatic(g); scene.add(g); register(g);
}
export const onPier = (x, z) => Math.abs(x - PIER.x) < PIER.hw && z > PIER.z - 0.4 && z < PIER.z + PIER.len - 0.2;
/** 踏石：不規則的扁平石片（輪廓與表面用雜訊推出起伏、邊緣圓鈍），一半埋進土裡；幾種形狀輪流用 */
function stepGeo(seed) {
  const g = new THREE.CylinderGeometry(0.3, 0.33, 0.14, 18, 2), p = g.attributes.position, v = new THREE.Vector3(), k1 = seed * 1.7, k2 = seed * 2.3;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z);
    const rr = r * (1 + Math.sin(a * 2 + k1) * 0.1 + Math.sin(a * 3 + k2) * 0.07 + Math.sin(a * 5 + k1 * 2) * 0.04);
    let y = v.y; if (y > 0.05) y += (Math.sin(v.x * 9 + k1) * Math.cos(v.z * 8 + k2)) * 0.012 - (r / 0.3) ** 2 * 0.02;   // 頂面微微隆起、邊緣圓鈍
    p.setXYZ(i, Math.cos(a) * rr * (r > 0 ? 1 : 0), y, Math.sin(a) * rr * (r > 0 ? 1 : 0));
  }
  g.computeVertexNormals(); return g;
}
export const STEP_STONES = [];   // 踏石的位置與半徑（草叢避開石面，石頭邊緣乾淨）
function stones(path) {
  const geos = [0, 1, 2, 3].map(stepGeo), mats = ['#ddcdbd', '#d3c4b9', '#e4d4c4'].map(c => M(c, {}, 'stone')), sg = new THREE.Group();   // 一條小路的踏石合併成幾個網格
  for (let i = 0; i < path.length - 1; i++) {
    const [a, b] = [path[i], path[i + 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / 0.85);
    for (let k = 0; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t + (rnd() - 0.5) * 0.2, z = a[1] + (b[1] - a[1]) * t + (rnd() - 0.5) * 0.2; const tt = tileAt(x, z); if (tt === 3 || tt < 0 || tt === 4) continue; const m = mesh(geos[Math.floor(rnd() * 4)], mats[Math.floor(rnd() * 3)], x, groundAt(x, z) - 0.02, z, { noCast: true }); m.scale.set(1.1 + rnd() * 0.45, 1.3, 1.05 + rnd() * 0.4); m.rotation.set((rnd() - 0.5) * 0.06, rnd() * 6.28, (rnd() - 0.5) * 0.06); sg.add(m); STEP_STONES.push({ x, z, r: 0.33 * Math.max(m.scale.x, m.scale.z) }); }   // 大塊扁平的踏石，一半埋進土裡、微微傾斜
  }
  mergeStatic(sg); scene.add(sg);
}

const HOUSE_MODELS = ['cottage_a', 'cottage_b', 'cottage_c'];   // 島民小屋的三種造型（Codex 重建的模型）
/* ---------- 擺設：照島嶼規劃（data/islandplan.js，v6.79「星環學院」新島） ----------
   規劃的座標還沒套地形扭曲：每個東西都放在 warp(規劃座標)，和扭曲後的河岸、懸崖、階梯對齊（groundAt 會反扭曲回規劃座標）。 */
export const plots = [];
/** 空地（新島民或搬遷用） */
export function makePlot(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].forEach(([dx, dz]) => g.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8), M('#d1ae84'), dx, 0.25, dz)));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), M('#8a5a3b'), 0, 0.45, 1.6), mesh(new THREE.BoxGeometry(0.8, 0.45, 0.05), M('#eee2d1'), 0, 0.95, 1.6));
  [-0.15, 0.15].forEach(dy => g.add(mesh(new THREE.BoxGeometry(0.68, 0.055, 0.035), M('#d1ae84'), 0, 0.95 + dy, 1.557)));
  const sg = label('空地', '#c99a62', 0.7, 0.18); sg.position.set(0, 0.96, 1.64); g.add(sg);
  g.traverse(o => { o.frustumCulled = cullable(o); });
  const col = { x, z, r: 1.6 }; scene.add(g); colliders.push(col);
  const pl = { x, z, marker: g, col, model: HOUSE_MODELS[plots.length % HOUSE_MODELS.length] }; plots.push(pl); return pl;
}
/** 拆掉房子（搬遷用） */
export function removeHouse(h) { scene.remove(h.g); unregister(h.g); (h.cols || []).forEach(c => { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }); }
/** 在空地蓋房子 */
export function buildOnPlot(pl, roof, model) {
  scene.remove(pl.marker); const i = colliders.indexOf(pl.col); if (i >= 0) colliders.splice(i, 1);
  pl.built = true; const h = house(pl.x, pl.z, roof, '#fff6e6', 0.82, model || pl.model); h.g.traverse(o => { o.frustumCulled = cullable(o); }); return h;
}

/* 重複擺很多次的道具（路燈、長椅、旗幟、花台、水晶地燈、貨箱、指路牌）：同一種模型的所有擺放共用 InstancedMesh，
   一種零件一次畫完（原本每一盞路燈各畫八個零件、陰影再畫一次）。模型先依材質合併；模型裡本來就有的 InstancedMesh（釘飾、鉚釘）攤平成一般幾何。
   佈置完（flushInstances）之後再擺的，改用一般的群組 */
const INST = new Map(); let instOpen = true;
function bakeInstanced(o) {   // 一個 InstancedMesh 的所有複本攤平成一個幾何（物件座標）
  const parts = [], m4 = new THREE.Matrix4(), src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
  for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); parts.push(src.clone().applyMatrix4(m4)); }
  const P = [], Nn = []; parts.forEach(g => { P.push(...g.attributes.position.array); Nn.push(...g.attributes.normal.array); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return g;
}
const PARTS = new Map();
/** 模型拆成共用繪製用的零件：依材質合併後的幾何、材質、在模型裡的位置、要不要投影（walldress.js 也用） */
export function protoParts(table, key) {
  const id = table + ':' + key; if (PARTS.has(id)) return PARTS.get(id);
  const m = modelClone(table, key); if (!m) { PARTS.set(id, null); return null; }
  const tmp = new THREE.Group(); tmp.add(m); mergeStatic(tmp, true); tmp.updateMatrixWorld(true);
  const parts = [];
  tmp.traverse(o => { if (!o.isMesh) return; const geo = o.isInstancedMesh ? bakeInstanced(o) : o.geometry; if (!geo.boundingSphere) geo.computeBoundingSphere(); parts.push({ geo, mat: o.material, local: o.matrixWorld.clone(), cast: o.castShadow && geo.boundingSphere.radius > 0.3, depth: o.customDepthMaterial }); });
  PARTS.set(id, parts); return parts;
}
// 高地在 props 的初次 flush 之後才建立。松林延到同一個 microtask 批次建立，之後補種也重用這個入口。
let pineFlushPending = false;
function queuePines() {
  if (pineFlushPending) return; pineFlushPending = true;
  queueMicrotask(() => {
    pineFlushPending = false;
    INST.forEach(e => {
      if (!e.pine || !e.dirty) return; e.dirty = false;
      if (e.group) { unregister(e.group); scene.remove(e.group); e.group.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); }
      e.group = instanceGroup(e.parts, e.at); e.group.name = 'instanced-' + e.key;
      scene.add(e.group); register(e.group);
    });
  });
}
function instanced(table, key, x, z, ry, scale = 1) {
  const pine = table === 'PROPMODELS' && /^pine_[abc]$/.test(key);
  if (!instOpen && !pine) return false;
  const id = table + ':' + key; let e = INST.get(id);
  if (!e) {
    const parts = protoParts(table, key); if (!parts) return false;
    INST.set(id, e = { parts, at: [], pine, key });
  }
  e.at.push(new THREE.Matrix4().compose(new THREE.Vector3(x, groundAt(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry || 0), new THREE.Vector3(scale, scale, scale)));
  if (pine) { e.dirty = true; queuePines(); }
  return true;
}
/** 除錯：每種共用繪製的道具擺了幾個 */
export const instCounts = () => Object.fromEntries([...INST].map(([k, e]) => [k, e.at.length]));
function instanceGroup(parts, at, matOf, noCast) {
  const g = new THREE.Group(), m4 = new THREE.Matrix4();
  parts.forEach(pt => {
    const im = new THREE.InstancedMesh(pt.geo, matOf ? matOf(pt.mat) : pt.mat, at.length);
    at.forEach((a, i) => im.setMatrixAt(i, m4.multiplyMatrices(a, pt.local)));
    im.instanceMatrix.needsUpdate = true; im.customDepthMaterial = pt.depth;
    im.castShadow = pt.cast && !noCast; im.receiveShadow = true; im.userData.staticInst = true; g.add(im);   // 擺好就不再動：可以交給視錐剔除（engine.cullable）
  });
  return g;
}
/** 一批重複擺放的道具（零件 parts、每個擺放的矩陣 at）切成 16 公尺一塊，每塊各自一組 InstancedMesh：
    鏡頭看不到的塊不畫、陰影框外的塊不投影（原本全島的同一種道具一次畫完，連看不到的也畫進陰影貼圖）。walldress.js 也用 */
export function chunkInstances(parts, at, matOf, noCast) {
  const cells = new Map(), v = new THREE.Vector3();
  at.forEach(a => { v.setFromMatrixPosition(a); const k = Math.floor(v.x / 16) + ',' + Math.floor(v.z / 16); let c = cells.get(k); if (!c) cells.set(k, c = { list: [], x: 0, y: 0, z: 0 }); c.list.push(a); c.x += v.x; c.y += v.y; c.z += v.z; });
  cells.forEach(c => {
    const n = c.list.length, g = instanceGroup(parts, c.list, matOf, noCast), sh = [];
    let r = 0, y0 = 1e9, y1 = -1e9; c.list.forEach(a => { v.setFromMatrixPosition(a); r = Math.max(r, Math.hypot(v.x - c.x / n, v.z - c.z / n)); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); });
    g.children.forEach(im => { if (im.castShadow) sh.push(im); });
    scene.add(g); registerAt(g, c.x / n, (y0 + y1) / 2 + 1.5, c.z / n, r + 3, sh, (y1 - y0) / 2 + 2.5);   // 包圍體：這一塊的範圍、高度到道具頂端（路燈約 3 公尺）
  });
}
const LOWCAST = /flower_bed|flower_pots|planter|crates|crystal_lamp/;   // 矮的或細碎的道具：影子很小，不畫進陰影貼圖（每個都有幾千個三角形）
function flushInstances() {
  instOpen = false;
  INST.forEach((e, id) => { if (!e.pine) chunkInstances(e.parts, e.at, null, LOWCAST.test(id)); });
}
/** Codex 重建的地標／道具模型（LMMODELS、BLDMODELS、PROPMODELS）：第一次建立後複製；清掉建模工具留在 userData 的紀錄；失敗就回傳 null（用原本的簡單造型） */
const MPROTO = {};
export function modelClone(table, key, kit) {
  const fac = ((window.TA.ISLE || {})[table] || {})[key], id = table + ':' + key; if (!fac || MPROTO[id] === null) return null;
  try {
    if (!MPROTO[id]) {
      const m = fac(THREE, Object.assign({}, BKIT, kit)); if (!(m && m.isObject3D)) throw new Error('沒有回傳 Object3D');
      const sign = m.userData.sign; m.traverse(o => { o.userData = {}; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); if (sign) m.userData.sign = sign;
      MPROTO[id] = m;
    }
    const c = MPROTO[id].clone(true); c.userData = Object.assign({}, MPROTO[id].userData);
    // r160 的 Object3D.clone 不複製 customDepthMaterial，兩次 prototype clone 都要保留它。
    const copyDepth = (src, dst) => { if (src.customDepthMaterial) dst.customDepthMaterial = src.customDepthMaterial; src.children.forEach((child, i) => copyDepth(child, dst.children[i])); };
    copyDepth(MPROTO[id], c); return c;
  } catch (e) { MPROTO[id] = null; console.warn('程式化模型建立失敗，改用簡單造型：' + id, e); return null; }
}
/** 共用的小零件 */
const placed = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z); g.rotation.y = ry || 0; return g; };
const gold = () => M('#d8b45a', { metalness: 0.7, roughness: 0.35 }), navy = () => M('#1f2c55', { roughness: 0.7 }), ivory = () => M('#efe7d6', {}, 'stone');
let emblemTex = null;
/** 深藍旗面上的金色潮汐星徽（月牙＋四芒星） */
function emblem() {
  if (emblemTex) return emblemTex;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const c = cv.getContext('2d');
  c.fillStyle = '#22305e'; c.fillRect(0, 0, 128, 256); c.strokeStyle = '#d8b45a'; c.lineWidth = 6; c.strokeRect(8, 8, 112, 222);
  c.fillStyle = '#e2bf62'; c.beginPath(); c.arc(60, 112, 38, 0, Math.PI * 2); c.fill(); c.fillStyle = '#22305e'; c.beginPath(); c.arc(76, 100, 34, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e2bf62'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 6 : 18; c.lineTo(80 + Math.cos(a) * r, 112 + Math.sin(a) * r); } c.fill();
  emblemTex = new THREE.CanvasTexture(cv); emblemTex.colorSpace = THREE.SRGBColorSpace; return emblemTex;
}

function board(x, z) {   // 廣場告示牌：島嶼評價
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  [-0.55, 0.55].forEach(dx => g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), M('#8a5a3b'), dx, 0.75, 0)));
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), M('#c99a62'), 0, 1.15, 0));
  const sg = label('島嶼評價', '#ffb84a', 1.2, 0.3); sg.position.set(0, 1.42, 0.05); g.add(sg);
  [['#fff3dc', -0.32], ['#dff4ff', 0.05], ['#ffe0ea', 0.36]].forEach(([c, dx], i) => g.add(mesh(new THREE.BoxGeometry(0.28, 0.32, 0.02), M(c), dx, 1.05 - (i % 2) * 0.06, 0.05)));
  altBuilding('board', g, [sg]);
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r: 0.7 });
  SITES.board = { x, z, door: [x, z + 1.1] };
}
function telescope(x, z) {   // 學院台地上的觀星台（晚上可以觀星）
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  [0, 2.1, 4.2].forEach(a => { const l = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 6), M('#5a5f6a'), Math.sin(a) * 0.28, 0.58, Math.cos(a) * 0.28); l.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); g.add(l); });
  const tube = new THREE.Group(); tube.position.set(0, 1.2, 0); tube.rotation.set(-0.35, 0, 0.8); g.add(tube);
  tube.add(mesh(new THREE.CylinderGeometry(0.13, 0.11, 1.3, 14), M('#f4f0e6'), 0, 0.2, 0), mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 14), M('#3b5a8a'), 0, 0.85, 0), mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), M('#3a3040'), 0, -0.52, 0));
  const sg = label('天文望遠鏡', '#3b5a8a', 1.3, 0.32); sg.position.set(0, 0.35, 0.45); g.add(sg);
  if (altBuilding('telescope', g, [sg])) sg.position.set(0, 0.4, 1.0);   // 新模型的平台比較大：招牌插在平台前緣
  mergeStatic(g); g.traverse(o => { o.frustumCulled = cullable(o); });
  scene.add(g); register(g); colliders.push({ x, z, r: 0.6 });
  SITES.telescope = { x, z, door: [x, z + 1.4] };
}
function camp(x, z) {   // 沙灘上的露營地
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  const tent = mesh(new THREE.ConeGeometry(1.25, 1.6, 4), M('#ff9a6a'), 0, 0.8, -0.3); tent.rotation.y = Math.PI / 4; tent.scale.set(1, 1, 0.8); g.add(tent);
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.9, 0.05), M('#7a3a2a'), 0, 0.45, 0.42));
  const fireM = M('#ffb84a', { emissive: new THREE.Color('#ff8a3a'), emissiveIntensity: 1.2 });
  g.add(mesh(new THREE.ConeGeometry(0.18, 0.4, 6), fireM, 1.4, 0.25, 0.9));
  [0, 1, 2].forEach(i => { const l = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), M('#8a5a3b'), 1.4 + Math.cos(i * 2.1) * 0.18, 0.06, 0.9 + Math.sin(i * 2.1) * 0.18); l.rotation.z = Math.PI / 2; l.rotation.y = i * 2.1; g.add(l); });
  const lg = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 8), M('#a57a4f'), 1.4, 0.16, 1.7); lg.rotation.z = Math.PI / 2; g.add(lg);
  const sg = label('露營地', '#ff9a6a', 1.1, 0.28); sg.position.set(-1.3, 1.1, 0.6); g.add(sg); g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), M('#8a5a3b'), -1.3, 0.5, 0.55));
  altBuilding('camp', g, [sg]);
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z: z - 0.3, r: 1.1 }, { x: x + 0.9, z: z + 1.2, r: 0.4 });
  SITES.camp = { x, z, spot: [x + 0.4, z + 1.8] };
}
function fountain(x, z) {   // 廣場中央的噴泉：白石水池、金色渾天儀與發光的藍水晶
  const g = placed(x, z), m = modelClone('LMMODELS', 'fountain');
  if (m) g.add(m); else {
    g.add(mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.5, 32), ivory(), 0, 0.25, 0), mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.06, 32), M('#7fd0e0', { transparent: true, opacity: 0.8, roughness: 0.1 }), 0, 0.44, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.4, 16), ivory(), 0, 1.0, 0), mesh(new THREE.OctahedronGeometry(0.3), M('#9fd8ff', { emissive: '#7fc8ff', emissiveIntensity: 0.9 }), 0, 1.98, 0));
    [0, 1, 2].forEach(i => { const r = mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 40), gold(), 0, 1.98, 0); r.rotation.set(i * 1.05, i * 0.6, 0); g.add(r); });
  }
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r: 1.7 });
  SITES.fountain = { x, z };
}
/* 溪邊的水車磨坊（Codex 用 img2threejs 重建，data/lmmodels3.js）：水車那一側朝西面向 Tidal River，正門朝南。
   靜態的部分照常合併；水車（'wheel'）先拿出來、合併完再放回原位，每格由 spin() 繞自己的 x 軸轉 */
export const WATERWHEEL = { x: -15.8, z: -1.0 };
const spinners = [];
function waterwheel(x, z) {
  const m = modelClone('LMMODELS', 'waterwheel'); if (!m) return;
  const g = placed(x, z); g.add(m);
  m.traverse(o => { if (o.isMesh && /_(water|foam)$/.test(o.name)) o.castShadow = false; });   // 水流、水花不投影子
  const wheel = m.getObjectByName('wheel'), home = wheel && wheel.parent;
  if (wheel) home.remove(wheel);
  mergeStatic(g);
  if (wheel) { home.add(wheel); spinners.push({ o: wheel, w: 0.5 }); }   // 上射式：水從頂端沿 +z 那側落下，那一側往下轉（繞 +x 正轉），約每分鐘 5 圈
  scene.add(g); register(g); boxC(x - 2.6, z - 1.95, x + 2.6, z + 1.95);
  SITES.waterwheel = { x, z };
}
/** 每格：轉動水車（main.js 在島上時呼叫） */
export function spin(dt) { for (const s of spinners) s.o.rotation[s.ax || 'x'] += s.w * dt; }
function gate(x, z) {   // 碼頭與城鎮之間的城門
  const g = placed(x, z), m = modelClone('LMMODELS', 'gate');
  if (m) g.add(m); else {
    [-1, 1].forEach(sd => { g.add(mesh(new THREE.BoxGeometry(1.1, 3.4, 1.2), ivory(), sd * 2.3, 1.7, 0), mesh(new THREE.BoxGeometry(1.3, 0.25, 1.4), gold(), sd * 2.3, 3.5, 0)); });
    const lin = mesh(new THREE.BoxGeometry(5.8, 0.6, 1.3), ivory(), 0, 3.6, 0); g.add(lin);
    const roof = mesh(new THREE.ConeGeometry(3.6, 1.0, 4, 1), M('#3e5a8c', {}, 'roof'), 0, 4.4, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.42); g.add(roof);
  }
  mergeStatic(g); scene.add(g); register(g);
  [-1, 1].forEach(sd => boxC(x + sd * 1.75 - (sd < 0 ? 1.25 : 0), z - 0.95, x + sd * 1.75 + (sd > 0 ? 1.25 : 0), z + 0.95));
  SITES.gate = { x, z };
}
function stall(x, z) {   // 市集攤位
  const g = placed(x, z), m = modelClone('BLDMODELS', 'market');
  if (m) g.add(m); else {
    g.add(mesh(new THREE.BoxGeometry(2.2, 0.9, 1.1), M('#a57a4f', {}, 'wall'), 0, 0.45, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), M('#8a5a3b'), sx * 1.1, 1.1, sz * 0.6)));
    for (let i = 0; i < 6; i++) { const s = mesh(new THREE.BoxGeometry(0.42, 0.05, 1.5), M(i % 2 ? '#f5ead5' : '#bf665d'), -1.05 + i * 0.42, 2.25, 0.05); s.rotation.x = 0.25; g.add(s); }
    ['#ff8a3d', '#ffd23f', '#7cc96f'].forEach((c, i) => g.add(mesh(new THREE.SphereGeometry(0.28, 10, 8), M(c), -0.7 + i * 0.7, 1.05, 0.15)));
  }
  mergeStatic(g); scene.add(g); register(g); boxC(x - 1.25, z - 0.75, x + 1.25, z + 0.75);
}
/** 水道橋：從西部高地延伸到學院台地的多拱石橋（頂上有水渠，人不能走；拱底下可以穿過去） */
function aqueduct(x, z, rot, size) {
  const L = size[0], dir = rot * Math.PI / 180, ux = Math.cos(dir), uz = -Math.sin(dir), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = dir;
  const top = 3.9, span = 2.6, n = Math.max(2, Math.round(L / span)), sp = L / n, pw = 0.55, r = (sp - pw) / 2, spring = top - 0.55 - r;
  const stone = M('#ebe2d0', {}, 'stone'), trim = gold(), water = M('#7fd0e0', { transparent: true, opacity: 0.85, roughness: 0.08, emissive: '#2a8aa8', emissiveIntensity: 0.15 });
  const seg = modelClone('LMMODELS', 'aqueduct');
  if (seg) {   // 模型是一段 8.5 公尺：沿線排滿（每段依地面高度往下延伸到地面）
    const k = Math.max(1, Math.round(L / 8.5)), sl = L / k;
    for (let i = 0; i < k; i++) { const c = seg.clone(true), lx = -L / 2 + sl * (i + 0.5); c.position.set(lx, 1.0, 0); c.scale.set(sl / 8.5, 1, 1); g.add(c); }
    for (let i = 0; i <= k * 3; i++) { const px = -L / 2 + sl * i / 3, wx = x + ux * px, wz = z + uz * px; if (groundAt(wx, wz) < 2) colliders.push({ x: wx, z: wz, r: 0.45 }); }   // 每段三個拱：橋墩不能穿過，拱底下可以走
  } else {
    for (let i = 0; i < n; i++) {
      const cx = -L / 2 + sp * (i + 0.5), s = new THREE.Shape();
      s.moveTo(-sp / 2, top); s.lineTo(sp / 2, top); s.lineTo(sp / 2, spring); s.lineTo(r, spring); s.absarc(0, spring, r, 0, Math.PI, false); s.lineTo(-sp / 2, spring); s.lineTo(-sp / 2, top);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: false, curveSegments: 10 }); geo.translate(cx, 0, -0.5); g.add(new THREE.Mesh(geo, stone));
    }
    for (let i = 0; i <= n; i++) {   // 橋墩：從地面（各點的地面高度）一路到拱腳
      const px = -L / 2 + sp * i, wx = x + ux * px, wz = z + uz * px, gy = groundAt(wx, wz), h = spring - gy + 0.02;
      if (h > 0.05) g.add(mesh(new THREE.BoxGeometry(pw, h, 1.15), stone, px, gy + h / 2, 0));
      if (h > 0.05) colliders.push({ x: wx, z: wz, r: 0.42 });
    }
    g.add(mesh(new THREE.BoxGeometry(L + 0.3, 0.14, 1.3), trim, 0, top + 0.07, 0));
    [-0.5, 0.5].forEach(sz => g.add(mesh(new THREE.BoxGeometry(L, 0.32, 0.14), stone, 0, top + 0.3, sz)));   // 水渠兩側的矮牆
    g.add(mesh(new THREE.BoxGeometry(L, 0.06, 0.82), water, 0, top + 0.26, 0));
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mergeStatic(g); scene.add(g); register(g);
}
function banner(x, z, rot) {   // 掛著深藍金徽旗幟的旗桿
  if (instanced('PROPMODELS', 'banner', x, z, rot * Math.PI / 180)) { colliders.push({ x, z, r: 0.25 }); return; }
  const g = placed(x, z, rot * Math.PI / 180), m = modelClone('PROPMODELS', 'banner');
  if (m) g.add(m); else {
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.25, 14), ivory(), 0, 0.12, 0), mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.9, 8), navy(), 0, 1.55, 0));
    g.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), gold(), 0, 3.05, 0), mesh(new THREE.BoxGeometry(0.75, 0.05, 0.05), gold(), 0.3, 2.85, 0));
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.25, 1, 4), bend(new THREE.MeshStandardMaterial({ map: emblem(), side: THREE.DoubleSide, roughness: 0.85 }), 'sway'));
    cloth.position.set(0.32, 2.2, 0.03); cloth.castShadow = true; g.add(cloth);
  }
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r: 0.25 });
}
function planter(x, z) {   // 方形白石花台
  if (instanced('PROPMODELS', 'planter', x, z, 0)) { colliders.push({ x, z, r: 0.55 }); return; }
  const g = placed(x, z), m = modelClone('PROPMODELS', 'planter');
  if (m) g.add(m); else {
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.5, 0.95), ivory(), 0, 0.25, 0), mesh(new THREE.BoxGeometry(1.02, 0.08, 1.02), gold(), 0, 0.52, 0));
    const fc = ['#6c8dff', '#ffffff', '#ffd23f', '#b38bff'];
    for (let i = 0; i < 9; i++) g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), M(i % 3 ? '#5fae4a' : fc[i % 4], {}, i % 3 ? 'sway' : undefined), -0.3 + (i % 3) * 0.3, 0.62, -0.3 + Math.floor(i / 3) * 0.3, { noCast: true }));
  }
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r: 0.55 });
}
/** 石拱橋：模型沿 x、長 6.4、走道寬 2.4；依規劃的橋拉長、轉向。橋面高度和 terrain.js 的 bridgeY 同一個公式 */
function bridgeModel(br) {
  const [ax, az] = warp(br.a[0], br.a[1]), [bx, bz] = warp(br.b[0], br.b[1]), dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, cx = (ax + bx) / 2, cz = (az + bz) / 2;
  const g = new THREE.Group(); g.position.set(cx, br.base, cz); g.rotation.y = -Math.atan2(dz, dx);
  const m = modelClone('LMMODELS', 'bridge');
  if (m) { m.scale.set(L / 6.4, 1, br.w / 2.4); g.add(m); } else {
    const deck = M('#e6dccb', {}, 'stone'), n = Math.ceil(L / 0.5);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, y = 0.02 + 0.45 * Math.sin(Math.PI * t), a = Math.cos(Math.PI * t) * 0.45 * Math.PI / L; const p = mesh(new THREE.BoxGeometry(L / n + 0.04, 0.16, br.w), deck, -L / 2 + L * t, y - 0.08, 0); p.rotation.z = a; g.add(p); }
    [-1, 1].forEach(sd => { for (let i = 0; i <= 4; i++) { const t = i / 4, y = 0.02 + 0.45 * Math.sin(Math.PI * t); g.add(mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), deck, -L / 2 + L * t, y + 0.3, sd * (br.w / 2 + 0.11))); } });
  }
  mergeStatic(g); scene.add(g); register(g);
  for (let s = 0.6; s < L - 0.5; s += 0.5) [-1, 1].forEach(sd => colliders.push({ x: ax + ux * s - uz * sd * (br.w / 2 + 0.2), z: az + uz * s + ux * sd * (br.w / 2 + 0.2), r: 0.18 }));   // 欄杆：別從橋邊掉下去
}
/** 白石階梯：模型從 z = 0（y = 0）往 −z 爬到 z = −6（y = 2）；依規劃的階梯轉向、伸縮（踏面和 terrain.js 的 stairY 同一條斜線） */
function stairModel(st) {
  const [ax, az] = warp(st.a[0], st.a[1]), [bx, bz] = warp(st.b[0], st.b[1]), dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const g = new THREE.Group(); g.position.set(ax, st.y0, az); g.rotation.y = Math.atan2(-dx, -dz);
  const m = modelClone('LMMODELS', 'stairs');
  if (m) { m.scale.set(st.w / 2, (st.y1 - st.y0) / 2, L / 6); g.add(m); } else {
    const stone = M('#e6dccb', {}, 'stone'), n = Math.round(L * 2), rise = st.y1 - st.y0;
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; g.add(mesh(new THREE.BoxGeometry(st.w, rise * t1, L / n + 0.02), stone, 0, rise * t1 / 2, -L * (t0 + t1) / 2)); }
  }
  mergeStatic(g); scene.add(g); register(g);
  for (let s = 0.4; s < L - 0.2; s += 0.5) [-1, 1].forEach(sd => colliders.push({ x: ax + ux * s - uz * sd * (st.w / 2 + 0.2), z: az + uz * s + ux * sd * (st.w / 2 + 0.2), r: 0.18 }));
}
/* ---------- 石板路：沿規劃的路線鋪一條貼著地面的帶子（石材的紋路用世界座標畫，自然是一塊塊石板） ----------
   過水、上階梯、上橋的那幾段不鋪（有橋與階梯的模型）。ROAD 記錄路面範圍給草叢、花與擺設避開 */
const ROAD = new Set();   // 0.5 公尺格子
const roadKey = (x, z) => Math.round(x * 2) + ',' + Math.round(z * 2);
export const onRoad = (x, z) => ROAD.has(roadKey(x, z));
/** 路面貼圖（一張 = 路寬 × 路寬）：u 橫跨路面、v 沿著路。石板路是一排排錯縫的奶油色圓角石板；
    兩側的石板長短不一，外面透明（alphaTest 裁掉），路緣自然地參差，不是一條直線 */
const PAVE = {}, PAVEN = {};
/** 高度圖 → 法線貼圖（Sobel）：石板的倒角、表面起伏與石縫的凹陷靠這張打光，不用多做幾何。
    貼圖預設 flipY，畫布往下是 -v，所以綠色通道直接用往下的斜率 */
function normalFrom(hc, k) {
  const S = hc.width, b = document.createElement('canvas'); b.width = b.height = S;
  const bc = b.getContext('2d'); bc.filter = 'blur(1.2px)'; bc.drawImage(hc, 0, 0);   // 先糊一點：倒角是圓的，不是一階一階
  const src = bc.getImageData(0, 0, S, S).data, out = bc.createImageData(S, S), o = out.data;
  const H = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * k;
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * k;
    const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    o[i] = (-dx / l * 0.5 + 0.5) * 255; o[i + 1] = (dy / l * 0.5 + 0.5) * 255; o[i + 2] = (0.5 / l + 0.5) * 255; o[i + 3] = 255;
  }
  bc.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(b); t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function paveTex(kind) {
  if (PAVE[kind]) return PAVE[kind];
  const S2 = 256, cv = document.createElement('canvas'), hc = document.createElement('canvas'); cv.width = cv.height = hc.width = hc.height = S2 * 2;
  const c = cv.getContext('2d'), h = hc.getContext('2d'); c.scale(2, 2); h.scale(2, 2);   // 512 解析度、座標照舊用 256
  const gray = (v, a) => `rgba(${v | 0},${v | 0},${v | 0},${a == null ? 1 : a})`;
  let sd = kind.length * 977 + 13; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  if (kind === 'stone') {
    c.fillStyle = '#c8c3b9'; c.fillRect(6, 0, S2 - 12, S2);
    h.fillStyle = gray(128); h.fillRect(0, 0, S2, S2);
  } else {
    const base = kind === 'earth' ? '#d1bda5' : '#e2d0c0';   // v7.6：鋪面暗一點、帶粉（以前 #eee0c9 白天整片發白）
    // 連續的四週期曲線取代8px橫條：邊緣0.2–0.4m碎草漸變，路心保持乾淨。
    for (let y = 0; y < S2; y++) {
      const a = y / S2 * Math.PI * 2, L = 7 + Math.sin(a * 3) * 3 + Math.cos(a * 7) * 2, R = S2 - 8 + Math.sin(a * 5 + 1) * 4;
      const g = c.createLinearGradient(L, 0, R, 0);
      g.addColorStop(0, 'rgba(180,198,166,0)'); g.addColorStop(0.07, '#b4c6a6'); g.addColorStop(0.16, base); g.addColorStop(0.84, base); g.addColorStop(0.94, '#b4c6a6'); g.addColorStop(1, 'rgba(180,198,166,0)');
      c.fillStyle = g; c.fillRect(L, y, R - L, 1);
    }
    h.fillStyle = gray(128); h.fillRect(0, 0, S2, S2);
    for (let s = 0; s < 160; s++) {
      const px = 28 + r() * (S2 - 56), py = r() * S2;
      c.fillStyle = r() < 0.5 ? 'rgba(255,246,224,.08)' : 'rgba(150,130,114,.05)'; c.beginPath(); c.ellipse(px, py, 2 + r() * 6, 1 + r() * 2, 0, 0, 7); c.fill();
    }
    // 三到五顆碎石聚群，不滿版撒芝麻。
    for (let g = 0; g < 3; g++) { const px = (g % 2 ? 0.85 : 0.15) * S2, py = r() * S2;
      for (let j = 0, n = 3 + Math.floor(r() * 3); j < n; j++) { const x = px + (r() - 0.5) * 16, y = py + (r() - 0.5) * 20; c.fillStyle = '#d8cebc'; c.beginPath(); c.ellipse(x, y, 1 + r() * 1.5, 0.7 + r(), r(), 0, 7); c.fill(); }
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  PAVEN[kind] = normalFrom(hc, kind === 'stone' ? 2.2 : 1.4);
  return (PAVE[kind] = t);
}
let homeKeepout = () => false;
function roads() {
  homeKeepout = homeClearance(homes, PLAN, warp);
  const stoneRows = []; let slabId = 0;
  const mat = k => { const map = paveTex(k); return bend(new THREE.MeshStandardMaterial({ map, normalMap: PAVEN[k], normalScale: new THREE.Vector2(0.12, 0.12), alphaTest: 0.5, roughness: 0.9 })); };   // v7.5：凹凸收到 75%（每塊都像一樣的厚餅）
  const MAT = { stone: mat('stone'), earth: mat('earth'), sand: mat('sand') }, KIND = { stone: 'stone', address: 'stone', earth: 'earth', sand: 'sand' };
  const buf = new Map();
  let ri = 0;
  for (const r of PLAN.roads) {
    const k = KIND[r.kind]; if (!k) continue;
    const lift = 0.03 + (ri++ % 6) * 0.004;   // 每條路差幾公釐：路口重疊時上面那條整齊蓋住下面，不會互相閃爍（z-fighting）
    const pts = [];   // 每 0.5 公尺一個點
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.5));
      for (let q = (i ? 1 : 0); q <= n; q++) pts.push([a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n]);
    }
    if (pts.length < 2) continue;
    const B = buf.get(k) || { P: [], UV: [] }; buf.set(k, B);
    const edge = (i, s) => { const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], tx = q[0] - o[0], tz = q[1] - o[1], l = Math.hypot(tx, tz) || 1; return [p[0] - tz / l * s, p[1] + tx / l * s]; };
    let dist = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), v0 = dist / r.w, v1 = (dist + seg) / r.w; dist += seg;
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, mz = (pts[i][1] + pts[i + 1][1]) / 2, [wx, wz] = warp(mx, mz), t = tileAt(wx, wz);
      if (t < 0 || t === 3 || t === 6 || t === 4 || t === 7 || isBridgeAt(wx, wz)) continue;
      const F = [-1, -0.5, 0, 0.5, 1], cols = F.map(f => [edge(i, f * r.w / 2), edge(i + 1, f * r.w / 2)]);
      if (k === 'stone') stoneRows.push({ a: cols[0][0], b: cols[0][1], c: cols[4][1], d: cols[4][0], width: r.w, lift, id: slabId++ });
      const vtx = ([px, pz]) => { const [qx, qz] = warp(px, pz); return [qx, groundAt(qx, qz) + lift - (k === 'stone' ? 0.026 : 0), qz]; };
      for (let j = 0; j < 4; j++) {
        const u0 = (F[j] + 1) / 2, u1 = (F[j + 1] + 1) / 2, a = vtx(cols[j][0]), b = vtx(cols[j][1]), cc = vtx(cols[j + 1][1]), d = vtx(cols[j + 1][0]);
        const up = (b[2] - a[2]) * (cc[0] - a[0]) - (b[0] - a[0]) * (cc[2] - a[2]) > 0;   // 三角形要逆時針（從上面看）才是正面，法線朝上、受光正確
        if (up) { B.P.push(...a, ...b, ...cc, ...a, ...cc, ...d); B.UV.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0); }
        else { B.P.push(...a, ...cc, ...b, ...a, ...d, ...cc); B.UV.push(u0, v0, u1, v1, u0, v1, u0, v0, u1, v0, u1, v1); }
      }
      for (let f = -0.85; f <= 0.86; f += 0.17) { const [ex, ez] = edge(i, f * r.w / 2), [qx, qz] = warp(ex, ez); ROAD.add(roadKey(qx, qz)); }
    }
  }
  buf.forEach((B, k) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(B.P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(B.UV, 2)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, MAT[k]); m.name = 'w04-road-base-' + k; m.receiveShadow = true; scene.add(m);
  });
  roadPavers(stoneRows, { groundAt, warp, plaza: PLAZA, clear: homeKeepout, clearGrass: (x, z, r) => STEP_STONES.push({ x, z, r }), scene, registerAt });
}
const isBridgeAt = (x, z) => { const [tx, tz] = tileOf(x, z); return isBridge(tx, tz); };
/** 參考圖裡的小點綴：學院前庭的雕像、住宅區的水井、路口的指路牌、主街與學院步道兩側的水晶地燈、商店與碼頭的貨箱。
    有 Codex 的模型才擺（沒有就不放），位置在候選點裡挑第一個空著的地方 */
const MANY = new Set(['crystal_lamp', 'crates', 'signpost']);   // 擺很多個的點綴：共用 InstancedMesh
function decorations() {
  const free = (x, z, r) => { const t = tileAt(x, z); return (t === 1 || t === 2 || t === 0) && !blocked(x, z, r) && !onRoad(x, z) && !isBridgeAt(x, z); };
  const put = (table, key, cands, r, ry) => {
    if (!((window.TA.ISLE || {})[table] || {})[key]) return null;
    for (const [px, pz, rot] of cands) {
      const [x, z] = warp(px, pz); if (!free(x, z, r)) continue;
      if (MANY.has(key) && instanced(table, key, x, z, rot != null ? rot : ry || 0)) { colliders.push({ x, z, r }); if (key === 'crystal_lamp') glow.emit({ x, y: groundAt(x, z) + 0.75, z, kind: 'crystal', power: 0.6 }); return [x, z]; }
      const m = modelClone(table, key); if (!m) return null;
      const g = placed(x, z, rot != null ? rot : ry || 0); g.add(m); mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r }); return [x, z];
    }
    return null;
  };
  put('LMMODELS', 'statue', [[11.6, -24.6, -0.4], [2.4, -24.8, 0.4], [12.5, -19.5, 0]], 0.6);
  put('LMMODELS', 'well', [[19.5, 8.5], [20, -1], [-15, 12], [-22, 20]], 0.9);
  [[[-1.6, 25.5, 0.3]], [[4.2, -9.6, 0], [3.4, -10.5, 0]], [[-21.5, 9.5, -0.6]], [[30, 9, 0.5], [31, 12, 0.5]]].forEach(c => put('LMMODELS', 'signpost', c, 0.3));
  ['Starward Main Street', 'Academy Promenade', 'Observatory Walk'].forEach(name => {
    const r = PLAN.roads.find(o => o.name === name); if (!r) return; let side = 1, acc = 2.5;
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (; acc < L; acc += 5.5) { const off = r.w / 2 + 0.55; put('PROPMODELS', 'crystal_lamp', [[a[0] + ux * acc - uz * side * off, a[1] + uz * acc + ux * side * off]], 0.2); side = -side; }
      acc -= L;
    }
  });
  { // 廣場石板地外圈四盞路燈＋噴泉水晶的藍光：夜裡廣場是一圈溫暖的燈火（參考圖的夜景）
    const pc = SITES.plaza;
    [0.8, 2.35, 3.9, 5.5].forEach(a => { const x = pc.x + Math.cos(a) * 7.0, z = pc.z + Math.sin(a) * 7.0; if (free(x, z, 0.5)) lamp(x, z); });
    if (SITES.fountain) glow.emit({ x: SITES.fountain.x, y: groundAt(SITES.fountain.x, SITES.fountain.z) + 2.0, z: SITES.fountain.z, kind: 'crystal', power: 1.2 });   // 噴泉渾天儀中心的藍水晶
  }
  const sh = PS.shop; put('PROPMODELS', 'crates', [[sh.x - 2.6, sh.z + 1.2, 0.3], [sh.x + 2.6, sh.z + 1.0, -0.3]], 0.75);
  const pr = PLAN.sites.pier; put('PROPMODELS', 'crates', [[pr.x + 2.6, pr.z - pr.d / 2 - 1.2, 0.5], [pr.x - 2.6, pr.z - pr.d / 2 - 1.2, -0.5]], 0.75);
}
/** 參考場景圖的「擺滿」：主街兩側的花壇、每戶門口的盆花、學院台地邊緣的樹籬、廣場大樹的石座花圈（propmodels3，有模型才擺） */
function dressing() {
  const has = k => !!((window.TA.ISLE || {}).PROPMODELS || {})[k];
  const free = (x, z, r) => { const t = tileAt(x, z); return (t === 1 || t === 2) && !blocked(x, z, r) && !onRoad(x, z) && !isBridgeAt(x, z); };
  if (has('flower_bed')) PLAN.roads.filter(r => /Main Street|Academy Promenade|Residential Lane|Town Lane|Housing Lane|Lighthouse Walk|Garden Lane/.test(r.name)).forEach(r => {   // 花壇沿著路排：長邊和路平行（主街、學院步道、住宅區的小路）
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      const gap = /Main Street|Academy/.test(r.name) ? 4.6 : 7.5;
      for (let s2 = 2.2; s2 < L - 1.4; s2 += gap) [-1, 1].forEach(sd => {
        const off = r.w / 2 + 1.3, [x, z] = warp(a[0] + ux * s2 - uz * sd * off, a[1] + uz * s2 + ux * sd * off), ex = ux * 0.8, ez = uz * 0.8;   // 在水晶地燈那一排的外側
        if (!free(x, z, 0.35) || !free(x + ex, z + ez, 0.3) || !free(x - ex, z - ez, 0.3)) return;
        if (instanced('PROPMODELS', 'flower_bed', x, z, Math.atan2(-uz, ux))) { colliders.push({ x: x + ex, z: z + ez, r: 0.45 }, { x: x - ex, z: z - ez, r: 0.45 }); flowerSpots.push([x, z]); }
      });
    }
  });
  if (has('flower_pots')) {   // 門口的盆花：台階兩旁挑一邊（或兩邊）
    const doors = homes.map(h => h.door).concat(['shop', 'museum', 'exam', 'library'].map(k => SITES[k] && (SITES[k].door || SITES[k].front)).filter(Boolean));
    doors.forEach(([dx, dz], i) => [-1, 1].forEach(sd => {
      if (i % 3 === 2 && sd > 0) return;
      const x = dx + sd * 1.55, z = dz - 0.3; if (!free(x, z, 0.28)) return;   // 台階兩旁（房子的碰撞框到門口前 0.85 公尺）
      if (instanced('PROPMODELS', 'flower_pots', x, z, sd * 0.35)) { colliders.push({ x, z, r: 0.38 }); flowerSpots.push([x, z]); }
    }));
  }
  if (has('hedge')) {   // 學院台地的南緣（白石擋土牆的頂上）一排樹籬，中間留階梯的缺口
    const pl = PLAN.plateaus.find(o => /Academy/.test(o.name)), st = STAIRS.find(o => /Academy Main/.test(o.name));
    if (pl) {
      const zEdge = Math.max(...pl.poly.map(q => q[1])) - 0.75, x0 = Math.min(...pl.poly.map(q => q[0])) + 1, x1 = Math.max(...pl.poly.map(q => q[0])) - 1;
      for (let x = x0 + 1; x <= x1 - 1; x += 2) {
        if (st && Math.abs(x - st.a[0]) < st.w / 2 + 1.6) continue;
        const [wx, wz] = warp(x, zEdge); if (tileAt(wx, wz) !== 2 || blocked(wx, wz, 0.35) || onRoad(wx, wz)) continue;
        if (instanced('PROPMODELS', 'hedge', wx, wz, 0)) [-0.55, 0.55].forEach(o => colliders.push({ x: wx + o, z: wz, r: 0.35 }));
      }
    }
  }
}
/** 廣場大樹的石座花圈：可以坐的白石圓座（座面 0.45），四個方向各一個座位，面向外 */
function treeRing(x, z) {
  const m = modelClone('PROPMODELS', 'tree_ring'); if (!m) return;
  const g = placed(x, z); g.add(m); mergeStatic(g); scene.add(g); register(g);
  colliders.push({ x, z, r: 1.6 });
  // v8.7 座位往外移、降到石面高度：以前坐在 1.25m，小腿後側卡進石緣前緣（外緣約 1.57m），人也浮在石面上約 0.1m
  const y = groundAt(x, z); [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + Math.PI / 4; seats.push({ x: x + Math.sin(a) * 1.38, z: z + Math.cos(a) * 1.38, ry: a, h: y + 0.4, n: 1 }); });
}
/** 廣場的石板地：以廣場中心為圓心，一圈圈同心圓的石板（中央一枚星徽），外緣參差地融進草地 */
function plazaPaving() {
  const R = 6.6, cx = SITES.plaza.x, cz = SITES.plaza.z;
  scene.add(plazaModel(cx, cz, groundAt));
  // 保留原來的廣場草遮罩、中心、半徑與高度；沒有碰撞變動。
  for (let x = -R; x <= R; x += 0.4) for (let z = -R; z <= R; z += 0.4) if (Math.hypot(x, z) < R - 0.4) ROAD.add(roadKey(cx + x, cz + z));
}
/** 水邊的石頭：小溪兩岸、池塘一圈、大河兩岸每隔一段一顆圓潤的石頭（參考插畫的溪岸與池畔），踏石、橋、路那幾段空著。
    全部合併成一個網格（原本每顆石頭各畫一次） */
function rimStones() {
  const mat = M('#ddd3c2', { vertexColors: true }, 'stone'), geos = [0, 1, 2, 3].map(() => rockGeo(0.32, 2)), g = new THREE.Group();
  const stone = (x, z, k, sink) => { if (isBridgeAt(x, z) || onRoad(x, z) || blocked(x, z, 0.3)) return; const m = mesh(geos[Math.floor(rnd() * 4)], mat, x, groundAt(x, z) - sink, z); m.scale.set(k * 1.3, k * 0.75, k); m.rotation.y = rnd() * 6.28; g.add(m); STEP_STONES.push({ x, z, r: 0.35 * k }); };
  const along = (P, w, gap, closed) => {
    for (let i = 0; i < P.length - (closed ? 0 : 1); i++) {
      const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let s2 = 0.4; s2 < L; s2 += gap + rnd() * gap * 0.5) [-1, 1].forEach(sd => {
        if (closed && sd < 0) return;   // 池塘：只放外圈（多邊形是順時針，sd = 1 是外側；放錯邊會在水裡，下面 tileAt 會擋掉）
        const off = w / 2 + 0.38 + rnd() * 0.15, [x, z] = warp(a[0] + ux * s2 - uz * sd * off, a[1] + uz * s2 + ux * sd * off), t = tileAt(x, z);
        if (t === 1 || t === 2) stone(x, z, 0.8 + rnd() * 0.6, 0.06);
      });
    }
  };
  PLAN.streams.forEach(st => along(st.path, st.w, 1.05, false));
  PLAN.rivers.forEach(r => along(r.path, r.w, 2.4, false));
  PLAN.ponds.forEach(pd => { along(pd.poly, 0, 0.9, true); along(pd.poly.slice().reverse(), 0, 0.9, true); });   // 繞向不確定：兩個方向都放，落在水裡的會被擋掉
  mergeStatic(g); scene.add(g);
}
/** 小溪上的踏石：規劃的踏石路經過水面的地方，鋪一排半泡在水裡的大塊踏石 */
function fordStones() {
  const geos = [0, 1, 2].map(k => stepGeo(k + 7)), mat = M('#d8cdb4', {}, 'stone');
  PLAN.roads.filter(r => r.kind === 'stepping-stones').forEach(r => {
    const a = r.path[0], b = r.path[r.path.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L / 0.72);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, px = a[0] + (b[0] - a[0]) * t + Math.sin(t * 5.3) * 0.25, pz = a[1] + (b[1] - a[1]) * t, [x, z] = warp(px, pz);
      const tt = tileAt(x, z); if (tt !== 3) { if (tt >= 0 && Math.hypot(x - SITES.plaza.x, z - SITES.plaza.z) > 6.9) { const m = mesh(stepGeo(k), M('#e8dcc0', {}, 'stone'), x, groundAt(x, z) - 0.02, z, { noCast: true }); m.scale.set(1.3, 1.3, 1.2); m.rotation.y = rnd() * 6.28; scene.add(m); STEP_STONES.push({ x, z, r: 0.42 }); } continue; }
      const m = mesh(geos[k % 3], mat, x, FORD_Y - 0.1, z); m.scale.set(1.35 + rnd() * 0.2, 1.6, 1.15 + rnd() * 0.2); m.rotation.y = rnd() * 6.28; scene.add(m);
    }
  });
}
const polyArea = P => Math.abs(P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
function inPolyPt(x, z, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const bbox = P => [Math.min(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[0])), Math.max(...P.map(p => p[1]))];
/** 點到所有路的中線還有多遠（扣掉半寬）；規劃座標 */
const roadGap = (x, z) => { let d = 1e9; for (const r of PLAN.roads) for (let i = 0; i < r.path.length - 1; i++) { const a = r.path[i], b = r.path[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) - r.w / 2); } return d; };

const PS = PLAN.sites, HOME_WHO = { Moyan: '墨言', Lexi: 'Lexi', Xian: '弦', Lan: '嵐', Heng: '衡', Rayne: '雷恩', Jingjing: '晶晶', Sen: '森', Yue: '岳' };
/* v7.6：每一戶自己的夢幻風房子（data/homes3d_<科目>.js 的 BLDMODELS['home_<科目>']，各依主人的個性設計）；還沒有的沿用舊小屋 */
const HOME_OF = { Moyan: 'chinese', Lexi: 'english', Xian: 'math', Lan: 'geography', Heng: 'civics', Rayne: 'physics', Jingjing: 'chemistry', Sen: 'biology', Yue: 'earth' };
const homeModel = (k, old) => (((window.TA.ISLE || {}).BLDMODELS || {})['home_' + k] ? 'home_' + k : old);
const ROOFS = ['#3e5a8c', '#4f6fb8', '#bf665d', '#36507e', '#5b7fbf', '#5f8a4a', '#44619c', '#3a5585', '#b85a52', '#4a6aa8'];   // 參考插畫的石板藍為主，夾幾戶磚紅、苔綠
const W = (o) => warp(o.x, o.z);
{
  const [hx, hz] = W(PS.player_home); homes.push(Object.assign(house(hx, hz, '#cf5c4e', null, 1, homeModel('player', 'player_home')), { owner: 'player' }));
  const spare = [];
  PLAN.homes.forEach(h => {
    const [x, z] = W(h);
    if (!HOME_WHO[h.who]) { spare.push([x, z]); return; }   // 史遙住在博物館前：規劃給她的那一格當空地
    const i = homes.length - 1; homes.push(Object.assign(house(x, z, ROOFS[i % ROOFS.length], '#f1e6d2', 0.82, homeModel(HOME_OF[h.who], h.who === 'Yue' ? 'earth_home' : HOUSE_MODELS[i % HOUSE_MODELS.length])), { who: HOME_WHO[h.who] }));
  });
  PLAN.plots.forEach(p => { const [x, z] = W(p); makePlot(x, z); });
  spare.forEach(([x, z]) => makePlot(x, z));
}
{ const [x, z] = W(PS.museum); museum(x, z); }
{ const [x, z] = W(PS.shop); shop(x, z); }
{ const [x, z] = W(PS.lighthouse); lighthouse(x, z); }
{ const [x, z] = W(PS.exam); examHall(x, z); }
{ const [x, z] = W(PS.library); libraryHall(x, z); }
{ const [x, z] = W(PS.telescope); telescope(x, z); }
{ const [x, z] = W(PS.board); board(x, z); }
{ const [x, z] = W(PS.camp); camp(x, z); }
{ const [x, z] = W(PS.gate); gate(x, z); }
waterwheel(WATERWHEEL.x, WATERWHEEL.z);
['hotel', 'diy', 'plaza', 'shrine'].forEach(k => { const [x, z] = W(PS[k]); SITES[k] = { x, z, w: PS[k].w, d: PS[k].d }; });   // 飯店、工作台由各自的模組蓋
pier();
PLAN.landmarks.forEach(l => {
  const [x, z] = warp(l.x, l.z);
  if (l.kind === 'great-tree') { tree(x, z, 1.6, 'pink').userData.prop.hero = true; treeRing(x, z); }   // 廣場的大樹：模型的樹幹枝椏＋細碎葉片堆成的樹冠（props3d.js）
  else if (l.kind === 'fountain') fountain(x, z);
  else if (l.kind === 'market') stall(x, z);
  else if (l.kind === 'aqueduct') aqueduct(x, z, l.rot, l.size);
  else if (l.kind === 'seaplane') SITES.seaplane = { x, z };
});
BRIDGES.forEach(bridgeModel);
STAIRS.forEach(stairModel);
roads(); fordStones(); plazaPaving(); rimStones(); decorations(); dressing();
PLAN.props.lamps.forEach(([x, z]) => { const [wx, wz] = warp(x, z); lamp(wx, wz); });
PLAN.props.banners.forEach(([x, z, r]) => { const [wx, wz] = warp(x, z); banner(wx, wz, r); });
PLAN.props.benches.forEach(([x, z, r]) => { const [wx, wz] = warp(x, z); bench(wx, wz, r * Math.PI / 180); });
PLAN.props.planters.forEach(([x, z]) => { const [wx, wz] = warp(x, z); planter(wx, wz); });
flushInstances();
seats.push({ x: PIER.x, z: PIER.z + PIER.len - 0.45, ry: 0, h: null, n: 2, edge: true });   // 碼頭盡頭：坐在邊上，腳懸在海面上

// 樹、灌木、岩石：規劃指定的樹與樹林，再在草地、沙灘上零星補一些（避開路、建築、廣場與住家的院子）
const TREE_KIND = { pine: 'cedar', orange: 'round', broadleaf: 'round', blossom: 'pink', palm: 'palm' };
PLAN.props.trees.forEach(([k, x, z]) => { if (!TREE_KIND[k]) return; const [wx, wz] = warp(x, z); if (!blocked(wx, wz, 0.6)) tree(wx, wz, 0.95 + rnd() * 0.25, TREE_KIND[k]); });
PLAN.props.forests.forEach(f => {
  if (!TREE_KIND[f.kind]) return;   // 竹林由 highland.js 種
  const [x0, z0, x1, z1] = bbox(f.poly), n = Math.round(polyArea(f.poly) * f.density);
  for (let k = 0, made = 0; k < n * 8 && made < n; k++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (!inPolyPt(x, z, f.poly)) continue;
    const [wx, wz] = warp(x, z); if (blocked(wx, wz, 1.0)) continue;
    tree(wx, wz, 0.85 + rnd() * 0.35, TREE_KIND[f.kind]); made++;
  }
});
const yard = (x, z) => homes.some(h => Math.hypot(h.x - x, h.z - z) < (h.owner === 'player' ? 7 : 3.8) || Math.hypot(h.door[0] - x, h.door[1] - z) < 2.4) || plots.some(p => Math.hypot(p.x - x, p.z - z) < 4.4);   // 玩家的院子留大一點（擺設計用）
const plazaArea = (x, z) => Math.abs(x - SITES.plaza.x) < SITES.plaza.w / 2 + 1 && Math.abs(z - SITES.plaza.z) < SITES.plaza.d / 2 + 1;
const busy = (x, z, m) => roadGap(x, z) < m || plazaArea(x, z) || yard(x, z) || Object.values(SITES).some(s => s && s.x != null && Math.hypot(s.x - x, s.z - z) < 4.5);
const treeNear = (x, z, d) => trees.some(t => Math.hypot(t.x - x, t.z - z) < d);
const siteNear = (x, z, d) => Object.values(SITES).some(s => s && s.x != null && Math.hypot(s.x - x, s.z - z) < d);
for (let k = 0; k < 2600; k++) {
  const px = (rnd() - 0.5) * 88, pz = (rnd() - 0.5) * 88, [x, z] = warp(px, pz), t = tileAt(x, z), r = rnd();
  if (t < 0 || t === 3 || t === 6 || busy(px, pz, 1.2) || blocked(x, z, 1.3)) continue;
  const open = roadGap(px, pz) > 2.8 && !siteNear(x, z, 7.5);   // 樹離路與建築遠一點：沿路走時，鏡頭與建築正面不會被樹冠擋住
  if (t === 1 && r < 0.09 && open && !treeNear(x, z, 4.2)) tree(x, z, 0.9 + rnd() * 0.3, rnd() < 0.22 ? 'pink' : 'round');   // 草地上的樹散開種：不擠成一片樹叢擋住鏡頭
  else if ((t === 2 || t === 5) && r < 0.05 && open) tree(x, z, 0.9 + rnd() * 0.3, x < -16 ? 'cedar' : 'round');
  else if (t === 0 && r < 0.045 && riverDist(px, pz) > 2.5) tree(x, z, 1, 'palm');
  else if ((t === 1 || t === 2) && r < 0.06) bush(x, z);
  else if ((t === 0 || t === 2 || t === 5) && r < 0.075) rock(x, z, 0.6 + rnd() * 0.5);
}
/** 野花的幾何（莖帶兩片葉、五瓣花冠、花心）；主島的花叢與神秘島的花都用這一份 */
let FLOWER_GEOS = null;
export function flowerGeos() {
  if (FLOWER_GEOS) return FLOWER_GEOS;
  const merge = parts => { const P = [], Nn = []; parts.forEach(g => { const gi = g.index ? g.toNonIndexed() : g; P.push(...gi.attributes.position.array); Nn.push(...gi.attributes.normal.array); }); const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return o; };
  // 標準72 tris／朵（原176），三階花高共用幾何；花瓣有弧度、葉片折成淺V。
  if (ULTRA) {
    const flat = (r, n, y) => new THREE.CircleGeometry(r, n).rotateX(-Math.PI / 2).translate(0, y, 0);
    return (FLOWER_GEOS = { stemG: merge([new THREE.CylinderGeometry(0.008, 0.012, 0.26, 3, 1, true).translate(0, 0.13, 0)]), headG: merge([flat(0.095, 5, 0).rotateX(-0.25).translate(0, 0.27, 0)]), coreG: merge([flat(0.03, 4, 0.29)]) });
  }
  const leaf = (sign, y) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0,y,0, sign*.035,y+.02,-.023,sign*.085,y+.035,0, 0,y,0,sign*.085,y+.035,0,sign*.035,y+.02,.023],3));g.computeVertexNormals();return g; };
  const stemG = merge([new THREE.CylinderGeometry(0.006, 0.009, 0.26, 4, 1, true).translate(0, 0.13, 0), leaf(1, .07), leaf(-1, .13)]);
  const petals = []; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; petals.push(new THREE.SphereGeometry(0.045, 5, 2).scale(1.12, 0.32, 0.72).translate(0.05, 0, 0).rotateY(a)); }
  const headG = merge(petals).rotateX(-0.25).translate(0, 0.27, 0), coreG = new THREE.SphereGeometry(0.026, 5, 2).scale(1, 0.6, 1).translate(0, 0.285, 0);
  return (FLOWER_GEOS = { stemG, headG, coreG });
}
/** 莖、花冠、花心合成一個幾何（v7.3：一塊野花原本三個 InstancedMesh，現在一個）：顏色烘進頂點色，aTint 標出要染上每朵花顏色的花瓣 */
function flowerOne() {
  const { stemG, headG, coreG } = flowerGeos(), P = [], N = [], C = [], T = [];
  [[stemG, '#7f9e72', 0], [headG, '#ffffff', 1], [coreG, '#e8c48b', 0]].forEach(([g0, hex, tint]) => {
    const g = g0.index ? g0.toNonIndexed() : g0, c = new THREE.Color(hex), n = g.attributes.position.count;
    P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array);
    for (let i = 0; i < n; i++) { C.push(c.r, c.g, c.b); T.push(tint); }
  });
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  o.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); o.setAttribute('aTint', new THREE.Float32BufferAttribute(T, 1));
  return o;
}
/* 野花按16m分塊，一材質、一朵72 tris；5–9株一叢，保留原花色與flowerSpots。 */
{
  const oneG = flowerOne(), FC = 16, TOTAL = 6000, SPARE = 120;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: THREE.DoubleSide }); mat.defines = { TA_FLOWERTINT: '' }; bend(mat, 'flower');
  const chunks = new Map(); let total = 0, gardenSeed = 7741;
  const R = () => { gardenSeed = (gardenSeed * 16807) % 2147483647; return (gardenSeed - 1) / 2147483646; };
  let FS = 'autumn'; try { FS = seasonNow(); } catch (e) { FS = seasonAuto(); }
  const SEASON_FP = {
    spring: { pal: ['#fff3e6', '#fff3e6', '#f4a8c8', '#f4a8c8', '#b9a2e6', '#f0d48a'], BC: ['#f4a8c8', '#fff3e6', '#b9a2e6', '#fff3e6', '#f4a8c8'], FIELD: [['#f4a8c8', '#fff3e6'], ['#b9a2e6', '#fff3e6'], ['#f4a8c8', '#b9a2e6'], ['#fff3e6', '#f0d48a']] },
    summer: { pal: ['#ffffff', '#ffffff', '#a9c8f0', '#b9a2e6', '#b9a2e6', '#f4a8c8'], BC: ['#a9c8f0', '#ffffff', '#b9a2e6', '#ffffff', '#f4a8c8'], FIELD: [['#a9c8f0', '#ffffff'], ['#b9a2e6', '#ffffff'], ['#ffffff', '#f4a8c8'], ['#cfe6f4', '#b9a2e6']] },
    autumn: { pal: ['#fbefdc', '#fbefdc', '#b9a2e6', '#b9a2e6', '#d48fae', '#eec67a'], BC: ['#b9a2e6', '#fbefdc', '#d48fae', '#fbefdc', '#eec67a'], FIELD: [['#b9a2e6', '#fbefdc'], ['#d48fae', '#fbefdc'], ['#eec67a', '#fbefdc'], ['#b9a2e6', '#d48fae']] },
    winter: { pal: ['#fbf4ea', '#fbf4ea', '#c8d4f0', '#c8d4f0', '#d8cdee', '#ffffff'], BC: ['#c8d4f0', '#fbf4ea', '#d8cdee', '#ffffff', '#c8d4f0'], FIELD: [['#e8eef8', '#ffffff'], ['#c8d4f0', '#ffffff'], ['#d8cdee', '#ffffff'], ['#ffffff', '#f2e6d2']] }
  };

  // 沿用原配置器的抽樣預算：高地仍共用rnd，改花不能連帶搬動樹、岩石與碰撞。
  // 此通過只推進舊亂數串流，沒有建立網格；實際花群用下方獨立R配置。
  (() => {
    const FP = SEASON_FP[FS] || SEASON_FP.autumn, oldSpots = flowerSpots.length, oldStones = STEP_STONES.length;
    let total = 0;
    const put = (x, z, c, size, tall, sample = rnd) => { if (total >= TOTAL) return; sample(); sample(); sample(); total++; };
  const pal = FP.pal || ['#ffffff', '#ff8fb1', '#ffd23f', '#b38bff', '#ff7a5a', '#6c8dff'];
  // 主要步道兩側的花帶：每隔一步一小叢（參考圖的路邊都是藍、白、黃的小花）
  const BORDER = /Main Street|Academy|Observatory|East Stair|Lighthouse Walk|South Meadow/, BC = FP.BC || ['#6c8dff', '#ffffff', '#ffd23f', '#ffffff', '#b38bff'];
  PLAN.roads.filter(r => BORDER.test(r.name)).forEach(r => {
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let s2 = 0.6; s2 < L; s2 += 1.25 + rnd() * 0.4) [-1, 1].forEach(sd => {
        const off = r.w / 2 + 0.45 + rnd() * 0.25, px = a[0] + ux * s2 - uz * sd * off, pz = a[1] + uz * s2 + ux * sd * off, [x, z] = warp(px, pz), t = tileAt(x, z);
        if ((t !== 1 && t !== 2) || onRoad(x, z) || blocked(x, z, 0.3) || roadGap(px, pz) < 0.25) return;
        const c = BC[Math.floor(rnd() * BC.length)]; for (let j = 0; j < 3; j++) put(x + (rnd() - 0.5) * 0.45, z + (rnd() - 0.5) * 0.45, j ? c : BC[Math.floor(rnd() * BC.length)], 1.3 + rnd() * 0.35, rnd() < 0.35);   // 比野花大一號：高過草叢，從鏡頭看得到一路的花
        flowerSpots.push([x, z]); STEP_STONES.push({ x, z, r: 0.4 });   // 花叢周圍的草清掉一圈、旁邊的草矮一點：花從草裡露出來
      });
    }
  });
  // 規劃的花田：一片片以一兩種顏色為主的花海（參考插畫的藍、白、黃、淡紫）
  const FIELD = FP.FIELD || [['#6c8dff', '#ffffff'], ['#ffd23f', '#ffffff'], ['#b38bff', '#ff8fb1'], ['#ffffff', '#ffd23f']];
  PLAN.props.flowers.forEach((f, fi) => {
    const [x0, z0, x1, z1] = bbox(f.poly), want = Math.min(420, Math.round(polyArea(f.poly) * 3.2)), cs = FIELD[fi % FIELD.length];
    for (let k = 0, made = 0; k < want * 4 && made < want; k++) {
      const px = x0 + rnd() * (x1 - x0), pz = z0 + rnd() * (z1 - z0); if (!inPolyPt(px, pz, f.poly)) continue;
      const [x, z] = warp(px, pz), t = tileAt(x, z); if ((t !== 1 && t !== 2) || blocked(x, z, 0.3) || roadGap(px, pz) < 0.3) continue;
      put(x, z, rnd() < 0.7 ? cs[0] : cs[1], 0.8 + rnd() * 0.35, rnd() < 0.2); flowerSpots.push([x, z]); made++;
    }
  });
  // 草地上零星的一叢叢野花
  for (let k = 0; k < 5000 && total < 4100; k++) {
    const px = (rnd() - 0.5) * 88, pz = (rnd() - 0.5) * 88, [cx, cz] = warp(px, pz), t = tileAt(cx, cz);
    if ((t !== 1 && t !== 2) || roadGap(px, pz) < 0.8 || plazaArea(px, pz) || blocked(cx, cz, 0.6)) continue;
    const c = pal[Math.floor(rnd() * pal.length)]; flowerSpots.push([cx, cz]);
    for (let j = 0; j < 6; j++) { const x = cx + (rnd() - 0.5) * 1.2, z = cz + (rnd() - 0.5) * 1.2; if (tileAt(x, z) !== t) continue; put(x, z, c, 0.85 + rnd() * 0.4, rnd() < 0.2); }
  }
  { // v7.4 低矮的花墊（Codex 第二輪 B2）：草地的邊上（路邊、沙岸、台地與水邊）一叢叢 5–9 株的小花，奶油白 60%、淡紫 25%、柔黃 15%，
    // 比野花矮（約 0.12–0.2 公尺），中間的草清掉一圈才看得到。用自己的亂數，其他東西的位置不變
    let s2 = 7741; const R = () => { s2 = (s2 * 16807) % 2147483647; return (s2 - 1) / 2147483646; };
    const LOW = FS === 'spring' ? ['#f5ebdf', '#f5ebdf', '#f5ebdf', '#f5ebdf', '#edb5cf', '#edb5cf', '#edb5cf', '#edb5cf', '#b8a4da', '#b8a4da', '#b8a4da', '#e6cc8e'] : ['#f0e6cb', '#f0e6cb', '#f0e6cb', '#f0e6cb', '#f0e6cb', '#f0e6cb', '#f0e6cb', '#ada2c2', '#ada2c2', '#ada2c2', '#d8bf72', '#d8bf72'];   // 春天的低花墊多一點粉
    const edgy = (x, z, t) => [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]].some(([dx, dz]) => tileAt(x + dx, z + dz) !== t);
    for (let k = 0, made = 0; k < 9000 && made < 150; k++) {
      const px = (R() - 0.5) * 88, pz = (R() - 0.5) * 88, [cx, cz] = warp(px, pz), t = tileAt(cx, cz);
      if ((t !== 1 && t !== 2) || plazaArea(px, pz) || blocked(cx, cz, 0.5) || onRoad(cx, cz)) continue;
      const gap = roadGap(px, pz); if (gap < 0.45 || (gap > 1.4 && !edgy(cx, cz, t))) continue;   // 只在邊上：路邊 0.45–1.4 公尺，或旁邊就是沙灘、水、台地邊
      if (flowerSpots.some(([fx, fz]) => Math.abs(fx - cx) < 1.1 && Math.abs(fz - cz) < 1.1)) continue;
      const c = LOW[Math.floor(R() * LOW.length)], n = 6 + Math.floor(R() * 6), rad = 0.16 + R() * 0.18;
      for (let j = 0; j < n; j++) { const a = R() * 6.28, d = Math.sqrt(R()) * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (tileAt(x, z) !== t || onRoad(x, z)) continue; put(x, z, R() < 0.82 ? c : LOW[Math.floor(R() * LOW.length)], 0.44 + R() * 0.24, false, R); }
      flowerSpots.push([cx, cz]); STEP_STONES.push({ x: cx, z: cz, r: rad + 0.12 }); made++;
    }
  }

    flowerSpots.length = oldSpots; STEP_STONES.length = oldStones;
  })();
  const tint = (token, season = FS) => {
    if (typeof token === 'string') return token; // wildFlowers(x,z,color)沿用外部指定色。
    const fp = SEASON_FP[season] || SEASON_FP.autumn, v = fp[token[0]][token[1]];
    return Array.isArray(v) ? v[token[2]] : v;
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const chunkOf = (x, z) => { const k = Math.floor(x / FC) + ',' + Math.floor(z / FC); let c = chunks.get(k); if (!c) chunks.set(k, c = { x: (Math.floor(x / FC) + 0.5) * FC, z: (Math.floor(z / FC) + 0.5) * FC, mats: [], cols: [], tints: [], im: null, cap: 0 }); return c; };
  const build = (c, cap) => {
    c.cap = cap; const g = new THREE.Group(); g.name = 'w04-flower-chunk';
    const im = new THREE.InstancedMesh(oneG, mat, cap); im.name = 'w04-flowers'; im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false; im.count = 0; g.add(im); c.im = im;
    c.n = 0; scene.add(g); let lo = 1e9, hi = -1e9;
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) { const gy = groundAt(c.x + (i - 1) * FC * 0.5, c.z + (j - 1) * FC * 0.5); lo = Math.min(lo, gy); hi = Math.max(hi, gy); }
    registerAt(g, c.x, (lo + hi) / 2 + 0.3, c.z, FC * 0.75 + 0.5, null, (hi - lo) / 2 + 0.8);
  };
  const write = (c, m, token) => { const i = c.n++, im = c.im; c.tints[i] = token; im.setMatrixAt(i, m); im.count = c.n; im.instanceMatrix.needsUpdate = true; im.setColorAt(i, col.set(tint(token))); im.instanceColor.needsUpdate = true; };
  const matrix = (x, z, size, level = 1) => m4.compose(v.set(x, groundAt(x, z), z), q.setFromEuler(e.set((R() - 0.5) * 0.08, R() * Math.PI * 2, (R() - 0.5) * 0.08)), sc.set(size, [0.4, 0.8, 1.2][level], size));
  const safe = (x, z, pad = 0.13) => {
    const t = tileAt(x, z); return (t === 1 || t === 2) && !onRoad(x, z) && !blocked(x, z, pad) && !homeKeepout(x, z, pad) && !isBridgeAt(x, z) && Math.hypot(x - PLAZA[0], z - PLAZA[1]) > 6.72;
  };
  const put = (x, z, token, size, level) => { if (total >= TOTAL || !safe(x, z)) return false; const ch = chunkOf(x, z); ch.mats.push(matrix(x, z, size, level).clone()); ch.cols.push(token); total++; return true; };
  const clusters = [];
  const cluster = (cx, cz, token, radius = 0.4) => {
    if (!safe(cx, cz, 0.2) || clusters.some(p => Math.hypot(p[0] - cx, p[1] - cz) < radius + 0.48)) return;
    const n = 5 + Math.floor(R() * 5), added = new Map(); let made = 0;
    for (let j = 0; j < n; j++) {
      const a = j * 2.39996 + R() * 0.3, d = Math.sqrt((j + 0.5) / n) * radius;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, level = j < 2 ? 2 : j < 5 ? 1 : 0;
      if (put(x, z, j % 4 ? token : ['pal', 0], 1.03 + R() * 0.25, level)) { const ch = chunkOf(x, z); if (!added.has(ch)) added.set(ch, ch.mats.length - 1); made++; }
    }
    if (made < 5) { added.forEach((n, c) => { c.mats.length = c.cols.length = n; }); total -= made; return; }
    if (made) { clusters.push([cx, cz]); flowerSpots.push([cx, cz]); STEP_STONES.push({ x: cx, z: cz, r: radius + 0.1 }); }
  };
  // 主路、住宅巷與廣場外緣：每叢前後留0.4–1m的呼吸空間，兩側不鏡像。
  PLAN.roads.filter(r => r.kind === 'stone').forEach(r => {
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let s = 0.5 + R(); s < L; s += 1.65 + R() * 0.45) [-1, 1].forEach(side => {
        const off = r.w / 2 + 0.65 + R() * 0.22, px = a[0] + ux * s - uz * side * off, pz = a[1] + uz * s + ux * side * off;
        if (roadGap(px, pz) < 0.48) return; const [x, z] = warp(px, pz); cluster(x, z, ['BC', Math.floor(R() * 5)], 0.36 + R() * 0.08);
      });
    }
  });
  // 屋前側花床，保持door→主路的通道；屋簷、台階、模型步道都在homeKeepout內。
  homes.forEach(h => {
    const box = new THREE.Box3().setFromObject(h.g);
    for (let side of [-1, 1]) for (let j = 0; j < 6; j++) {
      const x = side < 0 ? box.min.x - 0.55 : box.max.x + 0.55, z = box.min.z + (box.max.z - box.min.z) * (j + 0.5) / 6;
      cluster(x, z, ['pal', (j + (side > 0 ? 2 : 0)) % 6]);
    }
  });
  // 樹下弧形花島，幹根半徑與碰撞照舊，花叢不繞成完整甜甜圈。
  trees.filter(t => t.kind !== 'cedar' && t.kind !== 'palm').forEach((t, i) => {
    if (i % 2) return;
    for (let j = 0; j < 3; j++) { const a = i * 1.7 + j * 0.95, d = 1.0 + R() * 0.4; cluster(t.x + Math.cos(a) * d, t.z + Math.sin(a) * d, ['pal', i % 6], 0.38); }
  });
  // 規劃花地以同色花島組成，群間留草，而不是均勻隨機撒點。
  PLAN.props.flowers.forEach((f, fi) => {
    const [x0, z0, x1, z1] = bbox(f.poly), want = Math.min(45, Math.round(polyArea(f.poly) * 0.9)); let made = 0;
    for (let k = 0; k < want * 18 && made < want; k++) {
      const px = x0 + R() * (x1 - x0), pz = z0 + R() * (z1 - z0); if (!inPolyPt(px, pz, f.poly) || roadGap(px, pz) < 0.55) continue;
      const [x, z] = warp(px, pz), n = total; cluster(x, z, ['FIELD', fi % 4, R() < 0.8 ? 0 : 1], 0.4); if (total > n) made++;
    }
  });
  // 廣場外三小片苔花，打斷整圈邊線；不進入原有廣場半徑。
  [0.45, 2.5, 4.55].forEach((a, i) => cluster(PLAZA[0] + Math.cos(a) * 7.15, PLAZA[1] + Math.sin(a) * 7.15, ['pal', i % 6], 0.32));
  // 剩餘花量集中邊緣：保留草地留白，優先沿路邊，少量落在林下。
  for (let k = 0; k < 14000 && total < 5350; k++) {
    const px = (R() - 0.5) * 86, pz = (R() - 0.5) * 86, gap = roadGap(px, pz);
    if (gap < 0.6 || gap > 3.5 || plazaArea(px, pz)) continue;
    const [x, z] = warp(px, pz); cluster(x, z, ['pal', Math.floor(R() * 6)], 0.34 + R() * 0.1);
  }
  chunks.forEach(c => { build(c, c.mats.length + SPARE); c.mats.forEach((m, i) => write(c, m, c.cols[i])); c.mats = c.cols = null; });
  // 設定頁即時換季時也更新instanceColor；保留FP四季色盤與aTint，不必重建幾何。
  mat.onBeforeRender = () => {
    const now = seasonNow(); if (now === FS || !SEASON_FP[now]) return; FS = now;
    chunks.forEach(c => { if (!c.im) return; for (let i = 0; i < c.n; i++) c.im.setColorAt(i, col.set(tint(c.tints[i]))); c.im.instanceColor.needsUpdate = true; });
  };
  wildFlowers = (x, z, color) => {
    rnd(); rnd(); rnd(); rnd(); // 原版補種的size與三個轉角抽樣，保持後續景物的亂數串流。
    if (total >= TOTAL || !safe(x, z)) return; const ch = chunkOf(x, z); if (!ch.im) build(ch, SPARE * 2); if (ch.n >= ch.cap) return;
    write(ch, matrix(x, z, 0.9 + R() * 0.2, 1), color); total++; flowerSpots.push([x, z]);
  };
}
/** v6.78 以前：溪畔那一棟島民的家挪到構圖較好的位置。新島照規劃擺好了，不用挪 */
export function nudgeHome() { return false; }
