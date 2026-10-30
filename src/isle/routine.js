/* 潮汐小島 · 島民照作息做事（v8.9）：schedule.js 算出「現在該做什麼」，這裡把它變成走過去（nav.js 找路）、坐下或站好、拿道具、做動作；
   團體活動（晨讀會、早操、合奏……）走近時可以加入，一起解一題。被玩家叫住時放下手上的事、轉頭聊天；下雨、颱風天戶外行程取消；
   一段做完就回到原本的自由活動（laya 或本機的小決定）。地點（PLACES）用島嶼規劃的座標，套上地形扭曲後換成實際位置。 */
import * as THREE from 'three';
import * as nav from './nav.js';
import { dayPlan, gatheringsOn, gathering, actOf, clock, PLACE_NAMES, ACT_NAMES } from './schedule.js';
import { setProps, setSit, setTalk, setExpr, clap } from './chars.js';
import { scene } from './engine.js';
import { colliders, seats, SITES, PLAZA, modelClone } from './props.js';
import { register } from './props3d.js';
import { warp, groundAt } from './terrain.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as weather from './weather.js';
import * as nm from './nightmarket.js';
import * as memo from './memo.js';
import * as bond from './bond.js';
import { I, S, save } from './state.js';
import { pickQ, record, pick, dayKey } from './quiz.js';

let ctx = null;   // main.js 給的：ground、villagers、player、slotPos、seatY、seatFree、standVillager、waterSpot、simT()、hour()、date()、talking()、sp(v)
const L8 = () => I.LINES8 || {};
/** 做什麼：右手、左手的道具（手機裡的稱呼在 schedule.js 的 ACT_NAMES） */
export const ACTS = {
  read: { r: 'book' }, cards: { r: 'cards' }, write: { r: 'brush', l: 'scroll' }, sketch: { r: 'pencil', l: 'sketchbook' },
  violin: { r: 'bow', l: 'violin' }, sing: {}, tambourine: { r: 'tambourine' }, tinker: { r: 'wrench' },
  water: { r: 'can' }, observe: { r: 'lens' }, look: {}, stars: {}, tea: { r: 'cup' },
  cook: { r: 'ladle' }, stretch: {}, chess: {}, kite: { r: 'spool' }, picnic: { r: 'onigiri' },
  sunset: {}, shop: {}, jog: {}
};
const MUSIC = new Set(['violin', 'sing', 'tambourine']);

/* ================= 地點 ================= */
const W = (x, z) => warp(x, z);
const ringOf = (cx, cz, r, n, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return { x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r, look: [cx, cz] }; });
const towards = (pts, lx, lz) => pts.map(([x, z]) => { const [wx, wz] = W(x, z); return { x: wx, z: wz, look: W(lx, lz) }; });
const facing = (pts, ry) => pts.map(([x, z]) => { const [wx, wz] = W(x, z); return { x: wx, z: wz, ry }; });
let PLACES = null, CHESS = null, PICNIC = null, POT = null;
/** 地點：stand（站的位置，看向 look 或面向 ry）、seats（篩選可以坐的座位）、route（慢跑路線） */
function places() {
  if (PLACES) return PLACES;
  const tree = W(-1, 5), fountain = SITES.fountain ? [SITES.fountain.x, SITES.fountain.z] : W(5, 8);
  const near = (p, r) => st => Math.hypot(st.x - p[0], st.z - p[1]) < r;
  PLACES = {
    plazaTree: { seats: st => st.n === 1 && near(tree, 2.4)(st), stand: ringOf(tree[0], tree[1], 2.3, 6, 0.4) },
    fountain: { stand: ringOf(fountain[0], fountain[1], 2.6, 8, 0.2) },
    plazaBench: { seats: st => st.n === 2 && !st.edge && near(PLAZA, 8)(st), stand: ringOf(PLAZA[0], PLAZA[1] + 3, 1.6, 4) },
    market: { stand: towards([[-6.6, 16.7], [-5.4, 16.7], [-3.6, 17.5], [-2.4, 17.5], [-4.5, 17.1]], -4.5, 18.2) },   // 攤位的貨架朝北（廣場那一側）
    pierEnd: { seats: st => !!st.edge, stand: facing([[-4.4, 46.2], [-3.6, 45.6], [-4.2, 44.8]], 0) },
    pier: { stand: facing([[-3.4, 42.5], [-4.6, 43.4]], Math.PI / 2) },
    beach: { stand: facing([[-11, 36.6], [-13, 37.4], [-9, 35.6], [-15, 38.2]], 0.3) },
    camp: { stand: towards([[-22.7, 37.5], [-21.6, 37.9]], -21.8, 36.8) },   // 湯鍋靠海那一側（另一側是帳篷）
    hotel: { seats: near(W(26.3, 27.75), 1.5), stand: towards([[24.5, 26.6], [27.5, 26.4]], 28, 20) },
    cape: { seats: near(W(34.43, -1.75), 1.5), stand: facing([[36.2, -3.2], [35.6, -1.2], [37.2, -2.3], [35.2, -4.2]], Math.PI / 2) },
    shrine: { seats: near(W(-31.2, -20.5), 1.5), stand: towards([[-26.4, -22.4], [-28, -22.4]], -27, -26) },
    spring: { stand: towards([[-21.5, -16.8], [-19.5, -16.6], [-23.5, -16.6]], -21, -13) },
    mill: { stand: towards([[-14.3, 1.3], [-14.9, 2]], -15.8, -1) },
    garden: { stand: towards([[-4.5, 4.2], [7.5, 5], [-4.5, 15.6]], -4.5, 3).concat(towards([[9.6, 13.1]], 9, 12)) },
    veggies: { stand: towards([[-9.6, -4], [-12, -1.6], [-14.3, -4]], -12, -4) },
    flowers: { stand: towards([[27.6, 3], [30.5, 7.6], [9, 30.6], [0, -28.4]], 30.5, 3).map((p, i) => (i === 2 ? Object.assign(p, { look: W(9, 33) }) : i === 3 ? Object.assign(p, { look: W(0, -31.5) }) : p)) },
    board: { stand: towards([[-5, 10.6], [-4.2, 10.9]], -5, 9.1) },
    terrace: { stand: facing([[3.2, -21.2], [11.2, -21.4], [5.4, -23.2], [9, -23.2]], Math.PI) },
    telescope: { stand: towards([[15.6, -28.4], [18.4, -28.4], [17, -28.1], [16.2, -27.5]], 17, -30.7) },
    river: { water: [W(-18, 12), W(-14, 18), W(8, 27)] },
    loop: { route: [[1.6, 12], [1, 18], [0, 22], [-2.4, 31], [-9, 34], [-15, 38.5], [-17, 34], [-22, 33], [-26, 32], [-31, 30], [-33, 22], [-33, 10], [-24, 10], [-22, 6], [-16, 6], [-12, 6], [-5, 6], [1.6, 8]].map(([x, z]) => W(x, z)) },
    chess: { seats: st => !!st.chess },
    picnic: { seats: st => !!st.picnic },
    nightMarket: { stand: nm.spots() },   // v9.4.0 週六晚上的港邊夜市：每一攤前面
    nightBusk: { stand: nm.buskSpots() }
  };
  return PLACES;
}
/** 團體活動用的場景道具：棋桌、野餐桌、營地的湯鍋（島上一直都在，棋桌與野餐桌也能讓玩家坐） */
function placeScene(key, px, pz, ry, onSeat) {
  const [x, z] = W(px, pz), y = groundAt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  const m = modelClone('ACTSCENE', key); if (!m) return null;
  g.add(m); scene.add(g); register(g);
  if (onSeat) onSeat(x, y, z);
  return g;
}
export function init(c) {
  ctx = c;
  CHESS = placeScene('chess_set', 3.6, 11.6, 0, (x, y, z) => {
    colliders.push({ x, z, r: 0.5 });
    [[-1, 0], [1, Math.PI]].forEach(([s, ry]) => { const sz = z + s * 0.72; colliders.push({ x, z: sz, r: 0.22 }); seats.push({ x, z: sz, ry, h: y + 0.47, n: 1, chess: true }); });   // 兩張石凳面對面
  });
  PICNIC = placeScene('picnic_set', -12, 31.5, 0, (x, y, z) => {
    colliders.push({ x0: x - 0.8, z0: z - 0.45, x1: x + 0.8, z1: z + 0.45 });
    [[-1, 0], [1, Math.PI]].forEach(([s, ry]) => seats.push({ x, z: z + s * 0.62, ry, h: y + 0.47, n: 2, picnic: true }));
  });
  POT = placeScene('camp_pot', -21.8, 36.8, 0, (x, y, z) => colliders.push({ x, z, r: 0.45 }));
  if (POT) { POT.userData.flame = POT.getObjectByName('flame'); POT.userData.steam = POT.getObjectByName('steam'); }
}

/* ================= 每位島民 ================= */
const taken = new Map();   // 站位或座位的 key → 佔用的島民
const keyOf = sp => (sp.seat ? 'seat:' + seats.indexOf(sp.seat) + ':' + sp.slot : 'at:' + sp.x.toFixed(1) + ',' + sp.z.toFixed(1));
function freeSpots(place, v, n) {
  const P = places()[place]; if (!P) return [];
  const out = [];
  if (P.seats) seats.forEach(st => { if (!P.seats(st)) return; (st.n === 1 ? [0] : [0, 1]).forEach(k => { const sp = { seat: st, slot: k }; const tk = taken.get(keyOf(sp)); if ((!tk || tk === v) && ctx.seatFree(st, k, v)) out.push(sp); }); });
  (P.stand || []).forEach(p => {
    if (p.ok === undefined) { const s = nav.snap(p.x, p.z, 1.2); p.ok = !!s; if (s) { p.x = s[0]; p.z = s[1]; } }   // 規劃的站位落在東西裡（帳篷、牆角）：挪到旁邊站得住的地方
    const tk = taken.get(keyOf(p)); if (p.ok && (!tk || tk === v)) out.push(p);
  });
  if (P.water) P.water.forEach(([ax, az]) => { const w = ctx.waterSpot(ax, az); if (w) { const sp = { x: w[0], z: w[1], look: [ax, az], water: true }; out.push(sp); } });
  return n ? out.slice(0, n) : out;
}
function claim(v, sp) { release(v); if (sp) { v.rt.spotKey = keyOf(sp); taken.set(v.rt.spotKey, v); } }
function release(v) { if (v.rt && v.rt.spotKey) { if (taken.get(v.rt.spotKey) === v) taken.delete(v.rt.spotKey); v.rt.spotKey = null; } }
/** 站位的實際座標（坐下的話是座位前方一步，走到那裡再坐上去） */
function goalOf(sp) {
  if (!sp.seat) return [sp.x, sp.z];
  const [x, z] = ctx.slotPos(sp.seat, sp.slot), k = sp.seat.edge ? -0.7 : 0.8;
  return [x + Math.sin(sp.seat.ry) * k, z + Math.cos(sp.seat.ry) * k];
}
const blockKey = (v, b, date) => `${v.sid}|${date.toDateString()}|${b.from}|${b.place}|${b.act}`;
/** 現在照作息該做的那一段；下雨、颱風、島民不在外面時沒有 */
function current(v, date, hour) {
  if (!ctx || v.shop || v.guest || v.sid === 'history' || weather.raining() || weather.typhoon()) return null;
  return dayPlan(v.sid, date).find(b => hour >= b.from && hour < b.to) || null;
}
function stop(v) {
  const r = v.rt; if (!r) return;
  release(v); setProps(v.mesh, null, null); v.mesh.userData.act = null; v.mesh.userData.actT = null; v.mesh.userData.rtGo = false; v.mesh.userData.rtGhost = false; setTalk(v.mesh, false);
  if (v.sitting && v.sitting.rt) ctx.standVillager(v);
  if (r.kite) { scene.remove(r.kite.group); r.kite = null; }
  v.rt = null; v.busyRt = false; v.wait = 1 + Math.random() * 2;
}
/** 島民不在外面（回家、睡覺）時呼叫：放下手上的事 */
export function off(v) { if (v.rt) stop(v); }
/** 每一格、每位在外面的島民：回傳 null 表示照原本的方式自由活動；否則回傳 { target, speed, run, face }（走路線、或站在原地做事） */
export function tick(v, dt, dp) {
  if (!ctx) return null;
  const date = ctx.date(), hour = ctx.hour(), b = current(v, date, hour), u = v.mesh.userData;
  if (!b) { if (v.rt) stop(v); return null; }
  const key = blockKey(v, b, date);
  if (!v.rt || v.rt.key !== key) {
    if (v.rt) stop(v);
    if (v.chatting || v.goPlayer || v.sitGoal || v.benchGoal) return null;   // 正在聊天、走去找玩家：先讓他做完
    if (v.sitting) ctx.standVillager(v);
    v.rt = { key, b, phase: 'go', at: 0, nextBubble: 6 + Math.random() * 10 };
    if (!start(v, b)) { v.rt = { key, b, phase: 'skip' }; v.busyRt = false; return null; }
  }
  const r = v.rt; if (r.phase === 'skip') { u.rtGo = false; return null; }
  v.busyRt = true;
  if (ctx.talking() === v) { u.act = null; u.rtGo = false; return { target: [v.mesh.position.x, v.mesh.position.z], speed: 0 }; }   // 被叫住：放下手上的動作，轉頭聊天
  r.at += dt; u.rtGo = r.phase === 'go';
  if (r.phase === 'go') return walk(v, r, dt);
  return doing(v, r, dt, dp);
}
/** 開始一段：決定站在哪裡、找出走過去的路線 */
function start(v, b) {
  const m = v.mesh.position, P = places()[b.place]; if (!P) return false;
  const r = v.rt;
  if (b.act === 'jog' && P.route) {   // 慢跑：從最近的一點開始繞島
    let i0 = 0, bd = 1e9; P.route.forEach(([x, z], i) => { const d = Math.hypot(x - m.x, z - m.z); if (d < bd) { bd = d; i0 = i; } });
    r.loop = P.route; r.li = i0; r.phase = 'go'; r.jog = true;
    return plan(v, P.route[i0][0], P.route[i0][1]);
  }
  let sp = null;
  if (b.gid) {   // 團體活動：依序坐或站進第一個空位（座位在前、站位相鄰），大家聚在一起
    sp = freeSpots(b.place, v)[0] || null; r.gid = b.gid; r.g = gathering(b.gid);
  } else {
    const list = freeSpots(b.place, v);
    sp = list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  if (!sp) return false;
  claim(v, sp); r.spot = sp;
  const [gx, gz] = goalOf(sp);
  return plan(v, gx, gz);
}
function plan(v, x, z) {
  const m = v.mesh.position, pts = Math.hypot(x - m.x, z - m.z) < 1 ? [[x, z]] : nav.path(m.x, m.z, x, z);
  if (!pts) return false;
  v.rt.route = pts; v.rt.ri = 0; v.rt.stuck = 0; v.rt.last = [m.x, m.z];
  return true;
}
function walk(v, r, dt) {
  const m = v.mesh.position, run = !!r.jog, speed = run ? 2.7 : 1.45;
  let p = r.route[r.ri];
  while (p && Math.hypot(p[0] - m.x, p[1] - m.z) < (r.ri < r.route.length - 1 ? 0.45 : 0.25)) { r.ri++; p = r.route[r.ri]; }
  const end = r.route[r.route.length - 1], pp = ctx.player.position;
  // 前面有人：有地方就繞過去；窄路上被島民擋住就側身擠過去，被玩家擋住（例如站在門口）就停下來等，轉頭看玩家
  const w = p ? around(v, m, p) : null;
  if (w === 'wait') {
    r.stuck = 0; r.last = [m.x, m.z];
    if (!r.jog && end && Math.hypot(end[0] - m.x, end[1] - m.z) < 1.6) { arrive(v, r); return { target: [m.x, m.z], speed: 0 }; }   // 玩家站在目的地旁邊：就在這裡做
    return { target: [m.x, m.z], speed: 0, face: Math.atan2(pp.x - m.x, pp.z - m.z) };
  }
  if (w === 'squeeze') v.mesh.userData.rtGhost = true;
  // 卡住（路線經過剛擺的東西）：先往旁邊讓一步；離目的地很近就直接在這裡做；卡久了重新找路，再不行就放棄這一段
  const moved = Math.hypot(m.x - r.last[0], m.z - r.last[1]); r.last = [m.x, m.z];
  const waitP = Math.hypot(pp.x - m.x, pp.z - m.z) < 1.4;   // 玩家就在旁邊：停下來等，不算卡住
  r.stuck = moved < 0.005 && !waitP ? r.stuck + dt : Math.max(0, r.stuck - dt * 0.5);
  if (r.detour) { if (r.at < r.detour.until && Math.hypot(r.detour.x - m.x, r.detour.z - m.z) > 0.15) return { target: [r.detour.x, r.detour.z], speed, run }; r.detour = null; }
  if (r.stuck > 0.8 && !r.jog && end && Math.hypot(end[0] - m.x, end[1] - m.z) < 1.4) { arrive(v, r); return { target: [m.x, m.z], speed: 0 }; }
  if (r.stuck > 0.8 && p) {
    const a = Math.atan2(p[0] - m.x, p[1] - m.z) + (r.side = -(r.side || 1)) * 1.2, dx = m.x + Math.sin(a) * 0.9, dz = m.z + Math.cos(a) * 0.9;
    if (nav.standable(dx, dz)) { r.detour = { x: dx, z: dz, until: r.at + 0.9 }; r.stuck = 0.4; r.tries = (r.tries || 0) + 1; }
  }
  if (r.stuck > 2.5 || (r.tries || 0) > 6) {
    r.stuck = 0; r.tries = 0; r.replan = (r.replan || 0) + 1;
    if (r.replan >= 2) v.mesh.userData.rtGhost = true;   // 找路只知道固定的東西，一直被人擋住：之後從島民身邊擦過去（main.js 的 walkable）
    if (r.replan > 3 || !end || !plan(v, end[0], end[1])) { release(v); r.phase = 'skip'; v.busyRt = false; v.mesh.userData.rtGhost = false; return null; }
    p = r.route[0];
  }
  if (p) return { target: Array.isArray(w) ? w : p, speed, run };
  if (r.jog) { r.li = (r.li + 1) % r.loop.length; const q = r.loop[r.li]; if (!plan(v, q[0], q[1])) { r.phase = 'skip'; v.busyRt = false; return null; } return { target: r.route[0], speed, run }; }
  arrive(v, r); return { target: [m.x, m.z], speed: 0 };
}
/** 直線走向下一個路線點會撞到人（站著、沒在趕路的島民，或玩家），例如先到的人已經站進隔壁的位子：
    回傳繞路點 [x, z]（走到他旁邊一公尺，繞過去再接回路線）；旁邊沒地方繞時，擋路的是島民回傳 'squeeze'（擠過去），是玩家回傳 'wait'；沒擋到人回傳 null */
function around(v, m, p) {
  const dx = p[0] - m.x, dz = p[1] - m.z, L2 = dx * dx + dz * dz; if (L2 < 0.01) return null;
  const L = Math.sqrt(L2), nx = -dz / L, nz = dx / L, pl = ctx.player.position;
  const obs = ctx.villagers.filter(o => o !== v && !o.away && !o.mesh.userData.rtGo).map(o => o.mesh.position);
  if (pl.y < m.y + 1.3) obs.push(pl);   // 玩家跳到高處時不算
  for (const q of obs) {
    const t = ((q.x - m.x) * dx + (q.z - m.z) * dz) / L2; if (t <= 0 || t * L > 3 || t > 1 + 0.6 / L) continue;   // 只看前方 3 公尺內；站在路線點上或稍微過去一點也會擋住
    const d = (q.x - m.x) * nx + (q.z - m.z) * nz; if (Math.abs(d) > 0.7) continue;   // 離直線夠遠，擦不到
    const s = d > 0 ? -1 : 1, close = Math.hypot(q.x - m.x, q.z - m.z) < 1;   // 從他不在的那一側繞
    for (const k of [s, -s]) {
      // 已經貼在他身後（一起走來、他先停下）：從自己的位置往旁邊跨一步，不會越走越近；離得遠就走到他旁邊一公尺
      const wx = close ? m.x + nx * k * 0.9 : q.x + nx * k, wz = close ? m.z + nz * k * 0.9 : q.z + nz * k;
      if (nav.standable(wx, wz) && nav.clear(m.x, m.z, wx, wz)) return [wx, wz];   // 繞路點要站得住、直直走得過去（門口兩側是牆）
    }
    return q === pl ? 'wait' : 'squeeze';   // 兩側都沒地方繞（市集攤位和小溪之間只有一公尺寬、門口）
  }
  return null;
}
function arrive(v, r) {
  const sp = r.spot, u = v.mesh.userData, b = r.b, A = ACTS[b.act] || {};
  r.phase = 'do'; r.at = 0; u.rtGhost = false;
  if (sp.seat) {
    if (ctx.seatFree(sp.seat, sp.slot, v)) { v.sitting = { seat: sp.seat, slot: sp.slot, rt: true }; v.standAt = 0; setSit(v.mesh, true); }
    else { const [x, z] = goalOf(sp); r.spot = { x, z, ry: sp.seat.ry }; }   // 位子被人坐走了：站在旁邊做
  }
  setProps(v.mesh, A.r, A.l); u.act = b.act;
  if (b.act === 'kite') r.kite = makeKite(v);
}
/** 做事中：面向該看的方向、偶爾冒泡泡；做音樂的頭上冒音符 */
function doing(v, r, dt, dp) {
  const m = v.mesh, u = m.userData, b = r.b, sp = r.spot;
  u.actT = r.gid ? (ctx.hour() - b.from) * 3600 : r.at;   // 團體活動用同一個時鐘：早操的動作大家一致
  if (b.act === 'sing') setTalk(m, Math.sin(r.at * 1.3) > -0.3);
  if (r.kite) flyKite(v, r.kite, dt);
  if (b.act === 'cook' && POT && POT.userData.flame) POT.userData.cooking = ctx.simT();
  r.nextBubble -= dt;
  if (r.nextBubble <= 0) {
    r.nextBubble = 22 + Math.random() * 26;
    if (dp < 10 && !ctx.talking()) {
      const lines = ((L8().bubble || {})[v.sid] || {})[b.act];
      if (lines && lines.length && Math.random() < 0.7) ui.bubble(m, pick(lines), 3200);
      else if (MUSIC.has(b.act)) ui.think(m, '♪', 1800);
    }
  }
  if (v.sitting) return { target: [m.position.x, m.position.z], speed: 0 };
  const face = sp.look ? Math.atan2(sp.look[0] - m.position.x, sp.look[1] - m.position.z) : sp.ry;
  return { target: [m.position.x, m.position.z], speed: 0, face };
}

/* ================= 風箏 ================= */
function makeKite(v) {
  const group = new THREE.Group(), k = modelClone('ACTSCENE', 'kite');
  if (k) group.add(k); else group.add(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1), new THREE.MeshStandardMaterial({ color: '#ffb0c0', side: THREE.DoubleSide })));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#f4f0e6', transparent: true, opacity: 0.8 }));
  line.frustumCulled = false; group.add(line); scene.add(group);
  const seed = v.sid.length * 1.7;
  return { group, kite: k, line, seed, tail: k ? [0, 1, 2, 3, 4].map(i => k.getObjectByName('seg' + i)).filter(Boolean) : [] };
}
const hp = new THREE.Vector3();
function flyKite(v, K, dt) {
  const m = v.mesh, t = ctx.simT() + K.seed, wind = 0.6;   // 東岬吹東風：風箏飄在玩家東邊的海上
  const x = m.position.x + 7 + Math.sin(t * 0.37) * 1.4, z = m.position.z + Math.sin(t * 0.23 + K.seed) * 2.2, y = m.position.y + 7.5 + Math.sin(t * 0.51) * 0.8;
  const kg = K.kite || K.group.children[0]; kg.position.set(x, y, z); kg.rotation.set(-0.35 + Math.sin(t * 0.9) * 0.08, -Math.PI / 2 + Math.sin(t * 0.6) * 0.25, Math.sin(t * 1.1) * 0.18 * wind);
  K.tail.forEach((s, i) => { s.rotation.z = Math.sin(t * 3 - i * 0.7) * 0.35; s.rotation.x = Math.sin(t * 2.3 - i * 0.6) * 0.15; });
  const hand = (m.userData.gltf && m.userData.gltf.rig && m.userData.gltf.rig.rHand) || null;
  if (hand) hand.getWorldPosition(hp); else hp.copy(m.position).setY(m.position.y + 1.2);
  const pos = K.line.geometry.attributes.position; pos.setXYZ(0, hp.x, hp.y, hp.z); pos.setXYZ(1, x, y, z); pos.needsUpdate = true;
}

/* ================= 營地的湯鍋：有人煮湯時火會跳、冒蒸氣 ================= */
export function update(dt) {
  if (!POT) return;
  const on = POT.userData.cooking && ctx.simT() - POT.userData.cooking < 2, f = POT.userData.flame, s = POT.userData.steam, t = ctx.simT();
  if (f) { f.visible = on; if (on) { f.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 9.3) * 0.16, 1 + Math.cos(t * 11) * 0.08); } }
  if (s) { s.visible = on; if (on) { s.position.y = (t * 0.25) % 0.3; s.children.forEach((c, i) => { c.position.x = Math.sin(t * 0.8 + i) * 0.04; }); } }
}

/* ================= 團體活動：走近時加入 ================= */
/** 這位島民正在參加、而且今天還沒加入過的團體活動（沒有就回傳 null） */
export function joinable(v) {
  const r = v && v.rt; if (!r || !r.gid || r.phase !== 'do') return null;
  const s = S(), d = dayKey(); if (s.gather && s.gather.d === d && s.gather.ids[r.gid]) return null;
  return r.g;
}
/** 現在在場（已經開始做事）的參加者 */
const present = gid => ctx.villagers.filter(o => o.rt && o.rt.gid === gid && o.rt.phase === 'do' && !o.away);
export async function join(g) {
  const s = S(), d = dayKey(), Lg = (L8().gather || {})[g.id] || {}, who = present(g.id); if (!who.length) return;
  s.gather = s.gather && s.gather.d === d ? s.gather : { d, ids: {} };
  s.gather.ids[g.id] = 1; save();   // 先記下：中途離開也算來過，不會一直被邀請
  let turn = 0; const spk = sid => (sid && sid !== '*' && who.find(o => o.sid === sid)) || who[turn++ % who.length];
  const host = who[0], sp = v => ctx.sp(v);
  who.forEach(o => { o.mesh.userData.act = null; setExpr(o.mesh, 'happy', 1.6); });
  try {
    for (const [sid, line] of (Lg.scene || [])) { const o = spk(sid); await ui.say(sp(o), line); }
    const sid = pick(g.subj || [host.sid]), q = pickQ(sid);
    let good = false;
    if (q) {
      await ui.say(sp(host), pick(Lg.ask || ['說到這個，我剛好想到一題，一起想想看？']));
      const i = await ui.ask(sp(host), q.q, q.o, { answer: q.a, abc: true, html: true, keys: true });
      good = i === q.a; record(q, good); Audio.sfx(good ? 'ok' : 'bad');
      who.forEach(o => setExpr(o.mesh, good ? 'happy' : 'sad', 1.6));
      if (good) await ui.say(sp(spk('*')), pick(Lg.ok || ['答對了！']));
      else { await ui.say(sp(spk('*')), pick(Lg.bad || ['沒關係，看一下解析就懂了。'])); await ui.explain(sp(host), q); }
    }
    const bells = 200 + (good ? 300 : 0); s.bells += bells;
    who.forEach(o => bond.addFr(o, 1));
    s.stats = s.stats || {}; s.stats.gathers = (s.stats.gathers || 0) + 1; save();
    memo.add(`參加了${g.name}`, who.map(o => o.name).join('、') + '也在', { key: 'gather:' + g.id, icon: g.icon || '🌿' });
    await ui.say(sp(host), pick(Lg.bye || ['謝謝你來！下次也一起吧。']));
    ui.toast(`一起參加了${g.name}：鈴錢 +${bells}、${who.map(o => o.name).join('、')}的好感度 +1`);
  } finally { who.forEach(o => { if (o.rt && o.rt.phase === 'do') o.mesh.userData.act = o.rt.b.act; }); }
}
/** 每一格、每位在外面的島民：走近團體活動時，主持的人說一句邀請（每場一次）；從遠處走近時島民揮手打招呼 */
const waveAt = new Map(); let waveAny = -1e9;
export function nearTick(v, dp) {
  if (!ctx) return;
  const prev = v.lastDp ?? 99; v.lastDp = dp;
  const g = joinable(v);
  if (g) {
    if (dp > 6 || v.rt.invited) return;
    const who = present(g.id); if (who[0] !== v) return;
    v.rt.invited = true; const lines = ((L8().gather || {})[g.id] || {}).invite;
    ui.bubble(v.mesh, lines && lines.length ? pick(lines) : `要不要一起來${g.name}？`, 4200); setExpr(v.mesh, 'happy', 2);
    return;
  }
  if (!(prev >= 9 && dp < 9) || ctx.talking() || v.chatting || v.goPlayer || v.shop || v.guest || v.sitGoal) return;   // 從 9 公尺外走進來的那一刻
  const now = ctx.simT(); if (now - (waveAt.get(v) ?? -1e9) < 180 || now - waveAny < 12) return;
  const lines = (L8().wave || {})[v.sid]; if (!lines || !lines.length) return;
  waveAt.set(v, now); waveAny = now;
  if (!v.sitting) { clap(v.mesh, 1.5); v.faceTo = { mesh: ctx.player }; setTimeout(() => { if (v.faceTo && v.faceTo.mesh === ctx.player) v.faceTo = null; }, 2600); }
  else setExpr(v.mesh, 'happy', 1.5);
  ui.bubble(v.mesh, pick(lines), 2600); Audio.blip(v.voice || 400);
}

/* ================= 對話與手機 ================= */
/** 找正在做事的島民說話：他的第一句（沒有在做事就回傳 null） */
export function line(v) {
  const r = v && v.rt; if (!r || r.phase !== 'do') return null;
  const lines = ((L8().act || {})[v.sid] || {})[r.b.act];
  return lines && lines.length ? pick(lines) : null;
}
/** 手機「島民」：現在在哪裡做什麼，例如「在溪邊寫詩（9:30–11:00）」 */
export function status(v) {
  const r = v && v.rt, b = r && r.b; if (!b || r.phase === 'skip') return '';
  return `${r.phase === 'go' ? '正要去' : '在'}${PLACE_NAMES[b.place] || ''}${ACT_NAMES[b.act] || ''}（${clock(b.from)}–${clock(b.to)}）`;
}
/** 今天的團體活動（手機「島民」）：[{ name, icon, time, place, who }] */
export function today() {
  if (!ctx) return [];
  return gatheringsOn(ctx.date()).map(x => ({ id: x.id, name: x.g.name, icon: x.g.icon, time: `${clock(x.from)}–${clock(x.to)}`, place: PLACE_NAMES[x.g.place] || '', who: x.who, from: x.from, to: x.to }));
}
