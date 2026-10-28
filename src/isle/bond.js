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
/* ---------- v8.5 第一次一起做的事：第一次一起練習、第一次完成他的委託、第一次去他家（史遙是博物館）、第一份禮物。
   兩天後再見面時，島民會提起一次（data/lines7.js 的 mem），也寫進回憶錄。只記真的發生過的事。 ---------- */
export function note(v, kind, extra) {
  if (!v || v.guest || v.shop || !v.sid) return;
  const s = S(), m = s.firsts = s.firsts || {}, o = m[v.sid] = m[v.sid] || {}; if (o[kind]) return;
  const d = new Date(); o[kind] = Object.assign({ t: Date.now(), d: `${d.getMonth() + 1}/${d.getDate()}` }, extra || {}); save();
}
export function recall(v) {
  if (!v || v.guest || v.shop) return '';
  const s = S(), o = ((s.firsts || {})[v.sid]) || {}, M = (((TA.ISLE || {}).LINES7 || {})[v.sid] || {}).mem || {};
  const k = ['practice', 'req', 'visit', 'gift'].find(x => o[x] && !o[x].said && Date.now() - o[x].t > 2 * 864e5 && (M[x] || []).length);
  if (!k || Math.random() > 0.5) return '';
  const e = o[k]; e.said = Date.now(); save();
  const t = M[k][Math.floor(Math.random() * M[k].length)].replace(/\{(\w+)\}/g, (_, x) => e[x] ?? '');
  memo.add(`和${v.name}的回憶`, t, { icon: '💭' });
  return t;
}
/** v8.5 加好感度（送禮、委託、並坐、家訪都走這裡）：到上限 20 之後多出來的改存成共同回憶（以前只有一起練習會） */
export function addFr(v, n) {
  const s = S(), before = s.fr[v.sid] || 0, after = Math.min(20, before + n);
  s.fr[v.sid] = after; for (let k = before + n - after; k > 0; k--) overflow(v);
  return after;
}
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
