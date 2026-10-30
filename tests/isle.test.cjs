/* 潮汐小島資料測試：node --test tests/isle.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, Math, Date, JSON };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
['src/core/registry.js', 'src/isle/data/creatures.js', 'src/isle/data/villagers.js', 'src/isle/data/furniture.js', 'src/isle/data/lines.js'].forEach(load);
if (fs.existsSync(path.join(ROOT, 'src/isle/data/icons.js'))) load('src/isle/data/icons.js');
if (fs.existsSync(path.join(ROOT, 'src/isle/data/homes.js'))) load('src/isle/data/homes.js');
if (fs.existsSync(path.join(ROOT, 'src/isle/data/guests.js'))) load('src/isle/data/guests.js');
if (fs.existsSync(path.join(ROOT, 'src/isle/data/bday.js'))) load('src/isle/data/bday.js');
if (fs.existsSync(path.join(ROOT, 'src/isle/data/lines2.js'))) load('src/isle/data/lines2.js');
['stars', 'lines3', 'sealife', 'lines4', 'foods', 'minerals', 'lines5', 'lines6', 'timeline', 'elements', 'idioms', 'routines', 'lines8', 'marine', 'marineicons'].forEach(n => { if (fs.existsSync(path.join(ROOT, `src/isle/data/${n}.js`))) load(`src/isle/data/${n}.js`); });
['researchfurn', 'research', 'collectfurn'].forEach(n => { if (fs.existsSync(path.join(ROOT, `src/isle/data/${n}.js`))) load(`src/isle/data/${n}.js`); });   // 導師研究計畫（家具要在 furniture.js 之後載入）
const I = ctx.TA.ISLE;

test('圖鑑：魚、蟲、化石欄位合法且 id 唯一', () => {
  const ids = new Set();
  const hoursOk = h => Array.isArray(h) && h.every(r => r.length === 2 && r[0] >= 0 && r[1] <= 24 && r[0] < r[1]);
  [['FISH', ['sea', 'river', 'pond', 'pier']], ['BUGS', ['flower', 'tree', 'ground', 'air', 'rock', 'water', 'beach']]].forEach(([k, wh]) => {
    assert.ok(I[k].length >= 20, k + ' 數量');
    I[k].forEach(x => {
      assert.match(x.id, /^[a-z0-9_]+$/); assert.ok(!ids.has(x.id), '重複 id ' + x.id); ids.add(x.id);
      assert.ok(x.name && x.desc && x.desc.length >= 20, x.id + ' 名稱與說明');
      assert.ok(wh.includes(x.where), x.id + ' 出沒地點 ' + x.where);
      assert.ok(hoursOk(x.hours), x.id + ' 時段');
      assert.ok(Array.isArray(x.months) && x.months.length && x.months.every(m => m >= 1 && m <= 12), x.id + ' 月份');
      assert.ok(x.rarity >= 1 && x.rarity <= 5 && x.price > 0, x.id + ' 稀有度與價格');
    });
  });
  const subjects = ctx.TA.SUBJECTS.map(s => s.id);
  assert.ok(I.FOSSILS.length >= 15);
  I.FOSSILS.forEach(x => { assert.ok(!ids.has(x.id), '重複 id ' + x.id); ids.add(x.id); assert.ok(subjects.includes(x.sid), x.id + ' 鑑定科目'); assert.ok(x.desc.length >= 30 && x.price > 0); });
});

test('每個月、每個時段都釣得到魚（海與河），白天都捉得到蟲', () => {
  for (let m = 1; m <= 12; m++) for (let h = 0; h < 24; h += 1) {
    const ok = (list, where) => list.some(x => !x.weather && where.includes(x.where) && x.months.includes(m) && x.hours.some(([a, b]) => h >= a && h < b));
    assert.ok(ok(I.FISH, ['sea', 'pier']), `${m} 月 ${h} 時海裡沒有魚`);
    assert.ok(ok(I.FISH, ['river', 'pond']), `${m} 月 ${h} 時河裡沒有魚`);
    if (h >= 8 && h < 17) assert.ok(ok(I.BUGS, ['flower', 'tree', 'ground', 'air', 'rock', 'water', 'beach']), `${m} 月 ${h} 時沒有蟲`);
  }
});

test('十位島民與店長資料齊全', () => {
  const sids = I.VILLAGERS.map(v => v.sid).sort();
  assert.deepEqual(sids, ctx.TA.SUBJECTS.map(s => s.id).sort());
  I.VILLAGERS.forEach(v => {
    ['morning', 'day', 'evening', 'night'].forEach(k => assert.ok(v.greet[k].length >= 1, v.name + ' greet.' + k));
    ['ask', 'ok', 'bad', 'tips', 'chat'].forEach(k => assert.ok(Array.isArray(v[k]) && v[k].length >= 3, v.name + ' ' + k));
    assert.match(v.fur, /^#[0-9a-f]{6}$/i);
  });
  assert.ok(I.SHOP && I.SHOP.name);
});

test('每個圖鑑條目與工具都有 32×32 PNG 圖示', { skip: !I.ICONS && '圖示檔尚未產生' }, () => {
  const need = [...I.FISH, ...I.BUGS, ...I.FOSSILS].map(x => x.id).concat(['rod', 'net', 'shovel', 'fossil_unknown', 'bells']);
  need.forEach(id => {
    const u = I.ICONS[id]; assert.ok(u && u.startsWith('data:image/png;base64,'), '缺圖示 ' + id);
    const b = Buffer.from(u.split(',')[1], 'base64');
    assert.equal(b.readUInt32BE(16), 32, id + ' 寬'); assert.equal(b.readUInt32BE(20), 32, id + ' 高');
  });
});

test('家具：零件合法、不超出佔地、活動獎勵齊全', () => {
  const ids = new Set(), subjects = ctx.TA.SUBJECTS.map(s => s.id);
  const EV = ['mock_gold', 'mock_silver', 'mock_bronze', 'd100', 'newyear', 'eve', 'after', 'spring', 'mid_autumn'];
  assert.ok(I.FURNITURE.length >= 40);
  I.FURNITURE.forEach(f => {
    assert.ok(!ids.has(f.id), '重複 ' + f.id); ids.add(f.id);
    assert.ok(f.name && f.parts.length >= 3 && f.parts.length <= 30, f.id + ' 零件數');
    const [w, d] = f.size; assert.ok([1, 2].includes(w) && [1, 2].includes(d), f.id + ' 尺寸');
    assert.ok(/^(shop|diy|gift:\w+|event:\w+|research:\w+)$/.test(f.src), f.id + ' 來源');
    if (f.src.startsWith('research:')) assert.ok(subjects.includes(f.src.slice(9)) && f.price === 0, f.id + ' 研究家具的科目與售價');
    if (f.src === 'diy') { assert.ok(f.recipe && Object.keys(f.recipe).length >= 1 && Object.entries(f.recipe).every(([m, n]) => ['branch', 'stone', 'shell', 'fruit', 'iron', 'frag'].includes(m) && Number.isInteger(n) && n > 0 && n <= 12), f.id + ' 配方'); }
    if (f.src.startsWith('gift:')) assert.ok(subjects.includes(f.src.slice(5)), f.id + ' 送禮科目');
    f.parts.forEach(p => {
      assert.ok(['box', 'cyl', 'sph', 'cone', 'tor'].includes(p.t), f.id + ' 零件形狀');
      assert.match(p.c, /^#[0-9a-f]{6}$/i, f.id + ' 顏色');
      assert.ok(Math.abs(p.p[0]) <= w / 2 + 0.06 && Math.abs(p.p[2]) <= d / 2 + 0.06 && p.p[1] >= -0.01 && p.p[1] <= 2.5, f.id + ' 零件位置超出佔地');
    });
  });
  EV.forEach(e => assert.ok(I.FURNITURE.some(f => f.src === 'event:' + e), '缺活動獎勵 ' + e));
  subjects.forEach(sid => assert.ok(I.FURNITURE.some(f => f.src === 'gift:' + sid), sid + ' 沒有好感度禮物'));
  ['WALLPAPER', 'FLOORING'].forEach(k => { assert.ok(I[k].length >= 5); I[k].forEach(p => { assert.match(p.c1, /^#[0-9a-f]{6}$/i); assert.ok(['plain', 'stripe', 'check', 'dot', 'wood', 'tile'].includes(p.pattern)); }); });
});

test('委託、來信、活動台詞：十科與店長齊全，placeholder 正確', () => {
  ctx.TA.SUBJECTS.forEach(s => {
    const L = I.LINES[s.id]; assert.ok(L, s.id);
    ['fish', 'bug', 'fossil', 'quiz', 'deliver', 'thanks'].forEach(k => assert.ok(L.req[k].length >= 2, s.id + ' req.' + k));
    ['fish', 'bug'].forEach(k => L.req[k].forEach(t => assert.ok(t.includes('{item}'), s.id + ' req.' + k + ' 缺 {item}')));
    L.req.deliver.forEach(t => assert.ok(t.includes('{to}'), s.id + ' deliver 缺 {to}'));
    L.letter.bridge.forEach(t => assert.ok(t.includes('{unit}'), s.id + ' bridge 缺 {unit}'));
    ['open', 'bridge', 'close', 'gift'].forEach(k => assert.ok(L.letter[k].length >= 2, s.id + ' letter.' + k));
    ['weekly', 'd100', 'newyear', 'eve', 'after', 'spring', 'mid_autumn'].forEach(k => assert.ok(L.event[k].length >= 1, s.id + ' event.' + k));
  });
  assert.ok(I.LINES.shop && I.LINES.shop.event && I.LINES.shop.event.weekly.length);
});

test('島民的家：家具存在、不重疊、門口可走進房間中央', { skip: !I.HOMES && '尚未產生' }, () => {
  const F = id => I.FURNITURE.find(f => f.id === id);
  Object.entries(I.HOMES).forEach(([sid, h]) => {
    assert.ok(I.WALLPAPER.some(w => w.id === h.wall) && I.FLOORING.some(f => f.id === h.floor), sid + ' 壁紙地板');
    const occ = new Set();
    h.items.forEach(it => {
      const f = F(it.id); assert.ok(f, sid + ' 家具不存在 ' + it.id); assert.ok(!f.src.startsWith('event:'), sid + ' 不可用活動獎勵');
      const [w, d] = it.r % 2 ? [f.size[1], f.size[0]] : f.size;
      assert.ok(it.x >= 0 && it.z >= 0 && it.x + w <= 8 && it.z + d <= 8, sid + ' 超出房間 ' + it.id);
      if (f.cat === 'rug') return;
      if (it.z + d >= 8) assert.ok(!(it.x <= 4 && it.x + w > 3), sid + ' 擋住門口 ' + it.id);
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) { const k = (it.x + x) + ',' + (it.z + z); assert.ok(!occ.has(k), sid + ' 家具重疊 ' + it.id); occ.add(k); }
    });
    // 從門口（3,7）走到中央（3..4, 3..4）
    const seen = new Set(['3,7']), q = [[3, 7]]; let ok = false;
    while (q.length) { const [x, z] = q.shift(); if (x >= 3 && x <= 4 && z >= 3 && z <= 4) { ok = true; break; } [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const X = x + dx, Z = z + dz, k = X + ',' + Z; if (X < 0 || Z < 0 || X > 7 || Z > 7 || seen.has(k) || occ.has(k)) return; seen.add(k); q.push([X, Z]); }); }
    assert.ok(ok, sid + ' 從門口走不到房間中央');
  });
  const sids = ctx.TA.SUBJECTS.map(s => s.id);
  (I.CHATS || []).forEach(c => { assert.ok(sids.includes(c.a) && sids.includes(c.b) && c.a !== c.b); c.lines.forEach(l => assert.ok([c.a, c.b].includes(l[0]) && l[1])); });
  sids.forEach(sid => { const b = (I.BONDS || {})[sid]; if (!b) return; [1, 2, 3, 4].forEach(k => assert.ok(b[k] && b[k].title && b[k].lines.length >= 2, sid + ' bond ' + k)); });
});

function checkRoom(name, h) {
  const F = id => I.FURNITURE.find(f => f.id === id);
  assert.ok(I.WALLPAPER.some(w => w.id === h.wall) && I.FLOORING.some(f => f.id === h.floor), name + ' 壁紙地板');
  const occ = new Set();
  h.items.forEach(it => {
    const f = F(it.id); assert.ok(f, name + ' 家具不存在 ' + it.id); assert.ok(!f.src.startsWith('event:'), name + ' 不可用活動獎勵');
    const [w, d] = it.r % 2 ? [f.size[1], f.size[0]] : f.size;
    assert.ok(it.x >= 0 && it.z >= 0 && it.x + w <= 8 && it.z + d <= 8, name + ' 超出房間 ' + it.id);
    if (f.cat === 'rug') return;
    if (it.z + d >= 8) assert.ok(!(it.x <= 4 && it.x + w > 3), name + ' 擋住門口 ' + it.id);
    for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) { const k = (it.x + x) + ',' + (it.z + z); assert.ok(!occ.has(k), name + ' 家具重疊 ' + it.id); occ.add(k); }
  });
  const seen = new Set(['3,7']), q = [[3, 7]]; let ok = false;
  while (q.length) { const [x, z] = q.shift(); if (x >= 3 && x <= 4 && z >= 3 && z <= 4) { ok = true; break; } [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const X = x + dx, Z = z + dz, k = X + ',' + Z; if (X < 0 || Z < 0 || X > 7 || Z > 7 || seen.has(k) || occ.has(k)) return; seen.add(k); q.push([X, Z]); }); }
  assert.ok(ok, name + ' 從門口走不到房間中央');
}
test('旅客、館員與圖書館資料', { skip: !I.GUESTS && '尚未產生' }, () => {
  const KINDS = ['cat', 'bunny', 'owl', 'penguin', 'deer', 'dog', 'fox', 'frog', 'squirrel', 'bear', 'otter', 'sheep', 'hamster', 'panda', 'koala'];
  const MODES = ['multi', 'group', 'mixed', 'hard', 'vocab', 'subject'], sids = ctx.TA.SUBJECTS.map(s => s.id);
  assert.ok(I.GUESTS.length >= 8);
  const ids = new Set();
  I.GUESTS.forEach(g => {
    assert.ok(!ids.has(g.id)); ids.add(g.id);
    assert.ok(KINDS.includes(g.kind), g.id + ' 物種 ' + g.kind);
    assert.ok(MODES.includes(g.focus.mode) && g.focus.label, g.id + ' 挑戰');
    if (g.focus.subject) assert.ok(sids.includes(g.focus.subject), g.id + ' 科目');
    if (g.focus.mode === 'subject') assert.ok(g.focus.subject, g.id + ' subject 模式要指定科目');
    ['arrive', 'greet', 'challenge', 'pass', 'fail', 'movein', 'settled', 'chat'].forEach(k => assert.ok(g.lines[k] && g.lines[k].length >= 1, g.id + ' lines.' + k));
    checkRoom(g.id, g.home);
  });
  assert.ok(I.LIBRARIAN && KINDS.includes(I.LIBRARIAN.kind));
  ['greet', 'mistakes', 'due', 'vocab', 'notes', 'praise', 'comfort', 'empty'].forEach(k => assert.ok(I.LIBRARIAN[k].length >= 1, 'librarian ' + k));
  checkRoom('library', I.LIBRARY);
  assert.equal(I.RATING.title.length, 5);
});
test('雨天限定生物：每個月都有', () => {
  const rain = [...I.FISH, ...I.BUGS].filter(x => x.weather);
  if (!rain.length) return;
  rain.forEach(x => assert.equal(x.weather, 'rain', x.id));
  for (let m = 1; m <= 12; m++) assert.ok(rain.some(x => x.months.includes(m)), m + ' 月沒有雨天生物');
});

test('生日與送禮喜好：22 位、日期不重複、喜好物件存在', { skip: !I.BDAY && '尚未產生' }, () => {
  const keys = ctx.TA.SUBJECTS.map(s => s.id).concat((I.GUESTS || []).map(g => 'guest:' + g.id));
  const dates = new Set(), ids = new Set([...I.FISH, ...I.BUGS, ...I.FOSSILS, ...I.FURNITURE].map(x => x.id)), cats = new Set(I.FURNITURE.map(f => f.cat));
  keys.forEach(k => {
    const b = I.BDAY[k]; assert.ok(b, '缺 ' + k);
    assert.match(b.date, /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, k + ' 日期');
    assert.ok(!['01-22', '01-23', '01-24'].includes(b.date), k + ' 撞學測');
    assert.ok(!dates.has(b.date), k + ' 生日重複'); dates.add(b.date);
    (b.likes.items || []).forEach(id => assert.ok(ids.has(id), k + ' 最愛不存在 ' + id));
    [...(b.likes.cats || []), ...(b.dislikes.cats || [])].forEach(c => assert.ok(cats.has(c), k + ' 家具類別 ' + c));
    [...(b.likes.kinds || []), ...(b.dislikes.kinds || [])].forEach(x => assert.ok(['fish', 'bug', 'fossil', 'furn'].includes(x), k + ' 類型 ' + x));
    ['birthday', 'party', 'love', 'like', 'ok', 'meh', 'thanks'].forEach(x => assert.ok(b.lines[x] && b.lines[x].length >= 1, k + ' lines.' + x));
  });
  ctx.TA.SUBJECTS.forEach(s => assert.ok(I.PLAYER_BDAY[s.id], 'PLAYER_BDAY ' + s.id));
});

test('大賽、弱點委託、互贈禮物與搬遷台詞；大賽獎盃', { skip: !I.LINES2 && '尚未產生' }, () => {
  const L = I.LINES2, ok = (arr, need, ban, label) => { assert.ok(Array.isArray(arr) && arr.length >= 2, label + ' 數量'); arr.forEach(t => { assert.ok(typeof t === 'string' && t.length >= 6 && !/�|[\r\n]/.test(t), label + ' 文字'); need.forEach(k => assert.ok(t.includes('{' + k + '}'), label + ' 缺 {' + k + '}')); (t.match(/\{(\w+)\}/g) || []).forEach(m => assert.ok(need.includes(m.slice(1, -1)), label + ' 多餘 ' + m)); ban.forEach(w => assert.ok(!t.includes(w), label + ' 不應出現「' + w + '」')); }); };
  ctx.TA.SUBJECTS.forEach(s => {
    const v = L[s.id]; assert.ok(v, s.id);
    ok(v.weak, ['unit'], [], s.id + '.weak'); ok(v.weakDone, [], [], s.id + '.weakDone');
    ok(v.giveTo, ['to', 'item'], ['幫我送', '替我送', '帶給'], s.id + '.giveTo'); ok(v.getFrom, ['from'], ['謝謝你帶', '替'], s.id + '.getFrom');
    ok(v.moveAsk, [], [], s.id + '.moveAsk'); ok(v.moveDone, [], [], s.id + '.moveDone');
  });
  [['fish', 'english'], ['bug', 'biology']].forEach(([k, host]) => {
    const t = L.tourney[k]; assert.equal(t.host, host);
    ['intro', 'start', 'end', 'gold', 'silver', 'bronze', 'none'].forEach(f => ok(t[f], [], [], k + '.' + f));
    ['gold', 'silver'].forEach(m => assert.ok(I.FURNITURE.some(f => f.id === `cup_${k}_${m}` && f.src === 'event:' + k + '_cup' && /^[^?]+$/.test(f.name)), `cup_${k}_${m}`));
  });
});

test('花園遺傳：孟德爾比例、出題答案正確、選項不重複', async () => {
  const G = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/genetics.js')).href);
  assert.deepEqual(G.ratio('pea', 'PpTt', 'PpTt').nums, [9, 3, 3, 1]);
  assert.deepEqual(G.ratio('pea', 'PpTt', 'pptt').nums, [1, 1, 1, 1]);
  assert.deepEqual(G.ratio('mira', 'RW', 'RW').nums, [1, 2, 1]);
  assert.deepEqual(G.ratio('pea', 'PPTT', 'pptt').ids, ['pea_pt']);
  assert.equal(G.clean('pea', 'pPtT'), 'PpTt'); assert.equal(G.clean('mira', 'WR'), 'RW');
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const c = {}; for (let i = 0; i < 16000; i++) { const id = G.phenoOf('pea', G.breed('pea', 'PpTt', 'PpTt', rnd)); c[id] = (c[id] || 0) + 1; }
  assert.ok(Math.abs(c.pea_pt / 16000 - 9 / 16) < 0.02 && Math.abs(c.pea_wd / 16000 - 1 / 16) < 0.01, '隨機子代符合 9:3:3:1');
  const pea = ['PPTT', 'PPTt', 'PpTT', 'PpTt', 'PPtt', 'Pptt', 'ppTT', 'ppTt', 'pptt'], mira = ['RR', 'RW', 'WW'];
  const val = f => (f.includes('/') ? f.split('/')[0] / f.split('/')[1] : +f);
  [['pea', pea], ['mira', mira]].forEach(([sp, all]) => all.forEach(a => all.forEach(b => ['pheno', 'geno', 'ratio'].forEach(kind => {
    const ch = G.breed(sp, a, b, rnd), q = G.question(sp, a, b, ch, kind, rnd);
    assert.equal(q.o.length, 4, q.q); assert.equal(new Set(q.o).size, 4, q.q + ' 選項重複');
    const ans = q.o[q.a];
    if (/比例/.test(q.q)) assert.equal(ans, G.ratio(sp, a, b).nums.join('：'), q.q);
    else if (/基因型是/.test(q.q)) { const [n, t] = G.probGenoGivenPheno(sp, a, b, ch); assert.ok(Math.abs(val(ans) - n / t) < 1e-9, q.q); }
    else { const pn = q.q.match(/「(.+?)」/)[1], id = G.PHENOS.find(p => p.name === pn).id, [n, t] = G.probPheno(sp, a, b, id); assert.ok(Math.abs(val(ans) - n / t) < 1e-9, q.q); }
  }))));
});

test('觀星：恆星時與地平座標、星表資料', async () => {
  const A = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/astro.js')).href);
  const d = new Date('2026-10-15T13:00:00Z');   // 台灣 21:00
  const L = A.lst(d); assert.ok(L > 22.4 && L < 22.9, '十月晚上九點的恆星時約 22.7 時：' + L);
  const [pa, paz] = A.altAz(2.53, 89.26, L); assert.ok(Math.abs(pa - 23.5) < 1.2 && (paz < 3 || paz > 357), '北極星高度約等於緯度');
  const [va, vaz] = A.altAz(18.62, 38.78, L); assert.ok(va > 20 && va < 50 && vaz > 270 && vaz < 320, '十月晚上織女星在西北方');
  const [sa] = A.altAz(6.75, -16.7, L); assert.ok(sa < 0, '十月晚上九點天狼星還沒升起');
  assert.ok(A.activeShower([{ peak: '12-14', days: 2 }], new Date(2026, 11, 13, 22)), '雙子座流星雨期間');
  assert.ok(!A.activeShower([{ peak: '12-14', days: 2 }], new Date(2026, 11, 20, 22)));
  if (!I.CONSTELLATIONS) return;
  assert.ok(I.CONSTELLATIONS.length >= 18);
  const ids = new Set(), byName = {};
  I.CONSTELLATIONS.forEach(c => {
    assert.ok(!ids.has(c.id), c.id); ids.add(c.id);
    assert.ok(c.name && c.en && '春夏秋冬'.includes(c.season) && c.desc && c.fact && c.bright, c.id + ' 欄位');
    assert.ok(c.stars.length >= 3 && c.stars.length <= 14, c.id + ' 星數');
    c.stars.forEach(s => { assert.ok(s.ra >= 0 && s.ra < 24 && s.dec >= -90 && s.dec <= 90 && s.mag > -2 && s.mag < 7, c.id + ' 座標'); if (s.n) byName[s.n] = s; });
    c.lines.forEach(([a, b]) => assert.ok(c.stars[a] && c.stars[b] && a !== b, c.id + ' 連線'));
  });
  [['參宿四', 5.92, 7.4], ['天狼星', 6.75, -16.7], ['織女一', 18.62, 38.8], ['北極星', 2.53, 89.3], ['心宿二', 16.49, -26.4]].forEach(([n, ra, dec]) => {
    const s = byName[n] || Object.values(byName).find(x => x.n && x.n.includes(n.slice(0, 2))); assert.ok(s, '找不到 ' + n);
    assert.ok(Math.abs(s.ra - ra) < 0.15 && Math.abs(s.dec - dec) < 1.2, n + ' 座標');
  });
  assert.ok((I.METEOR_SHOWERS || []).length >= 6 && I.METEOR_SHOWERS.every(m => /^\d\d-\d\d$/.test(m.peak) && m.name && m.zhr > 0));
});

test('島民作客台詞：十位、13 種情境、placeholder 正確', { skip: !I.LINES3 && '尚未產生' }, () => {
  const F = ['arrive', 'love', 'mine', 'r1', 'r2', 'r3', 'r4', 'r5', 'study', 'studyGood', 'studyOk', 'bye', 'invite'];
  ctx.TA.SUBJECTS.forEach(s => {
    const v = I.LINES3[s.id]; assert.ok(v, s.id);
    F.forEach(f => { assert.ok(Array.isArray(v[f]) && v[f].length >= 2, s.id + '.' + f); v[f].forEach(t => { assert.ok(!/�|[\r\n]/.test(t), s.id + '.' + f + ' 文字'); const ph = (t.match(/\{(\w+)\}/g) || []); if (f === 'love' || f === 'mine') assert.deepEqual(ph, ['{item}'], s.id + '.' + f); else assert.equal(ph.length, 0, s.id + '.' + f); }); });
  });
});

test('潮汐：月相、大小潮、一天兩次滿潮；潮間帶生物資料', async () => {
  const A = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/astro.js')).href);
  assert.ok(A.moonAge(new Date('2026-10-10T16:00:00Z')) < 1 || A.moonAge(new Date('2026-10-10T16:00:00Z')) > 28.5, '2026/10/10 附近是新月');
  assert.equal(A.moonPhase(14.8), '滿月'); assert.equal(A.moonPhase(7.4), '上弦月');
  assert.ok(A.tideRange(0) > 0.95 && A.tideRange(7.38) < 0.45, '大潮與小潮');
  const tab = A.tideTable(new Date('2026-10-15T12:00:00+08:00'));
  assert.ok(tab.filter(x => x.high).length >= 1 && tab.filter(x => !x.high).length >= 1 && tab.length <= 4, '一天約兩次滿潮兩次乾潮');
  const hi = tab.filter(x => x.high); if (hi.length >= 2) assert.ok(Math.abs(hi[1].t - hi[0].t - 12.42) < 0.25, '兩次滿潮相隔約 12 時 25 分：' + (hi[1].t - hi[0].t));
  const t0 = hi[0].t, t1 = A.tideTable(new Date('2026-10-16T12:00:00+08:00')).filter(x => x.high)[0].t, dd = ((t1 - t0) % 12.42 + 12.42) % 12.42; assert.ok(Math.abs(dd - 0.84) < 0.3, '隔天潮時約晚 50 分鐘：' + dd);
  if (!I.SEALIFE) return;
  const ids = new Set(); assert.ok(I.SEALIFE.length >= 18);
  I.SEALIFE.forEach(x => { assert.ok(!ids.has(x.id) && /^[a-z0-9_]+$/.test(x.id), x.id); ids.add(x.id); assert.ok(['pool', 'rock', 'mud'].includes(x.where) && x.rarity >= 1 && x.rarity <= 5 && x.desc && x.desc.length >= 30 && x.name, x.id); assert.ok(!I.ICONS || I.ICONS[x.id], x.id + ' 圖示'); });
  [1, 6, 12].forEach(m => ['pool', 'rock', 'mud'].forEach(w => assert.ok(I.SEALIFE.some(x => x.where === w && (!x.months || x.months.includes(m))), m + ' 月 ' + w)));
});

test('潮汐夜祭：十位島民台詞、商店台詞、四件限定家具', { skip: !I.LINES4 && '尚未產生' }, () => {
  ctx.TA.SUBJECTS.forEach(s => ['trick', 'treat', 'prank', 'costume'].forEach(f => { const a = I.LINES4[s.id] && I.LINES4[s.id][f]; assert.ok(Array.isArray(a) && a.length >= 2, s.id + '.' + f); a.forEach(t => assert.ok(!/\{|�|[\r\n]/.test(t) && t.length >= 8, s.id + '.' + f)); }));
  ['intro', 'trade'].forEach(f => assert.ok((I.LINES4.shop[f] || []).length >= 2, 'shop.' + f));
  const hw = I.FURNITURE.filter(f => f.src === 'event:halloween'); assert.ok(hw.length >= 4, '夜祭家具');
});

test('料理與礦物：食材與效果合法、圖示齊全', { skip: !I.FOODS && '尚未產生' }, () => {
  const ids = new Set(); assert.ok(I.FOODS.length >= 8);
  I.FOODS.forEach(f => { assert.ok(!ids.has(f.id), f.id); ids.add(f.id); assert.ok(['bells', 'luck', 'speed'].includes(f.effect) && f.fact && f.fact.length >= 30 && f.price > 0, f.id); Object.entries(f.need).forEach(([k, n]) => assert.ok(['fruit', 'fish', 'shellfish', 'oyster', 'pea', 'branch'].includes(k) && n >= 1 && n <= 4, f.id + ' ' + k)); assert.ok(!I.ICONS || I.ICONS[f.id], f.id + ' 圖示'); });
  assert.ok(I.MINERALS.length >= 18);
  I.MINERALS.forEach(m => { assert.ok(!ids.has(m.id), m.id); ids.add(m.id); assert.ok(m.mohs >= 1 && m.mohs <= 10 && m.rarity >= 1 && m.rarity <= 5 && m.desc.length >= 40, m.id); assert.ok(!I.ICONS || I.ICONS[m.id], m.id + ' 圖示'); });
  const byName = n => I.MINERALS.find(m => m.name.includes(n));
  [['石英', 7], ['方解石', 3], ['石膏', 2], ['螢石', 4], ['剛玉', 9]].forEach(([n, h]) => assert.equal(byName(n).mohs, h, n + ' 莫氏硬度'));
  assert.ok(!I.ICONS || I.ICONS.ore_unknown);
});

test('颱風天與熱氣球台詞', { skip: !I.LINES5 && '尚未產生' }, () => {
  ctx.TA.SUBJECTS.forEach(s => ['home', 'tip', 'after'].forEach(f => { const a = I.LINES5[s.id] && I.LINES5[s.id][f]; assert.ok(Array.isArray(a) && a.length >= 2, s.id + '.' + f); a.forEach(t => assert.ok(!/\{|\uFFFD|[\r\n]/.test(t) && t.length >= 8, s.id + '.' + f)); }));
  ['spot', 'win', 'miss'].forEach(f => assert.ok((I.LINES5.balloon[f] || []).length >= 3, 'balloon.' + f));
});

test('數學謎題石碑：各題型 4 個不重複選項、答案正確', async () => {
  const M = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/mathgen.js')).href);
  let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const val = s => (s.includes('/') && !s.includes('√') ? s.split('/')[0] / s.split('/')[1] : +s);
  M.TYPES.forEach(t => { for (let i = 0; i < 300; i++) {
    const q = M.make(t, r);
    assert.equal(q.o.length, 4, t + ' ' + q.q); assert.equal(new Set(q.o).size, 4, t + ' 重複 ' + q.o); assert.ok(q.a >= 0 && q.a < 4, t);
    assert.ok(!q.o.some(o => o.includes("'")), t + ' 補位選項 ' + q.o);
    const ans = q.o[q.a];
    if (t === 'dice') { const s = +q.q.match(/和為 (\d+)/)[1]; let n = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === s) n++; assert.ok(Math.abs(val(ans) - n / 36) < 1e-9, q.q); }
    if (t === 'arith') { const [a1, a2] = q.q.match(/-?\d+/g).map(Number), n = +q.q.match(/第 (\d+) 項/)[1]; assert.equal(+ans, a1 + (n - 1) * (a2 - a1)); }
    if (t === 'log') { const m = q.q.match(/log\S* (\d+)（以 (\d+) 為底）/); assert.ok(m, q.q); assert.equal(Math.round(Math.log(+m[1]) / Math.log(+m[2])), +ans); }
    if (t === 'comb') { const [n, k] = q.q.match(/\d+/g).map(Number); let c = 1; for (let j = 1; j <= k; j++) c = c * (n - k + j) / j; assert.equal(+ans, Math.round(c)); }
  } });
  assert.deepEqual(M.daily('2026-10-15', 0), M.daily('2026-10-15', 0), '同一天同一塊石碑題目固定');
  for (let d = 1; d <= 60; d++) { const k = `2026-11-${String(d % 28 + 1).padStart(2, '0')}x${d}`, qs = [0, 1, 2].map(i => M.daily(k, i).q); assert.equal(new Set(qs).size, 3, '同一天三塊石碑題目不同 ' + k); }
});

test('冬季節慶與考前衝刺台詞、三件節慶家具', { skip: !I.LINES6 && '尚未產生' }, () => {
  ctx.TA.SUBJECTS.forEach(s => ['solstice', 'xmas', 'lantern', 'cram', 'examday'].forEach(f => { const a = I.LINES6[s.id] && I.LINES6[s.id][f]; assert.ok(Array.isArray(a) && a.length >= 2, s.id + '.' + f); a.forEach(t => assert.ok(!/\{|\uFFFD|[\r\n]/.test(t) && t.length >= 8, s.id + '.' + f)); }));
  ['event:xmas', 'event:solstice', 'event:lantern'].forEach(src => assert.ok(I.FURNITURE.some(f => f.src === src), src));
});

test('年代排序資料：三區數量、同區不同年、欄位', { skip: !I.TIMELINE && '尚未產生' }, () => {
  const ids = new Set(), by = {};
  I.TIMELINE.forEach(e => { assert.ok(!ids.has(e.id), e.id); ids.add(e.id); assert.ok(['tw', 'ea', 'world'].includes(e.area) && Number.isInteger(e.y) && e.label && e.note, e.id); const k = e.area + e.y; assert.ok(!by[k], '同區同年 ' + e.id); by[k] = 1; assert.ok(!/\d{3,4}/.test(e.label), e.id + ' label 不含年份'); });
  ['tw', 'ea', 'world'].forEach(a => assert.ok(I.TIMELINE.filter(e => e.area === a).length >= 20, a));
  const y = id => (I.TIMELINE.find(e => e.id === id) || {}).y;
  const find = re => I.TIMELINE.find(e => re.test(e.label));
  [[/馬關條約/, 1895], [/二二八/, 1947], [/解嚴/, 1987], [/辛亥革命|武昌起義/, 1911], [/法國大革命/, 1789], [/柏林圍牆/, 1989]].forEach(([re, yy]) => { const e = find(re); if (e) assert.equal(e.y, yy, e.label); });
});

test('島民議會：計票制度與最大餘數法', async () => {
  const V = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/vote.js')).href);
  // 經典例子：A 相對多數勝，但兩輪與排序複選由 B 勝
  const g = [{ n: 40, order: ['A', 'C', 'D', 'B'] }, { n: 35, order: ['B', 'C', 'D', 'A'] }, { n: 25, order: ['C', 'B', 'D', 'A'] }];
  assert.equal(V.plurality(g).win, 'A'); assert.equal(V.runoff(g).win, 'B'); assert.equal(V.irv(g).win, 'B');
  assert.equal(V.runoff([{ n: 60, order: ['D', 'A', 'B', 'C'] }, { n: 40, order: ['A', 'B', 'C', 'D'] }]).t2, null);
  // 最大餘數法：門檻以下不分配，總席次正確
  const h = V.hare({ X: 4600, Y: 3300, Z: 1600, W: 400 }, 10, 0.05);
  assert.deepEqual(h.ok, ['X', 'Y', 'Z']); assert.equal(h.seats.W, 0); assert.equal(h.seats.X + h.seats.Y + h.seats.Z, 10);
  assert.deepEqual([h.seats.X, h.seats.Y, h.seats.Z], [5, 3, 2]);   // 4.842/3.474/1.684 → 4/3/1，餘數 .842、.684 各加一席
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 300; i++) {
    const b = V.ballots(rnd); assert.ok(b, '產生選票');
    assert.ok(new Set([b.p.win, b.r.win, b.v.win]).size >= 2);
    const N = V.total(b.groups); assert.ok(b.v.rounds[b.v.rounds.length - 1][b.v.win] * 2 > N || b.v.rounds.length === 3);
    const P = V.partyVote(rnd); assert.ok(P, '產生政黨票');
    assert.equal(Object.values(P.h.seats).reduce((a, x) => a + x, 0), 34);
    V.PARTIES.forEach(p => { if (P.votes[p] / P.tot < 0.05) assert.equal(P.h.seats[p], 0, p); });
  }
});

test('函數圖形題：正解相符、四個選項圖形互不相同', async () => {
  const G = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/graphs.js')).href);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  Object.keys(G.KINDS).forEach(k => {
    for (let i = 0; i < 400; i++) {
      const q = G.question(rnd, k); assert.ok(q, k);
      assert.equal(q.opts.length, 4); assert.equal(new Set(q.opts.map(o => o.tex)).size, 4, k + ' 選項文字重複');
      assert.equal(q.opts[q.a].p, q.p);
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert.ok(G.gap(q.opts[a].f, q.opts[b].f, q.view) >= 0.8, k + ' ' + q.opts[a].tex + ' ~ ' + q.opts[b].tex);
      assert.ok(!/undefined|NaN/.test(q.opts.map(o => o.tex).join() + q.hint), q.hint);
    }
  });
  // 文字格式
  assert.equal(G.KINDS.quad.tex({ a: 1, h: 2, k: -3 }), 'y = (x − 2)<sup>2</sup> − 3');
  assert.equal(G.KINDS.quad.tex({ a: -2, h: -1, k: 0 }), 'y = −2(x + 1)<sup>2</sup>');
  assert.equal(G.KINDS.exp.tex({ t: 'log', b: 0.5, k: 1 }), 'y = log<sub>½</sub> x + 1');
  assert.equal(G.KINDS.trig.tex({ fn: 'sin', A: 2, B: 0.5 }), 'y = 2 sin (x/2)');
  assert.equal(G.KINDS.trig.tex({ fn: 'cos', A: -1, B: 2 }), 'y = −cos 2x');
});

test('元素資料：族、週期、分類、提示不洩漏答案', { skip: !I.ELEMENTS && '尚未產生' }, () => {
  const E = I.ELEMENTS, CAT = ['alkali', 'alkaline', 'transition', 'post', 'metalloid', 'nonmetal', 'halogen', 'noble', 'actinide'];
  assert.equal(E.length, 47); assert.equal(new Set(E.map(e => e.sym)).size, 47);
  const ends = [2, 10, 18, 36, 54, 86, 118];
  E.forEach(e => {
    assert.equal(e.period, ends.findIndex(x => e.z <= x) + 1, e.sym + ' 週期');
    assert.ok(CAT.includes(e.cat), e.sym); assert.ok(['s', 'l', 'g'].includes(e.state), e.sym); assert.ok((e.mass > 0 || /^\[\d+\]$/.test(e.mass)) && e.fact, e.sym);
    assert.equal(e.clue.length, 3); e.clue.forEach(c => assert.ok(!c.includes(e.zh) && !c.includes(e.sym) && !c.includes(String(e.z)), e.sym + '：' + c));
    if (e.z <= 2) assert.equal(e.group, e.z === 1 ? 1 : 18);
  });
  const g = s => E.find(e => e.sym === s);
  [['Na', 1, 'alkali'], ['Ca', 2, 'alkaline'], ['Fe', 8, 'transition'], ['Zn', 12, 'transition'], ['Al', 13, 'post'], ['Si', 14, 'metalloid'], ['Cl', 17, 'halogen'], ['Ar', 18, 'noble'], ['Au', 11, 'transition'], ['Pb', 14, 'post'], ['I', 17, 'halogen'], ['Ba', 2, 'alkaline']].forEach(([s, gr, c]) => { assert.equal(g(s).group, gr, s); assert.equal(g(s).cat, c, s); });
  assert.equal(g('U').group, null); assert.equal(g('Br').state, 'l'); assert.equal(g('Hg').state, 'l'); assert.equal(g('Ga').state, 's');
});
test('成語資料：60 則、例句含成語', { skip: !I.IDIOMS && '尚未產生' }, () => {
  const D = I.IDIOMS; assert.equal(D.length, 60); assert.equal(new Set(D.map(d => d.w)).size, 60);
  D.forEach(d => { assert.equal([...d.w].length, 4, d.w); assert.ok(d.ok.includes(d.w) && d.bad.includes(d.w) && d.mean && d.why, d.id); assert.notEqual(d.ok, d.bad); });
});

test('夜市機率題：期望值與不放回機率', async () => {
  const V = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/ev.js')).href);
  assert.equal(V.diceAtLeast(7), 21); assert.equal(V.diceAtLeast(12), 1); assert.equal(V.diceAtLeast(2), 36);
  assert.equal(V.frac(6, 36), '1/6'); assert.equal(V.frac(4, 2), '2');
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const num = s => Number(s.replace('−', '-').replace('+', ''));
  for (let i = 0; i < 300; i++) Object.keys(V.BOOTHS).forEach(k => {
    const q = V.question(rnd, k);
    assert.equal(q.opts.length, 4, k); assert.equal(new Set(q.opts).size, 4, k + ' 選項重複 ' + q.opts);
    assert.ok(q.a >= 0, k); assert.ok(!/NaN|undefined|Infinity/.test(q.text + q.why + q.opts.join()), k);
    if (k !== 'balls') { assert.equal(num(q.opts[q.a]), q.ev, k); assert.ok(Number.isInteger(q.ev)); q.opts.forEach(o => assert.ok(Number.isInteger(num(o)), k + ' ' + o)); }
  });
  // 撈球：3 紅 2 白、兩顆都紅 = 3/5 × 2/4 = 3/10
  let s2 = 0; const fixed = () => [0.3, 0.0, 0.0][s2++ % 3];
  const r = 2 + Math.floor(0.3 * 4), w = 2;   // 與產生器相同的抽法：r = 3、w = 2、kind = rr
  const q = V.BOOTHS.balls(fixed); assert.match(q.text, new RegExp(`${r} 顆紅球、${w} 顆白球`)); assert.equal(q.opts[q.a], '3/10');
});

test('月相觀測題：時刻、方位與答案一致', async () => {
  const M = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/moonq.js')).href);
  assert.deepEqual(M.times(4), { rise: 18, transit: 0, set: 6 });   // 滿月：傍晚升起、午夜最高、清晨落下
  assert.deepEqual(M.times(2), { rise: 12, transit: 18, set: 0 });  // 上弦
  assert.deepEqual(M.times(6), { rise: 0, transit: 6, set: 12 });   // 下弦
  assert.equal(M.hh(0), '午夜 12 點'); assert.equal(M.hh(15), '下午 3 點'); assert.equal(M.hh(3), '凌晨 3 點'); assert.equal(M.hh(21), '晚上 9 點');
  assert.ok(M.lit(M.ageOf(4)) > 0.99 && M.lit(0) < 0.01 && Math.abs(M.lit(M.ageOf(2)) - 0.5) < 0.01);
  assert.equal(M.side(2), '右（西）'); assert.equal(M.side(6), '左（東）');
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = 0; n < 400; n++) Object.keys(M.KINDS).forEach(k => {
    const q = M.question(rnd, k); assert.equal(q.opts.length, 4, k); assert.equal(new Set(q.opts).size, 4, k); assert.ok(q.a >= 0);
    assert.ok(!/undefined|NaN|null/.test(q.q + q.why), k + q.q);
    if (k === 'picture' || k === 'when') assert.equal(q.opts[q.a], M.PHASES[q.i]);
    if (k === 'when') { const t = M.times(q.i); const h = [t.rise, t.transit, t.set].find(x => q.q.startsWith(M.hh(x))); assert.ok(h != null, q.q); }
  });
});

test('夢境島：夢幻家具與島民台詞', () => {
  const c2 = { console, Math, Date, JSON }; c2.window = c2; c2.globalThis = c2; vm.createContext(c2);
  ['src/isle/data/furniture.js', 'src/isle/data/hotelfurn.js', 'src/isle/data/dreamfurn.js', 'src/isle/data/dreamlines.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), c2, { filename: f }));
  const J = c2.TA.ISLE, F = J.FURNITURE.filter(f => f.src === 'dream');
  assert.ok(F.length >= 12, '夢幻家具數量');
  assert.equal(new Set(J.FURNITURE.map(f => f.id)).size, J.FURNITURE.length, '家具 id 重複');
  F.forEach(f => {
    assert.ok(Number.isInteger(f.shard) && f.shard >= 3 && f.shard <= 15, f.id + ' 碎片數');
    const [w, d] = f.size; assert.ok([1, 2].includes(w) && [1, 2].includes(d), f.id + ' 尺寸');
    assert.ok(f.parts.length >= 3 && f.parts.length <= 30, f.id + ' 零件數');
    f.parts.forEach(p => { assert.ok(['box', 'cyl', 'sph', 'cone', 'tor'].includes(p.t)); assert.match(p.c, /^#[0-9a-f]{6}$/i); assert.ok(Math.abs(p.p[0]) <= w / 2 + 0.06 && Math.abs(p.p[2]) <= d / 2 + 0.06 && p.p[1] >= -0.01 && p.p[1] <= 2.5, f.id + ' 零件位置'); });
  });
  const L = J.DREAMLINES, K = ['any', 'night', 'rain', 'snow', 'petal', 'meteor', 'water', 'high', 'flowers', 'sparse', 'rich', 'bench', 'wish', 'jump'];
  ctx.TA.SUBJECTS.forEach(s => K.forEach(k => { assert.ok(Array.isArray(L[s.id] && L[s.id][k]) && L[s.id][k].length >= 2, `${s.id}.${k}`); L[s.id][k].forEach(t => assert.ok(t.length >= 8 && t.length <= 60 && !/[,.]/.test(t), `${s.id}.${k}: ${t}`)); }));
});

test('單字燈塔：測驗題的選項、答案與挖空，翻卡排程與級數統計', async () => {
  ['vocab-34', 'vocab-56', 'vocab-x34', 'vocab-x56'].forEach(n => load(`src/data/${n}.js`));
  const V = ctx.TA.DATA.vocab; assert.ok(V.length > 1000, '單字數量');
  const X = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/lexq.js')).href);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const esc = s => s.replace(/[-/\^$*+?.()|[\]{}]/g, '\$&');
  for (const kind of ['meaning', 'cloze', 'reverse', 'mix']) {
    for (let round = 0; round < 8; round++) {
      const qs = X.buildQuiz(kind, V.slice(round * 250, round * 250 + 250), 15, V, rnd);
      assert.equal(qs.length, 15);
      qs.forEach(q => {
        assert.equal(q.o.length, 4, q.id); assert.equal(new Set(q.o).size, 4, '選項重複 ' + q.id);
        assert.equal(q.o[q.a], q.kind === 'meaning' ? q.vocab.zh : q.vocab.w, '答案位置 ' + q.id);
        if (kind !== 'mix') assert.ok(q.kind === kind || (kind === 'cloze' && q.kind === 'meaning'), '題型 ' + q.id);
        if (q.kind === 'cloze') { const sent = q.q.split('<br>')[0]; assert.ok(sent.includes('＿＿＿＿')); assert.ok(!new RegExp('\b' + esc(q.vocab.w) + '\b', 'i').test(sent), '挖空後還看得到答案 ' + q.id); }
        assert.ok(!/<(?!\/?(b|i|br)>)/.test(q.q + q.e), '只能用 b、i、br 標籤 ' + q.id);
        assert.equal(q.subject, 'english'); assert.ok(q.d >= 1 && q.d <= 3);
      });
    }
  }
  assert.equal(X.blank({ w: 'happy', ex: 'Happy kids make happy parents.' }), '＿＿＿＿ kids make ＿＿＿＿ parents.');
  assert.equal(X.blank({ w: 'decide', ex: 'She decided to stay.' }), 'She ＿＿＿＿ to stay.');
  assert.equal(X.blank({ w: 'buy', ex: 'He bought a car.' }), null);   // 不規則變化找不到 → 改考意思
  assert.equal(X.mark({ w: 'act', ex: 'In fact, they act fast.' }), 'In fact, they <b>act</b> fast.');
  const due = [{ w: 'a', lv: 4 }, { w: 'b', lv: 3 }], fresh = [{ w: 'c', lv: 6 }, { w: 'd', lv: 3 }, { w: 'e', lv: 4 }];
  const d = X.deck(0, 4, due, fresh, rnd, rnd);
  assert.deepEqual(d.slice(0, 2).map(x => x.w).sort(), ['a', 'b'], '到期的字排前面');
  assert.deepEqual(d.slice(2).map(x => x.lv), [3, 4], '新字由低級數往上');
  assert.deepEqual(X.deck(3, 5, due, fresh, rnd, rnd).map(x => x.w), ['b', 'd'], '只取選定級數');
  assert.deepEqual(X.levelStats([{ w: 'a', lv: 3 }, { w: 'b', lv: 3 }, { w: 'c', lv: 4 }, { w: 'f', lv: 3 }], { a: { s: 4 }, b: { s: 1 } }, 3, 4), { total: 3, m: 1, learning: 1, fresh: 1 });
});

test('導師研究計畫：十位導師各三階段，劇情、家具與第五段心事齊全', { skip: !I.RESEARCH && '研究計畫資料尚未加入' }, () => {
  const subjects = ctx.TA.SUBJECTS.map(s => s.id);
  const SIMP = /[这们说时会过还发现进对开关见问题门间应该个学习读书实验岛鱼鸟乐东车长页风]/;   // 常見的簡體字
  const line = (t, where, max) => {
    assert.ok(typeof t === 'string' && t.length >= 6 && t.length <= (max || 70), `${where} 長度 ${t && t.length}：${t}`);
    assert.ok(!SIMP.test(t) && !/\?{3,}|undefined|\$\{/.test(t), `${where} 有簡體字或亂碼：${t}`);
  };
  const ids = new Set();
  subjects.forEach(sid => {
    const R = I.RESEARCH[sid]; assert.ok(R, sid + ' 研究計畫');
    assert.ok(typeof R.title === 'string' && R.title.length >= 2 && R.title.length <= 12, sid + ' 計畫名稱');
    assert.ok(Array.isArray(R.pitch) && R.pitch.length >= 3 && R.pitch.length <= 4, sid + ' pitch 句數'); R.pitch.forEach(t => line(t, sid + ' pitch'));
    assert.ok(Array.isArray(R.stages) && R.stages.length === 3, sid + ' 三個階段');
    R.stages.forEach((st, k) => {
      const w = `${sid} 第 ${k + 1} 階段`;
      assert.ok(typeof st.title === 'string' && st.title.length >= 2 && st.title.length <= 12, w + ' 標題');
      line(st.goal, w + ' goal', 40);
      assert.ok(Array.isArray(st.lines) && st.lines.length >= 5 && st.lines.length <= 8, w + ' 劇情句數'); st.lines.forEach(t => line(t, w));
      const f = I.FURNITURE.find(x => x.id === st.furn);
      assert.ok(f && f.src === 'research:' + sid && f.theme === sid, w + ' 家具 ' + st.furn);
      assert.ok(!ids.has(st.furn), '研究家具重複使用 ' + st.furn); ids.add(st.furn);
      line(f.desc, w + ' 家具說明', 60);
    });
    assert.ok(Array.isArray(R.done) && R.done.length >= 2 && R.done.length <= 3, sid + ' 結語句數'); R.done.forEach(t => line(t, sid + ' done'));
    const B = (I.BONDS5 || {})[sid]; assert.ok(B && typeof B.title === 'string' && B.title.length >= 2 && B.title.length <= 12, sid + ' 第五段心事');
    assert.ok(Array.isArray(B.lines) && B.lines.length >= 5 && B.lines.length <= 7, sid + ' 第五段心事句數'); B.lines.forEach(t => line(t, sid + ' 第五段心事'));
  });
  assert.equal(I.FURNITURE.filter(f => String(f.src).startsWith('research:')).length, 30, '研究家具共 30 件');
});

test('收藏目錄：每件拿得到的家具都寫得出怎麼拿到，活動來源都有名稱', async () => {
  const Q = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/catalogq.js')).href);
  const c2 = { console, Math, Date, JSON }; c2.window = c2; c2.globalThis = c2; vm.createContext(c2);
  ['src/core/registry.js', 'src/isle/data/villagers.js', 'src/isle/data/furniture.js', 'src/isle/data/hotelfurn.js', 'src/isle/data/dreamfurn.js', 'src/isle/data/researchfurn.js', 'src/isle/data/collectfurn.js']
    .filter(f => fs.existsSync(path.join(ROOT, f))).forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), c2, { filename: f }));
  const J = c2.TA.ISLE, name = sid => (J.VILLAGERS.find(v => v.sid === sid) || {}).name || '';
  const F = J.FURNITURE.filter(Q.inCatalog);
  assert.ok(F.length >= 150, '家具數量');
  F.forEach(f => { const h = Q.how(f, name); assert.ok(h && !/undefined/.test(h) && !h.startsWith('的'), `${f.id}（${f.src}）沒有取得方式`); });
  [...new Set(F.map(f => f.src).filter(s => s.startsWith('event:')))].forEach(s => assert.ok(Q.EV[s.slice(6)], '活動來源沒有名稱 ' + s));
  assert.ok(J.FURNITURE.some(f => f.src === 'hotel-fixed') ? J.FURNITURE.filter(f => !Q.inCatalog(f)).every(f => f.src === 'hotel-fixed') : true);
  assert.equal(Q.full({ a: 1, b: 2 }, ['a', 'b']), true); assert.equal(Q.full({ a: 1 }, ['a', 'b']), false); assert.equal(Q.full({}, []), false);
});

/* v8.1 圖書館、博物館的整棟室內：進出、互動點都接得上主程式，博物館每一種展品都有展示位 */
test('公共建築的整棟室內：出生點、出口、互動點與展示位', t => {
  const THREE = require(path.join(ROOT, 'vendor/three/three.cjs'));
  const cx = { console, Math, Date, JSON, THREE }; cx.window = cx; cx.globalThis = cx;
  const c2d = new Proxy(function () {}, { get: (o, k) => (k === 'canvas' ? cv : k === 'measureText' ? () => ({ width: 10 }) : () => c2d), set: () => true });
  const cv = { width: 64, height: 64, style: {}, getContext: () => c2d, toDataURL: () => '' };
  cx.document = { createElement: () => Object.assign({}, cv) }; vm.createContext(cx);
  const std = () => new THREE.MeshStandardMaterial();
  const kit = { mat: std, rbox: (w, h, d) => new THREE.BoxGeometry(w, h, d), view: std, glass: std, lamp: std, shade: std, furn: () => null };
  const main = fs.readFileSync(path.join(ROOT, 'src/isle/main.js'), 'utf8'), hooks = (main.match(/const HOUSE_HOOKS = \{([\s\S]*?)\};/) || ['', ''])[1];
  const need = { library: ['review', 'vocab', 'mistakes', 'libnotes', 'words'], museum: ['wing'], aquarium: ['aqtank'], tidecave: ['cave'] };
  for (const key of ['library', 'museum', 'aquarium', 'tidecave']) {
    if (!fs.existsSync(path.join(ROOT, `src/isle/data/interiors_${key}.js`))) { t.diagnostic(key + ' 還沒有整棟室內'); continue; }
    vm.runInContext(fs.readFileSync(path.join(ROOT, `src/isle/data/interiors_${key}.js`), 'utf8'), cx, { filename: key });
    const fac = cx.TA && cx.TA.ISLE && cx.TA.ISLE.INTERIORS && cx.TA.ISLE.INTERIORS[key];
    if (!fac) { t.diagnostic(key + ' 還沒有整棟室內（用舊的房間）'); continue; }
    const ud = fac(THREE, kit).userData;
    const [sx, , sz] = ud.spawn, [ex, ez, er] = ud.exit;
    assert.ok(Math.hypot(sx - ex, sz - ez) > er + 0.4, key + ' 出生點要在出口圈外');
    if (key !== 'aquarium' && key !== 'tidecave') assert.ok(Array.isArray(ud.host) && ud.host.length >= 3, key + ' 館員的位置');
    if (key === 'tidecave') assert.equal(ud.spots.filter(s => s.kind === 'hook:cave').map(s => s.topic).sort().join(), 'chest,fossil,pool,vein,wall', '潮洞的五個互動點');
    if (key === 'aquarium') assert.equal((ud.tanks || []).map(k => k.where).sort().join(), 'deep,reef,seagrass,shallow', '海洋館的四座水族缸');
    const kinds = ud.spots.map(s => s.kind);
    ud.spots.forEach(s => {
      assert.ok(s.label && s.label.length <= 6 && s.r > 0, key + ' 互動點 ' + s.label);
      if (s.kind.startsWith('hook:')) assert.match(hooks, new RegExp('\\b' + s.kind.slice(5) + ':'), key + ' 主程式沒有 ' + s.kind);
      else assert.ok(['look', 'study'].includes(s.kind), key + ' 互動種類 ' + s.kind);
    });
    need[key].forEach(h => assert.ok(kinds.includes('hook:' + h), key + ' 少了 hook:' + h));
    if (key === 'museum') {
      const L = { fish: I.FISH, bug: I.BUGS, fossil: I.FOSSILS, sea: I.SEALIFE, mineral: I.MINERALS };
      for (const [k, arr] of Object.entries(L)) {
        assert.ok(ud.spots.some(s => s.kind === 'hook:wing' && s.topic === k), '博物館少了 ' + k + ' 展區的互動點');
        assert.ok((ud.exhibits[k] || []).length >= (arr || []).length, `博物館 ${k} 的展示位不夠：${(ud.exhibits[k] || []).length} < ${(arr || []).length}`);
        assert.ok(ud.wingSigns && ud.wingSigns[k], '博物館 ' + k + ' 的展區名牌');
      }
      assert.ok(ud.spots.some(s => s.kind === 'study' && s.subject === 'history'), '博物館的歷史互動點');
    }
  }
});

/* v8.9 島民作息：作息表、團體活動、地點與動作名稱、台詞互相對得上，在家時段也排得出來 */
const schedule = () => import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/schedule.js')).href);
test('島民作息與團體活動：時間、地點、動作、成員與出題科目', { skip: !I.ROUTINES && '尚未產生' }, async () => {
  const Sc = await schedule(), src = fs.readFileSync(path.join(ROOT, 'src/isle/routine.js'), 'utf8');
  const acts = Object.keys(Sc.ACT_NAMES), places = Object.keys(Sc.PLACE_NAMES), inner = re => (src.match(re) || ['', ''])[1];
  assert.deepEqual([...inner(/export const ACTS = \{([\s\S]*?)\n\};/).matchAll(/(\w+): \{/g)].map(m => m[1]).sort(), [...acts].sort(), 'routine.js 的 ACTS 和 ACT_NAMES 要同一組');
  assert.deepEqual([...inner(/PLACES = \{([\s\S]*?)\n {2}\};/).matchAll(/^ {4}(\w+): \{/gm)].map(m => m[1]).sort(), [...places].sort(), 'routine.js 的 PLACES 和 PLACE_NAMES 要同一組');
  const subjects = ctx.TA.SUBJECTS.map(s => s.id), tutors = subjects.filter(s => s !== 'history');
  assert.deepEqual(Object.keys(I.ROUTINES).sort(), [...tutors].sort(), '史遙以外的九位導師都有作息');
  for (const [sid, R] of Object.entries(I.ROUTINES)) for (const k of ['weekday', 'weekend']) {
    let end = 0;
    [...R[k]].sort((a, b) => a[0] - b[0]).forEach(([from, to, place, act]) => {
      const tag = `${sid}.${k} ${from}–${to}`;
      assert.ok(from >= 5 && to <= 23 && from < to, tag + ' 時間'); assert.ok(from >= end, tag + ' 和前一段重疊'); end = to;
      assert.ok(places.includes(place), tag + ' 地點 ' + place); assert.ok(acts.includes(act), tag + ' 動作 ' + act);
    });
  }
  const ids = new Set();
  I.GATHERINGS.forEach(g => {
    assert.match(g.id, /^[a-z_]+$/); assert.ok(!ids.has(g.id), '重複 id ' + g.id); ids.add(g.id);
    assert.ok(g.name && g.icon && g.days.length && g.days.every(d => d >= 0 && d <= 6), g.id + ' 名稱、圖示、星期');
    assert.ok(g.from >= 5 && g.to <= 23 && g.from < g.to, g.id + ' 時間'); assert.ok(places.includes(g.place), g.id + ' 地點 ' + g.place);
    g.days.forEach(d => {
      const m = Sc.membersOf(g, d); assert.ok(m.length >= 2 && m.every(s => tutors.includes(s)), `${g.id} 星期${d} 的成員`);
      m.forEach(s => assert.ok(acts.includes(Sc.actOf(g, s)), `${g.id} ${s} 的動作`));
    });
    if (typeof g.act === 'object') assert.deepEqual(Object.keys(g.act).sort(), [...g.who].sort(), g.id + ' 每位成員都有動作');
    assert.ok(g.subj.length && g.subj.every(s => subjects.includes(s)), g.id + ' 出題科目');
  });
  for (let d = 0; d < 7; d++) {
    const on = I.GATHERINGS.filter(g => g.days.includes(d));
    on.forEach(a => on.forEach(b => { if (a !== b && a.place === b.place) assert.ok(a.to <= b.from || b.to <= a.from, `星期${d} ${a.id} 和 ${b.id} 同時用同一個地點`); }));
  }
});

test('作息表：一天的行程不重疊、團體活動優先，在家時段排得出來', { skip: !I.ROUTINES && '尚未產生' }, async () => {
  const Sc = await schedule(), keep = globalThis.TA; globalThis.TA = ctx.TA;   // schedule.js 從 globalThis.TA 讀資料
  try {
    for (let k = 0; k < 7; k++) {
      const date = new Date(2026, 10, 1 + k), d = date.getDay();
      for (const sid of Object.keys(I.ROUTINES)) {
        const plan = Sc.dayPlan(sid, date), busy = Sc.busyHours(sid, date), tag = `${sid} 星期${d}`;
        plan.forEach((b, i) => { if (i) assert.ok(plan[i - 1].to <= b.from, tag + ' 行程重疊 ' + Sc.clock(b.from)); assert.deepEqual(Sc.blockAt(sid, date, b.from + 0.01), b); });
        I.GATHERINGS.filter(g => g.days.includes(d) && Sc.membersOf(g, d).includes(sid)).forEach(g => assert.ok(plan.some(b => b.gid === g.id), tag + ' 少了團體活動 ' + g.id));
        assert.ok([9, 10, 11, 12, 13, 14, 15, 16, 17].some(h => !busy.has(h) && !busy.has(h + 1)), tag + ' 白天排不出兩小時在家');   // town.js 的 planFor
        assert.ok([18, 19, 20, 21].some(h => !busy.has(h)), tag + ' 晚上排不出一小時在家');
      }
    }
    assert.equal(Sc.blockAt('earth', new Date(2026, 10, 2), 3), null);
    assert.deepEqual([Sc.clock(7.5), Sc.clock(18.25), Sc.clock(9)], ['7:30', '18:15', '9:00']);
  } finally { globalThis.TA = keep; }
});

test('作息台詞：每位導師做的每件事、每場團體活動、揮手與島上的貓都有台詞', { skip: !(I.ROUTINES && I.LINES8) && '尚未產生' }, async () => {
  const Sc = await schedule(), L = I.LINES8;
  const ok = (a, n, tag) => assert.ok(Array.isArray(a) && a.length >= n && a.every(s => typeof s === 'string' && s.trim()), tag);
  for (const [sid, R] of Object.entries(I.ROUTINES)) {
    const acts = new Set(R.weekday.concat(R.weekend).map(b => b[3]));
    I.GATHERINGS.forEach(g => g.days.forEach(d => { if (Sc.membersOf(g, d).includes(sid)) acts.add(Sc.actOf(g, sid)); }));
    acts.forEach(a => { ok((L.act[sid] || {})[a], 2, `act.${sid}.${a}`); ok((L.bubble[sid] || {})[a], 2, `bubble.${sid}.${a}`); });
    ok(L.wave[sid], 2, 'wave.' + sid); ok(L.cats.tutor[sid], 2, 'cats.tutor.' + sid);
  }
  I.GATHERINGS.forEach(g => {
    const G = L.gather[g.id] || {}, all = new Set(g.days.flatMap(d => Sc.membersOf(g, d)));
    ['invite', 'ask', 'ok', 'bad', 'bye'].forEach(k => ok(G[k], 1, `gather.${g.id}.${k}`));
    assert.ok(Array.isArray(G.scene) && G.scene.length >= 2, `gather.${g.id}.scene`);
    G.scene.forEach(([sid, t]) => { assert.ok(sid === '*' || all.has(sid), `gather.${g.id} 的說話者 ${sid} 不是成員`); assert.ok(t && t.trim()); });
  });
  assert.ok(L.cats.names.orange && L.cats.names.tux, '貓的名字');
  ok(L.cats.pet, 3, 'cats.pet'); L.cats.pet.forEach(s => assert.ok(s.includes('{cat}'), '摸貓台詞要有 {cat}：' + s));
});

/* v8.9.2 網頁版安裝與離線：manifest 欄位與圖示、service worker 範本的填空（build.py 填）只出現在程式裡 */
test('網頁版安裝與離線：manifest、圖示與 service worker 範本', () => {
  const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'pwa/manifest.webmanifest'), 'utf8'));
  assert.ok(mf.name && mf.short_name && mf.short_name.length <= 12, '名稱');
  assert.equal(mf.display, 'standalone'); assert.equal(mf.start_url, './isle.html'); assert.equal(mf.scope, './');
  assert.ok(mf.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable') && mf.icons.some(i => i.sizes === '192x192'), '要有 192、512 與可遮罩的圖示');
  const png = f => { const b = fs.readFileSync(path.join(ROOT, 'pwa', f)); assert.equal(b.toString('latin1', 1, 4), 'PNG', f + ' 不是 PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  mf.icons.forEach(i => assert.deepEqual(png(i.src), i.sizes.split('x').map(Number), i.src + ' 的尺寸'));
  ['icons/apple-touch-icon.png', 'icons/favicon-32.png'].forEach(f => assert.ok(fs.existsSync(path.join(ROOT, 'pwa', f)), '少了 ' + f));
  const sw = fs.readFileSync(path.join(ROOT, 'pwa/sw.js'), 'utf8'), code = sw.replace(/\/\*[\s\S]*?\*\//g, '');
  ['__VERSION__', '__CORE__', '__EXTRA__', '__EXTRA_V__'].forEach(k => assert.ok(code.includes(k), 'sw.js 少了 ' + k));
  assert.ok(!/__(VERSION|CORE|EXTRA|EXTRA_V)__/.test(sw.match(/^\/\*[\s\S]*?\*\//)[0]), '開頭的說明不能寫填空的名字（build.py 會一起替換掉）');
  assert.match(fs.readFileSync(path.join(ROOT, 'build.py'), 'utf8'), /PWA = ROOT \/ 'pwa'/);
});

/* v8.9.1 港口的船與燈：harbor.js 找得到的零件都在、原點在水線（船與浮標）或地面（燈柱）、面數在預算內 */
test('港口模型：命名零件、原點與面數', () => {
  const THREE = require(path.join(ROOT, 'vendor/three/three.cjs'));
  const cx = { console, Math, THREE }; cx.window = cx; cx.globalThis = cx; vm.createContext(cx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/isle/data/harbormodels.js'), 'utf8'), cx, { filename: 'harbormodels.js' });
  const kit = { mat: (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, o)), win: () => new THREE.MeshStandardMaterial({ color: '#ffe9cc' }) };
  const need = { rowboat: [['oarL', 'oarR', 'seat'], 2500, true], fishing_boat: [['lantern', 'light'], 6000, true], pier_lamp: [['light'], 1200, false], buoy: [['light'], 800, true] };
  for (const [key, [parts, budget, floats]] of Object.entries(need)) {
    const g = cx.TA.ISLE.HARBORMODELS[key](THREE, kit); g.updateMatrixWorld(true);
    parts.forEach(n => assert.ok(g.getObjectByName(n), `${key} 少了 ${n}`));
    let tris = 0; g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    assert.ok(tris <= budget, `${key} 面數 ${tris} 超過 ${budget}`);
    const b = new THREE.Box3().setFromObject(g);
    if (floats) assert.ok(b.min.y < 0 && b.max.y > 0, `${key} 的原點要在水線（一部分在水面下）`); else assert.ok(Math.abs(b.min.y) < 0.02, `${key} 的原點要在地面`);
  }
});

/* v9.0 潛水的海洋生物：欄位、棲地、每個月都潛得到、台詞、圖示 */
test('海洋生物：欄位、棲地、月份時段、台詞與圖示', { skip: !I.MARINE && '尚未產生' }, () => {
  const M = I.MARINE, others = new Set([...I.FISH, ...I.BUGS, ...I.FOSSILS, ...(I.SEALIFE || []), ...(I.MINERALS || [])].map(x => x.id));
  assert.equal(M.length, 30, '30 種'); assert.equal(new Set(M.map(x => x.id)).size, 30, 'id 唯一');
  const hoursOk = h => Array.isArray(h) && h.every(r => r.length === 2 && r[0] >= 0 && r[1] <= 24 && r[0] < r[1]);
  M.forEach(x => {
    assert.match(x.id, /^[a-z0-9_]+$/); assert.ok(!others.has(x.id), x.id + ' 和其他圖鑑重複');
    assert.ok(['shallow', 'reef', 'seagrass', 'deep'].includes(x.where), x.id + ' 棲地'); assert.ok(['any', 'high', 'low'].includes(x.tide), x.id + ' 潮位');
    assert.ok(hoursOk(x.hours) && x.months.length && x.months.every(m => m >= 1 && m <= 12), x.id + ' 時段與月份');
    assert.ok(x.rarity >= 1 && x.rarity <= 5 && x.price > 0 && x.speed >= 0 && x.speed <= 3, x.id + ' 稀有度、價格、速度');
    assert.ok(['biology', 'earth'].includes(x.sid), x.id + ' 出題科目');
    assert.ok(x.desc.length >= 40 && x.desc.length <= 95 && x.fact.length >= 15 && x.fact.length <= 60, x.id + ' 說明與小知識的長度');
    const line = I.MARINE_LINES.catch[x.id]; assert.ok(line && line.length >= 10 && line.length <= 45, x.id + ' 抓到的台詞');
    if (I.ICONS) assert.match(I.ICONS[x.id] || '', /^data:image\/png;base64,/, x.id + ' 圖示');
  });
  for (let m = 1; m <= 12; m++) for (const w of ['shallow', 'reef', 'seagrass', 'deep']) assert.ok(M.filter(x => x.where === w && x.months.includes(m)).length >= 2, `${m} 月的${w}至少兩種`);
  ['green_turtle', 'hawksbill'].forEach(id => assert.ok(M.find(x => x.id === id).protected, id + ' 是保育類'));
  const photo = new Set([...(fs.readFileSync(path.join(ROOT, 'src/isle/state.js'), 'utf8').match(/MARINE_PHOTO = new Set\(\[([^\]]*)\]\)/) || ['', ''])[1].matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]));
  M.forEach(x => { if (/拍照|拍完|留在原地|留原地/.test(I.MARINE_LINES.catch[x.id])) assert.ok(x.protected || photo.has(x.id), x.id + ' 的台詞說拍完留在原地，就要只拍照（state.js 的 MARINE_PHOTO）'); });   // v9.1
  assert.ok(M.filter(x => (x.where === 'shallow' || x.where === 'reef') && !x.protected && !photo.has(x.id)).length >= 4, '潮洞的發光潮池至少有四種帶得回去的生物');
});

/* v9.0 海洋生物與海底造景的模型：每一種都有、動作需要的零件都在、面數在預算內，dive.js／aquarium.js 用到的造景都有 */
test('海洋生物與海底造景模型：零件、原點與面數', () => {
  const THREE = require(path.join(ROOT, 'vendor/three/three.cjs'));
  const cx = { console, Math, THREE }; cx.window = cx; cx.globalThis = cx; vm.createContext(cx);
  for (const f of ['marinemodels', 'reefmodels']) vm.runInContext(fs.readFileSync(path.join(ROOT, `src/isle/data/${f}.js`), 'utf8'), cx, { filename: f });
  const kit = { mat: (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, o)), win: () => new THREE.MeshStandardMaterial() }, J = cx.TA.ISLE;
  const tris = g => { let n = 0; g.traverse(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
  const NEED = { swim: ['tail'], paddle: ['finL', 'finR'], pulse: ['bell'], arms: ['arm0', 'arm1'], crawl: ['leg0', 'leg1'], clam: ['lid'], sway: [], still: [] };
  (I.MARINE || []).forEach(x => {
    assert.ok(J.MARINEMODELS[x.id], x.id + ' 沒有模型');
    const g = J.MARINEMODELS[x.id](THREE, kit), a = g.userData.anim; g.updateMatrixWorld(true);
    assert.ok(NEED[a], x.id + ' 動作 ' + a); NEED[a].forEach(n => assert.ok(g.getObjectByName(n), `${x.id} 少了 ${n}`));
    assert.ok(tris(g) <= 2700, `${x.id} 面數 ${tris(g)}`);
    if (x.speed === 0) assert.ok(Math.abs(new THREE.Box3().setFromObject(g).min.y) < 0.03, x.id + ' 固著的生物原點在底部');
  });
  const used = new Set(['dive.js', 'aquarium.js'].flatMap(f => [...fs.readFileSync(path.join(ROOT, 'src/isle', f), 'utf8').matchAll(/\['(\w+)', \d+\]/g)].map(m => m[1])));
  used.forEach(k => {
    assert.ok(J.REEFMODELS[k], '少了造景 ' + k);
    const g = J.REEFMODELS[k](THREE, kit); g.updateMatrixWorld(true);
    assert.ok(tris(g) <= 3800, `${k} 面數 ${tris(g)}`); assert.ok(Math.abs(new THREE.Box3().setFromObject(g).min.y) < 0.03, k + ' 原點在底部');
  });
});

/* v9.1 北海岸的模型：northcoast.js 用到的每一種都有、命名零件在、原點在地面或海面、面數在預算內；北側樓梯在規劃裡 */
test('北海岸：模型零件、原點與面數，北側樓梯', () => {
  const THREE = require(path.join(ROOT, 'vendor/three/three.cjs'));
  const cx = { console, Math, THREE }; cx.window = cx; cx.globalThis = cx; vm.createContext(cx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/isle/data/northmodels.js'), 'utf8'), cx, { filename: 'northmodels.js' });
  const kit = { mat: (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, o)), win: () => new THREE.MeshStandardMaterial() }, J = cx.TA.ISLE;
  const src = fs.readFileSync(path.join(ROOT, 'src/isle/northcoast.js'), 'utf8'), used = [...new Set([...src.matchAll(/'(sea_stack_a|sea_stack_b|sea_arch|cave_mouth|driftwood|tide_rocks|north_sign)'/g)].map(m => m[1]))];
  assert.equal(used.length, 7, 'northcoast.js 用到七種模型');
  const parts = { sea_stack_a: ['birds'], cave_mouth: ['void'], north_sign: ['board'] }, sea = ['sea_stack_a', 'sea_stack_b', 'sea_arch'];
  used.forEach(k => {
    assert.ok(J.NORTHMODELS[k], '少了 ' + k);
    const g = J.NORTHMODELS[k](THREE, kit); g.updateMatrixWorld(true);
    (parts[k] || []).forEach(n => assert.ok(g.getObjectByName(n), `${k} 少了 ${n}`));
    let tris = 0; g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    assert.ok(tris <= 4200, `${k} 面數 ${tris}`);
    const y = new THREE.Box3().setFromObject(g).min.y;
    if (sea.includes(k)) assert.ok(y < -0.8 && y > -1.6, `${k} 要有一截在海面下（${y.toFixed(2)}）`); else assert.ok(Math.abs(y) < 0.05, `${k} 原點在地面（${y.toFixed(2)}）`);
  });
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/island_plan.json'), 'utf8'));
  assert.ok(plan.stairs.some(s => s.name === 'Academy North Stair' && s.from === 'grass' && s.to === 'plateau'), '學院台地的北側樓梯');
  assert.match(fs.readFileSync(path.join(ROOT, 'src/isle/data/islandplan.js'), 'utf8'), /Academy North Stair/, 'islandplan.js 要重新打包');
});

/* v9.2 主線「點亮星環」：十二章的文字齊全、長度合理，章節與 story.js 的目標、獎勵一一對上，目標的數字寫在章節說明裡 */
test('主線點亮星環：十二章的文字、目標與獎勵', () => {
  const cx = { console, Math }; cx.window = cx; cx.globalThis = cx; vm.createContext(cx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/isle/data/story.js'), 'utf8'), cx, { filename: 'story.js' });
  const ST = cx.TA.ISLE.STORY, src = fs.readFileSync(path.join(ROOT, 'src/isle/story.js'), 'utf8');
  const goals = {}; for (const m of (src.match(/const GOALS = \{([\s\S]*?)\};/) || ['', ''])[1].matchAll(/(c\d+): \[((?:\['\w+', \d+\],? ?)+)\]/g)) goals[m[1]] = [...m[2].matchAll(/\['(\w+)', (\d+)\]/g)].map(x => [x[1], +x[2]]);
  const reward = (src.match(/const REWARD = \{([^}]*)\}/) || ['', ''])[1];
  const WHO = ['chinese', 'english', 'math', 'history', 'geography', 'civics', 'physics', 'chemistry', 'biology', 'earth', 'shop'], len = (s, a, b, what) => assert.ok(typeof s === 'string' && [...s].length >= a && [...s].length <= b, `${what}（${s && [...s].length} 字）`);
  assert.equal(ST.chapters.length, 12, '十二章'); assert.equal(Object.keys(goals).length, 12, 'story.js 十二章的目標');
  ST.chapters.forEach((c, i) => {
    assert.equal(c.id, 'c' + (i + 1)); assert.ok(WHO.includes(c.who), c.id + ' who');
    assert.ok(goals[c.id] && new RegExp(c.id + ': \\[\\d+, \\d+\\]').test(reward), c.id + ' 的目標與獎勵');
    goals[c.id].forEach(([, n]) => assert.ok(c.goal.includes(' ' + n + ' '), `${c.id} 的目標說明要寫出 ${n}（${c.goal}）`));
    len(c.title, 2, 8, c.id + ' 標題'); len(c.letter.title, 4, 16, c.id + ' 信的標題'); len(c.letter.text, 60, 170, c.id + ' 信'); assert.match(c.letter.close, /^—— /, c.id + ' 信的署名');
    assert.ok(c.intro.length >= 4 && c.intro.length <= 6 && c.wait.length === 2 && c.done.length >= 3 && c.done.length <= 5, c.id + ' 台詞句數');
    [...c.intro, ...c.done].forEach(l => len(l, 12, 70, c.id + ' 台詞')); c.wait.forEach(l => len(l, 10, 52, c.id + ' 等待的台詞'));
    len(c.memo.title, 4, 14, c.id + ' 回憶錄標題'); len(c.memo.sub, 14, 52, c.id + ' 回憶錄');
    assert.doesNotMatch(JSON.stringify(c), /(\b\d{2,3}|[七八九]十[一二三四五六七八九]?) ?(扇|座)/, c.id + ' 不寫死窗與燈塔的總數（單元會增加）');
  });
  assert.ok(ST.finale.length >= 6 && ST.finale.length <= 10 && ST.finale.every(([w, l]) => WHO.includes(w) && l.length >= 12) && ST.finale[ST.finale.length - 1][0] === 'earth', '點燈儀式');
  len(ST.after.text, 60, 210, '考完試的信');
});

/* v9.2.1 公共建設：五個模型的零件、標記點、原點與面數；works.js 的每一樣建設都有擺放位置、費用合理 */
test('公共建設：模型的零件與標記點，建設的位置與費用', () => {
  const THREE = require(path.join(ROOT, 'vendor/three/three.cjs'));
  const cx = { console, Math, THREE }; cx.window = cx; cx.globalThis = cx; vm.createContext(cx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/isle/data/worksmodels.js'), 'utf8'), cx, { filename: 'worksmodels.js' });
  const kit = { mat: (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, o)), win: () => new THREE.MeshStandardMaterial() }, J = cx.TA.ISLE;
  const need = { works_board: ['poster_0', 'poster_1', 'poster_2', 'poster_3'], works_site: ['sign'], viewpoint: ['scope', 'look', 'seat_0', 'seat_1'], hot_spring: ['water', 'sign', 'soak_0', 'soak_1', 'soak_2', 'steam'], cafe: ['menu', 'counter', 'seat_0', 'seat_1', 'seat_2', 'seat_3'] };
  const src = fs.readFileSync(path.join(ROOT, 'src/isle/works.js'), 'utf8');
  Object.entries(need).forEach(([k, parts]) => {
    assert.ok(J.WORKSMODELS[k], '少了 ' + k); assert.ok(src.includes(`'${k}'`), `works.js 要用到 ${k}`);
    const g = J.WORKSMODELS[k](THREE, kit); g.updateMatrixWorld(true);
    parts.forEach(n => assert.ok(g.getObjectByName(n), `${k} 少了 ${n}`));
    ['poster_0', 'sign', 'menu'].filter(n => parts.includes(n)).forEach(n => assert.ok(g.getObjectByName(n).isMesh, `${k} 的 ${n} 要是網格（程式在它正面貼字）`));
    let tris = 0; g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    assert.ok(tris <= 4200, `${k} 面數 ${tris}`);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(g).min.y) < 0.05, `${k} 原點在地面`);
  });
  const ids = [...src.matchAll(/\{ id: '(\w+)', name: '[^']+', where: '[^']+', bells: (\d+), miles: (\d+)/g)];
  assert.deepEqual(ids.map(m => m[1]).sort(), ['bridge', 'cafe', 'spa', 'view'], '四樣建設');
  ids.forEach(m => { assert.ok(+m[2] >= 5000 && +m[2] <= 40000 && +m[3] >= 300 && +m[3] <= 3000, m[1] + ' 的費用'); assert.match(src, new RegExp(`${m[1]}: \\[-?[\\d.]+, -?[\\d.]+, `), m[1] + ' 的位置'); });
  assert.match(fs.readFileSync(path.join(ROOT, 'src/isle/terrain.js'), 'utf8'), /WORK_BRIDGES = \{ bridge: /, 'terrain.js 登記了石橋');
});

/* v9.4.0 港邊夜市：每一攤真的開獎時，長期平均要等於題目算的期望值；轉盤照模型的 2／3／3 格 */
test('港邊夜市：開獎的平均等於期望值', async () => {
  const V = await import(require('url').pathToFileURL(path.join(ROOT, 'src/isle/ev.js')).href);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  Object.keys(V.BOOTHS).forEach(k => {
    for (let n = 0; n < 12; n++) {
      const q = k === 'spin' ? V.BOOTHS.spin(rnd, { parts: V.WHEEL }) : V.BOOTHS[k](rnd);
      assert.ok(Number.isInteger(q.cost) && q.cost > 0 && typeof q.play === 'function' && Number.isFinite(q.exp), k + ' 的玩法');
      if (k === 'spin') assert.deepEqual(q.parts, V.WHEEL, '轉盤照模型的格數');
      if (k !== 'balls') assert.equal(q.exp, q.ev, k + ' 的期望值');
      let sum = 0, sq = 0; const N = 6000;
      for (let i = 0; i < N; i++) { const r = q.play(rnd); assert.ok(r.won >= 0 && typeof r.show === 'string' && r.show && r.hit === r.won > 0, k + ' 開獎結果'); const v = r.won - q.cost; sum += v; sq += v * v; }
      const mean = sum / N, sd = Math.sqrt(Math.max(sq / N - mean * mean, 1)), tol = 4.5 * sd / Math.sqrt(N) + 0.5;
      assert.ok(Math.abs(mean - q.exp) < tol, `${k}：模擬平均 ${mean.toFixed(1)}，期望值 ${q.exp.toFixed(1)}（容許 ${tol.toFixed(1)}）`);
    }
  });
  assert.equal(V.choose(4, 2), 6); assert.equal(V.choose(4, 0), 1);
});

/* v9.4.0 港邊夜市：八攤的攤主與台詞、六樣小吃、三件集章獎品、八個模型的零件與標記點、攤位不重疊 */
test('港邊夜市：攤主、小吃、獎品與模型', () => {
  const THREE = require(path.join(ROOT, 'vendor/three/three.cjs'));
  const cx = { console, Math, THREE }; cx.window = cx; cx.globalThis = cx; vm.createContext(cx);
  ['src/isle/data/furniture.js', 'src/isle/data/nightmodels.js', 'src/isle/data/nightmarket.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), cx, { filename: f }));
  const J = cx.TA.ISLE, N = J.NIGHTMARKET, src = fs.readFileSync(path.join(ROOT, 'src/isle/nightmarket.js'), 'utf8');
  const games = ['dice', 'ticket', 'spin', 'balls', 'ring', 'pachinko'], foods = ['eggcake', 'boba'];
  assert.deepEqual(Object.keys(N.keepers).sort(), games.concat(foods).sort(), '八攤的攤主');
  const lines = (a, n, tag) => { assert.ok(Array.isArray(a) && a.length >= n && a.every(t => typeof t === 'string' && t.length > 2 && t.length <= 60 && !/\d/.test(t)), tag); };
  Object.entries(N.keepers).forEach(([id, k]) => {
    assert.ok(k.name && k.stall && k.sign && k.sign.length <= 6, id + ' 名字與招牌');
    ['color', 'awning'].concat(Object.keys(k.look).map(x => 'look.' + x)).forEach(f => assert.match(f.startsWith('look.') ? k.look[f.slice(5)] : k[f], /^#[0-9a-f]{6}$/i, id + ' ' + f));
    ['greet', 'bye'].concat(games.includes(id) ? ['smart', 'miss', 'win', 'lose'] : ['buy']).forEach(f => lines(k[f], 2, `${id}.${f}`));
  });
  assert.equal(new Set(Object.values(N.keepers).map(k => k.awning.toLowerCase())).size, 8, '雨棚顏色不重複');
  assert.equal(N.snacks.length, 6); assert.equal(new Set(N.snacks.map(s => s.id)).size, 6, '小吃 id 不重複');
  N.snacks.forEach(s => { assert.ok(foods.includes(s.stall) && Number.isInteger(s.price) && s.price >= 50 && s.price <= 200 && s.price % 10 === 0, s.id + ' 攤位與價格'); assert.ok(s.desc && s.fact && s.fact.length <= 90 && ['chemistry', 'biology', 'physics', 'earth'].includes(s.subject), s.id + ' 小知識'); });
  foods.forEach(f => assert.equal(N.snacks.filter(s => s.stall === f).length, 3, f + ' 三樣小吃'));
  assert.equal(N.prizes.length, 3, '三件集章獎品');
  N.prizes.forEach(f => assert.ok(J.FURNITURE.some(x => x.id === f.id && x.src === 'event:night_market'), f.id + ' 放進家具清單'));
  assert.match(fs.readFileSync(path.join(ROOT, 'src/isle/catalogq.js'), 'utf8'), /night_market: '/, '家具目錄寫得出怎麼拿到');
  // 模型：具名零件與標記點、面數、原點在地面
  const kit = { mat: (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, o)), win: () => new THREE.MeshStandardMaterial() };
  const need = { nm_stall: ['awning_a', 'awning_b', 'sign', 'bulbs', 'prop', 'keeper', 'front', 'hook_l', 'hook_r'], nm_gate: ['sign'], nm_table: ['seat_0', 'seat_1', 'seat_2', 'seat_3'], nm_wheel: ['wheel', 'pointer'],
    nm_dice: [], nm_tickets: [], nm_balls: [], nm_rings: [], nm_pachinko: [], nm_eggcake: [], nm_boba: [] };
  Object.entries(need).forEach(([k, parts]) => {
    assert.ok(J.NIGHTMODELS[k], '少了 ' + k); if (k !== 'nm_stall' && k !== 'nm_gate' && k !== 'nm_table') assert.ok(src.includes(`'${k}'`), `nightmarket.js 要用到 ${k}`);
    const g = J.NIGHTMODELS[k](THREE, kit); g.updateMatrixWorld(true);
    parts.forEach(n => assert.ok(g.getObjectByName(n), `${k} 少了 ${n}`));
    ['sign', 'awning_a'].filter(n => parts.includes(n)).forEach(n => assert.ok(g.getObjectByName(n).isMesh, `${k} 的 ${n} 要是網格`));
    let tris = 0; g.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    assert.ok(tris <= 4600, `${k} 面數 ${tris}`);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(g).min.y) < 0.06, `${k} 原點在地面`);
  });
  // 攤位：八攤都擺得出來、彼此不重疊、街道留得出走道
  const S = [...src.match(/export const STALLS = \[([\s\S]*?)\];/)[1].matchAll(/\['(\w+)', (-?[\d.]+), (-?[\d.]+), (Math\.PI|0)\]/g)].map(m => ({ id: m[1], x: +m[2], z: +m[3], ry: m[4] }));
  assert.deepEqual(S.map(s => s.id).sort(), games.concat(foods).sort(), '八攤都有位置');
  S.forEach((a, i) => S.slice(i + 1).forEach(b => assert.ok(Math.abs(a.x - b.x) >= 2.25 || Math.abs(a.z - b.z) >= 1.6, `${a.id} 和 ${b.id} 重疊`)));
  const north = S.filter(s => s.ry === 'Math.PI'), south = S.filter(s => s.ry === '0');
  assert.ok(Math.min(...south.map(s => s.z)) - Math.max(...north.map(s => s.z)) - 1.5 >= 2.4, '中間的街至少 2.4 公尺寬');
});
