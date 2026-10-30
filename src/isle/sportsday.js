/* 潮汐小島 · 島嶼運動會（v9.4.1）：每週日 9:00–16:00（下雨、颱風延期），城門東邊的活動草地（週六晚上是夜市）擺出跑道、裁判帳篷、計分板與頒獎台。
   隔壁島的兩位選手來比賽，找裁判報名三個項目，都和物理有關（題目在 sportq.js）：
   短跑——賽前答兩題運動學（答對越多，起跑加速度與極速越高），三人照 x(t)：先等加速度、到極速後等速，一起跑 10 公尺，跑完用這場的數據再算一題；
   擲沙包——選仰角與力道把沙包丟進呼拉圈（R = v² · sin 2θ ÷ g），沙包照拋物線飛；拔河——和一位選手一對一，五題力學快問，答對旗子往我方移，最後說明贏的關鍵是地面的摩擦力。
   每個項目每週日一條緞帶（金：第一名、進圈、拔河贏；藍：完賽），三條都拿到換一面獎牌，第 1、3、5 面再送運動會家具。
   比賽時鏡頭換成第三人稱、從南邊側面看（賽道東西向）。文字在 data/sportsday.js，模型在 data/sportmodels.js（Codex 製作）。
   紀錄：S().sd = { day, done: { run, throw, tug }, results, medals, best: { run }, greeted, letter } */
import * as THREE from 'three';
import { scene, M } from './engine.js';
import { groundAt } from './terrain.js';
import { colliders, seats, modelClone, hideFlowers } from './props.js';
import * as grass from './grass.js';
import { register, unregister } from './props3d.js';
import { chibi, nameMesh, animate, lookAt, clap } from './chars.js';
import { label, words } from './works.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, practiced } from './state.js';
import { runQ, throwQ, TUG, afterRun, runTime, runAt, range, bagAt, flight } from './sportq.js';
import * as miles from './miles.js';
import * as social from './social.js';
import * as memo from './memo.js';
import * as weather from './weather.js';

const TA = window.TA, L = TA.L;
export const OPEN = 9, CLOSE = 16, EVENTS = ['run', 'throw', 'tug'];
/* 場地（世界座標）：跑道東西向，三條 z = 32.2、33.2、34.2，起點 x = 2.4、終點 x = 12.4（10 公尺）；拔河繩在南邊 z = 35.75 */
export const LANES = [32.2, 33.2, 34.2], START = 2.4, FINISH = 12.4, DIST = FINISH - START;
const ARCH = [1.0, 33.0, Math.PI / 2], TENT = [5.6, 30.4, Math.PI], BOARD = [10.6, 30.3, Math.PI], PODIUM = [13.9, 33.2, Math.PI / 2], MAT = [START - 0.5, 33.2, -Math.PI / 2], BENCH = [2.9, 30.5, Math.PI];
const CONES = [4, 6, 8, 10], CONE_Z = 34.85, TUG_Z = 35.75, TUG_MID = 11.3, TUG_STEP = 0.35, SIDE = [[3.0, 31.6], [3.9, 31.6]];   // SIDE：選手沒比賽時站的位置（帳篷西邊）
const WARM = [[3.4, 35.3], [4.5, 35.4], [5.6, 35.3], [6.7, 35.4]];   // 導師熱身的位置（跑道南邊）
const POWER = [['輕輕丟', 6], ['中等力道', 8], ['用力丟', 10]], ANGLES = [30, 45, 60];
const CAM = [0, 0.05], RACE_CAM = [Math.PI, 0.25], MID = [(START + FINISH) / 2, 33.4];   // 鏡頭：報名時從南邊看帳篷；比賽時從北邊稍高處看著場地中央（跑道南邊有樹，背景是海）
let ctx = null, B = null, checkT = 0, forced = null, run = null, toss = null, tug = null, busy = false, pose = null, bloom = null;
/** 擺場時跑道、投擲區與拔河的地上不長草、不開花（收場後長回來） */
const field = (x, z) => (x > 1.2 && x < 12.9 && z > 31.65 && z < 34.75) || (x > 8.3 && x < 13.5 && z > 35.3 && z < 36.2);

const D = () => I.SPORTSDAY || {};
const REF = () => Object.assign({ name: '裁判', color: '#4f8fd6', look: {}, greet: ['歡迎來參加島嶼運動會！'], pick: ['想比哪一項？'], cheer: ['加油！'], bye: ['下次再來！'], rain: ['今天下雨，運動會延期。'] }, D().referee);
const ATH = () => (D().athletes && D().athletes.length >= 2 ? D().athletes : [{ id: 'fei', name: '阿飛', color: '#e8875b', look: {}, intro: ['你好！'], win: ['我贏了！'], lose: ['你好快！'], tug: ['拉！'] }, { id: 'ning', name: '小寧', color: '#5b8ee8', look: {}, intro: ['請多指教。'], win: ['承讓。'], lose: ['佩服。'], tug: ['穩住！'] }]);
const EV = k => Object.assign({ name: k, intro: [''], ready: ['預備——'], first: ['第一名！'], other: ['下次再來！'], far: ['好遠！'], short: ['再試一次！'], win: ['我們贏了！'], lose: ['差一點！'], why: '' }, (D().events || {})[k]);
const sp = o => ({ name: o.name, color: o.color, voice: 380 });
const ME = { name: '你', color: '#7cc7ff' };
const one = a => (a && a.length ? a[Math.floor(Math.random() * a.length)] : '');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fix = v => String(Math.round(v * 100) / 100);
/** 除錯：強制開辦（true）、收場（false）或照時間（null） */
export const force = v => { forced = v; checkT = 0; };
export function isOpen() {
  if (forced != null) return forced;
  const d = ctx.date(), h = d.getHours() + d.getMinutes() / 60;
  return d.getDay() === 0 && h >= OPEN && h < CLOSE && !weather.typhoon(d) && !weather.raining();
}
function rec() {
  const s = S(), n = s.sd = s.sd || { medals: 0, best: {} };
  if (isOpen() && n.day !== ymd(ctx.date())) Object.assign(n, { day: ymd(ctx.date()), done: {}, results: {} });
  n.done = n.done || {}; n.results = n.results || {}; n.best = n.best || {};
  return n;
}
/** 玩家比賽中的動作（main.js 用來播放跑步）：[moving, rate]，沒在比賽是 null */
export const playerPose = () => pose;

/* ---------- 擺場地與收場 ---------- */
const local = (x, z, ry, lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
function mark(g, name) { const o = g && g.getObjectByName(name); if (!o) return null; const p = new THREE.Vector3(); o.getWorldPosition(p); const q = new THREE.Quaternion(); o.getWorldQuaternion(q); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ'); return { x: p.x, y: p.y, z: p.z, ry: e.y }; }
function place(key, x, z, ry, dress) {
  const g = modelClone('SPORTMODELS', key); if (!g) return null;
  g.position.set(x, groundAt(x, z), z); g.rotation.y = ry; g.updateMatrixWorld(true);
  if (dress) dress(g);
  B.g.add(g); g.updateMatrixWorld(true); register(g); B.parts.push(g); return g;
}
const ring = (x, z, r) => { const o = { x, z, r }; colliders.push(o); B.cols.push(o); };
const box = (x0, z0, x1, z1) => { const o = { x0, z0, x1, z1 }; colliders.push(o); B.cols.push(o); };
function npc(o, x, z, ry) { const ch = chibi(Object.assign({ kind: 'human', shirt: '#7fb2e5', pants: '#3f4f6a', hair: '#3a2a22', shoe: '#f2f2f2' }, o.look)); ch.position.set(x, groundAt(x, z), z); ch.rotation.y = ry; ch.traverse(m => { m.frustumCulled = false; }); B.g.add(ch); nameMesh(o.name, ch); B.npcs.push(ch); return ch; }
/** 地上的線（跑道分隔線、起點、終點） */
function stripe(x0, z0, x1, z1, color = '#ffffff') { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), M(color, { roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, groundAt((x0 + x1) / 2, (z0 + z1) / 2) + 0.025, (z0 + z1) / 2); m.receiveShadow = true; B.g.add(m); B.extra.push(m); }
/** 彩色三角旗串：兩點之間一條微微下垂的繩子，掛著紅黃藍白綠的小三角旗 */
let flagGeo = null;
function pennants(a, b) {
  const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * 0.3, a[2] + (b[2] - a[2]) * k)); }
  const curve = new THREE.CatmullRomCurve3(pts), cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.008, 4, false), M('#f4efe6')); B.g.add(cord); B.extra.push(cord);
  if (!flagGeo) { flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.09, 0, 0, 0.09, 0, 0, 0, -0.2, 0], 3)); flagGeo.computeVertexNormals(); }
  const n = Math.max(4, Math.round(curve.getLength() / 0.32)), im = new THREE.InstancedMesh(flagGeo, M('#ffffff', { side: THREE.DoubleSide, roughness: 0.9 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), cols = ['#e86f5e', '#f5c94c', '#5b9be0', '#ffffff', '#7cc58a'], up = new THREE.Vector3(0, 1, 0), one3 = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) { const p = curve.getPoint((i + 0.5) / n), tg = curve.getTangent((i + 0.5) / n); q.setFromAxisAngle(up, Math.atan2(-tg.z, tg.x)); m4.compose(p, q, one3); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(cols[i % cols.length])); }
  im.frustumCulled = false; B.g.add(im); B.extra.push(im);
}
function build() {
  B = { g: new THREE.Group(), parts: [], cols: [], seats: [], npcs: [], extra: [], board: null, ath: [], ref: null, front: null, tugFlag: null, rope: null, ropeY: 0, hoop: null, bag: null };
  B.g.name = 'sports-day'; scene.add(B.g); grass.refreshSoon(); bloom = hideFlowers(field);
  // 跑道：三條跑道的分隔線、起點（白）與終點（紅）
  [LANES[0] - 0.5, LANES[0] + 0.5, LANES[1] + 0.5, LANES[2] + 0.5].forEach(z => stripe(START - 0.2, z - 0.025, FINISH + 0.4, z + 0.025));
  stripe(START - 0.05, LANES[0] - 0.5, START + 0.05, LANES[2] + 0.5); stripe(FINISH - 0.06, LANES[0] - 0.5, FINISH + 0.06, LANES[2] + 0.5, '#e86f5e');
  { const [x, z, ry] = ARCH; const g = place('sd_arch', x, z, ry, m => label(m, 'sign', (c, w, h) => words(c, w, h, '#fff6e6', '#3f6fae', [[D().sign || '島嶼運動會', 0.6, 0.53]]), 512)); if (g) [-1.8, 1.8].forEach(lx => { const [px, pz] = local(x, z, ry, lx, 0); ring(px, pz, 0.2); }); }
  { const [x, z, ry] = TENT; const g = place('sd_tent', x, z, ry, m => label(m, 'sign', (c, w, h) => words(c, w, h, '#ffffff', '#3f6fae', [['報名處', 0.7, 0.55]]), 384));
    if (g) { box(x - 1.0, z - 0.7, x + 1.0, z + 0.4); const r = mark(g, 'referee'), f = mark(g, 'front'); if (r) B.ref = npc(REF(), r.x, r.z, r.ry + Math.PI); B.front = f ? { x: f.x, z: f.z } : { x, z: z + 1.25 }; } }
  { const [x, z, ry] = BOARD; const g = place('sd_board', x, z, ry, m => { B.board = label(m, 'board', () => {}, 512); }); if (g) ring(x, z, 0.5); paintBoard(); }
  { const [x, z, ry] = PODIUM; if (place('sd_podium', x, z, ry)) box(x - 0.45, z - 0.95, x + 0.45, z + 0.95); }
  { const [x, z, ry] = MAT; place('sd_mat', x, z, ry); }
  { const [x, z, ry] = BENCH; const g = place('sd_bench', x, z, ry); if (g) { ring(x, z, 0.5); ['seat_0', 'seat_1'].forEach(n => { const m = mark(g, n); if (m) { const st = { x: m.x, z: m.z, ry: m.ry + Math.PI, h: m.y, n: 1, sd: true }; seats.push(st); B.seats.push(st); } }); } }
  CONES.forEach(d => place('sd_cone', START + d, CONE_Z, Math.PI, m => label(m, 'plate', (c, w, h) => words(c, w, h, '#ffffff', '#c4532f', [[`${d} m`, 0.7, 0.55]]), 128)));
  // 拔河繩：一條粗麻繩，中間綁紅旗
  { const y = groundAt(TUG_MID, TUG_Z) + 0.85; B.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.6, 6), M('#c9a46a', { roughness: 1 })); B.rope.rotation.z = Math.PI / 2; B.rope.position.set(TUG_MID, y, TUG_Z); B.g.add(B.rope); B.extra.push(B.rope); B.ropeY = y;
    const f = modelClone('SPORTMODELS', 'sd_tugflag'); if (f) { f.position.set(TUG_MID, groundAt(TUG_MID, TUG_Z), TUG_Z); B.g.add(f); B.tugFlag = f; } }
  // 旗串：拱門到帳篷、帳篷到計分板
  pennants([1.0, groundAt(1, 31.2) + 3.0, 31.2], [4.6, groundAt(4.6, 29.4) + 2.35, 31.3]); pennants([6.6, groundAt(6.6, 31.3) + 2.35, 31.3], [9.8, groundAt(9.8, 30.3) + 1.6, 30.3]);
  // 隔壁島的兩位選手：沒比賽時站在帳篷西邊
  ATH().slice(0, 2).forEach((a, i) => B.ath.push(npc(a, SIDE[i][0], SIDE[i][1], 0)));
  // 擲沙包用的沙包與呼拉圈（要用時才出現）
  B.bag = modelClone('SPORTMODELS', 'sd_bag'); if (B.bag) { B.bag.visible = false; B.g.add(B.bag); }
  B.hoop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 24), M('#f08a3c', { roughness: 0.7 })); B.hoop.rotation.x = -Math.PI / 2; B.hoop.visible = false; B.g.add(B.hoop); B.extra.push(B.hoop);
}
function destroy() {
  if (!B) return;
  B.cols.forEach(c => { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); });
  B.seats.forEach(st => { const i = seats.indexOf(st); if (i >= 0) seats.splice(i, 1); });
  B.parts.forEach(g => unregister(g));
  B.extra.forEach(o => o.geometry && o.geometry !== flagGeo && o.geometry.dispose());
  scene.remove(B.g); B = null; run = toss = tug = pose = null; grass.refreshSoon(); if (bloom) bloom(); bloom = null;
}
/** 計分板：今天三個項目的成績 */
function paintBoard() {
  if (!B || !B.board) return;
  const n = S().sd || {}, R = ctx && n.day === ymd(ctx.date()) ? n.results || {} : {};
  B.board.draw((c, w, h) => {
    c.fillStyle = '#244a6b'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${Math.round(h * 0.15)}px "Microsoft JhengHei", sans-serif`; c.fillText('島嶼運動會 今日成績', w / 2, h * 0.16, w * 0.92);
    c.font = `700 ${Math.round(h * 0.12)}px "Microsoft JhengHei", sans-serif`;
    [['短跑', R.run], ['擲沙包', R.throw], ['拔河', R.tug]].forEach(([k, v], i) => { c.textAlign = 'left'; c.fillText(k, w * 0.07, h * (0.42 + i * 0.2)); c.textAlign = 'right'; c.fillText(v || '—', w * 0.93, h * (0.42 + i * 0.2), w * 0.6); });
  });
}

/* ---------- 每一格 ---------- */
export function init(c) {
  ctx = c; grass.clearArea((x, z) => !!B && field(x, z));
  const s = S(); s.sd = s.sd || { medals: 0, best: {} };
  if (!s.sd.letter && D().letter) { const l = D().letter; s.sd.letter = 1; social.sendLetter({ from: l.from || 'physics', title: l.title, open: l.open, text: l.text, close: l.close }); save(); }   // 第一次玩到 v9.4.1：物理導師寄信介紹運動會
}
export function update(dt, t) {
  if (!ctx) return;
  if ((checkT -= dt) <= 0) {
    checkT = 1; const on = isOpen();
    if (on && !B) { build(); if (ctx.started && ctx.started() && forced == null) { Audio.sfx('whistle'); ui.toast('🏃 島嶼運動會開始了！城門東邊的活動草地，到下午 4 點'); } }
    else if (!on && B && !busy) destroy();   // 收場時正在比賽：比完再收
  }
  if (!B) return;
  B.npcs.forEach(ch => { if (!ch.userData.sdBusy) animate(ch, dt, 0, t); });
  if (run) raceTick(dt, t);
  if (toss) tossTick(dt);
  if (tug) tugTick(dt, t);
}
const focus = p => { if (ctx.focus) ctx.focus(p, ...(p ? RACE_CAM : CAM)); };
const nearRef = (px, pz) => !!(B && B.front && Math.hypot(px - B.front.x, pz - B.front.z) < 1.4);
export function hint(px, pz) { return nearRef(px, pz) ? '找裁判報名比賽' : ''; }
export function act(px, pz) { if (!nearRef(px, pz) || busy) return false; busy = true; ctx.busy(() => visit().finally(() => { busy = false; })); return true; }

/* ---------- 報名 ---------- */
async function visit() {
  const n = rec(), R = REF(), p = ctx.player, back = ctx.view ? ctx.view(CAM[0], CAM[1]) : null;   // 鏡頭換成第三人稱、從南邊看帳篷
  let card = false;
  if (p && B.front) { p.position.set(B.front.x, groundAt(B.front.x, B.front.z), B.front.z); p.rotation.set(0, Math.PI, 0); }   // 站到帳篷前、面向裁判
  if (B.ref && p) lookAt(B.ref, p.position.clone().setY(p.position.y + 1.1));
  try {
    if (!n.greeted) { n.greeted = 1; save(); await ui.say(sp(R), one(R.greet)); for (const a of ATH()) await ui.say(sp(a), one(a.intro)); }
    for (;;) {
      const left = EVENTS.filter(k => !n.done[k]), opts = EVENTS.map(k => `${EV(k).name}${n.done[k] === 'gold' ? '（金緞帶 ✓）' : n.done[k] ? '（藍緞帶 ✓）' : ''}`).concat(['今天的紀錄', '先不用了']);
      const i = await ui.ask(sp(R), left.length ? one(R.pick) : '三個項目都比完了！想再比一次拿金緞帶也可以。', opts);
      if (i == null || i < 0 || i >= EVENTS.length + 1) break;
      if (i === EVENTS.length) { card = true; break; }
      const k = EVENTS[i];
      try { if (k === 'run') await raceEvent(); else if (k === 'throw') await throwEvent(); else await tugEvent(); } finally { home(); }
      if (!B) break;
    }
    await ui.say(sp(R), one(R.bye));
  } finally { if (B && B.ref) lookAt(B.ref, null); if (back) back(); }
  if (card) openCard();
}
/** 比完：選手回到帳篷西邊、繩子回到中間、玩家回到帳篷前站直 */
function home() {
  run = toss = tug = pose = null; focus(null);
  const p = ctx.player; if (p) { p.rotation.set(0, p.rotation.y, 0); if (B && B.front) { p.position.set(B.front.x, groundAt(B.front.x, B.front.z), B.front.z); p.rotation.set(0, Math.PI, 0); } }
  if (!B) return;
  B.ath.forEach((ch, i) => { ch.userData.sdBusy = false; ch.rotation.set(0, 0, 0); ch.position.set(SIDE[i][0], groundAt(SIDE[i][0], SIDE[i][1]), SIDE[i][1]); });
  if (B.rope) B.rope.position.x = TUG_MID; if (B.tugFlag) B.tugFlag.position.x = TUG_MID;
  if (B.hoop) B.hoop.visible = false; if (B.bag) B.bag.visible = false;
}
async function ribbon(k, gold, result) {
  const n = rec(), had = n.done[k], s = S();
  if (gold || had !== 'gold') n.results[k] = result;   // 已經拿金緞帶的項目：再比一次沒拿到金，計分板留著拿金的那次
  if (had !== 'gold') n.done[k] = gold ? 'gold' : 'blue';
  if (!had) { L.gain(15, 0); if (gold) s.bells += 500; Audio.sfx(gold ? 'levelup' : 'coin'); ui.toast(`🎗 ${EV(k).name}：${gold ? '金緞帶（+500 鈴錢）' : '藍緞帶'}`); if (!EVENTS.some(x => x !== k && n.done[x])) miles.add('puzzle'); }
  else if (gold && had === 'blue') { s.bells += 500; Audio.sfx('levelup'); ui.toast(`🎗 ${EV(k).name}：換成金緞帶了！（+500 鈴錢）`); }
  save(); paintBoard(); if (ctx.paint) ctx.paint();
  if (!had && EVENTS.every(x => n.done[x])) await medal();
}
async function medal() {
  const n = rec(), s = S(); n.medals = (n.medals || 0) + 1; s.bells += 1000; save(); TA.Store.save(); Audio.sfx('levelup');
  ui.toast(`🏅 ${one((D().card || {}).medal) || '三條緞帶都拿到了！'}（獎牌 +1、+1,000 鈴錢）`);
  memo.add('島嶼運動會的獎牌', `短跑、擲沙包、拔河三條緞帶都拿到了（第 ${n.medals} 面獎牌）。`, { key: 'sd:medal:' + n.day, icon: '🏅' });
  const f = (D().prizes || [])[[1, 3, 5].indexOf(n.medals)];
  if (f && ctx.giveFurn) await ctx.giveFurn(f.id, `島嶼運動會第 ${n.medals} 面獎牌的紀念`);
}
/** 問一題（題目物件見 sportq.js），回傳答對與否；擲沙包的題目記在「拋射實驗」，其他記在運動會 */
async function quiz(who, q, lead, game) {
  const i = await ui.ask(sp(who), lead + q.text, q.opts, { html: true, keys: true, quiz: true, answer: q.a });
  const ok = i === q.a; Audio.sfx(ok ? 'ok' : 'bad'); practiced(game, ok ? 1 : 0, 1);
  await ui.say(sp(who), `${ok ? '答對了！' : `答案是 ${q.opts[q.a]}。`}${q.why}`, { html: true });
  return ok;
}

/* ---------- 短跑 ---------- */
async function raceEvent() {
  const R = REF(), E = EV('run'), p = ctx.player, A = ATH();
  await ui.say(sp(R), one(E.intro));
  let k = 0; const kinds = new Set();
  for (let i = 0; i < 2; i++) { let q; do q = runQ(); while (kinds.has(q.kind)); kinds.add(q.kind); if (await quiz(R, q, `第 ${i + 1} 題：`, 'sports')) k++; }
  const me = { mesh: p, acc: 2.2 + 0.6 * k, top: 4.6 + 0.4 * k, z: LANES[1], name: '你', me: true };
  const rivals = [{ acc: 3.0, top: 5.0 }, { acc: 2.4, top: 5.3 }].map((o, i) => ({ mesh: B.ath[i], acc: o.acc + (Math.random() - 0.5) * 0.2, top: o.top + (Math.random() - 0.5) * 0.15, z: LANES[i ? 2 : 0], name: A[i].name, who: A[i] }));
  const all = [me].concat(rivals.filter(r => r.mesh));
  all.forEach(r => { r.T = runTime(r.acc, r.top, DIST); r.mesh.position.set(START, groundAt(START, r.z), r.z); r.mesh.rotation.set(0, Math.PI / 2, 0); r.mesh.userData.sdBusy = !r.me; });   // 三人站上起跑線、面向東（+X）
  focus(MID);
  await ui.say(sp(R), `${k ? `答對 ${k} 題：你的起跑加速度 ${fix(me.acc)} m/s²、最快 ${fix(me.top)} m/s。` : '這次起跑會慢一點，沒關係，跑起來就知道了。'}<br>${one(E.ready)}`, { html: true });
  ui.closeDialog(); Audio.sfx('whistle');
  await new Promise(done => { run = { t: 0, all, done }; });
  const order = all.slice().sort((a, b) => a.T - b.T), place = order.indexOf(me) + 1, n = rec();
  n.best.run = Math.min(n.best.run || 99, me.T); save();
  await ui.say(sp(R), `${order.map((r, i) => `第 ${i + 1} 名 ${r.name} ${fix(r.T)} 秒`).join('，')}。<br>${place === 1 ? one(E.first) : one(E.other)}`, { html: true });
  const top = order[0] === me ? order[1] : order[0]; if (top && top.who) await ui.say(sp(top.who), one(place === 1 ? top.who.lose : top.who.win));
  const ri = order.find(r => !r.me) || me;
  await quiz(R, afterRun(ri.name, DIST, ri.T, ri.top, Math.random), '用剛才的比賽算一題：', 'sports');
  await ribbon('run', place === 1, `${fix(me.T)} 秒（第 ${place} 名）`);
}
function raceTick(dt, t) {
  run.t += dt; let fin = true;
  run.all.forEach(r => {
    const tt = Math.min(run.t, r.T), x = START + runAt(r.acc, r.top, tt), going = run.t < r.T, v = tt < r.top / r.acc ? r.acc * tt : r.top, rate = 0.55 + 0.65 * v / r.top;   // 步伐跟著當下的速率加快
    r.mesh.position.set(x, groundAt(x, r.z), r.z); r.mesh.rotation.set(0, Math.PI / 2, 0);
    if (r.me) pose = going ? [2, rate] : null; else animate(r.mesh, dt, going ? 2 : 0, t, going ? rate : 1);
    if (run.t < r.T + 0.8) fin = false;
  });
  if (fin) { const d = run.done; run = null; pose = null; d(); }
}

/* ---------- 擲沙包 ---------- */
const TARGETS = [[6, 30], [6, 45], [8, 30], [8, 45], [10, 30], [10, 45]];   // 呼拉圈放在這些組合的射程（60° 和 30° 射程一樣）
async function throwEvent() {
  const R = REF(), E = EV('throw'), p = ctx.player;
  await ui.say(sp(R), one(E.intro));
  await quiz(R, throwQ(), '先暖身一題：', 'throw');
  const [tv, td] = TARGETS[Math.floor(Math.random() * TARGETS.length)], X = Math.round(range(tv, td) * 10) / 10, x0 = START;
  B.hoop.position.set(x0 + X, groundAt(x0 + X, LANES[1]) + 0.04, LANES[1]); B.hoop.visible = true; focus(MID);
  p.position.set(x0, groundAt(x0, LANES[1]), LANES[1]); p.rotation.set(0, Math.PI / 2, 0);
  let hit = false, best = null;
  for (let tries = 1; tries <= 3 && !hit; tries++) {
    const ai = await ui.ask(sp(R), `呼拉圈在 ${X} 公尺外（第 ${tries} / 3 次）。仰角要多少？<br>R = v² · sin 2θ ÷ g，g = 9.8 m/s²；力道：輕 6、中 8、重 10 m/s`, ANGLES.map(a => `${a}°`), { html: true, keys: true });
    if (ai == null || ai < 0 || ai >= ANGLES.length) break;
    const pi = await ui.ask(sp(R), `仰角 ${ANGLES[ai]}°。力道呢？`, POWER.map(([k, v]) => `${k}（${v} m/s）`), { keys: true });
    if (pi == null || pi < 0 || pi >= POWER.length) break;
    const v = POWER[pi][1], deg = ANGLES[ai], Rr = range(v, deg); ui.closeDialog(); Audio.sfx('swish');
    await new Promise(done => { toss = { t: 0, v, deg, x0, z: LANES[1], T: flight(v, deg), done }; });
    hit = Math.abs(Rr - X) <= 0.4; if (best == null || Math.abs(Rr - X) < Math.abs(best - X)) best = Rr;
    Audio.sfx(hit ? 'catch' : 'plop');
    await ui.say(sp(R), `${hit ? `進圈了！${one(E.far)}` : `落在 ${Rr.toFixed(1)} 公尺，${Rr < X ? '短了' : '遠了'} ${Math.abs(Rr - X).toFixed(1)} 公尺。${tries < 3 ? one(E.short) : ''}`}<br>R = ${v}² × sin ${2 * deg}° ÷ 9.8 ≈ ${Rr.toFixed(1)} m${deg !== 45 ? `（${deg}° 和 ${90 - deg}° 加起來 90°，射程一樣）` : ''}`, { html: true });
  }
  await ribbon('throw', hit, hit ? `進圈（${X} m）` : best == null ? '沒有丟' : `差 ${Math.abs(best - X).toFixed(1)} m`);
}
function tossTick(dt) {
  toss.t += dt; const t = Math.min(toss.t, toss.T), [dx, dy] = bagAt(toss.v, toss.deg, t), x = toss.x0 + dx, y0 = groundAt(toss.x0, toss.z) + 1.0;
  if (B.bag) { B.bag.visible = true; B.bag.position.set(x, Math.max(groundAt(x, toss.z), y0 + dy - (t / toss.T) * 1.0), toss.z); if (toss.t < toss.T) B.bag.rotation.z = -t * 6; }   // 從手上（離地約 1 公尺）出手、落回地面（射程照同高起落的公式）
  if (toss.t >= toss.T + 0.6) { const d = toss.done; toss = null; d(); }
}

/* ---------- 拔河 ---------- */
async function tugEvent() {
  const R = REF(), E = EV('tug'), p = ctx.player, A = ATH(), oi = Math.random() < 0.5 ? 0 : 1, foe = A[oi], fm = B.ath[oi], fan = B.ath[1 - oi];
  await ui.say(sp(R), one(E.intro));
  // 站位：玩家在西端、對手在東端，都握著繩子；另一位選手站在繩子南邊看旗子（面向北邊的鏡頭）
  p.position.set(TUG_MID - 2.0, groundAt(TUG_MID - 2.0, TUG_Z), TUG_Z); p.rotation.set(0, Math.PI / 2, 0); focus([TUG_MID - 2.2, TUG_Z - 2.4]);   // 鏡頭看著拔河的西北邊：拔河落在畫面左上，不被題目和選項擋住
  if (fm) { fm.userData.sdBusy = true; fm.position.set(TUG_MID + 2.0, groundAt(TUG_MID + 2.0, TUG_Z), TUG_Z); fm.rotation.set(0, -Math.PI / 2, 0); }
  if (fan) { fan.position.set(TUG_MID + 0.3, groundAt(TUG_MID + 0.3, TUG_Z + 1.1), TUG_Z + 1.1); fan.rotation.set(0, Math.PI, 0); }
  tug = { off: 0, want: 0, lean: 0, fm };
  let score = 0; const kinds = Object.keys(TUG).sort(() => Math.random() - 0.5);
  for (let i = 0; i < 5; i++) {
    const ok = await quiz(R, TUG[kinds[i % kinds.length]](Math.random), `第 ${i + 1} / 5 題：`, 'sports');
    score += ok ? 1 : -1; tug.want = -TUG_STEP * score;   // 答對：旗子往我方（西邊）移一小段
    if (fan && ok) clap(fan, 1.2);
    await ui.say(ok ? ME : sp(foe), ok ? one((D().tug || {}).pull) : one(foe.tug) || one((D().tug || {}).slip));
  }
  const win = score > 0; await new Promise(r => setTimeout(r, 500));
  await ui.say(sp(R), `${win ? one(E.win) : one(E.lose)}${E.why ? '<br>' + E.why : ''}`, { html: true });
  await ui.say(sp(foe), one(win ? foe.lose : foe.win));
  tug = null;
  await ribbon('tug', win, win ? `贏了（${score} 分）` : '輸了');
}
function tugTick(dt, t) {
  tug.off += (tug.want - tug.off) * Math.min(1, dt * 3); tug.lean += (0.3 - tug.lean) * Math.min(1, dt * 2);
  const p = ctx.player, x = TUG_MID + tug.off, wob = Math.sin(t * 9) * 0.03;   // 兩邊身體往後仰、一拉一拉地抖
  if (B.rope) B.rope.position.x = x + wob; if (B.tugFlag) B.tugFlag.position.x = x + wob;
  if (p) { p.position.x = x - 2.0 + wob; p.rotation.set(0, Math.PI / 2, 0); p.rotateX(-tug.lean); }
  if (tug.fm) { const fx = x + 2.0 + wob; tug.fm.position.set(fx, groundAt(fx, TUG_Z), TUG_Z); tug.fm.rotation.set(0, -Math.PI / 2, 0); tug.fm.rotateX(-tug.lean); animate(tug.fm, dt, 0, t); }
}

/* ---------- 紀錄（手機） ---------- */
function nextText() { const d = new Date(ctx.date()), h = d.getHours(); if (d.getDay() === 0 && h < OPEN) return '今天早上 9 點開始'; const k = (7 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + k); return `${d.getMonth() + 1} 月 ${d.getDate()} 日（週日）早上 9 點開始`; }
export function openCard() {
  const on = isOpen(), n = rec(), card = D().card || {}, body = ui.el('div', 'sd'), today = n.day === ymd(ctx.date()), d = ctx.date();
  const cell = k => { const v = today ? n.done[k] : null; return `<div class="sd-ev${v ? ' ' + v : ''}"><i>${v === 'gold' ? '🥇' : v ? '🎗' : '·'}</i><b>${ui.esc(EV(k).name)}</b><small>${today && n.results[k] ? ui.esc(n.results[k]) : '還沒比'}</small></div>`; };
  const wet = d.getDay() === 0 && d.getHours() >= OPEN && d.getHours() < CLOSE;   // 週日白天卻沒開：下雨或颱風延期
  body.innerHTML = `<p class="sd-lead">${on ? '<b>島嶼運動會進行中</b>（城門東邊的活動草地，到下午 4 點；找裁判帳篷報名）' : wet ? `今天天氣不好，運動會延期。${ui.esc(one(REF().rain))}` : `今天沒有運動會。${nextText()}，地點在城門東邊的活動草地（下雨延期）。`}<small>${ui.esc(card.rule || '每個項目一條緞帶，三條都拿到換一面獎牌。')}</small></p>
    <div class="sd-grid">${EVENTS.map(cell).join('')}</div>
    <p class="muted">獎牌 ${n.medals || 0} 面${n.best.run ? `；短跑最快 ${fix(n.best.run)} 秒` : ''}。第 1、3、5 面獎牌各送一件運動會家具：${(D().prizes || []).map(f => ui.esc(f.name)).join('、')}。</p>`;
  ui.panel(card.title || '運動會紀錄', body, { cls: 'phone' });
}
/** 導師熱身站的位置（跑道南邊，面向跑道） */
export const spots = () => WARM.map(([x, z]) => ({ x, z, look: [x, 33] }));
export const debug = () => ({ open: isOpen(), built: !!B, busy, npcs: B ? B.npcs.length : 0, sd: JSON.parse(JSON.stringify(S().sd || {})) });
