/* 學習引擎測試：node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
function boot(saved) {
  const store = new Map();
  if (saved) store.set('tidal-academy-v2', JSON.stringify(saved));
  const ctx = {
    console, Math, Date, JSON, Intl,
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
  return { TA: ctx.TA, store };
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
  const { TA } = boot();
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
  assert.equal(r().s, 1, '同一天連對三次只算一次（短期記憶不算修好）');
  assert.ok(L.isMistake(q.id));
  r().due = today; L.record(q, true, { silent: true });   // 隔天到期再答對
  r().due = today; L.record(q, true, { silent: true });   // 再隔兩天
  assert.equal(r().s, 3);
  assert.equal(L.isMistake(q.id), false, '在不同天答對、升到第 3 格才算修復');
  r().s = 6; r().due = today;
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
  L.rec(b.id).last = Date.now() - 30 * 60000;   // b 是半小時前答錯的
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
  assert.ok(L.mockSeconds('數學', 20) === 100 * 60, '數學 20 題 = 100 分鐘');
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
