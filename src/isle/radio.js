/* 潮汐小島 · 海風電台：英文聽力練習。用瀏覽器內建的語音朗讀學測單字表的例句（離線可用，依裝置的語音而定），
   一輪 5 題：「最接近的中文意思」或「句子裡出現的單字」。答題記入單字複習；沒有英文語音時改成閱讀模式。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, practiced } from './state.js';
import { pick, dayKey } from './quiz.js';
import * as miles from './miles.js';

const TA = window.TA, L = TA.L, N = 5;
const synth = () => (typeof window !== 'undefined' && window.speechSynthesis) || null;
function voice() { const s = synth(); if (!s) return null; const vs = s.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang)); return vs.find(v => /en-US/i.test(v.lang)) || vs[0] || null; }
export const canSpeak = () => !!voice();
export function speak(text, rate) {
  const s = synth(), v = voice(); if (!s || !v) return false;
  s.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = rate || 0.9; s.speak(u); return true;
}
const good = v => v.ex && v.exZh && v.ex.length <= 130 && /[a-z]/i.test(v.ex) && !/\?{3,}/.test(v.exZh);
const pool = () => (L.VOCAB || []).filter(good);
const posSet = v => new Set(String(v.pos || '').split(/[\/,，、 ]+/).filter(Boolean));
function makeQ(seen) {
  const P = pool().filter(v => !seen.has(v.w)), due = L.vocabDue().filter(v => good(v) && !seen.has(v.w)), v = (due.length && Math.random() < 0.5 ? pick(due) : pick(P));
  const type = !canSpeak() || Math.random() < 0.5 ? 'zh' : 'word';   // 閱讀模式看得到句子，只出「意思」題
  seen.add(v.w);
  if (type === 'zh') {
    const others = [...new Set(P.filter(x => x.w !== v.w && x.exZh !== v.exZh && Math.abs(x.exZh.length - v.exZh.length) < 14).sort(() => Math.random() - 0.5).map(x => x.exZh))].slice(0, 3);
    const o = [v.exZh, ...others].sort(() => Math.random() - 0.5); return { v, type, q: '這句話最接近哪個意思？', o, a: o.indexOf(v.exZh) };
  }
  const ps = posSet(v), fits = x => x.w !== v.w && !v.ex.toLowerCase().includes(x.w.toLowerCase());
  let others = P.filter(x => fits(x) && [...posSet(x)].some(p => ps.has(p))).sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.w);
  if (others.length < 3) others = others.concat(P.filter(x => fits(x) && !others.includes(x.w)).sort(() => Math.random() - 0.5).slice(0, 3 - others.length).map(x => x.w));   // 同詞性不足時補其他單字
  const o = [v.w, ...others].sort(() => Math.random() - 0.5); return { v, type, q: '句子裡出現了哪一個單字？', o, a: o.indexOf(v.w) };
}
export function open(paint) {
  if (synth()) synth().getVoices();   // 有些瀏覽器要先呼叫一次才會載入語音
  const body = ui.el('div', 'radio'); let k = 0, right = 0, cur = null, answered = false, slow = false, seen = new Set(), timer = 0, closed = false;
  const next = () => { clearTimeout(timer); if (k >= N) return finish(); cur = makeQ(seen); answered = false; draw(); timer = setTimeout(play, 300); };
  // 語音清單常常是非同步載入：載入後若這題還沒作答就重畫成播放模式
  const vc = () => { if (cur && !answered && canSpeak() && body.querySelector('.rd-text')) { cur = makeQ(seen); draw(); } };
  if (synth() && synth().addEventListener) synth().addEventListener('voiceschanged', vc);
  const play = () => { if (!cur || closed) return; if (!speak(cur.v.ex, slow ? 0.7 : 0.92) && !answered) draw(true); };
  const draw = textMode => {
    const tm = textMode || !canSpeak();
    body.innerHTML = `<p class="muted">第 ${k + 1} / ${N} 題 · ${tm ? '這台裝置沒有英文語音，改成閱讀模式' : '按「播放」聽一句英文'}</p>
      ${tm ? `<p class="rd-text">${ui.esc(cur.v.ex)}</p>` : `<div class="rd-play"><button type="button" class="btn gold rd-p">🔊 播放</button><button type="button" class="btn rd-s">${slow ? '🐢 慢速（開）' : '🐢 慢速'}</button></div>`}
      <p class="rd-q"><b>${cur.q}</b></p><div class="rd-opts"></div><div class="rd-fb"></div>`;
    const box = body.querySelector('.rd-opts');
    cur.o.forEach((t, i) => { const b = ui.el('button', 'choice', ui.esc(t)); b.type = 'button'; b.onclick = () => choose(i); box.appendChild(b); });
    const p = body.querySelector('.rd-p'); if (p) p.onclick = play;
    const sb = body.querySelector('.rd-s'); if (sb) sb.onclick = () => { slow = !slow; sb.textContent = slow ? '🐢 慢速（開）' : '🐢 慢速'; play(); };
  };
  const choose = i => {
    if (answered) return; answered = true; const ok = i === cur.a; if (ok) right++; L.recordVocab(cur.v.w, ok); Audio.sfx(ok ? 'ok' : 'bad');
    [...body.querySelectorAll('.rd-opts .choice')].forEach((b, j) => { b.classList.toggle('ok', j === cur.a); b.classList.toggle('bad', j === i && !ok); b.disabled = true; });
    body.querySelector('.rd-fb').innerHTML = `<p>${ok ? '答對了！' : '再聽一次看看。'}</p><p class="rd-text">${ui.esc(cur.v.ex)}<br><small>${ui.esc(cur.v.exZh)}</small></p><p class="muted"><b>${cur.v.w}</b> ${cur.v.pos || ''} ${ui.esc(cur.v.zh)}</p>`;
    const nb = ui.el('button', 'btn gold', k + 1 >= N ? '看結果' : '下一題'); nb.type = 'button'; nb.onclick = () => { k++; next(); }; body.querySelector('.rd-fb').appendChild(nb);
  };
  const finish = () => {
    clearTimeout(timer); if (synth()) synth().cancel();
    const s = S(), d = dayKey(), first = s.radioDay !== d && right > 0, b = first ? right * 400 : 0; if (first) s.radioDay = d; s.bells += b; s.stats = s.stats || {}; s.stats.radio = (s.stats.radio || 0) + 1; practiced('radio', right, N); save(); miles.add('radio');
    body.innerHTML = `<p class="rd-q"><b>這一輪答對 ${right} / ${N} 題</b></p><p class="muted">${first ? `今日練習獎勵：${b} 鈴錢。` : (s.radioDay === d ? '今天的獎勵已經領過了，可以繼續練習。' : '答對至少一題就能領今天的獎勵，再試一次吧！')}聽到的單字都記入了單字複習。</p>`;
    const again = ui.el('button', 'btn gold', '再聽一輪'); again.type = 'button'; again.onclick = () => { k = 0; right = 0; seen = new Set(); next(); }; body.appendChild(again);
    paint && paint();
  };
  next();
  ui.panel('海風電台（英文聽力）', body, { cls: 'shop-p', onClose: () => { closed = true; clearTimeout(timer); if (synth()) { synth().cancel(); synth().removeEventListener && synth().removeEventListener('voiceschanged', vc); } } });
}
