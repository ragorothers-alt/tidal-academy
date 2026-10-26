/* 潮汐小島 · 後製光影（v7.0 重寫）：兩階段繪製（不透明 → 水與透明物）、法線感知的環境光遮蔽（SAO＋依深度的雙邊模糊）、
   多層 mip 泛光（13 點縮小＋帳篷放大，能量守恆、寬而柔）、帶太陽散射的高度霧與遠景大氣（還原滾筒彎曲後的真實高度）、
   景深（遠景柔焦的微縮感）、逆光光束、太陽光暈、暖色調色與暗角。
   不用 three.js 的 addons：場景畫到 HDR 緩衝，最後合成、色調映射後輸出。省電模式或不支援時直接一般繪製。 */
import * as THREE from 'three';
import { renderer, scene as SCENE, camera as CAMERA, WL, U as EU } from './engine.js';

/** 圖層 3：第二階段才畫的東西（水與島上的透明物）。圖層 1、2 是 props3d 的「只畫陰影」與「誰都不畫」 */
export const LATE = 8;
CAMERA.layers.enable(3);
const COARSE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export const fx = {
  on: true,
  q: COARSE ? 1 : 2,  // 品質：2 桌機（螢幕空間倒影、16 點遮蔽）、1 觸控裝置（倒影只用天空、8 點遮蔽）
  split: true,        // 島上用兩階段繪製（水讀得到底下的場景）
  golden: 0,          // 黃金時段強度 0–1（由 applyTime 算出）
  clear: 1,           // 天氣：晴朗 1、雨天或陰天降低
  sun: new THREE.Vector2(0.75, 1.05),   // 太陽在螢幕上的位置（0–1，可在畫面外）
  sunVis: 0,          // 太陽在鏡頭前方的程度（逆光）
  sunCol: new THREE.Color('#ffd27a'),
  sunW: new THREE.Vector3(0, 1, 0),     // 太陽在世界座標的方向（高度霧的散射）
  night: 0,
  focus: 20,         // 對焦距離（玩家到鏡頭的距離）
  dof: 0.7, ao: 0.8, sharp: 0.04,   // v7.6 夢幻風：銳化再收（0.07 → 0.04），柔感來自色光而不是糊；sharp：銳化強度（v6.93 收斂：細碎紋理不搶畫面）
  haze: new THREE.Color('#bfe2ff'),   // 遠景空氣的顏色（跟著霧色）
  fog: new THREE.Vector4(0.003, 0.11, 0.4, 0.24),   // v7.6：薄一點、有顏色的霧（不是一片白幕）   // 高度霧：密度（每公尺）、隨高度變稀的速率、霧的基準高度、最濃
  air: 0.0016,       // 遠景大氣（每公尺，和高度無關）
  hold: false         // 作答中（main.js 每一格設定）：畫面停在最後一格，不重畫
};
/* 作答時背景不重畫：畫布保留最後一格的畫面。視窗大小變了（畫布會被清空）或從背景切回來時補畫一格 */
let heldW = -1, heldH = -1, redraw = true;
addEventListener('visibilitychange', () => { if (!document.hidden) redraw = true; });
const holdSz = new THREE.Vector2();
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
const mat = (frag, uniforms, o) => new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false }, o || {}));
const SAFE = 'vec3 safe(vec3 c){ return vec3(c.r < 64.0 ? max(c.r, 0.0) : (c.r >= 64.0 ? 64.0 : 0.0), c.g < 64.0 ? max(c.g, 0.0) : (c.g >= 64.0 ? 64.0 : 0.0), c.b < 64.0 ? max(c.b, 0.0) : (c.b >= 64.0 ? 64.0 : 0.0)); }   // NaN 的比較都是 false → 0\n';

/* 第一階段畫完：把顏色與深度原封不動搬到最終緩衝（深度寫進深度緩衝，第二階段的水與透明物照常做深度測試） */
const COPYD = mat(`uniform sampler2D tex; uniform sampler2D dep; varying vec2 vUv;
  void main(){ gl_FragColor = texture2D(tex, vUv); gl_FragDepth = texture2D(dep, vUv).x; }`, { tex: { value: null }, dep: { value: null } }, { depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth });
/* ---------- 泛光：先取亮部（柔和的門檻＋依亮度加權，單一個爆亮的像素不會閃成一顆星），再一層層縮小、放大回來疊加 ---------- */
const PRE = mat(SAFE + `uniform sampler2D tex; uniform vec2 px; uniform float thr; uniform float knee; varying vec2 vUv;
  vec3 s(vec2 o){ return safe(texture2D(tex, vUv + o * px).rgb); }
  float kw(vec3 c){ return 1.0 / (1.0 + max(c.r, max(c.g, c.b))); }
  void main(){ vec3 a = s(vec2(-1.0, -1.0)), b = s(vec2(1.0, -1.0)), c = s(vec2(-1.0, 1.0)), d = s(vec2(1.0, 1.0));
    float wa = kw(a), wb = kw(b), wc = kw(c), wd = kw(d); vec3 col = (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
    float br = max(col.r, max(col.g, col.b)), rq = clamp(br - thr + knee, 0.0, 2.0 * knee); rq = rq * rq / (4.0 * knee + 1e-4);
    gl_FragColor = vec4(col * max(rq, br - thr) / max(br, 1e-4), 1.0); }`, { tex: { value: null }, px: { value: new THREE.Vector2() }, thr: { value: 1 }, knee: { value: 0.5 } });
const DOWN = mat(`uniform sampler2D tex; uniform vec2 px; varying vec2 vUv;
  vec3 t(float x, float y){ return texture2D(tex, vUv + vec2(x, y) * px).rgb; }
  void main(){ vec3 c = (t(-1.0, -1.0) + t(1.0, -1.0) + t(-1.0, 1.0) + t(1.0, 1.0)) * 0.125 + t(0.0, 0.0) * 0.125
      + (t(-2.0, -2.0) + t(2.0, -2.0) + t(-2.0, 2.0) + t(2.0, 2.0)) * 0.03125 + (t(0.0, -2.0) + t(-2.0, 0.0) + t(2.0, 0.0) + t(0.0, 2.0)) * 0.0625;
    gl_FragColor = vec4(c, 1.0); }`, { tex: { value: null }, px: { value: new THREE.Vector2() } });
const UP = mat(`uniform sampler2D tex; uniform vec2 px; uniform float k; varying vec2 vUv;
  vec3 t(float x, float y){ return texture2D(tex, vUv + vec2(x, y) * px).rgb; }
  void main(){ vec3 c = t(0.0, 0.0) * 4.0 + (t(-1.0, 0.0) + t(1.0, 0.0) + t(0.0, -1.0) + t(0.0, 1.0)) * 2.0 + t(-1.0, -1.0) + t(1.0, -1.0) + t(-1.0, 1.0) + t(1.0, 1.0);
    gl_FragColor = vec4(c / 16.0 * k, 1.0); }`, { tex: { value: null }, px: { value: new THREE.Vector2() }, k: { value: 1 } }, { blending: THREE.AdditiveBlending });
const BLUR = mat(SAFE + `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec3 c = safe(texture2D(tex, vUv).rgb) * 0.227;
    c += (safe(texture2D(tex, vUv + dir * 1.385).rgb) + safe(texture2D(tex, vUv - dir * 1.385).rgb)) * 0.316;
    c += (safe(texture2D(tex, vUv + dir * 3.231).rgb) + safe(texture2D(tex, vUv - dir * 3.231).rgb)) * 0.070;
    gl_FragColor = vec4(c, 1.0); }`, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
/* ---------- 環境光遮蔽：從深度重建視空間的位置與法線，沿螺旋取樣，只算法線那一側的半球（牆角、物件貼地處、屋簷下有柔和的接觸陰影，
   平地不會整片變灰）。g 通道存線性深度，模糊時依深度分開前景與背景，不會在輪廓外暈出一圈 ---------- */
const AO = mat(`#include <packing>
  uniform sampler2D dep; uniform vec2 res; uniform float near; uniform float far; uniform vec2 pinv; uniform float pscale; uniform float rad; uniform float taps; varying vec2 vUv;
  float vz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(dep, uv).x, near, far); }
  vec3 vp(vec2 uv){ float z = vz(uv); return vec3((uv * 2.0 - 1.0) * pinv * z, -z); }
  void main(){
    float d0 = texture2D(dep, vUv).x; if (d0 > 0.9999) { gl_FragColor = vec4(1.0, far, 0.0, 1.0); return; }
    vec2 px = 1.0 / res; vec3 P = vp(vUv);
    vec3 pr = vp(vUv + vec2(px.x, 0.0)), pl = vp(vUv - vec2(px.x, 0.0)), pu = vp(vUv + vec2(0.0, px.y)), pd = vp(vUv - vec2(0.0, px.y));
    vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl, dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
    vec3 N = normalize(cross(dx, dy)); float z0 = -P.z;
    float rpx = clamp(rad * pscale / z0, 2.5, 80.0), ang = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2832, occ = 0.0;
    for (int i = 0; i < 16; i++) {
      float fi = float(i); if (fi >= taps) break;
      float a = ang + fi * 2.39996, rr = (fi + 0.5) / taps; rr = rr * (0.35 + 0.65 * rr);
      vec3 v = vp(vUv + vec2(cos(a), sin(a)) * rr * rpx * px) - P; float L = length(v);
      occ += max(dot(v, N) / max(L, 1e-4) - 0.12, 0.0) * (1.0 - smoothstep(rad * 0.45, rad, L));
    }
    gl_FragColor = vec4(clamp(1.0 - occ / taps * 1.9, 0.0, 1.0), z0, 0.0, 1.0); }`,
  { dep: { value: null }, res: { value: new THREE.Vector2() }, near: { value: 0.5 }, far: { value: 500 }, pinv: { value: new THREE.Vector2(1, 1) }, pscale: { value: 500 }, rad: { value: 0.9 }, taps: { value: 16 } });
const BIL = mat(`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec2 c0 = texture2D(tex, vUv).rg; float z0 = c0.g, s = c0.r * 0.227, ws = 0.227, tol = z0 * 0.05 + 0.04;
    for (int i = 0; i < 4; i++) { float o = i == 0 ? 1.385 : i == 1 ? -1.385 : i == 2 ? 3.231 : -3.231, w = i < 2 ? 0.316 : 0.07;
      vec2 c = texture2D(tex, vUv + dir * o).rg; w *= max(0.0, 1.0 - abs(c.g - z0) / tol); s += c.r * w; ws += w; }
    gl_FragColor = vec4(s / ws, z0, 0.0, 1.0); }`, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
// 放射狀模糊：每個像素朝太陽方向取樣累加，亮的地方（天空、樹葉縫隙）就拉出光束
const RAYS = mat(`uniform sampler2D tex; uniform sampler2D dep; uniform vec2 sun; uniform float aspect; varying vec2 vUv;
  void main(){ vec2 d = (vUv - sun); vec2 st = d / 40.0 * 0.9; vec2 uv = vUv; float w = 1.0; vec3 acc = vec3(0.0);
    for (int i = 0; i < 40; i++) { uv -= st; vec2 q = clamp(uv, 0.001, 0.999); acc += texture2D(tex, q).rgb * w * step(0.9999, texture2D(dep, q).x); w *= 0.965; }
    vec2 da = d; da.x *= aspect; float fall = 1.0 / (1.0 + dot(da, da) * 2.2);
    gl_FragColor = vec4(acc / 40.0 * fall, 1.0); }`, { tex: { value: null }, dep: { value: null }, sun: { value: new THREE.Vector2() }, aspect: { value: 1 } });   // 只有天空（樹葉縫、雲縫）透出來的光拉成光束：水面、金屬的反光不會拉出一道光條
const COMP = new THREE.ShaderMaterial({
  vertexShader: VERT, depthTest: false, depthWrite: false,
  uniforms: { dep: { value: null }, dep0: { value: null }, ao: { value: null }, sh: { value: null }, sq: { value: null }, near: { value: 0.5 }, far: { value: 500 }, focus: { value: 20 }, dofAmt: { value: 1 }, aoAmt: { value: 1 },
    tex: { value: null }, b1: { value: null }, b2: { value: null }, rays: { value: null }, sun: { value: new THREE.Vector2() }, sunCol: { value: new THREE.Color() },
    aspect: { value: 1 }, golden: { value: 0 }, vis: { value: 0 }, clear: { value: 1 }, night: { value: 0 }, time: { value: 0 }, hazeC: { value: new THREE.Color("#bfe2ff") }, px: { value: new THREE.Vector2(1 / 1024, 1 / 1024) }, sharp: { value: 0.4 },
    atmo: { value: 0 }, camW: { value: new THREE.Matrix4() }, pinv: { value: new THREE.Vector2(1, 1) }, curve: { value: 0 }, bendF: { value: 15 }, sunW: { value: new THREE.Vector3(0, 1, 0) },
    fogC: { value: new THREE.Color() }, fogP: { value: new THREE.Vector4() }, airK: { value: 0 } },
  fragmentShader: `#include <packing>
    uniform sampler2D dep; uniform sampler2D dep0; uniform sampler2D ao; uniform sampler2D sh; uniform sampler2D sq; uniform float near; uniform float far; uniform float focus; uniform float dofAmt; uniform float aoAmt;
    uniform sampler2D tex; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D rays; uniform vec2 sun; uniform vec3 sunCol;
    uniform float aspect; uniform float golden; uniform float vis; uniform float clear; uniform float night; uniform float time; uniform vec3 hazeC; uniform vec2 px; uniform float sharp; varying vec2 vUv;
    uniform float atmo; uniform mat4 camW; uniform vec2 pinv; uniform float curve; uniform float bendF; uniform vec3 sunW; uniform vec3 fogC; uniform vec4 fogP; uniform float airK;
    ${SAFE}
    void main(){
      vec3 c = safe(texture2D(tex, vUv).rgb);
      { // 輕微銳化（只看亮度，避免彩色鑲邊；變化量限制在 ±22%，亮暗交界不會出現光暈）：草葉、葉片、木紋等細節清楚一點，像高解析的 CG
        vec3 nb = safe(texture2D(tex, vUv + vec2(px.x, 0.0)).rgb) + safe(texture2D(tex, vUv - vec2(px.x, 0.0)).rgb) + safe(texture2D(tex, vUv + vec2(0.0, px.y)).rgb) + safe(texture2D(tex, vUv - vec2(0.0, px.y)).rgb);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722)), ln = dot(nb * 0.25, vec3(0.2126, 0.7152, 0.0722));
        c *= 1.0 + clamp((l - ln) / max(ln, 0.04) * sharp, -0.22, 0.22);
      }
      float g = golden * clear;
      // 景深：以玩家為焦點，遠景逐漸柔焦（微縮模型感），很近的前景也稍微模糊
      float dr = texture2D(dep, vUv).x, z = -perspectiveDepthToViewZ(dr, near, far), sky = step(0.9999, dr);
      float coc = clamp((z - focus * 2.1) / (focus * 3.2), 0.0, 0.6) + clamp((focus * 0.45 - z) / (focus * 0.35), 0.0, 1.0) * 0.4;   // 景深收斂一點，中景保持清楚
      coc *= dofAmt;
      coc = mix(coc, min(coc, 0.05), max(sky, step(70.0, z)));   // 天空與遠景（浮空島、天空城堡）只輕微柔焦，輪廓保留下來
      c = mix(c, texture2D(sh, vUv).rgb, smoothstep(0.0, 0.45, coc));
      c = mix(c, texture2D(sq, vUv).rgb, smoothstep(0.45, 1.0, coc));
      // 環境光遮蔽（遠處淡出；水面與玻璃底下的遮蔽淡一點——那是水底的，不是水面的）
      { float a = texture2D(ao, vUv).r, z0 = -perspectiveDepthToViewZ(texture2D(dep0, vUv).x, near, far);
        float ak = aoAmt * (1.0 - smoothstep(focus * 2.2, focus * 4.5, z)) * mix(1.0, 0.35, step(z + 0.05, z0));
        c *= mix(vec3(1.0), vec3(a * 0.92, a * 0.95, mix(a, 1.0, 0.3)), ak); }   // 角落與接縫的陰影偏一點藍紫（天空的冷色補光），不是灰黑
      // 大氣：還原滾筒彎曲，用真正的世界高度算高度霧（低處、遠處的薄霧），霧裡朝太陽的方向亮一點（米氏散射）；遠景再淡進天空色
      if (atmo > 0.0 && sky < 0.5) {
        vec3 vp = vec3((vUv * 2.0 - 1.0) * pinv * z, -z); float Lv = length(vp);   // Lv：真正的視距（遠景沒有彎曲，大氣用這個）
        { float bz = clamp(z - bendF, 0.0, 90.0); vp.y += bz * bz * curve; }   // 只還原島上（90 公尺內）的彎曲；更遠的海面留在低處，自然是海平線上的薄霧
        vec3 co = camW[3].xyz, rd = (camW * vec4(vp, 1.0)).xyz - co; float L = length(rd); rd /= max(L, 1e-3);
        float Lf = max(L - 12.0, 0.0);   // 霧從 12 公尺外開始：近處清楚
        float b = fogP.y, dy = rd.y * Lf, od = fogP.x * exp(-b * (co.y + rd.y * 12.0 - fogP.z)) * (abs(b * dy) > 0.01 ? (1.0 - exp(-b * dy)) / (b * dy) : 1.0) * Lf;
        float mu = dot(rd, sunW), hg = 0.0398 * (1.0 - 0.49) / pow(1.49 - 1.4 * mu, 1.5);   // Henyey–Greenstein（g = 0.7）
        vec3 fcol = fogC * (1.0 + (0.6 + g * 1.4) * (1.0 - night) * hg * 6.0) + sunCol * hg * 0.9 * (1.0 - night) * clear;
        float fa = min(1.0 - exp(-od), fogP.w) * atmo;
        float ar = (1.0 - exp(-max(Lv - 20.0, 0.0) * airK)) * 0.5 * atmo * smoothstep(150.0, 110.0, Lv);   // 浮空島、城堡（110 公尺外）自己有大氣透視，這裡不再疊
        c = mix(c, hazeC * (1.0 + hg * 1.5 * (1.0 - night)), ar);
        c = mix(c, fcol, fa);
      }
      // 泛光：白天輕、黃金時段與夜晚（燈光）較強；b1 是貼著光源的柔光、b2 是寬廣的光暈
      c += texture2D(b1, vUv).rgb * (0.06 + g * 0.03 + night * 0.04) + texture2D(b2, vUv).rgb * (0.11 + g * 0.045 + night * 0.075);   // v7.6 夢幻風：亮邊與小光源柔化，寬光暈克制（城堡不白化）   // v7.4：黃金時段的寬光暈少一點（0.16 → 0.09）：太陽常在城堡後面，整片暈開會蓋掉塔群
      // 逆光光束
      c += texture2D(rays, vUv).rgb * sunCol * (0.22 + g * 0.3) * vis * clear;   // v7.6：0.45 → 0.3，清出城堡尖塔與拱橋   // v7.4：黃金時段的光束收一點（0.85 → 0.45）：只讀得到兩三道大方向，城堡不被光幕洗白
      // 太陽光暈：大片暖色霧光＋亮核＋鏡頭光斑
      vec2 d = vUv - sun; d.x *= aspect; float r = length(d);
      float haze = exp(-r * 3.2) * (0.04 + g * 0.04) + exp(-r * 11.0) * (0.14 + g * 0.08);   // v7.6：再收一點   // v7.4：黃金時段的光暈收斂（0.15／0.3 → 0.06／0.12），亮核留著；以前城堡塔群融成一片金白
      c += sunCol * haze * vis * clear;
      vec2 fl = vec2(0.5) - (sun - vec2(0.5)); vec2 e = vUv - mix(sun, fl, 0.55); e.x *= aspect; vec2 e2 = vUv - mix(sun, fl, 0.85); e2.x *= aspect;
      c += sunCol * (smoothstep(0.07, 0.0, length(e)) * 0.06 + smoothstep(0.035, 0.0, length(e2)) * 0.05) * vis * g * clear;
      // 暖色調色：亮部偏金、暗部保留暖棕，提高一點對比
      { // v7.5（Codex 第二輪 D3）：暖色只加在亮部，陰影反而偏一點淡藍紫——屋瓦的藍、草的綠在影子裡還分得出來，不是整個畫面泡在橘色裡
        float lw = dot(c, vec3(0.2126, 0.7152, 0.0722)), hiK = smoothstep(0.05, 0.45, lw);
        c = mix(c, c * vec3(1.04, 1.0, 0.94), g * 0.7 * hiK);   // v7.6 夢幻風：亮部只帶一點奶油暖（以前 1.06／0.86 偏橘）
        c = mix(c, c * vec3(0.98, 0.97, 1.05), g * (1.0 - hiK) * 0.8); }
      // 空氣遠近：越遠越偏向明亮的天藍（日系 CG 的大氣層次）——有大氣霧的場景交給上面的霧
      c = mix(c, hazeC, smoothstep(focus * 1.8, focus * 6.5, z) * mix(0.12, 0.06, step(70.0, z)) * (1.0 - night) * (1.0 - sky) * (1.0 - atmo));   // v7.6：空氣色變成薰衣草粉，量收一點（以前 0.18／0.08），中景的房子不泡在霧裡   // 天空本身不加；遠景物件自己已經做了大氣透視
      // 暗角
      vec2 v = vUv - 0.5; v.x *= aspect * 0.8; c *= mix(1.0, smoothstep(0.95, 0.25, length(v)), 0.06 + g * 0.03);   // 白天的暗角很淡，黃金時段才明顯
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      // 色調映射後再拉對比：暗部更深、亮部偏金（黃金時段較明顯）
      vec3 o = gl_FragColor.rgb; vec3 sc = o * o * (3.0 - 2.0 * o);
      float dayK0 = (1.0 - g) * (1.0 - night);
      o = mix(o, sc, 0.2 - g * 0.04 - dayK0 * 0.02);   // v7.6 夢幻風：參考圖是鮮明的粉彩、明暗分得開（白天 0.18、黃金 0.16、夜晚 0.2）
      float lo = dot(o, vec3(0.299, 0.587, 0.114));
      // 清透藍：提高飽和、暗部偏藍、亮部帶一點暖白（白天；黃金時段改用下面的暖色）
      float dayK = (1.0 - g) * (1.0 - night);
      o = mix(vec3(lo), o, mix(0.98, 1.12, dayK));   // v7.6 夢幻風：白天飽和一點（參考圖是鮮明的粉彩，不是灰掉的粉）
      { // 白天的草木（黃綠色調：綠 > 藍、紅也比藍多）再飽和一點，像陽光下的草原；天空、皮膚、屋瓦不受影響
        float yg = smoothstep(0.03, 0.12, o.g - o.b) * smoothstep(-0.02, 0.06, o.r - o.b) * smoothstep(0.08, 0.0, o.r - o.g);
        o = mix(vec3(lo), o, 1.0 + yg * 0.0 * dayK);   // v7.6：草不再額外加飽和（以前 0.02）
      }   // 白天的色彩清透飽和一點（日系奇幻）；黃金時段與夜晚維持原樣
      o += (vec3(0.01, 0.0, 0.034) * smoothstep(0.55, 0.05, lo) + vec3(0.03, 0.018, -0.02) * smoothstep(0.45, 1.0, lo)) * dayK;   // 陰影偏薰衣草藍、亮部帶暖金
      { // v7.6 夢幻風（consult3 §7）：暗部抬一點薰衣草（lift）、亮部略帶粉奶油（gain）；夜晚的亮部偏一點冷紫，暖色交給燈本身
        float dk = 1.0 - smoothstep(0.05, 0.45, lo), bk = smoothstep(0.5, 0.9, lo);
        o += mix(vec3(0.012, 0.004, 0.024), vec3(0.006, 0.002, 0.016), night) * dk;
        o *= mix(vec3(1.0), mix(mix(vec3(1.035, 1.0, 0.985), vec3(1.025, 0.995, 0.99), g), vec3(1.0, 0.99, 1.025), night), bk); }   // v7.6：白天的亮部是桃奶油（參考圖整片暖光）
      o = mix(o, o * 0.95 + 0.045, 0.15 * dayK);   // 稍微抬亮暗部：空氣感（v7.6：0.5 → 0.15，上面另有薰衣草的 lift，抬太多整張發白）
      o += (vec3(0.018, 0.008, -0.004) * smoothstep(0.45, 1.0, lo) + vec3(0.0, 0.01, -0.01) * smoothstep(0.4, 0.0, lo)) * g;   // v7.6：黃金時段的金色加項收到三分之一（整島不再泡在橘黃裡）
      gl_FragColor.rgb = clamp(o, 0.0, 1.0);
      // 細微顆粒，避免漸層色帶
      float n = fract(sin(dot(vUv * 1000.0 + time, vec2(12.9898, 78.233))) * 43758.5453);
      gl_FragColor.rgb += (n - 0.5) / 255.0 * 2.0;
    }`
});

let main = null, fin, pre, mips = [], rayRT, aoA, aoB, sh1, sh2, sq1, sq2, w = 0, h = 0, failed = false;
const opts = type => ({ type, depthBuffer: false, colorSpace: THREE.LinearSRGBColorSpace });
function ensure() {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
  if (main && sz.x === w && sz.y === h) return;
  w = sz.x; h = sz.y;
  [main, fin, pre, ...mips, rayRT, aoA, aoB, sh1, sh2, sq1, sq2].forEach(t => t && t.dispose());
  const HF = THREE.HalfFloatType;
  main = new THREE.WebGLRenderTarget(w, h, { type: HF, samples: 4, colorSpace: THREE.LinearSRGBColorSpace });
  main.depthTexture = new THREE.DepthTexture(w, h); main.depthTexture.type = THREE.UnsignedIntType;
  fin = new THREE.WebGLRenderTarget(w, h, { type: HF, colorSpace: THREE.LinearSRGBColorSpace });
  fin.depthTexture = new THREE.DepthTexture(w, h); fin.depthTexture.type = THREE.UnsignedIntType;
  const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1), qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
  pre = new THREE.WebGLRenderTarget(hw, hh, opts(HF));
  mips = []; for (let i = 2; i <= 6; i++) mips.push(new THREE.WebGLRenderTarget(Math.max(1, w >> i), Math.max(1, h >> i), opts(HF)));   // 1/4 … 1/64
  rayRT = new THREE.WebGLRenderTarget(qw, qh, opts(HF));
  aoA = new THREE.WebGLRenderTarget(hw, hh, opts(HF)); aoB = new THREE.WebGLRenderTarget(hw, hh, opts(HF));
  sh1 = new THREE.WebGLRenderTarget(hw, hh, opts(HF)); sh2 = new THREE.WebGLRenderTarget(hw, hh, opts(HF));
  sq1 = new THREE.WebGLRenderTarget(qw, qh, opts(HF)); sq2 = new THREE.WebGLRenderTarget(qw, qh, opts(HF));
}
function pass(m, target, keep) { quad.material = m; renderer.setRenderTarget(target); if (keep) { const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = ac; } else renderer.render(quadScene, quadCam); }
function blur(M, src, tmp, dst, px, py) {
  M.uniforms.tex.value = src.texture; M.uniforms.dir.value.set(px, 0); pass(M, tmp);
  M.uniforms.tex.value = tmp.texture; M.uniforms.dir.value.set(0, py); pass(M, dst);
}
/* 島上的透明物（水、玻璃、漣漪、粒子）放到圖層 3，第二階段才畫；天空裡的東西（積雲、星環，renderOrder < 0 或離島心 100 公尺外）留在第一階段，水裡才倒映得到。
   燈也要在圖層 3，第二階段的水才照得到光。props3d 用的圖層（只畫陰影、誰都不畫）不動 */
function assignLate(sc) {
  sc.traverse(o => {
    if (o.isLight) { o.layers.mask |= LATE | 1; return; }
    const m = o.material; if (!m) return;
    const mm = o.layers.mask; if (mm !== 1 && mm !== LATE) return;
    const m0 = Array.isArray(m) ? m[0] : m, water = m0.userData.kind === 'water', e = o.matrixWorld.elements;
    const late = m0.transparent && (water || (o.renderOrder >= 0 && e[12] * e[12] + e[14] * e[14] < 10000));
    if ((mm === LATE) !== late) o.layers.mask = late ? LATE : 1;
  });
}
const pinv = new THREE.Vector2();
/** 取代 renderer.render(scene, camera) */
export function render(time, sc0, cam0) {
  renderer.getDrawingBufferSize(holdSz);
  if (fx.hold && !redraw && holdSz.x === heldW && holdSz.y === heldH) return;   // 作答中：背景停在最後一格
  heldW = holdSz.x; heldH = holdSz.y; redraw = false;
  const scene = sc0 || SCENE, camera = cam0 || CAMERA, island = scene === SCENE;   // 預設是島上；室內傳自己的場景
  WL.uLate.value = 0; WL.uSplit.value = island && fx.on && !failed && fx.split ? 1 : 0;
  if (!fx.on || failed) { renderer.render(scene, camera); return; }
  try {
    ensure();
    let src = main, depth = main.depthTexture;
    if (island && fx.split) {
      assignLate(scene);
      const m0 = camera.layers.mask; camera.layers.mask = m0 & ~LATE;
      renderer.setRenderTarget(main); renderer.render(scene, camera);   // 第一階段：不透明的場景與天空
      COPYD.uniforms.tex.value = main.texture; COPYD.uniforms.dep.value = main.depthTexture; pass(COPYD, fin);
      WL.uLate.value = 1; WL.uOpq.value = main.texture; WL.uOpqD.value = main.depthTexture; WL.uRes.value.set(w, h); WL.uNF.value.set(camera.near, camera.far); WL.uPrj.value.copy(camera.projectionMatrix); WL.uSSR.value = fx.q >= 2 ? 1 : 0;
      const ac = renderer.autoClear, sa = renderer.shadowMap.autoUpdate;
      camera.layers.mask = LATE; renderer.autoClear = false; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;   // 陰影貼圖第一階段畫過了
      renderer.setRenderTarget(fin); renderer.render(scene, camera);   // 第二階段：水（最先）與透明物
      renderer.autoClear = ac; renderer.shadowMap.autoUpdate = sa; camera.layers.mask = m0; WL.uLate.value = 0;
      src = fin; depth = fin.depthTexture;
    } else { renderer.setRenderTarget(main); renderer.render(scene, camera); }
    const aspect = w / h, g = fx.golden * fx.clear;
    // 泛光
    PRE.uniforms.tex.value = src.texture; PRE.uniforms.px.value.set(1 / w, 1 / h); PRE.uniforms.thr.value = 1.14 - g * 0.08 - fx.night * 0.18; PRE.uniforms.knee.value = 0.5; pass(PRE, pre);   // v7.6：黃金時段門檻不再壓那麼低（整片暈開）
    let s = pre; for (const m of mips) { DOWN.uniforms.tex.value = s.texture; DOWN.uniforms.px.value.set(1 / s.width, 1 / s.height); pass(DOWN, m); s = m; }
    for (let i = mips.length - 1; i > 0; i--) { const a = mips[i], b = mips[i - 1]; UP.uniforms.tex.value = a.texture; UP.uniforms.px.value.set(1 / a.width, 1 / a.height); UP.uniforms.k.value = 0.85; pass(UP, b, true); }
    // 景深用的模糊版本：半解析度與四分之一解析度各模糊一次
    BLUR.uniforms.tex.value = src.texture; BLUR.uniforms.dir.value.set(1 / w, 0); pass(BLUR, sh2);
    BLUR.uniforms.tex.value = sh2.texture; BLUR.uniforms.dir.value.set(0, 1 / sh2.height); pass(BLUR, sh1);
    BLUR.uniforms.tex.value = sh1.texture; BLUR.uniforms.dir.value.set(1.6 / sh1.width, 0); pass(BLUR, sq2);
    BLUR.uniforms.tex.value = sq2.texture; BLUR.uniforms.dir.value.set(0, 1.6 / sq2.height); pass(BLUR, sq1);
    // 環境光遮蔽（半解析度，只看不透明的深度）再依深度模糊
    const P = camera.projectionMatrix.elements; pinv.set(1 / P[0], 1 / P[5]);
    const A = AO.uniforms; A.dep.value = main.depthTexture; A.res.value.set(aoA.width, aoA.height); A.near.value = camera.near; A.far.value = camera.far; A.pinv.value.copy(pinv);
    A.pscale.value = P[5] * aoA.height * 0.5; A.rad.value = island ? 0.9 : 0.6; A.taps.value = fx.q >= 2 ? 16 : 8; pass(AO, aoA);
    blur(BIL, aoA, aoB, aoA, 1 / aoA.width, 1 / aoA.height);
    const rayOn = fx.sunVis > 0.01 && fx.clear > 0.05;
    if (rayOn) { RAYS.uniforms.tex.value = pre.texture; RAYS.uniforms.dep.value = depth; RAYS.uniforms.sun.value.copy(fx.sun); RAYS.uniforms.aspect.value = aspect; pass(RAYS, rayRT); }
    const U = COMP.uniforms;
    U.tex.value = src.texture; U.b1.value = pre.texture; U.b2.value = mips[0].texture; U.rays.value = rayOn ? rayRT.texture : mips[0].texture;
    U.sun.value.copy(fx.sun); U.sunCol.value.copy(fx.sunCol); U.aspect.value = aspect; U.golden.value = fx.golden; U.vis.value = rayOn ? fx.sunVis : 0;
    U.clear.value = fx.clear; U.night.value = fx.night; U.time.value = time % 100; U.hazeC.value.copy(fx.haze);
    U.dep.value = depth; U.dep0.value = main.depthTexture; U.ao.value = aoA.texture; U.sh.value = sh1.texture; U.sq.value = sq1.texture;
    U.near.value = camera.near; U.far.value = camera.far; U.focus.value = fx.focus; U.dofAmt.value = fx.dof; U.aoAmt.value = fx.ao; U.px.value.set(1 / w, 1 / h); U.sharp.value = fx.sharp;
    U.atmo.value = island ? 1 : 0; U.camW.value.copy(camera.matrixWorld); U.pinv.value.copy(pinv); U.curve.value = island ? EU.uCurve.value : 0; U.bendF.value = EU.uBendF.value;
    U.sunW.value.copy(fx.sunW); U.fogC.value.copy(fx.haze); U.fogP.value.copy(fx.fog); U.airK.value = fx.air;
    pass(COMP, null);
  } catch (e) { console.warn('後製關閉：', e); failed = true; WL.uLate.value = 0; WL.uSplit.value = 0; renderer.setRenderTarget(null); renderer.render(scene, camera); }
}
