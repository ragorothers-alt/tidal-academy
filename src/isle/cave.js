/* 潮汐小島 · 潮洞（v9.1）：北海岸東端的岩石裡有一個海蝕洞，只有退潮時走得進去（洞裡是 data/interiors_tidecave.js，Codex 製作）。
   洞裡有五樣東西，每天各一次：岩層壁（地科：海蝕洞、海蝕柱怎麼形成）、發光潮池（遇到一種海洋生物，答生物題帶回）、
   水晶礦脈（敲出未鑑定的礦石，給岳鑑定）、沙中化石（挖出未鑑定的化石，給史遙鑑定）、舊木箱（一筆鈴錢）。
   潮水漲回來時會提醒你出洞，再不走就被浪推出去。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, addItem, icon, stars, list, photoOnly } from './state.js';
import { pickQU, pickQ, record, fairSec, dayKey } from './quiz.js';
import * as tide from './tide.js';
import * as miles from './miles.js';
import * as memo from './memo.js';
import * as challenge from './challenge.js';

const CAVE = { name: '潮洞', color: '#4f7f8f', voice: 420 };
let ctx = null, inside = false, checkT = 0, rising = 0;
export function init(c) { ctx = c; }
/** 洞口露出來了嗎（和潮池一樣，乾潮前後才走得進去） */
export const open = () => tide.state().low;
const today = () => { const s = S(); if (!s.cave || s.cave.d !== dayKey()) s.cave = { d: dayKey(), done: {} }; return s.cave; };
/** 進洞、出洞（main.js 的 enterPublic 前後呼叫） */
export function entered() { inside = true; checkT = 0; rising = 0; const s = S(); if (!s.caveFirst) { s.caveFirst = Date.now(); save(); memo.add('走進了北海岸的潮洞', '退潮的時候，海蝕洞的洞口露了出來。洞裡很涼，潮池裡有藍色的光。', { key: 'cave:first', icon: '🕳' }); } }
export function left() { inside = false; }
/** 在洞裡的每一格：潮水漲回來了就提醒，30 秒後被浪推出洞 */
export function tick(dt) {
  if (!inside || (checkT += dt) < 1) return; checkT = 0;
  if (open()) { rising = 0; return; }
  rising++;
  if (rising === 1) ui.toast('潮水開始漲回來了，洞口快淹到了，趕快出去吧！');
  if (rising >= 30 && !busy) { ui.toast('嘩——浪衝進洞裡，把你推回了沙灘上'); Audio.sfx('splash'); ctx.leave(); }   // 正在答題、看卡片時等它做完再推
}
async function quiz(units, sid, lead) {
  const q = pickQU(units, 3) || pickQ(sid, 3); if (!q) { await ui.say(CAVE, '今天的題目都答過了，明天再來吧！'); return null; }
  const i = await ui.ask(CAVE, lead + q.q, q.o, { answer: q.a, abc: true, keys: true, html: true, timer: fairSec(25, q) }), ok = i === q.a; record(q, ok); ui.closeDialog();
  if (!ok) { Audio.sfx('bad'); await ui.explain(CAVE, q, '答錯了也沒關係，明天退潮再來試試。'); return false; }
  Audio.sfx('ok'); return q;
}
const W = [0, 10, 6, 3, 1.2, 0.4];
/** 發光潮池裡的生物：淺灘與珊瑚礁、可以帶回的，還沒登錄的優先 */
function poolCreature() {
  const s = S(), pool = list('marine').filter(x => (x.where === 'shallow' || x.where === 'reef') && !photoOnly('marine', x));
  const fresh = pool.filter(x => !s.dex.marine[x.id]), L = fresh.length ? fresh : pool; if (!L.length) return null;
  let r = Math.random() * L.reduce((a, x) => a + W[x.rarity], 0); for (const x of L) { r -= W[x.rarity]; if (r <= 0) return x; } return L[0];
}
/** 洞裡的五個互動點（house.js 的 hook:cave，topic 是哪一樣）；hook 自己管對話框，做完一定關掉 */
let busy = false;
export async function act(topic) {
  if (busy) return; busy = true;
  try { await explore(topic); } finally { busy = false; ui.closeDialog(); }
}
async function explore(topic) {
  const d = today(), done = d.done[topic], s = S();
  if (topic === 'wall') {
    await ui.say(CAVE, '岩壁上一層一層的條紋是不同時期堆積的岩層。海浪一次次拍打，沿著節理和比較軟的地層慢慢掏空，就成了海蝕洞——這叫差異侵蝕。');
    await ui.say(CAVE, '洞外海裡孤零零的石柱是海蝕柱，被浪打穿的叫海蝕拱；它們以前都和海岸連在一起。');
    if (done) return;
    const q = await quiz(['es-rock', 'es-solid'], 'earth', '岩層壁：'); if (q === null) return; d.done.wall = 1; save(); if (!q) return;
    s.bells += 300; save(); miles.add('cave'); await ui.praise(CAVE, '答對了！你在岩壁上的苔蘚縫裡找到 300 鈴錢（大概是哪位遊客掉的）。', q); await challenge.keepGoing(CAVE, q); return;
  }
  if (topic === 'pool') {
    if (done) { await ui.say(CAVE, '潮池裡的藍光還在一閃一閃。今天的生物已經游走了，明天退潮再來看看。'); return; }
    const sp = poolCreature(); if (!sp) return;
    await ui.say(CAVE, '潮池的水裡閃著藍光——是會發光的浮游生物。光裡好像有什麼在動……');
    const q = await quiz(['bi-eco', 'bi-evo'], 'biology', `${s.dex.marine[sp.id] ? sp.name : '有東西'}在潮池裡！`); if (q === null) return; d.done.pool = 1; save(); if (!q) return;
    const first = !s.dex.marine[sp.id]; s.dex.marine[sp.id] = s.dex.marine[sp.id] || Date.now(); const room = addItem({ k: 'marine', id: sp.id }); save(); miles.add('marine');
    const line = ((I.MARINE_LINES || {}).catch || {})[sp.id] || '';
    await ui.card({ pocket: room, rare: sp.rarity >= 4, icon: icon(sp.id, 'marine'), title: `找到了${sp.name}！`, sub: line, extra: `<span class="stars">${stars(sp.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}${room ? '' : '<em>口袋滿了，只好放回潮池。</em>'}<small class="dv-fact">${ui.esc(sp.fact || '')}</small>` });
    await challenge.keepGoing(CAVE, q); return;
  }
  if (topic === 'vein' || topic === 'fossil') {
    const vein = topic === 'vein';
    if (done) { await ui.say(CAVE, vein ? '礦脈今天已經敲過了，敲太多會把洞壁弄壞喔。' : '沙裡的化石今天已經挖過了。'); return; }
    if (!s.pockets.some(x => !x)) { ui.toast('口袋滿了，先整理口袋再來', 'bad'); Audio.sfx('deny'); return; }
    const q = await quiz(['es-rock', 'es-solid'], 'earth', vein ? '水晶礦脈：' : '沙中化石：'); if (q === null) return; d.done[topic] = 1; save(); if (!q) return;
    addItem(vein ? { k: 'ore', id: 'ore_unknown' } : { k: 'unk', id: 'fossil_unknown' }); save(); miles.add(vein ? 'cave' : 'fossil'); Audio.sfx('catch');
    await ui.card({ pocket: true, icon: icon(vein ? 'ore_unknown' : 'fossil_unknown', 'unk'), title: vein ? '敲下一塊礦石！' : '挖出一塊化石！', sub: vein ? '拿去給岳鑑定吧。' : '拿去給史遙鑑定吧。', extra: '' });
    await challenge.keepGoing(CAVE, q); return;
  }
  if (topic === 'chest') {
    if (done) { await ui.say(CAVE, '木箱空空的。明天退潮時，浪也許又會沖進一點東西來。'); return; }
    const n = 500 + Math.floor(Math.random() * 6) * 100; d.done.chest = 1; s.bells += n; save(); Audio.sfx('coin');
    await ui.say(CAVE, `舊木箱裡有被浪沖進來的漂流物，還有 ${n.toLocaleString()} 鈴錢！`);
    if (!s.caveChest) { s.caveChest = 1; save(); memo.add('潮洞裡的舊木箱', `打開了潮洞裡的舊木箱，裡面有 ${n.toLocaleString()} 鈴錢。`, { key: 'cave:chest', icon: '🧰' }); }
  }
}
