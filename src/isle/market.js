/* 潮汐小島 · 潮汐夜市（數學：期望值與機率）：逛四個攤位，先算再決定。題目由 ev.js 產生。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, practiced, dayKey } from './state.js';
import * as miles from './miles.js';
import { BOOTHS } from './ev.js';

const ICON = { dice: '🎲', ticket: '🎟', spin: '🎡', balls: '🎱' };
export function open(paint) {
  const body = ui.el('div', 'market'); let k = 0, right = 0, order = [];
  const start = () => { order = Object.keys(BOOTHS).sort(() => Math.random() - 0.5); k = 0; right = 0; next(); };
  const next = () => {
    if (k >= order.length) return finish();
    const kind = order[k], q = BOOTHS[kind](Math.random);
    body.innerHTML = `<p class="muted">第 ${k + 1} / ${order.length} 攤 · ${ICON[kind]} ${q.booth}</p><p class="mk-q">${q.text}</p><div class="rd-opts mk-opts"></div><div class="mk-fb"></div>`;
    const box = body.querySelector('.mk-opts'); let done = false;
    q.opts.forEach((t, i) => {
      const b = ui.el('button', 'choice', ui.esc(t)); b.type = 'button';
      b.onclick = () => {
        if (done) return; done = true; const ok = i === q.a; if (ok) right++; Audio.sfx(ok ? 'catch' : 'bad');
        [...box.children].forEach((x, j) => { x.disabled = true; if (j === q.a) x.classList.add('ok'); else if (j === i) x.classList.add('bad'); });
        const verdict = q.ev == null ? '' : q.ev > 0 ? '期望值為正：長期玩下去平均會賺（老闆要小心了）。' : q.ev < 0 ? '期望值為負：長期玩下去平均每次會虧這麼多，夜市攤位通常就是這樣賺錢的。' : '期望值為 0：長期下來不賺不賠，是「公平」的遊戲。';
        const fb = body.querySelector('.mk-fb'); fb.innerHTML = `<p>${ok ? '<b>算對了！</b>' : `<b>答案是 ${ui.esc(q.opts[q.a])}</b>。`}${q.why}</p>${verdict ? `<p class="muted">${verdict}</p>` : ''}`;
        const nb = ui.el('button', 'btn gold', k + 1 >= order.length ? '看結果' : '下一攤'); nb.type = 'button'; nb.onclick = () => { k++; next(); }; fb.appendChild(nb);
      };
      box.appendChild(b);
    });
  };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.marketDay !== d && right > 0, b = first ? right * 300 : 0; if (first) s.marketDay = d; s.bells += b; practiced('market', right, order.length); save(); if (right) miles.add('puzzle');
    body.innerHTML = `<p class="mk-q"><b>逛完四攤，算對 ${right} / ${order.length} 題</b></p><p class="muted">${first ? `今日練習獎勵：${b} 鈴錢。` : (s.marketDay === d ? '今天的獎勵已經領過了，可以繼續練習。' : '答對至少一題就能領今天的獎勵，再試一次吧！')}</p>
      <p>期望值 = Σ（每種結果的值 × 它的機率）。算「淨得」時別忘了扣掉成本；不放回抽取時，第二次的總數要減 1。</p>`;
    const again = ui.el('button', 'btn gold', '再逛一圈'); again.type = 'button'; again.onclick = start; body.appendChild(again);
    paint && paint();
  };
  start();
  ui.panel('潮汐夜市（機率與期望值）', body, { cls: 'shop-p' });
}
