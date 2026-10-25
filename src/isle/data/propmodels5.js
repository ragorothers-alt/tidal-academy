/* 潮汐小島 · 松林：三種 3.3m 松／杉輪廓，曲幹＋下垂枝團＋針葉噴灑卡。
   根部原點；每株兩個 mesh／兩種材質。反面複用外向法線，不使用 DoubleSide。
   工廠只用自己的固定種子，不改變島上擺設的亂數序列。 */
(function(root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};
  let needles = null;

  // 一張細枝噴灑貼圖：細長針葉沿側枝放射，不填實葉片之間的透明縫。
  // RGB 是低對比的線性灰階，色塊交由整段枝團的頂點色控制；透明區擴色避免黑邊。
  function needleTexture(THREE) {
    if (needles) return needles;
    const S = 256, pixels = new Uint8Array(S * S * 4);
    for (let i = 0; i < pixels.length; i += 4) pixels[i] = pixels[i + 1] = pixels[i + 2] = 240;
    let seed = 741;
    const rand = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    function stroke(ax, ay, bx, by, width, gray) {
      ax *= S; ay *= S; bx *= S; by *= S;
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy, pad = width + 1;
      for (let y = Math.max(0, Math.floor(Math.min(ay, by) - pad)); y <= Math.min(S - 1, Math.ceil(Math.max(ay, by) + pad)); y++) {
        for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - pad)); x <= Math.min(S - 1, Math.ceil(Math.max(ax, bx) + pad)); x++) {
          const t = Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / len2));
          const distance = Math.hypot(x + 0.5 - ax - t * dx, y + 0.5 - ay - t * dy);
          const alpha = Math.round(Math.max(0, Math.min(1, width * (1 - t * 0.72) + 0.65 - distance)) * 255), i = (y * S + x) * 4;
          if (alpha > pixels[i + 3]) { pixels[i] = pixels[i + 1] = pixels[i + 2] = gray; pixels[i + 3] = alpha; }
        }
      }
    }
    stroke(0.06, 0.5, 0.95, 0.5, 1.25, 211);
    for (let j = 0; j < 6; j++) for (const side of [-1, 1]) {
      const x = 0.17 + j * 0.112, ex = x + 0.14 + rand() * 0.055, ey = 0.5 + side * (0.19 + Math.sin(j / 6 * Math.PI) * 0.10);
      stroke(x, 0.5, ex, ey, 0.95, 222);
      const angle = Math.atan2(ey - 0.5, ex - x);
      for (let k = 0; k < 8; k++) {
        const t = 0.18 + k * 0.1, px = x + (ex - x) * t, py = 0.5 + (ey - 0.5) * t;
        for (const fan of [-1, 1]) {
          const a = angle + fan * (0.65 + rand() * 0.36), len = (0.065 + rand() * 0.045) * (1 - t * 0.28);
          stroke(px, py, px + Math.cos(a) * len, py + Math.sin(a) * len, 2.0 + rand() * 0.65, 231 + Math.floor(rand() * 24));
        }
      }
    }
    for (let j = 0; j < 23; j++) {
      const angle = (j / 22 - 0.5) * 2.65, x = 0.78 + rand() * 0.08, len = 0.08 + rand() * 0.09;
      stroke(x, 0.5 + (rand() - 0.5) * 0.065, x + Math.cos(angle) * len, 0.5 + Math.sin(angle) * len, 2.1, 244);
    }
    const tex = new THREE.DataTexture(pixels, S, S);
    tex.name = 'tidal-pine-needle-spray'; tex.colorSpace = THREE.NoColorSpace;
    // alpha-test 植被的 coverage-preserving mipmaps：一般平均會讓細針葉在幾公尺外整片消失。
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
    const shadowColor = new THREE.Color('#244c48'), bodyColor = new THREE.Color('#3c7059'), tipColor = new THREE.Color('#7a9b69');
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
    // 每張卡的兩面共用同一組朝外法線；幾何朝向只控制剪影，不主導整片的明暗。
    function spray(center, tangent, width, length, roll, tint, t, highlight) {
      const across = new THREE.Vector3().crossVectors(tangent, up).normalize().applyAxisAngle(tangent, roll);
      const base = leaf.p.length / 3;
      for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = center.clone().addScaledVector(tangent, u * length * 0.5).addScaledVector(across, v * width * 0.5);
        const stem = axis(p.y), n = p.clone().sub(stem); n.y = Math.hypot(n.x, n.z) * (0.38 + 0.08 * t); n.normalize();
        const color = shadowColor.clone().lerp(bodyColor, Math.min(1, 0.22 + t * 0.72 + u * 0.09));
        if (highlight && t > 0.7) color.lerp(tipColor, (t - 0.7) * 1.9);
        color.multiplyScalar(tint);
        vertex(leaf, p, n, color, (u + 1) * 0.5, (v + 1) * 0.5);
      }
      leaf.ix.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 2, base + 1, base, base + 3, base + 2);
    }
    for (let layer = 0; layer < cfg.layers; layer++) {
      const t = layer / (cfg.layers - 1), count = cfg.branches[layer % cfg.branches.length];
      const height = 0.98 + t * 2.04, reach = cfg.spread * Math.pow(1 - t * 0.90, 0.88);
      const phase = layer * 2.39996 + Math.sin(layer * 2.7) * 0.24;
      for (let branch = 0; branch < count; branch++) {
        const angle = phase + branch / count * TAU + (rand() - 0.5) * 0.22;
        const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)), side = new THREE.Vector3(-direction.z, 0, direction.x);
        const L = reach * (0.88 + rand() * 0.22), y = height + (rand() - 0.5) * (0.18 - t * 0.10), origin = axis(y);
        const curve = k => origin.clone().addScaledVector(direction, L * k).addScaledVector(side, Math.sin(k * Math.PI) * L * 0.06).addScaledVector(up, L * (-0.30 * k - 0.12 * k * k + 0.08 * Math.pow(k, 4)));
        tube([curve(0.035), curve(0.48), curve(0.93)], [0.026 * (1 - t * 0.7), 0.014 * (1 - t * 0.65), 0.003], 3, 0.87);
        const tint = 0.93 + rand() * 0.11, highlight = (branch + layer * 3) % 5 === 0;
        // 四個小噴灑沿垂枝交錯，每處三張卡包出枝團截面，俯視／側視都有體積。
        for (let j = 0; j < 4; j++) {
          const k = 0.27 + j * 0.23, tangent = curve(Math.min(1.06, k + 0.03)).sub(curve(k - 0.03)).normalize();
          const size = (0.40 + 0.60 * Math.pow(1 - t, 0.6)) * (0.87 + Math.sin(k * Math.PI) * 0.16);
          for (let face = 0; face < 3; face++) {
            const roll = [-0.16, 0.96, -1.12][face] + Math.sin(branch + j * 1.7) * 0.21;
            const across = new THREE.Vector3().crossVectors(tangent, up).normalize().applyAxisAngle(tangent, roll);
            const normal = new THREE.Vector3().crossVectors(tangent, across).normalize();
            const center = curve(k).addScaledVector(side, (j % 2 ? -1 : 1) * size * 0.03).addScaledVector(normal, size * 0.055);
            spray(center, tangent, 0.34 * size, 0.38 * size, roll, tint * (face ? 0.96 : 1), k, highlight);
          }
        }
      }
    }
    // 細長、略不對稱的頂芽，不用最後一個實心圓錐封頂。
    for (let j = 0; j < 6; j++) {
      const y = 3.08 + j * 0.022, a = j * 2.39996, center = axis(y).add(new THREE.Vector3(Math.cos(a) * 0.032, 0, Math.sin(a) * 0.032));
      spray(center, new THREE.Vector3(Math.cos(a) * 0.24, 1, Math.sin(a) * 0.24).normalize(), 0.11, 0.22, j * 0.61, 1.02, 0.9, j === 3);
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
  I.PROPMODELS['pine_a'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-a-slender', seed: 173, layers: 9, branches: [5, 6, 5], spread: 0.73, lean: 0.045 });
  I.PROPMODELS['pine_b'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-b-broad', seed: 619, layers: 8, branches: [7, 6, 7], spread: 0.98, lean: -0.035 });
  I.PROPMODELS['pine_c'] = (THREE, kit) => pine(THREE, kit, { name: 'pine-c-leaning', seed: 1201, layers: 8, branches: [6, 5, 6], spread: 0.84, lean: 0.27 });
})(window);
