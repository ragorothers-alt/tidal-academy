/* 潮汐小島 · 共同回憶（v7.1）：導師的好感度到上限 20 之後，一起練習、連續挑戰再加的好感度改存成「共同回憶」，
   每 3 點寫一筆回憶錄，內容提到你在島上真的做過的事（研究、這一科的熟練題數、捐的展品、花園、最長連續紀錄）。
   好感度不會因為少來而下降；回憶只會越來越多。 */
import { S, save } from './state.js';
import * as memo from './memo.js';

const TA = window.TA, L = TA.L;
/** 好感度已經 20 時呼叫：記一點共同回憶；湊滿 3 點寫一筆回憶錄，回傳那句話（沒寫時回傳 null） */
export function overflow(v) {
  const s = S(); s.bondMem = s.bondMem || {};
  const n = s.bondMem[v.sid] = (s.bondMem[v.sid] || 0) + 1; save();
  if (n % 3) return null;
  const t = fact(v, n / 3);
  memo.add(`和${v.name}的回憶`, t, { icon: '💞', shot: false });
  return t;
}
export const count = sid => Math.floor((((S().bondMem || {})[sid]) || 0) / 3);
function fact(v, k) {
  const s = S(), subj = (TA.subject(v.sid) || {}).name || '', lab = ((s.lab || {})[v.sid] || {}).stage || 0;
  const mastered = (L.BY_SUBJECT[v.sid] || []).filter(id => ((TA.S.q || {})[id] || {}).s >= L.MASTER_BOX).length;
  const donated = Object.values(s.museum || {}).reduce((a, o) => a + Object.keys(o || {}).length, 0);
  const flowers = Object.keys(((s.garden || {}).book) || {}).length, best = (TA.S.streak || {}).best || 0;
  const list = [
    lab ? `${v.name}還記得我們一起做研究的那些日子：已經完成 ${lab} 個階段了。` : '',
    mastered ? `${v.name}說，我已經把 ${mastered} 道${subj}題練到熟練——比剛來島上時進步好多。` : '',
    donated ? `${v.name}說，博物館裡已經有 ${donated} 件是我捐的，下次要我帶路去看。` : '',   // v8.2 沒有真的一起去過，不寫成一起逛
    flowers ? `${v.name}在我的花園前停了好久，說花園筆記裡已經有 ${flowers} 種花色。` : '',
    best >= 3 ? `${v.name}記得我最長連續學習了 ${best} 天。` : '',
    `和${v.name}坐在一起讀書，安安靜靜的，也很好。`,
  ].filter(Boolean);
  return list[(k - 1) % list.length];
}
