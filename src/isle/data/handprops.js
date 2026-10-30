/* 潮汐小島 · v8.9 島民做事時拿的小道具（程式化模型）：TA.ISLE.HANDPROPS[id] = (THREE, kit) => THREE.Group。
   單位公尺；各工廠回傳的群組不平移，原點就是手握／托住的位置。
   書頁、紙卡與素描面朝 +Y；書脊沿 Z，書脊底面中心為原點。
   木板與素描本的底邊在 z = 0，往 -Z 展開；字卡的捏角在原點。
   長柄沿 +Y；毛筆、鉛筆的尖端及湯杓的碗在 -Y。琴弦朝 +Z，琴頸握點為原點。
   杯把握點為原點、杯身在 +X；線軸沿 X；鈴鼓面沿 ±Z、握點在鼓的 -X 邊。
   所有細節皆為固定幾何，不使用貼圖或隨機數；共用的 kit.mat 材質只讀。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.HANDPROPS = I.HANDPROPS || {};

  // 與 toolmodels 一樣按材質合併靜態零件，將局部變換烘焙到握點座標。
  function finish(THREE, group) {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert(), buckets = new Map(), source = [];
    const matrix = new THREE.Matrix4(), normal = new THREE.Matrix3();
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    group.traverse(mesh => {
      if (!mesh.isMesh) return;
      source.push(mesh.geometry);
      matrix.multiplyMatrices(inverse, mesh.matrixWorld); normal.getNormalMatrix(matrix);
      const geo = mesh.geometry, P = geo.attributes.position, N = geo.attributes.normal, indices = geo.index;
      if (!buckets.has(mesh.material)) buckets.set(mesh.material, { positions: [], normals: [], names: [] });
      const batch = buckets.get(mesh.material); batch.names.push(mesh.name);
      for (let j = 0, count = indices ? indices.count : P.count; j < count; j++) {
        const i = indices ? indices.getX(j) : j;
        p.fromBufferAttribute(P, i).applyMatrix4(matrix); batch.positions.push(p.x, p.y, p.z);
        n.fromBufferAttribute(N, i).applyMatrix3(normal).normalize(); batch.normals.push(n.x, n.y, n.z);
      }
    });
    group.clear();
    for (const geo of new Set(source)) geo.dispose();
    for (const [material, batch] of buckets) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material); mesh.name = batch.names.join(' + ');
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    }
    return group;
  }

  // 小型建模工具只建立幾何，不複製／修改材質。所有面數均由呼叫端明確控制。
  function model(THREE, kit, name) {
    const group = new THREE.Group(); group.name = 'island-handprop-' + name;
    const mat = (color, options) => kit.mat(color, Object.assign({ roughness: 0.78, metalness: 0 }, options));
    function add(name, geometry, material, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name;
      mesh.position.set(x, y, z); group.add(mesh); return mesh;
    }
    const box = (name, w, h, d, material, x = 0, y = 0, z = 0) => add(name, new THREE.BoxGeometry(w, h, d), material, x, y, z);
    const cyl = (name, r1, r2, h, material, x = 0, y = 0, z = 0, sides = 10) => add(name, new THREE.CylinderGeometry(r1, r2, h, sides), material, x, y, z);
    function lathe(name, profile, material, x = 0, y = 0, z = 0, sides = 12) {
      return add(name, new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), sides), material, x, y, z);
    }
    function tube(name, points, radius, material, steps = 8, sides = 5) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      return add(name, new THREE.TubeGeometry(curve, steps, radius, sides, false), material);
    }
    function line(name, a, b, radius, material, sides = 6) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
      const mesh = cyl(name, radius, radius, delta.length(), material, 0, 0, 0, sides);
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return mesh;
    }
    function solid(name, shape, depth, material, x = 0, y = 0, z = 0, bevel = 0, segments = 3) {
      return add(name, new THREE.ExtrudeGeometry(shape, {
        depth, steps: 1, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
        bevelSegments: 1, curveSegments: segments
      }), material, x, y, z);
    }
    function rect(w, h, r) {
      const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
    }
    function slab(name, w, d, h, radius, material, x = 0, y = 0, z = 0) {
      const mesh = solid(name, rect(w, d, radius), h, material, x, y, z);
      mesh.rotation.x = -Math.PI / 2; return mesh;
    }
    // 單面細節的繞序朝 +Y；墨線與紙面隔開，避免共面閃爍。
    function ink(name, points, width, material) {
      const positions = [];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[2] - a[2];
        const length = Math.hypot(dx, dz), ox = -dz / length * width / 2, oz = dx / length * width / 2;
        const v = [[a[0] + ox, a[1], a[2] + oz], [b[0] + ox, b[1], b[2] + oz],
          [b[0] - ox, b[1], b[2] - oz], [a[0] - ox, a[1], a[2] - oz]];
        positions.push(...v[0], ...v[1], ...v[2], ...v[0], ...v[2], ...v[3]);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals(); return add(name, geo, material);
    }
    return { group, mat, add, box, cyl, lathe, tube, line, solid, rect, slab, ink, done: () => finish(THREE, group) };
  }

  I.HANDPROPS.book = function (THREE, kit) {
    const m = model(THREE, kit, 'book');
    const cover = m.mat('#41686c'), paper = m.mat('#f5ead4'), edge = m.mat('#ddcfaf');
    const gold = m.mat('#d8be85', { metalness: 0.25 }), text = m.mat('#cec9b5'), ribbon = m.mat('#cf8e9a');
    for (const s of [-1, 1]) {
      m.slab('rounded-hardback', .12, .17, .004, .005, cover, s * .06, 0, 0);
      const shape = new THREE.Shape();
      shape.moveTo(s * .004, .005); shape.lineTo(s * .114, .005); shape.lineTo(s * .114, .023);
      shape.quadraticCurveTo(s * .065, .032, s * .004, .018); shape.closePath();
      m.solid('curved-cream-page-block', shape, .16, paper, 0, 0, -.08, 0, 6);
      for (let i = 0; i < 3; i++) m.box('page-edge-layers', .104, .0005, .0004, edge, s * .059, .009 + i * .0037, .0803);
      const pageY = x => {
        // 與上方二次曲線的 x(t) 配對（控制點 x = .065）。
        const u = (.122 - Math.sqrt(.122 * .122 - .048 * (Math.abs(x) - .004))) / .024;
        return .018 * (1 - u) * (1 - u) + .064 * u * (1 - u) + .023 * u * u + .0004;
      };
      // 用相同曲線取樣，讓細淡文字服貼起伏的書頁。
      for (let row = 0; row < 6; row++) {
        const pts = [], start = row === 0 ? .028 : .02, end = row === 5 ? .078 : .099;
        for (let j = 0; j <= 5; j++) { const x = start + (end - start) * j / 5; pts.push([s * x, pageY(x), -.051 + row * .018]); }
        m.ink('faint-page-text', pts, row === 0 ? .0017 : .001, text);
      }
      for (const z of [-.073, .073]) m.box('gilt-cover-corner', .015, .0006, .003, gold, s * .105, .0044, z);
    }
    const spine = m.cyl('rounded-cloth-spine', .008, .008, .16, cover, 0, .008, 0); spine.rotation.x = Math.PI / 2;
    m.box('silk-bookmark', .009, .0006, .041, ribbon, .012, .005, .070);
    return m.done();
  };

  I.HANDPROPS.scroll = function (THREE, kit) {
    const m = model(THREE, kit, 'scroll');
    const wood = m.mat('#c7a67e'), rim = m.mat('#ad8e6d'), paper = m.mat('#f7eedc');
    const ink = m.mat('#b9b9b0'), brass = m.mat('#cbb781', { metalness: .25 }), mint = m.mat('#b4c9bb');
    m.slab('rounded-writing-board', .20, .28, .009, .009, wood, 0, -.009, -.14);
    m.slab('rice-paper', .18, .252, .001, .003, paper, 0, .0003, -.139);
    for (const x of [-.094, .094]) m.box('wood-inlay', .0012, .0004, .245, rim, x, .0003, -.14);
    m.slab('brass-paper-clip', .055, .018, .005, .004, brass, 0, .0015, -.263);
    m.box('mint-clip-enamel', .038, .001, .006, mint, 0, .007, -.263);
    // 三行分開的簡化筆畫，不把裝飾冒充可讀文字。
    for (let row = 0; row < 3; row++) {
      const z = -.213 + row * .047;
      for (let col = 0; col < 4 - (row === 2 ? 1 : 0); col++) {
        const x = -.063 + col * .035;
        m.ink('pale-ink-horizontal', [[x, .0017, z], [x + .022, .0017, z + .002]], .0015, ink);
        m.ink('pale-ink-falling-stroke', [[x + .014, .0017, z - .008], [x + .011, .0017, z + .011], [x + .004, .0017, z + .014]], .0011, ink);
      }
    }
    return m.done();
  };

  I.HANDPROPS.brush = function (THREE, kit) {
    const m = model(THREE, kit, 'brush');
    const bamboo = m.mat('#caae7d'), nodes = m.mat('#ad906a'), ferrule = m.mat('#68716b');
    const hair = m.mat('#383e48', { roughness: .9 }), highlight = m.mat('#656474');
    m.cyl('bamboo-shaft-20cm', .005, .006, .20, bamboo, 0, .045, 0);
    for (const y of [-.02, .087, .139]) m.cyl('bamboo-node', .0062, .0062, .003, nodes, 0, y, 0);
    m.cyl('brush-ferrule', .0065, .0065, .015, ferrule, 0, -.050, 0);
    m.lathe('pointed-black-bristles', [[0, -.090], [.002, -.083], [.0055, -.072], [.0062, -.060], [.0058, -.055], [0, -.055]], hair, 0, 0, 0, 10);
    m.line('bristle-sheen', [.001, -.080, .0028], [.002, -.060, .0058], .0005, highlight, 4);
    m.cyl('end-cap', .0058, .0058, .004, ferrule, 0, .143, 0);
    return m.done();
  };

  I.HANDPROPS.cards = function (THREE, kit) {
    const m = model(THREE, kit, 'cards');
    const paper = m.mat('#f9efdf'), edge = m.mat('#e8dcc8'), mint = m.mat('#bad3c8');
    const rose = m.mat('#e8bec9'), lavender = m.mat('#c7bfdc'), ink = m.mat('#b5b6bc');
    for (let i = 0; i < 4; i++) {
      m.slab('stacked-card', .09, .06, .001, .003, i % 2 ? paper : edge, .045, i * .0013, -.03);
    }
    // 上面一張以捏角為轉軸，而非繞卡片中心偏移。
    const top = new THREE.Group(); m.group.add(top);
    const from = m.group.children.length;
    m.slab('fanned-top-card', .09, .06, .001, .003, paper, .045, .006, -.03);
    m.ink('pastel-top-border', [[.006, .0072, -.054], [.084, .0072, -.054]], .0045, mint);
    m.ink('pastel-bottom-border', [[.006, .0072, -.006], [.084, .0072, -.006]], .002, rose);
    m.ink('word-mark', [[.022, .00725, -.031], [.065, .00725, -.031]], .0015, ink);
    m.ink('word-mark-short', [[.031, .00725, -.024], [.057, .00725, -.024]], .001, lavender);
    const parts = m.group.children.slice(from); for (const mesh of parts) top.add(mesh);
    top.rotation.y = -.11;
    return m.done();
  };

  I.HANDPROPS.violin = function (THREE, kit) {
    const m = model(THREE, kit, 'violin');
    const varnish = m.mat('#ac6651', { roughness: .34 }), ribs = m.mat('#854d46', { roughness: .44 });
    const edge = m.mat('#d19a70'), ebony = m.mat('#454550'), strings = m.mat('#dfcfb0', { metalness: .3 });
    const bridge = m.mat('#ddbd8c'), holes = m.mat('#633f43');
    // 真正的收腰輪廓：上／下琴腹、C 形腰、角尖，非三顆相疊橢圓。
    const outline = new THREE.Shape(); outline.moveTo(0, -.168);
    outline.bezierCurveTo(.051, -.168, .087, -.190, .080, -.231);
    outline.quadraticCurveTo(.078, -.250, .061, -.261); outline.lineTo(.073, -.266);
    outline.bezierCurveTo(.035, -.280, .036, -.309, .078, -.322); outline.lineTo(.067, -.329);
    outline.bezierCurveTo(.115, -.358, .113, -.431, .075, -.461);
    outline.quadraticCurveTo(.045, -.480, 0, -.480);
    outline.quadraticCurveTo(-.045, -.480, -.075, -.461);
    outline.bezierCurveTo(-.113, -.431, -.115, -.358, -.067, -.329); outline.lineTo(-.078, -.322);
    outline.bezierCurveTo(-.036, -.309, -.035, -.280, -.073, -.266); outline.lineTo(-.061, -.261);
    outline.quadraticCurveTo(-.078, -.250, -.080, -.231);
    outline.bezierCurveTo(-.087, -.190, -.051, -.168, 0, -.168); outline.closePath();
    m.solid('red-brown-ribbed-body', outline, .041, ribs, 0, 0, -.022, 0, 3);
    m.solid('carved-soundboard', outline, .003, varnish, 0, 0, .020, .002, 3);
    m.solid('maple-back-edge', outline, .002, edge, 0, 0, -.025, 0, 3);
    m.box('maple-neck', .025, .244, .025, edge, 0, -.066, -.003);
    const fingerboard = new THREE.Shape();
    fingerboard.moveTo(-.012, .050); fingerboard.lineTo(.012, .050); fingerboard.lineTo(.019, -.273); fingerboard.lineTo(-.019, -.273); fingerboard.closePath();
    m.solid('tapered-ebony-fingerboard', fingerboard, .006, ebony, 0, 0, .025);
    m.box('peg-box', .026, .056, .025, varnish, 0, .072, 0);
    m.box('peg-box-recess', .010, .035, .001, ebony, 0, .071, .013);
    for (let i = 0; i < 4; i++) {
      const s = i % 2 ? -1 : 1, y = .052 + i * .012;
      const peg = m.cyl('tuning-peg', .004, .004, .040, ebony, 0, y, 0, 6); peg.rotation.z = Math.PI / 2;
      const key = m.add('peg-key', new THREE.SphereGeometry(1, 6, 3), ebony, s * .023, y, 0); key.scale.set(.006, .008, .004);
    }
    const scroll = m.cyl('carved-scroll', .014, .014, .027, varnish, 0, .106, 0, 10); scroll.rotation.z = Math.PI / 2;
    const curl = m.add('scroll-spiral', new THREE.TorusGeometry(.007, .002, 4, 8, Math.PI * 1.7), edge, .014, .106, 0); curl.rotation.y = Math.PI / 2;
    const tail = new THREE.Shape(); tail.moveTo(-.011, -.443); tail.lineTo(.011, -.443); tail.lineTo(.020, -.365); tail.lineTo(-.020, -.365); tail.closePath();
    m.solid('ebony-tailpiece', tail, .006, ebony, 0, 0, .027);
    m.box('arched-maple-bridge', .047, .009, .006, bridge, 0, -.336, .032);
    for (const x of [-.017, .017]) m.box('bridge-feet', .008, .010, .005, bridge, x, -.337, .026);
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * .005;
      m.line('four-fine-strings', [x, -.408, .036], [x, .042, .034], .00065, strings, 4);
    }
    for (const s of [-1, 1]) {
      m.tube('f-sound-hole', [[s * .047, -.300, .0255], [s * .039, -.306, .0255], [s * .048, -.324, .0255], [s * .044, -.347, .0255], [s * .055, -.353, .0255]], .0022, holes, 6, 4);
      m.line('f-hole-crossbar', [s * .040, -.325, .026], [s * .054, -.326, .026], .001, holes, 4);
    }
    const chin = m.add('ebony-chin-rest', new THREE.SphereGeometry(1, 10, 4), ebony, -.044, -.449, .031); chin.scale.set(.036, .020, .007);
    return m.done();
  };

  I.HANDPROPS.bow = function (THREE, kit) {
    const m = model(THREE, kit, 'bow');
    const wood = m.mat('#a87964', { roughness: .48 }), hair = m.mat('#eee1c6'), ebony = m.mat('#53515b');
    const silver = m.mat('#c8c5b9', { metalness: .32 });
    m.tube('cambered-bow-stick', [[.004, -.024, 0], [.010, .10, 0], [.016, .33, 0], [.012, .55, 0], [.004, .704, 0]], .0035, wood, 18, 6);
    m.box('flat-horsehair-ribbon', .0016, .693, .009, hair, -.009, .3375, 0);
    m.box('ebony-frog', .019, .035, .014, ebony, -.003, .006, 0);
    m.box('frog-metal-band', .020, .004, .015, silver, -.003, .022, 0);
    m.cyl('adjusting-screw', .005, .005, .014, silver, .004, -.027, 0, 8);
    const tip = new THREE.Shape(); tip.moveTo(-.011, .684); tip.lineTo(.008, .701); tip.lineTo(.003, .706); tip.lineTo(-.011, .699); tip.closePath();
    m.solid('ivory-bow-tip', tip, .010, hair, 0, 0, -.005);
    for (let i = 0; i < 5; i++) m.cyl('grip-winding', .0043, .0043, .0024, silver, .007, .036 + i * .004, 0, 8);
    return m.done();
  };

  I.HANDPROPS.sketchbook = function (THREE, kit) {
    const m = model(THREE, kit, 'sketchbook');
    const cover = m.mat('#93b5b0'), paper = m.mat('#f7edd9'), edge = m.mat('#deceb4');
    const coast = m.mat('#b0bbc0'), contour = m.mat('#ced1bf'), brass = m.mat('#c8b789', { metalness: .25 });
    m.slab('open-sketchbook-cover', .25, .33, .004, .007, cover, 0, -.008, -.165);
    m.slab('thick-drawing-paper', .239, .318, .005, .004, paper, 0, -.003, -.164);
    m.box('binding-fold', .002, .0004, .312, edge, 0, .0024, -.164);
    for (let i = 0; i < 6; i++) {
      const ring = m.add('small-binding-ring', new THREE.TorusGeometry(.004, .0008, 4, 8), brass, 0, .002, -.035 - i * .052);
      ring.rotation.y = Math.PI / 2;
    }
    m.ink('coastline-sketch', [[-.097,.0027,-.273],[-.076,.0027,-.257],[-.072,.0027,-.227],[-.047,.0027,-.209],[-.056,.0027,-.178],[-.025,.0027,-.151],[.002,.0027,-.145],[.034,.0027,-.119],[.074,.0027,-.116],[.098,.0027,-.086]], .0014, coast);
    for (let i = 0; i < 4; i++) {
      const x = .029 + i * .013, z = -.240 + i * .010;
      m.ink('contour-map-lines', [[x-.033,.0028,z-.026],[x-.014,.0028,z-.047],[x+.012,.0028,z-.044],[x+.027,.0028,z-.019],[x+.022,.0028,z+.011],[x+.002,.0028,z+.026],[x-.026,.0028,z+.014],[x-.033,.0028,z-.026]], .0008, contour);
    }
    for (let i = 0; i < 3; i++) m.ink('sea-ripples', [[-.097,.0027,-.115+i*.016],[-.081,.0027,-.118+i*.016],[-.064,.0027,-.114+i*.016]], .0008, coast);
    m.ink('map-north-arrow', [[.085,.0028,-.052],[.085,.0028,-.023],[.079,.0028,-.034]], .001, coast);
    return m.done();
  };

  I.HANDPROPS.pencil = function (THREE, kit) {
    const m = model(THREE, kit, 'pencil');
    const paint = m.mat('#b9c8a2'), wood = m.mat('#dfbf91'), graphite = m.mat('#53515d');
    const metal = m.mat('#c7bdaf', { metalness: .3 }), eraser = m.mat('#dfaeba');
    m.cyl('hexagonal-painted-pencil', .0037, .0037, .125, paint, 0, .0025, 0, 6);
    m.cyl('sharpened-wood', .0037, .0009, .012, wood, 0, -.066, 0, 6);
    m.cyl('graphite-point', .0009, 0, .003, graphite, 0, -.0735, 0, 6);
    m.cyl('eraser-ferrule', .0039, .0039, .005, metal, 0, .0665, 0, 8);
    m.cyl('pastel-eraser', .0037, .0039, .006, eraser, 0, .072, 0, 8);
    return m.done();
  };

  I.HANDPROPS.wrench = function (THREE, kit) {
    const m = model(THREE, kit, 'wrench');
    const steel = m.mat('#b3bdc1', { roughness: .48, metalness: .48 }), light = m.mat('#d0d6d3', { metalness: .4 });
    const brass = m.mat('#c7ac79', { metalness: .35 }), grip = m.mat('#a5bcb5'), dark = m.mat('#7f9197');
    const handle = m.rect(.025, .168, .011);
    const hole = new THREE.Path(); hole.absarc(0, -.067, .005, 0, Math.PI * 2, true); handle.holes.push(hole);
    m.solid('rounded-handle-with-hanging-hole', handle, .009, steel, 0, -.002, -.0045, 0, 5);
    m.box('mint-grip-inlay', .014, .102, .001, grip, 0, -.009, .0055);
    // 不封口的固定鉗口，右側活動鉗口另外建模。
    const head = new THREE.Shape();
    head.moveTo(-.012,.066); head.lineTo(-.031,.092); head.lineTo(-.035,.129);
    head.lineTo(-.021,.163); head.lineTo(-.006,.164); head.lineTo(-.011,.128);
    head.lineTo(.010,.112); head.lineTo(.025,.120); head.lineTo(.035,.111);
    head.lineTo(.026,.083); head.lineTo(.011,.066); head.closePath();
    m.solid('open-fixed-jaw', head, .014, steel, 0, 0, -.007, .001);
    const jaw = new THREE.Shape(); jaw.moveTo(.014,.115); jaw.lineTo(.007,.139); jaw.lineTo(.016,.155); jaw.lineTo(.032,.141); jaw.lineTo(.035,.120); jaw.closePath();
    m.solid('sliding-adjustable-jaw', jaw, .014, light, 0, 0, -.007);
    m.box('jaw-slide', .013, .028, .017, dark, .013, .108, 0);
    const worm = m.cyl('brass-adjusting-worm', .008, .008, .023, brass, .003, .094, .009, 10); worm.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const tooth = m.cyl('worm-gear-ridges', .0085, .0085, .001, light, -.006 + i * .0045, .094, .009, 8); tooth.rotation.z = Math.PI / 2;
    }
    return m.done();
  };

  I.HANDPROPS.lens = function (THREE, kit) {
    const m = model(THREE, kit, 'lens');
    const brass = m.mat('#c9ad79', { roughness: .43, metalness: .42 }), grip = m.mat('#91b5ad');
    const glass = m.mat('#c1e5e8', { roughness: .18, transparent: true, opacity: .45, depthWrite: false });
    const glint = m.mat('#e8f3eb', { transparent: true, opacity: .65, depthWrite: false });
    m.cyl('mint-magnifier-grip', .009, .011, .085, grip, 0, .0025, 0, 10);
    m.cyl('brass-grip-cap', .011, .011, .005, brass, 0, -.0375, 0, 10);
    m.cyl('frame-socket', .007, .010, .022, brass, 0, .047, 0, 10);
    m.add('brass-lens-rim', new THREE.TorusGeometry(.048, .003, 6, 24), brass, 0, .102, 0);
    // 正反兩片各自朝外，透明面不用改共用材質的 side。
    m.add('pale-blue-lens-front', new THREE.CircleGeometry(.045, 24), glass, 0, .102, .001);
    const back = m.add('pale-blue-lens-back', new THREE.CircleGeometry(.045, 24), glass, 0, .102, -.001); back.rotation.y = Math.PI;
    m.tube('subtle-glass-highlight', [[-.029,.116,.0018],[-.023,.128,.0018],[-.011,.135,.0018]], .0008, glint, 5, 4);
    return m.done();
  };

  I.HANDPROPS.cup = function (THREE, kit) {
    const m = model(THREE, kit, 'cup');
    const ceramic = m.mat('#e8dacc', { roughness: .35 }), lip = m.mat('#faf0dc', { roughness: .32 });
    const tea = m.mat('#ecb29b', { roughness: .28 }), handle = m.mat('#aecac0', { roughness: .4 });
    const fruit = m.mat('#f3cf91'), leaf = m.mat('#b2c39d');
    // 杯把左側中心穿過原點；陶杯有內壁、杯底與敞開的杯口。
    m.lathe('hollow-ceramic-cup', [[0,-.040],[.030,-.040],[.035,-.036],[.040,.033],[.040,.040],[.0355,.040],[.0355,.033],[.031,-.030],[0,-.030]], ceramic, .063, 0, 0, 16);
    const rim = m.add('cream-rolled-rim', new THREE.TorusGeometry(.0377, .0022, 5, 20), lip, .063, .038, 0); rim.rotation.x = Math.PI / 2;
    m.tube('open-mint-cup-handle', [[.027,.026,0],[.006,.024,0],[0,.009,0],[0,-.010,0],[.009,-.025,0],[.031,-.022,0]], .0045, handle, 16, 6);
    const liquid = m.add('pink-peach-tea-surface', new THREE.CircleGeometry(.0348, 20), tea, .063, .027, 0); liquid.rotation.x = -Math.PI / 2;
    const slice = m.cyl('floating-peach-slice', .010, .010, .002, fruit, .074, .028, -.011, 10); slice.scale.x = .75;
    const mintLeaf = m.add('tea-leaf', new THREE.SphereGeometry(1, 6, 4), leaf, .050, .028, .007); mintLeaf.scale.set(.008, .0007, .004);
    return m.done();
  };

  I.HANDPROPS.ladle = function (THREE, kit) {
    const m = model(THREE, kit, 'ladle');
    const steel = m.mat('#b6c2bf', { roughness: .46, metalness: .36 }), rim = m.mat('#d3dbcf', { metalness: .28 });
    const wood = m.mat('#c7ac88'), mint = m.mat('#a4bfb3');
    m.cyl('wooden-ladle-grip', .009, .009, .12, wood, 0, .020, 0, 10);
    m.cyl('mint-grip-end', .010, .010, .008, mint, 0, .076, 0, 10);
    m.tube('bent-ladle-shaft', [[0,-.037,0],[0,-.116,0],[0,-.188,.003],[0,-.220,.003]], .0045, steel, 10, 6);
    // 回轉剖面從外底到內底，是真正中空的碗，碗口朝 +Y。
    m.lathe('open-soup-bowl', [[0,-.260],[.014,-.258],[.029,-.248],[.040,-.229],[.042,-.218],[.038,-.218],[.036,-.229],[.025,-.244],[.012,-.253],[0,-.254]], steel, 0, 0, .043, 16);
    const lip = m.add('rolled-bowl-lip', new THREE.TorusGeometry(.040, .0022, 5, 20), rim, 0, -.218, .043); lip.rotation.x = Math.PI / 2;
    return m.done();
  };

  I.HANDPROPS.spool = function (THREE, kit) {
    const m = model(THREE, kit, 'spool');
    const wood = m.mat('#c6a57e'), end = m.mat('#dcc098'), thread = m.mat('#eee9d8');
    const winding = m.mat('#d7d7c8'), mint = m.mat('#a7c1b5');
    const axis = mesh => { mesh.rotation.z = Math.PI / 2; return mesh; };
    axis(m.cyl('wooden-axle', .012, .012, .080, wood, 0, 0, 0, 12));
    for (const x of [-.034, .034]) {
      axis(m.lathe('rounded-wooden-flange', [[0,-.006],[.052,-.006],[.060,-.003],[.060,.003],[.052,.006],[0,.006]], end, x, 0, 0, 16));
      axis(m.cyl('mint-axle-button', .014, .014, .001, mint, x < 0 ? -.040 : .040, 0, 0, 12));
    }
    axis(m.cyl('white-thread-core', .047, .047, .055, thread, 0, 0, 0, 16));
    for (let i = 0; i < 6; i++) {
      // 與線芯同為 16 邊，且線圈略高於表面，避免交錯的鋸齒與共面紋。
      const ring = m.add('wound-thread-strands', new THREE.TorusGeometry(.0478, .0007, 3, 16), winding, -.024 + i * .0096, 0, 0); ring.rotation.y = Math.PI / 2;
    }
    m.tube('short-tucked-thread', [[.014,.047,0],[.025,.045,.008],[.030,.037,.014]], .001, thread, 4, 4);
    return m.done();
  };

  I.HANDPROPS.tambourine = function (THREE, kit) {
    const m = model(THREE, kit, 'tambourine');
    const wood = m.mat('#cca78c'), mint = m.mat('#a9c6b8'), skin = m.mat('#f5e5ca');
    const brass = m.mat('#d8c399', { roughness: .42, metalness: .4 }), edge = m.mat('#bba387');
    // 鼓心 x = .12，握點剛好在左邊框 x = 0；鼓面垂直 Z。
    // 木框真正挖出五個側窗，鈸片置於窗內；上下邊條仍連成完整圓環。
    const positions = [], point = (r, a, z) => [.12 + r * Math.cos(a), r * Math.sin(a), z];
    function quad(a, b, c, d, outward) {
      const n = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a));
      n.cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a)));
      if (n.dot(new THREE.Vector3(...outward)) < 0) [a, b, c, d] = [d, c, b, a];
      positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    for (let i = 0; i < 20; i++) {
      const a = .20 - Math.PI / 20 + i * Math.PI / 10, b = a + Math.PI / 10;
      const radial = [Math.cos((a + b) / 2), Math.sin((a + b) / 2), 0];
      for (const z of [-.0225, .0225]) quad(point(.108,a,z), point(.120,a,z), point(.120,b,z), point(.108,b,z), [0,0,z]);
      for (const [lo, hi] of i % 4 === 0 ? [[-.0225,-.014],[.014,.0225]] : [[-.0225,.0225]]) {
        for (const r of [.108, .120]) quad(point(r,a,lo), point(r,b,lo), point(r,b,hi), point(r,a,hi), radial.map(v => r < .11 ? -v : v));
      }
      if (i % 4 === 0) {
        for (const [t, s] of [[a, 1], [b, -1]]) quad(point(.108,t,-.014), point(.120,t,-.014), point(.120,t,.014), point(.108,t,.014), [-s*Math.sin(t),s*Math.cos(t),0]);
      }
    }
    const hoop = new THREE.BufferGeometry(); hoop.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); hoop.computeVertexNormals();
    m.add('five-window-wooden-hoop', hoop, wood);
    m.add('front-drum-skin', new THREE.CircleGeometry(.108, 20), skin, .12, 0, .017);
    const back = m.add('reverse-drum-skin', new THREE.CircleGeometry(.108, 20), skin, .12, 0, .016); back.rotation.y = Math.PI;
    m.add('pastel-skin-binding', new THREE.TorusGeometry(.111, .003, 4, 20), mint, .12, 0, .019);
    // 五對淺盤小鈸各有中心凹陷，前後分離，能從側窗與背面看見。
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + .20, x = .12 + Math.cos(a) * .113, y = Math.sin(a) * .113;
      for (const z of [-.006, .006]) {
        const disc = m.lathe('paired-brass-jingle', [[0,-.001],[.005,-.003],[.016,0],[.005,.001],[0,.002]], brass, x, y, z, 8);
        disc.rotation.x = Math.PI / 2;
      }
      const pin = m.cyl('jingle-pin', .0013, .0013, .032, edge, x, y, 0, 6); pin.rotation.x = Math.PI / 2;
    }
    const grip = m.box('mint-hand-grip', .012, .036, .043, mint, .003, 0, 0); grip.rotation.z = -.08;
    return m.done();
  };

  I.HANDPROPS.onigiri = function (THREE, kit) {
    const m = model(THREE, kit, 'onigiri');
    const rice = m.mat('#f7efda', { roughness: .94 }), nori = m.mat('#53695b', { roughness: .9 });
    const grain = m.mat('#e6dec8'), sesame = m.mat('#baac89');
    const triangle = new THREE.Shape(); triangle.moveTo(-.030, -.026);
    triangle.quadraticCurveTo(-.036, -.025, -.031, -.015); triangle.lineTo(-.007, .028);
    triangle.quadraticCurveTo(0, .039, .007, .028); triangle.lineTo(.031, -.015);
    triangle.quadraticCurveTo(.036, -.025, .030, -.026); triangle.quadraticCurveTo(0, -.031, -.030, -.026);
    m.solid('soft-triangular-rice', triangle, .027, rice, 0, -.003, -.0135, .002, 4);
    m.box('front-seaweed-wrap', .027, .028, .0013, nori, 0, -.017, .0162);
    m.box('back-seaweed-wrap', .027, .023, .0013, nori, 0, -.0195, -.0162);
    m.box('bottom-seaweed-fold', .027, .0013, .033, nori, 0, -.032, 0);
    for (const [x,y,a] of [[-.019,-.007,.2],[.018,-.003,-.3],[-.011,.009,-.4],[.008,.018,.3],[-.024,-.017,-.2],[.024,-.015,.4]]) {
      const g = m.add('sculpted-rice-grain', new THREE.SphereGeometry(1, 5, 3), grain, x, y, .016); g.scale.set(.0013, .0024, .0005); g.rotation.z = a;
    }
    for (const x of [-.005, .003]) {
      const s = m.add('tiny-sesame-seed', new THREE.SphereGeometry(1, 5, 3), sesame, x, .006, .0165); s.scale.set(.0008, .0015, .0005); s.rotation.z = .4;
    }
    return m.done();
  };
})(typeof window !== 'undefined' ? window : globalThis);
