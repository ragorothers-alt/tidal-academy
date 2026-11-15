/* 潮汐小島 · v9.20 導師找碴的挑題與每日份數：純函式（沒有 DOM），學習引擎 L 與存檔由呼叫端傳進來，測試直接用真的引擎跑。
   找碴題是題庫裡標了 spot 的單選題：題幹列出三步驟的解法，選項固定是「第 ① 步…以上三步都正確」。 */

export const DAY = 3;   // 每天最多檢查幾份
/** 這一科的找碴題 */
export const ids = (L, sid) => (L.BY_SUBJECT[sid] || []).filter(id => L.Q[id] && L.Q[id].spot);
/** 今天的份數紀錄 { d 日期, n 已檢查幾份 }：換日或存檔裡的資料不對就從 0 開始 */
export function log(isle, day) {
  if (!isle.spot || isle.spot.d !== day || !(isle.spot.n >= 0)) isle.spot = { d: day, n: 0 };
  return isle.spot;
}
/** 挑下一份：到期或還在錯題本的先，再來是沒看過的，最後才是其他；冷卻中與這一輪出過的（skip）不挑。都沒有回傳 null */
export function next(L, sid, skip, rnd) {
  const r = rnd || Math.random, all = ids(L, sid).filter(id => !L.cooling(id) && !(skip && skip.has(id)));
  if (!all.length) return null;
  const want = all.filter(id => L.isDue(id) || L.isMistake(id)), fresh = all.filter(id => !L.rec(id)), pool = want.length ? want : fresh.length ? fresh : all;
  return L.Q[pool[Math.floor(r() * pool.length)]];
}
