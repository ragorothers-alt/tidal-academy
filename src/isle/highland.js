/* 潮汐小島 · 西部高地（v6.15）：島的西邊新長出的一大片地區。
   東緣是一道懸崖，坡道在 z ≈ 10；高地上是松林與竹林、巨石與野花；山頂（高 5）可以三段跳或爬梯子上去，有一張看夕陽海景的長椅；
   高地池塘從懸崖落下一道瀑布，注入下方的水潭。 */
import * as THREE from 'three';
import { scene, M, mesh, U, bend, cullable, renderer } from './engine.js';
import { N, C, T, tileAt, legacyTile, groundAt, WATER_Y, ramp2X, PLANNED, STAIRS, warp, surfaceMat } from './terrain.js';
import { tree, rock, bush, bench, blocked, colliders, seats, wildFlowers, label, rnd, SITES, modelClone, mergeStatic } from './props.js';
import * as ui from './ui.js';
import { register, realize } from './props3d.js';
import * as glow from './glow.js';
import * as Audio from './audio.js';

const PLAN = (window.TA.ISLE || {}).PLAN;
/** 佈置範圍：新島（v6.79）是規劃的西部高地台地與山頂；舊島是 v6.15 新長出的陸地 */
const inWest = PLANNED ? (x, z) => x < -16 && (tileAt(x, z) === 2 || tileAt(x, z) === 5) : (x, z) => x < -21 && legacyTile(x, z) < 0;
/* ---------- 竹子：一叢 5–8 根有竹節的細竿，頂端幾簇竹葉 ---------- */
function bamboo(x, z, s) {
  const g = new THREE.Group(), y = groundAt(x, z); g.position.set(x, y, z);
  const stalk = M('#8fc65a', { roughness: 0.6 }, 'pine'), node = M('#6a9a3e', {}, 'pine'), leaf = M('#6fb24a', {}, 'pine');
  const n = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, r = rnd() * 0.32, h = (2.1 + rnd() * 1.4) * s, px = Math.cos(a) * r, pz = Math.sin(a) * r;
    const st = mesh(new THREE.CylinderGeometry(0.045 * s, 0.055 * s, h, 7), stalk, px, h / 2, pz); st.rotation.set((rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.12); g.add(st);
    for (let k = 1; k < h / 0.42; k++) g.add(mesh(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.035, 7), node, px + st.rotation.z * -k * 0.42 * 0.5, k * 0.42, pz + st.rotation.x * k * 0.42 * 0.5, { noCast: true }));
    for (let k = 0; k < 3; k++) { const lf = mesh(new THREE.SphereGeometry(0.28 * s, 7, 5), leaf, px + (rnd() - 0.5) * 0.4, h - 0.1 - k * 0.3, pz + (rnd() - 0.5) * 0.4); lf.scale.set(1.3, 0.35, 0.8); lf.rotation.y = rnd() * 6; g.add(lf); }
  }
  g.traverse(o => { o.frustumCulled = cullable(o); }); g.userData.prop = { id: 'prop_bamboo', h: 3.4 * s }; scene.add(g); colliders.push({ x, z, r: 0.45 * s });
}
/* ---------- 瀑布：每段崖邊三股有厚度的水舌；水幕、潭面的落水區、旁邊打濕的岩壁合併成一個網格、一個材質（aK.x：0 水幕、1 落水區、2 濕岩壁） ---------- */
const fallU = { uTime: U.uTime, uCurve: U.uCurve, uBendF: U.uBendF, uNight: { value: 0 }, uWet: U.uWet, uSky: U.uSkyRef,   // v9.26 uWet：雨天暗一點；uSky：帶一點低空的天色（傍晚偏暖）
  uBody: { value: new THREE.Color('#C9E9E5') }, uFoam: { value: new THREE.Color('#F1F0F3') }, uShade: { value: new THREE.Color('#BDD2E4') } };
const fallMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.FrontSide, uniforms: fallU,
  vertexShader: `uniform float uCurve; uniform float uBendF; attribute vec2 aK; varying vec2 vUv; varying vec3 vW; varying vec3 vNormal; varying vec2 vK;
    void main(){ vUv = uv; vK = aK; vW = (modelMatrix * vec4(position, 1.0)).xyz; vNormal = mat3(modelMatrix) * normal;
      vec4 mv = modelViewMatrix * vec4(position, 1.0); if (aK.x > 1.5) mv.xyz *= 1.0 - 0.14 / max(length(mv.xyz), 0.5);   // v9.26 濕岩壁：沿視線往鏡頭拉一點，石塊的凹凸才不會把它吃掉（畫面上的位置不變）
      float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uTime; uniform float uNight; uniform float uWet; uniform vec3 uSky; uniform vec3 uBody; uniform vec3 uFoam; uniform vec3 uShade;
    varying vec2 vUv; varying vec3 vW; varying vec3 vNormal; varying vec2 vK;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main(){
      vec4 o; vec3 nk = mix(vec3(1.0), uSky / max(max(uSky.r, uSky.g), max(uSky.b, 0.04)), 0.12) * mix(1.0, 0.24, uNight) * (1.0 - uWet * 0.35);   // 夜裡是月光下的灰藍，不發亮；雨天、傍晚跟著天色（水不自己發光）
      if (vK.x > 1.5) {   // v9.26 水幕兩側與後面的岩壁被水花打濕：暗一截，越靠近水幕、越低越濕，幾道細細往下流的水痕映著天光
        float a = vUv.x, hh = vUv.y, da = max(abs(a) - vK.y, 0.0), wn = n(vec2(a * 3.1, hh * 2.3)) - 0.5;
        float wet = (1.0 - smoothstep(0.02, 0.45, da + wn * 0.3 - (1.0 - hh) * 0.2)) * mix(1.0, 0.5, smoothstep(0.3, 1.0, hh));
        float tr = smoothstep(0.74, 0.95, n(vec2(a * 19.0, hh * 1.4 - uTime * 0.3))) * wet;
        o = vec4(mix(vec3(0.11, 0.11, 0.1), vec3(0.78, 0.82, 0.85) * nk, tr * 0.6), wet * 0.5 + tr * 0.1);
      } else if (vK.x > 0.5) {   // v9.26 落水點（uv：沿崖邊離中心幾公尺、往外離落水線幾公尺）：翻騰的白沫、被沖開往外漂的碎泡、一圈圈往外擴越遠越淡的漣漪
        vec2 p = vUv; float da = max(abs(p.x) - vK.y, 0.0), d = length(vec2(da, max(p.y, 0.0) + max(-p.y, 0.0) * 2.0));
        float b1 = n(p * vec2(6.0, 7.0) + vec2(0.0, -uTime * 1.7)), b2 = n(p * vec2(14.0, 16.0) + vec2(uTime * 0.8, -uTime * 2.6));
        float boil = smoothstep(0.42, 0.82, exp(-d / 0.24) + (b1 * 0.6 + b2 * 0.4 - 0.5) * 0.8);
        float drift = smoothstep(0.58, 0.86, n(vec2(p.x * 4.5, p.y * 2.2 - uTime * 0.5)) * 0.7 + b2 * 0.3) * exp(-d / 0.75) * smoothstep(-0.1, 0.15, p.y);
        float ring = pow(0.5 + 0.5 * sin(d * 17.0 - uTime * 4.2 + (n(p * 2.5) - 0.5) * 3.0), 5.0) * exp(-d / 0.65) * smoothstep(0.08, 0.3, d) * smoothstep(0.3, 0.7, n(p * 2.2 + vec2(uTime * 0.2, 0.0)));   // 一段段斷開的弧，不是一圈圈畫上去的同心圓
        o = vec4(mix(uShade * 0.95, uFoam, max(boil, drift * 0.8)) * nk, clamp(boil * 0.9 + drift * 0.5 + ring * 0.26, 0.0, 0.95) * smoothstep(1.6, 1.0, d));
      } else {
        // v9.24.5 一道道往下拉長的白色水柱，越往下流得越快，水柱之間透得出後面的岩壁；瀑腳是翻騰的白沫（以前是幾片半透明的平滑薄板）
        // v9.26 剛翻過崖邊的水舌是透亮平滑的，彎過石沿的地方映著天光；往下才捲進空氣變白（以前崖頂就是一整片白）
        float y = vUv.y, fy = 1.0 - y, x = vW.z * 5.0, ft = uTime * 2.4, yy = pow(fy, 0.72) * 5.0;
        float s1 = n(vec2(x * 2.2, yy * 1.1 - ft)), s2 = n(vec2(x * 6.0 + 3.0, yy * 2.2 - ft * 1.5)), s3 = n(vec2(x * 15.0 + 7.0, yy * 4.6 - ft * 2.3));
        float jet = smoothstep(0.25, 0.75, n(vec2(vW.z * 2.6 + vK.y * 7.0, yy * 0.2 - uTime * 0.15))), thick = vK.y * mix(0.5, 1.0, jet);   // 一股股粗水柱：水多的地方白而不透，水少的地方只是一層透亮的薄水（vK.y：這一股的水量）
        float streak = s1 * 0.5 + s2 * 0.32 + s3 * 0.18, glass = 1.0 - smoothstep(0.03, 0.2, fy), white = smoothstep(0.62 - 0.26 * thick, 0.84 - 0.2 * thick, streak) * smoothstep(0.04, 0.3, fy);
        float foot = (1.0 - smoothstep(0.02, 0.3, y)) * (0.65 + 0.35 * n(vec2(x * 3.0, uTime * 3.5)));
        vec3 nn = normalize(vNormal), c = mix(uShade * 0.8, uBody, 0.25 + streak * 0.5);
        c = mix(c, uFoam, clamp(white * 0.85 + foot * 0.7, 0.0, 1.0));
        float sh = smoothstep(0.2, 0.9, nn.y) * (0.55 + 0.45 * s1);   // 水舌彎過石沿的地方斜斜映著天空
        c = mix(c, mix(uBody * 0.62, vec3(0.8, 0.87, 0.9), sh), glass * 0.85);
        c *= (0.90 + max(nn.y, 0.0) * 0.10) * nk;
        // v9.24.10 水幕兩側不再是筆直的切邊：邊緣寬窄不一、一直往下流，最外側只剩幾股細流；v9.26 越往下散得越開
        float ex = min(vUv.x, 1.0 - vUv.x), ew = (0.05 + 0.17 * n(vec2(yy * 1.3 - ft * 0.5, vW.z * 2.0 + vUv.x * 3.0))) * (0.6 + 0.9 * fy);
        float edge = smoothstep(ew * 0.2, ew, ex) * mix(smoothstep(0.4, 0.6, streak), 1.0, smoothstep(0.0, 0.24, ex));
        float fade = smoothstep(0.0, 0.1, y + (s2 - 0.5) * 0.06), shell = mix(0.28, 1.0, smoothstep(-0.25, 0.25, nn.x + max(nn.y, 0.0)));   // 底下碎進落水點的白沫裡（以前一條平平的切線）
        float coh = 1.0 - smoothstep(0.08, 0.5, fy + (s1 - 0.5) * 0.2);   // 上段水還是完整的一片（透亮但看得出厚度），往下才散成一條條、中間透出岩壁
        float ln = smoothstep(0.6, 0.9, s3 * 0.6 + s2 * 0.4);   // 完整水片上一條條細細拉長的亮紋
        c = mix(c, mix(uBody * 0.5, uFoam * 0.95, ln) * (0.90 + max(nn.y, 0.0) * 0.10) * nk, coh * (1.0 - glass) * 0.7);
        o = vec4(c, mix(mix(clamp(mix(0.12, 0.42, thick) + white * 0.55 + foot * 0.45, 0.0, 0.96), 0.32 + 0.12 * thick + ln * 0.4, coh), 0.6 + 0.25 * sh, glass) * edge * fade * shell);
      }
      gl_FragColor = o;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
/* 落水點的水霧、水花與白沫：位置全在頂點著色器裡依時間算（以前每格在 JS 裡搬 70 個點）；aS.w 0 水霧、1 水花、2 白沫 */
const mistMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uCurve: U.uCurve, uBendF: U.uBendF, uNight: fallU.uNight, uWet: U.uWet, uVH: { value: 720 }, uCol: { value: new THREE.Color('#EEF1F2') } },
  vertexShader: `uniform float uTime; uniform float uCurve; uniform float uBendF; uniform float uVH; uniform float uNight; attribute vec4 aS; varying float vA; varying float vT;
    void main(){ vec3 p = position; float k, sz, a;
      if (aS.w < 0.5) { k = fract(uTime * (0.2 + aS.x * 0.12) + aS.y);   // 水霧：從落水點慢慢升起、往外飄、越散越大、淡掉
        p += vec3((0.12 + 0.6 * aS.z) * k + sin(uTime * 0.7 + aS.z * 9.0) * 0.05 * k, (0.3 + 0.9 * aS.x) * sqrt(k), (aS.y - 0.5) * 0.5 * k);
        sz = mix(0.18, 0.6 + 0.35 * aS.z, k); a = sin(k * 3.1416) * (0.11 + 0.08 * aS.x); vT = 0.0; }
      else if (aS.w < 1.5) { k = fract(uTime * (0.95 + aS.x * 0.6) + aS.y); float tt = k * 0.62;   // 水花：從落水點拋出去的細小水滴，落回潭面就不見
        p += vec3((0.35 + 1.0 * aS.z) * tt, (0.9 + 1.4 * aS.x) * tt - 4.9 * tt * tt, (aS.y - 0.5) * 1.2 * tt);
        sz = 0.03 + 0.03 * aS.z; a = (1.0 - k) * 0.75 * step(position.y, p.y); vT = 1.0; }
      else { k = fract(uTime * (0.7 + aS.x * 0.5) + aS.y);   // 翻騰的白沫：貼著落水線一團團冒起又消散（低角度看也看得到水砸在潭面上）
        p += vec3((aS.z - 0.3) * 0.3 * k, (0.05 + 0.2 * aS.x) * sqrt(k), (aS.y - 0.5) * 0.15 * k);
        sz = mix(0.12, 0.26 + 0.16 * aS.z, k); a = sin(k * 3.1416) * (0.42 + 0.25 * aS.x); vT = 0.0; }
      vec4 mv = modelViewMatrix * vec4(p, 1.0); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve;
      gl_Position = projectionMatrix * mv; gl_PointSize = min(sz * projectionMatrix[1][1] * uVH * 0.5 / max(-mv.z, 0.1), 256.0); vA = a * (1.0 - uNight * 0.55); }`,
  fragmentShader: `uniform vec3 uCol; uniform float uNight; uniform float uWet; varying float vA; varying float vT;
    void main(){ vec2 d = gl_PointCoord - 0.5; float r2 = dot(d, d) * 4.0; if (r2 > 1.0) discard;
      gl_FragColor = vec4(uCol * mix(1.0, 0.28, uNight) * (1.0 - uWet * 0.35),vA * (vT > 0.5 ? 1.0 - r2 : exp(-r2 * 2.5) * (1.0 - r2)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
let mist = null;
const fr = s => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };   // 固定的亂數（不動 props 的 rnd 序列）
/* 崖壁真正在哪：地形經過扭曲與去階梯，和格子座標會差到 0.3 公尺（以前一段水幕埋在牆裡，只露出兩條白帶）。
   從地形網格挑出瀑布附近的三角形，用水平射線量；只在載入時做一次 */
function cliffProbe(box) {
  const pos = [], v = new THREE.Vector3(), tri = new Array(9), I4 = new THREE.Matrix4();
  scene.children.forEach(o => { if (!o.isMesh || o.material !== surfaceMat) return; o.updateMatrixWorld(); const P = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : P.count, id = o.matrixWorld.equals(I4);
    for (let i = 0; i < n; i += 3) { let inb = false;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(P, I ? I.getX(i + k) : i + k); if (!id) v.applyMatrix4(o.matrixWorld); tri[k * 3] = v.x; tri[k * 3 + 1] = v.y; tri[k * 3 + 2] = v.z; if (v.x > box[0] && v.x < box[1] && v.z > box[2] && v.z < box[3]) inb = true; }
      if (inb) pos.push(...tri); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), rc = new THREE.Raycaster(), o = new THREE.Vector3(), dir = new THREE.Vector3(-1, 0, 0);
  const face = (x, y, z) => { rc.set(o.set(x + 0.8, y, z), dir); rc.far = 1.6; const h = rc.intersectObject(m)[0]; return h ? h.point.x : x; };
  face.dispose = () => { geo.dispose(); m.material.dispose(); };
  return face;
}
function buildFalls() {
  const segs = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) === 6 && T(x + 1, z) === 3) segs.push([x + 1 - C, z - C]);
  if (!segs.length) return;
  segs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const runs = [];
  segs.forEach(([x, z]) => { const last = runs[runs.length - 1]; if (last && last.x === x && last.z + last.width === z) last.width++; else runs.push({ x, z, width: 1 }); });
  // v9.26 水舌從高池水面（起點略沉入）水平流出、順著拋物線彎過崖頂石沿再落下（以前直直立在石沿上、在石沿處折成直角）；三股拋得遠近不同、有的從低一點的缺口流出；末端沉入下潭
  const top = WATER_Y[6] - 0.01, bot = WATER_Y[3], D = top - bot - 0.005, lipY = WATER_Y[6] - 0.6, P = [], UV = [], K = [], wetI = [], poolI = [], poolF = [], sheetI = [], spots = [];   // lipY：崖頂石沿下緣的高度
  const vtx = (x, y, z, u, v, k, hw) => { P.push(x, y, z); UV.push(u, v); K.push(k, hw); };
  const face = cliffProbe([Math.min(...runs.map(r => r.x)) - 1.2, Math.max(...runs.map(r => r.x)) + 1.4, Math.min(...runs.map(r => r.z)) - 1.6, Math.max(...runs.map(r => r.z + r.width)) + 1.6]);   // 地形扭曲最多約 0.6 公尺，再留量射線的範圍
  const rows = 16, cols = 6, LANE = [[0.17, 0.215], [0.51, 0.22], [0.83, 0.2]];
  runs.forEach(({ x: X, z: Z, width }, run) => {
    const zc = Z + width / 2, hw = width / 2, sp = [];
    const lanes = LANE.map(([cf, hf], lane) => { const k = (lane + run) % 3, flow = [0.6, 1.0, 0.8][k];   // flow：這一股的水量；dip：水多的從低一點的缺口流出
      return { center: Z + width * cf, half: width * hf, phase: run * 1.7 + lane * 2.1, flow, dip: [0, 0.05, 0.025][k],
        c0: 0.42 + 0.08 * flow + 0.06 * fr(run * 7.3 + lane * 2.9), x0: -0.2 - 0.06 * fr(run * 3.1 + lane * 5.7 + 1.0) }; });   // c0：水舌拋出去多遠；x0：從崖邊後面多遠開始彎
    const reach = lanes.reduce((s, l) => s + l.x0 + l.c0 * Math.sqrt(D - l.dip), 0) / 3;   // 水舌平均落在崖壁外多遠
    { // 濕岩壁：水幕兩側與後面（先畫，水幕疊在上面）
      const span = hw + 0.55, cw = Math.ceil(span * 2 / 0.2), RW = 4, base = P.length / 3;
      for (let r = 0; r <= RW; r++) for (let j = 0; j <= cw; j++) { const a = -span + j * span * 2 / cw, hh = r / RW, y = bot + 0.01 + hh * (lipY - bot - 0.01), [wx, wz] = warp(X, zc + a); vtx(face(wx, y, wz), y, wz, a, hh, 2, hw); }
      for (let r = 0; r < RW; r++) for (let j = 0; j < cw; j++) { const a = base + r * (cw + 1) + j, b = a + cw + 1; wetI.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    { // 落水區：潭面上翻騰的白沫、往外漂的碎泡、漣漪（uv：沿崖邊離中心幾公尺、往外離落水線幾公尺）
      const span = hw + 0.8, cw = Math.ceil(span * 2 / 0.25), os = [-0.45, -0.2, 0, 0.18, 0.4, 0.7, 1.05, 1.5], base = P.length / 3, E = [];
      for (let j = 0; j <= cw; j++) { const a = -span + j * span * 2 / cw, [wx, wz] = warp(X, zc + a); E.push([a, face(wx, lipY, wz) + reach, wz]); if (Math.abs(a) < hw) sp.push(E[j].slice(1)); }
      for (let i = 0; i < os.length; i++) E.forEach(([a, e, wz]) => vtx(e + os[i], bot + 0.012, wz, a, os[i], 1, hw));
      for (let i = 0; i < os.length - 1; i++) for (let j = 0; j < cw; j++) { const a = base + i * (cw + 1) + j, b = a + cw + 1; (os[i] < 0 ? poolI : poolF).push(a, a + 1, b, a + 1, b + 1, b); }   // 水幕後面的先畫、前面的最後畫（同一個網格不寫深度，靠畫的順序前後遮）
    }
    lanes.forEach(({ center, half, phase, c0, x0, dip, flow }) => {
      const base = P.length / 3, eL = [], idx = [], Dl = D - dip;
      for (let j = 0; j <= cols; j++) { const [wx, wz] = warp(X, center + (j / cols * 2 - 1) * half); eL.push(face(wx, lipY, wz)); }
      for (let back = 0; back < 2; back++) for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
        const t = i / rows, f = Math.pow(t, 1.6), dy = Math.max(Dl * f, 1e-4), u = j / cols, q = u * 2 - 1, mid = 1 - q * q;   // f：落下的比例（崖邊附近的列比較密，彎得圓）
        const c = c0 * (1 + 0.14 * mid), k = c / (2 * Math.sqrt(dy)), nl = Math.hypot(1, k), th = (0.022 + 0.05 * Math.sqrt(f)) * (0.5 + 0.9 * mid) * back;   // 每股中間拋得遠、水舌厚，兩側薄；(1, k) 是往外的法線
        const [, wz] = warp(X, center + q * half * (1 + 0.16 * f + Math.sin(t * 4.5 + phase) * 0.045) + Math.sin(t * 4 + phase) * 0.03 * f);
        vtx(eL[j] + x0 - 0.04 * mid + c * Math.sqrt(dy) - th / nl, top - dip - dy - th * k / nl + Math.sin(q * 2.2 + phase) * 0.008 * Math.pow(1 - t, 5), wz, u, 1 - f, 0, flow);
      }
      const sheet = (rows + 1) * (cols + 1);
      for (let back = 0; back < 2; back++) for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const a = base + back * sheet + i * (cols + 1) + j, b = a + cols + 1;
        if (back) idx.push(a, a + 1, b + 1, a, b + 1, b);
        else idx.push(a, b, b + 1, a, b + 1, a + 1);
      }
      // 封閉兩側與頂／底：側視仍讀得到水舌的厚度。
      for (let i = 0; i < rows; i++) for (const j of [0, cols]) {
        const a = base + i * (cols + 1) + j, b = a + cols + 1;
        if (j === 0) idx.push(a, a + sheet, b + sheet, a, b + sheet, b);
        else idx.push(a, b, b + sheet, a, b + sheet, a + sheet);
      }
      for (const i of [0, rows]) for (let j = 0; j < cols; j++) {
        const a = base + i * (cols + 1) + j;
        if (i === 0) idx.push(a, a + 1, a + 1 + sheet, a, a + 1 + sheet, a + sheet);
        else idx.push(a, a + sheet, a + 1 + sheet, a, a + 1 + sheet, a + 1);
      }
      for (let i = 0; i < idx.length; i += 3) sheetI.push(idx[i], idx[i + 2], idx[i + 1]);   // 上下列朝 -Y、橫列朝 +Z；反轉索引使封閉水帶的正面朝外
    });
    spots.push({ sp, width });
  });
  face.dispose();
  const indices = wetI.concat(poolI, sheetI, poolF);   // 同一個網格裡的畫的順序：濕岩壁、水幕後面的落水區、水幕、水幕前面的落水區
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('aK', new THREE.Float32BufferAttribute(K, 2)); g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere();
  const fall = new THREE.Mesh(g, fallMat); fall.name = 'highland-waterfall'; fall.renderOrder = 3; fall.frustumCulled = false;
  fall.userData.waterfall = { ribbons: runs.length * 3, runs: runs.length, triangles: indices.length / 3 }; scene.add(fall);
  // v9.26 落水點的水霧（慢慢升起、往外飄散）與水花（拋起又落回潭面的細小水滴）：沿著每段水幕的落水線撒點，數量跟著水幕寬度（以前 70 個小點只貼在水面上）
  const MP = [], MS = [];
  spots.forEach(({ sp, width }) => { if (!sp.length) return; const nM = Math.round(18 + 20 * width), nS = Math.round(20 + 22 * width), nC = Math.round(18 + 22 * width);
    for (let i = 0; i < nM + nS + nC; i++) { const s = sp[Math.floor(Math.random() * sp.length)]; MP.push(s[0] + (Math.random() - 0.5) * 0.2, bot + 0.02, s[1] + (Math.random() - 0.5) * 0.25); MS.push(Math.random(), Math.random(), Math.random(), i < nM ? 0 : i < nM + nS ? 1 : 2); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(MP, 3)); geo.setAttribute('aS', new THREE.Float32BufferAttribute(MS, 4));
  mist = new THREE.Points(geo, mistMat); mist.name = 'highland-waterfall-mist'; mist.frustumCulled = false; mist.renderOrder = 4; scene.add(mist);
}
/* ---------- 山頂的祠堂（v6.79 新島）：白石圓頂小亭，四根柱子，中間供著一顆發光的藍水晶 ---------- */
function shrine(x, z) {
  const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
  const m = modelClone('LMMODELS', 'shrine');
  if (m) { g.add(m); realize(g, 'LMMODELS', 'shrine'); } else {   // v9.11 寫實模型
    const stone = M('#efe7d6', {}, 'stone'), gold = M('#d8b45a', { metalness: 0.7, roughness: 0.35 });
    g.add(mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.3, 24), stone, 0, 0.15, 0), mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.18, 24), stone, 0, 0.39, 0));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.3, 10), stone, Math.cos(a) * 1.2, 1.63, Math.sin(a) * 1.2)); }
    g.add(mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.22, 24), stone, 0, 2.86, 0), mesh(new THREE.TorusGeometry(1.42, 0.05, 6, 36).rotateX(Math.PI / 2), gold, 0, 2.98, 0));
    g.add(mesh(new THREE.SphereGeometry(1.35, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#f4efe4', {}, 'stone'), 0, 2.97, 0), mesh(new THREE.ConeGeometry(0.12, 0.6, 8), gold, 0, 4.55, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.8, 12), stone, 0, 0.88, 0), mesh(new THREE.OctahedronGeometry(0.32), M('#9fd8ff', { emissive: '#7fc8ff', emissiveIntensity: 1.0 }), 0, 1.6, 0));
  }
  mergeStatic(g); scene.add(g); register(g); colliders.push({ x, z, r: 0.55 });
  glow.emit({ x, y: groundAt(x, z) + 1.55, z, kind: 'crystal', power: 1.1 });   // 祠堂中央的藍水晶
  [0, 1, 2, 3, 4, 5].forEach(i => { const a = i / 6 * Math.PI * 2 + Math.PI / 6; colliders.push({ x: x + Math.cos(a) * 1.2, z: z + Math.sin(a) * 1.2, r: 0.2 }); });   // 柱子（柱子之間可以走進去）
}
/* ---------- 山頂的梯子：靠近按 E 爬上／爬下 ---------- */
let ladder = null, P = null;
function buildLadder() {
  // 在山頂南側找一個「山頂格子南邊是高地」的地方
  let best = null;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) === 5 && T(x, z + 1) === 2 && T(x - 1, z) === 5 && T(x + 1, z) === 5) { const wx = x - C + 0.5, wz = z - C + 1; if (!best || Math.abs(wx + 37) < Math.abs(best[0] + 37)) best = [wx, wz]; }
  if (!best) return;
  const [x, z] = best, g = new THREE.Group(); g.position.set(x, 3, z + 0.06);
  const wood = M('#9a6a3e', {}, 'stone');
  [-0.32, 0.32].forEach(dx => g.add(mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), wood, dx, 1.15, 0)));
  for (let k = 0; k < 6; k++) g.add(mesh(new THREE.BoxGeometry(0.64, 0.06, 0.07), wood, 0, 0.3 + k * 0.36, 0.02));
  g.rotation.x = -0.12; scene.add(g);
  ladder = { x, z, bottom: [x, z + 0.75], top: [x, z - 0.8] };
}
/* ---------- 佈置：松林、竹林、巨石、野花、灌木，山頂的長椅與石碑 ---------- */
export function build(player) {
  P = player;
  // 山頂：面向西邊大海的長椅、刻著高度的石碑
  let peak = null;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (T(x, z) === 5 && T(x - 1, z) !== 5 && T(x + 1, z) === 5) { const wx = x - C + 0.8, wz = z - C + 0.5; if (!peak || Math.abs(wz - 2) < Math.abs(peak[1] - 2)) peak = [wx, wz]; }
  if (peak && !blocked(peak[0], peak[1], 0.9)) bench(peak[0], peak[1], -Math.PI / 2);
  const view = peak ? [peak[0] + 2.5, peak[1]] : null;   // 長椅後方留空，坐著看海時鏡頭不會被樹擋住
  if (PLANNED && SITES.shrine) shrine(SITES.shrine.x, SITES.shrine.z);
  { const [x, z] = PLANNED && SITES.shrine ? [SITES.shrine.x + 3.4, SITES.shrine.z - 1.2] : [-37, 2]; if (tileAt(x, z) === 5 && !blocked(x, z, 0.6)) { const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
      g.add(mesh(new THREE.BoxGeometry(0.7, 1.1, 0.3), M('#b8b2a6', {}, 'stone'), 0, 0.55, 0));
      const sg = label('潮汐山 · 海拔 5', '#7a8a6a', 1.0, 0.26); sg.position.set(0, 0.8, 0.17); g.add(sg); scene.add(g); colliders.push({ x, z, r: 0.45 }); } }
  let pines = 0, bams = 0, rocks0 = 0;
  if (PLANNED) {   // 規劃的竹林：指定的幾叢＋竹林範圍裡再補一些
    PLAN.props.trees.filter(t => t[0] === 'bamboo').forEach(([, px, pz]) => { const [x, z] = warp(px, pz); if (!blocked(x, z, 0.8)) { bamboo(x, z, 0.9 + rnd() * 0.3); bams++; } });
    PLAN.props.forests.filter(f => f.kind === 'bamboo').forEach(f => { const xs = f.poly.map(p => p[0]), zs = f.poly.map(p => p[1]); for (let k = 0; k < 60 && bams < 16; k++) { const [x, z] = warp(Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs)), Math.min(...zs) + rnd() * (Math.max(...zs) - Math.min(...zs))); if (!blocked(x, z, 1.0) && (tileAt(x, z) === 2 || tileAt(x, z) === 5)) { bamboo(x, z, 0.9 + rnd() * 0.3); bams++; } } });
  }
  for (let k = 0; k < 2600; k++) {
    const x = -48 + rnd() * 30, z = -40 + rnd() * 80, t = tileAt(x, z);
    if (!inWest(x, z) || t < 0 || t === 3 || t === 6 || t === 7 || blocked(x, z, 1.3)) continue;
    if (view && Math.hypot(x - view[0], z - view[1]) < 5) continue;
    if (ramp2X && Math.abs(x - (ramp2X - C + 1)) < 2.5 && Math.abs(z - 10.5) < 2.5) continue;   // 坡道口
    const nearPond = !PLANNED && Math.hypot(x + 30.8, z + 8) < 6;
    if ((t === 2 || t === 5) && nearPond && bams < 12 && rnd() < 0.35) { bamboo(x, z, 0.9 + rnd() * 0.3); bams++; }
    else if ((t === 2 || t === 5) && pines < (PLANNED ? 55 : 95) && rnd() < 0.2) { tree(x, z, 0.85 + rnd() * 0.45, 'cedar'); pines++; }
    else if (t === 1 && rnd() < 0.05) tree(x, z, 0.9 + rnd() * 0.3, rnd() < 0.2 ? 'pink' : 'round');
    else if (t === 0 && rnd() < 0.03) tree(x, z, 1, 'palm');
    else if ((t === 2 || t === 1) && rocks0 < 18 && rnd() < 0.03) { rock(x, z, 1.1 + rnd() * 1.1); rocks0++; }
    else if ((t === 1 || t === 2) && rnd() < 0.03) bush(x, z);
  }
  // 野花草原：山頂與高地上的大片小花
  const pal = ['#eeebe3', '#d8bc56', '#9785b3', '#c58c9b', '#8199c2'];   // v9.17 半寫實：白、芥黃、灰紫、灰粉、矢車菊藍（以前純白、鮮黃、亮紫、亮粉、天藍）
  for (let k = 0; k < 900; k++) {
    const x = -48 + rnd() * 30, z = -40 + rnd() * 80, t = tileAt(x, z);
    if (!inWest(x, z) || (t !== 1 && t !== 2 && t !== 5) || blocked(x, z, 0.5)) continue;
    const c = pal[Math.floor(rnd() * pal.length)];
    for (let j = 0; j < 5; j++) { const fx = x + (rnd() - 0.5) * 1.4, fz = z + (rnd() - 0.5) * 1.4; if (tileAt(fx, fz) === t) wildFlowers(fx, fz, c); }
  }
  // 坡道口的指示牌（新島：西部高地階梯的底端）
  const hs = PLANNED && STAIRS.find(s => /West Highland/.test(s.name)), sp = hs ? warp(hs.a[0] + 1.8, hs.a[1] + 0.6) : ramp2X ? [ramp2X - C + 2.6, 9.2] : null;
  if (sp) { const [x, z] = sp; if (!blocked(x, z, 0.5)) { const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), M('#8a5a3b'), 0, 0.6, 0)); const sg = label(PLANNED ? '西部高地 ↑' : '西部高地 →', '#5aa846', 1.0, 0.26); sg.position.set(0, 1.15, 0.05); sg.rotation.y = PLANNED ? 0 : -Math.PI / 2; g.add(sg); scene.add(g); colliders.push({ x, z, r: 0.25 }); } }
  buildFalls(); if (!PLANNED) buildLadder();   // 新島有通往山頂的祠堂階梯，不用梯子
}
const near = (p, r) => P && Math.hypot(P.position.x - p[0], P.position.z - p[1]) < r;
export function hint() { if (!ladder || !P) return ''; if (near(ladder.bottom, 1.0) && P.position.y < 4) return '爬上山頂'; if (near(ladder.top, 1.0) && P.position.y > 4.5) return '爬下梯子'; return ''; }
export function handler() {
  const h = hint(); if (!h) return null;
  return async () => {
    const up = h === '爬上山頂', to = up ? ladder.top : ladder.bottom;
    Audio.sfx('swish'); P.rotation.y = up ? Math.PI : 0;
    const from = P.position.clone(), y1 = groundAt(to[0], to[1]), t0 = performance.now();
    await new Promise(res => { const step = () => { const k = Math.min(1, (performance.now() - t0) / 700); P.position.set(from.x + (to[0] - from.x) * k, from.y + (y1 - from.y) * k + Math.sin(k * Math.PI) * 0.4, from.z + (to[1] - from.z) * k); if (k < 1) setTimeout(step, 16); else res(); }; step(); });
    if (up) ui.toast('山頂到了！往西邊看，夕陽會落進海裡');
  };
}
export function update(dt, t, night) {
  fallU.uNight.value = night;
  mistMat.uniforms.uVH.value = renderer.domElement.height;   // 水霧點的大小換算成像素用（位置在著色器裡算）
}
