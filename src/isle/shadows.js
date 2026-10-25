/* 潮汐小島 · 陰影只畫看得到的地方（v6.83）
   每一格先找出畫面裡「真的看得到」的地方：島上每 4 公尺一點的地面（與 3 公尺高），加上 props3d 判斷在畫面裡的每個模型的包圍球。
   都用和著色器一樣的滾筒彎曲投影到畫面上，被彎下去的地平線擋住的不算。這些點投影到太陽的座標系取外框：
   - 離鏡頭 40 公尺內的點 → 近處的陰影貼圖（sun，4096，影子最細；平常的第三人稱鏡頭全部都在這張裡）
   - 全部的點 → 遠處的陰影貼圖（sunFar，2048）：只在近處那張包不住畫面時才用。不必每一格重畫——
     框還包得住看得到的地方、太陽也沒怎麼移動，就沿用上一次畫好的（每 0.25 秒重畫一次，走動的村民的影子跟得上）
   兩個框都以 4／8 公尺為一級、中心對齊陰影貼圖的像素格，鏡頭移動時影子邊緣不會閃。
   props3d.cull() 依這兩個框決定每個模型要不要畫進陰影貼圖：看不到、影子也落不進畫面的就不畫。
   用法（main.js 每一格）：begin(鏡頭, 太陽方向, 玩家) → props3d.cull()（裡面 addBox、fit） */
import * as THREE from 'three';
import { sun, sunFar, shadowView as SV, HZ, U, CASCADES } from './engine.js';
import { groundAt } from './terrain.js';

const NEAR_D = 40, STEP = 4, LO = -56, NS = 29, FAR_EVERY = 250, FAR_FRAMES = 8;   // 地面取樣：-56 到 56 公尺、每 4 公尺一點；遠處那張每 0.25 秒（而且至少隔 8 格）重畫一次
let H = null, hAge = 1e9, cam = null, focus = null, farAge = 0;
const X = new THREE.Vector3(), Y = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0), C = new THREE.Vector3();
/** 這一格的太陽方向（指向太陽；props3d 用來算畫面外的東西影子落在哪） */
export const DIR = new THREE.Vector3(0, 1, 0);
const BN = new Float64Array(6), BF = new Float64Array(6);   // 近處、全部：a0, a1, b0, b1, Σ(p·dir), 點數
const reset = b => { b[0] = b[2] = 1e9; b[1] = b[3] = -1e9; b[4] = b[5] = 0; };
const grow = (b, a, c, r, dd) => { if (a - r < b[0]) b[0] = a - r; if (a + r > b[1]) b[1] = a + r; if (c - r < b[2]) b[2] = c - r; if (c + r > b[3]) b[3] = c + r; b[4] += dd; b[5]++; };
let F = 15, K = 0, fx = 1, fy = 1, M = null;

/** 這一格開始：記下鏡頭、太陽方向（指向太陽）與玩家位置，算出光源座標系 */
export function begin(camera, dir, player) {
  cam = camera; focus = player; DIR.copy(dir);
  cam.updateMatrixWorld();
  X.crossVectors(UPV, DIR); if (X.lengthSq() < 1e-6) X.set(1, 0, 0); X.normalize(); Y.crossVectors(DIR, X).normalize();   // 和 three.js 的 lookAt 同一組軸（對齊像素格要用同一組）
  F = U.uBendF.value; K = U.uCurve.value; const P = cam.projectionMatrix.elements; fx = P[0]; fy = P[5]; M = cam.matrixWorldInverse.elements;
  reset(BN); reset(BF);
  if (++hAge > 90 || !H) { hAge = 0; H = new Float32Array(NS * NS); for (let j = 0; j < NS; j++) for (let i = 0; i < NS; i++) H[j * NS + i] = Math.max(groundAt(LO + i * STEP, LO + j * STEP), 0.02); }   // 地面高度表（每 90 格重算：島嶼設計會改地形）
}
/** 一個看得到的東西（世界座標的圓柱：水平半徑 r、半高 hy；near 是它最近的一端離鏡頭的深度）：加進看得到的範圍 */
export function addBox(x, y, z, r, hy, near) {
  const a = x * X.x + y * X.y + z * X.z, b = x * Y.x + y * Y.y + z * Y.z, dd = x * DIR.x + y * DIR.y + z * DIR.z, eb = Math.hypot(Y.x, Y.z) * r + Math.abs(Y.y) * hy;
  growE(BF, a, b, r, eb, dd); if (near < NEAR_D) growE(BN, a, b, Math.min(r, 6), Math.min(eb, 6), dd);
}
const growE = (B, a, c, ea, eb, dd) => { if (a - ea < B[0]) B[0] = a - ea; if (a + ea > B[1]) B[1] = a + ea; if (c - eb < B[2]) B[2] = c - eb; if (c + eb > B[3]) B[3] = c + eb; B[4] += dd; B[5]++; };
/** 世界座標的一點在畫面上看得到嗎（彎曲後在畫面裡、沒被地平線擋住）：看得到回傳深度，看不到回傳 -1 */
function seen(x, y, z) {
  const vx = M[0] * x + M[4] * y + M[8] * z + M[12], vy = M[1] * x + M[5] * y + M[9] * z + M[13], depth = -(M[2] * x + M[6] * y + M[10] * z + M[14]);
  if (depth < 0.3) return -1;
  const bz = Math.max(depth - F, 0), sx = fx * vx / depth, sy = fy * (vy - bz * bz * K) / depth;
  if (sx < -1.12 || sx > 1.12 || sy < -1.15 || sy > 1.12) return -1;
  if (depth > HZ.d && sy < HZ.y - 0.01) return -1;   // 被彎下去的地平線擋住
  return depth;
}
const snap = (v, t) => Math.round(v / t) * t;
/** 依看得到的範圍擺好兩個陰影框（props3d.cull 在判斷完畫面裡的模型之後呼叫） */
export function fit() {
  if (!cam) return;
  for (let j = 0; j < NS; j++) for (let i = 0; i < NS; i++) {
    const x = LO + i * STEP, z = LO + j * STEP, g = H[j * NS + i];
    for (const h of [0, 2.5]) { const d = seen(x, g + h, z); if (d >= 0) { const a = x * X.x + (g + h) * X.y + z * X.z, b = x * Y.x + (g + h) * Y.y + z * Y.z, dd = x * DIR.x + (g + h) * DIR.y + z * DIR.z; grow(BF, a, b, STEP * 0.6, dd); if (d < NEAR_D) grow(BN, a, b, STEP * 0.6, dd); } }
  }
  { const p = focus, a = p.x * X.x + p.y * X.y + p.z * X.z, b = p.x * Y.x + p.y * Y.y + p.z * Y.z; grow(BN, a, b, 3, p.x * DIR.x + p.y * DIR.y + p.z * DIR.z); grow(BF, a, b, 3, p.x * DIR.x + p.y * DIR.y + p.z * DIR.z); }   // 玩家（與腳下的影子）一定在近處那張
  // 近處：4 公尺一級，半寬 12–40 公尺
  const N = SV.near, half = THREE.MathUtils.clamp(Math.ceil((Math.max(BN[1] - BN[0], BN[3] - BN[2]) / 2 + 2) / 4) * 4, 12, 40);
  let ma = (BN[0] + BN[1]) / 2, mb = (BN[2] + BN[3]) / 2;
  { const p = focus, fa = p.x * X.x + p.y * X.y + p.z * X.z, fb = p.x * Y.x + p.y * Y.y + p.z * Y.z, k = half - 8;   // 近處的點比框還寬時（第一人稱看遠方）：框往玩家那一側靠，腳邊的影子一定最細
    ma = THREE.MathUtils.clamp(ma, fa - k, fa + k); mb = THREE.MathUtils.clamp(mb, fb - k, fb + k); }
  const texel = half * 2 / sun.shadow.mapSize.x, ca = snap(ma, texel), cb = snap(mb, texel);
  C.copy(X).multiplyScalar(ca).addScaledVector(Y, cb).addScaledVector(DIR, BN[4] / BN[5]);
  sun.target.position.copy(C); sun.position.copy(C).addScaledVector(DIR, 80);
  if (half !== N.r) { Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 170 }); sun.shadow.camera.updateProjectionMatrix(); }
  N.r = half; N.ca = ca; N.cb = cb; N.ax.copy(X); N.ay.copy(Y);
  // 遠處：近處那張包得住全部看得到的地方（第三人稱的平常鏡頭）就不用
  const Fa = SV.far, in4 = half * 0.96;
  const need = CASCADES && BF[5] > 0 && (BF[0] < ca - in4 || BF[1] > ca + in4 || BF[2] < cb - in4 || BF[3] > cb + in4);
  Fa.due = false;
  if (!need) { Fa.on = false; sunFar.shadow.radius = 0; return; }
  const now = performance.now(), sameDir = Fa.on && Fa.dir.dot(DIR) > 0.99999;
  // 同一個方向時，用上一次的框的座標系檢查：看得到的範圍還在框裡嗎
  let fits = false;
  if (sameDir) { const m = 2; fits = BF[0] - m > Fa.ca - Fa.r && BF[1] + m < Fa.ca + Fa.r && BF[2] - m > Fa.cb - Fa.r && BF[3] + m < Fa.cb + Fa.r; }
  if (!fits) {   // 重新擺框：比需要的大一成半，鏡頭小幅移動、轉頭時不用馬上重擺
    const fh = THREE.MathUtils.clamp(Math.ceil((Math.max(BF[1] - BF[0], BF[3] - BF[2]) / 2 * 1.15 + 6) / 8) * 8, 24, 88);
    const ft = fh * 2 / sunFar.shadow.mapSize.x, fa = snap((BF[0] + BF[1]) / 2, ft), fb = snap((BF[2] + BF[3]) / 2, ft);
    C.copy(X).multiplyScalar(fa).addScaledVector(Y, fb).addScaledVector(DIR, BF[4] / BF[5]);
    sunFar.target.position.copy(C); sunFar.position.copy(C).addScaledVector(DIR, 95);
    if (fh !== Fa.r || !Fa.on) { Object.assign(sunFar.shadow.camera, { left: -fh, right: fh, top: fh, bottom: -fh, near: 1, far: 200 }); sunFar.shadow.camera.updateProjectionMatrix(); }
    Fa.r = fh; Fa.ca = fa; Fa.cb = fb; Fa.ax.copy(X); Fa.ay.copy(Y); Fa.dir.copy(DIR);
  }
  farAge++;
  if (!fits || (now - Fa.t > FAR_EVERY && farAge >= FAR_FRAMES)) { Fa.due = true; Fa.t = now; farAge = 0; sunFar.shadow.needsUpdate = true; }   // 走動的村民、擺動的樹：遠處的影子定時重畫
  Fa.on = true; sunFar.shadow.radius = 1;
}
/** 除錯：目前的兩個框 */
export const state = () => ({ near: SV.near.r, far: SV.far.on ? SV.far.r : 0, farDue: SV.far.due, pts: BF[5], bn: [...BN].map(v => +v.toFixed(1)), bf: [...BF].map(v => +v.toFixed(1)), nc: [SV.near.ca, SV.near.cb].map(v => +v.toFixed(1)) });
