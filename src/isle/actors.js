/* 潮汐小島 · 3D 角色模型（Tripo 產生、tools/glb_slim.py 轉檔）
   模型檔是 src/isle/models/<id>.js（GLB 以 base64 存在 window.TA.MODELS），用到時才以 <script> 載入，離線雙擊也能用。
   dress(ch, key)：把 3D 模型套到既有的 chibi 角色上——原本的 Q 版身體隱藏但保留（帽子、手持工具、雨傘等程式照常運作，
   會改掛到模型的骨頭上），animate() 依移動、坐下、拍手切換骨架動作。 */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { clone as cloneSkinned } from './vendor/SkeletonUtils.js';
import { bend } from './engine.js';
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
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
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

/** 把 key（島民 sid、'player'、'shop'…）對應的模型套到角色上；沒有模型就維持原樣 */
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
  if (head && u.hatSlot) { head.add(u.hatSlot); u.hatSlot.position.set(0, 0.075, 0.01); u.hatSlot.scale.setScalar(0.42 / HEIGHT); }
  if (head && u.partyHat) { head.add(u.partyHat); u.partyHat.position.set(0.02, 0.12, 0); u.partyHat.scale.setScalar(0.42 / HEIGHT); }
  if (hand && u.hand) { hand.add(u.hand); u.hand.position.set(0, 0.03, 0); u.hand.scale.setScalar(0.8 / HEIGHT); }
  u.gltf = { mixer, acts, cur: null, model, head };
  play(u.gltf, 'idle');
  return true;
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
}
