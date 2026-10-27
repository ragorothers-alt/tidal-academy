/* 潮汐小島 · civics 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['civics'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['civics'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '衡的迎賓議事屋';
    const C = { plaster: '#fbf3e4', wood: '#98704d', honey: '#bd9561', dark: '#554631', roof: '#e0b25a', cream: '#eee0bd', brass: '#d1a654', pink: '#e9a8b6', lavender: '#b3a0d0', leaf: '#70834f', sea: '#a5c6c6', stone: '#c8bea7', coral: '#e6735c' };
    // 同色按實際表面共用色票；只拆紙、布、釉陶與木作，不新增物件。
    const kinds = { plaster:'plaster', wood:'wood', honey:'wood', dark:'wood', roof:'roof', cream:'wood', brass:'metal', pink:'foliage', lavender:'fabric', leaf:'foliage', sea:'wood', stone:'stone', coral:'fabric' };
    const M = {}; Object.keys(C).forEach(k => { M[k] = kit.mat(C[k], k === 'brass' ? { metalness:.8, roughness:.38 } : {}, kinds[k]); });
    const S = {
      paper:kit.mat(C.cream,{},'paper'), linen:kit.mat(C.cream,{},'fabric'), ceramic:kit.mat(C.cream,{},'ceramic'),
      petal:kit.mat(C.cream,{},'foliage'), goldPetal:kit.mat(C.brass,{},'foliage'), coralPetal:kit.mat(C.coral,{},'foliage'),
      greenCover:kit.mat(C.leaf,{},'fabric'), honeyThread:kit.mat(C.honey,{},'fabric'), honeyCeramic:kit.mat(C.honey,{},'ceramic'), honeyPetal:kit.mat(C.honey,{},'foliage'),
      coralPaper:kit.mat(C.coral,{},'paper'), lavenderPaper:kit.mat(C.lavender,{},'paper'),
      iron:kit.mat(C.dark,{metalness:.7,roughness:.4},'metal'), tea:kit.mat(C.dark,{},'ceramic'),
      paleStone:kit.mat(C.cream,{},'stone'), greenStone:kit.mat(C.leaf,{},'stone'), column:kit.mat(C.cream,{},'plaster')
    };
    const covers = new Map([[M.cream,S.paper],[M.leaf,S.greenCover],[M.honey,S.honeyThread]]);
    const glow = kit.lamp('#ffd0a0');
    const oak = ['#bcaa8a','#c3b193','#b5a387'].map(c => kit.mat(c,{},'wood'));
    const viewSurface = kit.view().clone(); viewSurface.uniforms = kit.view().uniforms; viewSurface.transparent = true; viewSurface.depthWrite = false;
    const cubes=new Map(),spheres=new Map(),rings=new Map(),petal=new THREE.SphereGeometry(.055,6,4);
    function mesh(q, m, x = 0, y = 0, z = 0, solid = false) { const o = new THREE.Mesh(q, m); o.position.set(x, y, z); if (solid) o.userData.solid = true; g.add(o); return o; }
    function box(x, y, z, w, h, d, m = M.wood, solid = false) {const k=[w,h,d].join('/');if(!cubes.has(k))cubes.set(k,new THREE.BoxGeometry(w,h,d));return mesh(cubes.get(k), m, x, y, z, solid); }
    function ball(x, y, z, r, m, sx = 1, sy = 1, sz = 1) {if(!spheres.has(r))spheres.set(r,new THREE.SphereGeometry(r,8,5));const o = mesh(spheres.get(r), m, x, y, z); o.scale.set(sx, sy, sz); return o; }
    function beam(a, b, r = .07, m = M.wood, solid = false) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), v = B.clone().sub(A); const o = mesh(new THREE.CylinderGeometry(r, r, v.length(), 6), m, ...A.add(B).multiplyScalar(.5).toArray(), solid); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return o; }

    // Round-two dressing: cached rounded silhouettes and a shared thirteen-colour palette.
    const rounded = new Map();
    function soft(x,y,z,w,h,d,m,solid=false) {
      const key=[w,h,d].join('/');
      if(!rounded.has(key)) rounded.set(key,kit.rbox(w,h,d,Math.min(.08,w*.45,h*.45,d*.45)));
      return mesh(rounded.get(key),m,x,y,z,solid);
    }
    function ring(x,y,z,r,t,m,rx=0,ry=0) {const k=r+'/'+t;if(!rings.has(k))rings.set(k,new THREE.TorusGeometry(r,t,4,12));const o=mesh(rings.get(k),m,x,y,z);o.rotation.set(rx,ry,0);return o;}
    function book(x,y,z,w,h,d,m,flat=false) {
      m = covers.get(m) || m;
      if(flat){box(x,y+h/2,z,w,h,d,S.paper);for(const yy of [y+.014,y+h-.014])soft(x,yy,z,w+.045,.028,d+.045,m);box(x-w/2,y+h/2,z,.04,h,d,m);}
      else{box(x,y+h/2,z,w,h,d,S.paper);for(const xx of [x-w/2,x+w/2])box(xx,y+h/2,z,.025,h+.035,d+.04,m);box(x,y+h/2,z+d/2,w+.035,h+.035,.035,m);for(const yy of [y+.09,y+h-.08])box(x,yy,z+d/2+.023,w,.025,.015,M.brass);}
    }
    function cup(x,y,z,m=S.ceramic) {mesh(new THREE.CylinderGeometry(.14,.15,.025,12),S.ceramic,x,y+.013,z);mesh(new THREE.CylinderGeometry(.09,.065,.16,10),m,x,y+.11,z);mesh(new THREE.CylinderGeometry(.073,.073,.009,10),S.tea,x,y+.193,z);ring(x+.1,y+.12,z,.058,.016,m);}
    function vase(x,y,z,m=S.ceramic) {
      ball(x,y+.19,z,.2,m,1,1.2,1);mesh(new THREE.CylinderGeometry(.08,.11,.18,9),m,x,y+.37,z);
      for(let i=0;i<5;i++){const a=i*2.4,X=x+Math.sin(a)*.22,Z=z+Math.cos(a)*.18,Y=y+.66+(i%2)*.12;beam([x,y+.38,z],[X,Y,Z],.012,M.leaf);flower(X,Y,Z,i%2?M.pink:S.petal);}
    }
    function flower(x,y,z,m=S.petal){for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const p=mesh(petal,m,x+Math.sin(a)*.065,y+Math.cos(a)*.065,z);p.scale.z=.45;}ball(x,y+.018,z,.035,S.goldPetal);}
    function vine(x,y,z,len,axis='y') {
      let old=[x,y,z];
      for(let j=0;j<Math.ceil(len/.24);j++){const d=j*.24,p=axis==='x'?[x+d,y+.1*Math.sin(j),z]:[x+.10*Math.sin(j*.9),y-d,z];if(j)beam(old,p,.018,M.leaf);old=p;
        for(const s of [-1,1]){const q=ball(p[0]+s*.12,p[1]-.04,p[2]+.04,.14,M.leaf,1.2,.42,.7);q.rotation.z=s*.6;}
        if(j%4===1)flower(p[0],p[1]-.04,p[2]-.1,j%2?S.petal:M.pink);
      }
    }
    function crate(x,y,z,w=.9,h=.55,d=.7,rocks=false) {
      box(x,y+.055,z,w,.11,d,M.wood,true);
      for(let k=0;k<3;k++){const yy=y+.14+k*(h-.1)/3;for(const s of [-1,1]){box(x+s*(w/2-.035),yy,z,.075,(h-.12)/3-.025,d,M.honey,true);box(x,yy,z+s*(d/2-.035),w,(h-.12)/3-.025,.075,M.honey,true);}}
      for(const sx of [-1,1])for(const sz of [-1,1]){box(x+sx*(w/2-.07),y+h/2,z+sz*(d/2-.07),.10,h,.1,M.wood,true);ball(x+sx*(w/2-.07),y+h-.09,z+sz*(d/2+.004),.025,M.brass);}
      if(rocks)for(let k=0;k<7;k++)ball(x+(k%3-1)*w*.22,y+h-.04+(k%2)*.07,z+(Math.floor(k/3)-1)*d*.22,.13,[M.stone,S.paleStone,S.greenStone][k%3],1.2,.7,1);
    }
    function barrel(x,y,z){mesh(new THREE.CylinderGeometry(.31,.34,.72,10),M.honey,x,y+.36,z,true);for(const yy of [.12,.6])ring(x,y+yy,z,.335,.035,S.iron,Math.PI/2);for(let j=0;j<10;j++){const a=j*Math.PI/5;beam([x+Math.sin(a)*.33,y+.06,z+Math.cos(a)*.33],[x+Math.sin(a)*.31,y+.69,z+Math.cos(a)*.31],.015,M.wood);}mesh(new THREE.CylinderGeometry(.29,.29,.04,10),M.wood,x,y+.74,z);}
    function rug(x,y,z,w,d,m){soft(x,y+.018,z,w,.025,d,S.linen);soft(x,y+.036,z,w-.16,.018,d-.16,m);for(const s of [-1,1]){box(x+s*(w/2-.19),y+.052,z,.055,.012,d-.25,S.honeyThread);for(let j=0;j<Math.floor(w/.13);j++)box(x-w/2+.09+j*.13,y+.025,z+s*(d/2+.05),.04,.02,.15,S.linen);}}
    function chain(x,from,z,to){for(let y=from;y<to;y+=.11)ring(x,y,z,.065,.013,M.brass,0,Math.floor(y/.11)%2?Math.PI/2:0);}
    function face(pts, m, walk = false) { const q = new THREE.BufferGeometry(), a = []; for (let i = 1; i < pts.length - 1; i++) a.push(...pts[0], ...pts[i], ...pts[i + 1]); q.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); q.computeVertexNormals(); const o = mesh(q, m); if (walk) { o.userData.walk = true; o.visible = false; } return o; }
    function floor(x0, x1, z0, z1, y) {
      const o = box((x0 + x1) / 2, y - .14, (z0 + z1) / 2, x1 - x0, .28, z1 - z0, oak[0]); o.userData.walk = true;
      for(let x=x0+.24,j=0;x<x1;x+=.48,j++) box(x,y+.004,(z0+z1)/2,Math.min(.46,x1-x+.23),.008,z1-z0,oak[(j*7+Math.round(y))%3]);
      for (let x = x0 + .45; x < x1; x += .48) box(x, y + .005, (z0 + z1) / 2, .014, .01, z1 - z0, M.wood);
      for (let z = z0 + .5; z < z1; z += 2.2) box((x0 + x1) / 2, y - .31, z, x1 - x0, .17, .17, M.dark);
    }
    function arch(w, h) { const r = w / 2, a = [[-r, 0], [r, 0], [r, h - r]]; for (let j = 1; j <= 16; j++) { const t = j * Math.PI / 16; a.push([Math.cos(t) * r, h - r + Math.sin(t) * r]); } return a; }
    // Each elevation is an extruded wall with real, shaped holes; no opaque window backing.
    const curtainMat = M.coral;
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
        const p=box(...local(u,panelH/2+.05,-.035),.65,panelH,.055,material===M.wood?M.wood:M.cream);p.rotation.y=ry;
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
        for(let j=0;j<5;j++){const p=local(v.u+(j-2)*v.w*.14,v.b+.24+(j%2)*.1,-.28);ball(...p,.13,M.leaf,1,.6,1);flower(...p,j%2?M.pink:S.petal);}
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
    const shadeLinen=kit.shade('#eee2cb');
    function drum(x,y,z,r){
      mesh(new THREE.CylinderGeometry(r*.88,r,.30,16,1,true),shadeLinen,x,y,z);
      for(const yy of [y-.15,y+.15])mesh(new THREE.CylinderGeometry(yy<y?r:r*.88,yy<y?r:r*.88,.025,16,1,true),M.brass,x,yy,z);
      mesh(new THREE.CylinderGeometry(.16,.16,.018,16),glow,x,y-.08,z);mesh(new THREE.CylinderGeometry(r*.88,r*.88,.018,16),shadeLinen,x,y+.15,z);
      beam([x,y+.15,z],[x,3.72,z],.014,M.brass);
    }
    function taskLamp(base,head){
      const [x,y,z]=base,[hx,hy,hz]=head;
      mesh(new THREE.CylinderGeometry(.14,.17,.05,12),M.brass,x,y+.025,z);beam([x,y+.05,z],[x,y+.47,z],.025,M.brass);beam([x,y+.47,z],[hx,hy+.09,hz],.022,M.brass);
      mesh(new THREE.CylinderGeometry(.13,.25,.19,12,1,true),shadeLinen,hx,hy+.045,hz);mesh(new THREE.CylinderGeometry(.14,.14,.014,12),glow,hx,hy+.015,hz);mesh(new THREE.CylinderGeometry(.13,.13,.016,12),M.brass,hx,hy+.14,hz);
    }
    function plant(x, y, z) { mesh(new THREE.CylinderGeometry(.22, .16, .34, 8), S.ceramic, x, y + .17, z); for (let j = 0; j < 5; j++) { const a = j * 2.4; beam([x, y + .3, z], [x + Math.sin(a) * .28, y + .65 + j * .07, z + Math.cos(a) * .24], .018, M.leaf); const b = ball(x + Math.sin(a) * .27, y + .64 + j * .07, z + Math.cos(a) * .24, .16, j % 2 ? M.leaf : M.pink, 1, .5, 1.4); b.rotation.z = a; } }
    g.userData.cols = [];
    // A broad colonnaded welcome room beneath a hipped roof; the upper floor is a quiet correspondence loft.
    floor(-8, 8, -6, 7.5, 0);
    floor(-8, -7.55, -6, 7.5, 4); floor(-7.55, -.35, -6, -3.3, 4); floor(-7.55, -.35, 2.2, 7.5, 4); floor(-.35, 8, -6, 7.5, 4);
    wall(0, 7.5, 16, 0, 4, 0, [{u:0,b:0,w:2.2,h:3.1,door:true},{u:-5.2,b:1.05,w:2.05,h:2.3},{u:5.2,b:1.05,w:2.05,h:2.3}]);
    wall(0, -6, 16, 0, 4, Math.PI, [-4.5,0,4.5].map(u=>({u,b:1.1,w:1.8,h:2.2})));
    for(const side of [-1,1]) wall(side*8,.75,13.5,0,4,side*Math.PI/2,[{u:-2.95*side,b:1.05,w:1.8,h:2.3},{u:2.95*side,b:1.05,w:1.8,h:2.3}]);
    // Solid lower panelling, paired curtains and round interior columns echo the deep exterior porch.
    for(const z of [-5.84,7.34]) for(const x of [-4.6,4.6]) box(x,.46,z,6.6,.86,.12,M.cream);
    for(const x of [-7.84,7.84]) box(x,.46,.75,.12,.86,13.2,M.cream);
    for(const x of [-7.2,-2.5,2.5,7.2]) {mesh(new THREE.CylinderGeometry(.18,.23,3.6,12),M.plaster,x,2,3.35,true);box(x,.22,3.35,.68,.44,.68,S.column,true);box(x,3.8,3.35,.75,.24,.75,M.honey);box(x,.52,3.35,.51,.12,.51,S.column);}
    box(0,3.92,3.35,15.2,.18,.35,M.honey);
    for(const x of [-5.2,5.2]){
      for(const side of [-1,1]) {box(x+side*1.22,2.18,7.18,.32,2.8,.16,M.coral);box(x+side*1.19,1.32,7.1,.43,.11,.23,M.brass);}
      beam([x-1.55,3.55,7.17],[x+1.55,3.55,7.17],.045,M.brass);
      for(let j=0;j<8;j++)box(x-1.36+j*.39,3.4,7.14,.37,.30,.22,j%2?S.linen:M.coral);
    }
    mesh(new THREE.ExtrudeGeometry(new THREE.Shape(arch(2.18,3.08).map(p=>new THREE.Vector2(...p))),{depth:.16,bevelEnabled:false}),M.wood,0,0,7.58);
    for(let j=0;j<8;j++)box(-.91+j*.26,1.1,7.565,.018,2.16,.02,M.dark);
    mesh(new THREE.TorusGeometry(.13,.025,6,20),M.brass,.65,1.35,7.52);
    // Attic perimeter knee walls; inaccessible low eaves are enclosed storage, keeping the usable room tall.
    wall(0,7.5,16,4,1.3,0,[{u:-3.5,b:0,w:2.8,h:1.3,rect:true,door:true},{u:3.5,b:0,w:2.8,h:1.3,rect:true,door:true}]);
    wall(0,-6,16,4,1.3,Math.PI); for(const side of [-1,1])wall(side*8,.75,13.5,4,1.3,side*Math.PI/2);
    const underside=kit.mat('#d4ae6c',{side:THREE.DoubleSide,roughness:.9},'wood');
    const roofY=z=>9.1-(z-1)*3.8/6.5;
    const half=z=>2+(z-1)*6/6.5;
    // Front roof is explicitly split around the TWO dormers. No roof sheet crosses their window openings.
    face([[-2,9.1,1],[2,9.1,1],[half(4.2),roofY(4.2),4.2],[-half(4.2),roofY(4.2),4.2]],underside);
    const frontStrips=[[-8,-4.9],[-2.1,2.1],[4.9,8]];
    for(const [a,b] of frontStrips){const a0=Math.max(a,-half(4.2)),b0=Math.min(b,half(4.2));face([[a0,roofY(4.2),4.2],[b0,roofY(4.2),4.2],[b,5.3,7.5],[a,5.3,7.5]],underside);}
    face([[-8,5.3,-6],[8,5.3,-6],[2,9.1,1],[-2,9.1,1]],underside);
    for(const side of [-1,1])face([[side*8,5.3,-6],[side*8,5.3,7.5],[side*2,9.1,1]],underside);
    beam([-2,8.97,1],[2,8.97,1],.16,M.wood);
    for(const x of [-6.8,-4.5,-2.1,0,2.1,4.5,6.8]) {const topx=Math.max(-2,Math.min(2,x));beam([x,5.3,-6],[topx,8.98,1],.11,M.honey);if(Math.abs(x)<2.2||Math.abs(x)>4.9)beam([topx,8.98,1],[x,5.3,7.5],.11,M.honey);}
    for(const side of [-1,1])for(const z of [-4.5,-2,1,3.5,6])beam([side*8,5.3,z],[side*2,8.98,1],.09,M.honey);
    for(const cx of [-3.5,3.5]){
      wall(cx,7.5,2.8,4,3.7,0,[{u:0,b:1.15,w:1.75,h:2.25}]);
      // Side cheeks and a small gabled ceiling make the dormer a real walk-in alcove.
      for(const side of [-1,1]){box(cx+side*1.4,5.85,5.85,.28,3.7,3.3,M.plaster,true);face([[cx,8.6,4.2],[cx+side*1.55,7.7,4.2],[cx+side*1.55,7.7,7.7],[cx,8.6,7.7]],underside);beam([cx,8.47,4.2],[cx+side*1.4,7.62,4.2],.09,M.honey);beam([cx,8.47,7.4],[cx+side*1.4,7.62,7.4],.09,M.honey);}
      face([[cx-1.4,7.7,7.5],[cx+1.4,7.7,7.5],[cx,8.6,7.5]],kit.mat('#fbf3e4',{side:THREE.DoubleSide},'plaster'));
      face([[cx-1.4,7.7,4.2],[cx+1.4,7.7,4.2],[cx,8.6,4.2]],kit.mat('#fbf3e4',{side:THREE.DoubleSide},'plaster'));
      box(cx,7.46,4.2,2.8,.47,.16,M.plaster);for(const side of [-1,1])box(cx+side*1.08,6.35,7.28,.20,2.4,.13,M.coral);
    }
    // L stair: two 2m rises, a 2m-deep turning landing, continuous hidden walking ramps.
    function flight(ax,az,bx,bz,y,rise,w){const len=Math.hypot(bx-ax,bz-az),ux=(bx-ax)/len,uz=(bz-az)/len,nx=-uz,nz=ux,n=Math.ceil(rise/.25);for(let i=0;i<n;i++){const t=(i+.5)/n,o=box(ax+(bx-ax)*t,y+(i+1)*rise/n-.09,az+(bz-az)*t,w,.18,len/n+.02,i%2?M.honey:M.wood);o.rotation.y=Math.atan2(ux,uz);}face([[ax+nx*w/2,y,az+nz*w/2],[bx+nx*w/2,y+rise,bz+nz*w/2],[bx-nx*w/2,y+rise,bz-nz*w/2],[ax-nx*w/2,y,az-nz*w/2]],M.honey,true);for(const side of [-1,1]){const off=side*(w/2+.08);for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n;beam([ax+(bx-ax)*a+nx*off,y+rise*a+.95,az+(bz-az)*a+nz*off],[ax+(bx-ax)*b+nx*off,y+rise*b+.95,az+(bz-az)*b+nz*off],.055,M.honey,true);}for(let i=0;i<=n;i+=2){const t=i/n;box(ax+(bx-ax)*t+nx*off,y+rise*t+.47,az+(bz-az)*t+nz*off,.07,.94,.07,M.wood,true);}beam([ax+nx*off,y-.1,az+nz*off],[bx+nx*off,y+rise-.1,bz+nz*off],.13,M.wood);}}
    flight(-6.4,2.5,-6.4,-1.1,0,2,1.8);floor(-7.4,-4.5,-3.1,-1.1,2);flight(-4.5,-2.1,-.35,-2.1,2,2,1.8);
    rail([-7.55,-3.3],[-.35,-3.3],4);rail([-7.55,-3.3],[-7.55,2.2],4);rail([-7.55,2.2],[-.35,2.2],4);rail([-.35,-.9],[-.35,2.2],4);
    rail([-7.4,-3.1],[-4.5,-3.1],2);rail([-7.4,-3.1],[-7.4,-1.1],2);
    // Storage boxes at the eaves are visible architecture, not walkable low-ceiling traps.
    for(const side of [-1,1]){box(side*6.85,4.62,side<0?5.2:-.2,2.25,1.24,side<0?3.8:6.2,M.cream,true);for(let j=0;j<(side<0?3:5);j++){const z=(side<0?4.0:-2.7)+j*1.2;box(side*5.69,4.65,z,.08,1.04,1.0,M.honey);ball(side*5.62,4.7,z,.045,M.brass);}}
    for(const x of [-6.25,0,6.25])box(x,4.54,4.18,x===0?4.15:2.6,1.08,.18,M.cream,true);
    box(0,4.6,-4.55,15.8,1.2,.16,M.cream,true);g.userData.cols.push([-8,4,-6,8,7,-4.55]);
    // Long hospitality table with individual places and a coral runner, deliberately unlike the traveller's map desk.
    box(-3,1,-.45,3.9,.18,1.65,M.honey,true);for(const x of [-4.4,-1.6])for(const z of [-.98,.08]){const o=box(x,.46,z,.18,.92,.18,M.wood,true);o.rotation.z=x<-3?.1:-.1;}
    for(const z of [-1.7,.8]){box(-3,.52,z,4.3,.14,.42,M.wood,true);for(const x of [-4.6,-1.4])box(x,.23,z,.16,.46,.22,M.honey,true);}
    box(-3,1.105,-.45,.7,.025,1.65,M.coral);box(-3,1.125,-.45,.20,.016,1.65,S.linen);
    for(const x of [-4.2,-1.8])for(const z of [-.9,.0]){mesh(new THREE.CylinderGeometry(.19,.19,.035,14),S.ceramic,x,1.12,z);mesh(new THREE.CylinderGeometry(.075,.06,.18,9),S.ceramic,x+.22,1.2,z);}
    mesh(new THREE.CylinderGeometry(.17,.22,.45,10),S.ceramic,-3,1.35,-.45);for(let i=0;i<5;i++){const a=i*2.4;beam([-3,1.5,-.45],[-3+Math.sin(a)*.25,1.95,-.45+Math.cos(a)*.22],.012,M.leaf);ball(-3+Math.sin(a)*.25,1.95,-.45+Math.cos(a)*.22,.11,i%2?M.pink:S.petal);}
    // Common room: cushions, a low round tea table, invitation cards and a shared notice board.
    mesh(new THREE.CylinderGeometry(2.0,2.0,.025,40),M.coral,4,.02,.2);for(const r of [1.7,1.85])mesh(new THREE.TorusGeometry(r,.035,5,40),S.linen,4,.045,.2).rotation.x=Math.PI/2;
    mesh(new THREE.CylinderGeometry(.75,.65,.35,16),M.honey,4,.20,.2);for(const [x,z,m]of [[2.6,.2,S.linen],[5.4,.2,M.coral],[4,-1.25,M.lavender]])ball(x,.22,z,.5,m,1,.48,1);
    box(4,.405,.2,.42,.02,.28,S.paper);box(4,.42,.2,.27,.01,.12,S.coralPaper);
    box(-2.25,2.2,-5.83,2.55,1.65,.16,M.wood);box(-2.25,2.2,-5.72,2.35,1.45,.08,M.honey);
    for(let j=0;j<9;j++){const x=-3+j%3*.74,y=2.62-Math.floor(j/3)*.45;const o=box(x,y,-5.65,.51,.34,.025,[S.paper,S.coralPaper,S.lavenderPaper][j%3]);o.rotation.z=(j%2-.5)*.12;ball(x,y+.12,-5.61,.025,M.brass);}
    box(6.8,1.0,-4.9,1.7,2,.7,M.wood,true);for(let j=0;j<3;j++){box(6.8,.25+j*.65,-4.9,1.75,.08,.73,M.honey);for(let k=0;k<6;k++)box(6.12+k*.25,.53+j*.65,-4.9,.18,.48,.45,[S.paper,M.coral,S.greenCover][(j+k)%3]);}
    // Indoor loggia: striped canopy lining, swing bench and garland supported by the round columns.
    for(let j=0;j<24;j++)box(-7.65+j*.665,3.78,5.5,.64,.06,4.0,j%2?S.linen:M.coral);
    box(4.8,.62,5.85,2.6,.18,1.05,M.honey,true);box(4.8,1.15,6.3,2.6,1.1,.16,M.honey,true);for(const x of [3.45,6.15]){box(x,.94,5.85,.12,.13,1.15,M.wood,true);for(const z of [5.45,6.2])beam([x,.65,z],[x,3.72,z],.018,M.brass);}
    soft(4.15,.89,6.15,.6,.5,.15,M.coral);soft(4.85,.84,6.15,.6,.4,.15,S.linen);soft(5.55,.9,6.15,.6,.55,.15,M.lavender);
    for(let i=0;i<13;i++){const x=-7.2+i*1.2,y=3.48-.3*Math.sin(i/12*Math.PI);if(i)beam([x-1.2,3.48-.3*Math.sin((i-1)/12*Math.PI),3.5],[x,y,3.5],.016,M.dark);ball(x,y-.14,3.5,.055,S.honeyCeramic);}
    box(-5.2,.43,5.85,2.6,.66,.85,M.honey,true);box(-5.2,1.04,6.2,2.6,.95,.14,M.honey,true);soft(-5.2,.83,5.85,2.45,.16,.78,S.linen);for(const x of [-5.9,-4.5])soft(x,1.04,6.08,.55,.4,.12,M.coral);
    for(let j=0;j<3;j++){box(-7.7,1.7+j*.55,4.8,.45,.08,1.6,M.honey);for(let k=0;k<4;k++)box(-7.65,1.95+j*.55,4.2+k*.36,.3,.4,.23,[M.coral,S.paper,M.lavender][(j+k)%3]);}
    // Sleeping corner, letter desk and a physical balance model in the two dormer alcoves.
    box(3.6,4.31,-2.4,2.5,.55,3.1,M.wood,true);soft(3.6,4.68,-2.4,2.4,.22,3,S.linen);soft(3.6,4.85,-1.9,2.42,.12,1.8,M.coral);for(const x of [3,4.2])soft(x,4.91,-3.4,.88,.22,.65,S.linen);
    box(2.8,4.018,1.25,3.1,.025,1.85,S.linen);box(2.8,4.035,1.25,2.9,.012,1.65,M.coral);for(const x of [1.55,4.05])box(x,4.045,1.25,.08,.008,1.65,S.linen);
    box(-3.5,4.9,6.7,1.9,.13,.9,M.honey,true);for(const x of [-4.2,-2.8])box(x,4.43,6.7,.12,.86,.65,M.wood,true);for(let i=0;i<4;i++){box(-4.1+i*.36,5,6.6,.28,.025,.38,i%2?S.paper:S.lavenderPaper);box(-4.1+i*.36,5.02,6.6,.05,.015,.38,M.coral);}
    box(3.5,4.9,6.7,1.9,.13,.9,M.honey,true);for(const x of [2.8,4.2])box(x,4.43,6.7,.12,.86,.65,M.wood,true);
    beam([3.5,4.99,6.7],[3.5,6.1,6.7],.04,M.brass);beam([2.85,6,6.7],[4.15,6,6.7],.035,M.brass);for(const x of [2.88,4.12]){for(const dx of [-.19,.19])beam([x,5.98,6.7],[x+dx,5.53,6.7],.014,M.brass);mesh(new THREE.CylinderGeometry(.24,.08,.08,12),M.brass,x,5.5,6.7);}mesh(new THREE.CylinderGeometry(.32,.4,.08,12),M.wood,3.5,5.03,6.7);
    for(const [x,y,z]of[[-7.2,0,6.5],[7.2,0,6.5],[-7.3,0,-4.8],[7,0,2.2],[1.1,4,-3.8],[-4.5,4,3.5]])plant(x,y,z);

    // Civic hospitality: warm panelled walls, visible roof boarding, and flowering colonnade.
    for(const z of [-4.4,-1.5,1.5]){box(0,3.66,z,15.5,.18,.21,M.honey);for(const x of [-6,0,6])beam([x,3.6,z],[x+.5,3.13,z],.075,M.wood);}
    for(let x=-7.7;x<8;x+=.47)box(x,3.83,.75,.025,.035,13.1,M.wood);
    for(let z=-4.8;z<7.4;z+=.47){const yy=z<1?9.1-(1-z)*3.8/7:9.1-(z-1)*3.8/6.5;let hw=z<1?2+(1-z)*6/7:2+(z-1)*6/6.5;
      const ranges=z>4.15?[[-hw,-4.94],[-2.06,2.06],[4.94,hw]]:[[-hw,hw]];
      for(const [a,b]of ranges)if(b>a)beam([a,yy-.045,z],[b,yy-.045,z],.024,M.cream);
    }
    for(const x of [-7.2,-2.5,2.5,7.2])vine(x+.15,3.55,3.15,2.6);
    for(const x of [-7.35,7.35]){vine(x,3.5,-5.6,1.6);vine(x,3.45,6.65,1.8);chain(x,2.55,1.45,3.7);plant(x,1.87,1.45);}
    for(const cx of [-3.5,3.5]){vine(cx-1.22,7.45,7.14,1.5);for(const x of [-1.28,1.28])for(const z of [4.45,7.25])beam([cx,8.45,z],[cx+x,7.64,z],.045,M.cream);}
    for(const cx of [-3.5,3.5])for(const side of [-1,1]){
      box(cx+side*1.235,4.5,5.7,.06,.92,2.6,M.cream);
      for(const z of [4.45,5.7,6.95])box(cx+side*1.19,5.7,z,.07,3.1,.10,M.honey);
      box(cx+side*1.16,5.9,5.4,.06,.93,.72,M.wood);box(cx+side*1.12,5.9,5.4,.035,.78,.58,S.paper);
      ball(cx+side*1.085,5.9,5.4,.21,M.leaf,.08,1,.7);
    }
    ring(-3.22,1.35,-.45,.16,.027,S.ceramic);ring(-2.78,1.35,-.45,.16,.027,S.ceramic);
    // Picnic table: crossed trestles, broad fabric folds, cushions and tableware.
    for(const x of [-4.4,-1.6]){beam([x,.1,-1.13],[x,.94,.23],.075,M.wood,true);beam([x,.1,.23],[x,.94,-1.13],.075,M.wood,true);}
    for(const z of [-1.7,.8]){soft(-3,.63,z,4.1,.13,.39,M.coral);for(let j=0;j<5;j++)box(-4.7+j*.85,.705,z,.025,.012,.33,S.linen);}
    for(const z of [-1.29,.39]){soft(-3,.81,z,.74,.58,.045,M.coral);box(-3,.82,z+.028,.22,.54,.017,S.linen);}
    for(const x of [-4.84,-1.16])for(const z of [-1.15,.25])ball(x,1.02,z,.035,M.brass);
    function teapot(x,y,z){ball(x,y+.17,z,.19,S.ceramic,1.1,1,1);mesh(new THREE.CylinderGeometry(.14,.14,.035,12),S.honeyCeramic,x,y+.35,z);ball(x,y+.4,z,.045,M.brass);beam([x+.13,y+.12,z],[x+.33,y+.3,z],.05,S.ceramic);ring(x-.2,y+.2,z,.13,.027,S.ceramic);}
    teapot(-2.65,1.13,-.45);for(const x of [-4.2,-1.8])for(const z of [-.9,0]){cup(x+.22,1.14,z);flower(x+.22,1.24,z-.078,M.pink);}
    const bowl=mesh(new THREE.CylinderGeometry(.36,.2,.15,14,1,true),M.honey,-3.9,1.2,-.43);for(let j=0;j<5;j++){const a=j*2.4;ball(-3.9+Math.sin(a)*.19,1.34+(j%2)*.05,-.43+Math.cos(a)*.17,.13,j%2?S.coralPetal:S.goldPetal);beam([-3.9+Math.sin(a)*.19,1.43,-.43+Math.cos(a)*.17],[-3.88+Math.sin(a)*.19,1.5,-.43+Math.cos(a)*.17],.012,M.leaf);}
    mesh(new THREE.CylinderGeometry(.23,.23,.03,12),S.ceramic,-1.6,1.13,-.44);for(let j=0;j<4;j++)ball(-1.73+j*.08,1.19,-.44,.07,S.honeyPetal,1,.6,1);
    rug(-3,0,-.45,5.05,3.9,M.coral);rug(0,0,5.5,2.3,3.2,M.coral);rug(4.8,0,5.75,3.3,2.1,M.coral);
    // Community sideboard between the rear windows: legal books, tea jars and a second balance.
    soft(2.2,.5,-5.35,2.05,1,.67,M.wood,true);box(2.2,.99,-5.35,2.2,.1,.78,M.honey);
    for(const x of [1.67,2.72]){box(x,.54,-4.99,.88,.72,.035,M.cream);box(x,.54,-4.96,.72,.58,.035,M.honey);ball(x,.55,-4.91,.04,M.brass);}
    for(let j=0;j<3;j++)book(1.65,1.06+j*.11,-5.35,.62,.10,.43,[M.coral,M.leaf,M.honey][j],true);
    beam([2.8,1.08,-5.35],[2.8,1.95,-5.35],.03,M.brass);beam([2.32,1.88,-5.35],[3.28,1.88,-5.35],.025,M.brass);
    for(const x of [2.34,3.26]){for(const d of [-.13,.13])beam([x,1.86,-5.35],[x+d,1.53,-5.35],.012,M.brass);mesh(new THREE.CylinderGeometry(.18,.05,.06,10),M.brass,x,1.5,-5.35);}
    for(let j=0;j<9;j++){const x=-3+j%3*.74,y=2.62-Math.floor(j/3)*.45;for(let k=0;k<3;k++)box(x-.03+(k%2)*.015,y+.06-k*.06,-5.625,.32-k*.05,.013,.009,M.wood);}
    box(-2.25,1.26,-5.65,2.7,.10,.34,M.honey);book(-2.9,1.33,-5.62,.42,.09,.26,M.coral,true);cup(-1.65,1.33,-5.62);
    for(const [x,z]of[[6.8,-4.9],[-7.65,4.8]])vase(x,2.15,z);
    for(const z of [-4.98,-4.84]){mesh(new THREE.CylinderGeometry(.1,.11,.24,8),S.ceramic,6.8,2.2,z);mesh(new THREE.CylinderGeometry(.12,.12,.035,8),S.honeyCeramic,6.8,2.34,z);}
    // Woven picnic baskets, folded gingham napkins and handles, all outside the central circulation.
    function basket(x,y,z){soft(x,y+.22,z,.85,.44,.62,M.honey,true);for(let j=0;j<6;j++){box(x-.36+j*.145,y+.22,z+.317,.025,.37,.02,M.cream);box(x,y+.08+j*.06,z+.329,.78,.015,.015,M.wood);}const h=ring(x,y+.47,z,.32,.035,M.wood);h.scale.y=1.15;soft(x,y+.46,z,.74,.065,.5,S.linen);for(let j=0;j<5;j++){box(x-.3+j*.15,y+.499,z,.055,.006,.48,M.coral);box(x,y+.504,z-.2+j*.1,.72,.006,.035,M.coral);}book(x+.08,y+.53,z,.32,.07,.22,M.leaf,true);}
    basket(-5.15,0,-4.95);basket(-6.55,0,6.55);basket(6.6,4,3.25);barrel(7.25,0,-3.95);crate(-6.6,0,-4.9,.75,.55,.7);
    // Low tea table carries flowers, tea, books and an invitation; poufs gain stitched seams.
    vase(4.15,.39,-.02);teapot(3.65,.39,.34);cup(4.32,.39,.55);book(4.42,.4,-.25,.40,.08,.28,M.coral,true);book(4.42,.48,-.25,.36,.08,.26,M.leaf,true);
    for(const [x,z]of[[2.6,.2],[5.4,.2],[4,-1.25]]){ring(x,.23,z,.45,.016,S.linen,Math.PI/2);for(let j=0;j<8;j++){const a=j*Math.PI/4;beam([x+Math.sin(a)*.42,.26,z+Math.cos(a)*.42],[x+Math.sin(a)*.18,.43,z+Math.cos(a)*.18],.009,S.honeyThread);}ball(x,.44,z,.035,S.honeyThread);}
    // The seat and hanging bench read as soft furniture rather than bare cuboids.
    soft(4.8,.77,5.85,2.49,.19,.93,S.linen);for(let j=0;j<7;j++)box(3.65+j*.38,1.13,6.19,.035,.85,.035,M.wood);
    for(const x of [4.15,4.85,5.55]){box(x,1.0,6.05,.025,.26,.02,S.linen);ball(x,1.01,6.04,.025,S.honeyThread);}
    // Window-side legal library and shelf still leave the host and gift bays untouched.
    box(7.6,1.85,.1,.40,.1,2.5,M.honey);for(let j=0;j<7;j++){const z=-.92+j*.33;book(7.58,1.91,z,.22,.38+(j%3)*.08,.23,[M.cream,M.coral,M.leaf][j%3]);}
    vine(7.55,3.4,-.9,1.3);vase(7.6,1.92,1.05);
    // Rest and correspondence loft: upholstered headboard, two pillows, quilt and golden law volumes.
    soft(3.6,5.0,-4.02,2.54,1.35,.17,M.honey,true);soft(3.6,5.11,-3.9,2.2,.55,.10,M.coral);
    box(3.6,4.56,-.83,2.54,.59,.14,M.honey,true);
    soft(3,5.02,-3.4,.88,.20,.65,S.linen);soft(4.2,5.02,-3.4,.88,.20,.65,S.linen);
    soft(3.6,4.98,-1.1,2.4,.12,.52,M.lavender);soft(3.6,5.05,-1.1,2.28,.05,.45,S.linen);
    for(let j=0;j<6;j++)box(2.55+j*.42,4.92,-1.9,.018,.015,1.68,S.linen);
    soft(5.4,4.4,-3.2,.65,.8,.65,M.honey,true);book(5.4,4.82,-3.2,.43,.10,.30,M.leaf,true);vase(5.4,4.92,-3.2);
    for(const x of [-3.5,3.5]){rug(x,4,5.8,2.05,2.7,M.coral);cup(x+.52,4.99,6.68);vase(x-.57,4.99,6.68);}
    ring(3.88,5.18,6.65,.052,.011,M.brass,Math.PI/2);
    book(3.88,4.99,6.65,.3,.09,.32,M.leaf,true);book(3.88,5.08,6.65,.28,.08,.30,M.coral,true);
    for(let j=0;j<4;j++){const x=-4.1+j*.36;beam([x-.10,5.045,6.45],[x+.11,5.045,6.72],.007,M.honey);beam([x+.11,5.045,6.45],[x-.10,5.045,6.72],.007,M.honey);}
    cup(-3.0,4.99,6.76);beam([-3.0,5.12,6.76],[-2.93,5.52,6.76],.014,M.wood);
    for(let j=0;j<5;j++){const z=-2.4+j*1.13;book(6.8,5.27,z,.62,.1,.40,[M.coral,M.leaf,M.honey][j%3],true);book(6.8,5.37,z,.57,.10,.38,M.cream,true);}
    rug(1.9,4,-2.5,1.4,3.3,M.coral);rug(-3.35,4,3.1,3.3,1.4,M.coral);

    // Round three: complete hospitable little scenes while keeping a 1.6m central spine,
    // the stair approaches, gift bays and a full metre around every host/interaction point.
    const dressingStart=g.children.length;
    function ottoman(x,y,z,w=1,d=.8,m=M.coral){
      soft(x,y+.18,z,w,.34,d,m);soft(x,y+.37,z,w*.94,.14,d*.94,m);
      for(const dx of [-.27,.27])box(x+dx*w,y+.446,z,.018,.008,d*.75,S.linen);
    }
    function armchair(x,y,z,ry=0,m=M.coral){
      const start=g.children.length;
      soft(0,.34,0,1.15,.35,1.16,M.wood,true);soft(0,.57,0,.95,.24,.94,m,true);
      soft(0,.94,.47,1.13,.88,.22,m,true);for(const s of [-1,1])soft(s*.51,.77,0,.19,.53,1.14,m,true);
      soft(0,1.02,.32,.61,.43,.17,S.linen);for(const dx of [-.4,.4])for(const dz of [-.4,.4])box(dx,.11,dz,.1,.22,.1,M.wood);
      const items=g.children.slice(start);for(const o of items){const X=o.position.x,Z=o.position.z;o.position.set(x+X*Math.cos(ry)+Z*Math.sin(ry),y+o.position.y,z-X*Math.sin(ry)+Z*Math.cos(ry));o.rotation.y+=ry;}
    }
    function roundTable(x,y,z,r=.6,h=.65){
      mesh(new THREE.CylinderGeometry(r,r,.13,16),M.honey,x,y+h,z,true);
      mesh(new THREE.CylinderGeometry(.12,.22,h-.10,8),M.wood,x,y+(h-.1)/2,z,true);
      soft(x,y+.06,z,r*1.2,.12,r*1.2,M.wood);ring(x,y+h+.07,z,r*.8,.018,M.cream,Math.PI/2);
    }
    function leafy(x,y,z,s=1){
      mesh(new THREE.CylinderGeometry(.34*s,.23*s,.47*s,10),S.ceramic,x,y+.235*s,z,true);
      for(let j=0;j<7;j++){const a=j*2.4,h=(.77+(j%3)*.16)*s,dx=Math.sin(a)*(.29+(j%2)*.09)*s,dz=Math.cos(a)*.32*s;
        beam([x,y+.4*s,z],[x+dx,y+h,z+dz],.016*s,M.leaf);const q=ball(x+dx,y+h,z+dz,.22*s,j%4?M.leaf:M.pink,1.15,.34+(j%3)*.11,.67+(j%2)*.35);q.rotation.set(.2*j,a,.3*Math.sin(j));}
    }
    function cabinet(x,y,z,w,d,h=.85){
      soft(x,y+h/2,z,w,h,d,M.honey,true);soft(x,y+h+.025,z,w+.10,.10,d+.08,M.wood,true);
      for(let j=0;j<3;j++){const xx=x+(j-1)*w*.31;soft(xx,y+h*.51,z+d/2+.012,w*.28,h*.72,.045,M.cream);ball(xx,y+h*.58,z+d/2+.055,.035,M.brass);}
    }
    function bookStack(x,y,z){for(let j=0;j<3;j++){const q=g.children.length;book(x+(j%2)*.035,y+j*.12,z,.52-j*.035,.10,.34,[M.coral,M.leaf,M.lavender][j],true);g.children.slice(q).forEach(o=>{o.rotation.y=(j-1)*.09;});}}

    // The tea-preparation island: serving tray, cups, fruit, folded picnic linen and stools.
    cabinet(3.9,0,-3.65,3.2,1.45,.88);soft(3.45,.998,-3.65,.62,.025,1.38,M.coral);
    teapot(3.2,1.01,-3.65);cup(3.65,1.01,-3.54);cup(3.97,1.01,-3.54);vase(5.05,1.01,-3.85);
    bookStack(2.7,1.01,-3.95);soft(4.6,1.02,-3.45,.65,.10,.45,S.linen);soft(4.6,1.11,-3.45,.58,.08,.4,M.coral);
    for(const [x,z]of[[3.25,-2.42],[4.8,-2.42]])ottoman(x,0,z,.75,.65,S.linen);
    leafy(5.75,0,-.9,1.12);basket(5.92,0,-3.75);

    // Shared games and an open law volume sit between the picnic table and the tea circle.
    soft(1.62,.48,.65,1.36,.15,1.22,M.honey,true);for(const dx of [-.48,.48])for(const dz of [-.43,.43])box(1.62+dx,.22,.65+dz,.13,.44,.13,M.wood);
    soft(1.62,.567,.65,.88,.025,.8,S.linen);book(1.45,.59,.6,.43,.10,.42,M.leaf,true);cup(1.95,.59,.88);
    for(let j=0;j<4;j++){soft(1.4+j*.13,.59,.35,.09,.05,.11,j%2?M.coral:M.brass);}
    ottoman(1.83,0,-.5,.52,.52,S.linen);
    // Small rear-window listening corner, tucked beside (rather than in front of) the civic board.
    armchair(-4.8,0,-4.35,Math.PI*.10,M.lavender);roundTable(-6.25,0,-4.5,.55,.61);cup(-6.25,.69,-4.5);bookStack(-6.25,.69,-4.8);
    ottoman(-4.9,0,-3.1,1.15,.74,S.linen);leafy(-3.72,0,-5.1,.85);
    // A rolling picnic book cart and a spare cushion belong to this rear listening corner.
    cabinet(-1.65,0,-2.85,.95,1.12,.73);bookStack(-1.65,.86,-2.94);cup(-1.65,.86,-2.52);
    ottoman(-3.18,0,-3.05,1.2,.78,M.coral);basket(-5.85,0,-2.9);
    leafy(1.1,0,-4.18,.94);
    ottoman(1.4,0,-3.35,1.0,.50,S.linen);

    // A rounded sofa backs the discussion circle; its front remains clear for the invitation card.
    soft(5.65,.35,3.05,2.30,.48,.78,M.wood,true);soft(5.65,.64,3.05,2.16,.22,.77,M.coral,true);
    soft(5.65,1.02,3.35,2.30,.86,.20,M.coral,true);for(const x of [4.6,6.7])soft(x,.88,3.05,.22,.48,.84,M.coral,true);
    for(const x of [4.9,5.65,6.4])soft(x,.98,3.21,.55,.48,.20,x===5.65?M.lavender:S.linen);
    roundTable(6.8,0,1.65,.56,.66);vase(6.8,.75,1.65);bookStack(6.8,.75,1.3);

    // The loggia becomes a ready-for-friends picnic lounge, with a low table and soft footstools.
    soft(-4.75,.48,4.65,2.0,.15,.95,M.honey,true);for(const x of [-5.45,-4.05])for(const z of [4.34,4.96])box(x,.22,z,.12,.44,.12,M.wood);
    soft(-4.75,.57,4.65,.55,.025,.9,M.coral);teapot(-4.5,.59,4.65);cup(-5.14,.59,4.68);bookStack(-4.9,.59,4.35);
    ottoman(-3.35,0,4.85,.85,.85,S.linen);leafy(-2.95,0,3.95,.93);
    cabinet(-3.9,0,6.95,1.8,.62,.72);basket(-3.9,.83,6.95);leafy(-5.9,0,3.95,.86);
    cabinet(2.85,0,6.98,1.0,.55,.8);vase(2.85,.93,6.98);
    roundTable(1.6,0,4.1,.60,.64);vase(1.6,.73,4.1);book(1.83,.73,4.05,.31,.08,.25,M.leaf,true);
    basket(-2.85,0,7.03);ottoman(-5.9,0,4.75,.75,.78,M.lavender);
    // A movable card-sorting ottoman interrupts the old large entrance void without closing the door.
    ottoman(-2.75,0,2.7,1.1,.78,M.lavender);
    leafy(-1.4,0,3.1,.85);ottoman(-.95,0,4.0,.60,.65,S.linen);

    // Upstairs: communal correspondence table, paired reading seats and a basket of picnic blankets.
    cabinet(3.8,4,1.12,2.55,1.55,.66);soft(3.8,4.785,1.12,.62,.035,1.5,M.coral);
    bookStack(3.35,4.79,1.1);cup(4.2,4.79,.83);vase(4.65,4.79,1.3);
    for(let j=0;j<4;j++)soft(3.3+j*.33,4.80,1.5,.27,.025,.34,j%2?S.paper:S.lavenderPaper);
    armchair(5.55,4,3.55,Math.PI/2,M.lavender);ottoman(3.87,4,2.47,.85,.65,S.linen);
    leafy(.15,4,1.05,.92);basket(6.6,4,3.35);
    cabinet(-6.23,4,3.03,1.25,.72,.67);bookStack(-6.23,4.8,3.03);leafy(-5.34,4,3.02,.75);
    cabinet(.95,4,3.83,1.25,.50,.68);bookStack(.95,4.81,3.83);
    // Diverse upright books include one gently leaning volume at each shelf end.
    for(let j=0;j<7;j++){const start=g.children.length;book(6.3+j*.16,5.27,-2.4,.13,.31+(j%3)*.08,.24,[M.cream,M.coral,M.leaf][j%3]);if(j===6)for(const o of g.children.slice(start))o.rotation.z=-.12;}
    g.children.slice(dressingStart).forEach(o=>{o.userData.dress3=true;});
    // 長桌與茶席用亞麻罩，三張書寫桌改用近桌任務燈。
    drum(-3,3.1,-.45,.46);drum(4,3.1,.2,.34);drum(0,3.4,5.5,.29);
    taskLamp([4.2,.955,-4.12],[4.05,1.72,-3.93]);taskLamp([-2.74,4.965,6.96],[-2.85,5.6,6.9]);taskLamp([4.24,4.965,6.94],[4.18,5.75,6.88]);
    g.userData.spawn=[0,0,5.4,Math.PI];g.userData.exit=[0,7.05,.6];g.userData.host=[1,0,-1.9,-.4];g.userData.gifts=[[-1.7,0,5.8,0],[1.7,0,5.8,0],[6.8,0,-2.5,0],[1.3,4,2.3,0]];g.userData.sun=[.15,.75,.85];
    g.userData.spots=[
      {x:-2.25,y:0,z:-4.55,r:1.2,kind:'study',label:'讀讀分工表',name:'野餐議事板',lines:['先說說每個人的需要，我會慢慢記下來。','有人不能搬重物，也許很會寫邀請卡。','多數同意之後，也要聽聽少數的擔心。','陪我想三題吧，公平的做法可以一起商量。'],alone:['便條分成準備、分享與收拾，每欄都留了空格。','衡寫著：「先說需要，再談誰能幫忙。」']},
      {x:4,y:0,z:1.65,r:1.15,kind:'look',label:'讀讀邀請卡',name:'圓桌空椅邀請卡',lines:['這裡留一張空椅，不用先答應表演。','參加是邀請，你也可以帶本書安靜坐著。','我先問大家願不願意，再把名字寫進分工表。'],alone:['小卡上畫了一張空椅，名字的位置還空著。','背面寫著：「願意來就來，也可以下次再見。」']},
      {x:4.8,y:0,z:4.5,r:1.15,kind:'look',label:'看看鞦韆椅',name:'條紋迎賓廊鞦韆椅',lines:['想熱鬧或想安靜，門廊都替你留了位置。','有人喜歡一起吃點心，也有人只想看看海。','你可以慢慢決定，我不急著把下午排滿。'],alone:['珊瑚色條紋下，三個靠枕整齊地排著。','燈串照著空位，像是在等朋友慢慢走來。']},
      {x:-3.5,y:4,z:5.55,r:1.15,kind:'look',label:'讀讀回信',name:'左老虎窗回信桌',lines:['我把每封回信放在這裡，不用急著回答。','不同意見也值得讀完，先弄懂對方在意什麼。','這扇窗的風很輕，剛好陪我慢慢想一句話。'],alone:['奶油色信封分成待讀與已回，沒有貼上評分。','桌角留著空白卡片，窗簾綁了一小束花。']},
      {x:3.5,y:4,z:5.55,r:1.15,kind:'look',label:'看看天秤',name:'右老虎窗天秤架',lines:['這座小天秤，提醒我把兩邊的理由都聽完。','同樣分一份，未必剛好照顧到不同的需要。','先把問題說清楚，再一起找能接受的做法。'],alone:['兩只黃銅秤盤停在同樣的高度，旁邊擺著筆記。','封面寫著：「聽完，再商量。」']}
    ];
    // 議事板是焦點，桌燈補閱讀，短燈槽與座床底留暖光。
    Object.assign(g.userData,{
      lights:[[-3,2.99,-.45,'#ffd0a0',1.05,.5],[4,2.99,.2,'#ffd0a0',.95,.5],[0,3.29,5.5,'#ffd0a0',.8,.45],[4.05,1.705,-3.93,'#ffd0a0',.6,.35],[-2.85,5.585,6.9,'#ffd0a0',.5,.32],[4.18,5.735,6.88,'#ffd0a0',.5,.32]],
      glow:[
        {kind:'cove',a:[-2.72,3.31,-5.8],b:[-1.62,3.31,-5.8],n:[0,1],c:'#fbf3e4'},
        {kind:'cove',a:[1.65,3.31,-5.8],b:[2.7,3.31,-5.8],n:[0,1],c:'#fbf3e4'},
        {kind:'wash',a:[-4.58,7.6,5.15],b:[-4.58,7.6,6.15],n:[1,0],c:'#fbf3e4'},
        {kind:'wash',a:[4.58,7.6,5.15],b:[4.58,7.6,6.15],n:[-1,0],c:'#fbf3e4'},
        {kind:'under',a:[7.44,1.795,-.45],b:[7.44,1.795,.45]},
        {kind:'kick',a:[5.35,.12,2.66],b:[6,.12,2.66],n:[0,-1]},
        {kind:'kick',a:[3.2,4.11,-.85],b:[4,4.11,-.85],n:[0,1]},
        {kind:'spot',p:[-2.25,3.55,-3.5],t:[-2.25,2.2,-5.625],r:.78}
      ]
    });
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
