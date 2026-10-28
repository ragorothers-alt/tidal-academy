/* 潮汐小島 · 畫面右上角的小地圖。
   底圖：開始遊戲後把整座島畫成一張手繪水彩風的地圖（依實際扭曲後的地形逐點取樣：海的深淺、浪花、沙灘、草地、高台的陰影與崖邊、
   河、樹、房子），之後只在建築變動時重畫。
   每幾格更新：以玩家為中心裁出一塊（北方朝上），疊上鏡頭的視野扇形、島民圓點、玩家箭頭，以及所在區域的名稱。
   點小地圖打開手機的大地圖；＋／－切換三種縮放（記在存檔）。 */
import { N, C, T, HT, tileAt, groundAt, isBridge } from './terrain.js';
import { trees, rocks, homes, SITES, PIER } from './props.js';

const PX = 8;   // 底圖每公尺幾個像素
const SIZE = N * PX;
const ZOOMS = [13, 20, 30];   // 小地圖半徑涵蓋幾公尺
let base = null, painting = false, el = null, cv = null, ctx = null, nameEl = null, opts = null, zoomI = 1, timer = 0, dirty = true;

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/* 地圖配色（水彩感：低飽和、偏暖） */
const COL = {
  deep: hex('#5b9ec9'), sea: hex('#7cc3d8'), shallow: hex('#a9e0dc'), foam: hex('#f4fbf6'),
  sand: hex('#efe0b4'), grass: hex('#a5cf7e'), high: hex('#8dbd68'), peak: hex('#79ad58'),
  river: hex('#79c8dc'), ramp: hex('#d7c193'), bridge: hex('#c9a06a'), cliff: hex('#8c6a4a'), cliffLit: hex('#b48d63'),
  paper: hex('#f7efd9'),
};

/** 把整座島畫進 base 畫布（插畫地圖風：水彩地面、往南露出的崖壁、小樹與小房子的圖示） */
/* 分段進行（每段之後讓出主執行緒），畫完才換上新的底圖，遊戲不會卡一下 */
const yieldMain = () => new Promise(r => setTimeout(r, 0));
async function paintBase(PX) {   // PX：每公尺幾個像素（先畫一張粗的，很快就有地圖；再畫正式的）
  const SIZE = N * PX, yieldNow = PX <= 2 ? () => null : yieldMain;   // 粗的那張很小，一口氣畫完（讓出主執行緒反而要排在載入模型後面等好幾秒）
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = SIZE;
  const c = cvs.getContext('2d'), img = c.createImageData(SIZE, SIZE), d = img.data;
  // 先逐點取樣地形（以像素中心的世界座標，地形扭曲後的實際格子）
  const tile = new Int8Array(SIZE * SIZE), hgt = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) { if (y % 48 === 47) await yieldNow(); for (let x = 0; x < SIZE; x++) {
    const wx = (x + 0.5) / PX - C, wz = (y + 0.5) / PX - C, i = y * SIZE + x;
    tile[i] = tileAt(wx, wz); hgt[i] = tile[i] < 0 ? -1 : groundAt(wx, wz);
  } }
  // 去鋸齒：格子取樣會有一階一階的邊，用多數決濾波（每點取周圍方窗裡最多的地形）把轉角削圓，和 3D 地形的去階梯一致
  {
    const R = Math.round(PX * 0.45), cls = [-1, 0, 1, 2, 3, 4, 5, 6, 7], cnt = new Int32Array((SIZE + 1) * (SIZE + 1)), best = new Int32Array(SIZE * SIZE), win = new Int8Array(SIZE * SIZE).fill(-2);
    for (const k of cls) {
      await yieldNow(); cnt.fill(0);
      for (let y = 0; y < SIZE; y++) { let row = 0; for (let x = 0; x < SIZE; x++) { row += tile[y * SIZE + x] === k ? 1 : 0; cnt[(y + 1) * (SIZE + 1) + x + 1] = cnt[y * (SIZE + 1) + x + 1] + row; } }
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const x0 = Math.max(0, x - R), x1 = Math.min(SIZE, x + R + 1), y0 = Math.max(0, y - R), y1 = Math.min(SIZE, y + R + 1);
        const n = cnt[y1 * (SIZE + 1) + x1] - cnt[y0 * (SIZE + 1) + x1] - cnt[y1 * (SIZE + 1) + x0] + cnt[y0 * (SIZE + 1) + x0], i = y * SIZE + x;
        if (n > best[i]) { best[i] = n; win[i] = k; }
      }
    }
    for (let i = 0; i < SIZE * SIZE; i++) if (win[i] !== tile[i]) { tile[i] = win[i]; hgt[i] = win[i] < 0 ? -1 : win[i] === 4 || win[i] === 7 ? hgt[i] : HT[win[i]]; }
  }
  // 海到陸地的距離（粗略的兩趟掃描），用來畫海的深淺與浪花
  const dist = new Float32Array(SIZE * SIZE).fill(1e4);
  for (let i = 0; i < SIZE * SIZE; i++) if (tile[i] >= 0) dist[i] = 0;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) { const i = y * SIZE + x; if (x) dist[i] = Math.min(dist[i], dist[i - 1] + 1); if (y) dist[i] = Math.min(dist[i], dist[i - SIZE] + 1); }
  for (let y = SIZE - 1; y >= 0; y--) for (let x = SIZE - 1; x >= 0; x--) { const i = y * SIZE + x; if (x < SIZE - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1); if (y < SIZE - 1) dist[i] = Math.min(dist[i], dist[i + SIZE] + 1); }
  const FACE = Math.round(PX * 0.85);   // 崖壁在地圖上露出的高度（每公尺落差幾個像素）
  for (let y = 0; y < SIZE; y++) { if (y % 64 === 63) await yieldNow(); for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x, t = tile[i], n = vnoise(x * 0.06, y * 0.06) * 0.6 + vnoise(x * 0.23, y * 0.23) * 0.4;
    let col;
    if (t < 0) {
      const k = Math.min(1, dist[i] / (PX * 8));
      col = k < 0.25 ? mix(COL.shallow, COL.sea, k / 0.25) : mix(COL.sea, COL.deep, (k - 0.25) / 0.75);
      const wave = Math.max(0, 1 - Math.abs(((x * 0.7 + y * 0.35 + vnoise(x * 0.05, y * 0.05) * 30) % 26) - 13) / 1.2) * smoothstep(PX * 2, PX * 6, dist[i]) * 0.25;   // 遠海一道道淡淡的波紋
      col = mix(col, COL.foam, wave);
      const fo = Math.max(0, 1 - Math.abs(dist[i] - PX * 0.7) / (PX * 0.6)) * (0.55 + 0.45 * vnoise(x * 0.3, y * 0.3));
      col = mix(col, COL.foam, fo * 0.9);   // 沿岸一圈浪花
    } else {
      const tx = Math.floor((x + 0.5) / PX), tz = Math.floor((y + 0.5) / PX), h = hgt[i];
      col = t === 0 ? COL.sand : t === 3 || t === 6 ? COL.river : t === 4 || t === 7 ? COL.ramp : t === 5 ? COL.peak : t === 2 ? COL.high : COL.grass;
      if (t === 3 || t === 6) col = mix(COL.river, COL.sea, smoothstep(0.3, 0.7, vnoise(x * 0.08, y * 0.08)) * 0.4);
      if (isBridge(tx, tz)) col = COL.bridge;
      // 崖壁：北邊緊鄰的地面比這裡高，就是一面朝南、看得到的崖壁（褐色、有直條紋與頂端的草邊）
      let face = 0, top = 0;
      for (let k = 1; k <= FACE * 2; k++) { const yy = y - k; if (yy < 0) break; const hh = hgt[yy * SIZE + x]; if (hh > h + 0.5) { const fh = Math.min(FACE * 2, Math.round((hh - h) * FACE * 0.55)); if (k <= fh) { face = k / fh; top = hh; } break; } }
      if (face > 0 && t !== 3 && t !== 6) {
        const streak = 0.85 + 0.15 * vnoise(x * 0.9, y * 0.12);
        col = mix(COL.cliff, COL.cliffLit, face * 0.6).map(v => v * streak);
        if (face > 0.82) col = mix(col, COL.high, 0.85);   // 崖頂垂下的草
      } else {
        const hs = hgt[Math.min(SIZE - 1, y + 2) * SIZE + Math.max(0, x - 2)];
        if (hs > h + 0.5) col = col.map(v => v * 0.82);   // 西南方的高地把陰影投在這裡
      }
      // 草地上的明暗斑與小花點
      if (t === 1 || t === 2 || t === 5) { col = col.map(v => v * (0.93 + vnoise(x * 0.14 + 7, y * 0.14) * 0.12)); if (hash(x * 3, y * 5) > 0.996) col = mix(col, [255, 240, 245], 0.7); }
    }
    col = col.map(v => v * (0.95 + n * 0.08));   // 水彩的濃淡
    const p = hash(x, y) * 5 - 2.5;   // 紙的顆粒
    d[i * 4] = col[0] + p; d[i * 4 + 1] = col[1] + p; d[i * 4 + 2] = col[2] + p; d[i * 4 + 3] = 255;
  } }
  c.putImageData(img, 0, 0);
  const W = (x, z) => [(x + C) * PX, (z + C) * PX];
  c.lineJoin = 'round';
  // 棧橋：木板條
  { const [x0, z0] = W(PIER.x - 0.9, PIER.z - 0.2), [x1, z1] = W(PIER.x + 0.9, PIER.z + PIER.len); c.fillStyle = '#b98a55'; c.fillRect(x0, z0, x1 - x0, z1 - z0); c.strokeStyle = 'rgba(90,60,30,.45)'; c.lineWidth = 1; for (let yy = z0; yy < z1; yy += PX * 0.5) { c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke(); } }
  // 石頭
  rocks.forEach(r => { const [x, y] = W(r.x, r.z), s = r.s * PX * 0.5; c.fillStyle = 'rgba(60,50,40,.25)'; c.beginPath(); c.ellipse(x + 1, y + 2, s * 1.1, s * 0.7, 0, 0, 7); c.fill(); c.fillStyle = '#a8a196'; c.beginPath(); c.ellipse(x, y, s * 1.1, s * 0.8, 0, 0, 7); c.fill(); c.fillStyle = '#c9c3b6'; c.beginPath(); c.ellipse(x - s * 0.3, y - s * 0.3, s * 0.5, s * 0.35, 0, 0, 7); c.fill(); });
  // 樹：由北往南畫，南邊的樹蓋在北邊的樹上（像俯視的插畫）
  [...trees].sort((a, b) => a.z - b.z).forEach(t => {
    const [x, y] = W(t.x, t.z), s = t.s * PX;
    c.fillStyle = 'rgba(40,60,30,.28)'; c.beginPath(); c.ellipse(x + s * 0.25, y + s * 0.35, s * 0.8, s * 0.42, 0, 0, 7); c.fill();   // 影子
    if (t.kind === 'cedar') {   // 杉樹：深綠的三角樹冠
      c.fillStyle = '#3f7a48'; c.beginPath(); c.moveTo(x, y - s * 1.35); c.lineTo(x + s * 0.62, y + s * 0.15); c.lineTo(x - s * 0.62, y + s * 0.15); c.closePath(); c.fill();
      c.fillStyle = '#5c9a5a'; c.beginPath(); c.moveTo(x, y - s * 1.35); c.lineTo(x - s * 0.62, y + s * 0.15); c.lineTo(x - s * 0.05, y + s * 0.05); c.closePath(); c.fill();
    } else if (t.kind === 'palm') {   // 椰子樹：放射狀的葉子
      c.strokeStyle = '#6f9e48'; c.lineWidth = Math.max(1.5, s * 0.22); c.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; c.beginPath(); c.moveTo(x, y - s * 0.4); c.quadraticCurveTo(x + Math.cos(a) * s * 0.55, y - s * 0.4 + Math.sin(a) * s * 0.4 - s * 0.25, x + Math.cos(a) * s * 0.85, y - s * 0.4 + Math.sin(a) * s * 0.6); c.stroke(); }
    } else {   // 闊葉樹（櫻花樹偏粉）：圓圓的樹冠，左上受光
      const col = t.kind === 'pink' ? ['#d98fa8', '#f2bccc'] : ['#5f9a4e', '#86bd68'];
      c.fillStyle = col[0]; c.beginPath(); c.arc(x, y - s * 0.35, s * 0.72, 0, 7); c.fill();
      c.fillStyle = col[1]; c.beginPath(); c.arc(x - s * 0.2, y - s * 0.55, s * 0.42, 0, 7); c.fill();
    }
  });
  // 房子：小小的立體房子（牆＋屋頂），屋頂用實際的顏色
  const hut = (x, z, w, roof, kind) => {
    const [px, py] = W(x, z), s = w * PX;
    c.fillStyle = 'rgba(60,40,25,.3)'; c.beginPath(); c.ellipse(px + s * 0.12, py + s * 0.42, s * 0.62, s * 0.22, 0, 0, 7); c.fill();
    if (kind === 'tower') {   // 燈塔：白色塔身、紅色塔頂
      c.fillStyle = '#fbf6ec'; c.strokeStyle = '#6b4f3a'; c.lineWidth = 1.2; c.beginPath(); c.rect(px - s * 0.22, py - s * 0.9, s * 0.44, s * 1.25); c.fill(); c.stroke();
      c.fillStyle = roof; c.fillRect(px - s * 0.22, py - s * 0.45, s * 0.44, s * 0.16);
      c.beginPath(); c.moveTo(px - s * 0.3, py - s * 0.9); c.lineTo(px, py - s * 1.25); c.lineTo(px + s * 0.3, py - s * 0.9); c.closePath(); c.fill(); c.stroke();
      return;
    }
    c.fillStyle = '#fbf3e2'; c.strokeStyle = '#6b4f3a'; c.lineWidth = 1.2;
    c.beginPath(); c.rect(px - s * 0.42, py - s * 0.1, s * 0.84, s * 0.45); c.fill(); c.stroke();   // 牆
    c.fillStyle = '#8a5a3b'; c.fillRect(px - s * 0.07, py + s * 0.08, s * 0.14, s * 0.27);   // 門
    c.fillStyle = roof; c.beginPath(); c.moveTo(px - s * 0.52, py - s * 0.08); c.lineTo(px - s * 0.3, py - s * 0.55); c.lineTo(px + s * 0.3, py - s * 0.55); c.lineTo(px + s * 0.52, py - s * 0.08); c.closePath(); c.fill(); c.stroke();   // 屋頂
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.moveTo(px - s * 0.3, py - s * 0.55); c.lineTo(px, py - s * 0.55); c.lineTo(px - s * 0.12, py - s * 0.08); c.lineTo(px - s * 0.52, py - s * 0.08); c.closePath(); c.fill();
    if (kind === 'shop') { for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#fffaf0' : '#e2604f'; c.fillRect(px - s * 0.42 + k * s * 0.21, py - s * 0.12, s * 0.21, s * 0.1); } }
  };
  const list = homes.map(h => [h.x, h.z, 2.6 * (h.s || 1), h.roof || '#ef6f5e']);
  [['museum', 5.2, '#4f6fc0'], ['shop', 3.6, '#5fbf7a', 'shop'], ['library', 3.4, '#7a6fc9'], ['exam', 3.4, '#4f8fd8'], ['lighthouse', 2.2, '#e2604f', 'tower']].forEach(([k, w, col, kind]) => { const s = SITES[k]; if (s) list.push([s.x, s.z, w, col, kind]); });
  const hotelOf = (opts && opts.hotel) || preHotel; if (hotelOf) { const h = hotelOf(); if (h) list.push([h.x, h.z, 4.4, '#3f9fd8']); }   // 預先畫的時候還沒有 opts
  list.sort((a, b) => a[1] - b[1]).forEach(a => hut(...a));
  base = cvs; base.px = PX;
}

/** 目前所在區域的名稱 */
function areaName(x, z) {
  const near = (s, r) => s && Math.hypot(x - s.x, z - s.z) < r;
  if (near(SITES.museum, 6)) return '博物館';
  if (near(SITES.lighthouse, 5)) return '燈塔';
  if (near(SITES.shop, 5)) return '潮汐商店';
  if (near(SITES.library, 5)) return '潮汐圖書館';
  if (near(SITES.exam, 5)) return '潮汐考場';
  if (opts.hotel) { const h = opts.hotel(); if (near(h, 6)) return '渡假飯店'; }
  if (near(SITES.telescope, 4)) return '觀星台';
  if (near(SITES.shrine, 5)) return '山頂祠堂';
  if (near(SITES.gate, 5)) return '星環城門';
  if (Math.abs(x - PIER.x) < 2 && z > PIER.z - 1) return '棧橋';
  const t = tileAt(x, z);
  if (t === 0) return '沙灘';
  if (t === 5) return '山頂';
  if (Math.hypot(x - opts.plaza[0], z - opts.plaza[1]) < 8) return '噴泉廣場';
  if (t === 2 && x < -14) return '西部高地';
  if (t === 2) return '學院台地';
  if (t === 3 || t === 6) return '小河';
  if (homes.some(h => Math.hypot(x - h.x, z - h.z) < 4)) return '住宅區';
  return '草原';
}

/** 建立小地圖。o：{ player, villagers, camera, plaza, hotel, onOpen } */
export function init(o) {
  opts = o;
  el = document.createElement('div'); el.className = 'minimap'; el.id = 'minimap';
  el.innerHTML = `<div class="mini-ring"><canvas></canvas><i class="mini-n">N</i></div><div class="mini-zoom"><button type="button" data-z="-1" title="放大" aria-label="放大小地圖">＋</button><button type="button" data-z="1" title="縮小" aria-label="縮小小地圖">－</button></div><div class="mini-name"></div>`;
  document.body.appendChild(el); document.body.classList.add('has-minimap');
  cv = el.querySelector('canvas'); ctx = cv.getContext('2d'); nameEl = el.querySelector('.mini-name');
  zoomI = Math.max(0, Math.min(2, (o.S().mmZoom ?? 1)));
  el.querySelectorAll('.mini-zoom button').forEach(b => b.onclick = e => { e.stopPropagation(); zoomI = Math.max(0, Math.min(2, zoomI + +b.dataset.z)); o.S().mmZoom = zoomI; timer = 1; });
  el.querySelector('.mini-ring').onclick = () => o.onOpen && o.onOpen();
}
/** 建築、地形改變時呼叫，下一次更新時重畫底圖 */
export const invalidate = () => { dirty = true; };
/** 島的佈置排好就先在背景畫底圖（玩家還在標題畫面時），按下開始時小地圖已經畫好，不用等開場最忙的那幾秒 */
let preHotel = null;
export function prepaint(hotel) {
  preHotel = hotel || null; if (painting || base) return;
  dirty = false; painting = true;
  (async () => { await paintBase(2); await paintBase(PX); })().catch(e => { console.warn('小地圖底圖失敗：', e); dirty = true; }).finally(() => { painting = false; });   // 失敗就讓 update 再畫一次
}

/** 每格呼叫；實際每 0.1 秒畫一次 */
export function update(dt, show) {
  if (!el) return;
  el.hidden = !show; if (!show) return;
  timer += dt; if (timer < 0.1) return; timer = 0;
  if (dirty && !painting) { dirty = false; painting = true; (async () => { if (!base) await paintBase(2); await paintBase(PX); })().catch(e => console.warn('小地圖底圖失敗：', e)).finally(() => { painting = false; timer = 1; }); }   // 第一次：先畫粗的（約十六分之一的工作量），馬上有地圖可看
  const dpr = Math.min(2, window.devicePixelRatio || 1), css = cv.clientWidth || 160, S = Math.round(css * dpr);
  if (cv.width !== S) { cv.width = cv.height = S; }
  const p = opts.player.position, R = ZOOMS[zoomI], k = S / (R * 2);   // k：小地圖上每公尺幾個像素
  const toMap = (x, z) => [S / 2 + (x - p.x) * k, S / 2 + (z - p.z) * k];
  ctx.save(); ctx.clearRect(0, 0, S, S);
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, 7); ctx.clip();
  ctx.fillStyle = '#5b9ec9'; ctx.fillRect(0, 0, S, S);
  ctx.imageSmoothingEnabled = true;
  if (base) { const bp = base.px; ctx.drawImage(base, (p.x - R + C) * bp, (p.z - R + C) * bp, R * 2 * bp, R * 2 * bp, 0, 0, S, S); }   // 底圖還在畫的時候先只有海的顏色
  // 鏡頭的視野：從玩家往鏡頭看的方向張開的淡色扇形
  const dir = opts.camera.getWorldDirection(opts.tmp), a = Math.atan2(dir.z, dir.x), fov = 0.75;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.46);
  g.addColorStop(0, 'rgba(255,252,235,.7)'); g.addColorStop(0.6, 'rgba(255,252,235,.38)'); g.addColorStop(1, 'rgba(255,252,235,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(S / 2, S / 2); ctx.arc(S / 2, S / 2, S * 0.46, a - fov, a + fov); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,252,235,.75)'; ctx.lineWidth = 1.5 * dpr; ctx.setLineDash([3 * dpr, 3 * dpr]); [a - fov, a + fov].forEach(e => { ctx.beginPath(); ctx.moveTo(S / 2, S / 2); ctx.lineTo(S / 2 + Math.cos(e) * S * 0.36, S / 2 + Math.sin(e) * S * 0.36); ctx.stroke(); }); ctx.setLineDash([]);   // 視野兩側的虛線
  // 島民
  opts.villagers.forEach(v => {
    if (!v.mesh || !v.mesh.visible) return;
    const [x, y] = toMap(v.mesh.position.x, v.mesh.position.z); if (Math.hypot(x - S / 2, y - S / 2) > S / 2 - 4 * dpr) return;
    ctx.fillStyle = v.color || '#ffb3c8'; ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); ctx.arc(x, y, 4 * dpr, 0, 7); ctx.fill(); ctx.stroke();
  });
  // 玩家：白邊的珊瑚色箭頭，指向角色面向
  const ry = opts.player.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry), ang = Math.atan2(fz, fx);
  ctx.translate(S / 2, S / 2); ctx.rotate(ang);
  const L = 9 * dpr;
  ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(-L * 0.75, L * 0.68); ctx.lineTo(-L * 0.35, 0); ctx.lineTo(-L * 0.75, -L * 0.68); ctx.closePath();
  ctx.fillStyle = '#ff7a5a'; ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2.5 * dpr; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill();
  ctx.restore();
  // 邊緣淡淡的暈影，像水彩紙
  const vg = ctx.createRadialGradient(S / 2, S / 2, S * 0.35, S / 2, S / 2, S / 2);
  vg.addColorStop(0, 'rgba(120,90,50,0)'); vg.addColorStop(1, 'rgba(120,90,50,.22)');
  ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, 7); ctx.fill();
  const nm = areaName(p.x, p.z); if (nameEl.textContent !== nm) nameEl.textContent = nm;
}
/** 手機的大地圖：整張插畫底圖（裁掉外圍的海）＋呼叫端畫的標記；底圖還沒畫好就回傳 null */
export function drawFull(out, marks) {
  if (!base) return null;
  const bp = base.px, m = 5 * bp, w = N * bp - m * 2; out.width = out.height = 640;   // 底圖可能還是粗的那張：依它自己的解析度換算
  const c = out.getContext('2d'); c.drawImage(base, m, m, w, w, 0, 0, 640, 640);
  const k = 640 / w, P = (x, z) => [((x + C) * bp - m) * k, ((z + C) * bp - m) * k];
  marks(P, c);
  return out;
}
