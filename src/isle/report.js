/* 潮汐小島 · 學習週報：最近 7 天的每日題數與正確率、和前一週比較、各科本週練習量與熟練度、最弱的單元。
   每週一（或那一週第一次上島）史遙會把摘要寄到信箱，手機「學習週報」看完整圖表。 */
import * as ui from './ui.js';
import { S, save } from './state.js';

const TA = window.TA, L = TA.L;
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOf = (base, k) => { const d = new Date(base); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + k); return d; };
const rec = d => (TA.S.days || {})[key(d)] || { q: 0, c: 0, voc: 0, min: 0, xp: 0 };
/** end：週報的最後一天（含），預設今天 */
export function compute(end) {
  end = end || new Date();
  const days = [], prev = { q: 0, c: 0, voc: 0, min: 0 }, cur = { q: 0, c: 0, voc: 0, min: 0 };
  for (let k = -6; k <= 0; k++) { const d = dayOf(end, k), r = rec(d); days.push({ d, r }); ['q', 'c', 'voc', 'min'].forEach(f => { cur[f] += r[f] || 0; }); }
  for (let k = -13; k <= -7; k++) { const r = rec(dayOf(end, k)); ['q', 'c', 'voc', 'min'].forEach(f => { prev[f] += r[f] || 0; }); }
  const start = dayOf(end, -6); start.setHours(0, 0, 0, 0); const stop = dayOf(end, 1); stop.setHours(0, 0, 0, 0);
  const subj = TA.SUBJECTS.map(s => {
    const ids = L.BY_SUBJECT[s.id] || [], week = ids.filter(id => { const r = TA.S.q[id]; return r && r.last >= start.getTime() && r.last < stop.getTime(); }).length, st = L.subjectStats(s.id);
    return { s, week, st };
  });
  const active = days.filter(x => x.r.q > 0).length;
  return { days, cur, prev, subj, active, weak: L.weakUnits(3), streak: L.streakAlive(), goal: TA.S.profile.dailyGoal || 30 };
}
const pctS = (a, b) => (b ? Math.round(a / b * 100) + '%' : '—');
const diff = (a, b) => (b ? `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / b * 100))}%` : a ? '▲ 新開始' : '—');
export function summary(r) {
  const low = r.subj.filter(x => x.st.seen).sort((a, b) => a.st.acc - b.st.acc)[0];
  const start = r.weak.length ? `\n可以先從「${r.weak[0].unit.name}」開始。` : '';
  if (!r.cur.q) return (r.cur.voc || r.cur.min ? `這一期沒有科目題的作答紀錄；單字複習 ${r.cur.voc} 次，專注學習 ${r.cur.min} 分鐘。` : '這一期沒有作答紀錄。沒關係，休息也是讀書的一部分；從每天幾題開始，慢慢把節奏找回來吧。') + start;
  return [
    `這一期你答了 ${r.cur.q} 題（${diff(r.cur.q, r.prev.q)}），正確率 ${pctS(r.cur.c, r.cur.q)}，單字複習 ${r.cur.voc} 次，有 ${r.active} 天練習科目題。`,
    low ? `目前累計正確率最低的科目是${low.s.name}（${Math.round(low.st.acc * 100)}%），可以到圖書館做錯題特訓。` : '',
    r.weak.length ? `最需要加強的單元：${r.weak.map(w => `${w.subject.name}「${w.unit.name}」`).join('、')}。` : ''
  ].filter(Boolean).join('\n');
}
/** 新的一週：寄週報信（每週一次） */
export function weekly(sendLetter) {
  const s = S(), now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); const wk = key(mon);
  if (s.reportWeek === wk) return false;
  const first = !s.reportWeek; s.reportWeek = wk; save();
  if (first) return false;   // 第一次上島不寄（還沒有一整週的資料）
  const end = new Date(mon); end.setDate(mon.getDate() - 1);
  const r = compute(end);
  sendLetter({ fromName: '史遙', title: `學習週報（${dayOf(end, -6).getMonth() + 1}/${dayOf(end, -6).getDate()}–${end.getMonth() + 1}/${end.getDate()}）`, open: '呼呼，這是上一週的學習航海日誌：', text: summary(r), giftLine: '手機的「學習週報」另提供截至今天的近 7 天圖表。', close: '—— 博物館館長 史遙' });
  return true;
}
export function open() {
  const r = compute(), body = ui.el('div', 'report');
  const W = 320, H = 120, max = Math.max(r.goal, ...r.days.map(x => x.r.q), 1), bw = W / 7;
  const bars = r.days.map((x, i) => { const h = x.r.q / max * (H - 22), hc = (x.r.c || 0) / max * (H - 22), X = i * bw + 8, wd = bw - 16;
    return `<rect x="${X}" y="${H - 16 - h}" width="${wd}" height="${h}" rx="4" fill="#ffd0b8"/><rect x="${X}" y="${H - 16 - hc}" width="${wd}" height="${hc}" rx="4" fill="#ff8a6a"/><text x="${X + wd / 2}" y="${H - 3}" text-anchor="middle">${'日一二三四五六'[x.d.getDay()]}</text>${x.r.q ? `<text x="${X + wd / 2}" y="${H - 20 - h}" text-anchor="middle">${x.r.q}</text>` : ''}`; }).join('');
  const gy = H - 16 - r.goal / max * (H - 22);
  const subj = r.subj.map(x => `<div class="rp-sub"><span style="--c:${x.s.color}">${x.s.short || x.s.name.slice(0, 1)}</span><b>${x.s.name}</b><i><em style="width:${Math.round(x.st.mastery * 100)}%;background:${x.s.color}"></em></i><small>近 7 天練習 ${x.week} 道不同題目 · 累計正確率 ${x.st.seen ? Math.round(x.st.acc * 100) + '%' : '—'}</small></div>`).join('');
  body.innerHTML = `<div class="rp-top"><div><b>${r.cur.q}</b><small>近 7 天答題 ${diff(r.cur.q, r.prev.q)}</small></div><div><b>${pctS(r.cur.c, r.cur.q)}</b><small>正確率（前 7 天 ${pctS(r.prev.c, r.prev.q)}）</small></div><div><b>${r.cur.voc}</b><small>單字複習次數</small></div><div><b>${r.active}/7</b><small>科目作答天數 · 連續 ${r.streak} 天</small></div></div>
    <svg viewBox="0 0 ${W} ${H}" class="rp-chart"><line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="#5aa845" stroke-dasharray="4 3"/>${bars}</svg>
    <p class="muted">深色是答對的題數，虛線是每日目標 ${r.goal} 題。</p>
    <h4>各科熟練度與近 7 天練習</h4>${subj}
    ${r.weak.length ? `<h4>最需要加強的單元</h4><ul>${r.weak.map(w => `<li>${w.subject.name}「${ui.esc(w.unit.name)}」${w.st.attempts ? `（正確率 ${Math.round(w.st.acc * 100)}%）` : '（還沒練過）'}</li>`).join('')}</ul><p class="muted">可以到潮汐圖書館做錯題特訓，或接受導師的弱點委託。</p>` : ''}`;
  ui.panel('學習週報', body, { cls: 'phone' });
}
