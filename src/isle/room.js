/* 潮汐小島 · 室內：自己的房間（8×8 格）、壁紙與地板、家具組模、擺放／旋轉／收納、家具縮圖。 */
import * as THREE from 'three';
import { renderer, camera, U, CURVE, M, bend } from './engine.js';
import * as post from './post.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';

export const scene = new THREE.Scene();
scene.background = (() => {   // 房間外面：中間微亮的暖褐色漸層（像一盞燈照著的小房間），不是一整片死黑
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), g = c.createRadialGradient(128, 110, 10, 128, 128, 190);
  g.addColorStop(0, '#5a4532'); g.addColorStop(0.55, '#33261c'); g.addColorStop(1, '#17110c'); c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const R = 8, H = R / 2, WALL_H = 3;
export const furn = id => (I.FURNITURE || []).find(f => f.id === id);
export const paper = (kind, id) => ((kind === 'wall' ? I.WALLPAPER : I.FLOORING) || []).find(x => x.id === id);

/* ---------- 光源 ---------- */
/* v7.8 真實的室內光：不再整片均勻打亮——白天的光從窗戶來（窗外一盞往屋裡斜照的柔邊聚光燈，離窗越遠越暗），
   天花板的燈與家具燈照度隨距離平方衰減（燈下一圈亮、牆角暗下來）；只留一點點四處反彈的光，背光面是薰衣草色 */
const hemi = new THREE.HemisphereLight('#fff1e2', '#9d8bb0', 0.45); scene.add(hemi);
const keyL = new THREE.DirectionalLight('#fff0d8', 1.5); keyL.position.set(2.5, 10, -3.5); keyL.castShadow = true; keyL.shadow.mapSize.set(1024, 1024);   // 主光從窗戶那一側的高處照下來（和窗光同一側），家具的影子朝房間前方、正面仍受光
Object.assign(keyL.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); keyL.shadow.bias = -0.0005; scene.add(keyL, keyL.target);
const ceil = new THREE.PointLight('#ffe2b0', 6, 0, 2); ceil.position.set(0, 2.8, 0); scene.add(ceil);
// v7.9 間接照明：三面牆頂飾線下藏著洗牆燈帶（面光源，往下貼著牆照），牆面一片由上往下漸暗的暖光，看得到光、看不到燈
const washL = [[0, -1], [-1, 0], [1, 0]].map(([wx, wz]) => {   // (wx, wz)：朝牆的方向（後牆、左牆、右牆）
  const l = new THREE.RectAreaLight('#ffd0a0', 0, R - 0.3, 0.12); l.position.set(wx * (H - 0.22), WALL_H - 0.16, wz * (H - 0.22));
  l.lookAt(l.position.x + wx * 0.4, WALL_H - 1.18, l.position.z + wz * 0.4); scene.add(l); return l;
});
const winL = new THREE.SpotLight('#fff0dc', 0, 0, 1.0, 1, 2); winL.position.set(1.6, 1.9, -H - 0.8); winL.target.position.set(1.0, 0, -0.6); scene.add(winL, winL.target);   // 窗的天光：燈在窗外，照不到屋裡朝內的牆面

/* ---------- 窗光：從後牆窗戶斜斜照進來的光柱、地上的光斑與光裡飄的微塵 ---------- */
const WIN = { x: 1.6, y0: 1.25, y1: 2.35, w: 1.6 }, BEAM = new THREE.Vector3(-0.35, -0.62, 1).normalize();
const beamU = { uCol: { value: new THREE.Color('#fff1d0') }, uAmt: { value: 0.3 }, uTime: { value: 0 } };
const beam = (() => {
  // 窗框四角往室內延伸到地板：側面是四個梯形
  const L = (WIN.y0 + 0.02) / -BEAM.y, Z = -4 + 0.03, a = [[WIN.x - WIN.w / 2, WIN.y0], [WIN.x + WIN.w / 2, WIN.y0], [WIN.x + WIN.w / 2, WIN.y1], [WIN.x - WIN.w / 2, WIN.y1]];
  const P = [], UV = [];
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = a[i], [x1, y1] = a[(i + 1) % 4], e0 = [x0 + BEAM.x * L, y0 + BEAM.y * L, Z + BEAM.z * L], e1 = [x1 + BEAM.x * L, y1 + BEAM.y * L, Z + BEAM.z * L];
    P.push(x0, y0, Z, x1, y1, Z, ...e1, x0, y0, Z, ...e1, ...e0); UV.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: beamU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uCol; uniform float uAmt; uniform float uTime; varying vec2 vUv; varying vec3 vP;
      void main(){ float along = vUv.y, edge = sin(vUv.x * 3.14159);
        float flick = 0.9 + 0.1 * sin(uTime * 0.7 + vP.x * 3.0 + vP.y * 2.0);
        float a = (1.0 - along) * (0.35 + along * 0.65) * edge * uAmt * flick; gl_FragColor = vec4(uCol * a, a); }` }));
  m.renderOrder = 5; m.frustumCulled = false; scene.add(m);
  // 地板上的光斑（窗格十字陰影）
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96; const c = cv.getContext('2d');
  const gr = c.createRadialGradient(64, 48, 10, 64, 48, 70); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 96);
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(61, 0, 6, 96); c.fillRect(0, 45, 128, 6);
  const tex = new THREE.CanvasTexture(cv);
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w * 1.25, (WIN.y1 - WIN.y0) / -BEAM.y * BEAM.z * 1.05), new THREE.MeshBasicMaterial({ map: tex, color: '#fff1d0', transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  spot.rotation.x = -Math.PI / 2; const Lm = ((WIN.y0 + WIN.y1) / 2) / -BEAM.y;
  spot.position.set(WIN.x + BEAM.x * Lm, 0.015, Z + BEAM.z * Lm); spot.renderOrder = 2; scene.add(spot);
  // 光柱裡的微塵
  const N = 60, pos = new Float32Array(N * 3), sd = new Float32Array(N);
  for (let i = 0; i < N; i++) { sd[i] = Math.random(); const k = Math.random() * 0.9, u = Math.random(); pos.set([WIN.x - WIN.w / 2 + u * WIN.w + BEAM.x * k * L, WIN.y0 + Math.random() * (WIN.y1 - WIN.y0) + BEAM.y * k * L, Z + BEAM.z * k * L], i * 3); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#fff4d8', size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; scene.add(dust);
  return { m, spot, dust, pos, sd, pg, base: pos.slice() };
})();
const WARM = { day: new THREE.Color('#fff1d0'), gold: new THREE.Color('#ffb466'), snow: new THREE.Color('#e8f0ff') };

/* ---------- 圓角方塊 ---------- */
const GEO = {};
/** 門口的地墊：編織紋路、深色滾邊、中間一道浪花（原本是一塊平的橘色） */
let DOORMAT = null;
function doormatTex() {
  if (DOORMAT) return DOORMAT;
  const W = 256, Hh = 146, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  g.fillStyle = '#c86a5a'; g.fillRect(0, 0, W, Hh);
  for (let y = 0; y < Hh; y += 4) for (let x = (y / 4) % 2 * 4; x < W; x += 8) { g.fillStyle = `rgba(${(x * 7 + y * 13) % 3 ? '255,235,215' : '90,40,30'},0.09)`; g.fillRect(x, y, 4, 4); }   // 一格一格交錯的編織紋
  g.strokeStyle = '#8f4438'; g.lineWidth = 12; g.strokeRect(10, 10, W - 20, Hh - 20);   // 深色滾邊
  g.strokeStyle = 'rgba(255,236,214,0.55)'; g.lineWidth = 2; g.strokeRect(20, 20, W - 40, Hh - 40);
  g.strokeStyle = '#f6dcc4'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();   // 中間一道浪花（潮汐小島）
  for (let x = 52; x <= W - 52; x += 2) { const y = Hh / 2 + Math.sin((x - 52) / (W - 104) * Math.PI * 3) * 12; x === 52 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  DOORMAT = new THREE.CanvasTexture(c); DOORMAT.colorSpace = THREE.SRGBColorSpace; DOORMAT.anisotropy = 4; return DOORMAT;
}
export function rbox(w, h, d, r) {
  const k = [w, h, d, r].map(v => v.toFixed(3)).join(','); if (GEO[k]) return GEO[k];
  r = Math.min(r || 0, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  if (r <= 0.005) return (GEO[k] = new THREE.BoxGeometry(w, h, d));
  // 格線只放在圓角那一圈：每軸「兩側各 s 格圓弧＋中間一格平面」，圓弧格線依角度排，法線直接取圓心方向
  // （v7.6 以前是均分 5 格：每個 300 面，大箱子的圓角只剩一條看不出來的斜帶；現在小圓角 108 面、圓得更真）
  const s = r >= 0.05 ? 2 : 1, n = 2 * s + 1, g = new THREE.BoxGeometry(w, h, d, n, n, n), p = g.attributes.position, nm = g.attributes.normal;
  const half = [w / 2, h / 2, d / 2], inner = half.map(a => a - r), v = [0, 0, 0], c = [0, 0, 0];
  const row = (x, a, ia) => { const i = Math.round((x / a + 1) * n / 2), j = i <= s ? s - i : i >= n - s ? i - n + s : 0;
    return Math.sign(x || (i - n / 2)) * (ia + r * Math.tan(Math.PI / 4 * j / s)); };
  for (let i = 0; i < p.count; i++) {
    let q = 0; for (let a = 0; a < 3; a++) { v[a] = row(p.getComponent(i, a), half[a], inner[a]); c[a] = Math.max(-inner[a], Math.min(inner[a], v[a])); v[a] -= c[a]; q += v[a] * v[a]; }
    q = Math.sqrt(q); if (q < 1e-9) continue;
    p.setXYZ(i, c[0] + v[0] / q * r, c[1] + v[1] / q * r, c[2] + v[2] / q * r); nm.setXYZ(i, v[0] / q, v[1] / q, v[2] / q);
  }
  return (GEO[k] = g);
}
/** 零件材質：e 可以是發光強度（數字，用本身顏色發光）或發光色碼（字串，強度 0.8） */
const mat = (c, e) => M(c, e ? (typeof e === 'string' ? { emissive: new THREE.Color(e), emissiveIntensity: 0.8 } : { emissive: new THREE.Color(c), emissiveIntensity: e }) : {});
/** 程式化家具模型（data/furnmodels.js，img2threejs 重建）用的工具：材質一律走 M()，光影與地平線彎曲和其他物件一致 */
const KIT = { mat: (c, o, k) => M(c, o, k), rbox: (w, h, d, r) => rbox(w, h, d, r || 0) };
const PROTO = {};   // 程式化模型每種只建一次，之後 clone（共用幾何與材質；房間、夢境島、縮圖會重複用到同一件）
/** 依零件組出家具模型（原點在佔地中心地板）；有程式化模型（TA.ISLE.FURNMODELS[id]）就用它，建立失敗才退回零件 */
export function buildFurniture(f) {
  const fac = (I.FURNMODELS || {})[f.id];
  if (fac && PROTO[f.id] !== null) {
    try {
      if (!PROTO[f.id]) {
        const p = fac(THREE, KIT); if (!(p && p.isObject3D)) throw new Error('沒有回傳 Object3D');
        // 清掉建模工具留在 userData 的紀錄（可能好幾 MB）：clone 每次都會把 userData 整包序列化
        p.traverse(o => { o.userData = {}; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        PROTO[f.id] = p;
      }
      const m = PROTO[f.id].clone(true); m.userData.fid = f.id; return m;
    } catch (e) { PROTO[f.id] = null; console.warn('程式化家具模型建立失敗，改用零件：' + f.id, e); }
  }
  const g = new THREE.Group();
  (f.parts || []).forEach(pt => {
    let geo;
    if (pt.t === 'box') geo = rbox(pt.s[0], pt.s[1], pt.s[2], pt.r || 0);
    else if (pt.t === 'cyl') geo = new THREE.CylinderGeometry(pt.rt ?? pt.r ?? 0.2, pt.rb ?? pt.r ?? 0.2, pt.h || 0.2, 16);
    else if (pt.t === 'sph') geo = new THREE.SphereGeometry(pt.r || 0.2, 16, 12);
    else if (pt.t === 'cone') geo = new THREE.ConeGeometry(pt.r || 0.2, pt.h || 0.3, 16);
    else if (pt.t === 'tor') geo = new THREE.TorusGeometry(pt.r || 0.2, pt.tube || 0.04, 8, 20);
    else return;
    const m = new THREE.Mesh(geo, mat(pt.c || '#cccccc', pt.e));
    m.position.fromArray(pt.p || [0, 0, 0]);
    if (pt.t === 'sph' && pt.sy) m.scale.y = pt.sy;
    if (pt.rx) m.rotation.x = pt.rx; if (pt.ry) m.rotation.y = pt.ry; if (pt.rz) m.rotation.z = pt.rz;
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  });
  g.userData.fid = f.id;
  return g;
}

/* ---------- 縮圖（離屏渲染，快取） ---------- */
let thumbR = null; const thumbs = {};
export function thumb(id) {
  if (thumbs[id]) return thumbs[id];
  const f = furn(id); if (!f) return '';
  if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(112, 112); thumbR.outputColorSpace = THREE.SRGBColorSpace; thumbR.toneMapping = THREE.ACESFilmicToneMapping; }
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#8a7a6a', 1.6)); const d = new THREE.DirectionalLight('#ffffff', 1.6); d.position.set(-2, 4, 3); sc.add(d);
  const m = buildFurniture(f); sc.add(m);
  const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3()), r = Math.max(size.x, size.y, size.z) * 0.95 + 0.1;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(ctr.x + r * 1.3, ctr.y + r * 1.2, ctr.z + r * 1.9); cam.lookAt(ctr);
  const saved = U.uCurve.value; U.uCurve.value = 0; thumbR.render(sc, cam); U.uCurve.value = saved;
  return (thumbs[id] = thumbR.domElement.toDataURL());
}

/* ---------- 房間外殼 ---------- */
export function patternTex(p) {
  // 512 × 512 的手繪感花樣：每種花樣都疊一層細細的紙紋／木紋，近看不會是平平的色塊
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
  let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const shade = (hex, k) => { const col = new THREE.Color(hex).multiplyScalar(k); return '#' + col.getHexString(); };
  c.fillStyle = p.c1; c.fillRect(0, 0, S, S); c.fillStyle = p.c2; c.strokeStyle = p.c2;
  if (p.pattern === 'wood') {
    // 木地板：一排排錯開的長板子，每片深淺略有不同（同一個色調），細長的木紋、偶爾一個節眼，板縫細細一條；左右上下都能無縫重複
    const rows = 6, ph = S / rows, len = S * 0.5;
    for (let r = 0; r < rows; r++) {
      const off = ((r * 0.37) % 1) * len;
      for (let x0 = off - len; x0 < S; x0 += len) {
        const tone = 0.92 + rnd() * 0.16, grain = [];
        for (let i = 0; i < 18; i++) grain.push([rnd() * 0.3, 3 + rnd() * (ph - 6), 0.3 + rnd() * 0.7, 1 + rnd() * 1.5, 0.06 + rnd() * 0.1]);
        const knot = rnd() < 0.3 ? [rnd(), ph * (0.3 + rnd() * 0.4)] : null;
        for (const sx of [0, S]) {   // 超出右邊的部分從左邊補回來
          const x = x0 - sx; if (x + len < 0 || x > S) continue;
          c.globalAlpha = 1; c.fillStyle = shade(p.c1, tone); c.fillRect(x, r * ph, len, ph);
          c.fillStyle = shade(p.c2, 0.8);
          grain.forEach(([gx, gy, gw, gh, ga]) => { c.globalAlpha = ga; c.fillRect(x + gx * len, r * ph + gy, len * gw, gh); });
          if (knot) { c.globalAlpha = 0.22; c.beginPath(); c.ellipse(x + knot[0] * len, r * ph + knot[1], 8, 3.5, 0, 0, 7); c.fill(); }
          c.globalAlpha = 0.55; c.fillStyle = shade(p.c2, 0.6); c.fillRect(x, r * ph, 2, ph);
        }
      }
      c.globalAlpha = 0.6; c.fillStyle = shade(p.c2, 0.55); c.fillRect(0, (r + 1) * ph - 2, S, 2); c.globalAlpha = 0.25; c.fillStyle = '#fff4dc'; c.fillRect(0, r * ph, S, 1.5); c.globalAlpha = 1;
    }
  } else if (p.pattern === 'stripe') {
    for (let x = 0; x < S; x += 128) { c.fillRect(x, 0, 56, S); c.globalAlpha = 0.25; c.fillStyle = shade(p.c2, 0.85); c.fillRect(x + 54, 0, 2, S); c.fillRect(x, 0, 2, S); c.globalAlpha = 1; c.fillStyle = p.c2; }
  } else if (p.pattern === 'check') {
    for (let y = 0; y < S; y += 128) for (let x = 0; x < S; x += 128) if ((x + y) / 128 % 2) c.fillRect(x, y, 128, 128);
    c.globalAlpha = 0.35; c.fillStyle = shade(p.c2, 0.7); for (let x = 0; x <= S; x += 128) { c.fillRect(x - 1, 0, 2, S); c.fillRect(0, x - 1, S, 2); } c.globalAlpha = 1;
  } else if (p.pattern === 'dot') {
    for (let y = 64; y < S; y += 128) for (let x = 64 + (y / 128 % 2) * 64; x < S + 70; x += 128) { c.beginPath(); c.arc(x % S, y, 22, 0, 7); c.fill(); c.globalAlpha = 0.3; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x % S - 7, y - 7, 7, 0, 7); c.fill(); c.globalAlpha = 1; c.fillStyle = p.c2; }
  } else if (p.pattern === 'tile') {
    for (let y = 0; y < S; y += 256) for (let x = 0; x < S; x += 256) { c.fillStyle = shade(p.c1, 0.94 + rnd() * 0.1); c.fillRect(x, y, 256, 256); }
    c.fillStyle = p.c2; for (let x = 0; x <= S; x += 256) { c.fillRect(x - 5, 0, 10, S); c.fillRect(0, x - 5, S, 10); }
  }
  // v7.7 夢幻風：水彩暈染——幾團很淡的暖杏與薰衣草色塊（四邊接續，重複貼時看不出接縫）
  for (let i = 0; i < 12; i++) {
    const x = rnd() * S, y = rnd() * S, r = 70 + rnd() * 120, warm = i % 2 === 0;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, warm ? 'rgba(255,226,196,0.09)' : 'rgba(214,204,246,0.09)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  // 紙紋／材質雜訊：一點點細小的明暗
  const img = c.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
const shell = new THREE.Group(); scene.add(shell);
const floorMat = bend(new THREE.MeshStandardMaterial({ roughness: 0.85 })), wallMat = bend(new THREE.MeshStandardMaterial({ roughness: 0.95 }));
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(R, R), floorMat); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; shell.add(fl); shell.userData.floor = fl;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(R, WALL_H), wallMat); back.position.set(0, WALL_H / 2, -H); back.receiveShadow = true; shell.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(R, WALL_H), wallMat); left.position.set(-H, WALL_H / 2, 0); left.rotation.y = Math.PI / 2; left.receiveShadow = true; shell.add(left);
  const right = left.clone(); right.position.x = H; right.rotation.y = -Math.PI / 2; shell.add(right);
  const trim = M('#8a6a4a');
  { // 腰板：牆的下半段是一圈淺色的木板護牆，上緣一條腰線；天花板下一條頂飾線——房間看起來是有做工的木屋，而不是三面平板
    const panel = M('#e8dcc4', { roughness: 0.8 }), rail = M('#b89a72'), crown = M('#f3ecdf');
    const PH = 0.95, T = 0.03;
    [[0, -H + T / 2, R, T, 0], [-H + T / 2, 0, T, R, 1], [H - T / 2, 0, T, R, 1]].forEach(([x, z, w, d, side]) => {
      const pn = new THREE.Mesh(new THREE.BoxGeometry(w, PH, d), panel); pn.position.set(x, PH / 2, z); pn.receiveShadow = true; shell.add(pn);
      // 直條的板縫：一片片直立的木板
      for (let k = -H + 0.5; k < H; k += 0.5) { const seam = new THREE.Mesh(new THREE.BoxGeometry(side ? 0.012 : 0.02, PH - 0.05, side ? 0.02 : 0.012), rail); seam.position.set(side ? x + Math.sign(-x) * 0.012 : k, PH / 2, side ? k : z + 0.012); shell.add(seam); }
      const rl = new THREE.Mesh(new THREE.BoxGeometry(side ? 0.07 : w, 0.06, side ? d : 0.07), rail); rl.position.set(side ? x + Math.sign(-x) * 0.02 : x, PH + 0.03, side ? z : z + 0.02); shell.add(rl);
      const cr = new THREE.Mesh(new THREE.BoxGeometry(side ? 0.09 : w, 0.1, side ? d : 0.09), crown); cr.position.set(side ? x + Math.sign(-x) * 0.03 : x, WALL_H - 0.05, side ? z : z + 0.03); shell.add(cr);
    });
  }
  [[0, -H + 0.04, R, 0.08], [-H + 0.04, 0, 0.08, R], [H - 0.04, 0, 0.08, R]].forEach(([x, z, w, d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), trim); b.position.set(x, 0.09, z); shell.add(b); });
  // 窗戶：白天透出天光，夜晚是深藍夜空
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), M('#bfe8ff', { emissive: new THREE.Color('#bfe8ff'), emissiveIntensity: 0.8 })); win.position.set(1.6, 1.8, -H + 0.02); shell.add(win); shell.userData.win = win;
  { const fm = M('#ffffff'); [[0, 0.6, 1.8, 0.1], [0, -0.6, 1.8, 0.1], [-0.85, 0, 0.1, 1.3], [0.85, 0, 0.1, 1.3]].forEach(([x, y, w, h]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), fm); r.position.set(1.6 + x, 1.8 + y, -H + 0.03); shell.add(r); }); }   // 窗框是四條邊，中間露出玻璃（原本是一整塊白板擋在玻璃前面）
  { // 窗櫺（十字）、窗台與兩片垂下的窗簾
    const wood = M('#f4efe4');
    [[0, 0, 0.06, 1.1], [0, 0, 1.6, 0.06]].forEach(([x, y, w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), wood); m.position.set(1.6 + x, 1.8 + y, -H + 0.05); shell.add(m); });
    const sill = new THREE.Mesh(rbox(1.95, 0.06, 0.2, 0.02), M('#d8c8a8')); sill.position.set(1.6, 1.2, -H + 0.1); shell.add(sill);
    const cur = M('#f2d8c4', { roughness: 1 }); [-1, 1].forEach(sx => { const cm = new THREE.Mesh(rbox(0.32, 1.5, 0.05, 0.02), cur); cm.position.set(1.6 + sx * 1.02, 1.85, -H + 0.08); shell.add(cm); });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 8), M('#8a6a4a')); rod.rotation.z = Math.PI / 2; rod.position.set(1.6, 2.62, -H + 0.08); shell.add(rod);
  }
  const mat0 = new THREE.Mesh(rbox(1.4, 0.04, 0.8, 0.03), M('#ffffff', { map: doormatTex() })); mat0.position.set(0, 0.02, H - 0.45); shell.add(mat0);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(R + 0.12, 0.34, 0.16), M('#6e4a32')); lip.position.set(0, -0.17, H + 0.08); shell.add(lip);   // 地板前緣的厚度（不是一張紙）
}
function applyPaper() {
  const s = S(), r = data();
  const w = paper('wall', r.wall) || { c1: '#f6ead0', c2: '#efdcb8', pattern: 'stripe' }, f = paper('floor', r.floor) || { c1: '#c99a62', c2: '#a87a48', pattern: 'wood' };
  wallMat.map = patternTex(w); wallMat.map.repeat.set(4, 1.5); wallMat.needsUpdate = true;
  floorMat.map = patternTex(f); floorMat.map.repeat.set(4, 4); floorMat.needsUpdate = true;
  void s;
}

/* ---------- 存檔 ---------- */
let cur = { own: true };
export const isOwn = () => cur.own;
/** 飯店客房：可以佈置，但家具來自目錄、不消耗倉庫 */
export const isEdit = () => !!cur.edit;
export const roomData = () => data();
export const hostSid = () => cur.sid || null;
const data = () => (cur.own ? room() : cur.home);
/** v7.6：玩家家的整棟室內用「我的房間」的家具、壁紙與地板（資料還是同一份；佈置時切到這裡的俯視擺放） */
export function ownDecor() { cur = { own: true }; applyPaper(); return { wall: wallMat, floor: floorMat, items: room().items }; }
export function room() { const s = S(); s.room = s.room || { items: [], wall: '', floor: '' }; s.storage = s.storage || {}; return s.room; }
/** 主題角落（v7.1）：附近（2.2 公尺內）湊齊幾類家具就成形。島嶼評價看有幾種角落，不只看家具數量；來作客的導師會注意到 */
export const CORNERS = [
  { id: 'study', name: '讀書角', need: ['study', 'seat', 'light'], tip: '書桌類、椅子、燈放在一起' },
  { id: 'tea', name: '茶點角', need: ['table', 'seat', 'plant'], tip: '桌子、椅子、植物放在一起' },
  { id: 'exhibit', name: '展示角', need: ['trophy', 'trophy', 'light'], tip: '兩件獎盃或研究成果，加一盞燈' },
  { id: 'green', name: '綠意角', need: ['plant', 'plant', 'plant'], tip: '三盆植物擺在一起' },
  { id: 'sleep', name: '安眠角', need: ['bed', 'light', 'rug'], tip: '床、燈和地毯' },
];
export function corners(r) {
  const items = ((r || room()).items || []).map(it => ({ it, f: furn(it.id) })).filter(o => o.f);
  return CORNERS.filter(T => items.some(a => {
    const cnt = {}; items.filter(o => Math.hypot(o.it.x - a.it.x, o.it.z - a.it.z) <= 2.2).forEach(o => { cnt[o.f.cat] = (cnt[o.f.cat] || 0) + 1; });
    const need = {}; T.need.forEach(c => { need[c] = (need[c] || 0) + 1; });
    return Object.keys(need).every(c => (cnt[c] || 0) >= need[c]);
  }));
}
export function addStorage(id, n) { const s = S(); s.storage = s.storage || {}; s.storage[id] = (s.storage[id] || 0) + (n || 1); s.catalog = s.catalog || {}; s.catalog[id] = s.catalog[id] || Date.now(); save(); }   // 收藏目錄：拿到過就登錄
export const foot = (f, r) => { const [w, d] = f.size || [1, 1]; return r % 2 ? [d, w] : [w, d]; };
function occupied(ignore) {
  const g = new Set();
  data().items.forEach(it => { if (it === ignore) return; const f = furn(it.id); if (!f || f.cat === 'rug') return; const [w, d] = foot(f, it.r); for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) g.add((it.x + x) + ',' + (it.z + z)); });
  return g;
}
function fits(f, x, z, r, ignore) {
  const [w, d] = foot(f, r); if (x < 0 || z < 0 || x + w > R || z + d > R) return false;
  if (f.cat === 'rug') return true;
  const occ = occupied(ignore); for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) if (occ.has((x + dx) + ',' + (z + dz))) return false;
  if (z + d >= R && x <= 4 && x + w > 3) return false; // 門口要留路
  return true;
}
const placed = new THREE.Group(); scene.add(placed);
const lights = [];
function rebuild() {
  while (placed.children.length) placed.remove(placed.children[0]);
  lights.forEach(l => scene.remove(l)); lights.length = 0;
  data().items.forEach(it => {
    const f = furn(it.id); if (!f) return;
    const m = buildFurniture(f), [w, d] = foot(f, it.r);
    m.position.set(it.x + w / 2 - H, f.cat === 'rug' ? 0.001 : 0, it.z + d / 2 - H); m.rotation.y = -it.r * Math.PI / 2; m.userData.item = it;
    placed.add(m);
    if (f.light && lights.length < 4) { const l = new THREE.PointLight('#ffd9a0', f.light * 3, 0, 2); l.userData.k = f.light; l.position.set(m.position.x * 0.92, 1.6, m.position.z * 0.92); scene.add(l); lights.push(l); }   // 燈往房間中央挪一點：靠牆的燈不會把牆照出一塊白
  });
}

/* ---------- 進出 ---------- */
export let inside = false;
let P = null, onExit = null, savedCurve = 0;
export function enter(player, exitCb, opt) {
  ui.iris();
  cur = opt && opt.home ? { own: false, home: opt.home, sid: opt.sid, edit: !!opt.edit, catalog: opt.catalog || null, papers: opt.papers || null, onChange: opt.onChange || null } : { own: true };
  P = player; onExit = exitCb; inside = true; room(); applyPaper(); rebuild();
  savedCurve = U.uCurve.value; U.uCurve.value = 0;
  scene.add(P); P.position.set(0, 0, H - 0.8); P.rotation.y = Math.PI;
  camPos.set(0, 9, 10.5);
  Audio.sfx('open'); document.body.classList.add('in-room'); document.body.classList.toggle('visiting', !cur.own && !cur.edit);
}
export function exit() {
  ui.iris();
  inside = false; mode = null; if (ghost) { scene.remove(ghost); ghost = null; }
  U.uCurve.value = savedCurve || CURVE; document.body.classList.remove('in-room', 'visiting');
  Audio.sfx('open'); onExit && onExit();
}

/* ---------- 移動 ---------- */
export function walkable(x, z) {
  if (x < -H + 0.3 || x > H - 0.3 || z < -H + 0.3) return false;
  if (z > H - 0.3) return Math.abs(x) < 0.9; // 門口
  const cx = Math.floor(x + H), cz = Math.floor(z + H);
  return !occupied().has(cx + ',' + cz);
}
/** 面前的家具 */
export function facingItem() {
  const fx = P.position.x + Math.sin(P.rotation.y) * 0.8, fz = P.position.z + Math.cos(P.rotation.y) * 0.8;
  const cx = Math.floor(fx + H), cz = Math.floor(fz + H);
  return data().items.find(it => { const f = furn(it.id); if (!f) return false; const [w, d] = foot(f, it.r); return cx >= it.x && cx < it.x + w && cz >= it.z && cz < it.z + d; });
}
let bedHook = null;
/** 自己家的床可以睡覺（夢境複習）：由 main.js 設定 */
export const setBedHook = f => { bedHook = f; };
let visitHook = null;
/** 拜訪別人的家時查看家具：hook(it, f) 處理了就回傳 true（main.js：導師家的書桌翻筆記、招牌家具的台詞） */
export const setVisitItemHook = f => { visitHook = f; };
export async function itemMenu(it) {
  const f = furn(it.id);
  if (!cur.own && !cur.edit) { if (visitHook && await visitHook(it, f)) return; await ui.say(null, `${f.name}：${f.desc || ''}`); ui.closeDialog(); return; }
  const bed = cur.own && f.cat === 'bed' && bedHook;
  let i = await ui.ask(null, `${f.name}：${f.desc || ''}`, bed ? ['睡一覺（夢境複習）', '轉個方向', '收進倉庫', '取消'] : ['轉個方向', '收進倉庫', '取消']);
  ui.closeDialog();
  if (bed) { if (i === 0) { await bedHook(); return; } i--; }
  if (i === 0) { const r = (it.r + 1) % 4; if (fits(f, it.x, it.z, r, it)) { it.r = r; save(); rebuild(); Audio.sfx('pop'); } else ui.toast('這個方向放不下'); }
  if (i === 1) { data().items.splice(data().items.indexOf(it), 1); if (!cur.edit) addStorage(it.id); save(); rebuild(); Audio.sfx('pop'); ui.toast(cur.edit ? `收起了${f.name}` : `${f.name} 收進倉庫了`); cur.onChange && cur.onChange(); }
}

/* ---------- 裝潢模式 ---------- */
let mode = null, ghost = null;
export const placing = () => !!mode;
export function openDecor() {
  if (!cur.own && !cur.edit) { ui.toast('這是別人的家，不能裝潢喔'); return; }
  const s = S(), r = data(), body = ui.el('div', 'decor'), ed = cur.edit;
  const ids = ed ? (cur.catalog || []).filter(id => furn(id)) : Object.keys(s.storage || {}).filter(id => s.storage[id] > 0 && furn(id));
  const grid = ui.el('div', 'dex-grid');
  if (!ids.length) grid.appendChild(ui.el('p', 'muted', '倉庫是空的。到潮汐商店找阿潮買家具，或和島民變熟後會收到禮物。'));
  ids.forEach(id => { const f = furn(id), b = ui.el('button', 'dex-cell', `<img src="${thumb(id)}" alt="">${s.storage[id] > 1 ? `<i>×${s.storage[id]}</i>` : ''}`); b.type = 'button'; b.title = f.name; if (ed && f.hotel && f.hotel === cur.sid) b.classList.add('theme'); b.onclick = () => { ui.closePanel(); startPlace(id); }; grid.appendChild(b); });
  const papers = ui.el('div', 'papers');
  const edPapers = cur.papers;   // 下面 row() 的參數 cur 會蓋掉模組的 cur
  const row = (kind, list, cur, owned) => {
    const box = ui.el('div', 'paper-row', `<b>${kind === 'wall' ? '壁紙' : '地板'}</b>`);
    list.filter(p => (ed ? (edPapers || owned) : owned).includes(p.id)).forEach(p => { const b = ui.el('button', 'paper' + (cur === p.id ? ' on' : ''), ''); b.type = 'button'; b.title = p.name; b.style.background = `linear-gradient(135deg, ${p.c1} 50%, ${p.c2} 50%)`; b.onclick = () => { r[kind === 'wall' ? 'wall' : 'floor'] = p.id; save(); applyPaper(); Audio.sfx('pop'); openDecor(); }; box.appendChild(b); });
    return box;
  };
  s.papers = s.papers || [];
  papers.append(row('wall', I.WALLPAPER || [], r.wall, s.papers), row('floor', I.FLOORING || [], r.floor, s.papers));
  const how = matchMedia('(pointer: coarse)').matches ? '點地板直接放下，「↻ 旋轉」轉向、「✕ 結束」取消' : '方向鍵或滑鼠移動、R 旋轉、E／點擊放下、Esc 取消';   // 觸控裝置沒有鍵盤：改說畫面上的按鈕
  body.append(ui.el('p', 'muted', ed ? `飯店的家具目錄可以隨意使用，不會用掉你倉庫裡的東西。有黃框的是這間客房主題的家具。${how}。` : `點家具開始擺放：${how}。${ui.keys('對著已擺好的家具按 E 可以轉向或收起。')}`), grid, papers);
  ui.panel(ed ? '佈置客房' : '裝潢', body, { cls: 'decor-p' });
}
function startPlace(id) {
  cancelPlace();
  const f = furn(id); mode = { id, r: 0, x: 3, z: 3 };
  ghost = buildFurniture(f); ghost.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.6; m.castShadow = false; } }); scene.add(ghost);
  moveGhost(0, 0); ui.toast('擺放模式：R 旋轉、E 放下、Esc 取消');
}
function moveGhost(dx, dz) {
  const f = furn(mode.id), [w, d] = foot(f, mode.r);
  mode.x = Math.max(0, Math.min(R - w, mode.x + dx)); mode.z = Math.max(0, Math.min(R - d, mode.z + dz));
  ghost.position.set(mode.x + w / 2 - H, 0.02, mode.z + d / 2 - H); ghost.rotation.y = -mode.r * Math.PI / 2;
  const ok = fits(f, mode.x, mode.z, mode.r); ghost.traverse(m => { if (m.isMesh) m.material.emissive = new THREE.Color(ok ? '#000000' : '#ff3030'), m.material.emissiveIntensity = ok ? 0 : 0.6; });
}
function place() {
  const f = furn(mode.id);
  if (!fits(f, mode.x, mode.z, mode.r)) { ui.toast('這裡放不下'); Audio.sfx('deny'); return; }
  const s = S(); if (!cur.edit) { s.storage[mode.id]--; if (s.storage[mode.id] <= 0) delete s.storage[mode.id]; }
  data().items.push({ id: mode.id, x: mode.x, z: mode.z, r: mode.r }); save(); rebuild(); Audio.sfx('ok');
  cancelPlace(); cur.onChange && cur.onChange();
}
function cancelPlace() { mode = null; if (ghost) { scene.remove(ghost); ghost = null; } }
export function key(e) {
  if (!mode) return false;
  const k = e.code;
  if (k === 'ArrowLeft' || k === 'KeyA') moveGhost(-1, 0); else if (k === 'ArrowRight' || k === 'KeyD') moveGhost(1, 0);
  else if (k === 'ArrowUp' || k === 'KeyW') moveGhost(0, -1); else if (k === 'ArrowDown' || k === 'KeyS') moveGhost(0, 1);
  else if (k === 'KeyR') { mode.r = (mode.r + 1) % 4; moveGhost(0, 0); Audio.sfx('tick'); }
  else if (k === 'KeyE' || k === 'Space' || k === 'Enter') place();
  else if (k === 'Escape' || k === 'KeyQ') cancelPlace();
  else return false;
  e.preventDefault(); return true;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
function floorAt(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, hitP) ? hitP.clone() : null; }
export function pointerMove(e) {
  if (!mode) return; const p = floorAt(e); if (!p) return;
  const f = furn(mode.id), [w, d] = foot(f, mode.r);
  const nx = Math.round(p.x + H - w / 2), nz = Math.round(p.z + H - d / 2);
  moveGhost(nx - mode.x, nz - mode.z);
}
/** 點擊：擺放模式放下；否則回傳地板座標給主程式走過去 */
export function pointerDown(e) { if (mode) { pointerMove(e); place(); return null; } return floorAt(e); }

/* ---------- 每幀 ---------- */
const camPos = new THREE.Vector3(0, 9, 10.5);
export function render(dt, night, o) {
  o = o || {};
  const tx = P ? P.position.x * 0.35 : 0, tz = P ? P.position.z * 0.25 : 0;
  const za = camera.aspect < 1.2 ? 1 + (1.2 - camera.aspect) * 1.1 : 1;
  camPos.lerp(new THREE.Vector3(tx, 9 * za, (10.5 + tz) * za), Math.min(1, dt * 3));
  camera.position.copy(camPos); camera.lookAt(tx, 0.6, tz + 0.2);
  const win = shell.userData.win; win.material.emissive.set(night > 0.5 ? '#2a3a6a' : '#cfeeff'); win.material.color.set(night > 0.5 ? '#2a3a6a' : '#cfeeff');
  // 窗光：白天淡淡的暖白、黃昏轉成金橘色、冬天偏冷白，夜晚沒有
  const g = o.golden || 0, day = 1 - THREE.MathUtils.smoothstep(night, 0.2, 0.6);
  keyL.intensity = 0.25 + day * 0.4; hemi.intensity = 0.24 + day * 0.18; ceil.intensity = 2.5 + (1 - day) * 14;   // 白天燈開得小，晚上撐起一圈暖光
  lights.forEach(l => { l.intensity = l.userData.k * (1.2 + (1 - day) * 2.6); });
  washL.forEach(l => { l.intensity = 10 * (0.22 * day + (1 - day)); });   // 洗牆燈：白天調暗、晚上全亮
  beamU.uCol.value.copy(o.winter ? WARM.snow : WARM.day).lerp(WARM.gold, g); beamU.uAmt.value = day * (0.34 + g * 0.36); beamU.uTime.value = o.t || 0;
  beam.spot.material.color.copy(beamU.uCol.value); beam.spot.material.opacity = day * (0.22 + g * 0.25);
  winL.color.copy(beamU.uCol.value).lerp(WARM.day, 0.4); winL.intensity = day * (34 + g * 10) + (1 - day) * 1.2;
  beam.m.visible = beam.spot.visible = beam.dust.visible = day > 0.02;
  if (o.winter && night <= 0.5) { win.material.emissive.set('#eef4ff'); win.material.color.set('#eef4ff'); }
  if (g > 0.05 && night <= 0.5) { win.material.emissive.lerp(WARM.gold, g * 0.6); }
  // 夜晚燈光更暖、更集中
  ceil.color.set(night > 0.5 ? '#ffc980' : '#ffe2b0'); keyL.color.set(g > 0.05 ? '#ffd8a8' : '#fff0d8');
  if (beam.dust.visible) {
    const t = o.t || 0, p = beam.pos, b = beam.base;
    for (let i = 0; i < p.length / 3; i++) { const s = beam.sd[i]; p[i * 3] = b[i * 3] + Math.sin(t * 0.3 + s * 20) * 0.12; p[i * 3 + 1] = b[i * 3 + 1] + Math.sin(t * 0.21 + s * 13) * 0.1; p[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 0.25 + s * 17) * 0.1; }
    beam.pg.attributes.position.needsUpdate = true; beam.dust.material.opacity = 0.5 * day + g * 0.3;
  }
  // 室內也走後製：牆角的環境光遮蔽、燈的泛光、暈影；景深對焦在角色身上、比戶外淡
  const fx = post.fx, dof0 = fx.dof, ao0 = fx.ao;
  fx.golden = g * 0.5; fx.clear = 1; fx.sunVis = 0; fx.night = night; fx.focus = P ? camera.position.distanceTo(P.position) : 12; fx.dof = dof0 * 0.45; fx.ao = ao0 * 1.5;   // 室內牆角陰影更明顯
  post.render(o.t || 0, scene, camera);
  fx.dof = dof0; fx.ao = ao0;
}
