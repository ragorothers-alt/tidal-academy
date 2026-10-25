/* 潮汐小島 · 程式化模型（img2threejs 重建）：爬牆藤蔓、屋簷垂藤、窗台花箱、壁掛吊花籃。 */
/* Wall space: x along wall, y up, z outward; origins follow each attachment point.
   Folded leaf blades use seasonal sway materials. Static geometry is merged by material. */
(function(root) {
  "use strict";
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};
  function sculpt(THREE, kit, name, colors) {
    const group = new THREE.Group();
    group.name = name;
    const buckets = /* @__PURE__ */ new Map(), materials = {};
    for (const id of Object.keys(colors)) {
      const leaf2 = id === "leaf" || id === "leafLight", petals = ["blue", "white", "yellow", "pink", "lavender", "violet"].includes(id);
      materials[id] = kit.mat(
        colors[id],
        { roughness: leaf2 ? 0.92 : id === "iron" ? 0.55 : 0.84, metalness: id === "iron" ? 0.48 : 0, side: petals ? THREE.DoubleSide : THREE.FrontSide, vertexColors: id === "wood" },
        leaf2 ? "sway" : void 0
      );
    }
    function tri(id, a, b, c, reverse, tint = 1) {
      let bucket = buckets.get(id);
      bucket || (bucket = { positions: [], normals: [], colors: [] }, buckets.set(id, bucket));
      const ab = new THREE.Vector3().subVectors(b, a), ac = new THREE.Vector3().subVectors(c, a), n = ab.cross(ac).normalize();
      for (const p of [a, b, c])
        bucket.positions.push(p.x, p.y, p.z), bucket.normals.push(n.x, n.y, n.z), id === "wood" && bucket.colors.push(tint, tint, tint);
      if (reverse) for (const p of [c, b, a])
        bucket.positions.push(p.x, p.y, p.z), bucket.normals.push(-n.x, -n.y, -n.z), id === "wood" && bucket.colors.push(tint, tint, tint);
    }
    function polygon(id, points, indices, tint = 1) {
      const v = points.map((p) => new THREE.Vector3(...p));
      for (let i = 0; i < indices.length; i += 3) tri(id, v[indices[i]], v[indices[i + 1]], v[indices[i + 2]], !1, tint);
    }
    function geometry(id, geo, tint = 1) {
      const expanded = geo.index ? geo.toNonIndexed() : geo;
      let bucket = buckets.get(id);
      bucket || (bucket = { positions: [], normals: [], colors: [] }, buckets.set(id, bucket)), expanded.attributes.normal || expanded.computeVertexNormals();
      for (const value of expanded.attributes.position.array) bucket.positions.push(value);
      for (const value of expanded.attributes.normal.array) bucket.normals.push(value);
      if (id === "wood") for (let i = 0; i < expanded.attributes.position.count; i++) bucket.colors.push(tint, tint, tint);
      expanded !== geo && expanded.dispose(), geo.dispose();
    }
    function box(id, x, y, z, w, h, d, bevel) {
      if (!bevel) {
        const geo = new THREE.BoxGeometry(w, h, d);
        geo.translate(x, y, z), geometry(id, geo);
        return;
      }
      const rings = [], verts = [], idx = [], b = Math.min(bevel, w * 0.2, h * 0.2, d * 0.2);
      for (const [yy, inset] of [[-h / 2, b], [-h / 2 + b, 0], [h / 2 - b, 0], [h / 2, b]]) {
        const X = w / 2 - inset, Z = d / 2 - inset, C = Math.min(b, X * 0.25, Z * 0.25);
        rings.push([[-X + C, yy, -Z], [X - C, yy, -Z], [X, yy, -Z + C], [X, yy, Z - C], [X - C, yy, Z], [-X + C, yy, Z], [-X, yy, Z - C], [-X, yy, -Z + C]]);
      }
      for (const r of rings) for (const p of r) verts.push([p[0] + x, p[1] + y, p[2] + z]);
      for (let j = 0; j < 8; j++) {
        const k = (j + 1) % 8;
        for (let i = 0; i < 3; i++) idx.push(i * 8 + j, (i + 1) * 8 + j, (i + 1) * 8 + k, i * 8 + j, (i + 1) * 8 + k, i * 8 + k);
      }
      for (let j = 1; j < 7; j++) idx.push(0, j, j + 1, 24, 25 + j, 24 + j);
      polygon(id, verts, idx);
    }
    function path(points) {
      return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), !1, "centripetal");
    }
    function tube(id, curve, radius, segments, sides = 4, endScale = 0.3) {
      const rings = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments, p = curve.getPoint(t), tangent = curve.getTangent(t).normalize(), u = new THREE.Vector3().crossVectors(tangent, Math.abs(tangent.z) > 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)).normalize(), v = new THREE.Vector3().crossVectors(tangent, u).normalize(), r = radius * (1 - (1 - endScale) * t), ring = [];
        for (let j = 0; j < sides; j++) {
          const a = j * Math.PI * 2 / sides;
          ring.push(p.clone().addScaledVector(u, r * Math.cos(a)).addScaledVector(v, r * Math.sin(a)));
        }
        rings.push(ring);
      }
      for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        tri(id, rings[i][j], rings[i + 1][j], rings[i + 1][k]), tri(id, rings[i][j], rings[i + 1][k], rings[i][k]);
      }
      for (let j = 1; j < sides - 1; j++)
        tri(id, rings[0][0], rings[0][j + 1], rings[0][j]), tri(id, rings[segments][0], rings[segments][j], rings[segments][j + 1]);
    }
    function leaf(id, p, length, width, angle, tilt, lobed) {
      const outline = lobed ? [[0, 0], [-0.5, 0.18], [-0.44, 0.51], [-0.22, 0.43], [-0.27, 0.74], [0, 1], [0.27, 0.74], [0.22, 0.43], [0.44, 0.51], [0.5, 0.18]] : [[0, 0], [-0.4, 0.22], [-0.5, 0.48], [-0.28, 0.78], [0, 1], [0.28, 0.78], [0.5, 0.48], [0.4, 0.22]], ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(tilt), st = Math.sin(tilt), point = (w, l, fold) => new THREE.Vector3(p.x + ca * w + sa * l * ct, p.y - sa * w + ca * l * ct, p.z + l * st + fold), ring = outline.map((q) => point(q[0] * width, q[1] * length, 0)), center = point(0, length * 0.44, length * 0.095);
      for (let j = 0; j < ring.length; j++) tri(id, center, ring[(j + 1) % ring.length], ring[j], !0);
    }
    function flower(id, p, r, seed, up = 0.5) {
      const n = new THREE.Vector3(0.15 * Math.sin(seed * 1.7), up, 1).normalize(), u = new THREE.Vector3(1, 0, -n.x / n.z).normalize(), v = new THREE.Vector3().crossVectors(n, u).normalize(), project = (x, y, z) => p.clone().addScaledVector(u, x).addScaledVector(v, y).addScaledVector(n, z);
      for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 0.4 + seed * 0.37, c = Math.cos(a), s = Math.sin(a), pts = [[0, r * 0.08, 0], [-r * 0.29, r * 0.44, r * 0.02], [-r * 0.32, r * 0.77, r * 0.13], [0, r, r * 0.16], [r * 0.32, r * 0.77, r * 0.13], [r * 0.29, r * 0.44, r * 0.02]].map((q2) => project(q2[0] * c - q2[1] * s, q2[0] * s + q2[1] * c, q2[2]));
        for (let k = 1; k < pts.length - 1; k++) tri(id, pts[0], pts[k], pts[k + 1]);
      }
      const center = materials.yellow ? "yellow" : "white", q = project(0, 0, r * 0.055);
      for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 0.4, b = (j + 1) * Math.PI * 0.4;
        tri(center, q, project(Math.cos(a) * r * 0.17, Math.sin(a) * r * 0.17, r * 0.02), project(Math.cos(b) * r * 0.17, Math.sin(b) * r * 0.17, r * 0.02));
      }
    }
    function floret(id, p, r, seed) {
      for (const side of [-1, 1]) {
        const a = p.clone(), b = p.clone().add(new THREE.Vector3(side * r * 0.95, -r * 0.3, r * 0.15)), c = p.clone().add(new THREE.Vector3(side * r * 0.55, -r * 1.25, r * 0.6)), d = p.clone().add(new THREE.Vector3(0, -r * 0.85, r * 0.9));
        tri(id, a, b, d), tri(id, b, c, d);
      }
    }
    function foliage(curve, count, seed, opts = {}) {
      const start = opts.start === void 0 ? 0.06 : opts.start, end = opts.end === void 0 ? 0.94 : opts.end;
      for (let j = 0; j < count; j++) {
        const t = start + (end - start) * (j + 0.25) / count, p = curve.getPoint(t), side = j % 2 ? -1 : 1, taper = opts.taper ? 1 - 0.53 * t : 1, len = (opts.length || 0.17) * (0.8 + 0.22 * Math.sin(j * 2.7 + seed)) * taper, angle = (opts.down ? Math.PI : 0) + side * (0.85 + 0.42 * Math.sin(j * 1.9 + seed));
        leaf((j + seed) % 4 ? "leaf" : "leafLight", p, len, len * (opts.lobed ? 0.82 : 0.56), angle, (opts.tilt === void 0 ? 0.06 : opts.tilt) + (opts.tiltRange === void 0 ? 0.12 : opts.tiltRange) * Math.sin(j * 1.73 + seed), opts.lobed), opts.pairs && j < count * 0.62 && leaf((j + seed) % 3 ? "leafLight" : "leaf", p, len * 0.9, len * 0.75, -angle, (opts.tilt || 0.08) - 0.1 * Math.cos(j), opts.lobed);
      }
    }
    function finish(depthScale = 1) {
      for (const [id, bucket] of buckets) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(bucket.positions, 3)), geo.setAttribute("normal", new THREE.Float32BufferAttribute(bucket.normals, 3)), id === "wood" && geo.setAttribute("color", new THREE.Float32BufferAttribute(bucket.colors, 3)), depthScale !== 1 && geo.scale(1, 1, depthScale), geo.computeBoundingBox(), geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, materials[id]);
        mesh.name = name + "-" + id, mesh.castShadow = !0, mesh.receiveShadow = !0, group.add(mesh);
      }
      return group;
    }
    return { group, materials, tri, polygon, geometry, box, path, tube, leaf, flower, floret, foliage, finish };
  }
  I.PROPMODELS.ivy_wall = function(THREE, kit) {
    const t = sculpt(THREE, kit, "ivy_wall", { stem: "#896344", leaf: "#5d7942", leafLight: "#8a9b50", blue: "#8499d3", white: "#f5eedb", pink: "#e5a5b3" }), curves = [
      [[0, 0.012, 0.034], [-0.1, 0.44, 0.064], [0.04, 0.92, 0.07], [-0.04, 1.39, 0.06], [0.1, 1.8, 0.055], [0.025, 2.18, 0.045], [0.08, 2.53, 0.035]],
      [[-0.015, 0.018, 0.03], [-0.28, 0.43, 0.055], [-0.47, 0.86, 0.06], [-0.45, 1.26, 0.07], [-0.57, 1.72, 0.055], [-0.52, 2.06, 0.04]],
      [[0.015, 0.018, 0.04], [0.23, 0.36, 0.064], [0.5, 0.73, 0.075], [0.54, 1.17, 0.068], [0.45, 1.56, 0.06], [0.56, 1.98, 0.045]],
      [[-0.07, 0.3, 0.05], [-0.34, 0.61, 0.08], [-0.6, 0.79, 0.06], [-0.64, 1.11, 0.045]],
      [[0.07, 0.2, 0.05], [0.35, 0.41, 0.06], [0.58, 0.49, 0.08], [0.63, 0.72, 0.055]],
      [[-0.08, 0.18, 0.04], [-0.32, 0.27, 0.09], [-0.54, 0.42, 0.06], [-0.65, 0.58, 0.045]],
      [[0.12, 0.37, 0.06], [0.32, 0.66, 0.08], [0.5, 0.94, 0.075], [0.64, 1.17, 0.045]],
      [[-0.015, 0.73, 0.07], [-0.22, 0.95, 0.1], [-0.31, 1.19, 0.06], [-0.22, 1.47, 0.045]],
      [[0.01, 1.01, 0.07], [0.2, 1.19, 0.07], [0.28, 1.4, 0.06], [0.39, 1.54, 0.04]]
    ].map((p) => t.path(p));
    for (let i = 0; i < curves.length; i++) {
      const c = curves[i], n = Math.ceil(c.getLength() / 0.115);
      t.tube("stem", c, i < 3 ? 0.012 : 75e-4, i < 3 ? 20 : 10, 4, 0.18), t.foliage(c, n, i + 1, { length: i < 3 ? 0.205 : 0.18, lobed: !0, pairs: !0, taper: !0, start: i < 3 ? 0.055 : 0.08, end: 0.97 });
    }
    {
      const blooms = [[1, 0.37, "blue", 0.065], [0, 0.3, "white", 0.065], [2, 0.54, "pink", 0.056], [3, 0.51, "blue", 0.058], [0, 0.53, "pink", 0.052], [4, 0.6, "white", 0.06], [5, 0.45, "blue", 0.052]];
      for (let j = 0; j < blooms.length; j++) {
        const [i, u, id, r] = blooms[j], p = curves[i].getPoint(u);
        p.z += 0.065, t.tube("stem", t.path([curves[i].getPoint(u).toArray(), p.toArray()]), 35e-4, 2, 4, 0.5), t.flower(id, p, r, j, 0.25);
      }
    }
    return t.finish();
  }, I.PROPMODELS.ivy_drape = function(THREE, kit) {
    const t = sculpt(THREE, kit, "ivy_drape", { stem: "#896344", leaf: "#678044", leafLight: "#8b9f53", lavender: "#b2a1d8", white: "#eee5f0", violet: "#8e80ba" }), crown = t.path([[-0.77, 6e-3, 0.045], [-0.4, 0.028, 0.06], [0, 0.01, 0.05], [0.39, 0.032, 0.055], [0.77, -5e-3, 0.045]]);
    t.tube("stem", crown, 0.014, 20, 5, 0.85);
    for (let j = 0; j < 23; j++) {
      const p = crown.getPoint((j + 0.3) / 23);
      p.y -= 0.025, t.leaf(j % 3 ? "leaf" : "leafLight", p, 0.13, 0.079, Math.PI + (j % 2 ? 1.13 : -1.13), 0.08 + 0.1 * Math.sin(j), !1);
    }
    const xs = [-0.72, -0.53, -0.31, -0.08, 0.16, 0.38, 0.61, 0.75], lengths = [0.61, 1.03, 0.79, 1.37, 0.88, 1.12, 0.8, 0.54], curves = [];
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i], L = lengths[i], a = 0.035 * Math.sin(i * 2.7), c = t.path([[x, 0.015, 0.055], [x + a, -L * 0.3, 0.09], [x - a, -L * 0.68, 0.08], [x + a * 0.5, -L, 0.065]]);
      curves.push(c), t.tube("stem", c, 75e-4, 12, 4, 0.15), t.foliage(c, Math.ceil(L / 0.09), i + 3, { length: 0.165, down: !0, taper: !0, end: 0.96, tilt: 0.1 });
    }
    {
      const clusters = [[-0.65, 0.2, 0.32], [-0.39, 0.43, 0.39], [-0.16, 0.2, 0.47], [0.09, 0.62, 0.46], [0.33, 0.25, 0.38], [0.57, 0.32, 0.4], [0.7, 0.17, 0.27]];
      for (let i = 0; i < clusters.length; i++) {
        const [x, drop, L] = clusters[i], source = curves[Math.min(i, curves.length - 1)].getPoint(Math.min(0.8, drop / lengths[Math.min(i, 7)])), top = [x, -drop, 0.14];
        t.tube("stem", t.path([source.toArray(), top]), 3e-3, 3, 3, 0.7);
        const c = t.path([top, [x + 0.012 * Math.sin(i), -drop - L * 0.5, 0.15], [x + 0.016 * Math.sin(i), -drop - L, 0.15]]);
        t.tube("stem", c, 3e-3, 9, 3, 0.25);
        const count = Math.ceil(L / 0.03);
        for (let j = 0; j < count; j++) {
          const u = j / (count - 1), p = c.getPoint(0.04 + u * 0.94), r = 0.031 * (1 - u * 0.7);
          for (const side of [-1, 1]) {
            const q = p.clone();
            q.x += side * r * 0.49, q.z += side > 0 ? 0.012 : 0.024, t.floret((j + i) % 4 === 0 ? "white" : (j + i) % 5 === 0 ? "violet" : "lavender", q, r, i + j);
          }
        }
      }
    }
    return t.finish();
  };
  function plantedCrown(t, THREE, cx, cy, cz, rx, ry, rz, count, seed) {
    for (let j = 0; j < count; j++) {
      const a = j * 2.399963 + seed, u = Math.sqrt((j + 0.4) / count), x = cx + Math.sin(a) * rx * u, z = cz + Math.cos(a) * rz * u, y = cy + ry * (1 - u * u) + 0.017 * Math.sin(j * 2.3), p = new THREE.Vector3(x, y, z);
      t.tube("wood", t.path([[x * 0.92, cy - 0.025, z], p.toArray()]), 24e-4, 1, 3, 0.6);
      const angle = Math.sin(a) * 1.3, tilt = (cz - z) * 1.1 + 0.06 * Math.cos(j * 1.7);
      t.leaf(j % 4 ? "leaf" : "leafLight", p, 0.09 + 0.018 * (j % 3), 0.06 + 8e-3 * (j % 2), angle, tilt, j % 3 === 0);
    }
  }
  function plantedFlowers(t, THREE, cx, cy, cz, rx, ry, rz, count, seed) {
    const colors = ["blue", "white", "white", "blue", "yellow", "blue", "pink", "white"];
    for (let j = 0; j < count; j++) {
      const a = j * 2.399963 + seed, u = Math.sqrt((j + 0.4) / count), x = cx + Math.sin(a) * rx * u, z = cz + Math.cos(a) * rz * u, y = cy + ry * (1 - u * u) + 0.014 * (j % 3), p = new THREE.Vector3(x, y, z);
      t.tube(t.materials.stem ? "stem" : "wood", t.path([[x, y - 0.07, z - 8e-3], p.toArray()]), 28e-4, 2, 3, 0.6), t.flower(colors[(j + seed) % colors.length], p, 0.04 + 7e-3 * (j % 3), j + seed, 1 + 0.5 * Math.sin(j));
    }
  }
  I.PROPMODELS.window_box = function(THREE, kit) {
    const t = sculpt(THREE, kit, "window_box", { wood: "#a36f48", navy: "#263a62", leaf: "#627c3c", leafLight: "#899950", blue: "#7c9bdc", white: "#f6efdb", yellow: "#edc56b", pink: "#e6a1b6" });
    t.box("wood", 0, -0.118, 0.227, 0.96, 0.19, 0.038, 6e-3), t.box("wood", 0, -0.115, 0.018, 0.96, 0.19, 0.026, 4e-3);
    for (const side of [-1, 1]) t.box("wood", side * 0.469, -0.115, 0.132, 0.038, 0.19, 0.224, 5e-3);
    t.box("wood", 0, -0.202, 0.132, 0.94, 0.026, 0.2, 4e-3), t.box("wood", 0, -0.014, 0.236, 0.99, 0.028, 0.038, 5e-3), t.box("wood", 0, -0.014, 0.019, 0.99, 0.028, 0.036, 4e-3);
    for (const side of [-1, 1]) t.box("wood", side * 0.477, -0.014, 0.13, 0.036, 0.028, 0.258, 4e-3);
    t.box("navy", 0, -0.048, 0.247, 0.954, 0.012, 4e-3);
    for (const side of [-1, 1]) t.box("navy", side * 0.49, -0.048, 0.133, 4e-3, 0.012, 0.235);
    for (const x of [-0.32, 0.32]) t.box("navy", x, -0.125, 6001e-6, 0.032, 0.18, 0.012, 2e-3);
    for (const x of [-0.245, 0.245]) t.box("navy", x, -0.132, 0.247, 3e-3, 0.128, 2e-3);
    for (const x of [-0.432, 0.432]) for (const y of [-0.087, -0.175]) {
      const geo = new THREE.OctahedronGeometry(6e-3, 0);
      geo.scale(1, 1, 0.45), geo.translate(x, y, 0.249), t.geometry("yellow", geo);
    }
    plantedCrown(t, THREE, 0, -3e-3, 0.145, 0.355, 0.075, 0.066, 53, 2);
    for (let j = 0; j < 9; j++) {
      const p = new THREE.Vector3(-0.38 + j * 0.095, 0.027, 0.251);
      t.leaf(j % 3 ? "leaf" : "leafLight", p, 0.105, 0.074, Math.PI + Math.sin(j * 2.4) * 0.7, 0.02, j % 3 === 0);
    }
    const spills = [[-0.34, 0.405], [-0.19, 0.275], [0.24, 0.445], [0.39, 0.235]];
    for (let j = 0; j < spills.length; j++) {
      const [x, L] = spills[j], c = t.path([[x, 0.04, 0.2], [x + 0.018, -0.04, 0.253], [x - 0.02, -L * 0.58, 0.249], [x + 0.018 * Math.sin(j), -L, 0.248]]);
      t.tube("wood", c, 4e-3, 9, 4, 0.2), t.foliage(c, 6, j + 2, { length: 0.085, down: !0, taper: !0, start: 0.2, end: 0.96, tilt: -0.04, tiltRange: 0.02 });
      for (let k = 0; k < 2; k++) {
        const p = c.getPoint(0.4 + k * 0.3);
        p.z += 2e-3, t.flower(k ? j % 2 ? "pink" : "white" : "blue", p, 0.033, j * 3 + k, 0.3);
      }
    }
    return plantedFlowers(t, THREE, 0, 0.15, 0.135, 0.36, 0.08, 0.052, 19, 1), t.finish(0.94);
  }, I.PROPMODELS.hanging_basket = function(THREE, kit) {
    const t = sculpt(THREE, kit, "hanging_basket", { wood: "#a87a49", iron: "#2f3a4b", leaf: "#637b3c", leafLight: "#8b9b4e", blue: "#7c9bdc", white: "#f6efdb", yellow: "#dfbb68", pink: "#e6a1b6" });
    t.box("iron", 0, -0.062, 0.013001, 0.06, 0.224, 0.026, 7e-3), t.tube("iron", t.path([[0, 0.01, 0.025], [0, 0.014, 0.18], [0, 0.012, 0.35], [0, 6e-3, 0.435]]), 0.01, 9, 5, 0.85), t.tube("iron", t.path([[0, -0.15, 0.025], [0, -0.13, 0.08], [0, -0.04, 0.2], [0, 0.013, 0.36]]), 8e-3, 9, 4, 0.8), t.tube("iron", t.path([[0, -0.025, 0.08], [0, -0.015, 0.135], [0, -0.055, 0.17], [0, -0.085, 0.13], [0, -0.062, 0.11]]), 6e-3, 10, 4, 0.55);
    const eye = new THREE.Vector3(0, -0.024, 0.425), ring = new THREE.TorusGeometry(0.016, 35e-4, 3, 8);
    ring.translate(0, -0.025, 0.425), t.geometry("iron", ring);
    for (const y of [0.018, -0.146]) {
      const geo = new THREE.OctahedronGeometry(8e-3, 0);
      geo.scale(1, 1, 0.5), geo.translate(0, y, 0.029), t.geometry("yellow", geo);
    }
    const ends = [[-0.174, -0.305, 0.36], [0.174, -0.305, 0.36], [0, -0.305, 0.53]];
    for (let j = 0; j < ends.length; j++) {
      const end = new THREE.Vector3(...ends[j]), axis = end.clone().sub(eye), rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
      for (let k = 0; k < 5; k++) {
        const p = eye.clone().lerp(end, (k + 0.5) / 5), geo = new THREE.TorusGeometry(1, 0.16, 3, 6);
        geo.scale(74e-4, axis.length() / 10 * 0.98, 74e-4), k % 2 && geo.rotateY(Math.PI / 2), geo.applyQuaternion(rotation), geo.translate(p.x, p.y, p.z), t.geometry("iron", geo);
      }
    }
    const profile = [[0, -0.583], [0.067, -0.58], [0.12, -0.55], [0.163, -0.49], [0.192, -0.4], [0.205, -0.313], [0.206, -0.298], [0.184, -0.298], [0.18, -0.329], [0.155, -0.425], [0.09, -0.515], [0, -0.535]], bowl = new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(...p)), 12);
    bowl.scale(1, 1, 0.79), bowl.translate(0, 0, 0.38), t.geometry("wood", bowl, 0.77);
    {
      const lip = new THREE.TorusGeometry(0.202, 0.011, 4, 16);
      lip.rotateX(Math.PI / 2), lip.scale(1, 1, 0.79), lip.translate(0, -0.303, 0.38), t.geometry("wood", lip);
    }
    for (const [y, r] of [[-0.35, 0.202], [-0.414, 0.189], [-0.49, 0.164], [-0.55, 0.12]]) {
      const band = new THREE.LatheGeometry([new THREE.Vector2(r, y - 8e-3), new THREE.Vector2(r + 4e-3, y), new THREE.Vector2(r, y + 8e-3)], 12);
      band.scale(1, 1, 0.79), band.translate(0, 0, 0.38), t.geometry("wood", band, 1.24);
    }
    for (let j = 0; j < 12; j++) {
      const a = j * Math.PI / 6, pts = [];
      for (const [y, r] of [[-0.315, 0.207], [-0.4, 0.194], [-0.49, 0.166], [-0.55, 0.123], [-0.577, 0.07]]) for (const d of [-0.045, 0.045]) pts.push([(r + 2e-3) * Math.sin(a + d), y, 0.38 + (r + 2e-3) * 0.79 * Math.cos(a + d)]);
      const idx = [];
      for (let k = 0; k < 4; k++) idx.push(k * 2, k * 2 + 3, k * 2 + 1, k * 2, k * 2 + 2, k * 2 + 3);
      t.polygon("wood", pts, idx, j % 2 ? 1 : 1.14);
    }
    plantedCrown(t, THREE, 0, -0.302, 0.38, 0.155, 0.045, 0.109, 24, 5), plantedFlowers(t, THREE, 0, -0.205, 0.38, 0.153, 0.025, 0.092, 10, 3);
    const trails = [[-0.145, 0.335, 0.55], [-0.11, 0.49, 0.45], [0.14, 0.43, 0.61], [0.045, 0.515, 0.41]];
    for (let j = 0; j < trails.length; j++) {
      const [x, z, L] = trails[j], c = t.path([[x * 0.75, -0.28, 0.38 + (z - 0.38) * 0.75], [x, -0.4, z], [x + 0.025 * Math.sin(j + 1), -0.28 - L * 0.7, z + 0.015], [x - 0.015, -0.28 - L, z]]);
      t.tube("wood", c, 4e-3, 8, 3, 0.2), t.foliage(c, 6, j + 4, { length: 0.09, down: !0, taper: !0, start: 0.16, end: 0.96, tilt: 0.07 });
      for (let k = 0; k < 2; k++) {
        const p = c.getPoint(0.28 + k * 0.35);
        p.z += 0.023, t.flower(k ? "white" : j % 2 ? "pink" : "blue", p, 0.036, j * 3 + k, 0.5);
      }
    }
    return t.finish();
  };
})(typeof window < "u" ? window : globalThis);
