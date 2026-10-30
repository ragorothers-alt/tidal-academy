/* 潮汐小島 · 觀察筆記（v7.1）：釣魚、捉蟲、潮池、神秘島的生物答錯時不是白忙一場——牠溜走了，但你記下了牠的樣子。
   筆記最多 8 筆（滿了先丟普通的）；之後在手機「圖鑑」上方的觀察筆記裡，答對一題新的同類題目（不限時）就補完研究：
   帶回一隻、登錄圖鑑（潮池的保育類只拍照送進博物館）。每筆一天試一次，不能看完解析馬上重答同一題。
   大賽中答錯不記（比賽就是比賽）。新手引導還沒完成時，採集答錯也照樣帶回（新手保護，newbie）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, find, addItem, icon, stars, dayKey, freeSlots, photoOnly } from './state.js';
import { pickQ, pickQU, vocabQ, askQ, record } from './quiz.js';
import * as miles from './miles.js';

const MAX = 8;
const notes = () => { const s = S(); if (!Array.isArray(s.obs)) s.obs = []; return s.obs; };
export const count = () => notes().length;
export const has = (k, id) => notes().some(o => o.k === k && o.id === id);
/** 新手保護：新手引導還沒完成 */
export const newbie = () => { const g = S().guide; return !!g && !g.fin; };
/** 記下一筆：q 是出題方式——'vocab' 單字題，或科目 id（潮池用 'sea'）；同一種已經在筆記裡就不重複。回傳是否記下 */
export function add(k, id, q) {
  const L0 = notes(); if (!find(k, id) || L0.some(o => o.k === k && o.id === id)) return false;
  L0.push({ k, id, q: q || 'vocab', at: Date.now(), tried: '' });
  while (L0.length > MAX) { const i = L0.findIndex(o => ((find(o.k, o.id) || {}).rarity || 0) < 4); L0.splice(i >= 0 ? i : 0, 1); }
  save(); return true;
}
/** 答錯時的提示句（接在原本的台詞後面） */
export const told = '不過你記下了牠的樣子：手機「圖鑑」上方的觀察筆記裡答對一題，就能補完研究、帶回一隻。';
const qOf = o => o.q === 'vocab' ? vocabQ() : o.q === 'sea' ? pickQU(['es-ocean'], 3) || pickQ('earth', 3) : o.q === 'mbio' ? pickQU(['bi-evo', 'bi-eco'], 3) || pickQ('biology', 3) : o.q === 'mearth' ? pickQU(['es-ocean', 'es-climate'], 3) || pickQ('earth', 3) : pickQ(o.q, 2) || pickQ(o.q, 3);   // v9.0 潛水：生物或地科
async function complete(o) {
  const sp = find(o.k, o.id); if (!sp) { notes().splice(notes().indexOf(o), 1); save(); return; }
  const keep = !photoOnly(o.k, sp);   // 保育類（與潛水遇到的珊瑚等）只拍照：不進口袋
  if (keep && !freeSlots()) { ui.toast('口袋滿了，先整理口袋再來補完', 'bad'); Audio.sfx('deny'); return; }
  const q = qOf(o); if (!q) return;
  ui.closePanel();
  const SP = { name: '觀察筆記', color: '#6f9a52', voice: 480 };
  const { ok } = await askQ(SP, q, `【補完研究・${sp.name}】<br>`);
  record(q, ok); o.tried = dayKey(); save();
  if (!ok) { Audio.sfx('bad'); await ui.explain(SP, q, '還差一點。筆記留著，明天再試一次。'); ui.passage(null); ui.closeDialog(); return; }
  ui.passage(null); ui.closeDialog();
  notes().splice(notes().indexOf(o), 1);
  const s = S(), first = !s.dex[o.k][o.id]; s.dex[o.k][o.id] = s.dex[o.k][o.id] || Date.now();
  if (!keep) s.museum[o.k][o.id] = s.museum[o.k][o.id] || Date.now();
  const room = keep ? addItem({ k: o.k, id: o.id }) : true; save(); miles.add(o.k);
  Audio.sfx('ok');
  await ui.card({ pocket: keep && room, rare: sp.rarity >= 4, icon: icon(o.id, o.k), title: `研究補完：${sp.name}`, sub: keep ? '照著筆記又找到牠了！' : `照著筆記拍到了照片，已經送到博物館的${o.k === 'marine' ? '海洋館' : '潮池展區'}。`, extra: `<span class="stars">${stars(sp.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}` });
}
/** 圖鑑上方的觀察筆記；沒有筆記時回傳 null */
export function section() {
  const L0 = notes(); if (!L0.length) return null;
  const box = ui.el('div', 'fn-box', `<b class="fn-h">📓 觀察筆記（${L0.length}）</b><small class="muted">答錯溜走的生物：答對一題新的題目就補完研究，帶回一隻。每筆一天試一次。</small>`);
  const today = dayKey();
  L0.forEach(o => {
    const sp = find(o.k, o.id); if (!sp) return;
    const d = new Date(o.at), row = ui.el('div', 'fn-row', `<img src="${icon(o.id, o.k)}" alt=""><span><b>${ui.esc(sp.name)}</b><small>${stars(sp.rarity)} · ${d.getMonth() + 1}/${d.getDate()} 記下</small></span>`);
    const b = ui.el('button', 'btn' + (o.tried === today ? ' ghost' : ' gold'), o.tried === today ? '明天再試' : '補完研究'); b.type = 'button';
    b.disabled = o.tried === today; b.onclick = () => complete(o);
    row.appendChild(b); box.appendChild(row);
  });
  return box;
}
