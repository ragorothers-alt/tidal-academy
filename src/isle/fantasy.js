/* 潮汐小島 · 日系奇幻遠景：天空中的浮空島、浮空岩上的白色城堡、繞著島飛的白鳥。
   遠景物件不套滾筒地平線的彎曲（彎曲會把幾十公尺外的東西壓到海面下）。每一格先算出「這個方向上彎曲後的地面與海面
   在畫面上最高到哪裡」（畫面上的地平線），再反推物件的世界高度，讓它停在地平線上方固定的畫面距離——
   鏡頭怎麼轉、拉多近，浮空島都穩穩浮在天上；顏色依距離混入天空色（大氣透視），越遠越淡、越偏藍。 */
import * as THREE from 'three';
import { scene, camera, skyU, U, cullable } from './engine.js';
import { groundAt } from './terrain.js';
import * as cumulus from './cumulus.js';
import { gloom } from './weather.js';
import { loadModel } from './actors.js';
import { MODEL_IDS } from './model-list.js';

const READY = new Set(MODEL_IDS);
const hazeU = { uHaze: { value: new THREE.Color('#cfe6ff') }, uDens: { value: 0.0024 }, uHazeMax: { value: 0.38 }, uFront: { value: new THREE.Color(0.5, 0.5, 0.5) }, uFarNight: { value: 0 }, uFarDay: { value: 1 } };

/** 保留原 Tripo UV／手繪貼圖；語意來自原貼圖色與模型高度，不把牆頂用斜率一律染藍。 */
function farMat(m, dens, fill, roofs, backdrop = true) {
  m.fog = false;
  const source = !!m.map, detail = !!m.userData.farDetail;
  if (source && m.emissive) { m.emissive.set('#ffffff'); m.emissiveMap = m.map; m.userData.fill = fill ?? 0.5; fills.push(m); }
  const u = { uDensK: { value: dens || 1 }, uFrontK: { value: roofs ? 0.78 : 0.9 } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, hazeU, u);
    sh.vertexShader = `varying float vFarD;
${source ? 'attribute float aFarKind; varying float vFarKind;' : ''}
${detail ? 'attribute float aFarGlow; varying float vFarGlow;' : ''}
` + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  vFarD = -mvPosition.z;
${source ? 'vFarKind = aFarKind;' : ''}
${detail ? 'vFarGlow = aFarGlow;' : ''}`);
    sh.fragmentShader = `uniform vec3 uHaze; uniform float uDens; uniform float uDensK; uniform float uHazeMax;
uniform vec3 uFront; uniform float uFrontK; uniform float uFarNight; uniform float uFarDay; varying float vFarD;
${source ? 'varying float vFarKind;' : ''}
${detail ? 'varying float vFarGlow;' : ''}
` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
${source ? `
  vec3 paint = diffuseColor.rgb;
  float paintL = dot(paint, vec3(0.3, 0.59, 0.11));
  // 乘色＋提亮：逐像素保留原筆觸，不以單一紫灰填平；草苔、水帶先排除。
  float leaf = smoothstep(0.015, 0.10, paint.g - max(paint.r, paint.b));
  float water = smoothstep(0.025, 0.14, min(paint.g, paint.b) - paint.r)
    * smoothstep(0.18, 0.50, paintL);
  if (vFarKind > 0.5 && vFarKind < 1.5) water = max(water,
    smoothstep(0.58, 0.82, paintL) * smoothstep(-0.02, 0.04, min(paint.g, paint.b) - paint.r));
  float daylight = (1.0 - uFarNight);
  if (vFarKind < 0.5) diffuseColor.rgb = (paint * vec3(1.52, 1.24, 1.30) + vec3(0.24, 0.20, 0.21)) * (1.0 + uFarDay * 0.95);
  else if (vFarKind < 1.5) diffuseColor.rgb = paint * vec3(1.45, 1.10, 2.45) + vec3(0.20, 0.15, 0.32);
  else if (vFarKind < 2.5) diffuseColor.rgb = paint * vec3(1.28, 1.18, 2.10) + vec3(0.24, 0.20, 0.50);
  else if (vFarKind < 3.5) diffuseColor.rgb = paint * vec3(1.12, 1.30, 0.94) + vec3(0.075, 0.12, 0.025);
  else diffuseColor.rgb = paint * vec3(1.55, 1.03, 1.65) + vec3(0.34, 0.19, 0.36);
  diffuseColor.rgb = mix(diffuseColor.rgb, paint * vec3(1.12, 1.30, 0.94) + vec3(0.075, 0.12, 0.025), leaf);
  diffuseColor.rgb = mix(diffuseColor.rgb, paint * vec3(1.10, 1.14, 1.20) + vec3(0.35, 0.42, 0.50), water);
  // 夜間保留原有輪廓照度，提亮只隨日光漸入，暖窗仍使用獨立發光通道。
  diffuseColor.rgb *= mix(0.66, 1.0, daylight);
` : ''}`)
      .replace('#include <opaque_fragment>', `
  float fFront = max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
  float fUp = dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)) * 0.5 + 0.5;
  outgoingLight += diffuseColor.rgb * uFront * uFrontK * (0.25 + 0.75 * fFront * fFront) * (0.45 + 0.55 * fUp);
  outgoingLight *= mix(vec3(0.88, 0.82, 1.0), vec3(1.0), smoothstep(0.15, 0.8, fFront));
${detail ? 'outgoingLight += vFarGlow * vec3(1.0, 0.54, 0.20) * (0.10 + uFarNight * 1.05);' : ''}
#include <opaque_fragment>`)
      .replace('#include <tonemapping_fragment>', `
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, clamp(1.0 - exp(-vFarD * uDens * uDensK), 0.0, uHazeMax));
#include <tonemapping_fragment>`);
    if (backdrop) {
      // 遠景自帶大氣，保留深度寫入與前後排序，使用後製既有 sky 深度帶避免第二次高度霧。
      // 僅遠島／城堡／遠橋；近景、相機、後製參數都不動。600m內約0.37m深度精度。
      sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n if (vFarD > 30.0) gl_FragDepth = 0.999901 + clamp(vFarD / 600.0, 0.0, 0.99) * 0.000098;');
    }
  };
  m.customProgramCacheKey = () => `far-painted-v3:${source}:${detail}:${!!roofs}:${backdrop}`;
  return m;
}

/** Sprite／星環也使用相同深度帶，讓後方的環與看板真正被城堡遮擋。 */
function backdropMaterial(m) {
  const previous = m.onBeforeCompile;
  m.onBeforeCompile = sh => {
    previous.call(m, sh);
    sh.vertexShader = 'varying float vBackdropD;\n' + sh.vertexShader;
    if (sh.vertexShader.includes('#include <project_vertex>')) sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vBackdropD = -mvPosition.z;');
    else sh.vertexShader = sh.vertexShader.replace('gl_Position = projectionMatrix * mvPosition;', 'vBackdropD = -mvPosition.z; gl_Position = projectionMatrix * mvPosition;');
    sh.fragmentShader = 'varying float vBackdropD;\n' + sh.fragmentShader.replace(/}\s*$/, 'if (vBackdropD > 30.0) gl_FragDepth = 0.999901 + clamp(vBackdropD / 600.0, 0.0, 0.99) * 0.000098;\n}');
  };
  m.customProgramCacheKey = () => 'far-sprite-depth-v2'; return m;
}

// 一次性三角形語意標記，不動原模型資料；同款島的幾何／材質共用。
const paintedGeometry = new WeakMap();
function preparePaint(mesh, castle) {
  const original = mesh.geometry;
  if (paintedGeometry.has(original)) { mesh.geometry = paintedGeometry.get(original); return; }
  const g = original.index ? original.toNonIndexed() : original.clone();
  g.computeBoundingBox();
  const p = g.attributes.position, uv = g.attributes.uv, H = g.boundingBox.max.y - g.boundingBox.min.y;
  const img = mesh.material.map?.image, cv = document.createElement('canvas');
  cv.width = img?.width || 1; cv.height = img?.height || 1;
  const c = cv.getContext('2d', { willReadFrequently: true }); if (img) c.drawImage(img, 0, 0);
  const pix = c.getImageData(0, 0, cv.width, cv.height).data, kinds = new Float32Array(p.count);
  for (let i = 0; i < p.count; i += 3) {
    let r = 0, b = 0, green = 0, y = 0;
    for (let j = 0; j < 3; j++) {
      const n = i + j, x = uv ? Math.min(cv.width - 1, Math.max(0, Math.floor(uv.getX(n) * cv.width))) : 0;
      const v = uv ? (mesh.material.map.flipY ? 1 - uv.getY(n) : uv.getY(n)) : 0;
      const k = (Math.min(cv.height - 1, Math.max(0, Math.floor(v * cv.height))) * cv.width + x) * 4;
      r += pix[k]; green += pix[k + 1]; b += pix[k + 2]; y += (p.getY(n) - g.boundingBox.min.y) / H / 3;
    }
    let kind = castle ? 0 : 1;
    if (castle && y < 0.40) kind = 1;
    if (green > r * 1.07 && green > b * 1.06) kind = 3;
    if (castle && y > 0.43 && b > r * 1.06 && b > green * 0.98) kind = p.getX(i) > 0.08 ? 4 : 2;
    kinds.fill(kind, i, i + 3);
  }
  g.setAttribute('aFarKind', new THREE.BufferAttribute(kinds, 1));
  // 只在語意邊界拆點；其餘還原原 GLB 的索引共用，保持逐三角形分色完全相同。
  if (original.index) {
    const remap = new Map(), refs = [], index = new Uint32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const key = original.index.getX(i) * 5 + kinds[i];
      if (!remap.has(key)) { remap.set(key, refs.length); refs.push(i); }
      index[i] = remap.get(key);
    }
    for (const name of Object.keys(g.attributes)) {
      const attribute = g.attributes[name], data = new attribute.array.constructor(refs.length * attribute.itemSize);
      for (let i = 0; i < refs.length; i++) for (let k = 0; k < attribute.itemSize; k++) data[i * attribute.itemSize + k] = attribute.array[refs[i] * attribute.itemSize + k];
      g.setAttribute(name, new THREE.BufferAttribute(data, attribute.itemSize, attribute.normalized));
    }
    g.setIndex(new THREE.BufferAttribute(index, 1));
  }
  paintedGeometry.set(original, g); mesh.geometry = g;
}

/* W21b：所有新增花藤、窗框、塔與拱廊合在一個有頂點色的批次。
   原 GLB／原 UV／原貼圖／原輪廓完整保留，新增量不取代原塔群。 */
function detailBuilder() {
  const p = [], n = [], c = [], e = [], col = new THREE.Color();
  return {
    add(geo, x, y, z, sx, sy, sz, color, glow = 0, turn = 0) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      const M = new THREE.Matrix4().makeRotationY(turn).scale(new THREE.Vector3(sx, sy, sz)).setPosition(x, y, z);
      g.applyMatrix4(M); col.set(color);
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) {
        p.push(P.getX(i), P.getY(i), P.getZ(i)); n.push(N.getX(i), N.getY(i), N.getZ(i));
        c.push(col.r, col.g, col.b); e.push(glow);
      }
      g.dispose(); geo.dispose();
    },
    mesh(name) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aFarGlow', new THREE.Float32BufferAttribute(e, 1));
      g.computeBoundingSphere();
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }); mat.userData.farDetail = true;
      const m = new THREE.Mesh(g, mat); m.name = name; return m;
    },
  };
}
const PEARL = '#fff1f3', LAVENDER = '#b7a7ed', ROSE = '#edb0dc', MINT = '#a7c780', IVORY = '#fff1de';
function ellipsoid(b, x, y, z, sx, sy, sz, color) { b.add(new THREE.SphereGeometry(1, sx > 0.025 ? 8 : 6, sx > 0.025 ? 6 : 4), x, y, z, sx, sy, sz, color); }
function turret(b, x, y, z, r, h, pink) {
  b.add(new THREE.CylinderGeometry(r * 0.82, r, h, 10), x, y + h / 2, z, 1, 1, 1, PEARL);
  for (const level of [0.08, 0.72, 0.98]) b.add(new THREE.CylinderGeometry(r * 1.16, r * 1.16, h * 0.04, 10), x, y + h * level, z, 1, 1, 1, IVORY);
  b.add(new THREE.ConeGeometry(r * 1.38, h * 0.6, 12), x, y + h * 1.30, z, 1, 1, 1, pink ? ROSE : LAVENDER);
  b.add(new THREE.ConeGeometry(r * 0.12, h * 0.16, 6), x, y + h * 1.65, z, 1, 1, 1, '#e8c48b');
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    b.add(new THREE.BoxGeometry(r * 0.32, h * 0.19, r * 0.08), x + Math.sin(a) * r * 0.94, y + h * 0.58, z + Math.cos(a) * r * 0.94, 1, 1, 1, '#735c83', 0, a);
    b.add(new THREE.BoxGeometry(r * 0.18, h * 0.13, r * 0.10), x + Math.sin(a) * r * 0.98, y + h * 0.58, z + Math.cos(a) * r * 0.98, 1, 1, 1, '#eebf86', 1, a);
  }
}
function blossom(b, x, y, z, r, seed) {
  b.add(new THREE.CylinderGeometry(r * 0.09, r * 0.15, r * 1.5, 6), x, y + r * 0.65, z, 1, 1, 1, '#ac8794');
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + seed, rr = i ? r * 0.52 : 0;
    ellipsoid(b, x + Math.cos(a) * rr, y + r * (1.45 + (i % 3) * 0.2), z + Math.sin(a) * rr,
      r * (0.7 + i % 2 * 0.14), r * 0.50, r * 0.65, ['#f3bdd2', '#f9dce5', '#cfbee8'][i % 3]);
  }
}
function vine(b, x, y, z, length, phase) {
  const pts = [];
  for (let i = 0; i <= 7; i++) pts.push(new THREE.Vector3(x + Math.sin(i * 0.7 + phase) * length * 0.055, y - i / 7 * length, z + Math.cos(i * 0.8 + phase) * length * 0.035));
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, length * 0.011, 4, false), 0, 0, 0, 1, 1, 1, '#83ac64');
  for (let i = 0; i < 9; i++) {
    const v = pts[Math.min(7, Math.floor(i * 7 / 8))], side = i % 2 ? 1 : -1;
    b.add(new THREE.IcosahedronGeometry(1, 0), v.x + side * length * 0.028, v.y, v.z, length * 0.039, length * 0.022, length * 0.019, i % 3 ? '#b7d888' : '#fff0f6');
    if (i % 3 === 0) b.add(new THREE.IcosahedronGeometry(1, 0), v.x, v.y - length * 0.04, v.z, length * 0.028, length * 0.055, length * 0.023, '#edc2d8');
  }
}
function modelRay(model) {
  model.updateMatrixWorld(true);
  const meshes = []; model.traverse(o => { if (o.isMesh) meshes.push(o); });
  const ray = new THREE.Raycaster();
  return (x, y, z, dx, dy, dz, filter) => {
    ray.set(new THREE.Vector3(x, y, z), new THREE.Vector3(dx, dy, dz).normalize());
    return ray.intersectObjects(meshes, false).find(h => !filter || filter(h));
  };
}
function castleDetails(model) {
  const b = detailBuilder(), ray = modelRay(model);
  // 四面各自按樓層找原牆表面；窗框、窗芯都有厚度，而非隨機灑在岩底的光點。
  let windows = 0;
  for (let level = 0; level < 5; level++) for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2, sx = Math.sin(a), sz = Math.cos(a), y = 0.43 + level * 0.046;
    const h = ray(sx * 1.1, y, sz * 1.1, -sx, 0, -sz, hit => Math.abs(hit.face.normal.y) < 0.42);
    if (!h || h.point.length() > 1.05) continue;
    const v = h.point.clone().addScaledVector(new THREE.Vector3(sx, 0, sz), 0.0024), w = level > 4 ? 0.006 : 0.008;
    const shape = new THREE.Shape(); shape.moveTo(-w, -w * 1.5); shape.lineTo(w, -w * 1.5); shape.lineTo(w, w * 0.35); shape.absarc(0, w * 0.35, w, 0, Math.PI, false); shape.closePath();
    b.add(new THREE.ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: false, curveSegments: 5 }), v.x, v.y, v.z, 1, 1, 1, '#8c6b94', 0, a);
    b.add(new THREE.ExtrudeGeometry(shape, { depth: 0.0025, bevelEnabled: false, curveSegments: 5 }), v.x + sx * 0.002, v.y, v.z + sz * 0.002, 0.68, 0.78, 1, '#f3c491', 0.78 + i % 3 * 0.11, a);
    windows++;
  }
  // 原城本來已有細高尖塔，新增低一級的六座庭院小塔與鏤空拱廊，讓層次向島緣展開。
  for (let i = 0; i < 6; i++) {
    const a = (i / 6 * Math.PI * 2) + 0.25, x = Math.sin(a) * 0.30, z = Math.cos(a) * 0.17;
    const h = ray(x, 1.1, z, 0, -1, 0, hit => hit.point.y < 0.53 && hit.face.normal.y > 0.35);
    if (h) turret(b, x, h.point.y, z, 0.013, 0.070 + i % 3 * 0.013, i % 2);
  }
  // 花樹與藤蔓都以原表面為根，不覆蓋原岩層。
  for (let i = 0; i < 15; i++) {
    const a = i * 2.39996, x = Math.sin(a) * (0.28 + i % 3 * 0.04), z = Math.cos(a) * 0.21;
    const h = ray(x, 1.05, z, 0, -1, 0, hit => hit.point.y < 0.49 && hit.face.normal.y > 0.2);
    if (h) blossom(b, x, h.point.y, z, 0.016 + i % 3 * 0.004, i);
  }
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2, sx = Math.sin(a), sz = Math.cos(a);
    const h = ray(sx, 0.33 + i % 3 * 0.012, sz, -sx, 0, -sz);
    if (h) vine(b, h.point.x + sx * 0.005, h.point.y, h.point.z + sz * 0.005, 0.085 + i % 4 * 0.024, i);
  }
  const m = b.mesh('far:castle-gardens-windows'); m.userData.windows = windows; model.add(m);
}
function isleDetails(model, variant) {
  const b = detailBuilder(), ray = modelRay(model);
  // 不動原草頂、樹與瀑布：花樹＋小屋／單塔各有深度，三款有不同天空剪影。
  const spots = [[-0.22, -0.12], [0.18, -0.12], [-0.09, 0.18], [0.24, 0.12]];
  for (let i = 0; i < 3; i++) {
    const [x, z] = spots[(i + variant) % spots.length], h = ray(x, 1.1, z, 0, -1, 0, hit => hit.point.y < 0.85 && hit.face.normal.y > 0.25);
    if (h) blossom(b, x, h.point.y, z, 0.048 + (i % 2) * 0.009, variant + i);
  }
  const x = variant === 1 ? -0.10 : 0.06, z = variant === 2 ? 0.12 : -0.04;
  const h = ray(x, 1.1, z, 0, -1, 0, hit => hit.point.y < 0.83 && hit.face.normal.y > 0.25);
  if (h) {
    if (variant === 1) turret(b, x, h.point.y, z, 0.033, 0.105, true);
    else {
      const y = h.point.y;
      b.add(new THREE.BoxGeometry(0.115, 0.073, 0.09), x, y + 0.036, z, 1, 1, 1, PEARL);
      const roof = new THREE.CylinderGeometry(0, 0.1, 0.066, 4); roof.rotateY(Math.PI / 4);
      b.add(roof, x, y + 0.100, z, 1, 1, 0.85, LAVENDER);
      for (const side of [-1, 1]) for (const wx of [-0.032, 0.032]) b.add(new THREE.BoxGeometry(0.018, 0.028, 0.003), x + wx, y + 0.042, z + side * 0.046, 1, 1, 1, '#f5c68e', 0.9);
      turret(b, x + 0.062, y, z, 0.019, 0.10, true);
    }
  }
  for (let i = 0; i < 13; i++) {
    const a = i / 13 * Math.PI * 2, sx = Math.sin(a), sz = Math.cos(a), y = 0.62 + i % 3 * 0.024;
    const h = ray(sx, y, sz, -sx, 0, -sz);
    if (h) vine(b, h.point.x + sx * 0.008, y, h.point.z + sz * 0.008, 0.12 + i % 4 * 0.037, i);
  }
  model.add(b.mesh('far:isle-blossoms-cottage-' + variant));
}
const dressed = new WeakMap();
function dressedModel(model, castle, variant = 0) {
  let variants = dressed.get(model); if (!variants) { variants = new Map(); dressed.set(model, variants); }
  const key = castle ? 'castle' : variant;
  if (!variants.has(key)) {
    const g = model.clone(true);
    g.traverse(o => { if (o.isMesh) preparePaint(o, castle); });
    if (castle) castleDetails(g); else isleDetails(g, variant);
    // 額外幾何不參與 place 的原始 bounds 計算，保留原世界大小與中心。
    variants.set(key, g);
  }
  return variants.get(key);
}

/* 遠景的配置：方位角（0 = 北方 -Z，順時針）、離島中心的水平距離、底部在畫面地平線上方多少（NDC，畫面高度 = 2）、大小 */
const ISLES = [
  { az: -0.42, d: 110, up: 0.62, size: 17.5, spin: 0.012, fall: 1, fill: 0.45 },   // 從廣場往北看：城堡的左上、右上各一座浮空島，垂著細長的瀑布
  { az: 0.64, d: 120, up: 0.68, size: 16, spin: -0.009, fall: 1, fill: 0.45 },   // v6.82：兩座都往外移，在島上任何地方往北看都不會擋到城堡（方位差 0.4 以上，含走到島邊的視差）
  { az: 2.4, d: 85, up: 0.14, size: 22, spin: 0.015 },
  { az: -2.1, d: 100, up: 0.3, size: 32, spin: -0.011 },
  { az: 1.05, d: 105, up: 0.4, size: 26, spin: 0.02 },
  { az: -1.05, d: 95, up: 0.25, size: 35, spin: -0.01 },
];
const CASTLE = { az: 0.18, d: 195, up: 0.4, size: 34, tall: 2.0, fill: 0.3, roofs: true };   // roofs：屋頂藍、牆白（著色器依貼圖顏色分開）   // 浮在天上的白色城堡：參考插畫裡它是整個畫面的焦點，比小浮空島大得多
/* v6.79 的島大了一倍（玩家可以走到離中心 40 公尺的地方）：浮空島與城堡放遠、放大同一個倍數，從廣場看一樣大，走到島的北端也不會壓到頭頂上 */
const FAR_K = 1.5;
[...ISLES, CASTLE].forEach(c => { c.d *= FAR_K; c.size *= FAR_K; });
const far = [], fills = [], puffs = [], skirts = [];   // far：{ g, az, d, up, half, ph, spin }；skirts：島底的雲霧（手繪雲貼圖載入後換上）
/* 雲霧：浮空島與城堡底下圍著幾團軟軟的雲（面向鏡頭的貼圖），受光的上緣白、下緣帶薰衣草紫 */
const puffTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 26 + Math.random() * 76, y = 50 + Math.random() * 36, r = 18 + Math.random() * 22;
    const g = c.createRadialGradient(x, y - r * 0.25, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.55, 'rgba(240,238,255,0.6)'); g.addColorStop(1, 'rgba(220,215,245,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const puffCol = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1), NO_HIT = () => {}, fillCol = new THREE.Color(), GOLD = new THREE.Color('#ffd4c6'), MOONLIT = new THREE.Color('#9eb0e8'), RAINY = new THREE.Color('#9aa2b4'), COOLSIDE = new THREE.Color('#c4b0dc'), frontCol = new THREE.Color();
/* 瀑布：從浮空島邊緣垂下的細長水流（面向鏡頭的貼圖）。水紋貼圖往下捲動，另一張不動的透明度貼圖讓上端細、下端散成水霧 */
const fallTex = (() => {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#e4f4ff'; c.fillRect(0, 0, 32, 128);
  for (let i = 0; i < 19; i++) { const x = Math.random() * 32, w = 1 + Math.random() * 2.5, y = Math.random() * 128, h = 20 + Math.random() * 60; c.fillStyle = `rgba(255,255,255,${0.18 + Math.random() * 0.32})`; c.fillRect(x, y, w, h); c.fillRect(x, y - 128, w, h); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const fallAlpha = (() => {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128; const c = cv.getContext('2d'), d = c.createImageData(32, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) {
    const v = y / 127, u = x / 31;
    let a = 0;
    for (let lane = 0; lane < 3; lane++) {
      const end = [0.97, 0.73, 0.86][lane], center = [0.31, 0.53, 0.69][lane] + Math.sin(v * 5 + lane * 2) * v * 0.014;
      const width = [0.075, 0.034, 0.024][lane] * (0.72 + v * 0.7);
      a = Math.max(a, (1 - THREE.MathUtils.smoothstep(Math.abs(u - center), width * 0.3, width)) * (1 - THREE.MathUtils.smoothstep(v, end * 0.62, end)));
    }
    a *= THREE.MathUtils.smoothstep(v, 0, 0.018) * 0.97; const i = (y * 32 + x) * 4;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.round(a * 255); d.data[i + 3] = 255;
  }
  c.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(cv); return t;
})();
const falls = [];

function place(model, cfg, dens) {
  const g = new THREE.Group(), m = dressedModel(model, cfg === CASTLE, cfg.variant || 0).clone(true);
  g.name = cfg === CASTLE ? "far:castle" : cfg.satellite ? "far:satellite" : "far:isle";
  // 原模型有拱廊的庭院正立面朝向主島；量體與原有外接橋的位置不變。
  if (cfg === CASTLE) m.rotation.y = Math.PI;
  m.traverse(o => { if (o.isMesh) { o.material = sharedFarMaterial(o.material, dens, cfg.fill, cfg.roofs && o.geometry); o.castShadow = o.receiveShadow = false; o.frustumCulled = true; } });   // 遠景不彎曲：three.js 的視錐剔除是對的，轉到畫面外就不畫
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const k = cfg.size / Math.max(size.x, size.z), ky = k * (cfg.tall || 1); m.scale.set(k, ky, k); m.position.set(-ctr.x * k, -ctr.y * ky, -ctr.z * k); size.y *= (cfg.tall || 1);   // tall：拉高（城堡的尖塔更細長）
  g.add(m); g.rotation.y = cfg.az + Math.PI;   // 正面朝向島
  const n = cfg.satellite ? 0 : cfg === CASTLE ? 3 : cfg.fall ? 0 : 4;   // 有瀑布的小島不圍雲霧，輪廓乾淨
  for (let i = 0; i < n; i++) {   // 底部一圈雲霧
    const sm = new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, fog: false, opacity: cfg === CASTLE ? 0.24 : 0.6 });
    backdropMaterial(sm);
    const sp = new THREE.Sprite(sm), a = i / n * Math.PI * 2 + Math.random() * 0.6, w = cfg.size * (0.55 + Math.random() * 0.35);
    sp.scale.set(w, w * 0.55, 1); sp.position.set(Math.cos(a) * cfg.size * 0.42, -size.y * k * (0.18 + Math.random() * 0.22), Math.sin(a) * cfg.size * 0.42);
    g.add(sp); puffs.push(sm); skirts.push({ sp, w, k: i % 2 ? 0 : 3 });
  }
  let fall = null;
  if (cfg.fall) {   // 瀑布不跟著島自轉，每格放在島朝向鏡頭的那一側
    const fm = new THREE.SpriteMaterial({ map: fallTex, alphaMap: fallAlpha, transparent: true, depthWrite: false, fog: false });
    backdropMaterial(fm);
    const sp = new THREE.Sprite(fm), L = size.y * k * 1.35; sp.center.set(0.5, 1); sp.scale.set(cfg.size * 0.17, L, 1); sp.raycast = NO_HIT;   // 從島緣流下、往下散進空氣裡
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, fog: false, opacity: 0.25 })); backdropMaterial(mist.material); mist.scale.set(cfg.size * 0.22, cfg.size * 0.1, 1); mist.raycast = NO_HIT;
    scene.add(sp, mist); puffs.push(mist.material); fall = { sp, mist, L, fm, profile: waterfallProfile(g, cfg.size, size.y * k / 2) }; falls.push(fall);
  }
  if (cfg === CASTLE) { aqueducts(g, cfg.size, size.y * k / 2); addLights(g, 8, 0.3, 0.82, 1.25); } else if (!cfg.satellite) addLights(g, 4, 0.66, 1.0, 1.0);
  g.traverse(o => { o.raycast = NO_HIT; });   // 遠景不擋鏡頭碰撞與點擊
  scene.add(g); far.push({ g, ...cfg, half: size.y * k / 2, deck: size.y * k * 0.23, ph: Math.random() * 6.28, spin: cfg.spin || 0, fall });
}

/* 水道橋：城堡兩側往外伸出的多拱石橋（參考插畫裡連著懸崖與城堡的那種），末端斷在雲霧裡。
   外框一筆畫完：沿著底邊走、遇到拱就往上繞一個半圓再下來，擠出成有厚度的牆 */
function aqueductGeo(L, H, n, D) {
  const s = new THREE.Shape(), w = L / n, r = w * 0.34;
  s.moveTo(-L / 2, 0); s.lineTo(-L / 2, -H);
  for (let i = 0; i < n; i++) { const cx = -L / 2 + w * (i + 0.5), top = -H * 0.24 - r; s.lineTo(cx - r, -H); s.lineTo(cx - r, top); s.absarc(cx, top, r, Math.PI, 0, true); s.lineTo(cx + r, -H); }
  s.lineTo(L / 2, -H); s.lineTo(L / 2, 0); s.lineTo(-L / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -D / 2);
  const cap = new THREE.BoxGeometry(L, H * 0.07, D * 1.35); cap.translate(0, H * 0.035, 0);   // 頂上的簷口
  return [g, cap];
}
/** 由下往上變亮的頂點色：橋腳暗（濕氣與地面反射少）、上面亮——遠看就有體積，不是一片剪紙 */
function shadeY(geo, y0, y1, lo) {
  const P = geo.attributes.position, C = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const k = THREE.MathUtils.clamp((P.getY(i) - y0) / (y1 - y0), 0, 1), v = lo + (1 - lo) * Math.pow(k, 0.7); C[i * 3] = v; C[i * 3 + 1] = v; C[i * 3 + 2] = v * 1.02; }
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); return geo;
}
function aqueducts(g, size, half) {
  const b = detailBuilder();
  [-1, 1].forEach(sd => {
    const L = size * (sd < 0 ? 0.7 : 0.95), H = half * 0.26, n = sd < 0 ? 4 : 5, D = size * 0.06, w = L / n;
    const [low] = aqueductGeo(L, H, n, D), [up, cap] = aqueductGeo(L, H * 0.42, n * 2, D * 0.85);
    const y = -half * (sd < 0 ? 0.22 : 0.3), x = sd * (size * 0.38 + L / 2);
    b.add(low, x, y, size * 0.05, 1, 1, 1, '#c5b0cb');
    b.add(up, x, y + H * 0.42, size * 0.05, 1, 1, 1, '#e4cedb');
    b.add(cap, x, y + H * 0.42, size * 0.05, 1, 1, 1, '#e5c9bc');
    b.add(new THREE.BoxGeometry(L, H * 0.035, D * 1.04), x, y + H * 0.40, size * 0.05, 1, 1, 1, '#a48ab7');
    for (let i = 0; i <= n; i++) b.add(new THREE.BoxGeometry(w * 0.3, H, D * 1.35), x - L / 2 + w * i, y - H / 2, size * 0.05, 1, 1, 1, '#cbb6d0');
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, fog: false, opacity: 0.35 }));
    backdropMaterial(mist.material); mist.scale.set(size * 0.5, size * 0.28, 1); mist.position.set(sd * (size * 0.38 + L * 0.98), y - H * 0.55, size * 0.05); g.add(mist); puffs.push(mist.material);
  });
  const m = b.mesh('far:aqueducts'); m.material = farMat(m.material, 0.36 / FAR_K); g.add(m);
}

/* 夜裡的燈火：島上的小窗、燈籠與城堡的窗戶。在模型表面挑點（島取上面三成、城堡取中段到尖塔下），沿法線往外推一點放小光點 */
const glowTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c = cv.getContext('2d'), g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,240,190,0.85)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  c.fillStyle = g; c.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const lights = [];   // 每盞燈：sm 材質、sp 光點、ph 閃爍相位
function addLights(g, n, y0, y1, size, src) {   // src：在哪個模型上挑點（預設整座島）；光點一律掛在 g 底下（塔樓有縮放，掛在塔樓下光點會變形）
  src = src || g; g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert(), meshes = []; src.traverse(o => { if (o.isMesh && o.geometry.attributes.position) meshes.push(o); });
  const box = new THREE.Box3().setFromObject(src).applyMatrix4(inv), H = box.max.y - box.min.y, v = new THREE.Vector3(), nrm = new THREE.Vector3(), nm = new THREE.Matrix3();
  let made = 0;
  for (let tries = 0; tries < n * 60 && made < n; tries++) {
    const m = meshes[Math.floor(Math.random() * meshes.length)], P = m.geometry.attributes.position, N = m.geometry.attributes.normal, i = Math.floor(Math.random() * P.count);
    v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
    const ry = (v.y - box.min.y) / H; if (ry < y0 || ry > y1) continue;
    if (N) { nrm.fromBufferAttribute(N, i).applyMatrix3(nm.getNormalMatrix(m.matrixWorld)).normalize(); if (nrm.y < -0.3) continue; v.addScaledVector(nrm, size * 0.35); }
    const sm = new THREE.SpriteMaterial({ map: glowTex, color: '#ffe6a0', transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const sp = new THREE.Sprite(sm); sp.position.copy(v); const k = size * (0.7 + Math.random() * 0.6); sp.scale.set(k, k, 1); sp.raycast = NO_HIT; sp.visible = false;
    g.add(sp); lights.push({ sm, sp, ph: Math.random() * 6.28 }); made++;
  }
}
/** 保留島頂神殿語意，使用有層檐、雙色尖頂與真窗的單塔，避免複製整座主城。 */
function towers(model) {
  far.filter(o => o.fall || o.temple).forEach((o, i) => {
    const b = detailBuilder(); turret(b, 0, 0, 0, o.size * 0.040, o.size * (i ? 0.17 : 0.20), i % 2);
    const m = b.mesh('far:temple'); m.material = farMat(m.material, 0.52 / FAR_K, 0.16);
    m.position.copy(landAt(o, (i ? -1 : 1) * o.size * 0.12, -o.size * 0.20)); m.raycast = NO_HIT;
    o.g.add(m);
  });
}

/* ---------- 白鳥：幾群繞著島飛，翅膀拍動、偶爾滑翔 ---------- */
const birds = [];
function makeBirds() {
  const mat = farMat(new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#d8e6ff', emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.8 }), 0.4, undefined, undefined, false);
  const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.22, 1.05, 0.13, -0.08, 0, 0, 0.22, 0.55, -0.06, 0.2, 1.05, 0.13, -0.08], 3)); wingG.computeVertexNormals();
  const bodyG = new THREE.SphereGeometry(0.14, 6, 4); bodyG.scale(1, 2.8, 1); bodyG.rotateX(Math.PI / 2);
  const flocks = [{ r: 46, h: 0.16, n: 5, sp: 0.04, ph: 0 }, { r: 62, h: 0.3, n: 4, sp: -0.03, ph: 2.4 }, { r: 40, h: 0.1, n: 3, sp: 0.05, ph: 4.1 }];   // h：在畫面地平線上方多少（NDC）
  flocks.forEach(f => {
    for (let i = 0; i < f.n; i++) {
      const b = new THREE.Group(), body = new THREE.Mesh(bodyG, mat), L = new THREE.Mesh(wingG, mat), R = new THREE.Mesh(wingG, mat);
      R.scale.x = -1; b.name = "far:bird"; b.add(body, L, R); b.scale.setScalar(0.9 + Math.random() * 0.4);
      b.traverse(o => { o.frustumCulled = cullable(o); o.raycast = NO_HIT; });
      scene.add(b);
      birds.push({ b, L, R, f, off: [(i % 3 - 1) * 1.6 + Math.random(), (Math.random() - 0.5) * 1.2, -Math.floor(i / 1.5) * 1.4], flap: Math.random() * 6.28, rate: 7 + Math.random() * 2 });
    }
  });
}

/* ---------- 遠景看板：Codex 畫的遠山、雲海、遠方的神殿浮空島、懸崖上的城市與水道橋（models/tex_farbg.js，去背的 WebP）----------
   跟積雲一樣立在地平線上、跟著鏡頭平移（等於在無限遠）。只對齊海面的地平線：被台地、懸崖擋住的部分本來就看不到。
   k 是貼圖編號：0–2 遠山、3–5 雲海、6–9 神殿浮空島、10 城市、11 水道橋；foot 是錨點（0 = 底部坐在地平線上、0.5 = 中心） */
const BG = [];
[[-2.75, 1], [-2.15, 0], [-1.55, 2], [-0.95, 1], [-0.5, 0], [0.8, 2], [1.3, 0], [1.85, 1], [2.45, 2], [3.05, 0]]
  .forEach(([az, k], i) => BG.push({ k, az, d: 440, w: 250 + (i % 3) * 30, up: -0.012, foot: 0, kind: 'mt' }));   // 遠山繞一圈，北方正中（城堡底下）留給海平線
for (let i = 0; i < 16; i++) {   // 雲海：一圈低矮的雲帶，把遠山的山腳與遠方浮空島的底部埋在雲裡；正北方薄一點，看得到海
  const az = -Math.PI + (i + 0.5) / 16 * Math.PI * 2, front = Math.abs(az - 0.1) < 0.45;
  BG.push({ k: front ? 5 : 3 + (i % 2), az, d: 330, w: front ? 150 : 210, up: front ? -0.034 : -0.02, foot: 0, kind: 'cloud' });
}
[[6, -0.7, 320, 30, 0.22], [7, 0.8, 330, 26, 0.2], [8, -1.05, 300, 20, 0.38], [9, 1.1, 280, 11, 0.46], [7, -1.7, 320, 26, 0.24], [6, 1.75, 320, 28, 0.28],
  [8, 2.6, 300, 20, 0.3], [9, -2.4, 300, 12, 0.28], [6, 3.0, 340, 28, 0.2], [9, -0.4, 340, 9, 0.56]]
  .forEach(([k, az, d, w, up]) => BG.push({ k, az, d, w, up, foot: 0.5, kind: 'isle' }));
// 遠方懸崖上的白色城市：比城堡低調很多，只在兩側的地平線上（正北方留給城堡與星環）
BG.push({ k: 10, az: 0.95, d: 440, w: 95, up: -0.02, foot: 0, kind: 'city' }, { k: 10, az: -2.0, d: 440, w: 90, up: -0.02, foot: 0, kind: 'city' },
  { k: 11, az: -0.9, d: 340, w: 70, up: 0.1, foot: 0.5, kind: 'isle' });
const bgs = [];
function loadFarBg() {
  const base = window.__MODEL_BASE || 'src/isle/models/';
  return new Promise(res => {
    if (window.TA && window.TA.FARBG) { res(window.TA.FARBG); return; }
    const sc = document.createElement('script'); sc.src = base + 'tex_farbg.js'; sc.onload = () => res((window.TA && window.TA.FARBG) || null); sc.onerror = () => res(null); document.head.appendChild(sc);
  }).then(pack => pack && Promise.all(pack.map(e => new Promise((ok, no) => new THREE.TextureLoader().load(e.src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ok({ tex: t, aspect: e.h / e.w }); }, undefined, no))))).catch(() => null);
}
async function buildBg() {
  const texs = await loadFarBg(); if (!texs || !texs.length) return;   // 沒有貼圖就不放（天幕上原本的遠島剪影還在）
  if (window.TA) delete window.TA.FARBG;
  BG.forEach(c => {
    const t = texs[c.k]; if (!t) return;
    const m = new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthWrite: false, fog: false });
    backdropMaterial(m);
    const s = new THREE.Sprite(m); s.center.set(0.5, c.foot); s.scale.set(c.w, c.w * t.aspect, 1); s.raycast = NO_HIT; s.renderOrder = -2; s.visible = false;
    scene.add(s); bgs.push({ s, m, c });
  });
}
let gloomK = 0;
const bgCol = new THREE.Color(), BG_DAWN = new THREE.Color('#ffd6cc'), BG_GOLD = new THREE.Color('#f4a07a'), BG_NIGHT = new THREE.Color('#3e4e86'), camF = new THREE.Vector3();
/** 從鏡頭往 (x, z) 的方向，彎曲後的海面在畫面上最高的位置（NDC y）——只看海面，不取樣地形（便宜、連續） */
function seaNdc(x, z) {
  const cx = camera.position.x, cz = camera.position.z, L = Math.hypot(x - cx, z - cz) || 1, dx = (x - cx) / L, dz = (z - cz) / L;
  const F = U.uBendF.value, K = U.uCurve.value, f = camera.projectionMatrix.elements[5], M = camera.matrixWorldInverse; let sea = -9;
  for (let s = 3; s < Math.min(L, 160); s += s < 30 ? 1.5 : 4) {
    vT.set(cx + dx * s, 0.27, cz + dz * s).applyMatrix4(M); if (vT.z > -0.5) continue;
    const bz = Math.max(-vT.z - F, 0); vT.y -= bz * bz * K; sea = Math.max(sea, f * vT.y / -vT.z);
  }
  return sea;
}
function updateBg(night, gold) {
  if (!bgs.length) return;
  bgCol.setRGB(1, 1, 1).lerp(BG_DAWN, skyU.dawn.value * 0.6).lerp(BG_GOLD, gold * 0.8).lerp(BG_NIGHT, THREE.MathUtils.smoothstep(night, 0, 0.6)).lerp(RAINY, gloomK * 0.55);
  camera.getWorldDirection(camF);
  bgs.forEach(o => {
    const c = o.c, sx = Math.sin(c.az), sz = -Math.cos(c.az);
    o.m.color.copy(bgCol);
    o.s.visible = sx * camF.x + sz * camF.z > -0.35; if (!o.s.visible) return;   // 在鏡頭背後：藏起來、不用重算位置（還沒定位過的看板停在原點，不能露出來）
    const x = camera.position.x + sx * c.d, z = camera.position.z + sz * c.d;
    o.s.position.set(x, yForNdc(x, z, seaNdc(x, z) + c.up), z);
  });
}

/* ---------- 星環：城堡後方天空的巨大魔法陣（參考插畫「星環浮城」）----------
   三層畫在 canvas 上的圖案（外圈符文與刻度、中圈星芒、內圈刻紋）各自慢慢轉；白天很淡、黃昏金色、夜裡藍白發光。
   永遠面向鏡頭、略微仰起成橢圓；加法混色、不寫深度，被城堡與雲擋住的地方自然看不到 */
const ring = { g: null, layers: [], col: new THREE.Color() };
const RING_DAY = new THREE.Color('#e4c6ec'), RING_DUSK = new THREE.Color('#ffd9ae'), RING_NIGHT = new THREE.Color('#bfc5f0');
function ringTex(draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const c = cv.getContext('2d');
  c.translate(512, 512); c.strokeStyle = c.fillStyle = '#ffffff'; c.lineCap = c.lineJoin = 'round'; draw(c);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function makeRing() {
  let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);   // 固定亂數：每次的符文都一樣
  const circ = (c, R, w) => { c.lineWidth = w; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.stroke(); };
  const gram = (c, n, step, R, w) => { c.lineWidth = w; c.beginPath(); for (let i = 0; i <= n; i++) { const a = (i * step % n) / n * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * R, y = Math.sin(a) * R; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); };
  const glyph = (c, k) => {   // 一個符文：兩到四筆直線、弧與點
    c.lineWidth = 3.2; const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      c.beginPath();
      if (r() < 0.35) c.arc((r() - 0.5) * k * 0.6, (r() - 0.5) * k * 0.6, k * (0.18 + r() * 0.25), r() * 6, r() * 6 + 1.5 + r() * 3);
      else { c.moveTo((r() - 0.5) * k, (r() - 0.5) * k); c.lineTo((r() - 0.5) * k, (r() - 0.5) * k); }
      c.stroke();
    }
    if (r() < 0.5) { c.beginPath(); c.arc((r() - 0.5) * k * 0.7, (r() - 0.5) * k * 0.7, 3.5, 0, 7); c.fill(); }
  };
  const outer = ringTex(c => {
    circ(c, 500, 9); circ(c, 474, 3); circ(c, 392, 3); circ(c, 378, 2);
    for (let i = 0; i < 33; i++) { c.save(); c.rotate(i / 33 * Math.PI * 2); c.translate(0, -432); glyph(c, 30); c.restore(); }   // 符文帶
    for (let i = 0; i < 108; i++) { c.save(); c.rotate(i / 108 * Math.PI * 2); c.fillRect(-1.6, -474, 3.2, i % 6 ? 9 : 20); c.restore(); }   // 外緣刻度
  });
  const star = ringTex(c => {
    circ(c, 362, 3); gram(c, 8, 3, 356, 3); gram(c, 6, 2, 300, 2.5); circ(c, 236, 2.5);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 - Math.PI / 2; c.beginPath(); c.arc(Math.cos(a) * 356, Math.sin(a) * 356, 14, 0, 7); c.stroke(); c.beginPath(); c.arc(Math.cos(a) * 356, Math.sin(a) * 356, 5, 0, 7); c.fill(); }
  });
  const inner = ringTex(c => {
    circ(c, 206, 3); circ(c, 158, 2.5); circ(c, 64, 3); circ(c, 30, 2);
    for (let i = 0; i < 24; i++) { c.save(); c.rotate(i / 24 * Math.PI * 2); c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -158); c.lineTo(0, i % 2 ? -182 : -206); c.stroke(); c.restore(); }
    for (let i = 0; i < 12; i++) { c.save(); c.rotate(i / 12 * Math.PI * 2 + 0.26); c.beginPath(); c.arc(0, -112, 6, 0, 7); c.fill(); c.restore(); }
    gram(c, 4, 1, 150, 2); gram(c, 3, 1, 140, 2);
  });
  const halo = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), g = c.createRadialGradient(128, 128, 30, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.62, 'rgba(255,255,255,0.18)'); g.addColorStop(0.8, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const g = new THREE.Group(), geo = new THREE.PlaneGeometry(1, 1);
  [[halo, 1.12, 0, 0.08], [outer, 1, 0.012, 1], [star, 0.74, -0.022, 0.9], [inner, 0.42, 0.05, 0.85]].forEach(([map, k, spin, w]) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    backdropMaterial(m.material);
    m.scale.setScalar(k); m.raycast = NO_HIT; m.renderOrder = -1; g.add(m); ring.layers.push({ m, spin, w });
  });
  g.scale.setScalar(78 * FAR_K); scene.add(g); ring.g = g;
}
const ringBase = new THREE.Vector3();
function updateRing(dt, t, night) {
  if (!ring.g) return;
  const c = far.find(o => o.roofs);   // 城堡（模型還沒載入時照城堡的方位與距離自己算）
  if (c) ringBase.copy(c.g.position); else { const x = Math.sin(CASTLE.az) * CASTLE.d, z = -Math.cos(CASTLE.az) * CASTLE.d; ringBase.set(x, yForNdc(x, z, horizonNdc(x, z) + CASTLE.up) + 20 * FAR_K, z); }
  const dx = ringBase.x - camera.position.x, dz = ringBase.z - camera.position.z, L = Math.hypot(dx, dz) || 1;
  ring.g.position.set(ringBase.x + dx / L * 45 * FAR_K, ringBase.y + (c ? c.half * 0.08 : 4 * FAR_K), ringBase.z + dz / L * 45 * FAR_K);
  ring.g.lookAt(camera.position); ring.g.rotateX(-0.24);   // 略微仰起：像斜掛在天上的橢圓
  const gold = Math.min(1, skyU.glow.value * 2);
  hazeU.uFarDay.value = (1 - night) * (1 - gold * 0.85) * (1 - gloomK * 0.5);
  ring.col.copy(RING_DAY).lerp(RING_DUSK, gold).lerp(RING_NIGHT, night);
  const op = ((0.035 + gold * 0.035) * (1 - night) + night * 0.095) * (1 - gloomK * 0.75), pulse = 0.92 + 0.08 * Math.sin(t * 0.8);   // v6.93：星環退到城堡後面當陪襯（夜裡也不壓過城堡）；陰雨天幾乎看不見
  ring.layers.forEach(o => { o.m.rotation.z += o.spin * dt; o.m.material.color.copy(ring.col); o.m.material.opacity = op * o.w * pulse; });
}

const farMaterialCache = new WeakMap();
function sharedFarMaterial(source, dens, fill, roofs) {
  let variants = farMaterialCache.get(source);
  if (!variants) { variants = new Map(); farMaterialCache.set(source, variants); }
  const key = `${dens}:${fill}:${!!roofs}`;
  if (!variants.has(key)) variants.set(key, farMat(source.clone(), dens, fill, roofs));
  return variants.get(key);
}
const SATELLITES = [
  { az: -0.22, d: 112 * FAR_K, up: 0.75, size: 6.5 * FAR_K, spin: -0.008, satellite: true },
  { az: 0.44, d: 121 * FAR_K, up: 0.80, size: 6.0 * FAR_K, spin: 0.007, satellite: true },
];
/** 在原 GLB 草頂上取固定的本地掛點；遠景平常不接受點擊，直接呼叫 Mesh.raycast 作建置時取樣。 */
function landAt(o, x, z) {
  o.g.updateWorldMatrix(true, true);
  const point = new THREE.Vector3(x, o.half * 2, z).applyMatrix4(o.g.matrixWorld);
  const ray = new THREE.Raycaster(point, new THREE.Vector3(0, -1, 0)), hits = [];
  o.g.children[0].traverse(m => { if (m.isMesh && m.material.map) THREE.Mesh.prototype.raycast.call(m, ray, hits); });
  hits.sort((a, b) => a.distance - b.distance);
  const hit = hits.find(h => h.point.y - o.g.position.y < o.half * 0.9 && h.face.normal.y > 0.2);
  if (hit) { const p = o.g.worldToLocal(hit.point.clone()); p.y += o.size * 0.004; return p; }
  return new THREE.Vector3(x, o.deck, z);
}
/** 一次取樣64個原崖緣，動畫只插值，水源不鑽進旋轉的岩島裡。 */
function waterfallProfile(g, size, half) {
  g.updateWorldMatrix(true, true);
  const result = [], inv = g.matrixWorld.clone().invert(), rotation = g.getWorldQuaternion(new THREE.Quaternion());
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2, dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const from = dir.clone().multiplyScalar(size * 2); from.y = half * 0.15; from.applyMatrix4(g.matrixWorld);
    const ray = new THREE.Raycaster(from, dir.clone().negate().applyQuaternion(rotation)), hits = [];
    g.children[0].traverse(m => { if (m.isMesh && m.material.map) THREE.Mesh.prototype.raycast.call(m, ray, hits); }); hits.sort((a, b) => a.distance - b.distance);
    const point = hits.length ? hits[0].point.clone().applyMatrix4(inv) : dir.clone().multiplyScalar(size * 0.43);
    const r = Math.hypot(point.x, point.z), ground = landAt({ g, size, half, deck: half * 0.46 }, dir.x * r * 0.92, dir.z * r * 0.92);
    // 原圖的樹冠也在同一網格；水源只到草崖高度，不讓向下取樣把瀑布掛到樹上。
    result.push({ r, y: Math.min(ground.y, half * 0.35) });
  }
  return result;
}
const links = [], linkUp = new THREE.Vector3(0, 1, 0);
function makeLinks() {
  const b = detailBuilder(), [arch, cap] = aqueductGeo(1, 0.065, 5, 0.022);
  b.add(arch, 0, 0, 0, 1, 1, 1, '#cfb8d4'); b.add(cap, 0, 0, 0, 1, 1, 1, '#f2dce5');
  const template = b.mesh('far:bridge-stone'); template.material = farMat(template.material, 0.36 / FAR_K);
  for (let i = 0; i < 2; i++) {
    const a = far.find(o => o.az === ISLES[i].az), island = far.find(o => o.satellite && o.az === SATELLITES[i].az);
    if (!a || !island) continue; a.linked = island.linked = true;
    const g = new THREE.Group(); g.name = 'far:bridge'; g.matrixAutoUpdate = false; g.add(template.clone());
    const dock = (o, other) => {
      const dir = new THREE.Vector3(Math.sin(other.az) * other.d - Math.sin(o.az) * o.d, 0, -Math.cos(other.az) * other.d + Math.cos(o.az) * o.d).normalize();
      o.g.updateWorldMatrix(true, true);
      const local = dir.multiplyScalar(o.size * 0.29).applyAxisAngle(linkUp, -o.g.rotation.y);
      return landAt(o, local.x, local.z);
    };
    const l = { g, a, b: island, da: dock(a, island), db: dock(island, a), A: new THREE.Vector3(), B: new THREE.Vector3(), X: new THREE.Vector3(), Y: new THREE.Vector3(), Z: new THREE.Vector3(), mid: new THREE.Vector3(), scale: new THREE.Vector3() };
    g.userData.endpoints = { a: l.A, b: l.B };
    g.userData.docks = { a: a.g, b: island.g, localA: l.da, localB: l.db };
    g.traverse(o => { o.raycast = NO_HIT; o.castShadow = o.receiveShadow = false; }); scene.add(g); links.push(l);
  }
}
function updateLinks(show, t) {
  links.forEach(l => {
    // 保留六座原島高度；衛星島共用其陸地高度帶，仍有獨立0.45m浮動。
    l.b.g.position.y = l.a.g.position.y + l.da.y - l.db.y + Math.sin(t * 0.31 + l.b.ph) * 0.45;
    l.a.g.updateWorldMatrix(true, false); l.b.g.updateWorldMatrix(true, false);
    l.A.copy(l.da).applyMatrix4(l.a.g.matrixWorld); l.B.copy(l.db).applyMatrix4(l.b.g.matrixWorld);
    l.X.subVectors(l.B, l.A); const L = l.X.length(); l.X.normalize();
    l.Z.crossVectors(l.X, linkUp).normalize(); l.Y.crossVectors(l.Z, l.X).normalize(); l.mid.addVectors(l.A, l.B).multiplyScalar(0.5);
    l.g.matrix.makeBasis(l.X, l.Y, l.Z).scale(l.scale.setScalar(L)).setPosition(l.mid);
    l.g.matrixWorldNeedsUpdate = true; l.g.position.copy(l.mid);
    l.g.visible = show && inCone(l.mid.x, l.mid.z, L * 0.6);
  });
}

export function build() {
  makeRing();
  const isles = READY.has('far_isle') ? loadModel('far_isle', 'none').then(gl => [...ISLES, ...SATELLITES].forEach((c, i) => { c.variant = i % 3; place(gl.scene, c, 0.52 / FAR_K); })).catch(e => console.warn('浮空島載入失敗：', e)) : Promise.resolve();
  const castle = READY.has('far_castle') ? loadModel('far_castle', 'none').then(gl => { place(gl.scene, CASTLE, 0.32 / FAR_K); return gl; }).catch(e => console.warn('城堡載入失敗：', e)) : Promise.resolve();
  Promise.all([isles, castle]).then(([, gl]) => { if (gl) { towers(gl.scene); makeLinks(); } });
  // 島底的雲霧換成和積雲同一套手繪貼圖（低矮雲帶、小朵雲交錯）：輪廓清楚、有受光面，近看不再是一團模糊的漸層
  Promise.all([isles, castle, cumulus.painted()]).then(([, , pt]) => {
    if (!pt || pt.length < 4) return;
    skirts.forEach(o => { const t = pt[o.k]; o.sp.material.map = t.tex; o.sp.material.needsUpdate = true; o.sp.scale.set(o.w * 1.15, o.w * 1.15 * t.aspect, 1); });
  });
  makeBirds();
  cumulus.build();
  buildBg();
}

let visible = true;
const vT = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
/* 畫面左右的範圍（v7.3）：沿路取樣地平線一次要算幾十個點，浮空島、鳥群、雲加起來每格約 1 毫秒。
   方向在畫面左右範圍外（多留約 35 度與物件本身的寬度）的就不算、先藏起來；鏡頭轉回來的那一格再算，畫面上看不出差別 */
const coneF = new THREE.Vector3(); let camHalf = 9;
function viewCone() {
  camera.getWorldDirection(coneF); coneF.y = 0; const l = Math.hypot(coneF.x, coneF.z);
  if (l < 0.05) { camHalf = 9; return; }   // 幾乎正對上下：全部都算
  coneF.x /= l; coneF.z /= l; camHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect) + 0.6;
}
/** (x, z) 這個方向會不會進畫面；w 是物件的半寬（公尺） */
export function inCone(x, z, w) {
  if (camHalf > 3.2) return true;
  const dx = x - camera.position.x, dz = z - camera.position.z, L = Math.hypot(dx, dz) || 1;
  return Math.acos(THREE.MathUtils.clamp((dx * coneF.x + dz * coneF.z) / L, -1, 1)) < camHalf + Math.atan2(w || 0, L);
}
/** 從鏡頭往 (x, z) 的方向，彎曲後的地面／海面在畫面上最高的位置（NDC y）；out.sea 是只看海面時的值（不受地形取樣影響，連續） */
function horizonNdc(x, z, out) {
  const cx = camera.position.x, cz = camera.position.z, L = Math.hypot(x - cx, z - cz) || 1, dx = (x - cx) / L, dz = (z - cz) / L;
  const F = U.uBendF.value, K = U.uCurve.value, f = camera.projectionMatrix.elements[5], M = camera.matrixWorldInverse; let best = -9, sea = -9;
  for (let s = 3; s < Math.min(L, 160); s += s < 30 ? 1.5 : 4) {
    const px = cx + dx * s, pz = cz + dz * s, g = Math.max(groundAt(px, pz), 0.02) + 0.25;
    vT.set(px, g, pz).applyMatrix4(M);
    let bz = Math.max(-vT.z - F, 0); vT.y -= bz * bz * K; if (vT.z > -0.5) continue;
    best = Math.max(best, f * vT.y / -vT.z);
    vT.set(px, 0.27, pz).applyMatrix4(M); bz = Math.max(-vT.z - F, 0); vT.y -= bz * bz * K;
    sea = Math.max(sea, f * vT.y / -vT.z);
  }
  if (out) out.sea = sea;
  return best;
}
/** 世界 (x, z) 上的哪個高度，投影到畫面上剛好是 NDC y = T（不彎曲） */
function yForNdc(x, z, T) {
  const f = camera.projectionMatrix.elements[5], M = camera.matrixWorldInverse;
  vA.set(x, 0, z).applyMatrix4(M); vB.set(x, 1, z).applyMatrix4(M).sub(vA);   // 世界高度每 +1，在視空間的變化
  return (-T * vA.z - f * vA.y) / (f * vB.y + T * vB.z);
}
/** 每格更新：night 0–1，show 表示目前在島上戶外 */
export function update(dt, t, night, show) {
  if (show !== visible) { visible = show; far.forEach(o => { o.g.visible = show; if (o.fall) o.fall.sp.visible = o.fall.mist.visible = show; }); birds.forEach(o => { o.b.visible = show; }); if (ring.g) ring.g.visible = show; bgs.forEach(o => { o.s.visible = show; }); }
  if (show) { camera.updateMatrixWorld(); viewCone(); }
  cumulus.update(show, horizonNdc, yForNdc, skyU.glow.value * 2, night, dt, inCone);
  if (!show) { updateLinks(false, t); return; }
  hazeU.uFarNight.value = night;
  gloomK = gloom() * (1 - night * 0.5);
  hazeU.uHaze.value.copy(skyU.bot.value).lerp(skyU.mid.value, 0.4); hazeU.uHazeMax.value = 0.38 + skyU.dawn.value * 0.06 - Math.min(1, skyU.glow.value * 2) * 0.03 + gloomK * 0.22;   // 清晨空氣多一點；陰雨天遠方淡進灰色的空氣。v7.4：黃金時段反而少一點（0.5 → 0.35）——太陽就在城堡後面，霧色是發亮的天色，以前塔群融成一片金白
  const gold = Math.min(1, skyU.glow.value * 2);
  fillCol.setRGB(1, 1, 1).lerp(GOLD, gold * 0.45).lerp(MOONLIT, night).lerp(RAINY, gloomK * 0.6);   // v6.93：黃昏的金色收一點（城堡不會融成一團黃白光）
  fills.forEach(m => { m.emissive.copy(fillCol); m.emissiveIntensity = m.userData.fill * 0.19 * (1 + night * 0.6); });   // v7.0：底光收一點，城堡、浮空島看得出受光面與背光面   // 一點均勻的底光，主要的亮度交給正面補光
  frontCol.copy(fillCol).lerp(COOLSIDE, gold * 0.55 * (1 - night));   // v7.4：黃金時段太陽多半在遠景後面（逆光）：朝向鏡頭的面是天空照著的冷色陰影，不是一片暖奶油
  hazeU.uFront.value.copy(frontCol).multiplyScalar(0.5 * (1 + night * 0.25) * (1 - gold * 0.12));   // v7.6 夢幻風：逆光時朝鏡頭的面是珍珠粉紫（以前灰藍），城堡是粉白的剪影、不是一團灰影   // 黃金時段正面補光也少 18%，塔面才分得出明暗   // 背光面也看得出岩層與草頂；夜裡是月光照著的藍灰
  const lit = Math.max(THREE.MathUtils.smoothstep(night, 0.15, 0.7), gold * 0.35 * THREE.MathUtils.smoothstep(skyU.sunDir.value.y, 0.45, 0.1));   // 黃昏開始亮燈
  lights.forEach(o => { o.sp.visible = lit > 0.01; o.sm.opacity = lit * (0.8 + 0.2 * Math.sin(t * 2.3 + o.ph)); });
  puffCol.copy(skyU.bot.value).lerp(WHITE, 0.55 * (1 - night) * (1 - gloomK * 0.7)).multiplyScalar(1 - night * 0.55);
  puffs.forEach(m => { m.color.copy(puffCol); });
  far.forEach(o => {
    const x = Math.sin(o.az) * o.d, z = -Math.cos(o.az) * o.d, on = inCone(x, z, (o.size || 60) * 0.8);
    o.g.visible = on; if (o.fall) o.fall.sp.visible = o.fall.mist.visible = on;
    if (!on && !o.linked) return;
    o.g.position.set(x, yForNdc(x, z, horizonNdc(x, z) + o.up) + o.half + Math.sin(t * 0.25 + o.ph) * 0.9, z);
    o.g.rotation.y += o.spin * dt;
    if (o.fall) {
      const f = o.fall, cx = camera.position.x - x, cz = camera.position.z - z;
      const angle = Math.atan2(cx, cz) + 0.18, a = ((angle - o.g.rotation.y) / (Math.PI * 2) % 1 + 1) % 1 * f.profile.length;
      const i = Math.floor(a), k = a - i, p = f.profile[i], q = f.profile[(i + 1) % f.profile.length];
      const r = THREE.MathUtils.lerp(p.r, q.r, k) + o.size * 0.006, y = THREE.MathUtils.lerp(p.y, q.y, k);
      f.sp.position.set(x + Math.sin(angle) * r, o.g.position.y + y, z + Math.cos(angle) * r);
      f.mist.position.set(f.sp.position.x, f.sp.position.y - f.L * 0.62, f.sp.position.z);
      f.fm.map.offset.y = (t * 0.35) % 1; f.fm.color.copy(puffCol).lerp(WHITE, 0.3 * (1 - night)).multiplyScalar(1 - night * 0.55);   // 晚上的瀑布是月光下淡淡的藍灰
    }
  });
  updateLinks(true, t);
  updateRing(dt, t, night);
  updateBg(night, gold);
  const flocks = new Set(birds.map(o => o.f));
  flocks.forEach(f => {   // 每群算一次高度（以隊伍中心為準）
    const a = t * f.sp + f.ph; f.x = Math.sin(a) * f.r; f.z = -Math.cos(a) * f.r;
    f.on = inCone(f.x, f.z, 12); if (f.on) f.y = yForNdc(f.x, f.z, horizonNdc(f.x, f.z) + f.h);
  });
  birds.forEach(o => {
    const f = o.f, a = t * f.sp + f.ph, ca = Math.cos(a), sa = Math.sin(a);
    if (!f.on) { o.b.visible = false; return; }
    // 隊形：沿飛行方向往後排、往兩側展開
    const fx = Math.sign(f.sp) * ca, fz = Math.sign(f.sp) * sa, sx = -fz, sz = fx;
    const px = f.x + sx * o.off[0] + fx * o.off[2], pz = f.z + sz * o.off[0] + fz * o.off[2];
    o.b.position.set(px, f.y + o.off[1] + Math.sin(t * 0.7 + o.flap) * 0.4, pz);
    o.b.rotation.set(0, Math.atan2(fx, fz), -Math.sign(f.sp) * 0.18);
    const glide = Math.sin(t * 0.35 + o.flap) > 0.55, w = glide ? 0.08 : Math.sin(t * o.rate + o.flap) * 0.55;
    o.L.rotation.z = w; o.R.rotation.z = -w;
    o.b.visible = night < 0.5;   // 晚上鳥回巢
  });
}
