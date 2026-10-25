/* 潮汐小島 · 手感：採集時（釣魚、抓蟲、潮池）連續答對，手感一級一級升高（最多 5 級），稀有生物出現的機率跟著提高；
   答錯手感減半。每天重新計算。生物的稀有度抽選在 state.js 的 roll() 裡讀這個等級。 */
import * as ui from './ui.js';
import { S, save, dayKey } from './state.js';

export const MAX = 5;
const data = () => { const s = S(); if (!s.feel || s.feel.d !== dayKey()) s.feel = { d: dayKey(), n: 0, best: 0 }; return s.feel; };
export const level = () => data().n;
/** 記一次採集答題的結果，回傳 { was, now } */
export function hit(ok) {
  const f = data(), was = f.n;
  f.n = ok ? Math.min(MAX, f.n + 1) : Math.floor(f.n / 2);
  f.best = Math.max(f.best || 0, f.n); save();
  return { was, now: f.n };
}
export const stars = n => '●'.repeat(n) + '○'.repeat(MAX - n);
/** 等級有變化時提示一下：平常只讓 HUD 的手感膠囊更新並彈一下；第一次升上來、滿級、掉級才跳提示（以前每升一級都跳一則長提示） */
export function note(r) {
  if (!r || r.now === r.was) return;
  const el = document.getElementById('feel'); if (el) { el.hidden = !r.now; el.textContent = `手感 ${stars(r.now)}`; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  if (r.now > r.was) { if (r.now === MAX) ui.toast(`手感 ${stars(r.now)} 滿了！稀有的魚和蟲最容易出現`); else if (r.was === 0 && !data().told) { data().told = true; save(); ui.toast(`手感 ${stars(r.now)}：採集時連續答對，稀有生物更容易出現`); } }
  else if (r.was >= 3) ui.toast(`手感 ${stars(r.now)}：答錯了，手感掉了一半`);
}
