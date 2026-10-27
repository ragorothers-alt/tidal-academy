/* 潮汐學院 · 存檔：localStorage + 匯出/匯入 + 結構驗證。 */
(function (root) {
  'use strict';
  const TA = root.TA = root.TA || {};
  const KEY = 'tidal-academy-v2';
  const VERSION = 2;

  function defaults() {
    return {
      ver: VERSION,
      created: Date.now(),
      profile: { name: '', examDate: '2027-01-22', target: '', dailyGoal: 30, onboarded: false, targets: {}, track: { groups: [], main: [] } },   // targets：各考科的目標級分（v7.0）；track：備考航線（v7.1，groups 空＝全部考科）
      settings: { sfx: true, music: true, volume: 0.7, motion: 'full', sea: 'high', autoNext: false, timer: true, mouse: 1, view: 140, res: 1, gfx: '', texpack: 'pack' },
      world: null,
      isle: null,   // 潮汐小島存檔
      xp: 0,
      gems: 0,
      q: {},        // 題目紀錄 id → {n,c,s,due,last,lastWrong,wr,fav}
      voc: {},      // 單字紀錄 word → {n,c,s,due,last,lastWrong}
      unitRecent: {}, // 單元 id → 最近二十次作答的 0／1；舊檔缺此欄位時用空字典
      units: {},    // 單元 id → {stars,best,notes}
      days: {},     // 'YYYY-MM-DD' → {q,c,voc,min,xp}
      streak: { cur: 0, best: 0, last: '', shields: 1 },
      daily: { date: '', set: [], done: false, claimed: false, chest: false, idx: 0 },   // claimed：每日潮汐完成獎勵；chest：今日航程寶箱
      dailyDone: 0, // 完成今日航程（每日潮汐）的次數（成就「七日航誌」）
      bestCombo: 0, // 最高連續答對
      vocLv: 0,     // 單字卡上次選的等級
      _night: false, _dawn: false,   // 深夜、清晨學習過（成就）
      boss: {},     // subject → {wins,best}
      rush: { best: 0, runs: 0 },
      exams: [],    // {at,group,n,c,pts,secs,units:{uid:[c,n]},drill?}（drill：題型專練，不算級分）
      ach: {},      // id → 解鎖時間
      shop: { owned: ['dusk'], theme: 'dusk' },
      focus: { min: 0, sessions: 0, preset: 25 },
      written: {},   // 非選題 id → {n,best,sc,s,due,last}（v7.0；舊存檔沒有就是空的）
      concepts: {}   // 概念應用 id → {n,c,s,due,ok,last}（v7.1，練習遊戲；和題庫熟練分開）
    };
  }

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  function merge(base, src) {
    if (!isObj(src)) return base;
    for (const k in base) {
      if (!(k in src)) continue;
      const b = base[k], s = src[k];
      if (isObj(b) && Object.keys(b).length && isObj(s)) base[k] = merge(b, s);
      else if (isObj(b) && isObj(s)) base[k] = s;               // 動態字典（q/voc/units…）
      else if (Array.isArray(b) && Array.isArray(s)) base[k] = s;
      else if (typeof b === typeof s && s !== null && !Array.isArray(s) && !Array.isArray(b)) base[k] = s;
      else if (b === null && isObj(s)) base[k] = s;   // 預設為 null 的物件欄位（例如 isle）
    }
    return base;
  }
  function sanitize(s) {
    const n = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    s.xp = Math.max(0, n(s.xp, 0)); s.gems = Math.max(0, n(s.gems, 0));
    for (const id in s.q) { const r = s.q[id]; if (!isObj(r)) { delete s.q[id]; continue; } r.n = n(r.n, 0); r.c = n(r.c, 0); r.s = Math.max(0, Math.min(6, n(r.s, 0))); r.due = n(r.due, 0); r.wr = n(r.wr, 0); if (!(n(r.lastWrong, 0) > 0)) delete r.lastWrong; }
    for (const w in s.voc) { const r = s.voc[w]; if (!isObj(r)) { delete s.voc[w]; continue; } r.s = Math.max(0, Math.min(6, n(r.s, 0))); r.due = n(r.due, 0); r.n = n(r.n, 0); r.c = n(r.c, 0); if (!(n(r.lastWrong, 0) > 0)) delete r.lastWrong; }
    for (const uid in s.unitRecent) { const r = s.unitRecent[uid]; if (!Array.isArray(r)) { delete s.unitRecent[uid]; continue; } s.unitRecent[uid] = r.filter(v => v === 0 || v === 1).slice(-20); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.profile.examDate)) s.profile.examDate = '2027-01-22';
    s.profile.dailyGoal = Math.max(10, Math.min(200, n(s.profile.dailyGoal, 30)));
    if (!isObj(s.profile.targets)) s.profile.targets = {}; for (const g in s.profile.targets) { const v = Math.round(n(s.profile.targets[g], 0)); if (v >= 1 && v <= 15) s.profile.targets[g] = v; else delete s.profile.targets[g]; }
    { const GR = TA.GROUPS || ['國文', '英文', '數學', '社會', '自然'], t = isObj(s.profile.track) ? s.profile.track : {}, ok = a => (Array.isArray(a) ? a : []).filter((x, i, A) => GR.includes(x) && A.indexOf(x) === i);   // 備考航線（v7.1，可選）
      s.profile.track = { groups: ok(t.groups), main: ok(t.main).slice(0, 2) }; }
    if (!isObj(s.concepts)) s.concepts = {}; for (const id in s.concepts) { const r = s.concepts[id]; if (!isObj(r)) { delete s.concepts[id]; continue; } r.n = n(r.n, 0); r.c = Math.min(r.n, n(r.c, 0)); r.s = Math.max(0, Math.min(4, n(r.s, 0))); r.due = n(r.due, 0); r.ok = typeof r.ok === 'string' ? r.ok : ''; r.last = n(r.last, 0); }   // 概念應用（v7.1，可選）
    if (!Array.isArray(s.exams)) s.exams = []; s.exams = s.exams.slice(-60);
    for (const id in s.written) { const r = s.written[id]; if (!isObj(r)) { delete s.written[id]; continue; } r.n = n(r.n, 0); r.best = Math.max(0, Math.min(1, n(r.best, 0))); r.sc = Math.max(0, Math.min(1, n(r.sc, 0))); r.s = Math.max(0, Math.min(4, n(r.s, 0))); r.due = n(r.due, 0); r.last = n(r.last, 0); }
    if (!s.shop.owned.includes('dusk')) s.shop.owned.push('dusk');
    return s;
  }

  const Store = TA.Store = {
    KEY,
    load() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { /* 隱私模式 */ }
      let s = defaults();
      if (raw) { try { s = merge(defaults(), JSON.parse(raw)); } catch (e) { console.warn('存檔損毀，使用新存檔', e); Store.broken = true; try { localStorage.setItem(KEY + '.broken', raw); } catch (e2) { /* 空間不足 */ } } }   // 損毀的存檔留一份，不直接蓋掉
      TA.S = sanitize(s);
      return TA.S;
    },
    save() {
      clearTimeout(Store._t);
      Store._t = setTimeout(Store.flush, 250);
    },
    flush() {
      clearTimeout(Store._t);
      try { localStorage.setItem(KEY, JSON.stringify(TA.S)); Store.ok = true; }
      catch (e) { Store.ok = false; console.warn('無法保存', e); if (Store.onFail) Store.onFail(e); }   // onFail：遊戲端提示玩家
    },
    exportJSON() { return JSON.stringify({ app: 'tidal-academy', exported: new Date().toISOString(), data: TA.S }, null, 1); },
    importJSON(text) {
      const obj = JSON.parse(text);
      if (obj && typeof obj.app === 'string' && obj.app !== 'tidal-academy') throw new Error('這不是潮汐學院的存檔');   // v8.2 其他程式的匯出檔
      const data = obj && obj.app === 'tidal-academy' ? obj.data : obj;
      if (!isObj(data) || !isObj(data.profile)) throw new Error('這不是潮汐學院的存檔');
      const prev = TA.S;
      TA.S = sanitize(merge(defaults(), data));
      Store.flush();
      if (!Store.ok) { TA.S = prev; throw new Error('這台裝置沒辦法寫入存檔（空間不足或無痕模式），原本的進度沒有改變'); }   // 寫不進去：還原，不要說成功
    },
    reset() { TA.S = defaults(); Store.flush(); },
    defaults
  };
  if (typeof window !== 'undefined') window.addEventListener('pagehide', () => TA.S && Store.flush());
})(typeof window !== 'undefined' ? window : globalThis);
