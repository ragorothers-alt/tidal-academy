/* 潮汐小島 · 小划船（v9.1）：碼頭西側那艘小划船，走到旁邊按 E 坐上去，就能沿著島邊划船（北海岸的海蝕柱、外海的潛點都划得到）。
   方向鍵（或搖桿）往哪推，船就慢慢轉過去往那裡划；Shift 划得快。船只能在島邊的海上，碰到沙灘、碼頭與岩石會停下。
   划回碼頭旁按 E「停回碼頭」；在沙灘邊按 E「上岸」（船就留在那裡，下次走過去還能再坐；重新開遊戲會回到碼頭）。 */
import * as THREE from 'three';
import { C, tileAt, seaMesh } from './terrain.js';
import { onPier, blocked, PIER } from './props.js';
import { setSit } from './chars.js';
import * as harbor from './harbor.js';
import * as waves from './waves.js';
import * as Audio from './audio.js';

const EDGE = C - 2.5, HULL = [[0, 1.7], [0, -1.6], [0.95, 0], [-0.95, 0], [0.7, 1.1], [-0.7, 1.1], [0.7, -1.0], [-0.7, -1.0]];   // 船身外圍一圈（船的座標：+z 是船頭）；比船大一點：岸邊的地形是緩坡，太靠岸船會擱淺在沙上
const SEAT = new THREE.Vector3(0, 0.188, 0.2), REACH = 2.6;   // 站在岸邊就搆得到船（船停得離岸一點，免得擱淺）
let ctx = null, B = null, riding = false, v = 0, ph = 0, rippleT = 0;
const tmp = new THREE.Vector3();
export function init(c) { ctx = c; }
export const isRiding = () => riding;
const boat = () => B || (B = harbor.rowboat());
/** 這一點是不是船走得到的海（島邊的海、不是碼頭、沒有東西擋著） */
const seaOK = (x, z) => Math.abs(x) < EDGE && Math.abs(z) < EDGE && tileAt(x, z) === -1 && !onPier(x, z) && !blocked(x, z, 0.25);
/** 船身外圍有幾個點在海上（全部都在 = 沒碰到東西） */
function hull(x, z, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return HULL.reduce((n, [hx, hz]) => n + (seaOK(x + hx * c + hz * s, z - hx * s + hz * c) ? 1 : 0), 0); }
const atHome = b => Math.hypot(b.g.position.x - b.home[0], b.g.position.z - b.home[1]) < 3.2;
/** 船邊（左右舷、船頭）站得住的陸地：上岸的地方 */
function shore(b) {
  const g = b.g, yaw = g.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
  for (const d of [1.6, 2.2, 2.8, 3.4]) for (const [hx, hz] of [[1, 0], [-1, 0], [0, 1], [0.7, 0.7], [-0.7, 0.7]]) {
    const x = g.position.x + (hx * c + hz * s) * d, z = g.position.z + (-hx * s + hz * c) * d;
    if (ctx.canStand(x, z)) return [x, z];
  }
  return null;
}
/** 提示：坐上小船、停回碼頭、上岸 */
export function hint(px, pz) {
  const b = boat(); if (!b) return '';
  if (riding) return atHome(b) ? '停回碼頭' : shore(b) ? '上岸' : '';
  return Math.hypot(b.g.position.x - px, b.g.position.z - pz) < REACH ? '坐上小船' : '';
}
/** 按 E：上船或下船。回傳有沒有做事 */
export function act(px, pz) {
  const b = boat(); if (!b) return false;
  if (!riding) { if (Math.hypot(b.g.position.x - px, b.g.position.z - pz) >= REACH) return false; board(b); return true; }
  if (atHome(b)) { dock(b); return true; }
  const p = shore(b); if (p) { leave(b, p[0], p[1]); return true; }
  return false;
}
function oars(b, out) { const L = b.m.getObjectByName('oarL'), R = b.m.getObjectByName('oarR'); if (L) { L.rotation.y = out ? 0 : Math.PI / 2; L.rotation.z = 0.19; } if (R) { R.rotation.y = out ? 0 : -Math.PI / 2; R.rotation.z = -0.19; } }
function board(b) {
  riding = true; b.ride = true; b.col.r = 0; v = 0; oars(b, true);
  const P = ctx.player; setSit(P, true); if (P.userData.hand) P.userData.hand.visible = false;
  Audio.sfx('pop'); waves.ripple(b.g.position.x, b.g.position.z, 0.9);
  ctx.onBoard();
}
function off(b) { riding = false; v = 0; const P = ctx.player; setSit(P, false); if (P.userData.hand) P.userData.hand.visible = true; b.col.x = b.g.position.x; b.col.z = b.g.position.z; b.col.r = 0.8; }
/** 停回碼頭：船回到原位、角色站上碼頭 */
function dock(b) {
  b.g.position.set(b.home[0], seaMesh.position.y, b.home[1]); b.g.rotation.set(0, b.home[2], 0); off(b); b.ride = false; oars(b, false);
  ctx.onLeave(PIER.x - PIER.hw + 0.45, b.home[1], true); Audio.sfx('pop');
}
/** 在沙灘邊上岸：船留在原地（之後自己在這裡輕輕搖） */
function leave(b, x, z) { off(b); oars(b, false); ctx.onLeave(x, z, false); Audio.sfx('pop'); }
/** 被送進室內（回家、進館）：船留在原地，角色下船 */
export function stop() { const b = boat(); if (b && riding) { off(b); oars(b, false); } }
/** 划船時每一格：往方向鍵的方向慢慢轉、往前划；船身起伏、槳一下一下划 */
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  const b = boat(); if (!b || !riding) return;
  const g = b.g; let yaw = g.rotation.y;
  if (moving && !locked) {
    const want = Math.atan2(ix, iz), d = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
    yaw += THREE.MathUtils.clamp(d, -1.4 * dt, 1.4 * dt);
    const thrust = Math.min(1, len) * Math.max(0, Math.cos(d)) * (run ? 3.4 : 2.3); v += (thrust - v) * Math.min(1, dt * 1.6);
  } else v *= Math.exp(-dt * 1.2);   // 放開：滑行慢慢停下
  const nx = g.position.x + Math.sin(yaw) * v * dt, nz = g.position.z + Math.cos(yaw) * v * dt;
  const h0 = hull(g.position.x, g.position.z, yaw), h1 = hull(nx, nz, yaw);
  if (h1 === HULL.length || (h0 < HULL.length && h1 >= h0)) { g.position.x = nx; g.position.z = nz; } else if (h0 === HULL.length) v *= 0.3; else yaw = g.rotation.y;   // 碰到岸邊就停下；本來就貼著碼頭（剛出發）時，往空曠的方向划就放行
  g.rotation.y = yaw;
  bob(b, t, v);
  ph += dt * (2.2 + v * 0.9) * (moving && !locked ? 1 : 0.15);   // 划槳
  const L = b.m.getObjectByName('oarL'), R = b.m.getObjectByName('oarR');
  [[L, -1], [R, 1]].forEach(([o, s]) => { if (!o) return; o.rotation.y = s * Math.sin(ph) * 0.55; o.rotation.z = -s * (0.19 - 0.24 * Math.max(0, Math.cos(ph))); });
  if (v > 0.4 && (rippleT -= dt) <= 0) { rippleT = 0.5; waves.ripple(g.position.x - Math.sin(yaw) * 1.0, g.position.z - Math.cos(yaw) * 1.0, 0.7); }   // 船尾的水紋
  // 角色坐在座位上，面向船尾
  g.updateMatrixWorld(true); tmp.copy(SEAT); g.localToWorld(tmp);
  const P = ctx.player; P.position.set(tmp.x, tmp.y + 0.02, tmp.z); P.rotation.y = yaw + Math.PI;
}
function bob(b, t, sp) { const g = b.g; g.position.y = seaMesh.position.y + Math.sin(t * 1.1 + b.ph) * 0.03; g.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.04; g.rotation.x = Math.sin(t * 0.7 + b.ph * 1.3) * 0.02 - sp * 0.012; }
/** 沒在划時：留在沙灘邊的船自己輕輕搖（停在碼頭時交給 harbor.js） */
export function update(dt, t) { const b = boat(); if (b && b.ride && !riding) bob(b, t, 0); }
export const debug = () => { const b = boat(); return b && { riding, x: +b.g.position.x.toFixed(2), z: +b.g.position.z.toFixed(2), yaw: +b.g.rotation.y.toFixed(2), v: +v.toFixed(2) }; };
