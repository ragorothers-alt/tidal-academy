/* 潮汐小島 · 每日單字謎：從學測單字表選一個 5 個字母的單字，給中文意思當提示，6 次機會猜出來。
   猜的字也必須是單字表裡的字（順便複習）；綠色＝位置正確、黃色＝有這個字母但位置不對、灰色＝沒有。結果記入單字複習。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { dayKey } from './quiz.js';
import * as miles from './miles.js';

const TA = window.TA, L = TA.L, LEN = 5, TRIES = 6;
const pool = () => (L.VOCAB || []).filter(v => /^[a-z]+$/.test(v.w) && v.w.length === LEN);
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export function answer(d) { const P = pool().filter(v => v.lv <= 5); return P.length ? P[hash((d || dayKey()) + ':word') % P.length] : null; }
/** 每格的顏色：g 正確、y 位置不對、x 沒有（處理重複字母） */
export function score(guess, ans) {
  const out = Array(LEN).fill('x'), left = {};
  for (let i = 0; i < LEN; i++) { if (guess[i] === ans[i]) out[i] = 'g'; else left[ans[i]] = (left[ans[i]] || 0) + 1; }
  for (let i = 0; i < LEN; i++) if (out[i] !== 'g' && left[guess[i]]) { out[i] = 'y'; left[guess[i]]--; }
  return out;
}
const data = () => { const s = S(), d = dayKey(); if (!s.wordle || s.wordle.d !== d) s.wordle = { d, guesses: [], done: false, win: false }; return s.wordle; };
export const doneToday = () => data().done;
let cur = '', box = null, onKey = null;
export function open(paint) {
  const A = answer(); if (!A) { ui.toast('單字表還沒載入'); return; }
  const W = data(), words = new Set(pool().map(v => v.w));
  box = ui.el('div', 'wordle'); cur = '';
  const draw = () => {
    const rows = [];
    for (let r = 0; r < TRIES; r++) {
      const g = W.guesses[r], sc = g ? score(g, A.w) : null, txt = g || (r === W.guesses.length && !W.done ? cur : '');
      rows.push(`<div class="wd-row">${Array.from({ length: LEN }, (_, i) => `<i class="${sc ? sc[i] : txt[i] ? 'f' : ''}">${(txt[i] || '').toUpperCase()}</i>`).join('')}</div>`);
    }
    const R = { x: 1, y: 2, g: 3 }, used = {}; W.guesses.forEach(g => score(g, A.w).forEach((c, i) => { const ch = g[i]; if (!used[ch] || R[c] > R[used[ch]]) used[ch] = c; }));
    const kb = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r, k) => `<div class="wd-kb">${k === 2 ? '<button type="button" data-k="enter" class="wide">送出</button>' : ''}${[...r].map(c => `<button type="button" data-k="${c}" class="${used[c] || ''}">${c.toUpperCase()}</button>`).join('')}${k === 2 ? '<button type="button" data-k="back" class="wide">⌫</button>' : ''}</div>`).join('');
    const end = W.done ? `<p class="wd-end">${W.win ? `🎉 答對了！` : '這次沒猜到。'}答案是 <b>${A.w}</b>（${A.pos || ''}）${ui.esc(A.zh)}${A.ex ? `<br><small>${ui.esc(A.ex)}${A.exZh ? '（' + ui.esc(A.exZh) + '）' : ''}</small>` : ''}</p>` : '';
    box.innerHTML = `<p class="wd-hint">提示：${A.pos || ''} ${ui.esc(A.zh)} · ${LEN} 個字母</p>${rows.join('')}${end}${W.done ? '' : kb}<p class="muted">猜的字也要是單字表裡的 ${LEN} 字母單字（共 ${words.size} 個）。綠色位置正確、黃色有這個字母但位置不對。每天一題。</p>`;
    box.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => press(b.dataset.k); });
  };
  const press = k => {
    if (W.done) return;
    if (k === 'back') cur = cur.slice(0, -1);
    else if (k === 'enter') {
      if (W.d !== dayKey()) { ui.toast('日期換了，題目也換成今天的了'); ui.closePanel(); open(paint); return; }
      if (cur.length < LEN) { ui.toast(`要輸入 ${LEN} 個字母`); return; }
      if (!words.has(cur)) { ui.toast('這個字不在單字表裡，換一個試試'); Audio.sfx('bad'); return; }
      W.guesses.push(cur); cur = '';
      if (W.guesses[W.guesses.length - 1] === A.w || W.guesses.length >= TRIES) finish(W, A, paint);
      save();
    } else if (/^[a-z]$/.test(k) && cur.length < LEN) cur += k;
    Audio.sfx('pop'); draw();
  };
  onKey = e => { if (!box || !document.body.contains(box)) { ui.setKeyHook(null); return false; } if (e.ctrlKey || e.metaKey || e.altKey || W.done) return false; const k = (e.key || '').toLowerCase(); if (/^[a-z]$/.test(k) || e.key === 'Enter' || e.key === 'Backspace') { e.preventDefault(); press(e.key === 'Enter' ? 'enter' : e.key === 'Backspace' ? 'back' : k); return true; } return false; };
  ui.setKeyHook(onKey);
  draw(); ui.panel('每日單字謎', box, { cls: 'shop-p', onClose: () => { ui.setKeyHook(null); box = null; } });
}
function finish(W, A, paint) {
  W.done = true; W.win = W.guesses[W.guesses.length - 1] === A.w;
  L.recordVocab(A.w, W.win);
  if (W.win) { const b = 1600 - (W.guesses.length - 1) * 200, s = S(); s.bells += b; s.stats = s.stats || {}; s.stats.wordle = (s.stats.wordle || 0) + 1; miles.add('puzzle'); Audio.sfx('catch'); ui.toast(`答對了！+${b} 鈴錢`); }
  else Audio.sfx('bad');
  save(); paint && paint();
}
