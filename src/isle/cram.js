/* 潮汐小島 · 考前衝刺：學測倒數 30 天起，手機多一個「考前衝刺」：每天 5 題精選（錯題、到期複習、弱點單元優先）、
   考前準備清單，以及倒數天數。島民也會換成溫和的考前鼓勵。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { dayKey } from './quiz.js';
import { drill, picker } from './drill.js';

const TA = window.TA, L = TA.L;
export function daysLeft(d) { const exam = new Date((TA.S.profile && TA.S.profile.examDate) || '2027-01-22'); const a = new Date(dayKey()); return Math.round((exam - a) / 864e5); }
export const active = () => { const n = daysLeft(); return n >= 0 && n <= 30; };
const ok = id => !!L.Q[id];   // 題組與多選也會出（drill 用 askQ 作答，長題目換大題目面板）
/** 今天的 5 題：錯題 → 到期複習 → 弱點單元，各科輪流 */
export function picks() {
  const seen = new Set(), out = [];
  const add = ids => { for (const id of ids) { if (out.length >= 5) return; if (!seen.has(id) && ok(id)) { seen.add(id); out.push(id); } } };
  add(L.mistakes().sort(() => Math.random() - 0.5));
  add(L.dueList ? L.dueList() : []);
  L.weakUnits(5).forEach(w => add((L.BY_UNIT[w.id] || []).filter(id => !L.rec(id) || L.mastery(id) < 0.5).sort(() => Math.random() - 0.5).slice(0, 2)));
  add(L.ALL.filter(id => !L.rec(id)).sort(() => Math.random() - 0.5));
  add(L.ALL.slice().sort(() => Math.random() - 0.5));   // 不足五題時從其他題目補足
  return out;
}
const CHECK = [['sleep', '維持固定作息，預留充足睡眠'], ['mistake', '翻一次錯題本'], ['mock', '用模擬考練習時間分配'], ['rule', '確認考試規定、考場位置與攜帶物品'], ['rest', '留一點時間散步、放鬆']];
const data = () => { const s = S(), d = dayKey(); if (!s.cram || s.cram.d !== d) s.cram = { d, done: false, check: {} }; return s.cram; };
export function open(paint) {
  const n = daysLeft(), C = data(), body = ui.el('div', 'cram');
  const draw = () => {
    body.innerHTML = `<div class="cr-count"><b>${n > 0 ? 'D-' + n : n >= -2 ? '考試中' : '已考完'}</b><small>${n > 0 ? '距離學測' : n >= -2 ? '學測加油！' : '辛苦了'}</small></div>
      <p class="muted">每天 5 題考前精選：錯題、到期複習、弱點單元優先。${C.done ? '今天已完成 ✔' : ''}</p>`;
    const go = ui.el('button', 'btn gold', C.done ? '再練一輪' : '開始今天的 5 題'); go.type = 'button';
    go.onclick = async () => {
      ui.closePanel(); const ids = picks(); if (!ids.length) { ui.toast('目前沒有可以出的題目'); return; }
      const sp = { name: '考前衝刺', color: '#ef6f5e', voice: 300 };
      const res = await drill(sp, picker({ mode: 'ids', ids }), ids.length, {});
      const T = data(), full = res.n >= 5, first = full && !T.done; if (full) T.done = true; const s = S(); if (first) { s.bells += 800; s.stats = s.stats || {}; s.stats.cram = (s.stats.cram || 0) + 1; } save();
      await ui.say(sp, `答對 ${res.ok} / ${res.n} 題。${first ? '今天的精選完成，+800 鈴錢。' : full ? '' : '這一輪沒有做完五題，還不算完成。'}答錯的題目已加入複習，之後會優先安排。`); ui.closeDialog(); paint && paint();
    };
    body.appendChild(go);
    const list = ui.el('div', 'cr-check', '<h4>考前準備清單（每天重置）</h4>');
    CHECK.forEach(([k, t]) => { const b = ui.el('label', 'cr-item', `<input type="checkbox"${C.check[k] ? ' checked' : ''}> ${t}`); b.querySelector('input').onchange = e => { C.check[k] = e.target.checked; save(); Audio.sfx('pop'); }; list.appendChild(b); });
    body.appendChild(list);
    body.appendChild(ui.el('p', 'muted', '最後一個月，比起多讀新範圍，把會的題目練熟、維持作息更重要。'));
  };
  draw(); ui.panel('考前衝刺', body, { cls: 'phone' });
}
