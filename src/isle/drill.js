/* 潮汐小島 · 連續作答：在對話框裡做一組題目（支援多選題與題組閱讀材料），寫入共用的間隔複習紀錄。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { record, pick, vocabQ, askQ } from './quiz.js';

const TA = window.TA, L = TA.L;

/** 依模式挑題。focus: {mode: 'multi'|'group'|'mixed'|'hard'|'vocab'|'subject'|'ids', subject, ids} */
export function picker(focus) {
  const used = new Set();
  const pool = () => (focus.subject ? L.BY_SUBJECT[focus.subject] : L.ALL) || [];
  // 剛答過的題目先冷卻（真的沒別的題目才出）
  const fresh = ids => { const left0 = ids.filter(id => !used.has(id)); if (!left0.length) return null; const ready = left0.filter(id => !L.cooling(id)), left = ready.length ? ready : left0; const pri = left.filter(id => L.isDue(id) || L.isMistake(id)); const id = pick(pri.length && Math.random() < 0.6 ? pri : left); used.add(id); return L.Q[id]; };
  let group = [];
  return () => {
    if (focus.mode === 'vocab') { const q = vocabQ({ not: used }); if (q) used.add(q.id); return q; }   // v8.2 同一輪不重複出同一個字
    if (focus.mode === 'ids') return fresh(focus.ids);
    if (focus.mode === 'group') {
      if (!group.length) {
        const g = {}; pool().forEach(id => { const q = L.Q[id]; if (q && q.pid && q.passage && !used.has(id)) (g[q.unit + '|' + q.pid] = g[q.unit + '|' + q.pid] || []).push(id); });
        const list = Object.values(g).filter(x => x.length >= 2); if (!list.length) return null;
        group = pick(list).slice(0, 4); group.forEach(id => used.add(id));
      }
      return L.Q[group.shift()];
    }
    if (focus.mode === 'multi') return fresh(pool().filter(id => L.Q[id].type === 'multi'));
    if (focus.mode === 'hard') return fresh(pool().filter(id => L.Q[id].d === 3 && !L.Q[id].pid));
    if (focus.mode === 'mixed') { const s = pick(TA.SUBJECTS).id; return fresh((L.BY_SUBJECT[s] || []).filter(id => !L.Q[id].pid)); }
    return fresh(pool().filter(id => !L.Q[id].pid));
  };
}

/** 做 n 題。回傳 {ok, n} */
export async function drill(sp, next, n, opt) {
  opt = opt || {};
  let ok = 0, done = 0;
  for (let k = 0; k < n; k++) {
    const q0 = next(k); if (!q0) break;
    const q = L.view(q0);   // 選項順序打亂（解析代號跟著換）
    const sub = q.subject ? TA.subject(q.subject).name : q.vocab ? '單字' : '';
    const head = `第 ${k + 1} / ${n} 題${sub ? '（' + sub + '）' : ''}：`;   // 多選題的提示由 askQ 加上
    const { ok: good } = await askQ(sp, q, head, { timer: opt.timer });
    record(q, good); done++; Audio.sfx(good ? 'ok' : 'bad');
    if (good) { ok++; if (opt.praise) await ui.praise(sp, pick(opt.praise), q); }
    else await ui.explain(sp, q);
  }
  ui.passage(null);
  return { ok, n: done };
}
