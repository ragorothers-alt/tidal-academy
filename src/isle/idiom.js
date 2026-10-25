/* 潮汐小島 · 成語診所（國文）：學測常考的成語誤用。一輪 5 題，兩種題型：
   「判斷」——這一句的成語用法正確嗎？「四選一」——下列哪一句成語使用正確？（一句正確、三句是其他成語的典型誤用）
   答完顯示成語意思與誤用原因。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, practiced, dayKey } from './state.js';
import { pick } from './quiz.js';
import * as miles from './miles.js';

const D = () => I.IDIOMS || [];
const shuffle = a => a.map(x => [x, Math.random()]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
const mark = (s, w) => ui.esc(s).replace(ui.esc(w), `<u>${ui.esc(w)}</u>`);
function explain(d, extra) {
  return `<div class="id-ex"><b>${ui.esc(d.w)}</b>：${ui.esc(d.mean)}<br><small>✔ ${mark(d.ok, d.w)}</small><br><small>✘ ${mark(d.bad, d.w)}</small><br><small class="muted">${ui.esc(d.why)}</small>${extra || ''}</div>`;
}
export function open(paint) {
  if (D().length < 8) { ui.toast('成語資料還沒準備好'); return; }
  const body = ui.el('div', 'idiom'); let k = 0, right = 0, seen = new Set();
  const take = () => { const pool = D().filter(d => !seen.has(d.id)); const d = pick(pool.length ? pool : D()); seen.add(d.id); return d; };
  const next = () => {
    if (k >= 5) return finish();
    const judge = Math.random() < 0.5;
    if (judge) {
      const d = take(), good = Math.random() < 0.5, sent = good ? d.ok : d.bad;
      body.innerHTML = `<p class="muted">第 ${k + 1} / 5 題 · 判斷</p><p class="id-s">${mark(sent, d.w)}</p><p class="id-q">這一句的<b>「${ui.esc(d.w)}」</b>用得正確嗎？</p><div class="id-yn"></div><div class="id-fb"></div>`;
      const box = body.querySelector('.id-yn');
      [['正確', true], ['誤用', false]].forEach(([t, v]) => {
        const b = ui.el('button', 'choice', (v ? '⭕ ' : '❌ ') + t); b.type = 'button';
        b.onclick = () => answer(v === good, box, b, [...box.children][good ? 0 : 1], explain(d));
        box.appendChild(b);
      });
    } else {
      const a = take(), others = shuffle(D().filter(d => d.id !== a.id)).slice(0, 3);
      const opts = shuffle([{ d: a, s: a.ok, ok: true }, ...others.map(d => ({ d, s: d.bad, ok: false }))]);
      body.innerHTML = `<p class="muted">第 ${k + 1} / 5 題 · 四選一</p><p class="id-q">下列哪一句的成語<b>使用正確</b>？</p><div class="id-opts"></div><div class="id-fb"></div>`;
      const box = body.querySelector('.id-opts');
      opts.forEach(o => {
        const b = ui.el('button', 'choice', mark(o.s, o.d.w)); b.type = 'button';
        b.onclick = () => answer(o.ok, box, b, [...box.children][opts.findIndex(x => x.ok)], explain(a) + others.map(d => `<div class="id-mini"><b>${ui.esc(d.w)}</b>：${ui.esc(d.mean)}<small class="muted">（${ui.esc(d.why)}）</small></div>`).join(''));
        box.appendChild(b);
      });
    }
  };
  const answer = (ok, box, btn, correctBtn, ex) => {
    if (box.dataset.done) return; box.dataset.done = '1'; if (ok) right++; Audio.sfx(ok ? 'catch' : 'bad');
    [...box.children].forEach(x => { x.disabled = true; }); correctBtn.classList.add('ok'); if (!ok) btn.classList.add('bad');
    const fb = body.querySelector('.id-fb'); fb.innerHTML = `<p>${ok ? '<b>答對了！</b>' : '<b>不對喔。</b>'}</p>${ex}`;
    const nb = ui.el('button', 'btn gold', k + 1 >= 5 ? '看結果' : '下一題'); nb.type = 'button'; nb.onclick = () => { k++; next(); }; fb.appendChild(nb);
  };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.idiomDay !== d && right > 0, b = first ? right * 240 : 0; if (first) s.idiomDay = d; s.bells += b; practiced('idiom', right, 5); save(); if (right) miles.add('puzzle');
    body.innerHTML = `<p class="id-q"><b>這一輪答對 ${right} / 5 題</b></p><p class="muted">${first ? `今日練習獎勵：${b} 鈴錢。` : (s.idiomDay === d ? '今天的獎勵已經領過了，可以繼續練習。' : '答對至少一題就能領今天的獎勵，再試一次吧！')}</p>
      <p>判斷成語用法的三個檢查：意思是褒是貶、適用的對象（人、事、物、場合），以及句子裡有沒有和成語重複的字義。</p>`;
    const again = ui.el('button', 'btn gold', '再來一輪'); again.type = 'button'; again.onclick = () => { k = 0; right = 0; seen = new Set(); next(); }; body.appendChild(again);
    paint && paint();
  };
  next();
  ui.panel('成語診所（國文）', body, { cls: 'shop-p' });
}
