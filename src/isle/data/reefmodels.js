/* 潮汐小島 · v9.0 潛水的海床裝飾模型（程式化，Codex 製作）：TA.ISLE.REEFMODELS[key] = (THREE, kit) => THREE.Group。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.REEFMODELS = I.REEFMODELS || {};
  const PI = Math.PI, TAU = PI * 2;

  function workshop(THREE, kit, name, soft = false) {
    const group = new THREE.Group(), bins = new Map(); group.name = name; group.userData.anim = soft ? 'sway' : 'still';
    const paint = kit.mat('#ffffff', { roughness: .88, vertexColors: true });
    let leaf;
    function add(geo, color, material = paint) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const old = geo; geo = old.toNonIndexed(); old.dispose(); }
      if (material.vertexColors) {
        const c = new THREE.Color(color), values = new Float32Array(geo.attributes.position.count * 3);
        for (let i = 0; i < values.length; i += 3) values.set([c.r, c.g, c.b], i);
        geo.setAttribute('color', new THREE.BufferAttribute(values, 3));
      }
      if (!bins.has(material)) bins.set(material, []);
      bins.get(material).push(geo);
    }
    function ball(p, size, color, n = 10, rows = 6) {
      const geo = new THREE.SphereGeometry(1, n, rows); geo.scale(...size); geo.translate(...p); add(geo, color);
    }
    function rod(a, b, radius, color, top = radius * .65, n = 5) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
      const geo = new THREE.CylinderGeometry(top, radius, d.length(), n, 1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, color);
    }
    function tube(points, radius, color, steps = 6, sides = 4) {
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), steps, radius, sides, false), color);
    }
    function lathe(points, color, n = 16, p = [0, 0, 0]) {
      const geo = new THREE.LatheGeometry(points.map(v => new THREE.Vector2(...v)), n); geo.translate(...p); add(geo, color);
    }
    function blade(rows, color) {
      if (!leaf) leaf = kit.mat('#ffffff', { roughness: .93, vertexColors: true, side: THREE.DoubleSide });
      const positions = [], indices = [];
      rows.forEach(row => row.forEach(p => positions.push(...p)));
      for (let j = 0; j < rows.length - 1; j++) { const a = j * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices); geo.computeVertexNormals(); add(geo, color, leaf);
    }
    function finish(length) {
      for (const [material, list] of bins) {
        const geo = new THREE.BufferGeometry(), count = list.reduce((n, part) => n + part.attributes.position.count, 0);
        for (const [key, width] of [['position', 3], ['normal', 3], ['color', 3]]) {
          if (key === 'color' && !material.vertexColors) continue;
          const values = new Float32Array(count * width); let offset = 0;
          for (const part of list) {
            if (part.attributes[key]) values.set(part.attributes[key].array, offset * width);
            offset += part.attributes.position.count;
          }
          geo.setAttribute(key, new THREE.BufferAttribute(values, width));
        }
        list.forEach(part => part.dispose()); geo.computeBoundingBox(); geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, material); mesh.name = name + '-batch-' + group.children.length;
        mesh.castShadow = !material.transparent; mesh.receiveShadow = !material.transparent; group.add(mesh);
      }
      const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3());
      const scale = length / Math.max(size.x, size.y, size.z);
      group.children.forEach(mesh => { mesh.geometry.scale(scale, scale, scale); mesh.geometry.translate(0, -bounds.min.y * scale, 0); }); // 海床原點與公尺尺寸。
      group.updateMatrixWorld(true); return group;
    }
    return { group, ball, rod, tube, lathe, blade, finish };
  }

  I.REEFMODELS.coral_table = function (THREE, kit) {
    const h = workshop(THREE, kit, 'coral_table');
    h.lathe([[0, 0], [.13, 0], [.15, .055], [.08, .14], [.07, .27], [.14, .34], [.26, .36], [0, .36]], '#b79e81', 12);
    h.lathe([[0, .31], [.23, .33], [.44, .35], [.58, .38], [.60, .415], [.57, .44], [.34, .43], [0, .41]], '#c5aa8c', 28);
    for (let j = 0; j < 28; j++) {
      const a = j / 28 * TAU, x = Math.cos(a), z = Math.sin(a);
      h.rod([x * .12, .33, z * .12], [x * .56, .395, z * .56], .013, '#d5bea0', .009, 4);
      h.rod([x * .57, .40, z * .57], [x * .59, .455, z * .59], .012, '#eed8b7', .007, 5);
    }
    for (let j = 0; j < 38; j++) {
      const a = j * 2.4, r = .51 * Math.sqrt((j + .5) / 38);
      h.rod([r * Math.cos(a), .43, r * Math.sin(a)], [r * Math.cos(a), .47 + (j % 3) * .009, r * Math.sin(a)], .012, '#e3c9a8', .009, 5);
    }
    return h.finish(1.2);
  };

  I.REEFMODELS.coral_branch = function (THREE, kit) {
    const h = workshop(THREE, kit, 'coral_branch');
    h.ball([0, .04, 0], [.18, .04, .16], '#a88ca4');
    for (let j = 0; j < 9; j++) {
      const a = j / 9 * TAU, p = (r, y, d = 0) => [Math.cos(a + d) * r, y, Math.sin(a + d) * r];
      h.rod(p(.035, .035), p(.17, .31), .038, '#be8eaf', .024, 6);
      h.rod(p(.17, .31), p(.27, .56 + (j % 3) * .06), .024, '#d2a4c5', .012, 6);
      h.ball(p(.27, .56 + (j % 3) * .06), [.016, .02, .016], '#ecd0dc', 6, 3);
      for (let k = 0; k < 3; k++) {
        const end = p(.29 + k * .025, .30 + k * .11, .38);
        h.rod(p(.12 + k * .04, .22 + k * .09), end, .019, '#c69abd', .01, 5);
        h.rod(end, [end[0] * 1.05, end[1] + .055, end[2] * 1.05], .01, '#e9c6d7', .006, 5);
      }
    }
    return h.finish(.8);
  };

  I.REEFMODELS.coral_round = function (THREE, kit) {
    const h = workshop(THREE, kit, 'coral_round');
    h.lathe([[0, 0], [.25, 0], [.30, .06], [.30, .15], [.26, .25], [.16, .32], [0, .35]], '#b7aa7c', 20);
    for (let j = 0; j < 48; j++) {
      const a = j * 2.4, t = Math.acos(.08 + .89 * (j + .5) / 48), r = Math.sin(t) * .295;
      h.ball([r * Math.cos(a), .035 + .31 * Math.cos(t), r * Math.sin(a)], [.026, .025, .026], j % 3 ? '#caba88' : '#9f9c72', 6, 3);
    }
    return h.finish(.6);
  };

  function rock(THREE, kit, small) {
    const h = workshop(THREE, kit, small ? 'rock_b' : 'rock_a');
    h.lathe([[0, 0], [.36, 0], [.47, .055], [.50, .18], [.43, .34], [.27, .45], [.09, .48], [0, .46]], small ? '#a7aaa4' : '#979f9b', 11);
    h.ball([-.24, .17, .12], [.25, .17, .25], '#b1b5a7', 8, 5);
    h.ball([.28, .14, -.10], [.22, .14, .23], '#89958e', 8, 5);
    for (let j = 0; j < (small ? 3 : 5); j++) {
      const a = j * 2.4, x = Math.cos(a) * .21, z = Math.sin(a) * .16, y = .405 - (j % 2) * .06;
      h.ball([x, y, z], [.09, .08, .085], j % 2 ? '#b9a48d' : '#b6ad94', 8, 5);
      for (let k = 0; k < 3; k++) h.ball([x + (k - 1) * .033, y + .071, z], [.017, .015, .017], '#d0c0a0', 5, 3);
    }
    return h.finish(small ? .7 : 1);
  }
  I.REEFMODELS.rock_a = function (THREE, kit) { return rock(THREE, kit, false); };
  I.REEFMODELS.rock_b = function (THREE, kit) { return rock(THREE, kit, true); };

  I.REEFMODELS.seagrass_patch = function (THREE, kit) {
    const h = workshop(THREE, kit, 'seagrass_patch', true);
    for (let j = 0; j < 40; j++) {
      const a = j * 2.4, r = .43 * Math.sqrt((j + .5) / 40), x = Math.cos(a) * r, z = Math.sin(a) * r;
      const height = .28 + (j % 7) * .037, rows = [];
      for (let k = 0; k <= 7; k++) {
        const t = k / 7, bend = .16 * t * t, w = .018 * (1 - .78 * t * t), angle = a + .8;
        const xx = x + Math.cos(a) * bend, zz = z + Math.sin(a) * bend;
        rows.push([[xx - Math.cos(angle) * w, height * t, zz - Math.sin(angle) * w], [xx + Math.cos(angle) * w, height * t + .005 * Math.sin(t * PI), zz + Math.sin(angle) * w]]);
      }
      h.blade(rows, j % 2 ? '#74a678' : '#4c8861');
    }
    return h.finish(1.2);
  };

  I.REEFMODELS.sea_urchins = function (THREE, kit) {
    const h = workshop(THREE, kit, 'sea_urchins');
    for (const [x, z, scale] of [[-.14, -.08, 1], [.13, -.09, .85], [-.07, .16, .75], [.17, .14, .64]]) {
      const y = .075 * scale;
      h.ball([x, y, z], [.073 * scale, .075 * scale, .073 * scale], '#3c3d50', 8, 5);
      for (let j = 0; j < 42; j++) {
        const a = j * 2.4, cy = .02 + .97 * (j + .5) / 42, r = Math.sqrt(1 - cy * cy);
        const d = [Math.cos(a) * r, cy, Math.sin(a) * r], length = (.18 + .04 * (j % 3) / 2) * scale;
        h.rod([x + d[0] * .055 * scale, y + d[1] * .055 * scale, z + d[2] * .055 * scale],
          [x + d[0] * length, y + d[1] * length, z + d[2] * length], .006 * scale, j % 4 ? '#2d3040' : '#535064', 0, 4);
      }
    }
    return h.finish(.5);
  };

  I.REEFMODELS.anemone_bed = function (THREE, kit) {
    const h = workshop(THREE, kit, 'anemone_bed', true);
    for (let j = 0; j < 3; j++) {
      const a = j / 3 * TAU, x = Math.cos(a) * .11, z = Math.sin(a) * .11, orange = j !== 1;
      h.lathe([[0, 0], [.065, 0], [.055, .07], [.085, .12], [.092, .135], [0, .14]], orange ? '#c78968' : '#80a280', 12, [x, 0, z]);
      h.ball([x, .143, z], [.023, .006, .023], orange ? '#9a655d' : '#547e6a', 8, 3);
      for (let k = 0; k < 18; k++) {
        const b = k / 18 * TAU, r = k % 2 ? .075 : .047, height = k % 2 ? .12 : .15, xx = Math.cos(b), zz = Math.sin(b);
        h.tube([[x + xx * r, .13, z + zz * r], [x + xx * r * 1.5, .13 + height * .5, z + zz * r * 1.5],
          [x + xx * r * 1.65, .13 + height, z + zz * r * 1.65]], .009, orange ? '#e9a27c' : '#a3c59a', 4, 4);
        h.ball([x + xx * r * 1.65, .13 + height, z + zz * r * 1.65], [.011, .012, .011], orange ? '#f4c69c' : '#d0ddb3', 5, 3);
      }
    }
    return h.finish(.5);
  };
})(typeof window !== 'undefined' ? window : globalThis);
