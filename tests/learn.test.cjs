/* 學習引擎測試：node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
function boot(saved, at = new Date(2026, 9, 26, 10).getTime()) {
  const store = new Map();
  let now = at;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  if (saved) store.set('tidal-academy-v2', JSON.stringify(saved));
  const ctx = {
    console, Math, Date: Clock, JSON, Intl,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    addEventListener() {}, setTimeout: (fn) => 0, clearTimeout() {}
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  load('src/core/registry.js');
  fs.readdirSync(path.join(ROOT, 'src/data')).filter(f => f.endsWith('.js')).sort().forEach(f => load('src/data/' + f));
  ['util', 'store', 'learn'].forEach(n => load(`src/core/${n}.js`));
  ctx.TA.Store.load(); ctx.TA.L.index();
  return { TA: ctx.TA, store, ctx, setNow: t => { now = t; } };
}

test('題庫載入並建立索引', () => {
  const { TA } = boot();
  assert.ok(TA.L.ALL.length >= 1200, '至少 1200 題');
  assert.ok(TA.L.VOCAB.length >= 900, '至少 900 單字');
  TA.SUBJECTS.forEach(s => assert.ok(TA.L.BY_SUBJECT[s.id].length >= 80, s.name + ' 至少 80 題'));
  for (const id of TA.L.ALL.slice(0, 50)) { const q = TA.L.Q[id]; assert.ok(q.unit && q.subject); }
});

test('單選與多選判分（學測多選給分）', () => {
  const { TA } = boot();
  const single = { a: 2, o: ['a', 'b', 'c', 'd'] };
  assert.equal(TA.L.check(single, 2), true);
  assert.equal(TA.L.check(single, 1), false);
  const multi = { type: 'multi', a: [0, 2, 4], o: ['a', 'b', 'c', 'd', 'e'] };
  assert.equal(TA.L.check(multi, [4, 0, 2]), true);
  assert.equal(TA.L.multiScore(multi, [0, 2, 4]), 1);
  assert.equal(TA.L.multiScore(multi, [0, 2]), 0.6);        // 錯 1 個選項
  assert.equal(TA.L.multiScore(multi, [0]), 0.2);           // 錯 2 個
  assert.equal(TA.L.multiScore(multi, [1, 3]), 0);          // 錯 5 個
  assert.equal(TA.L.multiScore(multi, []), 0);              // 未作答：錯 3 個 → 0
});

test('間隔複習：到期答對才升格、答錯歸零並進錯題本', () => {
  const { TA, setNow } = boot();
  const L = TA.L, q = L.Q[L.ALL[0]], today = TA.U.dayNum(), r = () => L.rec(q.id);
  L.record(q, true, { silent: true });
  assert.equal(r().s, 2, '首次答對直接進第 2 格');
  assert.equal(r().due, today + 2);
  L.record(q, true, { silent: true });
  assert.equal(r().s, 2, '還沒到期就又答對：不升格');
  assert.equal(r().due, today + 2);
  L.record(q, false, { silent: true });
  assert.equal(r().s, 0);
  assert.equal(r().due, today);
  assert.ok(L.isMistake(q.id));
  assert.ok(L.mistakes().includes(q.id));
  assert.ok(L.pickReview(50).includes(q.id));
  L.record(q, true, { silent: true }); L.record(q, true, { silent: true }); L.record(q, true, { silent: true });
  assert.equal(r().s, 0, '答錯當天連對三次仍不升格');
  assert.ok(L.isMistake(q.id));
  for (const day of [27, 28, 30]) { setNow(new Date(2026, 9, day, 10).getTime()); L.record(q, true, { silent: true }); }
  assert.equal(r().s, 3);
  assert.equal(L.isMistake(q.id), false, '在不同天答對、升到第 3 格才算修復');
  r().s = 6; r().due = TA.U.dayNum();
  assert.ok(L.isDue(q.id), '熟練的題目到期一樣要抽查');
});

test('選填題（數學）：數值相等就算對', () => {
  const { TA } = boot();
  const L = TA.L;
  assert.equal(L.num('3/4'), 0.75); assert.equal(L.num('−2'), -2); assert.equal(L.num(' 12 '), 12); assert.equal(L.num('.5'), 0.5);
  assert.ok(Number.isNaN(L.num('abc'))); assert.ok(Number.isNaN(L.num('1/0'))); assert.ok(Number.isNaN(L.num('')));
  const q = { type: 'fill', ans: '3/4' };
  assert.equal(L.check(q, '3/4'), true); assert.equal(L.check(q, '0.75'), true); assert.equal(L.check(q, '6/8'), true);
  assert.equal(L.check(q, '4/3'), false); assert.equal(L.check(q, ''), false); assert.equal(L.check(q, -1), false);
  assert.equal(L.multiScore(q, '0.75'), 1); assert.equal(L.multiScore(q, '1'), 0);
  assert.equal(L.check({ type: 'fill', ans: ['-12', '−12'] }, '-12'), true);
  assert.equal(L.view(q), q, '選填題沒有選項，不打亂');
});

test('文意選填：十個選項的單選', () => {
  const { TA } = boot();
  const L = TA.L, q = { type: 'bank', pid: 'p1', o: 'abcdefghij'.split(''), a: 7, q: '第 1 格', e: '' };
  assert.equal(L.check(q, 7), true); assert.equal(L.check(q, 2), false); assert.equal(L.multiScore(q, 7), 1);
  assert.equal(L.view(q), q, '同一篇共用 (A)–(J)：選項順序不打亂');
});

test('剛答過的題目先冷卻、複習清單排到最後', () => {
  const { TA } = boot();
  const L = TA.L, [a, b] = [L.Q[L.ALL[0]], L.Q[L.ALL[1]]];
  L.record(a, false, { silent: true }); L.record(b, false, { silent: true });
  assert.ok(L.cooling(a.id));
  L.rec(b.id).last -= 30 * 60000; L.rec(b.id).lastWrong -= 30 * 60000;   // b 是半小時前答錯的
  assert.equal(L.cooling(b.id), false);
  const list = L.pickReview(10);
  assert.ok(list.indexOf(b.id) < list.indexOf(a.id), '冷卻中的題目排在後面');
});

test('出題時打亂選項：答案與解析代號跟著換', () => {
  const { TA } = boot();
  const L = TA.L, LET = 'ABCDE';
  const qs = L.ALL.map(id => L.Q[id]).filter(q => L.shuffles(q) && /[（(][A-E][)）]/.test(q.e || ''));
  assert.ok(qs.length > 50, '有足夠的題目會打亂');
  for (const q of qs.slice(0, 200)) {
    const v = L.view(q);
    assert.equal(v.id, q.id);
    assert.deepEqual(v.o.slice().sort(), q.o.slice().sort(), q.id + ' 選項內容不變');
    const keys = [].concat(q.a).map(i => q.o[i]).sort(), vkeys = [].concat(v.a).map(i => v.o[i]).sort();
    assert.deepEqual(vkeys, keys, q.id + ' 正確答案的內容不變');
    // 原解析裡標 (X) 的選項內容，在新版解析裡標的是同一個選項
    const refs = [...String(q.e).matchAll(/[（(]([A-E])[)）]/g)].map(m => m[1]), vrefs = [...String(v.e).matchAll(/[（(]([A-E])[)）]/g)].map(m => m[1]);
    assert.equal(vrefs.length, refs.length);
    refs.forEach((l, k) => assert.equal(v.o[LET.indexOf(vrefs[k])], q.o[LET.indexOf(l)], q.id + ' 解析代號對應'));
  }
  const fixed = L.ALL.map(id => L.Q[id]).find(q => /B、D/.test(q.e || ''));
  if (fixed) assert.equal(L.view(fixed), fixed, '解析有不帶括號的代號：維持原順序');
});

test('經驗值與等級', () => {
  const { TA } = boot();
  const lv = TA.L.levelOf(0); assert.equal(lv.lv, 1);
  const need1 = TA.L.need(1);
  assert.equal(TA.L.levelOf(need1).lv, 2);
  assert.equal(TA.L.levelOf(need1 - 1).lv, 1);
  let total = 0; for (let i = 1; i < 10; i++) total += TA.L.need(i);
  assert.equal(TA.L.levelOf(total).lv, 10);
  assert.equal(TA.L.levelOf(total).title, '掌舵手');
});

test('每日潮汐：同一天穩定、12 題、不重複', () => {
  const { TA } = boot();
  const a = TA.L.pickDaily(), b = TA.L.pickDaily();
  assert.equal(a.length, 12);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, 12);
});

test('單元試煉與科目練習出題', () => {
  const { TA } = boot();
  const L = TA.L;
  const uid = Object.keys(L.UNITS)[0];
  const ids = L.pickUnit(uid, 10);
  assert.equal(ids.length, Math.min(10, L.BY_UNIT[uid].length));
  ids.forEach(id => assert.equal(L.Q[id].unit, uid));
  const sub = L.pickSubject('physics', 10);
  assert.equal(sub.length, 10);
  sub.forEach(id => assert.equal(L.Q[id].subject, 'physics'));
  const boss = L.pickBoss('math', 16);
  assert.equal(boss.length, 16);
  assert.ok(boss.filter(id => L.Q[id].d >= 2).length >= 12, '首領戰以進階題為主');
});

test('模擬考：題數、科目均衡、閱讀題組相鄰且依序', () => {
  const { TA } = boot();
  const L = TA.L;
  const soc = L.pickMock('社會', 30);
  assert.equal(soc.length, 30);
  const bySub = {}; soc.forEach(id => { bySub[L.Q[id].subject] = (bySub[L.Q[id].subject] || 0) + 1; });
  assert.deepEqual(Object.keys(bySub).sort(), ['civics', 'geography', 'history']);
  Object.values(bySub).forEach(n => assert.ok(n >= 8, '每科至少 8 題'));
  for (let r = 0; r < 20; r++) {
    const en = L.pickMock('英文', 30);
    const seenP = new Map();
    en.forEach((id, i) => {
      const q = L.Q[id]; if (!q.pid) return;
      const key = q.unit + ':' + q.pid;
      if (seenP.has(key)) {
        const last = seenP.get(key);
        assert.equal(i, last.i + 1, '同一篇文章的題目必須相鄰');
        assert.ok(L.BY_UNIT[q.unit].indexOf(id) > L.BY_UNIT[q.unit].indexOf(last.id), '且依原始順序');
      }
      seenP.set(key, { i, id });
    });
  }
  assert.equal(L.mockSeconds('數學', 'full'), 100 * 60, '舊數學名稱仍可使用整卷設定');
});

test('衝刺題源只出簡單單選、不重複直到用完', () => {
  const { TA } = boot();
  const L = TA.L, feed = L.rushFeed('biology');
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const id = feed(); const q = L.Q[id];
    assert.ok(q.d <= 2 && q.type !== 'multi' && !q.pid);
    assert.ok(!seen.has(id)); seen.add(id);
  }
});

test('連續學習：答滿 10 題才算一天', () => {
  const { TA } = boot();
  const L = TA.L;
  for (let i = 0; i < 9; i++) L.record(L.Q[L.ALL[i]], true, { silent: true });
  assert.equal(TA.S.streak.cur, 0);
  L.record(L.Q[L.ALL[9]], true, { silent: true });
  assert.equal(TA.S.streak.cur, 1);
  assert.equal(L.streakAlive(), 1);
});

test('存檔：保存、重新載入、匯出匯入、髒資料修正', () => {
  const env = boot();
  env.TA.S.xp = 1234; env.TA.S.profile.name = '測試'; env.TA.Store.flush();
  const raw = JSON.parse(env.store.get('tidal-academy-v2'));
  assert.equal(raw.xp, 1234);
  const env2 = boot(raw);
  assert.equal(env2.TA.S.xp, 1234);
  assert.equal(env2.TA.S.profile.name, '測試');
  const exported = env2.TA.Store.exportJSON();
  const env3 = boot();
  env3.TA.Store.importJSON(exported);
  assert.equal(env3.TA.S.xp, 1234);
  assert.throws(() => env3.TA.Store.importJSON('{"foo":1}'));
  const dirty = boot({ xp: -5, gems: 'x', profile: { examDate: 'bad', dailyGoal: 9999 }, q: { a: { n: 'x', s: 99 } } });
  assert.equal(dirty.TA.S.xp, 0);
  assert.equal(dirty.TA.S.gems, 0);
  assert.equal(dirty.TA.S.profile.examDate, '2027-01-22');
  assert.equal(dirty.TA.S.profile.dailyGoal, 200);
  assert.equal(dirty.TA.S.q.a.s, 6);
});

test('成就判定會發放潮晶且只解鎖一次', () => {
  const { TA } = boot();
  const L = TA.L, before = TA.S.gems;
  L.record(L.Q[L.ALL[0]], true);
  assert.ok(TA.S.ach.first);
  const g = TA.S.gems; assert.ok(g >= before + 10);
  L.checkAch(); assert.equal(TA.S.gems, g);
});

// 小型 UI 接縫：執行真實面板與按鈕回呼，僅替代 DOM、音效、計時器。
function panelHarness(env) {
  class El {
    constructor(tag = 'div', cls = '', html = '') { this.tagName = tag.toUpperCase(); this.className = cls; this.dataset = {}; this.classList = { add() {}, remove() {}, toggle() {} }; this.innerHTML = html; }
    set innerHTML(v) {
      this.html = v; this.children = [];
      for (const m of v.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
        const a = m[2], el = new El(m[1], /class="([^"]*)"/.exec(a)?.[1] || '');
        for (const d of a.matchAll(/data-([\w-]+)="([^"]*)"/g)) el.dataset[d[1]] = d[2];
        el.disabled = /\bdisabled\b/.test(a); this.children.push(el);
      }
    }
    get innerHTML() { return this.html; }
    appendChild(el) { this.children.push(el); return el; }
    querySelectorAll(sel) {
      const matches = el => sel.startsWith('.') ? sel.slice(1).split('.').every(c => el.className.split(' ').includes(c))
        : sel.startsWith('[') ? Object.hasOwn(el.dataset, sel.slice(6, -1)) : el.tagName.toLowerCase() === sel;
      return this.children.flatMap(el => [ ...(matches(el) ? [el] : []), ...el.querySelectorAll(sel) ]);
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    click() { if (!this.disabled) return this.onclick?.({ target: this }); }
    addEventListener() {} focus() {} scrollIntoView() {} remove() {}
  }
  const panels = [], toasts = [], intervals = new Map(); let intervalId = 0;
  const ui = { el: (...args) => new El(...args), esc: String, rich: String, plain: env.TA.U.plain,
    panel: (title, body, opt) => { panels.at(-1)?.opt.onClose?.(); panels.push({ title, body, opt }); }, toast: t => toasts.push(t), setKeyHook() {}, closePanel: () => panels.at(-1)?.opt.onClose?.() };
  Object.assign(env.ctx, { document: { activeElement: null, createElement: tag => new El(tag) }, matchMedia: () => ({ matches: false }), setInterval: fn => { intervals.set(++intervalId, fn); return intervalId; }, clearInterval: id => intervals.delete(id) });
  const load = (file, extra = {}) => {
    const src = fs.readFileSync(path.join(ROOT, 'src/isle', file + '.js'), 'utf8');
    const names = [...src.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map(m => m[1]);
    const code = src.replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
    env.ctx.deps = { ui, Audio: { sfx() {} }, figs: { figFor: () => null }, ...extra };
    return vm.runInContext(`(function ({${Object.keys(env.ctx.deps).join(',')}}) { ${code}\nreturn {${names.join(',')}}; })(deps)`, env.ctx);
  };
  return { panels, toasts, load, tick: () => [...intervals.values()].forEach(fn => fn()), timers: () => intervals.size, last: () => panels.at(-1).body };
}

test('A1：答錯當天、跨午夜不足八小時不升格，滿八小時且不同天才升格', () => {
  const env = boot(null, new Date(2026, 9, 26, 23, 50).getTime()), { TA, setNow } = env, L = TA.L, q = L.Q[L.ALL[0]];
  L.record(q, false, { silent: true }); const wrongAt = L.rec(q.id).last;
  for (const minutes of [1, 19, 30, 479]) { setNow(wrongAt + minutes * 60000); L.record(q, true, { silent: true }); assert.equal(L.rec(q.id).s, 0); }
  assert.equal(L.rec(q.id).n, 5); assert.equal(L.rec(q.id).c, 4);
  setNow(wrongAt + 8 * 3600000); L.record(q, true, { silent: true }); assert.equal(L.rec(q.id).s, 1);
  assert.equal(L.rec(q.id).lastWrong, wrongAt);
  const daytime = boot(null, new Date(2026, 9, 26, 8).getTime()), p = daytime.TA.L.Q[daytime.TA.L.ALL[0]];
  daytime.TA.L.record(p, false, { silent: true }); daytime.setNow(new Date(2026, 9, 26, 20).getTime());
  daytime.TA.L.record(p, true, { silent: true }); assert.equal(daytime.TA.L.rec(p.id).s, 0, '同一天即使十二小時也不能升格');
});

test('A1：結果重練與錯題本的真實按鈕不會出冷卻題，冷卻結束可開始', () => {
  const env = boot(), { TA } = env, L = TA.L, q = L.Q[L.ALL[0]], h = panelHarness(env), hall = h.load('hall');
  L.record(q, false, { silent: true });
  hall.showResult({ mode: 'set', title: '測試', log: [{ id: q.id, v: q, ok: false, ans: 0 }], total: 1, correct: 0, secs: 1, xp: 2, gems: 0 });
  const count = h.panels.length; h.last().querySelector('.retry').click();
  assert.equal(h.panels.length, count); assert.equal(h.last().querySelector('.retry').disabled, true);
  assert.match(h.last().querySelector('.retry').textContent, /還要等 20 分鐘/);
  hall.openMistakes(); h.last().querySelector('.go').click(); assert.match(h.toasts.at(-1), /冷卻/);
  env.setNow(L.rec(q.id).last + 21 * 60000); h.last().querySelector('.go').click();
  assert.match(h.panels.at(-1).title, /錯題複習/); assert.ok(h.last().querySelector('.hx-main').children.length);
});

test('A2：單字未到期重答不升格，第六格仍每三十五天到期，模糊與不熟不會被立即修好', () => {
  const env = boot(), { TA, setNow } = env, L = TA.L, w = L.VOCAB[0].w;
  L.recordVocab(w, true); const due = TA.S.voc[w].due;
  for (let i = 0; i < 10; i++) L.recordVocab(w, true);
  assert.equal(TA.S.voc[w].s, 1); assert.equal(TA.S.voc[w].due, due); assert.equal(TA.S.voc[w].c, 11);
  TA.S.voc[w].s = 6; TA.S.voc[w].due = TA.U.dayNum();
  assert.ok(L.vocabDue().some(v => v.w === w)); L.recordVocab(w, true);
  assert.equal(TA.S.voc[w].due, TA.U.dayNum() + 35);
  L.recordVocab(w, 'soft'); L.recordVocab(w, true); assert.equal(TA.S.voc[w].due, TA.U.dayNum() + 1);
  L.recordVocab(w, false); const box = TA.S.voc[w].s; L.recordVocab(w, true); assert.equal(TA.S.voc[w].s, box);
  setNow(new Date(2026, 9, 27, 10).getTime()); L.recordVocab(w, true); assert.equal(TA.S.voc[w].s, box + 1);
});

test('A2：選義快答實際使用到期字與新字，不抽未到期的學過字', async () => {
  const env = boot(), { TA } = env, L = TA.L, h = panelHarness(env), X = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/lexq.js')).href);
  L.VOCAB.forEach(v => { TA.S.voc[v.w] = { n: 5, c: 5, s: 5, due: TA.U.dayNum() + 10 }; });
  const wanted = L.VOCAB[0]; TA.S.voc[wanted.w].due = TA.U.dayNum();
  const lx = h.load('lexicon', { ...X, hall: { open: (title, body) => h.panels.push({ title, body }), setKeys() {}, renderQ: q => { assert.equal(q.word, wanted.w); return { el: h.last(), mark() {} }; } }, speak() {} });
  lx.quiz('meaning', 0);
  assert.ok(h.panels.length, '到期字有出題');
  TA.S.voc[wanted.w].due++;
  lx.quiz('meaning', 0); assert.match(h.toasts.at(-1), /複習完|到期/);
});

test('A3：弱點設最少五次門檻，平滑小樣本，最近二十次與未修復錯題影響排名', () => {
  const { TA } = boot(), L = TA.L, units = Object.keys(L.UNITS).slice(0, 3), [tiny, poor, improving] = units;
  const put = (uid, n, c, s, wr) => { TA.S.q[L.BY_UNIT[uid][0]] = { n, c, s, wr, due: TA.U.dayNum() }; };
  put(tiny, 1, 0, 0, 1); put(poor, 1000, 950, 0, 50); put(improving, 1000, 300, 4, 700);
  TA.S.unitRecent = { [poor]: Array(20).fill(0), [improving]: Array(20).fill(1) };
  const weak = L.weakUnits(999), rank = uid => weak.findIndex(w => w.id === uid);
  assert.ok(rank(poor) >= 0); assert.equal(rank(improving), -1, '已改善到門檻以上的單元退出弱點候選');
  assert.ok(rank(poor) < rank(tiny), '一次錯誤不能壓過有足夠樣本的弱點');
  const p = weak.find(w => w.id === poor); assert.ok(p.st.smoothedAcc > 0 && p.st.smoothedAcc < 1);
  put(improving, 1000, 950, 4, 50); TA.S.unitRecent[improving] = Array(20).fill(0);
  assert.ok(L.weakUnits(999).find(w => w.id === poor).score < L.weakUnits(999).find(w => w.id === improving).score, '其他條件相同，目前錯題比例提高優先度');
  const q = L.Q[L.BY_UNIT[poor][0]];
  for (let i = 0; i < 25; i++) L.record(q, i >= 5, { silent: true });
  assert.equal(TA.S.unitRecent[poor].length, 20); assert.ok(TA.S.unitRecent[poor].every(x => x === 1));
  assert.equal(L.pickDaily().length, 12); L.weakUnits(5).forEach(w => { assert.ok(w.unit.name && w.subject.id && L.BY_UNIT[w.id]); });
});

test('A3：每日潮汐、弱點委託、讀書計畫與考前衝刺仍使用相同排名介面', () => {
  const env = boot(), { TA } = env, L = TA.L, h = panelHarness(env), uid = Object.keys(L.UNITS)[0];
  for (let i = 0; i < 5; i++) L.record(L.Q[L.BY_UNIT[uid][i]], false, { silent: true });
  const island = { reqs: [], pockets: [], fr: {}, mail: [] }, deps = { S: () => island, save() {}, dayKey: TA.U.dayKey, pick: arr => arr[0], list: () => [], I: {} };
  const planner = h.load('planner', deps); assert.ok(planner.progress().length >= 2); assert.ok(Object.values(island.plan.days).some(s => s.includes(L.UNITS[uid].subject)));
  const cram = h.load('cram', deps); assert.equal(cram.picks().length, 5);
  const social = h.load('social', deps); social.init(TA.SUBJECTS.map(s => ({ sid: s.id, name: s.name })));
  social.newDay(); const req = island.reqs.find(r => r.type === 'weak'); assert.equal(req.target, L.weakUnits(1)[0].id);
  assert.equal(L.pickDaily().length, 12);
});

test('A4：模考以完整題組抽樣，文意選填十格全出，題組不拆散且維持原序', () => {
  const { TA } = boot(), L = TA.L; let banks = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const rnd = TA.U.rng(seed); TA.U.shuffle = (arr, r = rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    for (const g of ['英文', '國文', '社會', '自然']) {
      const ids = L.pickMock(g, 30); assert.equal(ids.length, 30); assert.equal(new Set(ids).size, ids.length);
      for (const id of ids) {
        const q = L.Q[id]; if (!q.pid) continue;
        const pack = L.BY_UNIT[q.unit].filter(x => L.Q[x].pid === q.pid);
        const start = ids.indexOf(pack[0]); assert.deepEqual(Array.from(ids.slice(start, start + pack.length)), Array.from(pack), q.id);
        if (q.type === 'bank') { banks++; assert.equal(pack.length, 10); }
      }
    }
  }
  assert.ok(banks > 0, '確實測到文意選填');
});

test('A5/A6：六考科整卷題數與節次時間、短版時間估算、數B範圍與舊數學名稱', () => {
  const { TA } = boot(), L = TA.L;
  for (const [g, n, min] of [['國文', 33, 90], ['英文', 47, 100], ['數學A', 18, 100], ['數學B', 18, 100], ['社會', 54, 110], ['自然', 48, 110]]) {
    assert.ok(L.MOCK[g], g); assert.equal(L.pickMock(g, 'full').length, n); assert.equal(L.mockSeconds(g, 'full'), min * 60);
    assert.ok(L.mockSeconds(g, 10) < min * 60 / n * 10, '短版扣除非選題時間');
  }
  assert.equal(L.MOCK['數學'], L.MOCK['數學A']);
  const b = new Set(); for (let i = 0; i < 40; i++) L.pickMock('數學B', 30).forEach(id => b.add(id));
  assert.ok([...b].every(id => L.Q[id].unit !== 'ma2-space'));
  ['ma2-trig-07', 'ma2-trig-10', 'ma2-vec-11', 'ma2-vec-h003', 'ma2-matrix-09', 'ma2-matrix-f010'].forEach(id => assert.equal(L.mockEligible('數學B', L.Q[id]), false, id));
  ['ma2-vec-01', 'ma2-matrix-01', 'ma2-trig-12'].forEach(id => assert.ok(L.mockEligible('數學B', L.Q[id]), '保留共通內容 ' + id));
  assert.ok(L.mockEligible('數學A', L.Q['ma2-space-01']));
});

test('A5：模擬考面板可選數B與整卷，切科後題數與時間更新，重新測驗仍是整卷', async () => {
  const env = boot(), h = panelHarness(env), hall = h.load('hall'); hall.openMock();
  const find = (key, value) => h.last().querySelectorAll('[data-' + key + ']').find(b => b.dataset[key] === value);
  assert.ok(find('g', '數學A')); assert.ok(find('g', '數學B')); assert.ok(find('n', 'full'));
  find('g', '數學B').click(); find('n', 'full').click();
  assert.match(h.last().innerHTML, /18 題/); assert.match(h.last().innerHTML, /100:00/); assert.match(h.last().innerHTML, /非選/);
  find('g', '英文').click(); assert.match(h.last().innerHTML, /47 題/);
  h.last().querySelector('.go').click();
  const body = h.last(), p = body.querySelector('.submit').click();
  body.querySelector('.hall-ov').querySelectorAll('button')[1].click(); await p;
  h.last().querySelector('.again').click();
  assert.match(h.last().innerHTML, /英文 模擬考 · 47 題/); assert.equal(h.last().querySelector('.hx-timer').textContent, '⏱ 100:00');
});

test('A7：真實模考交白卷，單選、多選、選填全記成答錯並進錯題本', async () => {
  const env = boot(), { TA } = env, L = TA.L, h = panelHarness(env), hall = h.load('hall');
  const ids = [L.ALL.find(id => !L.Q[id].type), L.ALL.find(id => L.Q[id].type === 'multi'), L.ALL.find(id => L.Q[id].type === 'fill'), ...L.ALL.slice(10, 17)];
  const before = { xp: TA.S.xp, streak: JSON.stringify(TA.S.streak), q: L.dayRec().q };
  const planner = h.load('planner', { S: () => ({}), save() {}, dayKey: TA.U.dayKey });
  L.pickMock = () => ids; hall.openMock(); h.last().querySelector('.go').click();
  const body = h.last(), p = body.querySelector('.submit').click();
  body.querySelector('.hall-ov').querySelectorAll('button')[1].click(); await p;
  ids.forEach(id => { assert.equal(L.rec(id)?.n, 1, id); assert.ok(L.isMistake(id)); });
  assert.equal(L.dayRec().q, before.q); assert.equal(TA.S.xp, before.xp); assert.equal(JSON.stringify(TA.S.streak), before.streak);
  assert.equal(L.mistakes().length, 10); TA.SUBJECTS.forEach(s => assert.equal(planner.countToday(s.id), 0));
  assert.equal(TA.S.exams.at(-1).c, 0); assert.equal(TA.S.exams.at(-1).pts, 0);
});

test('A8：多選空白一律零分（單一正解與兩個正解）', () => {
  const { TA } = boot();
  for (const a of [[1], [1, 3]]) for (const ans of [[], null, undefined]) assert.equal(TA.L.multiScore({ type: 'multi', a }, ans), 0);
});

test('A9：真選項指稱保持原序，點名／元素／英文符號不妨礙打亂', () => {
  const { TA } = boot(), L = TA.L;
  const q = { q: '哪一個敘述正確？', o: ['甲', '乙', '丙', '丁', '戊'], a: 1 };
  for (const e of ['A 選項錯誤', '選項 B 正確', 'A、C 正確', 'B、D 均錯誤', '應選 A', '不能保證 B', '不能由此判定 A、B', '所以 A 錯；不能推論 D', 'B 的說法錯誤']) assert.equal(L.shuffles({ ...q, e }), false, e);
  for (const e of ['點 A、B 的距離', 'C、H 是元素符號', 'I am ready.', 'A of B 是英文結構', '矩陣 A、B 相乘']) assert.equal(L.shuffles({ ...q, e }), true, e);
  const parenthesized = { ...q, e: '(A) 正確，(B) 錯誤' }; assert.ok(L.shuffles(parenthesized));
  assert.equal(L.shuffles({ ...q, q: 'A 選項與選項 B 何者正確？' }), false);
  const math = { ...q, q: '點 A、B 的距離？', e: '令矩陣 A = I。' }; assert.ok(L.shuffles(math));
  for (const id of ['ge-climate-y002', 'ge-pop-y009', 'ci-global-10', 'es-motion-11']) assert.equal(L.shuffles(L.Q[id]), false, '實際題庫的裸代號解析 ' + id);
});

test('A10：mock80 依部分給分 pts，舊成績缺 pts 時相容 c，已有成就不撤銷', () => {
  const { TA } = boot(), L = TA.L, ach = L.ACH.find(a => a.id === 'mock80');
  TA.S.exams = [{ n: 30, c: 20, pts: 24 }]; assert.ok(ach.test()); L.checkAch(); assert.ok(TA.S.ach.mock80);
  TA.S.exams = [{ n: 30, c: 30, pts: 23 }]; assert.equal(ach.test(), false); L.checkAch(); assert.ok(TA.S.ach.mock80);
  TA.S.exams = [{ n: 30, c: 24 }]; assert.ok(ach.test());
});

test('A10：考場統計趨勢分科，錯題與到期複習互斥計數', () => {
  const env = boot(), { TA } = env, L = TA.L, h = panelHarness(env), hall = h.load('hall'), [a, b] = L.ALL;
  TA.S.exams = [{ at: 1, group: '英文', n: 30, c: 24 }, { at: 2, group: '數學B', n: 18, c: 9, pts: 12 }, { at: 3, group: '英文', n: 30, c: 20, pts: 25 }];
  hall.openStats(); const html = h.last().innerHTML;
  assert.equal((html.match(/<polyline/g) || []).length, 2); assert.match(html, /數學B/); assert.doesNotMatch(html, /NaN/);
  L.record(L.Q[a], false, { silent: true }); L.record(L.Q[b], true, { silent: true }); L.rec(b).due = TA.U.dayNum();
  hall.openMistakes(); const out = h.last().innerHTML;
  assert.match(out, /<b>1<\/b><small>真正錯題/); assert.match(out, /<b>1<\/b><small>到期複習/);
  assert.equal(L.mistakes().length, 1); assert.equal(L.pickReview(999).length, 2);
});

test('A10：兩個趨勢面板把舊數學接到數A、數B獨立，且不改寫原存檔名稱', () => {
  const env = boot(), { TA } = env, h = panelHarness(env);
  TA.S.exams = [{ at: 1, group: '數學', n: 20, c: 10 }, { at: 2, group: '數學B', n: 18, c: 10, pts: 12 }, { at: 3, group: '數學A', n: 18, c: 15, pts: 16 }];
  for (const [file, fn] of [['hall', 'openStats'], ['quizcup', 'openTrend']]) {
    h.load(file)[fn](); const html = h.last().innerHTML;
    assert.equal((html.match(/<polyline/g) || []).length, 2); assert.match(html, /數學A/); assert.match(html, /數學B/); assert.doesNotMatch(html, /NaN/);
  }
  assert.equal(TA.S.exams[0].group, '數學');
});

test('舊存檔缺新欄位可讀寫，最近表現與答錯時間可保存、重載與匯入', () => {
  const env = boot(), { TA } = env, L = TA.L, q = L.Q[L.ALL[0]], w = L.VOCAB[0].w;
  const old = { profile: { name: '老船員' }, xp: 1234, q: { [q.id]: { n: 5, c: 2, wr: 3, s: 0, due: TA.U.dayNum(), last: new Date(2026, 9, 26, 9).getTime() } }, voc: { [w]: { n: 7, c: 6, s: 6, due: TA.U.dayNum() } } };
  const restored = boot(old); restored.TA.L.record(q, true, { silent: true }); assert.equal(restored.TA.L.rec(q.id).s, 0);
  assert.equal(restored.TA.L.rec(q.id).n, 6); assert.equal(restored.TA.S.voc[w].s, 6); assert.equal(restored.TA.S.profile.name, '老船員');
  L.record(q, false, { silent: true }); L.recordVocab(w, false); TA.Store.flush();
  const again = boot(JSON.parse(env.store.get('tidal-academy-v2')));
  assert.equal(again.TA.L.rec(q.id).lastWrong, L.rec(q.id).lastWrong); assert.equal(again.TA.S.voc[w].lastWrong, TA.S.voc[w].lastWrong);
  assert.deepEqual(Array.from(again.TA.S.unitRecent[q.unit]), [0]);
  const imported = boot(); imported.TA.Store.importJSON(again.TA.Store.exportJSON()); assert.deepEqual(Array.from(imported.TA.S.unitRecent[q.unit]), [0]);
  const dirty = boot({ unitRecent: { a: 'bad', b: [0, 1, 8, null, true] }, q: { x: { lastWrong: 'bad' } } });
  assert.ok(!dirty.TA.S.unitRecent.a); assert.deepEqual(Array.from(dirty.TA.S.unitRecent.b), [0, 1]); assert.equal(Object.hasOwn(dirty.TA.S.q.x, 'lastWrong'), false);
});


test('A9 回歸：八題裸代號保持原序，所有可打亂題目的解析沒有未定義的句首選項字母', () => {
  const { TA } = boot(), L = TA.L, U = TA.U;
  for (const id of ['en-gram2-15', 'ci-gov-13', 'ci-macro-04', 'ci-micro-10', 'ph-matter-08', 'ph-energy-03', 'ph-em-01', 'es-rock-09']) assert.equal(L.shuffles(L.Q[id]), false, id);
  const bad = [];
  for (const id of L.ALL) {
    const q = L.Q[id]; if (!L.shuffles(q)) continue;
    const e = U.plain(q.e || '').replace(/[（(]\s*[A-J]\s*[)）]/g, ' '), context = U.plain(q.q) + ' ' + U.plain(q.passage || '');
    // 獨立掃完整題庫，不限上一輪新開放打亂的題目，也不把選項文字當作字母的定義。
    for (const m of e.matchAll(/(?:^|[。；;，,：:）)]|所以|因此|而|故|則)\s*([A-E])(?:\s*[、與和及]\s*[A-E])*\s*(?=[\u4e00-\u9fff])/g)) {
      if (!new RegExp('(^|[^A-Za-z])' + m[1] + '(?![A-Za-z])').test(context)) bad.push(id + ': ' + m[0]);
    }
  }
  assert.deepEqual(bad, []);
});

test('A3 回歸：三個單元各全對六題不再當最弱，確認弱點排在中性探索之前', () => {
  const env = boot(), { TA } = env, L = TA.L, units = Object.keys(L.UNITS), strong = units.filter((_, i) => i % 17 === 0).slice(0, 3);
  strong.forEach(uid => L.BY_UNIT[uid].slice(0, 6).forEach(id => L.record(L.Q[id], true, { silent: true })));
  assert.ok(L.weakUnits(999).every(w => !strong.includes(w.id)), '確認強項退出所有弱點呼叫端的候選');
  const poor = units.find(uid => !strong.includes(uid));
  TA.S.q[L.BY_UNIT[poor][0]] = { n: 10, c: 7, wr: 0, s: 4, due: TA.U.dayNum() + 8 };
  // 分數略低於 0.8 的確認弱點，仍應排在分數約 0.75 的未練單元之前。
  const ranked = L.weakUnits(999); assert.equal(ranked[0].id, poor); assert.equal(ranked[0].weak, true);
  assert.ok(ranked.slice(1).every(w => !w.sampled && !w.weak && w.score >= 0.75 && w.score < 0.8));
  const h = panelHarness(env); h.load('hall').openStats();
  const shown = h.last().querySelectorAll('[data-p]').map(b => b.dataset.p); assert.deepEqual(shown, [poor]);
  const report = h.load('report', { S: () => ({}), save() {} }); assert.equal(report.compute().weak[0].id, poor);
});

test('A3 回歸：九成長期正確率只有一次近期錯誤，不會掉到弱點門檻以下', () => {
  const env = boot(), { TA } = env, L = TA.L, uid = Object.keys(L.UNITS)[0], ids = L.BY_UNIT[uid];
  ids.slice(0, 10).forEach(id => { TA.S.q[id] = { n: 10, c: 9, wr: 1, s: 4, due: TA.U.dayNum() + 8 }; });
  L.record(L.Q[ids[20]], false, { silent: true });
  const st = L.unitStats(uid), score = st.smoothedAcc * 0.2 + st.recentAcc * 0.5 + (1 - st.mistakeRate) * 0.3;
  assert.ok(st.recentAcc > 0.7); assert.ok(score >= 0.8, String(score));
  assert.ok(L.weakUnits(999).every(w => w.id !== uid));
});

test('A3 回歸：全部單元已確認強項時，週報、委託、計畫與衝刺安全退回一般題源', () => {
  const env = boot(), { TA } = env, L = TA.L;
  Object.keys(L.UNITS).forEach(uid => L.BY_UNIT[uid].slice(0, 6).forEach(id => L.record(L.Q[id], true, { silent: true })));
  assert.equal(L.weakUnits(999).length, 0);
  const h = panelHarness(env), island = { reqs: [], pockets: [], fr: {}, mail: [] }, deps = { S: () => island, save() {}, dayKey: TA.U.dayKey, pick: arr => arr[0], list: () => [], I: {} };
  assert.equal(h.load('report', deps).compute().weak.length, 0);
  assert.equal(h.load('cram', deps).picks().length, 5); assert.ok(h.load('planner', deps).progress().length >= 2);
  const social = h.load('social', deps); social.init(TA.SUBJECTS.map(s => ({ sid: s.id, name: s.name })));
  social.newDay(); assert.ok(island.reqs.every(r => r.type !== 'weak')); assert.equal(island.reqs.length, 3);
  assert.equal(L.pickDaily().length, 12);
});

test('A7 回歸：空白記錯不覆寫實際作答時間，仍保存冷卻、近期表現與跨日升格限制', () => {
  const env = boot(), { TA } = env, L = TA.L, q = L.Q[L.ALL[0]], start = env.ctx.Date.now();
  L.record(q, true, { silent: true }); const last = L.rec(q.id).last;
  env.setNow(start + 86400000); const before = JSON.stringify(TA.S.streak), xp = TA.S.xp;
  const out = L.record(q, true, { blank: true });
  assert.equal(out.xp, 0); assert.equal(TA.S.xp, xp); assert.equal(L.rec(q.id).last, last);
  assert.equal(L.rec(q.id).n, 2); assert.equal(L.rec(q.id).c, 1); assert.equal(L.rec(q.id).s, 0);
  assert.equal(L.rec(q.id).lastWrong, env.ctx.Date.now()); assert.ok(L.cooling(q.id)); assert.equal(JSON.stringify(TA.S.streak), before);
  assert.deepEqual(Array.from(TA.S.unitRecent[q.unit]), [1, 0]);
  const h = panelHarness(env), planner = h.load('planner', { S: () => ({}), save() {}, dayKey: TA.U.dayKey });
  assert.equal(planner.countToday(q.subject), 0);
  TA.Store.flush(); const reloaded = boot(JSON.parse(env.store.get('tidal-academy-v2')), env.ctx.Date.now());
  assert.ok(reloaded.TA.L.cooling(q.id)); assert.ok(reloaded.TA.L.isMistake(q.id));
  L.record(q, true, { silent: true }); assert.equal(L.rec(q.id).s, 0); assert.equal(planner.countToday(q.subject), 1);
});

test('A5 回歸：各科短版題數小於整卷，換科自動換成有效題數', () => {
  const env = boot(), h = panelHarness(env); h.load('hall').openMock();
  for (const [g, sizes] of [['國文', [10, 20]], ['英文', [10, 20, 30]], ['數學A', [6, 12]], ['數學B', [6, 12]], ['社會', [10, 20, 30]], ['自然', [10, 20, 30]]]) {
    h.last().querySelectorAll('[data-g]').find(b => b.dataset.g === g).click();
    const buttons = h.last().querySelectorAll('[data-n]'), actual = buttons.filter(b => b.dataset.n !== 'full').map(b => +b.dataset.n);
    assert.deepEqual(actual, sizes, g); assert.ok(actual.every(n => n < env.TA.L.MOCK[g].realN));
    assert.equal(buttons.filter(b => b.className.split(' ').includes('on')).length, 1, '目前選擇一定有效');
  }
});

test('A6 回歸：舊存檔讀回再保存，不替沒答錯紀錄增加 lastWrong；零與不合法值移除', () => {
  const r = { n: 4, c: 4, s: 3, due: 99999 }, bad = [undefined, 0, -1, 'bad', null];
  const saved = { profile: { name: '舊檔' }, q: {}, voc: {} };
  bad.forEach((v, i) => { saved.q['q' + i] = { ...r, ...(v === undefined ? {} : { lastWrong: v }) }; saved.voc['v' + i] = { ...r, ...(v === undefined ? {} : { lastWrong: v }) }; });
  saved.q.wrong = { ...r, lastWrong: 123456 }; saved.voc.wrong = { ...r, lastWrong: 123456 };
  const env = boot(saved); env.TA.Store.flush(); const raw = JSON.parse(env.store.get('tidal-academy-v2'));
  for (const dict of ['q', 'voc']) {
    bad.forEach((_, i) => assert.equal(Object.hasOwn(raw[dict][(dict === 'q' ? 'q' : 'v') + i], 'lastWrong'), false));
    assert.equal(raw[dict].wrong.lastWrong, 123456);
  }
});

test('A7 冷卻按鈕回歸：全冷卻顯示最早等待分鐘，解除後自動啟用，只重練已就緒錯題', () => {
  const env = boot(), { TA } = env, L = TA.L, [a, b] = L.ALL.slice(0, 2), h = panelHarness(env), hall = h.load('hall'), start = env.ctx.Date.now();
  L.record(L.Q[a], false, { silent: true }); env.setNow(start + 5 * 60000); L.record(L.Q[b], false, { silent: true });
  hall.showResult({ mode: 'set', title: '冷卻', log: [a, b].map(id => ({ id, ok: false, ans: null })), total: 2, correct: 0, secs: 1, xp: 0, gems: 0 });
  const retry = h.last().querySelector('.retry'); assert.equal(retry.disabled, true); assert.match(retry.textContent, /還要等 15 分鐘/);
  env.setNow(start + 20 * 60000); h.tick(); assert.equal(retry.disabled, false); retry.click();
  assert.equal(h.last().querySelector('.hx-prog').textContent, '1 / 1'); assert.ok(L.cooling(b)); assert.equal(h.timers(), 0, '換面板時清理冷卻計時器');
});


test('A7 回歸：模考只對實際作答題給經驗與計畫進度，空白題仍全數記錯', async () => {
  const env = boot(), { TA } = env, L = TA.L, h = panelHarness(env), hall = h.load('hall'), ids = L.ALL.slice(0, 10), q = L.Q[ids[0]];
  L.pickMock = () => ids; L.view = q => q;
  hall.openMock(); h.last().querySelector('.go').click();
  h.last().querySelectorAll('.hq-opt')[q.a].click();
  const body = h.last(), p = body.querySelector('.submit').click();
  body.querySelector('.hall-ov').querySelectorAll('button')[1].click(); await p;
  assert.equal(L.dayRec().q, 1); assert.equal(L.dayRec().c, 1); assert.equal(TA.S.xp, 10 + (q.d - 1) * 3 + 3);
  assert.equal(L.mistakes().length, 9); assert.equal(TA.S.streak.cur, 0);
  const planner = h.load('planner', { S: () => ({}), save() {}, dayKey: TA.U.dayKey }); assert.equal(planner.countToday(q.subject), 1);
  assert.equal(TA.S.exams.at(-1).c, 1); assert.equal(TA.S.exams.at(-1).pts, 1);
});
