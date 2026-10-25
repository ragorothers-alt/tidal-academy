/* 潮汐小島 · 鈴錢帳本（v7.1）：記下每天鈴錢從哪裡來、花到哪裡去，用來看各種玩法的收入是否差不多（不改任何既有存款）。
   做法：state.js 把 S().bells 換成存取器，每次增減都交給 note()；金額記在當下的來源標籤（begin(tag) 開始、回傳的函式結束）。
   沒有標籤時記成「其他」。S().ledger = { 'YYYY-MM-DD': { 來源: [收入, 支出] } }，只留最近 14 天。 */
const TA = window.TA, dayKey = () => TA.U.dayKey();   // 不 import state.js（state.js 會用到這裡的 watch）
export const NAMES = { practice: '一起練習', streak: '連續挑戰', popquiz: '島民出題', sell: '賣東西', shop: '買東西', request: '委託', research: '研究經費', plan: '讀書計畫', cram: '考前衝刺', exchange: '潮晶兌換', trip: '神秘島', order: '訂購', other: '其他' };
let tag = '';
/** 開始一段有來源的流程（同時只有一段；巢狀時保留外層），回傳結束函式 */
export function begin(t) { if (tag) return () => {}; tag = t; return () => { if (tag === t) tag = ''; }; }
/** 同步的一筆（這一輪事件迴圈內有效；已經在別的流程裡時沿用外層的標籤） */
export function mark(t) { if (tag) return; tag = t; queueMicrotask(() => { if (tag === t) tag = ''; }); }
/** 包一個 async 流程 */
export async function run(t, fn) { const end = begin(t); try { return await fn(); } finally { end(); } }
const book = () => { const isle = TA.S.isle; isle.ledger = isle.ledger && typeof isle.ledger === 'object' ? isle.ledger : {}; return isle.ledger; };
export function note(dv) {
  if (!dv || !TA.S || !TA.S.isle) return;
  const B = book(), d = dayKey(), day = B[d] = B[d] || {}, k = tag || 'other', r = day[k] = day[k] || [0, 0];
  if (dv > 0) r[0] += dv; else r[1] -= dv;
  const keys = Object.keys(B).sort(); while (keys.length > 14) delete B[keys.shift()];
}
/** 最近 n 天的合計：[[來源, 收入, 支出]]，收入多的在前 */
export function sum(n) {
  const B = book(), keys = Object.keys(B).sort().slice(-(n || 7)), tot = {};
  keys.forEach(d => Object.entries(B[d]).forEach(([k, [a, b]]) => { const t = tot[k] = tot[k] || [0, 0]; t[0] += a; t[1] += b; }));
  return Object.entries(tot).map(([k, [a, b]]) => [k, a, b]).sort((x, y) => y[1] - x[1] || y[2] - x[2]);
}
/** S().bells 的存取器：存檔照樣寫成數字 */
export function watch(d) {
  let v = typeof d.bells === 'number' ? d.bells : 1000;
  Object.defineProperty(d, 'bells', { configurable: true, enumerable: true, get: () => v, set: n => { n = Number(n) || 0; const dv = n - v; v = n; if (dv) note(dv); } });
}
