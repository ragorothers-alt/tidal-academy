/* 潮汐小島 · 旅客與新島民：每天一位旅客住在露營地，提供一種學習風格的挑戰；通過 3 次可邀請搬到空地，成為島民。 */
import { invalidate as mmRedraw } from './minimap.js';
import { scene } from './engine.js';
import { groundAt } from './terrain.js';
import { SITES, plots, buildOnPlot } from './props.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, icon } from './state.js';
import { pick, dayKey } from './quiz.js';
import { drill, picker } from './drill.js';
import * as gifts from './gifts.js';

const TA = window.TA;
let ctx = null;
export const residents = [];   // 已搬來的旅客（島民物件）
export let camper = null;      // 今天在露營地的旅客
const st = () => { const s = S(); s.guests = s.guests || { met: {}, prog: {}, moved: {}, done: {} }; ['met', 'prog', 'moved', 'done'].forEach(k => { s.guests[k] = s.guests[k] || {}; }); return s.guests; };
const def = id => (I.GUESTS || []).find(g => g.id === id);
const spOf = v => ({ name: v.name, color: v.color, voice: v.voice || 400 });
const tail = v => (v.catch && Math.random() < 0.5 ? v.catch : '');

function makeNpc(g, home, range) {
  const v = Object.assign({}, g, { roomLayout: g.home, sid: 'guest:' + g.id, guest: true, color: g.shirt || '#ffb86b', sub: { name: '旅客', short: '旅', color: g.shirt || '#ffb86b' } });
  v.home = home.slice(); v.range = range; v.mesh = ctx.chibi(v); v.mesh.traverse(m => { m.frustumCulled = false; }); scene.add(v.mesh);
  v.mesh.position.set(home[0], groundAt(home[0], home[1]), home[1]); v.target = home.slice(); v.wait = 2;
  v.tag = ui.el('div', 'tag', `${ui.esc(v.name)}<small>${v.resident ? '新島民' : '旅客'}</small>`); v.tag.style.setProperty('--c', v.color); document.getElementById('labels').appendChild(v.tag);
  ctx.villagers.push(v);
  return v;
}
function buildHome(g, plotIndex) {
  const pl = plots[plotIndex]; if (!pl || pl.built) return null;
  const h = buildOnPlot(pl, g.shirt || '#ffb86b'); h.owner = 'guest:' + g.id; h.guest = g.id; mmRedraw();
  return h;
}
/** 啟動與每天：處理搬家、安排今天的旅客 */
export function init(c) {
  ctx = c; refresh();
}
export function refresh() {
  const G = st(), today = dayKey();
  // 已搬來（隔天才入住）
  Object.entries(G.moved).forEach(([id, m]) => {
    if (m.day === today || residents.some(r => r.id === id)) return;
    const g = def(id); if (!g) return;
    const h = buildHome(g, m.plot); if (!h) return;
    ctx.homes.push(h);
    const v = makeNpc(Object.assign({}, g, { resident: true }), h.door, 3); v.resident = true; v.houseDoor = h.door;
    residents.push(v);
  });
  // 今天的露營旅客
  if (camper) { scene.remove(camper.mesh); camper.tag.remove(); ctx.villagers.splice(ctx.villagers.indexOf(camper), 1); camper = null; }
  const pool = (I.GUESTS || []).filter(g => !G.moved[g.id]);
  if (SITES.camp && pool.length) {
    const r = [...today].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 3);
    camper = makeNpc(pool[r % pool.length], SITES.camp.spot, 1.6);
  }
}
const freePlot = () => plots.findIndex((p, i) => !p.built && !Object.values(st().moved).some(m => m.plot === i) && !Object.values(S().relocate || {}).some(m => m.plot === i));

/* ---------- 對話 ---------- */
export async function talk(v) {
  const G = st(), sp = spOf(v), L1 = v.lines || {}, id = v.id;
  if (!v.resident && !G.met[id]) { G.met[id] = dayKey(); save(); for (const l of (L1.arrive || ['你好，我是來旅行的。'])) await ui.say(sp, l + tail(v)); }
  else if (gifts.isBirthday(v)) await ui.say(sp, pick(((gifts.pref(v) || {}).lines || {}).birthday || ['今天是我的生日！']));
  else await ui.say(sp, pick(v.resident ? (L1.settled || L1.greet || ['你好！']) : (L1.greet || ['你好！'])) + tail(v));
  for (;;) {
    const doneToday = G.done[id] === dayKey(), prog = G.prog[id] || 0, f = v.focus || { mode: 'mixed', label: '跨科挑戰' };
    const opts = [];
    opts.push([doneToday ? `${f.label}（今天已挑戰）` : `${f.label}（5 題答對 4 題）`, 'ch']);
    if (!v.resident && prog >= 3 && !G.moved[id]) opts.push(['邀請你搬到島上', 'move']);
    if (gifts.isBirthday(v)) opts.unshift(['祝你生日快樂！', 'bday']);
    opts.push(['送禮物', 'gift'], ['聊聊天', 'chat'], ['再見', 'bye']);
    const i = await ui.ask(sp, v.resident ? '今天也一起讀書嗎？' : `你已經通過 ${Math.min(3, prog)} / 3 次挑戰。`, opts.map(o => o[0]));
    const k = opts[i] ? opts[i][1] : 'bye';
    if (k === 'bye') { await ui.say(sp, pick(['下次見！', '加油喔！', '明天也來找我吧。']) + tail(v)); return; }
    if (k === 'gift') { await gifts.give(v, sp); continue; }
    if (k === 'bday') { await gifts.celebrate(v, sp); continue; }
    if (k === 'chat') { await ui.say(sp, pick(L1.chat || ['今天海風很舒服。']) + tail(v)); continue; }
    if (k === 'move') {
      const pi = freePlot();
      if (pi < 0) { await ui.say(sp, '島上好像沒有空地了呢……謝謝你的心意！'); continue; }
      for (const l of (L1.movein || ['我很樂意搬來！'])) await ui.say(sp, l);
      G.moved[id] = { plot: pi, day: dayKey() }; save(); Audio.sfx('catch');
      await ui.card({ icon: icon('ticket', 'pkg'), title: `${v.name}決定搬來潮汐小島！`, sub: '明天就會在空地上蓋好房子。' });
      return;
    }
    if (k === 'ch') {
      if (doneToday) { await ui.say(sp, '今天的挑戰完成囉，明天再來吧！'); continue; }
      await ui.say(sp, pick(L1.challenge || ['開始吧！']));
      const r = await drill(sp, picker({ mode: f.mode === 'subject' ? 'subject' : f.mode, subject: f.subject || null }), 5, { praise: L1.pass });
      G.done[id] = dayKey();
      const pass = r.ok >= Math.min(4, r.n);
      if (pass) { G.prog[id] = prog + 1; S().bells += 800 + r.ok * 100; Audio.sfx('catch'); }
      save();
      await ui.say(sp, `${pass ? pick(L1.pass || ['太棒了！']) : pick(L1.fail || ['沒關係，明天再試。'])}（答對 ${r.ok} / ${r.n}${pass ? `，+${800 + r.ok * 100} 鈴錢` : ''}）`);
      if (pass && !v.resident && G.prog[id] === 3) await ui.say(sp, '你已經是我最好的讀書夥伴了。如果島上有空地……我想搬過來住。');
      ctx.paint();
    }
  }
}
/** 新島民的家（傍晚 18–20 點在家） */
export const atHome = (v, hour) => v.resident && hour >= 18 && hour < 20;
