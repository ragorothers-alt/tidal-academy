/* 潮汐小島 · biology 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['biology'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['biology'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '森的樹冠花園整棟住宅';
    const M = {
      wall: kit.mat('#f3ead8', {}, 'plaster'), wood: kit.mat('#8a5a3b', {}, 'wood'),
      honey: kit.mat('#b8824c', {}, 'wood'), floor: kit.mat('#c6b99c', { vertexColors: true }, 'wood'),
      pale: kit.mat('#eed3a6', {}, 'wood'), leaf: kit.mat('#7d9a5c', {}, 'foliage'),
      darkLeaf: kit.mat('#526f43', {}, 'foliage'), pink: kit.mat('#f3b2c9', {}, 'fabric'),
      rose: kit.mat('#e88fb2', {}, 'foliage'), cream: kit.mat('#fff0cb', {}, 'fabric'),
      soil: kit.mat('#66513f', { roughness: 1 }, 'stone'),
      brass: kit.mat('#d6ac60', { metalness: .8, roughness: .38 }, 'metal'),
      lavender: kit.mat('#a39bc9', {}, 'ceramic'), stone: kit.mat('#c7b9a3', {}, 'stone'),
      // Shared swatches separate cloth, paper, glaze and petals without per-object materials.
      leafCloth: kit.mat('#7d9a5c', {}, 'fabric'), paleCloth: kit.mat('#eed3a6', {}, 'fabric'),
      lavenderCloth: kit.mat('#a39bc9', {}, 'fabric'), honeyCloth: kit.mat('#b8824c', {}, 'fabric'),
      paper: kit.mat('#fff0cb', {}, 'paper'), ink: kit.mat('#526f43', {}, 'paper'),
      ceramic: kit.mat('#fff0cb', {}, 'ceramic'), pot: kit.mat('#b8824c', {}, 'ceramic'),
      potRim: kit.mat('#eed3a6', {}, 'ceramic'), tea: kit.mat('#66513f', {}, 'ceramic'),
      petal: kit.mat('#f3b2c9', {}, 'foliage'), petalCream: kit.mat('#fff0cb', {}, 'foliage'),
      lavenderPetal: kit.mat('#a39bc9', {}, 'foliage'), pollen: kit.mat('#d6ac60', {}, 'foliage'),
      seed: kit.mat('#eed3a6', {}, 'foliage'),
      iron: kit.mat('#526f43', { metalness: .65, roughness: .4 }, 'metal'),
      blade: kit.mat('#c7b9a3', { metalness: .75, roughness: .4 }, 'metal'),
      glow: kit.lamp('#ffdb9b'), glass: kit.glass()
    };
    const shapes=new Map();
    function shape(key,make) {if(!shapes.has(key))shapes.set(key,make());return shapes.get(key);}
    const B = (w, h, d) => shape('b'+[w,h,d],()=>new THREE.BoxGeometry(w,h,d));
    function add(q, m, x, y, z, ud) {
      const o = new THREE.Mesh(q, m); o.position.set(x, y, z); if (ud) Object.assign(o.userData, ud); g.add(o); return o;
    }
    function box(x, y, z, w, h, d, m, solid) { return add(B(w, h, d), m, x, y, z, solid ? { solid: true } : null); }
    function beam(a, b, r, m) {
      const A = new THREE.Vector3(...a), C = new THREE.Vector3(...b), v = C.clone().sub(A);
      const o = add(shape('rod',()=>new THREE.CylinderGeometry(1,1,1,7)), m, ...A.add(C).multiplyScalar(.5).toArray());o.scale.set(r,v.length(),r);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return o;
    }
    function ball(x, y, z, r, m, sx = 1, sy = 1, sz = 1) {
      const q=shape('ball'+[r,sx,sy,sz],()=>new THREE.IcosahedronGeometry(r,1).scale(sx,sy,sz));return add(q,m,x,y,z);
    }
    const local = (x, z, u, d, ry) => [x + Math.cos(ry) * u + Math.sin(ry) * d, z - Math.sin(ry) * u + Math.cos(ry) * d];
    function arch(w, h) {
      const p = [[-w / 2, 0], [w / 2, 0], [w / 2, h - w / 2]];
      for (let i = 1; i <= 20; i++) p.push([w / 2 * Math.cos(i * Math.PI / 20), h - w / 2 + w / 2 * Math.sin(i * Math.PI / 20)]);
      return p;
    }
    function path(points) { return new THREE.Path(points.map(p => new THREE.Vector2(...p))); }
    function extrusion(points, holes, depth) {
      const s = new THREE.Shape(points.map(p => new THREE.Vector2(...p)));
      holes.forEach(p => s.holes.push(path(p.slice().reverse())));
      return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
    }
    function circle(r, y) { return Array.from({ length: 32 }, (_, i) => [r * Math.cos(i * Math.PI / 16), y + r * Math.sin(i * Math.PI / 16)]); }
    // Actual openings: plaster is extruded around each arch/circle, never painted over it.
    function wall(x, z, w, y0, h, ry, openings) {
      const holes = openings.map(s => (s.round ? circle(s.w / 2, s.y) : arch(s.w, s.h).map(p => [p[0], p[1] + s.y])).map(p => [p[0] + s.u, p[1]]));
      const o = add(extrusion([[-w / 2, y0], [w / 2, y0], [w / 2, y0 + h], [-w / 2, y0 + h]], holes, .32), M.wall, x, 0, z);
      o.rotation.y = ry;
      // Individual rectangular piers/sills provide conservative collision without filling the openings.
      const cuts = [-w / 2, w / 2]; openings.forEach(s => cuts.push(s.u - s.w / 2, s.u + s.w / 2)); cuts.sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) {
        const u = (cuts[i] + cuts[i + 1]) / 2;
        if (openings.some(s => Math.abs(u - s.u) < s.w / 2)) continue;
        const [xx, zz] = local(x, z, u, .16, ry);
        const c = box(xx, y0 + h / 2, zz, cuts[i + 1] - cuts[i], h, .32, M.wall, true); c.visible = false; c.rotation.y = ry;
      }
      openings.forEach(s => {
        const top = s.round ? s.y + s.w / 2 : s.y + s.h;
        if (top < y0 + h) {
          const [cx, cz] = local(x, z, s.u, .16, ry);
          const cap = box(cx, (top + y0 + h) / 2, cz, s.w, y0 + h - top, .32, M.wall, true); cap.rotation.y = ry; cap.visible = false;
        }
        if (s.door) return;
        const p = s.round ? circle(s.w / 2, 0) : arch(s.w, s.h), base = s.y;
        const outer = s.round ? circle(s.w / 2 + .13, 0) : arch(s.w + .26, s.h + .13).map(a => [a[0], a[1] - .13]);
        const ring = add(extrusion(outer, [p], .16), M.honey, ...[...local(x, z, s.u, -.09, ry).slice(0, 1), base, local(x, z, s.u, -.09, ry)[1]]); ring.rotation.y = ry;
        const yy = s.round ? base : base + s.h / 2, hh = s.round ? s.w : s.h;
        const [vx, vz] = local(x, z, s.u, .78, ry);
        const view = add(new THREE.PlaneGeometry(s.w + .8, hh + .8), kit.view(), vx, yy, vz, { camThrough: true }); view.rotation.y = ry + Math.PI;
        const [gx, gz] = local(x, z, s.u, .12, ry);
        const pane = add(new THREE.ShapeGeometry(new THREE.Shape(p.map(a => new THREE.Vector2(...a)))), M.glass, gx, base, gz, { camThrough: true }); pane.rotation.y = ry + Math.PI;
        for (const a of [[0, yy, .07, hh], [0, yy, s.w, .07]]) {
          const [mx, mz] = local(x, z, s.u, -.13, ry); const mull = box(mx, a[1], mz, a[2], a[3], .09, M.wood); mull.rotation.y = ry;
        }
        const [sx, sz] = local(x, z, s.u, -.14, ry);
        const sill = box(sx, s.round ? base - s.w / 2 - .12 : base - .12, sz, s.w + .4, .16, .52, M.honey, true); sill.rotation.y = ry;
        const bottom = s.round ? base - s.w / 2 : base;
        const [cx, cz] = local(x, z, s.u, .16, ry);
        const guard = box(cx, y0 + (bottom - y0) / 2, cz, s.w, bottom - y0, .32, M.wall, true); guard.rotation.y = ry; guard.visible = false;
      });
      return o;
    }
    function flower(x, y, z, r = .16, petals = M.petal, center = M.petalCream) {
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; ball(x + Math.cos(a) * r * .6, y, z + Math.sin(a) * r * .6, r * .55, petals, 1, .4, 1); }
      ball(x, y + .03, z, r * .3, center);
    }
    function plant(x, y, z, s = 1, flowers = true) {
      add(new THREE.CylinderGeometry(.25 * s, .18 * s, .36 * s, 8), M.pot, x, y + .18 * s, z);
      add(new THREE.CylinderGeometry(.22 * s, .22 * s, .03, 8), M.soil, x, y + .36 * s, z);
      for (let i = 0; i < 5; i++) {
        const a = i * 2.4, xx = x + Math.cos(a) * .18 * s, zz = z + Math.sin(a) * .18 * s;
        beam([x, y + .35 * s, z], [xx, y + (.65 + i * .05) * s, zz], .015 * s, M.darkLeaf);
        const leaf = ball(xx, y + .58 * s, zz, .17 * s, M.leaf, .65, .35, 1.5); leaf.rotation.y = a;
        if (flowers && i % 2 === 0) flower(xx, y + (.68 + i * .05) * s, zz, .13 * s);
      }
    }
    function lamp(x, y, z) {
      ball(x, y, z, .22, M.glow, .8, 1.35, .8);
      for (const dx of [-.22, .22]) beam([x + dx, y - .3, z], [x + dx, y + .3, z], .024, M.brass);
      for (const yy of [y - .32, y + .32]) box(x, yy, z, .55, .06, .48, M.honey);
    }
    function table(x, y, z, w, d) {
      add(kit.rbox(w, .16, d, .055), M.honey, x, y + 1.05, z, { solid: true });
      for (const dx of [-w / 2 + .16, w / 2 - .16]) for (const dz of [-d / 2 + .15, d / 2 - .15]) box(x + dx, y + .49, z + dz, .15, .98, .15, M.wood, true);
      for (const dz of [-d / 2 + .13, d / 2 - .13]) {
        box(x, y + .84, z + dz, w - .24, .23, .10, M.wood);
        box(x, y + .30, z + dz, w - .20, .10, .10, M.honey);
      }
      box(x, y + .85, z + d / 2 + .012, w * .44, .16, .035, M.pale);
      ball(x, y + .85, z + d / 2 + .045, .045, M.brass);
    }
    function book(x, y, z, c, h = .5) { box(x, y + h / 2, z, .16, h, .36, c); box(x, y + h * .72, z + .19, .12, .035, .015, M.paper); }
    function leafPicture(x, y, z, w = .7) {
      box(x, y, z, w, w * 1.3, .1, M.honey); box(x, y, z + .06, w - .12, w * 1.3 - .12, .03, M.paper);
      ball(x, y, z + .1, w * .3, M.leaf, .64, 1.3, .12); beam([x, y - w * .33, z + .15], [x, y + w * .33, z + .15], .015, M.darkLeaf);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) beam([x, y - .18 + i * .16, z + .15], [x + s * w * .18, y - .07 + i * .16, z + .15], .01, M.paper);
    }
    function floor(x,z,w,d,y) {
      // The boards are floor, not furniture. Merge them with the slab into one walk mesh.
      const pos=[],norm=[],colors=[];
      function part(geo,dx,dy,dz,shade) {
        const q=geo.toNonIndexed(),p=q.attributes.position,n=q.attributes.normal;
        for(let i=0;i<p.count;i++) {
          pos.push(p.getX(i)+dx,p.getY(i)+dy,p.getZ(i)+dz);
          norm.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(shade,shade,shade);
        }
        q.dispose();
      }
      part(B(w,.24,d),0,-.12,0,1);
      let row=0;
      for (let zz=-d/2;zz<d/2-.01;zz+=.48,row++) {
        const dep=Math.min(.467,d/2-zz);
        part(B(w-.016,.012,dep),0,.001,zz+dep/2,.91+(row*7%9)*.011);
      }
      const q=new THREE.BufferGeometry();
      q.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      q.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
      q.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      add(q,M.floor,x,y,z,{walk:true});
    }
    // One garden storey and one habitable attic, with the same left-offset gable as the cottage.
    floor(0, 0, 14, 12, 0);
    wall(0, 6, 14, 0, 7.5, 0, [{ u: -3.15, y: .02, w: 1.7, h: 3.1, door: true }, { u: 3.3, y: 1.1, w: 2.2, h: 2.65 }]);
    wall(0, -6, 14, 0, 7.5, Math.PI, [{ u: 4.1, y: 1.1, w: 2.1, h: 2.5 }, { u: -3.3, y: 1.25, w: 2.0, h: 2.35 }]);
    wall(-7, 0, 12, 0, 7.5, -Math.PI / 2, [{ u: 3.25, y: 1.15, w: 1.85, h: 2.45 }]);
    wall(7, 0, 12, 0, 4.2, Math.PI / 2, [{ u: -1.8, y: 1.1, w: 2, h: 2.6 }, { u: 3.75, y: 1.4, w: 1.55, h: 2.1 }]);
    box(7.16, 5.85, -4.7, .32, 3.3, 2.6, M.wall, true);
    box(7.16, 5.85, 3.3, .32, 3.3, 5.4, M.wall, true);
    // Arched timber entrance, sealed leaf door behind the automatic exit circle.
    add(extrusion(arch(1.72, 3.12), [], .13), M.wood, -3.15, .02, 6.05);
    for (let u = -.72; u <= .72; u += .18) box(-3.15 + u, 1.15, 6.03, .015, 2.2, .03, M.honey);
    add(new THREE.TorusGeometry(.13, .025, 6, 16), M.brass, -2.68, 1.35, 6.0);
    const stair = { x: 5.5, z0: 3.9, z1: -1.3, rise: 4.2, width: 1.8 };
    floor(-1.35, 0, 11.3, 12, 4.2); floor(6.7, 0, .6, 12, 4.2);
    floor(5.3, -3.65, 2.2, 4.7, 4.2); floor(5.3, 5, 2.2, 2, 4.2);
    const run = stair.z0 - stair.z1, angle = Math.atan2(stair.rise, run);
    const ramp = add(new THREE.PlaneGeometry(stair.width, Math.hypot(run, stair.rise)), M.wood, stair.x, 2.1, 1.3, { walk: true });
    ramp.rotation.x = -Math.PI / 2 + angle; ramp.visible = false;
    for (let i = 0; i < 18; i++) box(stair.x, (i + .5) * 4.2 / 18 - .06, stair.z0 - (i + .5) * run / 18, 1.8, .12, run / 18 + .03, M.honey);
    for (const x of [4.45, 6.55]) {
      beam([x, -.15, stair.z0], [x, 4.05, stair.z1], .10, M.wood);
      const rail = beam([x, 1, stair.z0], [x, 5.2, stair.z1], .065, M.honey); rail.userData.solid = true;
      for (let i = 0; i <= 6; i++) box(x, .5 + i * .7, stair.z0 - i * run / 6, .10, 1, .10, M.wood, true);
    }
    // Loft well: individually solid posts and rails, open at the north landing.
    for (let z = -1.1; z <= 3.95; z += .85) box(4.1, 4.76, z, .12, 1.12, .12, M.wood, true);
    box(4.1, 5.29, 1.4, .14, .12, 5.1, M.honey, true); box(5.25, 5.29, 4.03, 2.3, .12, .14, M.honey, true);
    for (const z of [-5.7, -2.8, .4, 3.8, 5.7]) box(-1.3, 3.9, z, 11.3, .28, .20, M.wood);
    for (const x of [-6.85, -1.8, 6.85]) for (const z of [-5.85, 5.85]) box(x, 3.7, z, .22, 7.4, .22, M.wood, true);
    for (const z of [-5.88, 5.88]) for (const y of [.28, 4.02, 7.4]) box(0, y, z, 14, .18, .16, M.wood);
    for (const x of [-6.88, 6.88]) for (const y of [.28, 4.02, 7.4]) {
      if(x>0 && y>7) {box(x,y,-4.7,.16,.18,2.6,M.wood);box(x,y,3.3,.16,.18,5.4,M.wood);}
      else box(x, y, 0, .16, .18, 12, M.wood);
    }
    function roofSpan(a, b, z, depth) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const o = box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z, len, .22, depth, M.pale); o.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
    }
    roofSpan([-7.25, 7.5], [-1.8, 10.7], 0, 12.5);
    roofSpan([-1.8, 10.7], [7.25, 7.5], -4.7, 2.6); roofSpan([-1.8, 10.7], [7.25, 7.5], 3.3, 5.4);
    roofSpan([-1.8, 10.7], [5.2, 8.225], -1.4, 4);
    for (const z of [-5.75, -3.2, .65, 3.3, 5.75]) {
      beam([-7.1, 7.43, z], [-1.8, 10.6, z], .10, M.wood);
      if (z < -3.4 || z > .6) beam([-1.8, 10.6, z], [7.1, 7.43, z], .10, M.wood);
    }
    beam([-1.8, 10.55, -6], [-1.8, 10.55, 6], .15, M.wood);
    // Gable triangles have a real circular aperture; short lower wall supplies its sill area.
    for (const z of [-6, 6]) {
      const round = circle(.78, 8.65).map(p => [p[0] - 1.8, p[1]]);
      add(extrusion([[-7.2, 7.5], [7.2, 7.5], [-1.8, 10.7]], [round], .32), M.wall, 0, 0, z);
      const r = add(new THREE.TorusGeometry(.84, .10, 7, 32), M.honey, -1.8, 8.65, z + (z > 0 ? -.05 : .37));
      r.name = '前後山牆圓窗';
      const view = add(new THREE.PlaneGeometry(2.3, 2.3), kit.view(), -1.8, 8.65, z + (z > 0 ? .83 : -.51), { camThrough: true }); view.rotation.y = z > 0 ? Math.PI : 0;
      box(-1.8, 8.65, z + (z > 0 ? -.06 : .38), .07, 1.5, .08, M.honey); box(-1.8, 8.65, z + (z > 0 ? -.06 : .38), 1.5, .07, .08, M.honey);
    }
    // East-facing dormer: its round window and gabled ceiling are accessible from the landing.
    floor(7.3, -1.4, 2.5, 4, 4.2);
    for (const z of [-3.4, .6]) box(7.75, 6.6, z, 1.5, 4.8, .3, M.wall, true);
    wall(8.5, -1.4, 4, 4.2, 4.8, Math.PI / 2, [{ u: 0, y: 8.0, w: 1.5, round: true }]);
    const dormerGable=add(extrusion([[-2,9],[2,9],[0,10.5]],[],.32),M.wall,8.5,0,-1.4);dormerGable.rotation.y=Math.PI/2;
    for (const s of [-1, 1]) {
      const o = box(6.85, 9.75, -1.4 + s, 3.65, .18, 2.5, M.pale); o.rotation.x = s * .6435;
      beam([5.2, 10.4, -1.4], [8.5, 10.4, -1.4], .08, M.wood);
    }
    // High cheek infills meet the existing slope; the lower passage stays fully open.
    for(const z of [-3.4,.6]) {const cheek=add(extrusion([[5.2,8.2],[7.2,7.5],[7.2,9],[5.2,9]],[],.22),M.wall,0,0,z);cheek.name='老虎窗斜頂接縫';}
    // The existing tree stays on the left/rear: a faceted trunk, then supporting boughs.
    const trunk = beam([-6.1, 0, -2.6], [-6.4, 7.7, -3.1], .58, M.wood); trunk.userData.solid = true;
    beam([-6.4, 6.4, -3], [-3.8, 9.7, -3.1], .23, M.wood);
    beam([-6.2, 3.1, -2.8], [-5.3, 3.7, -4.4], .16, M.wood);
    for(const [x,y,z] of [[-4.8,3.0,-6.5],[-3.6,3.3,-6.5],[-2.2,8.9,6.5],[-1.1,9.3,6.5]]) {
      const b=ball(x,y,z,.65,M.petal,1.3,.7,.32);b.userData.camThrough=true;
      const c=ball(x+.5,y+.2,z,.42,M.rose,1,.8,.3);c.userData.camThrough=true;
    }
    for (let i = 0; i < 12; i++) {
      const y = .7 + i * .62; const x = -5.65 + Math.sin(i * 1.4) * .12;
      ball(x, y, -2.25, .19, M.leaf, 1.4, .5, 1); if (i % 2 === 0) flower(x, y + .1, -2.13, .17);
    }
    // Ground floor: root-side lounge, observation desk, and a separate potting workbench.
    cluster('入口旁內縮的花園長椅',-.75,0,0,0,()=>{
    box(-4.7, .45, 1.5, 2.7, .8, 1.15, M.wood, true); box(-4.7, .9, 1.5, 2.5, .3, 1.05, M.cream, true);
    box(-4.7, 1.35, 1.96, 2.65, 1, .22, M.wood, true);
    for (const x of [-5.35, -4.15]) ball(x, 1.3, 1.82, .37, M.pink, 1, 1, .35);
    });
    cluster('長椅前內縮的植物茶几',-1.5,0,0,0,()=>{
    add(new THREE.CylinderGeometry(1.25, 1.25, .055, 12), M.leafCloth, -3.5, .03, .2);
    add(new THREE.CylinderGeometry(.65, .8, .46, 12), M.honey, -3.4, .25, .1); plant(-3.4, .5, .1, .55);
    });
    table(-3.4, 0, -4.95, 2.6, 1.25);
    // Open field journal, lens, and an illustrated leaf board.
    for (const x of [-3.78, -3.18]) { const o = box(x, 1.18, -4.85, .58, .05, .75, M.paper); o.rotation.z = x < -3.4 ? -.08 : .08; }
    leafPicture(-1.7, 2.55, -5.78, 1.25); plant(-4.4, 1.15, -5, .7);
    const lens = add(new THREE.TorusGeometry(.20, .035, 6, 20), M.brass, -2.55, 1.2, -4.8); lens.rotation.x = -Math.PI / 2;
    beam([-2.4, 1.2, -4.7], [-2.13, 1.2, -4.43], .04, M.wood);
    table(2.55, 0, -4.85, 2.8, 1.4); for (const x of [1.65, 2.4, 3.3]) plant(x, 1.15, -4.85, .8, x !== 2.4);
    box(2.5, .4, -5.05, 2.2, .7, .8, M.wood, true);
    for (let i = 0; i < 5; i++) { const x = 4.7 + i * .32; beam([x, 2.2, -5.7], [x, 2.9, -5.7], .024, M.honey); ball(x, 2.2, -5.7, .13, i % 2 ? M.lavenderPetal : M.leaf, .6, 2, .5); }
    for (const y of [1, 2.1, 3.1]) { box(-6.6, y, -.4, .65, .10, 2.4, M.honey); for (let j = 0; j < 5; j++) { plant(-6.5, y + .06, -1.3 + j * .45, .48, j % 2 === 0); } }
    leafPicture(-.3, 2.5, -5.8); leafPicture(.6, 2.5, -5.8, .6);
    // Braced timber, seed drawers and flowering vines give the generous camera aisles a lived-in edge.
    for (const z of [-5.72, 5.72]) for (const x of [-6.7, -1.8, 6.7]) {
      for (const s of [-1, 1]) if (x + s * .8 > -7 && x + s * .8 < 7) beam([x, 3.15, z], [x + s * .8, 3.9, z], .10, M.honey);
    }
    for (const x of [-6.7, 6.7]) for (let j = 0; j < 10; j++) {
      const z = -5.1 + j * 1.08;
      box(x, .65, z, .13, .85, .08, M.honey);
      for (const y of [.24, 1.08]) box(x, y, z, .14, .09, .95, M.pale);
    }
    for (const [x,z] of [[-6.65,-5.65],[-1.85,5.65],[6.7,-5.65]]) {
      for (let j = 0; j < 7; j++) {
        const xx=x+Math.sin(j*1.8)*.15, yy=2.1+j*.24;
        ball(xx, yy, z, .21, j%2?M.darkLeaf:M.leaf, 1.2,.5,.7);
        if(j%2===0) flower(xx,yy+.06,z+.08,.19);
        if(j) beam([x+Math.sin((j-1)*1.8)*.15,yy-.24,z],[xx,yy,z],.018,M.darkLeaf);
      }
    }
    box(-6.25,.8,4.9,1.2,1.5,.65,M.wood,true);
    for (let j=0;j<4;j++) { box(-6.25,.25+j*.34,5.25,1.05,.28,.05,M.honey); ball(-6.25,.25+j*.34,5.3,.045,M.brass); }
    plant(-6.25,1.56,4.9,.9);
    for(let j=0;j<14;j++) {const a=j*Math.PI/7;const q=ball(-3.5+Math.cos(a)*1.45,.065,.2+Math.sin(a)*1.45,.35,M.cream,.75,.12,1.25);q.rotation.y=-a+Math.PI/2;}
    plant(-5.9, 0, 4.8, 1.4); plant(2.1, 1.11, 5.2, 1.0);
    // Attic: quilted leaf bed, seed archive, and a low dormer window seat.
    box(-4.25, 4.76, -4.1, 2.8, .25, 2.9, M.wood, true);
    for(const x of [-5.45,-3.05])for(const z of [-5.25,-2.95])box(x,4.48,z,.19,.56,.19,M.wood,true);
    add(kit.rbox(2.65,.35,2.8,.13),M.cream,-4.25,5.05,-4.1,{solid:true});
    box(-4.25, 5.26, -3.6, 2.7, .18, 1.8, M.leafCloth); box(-4.25, 5.55, -5.5, 2.9, 1.5, .18, M.honey, true);
    for (const x of [-4.95, -3.6]) ball(x, 5.4, -4.95, .48, M.pink, 1, .35, .7);
    for (let j = 0; j < 6; j++) flower(-5.1 + j % 3 * .82, 5.37, -4 + Math.floor(j / 3) * .6, .19, M.pink, M.cream);
    table(1.1, 4.2, -4.9, 3, 1.25);
    for (let j = 0; j < 5; j++) {
      const x = -.05 + j * .55;
      add(new THREE.CylinderGeometry(.16, .16, .46, 10), M.glass, x, 5.63, -5);
      box(x, 5.89, -5, .35, .08, .35, M.honey); ball(x, 5.5, -5, .10, j % 2 ? M.pollen : M.petalCream);
      book(x, 5.33, -4.62, j % 2 ? M.leafCloth : M.pink, .22);
    }
    for (const z of [-.6, -1.6]) box(7.8, 4.6, z, .95, .8, .8, M.honey, true);
    box(7.8, 5.08, -1.1, 1, .22, 1.8, M.cream, true);
    for (const x of [-3.4, -1.2, 1]) { leafPicture(x, 6.0, 5.8, .8); plant(x, x===-3.4?5.28:4.2, 5.2, .95); }
    add(new THREE.CylinderGeometry(1.3, 1.3, .04, 16), M.cream, -3, 4.23, 2.3);
    for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; const o = ball(-3 + Math.cos(a) * 1.25, 4.28, 2.3 + Math.sin(a) * 1.25, .45, M.leafCloth, .6, .12, 1.5); o.rotation.y = -a + Math.PI / 2; }
    // Second dressing pass: botanical collecting, woven cloth and hand-built joinery.
    // The existing shell, stairs, host, gifts and interaction standing circles stay intact.
    function soft(x,y,z,w,h,d,m,r=.05) {return add(shape('r'+[w,h,d,r],()=>kit.rbox(w,h,d,r)),m,x,y,z);}
    function bud(x,y,z,r,m,sx=1,sy=1,sz=1) {
      const q=shape('bud'+[r,sx,sy,sz],()=>new THREE.IcosahedronGeometry(r,0).scale(sx,sy,sz));return add(q,m,x,y,z);
    }
    function cluster(name,x,y,z,ry,fn) {
      const start=g.children.length;fn();const q=new THREE.Group();q.name=name;
      g.children.slice(start).forEach(o=>q.add(o));q.position.set(x,y,z);q.rotation.y=ry;g.add(q);return q;
    }
    function sprig(x,y,z,s=1) {
      add(new THREE.CylinderGeometry(.19*s,.14*s,.29*s,8),M.pot,x,y+.15*s,z);
      add(new THREE.TorusGeometry(.18*s,.025*s,4,10),M.potRim,x,y+.28*s,z).rotation.x=Math.PI/2;
      for(let j=0;j<5;j++) {
        const a=j*2.4,xx=x+Math.sin(a)*.23*s,zz=z+Math.cos(a)*.19*s,yy=y+(.5+j*.05)*s;
        beam([x,y+.25*s,z],[xx,yy,zz],.012*s,M.darkLeaf);
        bud(xx,yy-.06*s,zz,.18*s,M.leaf,1,.35,1.4);
        if(j%2===0) {for(let k=0;k<5;k++)bud(xx+Math.sin(k*1.256)*.085*s,yy,zz+Math.cos(k*1.256)*.085*s,.07*s,j%4?M.petalCream:M.petal,1,.5,1);bud(xx,yy+.03*s,zz,.045*s,M.pollen);}
      }
    }
    function vine(a,b,n=10) {
      for(let j=0;j<n;j++) {
        const t=j/(n-1),p=a.map((v,k)=>v+(b[k]-v)*t);p[0]+=.10*Math.sin(j*1.8);
        bud(...p,.22,j%2?M.leaf:M.darkLeaf,1.2,.5,.8);
        if(j%3===0) {bud(p[0]+.12,p[1]+.03,p[2]+.07,.13,M.petal,1,.5,1);bud(p[0]+.12,p[1]+.08,p[2]+.07,.045,M.petalCream);}
        if(j)beam(a.map((v,k)=>v+(b[k]-v)*(j-1)/(n-1)),p,.018,M.darkLeaf);
      }
    }
    function jar(x,y,z,s=1) {
      // Opaque glazed seed jars batch together; transparent glass is reserved for windows.
      add(new THREE.CylinderGeometry(.15*s,.17*s,.40*s,8),M.lavender,x,y+.21*s,z);
      for(let j=0;j<6;j++)bud(x+Math.sin(j*2.4)*.09*s,y+(.08+j*.044)*s,z+Math.cos(j*2.4)*.08*s,.045*s,j%2?M.seed:M.pollen);
      soft(x,y+.44*s,z,.34*s,.065*s,.34*s,M.honey,.02);
      box(x,y+.23*s,z+.17*s,.17*s,.16*s,.018,M.paper);
    }
    function mug(x,y,z,m=M.ceramic) {
      add(new THREE.CylinderGeometry(.13,.11,.22,10),m,x,y+.11,z);
      add(new THREE.CylinderGeometry(.105,.105,.012,10),M.tea,x,y+.225,z);
      add(new THREE.TorusGeometry(.09,.027,5,12),m,x+.14,y+.12,z);
    }
    function stack(x,y,z,n=3) {
      for(let j=0;j<n;j++){soft(x+(j%2)*.04,y+.06+j*.12,z,.50-j*.025,.10,.38,[M.leafCloth,M.pink,M.lavenderCloth][j%3],.018);box(x,y+.06+j*.12,z+.195,.40,.065,.012,M.paper);}
    }
    function shelf(x,y,z,w,ry) {
      cluster('森的種子與植物書架',x,y,z,ry,()=>{
        box(0,1.35,-.18,w,2.7,.08,M.wood,true);
        for(const xx of [-w/2,w/2])box(xx,1.4,0,.13,2.8,.58,M.honey,true);
        for(let row=0;row<4;row++) {
          const yy=.20+row*.72;box(0,yy,0,w+.15,.11,.66,M.honey,true);
          for(let j=0;j<7;j++) {
            const xx=-w/2+.22+j*(w-.38)/7;
            if(row%2===0 && j>3) {if(j%2===0)jar(xx,yy+.06,.02,.75);}
            else {const h=.30+((j*3+row)%4)*.075;book(xx,yy+.06,.07,[M.leafCloth,M.pink,M.lavenderCloth,M.honeyCloth][(j+row)%4],h);box(xx,yy+.16,.265,.11,.025,.012,M.brass);}
          }
        }
        sprig(w/2-.2,2.43,.03,.65);vine([w/2+.05,2.6,.25],[w/2+.05,1.7,.3],5);
      });
    }
    function basket(x,y,z,vegetables=false) {
      add(new THREE.CylinderGeometry(.42,.32,.45,12),M.pale,x,y+.225,z,{solid:true});
      for(let j=0;j<5;j++)add(new THREE.TorusGeometry(.33+j*.022,.018,4,16),M.honey,x,y+.04+j*.095,z).rotation.x=Math.PI/2;
      const handle=add(new THREE.TorusGeometry(.34,.035,5,16,Math.PI),M.honey,x,y+.44,z);handle.rotation.y=Math.PI/2;
      for(let j=0;j<5;j++){const xx=x+Math.sin(j*2.4)*.23,zz=z+Math.cos(j*2.4)*.18;bud(xx,y+.44,zz,.14,vegetables?M.pollen:M.petal,.65,1.4,.65);bud(xx,y+.63,zz,.14,M.leaf,1,.3,.8);}
    }
    // Wall bays: shallow panelling respects every real window aperture.
    for(const y of [0,4.2]) {
      for(const z of [-5.65,5.65]) {
        const bays=y===0 && z>0?[[-6.7,-4.1],[-2.2,6.7]]:[[-6.7,6.7]];
        for(const [a,b] of bays) {
          box((a+b)/2,y+.13,z,b-a,.16,.13,M.wood);
          for(let x=a+.22;x<b;x+=.56)box(x,y+.50,z,.035,.66,.08,M.pale);
          box((a+b)/2,y+.87,z,b-a,.09,.14,M.honey);
        }
      }
      for(const x of [-6.62,6.62]) {
        // East upstairs has the stair and open dormer passage, so keep its bays clear.
        if(y>0 && x>0)continue;
        box(x,y+.15,0,.14,.18,11.3,M.wood);box(x,y+.88,0,.14,.10,11.3,M.honey);
        for(let z=-5.4;z<5.6;z+=.55)box(x,y+.50,z,.08,.66,.035,M.pale);
      }
    }
    // Fine ceiling strips follow the asymmetric roof rather than a new flat ceiling.
    for(let x=-6.6;x<6.8;x+=.43) {
      const yy=x< -1.8?7.5+(x+7.25)*3.2/5.45:10.7-(x+1.8)*3.2/9.05;
      if(x<5)box(x,yy-.15,0,.025,.035,11.7,M.honey);
      else {box(x,yy-.15,-4.7,.025,.035,2.3,M.honey);box(x,yy-.15,3.3,.025,.035,5.1,M.honey);}
    }
    for(const z of [-4.6,-1.6,1.6,4.7])for(const x of [-6.6,-.8,3.5]) {
      beam([x,3.72,z],[x+.55,3.45,z],.06,M.honey);
    }
    for(let x=-6.6;x<4;x+=.48)box(x,3.752,0,.016,.012,11.7,M.honey);
    shelf(-.8,0,5.5,2.2,Math.PI);shelf(-6.35,4.2,1.5,2.4,Math.PI/2);
    shelf(1.1,4.2,5.52,2.0,Math.PI);
    // Full-length vine accents live against walls or overhead, never in the circulation lane.
    for(const x of [-6.6,-1.85,6.65])for(const z of [-5.55,5.5]) {
      vine([x,3.75,z],[x,2.1,z],8);vine([x,7.35,z],[x,6.1,z],7);
    }
    vine([-5.5,7.2,-2.7],[-4.3,9.1,-3.1],9);vine([-6.0,3.5,-2.4],[-5.65,.5,-2.3],12);
    vine([-1.5,3.70,-2.8],[1.6,3.70,-2.8],12);
    for(const [x,y,z,top] of [[-5.1,2.55,5.35,3.78],[-5.8,6.5,.25,8.1]]) {
      sprig(x,y,z,.85);
      for(const side of [-1,1])beam([x+side*.18,y+.24,z],[x,top,z],.014,M.paleCloth);
      vine([x+.18,y+.25,z],[x+.23,y-.45,z],5);
    }
    // Gathered curtains with rods and ties, rotated into each window's local wall plane.
    function curtains(x,y,z,w,h,ry) {
      cluster('花園綁帶窗簾與花台',x,y,z,ry,()=>{
        beam([-w/2-.28,h+.17,0],[w/2+.28,h+.17,0],.035,M.brass);
        for(const side of [-1,1]) {
          for(let j=0;j<3;j++) {const o=soft(side*(w/2+.10)+j*.055, h*.57,.09,.14,h*.91,.12,j%2?M.cream:M.pink,.035);o.rotation.z=side*.035;}
          box(side*(w/2+.16),h*.42,.18,.29,.07,.07,M.brass);
        }
        for(const side of [-1,1])sprig(side*w*.34,-.04,.15,.65);
      });
    }
    curtains(3.3,1.1,5.63,2.2,2.65,Math.PI);
    curtains(-4.1,1.1,-5.55,2.1,2.5,0);curtains(3.3,1.25,-5.55,2,2.35,0);
    curtains(-6.55,1.15,3.25,1.85,2.45,Math.PI/2);
    curtains(6.55,1.1,1.8,2,2.6,-Math.PI/2);
    // Lounge: spindle arms, upholstered piping and a casually folded throw.
    cluster('花園長椅的扶手與織物',-.75,0,0,0,()=>{
    for(const x of [-6.05,-3.35]) {
      soft(x,1.18,1.5,.20,.18,1.4,M.honey).userData.solid=true;
      for(const z of [1,1.95])box(x,.87,z,.12,.62,.12,M.wood,true);
      bud(x,1.30,1.9,.11,M.brass);
    }
    soft(-4.7,1.02,1.46,2.45,.08,1.02,M.paleCloth);
    soft(-5.45,1.09,1.4,.65,.06,1.1,M.leafCloth,.02);soft(-5.45,.68,.91,.65,.77,.05,M.leafCloth,.02);
    for(let j=0;j<7;j++)beam([-5.72+j*.09,.28,.90],[-5.72+j*.09,.16,.90],.012,M.paleCloth);
    });
    cluster('植物茶几的杯書與編織細節',-1.5,0,0,0,()=>{
    stack(-3.55,.49,.12,2);mug(-2.98,.49,.35);sprig(-3.5,.73,-.10,.5);
    for(let j=0;j<10;j++){const a=j*Math.PI/5;beam([-3.4+Math.cos(a)*.76,.05,.1+Math.sin(a)*.76],[-3.4+Math.cos(a)*.64,.44,.1+Math.sin(a)*.64],.026,M.wood);}
    soft(-3.4,.49,.12,.48,.025,1.08,M.pink,.01);
    });
    // A layered leaf runner fills the room visually while retaining clear walking and gift space.
    soft(.25,.023,-.1,4.8,.025,3.35,M.leafCloth,.10);soft(.25,.041,-.1,4.48,.014,3.05,M.cream,.08);
    for(let j=0;j<12;j++){const x=-1.8+j*.36;bud(x,.058,-1.52,.18,M.leafCloth,1,.1,1.4);bud(x,.058,1.31,.18,M.leafCloth,1,.1,1.4);}
    for(const y of [.026,.045]) {const m=add(new THREE.CylinderGeometry(y<.04?.80:.67,y<.04?.80:.67,.014,32),y<.04?M.honeyCloth:M.paleCloth,-3.15,y,4.15);m.name='編織門墊';}
    // Dedicated fieldwork tools, labels, plant presses and the watering can.
    cluster('有靠墊的觀察椅',-5.05,0,-4.5,-.3,()=>{
      soft(0,.55,0,.82,.15,.8,M.cream).userData.solid=true;box(0,1.03,.34,.85,.9,.12,M.honey,true);
      for(const x of [-.30,.30])for(const z of [-.28,.28])box(x,.27,z,.10,.54,.10,M.wood,true);
      soft(0,1.07,.25,.55,.45,.12,M.pink);
    });
    stack(-3.9,1.14,-5.16,2);mug(-2.42,1.14,-5.10);sprig(-4.4,1.72,-5,.45);
    for(let j=0;j<3;j++)box(-3.78,1.22,-4.65+j*.1,.32,.009,.017,M.ink);
    box(-2.23,1.23,-4.63,.06,.12,.38,M.honey).rotation.y=.4;
    cluster('澆水壺與園藝掛具',3.15,1.15,-4.82,0,()=>{
      add(new THREE.CylinderGeometry(.26,.30,.46,10),M.iron,0,.24,0);
      add(new THREE.TorusGeometry(.29,.035,5,18,Math.PI),M.brass,0,.48,0);
      beam([.18,.18,0],[.63,.48,0],.065,M.iron);bud(.65,.5,0,.12,M.brass,1,.35,1);
    });
    box(2.4,2.5,-5.65,2.9,.13,.16,M.honey);
    for(let j=0;j<4;j++) {
      const x=1.45+j*.55;beam([x,2.38,-5.5],[x,1.83,-5.5],.04,M.wood);
      if(j<3)bud(x,1.72,-5.5,.16,M.blade,.8,1.4,.22);
      else {add(new THREE.TorusGeometry(.09,.02,4,12),M.brass,x-.07,1.83,-5.5);add(new THREE.TorusGeometry(.09,.02,4,12),M.brass,x+.07,1.83,-5.5);}
    }
    basket(3.5,0,-5.15,true);
    for(let j=0;j<3;j++)add(new THREE.CylinderGeometry(.26+j*.035,.19+j*.02,.32,9),M.pot,1.55,.16+j*.17,-5.10);
    for(const x of [2.1,2.55])box(x,.28,-5.02,.38,.42,.45,M.pale);
    // Bed and window corner: curved upholstery, seams, folded blanket and petal cushions.
    soft(-4.25,5.32,-3.05,2.58,.14,.58,M.pink,.06);
    for(let j=0;j<11;j++)box(-5.45+j*.24,5.40,-3.05,.018,.014,.48,M.cream);
    for(const x of [-5.67,-2.83]) {box(x,5.44,-5.5,.15,1.9,.21,M.wood,true);bud(x,6.44,-5.5,.17,M.honey);}
    for(let j=0;j<7;j++)box(-5.42+j*.39,5.78,-5.37,.025,1.04,.035,M.pale);
    box(-2.2,4.62,-5.0,.84,.84,.74,M.honey,true);soft(-2.2,5.07,-5,.95,.12,.83,M.paleCloth);
    for(let j=0;j<2;j++){box(-2.2,4.42+j*.32,-4.61,.68,.25,.06,M.wood);bud(-2.2,4.42+j*.32,-4.56,.04,M.brass);}
    stack(-2.23,5.15,-5.05,2);sprig(-2.03,5.39,-4.95,.5);
    soft(7.72,5.25,-.72,.65,.35,.22,M.pink);soft(7.72,5.25,-1.55,.65,.35,.22,M.leafCloth);
    stack(7.7,5.2,-2.03,2);sprig(8.0,5.14,-.3,.6);
    // Dress the dormer cheeks and seat front; no new solid projects into its approach.
    box(7.35,4.62,-1.1,.04,.72,1.85,M.honey,true);
    for(const z of [-1.55,-.65]) {box(7.32,4.62,z,.03,.50,.71,M.wood);bud(7.29,4.62,z,.04,M.brass);}
    for(const z of [-3.23,.43]) {
      for(const x of [7.12,8.31])box(x,6.45,z,.10,4.4,.12,M.honey);
      for(const yy of [4.38,5.23,7.5,8.6])box(7.74,yy,z,1.4,.10,.13,M.wood);
      cluster('老虎窗的葉片標本框',7.74,6.25,z,z<0?0:Math.PI,()=>{leafPicture(0,0,0,.75);});
      vine([8.25,7.5,z],[8.25,6.7,z],5);
    }
    box(8.27,5.97,-1.4,.10,1.65,2.7,M.wood);
    for(const yy of [5.58,6.40]) {
      box(8.17,yy,-1.4,.38,.09,2.8,M.honey);
      for(let j=0;j<5;j++)jar(8.11,yy+.05,-2.5+j*.50,.70);
    }
    for(const z of [-2.65,-.15])sprig(8.05,6.46,z,.6);
    soft(.3,4.235,-1.8,2.0,.025,3.8,M.leafCloth,.06);
    soft(.3,4.252,-1.8,1.82,.014,3.6,M.cream,.05);
    for(let j=0;j<9;j++)bud(.3,4.27,-3.35+j*.39,.15,M.leafCloth,1.2,.1,.6);
    basket(-6.15,4.2,3.9);soft(-3,4.25,2.3,3.6,.025,3.5,M.pink,.1);
    // Third pass: each island is an activity, with clear approaches on the public side.
    function roundSolid(x,y,z,w,h,d,m,r=.07) {const o=soft(x,y,z,w,h,d,m,r);o.userData.solid=true;return o;}
    function fern(x,y,z,s=1) {
      const q=cluster('高矮錯落的蕨葉盆',x,y,z,0,()=>{
        soft(0,.30*s,0,.76*s,.60*s,.76*s,M.potRim,.09*s);
        add(new THREE.CylinderGeometry(.30*s,.30*s,.04,10),M.soil,0,.61*s,0);
        for(let j=0;j<7;j++) {
          const a=j*2.4,h=(.9+j%3*.19)*s,r=(.36+j%2*.12)*s;
          const end=[Math.cos(a)*r,h,Math.sin(a)*r];beam([0,.56*s,0],end,.018*s,M.darkLeaf);
          for(let k=1;k<4;k++)for(const side of [-1,1]) {
            const t=k/4,xx=end[0]*t+Math.sin(a)*side*.17*s,zz=end[2]*t-Math.cos(a)*side*.17*s;
            const o=bud(xx,.56*s+(h-.56*s)*t,zz,(.14+k*.025)*s,j%2?M.darkLeaf:M.leaf,1.5,.28,.65);o.rotation.y=-a+side*.55;
          }
        }
      });q.userData.solid=true;return q;
    }
    function drawers(x,y,z,w,d,h) {
      roundSolid(x,y+h/2,z,w,h,d,M.wood);
      soft(x,y+h+.06,z,w+.12,.12,d+.08,M.pale,.05);
      for(let row=0;row<2;row++)for(let col=0;col<3;col++) {
        const xx=x-w*.32+col*w*.32,yy=y+.22+row*(h-.28)/2;
        soft(xx,yy,z+d/2+.02,w*.29,(h-.20)/2-.04,.06,M.honey,.025);
        box(xx,yy+.03,z+d/2+.059,.18,.07,.018,M.paper);bud(xx,yy-.05,z+d/2+.075,.035,M.brass);
      }
    }
    function press(x,y,z) {
      soft(x,y+.08,z,.68,.13,.52,M.honey,.035);soft(x,y+.23,z,.62,.12,.49,M.pale,.025);
      for(const xx of [-.23,.23])beam([x+xx,y+.12,z],[x+xx,y+.43,z],.025,M.brass);
      bud(x,y+.31,z,.17,M.leaf,1.3,.1,.55);
    }
    function stool(x,y,z,m=M.pink) {
      roundSolid(x,y+.48,z,.72,.18,.67,M.honey);
      soft(x,y+.60,z,.68,.14,.63,m,.065);
      for(const dx of [-.23,.23])for(const dz of [-.21,.21])beam([x+dx,y+.04,z+dz],[x+dx*.85,y+.45,z+dz*.85],.055,M.wood);
    }
    cluster('一樓・記錄發芽的中央育苗島',2.75,0,-.80,0,()=>{
      table(0,0,0,2.9,2.7);drawers(0,0,0,2.3,1.72,.70);
      for(const x of [-.85,0,.85]) {
        soft(x,1.17,-.36,.67,.12,.95,M.wood,.045);
        for(let j=0;j<3;j++) {sprig(x-.16+j*.16,1.24,-.53+j*.21,.62+j%2*.11);box(x+.18,1.35,-.69+j*.22,.12,.18,.018,M.paper);}
      }
      press(-.65,1.15,.65);stack(.45,1.15,.58,3);mug(1.05,1.15,.58);
    });
    cluster('一樓・樹根邊的壓葉與歸檔角',-4.0,0,-1.55,0,()=>{
      drawers(0,0,0,2.65,.85,.92);press(-.65,1.05,0);stack(.15,1.05,0,3);sprig(.92,1.05,0,.9);
      basket(-1.22,0,-.23);leafPicture(-.15,1.65,-.22,.6);
    });
    cluster('一樓・兩人安靜翻書的花茶角',-1.45,0,1.35,0,()=>{
      table(0,0,0,1.8,2.1);soft(0,1.15,0,.65,.025,1.95,M.pink,.02);
      stack(-.43,1.16,-.22,3);mug(.48,1.16,.25);sprig(.43,1.16,-.42,.65);
      roundSolid(0,.42,1.05,1.75,.68,.64,M.honey);soft(0,.81,1.05,1.70,.16,.61,M.cream,.07);
      for(const x of [-.5,.5])soft(x,.94,1.20,.46,.36,.15,M.pink,.07);
    });
    cluster('一樓・窗前分裝花苗與菜籃',1.55,0,5.10,0,()=>{
      drawers(0,0,0,2.0,.95,.98);
      for(let j=0;j<5;j++)sprig(-.76+j*.38,1.11,0,.85+(j%3)*.12);
      basket(-1.36,0,-.18,true);
    });
    cluster('一樓・門邊的返家種袋櫃',-.95,0,5.22,0,()=>{
      drawers(0,0,0,1.25,.78,.72);basket(-.25,.85,0);stack(.35,.85,0,3);sprig(.35,1.27,0,.6);
    });
    cluster('一樓・梯後園具收納小景',5.65,0,-4.65,0,()=>{
      drawers(0,0,0,1.55,1.4,.72);basket(-.15,.85,0,true);sprig(.45,.85,-.35,.85);
      for(let j=0;j<3;j++)soft(-.38+j*.3,.98,.48,.24,.24,.25,M.honey,.04);
    });
    drawers(-.55,0,-5.0,1.1,1.15,.86);press(-.55,.99,-5.0);sprig(-.55,1.32,-5.15,.65);
    fern(3.65,0,2.10,.80);
    fern(2.75,1.14,-.60,.85);
    cluster('一樓・壓葉器旁的窄種莢櫃',-.65,0,-4.10,0,()=>{
      drawers(0,0,0,.80,.45,1.25);jar(0,1.38,0,1.0);stack(0,1.89,0,2);
    });
    cluster('一樓・觀察桌旁待收的壓葉採集袋',0,0,-3.3,0,()=>{
      // A low field bag and a press (all below 0.45 m), outside the standing circles.
      soft(0,.14,0,.60,.28,.64,M.leafCloth,.08);soft(0,.30,0,.66,.05,.67,M.paleCloth,.02);
      for(const x of [-.20,.20])soft(x,.18,0,.055,.31,.66,M.honeyCloth,.012);
      soft(.08,.36,.05,.48,.07,.38,M.pink,.018);bud(-.16,.35,-.18,.10,M.leaf,1.5,.20,.6);
      beam([-.15,.34,.20],[.19,.34,.20],.015,M.brass);
    });
    cluster('一樓・主人身旁的採集標本台',-1.88,0,-.55,0,()=>{
      drawers(0,0,0,1.50,.65,.84);press(0,.97,0);sprig(0,1.25,0,.7);
    });
    cluster('一樓・花茶角旁的待讀書箱',2.20,0,2.50,0,()=>{
      drawers(0,0,0,1.2,.70,.73);stack(-.30,.86,0,4);sprig(.37,.86,0,.9);mug(.04,.86,.16);
    });
    // The loft has its own quiet seed library and sewing/reading corners, not a second nursery.
    cluster('閣樓・種袋分類與植物拓印中島',1.15,4.2,-.65,0,()=>{
      table(0,0,0,2.4,2.6);drawers(0,0,0,2.05,1.55,.78);
      press(-.65,1.15,-.40);stack(.53,1.15,.3,4);
      for(let j=0;j<4;j++){jar(-.5+j*.32,1.15,.55,.85);box(-.58+j*.32,1.24,.74,.16,.08,.018,M.paper);}
      sprig(.75,1.15,-.55,.85);
    });
    cluster('閣樓・花瓣抱枕與縫葉被的閱讀榻',-2.95,4.2,1.45,0,()=>{
      roundSolid(0,.40,0,2.6,.68,1.8,M.wood);soft(0,.84,0,2.5,.25,1.7,M.cream,.11);
      roundSolid(0,1.20,.70,2.65,.84,.24,M.honey);
      for(let j=0;j<3;j++)soft(-.8+j*.8,1.12,.49,.65,.55,.24,j%2?M.leafCloth:M.pink,.09);
      soft(-.73,.99,-.25,.72,.05,1.6,M.leafCloth,.02);stack(.67,.99,-.48,3);
      basket(-1.35,0,.12);stool(1.25,0,-.25);mug(1.25,.68,-.25);
    });
    cluster('閣樓・晾乾種莢的窗下長櫃',-3.45,4.2,4.96,0,()=>{
      drawers(0,0,0,3.15,1.15,.95);press(-.9,1.08,0);stack(.12,1.08,.1,3);
      for(let j=0;j<3;j++)jar(.53+j*.32,1.08,0,1.05);sprig(-1.28,1.08,-.22,1.1);
    });
    fern(-5.25,4.2,.05,1.15);
    fern(-.45,4.2,-1.80,.9);fern(3.60,4.2,-4.72,1.0);
    cluster('閣樓・閱讀榻的植物書端櫃',-1.8,4.2,0,0,()=>{
      drawers(0,0,0,.95,.70,1.10);stack(0,1.23,0,4);sprig(.17,1.70,0,.75);
    });
    cluster('閣樓・種袋中島的試種記錄端櫃',.55,4.2,1.05,0,()=>{
      drawers(0,0,0,.9,.80,.84);press(0,.97,0);jar(.2,1.28,0,.8);
    });
    cluster('閣樓・閱讀榻旁的葉形小茶几',-.02,4.2,2.97,0,()=>{
      drawers(0,0,0,1.10,.75,.66);stack(-.24,.79,0,3);sprig(.31,.79,-.08,.70);mug(.12,.79,.22);
    });
    cluster('閣樓・老虎窗旁的採集籃與植物凳',5.6,4.2,-4.95,0,()=>{
      drawers(0,0,0,1.7,1.15,.70);basket(-.2,.83,0);sprig(.5,.83,-.1,1.05);stack(.35,.83,.3,2);
    });
    cluster('閣樓・葉被收納與修補籃',3.05,4.2,4.35,0,()=>{
      drawers(0,0,0,1.35,2.35,.73);soft(0,.92,.30,1.26,.20,1.18,M.leafCloth,.09);
      soft(0,1.06,.29,1.12,.12,.62,M.pink,.06);basket(0,0,-.58);stack(0,.86,-.62,3);
    });
    // Every functional light has a visible suspended shade and an actual attachment.
    for (const p of [[-2,3.1,1.4],[2.1,3.05,-3.6],[-5.7,2.9,-2.2],[-2.2,7,1.5],[.8,6.8,-4.8],[7.8,6.6,-1.15]]) {
      lamp(...p);const [x,y,z]=p;
      add(new THREE.ConeGeometry(.40,.25,8),M.brass,x,y+.45,z);
      const ceiling=y<4?3.78:(x>7?10.3:10.4-Math.abs(x+1.8)*.28);
      beam([x,y+.58,z],[x,ceiling,z],.018,M.brass);
      for(let yy=y+.68;yy<ceiling;yy+=.28)bud(x,yy,z,.028,M.brass);
    }
    g.userData = {
      // 一樓燈槽與閣樓木飾線洗牆分層鋪光，葉背圖與種子書架聚焦，育苗層板和觀察桌補任務光、茶角書櫃腳留柔光。
      glow: [
        { kind: 'cove', a: [-.7, 3.5, -5.9], b: [1.2, 3.5, -5.9], n: [0, 1], c: '#f3ead8' },
        { kind: 'under', a: [-1.65, 2.303, 5.21], b: [0, 2.303, 5.21] },
        { kind: 'wash', a: [-6.9, 7.27, -.9], b: [-6.9, 7.27, -.1], n: [1, 0], c: '#8a5a3b' },
        { kind: 'under', a: [-6.315, 2.048, -1.35], b: [-6.315, 2.048, .5] },
        { kind: 'under', a: [8.01, 6.353, -2.45], b: [8.01, 6.353, -1.5] },
        { kind: 'kick', a: [1.8, .107, 2.855], b: [2.6, .107, 2.855], n: [0, 1] },
        { kind: 'spot', p: [-1.7, 3.76, -3.9], t: [-1.7, 2.55, -5.7], r: .75 },
        { kind: 'spot', p: [-3.45, 3.7, -4.2], t: [-3.45, 1.21, -4.85], r: .65 }
      ],
      spawn: [-3.15, 0, 4.15, Math.PI], exit: [-3.15, 5.6, .6], host: [-.65, 0, -1.8, .2],
      gifts: [[-.2, 0, 3.4, 0], [1.8, 0, 1.1, 0], [-5.8, 0, 3.5, 0], [1.5, 4.2, 2.1, 0], [0, 4.2, 4.4, 0]],
      lights: [[-2, 3.1, 1.4, '#ffdbab', 1.4], [2.1, 3.05, -3.6, '#ffdcad', 1.35], [-5.7, 2.9, -2.2, '#ffe4bf', 1], [-2.2, 7, 1.5, '#ffdcad', 1.6], [.8, 6.8, -4.8, '#ffe5bf', 1.4], [7.8, 6.6, -1.15, '#ffdcad', 1.2]],
      sun: [1, .85, .35],
      spots: [
        { x: -3.4, y: 0, z: -3.25, r: 1.2, kind: 'study', label: '讀讀葉背', name: '葉背觀察日記', lines: ['你、你想一起看看葉子的背面嗎？', '氣孔讓植物交換氣體，也會散失水分。', '我先把看見的畫下來，畫歪也沒關係。'], alone: ['攤開的日記畫著葉背與小小的氣孔。', '頁角寫著：今天比昨天多看見一點，就很好。'] },
        { x: 2.65, y: 0, z: -3.15, r: 1.2, kind: 'look', label: '看看小芽', name: '育苗與澆水工作台', lines: ['這三盆是同一天播下的，長得不太一樣。', '水、光和溫度，我都分開記錄了。', '慢一點的小芽，也有自己的時間。'], alone: ['育苗盆旁排著澆水日期，沒有催長的記號。', '小壺留在桌角，壺嘴還掛著一顆水珠。'] },
        { x: -3.65, y: 0, z: 3.25, r: 1.2, kind: 'look', label: '坐坐樹蔭', name: '樹根旁的花園長椅', lines: ['你來了……靠枕是剛曬過的。', '窗外的蜂箱不搬進來，蜜蜂需要自己的路。', '我們坐著看牠們來回，就很熱鬧了。'], alone: ['粉色靠枕陷進奶油色椅墊，像有人留了座位。', '窗邊的小花朝著光，樹影慢慢經過。'] },
        { x: 1.05, y: 4.2, z: -3.2, r: 1.2, kind: 'look', label: '看看種子', name: '閣樓種子收藏桌', lines: ['我把種子先晾乾，再收進小罐子。', '每罐都記著採集日期，才不會認錯。', '你想挑一罐看看嗎？我會慢慢陪你找。'], alone: ['小罐依採集日期排好，紙條畫著母株的葉。', '桌上留著一個空位，等下一次散步帶回的發現。'] },
        { x: 6.2, y: 4.2, z: -2.35, r: 1.1, kind: 'look', label: '看看圓窗', name: '樹冠老虎窗座', lines: ['這個圓窗，剛好能看見櫻樹的新枝。', '鳥屋還在樹外，我只隔著窗觀察。', '不打擾牠們，也是照顧的一部分。'], alone: ['圓窗十字木櫺把天光分成四片。', '窗座上的小本子只畫鳥影，沒有靠近鳥巢的路。'] },
        { x: -3.3, y: 4.2, z: -1.60, r: 1.2, kind: 'look', label: '看看葉被', name: '樹冠下的葉片拼被床', lines: ['這些葉片是布做的，不會被我澆濕。', '夜裡把觀察本合起來，眼睛也要休息。', '明天的小芽，我們明天再看就好。'], alone: ['葉片拼被上縫著幾朵小花。', '床頭的日記已合上，書籤停在今天。'] }
      ],
      architecture: { levels: [0, 4.2], stairs: [{ from: [5.5, 0, 3.9], to: [5.5, 4.2, -1.3], width: 1.8, steps: 18, slope: angle * 180 / Math.PI }], windows: { groundArches: 6, gableCircles: 2, eastDormerCircle: 1 }, palette: '外觀奶油灰泥、蜂蜜木、苔綠、粉櫻' }
    };
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
