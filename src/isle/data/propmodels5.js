/* 潮汐小島 · 松林 V2：三種 3.3m 松／杉輪廓，曲幹＋七層重疊垂枝團＋厚摺針葉簇。
   根部原點；每株兩個 mesh／兩種材質。上下表面共用外向受光場，不使用 DoubleSide。
   工廠只用自己的固定種子，不改變島上擺設的亂數序列。 */
(function(root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};
  let needles = null;

  // 大塊針葉簇：中央連成面，邊緣以六組寬楔簇交錯，沒有單像素細針。
  // 透明區同樣擴色；低頻灰階不把烘焙陰影重複乘進遊戲光照。
  function needleTexture(THREE) {
    if (needles) return needles;
    const S = 256, pixels = new Uint8Array(S * S * 4);
    for (let i = 0; i < pixels.length; i += 4) pixels[i] = pixels[i + 1] = pixels[i + 2] = 246;
    // 寬楔形的多尖葉簇，最窄處仍有 6–10 texels；縮小後保留一團一團的缺口。
    function polygon(points, gray) {
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      for (let y = Math.max(0, Math.floor(Math.min(...ys) * S)); y <= Math.min(S - 1, Math.ceil(Math.max(...ys) * S)); y++) {
        for (let x = Math.max(0, Math.floor(Math.min(...xs) * S)); x <= Math.min(S - 1, Math.ceil(Math.max(...xs) * S)); x++) {
          const px = (x + 0.5) / S, py = (y + 0.5) / S; let inside = false;
          for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const [ax, ay] = points[i], [bx, by] = points[j];
            if ((ay > py) !== (by > py) && px < (bx - ax) * (py - ay) / (by - ay) + ax) inside = !inside;
          }
          if (inside) { const i = (y * S + x) * 4; pixels[i] = pixels[i + 1] = pixels[i + 2] = gray; pixels[i + 3] = 255; }
        }
      }
    }
    polygon([[0.015, 0.38], [0.20, 0.29], [0.82, 0.35], [0.985, 0.5], [0.82, 0.65], [0.20, 0.71], [0.015, 0.62]], 229);
    for (let j = 0; j < 6; j++) for (const side of [-1, 1]) {
      const x = 0.06 + j * 0.13, reach = 0.33 + Math.sin(j / 6 * Math.PI) * 0.06;
      const points = [[x - 0.04, 0.5], [x - 0.015, 0.5 + side * 0.22],
        [x + 0.035, 0.5 + side * reach], [x + 0.065, 0.5 + side * (reach - 0.065)],
        [x + 0.13, 0.5 + side * (reach + 0.025)], [x + 0.14, 0.5 + side * (reach - 0.10)],
        [x + 0.22, 0.5 + side * (reach - 0.045)], [x + 0.18, 0.5 + side * 0.15], [x + 0.08, 0.5]];
      polygon(points, 218 + (j % 3) * 11);
      // 一簇內只畫兩個低對比寬面，沒有獨立細針／隨機噪點。
      polygon([[x + 0.025, 0.5], [x + 0.07, 0.5 + side * (reach - 0.06)],
        [x + 0.12, 0.5 + side * (reach - 0.09)], [x + 0.15, 0.5 + side * 0.13]], 240 + (j % 2) * 9);
    }
    polygon([[0.76, 0.42], [0.88, 0.33], [0.86, 0.42], [0.985, 0.47], [0.92, 0.50],
      [0.985, 0.53], [0.86, 0.58], [0.88, 0.67], [0.76, 0.58]], 250);
    const tex = new THREE.DataTexture(pixels, S, S);
    tex.name = 'tidal-pine-cluster-v2'; tex.colorSpace = THREE.NoColorSpace;
    // alpha-test 植被的 coverage-preserving mipmaps：避免遠距離葉簇因平均 alpha 突然變稀。
    const threshold = 0.45 * 255, coverage = pixels.reduce((n, v, i) => n + (i % 4 === 3 && v >= threshold ? 1 : 0), 0) / (S * S);
    tex.mipmaps = [{ data: pixels, width: S, height: S }];
    let raw = pixels, size = S;
    while (size > 1) {
      const nextSize = size / 2, averaged = new Uint8Array(nextSize * nextSize * 4);
      for (let y = 0; y < nextSize; y++) for (let x = 0; x < nextSize; x++) for (let channel = 0; channel < 4; channel++) {
        const i = (y * nextSize + x) * 4 + channel, j = (y * 2 * size + x * 2) * 4 + channel;
        averaged[i] = Math.round((raw[j] + raw[j + 4] + raw[j + size * 4] + raw[j + size * 4 + 4]) / 4);
      }
      const alphas = [];
      for (let i = 3; i < averaged.length; i += 4) alphas.push(averaged[i]);
      alphas.sort((a, b) => b - a);
      const cutoff = alphas[Math.max(0, Math.round(alphas.length * coverage) - 1)], scale = (threshold + 8) / Math.max(cutoff, 1), data = averaged.slice();
      for (let i = 3; i < data.length; i += 4) data[i] = Math.min(255, Math.round(data[i] * scale));
      tex.mipmaps.push({ data, width: nextSize, height: nextSize }); raw = averaged; size = nextSize;
    }
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4; tex.needsUpdate = true;
    return (needles = tex);
  }

  function pine(THREE, kit, cfg) {
    let seed = cfg.seed;
    const rand = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    const TAU = Math.PI * 2, up = new THREE.Vector3(0, 1, 0), group = new THREE.Group();
    group.name = cfg.name;
    const bark = { p: [], n: [], c: [], uv: [], ix: [] }, leaf = { p: [], n: [], c: [], uv: [], ix: [] };
    const shadowColor = new THREE.Color('#1d3f3b'), bodyColor = new THREE.Color('#3a6b55'), tipColor = new THREE.Color('#6f9262');   // 主體深青綠、暗部偏青（不墨黑）；朝上的枝團會吃滿陽光，底色要比規格再深一點
    const tex = needleTexture(THREE), wood = kit.mat('#6e4e36', { roughness: 0.96, vertexColors: true }, 'bark');
    const foliage = kit.card('#ffffff', tex, 'pine'), depth = kit.cardDepth(tex, 'pine');
    function axis(y) {
      const t = y / 3.3;
      return new THREE.Vector3(cfg.lean * t * t + Math.sin(t * 4.8) * 0.033, y, Math.sin(t * 3.6) * 0.04 + cfg.lean * t * 0.22);
    }
    function vertex(b, p, n, color, u, v) {
      b.p.push(p.x, p.y, p.z); b.n.push(n.x, n.y, n.z); b.c.push(color.r, color.g, color.b); b.uv.push(u, v);
    }
    // 連續收分的管狀幾何：主幹、略彎的垂枝與外擴根都合在樹皮 mesh。
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
    // 葉團是有凸起上表面、下表面與垂邊的封閉摺卡，不是水平交叉帶。
    // 整株錐體法線主導受光，22% 的枝團橢球法線保留各團的明暗。
    function clumpNormal(p, center, direction, length, width, thickness) {
      const n = p.clone().sub(axis(p.y)), radius = Math.hypot(n.x, n.z);
      n.y = Math.max(0.08, radius * 0.52); n.normalize();
      const local = p.clone().sub(center), along = local.dot(direction);
      const sphere = local.clone().addScaledVector(direction, -along);
      sphere.multiplyScalar(1 / Math.max(width, 0.06));
      sphere.addScaledVector(direction, along / Math.max(length, 0.08));
      sphere.y = local.y / Math.max(thickness, 0.06);
      sphere.normalize();
      n.lerp(sphere, 0.22).normalize();
      return n;
    }
    function bough(origin, direction, side, length, width, tint, phase) {
      const rows = [0.025, 0.25, 0.52, 0.78, 1], cols = [-1, -1 / 3, 1 / 3, 1];
      const center = origin.clone().addScaledVector(direction, length * 0.58).addScaledVector(up, -0.12);
      const thickness = Math.min(0.16 + length * 0.09, length * 0.32 + 0.06), base = leaf.p.length / 3;
      const point = (t, q, bottom) => {
        const w = width * (0.28 + 0.72 * Math.sin(Math.PI * (0.14 + t * 0.72)));
        // 梢端分成粗葉簇，兩側也有低頻起伏，鋸齒由幾何與 alpha 共同構成。
        const scallop = Math.sin(q * 8.5 + phase) * 0.035 * t * t;
        const r = length * (t + scallop + 0.045 * (1 - q * q) * t * t);
        const hump = Math.sin(t * Math.PI) * (0.09 + length * 0.045);
        const y = 0.14 + hump - (0.24 + length * 0.14 + 0.06 * Math.sin(phase)) * t * t - q * q * (0.08 + length * 0.035);
        return origin.clone().addScaledVector(direction, r).addScaledVector(side, q * w)
          .addScaledVector(up, y - (bottom ? thickness * (0.38 + 0.62 * (1 - q * q)) * (0.65 + 0.35 * Math.sin(t * Math.PI)) : 0));
      };
      for (let bottom = 0; bottom < 2; bottom++) for (const t of rows) for (const q of cols) {
        const p = point(t, q, bottom), n = clumpNormal(p, center, direction, length, width, thickness);
        const color = bottom ? shadowColor.clone().lerp(bodyColor, 0.10 + 0.10 * t)
          : bodyColor.clone().lerp(tipColor, Math.max(0, (t - 0.40) * 0.72));
        color.multiplyScalar(tint * (bottom ? 1 : 0.94 + 0.06 * (1 - q * q)));
        vertex(leaf, p, n, color, t, (q + 1) * 0.5);
      }
      for (let bottom = 0; bottom < 2; bottom++) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        const a = base + bottom * 20 + i * 4 + j, b = a + 4, c = b + 1, d = a + 1;
        if (bottom) leaf.ix.push(a, b, c, a, c, d);
        else leaf.ix.push(a, c, b, a, d, c);
      }
      // 顯式連接上下表面；上下共用輪廓 UV，避免不透明垂邊突出 alpha 邊緣。
      const rim = [];
      for (let j = 0; j < 4; j++) rim.push([0, j]);
      for (let i = 1; i < 5; i++) rim.push([i, 3]);
      for (let j = 2; j >= 0; j--) rim.push([4, j]);
      for (let i = 3; i > 0; i--) rim.push([i, 0]);
      for (let e = 0; e < rim.length; e++) {
        const [i, j] = rim[e], [ii, jj] = rim[(e + 1) % rim.length], b = leaf.p.length / 3;
        for (const [r, c, bottom] of [[i, j, 0], [ii, jj, 0], [ii, jj, 1], [i, j, 1]]) {
          const p = point(rows[r], cols[c], bottom), n = clumpNormal(p, center, direction, length, width, thickness);
          const color = shadowColor.clone().lerp(bodyColor, bottom ? 0.15 : 0.64).multiplyScalar(tint);
          vertex(leaf, p, n, color, rows[r], (cols[c] + 1) * 0.5);
        }
        leaf.ix.push(b, b + 2, b + 1, b, b + 3, b + 2);
      }
    }
    for (let layer = 0; layer < cfg.layers; layer++) {
      const t = layer / (cfg.layers - 1), count = cfg.branches[layer], height = 1.03 + t * 1.98;
      const reach = cfg.spread * Math.pow(1 - t * 0.86, 0.85);
      const phase = layer * 2.39996 + Math.sin(layer * 2.7) * 0.19;
      const first = leaf.ix.length;
      for (let branch = 0; branch < count; branch++) {
        const angle = phase + branch / count * TAU + (rand() - 0.5) * 0.15;
        const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)), side = new THREE.Vector3(-direction.z, 0, direction.x);
        const length = reach * (0.88 + rand() * 0.24), y = height + (rand() - 0.5) * 0.15, origin = axis(y);
        const curve = k => origin.clone().addScaledVector(direction, length * k).addScaledVector(up, -length * 0.29 * k * k);
        tube([curve(0.015), curve(0.48), curve(0.88)], [0.024 * (1 - t * 0.7), 0.012 * (1 - t * 0.65), 0.002], 3, 0.87);
        // 相鄰枝團在幹軸和兩翼互相交疊；最底層垂緣約落在 0.55–0.65m。
        const width = length * (Math.PI / count) * 1.18 + 0.075 * (1 - t);
        bough(origin, direction, side, length, width, 0.96 + rand() * 0.08, phase + branch * 1.9);
      }
      // 索引範圍提供審查／選取語意，遊戲仍是一個 pine mesh 批次繪製。
      group.userData.pineLayers = group.userData.pineLayers || [];
      group.userData.pineLayers.push({ firstTriangle: first / 3, triangles: (leaf.ix.length - first) / 3, height });
    }
    // 內縮的樹冠心材遮住上層幹軸空窗；外輪廓仍由七層垂枝團決定。
    // 同一 pine mesh／同一材質，不增加森林批次。頂冠錯層縮徑，避免一根細枝或光滑尖帽。
    const crownY = [0.58, 1.20, 1.57, 1.94, 2.30, 2.63, 2.88, 3.10, 3.30];
    const crownR = [0.16, 0.35, 0.32, 0.28, 0.25, 0.22, 0.16, 0.075, 0.002], sides = 8, topBase = leaf.p.length / 3;
    for (let i = 0; i < crownY.length; i++) for (let j = 0; j <= sides; j++) {
      const a = j % sides / sides * TAU, r = crownR[i] * (1 + 0.12 * Math.sin(j % sides * 2.4 + i));
      const p = axis(crownY[i]).add(new THREE.Vector3(Math.cos(a) * r, i === crownY.length - 1 ? 0 : Math.sin(a * 3 + i) * 0.025, Math.sin(a) * r));
      const n = new THREE.Vector3(Math.cos(a), 0.52, Math.sin(a)).normalize();
      const color = shadowColor.clone().lerp(bodyColor, 0.48 + i * 0.045);
      if (i > 6) color.lerp(tipColor, (i - 6) * 0.10);
      vertex(leaf, p, n, color, 0.43 + (j % 2) * 0.06, 0.46 + (i % 2) * 0.08);
    }
    for (let i = 0; i < crownY.length - 1; i++) for (let j = 0; j < sides; j++) {
      const a = topBase + i * (sides + 1) + j, b = a + sides + 1;
      leaf.ix.push(a, b, b + 1, a, b + 1, a + 1);
    }
    for (let j = 0; j < 4; j++) {
      const a = j * TAU / 4 + 0.65, direction = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      bough(axis(2.965 + j % 2 * 0.020), direction, new THREE.Vector3(-direction.z, 0, direction.x),
        0.19 + j % 2 * 0.025, 0.13, 1.03, j * 1.9);
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
  I.PROPMODELS['pine_a'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-a-slender', seed: 173, layers: 7, branches: [6, 6, 6, 5, 5, 4, 3], spread: 0.78, lean: 0.045 });
  I.PROPMODELS['pine_b'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-b-broad', seed: 619, layers: 7, branches: [7, 7, 7, 6, 6, 5, 4], spread: 1.00, lean: -0.035 });
  I.PROPMODELS['pine_c'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-c-leaning', seed: 1201, layers: 7, branches: [6, 6, 6, 6, 5, 5, 4], spread: 0.87, lean: 0.27 });
})(window);
