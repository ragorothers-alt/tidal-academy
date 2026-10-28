/* 潮汐小島 · 出題：所有玩法共用同一份間隔複習紀錄。到期題與錯題優先，其次新題。
   剛答過（20 分鐘內）的題目先冷卻，不會剛看完解析又考同一題；每次出題選項順序都打亂（L.view）。 */
import * as ui from './ui.js';
import * as miles from './miles.js';
import * as Audio from './audio.js';
import { S, dayKey as stateDayKey } from './state.js';

const TA = window.TA, L = TA.L;
/** 科目題目。題目再長都能出（放不下時對話框自動換成大題目面板），不因版面挑題。
    opt：{ minD 最低難度, skip 這一輪已出過的題目 id（Set）, any 也出題組與多選題（連續挑戰、島民出題用 askQ 作答）,
           quick 只出輕量的短題（島民在路上攔住你時用：單選、不是題組、題目加選項不太長） }
    沒有 any 時只出單選題：島上的小遊戲（釣魚、熱氣球…）只接一個選項 */
export function pickQ(sid, maxD, opt) { return fromPool(L.BY_SUBJECT[sid] || [], maxD, opt); }
/** 指定單元出題（例如觀星只出天文單元） */
export function pickQU(units, maxD) { return fromPool([].concat(...units.map(u => L.BY_UNIT[u] || [])), maxD); }
/** 輕量題：單選、不是題組、題目加選項 140 字以內 */
const single = q => !q.type || q.type === 'single';
export const quickQ = q => !!q && !q.pid && single(q) && ui.plain(q.q).length + q.o.reduce((a, o) => a + ui.plain(o).length, 0) <= 140;
function fromPool(ids, maxD, opt) {
  const minD = (opt && opt.minD) || 1, skip = opt && opt.skip, any = opt && opt.any, quick = opt && opt.quick;
  const all = ids.filter(id => { const q = L.Q[id]; return q && (any || (!q.pid && single(q))) && (q.d || 1) <= (maxD || 3) && (q.d || 1) >= minD && !(skip && skip.has(id)) && (!quick || quickQ(q)); });
  if (!all.length) return null;
  const ready = all.filter(id => !L.cooling(id)), pool = ready.length ? ready : all;   // 剛答過的題目先冷卻（真的沒別的題目才出）
  const review = pool.filter(id => L.isDue(id) || L.isMistake(id));
  if (review.length && Math.random() < (review.length >= 12 ? 0.8 : 0.55)) return L.view(L.Q[pick(review)]);   // 這科積了很多複習時，少出新題
  const fresh = pool.filter(id => !L.rec(id));
  if (fresh.length) return L.view(L.Q[pick(fresh)]);
  return L.view(L.Q[pool.slice().sort((a, b) => L.mastery(a) - L.mastery(b))[Math.floor(Math.random() * Math.min(8, pool.length))]]);
}
/** 出一道題：題組先打開閱讀材料、多選題可以勾選多個再送出，選項標 A–E。回傳 { ok, ans }（限時到了 ans = -1） */
export async function askQ(sp, q, head, opt) {
  ui.passage(q.passage || null);
  if (q.type === 'fill') {   // 選填題：數字鍵盤作答
    const ans = await ui.input(sp, (head || '') + '（選填題：算出答案後輸入）' + q.q, Object.assign({ html: true }, opt));
    return { ok: ans !== -1 && L.check(q, ans), ans };
  }
  const multi = q.type === 'multi', conf = !!(opt && opt.conf) && !(opt && opt.timer) && !multi && !q.vocab;
  const ans = await ui.ask(sp, (head || '') + (multi && !/多選/.test(q.q) ? '（多選題：選出所有正確的選項再送出）' : '') + q.q, q.o, Object.assign({ html: true, keys: true, abc: true, multi, answer: q.a }, opt, { conf }));
  if (ans === -2) return { ok: false, ans, stop: true };   // v8.6 先到這裡（ui.STOP）：這題不算
  return { ok: multi ? Array.isArray(ans) && L.check(q, ans) : ans === q.a, ans, conf: conf ? ui.lastConf() : null };
}
/** v8.4 一組題目裡問「有把握嗎」的題號（不限時、3 題以上的組才問；一組問 2 題，不會每題都多一步） */
export function confPlan(n, opt) {
  if (n < 3 || (opt && opt.timer) || (S().settings || {}).noConf) return new Set();
  const ks = [...Array(n).keys()].sort(() => Math.random() - 0.5); return new Set(ks.slice(0, 2));
}
/** v8.4 作答後的後設認知回饋：猜對的明天再確認；很有把握卻答錯，先看差在哪裡。回傳解析的開頭（答錯時用） */
export function confNote(ok, conf) {
  if (ok && conf === 'guess') { ui.toast('猜對了：這題先不往後排，明天再確認一次'); return ''; }
  if (!ok && conf === 'sure') return '很有把握卻答錯了——這種題目最值得看清楚差在哪裡。';
  return '';
}
/** v8.4 答錯看完解析後，標一下錯在哪裡（一組最多問一次；可以跳過）。錯題本會依錯因分組 */
export async function askWhy(sp, q) {
  if (!q || q.vocab || !L.Q[q.id] || (S().settings || {}).noWhy) return;
  const K = Object.keys(L.WHY), i = await ui.ask(sp, '這題錯在哪裡？標一下，錯題本會幫你分組（也可以跳過）。', K.map(k => L.WHY[k]).concat(['先跳過']), { keys: true });
  if (i >= 0 && i < K.length) { L.tagWhy(q.id, K[i]); Audio.sfx('tick'); }
}
/** 限時題依閱讀量加時間（秒）：長題目、題組的閱讀材料、多選題不會因為字多而來不及 */
export const readSec = q => Math.round((ui.plain(q.q).length + (q.o || []).reduce((a, o) => a + ui.plain(o).length, 0) + ui.plain(q.passage || '').length * 0.6) / 9) + (q.type === 'multi' ? 8 : q.type === 'fill' ? 25 : 0);   // 選填題要計算，多給時間
/** 小遊戲的限時：一般長度的題目維持原本的秒數，比較長的題目照多出來的閱讀量加時間 */
export const fairSec = (base, q) => base + Math.max(0, readSec(q) - 12);
/** 記錄作答（寫入同一份學習進度） */
export function record(q, ok, opt) { if (q.vocab) L.recordVocab(q.vocab.w, ok); else L.record(q, ok, { silent: false, combo: opt && opt.combo, conf: opt && opt.conf }); if (ok) miles.add('quiz'); else miles.check(); }

/** 單字題：英文 → 中文 */
export function vocabQ(opt) {
  const V0 = L.VOCAB || []; if (V0.length < 8) return null;
  // opt：{ minLv, maxLv } 單字等級範圍（釣到大魚考難字）；範圍內沒有字時不限等級。not：這一輪出過的字（Set of 'voc:字'）
  const lvOpt = opt && (opt.minLv || opt.maxLv) ? opt : null, not = opt && opt.not;
  const inLv = v => (!lvOpt || ((v.lv || 1) >= (lvOpt.minLv || 0) && (v.lv || 1) <= (lvOpt.maxLv || 99)));
  const V = V0.filter(inLv).length >= 8 ? V0.filter(inLv) : V0;
  // v8.2 同一輪不重複出同一個字；剛答過（20 分鐘內）的到期字先冷卻，跟題庫的錯題一樣隔一陣子再考
  const now = Date.now(), cool = v => { const r = TA.S.voc[v.w]; return !!r && !!r.last && now - r.last < 20 * 60e3; };
  const ok = v => !not || !not.has('voc:' + v.w), prefer = a => { const b = a.filter(ok); return b.length ? b : a; };
  const due0 = L.vocabDue().filter(v => inLv(v) && ok(v)), dueReady = due0.filter(v => !cool(v)), due = dueReady.length ? dueReady : [];
  const fresh = V.filter(v => !TA.S.voc[v.w] && (lvOpt ? true : v.lv <= 5) && ok(v));
  const v = due.length && Math.random() < 0.6 ? pick(due) : fresh.length ? pick(fresh) : due.length ? pick(due) : pick(prefer(V.filter(x => !cool(x)).length ? V.filter(x => !cool(x)) : V));
  const same = V0.filter(x => x.w !== v.w && x.zh !== v.zh && x.pos === v.pos), pool = same.length >= 6 ? same : V0.filter(x => x.w !== v.w && x.zh !== v.zh);
  const wrong = []; while (wrong.length < 3) { const x = pick(pool); if (!wrong.includes(x.zh)) wrong.push(x.zh); }
  const a = Math.floor(Math.random() * 4), o = wrong.slice(); o.splice(a, 0, v.zh);
  return { id: 'voc:' + v.w, vocab: v, d: 1, q: `${v.w}（${v.pos || ''}）是什麼意思？`, o, a, e: `${v.w} ${v.pos || ''}：${v.zh}${v.ex ? '。例句：' + v.ex + (v.exZh ? '（' + v.exZh + '）' : '') : ''}` };
}
export const pick = a => a[Math.floor(Math.random() * a.length)];
/** v8.5 洗牌袋：同一組台詞輪完一輪才重複，剛說過的那句不會馬上又出現（以前每次獨立抽，三次見面常常重複） */
const bags = new Map();
export function bag(key, arr) {
  if (!arr || !arr.length) return ''; if (arr.length === 1) return arr[0];
  let b = bags.get(key);
  if (!b || b.src !== arr || !b.left.length) {
    const last = b && b.src === arr ? b.last : -1, left = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
    if (left[left.length - 1] === last) left.unshift(left.pop());
    b = { src: arr, left, last }; bags.set(key, b);
  }
  b.last = b.left.pop(); return arr[b.last];
}
export const dayKey = stateDayKey;
