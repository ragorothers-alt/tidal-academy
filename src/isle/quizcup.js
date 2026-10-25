/* 潮汐小島 · 潮汐盃快問快答：在潮汐考場和三位導師比賽 10 題混合科目快問快答，每題限時 15 秒。
   答對 100 分，越快答對加分越多（最多 +50）；導師答自己的科目比較強。每天可以參加一次，依名次給獎勵。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { pickQ, record, pick, dayKey, fairSec } from './quiz.js';

const TA = window.TA, N = 10, LIM = 15;
const pts = (ok, ms, lim) => (ok ? 100 + Math.round(Math.max(0, 1 - ms / ((lim || LIM) * 1000)) * 50) : 0);   // lim：這一題的限時（長題目會多給時間）
export const playedToday = () => (S().quizcup || {}).d === dayKey();
export async function play(host, villagers) {
  const s = S();
  if (playedToday()) { await ui.say(host, s.quizcup.rank ? `今天的潮汐盃已經比過了（第 ${s.quizcup.rank} 名）。明天再來挑戰吧！` : '今天的潮汐盃已經開賽過了（中途離開視為棄賽），明天再來挑戰吧！'); return; }
  const rivals = villagers.filter(v => !v.shop && !v.guest).sort(() => Math.random() - 0.5).slice(0, 3);
  await ui.say(host, `潮汐盃快問快答！今天的對手是${rivals.map(v => v.name).join('、')}。10 題混合科目、每題限時 ${LIM} 秒（題目比較長會多給時間），越快答對分數越高。`);
  const i0 = await ui.ask(host, '準備好了嗎？', ['開始！', '下次再說']);
  if (i0 !== 0) return;
  // 先排好 10 題（某科沒有題目就換別科），湊不滿就不開賽、不占用今天的資格
  const qs = [], used = new Set();
  for (let t = 0; t < 60 && qs.length < N; t++) { const sid = pick(TA.SUBJECTS).id, q = pickQ(sid, 2) || pickQ(sid, 3); if (q && !used.has(q.id)) { used.add(q.id); qs.push([sid, q]); } }
  if (qs.length < N) { await ui.say(host, '今天的題目還沒準備好，改天再來比賽吧。'); return; }
  const day = dayKey(); s.quizcup = { d: day, rank: 0 }; save();
  const board = [{ name: '你', you: true, p: 0 }].concat(rivals.map(v => ({ name: v.name, v, p: 0 })));
  let right = 0;
  for (let k = 0; k < N; k++) {
    const [sid, q] = qs[k];
    const lim = fairSec(LIM, q), sub = (TA.subject(sid) || {}).name, i = await ui.ask(host, `第 ${k + 1} / ${N} 題（${sub}）：${q.q}`, q.o, { abc: true, keys: true, html: true, timer: lim });
    const ok = i === q.a, ms = ui.answerMs(); record(q, ok); if (ok) right++;
    const me = pts(ok, ms, lim); board[0].p += me;
    const others = rivals.map((v, j) => { const skill = v.sid === sid ? 0.88 : 0.55, hit = Math.random() < skill, t = 3000 + Math.random() * 9000, g = pts(hit, t); board[j + 1].p += g; return `${v.name}${hit ? '✔' : '✘'}`; });
    Audio.sfx(ok ? 'ok' : 'bad');
    await ui.say(host, `${ok ? `答對！+${me} 分` : i < 0 ? `時間到！正確答案是 ${ui.ansOf(q)}` : `答錯了，正確答案是 ${ui.ansOf(q)}`}｜${others.join('、')}`, { html: true });
    if (!ok && q.e) await ui.say(host, q.e, { html: true });   // 比賽中也把解析講完
  }
  board.sort((a, b) => b.p - a.p);
  const rank = board.findIndex(b => b.you) + 1, prize = [0, 3000, 1500, 800, 300][rank];
  s.quizcup = { d: day, rank }; s.bells += prize; s.stats = s.stats || {}; if (rank === 1) s.stats.cupWins = (s.stats.cupWins || 0) + 1; save();
  Audio.sfx(rank === 1 ? 'catch' : 'ok');
  await ui.card({ icon: '', title: rank === 1 ? '🏆 潮汐盃冠軍！' : `潮汐盃第 ${rank} 名`, sub: board.map((b, j) => `${j + 1}. ${b.you ? '<b>你</b>' : b.name}　${b.p} 分`).join('<br>') + `<br><br>答對 ${right} / ${N} 題 · 獎勵 ${prize.toLocaleString()} 鈴錢` });
}

/* ---------- 模考成績走勢 ---------- */
export function openTrend() {
  const ex = (TA.S.exams || []).slice(-20).map(e => ({ ...e, group: e.group === '數學' ? '數學A' : e.group })), body = ui.el('div', 'report');
  if (!ex.length) { body.innerHTML = '<p class="muted">還沒有模擬考紀錄。到潮汐考場選「模擬考」，交卷後這裡就會出現成績走勢。</p>'; ui.panel('模考成績走勢', body, { cls: 'phone' }); return; }
  const groups = [...new Set(ex.map(e => e.group))], COL = ['#ff8a6a', '#7cc7ff', '#b9a2ff', '#5fbf6a', '#ffb84a', '#ff9fc0'];
  const rate = e => Math.min(1, (e.pts != null ? e.pts : e.c) / e.n);
  const W2 = 320, H2 = 130, X = i => (ex.length === 1 ? (W2 + 28) / 2 : 32 + i / (ex.length - 1) * (W2 - 44)), Y = v => H2 - 14 - v * (H2 - 28);
  const lines = groups.map((g, gi) => { const pts2 = ex.map((e, i) => [i, e]).filter(([, e]) => e.group === g); return `<polyline fill="none" stroke="${COL[gi % COL.length]}" stroke-width="2.5" points="${pts2.map(([i, e]) => `${X(i).toFixed(1)},${Y(rate(e)).toFixed(1)}`).join(' ')}"/>` + pts2.map(([i, e]) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(rate(e)).toFixed(1)}" r="3.5" fill="${COL[gi % COL.length]}"/>`).join(''); }).join('');
  const grid = [0.25, 0.5, 0.75, 1].map(v => `<line x1="26" x2="${W2 - 6}" y1="${Y(v)}" y2="${Y(v)}" stroke="#efe4cf"/><text x="2" y="${Y(v) + 3}" font-size="8" fill="#8a7560">${v * 100}</text>`).join('');
  const units = {}; ex.forEach(e => Object.entries(e.units || {}).forEach(([u, [c, n]]) => { units[u] = units[u] || [0, 0]; units[u][0] += c; units[u][1] += n; }));
  const weak = Object.entries(units).filter(([, [c, n]]) => n >= 3 && c < n).map(([u, [c, n]]) => [u, c / n, n]).sort((a, b) => a[1] - b[1]).slice(0, 5);
  const last = ex[ex.length - 1], best = groups.map(g => { const a = ex.filter(e => e.group === g); return `${g}：最近 ${Math.round(rate(a[a.length - 1]) * 100)}%（最高 ${Math.round(Math.max(...a.map(rate)) * 100)}%，${a.length} 次）`; });
  body.innerHTML = `<p class="muted">最近 ${ex.length} 次模擬考的得分率（%），最新一次：${new Date(last.at).getMonth() + 1}/${new Date(last.at).getDate()} ${last.group} ${last.c}/${last.n}</p>
    <svg viewBox="0 0 ${W2} ${H2}" class="rp-chart">${grid}${lines}</svg>
    <div class="tide-row">${groups.map((g, gi) => `<span style="background:${COL[gi % COL.length]};color:#fff">${g}</span>`).join('')}</div>
    <ul>${best.map(b => `<li>${b}</li>`).join('')}</ul>
    ${weak.length ? `<h4>模考裡正確率最低的單元</h4><ul>${weak.map(([u, a, n]) => `<li>${ui.esc((TA.L.UNITS[u] || {}).name || u)}：正確率 ${Math.round(a * 100)}%（${n} 題）</li>`).join('')}</ul>` : ''}`;
  ui.panel('模考成績走勢', body, { cls: 'phone' });
}
