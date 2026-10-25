/* 潮汐小島 · 博物館內部：從博物館大門走進展廳。左牆是魚類水族箱、右牆是昆蟲標本櫃、後牆是化石、
   前方兩側是潮池生物與礦物。捐贈過的展品會擺上展示位，走近按 E 看說明；還沒捐的位置是空的。 */
import * as THREE from 'three';
import { renderer, camera, M, mesh, U, CURVE, scene as mainScene } from './engine.js';
import { animate } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as post from './post.js';
import { S, list, icon, whereName, stars, fmtMonths, fmtHours } from './state.js';

const W = 18, D = 14, HW = W / 2, HD = D / 2;
export let inside = false;
let P = null, onExit = null, sc = null, slots = [], camPos = new THREE.Vector3(), savedCurve = 0.0055, texCache = {};
const tex = url => texCache[url] || (texCache[url] = Object.assign(new THREE.TextureLoader().load(url), { magFilter: THREE.NearestFilter, colorSpace: THREE.SRGBColorSpace }));
export function init(player, exitCb) { P = player; onExit = exitCb; }
const WINGS = [
  { k: 'fish', name: '魚類', wall: 'left', color: '#7cc7ff' },
  { k: 'bug', name: '昆蟲', wall: 'right', color: '#8fe0b8' },
  { k: 'fossil', name: '化石', wall: 'back', color: '#e8c878' },
  { k: 'sea', name: '潮池生物', wall: 'frontL', color: '#5ab0c8' },
  { k: 'mineral', name: '礦物', wall: 'frontR', color: '#b9a2ff' }
];
/* 展廳的材質貼圖（畫一次就快取，離館時不釋放） */
const TX = {};
function canvasTex(key, w, h, draw, rep) {
  if (TX[key]) return TX[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return (TX[key] = t);
}
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
/** 拼花木地板：一排排長短不一的暖色木條，每條深淺略有不同、帶細木紋 */
const floorTex = () => canvasTex('floor', 512, 512, (c, w, h) => {
  seed = 7; const rows = 16, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 160;
    while (x < w) {
      const len = 120 + rnd() * 140, v = 0.89 + rnd() * 0.11, R = 188 * v, G = 150 * v, B = 108 * v;
      c.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`; c.fillRect(x, r * rh, len, rh);
      for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(110,72,40,${0.035 + rnd() * 0.04})`; c.fillRect(x, r * rh + rnd() * rh, len, 1 + rnd() * 1.5); }   // 木紋
      c.fillStyle = 'rgba(90,58,32,0.25)'; c.fillRect(x, r * rh, 2, rh);   // 木條接縫
      x += len;
    }
    c.fillStyle = 'rgba(90,58,32,0.27)'; c.fillRect(0, r * rh, w, 2);
  }
}, [W / 4.5, D / 4.5]);
/** 牆面：淡淡的灰泥斑駁 */
const plasterTex = () => canvasTex('plaster', 256, 256, (c, w, h) => {
  seed = 3; c.fillStyle = '#f2e8d6'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const a = rnd() * 0.05; c.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(150,120,80,${a})`; const r = 2 + rnd() * 10; c.beginPath(); c.arc(rnd() * w, rnd() * h, r, 0, 6.283); c.fill(); }
}, [4, 1]);
/** 中央走道的紅地毯：金色滾邊、內框細線、每隔一段一個菱形花紋 */
const rugTex = () => canvasTex('rug', 192, 704, (c, w, h) => {
  c.fillStyle = '#a83c3c'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(${y % 6 ? '255,220,200' : '60,10,10'},0.05)`; c.fillRect(0, y, w, 2); }   // 絨毛的細紋
  c.fillStyle = '#d9a95a'; c.fillRect(0, 0, 14, h); c.fillRect(w - 14, 0, 14, h); c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
  c.strokeStyle = 'rgba(240,200,130,0.7)'; c.lineWidth = 3; c.strokeRect(26, 26, w - 52, h - 52);
  c.strokeStyle = 'rgba(232,186,110,0.6)'; c.lineWidth = 3;
  for (let y = 90; y < h - 60; y += 130) { c.beginPath(); c.moveTo(w / 2, y - 20); c.lineTo(w / 2 + 15, y); c.lineTo(w / 2, y + 20); c.lineTo(w / 2 - 15, y); c.closePath(); c.stroke(); c.fillStyle = 'rgba(232,186,110,0.45)'; c.fillRect(w / 2 - 3, y - 3, 6, 6); }   // 細的金色菱形框
});
function build() {
  const s = new THREE.Scene();
  s.background = canvasTex('bg', 256, 256, (c, w, h) => { const g = c.createRadialGradient(128, 110, 10, 128, 128, 190); g.addColorStop(0, '#5a4532'); g.addColorStop(0.55, '#33261c'); g.addColorStop(1, '#17110c'); c.fillStyle = g; c.fillRect(0, 0, w, h); });   // 和家裡一樣：展廳外面是暖褐色漸層
  s.add(new THREE.HemisphereLight('#fff6e6', '#8a6a4a', 0.95));
  const dl = new THREE.DirectionalLight('#fff0dc', 1.7); dl.position.set(5, 14, 6); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048);   // 主光從右前上方照下：展示台、化石座與角色都有影子
  Object.assign(dl.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 }); dl.shadow.bias = -0.0005; s.add(dl, dl.target);
  [[-5, 2], [5, 2], [0, -4]].forEach(([x, z]) => { const l = new THREE.PointLight('#ffd9a0', 5, 9, 1.6); l.position.set(x, 3.2, z); s.add(l); });   // 三盞暖色吊燈：地上一圈一圈的暖光
  const own = m => { m.userData.own = true; return m; };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), own(new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.62 }))); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
  const wallM = own(new THREE.MeshStandardMaterial({ map: plasterTex(), roughness: 0.92 })), wood = M('#7a5236'), cap = M('#efe2c8');
  [[0, -HD, W, 0], [-HW, 0, D, Math.PI / 2], [HW, 0, D, -Math.PI / 2]].forEach(([x, z, w, r]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.4), wallM); m.position.set(x, 1.7, z); m.rotation.y = r; m.receiveShadow = true; s.add(m);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; s.add(g);   // 牆的局部座標：x 沿牆、+z 朝展廳裡面
    g.add(mesh(new THREE.BoxGeometry(w, 0.9, 0.05), wood, 0, 0.45, 0.025, { noCast: true }));   // 深色木護牆板
    g.add(mesh(new THREE.BoxGeometry(w, 0.07, 0.09), M('#9a6c48'), 0, 0.93, 0.045, { noCast: true }));   // 腰線
    g.add(mesh(new THREE.BoxGeometry(w + 0.36, 0.16, 0.36), cap, 0, 3.48, -0.1));   // 牆頂的厚度（從上面看得到牆有多厚）
    g.add(mesh(new THREE.BoxGeometry(w, 0.12, 0.08), M('#d8c6a2'), 0, 3.34, 0.04, { noCast: true }));   // 天花線板
  });
  [[-HW, -HD], [HW, -HD]].forEach(([x, z]) => s.add(mesh(new THREE.BoxGeometry(0.42, 3.6, 0.42), cap, x, 1.8, z)));   // 後牆兩角的柱子
  s.add(mesh(new THREE.BoxGeometry(W + 0.36, 0.34, 0.2), wood, 0, -0.17, HD + 0.1, { noCast: true }));   // 地板前緣的厚度（不是一張紙）
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, D - 3), own(new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 }))); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.012, 1.2); rug.receiveShadow = true; s.add(rug);
  const s2 = S(); slots = [];
  WINGS.forEach(w => {
    const L2 = list(w.k); if (!L2.length) return;
    const pos = layout(w.wall, L2.length);
    pos.forEach(([x, y, z, ry], i) => {
      const sp = L2[i], got = s2.museum[w.k] && s2.museum[w.k][sp.id];
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
      if (w.k === 'fish') g.add(mesh(new THREE.BoxGeometry(0.62, 0.5, 0.3), own(new THREE.MeshStandardMaterial({ color: '#9ad8f0', transparent: true, opacity: got ? 0.5 : 0.25, roughness: 0.1 })), 0, 0, 0, { noCast: true }));
      else if (w.k === 'bug' || w.k === 'mineral' || w.k === 'sea') g.add(mesh(new THREE.BoxGeometry(0.6, 0.5, 0.06), M(got ? '#fffaf0' : '#3f5551'), 0, 0, -0.06, { noCast: true }), mesh(new THREE.BoxGeometry(0.66, 0.06, 0.12), M('#8a5a3b'), 0, -0.28, 0, { noCast: true }));
      else g.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.5, 12), M(got ? '#f0e6d2' : '#ddd2bd'), 0, -0.25, 0));
      if (got) { const spr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.44), own(new THREE.MeshBasicMaterial({ map: tex(icon(sp.id, w.k)), transparent: true }))); spr.position.set(0, w.k === 'fossil' ? 0.25 : 0.02, w.k === 'fish' ? 0 : 0.01); g.add(spr); }
      if (w.wall.startsWith('front')) g.rotation.x = -0.3;
      s.add(g); slots.push({ k: w.k, sp, got, x, z, y, wing: w });
    });
    const [lx, lz, lr] = { left: [-HW + 0.05, 0, Math.PI / 2], right: [HW - 0.05, 0, -Math.PI / 2], back: [0, -HD + 0.05, 0], frontL: [-5.5, HD - 2.2, 0], frontR: [5.5, HD - 2.2, 0] }[w.wall];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = w.color; c.fillRect(0, 0, 256, 64); c.fillStyle = '#fff'; c.font = '800 34px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const n = L2.filter(x => s2.museum[w.k] && s2.museum[w.k][x.id]).length; c.fillText(`${w.name} ${n}/${L2.length}`, 128, 34);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), (() => { const m = own(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) })); m.userData.ownMap = true; return m; })()); sign.position.set(lx, w.wall.startsWith('front') ? 2.3 : 3.0, lz); sign.rotation.y = lr; s.add(sign);
  });
  s.add(mesh(new THREE.BoxGeometry(1.8, 0.02, 0.9), M('#6e4630'), 0, 0.016, HD - 0.5, { noCast: true }));   // 門口地墊
  const tz = (TABLE.z0 + TABLE.z1) / 2, td = TABLE.z1 - TABLE.z0;
  [-5.5, 5.5].forEach(cx => {   // 潮池生物與礦物的展示桌
    s.add(mesh(new THREE.BoxGeometry(TABLE.hw * 2, 0.08, td + 0.1), M('#70533d'), cx, 0.26, tz), mesh(new THREE.BoxGeometry(5.5, 0.02, td - 0.1), M('#3d5a4c'), cx, 0.305, tz, { noCast: true }));
    [[-2.75, -td / 2 + 0.06], [2.75, -td / 2 + 0.06], [-2.75, td / 2 - 0.06], [2.75, td / 2 - 0.06]].forEach(([dx, dz]) => s.add(mesh(new THREE.BoxGeometry(0.1, 0.24, 0.1), M('#5e4532'), cx + dx, 0.12, tz + dz)));
  });
  s.traverse(o => { o.frustumCulled = false; });
  return s;
}
/** 展示位座標：沿牆排成網格，或在前方兩側排成展示桌 */
function layout(wall, n) {
  const out = [];
  if (wall === 'left' || wall === 'right') {
    const cols = Math.ceil(n / 5), sx = (D - 2) / cols;
    for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols), z = -HD + 1 + sx * (c + 0.5), y = 0.6 + r * 0.55, x = wall === 'left' ? -HW + 0.25 : HW - 0.25; out.push([x, y, z, wall === 'left' ? Math.PI / 2 : -Math.PI / 2]); }
  } else if (wall === 'back') {
    const cols = Math.ceil(n / 3), sx = (W - 4) / cols;
    for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); out.push([-HW + 2 + sx * (c + 0.5), 0.5 + r * 0.0, -HD + 0.6 + r * 1.0, 0]); }
  } else {
    const cx = wall === 'frontL' ? -5.5 : 5.5, cols = 6;
    for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); out.push([cx - 2.25 + c * 0.9, 0.55, HD - 2.6 + r * 0.6 - 2.4, 0]); }
  }
  return out;
}
export function enter() {
  ui.iris();
  sc = build(); inside = true; savedCurve = U.uCurve.value; U.uCurve.value = 0;
  sc.add(P); P.position.set(0, 0, HD - 0.8); P.rotation.y = Math.PI; camPos.set(0, 13.5, HD + 12);
  document.body.classList.add('in-trip'); Audio.sfx('open');
  const s = S(), n = ['fish', 'bug', 'fossil', 'sea', 'mineral'].reduce((a, k) => a + Object.keys(s.museum[k] || {}).length, 0);
  ui.toast(`歡迎參觀潮汐博物館！目前館藏 ${n} 件。走到展區前按 E 看完整館藏`);
}
/** 離館時釋放這次建立的幾何與專屬材質（共用材質 M() 與圖示貼圖快取不釋放） */
function dispose() {
  if (!sc) return;
  sc.traverse(o => { if (o.isLight && o.shadow && o.shadow.map) o.shadow.dispose(); if (o === P || !o.isMesh) return; if (o.geometry) o.geometry.dispose(); const m = o.material; if (m && m.userData && m.userData.own) { if (m.userData.ownMap && m.map) m.map.dispose(); m.dispose(); } });
}
function leave() { ui.iris(); inside = false; U.uCurve.value = savedCurve || CURVE; document.body.classList.remove('in-trip'); mainScene.add(P); dispose(); sc = null; onExit && onExit(); Audio.sfx('open'); }
/** 展區範圍（玩家站在這裡就能打開該展區） */
const ZONES = [
  { k: 'fish', test: (x, z) => x < -HW + 2.2 && z < HD - 3 },
  { k: 'bug', test: (x, z) => x > HW - 2.2 && z < HD - 3 },
  { k: 'fossil', test: (x, z) => z < -HD + 3.6 && Math.abs(x) < HW - 2 },
  { k: 'sea', test: (x, z) => x < -2 && x > -HW + 1 && z > 0.6 && z < HD - 0.8 },
  { k: 'mineral', test: (x, z) => x > 2 && x < HW - 1 && z > 0.6 && z < HD - 0.8 }
];
const zone = () => P && ZONES.find(z => z.test(P.position.x, P.position.z));
/** 碰撞：牆、化石區、前方兩張展示桌（整塊擋住，桌邊就能打開展區） */
const TABLE = { z0: HD - 5.25, z1: HD - 3.0, hw: 2.85 };   // hw：展示桌半寬
const blockedAt = (x, z) => x < -HW + 0.6 || x > HW - 0.6 || z < -HD + 2.4 || (Math.abs(x) > 5.5 - TABLE.hw - 0.15 && Math.abs(x) < 5.5 + TABLE.hw + 0.15 && z > TABLE.z0 - 0.1 && z < TABLE.z1 + 0.1);   // 展示桌（和桌面同一組尺寸，留一點角色邊距）
export function tick(dt, t, ix, iz, len, moving, run, locked) {
  if (moving && !locked) {
    ix /= len; iz /= len; const sp = run ? 4.4 : 2.6 * (0.3 + 0.7 * Math.min(1, len)), nx = P.position.x + ix * sp * dt, nz = P.position.z + iz * sp * dt;
    if (nz > HD - 0.45 && Math.abs(nx) < 0.9 && iz > 0) { leave(); return; }
    const cz = Math.min(HD - 0.35, nz);
    if (!blockedAt(nx, cz)) { P.position.x = nx; P.position.z = cz; } else if (!blockedAt(nx, P.position.z)) P.position.x = nx; else if (!blockedAt(P.position.x, cz)) P.position.z = cz;
    P.rotation.y = Math.atan2(ix, iz);
  }
  animate(P, dt, moving && !locked ? (run ? 2 : 1) : 0, t);
  const tx = P.position.x * 0.5, tz = P.position.z * 0.5 + 0.5, za = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.9 : 1;
  camPos.lerp(new THREE.Vector3(tx, 13.5 * za, tz + 12 * za), Math.min(1, dt * 3)); camera.position.copy(camPos); camera.lookAt(tx, 0.6, tz - 0.5);
  // 和家裡一樣走後製：牆角與展示台下的環境光遮蔽、吊燈的泛光、暈影；景深對焦在角色身上
  const fx = post.fx, dof0 = fx.dof, ao0 = fx.ao;
  fx.golden = 0.25; fx.clear = 1; fx.sunVis = 0; fx.night = 0; fx.focus = camera.position.distanceTo(P.position); fx.dof = dof0 * 0.45; fx.ao = ao0 * 1.5;
  post.render(t, sc, camera);
  fx.dof = dof0; fx.ao = ao0;
}
export const hint = () => { if (Math.abs(P.position.x) < 1 && P.position.z > HD - 1.4) return '往下走出博物館'; const z = zone(); return z ? `看${WINGS.find(w => w.k === z.k).name}展區` : ''; };
export function handler() { const z = zone(); return z ? () => openWing(z.k) : null; }
const infoOf = (k, x) => k === 'fossil' ? `鑑定科目：${(window.TA.subject(x.sid) || {}).name || ''}` : k === 'mineral' ? `莫氏硬度 ${x.mohs} · ${stars(x.rarity)}` : `${whereName(k, x)}${x.weather === 'rain' ? '（雨天限定）' : ''} · ${k === 'sea' ? '退潮時' : fmtHours(x) + ' · ' + fmtMonths(x)} · ${stars(x.rarity)}`;
async function openWing(k) {
  const w = WINGS.find(x => x.k === k), s = S(), L2 = list(k), got = L2.filter(x => s.museum[k] && s.museum[k][x.id]);
  const body = ui.el('div', 'dex'), grid = ui.el('div', 'dex-grid'), info = ui.el('div', 'dex-info', `<small class="muted">${w.name}展區館藏 ${got.length} / ${L2.length}。點展品看說明；灰色的是還沒捐贈的。</small>`);
  L2.forEach(x => {
    const has = s.museum[k] && s.museum[k][x.id], b = ui.el('button', 'dex-cell' + (has ? ' donated' : ' unknown'), `<img src="${icon(x.id, k)}" alt="">`); b.type = 'button';
    b.onclick = () => { info.innerHTML = has ? `<div class="pk-sel"><img src="${icon(x.id, k)}" alt=""><div><b>${ui.esc(x.name)} <small>${ui.esc(x.en || '')}</small></b><small>${infoOf(k, x)}</small><p>${ui.esc(x.desc || '')}</p>${x.habitat ? `<p><b>自然棲地：</b>${ui.esc(x.habitat)}</p>` : ''}</div></div>` : k === 'sea' && !x.price ? '<small class="muted">保育類，不採集：在潮池答對海洋題、拍照記錄後，照片就會展示在這裡。</small>' : '<small class="muted">還沒有人捐贈這件展品。取得後交給史遙吧！</small>'; };
    grid.appendChild(b);
  });
  body.append(grid, info); ui.panel(`潮汐博物館 · ${w.name}展區`, body, { cls: 'dexp' });
}
