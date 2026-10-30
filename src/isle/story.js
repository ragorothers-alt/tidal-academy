/* 潮汐小島 · 主線「點亮星環」（v9.2）：島的北方天空浮著一座城堡，後面掛著分成十段的星環（一段一科）。
   每點亮一座單元燈塔（單元試煉 60% 以上），城堡就亮一扇窗、那一科的那一段就亮一點（fantasy.js 的 setCastleLit／setRing）。
   十二章、每週一章，跟著學測倒數走：第 k 章在故事開始後第 7(k-1) 天、或考前 84-7(k-1) 天開放（先到的那個），最後一章等考試那週；
   前一章做完才輪到下一章。章節開放那天會寄信，去找那一章的老師開始；目標達成後回去找他，聽完故事領獎勵。
   台詞在 data/story.js（Codex 撰寫）；這裡是目標、獎勵、開放時間與流程。紀錄：S().story。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, dayKey } from './state.js';
import * as fantasy from './fantasy.js';
import * as social from './social.js';
import * as memo from './memo.js';
import { daysLeft } from './cram.js';

const TA = window.TA, L = TA.L;
/* 每章的目標（都是開章之後才開始算）與獎勵 [鈴錢, 潮晶] */
const GOALS = {
  c1: [['lit', 1]], c2: [['correct', 20]], c3: [['daily', 2]], c4: [['lit', 2]], c5: [['boss', 1]], c6: [['correct', 40]],
  c7: [['weak', 15]], c8: [['lit', 2]], c9: [['daily', 3]], c10: [['correct', 50]], c11: [['lit', 1], ['daily', 2]], c12: [['daily', 1]]
};
const REWARD = { c1: [1000, 20], c2: [1200, 20], c3: [1200, 20], c4: [1500, 30], c5: [1500, 30], c6: [1500, 30], c7: [1800, 30], c8: [1800, 30], c9: [2000, 40], c10: [2000, 40], c11: [2500, 40], c12: [3000, 60] };
const FIRST = 84;   // 第一章在考前 84 天開放（故事開始得更早，就從開始那天起每週一章）
let ctx = null, tickT = 0, celebrate = 0;
export function init(c) { ctx = c; }
const chapters = () => ((I.STORY || {}).chapters || []).filter(c => GOALS[c.id]);
const data = () => { const s = S(); s.story = s.story || { ch: {}, sent: {} }; return s.story; };
const dayNo = k => TA.U.keyToNum(k);

/* ---------- 進度 ---------- */
const units = () => TA.SUBJECTS.flatMap(s => TA.DATA.units[s.id] || []);
const isLit = u => ((TA.S.units || {})[u.id] || {}).stars > 0;
export const litCount = () => units().filter(isLit).length;
export const unitTotal = () => units().length;
function correctIn(sid) { let n = 0; const q = TA.S.q || {}; for (const id in q) { const x = L.Q[id]; if (x && (sid ? x.subject === sid : L.inTrack(x.subject))) n += q[id].c || 0; } return n; }
const bossWins = () => Object.values(TA.S.boss || {}).reduce((a, b) => a + ((b && b.wins) || 0), 0);
/** 現在要考的科目裡精熟度最低的一科（第 7 章開章時決定） */
function weakest() { const L2 = L.trackSubjects(); return L2.map(sid => [sid, L.subjectStats(sid).mastery]).sort((a, b) => a[1] - b[1])[0]?.[0] || TA.SUBJECTS[0].id; }
const COUNT = { lit: () => litCount(), correct: () => correctIn(null), daily: () => TA.S.dailyDone || 0, boss: () => bossWins(), weak: r => correctIn(r.weak) };
const subjName = sid => (TA.subject(sid) || {}).name || '';
const GOAL_TEXT = { lit: n => `點亮 ${n} 座單元燈塔`, correct: n => `答對 ${n} 題`, daily: n => `完成 ${n} 次每日潮汐`, boss: n => `擊敗 ${n} 隻燈塔首領`, weak: (n, r) => `在${subjName(r.weak) || '最弱的那一科'}答對 ${n} 題` };
/** 這一章每個目標的 [說明, 目前, 需要] */
function progress(c, r) { return GOALS[c.id].map(([t, n]) => [GOAL_TEXT[t](n, r), Math.max(0, Math.min(n, COUNT[t](r) - ((r.base || {})[t] || 0))), n]); }
const met = (c, r) => progress(c, r).every(([, a, n]) => a >= n);

/* ---------- 章節的開放 ---------- */
/** 第 k 章（從 1 起）還要幾天開放；0 以下 = 已開放 */
function opensIn(k) {
  const s = data(), left = daysLeft(), since = dayNo(dayKey()) - dayNo(s.start || dayKey());
  if (k === 12) return left <= 7 ? 0 : left - 7;   // 最後一章：考試那週
  return Math.min(7 * (k - 1) - since, left - (FIRST - 7 * (k - 1)));
}
/** 現在輪到的那一章：{ k, c, r, state: 'wait'（還沒開放）| 'new'（去找老師開始）| 'on'（進行中）| 'ready'（回去找老師）| 'end'（全部完成） } */
export function current() {
  const s = data(), L2 = chapters();
  for (let i = 0; i < L2.length; i++) {
    const c = L2[i], r = s.ch[c.id] || {};
    if (r.done) continue;
    if (!s.start || opensIn(i + 1) > 0) return { k: i + 1, c, r, state: 'wait', days: s.start ? opensIn(i + 1) : null };
    return { k: i + 1, c, r, state: !r.on ? 'new' : met(c, r) ? 'ready' : 'on' };
  }
  return { k: L2.length, state: 'end' };
}
const whoName = sid => sid === 'shop' ? '阿潮' : ((I.VILLAGERS || []).find(v => v.sid === sid) || {}).name || '';

/* ---------- 每隔一會兒：開始故事、寄信、點亮新燈塔時城堡亮一扇窗、目標達成時提醒 ---------- */
export function tick(dt, outdoors) {
  if ((tickT -= dt) > 0) return; tickT = 2;
  const s = data();
  if (!s.start && ctx && ctx.ready()) { s.start = dayKey(); save(); }
  const n = litCount(), tot = unitTotal() || 1;
  if (s.lit != null && n > s.lit) { fantasy.flareRing(); Audio.sfx('rare'); ui.toast(`城堡那邊亮起了一扇窗（${n}／${tot}）`); }
  if (s.lit !== n) { s.lit = n; save(); }
  paintSky();
  const cur = current();
  if (cur.c && cur.state !== 'wait' && !s.sent[cur.c.id] && cur.c.letter) {
    s.sent[cur.c.id] = dayKey(); const L1 = cur.c.letter;
    social.sendLetter(Object.assign(cur.c.who === 'shop' ? { fromName: '阿潮' } : { from: cur.c.who }, { title: `星環・第 ${cur.k} 章：${L1.title}`, open: L1.open, text: L1.text, close: L1.close }));
    save(); setTimeout(() => ui.toast(`✉️ 收到一封信：「${L1.title}」`), 600);
  }
  if (cur.state === 'ready' && !cur.r.told) { cur.r.told = 1; save(); ui.toast(`💫 第 ${cur.k} 章的目標達成了！回去找${whoName(cur.c.who)}吧`); }
  if (daysLeft() < 0 && !s.after && I.STORY && I.STORY.after) { s.after = dayKey(); const A = I.STORY.after; social.sendLetter({ fromName: '潮汐小島的大家', title: A.title, open: A.open, text: A.text, close: A.close }); save(); }
  void outdoors;
}
/** 城堡的窗與十段星環，照現在的進度（點燈儀式那一陣子整圈全亮） */
function paintSky() {
  const tot = unitTotal() || 1, subs = TA.SUBJECTS, full = Date.now() < celebrate;
  fantasy.setCastleLit(full ? 1 : litCount() / tot);
  fantasy.setRing(subs.map(x => { const u = TA.DATA.units[x.id] || []; return full ? 1 : u.length ? u.filter(isLit).length / u.length : 0; }), subs.map(x => x.color));
}

/* ---------- 和老師說話 ---------- */
/** 島民對話選單裡的故事選項：[[文字, async fn]]（只有輪到的那一章的老師有） */
export function menu(v, sp) {
  const cur = current(); if (!cur.c || cur.c.who !== v.sid || !['new', 'on', 'ready'].includes(cur.state)) return [];
  const tag = cur.state === 'ready' ? '（目標達成！）' : cur.state === 'new' ? '（新章節）' : '';
  return [[`💫 星環・第 ${cur.k} 章「${cur.c.title}」${tag}`, () => talk(cur, sp)]];
}
async function sayAll(sp, lines) { for (const l of lines || []) await ui.say(sp, l); }
async function talk(cur, sp) {
  const s = data(), c = cur.c, r = s.ch[c.id] = s.ch[c.id] || {};
  if (cur.state === 'new') {
    await sayAll(sp, c.intro);
    r.on = dayKey(); if (GOALS[c.id].some(g => g[0] === 'weak')) r.weak = weakest();
    r.base = {}; GOALS[c.id].forEach(([t]) => { r.base[t] = COUNT[t](r); }); save();
    Audio.sfx('ok'); ui.toast(`💫 第 ${cur.k} 章：${progress(c, r).map(p => p[0]).join('、')}`);
    return;
  }
  if (cur.state === 'on') {
    const w = c.wait || []; await ui.say(sp, w[Math.floor(Math.random() * w.length)] || '慢慢來，我在這裡等你。');
    await ui.say(sp, '目前的進度：' + progress(c, r).map(([t, a, n]) => `${t}（${a}／${n}）`).join('；'));
    return;
  }
  await sayAll(sp, c.done);
  const [b, g] = REWARD[c.id]; r.done = dayKey(); S().bells += b; L.gain(0, g); save(); TA.Store.save();
  fantasy.flareRing(); Audio.sfx('levelup');
  if (c.memo) memo.add(c.memo.title, c.memo.sub, { key: 'story:' + c.id, icon: '💫' });
  await ui.card({ icon: null, title: `第 ${cur.k} 章完成：${c.title}`, sub: c.memo ? c.memo.sub : '', extra: `<p>+${b.toLocaleString()} 鈴錢 · +${g} 潮晶</p>` });
  if (cur.k === chapters().length) await finale();
  if (ctx && ctx.paint) ctx.paint();
}
/** 最後一章做完的那晚：大家一起點亮星環（之後幾分鐘整圈星環與城堡全亮） */
async function finale() {
  celebrate = Date.now() + 180000; paintSky(); fantasy.flareRing(); Audio.sfx('levelup');
  for (const [sid, line] of (I.STORY.finale || [])) { const v = ctx && ctx.who(sid); await ui.say(v ? ctx.sp(v) : { name: whoName(sid) || '島民', color: '#8fa8e8' }, line); }
  ui.closeDialog();
  await ui.card({ icon: null, title: '星環點亮了', sub: '你學會的東西，會一直亮著。', extra: `<p>城堡亮著 ${litCount()}／${unitTotal()} 扇窗</p>` });
}

/* ---------- 手機：點亮星環 ---------- */
export const badge = () => { const c = current(); return c.state === 'new' || c.state === 'ready' ? '!' : ''; };
/** 星環的示意圖：十段弧，依各科點亮比例填上科目顏色 */
function ringSvg() {
  const R = 64, W = 13, n = TA.SUBJECTS.length, gap = 0.06, P = (a, r) => [80 + Math.cos(a) * r, 80 + Math.sin(a) * r].map(v => v.toFixed(1)).join(' ');
  const arc = (a0, a1, col, op) => { const big = a1 - a0 > Math.PI ? 1 : 0; return `<path d="M ${P(a0, R)} A ${R} ${R} 0 ${big} 1 ${P(a1, R)}" stroke="${col}" stroke-opacity="${op}" stroke-width="${W}" fill="none" stroke-linecap="round"/>`; };
  return `<svg viewBox="0 0 160 160" class="st-ring" aria-hidden="true">${TA.SUBJECTS.map((x, i) => {
    const u = TA.DATA.units[x.id] || [], f = u.length ? u.filter(isLit).length / u.length : 0, a0 = -Math.PI / 2 + i / n * Math.PI * 2 + gap, a1 = a0 + Math.PI * 2 / n - gap * 2;
    return arc(a0, a1, x.color, 0.18) + (f > 0 ? arc(a0, a0 + (a1 - a0) * f, x.color, 1) : '');
  }).join('')}<text x="80" y="76" text-anchor="middle" class="st-n">${litCount()}</text><text x="80" y="96" text-anchor="middle" class="st-of">／${unitTotal()} 扇窗</text></svg>`;
}
export function open() {
  const s = data(), L2 = chapters(), cur = current(), body = ui.el('div', 'story');
  const subs = TA.SUBJECTS.map(x => { const u = TA.DATA.units[x.id] || [], k = u.filter(isLit).length; return `<span class="${L.inTrack(x.id) ? '' : 'off'}" style="--c:${x.color}"><b>${x.name}</b>${k}／${u.length}${L.inTrack(x.id) ? '' : '<small>不用考</small>'}</span>`; }).join('');
  const row = (c, i) => {
    const r = s.ch[c.id] || {}, k = i + 1, who = whoName(c.who);
    let st;
    if (r.done) st = `<em class="ok">完成</em>`;
    else if (cur.k === k && cur.state === 'wait') st = `<em>${cur.days == null ? '新手引導做完後開始' : `${cur.days} 天後開放`}</em>`;
    else if (cur.k === k && cur.state === 'new') st = `<em class="go">去找${who}開始</em>`;
    else if (cur.k === k) st = progress(c, r).map(([t, a, n]) => `<div class="st-goal"><span>${t}</span><i style="--k:${(a / n).toFixed(3)}"></i><b>${a}／${n}</b></div>`).join('') + (cur.state === 'ready' ? `<em class="go">目標達成！回去找${who}</em>` : '');
    else st = `<em class="lock">還沒開放</em>`;
    return `<li class="${r.done ? 'done' : cur.k === k ? 'cur' : 'later'}"><div class="st-h"><i>${k}</i><b>${ui.esc(r.done || cur.k >= k ? c.title : '？？？')}</b><small>${who}</small></div>${st}</li>`;
  };
  body.innerHTML = `<div class="st-top">${ringSvg()}<div class="st-txt"><p>城堡後面的星環分成十段，一段是一科。每點亮一座<b>單元燈塔</b>（單元試煉正確率 60% 以上），城堡就亮起一扇窗，那一科的那一段也亮一點。</p><div class="st-subs">${subs}</div><button type="button" class="btn" data-a="chart">去點亮燈塔（航海圖）</button></div></div>
    <h4 class="ph-sec">十二章 · 每週一章，跟著學測倒數</h4><ol class="st-list">${L2.map(row).join('')}</ol>`;
  body.querySelector('[data-a="chart"]').onclick = () => { if (ctx && ctx.openChart) ctx.openChart(); };
  ui.panel('點亮星環', body, { cls: 'phone' });
}
export const debug = () => ({ story: JSON.parse(JSON.stringify(data())), cur: (c => ({ k: c.k, state: c.state, days: c.days }))(current()), lit: litCount(), total: unitTotal(), opens: chapters().map((c, i) => opensIn(i + 1)) });
