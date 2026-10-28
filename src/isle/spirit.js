/* 潮汐小島 · 潮靈小汐：有錯題的夜晚，廣場邊會出現迷路的潮靈。
   他的記憶碎片散落在島上，每一片都是你答錯過的一題；重新答對就能撿回來，五片都找回有鈴錢與潮晶謝禮。
   v7.1：錯題取自「今天的複習」清單（L.reviewLeft，只排要考的考科），撿碎片也算今天的複習。 */
import * as THREE from 'three';
import { scene, M, mesh } from './engine.js';
import { tileAt, groundAt } from './terrain.js';
import { blocked, PLAZA } from './props.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { record, dayKey, askQ } from './quiz.js';

const TA = window.TA, L = TA.L;
const SP = { name: '潮靈小汐', color: '#6fd8e8', voice: 720 };
const N = 5;
const ok = id => !!L.Q[id] && L.isMistake(id) && L.inTrack(L.Q[id].subject);   // 要考的考科裡的錯題（長題目用大題目面板、題組附閱讀材料）
let P = null, wisp = null, orbs = [], isNight = () => false;
const group = new THREE.Group(); scene.add(group);
const data = () => { const s = S(), d = dayKey(); if (!s.wisp || s.wisp.d !== d) s.wisp = { d, state: 'lost', frags: [] }; return s.wisp; };
/** 今晚會不會出現：有至少 3 題錯題，且每三天出現兩天（依日期固定） */
let force = false;
export const debugForce = v => { force = v; };
export function tonight() {
  if (force) return true;
  const d = dayKey(), h = [...d].reduce((a, c) => a * 31 + c.charCodeAt(0), 9) >>> 0;
  return h % 3 !== 0 && L.mistakes().filter(ok).length >= 3;
}
function makeWisp() {
  const g = new THREE.Group(), glow = M('#bff6ff', { emissive: new THREE.Color('#6fd8e8'), emissiveIntensity: 1.4, transparent: true, opacity: 0.85 });
  g.add(mesh(new THREE.SphereGeometry(0.32, 16, 12), glow, 0, 1.0, 0, { noCast: true }));
  const tail = mesh(new THREE.ConeGeometry(0.26, 0.6, 12), glow, 0, 0.62, 0, { noCast: true }); tail.rotation.x = Math.PI; g.add(tail);
  [-0.11, 0.11].forEach(x => g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), M('#24445a'), x, 1.05, 0.28, { noCast: true })));
  const l = new THREE.PointLight('#8fe8f8', 2.2, 5, 1.6); l.position.set(0, 1.0, 0); g.add(l);
  g.traverse(o => { o.frustumCulled = false; }); return g;
}
function makeOrb() {
  const g = new THREE.Group(), m = M('#e8fbff', { emissive: new THREE.Color('#7fe0f0'), emissiveIntensity: 1.6, transparent: true, opacity: 0.9 });
  g.add(mesh(new THREE.OctahedronGeometry(0.16, 0), m, 0, 0.7, 0, { noCast: true }));
  const l = new THREE.PointLight('#8fe8f8', 1.2, 3.2, 1.8); l.position.set(0, 0.7, 0); g.add(l);
  g.traverse(o => { o.frustumCulled = false; }); return g;
}
export function init(player, nightFn) { P = player; isNight = nightFn; }
function spawnFrags(W) {
  let ids = L.reviewNext(N, ok); if (ids.length < 3) ids = L.mistakes().filter(ok).slice(0, N);   // 照今天的複習清單的順序；都在冷卻中就照錯題本
  let seed = Date.now() % 2147483647 || 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 600 && W.frags.length < ids.length; k++) {
    const x = (r() - 0.5) * 70, z = (r() - 0.5) * 70, t = tileAt(x, z);
    if (![0, 1, 2].includes(t) || blocked(x, z, 0.8) || W.frags.some(f => Math.hypot(f.x - x, f.z - z) < 6) || Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 4) continue;
    W.frags.push({ x: +x.toFixed(1), z: +z.toFixed(1), qid: ids[W.frags.length], got: false });
  }
  save();
}
function sync() {
  const W = data(), show = isNight() && (W.state === 'search' || (W.state === 'lost' && tonight()));
  if (show && !wisp) { wisp = makeWisp(); const x = PLAZA[0] + 2.6, z = PLAZA[1] + 2.6; wisp.position.set(x, groundAt(x, z), z); scene.add(wisp); }
  if (!show && wisp) { scene.remove(wisp); wisp = null; }
  const want = show && W.state === 'search' ? W.frags.filter(f => !f.got) : [];
  if (want.length !== orbs.length || orbs.some((o, i) => o.f !== want[i])) {
    orbs.forEach(o => group.remove(o.g)); orbs = want.map(f => { const g = makeOrb(); g.position.set(f.x, groundAt(f.x, f.z), f.z); group.add(g); return { f, g }; });
  }
}
let syncT = 0;
export function update(dt, t) {
  syncT -= dt; if (syncT <= 0) { syncT = 1; sync(); }
  if (wisp) { wisp.position.y = groundAt(wisp.position.x, wisp.position.z) + Math.sin(t * 2) * 0.12; wisp.rotation.y = Math.sin(t * 0.7) * 0.4; }
  orbs.forEach((o, i) => { o.g.children[0].position.y = 0.7 + Math.sin(t * 2.4 + i) * 0.12; o.g.children[0].rotation.y = t * 1.5; });
}
const near = (x, z, r) => P && Math.hypot(P.position.x - x, P.position.z - z) < r;
export function hint() {
  if (wisp && near(wisp.position.x, wisp.position.z, 1.8)) return '和潮靈說話';
  return orbs.some(o => near(o.f.x, o.f.z, 1.2)) ? '撿起記憶碎片' : '';
}
export function handler() {
  if (wisp && near(wisp.position.x, wisp.position.z, 1.8)) return talk;
  const o = orbs.find(o => near(o.f.x, o.f.z, 1.2)); return o ? () => frag(o) : null;
}
async function talk() {
  const W = data();
  if (W.state === 'lost') {
    await ui.say(SP, '……啊，你看得見我嗎？我是潮汐裡的潮靈，叫我小汐就好。');
    await ui.say(SP, '今晚漲潮的時候，我的記憶碎片被沖散到島上各處了。每一片裡，都藏著一題你曾經答錯的題目……');
    const i = await ui.ask(SP, '可以幫我把它們找回來嗎？重新答對，碎片才會回到我身邊。', ['交給我！', '下次吧']);
    if (i !== 0) return;
    spawnFrags(W); W.state = 'search'; save(); sync();
    await ui.say(SP, `謝謝你！一共 ${W.frags.length} 片，在島上發著藍光。重新答對、收齊碎片後，再回廣場找我領取謝禮喔。`);
    return;
  }
  const left = W.frags.filter(f => !f.got).length;
  if (left) {   // v8.5 可以問最近的一片在哪個方向（想自己找的就不用問）
    const i = await ui.ask(SP, `還有 ${left} 片碎片在島上……答錯過的題目，可以再看看解析、想一想，再試著回答。`, ['最近的一片在哪個方向？', '我自己找找看']);
    if (i === 0) { const f = W.frags.filter(x => !x.got).sort((a, b) => Math.hypot(a.x - P.position.x, a.z - P.position.z) - Math.hypot(b.x - P.position.x, b.z - P.position.z))[0], dx = f.x - P.position.x, dz = f.z - P.position.z, d = Math.hypot(dx, dz);
      const dir = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'][Math.round(((Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
      await ui.say(SP, d < 8 ? '就在你附近，看看四周有沒有一點藍光！' : `往${dir}走，大約 ${Math.round(d / 5) * 5} 公尺。小地圖的北方在上面喔。`); }
    return;
  }
  W.state = 'done'; const s = S(), b = 600 + W.frags.length * 200; s.bells += b; TA.S.gems = (TA.S.gems || 0) + 10; s.stats = s.stats || {}; s.stats.wisp = (s.stats.wisp || 0) + 1; save();
  await ui.say(SP, '全部都回來了！謝謝你把這些題目重新答對。之後再複習幾次，會記得更穩。');
  await ui.card({ icon: '', title: '潮靈的謝禮', sub: `${b} 鈴錢與 10 潮晶<br>錯題重新答對後，會依間隔複習安排之後再確認一次。` });
  ui.closeDialog(); sync();
}
async function frag(o) {
  const q0 = L.Q[o.f.qid];
  if (!q0) { o.f.got = true; save(); sync(); return; }
  if (L.cooling(q0.id)) { const m = Math.max(1, Math.ceil((L.coolUntil(q0.id) - Date.now()) / 60000)); /* 依真正的冷卻結束時間（空白題沒有 last，只有 lastWrong） */ await ui.say(SP, `這片碎片還在晃動……剛答過的題目要隔一段時間再試，記憶才會牢。大約 ${m} 分鐘後再來撿吧。`); ui.closeDialog(); return; }
  const q = L.view(q0), sub = q.subject ? (TA.subject(q.subject) || {}).name : '';
  const { ok: good } = await askQ(SP, q, `記憶碎片浮現出一題${sub ? sub + '的' : ''}錯題：`);
  record(q, good);
  if (!good) { Audio.sfx('bad'); await ui.explain(SP, q); ui.passage(null); await ui.say(SP, '碎片還在這裡，過一陣子想通了再來撿。'); ui.closeDialog(); return; }
  ui.passage(null);
  o.f.got = true; save(); Audio.sfx('ok'); sync();
  const left = data().frags.filter(f => !f.got).length;
  ui.toast(left ? `撿回一片記憶碎片！還剩 ${left} 片` : '碎片全部找齊了！回廣場告訴小汐吧');
  await challenge.keepGoing(SP, q);
}
