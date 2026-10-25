/* 潮汐小島 · 料理：在晶晶的料理教室答化學題學食譜，回家門口的工作台用食材做菜。
   料理放進口袋，可以吃（30 分鐘效果：鈴錢、幸運、腳程）、送人或賣掉。存檔 S().foods（已學食譜）、S().buff。 */
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { I, S, save, addItem, icon } from './state.js';
import { pickQ, record, dayKey } from './quiz.js';

export const ING = { fruit: '橘子', branch: '樹枝', fish: '魚', oyster: '蚵', shellfish: '貝類', pea: '豌豆' };
export const SHELLFISH = ['oyster', 'limpet', 'periwinkle', 'chiton'];
export const EFFECT = { bells: ['💰', '導師「一起練習」「連續挑戰」答題鈴錢 +50%'], luck: ['🍀', '提高稀有魚、蟲的出現機率'], speed: ['👟', '走路變快'] };
const BUFF_MIN = 30;
const all = () => I.FOODS || [];
export const food = id => all().find(f => f.id === id);
export function known() { const s = S(); s.foods = s.foods || []; all().slice(0, 2).forEach(f => { if (!s.foods.includes(f.id)) s.foods.push(f.id); }); return s.foods; }
/** 現在擁有的食材數量 */
function have(k) {
  const s = S(), m = s.mats || {};
  if (k === 'fish') return s.pockets.filter(x => x && x.k === 'fish').length;
  if (k === 'shellfish') return s.pockets.filter(x => x && x.k === 'sea' && SHELLFISH.includes(x.id)).length;
  if (k === 'oyster') return s.pockets.filter(x => x && x.k === 'sea' && x.id === 'oyster').length;
  return m[k] || 0;
}
function take(k, n) {
  const s = S();
  if (k === 'fish' || k === 'shellfish' || k === 'oyster') { for (let i = 0; i < s.pockets.length && n > 0; i++) { const x = s.pockets[i]; if (x && (k === 'fish' ? x.k === 'fish' : k === 'oyster' ? x.k === 'sea' && x.id === 'oyster' : x.k === 'sea' && SHELLFISH.includes(x.id))) { s.pockets[i] = null; n--; } } return; }
  s.mats[k] -= n;
}
/* ---------- 效果 ---------- */
export function buff() { const b = S().buff; return b && b.until > Date.now() ? b : null; }
export const bellsMul = () => (buff() && buff().type === 'bells' ? 1.5 : 1);
export const lucky = () => !!(buff() && buff().type === 'luck');
export const speedMul = () => (buff() && buff().type === 'speed' ? 1.35 : 1);
export function eat(id) {
  const f = food(id); if (!f) return;
  S().buff = { type: f.effect, until: Date.now() + BUFF_MIN * 6e4, id }; save(); Audio.sfx('ok');
  ui.toast(`吃了${f.name}！${BUFF_MIN} 分鐘內${EFFECT[f.effect][1]}`);
}
export function hudText() { const b = buff(); if (!b) return ''; const m = Math.ceil((b.until - Date.now()) / 6e4); return `${EFFECT[b.type][0]} ${m} 分`; }

/* ---------- 晶晶的料理教室 ---------- */
export async function lesson(sp) {
  const s = S(), d = dayKey(), left = all().filter(f => !known().includes(f.id));
  if (!left.length) { await ui.say(sp, '食譜都教給你了，啵啵！之後就靠你自己發揮囉。'); return; }
  if (s.lessonDay === d) { await ui.say(sp, '今天的料理教室已經上完了，明天再來學新的食譜吧！'); return; }
  await ui.say(sp, '料理其實是一連串的化學反應喔！先答一題化學，答對就教你一道新菜。');
  const q = pickQ('chemistry', 3); if (!q) return;
  const i = await ui.ask(sp, q.q, q.o, { answer: q.a, abc: true, keys: true, html: true }), ok = i === q.a; record(q, ok);
  if (!ok) { Audio.sfx('bad'); await ui.explain(sp, q); await ui.say(sp, '沒關係，明天再來挑戰！'); s.lessonDay = d; save(); return; }
  const f = left[0]; known().push(f.id); s.lessonDay = d; save();
  await ui.card({ icon: icon(f.id, 'food'), title: `學會了食譜：${f.name}`, sub: `食材：${needText(f)}<br>效果：${EFFECT[f.effect][1]}<br><br>🧪 ${ui.esc(f.fact)}` });
  await challenge.keepGoing(sp, q);
}
const needText = f => Object.entries(f.need).map(([k, n]) => `${ING[k]} ×${n}`).join('、');

/* ---------- 做菜（工作台） ---------- */
export function openKitchen(paint) {
  const body = ui.el('div', 'diy');
  const draw = () => {
    const K = known();
    body.innerHTML = `<div class="diy-mats">${Object.keys(ING).map(k => `<span>${ING[k]} ${have(k)}</span>`).join('')}</div>`;
    const grid = ui.el('div', 'fs-grid');
    K.map(food).filter(Boolean).forEach(f => {
      const ok = Object.entries(f.need).every(([k, n]) => have(k) >= n), need = Object.entries(f.need).map(([k, n]) => `<i class="${have(k) >= n ? '' : 'lack'}">${ING[k]} ${have(k)}/${n}</i>`).join(' ');
      const b = ui.el('button', 'fs-item' + (ok ? '' : ' own'), `<img src="${icon(f.id, 'food')}" alt="" style="image-rendering:pixelated;width:64px;height:64px"><b>${ui.esc(f.name)}</b><small>${need}<br>${EFFECT[f.effect][0]} ${EFFECT[f.effect][1]}</small>`); b.type = 'button'; b.title = f.desc || '';
      b.onclick = () => {
        if (!ok) { ui.toast('食材不夠'); Audio.sfx('deny'); return; }
        const freed = (f.need.fish || 0) + (f.need.shellfish || 0) + (f.need.oyster || 0);
        if (!freed && !S().pockets.some(x => !x)) { ui.toast('口袋滿了'); Audio.sfx('deny'); return; }
        Object.entries(f.need).forEach(([k, n]) => take(k, n)); addItem({ k: 'food', id: f.id }); const s = S(); s.stats = s.stats || {}; s.stats.cook = (s.stats.cook || 0) + 1; save();
        Audio.sfx('place'); ui.toast(`做好了「${f.name}」！在口袋裡可以吃或送人`); paint && paint(); draw();
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
    body.appendChild(ui.el('p', 'muted', `已學會 ${K.length} / ${all().length} 道食譜，每天可以到晶晶的「料理教室」學一道。食材：橘子與樹枝（搖樹）、魚（釣魚）、蚵與其他貝類（潮池岩石上的蚵、笠螺、玉黍螺、石鱉）、豌豆（花園開花的豌豆可以採收）。`));
  };
  draw(); ui.panel('料理', body, { cls: 'shop-p' });
}
