/* 潮汐小島 · 星環學院的大講堂（v9.5.1）：圓廳北邊的大門（累計上 HALL_NEED 堂星環課後打開）通往大講堂（室內 data/interiors_starhall.js，Codex 製作；文字 data/academy.js 的 grand）。
   每週一份總模擬考：講台前五張考桌，一科一張（國文、英文、數學、社會、自然；只考你的考科）——坐下考一節短版（每節 10 題、數學 6 題，限時照潮汐考場的短版換算）。
   - 每週第一次應考才計入成績單；每節依分數給鈴錢（1 分 BELL_PT 鈴錢）。
   - 你的考科都考完：講台後的星圖黑板貼出成績單（各科級分、總級分，和上一份比），再送 CARD_BELLS 鈴錢與 CARD_GEMS 潮晶；
     第一份成績單送一件家具，講台後通往星環之頂的樓梯光幕也打開（v9.5.2 summit.js）。
   紀錄：S().sa.grand = { w 這週一, secs: { 國文: { g 實際的考科（數學A／數學B）, n, pts, pct, at } }, cards: [{ w, at, rows: [{ k, g, pct, lv }], lv, max }], pend 成績單出爐、還沒宣布的那週, opened } */
import * as THREE from 'three';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import * as hall from './hall.js';
import * as memo from './memo.js';
import { HOST } from './starbridge.js';

const TA = window.TA, L = TA.L;
export const HALL_NEED = 5, N0 = 10, SIZE = { 數學: 6 }, BELL_PT = 8, CARD_BELLS = 1000, CARD_GEMS = 30;
export const KEYS = { 國文: 'zh', 英文: 'en', 數學: 'ma', 社會: 'so', 自然: 'na' };
const COLOR = { 國文: '#ff8fa3', 英文: '#7cc7ff', 數學: '#b9a2ff', 社會: '#ffb86b', 自然: '#5ee7f0' };
const FONT = '"Microsoft JhengHei", "PingFang TC", system-ui, sans-serif';
let ctx = null, R = null, tickT = 0, busy = false;
const D = () => (I.ACADEMY || {}).grand || {};
const one = a => (a && a.length ? a[Math.floor(Math.random() * a.length)] : '');
const hostSp = () => { const h = HOST(); return { name: h.name, color: h.color, voice: h.voice }; };
/** 這週一（週一換新考卷） */
export const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return TA.U.dayKey(d); };
export function rec() {
  const s = S(), a = s.sa = s.sa || {}, g = a.grand = a.grand || {}, w = weekKey();
  g.cards = g.cards || [];
  if (g.w !== w) { g.w = w; g.secs = {}; }
  g.secs = g.secs || {};
  return g;
}
/** 你的考科（照 TA.GROUPS 的順序） */
export const groups = () => { const t = L.trackGroups(); return TA.GROUPS.filter(g => t.includes(g)); };
export const size = k => SIZE[k] || N0;
export const lessons = () => ((S().sa || {}).total || 0);
export const hallOpen = () => lessons() >= HALL_NEED;
export const summitOpen = () => rec().cards.length > 0;
export const lastCard = () => { const c = rec().cards; return c[c.length - 1] || null; };
export function init(c) { ctx = c; }

/* ---------- 成績單 ---------- */
/** 和上一份比：兩份都考過的考科，級分加總的差 */
function delta(card, prev) {
  if (!prev) return null;
  let d = 0, n = 0; card.rows.forEach(x => { const p = prev.rows.find(y => y.k === x.k); if (p) { d += x.lv - p.lv; n++; } });
  return n ? d : null;
}
function makeCard(r) {
  const rows = groups().map(k => { const s = r.secs[k]; return { k, g: s.g, pct: s.pct, lv: L.pctToLevel(s.pts / Math.max(1, s.n)) }; });
  const card = { w: r.w, at: Date.now(), rows, lv: rows.reduce((a, x) => a + x.lv, 0), max: rows.length * 15 };
  r.cards.push(card); r.cards = r.cards.slice(-12); r.pend = r.w;
  S().bells += CARD_BELLS; L.gain(0, CARD_GEMS);
  return card;
}
const wkText = w => { const d = new Date(w + 'T00:00:00'), e = new Date(d); e.setDate(d.getDate() + 6); return `${d.getMonth() + 1}/${d.getDate()}–${e.getMonth() + 1}/${e.getDate()}`; };
/** 成績單面板：各科分數與級分、和上一份比、最近幾份的總級分 */
export function openCard(card) {
  const r = rec(); card = card || lastCard(); if (!card) return;
  const at = r.cards.indexOf(card), prev = at > 0 ? r.cards[at - 1] : null, d = delta(card, prev), body = ui.el('div', 'sa-card sa-grand');
  const arrow = x => { const p = prev && prev.rows.find(y => y.k === x.k); if (!p) return '<i>—</i>'; const k = x.lv - p.lv; return k > 0 ? `<i class="up">▲${k}</i>` : k < 0 ? `<i class="down">▼${-k}</i>` : '<i>—</i>'; };
  const hist = r.cards.slice(-8);
  body.innerHTML = `<div class="sa-id"><div class="sa-seal">📜</div><div><b>總模擬考成績單</b><small>${wkText(card.w)} · ${ui.esc(HOST().name)} 監考</small></div><div class="sa-n"><b>${card.lv}</b><small>／${card.max} 級分</small></div></div>
    <ul class="sa-rows">${card.rows.map(x => `<li style="--c:${COLOR[x.k] || '#9fb6ff'}"><b>${ui.esc(x.k === '數學' ? x.g : x.k)}</b><span>${x.pct} 分</span><em>${x.lv} 級分</em>${arrow(x)}</li>`).join('')}</ul>
    <p class="sa-rule">${d == null ? '這是你的第一份成績單：下週一換新考卷，再來比比看。' : d > 0 ? `比上一份多了 ${d} 級分。` : d < 0 ? `比上一份少了 ${-d} 級分：看看是哪一科，挑那一科的單元多練幾題。` : '和上一份差不多。'}級分照這份短版考卷的分數換算（每 6.5% 約一級），只是參考。</p>
    ${hist.length > 1 ? `<div class="sa-hist">${hist.map(c => `<span style="--k:${(c.lv / Math.max(1, c.max)).toFixed(3)}"${c === card ? ' class="on"' : ''}><i></i><small>${c.lv}</small></span>`).join('')}</div>` : ''}`;
  ui.panel('星環學院 · 成績單', body, { cls: 'phone' });
}

/* ---------- 擺上這次進門的東西（house.js 的 dress） ---------- */
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { cv, t }; }
/** 講台後的星圖黑板：這週每一節考了幾分；成績單出爐了就寫總級分 */
function chart(c, w, h) {
  const r = rec(), mine = groups(), card = lastCard(), now = card && card.w === r.w ? card : null;
  c.fillStyle = '#1e2747'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,240,${0.15 + Math.random() * 0.4})`; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, Math.random() * 1.8 + 0.4, 0, 7); c.fill(); }   // 星圖的小星
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#f3e3b0'; c.font = `800 ${Math.round(h * 0.1)}px ${FONT}`; c.fillText(`總模擬考 · ${wkText(r.w)}`, w / 2, h * 0.12);
  const cols = TA.GROUPS.length, cw = w * 0.86 / cols, x0 = w * 0.07;
  TA.GROUPS.forEach((g, i) => {
    const x = x0 + cw * (i + 0.5), s = r.secs[g], on = mine.includes(g);
    c.globalAlpha = on ? 1 : 0.35;
    c.strokeStyle = COLOR[g]; c.lineWidth = 5; c.beginPath(); c.arc(x, h * 0.44, h * 0.15, 0, Math.PI * 2); c.stroke();
    if (s) { c.fillStyle = COLOR[g]; c.beginPath(); c.arc(x, h * 0.44, h * 0.15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, s.pct / 100)); c.lineTo(x, h * 0.44); c.closePath(); c.globalAlpha = 0.35; c.fill(); c.globalAlpha = 1; }
    c.fillStyle = '#ffffff'; c.font = `800 ${Math.round(h * 0.085)}px ${FONT}`; c.fillText(s ? `${s.pct}` : on ? '—' : '', x, h * 0.44);
    c.fillStyle = COLOR[g]; c.font = `700 ${Math.round(h * 0.07)}px ${FONT}`; c.fillText(g, x, h * 0.68);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = `500 ${Math.round(h * 0.05)}px ${FONT}`; c.fillText(!on ? '不在考科' : s ? `${L.pctToLevel(s.pts / Math.max(1, s.n))} 級分` : '還沒考', x, h * 0.78);
    c.globalAlpha = 1;
  });
  c.font = `600 ${Math.round(h * 0.06)}px ${FONT}`; c.fillStyle = '#f3e3b0';
  const left = mine.filter(g => !r.secs[g]).length;
  c.fillText(now ? `本週成績單：總級分 ${now.lv}／${now.max}` : `本週還有 ${left} 節${card ? ` · 上一份成績單 ${card.lv}／${card.max} 級分` : ''}`, w / 2, h * 0.92, w * 0.9);
}
/** 考桌的名牌：考科＋這週的狀態 */
function plateDraw(c, w, h, g) {
  const s = rec().secs[g], on = groups().includes(g);
  c.fillStyle = '#f7f1e3'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9a85a'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10);
  c.fillStyle = COLOR[g]; c.fillRect(14, 14, 14, h - 28);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#4c4a6e'; c.font = `800 ${Math.round(h * 0.4)}px ${FONT}`; c.fillText(g, w * 0.4, h * 0.5);
  c.font = `700 ${Math.round(h * 0.28)}px ${FONT}`; c.fillStyle = s ? '#3f8a5a' : on ? '#7d7a96' : '#b0aab8'; c.fillText(s ? `✓ ${s.pct} 分` : on ? '這週還沒考' : '不在考科', w * 0.75, h * 0.5, w * 0.42);
}
function paintAll() {
  if (!R) return;
  if (R.board) { chart(R.board.cv.getContext('2d'), R.board.cv.width, R.board.cv.height); R.board.t.needsUpdate = true; }
  (R.plates || []).forEach(p => { plateDraw(p.cv.getContext('2d'), p.cv.width, p.cv.height, p.g); p.t.needsUpdate = true; });
  paintVeil();
}
function paintVeil() {
  const v = R && R.veil; if (!v) return;
  const on = summitOpen(); v.material.transparent = true; v.material.depthWrite = false; v.material.opacity = on ? 0.62 : 0.22;
  if (v.material.color) v.material.color.set(on ? '#ffe9b8' : '#8f97c9'); if (v.material.emissive) { v.material.emissive.set(on ? '#ffd88a' : '#4a5180'); v.material.emissiveIntensity = on ? 1.1 : 0.25; }
}
/** house.js 進門時呼叫：黑板換成星圖成績單、考桌掛名牌、樓梯光幕依星環之頂開了沒有換亮度 */
export function dress(ud, g) {
  const keep = R && R.boardOf === g ? R.board : null;
  R = { board: keep, boardOf: g, plates: [], veil: g && g.getObjectByName('summit_veil') };
  const out = [];
  if (g && !R.board) {
    const m = g.getObjectByName('board_grand');
    if (m && m.isMesh) { const { cv, t } = canvasTex(1280, 555, chart); m.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.3 }); R.board = { cv, t }; }
  }
  if (R.veil && R.veil.isMesh && !R.veil.userData.own) { R.veil.material = R.veil.material.clone(); R.veil.userData.own = true; }   // 光幕用自己的材質（室內模型可能和別的零件共用）
  Object.entries(KEYS).forEach(([gname, k]) => {
    const d = (ud.desks || {})[k]; if (!d || !d.plate) return;
    const [x, y, z, ry] = d.plate, { cv, t } = canvasTex(512, 136, (c, w, h) => plateDraw(c, w, h, gname));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.24), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); m.position.set(x, y, z); m.rotation.y = ry;
    out.push(m); R.plates.push({ g: gname, cv, t });
  });
  paintAll();
  return out;
}
export function undress() { R = R ? { board: R.board, boardOf: R.boardOf } : null; }
/** 在大講堂裡的每一格：成績單出爐了，等結果頁關掉再由望舒宣布 */
export function tick(dt) {
  if ((tickT -= dt) > 0) return; tickT = 0.5;
  const r = rec(); if (!r.pend || busy || ui.panelOpen() || ui.dialogOpen() || ui.cardOpen()) return;
  act('announce');
}

/* ---------- 互動（house.js 的 hook:starhall） ---------- */
export async function act(topic) {
  if (busy) return; busy = true;
  try { await run(String(topic || '')); } finally { busy = false; ui.closeDialog(); paintAll(); if (ctx && ctx.paint) ctx.paint(); }
}
async function run(topic) {
  const [k, key] = topic.split(':'), sp = hostSp(), G = D(), r = rec();
  if (k === 'desk' && key) return desk(key);
  if (k === 'announce') return announce();
  if (k === 'board') {
    const card = lastCard(), now = card && card.w === r.w;
    if (now) { ui.closeDialog(); openCard(card); return; }
    const left = groups().filter(g => !r.secs[g]).length;
    const i = await ui.ask(sp, (one(G.board) || '成績單還沒出來：這週還有 {n} 節。').replace(/\{n\}/g, left), card ? ['看上一份成績單', '好'] : ['好']);
    if (card && i === 0) { ui.closeDialog(); openCard(card); }
    return;
  }
  if (k === 'summit') {
    if (!summitOpen()) { await ui.say(sp, one(G.stairs) || '樓梯的光幕還不讓人上去。'); return; }
    if (ctx && ctx.enterSummit) { ui.closeDialog(); ctx.enterSummit(); } else await ui.say(sp, '樓梯上面的星環之頂還在整理，下次再來吧。');
  }
}
async function desk(key) {
  const grp = Object.keys(KEYS).find(g => KEYS[g] === key), sp = hostSp(), G = D(), r = rec(); if (!grp) return;
  if (!groups().includes(grp)) { await ui.say(sp, one(G.off) || `${grp}不在你的考科裡。`); return; }
  const s = r.secs[grp];
  if (s) { await ui.say(sp, (one(G.again) || '這一節你考了 {score} 分，下週一換新考卷。').replace(/\{score\}/g, s.pct)); return; }
  await ui.say(sp, one(G.desk) || '先做會的，最後留一點時間檢查。');
  const n = size(grp); let eg = grp;
  if (grp === '數學') { const i = await ui.ask(sp, `數學這一節 ${n} 題：這週要考數學A 還是數學B？`, ['數學A', '數學B', '等一下']); if (i > 1) return; eg = i ? '數學B' : '數學A'; }
  const i = await ui.ask(sp, `${grp}這一節 ${n} 題，限時 ${hall.fmtT(L.mockSeconds(eg, n))}：交卷前不顯示對錯，交卷後看分數與詳解。這週只有第一次應考計入成績單。`, ['開始作答', '等一下']);
  if (i !== 0) return;
  ui.closeDialog(); Audio.sfx('rare');
  hall.runMock(eg, n, '', false, { where: '星環學院 · 大講堂', label: `${grp}總模擬考`, tag: 'grand', again: false, done: res => finish(grp, eg, res) });
}
/** 交卷（hall.runMock 的 done，在結果頁之前）：記這一節、給鈴錢；最後一節就出成績單 */
function finish(grp, eg, res) {
  const r = rec(); if (r.secs[grp] || !res.total) return;
  r.secs[grp] = { g: eg, n: res.total, pts: Math.round(res.pts * 100) / 100, pct: res.pct, at: Date.now() };
  const bells = Math.round(res.pct * BELL_PT); S().bells += bells;
  const left = groups().filter(g => !r.secs[g]), card = left.length ? null : makeCard(r);
  save(); TA.Store.save(); paintAll();
  res.extra = `<div class="hs-label">星環學院 · 總模擬考</div><p class="hs-info">這一節 <b>${res.pct}</b> 分（約 ${L.pctToLevel(res.pts / Math.max(1, res.total))} 級分）· +${bells} 鈴錢。${card ? `你的考科都考完了：成績單貼在講台後的星圖黑板上（總級分 ${card.lv}／${card.max}，+${CARD_BELLS} 鈴錢 · +${CARD_GEMS} 潮晶）。` : `這週還有 ${left.length} 節：${left.join('、')}。`}</p>` + (res.extra || '');
}
/** 成績單出爐：望舒宣布、和上一份比；第一份成績單送家具、打開通往星環之頂的樓梯 */
async function announce() {
  const r = rec(), card = lastCard(), sp = hostSp(), G = D(); r.pend = null; save(); if (!card) return;
  const first = r.cards.length === 1, d = delta(card, r.cards[r.cards.length - 2]);
  Audio.sfx('levelup');
  await ui.say(sp, one(G.ready) || '成績單出來了。');
  if (d != null) await ui.say(sp, one(d > 0 ? G.up : d < 0 ? G.down : G.same) || '');
  ui.toast(`總模擬考成績單：總級分 ${card.lv}／${card.max} · +${CARD_BELLS} 鈴錢 · +${CARD_GEMS} 潮晶`);
  if (first) {
    for (const l of G.first || []) await ui.say(sp, l);
    memo.add('拿到第一份總模擬考成績單', `大講堂的星圖黑板貼出了成績單：總級分 ${card.lv}／${card.max}。講台後通往星環之頂的樓梯亮了起來。`, { key: 'sa:grand', icon: '📜' });
    paintVeil();
    if (G.prize && ctx && ctx.giveFurn) { ui.closeDialog(); await ctx.giveFurn(G.prize.id, '拿到第一份總模擬考成績單'); }
  }
  ui.closeDialog(); openCard(card);
}
/** 和望舒說話（在大講堂裡） */
export async function talk() {
  const sp = hostSp(), G = D();
  await ui.say(sp, one(G.hello) || '今天也來應考嗎？');
  const i = await ui.ask(sp, '想知道什麼呢？', ['總模擬考怎麼考', '看成績單', '沒事了']);
  if (i === 0) { for (const l of G.about || []) await ui.say(sp, l); await ui.say(sp, G.rule || ''); }
  else if (i === 1) { const c = lastCard(); if (c) { ui.closeDialog(); openCard(c); } else await ui.say(sp, '還沒有成績單：你的考科每一科都考完一節，成績單就會貼出來。'); }
}
/** 第一次走進大講堂：望舒帶路 */
export async function opening() {
  const r = rec(); if (r.opened) return; r.opened = Date.now(); save();
  for (const l of D().open || []) await ui.say(hostSp(), l);
  ui.closeDialog();
}
/** 手機學生證的一段：大講堂開了沒有、這週考了幾節、上一份成績單 */
export function summary() {
  if (!hallOpen()) return `<p class="sa-lock">大講堂：再上 ${HALL_NEED - lessons()} 堂星環課，圓廳北邊的大門就會打開。</p>`;
  const r = rec(), mine = groups(), done = mine.filter(g => r.secs[g]).length, c = lastCard();
  return `<p class="sa-prize">總模擬考：這週考了 ${done}／${mine.length} 節${c ? ` · 最近一份成績單 ${c.lv}／${c.max} 級分（${wkText(c.w)}）` : ''}${c ? ' <button type="button" class="btn ghost sm sa-gc">看成績單</button>' : ''}</p>`;
}
export const debug = () => ({ rec: JSON.parse(JSON.stringify(rec())), dressed: !!R, plates: R ? (R.plates || []).length : 0, board: !!(R && R.board), veil: !!(R && R.veil) });
