/* 潮汐小島 · 住宅的整棟室內（v7.6）
   外觀是怎樣，裡面就是怎樣（同樣的樓層、屋頂斜面、窗形、木架與用色），只是裡面的空間大一些。
   每一戶一個獨立場景：data/interiors_<戶>.js 的 TA.ISLE.INTERIORS[key] = (THREE, kit) => Group（第一次進門時建立，之後重複使用）。
   和在島上一樣走：第三人稱（拖曳轉向、滾輪遠近；碰到牆或天花板鏡頭會拉近）或第一人稱（F），樓梯走上走下、多層樓。
   group.userData：
     spawn [x, y, z, ry]        進門站的位置與面向（ry = 0 面向 +z）
     exit [x, z, r]             一樓走進這個圓就出門（spawn 要在圓外）
     host [x, y, z, ry]         主人在家時站的位置
     spots [{ x, y, z, r, kind, label, name, lines, alone }]   kind：'study'（複習三題）、'look'（說一句這家的小故事）、'hook:名稱'（主程式的專用互動）
     gifts [[x, y, z, ry]]      送給主人的家具擺在這些位置（每格至少 1×1 公尺的空地）
     lights [[x, y, z, 色碼?, 強度倍率?, 光暈?]]   暖色點光，最多 6 盞（光暈大小預設 1；有燈罩的燈給小一點，0 是不要光暈）
     sun [x, y, z]              白天主光（從屋外照進窗戶）的方向，預設前右上方
     cols [[x0, y0, z0, x1, y1, z1]]   額外的碰撞箱
     decor { x, y, z }          玩家家：「我的房間」8 × 8 公尺地板的中心（玩家的家具照存檔的格子擺在這裡，牆與地板標 paper 的換成玩家選的壁紙地板）
   零件標記（userData）：walk 可以站的地板與樓梯坡道（可以是隱藏的網格）、solid 擋路（用外框算碰撞箱）、
     camThrough 不擋鏡頭、prop 不合併（會動的零件）、paper 'wall' | 'floor'（玩家家「我的房間」的牆與地板）。 */
import * as THREE from 'three';
import { camera, U, CURVE, M, skyU, renderer, scene as isle, HZ, sky, WL } from './engine.js';
import { animate } from './chars.js';
import { buildFurniture, furn, rbox, foot } from './room.js';
import { mergeStatic, homes } from './props.js';
import * as props3d from './props3d.js';
import * as grass from './grass.js';
import * as shadows from './shadows.js';
import { LEVEL } from './perf.js';
import { RectAreaLightUniformsLib } from './vendor/RectAreaLightUniformsLib.js';
import * as Audio from './audio.js';
import * as ui from './ui.js';
import * as post from './post.js';
import { I } from './state.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#2b2640');
const hemi = new THREE.HemisphereLight('#fff0e4', '#b39fc2', 1.15), sun = new THREE.DirectionalLight('#fff0d8', 1.8), fill = new THREE.DirectionalLight('#ffe9dc', 0.8);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;   // 主光從屋外照進窗戶（牆和屋頂會擋，地上留下窗形的光）
fill.position.set(0.3, 1, 0.8);   // 屋裡的漫射光：不投影，讓牆面與家具的明暗有層次（只靠半球光整間會灰灰平平的）
scene.add(hemi, sun, sun.target, fill);

/* 窗外：跟著島上時段變色的天空（skyU 的上中下三色），疊上粉白的雲、遠方的淡紫山丘與海平線 */
const VIEWTEX = (() => {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const c = cv.getContext('2d');
  [[90, 150, 70], [170, 130, 56], [330, 110, 64], [410, 150, 48], [250, 190, 40], [60, 230, 36], [460, 220, 34]].forEach(([x, y, r]) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,242,248,0.95)'); g.addColorStop(0.6, 'rgba(255,226,238,0.55)'); g.addColorStop(1, 'rgba(255,226,238,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r * 1.5, r, 0, 0, 7); c.fill();
  });
  c.fillStyle = 'rgba(160,190,226,0.85)'; c.fillRect(0, 392, 512, 120);   // 海
  c.fillStyle = 'rgba(176,156,206,0.95)'; c.beginPath(); c.moveTo(0, 400); [[60, 360], [140, 372], [210, 338], [300, 366], [380, 330], [450, 352], [512, 344]].forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(512, 404); c.lineTo(0, 404); c.fill();   // 遠山
  c.fillStyle = 'rgba(150,186,150,0.95)'; c.beginPath(); c.moveTo(0, 470); [[90, 432], [180, 452], [260, 420], [360, 446], [440, 428], [512, 440]].forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(512, 512); c.lineTo(0, 512); c.fill();   // 近處的草坡
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
/* v7.8 窗外是真的島：進門時從這棟房子在島上的位置拍一張全景（立方體貼圖），窗玻璃依視線方向取這張全景——
   看出去就是房子外面真正的街景、鄰居、樹、海與天空。拍好以前（或找不到房子）用下面的手繪窗景 */
const ENV = { rt: null, on: { value: 0 }, rot: { value: new THREE.Matrix3() } };
const viewMat = new THREE.ShaderMaterial({
  uniforms: { uTop: skyU.top, uMid: skyU.mid, uBot: skyU.bot, uNight: { value: 0 }, map: { value: VIEWTEX }, uEnv: { value: null }, uEnvOn: ENV.on, uEnvRot: ENV.rot },
  vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; uniform float uNight; uniform sampler2D map; uniform samplerCube uEnv; uniform float uEnvOn; uniform mat3 uEnvRot; varying vec2 vUv; varying vec3 vW;
    void main(){
      if (uEnvOn > 0.5) gl_FragColor = vec4(textureCube(uEnv, uEnvRot * normalize(vW - cameraPosition)).rgb * 0.92, 1.0);   // 室內的方向轉成島上的方向（房子的朝向）
      else {
        vec3 s = vUv.y > 0.5 ? mix(uMid, uTop, (vUv.y - 0.5) * 2.0) : mix(uBot, uMid, vUv.y * 2.0);
        vec4 t = texture2D(map, vUv); t.rgb = mix(vec3(dot(t.rgb, vec3(0.3, 0.59, 0.11))), t.rgb, 0.85);   // 畫的窗景收一點飽和，和島上的粉彩一致
        vec3 c = mix(s, t.rgb * mix(1.0, 0.32, uNight), t.a * (1.0 - uNight * 0.35));
        gl_FragColor = vec4(c * 1.1, 1.0);
      }
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
/* 拍全景：借主鏡頭（90 度、正方形）站在房子中央離地 2.2 公尺，依序對著立方體的六個面；每一面用這一面的鏡頭重算草、模型與陰影的剔除（島上的剔除都是照主鏡頭算的）。
   島上不彎曲（室內本來就關掉了；六個面彎的方向不同，接縫會對不上）、地平線遮擋不算、這棟房子的外觀先藏起來（鏡頭在它裡面）。
   畫成 HDR 的線性顏色，和室內一起進後製（調色、泛光）。拍完把鏡頭與狀態還原 */
const FACES = [[1, 0, 0, 0, -1, 0], [-1, 0, 0, 0, -1, 0], [0, 1, 0, 0, 0, 1], [0, -1, 0, 0, 0, -1], [0, 0, 1, 0, -1, 0], [0, 0, -1, 0, -1, 0]];   // 和 three.js 的 CubeCamera 同一組朝向（取樣時不用翻轉）
let envHome = null, envQ = [], envT = 0, envNight = -1, envGold = -1;
const envAt = new THREE.Vector3();
function shoot(faces) {
  if (!envHome) return;
  if (!ENV.rt) ENV.rt = new THREE.WebGLCubeRenderTarget([1024, 768, 512][LEVEL], {   // 立方體貼圖沒有多重取樣：解析度高一點，縮小取樣時邊緣才不會一格一格（標準約 67 MB 顯示記憶體、省電 38 MB、極省電 17 MB）
    type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cam = camera, s = { p: cam.position.clone(), q: cam.quaternion.clone(), up: cam.up.clone(), fov: cam.fov, aspect: cam.aspect, near: cam.near, zoom: cam.zoom, mask: cam.layers.mask }, hz = HZ.d, sp = sky.position.clone(), rt0 = renderer.getRenderTarget(), late = WL.uLate.value;
  const lon = U.uLOn.value; U.uLOn.value = THREE.MathUtils.smoothstep(skyU.night.value, 0.12, 0.6);   // 島上的燈光格子照當下天色（和 glow.js 同一條曲線）
  envHome.g.visible = false; HZ.d = 1e9; WL.uLate.value = 0; sky.position.copy(envAt);
  cam.fov = 90; cam.aspect = 1; cam.near = 1.2; cam.zoom = 1; cam.updateProjectionMatrix();
  for (const f of faces) {
    const F = FACES[f]; cam.layers.mask = s.mask;
    cam.position.copy(envAt); cam.up.set(F[3], F[4], F[5]); cam.lookAt(envAt.x + F[0], envAt.y + F[1], envAt.z + F[2]); cam.updateMatrixWorld();
    shadows.begin(cam, skyU.sunDir.value, envAt); props3d.cull(); grass.cull();
    cam.layers.mask = 1 | post.LATE;   // 水面與透明物在後製的第二階段圖層：這裡一次畫完（水用一般的畫法）
    ENV.rt.texture.generateMipmaps = f === 5;   // 最後一面畫完才產生縮圖層級
    renderer.setRenderTarget(ENV.rt, f); renderer.render(isle, cam);
  }
  renderer.setRenderTarget(rt0);
  envHome.g.visible = true; HZ.d = hz; WL.uLate.value = late; sky.position.copy(sp); U.uLOn.value = lon;
  cam.position.copy(s.p); cam.quaternion.copy(s.q); cam.up.copy(s.up); cam.layers.mask = s.mask;
  Object.assign(cam, { fov: s.fov, aspect: s.aspect, near: s.near, zoom: s.zoom }); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  viewMat.uniforms.uEnv.value = ENV.rt.texture; ENV.on.value = 1; envNight = skyU.night.value;
}
/** 進門：找這一戶在島上的房子，從中央拍六個面 */
function envEnter(key) {
  envHome = homes.find(h => h.owner === key) || null; ENV.on.value = 0; envQ = []; envT = 0; envNight = envGold = -1;
  if (!envHome) return;
  const q = new THREE.Quaternion(); envHome.g.updateMatrixWorld(true); envHome.g.getWorldQuaternion(q);
  ENV.rot.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));   // 室內與房子外觀同一組座標軸（門在 +z）
  const box = new THREE.Box3().setFromObject(envHome.g), c = box.getCenter(new THREE.Vector3());
  envAt.set(c.x, envHome.g.position.y + 2.2, c.z);
  try { shoot([0, 1, 2, 3, 4, 5]); } catch (e) { console.warn('窗外的全景拍攝失敗：', e); ENV.on.value = 0; }
}
/** 待在屋裡：每 90 秒、或天色明顯變了（入夜、黃昏），重拍一次——一格只拍一面，不會卡一下 */
function envTick(dt, night, golden) {
  if (!envHome || !ENV.on.value) return;
  if (envGold < 0) envGold = golden;   // 進門那一次拍的黃昏程度
  envT += dt;
  if (!envQ.length && (envT > 90 || Math.abs(night - envNight) > 0.08 || Math.abs(golden - envGold) > 0.15)) { envQ = [0, 1, 2, 3, 4, 5]; envT = 0; envNight = night; envGold = golden; }
  if (envQ.length) shoot([envQ.shift()]);
}
/* v7.7 夢幻風的窗景：Codex 畫的手繪風景（models/tex_view.js：浮空島、粉白城堡、雲、遠山、海、櫻花與花草坡，天空去背），載入前沿用上面程式畫的 */
{
  const use = url => new THREE.TextureLoader().load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; viewMat.uniforms.map.value = t; });
  if (window.TA && window.TA.VIEW) use(window.TA.VIEW);
  else { const sc = document.createElement('script'); sc.src = (window.__MODEL_BASE || 'src/isle/models/') + 'tex_view.js'; sc.onload = () => { if (window.TA && window.TA.VIEW) use(window.TA.VIEW); }; document.head.appendChild(sc); }
}
/* ---------- v7.8 室內的光與空氣：從朝陽的窗戶斜斜照進來的光束（晚上是淡淡的月光）、光裡與屋裡飄著發亮的微塵、燈的柔和光暈、
   淡淡的暖粉色空氣（大房子的深處微微泛霧）。光束與屋裡的主光都跟著島上真正的太陽方向 ---------- */
const glowTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const beamU = { uCol: { value: new THREE.Color('#fff1d0') }, uAmt: { value: 0 }, uTime: { value: 0 }, uPY: { value: 0 } };
/* 光束是一條條「面向鏡頭的光帶」：沿著光的方向從窗口延伸到地板，帶子繞著光的軸轉向鏡頭（從哪個角度看都是一道柔和的光，不會看到稜角或一條條白線），
   橫向是柔和的高斯分布、從窗口往裡慢慢變淡，順著光的方向看（帶子變成一條線）時淡掉 */
const beamMat = new THREE.ShaderMaterial({ uniforms: beamU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  vertexShader: `attribute vec3 aAxis; attribute vec2 aSA; attribute float aW; attribute float aF; uniform float uPY; varying vec2 vUv; varying float vEnd; varying vec3 vP; varying float vFl;
    void main(){ vFl = 1.0 - smoothstep(1.2, 2.0, abs(aF - uPY)); vec3 P = position + aAxis * aSA.y, ad = normalize(aAxis), tc = normalize(cameraPosition - P);
      P += normalize(cross(ad, tc) + vec3(1e-5)) * aSA.x * aW * (0.5 + aSA.y * 0.2);
      vUv = vec2(aSA.x * 0.5 + 0.5, aSA.y); vEnd = abs(dot(ad, tc)); vP = P; gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0); }`,
  fragmentShader: `uniform vec3 uCol; uniform float uAmt; uniform float uTime; varying vec2 vUv; varying float vEnd; varying vec3 vP; varying float vFl;
    void main(){ float x = (vUv.x - 0.5) * 3.0, along = clamp(vUv.y, 0.0, 1.0);   // 夾住：多重取樣在三角形邊緣外取值，along 略大於 1 時 pow(負數) 是 NaN，泛光後變成一條白線
      float flick = 0.82 + 0.18 * sin(uTime * 0.45 + vP.x * 1.9 + vP.z * 1.4 + vP.y * 2.6);   // 光裡的空氣慢慢流動
      float a = exp(-x * x) * pow(1.0 - along, 1.3) * smoothstep(0.0, 0.12, along) * (1.0 - smoothstep(0.7, 0.97, vEnd)) * vFl * uAmt * flick;
      gl_FragColor = vec4(uCol * a, a); }` });
const dustU = { uTime: { value: 0 }, uAmt: { value: 0 }, uCol: { value: new THREE.Color('#fff2da') }, uMap: { value: glowTex }, uScale: { value: 400 } };
const dustMat = new THREE.ShaderMaterial({ uniforms: dustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
    void main(){ vec3 p = position + vec3(sin(uTime * 0.23 + aSeed * 31.0), sin(uTime * 0.17 + aSeed * 17.0) * 0.8, cos(uTime * 0.2 + aSeed * 23.0)) * 0.2;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = (0.05 + aSeed * 0.06) * uScale / max(-mv.z, 0.3); vA = 0.5 + 0.5 * sin(uTime * (1.1 + aSeed * 2.2) + aSeed * 40.0); }`,
  fragmentShader: `uniform sampler2D uMap; uniform vec3 uCol; uniform float uAmt; varying float vA;
    void main(){ float m = texture2D(uMap, gl_PointCoord).a * vA * uAmt; gl_FragColor = vec4(uCol * m, m); }` });
/** 找窗：窗外的全景貼在哪些面上（室內模型直接用 kit.view()，或複製它但共用 uniforms），同一平面、靠在一起的三角形併成一扇窗，
    算出窗的中心、往屋外的法線、寬高與窗下的地板。地板、屋頂上的與離走得到的地方太遠的（化學家的玻璃穹頂、岳家的大背景）不算 */
function findWins(g, walks) {
  const wb = new THREE.Box3(); walks.forEach(o => wb.expandByObject(o)); if (wb.isEmpty()) return [];
  const rc = wb.getCenter(new THREE.Vector3()), up = new THREE.Vector3(0, 1, 0), V = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], n = new THREE.Vector3(), e = new THREE.Vector3(), cl = [];
  g.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.uniforms || !o.material.uniforms.uEnv) return;
    const p = o.geometry.attributes.position, ix = o.geometry.index, cnt = ix ? ix.count : p.count;
    for (let i = 0; i < cnt; i += 3) {
      V.forEach((v, j) => v.fromBufferAttribute(p, ix ? ix.getX(i + j) : i + j).applyMatrix4(o.matrixWorld));
      n.subVectors(V[1], V[0]).cross(e.subVectors(V[2], V[0])); const ar = n.length() / 2; if (ar < 1e-4) continue; n.normalize();
      if (Math.abs(n.y) > 0.3) continue;
      const cx = (V[0].x + V[1].x + V[2].x) / 3, cy = (V[0].y + V[1].y + V[2].y) / 3, cz = (V[0].z + V[1].z + V[2].z) / 3;
      let k = cl.find(q => Math.abs(q.n.dot(n)) > 0.95 && Math.abs(q.n.x * cx + q.n.y * cy + q.n.z * cz - q.d) < 0.12 && (() => { const u = q.t.x * cx + q.t.z * cz; return u > q.u0 - 0.5 && u < q.u1 + 0.5 && cy > q.y0 - 0.5 && cy < q.y1 + 0.5; })());
      if (!k) { const nn = n.clone(), t = new THREE.Vector3().crossVectors(up, nn).normalize(); k = { n: nn, t, d: nn.x * cx + nn.y * cy + nn.z * cz, u0: 1e9, u1: -1e9, y0: 1e9, y1: -1e9, a: 0 }; cl.push(k); }
      for (const v of V) { const u = k.t.x * v.x + k.t.z * v.z; k.u0 = Math.min(k.u0, u); k.u1 = Math.max(k.u1, u); k.y0 = Math.min(k.y0, v.y); k.y1 = Math.max(k.y1, v.y); }
      k.a += ar;
    }
  });
  const wins = [];
  for (const q of cl) {
    const w = q.u1 - q.u0, h = q.y1 - q.y0; if (w < 0.3 || h < 0.3 || w > 6 || h > 6 || q.a < 0.15) continue;
    const um = (q.u0 + q.u1) / 2, c = new THREE.Vector3(q.t.x * um, (q.y0 + q.y1) / 2, q.t.z * um).addScaledVector(q.n, q.d - q.n.dot(new THREE.Vector3(q.t.x * um, 0, q.t.z * um)) - q.n.y * (q.y0 + q.y1) / 2);
    if (c.x < wb.min.x - 1.5 || c.x > wb.max.x + 1.5 || c.z < wb.min.z - 1.5 || c.z > wb.max.z + 1.5 || c.y < wb.min.y - 0.5 || c.y > wb.max.y + 5) continue;
    const out = q.n.clone(); if (out.x * (c.x - rc.x) + out.z * (c.z - rc.z) < 0) out.negate();
    wins.push({ c, out, t: q.t.clone(), w, h, a: q.a, floor: null });
  }
  return wins.sort((a, b) => b.a - a.a).slice(0, 10);
}
/** 光束：每扇朝著太陽的窗一條光帶（窗的中心 → 順著光的方向到地板稍下方），寬度約窗的大小；朝向鏡頭在著色器裡算 */
function beamGeo(wins, sd) {
  const P = [], AX = [], SA = [], W = [], F = [], IX = [], L = sd.clone().negate();
  for (const w of wins) {
    const face = w.out.dot(sd); if (face < 0.12 || w.w * w.h < 0.8 || Math.min(w.w, w.h) < 0.5) continue;   // 太小、太窄的窗不打光束（遠看會變成一條細白線）
    const fl = w.floor ?? w.c.y - w.h / 2 - 1, len = THREE.MathUtils.clamp((w.c.y - fl) / Math.max(-L.y, 0.15) * 1.1, 1.2, 9), s = w.c.clone().addScaledVector(w.out, -0.08), wd = Math.max(0.6, (w.w + w.h) * 0.42 * Math.sqrt(face));
    const n = P.length / 3;
    for (const [side, al] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { P.push(s.x, s.y, s.z); AX.push(L.x * len, L.y * len, L.z * len); SA.push(side, al); W.push(wd); F.push(fl); }
    IX.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aAxis', new THREE.Float32BufferAttribute(AX, 3));
  g.setAttribute('aSA', new THREE.Float32BufferAttribute(SA, 2)); g.setAttribute('aW', new THREE.Float32BufferAttribute(W, 1)); g.setAttribute('aF', new THREE.Float32BufferAttribute(F, 1)); g.setIndex(IX); return g;
}
const FX = { beam: null, dust: null, halos: [], sky: [], glow: [], sd: new THREE.Vector3(), beamT: 0 };
const _sd = new THREE.Vector3();
/** 屋裡的主光方向：島上真正的太陽（晚上是月亮）換到室內的座標，仰角限制在 17–40 度之間（光才照得進窗、落在地板上） */
function interiorSun(out) {
  out.copy(skyU.sunDir.value).applyMatrix3(_m3.copy(ENV.rot.value).transpose());
  const hz = Math.hypot(out.x, out.z) || 1, y = THREE.MathUtils.clamp(out.y, 0.3, 0.64), k = Math.sqrt(1 - y * y) / hz;
  return out.set(out.x * k, y, out.z * k);
}
const _m3 = new THREE.Matrix3();
function fxEnter() {
  const wins = cur.wins || [];
  wins.forEach(w => { if (w.floor === null) { const p = w.c.clone().addScaledVector(w.out, -0.5); w.floor = floorAt(p.x, p.z, w.c.y - w.h / 2) ?? w.c.y - w.h / 2 - 1; } });
  interiorSun(FX.sd);
  FX.beam = new THREE.Mesh(beamGeo(wins, FX.sd), beamMat); FX.beam.frustumCulled = false; FX.beam.renderOrder = 4; scene.add(FX.beam); extra.push(FX.beam);
  // 微塵：一半在光束裡（窗與地板之間），一半散在走得到的地方
  const wb = new THREE.Box3(); cur.walks.forEach(o => wb.expandByObject(o));
  const pos = [], seed = [], L = FX.sd.clone().negate(), lit = wins.filter(w => w.out.dot(FX.sd) > 0.12);
  for (let i = 0; i < 260; i++) {
    let x, y, z;
    if (lit.length && i < 140) { const w = lit[i % lit.length], k = 0.15 + Math.random() * 1.6; x = w.c.x + w.t.x * (Math.random() - 0.5) * w.w + L.x * k; y = w.c.y + (Math.random() - 0.5) * w.h + L.y * k; z = w.c.z + w.t.z * (Math.random() - 0.5) * w.w + L.z * k; }
    else { x = THREE.MathUtils.lerp(wb.min.x, wb.max.x, Math.random()); z = THREE.MathUtils.lerp(wb.min.z, wb.max.z, Math.random()); y = wb.min.y + 0.4 + Math.random() * Math.max(2.4, wb.max.y - wb.min.y + 2); }
    pos.push(x, y, z); seed.push(Math.random());
  }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  FX.dust = new THREE.Points(dg, dustMat); FX.dust.frustumCulled = false; FX.dust.renderOrder = 5; scene.add(FX.dust); extra.push(FX.dust);
  /* 窗的天光：最大的六扇窗，各放一盞往屋裡、略往下照的柔邊聚光燈（顏色是當下的天色，朝著太陽的窗多一點反射的暖光）。
     燈放在窗外 0.7 公尺：照度隨距離平方變大，放在窗內的話，離燈幾十公分的窗櫺會亮到發白；窗外的燈照不到屋裡朝內的牆面 */
  FX.sky = wins.slice(0, 6).map(w => {
    const l = new THREE.SpotLight('#dfe8ff', 0, 0, 1.15, 1, 2); l.position.copy(w.c).addScaledVector(w.out, 0.7);
    l.target.position.copy(w.c).addScaledVector(w.out, -3).add(new THREE.Vector3(0, -1.3, 0)); scene.add(l, l.target); extra.push(l, l.target);
    return { l, w, a: Math.min(w.w * w.h, 4) };
  });
  // 燈的光暈（暖色、晚上比較大比較亮）
  FX.halos = (cur.ud.lights || []).slice(0, 6).filter(l => l[5] !== 0).map(([x, y, z, c, , h]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(c || '#ffd6a0').multiply(WARM), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.position.set(x, y, z); s.renderOrder = 6; s.userData.h = h ?? 1; scene.add(s); extra.push(s); return s;
  });
  scene.fog = new THREE.Fog('#bfa9b2', 8, 60);
}
function fxTick(dt, t, n, gold) {
  const day = 1 - n; beamU.uTime.value = dustU.uTime.value = t; beamU.uPY.value = P.position.y;
  FX.beamT += dt;
  if (FX.beam && FX.beamT > 1) {   // 太陽慢慢移動：每秒看一次，方向變了就重算光束
    FX.beamT = 0; interiorSun(_sd);
    if (_sd.angleTo(FX.sd) > 0.01) { FX.sd.copy(_sd); FX.beam.geometry.dispose(); FX.beam.geometry = beamGeo(cur.wins || [], FX.sd); }
  }
  sun.position.copy(cur.ctr).addScaledVector(FX.sd, cur.ext + 6); sun.target.position.copy(cur.ctr);
  beamU.uCol.value.set(n > 0.5 ? '#b8c4ff' : '#fff1d0').lerp(_c.set('#ffc890'), gold * day); beamU.uAmt.value = day * (0.42 + gold * 0.35) + n * 0.1;   // 晚上是淡淡的藍紫月光
  dustU.uAmt.value = 0.8 + gold * 0.3 + n * 0.3; dustU.uCol.value.set(n > 0.5 ? '#ffe6b8' : '#fff4dc');   // 晚上的微塵被燈照成暖金色
  dustU.uScale.value = camera.projectionMatrix.elements[5] * renderer.domElement.height * 0.5;
  _c.copy(skyU.mid.value).lerp(skyU.bot.value, 0.5).lerp(_c2.set('#fff0dc'), 0.55);   // 天光：當下天色、帶暖（屋裡的牆與木頭把天光反射成暖色）
  FX.sky.forEach(({ l, w, a }) => { const sunK = Math.max(0, w.out.dot(FX.sd)); l.color.copy(_c).lerp(_c2.set('#ffd9b0'), sunK * 0.4 * day); l.intensity = a * (day * (5.6 + sunK * 3.4 + gold * 1.2) + n * 0.4); });
  FX.halos.forEach((s, i) => { const k = 0.35 + n * 0.65, fl = 1 + Math.sin(t * 2.3 + i * 1.7) * 0.03 * n; s.material.opacity = (0.22 + n * 0.5) * fl; s.scale.setScalar((0.9 + k * 0.7) * fl * s.userData.h); });
  // 屋裡的空氣：只有大房子的深處微微泛霧；霧色是屋裡散射光的亮度（中間調），不會把遠處洗成一片亮白
  if (scene.fog) { scene.fog.color.set(n > 0.5 ? '#3a2d2e' : '#bfa9b2').lerp(_c.set('#c9a593'), gold * day * 0.6); scene.fog.near = 8 + n * 4; scene.fog.far = 60 + n * 16; }
}
/* ---------- v7.9 燈光設計：分層照明與間接照明 ----------
   照室內設計的原則：至少三層光——環境光（吊燈、燈槽打上天花板的間接光）、任務光（書桌與工作台）、重點光（照亮這家最有故事的一面牆或櫃子）；
   間接照明把光源藏起來，光打在天花板與牆面再反射下來：看得到光、看不到燈泡，沒有眩光。同一個空間都是 2700–3000K 的暖光；白天調暗、晚上全亮。
   每一戶在 userData.glow 列出燈具（重要的排前面，超過這台電腦的預算就省略後面的）：
     { kind: 'cove',  a: [x, y, z], b: [x, y, z], n: [nx, nz], c? }   燈槽：a→b 是燈帶（離牆約 0.1 公尺、天花板下 0.3–0.5 公尺），n 是朝屋裡的水平方向；
                                                                      自動做一道擋板與底板（顏色 c，預設奶油白），光往上打亮天花板
     { kind: 'wash',  a, b, n, c? }   洗牆：燈帶藏在天花板邊或頂飾線下（自動做一片小擋板），往下貼著牆照：牆面一片由上往下漸暗的光
     { kind: 'under', a, b }       櫃下／層板下：a→b 是層板底面的前緣，往下照檯面、書與下一層
     { kind: 'kick',  a, b, n }    踢腳／床底／沙發底：貼地的燈帶，往下往外照地板
     { kind: 'spot',  p: [x, y, z], t: [x, y, z], r? }   重點投射燈：p 燈在天花板或樑下，t 照的中心（畫、書櫃、黑板），r 光圈半徑（預設 0.9 公尺）
   燈帶是面光源（RectAreaLight：照度隨面積、距離與角度自然變化，不投影）＋一條發亮的燈條（被擋板或櫃子擋住）。 */
RectAreaLightUniformsLib.init();
const GLOW = { col: new THREE.Color('#ffc690'), spot: new THREE.Color('#ffcf9c'), k: { cove: 13, wash: 9, under: 24, kick: 18 }, rects: [8, 6, 3][LEVEL], spots: [2, 2, 1][LEVEL] };   // v8.0：燈帶與投射燈再暖一點（2700K）
const stripMat = new THREE.MeshBasicMaterial({ color: GLOW.col.clone() }), stripDim = stripMat.clone();   // 燈條：顏色超過 1（HDR），泛光會讓它微微發亮
const _gx = new THREE.Vector3(), _gy = new THREE.Vector3(), _gz = new THREE.Vector3(), _gm = new THREE.Matrix4(), UPV = new THREE.Vector3(0, 1, 0);
/** 一個物件的朝向：本地 x 沿著 t（燈帶方向），本地 -z 朝著 d（光照出去的方向） */
function orient(o, t, d) {
  _gx.copy(t).normalize(); _gz.copy(d).negate().addScaledVector(_gx, _gx.dot(d)).normalize(); _gy.crossVectors(_gz, _gx);
  o.quaternion.setFromRotationMatrix(_gm.makeBasis(_gx, _gy, _gz));
}
function glowBox(w, h, d, m, p, t, face) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.copy(p); orient(o, t, face); o.castShadow = false; o.receiveShadow = true; scene.add(o); extra.push(o); return o; }
function glowEnter() {
  FX.glow = [];
  let nr = 0, ns = 0;
  for (const f of cur.ud.glow || []) {
    if (f.kind === 'spot') {
      if (ns >= GLOW.spots) continue; ns++;
      const p = new THREE.Vector3(...f.p), t = new THREE.Vector3(...f.t), dist = p.distanceTo(t), r = f.r || 0.9;
      const l = new THREE.SpotLight(GLOW.spot, 0, 0, Math.min(0.9, Math.atan(r / dist) * 1.25), 0.6, 2); l.position.copy(p); l.target.position.copy(t); scene.add(l, l.target); extra.push(l, l.target);
      const d = t.clone().sub(p).normalize(), side = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UPV.clone().cross(d);
      glowBox(0.12, 0.12, 0.2, kit.mat('#4a4150', { metalness: 0.6, roughness: 0.4 }, 'metal'), p.clone().addScaledVector(d, -0.04), side, d);   // 小小的投射燈罩（燈泡藏在罩子裡，從旁邊看不到）
      glowBox(0.08, 0.08, 0.01, stripMat, p.clone().addScaledVector(d, 0.065), side, d);
      FX.glow.push({ l, k: 4 * dist * dist });   // 照到的地方比四周亮幾倍、但不會把淺色的畫照成一片白（照度 = 強度 ÷ 距離²）：這家的視覺焦點
      continue;
    }
    if (nr >= GLOW.rects || !GLOW.k[f.kind]) continue; nr++;
    const A = new THREE.Vector3(...f.a), B = new THREE.Vector3(...f.b), len = A.distanceTo(B), mid = A.clone().add(B).multiplyScalar(0.5), t = B.clone().sub(A).normalize();
    const n = new THREE.Vector3(f.n ? f.n[0] : 0, 0, f.n ? f.n[1] : 0); if (n.lengthSq() > 0) n.normalize();
    const d = { cove: UPV.clone().addScaledVector(n, 0.35), wash: new THREE.Vector3(0, -1, 0).addScaledVector(n, -0.25), under: new THREE.Vector3(0, -1, 0), kick: new THREE.Vector3(0, -1, 0).addScaledVector(n, 0.8) }[f.kind].normalize();
    if (f.kind === 'kick') mid.addScaledVector(n, -0.06);   // 踢腳燈縮在家具底下 6 公分：只看得到地上的光
    if (f.kind === 'wash') mid.addScaledVector(n, 0.1);   // 洗牆燈再離牆 0.1 公尺：太貼牆的話，牆頂會照出一條過亮的白線
    const h = { cove: 0.25, wash: 0.3, under: 0.06, kick: 0.06 }[f.kind], l = new THREE.RectAreaLight(GLOW.col, 0, len, h);   // 燈槽與洗牆的發光面寬一點：光暈比較柔
    l.position.copy(mid); orient(l, t, d); scene.add(l); extra.push(l);
    if (f.kind !== 'wash') glowBox(len, 0.03, 0.018, f.kind === 'under' ? stripDim : stripMat, mid.clone().addScaledVector(d, -0.012), t, d);   // 發亮的燈條（洗牆的燈藏在天花板的槽裡，看不到；櫃下的燈條從下面看得到，暗一點不刺眼）
    if (f.kind === 'cove' || f.kind === 'wash') {   // 擋板（與燈槽的底板）：從屋裡一般的視線看不到燈條
      const m = kit.mat(f.c || '#f4ead9', { roughness: 0.8 }, 'plaster'), down = new THREE.Vector3(0, -1, 0);
      // 擋板細一點（像一道頂飾線，短的燈槽才不會看起來像一個盒子），而且整片在發光面外側：不然發光面會把擋板正面照出一條過亮的線
      if (f.kind === 'cove') { glowBox(len + 0.04, 0.14, 0.03, m, mid.clone().addScaledVector(n, 0.16).addScaledVector(down, -0.01), t, n); glowBox(len + 0.04, 0.025, 0.24, m, mid.clone().addScaledVector(n, 0.04).addScaledVector(down, 0.07), t, n); }
      else glowBox(len + 0.04, 0.1, 0.03, m, mid.clone().addScaledVector(n, 0.2).addScaledVector(down, 0.03), t, n);
    }
    FX.glow.push({ l, k: GLOW.k[f.kind] });
  }
}
function glowTick(n) {
  const lv = 0.22 * (1 - n) + n;   // 調光：白天開一點點（間接光一直都在，只是暗），晚上全亮
  FX.glow.forEach(g => { g.l.intensity = g.k * lv; });
  stripMat.color.copy(GLOW.col).multiplyScalar(0.6 + lv * 2.4); stripDim.color.copy(GLOW.col).multiplyScalar(0.5 + lv * 0.7);
}
const _c = new THREE.Color(), _c2 = new THREE.Color();
const glassMat =new THREE.MeshStandardMaterial({ color: '#eef6ff', transparent: true, opacity: 0.18, roughness: 0.08, metalness: 0, depthWrite: false });
const lampMats = new Set(), shadeMats = new Set();
const WARM = new THREE.Color('#ffe8cc');   // v8.0 2700K 的濾色：資料檔寫的燈色多半是奶油白（#ffe0b0），晚上整間看起來是偏冷的白光；乘上它變成琥珀色的暖光
/** 給室內模型用的工具（和住宅外觀的 kit 同一套材質：同色同參數共用；匯出給檢查工具直接建室內） */
export const kit = {
  mat: (c, o, k) => M(c, o, k),
  rbox: (w, h, d, r) => rbox(w, h, d, r || 0),
  view: () => viewMat,
  glass: () => glassMat,
  lamp: c => { const m = M(c || '#ffd9a0', { emissive: new THREE.Color(c || '#ffcf8a'), emissiveIntensity: 1.1 }); lampMats.add(m); return m; },
  /** 透光的燈罩（布、紙、霧玻璃）：晚上燈罩本身透出一層暖光，看得到光、看不到燈泡 */
  shade: c => { const m = M(c || '#f6e6cc', { emissive: new THREE.Color(c || '#f6e6cc').multiply(WARM).multiply(WARM), emissiveIntensity: 0, roughness: 0.9, side: THREE.DoubleSide }, 'fabric'); shadeMats.add(m); return m; },
  furn: id => { const f = furn(id); return f ? buildFurniture(f) : null; },
};

export let inside = false;
let P = null, cur = null, host = null, hostSaved = null, savedP = null, savedCurve = CURVE, onExit = null, armed = false, vy = 0, pull = 1;
const built = new Map(), extra = [], extraCols = [];
const ray = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0), _o = new THREE.Vector3();
export function init(player) { P = player; }
export const has = key => !!(key && I.INTERIORS && I.INTERIORS[key]);
export const hostNow = () => host;
export const spawnYaw = () => (cur && cur.ud.spawn ? cur.ud.spawn[3] ?? Math.PI : Math.PI);

/** 建立一戶（第一次進門時）：收集地板、碰撞箱，依材質合併零件，算出主光的陰影範圍 */
function build(key) {
  if (built.has(key)) return built.get(key);
  const g = I.INTERIORS[key](THREE, kit), ud = g.userData || {}, walks = [], cols = [], papers = [];
  g.updateMatrixWorld(true);
  g.traverse(o => {
    if (o.userData.walk) { walks.push(o); o.userData.prop = true; }
    if (o.userData.paper) { papers.push(o); o.userData.prop = true; }
    if (o.userData.solid) cols.push(new THREE.Box3().setFromObject(o));
    if (o.isMesh) { o.castShadow = !(o.material && o.material.transparent); o.receiveShadow = true; }
  });
  (ud.cols || []).forEach(c => cols.push(new THREE.Box3(new THREE.Vector3(c[0], c[1], c[2]), new THREE.Vector3(c[3], c[4], c[5]))));
  mergeStatic(g, true);
  const isView = o => !!(o.material && o.material.uniforms && o.material.uniforms.uEnv);   // 窗景（玻璃外的那一層）也擋鏡頭：不然鏡頭會從窗戶、門上的小窗穿到屋外
  const blockers = []; g.traverse(o => { if (o.isMesh && o.visible && (isView(o) || !o.userData.camThrough && !(o.material && o.material.transparent))) blockers.push(o); });
  const box = new THREE.Box3().setFromObject(g), ctr = box.getCenter(new THREE.Vector3()), ext = box.getSize(new THREE.Vector3()).length() / 2 + 1;
  const spots = (ud.spots || []).map(s => Object.assign({ y: 0, r: 1.1 }, s));
  const b = { key, g, ud, walks, cols, blockers, spots, ctr, ext, papers, wins: findWins(g, walks) };
  built.set(key, b); return b;
}
function snapshot(o) { return o && { parent: o.parent, position: o.position.clone(), quaternion: o.quaternion.clone(), visible: o.visible }; }
function restore(o, s) { if (!o || !s) return; o.removeFromParent(); if (s.parent) s.parent.add(o); o.position.copy(s.position); o.quaternion.copy(s.quaternion); o.visible = s.visible; o.updateMatrixWorld(true); }

/* 玩家家「我的房間」：照存檔的格子把家具擺進整棟室內（每件可以按 E 查看；入口有「佈置房間」） */
let decorObjs = [], decorCols = [], decorSpots = [];
function placeDecor(dec) {
  decorObjs.forEach(o => scene.remove(o)); decorObjs = []; decorCols = []; decorSpots = [];
  const D = cur.ud.decor; if (!D || !dec) return;
  cur.papers.forEach(o => { o.material = o.userData.paper === 'floor' ? dec.floor : dec.wall; });
  let nl = 0;
  dec.items.forEach(it => {
    const f = furn(it.id); if (!f) return;
    const m = buildFurniture(f), [w, d] = foot(f, it.r), x = D.x + it.x + w / 2 - 4, z = D.z + it.z + d / 2 - 4;
    m.position.set(x, D.y + (f.cat === 'rug' ? 0.001 : 0), z); m.rotation.y = -it.r * Math.PI / 2; m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    scene.add(m); decorObjs.push(m);
    if (f.cat !== 'rug') { m.updateMatrixWorld(true); decorCols.push(new THREE.Box3().setFromObject(m)); decorSpots.push({ x, y: D.y, z, r: Math.max(w, d) / 2 + 0.85, kind: 'furn', label: f.cat === 'bed' ? '睡一覺' : '查看家具', item: it }); }
    if (f.light && nl < 6) { const l = new THREE.PointLight(new THREE.Color('#ffd9a0').multiply(WARM), 1, 0, 2); l.position.set(x, D.y + 1.6, z); l.userData.k = f.light * 0.8; scene.add(l); decorObjs.push(l); nl++; }
  });
  decorSpots.push({ x: D.x, y: D.y, z: D.z + 3.3, r: 1.2, kind: 'hook:decor', label: '佈置房間' });
}
/** 佈置完回來：重新擺家具、換壁紙地板 */
export function refreshDecor(dec) { if (inside && cur && cur.ud.decor) placeDecor(dec); }
/** 「我的房間」入口內側（從佈置的俯視畫面回來時站的位置） */
export const decorAt = () => { const D = cur && cur.ud.decor; return D ? [D.x, D.y, D.z + 3.2, Math.PI] : null; };

/** 進門。opt：host（在家的主人或來作客的島民，或 null）、gifts（送給主人的家具資料）、decor（玩家家：room.ownDecor()）、
    spawn（改從這裡進來 [x, y, z, ry]）、onExit（出門後主程式把角色放回門口） */
export function enter(key, opt = {}) {
  if (inside || !P || !has(key)) return false;
  try { cur = build(key); } catch (e) { console.warn('室內建立失敗：' + key, e); return false; }
  const { g, ud } = cur; scene.add(g);
  extraCols.length = 0;
  (ud.lights || []).slice(0, 6).forEach(([x, y, z, c, k]) => { const l = new THREE.PointLight(new THREE.Color(c || '#ffd6a0').multiply(WARM), 1, 0, 2); l.position.set(x, y, z); l.userData.k = k || 1; scene.add(l); extra.push(l); });
  (opt.gifts || []).slice(0, (ud.gifts || []).length).forEach((f, i) => {
    const s = ud.gifts[i], m = buildFurniture(f); m.position.set(s[0], s[1], s[2]); m.rotation.y = s[3] || 0; m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    scene.add(m); extra.push(m); m.updateMatrixWorld(true); if (f.cat !== 'rug') extraCols.push(new THREE.Box3().setFromObject(m));
  });
  const sd = new THREE.Vector3(...(ud.sun || [0.45, 0.8, 0.55])).normalize();
  sun.position.copy(cur.ctr).addScaledVector(sd, cur.ext + 6); sun.target.position.copy(cur.ctr);
  Object.assign(sun.shadow.camera, { left: -cur.ext, right: cur.ext, top: cur.ext, bottom: -cur.ext, near: 0.5, far: cur.ext * 2 + 14 }); sun.shadow.camera.updateProjectionMatrix();
  placeDecor(opt.decor);
  savedP = snapshot(P); scene.add(P); const sp = opt.spawn || ud.spawn || [0, 0, 0, Math.PI];
  P.position.set(sp[0], sp[1], sp[2]); P.rotation.set(0, sp[3] ?? Math.PI, 0); P.visible = true; vy = 0; armed = false; pull = 1;
  host = opt.host || null; hostSaved = host ? snapshot(host.mesh) : null;
  if (host) {
    const h = ud.host || [0, 0, -1, 0]; scene.add(host.mesh); host.mesh.position.set(h[0], h[1], h[2]); host.mesh.rotation.set(0, h[3] || 0, 0); host.mesh.visible = true;
    host.mesh.userData.look = host.mesh.userData.look || new THREE.Vector3();
    extraCols.push(new THREE.Box3(new THREE.Vector3(h[0] - 0.3, h[1], h[2] - 0.3), new THREE.Vector3(h[0] + 0.3, h[1] + 1.4, h[2] + 0.3)));
  }
  onExit = opt.onExit || null;
  savedCurve = U.uCurve.value; U.uCurve.value = 0; inside = true;
  envEnter(key);   // 窗外：從這棟房子在島上的位置拍全景
  fxEnter();   // 窗光、微塵、燈暈、室內的空氣
  glowEnter();   // 間接照明與重點光
  document.body.classList.add('in-house'); ui.iris(); Audio.sfx('open');
  return true;
}
/** 出門。o.keep：先不出門（切到佈置的俯視畫面），回傳出門的回呼留著下次進來用 */
export function leave(o) {
  if (!inside) return null; inside = false;
  restore(P, savedP); if (host) restore(host.mesh, hostSaved); host = null;
  scene.remove(cur.g); extra.forEach(x => scene.remove(x)); extra.length = 0; extraCols.length = 0; placeDecor(null);
  U.uCurve.value = savedCurve || CURVE; document.body.classList.remove('in-house'); ui.iris(); Audio.sfx('open');
  const cb = onExit; onExit = null; if (o && o.keep) return cb;
  if (cb) cb(); return null;
}

/* ---------- 走路：地板用往下的射線找（樓梯是斜坡），牆與家具用碰撞箱（只擋和身體同高的） ---------- */
const R = 0.26, STEP = 0.45, BODY = 1.5;
function hitCol(x, z, y) {
  const t = b => b.max.y > y + STEP && b.min.y < y + BODY && x > b.min.x - R && x < b.max.x + R && z > b.min.z - R && z < b.max.z + R;
  return cur.cols.some(t) || extraCols.some(t) || decorCols.some(t);
}
function floorAt(x, z, y) { _o.set(x, y + STEP + 0.05, z); ray.set(_o, DOWN); ray.far = STEP + 8; const h = ray.intersectObjects(cur.walks, false)[0]; return h ? h.point.y : null; }
function standAt(x, z, y) { const g = floorAt(x, z, y); if (g === null || hitCol(x, z, Math.max(g, y))) return null; return g; }
const angLerp = (a, b, k) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;

/* ---------- 鏡頭：第三人稱繞著角色（被牆擋住就拉近），第一人稱在眼睛的位置 ---------- */
const tgt = new THREE.Vector3(), want = new THREE.Vector3(), dir = new THREE.Vector3(), eye = new THREE.Vector3(), fw = new THREE.Vector3(), look = new THREE.Vector3(), headP = new THREE.Vector3();
function updateCam(dt, k, yaw, pitch, tilt, zoom) {
  tgt.copy(P.position); tgt.y += 1.25;
  const d = THREE.MathUtils.clamp(2.0 + zoom * 2.2, 2.6, 6), p = THREE.MathUtils.clamp(0.32 + tilt, 0.06, 1.1);
  want.set(Math.sin(yaw) * Math.cos(p) * d, Math.sin(p) * d, Math.cos(yaw) * Math.cos(p) * d).add(tgt);
  dir.copy(want).sub(tgt); const L = dir.length(); dir.divideScalar(L);
  ray.set(tgt, dir); ray.far = L; const hit = ray.intersectObjects(cur.blockers, false)[0];
  const w = hit ? Math.max(0.3, hit.distance - 0.28) / L : 1;
  pull = w < pull ? w : pull + (w - pull) * Math.min(1, dt * 3);   // 被擋住：馬上拉近（不會看穿牆）；不擋了：慢慢退回
  camera.position.copy(tgt).addScaledVector(dir, L * pull); look.copy(tgt);
  if (k > 0) {
    const u = P.userData, hb = (u.gltf && u.gltf.head) || u.head;
    if (hb) hb.getWorldPosition(headP); else headP.copy(P.position).setY(P.position.y + 1.15);
    eye.set(P.position.x + THREE.MathUtils.clamp(headP.x - P.position.x, -0.3, 0.3), THREE.MathUtils.clamp(headP.y, P.position.y + 0.4, P.position.y + 1.6) + 0.03, P.position.z + THREE.MathUtils.clamp(headP.z - P.position.z, -0.3, 0.3));
    const cp = Math.cos(pitch); fw.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp); eye.addScaledVector(fw, 0.1);
    const kk = k * k * (3 - 2 * k); camera.position.lerp(eye, kk); look.lerp(fw.multiplyScalar(10).add(eye), kk);
  }
  camera.lookAt(look);
}

/* ---------- 互動 ---------- */
export function zone() {
  if (!inside || !P) return null;
  if (host) { const m = host.mesh.position; if (Math.abs(m.y - P.position.y) < 1 && Math.hypot(m.x - P.position.x, m.z - P.position.z) < 1.7) return { kind: 'host', label: '聊天' }; }
  const fp = fpNow > 0.5, fx = fp ? -Math.sin(yawNow) : Math.sin(P.rotation.y), fz = fp ? -Math.cos(yawNow) : Math.cos(P.rotation.y);
  let best = null, bd = Infinity;
  (decorSpots.length ? cur.spots.concat(decorSpots) : cur.spots).forEach(s => {
    if (Math.abs(s.y - P.position.y) > 0.9) return;
    const dx = s.x - P.position.x, dz = s.z - P.position.z, d = Math.hypot(dx, dz);
    if (d > s.r || d >= bd || (d > 0.35 && (dx * fx + dz * fz) / d < 0.15)) return;
    best = s; bd = d;
  });
  return best;
}
export function hint() {
  const z = zone(); if (z) return z.label;
  const e = cur && cur.ud.exit; if (e && P.position.y < 0.6 && Math.hypot(P.position.x - e[0], P.position.z - e[1]) < e[2] + 1.0) return '往門口走就出門';
  return '';
}
/** 點地板走過去（觸控） */
export function pick(cx, cy) {
  const m = new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(m, camera); ray.far = 60;
  const h = ray.intersectObjects(cur.walks, false)[0]; return h ? h.point : null;
}

let fpNow = 0, yawNow = 0;
/** 每格：o = { ix, iz, len, moving, run, locked, night, golden, fpK, yaw, pitch, tilt, zoom }（ix、iz 已依鏡頭轉好方向） */
export function tick(dt, t, o) {
  if (!inside) return;
  dt = Math.min(dt, 0.05); fpNow = o.fpK || 0; yawNow = o.yaw || 0;
  let walking = false;
  if (o.moving && !o.locked && o.len > 0) {
    const sp = o.run ? 3.9 : 2.5 * (0.3 + 0.7 * Math.min(1, o.len)), dx = o.ix / o.len * sp * dt, dz = o.iz / o.len * sp * dt, n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
    for (let i = 0; i < n; i++) {
      const px = P.position.x, pz = P.position.z, py = P.position.y;
      let g = standAt(px + dx / n, pz + dz / n, py);
      if (g !== null) { P.position.x += dx / n; P.position.z += dz / n; walking = true; }
      else if ((g = standAt(px + dx / n, pz, py)) !== null) { P.position.x += dx / n; walking = true; }
      else if ((g = standAt(px, pz + dz / n, py)) !== null) { P.position.z += dz / n; walking = true; }
      if (g !== null && g > P.position.y) P.position.y = g;   // 上台階、上樓梯
    }
    P.rotation.y = angLerp(P.rotation.y, Math.atan2(o.ix, o.iz), Math.min(1, dt * 12));
  }
  { // 下樓梯貼著坡道；離地太高（從閣樓邊踩空）才用重力掉下去
    const g = floorAt(P.position.x, P.position.z, P.position.y);
    if (g !== null && g < P.position.y) {
      if (vy === 0 && P.position.y - g < STEP) P.position.y = g;
      else { vy -= 20 * dt; P.position.y = Math.max(g, P.position.y + vy * dt); if (P.position.y === g) vy = 0; }
    } else vy = 0;
  }
  const e = cur.ud.exit;
  if (e) { const d = Math.hypot(P.position.x - e[0], P.position.z - e[1]); if (!armed && d > e[2] + 0.25) armed = true; if (armed && d < e[2] && P.position.y < 0.6) { leave(); return; } }
  animate(P, dt, walking ? (o.run ? 2 : 1) : 0, t);
  if (host) {   // 主人轉頭看你
    const m = host.mesh, want = Math.atan2(P.position.x - m.position.x, P.position.z - m.position.z);
    if (Math.hypot(P.position.x - m.position.x, P.position.z - m.position.z) < 6) m.rotation.y = angLerp(m.rotation.y, want, Math.min(1, dt * 3));
    m.userData.look.copy(P.position); m.userData.look.y += 1.1; animate(m, dt, 0, t);
  }
  const n = THREE.MathUtils.clamp(o.night || 0, 0, 1), gold = o.golden || 0;
  /* v7.8 真實的室內光：屋裡沒有均勻打亮的補光——光從窗戶（天光與直射進來的陽光）和燈來，照度隨距離平方衰減，
     離窗、離燈越遠越暗，角落與屋子深處自然暗下來；只留一點點四處反彈的光（亮面偏暖、背光面與桌底是薰衣草色） */
  const day = 1 - n;
  hemi.color.set(n > 0.5 ? '#d2b296' : '#ffeadb'); hemi.groundColor.set(n > 0.5 ? '#4a3a3c' : '#a893b8');   // v8.0：晚上四處反彈的是燈的暖光（月光只從窗戶進來）
  hemi.intensity = 0.22 * day + 0.15 * n; fill.intensity = 0.1 * day + 0.04 * n; fill.color.set(n > 0.5 ? '#e6cab4' : '#ffdfd0');
  sun.intensity = day * (3.4 - gold * 0.6) + n * 0.35; sun.color.set(n > 0.5 ? '#b9c0ff' : gold > 0.1 ? '#ffcf9a' : '#ffe8cc');
  scene.background.set(n > 0.5 ? '#1d1a34' : '#cbb8de');
  extra.concat(decorObjs).forEach(l => { if (l.isPointLight) l.intensity = (2.4 * day + 10 * n) * l.userData.k; });   // 燈：白天開得小，晚上撐起一圈圈暖光
  lampMats.forEach(m => { m.emissiveIntensity = 0.6 + n * 0.6; });   // v8.0：燈泡與擴散片收一點（以前晚上 1.9，泛光把小小的擴散片暈成一片白）
  shadeMats.forEach(m => { m.emissiveIntensity = 0.04 + n * 0.3; });   // 透光的燈罩：晚上透出一層琥珀色的光
  viewMat.uniforms.uNight.value = n;
  envTick(dt, n, gold);   // 窗外的全景：天色變了就重拍（在擺好室內鏡頭之前，拍完鏡頭已還原）
  fxTick(dt, t, n, gold);
  glowTick(n);
  updateCam(dt, fpNow, yawNow, o.pitch || 0, o.tilt || 0, o.zoom ?? 1);
  const fx = post.fx, dof0 = fx.dof, ao0 = fx.ao;
  fx.golden = Math.max(gold * 0.5, 0.2) * (1 - n); fx.clear = 1; fx.sunVis = 0; fx.night = n * 0.6; fx.focus = camera.position.distanceTo(P.position); fx.dof = dof0 * (fpNow > 0.5 ? 0.15 : 0.35); fx.ao = ao0 * 1.2;   // v7.8：屋裡一直帶一點暖光（亮部奶油、窗與燈的光暈柔一點）
  const lon = U.uLOn.value; U.uLOn.value = 0; U.uInside.value = 1;   // 島上的燈光格子是島上的座標：畫室內時關掉（以前晚上廣場的路燈會照進同一個座標的屋裡）
  post.render(t, scene, camera);
  U.uLOn.value = lon; U.uInside.value = 0;
  fx.dof = dof0; fx.ao = ao0;
}
