/* 潮汐小島 · 潮汐考場與學習面板
   模擬考：依學測各科時間比例計時，可前後翻題、題號表、標記，交卷後才看詳解；多選依學測方式部分給分。
   練習組（錯題複習、弱點單元、重練錯題）：一題一題作答，答完馬上看對錯與解析。
   結果頁：分數、單元表現、逐題回顧。錯題本：依科目篩選，到期日與解析。成績統計：倒數、熱度圖、七日、科目雷達、弱點單元、模考趨勢。
   作答紀錄寫進 TA.S（q、days、exams），出題時選項順序打亂（L.view）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as figs from './figs.js';

const TA = window.TA, L = TA.L, U = TA.U;
const LET = 'ABCDEFGHIJ', TYPE = { multi: '多選題', fill: '選填題', bank: '文意選填' };
export const subj = sid => TA.subject(sid) || { name: '', color: '#7cc7ff', short: '' };
const unitOf = q => L.UNITS[(L.Q[q.id] || q).unit];
export const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const touch = () => matchMedia('(pointer: coarse)').matches;
const answered = a => a != null && a !== '' && [].concat(a).length > 0;
let keyFn = null;   // 目前考場面板的鍵盤處理（ui.setKeyHook）
export const setKeys = fn => { keyFn = fn; };   // 其他模組（voyage.js）的面板用同一個鍵盤處理

/** 打開考場面板。opt：{ onClose 關閉時清理, guard 按 ✕ 或 Esc 時先問（回傳 Promise<boolean>） } */
export function open(title, body, opt) {
  opt = opt || {};
  ui.panel(title, body, { cls: 'hall-p', guard: opt.guard, onClose: () => { keyFn = null; ui.setKeyHook(null); opt.onClose && opt.onClose(); } });
  ui.setKeyHook(e => {
    if (e.code === 'Escape' && opt.guard) { e.preventDefault(); ui.requestClose(); return true; }
    if (keyFn && keyFn(e)) return true;
    const a = document.activeElement;   // 在輸入框打字：字母交給輸入框，不要被島上的快捷鍵（I、F 會關閉面板）攔走
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'range' && e.code !== 'Escape' && e.code !== 'Tab');
  });
}
/** 面板裡的確認框（對話框會被面板蓋住，所以畫在面板裡） */
export function confirmIn(host, title, text, okLabel) {
  return new Promise(res => {
    const ov = ui.el('div', 'hall-ov', `<div class="hov-box"><b>${ui.esc(title)}</b><p>${ui.esc(text)}</p><div class="hov-act"><button type="button" class="btn ghost">取消</button><button type="button" class="btn">${ui.esc(okLabel || '確定')}</button></div></div>`);
    const [no, yes] = ov.querySelectorAll('button'), done = v => { ov.remove(); keyFn = prev; res(v); }, prev = keyFn;
    no.onclick = () => done(false); yes.onclick = () => done(true);
    keyFn = e => { if (e.code === 'Enter') { done(true); return true; } if (e.code === 'Escape') { done(false); return true; } return true; };
    host.appendChild(ov); yes.focus();
  });
}
/** 單元筆記抽屜（畫在考場面板裡，不換掉面板） */
export function notesIn(host, unit) {
  if (!unit) return;
  const ov = ui.el('div', 'hall-ov notes', `<div class="hov-box wide"><b>${ui.esc(unit.name)} · 單元筆記</b><div class="hov-notes">${(unit.notes || []).map(n => `<div class="letter-note"><b>${ui.rich(n.t)}</b><div>${ui.rich(n.b)}</div></div>`).join('') || '<p class="muted">這個單元還沒有筆記。</p>'}</div><div class="hov-act"><button type="button" class="btn">看完了</button></div></div>`);
  const prev = keyFn, done = () => { ov.remove(); keyFn = prev; };
  ov.querySelector('button').onclick = done; keyFn = e => { if (e.code === 'Escape' || e.code === 'Enter') { done(); return true; } return true; };
  host.appendChild(ov);
}

/** 互動示意圖疊在面板裡（考場的題目還在後面，關掉就回來；不能用 figs.open，那會換掉整個考場面板） */
export function figIn(host, f) {
  const ov = ui.el('div', 'hall-ov fig', `<div class="hov-box wide fig-box"><b>📐 ${ui.esc(f.title)}</b><iframe class="fig-frame" sandbox="allow-scripts" title="${ui.esc(f.title)}"></iframe><div class="hov-act"><button type="button" class="btn">關閉</button></div></div>`);
  ov.querySelector('iframe').src = figs.url(f); figs.mark();
  const prev = keyFn, done = () => { ov.remove(); keyFn = prev; };
  ov.querySelector('button').onclick = done; keyFn = e => { if (e.code === 'Escape') { done(); return true; } return true; };
  host.appendChild(ov);
}

/* ---------- 題目 ---------- */
/** 畫一道題。opt：{ no 題號字樣, pick 目前的答案, onPick(k), onFill(v), onEnter() }，回傳 { el, mark(ok, ans) 標出對錯 } */
export function renderQ(q, opt) {
  opt = opt || {};
  const s = subj(q.subject || (L.Q[q.id] || {}).subject), u = unitOf(q);
  const wrap = ui.el('div', 'hq' + (q.passage ? ' split' : ''));
  if (q.passage) wrap.appendChild(ui.el('aside', 'hq-pass', `<b>閱讀材料</b><div>${ui.rich(q.passage)}</div>`));
  const card = ui.el('div', 'hq-card');
  card.appendChild(ui.el('div', 'hq-meta', `<span class="hq-sub" style="--c:${s.color}">${ui.esc(s.name)}</span>${u ? `<span>${ui.esc(u.name)}</span>` : ''}<span class="hq-d">${'★'.repeat(q.d || 1)}</span>${TYPE[q.type] ? `<span class="hq-type">${TYPE[q.type]}</span>` : ''}${opt.no ? `<span class="hq-no">${opt.no}</span>` : ''}`));
  card.appendChild(ui.el('div', 'hq-stem', ui.rich(q.q)));
  let btns = [], inp = null;
  if (q.type === 'fill') {
    const box = ui.el('div', 'hq-fillbox');
    inp = document.createElement('input'); inp.className = 'hq-fill'; inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.placeholder = '輸入答案：整數、分數（a/b）或小數';
    if (touch()) inp.inputMode = 'none';   // 觸控裝置用下面的數字鍵盤，不跳出系統鍵盤
    if (opt.pick != null) inp.value = opt.pick;
    inp.addEventListener('input', () => opt.onFill && opt.onFill(inp.value.trim()));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); opt.onEnter && opt.onEnter(); } });
    box.appendChild(inp);
    if (touch()) {
      const pad = ui.el('div', 'fill-pad');
      ['7', '8', '9', '⌫', '4', '5', '6', '−', '1', '2', '3', '/', '0', '.', '清除'].forEach(k => {
        const b = ui.el('button', 'fill-k' + (/[0-9.]/.test(k) ? '' : ' fn'), k); b.type = 'button';
        b.onclick = () => { if (inp.disabled) return; let v = inp.value; if (k === '⌫') v = v.slice(0, -1); else if (k === '清除') v = ''; else if (k === '−') v = v.startsWith('-') ? v.slice(1) : '-' + v; else if (v.length < 12) v += k; inp.value = v; opt.onFill && opt.onFill(v.trim()); Audio.sfx('tick'); };
        pad.appendChild(b);
      });
      box.appendChild(pad);
    }
    card.appendChild(box);
  } else {
    const long = q.o.some(o => ui.plain(o).length > 24) && q.o.length <= 5;
    const list = ui.el('div', 'hq-opts' + (long ? ' long' : '') + (q.o.length > 5 ? ' bank' : ''));
    const picked = [].concat(opt.pick == null ? [] : opt.pick);
    btns = q.o.map((o, k) => {
      const b = ui.el('button', 'hq-opt' + (picked.includes(k) ? ' on' : ''), `<kbd>${LET[k]}</kbd><span>${ui.rich(o)}</span>`); b.type = 'button';
      b.onclick = () => opt.onPick && opt.onPick(k);
      list.appendChild(b); return b;
    });
    card.appendChild(list);
  }
  wrap.appendChild(card);
  return {
    el: wrap, card, input: inp,
    setPick(p) { const pk = [].concat(p == null ? [] : p); btns.forEach((b, k) => b.classList.toggle('on', pk.includes(k))); },
    mark(ok, ans) {
      if (inp) { inp.disabled = true; inp.classList.add(ok ? 'right' : 'wrong'); return; }
      const key = [].concat(q.a), pk = [].concat(ans == null ? [] : ans);
      btns.forEach((b, k) => { b.disabled = true; b.classList.remove('on'); b.classList.add(key.includes(k) ? 'key' : pk.includes(k) ? 'miss' : 'dim'); });
    },
  };
}
export const keyText = q => q.type === 'fill' ? String([].concat(q.ans)[0]) : [].concat(q.a).map(k => LET[k]).join('');
/** 鍵盤選項：1–9、0、A–J */
export const keyIndex = e => { if (/^(Digit|Numpad)[0-9]$/.test(e.code)) { const n = +e.code.slice(-1); return n === 0 ? 9 : n - 1; } if (/^Key[A-J]$/.test(e.code)) return e.code.charCodeAt(3) - 65; return -1; };

/* ---------- 模擬考 ---------- */
/** 模擬考設定：考科、題數、限時、最近成績 */
export function openMock() {
  let group = TA.GROUPS.includes('社會') ? '社會' : TA.GROUPS[0], n = 20;
  const body = ui.el('div', 'hall hs');
  const paint = () => {
    const hist = TA.S.exams.slice(-8).reverse();
    body.innerHTML = `<div class="hall-scroll">
      <p class="hs-lead">依學測各科的時間比例計時。作答時不顯示對錯，可以前後翻題、標記；交卷後看分數、單元表現與逐題詳解。多選題依學測方式部分給分（錯 1 個選項得 0.6、錯 2 個得 0.2）。</p>
      <div class="hs-label">考科</div><div class="hs-grid g5">${TA.GROUPS.map(g => { const subs = L.MOCK[g].subjects, tot = subs.reduce((a, s) => a + (L.BY_SUBJECT[s] || []).length, 0); return `<button type="button" class="hs-pick${g === group ? ' on' : ''}" data-g="${g}" style="--c:${subj(subs[0]).color}"><b>${g}</b><small>${tot} 題題庫</small></button>`; }).join('')}</div>
      <div class="hs-label">題數</div><div class="hs-grid g3">${[[10, '小考'], [20, '半卷'], [30, '大考']].map(([k, t]) => `<button type="button" class="hs-pick${k === n ? ' on' : ''}" data-n="${k}"><b>${k} 題</b><small>${t}</small></button>`).join('')}</div>
      <p class="hs-info">限時 <b>${fmtT(L.mockSeconds(group, n))}</b>（依學測${group} ${L.MOCK[group].realMin} 分鐘、約 ${L.MOCK[group].realN} 題換算）</p>
      ${hist.length ? `<div class="hs-label">最近成績</div><div class="hs-hist">${hist.map(e => `<div><span>${new Date(e.at).toLocaleDateString('zh-TW')}</span><b>${e.group}</b><span>${e.n} 題</span><i style="--k:${(e.pts / e.n).toFixed(3)}"></i><b>${Math.round(e.pts / e.n * 100)} 分</b></div>`).join('')}</div>` : ''}
    </div><div class="hx-foot"><span class="muted">準備好再開始，開始後就會計時。</span><button type="button" class="btn go">開始作答</button></div>`;
    body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { group = b.dataset.g; Audio.sfx('tick'); paint(); });
    body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { n = +b.dataset.n; Audio.sfx('tick'); paint(); });
    body.querySelector('.go').onclick = () => runMock(group, n);
  };
  paint();
  open('潮汐考場 · 模擬考', body);
  keyFn = e => { if (e.code === 'Enter') { runMock(group, n); return true; } return false; };
}

function runMock(group, n) {
  const ids = L.pickMock(group, n), views = ids.map(id => L.view(L.Q[id]));
  if (!ids.length) { ui.toast('這一科的題目還沒準備好'); return; }
  const limit = L.mockSeconds(group, n), t0 = Date.now(), answers = {}, flags = {};
  let i = 0, done = false, clock = 0;
  const body = ui.el('div', 'hall hx');
  body.innerHTML = `<div class="hx-bar"><b class="hx-title">${group} 模擬考 · ${ids.length} 題</b><span class="hx-timer"></span></div><div class="hall-scroll hx-main"></div>
    <div class="hx-foot"><button type="button" class="btn ghost prev">← 上一題</button><button type="button" class="btn ghost flag">標記</button><div class="hx-pal"></div><button type="button" class="btn ghost next">下一題 →</button><button type="button" class="btn submit">交卷</button></div>`;
  const main = body.querySelector('.hx-main'), pal = body.querySelector('.hx-pal'), timer = body.querySelector('.hx-timer'), flagBtn = body.querySelector('.flag');
  let view = null;
  const paintPal = () => { pal.innerHTML = ids.map((id, k) => `<button type="button" data-k="${k}" class="${k === i ? 'cur ' : ''}${answered(answers[id]) ? 'done ' : ''}${flags[id] ? 'flag' : ''}">${k + 1}</button>`).join(''); flagBtn.classList.toggle('on', !!flags[ids[i]]); };
  const show = () => {
    const id = ids[i], q = views[i];
    view = renderQ(q, {
      no: `${i + 1} / ${ids.length}`, pick: answers[id],
      onPick: k => { if (q.type === 'multi') { const a = [].concat(answers[id] || []); const at = a.indexOf(k); if (at >= 0) a.splice(at, 1); else a.push(k); answers[id] = a.sort((x, y) => x - y); } else answers[id] = k; view.setPick(answers[id]); Audio.sfx('tick'); paintPal(); },
      onFill: v => { if (v) answers[id] = v; else delete answers[id]; paintPal(); },
      onEnter: () => go(i + 1),
    });
    main.innerHTML = ''; main.appendChild(view.el); main.scrollTop = 0; paintPal();
    if (view.input && !touch()) setTimeout(() => view.input.focus(), 30);
  };
  const go = k => { if (k < 0 || k >= ids.length || done) return; i = k; Audio.sfx('tick'); show(); };
  const tick = () => { const left = Math.max(0, limit - (Date.now() - t0) / 1000); timer.textContent = `⏱ ${fmtT(left)}`; timer.classList.toggle('warn', left < 60); if (left <= 0) submit(true); };
  const submit = async force => {
    if (done) return;
    const blank = ids.filter(id => !answered(answers[id])).length;
    if (!force && !(await confirmIn(body, '確定交卷？', blank ? `還有 ${blank} 題沒作答，沒作答的題目以 0 分計。` : '全部作答完畢，交卷後會顯示分數與詳解。', '交卷'))) return;
    if (done) return;
    done = true; clearInterval(clock);
    let xp = 0, correct = 0;
    const log = ids.map((id, k) => {
      const q = views[k], a = answers[id], has = answered(a), ok = has && L.check(q, a), score = has ? L.multiScore(q, a) : 0;
      if (has) xp += L.record(q, ok, { silent: true }).xp;
      if (ok) correct++;
      return { id, v: q, ans: has ? a : null, ok, score };
    });
    const pts = log.reduce((s, x) => s + x.score, 0), pct = Math.round(pts / ids.length * 100), secs = Math.round((Date.now() - t0) / 1000);
    const units = {}; log.forEach(x => { const u = L.Q[x.id].unit; units[u] = units[u] || [0, 0]; units[u][1]++; if (x.ok) units[u][0]++; });
    TA.S.exams.push({ at: Date.now(), group, n: ids.length, c: correct, pts, secs, units });
    xp += L.gain(ids.length * 3, 0).xp; const gems = Math.round(pct / 5); if (gems) L.gain(0, gems);
    L.checkAch(); TA.Store.save();
    showResult({ mode: 'mock', title: `${group} 模擬考`, group, total: ids.length, correct, pct, secs, limit, log, xp, gems, again: () => runMock(group, ids.length) });
  };
  body.querySelector('.prev').onclick = () => go(i - 1);
  body.querySelector('.next').onclick = () => go(i + 1);
  flagBtn.onclick = () => { flags[ids[i]] = !flags[ids[i]]; Audio.sfx('tick'); paintPal(); };
  body.querySelector('.submit').onclick = () => submit(false);
  pal.onclick = e => { const b = e.target.closest('[data-k]'); if (b) go(+b.dataset.k); };
  const guard = () => done ? Promise.resolve(true) : confirmIn(body, '離開模擬考？', '這次的作答不會保存，也不會計分。', '離開');
  open(`潮汐考場 · ${group} 模擬考`, body, { guard, onClose: () => { done = true; clearInterval(clock); } });
  keyFn = e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return false;
    if (e.code === 'ArrowLeft') { go(i - 1); return true; } if (e.code === 'ArrowRight' || e.code === 'Enter') { go(i + 1); return true; }
    const k = keyIndex(e); if (k >= 0 && views[i].o && k < views[i].o.length) { const b = main.querySelectorAll('.hq-opt')[k]; if (b) b.click(); return true; }
    return false;
  };
  show(); tick(); clock = setInterval(tick, 1000);
}

/* ---------- 練習組：一題一題作答、答完看解析 ---------- */
/** 依序作答一組題目（錯題複習、弱點單元、重練錯題、單元試煉、每日潮汐）。
    opt：{ again 再練一次, mode 結果頁類型, from 從第幾題開始（每日潮汐續做）, onAnswer(i, ok) 每答一題, finish(r) 結算前調整結果（星等、潮晶…） } */
export function runSet(title, ids, opt) {
  opt = opt || {};
  ids = (ids || []).filter(id => L.Q[id]);
  if (!ids.length) { ui.toast('目前沒有可以練習的題目'); return; }
  const t0 = Date.now(), log = [];
  let i = Math.max(0, Math.min(opt.from || 0, ids.length - 1)), combo = 0, xp = 0, correct = 0, locked = false, cur = null, sel = [], fillV = '';
  const body = ui.el('div', 'hall hx');
  body.innerHTML = `<div class="hx-bar"><b class="hx-title">${ui.esc(title)}</b><span class="hx-prog"></span></div><div class="hall-scroll hx-main"></div><div class="hx-foot"><span class="muted hx-hint"></span><button type="button" class="btn act"></button></div>`;
  const main = body.querySelector('.hx-main'), act = body.querySelector('.act'), hint = body.querySelector('.hx-hint'), prog = body.querySelector('.hx-prog');
  let view = null;
  const show = () => {
    locked = false; sel = []; fillV = ''; cur = L.view(L.Q[ids[i]]);
    prog.textContent = `${i + 1} / ${ids.length}`;
    view = renderQ(cur, {
      no: `${i + 1} / ${ids.length}`,
      onPick: k => { if (locked) return; if (cur.type === 'multi') { const at = sel.indexOf(k); if (at >= 0) sel.splice(at, 1); else sel.push(k); view.setPick(sel); Audio.sfx('tick'); paintAct(); } else answer(k); },
      onFill: v => { fillV = v; paintAct(); },
      onEnter: () => { if (!locked && fillV) answer(fillV); else if (locked) next(); },
    });
    main.innerHTML = ''; main.appendChild(view.el); main.scrollTop = 0; paintAct();
    if (view.input && !touch()) setTimeout(() => view.input.focus(), 30);
  };
  const paintAct = () => {
    if (locked) { act.textContent = i + 1 < ids.length ? '下一題 →' : '看結果'; act.disabled = false; hint.textContent = 'Enter 繼續'; return; }
    if (cur.type === 'multi') { act.textContent = '送出答案'; act.disabled = !sel.length; hint.textContent = '多選題：選好所有正確的選項再送出'; return; }
    if (cur.type === 'fill') { act.textContent = '送出答案'; act.disabled = !fillV; hint.textContent = '選填題：輸入答案後送出（Enter）'; return; }
    act.textContent = '選一個答案'; act.disabled = true; hint.textContent = '按 1–4（或 A–D）也可以作答';
  };
  const answer = ans => {
    if (locked) return; locked = true;
    const ok = L.check(cur, ans), score = L.multiScore(cur, ans);
    combo = ok ? combo + 1 : 0; if (ok) correct++;
    xp += L.record(cur, ok, { combo }).xp;
    log.push({ id: cur.id, v: cur, ans, ok, score });
    if (opt.onAnswer) opt.onAnswer(i, ok);
    Audio.sfx(ok ? 'ok' : 'bad'); view.mark(ok, ans);
    const u = unitOf(cur);
    const ex = ui.el('div', 'hq-ex' + (ok ? '' : ' bad'), `<b class="v">${ok ? '答對了！' : score > 0 ? `部分正確（學測給分 ${score}）` : '答錯了'}${ok ? '' : ` 正解 ${keyText(cur)}`}</b><div>${ui.rich(cur.e || '')}</div>${u ? '<button type="button" class="btn ghost sm notes">看單元筆記</button>' : ''}${figs.figFor(cur) ? '<button type="button" class="btn ghost sm fig">📐 示意圖</button>' : ''}`);
    if (u) ex.querySelector('.notes').onclick = () => notesIn(body, u);
    { const f = figs.figFor(cur); if (f) ex.querySelector('.fig').onclick = () => figIn(body, f); }
    view.card.appendChild(ex); ex.scrollIntoView({ block: 'nearest' });
    paintAct();
  };
  const next = () => { if (i + 1 < ids.length) { i++; show(); } else finish(); };
  const finish = () => {
    const r = { mode: opt.mode || 'set', title, total: log.length, correct, pct: Math.round(correct / Math.max(1, log.length) * 100), secs: Math.round((Date.now() - t0) / 1000), log, xp, gems: Math.round(correct / 2), again: opt.again };
    if (opt.finish) opt.finish(r);   // 單元試煉算星等、每日潮汐記完成……（可以改潮晶與結果頁的標題）
    if (r.gems) L.gain(0, r.gems);
    L.checkAch(); TA.Store.save();
    showResult(r);
  };
  act.onclick = () => { if (locked) next(); else if (cur.type === 'multi' && sel.length) answer(sel.slice().sort((a, b) => a - b)); else if (cur.type === 'fill' && fillV) answer(fillV); };
  open(title, body);
  keyFn = e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return false;
    if (e.code === 'Enter' || e.code === 'Space') { act.click(); return true; }
    const k = keyIndex(e); if (k >= 0 && !locked && cur.o && k < cur.o.length) { view.el.querySelectorAll('.hq-opt')[k].click(); return true; }
    return false;
  };
  show();
}

/* ---------- 結果與逐題回顧 ---------- */
function reviewItem(x, host, note) {
  const q = x.v || L.Q[x.id]; if (!q) return null;
  const s = subj(q.subject || (L.Q[q.id] || {}).subject), u = unitOf(q), key = [].concat(q.a), pk = [].concat(x.ans == null ? [] : x.ans);
  const ans = note || (q.type === 'fill' ? `${answered(x.ans) ? '你答 ' + ui.esc(x.ans) : '未作答'} · 正解 <b>${ui.esc(keyText(q))}</b>` : `${pk.length ? '你選 ' + pk.map(k => LET[k]).join('') : '未作答'} · 正解 <b>${keyText(q)}</b>`);
  const d = ui.el('details', 'hrv ' + (x.ok ? 'ok' : 'bad'), `<summary><i>${x.ok ? '✔' : '✘'}</i><span class="hq-sub" style="--c:${s.color}">${ui.esc(s.name)}</span><span class="hrv-q">${ui.esc(ui.plain(q.q).slice(0, 56))}${ui.plain(q.q).length > 56 ? '…' : ''}</span><span class="hrv-a">${ans}</span></summary>
    <div class="hrv-body">${q.passage ? `<details class="hrv-pass"><summary>閱讀材料</summary><div>${ui.rich(q.passage)}</div></details>` : ''}<div class="hq-stem">${ui.rich(q.q)}</div>
    ${q.o ? `<ol class="hrv-opts">${q.o.map((o, k) => `<li class="${key.includes(k) ? 'key' : pk.includes(k) ? 'pick' : ''}"><kbd>${LET[k]}</kbd><span>${ui.rich(o)}</span></li>`).join('')}</ol>` : ''}
    <div class="hq-ex"><b class="v">解析</b><div>${ui.rich(q.e || '')}</div></div>${u ? '<button type="button" class="btn ghost sm notes">看單元筆記</button>' : ''}${figs.figFor(q) ? '<button type="button" class="btn ghost sm fig">📐 示意圖</button>' : ''}</div>`);
  if (u) d.querySelector('.notes').onclick = () => notesIn(host, u);
  { const f = figs.figFor(q); if (f) d.querySelector('.fig').onclick = () => figIn(host, f); }
  return d;
}
/** 結果頁。r 可以帶 kicker、heading、sub、bigHtml（取代分數環）、onlyWrong（只列答錯的題）、extra（附加的 html） */
export function showResult(r) {
  const body = ui.el('div', 'hall hr');
  const wrong = r.log.filter(x => !x.ok), wrongIds = wrong.map(x => x.id).filter(id => L.Q[id]);
  const big = r.mode === 'mock' ? r.pct : Math.round(r.correct / Math.max(1, r.total) * 100);
  let breakdown = '';
  if (r.mode === 'mock') {
    const by = {}; r.log.forEach(x => { const u = L.Q[x.id].unit; by[u] = by[u] || [0, 0]; by[u][1]++; if (x.ok) by[u][0]++; });
    breakdown = `<div class="hs-label">單元表現（由弱到強）</div><div class="hr-break">${Object.entries(by).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([uid, [c, n]]) => { const u = L.UNITS[uid], s = subj(u.subject); return `<div class="rb-row"><span class="hq-sub" style="--c:${s.color}">${ui.esc(s.name)}</span><span class="rb-name">${ui.esc(u.name)}</span><i class="rb-bar" style="--k:${(c / n).toFixed(3)};--c:${s.color}"></i><b>${c}/${n}</b><button type="button" class="btn ghost sm" data-u="${uid}">筆記</button></div>`; }).join('')}</div>`;
  }
  body.innerHTML = `<div class="hall-scroll">
    <div class="hr-hero">${r.bigHtml || `<div class="hr-ring" style="--k:${(big / 100).toFixed(3)}"><b>${big}</b><small>${r.mode === 'mock' ? '分' : '% 正確'}</small></div>`}
      <div><div class="hr-kicker">${r.kicker || (r.mode === 'mock' ? 'MOCK EXAM' : 'PRACTICE')}</div><h2>${ui.esc(r.heading || r.title)}</h2><p class="muted">${r.sub || (r.mode === 'mock' ? `${r.total} 題 · 用時 ${fmtT(r.secs)} / ${fmtT(r.limit)}（滿分 100，多選依學測方式部分給分）` : `答對 ${r.correct} / ${r.total} 題 · 用時 ${fmtT(r.secs)}`)}</p>
      <div class="hr-stats"><span>答對 <b>${r.correct}/${r.total}</b></span><span>經驗 <b>+${r.xp}</b></span><span>潮晶 <b>+${r.gems}</b></span></div></div></div>
    ${r.extra || ''}${breakdown}<div class="hs-label">${r.onlyWrong ? '答錯的題目' : '逐題回顧'}${wrong.length ? `（答錯 ${wrong.length} 題，點開看詳解）` : '（全對！）'}</div><div class="hr-list"></div></div>
    <div class="hx-foot">${wrongIds.length ? `<button type="button" class="btn ghost retry">重練錯題 ${wrongIds.length}</button>` : ''}${r.again ? '<button type="button" class="btn ghost again">再來一次</button>' : ''}<span class="spacer"></span><button type="button" class="btn done">完成</button></div>`;
  const list = body.querySelector('.hr-list');
  (r.onlyWrong ? wrong : r.log).forEach(x => { const d = reviewItem(x, body); if (d) list.appendChild(d); });
  const firstBad = list.querySelector('.hrv.bad'); if (firstBad) firstBad.open = true;
  body.querySelectorAll('[data-u]').forEach(b => b.onclick = () => notesIn(body, L.UNITS[b.dataset.u]));
  if (wrongIds.length) body.querySelector('.retry').onclick = () => runSet('重練錯題', wrongIds);
  if (r.again) body.querySelector('.again').onclick = () => r.again();
  body.querySelector('.done').onclick = () => ui.closePanel();
  open(r.mode === 'mock' ? '潮汐考場 · 成績' : r.title + ' · 結果', body);
  if ((r.mode === 'mock' && r.pct >= 80) || (r.mode === 'set' && r.correct === r.total && r.total >= 5)) Audio.sfx('catch'); else Audio.sfx('coin');
}

/* ---------- 錯題本 ---------- */
export function openMistakes(sid) {
  let filter = sid || '';
  const body = ui.el('div', 'hall hm');
  const paint = () => {
    const counts = {}; TA.SUBJECTS.forEach(s => { counts[s.id] = L.pickReview(9999, s.id).length; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0), ids = L.pickReview(9999, filter || null), today = U.dayNum();
    const fixed = Object.values(TA.S.q).filter(r => r.wr > 0 && r.s >= 3).length;
    body.innerHTML = `<div class="hall-scroll">
      <div class="hm-hero"><div><b>${total}</b><small>待複習</small></div><div><b>${fixed}</b><small>已修復</small></div><div><b>${L.dueList().length}</b><small>今天到期</small></div></div>
      <p class="muted hm-rule">答錯的題目會回到第 0 格；之後每次「到期時」答對升一格，間隔 1→2→4→8→16→35 天，升到第 3 格就算修復。同一天重複答對只算一次，剛答過的題目 20 分鐘內不會再出。</p>
      <div class="hm-chips"><button type="button" data-s="" class="${filter ? '' : 'on'}">全部 <b>${total}</b></button>${TA.SUBJECTS.filter(s => counts[s.id]).map(s => `<button type="button" data-s="${s.id}" class="${filter === s.id ? 'on' : ''}" style="--c:${s.color}">${s.name} <b>${counts[s.id]}</b></button>`).join('')}</div>
      <div class="hr-list"></div></div>
      <div class="hx-foot"><span class="muted">${ids.length > 80 ? `先列出最需要複習的 80 題` : ''}</span><span class="spacer"></span><button type="button" class="btn go"${ids.length ? '' : ' disabled'}>開始複習（最多 15 題）</button></div>`;
    const list = body.querySelector('.hr-list');
    if (!ids.length) list.innerHTML = '<p class="muted hm-empty">這片海域很乾淨，沒有待複習的錯題。</p>';
    ids.slice(0, 80).forEach(id => { const r = L.rec(id); const d = reviewItem({ id, ok: false, ans: null }, body, `答錯 ${r.wr} 次 · ${r.due <= today ? '今天到期' : `${r.due - today} 天後到期`}`); if (d) list.appendChild(d); });
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { filter = b.dataset.s; Audio.sfx('tick'); paint(); });
    body.querySelector('.go').onclick = () => { const pick = L.pickReview(15, filter || null); runSet(filter ? `${subj(filter).name}錯題複習` : '錯題複習', pick, { again: () => openMistakes(filter) }); };
  };
  paint();
  open('錯題本', body);
}

/* ---------- 成績統計（作戰室） ---------- */
export function openStats() {
  const S = TA.S, ov = L.overall(), today = U.dayNum(), body = ui.el('div', 'hall hst');
  const days = U.daysUntil(S.profile.examDate), hours = Math.round((S.focus.min || 0) / 6) / 10;
  // 熱度圖：過去 12 週到學測當天
  const examN = U.keyToNum(S.profile.examDate), start = today - 83, endN = examN >= today && examN - today <= 200 ? examN : today;
  let heat = ''; const firstDow = new Date(start * 86400000).getUTCDay();
  for (let k = 0; k < firstDow; k++) heat += '<i class="pad"></i>';
  for (let n = start; n <= endN; n++) {
    const key = U.numToKey(n);
    if (n > today) { heat += `<i class="fut${n === examN ? ' exam' : ''}" title="${key}${n === examN ? '：學測' : ''}"></i>`; continue; }
    const d = S.days[key] || {}, sc = (d.q || 0) + (d.voc || 0) / 4 + (d.min || 0) / 3, lv = sc === 0 ? 0 : sc < 10 ? 1 : sc < 25 ? 2 : sc < 50 ? 3 : 4;
    heat += `<i class="l${lv}${n === today ? ' today' : ''}" title="${key}：${d.q || 0} 題 · ${d.voc || 0} 字 · ${d.min || 0} 分"></i>`;
  }
  const week = []; for (let k = 6; k >= 0; k--) { const key = U.numToKey(today - k), d = S.days[key] || {}; week.push({ n: today - k, q: d.q || 0, c: d.c || 0 }); }
  const mx = Math.max(10, ...week.map(w => w.q));
  // 科目雷達（五大考科的平均精熟度）
  const R = 80, cx = 110, cy = 100, G = TA.GROUPS, val = g => { const ss = TA.SUBJECTS.filter(s => s.group === g).map(s => L.subjectStats(s.id).mastery); return ss.length ? ss.reduce((a, b) => a + b, 0) / ss.length : 0; };
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / G.length; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const radar = `<svg viewBox="0 0 220 210" class="hst-radar">${[0.25, 0.5, 0.75, 1].map(k => `<polygon points="${G.map((_, i) => pt(i, R * k).join(',')).join(' ')}" class="rd-ring"/>`).join('')}${G.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="rd-ax"/>`).join('')}<polygon points="${G.map((g, i) => pt(i, R * Math.max(0.04, val(g))).join(',')).join(' ')}" class="rd-shape"/>${G.map((g, i) => { const [x, y] = pt(i, R + 15); return `<text x="${x}" y="${y + 4}" text-anchor="middle" class="rd-l">${g} ${Math.round(val(g) * 100)}%</text>`; }).join('')}</svg>`;
  const weak = L.weakUnits(8).filter(w => w.st.attempts);
  const ex = S.exams.slice(-12);
  let trend = '';
  if (ex.length >= 2) {
    const W = 520, H = 150, ys = e => H - 18 - (e.pts / e.n) * (H - 36), xs = i => 20 + i * (W - 40) / (ex.length - 1);
    trend = `<svg viewBox="0 0 ${W} ${H}" class="hst-trend"><line x1="20" x2="${W - 20}" y1="${H - 18 - 0.8 * (H - 36)}" y2="${H - 18 - 0.8 * (H - 36)}" class="tl-80"/><text x="${W - 20}" y="${H - 22 - 0.8 * (H - 36)}" text-anchor="end" class="tl-t">80 分</text><polyline points="${ex.map((e, i) => xs(i) + ',' + ys(e)).join(' ')}" class="tl-line"/>${ex.map((e, i) => `<circle cx="${xs(i)}" cy="${ys(e)}" r="4" class="tl-dot"><title>${new Date(e.at).toLocaleDateString('zh-TW')} ${e.group} ${Math.round(e.pts / e.n * 100)} 分</title></circle>`).join('')}</svg>`;
  }
  const tile = (v, l, c) => `<div class="hst-tile" style="--c:${c}"><b>${v}</b><small>${l}</small></div>`;
  body.innerHTML = `<div class="hall-scroll">
    <div class="hst-cd"><div class="hst-days"><b>${Math.max(0, days)}</b><small>天</small></div><div><h2>距離學測</h2><label>考試日期 <input type="date" class="hst-date" value="${S.profile.examDate}"></label><p class="muted">${days > 0 ? `相當於 ${Math.floor(days / 7)} 週又 ${days % 7} 天。每天完成 ${S.profile.dailyGoal} 題，考前還能再練 ${(days * S.profile.dailyGoal).toLocaleString()} 題。` : '祝你考試順利！'}</p></div></div>
    <div class="hst-tiles">${tile(ov.attempts.toLocaleString(), '總作答次數', '#5b8fd6')}${tile(ov.attempts ? Math.round(ov.correct / ov.attempts * 100) + '%' : '—', '總正確率', '#2fb38f')}${tile(`${ov.mastered.toLocaleString()}/${ov.total.toLocaleString()}`, '熟練題目', '#e0a020')}${tile(ov.vocabMastered.toLocaleString(), '熟練單字', '#2fb38f')}${tile(hours, '專注小時', '#9a7ad8')}${tile(S.streak.best, '最長連續天數', '#ff8a4c')}</div>
    <div class="hs-label">學習航跡（近 12 週 → 學測）</div><div class="hst-heat">${heat}</div><div class="hst-legend"><small>少</small>${[0, 1, 2, 3, 4].map(l => `<i class="l${l}"></i>`).join('')}<small>多</small><i class="fut"></i><small>還沒到</small><i class="fut exam"></i><small>學測</small></div>
    <div class="hst-two"><div><div class="hs-label">最近七天（共 ${week.reduce((a, w) => a + w.q, 0)} 題）</div><div class="hst-week">${week.map(w => `<div><small>${w.q || ''}</small><div class="col"><i style="height:${w.q / mx * 100}%"><i class="ok" style="height:${w.q ? w.c / w.q * 100 : 0}%"></i></i></div><small>${'日一二三四五六'[new Date(w.n * 86400000).getUTCDay()]}</small></div>`).join('')}</div><div class="hst-legend"><i class="a"></i><small>作答</small><i class="b"></i><small>答對</small></div></div>
      <div><div class="hs-label">五大考科精熟度</div>${radar}</div></div>
    <div class="hs-label">各科</div><div class="hst-subj">${TA.SUBJECTS.map(s => { const st = L.subjectStats(s.id); return `<div><span class="hq-sub" style="--c:${s.color}">${s.name}</span><span class="bar"><small>精熟</small><i style="--k:${st.mastery.toFixed(3)};--c:${s.color}"></i></span><span class="bar"><small>正確率</small><i style="--k:${st.acc.toFixed(3)};--c:${s.color}"></i></span><b>${st.seen}/${st.total}</b></div>`; }).join('')}</div>
    <div class="hs-label">弱點單元（依正確率與精熟度排序）</div><div class="hst-weak">${weak.length ? weak.map(w => `<div><span class="hq-sub" style="--c:${w.subject.color}">${w.subject.name}</span><b>${ui.esc(w.unit.name)}</b><span>${Math.round(w.st.acc * 100)}%</span><button type="button" class="btn ghost sm" data-n="${w.id}">筆記</button><button type="button" class="btn sm" data-p="${w.id}">練 10 題</button></div>`).join('') : '<p class="muted">多作答幾題，這裡會列出最需要補強的單元。</p>'}</div>
    ${trend ? `<div class="hs-label">模考趨勢（最近 ${ex.length} 次）</div>${trend}` : '<p class="muted">考過兩次以上模擬考，這裡會畫出分數趨勢。</p>'}
  </div>`;
  body.querySelector('.hst-date').onchange = e => { if (e.target.value) { S.profile.examDate = e.target.value; TA.Store.save(); openStats(); } };
  body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => notesIn(body, L.UNITS[b.dataset.n]));
  body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const u = L.UNITS[b.dataset.p]; runSet(`${u.name} · 單元練習`, L.pickUnit(u.id, 10), { again: () => openStats() }); });
  open('成績統計', body);
}
