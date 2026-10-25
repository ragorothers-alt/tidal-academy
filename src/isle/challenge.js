/* 潮汐小島 · 連續挑戰與島民主動出題
   一起練習（導師的預設練習，v7.1）：一組 5 題、不限時、難度照表現調整，答對的鈴錢不收回。
   連續挑戰：答對一題就把獎金放進彩池，可以選「繼續（下一題更難）」或「見好就收」領走全部；答錯只能領回一半。
   連對越多難度越高：前 2 題簡單、第 3–5 題中等、第 6 題起困難、連對 10 題起每題限時（越來越短，但題目長、有閱讀材料或多選時會多給時間）；
   題庫裡的題組（附閱讀材料）與多選題也會出，長題目用大題目面板作答；
   每題獎金 = 難度 × 100 × 連勝倍率（每多連對一題 +0.25 倍），連對 5、10、15、20…題另外直接送禮物（答錯也不會收回）。
   單場連對數也算進「十連潮湧」「巨浪不止」成就。
   島民主動出題：每隔 3–5 分鐘，附近有空的島民會走過來問「考你一題好不好？」，優先出你的錯題與該複習的題目，答對有隨機獎勵。
   攔路出的題只出輕量的短題（單選、不是題組）；深度題留給玩家自己選的「一起練習」與「連續挑戰」。
   答錯之後（連續挑戰結束、島民出題）可以「同單元再練一題」（換一題，不是同一題）或直接翻到那個單元的筆記。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as cooking from './cooking.js';
import * as memo from './memo.js';
import { pickQ, pickQU, record, pick, vocabQ, askQ, readSec, quickQ } from './quiz.js';
import { openNotes } from './library.js';
import { I, S, save, icon } from './state.js';
import { MATS } from './diy.js';
import * as route from './route.js';

const TA = window.TA, L = TA.L;
let H = {};   // main.js 的工具：sp、player、tail、hearts、gift、giveFurn
export function init(hooks) { H = hooks; }

const DN = ['', '簡單', '中等', '困難'];
/** 已連對 n 題時，下一題的難度與限時（秒，0 = 不限時） */
export const levelOf = n => (n < 2 ? 1 : n < 5 ? 2 : 3);
export const timerOf = n => (n >= 10 ? Math.max(12, 25 - (n - 10)) : 0);
/** 第 k 連對（k 從 1 起）的獎金 */
export const prizeOf = (d, k) => Math.round(100 * d * (1 + (k - 1) * 0.25) * cooking.bellsMul());
const rec = () => { const s = S(); s.streakQ = s.streakQ || { best: 0, by: {} }; return s.streakQ; };

/** 連對 5、10、15…題的禮物（直接入帳） */
async function milestone(sp, k) {
  const s = S();
  if (k % 10 === 0) {
    const f = pick((I.FURNITURE || []).filter(f => f.src === 'shop' && f.price <= 9000));
    await ui.say(sp, `連對 ${k} 題！太厲害了，這個送你！`);
    if (f) { await H.giveFurn(f.id, `連對 ${k} 題的獎品`); return; }
  }
  const gems = k >= 15 ? 10 : 3, m = pick(['branch', 'stone', 'shell', 'iron']), n = k >= 15 ? 5 : 3;
  L.gain(0, gems); s.mats = s.mats || {}; s.mats[m] = (s.mats[m] || 0) + n; save();
  await ui.card({ icon: icon('star', 'star'), title: `連對 ${k} 題！`, sub: `獲得潮晶 ×${gems}、${MATS[m]} ×${n}` });
}

/** 連續答題的迴圈（導師的「連續挑戰」、以及所有單題答對後的「繼續挑戰」共用）。
    o：{ sp 說話的人, pick(d, seen) 出下一題（d 是希望的難度，回傳 null 表示沒題了）, n 已連對幾題, v 島民（有的話加好感度、用他的台詞）, mesh 冒表情的模型, seen 已出過的題目 id }
    回傳最後連對的題數 */
async function loop(o) {
  const s = S(), sp = o.sp, v = o.v, mesh = o.mesh || (v && v.mesh), seen = o.seen || new Set(), R = rec();
  const okL = (v && v.ok) || ['答對了！', '漂亮！', '完全正確！', '好厲害！'], badL = (v && v.bad) || ['可惜！', '差一點！'];
  let n = o.n || 0, pot = 0, friend = '';
  for (;;) {
    const d = levelOf(n), q = o.pick(d, seen);
    if (!q) { if (pot) { s.bells += pot; save(); } await ui.say(sp, pot ? `題目都被你答完了！連對 ${n} 題，${pot} 鈴錢都是你的了。` : '題目都被你答完了！今天就到這裡吧。'); break; }
    if (q.id) seen.add(q.id);
    const qd = q.d || d, tm = timerOf(n) && timerOf(n) + readSec(q);
    const head = `【第 ${n + 1} 題・${DN[qd] || DN[d]}${tm ? `・限時 ${tm} 秒` : ''}${pot ? `・彩池 ${pot} 鈴錢` : ''}】<br>`;   // 對話框只認 b/u/i/br，用括號標示
    const { ok, ans } = await askQ(sp, q, head, { timer: tm || undefined });
    if (ok) TA.S.bestCombo = Math.max(TA.S.bestCombo || 0, n + 1);   // 連擊成就（十連潮湧、巨浪不止）也算
    if (q.vocab || L.Q[q.id]) record(q, ok, { combo: n + 1 });   // 程式產生的題目（石碑的數學題）不在題庫裡，不記錄
    if (!ok) {
      Audio.sfx('bad'); if (mesh) ui.emote(mesh, '💧', '#5fa8ff');
      await ui.explain(sp, q, ans === -1 ? '時間到！' : pick(badL));
      ui.passage(null);
      const note = q.vocab || L.Q[q.id] ? '這題記下來了，之後會再考你！' : '再接再厲！';   // 程式產生的題目（石碑）不會記進錯題
      if (pot) { const half = Math.floor(pot / 2); s.bells += half; save(); ui.floatText(H.player, `+${half} 鈴錢`); await ui.say(sp, `連對 ${n} 題，彩池 ${pot} 鈴錢拿回一半：${half} 鈴錢。${note}`); }
      else await ui.say(sp, note);
      if (L.Q[q.id]) await afterMiss(sp, q);
      break;
    }
    ui.passage(null);
    n++; const gain = prizeOf(qd, n); pot += gain;
    Audio.sfx('ok'); if (mesh) ui.emote(mesh, n >= 5 ? '★' : '♪', '#ff7b9c'); ui.floatText(H.player, `彩池 +${gain}`, '#e0a020');
    // 好感度真的升到 5 的倍數才送禮物（到了上限 20 就不再每場都送）
    if (v) { const today = s.frDay[v.sid] || 0; if (today < 3) { const before = s.fr[v.sid] || 0; s.frDay[v.sid] = today + 1; s.fr[v.sid] = Math.min(20, before + 1); friend = `（好感度 ${H.hearts(s.fr[v.sid])}）`; if (s.fr[v.sid] > before && s.fr[v.sid] % 5 === 0) R.gift = v.sid; } }
    save();
    if (n % 5 === 0) await milestone(sp, n);
    const nd = levelOf(n), nt = timerOf(n);
    const up = nd > levelOf(n - 1) ? `接下來換${DN[nd]}題！` : nt && ui.read.timer && !timerOf(n - 1) ? '接下來每題都要限時作答！' : '';
    const c = await ui.ask(sp, `${pick(okL)}連對 ${n} 題，彩池 ${pot} 鈴錢。${up}要繼續嗎？`, [`繼續挑戰（${DN[nd]}${nt && ui.read.timer ? '・限時' : ''}）`, `見好就收（領 ${pot} 鈴錢）`], { keys: true });
    if (c !== 0) { s.bells += pot; save(); Audio.sfx('coin'); await ui.say(sp, `連對 ${n} 題，${pot} 鈴錢都是你的了！${v ? H.tail(v) : ''}${friend}`); break; }
  }
  if (n > R.best) { const old = R.best; R.best = n; if (old && n >= 3) ui.toast(`🏆 連續挑戰新紀錄：連對 ${n} 題！`); }
  if (n >= 10) memo.add(`連續挑戰連對 ${n >= 20 ? 20 : 10} 題`, `一口氣答對了 ${n} 題`, { key: `streak:${n >= 20 ? 20 : 10}`, icon: '🔥' });
  save();
  return n;
}
/** 依科目出題：越連對越難，同一場不重複 */
const bySubject = sid => (d, seen) => pickQ(sid, d, { minD: d, skip: seen, any: true }) || pickQ(sid, 3, { skip: seen, any: true }) || pickQ(sid, 3, { any: true });   // 這一科的題目都出過了：允許重複（不會因為題目用完而中斷）

/** 連續挑戰（導師選單的「連續挑戰」）：回傳本場連對題數 */
export async function streak(v) {
  const sp = H.sp(v), R = rec();
  const first = !R.intro; R.intro = 1;
  await ui.say(sp, pick(v.ask || ['我來考考你！']) + (first ? '這次是連續挑戰：答對一題，獎金就疊上去，題目也會越來越難。隨時可以見好就收；答錯的話只能拿回一半喔！' : ''));
  const n = await loop({ sp, v, pick: bySubject(v.sid) });
  if (n > (R.by[v.sid] || 0)) { R.by[v.sid] = n; save(); }
  if (R.gift === v.sid) { R.gift = null; save(); await H.gift(v); }
  return n;
}

/** 一起練習（v7.1，導師的預設練習）：一組 5 題、不限時，難度照這科的表現調整（連對兩題升一級、答錯降一級）；
    每題答對就拿 100 × 難度鈴錢，後面答錯也不收回；答錯看完解析繼續下一題，最後說這組的結果。想拚紀錄的玩家另選「連續挑戰」。回傳答對題數 */
export const SET = 5;
export async function practice(v) {
  const s = S(), sp = H.sp(v), R = rec(), seen = new Set(), st = L.subjectStats(v.sid);
  const okL = v.ok || ['答對了！', '漂亮！', '完全正確！'], badL = v.bad || ['可惜！', '差一點！'];
  let d = st.attempts < 5 || st.acc < 0.55 ? 1 : st.acc < 0.8 ? 2 : 3, run = 0, got = 0, bells = 0, friend = '', k = 0;
  await ui.say(sp, R.pIntro ? pick(v.ask || ['我們來練幾題！']) : '我們一起練 5 題：不限時間，難度會照你的狀況調整。答對一題就拿一題的鈴錢，答錯也不會收回，看完解析就換下一題。');
  R.pIntro = 1;
  for (k = 1; k <= SET; k++) {
    const q = pickQ(v.sid, d, { minD: d, skip: seen, any: true }) || pickQ(v.sid, 3, { skip: seen, any: true }); if (!q) break;
    seen.add(q.id);
    const qd = q.d || d, { ok, ans } = await askQ(sp, q, `【一起練習 第 ${k}/${SET} 題・${DN[qd]}】<br>`);
    record(q, ok);
    if (ok) {
      got++; run++; const b = Math.round(100 * qd * cooking.bellsMul()); bells += b; s.bells += b;
      if ((s.frDay[v.sid] || 0) < 3) { const before = s.fr[v.sid] || 0; s.frDay[v.sid] = (s.frDay[v.sid] || 0) + 1; s.fr[v.sid] = Math.min(20, before + 1); friend = `（好感度 ${H.hearts(s.fr[v.sid])}）`; if (s.fr[v.sid] > before && s.fr[v.sid] % 5 === 0) R.gift = v.sid; }
      save(); Audio.sfx('ok'); ui.emote(v.mesh, '♪', '#ff7b9c'); ui.floatText(H.player, `+${b} 鈴錢`, '#e0a020'); ui.passage(null);
      if (run >= 2 && d < 3) { d++; run = 0; }
      if (k < SET) await ui.say(sp, pick(okL));
    } else {
      run = 0; d = Math.max(1, d - 1);
      Audio.sfx('bad'); ui.emote(v.mesh, '💧', '#5fa8ff');
      await ui.explain(sp, q, ans === -1 ? '時間到！' : pick(badL)); ui.passage(null);
    }
  }
  const n = Math.min(SET, k - 1);
  await ui.say(sp, n ? `這組 ${n} 題答對 ${got} 題，拿到 ${bells} 鈴錢。${got === n ? '全對！下次可以挑戰難一點的。' : got ? '答錯的題目記下來了，過幾天會再考你。' : '沒關係，錯的題目過幾天會再出現，到時候就會了。'}${H.tail(v)}${friend}` : '題目都被你答完了！');
  if (R.gift === v.sid) { R.gift = null; save(); await H.gift(v); }
  return got;
}

/** 島上任何一道題答對之後（石碑、釣魚、抓蟲、鑑定、熱氣球、雪人、島民出題…）：問要不要接著連續挑戰。
    同一科、越來越難；彩池從 0 開始疊（這一題的獎勵已經照原本的方式給了），隨時見好就收，答錯拿回一半。
    opt：{ pick 自訂出題（例如石碑的數學題）, mesh 冒表情的模型, v 島民 } */
const MORE = ['還想再答嗎？連續答對的話，獎金會一直疊上去喔（答錯只拿回一半）。', '手感正好！要不要接著挑戰下一題？獎金會越疊越多。', '再來一題？連對越多題，彩池越大！',
  '答得真順！趁熱再來幾題？越後面越難，獎金也越多。', '想挑戰看看能連對幾題嗎？隨時可以見好就收。', '要不要順便練幾題？答對的獎金會一直疊上去。',
  '這科你好像很熟了，要不要試試更難的題目？', '再答一題就好？不想答的話選「先這樣」就可以。'];
/* 邀請的頻率：每隔 8 分鐘最多問一次；連續拒絕兩次就隔 30 分鐘；設定裡可以關掉。預設反白「先這樣」，連按 E 不會誤進挑戰 */
const KG = { last: 0, no: 0 };
const kgReady = () => S().settings && S().settings.keepGoing === false ? false : !route.quiet() && Date.now() - KG.last > (KG.no >= 2 ? 30 : 8) * 60000;   // 收工、散步、休息、剛拒絕過（route.quiet）也不問
export async function keepGoing(sp, q, opt) {
  opt = opt || {};
  const sid = q && (q.subject || (L.Q[q.id] && L.Q[q.id].subject));
  const pk = opt.pick || (q && q.vocab ? () => vocabQ() : sid ? bySubject(sid) : null);
  if (!pk || !kgReady()) { ui.closeDialog(); return 0; }
  KG.last = Date.now();
  // 結束時收起對話框：釣魚、抓蟲、石碑這些不是在對話裡出的題，沒有人會幫忙關（還在對話中的話，下一句會再打開）
  if (await ui.ask(sp, pick(MORE), ['繼續挑戰！', '先這樣'], { keys: true, hl: 1 }) !== 0) { KG.no++; route.hush(20); ui.closeDialog(); return 0; }   // 拒絕一次：全島安靜 20 分鐘
  KG.no = 0;
  const n = await loop({ sp, pick: pk, n: 1, v: opt.v, mesh: opt.mesh, seen: new Set(q && q.id ? [q.id] : []) });
  ui.closeDialog();
  return n;
}

/* ---------- 島民主動出題 ---------- */
const OPEN = ['嘿！考你一題好不好？答對有小禮物喔！', '剛好遇到你！我想到一題，要不要挑戰看看？', '等等！我這裡有一題，答對送你東西！', '來來來，考你一題，敢不敢接？'];
const REVIEW = ['上次你這題答錯了，再試一次？', '我記得這題你之前卡住了，現在會了嗎？'];
const REWARDS = [
  [40, () => { const b = 200 + Math.floor(Math.random() * 7) * 100; S().bells += b; return { icon: icon('bells', 'bells'), title: `${b} 鈴錢` }; }],
  [25, () => { const m = pick(['branch', 'stone', 'shell', 'fruit', 'iron']), n = 2 + Math.floor(Math.random() * 2), s = S(); s.mats = s.mats || {}; s.mats[m] = (s.mats[m] || 0) + n; return { icon: icon(m, m), title: `${MATS[m]} ×${n}` }; }],
  [17, () => { const n = 2 + Math.floor(Math.random() * 4); L.gain(0, n); return { icon: icon('star', 'star'), title: `潮晶 ×${n}` }; }],
  [12, () => { const s = S(); s.stars = s.stars || {}; s.stars.frag = (s.stars.frag || 0) + 1; return { icon: icon('star', 'star'), title: '星之碎片 ×1' }; }],
  [6, () => { const f = pick((I.FURNITURE || []).filter(f => f.src === 'shop' && f.price <= 9000)); return f ? { furn: f.id, title: f.name } : { icon: icon('bells', 'bells'), title: (S().bells += 1000, '1000 鈴錢') }; }],
];
function roll() { let r = Math.random() * REWARDS.reduce((a, x) => a + x[0], 0); for (const [w, f] of REWARDS) { r -= w; if (r <= 0) return f(); } return REWARDS[0][1](); }
/** 島民走到面前時呼叫（已在 talking 鎖裡） */
export async function popQuiz(v) {
  const s = S(), sp = H.sp(v);
  if (await ui.ask(sp, pick(OPEN), ['好啊！', '現在不行']) !== 0) { route.hush(20); await ui.say(sp, pick(['好吧，下次再考你！', '那我晚點再來找你～', '沒關係，改天吧！'])); return false; }
  // 優先出這科的錯題與到期該複習的題（輕量的短題、不在冷卻中）；攔路不出題組與長題
  const pool = (L.BY_SUBJECT[v.sid] || []).filter(id => (L.isMistake(id) || L.isDue(id)) && !L.cooling(id) && quickQ(L.Q[id]));
  let q = pool.length ? L.view(L.Q[pick(pool)]) : null;
  const again = !!q && L.isMistake(q.id);
  q = q || pickQ(v.sid, 2, { quick: true }) || pickQ(v.sid, 3, { quick: true }) || pickQ(v.sid, 3);
  if (!q) { await ui.say(sp, '咦，我忘了要考什麼……下次吧！'); return false; }
  if (again) await ui.say(sp, pick(REVIEW));
  const { ok } = await askQ(sp, q);
  record(q, ok);
  s.stats = s.stats || {}; s.stats.popQ = (s.stats.popQ || 0) + 1;
  if (ok) {
    Audio.sfx('ok'); ui.emote(v.mesh, '♪', '#ff7b9c');
    ui.passage(null);
    await ui.say(sp, pick(v.ok || ['答對了！']) + (again ? '這次記住了呢！' : '') + H.tail(v));
    const r = roll(); save();
    if (r.furn) await H.giveFurn(r.furn, `${v.name}的出題獎品`);
    else await ui.card({ icon: r.icon, title: `得到 ${r.title}！`, sub: `${v.name}的出題獎品` });
    await keepGoing(sp, q, { v, mesh: v.mesh });
  } else {
    Audio.sfx('bad'); ui.emote(v.mesh, '💧', '#5fa8ff');
    await ui.explain(sp, q, pick(v.bad || ['可惜！']));
    ui.passage(null);
    await ui.say(sp, '沒關係，這題記下來了，過一陣子我再來考你！');
    await afterMiss(sp, q);
  }
  return ok;
}

/* ---------- 答錯之後 ---------- */
/** 答錯（連續挑戰結束、島民出題）之後：同單元換一題類似題再練一次，或翻到這個單元的筆記。
    換的題目不會是剛答錯的那一題（它要過一陣子再考，答對才算真的記住） */
export async function afterMiss(sp, q) {
  const unit = L.Q[q.id] && L.Q[q.id].unit, u = unit && L.UNITS && L.UNITS[unit];
  if (!unit) return;
  const name = u ? u.name : '這個單元';
  const c = await ui.ask(sp, `要不要趁現在把「${name}」弄熟？`, ['同單元再練一題（換一題類似的）', `看「${name}」的筆記`, '先這樣'], { keys: true, hl: 2 });
  if (c === 1) { ui.closeDialog(); openNotes(q.subject || L.Q[q.id].subject, unit); return; }
  if (c !== 0) return;
  const q2 = pickQU([unit], 3);
  if (!q2 || q2.id === q.id) { await ui.say(sp, '這個單元的題目暫時練完了，先去看看筆記吧！'); return; }
  const { ok, ans } = await askQ(sp, q2, `【同單元練習・${name}】<br>`);
  record(q2, ok);
  if (ok) { ui.passage(null); Audio.sfx('ok'); await ui.say(sp, '答對了！同一個觀念換個題目也會，這樣才算真的懂。'); }
  else { Audio.sfx('bad'); await ui.explain(sp, q2, ans === -1 ? '時間到！' : '還差一點。'); ui.passage(null); await ui.say(sp, '這兩題都記下來了，之後會分開幾天再考你，答對才算真的記住。'); }
}
