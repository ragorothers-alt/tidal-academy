/* 潮汐小島 · 島民來家裡作客：在島上邀請熟識的導師，回家時他已經在房間裡。
   他會參觀房間（挑出喜歡的家具、發現自己送的禮物）、給 1–5 星評語，再陪你讀 3 題，最後道別回家。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import { pick, dayKey } from './quiz.js';
import { drill, picker } from './drill.js';
import * as gifts from './gifts.js';
import * as bond from './bond.js';
import * as memo from './memo.js';
import * as room from './room.js';

const FR_NEED = 6;
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const L3 = v => (I.LINES3 || {})[v.sid] || {};
const line = (v, k, d, o) => fill(pick(L3(v)[k] || d), o || {});
const today = () => { const s = S(); return s.homeVisit && s.homeVisit.day === dayKey() ? s.homeVisit : null; };
export const invitedToday = () => !!today();
export const canInvite = v => !v.shop && !v.guest && ((S().fr || {})[v.sid] || 0) >= FR_NEED && !today();
/** 今天要來作客、還沒回去的島民 sid */
export const pendingSid = () => { const t = today(); return t && !t.done ? t.sid : null; };

export async function invite(v, sp) {
  const s = S(); s.homeVisit = { sid: v.sid, day: dayKey(), done: false, talked: false }; save();
  Audio.sfx('ok'); ui.emote(v.mesh, '🏠', '#ffb84a');
  await ui.say(sp, line(v, 'invite', ['好啊！我等一下就過去，你先回家等我吧。']));
  return 'exit';
}
/** 房間評分：家具數量、類別多樣、壁紙地板、他喜歡的家具、他送的家具 */
export function review(v) {
  const r = room.room(), items = (r.items || []).map(it => room.furn(it.id)).filter(Boolean);
  const cats = new Set(items.map(f => f.cat)), liked = items.filter(f => gifts.rate(v, { type: 'furn', id: f.id, k: 'furn' }) >= 2);
  const mine = items.find(f => f.src === 'gift:' + v.sid);
  const cn = room.corners(r);   // 主題角落比堆數量重要（v7.1）
  const pts = Math.min(1, items.length / 16) * 0.3 + Math.min(1, cats.size / 7) * 0.2 + Math.min(1, cn.length / 2) * 0.2 + (r.wall ? 0.08 : 0) + (r.floor ? 0.07 : 0) + Math.min(1, liked.length / 2) * 0.15;
  const stars = pts < 0.2 ? 1 : pts < 0.4 ? 2 : pts < 0.6 ? 3 : pts < 0.8 ? 4 : 5;
  return { stars, liked: liked.length ? pick(liked) : null, mine, n: items.length, corner: cn.length ? pick(cn) : null };
}
/** 在自己家裡和來作客的島民說話：第一次走完整流程，回傳 'leave' 表示他回家了 */
export async function talk(v, sp) {
  const t = today(), s = S(); if (!t || t.done) return null;
  if (t.talked) {
    const i = await ui.ask(sp, '今天謝謝你招待我！', ['再聊一下', '送他回家']);
    if (i === 1) return bye(v, sp, t);
    return null;
  }
  t.talked = true; save();
  await ui.say(sp, line(v, 'arrive', ['打擾了！這就是你的家呀。']));
  const r = review(v);
  if (r.stars === 5) memo.add(`${v.name}給我的房間打了五顆星`, '這是一個很棒的房間！', { key: 'review5:' + v.sid, icon: '🏠' });
  if (r.mine) { ui.emote(v.mesh, '💖', '#ff7b9c'); await ui.say(sp, line(v, 'mine', ['啊，你把我送的{item}擺出來了！好開心。'], { item: r.mine.name })); }
  else if (r.liked) { ui.emote(v.mesh, '♪', '#ff7b9c'); await ui.say(sp, line(v, 'love', ['我很喜歡這個{item}！'], { item: r.liked.name })); }
  if (r.corner) { const C = { study: '這個讀書角好棒，坐在這裡應該很能專心。', tea: '這個茶點角好溫馨，好想在這裡喝杯茶。', exhibit: '你把收藏擺得像小小的展覽，好有心。', green: '這一角好多植物，空氣都變清新了。', sleep: '這個角落看起來睡得好舒服。' }; await ui.say(sp, C[r.corner.id] || `我喜歡你的${r.corner.name}。`); }   // 主題角落（room.corners）
  await ui.say(sp, line(v, 'r' + r.stars, ['謝謝你讓我參觀。']));
  await ui.card({ icon: '', title: `${v.name}的房間評價：${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}`, sub: `家具 ${r.n} 件${r.corner ? ` · ${r.corner.name}` : ''}${r.stars < 5 ? '<br>把幾件家具湊成一個角落（例如書桌、椅子和燈＝讀書角）、換上壁紙地板，或放他喜歡的東西，評價會更高' : '<br>這是一個很棒的房間！'}` });
  ui.closeDialog();
  await ui.say(sp, line(v, 'study', ['既然來了，我們一起讀幾題吧！']));
  const i = await ui.ask(sp, '一起讀 3 題嗎？', ['好啊！', '今天先聊天就好']);
  let gain = 1;
  if (i === 0) {
    const res = await drill(sp, picker({ subject: v.sid }), 3, {});
    await ui.say(sp, line(v, res.ok >= 2 ? 'studyGood' : 'studyOk', [res.ok >= 2 ? '你好厲害！' : '慢慢來，我們下次再一起讀。']));
    const b = 200 + res.ok * 200; s.bells += b; gain += res.ok >= 2 ? 2 : 1;
    await ui.say(null, `作客讀書會：答對 ${res.ok} / ${res.n} 題，得到 ${b} 鈴錢`);
  }
  bond.addFr(v, gain); s.stats = s.stats || {}; s.stats.homeVisits = (s.stats.homeVisits || 0) + 1; save();   // v8.6 好感到上限後多出來的也變成共同回憶
  await ui.say(null, `${v.name}的好感度 +${gain}`);
  return bye(v, sp, t);
}
async function bye(v, sp, t) {
  await ui.say(sp, line(v, 'bye', ['我該回家了，謝謝你的招待！']));
  t.done = true; save(); Audio.sfx('open');
  return 'leave';
}
