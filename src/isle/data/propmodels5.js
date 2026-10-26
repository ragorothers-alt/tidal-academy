/* 潮汐小島 · 松林 V3：三種 3.3m 松／杉輪廓，曲幹＋七層不規則立體針葉團。
   根部原點；每株兩個 mesh／兩種材質。上下表面共用外向受光場，不使用 DoubleSide。
   工廠只用自己的固定種子，不改變島上擺設的亂數序列。 */
(function(root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};
  let needles = null;

  // 葉團輪廓完全由封閉幾何決定；貼圖僅保留寬鬆、低對比的針葉筆觸。
  // 沿用 kit.card/cardDepth 與 TA_LEAFTEX 的風／季節／實例化路徑，沒有透明裙片。
  function needleTexture(THREE) {
    if (needles) return needles;
    const S = 64, pixels = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4, u = x / S, v = y / S;
      const stroke = Math.sin((u * 3 + Math.abs(v - 0.5) * 1.6) * Math.PI * 2);
      const gray = Math.round(247 + stroke * 5);
      pixels[i] = pixels[i + 1] = pixels[i + 2] = gray; pixels[i + 3] = 255;
    }
    const tex = new THREE.DataTexture(pixels, S, S);
    tex.name = 'tidal-pine-volume-v3'; tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter; tex.anisotropy = 4; tex.needsUpdate = true;
    return (needles = tex);
  }

  function pine(THREE, kit, cfg) {
    let seed = cfg.seed;
    const rand = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    const TAU = Math.PI * 2, up = new THREE.Vector3(0, 1, 0), group = new THREE.Group();
    group.name = cfg.name;
    const bark = { p: [], n: [], c: [], uv: [], ix: [] }, leaf = { p: [], n: [], c: [], uv: [], ix: [] };
    const shadowColor = new THREE.Color('#597E7D'), bodyColor = new THREE.Color('#7FA69A'), tipColor = new THREE.Color('#AEC6AE');
    const tex = needleTexture(THREE), wood = kit.mat('#B98E6B', { roughness: 0.96, vertexColors: true }, 'bark');
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
    // 每枝三簇封閉的圓鈍楔形葉團，六邊截面、三圈鼓面；每簇 36 tris。
    // 交錯的長短、側偏和高度形成枝團間空隙，不再以整層鋸齒 alpha 裁切。
    function clump(origin, direction, side, length, width, thickness, tint, phase) {
      const base = leaf.p.length / 3, sides = 6;
      const cross = new THREE.Vector3().crossVectors(side, direction).normalize();
      const rings = [[0, 0], [0.19, 0.76], [0.48, 1], [0.77, 0.68], [1, 0]];
      const add = (t, radius, j) => {
        const a = j / sides * TAU, q = Math.cos(a), v = Math.sin(a);
        const r = radius * (1 + 0.055 * Math.sin(j * 2.1 + phase));
        const p = origin.clone().addScaledVector(direction, length * t)
          .addScaledVector(side, q * width * r)
          .addScaledVector(up, direction.y > 0.5 ? 0 : Math.sin(t * Math.PI) * length * 0.08 - length * 0.21 * t * t)
          .addScaledVector(cross, v * thickness * r);
        const radial = p.clone().sub(axis(p.y)); radial.y = Math.max(0.18, Math.hypot(radial.x, radial.z) * 0.72); radial.normalize();
        const local = direction.clone().multiplyScalar((t - 0.48) * 1.4)
          .addScaledVector(side, q * r).addScaledVector(cross, v * r * 0.85).normalize();
        const normal = radial.lerp(local, 0.32).normalize();
        const color = bodyColor.clone().lerp(v < 0 ? shadowColor : tipColor, v < 0 ? -v * 0.27 : v * 0.30 + t * 0.10);
        color.multiplyScalar(tint);
        vertex(leaf, p, normal, color, 0.10 + t * 0.8, 0.14 + j / sides * 0.72);
      };
      add(0, 0, 0);
      for (let r = 1; r < 4; r++) for (let j = 0; j < sides; j++) add(rings[r][0], rings[r][1], j);
      add(1, 0, 0);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        leaf.ix.push(base, base + 1 + j, base + 1 + k);
        for (let r = 0; r < 2; r++) {
          const a = base + 1 + r * sides + j, b = base + 1 + r * sides + k;
          leaf.ix.push(a, a + sides, b + sides, a, b + sides, b);
        }
        leaf.ix.push(base + 19, base + 13 + k, base + 13 + j);
      }
    }
    function bough(origin, direction, side, length, width, tint, phase) {
      // 三簇相互咬合但不共面，既遮住細枝又保有蓬鬆邊緣。
      for (let j = 0; j < 3; j++) {
        const t = [0.02, 0.27, 0.48][j], sign = j === 1 ? -1 : 1;
        const center = origin.clone().addScaledVector(direction, length * t)
          .addScaledVector(side, j ? width * 0.34 * sign : 0)
          .addScaledVector(up, 0.06 - length * 0.12 * t + Math.sin(phase + j * 2) * 0.032);
        const dir = direction.clone().addScaledVector(side, j ? sign * 0.15 : 0).normalize();
        const sideways = new THREE.Vector3(-dir.z, 0, dir.x);
        clump(center, dir, sideways, length * [0.75, 0.67, 0.55][j],
          width * [0.70, 0.65, 0.52][j], Math.min(0.19, 0.085 + length * 0.10) * (1 - j * 0.09),
          tint * (0.98 + j * 0.015), phase + j * 1.7);
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
        const curve = k => origin.clone().addScaledVector(direction, length * k).addScaledVector(up, -length * 0.16 * k * k);
        tube([curve(0.015), curve(0.40), curve(0.70)], [0.024 * (1 - t * 0.7), 0.012 * (1 - t * 0.65), 0.002], 3, 0.94);
        // 相鄰枝團在幹軸和兩翼互相交疊；最底層垂緣約落在 0.55–0.65m。
        const width = length * (Math.PI / count) * 1.18 + 0.075 * (1 - t);
        bough(origin, direction, side, length, width, 0.96 + rand() * 0.08, phase + branch * 1.9);
      }
      // 索引範圍提供審查／選取語意，遊戲仍是一個 pine mesh 批次繪製。
      group.userData.pineLayers = group.userData.pineLayers || [];
      group.userData.pineLayers.push({ firstTriangle: first / 3, triangles: (leaf.ix.length - first) / 3, height });
    }
    // 幹軸周圍用短葉團填空，不加可見的深色錐殼；冠頂由鈍圓小團收束。
    for (let i = 0; i < 6; i++) {
      const y = 1.17 + i * 0.33, a = i * 2.39996;
      const direction = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      clump(axis(y), direction, new THREE.Vector3(-direction.z, 0, direction.x),
        0.28 - i * 0.025, 0.19 - i * 0.018, 0.20 - i * 0.012, 0.97, a);
    }
    // 將最後一簇沿幹軸豎起：有圓肩，不是一根長尖刺。
    const tipOrigin = axis(2.91), tipDir = new THREE.Vector3(0, 1, 0);
    clump(tipOrigin, tipDir, new THREE.Vector3(1, 0, 0), 0.39, 0.095, 0.075, 1.02, 0.7);
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
