/* 潮汐小島 · 夢境複習：在自己家裡睡一覺（床鋪或手機），夢裡會浮現錯題本的題目（最多 5 題）。
   答題記入間隔複習：錯題要在不同天答對 3 次（隔天、再隔兩天）才會離開錯題本。每天第一場有答對的夢有鈴錢。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, dayKey } from './state.js';
import { drill, picker } from './drill.js';

const TA = window.TA, L = TA.L;
const usable = id => !!L.Q[id];   // 題組（閱讀材料）與多選題也會出：drill 用 askQ 作答，長題目換大題目面板
export const count = () => L.mistakes().filter(usable).length;
let busy = false;
function veil(on) {
  let v = document.getElementById('dreamVeil');
  if (on && !v) { v = document.createElement('div'); v.id = 'dreamVeil'; v.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>'; document.body.appendChild(v); requestAnimationFrame(() => v.classList.add('on')); }
  if (!on && v) { v.classList.remove('on'); setTimeout(() => v.remove(), 600); }
}
/** 睡覺做夢；回傳 Promise，結束後才可以再操作 */
export async function sleep(paint) {
  if (busy) return; busy = true;
  try {
    const h = new Date().getHours(), night = h >= 21 || h < 5, sp = { name: '夢境', color: '#9a8ad8', voice: 260 };
    const all = L.mistakes().filter(usable), ids = all.filter(id => !L.cooling(id)).sort(() => Math.random() - 0.5).slice(0, 5);
    veil(true); Audio.sfx('open');
    if (!ids.length && all.length) { await ui.say(sp, `${night ? '你沉沉睡去' : '你打了個小盹'}……剛答錯的題目還在腦中打轉，夢裡一片模糊。過一陣子再睡，那些題目才會清楚地浮現（隔一段時間再複習，記得更牢）。`); return; }
    if (!ids.length) { await ui.say(sp, `${night ? '你沉沉睡去' : '你打了個小盹'}……一夜無夢。錯題本是空的，睡得很安穩。`); return; }
    await ui.say(sp, `${night ? '你躺下來，很快就睡著了' : '你打了個小盹'}……夢裡，之前答錯的題目一題一題漂了過來。`);
    const res = await drill(sp, picker({ mode: 'ids', ids }), ids.length, {});
    const s = S(), d = dayKey(), first = s.dreamDay !== d && res.ok > 0, b = first ? res.ok * 150 : 0;
    if (first) { s.dreamDay = d; s.bells += b; } s.stats = s.stats || {}; s.stats.dream = (s.stats.dream || 0) + res.ok; save();
    await ui.say(sp, `醒來了。夢裡答對 ${res.ok} / ${res.n} 題${first ? `，神清氣爽（+${b} 鈴錢）` : ''}。錯題要在不同天答對 3 次才會離開錯題本（同一天重複答對只算一次），現在還剩 ${count()} 題。`);
  } finally { ui.closeDialog(); veil(false); busy = false; paint && paint(); }
}
