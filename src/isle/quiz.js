/* 潮汐小島 · 出題：所有玩法共用同一份間隔複習紀錄。到期題與錯題優先，其次新題。
   剛答過（20 分鐘內）的題目先冷卻，不會剛看完解析又考同一題；每次出題選項順序都打亂（L.view）。 */
import * as ui from './ui.js';
import * as miles from './miles.js';
import { dayKey as stateDayKey } from './state.js';

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
  if (review.length && Math.random() < 0.55) return L.view(L.Q[pick(review)]);
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
  const multi = q.type === 'multi';
  const ans = await ui.ask(sp, (head || '') + (multi && !/多選/.test(q.q) ? '（多選題：選出所有正確的選項再送出）' : '') + q.q, q.o, Object.assign({ html: true, keys: true, abc: true, multi }, opt));
  return { ok: multi ? Array.isArray(ans) && L.check(q, ans) : ans === q.a, ans };
}
/** 限時題依閱讀量加時間（秒）：長題目、題組的閱讀材料、多選題不會因為字多而來不及 */
export const readSec = q => Math.round((ui.plain(q.q).length + (q.o || []).reduce((a, o) => a + ui.plain(o).length, 0) + ui.plain(q.passage || '').length * 0.6) / 9) + (q.type === 'multi' ? 8 : q.type === 'fill' ? 25 : 0);   // 選填題要計算，多給時間
/** 小遊戲的限時：一般長度的題目維持原本的秒數，比較長的題目照多出來的閱讀量加時間 */
export const fairSec = (base, q) => base + Math.max(0, readSec(q) - 12);
/** 記錄作答（寫入同一份學習進度） */
export function record(q, ok, opt) { if (q.vocab) L.recordVocab(q.vocab.w, ok); else L.record(q, ok, { silent: false, combo: opt && opt.combo }); if (ok) miles.add('quiz'); else miles.check(); }

/** 單字題：英文 → 中文 */
export function vocabQ(opt) {
  const V0 = L.VOCAB || []; if (V0.length < 8) return null;
  // opt：{ minLv, maxLv } 單字等級範圍（釣到大魚考難字）；範圍內沒有字時不限等級
  const inLv = v => (!opt || ((v.lv || 1) >= (opt.minLv || 0) && (v.lv || 1) <= (opt.maxLv || 99)));
  const V = V0.filter(inLv).length >= 8 ? V0.filter(inLv) : V0;
  const due = L.vocabDue().filter(inLv), fresh = V.filter(v => !TA.S.voc[v.w] && (opt ? true : v.lv <= 5));
  const v = due.length && Math.random() < 0.6 ? pick(due) : fresh.length ? pick(fresh) : pick(V);
  const same = V0.filter(x => x.w !== v.w && x.zh !== v.zh && x.pos === v.pos), pool = same.length >= 6 ? same : V0.filter(x => x.w !== v.w && x.zh !== v.zh);
  const wrong = []; while (wrong.length < 3) { const x = pick(pool); if (!wrong.includes(x.zh)) wrong.push(x.zh); }
  const a = Math.floor(Math.random() * 4), o = wrong.slice(); o.splice(a, 0, v.zh);
  return { id: 'voc:' + v.w, vocab: v, d: 1, q: `${v.w}（${v.pos || ''}）是什麼意思？`, o, a, e: `${v.w} ${v.pos || ''}：${v.zh}${v.ex ? '。例句：' + v.ex + (v.exZh ? '（' + v.exZh + '）' : '') : ''}` };
}
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const dayKey = stateDayKey;
