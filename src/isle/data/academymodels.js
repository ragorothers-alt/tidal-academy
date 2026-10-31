/* 潮汐小島 · v9.3 星環學院：白石光橋門、十星水晶環與空白小石碑。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.ACADEMYMODELS = I.ACADEMYMODELS || {};
  const PI = Math.PI, TAU = PI * 2;
  const C = { stone: '#f4f0e9', light: '#fffaf1', lilac: '#c6b8dc', recess: '#a69bbb', gold: '#e6cf94' };

  // 公尺；只有石門正面為 +Z，光橋沿局部 −Z；共用材質只讀，固定裝飾依材質合併。
  function workshop(THREE, kit, group) {
    const bins = new Map();
    const mat = (c, o, kind) => kit.mat(c, Object.assign({ roughness: .86 }, o), kind);
    function add(geo, material, color = '#ffffff') {
      if (geo.index) { const source = geo; geo = source.toNonIndexed(); source.dispose(); }
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (material.vertexColors && !geo.attributes.color) {
        const c = new THREE.Color(color), values = new Float32Array(geo.attributes.position.count * 3);
        for (let i = 0; i < values.length; i += 3) values.set([c.r, c.g, c.b], i);
        geo.setAttribute('color', new THREE.BufferAttribute(values, 3));
      }
      if (!bins.has(material)) bins.set(material, []);
      bins.get(material).push(geo);
    }
    function put(geo, material, p = [0, 0, 0], r = [0, 0, 0], color) {
      geo.rotateX(r[0]); geo.rotateY(r[1]); geo.rotateZ(r[2]); geo.translate(...p); add(geo, material, color);
    }
    function box(p, size, material, color, bevel = 0) {
      const [w, h, d] = size;
      if (!bevel) { put(new THREE.BoxGeometry(w, h, d), material, p, [0, 0, 0], color); return; }
      const v = Math.min(bevel, w / 4, h / 4, d / 4), shape = new THREE.Shape();
      shape.moveTo(-w / 2 + v, -h / 2 + v); shape.lineTo(w / 2 - v, -h / 2 + v);
      shape.lineTo(w / 2 - v, h / 2 - v); shape.lineTo(-w / 2 + v, h / 2 - v); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * v, bevelEnabled: true, bevelSize: v, bevelThickness: v, bevelSegments: 1, steps: 1, curveSegments: 1 });
      geo.translate(0, 0, -d / 2 + v); put(geo, material, p, [0, 0, 0], color);
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
    return { mat, add, put, box, finish };
  }
  function palette(b) {
    return {
      stone: b.mat('#ffffff', { vertexColors: true }, 'stone'),
      gold: b.mat(C.gold, { roughness: .48, metalness: .42 }, 'metal')
    };
  }
  function marker(THREE, parent, name, p) {
    const obj = new THREE.Object3D(); obj.name = name; obj.position.set(...p); parent.add(obj); return obj;
  }
  function mesh(THREE, parent, name, geo, material, p) {
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    const obj = new THREE.Mesh(geo, material); obj.name = name; obj.position.set(...p);
    obj.castShadow = !material.transparent; obj.receiveShadow = !material.transparent; parent.add(obj); return obj;
  }
  function star(THREE, radius, depth) {
    const shape = new THREE.Shape();
    for (let j = 0; j < 10; j++) {
      const a = PI / 2 - j * PI / 5, r = radius * (j % 2 ? .44 : 1);
      if (j) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(0, r);
    }
    shape.closePath();
    const v = Math.min(.006, depth / 4), geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * v, bevelEnabled: true, bevelSize: v, bevelThickness: v, bevelSegments: 1, steps: 1, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2 + v); return geo;
  }
  function arch(THREE, inner, outer, depth, bevel = 0) {
    const shape = new THREE.Shape(), n = 16;
    for (let j = 0; j <= n; j++) {
      const a = j * PI / n, x = Math.cos(a) * outer[0], y = Math.sin(a) * outer[1];
      if (j) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    for (let j = n; j >= 0; j--) {
      const a = j * PI / n; shape.lineTo(Math.cos(a) * inner[0], Math.sin(a) * inner[1]);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bevel, bevelEnabled: !!bevel, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2 + bevel); return geo;
  }
  function landing(THREE) {
    // 十個窄槽直接切入上緣輪廓；下緣完整，金線不會懸跨凹槽。
    const angles = [], groove = [], points = [], indices = [];
    for (let j = 0; j < 10; j++) for (const a of [-.045, -.025, .025, .045, PI / 10]) {
      angles.push(j * TAU / 10 + a); groove.push(Math.abs(a) === .025);
    }
    const profile = [[1.855, -.07], [1.9, -.045], [1.9, .018], [1.9, .040], [1.86, .07]], n = angles.length;
    profile.forEach(([radius, y], row) => angles.forEach((a, j) => {
      const r = radius - (row >= 2 && groove[j] ? .045 : 0); points.push(Math.sin(a) * r, y, Math.cos(a) * r);
    }));
    for (let row = 0; row < profile.length - 1; row++) for (let j = 0; j < n; j++) {
      const a = row * n + j, c = row * n + (j + 1) % n, d = a + n, e = c + n;
      indices.push(a, c, d, c, e, d);
    }
    const bottom = points.length / 3; points.push(0, -.07, 0);
    const top = points.length / 3; points.push(0, .07, 0);
    for (let j = 0; j < n; j++) {
      const next = (j + 1) % n, last = (profile.length - 1) * n;
      indices.push(bottom, next, j, top, last + j, last + next);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geo.setIndex(indices);
    // 分面法線保留細小倒角與槽底，平台頂面維持平整。
    const flat = geo.toNonIndexed(); geo.dispose(); flat.computeVertexNormals(); return flat;
  }

  I.ACADEMYMODELS.sa_gate = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sa_gate';
    const b = workshop(THREE, kit, group), m = palette(b);
    mesh(THREE, group, 'landing', landing(THREE), b.mat(C.stone, {}, 'stone'), [0, .07, 0]);
    b.put(new THREE.TorusGeometry(1.895, .012, 4, 60), m.gold, [0, .036, 0], [PI / 2, 0, 0]);
    // 柱心 ±1.45、柱寬 .42；柱腳間淨寬 2.36，拱起點比平台高 2.98。
    for (const s of [-1, 1]) {
      const x = s * 1.45;
      b.box([x, .235, 0], [.54, .19, .60], m.stone, C.stone, .025);
      b.box([x, .345, 0], [.48, .07, .54], m.stone, C.lilac, .012);
      b.box([x, 1.84, 0], [.42, 2.94, .46], m.stone, C.stone, .024);
      b.box([x, .41, 0], [.445, .045, .49], m.gold, undefined, .008);
      b.box([x, 3.30, 0], [.48, .10, .52], m.stone, C.lilac, .015);
      b.box([x, 3.40, 0], [.56, .10, .58], m.stone, C.light, .018);
      b.box([x, 3.47, 0], [.50, .04, .53], m.gold, undefined, .008);
      for (const z of [-.235, .235]) {
        b.box([x, 1.85, z], [.19, 2.43, .012], m.stone, C.lilac, .005);
        b.box([x, 1.85, z + Math.sign(z) * .009], [.023, 2.20, .006], m.gold);
        b.put(star(THREE, .075, .016), m.gold, [x, .62, z + Math.sign(z) * .014]);
      }
      b.put(new THREE.CylinderGeometry(.105, .155, .13, 8), m.stone, [x, 3.555, 0], [0, 0, 0], C.lilac);
      b.put(new THREE.CylinderGeometry(.12, .12, .035, 8), m.gold, [x, 3.6275, 0]);
      const geo = new THREE.OctahedronGeometry(1, 0); geo.scale(.13, .25, .13);
      // kit.mat 可能快取材質；clone 讓左右燈與十顆寶石能各自改色、發光。
      mesh(THREE, group, s < 0 ? 'crystal_l' : 'crystal_r', geo,
        b.mat('#e4f6ff', { transparent: true, opacity: .8, roughness: .18, metalness: .06, depthWrite: false }, 'crystal').clone(), [x, 3.88, 0]);
    }
    b.put(arch(THREE, [1.24, .66], [1.66, .88], .46, .018), m.stone, [0, 3.12, 0], [0, 0, 0], C.stone);
    // 兩面同樣的金色拱線、薰衣草楔石與星紋；中間通道完全中空。
    for (const z of [-.239, .239]) {
      b.put(arch(THREE, [1.52, .783], [1.545, .808], .012), m.gold, [0, 3.12, z]);
      for (const a of [PI / 6, PI / 3, PI * 2 / 3, PI * 5 / 6]) {
        b.put(new THREE.BoxGeometry(.022, .115, .012), m.stone, [Math.cos(a) * 1.445, 3.12 + Math.sin(a) * .77, z], [0, 0, PI / 2 - a], C.lilac);
      }
      b.box([0, 3.96, z], [.16, .20, .024], m.stone, C.lilac, .009);
    }
    // 圓環外徑 1.10；立體星與穿透式寶石在 ±Z 都完整可見。
    for (const x of [-.16, .16]) b.box([x, 4.085, 0], [.045, .23, .10], m.gold, undefined, .008);
    b.put(new THREE.TorusGeometry(.515, .035, 6, 40), m.gold, [0, 4.66, 0]);
    b.put(star(THREE, .245, .09), m.gold, [0, 4.66, 0]);
    for (let j = 0; j < 10; j++) {
      const a = j * TAU / 10, x = Math.sin(a) * .515, y = 4.66 + Math.cos(a) * .515;
      const geo = new THREE.OctahedronGeometry(1, 0); geo.scale(.058, .078, .075); geo.rotateZ(-a);
      mesh(THREE, group, 'gem' + j, geo,
        b.mat('#ffffff', { transparent: true, opacity: .76, roughness: .16, metalness: .04, depthWrite: false }, 'crystal').clone(), [x, y, 0]);
    }
    marker(THREE, group, 'bridge', [0, .14, -1.75]);
    marker(THREE, group, 'front', [0, 0, 1.2]);
    return b.finish();
  };

  I.ACADEMYMODELS.sa_plaque = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sa_plaque';
    const b = workshop(THREE, kit, group), m = palette(b);
    b.box([0, .04, 0], [.60, .08, .18], m.stone, C.stone, .012);
    b.box([0, .105, 0], [.55, .05, .16], m.stone, C.lilac, .008);
    b.box([0, .45, 0], [.56, .66, .16], m.stone, C.stone, .025);
    b.box([0, .78, 0], [.59, .07, .18], m.stone, C.light, .014);
    b.box([0, .812, 0], [.40, .018, .12], m.gold, undefined, .004);
    b.put(star(THREE, .06, .05), m.gold, [0, .856, 0]);
    // 平面不與底板共面；本地 +Z 經旋轉朝 −Z，完整 UV 可直接貼字。
    b.box([0, .45, -.083], [.49, .53, .012], m.stone, C.recess, .006);
    const face = mesh(THREE, group, 'face', new THREE.PlaneGeometry(.46, .5), b.mat(C.light, { roughness: .9 }, 'stone'), [0, .45, -.0905]);
    face.rotation.y = PI;
    for (const x of [-.25, .25]) b.box([x, .45, -.086], [.012, .54, .008], m.gold);
    for (const y of [.18, .72]) b.box([0, y, -.086], [.51, .012, .008], m.gold);
    return b.finish();
  };
})(typeof window !== 'undefined' ? window : globalThis);
