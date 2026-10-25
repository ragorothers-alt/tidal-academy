/* 潮汐小島 · 潮汐渡假飯店（v6.18）：碼頭旁的度假飯店。
   - 大廳櫃台的海獺經理「阿浪」委託你佈置 8 間主題客房（第一間固定是海濱房，之後每間二選一主題），一天最多完成 2 間。
   - 客房用飯店的家具目錄自由擺（不消耗自己的倉庫）；擺滿 6 件、其中至少 3 件是該主題家具，走出房門時阿浪會拍下定裝照，算完成。
   - 每完成一間得到 200 張飯店優惠券，並有一位觀光客入住；觀光客白天會在飯店附近散步，每天聊天可以一起讀一題。
   - 優惠券可以在大廳紀念品櫃換主題家具（每天 2 件現貨七折、目錄每天最多訂 5 件），或交付島嶼特產委託（每週更新）賺更多。
   存檔 S().hotel = { coupons, rooms: [{ theme, items, wall, floor, done, guest, d }], made: { d, n }, shop: { d, n }, req: { w, list }, talk: { d, who } } */
import * as THREE from 'three';
import { scene, M, mesh, nightMats } from './engine.js';
import { tileAt, groundAt } from './terrain.js';
import { blocked, colliders, label, PIER, gable, timber, mergeStatic, altBuilding, SITES } from './props.js';
import { chibi, animate, lookAt } from './chars.js';
import * as actors from './actors.js';
import { register } from './props3d.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { I, S, save, dayKey } from './state.js';
import { pickQ, record, pick } from './quiz.js';
import * as memo from './memo.js';

const TA = window.TA;
export const THEMES = [
  { id: 'beach', name: '海濱房', icon: '🏖', ask: '我希望 1 號房能打造成一間聽得到海浪聲的海濱房！' },
  { id: 'wa', name: '和風房', icon: '🏮', ask: '想要一間有榻榻米與紙燈籠、安安靜靜的和風房。' },
  { id: 'country', name: '鄉村房', icon: '🌾', ask: '格紋布、木頭家具、暖暖的壁爐——鄉村風的房間一定很受歡迎。' },
  { id: 'kids', name: '童趣房', icon: '🧸', ask: '帶小朋友來玩的客人很多，來一間充滿玩具的童趣房吧！' },
  { id: 'star', name: '星空房', icon: '🌌', ask: '晚上躺著就能看星星的星空房，聽起來很浪漫吧？' },
  { id: 'forest', name: '森林房', icon: '🍄', ask: '把森林搬進房間裡！樹樁、蘑菇、鳥屋都可以。' },
  { id: 'retro', name: '復古遊戲房', icon: '🕹', ask: '懷舊遊戲機台與霓虹燈，打造一間讓人玩到忘記時間的遊戲房！' },
  { id: 'library', name: '書香房', icon: '📚', ask: '喜歡讀書的客人一定會愛上一間堆滿書的書香房。' }
];
const GUESTS = [
  { name: '阿三', kind: 'rabbit', fur: '#f3e6d6', inner: '#ffd0d8', shirt: '#7cc7ff', color: '#7cc7ff' },
  { name: '小蜜', kind: 'bear', fur: '#e8b878', inner: '#f8e2c0', shirt: '#ff9a7a', color: '#ff9a7a' },
  { name: '布丁', kind: 'hamster', fur: '#f6d8a0', inner: '#ffffff', shirt: '#b9a2ff', color: '#b9a2ff' },
  { name: '可可', kind: 'dog', fur: '#b8865a', inner: '#f3e2c8', shirt: '#7ed4a8', color: '#5fbf6a' },
  { name: '琥珀', kind: 'fox', fur: '#f09a4a', inner: '#fff3e0', shirt: '#4a6fb0', color: '#f09a4a' },
  { name: '雪球', kind: 'sheep', fur: '#fbf7f0', inner: '#f0d8c8', shirt: '#ff8aa8', color: '#ff8aa8' },
  { name: '栗子', kind: 'squirrel', fur: '#c8703a', inner: '#f6dcc0', shirt: '#ffd23f', color: '#e0a020' },
  { name: '海苔', kind: 'cat', fur: '#5a6070', inner: '#f0e0e8', shirt: '#3fb7e0', color: '#3fb7e0' }
];
const MGR = { name: '阿浪', color: '#3fb7e0', voice: 420 };
const COUPON = '🎫';

/* ---------- 存檔 ---------- */
export function H() {
  const s = S(); s.hotel = s.hotel || { coupons: 0, rooms: [] }; const h = s.hotel;
  h.rooms = h.rooms || []; h.coupons = h.coupons || 0; return h;
}
const today = (h, k) => { const d = dayKey(); if (!h[k] || h[k].d !== d) h[k] = { d, n: 0, who: {} }; return h[k]; };
const week = () => { const d = new Date(); const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };
const furnOf = id => (I.FURNITURE || []).find(f => f.id === id);
const themeFurn = th => (I.FURNITURE || []).filter(f => f.src === 'hotel' && f.hotel === th);
const NEED = 6, NEED_T = 3;

/* ---------- 飯店櫃台（大廳固定家具） ---------- */
function ensureFixed() {
  if (furnOf('hotel_front_desk')) return;
  I.FURNITURE.push({ id: 'hotel_front_desk', name: '飯店櫃台', cat: 'table', size: [3, 1], src: 'hotel-fixed', theme: null, desc: '擦得亮晶晶的櫃台，上面有一顆叮叮作響的服務鈴。', parts: [
    { t: 'box', p: [0, 0.45, 0], s: [2.9, 0.9, 0.78], c: '#f4ead8', r: 0.04 },
    { t: 'box', p: [0, 0.93, 0], s: [3.0, 0.08, 0.9], c: '#c99a62', r: 0.03 },
    { t: 'box', p: [0, 0.45, 0.4], s: [2.7, 0.18, 0.02], c: '#3fb7e0' },
    { t: 'cyl', p: [0.9, 1.0, 0.15], rt: 0.07, rb: 0.09, h: 0.06, c: '#ffd36b' }, { t: 'sph', p: [0.9, 1.05, 0.15], r: 0.06, c: '#ffd36b', sy: 0.7 },
    { t: 'box', p: [-0.7, 1.1, -0.15], s: [0.5, 0.32, 0.06], c: '#3a4250', r: 0.02 }, { t: 'box', p: [-0.7, 1.1, -0.11], s: [0.44, 0.26, 0.02], c: '#8fe6cf', e: '#5fd8c0' },
    { t: 'box', p: [0.2, 1.0, 0.2], s: [0.4, 0.05, 0.28], c: '#ffffff' }, { t: 'cyl', p: [-1.25, 1.12, 0.1], rt: 0.08, rb: 0.06, h: 0.24, c: '#ff9ac0' }, { t: 'sph', p: [-1.25, 1.3, 0.1], r: 0.12, c: '#ffd0e0' }
  ] });
  I.FURNITURE.push({ id: 'hotel_lounge_rug', name: '大廳地毯', cat: 'rug', size: [3, 3], src: 'hotel-fixed', theme: null, desc: '鋪在沙發區的大地毯，奶油色毯面配兩道粉彩條紋。', parts: [   // 把沙發、茶几、扶手椅圈成一個休息區
    { t: 'box', p: [0, 0.018, 0], s: [2.85, 0.036, 2.6], c: '#f5ecd9', r: 0.02 },
    { t: 'box', p: [0, 0.042, 0], s: [2.6, 0.012, 2.35], c: '#c69a73', r: 0.006 },
    { t: 'box', p: [0, 0.052, 0], s: [2.48, 0.009, 2.23], c: '#f5ecd9', r: 0.005 },
    { t: 'box', p: [0, 0.059, -0.8], s: [2.36, 0.009, 0.1], c: '#a9c8b2', r: 0.004 },
    { t: 'box', p: [0, 0.059, 0.8], s: [2.36, 0.009, 0.1], c: '#e4afa4', r: 0.004 }
  ] });
  I.FURNITURE.push({ id: 'hotel_key_rack', name: '鑰匙架', cat: 'deco', size: [1, 1], src: 'hotel-fixed', theme: null, desc: '掛著 8 把客房鑰匙的木架，每一把都綁著不同顏色的貝殼。', parts: [
    { t: 'box', p: [0, 0.6, -0.4], s: [0.9, 1.2, 0.08], c: '#a8754a', r: 0.03 },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ t: 'sph', p: [-0.3 + (i % 4) * 0.2, 0.95 - Math.floor(i / 4) * 0.35, -0.33], r: 0.05, c: ['#ff9ac0', '#7cc7ff', '#ffd23f', '#7ed4a8', '#b9a2ff', '#ff9a7a', '#8fe6cf', '#f4ead8'][i] }))
  ] });
}
const LOBBY = () => ({ wall: 'wp_ivory_wash', floor: 'fl_honey_oak', items: [
  { id: 'hotel_front_desk', x: 3, z: 1, r: 0 }, { id: 'hotel_key_rack', x: 6, z: 0, r: 0 },
  { id: 'mint_two_seat_sofa', x: 0, z: 4, r: 3 }, { id: 'low_coffee_table', x: 1, z: 4, r: 1 }, { id: 'lavender_armchair', x: 0, z: 6, r: 3 },
  { id: 'leafy_potted_plant', x: 0, z: 0, r: 0 }, { id: 'leafy_potted_plant', x: 7, z: 3, r: 0 }, { id: 'soft_floor_lamp', x: 1, z: 0, r: 0 },
  { id: 'hotel_lounge_rug', x: 0, z: 4, r: 0 }, { id: 'pedestal_analog_clock', x: 7, z: 0, r: 0 }, { id: 'flower_pot', x: 7, z: 5, r: 0 }
].filter(it => furnOf(it.id)) });

/* ---------- 戶外：碼頭旁的飯店建築 ---------- */
let site = null, ctx = null, P = null;
const tourists = [];
function building(x, z) {
  const y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  const coral = M('#ffd8c0', {}, 'wall'), white = M('#fffaf0'), blue = M('#3f9fd8', {}, 'roof'), wood = M('#b98048', {}, 'stone');
  g.add(mesh(new THREE.BoxGeometry(5.6, 0.3, 4.4), M('#d9cdb6', {}, 'stone'), 0, 0.15, 0));
  g.add(mesh(new THREE.BoxGeometry(5.2, 2.0, 3.8), coral, 0, 1.3, 0));
  g.add(mesh(new THREE.BoxGeometry(5.5, 0.16, 4.1), white, 0, 2.36, 0));
  g.add(mesh(new THREE.BoxGeometry(4.6, 1.7, 3.3), coral, 0, 3.25, -0.2));
  { const rg = new THREE.Group(); rg.position.z = -0.2; gable(rg, 4.6, 3.3, 4.1, 1.55, '#3f9fd8', '#ffd8c0', { trim: '#fffaf0' }); g.add(rg); }   // 帶屋簷的山形屋頂
  timber(g, 5.2, 3.8, 0.3, 2.3, { wood: '#fffaf0', stone: '#cbbfa8', stoneH: 0.36 });
  // 二樓陽台欄杆
  for (let i = 0; i <= 10; i++) g.add(mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), white, -2.5 + i * 0.5, 2.62, 1.98, { noCast: true }));
  g.add(mesh(new THREE.BoxGeometry(5.1, 0.06, 0.08), white, 0, 2.84, 1.98, { noCast: true }));
  // 窗戶（夜晚亮燈）
  const win = M('#bfe8ff', { emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 0, roughness: 0.12, metalness: 0.1 }, 'glass'); if (!nightMats.includes(win)) nightMats.push(win);
  [-1.8, 1.8].forEach(wx => { g.add(mesh(new THREE.BoxGeometry(0.9, 0.8, 0.08), win, wx, 1.45, 1.92)); g.add(mesh(new THREE.BoxGeometry(1.04, 0.08, 0.12), white, wx, 1.88, 1.95), mesh(new THREE.BoxGeometry(1.04, 0.08, 0.12), white, wx, 1.02, 1.95)); });
  [-1.5, 0, 1.5].forEach(wx => { g.add(mesh(new THREE.BoxGeometry(0.75, 0.7, 0.08), win, wx, 3.3, 1.47)); g.add(mesh(new THREE.BoxGeometry(0.9, 0.07, 0.12), white, wx, 3.68, 1.5)); });
  // 雙開門、門簷、台階、招牌
  g.add(mesh(new THREE.BoxGeometry(1.3, 1.45, 0.08), M('#3a6fa8', {}, 'wall'), 0, 1.03, 1.92));
  g.add(mesh(new THREE.BoxGeometry(0.03, 1.45, 0.1), M('#ffd36b', { metalness: 0.5 }), 0, 1.03, 1.97));
  const aw = mesh(new THREE.BoxGeometry(2.0, 0.08, 0.9), M('#3fb7e0', {}, 'roof'), 0, 1.95, 2.25); aw.rotation.x = 0.3; g.add(aw);
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.ConeGeometry(0.17, 0.18, 4), i % 2 ? white : M('#3fb7e0'), -0.85 + i * 0.34, 1.72, 2.68, { noCast: true }));
  g.add(mesh(new THREE.BoxGeometry(1.8, 0.14, 0.6), M('#d9cdb6', {}, 'stone'), 0, 0.37, 2.2));
  const sg = label('潮汐渡假飯店', '#3f9fd8', 2.4, 0.5); sg.position.set(0, 2.6, 2.06); g.add(sg);
  // 門口兩盆椰子盆栽與旗子
  [-1.15, 1.15].forEach(px => { g.add(mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.35, 10), wood, px, 0.48, 2.3)); for (let i = 0; i < 5; i++) { const lf = mesh(new THREE.SphereGeometry(0.28, 7, 5), M('#5fb35a', {}, 'pine'), px + Math.cos(i * 1.26) * 0.22, 0.95, 2.3 + Math.sin(i * 1.26) * 0.22, { noCast: true }); lf.scale.set(1.3, 0.25, 0.5); lf.rotation.y = -i * 1.26; lf.rotation.z = -0.5; g.add(lf); } });
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), white, 2.9, 3.4, 1.4)); g.add(mesh(new THREE.BoxGeometry(0.6, 0.38, 0.03), M('#ff9a7a'), 3.2, 4.25, 1.4));
  if (altBuilding('hotel', g, [sg])) {   // Codex 重建的白石飯店（佔地比舊的大一點）
    mergeStatic(g); scene.add(g); register(g); colliders.push({ x0: x - 3.45, z0: z - 2.95, x1: x + 3.45, z1: z + 2.95 });
    return { x, z, door: [x, z + 3.9], g };
  }
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x0: x - 2.8, z0: z - 2.2, x1: x + 2.8, z1: z + 2.2 });
  return { x, z, door: [x, z + 2.2 + 0.9], g };
}
function placeBuilding() {
  if (SITES.hotel) return building(SITES.hotel.x, SITES.hotel.z);   // 規劃的位置（東南邊的海岸）
  const cand = [];
  // 碼頭兩側的海邊（避開廣場通往碼頭的主步道 |x| < 4.6）
  for (let z = 8; z <= 21; z += 0.5) for (let x = -16; x <= 18; x += 0.5) if (Math.abs(x - PIER.x) > 4.6) cand.push([x, z]);
  cand.sort((a, b) => Math.hypot(a[0] - (PIER.x + 7), a[1] - (PIER.z - 4)) - Math.hypot(b[0] - (PIER.x + 7), b[1] - (PIER.z - 4)));
  for (const [x, z] of cand) {
    let ok = true; const t0 = tileAt(x, z); if (t0 !== 0 && t0 !== 1) continue;
    for (let dz = -2.4; dz <= 3.4 && ok; dz += 0.8) for (let dx = -3; dx <= 3 && ok; dx += 0.75) { const t = tileAt(x + dx, z + dz); if (t !== t0) ok = false; }
    if (!ok || blocked(x, z, 3.4) || blocked(x, z + 3, 1.2)) continue;
    return building(x, z);
  }
  return null;
}
function tourist(gi) {
  const G = GUESTS[gi], m = chibi(Object.assign({ pants: '#5a6070' }, G)); m.traverse(o => { o.frustumCulled = false; });
  return { G, gi, m, target: null, wait: 0 };
}
export function init(c) {
  ctx = c; P = c.player; ensureFixed(); site = placeBuilding();
  if (!site) return;
  for (let i = 0; i < 2; i++) { const t = tourist(i); t.m.visible = false; scene.add(t.m); tourists.push(t); }
}
export const siteInfo = () => site;

/* ---------- 大廳與客房 ---------- */
let mgr = null, lobbyHost = null;
function manager() {
  if (mgr) return mgr;
  mgr = chibi({ kind: 'otter', fur: '#a8784a', inner: '#f3e2c8', shirt: '#3fb7e0', pants: '#2a4a70', acc: null }); actors.dress(mgr, 'hotel'); mgr.traverse(o => { o.frustumCulled = false; });
  return mgr;
}
export function enterLobby() {
  if (!site) return;
  const m = manager(); lobbyHost = { isHotel: true, kind: 'mgr', mesh: m };
  ctx.enter(LOBBY(), { sid: 'hotel-lobby' }, lobbyHost, () => ctx.outside(site.door[0], site.door[1] + 0.3, 0));
  m.position.set(0.5, 0.18, -3.05); m.rotation.y = 0;   // 站在櫃台後的小台子上，露出上半身
  const h = H(); if (!h.intro) setTimeout(() => ui.toast('潮汐渡假飯店：和櫃台的阿浪說話，接下佈置客房的委託吧'), 1200);
}
function enterRoom(i, edit) {
  const h = H(), r = h.rooms[i], th = THEMES.find(t => t.id === r.theme), papers = (I.WALLPAPER || []).concat(I.FLOORING || []).map(p => p.id);
  const catalog = themeFurn(r.theme).map(f => f.id).concat((I.FURNITURE || []).filter(f => (f.src === 'hotel' && f.hotel !== r.theme) || f.src === 'shop' || f.src === 'diy').map(f => f.id));
  let host = null;
  if (r.done && r.guest != null) { const t = tourist(r.guest); host = { isHotel: true, kind: 'guest', gi: r.guest, mesh: t.m, room: i }; }
  ctx.enter(r, { sid: r.theme, edit, catalog, papers }, host, () => leaveRoom(i, edit));
  if (host) { host.mesh.position.set(1.4, 0, -0.6); host.mesh.rotation.y = 0; }
  if (edit) setTimeout(() => ui.toast(`${th.icon} ${i + 1} 號房・${th.name}：按 F 打開飯店的家具目錄（擺 ${NEED} 件以上，其中 ${NEED_T} 件主題家具）`), 900);
}
function leaveRoom(i, edit) {
  const h = H(), r = h.rooms[i];
  if (edit && !r.done) {
    const items = (r.items || []).map(it => furnOf(it.id)).filter(Boolean), themed = items.filter(f => f.hotel === r.theme).length, need = Math.min(NEED_T, themeFurn(r.theme).length);
    const made = today(h, 'made');
    if (items.length >= NEED && themed >= need) {
      if (made.n >= 2) ui.toast('今天已經完成 2 間客房了，明天再來給阿浪看吧（佈置會保留）');
      else { r.done = true; r.d = dayKey(); r.guest = h.rooms.filter(x => x.done).length - 1; made.n++; h.coupons += 200; save(); r.justDone = true; }
    } else ui.toast(`還差一點：家具 ${items.length}/${NEED} 件、主題家具 ${themed}/${need} 件（佈置會保留）`);
  }
  setTimeout(() => { enterLobby(); if (r.justDone) { delete r.justDone; save(); setTimeout(() => celebrate(i), 900); } }, 50);
}
async function celebrate(i) {
  const h = H(), r = h.rooms[i], th = THEMES.find(t => t.id === r.theme), G = GUESTS[r.guest % GUESTS.length];
  if (ctx.busy && ctx.busy()) return;
  ctx.lock(true);
  try {
    Audio.sfx('catch');
    await ui.say(MGR, `太棒了！我用相機拍下了「${th.name}」的定裝照，這張會掛在大廳當客房導覽圖唄。`);
    await ui.card({ icon: '', title: `${i + 1} 號房・${th.name} 完成！`, sub: `得到 200 張飯店優惠券 ${COUPON}（共 ${h.coupons} 張）<br>觀光客「${G.name}」入住了，白天會在飯店附近散步。` });
    memo.add(`佈置好飯店的${th.name}`, `${G.name}住進了 ${i + 1} 號房`, { key: 'hotel:' + i, icon: th.icon });
  } finally { ui.closeDialog(); ctx.lock(false); }
}

/* ---------- 對話 ---------- */
export async function talk(host) {
  if (host.kind === 'guest') return guestTalk(host.gi, host.room);
  const h = H();
  if (!h.intro) {
    await ui.say(MGR, '歡迎光臨潮汐渡假飯店！我是經理阿浪唄。這間飯店才剛蓋好，客房都還空空的……');
    await ui.say(MGR, '可以請你幫忙佈置客房嗎？家具用飯店的目錄就好，不會用到你自己的東西。每佈置好一間，我就送你 200 張優惠券！');
    h.intro = 1; save();
  }
  const opts = [['design', `佈置客房（${h.rooms.filter(r => r.done).length} / 8 間完成）`], ['visit', '去看看客房'], ['shop', `紀念品櫃（${COUPON} ${h.coupons} 張）`], ['req', '島嶼特產委託'], ['bye', '先這樣']];
  const k = (opts[await ui.ask(MGR, '今天要做什麼呢？', opts.map(o => o[1]))] || ['bye'])[0];
  if (k === 'design') return design();
  if (k === 'visit') return visit();
  if (k === 'shop') { ui.closeDialog(); return shop(); }
  if (k === 'req') return requests();
  await ui.say(MGR, pick(['慢走唄！', '有空再來玩唄。', '飯店隨時歡迎你！']));
}
async function design() {
  const h = H(), made = today(h, 'made');
  const open = h.rooms.findIndex(r => !r.done);
  if (open >= 0) { const th = THEMES.find(t => t.id === h.rooms[open].theme); const i = await ui.ask(MGR, `${open + 1} 號房「${th.name}」還在佈置中唄，要繼續嗎？`, ['繼續佈置', '下次吧']); if (i === 0) { ui.closeDialog(); enterRoom(open, true); } return; }
  if (h.rooms.length >= 8) { await ui.say(MGR, '8 間客房全部佈置好了！謝謝你，飯店的評價越來越好了唄。'); return; }
  if (made.n >= 2) { await ui.say(MGR, '今天已經佈置了 2 間，辛苦了！明天再來幫忙唄。'); return; }
  const used = h.rooms.map(r => r.theme), left = THEMES.filter(t => !used.includes(t.id));
  let th = left[0];
  if (h.rooms.length > 0 && left.length > 1) {
    const two = left.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    const i = await ui.ask(MGR, `${h.rooms.length + 1} 號房要做成什麼主題呢？客人提了兩個願望唄：`, two.map(t => `${t.icon} ${t.name}`));
    th = two[i] || two[0];
  }
  await ui.say(MGR, th.ask + `擺 ${NEED} 件以上的家具，其中 ${NEED_T} 件要是${th.name}的主題家具唄。`);
  h.rooms.push({ theme: th.id, items: [], wall: '', floor: '', done: false }); save();
  ui.closeDialog(); enterRoom(h.rooms.length - 1, true);
}
async function visit() {
  const h = H(), done = h.rooms.map((r, i) => [r, i]).filter(([r]) => r.done);
  if (!done.length) { await ui.say(MGR, '還沒有佈置好的客房唄。'); return; }
  const i = await ui.ask(MGR, '要看哪一間呢？', done.map(([r, i2]) => { const th = THEMES.find(t => t.id === r.theme); return `${i2 + 1} 號房・${th.name}（${GUESTS[r.guest % GUESTS.length].name}）`; }).concat(['不用了']));
  if (i < 0 || i >= done.length) return;
  ui.closeDialog(); enterRoom(done[i][1], false);
}
async function guestTalk(gi, roomI) {
  const G = GUESTS[gi % GUESTS.length], h = H(), sp = { name: G.name, color: G.color, voice: 560 + gi * 30 };
  const r = roomI != null ? h.rooms[roomI] : null, th = r && THEMES.find(t => t.id === r.theme);
  const tk = today(h, 'talk');
  const lines = [th ? `住在${th.name}好舒服，就像住在自己家一樣。` : '這座島好漂亮，每天都有新發現！', '島上的居民都好親切喔。', '聽說西邊的山頂可以看到很美的夕陽！', '我是來這裡度假兼讀書的，要不要一起讀一題？'];
  await ui.say(sp, pick(lines));
  if (tk.who[gi]) return;
  const sid = pick(TA.SUBJECTS).id, q = pickQ(sid, 2) || pickQ(sid, 3); if (!q) return;
  const i = await ui.ask(sp, `我在讀這一題，你會嗎？${q.q}`, q.o, { abc: true, keys: true, html: true }), ok = i === q.a; record(q, ok); tk.who[gi] = 1;
  if (ok) { h.coupons += 60; save(); Audio.sfx('catch'); await ui.say(sp, `好厲害！謝謝你教我。這 60 張優惠券送你（共 ${h.coupons} 張）。`); await challenge.keepGoing(sp, q); }
  else { save(); Audio.sfx('bad'); await ui.say(sp, `答案是 ${ui.ansOf(q)}呢。${q.e}`, { html: true }); }
}
async function requests() {
  const h = H(), w = week();
  if (!h.req || h.req.w !== w) {
    const diy = (I.FURNITURE || []).filter(f => f.src === 'diy').sort(() => Math.random() - 0.5).slice(0, 3);
    h.req = { w, list: diy.map(f => ({ id: f.id, n: 1 + Math.floor(Math.random() * 2), done: false })) }; save();
  }
  const st = S().storage || {};
  const items = h.req.list.map(q => ({ q, f: furnOf(q.id) })).filter(x => x.f);
  const opts = items.map(({ q, f }) => q.done ? `✔ ${f.name} ×${q.n}（已交付）` : `${f.name} ×${q.n}（倉庫有 ${st[q.id] || 0}）→ ${COUPON} ${150 * q.n}`).concat(['先不用']);
  const i = await ui.ask(MGR, '這是這週要推廣到島外的「島嶼特產」唄！用 DIY 做好、放進倉庫，再拿來交給我。每週一更新。', opts);
  const x = items[i]; if (!x || x.q.done) return;
  if ((st[x.q.id] || 0) < x.q.n) { await ui.say(MGR, `倉庫裡的「${x.f.name}」還不夠唄。到 DIY 工作台做好再來！`); return; }
  st[x.q.id] -= x.q.n; if (st[x.q.id] <= 0) delete st[x.q.id]; x.q.done = true; h.coupons += 150 * x.q.n; save(); Audio.sfx('coin');
  await ui.say(MGR, `收到了！我會把「${x.f.name}」運到島外推廣唄。這是 ${150 * x.q.n} 張優惠券（共 ${h.coupons} 張）。`);
}
/* ---------- 紀念品櫃：每天 2 件現貨七折；目錄每天最多訂 5 件 ---------- */
function shop() {
  const h = H(), body = ui.el('div', 'nk hotel-shop');
  const all = (I.FURNITURE || []).filter(f => f.src === 'hotel'), papers = (I.WALLPAPER || []).concat(I.FLOORING || []).filter(p => p.hotel);
  const d = dayKey(); let seed = [...d].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0; const rr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const special = all.slice().sort(() => rr() - 0.5).slice(0, 2).map(f => f.id);
  const paint = () => {
    const sh = today(h, 'shop');
    body.innerHTML = `<div class="nk-top"><span class="nk-sign">紀念品櫃<small>現貨七折 · 目錄每天 ${5 - sh.n} 件</small></span><span class="nk-wallet">${COUPON} ${h.coupons}</span></div>`;
    if (!all.length) { body.appendChild(ui.el('p', 'nk-hint', '紀念品還在準備中唄……')); return; }
    const row = (list, sale) => { const shelf = ui.el('div', 'nk-shelf'); list.forEach(f => {
      const isP = !f.cat, cost = Math.round((f.coupon || 100) * (sale ? 0.7 : 1) / 10) * 10, own = isP && (S().papers || []).includes(f.id), th = THEMES.find(t => t.id === f.hotel);
      const pic = isP ? `<i class="sw" style="background:linear-gradient(135deg, ${f.c1} 50%, ${f.c2} 50%)"></i>` : `<img src="${ctx.thumb(f.id)}" alt="">`;
      const b = ui.el('button', 'nk-item' + (own ? ' own' : ''), `<span class="nk-pic">${pic}</span><span class="nk-tag"><b>${ui.esc(f.name)}</b><small>${own ? '已擁有' : `${COUPON} ${cost}`}${sale ? ' · 現貨' : ''}${th ? ' · ' + th.name : ''}</small></span>`); b.type = 'button'; if (f.desc) b.dataset.tip = f.desc;
      b.onclick = () => {
        if (own) return; const s2 = today(h, 'shop');
        if (!sale && s2.n >= 5) { ui.toast('今天的目錄訂購額度用完了（每天 5 件），明天再來唄'); return; }
        if (h.coupons < cost) { ui.toast(`優惠券不夠（還差 ${cost - h.coupons} 張）`); Audio.sfx('bad'); return; }
        h.coupons -= cost; if (!sale) s2.n++;
        if (isP) { S().papers = S().papers || []; S().papers.push(f.id); } else ctx.addStorage(f.id);
        save(); Audio.sfx('coin'); ui.toast(`換到了「${f.name}」！${isP ? '回家裝潢就能用' : '已放進倉庫'}`); paint();
      }; shelf.appendChild(b); }); return shelf; };
    body.appendChild(ui.el('p', 'nk-hint', '今天的現貨（七折、不佔訂購額度）'));
    body.appendChild(row(special.map(furnOf).filter(Boolean), true));
    body.appendChild(ui.el('p', 'nk-hint', '目錄'));
    for (let i = 0; i < all.length; i += 3) body.appendChild(row(all.slice(i, i + 3), false));
    for (let i = 0; i < papers.length; i += 3) body.appendChild(row(papers.slice(i, i + 3), false));
  };
  paint(); ui.panel('潮汐飯店紀念品櫃', body, { cls: 'nook-p' });
}

/* ---------- 戶外的觀光客：入住的客人白天在飯店附近散步 ---------- */
const near = (o, r) => P && Math.hypot(P.position.x - o.m.position.x, P.position.z - o.m.position.z) < r;
export function update(dt, t, hour, outdoors) {
  if (!site) return;
  const h = H(), guests = h.rooms.filter(r => r.done).map(r => r.guest);
  tourists.forEach((tr, k) => {
    const gi = guests[(k + new Date().getDate()) % Math.max(1, guests.length)];
    const show = outdoors && guests.length > k && hour >= 8 && hour < 19;
    if (show && (tr.gi !== gi || !tr.placed)) { if (tr.gi !== gi) { scene.remove(tr.m); const n = tourist(gi); tr.m = n.m; tr.G = n.G; tr.gi = gi; scene.add(tr.m); } tr.placed = true; const x = site.door[0] + (k ? 2 : -2), z = site.door[1] + 1.2; tr.m.position.set(x, groundAt(x, z), z); }
    tr.m.visible = show; if (!show) return;
    const m = tr.m;
    if (near(tr, 2.2)) { lookAt(m, P.position.clone().setY(P.position.y + 1.1)); m.rotation.y += (Math.atan2(P.position.x - m.position.x, P.position.z - m.position.z) - m.rotation.y) * Math.min(1, dt * 5); animate(m, dt, 0, t); }
    else {
      tr.wait -= dt;
      if (tr.wait <= 0 || !tr.target) { const a = Math.random() * 6.28, d = 2 + Math.random() * 5; tr.target = [site.door[0] + Math.cos(a) * d, site.door[1] + 2 + Math.sin(a) * d * 0.6]; tr.wait = 4 + Math.random() * 5; }
      const dx = tr.target[0] - m.position.x, dz = tr.target[1] - m.position.z, dd = Math.hypot(dx, dz); let mv = 0;
      if (dd > 0.2) { const nx = m.position.x + dx / dd * 1.1 * dt, nz = m.position.z + dz / dd * 1.1 * dt, tt = tileAt(nx, nz); if ((tt === 0 || tt === 1) && !blocked(nx, nz, 0.3)) { m.position.x = nx; m.position.z = nz; m.rotation.y = Math.atan2(dx, dz); mv = 1; } else tr.target = null; }
      lookAt(m, null); animate(m, dt, mv, t);
    }
    m.position.y += (groundAt(m.position.x, m.position.z) - m.position.y) * Math.min(1, dt * 10);
  });
}
export function hint() { const tr = tourists.find(tr => tr.m.visible && near(tr, 1.6)); return tr ? `和觀光客${tr.G.name}聊天` : ''; }
export function handler() { const tr = tourists.find(tr => tr.m.visible && near(tr, 1.6)); return tr ? () => guestTalk(tr.gi, null) : null; }
