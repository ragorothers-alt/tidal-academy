/* 潮汐小島 · 年代排序：抽 4 張歷史事件卡（同一個主題區：台灣、中國與東亞、世界），依發生先後點選排序。
   排完公布年份與背景；每輪 3 組，答對越多鈴錢越多（每天第一輪有獎勵）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, practiced } from './state.js';
import { pick, dayKey } from './quiz.js';
import * as miles from './miles.js';

const AREA = { tw: '台灣史', ea: '中國與東亞史', world: '世界史' };
const yr = y => (y < 0 ? `西元前 ${-y} 年` : `${y} 年`);
function deal() {
  const area = pick(Object.keys(AREA)), pool = (I.TIMELINE || []).filter(e => e.area === area), out = [];
  for (let k = 0; k < 200 && out.length < 4; k++) { const e = pick(pool); if (!out.includes(e) && out.every(o => o.y !== e.y)) out.push(e); }
  return { area, cards: out.sort(() => Math.random() - 0.5) };
}
export function open(paint) {
  if ((I.TIMELINE || []).length < 8) { ui.toast('年代資料還沒準備好'); return; }
  const body = ui.el('div', 'chrono'); let round = 0, right = 0, hand = null, order = [];
  const next = () => { hand = deal(); order = []; draw(); };
  const draw = (done, ok) => {
    const sorted = hand.cards.slice().sort((a, b) => a.y - b.y);
    body.innerHTML = `<p class="muted">第 ${round + 1} / 3 組 · ${AREA[hand.area]}：依「發生先後」依序點選（最早的先點）。</p>`;
    const list = ui.el('div', 'ch-cards');
    hand.cards.forEach(e => {
      const n = order.indexOf(e), b = ui.el('button', 'ch-card' + (n >= 0 ? ' on' : '') + (done ? (sorted.indexOf(e) === order.indexOf(e) ? ' ok' : ' bad') : ''), `<i>${n >= 0 ? n + 1 : ''}</i><b>${ui.esc(e.label)}</b>${done ? `<small>${yr(e.y)}</small>` : ''}`); b.type = 'button';
      b.onclick = () => { if (done) return; if (n >= 0) order.splice(n, 1); else order.push(e); Audio.sfx('pop'); if (order.length === hand.cards.length) check(); else draw(); };
      list.appendChild(b);
    });
    body.appendChild(list);
    if (done) {
      body.appendChild(ui.el('p', 'ch-res', ok ? '<b>順序完全正確！</b>' : '<b>順序有誤</b>，正確的先後：'));
      body.appendChild(ui.el('ol', 'ch-ans', sorted.map(e => `<li><b>${yr(e.y)}</b> ${ui.esc(e.label)}<br><small>${ui.esc(e.note)}</small></li>`).join('')));
      const nb = ui.el('button', 'btn gold', round + 1 >= 3 ? '看結果' : '下一組'); nb.type = 'button'; nb.onclick = () => { round++; if (round >= 3) finish(); else next(); }; body.appendChild(nb);
    } else if (order.length) { const rb = ui.el('button', 'btn', '重排'); rb.type = 'button'; rb.onclick = () => { order = []; draw(); }; body.appendChild(rb); }
  };
  const check = () => { const ok = order.every((e, i) => i === 0 || order[i - 1].y < e.y); if (ok) right++; Audio.sfx(ok ? 'catch' : 'bad'); draw(true, ok); };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.chronoDay !== d && right > 0, b = first ? right * 1000 : 0; if (first) s.chronoDay = d; s.bells += b; s.stats = s.stats || {}; s.stats.chrono = (s.stats.chrono || 0) + right; practiced('chrono', right, 3); save(); if (right) miles.add('puzzle');
    body.innerHTML = `<p class="ch-res"><b>這一輪答對 ${right} / 3 組</b></p><p class="muted">${first ? `今日練習獎勵：${b} 鈴錢。` : (s.chronoDay === d ? '今天的獎勵已經領過了，可以繼續練習。' : '答對至少一題就能領今天的獎勵，再試一次吧！')}記年代時，把事件串成因果與時代背景會比死背數字更牢。</p>`;
    const again = ui.el('button', 'btn gold', '再玩一輪'); again.type = 'button'; again.onclick = () => { round = 0; right = 0; next(); }; body.appendChild(again);
    paint && paint();
  };
  next();
  ui.panel('年代排序（歷史）', body, { cls: 'shop-p' });
}
