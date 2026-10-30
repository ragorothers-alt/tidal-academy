/* 潮汐小島 · v8.9.1 港口的船與燈（程式化模型）：TA.ISLE.HARBORMODELS[key] = (THREE, kit) => THREE.Group。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.HARBORMODELS = I.HARBORMODELS || {};
  const PI = Math.PI;

  function workshop(THREE, kit, group) {
    const bins = new Map(); // 共用材質只讀，活動零件各自合併
    const mat = (c, o, kind) => kit.mat(c, Object.assign({ roughness: .86 }, o), kind);
    function add(geo, material, color) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const source = geo; geo = source.toNonIndexed(); source.dispose(); }
      if (material.vertexColors && !geo.attributes.color) {
        const c = new THREE.Color(color === undefined ? '#f1e8d6' : color);
        const colors = new Float32Array(geo.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      if (!bins.has(material)) bins.set(material, []);
      bins.get(material).push(geo);
    }
    function put(geo, material, p = [0, 0, 0], r = [0, 0, 0]) {
      geo.rotateX(r[0]); geo.rotateY(r[1]); geo.rotateZ(r[2]);
      geo.translate(...p); add(geo, material);
    }
    function profile(points, depth, material, p, r = [0, 0, 0], bevel = .008) {
      const shape = new THREE.Shape();
      points.forEach((v, i) => i ? shape.lineTo(...v) : shape.moveTo(...v)); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 1 });
      geo.translate(0, 0, -depth / 2 + bevel); put(geo, material, p, r);
    }
    function box(p, size, material, r = [0, 0, 0], bevel = .018) {
      const [w, h, d] = size, v = Math.min(bevel, w / 4, h / 4, d / 4);
      profile([[-w / 2 + v, -h / 2 + v], [w / 2 - v, -h / 2 + v], [w / 2 - v, h / 2 - v], [-w / 2 + v, h / 2 - v]], d, material, p, r, v);
    }
    function rod(a, b, radius, material, n = 6, topRadius = radius) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
      const d = end.clone().sub(start), geo = new THREE.CylinderGeometry(topRadius, radius, d.length(), n, 1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, material);
    }
    function lathe(p, points, material, n = 12) {
      put(new THREE.LatheGeometry(points.map(v => new THREE.Vector2(...v)), n), material, p);
    }
    function tube(points, radius, material, steps = 12, sides = 5, closed = false) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
      add(new THREE.TubeGeometry(curve, steps, radius, sides, closed), material);
    }
    function finish() {
      let index = 0;
      for (const [material, list] of bins) {
        const count = list.reduce((n, geo) => n + geo.attributes.position.count, 0);
        const geo = new THREE.BufferGeometry();
        for (const [key, width] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
          if (key === 'color' && !material.vertexColors) continue;
          const values = new Float32Array(count * width); let offset = 0;
          for (const part of list) {
            const attr = part.attributes[key];
            if (attr) values.set(attr.array, offset * width);
            offset += part.attributes.position.count;
          }
          geo.setAttribute(key, new THREE.BufferAttribute(values, width));
        }
        list.forEach(part => part.dispose());
        geo.computeBoundingBox(); geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, material);
        mesh.name = group.name + '-batch-' + index++;
        mesh.castShadow = !material.transparent; mesh.receiveShadow = !material.transparent;
        group.add(mesh);
      }
      bins.clear(); return group;
    }
    return { mat, add, put, profile, box, rod, lathe, tube, finish };
  }

  const outline = [[0, 1], [.40, .93], [.73, .70], [.94, .36], [1, -.06], [.94, -.46], [.78, -.80], [.55, -1], [0, -1], [-.55, -1], [-.78, -.80], [-.94, -.46], [-1, -.06], [-.94, .36], [-.73, .70], [-.40, .93]]; // 尖船首與寬船尾
  function ring(row) {
    return outline.map(([x, z]) => [x * row[1], row[0], z * row[2]]);
  }
  function skin(THREE, b, rows, material, reverse = false) {
    const positions = [], uv = [], indices = [], n = outline.length;
    rows.forEach((row, j) => ring(row).forEach((p, i) => { positions.push(...p); uv.push(i / n, j / (rows.length - 1)); }));
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n; i++) {
      const a = j * n + i, c = j * n + (i + 1) % n, d = c + n, e = a + n;
      if (reverse) indices.push(a, d, c, a, e, d);
      else indices.push(a, c, d, a, d, e);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices); geo.computeVertexNormals(); b.add(geo, material);
  }
  function cap(THREE, b, row, material, down = false) {
    const positions = [], points = ring(row), n = points.length;
    for (let i = 0; i < n; i++) {
      const a = points[i], c = points[(i + 1) % n];
      positions.push(0, row[0], 0, ...(down ? c : a), ...(down ? a : c));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); b.add(geo, material);
  }
  function marker(THREE, parent, name, p) {
    const obj = new THREE.Object3D(); obj.name = name; obj.position.set(...p); parent.add(obj); return obj;
  }
  function lampHead(b, p, w, h, frame, brass, glass) {
    const [x, y, z] = p, at = (dx, dy, dz) => [x + dx, y + dy, z + dz];
    b.lathe(p, [[0, -h / 2], [w * .34, -h / 2], [w * .43, -h * .39], [w * .43, h * .39], [w * .34, h / 2], [0, h / 2]], glass, 6);
    b.lathe(p, [[0, -h * .66], [w * .48, -h * .66], [w * .51, -h * .52], [w * .46, -h * .45], [0, -h * .45]], frame, 6);
    b.lathe(p, [[0, h * .46], [w * .58, h * .46], [w * .60, h * .56], [w * .31, h * .86], [w * .10, h * .90], [0, h * .90]], frame, 6);
    for (let i = 0; i < 6; i++) {
      const a = i * PI / 3, dx = Math.sin(a) * w * .46, dz = Math.cos(a) * w * .46;
      b.rod(at(dx, -h * .5, dz), at(dx, h * .5, dz), w * .026, frame, 5);
    }
    b.lathe(at(0, h * .92, 0), [[0, 0], [w * .08, 0], [w * .07, h * .1], [0, h * .14]], brass, 6);
  }

  I.HARBORMODELS.rowboat = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'rowboat';
    const b = workshop(THREE, kit, group);
    const teal = b.mat('#3f8f8c', { roughness: .82 });
    const cream = b.mat('#f1e8d6', { roughness: .83 });
    const wood = b.mat('#a7774b', { roughness: .88 }, 'wood');
    const dark = b.mat('#8a5d38', { roughness: .9 }, 'wood');
    const brass = b.mat('#b69663', { roughness: .46, metalness: .65 }, 'metal');
    const bottom = [-.20, .16, .98], chine = [-.10, .40, 1.16], water = [.04, .50, 1.24];
    const stripe = [.155, .525, 1.275], upper = [.210, .529, 1.279], lip = [.245, .529, 1.279];
    skin(THREE, b, [bottom, chine, water, stripe], teal); cap(THREE, b, bottom, teal, true);
    skin(THREE, b, [stripe, upper], cream); skin(THREE, b, [upper, lip], teal);
    const floor = [.015, .29, 1.06], inner = [.235, .487, 1.235];
    skin(THREE, b, [floor, [.085, .445, 1.18], inner], wood, true); cap(THREE, b, floor, wood);
    skin(THREE, b, [lip, inner], dark); b.tube(ring(lip), .021, dark, 32, 5, true);
    for (const x of [-.15, -.05, .05, .15]) b.box([x, .035, -.06], [.085, .026, 1.65], dark, [0, 0, 0], .006); // 抬高底板避開水面
    for (const z of [-.55, .20]) {
      b.box([0, .157, z], [z < 0 ? .89 : .93, .062, .235], wood);
      for (const x of [-.36, .36]) b.box([x, .07, z], [.055, .16, .12], dark);
    }
    b.profile([[-.24, .76], [.24, .76], [.17, 1.03], [0, 1.19], [-.17, 1.03]], .05, wood, [0, .17, 0], [PI / 2, 0, 0]);
    const seat = marker(THREE, group, 'seat', [0, .188, .20]); seat.rotation.y = PI; // 坐姿朝向船尾
    for (const sign of [-1, 1]) {
      b.rod([sign * .52, .20, -.02], [sign * .535, .245, -.02], .016, brass);
      b.put(new THREE.TorusGeometry(.037, .009, 5, 8), brass, [sign * .535, .245, -.02], [0, PI / 2, 0]);
      const oar = new THREE.Group(); oar.name = sign < 0 ? 'oarL' : 'oarR';
      oar.position.set(sign * .535, .245, -.02); oar.rotation.z = -sign * .19; group.add(oar);
      const ob = workshop(THREE, kit, oar);
      ob.rod([-sign * .16, 0, 0], [sign * 1.04, 0, 0], .021, dark, 7, .017);
      ob.box([-sign * .095, 0, 0], [.11, .045, .047], wood, [0, 0, 0], .009);
      const blade = [[.96, -.035], [1.08, -.105], [1.32, -.12], [1.38, -.075], [1.38, .075], [1.32, .12], [1.08, .105], [.96, .035]].map(([x, z]) => [x * sign, z]);
      ob.profile(blade, .034, wood, [0, 0, 0], [PI / 2, 0, 0], .008); ob.finish();
    }
    return b.finish();
  };

  I.HARBORMODELS.fishing_boat = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'fishing_boat';
    const b = workshop(THREE, kit, group);
    const teal = b.mat('#3f8f8c', { roughness: .82 });
    const cream = b.mat('#f1e8d6', { roughness: .82 });
    const coral = b.mat('#e2725b', { roughness: .82 });
    const wood = b.mat('#a7774b', { roughness: .9 }, 'wood');
    const dark = b.mat('#8a5d38', { roughness: .9 }, 'wood');
    const navy = b.mat('#253346', { roughness: .65, metalness: .25 }, 'metal');
    const rubber = b.mat('#35424d', { roughness: .98 });
    const brass = b.mat('#b69663', { roughness: .45, metalness: .65 }, 'metal');
    const rope = b.mat('#c8ad7f', { roughness: .98 }, 'fabric');
    const net = b.mat('#6d8d86', { roughness: .98 }, 'fabric');
    const glass = kit.win();
    const bottom = [-.35, .25, 1.68], chine = [-.20, .59, 1.92], water = [.055, .745, 2.04];
    const band = [.205, .772, 2.067], upper = [.27, .78, 2.075], lip = [.375, .78, 2.075];
    skin(THREE, b, [bottom, chine, water], teal); cap(THREE, b, bottom, teal, true);
    skin(THREE, b, [water, band], cream); skin(THREE, b, [band, upper], coral); skin(THREE, b, [upper, lip], cream);
    const deck = [.29, .707, 1.99], inner = [.365, .737, 2.035];
    skin(THREE, b, [deck, inner], teal, true); cap(THREE, b, deck, wood);
    skin(THREE, b, [lip, inner], dark); b.tube(ring(lip), .025, teal, 40, 5, true);
    for (const x of [-.48, -.24, 0, .24, .48]) b.rod([x, .294, -1.45], [x, .294, 1.40], .004, dark, 4);
    b.box([0, .535, -1.03], [1.04, .47, 1.04], cream, [0, 0, 0], .035);
    for (const x of [-.515, .515]) {
      b.box([x, .99, -1.03], [.018, .36, .92], glass, [0, 0, 0], .004);
      for (const z of [-1.55, -1.03, -.51]) b.box([x, 1.00, z], [.045, .48, .045], navy, [0, 0, 0], .008);
      for (const y of [.79, 1.205]) b.box([x, y, -1.03], [.05, .046, 1.08], navy, [0, 0, 0], .008);
    }
    for (const z of [-1.552, -.508]) {
      for (const x of [-.25, .25]) b.box([x, .99, z], [.44, .36, .018], glass, [0, 0, 0], .004);
      b.box([0, 1.00, z], [.035, .46, .038], navy, [0, 0, 0], .006);
      for (const y of [.79, 1.205]) b.box([0, y, z], [1.06, .046, .045], navy, [0, 0, 0], .008);
    }
    b.box([0, 1.265, -1.03], [1.20, .11, 1.22], cream, [0, 0, 0], .03);
    b.box([0, 1.33, -1.03], [1.13, .055, 1.15], teal);
    b.box([.29, .56, -1.562], [.35, .42, .025], teal, [0, 0, 0], .008);
    b.rod([.38, .55, -1.587], [.38, .60, -1.587], .013, brass, 6);
    b.put(new THREE.TorusGeometry(.135, .036, 5, 12), coral, [-.26, .56, -1.59]);
    for (const sign of [-1, 1]) {
      const rail = [[sign * .65, .60, .44], [sign * .56, .60, 1.12], [sign * .32, .60, 1.69], [0, .60, 1.97]];
      b.tube(rail, .016, cream, 12, 5);
      for (let i = 0; i < 3; i++) b.rod([rail[i][0], .37, rail[i][2]], rail[i], .013, cream, 6);
    }
    b.rod([0, .30, 1.63], [0, .46, 1.63], .045, brass, 8);
    b.rod([-.12, .45, 1.63], [.12, .45, 1.63], .023, brass, 6);
    b.rod([-.10, .30, 1.00], [-.10, 1.89, 1.00], .029, navy, 8, .021);
    b.tube([[-.10, 1.76, 1], [-.10, 1.91, 1], [.08, 1.92, 1], [.29, 1.88, 1]], .021, navy, 10, 5);
    b.rod([.29, 1.88, 1], [.29, 1.75, 1], .009, brass, 5);
    const lantern = new THREE.Group(); lantern.name = 'lantern'; lantern.position.set(.29, 1.54, 1); group.add(lantern);
    const lb = workshop(THREE, kit, lantern); lampHead(lb, [0, 0, 0], .23, .20, navy, brass, glass);
    lb.put(new THREE.TorusGeometry(.027, .007, 4, 8), brass, [0, .205, 0]); lb.finish();
    marker(THREE, lantern, 'light', [0, 0, 0]);
    for (const z of [-1.12, -.12, .65]) {
      b.put(new THREE.TorusGeometry(.123, .043, 5, 12), rubber, [-.835, .105, z], [0, PI / 2, 0]);
      b.rod([-.765, .39, z], [-.855, .23, z], .011, rope, 5);
    }
    const coil = [];
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * PI * 6, r = .045 + .17 * i / 64;
      coil.push([-.31 + Math.cos(a) * r, .315, .50 + Math.sin(a) * r]);
    }
    b.tube(coil, .014, rope, 64, 4);
    b.tube([coil[64], [-.03, .315, .57], [-.01, .315, .84], [-.25, .315, .95]], .014, rope, 10, 4);
    b.box([.32, .344, .10], [.50, .09, .64], net, [0, -.08, 0], .032);
    b.box([.32, .397, .10], [.46, .026, .60], net, [0, .04, 0], .006);
    for (let i = 0; i < 5; i++) b.rod([.11 + i * .105, .414, -.18], [.11 + i * .105, .414, .38], .005, rope, 4);
    for (let i = 0; i < 6; i++) b.rod([.105, .416, -.17 + i * .107], [.535, .416, -.17 + i * .107], .005, rope, 4);
    b.tube([[.10, .39, -.13], [.06, .33, -.22], [.18, .305, -.28], [.25, .34, -.21]], .012, net, 8, 4);
    return b.finish();
  };

  I.HARBORMODELS.pier_lamp = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'pier_lamp';
    const b = workshop(THREE, kit, group);
    const navy = b.mat('#253346', { roughness: .58, metalness: .4 }, 'metal');
    const brass = b.mat('#b69663', { roughness: .45, metalness: .65 }, 'metal');
    const glass = kit.win();
    b.lathe([0, 0, 0], [[0, 0], [.145, 0], [.16, .025], [.15, .065], [.105, .09], [.075, .19], [.047, .25], [.042, 2.02], [0, 2.04]], navy, 10);
    b.lathe([0, 0, 0], [[.078, .095], [.105, .095], [.11, .115], [.103, .135], [.075, .135], [.078, .095]], brass, 10);
    b.tube([[0, 1.94, 0], [0, 2.31, 0], [.15, 2.46, 0], [.37, 2.42, 0], [.45, 2.29, 0]], .033, navy, 14, 6);
    b.rod([.45, 2.29, 0], [.45, 2.20, 0], .012, brass, 6);
    lampHead(b, [.45, 1.94, 0], .32, .28, navy, brass, glass);
    marker(THREE, group, 'light', [.45, 1.94, 0]);
    return b.finish();
  };

  I.HARBORMODELS.buoy = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'buoy';
    const b = workshop(THREE, kit, group);
    const coral = b.mat('#e2725b', { roughness: .8 });
    const cream = b.mat('#f1e8d6', { roughness: .82 });
    const navy = b.mat('#253346', { roughness: .65, metalness: .3 }, 'metal');
    const brass = b.mat('#b69663', { roughness: .5, metalness: .55 }, 'metal');
    const glass = kit.win();
    b.lathe([0, 0, 0], [[0, -.25], [.12, -.25], [.23, -.19], [.29, -.08], [.30, .03], [.29, .12]], coral, 12);
    b.lathe([0, 0, 0], [[.29, .12], [.265, .23], [.22, .28]], cream, 12);
    b.lathe([0, 0, 0], [[.22, .28], [.18, .31], [.12, .33], [0, .33]], coral, 12);
    b.lathe([0, 0, 0], [[0, .325], [.125, .325], [.13, .35], [.115, .365], [0, .365]], navy, 8);
    for (const x of [-.075, .075]) for (const z of [-.075, .075]) b.rod([x, .35, z], [x, .62, z], .01, navy, 5);
    b.lathe([0, .505, 0], [[0, -.085], [.046, -.085], [.056, -.06], [.056, .055], [.043, .075], [0, .075]], glass, 6);
    b.lathe([0, 0, 0], [[0, .39], [.075, .39], [.08, .415], [.06, .43], [0, .43]], brass, 6);
    b.lathe([0, 0, 0], [[0, .58], [.115, .58], [.12, .61], [.06, .65], [0, .65]], navy, 8);
    b.put(new THREE.TorusGeometry(.03, .008, 4, 8), brass, [0, .674, 0]);
    marker(THREE, group, 'light', [0, .50, 0]);
    return b.finish();
  };
})(typeof window !== 'undefined' ? window : globalThis);
