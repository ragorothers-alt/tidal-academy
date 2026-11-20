/* 潮汐小島 · 松林 V5：三種 3.3m 松／杉輪廓。幹慢慢彎、往上收細，樹冠底下留著幾截枯枝頭；
   主枝一輪一輪長但高低錯開：靠樹梢的往上斜、中段平伸、底下的被重量壓得下垂而梢又翹起來。每根主枝是一條跟著枝幹彎的針葉帶，
   再分出左右兩根較低的側枝、枝背上疊一層、枝梢豎一撮、底下垂一排小枝——走到樹旁邊側看也有厚度和空隙。
   V4（v9.15）是直幹＋一層層水平伸出的枝條，每根枝條鋪三張平的卡（近看像一片片薄架子插在直桿上，冬天的雪把每一道平直的邊都描出來）。
   針葉是 Blender 算的雲杉枝圖集（models/tex_needles.js：2×2 格，每格一段羽狀枝，主枝從格子左緣中央往右伸），載入前用畫布畫的簡化枝條。
   卡片雙面，法線混入外向受光場，整棵看得出圓錐的體積；枝幹的法線壓平（細枝不積雪）。
   更早是七層封閉的六角楔形葉團（藍綠色，像一層層疊起來的卡通聖誕樹）。
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
    const rand = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646, rr = (a, b) => a + rand() * (b - a);
    const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const TAU = Math.PI * 2, V = (x, y, z) => new THREE.Vector3(x, y, z), up = V(0, 1, 0), group = new THREE.Group();
    group.name = cfg.name;
    const bark = { p: [], n: [], c: [], uv: [], ix: [] }, leaf = { p: [], n: [], c: [], uv: [], ix: [] };
    const tex = needleTexture(THREE), wood = kit.mat('#7f6b5a', { roughness: 0.96, vertexColors: true }, 'bark');   // 灰褐的樹皮（以前偏橘的淺褐）
    const foliage = kit.card('#ffffff', tex, 'pine'), depth = kit.cardDepth(tex, 'pine');
    function axis(y) {
      const t = y / 3.3, A = cfg.sweep;   // 幹不是一根直桿：整體慢慢彎兩道，根部仍在原點（碰撞圓不動）
      return V(cfg.lean * t * t + A * (Math.sin(t * 4.4 + cfg.p1) - Math.sin(cfg.p1)), y, cfg.lean * t * 0.22 + A * 0.8 * (Math.sin(t * 3.3 + cfg.p2) - Math.sin(cfg.p2)));
    }
    function vertex(b, p, n, color, u, v) {
      b.p.push(p.x, p.y, p.z); b.n.push(n.x, n.y, n.z); b.c.push(color.r, color.g, color.b); b.uv.push(u, v);
    }
    const sideOf = d => V(0, 0, 0).crossVectors(d, up).normalize();   // 枝條的水平橫向
    /** 細枝留不住雪：法線壓平、偏向側面（engine 的積雪只看法線朝不朝上）——冬天細枝不會變成一根根白棍 */
    const shed = (n, tangent) => { const s = sideOf(tangent); if (n.dot(s) < 0) s.negate(); return V(n.x, Math.min(n.y, 0.1), n.z).addScaledVector(s, 0.5).normalize(); };
    // 連續收分的管狀幾何：主幹、枝條與外擴根都合在樹皮 mesh。thin：細枝（不積雪）
    function tube(points, radii, sides, shade, thin) {
      const start = bark.p.length / 3, white = new THREE.Color();
      for (let i = 0; i < points.length; i++) {
        const tangent = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
        const u = new THREE.Vector3().crossVectors(tangent, Math.abs(tangent.z) > 0.92 ? up : new THREE.Vector3(0, 0, 1)).normalize();
        const v = new THREE.Vector3().crossVectors(tangent, u).normalize();
        for (let j = 0; j < sides; j++) {
          const a = j / sides * TAU, n = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
          const radius = radii[i] * (1 + (i === 0 ? 0.10 : 0.035) * Math.sin(j * 4.1));
          white.setScalar(shade * (0.92 + 0.08 * Math.cos(a + 0.7)));
          vertex(bark, points[i].clone().addScaledVector(n, radius), thin ? shed(n, tangent) : n, white, j / sides, i / (points.length - 1));
        }
      }
      for (let i = 0; i < points.length - 1; i++) for (let j = 0; j < sides; j++) {
        const a = start + i * sides + j, b = start + i * sides + (j + 1) % sides, c = b + sides, d = a + sides;
        bark.ix.push(a, b, c, a, c, d);
      }
      const end = start + (points.length - 1) * sides;
      for (let j = 1; j < sides - 1; j++) bark.ix.push(start, start + j + 1, start + j, end, end + j, end + j + 1);
    }
    const heights = [0, 0.07, 0.19, 0.42, 0.78, 1.18, 1.6, 2.02, 2.42, 2.72, 2.96], girth = [0.212, 0.166, 0.136, 0.117, 0.104, 0.091, 0.076, 0.059, 0.043, 0.027, 0.007];   // 幹只到頂芽的針葉裡：樹皮不跟著風擺，露在外面的幹尖會和擺動的頂芽分家
    const trunkR = y => { let i = 1; while (i < heights.length - 1 && heights[i] < y) i++; return girth[i - 1] + (girth[i] - girth[i - 1]) * (y - heights[i - 1]) / (heights[i] - heights[i - 1]); };
    tube(heights.map(axis), girth, 8, 1);   // 根部外擴、往上一路收細
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * TAU + 0.3, radius = 0.24 + rand() * 0.10;
      tube([V(Math.cos(a) * 0.07, 0.13, Math.sin(a) * 0.07), V(Math.cos(a) * radius, 0.025, Math.sin(a) * radius)], [0.073, 0.011], 4, 0.94);
    }
    // 樹冠底下的幹上留著幾截枯枝頭（下層的枝枯掉、斷了剩下的），其中一兩根是還沒斷的細枯枝
    for (let j = 0; j < cfg.stubs; j++) {
      const y = 0.4 + (j + rand() * 0.6) / cfg.stubs * 0.52, a = j * 2.39996 + cfg.p2 + rr(-0.4, 0.4), o = axis(y), r = trunkR(y);
      const d = V(Math.cos(a), rr(0.05, 0.5), Math.sin(a)).normalize(), twig = j % 4 === 1, len = twig ? rr(0.3, 0.44) : rr(0.1, 0.22);
      if (twig) tube([o, o.clone().addScaledVector(d, r + len * 0.5), o.clone().addScaledVector(d, r + len).addScaledVector(up, -len * 0.22)], [0.02, 0.011, 0.004], 3, 0.74, true);
      else tube([o, o.clone().addScaledVector(d, r + len)], [0.034, rr(0.015, 0.022)], 4, 0.78);
    }
    /** 外向受光場：從幹軸往外、略朝上——同一層的卡片明暗連成圓錐的體積 */
    const outward = p => { const r = p.clone().sub(axis(p.y)); r.y = 0; if (r.lengthSq() < 1e-6) r.set(1, 0, 0); r.normalize(); r.y = 0.62; return r.normalize(); };
    const col = new THREE.Color();
    /** 一條針葉帶：順著 pts（小枝中線上的幾個點）鋪，每個點沿 acr 往兩側各伸半個 wid，帶子跟著枝條彎。
        u 從小枝根部到梢（圖集裡主枝從左往右）。half：只用圖集的半邊，帶子從中線往 acr 一側垂下去。雙面 */
    function strip(pts, acr, wid, tint, half) {
      const base = leaf.p.length / 3, cell = Math.floor(rand() * 4), u0 = (cell % 2) * 0.5, v0 = Math.floor(cell / 2) * 0.5, flip = rand() < 0.5 ? -1 : 1, n = pts.length, m = n >> 1;
      const tg = i => pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const sign = V(0, 0, 0).crossVectors(tg(m), acr[m]).dot(outward(pts[m])) < 0 ? -1 : 1;   // 整條帶子的正面朝同一邊（朝外的那邊）
      for (let i = 0; i < n; i++) {
        const a = i / (n - 1), face = V(0, 0, 0).crossVectors(tg(i), acr[i]).normalize().multiplyScalar(sign);
        for (const b of half ? [0, 1] : [-1, 1]) {
          const p = pts[i].clone().addScaledVector(acr[i], b * wid[i] * (half ? 1 : 0.5));
          col.setScalar(tint * (0.9 + a * 0.14) * (half ? 1 - b * 0.12 : 1));   // 枝梢的新芽亮一點、靠幹的地方暗一點；垂下去的小枝越往下越暗
          vertex(leaf, p, outward(p).multiplyScalar(0.72).addScaledVector(face, 0.28).normalize(), col, u0 + (0.03 + a * 0.94) * 0.5, v0 + (flip * b * 0.47 + 0.5) * 0.5);
        }
      }
      for (let i = 0; i < n - 1; i++) { const k = base + i * 2; leaf.ix.push(k, k + 2, k + 3, k, k + 3, k + 1, k, k + 3, k + 2, k, k + 1, k + 3); }
    }
    /** 一根主枝：從幹上伸出去的彎枝幹，外段分出兩根側枝，梢上再疊一撮往上的短枝、底下垂一排小枝——側看有厚度、有空隙，不是一片平板。
        t：這根枝在樹冠裡的高度（0 底、1 頂）。底下的枝先往外伸再被自己的重量壓得下垂、梢又翹起來；越往上越斜著往上長 */
    function bough(y, az, L, t, tint) {
      const K = 5, pts = [axis(y)];
      const e0 = -0.06 + 0.9 * Math.pow(t, 1.25) + rr(-0.16, 0.16), sag = (0.42 - 0.3 * t) * cfg.droop * rr(0.8, 1.2), lift = 0.36 - 0.1 * t, yaw = rr(-0.25, 0.25);
      for (let i = 1; i <= K; i++) {
        const s = (i - 0.5) / K, e = e0 - sag * smooth(0, 0.7, s) + lift * smooth(0.62, 1, s), a = az + yaw * s * s;
        pts.push(pts[i - 1].clone().add(V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(L / K)));
      }
      const at = s => { const f = Math.max(0, s) * K, i = Math.min(K - 1, Math.floor(f)); return pts[i].clone().lerp(pts[i + 1], f - i); };   // 中線上的點；s 超過 1 就順著梢延伸
      const tan = s => at(s + 0.1).sub(at(s - 0.1)).normalize();
      const big = L > 0.45, r0 = 0.006 + 0.017 * L;
      tube(big ? [at(0), at(0.28), at(0.56), at(0.84)] : [at(0), at(0.38), at(0.76)], big ? [r0, r0 * 0.72, r0 * 0.42, 0.004] : [r0, r0 * 0.5, 0.003], 3, 0.9, true);   // 枝幹只到針葉裡面：梢上不露出光禿禿的細棍
      /** 從主枝上分出去的一張短針葉：起點、方向、長、寬、繞自己的軸轉多少 */
      const spray = (q, d, len, wid, rl, shade) => { const ac = sideOf(d).applyAxisAngle(d, rl); strip([q, q.clone().addScaledVector(d, len)], [ac, ac], [wid, wid], shade); };
      // 主枝的針葉：順著彎枝鋪到梢外一點；底下的枝靠幹那一小段是光的（看得到枝幹）
      const s0 = 0.2 - 0.15 * t, s1 = 1.12, roll = rr(-0.36, 0.36), twist = rr(-0.55, 0.55), mp = [], ma = [], mw = [];
      for (let i = 0; i < 3; i++) { const s = s0 + (s1 - s0) * i / 2, d = tan(s); mp.push(at(s)); ma.push(sideOf(d).applyAxisAngle(d, roll + twist * i / 2)); mw.push(L * (0.66 + 0.1 * t)); }
      strip(mp, ma, mw, tint);
      // 側枝：左右各一根，比主枝短、再垂一點
      const forks = big ? 2 : 1, first = rand() < 0.5 ? -1 : 1;
      for (let f = 0; f < forks; f++) {
        const sd = f ? -first : first, sf = f ? rr(0.52, 0.66) : rr(0.3, 0.44), Lf = L * (f ? rr(0.4, 0.52) : rr(0.5, 0.64));
        const d = tan(sf).applyAxisAngle(up, sd * rr(0.6, 0.95)).addScaledVector(up, -rr(0.14, 0.42)).normalize();   // 側枝比主枝低：整根枝從梢看過去是中間高、兩邊垂的人字形，不是一片平板
        spray(at(sf).addScaledVector(up, f ? 0.012 : -0.012), d, Lf, Lf * 0.76, rr(-0.45, 0.45), tint * rr(0.94, 1.06));
      }
      if (big) {   // 枝梢豎著的一撮：枝梢的針葉有厚有薄
        const d = tan(0.9).addScaledVector(up, rr(-0.1, 0.25)).normalize(), Lt = L * rr(0.3, 0.42);
        spray(at(rr(0.72, 0.84)), d, Lt, Lt * rr(0.55, 0.8), Math.PI / 2 + rr(-0.45, 0.45), tint * 0.97);
      }
      if (L > 0.24) {   // 疊在枝背上的一層：短一點、偏一邊、往上翹
        const sc = rr(0.12, 0.3), d = tan(sc).applyAxisAngle(up, rr(-0.5, 0.5)).addScaledVector(up, rr(0.12, 0.32)).normalize(), Lc = L * rr(0.5, 0.62);
        spray(at(sc).addScaledVector(up, 0.05 + 0.04 * L), d, Lc, Lc * 0.7, -roll * 1.5 + rr(-0.2, 0.2), tint * 1.04);
      }
      {   // 靠幹的一小撮：樹冠裡面暗一點、不會一眼看穿到樹幹和後面的天空
        const d = tan(0.1).applyAxisAngle(up, rr(-0.7, 0.7)).addScaledVector(up, rr(0.2, 0.5)).normalize(), Li = Math.max(0.26, L * 0.44);
        spray(at(0.03), d, Li, Li * 0.8, rr(-0.5, 0.5), tint * 0.8);
      }
      if (L > 0.34 && t < 0.85) {   // 枝條底下垂著的一排小枝：越靠枝梢垂得越長
        const H = L * rr(0.3, 0.42) * (1 - 0.4 * t), tilt = rr(-0.5, 0.5), cp = [], ca = [], cw = [];
        [0.28, 0.66, 1.04].forEach((s, i) => { cp.push(at(s).addScaledVector(up, 0.015)); ca.push(V(0, -1, 0).applyAxisAngle(tan(s), tilt + (i - 1) * 0.2)); cw.push(H * [0.6, 1, 0.85][i]); });
        strip(cp, ca, cw, tint * 0.88, true);
      }
    }
    // 枝條一輪一輪長，但每根的高度錯開、長短不一，偶爾有一根長不好（輪廓有缺口，側看數不出一層一層）
    const W = cfg.branches.length, yLow = 0.88, yTop = 2.9, gap = (yTop - yLow) / (W - 1);
    for (let w = 0; w < W; w++) {
      const n = cfg.branches[w], phase = w * 2.39996 + Math.sin(w * 2.7) * 0.19, first = leaf.ix.length;
      for (let b = 0; b < n; b++) {
        const y = yLow + gap * (w + (w === W - 1 ? 0 : rr(-0.42, 0.42))), t = Math.min(1, Math.max(0, (y - yLow) / (yTop - yLow))), az = phase + (b + rr(-0.22, 0.22)) / n * TAU;
        const reach = Math.max(0.2, cfg.spread * Math.pow(1 - t * 0.86, 0.85)), weak = w < W - 2 && rand() < 0.12;
        bough(y, az, reach * (weak ? rr(0.5, 0.65) : rr(0.8, 1.14)), t, 0.8 + t * 0.18 + rr(-0.05, 0.05));
      }
      // 索引範圍提供審查／選取語意，遊戲仍是一個 pine mesh 批次繪製。
      group.userData.pineLayers = group.userData.pineLayers || [];
      group.userData.pineLayers.push({ firstTriangle: first / 3, triangles: (leaf.ix.length - first) / 3, height: yLow + gap * w });
    }
    // 幹軸周圍補幾張短卡：樹冠裡面暗一點、不會一眼看穿到樹幹後面的天空
    for (let i = 0; i < 16; i++) {
      const y = 1.0 + i * 0.125, a = i * 2.39996 + cfg.p2, e = rr(0.5, 1.0) + i * 0.01, dir = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)), o = axis(y), ac = sideOf(dir).applyAxisAngle(dir, rr(-0.6, 0.6)), len = 0.46 - i * 0.012;
      strip([o, o.clone().addScaledVector(dir, len)], [ac, ac], [0.34 - i * 0.007, 0.34 - i * 0.007], rr(0.72, 0.8));
    }
    // 樹梢：三張朝上的卡交錯成一根挺直的頂芽
    for (let i = 0; i < 3; i++) {
      const a = i * 1.047 + cfg.p1, ac = V(Math.cos(a), 0, Math.sin(a));
      strip([axis(2.7), axis(3.0), axis(3.25).addScaledVector(up, 0.07)], [ac, ac, ac], [0.22, 0.22, 0.22], 1.0);   // 跟著幹的走向彎（斜的那棵頂芽不會歪到幹外面）
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
  I.PROPMODELS['pine_a'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-a-slender', seed: 173, branches: [5, 5, 5, 5, 5, 5, 5, 5, 4], spread: 0.75, lean: 0.045, sweep: 0.05, p1: 0.4, p2: 2.0, droop: 1, stubs: 5 });
  I.PROPMODELS['pine_b'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-b-broad', seed: 619, branches: [6, 6, 6, 6, 6, 5, 5, 5, 5], spread: 0.97, lean: -0.035, sweep: 0.045, p1: 2.6, p2: 0.9, droop: 1.05, stubs: 6 });
  I.PROPMODELS['pine_c'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-c-leaning', seed: 1201, branches: [5, 6, 5, 6, 5, 5, 5, 5, 4], spread: 0.87, lean: 0.23, sweep: 0.06, p1: 1.2, p2: 4.0, droop: 0.9, stubs: 6 });
})(window);
