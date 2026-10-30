/* 潮汐小島 · v8.9 團體活動的場景道具（程式化模型）：TA.ISLE.ACTSCENE[key] = (THREE, kit) => THREE.Group。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.ACTSCENE = I.ACTSCENE || {};
  const PI = Math.PI;

  // Only geometry is owned here. kit.mat returns shared engine materials: never edit them.
  // Each rigid assembly has one mesh per material; articulated assemblies batch locally.
  function workshop(THREE, kit, group) {
    const bins = new Map();
    const mat = (c, o, kind) => kit.mat(c, Object.assign({ roughness: .86 }, o), kind);
    function add(geo, material, color) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const source = geo; geo = source.toNonIndexed(); source.dispose(); }
      if (material.vertexColors && !geo.attributes.color) {
        const c = new THREE.Color(color === undefined ? '#ffffff' : color);
        const colors = new Float32Array(geo.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      if (!bins.has(material)) bins.set(material, []);
      bins.get(material).push(geo);
    }
    function put(geo, material, p = [0, 0, 0], r = [0, 0, 0], color) {
      geo.rotateX(r[0]); geo.rotateY(r[1]); geo.rotateZ(r[2]);
      geo.translate(...p); add(geo, material, color);
    }
    function box(p, size, material, r = [0, 0, 0]) {
      put(new THREE.BoxGeometry(...size), material, p, r);
    }
    function cylinder(p, rt, rb, h, material, n = 16) {
      put(new THREE.CylinderGeometry(rt, rb, h, n, 1), material, p);
    }
    function rod(a, b, radius, material, n = 6, topRadius = radius) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
      const d = end.clone().sub(start), geo = new THREE.CylinderGeometry(topRadius, radius, d.length(), n, 1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, material);
    }
    function beam(a, b, w, d, material) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
      const delta = end.clone().sub(start), geo = new THREE.BoxGeometry(w, delta.length(), d);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
      geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, material);
    }
    function sphere(p, size, material, n = 10, rows = 6) {
      const geo = new THREE.SphereGeometry(1, n, rows); geo.scale(...size); put(geo, material, p);
    }
    function lathe(p, points, material, n = 20) {
      put(new THREE.LatheGeometry(points.map(v => new THREE.Vector2(...v)), n), material, p);
    }
    function tube(points, radius, material, steps = 12, sides = 5) {
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), steps, radius, sides, false), material);
    }
    function profile(points, depth, material, p, r = [0, 0, 0]) {
      const shape = new THREE.Shape();
      points.forEach((v, i) => i ? shape.lineTo(...v) : shape.moveTo(...v)); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 4 });
      geo.translate(0, 0, -depth / 2); put(geo, material, p, r);
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
    return { mat, add, put, box, cylinder, rod, beam, sphere, lathe, tube, profile, finish };
  }

  // Thin, closed gingham cloth. Cell colors are linear vertex colors, with no texture.
  // The height function is shared by the top, underside and sewn edge, so corners stay closed.
  function cloth(THREE, w, d, nx, nz, height, thickness, palette) {
    const positions = [], colors = [], indices = [];
    function quad(points, color, reverse) {
      const offset = positions.length / 3, c = new THREE.Color(color);
      points.forEach(p => { positions.push(...p); colors.push(c.r, c.g, c.b); });
      if (reverse) indices.push(offset, offset + 2, offset + 1, offset, offset + 3, offset + 2);
      else indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    }
    const point = (i, j, bottom) => {
      const x = -w / 2 + w * i / nx, z = -d / 2 + d * j / nz;
      return [x, height(x, z) - (bottom ? thickness : 0), z];
    };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const color = palette[(i % 2) + (j % 2)];
      // Counterclockwise as seen from +Y.
      quad([point(i, j, false), point(i, j + 1, false), point(i + 1, j + 1, false), point(i + 1, j, false)], color, false);
      quad([point(i, j, true), point(i, j + 1, true), point(i + 1, j + 1, true), point(i + 1, j, true)], palette[1], true);
    }
    const edge = [];
    for (let i = 0; i < nx; i++) edge.push([i, 0]);
    for (let j = 0; j < nz; j++) edge.push([nx, j]);
    for (let i = nx; i > 0; i--) edge.push([i, nz]);
    for (let j = nz; j > 0; j--) edge.push([0, j]);
    for (let i = 0; i < edge.length; i++) {
      const a = edge[i], b = edge[(i + 1) % edge.length];
      quad([point(...a, false), point(...a, true), point(...b, true), point(...b, false)], palette[2], false);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices); geo.computeVertexNormals(); return geo;
  }

  // Wicker is low relief geometry: broad woven bands, upright reeds, a split lid and an arched handle.
  function basket(THREE, b, p, scale, wicker, reed, gold) {
    const [x, y, z] = p, s = scale;
    const at = (xx, yy, zz) => [x + xx * s, y + yy * s, z + zz * s];
    const box = (xx, yy, zz, w, h, d, m) => b.box(at(xx, yy, zz), [w * s, h * s, d * s], m);
    box(0, .073, 0, .28, .146, .19, wicker);
    for (const yy of [.025, .064, .103, .14]) {
      for (const zz of [-.097, .097]) box(0, yy, zz, .286, .012, .008, reed);
      for (const xx of [-.143, .143]) box(xx, yy, 0, .008, .012, .198, reed);
    }
    for (const xx of [-.112, -.056, 0, .056, .112]) for (const zz of [-.101, .101]) box(xx, .073, zz, .009, .13, .006, reed);
    for (const xx of [-.147, .147]) for (const zz of [-.063, 0, .063]) box(xx, .073, zz, .006, .13, .009, reed);
    for (const xx of [-.073, .073]) box(xx, .153, 0, .14, .018, .208, wicker);
    box(0, .166, 0, .013, .008, .21, reed);
    const handle = [];
    for (let i = 0; i <= 10; i++) {
      const a = PI * i / 10; handle.push(at(Math.cos(a) * .115, .157 + Math.sin(a) * .147, 0));
    }
    b.tube(handle, .009 * s, reed, 10, 5);
    box(.012, .126, .11, .034, .032, .007, gold);
  }

  I.ACTSCENE.chess_set = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'chess_set';
    const b = workshop(THREE, kit, group);
    const stone = b.mat('#F1E4D1', { roughness: .88 }, 'stone');
    const shade = b.mat('#C8BDD1', { roughness: .92 }, 'stone');
    const gold = b.mat('#E8C48B', { roughness: .4, metalness: .65 }, 'metal');
    const board = b.mat('#ffffff', { vertexColors: true, roughness: .8 });
    const white = b.mat('#FFF1DB', { roughness: .72 }, 'stone');
    const navy = b.mat('#45566F', { roughness: .72 }, 'stone');
    b.lathe([0, 0, 0], [[0, 0], [.215, 0], [.235, .035], [.21, .075], [.14, .1], [.115, .56], [.18, .635], [.40, .65], [.42, .67], [.42, .705], [.405, .72], [0, .72]], stone, 24);
    b.cylinder([0, .086, 0], .145, .17, .022, shade, 16);
    for (const z of [-.72, .72]) {
      b.lathe([0, 0, z], [[0, 0], [.15, 0], [.165, .025], [.145, .06], [.085, .09], [.09, .36], [.18, .405], [.20, .43], [.20, .455], [.19, .47], [0, .47]], stone, 20);
      b.cylinder([0, .105, z], .09, .095, .025, shade, 12);
    }
    for (let z = 0; z < 8; z++) for (let x = 0; x < 8; x++) {
      const geo = new THREE.PlaneGeometry(.0625, .0625); geo.rotateX(-PI / 2);
      b.put(geo, board, [-.21875 + x * .0625, .722, -.21875 + z * .0625], [0, 0, 0], (x + z) % 2 ? '#56637A' : '#FFF1DB');
    }
    for (const sign of [-1, 1]) {
      b.box([0, .722, sign * .255], [.52, .006, .009], gold);
      b.box([sign * .255, .722, 0], [.009, .006, .50], gold);
    }
    function piece(x, z, material, type, facing) {
      const y = .723;
      b.lathe([x, y, z], [[0, 0], [.024, 0], [.025, .009], [.019, .017], [.012, .025], [.010, .044], [.016, .051], [0, .053]], material, 10);
      if (type === 'pawn') b.sphere([x, y + .066, z], [.019, .021, .019], material, 8, 5);
      if (type === 'rook') {
        b.cylinder([x, y + .065, z], .021, .016, .032, material, 8);
        for (const a of [0, PI / 2, PI, PI * 1.5]) b.box([x + Math.cos(a) * .016, y + .087, z + Math.sin(a) * .016], [.013, .014, .013], material);
      }
      if (type === 'knight') b.profile([[-.018, 0], [.017, 0], [.014, .022], [.025, .034], [.029, .054], [.01, .07], [.008, .082], [-.002, .072], [-.016, .065], [-.025, .042], [-.014, .039], [-.006, .051], [-.006, .024]], .024, material, [x, y + .043, z], [0, facing, 0]);
    }
    piece(-.15625, -.15625, navy, 'rook', 0);
    piece(.09375, -.15625, navy, 'knight', PI);
    piece(.03125, -.03125, navy, 'pawn', 0);
    piece(-.09375, .03125, white, 'pawn', 0);
    piece(.15625, .15625, white, 'rook', 0);
    piece(-.15625, .15625, white, 'knight', 0);
    return b.finish();
  };

  I.ACTSCENE.picnic_set = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'picnic_set';
    const b = workshop(THREE, kit, group);
    const wood = b.mat('#CDA67E', { roughness: .8 }, 'wood');
    const light = b.mat('#DAB995', { roughness: .8 }, 'wood');
    const iron = b.mat('#777A98', { roughness: .4, metalness: .6 }, 'metal');
    const gold = b.mat('#E8C48B', { roughness: .4, metalness: .65 }, 'metal');
    const fabric = b.mat('#ffffff', { roughness: .95, vertexColors: true });
    const porcelain = b.mat('#FFF6E7', { roughness: .4 });
    const food = b.mat('#ffffff', { roughness: .9, vertexColors: true });
    for (let i = 0; i < 5; i++) b.box([0, .6925, -.32 + i * .16], [1.5, .055, .16], i % 2 ? light : wood);
    for (const z of [-.62, .62]) for (const dz of [-.075, .075]) b.box([0, .445, z + dz], [1.5, .05, .15], light);
    for (const x of [-.55, .55]) {
      for (const sign of [-1, 1]) {
        b.box([x, .025, sign * .65], [.12, .05, .23], wood);
        b.beam([x, .065, sign * .65], [x, .665, sign * .215], .075, .075, wood);
        b.box([x, .3925, sign * .62], [.095, .055, .31], iron);
        b.sphere([x + .049, .39, sign * .62], [.008, .012, .012], gold, 6, 4);
      }
      b.box([x, .36, 0], [.09, .07, 1.42], wood);
      b.box([x, .641, 0], [.09, .045, .77], iron);
    }
    b.beam([-.55, .36, 0], [0, .63, 0], .045, .045, wood);
    b.beam([.55, .36, 0], [0, .63, 0], .045, .045, wood);
    b.add(cloth(THREE, 1.08, .90, 12, 10, (x, z) => .727 - Math.max(0, Math.abs(z) - .39) * 1.65, .004, ['#FFF2E8', '#F3C9D6', '#DB9FB5']), fabric);
    basket(THREE, b, [-.31, .733, -.09], 1, wood, light, gold);
    // Teapot: hollow-looking rim, separate lid, arched handle and an upward pouring spout.
    const tx = .255, ty = .733, tz = -.115;
    b.lathe([tx, ty, tz], [[0, 0], [.052, 0], [.078, .022], [.085, .064], [.069, .112], [.044, .13], [.038, .13], [.038, .12], [0, .12]], porcelain, 16);
    b.lathe([tx, ty, tz], [[0, .128], [.047, .128], [.049, .137], [.026, .147], [0, .147]], porcelain, 12);
    b.sphere([tx, ty + .157, tz], [.014, .013, .014], gold, 8, 4);
    b.tube([[tx - .06, ty + .025, tz], [tx - .126, ty + .025, tz], [tx - .137, ty + .106, tz], [tx - .065, ty + .112, tz]], .012, porcelain, 10);
    b.rod([tx + .055, ty + .04, tz], [tx + .135, ty + .123, tz], .028, porcelain, 10, .014);
    b.cylinder([tx + .135, ty + .124, tz], .010, .010, .003, iron, 8);
    for (const [x, z] of [[.10, .205], [.39, .19]]) {
      b.lathe([x, ty, z], [[0, 0], [.031, 0], [.041, .063], [.037, .067], [.031, .06], [.025, .009], [0, .009]], porcelain, 10);
      b.tube([[x + .034, ty + .05, z], [x + .067, ty + .057, z], [x + .067, ty + .02, z], [x + .031, ty + .014, z]], .006, porcelain, 6, 4);
    }
    b.lathe([-.25, ty, .24], [[0, 0], [.094, 0], [.128, .011], [.13, .02], [.11, .022], [.09, .01], [0, .01]], porcelain, 16);
    const triangle = [[-.048, -.039], [.052, -.039], [-.048, .047]];
    for (const x of [-.286, -.209]) {
      for (const [dy, h, c] of [[.022, .016, '#EBC58D'], [.033, .007, '#9BBF91'], [.039, .006, '#EFBAAF'], [.05, .017, '#FFF0D2']]) {
        const shape = new THREE.Shape(); triangle.forEach((v, i) => i ? shape.lineTo(...v) : shape.moveTo(...v)); shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
        geo.rotateX(-PI / 2); b.put(geo, food, [x, ty + dy, .25], [0, 0, 0], c);
      }
    }
    return b.finish();
  };

  I.ACTSCENE.kite = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kite';
    const sail = new THREE.Group(); sail.name = 'sail'; group.add(sail);
    const b = workshop(THREE, kit, sail);
    const fabric = b.mat('#ffffff', { roughness: .9, vertexColors: true, side: THREE.DoubleSide });
    const bamboo = b.mat('#CDA67E', { roughness: .8 }, 'wood');
    const gold = b.mat('#E8C48B', { roughness: .4, metalness: .6 }, 'metal');
    const thread = b.mat('#FFF1DB', { roughness: .95 });
    const corners = [[0, .5, 0], [-.4, 0, 0], [0, -.5, 0], [.4, 0, 0]];
    const colors = ['#FFF1DB', '#B5D7ED', '#F3BDD2', '#BBDCC7'];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([[0, 0, .022], corners[i], corners[(i + 1) % 4]].flat(), 3));
      b.add(geo, fabric, colors[i]); b.rod(corners[i], corners[(i + 1) % 4], .006, gold, 5);
    }
    b.rod([0, -.5, -.012], [0, .5, -.012], .009, bamboo);
    b.rod([-.4, 0, -.012], [.4, 0, -.012], .008, bamboo);
    b.rod([-.20, 0, .013], [0, 0, .065], .002, thread, 4);
    b.rod([.20, 0, .013], [0, 0, .065], .002, thread, 4);
    b.put(new THREE.TorusGeometry(.018, .004, 4, 10), gold, [0, 0, .026]);
    b.finish();
    // Center-origin kite is deliberately airborne. Tail pivots remain in local coordinates.
    const tail = new THREE.Group(); tail.name = 'tail'; tail.position.y = -.5; group.add(tail);
    let parent = tail;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group(); seg.name = 'seg' + i; seg.position.y = i === 0 ? 0 : -.22;
      parent.add(seg); parent = seg;
      const s = workshop(THREE, kit, seg);
      s.rod([0, 0, 0], [0, -.22, 0], .003, thread, 4);
      for (const sign of [-1, 1]) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -.15, .008, sign * .075, -.19, 0, sign * .067, -.112, 0, sign * .046, -.15, .023], 3));
        geo.setIndex(sign > 0 ? [0, 1, 3, 0, 3, 2, 1, 2, 3] : [0, 3, 1, 0, 2, 3, 1, 3, 2]);
        s.add(geo, fabric, colors[(i + 2) % 4]);
      }
      s.sphere([0, -.15, .008], [.012, .017, .009], gold, 6, 4); s.finish();
    }
    return group;
  };

  I.ACTSCENE.camp_pot = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'camp_pot';
    const b = workshop(THREE, kit, group);
    const stone = b.mat('#C8BDD1', { roughness: .94 }, 'stone');
    const ivory = b.mat('#E4D9C8', { roughness: .94 }, 'stone');
    const wood = b.mat('#97755D', { roughness: .95 }, 'wood');
    const cut = b.mat('#CDA67E', { roughness: .9 }, 'wood');
    const iron = b.mat('#414A5A', { roughness: .69, metalness: .38 }, 'metal');
    const gold = b.mat('#C6AA78', { roughness: .5, metalness: .55 }, 'metal');
    const soup = b.mat('#D5B471', { roughness: .45 });
    const firepit = new THREE.Group(); firepit.name = 'firepit'; group.add(firepit);
    const f = workshop(THREE, kit, firepit);
    for (let i = 0; i < 10; i++) {
      const a = i * PI / 5, geo = new THREE.SphereGeometry(1, 7, 4);
      geo.scale(.065, .045 + (i % 3) * .005, .055); geo.rotateY(-a);
      f.put(geo, i % 3 ? ivory : stone, [Math.cos(a) * .245, .045 + (i % 3) * .005, Math.sin(a) * .245]);
    }
    for (const angle of [-.5, .65]) {
      const a = [-Math.cos(angle) * .19, .06, -Math.sin(angle) * .19], c = [Math.cos(angle) * .19, .06, Math.sin(angle) * .19];
      f.rod(a, c, .034, wood, 7);
      const d = new THREE.Vector3(...c).sub(new THREE.Vector3(...a)).normalize().multiplyScalar(.003);
      f.rod(c, new THREE.Vector3(...c).add(d).toArray(), .027, cut, 7);
    }
    f.finish();
    for (let i = 0; i < 3; i++) {
      const a = PI / 6 + i * PI * 2 / 3;
      const foot = [Math.cos(a) * .35, .025, Math.sin(a) * .35];
      b.rod(foot, [Math.cos(a) * .025, .98, Math.sin(a) * .025], .016, iron);
      b.cylinder([foot[0], .012, foot[2]], .026, .029, .024, iron, 8);
    }
    b.cylinder([0, .987, 0], .034, .037, .026, gold, 10);
    for (let i = 0; i < 4; i++) b.put(new THREE.TorusGeometry(.016, .004, 4, 8), iron, [0, .95 - i * .026, 0], [0, i % 2 * PI / 2, 0]);
    // Closed pot shell includes the inner wall; the open lip and recessed soup remain visible.
    b.lathe([0, .47, 0], [[0, 0], [.085, 0], [.133, .025], [.158, .083], [.157, .17], [.16, .18], [.16, .192], [.142, .192], [.141, .17], [.14, .085], [.118, .044], [.077, .021], [0, .021]], iron, 20);
    b.cylinder([0, .63, 0], .14, .14, .006, soup, 20);
    for (const x of [-.16, .16]) b.put(new THREE.TorusGeometry(.026, .008, 4, 10), iron, [x, .635, 0], [0, PI / 2, 0]);
    const handle = [];
    for (let i = 0; i <= 12; i++) { const a = i * PI / 12; handle.push([Math.cos(a) * .162, .65 + Math.sin(a) * .195, 0]); }
    b.tube(handle, .009, iron, 12, 5); b.finish();
    const flame = new THREE.Group(); flame.name = 'flame'; flame.position.y = .09; group.add(flame);
    const fb = workshop(THREE, kit, flame);
    const fire = fb.mat('#ffffff', { vertexColors: true, roughness: 1, emissive: '#E97839', emissiveIntensity: .18 });
    for (const [x, z, h, r, c] of [[-.07, 0, .17, .049, '#E67F60'], [.065, .025, .20, .047, '#F09B54'], [0, -.02, .25, .057, '#F5B75E'], [0, .045, .14, .037, '#FFD18A']]) {
      fb.put(new THREE.ConeGeometry(r, h, 5), fire, [x, h / 2, z], [0, x * 2, -.12], c);
    }
    fb.finish();
    const steam = new THREE.Group(); steam.name = 'steam'; steam.position.set(.025, .69, .025); group.add(steam);
    const sb = workshop(THREE, kit, steam);
    const vapor = sb.mat('#FFFBF3', { transparent: true, opacity: .5, depthWrite: false, roughness: 1 });
    sb.sphere([0, .015, 0], [.025, .032, .023], vapor, 8, 5);
    sb.sphere([.025, .076, -.006], [.032, .04, .028], vapor, 8, 5);
    sb.sphere([-.012, .144, .005], [.041, .049, .033], vapor, 8, 5);
    sb.finish(); return group;
  };

  I.ACTSCENE.blanket = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'blanket';
    const b = workshop(THREE, kit, group);
    const fabric = b.mat('#ffffff', { roughness: .98, vertexColors: true });
    const wicker = b.mat('#CDA67E', { roughness: .8 }, 'wood');
    const reed = b.mat('#DAB995', { roughness: .8 }, 'wood');
    const gold = b.mat('#E8C48B', { roughness: .4, metalness: .65 }, 'metal');
    b.add(cloth(THREE, 1.4, 1, 14, 10, (x, z) => .01 + .04 * Math.pow(Math.abs(x) / .7, 8) * Math.pow(Math.abs(z) / .5, 8), .01, ['#F1F1E9', '#C5DEEB', '#9ABFD7']), fabric);
    basket(THREE, b, [.30, .011, .085], 1.12, wicker, reed, gold);
    return b.finish();
  };
})(typeof window !== 'undefined' ? window : globalThis);
