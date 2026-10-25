/* 潮汐小島 · 第一人稱的手：把角色模型的右臂與右手切下來（保留原本的貼圖與袖口），擺在鏡頭右下角，
   拿著現在的工具（下雨又沒拿工具時撐傘）。走路時跟著步伐晃、轉頭時稍微落後、使用工具時揮動（網子橫掃、鏟子往下挖、
   澆水壺倒水、釣竿拋竿），釣魚時把竿子舉起來、釣魚線從竿尖拉出去；聊天、坐下、看選單時把手放下。 */
import * as THREE from 'three';
import { setTool } from './chars.js';

const ARM = /(Right|R_)(Arm|ForeArm|Forearm|Hand|Wrist|Thumb|Index|Middle|Ring|Pinky)/;   // 右上臂、前臂、手腕、手掌與手指
const HAND = ['RightHand', 'R_Hand', 'R_Wrist'];
// 各工具在畫面裡的擺法（鏡頭空間的位移與旋轉微調）。rotation.x 為正：工具尖端往上抬
export const POSE = {
  none: { p: [0.03, -0.03, 0.03], r: [0.15, 0, 0.12] },
  net: { p: [0, 0, 0], r: [0, 0, 0] },
  rod: { p: [0, 0, 0], r: [0.08, 0, 0] },
  shovel: { p: [0, -0.01, 0], r: [-0.05, 0, 0] },
  can: { p: [0.08, -0.07, -0.18], r: [0, 0.55, -0.25] },   // 壺身直立、壺嘴朝左前方
  umbrella: { p: [0.01, -0.03, 0.05], r: [1.22, 0, -0.26] },   // 傘柄幾乎直立，傘面在頭頂、只看到前緣
};
const USE = { net: 0.45, shovel: 0.5, can: 0.9, rod: 0.55 };   // 使用工具的動作長度（秒）
const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);

/** 從模型目前的姿勢切出右臂：骨頭權重主要在右臂、右手的三角形，換算成手骨頭的座標（之後擺在鏡頭前） */
function cutArm(gl) {
  let sk = null; gl.model.traverse(o => { if (!sk && o.isSkinnedMesh) sk = o; });
  if (!sk) return null;
  const bones = sk.skeleton.bones, hand = bones.find(b => HAND.includes(b.name.replace(/^mixamorig:?/, '')));
  if (!hand) return null;
  // 用待機姿勢切（走路、跑步時手腕的角度不一樣）：先只播待機動作，切完再讓角色照常播放
  const idle = gl.acts.idle;
  if (idle) { gl.mixer.stopAllAction(); idle.reset().setEffectiveWeight(1).play(); gl.mixer.update(0); gl.cur = null; }
  gl.model.updateMatrixWorld(true); sk.skeleton.update();
  const G = sk.geometry, P = G.attributes.position, N = G.attributes.normal, UV = G.attributes.uv, si = G.attributes.skinIndex, sw = G.attributes.skinWeight;
  const want = new Set(); bones.forEach((b, i) => { if (ARM.test(b.name.replace(/^mixamorig:?/, ''))) want.add(i); });
  const keep = new Uint8Array(P.count);
  for (let i = 0; i < P.count; i++) { let b = -1, w = -1; for (let k = 0; k < 4; k++) { const x = sw.getComponent(i, k); if (x > w) { w = x; b = si.getComponent(i, k); } } keep[i] = want.has(b) ? 1 : 0; }
  const idx = G.index ? G.index.array : Array.from({ length: P.count }, (_, i) => i);
  const inv = new THREE.Matrix4().copy(hand.matrixWorld).invert(), v = new THREE.Vector3(), v2 = new THREE.Vector3(), n = new THREE.Vector3();
  const map = new Map(), pos = [], nor = [], uv = [], ind = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (!keep[a] || !keep[b] || !keep[c]) continue;
    for (const i of [a, b, c]) {
      if (!map.has(i)) {
        map.set(i, pos.length / 3);
        v.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); v2.copy(v).addScaledVector(n, 0.01);   // 法線：把頂點沿法線推一點一起蒙皮，再取方向
        sk.applyBoneTransform(i, v); sk.applyBoneTransform(i, v2);
        v.applyMatrix4(sk.matrixWorld).applyMatrix4(inv); v2.applyMatrix4(sk.matrixWorld).applyMatrix4(inv); v2.sub(v).normalize();
        pos.push(v.x, v.y, v.z); nor.push(v2.x, v2.y, v2.z); if (UV) uv.push(UV.getX(i), UV.getY(i));
      }
      ind.push(map.get(i));
    }
  }
  if (idle) idle.stop();
  if (!ind.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (uv.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ind);
  return { geo, mat: sk.material, scale: hand.getWorldScale(new THREE.Vector3()).x };
}
const noRay = () => {};
/** 鏡頭前的手：每幀在鏡頭擺好之後呼叫 update */
export function createHand(player, scene) {
  const u = player.userData, root = new THREE.Group(), piv = new THREE.Group(), arm = new THREE.Group(), holder = new THREE.Group(), tip = new THREE.Object3D();
  root.add(piv); piv.add(arm); arm.add(holder); root.visible = false; scene.add(root);
  let built = false, kind, low = 1, ph = 0, useT = 1, useKind = null, lastYaw = null, lastPitch = 0;
  const sway = new THREE.Vector2(), E = new THREE.Euler();
  function setKind(k) {
    kind = k; setTool({ userData: { hand: holder } }, k === 'umbrella' || k === 'none' ? null : k);
    if (k === 'umbrella') { const g = new THREE.Group(); g.rotation.x = -1.2; const um = u.umbrella.clone(true); um.visible = true; um.position.set(0, 0.8, 0); g.add(um); holder.add(g); }   // 傘柄握在手裡（和工具一樣沿著手掌往前上方）
    if (k === 'rod' && holder.children[0]) { tip.position.set(0, 1.05, 0); holder.children[0].add(tip); }   // 竿尖：釣魚線從這裡拉出去
    holder.traverse(o => { o.frustumCulled = false; o.castShadow = false; o.raycast = noRay; });
  }
  /** o：{ active（第一人稱鏡頭已就位）, show（手舉起來）, camera, tool, umbrella, fishing, moving, run, yaw, pitch, t } */
  function update(dt, o) {
    if (!built && o.active && o.show && u.gltf) {
      built = true; const a = cutArm(u.gltf);
      if (a) {
        const m = new THREE.Mesh(a.geo, a.mat); m.frustumCulled = false; m.receiveShadow = true; m.raycast = noRay; arm.add(m);
        arm.scale.setScalar(a.scale); holder.position.copy(u.hand.position); holder.scale.copy(u.hand.scale);   // 工具和第三人稱一樣握在手骨頭上
      } else built = 'none';
    }
    const ready = built === true;
    const want = o.tool || (o.umbrella ? 'umbrella' : 'none');
    if (ready && want !== kind) setKind(want);
    // 使用工具：life.js 等設 swing = 1，actors.js 播第三人稱動作後轉成 swingFP = 1，這裡接手並歸零
    if (u.gltf && u.swingFP > 0) { if (o.active && o.show && USE[kind]) { useT = 0; useKind = kind; } u.swingFP = 0; }
    low = o.active ? low + ((o.show && ready ? 0 : 1) - low) * Math.min(1, dt * 7) : 1;
    root.visible = ready && o.active && low < 0.97;
    u.fpTip = root.visible && kind === 'rod' ? tip : null;
    if (!root.visible) { lastYaw = null; return; }
    // 放在畫面右下角：依視角換算，橫式、直式螢幕看起來位置差不多（直式放高一點，避開右下角的按鈕）
    const cam = o.camera, tv = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), th = tv * (cam.aspect > 0.2 ? cam.aspect : 1.6), D = 0.45;
    const P = POSE[kind] || POSE.none;
    let px = D * th * 0.5 + P.p[0], py = -D * tv * (cam.aspect < 1 ? 0.44 : 0.56) + P.p[1], pz = -D + P.p[2], rx = P.r[0], ry = P.r[1], rz = 0.3 + P.r[2];
    // 走路晃動、待機呼吸
    const amt = o.moving ? (o.run ? 1.4 : 1) : 0; ph += dt * (o.run ? 13 : 9) * (amt ? 1 : 0);
    px += Math.sin(ph) * 0.011 * amt; py += -Math.abs(Math.cos(ph)) * 0.013 * amt + Math.sin(o.t * 1.7) * 0.004;
    // 轉頭時手稍微落後
    if (lastYaw !== null && dt > 0) {
      const dy = THREE.MathUtils.clamp(((o.yaw - lastYaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) / dt, -8, 8), dp = THREE.MathUtils.clamp((o.pitch - lastPitch) / dt, -8, 8);
      sway.x += (THREE.MathUtils.clamp(dy * 0.008, -0.05, 0.05) - sway.x) * Math.min(1, dt * 8); sway.y += (THREE.MathUtils.clamp(-dp * 0.008, -0.04, 0.04) - sway.y) * Math.min(1, dt * 8);
    }
    lastYaw = o.yaw; lastPitch = o.pitch; px += sway.x; py += sway.y; rz -= sway.x * 2;
    // 釣魚：竿子舉起來
    if (kind === 'rod' && o.fishing) { rx += 0.32; py += 0.03; px -= 0.02; }
    // 使用工具的動作
    if (useT < 1) {
      useT = Math.min(1, useT + dt / USE[useKind]); const s = useT, k = Math.sin(Math.PI * s);
      if (useKind === 'net') { ry += 0.95 * k; rx -= 0.45 * k; px -= 0.1 * k; }
      else if (useKind === 'shovel') { rx -= 1.05 * k; pz -= 0.08 * k; py -= 0.05 * k; }
      else if (useKind === 'can') { const h = ss(0, 0.22, s) * (1 - ss(0.75, 1, s)); rz += 0.65 * h; rx -= 0.15 * h; px -= 0.04 * h; }   // 往左傾，壺嘴朝下倒水
      else if (useKind === 'rod') { rx += 0.65 * Math.sin(Math.PI * 2 * s) * (1 - s); }
    }
    // 放下：往下沉、尖端往前倒
    py -= low * 0.32; rx -= low * 0.5;
    root.position.copy(cam.position); root.quaternion.copy(cam.quaternion);
    piv.position.set(px, py, pz); piv.quaternion.setFromEuler(E.set(rx, ry, rz, 'XYZ'));
  }
  return { update };
}
