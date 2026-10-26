/* 潮汐小島 · 會發光的東西真的照亮四周（v6.81；v6.83 起每一盞都是真的光）：窗戶、路燈、門邊的燈籠、水晶、燈塔。
   每個光源先登記成「發光點」，再整理成世界座標的燈光格子（島上每 2 公尺一格，記下照得到這一格的燈，最多 16 盞）。
   材質的著色器（engine.bend）在每個像素查自己那一格，逐盞用和 three.js 點光源同一套公式算漫射與高光：
   畫面裡看得到的每一扇窗、每一盞燈都真的照在牆面、地面、樹與角色身上——不再只有離鏡頭最近的 14 盞，
   也不必在地上鋪假的光斑。畫面外沒有像素，也就不用算；白天整段跳過。
   燈籠、路燈與水晶另外有一團空氣中的光暈（加法混色），整個城鎮遠遠看也是一盞盞亮著的燈火。 */
import * as THREE from 'three';
import { scene, camera, skyU, U, LGRID } from './engine.js';
import { groundAt } from './terrain.js';

/** 每種光源：顏色、強度（燭光）、照射距離、衰減、空氣光暈的大小（公尺） */
const KIND = {
  window:  { color: '#ffd39d', power: 3.5, range: 4.5, decay: 1.7, halo: 0 },   // 窗仍由 scan 自動登記；暖奶油光留在窗邊，不把整面牆洗白
  lantern: { color: '#ffd39d', power: 2.8, range: 4.5, decay: 1.8, halo: 0.48 },
  lamp:    { color: '#ffd39d', power: 6.4, range: 7.2, decay: 1.85, halo: 0.72 },
  garden:  { color: '#ffd39d', power: 3.8, range: 5.5, decay: 1.9, halo: 0.58 },
  crystal: { color: '#a99acb', power: 3.6, range: 7, decay: 1.6, halo: 0.85, day: 0.25 },
  beacon:  { color: '#ffd39d', power: 21, range: 26, decay: 1.6, halo: 2.4 }
};
const emitters = [];
const HALO_TINT = new THREE.Color('#ebc2bc');
/** 每一格最多照幾盞（省電模式由 settings.js 設成 6） */
export const setPool = n => { U.uLMax.value = n; };
let dirty = true;
/**
 * 登記一個發光點。o：{ x, y, z, kind, nx, nz（窗戶朝外的方向）, color, power（倍數）}。回傳記錄（給 unemit）。
 * 窗戶的光源放在窗外一點的地方：光從窗口灑到門前的地上
 */
export function emit(o) {
  const k = KIND[o.kind] || KIND.lantern, e = { x: o.x, y: o.y, z: o.z, kind: o.kind, k, nx: o.nx || 0, nz: o.nz || 0, col: new THREE.Color(o.color || k.color), pw: o.power || 1 };
  e.haloCol = e.col.clone().lerp(HALO_TINT, o.color || o.kind === 'crystal' ? 0 : 0.45);
  e.lx = e.x + e.nx * 0.55; e.lz = e.z + e.nz * 0.55; e.ly = e.y - (o.kind === 'window' ? 0.15 : 0);   // 光源的位置
  e.gy = groundAt(e.lx, e.lz);
  emitters.push(e); dirty = true; return e;
}
export function unemit(e) { const i = emitters.indexOf(e); if (i < 0) return; emitters.splice(i, 1); dirty = true; }
const GRID = { cells: 0, maxPer: 0, dropped: 0 };
/** 除錯：發光點的數量（依種類）與燈光格子的使用情形 */
export const stats = () => emitters.reduce((m, e) => (m[e.kind] = (m[e.kind] || 0) + 1, m), { cells: GRID.cells, maxPerCell: GRID.maxPer, dropped: GRID.dropped });

/* ---------- 掃描建築：模型裡用 kit.win()（夜裡發光的窗玻璃）的網格，依位置分群成一扇扇窗與一盞盞燈籠 ---------- */
const vA = new THREE.Vector3(), cCtr = new THREE.Vector3();
/** g：建築的群組（世界座標已就位）。大的一群是窗（光往外灑），小的一群是燈籠（四面發光） */
export function scan(g, isGlass) {
  g.updateMatrixWorld(true);
  const pts = [];
  g.traverse(o => {
    if (!o.isMesh || !isGlass(o.material)) return;
    const P = o.geometry.attributes.position, step = Math.max(1, Math.floor(P.count / 1500));
    for (let i = 0; i < P.count; i += step) { vA.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pts.push([vA.x, vA.y, vA.z]); }
  });
  if (!pts.length) return [];
  // 0.45 公尺的格子：相鄰（含斜角）的格子連成一群
  const cells = new Map(), key = (i, j, k) => i + ',' + j + ',' + k;
  pts.forEach(p => { const c = key(Math.floor(p[0] / 0.45), Math.floor(p[1] / 0.45), Math.floor(p[2] / 0.45)); let a = cells.get(c); if (!a) cells.set(c, a = []); a.push(p); });
  const seen = new Set(), groups = [];
  cells.forEach((_, c0) => {
    if (seen.has(c0)) return; const stack = [c0], mem = []; seen.add(c0);
    while (stack.length) { const c = stack.pop(); mem.push(...cells.get(c)); const [i, j, k] = c.split(',').map(Number);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) { const n = key(i + a, j + b, k + d); if (cells.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); } } }
    groups.push(mem);
  });
  new THREE.Box3().setFromObject(g).getCenter(cCtr);
  const made = [];
  groups.sort((a, b) => b.length - a.length).slice(0, 10).forEach(mem => {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    mem.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); });
    const x = (x0 + x1) / 2, y = (y0 + y1) / 2, z = (z0 + z1) / 2, size = Math.max(x1 - x0, y1 - y0, z1 - z0);
    if (size < 0.06) return;
    const dx = x - cCtr.x, dz = z - cCtr.z, ax = Math.abs(dx) > Math.abs(dz);   // 朝外：從建築中心指向這扇窗，取主要的軸
    const nx = ax ? Math.sign(dx) : 0, nz = ax ? 0 : Math.sign(dz) || 1;
    if (y - groundAt(x, z) > 7) return;   // 塔頂的小窗：不照地面
    const e = emit(size < 0.32 ? { x: x + nx * 0.1, y, z: z + nz * 0.1, kind: 'lantern' } : { x, y, z, kind: 'window', nx, nz }); e.y0 = y0; e.y1 = y1; e.w2 = Math.max(x1 - x0, z1 - z0) / 2; made.push(e);   // 窗框的上下緣與半寬（walldress.js 放窗台花箱用）
  });
  return made;
}

/* ---------- 燈光格子：兩張浮點貼圖（engine.LGRID 的格式）----------
   uLData：每盞燈兩列——(位置, 照射距離 + 100 × 窗戶朝向)、(顏色 × 強度, 衰減)
   uLGrid：每格 4 個像素 × 4 個通道 = 16 個燈的編號（+1，0 是空的），依在這一格的亮度由大到小排；在這一格幾乎看不出來的（比月光的 3% 還暗）不列 */
const { s: GS, o: GO, n: GN, q: GQ, max: MAXE } = LGRID, MAXL = GQ * 4;
const gridTex = new THREE.DataTexture(new Float32Array(GN * GQ * GN * 4), GN * GQ, GN, THREE.RGBAFormat, THREE.FloatType);
const dataTex = new THREE.DataTexture(new Float32Array(MAXE * 2 * 4), MAXE, 2, THREE.RGBAFormat, THREE.FloatType);
[gridTex, dataTex].forEach(t => { t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; });
U.uLGrid.value = gridTex; U.uLData.value = dataTex;
/** 和著色器的 getDistanceAttenuation 一樣（three.js 的點光源衰減） */
const atten = (d, R, decay) => { const f = 1 / Math.max(Math.pow(d, decay), 0.01), w = Math.max(0, 1 - Math.pow(d / R, 4)); return f * w * w; };
function buildGrid() {
  const D = dataTex.image.data, G = gridTex.image.data; D.fill(0); G.fill(0);
  const list = emitters.slice(0, MAXE), cells = new Map();
  GRID.dropped = Math.max(0, emitters.length - MAXE);
  list.forEach((e, i) => {
    const pw = e.k.power * e.pw, win = e.nx || e.nz, R = e.k.range;
    D.set([e.lx, e.ly, e.lz, R + 100 * (e.nx > 0 ? 1 : e.nx < 0 ? 2 : e.nz > 0 ? 3 : e.nz < 0 ? 4 : 0)], i * 4);
    D.set([e.col.r * pw, e.col.g * pw, e.col.b * pw, e.k.decay], (MAXE + i) * 4);
    const h = Math.max(e.ly - e.gy, 0) * 0.7, Ln = e.lx * e.nx + e.lz * e.nz;
    const c0 = Math.max(0, Math.floor((e.lx - R - GO) / GS)), c1 = Math.min(GN - 1, Math.floor((e.lx + R - GO) / GS));
    const r0 = Math.max(0, Math.floor((e.lz - R - GO) / GS)), r1 = Math.min(GN - 1, Math.floor((e.lz + R - GO) / GS));
    for (let cz = r0; cz <= r1; cz++) for (let cx = c0; cx <= c1; cx++) {
      const x0 = GO + cx * GS, z0 = GO + cz * GS, dx = Math.max(x0 - e.lx, 0, e.lx - x0 - GS), dz = Math.max(z0 - e.lz, 0, e.lz - z0 - GS), dmin = Math.hypot(dx, dz);
      if (dmin >= R) continue;
      if (win) { const maxPn = e.nx > 0 ? x0 + GS : e.nx < 0 ? -x0 : e.nz > 0 ? z0 + GS : -z0; if (Ln - maxPn > 0.85) continue; }   // 整格都在牆後
      const imp = pw * atten(Math.max(Math.hypot(dmin, h), 0.3), R, e.k.decay); if (imp < 0.03) continue;   // 在這一格最亮也不到月光的 3%：看不出來
      const k = cz * GN + cx; let a = cells.get(k); if (!a) cells.set(k, a = []);
      a.push([imp, i + 1]);
    }
  });
  GRID.cells = cells.size; GRID.maxPer = 0;
  cells.forEach((a, k) => {
    GRID.maxPer = Math.max(GRID.maxPer, a.length);
    a.sort((p, q) => q[0] - p[0]);
    const cx = k % GN, cz = (k - cx) / GN, base = (cz * GN * GQ + cx * GQ) * 4;
    for (let j = 0; j < Math.min(a.length, MAXL); j++) G[base + j] = a[j][1];
  });
  gridTex.needsUpdate = true; dataTex.needsUpdate = true;
}

/* ---------- 空氣中的光暈 ---------- */
const poolTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.22, 'rgba(255,255,255,0.42)'); g.addColorStop(0.6, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
let halos = null;
function rebuild() {
  dirty = false; lastLit = -1;
  buildGrid();
  if (halos) { scene.remove(halos); halos.geometry.dispose(); }
  const hl = emitters.filter(e => e.k.halo > 0), P = new Float32Array(hl.length * 3), Cc = new Float32Array(hl.length * 3), S = new Float32Array(hl.length);
  hl.forEach((e, i) => { P.set([e.x, e.y, e.z], i * 3); S[i] = e.k.halo; });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('aCol', new THREE.BufferAttribute(Cc, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(S, 1));
  halos = new THREE.Points(geo, haloMat); halos.frustumCulled = false; halos.renderOrder = 3; halos.userData.list = hl; scene.add(halos);
}
/** 空氣中的光暈：每個點依世界大小（aSize 公尺）畫成柔和的光團，加法混色、不寫深度、被建築擋住時一起被擋 */
const haloMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { map: { value: poolTex }, uScale: { value: 400 }, uCurve: U.uCurve, uBendF: U.uBendF },
  vertexShader: `attribute float aSize; attribute vec3 aCol; varying vec3 vC; uniform float uScale; uniform float uCurve; uniform float uBendF;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vC = aCol * (0.3 + 0.7 * smoothstep(1.5, 5.0, -mv.z)); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve;   // 和地形一樣的滾筒地平線彎曲；貼近鏡頭的燈（第一人稱走過路燈旁）光暈淡一點，不會蓋住半個畫面
      gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }`,
  fragmentShader: `uniform sampler2D map; varying vec3 vC; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vC * a * a, 1.0); }`
});

/* ---------- 每格更新 ---------- */
let lastLit = -1;
/** dt：秒；show：在島上戶外（室內與旅行時關掉：燈光格子是島上的座標） */
export function update(dt, target, show) {
  if (dirty) rebuild();
  const night = skyU.night.value, lit = THREE.MathUtils.smoothstep(night, 0.12, 0.6);
  U.uLOn.value = show ? lit : 0;   // 白天 0：著色器整段跳過
  if (!halos) return;
  halos.visible = show; if (!show) return;
  haloMat.uniforms.uScale.value = camera.projectionMatrix.elements[5] * innerHeight * 0.5;   // 世界大小 → 畫面像素（和透視一樣）
  if (Math.abs(lit - lastLit) < 0.002) return; lastLit = lit;
  const list = halos.userData.list, C = halos.geometry.attributes.aCol;
  for (let i = 0; i < list.length; i++) { const e = list[i], on = Math.max(lit, (e.k.day || 0) * 0.6) * 0.3; C.setXYZ(i, e.haloCol.r * on, e.haloCol.g * on, e.haloCol.b * on); }
  C.needsUpdate = true;
}
