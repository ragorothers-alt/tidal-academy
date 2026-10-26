/* 潮汐小島 · DIY 手作：搖樹得到樹枝與橘子、用鏟子敲石頭得到石頭與鐵塊、在沙灘撿貝殼；
   海邊每天漂來一個漂流瓶，答對英文題讀懂瓶中信就學會一張配方；回家門口的工作台把材料做成家具。
   材料存在 S().mats；配方存在 S().recipes（家具 id 陣列）。 */
import * as THREE from 'three';
import { scene, M, mesh, cullable } from './engine.js';
import { C, tileAt, groundAt } from './terrain.js';
import { trees, rocks, blocked, colliders, label, altBuilding, onRoad, mergeStatic } from './props.js';
import * as ui from './ui.js';
import { register } from './props3d.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { I, S, save, icon } from './state.js';
import { pickQ, record, dayKey } from './quiz.js';
import * as miles from './miles.js';
import * as ores from './rocks.js';
import * as fx from './fx.js';
import { kick } from './shake.js';
import { afterTyphoon } from './weather.js';

export const MATS = { branch: '樹枝', stone: '石頭', shell: '貝殼', fruit: '橘子', iron: '鐵塊', frag: '星之碎片' };
const STARTER = 3;
const recipesAll = () => (I.FURNITURE || []).filter(f => f.src === 'diy');
const mats = () => { const s = S(); s.mats = s.mats || {}; return s.mats; };
export const have = m => (m === 'frag' ? ((S().stars || {}).frag || 0) : (mats()[m] || 0));
function take(m, n) { if (m === 'frag') S().stars.frag -= n; else mats()[m] -= n; }
export function known() { const s = S(); s.recipes = s.recipes || []; recipesAll().slice(0, STARTER).forEach(f => { if (!s.recipes.includes(f.id)) s.recipes.push(f.id); }); return s.recipes; }
const day = () => { const s = S(), d = dayKey(); if (!s.diyDay || s.diyDay.d !== d) s.diyDay = { d, trees: {}, rocks: {}, shells: null, bottle: null }; return s.diyDay; };
function gain(m, n, obj) { mats()[m] = (mats()[m] || 0) + (n || 1); save(); ui.floatText(obj || P, `+${n || 1} ${MATS[m]}`, '#8a5a3b'); if (m !== 'frag') ui.flyToPocket(icon(m, m), obj || P); }   // 材料圖示飛進背包

/* ---------- 場景物件：貝殼、漂流瓶、工作台 ---------- */
let P = null, hooks = {}, bench = null;
const shells = [], group = new THREE.Group(); scene.add(group);
let bottle = null;
function seeded(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
/** 每天在沙灘撒貝殼、放一個漂流瓶 */
export function layout() {
  while (group.children.length) group.remove(group.children[0]); shells.length = 0; bottle = null;
  const D = day(), r = seeded([...D.d].reduce((a, c) => a * 31 + c.charCodeAt(0), 3) >>> 0 || 1);
  if (!D.shells) {
    D.shells = []; let bt = null;
    const NS = afterTyphoon() ? 14 : 6;
    for (let k = 0; k < 1200 && (D.shells.length < NS || !bt); k++) {
      const x = (r() - 0.5) * 88, z = (r() - 0.5) * 88; if (tileAt(x, z) !== 0 || blocked(x, z, 0.6)) continue;   // v6.79 的新島比較大
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => tileAt(x + dx * 1.2, z + dz * 1.2) === -1);
      if (!bt && edge) { bt = { x: +x.toFixed(2), z: +z.toFixed(2) }; continue; }
      if (D.shells.length < NS && D.shells.every(o => Math.hypot(o.x - x, o.z - z) > 3)) D.shells.push({ x: +x.toFixed(2), z: +z.toFixed(2), got: false, wood: NS > 6 && D.shells.length % 2 === 1 });
    }
    D.bottle = bt ? Object.assign(bt, { got: false }) : null; save();
  }
  const shellCol = ['#ffd6c8', '#fff3e0', '#ffc8a8', '#f5e0ff'];
  D.shells.forEach((o, i) => { if (o.got) return; const g = new THREE.Group(); g.position.set(o.x, groundAt(o.x, o.z) + 0.03, o.z);
    if (o.wood) { const w = mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.9, 7), M('#a57a4f'), 0, 0.06, 0); w.rotation.z = Math.PI / 2; g.add(w); g.rotation.y = i * 1.3; group.add(g); shells.push({ o, g }); return; }
    const sh = mesh(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(shellCol[i % 4]), 0, 0, 0); sh.scale.set(1, 0.5, 0.85); g.add(sh);
    for (let k = -1; k <= 1; k++) { const rib = mesh(new THREE.BoxGeometry(0.012, 0.05, 0.2), M('#e8b8a0'), k * 0.05, 0.03, 0); rib.rotation.y = k * 0.35; g.add(rib); }
    g.rotation.y = i * 1.3; group.add(g); shells.push({ o, g }); });
  if (D.bottle && !D.bottle.got && recipesAll().some(f => !known().includes(f.id))) {
    const b = D.bottle, g = new THREE.Group(); g.position.set(b.x, groundAt(b.x, b.z) + 0.08, b.z);
    const glass = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 10), M('#bfe8e0', { transparent: true, opacity: 0.6, roughness: 0.2 }), 0, 0, 0); glass.rotation.z = Math.PI / 2; g.add(glass);
    const neck = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.12, 8), M('#bfe8e0', { transparent: true, opacity: 0.6 }), 0.21, 0, 0); neck.rotation.z = Math.PI / 2; g.add(neck);
    const paper = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), M('#f6e7c8'), 0, 0, 0); paper.rotation.z = Math.PI / 2; g.add(paper);
    g.rotation.y = 0.7; group.add(g); bottle = { o: b, g };
  }
  group.traverse(o => { o.frustumCulled = cullable(o); });
}
function buildBench(home) {
  const cand = [];
  for (let dz = -1; dz <= 4; dz += 0.5) for (let dx = -4; dx <= 4; dx += 0.5) if (Math.abs(dx) >= 2) cand.push([dx, dz]);
  cand.sort((a, b) => Math.hypot(a[0] + 0.5, a[1] - 1.5) - Math.hypot(b[0] + 0.5, b[1] - 1.5));
  for (const [dx, dz] of cand) {
    const x = home.x + dx, z = home.z + dz;
    if (blocked(x, z, 1.05) || blocked(x, z + 0.9, 0.4) || onRoad(x, z) || onRoad(x, z + 0.9) || ![1, 2].includes(tileAt(x, z)) || ![1, 2].includes(tileAt(x, z + 1)) || Math.hypot(x - home.door[0], z - home.door[1]) < 1.8) continue;
    const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
    g.add(mesh(new THREE.BoxGeometry(1.2, 0.1, 0.62), M('#c99a62'), 0, 0.72, 0));
    [[-0.52, -0.24], [0.52, -0.24], [-0.52, 0.24], [0.52, 0.24]].forEach(([a, b]) => g.add(mesh(new THREE.BoxGeometry(0.09, 0.7, 0.09), M('#8a5a3b'), a, 0.35, b)));
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.06, 0.5), M('#a87a48'), 0, 0.22, 0));
    const hammer = new THREE.Group(); hammer.position.set(0.25, 0.8, 0.05); hammer.rotation.y = 0.6; g.add(hammer);
    hammer.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6), M('#8a5a3b'), 0, 0, 0)); hammer.children[0].rotation.z = Math.PI / 2;
    hammer.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 0.14), M('#7a8088', { metalness: 0.4 }), 0.16, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.06, 0.12), M('#d8b88a'), -0.3, 0.8, -0.1), mesh(new THREE.BoxGeometry(0.26, 0.06, 0.1), M('#c8a070'), -0.28, 0.86, -0.08));
    const sg = label('DIY 工作台', '#c99a62', 1.0, 0.26); sg.position.set(0, 1.1, 0.32); g.add(sg);
    const alt = altBuilding('diy', g, [sg]);   // Codex 重建的工作台（遮雨篷、工具架）
    mergeStatic(g); g.traverse(o => { o.frustumCulled = cullable(o); }); scene.add(g); register(g); colliders.push(alt ? { x0: x - 1.0, z0: z - 0.6, x1: x + 1.0, z1: z + 0.6 } : { x0: x - 0.62, z0: z - 0.34, x1: x + 0.62, z1: z + 0.34 });
    return { x, z, door: [x, z + (alt ? 1.2 : 0.95)] };
  }
  return null;
}
export function init(player, home, h) { P = player; hooks = h || {}; if (home) bench = buildBench(home); known(); layout(); }
export const benchSite = () => bench;

/* ---------- 互動 ---------- */
const fwdPt = d => [P.position.x + Math.sin(P.rotation.y) * d, P.position.z + Math.cos(P.rotation.y) * d];
function facing() {
  const [fx, fz] = fwdPt(0.8), near = (x, z, r) => Math.hypot(x - fx, z - fz) < r || Math.hypot(x - P.position.x, z - P.position.z) < r * 0.8;
  const sh = shells.find(s => near(s.o.x, s.o.z, 0.8)); if (sh) return { kind: 'shell', sh };
  if (bottle && near(bottle.o.x, bottle.o.z, 0.9)) return { kind: 'bottle' };
  const [tx, tz] = fwdPt(1.0), tr = trees.find(t => Math.hypot(t.x - tx, t.z - tz) < 0.55 + 0.3 * t.s); if (tr) return { kind: 'tree', tr };
  const rk = rocks.find(t => Math.hypot(t.x - tx, t.z - tz) < 0.5 + 0.45 * t.s); if (rk) return { kind: 'rock', rk };
  return null;
}
export function hint(tool) {
  if (!P) return ''; const f = facing(); if (!f) return '';
  if (f.kind === 'shell') return f.sh.o.wood ? '撿漂流木' : '撿貝殼'; if (f.kind === 'bottle') return '打開漂流瓶';
  if (f.kind === 'tree' && !tool) return '搖樹'; if (f.kind === 'rock' && tool === 'shovel') return '敲石頭';
  return '';
}
export function handler(tool) {
  if (!P) return null; const f = facing(); if (!f) return null;
  if (f.kind === 'shell') return () => pickShell(f.sh);
  if (f.kind === 'bottle') return openBottle;
  if (f.kind === 'tree' && !tool) return () => shake(f.tr);
  if (f.kind === 'rock' && tool === 'shovel') return () => hit(f.rk);
  return null;
}
async function pickShell(sh) { sh.o.got = true; group.remove(sh.g); shells.splice(shells.indexOf(sh), 1); Audio.sfx('pop'); if (sh.o.wood) { gain('branch', 2, sh.g); return; } miles.add('shell'); gain('shell', 1, sh.g); }
const wobble = (g, amp) => { let t = 0; const base = g.rotation.z; const step = () => { t += 0.05; g.rotation.z = base + Math.sin(t * 22) * amp * (1 - t / 0.6); if (t < 0.6) requestAnimationFrame(step); else g.rotation.z = base; }; step(); };
async function shake(tr) {
  const D = day(), k = trees.indexOf(tr); Audio.sfx('swish'); wobble(tr.g, 0.05);
  if (D.trees[k]) { ui.toast('樹葉沙沙作響……今天這棵樹已經搖過了'); return; }
  D.trees[k] = true; save();
  const r = Math.random();
  if (!['palm', 'cedar', 'pink'].includes(tr.kind)) { if (r < 0.45) gain('fruit', 1, tr.g); else if (r < 0.9) gain('branch', 1, tr.g); else ui.toast('什麼都沒掉下來'); }
  else if (r < 0.75) gain('branch', 1, tr.g); else ui.toast('什麼都沒掉下來');
}
async function hit(rk) {
  const D = day(), k = rocks.indexOf(rk), n = D.rocks[k] || 0; P.userData.swing = 1; Audio.sfx('dig'); wobble(rk.m, 0.08);
  { const p = rk.m.position, d = Math.hypot(P.position.x - p.x, P.position.z - p.z) || 1; fx.clods(p.x + (P.position.x - p.x) / d * 0.45, p.y + 0.25, p.z + (P.position.z - p.z) / d * 0.45, { color: '#a59a8c', n: n >= 3 ? 3 : 7, speed: 1.8, up: 0.7 }); kick(n >= 3 ? 0.012 : 0.022); }   // 敲到的那一面噴出碎石
  if (n >= 3) { ui.toast('這顆石頭今天敲不出東西了，明天再來'); return; }
  D.rocks[k] = n + 1; save();
  if (ores.tryOre()) return;
  gain(Math.random() < 0.22 ? 'iron' : 'stone', 1, rk.m);
}
const BOT = { name: '漂流瓶', color: '#5ab0c8', voice: 520 };
async function openBottle() {
  const D = day(), left = recipesAll().filter(f => !known().includes(f.id));
  if (!left.length) { ui.toast('瓶子是空的'); return; }
  await ui.say(BOT, '瓶子裡有一封被海水泡過的英文信，有幾個字暈開了……');
  const q = pickQ('english', 2) || pickQ('english', 3); if (!q) return;
  const i = await ui.ask(BOT, `先把暈開的地方讀懂：${q.q}`, q.o, { answer: q.a, abc: true, keys: true, html: true });
  const ok = i === q.a; record(q, ok);
  if (!ok) { Audio.sfx('bad'); await ui.explain(BOT, q); await ui.say(BOT, '信還讀不太懂……再試一次吧（瓶子還在這裡）。'); return; }
  const f = left[0]; known().push(f.id); D.bottle.got = true; save();
  group.remove(bottle.g); bottle = null;
  const need = Object.entries(f.recipe).map(([m, n]) => `${MATS[m]} ×${n}`).join('、');
  await ui.card({ icon: icon('recipe', 'recipe'), title: `學會了配方：${f.name}`, sub: `材料：${need}<br>回家門口的 DIY 工作台就能製作。` });
  await challenge.keepGoing(BOT, q);
}

/* ---------- 工作台（動森式配方卡：分類標籤、軟木板卡片、右側詳細說明） ---------- */
const CATS = [['all', '全部'], ['can', '可製作'], ['seat', '椅子'], ['table', '桌子'], ['storage', '收納'], ['light', '燈具'], ['deco', '裝飾'], ['study', '學習'], ['rug', '地墊']];
let tab = 'all', sel = null, qty = 1;
export function openBench(atBench) {
  const body = ui.el('div', 'dy');
  const canMake = f => Object.entries(f.recipe).every(([m, n]) => have(m) >= n);
  const maxMake = f => Math.min(10, ...Object.entries(f.recipe).map(([m, n]) => Math.floor(have(m) / n)));
  const paint = () => {
    const K = known(), all = recipesAll(), s = S(), made = s.crafted || {};
    const mine = K.map(id => all.find(f => f.id === id)).filter(Boolean);
    const list = mine.filter(f => tab === 'all' || (tab === 'can' ? canMake(f) : f.cat === tab));
    if (!sel || !mine.includes(sel)) sel = list[0] || mine[0] || null;
    body.innerHTML = '';
    // 分類標籤
    const tabs = ui.el('div', 'dy-tabs');
    CATS.forEach(([id, name]) => {
      const n = id === 'all' ? mine.length : id === 'can' ? mine.filter(canMake).length : mine.filter(f => f.cat === id).length;
      if (id !== 'all' && id !== 'can' && !n) return;
      const b = ui.el('button', 'dy-tab' + (tab === id ? ' on' : ''), `${name}<i>${n}</i>`); b.type = 'button'; b.onclick = () => { tab = id; sel = null; paint(); }; tabs.appendChild(b);
    });
    body.appendChild(tabs);
    const main = ui.el('div', 'dy-main'), grid = ui.el('div', 'dy-grid');
    list.forEach(f => {
      const ok = canMake(f);
      const c = ui.el('button', 'dy-card' + (ok ? ' ok' : '') + (sel === f ? ' on' : ''), `<span class="dy-pic"><img src="${hooks.thumb ? hooks.thumb(f.id) : ''}" alt=""></span>${ok ? '<em>可製作！</em>' : ''}${made[f.id] ? '<u>✓</u>' : ''}`);
      c.type = 'button'; c.dataset.tip = f.name;
      c.onclick = () => { if (sel === f && atBench) craft(f, qty); else { sel = f; qty = 1; paint(); } };
      grid.appendChild(c);
    });
    // 還沒學會的配方：問號卡
    if (tab === 'all' && all.length > mine.length) grid.appendChild(ui.el('div', 'dy-card lock', `<span class="dy-pic">？<small>還有 ${all.length - mine.length} 張</small></span>`));
    if (!list.length) grid.appendChild(ui.el('p', 'dy-empty', tab === 'can' ? '材料還不夠做任何東西……去搖樹、敲石頭、撿貝殼吧！' : '這一類還沒有配方。'));
    main.appendChild(grid);
    // 右側：選中的配方
    const side = ui.el('div', 'dy-side');
    if (sel) {
      const ok = canMake(sel);
      side.innerHTML = `<div class="dy-big"><img src="${hooks.thumb ? hooks.thumb(sel.id) : ''}" alt=""></div><b class="dy-name">${ui.esc(sel.name)}</b>
        <p class="dy-desc">${ui.esc(sel.desc || '')}</p>
        <ul class="dy-need">${Object.entries(sel.recipe).map(([m, n]) => `<li class="${have(m) >= n ? '' : 'lack'}"><img src="${icon(m === 'frag' ? 'star' : m, 'mat')}" alt=""><span>${MATS[m]}</span><b>${have(m)}<small>/${n}</small></b></li>`).join('')}</ul>
        ${made[sel.id] ? `<small class="dy-made">已經做過 ${made[sel.id]} 個</small>` : ''}`;
      // 數量：一次最多做 10 個（材料夠的話）
      const mx = maxMake(sel); qty = Math.max(1, Math.min(qty, mx || 1));
      if (atBench && mx > 1) {
        const st = ui.el('div', 'dy-qty', `<span>數量</span>`), minus = ui.el('button', 'dy-q', '－'), num = ui.el('b', '', String(qty)), plus = ui.el('button', 'dy-q', '＋'), all = ui.el('button', 'dy-q all', `最多 ${mx}`);
        [minus, plus, all].forEach(b => { b.type = 'button'; });
        minus.onclick = () => { qty = Math.max(1, qty - 1); paint(); }; plus.onclick = () => { qty = Math.min(mx, qty + 1); paint(); }; all.onclick = () => { qty = mx; paint(); };
        st.append(minus, num, plus, all); side.appendChild(st);
      }
      const go = ui.el('button', 'btn' + (ok && atBench ? ' gold' : ' off'), atBench ? (ok ? (qty > 1 ? `🔨 製作 ${qty} 個` : '🔨 製作') : '材料不夠') : '到工作台製作'); go.type = 'button';
      go.onclick = () => craft(sel, qty); side.appendChild(go);
    }
    main.appendChild(side); body.appendChild(main);
    const left = all.length - K.length;
    body.appendChild(ui.el('div', 'dy-foot', `<div class="diy-mats">${Object.keys(MATS).map(m => `<span><img src="${icon(m === 'frag' ? 'star' : m, 'mat')}" alt="">${MATS[m]} ${have(m)}</span>`).join('')}</div>
      <p class="muted">已學會 ${K.length} / ${all.length} 張配方${left ? '。每天海邊會漂來一個漂流瓶，讀懂瓶中信就能學會新配方' : '，全部學會了！'}。材料：沒拿工具時搖樹（樹枝、橘子）、用鏟子敲石頭（石頭、鐵塊）、在沙灘撿貝殼；星之碎片在晴朗的夜晚觀星許願取得。</p>`));
  };
  let busy = false;
  const craft = (f, n0) => {
    if (busy) return;
    if (!atBench) { ui.toast('到家門口的 DIY 工作台才能製作'); return; }
    if (!canMake(f)) { ui.toast('材料不夠'); Audio.sfx('deny'); return; }
    busy = true; const k = Math.max(1, Math.min(n0 || 1, maxMake(f)));
    Object.entries(f.recipe).forEach(([m, n]) => take(m, n * k)); const s = S(); s.stats = s.stats || {}; s.stats.diy = (s.stats.diy || 0) + k; for (let i = 0; i < k; i++) miles.add('craft');
    s.crafted = s.crafted || {}; s.crafted[f.id] = (s.crafted[f.id] || 0) + k;
    hooks.addStorage && hooks.addStorage(f.id, k); save(); qty = 1;
    // 製作動畫：右側敲敲打打三下、冒出煙塵
    const side = body.querySelector('.dy-side'); side && side.classList.add('crafting');
    [0, 260, 520].forEach(t => setTimeout(() => Audio.sfx('place'), t));
    setTimeout(() => { busy = false; Audio.sfx('catch'); ui.toast(k > 1 ? `做好了 ${k} 個「${f.name}」！回家按 F 擺出來` : `做好了「${f.name}」！回家按 F 擺出來`); paint(); }, 900);
  };
  paint(); ui.panel(atBench ? 'DIY 工作台' : 'DIY 配方', body, { cls: 'diy-p' });
}
