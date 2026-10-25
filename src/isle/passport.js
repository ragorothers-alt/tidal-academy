/* 潮汐小島 · 練習護照：九種練習遊戲的集章冊。玩過一輪蓋章，累積練習 7 天換成金章；顯示輪數與正確率。
   v7.1：每個章也顯示「概念應用」的進度（L.recordConcept）：一輪八成以上、隔幾天到期後再做對才升一格，兩格以上算已驗證。 */
import * as ui from './ui.js';
import { S, dayKey } from './state.js';

const L = window.TA.L;
/** 概念狀態的短句 */
export function conceptLine(cid) {
  const r = L.concept(cid); if (!r) return '還沒練過';
  const due = r.due <= window.TA.U.dayNum(), s = r.s || 0;
  return (s >= 2 ? `已驗證 ${'●'.repeat(s)}${'○'.repeat(4 - s)}` : `${'●'.repeat(s)}${'○'.repeat(4 - s)}`) + (due ? ' · 今天可以再驗證' : r.ok === dayKey() ? ' · 今天升格了' : '');
}
export const verified = () => Object.keys(L.CONCEPTS).filter(L.conceptVerified).length;

export const GAMES = [
  ['radio', '海風電台', '📻', '英文'], ['idiom', '成語診所', '🖌', '國文'], ['plot', '函數圖形', '📉', '數學'], ['market', '潮汐夜市', '🏮', '數學'],
  ['chrono', '年代排序', '🏺', '歷史'], ['council', '島民議會', '🗳', '公民'], ['throw', '拋射實驗', '🥥', '物理'], ['periodic', '元素週期表', '⚗️', '化學'],
  ['moon', '月相觀測', '🌙', '地科']
];
const P = () => S().practice || {};
export const stamps = () => GAMES.filter(([id]) => P()[id]).length;
export const golds = () => GAMES.filter(([id]) => (P()[id] || {}).days >= 7).length;
export function open(openGame) {
  const body = ui.el('div', 'passport'), today = dayKey();
  body.innerHTML = `<p class="muted">已蓋 <b>${stamps()} / ${GAMES.length}</b> 個章，金章 <b>${golds()}</b> 個（同一個遊戲練習滿 7 天）。點章可以直接開始練習。</p>`;
  const grid = ui.el('div', 'pp-grid');
  GAMES.forEach(([id, name, ic, sub]) => {
    const p = P()[id], gold = p && p.days >= 7, b = ui.el('button', 'pp-st' + (p ? ' on' : '') + (gold ? ' gold' : ''),
      `<i>${ic}</i><b>${name}</b><small>${sub}</small><span>${p ? `${p.n} 輪 · 正確率 ${p.tot ? Math.round(p.ok / p.tot * 100) : 0}% · ${p.days} 天${p.last === today ? ' · 今天✔' : ''}` : '還沒蓋章'}</span><em class="pp-c">概念：${conceptLine(L.conceptOf(id))}</em>`);
    b.type = 'button'; b.onclick = () => openGame && openGame(id); grid.appendChild(b);
  });
  body.appendChild(grid);
  body.appendChild(ui.el('p', 'pp-gene', `🌱 孟德爾遺傳（生物導師的「花園遺傳諮詢」）：${conceptLine('bio-mendel')}`));
  body.appendChild(ui.el('p', 'muted', `已驗證的概念 <b>${verified()} / ${Object.keys(L.CONCEPTS).length}</b>。每一輪都是新的數字與情境：一輪答對八成以上，而且隔幾天到期時再做對，才升一格（●），兩格以上算「已驗證」；不到五成退一格。這些紀錄和題庫題目的熟練分開算，但每一題都算進今天的學習。每天換幾種輪流練，比只玩一種更能照顧到各科。`));
  ui.panel('練習護照', body, { cls: 'shop-p' });
}
