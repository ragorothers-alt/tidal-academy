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
     lights [[x, y, z, 色碼?, 強度倍率?]]   暖色點光，最多 6 盞
     sun [x, y, z]              白天主光（從屋外照進窗戶）的方向，預設前右上方
     cols [[x0, y0, z0, x1, y1, z1]]   額外的碰撞箱
     decor { x, y, z }          玩家家：「我的房間」8 × 8 公尺地板的中心（玩家的家具照存檔的格子擺在這裡，牆與地板標 paper 的換成玩家選的壁紙地板）
   零件標記（userData）：walk 可以站的地板與樓梯坡道（可以是隱藏的網格）、solid 擋路（用外框算碰撞箱）、
     camThrough 不擋鏡頭、prop 不合併（會動的零件）、paper 'wall' | 'floor'（玩家家「我的房間」的牆與地板）。 */
import * as THREE from 'three';
import { camera, U, CURVE, M, skyU } from './engine.js';
import { animate } from './chars.js';
import { buildFurniture, furn, rbox, foot } from './room.js';
import { mergeStatic } from './props.js';
import * as Audio from './audio.js';
import * as ui from './ui.js';
import * as post from './post.js';
import { I } from './state.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#2b2640');
const hemi = new THREE.HemisphereLight('#fff1e2', '#8c7466', 1.15), sun = new THREE.DirectionalLight('#fff0d8', 1.8), fill = new THREE.DirectionalLight('#ffe9dc', 0.8);
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
const viewMat = new THREE.ShaderMaterial({
  uniforms: { uTop: skyU.top, uMid: skyU.mid, uBot: skyU.bot, uNight: { value: 0 }, map: { value: VIEWTEX } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; uniform float uNight; uniform sampler2D map; varying vec2 vUv;
    void main(){ vec3 s = vUv.y > 0.5 ? mix(uMid, uTop, (vUv.y - 0.5) * 2.0) : mix(uBot, uMid, vUv.y * 2.0);
      vec4 t = texture2D(map, vUv); t.rgb = mix(vec3(dot(t.rgb, vec3(0.3, 0.59, 0.11))), t.rgb, 0.85);   // 畫的窗景收一點飽和，和島上的粉彩一致
      vec3 c = mix(s, t.rgb * mix(1.0, 0.32, uNight), t.a * (1.0 - uNight * 0.35));
      gl_FragColor = vec4(c * 1.1, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
/* v7.7 夢幻風的窗景：Codex 畫的手繪風景（models/tex_view.js：浮空島、粉白城堡、雲、遠山、海、櫻花與花草坡，天空去背），載入前沿用上面程式畫的 */
{
  const use = url => new THREE.TextureLoader().load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; viewMat.uniforms.map.value = t; });
  if (window.TA && window.TA.VIEW) use(window.TA.VIEW);
  else { const sc = document.createElement('script'); sc.src = (window.__MODEL_BASE || 'src/isle/models/') + 'tex_view.js'; sc.onload = () => { if (window.TA && window.TA.VIEW) use(window.TA.VIEW); }; document.head.appendChild(sc); }
}
const glassMat = new THREE.MeshStandardMaterial({ color: '#eef6ff', transparent: true, opacity: 0.18, roughness: 0.08, metalness: 0, depthWrite: false });
const lampMats = new Set();
/** 給室內模型用的工具（和住宅外觀的 kit 同一套材質：同色同參數共用；匯出給檢查工具直接建室內） */
export const kit = {
  mat: (c, o, k) => M(c, o, k),
  rbox: (w, h, d, r) => rbox(w, h, d, r || 0),
  view: () => viewMat,
  glass: () => glassMat,
  lamp: c => { const m = M(c || '#ffd9a0', { emissive: new THREE.Color(c || '#ffcf8a'), emissiveIntensity: 1.1 }); lampMats.add(m); return m; },
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
  const blockers = []; g.traverse(o => { if (o.isMesh && o.visible && !o.userData.camThrough && !(o.material && o.material.transparent)) blockers.push(o); });
  const box = new THREE.Box3().setFromObject(g), ctr = box.getCenter(new THREE.Vector3()), ext = box.getSize(new THREE.Vector3()).length() / 2 + 1;
  const spots = (ud.spots || []).map(s => Object.assign({ y: 0, r: 1.1 }, s));
  const b = { key, g, ud, walks, cols, blockers, spots, ctr, ext, papers };
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
    if (f.light && nl < 6) { const l = new THREE.PointLight('#ffd9a0', 1, 6, 1.6); l.position.set(x, D.y + 1.6, z); l.userData.k = f.light * 0.8; scene.add(l); decorObjs.push(l); nl++; }
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
  (ud.lights || []).slice(0, 6).forEach(([x, y, z, c, k]) => { const l = new THREE.PointLight(c || '#ffd6a0', 1, 9, 1.6); l.position.set(x, y, z); l.userData.k = k || 1; scene.add(l); extra.push(l); });
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
  hemi.intensity = 1.3 - n * 0.65; fill.intensity = 0.85 - n * 0.55; fill.color.set(n > 0.5 ? '#c8c4f0' : '#ffe9dc'); sun.intensity = (1 - n) * (2.1 - gold * 0.4) + n * 0.25; sun.color.set(n > 0.5 ? '#b9c0ff' : gold > 0.1 ? '#ffd2a0' : '#fff0d8');
  scene.background.set(n > 0.5 ? '#1d1a34' : '#cbb8de');
  extra.concat(decorObjs).forEach(l => { if (l.isPointLight) l.intensity = (2.2 + n * 4.6) * l.userData.k; });
  lampMats.forEach(m => { m.emissiveIntensity = 0.8 + n * 1.1; });
  viewMat.uniforms.uNight.value = n;
  updateCam(dt, fpNow, yawNow, o.pitch || 0, o.tilt || 0, o.zoom ?? 1);
  const fx = post.fx, dof0 = fx.dof, ao0 = fx.ao;
  fx.golden = gold * 0.4; fx.clear = 1; fx.sunVis = 0; fx.night = n * 0.6; fx.focus = camera.position.distanceTo(P.position); fx.dof = dof0 * (fpNow > 0.5 ? 0.15 : 0.35); fx.ao = ao0 * 1.2;
  post.render(t, scene, camera);
  fx.dof = dof0; fx.ao = ao0;
}
