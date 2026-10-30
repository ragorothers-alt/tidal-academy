/* 潮汐小島 · v9.1 北海岸的模型（程式化，Codex 製作）：TA.ISLE.NORTHMODELS[key] = (THREE, kit) => THREE.Group。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.NORTHMODELS = I.NORTHMODELS || {};
  const PI = Math.PI, TAU = PI * 2;

  function workshop(THREE, kit, group) {
    const bins = new Map(); // 材質只讀，活動零件各自合併
    const mat = (c, o, kind) => kit.mat(c, Object.assign({ roughness: .88 }, o), kind);
    function add(geo, material, color) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const source = geo; geo = source.toNonIndexed(); source.dispose(); }
      if (material.vertexColors && !geo.attributes.color) {
        const c = new THREE.Color(color === undefined ? '#ffffff' : color);
        const values = new Float32Array(geo.attributes.position.count * 3);
        for (let i = 0; i < values.length; i += 3) values.set([c.r, c.g, c.b], i);
        geo.setAttribute('color', new THREE.BufferAttribute(values, 3));
      }
      if (!bins.has(material)) bins.set(material, []);
      bins.get(material).push(geo);
    }
    function put(geo, material, p = [0, 0, 0], r = [0, 0, 0], color) {
      geo.rotateX(r[0]); geo.rotateY(r[1]); geo.rotateZ(r[2]);
      geo.translate(...p); add(geo, material, color);
    }
    function ball(p, size, material, color, n = 8, rows = 4) {
      const geo = new THREE.SphereGeometry(1, n, rows); geo.scale(...size); geo.translate(...p); add(geo, material, color);
    }
    function rod(a, c, radius, material, top = radius, n = 6, color) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...c), d = end.clone().sub(start);
      const geo = new THREE.CylinderGeometry(top, radius, d.length(), n, 1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, material, color);
    }
    function finish() {
      let index = 0;
      for (const [material, list] of bins) {
        const count = list.reduce((n, geo) => n + geo.attributes.position.count, 0), geo = new THREE.BufferGeometry();
        for (const [key, width] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
          if (key === 'color' && !material.vertexColors) continue;
          const values = new Float32Array(count * width); let offset = 0;
          for (const part of list) {
            if (part.attributes[key]) values.set(part.attributes[key].array, offset * width);
            offset += part.attributes.position.count;
          }
          geo.setAttribute(key, new THREE.BufferAttribute(values, width));
        }
        list.forEach(part => part.dispose()); geo.computeBoundingBox(); geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, material); mesh.name = group.name + '-batch-' + index++;
        mesh.castShadow = !material.transparent; mesh.receiveShadow = !material.transparent; group.add(mesh);
      }
      bins.clear(); return group;
    }
    return { mat, add, put, ball, rod, finish };
  }

  function geometry(THREE, positions, indices) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (indices) geo.setIndex(indices);
    geo.computeVertexNormals(); return geo;
  }
  function named(THREE, group, name, geo, material) {
    const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); return mesh;
  }
  function profile(THREE, points, depth, bevel = .08) {
    const shape = new THREE.Shape(); points.forEach((p, i) => i ? shape.lineTo(...p) : shape.moveTo(...p)); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2 + bevel); return geo;
  }
  function box(THREE, size, bevel = .018) {
    const [w, h, d] = size, v = Math.min(bevel, w / 4, h / 4, d / 4);
    return profile(THREE, [[-w / 2 + v, -h / 2 + v], [w / 2 - v, -h / 2 + v], [w / 2 - v, h / 2 - v], [-w / 2 + v, h / 2 - v]], d, v);
  }
  function palette(b) {
    return {
      stone: b.mat('#ffffff', { vertexColors: true, roughness: .94 }, 'stone'),
      wet: b.mat('#ffffff', { vertexColors: true, roughness: .42 }, 'stone'),
      moss: b.mat('#ffffff', { vertexColors: true, roughness: .98 }, 'foliage'),
      chalk: b.mat('#ffffff', { vertexColors: true, roughness: .96 })
    };
  }
  function rings(rows, seed = 1, n = 12) {
    return rows.map(([y, rx, rz, cx = 0, cz = 0], j) => Array.from({ length: n }, (_, i) => {
      const a = i * TAU / n, wobble = 1 + .045 * Math.sin(i * 2.7 + seed) + .025 * Math.sin(i * 4.1 + j * 1.7 + seed);
      return [cx + Math.cos(a) * rx * wobble, y + (j && j < rows.length - 1 ? .035 * Math.sin(i * 2.4 + seed + j) : 0), cz + Math.sin(a) * rz * wobble];
    }));
  }
  function skin(THREE, b, rows, material, color, caps = true) {
    const positions = [], indices = [], n = rows[0].length;
    rows.forEach(row => row.forEach(p => positions.push(...p)));
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n; i++) {
      const a = j * n + i, c = j * n + (i + 1) % n, d = c + n, e = a + n;
      indices.push(a, e, d, a, d, c);
    }
    b.add(geometry(THREE, positions, indices), material, color);
    if (caps) { cap(THREE, b, rows[0], material, color, true); cap(THREE, b, rows[rows.length - 1], material, color); }
  }
  function cap(THREE, b, row, material, color, down = false) {
    const n = row.length, centre = row.reduce((v, p) => v.map((c, k) => c + p[k] / n), [0, 0, 0]), face = [];
    for (let i = 0; i < n; i++) face.push(...centre, ...row[down ? i : (i + 1) % n], ...row[down ? (i + 1) % n : i]);
    b.add(geometry(THREE, face), material, color);
  }
  function boulder(THREE, b, p, size, material, color, seed = 1) {
    const [w, h, d] = size, rows = rings([[0, w * .33, d * .32], [h * .16, w * .49, d * .49], [h * .64, w * .44, d * .40, w * .025], [h, w * .20, d * .19, -w * .04]], seed, 9);
    rows.forEach(row => row.forEach(v => { for (let k = 0; k < 3; k++) v[k] += p[k]; }));
    skin(THREE, b, rows, material, color);
  }
  function strata(THREE, b, source, m, cave = false) {
    const geo = source.index ? source.toNonIndexed() : source, pos = geo.attributes.position, normal = geo.attributes.normal;
    const levels = [-2, .12, .55, 1.18, 1.30, 2.06, 2.20, 3.02, 3.15, 3.76, 8];
    const colors = ['#64685f', '#797b70', '#aaa595', '#918c7f', '#beb4a2', '#9c9587', '#b4ac9b', '#928f80', '#c2b8a4', '#b5ae9c'];
    function clip(poly, y, above) {
      const result = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], c = poly[(i + 1) % poly.length], inside = above ? a[1] >= y : a[1] <= y, next = above ? c[1] >= y : c[1] <= y;
        if (inside) result.push(a);
        if (inside !== next) { const t = (y - a[1]) / (c[1] - a[1]); result.push(a.map((v, k) => v + (c[k] - v) * t)); }
      }
      return result;
    }
    const buckets = levels.slice(1).map(() => ({ p: [], n: [] }));
    for (let i = 0; i < pos.count; i += 3) {
      const tri = [0, 1, 2].map(k => [pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k), normal.getX(i + k), normal.getY(i + k), normal.getZ(i + k)]);
      for (let j = 0; j < buckets.length; j++) {
        const poly = clip(clip(tri, levels[j], true), levels[j + 1], false), out = buckets[j];
        for (let k = 1; k < poly.length - 1; k++) {
          const a = new THREE.Vector3(...poly[0]), c = new THREE.Vector3(...poly[k]), d = new THREE.Vector3(...poly[k + 1]);
          if (c.sub(a).cross(d.sub(a)).lengthSq() < 1e-14) continue;
          for (const v of [poly[0], poly[k], poly[k + 1]]) { out.p.push(...v.slice(0, 3)); const n = new THREE.Vector3(...v.slice(3)).normalize(); out.n.push(...n.toArray()); }
        }
      }
    }
    buckets.forEach((out, j) => {
      if (!out.p.length) return;
      const part = new THREE.BufferGeometry(), tint = new THREE.Color(colors[j]), values = [];
      for (let i = 0; i < out.p.length; i += 3) {
        const shade = cave ? .64 + .36 * Math.min(1, Math.max(0, out.p[i + 2] / 2.5)) : 1;
        values.push(tint.r * shade, tint.g * shade, tint.b * shade);
      }
      part.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3)); part.setAttribute('normal', new THREE.Float32BufferAttribute(out.n, 3));
      part.setAttribute('color', new THREE.Float32BufferAttribute(values, 3)); b.add(part, j < 2 ? m.wet : m.stone);
    });
    geo.dispose(); if (source !== geo) source.dispose(); // 切開色帶，保留斜面法線
  }
  function guano(THREE, b, rows, angle, top, bottom, width, material) {
    function at(y, a) {
      const n = rows[0].length, u = ((a / TAU % 1 + 1) % 1) * n, i = Math.floor(u), t = u - i;
      const side = rows.map(row => row[i].map((v, k) => v + (row[(i + 1) % n][k] - v) * t));
      let j = 0; while (j < side.length - 2 && side[j + 1][1] < y) j++;
      const s = (y - side[j][1]) / (side[j + 1][1] - side[j][1]);
      const p = side[j].map((v, k) => v + (side[j + 1][k] - v) * s);
      p[0] += Math.cos(a) * .014; p[2] += Math.sin(a) * .014; return p;
    }
    const positions = [], indices = [];
    const heights = [top, bottom, ...rows.slice(1, -1).map(row => row[Math.round(angle / TAU * row.length) % row.length][1]).filter(y => y > bottom && y < top)].sort((a, c) => c - a);
    heights.forEach((y, j) => {
      const t = (top - y) / (top - bottom), w = width * (1 - t * .86), a = angle + Math.sin(j * 1.7) * .006;
      positions.push(...at(y, a - w), ...at(y, a + w));
      if (j) { const k = j * 2; indices.push(k - 2, k - 1, k + 1, k - 2, k + 1, k); }
    });
    b.add(geometry(THREE, positions, indices), material, '#eee8d8');
  }
  function barnacles(THREE, b, points, material) {
    points.forEach(([x, y, z]) => {
      b.rod([x, y, z], [x, y + .028, z + .012], .028, material, .017, 5, '#e2d7bc');
      b.rod([x, y + .029, z + .012], [x, y + .031, z + .013], .009, material, .009, 5, '#736c59');
    });
  }
  function seabird(THREE, kit, parent, name, p, yaw) {
    const group = new THREE.Group(); group.name = name; group.position.set(...p); group.rotation.y = yaw; parent.add(group);
    const b = workshop(THREE, kit, group), white = b.mat('#f7f4e8'), grey = b.mat('#b6bfbd'), dark = b.mat('#333f42'), gold = b.mat('#d7a35a');
    b.ball([0, .18, 0], [.15, .14, .26], white, undefined, 10, 5);
    b.ball([0, .33, .16], [.105, .11, .115], white, undefined, 8, 5);
    for (const s of [-1, 1]) {
      b.ball([s * .126, .195, -.035], [.038, .085, .19], grey);
      b.ball([s * .094, .355, .207], [.012, .014, .012], dark, undefined, 6, 3);
      b.rod([s * .065, .015, .04], [s * .065, .085, .025], .012, gold, .011, 5);
      b.rod([s * .065, .014, .015], [s * .065, .014, .11], .012, gold, .009, 5);
    }
    b.rod([0, .325, .245], [0, .305, .365], .044, gold, .006, 5);
    b.rod([0, .18, -.18], [0, .205, -.37], .073, grey, .025, 5);
    return b.finish();
  }

  function stack(THREE, kit, tall) {
    const group = new THREE.Group(); group.name = tall ? 'sea_stack_a' : 'sea_stack_b'; // 原點在海面，正面朝＋Ｚ
    const b = workshop(THREE, kit, group), m = palette(b);
    const rows = rings(tall ? [
      [-1.2, 1.30, 1.10], [-.75, 1.48, 1.20], [.12, 1.37, 1.13], [.54, 1.25, 1.07], [.65, 1.37, 1.14],
      [1.48, 1.16, .98, -.06], [1.62, 1.27, 1.03, -.07], [2.54, 1.01, .86, -.13], [2.68, 1.14, .93, -.13],
      [3.57, .92, .78, -.06], [3.70, 1.02, .84, -.05], [4.48, .79, .66, .02], [4.61, .89, .73, .02], [5.20, .68, .58, .03], [5.29, .56, .49, .02]
    ] : [
      [-1.2, .85, .77], [-.65, .98, .86], [.10, .86, .77, .06], [.48, .77, .67, .12], [.60, .88, .73, .14],
      [1.25, .65, .59, .25], [1.38, .75, .63, .27], [2.02, .55, .48, .39], [2.16, .65, .53, .41], [2.85, .43, .38, .54], [2.95, .31, .28, .55]
    ], tall ? 3 : 8);
    for (let j = 0; j < rows.length - 1; j++) skin(THREE, b, [rows[j], rows[j + 1]], j < 3 ? m.wet : m.stone, j < 3 ? ['#64685e', '#75796d', '#848578'][j] : j % 2 ? '#b7ae9d' : '#999384', false);
    cap(THREE, b, rows[0], m.wet, '#64685e', true); cap(THREE, b, rows[rows.length - 1], m.stone, '#b9b19d');
    const top = tall ? 5.29 : 2.95, cx = tall ? .02 : .55;
    for (let j = 0; j < 4; j++) b.ball([cx - .32 + j * .19, top - .018, -.12 + (j % 2) * .25], [.20, .047, .18], m.moss, j % 2 ? '#88916b' : '#747e59');
    for (const [a, y, length, w] of [[1.22, top - .16, .75, .052], [1.83, top - .10, 1.1, .045], [.36, top - .32, .55, .04]]) guano(THREE, b, rows, a, y, y - length, w, m.chalk);
    if (tall) {
      const nest = b.mat('#b5a17a', { roughness: .98 }, 'wood');
      b.ball([.03, 5.305, .02], [.43, .055, .36], nest);
      b.put(new THREE.TorusGeometry(.35, .055, 5, 16), nest, [.03, 5.37, .02], [PI / 2, 0, 0]);
      for (let j = 0; j < 12; j++) {
        const a = j * TAU / 12, x = .03 + Math.cos(a) * .35, z = .02 + Math.sin(a) * .29;
        b.rod([x - Math.sin(a) * .16, 5.365, z + Math.cos(a) * .16], [x + Math.sin(a) * .16, 5.395, z - Math.cos(a) * .16], .014, nest, .008, 5);
      }
      const birds = new THREE.Group(); birds.name = 'birds'; birds.position.set(.02, 5.40, .02); group.add(birds);
      seabird(THREE, kit, birds, 'gull_a', [-.20, 0, .01], -.55); seabird(THREE, kit, birds, 'gull_b', [.20, .015, -.025], .65);
    }
    return b.finish();
  }
  I.NORTHMODELS.sea_stack_a = function (THREE, kit) { return stack(THREE, kit, true); };
  I.NORTHMODELS.sea_stack_b = function (THREE, kit) { return stack(THREE, kit, false); };

  I.NORTHMODELS.sea_arch = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sea_arch'; // 原點在海面，拱洞沿Ｚ貫通
    const b = workshop(THREE, kit, group), m = palette(b);
    const points = [[-3.35, -1.10], [-3.38, .35], [-3.16, 1.37], [-2.89, 2.44], [-2.33, 3.31], [-1.35, 3.93], [-.28, 4.08], [.82, 4.02], [1.86, 3.56], [2.63, 2.73], [3.20, 1.42], [3.38, .12], [3.31, -1.10],
      [1.60, -1.10], [1.60, 1.30], [1.45, 1.78], [1.12, 2.15], [.56, 2.43], [-.09, 2.50], [-.70, 2.37], [-1.22, 2.04], [-1.60, 1.48], [-1.60, -1.10]];
    strata(THREE, b, profile(THREE, points, 2.5, .10), m);
    for (const [x, y, z, w] of [[-1.43, 4.00, .08, .42], [-.50, 4.12, -.20, .25], [.62, 4.09, .12, .29]]) b.ball([x, y, z], [w, .045, .33], m.moss, '#7e8962');
    boulder(THREE, b, [-2.55, .48, .83], [.85, .32, .65], m.stone, '#a8a18f', 4);
    boulder(THREE, b, [2.64, .24, -.77], [.92, .34, .70], m.wet, '#7c8071', 9);
    return b.finish();
  };

  I.NORTHMODELS.cave_mouth = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'cave_mouth'; // 原點在沙地，門檻中心為（０，０，２．５）
    const b = workshop(THREE, kit, group), m = palette(b);
    const outside = [[-3.32, .10], [-3.39, .70], [-3.12, 1.66], [-2.56, 2.66], [-1.65, 3.53], [-.57, 3.90], [.69, 3.82], [1.72, 3.41], [2.61, 2.52], [3.19, 1.38], [3.38, .10]];
    const inside = [[1, .10], [1, 1.39], [.91, 1.80], [.69, 2.12], [.37, 2.33], [0, 2.40], [-.37, 2.33], [-.69, 2.12], [-.91, 1.80], [-1, 1.39], [-1, .10]];
    const entrance = profile(THREE, outside.concat(inside), 2.50, .10); entrance.translate(0, 0, 1.25); strata(THREE, b, entrance, m, true);
    const rear = profile(THREE, outside, 2.52, .10); rear.translate(0, 0, -1.24); strata(THREE, b, rear, m);
    const opening = [[-.89, 0], [-.89, 1.39], [-.81, 1.76], [-.62, 2.05], [-.33, 2.24], [0, 2.30], [.33, 2.24], [.62, 2.05], [.81, 1.76], [.89, 1.39], [.89, 0]];
    const tunnel = b.mat('#ffffff', { vertexColors: true, roughness: 1 });
    for (let j = 0; j < 3; j++) {
      const positions = [], indices = [], front = 2.48 - j * .81, back = front - .81;
      for (const z of [back, front]) opening.forEach(([x, y]) => positions.push(x, y, z));
      const n = opening.length;
      for (let i = 0; i < n - 1; i++) indices.push(i, i + 1, i + n + 1, i, i + n + 1, i + n);
      b.add(geometry(THREE, positions, indices), tunnel, ['#6d7169', '#353e3d', '#141e22'][j]);
    }
    const backShape = new THREE.Shape(); opening.forEach((p, i) => i ? backShape.lineTo(...p) : backShape.moveTo(...p)); backShape.closePath();
    const back = new THREE.ShapeGeometry(backShape); back.translate(0, 0, .04);
    named(THREE, group, 'void', back, b.mat('#05080c', { roughness: 1 }));
    b.put(new THREE.PlaneGeometry(1.78, 2.46), tunnel, [0, .006, 1.27], [-PI / 2, 0, 0], '#3a4442');
    for (const [x, z, w, h] of [[-1.38, 2.48, .68, .30], [1.36, 2.48, .66, .24], [-1.96, 2.42, .47, .18]]) boulder(THREE, b, [x, 0, z], [w, h, .59], m.wet, '#86908a', w * 9);
    barnacles(THREE, b, [[-1.35, .29, 2.52], [-1.43, .29, 2.51], [-1.33, .27, 2.59], [1.35, .23, 2.53], [1.41, .22, 2.56], [-1.97, .17, 2.48]], m.chalk);
    for (const [x, y, z, w] of [[-.55, 3.98, -.28, .38], [.45, 3.93, .37, .32], [-1.48, 3.68, .43, .28]]) b.ball([x, y, z], [w, .047, .34], m.moss, '#818a62');
    return b.finish();
  };

  I.NORTHMODELS.driftwood = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'driftwood'; // 原點在沙地，長軸沿Ｘ
    const b = workshop(THREE, kit, group), wood = b.mat('#ffffff', { vertexColors: true, roughness: .96 }, 'wood');
    const rows = [-1.10, -1.04, -.55, .10, .67, 1.04, 1.10].map((x, j) => Array.from({ length: 10 }, (_, i) => {
      const a = i * TAU / 10, r = (j === 0 || j === 6 ? .165 : .225) * (1 + .07 * Math.sin(i * 2.7 + j * .6));
      return [x, Math.max(0, .225 + Math.cos(a) * r + .015 * Math.sin(j * 1.4)), Math.sin(a) * r * 1.08 + .025 * Math.sin(j)];
    }));
    const positions = [], indices = []; rows.forEach(row => row.forEach(p => positions.push(...p)));
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < 10; i++) { const a = j * 10 + i, c = j * 10 + (i + 1) % 10; indices.push(a, c, c + 10, a, c + 10, a + 10); }
    b.add(geometry(THREE, positions, indices), wood, '#c5bca5');
    for (const s of [-1, 1]) {
      b.rod([s * 1.08, .225, 0], [s * 1.10, .225, 0], .162, wood, .155, 10, '#e0d3b6');
      b.put(new THREE.TorusGeometry(.105, .006, 3, 10), wood, [s * 1.102, .225, 0], [0, PI / 2, 0], '#b3a78e');
      b.put(new THREE.TorusGeometry(.052, .004, 3, 9), wood, [s * 1.103, .225, 0], [0, PI / 2, 0], '#b3a78e');
    }
    for (const [a, c, r] of [[[ -.63, .29, -.10], [-.83, .61, -.25], .081], [[.52, .31, -.08], [.70, .55, -.28], .073], [[.12, .15, .17], [.32, .12, .39], .065]]) {
      b.rod(a, c, r, wood, r * .56, 7, '#c5bca5');
      b.ball(c, [r * .55, r * .4, r * .55], wood, '#e0d3b6', 7, 3);
    }
    for (let j = 0; j < 4; j++) {
      const a = .55 + j * .67, points = rows.slice(1, -1).map(row => { const p = row[Math.round(a / TAU * 10) % 10]; return [p[0], p[1] + .004, p[2] + .004]; });
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 7, .006, 3, false), wood, '#a89e89');
    }
    return b.finish();
  };

  I.NORTHMODELS.tide_rocks = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'tide_rocks'; // 原點在沙地，潮池水面略高於地面
    const b = workshop(THREE, kit, group), m = palette(b);
    const rocks = [[-.84, -.36, .82, .55, .72], [.80, -.40, .90, .46, .68], [-.92, .32, .58, .31, .52], [.87, .38, .65, .38, .56], [-.36, .72, .70, .26, .50], [.25, .73, .62, .32, .52]];
    rocks.forEach(([x, z, w, h, d], j) => {
      boulder(THREE, b, [x, 0, z], [w, h, d], m.wet, j % 2 ? '#8d968f' : '#7c8781', j + 2);
      barnacles(THREE, b, [[x - .04, h + .002, z], [x + .03, h + .002, z + .025], [x + .005, h + .002, z - .04]], m.chalk);
    });
    const pool = [], indices = [];
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14, r = 1 + .08 * Math.sin(i * 2.3); pool.push(Math.cos(a) * .68 * r, .045, Math.sin(a) * .53 * r + .05); }
    for (let i = 1; i < 13; i++) indices.push(0, i + 1, i);
    const basin = geometry(THREE, pool, indices), water = basin.clone(); basin.translate(0, -.035, 0); b.add(basin, m.wet, '#62796f');
    b.add(water, b.mat('#5fb8c8', { transparent: true, opacity: .7, roughness: .1 }));
    return b.finish();
  };

  I.NORTHMODELS.north_sign = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'north_sign'; // 原點在沙地，牌板正面朝＋Ｚ
    const b = workshop(THREE, kit, group), wood = b.mat('#b29a77', { roughness: .94 }, 'wood');
    const pale = b.mat('#d0bb96', { roughness: .91 }, 'wood'), rope = b.mat('#a99671', { roughness: .98 }, 'fabric');
    b.rod([-.39, 0, -.04], [-.39, 1.84, -.04], .072, wood, .061, 7);
    b.put(box(THREE, [1.42, .13, .15], .025), pale, [0, 1.805, -.04]);
    b.ball([-.39, 1.855, -.04], [.074, .045, .075], pale);
    for (const x of [-.37, .37]) {
      b.rod([x, 1.80, .015], [x, 1.53, .15], .014, rope, .014, 5);
      b.put(new THREE.TorusGeometry(.031, .009, 4, 8), rope, [x, 1.55, .16]);
    }
    const board = named(THREE, group, 'board', box(THREE, [1.10, .45, .075], .018), b.mat('#e3d0aa', { roughness: .91 }, 'wood'));
    board.position.set(0, 1.345, .15); // 正面保留平坦淺木色，供遊戲加字
    return b.finish();
  };
})(typeof window !== 'undefined' ? window : globalThis);
