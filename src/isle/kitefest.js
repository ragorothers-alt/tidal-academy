/* 潮汐小島 · 風箏節（v9.4.2）：每週六 10:00–17:00（下雨、颱風停辦；晚上 6 點同一塊地改擺夜市），城門東邊的活動草地。
   草地南邊就是海，白天吹海風（東南、南或西南風，同一天固定，見 kiteq.windOn）：大家背對大海，風箏飛在草地北邊的天空，風向袋指著下風處。
   風箏工坊：找師傅挑一種風箏（五種），答「尾巴有什麼用」——答對尾巴綁得好，線和地面的夾角 60°，否則 45°。
   放飛點（草地南邊插著線軸架）：換成第一人稱看著天空，答三題（第一題看風向袋判斷風向，另兩題海陸風、等壓線、季風、力平衡），答對放出 10 公尺線、答錯 3 公尺；
   最後用「線長 × sin 夾角」算風箏的高度。高度 28 公尺以上是金章（尾巴綁好時答對兩題，或尾巴沒綁好但三題全對），否則藍章；放完線軸插在草地上，風箏飛到收攤。累計第 1、3、5 次放風箏各送一件風箏節家具。
   文字在 data/kitefest.js，模型在 data/kitemodels.js（Codex 製作）。紀錄：S().kf = { day, kite: { design, tail }, flown: { L, deg, h, exact }, fests, best, greeted, letter } */
import * as THREE from 'three';
import { scene, M } from './engine.js';
import { groundAt } from './terrain.js';
import { colliders, modelClone } from './props.js';
import { register, unregister } from './props3d.js';
import { chibi, nameMesh, animate, lookAt } from './chars.js';
import { label, words } from './works.js';
import { pennants } from './sportsday.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, practiced } from './state.js';
import { DIRS, opp, vec, windOn, SIN, tailQ, heightQ, flightQs } from './kiteq.js';
import * as miles from './miles.js';
import * as social from './social.js';
import * as memo from './memo.js';
import * as weather from './weather.js';

const TA = window.TA, L = TA.L;
export const OPEN = 10, CLOSE = 17, GOLD = 28;
const GATE = [1.0, 33.0, Math.PI / 2], BOOTH = [5.6, 30.4, Math.PI], SOCK = [10.6, 30.8], MATS = [[12.6, 32.2, 0.3], [3.4, 32.4, -0.2]];
export const LAUNCH = [9.0, 34.3];   // 放飛點：草地南邊（再往南是一棵樹和海灘）
const VISIT = [[3.0, 34.5], [4.8, 34.0], [11.6, 34.2], [13.4, 34.6]], WARM = [[6.2, 34.7], [7.4, 33.9], [12.5, 35.0]];   // 遊客與導師放風箏的位置
const SCALE = 2.0;   // 天上的風箏放大一點才看得清楚
const tilt = deg => (deg - 14) * Math.PI / 180;   // 第一人稱抬頭的角度：風箏的仰角就是線的夾角，抬得比它低一點，風箏落在畫面上半（下半是對話框）
let ctx = null, B = null, checkT = 0, forced = null, busy = false, fly = null;

const D = () => I.KITEFEST || {};
const MASTER = () => Object.assign({ name: '風箏師傅', color: '#c98a4b', look: {}, greet: ['來做一隻風箏吧！'], pick: ['想做哪一種？'], made: ['做好了，去放吧！'], again: ['今天的風箏飛得好嗎？'], bye: ['慢走！'], rain: ['今天下雨，風箏節停辦。'] }, D().master);
const DESIGNS = () => (D().designs && D().designs.length ? D().designs : [{ id: 'diamond', model: 'kf_kite_diamond', name: '菱形風箏', fact: '' }]);
const FL = () => Object.assign({ start: ['背對大海，準備放線！'], up: ['風箏往上爬了！'], dip: ['晃了一下，沒關係！'], gold: ['飛得好高！'], blue: ['飛起來了！'], stake: ['把線軸插在草地上吧。'] }, D().flight);
const sp = o => ({ name: o.name, color: o.color, voice: 360 });
const one = a => (a && a.length ? a[Math.floor(Math.random() * a.length)] : '');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fix = v => String(Math.round(v * 10) / 10);
/** 除錯：強制開辦（true）、收攤（false）或照時間（null） */
export const force = v => { forced = v; checkT = 0; };
export function isOpen() {
  if (forced != null) return forced;
  const d = ctx.date(), h = d.getHours() + d.getMinutes() / 60;
  return d.getDay() === 6 && h >= OPEN && h < CLOSE && !weather.typhoon(d) && !weather.raining();
}
function rec() {
  const s = S(), n = s.kf = s.kf || { fests: 0, best: 0 };
  if (isOpen() && n.day !== ymd(ctx.date())) Object.assign(n, { day: ymd(ctx.date()), kite: null, flown: null });
  return n;
}
/** 今天的風從哪裡吹來（DIRS 的索引）與下風處的方向（地圖上的單位向量） */
export const windFrom = () => windOn(ymd(ctx.date()));
const down = () => vec(opp(windFrom()));
/** 下風處的方向（routine.js 讓導師的風箏也照當天的風向飄） */
export const downwind = () => (ctx ? down() : [0, -1]);

/* ---------- 擺場地與收攤 ---------- */
const local = (x, z, ry, lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
function mark(g, name) { const o = g && g.getObjectByName(name); if (!o) return null; const p = new THREE.Vector3(); o.getWorldPosition(p); const q = new THREE.Quaternion(); o.getWorldQuaternion(q); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ'); return { x: p.x, y: p.y, z: p.z, ry: e.y }; }
function place(key, x, z, ry, dress) {
  const g = modelClone('KITEMODELS', key); if (!g) return null;
  g.position.set(x, groundAt(x, z), z); g.rotation.y = ry; g.updateMatrixWorld(true);
  if (dress) dress(g);
  B.g.add(g); g.updateMatrixWorld(true); register(g); B.parts.push(g); return g;
}
const ring = (x, z, r) => { const o = { x, z, r }; colliders.push(o); B.cols.push(o); };
const box = (x0, z0, x1, z1) => { const o = { x0, z0, x1, z1 }; colliders.push(o); B.cols.push(o); };
function npc(o, x, z, ry) { const ch = chibi(Object.assign({ kind: 'human', shirt: '#f2c38f', pants: '#5a6478', hair: '#3a2a22', shoe: '#7a5a4a' }, o.look)); ch.position.set(x, groundAt(x, z), z); ch.rotation.y = ry; ch.traverse(m => { m.frustumCulled = false; }); B.g.add(ch); nameMesh(o.name, ch); B.npcs.push(ch); return ch; }
const faceDown = () => { const [dx, dz] = down(); return Math.atan2(dx, dz); };   // 角色面向下風處（rotation.y = 0 面向 +Z）
/** 一隻飛在天上的風箏：從 from()（線的起點）沿下風處放出 L 公尺、和地面夾 deg 度，左右輕輕飄 */
function kite(design, from, L0, deg, seed) {
  const d = DESIGNS().find(x => x.id === design) || DESIGNS()[0], g = modelClone('KITEMODELS', d.model) || new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), M('#ff9fb3', { side: THREE.DoubleSide }));
  g.scale.setScalar(SCALE); g.traverse(m => { m.frustumCulled = false; if (m.isMesh) { m.material = m.material.clone(); B.mats.push(m.material); } }); B.g.add(g);   // 天上的東西不套遠景的滾筒彎曲（複製的材質不帶彎曲）：抬頭看時彎曲會把線扭成弧
  const N = 10, line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: N + 1 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: '#f6f1e6', transparent: true, opacity: 0.85 }));
  B.mats.push(line.material);
  line.frustumCulled = false; B.g.add(line); B.extra.push(line);
  const segs = []; g.traverse(o => { if (/^(l_|r_)?seg\d$/.test(o.name)) segs.push(o); });
  const K = { g, line, N, from, L: L0, want: L0, deg, seed, dip: 0, segs, design: d.id };
  B.kites.push(K); return K;
}
const kp = new THREE.Vector3(), kq = new THREE.Vector3();
function kiteTick(K, t) {
  const [dx, dz] = down(), th = K.deg * Math.PI / 180, a = K.from(kq), sw = Math.sin(t * 0.41 + K.seed) * 0.06 * K.L, bob = Math.sin(t * 0.67 + K.seed * 2) * 0.03 * K.L - K.dip * 3;   // sw：左右飄、bob：上下起伏、dip：答錯時晃一下
  const hx = K.L * Math.cos(th), hy = K.L * Math.sin(th);
  kp.set(a.x + dx * hx - dz * sw, a.y + hy + bob, a.z + dz * hx + dx * sw);
  K.g.position.copy(kp); K.g.rotation.set(0, Math.atan2(dx, dz), 0); K.g.rotateX(-th * 0.92 + Math.sin(t * 0.9 + K.seed) * 0.06); K.g.rotateZ(Math.sin(t * 1.1 + K.seed) * 0.12 + K.dip * Math.sin(t * 9) * 0.5);   // 正面（local −Z）順著線朝向放風箏的人：風箏面大致和線垂直，頭往上風處、尾巴往下風處
  K.segs.forEach((s, i) => { s.rotation.z = Math.sin(t * 3 - i * 0.7 + K.seed) * 0.35; s.rotation.x = Math.sin(t * 2.3 - i * 0.6) * 0.15; });
  const pos = K.line.geometry.attributes.position;   // 線：微微下垂的弧
  for (let i = 0; i <= K.N; i++) { const k = i / K.N, sag = Math.sin(k * Math.PI) * 0.04 * K.L; pos.setXYZ(i, a.x + (kp.x - a.x) * k, a.y + (kp.y - a.y) * k - sag, a.z + (kp.z - a.z) * k); }
  pos.needsUpdate = true; K.line.geometry.computeBoundingSphere();
}
function build() {
  B = { g: new THREE.Group(), parts: [], cols: [], npcs: [], extra: [], mats: [], kites: [], master: null, front: null, sock: null, mine: null, stake: null };
  B.g.name = 'kite-festival'; scene.add(B.g);
  { const [x, z, ry] = GATE; const g = place('kf_gate', x, z, ry, m => label(m, 'sign', (c, w, h) => words(c, w, h, '#fff8ea', '#2f7a9a', [[D().sign || '風箏節', 0.62, 0.53]]), 512)); if (g) [-1.8, 1.8].forEach(lx => { const [px, pz] = local(x, z, ry, lx, 0); ring(px, pz, 0.15); }); }
  { const [x, z, ry] = BOOTH; const g = place('kf_booth', x, z, ry, m => label(m, 'sign', (c, w, h) => words(c, w, h, '#fff8ea', '#b0603a', [['風箏工坊', 0.7, 0.55]]), 384));
    if (g) { box(x - 1.1, z - 0.6, x + 1.1, z + 0.45); const k = mark(g, 'keeper'), f = mark(g, 'front'); if (k) B.master = npc(MASTER(), k.x, k.z, k.ry + Math.PI); B.front = f ? { x: f.x, z: f.z } : { x, z: z + 1.25 }; } }
  { const [x, z] = SOCK; const g = place('kf_windsock', x, z, 0); if (g) { ring(x, z, 0.2); B.sock = g.getObjectByName('sock'); } }
  MATS.forEach(([x, z, ry]) => place('kf_mat', x, z, ry));
  B.stake = place('kf_stake', LAUNCH[0], LAUNCH[1], 0);   // 放飛點的線軸架（放完風箏插在這裡）
  pennants([1.0, groundAt(1, 31.2) + 3.0, 31.2], [4.5, groundAt(4.5, 29.8) + 2.3, 29.8], B); pennants([6.7, groundAt(6.7, 29.8) + 2.3, 29.8], [10.6, groundAt(10.6, 30.8) + 3.1, 30.8], B);
  // 島外來的遊客：背對大海、面向下風處，各放一隻不同的風箏
  (D().visitors || []).slice(0, VISIT.length).forEach((v, i) => {
    const [x, z] = VISIT[i], ch = npc(v, x, z, faceDown()), hand = p => p.set(ch.position.x, ch.position.y + 1.15, ch.position.z);
    kite(v.design, hand, 16 + i * 2, 44 + (i % 2) * 8, i * 1.7 + 0.5);   // 一般鏡頭往下看玩家，比鏡頭高的風箏要用第一人稱（F）抬頭看
  });
  const n = S().kf; if (n && n.day === ymd(ctx.date()) && n.flown && n.kite) staked(n);   // 今天已經放過：風箏還插在草地上飛
}
function staked(n) { if (!B || !B.stake) return; const e = mark(B.stake, 'exit') || { x: LAUNCH[0], y: groundAt(LAUNCH[0], LAUNCH[1]) + 0.5, z: LAUNCH[1] }; B.mine = kite(n.kite.design, p => p.set(e.x, e.y, e.z), n.flown.L, n.flown.deg, 9.1); }
function destroy() {
  if (!B) return;
  B.cols.forEach(c => { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); });
  B.parts.forEach(g => unregister(g));
  B.extra.forEach(o => o.geometry && !o.isInstancedMesh && o.geometry.dispose());   // 三角旗的幾何是 sportsday.js 共用的，不丟掉
  B.mats.forEach(m => m.dispose());
  scene.remove(B.g); B = null; fly = null;
}

/* ---------- 每一格 ---------- */
export function init(c) {
  ctx = c;
  const s = S(); s.kf = s.kf || { fests: 0, best: 0 };
  if (!s.kf.letter && D().letter) { const l = D().letter; s.kf.letter = 1; social.sendLetter({ from: l.from || 'earth', title: l.title, open: l.open, text: l.text, close: l.close }); save(); }   // 第一次玩到 v9.4.2：地科導師寄信介紹風箏節
}
export function update(dt, t) {
  if (!ctx) return;
  if ((checkT -= dt) <= 0) {
    checkT = 1; const on = isOpen();
    if (on && !B) { build(); if (ctx.started && ctx.started() && forced == null) { Audio.sfx('open'); ui.toast(`🪁 風箏節開始了！城門東邊的活動草地，今天吹${DIRS[windFrom()]}風，到下午 5 點（按 F 換第一人稱，抬頭看天上的風箏）`); } }
    else if (!on && B && !busy) destroy();
  }
  if (!B) return;
  B.npcs.forEach(ch => animate(ch, dt, 0, t));
  if (B.sock) { const [dx, dz] = down(); B.sock.rotation.set(0, Math.atan2(-dx, -dz) + Math.sin(t * 2.1) * 0.08, Math.sin(t * 3.3) * 0.05); }   // 風向袋（往 local −Z 延伸）指向下風處
  if (fly) { fly.K.L += (fly.K.want - fly.K.L) * Math.min(1, dt * 1.1); fly.K.dip = Math.max(0, fly.K.dip - dt * 0.8); if (fly.spool) fly.hand(fly.spool.position).y -= 0.14; }
  B.kites.forEach(K => kiteTick(K, t));
}
const near = (p, px, pz, r = 1.4) => !!p && Math.hypot(px - p.x, pz - p.z) < r;
const atLaunch = (px, pz) => !!B && near({ x: LAUNCH[0], z: LAUNCH[1] }, px, pz, 1.3);
export function hint(px, pz) {
  if (!B) return '';
  if (near(B.front, px, pz)) return '找風箏師傅做風箏';
  if (atLaunch(px, pz)) { const n = rec(); return n.flown ? '看看你的風箏' : n.kite ? '放風箏' : ''; }
  return '';
}
export function act(px, pz) {
  if (!B || busy) return false;
  const n = rec(), job = near(B.front, px, pz) ? workshop : atLaunch(px, pz) && (n.kite || n.flown) ? (n.flown ? look : flight) : null;
  if (!job) return false;
  busy = true; ctx.busy(() => job().finally(() => { busy = false; })); return true;
}

/* ---------- 風箏工坊 ---------- */
async function quiz(who, q, lead, game) {
  const i = await ui.ask(sp(who), lead + q.text, q.opts, { html: true, keys: true, quiz: true, answer: q.a });
  const ok = i === q.a; Audio.sfx(ok ? 'ok' : 'bad'); practiced(game, ok ? 1 : 0, 1);
  await ui.say(sp(who), `${ok ? '答對了！' : `答案是 ${q.opts[q.a]}。`}${q.why}`, { html: true });
  return ok;
}
async function workshop() {
  const n = rec(), R = MASTER(), p = ctx.player, back = ctx.view ? ctx.view(0, 0.05) : null;
  if (p && B.front) { p.position.set(B.front.x, groundAt(B.front.x, B.front.z), B.front.z); p.rotation.set(0, Math.PI, 0); }
  if (B.master && p) lookAt(B.master, p.position.clone().setY(p.position.y + 1.1));
  let card = false;
  try {
    if (!n.greeted) { n.greeted = 1; save(); await ui.say(sp(R), one(R.greet)); }
    if (n.flown) {
      const i = await ui.ask(sp(R), one(R.again), ['今天的紀錄', '先不用了']);
      card = i === 0;
    } else {
      const lead = n.kite ? `你的${(DESIGNS().find(d => d.id === n.kite.design) || {}).name || '風箏'}做好了，去草地南邊的放飛點放吧！想換一種也可以。` : one(R.pick), opts = DESIGNS().map(d => d.name).concat([n.kite ? '不用換了' : '先不用了']);
      const i = await ui.ask(sp(R), lead, opts);
      if (i != null && i >= 0 && i < DESIGNS().length) {
        const d = DESIGNS()[i]; if (d.fact) await ui.say(sp(R), `${d.name}：${d.fact}`);
        const tail = await quiz(R, tailQ(Math.random), '綁尾巴之前先問你：', 'kite');
        n.kite = { design: d.id, tail }; save();
        await ui.say(sp(R), `${one(R.made)}<br>${tail ? '尾巴綁得剛剛好，飛起來會很穩，線可以拉到和地面夾 60°。' : '尾巴先綁短一點，飛起來會晃，線大概只能拉到和地面夾 45°。'}`, { html: true });
        ui.toast(`🪁 拿到${d.name}了！走到草地南邊的放飛點（線軸架）按 E 放風箏`);
      }
    }
    await ui.say(sp(R), one(R.bye));
  } finally { if (B && B.master) lookAt(B.master, null); if (back) back(); }
  if (card) openCard();
}

/* ---------- 放風箏 ---------- */
async function flight() {
  const n = rec(), R = MASTER(), p = ctx.player, [dx, dz] = down(), deg = n.kite.tail ? 60 : 45, F = FL();
  p.position.set(LAUNCH[0], groundAt(LAUNCH[0], LAUNCH[1]), LAUNCH[1]); p.rotation.set(0, Math.atan2(dx, dz), 0);   // 背對大海、面向下風處
  const back = ctx.face ? ctx.face(dx, dz, tilt(deg)) : null;   // 第一人稱：抬頭看著天上的風箏
  const hand = q => q.set(p.position.x + dx * 0.35, p.position.y + 1.15, p.position.z + dz * 0.35);
  try {
    await ui.say(sp(R), one(F.start));
    const K = kite(n.kite.design, hand, 4, deg, 9.1), spool = modelClone('KITEMODELS', 'kf_spool'); K.want = 10; fly = { K, spool, hand }; Audio.sfx('swish');   // 手上拿著線軸
    if (spool) { spool.rotation.y = Math.atan2(dx, dz); B.g.add(spool); }
    let right = 0; const qs = flightQs(windFrom(), Math.random);
    for (let i = 0; i < qs.length; i++) {
      const ok = await quiz(R, qs[i], `第 ${i + 1} / ${qs.length} 題：`, 'kite');
      if (ok) { right++; K.want += 10; } else { K.want += 3; K.dip = 1; }
      await ui.say(sp(R), `${ok ? one(F.up) : one(F.dip)}（線放到 ${K.want} 公尺）`);
    }
    const Lf = K.want, h = Lf * SIN[deg], exact = await quiz(R, heightQ(Lf, deg, Math.random), '最後算算看：', 'kite');
    const gold = h >= GOLD, first = !n.flown; n.flown = { L: Lf, deg, h, exact }; n.best = Math.max(n.best || 0, h); n.fests = (n.fests || 0) + 1; save();
    const s = S(); s.bells += 300 + (gold ? 500 : 0) + (exact ? 200 : 0); L.gain(20, 0); if (first) miles.add('puzzle');
    Audio.sfx(gold ? 'levelup' : 'coin'); ui.toast(`🪁 風箏飛到大約 ${fix(h)} 公尺高：${gold ? '金章' : '藍章'}（+${300 + (gold ? 500 : 0) + (exact ? 200 : 0)} 鈴錢）`);
    await ui.say(sp(R), `${one(gold ? F.gold : F.blue)}<br>${Lf} 公尺的線、夾 ${deg}°：高度 ≈ ${Lf} × ${SIN[deg]} ≈ ${fix(h)} 公尺。${right < 3 ? `（答對 ${right} 題；每多答對一題就多放 10 公尺）` : ''}${!n.kite.tail ? '下次把尾巴綁好，夾角大一點會更高。' : ''}`, { html: true });
    memo.add('風箏節', `${(DESIGNS().find(d => d.id === n.kite.design) || {}).name || '風箏'}飛到大約 ${fix(h)} 公尺高（${gold ? '金章' : '藍章'}，第 ${n.fests} 次放風箏）。`, { key: 'kf:' + n.day, icon: '🪁' });
    await ui.say(sp(R), one(F.stake));
    const f = (D().prizes || [])[[1, 3, 5].indexOf(n.fests)];
    if (f && ctx.giveFurn) await ctx.giveFurn(f.id, `第 ${n.fests} 次在風箏節放風箏的紀念`);
    if (ctx.paint) ctx.paint();
  } finally {
    if (fly) { const i = B ? B.kites.indexOf(fly.K) : -1; if (i >= 0) { B.kites.splice(i, 1); B.g.remove(fly.K.g, fly.K.line); } if (fly.spool && B) B.g.remove(fly.spool); fly = null; }
    if (B && n.flown) staked(n);   // 線軸插到線軸架上，風箏繼續飛到收攤
    if (back) back();
  }
}
/** 放過了：再看一次自己的風箏 */
async function look() {
  const n = rec(), [dx, dz] = down(), back = ctx.face ? ctx.face(dx, dz, tilt(n.flown.deg)) : null;
  try { await ui.say(sp(MASTER()), `你的風箏還在天上：線 ${n.flown.L} 公尺、夾 ${n.flown.deg}°，大約 ${fix(n.flown.h)} 公尺高。今天吹的是${DIRS[windFrom()]}風。`); }
  finally { if (back) back(); }
}

/* ---------- 紀錄（手機） ---------- */
function nextText() { const d = new Date(ctx.date()), h = d.getHours(); if (d.getDay() === 6 && h < OPEN) return '今天早上 10 點開始'; const k = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + k); return `${d.getMonth() + 1} 月 ${d.getDate()} 日（週六）早上 10 點開始`; }
export function openCard() {
  const on = isOpen(), n = rec(), card = D().card || {}, body = ui.el('div', 'kf'), today = n.day === ymd(ctx.date()), d = ctx.date();
  const wet = d.getDay() === 6 && d.getHours() >= OPEN && d.getHours() < CLOSE;
  const mine = today && n.kite ? (DESIGNS().find(x => x.id === n.kite.design) || {}).name : '';
  const state = today && n.flown ? `<b>${n.flown.h >= GOLD ? '🥇 金章' : '🎗 藍章'}</b>：${ui.esc(mine)}飛到大約 ${fix(n.flown.h)} 公尺（線 ${n.flown.L} 公尺、夾 ${n.flown.deg}°）` : today && n.kite ? `做好了${ui.esc(mine)}，還沒放——到草地南邊的放飛點按 E` : '還沒做風箏——先到風箏工坊找師傅';
  body.innerHTML = `<p class="kf-lead">${on ? `<b>風箏節進行中</b>（城門東邊的活動草地，到下午 5 點；今天吹${DIRS[windFrom()]}風）` : wet ? `今天天氣不好，風箏節停辦。${ui.esc(one(MASTER().rain))}` : `今天沒有風箏節。${nextText()}，地點在城門東邊的活動草地（下雨停辦）。`}<small>${ui.esc(card.rule || '每週六放一次風箏，飛到 28 公尺以上是金章。')}</small></p>
    ${on || today ? `<p class="kf-now">${state}</p>` : ''}
    <p class="muted">放過 ${n.fests || 0} 次${n.best ? `；最高大約 ${fix(n.best)} 公尺` : ''}。第 1、3、5 次各送一件風箏節家具：${(D().prizes || []).map(f => ui.esc(f.name)).join('、')}。</p>`;
  ui.panel(card.title || '風箏節紀錄', body, { cls: 'phone' });
}
/** 導師放風箏的位置（草地南邊，面向下風處的北邊） */
export const spots = () => WARM.map(([x, z]) => ({ x, z, look: [x, z - 6] }));
export const debug = () => ({ open: isOpen(), built: !!B, busy, kites: B ? B.kites.length : 0, wind: ctx ? DIRS[windFrom()] : null, kf: JSON.parse(JSON.stringify(S().kf || {})) });
