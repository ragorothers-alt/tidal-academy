/* 潮汐小島 · 星環學院（v9.3.0）：走過光橋（starbridge.js）進到天上城堡裡的學院（室內 data/interiors_starcastle.js，Codex 製作；文字 data/academy.js）。
   中央圓廳：守門人（data/academy.js 的 host）、台座上浮著十色小星環（依各科點亮的比例發光）、北邊的大講堂大門（累計上幾堂星環課後打開，v9.5.1 greathall.js）。
   圓廳周圍十間教室，一科一間：
   - 門牌、黑板（寫著這間教室最近一堂課的板書）、左牆一排「星窗」（一扇一個單元，燈塔點亮了就亮——城堡亮起的窗就是這些）。
   - 講台的星石「上星環課」：那一科的導師用星影上課——選一個單元 → 讀一則潮汐筆記 → 答三題；三題全對而那座燈塔還沒點亮，就問要不要馬上做單元試煉。
     每天每間教室的第一堂課有鈴錢（答對一題 120，三題全對再 +10 潮晶）；累計上 10、30、60 堂課各送一件學院家具。
   - 看星窗：亮了幾扇，打開航海圖的這一科去點亮。
   紀錄：S().sa = { open, letter, first, met, att: { sid: 堂數 }, today: { d, done: { sid: 1 } }, total, prizes, notes: { uid: 下一則筆記 }, board: { sid: { u, t, r, d } } } */
import * as THREE from 'three';
import { chibi, nameMesh } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, dayKey } from './state.js';
import { drill, picker } from './drill.js';
import * as voyage from './voyage.js';
import * as memo from './memo.js';
import * as story from './story.js';
import { HOST, isOpen } from './starbridge.js';
import { HALL_NEED, hallOpen, lessons, summary as hallSummary, openCard, opening as hallOpening, summitOpen } from './greathall.js';
import { wins as summitWins } from './summit.js';

const TA = window.TA, L = TA.L;
export const PRIZE_AT = [10, 30, 60];
const BELL = 120, GEMS = 10;
let ctx = null, hostObj = null, R = null, tickT = 0;
const D = () => I.ACADEMY || {};
const one = a => (a && a.length ? a[Math.floor(Math.random() * a.length)] : '');
const rec = () => { const s = S(), a = s.sa = s.sa || {}; a.att = a.att || {}; a.notes = a.notes || {}; a.board = a.board || {}; if (!a.today || a.today.d !== dayKey()) a.today = { d: dayKey(), done: {} }; return a; };
const subj = sid => TA.subject(sid) || { name: '', color: '#9fb6ff' };
const units = sid => TA.DATA.units[sid] || [];
const isLit = u => ((TA.S.units || {})[u.id] || {}).stars > 0;
const roomName = sid => (D().rooms || {})[sid] || subj(sid).name + '教室';
const hostSp = () => { const h = HOST(); return { name: h.name, color: h.color, voice: h.voice, mesh: hostObj && hostObj.mesh }; };
/** 那一科的導師（用星影上課：名字後面加「（星影）」，人不在城堡裡） */
function tutor(sid) { const v = (I.VILLAGERS || []).find(x => x.sid === sid) || {}; return { name: `${v.name || subj(sid).name + '老師'}（星影）`, color: v.color || subj(sid).color, voice: v.voice || 400 }; }
export function init(c) { ctx = c; }

/* ---------- 守門人 ---------- */
/** 圓廳裡的守門人（第一次進城堡時才建立角色） */
export function host() {
  if (hostObj) return hostObj;
  const h = HOST(), m = chibi(Object.assign({ kind: 'human', fur: '#ffe6d8', shirt: '#dfe4ff', pants: '#8f9ad6', hair: '#c9d2ff', shoe: '#7a7fb8' }, h.look || {}));
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c4').multiplyScalar(2.2) })); star.position.y = 1.78; star.name = 'sa-star'; m.add(star);   // 頭頂一顆慢慢轉的小星
  nameMesh(h.name, m);
  hostObj = { isAcademy: true, sid: 'academy', name: h.name, color: h.color, voice: h.voice, mesh: m };
  return hostObj;
}
/** 和守門人說話：第一次依序自我介紹，之後一句問候；選單：學院的事、學生證 */
export async function talk() {
  const a = rec(), sp = hostSp();
  if (!a.met) { a.met = dayKey(); save(); for (const l of D().greet || ['歡迎來到星環學院。']) await ui.say(sp, l); }
  else await ui.say(sp, one(D().hello) || '今天也來上課嗎？');
  const i = await ui.ask(sp, '想聊什麼呢？', ['學院的事', '看學生證', '沒事了']);
  if (i === 0) for (const l of D().about || []) await ui.say(sp, l);
  else if (i === 1) { ui.closeDialog(); open(); }
}

/* ---------- 擺上這次進門的東西（house.js 的 dress） ---------- */
const FONT = '"Microsoft JhengHei", "PingFang TC", system-ui, sans-serif';
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { cv, t }; }
/** 星窗的貼圖：圓拱窗裡一顆星（顏色由每扇窗的 instanceColor 決定） */
const STARTEX = (() => typeof document === 'undefined' ? null : canvasTex(128, 192, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h * 0.52, 4, w / 2, h * 0.52, w * 0.62); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#d8dcf0'); g.addColorStop(1, '#8a90b0');
  c.fillStyle = g; c.beginPath(); c.moveTo(6, h - 4); c.lineTo(6, w / 2); c.arc(w / 2, w / 2, w / 2 - 6, Math.PI, 0); c.lineTo(w - 6, h - 4); c.closePath(); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 13 : 32, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(w / 2 + Math.cos(a) * r, h * 0.52 + Math.sin(a) * r); } c.closePath(); c.fill();
}).t)();
function chalk(c, w, h, sid) {
  const s = subj(sid), b = rec().board[sid];
  c.fillStyle = '#2c463e'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.025})`; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 40 + Math.random() * 120, 10 + Math.random() * 30, Math.random() * 3, 0, 7); c.fill(); }   // 擦過的粉筆痕
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = s.color; c.font = `800 ${Math.round(h * 0.13)}px ${FONT}`; c.fillText(roomName(sid), w / 2, h * 0.16);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  if (b) {
    c.font = `700 ${Math.round(h * 0.12)}px ${FONT}`; c.fillText(b.u, w / 2, h * 0.4, w * 0.9);
    c.font = `600 ${Math.round(h * 0.085)}px ${FONT}`; c.fillStyle = '#f3e6a8'; c.fillText(`重點：${b.t}`, w / 2, h * 0.58, w * 0.9);
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = `700 ${Math.round(h * 0.1)}px ${FONT}`; c.fillText(b.r.map(x => (x ? '○' : '✕')).join('　'), w / 2, h * 0.75);
    c.font = `500 ${Math.round(h * 0.055)}px ${FONT}`; c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText(`最近一堂課 · ${b.d}`, w / 2, h * 0.9);
  } else {
    c.font = `700 ${Math.round(h * 0.1)}px ${FONT}`; c.fillText('星環課', w / 2, h * 0.44);
    c.font = `500 ${Math.round(h * 0.07)}px ${FONT}`; c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillText('到講台前，選一個單元聽導師上課', w / 2, h * 0.64, w * 0.9);
  }
}
/** 第一次進門：黑板換成畫了字的貼圖（黑板是室內模型的一部分，進門之間一直留著） */
function boards(g) {
  if (R.boards) return;
  R.boards = {};
  TA.SUBJECTS.forEach(s => {
    const m = g.getObjectByName('board_' + s.id); if (!m || !m.isMesh) return;
    const { cv, t } = canvasTex(1024, 444, (c, w, h) => chalk(c, w, h, s.id));
    m.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.14 });
    R.boards[s.id] = { cv, t };
  });
}
function paintBoard(sid) { const b = R && R.boards && R.boards[sid]; if (!b) return; chalk(b.cv.getContext('2d'), b.cv.width, b.cv.height, sid); b.t.needsUpdate = true; }
/** 圓廳台座上的十色小星環：一段一科，點亮的比例越高越亮 */
function ringModel() {
  const g = new THREE.Group(), n = TA.SUBJECTS.length, gap = 0.05;
  g.userData.segs = TA.SUBJECTS.map((s, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.055, 8, 24, Math.PI * 2 / n - gap * 2), new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.2 }));
    m.rotation.z = i / n * Math.PI * 2 + gap; g.add(m); return m;
  });
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d6').multiplyScalar(1.6), transparent: true, opacity: 0.7 })); g.add(inner);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c4').multiplyScalar(2) })); g.add(core); g.userData.core = core;
  g.rotation.x = -Math.PI / 2 + 0.38;   // 斜斜地浮著，像天上那一圈星環
  return g;
}
function paintRing() {
  if (!R || !R.ring) return;
  const subs = TA.SUBJECTS; R.ring.userData.segs.forEach((m, i) => { const u = units(subs[i].id), k = u.length ? u.filter(isLit).length / u.length : 0; m.material.emissiveIntensity = 0.08 + k * 1.6; m.material.color.set(subs[i].color).multiplyScalar(0.55 + k * 0.45); });
}
/** 門牌：教室名字＋科目 */
function plate(sid, r) {
  const a = r.a, [x, y, z] = r.plate, { t } = canvasTex(512, 118, (c, w, h) => {
    c.fillStyle = '#f7f1e3'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9a85a'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#4c4a6e'; c.font = `800 ${Math.round(h * 0.42)}px ${FONT}`; c.fillText(roomName(sid), w / 2, h * 0.44, w * 0.86);
    c.fillStyle = subj(sid).color; c.fillRect(w * 0.3, h * 0.76, w * 0.4, 5);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.31), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  m.position.set(x - Math.sin(a) * 0.03, y, z - Math.cos(a) * 0.03); m.rotation.y = a + Math.PI; return m;   // 面向圓心
}
/** 左牆的一排星窗：一扇一個單元（超過七個就排兩排），點亮的單元是科目色、亮著；還沒點亮的是暗暗的玻璃 */
function windows(sid, r) {
  const u = units(sid), n = u.length; if (!n || !r.wall) return null;
  const [x0, z0, x1, z1] = r.wall, [nx, nz] = r.wallN || [0, 1], rows = n > 7 ? 2 : 1, per = Math.ceil(n / rows), len = Math.hypot(x1 - x0, z1 - z0);
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.58, 0.04), new THREE.MeshStandardMaterial({ color: '#d9bf7a', roughness: 0.45, metalness: 0.5 }), n);
  const panes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.33, 0.49), new THREE.MeshBasicMaterial({ map: STARTEX, transparent: true }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(nx, nz), 0)), p = new THREE.Vector3(), one3 = new THREE.Vector3(1, 1, 1);
  u.forEach((x, i) => {
    const row = Math.floor(i / per), col = i % per, k = (col + 0.5) / per, y = rows === 2 ? (row ? 1.72 : 2.45) : 2.1, lx = x0 + (x1 - x0) * (0.06 + k * 0.88), lz = z0 + (z1 - z0) * (0.06 + k * 0.88);
    p.set(lx + nx * 0.02, y, lz + nz * 0.02); m4.compose(p, q, one3); frames.setMatrixAt(i, m4);
    p.set(lx + nx * 0.045, y, lz + nz * 0.045); m4.compose(p, q, one3); panes.setMatrixAt(i, m4);
  });
  const g = new THREE.Group(); g.add(frames, panes); g.userData = { sid, panes, n, len }; paintWindows(g); return g;
}
const _c = new THREE.Color();
function paintWindows(g) {
  const { sid, panes } = g.userData, s = subj(sid);
  units(sid).forEach((u, i) => { panes.setColorAt(i, isLit(u) ? _c.set(s.color).multiplyScalar(1.9) : _c.set('#454a66')); });
  if (panes.instanceColor) panes.instanceColor.needsUpdate = true;
}
/** house.js 進門時呼叫：這次要擺的東西（出門時拿掉）；g 是整棟室內（黑板留在上面） */
export function dress(ud, g) {
  R = { ring: null, wins: [], lit: story.litCount(), boards: R && R.boards };
  const out = [], rooms = ud.rooms || {};
  if (g) boards(g);
  const at = g && g.getObjectByName('ring_at'), rp = new THREE.Vector3(0, 2.4, 0); if (at) at.getWorldPosition(rp);
  R.ring = ringModel(); R.ring.position.copy(rp); out.push(R.ring); paintRing();
  TA.SUBJECTS.forEach(s => { const r = rooms[s.id]; if (!r) return; if (r.plate) out.push(plate(s.id, r)); const w = windows(s.id, r); if (w) { out.push(w); R.wins.push(w); } });
  return out;
}
export function undress() { R = R ? { boards: R.boards } : null; }
/** 在城堡裡的每一格：小星環慢慢轉、星窗依燈塔重畫 */
export function tick(dt, t) {
  if (!R || !R.ring) return;
  R.ring.rotation.z += dt * 0.12; R.ring.position.y += Math.sin(t * 1.1) * 0.0008; R.ring.userData.core.rotation.y += dt * 0.8;
  if (hostObj) { const st = hostObj.mesh.getObjectByName('sa-star'); if (st) { st.rotation.y += dt * 1.5; st.position.y = 1.78 + Math.sin(t * 2) * 0.04; } }
  if ((tickT -= dt) > 0) return; tickT = 1;
  const n = story.litCount(); if (n !== R.lit) { R.lit = n; paintRing(); R.wins.forEach(paintWindows); Audio.sfx('rare'); ui.toast('教室牆上又亮起一扇星窗'); }
}

/* ---------- 教室的互動（house.js 的 hook:academy，topic 是哪一個） ---------- */
let busy = false;
export async function act(topic) {
  if (busy) return; busy = true;
  try { await run(String(topic || '')); } finally { busy = false; ui.passage(null); ui.closeDialog(); if (ctx && ctx.paint) ctx.paint(); }
}
async function run(topic) {
  const [k, sid] = topic.split(':'), sp = hostSp();
  if (k === 'ring') {
    const lit = story.litCount(), tot = story.unitTotal();
    await ui.say(sp, (one(D().ring) || '小星環亮著 {lit}／{total}。').replace(/\{lit\}/g, lit).replace(/\{total\}/g, tot));
    const i = await ui.ask(sp, `十段星環，一段一科：一共點亮了 ${lit}／${tot} 座單元燈塔。`, ['看各科的星環', '好']); if (i === 0) { ui.closeDialog(); story.open(); }
    return;
  }
  if (k === 'hall') {   // v9.5.1 大講堂：累計上 HALL_NEED 堂星環課後打開
    if (!hallOpen()) { await ui.say(sp, (one(D().hall) || '再上 {n} 堂星環課，大講堂的門就會打開。').replace(/\{n\}/g, HALL_NEED - lessons())); return; }
    await hallOpening(); ui.closeDialog(); if (ctx && ctx.enterHall) ctx.enterHall(); return;   // 第一次開門：望舒先在門前說幾句，再一起走進去
  }
  if (k === 'wall' && sid) return wall(sid);
  if (k === 'lesson' && sid) return lesson(sid);
}
async function wall(sid) {
  const u = units(sid), lit = u.filter(isLit).length, s = subj(sid), sp = { name: '星窗', color: s.color, voice: 640 };
  const next = u.filter(x => !isLit(x)).sort((a, b) => L.unitStats(b.id).mastery - L.unitStats(a.id).mastery)[0];
  const i = await ui.ask(sp, `${roomName(sid)}的牆上有 ${u.length} 扇星窗，一扇是一個單元：亮了 ${lit} 扇。${next ? `下一扇最接近點亮的是「${next.name}」。` : '全部都亮了！'}`, [next ? `做「${next.name}」的單元試煉` : '再看一次航海圖', `打開${s.name}的航海圖`, '好']);
  ui.closeDialog();
  if (i === 0 && next) voyage.runUnit(next.id); else if (i === 0 || i === 1) voyage.openChart(sid);
}
/** 單元的順序：還沒點亮的在前（精熟度低的先），點亮了的在後 */
function order(sid) { const u = units(sid).slice(), m = x => L.unitStats(x.id).mastery; return u.filter(x => !isLit(x)).sort((a, b) => m(a) - m(b)).concat(u.filter(isLit).sort((a, b) => m(a) - m(b))); }
async function pickUnit(sp, sid) {
  const list = order(sid); let page = 0;
  for (;;) {
    const part = list.slice(page * 4, page * 4 + 4), more = list.length > (page + 1) * 4;
    const opts = part.map(u => `${u.name}${isLit(u) ? ' ★' : ''}`).concat(more ? ['其他單元…'] : page ? ['回到第一頁'] : [], ['下次再上']);
    const i = await ui.ask(sp, '今天想上哪一個單元？（★ 是燈塔已經點亮的）', opts);
    if (i < part.length) return part[i];
    if (opts[i] === '其他單元…') { page++; continue; }
    if (opts[i] === '回到第一頁') { page = 0; continue; }
    return null;
  }
}
async function lesson(sid) {
  const a = rec(), sp = tutor(sid), Ls = (D().lesson || {})[sid] || {};
  Audio.sfx('rare'); await ui.say(sp, one(Ls.intro) || '我們開始吧。');
  const u = await pickUnit(sp, sid); if (!u) return;
  const notes = u.notes || [], ni = (a.notes[u.id] || 0) % Math.max(1, notes.length), note = notes[ni];
  if (note) { a.notes[u.id] = ni + 1; save(); await ui.card({ icon: '', title: `📖「${u.name}」的筆記`, sub: `<b>${note.t}</b><br>${note.b}` }); }
  const ids = (L.BY_UNIT[u.id] || []).filter(id => !L.Q[id].pid);
  const res = await drill(sp, picker({ mode: 'ids', ids: ids.length >= 3 ? ids : L.BY_UNIT[u.id] || [] }), 3, {});
  if (!res.n) return;
  const r = []; for (let i = 0; i < res.n; i++) r.push(i < res.ok ? 1 : 0);
  a.board[sid] = { u: u.name, t: note ? note.t : u.name, r, d: dayKey() };
  const first = !a.today.done[sid]; a.today.done[sid] = 1; a.att[sid] = (a.att[sid] || 0) + 1; a.total = (a.total || 0) + 1; save(); paintBoard(sid);
  await ui.say(sp, one(res.ok >= 3 ? Ls.good : res.ok ? Ls.soso : Ls.low) || (res.ok >= 3 ? '全對，很好！' : '慢慢來。'));
  if (first) {
    const b = res.ok * BELL; S().bells += b; if (res.ok >= 3) L.gain(0, GEMS); save(); TA.Store.save(); Audio.sfx('coin');
    if (b) ui.toast(`今天第一堂${roomName(sid)}的課：+${b} 鈴錢${res.ok >= 3 ? ` · +${GEMS} 潮晶` : ''}`);
  }
  if (a.total === 1) memo.add('在星環學院上了第一堂課', `${roomName(sid)}的星石亮了起來，${sp.name.replace('（星影）', '')}透過星影替你上了「${u.name}」。`, { key: 'sa:lesson', icon: '🏰' });
  await prize();
  if (res.ok >= 3 && !isLit(u)) {
    await ui.say(sp, one(Ls.light) || '這一扇星窗可以點亮了。');
    const i = await ui.ask(sp, `「${u.name}」的燈塔還沒點亮：單元試煉正確率 60% 以上，牆上這扇星窗就會亮起來。`, ['現在做單元試煉', '下次再說']);
    if (i === 0) { ui.closeDialog(); voyage.runUnit(u.id); }
  }
}
/** 累計上 10、30、60 堂課：送學院家具 */
async function prize() {
  const a = rec(), P = D().prizes || []; a.prizes = a.prizes || 0;
  while (a.prizes < PRIZE_AT.length && (a.total || 0) >= PRIZE_AT[a.prizes]) {
    const f = P[a.prizes], k = PRIZE_AT[a.prizes]; a.prizes++; save();
    if (f && ctx && ctx.giveFurn) { ui.closeDialog(); await ctx.giveFurn(f.id, `在星環學院上了 ${k} 堂課`); }
  }
}

/* ---------- 手機：星環學院的學生證 ---------- */
export function open() {
  const a = rec(), card = D().card || {}, h = HOST(), body = ui.el('div', 'sa-card');
  const nextP = PRIZE_AT.find(k => (a.total || 0) < k);
  const rows = TA.SUBJECTS.map(s => {
    const u = units(s.id), b = a.board[s.id];
    return `<li style="--c:${s.color}"><b>${ui.esc(roomName(s.id))}</b><span>${a.att[s.id] || 0} 堂</span><small>${u.filter(isLit).length}／${u.length} 扇星窗${a.today.done[s.id] ? ' · 今天上過了' : ''}</small>${b ? `<em>${ui.esc(b.u)}</em>` : ''}</li>`;
  }).join('');
  body.innerHTML = `<div class="sa-id"><div class="sa-seal">✦</div><div><b>${ui.esc(card.title || '星環學院學生證')}</b><small>${ui.esc(h.title || '星環學院')} · ${ui.esc(h.name)}</small></div><div class="sa-n"><b>${a.total || 0}</b><small>堂課</small></div></div>
    <p class="sa-rule">${ui.esc(card.rule || '')}</p>
    ${isOpen() ? '' : `<p class="sa-lock">光橋還沒接起來：再點亮 ${Math.max(0, 3 - story.litCount())} 座單元燈塔，學院台地東北角的光橋石門就會通往城堡。</p>`}
    ${hallSummary()}${summitOpen() ? `<p class="sa-prize">星環之頂：${summitWins() ? `已經驅散最終首領 ${summitWins()} 次` : '大講堂講台後的樓梯打開了，最終首領在上面等你'}</p>` : ''}
    <p class="sa-prize">${nextP ? `再上 ${nextP - (a.total || 0)} 堂課，可以拿到下一件學院家具（${a.prizes || 0}／${PRIZE_AT.length}）` : '三件學院家具都拿到了'}</p>
    <ul class="sa-rooms">${rows}</ul>`;
  ui.panel('星環學院', body, { cls: 'phone' });
  const gc = body.querySelector('.sa-gc'); if (gc) gc.onclick = () => openCard();
}
export const debug = () => ({ rec: JSON.parse(JSON.stringify(rec())), dressed: !!(R && R.ring), wins: R ? (R.wins || []).length : 0, boards: R && R.boards ? Object.keys(R.boards).length : 0 });
