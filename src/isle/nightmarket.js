/* 潮汐小島 · 港邊夜市（v9.4.0）：每週六晚上 18:00–23:00（颱風天停辦），城門東邊靠海的草地擺出八個攤位。
   六個遊戲攤（骰子、抽籤、轉盤、撈球、套圈圈、彈珠台）先請你算期望值或機率，再決定要不要付鈴錢玩——真的玩時照同一組機率開獎（ev.js）；
   兩個小吃攤（雞蛋糕、珍珠奶茶）賣點心，附一則科學小知識。每一攤算對或買一樣小吃蓋一個章，一晚集滿八個有獎（第 1、3、5 次再送夜市家具）。
   集章卡記著這一晚在遊戲攤付了多少、贏回多少，和期望值放在一起看：玩越多次，平均越接近期望值。
   攤位只在開市時擺出來（收攤時整個拆掉，夜裡的燈也一起收）；文字在 data/nightmarket.js，模型在 data/nightmodels.js（Codex 製作）。
   紀錄：S().nm = { night, stamps, greeted, free, paid, won, exp, plays, cards, letter, warned } */
import * as THREE from 'three';
import { scene, M, nightMats } from './engine.js';
import { groundAt } from './terrain.js';
import { colliders, seats, modelClone } from './props.js';
import { register, unregister } from './props3d.js';
import { chibi, nameMesh, animate, lookAt } from './chars.js';
import { label, words } from './works.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, practiced } from './state.js';
import { BOOTHS, WHEEL } from './ev.js';
import * as miles from './miles.js';
import * as social from './social.js';
import * as memo from './memo.js';
import * as weather from './weather.js';

const TA = window.TA, L = TA.L;
export const OPEN = 18, CLOSE = 23;
export const GAMES = ['dice', 'ticket', 'spin', 'balls', 'ring', 'pachinko'], FOODS = ['eggcake', 'boba'], ALL = GAMES.concat(FOODS);
/* 攤位 [id, x, z, ry]（世界座標）：北排面向南（ry = π）、南排面向北（ry = 0），中間是東西向的街 */
export const STALLS = [['dice', 3.0, 30.85, Math.PI], ['ticket', 5.6, 30.85, Math.PI], ['spin', 10.4, 30.85, Math.PI], ['balls', 13.0, 30.85, Math.PI],
  ['ring', 3.0, 35.15, 0], ['boba', 5.4, 35.15, 0], ['pachinko', 9.6, 35.15, 0], ['eggcake', 12.2, 35.15, 0]];
const PROP = { dice: 'nm_dice', ticket: 'nm_tickets', spin: 'nm_wheel', balls: 'nm_balls', ring: 'nm_rings', pachinko: 'nm_pachinko', eggcake: 'nm_eggcake', boba: 'nm_boba' };
const GATE = [1.0, 33.0, Math.PI / 2], TABLES = [[7.6, 33.9]];
const BUSK = [[14.8, 32.3], [15.1, 33.1], [14.8, 33.9]];   // 夜市東頭的街頭演奏（數學、英文、化學導師）
const SECTOR = [0, 1, 2, 1, 0, 2, 1, 2];   // 轉盤 8 格從正上方順時針：0 大獎、1 小獎、2 銘謝惠顧（和 nm_wheel 的配色一致）
let ctx = null, B = null, checkT = 0, spin = null, bulbGeo = null, bulbMat = null;

const D = () => I.NIGHTMARKET || {};
const DEF = { name: '攤主', stall: '攤位', sign: '夜市', color: '#c48a5a', awning: '#f3bdd2', look: {}, greet: ['歡迎光臨！'], bye: ['慢走喔！'], smart: ['算得真準！'], miss: ['再想一想也沒關係。'], win: ['中了！'], lose: ['差一點點！'], buy: ['來，拿好喔！'] };
const K = id => Object.assign({}, DEF, (D().keepers || {})[id]);
const sp = id => ({ name: K(id).name, color: K(id).color, voice: 360 });
const one = a => a[Math.floor(Math.random() * a.length)];
const signed = v => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = n => Math.round(n).toLocaleString();
let forced = null;
/** 除錯：強制開市（true）、收攤（false）或照時間（null） */
export const force = v => { forced = v; checkT = 0; };
/** 現在有沒有開市：週六 18:00–23:00、不是颱風天 */
export function isOpen() {
  if (forced != null) return forced;
  const d = ctx.date(), h = d.getHours() + d.getMinutes() / 60;
  return d.getDay() === 6 && h >= OPEN && h < CLOSE && !weather.typhoon(d);
}
/** 這一晚的紀錄（開市的那天換一張新的集章卡；收攤以後留著，集章卡面板看得到上一次的） */
function rec() {
  const s = S(), n = s.nm = s.nm || { cards: 0 };
  if (isOpen() && n.night !== ymd(ctx.date())) Object.assign(n, { night: ymd(ctx.date()), stamps: {}, greeted: {}, free: {}, paid: 0, won: 0, exp: 0, plays: 0, warned: 0 });
  ['stamps', 'greeted', 'free'].forEach(k => { n[k] = n[k] || {}; });
  return n;
}

/* ---------- 擺攤與收攤 ---------- */
const local = (x, z, ry, lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
/** 模型裡的標記點 → 世界座標與朝向（標記點 rotation.y = 0 是面向 −Z） */
function mark(g, name) { const o = g && g.getObjectByName(name); if (!o) return null; const p = new THREE.Vector3(); o.getWorldPosition(p); const q = new THREE.Quaternion(); o.getWorldQuaternion(q); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ'); return { x: p.x, y: p.y, z: p.z, ry: e.y }; }
function place(key, x, z, ry, dress) {
  const g = modelClone('NIGHTMODELS', key); if (!g) return null;
  g.position.set(x, groundAt(x, z), z); g.rotation.y = ry; g.updateMatrixWorld(true);
  if (dress) dress(g);
  B.g.add(g); g.updateMatrixWorld(true); register(g); B.parts.push(g); return g;
}
const box = (x, z, ry, hw, hd) => { const c = Math.abs(Math.cos(ry)) > 0.5, w = c ? hw : hd, d = c ? hd : hw; const o = { x0: x - w, x1: x + w, z0: z - d, z1: z + d }; colliders.push(o); B.cols.push(o); };
const ring = (x, z, r) => { const o = { x, z, r }; colliders.push(o); B.cols.push(o); };
/** 跨街的燈串：兩個掛勾之間一條微微下垂的電線，上面一顆顆暖色小燈泡（夜裡發亮） */
function lights(a, b) {
  const pts = [], n = 14;
  for (let i = 0; i <= n; i++) { const k = i / n; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 0.38, a.z + (b.z - a.z) * k)); }
  const curve = new THREE.CatmullRomCurve3(pts), wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.009, 4, false), M('#4a3b3a'));
  B.g.add(wire); B.extra.push(wire);
  const count = Math.max(4, Math.round(curve.getLength() / 0.42)), im = new THREE.InstancedMesh(bulbGeo, bulbMat, count), m4 = new THREE.Matrix4(), c = new THREE.Color(), cols = ['#ffd27a', '#ffb3a7', '#fff0c4', '#ffc98a'];
  for (let i = 0; i < count; i++) { const p = curve.getPoint((i + 0.5) / count); m4.makeTranslation(p.x, p.y - 0.05, p.z); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(cols[i % cols.length])); }
  im.frustumCulled = false; B.g.add(im); B.extra.push(im);
}
function build() {
  B = { g: new THREE.Group(), parts: [], cols: [], seats: [], fronts: [], keepers: [], extra: [], wheel: null };
  B.g.name = 'night-market'; scene.add(B.g);
  if (!bulbMat) { bulbGeo = new THREE.SphereGeometry(0.045, 8, 6); bulbMat = M('#ffffff', { emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 0.9, roughness: 0.6 }); bulbMat.userData.glowK = 0.9; if (!nightMats.includes(bulbMat)) nightMats.push(bulbMat); }   // 和節慶燈籠一樣：白天不亮、夜裡發光
  const hooks = {};
  STALLS.forEach(([id, x, z, ry]) => {
    const k = K(id);
    const s = place('nm_stall', x, z, ry, g => {
      const aw = g.getObjectByName('awning_a'); if (aw && aw.isMesh) { aw.material = aw.material.clone(); aw.material.color.set(k.awning); }
      const pm = g.getObjectByName('prop'), prop = pm && modelClone('NIGHTMODELS', PROP[id]);
      if (prop) { const p = g.worldToLocal(pm.getWorldPosition(new THREE.Vector3())); prop.position.copy(p); prop.position.x -= 0.4; g.add(prop); if (id === 'spin') B.wheel = prop.getObjectByName('wheel'); }   // 道具擺在櫃台偏一邊：攤主不會被轉盤、彈珠台擋住
      label(g, 'sign', (c, w, h) => words(c, w, h, '#fff6e6', '#6b3f3a', [[k.sign, 0.62, 0.54]]), 384);
    });
    if (!s) return;
    box(x, z, ry, 1.1, 0.75);
    const f = mark(s, 'front') || (([fx, fz]) => ({ x: fx, z: fz }))(local(x, z, ry, 0, -1.15)), [vx, vz] = local(x, z, ry, -0.2, -2.05); B.fronts.push({ id, x: f.x, z: f.z, vx, vz });   // v：逛攤時站的位置（離櫃台一步多，看得到攤主和整個櫃台）
    const km = mark(s, 'keeper');
    if (km) { const ch = chibi(Object.assign({ kind: 'human', shirt: '#f2b6a0', pants: '#6a6f8a', hair: '#4a3328', shoe: '#7a5a4a' }, k.look)); ch.position.set(km.x, groundAt(km.x, km.z), km.z); ch.rotation.y = km.ry + Math.PI; ch.traverse(m => { m.frustumCulled = false; }); B.g.add(ch); nameMesh(k.name, ch); B.keepers.push(ch); hooks[id + ':keeper'] = ch; }   // 攤主站在櫃台後面、面向街上
    hooks[id] = ['hook_l', 'hook_r'].map(n => mark(s, n)).filter(Boolean);
  });
  B.keeperOf = id => hooks[id + ':keeper'] || null;
  // 跨街燈串：北排每一攤和對面那一攤，靠近的掛勾兩兩相連
  [['dice', 'ring'], ['ticket', 'boba'], ['spin', 'pachinko'], ['balls', 'eggcake']].forEach(([a, b]) => (hooks[a] || []).forEach(p => { const q = (hooks[b] || []).slice().sort((u, v) => Math.hypot(u.x - p.x, u.z - p.z) - Math.hypot(v.x - p.x, v.z - p.z))[0]; if (q) lights(p, q); }));
  { const [x, z, ry] = GATE; const g = place('nm_gate', x, z, ry, m => label(m, 'sign', (c, w, h) => words(c, w, h, '#fff1d6', '#8a3b34', [[D().gate || '港邊夜市', 0.6, 0.52]]), 512)); if (g) [-1.8, 1.8].forEach(lx => { const [px, pz] = local(x, z, ry, lx, 0); ring(px, pz, 0.2); }); }
  TABLES.forEach(([x, z]) => { const g = place('nm_table', x, z, 0); if (!g) return; ring(x, z, 0.45); for (let i = 0; i < 4; i++) { const m = mark(g, 'seat_' + i); if (m) { const st = { x: m.x, z: m.z, ry: m.ry + Math.PI, h: m.y, n: 1, nm: true }; seats.push(st); B.seats.push(st); } } });
}
function destroy() {
  if (!B) return;
  B.cols.forEach(c => { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); });
  B.seats.forEach(st => { const i = seats.indexOf(st); if (i >= 0) seats.splice(i, 1); });
  B.parts.forEach(g => unregister(g));
  B.extra.forEach(o => o.geometry && o.geometry !== bulbGeo && o.geometry.dispose());
  scene.remove(B.g); B = null; spin = null;
}

/* ---------- 每一格 ---------- */
export function init(c) {
  ctx = c;
  const s = S(); s.nm = s.nm || { cards: 0 };
  if (!s.nm.letter && D().letter) { const l = D().letter; s.nm.letter = 1; social.sendLetter({ from: l.from || 'shop', fromName: '阿潮', title: l.title, open: l.open, text: l.text, close: l.close }); save(); }   // 第一次玩到 v9.4.0：阿潮寄信介紹夜市
}
export function update(dt, t) {
  if (!ctx) return;
  if ((checkT -= dt) <= 0) {
    checkT = 1; const on = isOpen();
    if (on && !B) { build(); if (ctx.started && ctx.started() && forced == null) { Audio.sfx('open'); ui.toast('🏮 港邊夜市開張了！城門東邊的草地，開到晚上 11 點'); } }
    else if (!on && B) destroy();
    if (on && forced == null) { const n = rec(), d = ctx.date(), h = d.getHours() + d.getMinutes() / 60; if (h >= CLOSE - 0.5 && !n.warned) { n.warned = 1; save(); ui.toast('🏮 夜市再半小時就收攤囉'); } }
  }
  if (!B) return;
  B.keepers.forEach(ch => animate(ch, dt, 0, t));
  if (spin && B.wheel) { spin.t += dt; const k = Math.min(1, spin.t / spin.dur), e = 1 - (1 - k) ** 3; B.wheel.rotation.z = spin.from + (spin.to - spin.from) * e; if (k >= 1) { const r = spin.done; spin = null; r(); } }
}
const nearFront = (px, pz) => { if (!B) return null; let best = null, bd = 1.3; B.fronts.forEach(f => { const d = Math.hypot(px - f.x, pz - f.z); if (d < bd) { bd = d; best = f; } }); return best; };
export function hint(px, pz) { const f = nearFront(px, pz); return f ? '逛' + K(f.id).stall : ''; }
export function act(px, pz) { const f = nearFront(px, pz); if (!f) return false; const ch = B.keeperOf(f.id); ctx.busy(() => visit(f.id)); return true; }   // 不用聊天鏡頭（攤主站在雨棚下的攤位裡，過肩或拉近都會被攤位擋住）：visit 把鏡頭轉到玩家正後方

/* ---------- 逛攤位 ---------- */
async function visit(id) {
  const ch = B && B.keeperOf(id), p = ctx.player, f = B && B.fronts.find(o => o.id === id);
  if (f && p) { p.position.x = f.vx; p.position.z = f.vz; }
  let back = null;
  if (ch && p) { const dx = ch.position.x - p.position.x, dz = ch.position.z - p.position.z; lookAt(ch, p.position); p.rotation.y = Math.atan2(dx, dz); back = ctx.face && ctx.face(dx, dz); }   // 攤主看著你、你轉身面向攤主，鏡頭轉到你身後
  try {
    const n = rec(), k = K(id);
    if (!n.greeted[id]) { n.greeted[id] = 1; save(); await ui.say(sp(id), one(k.greet)); }
    await (FOODS.includes(id) ? food(id) : game(id));
    await ui.say(sp(id), one(k.bye));
  } finally { if (ch) lookAt(ch, null); if (back) back(); }
}
/** 轉盤轉到某一種結果（0 大獎、1 小獎、2 銘謝惠顧）：多轉幾圈再慢慢停在那一格 */
function spinTo(kind) {
  if (!B || !B.wheel) return Promise.resolve();
  const cand = SECTOR.map((s, i) => (s === kind ? i : -1)).filter(i => i >= 0), i = cand[Math.floor(Math.random() * cand.length)], step = Math.PI / 4;
  const from = B.wheel.rotation.z, base = from - (from % (Math.PI * 2)), target = base + Math.PI * 2 * 4 + i * step + (Math.random() - 0.5) * step * 0.4;   // 第 i 格轉到指針下（轉盤順時針轉 = rotation.z 增加時，第 i 格從正上方往回）
  Audio.sfx('tick');
  return new Promise(done => { spin = { t: 0, dur: 2.2, from, to: target, done }; });
}
async function game(id) {
  const n = rec(), k = K(id), S0 = S();
  const q = id === 'spin' ? BOOTHS.spin(Math.random, { parts: WHEEL }) : BOOTHS[id](Math.random);
  const rule = id === 'balls' ? `<br>玩法：付 ${q.cost} 鈴錢摸一次，${q.label}就拿到 ${q.prize} 鈴錢。` : '';   // 對話框的 html 只認 b、i、u、sup、sub、br（ui.rich）
  const i = await ui.ask(sp(id), `先算算看再玩：${q.text}${rule}`, q.opts, { html: true, keys: true, quiz: true, answer: q.a });
  if (i == null || i < 0) return;
  const ok = i === q.a; Audio.sfx(ok ? 'ok' : 'bad'); practiced('market', ok ? 1 : 0, 1);
  const verdict = q.ev == null ? '' : q.ev > 0 ? '期望值是正的：長期玩下去平均會賺（老闆要小心了）。' : q.ev < 0 ? '期望值是負的：長期玩下去平均每次會虧這麼多，夜市的攤位就是這樣賺錢的。' : '期望值是 0：玩很多次以後，平均每次不賺也不賠。';
  await ui.say(sp(id), `${ok ? one(k.smart) : one(k.miss)}<br>${ok ? '' : `答案是 ${q.opts[q.a]}。`}${q.why}${verdict ? ' ' + verdict : ''}`, { html: true });
  if (ok) { if (!Object.keys(n.stamps).some(x => GAMES.includes(x))) miles.add('puzzle'); await stamp(id); }
  let free = ok && !n.free[id];
  for (;;) {
    const j = await ui.ask(sp(id), free ? '算對了，這一次老闆請客！要玩嗎？' : `要玩嗎？一次 ${q.cost} 鈴錢。`, [free ? '免費玩一次' : `玩一次（${q.cost} 鈴錢）`, `連玩十次（${fmt(q.cost * 10)} 鈴錢）`, '不玩了']);
    if (j == null || j < 0 || j === 2) return;
    const times = j === 1 ? 10 : 1, pay = free && times === 1 ? 0 : q.cost * times;
    if (S0.bells < pay) { Audio.sfx('deny'); await ui.say(sp(id), '鈴錢好像不太夠呢，下次再來玩吧！'); return; }
    const res = Array.from({ length: times }, () => q.play(Math.random)), won = res.reduce((a, r) => a + r.won, 0), hits = res.filter(r => r.hit).length;
    S0.bells += won - pay; n.paid += pay; n.won += won; n.plays += times; n.exp += pay ? q.exp * times : q.exp + q.cost;
    if (free && times === 1) { free = false; n.free[id] = 1; }
    save(); if (ctx.paint) ctx.paint();
    if (times === 1) {
      if (id === 'spin') await spinTo(res[0].kind);
      Audio.sfx(res[0].hit ? 'coin' : 'pop');
      await ui.say(sp(id), `${res[0].show}——${res[0].hit ? `中了！拿到 ${fmt(won)} 鈴錢。` : '沒中。'}<br>${one(res[0].hit ? k.win : k.lose)}`, { html: true });
    } else {
      Audio.sfx(won > pay ? 'coin' : 'pop');
      await ui.say(sp(id), `十次裡中了 ${hits} 次：付出 ${fmt(pay)}、拿回 ${fmt(won)}，淨 ${signed(Math.round(won - pay))} 鈴錢。<br>照期望值算，十次合計大約 ${signed(Math.round(q.exp * 10))}（每次平均 ${signed(Math.round(q.exp))}）。玩的次數越多，每次的平均通常越接近期望值。`, { html: true });
    }
  }
}
async function food(id) {
  const k = K(id), items = (D().snacks || []).filter(x => x.stall === id), S0 = S();
  if (!items.length) return;
  const i = await ui.ask(sp(id), '要吃什麼呢？', items.map(x => `${x.name}（${x.price} 鈴錢）`).concat(['先不用了']));
  if (i == null || i < 0 || i >= items.length) return;
  const it = items[i];
  if (S0.bells < it.price) { Audio.sfx('deny'); await ui.say(sp(id), '鈴錢好像不太夠呢，下次再來吧！'); return; }
  S0.bells -= it.price; save(); Audio.sfx('pop'); if (ctx.paint) ctx.paint();
  await ui.say(sp(id), one(k.buy));
  await ui.say(sp(id), `${it.desc}<br>小知識：${it.fact}`, { html: true });
  await stamp(id);
}
/** 蓋章：每一攤一晚一個；集滿八個有獎 */
async function stamp(id) {
  const n = rec(); if (n.stamps[id]) return;
  n.stamps[id] = 1; L.gain(10, 0); save(); Audio.sfx('coin');
  const got = ALL.filter(x => n.stamps[x]).length;
  ui.toast(`🏮 集章卡蓋了一個章（${got} / ${ALL.length}）`);
  if (got === ALL.length) await full();
}
async function full() {
  const n = rec(), s = S(); n.cards = (n.cards || 0) + 1; s.bells += 1000; save(); TA.Store.save(); Audio.sfx('levelup');
  const card = D().card || {}; ui.toast(`🏮 ${one(card.full || ['集章卡集滿了！'])}（+1,000 鈴錢）`);
  memo.add('夜市集章卡集滿', `港邊夜市八攤的章都蓋齊了（第 ${n.cards} 張）。`, { key: 'nm:card:' + n.night, icon: '🏮' });
  const f = (D().prizes || [])[[1, 3, 5].indexOf(n.cards)];
  if (f && ctx.giveFurn) await ctx.giveFurn(f.id, `港邊夜市集章卡第 ${n.cards} 次集滿的紀念`);
  if (ctx.paint) ctx.paint();
}

/* ---------- 集章卡（手機） ---------- */
function nextText() {
  const d = new Date(ctx.date()), h = d.getHours();
  if (d.getDay() === 6 && h < OPEN) return '今天晚上 6 點開市';
  const k = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + k);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日（週六）晚上 6 點開市`;
}
export function openCard() {
  const on = isOpen(), n = rec(), card = D().card || {}, body = ui.el('div', 'nm');
  const has = on || n.night, got = has ? ALL.filter(x => n.stamps[x]).length : 0;
  body.innerHTML = `<p class="nm-lead">${on ? '<b>港邊夜市開市中</b>（城門東邊的草地，開到晚上 11 點）' : `今天沒有夜市。${nextText()}，地點在城門東邊、靠海的草地。`}<small>${ui.esc(card.rule || '每一攤算對，或買一樣小吃，就蓋一個章。')}</small></p>
    <div class="nm-grid">${ALL.map(id => `<div class="nm-st${has && n.stamps[id] ? ' on' : ''}"><i>${has && n.stamps[id] ? '🏮' : ''}</i><small>${ui.esc(K(id).stall)}</small></div>`).join('')}</div>
    <p class="nm-sum">${on ? '今晚' : n.night ? `上一次（${n.night.slice(5).replace('-', '/')}）` : ''}${has ? `蓋了 ${got} / ${ALL.length} 個章。` : '還沒去過夜市。'}${has && n.plays ? `<br>遊戲攤玩了 ${n.plays} 次：付出 ${fmt(n.paid)}、贏回 ${fmt(n.won)}，淨 <b>${signed(Math.round(n.won - n.paid))}</b> 鈴錢；照期望值算，合計大約是 ${signed(Math.round(n.exp))}。` : ''}</p>
    <p class="muted">集滿過 ${n.cards || 0} 次。第 1、3、5 次集滿各送一件夜市家具：${(D().prizes || []).map(f => ui.esc(f.name)).join('、')}。</p>`;
  ui.panel(card.title || '夜市集章卡', body, { cls: 'phone' });
}
/** 島民逛夜市站的位置：每一攤前面左右各一個（中間留給玩家）、東頭街頭演奏三個 */
export const spots = () => STALLS.flatMap(([id, x, z, ry]) => [-0.75, 0.75].map(lx => { const [wx, wz] = local(x, z, ry, lx, -1.1); return { x: wx, z: wz, look: [x, z] }; }));
export const buskSpots = () => BUSK.map(([x, z]) => ({ x, z, look: [10, 33] }));
export const debug = () => ({ open: isOpen(), built: !!B, stalls: B ? B.fronts.length : 0, keepers: B ? B.keepers.length : 0, nm: JSON.parse(JSON.stringify(S().nm || {})) });
