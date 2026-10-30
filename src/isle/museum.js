/* 潮汐小島 · 博物館內部：從博物館大門走進展廳。左牆是魚類水族箱、右牆是昆蟲標本櫃、後牆是化石、
   前方兩側是潮池生物與礦物。捐贈過的展品會擺上展示位，走近按 E 看說明；還沒捐的位置是空的。
   v8.1 起新館是整棟室內（data/interiors_museum.js，house.js 走路與燈光）：這裡的 dress() 把捐贈過的展品擺上新館的展示位；
   這間舊展廳只在新館建不起來時用。 */
import * as THREE from 'three';
import { renderer, camera, M, mesh, U, CURVE, scene as mainScene } from './engine.js';
import { animate } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as post from './post.js';
import { S, save, list, icon, whereName, stars, fmtMonths, fmtHours } from './state.js';

const W = 18, D = 14, HW = W / 2, HD = D / 2;
export let inside = false;
let P = null, onExit = null, sc = null, slots = [], camPos = new THREE.Vector3(), savedCurve = 0.0055, texCache = {};
const tex = url => texCache[url] || (texCache[url] = Object.assign(new THREE.TextureLoader().load(url), { magFilter: THREE.NearestFilter, colorSpace: THREE.SRGBColorSpace }));
export function init(player, exitCb) { P = player; onExit = exitCb; }
const WINGS = [
  { k: 'fish', name: '魚類', wall: 'left', color: '#7cc7ff' },
  { k: 'bug', name: '昆蟲', wall: 'right', color: '#8fe0b8' },
  { k: 'fossil', name: '化石', wall: 'back', color: '#e8c878' },
  { k: 'sea', name: '潮池生物', wall: 'frontL', color: '#5ab0c8' },
  { k: 'mineral', name: '礦物', wall: 'frontR', color: '#b9a2ff' },
  { k: 'marine', name: '海洋館', wall: null, color: '#3fa7d6' }   // v9.0 潛水遇到的生物：展示在海洋館（aquarium.js）的水族缸裡
];
/* 展廳的材質貼圖（畫一次就快取，離館時不釋放） */
const TX = {};
function canvasTex(key, w, h, draw, rep) {
  if (TX[key]) return TX[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return (TX[key] = t);
}
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
/** 拼花木地板：一排排長短不一的暖色木條，每條深淺略有不同、帶細木紋 */
const floorTex = () => canvasTex('floor', 512, 512, (c, w, h) => {
  seed = 7; const rows = 16, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 160;
    while (x < w) {
      const len = 120 + rnd() * 140, v = 0.89 + rnd() * 0.11, R = 188 * v, G = 150 * v, B = 108 * v;
      c.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`; c.fillRect(x, r * rh, len, rh);
      for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(110,72,40,${0.035 + rnd() * 0.04})`; c.fillRect(x, r * rh + rnd() * rh, len, 1 + rnd() * 1.5); }   // 木紋
      c.fillStyle = 'rgba(90,58,32,0.25)'; c.fillRect(x, r * rh, 2, rh);   // 木條接縫
      x += len;
    }
    c.fillStyle = 'rgba(90,58,32,0.27)'; c.fillRect(0, r * rh, w, 2);
  }
}, [W / 4.5, D / 4.5]);
/** 牆面：淡淡的灰泥斑駁 */
const plasterTex = () => canvasTex('plaster', 256, 256, (c, w, h) => {
  seed = 3; c.fillStyle = '#f2e8d6'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const a = rnd() * 0.05; c.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(150,120,80,${a})`; const r = 2 + rnd() * 10; c.beginPath(); c.arc(rnd() * w, rnd() * h, r, 0, 6.283); c.fill(); }
}, [4, 1]);
/** 中央走道的紅地毯：金色滾邊、內框細線、每隔一段一個菱形花紋 */
const rugTex = () => canvasTex('rug', 192, 704, (c, w, h) => {
  c.fillStyle = '#a83c3c'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(${y % 6 ? '255,220,200' : '60,10,10'},0.05)`; c.fillRect(0, y, w, 2); }   // 絨毛的細紋
  c.fillStyle = '#d9a95a'; c.fillRect(0, 0, 14, h); c.fillRect(w - 14, 0, 14, h); c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
  c.strokeStyle = 'rgba(240,200,130,0.7)'; c.lineWidth = 3; c.strokeRect(26, 26, w - 52, h - 52);
  c.strokeStyle = 'rgba(232,186,110,0.6)'; c.lineWidth = 3;
  for (let y = 90; y < h - 60; y += 130) { c.beginPath(); c.moveTo(w / 2, y - 20); c.lineTo(w / 2 + 15, y); c.lineTo(w / 2, y + 20); c.lineTo(w / 2 - 15, y); c.closePath(); c.stroke(); c.fillStyle = 'rgba(232,186,110,0.45)'; c.fillRect(w / 2 - 3, y - 3, 6, 6); }   // 細的金色菱形框
});
function build() {
  const s = new THREE.Scene();
  s.background = canvasTex('bg', 256, 256, (c, w, h) => { const g = c.createRadialGradient(128, 110, 10, 128, 128, 190); g.addColorStop(0, '#5a4532'); g.addColorStop(0.55, '#33261c'); g.addColorStop(1, '#17110c'); c.fillStyle = g; c.fillRect(0, 0, w, h); });   // 和家裡一樣：展廳外面是暖褐色漸層
  s.add(new THREE.HemisphereLight('#fff6e6', '#8a6a4a', 0.95));
  const dl = new THREE.DirectionalLight('#fff0dc', 1.7); dl.position.set(5, 14, 6); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048);   // 主光從右前上方照下：展示台、化石座與角色都有影子
  Object.assign(dl.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 }); dl.shadow.bias = -0.0005; s.add(dl, dl.target);
  [[-5, 2], [5, 2], [0, -4]].forEach(([x, z]) => { const l = new THREE.PointLight('#ffd9a0', 5, 9, 1.6); l.position.set(x, 3.2, z); s.add(l); });   // 三盞暖色吊燈：地上一圈一圈的暖光
  const own = m => { m.userData.own = true; return m; };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), own(new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.62 }))); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
  const wallM = own(new THREE.MeshStandardMaterial({ map: plasterTex(), roughness: 0.92 })), wood = M('#7a5236'), cap = M('#efe2c8');
  [[0, -HD, W, 0], [-HW, 0, D, Math.PI / 2], [HW, 0, D, -Math.PI / 2]].forEach(([x, z, w, r]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.4), wallM); m.position.set(x, 1.7, z); m.rotation.y = r; m.receiveShadow = true; s.add(m);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; s.add(g);   // 牆的局部座標：x 沿牆、+z 朝展廳裡面
    g.add(mesh(new THREE.BoxGeometry(w, 0.9, 0.05), wood, 0, 0.45, 0.025, { noCast: true }));   // 深色木護牆板
    g.add(mesh(new THREE.BoxGeometry(w, 0.07, 0.09), M('#9a6c48'), 0, 0.93, 0.045, { noCast: true }));   // 腰線
    g.add(mesh(new THREE.BoxGeometry(w + 0.36, 0.16, 0.36), cap, 0, 3.48, -0.1));   // 牆頂的厚度（從上面看得到牆有多厚）
    g.add(mesh(new THREE.BoxGeometry(w, 0.12, 0.08), M('#d8c6a2'), 0, 3.34, 0.04, { noCast: true }));   // 天花線板
  });
  [[-HW, -HD], [HW, -HD]].forEach(([x, z]) => s.add(mesh(new THREE.BoxGeometry(0.42, 3.6, 0.42), cap, x, 1.8, z)));   // 後牆兩角的柱子
  s.add(mesh(new THREE.BoxGeometry(W + 0.36, 0.34, 0.2), wood, 0, -0.17, HD + 0.1, { noCast: true }));   // 地板前緣的厚度（不是一張紙）
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, D - 3), own(new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 }))); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.012, 1.2); rug.receiveShadow = true; s.add(rug);
  const s2 = S(); slots = [];
  WINGS.forEach(w => {
    const L2 = list(w.k); if (!L2.length || !w.wall) return;
    const pos = layout(w.wall, L2.length);
    pos.forEach(([x, y, z, ry], i) => {
      const sp = L2[i], got = s2.museum[w.k] && s2.museum[w.k][sp.id];
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
      if (w.k === 'fish') g.add(mesh(new THREE.BoxGeometry(0.62, 0.5, 0.3), own(new THREE.MeshStandardMaterial({ color: '#9ad8f0', transparent: true, opacity: got ? 0.5 : 0.25, roughness: 0.1 })), 0, 0, 0, { noCast: true }));
      else if (w.k === 'bug' || w.k === 'mineral' || w.k === 'sea') g.add(mesh(new THREE.BoxGeometry(0.6, 0.5, 0.06), M(got ? '#fffaf0' : '#3f5551'), 0, 0, -0.06, { noCast: true }), mesh(new THREE.BoxGeometry(0.66, 0.06, 0.12), M('#8a5a3b'), 0, -0.28, 0, { noCast: true }));
      else g.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.5, 12), M(got ? '#f0e6d2' : '#ddd2bd'), 0, -0.25, 0));
      if (got) { const spr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.44), own(new THREE.MeshBasicMaterial({ map: tex(icon(sp.id, w.k)), transparent: true }))); spr.position.set(0, w.k === 'fossil' ? 0.25 : 0.02, w.k === 'fish' ? 0 : 0.01); g.add(spr); }
      if (w.wall.startsWith('front')) g.rotation.x = -0.3;
      s.add(g); slots.push({ k: w.k, sp, got, x, z, y, wing: w });
    });
    const [lx, lz, lr] = { left: [-HW + 0.05, 0, Math.PI / 2], right: [HW - 0.05, 0, -Math.PI / 2], back: [0, -HD + 0.05, 0], frontL: [-5.5, HD - 2.2, 0], frontR: [5.5, HD - 2.2, 0] }[w.wall];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = w.color; c.fillRect(0, 0, 256, 64); c.fillStyle = '#fff'; c.font = '800 34px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const n = L2.filter(x => s2.museum[w.k] && s2.museum[w.k][x.id]).length; c.fillText(`${w.name} ${n}/${L2.length}`, 128, 34);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), (() => { const m = own(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) })); m.userData.ownMap = true; return m; })()); sign.position.set(lx, w.wall.startsWith('front') ? 2.3 : 3.0, lz); sign.rotation.y = lr; s.add(sign);
  });
  s.add(mesh(new THREE.BoxGeometry(1.8, 0.02, 0.9), M('#6e4630'), 0, 0.016, HD - 0.5, { noCast: true }));   // 門口地墊
  const tz = (TABLE.z0 + TABLE.z1) / 2, td = TABLE.z1 - TABLE.z0;
  [-5.5, 5.5].forEach(cx => {   // 潮池生物與礦物的展示桌
    s.add(mesh(new THREE.BoxGeometry(TABLE.hw * 2, 0.08, td + 0.1), M('#70533d'), cx, 0.26, tz), mesh(new THREE.BoxGeometry(5.5, 0.02, td - 0.1), M('#3d5a4c'), cx, 0.305, tz, { noCast: true }));
    [[-2.75, -td / 2 + 0.06], [2.75, -td / 2 + 0.06], [-2.75, td / 2 - 0.06], [2.75, td / 2 - 0.06]].forEach(([dx, dz]) => s.add(mesh(new THREE.BoxGeometry(0.1, 0.24, 0.1), M('#5e4532'), cx + dx, 0.12, tz + dz)));
  });
  s.traverse(o => { o.frustumCulled = false; });
  return s;
}
/** 展示位座標：沿牆排成網格，或在前方兩側排成展示桌 */
function layout(wall, n) {
  const out = [];
  if (wall === 'left' || wall === 'right') {
    const cols = Math.ceil(n / 5), sx = (D - 2) / cols;
    for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols), z = -HD + 1 + sx * (c + 0.5), y = 0.6 + r * 0.55, x = wall === 'left' ? -HW + 0.25 : HW - 0.25; out.push([x, y, z, wall === 'left' ? Math.PI / 2 : -Math.PI / 2]); }
  } else if (wall === 'back') {
    const cols = Math.ceil(n / 3), sx = (W - 4) / cols;
    for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); out.push([-HW + 2 + sx * (c + 0.5), 0.5 + r * 0.0, -HD + 0.6 + r * 1.0, 0]); }
  } else {
    const cx = wall === 'frontL' ? -5.5 : 5.5, cols = 6;
    for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); out.push([cx - 2.25 + c * 0.9, 0.55, HD - 2.6 + r * 0.6 - 2.4, 0]); }
  }
  return out;
}
export function enter() {
  ui.iris();
  sc = build(); inside = true; savedCurve = U.uCurve.value; U.uCurve.value = 0;
  sc.add(P); P.position.set(0, 0, HD - 0.8); P.rotation.y = Math.PI; camPos.set(0, 13.5, HD + 12);
  document.body.classList.add('in-trip'); Audio.sfx('open');
  welcome();
}
/** 館藏總數（五個展區捐贈過的件數） */
export const count = () => { const s = S(); return WINGS.reduce((a, w) => a + Object.keys(s.museum[w.k] || {}).length, 0); };
export const welcome = () => ui.toast(`歡迎參觀潮汐博物館！目前館藏 ${count()} 件。走到展區前按 E 看完整館藏`);

/* ---------- v8.1 新館的展品 ----------
   新館的 userData：
     exhibits { fish: [[x, y, z, ry, s?, tilt?], ...], bug, fossil, sea, mineral }   每一種展品一個展示位（依 list(k) 的順序）：(x, y, z) 是展品圖卡的中心，
                                                                             ry 是圖卡朝向（0 = 面向 +z），s 是邊長（預設 0.42 公尺），tilt 是往後仰的弧度（斜面展示台用，預設 0）；捐贈過才擺上圖卡
     wingSigns { fish: [x, y, z, ry, w], ... }   展區名牌：寬 w 公尺（高是寬的四分之一），畫上「魚類 12/65」 */
/* 圖卡畫在同一張圖集上（32×32 的圖示一格 40 像素、四周留 4 像素透明邊，縮小取樣時不會滲到隔壁），全部圖卡合併成一個網格：全館一次繪製 */
const ATL = { n: 25, cell: 40, cv: null, tex: null, mat: null, at: new Map() };
function atlasCell(url) {
  if (!ATL.cv) {
    ATL.cv = document.createElement('canvas'); ATL.cv.width = ATL.cv.height = 1024;
    const t = ATL.tex = new THREE.CanvasTexture(ATL.cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.anisotropy = 4;
    ATL.mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.3, alphaTest: 0.5, roughness: 0.85 });   // 自己帶一點光：櫃子深處、晚上也看得清楚
  }
  if (ATL.at.has(url)) return ATL.at.get(url);
  const i = ATL.at.size; if (i >= ATL.n * ATL.n) return -1;
  ATL.at.set(url, i);
  const im = new Image(); im.onload = () => { const c = ATL.cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(im, (i % ATL.n) * ATL.cell + 4, Math.floor(i / ATL.n) * ATL.cell + 4, 32, 32); ATL.tex.needsUpdate = true; }; im.src = url;
  return i;
}
/** 一批四邊形（[x, y, z, ry, 寬, 高, tilt, u0, v0, u1, v1]）合併成一個網格：右方 (cx, 0, -sx)、上方往後仰 (-sx·st, ct, -cx·st) */
function quads(list, mat) {
  const P = [], N = [], UV = [], IX = [];
  list.forEach(([x, y, z, ry, w, h, t, u0, v0, u1, v1], k) => {
    const cx = Math.cos(ry), sx = Math.sin(ry), ct = Math.cos(t), st = Math.sin(t), hw = w / 2, hh = h / 2;
    [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]].forEach(([a, b, u, v]) => { P.push(x + hw * cx * a - hh * sx * st * b, y + hh * ct * b, z - hw * sx * a - hh * cx * st * b); N.push(sx * ct, st, cx * ct); UV.push(u, v); });
    const o = k * 4; IX.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(IX);
  const m = new THREE.Mesh(g, mat); m.castShadow = false; m.receiveShadow = true; return m;
}
/* ---------- v8.3 名牌：每件捐贈過的展品下面一塊小牌子（名字、捐贈日期；你的第一件會署名），全部畫在同一張圖集、合併成一次繪製 ---------- */
const NL = { cv: null, tex: null, mat: null, W: 2048, H: 1024, cw: 128, ch: 48 };
function plateAtlas() {
  if (!NL.cv) {
    NL.cv = document.createElement('canvas'); NL.cv.width = NL.W; NL.cv.height = NL.H;
    NL.tex = new THREE.CanvasTexture(NL.cv); NL.tex.colorSpace = THREE.SRGBColorSpace; NL.tex.anisotropy = 4;
    NL.mat = new THREE.MeshStandardMaterial({ map: NL.tex, emissiveMap: NL.tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.28, roughness: 0.9 });
  }
  const c = NL.cv.getContext('2d'); c.clearRect(0, 0, NL.W, NL.H); return c;
}
const PLATE_N = Math.floor(2048 / 128) * Math.floor(1024 / 48);
function drawPlate(c, i, name, sub, color) {
  const n = NL.W / NL.cw, x = (i % n) * NL.cw, y = Math.floor(i / n) * NL.ch;
  c.fillStyle = '#fbf4e6'; c.fillRect(x + 2, y + 2, NL.cw - 4, NL.ch - 4); c.fillStyle = color; c.fillRect(x + 2, y + 2, NL.cw - 4, 4);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#4a3a2a'; c.font = '800 19px system-ui, "Microsoft JhengHei", sans-serif'; c.fillText(name, x + NL.cw / 2, y + (sub ? 20 : 26), NL.cw - 10);
  if (sub) { c.fillStyle = '#8a6a4a'; c.font = '700 12px system-ui, "Microsoft JhengHei", sans-serif'; c.fillText(sub, x + NL.cw / 2, y + 37, NL.cw - 10); }
  return [x / NL.W, 1 - (y + NL.ch) / NL.H, (x + NL.cw) / NL.W, 1 - y / NL.H];
}
/** 一批圖卡（[x, y, z, ry, s, 格, tilt]）合併成一個網格 */
function cardsMesh(list) {
  const P = [], N = [], UV = [], IX = [], A = 1024;
  list.forEach(([x, y, z, ry, s, i, t], k) => {
    const cx = Math.cos(ry), sx = Math.sin(ry), ct = Math.cos(t), st = Math.sin(t), h = s / 2, u0 = ((i % ATL.n) * ATL.cell + 4) / A, u1 = u0 + 32 / A, v1 = 1 - (Math.floor(i / ATL.n) * ATL.cell + 4) / A, v0 = v1 - 32 / A;
    // 右方 (cx, 0, -sx)；上方往後仰 (-sx·st, ct, -cx·st)；法線 (sx·ct, st, cx·ct)
    [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]].forEach(([a, b, u, v]) => { P.push(x + h * (cx * a - sx * st * b), y + h * ct * b, z + h * (-sx * a - cx * st * b)); N.push(sx * ct, st, cx * ct); UV.push(u, v); });
    const o = k * 4; IX.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(IX);
  const m = new THREE.Mesh(g, ATL.mat); m.castShadow = false; m.receiveShadow = true; return m;
}
let signs = [];
/* ---------- v9.0 海洋館的入口：魚類側廳北牆上的拱門（走過去按 E 走進海洋館；從海洋館出來站在拱門前） ---------- */
export const ARCH = [-9, -8.98], ARCH_SPAWN = [-9, 0, -7.7, 0];
let archG = null;
function arch() {
  if (archG) return archG;   // 建一次重複用（材質與貼圖不釋放）
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: '#d9ad70', roughness: 0.68 }), brass = new THREE.MeshStandardMaterial({ color: '#f4bf55', roughness: 0.3, metalness: 0.4 });
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#bff4ff'); gr.addColorStop(0.45, '#3fb4e0'); gr.addColorStop(1, '#1a5f9a'); c.fillStyle = gr; c.fillRect(0, 0, 256, 512);
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3; for (let y = 40; y < 512; y += 46) { c.beginPath(); for (let x = 0; x <= 256; x += 8) c.lineTo(x, y + Math.sin(x / 22 + y) * 6); c.stroke(); }   // 水紋
  c.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 24; i++) { c.beginPath(); c.arc(30 + (i * 53) % 200, 480 - i * 19, 3 + (i % 3) * 2, 0, 6.283); c.fill(); }   // 泡泡
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.45), new THREE.MeshBasicMaterial({ map: tex })); portal.position.set(0, 1.25, 0.01); g.add(portal);
  const box = (w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); };
  box(0.22, 2.62, 0.22, -0.86, 1.31, 0.08, wood); box(0.22, 2.62, 0.22, 0.86, 1.31, 0.08, wood); box(1.96, 0.24, 0.26, 0, 2.72, 0.08, wood);
  box(2.02, 0.04, 0.28, 0, 2.86, 0.08, brass); box(0.26, 0.04, 0.26, -0.86, 0.02, 0.08, brass); box(0.26, 0.04, 0.26, 0.86, 0.02, 0.08, brass);
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 128; const s2 = sc.getContext('2d');
  s2.fillStyle = '#1f6f98'; s2.fillRect(0, 0, 512, 128); s2.fillStyle = '#f4bf55'; s2.fillRect(0, 0, 512, 10); s2.fillRect(0, 118, 512, 10);
  s2.fillStyle = '#ffffff'; s2.font = '800 60px system-ui, "Microsoft JhengHei", sans-serif'; s2.textAlign = 'center'; s2.textBaseline = 'middle'; s2.fillText('潮汐海洋館', 256, 66, 480);
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: st, emissiveMap: st, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.35, roughness: 0.8 })); sign.position.set(0, 3.12, 0.1); g.add(sign);
  g.position.set(ARCH[0], 0, ARCH[1]); return (archG = g);
}
function signMesh(w, n, total, [x, y, z, ry, wd]) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const c = cv.getContext('2d');
  const full = total > 0 && n >= total;   // v8.3 捐齊的展區：名牌換成金色
  c.fillStyle = full ? '#fff3c8' : '#fbf4e6'; c.fillRect(0, 0, 512, 128); c.fillStyle = full ? '#d8a830' : w.color; c.fillRect(0, 0, 512, 14); c.fillRect(0, 114, 512, 14);
  c.fillStyle = '#5a4632'; c.font = '800 62px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(full ? `★ ${w.name} 全部捐齊` : `${w.name} ${n}/${total}`, 256, 66, 490);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wd || 1.6, (wd || 1.6) / 4), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25, roughness: 0.9 }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; signs.push(m); return m;
}
/** 進新館時呼叫（house.enter 的 dress）：回傳要擺進場景的圖卡與名牌 */
let placed = new Map(), spotList = [];
export function dress(ud) {
  undress();   // 捐贈後重擺（house.redress）：先釋放上一次的
  const s = S(), ex = ud.exhibits || {}, out = [], cards = [], plates = [];
  placed = new Map(); spotList = [];
  const me = (window.TA.S.profile || {}).name || '我';
  let first = null; WINGS.forEach(w => Object.entries(s.museum[w.k] || {}).forEach(([id, at]) => { if (typeof at === 'number' && (!first || at < first.at)) first = { k: w.k, id, at }; }));
  const pc = plateAtlas(); let pi = 0;
  WINGS.forEach(w => {
    const L2 = list(w.k), pos = ex[w.k] || [], got = s.museum[w.k] || {};
    L2.forEach((sp, i) => {
      const p = pos[i]; if (!p || !got[sp.id]) return;
      const [x, y, z] = p, ry = p[3] || 0, sz = p[4] || 0.42, t = p[5] || 0;
      const c = atlasCell(icon(sp.id, w.k)); if (c >= 0) cards.push([x, y, z, ry, sz, c, t]);
      placed.set(w.k + ':' + sp.id, [x, y, z]);
      spotList.push({ x, y: 0, z, r: 1.05, kind: 'hook:exhibit', label: `看看「${sp.name}」`, topic: { k: w.k, id: sp.id } });   // v8.3 走到展品前按 E 看這一件
      if (pi < PLATE_N) {
        const at = got[sp.id], d = typeof at === 'number' ? new Date(at) : null, mine = first && first.k === w.k && first.id === sp.id;
        const uv = drawPlate(pc, pi++, sp.name, mine ? `★ ${me}的第一件` : d ? `${d.getMonth() + 1}/${d.getDate()} 捐贈` : '', w.color);
        // 圖卡正下方有空位就掛在下面；排得很密的水族格、標本櫃（下面緊接著另一格）改成貼在圖卡下緣的一條名牌
        const ct = Math.cos(t), st = Math.sin(t), sx = Math.sin(ry), cx = Math.cos(ry), ph0 = sz * 1.15 * NL.ch / NL.cw;
        const tight = pos.some((q, j) => q && j !== i && Math.abs(q[0] - x) < sz && Math.abs(q[2] - z) < 0.35 && q[1] < y && y - q[1] < sz / 2 + (q[4] || 0.42) / 2 + ph0 + 0.05);
        const pw = tight ? sz : sz * 1.15, ph = pw * NL.ch / NL.cw, off = tight ? sz / 2 - ph / 2 : sz / 2 + ph / 2 + 0.03, f = tight ? 0.004 : 0;
        plates.push([x + off * sx * st + f * sx * ct, y - off * ct + f * st, z + off * cx * st + f * cx * ct, ry, pw, ph, t, ...uv]);
      }
    });
    const sg = (ud.wingSigns || {})[w.k]; if (sg) out.push(signMesh(w, L2.filter(x => got[x.id]).length, L2.length, sg));
  });
  if (cards.length) { const m = cardsMesh(cards); signs.push(m); out.push(m); }
  if (plates.length) { NL.tex.needsUpdate = true; const m = quads(plates, NL.mat); signs.push(m); out.push(m); }
  const th = themeStand(ud); if (th) { th.children.forEach(o => signs.push(o)); out.push(th); }
  if (window.TA.ISLE.INTERIORS && window.TA.ISLE.INTERIORS.aquarium) out.push(arch());   // v9.0 海洋館的拱門
  return out;
}
/** v8.3 這次進館的互動點：每件捐贈過的展品＋圓廳的特展台 */
export const spots = ud => { const t = ud && ud.themeAt || THEME_AT; return spotList.concat(themeNow() ? [{ x: t[0], y: 0, z: t[2], r: 1.2, kind: 'hook:theme', label: '看看本週小特展' }] : [], window.TA.ISLE.INTERIORS && window.TA.ISLE.INTERIORS.aquarium ? [{ x: ARCH[0], y: 0, z: ARCH[1] + 1, r: 1.0, kind: 'hook:aquarium', label: '走進海洋館' }] : []); };
/** 展品在館裡的位置（捐完指路用） */
export const where = (k, id) => placed.get(k + ':' + id) || null;
export const wingName = k => (WINGS.find(w => w.k === k) || {}).name || '';
/** 走到展品前按 E：這一件的名字、捐贈日期與說明 */
export async function exhibitCard(k, id) {
  const x = list(k).find(o => o.id === id), at = (S().museum[k] || {})[id]; if (!x) return;
  const d = typeof at === 'number' ? new Date(at) : null, w = WINGS.find(o => o.k === k);
  await ui.card({ icon: icon(id, k), title: x.name, sub: ui.esc(x.desc || ''), extra: `<span class="era">${w.name}展區 · ${ui.esc(infoOf(k, x))}</span>${d ? `<em>${d.getMonth() + 1}/${d.getDate()} 捐贈</em>` : ''}` });
}

/* ---------- v8.3 本週小特展：三件展品一個主題（data/museum_themes.js），湊齊就完成；圓廳有一座特展台 ---------- */
const THEME_AT = [0, 0, 2.7, 0];   // 中央走道、恐龍骨架前面，面向入口
const weekNo = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5 + 3) / 7); };
export function themeNow() { const T = (window.TA.ISLE.MUSEUM_THEMES || []).filter(t => t.items && t.items.every(([k, id]) => list(k).some(o => o.id === id))); return T.length ? T[weekNo() % T.length] : null; }
const themeGot = t => t.items.filter(([k, id]) => (S().museum[k] || {})[id]).length;
function themeStand(ud) {
  const t = themeNow(); if (!t) return null;
  const a = ud.themeAt || THEME_AT, cv = document.createElement('canvas'); cv.width = 512; cv.height = 640; const c = cv.getContext('2d');
  c.fillStyle = '#fbf4e6'; c.fillRect(0, 0, 512, 640); c.fillStyle = '#c9a05a'; c.fillRect(0, 0, 512, 16); c.fillRect(0, 624, 512, 16);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#8a6a4a'; c.font = '700 30px system-ui, "Microsoft JhengHei", sans-serif'; c.fillText('本週小特展', 256, 62);
  c.fillStyle = '#4a3a2a'; c.font = '800 40px system-ui, "Microsoft JhengHei", sans-serif'; c.fillText(t.title, 256, 122, 480);
  const n = themeGot(t); c.font = '700 28px system-ui, "Microsoft JhengHei", sans-serif'; c.fillStyle = n >= 3 ? '#b07a10' : '#8a6a4a'; c.fillText(n >= 3 ? '★ 三件都到齊了' : `館藏 ${n} / 3`, 256, 590);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  t.items.forEach(([k, id], i) => {   // 三格：捐了的畫圖示，還沒捐的畫問號
    const x = 46 + i * 150, y = 190, has = (S().museum[k] || {})[id]; c.fillStyle = has ? '#f1e2c0' : '#e6dccb'; c.fillRect(x, y, 120, 120);
    c.fillStyle = '#4a3a2a'; c.font = '700 22px system-ui, "Microsoft JhengHei", sans-serif'; const nm = (list(k).find(o => o.id === id) || {}).name || '';
    c.fillText(has ? nm : '？', x + 60, y + 150, 140);
    if (has) { const im = new Image(); im.onload = () => { c.imageSmoothingEnabled = false; c.drawImage(im, x + 12, y + 12, 96, 96); tex.needsUpdate = true; }; im.src = icon(id, k); }
    else { c.fillStyle = '#b9a88c'; c.font = '800 64px system-ui'; c.fillText('?', x + 60, y + 62); }
  });
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.7 });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.2), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.3, roughness: 0.9 }));
  board.scale.setScalar(0.85); board.position.set(0, 1.05, 0.035);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.06), wood); back.position.set(0, 1.05, 0);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 10), wood.clone()); post.position.set(0, 0.25, 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 20), wood.clone()); base.position.set(0, 0.03, 0);
  [board, back, post, base].forEach(o => { o.castShadow = o.receiveShadow = true; g.add(o); });
  g.position.set(a[0], 0, a[2]); g.rotation.y = a[3]; g.userData.solid = true; return g;
}
/** 特展台：主題介紹、三件展品（捐了的有說明）；第一次湊齊有謝禮與回憶 */
export async function openTheme(sp, hooks) {
  const t = themeNow(); if (!t) return;
  const s = S(), n = themeGot(t); s.themes = s.themes || {};
  const items = t.items.map(([k, id, cap]) => { const x = list(k).find(o => o.id === id) || {}, has = (s.museum[k] || {})[id]; return `<li>${has ? '✔' : '○'} <b>${ui.esc(x.name || id)}</b>（${wingName(k)}）${has ? `<br><small>${ui.esc(cap || '')}</small>` : '<br><small class="muted">還沒有捐贈——' + ui.esc(howTo(k)) + '</small>'}</li>`; }).join('');
  await ui.say(sp, t.intro);
  const body = ui.el('div', 'wb', `<p class="rt-sum-lead">${ui.esc(t.title)}</p><ul class="wb-list">${items}</ul><p class="muted">館藏 ${n} / 3 · 每週換一個主題；捐過的展品都算。</p>`);
  ui.closeDialog(); ui.panel('本週小特展', body, { cls: 'letter-p' });
  if (n >= 3 && !s.themes[t.id]) {
    s.themes[t.id] = Date.now(); s.bells += 1500; save(); Audio.sfx('catch');
    ui.toast(`小特展「${t.title}」完成！史遙送你 1,500 鈴錢`);
    if (hooks && hooks.memo) hooks.memo(`小特展「${t.title}」`, t.done);
    if (hooks && hooks.paint) hooks.paint();
  }
}
const howTo = k => ({ fish: '去釣魚', bug: '去捉蟲', fossil: '挖化石再請史遙鑑定', sea: '退潮時去潮池', mineral: '敲石頭、請岳鑑定礦石', marine: '穿上潛水衣去潛水' })[k] || '';
/** 出館：名牌的字與這次的圖卡網格每次重做，釋放掉（圖集留著下次用） */
export function undress() { signs.forEach(m => { m.geometry.dispose(); if (m.material !== ATL.mat && m.material !== NL.mat) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } }); signs = []; }
/** 離館時釋放這次建立的幾何與專屬材質（共用材質 M() 與圖示貼圖快取不釋放） */
function dispose() {
  if (!sc) return;
  sc.traverse(o => { if (o.isLight && o.shadow && o.shadow.map) o.shadow.dispose(); if (o === P || !o.isMesh) return; if (o.geometry) o.geometry.dispose(); const m = o.material; if (m && m.userData && m.userData.own) { if (m.userData.ownMap && m.map) m.map.dispose(); m.dispose(); } });
}
function leave() { ui.iris(); inside = false; U.uCurve.value = savedCurve || CURVE; document.body.classList.remove('in-trip'); mainScene.add(P); dispose(); sc = null; onExit && onExit(); Audio.sfx('open'); }
/** 展區範圍（玩家站在這裡就能打開該展區） */
const ZONES = [
  { k: 'fish', test: (x, z) => x < -HW + 2.2 && z < HD - 3 },
  { k: 'bug', test: (x, z) => x > HW - 2.2 && z < HD - 3 },
  { k: 'fossil', test: (x, z) => z < -HD + 3.6 && Math.abs(x) < HW - 2 },
  { k: 'sea', test: (x, z) => x < -2 && x > -HW + 1 && z > 0.6 && z < HD - 0.8 },
  { k: 'mineral', test: (x, z) => x > 2 && x < HW - 1 && z > 0.6 && z < HD - 0.8 }
];
const zone = () => P && ZONES.find(z => z.test(P.position.x, P.position.z));
/** 碰撞：牆、化石區、前方兩張展示桌（整塊擋住，桌邊就能打開展區） */
const TABLE = { z0: HD - 5.25, z1: HD - 3.0, hw: 2.85 };   // hw：展示桌半寬
const blockedAt = (x, z) => x < -HW + 0.6 || x > HW - 0.6 || z < -HD + 2.4 || (Math.abs(x) > 5.5 - TABLE.hw - 0.15 && Math.abs(x) < 5.5 + TABLE.hw + 0.15 && z > TABLE.z0 - 0.1 && z < TABLE.z1 + 0.1);   // 展示桌（和桌面同一組尺寸，留一點角色邊距）
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  if (moving && !locked) {
    ix /= len; iz /= len; const sp = run ? 4.4 : 2.6 * (0.3 + 0.7 * Math.min(1, len)), nx = P.position.x + ix * sp * dt, nz = P.position.z + iz * sp * dt;
    if (nz > HD - 0.45 && Math.abs(nx) < 0.9 && iz > 0) { leave(); return; }
    const cz = Math.min(HD - 0.35, nz);
    if (!blockedAt(nx, cz)) { P.position.x = nx; P.position.z = cz; } else if (!blockedAt(nx, P.position.z)) P.position.x = nx; else if (!blockedAt(P.position.x, cz)) P.position.z = cz;
    P.rotation.y = Math.atan2(ix, iz);
  }
  animate(P, dt, moving && !locked ? (run ? 2 : 1) : 0, t);
  const tx = P.position.x * 0.5, tz = P.position.z * 0.5 + 0.5, za = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.9 : 1;
  camPos.lerp(new THREE.Vector3(tx, 13.5 * za, tz + 12 * za), Math.min(1, dt * 3)); camera.position.copy(camPos); camera.lookAt(tx, 0.6, tz - 0.5);
  // 和家裡一樣走後製：牆角與展示台下的環境光遮蔽、吊燈的泛光、暈影；景深對焦在角色身上
  const fx = post.fx, dof0 = fx.dof, ao0 = fx.ao;
  fx.golden = 0.25; fx.clear = 1; fx.sunVis = 0; fx.night = 0; fx.focus = camera.position.distanceTo(P.position); fx.dof = dof0 * 0.45; fx.ao = ao0 * 1.5;
  post.render(t, sc, camera);
  fx.dof = dof0; fx.ao = ao0;
}
export const hint = () => { if (Math.abs(P.position.x) < 1 && P.position.z > HD - 1.4) return '往下走出博物館'; const z = zone(); return z ? `看${WINGS.find(w => w.k === z.k).name}展區` : ''; };
export function handler() { const z = zone(); return z ? () => openWing(z.k) : null; }
const infoOf = (k, x) => k === 'fossil' ? `鑑定科目：${(window.TA.subject(x.sid) || {}).name || ''}` : k === 'mineral' ? `莫氏硬度 ${x.mohs} · ${stars(x.rarity)}` : `${whereName(k, x)}${x.weather === 'rain' ? '（雨天限定）' : ''} · ${k === 'sea' ? '退潮時' : fmtHours(x) + ' · ' + fmtMonths(x)} · ${stars(x.rarity)}`;
export async function openWing(k) {
  const w = WINGS.find(x => x.k === k), s = S(), L2 = list(k), got = L2.filter(x => s.museum[k] && s.museum[k][x.id]);
  const body = ui.el('div', 'dex'), grid = ui.el('div', 'dex-grid'), info = ui.el('div', 'dex-info', `<small class="muted">${w.name}展區館藏 ${got.length} / ${L2.length}。點展品看說明；灰色的是還沒捐贈的。</small>`);
  L2.forEach(x => {
    const has = s.museum[k] && s.museum[k][x.id], b = ui.el('button', 'dex-cell' + (has ? ' donated' : ' unknown'), `<img src="${icon(x.id, k)}" alt="">`); b.type = 'button';
    b.onclick = () => { info.innerHTML = has ? `<div class="pk-sel"><img src="${icon(x.id, k)}" alt=""><div><b>${ui.esc(x.name)} <small>${ui.esc(x.en || '')}</small></b><small>${infoOf(k, x)}</small><p>${ui.esc(x.desc || '')}</p>${x.habitat ? `<p><b>自然棲地：</b>${ui.esc(x.habitat)}</p>` : ''}</div></div>` : k === 'sea' && !x.price ? '<small class="muted">保育類，不採集：在潮池答對海洋題、拍照記錄後，照片就會展示在這裡。</small>' : '<small class="muted">還沒有人捐贈這件展品。取得後交給史遙吧！</small>'; };
    grid.appendChild(b);
  });
  body.append(grid, info); ui.panel(`潮汐博物館 · ${w.name}展區`, body, { cls: 'dexp' });
}
