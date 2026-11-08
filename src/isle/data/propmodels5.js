/* 潮汐小島 · 松林 V4（v9.15 半寫實）：三種 3.3m 松／杉輪廓，曲幹＋一層層水平伸出的枝條，枝條上鋪針葉卡片。
   針葉是 Blender 算的雲杉枝圖集（models/tex_needles.js：2×2 格，每格一段羽狀枝，主枝從格子左緣中央往右伸），載入前用畫布畫的簡化枝條。
   每根枝條鋪三張卡：一張順著枝條、一張略偏一側、一張豎起來（側看也有厚度）；卡片雙面，法線混入外向受光場，整棵看得出圓錐的體積。
   以前是七層封閉的六角楔形葉團（藍綠色，像一層層疊起來的卡通聖誕樹）。
   根部原點；每株兩個 mesh／兩種材質。工廠只用自己的固定種子，不改變島上擺設的亂數序列。 */
(function(root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};
  const S = 1024;   // 圖集與替身畫布同尺寸：貼圖換上圖集時不必重新配置顯示卡記憶體
  let needles = null;

  /** 載入前的替身：每格一段實心的羽狀枝形（鋸齒狀的針葉邊緣、深淺兩層綠），版面和圖集相同；遠看也是一團針葉，不會變成枯枝 */
  function drawFallback(c) {
    c.clearRect(0, 0, S, S);
    for (let q = 0; q < 4; q++) {
      const h = S / 2; c.save(); c.translate((q % 2) * h, Math.floor(q / 2) * h);
      for (const [k, fill] of [[1, '#2c4429'], [0.62, '#3d5c35']]) {
        c.fillStyle = fill; c.beginPath(); c.moveTo(h * 0.05, h * 0.5);
        for (const sd of [-1, 1]) for (let i = 0; i <= 40; i++) {
          const t = sd < 0 ? i / 40 : 1 - i / 40, x = h * (0.05 + 0.9 * t), w = h * 0.3 * k * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8) * (i % 2 ? 0.72 : 1);
          c.lineTo(x, h * 0.5 + sd * w);
        }
        c.closePath(); c.fill();
      }
      c.restore();
    }
  }
  function needleTexture(THREE) {
    if (needles) return needles;
    const cv = document.createElement('canvas'); cv.width = cv.height = S; drawFallback(cv.getContext('2d'));
    const tex = new THREE.Texture(cv);
    tex.name = 'tidal-pine-needles-v4'; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
    const apply = url => { const img = new Image(); img.onload = () => { if (img.width === S && img.height === S) { tex.image = img; tex.needsUpdate = true; } }; img.src = url; };   // 直接用圖片（不經過畫布）：透明處預先擴散的針葉色才不會被預乘吃掉，縮圖時邊緣不發黑
    const pack = () => { const u = root.TA.NEEDLES; if (u) { apply(u); delete root.TA.NEEDLES; } };
    if (root.TA.NEEDLES) pack();
    else { const sc = document.createElement('script'); sc.src = (root.__MODEL_BASE || 'src/isle/models/') + 'tex_needles.js'; sc.onload = pack; document.head.appendChild(sc); }
    return (needles = tex);
  }

  function pine(THREE, kit, cfg) {
    let seed = cfg.seed;
    const rand = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    const TAU = Math.PI * 2, up = new THREE.Vector3(0, 1, 0), group = new THREE.Group();
    group.name = cfg.name;
    const bark = { p: [], n: [], c: [], uv: [], ix: [] }, leaf = { p: [], n: [], c: [], uv: [], ix: [] };
    const tex = needleTexture(THREE), wood = kit.mat('#7f6b5a', { roughness: 0.96, vertexColors: true }, 'bark');   // 灰褐的樹皮（以前偏橘的淺褐）
    const foliage = kit.card('#ffffff', tex, 'pine'), depth = kit.cardDepth(tex, 'pine');
    function axis(y) {
      const t = y / 3.3;
      return new THREE.Vector3(cfg.lean * t * t + Math.sin(t * 4.8) * 0.033, y, Math.sin(t * 3.6) * 0.04 + cfg.lean * t * 0.22);
    }
    function vertex(b, p, n, color, u, v) {
      b.p.push(p.x, p.y, p.z); b.n.push(n.x, n.y, n.z); b.c.push(color.r, color.g, color.b); b.uv.push(u, v);
    }
    // 連續收分的管狀幾何：主幹、枝條與外擴根都合在樹皮 mesh。
    function tube(points, radii, sides, shade) {
      const start = bark.p.length / 3, white = new THREE.Color();
      for (let i = 0; i < points.length; i++) {
        const tangent = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
        const u = new THREE.Vector3().crossVectors(tangent, Math.abs(tangent.z) > 0.92 ? up : new THREE.Vector3(0, 0, 1)).normalize();
        const v = new THREE.Vector3().crossVectors(tangent, u).normalize();
        for (let j = 0; j < sides; j++) {
          const a = j / sides * TAU, n = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
          const radius = radii[i] * (1 + (i === 0 ? 0.10 : 0.035) * Math.sin(j * 4.1));
          white.setScalar(shade * (0.92 + 0.08 * Math.cos(a + 0.7)));
          vertex(bark, points[i].clone().addScaledVector(n, radius), n, white, j / sides, i / (points.length - 1));
        }
      }
      for (let i = 0; i < points.length - 1; i++) for (let j = 0; j < sides; j++) {
        const a = start + i * sides + j, b = start + i * sides + (j + 1) % sides, c = b + sides, d = a + sides;
        bark.ix.push(a, b, c, a, c, d);
      }
      const end = start + (points.length - 1) * sides;
      for (let j = 1; j < sides - 1; j++) bark.ix.push(start, start + j + 1, start + j, end, end + j, end + j + 1);
    }
    const heights = [0, 0.12, 0.38, 0.82, 1.35, 1.9, 2.45, 2.9, 3.24];
    tube(heights.map(axis), [0.205, 0.15, 0.12, 0.105, 0.086, 0.063, 0.041, 0.021, 0.004], 7, 1);
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * TAU + 0.3, radius = 0.24 + rand() * 0.10;
      tube([new THREE.Vector3(Math.cos(a) * 0.07, 0.13, Math.sin(a) * 0.07), new THREE.Vector3(Math.cos(a) * radius, 0.025, Math.sin(a) * radius)], [0.073, 0.011], 4, 0.94);
    }
    /** 外向受光場：從幹軸往外、略朝上——同一層的卡片明暗連成圓錐的體積 */
    const outward = p => { const r = p.clone().sub(axis(p.y)); r.y = 0; if (r.lengthSq() < 1e-6) r.set(1, 0, 0); r.normalize(); r.y = 0.62; return r.normalize(); };
    const col = new THREE.Color();
    /** 一張針葉卡：u 順著 along（0 = 枝條根部、1 = 枝梢；圖集裡主枝從左往右），v 沿著 across；雙面 */
    function card(start, along, across, len, wid, shade) {
      const base = leaf.p.length / 3, cell = Math.floor(rand() * 4), u0 = (cell % 2) * 0.5, v0 = Math.floor(cell / 2) * 0.5, flip = rand() < 0.5;
      const mid = start.clone().addScaledVector(along, len * 0.5), out = outward(mid), face = new THREE.Vector3().crossVectors(along, across).normalize();
      if (face.dot(out) < 0) face.negate();
      for (const [a, b] of [[0, -1], [1, -1], [1, 1], [0, 1]]) {
        const p = start.clone().addScaledVector(along, a * len).addScaledVector(across, b * wid / 2);
        const n = outward(p).multiplyScalar(0.72).addScaledVector(face, 0.28).normalize();
        col.setScalar(shade * (0.94 + a * 0.1));   // 枝梢的新芽亮一點、靠幹的地方暗一點
        vertex(leaf, p, n, col, u0 + (0.03 + a * 0.94) * 0.5, v0 + ((flip ? -b : b) * 0.47 + 0.5) * 0.5);
      }
      leaf.ix.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 2, base + 1, base, base + 3, base + 2);
    }
    /** 一根枝條：細枝幹＋三張卡。t：這一層在樹上的高度（0 底、1 頂） */
    function branch(origin, dir, length, t, tint) {
      const along = dir.clone().addScaledVector(up, -0.16 + 0.32 * t + (rand() - 0.5) * 0.08).normalize();   // 下層的枝微微下垂、上層的往上翹
      const side = new THREE.Vector3(-dir.z, 0, dir.x), roll = (rand() - 0.5) * 0.5;
      const across = side.clone().applyAxisAngle(along, roll);
      tube([origin.clone(), origin.clone().addScaledVector(along, length * 0.55), origin.clone().addScaledVector(along, length * 0.85).addScaledVector(up, -0.02)], [0.022 * (1 - t * 0.6), 0.011 * (1 - t * 0.6), 0.003], 3, 0.9);
      card(origin.clone().addScaledVector(along, 0.03), along, across, length, length * 0.62, tint);
      const a2 = along.clone().applyAxisAngle(up, (rand() < 0.5 ? -1 : 1) * (0.28 + rand() * 0.16));
      card(origin.clone().addScaledVector(up, 0.035), a2, new THREE.Vector3(-a2.z, 0, a2.x).applyAxisAngle(a2, -roll), length * 0.84, length * 0.52, tint * 1.03);
      const vert = new THREE.Vector3().crossVectors(across, along).normalize();   // 豎起來的那張：側看時也有針葉的厚度
      card(origin.clone().addScaledVector(up, -0.02), along, vert.applyAxisAngle(along, roll * 0.6), length * 0.9, length * 0.4, tint * 0.9);
    }
    for (let layer = 0; layer < cfg.layers; layer++) {
      const t = layer / (cfg.layers - 1), count = cfg.branches[layer], height = 0.95 + t * 2.0;
      const reach = cfg.spread * Math.pow(1 - t * 0.86, 0.85);
      const phase = layer * 2.39996 + Math.sin(layer * 2.7) * 0.19;
      const first = leaf.ix.length;
      // 每一層兩輪：主輪，加上高一點、錯開半格、短一點的一輪（枝條更密、輪廓更參差）
      for (const [dh, k, n, off] of [[0, 1, count, 0], [0.15, 0.8, Math.max(3, count - 1), 0.5]]) {
        if (layer === cfg.layers - 1 && dh) continue;
        for (let b = 0; b < n; b++) {
          const angle = phase + (b + off) / n * TAU + (rand() - 0.5) * 0.2, dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
          const tt = Math.min(1, t + dh / 2), length = reach * k * (0.85 + rand() * 0.3), y = height + dh + (rand() - 0.5) * 0.12;
          branch(axis(y), dir, length, tt, (0.8 + tt * 0.18 + (rand() - 0.5) * 0.1) * (dh ? 1.02 : 1));
        }
      }
      // 索引範圍提供審查／選取語意，遊戲仍是一個 pine mesh 批次繪製。
      group.userData.pineLayers = group.userData.pineLayers || [];
      group.userData.pineLayers.push({ firstTriangle: first / 3, triangles: (leaf.ix.length - first) / 3, height });
    }
    // 幹軸周圍補幾張短卡：樹冠裡面暗一點、不會一眼看穿到樹幹後面的天空
    for (let i = 0; i < 7; i++) {
      const y = 1.05 + i * 0.27, a = i * 2.39996, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      card(axis(y), dir.clone().addScaledVector(up, 0.25).normalize(), new THREE.Vector3(-dir.z, 0, dir.x), 0.42 - i * 0.03, 0.3 - i * 0.02, 0.72);
    }
    // 樹梢：三張朝上的卡交錯成一根挺直的頂芽
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI, lean = new THREE.Vector3(Math.cos(a * 2.3) * 0.08, 1, Math.sin(a * 2.3) * 0.08).normalize();
      card(axis(2.72), lean, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 0.6, 0.24, 1.0);
    }
    function finish(bucket, material, name, customDepth) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(bucket.p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.n, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(bucket.c, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uv, 2)); geo.setIndex(bucket.ix);
      const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
      if (customDepth) mesh.customDepthMaterial = customDepth;
      group.add(mesh);
    }
    finish(bark, wood, cfg.name + '-bark'); finish(leaf, foliage, cfg.name + '-needles', depth);
    const bounds = new THREE.Box3().setFromObject(group), sy = 3.3 / (bounds.max.y - bounds.min.y);
    group.children.forEach(mesh => {
      mesh.geometry.translate(0, -bounds.min.y, 0); mesh.geometry.scale(1, sy, 1);
      mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
    });
    return group;
  }
  I.PROPMODELS['pine_a'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-a-slender', seed: 173, layers: 7, branches: [6, 6, 6, 5, 5, 4, 3], spread: 0.75, lean: 0.045 });
  I.PROPMODELS['pine_b'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-b-broad', seed: 619, layers: 7, branches: [7, 7, 7, 6, 6, 5, 4], spread: 0.97, lean: -0.035 });
  I.PROPMODELS['pine_c'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-c-leaning', seed: 1201, layers: 7, branches: [6, 6, 6, 6, 5, 5, 4], spread: 0.87, lean: 0.23 });
})(window);
