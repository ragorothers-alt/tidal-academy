/* 潮汐小島 · 島嶼設計：在戶外的格子上鋪步道、種花圃、放籬笆／路燈／長椅（花鈴錢），存檔為 { "x,z": id }。 */
import * as THREE from 'three';
import * as grass from './grass.js';
import { scene, camera, M, mesh, nightMats } from './engine.js';
import * as glow from './glow.js';
import { C, T, tileAt, groundAt, isBridge, terrain } from './terrain.js';
import { colliders, blocked, SITES, homes } from './props.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
import * as ledger from './ledger.js';

export const ITEMS = [
  { id: 'p_stone', name: '石板步道', price: 100, kind: 'path', c: '#cfc6b6', c2: '#b8ad9b' },
  { id: 'p_brick', name: '紅磚步道', price: 120, kind: 'path', c: '#c8735a', c2: '#a85a44' },
  { id: 'p_wood', name: '木棧步道', price: 120, kind: 'path', c: '#c99a62', c2: '#a87a48' },
  { id: 'p_sand', name: '細沙小徑', price: 80, kind: 'path', c: '#efdcab', c2: '#e2cc94' },
  { id: 'f_red', name: '紅花圃', price: 200, kind: 'flower', c: '#ff5a6a' },
  { id: 'f_yellow', name: '黃花圃', price: 200, kind: 'flower', c: '#ffd23f' },
  { id: 'f_white', name: '白花圃', price: 200, kind: 'flower', c: '#ffffff' },
  { id: 'f_purple', name: '紫花圃', price: 200, kind: 'flower', c: '#a87aff' },
  { id: 'f_pink', name: '粉花圃', price: 200, kind: 'flower', c: '#ff9fc8' },
  { id: 'hedge', name: '矮樹籬', price: 300, kind: 'hedge', c: '#4fa64a', solid: true },
  { id: 'fence', name: '木籬笆', price: 200, kind: 'fence', c: '#e8d2b0', solid: true },
  { id: 'lamp', name: '庭園燈', price: 1500, kind: 'lamp', c: '#4a4f5c', solid: true },
  { id: 'bench', name: '長椅', price: 1200, kind: 'bench', c: '#c48a54', solid: true }
];
export const item = id => ITEMS.find(x => x.id === id);
/** 島嶼設計清單的小圖示（畫一次就快取成 dataURL）：步道畫出鋪面花紋，其他畫出物件的樣子 */
const ICON = {};
function swatch(it) {
  if (ICON[it.id]) return ICON[it.id];
  const S2 = 96, cv = document.createElement('canvas'); cv.width = cv.height = S2; const g = cv.getContext('2d');
  const rr = (x, y, w, h, r, fill) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fillStyle = fill; g.fill(); };
  let seed = it.id.length * 97; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  if (it.kind === 'path') {
    rr(0, 0, S2, S2, 22, it.c2); g.save(); g.beginPath(); g.roundRect ? g.roundRect(0, 0, S2, S2, 22) : g.rect(0, 0, S2, S2); g.clip();
    if (it.id === 'p_stone') for (let y = 0; y < 4; y++) for (let x = -1; x < 4; x++) rr(x * 28 + (y % 2) * 14 + 3, y * 24 + 3, 24, 19, 6, `hsl(38, 12%, ${70 + rnd() * 12}%)`);
    else if (it.id === 'p_brick') for (let y = 0; y < 6; y++) for (let x = -1; x < 4; x++) rr(x * 28 + (y % 2) * 14 + 2, y * 16 + 2, 25, 13, 2, `hsl(14, 48%, ${50 + rnd() * 10}%)`);
    else if (it.id === 'p_wood') for (let x = 0; x < 5; x++) { rr(x * 20 + 1, -4, 18, S2 + 8, 3, `hsl(32, 45%, ${54 + rnd() * 10}%)`); g.fillStyle = 'rgba(90,55,25,0.35)'; g.fillRect(x * 20 + 1, 20 + rnd() * 50, 18, 2); }
    else { g.fillStyle = it.c; g.fillRect(0, 0, S2, S2); for (let i = 0; i < 140; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(160,120,60,0.35)'; g.fillRect(rnd() * S2, rnd() * S2, 2, 2); } }
    g.restore();
  } else {
    rr(0, 0, S2, S2, 22, '#d9efc4');   // 草地底色
    if (it.kind === 'flower') {
      for (let k = 0; k < 7; k++) { const cx = 20 + rnd() * 56, cy = 22 + rnd() * 52, r = 9 + rnd() * 3; g.fillStyle = it.c; for (let a = 0; a < 5; a++) { g.beginPath(); g.ellipse(cx + Math.cos(a * 1.257) * r * 0.6, cy + Math.sin(a * 1.257) * r * 0.6, r * 0.55, r * 0.38, a * 1.257, 0, 6.283); g.fill(); } g.fillStyle = '#ffcf3a'; g.beginPath(); g.arc(cx, cy, r * 0.3, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.08)'; g.stroke(); }
    } else if (it.kind === 'hedge') {
      [[30, 56, 22], [52, 46, 26], [70, 58, 20], [46, 64, 22]].forEach(([x, y, r], i) => { g.fillStyle = ['#3f8f3c', '#4fa64a', '#5bb453', '#47993f'][i]; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); });
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(48, 36, 10, 0, 6.283); g.fill();
    } else if (it.kind === 'fence') {
      g.fillStyle = '#b89a72'; g.fillRect(10, 44, 76, 8); g.fillRect(10, 64, 76, 8);
      for (let x = 0; x < 4; x++) { g.fillStyle = it.c; g.beginPath(); g.moveTo(14 + x * 20, 82); g.lineTo(14 + x * 20, 30); g.lineTo(21 + x * 20, 22); g.lineTo(28 + x * 20, 30); g.lineTo(28 + x * 20, 82); g.closePath(); g.fill(); g.strokeStyle = 'rgba(120,90,50,0.35)'; g.stroke(); }
    } else if (it.kind === 'lamp') {
      g.fillStyle = it.c; g.fillRect(44, 34, 8, 50); rr(36, 80, 24, 7, 3, it.c);
      const grd = g.createRadialGradient(48, 26, 2, 48, 26, 26); grd.addColorStop(0, 'rgba(255,240,180,0.95)'); grd.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = grd; g.fillRect(16, 0, 64, 56);
      g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(48, 26, 11, 0, 6.283); g.fill(); g.fillStyle = it.c; g.fillRect(40, 12, 16, 4);
    } else {   // 長椅
      rr(14, 34, 68, 12, 3, '#a8703f'); rr(14, 50, 68, 12, 3, it.c); g.fillStyle = '#3a3f4a'; g.fillRect(20, 46, 5, 30); g.fillRect(71, 46, 5, 30); g.fillRect(20, 30, 5, 18); g.fillRect(71, 30, 5, 18);
    }
  }
  return (ICON[it.id] = cv.toDataURL());
}
const data = () => { const s = S(); s.design = s.design || {}; return s.design; };
const group = new THREE.Group(); scene.add(group);
const built = {};   // key → {obj, col, light}

function build(k, id) {
  const it = item(id); if (!it) return;
  const [tx, tz] = k.split(',').map(Number), x = tx - C + 0.5, z = tz - C + 0.5, y = groundAt(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z);
  const h = (tx * 7 + tz * 13) % 5;
  if (it.kind === 'path') {
    const base = mesh(new THREE.BoxGeometry(0.98, 0.05, 0.98), M(it.c), 0, 0.02, 0, { noCast: true }); g.add(base);
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(0.3, 0.052, 0.04), M(it.c2), -0.3 + ((h + i * 2) % 5) * 0.15, 0.025, -0.3 + i * 0.3, { noCast: true }));
  } else if (it.kind === 'flower') {
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), M('#7a5238'), 0, 0.06, 0, { noCast: true }), mesh(new THREE.BoxGeometry(0.8, 0.04, 0.8), M('#5a3a24'), 0, 0.12, 0, { noCast: true }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + h, r = i % 2 ? 0.25 : 0.14; g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4), M('#4f9a3a'), Math.cos(a) * r, 0.22, Math.sin(a) * r, { noCast: true }), mesh(new THREE.SphereGeometry(0.08, 8, 6), M(it.c), Math.cos(a) * r, 0.34, Math.sin(a) * r)); }
  } else if (it.kind === 'hedge') {
    const b = mesh(new THREE.BoxGeometry(0.95, 0.7, 0.95), M(it.c, {}, 'sway'), 0, 0.35, 0); g.add(b);
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(0.22, 8, 6), M('#5cb85c', {}, 'sway'), -0.3 + i * 0.2, 0.7, (i % 2 - 0.5) * 0.3));
  } else if (it.kind === 'fence') {
    [-0.4, 0.4].forEach(px => g.add(mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), M(it.c), px, 0.35, 0)));
    [0.25, 0.5].forEach(py => g.add(mesh(new THREE.BoxGeometry(0.98, 0.08, 0.06), M(it.c), 0, py, 0)));
  } else if (it.kind === 'lamp') {
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 8), M(it.c), 0, 0.8, 0));
    const head = M('#fff6d8', { emissive: new THREE.Color('#ffc870'), emissiveIntensity: 0 }); if (!nightMats.includes(head)) nightMats.push(head);
    g.add(mesh(new THREE.SphereGeometry(0.18, 12, 8), head, 0, 1.7, 0));
  } else if (it.kind === 'bench') {
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.07, 0.4), M(it.c), 0, 0.42, 0), mesh(new THREE.BoxGeometry(0.9, 0.3, 0.05), M(it.c), 0, 0.62, -0.18));
    [-0.38, 0.38].forEach(bx => g.add(mesh(new THREE.BoxGeometry(0.06, 0.42, 0.36), M('#5a5f6a'), bx, 0.21, 0)));
  }
  g.traverse(o => { o.frustumCulled = false; });
  group.add(g);
  const rec = { obj: g };
  if (it.solid) { rec.col = { x, z, r: 0.42 }; colliders.push(rec.col); }
  if (it.kind === 'lamp') rec.glow = glow.emit({ x, y: groundAt(x, z) + 1.7, z, kind: 'garden' });   // 庭園燈：交給 glow.js（不再每盞一個點光源，燈的數量變了材質要重新編譯）
  built[k] = rec; grass.refreshSoon();
}
function unbuild(k) {
  const r = built[k]; if (!r) return;
  group.remove(r.obj);
  if (r.col) { const i = colliders.indexOf(r.col); if (i >= 0) colliders.splice(i, 1); }
  if (r.glow) glow.unemit(r.glow);
  delete built[k]; grass.refreshSoon();
}
export function init() { Object.entries(data()).forEach(([k, id]) => build(k, id)); }
export const count = () => Object.keys(data()).length;

/* ---------- 設計模式 ---------- */
let mode = null, ghost = null, P = null, onChange = null;
export const active = () => !!mode;
const cellOf = (x, z) => [Math.floor(x + C), Math.floor(z + C)];
function canPlace(tx, tz, it) {
  const t = T(tx, tz), x = tx - C + 0.5, z = tz - C + 0.5;
  if (isBridge(tx, tz) || t < 0 || t === 3 || t === 4 || t === 6 || t === 7) return '這裡不能放';
  if (it.kind !== 'path' && t === 0 && it.kind === 'flower') return '花圃要種在草地上';
  if (data()[tx + ',' + tz]) return null;
  const doors = [...homes.map(h => h.door), SITES.museum && SITES.museum.front, SITES.shop && SITES.shop.front, SITES.exam && SITES.exam.door, SITES.library && SITES.library.door, SITES.lighthouse && SITES.lighthouse.door, SITES.telescope && SITES.telescope.door].filter(Boolean);
  if (it.solid && doors.some(d => Math.hypot(d[0] - x, d[1] - z) < 1.2)) return '不要擋住門口';
  if (it.kind !== 'path' && blocked(x, z, 0.35)) return '這裡已經有東西了';
  if (it.solid && P && Math.hypot(P.position.x - x, P.position.z - z) < 0.6) return '站在這裡放不下';
  return null;
}
export function open(player, changed) {
  P = player; onChange = changed;
  const s = S(), body = ui.el('div', 'design');
  const grid = ui.el('div', 'fs-grid');
  ITEMS.forEach(it => { const b = ui.el('button', 'fs-item', `<i class="sw" style="background:#fff url(${swatch(it)}) center/cover"></i><b>${it.name}</b><small>${it.price} 鈴錢</small>`); b.type = 'button'; b.onclick = () => { ui.closePanel(); start(it.id); }; grid.appendChild(b); });
  const rm = ui.el('button', 'fs-item', '<i class="sw" style="background:repeating-linear-gradient(45deg,#ffd0d0 0 8px,#fff 8px 16px)"></i><b>拆除工具</b><small>拆除會退還一半鈴錢</small>'); rm.type = 'button'; rm.onclick = () => { ui.closePanel(); start('remove'); }; grid.appendChild(rm);
  body.append(ui.el('p', 'muted', `你有 ${s.bells.toLocaleString()} 鈴錢，已鋪設 ${count()} 格。選好後走到想放的位置（放在面前那一格），或直接點地面的格子；${touch() ? '按「動作」放置、「✕ 結束」離開' : 'E 放置、Esc 結束'}。`), grid);
  ui.panel('島嶼設計', body, { cls: 'shop-p' });
}
const touch = () => matchMedia('(pointer: coarse)').matches;   // 觸控裝置沒有鍵盤：提示改說畫面上的按鈕
function start(id) {
  mode = { id, tx: 0, tz: 0, pinned: false };
  if (ghost) scene.remove(ghost);
  ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }));
  ghost.frustumCulled = false; scene.add(ghost);
  document.body.classList.add('designing');
  ui.toast(touch() ? (id === 'remove' ? '拆除模式：對著要拆的格子按「動作」' : `${item(id).name}：按「動作」放置`) : id === 'remove' ? '拆除模式：對著要拆的格子按 E' : `${item(id).name}：E 放置，Esc 結束`);
}
export function stop() { mode = null; if (ghost) { scene.remove(ghost); ghost = null; } document.body.classList.remove('designing'); }
/** 每幀：預覽格子跟著玩家面前，或滑鼠指到的格子 */
export function update() {
  if (!mode || !P) return;
  if (!mode.pinned) { const fx = P.position.x + Math.sin(P.rotation.y) * 1.0, fz = P.position.z + Math.cos(P.rotation.y) * 1.0; [mode.tx, mode.tz] = cellOf(fx, fz); }
  const x = mode.tx - C + 0.5, z = mode.tz - C + 0.5, it = item(mode.id);
  const bad = mode.id === 'remove' ? !data()[mode.tx + ',' + mode.tz] : !!canPlace(mode.tx, mode.tz, it);
  ghost.position.set(x, groundAt(x, z) + 0.06, z); ghost.material.color.set(bad ? '#ff6a6a' : mode.id === 'remove' ? '#ffd0a0' : '#7cf5c0');
}
export function act() {
  if (!mode) return false;
  const k = mode.tx + ',' + mode.tz, d = data(), s = S();
  if (mode.id === 'remove') {
    if (!d[k]) { ui.toast('這格沒有東西'); return true; }
    const it = item(d[k]); s.bells += Math.floor((it ? it.price : 0) / 2); delete d[k]; unbuild(k); save(); Audio.sfx('dig'); onChange && onChange(); return true;
  }
  const it = item(mode.id), why = canPlace(mode.tx, mode.tz, it);
  if (why) { ui.toast(why); Audio.sfx('deny'); return true; }
  if (s.bells < it.price) { ui.toast('鈴錢不夠了'); Audio.sfx('deny'); return true; }
  if (d[k]) { const old = item(d[k]); s.bells += Math.floor((old ? old.price : 0) / 2); unbuild(k); }
  ledger.mark('shop'); s.bells -= it.price; d[k] = it.id; build(k, it.id); save(); Audio.sfx('place'); onChange && onChange();
  mode.pinned = false;
  return true;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
/** 點地面：把預覽格子移到點的位置（再點一次同一格就放置） */
export function pointer(e) {
  if (!mode) return false;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(terrain)[0]; if (!hit) return true;
  const [tx, tz] = cellOf(hit.point.x, hit.point.z);
  if (mode.pinned && tx === mode.tx && tz === mode.tz) act(); else { mode.tx = tx; mode.tz = tz; mode.pinned = true; }
  return true;
}
