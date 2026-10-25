/* 潮汐小島 · 後製光影：環境光遮蔽（SSAO）、景深（遠景柔焦的微縮感）、泛光（bloom）、逆光光束（god rays）、太陽光暈、暖色調色與暗角。
   不用 three.js 的 addons：場景先畫到 HDR 緩衝，亮部取出模糊成泛光，再從太陽的螢幕位置做放射狀模糊得到光束，
   最後合成、色調映射後輸出。省電模式或不支援時直接一般繪製。 */
import * as THREE from 'three';
import { renderer, scene as SCENE, camera as CAMERA } from './engine.js';

export const fx = {
  on: true,
  golden: 0,          // 黃金時段強度 0–1（由 applyTime 算出）
  clear: 1,           // 天氣：晴朗 1、雨天或陰天降低
  sun: new THREE.Vector2(0.75, 1.05),   // 太陽在螢幕上的位置（0–1，可在畫面外）
  sunVis: 0,          // 太陽在鏡頭前方的程度（逆光）
  sunCol: new THREE.Color('#ffd27a'),
  night: 0,
  focus: 20,         // 對焦距離（玩家到鏡頭的距離）
  dof: 1, ao: 0.95, sharp: 0.14,   // sharp：銳化強度（v6.93 收斂：細碎紋理不搶畫面）
  haze: new THREE.Color('#bfe2ff'),   // 遠景空氣的顏色（跟著霧色）
  hold: false         // 作答中（main.js 每一格設定）：畫面停在最後一格，不重畫
};
/* 作答時背景不重畫：畫布保留最後一格的畫面。視窗大小變了（畫布會被清空）或從背景切回來時補畫一格 */
let heldW = -1, heldH = -1, redraw = true;
addEventListener('visibilitychange', () => { if (!document.hidden) redraw = true; });
const holdSz = new THREE.Vector2();
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false });

const BRIGHT = mat(`uniform sampler2D tex; uniform float thr; varying vec2 vUv;
  vec3 safe(vec3 c){ return vec3(c.r < 64.0 ? max(c.r, 0.0) : (c.r >= 64.0 ? 64.0 : 0.0), c.g < 64.0 ? max(c.g, 0.0) : (c.g >= 64.0 ? 64.0 : 0.0), c.b < 64.0 ? max(c.b, 0.0) : (c.b >= 64.0 ? 64.0 : 0.0)); }   // NaN 的比較都是 false → 0
  void main(){ vec3 c = safe(texture2D(tex, vUv).rgb); float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float k = smoothstep(thr, thr + 0.6, l); gl_FragColor = vec4(c * k, 1.0); }`, { tex: { value: null }, thr: { value: 1.0 } });
const BLUR = mat(`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
  vec3 safe(vec3 c){ return vec3(c.r < 64.0 ? max(c.r, 0.0) : (c.r >= 64.0 ? 64.0 : 0.0), c.g < 64.0 ? max(c.g, 0.0) : (c.g >= 64.0 ? 64.0 : 0.0), c.b < 64.0 ? max(c.b, 0.0) : (c.b >= 64.0 ? 64.0 : 0.0)); }   // NaN 的比較都是 false → 0
  void main(){ vec3 c = safe(texture2D(tex, vUv).rgb) * 0.227;
    c += (safe(texture2D(tex, vUv + dir * 1.385).rgb) + safe(texture2D(tex, vUv - dir * 1.385).rgb)) * 0.316;
    c += (safe(texture2D(tex, vUv + dir * 3.231).rgb) + safe(texture2D(tex, vUv - dir * 3.231).rgb)) * 0.070;
    gl_FragColor = vec4(c, 1.0); }`, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
const AO = mat(`#include <packing>
  uniform sampler2D dep; uniform vec2 res; uniform float near; uniform float far; uniform float pscale; varying vec2 vUv;
  float vz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(dep, uv).x, near, far); }
  void main(){
    float d0 = texture2D(dep, vUv).x; if (d0 > 0.9999) { gl_FragColor = vec4(1.0); return; }
    float z0 = vz(vUv), rad = clamp(0.7 * pscale / z0, 3.0, 70.0), occ = 0.0;
    float ang = fract(sin(dot(vUv * res, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
    for (int i = 0; i < 12; i++) {
      float fi = float(i), a = ang + fi * 2.39996, rr = (fi + 0.5) / 12.0 * rad;
      float z = vz(vUv + vec2(cos(a), sin(a)) * rr / res), dz = z0 - z;
      occ += smoothstep(0.03, 0.2, dz) * (1.0 - smoothstep(0.8, 2.2, dz));
    }
    gl_FragColor = vec4(vec3(1.0 - occ / 12.0), 1.0); }`, { dep: { value: null }, res: { value: new THREE.Vector2() }, near: { value: 0.5 }, far: { value: 500 }, pscale: { value: 500 } });
// 放射狀模糊：每個像素朝太陽方向取樣累加，亮的地方（天空、樹葉縫隙）就拉出光束
const RAYS = mat(`uniform sampler2D tex; uniform sampler2D dep; uniform vec2 sun; uniform float aspect; varying vec2 vUv;
  void main(){ vec2 d = (vUv - sun); vec2 st = d / 40.0 * 0.9; vec2 uv = vUv; float w = 1.0; vec3 acc = vec3(0.0);
    for (int i = 0; i < 40; i++) { uv -= st; vec2 q = clamp(uv, 0.001, 0.999); acc += texture2D(tex, q).rgb * w * step(0.9999, texture2D(dep, q).x); w *= 0.965; }
    vec2 da = d; da.x *= aspect; float fall = 1.0 / (1.0 + dot(da, da) * 2.2);
    gl_FragColor = vec4(acc / 40.0 * fall, 1.0); }`, { tex: { value: null }, dep: { value: null }, sun: { value: new THREE.Vector2() }, aspect: { value: 1 } });   // 只有天空（樹葉縫、雲縫）透出來的光拉成光束：水面、金屬的反光不會拉出一道光條
const COMP = new THREE.ShaderMaterial({
  vertexShader: VERT, depthTest: false, depthWrite: false,
  uniforms: { dep: { value: null }, ao: { value: null }, sh: { value: null }, sq: { value: null }, near: { value: 0.5 }, far: { value: 500 }, focus: { value: 20 }, dofAmt: { value: 1 }, aoAmt: { value: 1 },
    tex: { value: null }, b1: { value: null }, b2: { value: null }, rays: { value: null }, sun: { value: new THREE.Vector2() }, sunCol: { value: new THREE.Color() },
    aspect: { value: 1 }, golden: { value: 0 }, vis: { value: 0 }, clear: { value: 1 }, night: { value: 0 }, time: { value: 0 }, hazeC: { value: new THREE.Color("#bfe2ff") }, px: { value: new THREE.Vector2(1 / 1024, 1 / 1024) }, sharp: { value: 0.4 } },
  fragmentShader: `#include <packing>
    uniform sampler2D dep; uniform sampler2D ao; uniform sampler2D sh; uniform sampler2D sq; uniform float near; uniform float far; uniform float focus; uniform float dofAmt; uniform float aoAmt;
    uniform sampler2D tex; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D rays; uniform vec2 sun; uniform vec3 sunCol;
    uniform float aspect; uniform float golden; uniform float vis; uniform float clear; uniform float night; uniform float time; uniform vec3 hazeC; uniform vec2 px; uniform float sharp; varying vec2 vUv;
    vec3 safe(vec3 c){ return vec3(c.r < 64.0 ? max(c.r, 0.0) : (c.r >= 64.0 ? 64.0 : 0.0), c.g < 64.0 ? max(c.g, 0.0) : (c.g >= 64.0 ? 64.0 : 0.0), c.b < 64.0 ? max(c.b, 0.0) : (c.b >= 64.0 ? 64.0 : 0.0)); }
    void main(){
      vec3 c = safe(texture2D(tex, vUv).rgb);
      { // 輕微銳化（只看亮度，避免彩色鑲邊；變化量限制在 ±22%，亮暗交界不會出現光暈）：草葉、葉片、木紋等細節清楚一點，像高解析的 CG
        vec3 nb = safe(texture2D(tex, vUv + vec2(px.x, 0.0)).rgb) + safe(texture2D(tex, vUv - vec2(px.x, 0.0)).rgb) + safe(texture2D(tex, vUv + vec2(0.0, px.y)).rgb) + safe(texture2D(tex, vUv - vec2(0.0, px.y)).rgb);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722)), ln = dot(nb * 0.25, vec3(0.2126, 0.7152, 0.0722));
        c *= 1.0 + clamp((l - ln) / max(ln, 0.04) * sharp, -0.22, 0.22);
      }
      float g = golden * clear;
      // 景深：以玩家為焦點，遠景逐漸柔焦（微縮模型感），很近的前景也稍微模糊
      float z = -perspectiveDepthToViewZ(texture2D(dep, vUv).x, near, far);
      float coc = clamp((z - focus * 2.1) / (focus * 3.2), 0.0, 0.6) + clamp((focus * 0.45 - z) / (focus * 0.35), 0.0, 1.0) * 0.4;   // 景深收斂一點，中景保持清楚
      coc *= dofAmt;
      coc = mix(coc, min(coc, 0.05), max(step(0.9999, texture2D(dep, vUv).x), step(70.0, z)));   // 天空與遠景（浮空島、天空城堡）只輕微柔焦，輪廓保留下來
      c = mix(c, texture2D(sh, vUv).rgb, smoothstep(0.0, 0.45, coc));
      c = mix(c, texture2D(sq, vUv).rgb, smoothstep(0.45, 1.0, coc));
      // 環境光遮蔽（遠處淡出，避免整片遠景變灰）
      float a = texture2D(ao, vUv).r;
      { float ak = aoAmt * (1.0 - smoothstep(focus * 2.0, focus * 4.0, z)); c *= mix(vec3(1.0), vec3(a * 0.9, a * 0.94, mix(a, 1.0, 0.35)), ak); }   // 角落與接縫的陰影偏一點藍紫（天空的冷色補光），不是灰黑
      // 泛光：白天輕、黃金時段與夜晚（燈光）較強
      c += texture2D(b1, vUv).rgb * (0.28 + g * 0.28 + night * 0.24) + texture2D(b2, vUv).rgb * (0.34 + g * 0.42 + night * 0.3);   // 夜裡的燈光暈收小：燈是琥珀色的光點，不是一團白
      // 逆光光束
      c += texture2D(rays, vUv).rgb * sunCol * (0.22 + g * 0.85) * vis * clear;
      // 太陽光暈：大片暖色霧光＋亮核＋鏡頭光斑
      vec2 d = vUv - sun; d.x *= aspect; float r = length(d);
      float haze = exp(-r * 3.2) * (0.04 + g * 0.15) + exp(-r * 11.0) * (0.14 + g * 0.3);
      c += sunCol * haze * vis * clear;
      vec2 fl = vec2(0.5) - (sun - vec2(0.5)); vec2 e = vUv - mix(sun, fl, 0.55); e.x *= aspect; vec2 e2 = vUv - mix(sun, fl, 0.85); e2.x *= aspect;
      c += sunCol * (smoothstep(0.07, 0.0, length(e)) * 0.06 + smoothstep(0.035, 0.0, length(e2)) * 0.05) * vis * g * clear;
      // 暖色調色：亮部偏金、暗部保留暖棕，提高一點對比
      c = mix(c, c * vec3(1.06, 1.0, 0.86), g * 0.7);
      // 空氣遠近：越遠越偏向明亮的天藍（日系 CG 的大氣層次）
      c = mix(c, hazeC, smoothstep(focus * 1.8, focus * 6.5, z) * mix(0.18, 0.08, step(70.0, z)) * (1.0 - night) * step(texture2D(dep, vUv).x, 0.9999));   // 天空本身不加；遠景物件自己已經做了大氣透視
      // 暗角
      vec2 v = vUv - 0.5; v.x *= aspect * 0.8; c *= mix(1.0, smoothstep(0.95, 0.25, length(v)), 0.1 + g * 0.05);   // 白天的暗角很淡，黃金時段才明顯
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      // 色調映射後再拉對比：暗部更深、亮部偏金（黃金時段較明顯）
      vec3 o = gl_FragColor.rgb; vec3 sc = o * o * (3.0 - 2.0 * o);
      float dayK0 = (1.0 - g) * (1.0 - night);
      o = mix(o, sc, 0.24 - g * 0.06 - dayK0 * 0.12);   // 白天對比柔一點（日系 CG 的高調畫面）
      float lo = dot(o, vec3(0.299, 0.587, 0.114));
      // 清透藍：提高飽和、暗部偏藍、亮部帶一點暖白（白天；黃金時段改用下面的暖色）
      float dayK = (1.0 - g) * (1.0 - night);
      o = mix(vec3(lo), o, mix(0.94, 1.04, dayK));   // v6.93：白天少一點飽和（粉彩的空氣感，不像塑膠玩具）
      { // 白天的草木（黃綠色調：綠 > 藍、紅也比藍多）再飽和一點，像陽光下的草原；天空、皮膚、屋瓦不受影響
        float yg = smoothstep(0.03, 0.12, o.g - o.b) * smoothstep(-0.02, 0.06, o.r - o.b) * smoothstep(0.08, 0.0, o.r - o.g);
        o = mix(vec3(lo), o, 1.0 + yg * 0.05 * dayK);
      }   // 白天的色彩清透飽和一點（日系奇幻）；黃金時段與夜晚維持原樣
      o += (vec3(0.01, 0.0, 0.034) * smoothstep(0.55, 0.05, lo) + vec3(0.03, 0.018, -0.02) * smoothstep(0.45, 1.0, lo)) * dayK;   // 陰影偏薰衣草藍、亮部帶暖金
      o = mix(o, o * 0.95 + 0.045, 0.5 * dayK);   // 稍微抬亮暗部：空氣感、高調
      o += (vec3(0.05, 0.03, -0.04) * smoothstep(0.45, 1.0, lo) + vec3(0.0, 0.01, -0.01) * smoothstep(0.4, 0.0, lo)) * g;
      gl_FragColor.rgb = clamp(o, 0.0, 1.0);
      // 細微顆粒，避免漸層色帶
      float n = fract(sin(dot(vUv * 1000.0 + time, vec2(12.9898, 78.233))) * 43758.5453);
      gl_FragColor.rgb += (n - 0.5) / 255.0 * 2.0;
    }`
});

let main = null, half1, half2, q1, q2, rayRT, aoA, aoB, sh1, sh2, sq1, sq2, w = 0, h = 0, failed = false;
const opts = type => ({ type, depthBuffer: false, colorSpace: THREE.LinearSRGBColorSpace });
function ensure() {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
  if (main && sz.x === w && sz.y === h) return;
  w = sz.x; h = sz.y;
  [main, half1, half2, q1, q2, rayRT, aoA, aoB, sh1, sh2, sq1, sq2].forEach(t => t && t.dispose());
  const HF = THREE.HalfFloatType;
  main = new THREE.WebGLRenderTarget(w, h, { type: HF, samples: 4, colorSpace: THREE.LinearSRGBColorSpace });
  main.depthTexture = new THREE.DepthTexture(w, h); main.depthTexture.type = THREE.UnsignedIntType;
  const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1), qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
  half1 = new THREE.WebGLRenderTarget(hw, hh, opts(HF)); half2 = new THREE.WebGLRenderTarget(hw, hh, opts(HF));
  q1 = new THREE.WebGLRenderTarget(qw, qh, opts(HF)); q2 = new THREE.WebGLRenderTarget(qw, qh, opts(HF));
  rayRT = new THREE.WebGLRenderTarget(qw, qh, opts(HF));
  aoA = new THREE.WebGLRenderTarget(hw, hh, opts(THREE.UnsignedByteType)); aoB = new THREE.WebGLRenderTarget(hw, hh, opts(THREE.UnsignedByteType));
  sh1 = new THREE.WebGLRenderTarget(hw, hh, opts(HF)); sh2 = new THREE.WebGLRenderTarget(hw, hh, opts(HF));
  sq1 = new THREE.WebGLRenderTarget(qw, qh, opts(HF)); sq2 = new THREE.WebGLRenderTarget(qw, qh, opts(HF));
}
function pass(m, target) { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }
function blur(src, tmp, dst, px, py) {
  BLUR.uniforms.tex.value = src.texture; BLUR.uniforms.dir.value.set(px, 0); pass(BLUR, tmp);
  BLUR.uniforms.tex.value = tmp.texture; BLUR.uniforms.dir.value.set(0, py); pass(BLUR, dst);
}
/** 取代 renderer.render(scene, camera) */
export function render(time, sc0, cam0) {
  renderer.getDrawingBufferSize(holdSz);
  if (fx.hold && !redraw && holdSz.x === heldW && holdSz.y === heldH) return;   // 作答中：背景停在最後一格
  heldW = holdSz.x; heldH = holdSz.y; redraw = false;
  const scene = sc0 || SCENE, camera = cam0 || CAMERA;   // 預設是島上；室內傳自己的場景
  if (!fx.on || failed) { renderer.render(scene, camera); return; }
  try {
    ensure();
    renderer.setRenderTarget(main); renderer.render(scene, camera);
    const aspect = w / h, g = fx.golden * fx.clear;
    BRIGHT.uniforms.tex.value = main.texture; BRIGHT.uniforms.thr.value = 1.3 - g * 0.15 - fx.night * 0.14; pass(BRIGHT, half1);
    blur(half1, half2, half1, 1 / half1.width, 1 / half1.height);
    // 再縮到四分之一解析度做大範圍的柔光
    BLUR.uniforms.tex.value = half1.texture; BLUR.uniforms.dir.value.set(1.5 / half1.width, 0); pass(BLUR, q2);
    BLUR.uniforms.tex.value = q2.texture; BLUR.uniforms.dir.value.set(0, 1.5 / q2.height); pass(BLUR, q1);
    BLUR.uniforms.tex.value = q1.texture; BLUR.uniforms.dir.value.set(2.5 / q1.width, 0); pass(BLUR, q2);
    BLUR.uniforms.tex.value = q2.texture; BLUR.uniforms.dir.value.set(0, 2.5 / q1.height); pass(BLUR, q1);
    // 景深用的模糊版本：半解析度與四分之一解析度各模糊一次
    BLUR.uniforms.tex.value = main.texture; BLUR.uniforms.dir.value.set(1 / w, 0); pass(BLUR, sh2);
    BLUR.uniforms.tex.value = sh2.texture; BLUR.uniforms.dir.value.set(0, 1 / sh2.height); pass(BLUR, sh1);
    BLUR.uniforms.tex.value = sh1.texture; BLUR.uniforms.dir.value.set(1.6 / sh1.width, 0); pass(BLUR, sq2);
    BLUR.uniforms.tex.value = sq2.texture; BLUR.uniforms.dir.value.set(0, 1.6 / sq2.height); pass(BLUR, sq1);
    // 環境光遮蔽（半解析度）再模糊
    const A = AO.uniforms; A.dep.value = main.depthTexture; A.res.value.set(aoA.width, aoA.height); A.near.value = camera.near; A.far.value = camera.far;
    A.pscale.value = camera.projectionMatrix.elements[5] * aoA.height * 0.5; pass(AO, aoA);
    blur(aoA, aoB, aoA, 1 / aoA.width, 1 / aoA.height);
    const rayOn = fx.sunVis > 0.01 && fx.clear > 0.05;
    if (rayOn) { RAYS.uniforms.tex.value = half1.texture; RAYS.uniforms.dep.value = main.depthTexture; RAYS.uniforms.sun.value.copy(fx.sun); RAYS.uniforms.aspect.value = aspect; pass(RAYS, rayRT); }
    const U = COMP.uniforms;
    U.tex.value = main.texture; U.b1.value = half1.texture; U.b2.value = q1.texture; U.rays.value = rayOn ? rayRT.texture : q1.texture;
    U.sun.value.copy(fx.sun); U.sunCol.value.copy(fx.sunCol); U.aspect.value = aspect; U.golden.value = fx.golden; U.vis.value = rayOn ? fx.sunVis : 0;
    U.clear.value = fx.clear; U.night.value = fx.night; U.time.value = time % 100; U.hazeC.value.copy(fx.haze);
    U.dep.value = main.depthTexture; U.ao.value = aoA.texture; U.sh.value = sh1.texture; U.sq.value = sq1.texture;
    U.near.value = camera.near; U.far.value = camera.far; U.focus.value = fx.focus; U.dofAmt.value = fx.dof; U.aoAmt.value = fx.ao; U.px.value.set(1 / w, 1 / h); U.sharp.value = fx.sharp;
    pass(COMP, null);
  } catch (e) { console.warn('後製關閉：', e); failed = true; renderer.setRenderTarget(null); renderer.render(scene, camera); }
}
