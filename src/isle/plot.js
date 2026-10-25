/* 潮汐小島 · 函數圖形（數學）：看圖選方程式。題目由 graphs.js 產生，一輪 5 題，混合二次、指數對數、三角函數。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, practiced, dayKey } from './state.js';
import * as miles from './miles.js';
import { question } from './graphs.js';

const W = 560, H = 340;
/** 三角函數的 x 軸刻度：k·π/2 */
function piLabel(k) {
  if (k === 0) return '0';
  if (k % 2 === 0) { const m = k / 2; return (m === 1 ? '' : m === -1 ? '−' : String(m).replace('-', '−')) + 'π'; }
  return (k === 1 ? '' : k === -1 ? '−' : String(k).replace('-', '−')) + 'π/2';
}
function draw(cv, q) {
  const c = cv.getContext('2d'), v = q.view, sx = x => (x - v.x0) / (v.x1 - v.x0) * W, sy = y => H - (y - v.y0) / (v.y1 - v.y0) * H;
  c.fillStyle = '#fffdf6'; c.fillRect(0, 0, W, H);
  c.font = `${Math.round(11 * Math.max(1, W / (cv.clientWidth || W)))}px sans-serif`; c.lineWidth = 1;   // 小螢幕字放大
  const xs = [];
  if (v.pi) for (let k = -4; k <= 4; k++) xs.push([k * Math.PI / 2, piLabel(k)]);
  else for (let x = Math.ceil(v.x0); x <= v.x1; x++) xs.push([x, String(x).replace('-', '−')]);
  xs.forEach(([x, t]) => { c.strokeStyle = '#efe4cf'; c.beginPath(); c.moveTo(sx(x), 0); c.lineTo(sx(x), H); c.stroke(); if (x) { c.fillStyle = '#a08a70'; c.fillText(t, sx(x) - (t.length > 2 ? 12 : 4), sy(0) + 13); } });
  for (let y = Math.ceil(v.y0); y <= v.y1; y++) { c.strokeStyle = '#efe4cf'; c.beginPath(); c.moveTo(0, sy(y)); c.lineTo(W, sy(y)); c.stroke(); if (y) { c.fillStyle = '#a08a70'; c.fillText(String(y).replace('-', '−'), sx(0) + 4, sy(y) + 4); } }
  c.strokeStyle = '#6b4f3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, sy(0)); c.lineTo(W, sy(0)); c.moveTo(sx(0), 0); c.lineTo(sx(0), H); c.stroke();
  c.fillStyle = '#6b4f3a'; c.fillText('x', W - 10, sy(0) - 6); c.fillText('y', sx(0) + 6, 12); c.fillText('O', sx(0) - 11, sy(0) + 13);
  c.strokeStyle = '#3f7fd8'; c.lineWidth = 3; c.beginPath(); let pen = false;
  for (let i = 0; i <= 600; i++) {
    const x = v.x0 + (v.x1 - v.x0) * i / 600, y = q.f(x);
    if (!isFinite(y) || y < v.y0 - 2 || y > v.y1 + 2) { pen = false; continue; }
    if (pen) c.lineTo(sx(x), sy(y)); else { c.moveTo(sx(x), sy(y)); pen = true; }
  }
  c.stroke();
}
export function open(paint) {
  const body = ui.el('div', 'plot'); let k = 0, right = 0, q = null;
  const next = () => {
    if (k >= 5) return finish();
    q = question(); body.innerHTML = `<p class="muted">第 ${k + 1} / 5 題 · ${q.name}：哪一個方程式的圖形是藍色這條？</p><canvas class="pl-cv" width="${W}" height="${H}"></canvas><div class="rd-opts pl-opts"></div><div class="pl-fb"></div>`;
    requestAnimationFrame(() => draw(body.querySelector('.pl-cv'), q));   // 等面板排版好，才知道畫布實際寬度
    const box = body.querySelector('.pl-opts'); let done = false;
    q.opts.forEach((o, i) => {
      const b = ui.el('button', 'choice', o.tex); b.type = 'button';
      b.onclick = () => {
        if (done) return; done = true; const ok = i === q.a; if (ok) right++; Audio.sfx(ok ? 'catch' : 'bad');
        [...box.children].forEach((x, j) => { x.disabled = true; if (j === q.a) x.classList.add('ok'); else if (j === i) x.classList.add('bad'); });
        const fb = body.querySelector('.pl-fb'); fb.innerHTML = `<p>${ok ? '<b>正確！</b>' : `<b>答案是 ${q.opts[q.a].tex}</b>。`}${q.hint}</p>`;
        const nb = ui.el('button', 'btn gold', k + 1 >= 5 ? '看結果' : '下一題'); nb.type = 'button'; nb.onclick = () => { k++; next(); }; fb.appendChild(nb);
      };
      box.appendChild(b);
    });
  };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.plotDay !== d && right > 0, b = first ? right * 240 : 0; if (first) s.plotDay = d; s.bells += b; practiced('plot', right, 5); save(); if (right) miles.add('puzzle');
    body.innerHTML = `<p class="pl-q"><b>這一輪答對 ${right} / 5 題</b></p><p class="muted">${first ? `今日練習獎勵：${b} 鈴錢。` : (s.plotDay === d ? '今天的獎勵已經領過了，可以繼續練習。' : '答對至少一題就能領今天的獎勵，再試一次吧！')}</p>
      <p>看圖找方程式的步驟：先找特徵點（頂點、與軸的交點、一定通過的點），再看漸近線或週期，最後用平移方向與正負號刪去選項。</p>`;
    const again = ui.el('button', 'btn gold', '再來一輪'); again.type = 'button'; again.onclick = () => { k = 0; right = 0; next(); }; body.appendChild(again);
    paint && paint();
  };
  next();
  ui.panel('函數圖形（數學）', body, { cls: 'shop-p' });
}
