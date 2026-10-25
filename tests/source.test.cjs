/* 原始碼檢查：node --test tests/source.test.cjs
   行尾的 // 註解後面不能藏著程式碼——v6.34.0 在一行程式中間插入註解，把後面的 birthdayNews()、季節標題一起註解掉了，
   語法檢查與其他測試都抓不到。 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['data', 'models', 'vendor']);   // 資料檔、3D 模型與第三方程式不檢查
function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) files(path.join(dir, e.name), out); }
    else if (e.name.endsWith('.js')) out.push(path.join(dir, e.name));
  }
  return out;
}
const KW = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'instanceof', 'else', 'do', 'yield', 'await']);
/** 找出所有 // 註解 [行號, 內容]（略過字串、樣板字串、正規表示式與區塊註解） */
function lineComments(src) {
  const out = [], tpl = [];   // tpl：樣板字串裡 ${ } 的大括號深度
  let i = 0, line = 1, prev = '';   // prev：上一個有意義的符號，用來分辨除號與正規表示式
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { let j = src.indexOf('\n', i); if (j < 0) j = src.length; out.push([line, src.slice(i + 2, j)]); i = j; continue; }
    if (c === '/' && src[i + 1] === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? src.length : j + 2; for (let k = i; k < j; k++) if (src[k] === '\n') line++; i = j; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; } i = j + 1; prev = 'a'; continue; }
    if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === 0)) {
      if (c === '}') tpl.pop();
      let j = i + 1;
      while (j < src.length && src[j] !== '`') { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '$' && src[j + 1] === '{') break; if (src[j] === '\n') line++; j++; }
      if (src[j] === '$') { tpl.push(0); i = j + 2; prev = '('; continue; }
      i = j + 1; prev = 'a'; continue;
    }
    if (c === '{' && tpl.length) tpl[tpl.length - 1]++;
    if (c === '}' && tpl.length && tpl[tpl.length - 1] > 0) tpl[tpl.length - 1]--;
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {   // 正規表示式
      let j = i + 1, cls = false;
      while (j < src.length && src[j] !== '\n') { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break; j++; }
      i = j + 1; while (/[a-z]/i.test(src[i] || '')) i++; prev = 'a'; continue;
    }
    const m = /^[A-Za-z_$0-9][\w$]*/.exec(src.slice(i, i + 80));
    if (m) { i += m[0].length; prev = KW.has(m[0]) ? '(' : 'a'; continue; }
    prev = c === ')' || c === ']' ? 'a' : c; i++;
  }
  return out;
}
const CODE = [
  /[A-Za-z_$][\w$.]*\([^()]*\)[)\s]*;/,         // 呼叫();（含巢狀呼叫的結尾 f(g(x));）
  /\b(const|let|var)\s+[A-Za-z_$][\w$]*\s*=/,   // 宣告
  /\bif\s*\(.*\)\s*[{A-Za-z_$]/,                // if (…) …
  /=>\s*\{/,                                     // 箭頭函式的本體
  /\b[A-Za-z_$][\w$.]*\s*=\s*[^=].*;\s*$/,       // 指派;
];
const swallowed = src => lineComments(src).filter(([, t]) => CODE.some(r => r.test(t.trim())));

test('掃描器本身：抓得到被註解吃掉的程式，字串、正規表示式、樣板字串裡的 // 不算', () => {
  assert.deepEqual(swallowed('a();   // 小地圖 b(); c();\n').map(x => x[0]), [1]);
  assert.deepEqual(swallowed('for (;;) { const e = 1;   // 光斑 p.set(i, c.copy(e).mul(on)); }\n').map(x => x[0]), [1]);   // 巢狀呼叫被吃掉也要抓到
  assert.deepEqual(swallowed('const s = "// x();";\nconst r = /\\/\\/ y();/;\nconst t = `${a} // z();`;\n'), []);
  assert.deepEqual(swallowed('x = a / b; // 一般說明\n/* f(); */\n'), []);
  assert.deepEqual(swallowed('const t = `a${b ? `c${d}` : \'\'}`; // 巢狀樣板\nfoo();   // const k = 1;\n').map(x => x[0]), [2]);
});

test('src 裡沒有藏在 // 註解後面的程式碼', () => {
  const bad = [];
  files(path.join(ROOT, 'src')).forEach(f => {
    swallowed(fs.readFileSync(f, 'utf8')).forEach(([ln, t]) => bad.push(`${path.relative(ROOT, f)}:${ln}: //${t.slice(0, 120)}`));
  });
  assert.deepEqual(bad, [], '這些註解後面看起來還有程式碼（被註解掉了）：\n' + bad.join('\n'));
});

// v6.92.0：註解吃掉的是結尾的 });，上面的掃描器認不出來，整座島卡在「島嶼載入中…」——所以每個檔都真的解析一次
test('src 裡每個 .js 都解析得過（模組或一般腳本皆可）', () => {
  const list = files(path.join(ROOT, 'src'), []).concat(['data', 'models'].flatMap(d => { const p = path.join(ROOT, 'src/isle', d); return fs.existsSync(p) ? files(p, []) : []; }));
  const code = `const vm = require('vm'), fs = require('fs'), bad = [];
for (const f of JSON.parse(process.argv[1])) { const s = fs.readFileSync(f, 'utf8'); let err = null;
  try { new vm.SourceTextModule(s); } catch (e) { err = e; }
  if (err) { try { new vm.Script(s); err = null; } catch (e) {} }
  if (err) bad.push(f + ': ' + err.message); }
process.stdout.write(JSON.stringify(bad));`;
  const r = require('child_process').spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '-e', code, JSON.stringify(list)], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const bad = JSON.parse(r.stdout).map(s => path.relative(ROOT, s));
  assert.deepEqual(bad, [], '這些檔案有語法錯誤：\n' + bad.join('\n'));
});
