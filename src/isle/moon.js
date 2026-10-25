/* 潮汐小島 · 月相觀測（地科）：上方顯示今晚真實的月相，下面一輪 5 題觀測題（moonq.js 產生）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, practiced, dayKey } from './state.js';
import * as miles from './miles.js';
import { moonAge, moonPhase, SYNODIC } from './astro.js';
import { question, lit } from './moonq.js';

/** 畫出月齡 age 的月亮（北半球視角：盈月亮面在右） */
export function drawMoon(cv, age) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, r = Math.min(W, H) * 0.42, x = W / 2, y = H / 2;
  c.clearRect(0, 0, W, H); c.fillStyle = '#1d2a4a'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect((i * 97) % W, (i * 53) % H, 1.5, 1.5); }
  c.fillStyle = '#39405a'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  const f = age / SYNODIC, waxing = f < 0.5, k = lit(age), w = r * Math.abs(1 - 2 * k);
  if (k < 0.01) return;
  c.fillStyle = '#fff3c4'; c.beginPath();
  // 亮的半圓（盈：右半；虧：左半）＋ 一個橢圓（凸月時加亮、眉月時挖暗）
  c.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  c.ellipse(x, y, w, r, 0, Math.PI / 2, -Math.PI / 2, (k > 0.5) === waxing ? false : true);
  c.fill();
}
export function open(paint) {
  const body = ui.el('div', 'moon'); let k = 0, right = 0;
  const age = moonAge(new Date());
  const head = () => `<div class="mn-now"><canvas class="mn-cv mn-sm" width="90" height="90"></canvas><div><b>今晚的月亮：${moonPhase(age)}</b><br><small class="muted">月齡約 ${age.toFixed(1)} 天（朔望月約 29.5 天）</small></div></div>`;
  const next = () => {
    if (k >= 5) return finish();
    const q = question();
    body.innerHTML = head() + `<p class="muted">第 ${k + 1} / 5 題</p>${q.kind === 'picture' ? `<canvas class="mn-cv mn-big" width="200" height="200"></canvas>` : ''}<p class="mn-q">${q.q}</p><div class="rd-opts mn-opts"></div><div class="mn-fb"></div>`;
    drawMoon(body.querySelector('.mn-sm'), age);
    if (q.kind === 'picture') drawMoon(body.querySelector('.mn-big'), q.age);
    const box = body.querySelector('.mn-opts'); let done = false;
    q.opts.forEach((t, i) => {
      const b = ui.el('button', 'choice', ui.esc(t)); b.type = 'button';
      b.onclick = () => {
        if (done) return; done = true; const ok = i === q.a; if (ok) right++; Audio.sfx(ok ? 'catch' : 'bad');
        [...box.children].forEach((x, j) => { x.disabled = true; if (j === q.a) x.classList.add('ok'); else if (j === i) x.classList.add('bad'); });
        const fb = body.querySelector('.mn-fb'); fb.innerHTML = `<p>${ok ? '<b>正確！</b>' : `<b>答案是 ${ui.esc(q.opts[q.a])}</b>。`}${q.why}</p>`;
        const nb = ui.el('button', 'btn gold', k + 1 >= 5 ? '看結果' : '下一題'); nb.type = 'button'; nb.onclick = () => { k++; next(); }; fb.appendChild(nb);
      };
      box.appendChild(b);
    });
  };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.moonDay !== d && right > 0, b = first ? right * 240 : 0; if (first) s.moonDay = d; s.bells += b; practiced('moon', right, 5); save(); if (right) miles.add('puzzle');
    body.innerHTML = head() + `<p class="mn-q"><b>這一輪答對 ${right} / 5 題</b></p><p class="muted">${first ? `今日練習獎勵：${b} 鈴錢。` : (s.moonDay === d ? '今天的獎勵已經領過了，可以繼續練習。' : '答對至少一題就能領今天的獎勵，再試一次吧！')}</p>
      <p>記月相的口訣：「上上上西西」——上弦月出現在農曆上半月、上半夜可見、位於西半邊天空、亮面朝西（右）。滿月和太陽相對，太陽下山時月亮剛好升起。</p>`;
    drawMoon(body.querySelector('.mn-sm'), age);
    const again = ui.el('button', 'btn gold', '再觀測一輪'); again.type = 'button'; again.onclick = () => { k = 0; right = 0; next(); }; body.appendChild(again);
    paint && paint();
  };
  next();
  ui.panel('月相觀測（地科）', body, { cls: 'shop-p' });
}
