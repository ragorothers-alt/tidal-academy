/* 潮汐小島 · 3D 角色模型（Tripo 產生、tools/glb_slim.py 轉檔）
   模型檔是 src/isle/models/<id>.js（GLB 以 base64 存在 window.TA.MODELS），用到時才以 <script> 載入，離線雙擊也能用。
   dress(ch, key)：把 3D 模型套到既有的 chibi 角色上——原本的 Q 版身體隱藏但保留（帽子、手持工具、雨傘等程式照常運作，
   會改掛到模型的骨頭上），animate() 依移動、坐下、拍手切換骨架動作。 */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { clone as cloneSkinned } from './vendor/SkeletonUtils.js';
import { bend, cullable } from './engine.js';
import { MODEL_IDS } from './model-list.js';

/** 角色 → 模型 id（之後補上的模型加在這裡） */
export const CAST = {
  chinese: 'qianxiao', english: 'daniya', math: 'younuo', history: 'fuluoluo', geography: 'qingxiao',
  civics: 'feixue', physics: 'xin', chemistry: 'changli', biology: 'sen', earth: 'aimisi',
  player: 'player', shop: 'achao', library: 'shushu', hotel: 'hotelmgr'
};
/** 已經做好的模型（src/isle/models/ 裡有檔案的）；其他角色維持原本的 Q 版造型 */
export const READY = new Set(MODEL_IDS);
const HEIGHT = 1.42;   // 模型（原始高度 1）在遊戲裡的身高
export const FACING = -Math.PI / 2;   // Tripo 模型正面朝 +X，遊戲角色正面朝 +Z

const cache = {}, loading = {};
const base = () => window.__MODEL_BASE || 'src/isle/models/';
function loadScript(id) {
  return new Promise((res, rej) => {
    if (window.TA && window.TA.MODELS && window.TA.MODELS[id]) { res(); return; }
    const s = document.createElement('script'); s.src = base() + id + '.js'; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s);
  });
}
export function loadModel(id, kind) {
  if (cache[id]) return Promise.resolve(cache[id]);
  return loading[id] || (loading[id] = loadScript(id).then(() => new Promise((res, rej) => {
    const b64 = window.TA.MODELS[id], bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    new GLTFLoader().parse(bin.buffer, '', g => {
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = cullable(o);
        o.material.side = THREE.DoubleSide;   // 裙擺、飄帶是單層面
        o.material.defines = Object.assign(o.material.defines || {}, { TA_MODEL: '' });
        if (kind !== 'none') bend(o.material, kind || 'char');   // 'none'：遠景（fantasy.js）不彎曲，自己處理大氣透視   // 跟場景一樣的滾筒地平線彎曲與寫實色彩（擺設可指定風擺等效果）
      });
      cache[id] = g; delete window.TA.MODELS[id]; res(g);
    }, rej);
  })));
}
// 骨頭名稱：Tripo 骨架（Head、R_Hand）或網頁版匯出的 Mixamo 骨架（mixamorig:Head，GLTFLoader 會去掉冒號）
const findBone = (root, names) => { let b = null; root.traverse(o => { if (!b && o.isBone && names.includes(o.name.replace(/^mixamorig:?/, ''))) b = o; }); return b; };

/* ---------- v8.8 表情臉皮：Tripo 模型的眼睛和嘴畫在貼圖上、不會動。在臉上疊一層共用模型骨架的薄片，眨眼、說話、有表情時才出現；
   平常隱藏，看到的仍是模型原本的臉（tools/face_bake.py、face_frames.py 產生 data/modelfaces.js） ---------- */
const IDENT = new THREE.Matrix4(), faceTex = {};
const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
function faceFrames(id, key, f) {   // 同一個模型的表情格貼圖共用
  const k = id + '/' + key; if (faceTex[k]) return faceTex[k];
  const out = {};
  for (const n in f) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; img.onload = () => { t.needsUpdate = true; }; img.src = f[n]; out[n] = t; }
  return (faceTex[k] = out);
}
function faceSkin(model, id) {
  const F = (((window.TA || {}).ISLE || {}).MODELFACES || {})[id]; if (!F) return null;
  let sk = null; model.traverse(o => { if (!sk && o.isSkinnedMesh) sk = o; }); if (!sk) return null;
  const parts = {};
  for (const key of ['eyes', 'mouth']) {
    const d = F[key]; if (!d) continue;
    const g = new THREE.BufferGeometry(), jw = new Uint8Array(unb64(d.jw)), n = jw.length / 8, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < 4; k++) s += jw[i * 8 + 4 + k]; for (let k = 0; k < 4; k++) { si[i * 4 + k] = jw[i * 8 + k]; sw[i * 4 + k] = jw[i * 8 + 4 + k] / (s || 1); } }
    const pq = new Uint16Array(unb64(d.p)), pos = new Float32Array(pq.length), q = d.q;   // 座標存成 0–65535，依 q（最小值、範圍）還原
    for (let i = 0; i < pq.length; i++) pos[i] = q[i % 3] + pq[i] / 65535 * q[3 + i % 3];
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(unb64(d.n)), 3, true));
    g.setAttribute('uv', new THREE.BufferAttribute(new Uint16Array(unb64(d.uv)), 2, true));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(unb64(d.i)), 1));
    const tex = faceFrames(id, key, d.f), src = sk.material;
    const m = new THREE.MeshStandardMaterial({ map: Object.values(tex)[0], color: src.color, roughness: src.roughness, metalness: src.metalness, envMapIntensity: src.envMapIntensity,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    m.defines = { TA_MODEL: '' }; bend(m, 'char');   // 和模型同一套光影、地平線彎曲
    const mesh = new THREE.SkinnedMesh(g, m); mesh.bind(sk.skeleton, IDENT);   // 和 GLTFLoader 一樣用單位矩陣綁定：頂點是原始網格座標
    mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false; mesh.visible = false; mesh.renderOrder = 2; mesh.userData.faceSkin = true;
    sk.parent.add(mesh); parts[key] = { mesh, tex, cur: null };
  }
  return parts;
}
function setFace(p, frame) {
  if (!p || p.cur === frame) return;
  p.cur = frame; p.mesh.visible = !!(frame && p.tex[frame]); if (p.mesh.visible) p.mesh.material.map = p.tex[frame];
}

/** 把 key（島民 sid、'player'、'shop'…）對應的模型套到角色上；沒有模型就維持原樣 */
/** v8.7 帽子掛點的高度（頭骨座標）：帽子是照 Q 版頭頂在帽子座標 0.4 的地方設計的，讓那一點落在這個角色的頭髮頂端下 1cm。
    頭髮綁在頭骨上，量一次就好（任何動作下相對位置都一樣）；只看頭頂正上方 16cm 內的頂點，避開肩上的長髮與手 */
const hv = new THREE.Vector3(), hw = new THREE.Vector3();
function hatY(model, head) {
  model.updateMatrixWorld(true); head.getWorldPosition(hw);
  let top = -Infinity;
  model.traverse(o => {
    if (!o.isSkinnedMesh) return; const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 2) { o.getVertexPosition(i, hv); hv.applyMatrix4(o.matrixWorld); if (hv.y > hw.y && Math.hypot(hv.x - hw.x, hv.z - hw.z) < 0.16 && hv.y > top) top = hv.y; }
  });
  if (!isFinite(top)) return 0.075;
  hv.set(hw.x, top - 0.01, hw.z); head.worldToLocal(hv);
  return THREE.MathUtils.clamp(hv.y - 0.4 * 0.42 / HEIGHT, 0.02, 0.2);
}
export async function dress(ch, key) {
  const id = CAST[key]; if (!id || !READY.has(id) || !ch || ch.userData.gltf) return false;
  let g; try { g = await loadModel(id); } catch (e) { console.warn('角色模型載入失敗：', id, e); return false; }
  const u = ch.userData, model = cloneSkinned(g.scene); model.scale.setScalar(HEIGHT); let mix = false; model.traverse(o => { if (o.isBone && /^mixamorig/.test(o.name)) mix = true; }); model.rotation.y = mix ? 0 : FACING;   // 網頁版匯出（Mixamo 骨架）本來就朝 +Z
  u.body.visible = false; ch.add(model);
  const mixer = new THREE.AnimationMixer(model), acts = {};
  g.animations.forEach(c => { acts[c.name.replace(/\.\d+$/, '')] = mixer.clipAction(c); });   // 網頁版匯出的名稱帶 .001
  if (acts.walk) acts.walk.timeScale = 1.25; if (acts.run) acts.run.timeScale = 1.1;
  if (acts.greet_01) { acts.greet_01.setLoop(THREE.LoopRepeat); }
  const head = findBone(model, ['Head']), hand = findBone(model, ['R_Hand', 'R_Wrist', 'RightHand']);
  // 帽子掛到頭骨、手持工具掛到右手骨（骨頭的世界縮放是 HEIGHT，配件要縮回原本的大小）
  const hy = head ? hatY(model, head) : 0.075;   // v8.7 依這個角色的頭髮頂端放帽子（以前全員同一個高度：森、阿潮的魔女帽浮在頭上 8–9cm）
  if (head && u.hatSlot) { head.add(u.hatSlot); u.hatSlot.position.set(0, hy, 0.01); u.hatSlot.scale.setScalar(0.42 / HEIGHT); }
  if (head && u.partyHat) { head.add(u.partyHat); u.partyHat.position.set(0.02, hy + 0.045, 0); u.partyHat.scale.setScalar(0.42 / HEIGHT); }
  if (hand && u.hand) { hand.add(u.hand); u.hand.position.set(0, 0.03, 0); u.hand.scale.setScalar(0.8 / HEIGHT); }
  // 疊加在骨架動作上的程式姿勢（使用工具、空中縮腿）要用到的骨頭；找不到的就略過
  const B = n => findBone(model, n);
  // v8.9 Tripo 骨架的上臂叫 R_Upperarm、脊椎叫 Spine01／Spine02（以前只認 Mixamo 與 R_UpperArm，導師的手臂與身體姿勢都沒套上）
  const rig = { rArm: B(['RightArm', 'R_UpperArm', 'R_Upperarm']), rFore: B(['RightForeArm', 'R_Forearm']), rHand: hand, lArm: B(['LeftArm', 'L_UpperArm', 'L_Upperarm']), lFore: B(['LeftForeArm', 'L_Forearm']),
    lHand: B(['L_Hand', 'L_Wrist', 'LeftHand']),   // v8.9 做事時左手拿的道具（琴、畫板）
    spine: B(['Spine1', 'Spine', 'Spine01']), lUp: B(['LeftUpLeg', 'L_Thigh']), lLeg: B(['LeftLeg', 'L_Calf']), rUp: B(['RightUpLeg', 'R_Thigh']), rLeg: B(['RightLeg', 'R_Calf']) };
  u.gltf = { mixer, acts, cur: null, model, head, rig, useT: 1, useKind: null, base: model.position.clone(), baseS: HEIGHT, face: faceSkin(model, id) };
  play(u.gltf, 'idle');
  return true;
}
/* ---------- 疊加姿勢：在骨架動作之上，以角色自己的座標軸旋轉骨頭（v7.0） ----------
   角色座標：+Z 前、+Y 上、+X 左。flex：繞 X 軸往前抬（手臂、大腿）；負值往後。 */
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const oq = new THREE.Quaternion(), pq = new THREE.Quaternion(), rq = new THREE.Quaternion(), wa = new THREE.Vector3();
function turn(ch, bone, axis, ang) {
  if (!bone || !ang) return;
  ch.getWorldQuaternion(oq); wa.copy(axis).applyQuaternion(oq);   // 角色的軸 → 世界
  bone.parent.getWorldQuaternion(pq); rq.setFromAxisAngle(wa, ang);
  bone.quaternion.premultiply(pq.clone().invert().multiply(rq).multiply(pq));   // L' = P⁻¹ · R · P · L
  bone.updateMatrixWorld(true);
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const USE_LEN = { rod: 0.75, net: 0.6, shovel: 0.7, can: 1.0 };   // 第三人稱使用工具的動作長度（秒）
/** 使用工具：拋竿（往後舉過頭再甩出去）、揮網（橫掃）、挖掘（舉起往下鏟、身體前彎）、澆水（手伸出去、手腕傾斜）；沒拿工具時是伸手 */
function toolPose(ch, gl, dt) {
  if (gl.useT >= 1) return;
  const k = gl.useKind, len = USE_LEN[k] || 0.45; gl.useT = Math.min(1, gl.useT + dt / len);
  const s = gl.useT, R = gl.rig, env = Math.sin(Math.PI * Math.min(1, s * 1.15));
  if (k === 'rod') {
    const up = ss(0, 0.35, s), fw = ss(0.35, 0.6, s), back = ss(0.8, 1, s);
    turn(ch, R.spine, AX, (-0.14 * up + 0.32 * fw) * (1 - back));
    turn(ch, R.rArm, AX, -(2.5 * up - 1.6 * fw) * (1 - back));
    turn(ch, R.rFore, AX, -0.5 * up * (1 - fw));
  } else if (k === 'net') {
    const sw = ss(0.12, 0.7, s);
    turn(ch, R.spine, AY, (-0.35 + 0.8 * sw) * env);
    turn(ch, R.rArm, AX, -1.35 * env);
    turn(ch, R.rArm, AY, (-0.9 + 1.9 * sw) * env);
  } else if (k === 'shovel') {
    const up = ss(0, 0.35, s), dn = ss(0.35, 0.6, s), back = ss(0.75, 1, s);
    turn(ch, R.spine, AX, (0.5 * dn - 0.08 * up) * (1 - back));
    turn(ch, R.rArm, AX, -(1.7 * up - 1.2 * dn) * (1 - back)); turn(ch, R.lArm, AX, -(1.3 * up - 0.9 * dn) * (1 - back));
    turn(ch, R.rFore, AX, -0.4 * up * (1 - back)); turn(ch, R.lFore, AX, -0.4 * up * (1 - back));
  } else if (k === 'can') {
    const h = ss(0, 0.2, s) * (1 - ss(0.8, 1, s));
    turn(ch, R.rArm, AX, -1.05 * h); turn(ch, R.rHand, AZ, -0.8 * h * ss(0.15, 0.35, s)); turn(ch, R.spine, AX, 0.12 * h);
  } else { turn(ch, R.rArm, AX, -0.95 * env); turn(ch, R.spine, AX, 0.15 * env); }
}
/** 空中：雙腿縮起、手臂往上揚（u.airK 0–1 由 main.js 的 jumpPose 設定；第三跳另外整個身體前空翻） */
function airPose(ch, gl, k) {
  if (!(k > 0.001)) return; const R = gl.rig;
  turn(ch, R.lUp, AX, -0.75 * k); turn(ch, R.rUp, AX, -0.55 * k); turn(ch, R.lLeg, AX, 1.15 * k); turn(ch, R.rLeg, AX, 0.9 * k);
  turn(ch, R.lArm, AZ, -0.9 * k); turn(ch, R.rArm, AZ, 0.9 * k); turn(ch, R.lArm, AX, -0.5 * k); turn(ch, R.rArm, AX, -0.5 * k);
}
function play(gl, name) {
  if (gl.cur === name) return; const a = gl.acts[name]; if (!a) return;
  a.reset().setEffectiveWeight(1).fadeIn(0.25).play();
  if (gl.cur && gl.acts[gl.cur]) gl.acts[gl.cur].fadeOut(0.25);
  gl.cur = name;
}
const tq = new THREE.Quaternion(), tv = new THREE.Vector3(), tm = new THREE.Matrix4();
/** chars.js 的 animate() 遇到套了模型的角色時改呼叫這裡 */
export function animateModel(ch, dt, moving, rate = 1) {
  const u = ch.userData, gl = u.gltf;
  if (u.clapT > 0) u.clapT -= dt;
  play(gl, u.sit ? 'sit' : u.clapT > 0 ? 'greet_01' : moving === 2 ? 'run' : moving ? 'walk' : 'idle');
  gl.mixer.update(moving ? dt * rate : dt);   // 走路動作跟著速度放慢
  // 看著對方：在動作之上把頭轉向目標（左右 ±60°、上下 ±25°）
  if (u.look && gl.head && !u.sit) {
    gl.head.updateWorldMatrix(true, false);
    tv.copy(u.look); gl.head.parent.worldToLocal(tv); tv.normalize();
    const yaw = THREE.MathUtils.clamp(Math.atan2(tv.x, tv.z), -1, 1), pitch = THREE.MathUtils.clamp(-Math.asin(THREE.MathUtils.clamp(tv.y, -1, 1)) * 0.5, -0.4, 0.4);
    gl.lookK = Math.min(1, (gl.lookK || 0) + dt * 4);
    tq.setFromEuler(new THREE.Euler(pitch * gl.lookK, yaw * gl.lookK * 0.6, 0, 'YXZ')); gl.head.quaternion.multiply(tq);
  } else gl.lookK = 0;
  // 表情反應（v7.0）：3D 模型沒有會動的臉，改用頭與身體表現——說話時點頭、開心時小跳並歪頭、難過低頭、驚訝往後仰
  if (u.exprT > 0) { u.exprT -= dt; if (u.exprT <= 0) { u.exprT = 0; u.expr = 'neutral'; } }
  gl.t = (gl.t || 0) + dt;
  { const ex = u.expr || 'neutral', k = Math.min(1, dt * 8);
    gl.rp = (gl.rp || 0) + ((ex === 'sad' ? 0.3 : ex === 'surprised' ? -0.2 : ex === 'angry' ? 0.12 : 0) - (gl.rp || 0)) * k;
    gl.hopK = (gl.hopK || 0) + ((ex === 'happy' && !u.sit && !moving ? 1 : 0) - (gl.hopK || 0)) * Math.min(1, dt * 5);
    const nod = u.talk ? Math.sin(gl.t * 8.5) * 0.045 + 0.02 : 0, tilt = ex === 'happy' ? Math.sin(gl.t * 5.5) * 0.09 * gl.hopK : 0;
    if (gl.head && !u.sit) { turn(ch, gl.head, AX, gl.rp + nod); turn(ch, gl.head, AZ, tilt); }
    gl.hop = Math.abs(Math.sin(gl.t * 7.5)) * 0.055 * gl.hopK;   // 開心：原地輕輕跳（玩家的模型由 main.js 的 jumpPose 加上去）
    if (!u.isPlayer) gl.model.position.y = gl.base.y + gl.hop; }
  if (gl.face) {   // v8.8 臉：每 2–6 秒眨一次眼、說話時嘴巴一開一合；開心笑眼張嘴、難過垂眼抿嘴、驚訝嘴巴張成 o、睏了（心情或深夜）眼皮半閉
    u.blink -= dt; if (u.blink < 0) u.blink = 2 + Math.random() * 4;
    const ex = u.expr || 'neutral', rest = ex === 'sad' ? 'sad' : ex === 'surprised' ? 'oh' : null;
    setFace(gl.face.eyes, ex === 'happy' ? 'happy' : u.blink < 0.12 ? 'closed' : ex === 'sad' ? 'sad' : u.mood === 'sleepy' && ex === 'neutral' ? 'half' : null);
    setFace(gl.face.mouth, u.talk ? (Math.sin(gl.t * 17) > -0.2 ? 'talk' : rest) : ex === 'happy' ? 'smile' : rest);
  }
  // 使用工具：life.js 等設 swing = 1 表示剛用了一下。第三人稱由這裡播；第一人稱的手（fphand.js）看 swingFP
  if (u.swing > 0) { if (!u.sit) { gl.useT = 0; gl.useKind = u.tool || null; } u.swing = 0; u.swingFP = 1; }
  if (gl.rig && (gl.useT < 1 || u.airK > 0.001)) { toolPose(ch, gl, dt); airPose(ch, gl, u.airK); }
  if (gl.rig) actPose(ch, gl, dt, u);
  if (u.propR || u.propL) propFollow(ch, gl, u);
}

/* ---------- v8.9 做事的姿勢：讀書、寫字、拉琴、修東西、澆花、伸展、放風箏……（u.act 由 routine.js 設定，u.actT 是活動開始後的秒數）
   疊在骨架動作（站著或坐著）上；換活動時 0.4 秒淡入。玩家走近、頭轉去看人時就不再低頭。 ---------- */
const pulse = (t, every, len) => { const p = ((t % every) + every) % every; return p < len ? Math.sin(Math.PI * p / len) : 0; };   // 每 every 秒來一次、長 len 秒的一下
export const POSE_TUNE = {};
function actPose(ch, gl, dt, u) {
  const R = gl.rig, a = u.act || null;
  if (a !== gl.actName) { gl.actName = a; gl.actK = 0; }
  if (!a) return;
  const k = gl.actK = Math.min(1, (gl.actK || 0) + dt * 2.5), t = u.actT != null ? u.actT : gl.t, s = Math.sin, free = !u.look;
  const T = (b, ax, ang) => turn(ch, b, ax, ang * k);
  const arms = (rx, ry, rf, lx, ly, lf) => { T(R.rArm, AX, rx); T(R.rArm, AY, ry); T(R.rFore, AX, rf); T(R.lArm, AX, lx); T(R.lArm, AY, ly); T(R.lFore, AX, lf); };
  const headDown = d => { if (free && gl.head) T(gl.head, AX, d); };
  if (POSE_TUNE[a]) { POSE_TUNE[a]({ T, R, AX, AY, AZ, t, s, arms, headDown, head: gl.head, free, pulse, ss }); return; }   // 調整姿勢用（主控台改 POSE_TUNE 即時看效果）
  // 手臂角度用骨架掃描反推：各活動先訂好雙手要在胸前、頭邊或腰前的哪裡，再挑最接近的上臂（前抬、內收）與前臂角度（誤差約 2–5 公分）
  switch (a) {
    case 'read': arms(0, 0.8, -0.9, -0.2, -0.6, -0.6); headDown(0.3); break;
    case 'cards': arms(-0.2, 0.8, -1.2 + pulse(t, 5, 0.6) * 0.2, 0, -0.2, -0.3); headDown(0.25); break;
    case 'write': case 'sketch': arms(-0.4 + s(t * 4) * 0.06, 0.6, -0.6 + s(t * 5.3) * 0.1, -0.2, -0.8, -0.6); headDown(0.32); break;
    case 'violin': arms(0, 0.8 + s(t * 3.2) * 0.25, -1.5, -0.6, -0.2, -1.2); T(R.spine, AZ, s(t * 1.6) * 0.04); if (gl.head) T(gl.head, AZ, -0.22); break;
    case 'sing': arms(0, 0, -0.6, 0, 0.2, -0.6); T(R.rArm, AZ, 0.25); T(R.lArm, AZ, -0.25); T(R.spine, AZ, s(t * 2) * 0.06); break;
    case 'tambourine': arms(-0.8 + s(t * 6) * 0.1, 0, -1.8, -0.2, -0.8, -0.9 + pulse(t, 1.5, 0.3) * 0.3); T(R.rHand, AZ, s(t * 12) * 0.3); break;
    case 'tinker': T(R.spine, AX, 0.42); arms(-0.6, 0.4, -Math.abs(s(t * 5)) * 0.5, -0.6, -0.2, 0); headDown(0.2); break;
    case 'water': T(R.spine, AX, 0.1); arms(-0.8, 0.2, 0, 0, 0, 0); T(R.rHand, AZ, -0.6); break;
    case 'observe': T(R.spine, AX, 0.5); arms(-0.6, 0.6, 0, 0, 0, -0.3); headDown(0.3); break;
    case 'look': arms(-1.2, 0.4, -1.5, 0, 0, 0); if (free && gl.head) { T(gl.head, AX, -0.12); T(gl.head, AY, s(t * 0.3) * 0.3); } break;
    case 'stars': { const p = pulse(t, 9, 2.2); if (free && gl.head) T(gl.head, AX, -0.45); arms(-2.2 * p, 0.2 * p, -0.6 * p, 0, 0, 0); break; }
    case 'tea': case 'picnic': { const p = pulse(t, 7, 1.6); arms(-0.2 - p * 0.2, 0.8 - p * 0.2, -1.2 - p * 0.6, 0, 0, -0.3); if (free && gl.head) T(gl.head, AX, -0.12 * p); break; }
    case 'cook': T(R.spine, AX, 0.2); arms(-0.6 + s(t * 2.2) * 0.12, 0.4 + s(t * 2.2 + 1.57) * 0.25, 0, 0, 0, -0.3); headDown(0.2); break;
    case 'stretch': {   // 早操：12 秒一輪——雙手上舉、左右側彎、向前平舉、轉身；同一場的人用同一個 actT，動作一致
      const p = t % 12, e = (x0, x1) => ss(x0, x0 + 0.6, p) * (1 - ss(x1 - 0.6, x1, p));
      const up = e(0, 6), fw = e(6, 9), tw = e(9, 12);
      T(R.rArm, AZ, 2.7 * up + 1.4 * tw); T(R.lArm, AZ, -2.7 * up - 1.4 * tw); T(R.rArm, AX, -1.5 * fw); T(R.lArm, AX, -1.5 * fw);
      T(R.spine, AZ, s(Math.PI * Math.max(0, p - 3) / 1.5) * 0.3 * e(3, 6)); T(R.spine, AY, s(Math.PI * Math.max(0, p - 9) / 1.5) * 0.45 * tw); break;
    }
    case 'chess': { const mv = pulse(t, 7, 1.2); headDown(0.35); arms(-0.8 * mv, 0.4 * mv, 0, -0.2 * (1 - mv), -0.8 * (1 - mv), -1.8 * (1 - mv)); break; }   // 托著下巴想，偶爾伸手走一步棋
    case 'kite': arms(-1.6 + s(t * 1.3) * 0.08, 0.2, -0.3, -0.6, -0.4, -0.9); if (free && gl.head) T(gl.head, AX, -0.4); break;
    case 'shop': { const p = pulse(t, 6, 1.4); headDown(0.2); arms(-0.6 * p, 0.4 * p, -0.6 * p, 0, 0, 0); break; }
  }
}
/* 手上的道具（chars.js 的 setProps 放在角色底下）：每一格跟著手掌的位置，方向用角色自己的座標，換骨架也一樣 */
export const PROP_AT = {   // y、z：道具的 +Y、+Z 在角色座標裡朝哪裡（+X 左、+Y 上、+Z 前）；two：放在兩手中間；off：相對手掌的位移
  book: { y: [0, 0.75, -0.66], z: [0, 0.66, 0.75], two: true, off: [0, -0.02, -0.02] },   // 書頁朝向臉、書背由下往前上
  cards: { y: [0, 0.7, -0.7], z: [0, 0.7, 0.7] },
  scroll: { y: [0, 0.85, -0.53], z: [0, 0.53, 0.85] }, sketchbook: { y: [0, 0.85, -0.53], z: [0, 0.53, 0.85] },
  brush: { y: [0, 1, 0.15], z: [0, 0, 1] }, pencil: { y: [0.3, 0.9, -0.3], z: [0, 0, 1] },
  violin: { y: [0.5, 0.15, 0.85], z: [-0.3, 0.95, 0] }, bow: { y: [0.85, 0.05, -0.5], z: [0, 1, 0] },   // 琴頸往左前方、弦朝上；弓從右手橫過琴弦往左後
  tambourine: { y: [0, 1, 0], z: [0, 0, 1] }, wrench: { y: [0, -0.3, 1], z: [0, 1, 0.3] }, can: { y: [0, 1, 0], z: [0, 0, 1] },
  lens: { y: [0, -0.4, 1], z: [0, 1, 0.4] }, cup: { y: [0, 1, 0], z: [0, 0, 1] }, ladle: { y: [0, 1, 0.2], z: [0, 0, 1] },
  spool: { y: [0, 1, 0], z: [0, 0, 1], off: [0, 0, 0.02] }, onigiri: { y: [0, 1, 0], z: [0, 0, 1], off: [0, 0, 0.02] }
};
const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
function palm(ch, hand, fore, out) {   // 手掌中心：手腕往手指方向再 7 公分
  hand.getWorldPosition(out); if (fore) { fore.getWorldPosition(pc); pc.subVectors(out, pc).normalize().multiplyScalar(0.07); out.add(pc); }
  return ch.worldToLocal(out);
}
function propFollow(ch, gl, u) {
  const R = gl.rig;
  [[u.propR, R.rHand, R.rFore], [u.propL, R.lHand, R.lFore]].forEach(([g, hand, fore]) => {
    if (!g || !hand) return; const at = PROP_AT[g.userData.id] || { rot: [0, 0, 0], off: [0, 0, 0] };
    palm(ch, hand, fore, pa);
    if (at.two && R.lHand) { palm(ch, R.lHand, R.lFore, pb); pa.add(pb).multiplyScalar(0.5); }
    const off = at.off || [0, 0, 0]; g.position.set(pa.x + off[0], pa.y + off[1], pa.z + off[2]);
    if (at.y) {   // 用兩個方向指定：道具的 +Y 朝 at.y、+Z 大致朝 at.z（角色座標）
      if (!at.q) { const Y = new THREE.Vector3(...at.y).normalize(), X = new THREE.Vector3().crossVectors(Y, new THREE.Vector3(...at.z)).normalize(), Z = new THREE.Vector3().crossVectors(X, Y); at.q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }
      g.quaternion.copy(at.q);
    } else g.rotation.set(at.rot[0], at.rot[1], at.rot[2]);
  });
}
