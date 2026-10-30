/* 潮汐小島 · v8.9 島上的動物（程式化模型）：TA.ISLE.FAUNAMODELS[key] = (THREE, kit) => THREE.Group。
   公尺、+Y 向上、頭朝 +Z。貓原點在四足間的地面；魚與海豚在身體中心；鯨背在水線中心，鯨尾在尾柄底部。
   head 在脖子；四腿在肩／髖；tail、tail2 在各段根部。貓尾與海豚尾繞 X 擺，魚尾繞 Y 擺。
   eyesOpen / eyesClosed 隨 head 移動，閉眼預設隱藏。各關節下只合併本層靜態網格，不跨關節烘焙。
   無貼圖、無亂數；色塊寫入頂點色。kit.mat 是共用快取，取得後不修改、不複製材質。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.FAUNAMODELS = I.FAUNAMODELS || {};

  function helpers(THREE, kit) {
    const paint = kit.mat('#ffffff', { roughness: 0.82, vertexColors: true });
    function group(parent, name, x = 0, y = 0, z = 0) {
      const g = new THREE.Group(); g.name = name; g.position.set(x, y, z);
      if (parent) parent.add(g);
      return g;
    }
    function add(parent, name, geo, material) {
      const m = new THREE.Mesh(geo, material); m.name = name;
      m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
    }
    function ball(parent, name, material, p, r, w = 12, h = 8) {
      const geo = new THREE.SphereGeometry(1, w, h);
      geo.scale(...r); geo.translate(...p); return add(parent, name, geo, material);
    }
    // Solid albedo in linear working space; never write into a cached material.
    function colors(geo, fn) {
      const p = geo.getAttribute('position'), values = [], c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        c.set(fn(p.getX(i), p.getY(i), p.getZ(i)));
        values.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(values, 3)); return geo;
    }
    function curve(parent, name, material, points, radius, steps = 6, sides = 4) {
      const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      return add(parent, name, new THREE.TubeGeometry(path, steps, radius, sides, false), material);
    }
    function line(parent, name, material, a, b, radius, sides = 4) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
      const geo = new THREE.CylinderGeometry(radius * 0.65, radius, d.length(), sides, 1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      geo.translate(...start.add(end).multiplyScalar(0.5).toArray()); return add(parent, name, geo, material);
    }
    // Closed longitudinal hull: stations [z, halfWidth, halfHeight, centreY].
    // A half hull has a flat, closed waterline, with no underwater vertices.
    function hull(stations, sides, fn, half = false) {
      const vertices = [], indices = [], rings = [], arc = half ? Math.PI : Math.PI * 2;
      for (const [z, rx, ry, cy] of stations) {
        const ring = [];
        if (rx === 0 && ry === 0) {
          ring.push(vertices.length / 3); vertices.push(0, cy, z);
        } else {
          for (let j = 0; j <= sides; j++) {
            const a = arc * j / sides; ring.push(vertices.length / 3);
            vertices.push(rx * Math.cos(a), cy + ry * Math.sin(a), z);
          }
        }
        rings.push(ring);
      }
      for (let k = 0; k < rings.length - 1; k++) {
        const a = rings[k], b = rings[k + 1];
        for (let j = 0; j < sides; j++) {
          if (a.length === 1) indices.push(a[0], b[j + 1], b[j]);
          else if (b.length === 1) indices.push(a[j], a[j + 1], b[0]);
          else indices.push(a[j], a[j + 1], b[j], a[j + 1], b[j + 1], b[j]);
        }
        if (half) {
          if (a.length === 1) indices.push(a[0], b[0], b[sides]);
          else if (b.length === 1) indices.push(a[0], b[0], a[sides]);
          else indices.push(a[0], b[0], a[sides], a[sides], b[0], b[sides]);
        }
      }
      // Close non-point end rings. Use separate vertices to keep a hard cap seam.
      for (const k of [0, rings.length - 1]) {
        if (rings[k].length === 1) continue;
        const [z, rx, ry, cy] = stations[k], centre = vertices.length / 3;
        vertices.push(0, cy, z);
        for (let j = 0; j < sides; j++) {
          const a = vertices.length / 3, u = arc * j / sides, v = arc * (j + 1) / sides;
          vertices.push(rx * Math.cos(u), cy + ry * Math.sin(u), z, rx * Math.cos(v), cy + ry * Math.sin(v), z);
          if (k === 0) indices.push(centre, a + 1, a); else indices.push(centre, a, a + 1);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices);
      // Weld the wrap seam analytically after computing smooth normals.
      geo.computeVertexNormals();
      if (!half) {
        const n = geo.attributes.normal, v = new THREE.Vector3();
        for (const ring of rings) if (ring.length > 1) {
          const a = ring[0], b = ring[sides];
          v.fromBufferAttribute(n, a).add(new THREE.Vector3().fromBufferAttribute(n, b)).normalize();
          n.setXYZ(a, v.x, v.y, v.z); n.setXYZ(b, v.x, v.y, v.z);
        }
      }
      return colors(geo, fn);
    }
    // Bevelled closed fin, authored in XY; transform geometry into XZ or YZ.
    function fin(parent, name, outline, thickness, material, plane = 'xy', origin = [0, 0, 0]) {
      const s = new THREE.Shape(); s.moveTo(...outline[0]);
      for (let j = 1; j < outline.length; j++) s.lineTo(...outline[j]); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: thickness * 0.5, steps: 1,
        bevelEnabled: true, bevelThickness: thickness * 0.25, bevelSize: thickness * 0.25, bevelSegments: 1 });
      geo.translate(0, 0, -thickness * 0.25);
      if (plane === 'xz') geo.rotateX(Math.PI / 2);
      if (plane === 'zy') geo.rotateY(-Math.PI / 2);
      geo.translate(...origin); return add(parent, name, geo, material);
    }
    // Only merge siblings. Every Group (including hidden eyes) retains its pivot.
    function finish(g) {
      for (const child of g.children.slice()) if (child.isGroup) finish(child);
      const buckets = new Map();
      for (const child of g.children.slice()) {
        if (!child.isMesh) continue;
        child.updateMatrix();
        const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
        geo.applyMatrix4(child.matrix);
        if (!buckets.has(child.material)) buckets.set(child.material, { p: [], n: [], c: [], names: [] });
        const b = buckets.get(child.material); b.p.push(...geo.attributes.position.array); b.n.push(...geo.attributes.normal.array);
        if (geo.attributes.color) b.c.push(...geo.attributes.color.array);
        b.names.push(child.name); geo.dispose(); child.geometry.dispose(); g.remove(child);
      }
      for (const [material, b] of buckets) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
        if (b.c.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
        geo.computeBoundingBox(); geo.computeBoundingSphere(); add(g, b.names.join(' + '), geo, material);
      }
      return g;
    }
    return { paint, group, add, ball, colors, curve, line, hull, fin, finish };
  }

  function cat(THREE, kit, tux) {
    const h = helpers(THREE, kit), g = h.group(null, tux ? 'cat_tux' : 'cat_orange');
    const coat = tux ? '#3d414c' : '#dba16f', stripe = '#ae714c', cream = '#f3e6cd';
    const fur = kit.mat(coat, { roughness: 0.9 }), white = kit.mat(cream, { roughness: 0.92 });
    const pink = kit.mat('#ce9c9d', { roughness: 0.85 }), ink = kit.mat('#42424b', { roughness: 0.88 });
    const iris = kit.mat(tux ? '#b8bd93' : '#a6b99d', { roughness: 0.5 });
    const pupil = kit.mat('#303640', { roughness: 0.38 }), shine = kit.mat('#fff4e3', { roughness: 0.4 });
    const whisker = kit.mat('#ddd7c8', { roughness: 0.95 });
    const body = h.ball(g, 'rounded-torso', h.paint, [0, 0.169, -0.025], [0.064, 0.071, 0.146], 16, 10);
    h.colors(body.geometry, (x, y, z) => {
      if (y < 0.13 || (z > 0.065 && y < 0.21)) return cream;
      return coat;
    });
    if (!tux) {
      const tabby = kit.mat(stripe, { roughness: 0.9 });
      for (const z of [-0.11, -0.047, 0.016]) {
        const radius = Math.sqrt(1 - Math.pow((z + 0.025) / 0.146, 2)), points = [];
        for (let j = 0; j <= 6; j++) {
          const a = 0.2 + j / 6 * (Math.PI - 0.4);
          points.push([0.064 * radius * Math.cos(a), 0.169 + 0.071 * radius * Math.sin(a), z]);
        }
        h.curve(g, 'curved-tabby-saddle-stripe', tabby, points, 0.0027, 8, 3);
      }
    }
    h.ball(g, 'cream-bib', white, [0, 0.181, 0.092], [0.043, 0.05, 0.027], 10, 6);
    h.ball(g, 'soft-neck-connection', white, [0, 0.211, 0.106], [0.042, 0.041, 0.049], 8, 6);
    const head = h.group(g, 'head', 0, 0.205, 0.105);
    const skull = h.ball(head, 'round-cheeked-head', h.paint, [0, 0.044, 0.045], [0.07, 0.059, 0.061], 14, 10);
    h.colors(skull.geometry, (x, y, z) => {
      if (tux) return z > 0.079 && y < 0.046 + 0.022 * (1 - Math.abs(x) / 0.04) ? cream : coat;
      return coat;
    });
    if (!tux) for (const x of [-0.023, 0, 0.023]) {
      const points = [];
      for (let j = 0; j <= 3; j++) {
        const y = 0.074 + j * 0.006;
        const z = 0.045 + 0.061 * Math.sqrt(Math.max(0, 1 - Math.pow(x / 0.07, 2) - Math.pow((y - 0.044) / 0.059, 2)));
        points.push([x, y, z]);
      }
      h.curve(head, 'forehead-tabby-mark', kit.mat(stripe, { roughness: 0.9 }), points, 0.0022, 3, 3);
    }
    for (const side of [-1, 1]) {
      const x = side * 0.043;
      h.fin(head, 'soft-triangle-ear', [[x - 0.022, 0.075], [x + side * 0.007, 0.115], [x + 0.022, 0.079]], 0.023, fur, 'xy', [0, 0, 0.036]);
      h.fin(head, 'rose-inner-ear', [[x - 0.012, 0.082], [x + side * 0.005, 0.105], [x + 0.012, 0.084]], 0.002, pink, 'xy', [0, 0, 0.049]);
      h.ball(head, 'cream-muzzle', white, [side * 0.017, 0.022, 0.101], [0.023, 0.017, 0.017], 8, 6);
      for (let j = 0; j < 3; j++) h.line(head, 'whisker', whisker,
        [side * 0.024, 0.024 - j * 0.004, 0.113], [side * (0.082 - j * 0.003), 0.035 - j * 0.013, 0.116 - j * 0.004], 0.00065);
      h.curve(head, 'smile', ink, [[0, 0.021, 0.12], [side * 0.006, 0.014, 0.12], [side * 0.013, 0.017, 0.118]], 0.0009, 4, 3);
    }
    h.fin(head, 'pink-nose', [[-0.008, 0.033], [0, 0.024], [0.008, 0.033]], 0.007, pink, 'xy', [0, 0, 0.122]);
    const open = h.group(head, 'eyesOpen'), closed = h.group(head, 'eyesClosed'); closed.visible = false;
    for (const side of [-1, 1]) {
      const x = side * 0.031;
      h.ball(open, 'sage-iris', iris, [x, 0.055, 0.097], [0.012, 0.014, 0.007], 8, 6);
      h.ball(open, 'vertical-pupil', pupil, [x, 0.055, 0.103], [0.004, 0.01, 0.0025], 6, 4);
      h.ball(open, 'eye-glint', shine, [x - 0.003, 0.061, 0.105], [0.0025, 0.003, 0.0015], 5, 3);
      h.curve(closed, 'sleepy-eye-arc', ink, [[x - 0.011, 0.054, 0.101], [x, 0.05, 0.105], [x + 0.011, 0.054, 0.101]], 0.0017, 6, 3);
    }
    // +X is the animal's left when looking forward along +Z.
    for (const [name, x, z, hip] of [['legFL', 0.043, 0.075, 0.19], ['legFR', -0.043, 0.075, 0.19],
      ['legBL', 0.044, -0.117, 0.176], ['legBR', -0.044, -0.117, 0.176]]) {
      const leg = h.group(g, name, x, hip, z);
      const limb = h.ball(leg, 'tapered-leg', h.paint, [0, -hip / 2 + 0.01, 0], [0.024, hip / 2 + 0.01, 0.027], 8, 6);
      h.colors(limb.geometry, (xx, yy) => yy < -hip + 0.044 ? cream : coat);
      h.ball(leg, 'cream-paw', white, [0, -hip + 0.017, 0.01], [0.026, 0.017, 0.036], 8, 4);
    }
    const tail = h.group(g, 'tail', 0, 0.19, -0.151);
    const first = h.curve(tail, 'rising-tail', h.paint, [[0, 0, 0], [0, 0.026, -0.038], [0, 0.075, -0.066]], 0.014, 8, 6);
    h.colors(first.geometry, (x, y) => !tux && Math.sin(y * 125) > 0.55 ? stripe : coat);
    const tail2 = h.group(tail, 'tail2', 0, 0.075, -0.066);
    h.ball(tail2, 'round-tail-joint', fur, [0, 0, 0], [0.0135, 0.0135, 0.0135], 6, 4);
    const tip = h.curve(tail2, 'hooked-tail-tip', h.paint, [[0, 0, 0], [0, 0.042, -0.014], [0, 0.066, 0.004], [0, 0.059, 0.025]], 0.011, 7, 6);
    h.colors(tip.geometry, (x, y) => !tux && Math.sin((y + 0.075) * 125) > 0.55 ? stripe : coat);
    h.ball(tail2, 'rounded-tail-end', tux ? fur : kit.mat(stripe, { roughness: 0.9 }), [0, 0.059, 0.025], [0.011, 0.011, 0.011], 6, 4);
    return h.finish(g);
  }

  I.FAUNAMODELS.cat_orange = function (THREE, kit) { return cat(THREE, kit, false); };
  I.FAUNAMODELS.cat_tux = function (THREE, kit) { return cat(THREE, kit, true); };

  I.FAUNAMODELS.dolphin = function (THREE, kit) {
    const h = helpers(THREE, kit), g = h.group(null, 'dolphin');
    const blue = kit.mat('#819aa9', { roughness: 0.65 }), dark = kit.mat('#3d515f', { roughness: 0.62 });
    const back = '#829aa9', flank = '#a7bac2', belly = '#dae0df';
    const shade = (x, y) => y < -0.09 ? belly : y < 0.065 ? flank : back;
    h.add(g, 'spindle-body-and-melon', h.hull([
      [-0.76, 0.053, 0.065, -0.005], [-0.58, 0.09, 0.11, 0], [-0.34, 0.16, 0.18, 0],
      [-0.05, 0.22, 0.235, 0], [0.25, 0.235, 0.24, 0.008], [0.47, 0.20, 0.21, 0.015],
      [0.65, 0.15, 0.155, 0.008], [0.76, 0.11, 0.09, -0.014], [0.80, 0.075, 0.055, -0.045]
    ], 20, shade), h.paint);
    h.add(g, 'bottlenose-rostrum', h.hull([[0.70, 0.09, 0.06, -0.065], [0.85, 0.081, 0.05, -0.074],
      [1.04, 0.054, 0.039, -0.071], [1.11, 0.025, 0.027, -0.068], [1.13, 0, 0, -0.068]], 12, shade), h.paint);
    h.fin(g, 'swept-dorsal-fin', [[-0.31, 0.20], [-0.18, 0.31], [-0.22, 0.53], [-0.12, 0.49],
      [0.02, 0.30], [0.14, 0.23]], 0.04, blue, 'zy');
    for (const side of [-1, 1]) {
      const points = [[0.12, 0.31], [0.29, 0.22], [0.43, -0.14], [0.41, -0.23], [0.31, -0.18], [0.15, 0.035]].map(([x, z]) => [side * x, z]);
      const flipper = h.fin(g, 'pectoral-flipper', points, 0.033, blue, 'xz', [0, -0.095, 0]); flipper.rotation.z = side * -0.20;
      h.ball(g, 'dark-eye', dark, [side * 0.144, 0.037, 0.64], [0.017, 0.017, 0.012], 8, 6);
      h.ball(g, 'eye-catchlight', kit.mat('#eff0e5', { roughness: 0.5 }), [side * 0.151, 0.043, 0.648], [0.004, 0.004, 0.003], 5, 3);
      h.curve(g, 'gentle-mouth-line', dark, [[side * 0.025, -0.077, 1.115], [side * 0.064, -0.092, 0.98],
        [side * 0.083, -0.105, 0.81], [side * 0.12, -0.066, 0.71]], 0.0028, 7, 3);
    }
    h.ball(g, 'blowhole', dark, [0, 0.203, 0.452], [0.028, 0.004, 0.016], 8, 4);
    const tail = h.group(g, 'tail', 0, -0.005, -0.72);
    h.add(tail, 'tapered-tail-stock', h.hull([[-0.30, 0.038, 0.027, 0], [-0.16, 0.046, 0.042, 0],
      [0, 0.061, 0.071, 0]], 12, shade), h.paint);
    h.fin(tail, 'horizontal-notched-flukes', [[0, -0.315], [-0.09, -0.355], [-0.34, -0.36], [-0.30, -0.28],
      [-0.16, -0.14], [0, -0.19], [0.16, -0.14], [0.30, -0.28], [0.34, -0.36], [0.09, -0.355]], 0.028, blue, 'xz');
    return h.finish(g);
  };

  I.FAUNAMODELS.whale_back = function (THREE, kit) {
    const h = helpers(THREE, kit), g = h.group(null, 'whale_back'), stations = [];
    for (let j = 0; j <= 24; j++) {
      const t = j / 24 * Math.PI, z = -4.5 * Math.cos(t), r = j === 0 || j === 24 ? 0 : Math.sin(t);
      stations.push([z, 1.3 * r, 0.82 * Math.pow(r, 0.82), 0]);
    }
    h.add(g, 'closed-waterline-dome', h.hull(stations, 20, (x, y) => y < 0.16 ? '#4b626f' : '#526b7b', true), h.paint);
    h.fin(g, 'small-humpback-dorsal', [[-3.12, 0.52], [-2.84, 0.70], [-2.76, 0.98], [-2.61, 0.91],
      [-2.43, 0.73], [-2.12, 0.72]], 0.11, kit.mat('#526b7b', { roughness: 0.78 }), 'zy');
    return h.finish(g);
  };

  I.FAUNAMODELS.whale_tail = function (THREE, kit) {
    const h = helpers(THREE, kit), g = h.group(null, 'whale_tail');
    const stock = h.hull([[0, 0.23, 0.18, 0], [0.27, 0.215, 0.16, 0.01], [0.7, 0.18, 0.13, 0.025],
      [1.15, 0.23, 0.105, 0.04], [1.60, 0.37, 0.09, 0.025], [1.91, 0.53, 0.065, 0]], 16,
    (x, y) => y < -0.02 ? '#dddcd2' : '#465b69');
    stock.rotateX(-Math.PI / 2); h.add(g, 'rising-tail-peduncle', stock, h.paint);
    const edge = [[0, 1.65, 2.27], [0.12, 1.67, 2.47], [0.35, 1.72, 2.56], [0.65, 1.85, 2.60],
      [0.95, 2.00, 2.60], [1.22, 2.16, 2.58], [1.48, 2.32, 2.55], [1.67, 2.41, 2.53], [1.8, 2.55, 2.55]];
    function border(x, column) {
      const a = Math.abs(x);
      for (let j = 1; j < edge.length; j++) if (a <= edge[j][0] + 0.00001) {
        const p = edge[j - 1], q = edge[j], t = (a - p[0]) / (q[0] - p[0]);
        return p[column] + (q[column] - p[column]) * t;
      }
      return edge[edge.length - 1][column];
    }
    const vertices = [], indices = [], colors = [], cols = 48, rows = 8, layer = (cols + 1) * (rows + 1);
    const spots = [[-0.34, 2.27, 0.12, 0.10], [-0.68, 2.15, 0.13, 0.09], [-0.96, 2.35, 0.16, 0.07],
      [-1.32, 2.43, 0.10, 0.06], [-0.15, 2.02, 0.07, 0.12], [0.28, 2.34, 0.10, 0.12],
      [0.57, 2.06, 0.14, 0.08], [0.81, 2.39, 0.10, 0.09], [1.12, 2.38, 0.15, 0.06], [1.47, 2.48, 0.08, 0.045]];
    for (const face of [1, -1]) for (let j = 0; j <= cols; j++) {
      const x = (j / cols * 2 - 1) * 1.8, a = Math.abs(x), scallop = Math.sin(j * Math.PI / 2) * 0.022 * Math.sin(a / 1.8 * Math.PI);
      const low = border(x, 1) + scallop, high = border(x, 2);
      for (let k = 0; k <= rows; k++) {
        const t = k / rows, y = low + (high - low) * t;
        const bulge = Math.sin(t * Math.PI) * Math.sqrt(Math.max(0, 1 - a / 1.8));
        vertices.push(x, y, face * (0.014 + 0.085 * bulge));
        let color = face < 0 ? '#465b69' : (k === 0 || k === rows || a > 1.72 ? '#52616b' : '#eee9db');
        if (face > 0 && spots.some(([sx, sy, rx, ry]) => Math.pow((x - sx) / rx, 2) + Math.pow((y - sy) / ry, 2) < 1 + 0.24 * Math.sin(x * 63 + y * 37))) color = '#47555f';
        const c = new THREE.Color(color); colors.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < cols; j++) for (let k = 0; k < rows; k++) {
      const a = j * (rows + 1) + k, b = a + rows + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
      indices.push(a + layer, a + 1 + layer, b + layer, a + 1 + layer, b + 1 + layer, b + layer);
    }
    for (let j = 0; j < cols; j++) for (const k of [0, rows]) {
      const a = j * (rows + 1) + k, b = a + rows + 1;
      if (k === 0) indices.push(a, a + layer, b, b, a + layer, b + layer);
      else indices.push(a, b, a + layer, b, b + layer, a + layer);
    }
    for (const j of [0, cols]) for (let k = 0; k < rows; k++) {
      const a = j * (rows + 1) + k, b = a + 1;
      if (j === 0) indices.push(a, b, a + layer, b, b + layer, a + layer);
      else indices.push(a, a + layer, b, b, a + layer, b + layer);
    }
    const flukes = new THREE.BufferGeometry(); flukes.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    flukes.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); flukes.setIndex(indices); flukes.computeVertexNormals();
    h.add(g, 'scalloped-flukes-white-spotted-ventral-face', flukes, h.paint);
    return h.finish(g);
  };

  function fish(THREE, kit, river) {
    const h = helpers(THREE, kit), g = h.group(null, river ? 'fish_river' : 'fish_sea');
    const scale = river ? 0.25 / 0.45 : 1, back = river ? '#929375' : '#93abb9';
    const flank = river ? '#b9ba99' : '#c3d2d5', belly = river ? '#e5dfc4' : '#e4e8df';
    const finmat = kit.mat(river ? '#9a9a7b' : '#9fb7c2', { roughness: 0.75 });
    const ink = kit.mat('#3d4850', { roughness: 0.55 }), light = kit.mat('#f4ebd5', { roughness: 0.5 });
    const shade = (x, y, z) => {
      if (river && Math.abs(x) > 0.013 && Math.abs(y - 0.003) < 0.008 && z < 0.16) return '#666e58';
      return y < -0.011 ? belly : y < 0.02 ? flank : back;
    };
    h.add(g, 'streamlined-body', h.hull([[-0.148, 0.012, 0.019, 0], [-0.11, 0.026, 0.038, 0],
      [-0.04, 0.039, 0.055, 0], [0.055, 0.04, 0.055, 0.002], [0.12, 0.031, 0.043, 0.001],
      [0.165, 0.022, 0.026, -0.001], [0.188, 0.012, 0.016, -0.003], [0.198, 0, 0, -0.004]], 12, shade), h.paint);
    h.fin(g, 'dorsal-fin', [[-0.072, 0.044], [-0.052, 0.082], [0.008, 0.085], [0.025, 0.053]], 0.003, finmat, 'zy');
    if (!river) h.fin(g, 'mullet-anterior-dorsal', [[0.058, 0.051], [0.074, 0.078], [0.11, 0.069], [0.126, 0.035]], 0.003, finmat, 'zy');
    h.fin(g, 'anal-fin', [[-0.10, -0.028], [-0.084, -0.062], [-0.038, -0.05], [-0.022, -0.045]], 0.002, finmat, 'zy');
    for (const side of [-1, 1]) {
      h.fin(g, 'pectoral-fin', [[side * 0.028, 0.091], [side * 0.073, 0.015], [side * 0.053, -0.006], [side * 0.027, 0.044]], 0.002, finmat, 'xz', [0, -0.009, 0]);
      h.ball(g, 'dark-eye', ink, [side * 0.027, 0.014, 0.138], [0.004, 0.007, 0.007], 6, 4);
      h.ball(g, 'eye-glint', light, [side * 0.0305, 0.017, 0.141], [0.0013, 0.002, 0.002], 4, 3);
      h.curve(g, 'gill-arc', finmat, [[side * 0.027, 0.028, 0.111], [side * 0.035, 0.003, 0.103], [side * 0.027, -0.026, 0.107]], 0.0012, 3, 3);
    }
    const tail = h.group(g, 'tail', 0, 0, -0.139);
    h.fin(tail, 'forked-vertical-tail', [[0.008, 0.014], [-0.111, 0.067], [-0.099, 0.025], [-0.066, 0],
      [-0.099, -0.025], [-0.111, -0.067], [0.008, -0.014]], 0.004, finmat, 'zy');
    // Bake the species scale into geometry and joint coordinates, never root scale.
    if (scale !== 1) {
      const proportions = new THREE.Vector3(scale * 0.85, scale * 0.85, scale);
      g.traverse(o => {
        o.position.multiply(proportions);
        if (o.isMesh) o.geometry.scale(proportions.x, proportions.y, proportions.z);
      });
    }
    return h.finish(g);
  }
  I.FAUNAMODELS.fish_sea = function (THREE, kit) { return fish(THREE, kit, false); };
  I.FAUNAMODELS.fish_river = function (THREE, kit) { return fish(THREE, kit, true); };
})(typeof window !== 'undefined' ? window : globalThis);
