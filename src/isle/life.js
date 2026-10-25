/* 潮汐小島 · 島上生物：釣魚（英文單字速答）、捉蟲（國文限時題）、挖化石。 */
import * as THREE from 'three';
import { scene, bend, M, mesh } from './engine.js';
import { tileAt, groundAt, waterAt, waterY, N, C } from './terrain.js';
import { flowerSpots, trees, rocks, blocked, PIER, onPier } from './props.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { pickQ, vocabQ, record, dayKey, fairSec } from './quiz.js';
import { S, save, roll, addItem, icon, stars, find, freeSlots } from './state.js';
import * as miles from './miles.js';
import * as feel from './feel.js';
import * as waves from './waves.js';
import * as shake from './shake.js';

const TA = window.TA;
let P = null;      // 玩家
export let busy = false;
/* 大賽：{kind: 'fish'|'bug', left: 秒, score, n} */
export let tourney = null;
let onTourneyEnd = null;
export function startTourney(kind, cb) { tourney = { kind, left: 180, score: 0, n: 0 }; onTourneyEnd = cb; spawnT = 0; }
function tourneyScore(kind, sp) { if (!tourney || tourney.kind !== kind) return 0; const pts = kind === 'fish' ? sp.size * 10 + sp.rarity * 15 : sp.rarity * 20 + 10; tourney.score += pts; tourney.n++; ui.floatText(P, `+${pts} 分`, '#ff7a5a'); return pts; }
let onCatch = null;
export function init(player, cb) { P = player; onCatch = cb || null; }
const cheer = e => { try { onCatch && onCatch(e); } catch (err) { console.warn(err); } };
const fwd = () => new THREE.Vector3(Math.sin(P.rotation.y), 0, Math.cos(P.rotation.y));

/* ================= 魚影 ================= */
const shadows = [];
/** 魚影（水面漣漪用） */
export const fishShadows = () => shadows;
const shadowGeo = new THREE.CircleGeometry(0.5, 18);
function spawnShadow(where) {
  const sp = roll('fish', where === 'river' ? ['river', 'pond'] : where === 'pier' ? ['pier', 'sea'] : 'sea'); if (!sp) return;
  let x, z, ok = false;
  for (let k = 0; k < 40 && !ok; k++) {
    if (where === 'pier') { x = PIER.x + (Math.random() - 0.5) * 5; z = PIER.z + PIER.len + 1 + Math.random() * 3; }
    else if (where === 'river') { x = (Math.random() - 0.5) * N; z = (Math.random() - 0.5) * N; }
    else { const a = Math.random() * 6.283, r = 30 + Math.random() * 20; x = Math.cos(a) * r; z = Math.sin(a) * r; }   // 離岸 5 公尺內的海面（v6.79 的島比較大）
    const w = waterAt(x, z); ok = where === 'river' ? w === 'river' : w === 'sea' && near(x, z, 5);
  }
  if (!ok) return;
  const m = new THREE.Mesh(shadowGeo, bend(new THREE.MeshBasicMaterial({ color: '#0b3550', transparent: true, opacity: 0, depthWrite: false })));
  m.rotation.x = -Math.PI / 2; const s = 0.35 + sp.size * 0.2; m.scale.set(s * 0.55, s, 1); m.renderOrder = 2;
  const y = where === 'river' ? 0.6 : -0.25; m.position.set(x, y, z); scene.add(m);
  shadows.push({ sp, m, where, x, z, y, a: Math.random() * 6.28, st: 'idle', t: 0, fade: 0 });
}
const near = (x, z, r) => { for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; const t = tileAt(x + Math.cos(a) * r, z + Math.sin(a) * r); if (t >= 0) return true; } return false; };
function removeShadow(f) { f.st = 'gone'; }

/* ---------- 釣竿 ---------- */
let rod = null; // {bob, line, fish, t, state}
const bobGeo = new THREE.SphereGeometry(0.09, 10, 8);
function cast() {
  const d = fwd(), p = P.position;
  let tx = p.x + d.x * 3.2, tz = p.z + d.z * 3.2, w = waterAt(tx, tz);
  if (!w) { tx = p.x + d.x * 2.2; tz = p.z + d.z * 2.2; w = waterAt(tx, tz); }
  if (!w) { ui.toast('要面向水面才能拋竿喔'); return; }
  const y = w === 'river' ? (waterY(tx, tz) ?? 0.7) + 0.02 : 0.05;
  const g = new THREE.Group(); g.add(mesh(bobGeo, M('#ef6f5e'), 0, 0.04, 0, { noCast: true }), mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, 6.3, Math.PI / 2, Math.PI / 2), M('#ffffff'), 0, 0.04, 0, { noCast: true }));
  g.position.set(tx, y, tz); scene.add(g);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), bend(new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 })));
  scene.add(line);
  rod = { bob: g, line, y, t: 0, fish: null, idle: 12 + Math.random() * 6, where: w, fly: { t: -0.24, to: g.position.clone(), from: null } };   // 浮標等竿子甩到前面（約 0.24 秒）才飛出去
  P.userData.swing = 1; Audio.sfx('cast');
}
function reel(silent) {
  if (!rod) return; scene.remove(rod.bob); scene.remove(rod.line);
  if (rod.fish && rod.fish.st !== 'caught') { rod.fish.st = 'flee'; rod.fish.t = 0; }
  rod = null; if (!silent) Audio.sfx('swish');
}
async function hook() {
  const f = rod.fish, sp = f.sp, bp = rod.bob.position.clone(); f.st = 'caught'; busy = true;
  // 拉竿的那一下（v7.0）：浮標被扯起來、水花、鏡頭小震、手機震一下；停約 0.3 秒才出題，收竿才有力道
  rod.yank = 0; P.userData.swing = 1; Audio.sfx('splash'); waves.ripple(bp.x, bp.z, 0.7); waves.ripple(bp.x, bp.z, 0.35); shake.kick(0.05); shake.haptic('hit');
  await new Promise(r => setTimeout(r, 320));
  reel(true);
  // 越稀有的魚考越難的單字：三星考 4 級以上、四星以上考 5 級以上
  const big = sp.rarity >= 3, q = vocabQ(sp.rarity >= 4 ? { minLv: 5 } : big ? { minLv: 4 } : { maxLv: 4 }) || vocabQ();
  const lim = (tourney && tourney.kind === 'fish' ? 8 : 10) + (big ? 2 : 0);
  const i = await ui.ask({ name: big ? '……是大魚！' : '……有東西上鉤了！', color: '#3aa0d8', voice: 520 }, `${big ? '大魚的題目比較難：' : ''}${q.q}（${lim} 秒內作答）`, q.o, { abc: true, timer: lim, keys: true });
  const ok = i === q.a; record(q, ok); ui.closeDialog(); feel.note(feel.hit(ok));
  if (ok) {
    removeShadow(f);
    const s = S(), first = !s.dex.fish[sp.id];
    s.dex.fish[sp.id] = s.dex.fish[sp.id] || Date.now(); s.stats = s.stats || {}; s.stats.fish = (s.stats.fish || 0) + 1;
    const room = addItem({ k: 'fish', id: sp.id }); save(); tourneyScore('fish', sp); miles.add('fish'); cheer({ kind: 'fish', sp, first });
    await ui.card({ icon: icon(sp.id, 'fish'), title: `我釣到了${sp.name}！`, sub: `${q.vocab.w} ＝ ${q.vocab.zh}`, extra: `<span class="stars">${stars(sp.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}${room ? '' : '<em>口袋滿了，只好放回水裡。</em>'}` });
    if (!tourney) await challenge.keepGoing({ name: '釣魚挑戰', color: '#3aa0d8', voice: 520 }, q);
  } else {
    f.st = 'flee'; f.t = 0; Audio.sfx('bad');
    await ui.say(null, i < 0 ? `時間到，魚跑掉了……「${q.vocab.w}」是「${q.vocab.zh}」。` : `魚跑掉了……「${q.vocab.w}」是「${q.vocab.zh}」，下次記得！`);
    ui.closeDialog();
  }
  busy = false;
}
function updateRod(dt, t) {
  if (!rod) return;
  const tip = new THREE.Vector3();
  if (P.userData.fpTip) P.userData.fpTip.getWorldPosition(tip);   // 第一人稱：從鏡頭前那支竿子的竿尖拉線
  else { P.userData.hand.getWorldPosition(tip); const d = fwd(); tip.addScaledVector(d, 0.9); tip.y += 0.75; }
  if (rod.fly) {   // 浮標飛出去：從竿尖沿拋物線落到水面
    const F = rod.fly; F.t += dt;
    if (F.t < 0) { rod.bob.position.copy(tip); }
    else {
      if (!F.from) F.from = tip.clone();
      const s = Math.min(1, F.t / 0.3); rod.bob.position.lerpVectors(F.from, F.to, s); rod.bob.position.y += Math.sin(s * Math.PI) * 1.1;
      if (s >= 1) { rod.fly = null; rod.bob.position.copy(F.to); Audio.sfx('plop'); waves.ripple(F.to.x, F.to.z, 0.4); }
    }
    rod.line.geometry.setFromPoints([tip, rod.bob.position.clone().setY(rod.bob.position.y + 0.05)]);
    return;
  }
  if (rod.yank != null) { rod.yank += dt; rod.bob.position.y = rod.y + Math.min(0.9, rod.yank * 4); }   // 拉竿：浮標被扯出水面
  rod.t += dt;
  let dip = 0;
  const f = rod.fish;
  if (!f) {
    rod.idle -= dt;
    if (rod.idle < 0) { ui.toast('好像沒有魚……換個地方試試'); reel(); return; }
    const bx = rod.bob.position.x, bz = rod.bob.position.z, dOf = s => Math.hypot(s.m.position.x - bx, s.m.position.z - bz);
    const cand = shadows.filter(s => s.st === 'idle' && dOf(s) < 8).sort((a, b) => dOf(a) - dOf(b));   // 最靠近浮標的魚上鉤：瞄準想要的魚影拋竿
    if (cand.length && rod.t > 0.8) { rod.fish = cand[0]; cand[0].st = 'approach'; cand[0].t = 0; }
    else if (rod.t > 5 && !rod.lured) {   // 附近沒有魚影：同一片水域裡最近的一條魚被浮標吸引，游到浮標附近（不會一直白等）
      rod.lured = true;
      const f = shadows.filter(s => s.st === 'idle' && s.where === rod.where && dOf(s) < 30).sort((a, b) => dOf(a) - dOf(b))[0];
      if (f) { const dd = dOf(f), nx = bx + (f.m.position.x - bx) / dd * 4, nz = bz + (f.m.position.z - bz) / dd * 4; if (waterAt(nx, nz) === rod.where) { f.m.position.x = nx; f.m.position.z = nz; } rod.fish = f; f.st = 'approach'; f.t = 0; }
    }
  } else if (f.st === 'approach') {
    const dx = rod.bob.position.x - f.m.position.x, dz = rod.bob.position.z - f.m.position.z, dd = Math.hypot(dx, dz);
    f.m.rotation.z = Math.atan2(dx, dz) + Math.PI; f.m.position.x += dx / dd * dt * 0.9; f.m.position.z += dz / dd * dt * 0.9;
    if (dd < 0.45) { f.st = 'nibble'; f.n = 1 + Math.floor(Math.random() * 3); f.t = 0; }
  } else if (f.st === 'nibble') {
    f.t += dt; if (f.t > 0.9 + Math.random() * 0.02) { f.t = 0; f.n--; Audio.sfx('nibble'); rod.dipT = 0.2; waves.ripple(rod.bob.position.x, rod.bob.position.z, 0.22); if (f.n <= 0) { f.st = 'bite'; f.t = 0; Audio.sfx('bite'); rod.dipT = 1.2; ui.emote(P, '！', '#ef6f5e'); waves.ripple(rod.bob.position.x, rod.bob.position.z, 0.55); shake.kick(0.02); shake.haptic('bite'); } }
  } else if (f.st === 'bite') {
    f.t += dt; if (f.t > 1.3) { f.st = 'flee'; f.t = 0; ui.toast('太慢了，魚跑掉了'); rod.fish = null; rod.idle = 6; }
  }
  if (rod.dipT > 0) { rod.dipT -= dt; dip = f && f.st === 'bite' ? 0.22 : Math.max(0, rod.dipT) * 0.6; }
  if (rod.yank == null) rod.bob.position.y = rod.y + Math.sin(t * 2.4) * 0.025 - dip;
  const pts = []; for (let k = 0; k <= 10; k++) { const s = k / 10; pts.push(new THREE.Vector3(tip.x + (rod.bob.position.x - tip.x) * s, tip.y + (rod.bob.position.y + 0.05 - tip.y) * s - Math.sin(s * Math.PI) * 0.35, tip.z + (rod.bob.position.z - tip.z) * s)); }
  rod.line.geometry.setFromPoints(pts);
}
function rodAction() {
  if (!rod) { cast(); return; }
  if (rod.fish && rod.fish.st === 'bite') { hook(); return; }
  if (rod.fish && (rod.fish.st === 'nibble' || rod.fish.st === 'approach')) { ui.toast('太急了！魚被嚇跑了'); }
  reel();
}

/* ================= 蟲 ================= */
const bugs = [];
const texCache = {};
function bugTex(id) { if (texCache[id]) return texCache[id]; const t = new THREE.TextureLoader().load(icon(id, 'bug')); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return (texCache[id] = t); }
function spawnBug() {
  const sp = roll('bug'); if (!sp) return;
  let x, z, y, ok = false;
  for (let k = 0; k < 30 && !ok; k++) {
    const w = sp.where;
    if (w === 'flower' && flowerSpots.length) { const f = flowerSpots[Math.floor(Math.random() * flowerSpots.length)]; x = f[0] + (Math.random() - 0.5); z = f[1] + (Math.random() - 0.5); y = groundAt(x, z) + 0.35; ok = true; }
    else if (w === 'tree' && trees.length) { const tr = trees[Math.floor(Math.random() * trees.length)]; if (tr.kind === 'palm') continue; const a = Math.random() * 6.28; x = tr.x + Math.cos(a) * 0.28 * tr.s; z = tr.z + Math.sin(a) * 0.28 * tr.s; y = groundAt(x, z) + 0.9 * tr.s; ok = true; }
    else if (w === 'rock' && rocks.length) { const r = rocks[Math.floor(Math.random() * rocks.length)]; x = r.x; z = r.z + 0.1; y = groundAt(x, z) + 0.55 * r.s; ok = true; }
    else { x = (Math.random() - 0.5) * N * 0.92; z = (Math.random() - 0.5) * N * 0.92; const t = tileAt(x, z); ok = w === 'water' ? waterAt(x, z) === 'river' : w === 'beach' ? t === 0 : (t === 1 || t === 2); y = w === 'water' ? (waterY(x, z) ?? 0.7) + 0.08 : groundAt(x, z) + (w === 'air' ? 1.1 : 0.2); if (ok && w !== 'water' && blocked(x, z, 0.3)) ok = false; }
  }
  if (!ok || Math.hypot(x - P.position.x, z - P.position.z) < 6) return;
  const s = new THREE.Sprite(bend(new THREE.SpriteMaterial({ map: bugTex(sp.id), transparent: true, alphaTest: 0.5 }), 'sprite'));
  s.scale.set(0.55, 0.55, 1); s.position.set(x, y, z); scene.add(s);
  bugs.push({ sp, s, x, y, z, ph: Math.random() * 6, st: 'idle', t: 0 });
}
function updateBugs(dt, t, running) {
  for (let i = bugs.length - 1; i >= 0; i--) {
    const b = bugs[i], d = Math.hypot(b.s.position.x - P.position.x, b.s.position.z - P.position.z);
    if (b.st === 'flee') { b.t += dt; b.s.position.y += dt * 3; b.s.position.x += Math.cos(b.ph) * dt * 3; b.s.material.opacity = 1 - b.t; if (b.t > 1) { scene.remove(b.s); bugs.splice(i, 1); } continue; }
    if (b.st === 'gone') { scene.remove(b.s); bugs.splice(i, 1); continue; }
    if (b.sp.where === 'air') { b.s.position.x = b.x + Math.sin(t * 0.5 + b.ph) * 2; b.s.position.z = b.z + Math.cos(t * 0.4 + b.ph) * 2; b.s.position.y = b.y + Math.sin(t * 2 + b.ph) * 0.25; }
    else if (b.sp.where === 'ground' || b.sp.where === 'beach') { b.s.position.x = b.x + Math.sin(t * 0.3 + b.ph) * 0.6; b.s.position.z = b.z + Math.cos(t * 0.25 + b.ph) * 0.6; b.s.position.y = groundAt(b.s.position.x, b.s.position.z) + 0.2; }
    else b.s.position.y = b.y + Math.sin(t * 3 + b.ph) * 0.03;
    if (d < 3 && running && !busy) { b.st = 'flee'; b.t = 0; Audio.sfx('swish'); }
    if (d > 45) { b.st = 'gone'; }
  }
}
async function netAction() {
  P.userData.swing = 1; Audio.sfx('swish');
  const d = fwd(), p = P.position;
  const b = bugs.filter(b => b.st === 'idle').map(b => ({ b, dx: b.s.position.x - p.x, dz: b.s.position.z - p.z })).map(o => Object.assign(o, { dist: Math.hypot(o.dx, o.dz) })).filter(o => o.dist < 1.9 && (o.dx * d.x + o.dz * d.z) / (o.dist || 1) > 0.35).sort((a, b) => a.dist - b.dist)[0];
  if (!b) return;
  const bug = b.b, sp = bug.sp; bug.st = 'held'; busy = true;
  // 越稀有的蟲考越難的國文題：三星中等以上、四星以上困難
  const q = (sp.rarity >= 4 ? pickQ('chinese', 3, { minD: 3 }) : sp.rarity >= 3 ? pickQ('chinese', 3, { minD: 2 }) : pickQ('chinese', 2)) || pickQ('chinese', 3);
  const lim = fairSec(tourney && tourney.kind === 'bug' ? 15 : 20, q);
  const i = await ui.ask({ name: '網子裡的' + sp.name + '在掙扎！', color: '#ff8fa3', voice: 600 }, `${q.q}（${lim} 秒）`, q.o, { abc: true, timer: lim, keys: true, html: true });
  const ok = i === q.a; record(q, ok); ui.closeDialog(); feel.note(feel.hit(ok));
  if (ok) {
    bug.st = 'gone'; const s = S(), first = !s.dex.bug[sp.id]; s.dex.bug[sp.id] = s.dex.bug[sp.id] || Date.now();
    const room = addItem({ k: 'bug', id: sp.id }); save(); tourneyScore('bug', sp); miles.add('bug'); cheer({ kind: 'bug', sp, first });
    await ui.card({ icon: icon(sp.id, 'bug'), title: `我抓到了${sp.name}！`, sub: '國文題答對了！', extra: `<span class="stars">${stars(sp.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}${room ? '' : '<em>口袋滿了，只好放牠走。</em>'}` });
    if (!tourney) await challenge.keepGoing({ name: '捕蟲挑戰', color: '#ff8fa3', voice: 600 }, q);
  } else {
    bug.st = 'flee'; bug.t = 0; Audio.sfx('bad');
    await ui.say(null, `${sp.name}溜走了……正確答案是 ${ui.ansOf(q)}。`, { html: true }); await ui.say(null, q.e, { html: true }); ui.closeDialog();
  }
  busy = false;
}

/* ================= 化石 ================= */
const spotMeshes = [];
const starGeo = (() => { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.14 : 0.36, a = i / 10 * Math.PI * 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ShapeGeometry(sh); })();
export function layoutSpots() {
  spotMeshes.forEach(m => scene.remove(m)); spotMeshes.length = 0;
  const s = S();
  if (!s.spots.length) {
    let seed = [...dayKey()].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 300 && s.spots.length < 4; k++) { const x = (r() - 0.5) * N * 0.92, z = (r() - 0.5) * N * 0.92, t = tileAt(x, z); if ((t === 1 || t === 0 || t === 2) && !blocked(x, z, 0.8) && s.spots.every(o => Math.hypot(o.x - x, o.z - z) > 8)) s.spots.push({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, dug: false }); }
    save();
  }
  s.spots.forEach(o => { if (o.dug) return; const m = new THREE.Mesh(starGeo, M('#6b4a2e')); m.rotation.x = -Math.PI / 2; m.position.set(o.x, groundAt(o.x, o.z) + 0.03, o.z); m.receiveShadow = true; scene.add(m); m.userData.spot = o; spotMeshes.push(m); });
}
async function digAction() {
  P.userData.swing = 1; Audio.sfx('dig');
  const d = fwd(), x = P.position.x + d.x * 0.9, z = P.position.z + d.z * 0.9;
  const m = spotMeshes.find(m => Math.hypot(m.position.x - x, m.position.z - z) < 0.9);
  if (!m) { ui.toast('這裡挖不到東西。找找地上的星形裂縫！'); return; }
  if (!freeSlots()) { ui.toast('口袋滿了，先整理口袋再來挖！（裂縫還在，不會消失）', 'bad'); return; }   // 先檢查口袋：挖了放不下的話，今天的挖掘點不能白白用掉
  m.userData.spot.dug = true; scene.remove(m); spotMeshes.splice(spotMeshes.indexOf(m), 1);
  busy = true;
  const room = addItem({ k: 'unk', id: 'fossil_unknown' }); save(); miles.add('fossil');
  cheer({ kind: 'fossil' });
  await ui.card({ icon: icon('fossil_unknown', 'unk'), title: '挖到了化石！', sub: '還不知道是什麼。拿去博物館給史遙鑑定吧！', extra: room ? '' : '<em>口袋滿了，先整理一下口袋。</em>' });
  busy = false;
}

/* ================= 對外 ================= */
let spawnT = 0;
export function update(dt, t, running) {
  if (tourney && !busy) { tourney.left -= dt; if (tourney.left <= 0) { const t = tourney; tourney = null; onTourneyEnd && onTourneyEnd(t); } }
  spawnT -= dt;
  if (spawnT <= 0) {
    const tf = tourney && tourney.kind === 'fish', tb = tourney && tourney.kind === 'bug';
    spawnT = tourney ? 0.5 : 1.5;
    const sea = shadows.filter(s => s.where === 'sea' && s.st !== 'gone').length, river = shadows.filter(s => s.where === 'river' && s.st !== 'gone').length, pier = shadows.filter(s => s.where === 'pier' && s.st !== 'gone').length;
    if (sea < (tf ? 16 : 9)) spawnShadow('sea'); if (river < (tf ? 7 : 4)) spawnShadow('river'); if (pier < (tf ? 4 : 2)) spawnShadow('pier');
    if (bugs.length < (tb ? 18 : 9)) spawnBug();
  }
  for (let i = shadows.length - 1; i >= 0; i--) {
    const f = shadows[i];
    if (f.st === 'idle') { f.a += dt * 0.4; f.m.position.x = f.x + Math.cos(f.a) * 0.8; f.m.position.z = f.z + Math.sin(f.a * 0.7) * 0.8; f.m.rotation.z = -f.a; f.fade = Math.min(1, f.fade + dt * 0.5); }
    if (f.st === 'flee') { f.t += dt; f.m.position.x += Math.sin(f.m.rotation.z) * dt * 4; f.m.position.z += Math.cos(f.m.rotation.z) * dt * 4; f.fade = Math.max(0, 1 - f.t); if (f.t > 1) f.st = 'gone'; }
    if (f.st === 'gone') { f.fade -= dt * 2; if (f.fade <= 0) { scene.remove(f.m); shadows.splice(i, 1); continue; } }
    f.m.material.opacity = 0.34 * f.fade;
  }
  updateRod(dt, t);
  updateBugs(dt, t, running);
}
/** E：依手上工具行動；回傳是否處理 */
export function action(tool) {
  if (busy) return true;
  if (tool === 'rod') { rodAction(); return true; }
  if (tool === 'net') { netAction(); return true; }
  if (tool === 'shovel') { digAction(); return true; }
  return false;
}
export const fishing = () => !!rod;
/** 除錯：目前的釣竿與魚影 */
export const dbg = () => ({ rod, shadows });
/** 釣魚的狀態（按鍵提示用）：'wait' 等魚、'nibble' 輕咬（還不能拉）、'bite' 咬鉤（快拉！） */
export const rodState = () => !rod ? null : rod.fish && (rod.fish.st === 'nibble' || rod.fish.st === 'bite') ? rod.fish.st : 'wait';
/** 面前有沒有化石裂縫（鏟子優先挖化石） */
export function spotAhead() { if (!P) return false; const d = fwd(), x = P.position.x + d.x * 0.9, z = P.position.z + d.z * 0.9; return spotMeshes.some(m => Math.hypot(m.position.x - x, m.position.z - z) < 0.9); }
export function cancel() { reel(true); }
export { onPier };
export const debug = () => ({ rod: rod && { t: rod.t, idle: rod.idle, fish: rod.fish && rod.fish.st, bob: rod.bob.position.toArray() }, shadows: shadows.map(s => [s.where, s.st, Math.round(s.m.position.x), Math.round(s.m.position.z), s.sp.id]), bugs: bugs.map(b => [b.sp.id, b.sp.where, b.st, +b.s.position.x.toFixed(1), +b.s.position.z.toFixed(1)]), spots: spotMeshes.map(m => [m.position.x, m.position.z]) });
