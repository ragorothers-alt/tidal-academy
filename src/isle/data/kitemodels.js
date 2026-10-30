/* 潮汐小島 · v9.4.2 風箏節：海風竹架、和紙風箏、彩帶與野餐小物。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.KITEMODELS = I.KITEMODELS || {};
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
      const source = new THREE.LatheGeometry(points.map(v => new THREE.Vector2(...v)), n);
      const geo = source.toNonIndexed(); source.dispose();
      // Lathe 的軸心端蓋會產生零面積三角形；只保留有面積的頂點資料。
      const keep = [], a = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
      const positions = geo.attributes.position;
      for (let j = 0; j < positions.count; j += 3) {
        a.fromBufferAttribute(positions, j); c.fromBufferAttribute(positions, j + 1); d.fromBufferAttribute(positions, j + 2);
        if (c.sub(a).cross(d.sub(a)).lengthSq() > 1e-20) keep.push(j, j + 1, j + 2);
      }
      const clean = new THREE.BufferGeometry();
      for (const [key, attr] of Object.entries(geo.attributes)) {
        const values = new Float32Array(keep.length * attr.itemSize);
        keep.forEach((index, j) => values.set(attr.array.subarray(index * attr.itemSize, (index + 1) * attr.itemSize), j * attr.itemSize));
        clean.setAttribute(key, new THREE.BufferAttribute(values, attr.itemSize));
      }
      geo.dispose(); put(clean, material, p, [0, 0, 0], color);
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
  // 地景沿用運動會與夜市粉彩；天空紙面提高彩度，仍保留奶油色留白。
  Object.assign(C, { coral: '#e66e75', teal: '#48b8b5', sun: '#f2c45b', sky: '#649ed0', violet: '#ac84c4' });
  function quad(THREE, b, points, material, color) {
    triangle(THREE, b, [points[0], points[1], points[2]], material, color);
    triangle(THREE, b, [points[0], points[2], points[3]], material, color);
  }
  function polygon(THREE, b, points, material, color) {
    const shape = new THREE.Shape();
    points.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]));
    shape.closePath(); b.put(new THREE.ShapeGeometry(shape), material, [0, 0, points[0][2]], [0, 0, 0], color);
  }
  function bamboo(THREE, b, m, a, c, radius = .035, nodes = 3) {
    b.rod(a, c, radius, m.wood, C.wood);
    const at = t => a.map((v, j) => v + (c[j] - v) * t);
    const length = new THREE.Vector3(...c).distanceTo(new THREE.Vector3(...a));
    for (let j = 1; j <= nodes; j++) {
      const t = j / (nodes + 1), dt = .009 / length;
      b.rod(at(t - dt), at(t + dt), radius * 1.12, m.wood, C.gold);
    }
  }
  function binding(b, m, p, radius = .045) {
    for (const dy of [-.012, .012]) b.rod([p[0], p[1] + dy - .005, p[2]], [p[0], p[1] + dy + .005, p[2]], radius, m.fabric, C.cream);
  }
  function ribbon(THREE, b, m, p, length, width, color, lean = .10) {
    for (let j = 0; j < 3; j++) {
      const at = (t, side) => [p[0] + lean * t + side * width / 2, p[1] - length * t, p[2] + .035 * Math.sin(t * PI)];
      quad(THREE, b, [at(j / 3, -1), at(j / 3, 1), at((j + 1) / 3, 1), at((j + 1) / 3, -1)], m.fabric, color);
    }
  }
  function littleKite(THREE, b, m, p, w, h, colors = [C.coral, C.sun, C.teal, C.cream]) {
    const [x, y, z] = p, points = [[x, y + h / 2, z], [x + w / 2, y + h * .06, z], [x, y - h / 2, z], [x - w / 2, y + h * .06, z]];
    for (let j = 0; j < 4; j++) triangle(THREE, b, [[x, y + h * .06, z - .005], points[j], points[(j + 1) % 4]], m.fabric, colors[j]);
    b.rod([x, y - h / 2, z + .008], [x, y + h / 2, z + .008], .005, m.wood, C.dark, 4);
    b.rod([x - w / 2, y + h * .06, z + .008], [x + w / 2, y + h * .06, z + .008], .005, m.wood, C.dark, 4);
  }
  function bridle(b, m, anchors) {
    // 原點即提線結；紙面在 +Z，結在有圖案的 −Z 前方。
    for (const a of anchors) b.rod([0, 0, 0], a, .0025, m.fabric, C.cream, 4);
    b.ball([0, 0, 0], [.008, .008, .006], m.fabric, C.cream, 6);
  }
  function chain(THREE, kit, parent, m, name, prefix, count, length, width, colors, p, bows = false, decorate) {
    const tail = marker(THREE, parent, name, p); let previous = tail;
    for (let j = 0; j < count; j++) {
      const seg = marker(THREE, previous, prefix + 'seg' + j, [0, j ? -length : 0, 0]);
      const b = workshop(THREE, kit, seg), color = colors[j % colors.length];
      const w = width * (1 - j * .065);
      quad(THREE, b, [[-w / 2, 0, 0], [w / 2, 0, 0], [w * .44, -length / 2, .008], [-w * .44, -length / 2, .008]], m.fabric, color);
      quad(THREE, b, [[-w * .44, -length / 2, .008], [w * .44, -length / 2, .008], [w * .32, -length, 0], [-w * .32, -length, 0]], m.fabric, color);
      if (bows) {
        const y = -length * .60;
        triangle(THREE, b, [[0, y, -.004], [-.08, y + .04, -.004], [-.075, y - .045, -.004]], m.fabric, color);
        triangle(THREE, b, [[0, y, -.004], [.075, y - .045, -.004], [.08, y + .04, -.004]], m.fabric, color);
        b.ball([0, y, -.006], [.016, .018, .01], m.fabric, C.cream, 6);
      }
      if (decorate) decorate(b, j);
      b.finish(); previous = seg;
    }
    return tail;
  }
  function flying(b) {
    const group = b.finish();
    // 高空薄紙不接收自身陰影，避免雙面紙與背骨在陰影貼圖上產生條紋。
    group.traverse(o => { if (o.isMesh) o.receiveShadow = false; }); return group;
  }
  function spool(THREE, b, m, p, radius = .06, height = .10, color = C.coral) {
    const [x, y, z] = p, rim = height * .13;
    disc(THREE, b, p, radius * .69, height * .80, m.fabric, C.cream, 10);
    for (const s of [-1, 1]) {
      disc(THREE, b, [x, y + s * (height - rim) / 2, z], radius, rim, m.wood, C.wood, 10);
      disc(THREE, b, [x, y + s * (height + .003) / 2, z], radius * .27, .006, m.wood, C.dark, 8);
    }
    for (const dy of [-.025, 0, .025]) {
      b.put(new THREE.TorusGeometry(radius * .70, .0025, 3, 10), m.fabric, [x, y + dy * height / .1, z], [PI / 2, 0, 0], color);
    }
  }

  I.KITEMODELS.kf_gate = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_gate';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 柱心 ±1.8、柱徑 .12；底座間淨寬 3.32、布底淨高 2.54。
    for (const s of [-1, 1]) {
      const x = s * 1.8;
      b.box([x, .035, 0], [.28, .07, .36], m.plain, C.cream, [0, 0, 0], .016);
      bamboo(THREE, b, m, [x, .04, 0], [x, 3.04, 0], .06, 6);
      binding(b, m, [x, 2.96, 0], .071);
      littleKite(THREE, b, m, [x, 3.03, -.08], .28, .34, s < 0 ? [C.coral, C.sun, C.cream, C.teal] : [C.teal, C.sky, C.sun, C.cream]);
      for (let j = 0; j < 3; j++) ribbon(THREE, b, m, [x + s * (.06 + j * .055), 3.03 - j * .025, .04 + j * .025], .39 + j * .07, .048, [C.pink, C.blue, C.gold][j], s * .085);
      for (const z of [-.02, .06]) b.rod([x, 2.99, z], [s * 1.5, 3.08, z], .006, m.fabric, C.cream, 4);
    }
    bamboo(THREE, b, m, [-2, 3.08, .015], [2, 3.08, .015], .035, 5);
    b.box([0, 2.825, .008], [3.04, .57, .022], m.fabric, C.mint, [0, 0, 0], .008);
    face(THREE, b, group, 'sign', [3, .55], [0, 2.825, -.008]);
    // 背面同色奶油布心；兩側彩色縫邊不侵入可貼字區。
    b.box([0, 2.825, .021], [3, .55, .004], m.fabric, C.cream);
    for (const x of [-1.55, 1.55]) {
      ribbon(THREE, b, m, [x, 3.075, .01], .52, .065, C.pink, 0);
      for (const y of [2.59, 2.82, 3.04]) b.rod([x, y, -.018], [Math.sign(x) * 1.8, y, -.018], .004, m.fabric, C.cream, 4);
    }
    return b.finish();
  };

  I.KITEMODELS.kf_booth = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_booth';
    const b = workshop(THREE, kit, group), m = palette(b);
    for (const x of [-1.015, 1.015]) for (const z of [-.69, .69]) {
      b.box([x, .015, z], [.14, .03, .14], m.plain, C.cream, [0, 0, 0], .009);
      bamboo(THREE, b, m, [x, .025, z], [x, 2.13, z], .035, 3);
      binding(b, m, [x, 2.06, z]);
    }
    for (const z of [-.74, .74]) bamboo(THREE, b, m, [-1.08, 2.10, z], [1.08, 2.10, z], .025, 0);
    for (const x of [-1.03, 1.03]) bamboo(THREE, b, m, [x, 2.10, -.76], [x, 2.10, .76], .025, 0);
    // 弧形布篷 2.2 × 1.6；屋脊最高 2.30，前沿空白布招獨立。
    const zs = [-.8, -.4, .15, .8], ys = [2.12, 2.27, 2.30, 2.12];
    for (let j = 0; j < 10; j++) {
      const x = -1.1 + j * .22, color = j % 2 ? C.cream : C.blue;
      for (let k = 0; k < 3; k++) quad(THREE, b, [[x, ys[k], zs[k]], [x + .22, ys[k], zs[k]], [x + .22, ys[k + 1], zs[k + 1]], [x, ys[k + 1], zs[k + 1]]], m.fabric, color);
      polygon(THREE, b, [[x, 2.12, -.8], [x + .22, 2.12, -.8], [x + .22, 2.02, -.8], [x + .17, 1.99, -.8], [x + .05, 1.99, -.8], [x, 2.02, -.8]], m.fabric, color);
    }
    b.box([0, 1.955, -.808], [1.66, .34, .012], m.fabric, C.mint, [0, 0, 0], .008);
    face(THREE, b, group, 'sign', [1.6, .3], [0, 1.955, -.818]);
    // 桌頂 .75；桌後 .45 的師傅站位不被桌面或展示架堵住。
    for (const x of [-.77, .77]) for (const z of [-.55, -.03]) b.rod([x, .01, z], [x, .714, z], .03, m.wood, C.dark);
    for (const z of [-.55, -.03]) b.rod([-.78, .28, z], [.78, .28, z], .02, m.wood, C.wood);
    b.box([0, .72, -.29], [1.8, .06, .7], m.wood, C.wood, [0, 0, 0], .012);
    for (const z of [-.52, -.29, -.06]) b.box([0, .7505, z], [1.76, .001, .006], m.wood, C.dark);
    // 後排獨立展示架與三隻幾何和紙小風箏。
    for (const x of [-.82, .82]) {
      b.rod([x, .015, .68], [x, 1.85, .68], .025, m.wood, C.wood);
      b.box([x, .02, .68], [.18, .04, .20], m.wood, C.dark, [0, 0, 0], .008);
    }
    b.rod([-.85, 1.83, .68], [.85, 1.83, .68], .025, m.wood, C.wood);
    for (let j = 0; j < 3; j++) {
      const x = -.54 + j * .54, y = 1.10 + (j === 1 ? .06 : 0);
      b.rod([x, 1.83, .66], [x, y + .20, .66], .003, m.fabric, C.cream, 4);
      littleKite(THREE, b, m, [x, y, .64], .32, .4, [[C.coral, C.pink, C.sun, C.cream], [C.teal, C.sky, C.cream, C.sun], [C.violet, C.pink, C.cream, C.coral]][j]);
      ribbon(THREE, b, m, [x, y - .20, .64], .16, .023, [C.pink, C.blue, C.gold][j], .025);
    }
    // 半成品平放在桌面：只糊了兩瓣紙，另外兩瓣露出十字竹骨。
    const a = [-.12, .775, -.51], c = [-.12, .775, -.05], l = [-.42, .775, -.29], r = [.18, .775, -.29], mid = [-.12, .775, -.29];
    triangle(THREE, b, [a, r, mid], m.fabric, C.sun);
    triangle(THREE, b, [mid, r, c], m.fabric, C.coral);
    b.rod(a, c, .005, m.wood, C.dark, 4); b.rod(l, r, .005, m.wood, C.dark, 4);
    for (let j = 0; j < 5; j++) b.rod([-.75 + j * .035, .763, -.49], [-.68 + j * .035, .763, -.11], .004, m.wood, C.cream, 4);
    for (let j = 0; j < 3; j++) b.box([.49 + j * .015, .756 + j * .005, -.15], [.34, .004, .20], m.fabric, [C.pink, C.blue, C.mint][j], [0, -.12 + j * .10, 0]);
    spool(THREE, b, m, [.70, .805, -.47], .052, .10, C.teal);
    spool(THREE, b, m, [.48, .792, -.45], .043, .078, C.coral);
    // 剪刀有兩個中空握圈、金屬刀片與鉚釘，水平放置且朝攤前。
    for (const x of [.19, .29]) b.put(new THREE.TorusGeometry(.032, .007, 4, 10), m.plain, [x, .765, -.48], [PI / 2, 0, 0], C.red);
    for (const x of [.19, .29]) b.rod([x, .766, -.512], [.24, .766, -.555], .005, m.plain, C.red, 4);
    triangle(THREE, b, [[.227, .766, -.548], [.254, .766, -.561], [.321, .766, -.645]], m.metal, C.ink);
    triangle(THREE, b, [[.253, .767, -.548], [.226, .767, -.561], [.159, .767, -.645]], m.metal, C.ink);
    b.ball([.24, .77, -.555], [.011, .005, .011], m.metal, C.gold, 6);
    marker(THREE, group, 'keeper', [0, 0, .45]);
    marker(THREE, group, 'front', [0, 0, -1.25], PI);
    return b.finish();
  };

  I.KITEMODELS.kf_windsock = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_windsock';
    const b = workshop(THREE, kit, group), m = palette(b);
    b.lathe([0, 0, 0], [[0, 0], [.20, 0], [.22, .04], [.17, .11], [.065, .13], [0, .13]], m.plain, C.cream, 12);
    b.rod([0, .10, 0], [0, 3.2, 0], .025, m.metal, C.wood, 8, .018);
    for (const y of [.17, 1.62, 3.16]) disc(THREE, b, [0, y, 0], .033, .035, m.metal, C.dark, 8);
    const sock = marker(THREE, group, 'sock', [0, 3.2, 0]);
    const sb = workshop(THREE, kit, sock);
    // 轉軸在原點；吊架與開口都稍退到 −Z，旋轉後整袋仍在下風側。
    sb.rod([0, -.012, -.016], [0, -.02, -.045], .006, m.metal, C.ink, 5);
    sb.put(new THREE.TorusGeometry(.18, .008, 4, 12), m.fabric, [0, -.20, -.045], [0, 0, 0], C.cream);
    const at = (t, j) => {
      const a = j * TAU / 12, radius = .18 - .137 * t;
      return [Math.cos(a) * radius, -.20 - .12 * t + Math.sin(a) * radius, -.045 - 1.055 * t];
    };
    // 開口與尾口都中空；六道環帶，雙面內襯同樣紅白相間。
    for (let k = 0; k < 6; k++) for (let j = 0; j < 12; j++) quad(THREE, sb, [at(k / 6, j), at(k / 6, j + 1), at((k + 1) / 6, j + 1), at((k + 1) / 6, j)], m.fabric, k % 2 ? C.cream : C.coral);
    for (const j of [0, 6]) sb.rod(at(0, j), at(1, j), .002, m.fabric, C.cream, 4);
    sb.finish(); return b.finish();
  };

  I.KITEMODELS.kf_kite_diamond = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_kite_diamond';
    const b = workshop(THREE, kit, group), m = palette(b);
    littleKite(THREE, b, m, [0, -.02, .035], .9, 1.1);
    // 四瓣紙面上另有奶油色細菱形，背面可見完整十字竹骨。
    for (const s of [-1, 1]) {
      triangle(THREE, b, [[0, .36, .024], [s * .27, .046, .024], [0, .17, .024]], m.fabric, C.cream);
      triangle(THREE, b, [[0, -.40, .024], [s * .27, .046, .024], [0, -.18, .024]], m.fabric, C.cream);
    }
    bridle(b, m, [[0, .36, .04], [0, -.26, .04]]);
    chain(THREE, kit, group, m, 'tail', '', 6, .22, .018, [C.coral, C.sun, C.teal, C.sky, C.pink, C.violet], [0, -.57, .035], true);
    return flying(b);
  };

  I.KITEMODELS.kf_kite_delta = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_kite_delta';
    const b = workshop(THREE, kit, group), m = palette(b);
    const apex = [0, .44, .065], keel = [0, -.36, .01];
    for (const s of [-1, 1]) {
      const tip = [s * .70, -.36, .105], shoulder = [s * .39, -.13, .05];
      triangle(THREE, b, [apex, tip, shoulder], m.fabric, s < 0 ? C.teal : C.coral);
      triangle(THREE, b, [apex, shoulder, keel], m.fabric, C.sun);
      triangle(THREE, b, [keel, shoulder, tip], m.fabric, s < 0 ? C.sky : C.violet);
      triangle(THREE, b, [[s * .10, .24, .044], [s * .51, -.26, .044], [s * .40, -.26, .044]], m.fabric, C.cream);
      b.rod(apex, tip, .007, m.wood, C.wood, 5);
      b.rod([0, -.10, .085], [s * .47, -.10, .085], .006, m.wood, C.dark, 4);
    }
    b.rod([0, .44, .08], [0, -.36, .08], .009, m.wood, C.wood, 6);
    bridle(b, m, [[0, .27, .07], [0, -.25, .015]]);
    chain(THREE, kit, group, m, 'tail_l', 'l_', 4, .27, .065, [C.teal, C.sky, C.teal, C.cream], [-.62, -.36, .095]);
    chain(THREE, kit, group, m, 'tail_r', 'r_', 4, .27, .065, [C.coral, C.sun, C.coral, C.cream], [.62, -.36, .095]);
    return flying(b);
  };

  I.KITEMODELS.kf_kite_box = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_kite_box';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 箱型為必要立體例外：.5 × 1.0 × .5；提線點在前面中央。
    const corners = [[-.25, .035], [.25, .035], [.25, .535], [-.25, .535]];
    for (const [x, z] of corners) b.rod([x, -.50, z], [x, .50, z], .008, m.wood, C.wood, 5);
    for (const y of [-.5, -.19, .19, .5]) for (let j = 0; j < 4; j++) {
      const a = corners[j], c = corners[(j + 1) % 4];
      b.rod([a[0], y, a[1]], [c[0], y, c[1]], .006, m.wood, C.dark, 4);
    }
    for (let band = 0; band < 2; band++) {
      const y = band ? .19 : -.5;
      for (let j = 0; j < 4; j++) {
        const a = corners[j], c = corners[(j + 1) % 4], color = [C.teal, C.sun, C.coral, C.sky][(j + band * 2) % 4];
        const point = (t, h, edge = 0) => [a[0] + (c[0] - a[0]) * t + [0, edge, 0, -edge][j], h, a[1] + (c[1] - a[1]) * t + [-edge, 0, edge, 0][j]];
        quad(THREE, b, [point(0, y), point(1, y), point(1, y + .31), point(0, y + .31)], m.fabric, color);
        // 布圈上下窄滾邊；中央保持透空、兩端不封蓋。
        for (const dy of [.012, .286]) quad(THREE, b, [point(0, y + dy, .001), point(1, y + dy, .001), point(1, y + dy + .012, .001), point(0, y + dy + .012, .001)], m.fabric, C.cream);
      }
    }
    for (const y of [-.5, .5]) {
      b.rod([-.25, y, .035], [.25, y, .535], .005, m.wood, C.wood, 4);
      b.rod([.25, y, .035], [-.25, y, .535], .005, m.wood, C.wood, 4);
    }
    bridle(b, m, [[-.25, .34, .03], [.25, -.34, .03]]);
    return flying(b);
  };

  I.KITEMODELS.kf_kite_fish = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_kite_fish';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 魚頭朝 +Y，胖身與側鰭構成 1.0 × .8 紙面，尾鰭沿 −Y 可逐節擺動。
    const outline = [[0, .40, .04], [.19, .36, .04], [.31, .18, .04], [.32, -.04, .04], [.20, -.27, .04], [0, -.40, .04], [-.20, -.27, .04], [-.32, -.04, .04], [-.31, .18, .04], [-.19, .36, .04]];
    for (let j = 0; j < outline.length; j++) triangle(THREE, b, [[0, .015, .027], outline[j], outline[(j + 1) % outline.length]], m.fabric, j < 5 ? C.coral : C.sun);
    for (const s of [-1, 1]) {
      triangle(THREE, b, [[s * .27, .16, .04], [s * .5, -.12, .05], [s * .24, -.22, .04]], m.fabric, C.teal);
      triangle(THREE, b, [[s * .29, .02, .027], [s * .43, -.10, .037], [s * .27, -.15, .027]], m.fabric, C.cream);
      b.put(new THREE.CircleGeometry(.063, 12), m.fabric, [s * .17, .23, .018], [0, PI, 0], C.cream);
      b.put(new THREE.CircleGeometry(.029, 10), m.fabric, [s * .17, .24, .015], [0, PI, 0], C.ink);
      b.put(new THREE.CircleGeometry(.009, 6), m.fabric, [s * .162, .251, .012], [0, PI, 0], C.cream);
      for (let j = 0; j < 3; j++) polygon(THREE, b, [[s * .06, -.04 - j * .085, .016], [s * .14, -.075 - j * .085, .016], [s * .22, -.04 - j * .085, .016], [s * .14, -.11 - j * .085, .016]], m.fabric, j % 2 ? C.pink : C.cream);
    }
    b.rod([0, -.40, .057], [0, .40, .057], .007, m.wood, C.wood, 5);
    b.rod([-.48, -.105, .057], [.48, -.105, .057], .006, m.wood, C.wood, 4);
    bridle(b, m, [[0, .30, .035], [0, -.28, .035]]);
    chain(THREE, kit, group, m, 'tail', '', 4, .13, .07, [C.teal, C.sky, C.teal, C.coral], [0, -.40, .04], false, (tb, j) => {
      if (j !== 3) return;
      polygon(THREE, tb, [[0, -.04, -.004], [.22, -.19, -.004], [.11, -.22, -.004], [0, -.14, -.004], [-.11, -.22, -.004], [-.22, -.19, -.004]], m.fabric, C.teal);
      triangle(THREE, tb, [[0, -.06, -.007], [.15, -.18, -.007], [0, -.12, -.007]], m.fabric, C.cream);
    });
    return flying(b);
  };

  I.KITEMODELS.kf_kite_bird = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_kite_bird';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 兩翼各一張不重疊紙面；沿 X 外折，扇形羽尖與奶油色翼帶。
    for (const s of [-1, 1]) {
      const edge = [[.08, .13], [.40, .31], [.80, .39], [.73, .10], [.76, -.05], [.63, -.015], [.59, -.15], [.47, -.07], [.40, -.19], [.28, -.10], [.10, -.08]];
      const shape = new THREE.Shape();
      edge.forEach(([x, y], j) => j ? shape.lineTo(s * x, y) : shape.moveTo(s * x, y)); shape.closePath();
      const wing = new THREE.ShapeGeometry(shape), positions = wing.attributes.position;
      const depth = x => .03 + Math.abs(x) * .1375;
      for (let j = 0; j < positions.count; j++) positions.setZ(j, depth(positions.getX(j)));
      wing.computeVertexNormals(); b.add(wing, m.fabric, C.coral);
      const at = (x, y, offset = -.002) => [s * x, y, depth(x) + offset];
      triangle(THREE, b, [at(.14, .14), at(.70, .32), at(.41, .16)], m.fabric, C.cream);
      for (let j = 0; j < 3; j++) {
        const a = [[.28, -.10], [.40, -.19], [.47, -.07], [.59, -.15], [.63, -.015], [.76, -.05]];
        triangle(THREE, b, [at(a[j * 2][0], a[j * 2][1]), at(a[j * 2 + 1][0], a[j * 2 + 1][1]), at(.35 + j * .14, .04 + j * .045)], m.fabric, j % 2 ? C.sky : C.teal);
      }
      b.rod([0, .10, .06], [s * .40, .29, .094], .007, m.wood, C.wood, 4);
      b.rod([s * .40, .29, .094], [s * .79, .38, .149], .006, m.wood, C.wood, 4);
    }
    polygon(THREE, b, [[-.10, .25, .021], [-.075, .39, .021], [0, .44, .021], [.075, .39, .021], [.10, .25, .021], [.075, -.20, .021], [.21, -.39, .021], [0, -.32, .021], [-.21, -.39, .021], [-.075, -.20, .021]], m.fabric, C.cream);
    triangle(THREE, b, [[-.036, .326, .005], [0, .258, .005], [.036, .326, .005]], m.fabric, C.sun);
    for (const s of [-1, 1]) b.put(new THREE.CircleGeometry(.014, 6), m.fabric, [s * .043, .35, .01], [0, PI, 0], C.ink);
    b.rod([0, -.32, .06], [0, .42, .06], .008, m.wood, C.dark, 5);
    bridle(b, m, [[0, .30, .025], [0, -.20, .025]]);
    return flying(b);
  };

  I.KITEMODELS.kf_stake = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_stake';
    const b = workshop(THREE, kit, group), m = palette(b);
    b.rod([0, .025, 0], [0, .51, 0], .027, m.wood, C.wood, 6, .022);
    b.lathe([0, 0, 0], [[0, 0], [.075, 0], [.075, .022], [.035, .036], [0, .036]], m.plain, C.dark, 8);
    spool(THREE, b, m, [0, .47, 0], .075, .12, C.teal);
    b.rod([-.11, .48, 0], [.11, .48, 0], .012, m.wood, C.dark, 6);
    b.ball([0, .535, 0], [.024, .015, .024], m.wood, C.wood, 8);
    marker(THREE, group, 'exit', [0, .54, -.056]);
    return b.finish();
  };

  I.KITEMODELS.kf_spool = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_spool';
    const b = workshop(THREE, kit, group), m = palette(b);
    // 握把中心就是手部原點，線軸在上、握把向 −Y 延伸。
    b.lathe([0, 0, 0], [[0, -.06], [.017, -.06], [.021, -.05], [.017, .025], [.022, .04], [0, .04]], m.wood, C.wood, 8);
    for (const y of [-.038, -.015, .008]) disc(THREE, b, [0, y, 0], .0185, .007, m.wood, C.dark, 8);
    spool(THREE, b, m, [0, .09, 0], .06, .10, C.coral);
    marker(THREE, group, 'exit', [0, .14, -.046]);
    return b.finish();
  };

  I.KITEMODELS.kf_mat = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'kf_mat';
    const b = workshop(THREE, kit, group), m = palette(b);
    b.box([0, .006, 0], [1.6, .012, 1.2], m.fabric, C.cream, [0, 0, 0], .003);
    // 無貼圖棋盤與兩道織邊；格面最高 .014，包含流蘇仍不超過 .03。
    for (let x = 0; x < 8; x++) for (let z = 0; z < 6; z++) {
      const color = x % 2 && z % 2 ? C.teal : (x + z) % 2 ? C.blue : C.cream;
      quad(THREE, b, [[-.76 + x * .19, .013, -.56 + z * .186], [-.57 + x * .19, .013, -.56 + z * .186], [-.57 + x * .19, .013, -.374 + z * .186], [-.76 + x * .19, .013, -.374 + z * .186]], m.fabric, color);
    }
    for (const z of [-.575, .575]) b.box([0, .014, z], [1.55, .002, .012], m.fabric, C.pink);
    for (const s of [-1, 1]) for (let j = 0; j < 13; j++) b.rod([s * .775, .01, -.53 + j * .088], [s * .82, .01, -.53 + j * .088], .003, m.fabric, C.cream, 4);
    // 低多邊形藤籃：收腰輪廓、兩層編帶、縱條與實際中空提把。
    b.lathe([-.43, .014, .25], [[0, 0], [.14, 0], [.18, .05], [.19, .20], [.18, .22], [0, .22]], m.wood, C.wood, 12);
    for (const y of [.08, .15, .226]) b.put(new THREE.TorusGeometry(.185, .008, 4, 12), m.wood, [-.43, y, .25], [PI / 2, 0, 0], C.gold);
    for (let j = 0; j < 12; j++) {
      const a = j * TAU / 12;
      b.rod([-.43 + Math.cos(a) * .15, .04, .25 + Math.sin(a) * .15], [-.43 + Math.cos(a) * .188, .21, .25 + Math.sin(a) * .188], .005, m.wood, C.dark, 4);
    }
    b.put(new THREE.TorusGeometry(.15, .013, 4, 12, PI), m.wood, [-.43, .228, .25], [0, 0, 0], C.dark);
    // 水壺與小杯用不透明釉色，避免透明排序；壺嘴朝攤前 −Z。
    b.lathe([.38, .014, .29], [[0, 0], [.085, 0], [.10, .04], [.09, .22], [.046, .25], [.043, .28], [0, .28]], m.plain, C.blue, 10);
    disc(THREE, b, [.38, .304, .29], .052, .025, m.plain, C.cream, 10);
    b.rod([.38, .20, .21], [.38, .25, .10], .023, m.plain, C.blue, 6, .017);
    b.put(new THREE.TorusGeometry(.074, .012, 4, 12), m.plain, [.46, .17, .30], [0, PI / 2, 0], C.cream);
    b.lathe([.58, .014, .08], [[0, 0], [.035, 0], [.044, .065], [.036, .065], [.029, .009], [0, .009]], m.plain, C.pink, 10);
    // 摺疊的紙風箏成窄扇束，竹骨與束帶可辨認。
    for (let j = 0; j < 3; j++) {
      const y = .025 + j * .007;
      triangle(THREE, b, [[-.30, y, -.30], [.26, y, -.38 + j * .024], [.19, y, -.15 + j * .014]], m.fabric, [C.teal, C.sun, C.coral][j]);
      b.rod([-.30, y + .004, -.30], [.26, y + .004, -.38 + j * .024], .004, m.wood, C.dark, 4);
    }
    b.box([.04, .053, -.29], [.035, .012, .16], m.fabric, C.cream, [0, -.08, 0]);
    return b.finish();
  };
})(typeof window !== 'undefined' ? window : globalThis);
