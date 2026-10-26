/* 潮汐小島 · 冬天的小細節：屋簷垂下的冰柱、煙囪飄出的炊煙、廣場旁的兩個雪人。
   雪人「雪寶」每天出一題複習題（答對有鈴錢），春天就融化不見。只在積雪時出現（seasons.js 的 uSnow）。 */
import * as THREE from 'three';
import { scene, M, mesh, U, renderer } from './engine.js';
import { groundAt, tileAt } from './terrain.js';
import { homes, colliders, blocked, PLAZA } from './props.js';
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { pickQ, record, pick, dayKey } from './quiz.js';
import * as memo from './memo.js';

const TA = window.TA;
const SNOW = () => U.uSnow.value;
let P = null;

/* ---------- 冰柱：屋頂四角錐底邊（正面與兩側）一排長短不一的冰錐 ---------- */
const ICE_N = 900;
const iceGeo = new THREE.ConeGeometry(0.035, 1, 5).rotateX(Math.PI).translate(0, -0.5, 0);
const iceMat = M('#dff0ff', { roughness: 0.08, transparent: true, opacity: 0.82, emissive: new THREE.Color('#9fcfff'), emissiveIntensity: 0.12 }, 'char');
const ice = new THREE.InstancedMesh(iceGeo, iceMat, ICE_N); ice.count = 0; ice.castShadow = false; ice.frustumCulled = false; ice.visible = false; scene.add(ice);
let iceFor = -1;
function buildIce() {
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let n = 0, seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  homes.forEach(h => {
    if (!h.g) return; h.g.updateMatrixWorld(true);
    const E = 1.84, Z = 1.76, y = 1.86;   // 山形屋頂兩側屋簷的下緣（house() 的 gable：半寬 1.5＋外伸 0.34）
    const edges = [[[E, -Z], [E, Z]], [[-E, -Z], [-E, Z]]];
    edges.forEach(([[ax, az], [bx, bz]]) => {
      for (let k = 0.04; k < 0.97 && n < ICE_N; k += 0.065 + r() * 0.05) {
        if (r() < 0.18) continue;
        const L = 0.1 + r() * r() * 0.38;
        v.set(ax + (bx - ax) * k, y + 0.02, az + (bz - az) * k); h.g.localToWorld(v);
        m4.compose(v, q, sc.set(1 + r() * 0.5, L, 1 + r() * 0.5).multiplyScalar(h.s || 1)); ice.setMatrixAt(n++, m4);
      }
    });
  });
  ice.count = n; ice.instanceMatrix.needsUpdate = true; iceFor = homes.length;
}

/* ---------- 炊煙：每根煙囪一串慢慢上升、變大變淡的煙團（自訂點精靈，帶地平線彎曲） ---------- */
const PER = 9, SM_MAX = 40 * PER;
const smPos = new Float32Array(SM_MAX * 3), smAge = new Float32Array(SM_MAX), smSize = new Float32Array(SM_MAX), smAlpha = new Float32Array(SM_MAX);
const smGeo = new THREE.BufferGeometry();
smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3)); smGeo.setAttribute('aSize', new THREE.BufferAttribute(smSize, 1)); smGeo.setAttribute('aAlpha', new THREE.BufferAttribute(smAlpha, 1));
const smU = { uCurve: U.uCurve, uBendF: U.uBendF, uH: { value: 500 }, uCol: { value: new THREE.Color('#f2f4f8') } };
const smoke = new THREE.Points(smGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: smU,
  vertexShader: `uniform float uCurve; uniform float uBendF; uniform float uH; attribute float aSize; attribute float aAlpha; varying float vA;
    void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve;
      gl_Position = projectionMatrix * mv; gl_PointSize = aSize * projectionMatrix[1][1] * uH / max(-mv.z, 0.1); }`,
  fragmentShader: `uniform vec3 uCol; varying float vA;
    void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.15, r) * vA; if (a < 0.01) discard;
      gl_FragColor = vec4(uCol * (0.92 + (0.5 - gl_PointCoord.y) * 0.16), a); }`
}));
smoke.frustumCulled = false; smoke.renderOrder = 5; smoke.visible = false; scene.add(smoke);
let chimneys = [];
function buildChimneys() {
  chimneys = homes.filter(h => h.g && (h.smoke || !/^home_/.test(h.model || ''))).map((h, i) => { const v = h.smoke ? new THREE.Vector3().fromArray(h.smoke) : new THREE.Vector3(0.9, 3.95, -0.5); h.g.localToWorld(v); return { v, s: h.smoke ? 1 : h.s || 1, ph: i * 0.37 }; });   // v7.6：夢幻風住宅的煙囪口由模型宣告；沒有煙囪的不冒煙
  for (let i = 0; i < SM_MAX; i++) smAge[i] = (i % PER) / PER;
  smGeo.setDrawRange(0, chimneys.length * PER);
}

/* ---------- 雪人 ---------- */
const SNOWM = { name: '雪寶', color: '#7ab8f0', voice: 560 };
const men = [];
function snowman(x, z, big) {
  const g = new THREE.Group(), s = big ? 1 : 0.82, white = M('#f6f8fc', { roughness: 0.75 }, 'char'), coal = M('#2a2a32', { roughness: 0.5 }, 'char');
  const body = mesh(new THREE.SphereGeometry(0.46 * s, 20, 14), white, 0, 0.4 * s, 0); body.scale.y = 0.92; g.add(body);
  const head = mesh(new THREE.SphereGeometry(0.32 * s, 18, 12), white, 0, 0.98 * s, 0); g.add(head);
  [-1, 1].forEach(k => g.add(mesh(new THREE.SphereGeometry(0.038 * s, 8, 6), coal, k * 0.11 * s, 1.05 * s, 0.28 * s, { noCast: true })));
  const nose = mesh(new THREE.ConeGeometry(0.05 * s, 0.22 * s, 8), M('#ff8a2a', {}, 'char'), 0, 0.97 * s, 0.38 * s, { noCast: true }); nose.rotation.x = Math.PI / 2; g.add(nose);
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.035 * s, 8, 6), coal, 0, (0.58 - i * 0.16) * s, 0.43 * s - Math.abs(i - 1) * 0.02, { noCast: true }));
  const scarf = mesh(new THREE.TorusGeometry(0.26 * s, 0.06 * s, 8, 20), M(big ? '#e8504a' : '#3f8fd8', { roughness: 0.9 }, 'char'), 0, 0.76 * s, 0); scarf.rotation.x = Math.PI / 2; g.add(scarf);
  const tail = mesh(new THREE.BoxGeometry(0.1 * s, 0.26 * s, 0.04 * s), scarf.material, 0.14 * s, 0.64 * s, 0.24 * s); tail.rotation.z = 0.25; g.add(tail);
  if (big) { const hat = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.24, 14), M('#5a6f8a', { metalness: 0.3, roughness: 0.5 }, 'char'), 0.03, 1.32, 0); hat.rotation.z = -0.15; g.add(hat); }
  else g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), M('#e8504a', {}, 'char'), 0, 1.24 * s, 0));
  [-1, 1].forEach(k => { const arm = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5 * s, 5), M('#7a5238', {}, 'char'), k * 0.5 * s, 0.6 * s, 0); arm.rotation.z = k * -1.0; g.add(arm); });
  g.position.set(x, groundAt(x, z), z); g.rotation.y = Math.atan2(PLAZA[0] - x, PLAZA[1] - z); g.visible = false; scene.add(g);
  const col = { x, z, r: 0 }; colliders.push(col);
  return { g, x, z, col, big };
}
function placeSnowmen() {
  const spots = [];
  for (let a = 0; a < 24 && spots.length < 2; a++) {
    const ang = 0.6 + a * 0.55, rr = 4.5 + (a % 3) * 0.8, x = PLAZA[0] + Math.cos(ang) * rr, z = PLAZA[1] + Math.sin(ang) * rr;
    const t = tileAt(x, z); if (t !== 1 || blocked(x, z, 0.9)) continue;
    if (spots.some(p => Math.hypot(p[0] - x, p[1] - z) < 2.5)) continue;
    spots.push([x, z]);
  }
  spots.forEach((p, i) => men.push(snowman(p[0], p[1], i === 0)));
}

export function init(player) { P = player; buildIce(); buildChimneys(); placeSnowmen(); }
let shown = false;
export function update(dt, t, night) {
  const w = SNOW(), on = w > 0.5;
  if (on && iceFor !== homes.length) { buildIce(); buildChimneys(); }
  ice.visible = on;
  if (on !== shown) { shown = on; men.forEach(m => { m.g.visible = on; m.col.r = on ? 0.55 : 0; }); }
  smoke.visible = on && chimneys.length > 0;
  if (!smoke.visible) return;
  smU.uH.value = renderer.domElement.height / 2; smU.uCol.value.setRGB(0.84, 0.86, 0.9).multiplyScalar(night > 0.5 ? 0.55 : 1);   // 比天空暗一點，白天才看得出來
  // 煙團：從煙囪口冒出，上升時被風吹往右後方、慢慢變大變淡
  chimneys.forEach((c, ci) => {
    for (let k = 0; k < PER; k++) {
      const i = ci * PER + k; smAge[i] += dt / 4.2; if (smAge[i] > 1) smAge[i] -= 1;
      const a = smAge[i], o = i * 3;
      smPos[o] = c.v.x + a * 1.1 * c.s + Math.sin(t * 0.8 + k + c.ph) * 0.08; smPos[o + 1] = c.v.y + a * 2.2 * c.s; smPos[o + 2] = c.v.z - a * 0.5 * c.s;
      smSize[i] = (0.22 + a * 0.75) * c.s; smAlpha[i] = Math.min(1, a * 6) * (1 - a) * 0.75 * w;
    }
  });
  smGeo.attributes.position.needsUpdate = true; smGeo.attributes.aSize.needsUpdate = true; smGeo.attributes.aAlpha.needsUpdate = true;
}
const nearMan = () => (shown && P ? men.find(m => Math.hypot(P.position.x - m.x, P.position.z - m.z) < 1.6) : null);
export function hint() { return nearMan() ? '和雪人說話' : ''; }
export function handler() { const m = nearMan(); return m ? () => talk(m) : null; }
const CHAT = ['雪地上的腳印，一下子就會被新雪蓋掉……讀過的東西也一樣，要常常複習喔。', '我最喜歡又冷又晴的早晨！你呢？', '天氣冷的時候，背單字特別清醒喔。', '等到春天，我就會變成水，流到海裡去旅行。', '聽說把書本放在枕頭旁邊，夢裡也會複習……是真的嗎？'];
async function talk(m) {
  const s = S(), d = s.snowman && s.snowman.d === dayKey() ? s.snowman : (s.snowman = { d: dayKey(), done: {} });
  const key = m.big ? 'a' : 'b';
  if (d.done[key]) { await ui.say(SNOWM, pick(CHAT)); return; }
  await ui.say(SNOWM, m.big ? '嗨！我是雪寶，是島民們一起堆的雪人。冬天每天都會出一題考考你喔！' : '我是雪寶的弟弟！哥哥出題，我也要出題！');
  const sid = pick(TA.SUBJECTS).id, q = pickQ(sid, 2) || pickQ(sid, 3); if (!q) return;
  const i = await ui.ask(SNOWM, q.q, q.o, { answer: q.a, abc: true, keys: true, html: true }), ok = i === q.a; record(q, ok);
  d.done[key] = true;
  if (!ok) { Audio.sfx('bad'); save(); await ui.explain(SNOWM, q); await ui.say(SNOWM, '明天再來，我再出一題！'); return; }
  const b = m.big ? 800 : 500; s.bells += b; save();
  memo.add('答對了雪寶出的題目', '雪人兄弟今年也站在廣場旁邊', { key: 'snowman:' + new Date().getFullYear(), icon: '⛄' });
  await ui.card({ icon: '', title: `雪寶的謝禮：${b} 鈴錢`, sub: '雪人每天各出一題，冬天限定。' });
  await challenge.keepGoing(SNOWM, q);
}
export const debugMen = () => men.map(m => [m.x, m.z]);
