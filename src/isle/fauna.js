/* 潮汐小島 · 島上的動物（v8.9）：海面與溪裡偶爾跳出水面的魚、外海成群躍出的海豚、遠方噴氣甩尾的大翅鯨，
   以及在廣場和碼頭附近散步、坐著、打盹的兩隻貓（靠近按 E 可以摸摸；島民經過時偶爾停下來看牠）。
   模型在 data/faunamodels.js（程式化建模）；海豚與鯨魚出現在離玩家最近的那一側外海，比較容易看到。 */
import * as THREE from 'three';
import * as nav from './nav.js';
import { glow as blueGlow } from './bluetears.js';
import { scene, bend } from './engine.js';
import { modelClone } from './props.js';
import { warp } from './terrain.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as memo from './memo.js';
import { setExpr } from './chars.js';
import { I, S, save } from './state.js';
import { pick, dayKey } from './quiz.js';

let ctx = null;   // ground、waterY(x, z)、isWater、player、villagers、simT()、hour()、talking()
const L8 = () => I.LINES8 || {};
const rnd = (a, b) => a + Math.random() * (b - a);
const fx = [];   // 水花圈：{ mesh, t, life }
let ringGeo = null;
function splash(x, y, z, size) {   // 每個水花圈各自一個材質（各自淡出），和海面一樣套地平線彎曲
  if (!ringGeo) ringGeo = new THREE.RingGeometry(0.82, 1, 24).rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(ringGeo, bend(new THREE.MeshBasicMaterial({ color: blueGlow() > 0.2 ? '#62cbff' : '#f4fbff', transparent: true, opacity: blueGlow() > 0.2 ? 0.95 : 0.7, depthWrite: false })));   // v8.9.1 藍眼淚的夜晚：水花是藍色的
  m.position.set(x, y + 0.02, z); m.scale.setScalar(size * 0.3); m.renderOrder = 3; scene.add(m);
  fx.push({ mesh: m, t: 0, life: 1.1, size });
}
function model(key, fallbackColor, len) {
  const m = modelClone('FAUNAMODELS', key);
  if (m) return m;
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.8 })); b.scale.set(0.35 * len, 0.35 * len, len); g.add(b); return g;
}

/* ================= 跳出水面的魚 ================= */
let fishAt = 4, jumping = [];
function fishTick(dt) {
  fishAt -= dt;
  if (fishAt <= 0) {
    fishAt = rnd(5, 12);
    const p = ctx.player.position;
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * Math.PI * 2, d = rnd(7, 26), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (!ctx.isWater(x, z)) continue;
      const wy = ctx.waterY(x, z), sea = Math.hypot(x, z) > 30 || wy < 0;
      const m = model(sea ? 'fish_sea' : 'fish_river', sea ? '#9fb6c8' : '#8a9a6a', sea ? 0.45 : 0.25); m.visible = false; scene.add(m);
      jumping.push({ m, x, z, wy, h: sea ? rnd(0.6, 1.1) : rnd(0.35, 0.6), len: sea ? 1.6 : 1.1, t: -0.05, ry: Math.random() * Math.PI * 2, tail: m.getObjectByName('tail'), size: sea ? 1.2 : 0.7 });
      break;
    }
  }
  jumping = jumping.filter(j => {
    j.t += dt; const s = j.t / 0.9;
    if (s >= 1) { splash(j.x + Math.sin(j.ry) * j.len * 0.5, j.wy, j.z + Math.cos(j.ry) * j.len * 0.5, j.size); scene.remove(j.m); return false; }
    if (s >= 0 && !j.m.visible) { j.m.visible = true; splash(j.x - Math.sin(j.ry) * j.len * 0.5, j.wy, j.z - Math.cos(j.ry) * j.len * 0.5, j.size * 0.8); }
    const u = s - 0.5, y = j.wy + j.h * (1 - 4 * u * u);   // 拋物線
    j.m.position.set(j.x + Math.sin(j.ry) * j.len * u, y, j.z + Math.cos(j.ry) * j.len * u);
    j.m.rotation.set(0, j.ry, 0); j.m.rotateX(u * 1.6);   // 頭先上揚、落下時頭朝下
    if (j.tail) j.tail.rotation.y = Math.sin(j.t * 30) * 0.5;
    return true;
  });
}

/* ================= 海豚與鯨魚：出現在離玩家最近的那一側外海 ================= */
let podAt = 50, pod = null, whaleAt = 160, whale = null;
const daylight = () => { const h = ctx.hour(); return h >= 6.5 && h < 17.5; };
function seaDir() { const p = ctx.player.position; return Math.atan2(p.x, p.z); }   // 從島中心看玩家的方向
function podTick(dt) {
  if (!pod) {
    podAt -= dt; if (podAt > 0 || !daylight()) return;
    podAt = rnd(150, 260);
    const a = seaDir() + rnd(-0.5, 0.5), R = 60, dir = Math.random() < 0.5 ? 1 : -1;
    pod = { a, R, dir, t: 0, life: 26, ds: [0, 1, 2].map(i => { const m = model('dolphin', '#7f98ad', 2.2); m.visible = false; scene.add(m); return { m, off: i * 0.85, lane: (i - 1) * 2.2, tail: m.getObjectByName('tail') }; }) };
    return;
  }
  pod.t += dt; const P = pod;
  if (P.t > P.life) { P.ds.forEach(d => scene.remove(d.m)); pod = null; return; }
  P.ds.forEach(d => {
    const tt = P.t - d.off, a = P.a + P.dir * tt * 0.045, r = P.R + d.lane;
    const x = Math.sin(a) * r, z = Math.cos(a) * r, wy = ctx.waterY(x, z);
    const ph = ((tt % 2.6) + 2.6) % 2.6 / 1.1, up = ph < 1 && tt > 0 && P.t < P.life - 1.5;   // 每 2.6 秒躍出一次，在空中 1.1 秒
    const u = ph - 0.5, y = up ? wy - 0.35 + 1.5 * (1 - 4 * u * u) : wy - 1.5;
    d.m.visible = up; d.m.position.set(x, y, z);
    const heading = a + P.dir * Math.PI / 2;   // 沿著圓周游
    d.m.rotation.set(0, heading, 0); if (up) d.m.rotateX(u * 1.4);
    if (d.tail) d.tail.rotation.x = Math.sin(P.t * 9) * 0.4;
    if (up && ph < 0.05 && !d.sp0) { d.sp0 = true; splash(x, wy, z, 2.2); } if (ph >= 0.05) d.sp0 = false;
    if (up && ph > 0.95 && !d.sp1) { d.sp1 = true; splash(x, wy, z, 2.6); } if (ph <= 0.95) d.sp1 = false;
  });
}
const spoutMat = bend(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
function whaleTick(dt) {
  if (!whale) {
    whaleAt -= dt; if (whaleAt > 0 || !daylight()) return;
    const m = new Date().getMonth() + 1; whaleAt = (m >= 4 && m <= 10) ? rnd(380, 600) : rnd(700, 1100);   // 台灣東部賞鯨季（4–10 月）比較常見
    const a = seaDir() + rnd(-0.4, 0.4), R = 84, x = Math.sin(a) * R, z = Math.cos(a) * R, wy = ctx.waterY(x, z);
    const back = model('whale_back', '#4d5f74', 9), tail = model('whale_tail', '#4d5f74', 3), sp = new THREE.Group();
    for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), spoutMat); s.position.set(rnd(-0.3, 0.3), i * 0.6, rnd(-0.3, 0.3)); sp.add(s); }
    [back, tail, sp].forEach(o => { o.visible = false; scene.add(o); });
    whale = { x, z, wy, ry: a + Math.PI / 2, back, tail, sp, t: 0 };
    return;
  }
  const W = whale; W.t += dt; const t = W.t;
  // 0–3 秒噴氣、2–9 秒背浮出水面往前游、9–13 秒舉尾、13 秒以後結束
  W.sp.visible = t < 3.2; if (W.sp.visible) { const k = t / 3.2; W.sp.position.set(W.x, W.wy + 0.3, W.z); W.sp.scale.set(1 + k * 2.5, 0.4 + Math.min(1, t * 1.5) * 1.6, 1 + k * 2.5); spoutMat.opacity = 0.55 * (1 - k); }
  const bk = THREE.MathUtils.smoothstep(t, 2, 3.5) * (1 - THREE.MathUtils.smoothstep(t, 7.5, 9.5));
  W.back.visible = bk > 0.01; W.back.position.set(W.x + Math.sin(W.ry) * (t - 5) * 1.2, W.wy - 1.2 + bk * 1.2, W.z + Math.cos(W.ry) * (t - 5) * 1.2); W.back.rotation.y = W.ry;
  const tk = THREE.MathUtils.smoothstep(t, 9, 10.5) * (1 - THREE.MathUtils.smoothstep(t, 11.8, 13.2));
  W.tail.visible = tk > 0.01; W.tail.position.set(W.x + Math.sin(W.ry) * 6, W.wy - 2.8 + tk * 2.8, W.z + Math.cos(W.ry) * 6); W.tail.rotation.set(-0.15 * tk, W.ry, 0);
  if (t > 10.4 && !W.sp1) { W.sp1 = true; splash(W.tail.position.x, W.wy, W.tail.position.z, 5); }
  if (t > 13.5) { [W.back, W.tail, W.sp].forEach(o => scene.remove(o)); whale = null; }
}

/* ================= 貓 ================= */
const CATS = [
  { id: 'orange', model: 'cat_orange', color: '#e8a060', home: [0, 10.5], range: 9 },   // 廣場一帶（大樹、長椅、噴泉）
  { id: 'tux', model: 'cat_tux', color: '#3a3a44', home: [-4, 34], range: 8 }   // 城門到碼頭
];
const cats = [];
function catName(c) { return ((L8().cats || {}).names || {})[c.id] || (c.id === 'orange' ? '橘子' : '墨墨'); }
function makeCats() {
  CATS.forEach(def => {
    const [hx, hz] = warp(def.home[0], def.home[1]), s = nav.snap(hx, hz, 4) || [hx, hz];
    const inner = model(def.model, def.color, 0.42), m = new THREE.Group(); m.add(inner);   // 外層管位置與朝向，內層管坐下、趴下的身體傾斜
    m.position.set(s[0], ctx.ground(s[0], s[1]), s[1]); scene.add(m);
    const P = n => inner.getObjectByName(n);
    cats.push({ def, m, inner, home: s, state: 'sit', t: rnd(4, 10), route: null, ri: 0, look: 0,
      head: P('head'), tail: P('tail'), tail2: P('tail2'), legs: ['legFL', 'legFR', 'legBL', 'legBR'].map(P), eyesO: P('eyesOpen'), eyesC: P('eyesClosed'), walkT: 0, peek: 0 });
  });
}
function catGo(c) {
  for (let k = 0; k < 6; k++) {
    const a = Math.random() * Math.PI * 2, d = rnd(2, c.def.range), x = c.home[0] + Math.cos(a) * d, z = c.home[1] + Math.sin(a) * d;
    const r = nav.path(c.m.position.x, c.m.position.z, x, z, 6000);
    if (r && nav.lengthOf(c.m.position.x, c.m.position.z, r) < c.def.range * 2.2) { c.route = r; c.ri = 0; c.state = 'walk'; return true; }
  }
  return false;
}
function catTick(c, dt, t) {
  const m = c.m, p = ctx.player.position, dp = Math.hypot(p.x - m.position.x, p.z - m.position.z), h = ctx.hour(), night = h >= 21 || h < 6;
  c.t -= dt;
  if (c.state === 'walk') {
    const q = c.route && c.route[c.ri];
    if (!q || dp < 0.9) { c.state = 'sit'; c.t = rnd(5, 12); }   // 走到了，或玩家擋在前面：坐下來
    else {
      const dx = q[0] - m.position.x, dz = q[1] - m.position.z, d = Math.hypot(dx, dz);
      if (d < 0.2) c.ri++;
      else { const sp = 0.65 * dt; m.position.x += dx / d * Math.min(sp, d); m.position.z += dz / d * Math.min(sp, d); m.rotation.y += (((Math.atan2(dx, dz) - m.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 5); }
      c.walkT += dt * 9;
    }
  } else if (c.t <= 0) {
    if (c.state === 'sleep' && !night && Math.random() < 0.5) { c.state = 'sit'; c.t = rnd(4, 9); }
    else if (night || (h >= 12 && h < 15 && Math.random() < 0.4)) { c.state = 'sleep'; c.t = rnd(30, 70); }   // 夜裡和午後的太陽下打盹
    else if (Math.random() < 0.65 && catGo(c)) { /* 走走 */ }
    else { c.state = 'sit'; c.t = rnd(6, 14); }
  }
  m.position.y += (ctx.ground(m.position.x, m.position.z) - m.position.y) * Math.min(1, dt * 10);
  // 姿勢：走路四腳交替；坐著後腳收起、身體抬高；睡覺四腳收在身體底下、閉眼
  const walk = c.state === 'walk', sleep = c.state === 'sleep', sit = c.state === 'sit';
  c.k = c.k || { sit: 0, sleep: 0 }; c.k.sit += ((sit ? 1 : 0) - c.k.sit) * Math.min(1, dt * 4); c.k.sleep += ((sleep ? 1 : 0) - c.k.sleep) * Math.min(1, dt * 3);
  const sw = walk ? Math.sin(c.walkT) * 0.55 : 0;
  if (c.legs[0]) c.legs[0].rotation.x = sw - c.k.sleep * 1.3; if (c.legs[1]) c.legs[1].rotation.x = -sw - c.k.sleep * 1.3;
  if (c.legs[2]) c.legs[2].rotation.x = -sw + c.k.sit * 1.25 + c.k.sleep * 1.3; if (c.legs[3]) c.legs[3].rotation.x = sw + c.k.sit * 1.25 + c.k.sleep * 1.3;
  c.inner.rotation.x = -0.28 * c.k.sit; c.inner.position.y = -0.06 * c.k.sit - 0.13 * c.k.sleep;
  if (c.tail) c.tail.rotation.y = Math.sin(t * (sleep ? 0.8 : 2.2) + c.def.home[0]) * (sleep ? 0.12 : 0.35);
  if (c.tail2) c.tail2.rotation.y = Math.sin(t * 2.2 + 0.8) * 0.3 * (1 - c.k.sleep);
  const closed = sleep || c.peek > 0; if (c.eyesO) c.eyesO.visible = !closed; if (c.eyesC) c.eyesC.visible = closed;
  if (c.peek > 0) c.peek -= dt;
  if (c.head) { const want = dp < 4 && !sleep ? THREE.MathUtils.clamp(((Math.atan2(p.x - m.position.x, p.z - m.position.z) - m.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -0.9, 0.9) : 0; c.look += (want - c.look) * Math.min(1, dt * 4); c.head.rotation.y = c.look; c.head.rotation.x = 0.25 * c.k.sleep; }
  // 島民經過時偶爾停下來看貓
  if (!sleep && t > (c.tutorAt || 0)) {
    const v = ctx.villagers.find(o => !o.away && !o.shop && !o.busyRt && !o.chatting && !o.sitting && !o.goPlayer && ctx.talking() !== o && Math.hypot(o.mesh.position.x - m.position.x, o.mesh.position.z - m.position.z) < 2.6);
    if (v) {
      c.tutorAt = t + rnd(60, 120);
      const lines = ((L8().cats || {}).tutor || {})[v.sid];
      if (lines && lines.length && Math.random() < 0.6) { v.faceTo = { mesh: m }; v.wait = Math.max(v.wait || 0, 4); v.target = [v.mesh.position.x, v.mesh.position.z]; ui.bubble(v.mesh, pick(lines).replace(/\{cat\}/g, catName(c.def)), 3000); setExpr(v.mesh, 'happy', 2); setTimeout(() => { if (v.faceTo && v.faceTo.mesh === m) v.faceTo = null; }, 4000); }
    }
  }
}
/** 靠近的貓（1.4 公尺內）；提示與互動用 */
function nearCat() { const p = ctx.player.position; return cats.find(c => Math.hypot(p.x - c.m.position.x, p.z - c.m.position.z) < 1.4 && Math.abs(p.y - c.m.position.y) < 0.8) || null; }
export function hint() { if (!ctx) return ''; const c = nearCat(); return c ? `摸摸${catName(c.def)}` : ''; }
export function handler() {
  const c = nearCat(); if (!c) return null;
  return async () => {
    const name = catName(c.def), lines = (L8().cats || {}).pet || ['{cat}瞇起眼睛，喉嚨咕嚕咕嚕響。'];
    if (c.state === 'walk') { c.state = 'sit'; c.t = rnd(8, 14); }
    const p = ctx.player.position; c.m.rotation.y = Math.atan2(p.x - c.m.position.x, p.z - c.m.position.z); c.peek = 2.2; c.t = Math.max(c.t, 6);
    ui.emote(c.m, '💕', '#ff8fa3'); Audio.sfx('pop'); setExpr(ctx.player, 'happy', 2);
    ui.toast(pick(lines).replace(/\{cat\}/g, name));
    const s = S(); s.cats = s.cats || {}; const first = !s.cats[c.def.id]; s.cats[c.def.id] = (s.cats[c.def.id] || 0) + 1; save();
    if (first) memo.add(`認識了島上的貓「${name}」`, c.def.id === 'orange' ? '橘色的，最喜歡在廣場曬太陽' : '黑白相間，常在碼頭附近散步', { key: 'cat:' + c.def.id, icon: '🐈' });
  };
}

/* ================= 主迴圈 ================= */
export function init(c) { ctx = c; }
let started = false;
export function update(dt, t) {
  if (!ctx) return;
  if (!started) { started = true; makeCats(); }
  fishTick(dt); podTick(dt); whaleTick(dt);
  cats.forEach(c => catTick(c, dt, t));
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const k = f.t / f.life; f.mesh.scale.setScalar(f.size * (0.3 + k * 1.1)); f.mesh.material.opacity = 0.7 * (1 - k); if (k >= 1) { scene.remove(f.mesh); f.mesh.material.dispose(); fx.splice(i, 1); } }
}
/** 主島以外的場景（室內、神秘島、夢境島）時藏起來 */
export function setVisible(on) { cats.forEach(c => { c.m.visible = on; }); }
