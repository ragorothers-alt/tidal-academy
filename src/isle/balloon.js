/* 潮汐小島 · 熱氣球：晴朗的白天偶爾有掛著禮物的熱氣球飄過島上空；靠近時答對一題就能把禮物射下來。 */
import * as THREE from 'three';
import { scene, M, mesh } from './engine.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import { pickQ, record, pick, fairSec } from './quiz.js';

const TA = window.TA;
let P = null, b = null, nextT = 90 + Math.random() * 120, hooks = {};
export function init(player, h) { P = player; hooks = h || {}; }
const L5 = (k, d) => pick((((I.LINES5 || {}).balloon || {})[k]) || d);
function make() {
  const g = new THREE.Group(), col = pick(['#ff7a7a', '#7cc7ff', '#ffd84a', '#8fe0b8', '#b9a2ff']);
  const ball = mesh(new THREE.SphereGeometry(0.55, 16, 12), M(col), 0, 1.4, 0); ball.scale.set(1, 1.15, 1); g.add(ball);
  g.add(mesh(new THREE.ConeGeometry(0.12, 0.2, 10), M(col), 0, 0.72, 0));
  const str = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 4), M('#ffffff'), 0, 0.35, 0); g.add(str);
  const box = mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), M('#fff3dc'), 0, -0.1, 0); g.add(box);
  g.add(mesh(new THREE.BoxGeometry(0.36, 0.06, 0.06), M('#ff6a8a'), 0, -0.1, 0), mesh(new THREE.BoxGeometry(0.06, 0.32, 0.36), M('#ff6a8a'), 0, -0.1, 0));
  g.traverse(o => { o.frustumCulled = false; }); return g;
}
function spawn() {
  const a = Math.random() * Math.PI * 2, r = 46, sx = Math.cos(a) * r, sz = Math.sin(a) * r, ex = -sx + (Math.random() - 0.5) * 16, ez = -sz + (Math.random() - 0.5) * 16;
  const g = make(); g.position.set(sx, 6.5, sz); scene.add(g);
  const d = Math.hypot(ex - sx, ez - sz); b = { g, vx: (ex - sx) / d * 1.1, vz: (ez - sz) / d * 1.1, life: d / 1.1, t: 0 };
  if (!S().balloonSeen) { S().balloonSeen = true; save(); }
  ui.toast(L5('spot', ['有一顆掛著禮物的熱氣球飄過來了！']));
}
export function update(dt, t, ok) {
  if (b) {
    b.t += dt; b.g.position.x += b.vx * dt; b.g.position.z += b.vz * dt; b.g.position.y = 6.5 + Math.sin(t * 0.8) * 0.3; b.g.rotation.y += dt * 0.3;
    if (b.t > b.life) { scene.remove(b.g); b = null; }
    return;
  }
  if (!ok) return;
  nextT -= dt; if (nextT <= 0) { nextT = 240 + Math.random() * 300; spawn(); }
}
const near = () => b && !b.missed && P && Math.hypot(b.g.position.x - P.position.x, b.g.position.z - P.position.z) < 6;
export const hint = () => (near() ? '射下熱氣球（答一題）' : '');
export function handler() { return near() ? shoot : null; }
const GIFT = { name: '熱氣球', color: '#ff7a7a', voice: 640 };
async function shoot() {
  const cur = b; if (!cur) return;
  const sid = pick(TA.SUBJECTS).id, q = pickQ(sid, 2) || pickQ(sid, 3); if (!q) return;
  const i = await ui.ask(GIFT, `瞄準熱氣球！${q.q}`, q.o, { abc: true, keys: true, html: true, timer: fairSec(20, q) }), ok = i === q.a; record(q, ok);
  if (!ok) { Audio.sfx('bad'); await ui.say(null, `${L5('miss', ['熱氣球飄走了……'])}正確答案是 ${ui.ansOf(q)}。`, { html: true }); await ui.say(null, q.e, { html: true }); cur.missed = true; if (b === cur) { cur.vx *= 2.5; cur.vz *= 2.5; } return; }
  Audio.sfx('catch'); if (b === cur) { scene.remove(cur.g); b = null; }
  await ui.say(null, L5('win', ['禮物落下來了！']));
  await reward();
  await challenge.keepGoing(GIFT, q);
}
async function reward() {
  const s = S(), r = Math.random();
  if (r < 0.35) { const n = 800 + Math.floor(Math.random() * 18) * 100; s.bells += n; save(); await ui.card({ icon: '', title: `禮物裡是 ${n.toLocaleString()} 鈴錢！`, sub: '' }); return; }
  if (r < 0.7) { const [m, name, n] = pick([['iron', '鐵塊', 2], ['stone', '石頭', 5], ['branch', '樹枝', 5], ['shell', '貝殼', 3], ['fruit', '橘子', 3]]); s.mats = s.mats || {}; s.mats[m] = (s.mats[m] || 0) + n; save(); await ui.card({ icon: '', title: `禮物裡是 ${name} ×${n}`, sub: '可以拿去 DIY 或料理。' }); return; }
  const shop = (I.FURNITURE || []).filter(f => f.src === 'shop' && f.price <= 4000), f = pick(shop);
  if (f && hooks.giveFurn) await hooks.giveFurn(f.id, '熱氣球的禮物'); else { s.bells += 1500; save(); }
}
export const debugSpawn = () => { if (!b) spawn(); return b && b.g.position.toArray(); };
