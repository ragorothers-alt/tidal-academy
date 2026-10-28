/* 潮汐小島 · 天空的大朵積雲（日系奇幻 CG 的那種）：貼圖是 Codex 畫在綠幕上、tools/cloudkey.py 去背的五朵積雲
   （models/tex_clouds.js）；載入失敗時退回用畫布畫的雲——幾十顆大小不一的圓團堆成「底部平、往上隆起成塔」的形狀，
   每顆圓團朝太陽的那一側白亮、背光的縫裡是薰衣草紫，雲底融進天色。再把它們當成巨大的看板立在遠方（比浮空島與城堡更遠），高度依畫面上的地平線決定，
   鏡頭怎麼轉、拉多近，雲都穩穩地坐在地平線上。顏色跟著時間變：白天白亮、黃昏染金橘、夜晚變成暗藍灰的剪影。 */
import * as THREE from 'three';
import { scene, camera, skyU } from './engine.js';
import { ULTRA } from './perf.js';
import { gloom } from './weather.js';

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;

/** 畫一張積雲貼圖。tall：塔的高度（0–1），wide：寬度 */
function paint(tall, wide) {
  const W = 1024, H = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), base = H * 0.86;
  // 雲團的骨架：底部一排寬扁的、往上越來越小，集中在一兩座塔
  const core = [], towers = [W * (0.5 + gauss() * 0.12)], tw = wide * W * 0.42;
  if (rnd() < 0.6) towers.push(W * (0.5 + (rnd() < 0.5 ? -1 : 1) * (0.18 + rnd() * 0.12)));
  for (let i = 0; i < 22; i++) { const x = W / 2 + gauss() * tw, r = 50 + rnd() * 45; core.push([x, base - r * (0.25 + rnd() * 0.3), r]); }   // 雲底
  towers.forEach((tx, ti) => {
    const th = (ti ? 0.55 : 1) * tall * H * 0.72;
    for (let i = 0; i < 30; i++) {
      const h = Math.pow(rnd(), 0.8), r = (88 - h * 50) * (0.7 + rnd() * 0.5) * (ti ? 0.8 : 1);
      core.push([tx + gauss() * (1 - h * 0.65) * tw * 0.55, base - 40 - h * th, r]);
    }
  });
  // 外圈的小團：沿著骨架的上半圈長出一顆顆小圓，讓輪廓像花椰菜一樣碎
  const puffs = core.slice();
  core.forEach(([x, y, r]) => {
    const n = 3 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const a = -Math.PI * (0.1 + rnd() * 0.8), rr = r * (0.28 + rnd() * 0.3);
      puffs.push([x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, rr]);
      if (rnd() < 0.5) puffs.push([x + Math.cos(a + 0.2) * r * 1.02, y + Math.sin(a + 0.2) * r * 1.02, rr * 0.45]);   // 更小的碎團
    }
  });
  puffs.sort((a, b) => b[1] - a[1]);   // 由下往上畫：上面的團蓋住下面的
  // 1. 每一團都是不透明的圓（蓋住後面的團，團與團的交界自然形成一道道輪廓）：
  //    漸層中心往左上（光源）偏，受光面白亮、背光面藍灰；越低的團整體越暗（光被上面的雲擋住）
  puffs.forEach(([x, y, r]) => {
    const low = Math.max(0, Math.min(1, 1 - (base - y) / (H * 0.62)));
    const sh = (a, b, c2) => `rgb(${Math.round(a - low * 26)},${Math.round(b - low * 22)},${Math.round(c2 - low * 10)})`;
    const g = c.createRadialGradient(x - r * 0.36, y - r * 0.46, r * 0.04, x - r * 0.12, y - r * 0.16, r * 1.04);
    g.addColorStop(0, sh(255, 253, 247)); g.addColorStop(0.42, sh(246, 247, 251)); g.addColorStop(0.74, sh(218, 223, 240)); g.addColorStop(1, sh(184, 191, 226));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    // 受光的左上緣一道淡淡的暖金色
    const rim = c.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.78, x - r * 0.15, y - r * 0.2, r * 1.0);
    rim.addColorStop(0, 'rgba(255,236,192,0)'); rim.addColorStop(0.75, `rgba(255,236,192,${0.4 * (1 - low)})`); rim.addColorStop(1, 'rgba(255,236,192,0)');
    c.save(); c.beginPath(); c.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.8); c.lineTo(x, y); c.clip(); c.fillStyle = rim; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  });
  // 2. 稍微柔化，讓團與團的交界不要太像貼紙
  { const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const t2 = tmp.getContext('2d'); t2.filter = 'blur(2px)'; t2.drawImage(cv, 0, 0); c.clearRect(0, 0, W, H); c.globalAlpha = 1; c.drawImage(tmp, 0, 0); }
  // 3. 細碎的質感：一層顆粒噪點（只在雲上）
  c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 2600; i++) { const x = rnd() * W, y = rnd() * H, r = 1 + rnd() * 4; c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(140,150,200,.08)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  // 4. 雲底：往下漸漸變淡、偏天空色，像融進遠方的空氣
  const fb = c.createLinearGradient(0, base - 120, 0, H); fb.addColorStop(0, 'rgba(190,215,245,0)'); fb.addColorStop(1, 'rgba(190,215,245,.85)');
  c.fillStyle = fb; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-out';
  const fo = c.createLinearGradient(0, base - 30, 0, H); fo.addColorStop(0, 'rgba(0,0,0,0)'); fo.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = fo; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* 配置：方位角（0 = 北方 -Z，順時針）、距離、寬度（公尺）、雲底在畫面地平線上方多少（NDC）、哪一張貼圖 */
const sprites = [];
let paintedP = null;
/** Codex 畫的雲貼圖（只載一次；浮空島底下的雲霧也用同一套）。失敗時是 null */
export const painted = () => paintedP || (paintedP = loadPainted());
function loadPainted() {
  const base = window.__MODEL_BASE || 'src/isle/models/';
  return new Promise(res => {
    if (window.TA && window.TA.CLOUDS) { res(window.TA.CLOUDS); return; }
    const sc = document.createElement('script'); sc.src = base + 'tex_clouds.js'; sc.onload = () => res((window.TA && window.TA.CLOUDS) || null); sc.onerror = () => res(null); document.head.appendChild(sc);
  }).then(pack => pack && Promise.all(pack.map(e => new Promise((ok, no) => new THREE.TextureLoader().load(e.src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ok({ tex: t, aspect: e.h / e.w, foot: 0.05 }); }, undefined, no))))).catch(() => null);
}
export async function build() {
  // 先用畫布畫的雲（立刻有），Codex 的雲貼圖載入後換上
  let texs = [paint(1, 1), paint(0.8, 1.15), paint(0.55, 1.3), paint(1, 0.8), paint(0.4, 1.4)].map(t => ({ tex: t, aspect: 0.625, foot: 0.14 }));
  // 主角雲：預設鏡頭（從廣場往北看）兩側各一座高聳的積雲塔、中間後方一片雲堆，構圖和目標畫面一致；其他方向隨機散佈
  // k 是貼圖編號（Codex 的雲：0 小朵、1 雲塔、2 雙塔、3 低矮雲帶、4 中等雲群）
  const HERO = [{ az: -0.42, d: 290, w: 160, k: 1, up: 0.04 }, { az: 0.3, d: 300, w: 120, k: 2 }, { az: 0.08, d: 320, w: 130, k: 4 }, { az: -0.14, d: 330, w: 95, k: 3, up: 0.07 }, { az: 0.27, d: 340, w: 85, k: 3 }, { az: 0.78, d: 280, w: 110, k: 0 }];   // 城堡上方留出藍天，底下襯一片低矮的雲
  const list = HERO.map(h => ({ ...h, up: h.up ?? -0.02 }));
  const N = ULTRA ? 6 : 14;   // 極省電：其他方向的雲少一半（大片半透明的雲在手機上很耗）
  for (let i = 0; i < N; i++) {
    const az = 0.85 + i / N * (Math.PI * 2 - 1.7) + (rnd() - 0.5) * 0.3, d = 240 + rnd() * 60, w = 90 + rnd() * 80;   // 其他方向：大小不一、中間留出藍天
    list.push({ az, d, w, up: -0.012 - rnd() * 0.02, k: i });
  }
  list.forEach(cl => {
    const m = new THREE.SpriteMaterial({ map: texs[cl.k % texs.length].tex, transparent: true, depthWrite: false, fog: false });
    m.onBeforeCompile = sh => {   // v7.6 夢幻風（consult3 §4）：依貼圖亮度把雲分成暗面、亮面、薄邊三色——粉紫在雲體裡、奶油色只在受光的邊，不是整朵乘一個粉色
      Object.assign(sh.uniforms, TRI);
      sh.fragmentShader = `uniform vec3 uCShd; uniform vec3 uCLit; uniform vec3 uCRim; uniform float uCMix;
` + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { float cl = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          vec3 tri = cl < 0.6 ? mix(uCShd, uCLit, smoothstep(0.1, 0.6, cl)) : mix(uCLit, uCRim, smoothstep(0.84, 1.0, cl));   // 雲體大多落在亮面（粉），只有最亮的一圈是奶油白
          diffuseColor.rgb = mix(diffuseColor.rgb, tri, uCMix); }`);
    };
    const s = new THREE.Sprite(m); s.raycast = () => {}; s.renderOrder = -1; scene.add(s);
    sprites.push({ s, m, cl });
  });
  const apply = () => sprites.forEach(o => { const t = texs[o.cl.k % texs.length]; o.m.map = t.tex; o.m.needsUpdate = true; o.cl.aspect = t.aspect; o.s.center.set(0.5, t.foot); o.s.scale.y = o.cl.w * t.aspect; });   // 錨點在雲底
  apply();
  const real = await painted();
  if (real && real.length) { texs.forEach(t => t.tex.dispose()); texs = real; apply(); if (window.TA) delete window.TA.CLOUDS; }
}

/* 雲的三色（sRGB 色票 → 線性）：清晨、正午、黃金時段、夜晚各一組 [暗面, 亮面, 薄邊]（consult3 §4） */
const TRI = { uCShd: { value: new THREE.Color() }, uCLit: { value: new THREE.Color() }, uCRim: { value: new THREE.Color() }, uCMix: { value: 0.35 } };
const TRIS = { dawn: ['#ad96cf', '#f8c4d2', '#fff0e0'], day: ['#a99ad6', '#f4c6dc', '#fff2ea'], gold: ['#a68bc6', '#f6bcd2', '#ffe4cc'], night: ['#39345f', '#7770a6', '#b5a1cc'] };   // 參考圖的雲體是明顯的粉、背光是薰衣草
const triC = Object.fromEntries(Object.entries(TRIS).map(([k, v]) => [k, v.map(c => new THREE.Color(c))]));
const HZ = { sea: 0 }, col = new THREE.Color(), gold = new THREE.Color('#ebc6dc'), dawnC = new THREE.Color('#ffd6cc'), nightC = new THREE.Color('#46568c'), rainC = new THREE.Color('#a4abbd');
/** 每格更新：horizonNdc(x, z) 是該方向畫面地平線的 NDC 高度、yForNdc 反推世界高度（都由 fantasy.js 提供），golden、night 0–1
    地平線高度是沿路取樣地面算的，鏡頭快速移動時，懸崖、台地邊緣在取樣點之間進出，估計值會突然跳一下；
    海面的地平線每格照實算（連續、和鏡頭一起動），只有地形墊高的那一段用彈簧平滑地追上（約一秒），雲才不會一格一格地跳 */
export function update(show, horizonNdc, yForNdc, golden, night, dt, inCone) {
  sprites.forEach(o => { o.s.visible = show; });
  if (!show) { sprites.forEach(o => { o.cl.bump = null; }); return; }   // 回到戶外時直接對齊，不從舊位置滑過來
  const h = Math.min(dt || 0.016, 0.05), W = 4;   // 臨界阻尼彈簧（約一秒追上）：位置和速度都連續，地平線估計值跳動時雲不會頓一下
  const sd = skyU.sunDir.value, sAz = Math.atan2(sd.x, -sd.z);
  { const dw = skyU.dawn.value, nk = THREE.MathUtils.smoothstep(night, 0, 0.6), gl = gloom();   // 雲的三色跟著時段
    ['uCShd', 'uCLit', 'uCRim'].forEach((u, i) => { TRI[u].value.copy(triC.day[i]).lerp(triC.dawn[i], dw).lerp(triC.gold[i], golden).lerp(triC.night[i], nk); });
    TRI.uCMix.value = 0.58 * (1 - gl * 0.8); }   // 陰雨天不染粉紫
  col.setRGB(0.98, 0.99, 1.08).lerp(dawnC, skyU.dawn.value * 0.8).lerp(gold, golden * 0.4).lerp(nightC, THREE.MathUtils.smoothstep(night, 0, 0.6));   // 清晨粉桃、黃昏橘粉（v7.5：0.92 → 0.72，整朵雲不再全是橘色）；天一暗雲就跟著暗下來，夜裡是月光下的深藍
  { const gl = gloom() * (1 - night * 0.6), st = Math.max(0, skyU.gloom.value - 1); col.lerp(rainC, gl * 0.85).multiplyScalar((1 - gl * 0.5) * (1 - st * 0.7)); }   // v8.7 再暗一點，暴風雨更暗   // 陰雨天：雲是灰藍色、不再被陽光照得雪白
  sprites.forEach(o => {
    const { cl } = o, x = camera.position.x + Math.sin(cl.az) * cl.d, z = camera.position.z - Math.cos(cl.az) * cl.d;
    if (inCone && !inCone(x, z, cl.w)) { o.s.visible = false; cl.bump = null; return; }   // 畫面外：不取樣地平線；轉回來時直接對齊（v7.3）
    const all = horizonNdc(x, z, HZ), bump = Math.max(0, all - HZ.sea);   // bump：地形（台地、懸崖）把地平線墊高的部分——只有這段是取樣出來、會跳的
    if (cl.bump == null) { cl.bump = bump; cl.nv = 0; } else { cl.nv += ((bump - cl.bump) * W * W - 2 * W * cl.nv) * h; cl.bump += cl.nv * h; }
    o.s.position.set(x, yForNdc(x, z, HZ.sea + cl.bump + cl.up), z);
    o.m.color.copy(col);
    // 貼圖的光從左上來：太陽在這朵雲的左邊就不翻轉，在右邊就左右翻轉（方位角順時針增加，看過去越大越靠右）
    const rel = Math.atan2(Math.sin(sAz - cl.az), Math.cos(sAz - cl.az)), fl = rel > 0 ? -1 : 1;
    o.s.scale.x = cl.w * fl; o.s.scale.y = cl.w * (cl.aspect || 0.625);
  });
}
