/* 潮汐小島 · 用 3D 模型取代場景擺設（Tripo 產生的闊葉樹、杉樹、椰子樹、竹子、灌木、石頭、礁石、長椅、路燈、信箱）
   各擺設在建立時於 group.userData.prop 留下 { id, h, keep, kind } ——id 是模型檔、h 是要縮放到的高度、keep 是要保留的子物件（燈光、夜燈球、果實）、kind 可換著色方式（櫻花樹用 sakura）。
   模型還沒做好（不在 model-list.js）就維持原本的程式模型。 */
import * as THREE from 'three';
import { scene, scene as SCENE, renderer, sun, sunFar, HZ, bend, camera, U, leafGeo, canopyCards, useLeafTex, nightMats, shadowView } from './engine.js';
import * as shadows from './shadows.js';
import * as glow from './glow.js';
import { ULTRA } from './perf.js';
const isGlass = m => !Array.isArray(m) && nightMats.includes(m) && m.userData.kind === 'glass';   // kit.win() 的窗玻璃與燈籠
import { loadModel } from './actors.js';
import { MODEL_IDS } from './model-list.js';
import { NATURE_IDS, natureModel, natureCrown } from './naturemodels.js';
import { ROCK_IDS, natureRockModel } from './naturerocks.js';

const READY = new Set([...MODEL_IDS, ...NATURE_IDS, ...ROCK_IDS]);
const KIND = { prop_pine: 'pine', prop_palm: 'pine', prop_bamboo: 'pine', prop_tree: 'sway', prop_shrub: 'sway', prop_boulder: 'stone', prop_shorerock: 'stone' };   // 會隨風擺動的植物；其他是不動的擺設
/** 擺設模型的朝向修正（Tripo 靜態模型的正面方向，視模型而定） */
const TURN = {};
const LOW = new Set(['prop_shrub', 'prop_boulder', 'prop_shorerock', 'prop_mailbox']);
const TREES = new Set(['prop_tree', 'prop_palm', 'prop_pine', 'prop_bamboo']);

const box = new THREE.Box3(), size = new THREE.Vector3(), ctr = new THREE.Vector3();
const placed = [];   // 換上模型的擺設：{ g, model, r（包圍半徑）, cy（中心高度） }
const remat = {};   // 同一個模型換一種著色（例如櫻花樹用 sakura）：材質複製一份另外套 bend
function variant(gl, id, kind) {
  const key = id + '|' + kind; if (remat[key]) return remat[key];
  const model = gl.scene.clone(true), mats = new Map();
  model.traverse(o => { if (o.isMesh) { if (!mats.has(o.material)) { const m = o.material.clone(); m.defines = Object.assign({}, m.defines, { TA_MODEL: '' }); mats.set(o.material, bend(m, kind)); } o.material = mats.get(o.material); } });   // clone() 會把 defines 重設成材質預設值，要補回 TA_MODEL
  return (remat[key] = { scene: model });
}
function fit(g, gl, p) {
  if (!gl.scene.userData.natureProcedural && p.kind && p.kind !== (KIND[p.id] || 'plain')) gl = variant(gl, p.id, p.kind);
  const model = gl.scene.clone(true);
  model.rotation.y = TURN[p.id] || 0; model.updateMatrixWorld(true);
  const envelope = model.userData.natureBounds;
  if (envelope) box.set(new THREE.Vector3(...envelope.min), new THREE.Vector3(...envelope.max)); else box.setFromObject(model);
  box.getSize(size); box.getCenter(ctr);
  const k = p.w ? p.w / Math.max(size.x, size.z) : p.h / size.y;
  model.scale.multiplyScalar(k); model.position.set(-ctr.x * k, -box.min.y * k - (p.sink || 0) - (model.userData.natureSink || 0), -ctr.z * k);   // sink：往下埋一點（礁石半泡在浪裡）；灌木最低葉團沉地 1.5cm
  const keep = new Set(p.keep || []);
  g.children.forEach(c => { if (!keep.has(c) && !c.isLight) c.visible = false; });
  if (LOW.has(p.id)) model.traverse(o => { o.castShadow = false; });   // 矮小的擺設不投影子（省一次陰影繪製，看起來差不多）
  g.add(model);
  const extra = p.id === 'prop_tree' ? canopy(g, model, p) : null;   // 闊葉樹：葉片卡樹冠
  if (TREES.has(p.id)) g.traverse(o => { o.userData.camThrough = true; });   // 樹不擋鏡頭：站在樹的北邊時，鏡頭不會被樹幹拉到頭頂變成俯視特寫
  const r = Math.max(size.x, size.z) * k * 0.6 + (extra ? 0.8 : 0);   // 水平半徑（樹冠的葉片卡比模型的葉子大一圈）
  const sh = []; [model, extra].forEach(m => m && m.traverse(o => { if (o.isMesh && o.castShadow) sh.push(o); }));   // 樹、灌木、岩石：離陰影框太遠時暫停投影（見 cull）
  placed.push({ g, model, r, hy: size.y * k / 2 + 0.3, cy: size.y * k / 2, extra, sh });
}
/* 闊葉樹的樹冠（廣場大樹和島上其他闊葉樹）：模型的葉子是幾片很大的平面，近看像紙片。
   這裡把模型的葉子藏起來（著色器裡丟掉葉色的像素），只留樹幹枝椏，
   再依模型葉子的位置分成十幾團，每團用「暗色葉團內芯＋外圈細碎葉片卡」堆出蓬鬆、有團塊感的樹冠。 */
function leafPoints(model) {
  const pts = [], v = new THREE.Vector3(), cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.parent.matrixWorld).invert();
  model.traverse(o => {
    if (!o.isMesh || !o.material.map || !o.material.map.image) return;
    const img = o.material.map.image, W = 256, H = 256; cv.width = W; cv.height = H; cx.drawImage(img, 0, 0, W, H);
    const px = cx.getImageData(0, 0, W, H).data, pos = o.geometry.attributes.position, uv = o.geometry.attributes.uv, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < pos.count; i += 2) {
      const u = uv.getX(i) % 1, w = uv.getY(i) % 1, j = (Math.min(H - 1, Math.floor((o.material.map.flipY ? 1 - w : w) * H)) * W + Math.min(W - 1, Math.floor(u * W))) * 4;
      const r = px[j] / 255, gg = px[j + 1] / 255, b = px[j + 2] / 255;
      if (gg - r > -0.03 && gg - b > 0.02) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(m).clone());   // 和著色器裡模型葉色的判斷一樣
    }
  });
  return pts;
}
/** Neutral single-leaf fallback: alpha silhouette only, no repeated star / clover print. */
let HERO_TEX = null;
function heroLeafTex() {
  if (HERO_TEX) return HERO_TEX;
  const S = 128, d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x / (S - 1) - .5) * 2, v = (y / (S - 1) - .5) * 2, i = (y * S + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = 245;
    d[i + 3] = u * u / .72 + v * v < .92 ? 255 : 0;
  }
  const t = new THREE.DataTexture(d, S, S); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return (HERO_TEX = t);
}
const HERO_DEPTH = () => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: heroLeafTex(), alphaTest: 0.5 });
/** 低對比單葉貼圖（models/tex_leaves.js：金／綠共用 alpha）；載入失敗沿用單葉輪廓 */
let LEAF_LOAD = null;
function loadLeaves() {
  if (LEAF_LOAD) return LEAF_LOAD;
  const base = window.__MODEL_BASE || 'src/isle/models/';
  return (LEAF_LOAD = new Promise(res => {
    if (window.TA && window.TA.LEAVES) { res(window.TA.LEAVES); return; }
    const sc = document.createElement('script'); sc.src = base + 'tex_leaves.js'; sc.onload = () => res((window.TA && window.TA.LEAVES) || null); sc.onerror = () => res(null); document.head.appendChild(sc);
  }).then(pk => pk && Promise.all(['green', 'gold'].map(k => new Promise((ok, no) => new THREE.TextureLoader().load(pk[k], t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ok(t); }, undefined, no))))).catch(() => null));
}
function buildCanopy(g, model, kind, H) {
  const procedural = natureCrown(model);
  if (procedural) {
    const gold = m => { m.defines = { ...m.defines, TA_MODEL: '', ...(kind === 'sakura' ? { TA_GOLD: '' } : {}) }; return bend(m, kind); };
    const card = gold(new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, map: heroLeafTex(), alphaTest: .5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: .94 }));
    if (kind === 'sway') treeK(card);
    // Crown core and surface share one material (including fruit, a normal tree uses three).
    procedural.parts.forEach((geo, k) => geo.setAttribute('aNatureCore', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(k === 0 ? 1 : 0), 1)));
    const depth = HERO_DEPTH(), goldU = { value: null }, compile = card.onBeforeCompile;
    card.onBeforeCompile = (sh, renderer) => {
      compile(sh, renderer); sh.uniforms.uGoldMap = goldU;
      sh.vertexShader = 'attribute float aNatureCore;\nattribute vec3 aNatureAutumn;\nvarying float vNatureCore;\nvarying vec3 vNatureAutumn;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvNatureCore = aNatureCore;\nvNatureAutumn = aNatureAutumn;');
      sh.fragmentShader = 'uniform sampler2D uGoldMap;\nvarying float vNatureCore;\nvarying vec3 vNatureAutumn;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
        // Shape comes from geometry. Map RGB never prints a leaf spray on the opaque cloud core.
        // Vertex albedo is shared by core / edge leaves; only alpha cuts the small leaf silhouettes.
        float natureWash = 0.97 + 0.045 * n_v(vOP.xz * 4.7 + vOP.y * 2.3);
        diffuseColor.rgb *= natureWash;
        if (vNatureCore < 0.5) diffuseColor.a *= texture2D(map, vMapUv).a;
        #ifdef TA_LEAFTEX
          // Compensated material input for the unchanged seasonGLSL multipliers.
          vec3 goldC = vNatureAutumn * natureWash;
        #endif`);
    };
    card.customProgramCacheKey = () => `nature-crown-v2-${kind}`;
    loadLeaves().then(tx => {
      if (!tx) return;
      useLeafTex(tx[0], tx[1]); card.map = tx[0]; card.color.set('#ffffff'); goldU.value = tx[1];
      card.defines = { ...card.defines, TA_LEAFTEX: '' }; card.needsUpdate = true;
      depth.map = tx[0]; depth.side = THREE.DoubleSide; depth.needsUpdate = true;
    });
    const coreDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    return { h: H, noleaf: new Map(), C0: procedural.C0, parts: [[procedural.parts[0], card, coreDepth], [procedural.parts[1], card, depth]] };
  }
  let pts = leafPoints(model); if (pts.length < 40) return null;
  const top = pts.reduce((a, p) => Math.max(a, p.y), 0); pts = pts.filter(p => p.y > top * 0.36); pts.forEach(p => { p.x *= 1.15; p.z *= 1.15; });   // 樹冠從枝椏分岔處以上開始，底下露出樹幹
  // 藏起模型的葉子
  const noleaf = new Map();
  model.traverse(o => { if (o.isMesh && !noleaf.has(o.material)) { const m = o.material.clone(); m.defines = Object.assign({}, m.defines, { TA_MODEL: '', TA_NOLEAF: '' }); noleaf.set(o.material, bend(m, kind)); } });
  // k-means 分團（先用最遠點挑起始中心，團的分布才會散開）
  const K = 18, cs = [pts[0].clone()];   // 葉團少一點、大一點：遠看讀得出幾大團樹冠（以前 30 團，整棵是均勻的一片雜訊）
  while (cs.length < K) { let best = null, bd = -1; for (const p of pts) { let d = Infinity; for (const c of cs) d = Math.min(d, p.distanceToSquared(c)); if (d > bd) { bd = d; best = p; } } cs.push(best.clone()); }
  const lab = new Int32Array(pts.length);
  for (let it = 0; it < 8; it++) {
    pts.forEach((p, i) => { let bi = 0, bd = Infinity; cs.forEach((c, k) => { const d = p.distanceToSquared(c); if (d < bd) { bd = d; bi = k; } }); lab[i] = bi; });
    const sum = cs.map(() => new THREE.Vector3()), n = new Int32Array(K);
    pts.forEach((p, i) => { sum[lab[i]].add(p); n[lab[i]]++; });
    cs.forEach((c, k) => { if (n[k]) c.copy(sum[k].divideScalar(n[k])); });
  }
  const rad = new Float32Array(K), cnt = new Int32Array(K);
  pts.forEach((p, i) => { rad[lab[i]] += p.distanceToSquared(cs[lab[i]]); cnt[lab[i]]++; });
  const gold = m => { m.defines = Object.assign({}, m.defines, { TA_GOLD: '' }); return bend(m, kind); },   // TA_GOLD：整棵樹同一種金黃，不像一般秋樹每團顏色不同
    core = gold(new THREE.MeshStandardMaterial({ color: '#4f9a3e', roughness: 0.9 })), card = gold(new THREE.MeshStandardMaterial({ color: '#58b34d', map: heroLeafTex(), alphaTest: 0.5, alphaToCoverage: true, roughness: 0.9 })), depth = HERO_DEPTH();
  if (kind === 'sway') [core, card].forEach(treeK);   // 一般闊葉樹：每棵的秋色不同（廣場大樹是 sakura，不加）
  // 畫好的葉叢貼圖載入後：卡片的底圖換成綠葉叢，另外傳入金黃葉叢，著色器依季節在兩張之間切換（TA_LEAFTEX）
  const goldU = { value: null }, ob = card.onBeforeCompile;
  card.onBeforeCompile = (sh, r) => { ob(sh, r); sh.uniforms.uGoldMap = goldU; sh.fragmentShader = 'uniform sampler2D uGoldMap;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  #ifdef TA_LEAFTEX\n    vec3 goldC = diffuse * texture2D(uGoldMap, vMapUv).rgb;\n  #endif'); };
  loadLeaves().then(tx => {
    if (!tx) return;
    useLeafTex(tx[0], tx[1]);   // 其他用程式葉片卡的樹（夢境島、模型還沒載入時的樹）也換上手繪葉叢
    card.map = tx[0]; card.color.set('#ffffff'); goldU.value = tx[1]; card.defines = Object.assign({}, card.defines, { TA_LEAFTEX: '' }); card.needsUpdate = true;
    depth.map = tx[1]; depth.needsUpdate = true;
  });
  // 所有葉團合成一個網格、以整個樹冠的中心為原點：著色器用物件座標做的「頂亮底暗」與朝外的法線就變成整棵樹一個體積，
  // 不會每一團各自像一顆球（看起來像花椰菜）
  const keepK = cs.map((c, k) => cnt[k] >= 6), C0 = new THREE.Vector3(); let nk = 0;
  cs.forEach((c, k) => { if (keepK[k]) { C0.add(c); nk++; } }); C0.divideScalar(nk); C0.y -= 0.25;
  const cards = [], cores = [], v = new THREE.Vector3(), nn = new THREE.Vector3(), w = new THREE.Vector3();
  const place = (geo, c, rot, out, big, thin) => {
    const gg = geo.clone(); gg.rotateY(rot); gg.translate(c.x - C0.x, c.y - C0.y, c.z - C0.z);
    if (thin) { const ix = gg.index.array, keep = []; for (let q = 0; q < ix.length / 12; q++) if (((q * 7 + 3) % 10) / 10 >= thin) for (let j = 0; j < 12; j++) keep.push(ix[q * 12 + j]); gg.setIndex(keep); }   // 拿掉一部分葉片卡（每張卡 12 個索引）
    const P = gg.attributes.position, Nr = gg.attributes.normal;
    if (big) for (let i = 0; i < P.count; i += 4) {   // 葉片卡放大一倍（每張卡 4 個頂點，以卡片中心縮放）：畫好的葉子才是看得清楚的大小
      const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2) + P.getX(i + 3)) / 4, cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2) + P.getY(i + 3)) / 4, cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2) + P.getZ(i + 3)) / 4;
      for (let j = i; j < i + 4; j++) P.setXYZ(j, cx + (P.getX(j) - cx) * big, cy + (P.getY(j) - cy) * big, cz + (P.getZ(j) - cz) * big);
    }
    // 法線：整個樹冠的球面（體積）＋這一團自己的球面（一大團一大團的明暗，v7.0）＋一點卡片本身的方向（細碎）
    const ox = c.x - C0.x, oy = c.y - C0.y, oz = c.z - C0.z;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); w.set(v.x - ox, v.y - oy + 0.15, v.z - oz).normalize(); v.normalize(); nn.fromBufferAttribute(Nr, i).multiplyScalar(0.2).addScaledVector(v, 0.48).addScaledVector(w, 0.32).normalize(); Nr.setXYZ(i, nn.x, nn.y, nn.z); }
    out.push(gg);
  };
  // 樹冠要透氣：下層與中心的葉團葉片稀一點、不放暗色內芯，枝椏之間看得到天空；頂端的葉團左右錯開一點，輪廓不會是尖尖的一頂帽子
  let y0 = Infinity, y1 = -Infinity, rH = 0;
  cs.forEach((c, k) => { if (keepK[k]) { y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); rH = Math.max(rH, Math.hypot(c.x - C0.x, c.z - C0.z)); } });
  cs.forEach((c, k) => {
    if (!keepK[k]) return;
    const r = Math.min(1.05, Math.max(0.45, Math.sqrt(rad[k] / cnt[k]) * 1.15));   // 團和團互相重疊，連成一整片樹冠
    const t = (c.y - y0) / Math.max(y1 - y0, 0.01), inner = Math.hypot(c.x - C0.x, c.z - C0.z) < rH * 0.55, open = t < 0.45 || (inner && t < 0.9);
    const h = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1, cc = t > 0.7 ? c.clone().add(new THREE.Vector3((h - 0.5) * 0.45, 0, ((h * 7.3) % 1 - 0.5) * 0.45)) : c;
    if (!open) place(leafGeo(r * 0.42, k), cc, 0, cores);
    place(canopyCards(r, k * 3 + 1), cc, k * 1.7, cards, 2.6, open ? 0.65 : 0.2);
  });
  return { h: H, noleaf, C0, parts: [[merge(cores, false), core, null], [merge(cards, true), card, depth]] };
}
const CANOPY = {};
/* 每棵樹一個 0–1 的值（aTreeK，fillCanopies 依樹的位置填），著色器用它挑這棵樹的秋色（engine.js TA_TREEK）。
   v7.4：本來想用著色器裡依位置算的亂數（vSeed），但一起畫的樹冠在 GPU 上算出來幾乎都落在同一組，改由這裡決定 */
function treeK(m) {
  const ob = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    ob(sh, r);
    sh.vertexShader = 'attribute float aTreeK;\nvarying float vTreeK;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vTreeK = aTreeK;');
    sh.fragmentShader = 'varying float vTreeK;\n' + sh.fragmentShader;
  };
  m.defines = Object.assign({}, m.defines, { TA_TREEK: '' });
}
const hash2 = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
/** 七成跟著所在的 9 公尺區塊（相鄰兩三棵同色、成一群），三成自己抽：整體比例不變，但讀起來是一片片的色群，不是每棵隨機 */
const treeHash = (x, z) => { const X = Math.round(x * 10), Z = Math.round(z * 10); return hash2(X, Z) < 0.7 ? hash2(Math.floor(x / 9) + 101, Math.floor(z / 9) + 7) : hash2(Z + 3, X + 11); };
const AUTUMN_HEX = ['#D9B75F', '#DEA274', '#DA8F82', '#99A472'];
// Linear albedo, pre-divided by the existing engine tT and its 1.12 brightness gain.
// A shared gold texture alone cannot undo four different channel multipliers.
const AUTUMN_INPUT = AUTUMN_HEX.map((hex, i) => new THREE.Color(hex).toArray().map((v, j) => v / ([[1.12, .92, 1.6], [1.06, 1.06, 1.45], [1.02, .62, 1.7], [.45, .78, 1.5]][i][j] * 1.12)));
const HERO_AUTUMN_INPUT = new THREE.Color('#E0BB63').toArray().map((v, j) => v / ([1.04, .98, 1.45][j] * 1.12));
const autumnInput = (k, kind) => kind === 'sakura' ? HERO_AUTUMN_INPUT : AUTUMN_INPUT[k < .4 ? 0 : k < .7 ? 1 : k < .9 ? 2 : 3];
/** Rank coarse spatial groups: deterministic 35/30/20/15, keeping neighbouring trees together. */
function assignTreeColors(groups) {
  const trees = groups.filter(g => !g.userData.prop.kind || g.userData.prop.kind === 'sway');
  const block = g => hash2(Math.floor(g.position.x / 9) + 101, Math.floor(g.position.z / 9) + 7);
  trees.sort((a, b) => block(a) - block(b) || treeHash(a.position.x, a.position.z) - treeHash(b.position.x, b.position.z));
  trees.forEach((g, i) => { const q = (i + .5) / trees.length; g.userData.natureTreeK = q < .35 ? .2 : q < .65 ? .55 : q < .85 ? .8 : .95; });
}
/** 換上葉片卡樹冠：同一種模型（與著色方式）只算一次，以第一棵（廣場大樹排在最前面）的大小為準，其他棵依高度等比例縮放、共用網格與材質 */
function canopy(g, model, p) {
  const kind = p.kind || 'sway', key = p.id + '|' + kind;
  if (!(key in CANOPY)) CANOPY[key] = buildCanopy(g, model, kind, p.h);
  const c = CANOPY[key]; if (!c) return null;
  model.traverse(o => { if (o.isMesh && c.noleaf.has(o.material)) o.material = c.noleaf.get(o.material); });   // 藏起模型的葉子
  // 樹冠不再每棵各自兩個網格：同一種樹冠的所有樹用一個 InstancedMesh 一起畫（每格依畫面上看得到的樹重填，見 cull）
  if (!c.inst) {
    c.inst = c.parts.map(([geo, mat, depth]) => { const im = new THREE.InstancedMesh(geo, mat, 256); im.count = 0; im.castShadow = im.receiveShadow = true; im.frustumCulled = false; if (depth) im.customDepthMaterial = depth; scene.add(im); return im; });
    c.instS = c.parts.map(([geo, mat, depth]) => { const im = new THREE.InstancedMesh(geo, mat, 256); im.count = 0; im.castShadow = true; im.frustumCulled = false; im.layers.set(1); if (depth) im.customDepthMaterial = depth; scene.add(im); return im; });   // 畫面外、影子落進畫面的樹冠：只畫進陰影貼圖
    c.trees = []; INST.push(c);
    if (kind === 'sway') c.kA = c.parts.map(([geo]) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(256), 1); geo.setAttribute('aTreeK', a); return a; });
    c.kind = kind;
    if (c.parts[0][0].attributes.aNatureCore) c.autumnA = c.parts.map(([geo]) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3); geo.setAttribute('aNatureAutumn', a); return a; });
  }
  const hold = new THREE.Object3D(); hold.scale.setScalar(p.h / c.h); hold.position.set(0, 0, 0); g.add(hold);
  c.trees.push({ g, hold, vis: true, k: g.userData.natureTreeK }); return hold;
}
const INST = [], mA = new THREE.Matrix4(), mOff = new THREE.Matrix4();
/** 依目前看得到的樹，重填每種樹冠的 InstancedMesh */
function fillCanopies() {
  for (const c of INST) {
    mOff.makeTranslation(c.C0.x, c.C0.y, c.C0.z); let n = 0, ns = 0;
    for (const t of c.trees) {
      if (!t.g.parent || !t.hold.visible || !t.vis) continue;   // 已經移除的樹（例如被溪水佔掉）或看不到、影子也落不進畫面
      const shOnly = t.hold.userData.st === 2; if (shOnly ? ns >= 256 : n >= 256) continue;
      t.hold.updateWorldMatrix(true, false); mA.multiplyMatrices(t.hold.matrixWorld, mOff);
      if (c.kA && t.k == null) t.k = treeHash(t.hold.matrixWorld.elements[12], t.hold.matrixWorld.elements[14]);
      if (shOnly) { c.instS.forEach(im => im.setMatrixAt(ns, mA)); ns++; } else {
        c.inst.forEach(im => im.setMatrixAt(n, mA));
        if (c.kA) c.kA.forEach(a => { a.array[n] = t.k; });
        if (c.autumnA) c.autumnA.forEach(a => a.setXYZ(n, ...autumnInput(t.k, c.kind)));
        n++;
      }
    }
    if (c.kA) c.kA.forEach(a => { a.needsUpdate = true; });
    if (c.autumnA) c.autumnA.forEach(a => { a.needsUpdate = true; });
    c.inst.forEach(im => { im.count = n; im.instanceMatrix.needsUpdate = true; });
    c.instS.forEach(im => { im.count = ns; im.instanceMatrix.needsUpdate = true; });
  }
}
/** 簡單的網格合併（位置、法線，可選 uv；都要有索引） */
function merge(list, uv) {
  const P = [], Nr = [], UV = [], I = []; let base = 0;
  list.forEach(g => {
    const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv, ix = g.index;
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); Nr.push(n.getX(i), n.getY(i), n.getZ(i)); if (uv) UV.push(t.getX(i), t.getY(i)); }
    for (let i = 0; i < ix.count; i++) I.push(ix.getX(i) + base);
    base += p.count;
  });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(Nr, 3));
  if (uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  out.setIndex(I); return out;
}
/** 把場景裡所有標記過的擺設換成 3D 模型 */
export function dressAll() {
  const groups = [];
  scene.traverse(o => { if (o.userData && o.userData.prop && READY.has(o.userData.prop.id) && !o.userData.dressed) { o.userData.dressed = true; groups.push(o); } });   // 已經換過的不再換（可以重複呼叫）
  const byId = {};
  groups.sort((a, b) => (b.userData.prop.hero ? 1 : 0) - (a.userData.prop.hero ? 1 : 0));   // 廣場大樹先換：樹冠以它的大小為準
  groups.forEach(g => (byId[g.userData.prop.id] = byId[g.userData.prop.id] || []).push(g));
  Object.entries(byId).forEach(([id, gs]) => {
    if (id === 'prop_tree') assignTreeColors(gs);
    // Stable placement-derived variants do not consume props.js's island layout RNG.
    if (NATURE_IDS.has(id) || ROCK_IDS.has(id)) {
      try {
        gs.forEach(g => {
          const v = Math.floor(hash2(g.position.x * 10, g.position.z * 10) * 120);
          const gl = NATURE_IDS.has(id) ? natureModel(id, v) : natureRockModel(id, v);
          fit(g, gl, g.userData.prop);
        });
        return;
      } catch (e) { console.warn('程式化自然物失敗，回退來源 GLB：', id, e); }
    }
    loadModel(id, KIND[id] || 'plain').then(gl => {
    if (id === 'prop_shrub') gl.scene.traverse(o => { if (o.isMesh) { o.material.defines = Object.assign({}, o.material.defines, { TA_SHRUB: '' }); o.material.needsUpdate = true; } });   // 灌木：秋色淡一點
    gs.forEach(g => fit(g, gl, g.userData.prop));
    }).catch(e => console.warn('擺設模型載入失敗：', id, e));
  });
}

/* 視錐剔除：場景裡的物件都關掉了 three.js 的剔除（它用彎曲前的位置判斷，滾筒地平線會讓遠方的東西被誤剔除），
   模型擺設面數多，所以這裡自己判斷：用和著色器一樣的彎曲公式把中心點投影到畫面上，加上包圍半徑，
   完全在畫面外（留一圈邊界給投進畫面的影子）就不畫。 */
const vC = new THREE.Vector3(), cBox = new THREE.Box3(), cSize = new THREE.Vector3(), cCtr = new THREE.Vector3();
/** 程式化建築、地標與道具（v6.79 的 img2threejs 模型）也加入剔除：群組裡除了燈光以外的子物件收進一個 body，
    在畫面外時只藏 body（燈光留著：燈的數量一變，所有材質都要重新編譯）。包圍球從目前的包圍盒算 */
export function register(g) {
  if (g.userData.culled) return;
  g.updateMatrixWorld(true); cBox.setFromObject(g); if (cBox.isEmpty()) return;
  g.userData.glow = glow.scan(g, isGlass);   // 窗戶與燈籠：夜裡真的照亮門前
  cBox.getSize(cSize); cBox.getCenter(cCtr);
  const body = new THREE.Group(); [...g.children].forEach(c => { if (!c.isLight) body.add(c); }); g.add(body);
  g.userData.culled = true;
  // 陰影：小零件（包圍半徑 0.3 公尺以下：燈籠、釘飾、花）不投影；其他的離玩家太遠時（陰影貼圖只涵蓋玩家周圍）暫停投影（見 cull）
  const sh = [];
  body.traverse(o => { if (!o.isMesh || !o.castShadow) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = o.getWorldScale(cSize); if (o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z) < 0.3) o.castShadow = false; else sh.push(o); });
  cBox.getSize(cSize);   // 上面的 getWorldScale 用過 cSize
  placed.push({ g, model: body, r: Math.hypot(cSize.x, cSize.z) * 0.5 + 0.3, hy: cSize.y * 0.5 + 0.3, cy: cCtr.y - g.position.y, cx: cCtr.x - g.position.x, cz: cCtr.z - g.position.z, sh });
}
/** 已經在世界座標上的東西（例如一塊野花的 InstancedMesh 群組，放在原點）：直接給包圍球的世界中心與半徑 */
const ORIGIN = { position: new THREE.Vector3() };
export function registerAt(model, x, y, z, r, sh, hy) { placed.push({ g: ORIGIN, model, r, hy: hy ?? r, cx: x, cy: y, cz: z, sh: sh || null }); }   // r：水平半徑、hy：上下的半高；sh：會投影的網格（影子落不進看得到的地方時不畫進陰影貼圖）
/** 除錯：每種狀態有幾個（0 不畫、1 畫面裡、2 只畫進陰影貼圖）與這一格會投影的數量 */
export const cullStats = () => placed.reduce((m, o) => { m['s' + (o.st || 0)]++; if (o.rn) m.near++; if (o.rf) m.far++; return m; }, { s0: 0, s1: 0, s2: 0, near: 0, far: 0, n: placed.length });
/** 有窗戶的建築群組（walldress.js 在牆上掛藤蔓與花用） */
export const buildings = () => placed.filter(o => o.g.userData && o.g.userData.glow && o.g.userData.glow.some(e => e.kind === 'window')).map(o => o.g);
/** 拆掉的群組（房屋搬遷）不再剔除 */
export function unregister(g) { const i = placed.findIndex(o => o.g === g); if (i >= 0) placed.splice(i, 1); (g.userData.glow || []).forEach(glow.unemit); g.userData.glow = null; }
/** 包圍體（視空間中心 y = vy、深度 depth；往上 ey、前後 ez）彎曲後在畫面上最高到哪裡（NDC y）：
    越遠彎得越多，所以近端、遠端與中間的轉折點都要看 */
export function topNdc(vy, depth, ey, ez, F, K, fy) {
  const A = vy + ey, d1 = depth - ez; if (d1 < 0.5) return 9;   // 碰到鏡頭：當作看得到
  const g = d => { const bz = Math.max(d - F, 0); return (A - bz * bz * K) / d; };
  let m = Math.max(g(d1), g(depth + ez));
  if (K > 0 && A < 0) { const ds = Math.sqrt(F * F - A / K); if (ds > d1 && ds < depth + ez) m = Math.max(m, g(ds)); }
  return m * fy;
}
const meshesOf = o => o.meshes || (o.meshes = (() => { const a = []; o.model.traverse(m => { if (m.isMesh) a.push(m); }); return a; })());
/** 狀態：0 看不到、影子也落不進畫面（不畫）；1 在畫面裡；2 只畫進陰影貼圖（在畫面外，但影子落進看得到的地方：圖層 1，主畫面不畫） */
function setState(o, st) {
  o.st = st;
  if (!st) { o.model.visible = false; if (o.extra) { o.extra.visible = false; o.extra.userData.st = 0; } return; }
  o.model.visible = true; const mask = st === 1 ? 1 : 2;
  for (const m of meshesOf(o)) if (!m.userData.shadowProxy) m.layers.mask = mask;   // 陰影替身一直在圖層 2（props.js shadowProxy）
  if (o.extra) { o.extra.visible = true; o.extra.userData.st = st; }
}
/** 畫面外的東西，影子會落進畫面嗎：從它的底部往背著太陽的方向，沿著影子的長度（高度 ÷ 太陽仰角，最長 40 公尺）取三段，有一段在畫面裡就算 */
function shadowSeen(o) {
  const D = shadows.DIR, up = Math.max(D.y, 0.08), H = o.hy * 2, k = Math.min(H / up, 40) / (Math.hypot(D.x, D.z) || 1);
  const bx = o.px, by = o.py - o.hy, bz = o.pz;
  for (const t of [0.35, 0.7, 1]) { const d = vis(bx - D.x * k * t, by + 0.6, bz - D.z * k * t, o.r, 1); if (d === d) return true; }
  return false;
}
/** 包圍體（水平半徑 r、半高 hy 的圓柱）在光源座標系裡和陰影框重疊嗎：框外的物件，影子不會落進框裡（ax 是水平的） */
const inBox = (o, b) => Math.abs(o.px * b.ax.x + o.py * b.ax.y + o.pz * b.ax.z - b.ca) < b.r + o.r && Math.abs(o.px * b.ay.x + o.py * b.ay.y + o.pz * b.ay.z - b.cb) < b.r + Math.hypot(b.ay.x, b.ay.z) * o.r + Math.abs(b.ay.y) * o.hy;
let cF = 15, cK = 0, cfx = 1, cfy = 1, cM = null, hzY = -9, hzD = 1e9, hx = 1, vx = 0, hu = 1, vu = 0, hb = 1, vb = 0;
/** 包圍體（世界座標的中心、水平半徑 r、半高 hy 的圓柱）彎曲後在畫面上看得到嗎：看得到回傳最近一端的深度，看不到回傳 NaN。
    圓柱先換成視空間裡對齊鏡頭的盒子（半寬、半高、前後半深），每個方向都取最保守的一點 */
function vis(x, y, z, r, hy) {
  const e = cM, qx = e[0] * x + e[4] * y + e[8] * z + e[12], qy = e[1] * x + e[5] * y + e[9] * z + e[13], depth = -(e[2] * x + e[6] * y + e[10] * z + e[14]);
  const ex = hx * r + vx * hy, ey = hu * r + vu * hy, ez = hb * r + vb * hy, d1 = depth - ez, d2 = depth + ez;
  if (d2 < 0.5) return NaN;   // 整個在鏡頭後面
  if ((Math.abs(qx) - ex) * cfx / d2 > 1.02) return NaN;   // 整個在畫面左右兩邊外
  if (d1 < 0.5) return d1;   // 碰到鏡頭的平面：上下不判斷
  const top = topNdc(qy, depth, ey, ez, cF, cK, cfy); if (top < -1.02) return NaN;   // 整個在畫面下緣以下
  const low = d => { const bz = Math.max(d - cF, 0); return (qy - ey - bz * bz * cK) / d * cfy; };
  if (Math.min(low(d1), low(d2)) > 1.02) return NaN;   // 整個在畫面上緣以上
  if (d1 > hzD && top < hzY - 0.015) return NaN;   // 被彎下去的地平線（海面）擋住
  return d1;
}
export function cull() {
  const P = camera.projectionMatrix.elements, e = camera.matrixWorldInverse.elements;
  cF = U.uBendF.value; cK = U.uCurve.value; cfx = P[0]; cfy = P[5]; cM = e; hzY = HZ.y; hzD = HZ.d;
  const pxK = cfy * renderer.domElement.height * 0.5;   // 深度 1 公尺處，1 公尺在畫面上有幾個像素
  hx = Math.hypot(e[0], e[8]); vx = Math.abs(e[4]); hu = Math.hypot(e[1], e[9]); vu = Math.abs(e[5]); hb = Math.hypot(e[2], e[10]); vb = Math.abs(e[6]);   // 鏡頭的右、上、後三軸
  // 1. 在畫面裡看得到的（遠處沉到地平線下的整片花圃、房子不畫）；看得到的部分加進陰影要罩住的範圍——大的（整塊野花、整排道具）切成小格，只算畫面裡的那幾格
  for (const o of placed) {
    if (o.cx != null) vC.set(o.g.position.x + o.cx, o.g.position.y + o.cy, o.g.position.z + o.cz); else { vC.set(0, o.cy, 0); o.g.localToWorld(vC); }   // register 的包圍體中心是世界座標的偏移
    o.px = vC.x; o.py = vC.y; o.pz = vC.z;
    const nd = vis(o.px, o.py, o.pz, o.r, o.hy); o.on = nd === nd && (!ULTRA || Math.max(o.r, o.hy) * pxK / Math.max(nd, 0.5) > 5);   // 極省電：畫面上不到 5 個像素大的小東西（遠處的石頭、長椅、路燈）不畫
    if (!o.on) continue;
    if (o.r <= 6) { shadows.addBox(o.px, o.py, o.pz, o.r, o.hy, nd); continue; }
    const k = Math.min(4, Math.ceil(o.r / 4)), sz = o.r / k, rr = sz * 1.42;
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
      const x = o.px - o.r + sz * (2 * i + 1), z = o.pz - o.r + sz * (2 * j + 1), sd = vis(x, o.py, z, rr, o.hy);
      if (sd === sd) shadows.addBox(x, o.py, z, rr, o.hy, sd);
    }
  }
  for (const m of movers) {   // 走動的島民：在畫面裡的也算進陰影要罩住的範圍
    m.on = true; if (m.obj.parent !== SCENE || !m.obj.visible) continue;
    const p = m.obj.position, nd = vis(p.x, p.y + m.cy, p.z, m.r, m.hy); m.on = nd === nd;
    if (m.on) shadows.addBox(p.x, p.y + m.cy, p.z, m.r, m.hy, nd);
  }
  shadows.fit();   // 兩個陰影框罩住看得到的地方
  // 2. 影子會不會落進看得到的地方：在光源座標系裡和陰影框重疊的才畫進陰影貼圖（近處每一格畫；遠處只在要重畫的那一格）
  const N = shadowView.near, Fa = shadowView.far;
  for (const o of placed) {
    if (o.sh && o.sh.length && (o.on || shadowSeen(o))) { o.rn = inBox(o, N); o.rf = Fa.due && inBox(o, Fa); } else o.rn = o.rf = false;   // 畫面外的：影子真的落進畫面才畫
    const st = o.on ? 1 : o.rn || o.rf ? 2 : 0;
    if (st !== o.st) setState(o, st);
  }
  for (const m of movers) { if (m.on) { m.st = 1; continue; } const p = m.obj.position, b = { px: p.x, py: p.y + m.cy, pz: p.z, r: m.r, hy: m.hy }; m.st = inBox(b, N) || (Fa.due && inBox(b, Fa)) ? 2 : 0; }
  fillCanopies();
}
/* 會走動的東西（島民）：遊戲邏輯用 visible 表示「不在島上」，這裡不能動它，改用圖層——
   看不到的放到圖層 2（誰都不畫）、只有影子落進畫面的放到圖層 1（只畫進陰影貼圖），只在畫島上的那一次套用，畫完馬上還原（島民可能被帶進室內的場景） */
const movers = [], LAYERED = [];
/** obj：直接放在島上場景的群組；r 水平半徑、hy 半高、cy 中心離腳底的高度 */
export function track(obj, r, hy, cy) { if (!movers.some(m => m.obj === obj)) movers.push({ obj, r, hy, cy, on: true, st: 1 }); }
SCENE.onBeforeRender = () => {
  for (const m of movers) {
    if (m.st === 1 || m.obj.parent !== SCENE) continue;
    const mask = m.st === 2 ? 2 : 4;
    m.obj.traverse(o => { if (o.layers.mask === 1) { o.layers.mask = mask; LAYERED.push(o); } });
  }
};
SCENE.onAfterRender = () => { for (const o of LAYERED) o.layers.mask = 1; LAYERED.length = 0; };
/* 陰影貼圖分兩次畫（近處、遠處），每次只讓影子會落進那個框的模型投影；畫面外的模型（圖層 1）只在畫陰影時看得到。
   three.js 畫陰影時用主鏡頭的圖層判斷，所以這段時間把主鏡頭的圖層暫時加上 1 */
{
  const sm = renderer.shadowMap, orig = sm.render, ONE = [sun], TWO = [sunFar];
  const casters = which => { for (const o of placed) { if (!o.sh || !o.st) continue; const want = which ? o.rf : o.rn; if (o.cs !== want) { o.cs = want; for (const m of o.sh) m.castShadow = want; } } };
  sm.render = function (lights, scene, cam) {
    if (scene !== SCENE || lights.length !== 2 || !lights.includes(sunFar)) {   // 只有一層陰影（省電）：一樣打開圖層 2，陰影替身才會投影
      if (scene !== SCENE) return orig.call(sm, lights, scene, cam);
      const m1 = cam.layers.mask; cam.layers.mask = m1 | 2 | 8; orig.call(sm, lights, scene, cam); cam.layers.mask = m1; return;
    }
    const m0 = cam.layers.mask; cam.layers.mask = m0 | 2 | 8;   // 圖層 3（post.js 第二階段才畫的透明物）照樣投影
    casters(0); orig.call(sm, ONE, scene, cam);
    if (sunFar.shadow.needsUpdate) { casters(1); orig.call(sm, TWO, scene, cam); }
    cam.layers.mask = m0;
  };
}
