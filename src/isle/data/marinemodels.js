/* 潮汐小島 · v9.0 潛水的海洋生物模型（程式化，Codex 製作）：TA.ISLE.MARINEMODELS[id] = (THREE, kit) => THREE.Group。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.MARINEMODELS = I.MARINEMODELS || {};
  const PI = Math.PI, TAU = PI * 2;

  function workshop(THREE, kit, name, anim) {
    const group = new THREE.Group(), bins = new Map(), materials = new Map();
    group.name = name; group.userData.anim = anim;
    function part(name, p = [0, 0, 0]) {
      const g = new THREE.Group(); g.name = name; g.position.set(...p); group.add(g); return g;
    }
    function mat(color, opts, kind) {
      const options = Object.assign({ roughness: .82, vertexColors: true }, opts);
      const key = JSON.stringify([color, options, kind]);
      if (!materials.has(key)) materials.set(key, kit.mat(color, options, kind));
      return materials.get(key);
    }
    const paint = mat('#ffffff'), shell = mat('#ffffff', { roughness: .36 }, 'ceramic');
    function add(geo, color, parent = group, material = paint) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const old = geo; geo = old.toNonIndexed(); old.dispose(); }
      if (material.vertexColors) {
        const c = new THREE.Color(color), values = new Float32Array(geo.attributes.position.count * 3);
        for (let i = 0; i < values.length; i += 3) values.set([c.r, c.g, c.b], i);
        geo.setAttribute('color', new THREE.BufferAttribute(values, 3));
      }
      if (!bins.has(parent)) bins.set(parent, new Map());
      const bucket = bins.get(parent);
      if (!bucket.has(material)) bucket.set(material, []);
      bucket.get(material).push(geo);
    }
    function ball(p, size, color, parent = group, material = paint, n = 8, rows = 5) {
      const geo = new THREE.SphereGeometry(1, n, rows); geo.scale(...size); geo.translate(...p); add(geo, color, parent, material);
    }
    function rod(a, b, radius, color, parent = group, top = radius * .65, n = 5, material = paint) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
      const geo = new THREE.CylinderGeometry(top, radius, d.length(), n, 1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, color, parent, material);
    }
    function tube(points, radius, color, parent = group, steps = 7, sides = 4, material = paint) {
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), steps, radius, sides, false), color, parent, material);
    }
    function fin(points, thickness, color, parent = group, plane = 'xz', p = [0, 0, 0], material = paint) {
      const shape = new THREE.Shape(); points.forEach((v, i) => i ? shape.lineTo(...v) : shape.moveTo(...v)); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness / 2, steps: 1, bevelEnabled: true,
        bevelThickness: thickness / 4, bevelSize: thickness / 4, bevelSegments: 1, curveSegments: 2 });
      geo.translate(0, 0, -thickness / 4);
      if (plane === 'xz') geo.rotateX(PI / 2);
      if (plane === 'zy') geo.rotateY(-PI / 2);
      geo.translate(...p); add(geo, color, parent, material);
    }
    function lathe(points, color, parent = group, n = 12, p = [0, 0, 0], material = paint) {
      const geo = new THREE.LatheGeometry(points.map(v => new THREE.Vector2(...v)), n); geo.translate(...p); add(geo, color, parent, material);
    }
    function ring(p, radius, width, color, parent = group, rotation = [-PI / 2, 0, 0], material = paint, n = 10) {
      const geo = new THREE.TorusGeometry(radius, width, 3, n);
      geo.rotateX(rotation[0]); geo.rotateY(rotation[1]); geo.rotateZ(rotation[2]); geo.translate(...p); add(geo, color, parent, material);
    }
    function surface(rows, color, parent = group, material = paint) {
      const positions = [], indices = [], cols = rows[0].length;
      rows.forEach(row => row.forEach(p => positions.push(...p)));
      for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j, b = a + cols; indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices); geo.computeVertexNormals(); add(geo, color, parent, material);
    }
    function eyes(x, y, z, r = .025, parent = group) {
      for (const s of [-1, 1]) {
        ball([s * x, y, z], [r, r * 1.1, r * .7], '#263d46', parent, shell, 6, 4);
        ball([s * x - r * .22, y + r * .35, z + r * .58], [r * .25, r * .25, r * .16], '#fff5df', parent, shell, 4, 3);
      }
    }
    function finish(length, ground = false) {
      for (const [parent, bucket] of bins) for (const [material, list] of bucket) {
        const count = list.reduce((sum, geo) => sum + geo.attributes.position.count, 0), geo = new THREE.BufferGeometry();
        for (const [key, width] of [['position', 3], ['normal', 3], ['color', 3]]) {
          if (key === 'color' && !material.vertexColors) continue;
          const values = new Float32Array(count * width); let offset = 0;
          for (const source of list) {
            if (source.attributes[key]) values.set(source.attributes[key].array, offset * width);
            offset += source.attributes.position.count;
          }
          geo.setAttribute(key, new THREE.BufferAttribute(values, width));
        }
        list.forEach(geo => geo.dispose()); geo.computeBoundingBox(); geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, material); mesh.name = (parent.name || name) + '-batch-' + parent.children.length;
        mesh.castShadow = !material.transparent; mesh.receiveShadow = !material.transparent; parent.add(mesh);
      }
      const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3());
      const scale = length / Math.max(size.x, size.y, size.z);
      group.traverse(o => { o.position.multiplyScalar(scale); if (o.isMesh) o.geometry.scale(scale, scale, scale); }); // 烘焙尺寸，保留關節。
      if (ground) {
        const bottom = new THREE.Box3().setFromObject(group).min.y;
        group.children.forEach(o => { o.position.y -= bottom; }); // 根原點留在海床。
      }
      group.updateMatrixWorld(true); return group;
    }
    return { group, part, mat, paint, shell, add, ball, rod, tube, fin, lathe, ring, surface, eyes, finish };
  }

  function turtle(THREE, kit, hawk) {
    const h = workshop(THREE, kit, hawk ? 'hawksbill' : 'green_turtle', 'paddle');
    const brown = hawk ? '#ad7943' : '#827b4c', seam = hawk ? '#75513b' : '#626246', skin = hawk ? '#be9e62' : '#9b9c67';
    h.ball([0, .025, 0], [.29, .135, .36], seam, h.group, h.shell, 16, 10);
    h.ball([0, -.065, 0], [.265, .075, .33], '#ded0a1', h.group, h.paint, 10, 5);
    const scutes = [[0, -.22], [0, -.07], [0, .09], [0, .24], [-.15, -.16], [.15, -.16], [-.17, .015], [.17, .015], [-.13, .18], [.13, .18]];
    scutes.forEach(([x, z], j) => {
      const positions = [], indices = [];
      function point(xx, zz) {
        const r = Math.sqrt((xx / .29) ** 2 + (zz / .36) ** 2);
        if (r > .97) { xx *= .97 / r; zz *= .97 / r; }
        return [xx, .029 + .135 * Math.sqrt(Math.max(0, 1 - (xx / .29) ** 2 - (zz / .36) ** 2)) + (hawk ? .003 * (j % 2) : 0), zz];
      }
      positions.push(...point(x, z));
      for (let k = 0; k < 6; k++) positions.push(...point(x + .078 * Math.cos(k * PI / 3), z + .079 * Math.sin(k * PI / 3)));
      for (let k = 0; k < 6; k++) indices.push(0, (k + 1) % 6 + 1, k + 1);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices);
      h.add(geo, j % 3 === 0 ? (hawk ? '#ce9b50' : '#a29a60') : brown, h.group, h.shell); // 甲片貼合背甲弧度。
    });
    h.ball([0, -.005, .36], [.085, .07, .13], skin);
    h.fin([[-.055, .42], [0, hawk ? .565 : .51], [.055, .42]], .065, skin, h.group, 'xz', [0, -.005, 0]);
    h.eyes(.063, .025, .433, .017);
    for (const s of [-1, 1]) {
      const fin = h.part(s > 0 ? 'finL' : 'finR', [s * .225, -.055, .16]);
      h.fin([[0, .02], [s * .16, .055], [s * .29, -.23], [s * .23, -.28], [s * .07, -.18]], .027, skin, fin);
      h.fin([[s * .18, -.24], [s * .32, -.31], [s * .28, -.43], [s * .15, -.35]], .025, skin);
      h.ball([s * .049, .04, .4], [.025, .013, .033], brown, h.group, h.paint, 6, 3);
    }
    h.rod([0, -.04, -.32], [0, -.05, -.44], .027, skin, h.group, 0);
    return h.finish(hawk ? .8 : .9);
  }
  I.MARINEMODELS.green_turtle = function (THREE, kit) { return turtle(THREE, kit, false); };
  I.MARINEMODELS.hawksbill = function (THREE, kit) { return turtle(THREE, kit, true); };

  function bivalve(THREE, kit, scallop) {
    const h = workshop(THREE, kit, scallop ? 'scallop' : 'giant_clam', 'clam');
    const lid = h.part('lid', [0, .13, -.28]), n = scallop ? 20 : 24;
    function valve(parent, upper) {
      const rows = [];
      for (let j = 0; j <= 4; j++) {
        const r = j / 4, row = [];
        for (let k = 0; k <= n; k++) {
          const a = scallop ? -1.2 + k / n * 2.4 : k / n * TAU;
          const wave = scallop ? .014 * Math.cos(a * 16) : .04 * Math.cos(a * 6);
          const x = scallop ? Math.sin(a) * r * (.40 + wave) : Math.cos(a) * r * (.39 + wave);
          const z = scallop ? Math.cos(a) * r * (.60 + wave) : .28 + Math.sin(a) * r * (.29 + wave);
          const bulge = scallop ? Math.sin(r * PI) : 1 - r * r;
          const y = (upper ? .14 : -.10) * bulge + (upper ? .065 : 0) * r + (scallop ? 0 : wave * r);
          row.push([x, y, z]);
        }
        rows.push(row);
      }
      const top = scallop ? rows : rows.slice().reverse();
      h.surface(upper ? top : top.slice().reverse(), upper ? '#e6c49d' : '#bca381', parent, h.shell);
      const inner = rows.map(row => row.map(([x, y, z]) => [x * .985, y + (upper ? -.014 : .014), .28 + (z - .28) * .985]));
      const lining = scallop ? inner : inner.slice().reverse();
      h.surface(upper ? lining.slice().reverse() : lining, '#f4dbb5', parent, h.shell);
      for (let k = 0; k < (scallop ? 12 : 8); k++) {
        const a = scallop ? -1.2 + k / 11 * 2.4 : k / 8 * TAU;
        h.tube([.25, .6, .94].map(r => [scallop ? Math.sin(a) * r * .40 : Math.cos(a) * r * .39,
          (upper ? .14 : -.10) * (scallop ? Math.sin(r * PI) : 1 - r * r) + (upper ? .065 * r + .008 : -.009),
          scallop ? Math.cos(a) * r * .60 : .28 + Math.sin(a) * r * .29]), .009, '#c8a37b', parent, 3, 3, h.shell);
      }
    }
    valve(lid, true);
    const bottom = h.part('lower-valve', [0, .13, -.28]); valve(bottom, false);
    lid.rotation.x = -.28;
    if (scallop) {
      const rows = [];
      for (let j = 0; j <= 3; j++) rows.push(Array.from({ length: 21 }, (_, k) => {
        const a = -1.2 + k / 20 * 2.4, r = j / 3;
        return [Math.sin(a) * r * .37, .15 + .025 * Math.sin(r * PI), -.28 + Math.cos(a) * r * .57];
      }));
      h.surface(rows, '#d98259', h.group, h.shell);
    } else h.ball([0, .15, .015], [.36, .045, .265], '#32b5b0', h.group, h.shell, 12, 5);
    for (let k = 0; k < (scallop ? 16 : 12); k++) {
      const a = TAU * k / (scallop ? 16 : 12);
      if (scallop) {
        const angle = -1.18 + k / 15 * 2.36;
        h.ball([Math.sin(angle) * .38, .17, -.28 + Math.cos(angle) * .58], [.012, .013, .012], '#4cb5df', h.group, h.shell, 5, 3);
      }
      else h.ring([Math.cos(a) * .29, .188, .015 + Math.sin(a) * .20], .015, .005, '#2b598f', h.group, [-PI / 2, 0, 0], h.shell, 6);
    }
    if (scallop) for (const s of [-1, 1]) h.fin([[s * .1, -.21], [s * .25, -.29], [s * .25, -.14]], .03, '#d6b088', h.group, 'xz', [0, .13, 0], h.shell);
    return h.finish(scallop ? .15 : .6, true);
  }
  I.MARINEMODELS.giant_clam = function (THREE, kit) { return bivalve(THREE, kit, false); };
  I.MARINEMODELS.scallop = function (THREE, kit) { return bivalve(THREE, kit, true); };

  I.MARINEMODELS.abalone = function (THREE, kit) {
    const h = workshop(THREE, kit, 'abalone', 'still');
    h.ball([0, .055, 0], [.28, .055, .42], '#b6aa8b', h.group, h.paint, 12, 5);
    h.ball([-.025, .10, -.025], [.30, .10, .40], '#9a8870', h.group, h.shell, 12, 6);
    for (let j = 0; j < 3; j++) {
      const points = [];
      for (let k = 0; k <= 14; k++) { const a = TAU * k / 14; points.push([-.025 + (.11 + j * .055) * Math.cos(a), .19 - j * .022, -.055 + (.16 + j * .08) * Math.sin(a)]); }
      h.tube(points, .009, j % 2 ? '#a6a78d' : '#c2af8e', h.group, 14, 3, h.shell);
    }
    for (let j = 0; j < 5; j++) {
      const z = -.23 + j * .10, x = -.20 + .035 * Math.abs(j - 2);
      const y = .10 + .10 * Math.sqrt(Math.max(0, 1 - ((x + .025) / .30) ** 2 - ((z + .025) / .40) ** 2));
      h.ring([x, y + .007, z], .019, .008, '#d6c5a1', h.group, [-PI / 2, 0, 0], h.shell, 7);
      h.ball([x, y + .003, z], [.016, .006, .016], '#405c60', h.group, h.paint, 6, 3);
    }
    return h.finish(.2, true);
  };

  function crustacean(THREE, kit, type) {
    const lobster = type === 'spiny_lobster', mantis = type === 'mantis_shrimp', cleaner = type === 'cleaner_shrimp';
    const h = workshop(THREE, kit, type, 'crawl'), body = lobster ? '#358c8e' : mantis ? '#66a653' : '#dc725b';
    const stripe = cleaner ? '#fff0d4' : lobster ? '#e9ca6c' : '#e5aa69';
    h.ball([0, .015, .09], [.12, .105, .23], body, h.group, h.shell, 10, 5);
    for (let j = 0; j < 5; j++) {
      h.ball([0, -.008 - j * .012, -.11 - j * .065], [.105 - j * .01, .085 - j * .008, .052], j % 2 ? stripe : body, h.group, h.shell, 8, 4);
    }
    for (const s of [-1, 1]) {
      h.fin([[0, -.37], [s * .15, -.44], [s * .11, -.50], [0, -.45]], .018, body);
      h.rod([s * .07, .06, .24], [s * .095, .16, .29], .018, body);
      h.ball([s * .095, .17, .29], mantis ? [.05, .025, .027] : [.024, .025, .022], mantis ? '#4eafb0' : '#293c40', h.group, h.shell, 7, 4);
      if (mantis) h.rod([s * .13, .17, .308], [s * .055, .17, .308], .007, '#273c48', h.group, .007, 4);
      h.tube([[s * .055, .06, .29], [s * .14, .14, .46], [s * .28, .16, lobster || cleaner ? .92 : .53]], lobster ? .009 : .005, cleaner ? '#fff5e2' : stripe, h.group, 5, 3);
      for (let j = 0; j < (mantis ? 3 : 5); j++) {
        const leg = h.part('leg' + ((s > 0 ? 0 : (mantis ? 3 : 5)) + j), [s * .085, -.05, .20 - j * .072]);
        h.rod([0, 0, 0], [s * .105, -.07, -.04], .013, body, leg, .009, 4);
        h.rod([s * .105, -.07, -.04], [s * .16, -.15, .005], .009, stripe, leg, .003, 4);
      }
      if (mantis) {
        h.rod([s * .08, -.04, .2], [s * .14, -.10, .37], .03, '#dc6e41');
        h.ball([s * .14, -.06, .37], [.045, .047, .07], '#df6849', h.group, h.shell, 7, 4);
      }
      if (lobster) for (let j = 0; j < 4; j++) h.rod([s * .1, .07, .21 - j * .10], [s * .16, .15, .25 - j * .10], .019, stripe, h.group, 0, 4);
    }
    if (cleaner) h.tube([[0, .072, -.32], [0, .10, -.10], [0, .122, .14], [0, .084, .31]], .014, '#fff4dd', h.group, 8, 4);
    if (!lobster && !mantis && !cleaner) {
      h.rod([.09, -.02, .2], [.19, -.015, .36], .035, body);
      h.ball([.19, -.01, .40], [.09, .07, .12], '#e58a63', h.group, h.shell, 8, 5);
      h.fin([[.13, .44], [.12, .57], [.19, .51], [.24, .55], [.27, .43]], .055, '#edac77');
      h.rod([-.09, -.02, .2], [-.15, -.025, .40], .017, stripe);
    }
    return h.finish(lobster ? .4 : mantis ? .25 : cleaner ? .14 : .12);
  }
  for (const id of ['spiny_lobster', 'mantis_shrimp', 'pistol_shrimp', 'cleaner_shrimp']) I.MARINEMODELS[id] = function (THREE, kit) { return crustacean(THREE, kit, id); };

  function cephalopod(THREE, kit, type) {
    const octopus = type === 'blue_ring_octopus', squid = type === 'bigfin_squid';
    const h = workshop(THREE, kit, type, 'arms'), body = octopus ? '#dcb866' : squid ? '#dccac0' : '#bda88c';
    const skin = squid ? h.mat('#ffffff', { roughness: .4, transparent: true, opacity: .70, depthWrite: false, side: THREE.DoubleSide }) : h.paint;
    h.ball([0, .015, -.09], octopus ? [.19, .18, .23] : [.19, .12, .32], body, h.group, skin, 12, octopus ? 8 : 7);
    h.ball([0, -.01, .19], [.16, .105, .12], body, h.group, h.paint, 10, 5);
    if (!octopus) for (const s of [-1, 1]) {
      const rows = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16, z = -.39 + t * .60, width = Math.sin(t * PI);
        rows.push([[s * (.075 + width * .095), .005, z], [s * (.08 + width * (squid ? .23 : .17)), .018 * Math.sin(t * PI * 8), z]]);
      }
      h.surface(rows, squid ? '#edd9cd' : '#d3bc9b', h.group, squid ? skin : h.mat('#ffffff', { side: THREE.DoubleSide }));
    }
    for (const s of [-1, 1]) {
      h.ball([s * .145, .055, .21], [.06, .055, .038], '#e6d29e', h.group, h.shell, 8, 4);
      if (type === 'cuttlefish') h.tube([[s * .185, .063, .243], [s * .168, .04, .25], [s * .15, .067, .25], [s * .13, .043, .25], [s * .109, .062, .243]], .007, '#303d41', h.group, 6, 3);
      else h.ball([s * .151, .056, .243], [.026, .033, .009], '#273b45', h.group, h.shell, 6, 4);
    }
    for (let j = 0; j < (squid ? 10 : 8); j++) {
      const a = j / 8 * TAU, tentacle = j >= 8, x = Math.cos(a) * .10, y = Math.sin(a) * .065 - .03;
      const arm = h.part('arm' + j, [x, y, .23]);
      const end = tentacle ? .60 : octopus ? .31 : .22, spread = Math.cos(a) * (octopus ? .19 : .08);
      h.tube([[0, 0, 0], [spread * .5, -.025, end * .4], [spread, -.04, end * .83], [spread * .8, .005, end]], tentacle ? .012 : .027, body, arm, 6, 4);
      if (tentacle) h.ball([spread * .8, .005, end], [.032, .018, .065], '#bf9b83', arm, h.paint, 6, 4);
      else for (let k = 1; k < 4; k++) h.ball([spread * k / 4, -.052, end * k / 4], [.012, .009, .015], '#efdab1', arm, h.paint, 4, 3);
      if (octopus) h.ring([spread * .6, -.009, end * .55], .024, .007, '#227fce', arm, [-PI / 2, 0, 0], h.shell, 6);
    }
    if (octopus) for (let j = 0; j < 8; j++) {
      const a = j / 8 * TAU, x = .135 * Math.cos(a), z = -.09 + .17 * Math.sin(a);
      const geo = new THREE.TorusGeometry(.028, .006, 3, 6); geo.rotateX(-PI / 2);
      const positions = geo.attributes.position;
      for (let k = 0; k < positions.count; k++) {
        const xx = x + positions.getX(k), zz = z + positions.getZ(k);
        const y = .022 + .18 * Math.sqrt(Math.max(.015, 1 - (xx / .19) ** 2 - ((zz + .09) / .23) ** 2));
        positions.setXYZ(k, xx, y + positions.getY(k), zz);
      }
      geo.computeVertexNormals(); h.add(geo, '#247bd1', h.group, h.shell); // 藍環沿外套膜貼合。
    }
    return h.finish(octopus ? .2 : .35);
  }
  for (const id of ['cuttlefish', 'bigfin_squid', 'blue_ring_octopus']) I.MARINEMODELS[id] = function (THREE, kit) { return cephalopod(THREE, kit, id); };

  I.MARINEMODELS.seahorse = function (THREE, kit) {
    const h = workshop(THREE, kit, 'seahorse', 'swim');
    h.ball([0, -.015, 0], [.085, .17, .09], '#dba957', h.group, h.paint, 8, 6);
    h.tube([[0, .09, 0], [0, .20, -.04], [0, .28, .015], [0, .28, .08]], .052, '#e7b964', h.group, 7, 6);
    h.rod([0, .275, .06], [0, .25, .23], .031, '#e8bf72', h.group, .023, 8);
    h.eyes(.043, .30, .07, .015);
    for (let j = 0; j < 5; j++) h.rod([0, -.1 + j * .075, -.06], [0, -.09 + j * .075, -.12], .022, '#bc8e47', h.group, 0, 4);
    h.fin([[-.06, -.06], [-.15, -.015], [-.15, .075], [-.06, .05]], .009, '#edce8e', h.group, 'zy');
    const tail = h.part('tail', [0, -.145, 0]);
    h.tube([[0, 0, 0], [0, -.14, -.04], [0, -.23, .01], [0, -.21, .115], [0, -.14, .12], [0, -.145, .065]], .026, '#dca74e', tail, 12, 5);
    for (let j = 0; j < 4; j++) h.ball([0, -.085 + j * .05, .082], [.074, .012, .014], '#efcb80', h.group, h.paint, 6, 3);
    return h.finish(.18);
  };

  function jelly(THREE, kit, type) {
    const moon = type === 'moon_jelly', comb = type === 'comb_jelly';
    const h = workshop(THREE, kit, type, 'pulse'), bell = h.part('bell');
    const glass = h.mat('#ffffff', { transparent: true, opacity: comb ? .24 : .48, depthWrite: false, roughness: .28, side: THREE.DoubleSide });
    if (moon) {
      h.lathe([[0, .14], [.16, .125], [.31, .07], [.40, -.035], [.40, -.055], [.31, .045], [.16, .10], [0, .115]], '#c8e5eb', bell, 20, [0, 0, 0], glass);
      for (let j = 0; j < 4; j++) {
        const a = j * PI / 2, points = [];
        for (let k = 0; k <= 8; k++) { const t = .35 + k / 8 * (TAU - .7); points.push([Math.cos(a) * .12 + Math.cos(t) * .057, -.015, Math.sin(a) * .12 + Math.sin(t) * .057]); }
        h.tube(points, .012, '#d59ec5', bell, 8, 3);
      }
    } else if (comb) {
      h.ball([0, 0, 0], [.24, .39, .24], '#d7edf0', bell, glass, 16, 8);
      const colors = ['#e7abbc', '#efcf8c', '#b4d6ae', '#99d4db', '#a7b6e1', '#c7a9d7'];
      for (let j = 0; j < 8; j++) for (let k = 0; k < 6; k++) {
        const a = j * PI / 4, t = .28 + k * .48, r = .244 * Math.sin(t);
        h.tube([t, t + .22, t + .44].map(b => [.244 * Math.sin(b) * Math.cos(a), .393 * Math.cos(b), .244 * Math.sin(b) * Math.sin(a)]), .004, colors[k], bell, 3, 3);
        h.rod([r * Math.cos(a) - .009 * Math.sin(a), .393 * Math.cos(t), r * Math.sin(a) + .009 * Math.cos(a)],
          [r * Math.cos(a) + .009 * Math.sin(a), .393 * Math.cos(t) + .012, r * Math.sin(a) - .009 * Math.cos(a)], .006, colors[k], bell, .006, 3);
      }
    } else {
      h.ball([0, 0, 0], [.13, .115, .36], '#90b2e0', bell, glass, 12, 6);
      h.fin([[-.31, .04], [-.23, .17], [-.08, .21], [.12, .18], [.28, .06]], .018, '#a494d3', bell, 'zy', [0, 0, 0], glass);
      h.tube([[0, .04, -.31], [0, .17, -.15], [0, .18, .08], [0, .06, .28]], .009, '#d7b3df', bell, 7, 4);
    }
    if (!comb) {
      const tentacles = h.part('tentacles', [0, moon ? -.045 : -.08, 0]);
      const count = moon ? 20 : 9;
      for (let j = 0; j < count; j++) {
        const a = j / count * TAU, x = Math.cos(a) * (moon ? .35 : .07), z = Math.sin(a) * (moon ? .35 : .25), depth = moon ? .12 + .03 * (j % 3) : .42 + .14 * (j % 3);
        h.tube([[x, 0, z], [x + .018, -depth * .45, z], [x - .014, -depth, z + .035]], moon ? .006 : .009, moon ? '#d9c9df' : '#5c72b7', tentacles, moon ? 3 : 7, 3);
      }
    }
    return h.finish(moon ? .3 : comb ? .15 : .3);
  }
  for (const id of ['moon_jelly', 'comb_jelly', 'man_o_war']) I.MARINEMODELS[id] = function (THREE, kit) { return jelly(THREE, kit, id); };

  I.MARINEMODELS.sea_snake = function (THREE, kit) {
    const h = workshop(THREE, kit, 'sea_snake', 'swim'), tail = h.part('tail', [0, 0, -.015]);
    for (let j = 0; j < 18; j++) {
      const z = .45 - j * .052, parent = j < 9 ? h.group : tail, dz = parent === tail ? .015 : 0;
      const point = zz => [Math.sin(zz * 8) * .045, 0, zz + dz];
      h.rod(point(z), point(z - .054), .032 - Math.max(0, j - 12) * .003, Math.floor(j / 2) % 2 ? '#33434d' : '#97b6bd', parent, .032 - Math.max(0, j - 11) * .003, 8);
    }
    h.ball([Math.sin(.45 * 8) * .045, 0, .48], [.042, .033, .065], '#adbdac', h.group, h.paint, 8, 5);
    h.eyes(.029, .018, .514, .008);
    h.fin([[-.475, .018], [-.54, .075], [-.60, .035], [-.59, -.035], [-.50, -.06]], .013, '#556e7c', tail, 'zy');
    return h.finish(1);
  };

  I.MARINEMODELS.sea_pen = function (THREE, kit) {
    const h = workshop(THREE, kit, 'sea_pen', 'sway');
    h.rod([0, 0, 0], [0, .82, 0], .029, '#d98957', h.group, .011, 7);
    for (let j = 0; j < 10; j++) for (const s of [-1, 1]) {
      const y = .22 + j * .055, w = .22 * Math.sin((j + 1) / 12 * PI);
      h.tube([[0, y, 0], [s * w * .6, y + .04, 0], [s * w, y + .075, .012]], .017, j % 2 ? '#edb378' : '#e89b62', h.group, 3, 4);
      for (let k = 1; k < 4; k++) h.rod([s * w * k / 4, y + k * .016, 0], [s * w * k / 4, y + k * .016 + .037, .012], .007, '#f4c598', h.group, .004, 3);
    }
    return h.finish(.3, true);
  };

  I.MARINEMODELS.feather_star = function (THREE, kit) {
    const h = workshop(THREE, kit, 'feather_star', 'arms');
    h.ball([0, 0, 0], [.065, .045, .065], '#a77040', h.group, h.paint, 8, 5);
    for (let j = 0; j < 10; j++) {
      const a = j / 10 * TAU, arm = h.part('arm' + j);
      const p = (r, side = 0) => [Math.cos(a) * r - Math.sin(a) * side, .08 * Math.sin(r * 5), Math.sin(a) * r + Math.cos(a) * side];
      h.tube([p(.02), p(.18), p(.35), p(.44)], .012, j % 2 ? '#dbad55' : '#cd8b44', arm, 5, 4);
      for (let k = 1; k <= 5; k++) for (const s of [-1, 1]) h.rod(p(k * .071), p(k * .071 + .025, s * .042), .005, k % 3 ? '#e8bd68' : '#484643', arm, .002, 3);
    }
    return h.finish(.3);
  };

  I.MARINEMODELS.crown_of_thorns = function (THREE, kit) {
    const h = workshop(THREE, kit, 'crown_of_thorns', 'still');
    h.ball([0, .06, 0], [.19, .06, .19], '#96596e', h.group, h.paint, 12, 5);
    for (let j = 0; j < 14; j++) {
      const a = j / 14 * TAU, p = (r, y, d = 0) => [Math.cos(a + d) * r, y, Math.sin(a + d) * r];
      h.rod(p(.10, .06), p(.44, .022), .065, j % 2 ? '#9f6074' : '#b57582', h.group, .012, 6);
      for (let k = 0; k < 5; k++) h.rod(p(.13 + k * .058, .09 - k * .009), p(.13 + k * .058, .18 - k * .015, .025), .013, '#dfadbb', h.group, 0, 4);
    }
    for (let j = 0; j < 10; j++) { const a = j / 10 * TAU; h.rod([Math.cos(a) * .09, .10, Math.sin(a) * .09], [Math.cos(a) * .11, .23, Math.sin(a) * .11], .014, '#d19aac', h.group, 0, 4); }
    return h.finish(.4, true);
  };

  I.MARINEMODELS.barrel_sponge = function (THREE, kit) {
    const h = workshop(THREE, kit, 'barrel_sponge', 'sway');
    const profile = [[0, 0], [.22, 0], [.30, .08], [.34, .26], [.32, .48], [.28, .62], [.23, .63], [.22, .57], [.24, .42], [.22, .20], [.14, .10], [0, .10]];
    h.lathe(profile, '#a06c5e', h.group, 18);
    h.lathe([[0, .102], [.14, .102], [.22, .20], [.24, .42], [.22, .57]], '#624d4b', h.group, 18);
    for (let j = 0; j < 16; j++) {
      const a = j / 16 * TAU;
      h.tube([[.23, .02], [.31, .15], [.342, .30], [.32, .49], [.275, .61]].map(([r, y]) => [r * Math.cos(a), y, r * Math.sin(a)]), .012, j % 3 ? '#b47d6a' : '#8e5e55', h.group, 6, 4);
    }
    return h.finish(.6, true);
  };

  I.MARINEMODELS.sea_squirt = function (THREE, kit) {
    const h = workshop(THREE, kit, 'sea_squirt', 'still');
    const skin = h.mat('#ffffff', { transparent: true, opacity: .65, depthWrite: false, roughness: .42, side: THREE.DoubleSide });
    h.ball([0, .27, 0], [.18, .27, .16], '#a29acb', h.group, skin, 10, 7);
    h.ball([0, .22, -.01], [.09, .17, .07], '#7a7da9', h.group, h.paint, 8, 5);
    for (const [x, y, z, r] of [[-.055, .54, .01, .055], [.15, .44, .035, .044]]) {
      h.lathe([[r * .9, -.055], [r, .025], [r * 1.1, .04], [r * .72, .04], [r * .65, -.04]], '#b4b8e4', h.group, 10, [x, y, z], skin);
      h.ball([x, y - .035, z], [r * .65, .008, r * .65], '#424d85', h.group, h.paint, 8, 3);
    }
    return h.finish(.12, true);
  };

  I.MARINEMODELS.christmas_tree_worm = function (THREE, kit) {
    const h = workshop(THREE, kit, 'christmas_tree_worm', 'sway');
    h.ball([0, .10, 0], [.31, .10, .24], '#a8a68b', h.group, h.paint, 10, 5);
    for (const s of [-1, 1]) {
      const x = s * .12;
      h.rod([x, .13, 0], [x, .55, 0], .016, '#e7cc94', h.group, .006, 5);
      for (let j = 0; j < 28; j++) {
        const t = j / 27, a = t * TAU * 3.5, r = .145 * (1 - t) + .012, y = .18 + t * .36;
        const color = s > 0 ? (j % 4 ? '#d8854f' : '#f2d392') : (j % 4 ? '#658fc0' : '#dbd4d9');
        h.rod([x, y, 0], [x + Math.cos(a) * r, y - .02, Math.sin(a) * r], .012 * (1 - t * .6), color, h.group, .004, 4);
        const xx = x + Math.cos(a) * r * .7, zz = Math.sin(a) * r * .7, w = .025 * (1 - t) + .004;
        h.rod([xx - Math.sin(a) * w, y - .014, zz + Math.cos(a) * w], [xx + Math.sin(a) * w, y - .014, zz - Math.cos(a) * w], .004, color, h.group, .003, 3);
      }
    }
    return h.finish(.15, true);
  };

  I.MARINEMODELS.staghorn_coral = function (THREE, kit) {
    const h = workshop(THREE, kit, 'staghorn_coral', 'sway');
    h.ball([0, .035, 0], [.18, .035, .16], '#b9a487');
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * TAU, p = (r, y, d = 0) => [r * Math.cos(a + d), y, r * Math.sin(a + d)];
      h.rod(p(.05, .025), p(.16, .34), .038, '#c4ad89', h.group, .026, 6);
      h.rod(p(.16, .34), p(.26, .62), .026, '#d5c19e', h.group, .014, 6);
      h.rod(p(.26, .62), p(.27, .70), .014, '#f1dfbd', h.group, .009, 6);
      for (let k = 0; k < 2; k++) {
        const mid = p(.16 + k * .06, .32 + k * .16), end = p(.32, .47 + k * .17, .40);
        h.rod(mid, end, .022, '#cdb796', h.group, .012, 6);
        h.rod(end, [end[0] * 1.035, end[1] + .06, end[2] * 1.035], .012, '#f3e2c0', h.group, .007, 6);
      }
    }
    return h.finish(.6, true);
  };

  I.MARINEMODELS.brain_coral = function (THREE, kit) {
    const h = workshop(THREE, kit, 'brain_coral', 'still');
    h.lathe([[0, 0], [.43, 0], [.425, .10], [.36, .24], [.23, .36], [0, .40]], '#758363', h.group, 20);
    for (let j = 0; j < 11; j++) {
      const points = [], z0 = -.36 + j * .072;
      const width = Math.sqrt(Math.max(0, .40 ** 2 - z0 ** 2));
      for (let k = 0; k <= 16; k++) {
        const x = -width + 2 * width * k / 16, z = z0 + .022 * Math.sin(k * 1.5 + j * 2);
        points.push([x, .045 + .36 * Math.sqrt(Math.max(.015, 1 - (x * x + z * z) / .43 ** 2)), z]);
      }
      h.tube(points, .015, j % 2 ? '#b4bb7c' : '#a4ab70', h.group, 18, 4);
    }
    return h.finish(.5, true);
  };

  I.MARINEMODELS.soft_coral = function (THREE, kit) {
    const h = workshop(THREE, kit, 'soft_coral', 'sway');
    h.ball([0, .10, 0], [.20, .10, .17], '#b98ba9');
    h.rod([0, .05, 0], [0, .33, 0], .10, '#c89bb9', h.group, .085, 8);
    for (let j = 0; j < 9; j++) {
      const a = j / 9 * TAU, x = Math.cos(a) * .22, z = Math.sin(a) * .18, y = .40 + .10 * (j % 3);
      h.tube([[0, .20, 0], [x * .7, .31, z * .7], [x, y, z]], .048, j % 2 ? '#d8aeca' : '#cba1c4', h.group, 5, 6);
      h.ball([x, y, z], [.048, .052, .048], '#dfbed6', h.group, h.paint, 7, 4);
      for (let k = 0; k < 3; k++) h.ball([x + (k - 1) * .021, y + .043, z], [.007, .01, .008], '#f2d6df', h.group, h.paint, 4, 3);
    }
    return h.finish(.5, true);
  };

  I.MARINEMODELS.sea_fan = function (THREE, kit) {
    const h = workshop(THREE, kit, 'sea_fan', 'sway');
    h.rod([0, 0, 0], [0, .30, 0], .025, '#a76957', h.group, .017, 6);
    const point = (a, t) => [Math.sin(a) * .43 * t, .16 + Math.cos(a) * .60 * t, .008 * Math.sin(a * 4 + t * 5)];
    for (let j = 0; j <= 14; j++) {
      const a = -1.25 + j * 2.5 / 14;
      h.tube([point(a, 0), point(a, .35), point(a, .7), point(a, 1)], .009, j % 3 ? '#cf8064' : '#e39e78', h.group, 5, 4);
    }
    for (let k = 2; k <= 7; k++) for (let j = 0; j < 14; j++) {
      const a = -1.25 + j * 2.5 / 14, t = k / 7;
      h.rod(point(a, t), point(a + 2.5 / 14, t - (j % 2 ? .025 : -.025)), .005, '#dc9170', h.group, .005, 4);
    }
    return h.finish(.6, true);
  };

  I.MARINEMODELS.spanish_dancer = function (THREE, kit) {
    const h = workshop(THREE, kit, 'spanish_dancer', 'swim'), tail = h.part('tail', [0, 0, -.14]);
    h.ball([0, 0, .05], [.16, .075, .31], '#b44c50', h.group, h.paint, 10, 6);
    function frill(parent, start, end, offset) {
      const rows = [[], [], []];
      for (let j = 0; j <= 40; j++) {
        const a = start + (end - start) * j / 40, r = 1 + .06 * Math.sin(a * 12);
        for (let k = 0; k < 3; k++) {
          const s = .72 + k * .18;
          rows[k].push([Math.cos(a) * .22 * s * r, .015 + k * .016 * Math.sin(a * 12), .035 + Math.sin(a) * .37 * s - offset]);
        }
      }
      h.surface(rows, '#e36b63', parent, h.mat('#ffffff', { side: THREE.DoubleSide }));
    }
    frill(h.group, -.32, PI + .32, 0); frill(tail, PI + .32, TAU - .32, -.14);
    for (const s of [-1, 1]) h.rod([s * .055, .055, .26], [s * .055, .15, .28], .017, '#ed9c79', h.group, .010, 6);
    for (let j = 0; j < 6; j++) {
      const a = j * PI / 3;
      h.rod([0, .05, -.15], [Math.cos(a) * .065, .14, -.15 + Math.sin(a) * .06], .013, '#f2b298', h.group, .004, 5);
    }
    return h.finish(.3);
  };

  I.MARINEMODELS.seagrass = function (THREE, kit) {
    const h = workshop(THREE, kit, 'seagrass', 'sway'), leaf = h.mat('#ffffff', { roughness: .93, side: THREE.DoubleSide });
    for (let j = 0; j < 12; j++) {
      const a = j * 2.4, height = .40 + (j % 5) * .075, rows = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6, x = Math.cos(a) * (.025 + .16 * t * t), z = Math.sin(a) * (.025 + .16 * t * t);
        const width = .019 * (1 - .75 * t * t);
        rows.push([[x - Math.cos(a + .9) * width, t * height, z - Math.sin(a + .9) * width], [x + Math.cos(a + .9) * width, t * height + .006 * Math.sin(t * PI), z + Math.sin(a + .9) * width]]);
      }
      h.surface(rows, j % 2 ? '#74a678' : '#4e8963', h.group, leaf);
    }
    return h.finish(.5, true);
  };

  I.MARINEMODELS.nautilus = function (THREE, kit) {
    const h = workshop(THREE, kit, 'nautilus', 'swim');
    h.ball([0, .02, -.055], [.13, .26, .25], '#efe6d2', h.group, h.shell, 16, 10);
    for (const s of [-1, 1]) {
      const spiral = [];
      for (let k = 0; k <= 26; k++) {
        const a = k / 26 * TAU * 1.7, r = .012 + k / 26 * .20;
        spiral.push([s * (.131 - .025 * k / 26), .02 + Math.cos(a) * r, -.055 + Math.sin(a) * r]);
      }
      h.tube(spiral, .007, '#c7ab85', h.group, 28, 3, h.shell);
    }
    for (let j = 0; j < 12; j++) {
      const a = j / 12 * TAU, points = [];
      for (let k = 0; k <= 6; k++) {
        const t = -.9 + k / 6 * 1.8, r = Math.sqrt(1 - t * t);
        points.push([t * .131, .02 + Math.cos(a + t * .15) * .262 * r, -.055 + Math.sin(a + t * .15) * .252 * r]);
      }
      h.tube(points, .013, '#bc7c51', h.group, 7, 3, h.shell);
    }
    h.ball([0, -.04, .17], [.11, .10, .105], '#c8ad8a'); h.eyes(.094, -.035, .21, .022);
    h.ball([0, .045, .20], [.115, .048, .115], '#a67d5a', h.group, h.paint, 10, 4);
    const tail = h.part('tail', [0, -.035, .235]);
    for (let j = 0; j < 18; j++) {
      const a = j / 18 * TAU, x = Math.cos(a) * .06, y = Math.sin(a) * .05;
      h.tube([[x, y, 0], [x * 1.6, y * 1.4, .08], [x * 1.7, y * 1.2, .16 + (j % 3) * .015]], .008, j % 3 ? '#e3c7a3' : '#cba783', tail, 4, 3);
    }
    return h.finish(.2);
  };
})(typeof window !== 'undefined' ? window : globalThis);
