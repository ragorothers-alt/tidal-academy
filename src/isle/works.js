/* 潮汐小島 · 公共建設（v9.2.1）：廣場東邊的建設告示牌，全島一起出鈴錢與潮汐里程，蓋四樣東西——
   南草原到旅館的潮間石橋、學院台地北邊的觀景台（雙筒望遠鏡看得到城堡與星環）、東花園的咖啡館（每天第一杯特調多一點經驗）、瀑布下的溫泉（每天第一次泡有一點鈴錢）。
   可以分好幾次捐；鈴錢與里程都捐滿的那天，工程隊當晚施工（工地圍起來），隔天就完工。紀錄：S().works[id] = { b, m, funded, built }。
   模型在 data/worksmodels.js（Codex 製作）；石橋用既有的 LMMODELS.bridge，走在上面的高度由 terrain.js 的 addWorkBridge 登記。 */
import * as THREE from 'three';
import { scene } from './engine.js';
import { groundAt, addWorkBridge } from './terrain.js';
import { colliders, seats, modelClone, addBridgeModel, clearFlowers } from './props.js';
import { clearArea } from './grass.js';
import { register } from './props3d.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, dayKey } from './state.js';
import * as social from './social.js';
import * as memo from './memo.js';

const TA = window.TA, L = TA.L;
export const WORKS = [
  { id: 'bridge', name: '潮間石橋', where: '南草原和旅館之間的河上', bells: 12000, miles: 1000, desc: '從南草原到旅館不用再繞回廣場；橋頭有燈，晚上也走得到。' },
  { id: 'view', name: '北崖觀景台', where: '學院台地的北邊（北側樓梯旁）', bells: 10000, miles: 800, desc: '雙筒望遠鏡看得到北方的城堡亮了幾扇窗、星環每一段有多亮。' },
  { id: 'cafe', name: '東花園咖啡館', where: '東花園', bells: 18000, miles: 1500, desc: '吧台點一杯特調（每天第一杯多一點經驗），桌邊有位子可以坐。' },
  { id: 'spa', name: '瀑布溫泉', where: '高地瀑布的下面', bells: 25000, miles: 2000, desc: '坐進池子裡泡一下，暖呼呼的；每天第一次泡會撿到一點鈴錢。' },
];
/* 擺放的位置 [x, z, ry]（模型的正面是 −Z） */
const AT = { view: [0, -32.6, 0], cafe: [33, 3.6, Math.PI / 2], spa: [-13.8, -12, 0], bridge: [23, 31.1, 0] };
const BOARD = [9.6, 8.7, 0];
const DRINKS = [
  { name: '潮汐拿鐵', fact: '牛奶的蛋白質遇熱會在表面形成一層薄膜，拿鐵上的奶泡也是靠蛋白質撐住氣泡。' },
  { name: '星環氣泡飲', fact: '二氧化碳在低溫下比較溶得進水裡，所以冰涼的氣泡飲打開時氣泡冒得比較慢。' },
  { name: '海鹽可可', fact: '一點點鹽會讓舌頭對苦味比較不敏感，可可喝起來就更香甜。' },
];
const DRINK_COST = 150;
const MAYOR = 'civics';   // 衡在島民議會負責公共建設，完工的信由他寄
let ctx = null, tickT = 0, boardG = null, soakT = 0;
const built = {}, sites = {}, steam = [];
const rec = id => { const s = S(); s.works = s.works || {}; return s.works[id] = s.works[id] || { b: 0, m: 0 }; };
const W = id => WORKS.find(w => w.id === id);
export const isBuilt = id => !!rec(id).built;
const milesPts = () => (S().miles || {}).pts || 0;

/* ---------- 模型與招牌字 ---------- */
/** 在模型的某個薄零件正面（模型的 −Z 那一面）貼一塊字；零件本身可能轉了 π，所以位置換算到模型的座標再貼 */
export function label(g, name, draw, w0 = 256) {
  const m = g.getObjectByName(name); if (!m || !m.isMesh || typeof document === 'undefined') return null;
  m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y, d = bb.max.z - bb.min.z;
  g.updateMatrixWorld(true); const c3 = m.localToWorld(bb.getCenter(new THREE.Vector3())); g.worldToLocal(c3);
  const cv = document.createElement('canvas'); cv.width = w0; cv.height = Math.max(32, Math.round(w0 * h / Math.max(w, 1e-3))); const c = cv.getContext('2d'); draw(c, cv.width, cv.height);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.9), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
  p.rotation.y = Math.PI; p.position.set(c3.x, c3.y, c3.z - d / 2 - 0.006); g.add(p);
  return { cv, t, draw: fn => { fn(c, cv.width, cv.height); t.needsUpdate = true; } };
}
const FONT = '"Microsoft JhengHei", "PingFang TC", system-ui, sans-serif';
export function words(c, w, h, bg, fg, lines) {
  c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach(([t, k, y]) => { c.font = `800 ${Math.round(h * k)}px ${FONT}`; c.fillText(t, w / 2, h * y, w * 0.9); });
}
function place(key, x, z, ry) {
  const g = modelClone('WORKSMODELS', key); if (!g) return null;
  g.position.set(x, groundAt(x, z), z); g.rotation.y = ry; scene.add(g); register(g); g.updateMatrixWorld(true);
  if (key !== 'works_board') { const b = new THREE.Box3().setFromObject(g), hit = (px, pz) => px > b.min.x - 0.1 && px < b.max.x + 0.1 && pz > b.min.z - 0.1 && pz < b.max.z + 0.1; clearArea(hit); clearFlowers(hit); }   // 建設底下的草與野花藏起來（不會從木板、池水裡長出來）
  return g;
}
/** 模型裡的標記點 → 世界座標與朝向（標記點 rotation.y = 0 是面向 −Z） */
function mark(g, name) { const o = g && g.getObjectByName(name); if (!o) return null; const p = new THREE.Vector3(); o.getWorldPosition(p); const q = new THREE.Quaternion(); o.getWorldQuaternion(q); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ'); return { x: p.x, y: p.y, z: p.z, ry: e.y }; }
const ring = (x, z, r) => colliders.push({ x, z, r });
/** 蓋好的建設：模型、碰撞、座位、互動點 */
function raise(id, live) {
  if (built[id]) return;
  if (id === 'bridge') { const br = addWorkBridge('bridge'); if (br && live) addBridgeModel(br); built[id] = { br }; return; }   // 載入時就完工的橋，props.js 已經和規劃的橋一起擺好了
  const [x, z, ry] = AT[id], g = place({ view: 'viewpoint', cafe: 'cafe', spa: 'hot_spring' }[id], x, z, ry); if (!g) return;
  const B = built[id] = { g };
  if (id === 'view') {
    B.look = mark(g, 'look'); ['seat_0', 'seat_1'].forEach((n, i) => { const m = mark(g, n); if (m) seats.push({ x: m.x, z: m.z, ry: m.ry + Math.PI, h: m.y, n: 1, work: id, k: i }); });
    const c = Math.cos(ry), s = Math.sin(ry); [[-1.55, 0], [1.55, 0], [0, -1.15]].forEach(([lx, lz]) => ring(x + lx * c + lz * s, z - lx * s + lz * c, 0.35));   // 欄杆兩側與正面
  }
  if (id === 'cafe') {
    B.counter = mark(g, 'counter'); if (B.counter) { B.counter.x -= Math.sin(B.counter.ry) * 0.6; B.counter.z -= Math.cos(B.counter.ry) * 0.6; }   // 點餐的位置往吧台挪一點，才不會被旁邊的椅子搶走（坐下的判定在前）
    for (let i = 0; i < 4; i++) { const m = mark(g, 'seat_' + i); if (m) seats.push({ x: m.x, z: m.z, ry: m.ry + Math.PI, h: m.y, n: 1, work: id }); }
    const c = Math.cos(ry), s = Math.sin(ry); for (let lx = -1.2; lx <= 1.21; lx += 0.6) ring(x + lx * c + 1.6 * s, z - lx * s + 1.6 * c, 0.42);   // 吧台
    label(g, 'menu', (c2, w, h) => words(c2, w, h, '#fff6e6', '#6b4f3a', [['MENU', 0.16, 0.16], ...DRINKS.map((d, i) => [d.name, 0.12, 0.38 + i * 0.2])]));
  }
  if (id === 'spa') {
    B.steam = mark(g, 'steam'); for (let i = 0; i < 3; i++) { const m = mark(g, 'soak_' + i); if (m) seats.push({ x: m.x, z: m.z, ry: m.ry + Math.PI, h: m.y - 0.05, n: 1, work: id, spa: true }); }
    label(g, 'sign', (c2, w, h) => words(c2, w, h, '#f4e4c8', '#7a4a3a', [['湯', 0.62, 0.52]]));
    if (B.steam) makeSteam(B.steam);
  }
}
/** 捐滿、還沒完工的那一晚：工地圍起來 */
function fence(id) {
  if (sites[id] || built[id]) return;
  const [x, z, ry] = AT[id], g = place('works_site', x, z, ry); if (!g) return;
  label(g, 'sign', (c, w, h) => words(c, w, h, '#ffd84a', '#5a3e26', [['施工中', 0.42, 0.42], ['明天完工', 0.2, 0.78]]));
  sites[id] = g;
}
function unfence(id) { const g = sites[id]; if (!g) return; scene.remove(g); delete sites[id]; }
/* 溫泉的蒸氣：幾團柔軟的白霧慢慢往上飄、散開 */
const puff = (() => { if (typeof document === 'undefined') return null; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
function makeSteam(m) { for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { x: m.x, y: m.y, z: m.z, ph: i / 7 }; scene.add(s); steam.push(s); } }

/* ---------- 告示牌 ---------- */
function paintBoard() {
  if (!boardG) return;
  WORKS.forEach((w, i) => { const P = boardG.userData.posters[i]; if (!P) return; const r = rec(w.id), k = Math.min(1, (Math.min(r.b / w.bells, 1) + Math.min(r.m / w.miles, 1)) / 2);
    P.draw((c, cw, ch) => { words(c, cw, ch, ['#fff1d6', '#e8f6ee', '#f3e6ff', '#ffe6ea'][i], '#5a3e26', [[w.name, 0.13, 0.22], [r.built ? '完工了！' : r.funded ? '施工中' : `${Math.round(k * 100)}%`, 0.2, 0.55]]);
      if (!r.built && !r.funded) { c.fillStyle = 'rgba(90,62,38,0.18)'; c.fillRect(cw * 0.12, ch * 0.8, cw * 0.76, ch * 0.06); c.fillStyle = '#5fbf8a'; c.fillRect(cw * 0.12, ch * 0.8, cw * 0.76 * k, ch * 0.06); } }); });
}
export function init(c) {
  ctx = c;
  const [bx, bz, bry] = BOARD; boardG = place('works_board', bx, bz, bry);
  if (boardG) { boardG.userData.posters = [0, 1, 2, 3].map(i => label(boardG, 'poster_' + i, () => {}, 192)); ring(bx, bz, 0.7); paintBoard(); }
  WORKS.forEach(w => { const r = rec(w.id); if (r.built) raise(w.id, false); else if (r.funded) fence(w.id); });
}
const nearBoard = (px, pz) => boardG && Math.hypot(px - BOARD[0], pz - BOARD[1] + 0.9) < 1.5;
const nearLook = (px, pz) => { const L1 = built.view && built.view.look; return L1 && Math.hypot(px - L1.x, pz - L1.z) < 1.1; };
const nearCounter = (px, pz) => { const C1 = built.cafe && built.cafe.counter; return C1 && Math.hypot(px - C1.x, pz - C1.z) < 1.3; };
export function hint(px, pz) { return nearBoard(px, pz) ? '看建設告示牌' : nearLook(px, pz) ? '用望遠鏡看城堡' : nearCounter(px, pz) ? '點一杯飲料' : ''; }
export function act(px, pz) {
  if (nearBoard(px, pz)) { openBoard(); return true; }
  if (nearLook(px, pz)) { ctx.busy(() => telescope()); return true; }
  if (nearCounter(px, pz)) { ctx.busy(() => order()); return true; }
  return false;
}
/** 告示牌的面板：四樣建設的進度，可以分次捐鈴錢與潮汐里程 */
export function openBoard() {
  const s = S(), body = ui.el('div', 'works');
  const paint = () => {
    body.innerHTML = `<p class="wk-lead">島民議會的公共建設：大家一起出鈴錢和潮汐里程，捐滿的那天工程隊連夜施工，隔天就完工。可以分好幾次捐。<small>手上有 ${s.bells.toLocaleString()} 鈴錢、${milesPts().toLocaleString()} 里程</small></p>` + WORKS.map(w => {
      const r = rec(w.id), kb = Math.min(1, r.b / w.bells), km = Math.min(1, r.m / w.miles);
      const st = r.built ? '<em class="ok">完工了！</em>' : r.funded ? '<em class="go">施工中，明天完工</em>' : `<div class="wk-bar"><span>鈴錢</span><i style="--k:${kb.toFixed(3)}"></i><b>${r.b.toLocaleString()}／${w.bells.toLocaleString()}</b></div><div class="wk-bar mi"><span>里程</span><i style="--k:${km.toFixed(3)}"></i><b>${r.m.toLocaleString()}／${w.miles.toLocaleString()}</b></div>
        <div class="wk-acts">${kb < 1 ? `<button type="button" class="btn sm" data-w="${w.id}" data-k="b" data-n="1000"${s.bells < 1 ? ' disabled' : ''}>捐 1,000 鈴錢</button><button type="button" class="btn ghost sm" data-w="${w.id}" data-k="b" data-n="all"${s.bells < 1 ? ' disabled' : ''}>鈴錢捐到滿</button>` : ''}${km < 1 ? `<button type="button" class="btn sm" data-w="${w.id}" data-k="m" data-n="100"${milesPts() < 1 ? ' disabled' : ''}>捐 100 里程</button><button type="button" class="btn ghost sm" data-w="${w.id}" data-k="m" data-n="all"${milesPts() < 1 ? ' disabled' : ''}>里程捐到滿</button>` : ''}</div>`;
      return `<section class="wk${r.built ? ' done' : ''}"><div class="wk-h"><b>${w.name}</b><small>${w.where}</small></div><p>${w.desc}</p>${st}</section>`;
    }).join('');
    body.querySelectorAll('[data-w]').forEach(b => { b.onclick = () => { give(b.dataset.w, b.dataset.k, b.dataset.n); paint(); }; });
  };
  paint(); ui.panel('建設告示牌', body, { cls: 'phone' });
}
function give(id, k, n) {
  const w = W(id), r = rec(id), s = S(); if (!w || r.funded) return;
  const need = k === 'b' ? w.bells - r.b : w.miles - r.m, have = k === 'b' ? s.bells : milesPts(), amt = Math.max(0, Math.min(need, have, n === 'all' ? Infinity : +n));
  if (!amt) { Audio.sfx('deny'); ui.toast(k === 'b' ? '鈴錢不夠了' : '潮汐里程不夠了（完成每天的里程目標就會增加）', 'bad'); return; }
  if (k === 'b') { s.bells -= amt; r.b += amt; } else { s.miles.pts -= amt; r.m += amt; }
  Audio.sfx('coin');
  if (r.b >= w.bells && r.m >= w.miles) { r.funded = dayKey(); fence(id); Audio.sfx('levelup'); ui.toast(`🏗 ${w.name}的經費捐滿了！工程隊今晚動工，明天就完工`); memo.add(`${w.name}開工`, `大家一起捐滿了${w.name}的經費，工地已經圍起來了。`, { key: 'works:fund:' + id, icon: '🏗' }); }
  save(); paintBoard(); if (ctx && ctx.paint) ctx.paint();
}

/* ---------- 每隔一會兒：隔天完工、泡溫泉 ---------- */
export function tick(dt) {
  if ((soakT = ctx && ctx.seat && ctx.seat() && ctx.seat().spa ? soakT + dt : 0) > 3) soaked();
  if ((tickT -= dt) > 0) return; tickT = 2;
  const today = dayKey();
  WORKS.forEach(w => { const r = rec(w.id); if (r.funded && !r.built && r.funded < today) finish(w); });
}
function finish(w) {
  const r = rec(w.id); r.built = dayKey(); save();
  unfence(w.id); raise(w.id, true); paintBoard();
  Audio.sfx('levelup'); ui.toast(`🎉 ${w.name}完工了！`);
  memo.add(`${w.name}完工`, `${w.where}多了${w.name}。${w.desc}`, { key: 'works:done:' + w.id, icon: '🎉' });
  social.sendLetter({ from: MAYOR, title: `${w.name}完工了`, open: '給一起出力的你：', text: `${w.name}今天早上完工了，地點在${w.where}。\n${w.desc}\n謝謝你捐的每一份鈴錢和里程。公共建設不是誰一個人的，是大家一起決定、一起出力的東西。`, close: '—— 衡' });
}
function soaked() {
  const s = S(), d = dayKey(); if (s.spaDay === d) return;
  s.spaDay = d; s.bells += 300; L.gain(10, 0); save(); TA.Store.save(); Audio.sfx('coin');
  ui.toast('♨ 暖呼呼的……在池邊的石縫裡撿到 300 鈴錢（+10 經驗）');
  if (ctx && ctx.paint) ctx.paint();
}
/** 每一格：溫泉的蒸氣 */
export function update(dt, t) {
  steam.forEach(s => { const u = s.userData, k = (t * 0.18 + u.ph) % 1; s.position.set(u.x + Math.sin(t * 0.6 + u.ph * 9) * 0.5 * k, u.y + 0.2 + k * 1.8, u.z + Math.cos(t * 0.5 + u.ph * 7) * 0.5 * k); s.scale.setScalar(0.5 + k * 1.3); s.material.opacity = Math.sin(k * Math.PI) * 0.32; });
}

/* ---------- 觀景台與咖啡館 ---------- */
/** 觀景台的雙筒望遠鏡：拉近看北方的城堡，說說亮了幾扇窗、星環哪一段最亮 */
async function telescope() {
  const tot = ctx.units(), lit = ctx.lit(), subs = TA.SUBJECTS.map(x => { const u = TA.DATA.units[x.id] || []; return [x.name, u.length ? u.filter(v => ((TA.S.units || {})[v.id] || {}).stars > 0).length / u.length : 0]; }).sort((a, b) => b[1] - a[1]);
  const SP = { name: '望遠鏡', color: '#7a8fd0' };
  await ctx.lookCastle(async () => {
    Audio.sfx('open');
    await ui.say(SP, `城堡亮著 ${lit}／${tot} 扇窗。${lit ? '每一扇都是你點亮的一座單元燈塔。' : '還暗暗的——點亮一座單元燈塔，就會有一扇窗亮起來。'}`);
    if (lit) await ui.say(SP, `星環最亮的是${subs[0][0]}那一段（${Math.round(subs[0][1] * 100)}%）${subs.filter(x => x[1] > 0).length < subs.length ? `，還有 ${subs.filter(x => !x[1]).length} 段沒有亮` : '，十段都亮起來了'}。晚上看最清楚。`);
  });
}
/** 咖啡館的吧台：點一杯特調（每天第一杯 +20 經驗，順便聽一個小知識） */
async function order() {
  const s = S(), SP = { name: '咖啡館', color: '#c48a5a' };
  const i = await ui.ask(SP, `今天想喝什麼？（一杯 ${DRINK_COST} 鈴錢）`, DRINKS.map(d => d.name).concat(['只是看看']));
  if (i < 0 || i >= DRINKS.length) return;
  if (s.bells < DRINK_COST) { Audio.sfx('deny'); await ui.say(SP, '鈴錢好像不太夠呢，下次再來吧！'); return; }
  const d = DRINKS[i], first = s.cafeDay !== dayKey(); s.bells -= DRINK_COST; s.cafeDay = dayKey(); if (first) L.gain(20, 0); save(); TA.Store.save(); Audio.sfx('pop');
  await ui.say(SP, `${d.name}來囉！${first ? '（今天第一杯 +20 經驗）' : ''}`);
  await ui.say(SP, '小知識：' + d.fact);
  if (ctx && ctx.paint) ctx.paint();
}
export const debug = () => ({ works: JSON.parse(JSON.stringify(S().works || {})), built: Object.keys(built), sites: Object.keys(sites), board: !!boardG, spaDay: S().spaDay, cafeDay: S().cafeDay });
