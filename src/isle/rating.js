/* 潮汐小島 · 島嶼評價：學習、博物館、島民、房間、圖鑑五個面向，算出 1–5 星並給建議。學習佔最重。
   v7.1：星等記永久的成果——學習看熟練題數、練過的範圍、完成的研究階段與最長連續紀錄（不看今天答了幾題、目前的連續天數），
   v7.1 也看已驗證的概念應用（練習遊戲在不同天都做對）。居家看主題角落（room.corners）多過家具數量；星等只升不降。今天／本週的學習另外用一段溫和的摘要顯示。 */
import * as ui from './ui.js';
import { I, S, save, list, icon } from './state.js';
import { corners, CORNERS } from './room.js';

const TA = window.TA, L = TA.L;
const clamp = v => Math.max(0, Math.min(1, v));
export const PARTS = [
  ['study', '學習', 0.4], ['friends', '島民', 0.2], ['museum', '博物館', 0.15], ['dex', '圖鑑', 0.15], ['home', '居家與造景', 0.1]
];
const labStages = s => Object.values(s.lab || {}).reduce((a, r) => a + Math.min(3, (r && r.stage) || 0), 0);
export function score() {
  const s = S(), o = L.overall(), research = labStages(s), best = TA.S.streak.best || 0, concepts = Object.keys(L.CONCEPTS).filter(L.conceptVerified).length;
  const study = clamp(o.mastered / (o.total * 0.25)) * 0.35 + clamp(o.seen / (o.total * 0.6)) * 0.2 + clamp(research / 15) * 0.2 + clamp(best / 30) * 0.1 + clamp(concepts / 6) * 0.15;
  const kinds = ['fish', 'bug', 'fossil', 'sea', 'mineral'], total = kinds.reduce((a, k) => a + list(k).length, 0);
  const donated = kinds.reduce((a, k) => a + Object.keys(s.museum[k] || {}).length, 0), caught = kinds.reduce((a, k) => a + Object.keys(s.dex[k] || {}).length, 0);
  const friends = Object.values(s.fr || {}).reduce((a, v) => a + Math.min(16, v), 0) / (10 * 16);
  const room = (s.room && s.room.items) || [], cn = corners(s.room || { items: [] });
  const v = { study, friends: clamp(friends), museum: clamp(donated / Math.min(60, total)), dex: clamp(caught / Math.min(80, total)), home: clamp(room.length / 15) * 0.3 + clamp(cn.length / 3) * 0.25 + clamp(Object.keys(s.design || {}).length / 40) * 0.15 + (s.room && s.room.wall ? 0.1 : 0) + clamp(Object.keys((s.garden || {}).book || {}).length / 7) * 0.2 };
  const total01 = PARTS.reduce((a, [k, , w]) => a + v[k] * w, 0);
  const now = total01 < 0.2 ? 1 : total01 < 0.4 ? 2 : total01 < 0.6 ? 3 : total01 < 0.8 ? 4 : 5;
  const stars = Math.max(now, ((s.rating || {}).best) || 1);   // 永久成果：星等只升不降
  return { v, total: total01, stars, now, detail: { seen: o.seen, total: o.total, mastered: o.mastered, research, best, concepts, donated, caught, all: total, room: room.length, corners: cn } };
}
/** 這一週的學習（溫和摘要，不影響星等）：最近 7 天有學習的天數、學習分鐘 */
export function week() {
  const days = TA.S.days || {}, out = { days: 0, min: 0 };
  for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); const r = days[TA.U.dayKey(d)]; if (!r) continue; const m = L.studyMin(r); out.min += m; if (m >= L.STREAK_Q || r.focus) out.days++; }
  return out;
}
const ADVICE = {
  study: r => r.detail.research < 3 ? '和熟識的導師一起推進研究計畫：每完成一個階段，小島就多一份永久成果' : r.detail.concepts < 3 ? `已驗證 ${r.detail.concepts} 個概念：手機「練習護照」裡的遊戲，隔幾天再做對一輪就能驗證` : `熟練 ${r.detail.mastered} 題：同一題在不同天都答對才算熟練，每日潮汐會幫你排好複習`,
  friends: () => '每天找導師「一起練習」或「連續挑戰」，每人每天最多加 3 點好感度',
  museum: r => `博物館收藏 ${r.detail.donated} 件，把釣到、抓到、鑑定好的東西拿給史遙`,
  dex: r => `圖鑑登錄 ${r.detail.caught} / ${r.detail.all}，不同月份與時段會出現不同的生物`,
  home: r => { const miss = CORNERS.filter(c => !r.detail.corners.some(x => x.id === c.id)); return `房間裡有 ${r.detail.room} 件家具${r.detail.corners.length ? `、${r.detail.corners.map(c => c.name).join('、')}` : ''}${miss.length ? `；試著湊一個${miss[0].name}（${miss[0].tip}）` : ''}。也可以鋪步道、在花園培育新花色`; }
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
  const r = await check(), wk = week();
  const T = I.RATING || {}, worst = PARTS.slice().sort((a, b) => r.v[a[0]] - r.v[b[0]])[0][0];
  const tipsFor = k => ((T.tips || {})[k] || []);
  const body = ui.el('div', 'rating', `
    <div class="rt-stars">${'★'.repeat(r.stars)}<span>${'★'.repeat(5 - r.stars)}</span></div>
    <p class="rt-title">${ui.esc((T.title || [])[r.stars - 1] || ['才剛開始的小島', '漸漸熱鬧起來了', '讓人想多待一會兒', '大家都喜歡這裡', '閃閃發光的潮汐小島'][r.stars - 1])}</p>
    <div class="rt-bars">${PARTS.map(([k, n, w]) => `<div class="rt-bar${k === worst ? ' weak' : ''}"><b>${n}<small>×${Math.round(w * 100)}%</small></b><i><em style="width:${Math.round(r.v[k] * 100)}%"></em></i><span>${Math.round(r.v[k] * 100)}</span></div>`).join('')}</div>
    <div class="rt-tip"><b>💡 最值得加強：${PARTS.find(p => p[0] === worst)[1]}</b><p>${ui.esc(ADVICE[worst](r))}</p>${tipsFor(worst).length ? `<p class="muted">${ui.esc(tipsFor(worst)[Math.floor(Math.random() * tipsFor(worst).length)])}</p>` : ''}</div>
    <div class="rt-week"><b>這一週</b><span>學習 ${wk.days} / 7 天 · 約 ${wk.min} 分鐘</span><small>只是給你看看，不影響星等</small></div>
    <p class="muted">總分 ${Math.round(r.total * 100)} / 100 · 星等記的是永久成果，只升不降：學習看熟練題數、練過的範圍、完成的研究、已驗證的概念與最長連續紀錄；居家看主題角落（${CORNERS.map(c => c.name).join('、')}）。</p>`);
  ui.panel('島嶼評價', body, { cls: 'rating-p' });
}
