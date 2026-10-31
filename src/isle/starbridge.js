/* 潮汐小島 · 光橋（v9.3.0）：學院台地東北角的崖邊立著「光橋石門」（模型 data/academymodels.js，Codex 製作），城堡就在正前方的天空。
   點亮 3 座單元燈塔以後，石門後面長出通往城堡的光橋：一級一級半透明的光階沿著城堡的方向升上天空，越遠越淡，光一陣一陣往上流。
   在石門前按 E：走上光橋幾步、畫面亮成一片白，進到城堡裡的星環學院（academy.js、data/interiors_starcastle.js）；還沒接起來時，石碑寫著還差幾座燈塔。
   拱頂徽章的十顆寶石依各科點亮的比例發光。光階、光幕與光點用自己的著色器，不套遠景的滾筒彎曲（光橋是往天上去的，彎曲會把它壓進海裡）。
   紀錄：S().sa = { open: 光橋接起來的那天, letter, first }（academy.js 的課堂紀錄也在這裡） */
import * as THREE from 'three';
import { scene, camera, skyU, U as EU, bend } from './engine.js';
import { groundAt } from './terrain.js';
import { colliders, modelClone, clearFlowers } from './props.js';
import { clearArea } from './grass.js';
import { register } from './props3d.js';
import { label, words } from './works.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, dayKey } from './state.js';
import * as social from './social.js';
import * as memo from './memo.js';

const TA = window.TA;
export const NEED = 3;   // 點亮幾座單元燈塔，光橋才接得起來
const AT = [21.7, -34.5], CASTLE = [Math.sin(0.18) * 292.5, -Math.cos(0.18) * 292.5];   // 石門的位置；城堡的方位與距離（fantasy.js 的 CASTLE）
const DIR = (() => { const dx = CASTLE[0] - AT[0], dz = CASTLE[1] - AT[1], l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();
const RY = Math.atan2(-DIR[0], -DIR[1]);   // 石門的 local −Z（光橋的方向）朝著城堡；角色 rotation.y = RY 是背對城堡、面向台地
const LEN = 44, STEP = 0.74, N = Math.floor(LEN / STEP), SCALE = 0.9, AIM0 = 5;   // AIM0：從這裡開始，光橋在畫面上轉向城堡
const hAt = s => s * 0.2 + s * s * 0.0014;   // 光橋離起點的高度（走上去的那幾公尺照這個貼腳）
let ctx = null, B = null, tickT = 0, grow = 0, growTo = 0, lift = null, forced = null;

const D = () => I.ACADEMY || {};
export const HOST = () => Object.assign({ name: '星璃', color: '#9fb6ff', voice: 520 }, D().host);
const say = () => { const h = HOST(); return { name: h.name, color: h.color, voice: h.voice }; };
const one = a => (a && a.length ? a[Math.floor(Math.random() * a.length)] : '');
const rec = () => { const s = S(); return s.sa = s.sa || {}; };
/** 光橋接起來了嗎（除錯可以強制） */
export const isOpen = () => forced != null ? forced : !!rec().open;
export const force = v => { forced = v; tickT = 0; if (B) growTo = grow = v ? 1 : 0.06; };
const lit = () => (ctx && ctx.lit ? ctx.lit() : 0);

/* ---------- 光階、光幕與光點的著色器 ---------- */
const U = { uTime: { value: 0 }, uGrow: { value: 0 }, uNight: { value: 0 }, uLen: { value: LEN }, uCurve: EU.uCurve, uBendF: EU.uBendF, uTarget: { value: new THREE.Vector2() }, uAim: { value: 0 }, uAim0: { value: AIM0 },
  uStart: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector2(DIR[0], DIR[1]) } };
/* 島上的遠景是滾筒彎曲的（離鏡頭 15 公尺外一路往下壓），城堡卻是固定浮在畫面地平線上方的遠景：照真實座標畫的光橋遠處，不是沉進海裡就是衝出畫面頂端。
   所以光橋在畫面上「瞄準」城堡：前 AIM0 公尺照真實位置（跟著地面彎曲，接得上石門平台、走上去貼腳），之後在畫面上逐漸轉向城堡底部（uTarget，每格由城堡的位置算），
   寬度也跟著收窄；深度用真實的位置，前面的地形照樣擋得住。城堡不在畫面前方時（背對、太偏）就照真實位置畫 */
const AIM = `uniform float uCurve; uniform float uBendF; uniform vec2 uTarget; uniform float uAim; uniform float uAim0; uniform float uLen; uniform vec3 uStart; uniform vec2 uDir;
  vec4 bentClip(vec3 w) { vec4 mv = viewMatrix * vec4(w, 1.0); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; return projectionMatrix * mv; }
  vec3 axisAt(float s) { return vec3(uStart.x + uDir.x * s, uStart.y + s * 0.2 + s * s * 0.0014, uStart.z + uDir.y * s); }
  // 過了 uAim0：中線改走畫面上的一段二次曲線（從 uAim0 那一點、順著橋原本的方向往上彎，接到城堡底部）；寬度是同一處真實位置的寬度（遠處自然變窄）
  vec4 aim(vec3 wv, vec3 wc, float s) {
    vec4 cv = bentClip(wv);
    if (uAim <= 0.0 || s <= uAim0) return cv;
    vec4 c0 = bentClip(axisAt(uAim0)), cc = bentClip(wc);
    if (c0.w <= 0.01 || cc.w <= 0.01 || cv.w <= 0.01) return cv;
    float x = max(s - uAim0, 0.0), X = uLen - uAim0, t = (1.0 - 1.0 / (1.0 + 0.09 * x)) / (1.0 - 1.0 / (1.0 + 0.09 * X));   // 像往遠方延伸的路：近的階梯疏、遠的密
    vec2 p0 = c0.xy / c0.w, d2 = uTarget - p0, axis = p0 + d2 * t + vec2(-d2.y, d2.x) * 0.07 * sin(t * 3.14159);   // 從橋頭直直朝城堡收過去，中段微微拱起
    vec2 nd = axis + (cv.xy / cv.w - cc.xy / cc.w) * (1.0 - t * 0.6);
    return vec4(mix(cv.xy / cv.w, nd, uAim) * cv.w, cv.z, cv.w);
  }
`;
const FRAG_HEAD = `uniform float uTime; uniform float uGrow; uniform float uNight; uniform float uLen; varying float vS;
  float flow(float s) { return pow(0.5 + 0.5 * sin(s * 0.5 - uTime * 3.0), 6.0); }
  float reach(float s) { float g = uGrow * uLen; return smoothstep(g + 0.2, g - 1.6, s); }   // 長出來的那一段（剛接起來時從石門往天上長）
  float fade(float s) { return smoothstep(uLen, uLen * 0.3, s) * smoothstep(-2.4, 0.4, s); }`;
const mat = (vert, frag, add) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false });
const slabMat = mat(AIM + `attribute float aS; varying float vS; varying vec3 vP;
  void main() { vS = aS; vP = position; mat4 w = modelMatrix * instanceMatrix; gl_Position = aim((w * vec4(position, 1.0)).xyz, (w * vec4(0.0, 0.0, 0.0, 1.0)).xyz, aS); }`,
  FRAG_HEAD + ` varying vec3 vP;
  void main() {
    float rim = smoothstep(0.78, 1.0, abs(vP.x) / 1.05) + smoothstep(0.7, 1.0, abs(vP.z) / 0.29) * 0.5, f = flow(vS);
    vec3 c = mix(mix(vec3(0.5, 0.74, 1.0), vec3(0.72, 0.62, 1.0), smoothstep(0.0, uLen, vS)), vec3(1.0, 0.86, 0.55), max(f, rim * 0.8)) * (0.7 + f * 0.8 + rim * 0.35 + uNight * 0.45);   // 白天在白雲前也要看得見：淡藍往天上轉薰衣草、邊緣與流光是金色
    float a = (0.58 + rim * 0.3 + f * 0.2 - uNight * 0.18) * reach(vS) * fade(vS);
    gl_FragColor = vec4(c, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`);
const veilMat = mat(AIM + `attribute float aS; attribute float aV; attribute vec3 aC; varying float vS; varying float vV;
  void main() { vS = aS; vV = aV; gl_Position = aim((modelMatrix * vec4(position, 1.0)).xyz, (modelMatrix * vec4(aC, 1.0)).xyz, aS); }`,
  FRAG_HEAD + ` varying float vV;
  void main() {
    float f = flow(vS + 3.0), band = smoothstep(0.0, 0.08, vV) * pow(1.0 - vV, 1.6);
    vec3 c = mix(vec3(0.5, 0.72, 1.0), vec3(1.0, 0.88, 0.6), f) * (0.75 + f * 0.8 + uNight * 0.5);
    gl_FragColor = vec4(c, band * (0.4 + f * 0.3 - uNight * 0.12) * reach(vS) * fade(vS));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`);
const moteMat = mat(AIM + `attribute float aS; attribute float aSeed; attribute vec3 aC; varying float vS; varying float vK; uniform float uTime;
  void main() {
    float k = fract(aSeed * 7.13 + uTime * (0.05 + aSeed * 0.04)); vK = sin(k * 3.14159);
    vec3 p = position; p.y += k * 2.4; p.x += sin(uTime * 0.7 + aSeed * 30.0) * 0.25; vS = aS;
    vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(90.0 / -mv.z, 1.5, 9.0) * (1.0 - smoothstep(uAim0, uLen, aS) * 0.6);
    gl_Position = aim((modelMatrix * vec4(p, 1.0)).xyz, (modelMatrix * vec4(aC, 1.0)).xyz, aS);
  }`, FRAG_HEAD + ` varying float vK;
  void main() {
    vec2 q = gl_PointCoord - 0.5; float d = dot(q, q); if (d > 0.25) discard;
    gl_FragColor = vec4(vec3(1.0, 0.96, 0.85) * (1.6 + uNight), (1.0 - d * 4.0) * vK * (0.55 + uNight * 0.35) * reach(vS) * fade(vS));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`, true);

/** 光橋上離起點 s 公尺那一點的世界座標 */
function at(s, out) { return out.set(B.start.x + DIR[0] * s, B.start.y + hAt(s), B.start.z + DIR[1] * s); }
function bridge() {
  const g = new THREE.Group(); g.name = 'starbridge'; const p = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), one3 = new THREE.Vector3(1, 1, 1);
  // 光階：一級一級的薄光板，沿著坡度仰起
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(2.1, 0.05, 0.58), slabMat, N), aS = new Float32Array(N);
  for (let i = 0; i < N; i++) { const s = i * STEP + 0.3; aS[i] = s; e.set(Math.atan(0.2 + 0.0028 * s), RY, 0); q.setFromEuler(e); m4.compose(at(s, p), q, one3); slabs.setMatrixAt(i, m4); }
  slabs.geometry.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 1)); slabs.frustumCulled = false; slabs.renderOrder = 3; g.add(slabs);
  // 兩側的光幕：沿著橋緣往上淡掉的一層薄光（像欄杆）
  const P = [], C = [], S2 = [], V = [], IX = [], K = 120;
  [-1, 1].forEach(side => {
    const n0 = P.length / 3, ox = Math.cos(RY) * side * 1.08, oz = -Math.sin(RY) * side * 1.08;   // 石門的 local +x（朝右）換到世界座標
    for (let i = 0; i <= K; i++) { const s = i / K * LEN; at(s, p); [0, 1].forEach(v => { P.push(p.x + ox, p.y + v * 0.55, p.z + oz); C.push(p.x, p.y, p.z); S2.push(s); V.push(v); }); if (i < K) { const a = n0 + i * 2; IX.push(a, a + 1, a + 3, a, a + 3, a + 2); } }
  });
  const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); vg.setAttribute('aC', new THREE.Float32BufferAttribute(C, 3)); vg.setAttribute('aS', new THREE.Float32BufferAttribute(S2, 1)); vg.setAttribute('aV', new THREE.Float32BufferAttribute(V, 1)); vg.setIndex(IX);
  const veil = new THREE.Mesh(vg, veilMat); veil.frustumCulled = false; veil.renderOrder = 4; g.add(veil);
  // 光點：從光階上慢慢飄起來
  const MP = [], MC = [], MS = [], MD = [];
  for (let i = 0; i < 220; i++) { const s = Math.random() * LEN * 0.8, w = (Math.random() - 0.5) * 2.2; at(s, p); MP.push(p.x + Math.cos(RY) * w, p.y, p.z - Math.sin(RY) * w); MC.push(p.x, p.y, p.z); MS.push(s); MD.push(Math.random()); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(MP, 3)); mg.setAttribute('aC', new THREE.Float32BufferAttribute(MC, 3)); mg.setAttribute('aS', new THREE.Float32BufferAttribute(MS, 1)); mg.setAttribute('aSeed', new THREE.Float32BufferAttribute(MD, 1));
  const motes = new THREE.Points(mg, moteMat); motes.frustumCulled = false; motes.renderOrder = 5; g.add(motes);
  return g;
}

/* ---------- 擺石門、石碑與光橋 ---------- */
/** 自己一份材質（寶石要各自換色），重新套上遠景彎曲（模型檔裡的水晶材質是複製出來的，不帶彎曲：離遠了會浮在拱門上方） */
const own = m0 => { const m = m0.clone(); bend(m); return m; };
function mark(g, name) { const o = g && g.getObjectByName(name); if (!o) return null; const v = new THREE.Vector3(); o.getWorldPosition(v); return v; }
function build() {
  B = { g: new THREE.Group(), gate: null, plaque: null, sign: null, gems: [], crystals: [], start: null, front: null, signKey: '' };
  B.g.name = 'star-academy-gate'; scene.add(B.g);
  const [x, z] = AT, y = groundAt(x, z), g = modelClone('ACADEMYMODELS', 'sa_gate');
  if (g) {
    g.scale.setScalar(SCALE); g.position.set(x, y, z); g.rotation.y = RY; B.g.add(g); g.updateMatrixWorld(true); register(g); B.gate = g;
    for (let i = 0; i < 10; i++) { const m = g.getObjectByName('gem' + i); if (m && m.isMesh) { m.material = own(m.material); B.gems.push(m); } }
    ['crystal_l', 'crystal_r'].forEach(k => { const m = g.getObjectByName(k); if (m && m.isMesh) { m.material = own(m.material); B.crystals.push(m); } });
    [-1, 1].forEach(sd => colliders.push({ x: x + Math.cos(RY) * sd * 1.45 * SCALE, z: z - Math.sin(RY) * sd * 1.45 * SCALE, r: 0.34 }));   // 兩根柱子
  }
  B.start = mark(g, 'bridge') || new THREE.Vector3(x + DIR[0] * 1.6, y + 0.13, z + DIR[1] * 1.6); U.uStart.value.copy(B.start);
  const f = mark(g, 'front'); B.front = f ? [f.x, f.z] : [x - DIR[0] * 1.1, z - DIR[1] * 1.1];
  const hit = (px, pz) => Math.hypot(px - x, pz - z) < 2.0; clearArea(hit); clearFlowers(hit);   // 平台底下不長草和野花
  // 石碑：拱門左前方，面向台地（從南邊走過來看得到）
  const pq = modelClone('ACADEMYMODELS', 'sa_plaque');
  if (pq) {
    const lx = -2.3, lz = 1.1, px = x + Math.cos(RY) * lx + Math.sin(RY) * lz, pz = z - Math.sin(RY) * lx + Math.cos(RY) * lz;
    pq.position.set(px, groundAt(px, pz), pz); pq.rotation.y = RY + Math.PI; B.g.add(pq); pq.updateMatrixWorld(true); register(pq); B.plaque = pq; colliders.push({ x: px, z: pz, r: 0.38 });
    B.sign = label(pq, 'face', (c, w, h) => words(c, w, h, '#f6f1ff', '#5a5a8a', [['光橋石門', 0.2, 0.3]]), 256); const lm = pq.children[pq.children.length - 1]; if (B.sign && lm && lm.isMesh) bend(lm.material);   // 碑上的字也跟著遠景彎曲（不然離遠了字會浮在碑的上方）
  }
  B.bridge = bridge(); B.g.add(B.bridge);
  grow = growTo = isOpen() ? 1 : 0.06;
  paintSign();
}
function paintSign() {
  if (!B || !B.sign) return;
  const n = Math.max(0, NEED - lit()), key = isOpen() ? 'open' : 'n' + n; if (key === B.signKey) return; B.signKey = key;
  B.sign.draw((c, w, h) => words(c, w, h, '#f6f1ff', '#5a5a8a', isOpen() ? [['光橋石門', 0.17, 0.26], ['通往', 0.12, 0.52], ['星環學院', 0.15, 0.72]] : [['光橋石門', 0.17, 0.26], ['再點亮', 0.12, 0.52], [`${n} 座燈塔`, 0.15, 0.72]]));
}
/** 拱頂徽章的十顆寶石：各科點亮的比例；兩盞水晶燈：光橋接起來以後亮著 */
function paintGems() {
  const subs = TA.SUBJECTS, on = isOpen(), n = skyU.night.value;
  B.gems.forEach((m, i) => {
    const s = subs[i]; if (!s) return; const u = TA.DATA.units[s.id] || [], k = u.length ? u.filter(x => ((TA.S.units || {})[x.id] || {}).stars > 0).length / u.length : 0;
    m.material.color.set(k > 0 ? s.color : '#e6e8f2'); if (m.material.emissive) { m.material.emissive.set(s.color); m.material.emissiveIntensity = k > 0 ? 0.35 + k * 1.3 + n * 0.5 : 0.04; }
  });
  B.crystals.forEach(m => { if (m.material.emissive) { m.material.emissive.set('#bfe6ff'); m.material.emissiveIntensity = on ? 0.9 + n * 1.2 : 0.12; } });
}

/** 城堡底部（城牆與浮空岩相接的地方）在畫面上的位置：光橋遠處往那裡收 */
let castle = null, castleAt = null;
const _w = new THREE.Vector3();
function aimCastle() {
  if (!castle) {
    castle = scene.getObjectByName('far:castle'); if (!castle) { U.uAim.value = 0; return; }
    castle.updateMatrixWorld(true); const bb = new THREE.Box3(); castle.traverse(m => { if (m.isMesh) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } });
    const c = bb.getCenter(new THREE.Vector3()); castleAt = castle.worldToLocal(new THREE.Vector3(c.x, bb.min.y, c.z)).multiplyScalar(0.45);   // 城堡原點在城身中段；往浮空岩底部走 45% 是城牆腳
  }
  if (!castle.visible) { U.uAim.value = 0; return; }
  const v = castle.localToWorld(_w.copy(castleAt)).applyMatrix4(camera.matrixWorldInverse);
  if (v.z > -1) { U.uAim.value = 0; return; }   // 城堡在鏡頭後面
  v.applyMatrix4(camera.projectionMatrix); U.uTarget.value.set(v.x, v.y);
  U.uAim.value = 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(v.x), Math.abs(v.y)), 1.15, 1.7);   // 城堡偏出畫面太多：慢慢改回照真實位置畫
}
/* ---------- 每一格 ---------- */
export function init(c) { ctx = c; try { build(); } catch (e) { console.warn('光橋石門建立失敗：', e); B = null; } }
export function update(dt, t) {
  if (!B) return;
  U.uTime.value = t; U.uNight.value = skyU.night.value; aimCastle();
  if (grow < growTo) grow = Math.min(growTo, grow + dt / 7); else grow = growTo;   // 剛接起來：七秒內從石門長到天上
  U.uGrow.value = isOpen() ? grow : 0.05 + Math.sin(t * 1.7) * 0.015;   // 還沒接起來：石門後面只有零星幾級光
  if ((tickT -= dt) > 0) return; tickT = 2;
  const s = rec();
  if (!s.open && forced == null && lit() >= NEED && ctx.started()) {
    s.open = dayKey(); save(); growTo = 1; grow = 0.06; Audio.sfx('rare');
    ui.toast('✨ 學院台地東北角的崖邊，光橋接到天上的城堡了');
    memo.add('光橋接起來了', '點亮了三座單元燈塔，學院台地的崖邊升起一條通往城堡的光橋。', { key: 'sa:open', icon: '🌉' });
    const L1 = D().letter; if (L1 && !s.letter) { s.letter = 1; save(); social.sendLetter({ fromName: HOST().name, title: L1.title, open: L1.open, text: L1.text, close: L1.close }); setTimeout(() => ui.toast(`✉️ 收到一封信：「${L1.title}」`), 1800); }
  }
  paintSign(); paintGems();
}
const near = (x, z) => B && Math.hypot(x - B.front[0], z - B.front[1]) < 1.5;
export const hint = (x, z) => (near(x, z) ? (isOpen() ? '走上光橋' : '光橋石門') : '');
export function act(x, z) { if (!near(x, z)) return false; ctx.busy(() => isOpen() ? go() : locked()); return true; }
async function locked() {
  const n = Math.max(1, NEED - lit()), g = D().gate || {};
  await ui.say(say(), one(g.locked).replace(/\{n\}/g, n) || `石門後面只有零星的光。再點亮 ${n} 座單元燈塔，光橋就接得起來。`);
  ui.closeDialog();
}
/** 走上光橋：第一次聽守門人說三句，之後一句；然後自己往上走幾步、畫面亮成一片白，進城堡 */
async function go() {
  const s = rec(), g = D().gate || {};
  if (!s.first) { s.first = dayKey(); save(); for (const l of (g.first || []).slice(0, 3)) await ui.say(say(), l); }
  else if ((g.open || []).length) await ui.say(say(), one(g.open));
  ui.closeDialog();
  const back = ctx.view(-Math.atan2(DIR[0], -DIR[1]), 0.12);   // 鏡頭在背後、順著光橋看上去
  const p = ctx.player.position, from = p.clone(), to0 = B.start.clone(), d0 = Math.hypot(to0.x - from.x, to0.z - from.z);
  lift = { t: 0, from, d0, y0: from.y };
  Audio.sfx('rare'); white('rise');
  await new Promise(r => { lift.done = r; });
  back(); lift = null; ctx.enter();
  setTimeout(() => white(''), 150);
}
let veil = null;
/** 白光：'rise' 走上光橋時慢慢亮成一片白、'flash' 一下子全白、'' 散開 */
function white(mode) {
  if (!veil) { veil = document.createElement('div'); veil.className = 'sa-white'; document.body.appendChild(veil); }
  veil.classList.remove('rise', 'flash'); if (mode) { void veil.offsetWidth; veil.classList.add(mode); }
}
/** 走上光橋那幾秒：角色的位置與面向（main.js 每格套用，不貼地、不受重力） */
export function liftPose(dt) {
  if (!lift || !B) return null;
  lift.t += dt; const d = lift.t * 2.3;
  if (lift.t > 3.6 && lift.done) { const r = lift.done; lift.done = null; r(); }
  let x, y, z;
  if (d < lift.d0) { const k = d / Math.max(lift.d0, 1e-3); x = lift.from.x + (B.start.x - lift.from.x) * k; z = lift.from.z + (B.start.z - lift.from.z) * k; y = lift.y0 + (B.start.y - lift.y0) * Math.min(1, k * 1.5); }
  else { const s = d - lift.d0; x = B.start.x + DIR[0] * s; z = B.start.z + DIR[1] * s; y = B.start.y + hAt(s); }
  return { x, y, z, ry: Math.atan2(DIR[0], DIR[1]) };
}
/** 從城堡出來：站在石門前、面向台地，白光散開 */
export function back() {
  const p = ctx.player; if (!B) return;
  p.position.set(B.front[0], groundAt(B.front[0], B.front[1]), B.front[1]); p.rotation.y = RY;
  white('flash'); setTimeout(() => white(''), 60);
}
export const DOOR = () => (B ? B.front : [AT[0] - DIR[0] * 1.1, AT[1] - DIR[1] * 1.1]);
export const debug = () => ({ open: isOpen(), rec: Object.assign({}, rec()), lit: lit(), need: NEED, at: AT, dir: DIR, ry: RY, front: B && B.front, start: B && B.start && B.start.toArray(), gems: B ? B.gems.length : 0, grow });
