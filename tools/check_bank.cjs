/* 題庫檢查：載入全部題庫，檢查格式與編號；指定檔案時，另外檢查那些檔案的解析與答案分布。
   用法：node tools/check_bank.cjs [src/data/xxx.js ...]
   全部題目：id 不重複、單元存在、4 個不重複選項、a 在 0–3、d 是 1–3、q/e 不是空的、只用 <b><u><i><sup><sub><br>。
   指定的檔案（新增題）：解析至少 40 字（要真的講清楚為什麼）、題組要有閱讀材料；並列出答案位置與難度分布。
   題目與選項不限長度、可以出題組與多選：潮汐小島放不下時會換成大題目面板，題目的深度不必遷就對話框。 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
load('src/core/registry.js');
const files = fs.readdirSync(path.join(ROOT, 'src/data')).filter(f => f.endsWith('.js')).sort();
const owner = {};   // 題目 id → 檔案
const targetNames = process.argv.slice(2).map(f => path.basename(f)), loadErrs = [];
for (const f of files) {
  const before = new Map(Object.entries(ctx.TA.DATA.extra || {}).map(([k, v]) => [k, v.length]));
  const unitsBefore = Object.values(ctx.TA.DATA.units).reduce((a, u) => a + u.reduce((b, x) => b + (x.questions || []).length, 0), 0);
  try { load('src/data/' + f); }
  catch (e) {   // 別的檔案可能正在被另一個工作寫入：只警告；要檢查的檔案本身壞掉才算錯
    if (targetNames.includes(f)) loadErrs.push(`${f} 載入失敗：${e.message}`); else console.log(`（略過無法載入的 ${f}：${e.message}）`);
    continue;
  }
  for (const [k, v] of Object.entries(ctx.TA.DATA.extra || {})) v.slice(before.get(k) || 0).forEach(q => { owner[q.id] = owner[q.id] || f; });
  Object.values(ctx.TA.DATA.units).forEach(u => u.forEach(x => (x.questions || []).forEach(q => { owner[q.id] = owner[q.id] || f; })));
  void unitsBefore;
}
const T = ctx.TA, units = {}, all = [];
for (const [sid, us] of Object.entries(T.DATA.units)) us.forEach(u => { units[u.id] = sid; (u.questions || []).forEach(q => all.push({ ...q, unit: u.id, subject: sid })); });
for (const [uid, qs] of Object.entries(T.DATA.extra || {})) qs.forEach(q => all.push({ ...q, unit: uid, subject: units[uid] }));
const plain = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '');
const num = s => { const t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/[−–—－]/g, '-'); const m = /^([+-]?(?:\d+\.?\d*|\.\d+))(?:\/([+-]?(?:\d+\.?\d*|\.\d+)))?$/.exec(t); if (!m) return NaN; const b = m[2] != null ? parseFloat(m[2]) : 1; return b === 0 ? NaN : parseFloat(m[1]) / b; };
const errs = [...loadErrs], seen = new Map();
const TAG = /<(?!\/?(b|u|i|sup|sub)>|br\s*\/?>)[^>]*>/i;
for (const q of all) {
  const at = `${q.id || '(無 id)'} [${owner[q.id] || '?'}]`;
  if (!q.id) errs.push(`${at} 沒有 id`);
  else if (seen.has(q.id)) errs.push(`${at} id 重複（也在 ${seen.get(q.id)}）`); else seen.set(q.id, owner[q.id]);
  if (!q.subject) errs.push(`${at} 單元 ${q.unit} 不存在`);
  if (q.type === 'fill') {   // 數學選填：沒有選項，ans 是數字（整數、分數 a/b、小數）
    if (q.o) errs.push(`${at} 選填題不要有選項 o`);
    if (q.a != null) errs.push(`${at} 選填題的答案寫在 ans，不要用 a`);
    if (![].concat(q.ans).length || [].concat(q.ans).some(v => !Number.isFinite(num(v)))) errs.push(`${at} 選填答案 ans=${JSON.stringify(q.ans)} 不是數字`);
  } else {
    const nOpt = q.type === 'multi' ? 5 : q.type === 'bank' ? (q.o || []).length : 4;   // 單選 4 個；多選（學測型）5 個；文意選填 6–10 個（同一篇共用）
    if (q.type === 'bank' && (!q.pid || nOpt < 6 || nOpt > 10)) errs.push(`${at} 文意選填要有 pid（同一篇）與 6–10 個選項`);
    if (q.type === 'multi') { if (!Array.isArray(q.a) || !q.a.length || q.a.some(i => !(Number.isInteger(i) && i >= 0 && i < nOpt))) errs.push(`${at} 多選題的 a 不合法`); }
    else if (!(Number.isInteger(q.a) && q.a >= 0 && q.a < nOpt)) errs.push(`${at} a=${q.a} 不合法`);
    if (!Array.isArray(q.o) || q.o.length !== nOpt) errs.push(`${at} 選項不是 ${nOpt} 個`);
    else if (new Set(q.o.map(plain)).size !== nOpt) errs.push(`${at} 選項重複`);
    if (q.type && !['single', 'multi', 'bank'].includes(q.type)) errs.push(`${at} 不認得的題型 ${q.type}`);
  }
  if (![1, 2, 3].includes(q.d)) errs.push(`${at} d=${q.d} 不合法`);
  if (!plain(q.q).trim() || !plain(q.e).trim()) errs.push(`${at} 題幹或解析是空的`);
  for (const s of [q.q, q.e, ...(q.o || [])]) if (TAG.test(String(s))) { errs.push(`${at} 用了不允許的標籤：${String(s).match(TAG)[0]}`); break; }
}
// 指定的新增檔案：解析、題組與分布
const PAS = {};   // 題組的閱讀材料（單元的 passages，或追加題目上的 passages）
Object.values(T.DATA.units).forEach(us => us.forEach(u => Object.assign(PAS, u.passages || {}))); all.forEach(q => q.passages && Object.assign(PAS, q.passages));
const targets = process.argv.slice(2).map(f => path.basename(f));
for (const t of targets) {
  const qs = all.filter(q => owner[q.id] === t);
  if (!qs.length) { errs.push(`${t}：沒有讀到任何題目`); continue; }
  const pos = [0, 0, 0, 0], dd = { 1: 0, 2: 0, 3: 0 }, byUnit = {}, banks = {}; let single = 0, multi = 0, group = 0, fill = 0, bank = 0;
  for (const q of qs) {
    const at = `${q.id} [${t}]`;
    if (q.pid && !PAS[q.pid]) errs.push(`${at} 題組 ${q.pid} 沒有閱讀材料`);
    const el = plain(q.e).length; if (el < 40) errs.push(`${at} 解析只有 ${el} 字（至少 40 字）`);
    if (q.type === 'multi') multi++; else if (q.type === 'fill') fill++; else if (q.type === 'bank') { bank++; (banks[q.pid] = banks[q.pid] || []).push(q); } else { single++; pos[q.a]++; }
    if (q.pid) group++;
    dd[q.d]++; byUnit[q.unit] = (byUnit[q.unit] || 0) + 1;
  }
  // 文意選填：同一篇的每一格共用同一組選項（順序也相同），每個選項最多用一次
  for (const [pid, g] of Object.entries(banks)) {
    const key = JSON.stringify(g[0].o);
    if (g.some(q => JSON.stringify(q.o) !== key)) errs.push(`${pid} [${t}] 文意選填同一篇的選項要完全相同`);
    if (new Set(g.map(q => q.a)).size !== g.length) errs.push(`${pid} [${t}] 文意選填的答案有重複（同一個選項只能用一次）`);
  }
  console.log(`${t}：${qs.length} 題（單選 ${single}、多選 ${multi}${fill ? `、選填 ${fill}` : ''}${bank ? `、文意選填 ${bank}` : ''}、題組 ${group}）｜難度 1/2/3 = ${dd[1]}/${dd[2]}/${dd[3]}｜單選答案位置 A/B/C/D = ${pos.join('/')}`);
  console.log('  各單元：' + Object.entries(byUnit).map(([u, n]) => `${u} ${n}`).join('、'));
  const mx = Math.max(...pos), mn = Math.min(...pos); if (single >= 20 && mx - mn > single * 0.12) errs.push(`${t}：答案位置不平均（${pos.join('/')}）`);
}
const bySub = {}; all.forEach(q => { bySub[q.subject] = (bySub[q.subject] || 0) + 1; });
console.log(`全部 ${all.length} 題：` + Object.entries(bySub).map(([s, n]) => `${s} ${n}`).join('、'));
if (errs.length) { console.log(`\n${errs.length} 個問題：`); errs.slice(0, 80).forEach(e => console.log('  ✗ ' + e)); if (errs.length > 80) console.log(`  …還有 ${errs.length - 80} 個`); process.exit(1); }
console.log('OK');
