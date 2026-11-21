/* 潮汐小島 · 潛水（v9.0）：游到海面冒泡泡的潛點按 E，潛進一小片海底——淺灘、海草床、珊瑚礁或外海深處（swim.js 決定是哪一種）。
   - 方向鍵在水裡游（Shift 游得快，但會嚇跑游得快的生物）、空白鍵往上踢一下，放開會慢慢沉回離海底約一公尺。
   - 每次遇到 3–4 種當下出沒的海洋生物（data/marine.js：棲地、月份、時刻、潮位）。游到旁邊按 E 答一題生物或地科題：
     答對就帶回一隻、登錄圖鑑；保育類、珊瑚、硨磲貝與鸚鵡螺只拍照記錄，照片直接送進博物館的海洋館。
   - 氧氣大約 90 秒（答題時不算）。快用完、或附近沒有生物時按 E，就浮上水面回到潛點。
   - 水下的光：從下往上看的海面波光、白天斜射的光柱、海底的焦散光紋、漂浮的海雪、魚群與自己吐的泡泡；夜裡潛水時頭燈亮起。
   模型在 data/marinemodels.js 與 data/reefmodels.js（Codex 製作）。 */
import * as THREE from 'three';
import { camera, U, M, bend, CURVE, scene as mainScene } from './engine.js';
import { animate, setExpr } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as post from './post.js';
import { I, S, save, addItem, icon, stars, available, photoOnly } from './state.js';
import { pickQU, pickQ, record, fairSec } from './quiz.js';
import * as challenge from './challenge.js';
import * as miles from './miles.js';
import * as feel from './feel.js';
import * as fieldnote from './fieldnote.js';
import * as tide from './tide.js';
import { swap as realSwap, realMove } from './real.js';

export let inside = false;
const DIVE = { name: '海底', color: '#2f86b8', voice: 520 };
const AIR = 90, R = 14;   // 氧氣（秒）、可以游的範圍（公尺）
export const HAB = {
  shallow: { name: '淺灘', sand: '#d9cba6', grass: 0, water: '#4aa3aa', depth: 4.6, fog: 0.05, fish: ['#c9b37a', '#9fb4bf'] },
  seagrass: { name: '海草床', sand: '#c9bd8f', grass: 1, water: '#3f9a88', depth: 5.2, fog: 0.055, fish: ['#a9b47e', '#d8dbd2'] },
  reef: { name: '珊瑚礁', sand: '#dcd0b4', grass: 0, water: '#2d8fb0', depth: 6.6, fog: 0.045, fish: ['#e0904a', '#5b88b8'] },
  deep: { name: '外海深處', sand: '#7f8189', grass: 0, water: '#173f63', depth: 10, fog: 0.075, fish: ['#c0d8f0', '#8090a8'] }
};
/* v9.26 每種棲地的水下樣貌（海底擺什麼在 layout()）：
   cs／ck／soft 焦散的細密、亮度、柔化——淺灘是細而銳利的亮網，越深越粗越糊越暗，外海深處幾乎沒有；
   rip／rep 沙紋的深淺與密度；silt 海床是細泥；up 抬頭看的水色有多亮 */
const LOOK = {
  shallow: { cs: 5.6, ck: 0.27, soft: 0, rip: 1.2, rep: 15, silt: 0, up: 0.34 },
  seagrass: { cs: 4.3, ck: 0.17, soft: 0.35, rip: 0.75, rep: 18, silt: 0, up: 0.3 },
  reef: { cs: 3.2, ck: 0.13, soft: 0.6, rip: 0.95, rep: 11, silt: 0, up: 0.26 },
  deep: { cs: 1.5, ck: 0.022, soft: 1, rip: 0.85, rep: 8, silt: 1, up: 0.16 }
};
let P = null, ctx = null, SP = null, H = null, L = null, sc = null, savedCurve = CURVE, hud = null;
let air = AIR, kick = 0, pace = 0, lean = 0, warned = false, found = 0, bubT = 1, t0 = 0;
const own = [], creatures = [], decos = [], swayers = [], rays = [], bubbles = [], schools = [];
let bed = null, caus = null, surf = null, snow = null, dome = null, hemi = null, sun = null, lamp = null, fill = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const O = x => (own.push(x), x);   // 這個場景自己建立的幾何與材質：離開時釋放（模型共用的材質不動）

export function init(c) { ctx = c; P = c.player; }

/* ---------- 海底地形 ---------- */
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/* v9.24.12 海床的沙紋：水流在沙上推出一道道二十公分上下的沙脊，會分岔、有深有淺，凹處積了深色的細沙和零星的碎貝。
   一張可以接起來的法線圖和一張明暗圖（進水時才算一次），鋪在海床上；以前海床是一片平滑的底色，看不出大小 */
const RIPPLE = {};
function ripples(silt) {   // v9.26 silt：外海深處的細泥——沒有一道道沙脊，只有寬而淺的流痕、小丘和生物挖的小坑
  const id = silt ? 'silt' : 'sand'; if (RIPPLE[id]) return RIPPLE[id];
  const S = 512, PI2 = Math.PI * 2, per = (x, z, P) => hash(((x % P) + P) % P, ((z % P) + P) % P + P * 17);
  const pn = (x, z, P) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return (per(ix, iz, P) * (1 - u) + per(ix + 1, iz, P) * u) * (1 - v) + (per(ix, iz + 1, P) * (1 - u) + per(ix + 1, iz + 1, P) * u) * v; };
  const Hh = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, w = (pn(u * 5, v * 5, 5) - 0.5) * 1.5 + (pn(u * 13 + 3, v * 13, 13) - 0.5) * 0.45;   // 沙脊不是直線：整條彎來彎去、偶爾併成一條
    const amp = 0.35 + 0.65 * pn(u * 4 + 9, v * 4 + 2, 4), s = Math.sin((v * 13 + w + u * 2) * PI2), crest = s > 0 ? Math.pow(s, 0.7) : -Math.pow(-s, 1.3);   // 脊尖、谷寬
    Hh[y * S + x] = crest * amp * 0.5 + (pn(u * 64, v * 64, 64) - 0.5) * 0.12;
    if (silt) { const lane = Math.sin((v * 5 + (pn(u * 3 + 2, v * 3, 3) - 0.5) * 1.2 + u) * PI2), pit = pn(u * 29 + 7, v * 29 + 3, 29);
      Hh[y * S + x] = lane * 0.09 * amp + (pn(u * 11 + 1, v * 11 + 5, 11) - 0.5) * 0.36 - Math.max(0, pit - 0.72) * 1.2 + (pn(u * 64, v * 64, 64) - 0.5) * 0.09; }
  }
  const mk = fn => { const cv = document.createElement('canvas'); cv.width = cv.height = S; const cx = cv.getContext('2d'), im = cx.createImageData(S, S), d = im.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const o = (y * S + x) * 4, c = fn(x, y); d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
    cx.putImageData(im, 0, 0); const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(15, 15); tx.anisotropy = 8; return tx; };
  const at = (x, y) => Hh[((y + S) % S) * S + (x + S) % S];
  const nrm = mk((x, y) => { const dx = (at(x - 1, y) - at(x + 1, y)) * 5, dy = (at(x, y - 1) - at(x, y + 1)) * 5, l = Math.hypot(dx, dy, 1); return [(dx / l * 0.5 + 0.5) * 255, (dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255]; });
  const col = mk((x, y) => { const h = at(x, y), sp = hash(x * 0.37 + 5, y * 0.73 + 1); let k = 0.9 + h * (silt ? 0.3 : 0.2); if (sp > (silt ? 0.9993 : 0.9975)) k = 1.22; else if (sp < (silt ? 0.0015 : 0.004)) k = 0.6;   // 碎貝的亮點、深色的砂粒（細泥上少得多）
    const g = Math.max(0, Math.min(255, k * 232)); return [g, g * 0.99, g * 0.97]; });
  col.colorSpace = THREE.SRGBColorSpace;
  return (RIPPLE[id] = { nrm, col });
}
function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return (hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u) * (1 - v) + (hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u) * v; }
let seed = 0;
/** 海底的高度（場景座標；水面在 H.depth） */
export function bedY(x, z) { const sx = x + seed, sz = z - seed; return 0.32 * Math.sin(sx * 0.31 + 1.3) * Math.cos(sz * 0.27) + 0.22 * (vnoise(sx * 0.35, sz * 0.35) - 0.5) + 0.08 * Math.sin((sx + sz) * 0.9) + 0.05 * Math.max(0, Math.hypot(x, z) - 15); }

/* ---------- 共用的著色器片段：會動的格狀光紋（焦散、海面波光） ---------- */
const CELL = `vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
  float cell(vec2 p, float t){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = h2(i + g); o = 0.5 + 0.45 * sin(t + 6.2831 * o); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return d2 - d1; }`;
const WV = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
/* v9.18 焦散：水面是幾道不同方向的正弦波疊起來的，光穿過起伏的水面會折射；海底某一點收到的光 = 1 / |折射對應的雅可比行列式|。
   行列式接近 0 的地方就是光聚在一起的亮線——彎彎曲曲、粗細亮度不一、會慢慢流動（以前是格狀的 Voronoi 邊線，看起來像龜裂的磁磚） */
const CAUS_V = 'attribute vec3 aZone; varying vec3 vW; varying float vLit; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vLit = aZone.y; gl_Position = projectionMatrix * viewMatrix * w; }';
const CAUS_F = `uniform float uTime; uniform float uK; uniform float uScale; uniform float uSoft; uniform vec3 uCol; uniform vec3 uCam; uniform float uFog; varying vec3 vW; varying float vLit;
  float caus(vec2 p, float t){ float hxx = 0.0, hyy = 0.0, hxy = 0.0;
    for (int i = 0; i < 6; i++) { float fi = float(i), a = fi * 2.39996 + 0.4, f = 1.5 + fi * 0.33; vec2 d = vec2(cos(a), sin(a));
      float s = sin(dot(d, p) * f + t * (0.8 + fi * 0.17) + fi * 1.7) * (0.8 + 0.2 * sin(fi * 3.1));   // 這道波在這裡的曲率（波高乘上頻率平方，各道差不多）
      hxx -= s * d.x * d.x; hyy -= s * d.y * d.y; hxy -= s * d.x * d.y; }
    float k = 0.85, det = (1.0 + k * hxx) * (1.0 + k * hyy) - k * k * hxy * hxy;
    return 1.0 / max(abs(det), 0.04); }
  void main(){ vec2 p = vW.xz * uScale;   // v9.24.9：光紋的大小跟著水深（淺灘細、深處粗而淡），再疊一層細一倍的，不會到處都是同一種大格子
    float I = caus(p, uTime), c = smoothstep(mix(2.2, 0.75, uSoft), mix(11.0, 3.4, uSoft), I) * mix(0.7, 0.42, uSoft) + smoothstep(0.8, 2.6, I) * 0.06;   // 亮線之外還有一點點散開的光   // v9.26 uSoft：水越深，亮線越糊成一團柔光
    float br = sin(p.x * 1.7 + sin(p.y * 1.3 + uTime * 0.11) * 1.6) * sin(p.y * 1.9 - uTime * 0.07 + sin(p.x * 1.1) * 1.4);
    c *= mix(1.0, smoothstep(-0.5, 0.3, br), 0.8 - 0.4 * uSoft);   // v9.26 亮線一段亮一段斷，不再是一圈圈連起來的大環
    float I2 = caus(p.yx * 1.83 + vec2(3.7, 1.9), uTime * 1.25 + 2.0); c += smoothstep(2.6, 10.0, I2) * 0.34 * (1.0 - uSoft);
    c *= 0.3 + 0.7 * smoothstep(0.2, 0.8, sin(vW.x * 0.41 + uTime * 0.06) * sin(vW.z * 0.37 - uTime * 0.05) * 0.5 + 0.5);   // 一片亮、一片暗
    c *= vLit * clamp(1.0 + vW.y * 1.1, 0.35, 1.6);   // v9.26 跟著地形：沙丘頂離水面近、光聚得亮，窪地暗；礁岩和海草底下照不到
    float d = length(vW - uCam) * uFog; gl_FragColor = vec4(uCol * c * uK * exp(-d * d * 2.4) * (1.0 - smoothstep(21.0, 28.0, length(vW.xz))), 1.0); }`;   // v9.24.13 光紋淡三成、遠處收得更快：海床有了沙紋之後，粗亮的光網反而搶過地形與生物
/* v9.26 海床的材質跟著地形變（頂點屬性 aZone：x 沙紋深淺、y 焦散照得到多少、z 礁岩腳下的碎石）：
   沙紋在沙丘頂深、窪地和海草底下淺，礁岩堆旁換成一粒粒碎珊瑚；海床邊緣整片融進水色，游到邊上也看不到地形的盡頭 */
function bedLook(mat) {
  const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey();
  mat.onBeforeCompile = (sh, r) => { prev(sh, r);
    sh.vertexShader = 'attribute vec3 aZone;\nvarying vec3 vZone;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vZone = aZone;');
    sh.fragmentShader = 'varying vec3 vZone;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        diffuseColor.rgb *= mix(vec3(0.9), sampledDiffuseColor.rgb, clamp(vZone.x, 0.0, 1.0));
        { vec2 gq = vWP.xz * 23.0, gi = floor(gq), gh = fract(sin(vec2(dot(gi, vec2(127.1, 311.7)), dot(gi, vec2(269.5, 183.3)))) * 43758.5453);
          float gk = vZone.z * exp(-vFogDepth * 0.1), gd = smoothstep(0.34, 0.2, length(fract(gq) - 0.5 - (gh - 0.5) * 0.4)), gs = fract(gh.x * 7.3 + gh.y * 3.1);
          diffuseColor.rgb *= 1.0 + gd * (step(1.0 - 0.3 * gk, gs) * 0.42 - step(gs, 0.36 * gk) * 0.38); }
      #endif`).replace('#include <normal_fragment_maps>', `#ifdef USE_NORMALMAP_TANGENTSPACE
        vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
        mapN.xy *= normalScale * vZone.x;
        normal = normalize( tbn * mapN );
      #endif`).replace('#include <fog_fragment>', `#include <fog_fragment>
      #ifdef USE_FOG
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(23.5, 30.5, length(vWP.xz)));
      #endif`);
  };
  mat.customProgramCacheKey = () => key + '-divebed1';
  return mat;
}
const SURF_F = `uniform float uTime; uniform vec3 uCol; uniform vec3 uHi; uniform vec3 uCam; uniform vec3 uFar; varying vec3 vW; ${CELL}
  void main(){ vec2 p = vW.xz * 0.32 + vec2(uTime * 0.05, uTime * 0.03); float c = cell(p, uTime * 0.6), l = 1.0 - smoothstep(0.0, 0.2, c);
    float win = 1.0 - smoothstep(3.0, 15.0, length(vW.xz - uCam.xz));   // 正上方亮（光從水面的窗照進來）
    float far = smoothstep(8.0, 30.0, length(vW.xz - uCam.xz));   // 遠處融進水色（不會在畫面上切出一條硬邊）
    gl_FragColor = vec4(mix(mix(uCol, uHi, clamp(l * 0.5 + win * 0.45, 0.0, 1.0)), uFar, far), mix(0.95, 0.0, far)); }`;
const RAY_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const RAY_F = `uniform float uTime; uniform float uK; uniform float uSeed; uniform vec3 uCol; varying vec2 vUv;
  void main(){ float x = abs(vUv.x - 0.5) * 2.0, e = 1.0 - smoothstep(0.15, 1.0, x), f = smoothstep(0.0, 0.9, vUv.y);
    float fl = 0.6 + 0.4 * sin(uTime * 0.7 + uSeed * 6.0 + vUv.y * 2.5); gl_FragColor = vec4(uCol * e * f * fl * uK, 1.0); }`;
let glowTexC = null;
function glowTex() {
  if (glowTexC) return glowTexC;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return (glowTexC = new THREE.CanvasTexture(cv));
}

/* ---------- 模型（第一次建立後複製；保留 userData.anim） ---------- */
const KIT = { mat: (c, o, k) => M(c, o, k), win: () => M('#bfe8ff', { roughness: 0.1 }) }, PROTO = {};
export function model(table, key) {
  const id = table + ':' + key;
  if (!(id in PROTO)) {
    const fac = ((window.TA.ISLE || {})[table] || {})[key];
    try { PROTO[id] = fac ? fac(THREE, KIT) : null; if (PROTO[id]) PROTO[id].traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
    catch (e) { console.warn('海洋模型建立失敗：' + id, e); PROTO[id] = null; }
  }
  const p = PROTO[id]; if (!p) return null;
  const c = p.clone(true); c.userData = Object.assign({}, p.userData);
  if (table === 'MARINEMODELS') realSwap(c, table, key, 'max');   // v9.12 寫實模型載好就換上（零件動畫改成整隻擺動，見 realMove）
  return c;
}
function fallback(sp) { const g = new THREE.Group(); const m = new THREE.Mesh(O(new THREE.SphereGeometry(0.12, 12, 8)), M('#f0a070')); m.scale.set(1, 0.7, 1.6); g.add(m); g.userData.anim = sp.speed ? 'swim' : 'still'; return g; }

/* ---------- 建立場景 ---------- */
function build() {
  sc = new THREE.Scene(); own.length = 0; creatures.length = decos.length = swayers.length = rays.length = bubbles.length = schools.length = 0;
  const night = ctx.night(), dark = 1 - night * 0.82, W = new THREE.Color(H.water).multiplyScalar(dark);
  const FOG = W.clone().lerp(new THREE.Color('#1d4f6e').multiplyScalar(dark), 0.35);
  sc.background = FOG.clone(); sc.fog = new THREE.FogExp2(FOG, H.fog * 1.25 * (1 + night * 0.6));
  // 背景：平視是水色、抬頭漸漸變亮。v9.26 平視的顏色就是霧色：遠處的海床淡進去之後和背景是同一個顏色，畫面上不再橫著一條地形的邊線（以前背景比霧色灰白得多）
  const DU = { top: { value: FOG.clone().lerp(new THREE.Color('#e8fbff'), L.up * dark) }, bot: { value: FOG.clone() } };
  dome = new THREE.Mesh(O(new THREE.SphereGeometry(60, 24, 12)), O(new THREE.ShaderMaterial({ uniforms: DU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float vY; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(0.0, 0.62, vY)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' })));
  dome.renderOrder = -10; dome.frustumCulled = false; sc.add(dome);
  hemi = new THREE.HemisphereLight(new THREE.Color('#cfeeff').multiplyScalar(dark), new THREE.Color(H.sand).lerp(W, 0.5).multiplyScalar(0.45 * dark), 0.95); sc.add(hemi);
  sun = new THREE.DirectionalLight(new THREE.Color('#e8fbff').multiplyScalar(dark), 1.35 * dark * (H.depth > 8 ? 0.6 : 1)); sun.position.set(3, 20, 5); sc.add(sun, sun.target);
  lamp = new THREE.PointLight('#fff2d0', night > 0.4 ? 9 : 0, 9, 1.6); sc.add(lamp);   // 夜潛的頭燈
  fill = new THREE.PointLight('#cfe8ff', 0.6 + night * 1.6, 7, 2); sc.add(fill);   // 鏡頭這一側的柔光：夜裡角色不會只剩黑影
  // 海底：起伏的沙地，海草床帶點綠
  const lay = layout(), SM = THREE.MathUtils.smoothstep;
  const g = O(new THREE.PlaneGeometry(46, 46, 92, 92)); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(pos.count * 3), zone = new Float32Array(pos.count * 3), base = new THREE.Color(H.sand), c = new THREE.Color();
  const olive = new THREE.Color('#56683f').multiplyScalar(0.8), stone = new THREE.Color(L.silt ? '#5b6068' : '#8d8c80'), mud = new THREE.Color('#4f545e');
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i); const r0 = Math.hypot(x, z);
    if (r0 > 17) { const k = (17 + (r0 - 17) * 2.4) / r0; x *= k; z *= k; pos.setX(i, x); pos.setZ(i, z); }   // v9.26 外圈的格子拉大：同樣的面數，海床的邊退到三十公尺外
    const r = Math.hypot(x, z), y = bedY(x, z) - 0.05 * Math.max(0, r - 19), sx = x + seed, sz = z - seed; pos.setY(i, y);   // 可以游的範圍外不再一路往上翹
    // 沙紋的走向跟著地形彎（貼圖座標被大起伏和一層慢慢變的雜訊推歪），不是整片海床同一個方向
    uv.setXY(i, (x + 5.2 * (vnoise(sx * 0.09 + 40, sz * 0.09 + 7) - 0.5)) / 46, (z + 4 * 0.32 * Math.sin(sx * 0.31 + 1.3) * Math.cos(sz * 0.27) + 4.4 * (vnoise(sx * 0.08 + 11, sz * 0.08 + 23) - 0.5)) / 46);
    const n = vnoise(x * 0.6 + 3, z * 0.6), m = vnoise(x * 0.15 - 7, z * 0.15 + 2), wob = 1 + 0.5 * (vnoise(x * 0.8 + 5, z * 0.8 + 9) - 0.5), hi = SM(y, -0.32, 0.28);
    let hard = 0, mead = 0;
    if (r < 22) for (const p of lay.patches) { const dx = x - p.x, dz = z - p.z, k = 1 - SM(Math.hypot((dx * p.c + dz * p.s) / (p.r * p.long), (dz * p.c - dx * p.s) / (p.r / p.long)) * wob, 0.8, 1.35); if (p.t === 'hard') hard = Math.max(hard, k); else mead = Math.max(mead, k); }
    let shade = 1; if (r < 22) for (const it of lay.items) { if (it.on || it.soft) continue; const fr = FOOT[it.key] * it.s; shade = Math.min(shade, SM(Math.hypot(x - it.x, z - it.z), fr * 0.4, fr * 1.7)); }   // 石頭、珊瑚腳下暗一圈（水下沒有影子貼圖）
    c.copy(base).multiplyScalar((0.72 + n * 0.2) * (0.9 + 0.14 * hi)).lerp(W, 0.12);   // 窪地積細沙，顏色深一點
    if (L.silt) c.lerp(mud, 0.45 * SM(m, 0.3, 0.75) * (1 - hi * 0.6));   // 外海的細泥：一片深、一片淺
    c.lerp(olive, mead * (0.6 + 0.2 * n)).lerp(stone, hard * (0.38 + 0.3 * n)).multiplyScalar(0.66 + 0.34 * shade); col.set([c.r, c.g, c.b], i * 3);
    zone.set([L.rip * (0.3 + 0.9 * hi) * (0.75 + 0.5 * m) * (1 - 0.85 * hard) * (1 - 0.7 * mead), (1 - 0.6 * mead) * (1 - 0.35 * hard) * (0.3 + 0.7 * shade), Math.min(1, hard * 1.15 + (H === HAB.reef ? 0.14 * SM(n, 0.45, 0.9) : 0))], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aZone', new THREE.BufferAttribute(zone, 3)); g.computeVertexNormals();
  { const rp = ripples(L.silt); rp.col.repeat.set(L.rep, L.rep); rp.nrm.repeat.set(L.rep, L.rep);
    bed = new THREE.Mesh(g, O(bedLook(bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, map: rp.col, normalMap: rp.nrm, normalScale: new THREE.Vector2(1.1, 1.1) }))))); } bed.receiveShadow = true; sc.add(bed);
  caus = new THREE.Mesh(g, O(new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uK: { value: L.ck * dark }, uScale: { value: L.cs }, uSoft: { value: L.soft }, uCol: { value: new THREE.Color('#d8fbff') }, uCam: { value: new THREE.Vector3() }, uFog: { value: H.fog } },
    vertexShader: CAUS_V, fragmentShader: CAUS_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, fog: false })));
  sc.add(caus);
  // 從下往上看的海面
  surf = new THREE.Mesh(O(new THREE.PlaneGeometry(90, 90, 1, 1)), O(new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uCol: { value: W.clone().multiplyScalar(1.15) }, uHi: { value: new THREE.Color(night > 0.5 ? '#6f8fb0' : '#f2fdff') }, uCam: { value: new THREE.Vector3() }, uFar: { value: FOG.clone() } },
    vertexShader: WV, fragmentShader: SURF_F, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  surf.rotation.x = Math.PI / 2; surf.position.y = H.depth; sc.add(surf);
  // 光柱（白天）
  if (night < 0.5) for (let i = 0; i < 8; i++) {
    const w = 1.4 + Math.random() * 1.8, m = new THREE.Mesh(O(new THREE.PlaneGeometry(w, H.depth + 1, 1, 1).translate(0, (H.depth + 1) / 2, 0)), O(new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uSeed: { value: Math.random() }, uCol: { value: new THREE.Color('#e6fbff') } },
      vertexShader: RAY_V, fragmentShader: RAY_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })));
    const a = Math.random() * 6.28, r = 2 + Math.random() * 10; m.position.set(Math.cos(a) * r, bedY(Math.cos(a) * r, Math.sin(a) * r) - 0.3, Math.sin(a) * r); m.renderOrder = 3; sc.add(m); rays.push({ m, base: (0.12 + Math.random() * 0.1) * (H.depth > 8 ? 0.5 : 1) });
  }
  // 海雪：漂浮的小顆粒
  { const n = 360, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 24, Math.random() * H.depth, (Math.random() - 0.5) * 24], i * 3);
    const sg = O(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    snow = new THREE.Points(sg, O(new THREE.PointsMaterial({ map: glowTex(), color: '#ffffff', size: 0.07, transparent: true, opacity: 0.55 * (0.4 + dark * 0.6), depthWrite: false }))); snow.frustumCulled = false; sc.add(snow); }
  decorate(lay.items); fishSchools(); spawn();
  sc.traverse(o => { o.frustumCulled = false; });
}
/* v9.26 海底的佈置：東西不再一樣一個平均撒在乾淨的沙上，而是一群一群——
   珊瑚礁是幾座礁岩堆（大石旁靠著小石，珊瑚長在石頂、石腰和石腳，海葵和海膽躲在邊上），海草床是幾片長條形的草床（中間密而高、邊上疏而矮、留著缺口），
   淺灘是零星的石堆和一小叢草，外海是幾處露頭的岩石；群和群之間留出大片沙地。避開正中央（下潛的地方）。
   回傳 patches（每一群佔的地：海床在那裡換顏色、沙紋和碎石）和 items（每一件要擺的東西） */
const FOOT = { coral_table: 0.55, coral_branch: 0.34, coral_round: 0.3, rock_a: 0.5, rock_b: 0.36, seagrass_patch: 0.5, sea_urchins: 0.22, anemone_bed: 0.22 };   // 每種模型佔地的半徑（比例 1）
function layout() {
  const items = [], patches = [], spots = [], rnd = Math.random, rr = (a, b) => a + rnd() * (b - a), where = H === HAB.reef ? 'reef' : H === HAB.seagrass ? 'seagrass' : H === HAB.deep ? 'deep' : 'shallow';
  const clear = (x, z, r) => Math.hypot(x, z - 4.5) > r + 1.8 && Math.hypot(x, z) < R + 4;
  const put = (key, x, z, s, o) => { const it = Object.assign({ key, x, z, s, ry: rnd() * 6.28, soft: key === 'seagrass_patch' || key === 'anemone_bed' }, o); items.push(it); if (!it.on) spots.push([x, z, FOOT[key] * s]); return it; };
  /* 在一塊地裡找空位：d0–d1 是離中心多遠（佔半徑的比例），gap 小於 1 可以稍微疊在一起 */
  const near = (key, p, d0, d1, s, gap, o) => { const fr = FOOT[key] * s;
    for (let k = 0; k < 16; k++) { const a = rnd() * 6.28, d = rr(d0, d1), u = Math.cos(a) * d * p.r * p.long, v = Math.sin(a) * d * p.r / p.long, x = p.x + u * p.c - v * p.s, z = p.z + u * p.s + v * p.c;
      if (clear(x, z, fr) && spots.every(q => Math.hypot(q[0] - x, q[1] - z) > (q[2] + fr) * gap)) return put(key, x, z, s, o); }
    return null; };
  const patch = (t, r, long, sep) => { for (let k = 0; k < 80; k++) { const a = rnd() * 6.28, d = rr(3.4, R + 1.5), ahead = !patches.length && k < 40, x = ahead ? rr(-5, 5) : Math.cos(a) * d, z = ahead ? rr(-7, -2.5) : Math.sin(a) * d, e = rnd() * 3.14;   // 第一群排在下潛後正前方的中景：一下水就看得出這是哪一種海底
      if (clear(x, z, r * 0.7) && patches.every(q => Math.hypot(q.x - x, q.z - z) > (q.r * q.long + r * long) * 0.85 + sep)) { const p = { t, x, z, r, long, c: Math.cos(e), s: Math.sin(e) }; patches.push(p); return p; } }
    return null; };
  const rock = (p, key, s) => put(key, p.x, p.z, s, { sy: rr(0.78, 1.08) });   // 一群中間的那顆石頭
  const onTop = (big, key, s) => put(key, big.x + rr(-0.08, 0.08) * big.s, big.z + rr(-0.08, 0.08) * big.s, s, { y: 0.4 * big.s * big.sy, on: 1 });   // 長在石頂上
  const onSide = (big, key, s) => { const a = rnd() * 6.28, f = FOOT[big.key] * big.s, d = 0.6 * f; return put(key, big.x + Math.cos(a) * d, big.z + Math.sin(a) * d, s, { y: 0.78 * f * big.sy, on: 1 }); };   // 長在石肩上（基部埋在石頭裡）
  if (where === 'reef') {
    for (let i = 0; i < 3; i++) { const p = patch('hard', rr(2.0, 2.8), rr(1, 1.35), 2.8); if (!p) continue;
      const big = rock(p, 'rock_a', rr(1.5, 2.0)); onTop(big, 'coral_round', rr(0.5, 0.7)); onSide(big, 'coral_branch', rr(0.6, 0.9));
      near(i % 2 ? 'rock_b' : 'rock_a', p, 0.3, 0.6, rr(0.85, 1.25), 0.6, { sy: rr(0.7, 1.05) });
      near('coral_table', p, 0.3, 0.75, rr(0.95, 1.35), 0.7); if (!i) near('coral_table', p, 0.4, 0.9, rr(0.8, 1.1), 0.7);
      for (let k = 0; k < (i ? 2 : 3); k++) near('coral_branch', p, 0.3, 0.9, rr(0.75, 1.3), 0.7);
      for (let k = 0; k < 2; k++) near('coral_round', p, 0.35, 1.0, rr(0.65, 1.4), 0.75);
      for (let k = 0; k < 2; k++) near('coral_round', p, 0.15, 0.6, rr(0.4, 0.55), 0.5);   // 石腳邊的小珊瑚
      near('anemone_bed', p, 0.5, 1.05, rr(0.9, 1.3), 0.8); if (i < 2) near('sea_urchins', p, 0.35, 0.95, rr(0.85, 1.2), 0.8);
    }
    for (let i = 0; i < 2; i++) { const p = patch('hard', rr(0.8, 1.1), 1, 2.4); if (!p) continue;   // 沙地上零星的小礁：一顆石頭帶一株小珊瑚
      const big = rock(p, 'rock_b', rr(0.9, 1.3)); onSide(big, i ? 'coral_branch' : 'coral_round', rr(0.5, 0.75)); near('anemone_bed', p, 0.5, 1.0, rr(0.8, 1.1), 0.8); }
  } else if (where === 'seagrass') {
    for (let i = 0; i < 3; i++) { const p = patch('meadow', rr(2.3, 3.2), rr(1.15, 1.6), 2.4); if (!p) continue;
      const n = 13 + (rnd() * 5 | 0), hole = [p.x + rr(-0.5, 0.5) * p.r, p.z + rr(-0.5, 0.5) * p.r];   // 草床裡留一塊沒長草的缺口
      for (let k = 0; k < n; k++) { const d = Math.pow(rnd(), 0.8), it = near('seagrass_patch', p, d * 0.85, d * 0.85 + 0.1, (1.5 - 0.92 * d) * rr(0.85, 1.15), 0.44);
        if (it && Math.hypot(it.x - hole[0], it.z - hole[1]) < 0.8) { items.splice(items.indexOf(it), 1); spots.pop(); } }
      for (let k = 0; k < 2; k++) near('seagrass_patch', p, 1.0, 1.3, rr(0.42, 0.62), 0.6);   // 草床邊上往外長的小叢
    }
    { const p = patch('meadow', 1.2, 1.3, 2.2); if (p) for (let k = 0; k < 4; k++) near('seagrass_patch', p, 0, 0.9, rr(0.5, 0.95), 0.55); }
    for (let i = 0; i < 2; i++) { const p = patch('hard', rr(0.8, 1.0), 1, 1.6); if (!p) continue; rock(p, 'rock_b', rr(0.9, 1.35)); if (i) near('rock_b', p, 0.4, 0.8, rr(0.6, 0.85), 0.6, { sy: rr(0.7, 1) }); near(i ? 'sea_urchins' : 'anemone_bed', p, 0.5, 1.0, rr(0.85, 1.2), 0.8); }
  } else if (where === 'deep') {
    for (let i = 0; i < 2; i++) { const p = patch('hard', rr(1.6, 2.3), rr(1, 1.3), 3.2); if (!p) continue;
      const big = rock(p, 'rock_a', rr(1.5, 2.2)); if (!i) onTop(big, 'coral_round', rr(0.6, 0.8));
      near('rock_a', p, 0.3, 0.6, rr(0.9, 1.4), 0.6, { sy: rr(0.7, 1.05) }); for (let k = 0; k < 2; k++) near('rock_b', p, 0.35, 0.95, rr(0.7, 1.2), 0.62, { sy: rr(0.7, 1.05) });
      near('sea_urchins', p, 0.4, 0.9, rr(0.9, 1.2), 0.8);
    }
    for (let i = 0; i < 2; i++) { const p = patch('hard', rr(0.7, 0.9), 1, 2.4); if (p) rock(p, i ? 'rock_b' : 'rock_a', rr(0.8, 1.2)); }
  } else {
    for (let i = 0; i < 2; i++) { const p = patch('hard', rr(1.1, 1.5), rr(1, 1.3), 3.2); if (!p) continue;
      const big = rock(p, i ? 'rock_b' : 'rock_a', i ? rr(1.1, 1.5) : rr(0.95, 1.25)); if (!i) onSide(big, 'coral_round', rr(0.55, 0.75));
      for (let k = 0; k < 2; k++) near('rock_b', p, 0.4, 0.9, rr(0.65, 1.05), 0.62, { sy: rr(0.7, 1.05) });
      near('sea_urchins', p, 0.4, 0.95, rr(0.85, 1.2), 0.8); if (!i) near('sea_urchins', p, 0.5, 1.1, rr(0.8, 1.1), 0.8);
      near('anemone_bed', p, 0.5, 1.05, rr(0.9, 1.3), 0.8); if (i) near('anemone_bed', p, 0.5, 1.1, rr(0.8, 1.1), 0.8);
    }
    { const p = patch('meadow', 1.3, 1.3, 3); if (p) for (let k = 0; k < 4; k++) near('seagrass_patch', p, 0, 0.9, rr(0.5, 0.9), 0.55); }
  }
  return { patches, items };
}
/** 把 layout() 排好的東西擺出來：同一種模型只用一個 InstancedMesh（以前每件各複製一份）。石頭、珊瑚進 decos（玩家要繞過去），會搖的海草、海葵進 swayers */
const dM = new THREE.Matrix4(), dQ = new THREE.Quaternion(), dE = new THREE.Euler(), dP = new THREE.Vector3(), dS = new THREE.Vector3();
function setDeco(ims, i, it, rz) { dE.set(0, it.ry, rz); dM.compose(dP.set(it.x, it.by, it.z), dQ.setFromEuler(dE), dS.set(it.s, it.s * (it.sy || 1), it.s)); for (const im of ims) im.setMatrixAt(i, dM); }
function decorate(items) {
  const by = {}; items.forEach(it => { (by[it.key] = by[it.key] || []).push(it); });
  for (const key in by) {
    const list = by[key], proto = model('REEFMODELS', key), ims = []; if (!proto) continue;
    proto.traverse(o => { if (o.isMesh) ims.push(O(new THREE.InstancedMesh(o.geometry, o.material, list.length))); });
    const r0 = key === 'coral_table' || key === 'rock_a' || key === 'seagrass_patch' ? 0.75 : 0.45;
    list.forEach((it, i) => { it.by = bedY(it.x, it.z) - 0.04 + (it.y || 0); it.ph = Math.random() * 6; setDeco(ims, i, it, 0);
      if (!it.soft && !it.on) decos.push({ x: it.x, z: it.z, r: Math.min(r0 * it.s, 1.2), top: bedY(it.x, it.z) + 0.45 * it.s }); });   // 半徑有上限：大石旁的生物還是游得到、按得到 E
    ims.forEach(im => { im.instanceMatrix.needsUpdate = true; sc.add(im); });
    if (proto.userData.anim === 'sway') swayers.push({ ims, list });
  }
}
/** 小魚群：繞著一個點游的一群小魚（每隻是同一個網格的複本） */
let fishG = null;
/** 小魚的網格（潛水與海洋館共用，不釋放）。v9.18：側扁的紡錘形魚身（八邊形斷面、圓鼻、細尾柄）＋分岔的尾鰭與背鰭，
    頂點色做反蔭蔽（背深、腹白）；乘上材質色就是這種魚的顏色（以前是菱形加三角形，像摺紙魚） */
export const fishMat = color => new THREE.MeshStandardMaterial({ color, vertexColors: true, roughness: 0.42, metalness: 0.28, side: THREE.DoubleSide });
export function fishGeo() {
  if (fishG) return fishG;
  const P = [], C = [], idx = [], SEG = 8, PROF = [[0.06, 0.022], [0.18, 0.04], [0.36, 0.05], [0.56, 0.045], [0.76, 0.03], [0.92, 0.016], [1, 0.011]];   // [從鼻尖到尾柄的比例, 半高]
  const zAt = t => 0.16 - t * 0.25, shade = c => (c > 0 ? 1 - 0.5 * c : 1 + 0.4 * -c);   // 斷面上的高度 → 背深、腹亮
  const v = (x, y, z, k) => { P.push(x, y, z); C.push(k, k, k); return P.length / 3 - 1; };
  const nose = v(0, 0, 0.16, 0.9), rings = PROF.map(([t, h]) => Array.from({ length: SEG }, (_, s) => { const a = s / SEG * Math.PI * 2; return v(Math.sin(a) * h * 0.55, Math.cos(a) * h, zAt(t), shade(Math.cos(a))); }));
  const tail = v(0, 0, zAt(1) - 0.004, 0.8);
  for (let s = 0; s < SEG; s++) { const s1 = (s + 1) % SEG; idx.push(nose, rings[0][s1], rings[0][s], tail, rings[6][s], rings[6][s1]); for (let j = 0; j < 6; j++) idx.push(rings[j][s], rings[j][s1], rings[j + 1][s], rings[j][s1], rings[j + 1][s1], rings[j + 1][s]); }
  const zt = zAt(1), a = v(0, 0.009, zt + 0.004, 0.75), b = v(0, 0.062, zt - 0.085, 0.7), n = v(0, 0, zt - 0.05, 0.8), c = v(0, -0.062, zt - 0.085, 0.85), d = v(0, -0.009, zt + 0.004, 0.8);   // 分岔的尾鰭
  idx.push(a, b, n, a, n, d, d, n, c);
  const e = v(0, 0.048, 0.05, 0.55), f = v(0, 0.074, 0.0, 0.5), g = v(0, 0.044, -0.03, 0.55); idx.push(e, f, g);   // 背鰭
  fishG = new THREE.BufferGeometry(); fishG.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); fishG.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); fishG.setIndex(idx); fishG.computeVertexNormals();
  const nr = fishG.attributes.normal; if (nr.getY(rings[3][0]) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } fishG.setIndex(idx); fishG.computeVertexNormals(); }   // 面朝外（法線朝外才受光正確）
  return fishG;
}
function fishSchools() {
  const geo = fishGeo();
  H.fish.forEach((color, k) => {
    const mat = O(fishMat(color));
    const n = 14, im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false;
    const a = Math.random() * 6.28, d = 4 + Math.random() * 6;
    schools.push({ im, n, cx: Math.cos(a) * d, cz: Math.sin(a) * d, cy: bedY(Math.cos(a) * d, Math.sin(a) * d) + 1.4 + k * 0.9, r: 1.6 + Math.random(), w: (k ? -1 : 1) * (0.35 + Math.random() * 0.2), off: Array.from({ length: n }, () => [Math.random() * 0.8, (Math.random() - 0.5) * 0.6, Math.random() * 6.28]) });
    sc.add(im);
  });
}
const sm = new THREE.Matrix4(), sq = new THREE.Quaternion(), ss = new THREE.Vector3(1, 1, 1), sv = new THREE.Vector3(), se = new THREE.Euler();
function fishTick(dt, t) {
  for (const s of schools) {
    const dp = Math.hypot(P.position.x - s.cx, P.position.z - s.cz); if (dp < 2.4) { s.cx += (s.cx - P.position.x) / (dp || 1) * dt * 1.2; s.cz += (s.cz - P.position.z) / (dp || 1) * dt * 1.2; }   // 游太近：整群讓開
    const cr = Math.hypot(s.cx, s.cz); if (cr > R) { s.cx *= R / cr; s.cz *= R / cr; }
    for (let i = 0; i < s.n; i++) {
      const [ro, yo, ph] = s.off[i], a = t * s.w + i * 0.45 + ph * 0.1, r = s.r + ro;
      sv.set(s.cx + Math.cos(a) * r, s.cy + yo + Math.sin(t * 1.3 + ph) * 0.12, s.cz + Math.sin(a) * r);
      se.set(0, Math.atan2(-Math.sin(a) * Math.sign(s.w), Math.cos(a) * Math.sign(s.w)) + Math.sin(t * 9 + ph) * 0.12, 0); sq.setFromEuler(se);
      s.im.setMatrixAt(i, sm.compose(sv, sq, ss));
    }
    s.im.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- 海洋生物 ---------- */
const SPEED = [0, 0.28, 0.55, 0.9], BIG = 2.1;   // 依 speed 0–3 的游速；模型放大（小生物看得到）
const tideOK = sp => sp.tide === 'any' || (sp.tide === 'high' ? tide.lvl() > -0.1 : tide.lvl() < 0.1);
/** 這次潛水會遇到的生物：這個潛點的棲地優先，不夠再從相鄰的棲地補 */
function pickSpecies() {
  const NEXT = { shallow: ['seagrass', 'reef'], seagrass: ['shallow'], reef: ['shallow', 'deep'], deep: ['reef'] };
  const W = [0, 10, 6, 3, 1.2, 0.4], out = [], want = 3 + (Math.random() < 0.5 ? 1 : 0);
  const draw = pool => { pool = pool.filter(sp => !out.includes(sp)); if (!pool.length) return null; let r = Math.random() * pool.reduce((a, sp) => a + W[sp.rarity], 0); for (const sp of pool) { r -= W[sp.rarity]; if (r <= 0) return sp; } return pool[0]; };
  const own0 = available('marine', SP.where).filter(tideOK), near = available('marine', NEXT[SP.where] || []).filter(tideOK);
  while (out.length < want) { const sp = draw(own0) || (out.length < 3 ? draw(near) : null); if (!sp) break; out.push(sp); }
  return out;
}
function spawn() {
  const list = pickSpecies(), base = Math.random() * 6.28;
  list.forEach((sp, i) => {
    const m = model('MARINEMODELS', sp.id) || fallback(sp), anim = m.userData.anim || 'still';
    m.scale.setScalar(BIG); sc.add(m);
    const a = base + i * (6.28 / list.length) + (Math.random() - 0.5) * 0.8, d = 3.2 + Math.random() * 5.5; let hx = Math.cos(a) * d, hz = Math.sin(a) * d;
    for (const o of decos) { const ex = hx - o.x, ez = hz - o.z, e = Math.hypot(ex, ez), far = o.r + 0.35; if (e < far) { hx = o.x + ex / (e || 1) * far; hz = o.z + ez / (e || 1) * far; } }   // v9.26 不要出生在石頭、珊瑚裡面（現在礁岩堆比較大）
    const kind = sp.speed === 0 ? 'fixed' : anim === 'crawl' || anim === 'still' || anim === 'clam' || anim === 'sway' ? 'crawl' : 'swim';
    const parts = {}; ['tail', 'finL', 'finR', 'bell', 'tentacles', 'lid'].forEach(n => { parts[n] = m.getObjectByName(n); });
    parts.arms = []; for (let k = 0; k < 16; k++) { const o = m.getObjectByName('arm' + k); if (o) parts.arms.push(o); }
    parts.legs = []; for (let k = 0; k < 16; k++) { const o = m.getObjectByName('leg' + k); if (o) parts.legs.push(o); }
    const spark = new THREE.Sprite(O(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); spark.scale.setScalar(0.3); sc.add(spark);
    const cr = { sp, m, anim, kind, parts, spark, hx, hz, ph: Math.random() * 6.28, flee: 0, dir: new THREE.Vector3(Math.cos(a + 1.6), 0, Math.sin(a + 1.6)), goal: null, y: 0 };
    const y0 = bedY(hx, hz); cr.y = kind === 'swim' ? y0 + 0.8 + Math.random() * 1.4 : y0;
    m.position.set(hx, cr.y, hz); m.rotation.y = Math.random() * 6.28;
    creatures.push(cr);
  });
}
function crTick(cr, dt, t, locked) {
  const m = cr.m, sp = cr.sp, p = m.position, ph = cr.ph, s = Math.sin;
  realMove(m, cr.anim, t, ph, sp.speed);   // 換上寫實模型的：整隻輕輕動
  // 零件的動作
  if (cr.parts.tail) cr.parts.tail.rotation.y = s(t * (2 + sp.speed * 2) + ph) * 0.35;
  if (cr.parts.finL) { cr.parts.finL.rotation.z = s(t * 1.8 + ph) * 0.55; cr.parts.finR && (cr.parts.finR.rotation.z = -s(t * 1.8 + ph) * 0.55); }
  if (cr.parts.bell) { const k = Math.max(0, s(t * 2.1 + ph)); cr.parts.bell.scale.set(1 + k * 0.12, 1 - k * 0.16, 1 + k * 0.12); }
  if (cr.parts.tentacles) cr.parts.tentacles.rotation.x = s(t * 1.2 + ph) * 0.12;
  cr.parts.arms.forEach((a, i) => { a.rotation.x = s(t * 2 + i * 0.8 + ph) * 0.22; });
  cr.parts.legs.forEach((l, i) => { l.rotation.x = s(t * 9 + i * 1.3) * (cr.kind === 'crawl' && !locked ? 0.35 : 0.08); });
  if (cr.parts.lid) cr.parts.lid.rotation.x = -(0.12 + 0.12 * Math.max(0, s(t * 0.5 + ph))) * (cr.shut > 0 ? 0 : 1);
  if (cr.shut > 0) cr.shut -= dt;
  if (cr.anim === 'sway') m.rotation.z = s(t * 0.9 + ph) * 0.05;
  // 亮點：還沒觀察過的生物頭上一閃一閃（小生物從遠處也找得到）
  cr.spark.position.set(p.x, p.y + 0.45 + (cr.kind === 'swim' ? 0.15 : 0.25), p.z); cr.spark.material.opacity = cr.busy || cr.done ? 0 : 0.1 + 0.3 * Math.max(0, s(t * 2.2 + ph));
  if (locked || cr.busy || cr.kind === 'fixed') return;
  // 移動：在家附近遊蕩；被快速靠近的玩家嚇到時（游得快的生物）往反方向竄開
  const dx = p.x - P.position.x, dz = p.z - P.position.z, dp = Math.hypot(dx, dz);
  if (sp.speed >= 2 && pace > 2.2 && dp < 2.6 && cr.flee <= 0) { cr.flee = 2.2; cr.dir.set(dx / (dp || 1), 0, dz / (dp || 1)); cr.goal = null; }
  if (cr.anim === 'clam' && dp < 1.4 && pace > 2.2) cr.shut = 2;   // 貝類：被嚇到就闔起來
  const spd = (cr.kind === 'crawl' ? 0.12 + sp.speed * 0.04 : SPEED[sp.speed] || 0.3) * (cr.flee > 0 ? 3 : 1);
  if (cr.flee > 0) cr.flee -= dt;
  else {
    if (!cr.goal || Math.hypot(cr.goal.x - p.x, cr.goal.z - p.z) < 0.4) { const a = Math.random() * 6.28, d = Math.random() * (cr.kind === 'crawl' ? 2.2 : 4); cr.goal = { x: cr.hx + Math.cos(a) * d, z: cr.hz + Math.sin(a) * d, y: 0.7 + Math.random() * 1.6 }; }
    tmp.set(cr.goal.x - p.x, 0, cr.goal.z - p.z).normalize(); cr.dir.lerp(tmp, Math.min(1, dt * 0.8)).normalize();
  }
  p.x += cr.dir.x * spd * dt; p.z += cr.dir.z * spd * dt;
  const rr = Math.hypot(p.x, p.z); if (rr > R + 1) { p.x *= (R + 1) / rr; p.z *= (R + 1) / rr; cr.goal = null; }
  m.rotation.y = Math.atan2(cr.dir.x, cr.dir.z);
  const by = bedY(p.x, p.z);
  if (cr.kind === 'swim') { const gy = by + (cr.goal ? cr.goal.y : 1.2) + (cr.anim === 'pulse' ? s(t * 2.1 + ph) * 0.12 : 0); cr.y += (gy - cr.y) * Math.min(1, dt * 0.6); p.y = Math.min(cr.y, H.depth - 0.6); }
  else p.y = by;
}

/* ---------- 進出 ---------- */
export function enter(spot) {
  if (inside) return; SP = spot; H = HAB[spot.where] || HAB.shallow; L = LOOK[spot.where] || LOOK.shallow; seed = (spot.x * 13.7 + spot.z * 7.3) % 50;
  ui.iris(); inside = true; savedCurve = U.uCurve.value; U.uCurve.value = 0; U.uMist.value.x = 0; U.uCloud.value.x = 0;
  build(); sc.add(P); if (P.userData.hand) P.userData.hand.visible = false;   // 手上的工具收起來
  P.userData.act = 'dive'; P.userData.swimLean = 0;   // 換成潛水的姿勢（main.js 看到 'swim' 會以為被送進室內而收掉游泳）
  P.position.set(0, bedY(0, 4.5) + 2.4, 4.5); P.rotation.y = Math.PI; kick = 0; pace = 0; lean = 0;
  camPos.set(0, P.position.y + 3, P.position.z + 5.5); camLook.copy(P.position);
  air = AIR; warned = false; found = 0; bubT = 0.5; t0 = performance.now();
  hud = ui.el('div', 'dive-hud'); document.body.appendChild(hud); hudPaint();
  document.body.classList.add('in-trip', 'in-dive'); Audio.sfx('splash');
  const s = S(); s.stats = s.stats || {}; s.stats.dives = (s.stats.dives || 0) + 1; save();
  setTimeout(() => ui.toast(`潛到${H.name}了！方向鍵游、空白鍵往上踢，游到發亮的生物旁邊按 E 觀察`), 700);
}
function hudPaint() { if (hud) hud.classList.toggle('low', air < 20); if (hud) hud.innerHTML = `<b>${H.name}</b><span class="dv-air"><i style="width:${Math.max(0, air / AIR * 100).toFixed(1)}%"></i></span><small>${found ? `帶回 ${found} 種` : '氧氣'}</small>`; }
/** 浮上水面：回到島上的潛點（main.js 的 onExit 把角色放回海面） */
export function surface(why) {
  if (!inside) return;
  ui.iris(); inside = false; U.uCurve.value = savedCurve || CURVE;
  document.body.classList.remove('in-trip', 'in-dive'); if (hud) { hud.remove(); hud = null; }
  const u = P.userData; u.act = null; tilt(0);
  creatures.forEach(c => sc.remove(c.m)); sc.remove(P);
  own.forEach(o => o.dispose && o.dispose()); own.length = 0;
  creatures.length = decos.length = swayers.length = rays.length = bubbles.length = schools.length = 0; sc = bed = caus = surf = snow = dome = hemi = sun = lamp = fill = null;
  mainScene.add(P); Audio.sfx('splash'); ctx.onExit(SP, why);
}
/** 身體前傾成水平游的姿勢（3D 模型繞身體中心轉；Q 版身體也一樣） */
function tilt(a) {
  const u = P.userData, c = 0.75;
  if (u.gltf) { const m = u.gltf.model, B = u.gltf.base; m.rotation.x = a; m.position.set(B.x, B.y + c - c * Math.cos(a), B.z - c * Math.sin(a)); }
  else if (u.body) { u.body.rotation.x = a; u.body.position.z = -c * Math.sin(a); }
}

/* ---------- 每幀 ---------- */
export function jump() { if (inside) { kick = Math.min(3.2, kick + 1.3); Audio.sfx('jump', { pitch: -6, vol: 0.5 }); } }
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  if (!sc) return;
  const p = P.position, u = P.userData;
  if (!locked) { air -= dt; if (!warned && air < 20) { warned = true; ui.toast('氧氣快用完了，記得浮上去換氣（附近沒有生物時按 E）'); } if (air <= 0) { surface('air'); return; } }
  // 游：方向鍵（畫面方向）水平移動，空白鍵往上踢、放開慢慢沉回離海底約一公尺
  const want = moving && !locked ? (run ? 3.0 : 1.8) * Math.min(1, len) : 0; pace += (want - pace) * Math.min(1, dt * 3);
  if (moving && !locked) { const k = 1 / (len || 1), nx = ix * k, nz = iz * k; P.userData.swimDir = [nx, nz]; P.rotation.y += (((Math.atan2(nx, nz) - P.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 6); }
  const d0 = u.swimDir || [0, -1]; let nx = p.x + d0[0] * pace * dt, nz = p.z + d0[1] * pace * dt;
  const rr = Math.hypot(nx, nz); if (rr > R) { nx *= R / rr; nz *= R / rr; }
  for (const d of decos) { if (p.y > d.top + 0.3) continue; const ex = nx - d.x, ez = nz - d.z, e = Math.hypot(ex, ez); if (e < d.r + 0.25) { nx = d.x + ex / (e || 1) * (d.r + 0.25); nz = d.z + ez / (e || 1) * (d.r + 0.25); } }   // 珊瑚、岩石：繞過去或從上面游過
  p.x = nx; p.z = nz;
  kick = Math.max(0, kick - dt * 0.55);
  const floor = bedY(p.x, p.z), gy = Math.min(H.depth - 1.6, floor + 0.55 + kick); p.y += (gy - p.y) * Math.min(1, dt * 2.2);
  lean += ((pace > 0.3 ? 1.3 : 0.35) - lean) * Math.min(1, dt * 3); tilt(lean);
  u.act = 'dive'; u.swimK = Math.min(1, pace / 1.5); animate(P, dt, 0, t);   // 姿勢在 actors.js：停著踩水、游動時蛙式
  // 吐泡泡
  if ((bubT -= dt) <= 0) { bubT = 2.2 + Math.random() * 1.4; for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) blow(i); }
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.t += dt; b.m.position.y += dt * (0.7 + b.v); b.m.position.x += Math.sin(b.t * 6 + b.v * 9) * dt * 0.08; if (b.m.position.y > H.depth - 0.05 || b.t > 9) { sc.remove(b.m); bubbles.splice(i, 1); } }
  creatures.forEach(c => crTick(c, dt, t, locked)); fishTick(dt, t);
  for (const g of swayers) { for (let i = 0; i < g.list.length; i++) setDeco(g.ims, i, g.list[i], Math.sin(t * 0.8 + g.list[i].ph) * 0.04); for (const im of g.ims) im.instanceMatrix.needsUpdate = true; }   // 海草、海葵輕輕搖
  // 海雪跟著玩家繞
  { const a = snow.geometry.attributes.position, A = a.array; for (let i = 0; i < A.length; i += 3) { A[i + 1] -= dt * 0.04; A[i] += Math.sin(t * 0.3 + i) * dt * 0.03; if (A[i + 1] < bedY(A[i], A[i + 2]) - 0.1) A[i + 1] = H.depth - 0.2; let dx = A[i] - p.x, dz = A[i + 2] - p.z; if (dx > 12) A[i] -= 24; else if (dx < -12) A[i] += 24; if (dz > 12) A[i + 2] -= 24; else if (dz < -12) A[i + 2] += 24; } a.needsUpdate = true; }
  // 鏡頭：斜後上方跟著，不超出水面
  tmp.set(p.x, Math.min(H.depth - 0.35, p.y + 2.2), p.z + 5.2); camPos.lerp(tmp, Math.min(1, dt * 3)); camLook.lerp(tmp2.set(p.x, p.y + 0.7, p.z - 1.6), Math.min(1, dt * 5));
  camera.position.copy(camPos); camera.lookAt(camLook);
  caus.material.uniforms.uTime.value = t; caus.material.uniforms.uCam.value.copy(camera.position);
  surf.material.uniforms.uTime.value = t; surf.material.uniforms.uCam.value.copy(p);
  rays.forEach(r => { const m = r.m, dc = Math.hypot(m.position.x - camera.position.x, m.position.z - camera.position.z); m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z); m.material.uniforms.uTime.value = t; m.material.uniforms.uK.value = r.base * THREE.MathUtils.smoothstep(dc, 1.2, 3.5); });
  lamp.position.set(p.x, p.y + 1.2, p.z - 0.6); fill.position.set(camera.position.x, camera.position.y - 0.5, camera.position.z - 1.5);
  hudT += dt; if (hudT > 0.25) { hudT = 0; hudPaint(); }
  const fx = post.fx, dof0 = fx.dof; fx.golden = 0; fx.clear = 0.5; fx.sunVis = 0; fx.night = ctx.night(); fx.focus = camera.position.distanceTo(p); fx.dof = dof0 * 0.8; fx.haze.copy(sc.fog.color);
  post.render(t, sc, camera); fx.dof = dof0;
}
let hudT = 0;
const bubGeo = new THREE.SphereGeometry(0.035, 6, 4), bubMat = new THREE.MeshBasicMaterial({ color: '#f4fdff', transparent: true, opacity: 0.75, depthWrite: false });
function blow(i) {
  const m = new THREE.Mesh(bubGeo, bubMat), f = P.rotation.y, p = P.position;
  m.position.set(p.x + Math.sin(f) * 0.35 + (Math.random() - 0.5) * 0.1, p.y + 0.75 + i * 0.05, p.z + Math.cos(f) * 0.35 + (Math.random() - 0.5) * 0.1); m.scale.setScalar(0.6 + Math.random() * 0.9); m.frustumCulled = false;
  sc.add(m); bubbles.push({ m, t: 0, v: Math.random() * 0.4 });
}

/* ---------- 觀察與答題 ---------- */
const chest = new THREE.Vector3();
function nearest() {
  chest.copy(P.position).y += 0.5; let best = null, bd = 1.9;
  for (const c of creatures) { if (c.busy || c.done) continue; const d = Math.hypot(c.m.position.x - chest.x, c.m.position.z - chest.z), dy = Math.abs(c.m.position.y - chest.y); if (d < bd && dy < 2.2) { bd = d; best = c; } }
  return best;
}
export function hint() { if (!inside) return ''; const c = nearest(); return c ? (S().dex.marine[c.sp.id] ? `觀察${c.sp.name}` : '觀察這個生物') : '浮上水面'; }
export function handler() {
  if (!inside) return null;
  const c = nearest(); if (!c) return () => surface('up');
  return () => observe(c);
}
async function observe(c) {
  const sp = c.sp; c.busy = true; c.shut = 0;
  P.rotation.y = Math.atan2(c.m.position.x - P.position.x, c.m.position.z - P.position.z);
  const units = sp.sid === 'earth' ? ['es-ocean', 'es-climate'] : ['bi-evo', 'bi-eco'];
  const q = pickQU(units, 3) || pickQ(sp.sid, 3); if (!q) { c.busy = false; await ui.say(DIVE, '今天的題目都答過了，明天再來潛水吧！'); return; }
  c.flee = 0;
  const known = S().dex.marine[sp.id];
  const i = await ui.ask(DIVE, `${known ? sp.name : '有東西在動'}……${q.q}`, q.o, { answer: q.a, abc: true, keys: true, html: true, timer: fairSec(25, q) });
  const ok = i === q.a; record(q, ok); ui.closeDialog(); feel.note(feel.hit(ok));
  const photo = photoOnly('marine', sp);
  if (!ok) {
    Audio.sfx('bad'); c.busy = false; c.done = true; c.flee = 3; c.dir.set(c.m.position.x - P.position.x, 0, c.m.position.z - P.position.z).normalize();   // 溜走了
    setTimeout(() => { if (c.m.parent) c.m.parent.remove(c.m); if (c.spark.parent) c.spark.parent.remove(c.spark); const k = creatures.indexOf(c); if (k >= 0) creatures.splice(k, 1); }, 1600);
    const noted = fieldnote.add('marine', sp.id, sp.sid === 'earth' ? 'mearth' : 'mbio');
    await ui.explain(null, q, `${sp.name}游走了……${noted ? (photo ? '不過你記下了牠的樣子：手機「圖鑑」上方的觀察筆記裡答對一題，就能補完研究、補拍照片。' : fieldnote.told) : ''}`); return;
  }
  miles.add('marine'); found++;
  const s = S(), first = !s.dex.marine[sp.id]; s.dex.marine[sp.id] = s.dex.marine[sp.id] || Date.now();
  if (photo) s.museum.marine[sp.id] = s.museum.marine[sp.id] || Date.now();
  const room = photo ? true : addItem({ k: 'marine', id: sp.id }); save();
  Audio.sfx('ok'); setExpr(P, 'happy', 2);
  const line = ((I.MARINE_LINES || {}).catch || {})[sp.id] || '';
  await ui.card({ pocket: !photo && room, rare: sp.rarity >= 4, icon: icon(sp.id, 'marine'), title: `${photo ? '拍到了' : '找到了'}${sp.name}！`,
    sub: `${line}${photo ? '只在原處拍照記錄，不觸碰、不帶走。照片已經送到博物館的海洋館。' : ''}`,
    extra: `<span class="stars">${stars(sp.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}${!photo && !room ? '<em>口袋滿了，只好放回海裡。</em>' : ''}<small class="dv-fact">${ui.esc(sp.fact || '')}</small>` });
  c.busy = false;
  if (photo || !room) { c.done = true; c.flee = 2; }   // 拍完照、或放回海裡：牠繼續游走
  else { if (c.m.parent) c.m.parent.remove(c.m); if (c.spark.parent) c.spark.parent.remove(c.spark); const k = creatures.indexOf(c); if (k >= 0) creatures.splice(k, 1); }
  hudPaint();
  await challenge.keepGoing(DIVE, q);
}
export const debug = () => ({ where: SP && SP.where, air: +air.toFixed(1), decos: decos.map(d => [+d.x.toFixed(1), +d.z.toFixed(1), +d.r.toFixed(2)]), sway: swayers.map(g => g.list.map(it => [+it.x.toFixed(1), +it.z.toFixed(1)])), creatures: creatures.map(c => ({ id: c.sp.id, kind: c.kind, x: +c.m.position.x.toFixed(1), y: +c.m.position.y.toFixed(1), z: +c.m.position.z.toFixed(1) })) });
