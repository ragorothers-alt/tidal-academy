/* 潮汐小島 · 水岸效果：沙灘浪花（一層層白浪推上岸再退去，留下濕沙）、沙灘腳印、水面漣漪（落水、魚影、下雨）。
   v8.9.1 藍眼淚的夜晚（bluetears.js 設 uBlue）：碎浪與浪花前緣一點一點發出藍光，海邊濕沙上的腳印也亮一下。 */
import * as THREE from 'three';
import { scene, U, TERRAIN, renderer } from './engine.js';
import { N, C, T, tileAt, groundAt, seaMesh, waterAt, waterY, warp, surfaceMat, noise } from './terrain.js';

/* 自訂著色器也要跟著滾筒地平線彎曲 */
const BENDV = `uniform float uCurve; uniform float uBendF;
  vec4 bendPos(vec4 mv){ float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve; return mv; }`;

/* 沙灘緩坡的剖面（buildShore 與水膜著色器共用）：沙面高度、坡長、往海每公尺降多少、坡肩圓角、水膜往岸上鋪多遠、水膜從水線算起的長度 */
const Y_SAND = 0.362, SLOPE = 1.8, S0 = 0.95 / SLOPE, RSH = 0.3, F_IN = 1.4, F_LEN = 2.0;

/* ---------- 沙灘浪花 ---------- */
const waveU = { uTime: U.uTime, uCurve: U.uCurve, uBendF: U.uBendF, uSea: U.uSeaY, uNight: { value: 0 }, uBlue: { value: 0 }, uDim: { value: 1 }, uSky: U.uSkyRef };   // uDim：v9.22.16 陰雨天的天光比較暗；uSea：v9.24.11 和地形的濕沙共用同一個海面高度
const waveMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: waveU,
  vertexShader: `${BENDV}
    attribute float side; attribute float along; attribute float endk; uniform float uSea; varying float vS; varying float vA; varying float vE; varying vec3 vW;
    void main(){ vS = side; vA = along; vE = endk; vec3 p = position; if (side > -0.01) p.y = uSea + 0.02; else p.y = max(p.y, uSea + 0.02);   // 水線與海面側貼著海平面（隨潮汐升降）；v9.24 水膜貼著坡面，泡在海面下的那一段浮在海面上
      vW = p; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * bendPos(mv); }`,
  fragmentShader: `uniform float uTime; uniform float uNight; uniform float uBlue; uniform float uDim; uniform float uSea; uniform vec3 uSky; varying float vS; varying float vA; varying float vE; varying vec3 vW;
    float h(float x){ return fract(sin(x * 91.7) * 43758.5453); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
    /* 泡沫的蕾絲紋：一團團氣泡之間有破洞，沿著岸邊斷斷續續 */
    float lace(vec2 p){ float n = vn(p) * 0.6 + vn(p * 2.3 + 4.1) * 0.3 + vn(p * 5.1 + 9.7) * 0.1; return smoothstep(0.38, 0.62, n); }
    /* v9.24.11 泡沫網：一格格氣泡之間的邊界（到最近兩個格心的距離差）。真的浪沫是白線圍著一個個洞的網，越久洞越大、線越細，最後斷開消失 */
    float cell(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), c = i + g; float d = length(g + fract(sin(vec2(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3)))) * 43758.5453) - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return d2 - d1; }
    float net(float e, float m){ return smoothstep(0.0, 0.3, m - smoothstep(0.0, 0.36, e) * 0.8); }   // m：泡沫多濃。接近 1 是一整團白沫，中間是白線圍著洞，越小線越細，0.07 以下沒有
    float fb(vec2 p){ return vn(p) * 0.6 + vn(p * 2.3 + 4.1) * 0.4; }
    float brk(float m, vec2 p){ return mix(m * (0.2 + 0.8 * smoothstep(0.3, 0.62, vn(p))), m, smoothstep(0.7, 1.0, m)); }   // v9.24.13 把泡沫網打斷：一段有線、一段沒有，不再是一圈圈封閉的多邊形；濃泡的地方照舊成團
    vec2 wp(vec2 p){ return p + (vec2(vn(p * 0.5 + 1.7), vn(p * 0.5 + 8.3)) - 0.5) * 1.1; }   // 把格子扭一扭：泡沫的洞有大有小、不排成整齊的網
    void main(){
      float t = uTime, a = vA;
      vec4 c = vec4(0.0); float foamK = 1.0;   // foamK：這個像素是泡沫（1）還是映著天色的水膜（0）
      if (vS > 0.0) {
        // 海面那一側：一道道碎浪往岸邊推進——寬窄不一、斷斷續續，靠岸越近越碎
        // v9.24.11 每道浪：前緣一小段緻密的白沫，後面留下一片泡沫網，越往後洞越大、線越細（以前是一條寬度差不多的白線，三道疊起來像等高線）；有的段落整段沒有浪
        float v = vS;   // 0 = 岸邊，1 = 外海
        vec2 q = wp(vec2(a * 4.6 + t * 0.03, v * 11.0 + t * 0.05)); float e1 = cell(q), e2 = cell(q * 2.7 + 7.0), m = 0.0;
        for (int k = 0; k < 3; k++) {
          float fk = float(k), p = fract(t * 0.18 + fk / 3.0 + sin(a * 0.4 + fk) * 0.06);
          float pos = 1.0 - p + (vn(vec2(a * 0.7, fk * 3.0)) - 0.5) * 0.1 + (vn(vec2(a * 2.6 + fk * 5.0, t * 0.08)) - 0.5) * 0.04;   // 浪線不是平行的：沿岸前後錯開，再加一層小曲折
          float d = v - pos, tl = (0.05 + 0.2 * vn(vec2(a * 0.9 + fk * 7.0, t * 0.1))) * (0.45 + p);   // d > 0：浪頭後方；tl：泡沫拖多長（越靠岸越長，約 10–80 公分）
          float brk = smoothstep(0.3, 0.6, vn(vec2(a * 0.55 + fk * 11.0, t * 0.08 + fk)));   // 有些段落沒有浪
          float on = smoothstep(-0.012, 0.0, d) * brk * smoothstep(0.0, 0.22, p) * (1.0 - p * 0.3);
          float age = exp(-max(d, 0.0) / tl), cw = 0.015 + 0.03 * vn(vec2(a * 3.0 + fk * 2.0, t * 0.2));
          float crest = (1.0 - smoothstep(cw * 0.4, cw, d)) * (0.75 + 0.35 * vn(vec2(a * 6.0 + fk, t * 0.3)));   // 前緣 3–9 公分的濃泡
          m = max(m, on * max(crest, age * (0.12 + 1.05 * fb(vec2(a * 1.4 + fk * 3.0, d * 6.0 + t * 0.05)))));   // 浪頭後面：一塊濃、一塊淡，不是整條一樣
        }
        float shore = smoothstep(0.13, 0.0, v);   // 岸邊約 30 公分的碎泡
        m = max(m, shore * (0.2 + 0.9 * fb(vec2(a * 2.2 + t * 0.1, v * 9.0 - t * 0.4))));
        c = vec4(0.97, 0.98, 0.97, max(net(e1, brk(m, q * 1.3 + 3.0)), net(e2, brk(m * 0.8, q * 2.9 + 11.0)) * 0.8) * (0.62 + 0.3 * vn(vec2(a * 37.0, v * 90.0))));   // 細泡的質感：不是一片平塗的白
      } else {
        // 沙灘那一側：一層薄薄的海水推上來再退去，前緣是一條斷續的泡沫，退去後留下濕沙與殘留的泡泡
        // v9.24：水膜貼著坡面往上鋪到平台上；水線跟著潮汐沿坡面移動
        // v9.24.11 水膜本身幾乎透明，只在斜看時映著天光（以前是一張帶白邊的淡藍薄片）；前緣的泡沫寬窄不一、有斷口，後面拖著一片漸散的泡沫網；浪退之後沙上留下幾秒才消的細泡
        float d = -vS - 2.0, dW = (${Y_SAND} - uSea) / ${S0.toFixed(4)} + ${(RSH / 2).toFixed(3)};   // d：離海岸曲線多遠（往海為正）；dW：現在的水線在哪
        float v = (dW - d) / ${F_LEN.toFixed(1)};   // 0 = 水線，1 = 往岸上兩公尺
        float amp = 0.24 * (0.7 + 0.3 * sin(a * 1.3)), ph = t * 0.55 + a * 0.35;
        float reach = 0.3 + amp * sin(ph) + (vn(vec2(a * 1.1, 2.0)) - 0.5) * 0.12 + (vn(vec2(a * 0.45, t * 0.07)) - 0.5) * 0.2;
        float f = clamp(reach, 0.04, 0.78) + (vn(vec2(a * 4.0, t * 0.22)) - 0.5) * 0.03 + (vn(vec2(a * 12.0, t * 0.3)) - 0.5) * 0.012;   // 前緣不是平滑的弧線：幾十公分一個小舌頭，再加幾公分的碎齒
        float film = 1.0 - smoothstep(f - 0.02, f, v), dd = f - v;   // dd > 0：水膜前緣後方（往海那一側）
        vec2 q = wp(vec2(a * 5.5, (v - f * 0.6) * 11.5)); float e1 = cell(q), e2 = cell(q * 2.7 + 3.0);   // 泡沫大半跟著水走
        float fw = 0.01 + 0.05 * smoothstep(0.25, 0.8, vn(vec2(a * 2.3 + 9.0, t * 0.12)));   // 前緣的泡沫 2–12 公分寬
        float fringe = smoothstep(-0.008, 0.0, dd) * (1.0 - smoothstep(fw * 0.35, fw, dd)) * (0.3 + 0.8 * smoothstep(0.2, 0.55, vn(vec2(a * 1.7 + 3.1, t * 0.09))));   // 一段濃、一段幾乎沒有
        float age = clamp(dd / 0.4, 0.0, 1.0);
        float m = max(fringe, film * (1.0 - age) * (1.0 - age) * (0.05 + 1.1 * fb(vec2(a * 1.5 + 3.1, (v - f) * 5.0 + t * 0.05))) * smoothstep(0.0, 0.02, dd));   // 前緣後面 80 公分內漸散的泡沫：一塊濃、一塊只剩細線
        float trail = max(net(e1, brk(m, q * 1.3 + 3.0)), net(e2, brk(m * 0.8, q * 2.9 + 11.0)) * 0.8) * (0.72 + 0.28 * vn(vec2(a * 37.0, v * 75.0)));
        // 浪退之後留在沙上的細泡：這一點上次被水蓋住是多久以前（由主要的那一道來回算），兩三秒內淡掉
        float sv = clamp((v - 0.3) / amp, -0.98, 0.98), since = mod(ph - (3.14159 - asin(sv)), 6.28318);
        float lk = (1.0 - film) * step(abs((v - 0.3) / amp), 0.98) * exp(-since * 1.6), left = 0.0;
        if (lk > 0.1) left = smoothstep(0.72, 0.9, vn(vec2(a * 46.0, v * 95.0)) * 0.6 + vn(vec2(a * 17.0 + 3.0, v * 35.0)) * 0.4 + lk * 0.22) * lk * fb(vec2(a * 1.9 + 5.0, v * 4.0)) * 0.6;   // v9.24.13 剛退水的沙上留下一點一點的碎泡（以前也是網狀的線，印在裸沙上看得出網孔）
        vec3 Vw = normalize(cameraPosition - vW); float F = 0.02 + 0.98 * pow(1.0 - max(Vw.y, 0.0), 5.0);
        float thick = film * (0.3 + 0.7 * (1.0 - smoothstep(0.0, f, v)));   // 水膜靠海那一側厚、前緣薄得幾乎看不見
        c = vec4(uSky * 0.9, film * (0.02 + 0.05 * thick + 0.55 * F));   // 清水：正著看幾乎看不見，斜著看映著低空的天色
        float sheen = (1.0 - film) * (1.0 - smoothstep(f + 0.01, f + 0.13, v)) * (0.55 + 0.45 * vn(vec2(a * 2.0, t * 0.2)));   // 浪剛退去的濕沙：映著天空的一層淡淡反光，越往上越乾
        c = mix(c, vec4(uSky * 0.95, 0.05 + 0.3 * F), sheen * 0.7);
        foamK = max(trail, left); c = mix(c, vec4(0.97, 0.98, 0.97, 0.82), foamK);
        c.a *= smoothstep(-0.01, 0.012, v) * smoothstep(${(-F_IN).toFixed(2)}, ${(-F_IN + 0.2).toFixed(2)}, d);   // 海面下的那一段不畫；網格內緣淡出
      }
      c.rgb *= mix(vec3(1.0), mix(vec3(1.0), vec3(0.1, 0.12, 0.17), foamK), uNight) * mix(1.0, uDim, foamK);   // v9.22.16 浪花不受光照：夜裡只有冷冷的月光那麼亮，雨天再暗一點；v9.24.11 夜裡再暗一點（0.22 → 0.1，白邊在暗藍的海上太突出），水膜的天色本來就跟著天暗
      if (uBlue > 0.001) {   // 藍眼淚：浪花裡的夜光藻被拍打就發光——一點一點閃，泡沫越濃越亮；亮度超過 1，泛光讓它真的像在發光（濕沙與水膜不亮）
        float spk = vn(vec2(a * 13.0 + t * 0.7, abs(vS) * 46.0 - t * 1.9)), k = uBlue * smoothstep(0.2, 0.5, c.a) * foamK;
        c.rgb = mix(c.rgb, vec3(0.05, 0.45, 1.0) * (1.5 + 2.8 * smoothstep(0.45, 0.95, spk)), k);
        c.a = mix(c.a, min(1.0, c.a * (0.95 + 0.9 * spk)), k);
      }
      c.a *= vE; gl_FragColor = c;
    }`
});/** 海岸線：把沙灘與海的格子邊界串成連續折線，再用 Chaikin 演算法磨圓，沿著曲線生成浪花帶 */
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
  const P = [], S = [], A = [], EK = [];           // 浪花帶（EK：v9.24.4 海岸線斷開的兩端淡出，不留一道直邊）
  const BP = [], BC = [], BN = [], BS = [];        // 沙灘緩坡（蓋住格子狀的階梯邊緣）；BS：v9.23.1 表面分類（沙＋離浪多近）
  const OFF = 0.5, ySand = Y_SAND, WL = 0.6, W_OUT = 2.4, IN = 1.7;   // v9.22.12 碎浪帶 1.5 → 2.4 公尺；v9.22.20 OFF 0.42 → 0.5（海岸線磨平後，2:1 的斜階梯凸角也包得住）
  const sandWet = new THREE.Color('#e0c78a');
  const push = (x, y, z, s, a, e) => { P.push(x, y, z); S.push(s); A.push(a); EK.push(e); };
  const bpush = (x, y, z, c, nr, wt) => { BP.push(x, y, z); BC.push(c.r, c.g, c.b); BN.push(nr[0], nr[1], nr[2]); BS.push(0, 1, -wt, 0); };
  // v9.23.1 緩坡的沙色跟內側的沙地同一套（terrain.js 的 sandC）：以前緩坡是比較黃、比較亮的另一種沙，和沙地之間有一條明顯的色差線。往海的坡面才漸漸偏暖
  const SA = new THREE.Color('#e8d8bc'), SB = new THREE.Color('#d9cdb8');
  const col = (q, d) => SA.clone().lerp(SB, noise(q[0] * 0.5, q[1] * 0.5) * 0.7).lerp(sandWet, Math.max(0, d) / SLOPE * 0.8);
  const wetAt = d => Math.max(0, Math.min(1, (d + 1.15) / 1.0));   // v9.23.1 浪推得到的範圍：坡肩往岸上約一公尺內漸漸變濕
  // 三角形一律朝上（海岸線串接方向不固定，要依法線校正繞向，不然一半會被背面剔除）
  const btri = (a, b, c) => { const cy = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]); const L = cy >= 0 ? [a, b, c] : [a, c, b]; L.forEach(v => bpush(v[0], v[1], v[2], v[3], v[4], v[5])); };
  // d：從海岸曲線往海的距離。v9.22.20 坡肩是圓的（前 RSH 公尺坡度慢慢加大），以前平台和坡面之間是一道折線
  const slopeY = d => (d <= 0 ? ySand - Math.max(0, -d - IN * 0.5) * 0.022 : ySand - S0 * (d < RSH ? d * d / (2 * RSH) : d - RSH / 2));   // v9.23.9 內緣沉到沙地底下約 7 公釐（以前高出 9 公釐，接縫是一條有陰影的細線）
  const slopeG = d => (d <= 0 ? 0 : S0 * Math.min(1, d / RSH));   // 往海每公尺降多少（算法線用）
  coastLines().forEach(({ pts: raw, closed }) => {
    const n = raw.length; if (n < 3) return;
    // v9.22.20 海岸線位置也磨平（沿線約 ±1.5 公尺的加權平均）：格子的斜邊磨圓後還是一公尺一個波浪，緩坡跟著一個個鼓出來，從海上看像一階階的沙壁
    const KP = closed ? Math.min(12, Math.floor((n - 1) / 2)) : 12;
    const pts = raw.map((p, i) => { const k = closed ? KP : Math.min(KP, i, n - 1 - i); let sx = 0, sz = 0, sw = 0;
      for (let o = -k; o <= k; o++) { const q = raw[closed ? (i + o + n) % n : i + o], w = 1 - Math.abs(o) / (k + 1); sx += q[0] * w; sz += q[1] * w; sw += w; }
      return [sx / sw, sz / sw]; });
    const nor = pts.map((p, i) => {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      return [tz, -tx];
    });
    let vote = 0; pts.forEach((p, i) => { vote += tileAt(p[0] + nor[i][0] * 0.6, p[1] + nor[i][1] * 0.6) === -1 ? 1 : -1; });
    if (vote < 0) nor.forEach(v => { v[0] = -v[0]; v[1] = -v[1]; });
    // v9.22.12 緩坡與浪花帶改用平滑過的法線：格子海岸的斜邊是一階一階的，磨圓後法線左右擺動，往外推兩公尺多的浪花帶就一片片交疊，浪線交錯成一條條直線
    const K = 12, n12 = nor.map((v0, i) => { let sx = 0, sz = 0; for (let k = -K; k <= K; k++) { let j = i + k; if (closed) j = (j + n) % n; else if (j < 0 || j >= n) continue; const w = 1 - Math.abs(k) / (K + 1); sx += nor[j][0] * w; sz += nor[j][1] * w; } const l = Math.hypot(sx, sz); return l > 0.3 * (K + 1) ? [sx / l, sz / l] : v0; });
    // v9.22.21 碎浪帶往外海推的方向再平滑一層（沿岸約 ±5 公尺）：格子海岸每三四公尺一個台階，只平滑 ±1.5 公尺時，往外三公尺的浪花帶在每個內彎收成一點又摺回來，浪線就折成一個個 V
    const KW = closed ? Math.min(40, Math.floor(n / 6)) : 40;
    const nw = n12.map((v0, i) => { let sx = 0, sz = 0; for (let k = -KW; k <= KW; k++) { let j = i + k; if (closed) j = (j + n) % n; else if (j < 0 || j >= n) continue; const w = 1 - Math.abs(k) / (KW + 1); sx += n12[j][0] * w; sz += n12[j][1] * w; } const l = Math.hypot(sx, sz); return l > 0.3 * (KW + 1) ? [sx / l, sz / l] : v0; });
    // v9.22.21 格子小凹口（海往沙裡凹一格）的急彎：往海推到緩坡外緣時曲線會倒退打結，水線、水膜跟著摺成 V。那一小段改用 nw，兩旁 2 公尺內漸變；凸出的岬角不會打結，維持原方向，側面的格子牆才包得住
    const DF = OFF + SLOPE, mark = new Uint8Array(n), beta = new Float32Array(n);
    let ns = n12;
    for (let it = 0; it < 4; it++) {
      let nf = 0;
      for (let i = 0; i < (closed ? n : n - 1); i++) { const j = (i + 1) % n, bx = pts[j][0] - pts[i][0], bz = pts[j][1] - pts[i][1], ox = bx + (ns[j][0] - ns[i][0]) * DF, oz = bz + (ns[j][1] - ns[i][1]) * DF;
        if (ox * bx + oz * bz < 0.25 * (bx * bx + bz * bz) && !(mark[i] && mark[j])) { mark[i] = mark[j] = 1; nf++; } }   // 往外推的那條線縮到不到四分之一長、甚至倒退
      if (!nf) break;
      for (let i = 0; i < n; i++) { let b = 0; for (let k = -16; k <= 16; k++) { let j = i + k; if (closed) j = (j + n) % n; else if (j < 0 || j >= n) continue; if (mark[j]) b = Math.max(b, 1 - Math.abs(k) / 17); } beta[i] = b; }
      ns = n12.map((v, i) => { const b = beta[i], x = v[0] * (1 - b) + nw[i][0] * b, z = v[1] * (1 - b) + nw[i][1] * b, l = Math.hypot(x, z) || 1; return [x / l, z / l]; });
    }
    // 曲線往海推一點，包住突出的格子角（v9.22.20 順著平滑的法線推）
    const cp = pts.map((p, i) => [p[0] + ns[i][0] * OFF, p[1] + ns[i][1] * OFF]);
    let along = 0; const al = cp.map((p, i) => { if (i) along += Math.hypot(p[0] - cp[i - 1][0], p[1] - cp[i - 1][1]); return along; });
    const at = (i, d) => [cp[i][0] + ns[i][0] * d, cp[i][1] + ns[i][1] * d];
    // 內凹的海灣：浪花帶推到會和鄰段交疊之前就停（寬度不超過彎曲半徑），再讓寬度沿岸慢慢變化
    const wraw = nw.map((v0, i) => { const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1), b = closed ? (i + 1) % n : Math.min(n - 1, i + 1), R = W_OUT;
      const wa = at(a, WL), wb = at(b, WL), din = Math.hypot(wb[0] - wa[0], wb[1] - wa[1]), dout = Math.hypot(wb[0] + nw[b][0] * R - wa[0] - nw[a][0] * R, wb[1] + nw[b][1] * R - wa[1] - nw[a][1] * R);
      if (a === b || din < 1e-4 || dout >= din) return W_OUT;
      const th = Math.acos(Math.min(1, nw[a][0] * nw[b][0] + nw[a][1] * nw[b][1])); return Math.max(0.6, Math.min(W_OUT, 0.85 * din / Math.max(th, 1e-4))); });
    const wo = wraw.map((w, i) => { let m = w; for (let k = -8; k <= 8; k++) { let j = i + k; if (closed) j = (j + n) % n; else if (j < 0 || j >= n) continue; m = Math.min(m, wraw[j] + Math.abs(k) * 0.08); } return m; });
    const out = i => { const w = at(i, WL); return [w[0] + nw[i][0] * wo[i], w[1] + nw[i][1] * wo[i]]; };   // 浪花帶外緣
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const j = (i + 1) % n, a0 = al[i], a1 = j === 0 ? along + Math.hypot(cp[i][0] - cp[j][0], cp[i][1] - cp[j][1]) : al[j];
      const ek = a => (closed ? 1 : THREE.MathUtils.smoothstep(Math.min(a, along - a), 0.1, 1.8)), e0 = ek(a0), e1 = ek(a1);
      // 緩坡：內側平台（-IN 到 0）＋往海傾斜（0 到 SLOPE）。v9.22.20 坡肩多切幾段、法線照坡度算（平滑的明暗），以前三段平面的折痕像一層層台階
      const ds = [-IN, -IN * 0.5, -0.55, -0.3, 0, 0.1, 0.2, 0.3, 0.5, 0.75, 1.0, 1.4, SLOPE];
      const nrm = (k, d) => { const g = slopeG(d), l = Math.hypot(ns[k][0] * g, 1, ns[k][1] * g); return [ns[k][0] * g / l, 1 / l, ns[k][1] * g / l]; };
      for (let k = 0; k < ds.length - 1; k++) {
        const d0 = ds[k], d1 = ds[k + 1];
        const q00 = at(i, d0), q01 = at(i, d1), q10 = at(j, d0), q11 = at(j, d1);
        const v00 = [q00[0], slopeY(d0), q00[1], col(q00, d0), nrm(i, d0), wetAt(d0)], v10 = [q10[0], slopeY(d0), q10[1], col(q10, d0), nrm(j, d0), wetAt(d0)], v11 = [q11[0], slopeY(d1), q11[1], col(q11, d1), nrm(j, d1), wetAt(d1)], v01 = [q01[0], slopeY(d1), q01[1], col(q01, d1), nrm(i, d1), wetAt(d1)];
        btri(v00, v10, v11); btri(v00, v11, v01);
      }
      // 沙灘側水膜：從水線（著色器設成海平面）沿著緩坡往上到內側
      // v9.24：一條條貼著坡面（高 1.2 公分），從坡腳一路鋪到平台上 1.4 公尺；side = -(2 + d)，著色器由 d 與潮位算出離水線多遠
      const FD = [1.3, 1.0, 0.75, 0.6, 0.45, 0.3, 0.2, 0.1, 0, -0.3, -0.7, -1.1, -F_IN], fy = d => Math.max(slopeY(d), ySand - 0.012) + 0.012;
      for (let k = 0; k < FD.length - 1; k++) {
        const d0 = FD[k], d1 = FD[k + 1], p00 = at(i, d0), p10 = at(j, d0), p01 = at(i, d1), p11 = at(j, d1);
        push(p00[0], fy(d0), p00[1], -2 - d0, a0, e0); push(p01[0], fy(d1), p01[1], -2 - d1, a0, e0); push(p11[0], fy(d1), p11[1], -2 - d1, a1, e1);
        push(p00[0], fy(d0), p00[1], -2 - d0, a0, e0); push(p11[0], fy(d1), p11[1], -2 - d1, a1, e1); push(p10[0], fy(d0), p10[1], -2 - d0, a1, e1);
      }
      const w0 = at(i, WL), w1 = at(j, WL);
      // 海面側浪線
      const o0 = out(i), o1 = out(j);
      push(w0[0], 0, w0[1], 0.0001, a0, e0); push(w1[0], 0, w1[1], 0.0001, a1, e1); push(o1[0], 0, o1[1], 1, a1, e1);
      push(w0[0], 0, w0[1], 0.0001, a0, e0); push(o1[0], 0, o1[1], 1, a1, e1); push(o0[0], 0, o0[1], 1, a0, e0);
    }
  });
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(BP, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(BC, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(BN, 3));   // v9.22.20 法線照坡度算，不再每個三角形各自平面
  bg.setAttribute('aSurface', new THREE.Float32BufferAttribute(BS, 4));
  const beach = new THREE.Mesh(bg, surfaceMat); beach.receiveShadow = true; scene.add(beach);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('side', new THREE.Float32BufferAttribute(S, 1)); g.setAttribute('along', new THREE.Float32BufferAttribute(A, 1)); g.setAttribute('endk', new THREE.Float32BufferAttribute(EK, 1));
  const m = new THREE.Mesh(g, waveMat); m.frustumCulled = false; m.renderOrder = 2; scene.add(m);
}

/* ---------- 腳印與漣漪（共用一個貼地的淡出圖片池） ---------- */
const decalTex = (draw) => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; draw(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
const footTex = decalTex(c => { c.fillStyle = 'rgba(90,64,30,0.9)'; c.beginPath(); c.ellipse(32, 38, 13, 20, 0, 0, Math.PI * 2); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(20 + i * 8, 12 + Math.abs(i - 1.5) * 2, 4, 0, 7); c.fill(); } });
const snowFootTex = decalTex(c => { c.fillStyle = 'rgba(150,168,200,0.85)'; c.beginPath(); c.ellipse(32, 36, 14, 22, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(120,140,178,0.6)'; c.beginPath(); c.ellipse(32, 40, 9, 15, 0, 0, Math.PI * 2); c.fill(); });   // 雪地腳印：淡藍灰色的凹痕
const ringTex = decalTex(c => { c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 6; c.beginPath(); c.arc(32, 32, 26, 0, 7); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2.2; c.stroke(); });   // v8.7 細一點、邊緣柔（以前 5px 實線，比釣魚線粗很多）
const decalVert = `${BENDV}
  attribute float aAlpha; varying float vAlpha; varying vec2 vUv;
  void main(){ vUv = uv; vAlpha = aAlpha; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * bendPos(mv); }`;
const decalFrag = `uniform sampler2D map; uniform float uNight; uniform float uDim; varying float vAlpha; varying vec2 vUv;
  void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(t.rgb * mix(vec3(1.0), vec3(0.26, 0.29, 0.36), uNight) * uDim, t.a * vAlpha); }`;   // v9.22.16 腳印與漣漪：夜裡、雨天跟著暗下來
const glowFrag = `uniform sampler2D map; varying float vAlpha; varying vec2 vUv;
  void main(){ float a = texture2D(map, vUv).a * vAlpha; gl_FragColor = vec4(vec3(0.06, 0.48, 1.0) * 2.4 * a, a); }`;   // v8.9.1 藍眼淚的腳印：加法混色的藍光
function pool(tex, n, glow) {
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), alpha = new Float32Array(n);
  geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { map: { value: tex }, uCurve: U.uCurve, uBendF: U.uBendF, uNight: waveU.uNight, uDim: waveU.uDim }, vertexShader: decalVert, fragmentShader: glow ? glowFrag : decalFrag });
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
/* ---------- v9.22.7 雨打在地上：鏡頭附近的地面不停濺起小小的水花（幾顆往兩旁彈起又落下的水珠，0.3 秒），石板路上多一圈小漣漪 ---------- */
const SPL_N = 180, splPos = new Float32Array(SPL_N * 3), splAge = new Float32Array(SPL_N).fill(1), splSize = new Float32Array(SPL_N), splSeed = new Float32Array(SPL_N * 2);
const splGeo = new THREE.BufferGeometry();
splGeo.setAttribute('position', new THREE.BufferAttribute(splPos, 3)); splGeo.setAttribute('aAge', new THREE.BufferAttribute(splAge, 1)); splGeo.setAttribute('aSize', new THREE.BufferAttribute(splSize, 1)); splGeo.setAttribute('aSeed', new THREE.BufferAttribute(splSeed, 2));
const splU = { uCurve: U.uCurve, uBendF: U.uBendF, uH: { value: 500 }, uCol: { value: new THREE.Color('#dde6f0') } };
/* v9.24.11 每一朵水花都不一樣：水珠幾顆、往哪邊彈、彈多高都由種子決定；石板、木板這種硬地濺得高、落點有一圈水光，草地泥地只彈起一兩顆小水珠、沒有水圈
   （以前每一朵都是同一個「五顆白點排成弧＋一條橫線」，站著就看得出圖樣在重複） */
const splash = new THREE.Points(splGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: splU,
  vertexShader: `uniform float uCurve; uniform float uBendF; uniform float uH; attribute float aAge; attribute float aSize; attribute vec2 aSeed; varying float vAge; varying vec2 vSeed;
    void main(){ vAge = aAge; vSeed = aSeed; vec4 mv = modelViewMatrix * vec4(position, 1.0); float bz = max(-mv.z - uBendF, 0.0); mv.y -= bz * bz * uCurve;
      gl_Position = projectionMatrix * mv; gl_PointSize = aAge >= 1.0 ? 0.0 : aSize * projectionMatrix[1][1] * uH / max(-mv.z, 0.1); }`,
  fragmentShader: `uniform vec3 uCol; varying float vAge; varying vec2 vSeed;
    float hs(float x){ return fract(sin(x * 127.1 + vSeed.x * 311.7) * 43758.5453); }
    void main(){ vec2 p = vec2(gl_PointCoord.x - 0.5, 1.0 - gl_PointCoord.y);   // 原點在底部中央、y 往上
      float a = 0.0, t = vAge, hard = 1.0 - vSeed.y;   // vSeed.y：0 硬地、1 草地泥地
      for (int i = 0; i < 6; i++) { float fi = float(i);
        if (hs(fi + 10.0) > mix(0.34, 0.8, hard)) continue;   // 硬地約五顆、軟地約兩顆
        float f = hs(fi) * 2.0 - 1.0, vy = (0.35 + 0.65 * hs(fi + 3.0)) * mix(0.55, 1.0, hard), r = 0.016 + 0.022 * hs(fi + 7.0);   // 往哪邊、彈多高、多大顆
        vec2 c = vec2(f * 0.42 * t, vy * (2.4 * t - 2.6 * t * t) + 0.05);
        a = max(a, smoothstep(r * 1.9, r * 0.7, length(p - c)) * (0.55 + 0.45 * hs(fi + 5.0))); }
      vec2 q = vec2(p.x / ((0.07 + t * 0.34) * (0.7 + 0.6 * hs(20.0))), (p.y - 0.05) / (0.022 + t * 0.065));
      a = max(a, smoothstep(0.35, 0.0, abs(length(q) - 1.0)) * (1.0 - t) * 0.55 * hard);   // 硬地落點的一圈水光，往外擴散
      a *= (1.0 - t * t) * mix(0.6, 0.85, hard); if (a < 0.01) discard; gl_FragColor = vec4(uCol, a); }`
}));
splash.frustumCulled = false; splash.renderOrder = 4; splash.visible = false; scene.add(splash);
let splNext = 0, splAcc = 0;
function rainSplashes(dt, p, rain, road, night) {
  splash.visible = rain > 0.05;
  if (!splash.visible) return;
  splAcc += dt * 170 * rain;
  while (splAcc > 1) {
    splAcc--;
    const r = Math.sqrt(Math.random()) * 7.5, a = Math.random() * Math.PI * 2, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r * 0.8;
    if (waterAt(x, z) || tileAt(x, z) < 0) continue;   // 水面交給漣漪
    const hard = !!(road && road(x, z)); if (!hard && Math.random() < 0.45) continue;   // 草地泥地吸水，濺起來的少
    const y = groundAt(x, z), i = splNext, sz = (hard ? 0.2 + Math.random() * 0.2 : 0.13 + Math.random() * 0.11); splNext = (splNext + 1) % SPL_N;
    splPos[i * 3] = x; splPos[i * 3 + 1] = y + sz * 0.5 + 0.02; splPos[i * 3 + 2] = z; splAge[i] = 0; splSize[i] = sz; splSeed[i * 2] = Math.random(); splSeed[i * 2 + 1] = hard ? 0 : 1;   // 點精靈以中心定位：抬高半個大小，水花的底部才落在地面上（不被地面擋掉下半）
    if (hard && Math.random() < 0.5 && drops) drops.add(x, y + 0.02, z, 0, 0.1 + Math.random() * 0.1, 0.55, 2.2);   // 石板路上：一圈小漣漪
  }
  for (let i = 0; i < SPL_N; i++) if (splAge[i] < 1) splAge[i] = Math.min(1, splAge[i] + dt / 0.3);
  splU.uH.value = renderer.domElement.height / 2; splU.uCol.value.setRGB(0.72, 0.77, 0.83).multiplyScalar(night > 0.5 ? 0.35 : 1);   // v9.24.11 陰雨天的水花是灰白的（以前接近純白，在暗色的石板和草地上一樣亮）
  splGeo.attributes.position.needsUpdate = true; splGeo.attributes.aAge.needsUpdate = true; splGeo.attributes.aSize.needsUpdate = true; splGeo.attributes.aSeed.needsUpdate = true;
}let feet = null, snowFeet = null, rings = null, glowFeet = null, drops = null, stepAcc = 0, stepSide = 1, lastX = null, lastZ = null, rainAcc = 0, fishAcc = 0;
export function init() { buildShore(); feet = pool(footTex, 60); snowFeet = pool(snowFootTex, 90); rings = pool(ringTex, 48); glowFeet = pool(footTex, 24, true); drops = pool(ringTex, 64); }
/** v8.9.1 藍眼淚的亮度（0–1，bluetears.js 每格設定） */
export function setBlue(k) { waveU.uBlue.value = k; }
/** 離海很近的濕沙（浪打得到的地方） */
const wetSand = (x, z) => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; if (tileAt(x + Math.sin(a) * 1.3, z + Math.cos(a) * 1.3) === -1) return true; } return false; };
/** 在水面上產生一圈漣漪 */
export function ripple(x, z, size, y) {
  if (!rings) return;
  const w = waterAt(x, z); const yy = y ?? (w === 'river' ? (waterY(x, z) ?? 0.7) + 0.02 : seaMesh.position.y + 0.03);
  rings.add(x, yy, z, 0, size || 0.5, 1.6, 3);
}
/** 每幀：浪花時間、玩家在沙灘上的腳印、下雨與魚影的漣漪 */
export function update(dt, player, opt) {
  if (!feet) return;
  U.uSeaY.value = seaMesh.position.y; waveU.uNight.value = opt.night || 0; waveU.uDim.value = 1 - (opt.rain || 0) * 0.35;
  const p = player.position;
  if (lastX != null && !opt.inAir) {
    const d = Math.hypot(p.x - lastX, p.z - lastZ);
    const tl = tileAt(p.x, p.z), onSnow = U.uSnow.value > 0.5 && (tl === 1 || tl === 2 || tl === 4);
    if (d > 0 && d < 1 && (tl === 0 || onSnow)) {
      stepAcc += d;
      if (stepAcc > 0.42) {
        stepAcc = 0; stepSide = -stepSide; const a = Math.atan2(p.x - lastX, p.z - lastZ);
        (onSnow ? snowFeet : feet).add(p.x + Math.cos(a) * 0.1 * stepSide, groundAt(p.x, p.z) + 0.012, p.z - Math.sin(a) * 0.1 * stepSide, a, onSnow ? 0.26 : 0.24, onSnow ? 16 : 8, 0);
        if (waveU.uBlue.value > 0.15 && !onSnow && wetSand(p.x, p.z)) glowFeet.add(p.x + Math.cos(a) * 0.1 * stepSide, groundAt(p.x, p.z) + 0.016, p.z - Math.sin(a) * 0.1 * stepSide, a, 0.3, 2.4, 0.4);   // 踩在藍眼淚的濕沙上：腳印亮一下再淡去
      }
    }
  }
  lastX = p.x; lastZ = p.z;
  // 下雨：鏡頭附近的水面隨機冒出漣漪
  if (opt.rain > 0.2) {
    rainAcc += dt * 40 * opt.rain;
    while (rainAcc > 1) { rainAcc--; const x = p.x + (Math.random() - 0.5) * 22, z = p.z + (Math.random() - 0.5) * 16; if (waterAt(x, z)) ripple(x, z, 0.25 + Math.random() * 0.2); }
  }
  rainSplashes(dt, p, opt.rain > 0.2 ? opt.rain : 0, opt.road, opt.night || 0);   // v9.22.7 雨打在地上的水花（冬天的 rain 已經是 0）
  // 魚影：偶爾在魚的位置冒一圈
  if (opt.fish && opt.fish.length) { fishAcc += dt; if (fishAcc > 1.2) { fishAcc = 0; const f = opt.fish[Math.floor(Math.random() * opt.fish.length)]; if (f && f.m && f.m.visible) ripple(f.m.position.x, f.m.position.z, 0.35); } }
  feet.update(dt); snowFeet.update(dt); rings.update(dt); glowFeet.update(dt); drops.update(dt);
}
