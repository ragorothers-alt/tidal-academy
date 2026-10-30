/* 潮汐小島 · v9.4.1 島嶼運動會：粉彩拱門、裁判帳篷與九款場邊道具。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.SPORTMODELS = I.SPORTMODELS || {};
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
  const C = { cream: '#efe3d1', wood: '#cda67e', dark: '#947356', ink: '#596275', mint: '#acd4bf', pink: '#e7b4c6', red: '#d9797f', gold: '#e8c48b', blue: '#b9d7e6', lilac: '#c8bdd1', orange: '#e8a16e', tent: '#86b3d2' };
  function palette(b) {
    const vc = (kind, o) => b.mat('#ffffff', Object.assign({ vertexColors: true }, o), kind);
    return { wood: vc('wood'), plain: vc(), metal: vc('metal', { roughness: .48, metalness: .48 }), fabric: vc('fabric', { side: 2, roughness: 1 }) };
  }
  function marker(THREE, parent, name, p, yaw = 0) {
    const obj = new THREE.Object3D(); obj.name = name; obj.position.set(...p); obj.rotation.y = yaw; parent.add(obj); return obj;
  }
  function face(THREE, b, parent, name, size, p) {
    // 整張 UV 隨局部 +Z 轉向 −Z；保留獨立空白面供遊戲貼字。
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), b.mat(C.cream, { roughness: .9 }, 'paper'));
    mesh.name = name; mesh.position.set(...p); mesh.rotation.y = PI; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function disc(THREE, b, p, radius, h, material, color, n = 12) {
    b.put(new THREE.CylinderGeometry(radius, radius, h, n), material, p, [0, 0, 0], color);
  }
  function triangle(THREE, b, points, material, color) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, .5, 0], 2));
    geo.computeVertexNormals(); b.add(geo, material, color);
  }
  function bunting(THREE, b, m, a, c, count, drop) {
    const at = t => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t - .04 * Math.sin(t * PI), a[2] + (c[2] - a[2]) * t];
    for (let i = 0; i < count; i++) {
      const l = at(i / count), r = at((i + 1) / count), mid = at((i + .5) / count);
      b.rod(l, r, .006, m.fabric, C.cream, 4);
      triangle(THREE, b, [l, r, [mid[0], mid[1] - drop, mid[2] + .025]], m.fabric, [C.red, C.gold, C.blue, C.mint, C.pink][i % 5]);
    }
  }

  I.SPORTMODELS.sd_arch = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_arch';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 柱心 ±1.8；底座間淨寬 3.30、柱身間 3.40、牌底淨高 2.605。
    for (const s of [-1, 1]) {
      const x = s * 1.8;
      b.box([x, .055, 0], [.30, .11, .40], m.plain, C.cream, [0, 0, 0], .018);
      b.box([x, 1.58, 0], [.20, 3.04, .22], m.plain, C.red, [0, 0, 0], .018);
      for (const y of [.30, .71, 1.12, 1.53, 1.94, 2.35, 2.76]) b.box([x, y, 0], [.208, .13, .228], m.plain, C.cream, [0, 0, 0], .009);
      for (let j = 0; j < 3; j++) {
        const bx = x + s * (.11 + (j % 2) * .04), by = 1.92 + j * .29, bz = j % 2 ? .14 : -.14;
        b.rod([x + s * .11, 1.43, 0], [bx, by - .17, bz], .005, m.fabric, C.cream, 4);
        b.ball([bx, by, bz], [.14, .18, .13], m.plain, [C.gold, C.blue, C.pink][j]);
        b.put(new THREE.ConeGeometry(.025, .045, 6), m.plain, [bx, by - .18, bz], [PI, 0, 0], [C.gold, C.blue, C.pink][j]);
      }
      for (const z of [-.13, .13]) b.box([x, 3.08, z], [.26, .10, .04], m.plain, C.gold, [0, 0, 0], .01);
    }
    b.box([0, 3.11, 0], [4, .18, .28], m.plain, C.red, [0, 0, 0], .025);
    b.box([0, 2.9, 0], [2.72, .59, .14], m.wood, C.wood, [0, 0, 0], .018);
    face(THREE, b, group, 'sign', [2.6, .55], [0, 2.9, -.073]);
    // 背面同樣有奶油色牌心與彩旗，沒有鏡像文字或裸露骨架。
    b.box([0, 2.9, .076], [2.6, .55, .012], m.plain, C.cream, [0, 0, 0], .008);
    bunting(THREE, b, m, [-1.66, 3.16, .17], [1.66, 3.16, .17], 10, .15);
    return b.finish();
  };

  I.SPORTMODELS.sd_tent = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_tent';
    const b = workshop(THREE, kit, group), m = palette(b);
    for (const x of [-.91, .91]) for (const z of [-.91, .91]) {
      b.box([x, .018, z], [.16, .036, .16], m.plain, C.ink, [0, 0, 0], .01);
      b.box([x, 1.035, z], [.055, 2.01, .055], m.metal, C.cream, [0, 0, 0], .006);
      b.box([x, 1.16, z], [.065, .10, .065], m.plain, C.tent, [0, 0, 0], .006);
    }
    const rim = [[-1, 2.04, -1], [1, 2.04, -1], [1, 2.04, 1], [-1, 2.04, 1]];
    for (let side = 0; side < 4; side++) {
      const a = rim[side], c = rim[(side + 1) % 4];
      b.rod(a, c, .022, m.metal, C.cream, 6);
      for (let j = 0; j < 4; j++) {
        const at = t => [a[0] + (c[0] - a[0]) * t, 2.04, a[2] + (c[2] - a[2]) * t];
        triangle(THREE, b, [[0, 2.4, 0], at(j / 4), at((j + 1) / 4)], m.fabric, j % 2 ? C.cream : C.tent);
      }
      b.rod([0, 2.385, 0], a, .012, m.metal, C.cream, 4);
      // 斜面下緣有垂布，正面另留完整可貼字的布條。
      if (side % 2) b.box([a[0], 1.955, 0], [.014, .17, 2], m.fabric, C.tent);
      else b.box([0, 1.955, a[2]], [2, .17, .014], m.fabric, C.tent);
    }
    b.box([0, 2.405, 0], [.065, .025, .065], m.plain, C.cream, [0, 0, 0], .008);
    b.box([0, 1.935, -1.013], [1.68, .36, .018], m.fabric, C.tent, [0, 0, 0], .012);
    face(THREE, b, group, 'sign', [1.6, .3], [0, 1.935, -1.024]);
    bunting(THREE, b, m, [-.87, 1.99, .93], [.87, 1.99, .93], 7, .13);
    // 桌後 +Z 留裁判站位；桌面頂高精確為 .75。
    for (const x of [-.69, .69]) for (const z of [-.48, -.04]) {
      b.box([x, .025, z], [.09, .05, .09], m.plain, C.ink, [0, 0, 0], .008);
      b.rod([x, .03, z], [x, .71, z], .025, m.metal, C.cream, 6);
    }
    b.box([0, .67, -.26], [1.48, .05, .48], m.metal, C.tent);
    b.box([0, .719, -.26], [1.66, .058, .60], m.wood, C.wood, [0, 0, 0], .016);
    b.box([0, .749, -.26], [1.61, .002, .55], m.plain, C.cream);
    // 水瓶不透明，避免共享透明材質與排序成本。
    for (let j = 0; j < 3; j++) {
      const x = .64, z = -.43 + j * .16;
      b.lathe([x, .752, z], [[0, 0], [.035, 0], [.04, .018], [.04, .13], [.022, .155], [.022, .18], [0, .18]], m.plain, C.blue, 8);
      disc(THREE, b, [x, .94, z], .025, .02, m.plain, C.tent, 8);
      disc(THREE, b, [x, .827, z], .041, .045, m.plain, C.cream, 8);
    }
    // 紙張分層、夾板和筆；每張皆為實際幾何，不用貼圖。
    b.box([.31, .760, -.27], [.29, .016, .33], m.wood, C.dark, [0, -.09, 0], .004);
    for (let j = 0; j < 4; j++) b.box([.31 + j * .003, .772 + j * .004, -.27], [.26, .004, .30], m.plain, j % 2 ? '#f8efdf' : C.cream, [0, -.09 + j * .013, 0]);
    b.box([.30, .794, -.13], [.085, .014, .035], m.metal, C.ink, [0, -.09, 0], .003);
    b.rod([.10, .765, -.40], [.10, .765, -.18], .007, m.plain, C.red, 6);
    // 平放的碼錶：外框、錶面、按鈕、兩支指針與短掛繩。
    disc(THREE, b, [-.52, .775, -.31], .079, .046, m.plain, C.ink, 12);
    disc(THREE, b, [-.52, .800, -.31], .064, .006, m.plain, C.cream, 12);
    b.box([-.52, .781, -.218], [.032, .025, .025], m.metal, C.gold, [0, 0, 0], .004);
    b.rod([-.52, .805, -.31], [-.55, .805, -.34], .005, m.plain, C.red, 4);
    b.rod([-.52, .806, -.31], [-.48, .806, -.31], .004, m.plain, C.ink, 4);
    for (let j = 0; j < 4; j++) {
      const a = j * PI / 2;
      b.box([-.52 + Math.sin(a) * .052, .805, -.31 + Math.cos(a) * .052], [.008, .004, .012], m.plain, C.ink, [0, -a, 0]);
    }
    b.rod([-.52, .758, -.20], [-.65, .758, -.12], .006, m.fabric, C.red, 4);
    b.rod([-.65, .758, -.12], [-.72, .758, -.24], .006, m.fabric, C.red, 4);
    // 中空大聲公朝 −Z，內部深色喉口及奶油色喇叭緣。
    const horn = new THREE.LatheGeometry([[.027, 0], [.038, .05], [.105, .20], [.095, .20], [.025, .055]].map(p => new THREE.Vector2(...p)), 12);
    b.put(horn, m.plain, [-.15, .87, -.19], [-PI / 2, 0, 0], C.cream);
    b.put(new THREE.TorusGeometry(.101, .009, 4, 12), m.plain, [-.15, .87, -.39], [0, 0, 0], C.red);
    b.put(new THREE.CircleGeometry(.026, 10), m.plain, [-.15, .87, -.246], [0, PI, 0], C.ink);
    b.box([-.15, .803, -.22], [.038, .105, .048], m.plain, C.red, [0, 0, 0], .007);
    marker(THREE, group, 'referee', [0, 0, .45]);
    marker(THREE, group, 'front', [0, 0, -1.25], PI);
    return b.finish();
  };

  I.SPORTMODELS.sd_board = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_board';
    const b = workshop(THREE, kit, group), m = palette(b);
    for (const x of [-.64, .64]) {
      b.box([x, .035, 0], [.24, .07, .52], m.plain, C.cream, [0, 0, 0], .012);
      b.box([x, .76, .04], [.075, 1.45, .075], m.metal, C.ink, [0, 0, 0], .008);
      b.rod([x, .11, .20], [x, .64, .04], .023, m.metal, C.ink, 6);
    }
    b.box([0, 1.1, 0], [1.72, 1.12, .10], m.wood, C.tent, [0, 0, 0], .025);
    face(THREE, b, group, 'board', [1.6, 1], [0, 1.1, -.053]);
    b.box([0, 1.1, .055], [1.59, .99, .012], m.plain, C.blue, [0, 0, 0], .012);
    for (const x of [-.82, .82]) for (const y of [.58, 1.62]) b.ball([x, y, -.057], [.012, .012, .006], m.metal, C.cream);
    return b.finish();
  };

  I.SPORTMODELS.sd_cone = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_cone';
    const b = workshop(THREE, kit, group), m = palette(b);
    b.box([-.075, .018, 0], [.24, .036, .24], m.plain, C.orange, [0, 0, 0], .018);
    b.lathe([-.075, .036, 0], [[0, 0], [.10, 0], [.018, .274], [.014, .284], [0, .284]], m.plain, C.orange, 12);
    b.put(new THREE.CylinderGeometry(.049, .066, .056, 12), m.plain, [-.075, .178, 0], [0, 0, 0], C.cream);
    // 小牌在錐體旁，獨立空白面與背板皆朝向清楚。
    b.box([.205, .013, .025], [.15, .026, .14], m.plain, C.cream, [0, 0, 0], .009);
    b.box([.205, .121, .025], [.018, .216, .018], m.wood, C.dark, [0, 0, 0], .003);
    b.box([.205, .22, .013], [.244, .164, .024], m.wood, C.wood, [0, 0, 0], .008);
    face(THREE, b, group, 'plate', [.22, .14], [.205, .22, -.001]);
    b.finish();
    const centre = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
    group.children.forEach(o => { o.position.x -= centre.x; });
    return group;
  };

  I.SPORTMODELS.sd_mat = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_mat';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 外徑 1.4、最高 .028；止滑板位於 −Z 前緣，沒有加厚底座。
    disc(THREE, b, [0, .01, 0], .70, .02, m.plain, C.cream, 48);
    disc(THREE, b, [0, .021, 0], .625, .002, m.plain, C.blue, 48);
    b.box([0, .025, -.60], [.62, .006, .10], m.plain, C.cream, [0, 0, 0], .002);
    for (const x of [-.24, -.12, 0, .12, .24]) b.box([x, .0285, -.60], [.008, .001, .07], m.plain, '#ddd4c6');
    return b.finish();
  };

  I.SPORTMODELS.sd_bag = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_bag';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 扁圓鼓起的布袋：四角收縫、上下與腰部三圈，不依賴貼圖。
    const n = 16, rings = [[.037, .009], [.058, .021], [.065, .045], [.058, .073], [.037, .081]];
    const loop = (r, y, j) => {
      const a = j * TAU / n, co = Math.cos(a), si = Math.sin(a);
      return [r * Math.sign(co) * Math.sqrt(Math.abs(co)), y, r * Math.sign(si) * Math.sqrt(Math.abs(si))];
    };
    for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < n; j++) {
      const a = loop(...rings[k], j), c = loop(...rings[k], j + 1), d = loop(...rings[k + 1], j), e = loop(...rings[k + 1], j + 1);
      triangle(THREE, b, [a, d, c], m.fabric, k % 2 ? C.red : '#cd7079');
      triangle(THREE, b, [c, d, e], m.fabric, k % 2 ? C.red : '#cd7079');
    }
    for (let j = 0; j < n; j++) {
      triangle(THREE, b, [[0, 0, 0], loop(...rings[0], j), loop(...rings[0], j + 1)], m.fabric, '#cd7079');
      triangle(THREE, b, [[0, .09, 0], loop(...rings[4], j + 1), loop(...rings[4], j)], m.fabric, C.red);
      const a = loop(.0655, .045, j), c = loop(.0655, .045, j + 1);
      b.rod(a, c, .0013, m.fabric, '#b45f6a', 4);
      const p = loop(.0656, .045, j + .5);
      b.rod([p[0] * .975, .041, p[2] * .975], [p[0] * 1.005, .050, p[2] * 1.005], .0008, m.fabric, C.cream, 4);
    }
    return b.finish();
  };

  I.SPORTMODELS.sd_podium = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_podium';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 2、1、3 的階梯順序；奶油色幾何數字在 −Z 正面，不使用字型貼圖。
    const digits = { 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'] };
    // 從 −Z 看時，畫面左側是世界 +X，因此第二名位於 +.60。
    for (const [rank, x, h, color] of [[1, 0, .50, C.gold], [2, .60, .35, C.blue], [3, -.60, .25, C.pink]]) {
      b.box([x, h / 2, 0], [.60, h, .66], m.plain, color, [0, 0, 0], .018);
      b.box([x, .037, -.335], [.53, .035, .012], m.plain, C.cream, [0, 0, 0], .005);
      b.box([x, h - .012, 0], [.56, .024, .62], m.plain, color, [0, 0, 0], .01);
      const step = .031, y = h * .53;
      b.box([x, y, -.337], [.17, .196, .014], m.plain, rank === 1 ? '#cba56c' : rank === 2 ? C.tent : '#c7869e', [0, 0, 0], .012);
      digits[rank].forEach((row, j) => [...row].forEach((v, k) => {
        if (v === '1') b.box([x + (1 - k) * step, y + (2 - j) * step, -.35], [.029, .029, .015], m.plain, C.cream);
      }));
      marker(THREE, group, 'p' + rank, [x, h, 0]);
    }
    return b.finish();
  };

  I.SPORTMODELS.sd_tugflag = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_tugflag';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 原點是旗子正下方地面；繩心固定 y=.85，不能為貼地而下移整組。
    b.rod([-.25, .85, 0], [.25, .85, 0], .025, m.fabric, C.wood, 10);
    // 三股麻繩的稜線沿 X 螺旋；與本體同一 fabric 批次。
    for (let strand = 0; strand < 3; strand++) for (let j = 0; j < 20; j++) {
      const at = t => [-.25 + .5 * t, .85 + Math.cos(t * TAU * 4 + strand * TAU / 3) * .025, Math.sin(t * TAU * 4 + strand * TAU / 3) * .025];
      b.rod(at(j / 20), at((j + 1) / 20), .003, m.fabric, strand === 1 ? C.cream : C.dark, 4);
    }
    b.put(new THREE.TorusGeometry(.028, .008, 4, 10), m.fabric, [0, .85, 0], [0, PI / 2, 0], C.red);
    triangle(THREE, b, [[-.095, .826, -.006], [.095, .826, -.006], [.035, .70, -.028]], m.fabric, C.red);
    triangle(THREE, b, [[-.095, .826, -.006], [.035, .70, -.028], [-.025, .576, -.014]], m.fabric, '#cb6c78');
    triangle(THREE, b, [[.095, .826, -.006], [-.025, .576, -.014], [.035, .70, -.028]], m.fabric, C.red);
    b.rod([-.095, .827, -.007], [.095, .827, -.007], .004, m.fabric, '#b85f6d', 4);
    return b.finish();
  };

  I.SPORTMODELS.sd_bench = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sd_bench';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 兩片厚木板頂面 .42；跨接桿與外張椅腳保持低多邊形。
    for (const z of [-.095, .095]) b.box([0, .39, z], [1.8, .06, .18], m.wood, z < 0 ? C.wood : '#dfbe98', [0, 0, 0], .012);
    for (const x of [-.64, .64]) {
      for (const s of [-1, 1]) {
        b.box([x, .014, s * .19], [.10, .028, .10], m.plain, C.ink, [0, 0, 0], .007);
        b.rod([x, .025, s * .19], [x, .36, s * .12], .033, m.metal, C.mint, 6);
      }
      b.box([x, .34, 0], [.09, .045, .37], m.metal, C.mint, [0, 0, 0], .005);
      for (const z of [-.095, .095]) disc(THREE, b, [x, .421, z], .013, .002, m.metal, C.dark, 6);
    }
    b.rod([-.65, .19, 0], [.65, .19, 0], .025, m.metal, C.mint, 6);
    marker(THREE, group, 'seat_0', [-.45, .42, 0]);
    marker(THREE, group, 'seat_1', [.45, .42, 0]);
    return b.finish();
  };
})(typeof window !== 'undefined' ? window : globalThis);
