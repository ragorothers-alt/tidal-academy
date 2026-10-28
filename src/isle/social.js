/* 潮汐小島 · 島民委託與來信：每天 3 個委託（釣魚、捉蟲、化石、特訓、送包裹）；信箱收到島民來信，內容是你最近答錯單元的潮汐筆記。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, available, find, list, icon, addItem, itemName, fmtHours, whereName } from './state.js';
import { pickQ, record, pick, dayKey } from './quiz.js';
import { drill, picker } from './drill.js';
import * as miles from './miles.js';
import * as ledger from './ledger.js';
import * as bond from './bond.js';

const TA = window.TA, L = TA.L;
let VS = [];  // 島民（不含店長）
let hooks = {};
export function init(villagers, h) { VS = villagers.filter(v => !v.shop); hooks = h || {}; }
const lines = sid => (I.LINES && I.LINES[sid]) || {};
const fill = (s, o) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const vOf = sid => VS.find(v => v.sid === sid);

/* ================= 委託 ================= */
const TYPES = [['fish', 3], ['bug', 3], ['fossil', 1.5], ['quiz', 3], ['deliver', 2]];
function rollType() { let r = Math.random() * TYPES.reduce((a, t) => a + t[1], 0); for (const [t, w] of TYPES) { r -= w; if (r <= 0) return t; } return 'quiz'; }
/** 委託目標：這個月有、今天稍後（至少還有一小時）還會出現的物種；雨天限定的不派（天氣說不準） */
function todayPool(k) {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  return list(k).filter(sp => sp.rarity <= 3 && (!sp.months || sp.months.includes(d.getMonth() + 1)) && sp.weather !== 'rain' && (!sp.hours || sp.hours.some(([, b]) => b > h + 1)));
}
export function newDay() {
  const s = S();
  // 已經接下的委託留到完成為止：送貨要包裹還在口袋裡（跨過午夜送到也拿得到謝禮），釣魚／捉蟲要目標這個月還會出現
  const m = new Date().getMonth() + 1, still = r => { const sp = find(r.type, r.target); return !!sp && (!sp.months || sp.months.includes(m)); };
  const keep = (s.reqs || []).filter(r => r.accepted && !r.done && (r.type === 'deliver' ? s.pockets.some(x => x && x.k === 'pkg' && x.from === r.sid && x.to === r.target) : r.type === 'fish' || r.type === 'bug' ? still(r) : r.type === 'fossil'));
  s.reqs = keep.slice();
  // 第一個委託來自學習弱點：正確率最低（或還沒碰過）的單元，由該科導師提出
  const weak = L.weakUnits(12).find(w => vOf(w.subject.id) && L.inTrack(w.subject.id) && !keep.some(r => r.sid === w.subject.id) && (L.BY_UNIT[w.id] || []).length >= 4);
  if (weak) s.reqs.push({ sid: weak.subject.id, type: 'weak', target: weak.id, accepted: false, done: false, acc: weak.st.attempts ? Math.round(weak.st.acc * 100) : null });
  const who = VS.filter(v => (!weak || v.sid !== weak.subject.id) && !keep.some(r => r.sid === v.sid)).sort(() => Math.random() - 0.5).slice(0, Math.max(1, 3 - s.reqs.length));   // 一天約 3 個（留下來的也算），至少有 1 個新的
  who.forEach(v => {
    let type = rollType(), target = null;
    if (type === 'fish' || type === 'bug') { const pool = todayPool(type); if (pool.length) target = pick(pool).id; else type = 'quiz'; }
    if (type === 'deliver') { const others = VS.filter(o => o !== v); target = pick(others).sid; }
    s.reqs.push({ sid: v.sid, type, target, accepted: false, done: false });
  });
  makeLetters();
  save();
}
export const reqOf = sid => (S().reqs || []).find(r => r.sid === sid && !r.done);
const targetName = r => r.type === 'weak' ? ((L.UNITS[r.target] || {}).name || '') : r.type === 'fish' || r.type === 'bug' ? (find(r.type, r.target) || {}).name || '' : r.type === 'deliver' ? (vOf(r.target) || {}).name || '' : '';
export function badge(v) { const r = reqOf(v.sid); return r && !r.accepted ? '！' : ''; }
export function reqText(r) {
  const v = vOf(r.sid), n = targetName(r);
  if (r.type === 'weak') return r.acc != null ? `陪${v.name}複習「${n}」（你的弱點單元，正確率 ${r.acc}%）` : `和${v.name}一起認識「${n}」（還沒練過的單元）`;   // v8.2 沒作答紀錄時不說是弱點
  const sp = (r.type === 'fish' || r.type === 'bug') && find(r.type, r.target), at = sp ? `（${whereName(r.type, sp)}，${fmtHours(sp)}）` : '';
  if (r.type === 'fish') return `幫${v.name}釣一條「${n}」${at}`;
  if (r.type === 'bug') return `幫${v.name}抓一隻「${n}」${at}`;
  if (r.type === 'fossil') return `帶一件鑑定過的化石給${v.name}`;
  if (r.type === 'quiz') return `和${v.name}做 3 題連答特訓`;
  if (r.type === 'deliver') return `把${v.name}的筆記本送給${n}`;
  return '';
}
const has = (k, id) => S().pockets.findIndex(x => x && x.k === k && (!id || x.id === id));

/** 島民對話選單的額外選項：[標籤, async 處理函式] */
export function menu(v, sp) {
  const s = S(), out = [], r = reqOf(v.sid);
  if (r && !r.accepted) out.push(['有什麼需要幫忙的嗎？', async () => {
    const L1 = lines(v.sid).req || {}, n = targetName(r);
    if (r.type === 'weak') { await weakReq(v, sp, r); return; }
    await ui.say(sp, fill(pick(L1[r.type] || ['可以幫我一個忙嗎？']), r.type === 'deliver' ? { to: n, item: '筆記本' } : { item: n }));
    const i = await ui.ask(sp, reqText(r) + '。可以嗎？', ['交給我吧！', '下次再說']);
    if (i !== 0) return;
    r.accepted = true; miles.ping('accept');   // 任務欄：新手引導「接一個委託」
    if (r.type === 'deliver') { if (!addItem({ k: 'pkg', id: 'pkg', to: r.target, from: v.sid })) { r.accepted = false; await ui.say(sp, '你的口袋滿了呢，整理一下再來找我吧。'); return; } }
    save(); Audio.sfx('pop');
    if (r.type === 'quiz') await doQuiz(v, sp, r);
    else await ui.say(sp, '謝謝你！完成了再來找我。');
  }]);
  if (r && r.accepted && r.type === 'quiz') out.push(['開始特訓', () => doQuiz(v, sp, r)]);
  if (r && r.accepted && r.type === 'weak') out.push([`再挑戰「${targetName(r)}」`, () => weakRun(v, sp, r)]);
  if (r && r.accepted && (r.type === 'fish' || r.type === 'bug') && has(r.type, r.target) >= 0) out.push([`交出${targetName(r)}`, () => complete(v, sp, r, has(r.type, r.target))]);
  if (r && r.accepted && r.type === 'fossil' && has('fossil') >= 0) out.push([`交出化石（${itemName(s.pockets[has('fossil')])}）`, () => complete(v, sp, r, has('fossil'))]);
  // 收包裹
  const pk = s.pockets.findIndex(x => x && x.k === 'pkg' && x.to === v.sid);
  if (pk >= 0) out.push(['交付包裹', async () => {
    const it = s.pockets[pk], from = (s.reqs || []).find(q => q.type === 'deliver' && q.sid === it.from && q.target === v.sid && !q.done);
    s.pockets[pk] = null; save(); Audio.sfx('ok');
    await ui.say(sp, `這是${(vOf(it.from) || {}).name || '朋友'}給我的？謝謝你特地送來！`);
    if (from) await complete(vOf(from.sid), { name: vOf(from.sid).name, color: vOf(from.sid).color, voice: vOf(from.sid).voice }, from, -1, true);
    else { s.bells += 500; save(); Audio.sfx('coin'); await ui.say(sp, '這是一點謝禮，辛苦你跑一趟了！（500 鈴錢）'); }   // 找不到原本的委託（舊存檔）：收件人也給謝禮，包裹不會白送
  }]);
  return out;
}
async function weakReq(v, sp, r) {
  const W = ((I.LINES2 || {})[v.sid] || {}).weak, n = targetName(r);
  await ui.say(sp, fill(pick(W || ['我最近在整理「{unit}」，可以陪我練幾題嗎？']), { unit: n }));
  const i = await ui.ask(sp, reqText(r) + '。4 題答對 3 題就完成。', ['好，一起練！', '下次再說']);
  if (i !== 0) return;
  r.accepted = true; miles.ping('accept'); save(); await weakRun(v, sp, r);
}
async function weakRun(v, sp, r) {
  const ids = L.BY_UNIT[r.target] || [], res = await drill(sp, picker({ mode: 'ids', ids }), 4, {});
  if (res.ok >= 3) {
    const D = ((I.LINES2 || {})[v.sid] || {}).weakDone; await ui.say(sp, pick(D || ['謝謝你陪我練習！']));
    const u = L.UNITS[r.target], note = u && pick(u.notes || []);
    if (note) await ui.card({ icon: '', title: `「${u.name}」的重點`, sub: `<b>${note.t}</b><br>${note.b}` });
    await complete(v, sp, r, -1, false, 1500);
  } else await ui.say(sp, `答對 ${res.ok} / ${res.n} 題，差一點！這個單元的筆記在圖書館可以讀，讀完再來找我。`);
}
async function doQuiz(v, sp, r) {
  let ok = 0;
  for (let k = 0; k < 3; k++) {
    const q = pickQ(v.sid); if (!q) break;
    const i = await ui.ask(sp, `第 ${k + 1} 題：` + q.q, q.o, { answer: q.a, abc: true, html: true, keys: true });
    const good = i === q.a; record(q, good); Audio.sfx(good ? 'ok' : 'bad'); if (good) ok++;
    if (!good) await ui.explain(sp, q);
  }
  if (ok >= 2) await complete(v, sp, r, -1);
  else await ui.say(sp, `答對 ${ok} 題，差一點點！讀一下筆記，等等再來挑戰。`);
}
async function complete(v, sp, r, slot, remote, bonus) {
  miles.add('req');
  const s = S();
  if (slot >= 0) s.pockets[slot] = null;
  r.done = true;
  const bells = bonus || 800 + Math.floor(Math.random() * 8) * 100; ledger.mark('request'); s.bells += bells;
  bond.addFr(v, 2); bond.note(v, 'req'); s.stats = s.stats || {}; s.stats.reqs = (s.stats.reqs || 0) + 1; save();
  if (!remote) await ui.say(sp, pick((lines(v.sid).req || {}).thanks || ['謝謝你！']));
  else hooks.toast && hooks.toast(`${v.name}的委託完成了！`);
  await ui.card({ icon: icon('bells', 'bells'), title: `委託完成：${bells} 鈴錢`, sub: `${v.name}的好感度提升了` });
  hooks.paint && hooks.paint();
}
export function phoneList() {
  const s = S(), body = ui.el('div', 'ph-list');
  (s.reqs || []).forEach(r => { const v = vOf(r.sid); if (!v) return; body.appendChild(ui.el('div', 'ph-row', `<span class="av" style="--c:${v.color}">${r.done ? '✓' : r.accepted ? '…' : '！'}</span><div><b>${ui.esc(reqText(r))}</b><small>${r.done ? '已完成' : r.accepted ? '進行中' : '去找' + ui.esc(v.name) + '聊聊'}</small></div>`)); });
  if (!body.children.length) body.appendChild(ui.el('p', 'muted', '今天沒有委託。'));
  ui.panel('今日委託', body, { cls: 'phone' });
}

/* ================= 信箱 ================= */
function noteFor(sid) {
  const ids = L.mistakes(sid);
  const pickUnit = ids.length ? L.UNITS[L.Q[pick(ids)].unit] : pick(TA.DATA.units[sid] || []);
  if (!pickUnit || !(pickUnit.notes || []).length) return null;
  return { unit: pickUnit, note: pick(pickUnit.notes), fromMistake: !!ids.length };
}
function makeLetters() {
  const s = S(); s.mail = s.mail || [];
  // v8.2 一封來自錯題最多的那科（有錯題時），另一封輪流：最久沒寫信的導師先寫（以前同分時永遠是墨言和 Lexi）
  s.mailLast = s.mailLast || {};
  const subj = VS.map(v => ({ v, m: L.mistakes(v.sid).length })).sort((a, b) => b.m - a.m);
  const weak = subj[0] && subj[0].m > 0 ? subj[0].v : null;
  const rest = VS.filter(v => v !== weak).map(v => ({ v, r: Math.random() })).sort((a, b) => (s.mailLast[a.v.sid] || 0) - (s.mailLast[b.v.sid] || 0) || a.r - b.r).map(x => x.v);
  const writers = (weak ? [weak, rest[0]] : rest.slice(0, 2)).filter(Boolean);
  writers.forEach((v, k) => {
    s.mailLast[v.sid] = Date.now();
    const n = noteFor(v.sid); if (!n) return;
    const L1 = lines(v.sid).letter || {};
    const gift = (s.fr[v.sid] || 0) >= 6 && Math.random() < 0.5 ? { type: 'bells', n: 300 + Math.floor(Math.random() * 5) * 100 } : null;
    s.mail.unshift({
      id: Date.now() + '-' + k, from: v.sid, date: dayKey(), read: false, gift,
      title: `${v.name}的來信：${n.unit.name}`,
      open: pick(L1.open || ['你好：']), bridge: fill(pick(L1.bridge || ['我整理了一則「{unit}」的重點給你。']), { unit: n.unit.name }),
      note: { t: n.note.t, b: n.note.b }, close: pick(L1.close || ['—— ' + v.name]),
      giftLine: gift ? fill(pick(L1.gift || ['隨信附上一點心意：{item}。']), { item: `${gift.n} 鈴錢` }) : ''
    });
  });
  trimMail(s);
}
/** 信裡的禮物：第一次讀信時收下（鈴錢、家具） */
function claimGift(s, m) {
  if (!m.gift || m.gotGift) return; m.gotGift = true;
  if (m.gift.type === 'bells') s.bells += m.gift.n;
  if (m.gift.type === 'furn' && hooks.giveFurn) hooks.giveFurn(m.gift.id);
}
/** v8.2 信箱最多 30 封：先丟最舊的已讀信；非丟未讀的不可時，附的禮物先替你收下（一次性的活動家具不會跟著信消失） */
function trimMail(s) {
  let auto = 0;
  while (s.mail.length > 30) {
    let i = -1; for (let j = s.mail.length - 1; j >= 0; j--) if (s.mail[j].read && !s.mail[j].keep) { i = j; break; }   // v8.5 收藏的信不丟
    if (i < 0) for (let j = s.mail.length - 1; j >= 0; j--) if (!s.mail[j].keep) { i = j; break; }
    if (i < 0) i = s.mail.length - 1;
    const [m] = s.mail.splice(i, 1);
    if (!m.read && m.gift && !m.gotGift) { claimGift(s, m); auto++; }
  }
  if (auto) setTimeout(() => ui.toast(`信箱滿了：${auto} 封沒拆的信裡的禮物先替你收下了`), 800);
}
export function sendLetter(m) { const s = S(); s.mail = s.mail || []; s.mail.unshift(Object.assign({ id: Date.now() + '-' + Math.random(), date: dayKey(), read: false }, m)); trimMail(s); save(); }
export const unread = () => (S().mail || []).filter(m => !m.read).length;
export function openMail() {
  miles.ping('mail');   // 任務欄：新手引導「看看信箱」
  const s = S(), body = ui.el('div', 'ph-list');
  (s.mail || []).forEach(m => {
    const v = vOf(m.from) || { name: m.fromName || '潮汐小島', color: '#ffb86b', sub: { short: '✉' } };
    const row = ui.el('button', 'ph-row mail' + (m.read ? '' : ' new'), `<span class="av" style="--c:${v.color}">${m.keep ? '⭐' : m.read ? '✉' : '!'}</span><div><b>${ui.esc(m.title)}</b><small>${m.date}${m.gift ? ' · 附禮物' : ''}</small></div>`);
    row.type = 'button'; row.onclick = () => readLetter(m); body.appendChild(row);
  });
  if (!body.children.length) body.appendChild(ui.el('p', 'muted', '信箱是空的。明天再來看看吧！'));
  ui.panel('信箱', body, { cls: 'phone' });
}
function readLetter(m) {
  const s = S(), first = !m.read; m.read = true;
  if (first) claimGift(s, m);
  if (first && m.note) { L.gain(5, 1); }
  save(); hooks.paint && hooks.paint(); Audio.sfx('open');
  const body = ui.el('div', 'letter', `
    <p>${ui.esc(m.open || '')}</p>${m.bridge ? `<p>${ui.esc(m.bridge)}</p>` : ''}
    ${m.note ? `<div class="letter-note"><b>${ui.rich(m.note.t)}</b><div>${ui.rich(m.note.b)}</div></div>` : ''}
    ${m.text ? `<p>${ui.esc(m.text)}</p>` : ''}
    ${m.giftLine ? `<p class="gift">🎁 ${ui.esc(m.giftLine)}</p>` : ''}
    <p class="sign">${ui.esc(m.close || '')}</p>`);
  const acts = ui.el('div', 'letter-actions'); body.appendChild(acts);   // v8.7 以前信件按鈕緊貼，現在用獨立操作列保留間距
  const back = ui.el('button', 'btn', '← 回信箱'); back.type = 'button'; back.onclick = openMail; acts.appendChild(back);
  const kept = (s.mail || []).filter(x => x.keep).length, kp = ui.el('button', 'btn ghost', m.keep ? '⭐ 已收藏（點一下取消）' : `☆ 收藏這封（${kept} / 5）`); kp.type = 'button';   // v8.5 重要的信可以收藏，信箱滿了也不會被丟掉
  kp.onclick = () => { if (!m.keep && kept >= 5) { ui.toast('最多收藏 5 封：先取消一封'); return; } m.keep = !m.keep; save(); Audio.sfx('tick'); readLetter(m); };
  acts.appendChild(kp);   // v8.7 以前收藏鈕緊接正文，現在和返回鈕共用可換行操作列
  ui.panel(m.title, body, { cls: 'letter-p' });
}
