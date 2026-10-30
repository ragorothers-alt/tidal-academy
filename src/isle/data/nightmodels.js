/* 潮汐小島 · v9.4.0 港邊夜市：粉彩攤架、牌樓、餐桌與八種櫃台遊戲及點心。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.NIGHTMODELS = I.NIGHTMODELS || {};
  const PI = Math.PI, TAU = PI * 2;

  // 公尺；地面中心、正面 −Z。共用材質只讀，每個具名零件各自批次。
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
    function box(p, size, material, color, r = [0, 0, 0], bevel = 0) {
      const [w, h, d] = size;
      if (!bevel) { put(new THREE.BoxGeometry(w, h, d), material, p, r, color); return; }
      const v = Math.min(bevel, w / 4, h / 4, d / 4), shape = new THREE.Shape();
      shape.moveTo(-w / 2 + v, -h / 2 + v); shape.lineTo(w / 2 - v, -h / 2 + v);
      shape.lineTo(w / 2 - v, h / 2 - v); shape.lineTo(-w / 2 + v, h / 2 - v); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * v, bevelEnabled: true, bevelSize: v, bevelThickness: v, bevelSegments: 1, steps: 1, curveSegments: 1 });
      geo.translate(0, 0, -d / 2 + v); put(geo, material, p, r, color);
    }
    function rod(a, c, radius, material, color, n = 6, top = radius) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...c), delta = end.clone().sub(start);
      const geo = new THREE.CylinderGeometry(top, radius, delta.length(), n, 1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
      geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, material, color);
    }
    function ball(p, size, material, color, n = 8) {
      const geo = new THREE.SphereGeometry(1, n, 4); geo.scale(...size); put(geo, material, p, [0, 0, 0], color);
    }
    function lathe(p, points, material, color, n = 12) {
      put(new THREE.LatheGeometry(points.map(v => new THREE.Vector2(...v)), n), material, p, [0, 0, 0], color);
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
    return { mat, add, put, box, rod, ball, lathe, finish };
  }
  const C = { cream: '#efe3d1', wood: '#cda67e', dark: '#947356', ink: '#596275', mint: '#acd4bf', pink: '#e7b4c6', red: '#d9797f', gold: '#e8c48b', blue: '#b9d7e6', lilac: '#c8bdd1' };
  function palette(b) {
    const vc = (kind, o) => b.mat('#ffffff', Object.assign({ vertexColors: true }, o), kind);
    return { wood: vc('wood'), plain: vc(), metal: vc('metal', { roughness: .48, metalness: .48 }), fabric: vc('fabric', { side: 2, roughness: 1 }) };
  }
  function marker(THREE, parent, name, p, yaw = 0) {
    const obj = new THREE.Object3D(); obj.name = name; obj.position.set(...p); obj.rotation.y = yaw; parent.add(obj); return obj;
  }
  function face(THREE, b, parent, name, size, p) {
    // UV 隨平面轉向 −Z，遊戲貼字不會左右鏡像；背板由木作批次提供。
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), b.mat(C.cream, { roughness: .9 }, 'paper'));
    mesh.name = name; mesh.position.set(...p); mesh.rotation.y = PI; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function part(THREE, parent, name, b) {
    const temporary = b.finish(), mesh = temporary.children[0];
    temporary.remove(mesh); mesh.name = name; parent.add(mesh); return mesh;
  }
  function bake(b, group) {
    // 固定的傾斜板與烤盤蓋烘焙回根批次，避免同材質重複繪製。
    group.updateMatrix();
    for (const mesh of [...group.children]) {
      mesh.updateMatrix(); mesh.geometry.applyMatrix4(group.matrix.clone().multiply(mesh.matrix));
      b.add(mesh.geometry, mesh.material); group.remove(mesh);
    }
    if (group.parent) group.parent.remove(group);
  }
  function disc(THREE, b, p, radius, h, material, color, n = 12) {
    b.put(new THREE.CylinderGeometry(radius, radius, h, n), material, p, [0, 0, 0], color);
  }
  function ring(THREE, b, p, radius, tube, material, color, r = [PI / 2, 0, 0], n = 16) {
    b.put(new THREE.TorusGeometry(radius, tube, 4, n), material, p, r, color);
  }
  function tray(b, m, w = .94, d = .42) {
    b.box([0, .015, 0], [w, .03, d], m.wood, C.wood, [0, 0, 0], .008);
  }

  I.NIGHTMODELS.nm_stall = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_stall';
    const b = workshop(THREE, kit, group), m = palette(b);
    for (const x of [-1.045, 1.045]) for (const z of [-.695, .695]) {
      b.box([x, 1.13, z], [.11, 2.26, .11], m.wood, C.wood, [0, 0, 0], .008);
      b.box([x, .045, z], [.11, .09, .11], m.metal, C.ink);
    }
    for (const z of [-.695, .695]) b.box([0, 2.245, z], [2.12, .075, .075], m.wood, C.dark);
    for (const x of [-1.045, 1.045]) b.box([x, 2.245, 0], [.075, .075, 1.40], m.wood, C.dark);
    // 櫃台頂面精確落在 .85，中央道具標記不陷入桌面。
    b.box([0, .405, -.45], [1.90, .73, .41], m.wood, C.dark, [0, 0, 0], .012);
    for (let j = 0; j < 9; j++) b.box([-.84 + j * .21, .43, -.665], [.195, .65, .018], m.wood, j % 3 ? C.wood : '#dfbe98');
    b.box([0, .82, -.45], [2, .06, .5], m.wood, C.cream, [0, 0, 0], .012);
    for (const x of [-1.035, 1.035]) b.box([x, .93, .33], [.025, .91, .60], m.fabric, C.mint);
    b.box([0, 1.04, .69], [1.97, .86, .025], m.fabric, C.lilac);
    for (let i = 0; i < 7; i++) b.box([-.86 + i * .285, 1.04, .671], [.018, .86, .012], m.fabric, '#b6a9c1');
    // 輕弧布篷與波浪垂邊；兩種條紋各自一個 Mesh、獨立材質。
    for (let parity = 0; parity < 2; parity++) {
      const sb = workshop(THREE, kit, new THREE.Group());
      const fabric = sb.mat(parity ? C.cream : C.pink, { side: THREE.DoubleSide, roughness: 1 }, 'fabric');
      for (let i = parity; i < 10; i += 2) {
        const x = -.99 + i * .22, geo = new THREE.PlaneGeometry(.22, 1, 1, 3), p = geo.attributes.position;
        const zs = [.75, .25, -.25, -.735], ys = [2.30, 2.40, 2.38, 2.30];
        for (let j = 0; j < p.count; j++) { const row = Math.floor(j / 2); p.setXYZ(j, p.getX(j) + x, ys[row], zs[row]); }
        geo.computeVertexNormals(); sb.add(geo, fabric);
        const shape = new THREE.Shape(); shape.moveTo(-.11, 0); shape.lineTo(.11, 0); shape.lineTo(.11, -.11);
        shape.lineTo(.065, -.145); shape.lineTo(-.065, -.145); shape.lineTo(-.11, -.11); shape.closePath();
        sb.put(new THREE.ShapeGeometry(shape), fabric, [x, 2.30, -.735]);
      }
      part(THREE, group, parity ? 'awning_b' : 'awning_a', sb);
    }
    b.box([0, 2.17, -.713], [1.76, .46, .035], m.wood, C.dark, [0, 0, 0], .012);
    face(THREE, b, group, 'sign', [1.70, .42], [0, 2.17, -.75]);
    const lb = workshop(THREE, kit, new THREE.Group()), glow = kit.win();
    for (let i = 0; i < 11; i++) {
      const x = -.98 + i * .196, y = 1.94 - .045 * Math.sin(i * PI / 10);
      lb.ball([x, y - .035, -.71], [.035, .039, .035], glow);
      b.rod([x, y + .025, -.71], [x, y - .01, -.71], .015, m.metal, C.ink, 5);
      if (i) {
        const px = x - .196, py = 1.965 - .045 * Math.sin((i - 1) * PI / 10);
        b.rod([px, py, -.71], [x, y + .025, -.71], .006, m.plain, C.ink, 4);
      }
    }
    part(THREE, group, 'bulbs', lb);
    // 後方紙箱與保冷箱均留在 2.2 × 1.5 的攤位佔地內。
    b.box([-.76, .19, .43], [.40, .38, .42], m.wood, '#dfbe98', [0, 0, 0], .012);
    b.box([-.76, .385, .43], [.065, .01, .41], m.plain, C.cream);
    b.box([.72, .16, .43], [.47, .32, .44], m.plain, C.blue, [0, 0, 0], .018);
    b.box([.72, .335, .43], [.48, .04, .45], m.plain, C.cream, [0, 0, 0], .008);
    b.box([.72, .24, .199], [.14, .035, .015], m.metal, C.ink);
    marker(THREE, group, 'prop', [0, .85, -.45]);
    marker(THREE, group, 'keeper', [0, 0, .25]);
    marker(THREE, group, 'front', [0, 0, -1.15], PI);
    marker(THREE, group, 'hook_l', [-1.05, 2.25, -.75]);
    marker(THREE, group, 'hook_r', [1.05, 2.25, -.75]);
    return b.finish();
  };

  I.NIGHTMODELS.nm_gate = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_gate';
    const b = workshop(THREE, kit, group), m = palette(b), glow = kit.win();
    for (const x of [-1.8, 1.8]) {
      b.box([x, .07, 0], [.32, .14, .44], m.plain, C.lilac, [0, 0, 0], .02);
      b.box([x, 1.62, 0], [.20, 3.12, .22], m.wood, C.red, [0, 0, 0], .015);
      for (const y of [.24, 2.75, 3.12]) b.box([x, y, 0], [.23, .075, .25], m.wood, C.gold, [0, 0, 0], .008);
      // 暖光紙面直接保留 kit.win()；紅色竹骨與頂底蓋不改動共用夜間材質。
      for (const y of [1.17, 1.83, 2.49]) {
        const z = -.29;
        b.rod([x, y + .27, .02], [x, y + .27, z], .017, m.metal, C.dark);
        b.rod([x, y + .27, z], [x, y + .19, z], .012, m.metal, C.gold);
        b.ball([x, y, z], [.17, .22, .17], glow, undefined, 12);
        for (const s of [-1, 1]) disc(THREE, b, [x, y + s * .205, z], .077, .045, m.plain, C.red, 8);
        for (let j = 0; j < 6; j++) {
          const a = j * TAU / 6;
          for (let k = 0; k < 3; k++) {
            const at = t => [x + Math.sin(t) * Math.cos(a) * .174, y + Math.cos(t) * .222, z + Math.sin(t) * Math.sin(a) * .174];
            b.rod(at(.30 + k * .847), at(.30 + (k + 1) * .847), .006, m.plain, C.red, 4);
          }
        }
        for (const dx of [-.018, 0, .018]) b.rod([x + dx, y - .23, z], [x + dx, y - .36, z], .006, m.fabric, C.red, 4);
      }
    }
    b.box([0, 3.12, 0], [4, .18, .30], m.wood, C.dark, [0, 0, 0], .018);
    b.box([0, 2.99, -.04], [2.72, .68, .15], m.wood, C.wood, [0, 0, 0], .02);
    face(THREE, b, group, 'sign', [2.6, .60], [0, 2.99, -.122]);
    // 背面保留素木板，兩側上揚的簷線形成牌樓輪廓。
    for (const s of [-1, 1]) {
      b.rod([0, 3.31, 0], [s * 1.42, 3.29, 0], .065, m.wood, C.red, 6);
      b.rod([s * 1.42, 3.29, 0], [s * 1.95, 3.35, 0], .05, m.wood, C.red, 6);
      b.ball([s * 1.95, 3.35, 0], [.05, .05, .05], m.plain, C.gold);
    }
    return b.finish();
  };

  I.NIGHTMODELS.nm_table = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_table';
    const b = workshop(THREE, kit, group), m = palette(b);
    disc(THREE, b, [0, .675, 0], .40, .05, m.plain, C.cream, 24);
    ring(THREE, b, [0, .665, 0], .392, .012, m.metal, C.lilac, [PI / 2, 0, 0], 24);
    for (const z of [-.19, .19]) for (const s of [-1, 1]) {
      b.rod([s * .28, .025, z], [-s * .22, .65, z], .022, m.metal, C.ink);
      b.box([s * .28, .015, z], [.075, .03, .075], m.plain, C.dark, [0, 0, 0], .006);
    }
    b.rod([0, .34, -.22], [0, .34, .22], .028, m.metal, C.gold);
    const seats = [[0, .62, 0], [0, -.62, PI], [.62, 0, PI / 2], [-.62, 0, -PI / 2]];
    seats.forEach(([x, z, yaw], i) => {
      b.box([x, .395, z], [.30, .05, .30], m.plain, C.red, [0, 0, 0], .018);
      for (const u of [-1, 1]) for (const v of [-1, 1]) {
        b.rod([x + u * .14, .018, z + v * .14], [x + u * .105, .375, z + v * .105], .025, m.plain, C.red, 5, .033);
      }
      for (const u of [-1, 1]) b.box([x + u * .118, .24, z], [.026, .04, .235], m.plain, '#c56c75');
      b.box([x, .421, z], [.065, .002, .013], m.plain, '#ad626f', [0, 0, 0], .003);
      marker(THREE, group, 'seat_' + i, [x, .42, z], yaw);
    });
    return b.finish();
  };

  I.NIGHTMODELS.nm_dice = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_dice';
    const b = workshop(THREE, kit, group), m = palette(b); tray(b, m);
    b.box([-.20, .035, -.035], [.48, .01, .31], m.fabric, C.mint, [0, 0, 0], .008);
    const dots = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [-1, 1], [1, -1], [1, 1]], 5: [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]], 6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]] };
    function die(x, z, yaw) {
      const local = new THREE.Group(), db = workshop(THREE, kit, local);
      db.box([0, 0, 0], [.16, .16, .16], m.plain, C.cream, [0, 0, 0], .01);
      // ±Z = 1/6、±Y = 2/5、±X = 3/4；六面皆有貼片，對面和為七。
      for (const [number, normal, u, v] of [[1, [0, 0, -1], [1, 0, 0], [0, 1, 0]], [6, [0, 0, 1], [-1, 0, 0], [0, 1, 0]],
        [2, [0, 1, 0], [1, 0, 0], [0, 0, 1]], [5, [0, -1, 0], [1, 0, 0], [0, 0, -1]],
        [3, [1, 0, 0], [0, 0, 1], [0, 1, 0]], [4, [-1, 0, 0], [0, 0, -1], [0, 1, 0]]]) {
        for (const [a, c] of dots[number]) {
          const geo = new THREE.CircleGeometry(.0115, 8);
          geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal)));
          geo.translate(...normal.map((n, j) => n * .0806 + u[j] * a * .039 + v[j] * c * .039));
          db.add(geo, m.plain, number === 1 ? C.red : C.ink);
        }
      }
      db.finish(); local.updateMatrixWorld(true);
      for (const mesh of local.children) { const geo = mesh.geometry; geo.rotateY(yaw); geo.translate(x, .121, z); b.add(geo, mesh.material); }
    }
    die(-.31, -.08, -.20); die(-.11, -.025, .22);
    // 倒置骰盅，奶油色口緣與粉紅握鈕。
    b.lathe([-.22, .03, .115], [[0, 0], [.09, 0], [.09, .02], [.064, .19], [0, .19]], m.plain, C.lilac, 10);
    b.ball([-.22, .235, .115], [.025, .025, .025], m.plain, C.pink);
    for (const x of [.10, .43]) b.box([x, .265, .125], [.035, .47, .035], m.wood, C.dark);
    for (const y of [.07, .28]) b.box([.265, y, .08], [.38, .035, .21], m.wood, C.cream, [0, 0, 0], .005);
    for (let j = 0; j < 4; j++) {
      const x = .18 + (j % 2) * .17, y = j < 2 ? .15 : .36, color = j % 2 ? C.pink : C.blue;
      b.ball([x, y, .065], [.052, .060, .045], m.plain, color);
      b.ball([x, y + .065, .065], [.043, .041, .038], m.plain, color);
      for (const s of [-1, 1]) b.ball([x + s * .027, y + .102, .065], [.018, .018, .016], m.plain, color);
      for (const s of [-1, 1]) b.ball([x + s * .016, y + .068, .029], [.005, .006, .004], m.plain, C.ink);
    }
    return b.finish();
  };

  I.NIGHTMODELS.nm_tickets = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_tickets';
    const b = workshop(THREE, kit, group), m = palette(b); tray(b, m);
    b.lathe([-.24, .03, 0], [[0, 0], [.105, 0], [.11, .26], [.091, .26], [.088, .025], [0, .025]], m.wood, C.wood, 12);
    for (const y of [.08, .23]) ring(THREE, b, [-.24, y, 0], .108, .009, m.wood, C.dark);
    for (let i = 0; i < 15; i++) {
      const a = i * 2.39996, radius = .068 * Math.sqrt((i + .5) / 15), x = -.24 + Math.cos(a) * radius, z = Math.sin(a) * radius;
      const tip = [x + .018 * Math.cos(a), .39 + .065 * (i % 4) / 3, z + .018 * Math.sin(a)];
      b.rod([x, .065, z], tip, .006, m.wood, '#ead3a3', 4);
      if (i % 3 === 0) b.rod([tip[0], tip[1] - .04, tip[2]], tip, .0065, m.plain, C.red, 4);
    }
    for (const x of [.04, .42]) b.box([x, .28, .12], [.035, .50, .045], m.wood, C.dark);
    b.box([.23, .33, .09], [.42, .43, .04], m.wood, C.cream, [0, 0, 0], .01);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const x = .11 + col * .12, y = .20 + row * .13, color = [C.pink, C.blue, C.gold][(row + col) % 3];
      b.box([x, y, .064], [.093, .097, .013], m.plain, color, [0, 0, 0], .006);
      b.box([x, y - .030, .056], [.042, .008, .006], m.plain, C.cream);
    }
    return b.finish();
  };

  I.NIGHTMODELS.nm_wheel = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_wheel';
    const b = workshop(THREE, kit, group), m = palette(b);
    b.box([0, .025, .035], [.52, .05, .30], m.wood, C.wood, [0, 0, 0], .012);
    for (const x of [-.17, .17]) b.rod([x, .05, .10], [0, .43, .10], .023, m.metal, C.ink);
    b.rod([0, .43, .13], [0, .43, -.02], .037, m.metal, C.gold, 10);
    const wb = workshop(THREE, kit, new THREE.Group());
    // 局部原點就是軸心，厚度也以 z=0 對稱；八格同角度，首尾亦不同色。
    wb.put(new THREE.CylinderGeometry(.375, .375, .04, 32), m.plain, [0, 0, 0], [PI / 2, 0, 0], C.wood);
    const colors = [C.gold, C.pink, C.blue, C.pink, C.gold, C.blue, C.pink, C.blue];
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.CircleGeometry(.355, 4, PI / 2 - PI / 8 + i * PI / 4, PI / 4);
      geo.rotateY(PI); geo.translate(0, 0, -.021); wb.add(geo, m.plain, colors[i]);
      const a = PI / 2 - PI / 8 + i * PI / 4;
      wb.rod([0, 0, -.023], [-Math.cos(a) * .354, Math.sin(a) * .354, -.023], .003, m.plain, C.cream, 4);
    }
    for (const z of [-.027, .027]) wb.put(new THREE.CylinderGeometry(.055, .055, .016, 12), m.plain, [0, 0, z], [PI / 2, 0, 0], C.gold);
    const wheel = part(THREE, group, 'wheel', wb); wheel.position.set(0, .43, -.025);
    b.rod([0, .43, .11], [0, .855, .11], .018, m.metal, C.ink);
    b.rod([0, .855, .11], [0, .855, -.06], .018, m.metal, C.ink);
    const shape = new THREE.Shape(); shape.moveTo(-.045, .045); shape.lineTo(0, -.04); shape.lineTo(.045, .045); shape.closePath();
    const pointer = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .014, bevelEnabled: false, curveSegments: 1 }), b.mat(C.red, { roughness: .65 }));
    pointer.name = 'pointer'; pointer.position.set(0, .825, -.078); pointer.castShadow = true; group.add(pointer);
    return b.finish();
  };

  I.NIGHTMODELS.nm_balls = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_balls';
    const b = workshop(THREE, kit, group), m = palette(b); tray(b, m);
    const glass = b.mat('#d9f0ed', { transparent: true, opacity: .35, depthWrite: false, roughness: .12, side: THREE.DoubleSide }, 'glass');
    disc(THREE, b, [-.13, .05, 0], .19, .04, m.plain, C.mint, 16);
    b.lathe([-.13, .065, 0], [[0, 0], [.135, 0], [.19, .075], [.20, .19], [.16, .31]], glass, undefined, 20);
    ring(THREE, b, [-.13, .375, 0], .16, .009, m.plain, C.cream, [PI / 2, 0, 0], 20);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39996, r = i < 8 ? .105 : .063, y = i < 8 ? .12 + (i % 2) * .022 : .21;
      b.ball([-.13 + Math.cos(a) * r, y, Math.sin(a) * r], [.035, .035, .035], m.plain, i % 2 ? C.cream : C.red);
    }
    // 小撈網平放旁側；網框內的交叉細線是真幾何。
    ring(THREE, b, [.30, .055, -.04], .072, .008, m.plain, C.pink, [PI / 2, 0, 0], 12);
    for (const d of [-.035, 0, .035]) {
      const len = Math.sqrt(.068 * .068 - d * d);
      b.rod([.30 + d, .054, -.04 - len], [.30 + d, .054, -.04 + len], .002, m.fabric, C.cream, 4);
      b.rod([.30 - len, .054, -.04 + d], [.30 + len, .054, -.04 + d], .002, m.fabric, C.cream, 4);
    }
    b.rod([.30, .055, .03], [.30, .055, .18], .012, m.plain, C.pink, 6);
    return b.finish();
  };

  I.NIGHTMODELS.nm_rings = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_rings';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 後方墊高，板上九根木樁保持垂直；五個竹圈在右手邊。
    b.box([-.13, .05, 0], [.60, .035, .40], m.wood, C.wood, [-.16, 0, 0], .006);
    b.box([-.13, .03, .16], [.55, .06, .06], m.wood, C.dark);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const x = -.32 + col * .19, z = -.13 + row * .13, y = .065 + z * Math.sin(.16);
      b.rod([x, y, z], [x, y + .15, z], .025, m.wood, '#dfbe98', 8, .022);
      b.ball([x, y + .15, z], [.027, .025, .027], m.plain, [C.red, C.blue, C.gold][row]);
    }
    for (let i = 0; i < 5; i++) ring(THREE, b, [.32, .012 + i * .022, 0], .105, .011, m.wood, C.gold);
    return b.finish();
  };

  I.NIGHTMODELS.nm_pachinko = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_pachinko';
    const b = workshop(THREE, kit, group), m = palette(b);
    b.box([0, .02, .01], [.66, .04, .42], m.wood, C.wood, [0, 0, 0], .009);
    for (const x of [-.24, .24]) b.rod([x, .04, .17], [x, .64, .10], .018, m.wood, C.dark);
    const board = new THREE.Group(); board.position.set(0, .445, .015); board.rotation.x = .12; group.add(board);
    const pb = workshop(THREE, kit, board);
    pb.box([0, 0, 0], [.60, .80, .035], m.wood, C.cream, [0, 0, 0], .009);
    pb.box([0, .055, -.020], [.52, .61, .008], m.plain, C.blue);
    for (const x of [-.285, .285]) pb.box([x, 0, -.043], [.03, .80, .05], m.wood, C.red, [0, 0, 0], .004);
    for (const y of [-.385, .385]) pb.box([0, y, -.043], [.56, .03, .05], m.wood, C.red);
    for (let row = 0; row < 4; row++) for (let col = 0; col <= row; col++) {
      const x = (col - row / 2) * .115, y = .27 - row * .13;
      pb.rod([x, y, -.022], [x, y, -.085], .012, m.metal, C.gold, 6);
      pb.ball([x, y, -.088], [.017, .017, .010], m.metal, C.gold);
    }
    // 五個真正分隔的接球槽；六片隔板與前方矮檻不遮住槽底。
    pb.box([0, -.33, -.08], [.54, .11, .075], m.plain, C.lilac);
    for (let i = 0; i < 5; i++) pb.box([-.216 + i * .108, -.32, -.122], [.094, .085, .012], m.plain, [C.pink, C.gold, C.mint, C.blue, C.pink][i]);
    for (let i = 0; i <= 5; i++) pb.box([-.27 + i * .108, -.30, -.10], [.012, .16, .09], m.wood, C.cream);
    pb.box([0, -.376, -.142], [.55, .035, .02], m.wood, C.red);
    // 正面朝 −Z，觀者左下角對應板子的 +X。
    pb.ball([.218, -.302, -.148], [.024, .024, .024], m.metal, C.cream, 10);
    bake(b, pb.finish()); return b.finish();
  };

  I.NIGHTMODELS.nm_eggcake = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_eggcake';
    const b = workshop(THREE, kit, group), m = palette(b); tray(b, m);
    b.box([-.16, .10, 0], [.54, .14, .34], m.metal, C.cream, [0, 0, 0], .02);
    for (const x of [-.30, -.04]) b.rod([x, .11, -.179], [x, .11, -.19], .027, m.metal, C.ink, 8);
    b.box([-.16, .185, 0], [.54, .055, .34], m.metal, C.ink, [0, 0, 0], .015);
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      const x = -.33 + col * .17, z = -.08 + row * .16;
      b.ball([x, .213, z], [.060, .012, .050], m.plain, '#414750', 10);
      b.ball([x, .229, z], [.046, .040, .037], m.plain, col % 2 ? '#efcc87' : '#e6b574', 10);
    }
    b.rod([-.43, .21, .15], [.11, .21, .15], .025, m.metal, C.dark, 8);
    const lid = new THREE.Group(); lid.position.set(-.16, .22, .15); lid.rotation.x = PI / 3; group.add(lid);
    const lb = workshop(THREE, kit, lid);
    lb.box([0, .015, -.16], [.54, .035, .32], m.metal, C.ink, [0, 0, 0], .012);
    // 半開上蓋的內側六個模穴，朝下的一面可由正面看見。
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) lb.ball([-.17 + col * .17, -.006, -.08 - row * .15], [.054, .008, .044], m.metal, '#7c8187');
    lb.box([0, .047, -.29], [.21, .045, .045], m.wood, C.dark, [0, 0, 0], .01); bake(b, lb.finish());
    for (let i = 0; i < 7; i++) b.box([.31 + (i % 2) * .004, .035 + i * .009, -.015], [.22, .008, .32], m.plain, i % 2 ? '#ead4ae' : C.cream, [0, .035, 0], .002);
    b.box([.315, .10, -.013], [.21, .009, .075], m.plain, C.gold);
    return b.finish();
  };

  I.NIGHTMODELS.nm_boba = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'nm_boba';
    const b = workshop(THREE, kit, group), m = palette(b); tray(b, m, .98, .44);
    const glass = b.mat('#e7f3ee', { transparent: true, opacity: .28, depthWrite: false, roughness: .18, side: THREE.DoubleSide }, 'glass');
    // 封口機：上下模座、中間留出杯位，頂部封膜卷軸。
    b.box([-.29, .06, .005], [.29, .06, .33], m.metal, C.pink, [0, 0, 0], .012);
    for (const x of [-.405, -.175]) b.box([x, .25, .11], [.045, .36, .07], m.metal, C.pink, [0, 0, 0], .008);
    b.box([-.29, .40, .015], [.30, .11, .29], m.metal, C.cream, [0, 0, 0], .015);
    b.box([-.29, .13, -.025], [.25, .025, .25], m.metal, C.ink, [0, 0, 0], .006);
    ring(THREE, b, [-.29, .15, -.05], .065, .012, m.metal, C.gold, [PI / 2, 0, 0], 12);
    b.box([-.29, .405, -.137], [.13, .035, .006], m.plain, C.mint, [0, 0, 0], .004);
    b.rod([-.45, .52, .04], [-.13, .52, .04], .025, m.metal, C.ink, 8);
    b.put(new THREE.CylinderGeometry(.068, .068, .22, 12), m.plain, [-.29, .52, .04], [0, 0, PI / 2], C.cream);
    // 透明杯殼內，奶茶液面抬高，底部保留空間讓深色珍珠可見。
    function cup(x, z, strawColor) {
      b.lathe([x, .03, z], [[0, 0], [.045, 0], [.064, .23], [.058, .23], [.040, .012], [0, .012]], glass, undefined, 12);
      b.put(new THREE.CylinderGeometry(.055, .043, .145, 12), m.plain, [x, .165, z], [0, 0, 0], '#d7b58e');
      for (let i = 0; i < 9; i++) {
        const a = i * 2.39996, r = i < 6 ? .026 : .012;
        b.ball([x + Math.cos(a) * r, .048 + (i % 3) * .013, z + Math.sin(a) * r], [.009, .009, .009], m.plain, '#594b50', 6);
      }
      disc(THREE, b, [x, .263, z], .066, .006, m.plain, C.cream, 12);
      ring(THREE, b, [x, .264, z], .063, .0035, m.plain, C.pink, [PI / 2, 0, 0], 12);
      b.rod([x + .018, .10, z], [x + .028, .37, z + .015], .009, m.plain, strawColor, 6);
      disc(THREE, b, [x + .028, .371, z + .015], .006, .001, m.plain, C.ink, 6);
    }
    cup(-.015, -.105, C.pink); cup(.15, -.105, C.mint); cup(.065, .09, C.lilac);
    // 大保溫茶桶、提把與朝向顧客的龍頭。
    disc(THREE, b, [.35, .22, .055], .115, .38, m.metal, C.mint, 12);
    for (const y of [.055, .405]) disc(THREE, b, [.35, y, .055], .12, .025, m.metal, C.cream, 12);
    b.ball([.35, .44, .055], [.028, .024, .028], m.plain, C.ink);
    b.rod([.35, .12, -.055], [.35, .12, -.10], .018, m.metal, C.ink);
    b.rod([.35, .12, -.10], [.35, .085, -.10], .014, m.metal, C.gold);
    for (const x of [.23, .47]) b.rod([x, .26, .055], [x, .34, .055], .012, m.plain, C.ink);
    return b.finish();
  };
})(typeof window !== 'undefined' ? window : globalThis);
