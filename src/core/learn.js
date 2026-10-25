/* 潮汐學院 · 學習引擎：題庫索引、間隔複習、出題策略、經驗等級、成就與統計。 */
(function (root) {
  'use strict';
  const TA = root.TA = root.TA || {};
  const U = TA.U;
  const L = TA.L = {};

  /* ---------- 事件匯流排 ---------- */
  const listeners = {};
  TA.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  TA.off = (ev, fn) => { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); };
  TA.emit = (ev, data) => (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });

  /* ---------- 索引 ---------- */
  L.Q = {}; L.UNITS = {}; L.BY_SUBJECT = {}; L.BY_UNIT = {};
  L.index = function () {
    L.Q = {}; L.UNITS = {}; L.BY_SUBJECT = {}; L.BY_UNIT = {};
    if (TA.mergeExtra) TA.mergeExtra().forEach(uid => console.warn('addQuestions 找不到單元', uid));
    TA.SUBJECTS.forEach(s => {
      L.BY_SUBJECT[s.id] = [];
      (TA.DATA.units[s.id] || []).forEach((u, ui) => {
        u.order = ui;
        L.UNITS[u.id] = u; L.BY_UNIT[u.id] = [];
        (u.questions || []).forEach(q => {
          q.unit = u.id; q.subject = s.id;
          if (q.pid && u.passages) q.passage = u.passages[q.pid];
          L.Q[q.id] = q; L.BY_SUBJECT[s.id].push(q.id); L.BY_UNIT[u.id].push(q.id);
        });
      });
    });
    L.ALL = Object.keys(L.Q);
    L.VOCAB = TA.DATA.vocab.slice().sort((a, b) => a.lv - b.lv || a.w.localeCompare(b.w));
    return L.ALL.length;
  };

  /* ---------- 間隔複習 ---------- */
  const INT = [0, 1, 2, 4, 8, 16, 35];
  L.MASTER_BOX = 4;
  const today = () => U.dayNum();
  const rec = id => TA.S.q[id];
  L.rec = rec;
  L.mastery = id => { const r = rec(id); return r ? r.s / 6 : 0; };
  L.isMistake = id => { const r = rec(id); return !!r && r.wr > 0 && r.s < 3; };
  L.isDue = id => { const r = rec(id); return !!r && r.n > 0 && r.due <= today(); };   // 最高格（熟練）的題目也每 35 天抽查一次，不會永遠退休
  /** 剛答過（20 分鐘內）的題目先冷卻：剛看完解析就重考，答對只是短期記憶 */
  L.COOL_MIN = 20;
  L.cooling = id => { const r = rec(id); return !!r && !!r.last && Date.now() - r.last < L.COOL_MIN * 60000; };
  /** 冷卻中的題目排到最後（不刪掉：題目真的不夠時還是可以出） */
  L.readyFirst = ids => ids.filter(id => !L.cooling(id)).concat(ids.filter(L.cooling));

  /* ---------- 出題時打亂選項 ----------
     每次出題都打亂選項順序，學生不能靠記住「答案是 B」通過重考；解析裡的 (A)(B) 代號跟著換。
     保守起見維持原順序：解析裡有不帶括號的代號（例如「B、D 正確」，基因型 A、鹼基 A 這類也一併算進來）、
     題幹或選項提到其他選項、同一題組的題目共用同一組選項（篇章結構）、閱讀材料裡標了 (A)(B)。 */
  const LET = 'ABCDEFGHIJ';
  const PAREN_G = /([（(])\s*([A-J])\s*([)）])/g;
  const BARE = /(^|[^A-Za-z])[A-J](?=[^A-Za-z]|$)/;
  const fixedCache = {};
  function fixedOrder(q) {
    if (q.id && q.id in fixedCache) return fixedCache[q.id];
    const e = U.plain(q.e || '').replace(PAREN_G, ' '), st = U.plain(q.q), o = q.o.map(U.plain).join('｜');
    let fixed = BARE.test(e) || /[（(]\s*[A-J]\s*[)）]|選項\s*[A-J]/.test(st) || /以上|前述|上述|皆是|皆非|[（(][A-J][)）]/.test(o);
    if (!fixed && q.pid) {
      const key = q.o.join('｜');
      fixed = (L.BY_UNIT[q.unit] || []).some(id => id !== q.id && L.Q[id] && L.Q[id].pid === q.pid && L.Q[id].o.join('｜') === key) || /[（(]\s*[A-J]\s*[)）]/.test(U.plain(q.passage || ''));
    }
    if (q.id) fixedCache[q.id] = fixed;
    return fixed;
  }
  L.shuffles = q => !!q && !q.vocab && q.type !== 'bank' && Array.isArray(q.o) && q.o.length > 1 && !fixedOrder(q);   // 文意選填同一篇共用 (A)–(J)，順序固定
  /** 出題用的版本：選項打亂、答案與解析的代號重新對應；其餘欄位（id、d、unit、passage…）照舊，作答紀錄照樣寫到原題 */
  L.view = function (q) {
    if (!L.shuffles(q)) return q;
    const n = q.o.length, perm = U.shuffle([...Array(n).keys()]);   // perm[新位置] = 原位置
    const pos = []; perm.forEach((old, i) => { pos[old] = i; });
    const v = Object.assign({}, q);
    v.o = perm.map(i => q.o[i]);
    v.a = Array.isArray(q.a) ? q.a.map(i => pos[i]).sort((x, y) => x - y) : pos[q.a];
    v.e = String(q.e || '').replace(PAREN_G, (m, l, x, r) => l + (LET[pos[LET.indexOf(x)]] || x) + r);
    return v;
  };

  /** 選填題（數學）的答案：整數、分數 a/b 或小數，回傳數值（看不懂回傳 NaN） */
  L.num = function (s) {
    const t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/[−–—－]/g, '-').replace(/／/g, '/').replace(/．/g, '.');
    const m = /^([+-]?(?:\d+\.?\d*|\.\d+))(?:\/([+-]?(?:\d+\.?\d*|\.\d+)))?$/.exec(t); if (!m) return NaN;
    const a = parseFloat(m[1]), b = m[2] != null ? parseFloat(m[2]) : 1;
    return b === 0 ? NaN : a / b;
  };
  L.check = function (q, ans) {
    if (q.type === 'fill') { const x = L.num(ans); return Number.isFinite(x) && [].concat(q.ans).some(v => Math.abs(L.num(v) - x) <= 1e-9 * Math.max(1, Math.abs(x))); }   // 數值相等就對（3/4 與 0.75 都算）
    if (q.type === 'multi') {
      const a = (ans || []).slice().sort().join(','), k = q.a.slice().sort().join(',');
      return a === k;
    }
    return ans === q.a;
  };
  /** 學測多選給分（5 選項錯 k 個：0→1, 1→0.6, 2→0.2, ≥3→0） */
  L.multiScore = function (q, ans) {
    if (q.type !== 'multi') return L.check(q, ans) ? 1 : 0;
    let wrong = 0; for (let i = 0; i < 5; i++) if ((ans || []).includes(i) !== q.a.includes(i)) wrong++;
    return [1, 0.6, 0.2][wrong] || 0;
  };

  function dayRec(key) { key = key || U.dayKey(); return TA.S.days[key] = TA.S.days[key] || { q: 0, c: 0, voc: 0, min: 0, xp: 0 }; }
  L.dayRec = dayRec;

  /** 記錄一次作答。opts: {combo, mode, silent} 回傳獎勵摘要 */
  L.record = function (q, correct, opts) {
    opts = opts || {};
    const S = TA.S, t = today();
    const r = S.q[q.id] = S.q[q.id] || { n: 0, c: 0, s: 0, due: t, wr: 0 };
    const firstTime = r.n === 0;
    r.n++; r.last = Date.now();
    if (correct) {
      r.c++;
      // 還沒到期就又答對（同一天重複、剛看完解析）不升格：錯題要在不同天答對才算修好，間隔才有意義
      const early = !firstTime && r.due > t;
      if (!early) { r.s = Math.min(6, firstTime ? 2 : r.s + 1); r.due = t + INT[r.s]; }
    } else {
      r.wr++; r.s = 0; r.due = t;
    }
    const d = dayRec(); d.q++; if (correct) d.c++;
    let xp = correct ? 10 + (q.d - 1) * 3 : 2;
    if (correct && opts.combo > 1) xp += Math.min(10, opts.combo - 1);
    const out = L.gain(xp, 0);
    L.touchStreak();
    if (!opts.silent) L.checkAch();
    TA.Store.save();
    return out;
  };

  L.recordVocab = function (w, known) {
    const S = TA.S, t = today();
    const r = S.voc[w] = S.voc[w] || { n: 0, c: 0, s: 0, due: t };
    r.n++; r.last = Date.now();
    if (known === 'soft') { r.due = t + 1; }
    else if (known) { r.c++; r.s = Math.min(6, r.s + 1); r.due = t + INT[r.s]; }
    else { r.s = Math.max(0, r.s - 2); r.due = t; }
    dayRec().voc++;
    L.gain(known ? 4 : 1, 0);
    TA.Store.save();
  };

  /* ---------- 經驗、等級、潮晶 ---------- */
  const TITLES = L.TITLES = [[1, '見習水手'], [5, '甲板學徒'], [10, '掌舵手'], [16, '領航員'], [24, '燈塔守護者'], [33, '潮汐學者'], [45, '星海賢者'], [60, '傳說領航者']];
  L.need = lv => Math.round(70 * Math.pow(lv, 1.32));
  L.levelOf = function (xp) {
    let lv = 1, rest = xp;
    while (rest >= L.need(lv)) { rest -= L.need(lv); lv++; }
    let title = TITLES[0][1]; TITLES.forEach(([l, t]) => { if (lv >= l) title = t; });
    return { lv, cur: rest, need: L.need(lv), title };
  };
  L.gain = function (xp, gems) {
    const S = TA.S, before = L.levelOf(S.xp).lv;
    S.xp += xp; S.gems += gems || 0; dayRec().xp += xp;
    const after = L.levelOf(S.xp).lv;
    if (after > before) { S.gems += 20 * (after - before); TA.emit('levelup', { lv: after, title: L.levelOf(S.xp).title }); }
    TA.emit('wallet');
    return { xp, gems: gems || 0, levelUp: after > before ? after : 0 };
  };

  /* ---------- 連續學習 ---------- */
  L.STREAK_Q = 10;
  L.touchStreak = function () {
    const S = TA.S, key = U.dayKey(), d = dayRec(key);
    if (S.streak.last === key) return false;
    if (d.q + Math.floor(d.voc / 4) < L.STREAK_Q && !d.focus) return false;
    const gap = S.streak.last ? U.dayNum() - U.keyToNum(S.streak.last) : 99;
    if (gap === 1) S.streak.cur++;
    else if (gap === 2 && S.streak.shields > 0) { S.streak.shields--; S.streak.cur++; TA.emit('toast', { icon: 'shield', text: '潮汐護符替你守住了昨天的連續紀錄' }); }
    else S.streak.cur = 1;
    S.streak.last = key; S.streak.best = Math.max(S.streak.best, S.streak.cur);
    TA.emit('streak', S.streak.cur);
    return true;
  };
  L.streakAlive = function () {
    const S = TA.S; if (!S.streak.last) return 0;
    const gap = U.dayNum() - U.keyToNum(S.streak.last);
    return gap <= 1 || (gap === 2 && S.streak.shields > 0) ? S.streak.cur : 0;
  };

  /* ---------- 出題策略 ---------- */
  const seen = id => !!rec(id);
  const byWeak = ids => ids.slice().sort((a, b) => L.mastery(a) - L.mastery(b));
  function balancedTake(pools, n, rnd) {
    // pools: 陣列的陣列；輪流取，避免單一科目塞滿
    const out = [], ps = pools.map(p => p.slice()).filter(p => p.length);
    let i = 0;
    while (out.length < n && ps.some(p => p.length)) {
      const p = ps[i % ps.length]; if (p.length) out.push(p.shift()); i++;
    }
    return out;
  }
  const uniq = arr => Array.from(new Set(arr));

  /** 同一篇閱讀材料的題目排在一起，並依原始順序（克漏字第 1、2、3 格…） */
  L.groupPassages = function (ids) {
    const out = [], placed = new Set();
    ids.forEach(id => {
      if (placed.has(id)) return;
      const q = L.Q[id];
      if (!q || !q.pid) { out.push(id); placed.add(id); return; }
      const group = ids.filter(x => L.Q[x] && L.Q[x].pid === q.pid && L.Q[x].unit === q.unit)
        .sort((x, y) => L.BY_UNIT[q.unit].indexOf(x) - L.BY_UNIT[q.unit].indexOf(y));
      group.forEach(x => { out.push(x); placed.add(x); });
    });
    return out;
  };

  L.dueList = subject => L.ALL.filter(id => (!subject || L.Q[id].subject === subject) && L.isDue(id))
    .sort((a, b) => rec(a).due - rec(b).due || rec(b).wr - rec(a).wr);
  L.mistakes = subject => L.ALL.filter(id => (!subject || L.Q[id].subject === subject) && L.isMistake(id))
    .sort((a, b) => rec(b).wr - rec(a).wr || rec(b).last - rec(a).last);

  L.pickUnit = function (unitId, n) {
    const ids = L.BY_UNIT[unitId] || [];
    const unseen = U.shuffle(ids.filter(id => !seen(id)));
    const weak = L.readyFirst(byWeak(U.shuffle(ids.filter(seen))));
    return L.groupPassages(U.shuffle(unseen.concat(weak).slice(0, n || 10)));
  };
  L.pickSubject = function (sid, n, minD) {
    const ids = (L.BY_SUBJECT[sid] || []).filter(id => !minD || L.Q[id].d >= minD);
    const unseen = U.shuffle(ids.filter(id => !seen(id)));
    const weak = L.readyFirst(byWeak(U.shuffle(ids.filter(seen))));
    const mix = []; while (mix.length < n && (unseen.length || weak.length)) { if (weak.length && (mix.length % 2 || !unseen.length)) mix.push(weak.shift()); else mix.push(unseen.shift()); }
    return L.groupPassages(U.shuffle(mix));
  };
  L.pickBoss = function (sid, n) {
    let pool = L.pickSubject(sid, n || 16, 2);
    if (pool.length < (n || 16)) pool = uniq(pool.concat(L.pickSubject(sid, n || 16)));
    return pool.slice(0, n || 16);
  };
  L.pickReview = function (n, subject) {
    // 錯題與到期題交錯（錯題太多時，到期該複習的題目也排得進來），剛答過的題目排到最後
    const m = L.mistakes(subject), d = L.dueList(subject).filter(id => !L.isMistake(id)), mix = [];
    for (let i = 0; i < Math.max(m.length, d.length); i++) { if (m[i]) mix.push(m[i]); if (d[i]) mix.push(d[i]); }
    return L.readyFirst(uniq(mix)).slice(0, n || 15);
  };
  L.pickDaily = function () {
    const S = TA.S, key = U.dayKey();
    if (S.daily.date === key && S.daily.set.length && S.daily.set.every(id => L.Q[id])) return S.daily.set;
    const rnd = U.rng(key + ':' + S.created);
    const due = L.pickReview(5);
    const weakUnits = L.weakUnits(4).map(u => u.id);
    const weak = weakUnits.map(uid => U.shuffle(L.BY_UNIT[uid], rnd).find(id => !due.includes(id))).filter(Boolean);
    const fresh = balancedTake(TA.SUBJECTS.map(s => U.shuffle((L.BY_SUBJECT[s.id] || []).filter(id => !seen(id) && L.Q[id].d <= 2), rnd)), 12, rnd);
    const set = uniq(due.concat(weak, U.shuffle(fresh, rnd))).slice(0, 12);
    if (set.length < 12) uniq(set.concat(U.shuffle(L.ALL, rnd))).slice(0, 12).forEach(id => { if (!set.includes(id)) set.push(id); });
    S.daily = { date: key, set: set.slice(0, 12), done: false, claimed: false };
    TA.Store.save();
    return S.daily.set;
  };
  /** 衝刺模式：回傳產生器 */
  L.rushFeed = function (sid) {
    const pool = (sid ? L.BY_SUBJECT[sid] : L.ALL).filter(id => L.Q[id].d <= 2 && (!L.Q[id].type || L.Q[id].type === 'single') && !L.Q[id].pid);   // 激流是快速點選：不出多選、選填與題組
    let bag = []; const used = new Set();
    return () => {
      if (!bag.length) { bag = U.shuffle(pool.filter(id => !used.has(id))); if (!bag.length) { used.clear(); bag = U.shuffle(pool); } }
      const id = bag.pop(); used.add(id); return id;
    };
  };
  L.MOCK = {
    '國文': { subjects: ['chinese'], realMin: 90, realN: 39 },
    '英文': { subjects: ['english'], realMin: 100, realN: 50 },
    '數學': { subjects: ['math'], realMin: 100, realN: 20 },
    '社會': { subjects: ['history', 'geography', 'civics'], realMin: 110, realN: 60 },
    '自然': { subjects: ['physics', 'chemistry', 'biology', 'earth'], realMin: 110, realN: 50 }
  };
  L.pickMock = function (group, n) {
    const cfg = L.MOCK[group]; const per = Math.ceil(n / cfg.subjects.length);
    const parts = cfg.subjects.map(sid => {
      // 單元順序打亂（短的模擬考也會輪到後面的單元）；同單元先出沒做過的題目，成績才反映真實程度
      const units = U.shuffle((TA.DATA.units[sid] || []).map(u => { const ids = L.BY_UNIT[u.id] || []; return U.shuffle(ids.filter(id => !seen(id))).concat(U.shuffle(ids.filter(seen))); }));
      return balancedTake(units, per);
    });
    // 依難度排序（先易後難，像真的考卷），同難度保持科目交錯
    const take = balancedTake(parts, n).sort((a, b) => L.Q[a].d - L.Q[b].d);
    return L.groupPassages(take);
  };
  L.mockSeconds = (group, n) => Math.round(L.MOCK[group].realMin * 60 / L.MOCK[group].realN * n);

  /* ---------- 統計 ---------- */
  L.unitStats = function (uid) {
    const ids = L.BY_UNIT[uid] || [];
    let n = 0, c = 0, m = 0, seenN = 0;
    ids.forEach(id => { const r = rec(id); if (r) { seenN++; n += r.n; c += r.c; m += r.s / 6; } });
    return { total: ids.length, seen: seenN, acc: n ? c / n : 0, attempts: n, mastery: ids.length ? m / ids.length : 0 };
  };
  L.subjectStats = function (sid) {
    const ids = L.BY_SUBJECT[sid] || [];
    let n = 0, c = 0, m = 0, seenN = 0, mastered = 0;
    ids.forEach(id => { const r = rec(id); if (r) { seenN++; n += r.n; c += r.c; m += r.s / 6; if (r.s >= L.MASTER_BOX) mastered++; } });
    return { total: ids.length, seen: seenN, acc: n ? c / n : 0, attempts: n, mastery: ids.length ? m / ids.length : 0, mastered };
  };
  L.weakUnits = function (k) {
    const list = [];
    TA.SUBJECTS.forEach(s => (TA.DATA.units[s.id] || []).forEach(u => {
      const st = L.unitStats(u.id);
      // 有作答但正確率低者優先，其次是完全沒碰過的單元
      const score = st.attempts ? st.acc * 0.6 + st.mastery * 0.4 : 0.55 + (U.hash(u.id + U.dayKey()) % 100) / 1000;
      list.push({ id: u.id, unit: u, subject: s, score, st });
    }));
    return list.sort((a, b) => a.score - b.score).slice(0, k || 5);
  };
  L.overall = function () {
    let n = 0, c = 0, seenN = 0, mastered = 0;
    for (const id in TA.S.q) { const r = TA.S.q[id]; if (!L.Q[id]) continue; n += r.n; c += r.c; seenN++; if (r.s >= L.MASTER_BOX) mastered++; }
    const vm = Object.values(TA.S.voc).filter(r => r.s >= L.MASTER_BOX).length;
    return { attempts: n, correct: c, seen: seenN, mastered, acc: n ? c / n : 0, total: L.ALL.length, vocabMastered: vm, vocabTotal: L.VOCAB.length };
  };
  L.vocabDue = function () {
    const t = today();
    return L.VOCAB.filter(v => { const r = TA.S.voc[v.w]; return r && r.due <= t && r.s < 6; });
  };
  L.vocabNew = function (lv) { return L.VOCAB.filter(v => !TA.S.voc[v.w] && (!lv || v.lv === lv)); };

  /* ---------- 成就 ---------- */
  const A = (id, name, desc, icon, gems, test) => ({ id, name, desc, icon, gems, test });
  const isle = () => TA.S.isle || {};
  const museumN = () => ['fish', 'bug', 'fossil', 'sea', 'mineral'].reduce((n, k) => n + Object.keys(((isle().museum || {})[k]) || {}).length, 0);
  const totalCorrect = () => Object.values(TA.S.q).reduce((a, r) => a + r.c, 0);
  const starsCount = k => Object.values(TA.S.units).filter(u => u.stars >= k).length;
  L.ACH = [
    A('first', '第一道潮聲', '完成第一題', 'wave', 10, () => totalCorrect() + Object.keys(TA.S.q).length > 0),
    A('c100', '百題水手', '累積答對 100 題', 'check', 30, () => totalCorrect() >= 100),
    A('c500', '五百浬航程', '累積答對 500 題', 'compass', 60, () => totalCorrect() >= 500),
    A('c1000', '千題燈塔', '累積答對 1000 題', 'lighthouse', 120, () => totalCorrect() >= 1000),
    A('s3', '三日潮汐', '連續學習 3 天', 'flame', 20, () => TA.S.streak.best >= 3),
    A('s7', '一週不熄', '連續學習 7 天', 'flame', 50, () => TA.S.streak.best >= 7),
    A('s21', '三週習慣', '連續學習 21 天', 'flame', 120, () => TA.S.streak.best >= 21),
    A('s50', '五十日長征', '連續學習 50 天', 'flame', 250, () => TA.S.streak.best >= 50),
    A('combo10', '十連潮湧', '單場連續答對 10 題', 'bolt', 30, () => (TA.S.bestCombo || 0) >= 10),
    A('combo25', '巨浪不止', '單場連續答對 25 題', 'bolt', 80, () => (TA.S.bestCombo || 0) >= 25),
    A('boss1', '初斬海獸', '擊敗任一首領', 'swords', 40, () => Object.values(TA.S.boss).some(b => b.wins > 0)),
    A('boss5', '五海征服者', '擊敗 5 種不同首領', 'swords', 100, () => Object.values(TA.S.boss).filter(b => b.wins > 0).length >= 5),
    A('boss10', '十海之王', '擊敗全部 10 種首領', 'trophy', 300, () => Object.values(TA.S.boss).filter(b => b.wins > 0).length >= 10),
    A('rush1k', '激流千分', '衝刺模式單場 1000 分', 'bolt', 40, () => TA.S.rush.best >= 1000),
    A('rush3k', '逆流而上', '衝刺模式單場 3000 分', 'bolt', 100, () => TA.S.rush.best >= 3000),
    A('mock1', '第一次模考', '完成一次模擬考', 'exam', 30, () => TA.S.exams.length >= 1),
    A('mock80', '頂標航線', '模擬考 30 題以上得分率達 80%', 'target', 100, () => TA.S.exams.some(e => e.n >= 30 && e.c / e.n >= 0.8)),
    A('star10', '十座燈塔', '10 個單元取得三星', 'star', 60, () => starsCount(3) >= 10),
    A('star30', '群島長明', '30 個單元取得三星', 'star', 150, () => starsCount(3) >= 30),
    A('allsub', '五科全航', '五大考科都至少作答 20 題', 'compass', 50, () => TA.GROUPS.every(g => TA.SUBJECTS.filter(s => s.group === g).reduce((a, s) => a + L.subjectStats(s.id).seen, 0) >= 20)),
    A('voc100', '百字錨', '單字熟練 100 個', 'cards', 50, () => Object.values(TA.S.voc).filter(r => r.s >= L.MASTER_BOX).length >= 100),
    A('voc400', '字海舵手', '單字熟練 400 個', 'cards', 150, () => Object.values(TA.S.voc).filter(r => r.s >= L.MASTER_BOX).length >= 400),
    A('focus5', '五小時專注', '潮汐鐘累積專注 5 小時', 'clock', 60, () => TA.S.focus.min >= 300),
    A('focus30', '深海潛修', '潮汐鐘累積專注 30 小時', 'clock', 200, () => TA.S.focus.min >= 1800),
    A('fix50', '補洞專家', '修復 50 道錯題', 'shield', 80, () => Object.values(TA.S.q).filter(r => r.wr > 0 && r.s >= 3).length >= 50),
    A('night', '夜航者', '在深夜 23 點後完成學習', 'sparkle', 15, () => TA.S._night),
    A('dawn', '晨光讀書人', '在清晨 5–7 點完成學習', 'sparkle', 15, () => TA.S._dawn),
    A('daily7', '七日航誌', '完成 7 次每日潮汐', 'calendar', 60, () => (TA.S.dailyDone || 0) >= 7),
    // 潮汐小島
    A('isle_fish10', '小島釣手', '在潮汐小島釣到 10 條魚', 'wave', 20, () => ((isle().stats || {}).fish || 0) >= 10),
    A('isle_fish_dex', '魚類圖鑑', '圖鑑登錄 30 種魚', 'wave', 60, () => Object.keys((isle().dex || {}).fish || {}).length >= 30),
    A('isle_bug_dex', '昆蟲學者', '圖鑑登錄 25 種蟲', 'sparkle', 60, () => Object.keys((isle().dex || {}).bug || {}).length >= 25),
    A('isle_fossil', '化石獵人', '鑑定 10 種化石', 'compass', 50, () => Object.keys((isle().dex || {}).fossil || {}).length >= 10),
    A('isle_museum30', '博物館之友', '捐贈 30 件展品給博物館', 'trophy', 60, () => museumN() >= 30),
    A('isle_museum100', '館長的驕傲', '捐贈 100 件展品給博物館', 'trophy', 200, () => museumN() >= 100),
    A('isle_bond', '交心的朋友', '和一位導師完成前 4 段心事事件', 'heart', 50, () => Object.values(isle().bond || {}).some(v => v >= 4)),
    A('isle_friends', '全島好朋友', '十位導師的好感度都達到 8', 'heart', 150, () => TA.SUBJECTS.every(s => ((isle().fr || {})[s.id] || 0) >= 8)),
    A('isle_req20', '熱心島民', '完成 20 個島民委託', 'target', 60, () => ((isle().stats || {}).reqs || 0) >= 20),
    A('isle_gift20', '送禮達人', '送出 20 份禮物', 'gem', 40, () => ((isle().stats || {}).gifts || 0) >= 20),
    A('isle_bday', '生日驚喜', '在島民生日當天送禮', 'star', 30, () => ((isle().stats || {}).bdayGifts || 0) >= 1),
    A('isle_rating3', '三星小島', '島嶼評價達到三星', 'star', 50, () => ((isle().rating || {}).best || 0) >= 3),
    A('isle_rating5', '五星小島', '島嶼評價達到五星', 'star', 200, () => ((isle().rating || {}).best || 0) >= 5),
    A('isle_guest', '歡迎新鄰居', '邀請一位旅客搬到島上', 'home', 60, () => Object.keys((isle().guests || {}).moved || {}).length >= 1),
    A('isle_room20', '室內設計師', '在房間裡擺滿 20 件家具', 'home', 40, () => ((isle().room || {}).items || []).length >= 20),
    A('isle_design50', '小島造景師', '在島上鋪設 50 格步道或花圃', 'map', 60, () => Object.keys(isle().design || {}).length >= 50),
    A('isle_mendel', '孟德爾的豌豆', '在花園培育出全部 4 種豌豆表現型', 'sparkle', 80, () => ['pea_pt', 'pea_pd', 'pea_wt', 'pea_wd'].every(k => ((isle().garden || {}).book || {})[k])),
    A('isle_stars10', '觀星者', '在星座圖鑑登錄 10 個星座', 'star', 60, () => Object.keys((isle().stars || {}).book || {}).length >= 10),
    A('isle_diy10', '手作達人', '在 DIY 工作台做出 10 件家具', 'gem', 50, () => ((isle().stats || {}).diy || 0) >= 10),
    A('isle_cook10', '島上小廚師', '做出 10 道料理', 'heart', 40, () => ((isle().stats || {}).cook || 0) >= 10),
    A('isle_mineral10', '礦物學家', '礦物圖鑑登錄 10 種', 'compass', 60, () => Object.keys((isle().dex || {}).mineral || {}).length >= 10),
    A('isle_trip5', '航海家', '搭船去神秘島 5 次', 'compass', 50, () => ((isle().stats || {}).trips || 0) >= 5),
    A('isle_plan7', '說到做到', '完成 7 天的讀書計畫', 'target', 80, () => ((isle().stats || {}).plans || 0) >= 7),
    A('isle_word10', '單字偵探', '答對 10 次每日單字謎', 'cards', 50, () => ((isle().stats || {}).wordle || 0) >= 10),
    A('isle_tablet5', '石碑解謎人', '有 5 天把三塊數學石碑全部解開', 'compass', 60, () => ((isle().stats || {}).tablets || 0) >= 5),
    A('isle_cup1', '潮汐盃冠軍', '在潮汐盃快問快答拿下第一名', 'trophy', 60, () => ((isle().stats || {}).cupWins || 0) >= 1),
    A('isle_cram10', '最後衝刺', '完成 10 天考前衝刺精選', 'target', 80, () => ((isle().stats || {}).cram || 0) >= 10),
    A('isle_passport', '護照集章', '九種練習遊戲都至少完成一輪', 'map', 80, () => ['radio', 'idiom', 'plot', 'market', 'chrono', 'council', 'throw', 'periodic', 'moon'].every(k => (isle().practice || {})[k])),
    A('isle_gold3', '三枚金章', '三種練習遊戲各練滿 7 天', 'trophy', 120, () => Object.values(isle().practice || {}).filter(p => p && p.days >= 7).length >= 3),
    A('isle_elem30', '元素收藏家', '在元素週期表收集 30 個元素', 'gem', 60, () => Object.keys(isle().elements || {}).length >= 30),
    A('isle_dream20', '夢裡也在讀書', '在夢境複習中答對 20 題', 'sparkle', 50, () => ((isle().stats || {}).dream || 0) >= 20),
    A('isle_pink', '不完全顯性', '培育出粉紅花紫茉莉', 'sparkle', 30, () => !!(((isle().garden || {}).book || {}).mira_k)),
    A('isle_bond5', '心意相通', '和一位導師解鎖第五段心事', 'heart', 50, () => Object.values(isle().bond || {}).some(v => v >= 5)),
    A('isle_lab1', '研究助手', '完成任一位導師的第一個研究階段', 'sparkle', 20, () => Object.values(isle().lab || {}).some(r => (r.stage || 0) >= 1)),
    A('isle_lab3', '共同研究者', '和一位導師完成整個研究計畫', 'sparkle', 60, () => Object.values(isle().lab || {}).some(r => (r.stage || 0) >= 3)),
    A('isle_lab10', '潮汐研究院', '十位導師的研究計畫全部完成', 'trophy', 300, () => Object.values(isle().lab || {}).filter(r => (r.stage || 0) >= 3).length >= 10),
    A('isle_catalog100', '家具收藏家', '家具目錄登錄 100 種', 'star', 80, () => Object.keys(isle().catalog || {}).length >= 100),
    A('isle_dex_all', '島嶼博物學家', '魚、蟲、化石、潮間帶生物、礦物五種圖鑑全部收齊', 'book', 150, () => !!(isle().collect || {}).dex_all),
    A('isle_museum_all', '博物館的好朋友', '潮汐博物館五個展區全部捐齊', 'trophy', 150, () => !!(isle().collect || {}).mus_all)
  ];
  L.checkAch = function () {
    const S = TA.S, h = new Date().getHours();
    if (h >= 23 || h < 2) S._night = true; if (h >= 5 && h < 7) S._dawn = true;
    const fresh = [];
    L.ACH.forEach(a => {
      if (S.ach[a.id]) return;
      let ok = false; try { ok = a.test(); } catch (e) { ok = false; }
      if (ok) { S.ach[a.id] = Date.now(); S.gems += a.gems; fresh.push(a); }
    });
    fresh.forEach(a => TA.emit('achievement', a));
    if (fresh.length) TA.emit('wallet');
    return fresh;
  };
})(typeof window !== 'undefined' ? window : globalThis);
