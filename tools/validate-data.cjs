#!/usr/bin/env node
/* 題庫驗證器：node tools/validate-data.cjs [檔案...]（不給參數則驗證 src/data/ 全部）
   檢查結構、id 唯一、答案範圍、選項重複、允許的標記、答案位置分布；題型：單選、多選、選填（數學，ans 是數字）、文意選填（6–10 個共用選項）。
   連續三個以上的「?」視為編碼損毀（中文被寫壞）。 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const files = process.argv.slice(2).length
  ? process.argv.slice(2).map(f => path.resolve(f))
  : fs.readdirSync(path.join(ROOT, 'src/data')).filter(f => f.endsWith('.js')).sort().map(f => path.join(ROOT, 'src/data', f));

const ctx = { console };
ctx.globalThis = ctx; ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/core/registry.js'), 'utf8'), ctx, { filename: 'registry.js' });

const errors = [];
const warns = [];
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: path.basename(f) }); }
  catch (e) { errors.push(`${path.basename(f)}: 執行失敗 ${e.message}`); }
}

const TA = ctx.TA;
TA.mergeExtra().forEach(uid => errors.push(`addQuestions 找不到單元 ${uid}`));
const ALLOWED_TAGS = /<\/?(u|b|i|sup|sub|br)\s*\/?>/g;
const num = s => { const t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/[−–—－]/g, '-'); const m = /^([+-]?(?:\d+\.?\d*|\.\d+))(?:\/([+-]?(?:\d+\.?\d*|\.\d+)))?$/.exec(t); if (!m) return NaN; const b = m[2] != null ? parseFloat(m[2]) : 1; return b === 0 ? NaN : parseFloat(m[1]) / b; };
const BROKEN = /\?{3,}/;   // 中文被非 UTF-8 的方式寫壞時會變成一串問號
const checkMarkup = (where, s) => {
  if (typeof s !== 'string' || !s.trim()) { errors.push(`${where}: 空字串`); return; }
  if (BROKEN.test(s)) errors.push(`${where}: 疑似編碼損毀（出現 ???）→ ${s.slice(0, 40)}`);
  const stripped = s.replace(ALLOWED_TAGS, '');
  if (/<[a-zA-Z\/]/.test(stripped)) errors.push(`${where}: 含不允許的 HTML 標籤 → ${s.slice(0, 60)}`);
};

const ids = new Set();
let total = 0;
const report = [];
for (const s of TA.SUBJECTS) {
  const units = TA.DATA.units[s.id];
  let n = 0; const pos = [0, 0, 0, 0, 0]; let multi = 0; const diff = [0, 0, 0, 0];
  for (const u of units) {
    const W = `${s.id}/${u.id}`;
    if (!u.id || !/^[a-z0-9-]+$/.test(u.id)) errors.push(`${W}: 單元 id 格式錯誤`);
    if (ids.has(u.id)) errors.push(`${W}: 單元 id 重複`); ids.add(u.id);
    if (!u.name) errors.push(`${W}: 缺單元名稱`);
    if (!Array.isArray(u.notes) || u.notes.length < 2) errors.push(`${W}: notes 至少 2 則`);
    (u.notes || []).forEach((nt, i) => { checkMarkup(`${W} note${i}.t`, nt.t); checkMarkup(`${W} note${i}.b`, nt.b); });
    const passages = u.passages || {};
    Object.entries(passages).forEach(([k, v]) => checkMarkup(`${W} passage ${k}`, v));
    if (!Array.isArray(u.questions) || u.questions.length < 4) errors.push(`${W}: 題目至少 4 題`);
    (u.questions || []).forEach((q, qi) => {
      const QW = `${W} #${qi} ${q.id || ''}`;
      if (!q.id || !/^[a-z0-9-]+$/.test(q.id)) errors.push(`${QW}: 題目 id 格式錯誤`);
      if (ids.has(q.id)) errors.push(`${QW}: 題目 id 重複`); ids.add(q.id);
      if (![1, 2, 3].includes(q.d)) errors.push(`${QW}: d 必須為 1/2/3`); else diff[q.d]++;
      checkMarkup(`${QW} q`, q.q); checkMarkup(`${QW} e`, q.e);
      if (q.pid && !passages[q.pid]) errors.push(`${QW}: pid ${q.pid} 找不到 passage`);
      if (q.type === 'fill') {   // 數學選填：沒有選項，答案寫在 ans
        if (q.o) errors.push(`${QW}: 選填題不要有選項`);
        if (![].concat(q.ans).length || [].concat(q.ans).some(v => !Number.isFinite(num(v)))) errors.push(`${QW}: 選填答案 ans 不是數字`);
        n++; return;
      }
      if (!Array.isArray(q.o)) { errors.push(`${QW}: 缺選項`); return; }
      q.o.forEach((o, oi) => checkMarkup(`${QW} o${oi}`, o));
      if (new Set(q.o.map(o => String(o).trim())).size !== q.o.length) errors.push(`${QW}: 選項重複`);
      if (q.type === 'multi') {
        multi++;
        if (q.o.length !== 5) errors.push(`${QW}: 多選題需 5 個選項`);
        if (!Array.isArray(q.a) || !q.a.length || q.a.some(a => !Number.isInteger(a) || a < 0 || a >= q.o.length) || new Set(q.a).size !== q.a.length) errors.push(`${QW}: 多選答案格式錯誤`);
      } else if (q.type === 'bank') {   // 文意選填：同一篇共用 6–10 個選項
        if (!q.pid) errors.push(`${QW}: 文意選填要有 pid`);
        if (q.o.length < 6 || q.o.length > 10) errors.push(`${QW}: 文意選填需 6–10 個選項`);
        if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.o.length) errors.push(`${QW}: 答案索引超出範圍`);
      } else {
        if (q.type && q.type !== 'single') errors.push(`${QW}: 未知題型 ${q.type}`);
        if (q.o.length < 3 || q.o.length > 5) errors.push(`${QW}: 單選題需 3–5 個選項`);
        if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.o.length) errors.push(`${QW}: 答案索引超出範圍`);
        else pos[q.a]++;
      }
      n++;
    });
  }
  total += n;
  const single = pos.reduce((a, b) => a + b, 0);
  if (single >= 20) pos.slice(0, 4).forEach((c, i) => { if (c / single > 0.4) warns.push(`${s.name}: 單選答案 ${'ABCD'[i]} 佔 ${(c / single * 100).toFixed(0)}%，分布偏斜`); });
  report.push(`${s.name.padEnd(3, '　')} 單元 ${String(units.length).padStart(2)}  題數 ${String(n).padStart(4)}  多選 ${String(multi).padStart(3)}  難度 ${diff.slice(1).join('/')}  答案分布 ${pos.slice(0, 4).join('/')}`);
}

const vocab = TA.DATA.vocab;
const seenW = new Set();
vocab.forEach((v, i) => {
  const W = `vocab #${i} ${v.w}`;
  if (!v.w || !/^[a-zA-Z][a-zA-Z' -]*$/.test(v.w)) errors.push(`${W}: 單字格式錯誤`);
  const key = String(v.w).toLowerCase();
  if (seenW.has(key)) errors.push(`${W}: 單字重複`); seenW.add(key);
  if (!v.pos || !v.zh) errors.push(`${W}: 缺詞性或中文`);
  if (BROKEN.test(String(v.zh) + String(v.exZh || ''))) errors.push(`${W}: 中文疑似編碼損毀（出現 ???）`);
  if (![3, 4, 5, 6].includes(v.lv)) errors.push(`${W}: lv 必須為 3–6`);
  if (!v.ex || !v.exZh) errors.push(`${W}: 缺例句或例句翻譯`);
  else if (!new RegExp(key.split(' ')[0].slice(0, Math.max(3, key.length - 3)), 'i').test(v.ex)) warns.push(`${W}: 例句似乎沒有用到該字`);
});

console.log(report.join('\n'));
console.log(`總題數 ${total}，單字 ${vocab.length}`);
warns.forEach(w => console.log('⚠ ' + w));
if (errors.length) { errors.slice(0, 80).forEach(e => console.log('✖ ' + e)); console.log(`共 ${errors.length} 個錯誤`); process.exit(1); }
console.log('✔ 驗證通過');
