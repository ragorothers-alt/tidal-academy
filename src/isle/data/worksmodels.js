/* 潮汐小島 · v9.2.1 公共建設：TA.ISLE.WORKSMODELS[key] = (THREE, kit) => THREE.Group。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.WORKSMODELS = I.WORKSMODELS || {};
  const PI = Math.PI, TAU = PI * 2;

  // 公尺；地面中心為原點，正面 −Z。共用材質只讀，具名互動零件不併入靜態批次。
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
    function ball(p, size, material, color, yaw = 0) {
      const geo = new THREE.SphereGeometry(1, 8, 4); geo.scale(...size); geo.rotateY(yaw);
      const flat = geo.toNonIndexed(); geo.dispose(); flat.computeVertexNormals();
      flat.translate(...p); add(flat, material, color);
    }
    function lathe(p, points, material, color, n = 10) {
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
  const C = { cream: '#efe3d1', stone: '#b7a4c7', lilac: '#c8bdd1', wood: '#cda67e', dark: '#947356', mint: '#acd4bf', pink: '#e7b4c6', gold: '#e8c48b', ink: '#596275' };
  function palette(b) {
    const vc = (kind, o) => b.mat('#ffffff', Object.assign({ vertexColors: true }, o), kind);
    return { wood: vc('wood'), stone: vc('stone', { roughness: .94 }), metal: vc('metal', { roughness: .48, metalness: .55 }),
      fabric: vc('fabric', { side: 2, roughness: 1 }), plain: vc(), ceramic: vc('ceramic', { roughness: .34 }), foliage: vc('foliage', { roughness: .95 }) };
  }
  function marker(THREE, parent, name, p, yaw = 0) {
    const obj = new THREE.Object3D(); obj.name = name; obj.position.set(...p); obj.rotation.y = yaw; parent.add(obj); return obj;
  }
  function face(THREE, b, parent, name, size, p, color, kind = 'paper') {
    // PlaneGeometry 的 UV 與局部 +Z 一起轉向 −Z，換貼圖後不會左右鏡像。
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), b.mat(color, { roughness: .9 }, kind));
    mesh.name = name; mesh.position.set(...p); mesh.rotation.y = PI; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function disc(THREE, b, p, radius, h, m, color, n = 12) {
    b.put(new THREE.CylinderGeometry(radius, radius, h, n), m, p, [0, 0, 0], color);
  }
  function planter(THREE, b, m, x, z) {
    b.lathe([x, 0, z], [[0, 0], [.12, 0], [.16, .22], [.17, .25], [0, .25]], m.ceramic, C.pink, 8);
    for (let i = 0; i < 3; i++) b.ball([x + Math.sin(i * 2.1) * .07, .32 + i * .035, z + Math.cos(i * 2.1) * .07], [.09, .12, .075], m.foliage, C.mint, i);
  }

  I.WORKSMODELS.works_board = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'works_board';
    const b = workshop(THREE, kit, group), m = palette(b);
    for (const x of [-.72, .72]) {
      b.box([x, .09, 0], [.26, .18, .34], m.stone, C.lilac, [0, 0, 0], .025);
      b.box([x, 1.02, 0], [.13, 1.88, .14], m.wood, C.dark, [0, 0, 0], .014);
      b.rod([x, 1.79, 0], [x, 2.02, .23], .035, m.wood, C.wood);
    }
    b.box([0, 1.38, 0], [1.58, 1.10, .12], m.wood, '#d9bd98', [0, 0, 0], .016);
    for (const x of [-.80, .80]) b.box([x, 1.38, -.08], [.09, 1.20, .09], m.wood, C.wood, [0, 0, 0], .012);
    for (const y of [.81, 1.95]) b.box([0, y, -.08], [1.70, .10, .11], m.wood, C.dark, [0, 0, 0], .012);
    // 小人字屋頂：沿 X 的屋脊，前後兩片薰衣草色屋瓦。
    for (const s of [-1, 1]) {
      b.box([0, 2.16, s * .19], [1.84, .075, .46], m.wood, s < 0 ? C.stone : '#a99ab8', [s * .48, 0, 0], .01);
      b.box([0, 2.055, s * .395], [1.88, .08, .06], m.wood, C.cream);
    }
    b.rod([-.95, 2.295, 0], [.95, 2.295, 0], .035, m.wood, C.cream);
    const posters = [[-.39, 1.62, '#e7b4c6'], [.32, 1.60, '#acd4bf'], [-.34, 1.12, '#f1d8a5'], [.36, 1.13, '#c8c5e5']];
    posters.forEach(([x, y, color], i) => {
      face(THREE, b, group, 'poster_' + i, [.49, .39], [x, y, -.067], color);
      b.ball([x, y + .165, -.078], [.022, .022, .012], m.metal, C.gold);
    });
    // 捐款箱的投幣口是四片實木圍出的真實凹槽。
    b.box([.36, .25, -.30], [.50, .44, .36], m.wood, C.wood, [0, 0, 0], .018);
    for (const z of [-.425, -.175]) b.box([.36, .493, z], [.54, .065, .13], m.wood, C.dark);
    for (const x of [.155, .565]) b.box([x, .493, -.30], [.13, .065, .12], m.wood, C.dark);
    b.box([.36, .30, -.49], [.27, .17, .02], m.metal, C.gold, [0, 0, 0], .01);
    b.box([.36, .30, -.504], [.19, .10, .01], m.wood, C.cream);
    return b.finish();
  };

  I.WORKSMODELS.works_site = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'works_site';
    const b = workshop(THREE, kit, group), m = palette(b), yellow = '#efd190';
    for (const x of [-1.38, 1.38]) for (const z of [-1.38, 1.38]) {
      b.box([x, .035, z], [.32, .07, .32], m.plain, C.ink, [0, 0, 0], .014);
      for (let j = 0; j < 4; j++) {
        const y0 = .07 + j * .105, r0 = .137 - j * .027;
        b.rod([x, y0, z], [x, y0 + .105, z], r0, m.plain, j % 2 ? C.cream : C.pink, 8, r0 - .027);
      }
    }
    function barrier(x, z, length, yaw) {
      const at = (u, y, v = 0) => [x + Math.cos(yaw) * u + Math.sin(yaw) * v, y, z - Math.sin(yaw) * u + Math.cos(yaw) * v];
      for (const u of [-length / 2 + .09, length / 2 - .09]) {
        for (const s of [-1, 1]) b.rod(at(u, .025, s * .20), at(u, .83, 0), .026, m.wood, C.dark);
      }
      for (const y of [.44, .74]) {
        const n = Math.ceil(length / .25), width = length / n;
        for (let i = 0; i < n; i++) b.box(at(-length / 2 + width * (i + .5), y), [width - .005, .17, .07], m.plain, i % 2 ? C.cream : yellow, [0, yaw, 0]);
      }
    }
    barrier(0, 1.34, 2.46, 0); barrier(-1.34, 0, 2.46, PI / 2); barrier(1.34, 0, 2.46, PI / 2);
    // 前緣兩段短拒馬：內緣 x = ±.60，保留 1.20 m 的中央通道。
    barrier(-.96, -1.34, .72, 0); barrier(.96, -1.34, .72, 0);
    for (let j = 0; j < 5; j++) b.box([-.60 + (j % 2) * .36, .12 + Math.floor(j / 2) * .20, .40 + (j % 2) * .08], [.57, .23, .40], m.stone, j % 2 ? C.cream : C.stone, [0, .12 * (j - 2), 0], .035);
    for (let j = 0; j < 4; j++) b.box([-.54 + j * .18, .07 + (j % 2) * .08, -.48], [.14, .12, .96], m.wood, j % 2 ? C.wood : '#e0c09a', [0, -.14, 0], .01);
    // 單輪推車；空心車斗使用 LatheGeometry 的方形截面。
    const cart = new THREE.Group(); cart.name = 'wheelbarrow'; cart.position.set(.65, 0, .12); cart.rotation.y = -.30; group.add(cart);
    const cb = workshop(THREE, kit, cart), cm = palette(cb);
    cb.lathe([0, .39, 0], [[.10, 0], [.32, .26], [.34, .27], [.29, .01], [.09, .01], [.10, 0]], cm.metal, C.mint, 4);
    for (const x of [-.19, .19]) {
      cb.rod([x, .33, -.32], [x, .64, .68], .024, cm.metal, C.ink);
      cb.rod([x, .61, .58], [x, .65, .73], .034, cm.wood, C.dark);
      cb.rod([x, .37, .17], [x, .025, .27], .023, cm.metal, C.ink);
    }
    cb.put(new THREE.CylinderGeometry(.17, .17, .11, 10), cm.plain, [0, .17, -.32], [0, 0, PI / 2], C.ink);
    cb.rod([-.085, .17, -.32], [.085, .17, -.32], .052, cm.metal, C.gold);
    cb.finish();
    b.box([.92, .51, -1.39], [.065, 1.02, .065], m.wood, C.dark);
    b.box([.92, .94, -1.44], [.64, .39, .055], m.wood, C.wood, [0, 0, 0], .02);
    face(THREE, b, group, 'sign', [.55, .30], [.92, .94, -1.471], C.cream);
    return b.finish();
  };

  I.WORKSMODELS.viewpoint = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'viewpoint';
    const b = workshop(THREE, kit, group), m = palette(b);
    b.box([0, .09, 0], [3.36, .18, 2.56], m.stone, C.stone, [0, 0, 0], .035);
    for (let i = 0; i < 12; i++) b.box([-1.554 + i * .2825, .215, 0], [.267, .07, 2.60], m.wood, i % 3 ? C.wood : '#dbb991', [0, 0, 0], .008);
    for (const x of [-1.62, 1.62]) {
      for (const z of [-1.21, -.40, .40, 1.10]) b.box([x, .66, z], [.075, .82, .075], m.wood, C.dark);
      for (const y of [.68, 1.075]) b.box([x, y, -.04], [.10, .07, 2.45], m.wood, y > 1 ? C.cream : C.wood, [0, 0, 0], .01);
    }
    for (const s of [-1, 1]) {
      for (const x of [.37, .95]) b.box([s * x, .66, -1.21], [.065, .82, .065], m.wood, C.dark);
      for (const y of [.68, 1.075]) b.box([s * .99, y, -1.21], [1.28, .07, .10], m.wood, y > 1 ? C.cream : C.wood, [0, 0, 0], .01);
    }
    // 望遠鏡以立柱底部為 pivot，雙筒朝 −Z；眼端留在平台內。
    const scope = new THREE.Group(); scope.name = 'scope'; scope.position.set(0, .25, -1.02); group.add(scope);
    const sb = workshop(THREE, kit, scope), sm = palette(sb);
    disc(THREE, sb, [0, .025, 0], .18, .05, sm.metal, C.ink);
    sb.rod([0, .04, 0], [0, .91, 0], .055, sm.metal, C.cream, 8);
    sb.box([0, .70, .07], [.20, .24, .11], sm.metal, C.mint, [0, 0, 0], .025);
    sb.box([0, .74, .13], [.075, .012, .008], sm.plain, C.ink);
    sb.rod([-.22, .96, 0], [.22, .96, 0], .07, sm.metal, C.gold);
    for (const x of [-.125, .125]) {
      sb.rod([x, 1.00, .17], [x, 1.025, -.23], .085, sm.metal, C.mint, 10, .11);
      sb.rod([x, 1.025, -.23], [x, 1.026, -.25], .092, sm.plain, C.ink, 10);
      sb.rod([x, 1.027, -.251], [x, 1.027, -.254], .067, sm.plain, '#849faa', 10);
      sb.rod([x, 1.00, .17], [x, .998, .23], .057, sm.plain, C.ink, 8);
    }
    sb.finish(); marker(THREE, group, 'look', [0, .25, -.48]);
    // 座面頂端 .70 = 平台 .25 + 椅高 .45。
    for (const x of [-.62, .62]) for (const z of [.63, .99]) b.box([x, .45, z], [.075, .40, .075], m.wood, C.dark);
    for (const z of [.63, .80, .97]) b.box([0, .66, z], [1.84, .08, .15], m.wood, C.wood, [0, 0, 0], .012);
    for (const x of [-.72, .72]) b.box([x, .86, 1.06], [.06, .78, .07], m.wood, C.dark);
    for (const y of [.90, 1.12]) b.box([0, y, 1.06], [1.84, .16, .07], m.wood, y > 1 ? C.mint : C.wood, [0, 0, 0], .012);
    marker(THREE, group, 'seat_0', [-.46, .70, .80]); marker(THREE, group, 'seat_1', [.46, .70, .80]);
    for (const x of [-1.40, 1.40]) {
      disc(THREE, b, [x, .29, .93], .13, .08, m.stone, C.lilac, 8);
      b.rod([x, .33, .93], [x, 2.04, .93], .032, m.wood, C.dark);
      b.box([x, 1.98, .93], [.19, .27, .19], m.plain, '#f8e8be', [0, 0, 0], .025);
      b.put(new THREE.ConeGeometry(.18, .16, 4), m.metal, [x, 2.18, .93], [0, PI / 4, 0], C.stone);
    }
    return b.finish();
  };

  I.WORKSMODELS.hot_spring = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'hot_spring';
    const b = workshop(THREE, kit, group), m = palette(b);
    disc(THREE, b, [0, .025, 0], 1.46, .05, m.stone, '#8f9aab', 24);
    // 水面低於池緣；石塊內緣約 r=1.30，水面外緣藏在石縫下。
    const geo = new THREE.CircleGeometry(1.41, 32), pos = geo.attributes.position;
    for (let i = 1; i < pos.count; i++) {
      const a = Math.atan2(pos.getY(i), pos.getX(i)), wobble = 1 + .018 * Math.sin(a * 3) + .012 * Math.cos(a * 5);
      pos.setXY(i, pos.getX(i) * wobble, pos.getY(i) * wobble);
    }
    geo.rotateX(-PI / 2);
    const water = new THREE.Mesh(geo, b.mat('#acdcd0', { transparent: true, opacity: .78, roughness: .20, depthWrite: false }));
    water.name = 'water'; water.position.y = .12; water.receiveShadow = true; group.add(water);
    for (let i = 0; i < 17; i++) {
      const a = i * TAU / 17, r = 1.51 + .035 * Math.sin(i * 2.3), h = .19 + .035 * Math.sin(i * 1.7);
      b.ball([Math.sin(a) * r, h, Math.cos(a) * r], [.32, h, .235], m.stone, [C.stone, C.lilac, C.cream][i % 3], a);
    }
    for (let i = 0; i < 19; i++) {
      const x = -1.44 + i * .16, h = 1.55 + .045 * Math.cos(i * 1.4);
      b.rod([x, 0, 1.57], [x, h, 1.57], .065, m.wood, i % 3 ? '#b9c6a1' : '#d3d8b3', 6, .057);
      for (const y of [.43, 1.00]) b.rod([x, y, 1.57], [x, y + .035, 1.57], .070, m.wood, '#9aa985', 6);
    }
    for (const y of [.35, 1.23]) b.box([0, y, 1.64], [3.08, .065, .075], m.wood, C.dark);
    for (const x of [-1.49, 1.49]) b.rod([x, 0, 1.60], [x, 1.65, 1.60], .075, m.wood, C.dark);
    // 中空木桶與兩只疊盆；金屬箍不穿過桶口。
    function tub(p, r, h) {
      b.lathe(p, [[0, .015], [r * .75, .015], [r, h], [r * .86, h], [r * .66, .05], [0, .05]], m.wood, C.wood, 10);
      for (const y of [h * .22, h * .80]) b.put(new THREE.TorusGeometry(r * (.75 + y / h * .25), .012, 3, 10), m.metal, [p[0], p[1] + y, p[2]], [PI / 2, 0, 0], C.gold);
    }
    tub([-1.64, 0, .81], .26, .44); tub([1.60, 0, .80], .23, .15); tub([1.60, .10, .80], .21, .15);
    b.box([-1.64, .47, .81], [.57, .045, .07], m.wood, C.dark, [0, .22, 0], .008);
    b.rod([1.28, 0, -.86], [1.28, .77, -.86], .035, m.wood, C.dark);
    b.box([1.28, .72, -.91], [.60, .34, .06], m.wood, C.wood, [0, 0, 0], .018);
    face(THREE, b, group, 'sign', [.50, .25], [1.28, .72, -.944], C.cream, 'wood');
    for (const [i, x, z] of [[0, -.92, .28], [1, .85, .47], [2, .10, -.96]]) marker(THREE, group, 'soak_' + i, [x, .02, z], Math.atan2(x, z));
    marker(THREE, group, 'steam', [0, .60, 0]);
    return b.finish();
  };

  I.WORKSMODELS.cafe = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'cafe';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 吧台在 +Z：亭身 2.6 × 1.4，前方保留點餐走道。
    b.box([0, .055, 1.18], [2.60, .11, 1.40], m.wood, C.dark, [0, 0, 0], .018);
    b.box([0, .52, .62], [2.48, .86, .40], m.wood, C.wood, [0, 0, 0], .022);
    for (let i = 0; i < 10; i++) b.box([-1.10 + i * .245, .51, .409], [.22, .72, .024], m.wood, i % 3 ? '#dfbe98' : C.wood);
    b.box([0, .99, .60], [2.64, .12, .65], m.wood, C.dark, [0, 0, 0], .025);
    b.box([0, 1.057, .60], [2.57, .014, .59], m.wood, '#ebcfa6');
    for (const x of [-1.19, 1.19]) for (const z of [.58, 1.78]) b.box([x, 1.06, z], [.09, 2.10, .09], m.wood, C.dark, [0, 0, 0], .01);
    for (const z of [.58, 1.78]) b.box([0, 2.08, z], [2.56, .09, .10], m.wood, C.wood);
    b.box([0, .77, 1.72], [2.24, .08, .26], m.wood, C.wood);
    // 布篷使用彎折的內建 PlaneGeometry，條紋是獨立面片後合併，無貼圖。
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.PlaneGeometry(.28, 1, 1, 3), p = geo.attributes.position;
      const zs = [1.99, 1.47, .85, .25], ys = [2.17, 2.20, 2.13, 2.01];
      for (let j = 0; j < p.count; j++) { const row = Math.floor(j / 2); p.setXYZ(j, p.getX(j), ys[row], zs[row]); }
      geo.computeVertexNormals(); geo.translate(-1.26 + i * .28, 0, 0); b.add(geo, m.fabric, i % 2 ? C.cream : C.mint);
      b.box([-1.26 + i * .28, 1.94, .25], [.278, .15, .025], m.fabric, i % 2 ? C.cream : C.mint, [0, 0, 0], .01);
    }
    // 咖啡機：奶油機身、雙出水嘴、蒸汽棒、兩顆旋鈕。
    b.box([-.71, 1.28, .65], [.51, .43, .34], m.metal, C.cream, [0, 0, 0], .035);
    b.box([-.71, 1.30, .468], [.42, .23, .024], m.metal, C.ink);
    b.box([-.71, 1.09, .41], [.48, .035, .22], m.metal, C.gold);
    for (const x of [-.83, -.62]) {
      b.rod([x, 1.22, .43], [x, 1.18, .43], .025, m.metal, C.gold);
      b.rod([x, 1.38, .45], [x, 1.38, .43], .035, m.metal, C.gold);
    }
    b.rod([-.99, 1.29, .57], [-1.02, 1.13, .39], .015, m.metal, C.gold);
    function cup(x, y, z) {
      disc(THREE, b, [x, y + .008, z], .092, .016, m.ceramic, C.cream, 10);
      b.lathe([x, y + .018, z], [[0, 0], [.044, 0], [.061, .10], [.050, .10], [.035, .02], [0, .02]], m.ceramic, C.cream, 8);
      b.put(new THREE.TorusGeometry(.028, .009, 4, 8), m.ceramic, [x + .062, y + .073, z], [0, PI / 2, 0], C.cream);
    }
    cup(-.72, 1.11, .36); cup(-.18, 1.065, .54); cup(.08, 1.065, .62);
    disc(THREE, b, [.67, 1.08, .57], .235, .035, m.wood, C.wood);
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3;
      disc(THREE, b, [.67 + Math.sin(a) * .10, 1.145, .57 + Math.cos(a) * .10], .064, .085, m.ceramic, i % 2 ? C.pink : '#edcb93', 6);
    }
    const glass = b.mat('#e4f1e7', { transparent: true, opacity: .32, roughness: .18, depthWrite: false, side: THREE.DoubleSide });
    const dome = new THREE.SphereGeometry(.225, 12, 5, 0, TAU, 0, PI / 2); dome.scale(1, 1.2, 1); b.put(dome, glass, [.67, 1.10, .57]);
    b.ball([.67, 1.39, .57], [.035, .03, .035], m.wood, C.dark);
    // 側邊空白菜單板位於吧台左前方。
    for (const z of [.22, .66]) b.rod([-1.58, .025, z], [-1.58, 1.04, .38], .026, m.wood, C.dark);
    b.box([-1.58, .77, .32], [.51, .62, .06], m.wood, C.wood, [0, 0, 0], .015);
    face(THREE, b, group, 'menu', [.43, .52], [-1.58, .77, .286], '#6f9286');
    marker(THREE, group, 'counter', [0, 0, -.12], PI);
    // 兩張圓桌；四張椅子的局部 −Z 均指向各自桌心。
    function chair(x, z, yaw, index) {
      const at = (u, y, v) => [x + Math.cos(yaw) * u + Math.sin(yaw) * v, y, z - Math.sin(yaw) * u + Math.cos(yaw) * v];
      for (const u of [-.16, .16]) for (const v of [-.16, .16]) b.rod(at(u * 1.15, .015, v * 1.15), at(u, .42, v), .024, m.wood, C.dark);
      b.box(at(0, .415, 0), [.44, .07, .44], m.wood, C.wood, [0, yaw, 0], .018);
      for (const u of [-.17, .17]) b.rod(at(u, .41, .18), at(u, .88, .21), .025, m.wood, C.dark);
      b.box(at(0, .78, .205), [.43, .17, .055], m.wood, C.mint, [0, yaw, 0], .015);
      marker(THREE, group, 'seat_' + index, [x, .45, z], yaw);
    }
    for (let i = 0; i < 2; i++) {
      const x = i ? 1.20 : -1.20, z = -1.18;
      disc(THREE, b, [x, .745, z], .49, .07, m.wood, C.wood, 16);
      disc(THREE, b, [x, .035, z], .28, .07, m.metal, C.cream, 8);
      b.rod([x, .07, z], [x, .71, z], .045, m.metal, C.cream, 8);
      cup(x, .78, z); chair(x - .78, z, -PI / 2, i * 2); chair(x + .78, z, PI / 2, i * 2 + 1);
    }
    // 直徑 2.9 m 的大陽傘遮住左桌，右桌開放；立柱避開杯子與四個座位。
    const ux = -.95, uz = -1.05, ur = 1.45;
    disc(THREE, b, [ux, .035, uz], .26, .07, m.stone, C.lilac, 8);
    b.rod([ux, .07, uz], [ux, 2.56, uz], .035, m.wood, C.dark, 8);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, color = i % 2 ? C.cream : C.pink;
      b.put(new THREE.ConeGeometry(ur, .48, 2, 1, true, a, TAU / 12), m.fabric, [ux, 2.26, uz], [0, 0, 0], color);
      b.put(new THREE.CylinderGeometry(ur, ur, .10, 2, 1, true, a, TAU / 12), m.fabric, [ux, 1.97, uz], [0, 0, 0], color);
      b.rod([ux, 2.49, uz], [ux + Math.sin(a) * (ur - .01), 2.025, uz + Math.cos(a) * (ur - .01)], .012, m.wood, C.cream, 4);
    }
    b.ball([ux, 2.54, uz], [.065, .06, .065], m.wood, C.gold);
    planter(THREE, b, m, 1.57, 1.58);
    b.finish();
    // 亭子與露天座位合計的佔地中心落在原點；標記點保持為根層的局部座標。
    const centre = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
    group.children.forEach(o => { o.position.x -= centre.x; o.position.z -= centre.z; });
    return group;
  };
})(typeof window !== 'undefined' ? window : globalThis);
