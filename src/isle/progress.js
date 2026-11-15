/* 潮汐小島 · v9.19 練習成果卡：一組題目做完，照「真正寫進紀錄的變化」說這一輪前進了什麼。
   每題記錄之前先記下這一題原本的紀錄（格數、到期日、答錯過幾次），記錄完再比對：
   第一次見到、往後排了幾天、錯題在不同天答對（前進一格，或離開錯題本）、達到熟練、猜對（明天再確認）、
   還沒到期就答對（有記下但不往後排）、今天答錯過又答對（要隔天再答對）、答錯（題目記進錯題本，單字留在今天的複習）。
   不另外存檔、不多給獎勵；沒有 DOM，TA 由呼叫端傳進來（測試直接用真的學習引擎跑）。 */

const copy = r => (r ? { s: r.s || 0, due: r.due, n: r.n || 0, wr: r.wr || 0 } : null);
const OUT = 3;   // 錯題本：答錯過、格數還不到 3（和學習引擎的 isMistake 同一個條件）

/** 一題的變化：r0 記錄前、r1 記錄後（可以是 null）、t 今天的日序、mb 熟練的格數 */
export function rowOf(r0, r1, ok, conf, t, mb) {
  r1 = r1 || {};
  const first = !r0 || r0.n === 0, s0 = r0 ? r0.s : 0, s1 = r1.s || 0, mistake = !first && r0.wr > 0 && s0 < OUT;
  const up = !!ok && s1 > s0 && conf !== 'guess', stay = !!ok && !up && conf !== 'guess' && !first;
  return {
    ok: !!ok, first, up,
    fixed: up && mistake && s1 >= OUT,   // 錯題修好：離開錯題本
    mend: up && mistake && s1 < OUT,   // 錯題在不同天答對：前進一格，還在錯題本裡
    mastered: s1 >= mb && s0 < mb,
    guess: !!ok && conf === 'guess',
    early: stay && r0.due > t,   // 還沒到複習日就答對：照記，不往後排
    sameday: stay && r0.due <= t,   // 今天答錯過又答對：要隔天再答對才往後排
    days: up && r1.due != null ? r1.due - t : 0,
  };
}

/** 追蹤一組練習：pre(q) 在記錄前呼叫、post(ok, conf) 在記錄後呼叫；sid 是這組的科目（算這科的熟練題數），可以不給 */
export function tracker(TA, sid) {
  const L = TA.L, rows = [], recOf = q => (q.vocab ? TA.S.voc[q.vocab.w] : TA.S.q[q.id]);
  const before = sid && L.subjectStats ? L.subjectStats(sid).mastered : null;
  let pend = null;
  return {
    rows,
    pre(q) { pend = { q, r0: copy(recOf(q)), t: TA.U.dayNum() }; },
    post(ok, conf) { if (!pend) return; const { q, r0, t } = pend; pend = null; rows.push(Object.assign(rowOf(r0, recOf(q), ok, conf, t, L.MASTER_BOX), { vocab: !!q.vocab })); },
    summary() {
      const subj = sid && before != null ? { name: (TA.subject(sid) || {}).name || '', before, after: L.subjectStats(sid).mastered } : null;
      return summarize(rows, subj);
    },
  };
}

const range = ds => { const a = Math.min(...ds), b = Math.max(...ds); return a === b ? `${a} 天後` : `${a}–${b} 天後`; };
/** 這一組的小結：最多四行，依重要性排。整組都是單字時用「個單字」；單字答錯不進錯題本（往前退、今天到期） */
export function summarize(rows, subj) {
  const n = rows.length, ok = rows.filter(r => r.ok).length, c = k => rows.filter(r => r[k]).length;
  const voc = n > 0 && rows.every(r => r.vocab), u = voc ? ' 個單字' : ' 題';
  const ups = rows.filter(r => r.up && !r.fixed && !r.mend && !r.mastered), wq = rows.filter(r => !r.ok && !r.vocab).length, wv = rows.filter(r => !r.ok && r.vocab).length, lines = [];
  if (c('fixed')) lines.push({ k: 'fixed', icon: '✓', text: `${c('fixed')} 題錯題修好了，離開錯題本` });
  if (c('mastered')) lines.push({ k: 'master', icon: '★', text: `${c('mastered')}${u}達到熟練` });
  if (c('mend')) lines.push({ k: 'mend', icon: '↗', text: `${c('mend')} 題錯題在不同天答對，往前一格` });
  if (ups.length) lines.push({ k: 'up', icon: '→', text: `${ups.length}${u}往後排，${range(ups.map(r => r.days))}再複習` });
  if (wq) lines.push({ k: 'wrong', icon: '↺', text: `${wq} 題答錯，記進錯題本：隔天再答對才算數` });
  if (wv) lines.push({ k: 'wrong', icon: '↺', text: `${wv} 個單字答錯，留在今天的複習：隔天再答對才往後排` });
  if (c('guess')) lines.push({ k: 'guess', icon: '?', text: `${c('guess')}${u}是猜對的：明天再確認一次` });
  if (c('sameday')) lines.push({ k: 'same', icon: '·', text: `${c('sameday')}${u}今天答錯過：隔天再答對才算數` });
  if (c('early')) lines.push({ k: 'early', icon: '·', text: `${c('early')}${u}還沒到複習日：答對有記下，到期再答對才往後排` });
  return { n, ok, first: c('first'), dots: rows.map(r => r.ok), lines: lines.slice(0, 4), subj, voc };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 卡片內容（ui.card 的 sub 與 extra） */
export function cardParts(sum) {
  const u = sum.voc ? '個' : '題', sub = `${sum.n} ${sum.voc ? '個單字' : '題'}答對 ${sum.ok} ${u}${sum.first ? `，其中 ${sum.first} ${u}第一次見` : ''}`;
  const dots = `<div class="pg-dots">${sum.dots.map(o => `<i class="${o ? 'ok' : 'no'}"></i>`).join('')}</div>`;
  const list = sum.lines.length ? `<div class="pg-list">${sum.lines.map(l => `<div class="pg-${l.k}"><b>${l.icon}</b><span>${esc(l.text)}</span></div>`).join('')}</div>` : '';
  const s = sum.subj, foot = s && s.name ? `<div class="pg-sub">${esc(s.name)}已熟練 ${s.after} 題${s.after > s.before ? `（+${s.after - s.before}）` : ''}</div>` : '';
  return { sub, extra: dots + list + foot };
}
