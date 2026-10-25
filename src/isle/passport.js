/* 潮汐小島 · 練習護照：十種練習遊戲的集章冊。玩過一輪蓋章，累積練習 7 天換成金章；顯示輪數與正確率。 */
import * as ui from './ui.js';
import { S, dayKey } from './state.js';

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
      `<i>${ic}</i><b>${name}</b><small>${sub}</small><span>${p ? `${p.n} 輪 · 正確率 ${p.tot ? Math.round(p.ok / p.tot * 100) : 0}% · ${p.days} 天${p.last === today ? ' · 今天✔' : ''}` : '還沒蓋章'}</span>`);
    b.type = 'button'; b.onclick = () => openGame && openGame(id); grid.appendChild(b);
  });
  body.appendChild(grid);
  body.appendChild(ui.el('p', 'muted', '每天換幾種輪流練，比只玩一種更能照顧到各科。'));
  ui.panel('練習護照', body, { cls: 'shop-p' });
}
