/* 潮汐學院 · 內容註冊中心：科目定義與題庫/單字註冊 API（資料檔在此之後載入）。 */
(function (root) {
  'use strict';
  const TA = root.TA = root.TA || {};

  TA.SUBJECTS = [
    { id: 'chinese',   name: '國文', short: '國', group: '國文', hue: 352, color: '#ff8fa3', glyph: '文' },
    { id: 'english',   name: '英文', short: '英', group: '英文', hue: 205, color: '#7cc7ff', glyph: 'En' },
    { id: 'math',      name: '數學', short: '數', group: '數學', hue: 265, color: '#b9a2ff', glyph: '∑' },
    { id: 'history',   name: '歷史', short: '歷', group: '社會', hue: 32,  color: '#ffb86b', glyph: '史' },
    { id: 'geography', name: '地理', short: '地', group: '社會', hue: 95,  color: '#a6e07a', glyph: '經' },
    { id: 'civics',    name: '公民', short: '公', group: '社會', hue: 48,  color: '#ffd76b', glyph: '公' },
    { id: 'physics',   name: '物理', short: '物', group: '自然', hue: 190, color: '#5ee7f0', glyph: 'F' },
    { id: 'chemistry', name: '化學', short: '化', group: '自然', hue: 160, color: '#62f0b8', glyph: '⌬' },
    { id: 'biology',   name: '生物', short: '生', group: '自然', hue: 130, color: '#8ff07a', glyph: '❦' },
    { id: 'earth',     name: '地科', short: '科', group: '自然', hue: 225, color: '#93a8ff', glyph: '◐' }
  ];
  TA.GROUPS = ['國文', '英文', '數學', '社會', '自然'];
  TA.subject = id => TA.SUBJECTS.find(s => s.id === id);

  TA.DATA = TA.DATA || { units: {}, vocab: [] };
  TA.SUBJECTS.forEach(s => { if (!TA.DATA.units[s.id]) TA.DATA.units[s.id] = []; });

  /** 為科目追加單元：{id,name,notes:[{t,b}],passages?:{key:text},questions:[...]} */
  TA.addUnits = function (subjectId, units) {
    if (!TA.DATA.units[subjectId]) throw new Error('未知科目 ' + subjectId);
    units.forEach(u => { u.subject = subjectId; TA.DATA.units[subjectId].push(u); });
  };
  /** 為既有單元追加題目（載入順序無關，索引時合併） */
  TA.DATA.extra = TA.DATA.extra || {};
  TA.addQuestions = function (unitId, questions) {
    (TA.DATA.extra[unitId] = TA.DATA.extra[unitId] || []).push(...questions);
  };
  /** 為既有單元追加潮汐筆記 [{t,b}] */
  TA.DATA.extraNotes = TA.DATA.extraNotes || {};
  TA.addNotes = function (unitId, notes) {
    (TA.DATA.extraNotes[unitId] = TA.DATA.extraNotes[unitId] || []).push(...notes);
  };
  TA.mergeExtra = function () {
    const missing = [];
    for (const uid in TA.DATA.extraNotes) {
      let unit = null;
      for (const sid in TA.DATA.units) { unit = TA.DATA.units[sid].find(u => u.id === uid) || unit; }
      if (!unit) { missing.push(uid); continue; }
      unit.notes = (unit.notes || []).concat(TA.DATA.extraNotes[uid]);
    }
    TA.DATA.extraNotes = {};
    for (const uid in TA.DATA.extra) {
      let unit = null;
      for (const sid in TA.DATA.units) { unit = TA.DATA.units[sid].find(u => u.id === uid) || unit; }
      if (!unit) { missing.push(uid); continue; }
      const extra = TA.DATA.extra[uid];
      extra.forEach(q => { if (q.passages) { unit.passages = Object.assign(unit.passages || {}, q.passages); delete q.passages; } });
      unit.questions.push(...extra);
    }
    TA.DATA.extra = {};
    return missing;
  };
  /** 追加單字：{w,pos,zh,lv,ex,exZh} */
  TA.addVocab = function (list) { list.forEach(v => TA.DATA.vocab.push(v)); };
})(typeof window !== 'undefined' ? window : globalThis);
