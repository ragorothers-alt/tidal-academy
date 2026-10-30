/* 潮汐小島 · 北海岸（v9.1）：學院台地北側新的樓梯走下去，是一條安靜的海岸——漂流木、潮池岩、外海的海蝕柱與海蝕拱（小船划得過去），
   還有台地東北角岩壁下的潮洞洞口：退潮時（和潮池同一段時間）走到洞口按 E 就能進去，漲潮時洞口被浪打著進不去。
   模型在 data/northmodels.js（Codex 製作）；擺好的東西登記碰撞，小船與游泳也會繞開海蝕柱。 */
import * as THREE from 'three';
import { scene } from './engine.js';
import { groundAt, seaMesh } from './terrain.js';
import { colliders, modelClone } from './props.js';
import { register } from './props3d.js';
import * as cave from './cave.js';
import * as ui from './ui.js';

export const MOUTH = [17, -37.6], DOOR = [17, -38.4];   // 潮洞洞口的門檻、出洞時站的地方（洞口前的沙灘）
const CLIFF = -36.25;   // 洞口這段台地崖壁的 z
const SEA = [['sea_stack_a', -12, -47.5, 0.4], ['sea_stack_b', 5, -47, 2.1], ['sea_arch', 27, -41, Math.PI / 2]];   // 拱洞朝東西：沿著北海岸划船剛好穿過去
const LAND = [['driftwood', 8.5, -39.6, 0.35, 1.0], ['tide_rocks', -2, -42.6, 1.2, 0], ['tide_rocks', 11.5, -40.7, 4.1, 0], ['driftwood', -9, -41.2, 2.6, 1.0], ['tide_rocks', 13.9, -37.9, 2.3, 0], ['tide_rocks', 20.2, -37.3, 5.4, 0]];   // 最後兩組靠著潮洞洞口的兩側
const floats = [];
let ctx = null;
export function init(c) {
  ctx = c;
  const cm = modelClone('NORTHMODELS', 'cave_mouth');
  if (cm) { cm.position.set(MOUTH[0], groundAt(MOUTH[0], MOUTH[1] - 0.3) - 0.05, MOUTH[1] + 2.5); cm.rotation.y = Math.PI; cm.scale.y = 0.74; shade(cm); deepen(cm, MOUTH[1] + 2.5 - (CLIFF - 0.15)); scene.add(cm); register(cm); colliders.push({ x0: MOUTH[0] - 3.4, x1: MOUTH[0] + 3.4, z0: MOUTH[1] + 0.35, z1: MOUTH[1] + 1.6 }); }   // 開口朝北（模型的 +Z 轉向 -z）；模型深 5 公尺，後面 3.6 公尺埋進台地的崖壁，壓矮到頂和台地差不多高；碰撞只擋崖前露出來的那段
  SEA.forEach(([key, x, z, ry]) => {
    const m = modelClone('NORTHMODELS', key); if (!m) return;
    m.position.set(x, seaMesh.position.y, z); m.rotation.y = ry; scene.add(m); floats.push(m);
    if (key === 'sea_arch') [-1, 1].forEach(s => [-0.6, 0.6].forEach(w => { const lx = s * 2.5; colliders.push({ x: x + lx * Math.cos(ry) + w * Math.sin(ry), z: z - lx * Math.sin(ry) + w * Math.cos(ry), r: 1.1 }); }));   // 拱的兩根腳（水面上各約 2 × 2.5 公尺，沿水道放兩個圓）；中間的洞划得過去
    else colliders.push({ x, z, r: key === 'sea_stack_a' ? 1.7 : 1.2 });
  });
  LAND.forEach(([key, x, z, ry, r]) => {
    const m = modelClone('NORTHMODELS', key); if (!m) return;
    m.position.set(x, groundAt(x, z), z); m.rotation.y = ry; scene.add(m);
    if (r) colliders.push({ x, z, r });
  });
  const sg = modelClone('NORTHMODELS', 'north_sign');
  if (sg) { const x = 6.3, z = -39.3; sg.position.set(x, groundAt(x, z), z); sg.rotation.y = Math.PI; scene.add(sg); signText(sg); colliders.push({ x, z, r: 0.2 }); }   // 樓梯下來的地方，牌子面向海
}
/** 洞口朝北，整面一直在台地的影子裡：外側的岩石調亮一點，和旁邊的崖壁差不多；隧道與洞底的暗色不動 */
function shade(g) {
  g.traverse(o => {
    const c = o.isMesh && o.geometry.attributes.color; if (!c) return;
    let s = 0; for (let i = 0; i < c.count; i++) s += c.getX(i); if (s / c.count < 0.2) return;
    for (let i = 0; i < c.count; i++) c.setXYZ(i, Math.min(1, c.getX(i) * 1.6), Math.min(1, c.getY(i) * 1.6), Math.min(1, c.getZ(i) * 1.6));
    c.needsUpdate = true;
  });
}
/** 崖壁會切過模型的隧道：在崖壁前面再放一片洞底的黑，從洞口看不到裡面的地形（z 是模型自己的座標） */
function deepen(g, z) {
  const v = g.getObjectByName('void'); if (!v) return;
  const d = v.clone(); d.position.z = v.position.z + z; v.parent.add(d);
}
/** 牌子上寫「北海岸」：在木板正面貼一塊字 */
function signText(g) {
  const b = g.getObjectByName('board'); if (!b || typeof document === 'undefined') return;
  b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 104; const c = cv.getContext('2d');
  c.fillStyle = '#e9d3a8'; c.fillRect(0, 0, 256, 104); c.fillStyle = '#5a3e26'; c.font = '800 56px system-ui, "Microsoft JhengHei", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('北海岸', 128, 56, 236);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.8), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
  p.position.set((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, bb.max.z + 0.004); b.add(p);
}
/** 每一格：海裡的石柱跟著潮水（海面）上下 */
export function update() { const y = seaMesh.position.y; floats.forEach(m => { m.position.y = y; }); }
const nearMouth = (px, pz) => Math.hypot(px - DOOR[0], pz - DOOR[1]) < 1.5;
export function hint(px, pz) { return nearMouth(px, pz) ? (cave.open() ? '走進潮洞' : '看看洞口') : ''; }
export function act(px, pz) {
  if (!nearMouth(px, pz)) return false;
  if (!cave.open()) { ui.toast('洞口被浪打著，進不去。乾潮前後（手機的潮汐表）洞口才會露出來'); return true; }
  ctx.enterCave(); return true;
}
