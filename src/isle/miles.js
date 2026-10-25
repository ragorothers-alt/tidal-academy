/* 潮汐小島 · 潮汐里程：每天 5 個小目標（第一個固定是學科練習），完成得到里程點數，可以在手機兌換獎勵。
   各模組在對應動作時呼叫 add(key)；練習題數直接讀每日學習紀錄（TA.S.days，作答數＋非選題折算，和今日路線同一個算法）。
   v7.1：今天要做什麼改由今日路線（route.js）列出；里程是額外的探索獎勵，計數也給今日路線的「島上的事」用（count）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const TA = window.TA, L = TA.L;
export const TASKS = [
  { id: 'fish', name: '釣到 {n} 條魚', n: [3, 5], pts: 150 }, { id: 'bug', name: '抓到 {n} 隻蟲', n: [2, 4], pts: 150 },
  { id: 'fossil', name: '挖到 {n} 個化石', n: [1, 2], pts: 120 }, { id: 'sea', name: '在潮池完成 {n} 次生物觀察紀錄', n: [1, 2], pts: 180 },
  { id: 'talk', name: '和 {n} 位島民聊天', n: [3, 5], pts: 100 }, { id: 'req', name: '完成 {n} 個委託', n: [1, 2], pts: 200 },
  { id: 'donate', name: '捐 {n} 件展品給博物館', n: [1, 2], pts: 150 }, { id: 'gift', name: '送出 {n} 份禮物', n: [1, 1], pts: 120 },
  { id: 'water', name: '替花澆水 {n} 次', n: [2, 4], pts: 100 }, { id: 'shell', name: '撿 {n} 個貝殼', n: [2, 3], pts: 100 },
  { id: 'craft', name: '在工作台做 {n} 件家具', n: [1, 1], pts: 180 }, { id: 'quiz', name: '在島上答對 {n} 題', n: [8, 12], pts: 200 },
  { id: 'photo', name: '拍 {n} 張照片', n: [1, 2], pts: 80 }, { id: 'focus', name: '用專注時光專注 {n} 分鐘', n: [15, 25], pts: 250 }, { id: 'puzzle', name: '解開 {n} 道謎題（數學石碑或單字謎）', n: [1, 2], pts: 200 }, { id: 'radio', name: '收聽海風電台 {n} 輪（英文聽力）', n: [1, 1], pts: 150 }
];
export const REWARDS = [
  { id: 'bells', name: '3,000 鈴錢', cost: 600, give: s => { s.bells += 3000; } },
  { id: 'frag', name: '星之碎片 ×3', cost: 450, give: s => { s.stars = s.stars || { book: {}, frag: 0 }; s.stars.frag = (s.stars.frag || 0) + 3; } },
  { id: 'iron', name: '鐵塊 ×4', cost: 700, give: s => { s.mats = s.mats || {}; s.mats.iron = (s.mats.iron || 0) + 4; } },
  { id: 'ticket', name: '潮汐券 ×1', cost: 500, give: s => { s.tickets = (s.tickets || 0) + 1; } },
  { id: 'gems', name: '潮晶 ×10', cost: 500, give: () => { TA.S.gems = (TA.S.gems || 0) + 10; } },
  { id: 'flower', name: '花冠（帽子）', cost: 1500, once: true, hat: 'flower' },
  { id: 'star_pin', name: '星星髮夾（帽子）', cost: 2500, once: true, hat: 'star_pin' }
];
const seeded = k => { let seed = [...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 17) >>> 0 || 1; return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); };
function data() {
  const s = S(), d = dayKey(); s.miles = s.miles || { pts: 0, life: 0, got: {} };
  const m = s.miles;
  if (m.d !== d) {
    const r = seeded(d), pool = TASKS.filter(t => t.id !== 'quiz').sort(() => r() - 0.5).slice(0, 4);
    const goal = TA.S.profile.dailyGoal || 30;
    m.d = d; m.cnt = {}; m.done = {}; m.bonus = false; m.once = {};
    m.tasks = [{ id: 'study', name: `今天練 ${Math.max(10, Math.round(goal * 0.6))} 題學科（任何學科題都算，非選題依題型折算；不含單字題）`, need: Math.max(10, Math.round(goal * 0.6)), pts: 300 }]
      .concat(pool.map(t => { const n = t.n[0] + Math.floor(r() * (t.n[1] - t.n[0] + 1)); return { id: t.id, name: t.name.replace('{n}', n), need: n, pts: t.pts }; }));
    save();
  }
  return m;
}
export const progress = (m, t) => prog(m, t);
const prog = (m, t) => (t.id === 'study' ? L.effort(L.dayRec()) : (m.cnt[t.id] || 0));   // 練習量看作答數，不看答對數：低正確率的玩家不必多做題
/** 今天某個動作的次數（今日路線用） */
export const count = key => (data().cnt[key] || 0);
/* 事件通知：任務欄（guide.js）靠這個知道玩家做了什麼 */
const listeners = [];
export function listen(fn) { listeners.push(fn); }
/** 只通知、不計數（例如打開信箱、接下委託） */
export function ping(key) { listeners.forEach(fn => fn(key)); }
/** 記錄一次動作 */
export function add(key, n) { const m = data(); m.cnt[key] = (m.cnt[key] || 0) + (n || 1); check(m); save(); ping(key); }
/** 同一個對象一天只算一次（例如和同一位島民聊天） */
export function addOnce(key, who) { const m = data(); m.once = m.once || {}; const k = key + ':' + who; if (m.once[k]) return; m.once[k] = true; add(key); }
/** 這週累積完成的里程目標（v7.1：額外 500 點改成一週內任選 15 項，不必每天五項全清） */
const WEEK_N = 15;
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return TA.U.dayKey(d); };
function week() { const s = S(), w = weekKey(); if (!s.milesWeek || s.milesWeek.w !== w) s.milesWeek = { w, n: 0, got: false }; return s.milesWeek; }
/** 檢查完成（答對題數也會在每次 check 時更新） */
export function check(m) {
  m = m || data(); let changed = false;
  const W = week();
  m.tasks.forEach(t => { if (!m.done[t.id] && prog(m, t) >= t.need) { m.done[t.id] = true; m.pts += t.pts; m.life += t.pts; W.n++; changed = true; Audio.sfx('catch'); ui.toast(`🌊 潮汐里程：${t.name} +${t.pts}`); } });
  if (!W.got && W.n >= WEEK_N) { W.got = true; m.pts += 500; m.life += 500; changed = true; setTimeout(() => ui.toast(`🌊 這週累積完成 ${WEEK_N} 項里程目標！額外 +500`), 900); }
  if (changed) save();
  return m;
}
export const badge = () => { const m = data(); return m.tasks.filter(t => !m.done[t.id]).length; };
export function open(onHat) {
  const m = check(), s = S(), body = ui.el('div', 'miles');
  const draw = () => {
    body.innerHTML = `<p class="muted">今日目標（每天換）· 里程點數 <b>${m.pts.toLocaleString()}</b> · 累計 ${m.life.toLocaleString()}</p>` +
      m.tasks.map(t => { const p = Math.min(t.need, prog(m, t)); return `<div class="ml-row${m.done[t.id] ? ' done' : ''}"><b>${m.done[t.id] ? '✔' : '○'} ${t.name}</b><i><em style="width:${p / t.need * 100}%"></em></i><small>${p} / ${t.need} · +${t.pts}</small></div>`; }).join('') +
      `<p class="muted">${week().got ? `這週已經累積 ${WEEK_N} 項，額外 500 點拿到了！` : `一週內任選完成 ${WEEK_N} 項再加 500 點（這週 ${week().n} / ${WEEK_N}）；不用每天全部做完。`}</p><h4>兌換獎勵</h4>`;
    const grid = ui.el('div', 'fs-grid');
    REWARDS.forEach(rw => { const got = rw.once && m.got[rw.id], b = ui.el('button', 'fs-item' + (got ? ' own' : ''), `<b>${rw.name}</b><small>${got ? '已兌換' : rw.cost.toLocaleString() + ' 點'}</small>`); b.type = 'button';
      b.onclick = () => { if (got) return; if (m.pts < rw.cost) { ui.toast('里程點數不夠'); Audio.sfx('deny'); return; } m.pts -= rw.cost; if (rw.once) m.got[rw.id] = true; if (rw.give) rw.give(s); if (rw.hat && onHat) onHat(rw.hat); save(); Audio.sfx('coin'); ui.toast(`兌換了${rw.name}！`); draw(); };
      grid.appendChild(b); });
    body.appendChild(grid);
  };
  draw(); ui.panel('潮汐里程', body, { cls: 'shop-p' });
}
