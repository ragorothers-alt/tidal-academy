/* 潮汐小島 · 小型打擊特效（v7.0）：挖土噴出的土塊、敲石頭的碎石、從地裡彈出來的東西。
   clods(x, y, z, opt)：一把會受重力落下、邊轉邊縮小的小碎塊；pop(x, y, z, src)：圖示從地面彈起再消失。
   每格由 life.update 呼叫 update(dt)。 */
import * as THREE from 'three';
import { scene, M } from './engine.js';
import { groundAt } from './terrain.js';

const chunk = new THREE.IcosahedronGeometry(0.055, 0), live = [];
/** opt：color、n 個數、speed 初速、up 往上的比例 */
export function clods(x, y, z, opt) {
  opt = opt || {}; const n = opt.n || 9, sp = opt.speed || 2.2, mat = M(opt.color || '#7a5634');
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(chunk, mat), a = Math.random() * 6.283, s = 0.6 + Math.random() * 0.9;
    m.position.set(x + Math.cos(a) * 0.12, y + 0.08, z + Math.sin(a) * 0.12); m.scale.setScalar(s); m.castShadow = false;
    scene.add(m);
    live.push({ m, s, t: 0, life: 0.7 + Math.random() * 0.35, v: new THREE.Vector3(Math.cos(a) * sp * (0.4 + Math.random() * 0.6), sp * ((opt.up || 1.1) + Math.random() * 0.6), Math.sin(a) * sp * (0.4 + Math.random() * 0.6)), w: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12) });
  }
}
const pops = [];
/** 圖示（data URL 或圖片網址）從 (x, y, z) 彈起約 1.1 公尺，轉一圈後消失；回傳彈到最高點的 Promise（接著出卡片） */
export function pop(x, y, z, src) {
  const tex = new THREE.TextureLoader().load(src); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.position.set(x, y, z); sp.scale.setScalar(0.01); sp.renderOrder = 4; scene.add(sp);
  return new Promise(res => pops.push({ sp, x, y, z, t: 0, res }));
}
export function update(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const c = live[i]; c.t += dt; c.v.y -= 9.8 * dt;
    c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.w.x * dt; c.m.rotation.y += c.w.y * dt; c.m.rotation.z += c.w.z * dt;
    const g = groundAt(c.m.position.x, c.m.position.z) + 0.03;
    if (c.m.position.y < g) { c.m.position.y = g; c.v.multiplyScalar(0.3); c.v.y = Math.abs(c.v.y) * 0.25; c.w.multiplyScalar(0.5); }   // 落地彈一下、滾一點就停
    const k = c.t / c.life; if (k > 0.65) c.m.scale.setScalar(c.s * Math.max(0, 1 - (k - 0.65) / 0.35));
    if (k >= 1) { scene.remove(c.m); live.splice(i, 1); }
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt; const k = Math.min(1, p.t / 0.55);
    p.sp.position.y = p.y + 0.2 + Math.sin(k * Math.PI * 0.5) * 1.1; p.sp.scale.setScalar(0.25 + k * 0.45); p.sp.material.rotation = (1 - k) * 6.283;
    if (k >= 1 && p.res) { p.res(); p.res = null; }
    if (p.t > 0.8) { scene.remove(p.sp); p.sp.material.map.dispose(); p.sp.material.dispose(); pops.splice(i, 1); }
  }
}
