/* 潮汐小島 · 水岸效果：沙灘浪花（一層層白浪推上岸再退去，留下濕沙）、沙灘腳印、水面漣漪（落水、魚影、下雨）。 */
import * as THREE from 'three';
import { scene, U, TERRAIN } from './engine.js';
import { N, C, T, tileAt, groundAt, seaMesh, waterAt, waterY, warp } from './terrain.js';

/* 自訂著色器也要跟著滾筒地平線彎曲 */
const BENDV = `uniform float uCurve; uniform float uBendF;
  vec4 bendPos(vec4 mv){ float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; return mv; }`;

/* ---------- 沙灘浪花 ---------- */
const waveU = { uTime: U.uTime, uCurve: U.uCurve, uBendF: U.uBendF, uSea: { value: 0.1 }, uNight: { value: 0 } };
const waveMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: waveU,
  vertexShader: `${BENDV}
    attribute float side; attribute float along; uniform float uSea; varying float vS; varying float vA;
    void main(){ vS = side; vA = along; vec3 p = position; if (side > -0.01) p.y = uSea + 0.02;   // 水線與海面側貼著海平面（隨潮汐升降）
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * bendPos(mv); }`,
  fragmentShader: `uniform float uTime; uniform float uNight; varying float vS; varying float vA;
    float h(float x){ return fract(sin(x * 91.7) * 43758.5453); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
    /* 泡沫的蕾絲紋：一團團氣泡之間有破洞，沿著岸邊斷斷續續 */
    float lace(vec2 p){ float n = vn(p) * 0.6 + vn(p * 2.3 + 4.1) * 0.3 + vn(p * 5.1 + 9.7) * 0.1; return smoothstep(0.38, 0.62, n); }
    void main(){
      float t = uTime, a = vA;
      vec4 c = vec4(0.0);
      if (vS > 0.0) {
        // 海面那一側：一道道碎浪往岸邊推進——寬窄不一、斷斷續續，靠岸越近越碎
        float v = vS;   // 0 = 岸邊，1 = 外海
        for (int k = 0; k < 3; k++) {
          float fk = float(k), p = fract(t * 0.18 + fk / 3.0 + sin(a * 0.4 + fk) * 0.06);
          float pos = 1.0 - p + (vn(vec2(a * 0.7, fk * 3.0)) - 0.5) * 0.08;   // 浪線不是平行的：沿岸前後錯開
          float wid = 0.025 + 0.04 * vn(vec2(a * 1.3 + fk * 7.0, t * 0.1));
          float w = smoothstep(wid, 0.0, abs(v - pos)) * smoothstep(0.0, 0.25, p) * (1.0 - p * 0.5);
          float brk = smoothstep(0.18, 0.5, vn(vec2(a * 0.9 + fk * 11.0, t * 0.15)));   // 有些段落沒有浪
          w *= brk * (0.35 + 0.65 * lace(vec2(a * 4.0, v * 18.0 + t * 0.6)));
          c.a += w * 0.75;
        }
        c.rgb = vec3(1.0);   // 修正：原本每道浪都把白色加一次（最多 3 倍亮），泛光把浪花放大成一條條發亮的白帶
        float shore = smoothstep(0.2, 0.0, v);
        c.a += shore * (0.25 + 0.75 * lace(vec2(a * 3.2 + t * 0.2, v * 24.0 - t * 0.9))) * 0.85;   // 貼著岸邊的泡沫：蕾絲狀的碎泡
        c.a = min(c.a, 0.9);
      } else {
        // 沙灘那一側：一層薄薄的海水推上來再退去，前緣是一條斷續的泡沫，退去後留下濕沙與殘留的泡泡
        float v = -vS;   // 0 = 水線，1 = 沙灘內側
        float reach = 0.55 + 0.4 * sin(t * 0.55 + a * 0.35) * (0.7 + 0.3 * sin(a * 1.3)) + (vn(vec2(a * 1.1, 2.0)) - 0.5) * 0.15;
        float f = clamp(reach, 0.05, 0.95);
        float film = 1.0 - smoothstep(f - 0.08, f, v);
        float lc = lace(vec2(a * 5.0, v * 14.0 + t * 0.4));
        float foam = smoothstep(0.05, 0.0, abs(v - f)) * (0.45 + 0.55 * lc);
        float bubbles = film * smoothstep(0.55, 0.85, lace(vec2(a * 9.0, v * 30.0 - t * 0.3))) * 0.5;   // 薄水膜上的小泡泡
        float wet = (1.0 - smoothstep(0.9, 1.0, v)) * (1.0 - film);
        c = mix(vec4(0.32, 0.25, 0.14, wet * 0.16), vec4(0.6, 0.92, 0.96, 0.16), film);
        float sheen = (1.0 - film) * smoothstep(f + 0.3, f + 0.02, v) * (0.55 + 0.45 * vn(vec2(a * 2.0, t * 0.2)));   // 浪剛退去的濕沙：映著天空的一層淡淡反光，越往上越乾
        c = mix(c, vec4(0.82, 0.9, 1.0, 0.2), sheen * 0.7);
        c = mix(c, vec4(1.0, 1.0, 1.0, 0.85), max(foam, bubbles));
      }
      c.rgb *= mix(1.0, 0.45, uNight);
      gl_FragColor = c;
    }`
});
/** 海岸線：把沙灘與海的格子邊界串成連續折線，再用 Chaikin 演算法磨圓，沿著曲線生成浪花帶 */
function coastLines() {
  const segs = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (T(x, z) !== 0) continue; const X = x - C, Z = z - C;
    if (T(x + 1, z) === -1) segs.push([[X + 1, Z], [X + 1, Z + 1]]);
    if (T(x - 1, z) === -1) segs.push([[X, Z], [X, Z + 1]]);
    if (T(x, z + 1) === -1) segs.push([[X, Z + 1], [X + 1, Z + 1]]);
    if (T(x, z - 1) === -1) segs.push([[X, Z], [X + 1, Z]]);
  }
  const key = p => p[0] + ',' + p[1], at = {};
  segs.forEach((s, i) => s.forEach(p => { (at[key(p)] = at[key(p)] || []).push(i); }));
  const used = new Array(segs.length).fill(false), lines = [];
  const grow = (line, end) => {   // 從端點往外接上相連的線段
    for (;;) {
      const p = line[end === 'tail' ? line.length - 1 : 0], cand = (at[key(p)] || []).filter(i => !used[i]);
      if (!cand.length) return;
      const i = cand[0]; used[i] = true; const s = segs[i], q = key(s[0]) === key(p) ? s[1] : s[0];
      if (end === 'tail') line.push(q); else line.unshift(q);
    }
  };
  segs.forEach((s, i) => {
    if (used[i]) return; used[i] = true;
    const line = [s[0], s[1]]; grow(line, 'tail'); grow(line, 'head');
    const closed = key(line[0]) === key(line[line.length - 1]); if (closed) line.pop();
    lines.push({ pts: line, closed });
  });
  // Chaikin：每段取 1/4 與 3/4 兩點，三次之後直角變成圓弧
  const chaikin = (pts, closed) => {
    const out = [], n = pts.length;
    if (!closed) out.push(pts[0]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  };
  return lines.map(l => { let p = l.pts; for (let k = 0; k < 3; k++) p = chaikin(p, l.closed); p = p.map(q => warp(q[0], q[1])); return { pts: p, closed: l.closed }; });   // 跟地形用同樣的扭曲
}
function buildShore() {
  const P = [], S = [], A = [];           // 浪花帶
  const BP = [], BC = [];                 // 沙灘緩坡（蓋住格子狀的階梯邊緣）
  const OFF = 0.42, ySand = 0.362, WL = 0.6, W_OUT = 1.5, IN = 1.7, SLOPE = 1.8;
  const sand = new THREE.Color('#f1e1b1'), sandWet = new THREE.Color('#e0c78a');
  const push = (x, y, z, s, a) => { P.push(x, y, z); S.push(s); A.push(a); };
  const bpush = (x, y, z, c) => { BP.push(x, y, z); BC.push(c.r, c.g, c.b); };
  // 三角形一律朝上（海岸線串接方向不固定，要依法線校正繞向，不然一半會被背面剔除）
  const btri = (a, b, c) => { const cy = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]); const L = cy >= 0 ? [a, b, c] : [a, c, b]; L.forEach(v => bpush(v[0], v[1], v[2], v[3])); };
  const slopeY = d => (d <= 0 ? ySand - Math.max(0, -d - IN * 0.5) * 0.004 : ySand - (d / SLOPE) * 0.95);   // d：從海岸曲線往海的距離
  coastLines().forEach(({ pts, closed }) => {
    const n = pts.length; if (n < 3) return;
    const nor = pts.map((p, i) => {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      return [tz, -tx];
    });
    let vote = 0; pts.forEach((p, i) => { vote += tileAt(p[0] + nor[i][0] * 0.6, p[1] + nor[i][1] * 0.6) === -1 ? 1 : -1; });
    if (vote < 0) nor.forEach(v => { v[0] = -v[0]; v[1] = -v[1]; });
    // 曲線往海推一點，包住突出的格子角
    const cp = pts.map((p, i) => [p[0] + nor[i][0] * OFF, p[1] + nor[i][1] * OFF]);
    let along = 0; const al = cp.map((p, i) => { if (i) along += Math.hypot(p[0] - cp[i - 1][0], p[1] - cp[i - 1][1]); return along; });
    const at = (i, d) => [cp[i][0] + nor[i][0] * d, cp[i][1] + nor[i][1] * d];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const j = (i + 1) % n, a0 = al[i], a1 = j === 0 ? along + Math.hypot(cp[i][0] - cp[j][0], cp[i][1] - cp[j][1]) : al[j];
      // 緩坡：內側平台（-IN 到 0）＋往海傾斜（0 到 SLOPE），分 4 段
      const ds = [-IN, -IN * 0.5, 0, SLOPE * 0.33, SLOPE * 0.66, SLOPE];
      for (let k = 0; k < ds.length - 1; k++) {
        const d0 = ds[k], d1 = ds[k + 1], c0 = sand.clone().lerp(sandWet, Math.max(0, d0) / SLOPE), c1 = sand.clone().lerp(sandWet, Math.max(0, d1) / SLOPE);
        const q00 = at(i, d0), q01 = at(i, d1), q10 = at(j, d0), q11 = at(j, d1);
        const v00 = [q00[0], slopeY(d0), q00[1], c0], v10 = [q10[0], slopeY(d0), q10[1], c0], v11 = [q11[0], slopeY(d1), q11[1], c1], v01 = [q01[0], slopeY(d1), q01[1], c1];
        btri(v00, v10, v11); btri(v00, v11, v01);
      }
      // 沙灘側水膜：從水線（著色器設成海平面）沿著緩坡往上到內側
      const w0 = at(i, WL), w1 = at(j, WL), i0 = at(i, -0.25), i1 = at(j, -0.25);
      push(w0[0], 0, w0[1], -0.0001, a0); push(i0[0], slopeY(-0.25) + 0.012, i0[1], -1, a0); push(i1[0], slopeY(-0.25) + 0.012, i1[1], -1, a1);
      push(w0[0], 0, w0[1], -0.0001, a0); push(i1[0], slopeY(-0.25) + 0.012, i1[1], -1, a1); push(w1[0], 0, w1[1], -0.0001, a1);
      // 海面側浪線
      const o0 = at(i, WL + W_OUT), o1 = at(j, WL + W_OUT);
      push(w0[0], 0, w0[1], 0.0001, a0); push(w1[0], 0, w1[1], 0.0001, a1); push(o1[0], 0, o1[1], 1, a1);
      push(w0[0], 0, w0[1], 0.0001, a0); push(o1[0], 0, o1[1], 1, a1); push(o0[0], 0, o0[1], 1, a0);
    }
  });
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(BP, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(BC, 3)); bg.computeVertexNormals();
  const beach = new THREE.Mesh(bg, TERRAIN); beach.receiveShadow = true; scene.add(beach);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('side', new THREE.Float32BufferAttribute(S, 1)); g.setAttribute('along', new THREE.Float32BufferAttribute(A, 1));
  const m = new THREE.Mesh(g, waveMat); m.frustumCulled = false; m.renderOrder = 2; scene.add(m);
}

/* ---------- 腳印與漣漪（共用一個貼地的淡出圖片池） ---------- */
const decalTex = (draw) => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; draw(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
const footTex = decalTex(c => { c.fillStyle = 'rgba(90,64,30,0.9)'; c.beginPath(); c.ellipse(32, 38, 13, 20, 0, 0, Math.PI * 2); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(20 + i * 8, 12 + Math.abs(i - 1.5) * 2, 4, 0, 7); c.fill(); } });
const snowFootTex = decalTex(c => { c.fillStyle = 'rgba(150,168,200,0.85)'; c.beginPath(); c.ellipse(32, 36, 14, 22, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(120,140,178,0.6)'; c.beginPath(); c.ellipse(32, 40, 9, 15, 0, 0, Math.PI * 2); c.fill(); });   // 雪地腳印：淡藍灰色的凹痕
const ringTex = decalTex(c => { c.strokeStyle = 'rgba(255,255,255,1)'; c.lineWidth = 5; c.beginPath(); c.arc(32, 32, 26, 0, 7); c.stroke(); });
const decalVert = `${BENDV}
  attribute float aAlpha; varying float vAlpha; varying vec2 vUv;
  void main(){ vUv = uv; vAlpha = aAlpha; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * bendPos(mv); }`;
const decalFrag = `uniform sampler2D map; uniform float uNight; varying float vAlpha; varying vec2 vUv;
  void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(t.rgb * mix(1.0, 0.5, uNight), t.a * vAlpha); }`;
function pool(tex, n) {
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), alpha = new Float32Array(n);
  geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: tex }, uCurve: U.uCurve, uBendF: U.uBendF, uNight: waveU.uNight }, vertexShader: decalVert, fragmentShader: decalFrag });
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.renderOrder = 3; scene.add(im);
  const items = Array.from({ length: n }, () => ({ life: 0, max: 1, x: 0, y: -99, z: 0, r: 0, s: 1, grow: 0 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  let next = 0;
  return {
    add(x, y, z, r, s, max, grow) { const it = items[next]; next = (next + 1) % n; Object.assign(it, { x, y, z, r, s, max, life: max, grow: grow || 0 }); },
    update(dt) {
      items.forEach((it, i) => {
        if (it.life > 0) it.life -= dt;
        const k = Math.max(0, it.life / it.max), size = it.s * (1 + (1 - k) * it.grow);
        alpha[i] = it.grow ? k * k : Math.min(1, k * 3) * 0.7;
        m4.compose(v.set(it.x, it.y, it.z), q.setFromEuler(e.set(0, it.r, 0)), sc.set(size, 1, size * (it.grow ? 1 : 1.4)));
        im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true; geo.attributes.aAlpha.needsUpdate = true;
    }
  };
}
let feet = null, snowFeet = null, rings = null, stepAcc = 0, stepSide = 1, lastX = null, lastZ = null, rainAcc = 0, fishAcc = 0;
export function init() { buildShore(); feet = pool(footTex, 60); snowFeet = pool(snowFootTex, 90); rings = pool(ringTex, 48); }
/** 在水面上產生一圈漣漪 */
export function ripple(x, z, size, y) {
  if (!rings) return;
  const w = waterAt(x, z); const yy = y ?? (w === 'river' ? (waterY(x, z) ?? 0.7) + 0.02 : seaMesh.position.y + 0.03);
  rings.add(x, yy, z, 0, size || 0.5, 1.6, 3);
}
/** 每幀：浪花時間、玩家在沙灘上的腳印、下雨與魚影的漣漪 */
export function update(dt, player, opt) {
  if (!feet) return;
  waveU.uSea.value = seaMesh.position.y; waveU.uNight.value = opt.night || 0;
  const p = player.position;
  if (lastX != null && !opt.inAir) {
    const d = Math.hypot(p.x - lastX, p.z - lastZ);
    const tl = tileAt(p.x, p.z), onSnow = U.uSnow.value > 0.5 && (tl === 1 || tl === 2 || tl === 4);
    if (d > 0 && d < 1 && (tl === 0 || onSnow)) {
      stepAcc += d;
      if (stepAcc > 0.42) {
        stepAcc = 0; stepSide = -stepSide; const a = Math.atan2(p.x - lastX, p.z - lastZ);
        (onSnow ? snowFeet : feet).add(p.x + Math.cos(a) * 0.1 * stepSide, groundAt(p.x, p.z) + 0.012, p.z - Math.sin(a) * 0.1 * stepSide, a, onSnow ? 0.26 : 0.24, onSnow ? 16 : 8, 0);
      }
    }
  }
  lastX = p.x; lastZ = p.z;
  // 下雨：鏡頭附近的水面隨機冒出漣漪
  if (opt.rain > 0.2) {
    rainAcc += dt * 40 * opt.rain;
    while (rainAcc > 1) { rainAcc--; const x = p.x + (Math.random() - 0.5) * 22, z = p.z + (Math.random() - 0.5) * 16; if (waterAt(x, z)) ripple(x, z, 0.25 + Math.random() * 0.2); }
  }
  // 魚影：偶爾在魚的位置冒一圈
  if (opt.fish && opt.fish.length) { fishAcc += dt; if (fishAcc > 1.2) { fishAcc = 0; const f = opt.fish[Math.floor(Math.random() * opt.fish.length)]; if (f && f.m && f.m.visible) ripple(f.m.position.x, f.m.position.z, 0.35); } }
  feet.update(dt); snowFeet.update(dt); rings.update(dt);
}
