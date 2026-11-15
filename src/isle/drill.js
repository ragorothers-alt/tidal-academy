/* 潮汐小島 · 連續作答：在對話框裡做一組題目（支援多選題與題組閱讀材料），寫入共用的間隔複習紀錄。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { record, pick, vocabQ, askQ, confPlan, confNote, askWhy } from './quiz.js';
import * as progress from './progress.js';

const TA = window.TA, L = TA.L;
/** v9.19 練習成果卡：一組做完（至少 3 題）照實際寫進紀錄的變化說這一輪前進了什麼；按 E 或點一下就關 */
export async function showProgress(tr) {
  if (!tr || tr.rows.length < 3) return;
  const sum = tr.summary(), p = progress.cardParts(sum);
  await ui.card({ title: '這一組的收穫', sub: p.sub, extra: p.extra, cls: 'prog', sfx: 'open' });
}

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

/** 做 n 題。回傳 {ok, n, tr}。opt.card：追蹤這組的實際進展（tr），呼叫端說完結果再 showProgress(tr)；opt.sid 是這組的科目，卡片附上這科的熟練題數 */
export async function drill(sp, next, n, opt) {
  opt = opt || {};
  let ok = 0, done = 0, why = false;
  const cf = confPlan(n, opt);   // v8.4 一組裡有 2 題先問把握
  const tr = opt.card ? progress.tracker(TA, opt.sid || null) : null;
  for (let k = 0; k < n; k++) {
    const q0 = next(k); if (!q0) break;
    const q = L.view(q0);   // 選項順序打亂（解析代號跟著換）
    const sub = q.subject ? TA.subject(q.subject).name : q.vocab ? '單字' : '';
    const head = `第 ${k + 1} / ${n} 題${sub ? '（' + sub + '）' : ''}：`;   // 多選題的提示由 askQ 加上
    const { ok: good, conf, stop } = await askQ(sp, q, head, { timer: opt.timer, conf: cf.has(k), stop: !!opt.stop && n >= 4 && q.type !== 'fill' });
    if (stop) { ui.passage(null); ui.toast(done ? `先到這裡：做了 ${done} 題，有記錄下來` : '先到這裡'); return { ok, n: done, stopped: true, tr }; }   // v8.6 中途離開：做過的照常記錄
    if (tr) tr.pre(q);
    record(q, good, { conf }); done++; Audio.sfx(good ? 'ok' : 'bad');
    if (tr) tr.post(good, conf);
    const lead = confNote(good, conf);
    if (good) { ok++; if (opt.praise) await ui.praise(sp, pick(opt.praise), q); }
    else { await ui.explain(sp, q, lead); if (!why && !opt.timer) { why = true; await askWhy(sp, q); } }
  }
  ui.passage(null);
  return { ok, n: done, tr };   // tr：opt.card 的成果追蹤，呼叫端說完結果再 showProgress(tr)
}
