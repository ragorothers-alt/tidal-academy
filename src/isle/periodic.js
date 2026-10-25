/* 潮汐小島 · 元素週期表：收集元素卡。
   「元素猜謎」：三句提示由難到易，越早猜中分數越高，猜中就收進週期表；
   「位置挑戰」：在空白週期表上點出指定元素的位置。每天第一輪有鈴錢。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, practiced, dayKey } from './state.js';
import { pick } from './quiz.js';
import * as miles from './miles.js';

export const CAT = {
  alkali: ['鹼金屬', '#ffb0a0'], alkaline: ['鹼土金屬', '#ffd59a'], transition: ['過渡金屬', '#f4c6d8'], post: ['其他金屬', '#cfd8e8'],
  metalloid: ['類金屬', '#cde8b0'], nonmetal: ['非金屬', '#bfe8d8'], halogen: ['鹵素', '#fff0a0'], noble: ['惰性氣體', '#d6ccff'], actinide: ['錒系', '#e8c8a8']
};
const STATE = { s: '固態', l: '液態', g: '氣態' };
const E = () => I.ELEMENTS || [];
const own = () => { const s = S(); s.elements = s.elements || {}; return s.elements; };
export const count = () => Object.keys(own()).length;
/** 週期表格位：第 1–7 週期在第 1–7 列；錒系（鈾）放在下方另一列 */
const cell = e => (e.group ? { r: e.period, c: e.group } : { r: 9, c: 3 + (e.z - 89) });

function table(mode, onPick, mark) {
  const g = ui.el('div', 'pt-grid'), have = own();
  for (let c = 1; c <= 18; c++) { const h = ui.el('div', 'pt-h', String(c)); h.style.gridArea = `1 / ${c + 1}`; g.appendChild(h); }
  for (let r = 1; r <= 7; r++) { const h = ui.el('div', 'pt-h', String(r)); h.style.gridArea = `${r + 1} / 1`; g.appendChild(h); }
  const ac = ui.el('div', 'pt-h pt-ac', '錒系'); ac.style.gridArea = '10 / 1 / 11 / 4'; g.appendChild(ac);
  // 完整週期表輪廓：未收錄的位置也畫出來（不然空白表的形狀會洩漏答案）
  const taken = new Set(E().map(e => { const p = cell(e); return p.r + ',' + p.c; }));
  for (let r = 1; r <= 7; r++) for (let c = 1; c <= 18; c++) {
    if ((r === 1 && c > 1 && c < 18) || (r <= 3 && c > 2 && c < 13) || taken.has(r + ',' + c)) continue;
    const b = ui.el('button', 'pt-c pt-none', ''); b.type = 'button'; b.style.gridArea = `${r + 1} / ${c + 1}`; b.title = '本遊戲未收錄';
    b.onclick = () => onPick(null, b); g.appendChild(b);
  }
  E().forEach(e => {
    const p = cell(e), got = !!have[e.sym], show = mode === 'view';
    const b = ui.el('button', 'pt-c' + (show && got ? ' got' : '') + (mark && mark[e.sym] ? ' ' + mark[e.sym] : ''), show ? `<small>${e.z}</small><b>${e.sym}</b>` : '');
    b.type = 'button'; b.style.gridArea = `${p.r + 1} / ${p.c + 1}`;
    if (show && got) b.style.background = CAT[e.cat][1];
    b.title = show ? (got ? `${e.zh} ${e.en}` : '還沒收集') : '';
    b.onclick = () => onPick(e, b);
    g.appendChild(b);
  });
  const wrap = ui.el('div', 'pt-wrap'); wrap.appendChild(g); return wrap;
}
function legend() { return ui.el('div', 'pt-leg', Object.values(CAT).map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')); }
function info(e) {
  return `<div class="pt-info"><div class="pt-big" style="background:${CAT[e.cat][1]}"><small>${e.z}</small><b>${e.sym}</b><span>${e.mass}</span></div>
    <div><b>${ui.esc(e.zh)}　${ui.esc(e.en)}</b><p class="muted">${e.group ? `第 ${e.period} 週期、第 ${e.group} 族` : `第 ${e.period} 週期、錒系`} · ${CAT[e.cat][0]} · 常溫${STATE[e.state] || ''}</p><p>${ui.esc(e.fact)}</p></div></div>`;
}

export function open(paint) {
  if (E().length < 10) { ui.toast('元素資料還沒準備好'); return; }
  const body = ui.el('div', 'ptable');
  const home = () => {
    body.innerHTML = `<p class="muted">已收集 <b>${count()} / ${E().length}</b> 個元素。點已收集的元素看說明；用「元素猜謎」收集新元素。</p>`;
    const row = ui.el('div', 'pt-row');
    const b1 = ui.el('button', 'btn gold', '🔎 元素猜謎'); b1.type = 'button'; b1.onclick = () => guess(paint, home, body);
    const b2 = ui.el('button', 'btn', '📍 位置挑戰'); b2.type = 'button'; b2.onclick = () => locate(paint, home, body);
    row.append(b1, b2); body.appendChild(row);
    const det = ui.el('div', 'pt-det');
    body.appendChild(table('view', e => { det.innerHTML = !e ? '<p class="muted">這一格的元素沒有收錄在小島的元素卡裡。</p>' : own()[e.sym] ? info(e) : '<p class="muted">這一格還沒收集，試試元素猜謎吧。</p>'; }));
    body.appendChild(legend()); body.appendChild(det);
  };
  home();
  ui.panel('元素週期表（化學）', body, { cls: 'shop-p wide' });
}

/** 元素猜謎：一輪 3 題，提示一句一句揭開 */
function guess(paint, home, body) {
  const have = own(), all = E(), seen = new Set(); let k = 0, score = 0;
  const next = () => {
    if (k >= 3) return finish();
    const fresh = all.filter(e => !have[e.sym] && !seen.has(e.sym)), e = pick(fresh.length ? fresh : all.filter(x => !seen.has(x.sym))); seen.add(e.sym);
    // 干擾選項：原子序相近、但不同族的元素（同族元素的價電子與性質相近，提示容易同時成立）
    const near = all.filter(x => x !== e && (x.group == null || x.group !== e.group)).sort((a, b) => Math.abs(a.z - e.z) - Math.abs(b.z - e.z)).slice(0, 6).sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [e, ...near].sort(() => Math.random() - 0.5); let shown = 1, done = false;
    const draw = () => {
      body.innerHTML = `<p class="muted">第 ${k + 1} / 3 題 · 提示越少就猜中，分數越高（3／2／1 分）</p>
        <ol class="pt-clues">${e.clue.slice(0, shown).map(c => `<li>${ui.esc(c)}</li>`).join('')}</ol><div class="rd-opts pt-opts"></div><div class="pt-fb"></div>`;
      const box = body.querySelector('.pt-opts');
      opts.forEach(o => { const b = ui.el('button', 'choice', `<b>${o.sym}</b> ${ui.esc(o.zh)}`); b.type = 'button'; b.onclick = () => choose(o, b); box.appendChild(b); });
      if (shown < 3) { const m = ui.el('button', 'btn', '再給一句提示'); m.type = 'button'; m.onclick = () => { if (!done) { shown++; draw(); } }; body.querySelector('.pt-fb').appendChild(m); }
    };
    const choose = (o, btn) => {
      if (done) return;
      if (o !== e) {
        Audio.sfx('bad'); btn.classList.add('bad'); btn.disabled = true; ui.toast(`不是${o.zh}，看看下一句提示`);
        if (shown < 3) { shown++; const ol = body.querySelector('.pt-clues'); ol.appendChild(ui.el('li', '', ui.esc(e.clue[shown - 1]))); if (shown >= 3) { const m = body.querySelector('.pt-fb .btn'); if (m) m.remove(); } return; }
      }
      done = true; const ok = o === e, pts = ok ? 4 - shown : 0; score += pts;
      if (ok) { Audio.sfx('catch'); if (!have[e.sym]) { have[e.sym] = dayKey(); save(); } }
      [...body.querySelectorAll('.pt-opts .choice')].forEach((b, j) => { b.disabled = true; if (opts[j] === e) b.classList.add('ok'); });
      const fb = body.querySelector('.pt-fb'); fb.innerHTML = `<p>${ok ? `<b>猜中了！</b>得 ${pts} 分，${ui.esc(e.zh)}收進週期表。` : `答案是 <b>${ui.esc(e.zh)}</b>。`}</p>` + info(e);
      const nb = ui.el('button', 'btn gold', k + 1 >= 3 ? '看結果' : '下一題'); nb.type = 'button'; nb.onclick = () => { k++; next(); }; fb.appendChild(nb);
    };
    draw();
  };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.elemDay !== d && score > 0, b = first ? score * 200 : 0; if (first) s.elemDay = d; s.bells += b; practiced('periodic', score, 9); save(); if (score) miles.add('puzzle');
    body.innerHTML = `<p class="pt-res"><b>這一輪得 ${score} / 9 分</b></p><p class="muted">${first ? `今日練習獎勵：${b} 鈴錢。` : (s.elemDay === d ? '今天的獎勵已經領過了，可以繼續練習。' : '答對至少一題就能領今天的獎勵，再試一次吧！')}已收集 ${count()} / ${E().length} 個元素。</p>`;
    const row = ui.el('div', 'pt-row'), a = ui.el('button', 'btn gold', '再猜一輪'), h = ui.el('button', 'btn', '回週期表'); a.type = h.type = 'button';
    a.onclick = () => guess(paint, home, body); h.onclick = home; row.append(a, h); body.appendChild(row);
    paint && paint();
  };
  next();
}

/** 位置挑戰：空白週期表上點出 5 個元素 */
function locate(paint, home, body) {
  const all = E().slice().sort(() => Math.random() - 0.5).slice(0, 5); let k = 0, right = 0; const mark = {};
  const draw = msg => {
    const e = all[k];
    body.innerHTML = `<p class="muted">第 ${Math.min(k + 1, 5)} / 5 題 · 在空白週期表上點出元素的位置（上方是族、左邊是週期）</p><p class="pt-q">${e ? `請點出：<b>${ui.esc(e.zh)}（${e.sym}）</b>` : ''}</p><div class="pt-fb">${msg || ''}</div>`;
    body.insertBefore(table('blank', (x, b) => {
      if (!e) return;
      const ok = x === e; if (ok) right++; mark[e.sym] = 'ok'; if (x && !ok) mark[x.sym] = 'bad'; Audio.sfx(ok ? 'catch' : 'bad');
      const m = ok ? `<b>正確！</b>${ui.esc(e.zh)}在${e.group ? `第 ${e.period} 週期、第 ${e.group} 族` : '錒系'}。` : `${x ? `這一格是 ${ui.esc(x.zh)}（${x.sym}）` : '不是這一格'}。${ui.esc(e.zh)}在${e.group ? `第 ${e.period} 週期、第 ${e.group} 族` : '錒系'}（綠框）。`;
      k++; draw(m); if (k >= 5) finish();
    }, mark), body.querySelector('.pt-fb'));
  };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.elemPosDay !== d && right > 0, b = first ? right * 200 : 0; if (first) s.elemPosDay = d; s.bells += b; practiced('periodic', right, 5); save(); if (right) miles.add('puzzle');
    const fb = body.querySelector('.pt-fb'); fb.appendChild(ui.el('p', '', `<b>點對 ${right} / 5 個。</b>${first ? `今日練習獎勵：${b} 鈴錢。` : ''}記位置的訣竅：週期（橫列）等於電子殼層數；主族元素同族（直行）的價電子數相同、化學性質相近。`));
    const row = ui.el('div', 'pt-row'), a = ui.el('button', 'btn gold', '再挑戰一輪'), h = ui.el('button', 'btn', '回週期表'); a.type = h.type = 'button';
    a.onclick = () => locate(paint, home, body); h.onclick = home; row.append(a, h); fb.appendChild(row);
    paint && paint();
  };
  draw();
}
