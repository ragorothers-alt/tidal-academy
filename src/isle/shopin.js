/* 潮汐小島 · 潮汐商店室內：從店門口走進 9×7 公尺的小店。左邊是今日家具的實物展示台（附價格牌）、
   後牆中央是櫃台（店長站在後面）、右牆是服裝人台與種子架、門邊是收購箱。
   做法照 museum.js：進門時現建一個獨立場景、出門釋放這次建的幾何與專屬材質。 */
import * as THREE from 'three';
import { camera, M, mesh, U, CURVE, scene as mainScene } from './engine.js';
import { animate } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as post from './post.js';
import { S, I, dayKey } from './state.js';
import { buildFurniture, thumb, patternTex } from './room.js';
import { ULTRA } from './perf.js';

const W = 9, D = 7, HW = W / 2, HD = D / 2, WALL_H = 3.2, DOOR_HW = 0.95;   // DOOR_HW：門口的半寬（提示「往下走出商店」與真的走得出去是同一個範圍）
export let inside = false;
let P = null, KV = null, H = null, sc = null, savedCurve = 0;
let camPos = new THREE.Vector3(0, 8, HD + 8);
let COLS = [], SPOTS = [];
let NL = null, glassMat = null, stockDay = '', dayT = 0;   // NL：跟著時間調的燈；glassMat：店裡自己的窗玻璃（不改到島上共用的材質）；stockDay：進店那天（跨過午夜要換貨）
export function init(player, keeper, hooks) { P = player; KV = keeper; H = hooks; }

/* ---------- 共用貼圖（畫一次就快取，離店時不釋放） ---------- */
const TX = {};
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function canvasTex(key, w, h, draw, rep) {
  if (TX[key]) return TX[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return (TX[key] = t);
}
/** 暖色拼花木地板（照 museum 的畫法，色調再暖一點） */
const floorTex = () => canvasTex('shopfloor', 512, 512, (c, w, h) => {
  seed = 11; const rows = 14, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 150;
    while (x < w) {
      const len = 130 + rnd() * 130, v = 0.9 + rnd() * 0.1;
      c.fillStyle = `rgb(${196 * v | 0},${150 * v | 0},${100 * v | 0})`; c.fillRect(x, r * rh, len, rh);
      for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(110,70,36,${0.04 + rnd() * 0.04})`; c.fillRect(x, r * rh + rnd() * rh, len, 1 + rnd() * 1.5); }
      c.fillStyle = 'rgba(92,58,30,0.28)'; c.fillRect(x, r * rh, 2, rh);
      x += len;
    }
    c.fillStyle = 'rgba(92,58,30,0.3)'; c.fillRect(0, r * rh, w, 2);
  }
}, [W / 3.6, D / 3.6]);
/** 象牙白灰泥牆 */
const plasterTex = () => canvasTex('shopplaster', 256, 256, (c, w, h) => {
  seed = 5; c.fillStyle = '#f3ead8'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 800; i++) { const a = rnd() * 0.05; c.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(150,120,80,${a})`; const r = 2 + rnd() * 10; c.beginPath(); c.arc(rnd() * w, rnd() * h, r, 0, 6.283); c.fill(); }
}, [4, 1.4]);
/** 深藍護牆板：直條木板、每隔一段一格方框 */
const wainsTex = () => canvasTex('shopwains', 512, 128, (c, w, h) => {
  c.fillStyle = '#2f4a73'; c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(18,32,56,0.55)'; c.fillRect(x, 0, 2, h); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x + 2, 0, 2, h); }
  for (let x = 8; x < w; x += 128) { c.strokeStyle = 'rgba(212,171,89,0.5)'; c.lineWidth = 3; c.strokeRect(x, 18, 112, h - 36); }
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, h - 8, w, 8);
}, [W / 2.2, 1]);
/** 門口到櫃台的紅毯：金色滾邊、菱形花紋（呼應店外的紅白遮陽棚） */
const rugTex = () => canvasTex('shoprug', 192, 640, (c, w, h) => {
  c.fillStyle = '#b04a42'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(${y % 6 ? '255,225,205' : '60,12,10'},0.05)`; c.fillRect(0, y, w, 2); }
  c.fillStyle = '#d9a95a'; c.fillRect(0, 0, 13, h); c.fillRect(w - 13, 0, 13, h); c.fillRect(0, 0, w, 13); c.fillRect(0, h - 13, w, 13);
  c.strokeStyle = 'rgba(245,230,200,0.75)'; c.lineWidth = 3; c.strokeRect(24, 24, w - 48, h - 48);
  c.strokeStyle = 'rgba(232,196,120,0.65)';
  for (let y = 85; y < h - 50; y += 120) { c.beginPath(); c.moveTo(w / 2, y - 19); c.lineTo(w / 2 + 14, y); c.lineTo(w / 2, y + 19); c.lineTo(w / 2 - 14, y); c.closePath(); c.stroke(); c.fillStyle = 'rgba(232,196,120,0.5)'; c.fillRect(w / 2 - 3, y - 3, 6, 6); }
});
const bgTex = () => canvasTex('shopbg', 256, 256, (c, w, h) => { const g = c.createRadialGradient(128, 105, 10, 128, 128, 195); g.addColorStop(0, '#5d4836'); g.addColorStop(0.55, '#35281d'); g.addColorStop(1, '#181209'); c.fillStyle = g; c.fillRect(0, 0, w, h); });

/** 每次進店現畫的招牌（深藍底金框，左邊一枚金色彎月——呼應店門上的徽章）；離店時跟著材質一起釋放 */
function signMesh(lines, w, h, opt) {
  opt = opt || {};
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.max(64, Math.round(512 * h / w));
  const c = cv.getContext('2d'), cw = cv.width, ch = cv.height;
  c.fillStyle = opt.bg || '#263e63'; c.fillRect(0, 0, cw, ch);
  c.strokeStyle = '#d4ab59'; c.lineWidth = 8; c.strokeRect(8, 8, cw - 16, ch - 16);
  c.strokeStyle = 'rgba(212,171,89,0.45)'; c.lineWidth = 2; c.strokeRect(20, 20, cw - 40, ch - 40);
  if (opt.moon) {   // 彎月與星星
    c.save(); c.translate(58, ch / 2); c.fillStyle = '#e8c878';
    c.beginPath(); c.arc(0, 0, ch * 0.26, 0, 6.283); c.fill();
    c.fillStyle = opt.bg || '#263e63'; c.beginPath(); c.arc(ch * 0.11, -ch * 0.05, ch * 0.22, 0, 6.283); c.fill();
    c.fillStyle = '#e8c878'; c.beginPath();
    const sx = ch * 0.24, sy = -ch * 0.14, r = ch * 0.09;
    for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r, px = sx + Math.cos(a) * rr, py = sy - Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fill(); c.restore();
  }
  c.fillStyle = opt.fg || '#fff6e0'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const big = lines.length > 1 ? ch * 0.42 : ch * 0.5;
  c.font = `800 ${big}px "M PLUS Rounded 1c", system-ui, sans-serif`;
  const cx = opt.moon ? cw / 2 + 26 : cw / 2;
  c.fillText(lines[0], cx, lines.length > 1 ? ch * 0.34 : ch * 0.53);
  if (lines[1]) { c.font = `700 ${ch * 0.22}px "M PLUS Rounded 1c", system-ui, sans-serif`; c.fillStyle = '#f0d9a0'; c.fillText(lines[1], cx, ch * 0.72); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.material.userData.own = true; m.material.userData.ownMap = true;
  return m;
}

/** 家具價格牌：奶油色小立牌，買過之後會蓋上「已買 ×n」；回傳的 redraw 可以重畫（買完即時更新） */
function priceTag(f) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 144;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = n => {
    const c = cv.getContext('2d');
    c.fillStyle = '#fffaf0'; c.fillRect(0, 0, 256, 144);
    c.strokeStyle = '#d4ab59'; c.lineWidth = 8; c.strokeRect(5, 5, 246, 134);
    c.textAlign = 'center'; c.fillStyle = '#33405c';
    c.font = '800 33px "M PLUS Rounded 1c", system-ui, sans-serif';
    c.fillText(f.name, 128, 52);
    c.font = '800 30px "M PLUS Rounded 1c", system-ui, sans-serif'; c.fillStyle = '#a8742c';
    c.fillText(`🔔 ${f.price.toLocaleString()} 鈴錢`, 128, 100);
    if (n) { c.save(); c.translate(202, 34); c.rotate(-0.28); c.strokeStyle = '#c44b42'; c.lineWidth = 4; c.strokeRect(-46, -19, 92, 38); c.fillStyle = '#c44b42'; c.font = '800 25px "M PLUS Rounded 1c", system-ui, sans-serif'; c.fillText(`已買 ×${n}`, 0, 9); c.restore(); }
    tex.needsUpdate = true;
  };
  redraw(0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.325), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  m.material.userData.own = true; m.material.userData.ownMap = true;
  return { mesh: m, redraw };
}

const own = m => { m.userData.own = true; return m; };
const box = (s, parent, w, h, d, mat, x, y, z, o) => { const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, o || { noCast: true }); parent.add(m); return m; };
const WOOD = '#795138', WOOD_D = '#4d392c', WOOD_L = '#aa7950', NAVY = '#324f78', GOLD = '#d4ab59', CREAM = '#f5e6c9';

/** 拱窗：金框、直櫺與柔亮的玻璃（照店外觀的拱窗語言） */
function archWindow(s, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g);
  const glass = glassMat || M('#cfe9f5', { emissive: new THREE.Color('#bfe0f2'), emissiveIntensity: 0.55, roughness: 0.3 });
  const gp = mesh(new THREE.PlaneGeometry(0.84, 1.02), glass, 0, 1.82, 0.02, { noCast: true }); g.add(gp);
  const gt = mesh(new THREE.CircleGeometry(0.42, 20, 0, Math.PI), glass, 0, 2.33, 0.02, { noCast: true }); g.add(gt);
  const fm = M(GOLD, { roughness: 0.4, metalness: 0.5 });
  const rim = mesh(new THREE.TorusGeometry(0.45, 0.045, 8, 22, Math.PI), fm, 0, 2.33, 0.04, { noCast: true }); g.add(rim);
  box(s, g, 0.07, 1.1, 0.06, fm, -0.455, 1.83, 0.04); box(s, g, 0.07, 1.1, 0.06, fm, 0.455, 1.83, 0.04);
  box(s, g, 1.02, 0.07, 0.12, M(WOOD), 0, 1.28, 0.05);
  box(s, g, 0.035, 1.35, 0.03, M(WOOD_D), 0, 2.0, 0.045); box(s, g, 0.84, 0.035, 0.03, M(WOOD_D), 0, 1.85, 0.045);
  // 窗台花箱
  box(s, g, 0.8, 0.14, 0.18, M('#ae7754'), 0, 1.19, 0.1);
  [-0.25, 0, 0.25].forEach((dx, i) => { const fl = mesh(new THREE.SphereGeometry(0.075, 8, 6), M(i % 2 ? '#718853' : '#e8a0b4'), dx, 1.31, 0.1, { noCast: true }); fl.scale.y = 0.7; g.add(fl); });
}

/** 黃銅吊燈：鍊子、金色燈籠與暖光芯 */
function lantern(s, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g);
  const gold = M(GOLD, { roughness: 0.38, metalness: 0.6 });
  const chain = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 6), gold, 0, 2.86, 0, { noCast: true }); g.add(chain);
  const plate = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.04, 10), gold, 0, 3.12, 0, { noCast: true }); g.add(plate);   // 天花板上的吊燈圓盤（樑拿掉後鍊子有地方掛）
  const cap = mesh(new THREE.ConeGeometry(0.17, 0.13, 8), gold, 0, 2.58, 0, { noCast: true }); g.add(cap);
  const core = mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.24, 8), M('#ffe2ae', { emissive: new THREE.Color('#ffc56a'), emissiveIntensity: 1.1 }), 0, 2.4, 0, { noCast: true }); g.add(core);
  [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]].forEach(([dx, dz]) => { const bar = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), gold, dx, 2.4, dz, { noCast: true }); g.add(bar); });
  box(s, g, 0.26, 0.035, 0.26, gold, 0, 2.24, 0);
  const drop = mesh(new THREE.SphereGeometry(0.04, 8, 6), gold, 0, 2.16, 0, { noCast: true }); g.add(drop);
}

/** 低展示台：深藍裙邊、淺木台面、金色細邊 */
function platform(s, x, z, w, d) {
  const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g);
  box(s, g, w, 0.2, d, M(NAVY), 0, 0.1, 0, {});
  box(s, g, w + 0.08, 0.06, d + 0.08, M(WOOD_L), 0, 0.23, 0, {});
  box(s, g, w + 0.1, 0.025, d + 0.1, M(GOLD, { roughness: 0.4, metalness: 0.5 }), 0, 0.195, 0);
  COLS.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  return g;
}

/** 把今日家具真的擺上展示台：照佔地縮到台面放得下，腳底貼齊台面，前面立價格牌 */
function displayFurniture(s, st) {
  const spots = [
    { x: -3.88, z: -2.05, ry: 0, w: 1.05, d: 1.3 }, { x: -3.88, z: -0.4, ry: 0, w: 1.05, d: 1.3 }, { x: -3.88, z: 1.25, ry: 0, w: 1.05, d: 1.3 },
    { x: -1.55, z: -1.65, ry: 0, w: 1.35, d: 1.25 }, { x: -1.55, z: -0.05, ry: 0, w: 1.35, d: 1.25 }, { x: -1.55, z: 1.55, ry: 0, w: 1.35, d: 1.25 }
  ];
  (st.furn || []).slice(0, spots.length).forEach((f, i) => {
    const sp = spots[i];
    platform(s, sp.x, sp.z, sp.w, sp.d);
    const m = buildFurniture(f);
    m.traverse(o => { o.userData.keepGeo = true; });   // clone 與房間共用幾何，離店時不能釋放
    const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()), ct = bb.getCenter(new THREE.Vector3());
    const fit = Math.min(1, (sp.w - 0.12) / Math.max(sz.x, 0.01), (sp.d - 0.15) / Math.max(sz.z, 0.01), 1.7 / Math.max(sz.y, 0.01));   // 正面朝 +z（鏡頭與門口那一側）
    const hold = new THREE.Group(); hold.position.set(sp.x, 0.26, sp.z); hold.rotation.y = sp.ry;
    m.scale.setScalar(fit); m.position.set(-ct.x * fit, -bb.min.y * fit, -ct.z * fit);
    hold.add(m); s.add(hold);
    const tag = priceTag(f);
    tag.redraw((H.bought()[f.id] || 0));
    tag.mesh.position.set(sp.x + sp.w / 2 - 0.08, 0.44, sp.z + sp.d / 2 - 0.12);
    tag.mesh.rotation.set(-0.25, Math.PI / 4, 0); s.add(tag.mesh);
    box(s, s, 0.05, 0.22, 0.05, M(WOOD_D), sp.x + sp.w / 2 - 0.13, 0.32, sp.z + sp.d / 2 - 0.17);
    SPOTS.push({ kind: 'furn', f, tag, x: sp.x + sp.w / 2 + 0.35, z: sp.z, r: 1.15, label: `看「${f.name}」` });
  });
}

/** 壁紙與地板的樣品架：今天的壁紙、地板各一幅（和家裡貼上去的同一種畫法），下面有價格牌；在店裡右半邊的空地，面向門口 */
function paperStand(s, st) {
  const list = (st.papers || []).slice(0, 2); if (!list.length) return;
  const cx = 2.0, cz = 0.6, g = new THREE.Group(); g.position.set(cx, 0, cz); s.add(g);
  [-0.62, 0.62].forEach(dx => box(s, g, 0.06, 1.72, 0.06, M(WOOD_D), dx, 0.86, 0, {}));   // 兩根立柱
  box(s, g, 1.38, 0.06, 0.08, M(WOOD), 0, 1.69, 0, {});
  list.forEach((p, i) => {
    const x = list.length === 1 ? 0 : (i ? 0.31 : -0.31), wall = (I.WALLPAPER || []).includes(p);
    box(s, g, 0.58, 0.74, 0.04, M(GOLD, { roughness: 0.4, metalness: 0.5 }), x, 1.2, 0);
    const tex = patternTex(p); tex.repeat.set(1, 1.2);
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.66), own(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }))); sw.material.userData.ownMap = true; sw.position.set(x, 1.2, 0.025); g.add(sw);
    const tag = priceTag(p); tag.redraw(H.bought()[p.id] || 0); tag.mesh.scale.setScalar(0.88); tag.mesh.position.set(x, 0.62, 0.04); g.add(tag.mesh);
    SPOTS.push({ kind: 'paper', f: p, wall, tag, tex, x: cx + x, z: cz + 0.82, r: 0.75, label: `看「${p.name}」（${wall ? '壁紙' : '地板'}）` });
  });
  COLS.push([cx - 0.7, cz - 0.12, cx + 0.7, cz + 0.12]);
}

/** 櫃台：深藍面板綴金邊、奶油色檯面，上面有收銀機、鈴錢袋與小天秤；後牆貨架擺滿罐子與書 */
function buildCounter(s) {
  const g = new THREE.Group(); s.add(g);
  box(s, g, 3.4, 0.92, 0.68, M(WOOD), 0, 0.46, -2.5, {});
  box(s, g, 3.56, 0.08, 0.84, M(CREAM), 0, 0.96, -2.5, {});
  box(s, g, 3.44, 0.05, 0.72, M(GOLD, { roughness: 0.4, metalness: 0.5 }), 0, 0.895, -2.5);
  [-1.12, 0, 1.12].forEach(x => { box(s, g, 0.92, 0.62, 0.04, M(NAVY), x, 0.48, -2.145); box(s, g, 0.98, 0.05, 0.05, M(GOLD), x, 0.81, -2.145); });
  COLS.push([-1.78, -2.92, 1.78, -2.1]);
  // 收銀機：機身、顯示牌與一排按鍵
  const rg = new THREE.Group(); rg.position.set(-1.15, 1.0, -2.55); rg.rotation.y = 0.25; s.add(rg);
  box(s, rg, 0.42, 0.3, 0.36, M('#5a6a72', { roughness: 0.5, metalness: 0.3 }), 0, 0.15, 0, {});
  box(s, rg, 0.3, 0.12, 0.03, M('#ffe9b0', { emissive: new THREE.Color('#ffdf8a'), emissiveIntensity: 0.5 }), 0, 0.38, -0.08);
  for (let i = 0; i < 4; i++) box(s, rg, 0.06, 0.03, 0.06, M(i % 2 ? '#e8c878' : '#f5e6c9'), -0.12 + i * 0.08, 0.24, 0.17);
  // 鈴錢袋與天秤
  const bag = mesh(new THREE.SphereGeometry(0.13, 10, 8), M('#c9a165'), 1.05, 1.1, -2.45, {}); bag.scale.set(1, 0.9, 1); s.add(bag);
  const tie = mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.07, 8), M('#a8742c'), 1.05, 1.23, -2.45, { noCast: true }); s.add(tie);
  const pole = mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.34, 8), M(GOLD, { metalness: 0.6, roughness: 0.35 }), 0.55, 1.17, -2.6, { noCast: true }); s.add(pole);
  const beam2 = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 6), M(GOLD, { metalness: 0.6, roughness: 0.35 }), 0.55, 1.33, -2.6, { noCast: true }); beam2.rotation.z = Math.PI / 2; s.add(beam2);
  [-0.19, 0.19].forEach(dx => { const pan = mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.025, 10), M(GOLD, { metalness: 0.6, roughness: 0.35 }), 0.55 + dx, 1.24, -2.6, { noCast: true }); s.add(pan); });
  // 後牆貨架（櫃台正後方、店長頭上）：兩層木板，罐子、書與小盒子
  [1.86, 2.24].forEach((y, row) => {
    box(s, g, 3.2, 0.05, 0.3, M(WOOD_L), 0, y, -3.32);
    for (let i = 0; i < 7; i++) {
      const x = -1.35 + i * 0.45, kind = (i + row) % 3;
      if (kind === 0) { const j = mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.24, 8), M(['#7cc7ff', '#8fe0b8', '#ffb3c8'][i % 3]), x, y + 0.15, -3.32, { noCast: true }); s.add(j); const lid = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), M(GOLD), x, y + 0.29, -3.32, { noCast: true }); s.add(lid); }
      else if (kind === 1) box(s, g, 0.09, 0.3, 0.2, M(['#c96953', '#5b8fd6', '#5fbf6a', '#e6b84e'][i % 4]), x, y + 0.18, -3.32);
      else box(s, g, 0.24, 0.2, 0.22, M(WOOD_L), x, y + 0.13, -3.32);
    }
  });
  const sign = signMesh(['潮汐商店', 'TIDAL SHOP'], 2.3, 0.62, { moon: true }); sign.position.set(0, 2.82, -HD + 0.06); s.add(sign);
  [-1.15, 0, 1.15].forEach(x => SPOTS.push({ kind: 'counter', x, z: -2.45, r: 1.45, label: '跟店長說話' }));
}

/** 服裝區：兩座人台（一頂草帽、一身藍衣）與一排掛衣桿 */
function buildClothing(s) {
  const g = new THREE.Group(); s.add(g);
  const mannequin = (z, shirt, hatKind) => {
    const mg = new THREE.Group(); mg.position.set(3.62, 0, z); mg.rotation.y = -Math.PI / 2; s.add(mg);
    const base = mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.08, 14), M(NAVY), 0, 0.04, 0, {}); mg.add(base);
    const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8), M(GOLD, { metalness: 0.55, roughness: 0.4 }), 0, 0.5, 0, { noCast: true }); mg.add(pole);
    const torso = mesh(new THREE.CapsuleGeometry(0.21, 0.22, 4, 12), M(shirt), 0, 1.12, 0, {}); torso.scale.set(1.1, 1, 0.85); mg.add(torso);
    const collar = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 10), M(CREAM), 0, 1.42, 0, { noCast: true }); mg.add(collar);
    if (hatKind === 'straw') {
      const brim = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.025, 18), M('#e8c878'), 0, 1.52, 0, { noCast: true }); mg.add(brim);
      const top = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.12, 14), M('#e8c878'), 0, 1.59, 0, { noCast: true }); mg.add(top);
      const band = mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.045, 14), M('#d8455a'), 0, 1.545, 0, { noCast: true }); mg.add(band);
    } else {
      const cap = mesh(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#d8455a'), 0, 1.5, 0, { noCast: true }); mg.add(cap);
      const pom = mesh(new THREE.SphereGeometry(0.055, 8, 6), M('#fff3dc'), 0, 1.7, 0, { noCast: true }); mg.add(pom);
    }
    COLS.push([3.3, z - 0.34, 3.95, z + 0.34]);
  };
  mannequin(-1.75, '#7cc7ff', 'straw'); mannequin(-0.55, '#ff9fc0', 'beanie');
  // 掛衣桿（靠右牆）：兩支立柱、橫桿、五件上衣
  const rack = new THREE.Group(); rack.position.set(4.22, 0, -1.15); s.add(rack);
  [-0.7, 0.7].forEach(dz => { const p = mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.55, 8), M(WOOD_D), 0, 0.78, dz, { noCast: true }); rack.add(p); });
  const bar = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8), M(GOLD, { metalness: 0.55, roughness: 0.4 }), 0, 1.55, 0, { noCast: true }); bar.rotation.x = Math.PI / 2; rack.add(bar);
  ['#7cc7ff', '#ffd84a', '#8fe0b8', '#b9a2ff', '#ff8a6a'].forEach((c, i) => {
    const z = -0.56 + i * 0.28;
    box(s, rack, 0.05, 0.52, 0.22, M(c, { roughness: 1 }), 0, 1.22, z);
    box(s, rack, 0.02, 0.1, 0.16, M(WOOD_D), 0, 1.52, z);
  });
  COLS.push([3.95, -1.95, HW, -0.35]);
  const sign = signMesh(['服裝'], 0.95, 0.42, { bg: '#7a4a63' }); sign.position.set(HW - 0.06, 2.35, -1.15); sign.rotation.y = -Math.PI / 2; s.add(sign);
  SPOTS.push({ kind: 'wear', x: 3.55, z: -1.15, r: 1.6, label: '服裝櫃台' });
}

/** 種子架：三層木架、彩色種子包與小盆栽 */
function buildSeeds(s) {
  const g = new THREE.Group(); g.position.set(4.08, 0, 1.15); g.rotation.y = -Math.PI / 2; s.add(g);
  [-0.75, 0.75].forEach(dx => box(s, g, 0.07, 1.7, 0.34, M(WOOD), dx, 0.85, 0, {}));
  box(s, g, 1.62, 0.07, 0.4, M(WOOD), 0, 1.74, 0, {});
  [0.35, 0.85, 1.35].forEach((y, row) => {
    box(s, g, 1.56, 0.05, 0.36, M(WOOD_L), 0, y, 0);
    for (let i = 0; i < 4; i++) {
      const x = -0.57 + i * 0.38;
      if ((i + row) % 4 === 3) {   // 小盆栽
        const pot = mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.13, 8), M('#ae7754'), x, y + 0.09, 0.02, { noCast: true }); g.add(pot);
        const leaf = mesh(new THREE.SphereGeometry(0.1, 8, 6), M('#5fbf6a'), x, y + 0.22, 0.02, { noCast: true }); leaf.scale.y = 0.75; g.add(leaf);
      } else {   // 種子包：立著的紙包，封口一條金線
        box(s, g, 0.2, 0.28, 0.045, M(['#ffd84a', '#8fe0b8', '#ffb3c8', '#a8d8ff'][(i + row) % 4], { roughness: 1 }), x, y + 0.17, 0.08);
        box(s, g, 0.2, 0.045, 0.05, M(GOLD), x, y + 0.3, 0.08);
        const dot = mesh(new THREE.SphereGeometry(0.045, 8, 6), M(['#c6543d', '#7a5aa8', '#3f9a4f'][(i + row) % 3]), x, y + 0.18, 0.11, { noCast: true }); dot.scale.z = 0.4; g.add(dot);
      }
    }
  });
  COLS.push([3.8, 0.3, HW, 2.0]);
  const sign = signMesh(['種子'], 0.95, 0.42, { bg: '#3f6b3a' }); sign.position.set(HW - 0.06, 2.35, 1.15); sign.rotation.y = -Math.PI / 2; s.add(sign);
  SPOTS.push({ kind: 'seed', x: 3.95, z: 1.15, r: 1.5, label: '買種子' });
}

/** 收購箱：掀開蓋子的大木箱（板條與金屬角），旁邊一袋鈴錢 */
function buildSellBox(s) {
  const g = new THREE.Group(); g.position.set(2.85, 0, 2.55); g.rotation.y = -0.35; s.add(g);
  box(s, g, 0.95, 0.68, 0.7, M(WOOD_L), 0, 0.34, 0, {});
  [0.14, 0.34, 0.54].forEach(y => { box(s, g, 0.99, 0.07, 0.74, M(WOOD), 0, y, 0); });
  const lid = box(s, g, 0.95, 0.06, 0.7, M(WOOD), 0, 0.86, -0.3, {}); lid.rotation.x = -0.85;
  [[-0.44, -0.32], [0.44, -0.32], [-0.44, 0.32], [0.44, 0.32]].forEach(([x, z]) => box(s, g, 0.09, 0.7, 0.09, M(WOOD_D), x, 0.35, z));
  const sign = signMesh(['收購'], 0.68, 0.36, { bg: '#8a5a2c' }); sign.position.set(0, 0.42, 0.365); g.add(sign);
  const bag = mesh(new THREE.SphereGeometry(0.15, 10, 8), M('#c9a165'), 0.62, 0.13, 0.28, {}); bag.scale.set(1, 0.85, 1); g.add(bag);
  COLS.push([2.3, 2.05, 3.45, 3.05]);
  SPOTS.push({ kind: 'sell', x: 2.85, z: 2.55, r: 1.5, label: '賣東西（收購箱）' });
}

/** 把靜態網格照材質合併成少數幾個網格（繪製次數從幾百降到幾十）：幾何先 clone 再套世界矩陣，
   所以家具 clone 的共用幾何不會被改到；有 keepGeo 標記的原始幾何不釋放，其餘建場景時現做的幾何合併後釋放 */
function bakeInto(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
    const m = o.material, g = o.geometry;
    if (!m || (m.userData && m.userData.own) || !g || !g.attributes || !g.attributes.position || !g.attributes.normal) return;
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(o);
  });
  const tmp = new THREE.Matrix4();
  buckets.forEach((list, mat) => {
    if (list.length < 2) return;
    const geos = list.map(o => {
      let g = o.geometry.clone();
      g.applyMatrix4(tmp.copy(inv).multiply(o.matrixWorld));
      if (g.index) { const n = g.toNonIndexed(); g.dispose(); g = n; }
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      return g;
    });
    const names = ['position', 'normal', 'uv'];
    geos.forEach(g => Object.keys(g.attributes).forEach(n => { if (!names.includes(n)) names.push(n); }));
    const total = geos.reduce((a, g) => a + g.attributes.position.count, 0), merged = new THREE.BufferGeometry();
    names.forEach(n => {
      const first = geos.find(g => g.attributes[n]), item = first.attributes[n].itemSize, arr = new Float32Array(total * item);
      if (n === 'color') arr.fill(1);
      let off = 0;
      geos.forEach(g => { const at = g.attributes[n]; if (at) arr.set(at.array, off); off += g.attributes.position.count * item; });
      merged.setAttribute(n, new THREE.BufferAttribute(arr, item));
    });
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = list.some(o => o.castShadow); m.receiveShadow = true; m.frustumCulled = false;
    root.add(m);
    geos.forEach(g => g.dispose());
    list.forEach(o => { if (o.parent) o.parent.remove(o); if (!o.userData.keepGeo) o.geometry.dispose(); });
  });
}

/** 店面外殼：地板、三面牆（靠鏡頭的南牆不畫）、護牆板、天花樑與兩盞吊燈 */
function build() {
  COLS = []; SPOTS = [];
  glassMat = own(new THREE.MeshStandardMaterial({ color: '#cfe9f5', emissive: new THREE.Color('#bfe0f2'), emissiveIntensity: 0.55, roughness: 0.3 }));
  const s = new THREE.Scene();
  s.background = bgTex();
  const hemi = new THREE.HemisphereLight('#fff6e6', '#8a6a4a', 0.95); s.add(hemi); const lamps = [];
  const dl = new THREE.DirectionalLight('#fff0dc', 1.6); dl.position.set(4, 10, 5); dl.castShadow = true; dl.shadow.mapSize.set(ULTRA ? 1024 : 2048, ULTRA ? 1024 : 2048);
  Object.assign(dl.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); dl.shadow.bias = -0.0005; s.add(dl, dl.target);
  [[-2.2, 0.9], [2.2, -1.0]].forEach(([x, z]) => { const l = new THREE.PointLight('#ffd9a0', 5, 8.5, 1.6); l.position.set(x, 2.35, z); s.add(l); lamps.push([l, 5]); lantern(s, x, z); });
  if (!ULTRA) { const l = new THREE.PointLight('#ffe0ae', 3, 6, 1.6); l.position.set(0, 2.2, -2.2); s.add(l); lamps.push([l, 3]); }
  NL = { hemi, dl, lamps };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), own(new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.6 }))); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 5.2), own(new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 }))); rug.rotation.x = -Math.PI / 2; rug.position.set(0.15, 0.012, 0.75); rug.receiveShadow = true; s.add(rug);
  const wallM = own(new THREE.MeshStandardMaterial({ map: plasterTex(), roughness: 0.92 }));
  const wainsM = own(new THREE.MeshStandardMaterial({ map: wainsTex(), roughness: 0.85 }));
  [[0, -HD, W, 0], [-HW, 0, D, Math.PI / 2], [HW, 0, D, -Math.PI / 2]].forEach(([x, z, w, r]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_H), wallM); m.position.set(x, WALL_H / 2, z); m.rotation.y = r; m.receiveShadow = true; s.add(m);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; s.add(g);   // 牆的局部座標：x 沿牆、+z 朝店裡
    const wn = mesh(new THREE.BoxGeometry(w, 0.95, 0.05), wainsM, 0, 0.475, 0.025, { noCast: true }); wn.receiveShadow = true; g.add(wn);
    box(s, g, w, 0.06, 0.09, M(GOLD, { roughness: 0.4, metalness: 0.5 }), 0, 0.98, 0.045);   // 金色腰線
    box(s, g, w, 0.12, 0.08, M('#e9dcc0'), 0, WALL_H - 0.06, 0.04);   // 天花線板
    box(s, g, w + 0.36, 0.16, 0.38, M(NAVY), 0, WALL_H + 0.08, -0.1, {});   // 牆頂厚度（深藍壓頂）
  });
  [[-HW, -HD], [HW, -HD]].forEach(([x, z]) => box(s, s, 0.34, WALL_H + 0.15, 0.34, M(WOOD), x, (WALL_H + 0.15) / 2, z, {}));
  box(s, s, W + 0.1, 0.18, 0.26, M(WOOD_D), 0, WALL_H - 0.14, -HD + 0.35, {});   // 後牆上方一根橫樑（貼著後牆，不擋視線）
  box(s, s, W + 0.36, 0.34, 0.2, M(WOOD_D), 0, -0.17, HD + 0.1);   // 地板南緣的厚度
  box(s, s, 1.7, 0.025, 0.85, M(NAVY), 0, 0.014, HD - 0.48);   // 門口地墊
  archWindow(s, -2.95, -HD + 0.03); archWindow(s, 2.95, -HD + 0.03);
  buildCounter(s);
  { const st = H.stock(); displayFurniture(s, st); paperStand(s, st); }
  buildClothing(s);
  buildSeeds(s);
  buildSellBox(s);
  {   // 家具區招牌（左牆）與門邊盆栽、右後角木箱堆
    const sign = signMesh(['今日家具'], 1.35, 0.45, {}); sign.position.set(-HW + 0.06, 2.4, -0.4); sign.rotation.y = Math.PI / 2; s.add(sign);
    const pot = mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 10), M('#ae7754'), -4.0, 0.15, 2.95, {}); s.add(pot);
    const leaf = mesh(new THREE.SphereGeometry(0.3, 10, 8), M('#5fbf6a'), -4.0, 0.55, 2.95, {}); leaf.scale.set(1, 0.8, 1); s.add(leaf);
    const leaf2 = mesh(new THREE.SphereGeometry(0.2, 8, 6), M('#718853'), -3.85, 0.72, 2.85, { noCast: true }); s.add(leaf2);
    COLS.push([-HW, 2.65, -3.7, HD]);
    box(s, s, 0.62, 0.5, 0.55, M(WOOD_L), 4.05, 0.25, -3.05, {}); box(s, s, 0.5, 0.42, 0.46, M(WOOD), 4.0, 0.71, -3.08, {});
    COLS.push([3.7, -HD, HW, -2.7]);
  }
  bakeInto(s);   // 靜態裝潢與展示家具照材質合併，壓低繪製次數
  s.traverse(o => { o.frustumCulled = false; });
  return s;
}

export function enter() {
  if (inside || !H) return;
  ui.iris(); stockDay = dayKey(); dayT = 0;
  { const s0 = S(); s0.stats = s0.stats || {}; s0.stats.shopIn = (s0.stats.shopIn || 0) + 1; }   // 進過店（「還沒試過的玩法」用）
  sc = build(); inside = true; savedCurve = U.uCurve.value; U.uCurve.value = 0;
  sc.add(P); P.position.set(0, 0, HD - 0.85); P.rotation.y = Math.PI;
  if (KV && KV.mesh) { sc.add(KV.mesh); KV.mesh.visible = true; KV.mesh.position.set(0, 0, -3.02); KV.mesh.rotation.y = 0.1; }
  camPos.set(P.position.x * 0.45, 7.0, P.position.z * 0.3 + 9.0);   // 和 tick 的跟隨鏡頭同一個位置，進門時不會晃一下
  document.body.classList.add('in-trip'); Audio.sfx('open');
  ui.toast(`歡迎光臨潮汐商店！家具在左邊、服裝與種子在右邊，櫃台找${KV ? KV.name : '店長'}`);
}

/** 離店時釋放這次建立的幾何與專屬材質（共用材質 M()、快取貼圖與家具 clone 的共用幾何不釋放） */
function dispose() {
  if (!sc) return;
  sc.traverse(o => {
    if (o.isLight && o.shadow && o.shadow.map) o.shadow.dispose();
    if (o === P || (KV && o === KV.mesh) || !o.isMesh) return;
    if (o.geometry && !o.userData.keepGeo) o.geometry.dispose();
    const m = o.material;
    if (m && m.userData && m.userData.own) { if (m.userData.ownMap && m.map) m.map.dispose(); m.dispose(); }
  });
}
function leave() {
  ui.iris(); inside = false; U.uCurve.value = savedCurve || CURVE;
  document.body.classList.remove('in-trip');
  mainScene.add(P);
  if (KV && KV.mesh) mainScene.add(KV.mesh);
  dispose(); sc = null;
  H.onExit && H.onExit();
  Audio.sfx('open');
}

/* ---------- 碰撞、區域與移動 ---------- */
const blockedAt = (x, z) => x < -HW + 0.38 || x > HW - 0.38 || z < -HD + 0.38 || COLS.some(([x0, z0, x1, z1]) => x > x0 - 0.22 && x < x1 + 0.22 && z > z0 - 0.22 && z < z1 + 0.22);
const zone = () => {
  if (!P) return null;
  let best = null, bd = 1e9;
  SPOTS.forEach(sp => { const d = Math.hypot(P.position.x - sp.x, P.position.z - sp.z), w = sp.kind === 'counter' && P.position.z < -1.6 ? d * 0.5 : d; if (d < sp.r && w < bd) { bd = w; best = sp; } });   // 站在櫃台正前方：先跟店長說話
  return best;
};
export function tick(dt, t, ix, iz, len, moving, run, locked, night = 0) {
  if ((dayT += dt) > 2) { dayT = 0; if (dayKey() !== stockDay && !ui.dialogOpen() && !ui.panelOpen() && !ui.cardOpen()) { ui.toast('過了午夜，店裡換上今天的商品了'); leave(); setTimeout(() => enter(), 500); return; } }   // 跨過午夜：展示台與櫃台清單換成同一天的貨
  if (NL) { const n = Math.min(1, Math.max(0, night)); NL.hemi.intensity = 0.95 - n * 0.4; NL.dl.intensity = 1.6 - n * 1.15; NL.lamps.forEach(([l, b]) => { l.intensity = b * (1 + n * 0.5); });   // 燈光跟著時間：晚上窗外暗、吊燈更亮
    if (glassMat) { glassMat.color.set(n > 0.5 ? '#41557d' : '#cfe9f5'); glassMat.emissive.set(n > 0.5 ? '#2b3d63' : '#bfe0f2'); glassMat.emissiveIntensity = n > 0.5 ? 0.3 : 0.55; } }
  if (moving && !locked) {
    ix /= len; iz /= len; const sp = run ? 4.2 : 2.6 * (0.3 + 0.7 * Math.min(1, len)), nx = P.position.x + ix * sp * dt, nz = P.position.z + iz * sp * dt;
    if (nz > HD - 0.45 && Math.abs(nx) < DOOR_HW && iz > 0) { leave(); return; }
    const cz = Math.min(HD - 0.35, nz);
    if (!blockedAt(nx, cz)) { P.position.x = nx; P.position.z = cz; } else if (!blockedAt(nx, P.position.z)) P.position.x = nx; else if (!blockedAt(P.position.x, cz)) P.position.z = cz;
    P.rotation.y = Math.atan2(ix, iz);
  }
  P.position.y = 0;
  animate(P, dt, moving && !locked ? (run ? 2 : 1) : 0, t);
  if (KV && KV.mesh && KV.mesh.parent === sc) {   // 店長在櫃台後看著客人
    const m = KV.mesh, dx = P.position.x - m.position.x, dz = P.position.z - m.position.z, want = Math.atan2(dx, dz);
    let d = want - m.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    m.rotation.y += d * Math.min(1, dt * 4);
    animate(m, dt, 0, t);
  }
  const tx = P.position.x * 0.45, tz = P.position.z * (P.position.z > 0 ? 0.3 : 0.45), za = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.05 : 1;
  camPos.lerp(new THREE.Vector3(tx, 7.0 * za, tz + 9.0 * za), Math.min(1, dt * 3)); camera.position.copy(camPos); camera.lookAt(tx, 1.0, tz - 1.45);   // 注視點偏後牆一點：站在門口時，後牆上的店名招牌也在畫面裡
  const fx = post.fx, dof0 = fx.dof, ao0 = fx.ao;
  fx.golden = 0.25; fx.clear = 1; fx.sunVis = 0; fx.night = Math.min(1, Math.max(0, night)) * 0.5; fx.focus = camera.position.distanceTo(P.position); fx.dof = dof0 * 0.45; fx.ao = ao0 * 1.5;
  post.render(t, sc, camera);
  fx.dof = dof0; fx.ao = ao0;
}
export const hint = () => { if (P && Math.abs(P.position.x) < DOOR_HW && P.position.z > HD - 1.5) return '往下走出商店'; const z = zone(); return z ? z.label : ''; };
export function handler() {
  const z = zone(); if (!z) return null;
  if (z.kind === 'counter') return () => H.counter();
  if (z.kind === 'wear') return () => H.wear();
  if (z.kind === 'seed') return () => H.seed();
  if (z.kind === 'sell') return () => H.sell();
  if (z.kind === 'paper') return () => openPaper(z);
  return () => openItem(z);
}
/** 觸控點地面：把點的位置換算成地板上的目標（被家具擋住就往玩家這邊退到走得到的地方） */
const ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2(), flPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
export function pointerDown(e) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray2.setFromCamera(ndc, camera);
  if (!ray2.ray.intersectPlane(flPlane, hitP)) return null;
  let x = THREE.MathUtils.clamp(hitP.x, -HW + 0.45, HW - 0.45), z = THREE.MathUtils.clamp(hitP.z, -HD + 0.45, HD - 0.3);
  for (let i = 0; i < 12 && blockedAt(x, z); i++) { x += (P.position.x - x) * 0.25; z += (P.position.z - z) * 0.25; }
  return { x, z };
}

/** 壁紙、地板樣品的購買面板（買的流程和櫃台一樣，走 H.buy；已經有的不能再買） */
function openPaper(sp) {
  const p = sp.f, s = S(), body = ui.el('div', 'nk'), img = sp.tex && sp.tex.image && sp.tex.image.toDataURL ? sp.tex.image.toDataURL('image/png') : '';
  const draw = () => {
    const owned = (s.papers || []).includes(p.id), ok = !owned && s.bells >= p.price;
    body.innerHTML = `<div class="nk-top"><span class="nk-sign">今日${sp.wall ? '壁紙' : '地板'}<small>樣品</small></span><span class="nk-wallet"><i></i>${s.bells.toLocaleString()}</span></div>`
      + `<div class="pk-sel"><img src="${img}" alt=""><div><b>${ui.esc(p.name)}</b><small>${p.price.toLocaleString()} 鈴錢${owned ? ' · 已經有了' : ''}</small><p>${ui.esc(ui.keys(sp.wall ? '回家按 F 裝潢，就能換上這款壁紙。' : '回家按 F 裝潢，就能鋪上這款地板。'))}</p></div></div>`;
    const cf = ui.el('div', 'nk-confirm', `<span>${owned ? '你已經有這一款了' : ok ? `要買「${ui.esc(p.name)}」嗎？<b>${p.price.toLocaleString()} 鈴錢</b>` : `鈴錢還差 ${(p.price - s.bells).toLocaleString()}……`}</span>`);
    const yes = ui.el('button', 'btn' + (ok ? ' gold' : ' off'), owned ? '已經有了' : ok ? '買！' : '鈴錢不夠'), no = ui.el('button', 'btn', '再想想'); yes.type = no.type = 'button';
    yes.onclick = () => { if (!ok || !H.buy(p)) { Audio.sfx('bad'); return; } sp.tag.redraw(H.bought()[p.id] || 0); ui.toast(`買了${p.name}！回家按 F 裝潢`); draw(); };
    no.onclick = () => ui.closePanel(); cf.append(yes, no); body.appendChild(cf);
  };
  draw(); ui.panel(p.name, body, { cls: 'nook-p' });
}
/** 展示品的購買面板：照 openFurnShop 的樣子（錢包、確認鈕），買賣走同一支共用函式 */
function openItem(sp) {
  const f = sp.f, s = S(), body = ui.el('div', 'nk');
  const draw = () => {
    const n = H.bought()[f.id] || 0, ok = s.bells >= f.price;
    body.innerHTML = `<div class="nk-top"><span class="nk-sign">今日家具<small>展示品</small></span><span class="nk-wallet"><i></i>${s.bells.toLocaleString()}</span></div>`
      + `<div class="pk-sel"><img src="${thumb(f.id)}" alt=""><div><b>${ui.esc(f.name)}</b><small>${f.price.toLocaleString()} 鈴錢${n ? ` · 今天已買 ${n} 件` : ''}</small>${f.desc ? `<p>${ui.esc(f.desc)}</p>` : ''}</div></div>`;
    const cf = ui.el('div', 'nk-confirm', `<span>${ok ? `要買「${ui.esc(f.name)}」嗎？<b>${f.price.toLocaleString()} 鈴錢</b>` : `鈴錢還差 ${(f.price - s.bells).toLocaleString()}……`}</span>`);
    const yes = ui.el('button', 'btn' + (ok ? ' gold' : ' off'), ok ? '買！' : '鈴錢不夠'), no = ui.el('button', 'btn', '再想想'); yes.type = no.type = 'button';
    yes.onclick = () => {
      if (!H.buy(f)) { Audio.sfx('bad'); return; }
      sp.tag.redraw(H.bought()[f.id] || 0);
      ui.toast(`買了${f.name}！回家按 F 裝潢`);
      draw();
    };
    no.onclick = () => ui.closePanel();
    cf.append(yes, no); body.appendChild(cf);
    if (ok) setTimeout(() => yes.focus({ preventScroll: true }), 0);
  };
  draw();
  ui.panel(f.name, body, { cls: 'nook-p' });
}



