/* 潮汐小島 · v9.1 北海岸的模型（程式化，Codex 製作）：TA.ISLE.NORTHMODELS[key] = (THREE, kit) => THREE.Group。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.NORTHMODELS = I.NORTHMODELS || {};
  const PI = Math.PI, TAU = PI * 2;

  function workshop(THREE, kit, group) {
    const bins = new Map(); // 材質只讀，活動零件各自合併
    const mat = (c, o, kind) => kit.mat(c, Object.assign({ roughness: .88 }, o), kind);
    function add(geo, material, color) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const source = geo; geo = source.toNonIndexed(); source.dispose(); }
      if (material.vertexColors && !geo.attributes.color) {
        const c = new THREE.Color(color === undefined ? '#ffffff' : color);
        const values = new Float32Array(geo.attributes.position.count * 3);
        for (let i = 0; i < values.length; i += 3) values.set([c.r, c.g, c.b], i);
        geo.setAttribute('color', new THREE.BufferAttribute(values, 3));
      }
      if (!bins.has(material)) bins.set(material, []);
      bins.get(material).push(geo);
    }
    function put(geo, material, p = [0, 0, 0], r = [0, 0, 0], color) {
      geo.rotateX(r[0]); geo.rotateY(r[1]); geo.rotateZ(r[2]);
      geo.translate(...p); add(geo, material, color);
    }
    function ball(p, size, material, color, n = 8, rows = 4) {
      const geo = new THREE.SphereGeometry(1, n, rows); geo.scale(...size); geo.translate(...p); add(geo, material, color);
    }
    function rod(a, c, radius, material, top = radius, n = 6, color) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...c), d = end.clone().sub(start);
      const geo = new THREE.CylinderGeometry(top, radius, d.length(), n, 1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, material, color);
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
    return { mat, add, put, ball, rod, finish };
  }

  function geometry(THREE, positions, indices) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (indices) geo.setIndex(indices);
    geo.computeVertexNormals(); return geo;
  }
  function named(THREE, group, name, geo, material) {
    const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); return mesh;
  }
  function profile(THREE, points, depth, bevel = .08) {
    const shape = new THREE.Shape(); points.forEach((p, i) => i ? shape.lineTo(...p) : shape.moveTo(...p)); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2 + bevel); return geo;
  }
  function box(THREE, size, bevel = .018) {
    const [w, h, d] = size, v = Math.min(bevel, w / 4, h / 4, d / 4);
    return profile(THREE, [[-w / 2 + v, -h / 2 + v], [w / 2 - v, -h / 2 + v], [w / 2 - v, h / 2 - v], [-w / 2 + v, h / 2 - v]], d, v);
  }
  function palette(b) {
    const rock = b.mat('#ffffff', { vertexColors: true, roughness: .92, name: 'coast-rock' }, 'stone');   // v9.26 岩石只用一個材質：濕的那一段由著色器依離海面多高來算（以前另一個濕材質，一圈一圈的色帶）
    if (!rock.defines || !('TA_ROCK' in rock.defines)) rock.defines = Object.assign({}, rock.defines, { TA_ROCK: '' });   // engine.js 的海岸岩石：tex_rock 的岩層、孔洞、潮痕
    return {
      stone: rock, wet: rock,
      moss: b.mat('#ffffff', { vertexColors: true, roughness: .98 }, 'foliage'),
      chalk: b.mat('#ffffff', { vertexColors: true, roughness: .96 })
    };
  }
  /* v9.26 岩石的低頻起伏：位置的函式（同一點的位移一樣，接縫不會裂開） */
  function wob(x, y, z, s) { return Math.sin(x * 1.7 + s) * Math.sin(y * 1.3 + s * 1.9) * Math.sin(z * 1.9 - s * .7) + .5 * Math.sin(x * 3.7 - y * 2.9 + s * 2.3) * Math.sin(z * 3.3 + y * 1.1 + s); }
  /* 北海岸共同的岩層（從平均海面起算的高度）：厚薄不一，硬的層凸出、軟的層凹進去，凸出的量沿著岩面忽大忽小、有的地方整層不見（不是等距的一圈圈） */
  const BEDS = [[.58, .8], [1.0, -.9], [1.66, .7], [2.06, -.6], [2.82, 1], [3.36, -.7], [3.82, .6], [4.52, -.8], [5.0, .5]];   // [層底的高度, 硬度]
  const sat = t => Math.min(1, Math.max(0, t)), ss = t => { t = sat(t); return t * t * (3 - 2 * t); };
  function bedRelief(y, lat) {   // lat：沿著岩面的橫向座標（公尺）
    let r = 0;
    for (let k = 0; k < BEDS.length; k++) {
      const y0 = BEDS[k][0], y1 = k + 1 < BEDS.length ? BEDS[k + 1][0] : 99, inBed = ss((y - y0) / .07 + .5) * (1 - ss((y - y1) / .07 + .5));
      r += inBed * BEDS[k][1] * Math.max(0, .45 + .7 * Math.sin(lat * .9 + k * 1.7) + .3 * Math.sin(lat * 2.3 - k));
    }
    return r;
  }
  const BED_Y = BEDS.flatMap(([y]) => [y - .05, y + .05]);   // 石柱的一圈圈輪廓要落在層界的兩側，凸凹才是一道清楚的邊
  /** 依高度上色：水邊深一點、上面淺一點，再疊幾公尺大小的深淺斑駁（沒有一條條的色帶） */
  function tint(THREE, geo, low, high, seed, y0 = -.2, y1 = 1.6) {
    const P = geo.attributes.position, c0 = new THREE.Color(low), c1 = new THREE.Color(high), c = new THREE.Color(), out = [];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
      c.copy(c0).lerp(c1, t * t * (3 - 2 * t)).multiplyScalar(1 + .055 * wob(x * 1.2, y * .9, z * 1.2, seed)); out.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(out, 3));
  }
  /** 一圈圈的輪廓接成一整塊（頂、底各一個中心點，法線全部共用：沒有折角） */
  function rockSkin(THREE, rows) {
    const n = rows[0].length, positions = [], indices = [], last = rows.length * n, avg = row => row.reduce((v, p) => v.map((c, k) => c + p[k] / n), [0, 0, 0]);
    rows.forEach(row => row.forEach(p => positions.push(...p)));
    positions.push(...avg(rows[0]), ...avg(rows[rows.length - 1]));
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n; i++) { const a = j * n + i, c = j * n + (i + 1) % n; indices.push(a, a + n, c + n, a, c + n, c); }
    for (let i = 0; i < n; i++) { const t = (rows.length - 1) * n; indices.push(last, i, (i + 1) % n, last + 1, t + (i + 1) % n, t + i); }
    return geometry(THREE, positions, indices);
  }
  function boulder(THREE, b, p, size, material, color, seed = 1) {   // v9.26 底邊不再是規則的九邊形、頂面順著層理壓平（以前一顆顆圓麵包）
    const [w, h, d] = size, n = 14, prof = [[0, .37, .35], [.14, .5, .49], [.5, .47, .45], [.8, .39, .36], [.95, .27, .25], [1, .15, .14]];
    const rows = prof.map(([fy, fx, fz], j) => Array.from({ length: n }, (_, i) => {
      const a = i * TAU / n, k = 1 + .1 * Math.sin(2 * a + seed) + .06 * Math.sin(3 * a + seed * 1.7 + j * .4) + .035 * Math.sin(5 * a - seed + j);
      return [p[0] + Math.cos(a) * w * fx * k + (j > 2 ? w * .05 * Math.sin(seed * 2.3) : 0), p[1] + h * fy + (j && j < prof.length - 1 ? h * .04 * Math.sin(a * 2 + seed + j) : 0), p[2] + Math.sin(a) * d * fz * k];
    }));
    const geo = rockSkin(THREE, rows); tint(THREE, geo, color, color, seed); b.add(geo, material);
  }
  function strata(THREE, b, source, m, cave = false) {
    const geo = source.index ? source.toNonIndexed() : source, pos = geo.attributes.position, normal = geo.attributes.normal;
    const levels = [-2, .12, .55, 1.18, 1.30, 2.06, 2.20, 3.02, 3.15, 3.76, 8];
    const colors = ['#7a776d', '#8b877b', '#a49e8f', '#9c9688', '#aaa392', '#a09a8b', '#a7a090', '#9e988a', '#aca594', '#a8a191'];   // v9.26 相鄰色帶的深淺差收小（以前數得出一條條）；濕的那一段由著色器依海面算
    function clip(poly, y, above) {
      const result = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], c = poly[(i + 1) % poly.length], inside = above ? a[1] >= y : a[1] <= y, next = above ? c[1] >= y : c[1] <= y;
        if (inside) result.push(a);
        if (inside !== next) { const t = (y - a[1]) / (c[1] - a[1]); result.push(a.map((v, k) => v + (c[k] - v) * t)); }
      }
      return result;
    }
    const buckets = levels.slice(1).map(() => ({ p: [], n: [] }));
    for (let i = 0; i < pos.count; i += 3) {
      const tri = [0, 1, 2].map(k => [pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k), normal.getX(i + k), normal.getY(i + k), normal.getZ(i + k)]);
      for (let j = 0; j < buckets.length; j++) {
        const poly = clip(clip(tri, levels[j], true), levels[j + 1], false), out = buckets[j];
        for (let k = 1; k < poly.length - 1; k++) {
          const a = new THREE.Vector3(...poly[0]), c = new THREE.Vector3(...poly[k]), d = new THREE.Vector3(...poly[k + 1]);
          if (c.sub(a).cross(d.sub(a)).lengthSq() < 1e-14) continue;
          for (const v of [poly[0], poly[k], poly[k + 1]]) { out.p.push(...v.slice(0, 3)); const n = new THREE.Vector3(...v.slice(3)).normalize(); out.n.push(...n.toArray()); }
        }
      }
    }
    buckets.forEach((out, j) => {
      if (!out.p.length) return;
      const part = new THREE.BufferGeometry(), tint = new THREE.Color(colors[j]), values = [];
      for (let i = 0; i < out.p.length; i += 3) {
        const shade = cave ? .64 + .36 * Math.min(1, Math.max(0, out.p[i + 2] / 2.5)) : 1;
        values.push(tint.r * shade, tint.g * shade, tint.b * shade);
      }
      part.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3)); part.setAttribute('normal', new THREE.Float32BufferAttribute(out.n, 3));
      part.setAttribute('color', new THREE.Float32BufferAttribute(values, 3)); b.add(part, j < 2 ? m.wet : m.stone);
    });
    geo.dispose(); if (source !== geo) source.dispose(); // 切開色帶，保留斜面法線
  }
  function guano(THREE, b, rows, angle, top, bottom, width, material) {
    function at(y, a) {
      const n = rows[0].length, u = ((a / TAU % 1 + 1) % 1) * n, i = Math.floor(u), t = u - i;
      const side = rows.map(row => row[i].map((v, k) => v + (row[(i + 1) % n][k] - v) * t));
      let j = 0; while (j < side.length - 2 && side[j + 1][1] < y) j++;
      const s = (y - side[j][1]) / (side[j + 1][1] - side[j][1]);
      const p = side[j].map((v, k) => v + (side[j + 1][k] - v) * s);
      p[0] += Math.cos(a) * .014; p[2] += Math.sin(a) * .014; return p;
    }
    const positions = [], indices = [];
    const heights = [top, bottom, ...rows.slice(1, -1).map(row => row[Math.round(angle / TAU * row.length) % row.length][1]).filter(y => y > bottom && y < top)].sort((a, c) => c - a);
    heights.forEach((y, j) => {
      const t = (top - y) / (top - bottom), w = width * (1 - t * .86), a = angle + Math.sin(j * 1.7) * .006;
      positions.push(...at(y, a - w), ...at(y, a + w));
      if (j) { const k = j * 2; indices.push(k - 2, k - 1, k + 1, k - 2, k + 1, k); }
    });
    b.add(geometry(THREE, positions, indices), material, '#eee8d8');
  }
  function barnacles(THREE, b, points, material) {
    points.forEach(([x, y, z]) => {
      b.rod([x, y, z], [x, y + .028, z + .012], .028, material, .017, 5, '#e2d7bc');
      b.rod([x, y + .029, z + .012], [x, y + .031, z + .013], .009, material, .009, 5, '#736c59');
    });
  }
  function seabird(THREE, kit, parent, name, p, yaw) {
    const group = new THREE.Group(); group.name = name; group.position.set(...p); group.rotation.y = yaw; parent.add(group);
    const b = workshop(THREE, kit, group), white = b.mat('#f7f4e8'), grey = b.mat('#b6bfbd'), dark = b.mat('#333f42'), gold = b.mat('#d7a35a');
    b.ball([0, .18, 0], [.15, .14, .26], white, undefined, 10, 5);
    b.ball([0, .33, .16], [.105, .11, .115], white, undefined, 8, 5);
    for (const s of [-1, 1]) {
      b.ball([s * .126, .195, -.035], [.038, .085, .19], grey);
      b.ball([s * .094, .355, .207], [.012, .014, .012], dark, undefined, 6, 3);
      b.rod([s * .065, .015, .04], [s * .065, .085, .025], .012, gold, .011, 5);
      b.rod([s * .065, .014, .015], [s * .065, .014, .11], .012, gold, .009, 5);
    }
    b.rod([0, .325, .245], [0, .305, .365], .044, gold, .006, 5);
    b.rod([0, .18, -.18], [0, .205, -.37], .073, grey, .025, 5);
    return b.finish();
  }

  function stack(THREE, kit, tall) {
    const group = new THREE.Group(); group.name = tall ? 'sea_stack_a' : 'sea_stack_b'; // 原點在海面，正面朝＋Ｚ
    const b = workshop(THREE, kit, group), m = palette(b);
    // v9.26 石柱重做：以前是一層層等距的圓台疊起來（每層一圈外凸的簷、顏色深淺交替，像寶塔），十二邊形看得到折角。
    // 現在是一整根連續的岩柱：浪打的高度往內凹一圈，上面只有兩道不完整、厚薄不一的硬岩層微微凸出，斷面依共同的節理削出平直的面；岩層、潮痕交給著色器
    const top = tall ? 5.29 : 2.95, n = 22, sd = tall ? 1.3 : 4.1;
    const prof = tall ? [[-1.2, 1.34, 1.14, 0], [-.55, 1.46, 1.22, 0], [.4, 1.36, 1.12, 0], [1.3, 1.27, 1.05, -.04], [2.2, 1.18, .98, -.09], [3.1, 1.04, .87, -.1], [3.9, .98, .82, -.05], [4.7, .86, .72, .01], [top, .78, .65, .02]]
      : [[-1.2, .86, .78, 0], [-.6, .98, .86, 0], [.4, .88, .78, .06], [1.3, .77, .66, .22], [2.15, .62, .54, .39], [top, .5, .44, .55]];
    const at = y => { let j = 0; while (j < prof.length - 2 && prof[j + 1][0] < y) j++; const p = prof[j], q = prof[j + 1], t = sat((y - p[0]) / (q[0] - p[0])); return [1, 2, 3].map(k => p[k] + (q[k] - p[k]) * t); };
    const rim = { [top - .3]: .97, [top - .16]: .92, [top - .07]: .8, [top]: .62 };   // 頂面是層面：平的，邊緣圓一點
    const ys = [...new Set([-1.2, -.6, -.1, .1, .22, .34, .46, ...BED_Y, 1.3, 2.45, 3.1, 4.15].filter(y => y < top - .36).map(y => +y.toFixed(3)))].sort((p, q) => p - q).concat(Object.keys(rim).map(Number).sort((p, q) => p - q));
    const joints = [.42, .42 + PI / 2, .42 + PI, .42 + PI * 1.5].map((a, k) => [Math.cos(a), Math.sin(a), [.84, .9, .8, .92][k], [3.4, 9, 1.75, 9][k]]);   // 共同的兩組節理：平直的側面都對著同樣的方向；有一兩面在某個高度以上整塊崩掉，往內退一階
    const rows = ys.map(y => {
      const [rx, rz, cx] = at(y), edge = rim[y] || 1;
      return Array.from({ length: n }, (_, i) => {
        const a = i * TAU / n, notch = Math.exp(-(((y - .28) / .16) ** 2)) * (.1 + .05 * Math.sin(a * 3 + sd));   // 浪打的高度往內凹
        const k = edge * (1 - notch) * (1 + .085 * Math.sin(2 * a + sd + y * .25) + .05 * Math.sin(3 * a + sd * 1.7 - y * .4) + .03 * Math.sin(5 * a + y + sd) + .022 * Math.sin(8 * a + y * 3 + sd) + .15 * bedRelief(y, a * rx));
        let x = Math.cos(a) * rx * k, z = Math.sin(a) * rz * k;
        for (const [jx, jz, c0, yb] of joints) { const c = c0 - .14 * ss((y - yb) / .25 + .5), dd = x * jx / rx + z * jz / rz; if (dd > c) { x -= jx * rx * (dd - c) * .9; z -= jz * rz * (dd - c) * .9; } }
        return [x + cx, y, z];
      });
    });
    const body = rockSkin(THREE, rows); tint(THREE, body, '#8e8a81', '#aca69a', sd); b.add(body, m.stone);
    const cx = tall ? .02 : .55;
    const ms = tall ? .85 : .5;   // v9.26 苔墊收在頂面裡（矮的那根頂面小：以前苔墊伸出邊緣，從下面看是一塊黑）
    for (let j = 0; j < 4; j++) b.ball([cx + (-.32 + j * .19) * ms, top - .03, (-.12 + (j % 2) * .25) * ms], [.2 * ms, .05, .18 * ms], m.moss, j % 2 ? '#88916b' : '#747e59');
    for (const [a, y, length, w] of [[1.22, top - .16, .75, .052], [1.83, top - .10, 1.1, .045], [.36, top - .32, .55, .04]]) guano(THREE, b, rows, a, y, y - length, w, m.chalk);
    if (tall) {
      const nest = b.mat('#b5a17a', { roughness: .98 }, 'wood');
      b.ball([.03, 5.305, .02], [.43, .055, .36], nest);
      b.put(new THREE.TorusGeometry(.35, .055, 5, 16), nest, [.03, 5.37, .02], [PI / 2, 0, 0]);
      for (let j = 0; j < 12; j++) {
        const a = j * TAU / 12, x = .03 + Math.cos(a) * .35, z = .02 + Math.sin(a) * .29;
        b.rod([x - Math.sin(a) * .16, 5.365, z + Math.cos(a) * .16], [x + Math.sin(a) * .16, 5.395, z - Math.cos(a) * .16], .014, nest, .008, 5);
      }
      const birds = new THREE.Group(); birds.name = 'birds'; birds.position.set(.02, 5.40, .02); group.add(birds);
      seabird(THREE, kit, birds, 'gull_a', [-.20, 0, .01], -.55); seabird(THREE, kit, birds, 'gull_b', [.20, .015, -.025], .65);
    }
    return b.finish();
  }
  I.NORTHMODELS.sea_stack_a = function (THREE, kit) { return stack(THREE, kit, true); };
  I.NORTHMODELS.sea_stack_b = function (THREE, kit) { return stack(THREE, kit, false); };

  I.NORTHMODELS.sea_arch = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'sea_arch'; // 原點在海面，拱洞沿Ｚ貫通
    const b = workshop(THREE, kit, group), m = palette(b);
    // v9.26 拱重做：以前是一片輪廓擠出來的厚板，切成十道等距、深淺交替的色帶，倒角只有一刀（遠看數得出一條條平行線、轉角像折紙）。
    // 現在沿著拱走一圈圈圓角的斷面接成一整塊（法線共用、沒有折角），頂面順著層理平而略有一階，浪打的高度往內凹一圈，表面有幾十公分的起伏；岩層與潮痕交給著色器
    const M = 44, K = 22, spaced = pts => new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getSpacedPoints(M - 1);
    const inner = spaced([[-1.62, -1.2], [-1.6, -.4], [-1.6, .5], [-1.62, 1.2], [-1.52, 1.75], [-1.3, 2.25], [-.9, 2.6], [-.35, 2.78], [.2, 2.75], [.55, 2.62], [.95, 2.35], [1.25, 2.0], [1.45, 1.55], [1.58, 1.0], [1.6, .3], [1.62, -1.2]]);   // 洞口不對稱：左高右低
    const outer = spaced([[-3.36, -1.2], [-3.42, -.4], [-3.42, 1.0], [-3.55, 1.6], [-3.7, 2.3], [-3.72, 2.9], [-3.55, 3.5], [-3.2, 3.95], [-2.6, 4.25], [-1.8, 4.38], [-1.0, 4.4], [-.5, 4.36], [-.2, 4.2], [.3, 4.05], [1.1, 4.0], [1.8, 3.85], [2.35, 3.55], [2.7, 3.1], [2.95, 2.6], [3.15, 2.1], [3.3, 1.4], [3.36, .7], [3.4, -.4], [3.36, -1.2]]);   // 左邊的岩體厚、上面往外懸出一點（水面上，船碰不到），右肩低一階；水裡的拱腳仍在碰撞圓裡
    const rows = inner.map((p, i) => {
      const o = outer[i], u = i / (M - 1), D = 1.3 - .25 * Math.sin(PI * u) + .08 * Math.sin(u * 4 + 1), zc = .14 * Math.sin(PI * u * 1.3 + .4);   // 拱頂薄一點、整條微微彎
      return Array.from({ length: K }, (_, k) => {
        const a = k / K * TAU, ca = Math.cos(a), sa = Math.sin(a), s = .5 + .5 * Math.sign(ca) * Math.pow(Math.abs(ca), .3);   // 圓角的方形斷面：面是平的，轉角收得比較緊
        return [p.x + (o.x - p.x) * s, p.y + (o.y - p.y) * s, zc - D * Math.sign(sa) * Math.pow(Math.abs(sa), .3)];
      });
    });
    const arch = rockSkin(THREE, rows), P = arch.attributes.position, N = arch.attributes.normal;
    const cuts = [[.31, .2, .08], [.87, .26, -.1], [1.62, .16, .05], [2.23, .22, .12], [2.88, .18, -.06]].map(([a, depth, tz]) => [a, Math.max(...outer.map(o => o.x * Math.cos(a) + (o.y - 1.3) * Math.sin(a))) / Math.hypot(1, tz) - depth, tz]);   // 節理切出的平面：從外緣往內削 depth
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), side = 1 - Math.abs(N.getY(i));
      const d = wob(x, y, z, 3.1) * .1 + wob(x * 2.2, y * 2.2, z * 2.2, 7.3) * .035 - Math.exp(-(((y - .28) / .24) ** 2)) * side * (.17 + .07 * Math.sin(x * 2.1 + z * 1.7));   // 表面幾十公分的起伏；浪打的高度往內凹
      let px = x + N.getX(i) * d, py = y + N.getY(i) * d, pz = z + N.getZ(i) * d;
      for (const [a, R, tz] of cuts) {   // 外緣的輪廓是一段段折線，不是一條圓弧
        const nx = Math.cos(a), ny = Math.sin(a), nl = Math.hypot(nx, ny, tz), dd = (px * nx + (py - 1.3) * ny + pz * tz) / nl;
        if (dd > R) { const k = (dd - R) * .9 / nl; px -= nx * k; py -= ny * k; pz -= tz * k; }
      }
      P.setXYZ(i, px, py, pz);
    }
    arch.computeVertexNormals(); tint(THREE, arch, '#8f897b', '#b0a897', 3.1, -.3, 2.2); b.add(arch, m.stone);
    for (const [x, z, w] of [[-1.45, .1, .4], [-.45, -.2, .26], [.6, .12, .3]]) { let y = 0; for (let i = 0; i < P.count; i++) if (Math.abs(P.getX(i) - x) < .3 && Math.abs(P.getZ(i) - z) < .3) y = Math.max(y, P.getY(i)); b.ball([x, y - .04, z], [w, .06, .33], m.moss, '#7e8962'); }   // 苔貼著（削過之後的）頂面
    for (const [x, z, w, h, d, sd] of [[-2.15, 1.55, .8, .8, .6, 3], [-2.95, 1.3, .6, .72, .5, 7], [2.3, -1.5, .9, .82, .75, 5], [2.95, -1.2, .55, .7, .5, 11], [2.0, 1.45, .5, .74, .45, 13]]) boulder(THREE, b, [x, -.45, z], [w, h, d], m.stone, '#958f80', sd);   // 拱腳落下的岩塊，半泡在水裡（都在拱腳的碰撞圓裡）
    return b.finish();
  };

  I.NORTHMODELS.cave_mouth = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'cave_mouth'; // 原點在沙地，門檻中心為（０，０，２．５）
    const b = workshop(THREE, kit, group), m = palette(b);
    const outside = [[-3.32, .10], [-3.39, .70], [-3.12, 1.66], [-2.56, 2.66], [-1.65, 3.53], [-.57, 3.90], [.69, 3.82], [1.72, 3.41], [2.61, 2.52], [3.19, 1.38], [3.38, .10]];
    const inside = [[1, .10], [1, 1.39], [.91, 1.80], [.69, 2.12], [.37, 2.33], [0, 2.40], [-.37, 2.33], [-.69, 2.12], [-.91, 1.80], [-1, 1.39], [-1, .10]];
    const entrance = profile(THREE, outside.concat(inside), 2.50, .10); entrance.translate(0, 0, 1.25); strata(THREE, b, entrance, m, true);
    const rear = profile(THREE, outside, 2.52, .10); rear.translate(0, 0, -1.24); strata(THREE, b, rear, m);
    const opening = [[-.89, 0], [-.89, 1.39], [-.81, 1.76], [-.62, 2.05], [-.33, 2.24], [0, 2.30], [.33, 2.24], [.62, 2.05], [.81, 1.76], [.89, 1.39], [.89, 0]];
    const tunnel = b.mat('#ffffff', { vertexColors: true, roughness: 1 });
    for (let j = 0; j < 3; j++) {
      const positions = [], indices = [], front = 2.48 - j * .81, back = front - .81;
      for (const z of [back, front]) opening.forEach(([x, y]) => positions.push(x, y, z));
      const n = opening.length;
      for (let i = 0; i < n - 1; i++) indices.push(i, i + 1, i + n + 1, i, i + n + 1, i + n);
      b.add(geometry(THREE, positions, indices), tunnel, ['#6d7169', '#353e3d', '#141e22'][j]);
    }
    const backShape = new THREE.Shape(); opening.forEach((p, i) => i ? backShape.lineTo(...p) : backShape.moveTo(...p)); backShape.closePath();
    const back = new THREE.ShapeGeometry(backShape); back.translate(0, 0, .04);
    named(THREE, group, 'void', back, b.mat('#05080c', { roughness: 1 }));
    b.put(new THREE.PlaneGeometry(1.78, 2.46), tunnel, [0, .006, 1.27], [-PI / 2, 0, 0], '#3a4442');
    for (const [x, z, w, h] of [[-1.38, 2.48, .68, .30], [1.36, 2.48, .66, .24], [-1.96, 2.42, .47, .18]]) boulder(THREE, b, [x, 0, z], [w, h, .59], m.wet, '#86908a', w * 9);
    barnacles(THREE, b, [[-1.35, .29, 2.52], [-1.43, .29, 2.51], [-1.33, .27, 2.59], [1.35, .23, 2.53], [1.41, .22, 2.56], [-1.97, .17, 2.48]], m.chalk);
    for (const [x, y, z, w] of [[-.55, 3.98, -.28, .38], [.45, 3.93, .37, .32], [-1.48, 3.68, .43, .28]]) b.ball([x, y, z], [w, .047, .34], m.moss, '#818a62');
    return b.finish();
  };

  I.NORTHMODELS.driftwood = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'driftwood'; // 原點在沙地，長軸沿Ｘ
    const b = workshop(THREE, kit, group), wood = b.mat('#ffffff', { vertexColors: true, roughness: .96 }, 'wood');
    const rows = [-1.10, -1.04, -.55, .10, .67, 1.04, 1.10].map((x, j) => Array.from({ length: 10 }, (_, i) => {
      const a = i * TAU / 10, r = (j === 0 || j === 6 ? .165 : .225) * (1 + .07 * Math.sin(i * 2.7 + j * .6));
      return [x, Math.max(0, .225 + Math.cos(a) * r + .015 * Math.sin(j * 1.4)), Math.sin(a) * r * 1.08 + .025 * Math.sin(j)];
    }));
    const positions = [], indices = []; rows.forEach(row => row.forEach(p => positions.push(...p)));
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < 10; i++) { const a = j * 10 + i, c = j * 10 + (i + 1) % 10; indices.push(a, c, c + 10, a, c + 10, a + 10); }
    b.add(geometry(THREE, positions, indices), wood, '#c5bca5');
    for (const s of [-1, 1]) {
      b.rod([s * 1.08, .225, 0], [s * 1.10, .225, 0], .162, wood, .155, 10, '#e0d3b6');
      b.put(new THREE.TorusGeometry(.105, .006, 3, 10), wood, [s * 1.102, .225, 0], [0, PI / 2, 0], '#b3a78e');
      b.put(new THREE.TorusGeometry(.052, .004, 3, 9), wood, [s * 1.103, .225, 0], [0, PI / 2, 0], '#b3a78e');
    }
    for (const [a, c, r] of [[[ -.63, .29, -.10], [-.83, .61, -.25], .081], [[.52, .31, -.08], [.70, .55, -.28], .073], [[.12, .15, .17], [.32, .12, .39], .065]]) {
      b.rod(a, c, r, wood, r * .56, 7, '#c5bca5');
      b.ball(c, [r * .55, r * .4, r * .55], wood, '#e0d3b6', 7, 3);
    }
    for (let j = 0; j < 4; j++) {
      const a = .55 + j * .67, points = rows.slice(1, -1).map(row => { const p = row[Math.round(a / TAU * 10) % 10]; return [p[0], p[1] + .004, p[2] + .004]; });
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 7, .006, 3, false), wood, '#a89e89');
    }
    return b.finish();
  };

  I.NORTHMODELS.tide_rocks = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'tide_rocks'; // 原點在沙地，潮池水面略高於地面
    const b = workshop(THREE, kit, group), m = palette(b);
    const rocks = [[-.84, -.36, .82, .55, .72], [.80, -.40, .90, .46, .68], [-.92, .32, .58, .31, .52], [.87, .38, .65, .38, .56], [-.36, .72, .70, .26, .50], [.25, .73, .62, .32, .52]];
    rocks.forEach(([x, z, w, h, d], j) => {
      boulder(THREE, b, [x, 0, z], [w, h, d], m.wet, j % 2 ? '#938f84' : '#858176', j + 2);   // v9.26 和其他海岸岩石同一種灰褐（以前偏青綠）
      barnacles(THREE, b, [[x - .04, h + .002, z], [x + .03, h + .002, z + .025], [x + .005, h + .002, z - .04]], m.chalk);
    });
    const pool = [], indices = [];
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14, r = 1 + .08 * Math.sin(i * 2.3); pool.push(Math.cos(a) * .68 * r, .045, Math.sin(a) * .53 * r + .05); }
    for (let i = 1; i < 13; i++) indices.push(0, i + 1, i);
    const basin = geometry(THREE, pool, indices), water = basin.clone(); basin.translate(0, -.035, 0); b.add(basin, m.wet, '#62796f');
    b.add(water, b.mat('#5fb8c8', { transparent: true, opacity: .7, roughness: .1 }));
    return b.finish();
  };

  I.NORTHMODELS.north_sign = function (THREE, kit) {
    const group = new THREE.Group(); group.name = 'north_sign'; // 原點在沙地，牌板正面朝＋Ｚ
    const b = workshop(THREE, kit, group), wood = b.mat('#b29a77', { roughness: .94 }, 'wood');
    const pale = b.mat('#d0bb96', { roughness: .91 }, 'wood'), rope = b.mat('#a99671', { roughness: .98 }, 'fabric');
    b.rod([-.39, 0, -.04], [-.39, 1.84, -.04], .072, wood, .061, 7);
    b.put(box(THREE, [1.42, .13, .15], .025), pale, [0, 1.805, -.04]);
    b.ball([-.39, 1.855, -.04], [.074, .045, .075], pale);
    for (const x of [-.37, .37]) {
      b.rod([x, 1.80, .015], [x, 1.53, .15], .014, rope, .014, 5);
      b.put(new THREE.TorusGeometry(.031, .009, 4, 8), rope, [x, 1.55, .16]);
    }
    const board = named(THREE, group, 'board', box(THREE, [1.10, .45, .075], .018), b.mat('#e3d0aa', { roughness: .91 }, 'wood'));
    board.position.set(0, 1.345, .15); // 正面保留平坦淺木色，供遊戲加字
    return b.finish();
  };
})(typeof window !== 'undefined' ? window : globalThis);
