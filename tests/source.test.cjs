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
for (const f of JSON.parse(fs.readFileSync(0, 'utf8'))) { const s = fs.readFileSync(f, 'utf8'); let err = null;
  try { new vm.SourceTextModule(s); } catch (e) { err = e; }
  if (err) { try { new vm.Script(s); err = null; } catch (e) {} }
  if (err) bad.push(f + ': ' + err.message); }
process.stdout.write(JSON.stringify(bad));`;
  // v9.10 檔案清單從 stdin 傳（標本模型一多，放在命令列會超過 Windows 的 32 KB 上限，子程序根本跑不起來）
  const r = require('child_process').spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '-e', code], { input: JSON.stringify(list), encoding: 'utf8', maxBuffer: 64 << 20 });
  assert.equal(r.status, 0, (r.error && r.error.message) || r.stderr);
  const bad = JSON.parse(r.stdout).map(s => path.relative(ROOT, s));
  assert.deepEqual(bad, [], '這些檔案有語法錯誤：\n' + bad.join('\n'));
});

test('v9.19 模型載入失敗後可以重試：失敗的 Promise 不留著，同時呼叫只載一次', async () => {
  const vm = require('vm'), src = fs.readFileSync(path.join(ROOT, 'src/isle/actors.js'), 'utf8');
  const seg = src.slice(src.indexOf('const cache ='), src.indexOf('/** 已經載好的模型')).replace('export function loadModel', 'function loadModel');
  let scripts = 0, fail = true, removed = 0;
  const ctx = { window: { TA: { MODELS: {} } }, Uint8Array, atob, cullable: () => true, bend() {}, queueMicrotask,
    document: { createElement: () => ({ remove() { removed++; } }), head: { appendChild(s) { scripts++; queueMicrotask(() => (fail ? s.onerror(new Error('mock')) : (ctx.window.TA.MODELS.m = 'AA==', s.onload()))); } } },
    GLTFLoader: class { parse(b, p, ok) { ok({ scene: { traverse() {} }, animations: [] }); } } };
  vm.createContext(ctx); vm.runInContext(seg + ';globalThis.loadModel = loadModel;', ctx);
  const p1 = ctx.loadModel('m'), p1b = ctx.loadModel('m'); assert.equal(p1, p1b, '同時呼叫共用一個 Promise');
  await p1.catch(() => {}); assert.equal(removed, 1, '失敗的 <script> 拿掉');
  fail = false; const g = await ctx.loadModel('m');
  assert.equal(scripts, 2, '失敗後再呼叫會重新載入'); assert.ok(g && g.scene);
  assert.equal(await ctx.loadModel('m'), g, '成功之後用快取'); assert.equal(scripts, 2);
});

test('v9.19 奔跑的煙塵：共用一顆球，消失時釋放自己的材質', () => {
  const vm = require('vm'), main = fs.readFileSync(path.join(ROOT, 'src/isle/main.js'), 'utf8').split(/\r?\n/);
  const decl = main.find(l => l.startsWith('const puffs = [')), puff = main.find(l => l.startsWith('function puff(')), cleanup = main.find(l => l.includes('for (let i = puffs.length - 1;'));
  let geoms = 0, mats = 0, disposed = 0;
  const c = { THREE: { SphereGeometry: class { constructor() { geoms++; } dispose() { disposed++; } }, MeshBasicMaterial: class { constructor(o) { Object.assign(this, o); mats++; } dispose() { disposed++; } },
    Mesh: class { constructor(g, m) { this.geometry = g; this.material = m; this.userData = {}; this.position = { set() {}, y: 0 }; this.scale = { setScalar() {} }; } } }, scene: { add() {}, remove() {} }, Math };
  vm.createContext(c); vm.runInContext(decl + '\n' + puff + '\nfor (let k = 0; k < 100; k++) puff(0, 0, 0);\nconst dt = 1;\n' + cleanup + '\nglobalThis.left = puffs.length;', c);
  assert.equal(c.left, 0); assert.equal(geoms, 1, '只建一顆共用的球'); assert.equal(mats, 100); assert.equal(disposed, 100, '每顆的材質都釋放');
});

test('v9.20 isle.html 載入 src/data 裡的每一個題庫檔（新增題庫檔時不會漏掉）', () => {
  const html = fs.readFileSync(path.join(ROOT, 'isle.html'), 'utf8');
  const missing = fs.readdirSync(path.join(ROOT, 'src/data')).filter(f => f.endsWith('.js') && !html.includes(`src="src/data/${f}"`));
  assert.deepEqual(missing, []);
});

test('v9.21 互動提示：內容沒變不重寫、位置沒動不重設；換內容才重建，沒有提示就收起；動作鈕同理', () => {
  const vm = require('vm'), src = fs.readFileSync(path.join(ROOT, 'src/isle/main.js'), 'utf8');
  const seg = src.slice(src.indexOf('const PR = {'), src.indexOf('function houseTick('));
  let html = 0, left = 0, top = 0, text = 0, created = 0, removed = 0, measured = 0;
  const mk = () => {
    created++; const el = { isConnected: true, classList: { toggle() {} }, remove() { removed++; el.isConnected = false; }, style: {} };
    Object.defineProperty(el, 'offsetWidth', { get() { measured++; return 80; } });
    Object.defineProperty(el, 'innerHTML', { set() { html++; } });
    Object.defineProperty(el.style, 'left', { set() { left++; } }); Object.defineProperty(el.style, 'top', { set() { top++; } });
    return el;
  };
  const act = { classList: { toggle() {} } }; Object.defineProperty(act, 'textContent', { set() { text++; } });
  const c = { ui: { el: mk }, $: id => (id === 'labels' ? { appendChild() {} } : act), THREE: { MathUtils: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) } }, innerWidth: 1000, Math };
  vm.createContext(c); vm.runInContext(seg + ';globalThis.promptAt = promptAt; globalThis.actLabel = actLabel;', c);
  for (let i = 0; i < 60; i++) { c.promptAt('聊天', [100, 200]); c.actLabel('聊天'); }
  assert.deepEqual([created, html, left, top, text], [1, 1, 1, 1, 1], '站著不動 60 格：每樣只寫一次');
  c.promptAt('聊天', [130, 200]); assert.deepEqual([html, left, top], [1, 2, 1], '移動只更新位置');
  c.promptAt('看信箱', [130, 200]); c.actLabel('看信箱'); assert.deepEqual([html, text], [2, 2], '換內容才重建');
  c.promptAt('', null); assert.equal(removed, 1, '沒有提示就收起');
  c.promptAt('聊天', [130, 200]); assert.equal(created, 2, '再出現時重新建立');
  for (let i = 0; i < 30; i++) c.promptAt('聊天', [990, 200], { clamp: true });
  assert.equal(measured, 1, '不超出畫面：寬度只在內容改變時量一次');
});

test('v9.21 島民名牌：看不到的名牌不搬位置，位置與透明度沒變不寫；藏起來再出現會重新寫透明度', () => {
  const vm = require('vm'), src = fs.readFileSync(path.join(ROOT, 'src/isle/main.js'), 'utf8');
  const seg = src.slice(src.indexOf('const PR = {'), src.indexOf('function houseTick('));
  let op = 0, pos = 0;
  const el = { style: {} };
  Object.defineProperty(el.style, 'opacity', { set() { op++; } });
  Object.defineProperty(el.style, 'left', { set() { pos++; } }); Object.defineProperty(el.style, 'top', { set() { pos++; } });
  const c = { ui: {}, $: () => ({}), THREE: {}, Math };
  vm.createContext(c); vm.runInContext(seg + ';globalThis.tagAt = tagAt; globalThis.tagOff = tagOff;', c);
  for (let i = 0; i < 60; i++) c.tagAt(el, 100 + i, 200 + i, 0);
  assert.deepEqual([op, pos], [1, 0], '遠處看不到的名牌：只寫一次透明度，不搬位置');
  for (let i = 0; i < 60; i++) c.tagAt(el, 300, 200, 0.9);
  assert.deepEqual([op, pos], [2, 2], '走近：寫一次透明度與位置，站著不動就不再寫');
  c.tagOff(el); c.tagAt(el, 300, 200, 0.9);
  assert.deepEqual([op, pos], [4, 2], '進屋藏起來再出來：重新寫透明度，位置沒變不寫');
});
