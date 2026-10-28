/* 潮汐小島 · 渲染核心：渲染器、滾筒地平線彎曲、材質快取、天空、光源與日夜。 */
import * as THREE from 'three';


export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cv'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
/* ---------- 兩層陰影（v6.83）----------
   近處一張細的陰影貼圖（sun，4096）罩住鏡頭前 30 公尺內看得到的地方；遠處一張大範圍的（sunFar，2048）罩住畫面裡其餘看得到的地方（見 shadows.js）。
   sunFar 本身的亮度是 0、只提供陰影貼圖：太陽的光只算一次（sun 那一盞），每個像素在近處那張的範圍裡就用近處的影子，靠近邊緣時漸漸換成遠處的。
   sunFar 的 shadow.radius 當作「遠處那張現在有效」的旗標（PCFSoft 陰影不使用 radius）：無效時只用近處那張，框外沒有影子 */
export const CASCADES = (() => {
  const C = THREE.ShaderChunk, LINE = 'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';
  const HEAD = '#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )\n\tDirectionalLight directionalLight;';
  const RED = LINE + '\n\t\t#endif\n\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  const src = C.lights_fragment_begin;
  if (!src.includes(HEAD) || !src.includes(RED)) { console.warn('兩層陰影：three.js 的著色器片段和預期的不同，改用單層'); return false; }
  C.lights_fragment_begin = src.replace(HEAD, `#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS == 2 && NUM_DIR_LIGHTS >= 2
  #define TA_CASC
  float taSh = 1.0;
  if ( receiveShadow ) {
    vec4 tc0 = vDirectionalShadowCoord[ 0 ];
    vec2 te = min( tc0.xy, 1.0 - tc0.xy );
    bool tFar = directionalLightShadows[ 1 ].shadowRadius > 0.5;
    float tw = ( tc0.z <= 1.0 ) ? ( tFar ? smoothstep( 0.0, 0.04, min( te.x, te.y ) ) : step( 0.0, min( te.x, te.y ) ) ) : 0.0;   // 近處那張的權重：框內 1、最外圈 4% 漸漸換成遠處的
    float ts0 = 1.0, ts1 = 1.0;
    if ( tw > 0.0 ) ts0 = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, tc0 );
    if ( tw < 1.0 && tFar ) ts1 = getShadow( directionalShadowMap[ 1 ], directionalLightShadows[ 1 ].shadowMapSize, directionalLightShadows[ 1 ].shadowBias, directionalLightShadows[ 1 ].shadowRadius, vDirectionalShadowCoord[ 1 ] );
    taSh = mix( ts1, ts0, tw );
  }
#endif
` + HEAD).replace(RED, `#ifdef TA_CASC
		#if UNROLLED_LOOP_INDEX == 0
		directLight.color *= directLight.visible ? taSh : 1.0;
		#endif
		#else
		${LINE}
		#endif
		#endif
		#if !defined( TA_CASC ) || UNROLLED_LOOP_INDEX == 0
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
		#endif`);
  return true;
})();

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 500);   // 視角廣一點：房子不會塞滿畫面，看得到房子之間的草原
scene.fog = new THREE.Fog(0xcfeeff, 60, 150);

/* ---------- 滾筒地平線：在視空間把遠處往下彎 ---------- */
/** 滾筒地平線的彎曲程度（動森式：遠處明顯往下沉，畫面上方露出天空） */
export const CURVE = 0.032;
/* ---------- 視錐剔除（v7.3）：three.js 用彎曲前的位置判斷，遠處高的東西會被誤剔除，所以以前整個場景都關掉剔除（每格多畫好幾百個畫面外的網格）。
   這裡改成兩個位置都判斷：原本的包圍球，和照著色器的彎曲公式往下移（深度不同彎得不同：中心移平均、半徑加上差的一半）的包圍球，
   有一個在畫面裡就畫——有沒有套彎曲的材質都不會被誤剔除。鏡頭是這一次 renderer.render 的鏡頭（彎曲是在它的視空間算的）；
   陰影貼圖的視錐（noBend）不彎曲，照原本的判斷。包圍球加一點邊界，給風吹、旗子這類頂點動畫。 ---------- */
const CULL = { cam: null, up: new THREE.Vector3(), fw: new THREE.Vector3(), pos: new THREE.Vector3() }, _cs = new THREE.Sphere(), _cv = new THREE.Vector3();
function bentHit(fr, s) {
  s.radius += 0.5 + s.radius * 0.05;
  if (fr.intersectsSphere(s)) return true;
  if (fr.noBend || !CULL.cam || !U.uCurve.value) return false;
  const F = U.uBendF.value, K = U.uCurve.value, d = _cv.copy(s.center).sub(CULL.pos).dot(CULL.fw), b = x => { const z = Math.max(x - F, 0); return z * z * K; };
  const b0 = b(d - s.radius), b1 = b(d + s.radius); if (b1 <= 0) return false;
  s.center.addScaledVector(CULL.up, -(b0 + b1) / 2); s.radius += (b1 - b0) / 2;
  return fr.intersectsSphere(s);
}
THREE.Frustum.prototype.intersectsObject = function (o) {
  if (o.boundingSphere !== undefined) { if (o.boundingSphere === null) o.computeBoundingSphere(); _cs.copy(o.boundingSphere); }
  else { const g = o.geometry; if (g.boundingSphere === null) g.computeBoundingSphere(); _cs.copy(g.boundingSphere); }
  return bentHit(this, _cs.applyMatrix4(o.matrixWorld));
};
/* 精靈（雲、霧、光暈）：three.js 用半徑 0.707 的球，沒算 center 偏移；這裡用 1.42（center 在角落也包得住），一樣兩個位置都判斷 */
THREE.Frustum.prototype.intersectsSprite = function (s) { _cs.center.set(0, 0, 0); _cs.radius = 1.42; return bentHit(this, _cs.applyMatrix4(s.matrixWorld)); };
{ const render = renderer.render.bind(renderer);
  renderer.render = (sc, cam) => { CULL.cam = cam; cam.updateMatrixWorld(); CULL.pos.setFromMatrixPosition(cam.matrixWorld); CULL.up.setFromMatrixColumn(cam.matrixWorld, 1).normalize(); CULL.fw.setFromMatrixColumn(cam.matrixWorld, 2).normalize().negate(); render(sc, cam); }; }
/** 可以交給視錐剔除的物件：一般網格、精靈與擺好不再動的 InstancedMesh（userData.staticInst）；數量會變的 InstancedMesh 與粒子（位置在著色器裡算）照舊不剔除，userData.noCull 也不剔除 */
export const cullable = o => (!!o.isSprite || (!!o.isMesh && (!o.isInstancedMesh || !!o.userData.staticInst) && !o.isSkinnedMesh)) && !(o.userData && o.userData.noCull);
/** 很小的零件（包圍半徑 0.2 公尺以下：釘飾、小花、按鈕；角色是 0.1 以下：眼睛、鼻子）不投影子：陰影貼圖上幾乎看不出來，卻要多畫一次 */
export function dropTinyShadows(root) {
  const s = new THREE.Vector3();
  root.traverse(o => {
    if (!o.isMesh || !o.castShadow || o.isInstancedMesh) return;
    let ch = false; for (let p = o; p && !ch; p = p.parent) ch = !!(p.userData && p.userData.wear);
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.getWorldScale(s);
    if (o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z) < (ch ? 0.1 : 0.2)) o.castShadow = false;
  });
}
export const U = { uCurve: { value: CURVE }, uBendF: { value: 15 }, uTime: { value: 0 }, uWind: { value: 1 }, uSunV: { value: new THREE.Vector3(0, 1, 0) }, uRimCol: { value: new THREE.Color('#ffc870') }, uRim: { value: 0 },
  uOccP: { value: new THREE.Vector2(-9999, -9999) }, uOccR: { value: 0 }, uOccD: { value: 0 }, uOccY: { value: 0 }, uPlayer: { value: new THREE.Vector3(0, -99, 0) },
  uSnow: { value: 0 }, uWet: { value: 0 }, uFall: { value: 0 }, uBloom: { value: 0 }, uShade: { value: 0 },
  uWindDir: { value: new THREE.Vector2(0.97, 0.24).normalize() }, uTrans: { value: 0 }, uInside: { value: 0 } };   // uInside：v7.8 正在畫住宅的室內（house.js 畫的時候設 1）   // v7.0：風向（世界座標 xz，陣風順著它推過去）、逆光時葉片透光的強度（main.js 每幀設定）   // uShade：晴天雲影的強度   // 四季：積雪、紅葉、春意（seasons.js 每幀設定）
const BEND = `#include <project_vertex>
  { float bz = max(-mvPosition.z - uBendF, 0.0); mvPosition.y -= bz * bz * uCurve; }
  gl_Position = projectionMatrix * mvPosition;`;
/* 共用雜訊（片段著色器用） */
const NOISE = `
  float n_h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n_v(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(n_h(i), n_h(i + vec2(1.0, 0.0)), f.x), mix(n_h(i + vec2(0.0, 1.0)), n_h(i + vec2(1.0, 1.0)), f.x), f.y); }
  float n_f(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n_v(p); p = p * 2.07 + vec2(3.1, 1.7); a *= 0.5; } return s; }
  float n_cell(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 1.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(n_h(i + g), n_h(i + g + 17.0)); d = min(d, length(g + o - f)); }
    return d; }
  // v7.4 草地的生境色塊（Codex 第二輪 C7）：地面與草叢用同一組 1.5–4 公尺的色塊，草色才對得上。整體往鼠尾草綠 #8D9F70 收一點（以前是飽和的黃綠），
  // 一塊塊偏冷、略暗的鼠尾草 #778E6A，和偏黃、略亮的乾草 #AAA67B；只換色相、保留原本的明暗（下面的向量是各色除以自己的亮度）
  vec3 habTint(vec3 c, vec2 p){
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722)), h = n_f(p * 0.23 + vec2(17.3, -4.1));
    float sg = smoothstep(0.42, 0.3, h), dr = smoothstep(0.55, 0.68, h);
    vec3 t = mix(mix(vec3(0.84, 1.1, 0.56), vec3(0.77, 1.11, 0.63), sg), vec3(1.05, 1.03, 0.58), dr);
    return mix(c, t * l, 0.3 + 0.25 * max(sg, dr)) * (1.0 + dr * 0.06 - sg * 0.05);
  }
  // v7.7 夢幻風的手繪暈染：表面像水彩上色——1–3 公尺的色塊在暖杏與薰衣草之間漂移，朝上的面被陽光曬得暖一點、朝下的面（屋簷底、桌底）帶薰衣草的陰影色，
  // 不是灰色的髒污。只換色相、亮度幾乎不變；y 斜斜混進 xz 當座標，曲面上沒有投影的接縫。k：強度（0 = 不變）
  vec3 taDream(vec3 c, vec3 wp, vec3 wn, float k){
    vec2 p = wp.xz + wp.y * vec2(0.71, -0.53);
    float w = smoothstep(0.3, 0.7, n_v(p * 0.4 + vec2(5.3, 1.7)) * 0.62 + n_v(p * 1.25 + vec2(1.3, 8.2)) * 0.38);
    vec3 t = mix(vec3(0.95, 0.945, 1.07), vec3(1.06, 1.01, 0.92), w);
    t *= mix(vec3(1.0), vec3(1.035, 1.015, 0.975), clamp(wn.y, 0.0, 1.0));
    t *= mix(vec3(1.0), vec3(0.93, 0.92, 1.04), clamp(-wn.y, 0.0, 1.0));
    return c * mix(vec3(1.0), t, k);
  }
`;
/* 遮擋鏤空：擋在鏡頭與玩家之間、比玩家腳高的東西，在玩家周圍用網點方式挖空（房子、樹、懸崖不會把角色整個擋住） */
const OCC_F = `
  if (uOccR > 0.0 && vViewPosition.z < uOccD - 0.9 && vWP.y > uOccY + 0.35) {
    float dd = length(gl_FragCoord.xy - uOccP);
    float a = smoothstep(uOccR, uOccR * 0.62, dd);   // v6.93：中間整片挖空、只有外圈一小段網點淡出（整圈網點看起來像畫面壞掉）
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (ign < a) discard;
  }`;
const VTOP = 'uniform float uCurve;\nuniform float uBendF;\nuniform float uTime;\nuniform float uWind;\nuniform vec3 uPlayer;\nuniform float uSnow;\nuniform vec2 uWindDir;\nvarying vec3 vWP;\nvarying vec3 vWN;\nvarying vec3 vOP;\nvarying float vSeed;\nvarying float vGust;\n' + `
  /* 陣風場（v7.0）：大塊的陣風帶（約 25 公尺）順著風向以每秒約 5 公尺推過整座島，上面疊小一點的亂流——草原上看得到一波波風浪，
     樹在陣風經過時才明顯擺動。草、花、樹、旗子都查同一個場，風浪會依序經過它們 */
  float wh_(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wn_(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(wh_(i), wh_(i + vec2(1.0, 0.0)), f.x), mix(wh_(i + vec2(0.0, 1.0)), wh_(i + vec2(1.0, 1.0)), f.x), f.y); }
  float taGust(vec2 p){ vec2 d = uWindDir; float a = dot(p, d), c = dot(p, vec2(-d.y, d.x)), t = uTime * (0.75 + 0.35 * uWind);
    float g = wn_(vec2(a * 0.04 - t * 0.2, c * 0.03)) * 0.65 + wn_(vec2(a * 0.11 - t * 0.62, c * 0.09 + 3.7)) * 0.35;
    return smoothstep(0.34, 0.86, g); }
`;
const FTOP = 'uniform vec3 uSunV;\nuniform vec3 uRimCol;\nuniform float uRim;\nuniform vec2 uOccP;\nuniform float uOccR;\nuniform float uOccD;\nuniform float uOccY;\nuniform float uTime;\nuniform float uSnow;\nuniform float uWet;\nuniform float uFall;\nuniform float uBloom;\nuniform float uShade;\nuniform float uTrans;\nuniform float uInside;\nvarying vec3 vWP;\nvarying vec3 vWN;\nvarying vec3 vOP;\nvarying float vSeed;\nvarying float vGust;\n';
/* ---------- 手繪微表面：低對比、可重複的程式色塊；保留 DET 與三平面材質接口 ---------- */
const neutral = (r, g, b) => { const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1); t.needsUpdate = true; return t; };
export const DET = {};
['grass', 'dirt', 'sand', 'rock', 'plaster', 'planks', 'tiles', 'bark', 'leaves', 'cobble', 'masonry'].forEach(n => { DET[n] = { d: { value: neutral(128, 128, 128) }, n: { value: neutral(128, 128, 255) } }; });
/** 每種材質用哪幾張細節圖（uD0..uD2 / uN0..uN2） */
const DETK = { terrain: ['grass', 'sand', 'rock'], wall: ['planks'], roof: ['plaster'], stone: ['rock'], bark: ['bark'], sway: ['leaves'], sakura: ['leaves'], pine: ['leaves'], wood: ['planks'], fabric: ['plaster'], ceramic: ['plaster'], metal: ['rock'], foliage: ['leaves'], paper: ['plaster'] };
/** v7.6 室內與家具的材質種類（M(color, opts, kind) 的 kind）：木頭、布料、陶瓷、金屬、室內葉子、紙 */
export const MATK = ['wood', 'fabric', 'ceramic', 'metal', 'foliage', 'paper'];
const TRI = `
  uniform sampler2D uD0; uniform sampler2D uN0; uniform sampler2D uD1; uniform sampler2D uN1; uniform sampler2D uD2; uniform sampler2D uN2;
  vec3 triW(vec3 n){ vec3 b = pow(abs(n), vec3(4.0)); return b / (b.x + b.y + b.z); }
  vec3 triD(sampler2D t, vec3 p, vec3 b){ return texture2D(t, p.zy).rgb * b.x + texture2D(t, p.xz).rgb * b.y + texture2D(t, p.xy).rgb * b.z; }
  vec3 triN(sampler2D t, vec3 p, vec3 b){
    vec2 a = texture2D(t, p.zy).xy * 2.0 - 1.0, c = texture2D(t, p.xz).xy * 2.0 - 1.0, e = texture2D(t, p.xy).xy * 2.0 - 1.0;
    return vec3(0.0, a.y, a.x) * b.x + vec3(c.x, 0.0, c.y) * b.y + vec3(e.x, e.y, 0.0) * b.z; }
`;
/** 僅保留 CC0 環境倒影來源；照片 d/n 不再覆蓋木、石、草、葉與灰泥。 */
function loadPhotoDetail() {
  const base = window.__MODEL_BASE || 'src/isle/models/';
  return new Promise(res => {
    if (window.TA && window.TA.TEX) { res(window.TA.TEX); return; }
    const sc = document.createElement('script'); sc.src = base + 'tex_photo.js'; sc.onload = () => res((window.TA && window.TA.TEX) || {}); sc.onerror = () => res({}); document.head.appendChild(sc);
  }).then(pack => { if (pack.env) loadEnv(pack.env); if (window.TA && window.TA.TEX) delete window.TA.TEX; });
}
/** 中性 0.5 是乘色的 1；最大偏差 ±3%，法線擾動低於 0.04。沒有照片與顆粒裂紋。 */
function paintedDetail(kind, size) {
  const d = new Uint8Array(size * size * 4), n = new Uint8Array(d.length), wood = kind === 'planks' || kind === 'bark';
  const amp = kind === 'rock' || kind === 'masonry' ? 0.018 : wood ? 0.014 : 0.009;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2, i = (y * size + x) * 4;
    const wash = wood ? Math.sin(u * 5 + Math.sin(v) * 0.5) * 0.65 + Math.sin(u * 2 - v) * 0.35 : Math.sin(u + Math.sin(v)) * 0.6 + Math.cos(v * 2 - u) * 0.4;
    const value = Math.round((0.5 + wash * amp) * 255);
    d[i] = d[i + 1] = d[i + 2] = value; d[i + 3] = 255;
    n[i] = Math.round(128 + Math.cos(u + Math.sin(v)) * 3); n[i + 1] = Math.round(128 + Math.sin(v * 2 - u) * 3); n[i + 2] = n[i + 3] = 255;
  }
  return { detail: new THREE.DataTexture(d, size, size), normal: new THREE.DataTexture(n, size, size) };
}
/* 天空倒影：Poly Haven 的晴天全景（tools/hdri_env.py 轉成一般圖片）做成環境貼圖，只給水面與玻璃反射用，不參與整體打光 */
export const ENV_MATS = [];   // bend() 登記的水面、玻璃材質
const envState = { tex: null, k: 1 };   // k：天空倒影的亮度（晚上變暗，倒影是白天的天空）
function loadEnv(url) {
  new THREE.TextureLoader().load(url, t => {
    t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer); envState.tex = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    ENV_MATS.forEach(applyEnv);
  });
}
function applyEnv(m) { if (!envState.tex) return; m.envMap = envState.tex; m.userData.envBase = m.userData.kind === 'glass' ? 0.9 : m.vertexColors ? 0.4 : m === water.sea ? 0.0 : 0.75; m.envMapIntensity = m.userData.envBase * envState.k; m.needsUpdate = true; }   // 河與小溪（頂點色）倒影淡一點，看得到水底
/** 懸崖岩壁的手繪貼圖（models/tex_cliff.js，Codex 繪製）：載入前 uCliffOn = 0，維持原本程式畫的岩層 */
export const CLIFF = { w: { value: neutral(170, 140, 110) }, e: { value: neutral(150, 115, 85) }, on: { value: 0 }, mason: { value: 0 } };   // mason：v6.79 新島的台地邊緣是白石擋土牆（terrain.js 依規劃打開）
function loadCliff(aniso) {
  const base = window.__MODEL_BASE || 'src/isle/models/';
  return new Promise(res => {
    if (window.TA && window.TA.CLIFF) { res(window.TA.CLIFF); return; }
    const sc = document.createElement('script'); sc.src = base + 'tex_cliff.js'; sc.onload = () => res((window.TA && window.TA.CLIFF) || null); sc.onerror = () => res(null); document.head.appendChild(sc);
  }).then(pk => pk && Promise.all(['warm', 'earth'].map(k => new Promise((ok, no) => new THREE.TextureLoader().load(pk[k], t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; ok(t); }, undefined, no)))))
    .then(tx => { if (!tx) return; CLIFF.w.value = tx[0]; CLIFF.e.value = tx[1]; CLIFF.on.value = 1; }).catch(() => {});
}
export async function initDetail(size) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  loadCliff(aniso);
  loadPhotoDetail().catch(() => {});   // 倒影非必要資源，不阻擋微表面建立
  for (const n of Object.keys(DET)) {
    await new Promise(r => setTimeout(r, 0));
    try {
      const t = paintedDetail(n, Math.min(size || 256, 256));
      [t.detail, t.normal].forEach(x => { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.generateMipmaps = true; x.minFilter = THREE.LinearMipmapLinearFilter; x.magFilter = THREE.LinearFilter; x.anisotropy = aniso; x.colorSpace = THREE.NoColorSpace; x.needsUpdate = true; });
      DET[n].d.value = t.detail; DET[n].n.value = t.normal;
    } catch (e) { console.warn('細節材質產生失敗：', n, e); }
  }
}
const WN = 'vWN = normalize(mat3(modelMatrix) * objectNormal);';
/* ---------- 水面的第二階段（v7.0）----------
   post.js 先畫不透明的場景（圖層 0），把顏色與深度複製到最終緩衝，再把透明的東西畫上去——水最先畫（renderOrder -10）。
   水讀得到底下真的顏色（uOpq）與深度（uOpqD）：依水深吸收紅光（淺灘清透、深處湛藍）、波紋折射水底、
   螢幕空間倒影（岸邊的燈、房子、樹倒映在水裡）、遠方的天空與城堡用方向查找、岸線依深度柔和淡出並帶一圈碎泡。
   uLate = 0（省電模式、室內、其他小島）時照舊用一般的半透明混色 */
export const WL = { uLate: { value: 0 }, uOpq: { value: null }, uOpqD: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNF: { value: new THREE.Vector2(0.5, 500) },
  uPrj: { value: new THREE.Matrix4() }, uSSR: { value: 1 }, uAbs: { value: new THREE.Vector3(0.78, 0.40, 0.30) }, uAbsSea: { value: new THREE.Vector3(0.90, 0.40, 0.22) }, uScat: { value: new THREE.Color('#39576b') }, uDbg: { value: 0 }, uSplit: { value: 0 } };   // uSplit：這一格島上用兩階段（地形的水底不再自己染色）
const LATE_W = `
  uniform float uLate; uniform sampler2D uOpq; uniform sampler2D uOpqD; uniform vec2 uRes; uniform vec2 uNF; uniform mat4 uPrj; uniform float uSSR; uniform vec3 uAbs; uniform vec3 uAbsSea; uniform vec3 uScat; uniform float uDbg;
  float taLin(float d){ return uNF.x * uNF.y / (uNF.y - d * (uNF.y - uNF.x)); }
  vec2 taUV(vec3 p){ vec4 c = uPrj * vec4(p, 1.0); return c.xy / c.w * 0.5 + 0.5; }
  float taEdge(vec2 u){ vec2 e = min(u, 1.0 - u); return smoothstep(0.0, 0.07, min(e.x, e.y)); }
  vec3 taSkyA(vec3 R, vec3 upV){ float ry = dot(R, upV), yy = clamp(max(ry, 0.0) / 0.55, 0.0, 1.0);
    vec3 s = yy < 0.32 ? mix(uSkyB, uSkyM, yy / 0.32) : mix(uSkyM, uSkyT, smoothstep(0.32, 0.88, yy));   // v7.6：和天幕同一套分段
    return mix(s, uSkyM * 0.7, smoothstep(0.0, -0.15, ry)); }
  /* n：視空間法線；irr：水面收到的光（漫射，已含陰影與燈光格子）；skyR：解析的天空倒影；spec：太陽／月亮的反光；alb：水體散射的顏色 */
  /* 晨昏的大海：倒影偏深青藍，只有太陽那一側映著金橘（和天幕畫的遠海同一個公式，海平線不會有一條分界） */
  vec3 taDusk(vec3 c, vec3 R, vec3 upV){ float gk = clamp(uGlow * 2.0, 0.0, 1.0) * (1.0 - uNight);
    vec3 rH = normalize(R - upV * dot(R, upV) + 1e-4), sH = normalize(uSunV - upV * dot(uSunV, upV) + 1e-4);
    return mix(c, vec3(0.012, 0.085, 0.19) + c * 0.12, gk * (1.0 - pow(max(dot(rH, sH), 0.0), 14.0) * 0.8) * 0.9); }
  vec3 taLateWater(vec3 n, vec3 irr, vec3 skyR, vec3 spec, vec3 alb, float calm, vec3 absK, float sea, float edgeK){
    vec2 suv = gl_FragCoord.xy / uRes;
    vec3 P = -vViewPosition, V = normalize(vViewPosition);
    vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    float zW = -P.z, rayK = length(P) / max(zW, 1e-3);
    float zO = taLin(texture2D(uOpqD, suv).x), thick0 = max(zO - zW, 0.0) * rayK;
    float cosV = max(dot(V, upV), 0.06), vdep = thick0 * cosV;   // 垂直水深（約）
    // 折射：水面的傾斜把水底的像推開一點；推到了水面前面的東西（腳、石頭）就不推
    vec2 tilt = (n - upV * dot(n, upV)).xy;
    vec2 ruv = suv + tilt * 0.025 * clamp(thick0, 0.0, 1.4) / (1.0 + zW * 0.05);
    float zR = taLin(texture2D(uOpqD, ruv).x);
    if (zR < zW + 0.03) { ruv = suv; zR = zO; }
    float thick = max(zR - zW, 0.0) * rayK;
    vec3 under = texture2D(uOpq, ruv).rgb;
    vec3 Tr = exp(-absK * thick);
    vec3 body = irr * alb;   // 水體把光散射回來的顏色（越深越多）
    vec3 refr = under * Tr + body * (1.0 - Tr);
    // 倒影：先看鏡頭在這個方向看到的遠景（天空、雲、城堡——遠到視差可以忽略），再用螢幕空間追蹤找近處的東西
    vec3 R = normalize(reflect(-V, n));
    vec3 refl = skyR;
    { vec4 cs = uPrj * vec4(R, 0.0);
      if (cs.w > 1e-3) { vec2 su = cs.xy / cs.w * 0.5 + 0.5; if (su.x > 0.0 && su.x < 1.0 && su.y > 0.0 && su.y < 1.0) {
        float ds = texture2D(uOpqD, su).x, zs = taLin(ds); vec3 Ps = vec3((su * 2.0 - 1.0) / vec2(uPrj[0][0], uPrj[1][1]) * zs, -zs);
        bool above = ds > 0.9999 || (zs > 70.0 && cameraPosition.y + dot(Ps, upV) > vWP.y + 2.0);   // 只取天空與水面上方的遠景（城堡、浮空島）；水底的海床不算
        if (above) { vec3 lk = texture2D(uOpq, su).rgb; if (sea > 0.5) lk = taDusk(lk, R, upV); refl = mix(refl, lk, taEdge(su)); } } } }
    if (uSSR > 0.5) {
      float st = 0.1 + zW * 0.01, jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      vec3 p = P + R * st * (0.3 + jit), pa = P; float hit = 0.0; vec2 huv = vec2(0.5);
      for (int i = 0; i < 30; i++) {
        vec2 u = taUV(p); if (u.x < 0.0 || u.x > 1.0 || u.y < 0.0 || u.y > 1.0 || -p.z < 0.5) break;
        float zs = taLin(texture2D(uOpqD, u).x), zp = -p.z;
        if (zp > zs && zp - zs < max(0.35, st * 2.2)) {
          vec3 a = pa, b = p;
          for (int k = 0; k < 5; k++) { vec3 m = (a + b) * 0.5; vec2 um = taUV(m); if (-m.z > taLin(texture2D(uOpqD, um).x)) b = m; else a = m; }
          huv = taUV(b); hit = taEdge(huv) * smoothstep(1.0, 0.9, huv.y) * (1.0 - float(i) / 30.0 * 0.5); break;
        }
        pa = p; p += R * st; st *= 1.13;
      }
      if (hit > 0.0) refl = mix(refl, texture2D(uOpq, huv).rgb, hit);
    }
    float F = 0.035 + 0.965 * pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 4.6);   // 風格化的菲涅耳：斜看時倒影比物理值明顯一點（像插畫裡的水）
    vec3 col = mix(refr, refl, F * mix(0.68, 0.78, min(calm, 1.0))) + spec * 0.6;   // calm 大於 1（池塘）只用來減少白沫
    if (uDbg > 0.5) return uDbg < 1.5 ? refl : uDbg < 2.5 ? refr : uDbg < 3.5 ? vec3(F) : vec3(thick0 * 0.5, vdep * 2.0, 0.0);
    // 岸線：貼著岸的地方一圈斷斷續續的碎泡（依真的水深），再依深度柔和地淡進岸上
    vec2 q = vWP.xz;
    float lace = n_v(q * 2.6 + vec2(uTime * 0.35, -uTime * 0.22)) * 0.6 + n_v(q * 7.0 - vec2(uTime * 0.5, uTime * 0.3)) * 0.4;
    float foam = smoothstep(0.16, 0.0, vdep + (lace - 0.5) * 0.16) * smoothstep(0.35, 0.7, lace) * (1.0 - calm * 0.5);
    col = mix(col, irr * 0.92 + spec * 0.3, foam * 0.42);
    return mix(texture2D(uOpq, suv).rgb, col, smoothstep(0.0, 0.045, vdep) * edgeK);   // edgeK：大海網格的外緣淡進天幕畫的遠海
  }
`;
const SEA_GLSL = `
        #ifdef TA_SEA
        vec3 seaSpec = vec3(0.0);
        { // 大海：用當下的天色算倒影（不用固定的天空照片）。斜看時幾乎全是倒影（菲涅耳），近處看得到水色與淺灘；
          // 太陽或月亮的正下方是一條閃爍的反光帶，太陽越低越長
          vec3 Vv = normalize(vViewPosition), upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          float dist = length(vViewPosition), lod = clamp(1.0 - dist / 110.0, 0.0, 1.0);
          vec2 q = vWP.xz; float t = uTime;
          // 幾組不同方向、不同波長的波：斜看時波峰壓成一條條橫線（像真的海），振幅隨大範圍的雜訊起伏，不會太規則
          float amp = 0.65 + 0.7 * n_v(q * 0.05 + vec2(t * 0.02, 0.0));
          vec2 sl = vec2(0.0), d0;
          d0 = normalize(vec2(1.0, 0.35));  sl += d0 * cos(dot(q, d0) * 1.05 + t * 1.0) * 0.085 * amp;
          d0 = normalize(vec2(-0.45, 1.0)); sl += d0 * cos(dot(q, d0) * 1.7 + t * 1.3 + 1.7) * 0.07 * amp;
          d0 = normalize(vec2(0.8, -0.6));  sl += d0 * cos(dot(q, d0) * 2.9 + t * 1.7 + 4.1) * 0.05 * (0.4 + 0.6 * lod);
          d0 = normalize(vec2(-0.9, -0.2)); sl += d0 * cos(dot(q, d0) * 4.7 + t * 2.2 + 2.3) * 0.04 * lod;
          sl += (vec2(n_v(q * 0.6 + vec2(t * 0.06, 0.0)), n_v(q * 0.6 + vec2(3.7, 8.1) - vec2(0.0, t * 0.05))) - 0.5) * 0.12;
          sl *= 1.0 - smoothstep(55.0, 145.0, dist) * 0.88;
          vec3 nV = normalize(mix(normalize((viewMatrix * vec4(-sl.x, 1.0, -sl.y, 0.0)).xyz), normal, 0.2));
          nV = normalize(mix(nV, upV, smoothstep(70.0, 150.0, dist) * 0.9));
          // 閃光用的細波紋：近處細碎，遠處淡掉（遠處的反光帶靠寬一點的光瓣連成一條）
          vec2 fn = (vec2(n_v(q * 13.0 + vec2(t * 1.1, -t * 0.7)), n_v(q * 13.0 + vec2(5.1, 2.7) + vec2(-t * 0.8, t * 0.9))) - 0.5) * 0.5
                  + (vec2(n_v(q * 29.0 + vec2(-t * 1.6, t * 1.3) + 9.0), n_v(q * 29.0 + vec2(1.3, 6.6) + vec2(t * 1.4, t * 1.7))) - 0.5) * 0.35;
          float near = smoothstep(4.0, 12.0, dist);   // 鏡頭前幾公尺的細碎閃點投影到畫面上太大，泛光後變成一顆顆圓斑：淡掉
          vec3 nS = normalize(nV + (viewMatrix * vec4(-fn.x, 0.0, -fn.y, 0.0)).xyz * lod * 0.6);
          vec3 R = reflect(-Vv, nV); float ry = dot(R, upV);
          float yy = clamp(max(ry, 0.0) / 0.55, 0.0, 1.0), under = smoothstep(0.0, -0.15, ry);
          vec3 skyR = yy < 0.32 ? mix(uSkyB, uSkyM, yy / 0.32) : mix(uSkyM, uSkyT, smoothstep(0.32, 0.88, yy));
          vec3 sH = normalize(uSunV - upV * dot(uSunV, upV) + 1e-4), rH = normalize(R - upV * ry + 1e-4);
          skyR += uSunCol * vec3(1.0, 0.82, 0.55) * pow(max(dot(rH, sH), 0.0), 4.0) * smoothstep(0.42, -0.02, ry) * uGlow * 1.5;   // 晨昏：太陽那一側的低空光暈也映在海上
          skyR = mix(skyR, uSkyM * 0.7, under);
          { float sunSide = pow(max(dot(rH, sH), 0.0), 14.0), gk = clamp(uGlow * 2.0, 0.0, 1.0) * (1.0 - uNight);   // 晨昏：倒影偏深青藍（概念圖的海），只有太陽那一側映著金橘
            skyR = mix(skyR, vec3(0.012, 0.085, 0.19) + skyR * 0.12, gk * (1.0 - sunSide * 0.8) * 0.9); }
          wN = nV; wSkyR = skyR;   // 第二階段的水面合成用同一組波紋法線與天空倒影
          float fr = mix((0.03 + 0.97 * pow(1.0 - max(dot(nV, Vv), 0.0), 5.0)) * 0.82, 1.0, smoothstep(45.0, 125.0, dist));   // 中近處留一點海水本色；遠處是純倒影，和天幕畫的遠海同色（不會有一條分界線）
          float sd = max(dot(R, uSunV), 0.0), low = 1.0 - smoothstep(0.15, 0.7, dot(uSunV, upV));   // 太陽越低，反光帶越長越亮
          float ss = max(dot(reflect(-Vv, nS), uSunV), 0.0);
          seaSpec = uSunCol * 0.6 * (pow(sd, mix(55.0, 30.0, uNight)) * (0.1 + low * 0.45 + uNight * 0.5) + pow(sd, mix(220.0, 700.0, lod)) * (0.35 + low * 1.3) + pow(ss, mix(2000.0, 900.0, uNight)) * (2.0 + low * 4.5 + uNight * 4.0) * lod * near) * mix(1.0, 1.6, uNight);   // 寬的柔光（遠處連成光帶）＋細碎的閃點；夜裡月光帶寬一點、亮一點   // 寬的柔光（遠處連成光帶）＋細碎的閃點
          vec3 lit0 = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;   // 只取漫射光：材質內建的太陽高光（粗糙度很低）在近處波紋上會變成一顆顆大亮點，反光改由下面的 spec 負責
          vec3 body = mix(lit0, mix(vec3(0.015, 0.09, 0.17), vec3(0.004, 0.025, 0.07), uNight), smoothstep(2.0, 14.0, dist) * clamp(uGlow * 2.2 + uNight * 0.8, 0.0, 1.0));
          outgoingLight = mix(body, skyR * 0.88, fr);
          diffuseColor.a = mix(mix(diffuseColor.a * 0.85, 1.0, fr), 1.0, clamp(smoothstep(0.15, 0.95, vSeaDepth) + clamp(uGlow * 2.0, 0.0, 1.0) * (1.0 - uNight) * smoothstep(0.05, 0.4, vSeaDepth) * 0.7, 0.0, 1.0)) * smoothstep(160.0, 140.0, max(abs(vWP.x), abs(vWP.z)));   // 透明度依水深：淺灘看得到沙，越深越不透明，外海（沒有海床）完全不透明；網格邊緣淡出，接上天幕畫的遠海   // 斜看、外海都不透明；島內的淺灘仍看得到沙；網格邊緣淡出，接上天幕畫的遠海   // 斜看時不透明；海面網格的邊緣淡出，接上天幕畫的遠海
        }
        #endif
`;
/* ---------- 每一盞燈都真的照亮（v6.83）：世界座標的燈光格子 ----------
   島上切成 2 公尺一格，每一格記下照得到它的燈（最多 16 盞，依在格子裡的亮度排序；glow.js 建表）。v8.0：燈可以有光錐（第三列：照射方向與光錐邊緣的 cos）。
   材質（bend 的標準材質）在每個像素查自己那一格，逐盞用和 three.js 點光源同一套公式算漫射與高光，
   所以畫面裡看得到的每一扇窗、每一盞燈都真的照在牆面、地面與角色身上；畫面外沒有像素，也就不用算。白天（uLOn = 0）整段跳過 */
export const LGRID = { s: 2, o: -58, n: 58, q: 4, max: 1024 };
Object.assign(U, { uLGrid: { value: null }, uLData: { value: null }, uLOn: { value: 0 }, uLMax: { value: 12 } });
const LG_TOP = '#if __VERSION__ >= 300\nuniform highp sampler2D uLGrid;\nuniform highp sampler2D uLData;\nuniform float uLOn;\nuniform float uLMax;\n#endif\n';
const LG_GLSL = `
  #if __VERSION__ >= 300 && defined( RE_Direct )
  if ( uLOn > 0.001 ) {
    ivec2 lgc = ivec2( floor( ( vWP.xz - vec2( ${LGRID.o.toFixed(1)} ) ) / ${LGRID.s.toFixed(1)} ) );
    if ( lgc.x >= 0 && lgc.y >= 0 && lgc.x < ${LGRID.n} && lgc.y < ${LGRID.n} ) {
      float lgn = 0.0, lgCap = uLMax;
      #ifdef TA_LGFEW
        lgCap = min( lgCap, 4.0 );   // 草、花、葉片卡：一層疊一層，只算這一格最亮的四盞
      #endif
      vec3 lgN = normalize( ( vec4( geometryNormal, 0.0 ) * viewMatrix ).xyz );   // 世界座標的法線（漫射在世界座標算，不必每盞燈都換座標）
      vec3 lgD = vec3( 0.0 );
      for ( int k = 0; k < ${LGRID.q}; k ++ ) {
        vec4 ids = texelFetch( uLGrid, ivec2( lgc.x * ${LGRID.q} + k, lgc.y ), 0 );
        if ( ids.x < 0.5 || lgn >= lgCap ) break;
        for ( int j = 0; j < 4; j ++ ) {
          float id = ids[ j ];
          if ( id < 0.5 || lgn >= lgCap ) break;
          lgn += 1.0;
          int li = int( id ) - 1;
          vec4 lp = texelFetch( uLData, ivec2( li, 0 ), 0 );
          float lcone = step( 1000.0, lp.w ), lw = lp.w - lcone * 1000.0;   // w：照射距離 + 100 × 窗戶朝向（0 四面發光、1 +x、2 -x、3 +z、4 -z）+ 1000（有光錐）
          float lcode = floor( lw * 0.01 ), lr = lw - lcode * 100.0;
          vec3 Lw = lp.xyz - vWP; float ld = length( Lw );
          if ( ld >= lr ) continue;
          if ( lcode > 0.5 && dot( Lw, lcode < 2.5 ? vec3( 3.0 - 2.0 * lcode, 0.0, 0.0 ) : vec3( 0.0, 0.0, 7.0 - 2.0 * lcode ) ) > 0.85 ) continue;   // 窗戶的燈只照牆外那一側：牆後、屋後不會被照亮
          vec4 lc = texelFetch( uLData, ivec2( li, 1 ), 0 );
          vec3 lcol = lc.rgb * getDistanceAttenuation( max( ld, 0.55 ), lr, lc.a );   // 燈有柔和的發光半徑：貼著燈泡的燈罩、燈框不會被照到爆白（v6.93）
          if ( lcone > 0.5 ) { vec4 la = texelFetch( uLData, ivec2( li, 2 ), 0 ); lcol *= smoothstep( la.w, mix( la.w, 1.0, 0.45 ), dot( Lw, la.xyz ) / -ld ); }   // v8.0 有燈罩的燈只照光錐裡面：柱燈與路燈往下、樹的投光往上、窗光往外往下（不再把整面牆洗白）
          if ( dot( lcol, lcol ) < 1e-8 ) continue;
          #ifdef STANDARD
          if ( lgn < 2.5 && material.roughness < 0.75 ) {   // 這一格最亮的兩盞照在光滑的表面（屋瓦、金屬、玻璃）：漫射＋高光，和 three.js 的點光源一樣
            directLight.direction = normalize( ( viewMatrix * vec4( Lw, 0.0 ) ).xyz );   // 用世界座標算方向：遠處被滾筒彎下去的牆面也照得對
            directLight.color = lcol * uLOn; directLight.visible = true;
            RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
            continue;
          }
          #endif
          lgD += lcol * saturate( dot( lgN, Lw / ld ) );   // 其餘只算漫射（粗糙的牆、地面、草上高光幾乎看不到）
        }
      }
      reflectedLight.directDiffuse += lgD * uLOn * BRDF_Lambert( material.diffuseColor );
    }
  }
  #endif`;
export function bend(mat, kind) {
  kind = kind || 'plain';
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uCurve: U.uCurve, uBendF: U.uBendF, uTime: U.uTime, uWind: U.uWind, uPlayer: U.uPlayer, uSnow: U.uSnow, uWindDir: U.uWindDir });
    const std = sh.fragmentShader.includes('#include <lights_fragment_begin>') && sh.fragmentShader.includes('#include <opaque_fragment>');
    const wn = std ? WN : 'vWN = vec3(0.0, 1.0, 0.0);';   // 沒有法線的材質（Basic、Points）
    let v = VTOP + (kind === 'terrain' ? '#ifdef TA_SURFACE\nattribute vec4 aSurface; varying vec4 vSurface;\n#endif\n' : '') + (kind === 'water' ? '#ifdef TA_SEA\nattribute float aDepth;\nvarying float vSeaDepth;\n#else\nattribute float aPond;\n#endif\nvarying float vPond;\n' : '') + sh.vertexShader;
    // 世界座標、世界法線與物件座標（材質細節、遮擋鏤空用）
    v = v.replace('#include <begin_vertex>', `#include <begin_vertex>
      vOP = position;
      #ifdef TA_SURFACE
        vSurface = aSurface;
      #endif
      ${wn}
      #ifdef USE_INSTANCING
        vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        vec2 sd0 = (modelMatrix * instanceMatrix[3]).xz;
      #else
        vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vec2 sd0 = modelMatrix[3].xz;
      #endif
      vSeed = fract(sin(dot(floor(sd0 * 0.55), vec2(12.9898, 78.233))) * 43758.5453);
      vGust = 0.0;`);
    if (kind === 'sway' || kind === 'pine' || kind === 'sakura') v = v.replace(wn, `${wn}
      vec3 wp0 = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #ifdef USE_INSTANCING
        wp0 = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;   // 一起畫的多棵樹：各自依自己的位置擺動
      #endif
      float sw = max(position.y, 0.0);
      #ifdef TA_MERGED
        sw = 0.0;   // 合併進建築的小盆栽：物件座標不再是自己的，不跟著風擺
      #endif
      { // v7.0 分層的風：整株順著世界的風向慢慢傾斜（陣風經過時明顯）、來回擺盪帶一點側向的 8 字，枝梢的葉子再細細顫動。
        // 位移換到物件座標：每棵樹不管怎麼轉，都往同一個風向倒
        mat3 wm = mat3(modelMatrix);
        #ifdef USE_INSTANCING
          wm = mat3(modelMatrix) * mat3(instanceMatrix);
        #endif
        float ws = sqrt(max(dot(wm[0], wm[0]), 1e-8));
        vec3 wdO = transpose(wm) * vec3(uWindDir.x, 0.0, uWindDir.y) / ws, pdO = transpose(wm) * vec3(-uWindDir.y, 0.0, uWindDir.x) / ws;
        float gu = taGust(wp0.xz), ph = dot(wp0.xz, uWindDir) * 0.25 + wp0.x * 0.31;
        float lean = (0.008 + 0.022 * gu) * uWind + (uWind - 1.0) * 0.02;
        float osc = sin(uTime * 1.25 * (0.75 + 0.25 * uWind) + ph) * (0.012 + 0.016 * gu) * uWind + sin(uTime * 2.2 + wp0.z * 0.5) * 0.004;
        float fl = sin(uTime * 7.3 + dot(position, vec3(13.1, 7.7, 11.3))) * (0.0035 + 0.006 * gu) * uWind * smoothstep(0.0, 1.2, sw);   // 葉片細顫（約 1.2 Hz 的十倍頻率、很小）
        transformed += (wdO * (lean + osc) + pdO * sin(uTime * 0.9 + ph * 1.7) * 0.007 * uWind) * sw + vec3(fl, fl * 0.6, -fl * 0.8);
      }`);
    if (kind === 'cloth') v = v.replace(wn, `${wn}
      { // v7.0 旗幟布料：上緣綁在橫桿上不動，越往下擺得越多；陣風經過時整片被吹鼓、布面有往下傳的波紋（物件座標：布在 xy 平面、z 是布面法線）
        vec3 wp0 = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #ifdef USE_INSTANCING
          wp0 = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float hang = clamp((2.71 - position.y) / 1.7, 0.0, 1.0), w = pow(hang, 1.25), gu = taGust(wp0.xz), ph = wp0.x * 0.7 + wp0.z * 0.37;
        float wave = sin(uTime * (2.4 + 0.6 * gu) - position.y * 3.4 + position.x * 2.2 + ph) * (0.028 + 0.05 * gu) + sin(uTime * 4.1 - position.y * 6.0 + ph * 1.3) * 0.009;
        transformed.z += (wave + (0.03 + 0.07 * gu) * (uWind * 0.8)) * w * uWind;
        transformed.x += sin(uTime * 1.7 + ph) * 0.02 * w * uWind;
        vGust = gu * w;
      }`);
    if (kind === 'water') v = v.replace(wn, `${wn}
      #ifdef TA_SEA
        vSeaDepth = aDepth; vPond = 0.0;
      #else
        vPond = aPond;   // v7.4：池塘（terrain.js 的 aPond），其他水面是 0
      #endif
      transformed.y += (sin(uTime * 0.9 + position.x * 0.35 + position.z * 0.2) * 0.06 + sin(uTime * 1.4 - position.z * 0.5) * 0.04) * ((modelMatrix * vec4(position, 1.0)).y > 0.8 ? 0.25 : 1.0);`);   // 小溪很淺：水面起伏小
    if (kind === 'flower' && mat.defines && 'TA_FLOWERTINT' in mat.defines) v = 'attribute float aTint;\n' + v.replace('#include <color_vertex>', `
      vColor = vec3(1.0);
      #ifdef USE_COLOR
        vColor *= color;
      #endif
      #ifdef USE_INSTANCING_COLOR
        vColor *= mix(vec3(1.0), instanceColor.xyz, aTint);   // v7.3 野花合成一個網格：只有花瓣（aTint = 1）染上每一朵的顏色，莖和花心維持頂點色
      #endif`);
    if (kind === 'grass' || kind === 'flower') {
      // 草叢與花（花不會縮進雪裡）（InstancedMesh）：在世界座標加上風吹，玩家走過時往外倒
      v = v.replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(${kind === 'grass' ? 'transformed * max(1.0 - uSnow * 1.2, 0.0)' : 'transformed'}, 1.0);   // 冬天：草叢縮進雪裡
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        vec3 base = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float k = clamp(position.y / 0.32, 0.0, 1.0); k *= k;
        // v7.0：陣風經過時整片草被壓過去（葉尖變低、露出較亮的葉背，草原上看得到一波波風浪），平常是順著風向的輕擺加一點側向細擺
        float gu = taGust(base.xz); vGust = gu * k;
        float osc = sin(uTime * 1.6 * (0.7 + 0.3 * uWind) + dot(base.xz, uWindDir) * 0.45 + base.x * 0.3) * 0.032 + sin(uTime * 3.3 + base.x * 2.3 + base.z * 1.7) * 0.011;
        float push = (0.014 + gu * 0.062) * uWind + (uWind - 1.0) * 0.045;
        vec2 wv = uWindDir * (push + osc * (0.6 + gu)) * k;
        mvPosition.xz += wv + vec2(-uWindDir.y, uWindDir.x) * sin(uTime * 2.3 + base.z * 1.9 + base.x) * 0.009 * k;
        mvPosition.y -= dot(wv, wv) * 2.4;
        vec2 dp = base.xz - uPlayer.xz; float pd = length(dp);
        if (pd < 0.9 && abs(base.y - uPlayer.y) < 0.8) { mvPosition.xz += dp / max(pd, 0.001) * (0.9 - pd) * 0.45 * k; mvPosition.y -= (0.9 - pd) * 0.18 * k; }
        mvPosition = modelViewMatrix * mvPosition;
        { float bz = max(-mvPosition.z - uBendF, 0.0); mvPosition.y -= bz * bz * uCurve; }
        gl_Position = projectionMatrix * mvPosition;`);
    } else if (kind === 'sprite') v = v.replace('gl_Position = projectionMatrix * mvPosition;', '{ float bz = max(-mvPosition.z - uBendF, 0.0); mvPosition.y -= bz * bz * uCurve; }\n  gl_Position = projectionMatrix * mvPosition;');
    else v = v.replace('#include <project_vertex>', BEND);
    sh.vertexShader = v;
    if (!std) return;
    Object.assign(sh.uniforms, { uSunV: U.uSunV, uRimCol: U.uRimCol, uRim: U.uRim, uOccP: U.uOccP, uOccR: U.uOccR, uOccD: U.uOccD, uOccY: U.uOccY, uSnow: U.uSnow, uWet: U.uWet, uFall: U.uFall, uBloom: U.uBloom, uShade: U.uShade, uTrans: U.uTrans, uInside: U.uInside, uLGrid: U.uLGrid, uLData: U.uLData, uLOn: U.uLOn, uLMax: U.uLMax });
    const dk = DETK[kind];
    if (dk) dk.forEach((n, i) => { sh.uniforms['uD' + i] = DET[n].d; sh.uniforms['uN' + i] = DET[n].n; });
    if (kind === 'terrain') Object.assign(sh.uniforms, { uCliffW: CLIFF.w, uCliffE: CLIFF.e, uCliffOn: CLIFF.on, uMasonry: CLIFF.mason, uSplit: WL.uSplit });
    if (kind === 'water') Object.assign(sh.uniforms, { uSkyT: skyU.top, uSkyM: skyU.mid, uSkyB: skyU.bot, uSunCol: skyU.sunCol, uGlow: skyU.glow, uNight: skyU.night });   // 大海的倒影用當下的天色
    if (kind === 'water') Object.assign(sh.uniforms, WL);   // 第二階段：讀得到底下的場景
    let f = FTOP + LG_TOP + NOISE + (dk ? TRI : '') + (kind === 'terrain' ? '#ifdef TA_SURFACE\nvarying vec4 vSurface;\n#endif\nuniform sampler2D uCliffW; uniform sampler2D uCliffE; uniform float uCliffOn; uniform float uMasonry; uniform float uSplit;\n' : '') + (kind === 'water' ? 'varying float vPond;\nuniform vec3 uSkyT; uniform vec3 uSkyM; uniform vec3 uSkyB; uniform vec3 uSunCol; uniform float uGlow; uniform float uNight;\n#ifdef TA_SEA\nvarying float vSeaDepth;\n#endif\n' : '') + sh.fragmentShader;
    if (kind === 'terrain') f = f.replace('void main() {', 'float tGlint = 0.0;\nvoid main() {');   // 沙灘的閃光（顏色階段算、打光後加）
    if (kind === 'water') f = f.replace('void main() {', '#define TA_CREEK (vWP.y > 0.8 && vPond <= 0.0)\n' + LATE_W + 'void main() {');   // v7.4：高地泉（水面 2.75）以前也被當成高處的小溪，整片光網和一圈白沫
    if (dk) {
      // gDetN：細節法線在世界空間的擾動（顏色階段算好，法線階段加上）
      f = f.replace('#include <map_fragment>', '#include <map_fragment>\n  vec3 gDetN = vec3(0.0); vec3 gB = triW(normalize(vWN));');
      f = f.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n  normal = normalize(normal + (viewMatrix * vec4(gDetN, 0.0)).xyz);');
    }
    if (kind === 'water') f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { // 水面的細波紋：兩組交錯、會移動的波，反光與天空倒影碎成一片片的小面（小溪很淺，波紋小）
    float wa = vWP.y > 0.8 || vPond > 0.0 ? 0.22 : 0.6;   // 小溪、池塘：細波小
    vec2 q = vWP.xz;
    vec2 sl = vec2(cos(q.x * 3.0 + q.y * 1.3 + uTime * 0.7), cos(q.y * 3.0 - q.x * 0.9 + uTime * 0.6)) * 0.10
            + vec2(cos(q.y * 5.0 + q.x * 2.1 - uTime * 1.0), cos(q.x * 5.0 - q.y * 1.7 - uTime * 0.9)) * 0.07;
    normal = normalize(normal + (viewMatrix * vec4(sl.x * wa, 0.0, sl.y * wa, 0.0)).xyz);
  }`);
    if (kind === 'flower') f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      #ifdef TA_BLOOM
        normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);   // 草叢裡的小花：花瓣正反面都像地面一樣朝天受光（不會背面整片發黑）
      #endif`);
    if (kind === 'grass') f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 grassUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        normal = normalize(mix(normal, grassUp, gl_FrontFacing ? 0.12 : 0.8)); }`);   // 草卡背面的法線也向天，避免黑色三角根；保留實際投影陰影
    if (kind === 'sway' || kind === 'pine' || kind === 'sakura') f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  #ifdef TA_MODEL
    // 樹冠模型：葉片是一片片朝向各異的薄面，背光的那面會整片黑掉；法線往天空方向混合，整個樹冠像一團有體積的葉子均勻受光
    normal = normalize(mix(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), 0.55));
  #endif`);
    if (kind !== 'grass' && kind !== 'flower' && kind !== 'water') f = f.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + OCC_F);   // 水面不鏤空：discard 會關掉提早深度測試，藏在地形底下的整片海面都要算倒影
    if (kind === 'terrain') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 wn = normalize(vWN), bc = diffuseColor.rgb;
        float up = smoothstep(0.55, 0.85, wn.y);
        float green = smoothstep(0.03, 0.12, bc.g - max(bc.r, bc.b));
        float sandy = (1.0 - green) * smoothstep(0.55, 0.7, bc.r) * step(bc.b, bc.g);
        float masonK = uMasonry * smoothstep(1.06, 1.24, vWP.y) * (1.0 - sandy) * (1.0 - green), bed = 0.0, relief = 0.0;
        #ifdef TA_SURFACE
          green = vSurface.x; sandy = vSurface.y; masonK = clamp(vSurface.z, 0.0, 1.0); bed = vSurface.w;
          relief = step(1.5, vSurface.z);
        #endif
        vec2 p = vWP.xz;
        // 1.5–3m 色塊先於草葉細紋；高頻亮度差低於 8%。
        float wash = n_v(p * 0.45 + 7.0), stroke = n_v(vec2(p.x * 4.0, p.y * 1.7));
        vec3 g = habTint(bc * (0.76 + wash * 0.05 + (stroke - 0.5) * 0.02), p);
        vec3 sd = bc * (0.985 + n_v(p * 2.5) * 0.03);
        { // v7.7 夢幻風：粉珍珠色的大色塊、順著風的淡淡沙紋，近處陽光下有零星的細閃光
          float rip = sin(dot(p, vec2(0.8, 0.6)) * 7.0 + n_v(p * 0.7) * 5.0) * 0.5 + 0.5;
          sd *= (0.965 + smoothstep(0.2, 1.0, rip) * 0.07) * mix(vec3(1.0), vec3(1.04, 0.98, 0.99), smoothstep(0.35, 0.7, n_v(p * 0.3 + 2.0)));
          tGlint = step(0.992, n_h(floor(p * 40.0))) * clamp(1.0 - length(fwidth(p)) * 30.0, 0.0, 1.0); }
        // 材質濕邊依低頻位置改變寬度；不動沙面、水面或任何高度查詢。
        float wetEdge = 0.22 + (n_v(p * 0.42 + 3.0) - 0.5) * 0.24;
        float wet = 1.0 - smoothstep(wetEdge - 0.12, wetEdge + 0.24, vWP.y);
        sd *= mix(vec3(1.0), vec3(0.86, 0.90, 0.96), wet * 0.55);
        float band = sin(vWP.y * 5.0 + n_v(p * 0.45) * 1.1);
        vec3 cl = bc * mix(vec3(0.965, 0.955, 1.03), vec3(1.035, 1.0, 0.95), band * 0.5 + 0.5);   // v7.7 夢幻風：岩層是暖杏與薰衣草交替（以前只有明暗）
        if (masonK > 0.0) {
          float hc = abs(wn.x) > abs(wn.z) ? vWP.z : vWP.x, row = floor(vWP.y / 0.38);
          vec2 bp = vec2(hc / 0.76 + mod(row, 2.0) * 0.5, vWP.y / 0.38), fb = fract(bp);
          float mortar = smoothstep(0.0, 0.026, fb.x) * (1.0 - smoothstep(0.974, 1.0, fb.x)) * smoothstep(0.0, 0.04, fb.y) * (1.0 - smoothstep(0.96, 1.0, fb.y));
          mortar = mix(mortar, 1.0, relief);
          float tone = n_h(floor(bp) + 0.37), hue = n_h(floor(bp) + 4.1);
          // v7.7 夢幻風：奶油、腮紅粉、薰衣草灰、鼠尾草奶油四種粉彩石塊（以前米色加一點灰紫）；每塊像枕頭微微鼓起——上緣受光、下緣與兩側暗一點
          vec3 st = hue < 0.5 ? vec3(0.85, 0.79, 0.69) : hue < 0.7 ? vec3(0.87, 0.77, 0.74) : hue < 0.88 ? vec3(0.78, 0.76, 0.84) : vec3(0.81, 0.81, 0.71);
          float pil = mix(0.86, 1.04, smoothstep(0.0, 0.75, fb.y)) * mix(0.92, 1.0, smoothstep(0.0, 0.12, min(fb.x, 1.0 - fb.x))) + smoothstep(0.8, 0.95, fb.y) * 0.06;
          st *= (0.94 + tone * 0.1) * mix(pil, 1.0, relief);
          st *= mix(vec3(0.97, 0.96, 1.03), vec3(1.03, 1.01, 0.96), n_v(vec2(hc * 2.3, vWP.y * 1.1) + floor(bp) * 3.7));   // 每塊石頭裡也有一點暖冷的暈染
          st = mix(vec3(0.66, 0.62, 0.71), st, mix(0.18, 1.0, mortar));
          float moss = (1.0 - mortar) * smoothstep(0.72, 0.88, n_v(vec2(hc * 1.2, vWP.y * 2.0) + 4.0));
          st = mix(st, vec3(0.55, 0.62, 0.5), moss * 0.3);
          // 藍紫飾板每約 3m 留一小段，兩側留白；壓頂／凸石不畫飾帶。
          float plaque = (1.0 - smoothstep(0.25, 0.46, abs(fract(hc / 3.1) - 0.5))) * (1.0 - relief);
          float my = mod(vWP.y, 2.0), ribbon = smoothstep(0.66, 0.68, my) * (1.0 - smoothstep(0.80, 0.82, my));
          st = mix(st, vec3(0.32, 0.33, 0.44), ribbon * plaque * 0.64);
          cl = mix(cl, st, masonK);
        }
        tGlint *= sandy * (1.0 - green) * (1.0 - wet) * up;
        vec3 top = mix(mix(bc, sd, sandy), g, green);
        float side = (1.0 - up) * (1.0 - green) * (1.0 - sandy) * (1.0 - bed);
        diffuseColor.rgb = mix(top, cl, max(side, masonK));
        // 只留低權重程式微表面；砌石和原岩的結構不再共用照片裂紋。
        float wR = max(side, masonK), wG = green * (1.0 - wR), wS = max(0.0, 1.0 - wG - wR);
        vec3 q = vWP * 0.5, det = triD(uD0, q, gB) * wG + triD(uD1, q, gB) * wS + triD(uD2, q, gB) * wR;
        diffuseColor.rgb *= mix(vec3(1.0), det * 2.0, 0.35);
        gDetN = (triN(uN0, q, gB) * wG + triN(uN1, q, gB) * wS + triN(uN2, q, gB) * wR) * 0.1;
        // 焦散放在水底，窄而斷續；水面不再疊一層明亮的網。
        float uw = max(bed, smoothstep(0.32, 0.12, vWP.y) * up);
        if (uw > 0.0) {
          vec2 cp = p * 1.15 + vec2(n_v(p * 0.7 + uTime * 0.13), n_v(p * 0.7 + 5.0 - uTime * 0.11)) * 0.9;
          float c1 = n_cell(cp + vec2(uTime * 0.09, uTime * 0.05)), c2 = n_cell(cp * 1.37 + 3.1 - vec2(uTime * 0.06, -uTime * 0.08));
          float caus = smoothstep(0.58, 0.72, c1) * smoothstep(0.58, 0.72, c2);
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.88, 0.97, 1.0), uw * 0.3 * (1.0 - uSplit));
          diffuseColor.rgb += vec3(0.70, 0.77, 0.84) * caus * uw * (0.025 + 0.11 * uShade);
        }
      }
      { float cS = smoothstep(0.5, 0.68, n_f(vWP.xz * 0.028 + vec2(uTime * 0.011, uTime * 0.004))); diffuseColor.rgb *= 1.0 - cS * 0.26 * uShade; }
`);
    if (kind === 'sway' || kind === 'pine' || kind === 'sakura') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      #if !defined(TA_MODEL) && !defined(TA_LEAFTEX)
      {
        // 樹葉鱗片：物件座標的細胞雜訊，做出一片片疊起來的葉團
        vec3 q = vOP * 5.2; vec2 uvL = vec2(q.x + q.z * 0.6, q.y * 1.3 - q.z * 0.4);
        float c = n_cell(uvL), c2 = n_cell(uvL * 1.9 + 3.0);
        float shade = smoothstep(0.95, 0.15, c) * 0.55 + smoothstep(0.9, 0.2, c2) * 0.2;
        diffuseColor.rgb *= 0.78 + shade * 0.42;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.08, 0.7), smoothstep(0.6, 0.9, n_v(uvL * 0.7)) * 0.35);
        vec3 on = normalize(vOP + 1e-4);
        #ifdef TA_MERGED
          on = normalize(vWN);   // 合併後的物件座標是整棟建築的：葉團的上亮下暗改用法線
        #endif
        diffuseColor.rgb *= mix(0.64, 1.1, smoothstep(-0.75, 0.95, on.y));   // 葉團的體積感：底部陰暗、頂部明亮
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.16, 1.12, 0.72), smoothstep(0.5, 1.0, on.y) * 0.32);   // 頂端受光偏黃綠
        vec3 qd = vWP * 0.62; diffuseColor.rgb *= mix(vec3(1.0), (triD(uD0, qd, gB) - 0.5) * 2.0 + 1.0, 0.25);   // 一片片重疊的葉子
        gDetN = triN(uN0, qd, gB) * 0.12;
      }
      #endif   // Tripo 模型的貼圖本身已有葉片明暗，不再疊程式的葉團花紋（TA_MODEL 由 actors.js 的 loadModel 設定）
`);
    if (kind === 'wall') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      {
        // 木板牆：橫向雨淋板，每片板子亮度略不同，板子下緣有陰影線；牆腳有一點髒污
        vec3 wn = normalize(vWN); float vert = 1.0 - smoothstep(0.4, 0.7, abs(wn.y));
        float v = vWP.y * 5.2, row = floor(v), fv = fract(v);
        float board = 0.94 + n_h(vec2(row, floor((vWP.x + vWP.z) * 0.5))) * 0.1;
        float lip = smoothstep(0.0, 0.12, fv) * (1.0 - smoothstep(0.88, 1.0, fv) * 0.5);
        float grain = 0.97 + n_v(vec2((vWP.x + vWP.z) * 9.0, v * 0.5)) * 0.06;
        float dk = smoothstep(0.55, 0.0, vOP.y + 0.95);
        #ifdef TA_MERGED
          dk = smoothstep(0.85, 0.3, vOP.y);   // 合併後的物件座標以建築的地面為原點：牆腳一段
        #endif
        vec3 dirt = mix(vec3(1.0), vec3(0.9, 0.88, 0.97), dk);   // v7.7 夢幻風：牆腳是薰衣草色的陰影，不是灰色髒污
        diffuseColor.rgb *= dirt * vec3(1.06, 1.0, 0.9) * mix(1.0, board * grain * (0.89 + lip * 0.11), vert);   // 木板帶一點暖色；每片板子明暗不同、板縫一條細細的陰影（以前算了沒用上）
        vec3 q = vWP * 0.62; diffuseColor.rgb *= mix(vec3(1.0), triD(uD0, q, gB) * 2.0, 0.3);
        gDetN = triN(uN0, q, gB) * 0.12;
      }`);
    if (kind === 'roof') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      {
        // 屋瓦：交錯排列的魚鱗瓦，下緣圓弧有陰影，每片顏色略有深淺
        float u = (vWP.x - vWP.z) * 2.2, v = vWP.y * 3.6, row = floor(v);
        u += mod(row, 2.0) * 0.5 + (n_h(vec2(row, 1.7)) - 0.5) * 0.3; float col = floor(u);   // v7.5：每排錯開的量略有不同，瓦縫不會對成一條條斜線
        vec2 q = vec2(fract(u) - 0.5, fract(v));
        float scal = smoothstep(0.0, 0.18, q.y - (0.25 - q.x * q.x) * 0.6);
        float th = n_h(vec2(col, row)), tile = (th < 0.65 ? 1.0 : th < 0.9 ? 1.1 : 0.84) * (0.95 + n_h(vec2(col + 5.3, row)) * 0.1);   // v7.5（Codex 第二輪 C1）：三組瓦色——基本色 65%、略亮 25%、略暗 10%，再各自 ±5%
        float edge = smoothstep(0.5, 0.42, abs(q.x));
        diffuseColor.rgb *= tile * (0.74 + scal * 0.26) * (0.89 + edge * 0.11) * (1.0 + smoothstep(0.75, 0.95, q.y) * 0.08);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(1.05, 0.98, 0.92), n_h(vec2(col * 1.3, row + 7.0)));   // 每片瓦的色相略有冷暖
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), diffuseColor.rgb, 0.8);   // v6.93：屋瓦少兩成飽和（電光藍、洋紅的瓦退成柔和的石板藍、玫瑰陶土）
        vec3 qd = vWP * 0.9; diffuseColor.rgb *= mix(vec3(1.0), triD(uD0, qd, gB) * 2.0, 0.4);   // 瓦面的細小斑駁
        gDetN = triN(uN0, qd, gB) * 0.10;
        // 搭接的厚度：每一排瓦往下斜、下緣翹起，壓在下一排上面——法線依排內位置往外或往上偏，看得出一層層的瓦
        { vec3 wn = normalize(vWN), dn = normalize(vec3(wn.x, 0.0, wn.z) + 1e-4);
          float tilt = mix(0.12, -0.32, smoothstep(0.0, 0.12, q.y)) * smoothstep(0.2, 0.5, length(wn.xz));
          gDetN += (dn * tilt + vec3(0.0, -0.1, 0.0) * tilt) * 0.6;
          diffuseColor.rgb *= 1.0 + smoothstep(0.18, 0.08, q.y) * smoothstep(0.0, 0.05, q.y) * 0.12 * n_h(vec2(col + 9.0, row)); }   // 瓦片下緣受光的一條亮邊（v7.5：每片強弱不同，不是每片都鑲一條一樣的亮框）
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.16 + 0.015, step(0.935, n_h(vec2(col + 3.1, row - 2.0))) * smoothstep(0.3, 0.48, abs(q.x)) * smoothstep(0.4, 0.1, q.y));   // 約 6% 的瓦，下緣角落有一點磨損（較淺）
      }`);
    if (kind === 'stone') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      { // 形體與倒角交給模型，石柱／花台不再被同一張裂紋切碎。
        // v7.7 夢幻風：水彩色塊（taDream）上再疊 30–50 公分的柔和明暗，零星幾群淡色的地衣斑（鼠尾草綠、腮紅粉），朝上的面被陽光曬得淡一點
        vec3 wn = normalize(vWN); vec2 sp = vWP.xz + vWP.y * vec2(0.71, -0.53);
        float aa = clamp(1.0 - length(fwidth(sp)) * 5.0, 0.0, 1.0);
        diffuseColor.rgb *= 0.92 + n_f(sp * 2.1 + 4.0) * 0.16;
        float br = n_v(vec2(sp.x * 1.4, sp.y * 5.0) + 3.0) * 0.6 + n_v(vec2(sp.x * 3.1, sp.y * 11.0) + 8.0) * 0.4 * aa;   // 一筆一筆的手繪筆觸
        diffuseColor.rgb *= mix(vec3(0.95, 0.94, 1.0), vec3(1.04, 1.02, 0.97), smoothstep(0.25, 0.75, br));
        float lk = smoothstep(0.3, 0.14, n_cell(sp * 1.9 + 9.0)) * smoothstep(0.46, 0.62, n_v(sp * 0.55 + 7.0)) * step(-0.3, wn.y) * aa;
        vec3 lt = mix(vec3(0.86, 0.97, 0.9), vec3(1.05, 0.9, 0.95), step(0.5, n_v(sp * 0.8 + 2.0)));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * lt, lk * 0.7);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.04, 1.03, 1.0) + 0.012, smoothstep(0.6, 0.95, wn.y) * 0.5);
        #ifdef TA_NATURE
          { float sb = sin(vWP.y * 13.0 + n_v(vWP.xz * 1.3) * 3.5) * 0.5 + 0.5;   // 圓岩與海岸礁石：一層層柔和的岩層，暖杏與薰衣草交替
            diffuseColor.rgb *= mix(vec3(0.92, 0.91, 1.04), vec3(1.06, 1.02, 0.94), smoothstep(0.2, 0.8, sb)); }
        #endif
        gDetN = triN(uN0, vWP * 0.45, gB) * 0.10;
      }`);
    if (kind === 'plaster') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      { // v7.6 夢幻風住宅的灰泥牆：大片柔和的冷暖斑駁（±2–3%）與很淡的細顆粒，不畫石塊（'stone' 會把奶油灰泥畫成灰色石塊）
        // v7.7：參考圖的灰泥看得到手抹的質感——20–50 公分一塊塊柔和的抹痕（亮的偏暖、暗的偏薰衣草）、細細的灰泥顆粒；顆粒隨距離淡掉
        vec2 sp = vWP.xz + vWP.y * vec2(0.71, -0.53);
        float aa = clamp(1.0 - length(fwidth(sp)) * 22.0, 0.0, 1.0);
        float pn = n_f(sp * 0.55), tr = n_f(sp * 2.6 + 5.0), fine = n_v(sp * 16.0) * 0.6 + n_v(sp * 37.0 + 3.0) * 0.4;
        diffuseColor.rgb *= mix(vec3(1.025, 1.01, 0.965), vec3(1.045, 1.025, 0.975), pn);
        diffuseColor.rgb *= mix(vec3(0.95, 0.945, 0.99), vec3(1.035, 1.02, 0.99), smoothstep(0.3, 0.7, tr));
        diffuseColor.rgb *= 1.0 + (fine - 0.5) * 0.07 * aa;
      }`);
    if (kind === 'bark') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      { vec2 p = vec2(vOP.x + vOP.z * 0.6, vOP.y);
        float grain = sin(p.x * 11.0 + n_v(p * 0.8) * 1.5);
        diffuseColor.rgb *= 0.98 + grain * 0.02;
        gDetN = triN(uN0, vWP * vec3(0.9, 0.25, 0.9), gB) * 0.12;
      }`);
    if (MATK.includes(kind)) f = f.replace('#include <color_fragment>', `#include <color_fragment>
      { // v7.6 室內與家具的材質細節（全用世界座標：合併成整棟的網格也能用）；高頻紋理隨距離淡掉，遠看不閃
        vec3 wn = normalize(vWN); float lev = step(0.7, abs(wn.y));
        vec2 fp = lev > 0.5 ? vWP.xz : abs(wn.x) > abs(wn.z) ? vWP.zy : vWP.xy;   // 這個面上的 2D 座標
        float aa = clamp(1.0 - length(fwidth(fp)) * 70.0, 0.0, 1.0);
        ${kind === 'wood' ? `// 木頭：沿木紋的細長纖維＋淡淡的年輪，每塊板子（約 30 cm × 1.6 m）明暗略不同；立面木紋直向、水平面順著 x
        float a = mix(vWP.y, vWP.x, lev), b = mix(abs(wn.x) > abs(wn.z) ? vWP.z : vWP.x, vWP.z, lev);
        float fib = n_v(vec2(b * 30.0, a * 1.5)) * 0.65 + n_v(vec2(b * 85.0, a * 2.6)) * 0.35 * aa;
        float ring = sin((b + n_v(vec2(b * 1.8, a * 0.3)) * 0.4) * 42.0) * 0.5 + 0.5;
        float plank = n_h(floor(vec2(b * 3.2, a * 0.6 + n_h(vec2(floor(b * 3.2), 3.7)))));
        float gu = b * 7.0 + n_v(vec2(b * 1.5, a * 0.45)) * 1.1, gl = abs(fract(gu) - 0.5) * 2.0;   // 手繪感的深色木紋線：一公尺約七條，順著木紋微微彎
        float line = smoothstep(0.16, 0.0, gl) * clamp(1.0 - fwidth(gu) * 4.0, 0.0, 1.0);
        diffuseColor.rgb *= (0.88 + fib * 0.16 + ring * 0.06 * aa + (plank - 0.5) * 0.1) * (1.0 - line * 0.13) * mix(vec3(1.0), vec3(1.04, 1.0, 0.93), ring * 0.6);
        gDetN = (lev > 0.5 ? vec3(0.0, 0.0, 1.0) : abs(wn.x) > abs(wn.z) ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)) * ((fib - 0.5) * 0.08 * aa - line * 0.05);` : ''}
        ${kind === 'fabric' ? `// 布料：一塊塊的染色深淺＋織紋（約 2 cm 一格）
        float dye = n_f(fp * 1.7), weave = sin(fp.x * 310.0) * sin(fp.y * 310.0) * 0.5 + 0.5;
        float wa = clamp(1.0 - length(fwidth(fp)) * 40.0, 0.0, 1.0);
        diffuseColor.rgb *= (0.93 + dye * 0.13) * (1.0 + (weave - 0.5) * 0.11 * wa);` : ''}
        ${kind === 'ceramic' ? `// 陶瓷：上釉的柔和斑駁
        diffuseColor.rgb *= 0.975 + n_f(fp * 3.2 + vWP.y) * 0.05;` : ''}
        ${kind === 'metal' ? `// 金屬（黃銅、銅、鐵）：細細的拉絲與一點氧化的斑
        diffuseColor.rgb *= (0.97 + n_v(vec2(fp.x * 3.0, fp.y * 140.0)) * 0.05 * aa) * mix(vec3(1.0), vec3(0.91, 0.98, 0.97), smoothstep(0.62, 0.85, n_f(fp * 2.4)) * 0.6);` : ''}   // v7.7：氧化斑是淡淡的青綠銅鏽色（以前是灰暗的斑）
        ${kind === 'foliage' ? `// 室內盆栽的葉子：一片片深淺不同、頂面受光偏黃綠
        float lc = n_cell(vec2(vWP.x + vWP.z * 0.7, vWP.y * 1.3) * 9.0);
        diffuseColor.rgb *= (0.86 + lc * 0.2) * mix(0.84, 1.08, wn.y * 0.5 + 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.08, 0.8), smoothstep(0.3, 0.9, wn.y) * 0.3);` : ''}
        ${kind === 'paper' ? `// 紙：很淡的纖維
        diffuseColor.rgb *= 0.975 + n_v(fp * 60.0) * 0.035 * aa + n_v(fp * 4.0) * 0.02;` : ''}
      }`);
    const DREAM = { plain: 0.8, stone: 1.2, plaster: 1.0, wall: 0.8, roof: 0.6, wood: 0.7, metal: 0.45, ceramic: 0.55, paper: 0.45, fabric: 0.6, bark: 0.6 }[kind];   // v7.7 夢幻風：水彩暈染的強度
    if (DREAM) f = f.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb = taDream(diffuseColor.rgb, vWP, normalize(vWN), ${DREAM.toFixed(2)});`);
    if (kind === 'water') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 wAlb = diffuseColor.rgb;   // 第二階段：水體散射的顏色（頂點色、隨時間變的海色）
      {
        // 水面：緩慢流動的亮線（水光）與細碎的閃光
        vec2 p = vWP.xz; float t = uTime;
        #ifdef USE_COLOR_ALPHA
          float l1 = smoothstep(0.042, 0.0, abs(n_v(p * 0.9 + vec2(t * 0.12, t * 0.05)) - 0.5));
          float l2 = smoothstep(0.030, 0.0, abs(n_v(p * 1.8 - vec2(t * 0.08, -t * 0.1) + 3.0) - 0.5));
        #else
          // 大海：亮線細一點、淡一點，而且一段一段的（原本一圈圈很大的白線像畫在海面上的等高線）
          float gap = smoothstep(0.35, 0.65, n_v(p * 0.35 + vec2(t * 0.025, 0.0)));
          float l1 = smoothstep(0.024, 0.0, abs(n_v(p * 1.6 + vec2(t * 0.12, t * 0.05)) - 0.5)) * gap * 0.55;
          float l2 = smoothstep(0.017, 0.0, abs(n_v(p * 2.8 - vec2(t * 0.08, -t * 0.1) + 3.0) - 0.5)) * gap * 0.55;
        #endif
        float sp = smoothstep(0.955, 1.0, n_v(p * 6.0 + vec2(t * 0.6, -t * 0.4))) + smoothstep(0.97, 1.0, n_v(p * 13.0 - vec2(t * 0.9, t * 0.5) + 7.0)) * 0.8;   // 陽光在水面上一閃一閃的細碎亮點
        float solarK = 0.2 + 0.8 * uShade; sp *= solarK;   // 水面的陽光閃點、亮線與焦散跟著日照：晚上淡到兩成，不和燈光搶
        diffuseColor.rgb += vec3(0.15, 0.18, 0.22) * (l1 * 0.6 + l2 * 0.4) * solarK + vec3(0.57) * sp;
        float gNet = 0.0;
        #ifdef USE_COLOR_ALPHA
        { // 河與小溪：淺水上一張晃動的光網（水面把陽光折成一條條亮線），比大海明顯
          vec2 wp = p * (TA_CREEK ? 3.4 : 2.2) + vec2(n_v(p * 1.3 + t * 0.2), n_v(p * 1.3 + 4.0 - t * 0.17)) * 1.4;   // 小溪的光網細一點
          float c1 = n_cell(wp + vec2(t * 0.3, t * 0.1)), c2 = n_cell(wp * 1.6 - vec2(t * 0.2, -t * 0.25) + 2.0);
          float net = smoothstep(0.66, 0.76, max(c1, c2)) * 0.55 + smoothstep(0.78, 0.9, c1 * c2 * 1.6) * 0.6;   // 細細的亮線
          if (TA_CREEK) net *= 0.3;   // 溪底承擔焦散，水面只留零星柔光
          net *= solarK;
          diffuseColor.rgb += vec3(0.75, 0.95, 0.9) * net * (TA_CREEK ? 0.32 : vPond > 0.0 ? 0.06 : 0.20);   // 池塘幾乎沒有光網（水深、靜）
          gNet = net;
        }
        #endif
        #ifdef USE_COLOR_ALPHA
        { // 河岸：頂點 alpha 是離岸多近；岸邊比較透明，並有一圈隨水流晃動的白沫
          float edge = vColor.a, fo = smoothstep(0.55, 0.95, edge + (n_v(p * 2.6 + vec2(t * 0.5, -t * 0.32)) - 0.5) * 0.55);
          diffuseColor.a = opacity * mix(1.0, TA_CREEK ? 0.45 : 0.62, edge) * (TA_CREEK ? 1.5 : 1.0);   // 小溪（水面 0.9）：青綠色明顯一點，光網與水底的焦散仍看得到
          if (TA_CREEK) diffuseColor.a = max(diffuseColor.a, gNet * 0.12);   // 小溪的光網亮線不透明，像一條條浮在水面上的光
          float foK = TA_CREEK ? smoothstep(0.35, 0.65, n_v(p * 0.8 + t * 0.05)) * 0.6 + 0.15 : vPond > 0.0 ? 0.12 : 1.0;   // 池塘的岸邊只有零星一點白沫   // 小溪岸邊的白沫斷斷續續，不是一整圈白線
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), fo * 0.48 * foK); diffuseColor.a = max(diffuseColor.a, fo * 0.54 * foK);
        }
        #endif
        float wf = pow(1.0 - clamp(normalize(cameraPosition - vWP).y, 0.0, 1.0), 2.5);
        float shallow = vWP.y > 0.8 ? 0.12 : 1.0;   // （池塘也算：高地泉斜看不反白）   // 小溪很淺：斜看也不會整片反白
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.78, 1.0), wf * 0.3 * shallow); diffuseColor.a = mix(diffuseColor.a, 1.0, wf * 0.35 * shallow);
      }
      if (uLate > 0.5) diffuseColor.rgb = vec3(1.0);   // 第二階段：打光只算水面收到多少光，顏色由 taLateWater 合成`);
    if (kind === 'flow') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      #ifdef USE_UV
      { // 流動的水片（水車的水槽、出水、瀑布；v7.0）：uv.x 橫跨水流、uv.y 沿著水流方向（0 → 1）。
        // 兩層往下游捲動的長條水紋、尾端與落點的白沫，透明度跟著水紋起伏——水片有厚有薄，不是一條均勻的青色帶子
        vec2 fu = vUv; float t = uTime;
        float s1 = n_v(vec2(fu.x * 7.0, fu.y * 2.6 - t * 2.2)), s2 = n_v(vec2(fu.x * 19.0 + 3.1, fu.y * 6.0 - t * 3.4)), s3 = n_v(vec2(fu.x * 41.0 + 7.7, fu.y * 13.0 - t * 5.2));
        float streak = smoothstep(0.5, 0.92, s1 * 0.55 + s2 * 0.3 + s3 * 0.15);
        float foamEnd = smoothstep(0.78, 1.0, fu.y) * (0.55 + 0.45 * s2), edge = smoothstep(0.12, 0.0, min(fu.x, 1.0 - fu.x));
        diffuseColor.rgb = mix(diffuseColor.rgb * (0.85 + 0.3 * s1), vec3(0.9, 0.96, 1.0), clamp(streak * 0.5 + foamEnd * 0.85 + edge * 0.35, 0.0, 1.0));
        diffuseColor.a = clamp(diffuseColor.a * (0.7 + 0.45 * streak) + foamEnd * 0.5 + edge * 0.2, 0.0, 1.0);
        gDetN0 = vec2(s2 - 0.5, s1 - 0.5);
      }
      #endif`);
    if (kind === 'flow') f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = normalize(normal + vec3(gDetN0 * 0.35, 0.0));   // 水紋的起伏讓反光碎成一條條`).replace('#include <map_fragment>', '#include <map_fragment>\n  vec2 gDetN0 = vec2(0.0);');
    if (kind === 'glass') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      {
        // 窗玻璃：映出天空與對面的景色（上亮下暗），斜斜一道反光，靠近邊框的地方比較暗
        vec3 vd = normalize(cameraPosition - vWP), n = normalize(vWN), r = reflect(-vd, n);
        float sk = clamp(r.y * 0.9 + 0.45, 0.0, 1.0);
        vec3 refl = mix(vec3(0.34, 0.42, 0.36), vec3(0.72, 0.86, 1.0), sk);
        float fres = pow(1.0 - clamp(dot(vd, n), 0.0, 1.0), 2.0);
        float streak = smoothstep(0.12, 0.0, abs(fract((vWP.x + vWP.z) * 0.8 + vWP.y * 1.1) - 0.5)) * 0.5 + smoothstep(0.04, 0.0, abs(fract((vWP.x + vWP.z) * 0.8 + vWP.y * 1.1 + 0.18) - 0.5)) * 0.35;
        diffuseColor.rgb = mix(vec3(0.12, 0.17, 0.22), refl, 0.45 + fres * 0.4) + vec3(streak * 0.18);
      }`);
    if (/^(grass|flower|sway|pine|sakura)$/.test(kind)) f = f.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
      { // 葉片透光（v7.0）：逆著太陽看時，薄薄的葉子、草葉透出暖綠的光（只在對著太陽的方向明顯，背光的樹冠內部仍是冷暗部）
        float tsh = 1.0;
        #ifdef TA_CASC
          tsh = taSh;
        #endif
        float tv = saturate(dot(-geometryViewDir, directionalLights[0].direction));
        reflectedLight.directDiffuse += directionalLights[0].color * diffuseColor.rgb * (pow(tv, 5.0) * 0.8 + pow(tv, 1.6) * 0.1) * tsh * uTrans;
      }
      #endif`);
    if (kind === 'grass') f = f.replace('#include <color_fragment>', `#include <color_fragment>
      float grassL = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
      diffuseColor.rgb = mix(vec3(0.075, 0.2, 0.06), vec3(0.24, 0.43, 0.14), smoothstep(0.02, 0.45, grassL));   // 夢幻風參考圖的草是帶暖光的鮮黃綠（灰綠的草會讓整島像褪色）
      diffuseColor.rgb *= 0.97 + n_v(vWP.xz * 0.22) * 0.06;
      diffuseColor.rgb = habTint(diffuseColor.rgb, vWP.xz);   // 和底下的地面同一組生境色塊
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.14, 1.13, 0.96) + vec3(0.012, 0.016, 0.0), clamp(vGust, 0.0, 1.0) * 0.5);   // 陣風壓過去的草露出較亮的葉背
        { float cS = smoothstep(0.5, 0.68, n_f(vWP.xz * 0.028 + vec2(uTime * 0.011, uTime * 0.004))); diffuseColor.rgb *= 1.0 - cS * 0.26 * uShade; }   // 雲影慢慢掠過地面
`);
    f = f.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  float sGl = 0.0;\n' + seasonGLSL(kind) + REAL(kind));
    if (kind === 'terrain') f = f.replace('float sGl = 0.0;', 'float sGl = 0.0;\n  sGl = tGlint * (0.5 + 0.5 * sin(uTime * 2.1 + n_h(floor(vWP.xz * 40.0)) * 40.0)) * 0.7 * uShade;');   // 晴天才閃
    if (kind === 'roof') f = f.replace('float sGl = 0.0;', 'float sGl = 0.0;\n  { float rh = n_h(floor(vec2((vWP.x - vWP.z) * 2.2, vWP.y * 3.6))); roughnessFactor = rh < 0.9 ? 0.68 + rh * 0.13 : 0.6; }');   // 霧面釉的屋瓦：陽光下一片片柔和的反光（v6.93：不像上了亮光漆的塑膠）；v7.5：大多 0.68–0.8，一成是釉面 0.6
    const RGH = { wood: 'mix(0.66 + n_v(vWP.xz * 2.3 + vWP.y) * 0.1, 0.36 + n_v(vWP.xz * 1.7) * 0.12, uInside * step(0.7, normalize(vWN).y))', fabric: '1.0', ceramic: '0.3 + n_v(vWP.xz * 4.0 + vWP.y * 3.0) * 0.08', metal: 'roughnessFactor * (0.85 + n_v(vWP.xz * 6.0 + vWP.y * 5.0) * 0.3)', foliage: '0.78', paper: '0.95' }[kind];
    // v7.8：屋裡的木地板上了清漆（uInside），窗光與燈在地上映出柔和的反光；戶外的木板照舊
    if (RGH) f = f.replace('float sGl = 0.0;', `float sGl = 0.0;\n  roughnessFactor = ${RGH};`);   // 上釉的陶瓷有柔和的高光、木頭半霧面、布料完全霧面
    if (kind === 'fabric') f = f.replace('#include <opaque_fragment>', `{ float sh = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0); outgoingLight *= 1.0 + sh * sh * 0.22; }   // 布料的絨面：邊緣斜看時亮一點
        #include <opaque_fragment>`);
    if (kind === 'water') f = f.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n  if (vWP.y > 0.8) reflectedLight.indirectSpecular *= 0.3;');   // 小溪：天空倒影淡一點，低角度看也是清透的青綠色、看得到溪底（不會整片泛白）
    f = f.replace('#include <opaque_fragment>', `
        outgoingLight += vec3(sGl) * 0.6;   // 雪面閃光${kind === 'water' ? '\n        vec3 wN = normal, wSkyR = vec3(-1.0), wSpec = vec3(0.0);' + SEA_GLSL + `
        { float lw = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b); outgoingLight *= lw > 1.0 ? (1.0 + (lw - 1.0) * 0.25) / lw : 1.0; }
        #ifdef TA_SEA
        outgoingLight += seaSpec;   // 大海的反光帶在亮度壓縮之後才加
        #endif   // 水面反射的太陽太亮會被泛光放大成一大團：亮度超過 1 的部分壓縮` : ''}
        vec3 toCam = normalize(vViewPosition);
        float fres = pow(1.0 - clamp(dot(normal, toCam), 0.0, 1.0), 3.0);
        float back = clamp(dot(uSunV, -toCam) * 0.5 + 0.5, 0.0, 1.0);
        outgoingLight += uRimCol * fres * back * back * uRim * diffuseColor.rgb;
        outgoingLight += vec3(0.55, 0.74, 1.0) * fres * min(uRim * 1.0, 0.1) * diffuseColor.rgb;${kind === 'water' ? `
        if (uLate > 0.5) {
          vec3 wUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), wIrr = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
          if (wSkyR.x < 0.0) wSkyR = taSkyA(reflect(-normalize(vViewPosition), wN), wUp) * 0.95;
          #ifdef TA_SEA
            float wCalm = 0.0; vec3 wS = seaSpec, wAbs = uAbsSea, wA = mix(wAlb * 0.3, vec3(0.16, 0.24, 0.32), 0.5);   // 淺灘淡藍、深處灰藍；保留透過水面的砂底
          #else
            float wCalm = vWP.y > 0.8 ? 1.0 : 0.5; vec3 wS = reflectedLight.directSpecular * 0.6, wAbs = uAbs, wA = mix(uScat, wAlb * 0.3, 0.2);   // 河與小溪：偏青綠，越深越暗
            if (vPond > 0.0) {   // v7.4 池塘：很靜（白沫只剩一成），池心當成更深的水——吸收多、散射回深青綠 #3D7778；岸邊淺、看得到砂底
              float pk = smoothstep(0.12, 1.0, vPond);
              wCalm = 1.8; wAbs = uAbs * (1.0 + pk * 2.2); wA = mix(wA, vec3(0.047, 0.184, 0.188) * 0.42, pk);
            }
          #endif
          #ifdef TA_SEA
            outgoingLight = taLateWater(wN, wIrr, wSkyR, wS, wA, wCalm, wAbs, 1.0, smoothstep(160.0, 138.0, max(abs(vWP.x), abs(vWP.z))));
          #else
            outgoingLight = taLateWater(wN, wIrr, wSkyR, wS, wA, wCalm, wAbs, 0.0, 1.0);
          #endif
          diffuseColor.a = 1.0;
        }` : ''}
        #include <opaque_fragment>`);
    f = f.replace('#include <lights_fragment_begin>', '#include <lights_fragment_begin>' + (/^(grass|flower|sway|pine|sakura)$/.test(kind) ? '\n#define TA_LGFEW' : '') + LG_GLSL);   // 燈光格子：這一格的燈都照
    sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => 'bend3-' + kind; mat.userData.kind = kind;
  if (kind === 'flow') mat.defines = Object.assign({}, mat.defines, { USE_UV: '' });   // 水片沿 uv 流動（沒有貼圖也要有 vUv）
  if ((kind === 'water' || kind === 'glass') && mat.isMeshStandardMaterial) { ENV_MATS.push(mat); applyEnv(mat); mat.addEventListener('dispose', () => { const i = ENV_MATS.indexOf(mat); if (i >= 0) ENV_MATS.splice(i, 1); }); }   // 水面、玻璃映出天空
  return mat;
}
/* 四季著色：秋天綠葉轉成黃橙紅、草地轉成金綠；冬天朝上的面積雪（地形只有草地積雪，沙灘與步道保留），雪面有細碎閃光 */
function seasonGLSL(kind) {
  if (kind === 'water' || kind === 'char' || kind === 'flower' || kind === 'grass') return kind === 'grass' ? `{
      vec3 bc = diffuseColor.rgb;
      float l0 = dot(bc, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(bc, vec3(l0 * 1.2, l0 * 1.17, l0 * 0.78), uFall * mix(0.3, 0.52, smoothstep(0.25, 0.75, n_f(vWP.xz * 0.1))));   // 一大片一大片橄欖綠與金黃交錯；秋天：柔和的鼠尾草金（v7.6 夢幻風：以前 1.32／1.2／0.56 偏金黃）
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 1.08, 0.9), uBloom * 0.4);
      diffuseColor.rgb *= vec3(0.99, 1.03, 0.95);   // v7.6 夢幻風：鮮一點的嫩綠，粉白的花襯在上面才跳得出來
    }` : '';
  const cover = kind === 'terrain' ? 'smoothstep(0.5, 0.75, up) * clamp(leafy * 1.5, 0.0, 1.0) * smoothstep(0.0, 0.12, n - (0.42 - (dep + 0.1) * 1.4)) * smoothstep(0.55, 0.75, vWP.y)'   // 河床、海床不積雪
    : kind === 'sway' || kind === 'pine' || kind === 'sakura' ? 'smoothstep(-0.05, 0.45, up)'
    : kind === 'wall' ? 'smoothstep(0.62, 0.85, up)'
    : kind === 'stone' ? 'smoothstep(0.5, 0.78, up) * smoothstep(0.25, 0.6, n + 0.15)'
    : 'smoothstep(0.42, 0.72, up)';
  const fall = kind === 'sway' || kind === 'sakura' ? `
      if (uFall > 0.0) {
        float s = vSeed;
        vec3 ac = s < 0.35 ? vec3(1.0, 0.62, 0.32) : s < 0.6 ? vec3(0.95, 0.75, 0.3) : s < 0.8 ? vec3(0.92, 0.45, 0.4) : vec3(0.85, 0.7, 0.36);   // v7.6 夢幻風：粉杏、柔金、珊瑚、淡黃褐（以前是飽和的金黃橘）
        float lum = dot(bc, vec3(0.3, 0.59, 0.11)) / 0.28;
        float sunny = 0.4 + 0.6 * smoothstep(-0.55, 0.45, normalize(vWN).y), fk = uFall;   // 朝上、受光的葉子先轉黃，底下背光的還帶點橄欖綠
        vec3 fc = ac * clamp(lum * 1.15, 0.85, 1.7);   // 秋葉亮一點，背光面也看得出金黃
        #ifdef TA_SHRUB
          fk *= 0.4;   // 灌木只帶一點秋色，大致保持綠色（和金黃的樹分出層次）
        #endif
        #ifdef TA_GOLD
          sunny = 0.62 + 0.38 * smoothstep(-0.6, 0.25, normalize(vWN).y); fk = min(1.0, uFall * 1.25); fc = vec3(0.95, 0.74, 0.38) * clamp(lum * 1.05, 0.45, 1.0); leafy = 1.0;   // v7.6：柔金（以前飽和的金黃）   // 廣場大樹：整棵飽滿的金黃（樹冠材質全是葉子；頂端偏黃的葉子也要算進去）
        #endif
        #ifdef TA_TREEK
          // v7.4：島上的闊葉樹每棵秋色不同（props3d 依樹的位置給 vTreeK，鄰近的樹多半同色、成群）：金黃 #D9B75F 35%、柔橘 #C77A43 30%、赭紅 #A95B46 20%、
          // 還沒轉色的橄欖綠 #748C57 15%（Codex 第二輪色票）。乘在金黃葉叢貼圖上（保留貼圖的明暗與色差），亮度只降一點，不會一棵亮一棵暗；廣場大樹不在內，維持整棵金黃
          vec3 tT = vTreeK < 0.4 ? vec3(1.12, 0.92, 1.6) : vTreeK < 0.7 ? vec3(1.06, 1.06, 1.45) : vTreeK < 0.9 ? vec3(1.02, 0.62, 1.7) : vec3(0.45, 0.78, 1.5);   // v7.6 夢幻風（consult3 §8）：粉杏 #EAB084 40%、柔金 #E4C17C 30%、珊瑚 #D98D87 20%、還沒轉色的鼠尾草 #84957A 10%
          fc *= tT;
        #endif
        diffuseColor.rgb = mix(bc, fc, leafy * fk * sunny);
        #ifdef TA_LEAFTEX
          { float upK = smoothstep(-0.7, 0.45, normalize(vWN).y);   // 畫好的葉叢貼圖：秋天換成金黃那張（明暗已經畫在圖上）
            vec3 gc = goldC * mix(vec3(0.92, 0.64, 0.62), vec3(1.1, 1.04, 0.98), upK);   // v7.6 夢幻風：背光面是乾燥玫瑰色、受光面是奶油金（以前深琥珀／亮金）   // 背光面是深琥珀色、受光面是亮金（v7.0：以前背光面混綠葉，整棵變成橄欖色的泥）
            #ifdef TA_TREEK
              gc *= tT;
            #endif
            #ifdef TA_GOLD
              gc *= vec3(1.04, 0.98, 1.45);   // 廣場大樹：柔金（不是鮮黃）
            #endif
            gc = mix(gc, vec3(dot(gc, vec3(0.2126, 0.7152, 0.0722))), 0.12) * 1.12;   // v7.6 夢幻風：秋葉亮一點、粉一點（不是深琥珀）
            diffuseColor.rgb = mix(bc, gc, fk * (0.82 + 0.18 * smoothstep(-1.4, 0.2, vOP.y))); }   // 樹冠最底下留一點點綠
        #endif
      }
      if (uBloom > 0.0 && (${kind === 'sakura' ? 'true' : 'vSeed < 0.42'})) {
        // 春天：櫻花樹與一部分闊葉樹開滿櫻花（粉紅花團帶白色細點）
        float lum = dot(bc, vec3(0.3, 0.59, 0.11)) / 0.28;
        float sp = n_v(vOP.xy * 18.0 + vOP.z * 7.0);
        vec3 pk = mix(vec3(0.86, 0.36, 0.5), vec3(0.93, 0.52, 0.62), smoothstep(0.3, 0.6, sp));   // v7.6 夢幻風：主團暖粉 #EFA1BA／#F5BED0（參考圖的櫻花是粉，不是薰衣草）
        pk = mix(pk, vec3(0.96, 0.78, 0.85), smoothstep(0.72, 0.86, sp));   // 亮團 #FBE5EE
        pk = mix(vec3(0.55, 0.27, 0.42), pk, 0.55 + 0.45 * smoothstep(-0.6, 0.4, normalize(vWN).y)) * clamp(lum, 0.55, 1.35);   // 冠內與背光是玫瑰灰紫 #C28DAC
        diffuseColor.rgb = mix(diffuseColor.rgb, pk, leafy * uBloom);
      }` : kind === 'terrain' ? `
      float l0 = dot(bc, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(bc, vec3(l0 * 1.2, l0 * 1.17, l0 * 0.78), leafy * uFall * mix(0.3, 0.52, smoothstep(0.25, 0.75, n_f(vWP.xz * 0.1))));   // v6.93：秋草是柔和的橄欖金，金色留給大樹與花（v7.6：再柔一點）
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 1.08, 0.9), leafy * uBloom * 0.4);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.99, 1.03, 0.95), leafy);   // v7.6 夢幻風：地面的草色和草葉一起是鮮一點的嫩綠` : '';
  return `{
      vec3 bc = diffuseColor.rgb;
      float leafy = smoothstep(0.02, 0.1, bc.g - max(bc.r, bc.b));
      #ifdef TA_SURFACE
        leafy = vSurface.x;
      #endif
      #ifdef TA_MODEL
        leafy = smoothstep(-0.03, 0.03, bc.g - bc.r) * smoothstep(0.0, 0.04, bc.g - bc.b);   // 模型的葉子偏黃綠，綠色只比紅色多一點點；樹幹的褐色仍然排除
      #endif
      #ifdef TA_NOLEAF
        if (leafy > 0.5) discard;   // 廣場大樹：模型的葉子換成葉片卡樹冠，這裡只留樹幹枝椏
      #endif${fall}
      if (uSnow > 0.0) {
        vec3 wn = normalize(vWN);
        float n = n_f(vWP.xz * 0.55 + 3.0), n2 = n_v(vWP.xz * 4.0 + vWP.y);
        // uSnow 同時是積雪深度：薄雪時只有朝上、雜訊高的地方有雪（看得到草地斑塊），越下越厚就連斜面也蓋滿
        float dep = uSnow - 0.8;
        float up = wn.y + (n - 0.5) * 0.45 + (n2 - 0.5) * 0.12 + dep * 0.9;
        float cov = ${cover} * smoothstep(0.0, 0.5, uSnow);${kind === 'terrain' ? `
        { float lw = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lw * 1.25, lw * 1.12, lw * 0.62), leafy * smoothstep(0.0, 0.5, uSnow) * 0.6); }   // 雪下露出的草是枯黃的冬草` : ''}
        vec3 snow = vec3(0.9, 0.92, 0.96) * (0.92 + n * 0.1 + (n2 - 0.5) * 0.04);
        diffuseColor.rgb = mix(diffuseColor.rgb, snow, cov);
        roughnessFactor = mix(roughnessFactor, 0.62, cov);
        float gl = step(0.9965, n_h(floor(vWP.xz * 46.0 + vWP.y * 13.0)));
        sGl = gl * cov * (0.5 + 0.5 * sin(uTime * 2.4 + n_h(floor(vWP.xz * 46.0)) * 40.0)) * 0.9;
      }
      if (uWet > 0.0) {   // v8.7 雨天：朝上的地面、石板、屋頂顏色變深、表面比較亮滑；低窪的地方多一點水光（雨停後慢慢乾）
        float wu = smoothstep(0.5, 0.85, normalize(vWN).y), pd = smoothstep(0.55, 0.75, n_f(vWP.xz * 0.35 + 7.0)) * wu;
        diffuseColor.rgb *= 1.0 - uWet * wu * (0.22 + pd * 0.16);
        roughnessFactor = mix(roughnessFactor, min(roughnessFactor, 0.32 - pd * 0.18), uWet * wu * (0.55 + pd * 0.45));
      }
    }`;
}
/* 寫實色彩：卡通的純色降低飽和、亮色稍微壓暗（真實世界的反照率很少超過 0.8） */
const REAL = kind => kind === 'water' || kind === 'sprite' ? '' : `
  { float lr = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    diffuseColor.rgb = mix(vec3(lr), diffuseColor.rgb, ${kind === 'char' ? '0.92' : kind === 'sway' || kind === 'sakura' || kind === 'pine' || kind === 'grass' ? '0.98' : kind === 'terrain' ? '0.96' : '0.9'});   // 日系奇幻：色彩清透，只收一點點飽和
    diffuseColor.rgb = min(diffuseColor.rgb, vec3(0.86)) * 0.96; }`;
const MATS = {};
export function M(color, o, kind) {
  const key = color + (kind || '') + JSON.stringify(o || {});
  if (MATS[key]) return MATS[key];
  const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9, metalness: 0 }, o || {}));
  if (m.metalness >= 0.25 || kind === 'roof') shiny(m);   // 金屬飾邊與上釉的屋瓦映出天空
  return (MATS[key] = bend(m, kind));
}
export const VC = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
/** 地形專用：草地斑駁、懸崖岩層、沙粒細節 */
export const TERRAIN = bend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), 'terrain');
export function mesh(geo, mat, x, y, z, opt) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = !(opt && opt.noCast); m.receiveShadow = true;
  const k = mat && mat.userData && mat.userData.kind; if (k === 'sway' || k === 'sakura' || k === 'pine') m.customDepthMaterial = LEAF_DEPTH;
  return m;
}
/* 樹葉的影子：陰影貼圖裡挖出不規則的小洞，地上的樹影透出點點光斑 */
export const LEAF_DEPTH = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
LEAF_DEPTH.onBeforeCompile = sh => {
  sh.vertexShader = 'varying vec3 vLP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vLP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = `varying vec3 vLP;
    float lh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    float ln(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(lh(i), lh(i + vec3(1,0,0)), f.x), mix(lh(i + vec3(0,1,0)), lh(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(lh(i + vec3(0,0,1)), lh(i + vec3(1,0,1)), f.x), mix(lh(i + vec3(0,1,1)), lh(i + vec3(1,1,1)), f.x), f.y), f.z); }
  ` + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (ln(vLP * 4.2) * 0.65 + ln(vLP * 9.0) * 0.35 > 0.63) discard;');
};
LEAF_DEPTH.customProgramCacheKey = () => 'leafdepth1';
/* ---------- 樹冠外圈的葉片卡：一團團帶透明度的小葉子，讓樹的輪廓細碎參差 ---------- */
let LEAFCARD = null;
export function leafCardTex() {
  if (LEAFCARD) return LEAFCARD;
  const S = 256, d = new Uint8Array(S * S * 4); let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 110; k++) {
    // 葉子集中在圓形範圍內，邊緣稀疏 → 一團葉叢的剪影
    const a = r() * 6.2832, rad = Math.pow(r(), 0.7) * S * 0.4, cx = S / 2 + Math.cos(a) * rad, cy = S / 2 + Math.sin(a) * rad;
    const L = 9 + r() * 13, W = L * (0.38 + r() * 0.12), ang = r() * 6.2832, ca = Math.cos(ang), sa = Math.sin(ang), base = 150 + r() * 100;
    for (let y = Math.max(0, Math.floor(cy - L)); y < Math.min(S, Math.ceil(cy + L)); y++) for (let x = Math.max(0, Math.floor(cx - L)); x < Math.min(S, Math.ceil(cx + L)); x++) {
      const dx = x - cx, dy = y - cy, u = (dx * ca + dy * sa) / L, v = (-dx * sa + dy * ca) / W;
      const e = u * u + v * v * (1 + u * 0.6); if (e > 1) continue;   // 葉尖略尖
      const vein = Math.abs(v) < 0.09 ? 0.86 : 1, val = base * (0.82 + 0.18 * (1 - Math.abs(v))) * vein * (0.9 + 0.1 * u), i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = Math.min(255, val); d[i + 3] = 255;
    }
  }
  // 透明處填上鄰近顏色，避免縮圖（mipmap）時邊緣發黑
  for (let i = 0; i < S * S; i++) if (!d[i * 4 + 3]) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 190; }
  const t = new THREE.DataTexture(d, S, S); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return (LEAFCARD = t);
}
export const CARD_DEPTH = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafCardTex(), alphaTest: 0.5 });
const CARD_MATS = {};
let LEAF_TX = null;   // Codex 手繪的葉叢貼圖 [綠, 金]（props3d.js 載入後交給這裡）
/** 葉片卡改用手繪葉叢：底圖換成綠葉叢、秋天換金黃那張（TA_LEAFTEX）；卡片以自己的中心放大（TA_CARDGROW），畫好的葉子才是看得清楚的大小 */
function applyLeaf(m) {
  if (m.userData.leafTex) return; m.userData.leafTex = true;
  const goldU = { value: LEAF_TX[1] }, ob = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    ob(sh, r); sh.uniforms.uGoldMap = goldU;
    sh.vertexShader = 'attribute vec3 cardC;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed = cardC + (transformed - cardC) * 2.3;');
    sh.fragmentShader = 'uniform sampler2D uGoldMap;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  vec3 goldC = diffuse * texture2D(uGoldMap, vMapUv).rgb;');
  };
  m.map = LEAF_TX[0]; m.color.set('#ffffff'); m.defines = Object.assign({}, m.defines, { TA_LEAFTEX: '', TA_CARDGROW: '' }); m.needsUpdate = true;
}
export function useLeafTex(green, gold) { if (LEAF_TX) return; LEAF_TX = [green, gold]; Object.values(CARD_MATS).forEach(applyLeaf); }
/** 葉片卡材質（跟著風擺、四季變色，和葉團用同一種著色） */
export function cardMat(color, kind) {
  const key = color + kind; if (CARD_MATS[key]) return CARD_MATS[key];
  const m = new THREE.MeshStandardMaterial({ color, map: leafCardTex(), alphaTest: 0.5, alphaToCoverage: true, roughness: 0.9 });
  CARD_MATS[key] = bend(m, kind || 'sway'); if (LEAF_TX) applyLeaf(m);
  return m;
}
const CARD_GEO = {};
/** 一團葉叢外圈的葉片卡（合成一個網格，座標以葉團中心為原點；法線朝外，受光像一顆蓬鬆的球） */
export function canopyCards(r, seed) {
  const key = r.toFixed(2) + ':' + ((seed || 0) % 5);
  if (CARD_GEO[key]) return CARD_GEO[key];
  let sd = 97 + ((seed || 0) % 5) * 131; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const n = Math.round(18 + r * r * 48), P = [], Nn = [], UV = [], CC = [], IDX = [], v = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i + 0.5) / n * 1.7, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.39996 + rnd() * 0.8;
    v.set(Math.cos(th) * rr, Math.max(-0.7, y), Math.sin(th) * rr).normalize();
    const c = v.clone().multiplyScalar(r * (1.0 + rnd() * 0.22)), s = r * (0.34 + rnd() * 0.22);   // 卡片中心在葉團表面外一點，邊緣的葉子才露得出來
    t1.crossVectors(Math.abs(v.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up, v).normalize(); t2.crossVectors(v, t1);
    const ro = rnd() * 6.28, cr = Math.cos(ro), sr = Math.sin(ro), a1 = t1.clone().multiplyScalar(cr).addScaledVector(t2, sr), a2 = t2.clone().multiplyScalar(cr).addScaledVector(t1, -sr);
    const base = P.length / 3;
    [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]].forEach(([u, w, tu, tv]) => {
      const p = c.clone().addScaledVector(a1, u * s).addScaledVector(a2, w * s); P.push(p.x, p.y, p.z); CC.push(c.x, c.y, c.z);
      const nn = p.clone().normalize(); Nn.push(nn.x, nn.y, nn.z); UV.push(tu, tv);
    });
    IDX.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 2, base + 1, base, base + 3, base + 2);   // 正反兩面都用朝外的法線（不用 DoubleSide，背面才不會變暗）
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('cardC', new THREE.Float32BufferAttribute(CC, 3)); g.setIndex(IDX);   // cardC：每張卡的中心（換上手繪葉叢時以它放大）
  return (CARD_GEO[key] = g);
}
/** 共用頂點的二十面體球：three 的 IcosahedronGeometry 每個三角形各自一份頂點，合併後法線才會平滑 */
export function mergedIco(r, detail) {
  const g0 = new THREE.IcosahedronGeometry(r, detail), p0 = g0.attributes.position, map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p0.count; i++) {
    const key = Math.round(p0.getX(i) * 1e4) + ',' + Math.round(p0.getY(i) * 1e4) + ',' + Math.round(p0.getZ(i) * 1e4);
    let j = map.get(key); if (j == null) { j = pos.length / 3; map.set(key, j); pos.push(p0.getX(i), p0.getY(i), p0.getZ(i)); } idx.push(j);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g0.dispose();
  return g;
}
/** 蓬鬆的葉團：細分的球面加上起伏，像一團團花椰菜（同半徑共用幾種形狀） */
const LEAF_GEO = {};
export function leafGeo(r, seed) {
  const key = r.toFixed(2) + ':' + ((seed || 0) % 4);
  if (LEAF_GEO[key]) return LEAF_GEO[key];
  const g = mergedIco(r, 3);
  const p = g.attributes.position, v = new THREE.Vector3(), k = (seed || 0) % 4 * 1.7;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const lump = Math.sin(v.x * 5.1 + k) * Math.sin(v.y * 4.3 + k * 0.7) * Math.sin(v.z * 4.7 + k * 1.3) + Math.sin(v.x * 9.3 - v.z * 7.7 + k) * 0.35;
    const d = 1 + lump * 0.12;
    v.multiplyScalar(r * d); if (v.y < 0) v.y *= 0.82; p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return (LEAF_GEO[key] = g);
}
/** 投影到螢幕（含地平線彎曲）：回傳 [x, y, 可見] */
export function screenOf(obj, dy) {
  const p = new THREE.Vector3(); if (obj.isVector3) p.copy(obj); else obj.getWorldPosition(p); p.y += dy || 0;
  p.applyMatrix4(camera.matrixWorldInverse); { const bz = Math.max(-p.z - U.uBendF.value, 0); p.y -= bz * bz * U.uCurve.value; } p.applyMatrix4(camera.projectionMatrix);
  return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight, p.z < 1];
}

/* ---------- 天空 ---------- */
export const skyU = { glow: { value: 0 }, top: { value: new THREE.Color('#5ec2ff') }, mid: { value: new THREE.Color('#9ad4ff') }, bot: { value: new THREE.Color('#d8f3ff') }, moonDir: { value: new THREE.Vector3(0.4, 0.75, -0.55).normalize() }, dawn: { value: 0 }, span: { value: 0.4 }, sunSky: { value: new THREE.Vector3(0, 1, 0) }, sea: { value: new THREE.Color('#7ad3f6') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#fff4d6') }, night: { value: 0 },
  lift: { value: 0.36 }, time: U.uTime, cover: { value: 0.3 }, aurora: { value: 0 }, hz: { value: 0 }, gloom: { value: 0 } };   // hz：畫面上地平線在天幕的高度
/* 天空：滾筒地平線讓鏡頭下傾時也看得到天空，所以天空用「抬高」後的方向計算漸層、太陽與雲（lift） */
export const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform float glow; uniform float gloom; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 moonDir; uniform float dawn; uniform vec3 sea; uniform float span; uniform vec3 sunSky; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; uniform float lift; uniform float time; uniform float cover; uniform float aurora; uniform float hz; varying vec3 vD;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
    /* 一團團的雲：每格一顆大小不一的圓，回傳「覆蓋度最高的那顆」的 (1 - d/r, 從圓心指出來的方向)；用來做花椰菜般的輪廓與每團各自的受光 */
    vec3 puffs(vec2 p){ vec2 i = floor(p), f = fract(p); vec3 best = vec3(-1.0, 0.0, 1.0);
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = vec2(h2(i + g), h2(i + g + 17.0)) * 0.8 + 0.1;
        float r = 0.55 + 0.45 * h2(i + g + 41.0); vec2 v = f - g - o; float k = 1.0 - length(v) / r; if (k > best.x) best = vec3(k, v / r); }
      return best; }
    void main(){
      vec3 d = normalize(vec3(vD.x, vD.y + lift, vD.z));
      float e = d.y - hz;   // 相對於畫面上地平線的高度
      float y = clamp(e / max(span, 0.07), 0.0, 1.0);   // 以畫面上的地平線為準、鋪到畫面上緣（span）：一般鏡頭與第一人稱，畫面上緣都是頭頂的深藍
      vec3 c = y < 0.32 ? mix(bot, mid, smoothstep(0.0, 0.32, y)) : mix(mid, top, smoothstep(0.32, 0.88, y));   // v7.6 夢幻風：粉紫的低空佔到三成、往上才轉成粉藍（以前 0.16／0.75）。三段漸層：地平線的霧白 → 低空的淺青 → 頭頂的深藍（概念圖：畫面上半部都是飽和的藍，接近地平線才變淡）
      c += vec3(0.1, 0.1, 0.08) * exp(-abs(e) * 18.0) * (1.0 - night) * (1.0 - min(gloom, 1.0) * 0.7);   // 地平線的亮帶
      float s = max(dot(d, sunSky), 0.0) * step(night, 0.6);   // 夜裡的「太陽方向」是月光，不畫（太陽本體在卷雲之後才畫，見下方）
      vec2 ha = normalize(d.xz + 1e-4), sa = normalize(sunDir.xz + 1e-4); c += sunCol * vec3(1.0, 0.82, 0.55) * pow(max(dot(ha, sa), 0.0), 4.0) * smoothstep(0.42, -0.02, e) * glow * 1.5;
      float band = 0.0;
      if (night > 0.0) {
        // 銀河：斜跨天空的一條淡淡光帶，帶一點雲狀的明暗
        vec3 gN = normalize(vec3(0.55, 0.35, 0.76)); float gd = dot(d, gN);
        band = exp(-gd * gd / 0.022) * (0.45 + 0.75 * fbm(vec2(atan(d.x, -d.z) * 4.0, d.y * 6.0 + gd * 9.0))) * smoothstep(0.02, 0.3, d.y);
        c += vec3(0.022, 0.03, 0.055) * band * night;
        // 月亮：亮白的圓盤（表面有淡淡的斑紋）與一圈柔和的光暈
        float md = dot(d, moonDir);
        vec3 mU = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0))), mV = cross(mU, moonDir); vec2 mp = vec2(dot(d, mU), dot(d, mV)) / 0.032;
        float disc = smoothstep(1.0, 0.93, length(mp)), maria = fbm(mp * 2.2 + 3.0);
        c = mix(c, vec3(1.0, 0.98, 0.92) * (1.05 - smoothstep(0.45, 0.75, maria) * 0.22), disc * night);
        c += vec3(0.55, 0.62, 0.8) * (pow(max(md, 0.0), 2200.0) * 0.5 + pow(max(md, 0.0), 160.0) * 0.12 + pow(max(md, 0.0), 18.0) * 0.03) * night * (1.0 - disc);
      }
      { // 星星：每格最多一顆，位置在格子裡隨機、大小亮度不一的圓點，慢慢閃爍；少數幾顆大的帶一點藍或暖色（以前是一格一格的方塊）
        vec3 sp = d * 160.0, q = floor(sp), fq = fract(sp) - 0.5; float hh = h(q);
        if (hh > 0.99 - band * 0.006 && night > 0.0) {   // 銀河裡星星多一點
          vec3 o = vec3(h(q + 1.7), h(q + 3.1), h(q + 5.3)) - 0.5; float big = smoothstep(0.9985, 1.0, hh);
          float r = 0.07 + big * 0.09, dd = length(fq - o * 0.6);
          float st = smoothstep(r, r * 0.25, dd) * (0.55 + 0.45 * sin(time * (1.3 + h(q + 9.0) * 2.0) + hh * 60.0)) * (0.9 + big * 1.6);
          c += mix(vec3(1.0), h(q + 7.0) > 0.5 ? vec3(0.75, 0.85, 1.0) : vec3(1.0, 0.9, 0.75), big) * st * night * smoothstep(0.05, 0.4, d.y);
        }
      }
      // 積雲堆：沿著地平線堆起的大朵積雲（在遠山後面）。雲頂由一顆顆圓團疊成花椰菜的輪廓，每一團各自受光——
      // 向陽的上緣暖白帶金邊、背光的下緣是薰衣草紫；越往下越融進地平線的空氣裡。邊緣寬度跟著像素大小，輪廓清楚
      {
        float az = atan(d.x, -d.z);
        float tw = fbm(vec2(az * 1.2, 2.7)), tw2 = fbm(vec2(az * 3.6, 9.1));
        float H = (0.004 + max(tw - 0.42, 0.0) * 0.38 + max(tw2 - 0.55, 0.0) * 0.15) * mix(0.75, 1.25, cover);   // 每個方位的雲頂高度：幾座高聳的積雲塔
        float sAz = atan(sunDir.x, -sunDir.z), toward = cos(az - sAz), side = sin(az - sAz);
        // 兩種尺度的雲團：大團決定輪廓，小團讓邊緣更碎
        vec2 q1 = vec2(az * 11.0, e * 11.0) + vec2(time * 0.003, 0.0), q2 = q1 * 2.3 + 5.3;
        vec3 P1 = puffs(q1), P2 = puffs(q2);
        float body = H - e + (fbm(vec2(az * 5.0, e * 4.0)) - 0.5) * 0.06;   // 雲塔的主體：高度以下都是雲（輪廓帶一點起伏）
        float bump = max(P1.x * 0.04, P2.x * 0.018) * smoothstep(-0.05, 0.0, body);   // 雲團只在雲頂附近鼓起（不會變成飄在空中的一顆顆蛋）   // 雲頂往上鼓出的一團團（大小和雲團一致）
        float edgeW = max(fwidth(e) * 1.5, 0.0015);
        float cm = smoothstep(-edgeW, edgeW, body + bump - (1.0 - P1.x) * 0.01) * smoothstep(-0.03, 0.02, e);
        if (cm > 0.0) {
          // 每一團的「法線」：從團心指出來的方向；朝太陽那一側（畫面上的左右由太陽方位決定，上方總是受光）比較亮
          vec2 sunScr = normalize(vec2(-side, 0.9));
          float lit = clamp((dot(normalize(P1.yz + vec2(0.0, 0.2)), sunScr) * 0.7 + dot(normalize(P2.yz + 1e-3), sunScr) * 0.3) * 0.65 + 0.45, 0.0, 1.0);   // 大團決定明暗，小團加細節
          float hk = clamp(e / max(H, 0.02), 0.0, 1.0);   // 雲內的高度：底部陰暗、頂部明亮
          float core = smoothstep(0.0, 0.5, max(P1.x, P2.x));   // 團與團之間的縫比較暗
          vec3 litC = mix(vec3(1.02, 1.0, 1.01), sunCol * vec3(1.03, 0.9, 0.94), min(0.75, 0.18 + glow * 1.2));   // 晨昏：受光面染成太陽的粉桃（v7.6 夢幻風：少一點橘）
          vec3 shdC = mix(mix(vec3(0.6, 0.56, 0.8), mix(bot, top, 0.35), 0.2), vec3(0.34, 0.24, 0.46), min(1.0, glow * 1.4));   // v7.6：背光面是粉紫   // 薰衣草紫的背光面；晨昏偏深紫
          vec3 cc = mix(shdC, litC, clamp(lit * 0.75 + hk * 0.25 + toward * 0.08 - (1.0 - core) * 0.3 - 0.1, 0.0, 1.0));
          cc += sunCol * smoothstep(edgeW * 6.0, 0.0, body + bump) * (0.1 + 0.25 * max(toward, 0.0)) * lit * (1.0 - night);   // 雲頂受光的金邊
          cc = mix(cc, mix(bot, top, 0.1) * 1.05, smoothstep(0.05, -0.01, e) * 0.55);   // 雲腳融進地平線的空氣裡
          float rimN = smoothstep(edgeW * 9.0, 0.0, body + bump);   // 夜晚：月光只照亮雲頂的邊緣
          vec3 ncc = mix(vec3(0.022, 0.03, 0.088), vec3(0.32, 0.34, 0.52), clamp(rimN * 0.8 + lit * hk * 0.18, 0.0, 1.0));   // v7.6：夜裡的雲是紫藍的雲體、淡紫的雲緣（v8.0 收暗、偏冷一點）
          c = mix(c, mix(cc, ncc, night), cm * 0.98);   // 夜晚的雲是深藍的雲體、銀白的雲緣
        }
      }
      // 遠景：海平線上低矮的遠島與小小的海蝕岩，被空氣淡化成天空色（大氣透視）；地平線以下畫成遠方的海——
      // 海面是半透明的，天幕在地平線下的部分會透出來，不能畫任何剪影
      {
        float az = atan(d.x, -d.z);
        vec3 airC = mix(bot, mid, 0.25);
        if (e < 0.0) {
          float g = smoothstep(0.0, -0.12, e);   // 越往下越不是掠射角：倒影淡一點、看得到一點水色
          vec3 fs = mix(bot, mid, g * 0.5) * 0.88 + sunCol * vec3(1.0, 0.82, 0.55) * pow(max(dot(ha, sa), 0.0), 4.0) * glow * 1.5 * 0.88;
          fs = mix(fs, sea * 0.45, g * 0.3);
          { float sunSide = pow(max(dot(ha, sa), 0.0), 14.0), gk = clamp(glow * 2.0, 0.0, 1.0) * (1.0 - night);   // 晨昏的遠海也偏深青藍（和海面的倒影同一個公式）
            fs = mix(fs, (vec3(0.012, 0.085, 0.19) + fs * 0.12) * 0.88, gk * (1.0 - sunSide * 0.8) * 0.9); }
          float low = 1.0 - smoothstep(0.05, 0.55, sunSky.y - hz);
          float pw = pow(max(dot(ha, sa), 0.0), mix(3000.0, 500.0, g) * mix(1.0, 0.45, night)), spk = smoothstep(0.45, 0.95, vn(vec2(atan(d.x, -d.z) * 340.0, e * 1600.0 + time * 2.2)));
          fs += sunCol * pw * (0.3 + spk * 2.6) * (0.3 + low * 0.9) * (1.0 + night * 1.5);   // 太陽或月亮正下方的反光帶（細碎的閃光）
          c = mix(c, fs, smoothstep(0.0, -0.004, e));
        }
        // 最遠的一層：連綿起伏的低矮島影（很淡）
        float r1 = max(fbm(vec2(az * 3.2, 3.1)) - 0.5, 0.0) * 0.16 + (vn(vec2(az * 40.0, 2.0)) - 0.5) * 0.003;
        if (e > -0.002 && e < r1) {
          vec3 mc = mix(vec3(0.21, 0.42, 0.78), vec3(0.008, 0.022, 0.08), night);
          c = mix(c, mix(mc, airC, 0.78 - night * 0.3), smoothstep(-0.002, 0.002, e));
        }
        // 近一點：零星的小島與尖尖的海蝕岩（輪廓不規則）
        float cell = floor(az * 7.0 + 0.37), fx = fract(az * 7.0 + 0.37) - 0.5, keep = step(0.62, h2(vec2(cell, 7.0)));
        float rock = keep * (0.012 + h2(vec2(cell, 11.0)) * 0.03) * pow(max(0.0, 1.0 - abs(fx - (h2(vec2(cell, 5.0)) - 0.5) * 0.4) * (3.0 + h2(vec2(cell, 3.0)) * 4.0)), 1.6) * (0.8 + 0.4 * vn(vec2(az * 90.0, 1.0)));
        float r2 = max(fbm(vec2(az * 6.0, 8.7)) - 0.56, 0.0) * 0.12 + rock;
        if (e > -0.002 && e < r2) {
          vec3 ic = mix(vec3(0.17, 0.36, 0.64), vec3(0.006, 0.02, 0.07), night);
          ic = mix(ic, vec3(0.16, 0.3, 0.26) * mix(1.0, 0.15, night), smoothstep(r2 - 0.01, r2 - 0.002, e) * 0.35);   // 頂上一點綠意
          c = mix(c, mix(ic, airC, 0.6 - night * 0.3), smoothstep(-0.002, 0.002, e));
        }
        // 貼著海面的一層薄霧
        c = mix(c, airC + vec3(0.03), smoothstep(0.014, -0.002, e) * step(-0.002, e) * 0.35 * (1.0 - night));
      }
      // 高空的卷雲（v7.0）：細長的絲狀薄雲，晴天也有一些；靠近太陽的一側發亮、黃昏染成粉金——天空多了一層中景，不再只有一片漸層
      if (e > 0.0 && night < 0.98) {
        vec2 cp = d.xz / (d.y + 0.18) * 0.6, rp = vec2(cp.x * 0.8 + cp.y * 0.6, -cp.x * 0.6 + cp.y * 0.8);
        vec2 wq = rp * vec2(0.55, 1.5) + vec2(time * 0.0035, 0.0);
        float wp = fbm(wq * 0.6 + 3.0), ci = fbm(wq + vec2(wp * 2.2, wp * 0.6));   // 被扭曲過的雲片：一片片斜斜的羽毛狀
        float fib = fbm(vec2(wq.x * 0.9 + wp * 1.5, wq.y * 9.0 + wp * 3.0));   // 順著雲片方向的細絲（橫向變化快、縱向變化慢）
        float field = smoothstep(0.42, 0.62, fbm(wq * 0.22 + 11.0));   // 只有幾片天空有卷雲，其他地方是乾淨的藍
        float ca = smoothstep(0.5, 0.78, ci) * smoothstep(0.3, 0.72, fib) * field * smoothstep(0.03, 0.22, e) * (1.0 - smoothstep(0.55, 0.95, d.y));
        ca *= mix(0.42, 0.62, clamp(glow * 2.0, 0.0, 1.0)) * (1.0 - night) * (1.0 - smoothstep(0.5, 0.9, cover) * 0.5) * (1.0 - min(gloom, 1.0));
        vec3 cc = mix(vec3(1.0, 1.0, 1.03), sunCol * vec3(1.12, 0.84, 0.82), clamp(glow * 1.7, 0.0, 0.92)) + sunCol * pow(s, 10.0) * 0.7;
        c = mix(c, cc, ca);
      }
      // 太陽：熱的亮核（給泛光）＋柔和的日暈（米氏散射）；夜裡不畫
      { float sv = step(night, 0.6) * (1.0 - night) * (1.0 - min(gloom, 1.0) * 0.94);   // v8.7 陰雨天看不到太陽（以前雨裡仍有亮亮的日輪）
        c += sunCol * (smoothstep(0.99982, 0.99994, s) * 9.0 + pow(s, 260.0) * 0.5 + pow(s, 32.0) * 0.12 + pow(s, 6.0) * 0.05) * sv; }
      // 積雲：在天幕上投影的分形雜訊，上緣受光、下緣帶天空色的陰影，慢慢飄動
      if (d.y > -0.08) {
        vec2 p = d.xz / (d.y + 0.32) * 0.95 + vec2(time * 0.006, time * 0.002);
        float n = fbm(p), n2 = fbm(p + vec2(0.0, 0.09));
        float thr = mix(0.55, 0.44, cover);
        float m = smoothstep(thr, thr + 0.05, n + (fbm(p * 4.3) - 0.5) * 0.06) * smoothstep(0.1, 0.22, e) * (1.0 - smoothstep(0.7, 0.95, d.y)) * smoothstep(0.3, 0.6, cover);   // 晴天不畫高空的大片軟雲（大朵積雲由 cumulus.js 負責）   // 邊緣收清楚一點、帶細碎的捲邊
        float lit = clamp((n - n2) * 9.0 + 0.55, 0.0, 1.0) * (0.7 + 0.3 * smoothstep(thr, thr + 0.3, n));
        vec3 shade = mix(vec3(0.66, 0.66, 0.86), mix(bot, top, 0.3), 0.3) * mix(0.9, 0.35, night);   // 雲的背光面是薰衣草紫的灰白
        vec3 bright = mix(vec3(1.06, 1.05, 1.02), sunCol * 1.15, 0.25 + glow * 0.5) * mix(1.0, 0.3, night);
        { float gl = min(gloom, 1.0), st = 1.0 - max(gloom - 1.0, 0.0) * 0.8;   // gloom 超過 1 是暴風雨：雲再暗一截
          shade = mix(shade, vec3(0.22, 0.24, 0.29) * st * mix(0.9, 0.35, night), gl * 0.9); bright = mix(bright, vec3(0.44, 0.47, 0.54) * st * mix(1.0, 0.3, night), gl * 0.9); }   // v8.7 雨雲：灰藍的雲底、沒有被太陽照白的雲頂
        c = mix(c, mix(shade, bright, lit), m * 0.95);
        c += sunCol * pow(s, 6.0) * m * 0.35 * (1.0 - min(gloom, 1.0));   // 太陽附近的雲邊發亮
      }
      // 極光：北方地平線上方一層層飄動的光幕（下緣綠、上緣轉紫），有細細的直條紋
      if (aurora > 0.001 && d.y > -0.02) {
        float az = atan(d.x, -d.z), north = smoothstep(2.2, 0.6, abs(az));
        float w = fbm(vec2(az * 1.6 + time * 0.018, time * 0.012)), w2 = fbm(vec2(az * 3.1 - time * 0.03, 4.0));
        float base = 0.08 + w2 * 0.08, top = base + 0.3 + w * 0.3;
        float h = smoothstep(base, base + 0.05, d.y) * (1.0 - smoothstep(top - 0.08, top, d.y));
        float rays = 0.55 + 0.45 * sin(az * 46.0 + w * 9.0 + time * 0.25);
        float curtain = smoothstep(0.28, 0.55, w) * 0.75 + 0.25;
        vec3 ac = mix(vec3(0.15, 1.0, 0.6), vec3(0.62, 0.32, 1.0), smoothstep(base + 0.04, top, d.y));
        c += ac * curtain * rays * h * north * aurora * 1.1;
      }
      gl_FragColor = vec4(c, 1.0); }`
}));
sky.renderOrder = -1; scene.add(sky);

/* ---------- 光源 ---------- */
export const hemi = new THREE.HemisphereLight('#cfeaff', '#8ab868', 1.1); scene.add(hemi);
export const sun = new THREE.DirectionalLight('#fff4e0', 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);   // 陰影貼圖：每公尺約 75 個像素，窗框、欄杆、樹葉的影子都清楚（省電模式改回 2048，見 settings.js）
Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 1, far: 120 }); sun.shadow.getFrustum().noBend = true;   // 陰影貼圖不彎曲：照原本的視錐剔除
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.025; sun.shadow.radius = 2;
scene.add(sun, sun.target);
/** 遠處的陰影（兩層陰影的第二層）：亮度 0，只提供陰影貼圖；不每一格重畫（shadows.js 決定何時 needsUpdate） */
export const sunFar = new THREE.DirectionalLight('#ffffff', 0);
sunFar.castShadow = CASCADES; sunFar.shadow.mapSize.set(2048, 2048); sunFar.shadow.autoUpdate = false; sunFar.shadow.radius = 0;
sunFar.shadow.bias = -0.0006; sunFar.shadow.normalBias = 0.07;   // 遠處的像素格大，偏移也要大一點才不會自己遮自己
Object.assign(sunFar.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 190 }); sunFar.shadow.getFrustum().noBend = true;
scene.add(sunFar, sunFar.target);
/** 陰影框（shadows.js 每一格更新）：近處與遠處各一個，ax／ay 是光源座標系的兩軸、ca／cb 是框的中心、r 是半寬。
    props3d 用來判斷每個模型的影子會不會落進框裡（不會的就不畫進陰影貼圖）。far.on：遠處那張有效；far.due：這一格要重畫 */
export const shadowView = {
  near: { r: 27, ax: new THREE.Vector3(1, 0, 0), ay: new THREE.Vector3(0, 0, 1), ca: 0, cb: 0 },
  far: { r: 60, ax: new THREE.Vector3(1, 0, 0), ay: new THREE.Vector3(0, 0, 1), ca: 0, cb: 0, on: false, due: false, dir: new THREE.Vector3(0, 1, 0), t: -1e9 }
};
/** 彎曲的海面在畫面上的地平線（main.js 每一格算）：y 是 NDC 高度、d 是那一點離鏡頭的深度。比 d 遠、又在這條線以下的東西被地平線擋住 */
export const HZ = { y: -9, d: 1e9 };

export const lampK = { value: 0 };   // v8.7 燈亮的程度（applyTime 算）：比夜晚程度早一點，日落前後就亮起來
export const nightMats = [];   // 夜晚發光的窗戶與燈
export const lamps = [];
export const FOG = { near: 60, far: 150 };   // 晴天的霧（線性，公尺）
export const water = { sea: null, river: null };
export const SEA = { day: '#8bb9cf' };   // 白天海面的底色（受強烈日光與色調映射，要比想看到的顏色深、飽和）

// 時間色票（參考 Codex 的概念圖取樣）：top 頭頂、mid 低空、bot 地平線的霧白；sea 遠方海面；其餘是陽光、天光、霧與曝光
/* v7.0：依 Codex 美術顧問的時段色票重調（主光：補光約 4：1，夜晚的環境光大幅降低、燈光才是夜裡最亮的東西）。
   fn／ff：這個時段的線性霧距（公尺；雨天由 weather.js 再拉近） */
/* v7.6 夢幻風（Codex 第三輪 consult3 §3、§5）：天頂粉藍／薰衣草、低空粉紫、地平線桃粉；主光奶油色、天光補光薰衣草、地面補光偏紫——
   影子是淡紫色而不是灰藍；黃金時段不再是一片橘金。夜晚是紫藍的天、不是深靛 */
const NIGHT = { top: '#151d46', mid: '#28325f', bot: '#474f84', sea: '#16224c', sun: '#b6c4ff', si: 0.36, hs: '#7584b8', hg: '#2a2e4e', hi: 0.32, fog: '#2e3662', exp: 1.06, night: 1, fn: 75, ff: 200 };   // 夜色：深靛藍的天、月光是冷藍的主光（v8.0 燈光設計：環境光收暗、冷暖對比清楚，暖色的燈才是夜裡的主角；仍帶一點薰衣草）
const KEYS = [
  [0, NIGHT],
  [4.8, { top: '#2a2866', mid: '#4a4486', bot: '#7a6a9e', sea: '#232a62', sun: '#bcb8ff', si: 0.46, hs: '#8a86c0', hg: '#3a3450', hi: 0.4, fog: '#4e4a80', exp: 1.05, night: 0.85, fn: 55, ff: 160 }],
  [6.1, { top: '#7a7cd0', mid: '#cfa6d6', bot: '#f8c0c4', sea: '#d6bcd2', sun: '#ffe2c8', si: 1.5, hs: '#c8bce4', hg: '#857890', hi: 0.88, fog: '#e2cce0', exp: 1.02, night: 0, fn: 50, ff: 160 }],   // 清晨：薰衣草的天、粉桃的地平線
  [7.6, { top: '#6a86cc', mid: '#b8b8e2', bot: '#f0d0d8', sea: '#96c8ec', sun: '#ffe6cc', si: 2.0, hs: '#d4cce0', hg: '#948890', hi: 1.08, fog: '#d8d4ea', exp: 1.1, night: 0, fn: 60, ff: 178 }],
  [9, { top: '#6488d4', mid: '#a8b2e6', bot: '#ecd2e0', sea: '#7cc8f2', sun: '#ffe4c6', si: 2.75, hs: '#d6cfe6', hg: '#968a94', hi: 1.42, fog: '#d2d4ec', exp: 1.1, night: 0, fn: 70, ff: 195 }],   // 白天：頭頂矢車菊藍 → 低空長春花紫 → 地平線粉白；空氣通透
  [15.5, { top: '#6688d2', mid: '#aab2e4', bot: '#eed2de', sea: '#7cc6f0', sun: '#ffdfbe', si: 2.65, hs: '#d4cde4', hg: '#948892', hi: 1.38, fog: '#d4d2ea', exp: 1.08, night: 0, fn: 68, ff: 190 }],
  [17, { top: '#6c80c8', mid: '#b8a4d8', bot: '#f2c0c4', sea: '#e4c0cc', sun: '#ffd8b8', si: 2.0, hs: '#b8b2e2', hg: '#7e7088', hi: 0.95, fog: '#dcc8dc', exp: 1.06, night: 0, fn: 60, ff: 175 }],   // 黃金時段：頭頂仍是藍、低空粉紫、地平線粉桃；奶油粉的逆光、薰衣草的陰影
  [18.2, { top: '#4c4e9a', mid: '#b090c4', bot: '#f4ae9c', sea: '#e8a090', sun: '#ffb88e', si: 1.4, hs: '#a29cd2', hg: '#6a6278', hi: 0.72, fog: '#c8a8c4', exp: 1.02, night: 0.05, fn: 50, ff: 150 }],   // 夕陽：粉橘只留在地平線，天是藍紫到粉紫
  [19.5, { top: '#33306e', mid: '#6a5f9c', bot: '#c49ab8', sea: '#4c4a80', sun: '#c8b8ff', si: 0.6, hs: '#8f88c4', hg: '#3a3550', hi: 0.5, fog: '#6a6094', exp: 1.04, night: 0.7, fn: 55, ff: 165 }],
  [21, NIGHT], [24, NIGHT]
];
// 月亮：在北偏東的天上（從廣場往北看在右上方）。MOON_L 是月光的方向（夜裡的主光）；天幕上畫月亮的位置由 main.js 依畫面上的地平線算
const moonAt = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
const MOON_L = moonAt(0.55, 0.5);
const ca = new THREE.Color(), cb = new THREE.Color();
const lerpC = (a, b, k) => ca.set(a).lerp(cb.set(b), k).clone();
/* ---------- 天空環境光（IBL）：把目前的天色畫成一個小天球，用 PMREM 預先模糊，當成整個島的環境光（scene.environment）----------
   取代平板的半球光：背光面受天空的藍光、朝下的面受地面反射的暖光，金色飾邊與上釉的屋瓦映出天空。時間變了（0.1 小時）才重算一次 */
const envU = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uGain: { value: 1 } };
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: envU,
  vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 uTop, uMid, uBot, uGround, uSunCol, uSunDir; uniform float uGain; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float y = d.y;
      vec3 c = y > 0.0 ? mix(mix(uBot, uMid, smoothstep(0.0, 0.3, y)), uTop, smoothstep(0.3, 1.0, y)) : mix(uBot * 0.8, uGround, smoothstep(0.0, -0.25, y));   // 地平線以下是草地、沙灘反射的暖色
      float s = max(dot(d, uSunDir), 0.0); c += uSunCol * (pow(s, 5.0) * 0.45 + pow(s, 40.0) * 1.2);   // 太陽周圍的天空比較亮：受光面多一點暖色的天光、亮面的反光偏向太陽
      gl_FragColor = vec4(c * uGain, 1.0); }`
})));
const pmremGen = new THREE.PMREMGenerator(renderer); let envRT = null, envKey = null;
export const ibl = { on: true };
/* 只給「會反光」的材質（金屬、上釉屋瓦）：粗糙的牆、草、沙的漫射光還是交給半球光（天空色 → 地面色的漸層，等於天空環境光的漫射部分），
   不然整片草地與白牆在掠射角都會映出白亮的地平線，畫面發白、沒有明暗 */
const SHINY = [];
export function shiny(m) { SHINY.push(m); m.userData.envK = m.metalness >= 0.25 ? 1.0 : 0.28; if (envRT) { m.envMap = envRT.texture; m.envMapIntensity = m.userData.envK * envState.k; } }
function refreshEnv(key, dir, night) {
  if (!ibl.on) return;
  if (key === envKey) return; envKey = key;
  envU.uTop.value.copy(skyU.top.value); envU.uMid.value.copy(skyU.mid.value); envU.uBot.value.copy(skyU.bot.value); envU.uGround.value.copy(hemi.groundColor).multiplyScalar(0.55);
  envU.uSunDir.value.copy(dir); envU.uSunCol.value.copy(sun.color).multiplyScalar((1 - night) * 0.35);
  envU.uGain.value = 1.15 - night * 0.35;
  const rt = pmremGen.fromScene(envScene, 0, 0.1, 50), first = !envRT; if (envRT) envRT.dispose(); envRT = rt;
  SHINY.forEach(m => { m.envMap = rt.texture; m.envMapIntensity = m.userData.envK; if (first) m.needsUpdate = true; });
}
/** 依小時設定光照，回傳太陽方向 */
export function applyTime(h) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, A] = KEYS[i], [h1, B] = KEYS[i + 1], k = THREE.MathUtils.smoothstep(h, h0, h1);
  skyU.top.value.copy(lerpC(A.top, B.top, k)); skyU.mid.value.copy(lerpC(A.mid, B.mid, k)); skyU.bot.value.copy(lerpC(A.bot, B.bot, k)); skyU.sea.value.copy(lerpC(A.sea, B.sea, k));
  const nightK = A.night + (B.night - A.night) * k, dayL = 1 - nightK;
  // 主光與補光的比例（白天）：太陽強一點、天空的補光弱一點，受光面與背光面差三到四倍——參考插畫那種有體積的明暗，
  // 背光面與影子是天空的藍紫色（半球光的天空色），不是灰黑。晚上照舊（月光本來就柔）
  sun.color.copy(lerpC(A.sun, B.sun, k)); sun.intensity = (A.si + (B.si - A.si) * k) * (1 + 0.25 * dayL);
  hemi.color.copy(lerpC(A.hs, B.hs, k)); hemi.groundColor.copy(lerpC(A.hg, B.hg, k)); hemi.intensity = (A.hi + (B.hi - A.hi) * k) * (1 - 0.4 * dayL * (1 - 0.75 * THREE.MathUtils.smoothstep(h, 15.3, 16.8) * (1 - THREE.MathUtils.smoothstep(h, 18.4, 19.3))));   // 黃金時段是逆光：正面全在背光裡，補光留多一點
  scene.fog.color.copy(lerpC(A.fog, B.fog, k));
  renderer.toneMappingExposure = A.exp + (B.exp - A.exp) * k;
  const night = nightK; skyU.night.value = night;
  const day = h >= 6 && h <= 19, t = day ? (h - 6) / 13 : ((h + 24 - 19) % 24) / 11;
  // 白天是側光：早上太陽在東邊的正側面（略偏後），物體邊緣有亮邊、影子斜斜拉長；中午從左前上方（西南、仰角約 50°）照過來——
  // 像參考插畫的主光：建築的正面與左側受光、右側在陰影裡，影子斜斜地往右後方拉長
  const sk = Math.sin(t * Math.PI);
  const dir = day ? new THREE.Vector3(Math.cos(t * Math.PI) * 0.85 - sk * 0.55, sk * 0.42 + 0.22, -0.18 + sk * 0.45) : MOON_L.clone();   // v7.0：中午的太陽更偏左側，影子斜斜往右後方拉長、看得出體積（以前幾乎是順光）   // 夜裡的主光是月光（海面上的銀色反光帶對著月亮）
  // 黃金時段：太陽轉到鏡頭前方、壓低高度 → 逆光、長長的影子朝向鏡頭
  const golden = THREE.MathUtils.smoothstep(h, 15.3, 16.8) * (1 - THREE.MathUtils.smoothstep(h, 18.4, 19.3));
  const sink = THREE.MathUtils.smoothstep(h, 17.0, 18.3);   // 夕陽慢慢沉到海平線
  if (day) { dir.z = THREE.MathUtils.lerp(dir.z, -0.9, golden); dir.y = THREE.MathUtils.lerp(dir.y, 0.32 - sink * 0.22, golden); dir.x = THREE.MathUtils.lerp(dir.x, 0.16, golden); }
  dir.normalize();
  scene.fog.near = (A.fn + (B.fn - A.fn) * k) * FOG.near / 60; scene.fog.far = (A.ff + (B.ff - A.ff) * k) * FOG.far / 150;   // 每個時段自己的霧距（FOG 是整體倍率；雨天由 weather.js 再拉近）
  const dawn = THREE.MathUtils.smoothstep(h, 4.8, 5.9) * (1 - THREE.MathUtils.smoothstep(h, 7.0, 8.4));   // 清晨：粉金的晨光
  skyU.glow.value = Math.max(golden * 0.5, dawn * 0.32); skyU.dawn.value = dawn;
  skyU.sunDir.value.copy(dir); skyU.sunCol.value.copy(sun.color).multiplyScalar(day ? 1 : 0.4);
  const lit = Math.max(night, h > 12 ? THREE.MathUtils.smoothstep(h, 17.3, 18.6) : 1 - THREE.MathUtils.smoothstep(h, 5.4, 6.5));   // v8.7 燈比天黑早一點亮：日落前後二十分鐘逐漸亮起、清晨天亮後才熄（以前直接乘夜晚程度，17:36 全暗、18:30 還很暗）
  lampK.value = lit;
  nightMats.forEach(m => { const gl = m.userData.kind === 'glass'; m.emissiveIntensity = (gl ? lit + (1 - lit) * 0.09 : lit) * (m.userData.glowK ?? (gl ? 0.95 : 1.25)); });   // v7.6 夢幻風：白天的窗也透出一點暖光（屋裡亮著燈的感覺）   // 窗戶是溫暖的琥珀色燈光（參考圖的夜景：家家戶戶的窗都亮著），不會亮成一片白（v6.93 再收：看得到燈框與窗格）
  envState.k = 1 - night * 0.88; ENV_MATS.forEach(m => { if (m.userData.envBase) m.envMapIntensity = m.userData.envBase * envState.k; });
  lamps.forEach(l => { l.intensity = lit * (l.userData.k || 6); });
  refreshEnv(Math.round(h * 10), dir, night);   // k：個別燈的亮度（新島的燈籠路燈比較亮）
  if (water.sea) {
    water.sea.color.copy(lerpC(SEA.day, '#7aa8d8', dawn * 0.6)).lerp(cb.set('#b6a9ca'), golden * sink * 0.6).lerp(cb.set('#1d4680'), THREE.MathUtils.smoothstep(night, 0.3, 0.8));
    water.sea.emissive.copy(skyU.bot.value).multiplyScalar(dawn * 0.08);   // 晨昏的海面映著天色
  }
  return { dir, night, golden, dawn };
}
export function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
setTimeout(() => { initDetail(512).catch(e => console.warn('細節材質未載入：', e)); }, 300);
