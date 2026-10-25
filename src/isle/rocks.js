/* 潮汐小島 · 礦物：用鏟子敲石頭偶爾敲出「未鑑定的礦石」，交給岳回答岩石與礦物題鑑定，登錄礦物圖鑑、可以捐給博物館。 */
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { I, S, save, addItem, icon, stars } from './state.js';
import { pickQU, pickQ, record } from './quiz.js';

const W = [0, 10, 6, 3, 1.2, 0.4];
export const CHANCE = 0.14;
export const count = () => S().pockets.filter(x => x && x.k === 'ore').length;
/** 敲石頭時呼叫：成功放進口袋回傳 true */
export function tryOre() {
  if (!(I.MINERALS || []).length || Math.random() >= CHANCE) return false;
  if (!addItem({ k: 'ore', id: 'ore_unknown' })) return false;
  Audio.sfx('catch'); ui.toast('敲出一塊閃閃發亮的礦石！拿去給岳鑑定吧'); return true;
}
function roll() {
  const pool = I.MINERALS || []; let sum = pool.reduce((a, m) => a + (W[m.rarity] || 1), 0), r = Math.random() * sum;
  for (const m of pool) { r -= W[m.rarity] || 1; if (r <= 0) return m; } return pool[0];
}
/** 岳的鑑定：每一塊礦石答一題「岩石與地質作用」 */
export async function appraise(sp) {
  const s = S(); let lastQ = null;
  for (let i = 0; i < s.pockets.length; i++) {
    const it = s.pockets[i]; if (!it || it.k !== 'ore') continue;
    const q = pickQU(['es-rock', 'es-solid'], 3) || pickQ('earth', 3); if (!q) return;
    const a = await ui.ask(sp, `來鑑定這塊礦石吧。先回答：${q.q}`, q.o, { abc: true, keys: true, html: true }), ok = a === q.a; record(q, ok);
    if (!ok) { Audio.sfx('bad'); await ui.say(sp, `正確答案是 ${ui.ansOf(q)}。${q.e}`, { html: true }); await ui.say(sp, '這塊先留著，下次再一起鑑定。'); return; }
    const m = roll(), first = !s.dex.mineral[m.id]; s.dex.mineral[m.id] = s.dex.mineral[m.id] || Date.now();
    s.pockets[i] = { k: 'mineral', id: m.id }; save(); Audio.sfx('catch');
    await ui.card({ icon: icon(m.id, 'mineral'), title: `鑑定結果：${m.name}`, sub: `莫氏硬度 ${m.mohs}`, extra: `<span class="stars">${stars(m.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}` });
    await ui.say(sp, m.desc); lastQ = q;
  }
  if (lastQ) await challenge.keepGoing(sp, lastQ);
}
