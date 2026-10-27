/* 潮汐小島 · geography 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['geography'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['geography'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '嵐的旅人瞭望屋';
    const C = { plaster: '#f2e8d6', wood: '#8b6a45', honey: '#bd9561', dark: '#554631', roof: '#6f9a5e', cream: '#eee0bd', brass: '#d1a654', pink: '#e9a8b6', lavender: '#b3a0d0', leaf: '#70834f', sea: '#a5c6c6', stone: '#c8bea7', coral: '#de8651' };
    const kinds = { plaster:'plaster', wood:'wood', honey:'wood', dark:'wood', roof:'fabric', cream:'paper', brass:'metal', pink:'foliage', lavender:'fabric', leaf:'foliage', sea:'ceramic', stone:'stone', coral:'fabric' };
    const M = {}; Object.keys(C).forEach(k => { M[k] = kit.mat(C[k], k === 'brass' ? { metalness:.8, roughness:.36 } : {}, kinds[k]); });
    Object.assign(M, {
      linen:kit.mat(C.cream,{},'fabric'), pinkCloth:kit.mat(C.pink,{},'fabric'), goldCloth:kit.mat(C.honey,{},'fabric'),
      ceramic:kit.mat(C.cream,{},'ceramic'), darkGlaze:kit.mat(C.dark,{},'ceramic'), greenPetal:kit.mat(C.roof,{},'foliage'), whitePetal:kit.mat(C.cream,{},'foliage'),
      pollen:kit.mat(C.brass,{},'foliage'), ink:kit.mat(C.dark,{},'paper'), mapGreen:kit.mat(C.leaf,{},'paper'), mapRed:kit.mat(C.coral,{},'paper'), scale:kit.mat(C.honey,{},'paper'),
      paleWood:kit.mat(C.cream,{},'wood'), paleStone:kit.mat(C.cream,{},'stone'), iron:kit.mat(C.dark,{metalness:.8,roughness:.36},'metal'),
      flags:[kit.mat(C.roof,{side:THREE.DoubleSide},'fabric'),kit.mat(C.cream,{side:THREE.DoubleSide},'fabric')]
    });
    const glow = kit.lamp('#ffdb9e');
    // Desaturated honey oak: three shared plank tones, distinct from the joinery.
    const oak = ['#b7a184', '#bda88c', '#b29b7e'].map(c => kit.mat(c, {}, 'wood'));
    const viewSurface = kit.view().clone(); viewSurface.uniforms = kit.view().uniforms; viewSurface.transparent = true; viewSurface.depthWrite = false;
    function mesh(q, m, x = 0, y = 0, z = 0, solid = false) { const o = new THREE.Mesh(q, m); o.position.set(x, y, z); if (solid) o.userData.solid = true; g.add(o); return o; }
    function box(x, y, z, w, h, d, m = M.wood, solid = false) { return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, solid); }
    function ball(x, y, z, r, m, sx = 1, sy = 1, sz = 1) { const o = mesh(new THREE.SphereGeometry(r, 8, 5), m, x, y, z); o.scale.set(sx, sy, sz); return o; }
    function beam(a, b, r = .07, m = M.wood, solid = false) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), v = B.clone().sub(A); const o = mesh(new THREE.CylinderGeometry(r, r, v.length(), 6), m, ...A.add(B).multiplyScalar(.5).toArray(), solid); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return o; }

    // Round-two dressing: cached rounded silhouettes and a shared thirteen-colour palette.
    const rounded = new Map();
    function soft(x,y,z,w,h,d,m,solid=false) {
      const key=[w,h,d].join('/');
      if(!rounded.has(key)) rounded.set(key,kit.rbox(w,h,d,Math.min(.08,w*.25,h*.35,d*.25)));
      return mesh(rounded.get(key),m,x,y,z,solid);
    }
    function ring(x,y,z,r,t,m,rx=0,ry=0) {const o=mesh(new THREE.TorusGeometry(r,t,4,12),m,x,y,z);o.rotation.set(rx,ry,0);return o;}
    function book(x,y,z,w,h,d,m,flat=false) {
      if(flat){box(x,y+h/2,z,w,h,d,M.cream);for(const yy of [y+.014,y+h-.014])soft(x,yy,z,w+.045,.028,d+.045,m);box(x-w/2,y+h/2,z,.04,h,d,m);}
      else{box(x,y+h/2,z,w,h,d,M.cream);for(const xx of [x-w/2,x+w/2])box(xx,y+h/2,z,.025,h+.035,d+.04,m);box(x,y+h/2,z+d/2,w+.035,h+.035,.035,m);for(const yy of [y+.09,y+h-.08])box(x,yy,z+d/2+.023,w,.025,.015,M.brass);}
    }
    function cup(x,y,z,m=M.ceramic) {mesh(new THREE.CylinderGeometry(.14,.15,.025,12),M.ceramic,x,y+.013,z);mesh(new THREE.CylinderGeometry(.09,.065,.16,10),m,x,y+.11,z);mesh(new THREE.CylinderGeometry(.073,.073,.009,10),M.darkGlaze,x,y+.193,z);ring(x+.1,y+.12,z,.058,.016,m);}
    function vase(x,y,z,m=M.ceramic) {
      ball(x,y+.19,z,.2,m,1,1.2,1);mesh(new THREE.CylinderGeometry(.08,.11,.18,9),m,x,y+.37,z);
      for(let i=0;i<5;i++){const a=i*2.4,X=x+Math.sin(a)*.22,Z=z+Math.cos(a)*.18,Y=y+.66+(i%2)*.12;beam([x,y+.38,z],[X,Y,Z],.012,M.leaf);flower(X,Y,Z,i%2?M.pink:M.whitePetal);}
    }
    function flower(x,y,z,m=M.whitePetal){for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const p=mesh(new THREE.SphereGeometry(.055,6,4),m,x+Math.sin(a)*.065,y+Math.cos(a)*.065,z);p.scale.z=.45;}ball(x,y+.018,z,.035,M.pollen);}
    function vine(x,y,z,len,axis='y') {
      let old=[x,y,z];
      for(let j=0;j<Math.ceil(len/.24);j++){const d=j*.24,p=axis==='x'?[x+d,y+.1*Math.sin(j),z]:[x+.10*Math.sin(j*.9),y-d,z];if(j)beam(old,p,.018,M.leaf);old=p;
        for(const s of [-1,1]){const q=ball(p[0]+s*.12,p[1]-.04,p[2]+.04,.14,M.leaf,1.2,.42,.7);q.rotation.z=s*.6;}
        if(j%4===1)flower(p[0],p[1]-.04,p[2]-.1,j%2?M.whitePetal:M.pink);
      }
    }
    function crate(x,y,z,w=.9,h=.55,d=.7,rocks=false) {
      box(x,y+.055,z,w,.11,d,M.wood,true);
      for(let k=0;k<3;k++){const yy=y+.14+k*(h-.1)/3;for(const s of [-1,1]){box(x+s*(w/2-.035),yy,z,.075,(h-.12)/3-.025,d,M.honey,true);box(x,yy,z+s*(d/2-.035),w,(h-.12)/3-.025,.075,M.honey,true);}}
      for(const sx of [-1,1])for(const sz of [-1,1]){box(x+sx*(w/2-.07),y+h/2,z+sz*(d/2-.07),.10,h,.1,M.wood,true);ball(x+sx*(w/2-.07),y+h-.09,z+sz*(d/2+.004),.025,M.brass);}
      if(rocks)for(let k=0;k<7;k++)ball(x+(k%3-1)*w*.22,y+h-.04+(k%2)*.07,z+(Math.floor(k/3)-1)*d*.22,.13,[M.stone,M.paleStone,M.leaf][k%3],1.2,.7,1);
    }
    function barrel(x,y,z){mesh(new THREE.CylinderGeometry(.31,.34,.72,10),M.honey,x,y+.36,z,true);for(const yy of [.12,.6])ring(x,y+yy,z,.335,.035,M.iron,Math.PI/2);for(let j=0;j<10;j++){const a=j*Math.PI/5;beam([x+Math.sin(a)*.33,y+.06,z+Math.cos(a)*.33],[x+Math.sin(a)*.31,y+.69,z+Math.cos(a)*.31],.015,M.wood);}mesh(new THREE.CylinderGeometry(.29,.29,.04,10),M.wood,x,y+.74,z);}
    function rug(x,y,z,w,d,m){soft(x,y+.018,z,w,.025,d,M.linen);soft(x,y+.036,z,w-.16,.018,d-.16,m);for(const s of [-1,1]){box(x+s*(w/2-.19),y+.052,z,.055,.012,d-.25,M.goldCloth);for(let j=0;j<Math.floor(w/.13);j++)box(x-w/2+.09+j*.13,y+.025,z+s*(d/2+.05),.04,.02,.15,M.linen);}}
    function chain(x,from,z,to){for(let y=from;y<to;y+=.11)ring(x,y,z,.065,.013,M.brass,0,Math.floor(y/.11)%2?Math.PI/2:0);}
    function face(pts, m, walk = false) { const q = new THREE.BufferGeometry(), a = []; for (let i = 1; i < pts.length - 1; i++) a.push(...pts[0], ...pts[i], ...pts[i + 1]); q.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); q.computeVertexNormals(); const o = mesh(q, m); if (walk) { o.userData.walk = true; o.visible = false; } return o; }
    function floor(x0, x1, z0, z1, y) {
      const o = box((x0 + x1) / 2, y - .14, (z0 + z1) / 2, x1 - x0, .28, z1 - z0, oak[0]); o.userData.walk = true;
      let plank = 0;
      for (let x = x0; x < x1 - .01; x += .48) {
        const w = Math.min(.466, x1 - x - .014);
        box(x + w / 2, y + .002, (z0 + z1) / 2, w, .008, z1 - z0, oak[(plank++ + Math.round(y)) % 3]);
      }
      for (let x = x0 + .45; x < x1; x += .48) box(x, y + .005, (z0 + z1) / 2, .014, .01, z1 - z0, M.wood);
      for (let z = z0 + .5; z < z1; z += 2.2) box((x0 + x1) / 2, y - .31, z, x1 - x0, .17, .17, M.iron);
    }
    function arch(w, h) { const r = w / 2, a = [[-r, 0], [r, 0], [r, h - r]]; for (let j = 1; j <= 16; j++) { const t = j * Math.PI / 16; a.push([Math.cos(t) * r, h - r + Math.sin(t) * r]); } return a; }
    // Each elevation is an extruded wall with real, shaped holes; no opaque window backing.
    const curtainMat = M.roof;
    function wall(x, z, w, y, h, ry, holes = [], material = M.plaster) {
      const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, h), new THREE.Vector2(-w / 2, h)]);
      holes.forEach(v => { const p = v.rect ? [[-v.w / 2, 0], [v.w / 2, 0], [v.w / 2, v.h], [-v.w / 2, v.h]] : arch(v.w, v.h); s.holes.push(new THREE.Path(p.map(a => new THREE.Vector2(a[0] + v.u, a[1] + v.b)).reverse())); });
      const o = mesh(new THREE.ExtrudeGeometry(s, { depth: .32, bevelEnabled: false, curveSegments: 12 }), material, x, y, z, false); o.rotation.y = ry;
      // AABB of a holed wall would close its windows and doors. Collision strips match the openings.
      const cuts = [-w / 2, w / 2]; holes.forEach(v => cuts.push(v.u - v.w / 2, v.u + v.w / 2)); cuts.sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) { const a = cuts[i], b = cuts[i + 1]; if (b - a < .001) continue; const mid = (a + b) / 2, v = holes.find(v => mid > v.u - v.w / 2 && mid < v.u + v.w / 2); const strips = v ? [[0, v.b], [v.b + v.h, h]] : [[0, h]]; strips.forEach(([lo, hi]) => { if (hi - lo < .01) return; const X = x + mid * Math.cos(ry) + .16 * Math.sin(ry), Z = z - mid * Math.sin(ry) + .16 * Math.cos(ry), dx = Math.abs(Math.cos(ry)) * (b - a) / 2 + Math.abs(Math.sin(ry)) * .16, dz = Math.abs(Math.sin(ry)) * (b - a) / 2 + Math.abs(Math.cos(ry)) * .16; g.userData.cols.push([X - dx, y + lo, Z - dz, X + dx, y + hi, Z + dz]); }); }
      holes.filter(v => !v.door).forEach(v => {
        const at = (u, yy, d) => [x + u * Math.cos(ry) + d * Math.sin(ry), y + yy, z - u * Math.sin(ry) + d * Math.cos(ry)];
        const r = new THREE.Shape(arch(v.w + .24, v.h + .20).map(p => new THREE.Vector2(p[0], p[1] - .10))); r.holes.push(new THREE.Path(arch(v.w, v.h).map(p => new THREE.Vector2(...p)).reverse()));
        const f = mesh(new THREE.ExtrudeGeometry(r, { depth: .10, bevelEnabled: false }), M.honey, ...at(v.u, v.b, -.09)); f.rotation.y = ry;
        const view = mesh(new THREE.PlaneGeometry(v.w + 1.1, v.h + 1), viewSurface, ...at(v.u, v.b + v.h / 2, .74)); view.rotation.y = ry + Math.PI; view.userData.camThrough = true;
        const glassShape = new THREE.Shape(arch(v.w, v.h).map(p => new THREE.Vector2(...p))); const gl = mesh(new THREE.ShapeGeometry(glassShape), kit.glass(), ...at(v.u, v.b, .12)); gl.rotation.y = ry + Math.PI; gl.userData.camThrough = true;
        [[0, v.h * .44, .055, v.h - .10], [0, v.h * .48, v.w, .07]].forEach(([u, yy, ww, hh]) => { const q = box(...at(v.u + u, v.b + yy, -.04), ww, hh, .12, M.wood); q.rotation.y = ry; });
        const sill = box(...at(v.u, v.b - .08, -.04), v.w + .35, .13, .50, M.honey); sill.rotation.y = ry;
      });

      // Fine panelling follows real openings; paired curtains stay beside the glass.
      const local=(u,yy,d)=>[x+u*Math.cos(ry)+d*Math.sin(ry),y+yy,z-u*Math.sin(ry)+d*Math.cos(ry)];
      const panelH=Math.min(.78,h-.25);
      for(let u=-w/2+.37;u<w/2-.2;u+=.72){
        if(holes.some(v=>v.door&&Math.abs(u-v.u)<v.w/2+.32))continue;
        const p=box(...local(u,panelH/2+.05,-.035),.65,panelH,.055,material===M.wood?M.wood:M.paleWood);p.rotation.y=ry;
        for(const v of [u-.30,u+.30]){const q=box(...local(v,panelH/2+.05,-.085),.035,panelH-.08,.04,M.honey);q.rotation.y=ry;}
      }
      if(h>2)for(let u=-w/2+.72;u<w/2-.3;u+=1.45){if(holes.some(v=>Math.abs(u-v.u)<v.w/2+.20))continue;const p=box(...local(u,h/2,-.10),.13,h-.22,.14,M.wood);p.rotation.y=ry;beam(local(u,h-.22,-.12),local(u+.42,h-.65,-.12),.055,M.honey);for(const yy of [.93,h-.4])ball(...local(u,yy,-.19),.03,M.brass);}
      holes.filter(v=>!v.door).forEach(v=>{
        for(const s of [-1,1]){
          for(let j=0;j<3;j++){const p=soft(...local(v.u+s*(v.w/2+.19+j*.075),v.b+v.h*.48,-.18),.09,v.h+.13,.15,curtainMat);p.rotation.y=ry;}
          const tie=box(...local(v.u+s*(v.w/2+.27),v.b+v.h*.27,-.28),.36,.08,.07,M.brass);tie.rotation.y=ry;
        }
        beam(local(v.u-v.w/2-.43,v.b+v.h+.16,-.21),local(v.u+v.w/2+.43,v.b+v.h+.16,-.21),.035,M.brass);
        const planter=box(...local(v.u,v.b+.025,-.24),v.w*.82,.22,.31,M.honey);planter.rotation.y=ry;
        for(let j=0;j<5;j++){const p=local(v.u+(j-2)*v.w*.14,v.b+.24+(j%2)*.1,-.28);ball(...p,.13,M.leaf,1,.6,1);flower(...p,j%2?M.pink:M.whitePetal);}
      });
      for (const u of [-w / 2 + .10, w / 2 - .10]) { const q = box(x + u * Math.cos(ry), y + h / 2, z - u * Math.sin(ry), .20, h, .18, M.wood); q.rotation.y = ry; }
      [y + .17, y + h - .10].forEach(yy => { const q = box(x, yy, z, w, .18, .18, M.wood); q.rotation.y = ry; });
    }
    function rail(a, b, y) { beam([a[0], y + 1.08, a[1]], [b[0], y + 1.08, b[1]], .065, M.honey, true); const n = Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1]) / .5); for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; box(x, y + .54, z, .07, 1.08, .07, M.wood, true); } }
    function stair(x, z, y, rise, len, width) {
      const n = Math.ceil(rise / .25); for (let i = 0; i < n; i++) box(x, y + (i + 1) * rise / n - .09, z - (i + .5) * len / n, width, .18, len / n + .02, i % 3 ? M.honey : M.wood);
      face([[x - width / 2, y, z], [x + width / 2, y, z], [x + width / 2, y + rise, z - len], [x - width / 2, y + rise, z - len]], M.honey, true);
      for (const side of [-1, 1]) { const xx = x + side * (width / 2 + .10); for (let i = 0; i < n; i++) beam([xx, y + .9 + i * rise / n, z - i * len / n], [xx, y + .9 + (i + 1) * rise / n, z - (i + 1) * len / n], .06, M.honey, true); beam([xx, y - .12, z], [xx, y + rise - .12, z - len], .12, M.dark); for (let i = 0; i <= n; i += 2) box(xx, y + i * rise / n + .45, z - i * len / n, .07, .9, .07, M.wood, true); }
    }
    function lamp(x,y,z,top){
      box(x,y+.18,z,.43,.035,.43,M.brass);for(const u of [-.205,.205])box(x+u,y+.085,z,.025,.18,.40,M.iron);
      for(const d of [-.205,.205])box(x,y+.085,z+d,.40,.18,.025,M.iron);
      box(x,y+.03,z,.16,.016,.16,glow);beam([x,y+.2,z],[x,top,z],.018,M.brass);
    }
    function draftingLamp(){
      const brass=kit.mat('#b58b46',{metalness:.8,roughness:.44},'metal'),reflector=kit.mat('#ead8b8',{metalness:.25,roughness:.6},'metal');
      mesh(new THREE.CylinderGeometry(.13,.15,.08,20),brass,-3.15,1.19,-4.98);beam([-3.15,1.23,-4.98],[-3.15,1.82,-4.98],.025,brass);ball(-3.15,1.82,-4.98,.055,brass);
      beam([-3.15,1.82,-4.98],[-3.15,2.045,-4.98],.024,brass);beam([-3.15,2.045,-4.98],[-2.95,2.045,-4.42],.024,brass);beam([-2.95,2.045,-4.42],[-2.95,2.005,-4.42],.022,brass);
      soft(-2.95,1.99,-4.42,.70,.035,.34,brass);for(const d of [-.17,.17])box(-2.95,1.93,-4.42+d,.70,.12,.025,brass);
      for(const x of [-3.30,-2.60])box(x,1.93,-4.42,.025,.12,.34,brass);
      box(-2.95,1.97,-4.42,.64,.025,.28,reflector);box(-2.95,1.945,-4.42,.16,.012,.12,glow);
    }
    function plant(x, y, z) { mesh(new THREE.CylinderGeometry(.22, .16, .34, 8), M.ceramic, x, y + .17, z); for (let j = 0; j < 5; j++) { const a = j * 2.4; beam([x, y + .3, z], [x + Math.sin(a) * .28, y + .65 + j * .07, z + Math.cos(a) * .24], .018, M.leaf); const b = ball(x + Math.sin(a) * .27, y + .64 + j * .07, z + Math.cos(a) * .24, .13 + (j % 3) * .025, j % 2 ? M.leaf : M.pink, .8 + (j % 2) * .35, .25 + j * .07, 1.2 + (j % 3) * .25); b.rotation.z = a; } }
    function map(x, y, z, w, d) {
      box(x, y, z, w, .04, d, M.cream);
      for (let j = 0; j < 5; j++) { const pts = []; for (let k = 0; k <= 32; k++) { const a = k / 32 * Math.PI * 2, r = .24 + j * .13; pts.push([x + Math.cos(a) * r * w * .46 + Math.sin(a * 3) * .06, y + .032, z + Math.sin(a) * r * d * .45]); } for (let k = 1; k < pts.length; k++) beam(pts[k - 1], pts[k], .012, M.mapGreen); }
      beam([x - w * .4, y + .045, z + d * .37], [x - w * .1, y + .045, z - d * .3], .022, M.mapRed);
      for (let i = 0; i < 6; i++) box(x + w * .23 + i * .065, y + .035, z + d * .32, .06, .015, .08, i % 2 ? M.ink : M.scale);
    }
    g.userData.cols = [];
    floor(-6, 6, -6, 6, 0); floor(6, 12, -5, 5, 0);
    floor(-6, 1.7, -6, 6, 4); floor(1.7, 4.1, -6, -2.3, 4); floor(1.7, 4.1, 4.15, 6, 4); floor(4.1, 6, -6, 6, 4); floor(6, 12, -5, 5, 4);
    floor(6, 8, -5, 5, 8); floor(10.2, 12, -5, 5, 8); floor(8, 10.2, -5, -3.1, 8); floor(8, 10.2, 3.2, 5, 8);
    wall(0, 6, 12, 0, 4, 0, [{ u: -.45, b: 0, w: 2.0, h: 3, door: true }, { u: 3.2, b: 1.1, w: 1.45, h: 2.1 }]);
    mesh(new THREE.ExtrudeGeometry(new THREE.Shape(arch(1.98, 2.98).map(p => new THREE.Vector2(...p))), { depth: .16, bevelEnabled: false }), M.wood, -.45, 0, 6.08);
    for (let j = 0; j < 7; j++) box(-1.25 + j * .26, 1.05, 6.065, .022, 2.05, .025, M.dark);
    for (const y of [.65, 1.65]) box(-.45, y, 6.03, 1.8, .085, .07, M.dark);
    mesh(new THREE.TorusGeometry(.11, .025, 6, 18), M.brass, .13, 1.25, 5.98);
    wall(0, -6, 12, 0, 4, Math.PI, [{ u: .6, b: 1.1, w: 2.1, h: 2.15 }]);
    wall(-6, 0, 12, 0, 4, -Math.PI / 2, [{ u: -.2, b: 1.1, w: 2.2, h: 2.15 }]);
    [0, 4].forEach(y => { wall(6, 0, 12, y, y ? 3.1 : 4, Math.PI / 2, [{ u: 0, b: 0, w: 3.2, h: 3, rect: true, door: true }]); });
    for (const side of [-1, 1]) { const ry = side > 0 ? 0 : Math.PI; wall(0, side * 6, 12, 4, 3.1, ry, [{ u: 0, b: 1.05, w: 1.95, h: 2.0 }]); face([[-6, 7.1, side * 6], [6, 7.1, side * 6], [0, 10.2, side * 6]], kit.mat(C.plaster, { side: THREE.DoubleSide }, 'plaster')); }
    wall(-6, 0, 12, 4, 3.1, -Math.PI / 2);
    for (const y of [0, 4]) { wall(9, 5, 6, y, 4, 0, y ? [{ u: 0, b: 1.05, w: 1.65, h: 2.1 }] : [], M.wood); wall(9, -5, 6, y, 4, Math.PI, y ? [{ u: 0, b: 1.05, w: 1.65, h: 2.1 }] : [], M.wood); wall(12, 0, 10, y, 4, Math.PI / 2, [{ u: 0, b: 1.05, w: 1.8, h: 2.15 }], M.wood); }
    box(6.16, 7.55, 0, .32, .9, 10, M.wood); // Seal the tower above the lower cottage's eaves.
    // Cottage roof is exposed inside the loft; the tower has its own hipped open canopy.
    const roofInside = kit.mat('#a68a60', { side: THREE.DoubleSide, roughness: .9 }, 'wood');
    for (const side of [-1, 1]) { face([[0, 10.2, -6.32], [side * 6.3, 6.95, -6.32], [side * 6.3, 6.95, 6.32], [0, 10.2, 6.32]], roofInside); for (let z = -5.6; z < 6; z += 2.3) beam([0, 10.02, z], [side * 5.95, 6.95, z], .12, M.wood); }
    beam([0, 10.02, -6], [0, 10.02, 6], .17, M.iron);
    for (const x of [6.1, 11.9]) for (const z of [-4.9, 4.9]) { box(x, 9.7, z, .23, 3.4, .23, M.honey, true); beam([x, 11.2, z], [x + (x < 9 ? .7 : -.7), 10.65, z], .09, M.wood); }
    const corners = [[5.8, 11.45, -5.2], [12.2, 11.45, -5.2], [12.2, 11.45, 5.2], [5.8, 11.45, 5.2]]; for (let i = 0; i < 4; i++) { face([corners[i], corners[(i + 1) % 4], [9, 13.3, 0]], roofInside); beam(corners[i], [9, 13.3, 0], .12, M.wood); }
    [[6, -5, 12, -5], [6, 5, 12, 5], [6, -5, 6, 5], [12, -5, 12, 5]].forEach(v => { rail(v.slice(0, 2), v.slice(2), 8); const o = mesh(new THREE.PlaneGeometry(Math.hypot(v[2] - v[0], v[3] - v[1]) + 1, 4), viewSurface, (v[0] + v[2]) / 2, 9.65, (v[1] + v[3]) / 2); const dx = v[2] - v[0]; o.rotation.y = dx ? (v[1] < 0 ? 0 : Math.PI) : (v[0] < 9 ? Math.PI / 2 : -Math.PI / 2); o.position.x += dx ? 0 : v[0] < 9 ? -.74 : .74; o.position.z += dx ? v[1] < 0 ? -.74 : .74 : 0; o.userData.camThrough = true; });
    stair(2.9, 4.1, 0, 4, 6.4, 1.8); stair(9.1, 3.15, 4, 4, 6.3, 1.8);
    rail([1.6, -2.3], [1.6, 4.15], 4); rail([4.2, -2.3], [4.2, 4.15], 4); rail([1.65, 4.2], [4.15, 4.2], 4);
    rail([7.9, -3.1], [7.9, 3.2], 8); rail([10.15, -3.1], [10.15, 3.2], 8); rail([8, 3.25], [10.2, 3.25], 8);
    // Ground floor: a traveller's worktable, collecting cabinet, packed equipment and reading nook.
    box(-2.7, 1.02, -4.45, 3.3, .16, 1.6, M.wood, true); for (const x of [-4.05, -1.35]) for (const z of [-4.95, -3.95]) box(x, .48, z, .15, .96, .15, M.dark, true); map(-2.7, 1.13, -4.45, 2.8, 1.3);
    const firstMap = g.children.length; map(0, 0, 0, 2.8, 1.8); const mapFrame = new THREE.Group(); g.children.slice(firstMap).forEach(o => mapFrame.add(o)); mapFrame.rotation.x = Math.PI / 2; mapFrame.position.set(-3.8, 2.35, -5.85); g.add(mapFrame);
    box(-3.8, 2.35, -5.92, 3.05, 2.05, .10, M.wood); for (let i = 0; i < 4; i++) { const o = mesh(new THREE.CylinderGeometry(.10, .10, .64, 8), M.cream, -3.8 + i * .35, 1.25, -4.7); o.rotation.z = Math.PI / 2; }
    mesh(new THREE.TorusGeometry(.22, .025, 6, 20), M.brass, -1.7, 1.18, -4.25).rotation.x = Math.PI / 2;
    box(-5.4, .43, -.15, .8, .86, 2.1, M.wood, true); for (let j = 0; j < 5; j++) { box(-4.95, .18 + j * .15, -.15, .06, .10, 2.15, M.honey); ball(-5.25, .96, -.95 + j * .38, .12, j % 2 ? M.stone : M.leaf, 1.2, .55, 1); }
    for (const x of [-5.8, -1.7, 1.7, 5.8]) { box(x, 1.65, -5.89, .12, 3.3, .16, M.wood); beam([x, 3.45, -5.86], [x + (x < 0 ? .6 : -.6), 2.95, -5.86], .07, M.honey); }
    for (const z of [-5.7, 2.9, 5.7]) { box(-5.89, 1.7, z, .16, 3.4, .12, M.wood); beam([-5.85, 3.4, z], [-5.85, 2.9, z + (z < 0 ? .6 : -.6)], .07, M.honey); }
    for (let i = 0; i < 3; i++) { box(1.5, 1.55 + i * .62, -5.73, 1.6, .09, .42, M.honey); for (let j = 0; j < 4; j++) {box(.95 + j * .28, 1.81 + i * .62, -5.7, .18, .45, .28, [M.cream, M.roof, M.lavender][(i + j) % 3]);box(.95+j*.28,2.025+i*.62,-5.72,.14,.014,.22,M.cream);} }
    mesh(new THREE.CylinderGeometry(.42, .36, .5, 9), M.honey, -2.7, .25, -1.7, true);
    box(7.2, 1.2, -3.4, 1.6, 2.4, .7, M.dark, true); for (let row = 0; row < 4; row++) { box(7.2, .34 + row * .57, -2.99, 1.48, .46, .14, M.honey); for (let j = 0; j < 3; j++) { ball(6.75 + j * .44, .47 + row * .57, -2.83, .13, j % 2 ? M.stone : M.leaf, 1.1, .6, 1); ball(6.76 + j * .44, .21 + row * .57, -2.88, .035, M.brass); } }
    box(-4.8, .30, 3.3, 1.8, .5, 1.75, M.wood, true); box(-4.8, .65, 3.3, 1.65, .25, 1.6, M.roof); box(-4.8, 1.05, 4.05, 1.8, 1.15, .18, M.honey, true); ball(-4.4, .95, 3.8, .35, M.pinkCloth, 1, 1, .4);
    box(-3, .47, 4.8, .72, .94, .55, M.roof, true); box(-3, .55, 5.13, .5, .38, .12, M.roof); beam([-2.2, 0, 5.1], [-2.2, 1.6, 5.1], .045, M.wood); for (const x of [-3.22, -2.78]) box(x, .6, 5.21, .05, .82, .025, M.goldCloth);
    // Loft: tucked bed, travel journals, pressed leaves and a map-flag line.
    box(-4.2, 4.33, -3.9, 2.3, .56, 3.4, M.wood, true); box(-4.2, 4.68, -3.9, 2.15, .22, 3.2, M.linen); box(-4.2, 4.83, -3.5, 2.17, .12, 2.0, M.roof); box(-4.2, 4.9, -5, 1.4, .23, .6, M.pinkCloth);
    box(-4.9, 4.1, 4.4, 1.4, 2.1, .65, M.wood, true); for (let j = 0; j < 3; j++) { box(-4.9, 4.25 + j * .7, 4.4, 1.45, .08, .72, M.honey); for (let k = 0; k < 6; k++) {const h=.46+k%2*.08;box(-5.42 + k * .20, 4.52 + j * .7, 4.4, .15, h, .45, [M.roof, M.cream, M.coral][k % 3]);box(-5.42+k*.20,4.52+j*.7+h/2-.012,4.38,.11,.014,.36,M.cream);} }
    for (let i = 0; i < 3; i++) { box(-5.79, 5.65, .2 + i * 1.15, .06, 1.0, .8, M.dark); box(-5.74, 5.65, .2 + i * 1.15, .04, .88, .68, M.cream); ball(-5.69, 5.65, .2 + i * 1.15, .24, i % 2 ? M.leaf : M.greenPetal, .12, 1.5, .75); }
    for (let i = 0; i < 9; i++) { const x = -4.8 + i * 1.05, yy = 6.75 - .38 * Math.sin(i / 8 * Math.PI); beam([x - .52, yy + .05, 5.65], [x + .52, yy + .05, 5.65], .018, M.linen); face([[x - .3, yy, 5.65], [x + .3, yy, 5.65], [x, yy - .48, 5.65]], M.flags[i % 2 ? 0 : 1]); }
    // Tower field station and open rooftop telescope; west edge has the higher cottage roof beyond it.
    box(7.1, 4.85, -4.35, 1.6, 1.7, .7, M.dark, true); box(7.1, 5.03, -4.35, 1.65, .10, .76, M.honey); map(7.1, 5.14, -4.35, 1.5, .65);
    const tc = [11, 9.10, 3]; for (const f of [[10.4, 8, 3.35], [11.5, 8, 3.35], [11, 8, 2.25]]) beam(f, tc, .055, M.iron, true); beam([10.5, 9.35, 3.45], [11.5, 9.65, 2.45], .13, M.brass); beam([11.44, 9.63, 2.51], [11.61, 9.69, 2.33], .17, M.iron);
    mesh(new THREE.TorusGeometry(.55, .04, 6, 24), M.brass, 6.9, 8.035, 1.5).rotation.x = Math.PI / 2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; beam([6.9, 8.05, 1.5], [6.9 + Math.sin(a) * .48, 8.05, 1.5 + Math.cos(a) * .48], .022, M.brass); }
    beam([11.5, 8, 3.4], [11.5, 11.1, 3.4], .035, M.wood); for (let j = 0; j < 5; j++) { const o = mesh(new THREE.CylinderGeometry(.18 - j * .028, .20 - j * .028, .32, 8, 1, true), j % 2 ? M.linen : M.coral, 11.65 + j * .3, 10.9 - j * .08, 3.4); o.rotation.z = Math.PI / 2 - .2; }
    for (const y of [0, 4]) { const x = y ? -.6 : -2, z = y ? 1 : .8; mesh(new THREE.CylinderGeometry(1.9, 1.9, .025, 40), M.roof, x, y + .017, z); for (let j = 0; j < 7; j++) { const o = mesh(new THREE.TorusGeometry(.5 + j * .20, .045, 4, 40), j % 2 ? M.linen : M.goldCloth, x, y + .035, z); o.rotation.x = Math.PI / 2; } }
    box(-2.4, 4.25, 3.9, 1.4, .4, .8, M.honey); map(-2.4, 4.47, 3.9, 1.1, .6); ball(-.8, 4.2, 3.6, .4, M.lavender, 1, .5, 1); ball(-3.6, 4.2, 3.7, .4, M.roof, 1, .5, 1);
    // Rope ladder is visible outside the tower, while the interior stairs provide the walkable route.
    for (const z of [-.8, .8]) beam([12.5, 0, z], [12.5, 8.1, z], .035, M.linen); for (let y = .3; y < 8; y += .35) beam([12.5, y, -.84], [12.5, y, .84], .05, M.honey);
    [[-5.2, 0, -4.9], [-5.2, 0, 1.5], [4.8, 0, 5.1], [-1.6, 4, -5.4], [11.2, 4, -3.3], [6.6, 8, -3.4]].forEach(p => plant(...p));

    // Traveller's joinery: planked ceilings, metal brackets, flower trails and expedition storage.
    for(const z of [-4.5,-1.5,1.5,4.5])box(0,3.65,z,11.7,.21,.23,M.dark);
    for(let x=-5.7;x<6;x+=.46)box(x,3.82,0,.025,.04,11.8,M.wood);
    for(const s of [-1,1])for(let x=.5;x<6;x+=.55)beam([s*x,10.13-x*.516,-6],[s*x,10.13-x*.516,6],.026,M.honey);
    for(const y of [0,4])for(const z of [-4.78,4.78]){
      for(let j=0;j<6;j++)box(6.4+j*.95,y+2,z,.025,3.6,.035,M.dark);
      beam([6.4,y+3.5,z],[7.4,y+2.65,z],.075,M.honey);vine(6.7,y+3.65,z,1.5,'x');
    }
    for(const [x,y,z]of[[-5.7,3.55,-4.4],[-5.7,3.5,2.7],[4.8,3.65,5.65],[-5.6,6.8,4.8],[6.5,7.7,-4.65]])vine(x,y,z,1.8);
    vine(-4.9,3.58,-5.65,2.3,'x');vine(-5.6,7.02,-5.72,2.3,'x');
    for(const [x,z]of[[-5.55,2.1],[5.45,4.9]]){chain(x,2.5,z,3.7);plant(x,1.85,z);}
    // Map table: apron, X braces, iron corners, scroll ties, field diary and a quill.
    for(const z of [-5.1,-3.8])box(-2.7,.85,z,3.3,.23,.08,M.honey,true);
    for(const x of [-4.05,-1.35]){beam([x,.12,-5.0],[x,.8,-3.95],.065,M.honey,true);beam([x,.12,-3.95],[x,.8,-5.0],.065,M.honey,true);}
    for(const x of [-4.21,-1.19])for(const z of [-5.12,-3.78]){box(x,1.04,z,.23,.20,.035,M.iron);ball(x,1.05,z+.025,.03,M.brass);}
    for(const [x,z]of[[-4.03,-4.9],[-1.5,-4.9],[-4,-4.25]]){
      const o=mesh(new THREE.CylinderGeometry(.085,.085,.60,9),M.cream,x,1.22,z);o.rotation.z=Math.PI/2;
      for(const dx of [-.18,.18])ring(x+dx,1.22,z,.087,.017,M.brass,0,Math.PI/2);
      ring(x+.305,1.22,z,.052,.013,M.honey,0,Math.PI/2);
    }
    book(-2.08,1.15,-4.95,.42,.10,.32,M.roof,true);cup(-3.8,1.15,-3.96,M.darkGlaze);
    beam([-3.8,1.3,-3.96],[-3.62,1.82,-4.02],.015,M.cream);ball(-3.64,1.71,-4.02,.17,M.cream,.4,1.2,.12);
    mesh(new THREE.CylinderGeometry(.185,.185,.04,16),M.brass,-1.7,1.18,-4.25);face([[-1.7,1.21,-4.41],[-1.78,1.21,-4.17],[-1.62,1.21,-4.17]],M.coral);
    // Standing globe is a land-and-ocean object, with meridian and three-foot stand.
    const gx=4.95,gz=-4.8;mesh(new THREE.CylinderGeometry(.34,.45,.10,10),M.wood,gx,.07,gz,true);beam([gx,.12,gz],[gx,1.02,gz],.065,M.brass,true);
    ball(gx,1.57,gz,.58,M.sea).userData.solid=true;const meridian=ring(gx,1.57,gz,.65,.035,M.brass);meridian.rotation.z=.27;
    ring(gx,1.57,gz,.59,.014,M.ceramic,Math.PI/2);for(let j=0;j<7;j++){const a=j*2.4,p=ball(gx+Math.sin(a)*.46,1.57+Math.sin(j*1.8)*.28,gz+Math.cos(a)*.46,.19,M.leaf,1,.65,.32);p.rotation.y=a;}
    // Solid open crates are confined to the edge; all specimen labels are shallow decoration.
    crate(4.85,0,-2.9,1.25,.65,.95,true);crate(5.05,.65,-2.9,.8,.5,.7,true);barrel(11.25,0,4.05);
    crate(10.85,0,-4.25,1.25,.6,.9,true);crate(10.85,.6,-4.25,1.0,.52,.75,true);
    for(let j=0;j<4;j++){const y=.37+j*.57;book(7.58,y,-2.72,.19,.28,.16,M.roof);box(7.15,y-.03,-2.72,.32,.11,.035,M.cream);box(7.15,y,-2.695,.19,.015,.01,M.ink);}
    for(let j=0;j<3;j++){const z=-.8+j*.58;crate(-5.4,1.02,z,.72,.45,.48,true);ball(-5.4,1.43,z,.14,M.leaf,1.3,.12,.7);}
    // Tiny notes pin the large wall map to a lived-in collecting board.
    for(let j=0;j<6;j++){const x=-5.18+(j%2)*2.73,y=1.65+Math.floor(j/2)*.62;box(x,y,-5.72,.44,.48,.035,M.cream);ball(x,y+.17,-5.68,.03,M.brass);ball(x,y,-5.67,.14,j%2?M.pink:M.leaf,.8,1.3,.12);}
    // Slatted footstool, padded reading seat, backpack and rolled blanket.
    mesh(new THREE.CylinderGeometry(.41,.41,.09,12),M.roof,-2.7,.54,-1.7);
    for(const dx of [-.26,.26])beam([-2.7+dx,.05,-1.9],[-2.7+dx,.42,-1.5],.05,M.wood,true);
    soft(-4.8,.79,3.26,1.58,.17,1.45,M.linen);soft(-5.14,1.03,3.8,.56,.43,.18,M.roof);soft(-4.46,1.03,3.8,.56,.43,.18,M.lavender);
    for(const dx of [-.23,.23]){box(-3+dx,.57,5.225,.075,.82,.04,M.goldCloth);ring(-3+dx,.54,5.257,.055,.016,M.brass);}
    soft(-3,.97,4.8,.71,.18,.58,M.roof);soft(-3.45,.56,4.85,.18,.38,.34,M.roof);
    const roll=mesh(new THREE.CylinderGeometry(.20,.20,.94,12),M.linen,-3,1.2,4.8);roll.rotation.z=Math.PI/2;
    for(const x of [-3.27,-2.73])ring(x,1.2,4.8,.205,.025,M.goldCloth,0,Math.PI/2);ring(-2.52,1.2,4.8,.12,.025,M.goldCloth,0,Math.PI/2);
    ring(-2.15,1.35,5.1,.10,.02,M.brass);mesh(new THREE.CylinderGeometry(.045,.11,.16,8),M.brass,-2.15,1.18,5.1);
    rug(-2,0,1,3.65,4.9,M.roof);rug(8.9,0,.1,4.0,2.65,M.roof);
    // Loft bedding: spindle headboard, two pillows, stitched quilt and folded travel throw.
    box(-4.2,4.95,-5.55,2.4,1.5,.15,M.honey,true);for(let j=0;j<7;j++)box(-5.21+j*.34,5.21,-5.44,.09,.65,.06,M.wood);
    box(-4.2,4.58,-2.18,2.38,.65,.13,M.honey,true);
    soft(-4.75,4.99,-5,.85,.21,.56,M.linen);soft(-3.65,4.99,-5,.85,.21,.56,M.linen);
    soft(-4.2,4.96,-2.85,2.15,.13,.55,M.coral);soft(-4.2,5.045,-2.85,2.05,.055,.48,M.goldCloth);
    for(let i=0;i<7;i++)box(-5.1+i*.3,4.901,-3.65,.015,.012,1.5,M.linen);
    for(const z of [-3.6,-2.8])box(-4.2,4.9,z,2.08,.013,.018,M.linen);
    soft(-2.15,4.45,-4.8,.65,.9,.65,M.honey,true);box(-2.15,4.48,-4.46,.51,.24,.035,M.wood);ball(-2.15,4.48,-4.42,.04,M.brass);vase(-2.15,4.92,-4.8);
    rug(-2.15,4,-1.0,2.1,2.3,M.roof);rug(-.15,4,4.2,2.45,2.0,M.roof);
    book(-2.6,4.51,3.9,.45,.10,.3,M.coral,true);cup(-2.0,4.51,3.9);
    for(const [x,y,z]of[[-4.9,6.23,4.4],[7.2,5.23,-4.35],[11.2,4,-3.3]])vase(x,y,z);
    for(const z of [-3.9,-2.5,2.3,3.8]){box(11.55,5.7,z,.43,.10,.95,M.honey);book(11.5,5.76,z,.22,.48,.33,M.roof);book(11.5,5.76,z+.3,.18,.4,.3,M.coral);}
    rug(11.1,8,-1.0,1.15,3.8,M.roof);crate(6.65,8,4.55,.8,.6,.7,true);barrel(11.35,8,-4.55);
    // Round three: freestanding, useful travelling vignettes. The north/south
    // spine at x=.8, both stair approaches, the host and gift pads stay open.
    function cushion(x,y,z,w,d,m=M.roof) { return soft(x,y,z,w,.22,d,m); }
    function trunk(x,y,z,w,d,h=.66) {
      soft(x,y+h/2,z,w,h,d,M.honey,h>.45);
      soft(x,y+h+.025,z,w+.04,.10,d+.04,M.wood,h>.45);
      for(const dx of [-w*.31,w*.31]) {box(x+dx,y+h*.55,z+d/2+.025,.09,h*.8,.04,M.iron);soft(x+dx,y+h*.65,z+d/2+.055,.14,.16,.045,M.brass);}
      ring(x,y+h*.48,z+d/2+.08,.10,.025,M.iron);
    }
    function bench(x,y,z,w,d,m=M.roof) {
      soft(x,y+.26,z,w,.46,d,M.wood,true);cushion(x,y+.59,z,w-.12,d-.09,m);
      soft(x,y+.95,z+d*.43,w,.74,.16,M.honey,true);
      for(const dx of [-w*.3,w*.3]) {const p=soft(x+dx,y+.91,z+d*.18,.54,.44,.25,dx<0?M.linen:M.lavender);p.rotation.z=dx<0?.11:-.16;}
    }
    function stool(x,y,z,m=M.roof) {
      mesh(new THREE.CylinderGeometry(.36,.32,.16,10),m,x,y+.51,z,true);
      for(let j=0;j<3;j++){const a=j*Math.PI*2/3;beam([x+Math.sin(a)*.28,y+.05,z+Math.cos(a)*.28],[x+Math.sin(a)*.22,y+.46,z+Math.cos(a)*.22],.055,M.wood,true);}
    }
    function fieldTable(x,y,z,w,d,herbarium=false) {
      soft(x,y+.86,z,w,.18,d,M.honey,true);
      for(const dx of [-w*.37,w*.37])for(const dz of [-d*.34,d*.34])soft(x+dx,y+.41,z+dz,.16,.82,.16,M.dark,true);
      soft(x,y+.22,z,w-.24,.12,d-.22,M.wood);
      if(herbarium){
        for(let j=0;j<4;j++){const X=x+(j%2-.5)*w*.42,Z=z+(Math.floor(j/2)-.5)*d*.40;soft(X,y+.975,Z,w*.34,.035,d*.32,M.cream);beam([X-.15,y+1,Z-.16],[X+.14,y+1,Z+.18],.016,M.leaf);for(let k=0;k<3;k++){const p=ball(X+(k%2?-.11:.12),y+1.018,Z-.12+k*.11,.13,k%2?M.greenPetal:M.leaf,1.2,.13,.55);p.rotation.y=k*.8;}}
      } else map(x,y+.975,z,w*.70,d*.68);
      book(x-w*.28,y+.30,z,.42,.14,.34,M.roof,true);book(x+w*.27,y+.30,z,.48,.11,.34,M.coral,true);
    }
    function specimenShelf(x,y,z,w,d,h=1.2) {
      soft(x,y+h*.5,z,w,h,d,M.wood,true);
      for(let row=0;row<2;row++){
        soft(x,y+.18+row*.49,z+d/2+.015,w-.14,.35,.055,M.dark);
        for(let j=0;j<4;j++){const X=x+(j-1.5)*(w-.24)/4;soft(X,y+.18+row*.49,z+d/2+.06,(w-.27)/4-.055,.29,.06,M.honey);ball(X,y+.20+row*.49,z+d/2+.115,.09,[M.stone,M.leaf,M.paleStone][j%3],1.2,.65,.6);}
      }
      for(let j=0;j<3;j++)book(x-w*.26+j*.23,y+h,z,.17+j*.025,.30+(j%2)*.12,.25,[M.roof,M.coral,M.cream][j]);
    }
    function sideShelf(x,y,z,length,depth,h) {
      const first=g.children.length, q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);
      specimenShelf(0,y,0,length,depth,h);
      g.children.slice(first).forEach(o=>{const X=o.position.x,Z=o.position.z;o.position.x=x-Z;o.position.z=z+X;o.quaternion.premultiply(q);});
    }
    // 1F cottage: rest after a walk; maps, tea, a reading bench and packed kit.
    bench(-3.05,0,2.05,2.85,1.05);fieldTable(-3.15,0,.30,2.35,1.45);
    stool(-1.95,0,2.15,M.lavender);plant(-4.65,0,.35);trunk(-2.65,0,-.95,1.1,.7,.52);cup(-3.95,.975,.46);book(-2.5,.975,.18,.4,.10,.29,M.coral,true);
    // 1F cottage rear: a second chart drawer; the original study table is intact.
    specimenShelf(2.95,0,-4.98,2.6,1.35,1.12);crate(3.75,0,-3.75,.8,.62,.65,true);plant(1.65,0,-5.35);vase(2.95,1.12,-4.98);
    // Stair undercroft: low expedition lockers below the climbing ramp.
    specimenShelf(2.85,0,-1.7,1.35,.8,1.02);trunk(2.85,0,2.1,1.3,1.15,.64);barrel(4.75,0,1.95);
    // Three stages of tomorrow's packing sit beside, rather than in, the
    // two-metre-wide passage between the reading nook and the stair lockers.
    trunk(1.55,0,-1.45,.85,1.25,.85);soft(1.55,1.02,-1.45,.76,.18,1.05,M.roof);book(1.45,1.12,-1.45,.38,.09,.28,M.cream,true);
    trunk(1.3,0,1.25,1.1,.8,.56);plant(1.3,.66,1.25);cup(.99,.66,1.35);
    soft(.4,.26,-3.15,.65,.52,.65,M.honey,true);plant(.4,.52,-3.15);book(.58,.52,-3.0,.22,.08,.19,M.roof,true);
    trunk(.8,0,-.45,.75,.7,.3);book(.8,.4,-.45,.39,.045,.29,M.roof,true);
    trunk(-4.9,0,-2.45,1.25,1.4,.75);crate(-4.9,.85,-2.45,.85,.48,.85,true);plant(-5.05,1.33,-2.45);
    trunk(1.2,0,2.6,1.1,1.15,.62);const packedRoll=mesh(new THREE.CylinderGeometry(.19,.19,.78,10),M.linen,1.2,.94,2.6);packedRoll.rotation.z=Math.PI/2;for(const dx of [-.23,.23])ring(1.2+dx,.94,2.6,.195,.025,M.goldCloth,0,Math.PI/2);
    // 1F tower: central specimen sorting, with a separate packing/tea nook.
    fieldTable(9.55,0,-.25,2.4,2.6,true);crate(9.5,0,-2.65,1.7,.7,1.0,true);stool(10.8,0,-2.45,M.coral);
    specimenShelf(9.2,0,-4.4,2.0,.9,1.1);vase(9.2,1.1,-4.4);
    bench(9.85,0,3.65,2.65,1.2,M.roof);trunk(11.25,0,1.85,.8,1.25,.7);plant(11.35,0,-2.15);cup(10.05,.975,.15);barrel(8.65,0,2.0);
    // Loft cottage: pressed-leaf island, travel wardrobe and journal lounge.
    fieldTable(-1.5,4,-.35,2.7,2.4,true);stool(-1.55,4,1.65,M.lavender);trunk(-3.35,4,-.65,.7,1.1,.54);cup(-.85,4.975,-.3);
    specimenShelf(-.8,4,-4.85,2.15,1.45,1.35);trunk(-.8,4,-2.85,1.8,.85,.66);vase(-.8,5.35,-4.85);
    bench(-2.2,4,5.0,2.85,1.0);trunk(-3.65,4,3.65,.75,.65,.32);plant(-5.35,4,3.0);trunk(-5.3,4,-.9,.7,1.0,.6);
    fieldTable(3.25,4,-4.85,2.15,1.1);stool(3.65,4,-5.12);cup(2.65,4.975,-4.85);
    // Tower middle: weather instruments, spare packs beneath the upper stairs.
    sideShelf(11.15,4,.15,3.4,1.35,1.18);trunk(11.15,4,2.75,1.25,1.25,.72);plant(11.35,4,-2.5);
    sideShelf(9.05,4,-.35,3.15,1.25,1.04);crate(9.05,4,-2.4,1.2,.63,.8,true);barrel(11.15,4,4.2);
    // Open deck: only the north/east route serves the telescope. The west bay
    // is a furnished destination, not a second through-route around the stairs.
    bench(6.9,8,1.0,1.15,2.25);trunk(6.95,8,-1.65,1.15,1.25,.66);cup(6.95,8.76,-1.65);book(6.65,8.76,-1.65,.32,.09,.28,M.roof,true);
    bench(8.2,8,4.45,2.15,.9,M.coral);plant(9.65,8,4.55);crate(7,8,-4.5,1.3,.7,.65,true);stool(7.1,8,-2.8);plant(6.65,8,2.8);
    // Low compass inlay and a second portable field glass keep the open deck legible.
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])face([[6.9,8.065,1.5],[6.9+Math.sin(a+.12)*.46,8.065,1.5+Math.cos(a+.12)*.46],[6.9+Math.sin(a)*.66,8.065,1.5+Math.cos(a)*.66]],M.cream);
    // 製圖桌取代圖前裸燈，其餘樓層改用黃銅遮光罩。
    draftingLamp();lamp(-1.5,6.8,.2,9.246);lamp(7.1,6.7,-.6,7.78);lamp(7,10.65,2.8,12.6);lamp(9.3,2.9,.35,3.75);
    g.userData.spawn = [-.45, 0, 3.9, Math.PI]; g.userData.exit = [-.45, 5.55, .6]; g.userData.host = [-.8, 0, -1.6, .4];
    g.userData.gifts = [[.7, 0, -4.9, 0], [7.3, 0, 2.3, 0], [.1, 4, 4.8, 0], [7, 4, 2.6, 0]]; g.userData.sun = [-.8, .7, .25];
    g.userData.spots = [
      { x: -2.7, y: 0, z: -3.35, r: 1.15, kind: 'study', label: '讀讀路線圖', name: '旅行等高線桌', lines: ['這條紅線是昨天的路，圓點是點心站！', '等高線越密，坡通常越陡，我就繞個彎。', '先看比例尺，才知道回家還要走多久。', '陪我看三題吧，明天一起挑條新路！'], alone: ['地圖圈起陡坡，旁邊另畫了一條緩路。', '嵐寫著：「回程也要留力氣看海。」'] },
      { x: 7.1, y: 0, z: -1.9, r: 1.1, kind: 'look', label: '看看採集箱', name: '石頭與葉片採集櫃', lines: ['嘿，這顆圓石是河邊撿的，我有記地點！', '同一條路的葉子，也會有不同顏色。', '不能只看標本，下次一起看看它住的地方。'], alone: ['抽屜分裝石頭與葉片，卡片標著採集地點。', '一張卡片寫著：「陪森走的那天，腳步很輕。」'] },
      { x: -4.5, y: 4, z: 1.35, r: 1.2, kind: 'look', label: '看看葉片', name: '沿途葉片標本牆', lines: ['這三片葉子，是同一天慢慢走才發現的！', '我記了向陽或背陰，也記了附近的水。', '走慢一點，地圖上的空白就多了故事。'], alone: ['三片壓平的葉子，旁邊畫著小太陽和水滴。', '木框上還夾著一張未走完的路線卡。'] },
      { x: 7.1, y: 4, z: -3.25, r: 1.1, kind: 'look', label: '看看方位簿', name: '塔內方位觀察簿', lines: ['先找北方，再記今天雲往哪裡走。', '風向說的是風從哪裡來，別跟風向袋尾巴跑！', '這一頁留給明天，散步總有新的方向。'], alone: ['觀察簿畫了方位箭頭，每一頁都有日期。', '書籤是一張曬得有點捲的綠色小旗。'] },
      { x: 10.9, y: 8, z: 1.35, r: 1.15, kind: 'look', label: '看看遠方', name: '開放瞭望台望遠鏡', lines: ['上來啦！先喘口氣，海一直都在。', '近處的樹遮住小路，站高一點就接得起來。', '望遠鏡收好，我們再下樓吃點心！'], alone: ['黃銅鏡筒朝向海灣，腳邊嵌著八向羅盤。', '風向袋垂在木柱旁，欄杆留著蜂蜜色的暖光。'] }
    ];
    // 等高線圖是焦點，製圖罩下與書架補光，樓梯下保持柔暗。
    Object.assign(g.userData,{
      lights:[[-2.95,1.915,-4.42,'#ffdb9e',.5,.35],[-1.5,6.8,.2,'#ffdb9e',.95,.5],[7.1,6.7,-.6,'#ffdb9e',.9,.5],[7,10.65,2.8,'#ffdb9e',.9,.5],[9.3,2.9,.35,'#ffdb9e',.85,.5]],
      glow:[
        {kind:'spot',p:[-3.8,3.55,-3.3],t:[-3.8,2.35,-5.818],r:1.3},
        {kind:'cove',a:[2.5,3.32,-5.8],b:[3.3,3.32,-5.8],n:[0,1],c:'#8b6a45'},
        {kind:'under',a:[-3.25,1.88,-4.42],b:[-2.65,1.88,-4.42]},
        {kind:'under',a:[.85,2.72,-5.55],b:[2.15,2.72,-5.55]},
        {kind:'wash',a:[-5.8,6.85,-4.9],b:[-5.8,6.85,-4.1],n:[1,0],c:'#8b6a45'},
        {kind:'wash',a:[11.8,7.6,-4.2],b:[11.8,7.6,-3.2],n:[-1,0],c:'#8b6a45'},
        {kind:'kick',a:[-5.55,.11,2.415],b:[-4.6,.11,2.415],n:[0,-1]},
        {kind:'kick',a:[-5.1,4.11,-2.19],b:[-3.25,4.11,-2.19],n:[0,1]},
        {kind:'kick',a:[7.3,8.1,4],b:[9.05,8.1,4],n:[0,-1]}
      ]
    });
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
