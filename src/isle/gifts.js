/* 潮汐小島 · 送禮與生日：每位島民每天收一份禮物，依喜好反應；生日當天戴派對帽、禮物好感度加倍；也會替玩家慶生。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, find, itemName, itemIcon, KINDS } from './state.js';
import { pick, dayKey } from './quiz.js';
import * as miles from './miles.js';
import * as memo from './memo.js';
import * as bond from './bond.js';

let roomApi = null;
export function init(r) { roomApi = r; }
const key = v => (v.guest ? 'guest:' + v.id : v.sid);
export const pref = v => (I.BDAY || {})[key(v)] || null;
const md = d => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const isBirthday = (v, d) => { const p = pref(v); return !!p && p.date === md(d || new Date()); };
export const playerBirthday = d => { const b = S().birthday; return !!b && b === md(d || new Date()); };
export const fmtDate = s => (s ? `${+s.slice(0, 2)} 月 ${+s.slice(3)} 日` : '');

/** 禮物評分：3 最愛、2 喜歡、1 普通、0 不太喜歡 */
export function rate(v, g) {
  const p = pref(v); if (!p) return 1;
  const kind = g.type === 'furn' ? 'furn' : g.k, f = g.type === 'furn' ? roomApi.furn(g.id) : null;
  if ((p.likes.items || []).includes(g.id)) return 3;
  if ((p.dislikes.kinds || []).includes(kind) || (f && (p.dislikes.cats || []).includes(f.cat))) return 0;
  // 家具：有指定類別或主題時，只有符合的才算「喜歡」，避免所有家具都一樣討喜
  if (f) { const picky = (p.likes.cats || []).length || (p.likes.themes || []).length; if ((p.likes.cats || []).includes(f.cat) || (p.likes.themes || []).includes(f.theme)) return 2; return !picky && (p.likes.kinds || []).includes('furn') ? 2 : 1; }
  if ((p.likes.kinds || []).includes(kind)) return 2;
  return 1;
}
/** 從口袋（魚、蟲、已鑑定化石）與倉庫家具中選一份禮物 */
function choose() {
  return new Promise(res => {
    const s = S(), body = ui.el('div', 'gift-pick'), grid = ui.el('div', 'pk-grid');
    let picked = null;
    s.pockets.forEach((it, i) => {
      if (!it || (!KINDS[it.k] && it.k !== 'food')) return;
      const b = ui.el('button', 'pk-slot', `<img src="${itemIcon(it)}" alt="">`); b.type = 'button'; b.title = itemName(it);
      b.onclick = () => { picked = { type: 'pocket', i, k: it.k, id: it.id, name: itemName(it) }; done(); }; grid.appendChild(b);
    });
    Object.entries(s.storage || {}).forEach(([id, n]) => {
      const f = roomApi.furn(id); if (!f || n <= 0) return;
      const b = ui.el('button', 'pk-slot', `<img src="${roomApi.thumb(id)}" alt="">`); b.type = 'button'; b.title = f.name;
      b.onclick = () => { picked = { type: 'furn', id, k: 'furn', name: f.name }; done(); }; grid.appendChild(b);
    });
    if (!grid.children.length) body.appendChild(ui.el('p', 'muted', '口袋裡沒有能送的東西。釣魚、捉蟲、鑑定好的化石，或倉庫裡的家具都可以當禮物。'));
    body.append(ui.el('p', 'muted', '選一份禮物（口袋裡的生物與化石、倉庫裡的家具）'), grid);
    let closed = false; const done = () => { if (closed) return; closed = true; ui.closePanel(); res(picked); };
    ui.panel('送禮物', body, { cls: 'pocket', onClose: () => { if (!closed) { closed = true; res(null); } } });
  });
}
export const canGiftToday = v => (S().giftDay || {})[key(v)] !== dayKey();
export async function give(v, sp) {
  const s = S();
  if (!canGiftToday(v)) { await ui.say(sp, '今天已經收到你的禮物了，謝謝！明天再聊吧。'); return; }
  ui.closeDialog();
  const g = await choose(); if (!g) return;
  const r = rate(v, g), bday = isBirthday(v), L = (pref(v) || {}).lines || {};
  if (g.type === 'pocket') s.pockets[g.i] = null; else { s.storage[g.id]--; if (s.storage[g.id] <= 0) delete s.storage[g.id]; }
  const gain = [0, 1, 2, 3][r] * (bday ? 2 : 1);
  if (!v.guest) { bond.addFr(v, gain); bond.note(v, 'gift', { item: g.name || '' }); }
  s.giftDay = s.giftDay || {}; s.giftDay[key(v)] = dayKey();
  // 送的家具會被珍惜地擺進他家（最多留最近 5 件）
  if (g.type === 'furn' && !v.guest && r >= 1) { s.treasure = s.treasure || {}; const T = (s.treasure[v.sid] = (s.treasure[v.sid] || []).filter(x => x !== g.id)); T.push(g.id); if (T.length > 5) T.shift(); }
  s.stats = s.stats || {}; s.stats.gifts = (s.stats.gifts || 0) + 1; miles.add('gift'); if (bday) s.stats.bdayGifts = (s.stats.bdayGifts || 0) + 1;
  save();
  Audio.sfx(r >= 2 ? 'catch' : 'ok');
  ui.emote(v.mesh, r === 3 ? '💖' : r === 2 ? '♪' : r === 1 ? '😊' : '💧', '#ff7b9c');
  const line = r === 3 ? L.love : r === 2 ? L.like : r === 1 ? L.ok : L.meh;
  if (r === 3) memo.add(`${v.name}很喜歡我送的「${g.name}」`, '', { key: 'love:' + key(v) + ':' + (g.id || g.name), icon: '💝' });
  await ui.say(sp, `「${g.name}」！` + pick(line || ['謝謝你！']));
  if (bday) await ui.say(sp, pick(L.thanks || ['這是最棒的生日禮物！']));
  if (!v.guest && gain) await ui.say(null, `${v.name}的好感度 +${gain}${bday ? '（生日加倍）' : ''}`);
}
/** 生日祝福選項 */
export async function celebrate(v, sp) {
  const s = S(), k = 'bd:' + key(v) + ':' + new Date().getFullYear();
  s.bdayDone = s.bdayDone || {};
  const L = (pref(v) || {}).lines || {};
  if (s.bdayDone[k]) { await ui.say(sp, pick(L.party || ['謝謝你的祝福！'])); return; }
  s.bdayDone[k] = true; if (!v.guest) s.fr[v.sid] = Math.min(20, (s.fr[v.sid] || 0) + 1); s.bells += 500; save();
  Audio.sfx('catch'); ui.emote(v.mesh, '🎉', '#ffb84a'); memo.add(`替${v.name}慶生`, '生日快樂！', { key: k, icon: '🎂' });
  for (const l of (L.party || ['謝謝你記得我的生日！'])) await ui.say(sp, l);
  await ui.say(sp, '這是生日派對的回禮：500 鈴錢！要是有禮物……我也會很開心喔。');
}
/** 設定玩家生日 */
export function openBirthday(paint) {
  const s = S(), body = ui.el('div', 'ph-set', `<label>我的生日（月／日）<input type="date" value="${s.birthday ? '2026-' + s.birthday : ''}"></label><p class="muted">生日當天，島民會替你慶生。</p>`);
  const inp = body.querySelector('input');
  const b = ui.el('button', 'btn gold', '儲存'); b.type = 'button';
  b.onclick = () => { if (inp.value) { s.birthday = inp.value.slice(5); save(); ui.toast(`生日設定為 ${fmtDate(s.birthday)}`); paint && paint(); } ui.closePanel(); };
  body.appendChild(b); ui.panel('我的生日', body, { cls: 'phone' });
}
