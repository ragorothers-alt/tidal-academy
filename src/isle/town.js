/* 潮汐小島 · 島上生活：島民作息（散步／在家／睡覺）、島民之間的閒聊、好感度事件、讀書會、考場與燈塔入口。 */
import { screenOf } from './engine.js';
import { openBoss } from './voyage.js';   // 燈塔首領戰在島上直接開打
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import { pickQ, record, pick, dayKey } from './quiz.js';
import { typhoon } from './weather.js';

const TA = window.TA;
let VS = [], ctx = {};
export function init(villagers, c) { VS = villagers.filter(v => !v.shop); ctx = c; }
const seedOf = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const rng = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ================= 作息 ================= */
let plan = { day: '', home: {}, eve: {}, sleepy: {} };
function planFor() {
  const k = dayKey(); if (plan.day === k) return plan;
  const r = rng(seedOf(k)); plan = { day: k, home: {}, eve: {}, sleepy: {} };
  // 每天在家三個小時：白天一段兩小時（9–19 點之間）、晚上一小時（18–21 點其中一個整點）；各導師隨機錯開，島上同時大約只有兩位在家
  VS.forEach((v, i) => { plan.home[v.sid] = 9 + Math.floor(r() * 9); plan.sleepy[v.sid] = r() < 0.5; plan.eve[v.sid] = 18 + Math.floor(r() * 4); if (plan.eve[v.sid] >= plan.home[v.sid] && plan.eve[v.sid] <= plan.home[v.sid] + 1) plan.eve[v.sid] = plan.home[v.sid] + 2; });   // 晚上那一小時不和白天那段重疊（重疊就接在後面）
  return plan;
}
/** 'out' 在外面、'home' 在家、'sleep' 睡著了（史遙住博物館，永遠在外面） */
export function where(v, hour) {
  if (v.shop || v.sid === 'history') return 'out';   // 店長與博物館的史遙照常在崗位上
  if (typhoon()) return 'home';
  const p = planFor(), h = Math.floor(hour);
  if (h < 6 && p.sleepy[v.sid]) return 'sleep';
  if (h === p.home[v.sid] || h === p.home[v.sid] + 1 || h === p.eve[v.sid]) return 'home';
  return 'out';
}
/** 今天在家的時段（手機「島民」名單顯示），例如「14:00–16:00、20:00–21:00」 */
export function homeHours(v) { if (v.shop || v.sid === 'history') return ''; const p = planFor(), a = p.home[v.sid], e = p.eve[v.sid]; if (a == null) return ''; const f = h => String(h).padStart(2, '0') + ':00'; return e === a + 2 ? `${f(a)}–${f(e + 1)}` : `${f(a)}–${f(a + 2)}、${f(e)}–${f(e + 1)}`; }   // 兩段接在一起就合併

/* ================= 閒聊 ================= */
let chatT = 20, active = null;
export const chatsFor = (a, b) => (I.CHATS || []).filter(c => (c.a === a && c.b === b) || (c.a === b && c.b === a));
export function update(dt, hour, player, busy) {
  if (active) {
    const { A, B, c } = active;
    if (A.away || B.away) { endChat(); return; }
    const near = (v, p) => Math.hypot(v.mesh.position.x - p[0], v.mesh.position.z - p[1]) < 0.35;
    if (active.stage === 'walk') {
      A.target = active.pa; B.target = active.pb; A.wait = B.wait = 99;
      active.t += dt;
      if ((near(A, active.pa) && near(B, active.pb)) || active.t > 12) { active.stage = 'talk'; active.i = 0; active.t = 2.6; }
    } else {
      A.faceTo = B; B.faceTo = A; active.t += dt;
      if (active.t > 2.6) {
        active.t = 0; if (active.el) active.el.remove();
        let line = active.lines[active.i++];
        if (!line && !active.gifted && Math.random() < 0.4) { active.gifted = true; giftLines(A, B).forEach(l => active.lines.push(l)); ui.emote(A.mesh, '🎁', '#ff7b9c'); line = active.lines[active.i++]; }
        if (!line) { endChat(); return; }
        const who = line[0] === A.sid ? A : B; active.who = who;
        active.el = ui.el('div', 'bubble', ui.esc(line[1])); document.getElementById('labels').appendChild(active.el);
        if (Math.hypot(player.position.x - who.mesh.position.x, player.position.z - who.mesh.position.z) < 10) Audio.blip(who.voice || 400);
      }
      if (active.el && active.who) {
        const [x, y] = screenOf(active.who.mesh, 2.05), d = Math.hypot(player.position.x - active.who.mesh.position.x, player.position.z - active.who.mesh.position.z);
        active.el.style.left = x + 'px'; active.el.style.top = y + 'px'; active.el.style.opacity = d < 11 ? 1 : 0;
      }
    }
    return;
  }
  chatT -= dt; if (chatT > 0 || busy) return;
  chatT = 25 + Math.random() * 30;
  const out = VS.filter(v => !v.away && where(v, hour) === 'out' && v.sid !== 'history');
  const pairs = [];
  out.forEach(a => out.forEach(b => { if (a.sid < b.sid && chatsFor(a.sid, b.sid).length) { const d = Math.hypot(a.mesh.position.x - b.mesh.position.x, a.mesh.position.z - b.mesh.position.z); if (d < 16) pairs.push([a, b, d]); } }));
  if (!pairs.length) return;
  const [A, B] = pick(pairs), c = pick(chatsFor(A.sid, B.sid));
  const mx = (A.mesh.position.x + B.mesh.position.x) / 2, mz = (A.mesh.position.z + B.mesh.position.z) / 2;
  if (!ctx.walkable(mx - 0.6, mz) || !ctx.walkable(mx + 0.6, mz)) return;
  active = { A, B, c, lines: c.lines.slice(), pa: [mx - 0.6, mz], pb: [mx + 0.6, mz], stage: 'walk', t: 0 };
  A.chatting = B.chatting = true;
}
/** 島民自己決定去找朋友聊天（mind.js）：兩人都在外面、有可以聊的話題、中間走得到，就照一般閒聊的流程走過去聊；聊不成回傳 false */
export function invite(A, B, hour, busy) {
  if (busy || active || A.chatting || B.chatting || A.sitting || B.sitting || A.away || B.away || where(A, hour) !== 'out' || where(B, hour) !== 'out' || !chatsFor(A.sid, B.sid).length) return false;
  const mx = (A.mesh.position.x + B.mesh.position.x) / 2, mz = (A.mesh.position.z + B.mesh.position.z) / 2;
  if (!ctx.walkable(mx - 0.6, mz) || !ctx.walkable(mx + 0.6, mz)) return false;
  active = { A, B, c: pick(chatsFor(A.sid, B.sid)), pa: [mx - 0.6, mz], pb: [mx + 0.6, mz], stage: 'walk', t: 0 }; active.lines = active.c.lines.slice();
  A.chatting = B.chatting = true; chatT = 25 + Math.random() * 30; return true;
}
/** 島民之間交換禮物：聊完天後偶爾送對方一件小東西 */
function giftLines(A, B) {
  const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  const pool = [...(I.FURNITURE || []).filter(f => f.src === 'shop' && (!f.size || f.size[0] * f.size[1] === 1)).map(f => f.name), ...(I.FISH || []).map(f => f.name), ...(I.BUGS || []).filter(b => b.where === 'flower').map(b => b.name + '的標本')];
  const item = pick(pool) || '小禮物', LA = (I.LINES2 || {})[A.sid] || {}, LB = (I.LINES2 || {})[B.sid] || {};
  const s = S(); s.vgifts = (s.vgifts || []).concat([{ from: A.sid, to: B.sid, item, day: dayKey() }]).slice(-30); save();
  return [[A.sid, fill(pick(LA.giveTo || ['{to}，這個{item}送你！']), { to: B.name, item })], [B.sid, fill(pick(LB.getFrom || ['謝謝你，{from}！']), { from: A.name })]];
}
function endChat() {
  if (!active) return; const { A, B } = active; if (active.el) active.el.remove();
  A.chatting = B.chatting = false; A.faceTo = B.faceTo = null; A.wait = B.wait = 1 + Math.random() * 2; active = null;
}
/** 玩家找正在閒聊的島民說話時，先結束閒聊 */
export function interrupt(v) { if (active && (active.A === v || active.B === v)) endChat(); }

/* ================= 好感度事件 ================= */
export const BOND_AT = [4, 8, 12, 16, 20];   // 第五段心事在好感度上限 20（內容在 data/research.js 的 I.BONDS5）
export const bondLevel = sid => (S().bond || {})[sid] || 0;
export function pendingBond(v) { const f = (S().fr || {})[v.sid] || 0, lv = bondLevel(v.sid); return lv < BOND_AT.length && f >= BOND_AT[lv] && (lv < 4 || (I.BONDS5 || {})[v.sid]) ? lv + 1 : 0; }
export async function playBond(v, sp) {
  const lv = pendingBond(v); if (!lv) return;
  const s = S(), b = lv === 5 ? (I.BONDS5 || {})[v.sid] : ((I.BONDS || {})[v.sid] || {})[lv];
  s.bond = s.bond || {}; s.bond[v.sid] = lv; save();
  await ui.card({ icon: ctx.icon('heart', 'heart'), title: `♥ 好感度事件 · ${b ? b.title : v.name + '的心事'}`, sub: `和${v.name}的關係更近了（${lv} / ${BOND_AT.length}）` });
  for (const line of (b ? b.lines : ['謝謝你常常來找我聊天。'])) await ui.say(sp, line);
  const gifts = (I.FURNITURE || []).filter(f => f.src === 'gift:' + v.sid);
  if (lv === 2 && gifts[0]) await ctx.giveFurn(gifts[0].id, `${v.name}送你的禮物`);
  else if (lv === 4 && gifts[1]) await ctx.giveFurn(gifts[1].id, `${v.name}的專屬禮物`);
  else { const n = lv === 5 ? 3000 : lv === 3 ? 2000 : 500; s.bells += n; save(); await ui.card({ icon: ctx.icon('bells', 'bells'), title: `收到 ${n} 鈴錢`, sub: `${v.name}的心意` }); }
  if (lv === 3) await ui.say(sp, '以後想一起讀書，就來找我開「讀書會」吧！');
}
/** 好感度 3 以上解鎖：讀書會（5 題，鈴錢加倍） */
export async function studyClub(v, sp) {
  const s = S(); let ok = 0;
  await ui.say(sp, '讀書會開始！我們一起做 5 題，答對的鈴錢加倍。');
  for (let k = 0; k < 5; k++) {
    const q = pickQ(v.sid); if (!q) break;
    const i = await ui.ask(sp, `第 ${k + 1} 題：` + q.q, q.o, { answer: q.a, abc: true, html: true, keys: true });
    const good = i === q.a; record(q, good); Audio.sfx(good ? 'ok' : 'bad'); if (good) ok++;
    if (!good) await ui.explain(sp, q);
  }
  const gain = ok * 300; s.bells += gain; save();
  await ui.say(sp, `答對 ${ok} / 5 題，拿到 ${gain} 鈴錢！下次再一起讀吧。`);
}

/* ================= 考場與燈塔 ================= */
export async function arena(sp) {
  await ui.say(sp, '燈塔的頂端住著十隻知識海獸。答得越快傷害越高，答錯會失去一顆心。');
  const subs = TA.SUBJECTS, beaten = sid => TA.S.boss && TA.S.boss[sid] && TA.S.boss[sid].wins > 0;
  const body = ui.el('div', 'arena-grid');
  subs.forEach(s => { const b = ui.el('button', 'arena-btn' + (beaten(s.id) ? ' won' : ''), `<i style="--c:${s.color}">${s.short}</i><b>${s.name}首領</b><small>${beaten(s.id) ? '已擊敗 ' + TA.S.boss[s.id].wins + ' 次' : '尚未挑戰'}</small>`); b.type = 'button'; b.onclick = () => openBoss(s.id); body.appendChild(b); });
  ui.closeDialog(); ui.panel('燈塔競技場：選擇首領', body, { cls: 'arena-p' });
}
