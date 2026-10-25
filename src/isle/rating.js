/* 潮汐小島 · 島嶼評價：學習、博物館、島民、房間、圖鑑五個面向，算出 1–5 星並給建議。學習佔最重。 */
import * as ui from './ui.js';
import { I, S, save, list, icon } from './state.js';

const TA = window.TA, L = TA.L;
const clamp = v => Math.max(0, Math.min(1, v));
export const PARTS = [
  ['study', '學習', 0.4], ['friends', '島民', 0.2], ['museum', '博物館', 0.15], ['dex', '圖鑑', 0.15], ['home', '居家與造景', 0.1]
];
export function score() {
  const s = S(), o = L.overall(), d = L.dayRec(), goal = TA.S.profile.dailyGoal || 30;
  const study = clamp(o.seen / (o.total * 0.6)) * 0.3 + clamp((o.acc - 0.4) / 0.45) * 0.25 + clamp(L.streakAlive() / 14) * 0.25 + clamp(L.effort(d) / goal) * 0.2;
  const kinds = ['fish', 'bug', 'fossil', 'sea', 'mineral'], total = kinds.reduce((a, k) => a + list(k).length, 0);
  const donated = kinds.reduce((a, k) => a + Object.keys(s.museum[k] || {}).length, 0), caught = kinds.reduce((a, k) => a + Object.keys(s.dex[k] || {}).length, 0);
  const friends = Object.values(s.fr || {}).reduce((a, v) => a + Math.min(16, v), 0) / (10 * 16);
  const room = (s.room && s.room.items) || [];
  const v = { study, friends: clamp(friends), museum: clamp(donated / Math.min(60, total)), dex: clamp(caught / Math.min(80, total)), home: clamp(room.length / 15) * 0.5 + clamp(Object.keys(s.design || {}).length / 40) * 0.2 + (s.room && s.room.wall ? 0.1 : 0) + clamp(Object.keys((s.garden || {}).book || {}).length / 7) * 0.2 };
  const total01 = PARTS.reduce((a, [k, , w]) => a + v[k] * w, 0);
  const stars = total01 < 0.2 ? 1 : total01 < 0.4 ? 2 : total01 < 0.6 ? 3 : total01 < 0.8 ? 4 : 5;
  return { v, total: total01, stars, detail: { seen: o.seen, total: o.total, acc: o.acc, streak: L.streakAlive(), today: d.q, goal, donated, caught, all: total, room: room.length } };
}
const ADVICE = {
  study: r => r.detail.today < r.detail.goal ? `今天還差 ${r.detail.goal - r.detail.today} 題達成每日目標` : r.detail.streak < 7 ? `連續學習 ${r.detail.streak} 天，撐到 7 天分數會大幅上升` : `已練過 ${r.detail.seen} / ${r.detail.total} 題，多和導師聊天探索新題目`,
  friends: () => '每天找導師「來考我吧」，每人每天最多加 3 點好感度',
  museum: r => `博物館收藏 ${r.detail.donated} 件，把釣到、抓到、鑑定好的東西拿給史遙`,
  dex: r => `圖鑑登錄 ${r.detail.caught} / ${r.detail.all}，不同月份與時段會出現不同的生物`,
  home: r => `房間裡有 ${r.detail.room} 件家具；也可以按 G 鋪步道，或到商店買種子、在花園培育新花色`
};
/** 每次開啟時檢查是否升星，升星發獎勵 */
export async function check() {
  const s = S(), r = score(); s.rating = s.rating || { best: 1 };
  if (r.stars > s.rating.best) {
    const gain = 1000 * r.stars; s.rating.best = r.stars; s.bells += gain; save();
    await ui.card({ icon: icon('bells', 'bells'), title: `島嶼評價升到 ${'★'.repeat(r.stars)}！`, sub: `獲得 ${gain} 鈴錢${r.stars === 5 ? '。五星小島：每天晚上都會放煙火慶祝！' : ''}` });
  }
  return r;
}
export const fiveStar = () => ((S().rating || {}).best || 1) >= 5;
export async function open() {
  const r = await check();
  const T = I.RATING || {}, worst = PARTS.slice().sort((a, b) => r.v[a[0]] - r.v[b[0]])[0][0];
  const tipsFor = k => ((T.tips || {})[k] || []);
  const body = ui.el('div', 'rating', `
    <div class="rt-stars">${'★'.repeat(r.stars)}<span>${'★'.repeat(5 - r.stars)}</span></div>
    <p class="rt-title">${ui.esc((T.title || [])[r.stars - 1] || ['才剛開始的小島', '漸漸熱鬧起來了', '讓人想多待一會兒', '大家都喜歡這裡', '閃閃發光的潮汐小島'][r.stars - 1])}</p>
    <div class="rt-bars">${PARTS.map(([k, n, w]) => `<div class="rt-bar${k === worst ? ' weak' : ''}"><b>${n}<small>×${Math.round(w * 100)}%</small></b><i><em style="width:${Math.round(r.v[k] * 100)}%"></em></i><span>${Math.round(r.v[k] * 100)}</span></div>`).join('')}</div>
    <div class="rt-tip"><b>💡 最值得加強：${PARTS.find(p => p[0] === worst)[1]}</b><p>${ui.esc(ADVICE[worst](r))}</p>${tipsFor(worst).length ? `<p class="muted">${ui.esc(tipsFor(worst)[Math.floor(Math.random() * tipsFor(worst).length)])}</p>` : ''}</div>
    <p class="muted">總分 ${Math.round(r.total * 100)} / 100 · 學習佔 40%，依練過題數、正確率、連續天數與今日目標計算</p>`);
  ui.panel('島嶼評價', body, { cls: 'rating-p' });
}
