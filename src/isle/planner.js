/* 潮汐小島 · 讀書計畫：替一週七天各排 1–3 個科目與每科題數。今天的計畫科目練到目標題數（不同題目）就完成，
   有鈴錢獎勵；計畫裡的導師見面時會提醒。預設依學測配分與目前的弱點自動排好。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { dayKey } from './quiz.js';

const TA = window.TA, L = TA.L;
const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
/** 預設計畫：國英數每週各 3 天，其他科輪流，最弱的科目多排一天 */
function defaults() {
  const ids = TA.SUBJECTS.map(s => s.id), weak = L.weakUnits(3).map(w => w.subject.id), d = {};
  const core = ['chinese', 'english', 'math'], other = ids.filter(x => !core.includes(x));
  for (let i = 0; i < 7; i++) d[i] = [core[i % 3], other[i % other.length]];
  if (weak[0] && !d[0].includes(weak[0])) d[0].push(weak[0]);
  if (weak[1] && !d[6].includes(weak[1])) d[6].push(weak[1]);
  return d;
}
function plan() { const s = S(); s.plan = s.plan || { days: defaults(), target: 10, done: {} }; s.plan.done = s.plan.done || {}; return s.plan; }
export const today = () => plan().days[new Date().getDay()] || [];
/** 今天某科練過的不同題目數（依每題最後作答時間） */
export function countToday(sid) { const t0 = new Date(); t0.setHours(0, 0, 0, 0); const T = t0.getTime(); return (L.BY_SUBJECT[sid] || []).filter(id => { const r = TA.S.q[id]; return r && r.last >= T; }).length; }
export function progress() { const p = plan(); return today().map(sid => ({ sid, n: Math.min(p.target, countToday(sid)), need: p.target })); }
/** 每次更新畫面時檢查：今天的計畫完成了就發獎勵（每天一次） */
let redraw = null, shownDay = '';
export function check(paint) {
  const p = plan(), d = dayKey(), pr = progress();
  if (redraw && shownDay !== d) redraw();
  if (!pr.length || p.done[d] || pr.some(x => x.n < x.need)) return false;
  p.done = { [d]: true }; const s = S(); s.bells += 1000; s.stats = s.stats || {}; s.stats.plans = (s.stats.plans || 0) + 1; save(); Audio.sfx('catch');
  ui.toast('📅 今天的讀書計畫完成了！+1,000 鈴錢'); paint && paint(); redraw && redraw(); return true;
}
/** 導師見面時的提醒（今天的計畫有他的科目、還沒完成） */
export function remind(v) {
  const p = plan(); if (!today().includes(v.sid) || p.done[dayKey()]) return null;
  const n = countToday(v.sid); if (n >= p.target) return null;
  return `今天的讀書計畫有${(TA.subject(v.sid) || {}).name}喔，已經練了 ${n} / ${p.target} 題，讓我考考你吧！`;
}
export function open(paint) {
  const p = plan(), body = ui.el('div', 'planner');
  const draw = () => {
    shownDay = dayKey(); const td = new Date().getDay(), pr = progress();
    body.innerHTML = `<p class="muted">今天（星期${DAYS[td]}）：${pr.length ? pr.map(x => `${TA.subject(x.sid).name} ${x.n}/${x.need}`).join('、') : '休息日'}${p.done[dayKey()] ? ' ✔ 已完成' : ''}。每科練到 ${p.target} 道不同的學科題就算完成（島上任何學科題都算，不含單字題），完成有 1,000 鈴錢。</p>`;
    const tbl = ui.el('div', 'pl-grid');
    for (let i = 0; i < 7; i++) {
      const row = ui.el('div', 'pl-row' + (i === td ? ' today' : ''), `<b>${DAYS[i]}</b>`), chips = ui.el('div', 'pl-chips');
      TA.SUBJECTS.forEach(sub => { const on = (p.days[i] || []).includes(sub.id), c = ui.el('button', 'pl-chip' + (on ? ' on' : ''), sub.short || sub.name[0]); c.type = 'button'; c.title = sub.name; c.style.setProperty('--c', sub.color);
        c.onclick = () => { const a = p.days[i] = p.days[i] || []; if (on) a.splice(a.indexOf(sub.id), 1); else { if (a.length >= 3) { ui.toast('一天最多排 3 科'); return; } a.push(sub.id); } save(); draw(); }; chips.appendChild(c); });
      row.appendChild(chips); tbl.appendChild(row);
    }
    body.appendChild(tbl);
    const tg = ui.el('div', 'pl-target', '每科目標：'); [5, 10, 15, 20].forEach(n => { const b = ui.el('button', 'pl-chip' + (p.target === n ? ' on' : ''), `${n} 題`); b.type = 'button'; b.style.setProperty('--c', '#ffb84a'); b.onclick = () => { p.target = n; save(); draw(); }; tg.appendChild(b); });
    const rs = ui.el('button', 'btn', '依弱點重新排'); rs.type = 'button'; rs.onclick = () => { p.days = defaults(); save(); draw(); }; tg.appendChild(rs);
    body.appendChild(tg);
    body.appendChild(ui.el('p', 'muted', '提示：國英數每週多排幾天、弱點科目放在週末加強；計畫裡的導師見面時會提醒你。'));
  };
  draw(); redraw = draw; ui.panel('讀書計畫', body, { cls: 'phone', onClose: () => { redraw = null; } });
}
