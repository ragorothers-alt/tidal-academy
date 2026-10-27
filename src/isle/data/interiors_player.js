/* 潮汐小島 · player 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['player'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['player'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'player-honey-gable-house';
    // Shared swatches are split by surface, so paper, upholstery and glazed clay never share a shader.
    const m = {
      cream: kit.mat('#f4e6d0', {}, 'plaster'), oak: kit.mat('#8b5a36', {}, 'wood'),
      honey: kit.mat('#b07a4a', {}, 'wood'), floor: kit.mat('#c9b99e', {}, 'wood'),
      floorLight: kit.mat('#d4c5ab', {}, 'wood'), floorShade: kit.mat('#bfad90', {}, 'wood'),
      roof: kit.mat('#9c4a3a', {}, 'ceramic'), red: kit.mat('#9c4a3a', {}, 'fabric'),
      stone: kit.mat('#ded0ba', {}, 'stone'), stoneShade: kit.mat('#b8aa96', {}, 'stone'), soot: kit.mat('#4b342d', {}, 'stone'),
      dark: kit.mat('#4b342d', { metalness: .8, roughness: .36 }, 'metal'), gold: kit.mat('#d4aa59', { metalness: .8, roughness: .36 }, 'metal'),
      lilac: kit.mat('#ac88c5', {}, 'fabric'), pink: kit.mat('#e3a0b9', {}, 'fabric'), ink: kit.mat('#59697d', {}, 'fabric'),
      linen: kit.mat('#fff0cf', {}, 'fabric'), paleWood: kit.mat('#f4e6d0', {}, 'wood'),
      ceramic: kit.mat('#fff0cf', {}, 'ceramic'), tea: kit.mat('#4b342d', {}, 'ceramic'), lilacGlaze: kit.mat('#ac88c5', {}, 'ceramic'),
      leaf: kit.mat('#8c9d61', {}, 'foliage'), petal: kit.mat('#ac88c5', {}, 'foliage'), pinkPetal: kit.mat('#e3a0b9', {}, 'foliage'), whitePetal: kit.mat('#fff0cf', {}, 'foliage'), pollen: kit.mat('#d4aa59', {}, 'foliage'),
      paper: kit.mat('#fff0cf', {}, 'paper'), blue: kit.mat('#8dafbd', {}, 'paper'), artLilac: kit.mat('#ac88c5', {}, 'paper'), artPink: kit.mat('#e3a0b9', {}, 'paper'),
      shade: kit.shade('#fff0da'), lilacMetal: kit.mat('#ac88c5', { roughness:.8 }, 'metal'),
      glow: kit.lamp('#ffd8ad'), fire: kit.lamp('#ff9a4a').clone(), fireCore: kit.lamp('#ffd15b').clone(), fireInner: kit.lamp('#ffe7a0').clone()
    };
    // Flame-only copies keep their colour at night instead of inheriting the lantern brightness boost.
    for(const [mat,k] of [[m.fire,.65],[m.fireCore,.85],[m.fireInner,1]]){mat.color.set('#000000');mat.emissiveIntensity=k;}
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const roundedGeometry=new Map();
    function roundBox(w,h,d,r=.06){
      r=Math.min(r,w*.45,h*.45,d*.45);const key=[w,h,d,r].join('/');if(roundedGeometry.has(key))return roundedGeometry.get(key);
      const q=kit.rbox(w,h,d,r);
      roundedGeometry.set(key,q);return q;
    }
    // The scenery must not seal the real opening's sunlight; preserve the engine's live sky uniforms.
    const viewSource=kit.view(),windowView=viewSource.clone();windowView.uniforms=viewSource.uniforms;windowView.transparent=true;windowView.depthWrite=false;
    function mesh(geo, mat, x, y, z, ud) {
      const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z);
      if (ud) Object.assign(o.userData, ud); g.add(o); return o;
    }
    function box(x, y, z, w, h, d, mat, ud) { const o = mesh(boxGeo, mat, x, y, z, ud); o.scale.set(w, h, d); return o; }
    function beam(a, b, r, mat) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), v = B.clone().sub(A);
      const o = mesh(new THREE.CylinderGeometry(r, r, v.length(), 6), mat, ...A.add(B).multiplyScalar(0.5).toArray());
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return o;
    }
    function ball(x, y, z, r, mat, sy = 1) { const o = mesh(new THREE.IcosahedronGeometry(r, 0), mat, x, y, z); o.scale.y = sy; return o; }
    function poly(points, depth, mat, x, y, z, a = 0, ud) {
      const s = new THREE.Shape(points.map(p => new THREE.Vector2(...p)));
      const o = mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, steps: 1, curveSegments: 6 }), mat, x, y, z, ud); o.rotation.y = a; return o;
    }
    const arch = (w, h) => [[-w/2,0],[w/2,0],[w/2,h*0.62],[w*0.36,h*0.81],[0,h],[-w*0.36,h*0.81],[-w/2,h*0.62]];
    const W = (x,z,a,u,y,d=0) => [x+u*Math.cos(a)+d*Math.sin(a),y,z-u*Math.sin(a)+d*Math.cos(a)];
    // Every opening is cut out of a 32 cm wall. The pointed spandrels are real geometry.
    function wall(x,z,a,len,y0,y1,holes=[],paper=false) {
      const marks = { solid: true }; if (paper) Object.assign(marks, { paper: 'wall', prop: true });
      function part(u,lo,w,hi) { if (w<0.001 || hi-lo<0.001) return; const p=W(x,z,a,u,(lo+hi)/2); const o=box(...p,w,hi-lo,0.32,m.cream,marks);o.rotation.y=a; }
      let edge=-len/2;
      holes.sort((a,b)=>a.u-b.u).forEach(h=>{
        part((edge+h.u-h.w/2)/2,y0,h.u-h.w/2-edge,y1);
        part(h.u,y0,h.w,h.b); part(h.u,h.b+h.h,h.w,y1);
        const p=W(x,z,a,h.u,h.b,0.17), shape=h.arch?arch(h.w,h.h):[[-h.w/2,0],[h.w/2,0],[h.w/2,h.h],[-h.w/2,h.h]];
        if(h.arch) for(const side of [-1,1]) {
          const pts=side===1?[[h.w/2,h.h*.62],[h.w*.36,h.h*.81],[0,h.h],[h.w/2,h.h]]:[[-h.w/2,h.h*.62],[-h.w*.36,h.h*.81],[0,h.h],[-h.w/2,h.h]];
          const q=W(x,z,a,h.u,h.b,-0.16);poly(pts,.32,m.cream,...q,a,paper?{paper:'wall',prop:true}:undefined);
        }
        const frameDepth=x===-4&&z===.16?-.25:.20;
        for(let k=0;k<shape.length;k++) beam(W(x,z,a,h.u+shape[k][0],h.b+shape[k][1],frameDepth),W(x,z,a,h.u+shape[(k+1)%shape.length][0],h.b+shape[(k+1)%shape.length][1],frameDepth),.075,m.honey);
        if(!h.door) {
          const v=W(x,z,a,h.u,h.b+h.h/2,-.52), view=mesh(new THREE.PlaneGeometry(h.w+.55,h.h+.55),windowView,...v,{camThrough:true});view.rotation.y=a;
          const glass=poly(shape,.012,kit.glass(),...p,a,{camThrough:true}); glass.name='real-pointed-window';
          beam(W(x,z,a,h.u,h.b+.08,.23),W(x,z,a,h.u,h.b+h.h-.08,.23),.025,m.oak);
          for(const f of [.3,.58]) beam(W(x,z,a,h.u-h.w*.46,h.b+h.h*f,.23),W(x,z,a,h.u+h.w*.46,h.b+h.h*f,.23),.023,m.oak);
          const sill=box(...W(x,z,a,h.u,h.b-.07,.13),h.w+.25,.12,.42,m.stone);sill.rotation.y=a;
        }
        edge=h.u+h.w/2;
      });
      part((edge+len/2)/2,y0,len/2-edge,y1);
    }
    function floor(x,z,w,d,y,ud={}) { return box(x,y-.12,z,w,.24,d,m.floor,Object.assign({walk:true},ud)); }
    function rail(a,b,y) {
      beam([a[0],y+1.08,a[1]],[b[0],y+1.08,b[1]],.065,m.honey);
      const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.36);
      for(let k=0;k<=n;k++){const x=a[0]+(b[0]-a[0])*k/n,z=a[1]+(b[1]-a[1])*k/n;box(x,y+.52,z,.075,1.04,.075,m.honey);}
      const dx=Math.abs(b[0]-a[0]),dz=Math.abs(b[1]-a[1]);box((a[0]+b[0])/2,y+.55,(a[1]+b[1])/2,dx+.09,1.1,dz+.09,m.honey,{solid:true}).visible=false;
    }
    function shade(x,y,z,r=.30) {
      mesh(new THREE.CylinderGeometry(r*.3,r,.30,16,1,true),m.shade,x,y+.09,z);
      mesh(new THREE.CylinderGeometry(Math.min(r*.74,.16),Math.min(r*.74,.16),.016,16),m.glow,x,y+.03,z);
      for(let j=0;j<12;j++){const a=j*Math.PI/6;ball(x+r*.943*Math.cos(a),y-.04,z+r*.943*Math.sin(a),.042,m.shade,.55);}
    }
    function lamp(x,y,z,top) {
      shade(x,y,z);mesh(new THREE.CylinderGeometry(.07,.09,.08,10),m.gold,x,y+.26,z);beam([x,y+.26,z],[x,top,z],.018,m.dark);box(x,top-.018,z,.14,.035,.14,m.gold);
    }
    function floorLamp(x,y,z) {
      mesh(new THREE.CylinderGeometry(.16,.18,.06,20),m.lilacMetal,x-.08,.035,z,{solid:true});
      beam([x-.08,.065,z],[x-.08,y,z],.022,m.lilacMetal).userData.solid=true;
      beam([x-.08,y,z],[x,y+.09,z],.022,m.lilacMetal);shade(x,y,z);
    }
    function pot(x,y,z,s=1) {
      mesh(new THREE.CylinderGeometry(.28*s,.2*s,.4*s,8),m.ceramic,x,y+.2*s,z);
      for(let j=0;j<4;j++){const a=j*2.4,xx=x+Math.cos(a)*.25*s,yy=y+(.74+j*.075)*s,zz=z+Math.sin(a)*.25*s;beam([x,y+.35*s,z],[xx,yy,zz],.018*s,m.leaf);const leaf=ball((x+xx)/2,y+.55*s,(z+zz)/2,.12*s,m.leaf,.3);leaf.scale.x=1.5;for(let k=0;k<5;k++){const t=k*Math.PI*2/5;ball(xx+Math.cos(t)*.085*s,yy+Math.sin(t)*.085*s,zz,.065*s,j%2?m.whitePetal:m.petal,.75);}ball(xx,yy,zz+.045*s,.035*s,m.pollen);}
    }
    function books(x,y,z,w=2.8) {
      box(x,y+1.25,z,w,2.5,.52,m.oak,{solid:true});
      for(const yy of [.22,.91,1.62,2.32]) {
        box(x,y+yy,z+.3,w+.08,.09,.68,m.honey);
        if(yy<2.2)for(let j=0;j<10;j++){const xx=x-w*.43+j*w*.086,h=.35+(j%3)*.085;box(xx,y+yy+h/2+.06,z+.33,w*.065,h,.32,[m.lilac,m.ink,m.paper,m.red][j%4]);box(xx,y+yy+h+.05,z+.30,w*.05,.014,.23,m.paper);box(xx,y+yy+.15,z+.503,w*.06,.025,.01,m.gold);}
      }
    }
    function table(x,y,z,w,d) {
      mesh(roundBox(w,.16,d,.055),m.honey,x,y+.86,z,{solid:true});for(const xx of [-w*.4,w*.4])for(const zz of [-d*.35,d*.35])box(x+xx,y+.4,z+zz,.12,.8,.12,m.oak);
    }
    function chair(x,y,z,a=0) {
      const c=new THREE.Group();g.add(c);c.position.set(x,y,z);c.rotation.y=a;
      const items=[[0,.5,0,1.15,.22,1.1,m.lilac],[0,1.1,.48,1.15,1.1,.2,m.linen],[-.59,.75,0,.16,.35,1.1,m.honey],[.59,.75,0,.16,.35,1.1,m.honey]];
      items.forEach(v=>{const o=new THREE.Mesh(roundBox(v[3],v[4],v[5],.09),v[6]);o.position.set(...v.slice(0,3));c.add(o);});
      for(const xx of [-.43,.43])for(const zz of [-.38,.38]){const leg=new THREE.Mesh(boxGeo,m.oak);leg.position.set(xx,.2,zz);leg.scale.set(.1,.4,.1);c.add(leg);}
      const pillow=new THREE.Mesh(roundBox(.63,.45,.2,.09),m.pink);pillow.position.set(.15,.94,.1);pillow.rotation.z=-.14;c.add(pillow);
      const upholstery=new THREE.Mesh(roundBox(.98,.85,.3,.14),m.linen);upholstery.position.set(0,1.08,.33);c.add(upholstery);
      for(const xx of [-.28,.28]){const button=new THREE.Mesh(new THREE.IcosahedronGeometry(.035,0),m.lilac);button.position.set(xx,1.33,.17);c.add(button);}c.userData.solid=true;
    }
    function vine(x,y,z) { for(let j=0;j<7;j++){const xx=x+(j-3)*.27;ball(xx,y,z,.3,m.leaf,.5);for(let k=0;k<5;k++)ball(xx+Math.sin(j+k)*.04,y-.24-k*.18,z,.14-k*.018,k%2?m.pinkPetal:m.petal,1.3);} }

    // Ground floor: an 8 x 8 m private blank room and a separate furnished living wing.
    floor(-4,-4,8,8,0,{paper:'floor',prop:true}); floor(4,-4,8,8,0);floor(0,4,16,8,0);
    wall(-4,-8.16,0,8,0,3.76,[{u:.6,b:1.35,w:2.1,h:1.8}],true);
    wall(4,-8.16,0,8,0,3.76,[{u:-1,b:0,w:1.8,h:2.8,door:true}]);
    const rearDoor=new THREE.Shape([new THREE.Vector2(-.875,0),new THREE.Vector2(.875,0),new THREE.Vector2(.875,2.8),new THREE.Vector2(-.875,2.8)]);
    rearDoor.holes.push(new THREE.Path([new THREE.Vector2(-.4,1.4),new THREE.Vector2(-.4,2.45),new THREE.Vector2(.4,2.45),new THREE.Vector2(.4,1.4)]));
    mesh(new THREE.ExtrudeGeometry(rearDoor,{depth:.16,bevelEnabled:false}),m.honey,3,0,-8.32,{solid:true});
    mesh(new THREE.PlaneGeometry(1.3,1.55),windowView,3,1.925,-8.72,{camThrough:true});
    mesh(new THREE.PlaneGeometry(.8,1.05),kit.glass(),3,1.925,-8.14,{camThrough:true});
    box(3,1.925,-8.12,.035,1.05,.04,m.oak);box(3,1.925,-8.12,.8,.035,.04,m.oak);
    wall(-8.16,-4,Math.PI/2,8,0,3.76,[{u:-2,b:1.35,w:2.15,h:1.8,arch:true}],true);
    wall(-8.16,4,Math.PI/2,8,0,3.76);
    wall(8.16,0,-Math.PI/2,16,0,3.76,[{u:-2,b:1.25,w:2.15,h:1.9,arch:true}]);
    wall(0,8.16,Math.PI,16,0,3.76,[{u:-2.6,b:0,w:2,h:2.85,arch:true,door:true},{u:4,b:1.2,w:2,h:1.95,arch:true}]);
    wall(.16,-4,-Math.PI/2,8,0,3.76,[],true);
    wall(-4,.16,Math.PI,8,0,3.76,[{u:0,b:0,w:2,h:2.95,door:true}]);
    // Floor joints and wall framing stop at the private room boundary.
    for(let k=0;k<33;k++) {
      const x=-7.8+k*.48;box(x,.006,4,.012,.008,7.85,m.honey);
      if(x>.4)box(x,.006,-4,.012,.008,7.85,m.honey);
    }
    for(const z of [-6,-2,2,6])for(let k=0;k<8;k++){const x=-7+(k+.5)*1.8;if(z>0||x>.4)box(x,.008,z,.43,.008,.012,m.honey);}
    for(const x of [-7.94,.42,7.94])box(x,3.45,4,.18,.18,7.8,m.honey);
    for(const x of [-7.8,.5,7.8])box(x,1.85,7.96,.16,3.7,.18,m.honey);
    for(const x of [-7.96,7.96])for(const z of [1,7.7])box(x,1.85,z,.18,3.7,.18,m.honey);
    box(0,3.48,7.96,16,.2,.18,m.oak);box(4,3.48,-7.96,7.6,.2,.18,m.oak);
    for(const x of [-5.08,-2.92])box(x,1.48,.38,.15,2.96,.18,m.honey);
    box(-4,3.08,.38,2.4,.18,.18,m.honey);
    box(2.6,1.43,8.3,1.95,2.85,.14,m.honey,{solid:true});
    // Only the three designated walls carry wallpaper; the entrance elevation stays fixed.
    for(const o of g.children) if(o.userData.paper==='wall')o.name='decor-wall';
    // Ceiling underside, panelled soffits, timber structure, and a 2.4 x 7 m stair opening.
    floor(-1.45,0,13.1,16,4);floor(7.7,0,.6,16,4);floor(6.25,-4.5,2.3,7,4);floor(6.25,6.8,2.3,2.4,4);
    for(const z of [-7.4,-3.5,.7,5.7,7.4])box(-1.4,3.68,z,13,.22,.2,m.oak);
    for(const x of [-7.8,.3,4.9,7.8])box(x,3.7,0,.2,.22,16,m.honey);
    // Smooth invisible walking surface + 16 visible quarter-metre steps; slope 33.7 degrees.
    const ramp=mesh(new THREE.PlaneGeometry(1.8,Math.hypot(6,4)),m.floor,6.25,2,2,{walk:true});ramp.rotation.x=-Math.PI/2+Math.atan2(4,6);ramp.visible=false;
    for(let k=0;k<16;k++)box(6.25,k*.25+.125,4.8125-k*.375,1.8,.25,.375,m.honey);
    rail([5.15,5.15],[5.15,-1.5],4);rail([7.4,5.15],[7.4,-1.5],4);rail([5.15,5.15],[7.4,5.15],4);
    for(const x of [5.28,7.22])beam([x,.95,5],[x,4.95,-1],.055,m.oak);
    // Upper storey: matching paired front/rear pointed windows, high gable and right dormer.
    wall(0,8.16,Math.PI,16,4,7.6,[{u:-3.1,b:5.15,w:2,h:2.12,arch:true},{u:3.1,b:5.15,w:2,h:2.12,arch:true}]);
    wall(0,-8.16,0,16,4,7.6,[{u:-3.1,b:5.15,w:2,h:2.12,arch:true},{u:3.1,b:5.15,w:2,h:2.12,arch:true},{u:0,b:4,w:1.8,h:2.9,door:true}]);
    wall(-8.16,0,Math.PI/2,16,4,7.6);
    wall(8.16,0,-Math.PI/2,16,4,8,[{u:.1,b:5.65,w:1.7,h:1.7,arch:true}]);
    for(const z of [-8.16,7.84])poly([[-8,0],[8,0],[0,4.2]],.32,m.cream,0,7.6,z);
    function roofPart(x,z,w,d,side) { const slope=4.2/8,slant=w*Math.sqrt(1+slope*slope),o=box(x,11.8-Math.abs(x)*slope,z,slant,.22,d,m.roof);o.rotation.z=-side*Math.atan(slope); }
    roofPart(-4,0,8.4,16.7,-1);roofPart(4,-4.8,8.4,6.9,1);roofPart(4,5,8.4,6.7,1);roofPart(2.7,0,5.4,3,1);
    for(const side of [-1,1]){const o=box(6.9,8.65,side*.79,2.8,.18,1.8,m.roof);o.rotation.x=side*.43;}
    for(const z of [-1.5,1.5])poly([[5.4,0],[8.3,0],[8.3,1],[5.4,2.6]],.18,m.cream,0,7.45,z);
    for(let k=0;k<32;k++)box(-7.75+k*.5,4.007,0,.012,.01,15.7,m.honey);
    for(const z of [-7.7,-3.7,3.7,7.7]){beam([-7.8,7.7,z],[0,11.7,z],.12,m.honey);beam([0,11.7,z],[7.8,7.7,z],.12,m.honey);box(0,7.65,z,16,.2,.18,m.oak);}
    beam([0,11.62,-8],[0,11.62,8],.17,m.honey);
    // The wrap-around balcony has a rear access, safe balusters and wisteria at the corners.
    floor(0,9,20,2,4);floor(0,-9,20,2,4);floor(-9,0,2,16,4);floor(9,0,2,16,4);
    for(const z of [-9.9,9.9])rail([-9.9,z],[9.9,z],4);for(const x of [-9.9,9.9])rail([x,-9.9],[x,9.9],4);
    vine(-8.8,6.7,9.6);vine(8.8,6.7,-9.5);pot(-7.6,4,8.9);pot(7.6,4,8.9);
    // Ground-floor living: low island map, lavender sofa, kitchen and a generous clear hall.
    box(-4.3,.018,4.5,4.5,.035,3.8,m.lilac);box(-4.3,.04,4.5,4.1,.012,3.4,m.linen);
    chair(-6.3,0,4.3,-Math.PI/2);chair(-3.3,0,6.4,0);table(-4.6,0,4.1,1.7,1.1);box(-4.6,.96,4.1,1.1,.035,.65,m.blue);
    for(let j=0;j<5;j++)box(-4.9+j*.15,.985,4.1+Math.sin(j)*.17,.1,.008,.08,m.paper);
    books(-6.6,0,1.7,2.1);pot(-7.1,0,6.8,1.1);
    box(3.8,.53,-7.35,5.7,1.06,.92,m.honey,{solid:true});box(3.8,1.1,-7.35,5.9,.1,1.05,m.stone);
    box(6,1.18,-7.35,1.1,.08,.7,m.soot);for(const xx of [5.7,6.2])mesh(new THREE.TorusGeometry(.14,.02,5,12),m.gold,xx,1.24,-7.35).rotation.x=-Math.PI/2;
    for(const x of [1.7,3.2,4.7,6.2]){box(x,.55,-6.86,1.25,.7,.04,m.oak);ball(x,.65,-6.81,.04,m.gold);}
    table(3.1,0,-3.5,2.6,1.4);chair(2,0,-2,Math.PI);pot(6.9,0,-5.7);
    for(const z of [1.5,6.9]){box(-7.96,2.2,z,.08,1.25,1.55,m.honey);box(-7.9,2.2,z,.03,1.04,1.3,m.blue);}
    // Rounded masonry stays inside the original hearth, jamb and mantel collision envelopes.
    const fireplace = new THREE.Group(); fireplace.name = 'rounded-stone-fireplace'; g.add(fireplace);
    function hearthMesh(geo,mat,x,y,z,role) {
      const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.name='fireplace-'+role;fireplace.add(o);return o;
    }
    function hearthStone(x,y,z,w,h,d,tone=0,r=.07) { return hearthMesh(roundBox(w,h,d,r),tone?m.stoneShade:m.stone,x,y,z,'stone'); }
    // Invisible collision proxies retain the previous four boxes exactly; the curved faces are visual only.
    for(const x of [-6.1,-4.7])box(x,5,-7.3,.48,2,.8,m.soot,{solid:true}).visible=false;
    box(-5.4,6.12,-7.3,2.3,.32,1.05,m.soot,{solid:true}).visible=false;
    box(-5.4,4.16,-7.1,2.5,.28,1.3,m.soot).visible=false;
    for(let j=0;j<4;j++)hearthStone(-6.325+j*.617,4.16,-7.1,.649,.28,1.3,j%3===0,.07);
    for(const side of [-1,1]) {
      let y=4.3;
      [.31,.28,.36,.33,.38].forEach((h,j)=>{
        hearthStone(-5.4+side*.7+(j%2?.008:-.008),y+h/2,-7.285,.46-(j%3)*.025,h-.012,.85,j%3===1,.065);y+=h;
      });
    }
    // Seven bevelled voussoirs form a true arch, with a dark, recessed firebrick back.
    const opening=new THREE.Shape();opening.moveTo(-.46,0);opening.lineTo(.46,0);opening.lineTo(.46,.98);
    opening.absellipse(0,.98,.46,.36,0,Math.PI,false);opening.lineTo(-.46,0);
    hearthMesh(new THREE.ExtrudeGeometry(opening,{depth:.06,bevelEnabled:false,curveSegments:10}),m.soot,-5.4,4.3,-7.74,'recess');
    for(let j=0;j<7;j++) {
      const a=j*Math.PI/7+.012,b=(j+1)*Math.PI/7-.012,s=new THREE.Shape();
      s.moveTo(Math.cos(a)*.84,Math.sin(a)*.66);s.absellipse(0,0,.84,.66,a,b,false);
      s.lineTo(Math.cos(b)*.48,Math.sin(b)*.38);s.absellipse(0,0,.48,.38,b,a,true);s.closePath();
      hearthMesh(new THREE.ExtrudeGeometry(s,{depth:.76,bevelEnabled:true,bevelThickness:.028,bevelSize:.026,bevelSegments:2,curveSegments:5}),j%3===1?m.stoneShade:m.stone,-5.4,5.28,-7.66,'arch');
    }
    hearthMesh(roundBox(2.3,.32,1.05,.075),m.honey,-5.4,6.12,-7.3,'wood-mantel');
    for(let row=0;row<7;row++) {
      const n=row%2?3:2,w=1.45/n;
      for(let j=0;j<n;j++)hearthStone(-6.125+(j+.5)*w,6.25+(row+.5)*2.5/7,-7.65,w-.008,2.5/7-.012,.46,(row+j)%4===0,.055);
    }
    // Three crossed logs and three nested leaf-shaped flames: orange outside, amber/yellow within.
    for(let j=0;j<3;j++) {
      const log=hearthMesh(new THREE.CylinderGeometry(.085,.10,.75,9),m.oak,-5.4+(j-1)*.13,4.39+(j===2?.10:0),-7.27+(j-1)*.11,'log');
      log.rotation.set(0,j*.55,Math.PI/2+(j-1)*.15);
    }
    function flame(x,y,z,w,h,mat,lean) {
      const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-w*.8,h*.16,-w*.46,h*.55,lean,h);
      s.bezierCurveTo(w*.12,h*.66,w*.85,h*.30,0,0);
      return hearthMesh(new THREE.ExtrudeGeometry(s,{depth:.055,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:2,curveSegments:8}),mat,x,y,z,'flame');
    }
    flame(-5.4,4.43,-7.24,.5,.99,m.fire,.13);
    flame(-5.4,4.43,-7.14,.35,.73,m.fireCore,-.08);
    flame(-5.4,4.43,-7.04,.17,.45,m.fireInner,.035);
    books(4.55,4,-7.6,3.4);
    chair(-5.6,4,-4.2,.3);box(-4.3,4.02,-3.9,4.4,.035,3.2,m.lilac);table(-3.1,4,-5.4,1.1,.8);pot(-6.8,4,-6.3);
    table(-3.1,4,6.5,3.1,1.1);box(-3.2,4.97,6.5,1.2,.035,.7,m.paper);box(-3.65,4.99,6.5,.04,.02,.7,m.lilac);chair(-3.1,4,5,Math.PI);
    // A brass telescope on a real tripod, pointing through the front-right arch.
    beam([3.1,5.2,6.6],[3.1,5.8,7.6],.14,m.gold);beam([3.1,5.15,6.7],[3.1,4.1,6.7],.055,m.dark);
    for(let j=0;j<3;j++){const a=j*Math.PI*2/3;beam([3.1,4.95,6.7],[3.1+Math.cos(a)*.6,4.05,6.7+Math.sin(a)*.6],.04,m.honey);}
    vine(-5.2,7.4,7.88);pot(-1.1,4,7.3);
    // The right dormer illuminates the stairwell; its narrow edge is not a furnishing bay.
    box(0,5.8,-9.5,.14,3.6,.14,m.honey,{solid:true});beam([0,7.6,-9.5],[0,7.6,-9.1],.06,m.honey);
    // Side book wall, framed landscapes and knee panelling make the large loft inhabited.
    box(-7.7,5.35,.2,.5,2.7,3.4,m.oak,{solid:true});
    for(const yy of [4.2,4.95,5.7,6.45]){box(-7.4,yy,.2,.68,.09,3.5,m.honey);if(yy<6)for(let j=0;j<12;j++){const z=-1.3+j*.26,h=.4+(j%3)*.07;box(-7.32,yy+h/2+.08,z,.32,h,.19,[m.paper,m.lilac,m.ink,m.red][j%4]);box(-7.35,yy+h+.07,z,.23,.014,.15,m.paper);}}
    for(const x of [-7.85,0,7.85])for(const z of [-7.94,7.94])box(x,5.85,z,.18,3.7,.16,m.honey);
    for(const z of [-7.93,7.93])box(0,7.48,z,15.9,.18,.18,m.honey);
    for(const z of [-5,4.3]){box(-7.96,5.8,z,.1,1.55,2.3,m.honey);box(-7.88,5.8,z,.035,1.3,2.05,m.blue);for(let j=0;j<4;j++)poly([[0,0],[.5,.7],[1,0]],.025,m.artLilac,-7.84+j*.032,5.2,z+.95-j*.34,Math.PI/2);}
    for(const z of [-4.3,3.3])vine(-7.7,7.3,z);
    box(4,2.3,-7.96,2.2,1.1,.1,m.honey);box(4,2.3,-7.87,2, .9,.03,m.paper);
    for(let j=0;j<6;j++)box(3.3+(j%3)*.65,2.5-Math.floor(j/3)*.4,-7.83,.45,.25,.02,j%2?m.artPink:m.artLilac);
    // Second dressing pass. The private 8 x 8 floor is deliberately untouched.
    const softGeos=new Map();
    function soft(x,y,z,w,h,d,mat,r=.06,solid=false){r=Math.min(r,w*.45,h*.45,d*.45);const key=[w,h,d,r].join('/');if(!softGeos.has(key))softGeos.set(key,roundBox(w,h,d,r));return mesh(softGeos.get(key),mat,x,y,z,solid?{solid:true}:undefined);}
    function ring(x,y,z,r,mat,vertical=false){const o=mesh(new THREE.TorusGeometry(r,.018,3,10),mat,x,y,z);if(!vertical)o.rotation.x=Math.PI/2;return o;}
    function jug(x,y,z,s=1,mat=m.ceramic){
      const o=mesh(new THREE.SphereGeometry(.18,8,5),mat,x,y+.2*s,z);o.scale.set(s,s*1.1,s);
      mesh(new THREE.CylinderGeometry(.085*s,.11*s,.14*s,8),mat,x,y+.4*s,z);ring(x,y+.47*s,z,.086*s,m.gold);
      const handle=ring(x+.19*s,y+.23*s,z,.105*s,mat,true);handle.scale.set(s,s,s);
    }
    function mug(x,y,z){mesh(new THREE.CylinderGeometry(.1,.075,.14,8),m.ceramic,x,y+.07,z);mesh(new THREE.CylinderGeometry(.081,.081,.008,8),m.tea,x,y+.143,z);ring(x+.1,y+.08,z,.06,m.gold,true);mesh(new THREE.CylinderGeometry(.16,.16,.018,12),m.lilacGlaze,x,y+.008,z);}
    function stack(x,y,z,n=3){for(let j=0;j<n;j++){const w=.48+(j%2)*.1;box(x,y+.045+j*.11,z,w,.09,.35,[m.ink,m.red,m.lilac][j%3]);box(x,y+.045+j*.11,z+.177,w*.86,.045,.012,m.paper);}}
    function scrollRoll(x,y,z){const o=mesh(new THREE.CylinderGeometry(.065,.065,.65,8),m.paper,x,y+.07,z);o.rotation.z=Math.PI/2;for(const dx of [-.18,.18])beam([x+dx,y+.07,z-.07],[x+dx,y+.07,z+.07],.014,m.lilac);}
    function chest(x,y,z,w=1){
      soft(x,y+.32,z,w,.64,.65,m.honey,.05,true);soft(x,y+.68,z,w+.04,.2,.69,m.oak,.07);
      for(const dx of [-w*.32,w*.32]){box(x+dx,y+.38,z+.335,.065,.65,.025,m.dark);box(x+dx,y+.81,z,.065,.025,.65,m.dark);}
      box(x,y+.56,z+.355,.15,.16,.045,m.gold);ring(x,y+.53,z+.39,.035,m.dark,true);
    }
    function basket(x,y,z,s=.7){mesh(new THREE.CylinderGeometry(s*.5,s*.38,s*.5,10),m.honey,x,y+s*.25,z);for(let j=0;j<4;j++)ring(x,y+.08+j*s*.12,z,s*(.4+j*.023),m.floorLight);const h=ring(x,y+s*.55,z,s*.42,m.oak,true);h.scale.y=.65;}
    function rug(x,y,z,w,d){
      soft(x,y+.023,z,w,.04,d,m.lilac,.04);soft(x,y+.046,z,w-.22,.014,d-.22,m.linen,.02);soft(x,y+.058,z,w-.42,.012,d-.42,m.lilac,.01);
      for(const end of [-1,1])for(let j=0;j<Math.floor(w/.16);j++)box(x-w/2+.1+j*.16,y+.03,z+end*(d/2+.07),.035,.02,.19,m.linen);
    }
    function runner(x,y,z,w,d){soft(x,y,z,w,.018,d,m.lilac,.012);for(const side of [-1,1]){box(x,y-.14,z+side*d/2,w,.28,.015,m.lilac);for(let j=0;j<6;j++)beam([x-w*.43+j*w*.17,y-.28,z+side*d/2],[x-w*.43+j*w*.17,y-.38,z+side*d/2],.012,m.linen);}}
    function flowerBox(x,y,z,w=1.4,a=0){
      const start=g.children.length;box(x,y+.12,z,w,.24,.32,m.honey);box(x,y+.25,z,w+.08,.05,.38,m.paleWood);
      for(let j=0;j<7;j++)pot(x-w*.4+j*w*.13,y+.22,z,.29);
      const objs=g.children.slice(start);if(a){const group=new THREE.Group();group.position.set(x,y,z);g.add(group);for(const o of objs){o.position.sub(group.position);group.add(o);}group.rotation.y=a;}
    }
    function curtains(x,z,a,u,bottom,w,h){
      beam(W(x,z,a,u-w*.69,bottom+h+.15,.3),W(x,z,a,u+w*.69,bottom+h+.15,.3),.035,m.gold);
      for(const side of [-1,1])for(let k=0;k<4;k++){
        const xx=u+side*(w*.58+k*.055),height=h-.13;
        const o=soft(...W(x,z,a,xx,bottom+h/2+.03,.31+Math.sin(k)*.035),.12,height,.1,m.lilac,.035);o.rotation.y=a;
        const tie=box(...W(x,z,a,xx,bottom+h*.37,.4),.13,.06,.07,m.gold);tie.rotation.y=a;
      }
    }
    // All private-room trim, flowers and curtain hems start above 1.2 m.
    curtains(-4,-8.16,0,.6,1.4,2.1,1.8);curtains(-8.16,-4,Math.PI/2,-2,1.4,2.15,1.8);
    for(const x of [-7.9,-.1])box(x,2.45,-4,.12,.13,7.8,m.honey);
    box(-4,3.35,-7.96,7.8,.14,.12,m.honey);box(-.04,3.35,-4,.12,.14,7.8,m.honey);
    flowerBox(-3.4,1.3,-7.89,1.85);vine(-6.9,3.38,-7.84);
    box(-.08,2.45,-4,.36,.13,2.7,m.honey);for(let j=0;j<8;j++)box(-.22,2.7,-5.05+j*.28,.25,.4+(j%3)*.08,.17,[m.paper,m.lilac,m.ink][j%3]);
    // Panelled living walls; each bay has relief rather than an unbroken plaster field.
    for(const y0 of [0,4]){
      for(const z of y0===0?[7.94]:[-7.94,7.94])for(const x of [-6.1,-.7,5.7]){
        if(y0===0&&x===-.7)continue;
        box(x,y0+.15,z,2.4,.15,.1,m.oak);box(x,y0+.84,z,2.4,.1,.1,m.honey);
        for(let j=0;j<8;j++)box(x-1.05+j*.3,y0+.46,z,.055,.6,.08,m.honey);
      }
    }
    for(const z of [1.5,5.8]){beam([-7.85,2.8,z],[-6.95,3.6,z],.07,m.honey);beam([7.85,2.8,z],[6.95,3.6,z],.07,m.honey);}
    for(const z of [-7.5,-5,-.1,3,5.5,7.7]){box(7.93,1.85,z,.15,3.7,.16,m.honey);if(z>0)box(-7.93,1.85,z,.15,3.7,.16,m.honey);}
    for(const z of [-7.5,-5,-2.5,2.5,5,7.5])for(const x of [-7.93,7.93]){
      box(x,5.83,z,.15,3.66,.16,m.honey);beam([x,6.85,z],[x,7.4,z+.65],.06,m.honey);
      box(x,4.15,z,.12,.15,2.25,m.oak);box(x,4.88,z,.11,.1,2.25,m.honey);
      for(let j=0;j<7;j++)box(x,4.51,z-.9+j*.3,.08,.64,.035,m.honey);
    }
    for(const z of [-5.6,3.5,6.7]){
      box(7.84,2.1,z,.08,1.15,1.35,m.honey);box(7.78,2.1,z,.025,.96,1.16,m.paper);
      for(let j=0;j<3;j++){const a=poly([[0,0],[.38,.45],[.75,0]],.015,j%2?m.artLilac:m.blue,7.75-j*.024,1.75,z-.48+j*.17,-Math.PI/2);a.rotation.y=-Math.PI/2;}
    }
    for(let j=0;j<31;j++){const x=-7.5+j*.5;box(x,3.84,4,.022,.025,7.65,m.oak);}
    for(const side of [-1,1])for(let k=1;k<15;k++){const x=side*k*.53;const q=box(x,11.63-Math.abs(x)*.525,0,.045,.04,15.8,m.honey);q.rotation.z=-side*Math.atan(.525);}
    for(const z of [-6,-1,4.8]){beam([-7.8,6.6,z],[-5.9,8.45,z],.09,m.honey);beam([7.8,6.6,z],[5.9,8.45,z],.09,m.honey);}
    for(const u of [-3.1,3.1]){curtains(0,8.16,Math.PI,u,5.2,2,2.12);flowerBox(-u,5.18,7.85,1.75,Math.PI);curtains(0,-8.16,0,u,5.2,2,2.12);}
    curtains(8.16,0,-Math.PI/2,-2,1.3,2.15,1.9);curtains(0,8.16,Math.PI,4,1.25,2,1.95);
    // Ground living and kitchen: tactile textiles, tea, dishes and daily collections.
    rug(-4.3,.065,4.5,4.55,3.85);runner(-4.6,.956,4.1,.45,1.12);stack(-5.12,.96,4.12,2);mug(-4.4,.97,4.28);jug(-4.12,.97,3.9,.65);
    runner(-3.3,.66,6.45,.5,.85);runner(-6.3,.66,4.3,.5,.85);
    rug(3.05,.005,-3.6,3.5,2.7);runner(3.1,.955,-3.5,.55,1.45);mug(2.45,.96,-3.5);jug(3.1,.96,-3.5,.9);pot(3.9,.96,-3.5,.43);
    // A flush compass rose dresses the broad entry hall without taking walking space.
    ring(2.6,.015,2.8,1.32,m.gold);for(let j=0;j<8;j++){
      const a=j*Math.PI/4,q=poly([[0,0],[-.17,.55],[0,1.2],[.17,.55]],.008,j%2?m.paleWood:m.honey,2.6,.016,2.8);q.rotation.set(-Math.PI/2,0,a);
    }
    mesh(new THREE.CylinderGeometry(.3,.22,.09,12),m.ceramic,4.55,1.21,-7.25);for(let j=0;j<5;j++)ball(4.35+j*.09,1.33,-7.25+Math.sin(j)*.12,.09,j%2?m.pinkPetal:m.pollen);
    for(const yy of [1.95,2.78]){box(5.7,yy,-7.88,3.8,.13,.4,m.honey);for(let j=0;j<7;j++){const x=4.05+j*.5;if(j%3===0)jug(x,yy+.07,-7.84,.65);else{mesh(new THREE.CylinderGeometry(.13,.13,.28+(j%2)*.1,8),j%2?m.lilacGlaze:m.ceramic,x,yy+.23,-7.84);box(x,yy+.25,-7.695,.12,.1,.012,m.gold);}}}
    for(let j=0;j<4;j++)mug(1.55+j*.4,1.16,-7.35);basket(6.95,0,-7.2,.8);chest(-7.25,0,2.65,.9);
    books(-6.3,0,.55,2.9);stack(-7.05,2.56,.55,3);jug(-5.8,2.56,.55,.85);pot(-6.4,2.56,.55,.45);vine(-6.5,3.35,.3);
    // Loft fireplace, library, travel chest, and furnished bays, leaving cross-house routes clear.
    rug(-4.3,4.045,-3.9,4.5,3.25);runner(-5.6,4.65,-4.15,.5,.88);runner(-3.1,4.956,-5.4,.45,.83);mug(-3.15,4.97,-5.4);jug(-2.85,4.97,-5.4,.65);
    for(let j=0;j<5;j++)beam([-5.9+j*.25,4.18,-6.85],[-5.9+j*.25,4.77,-6.85],.025,m.dark);
    beam([-6.05,4.75,-6.85],[-4.8,4.75,-6.85],.03,m.dark);
    for(let j=0;j<6;j++)beam([-7.1+(j%2)*.25,4.13+Math.floor(j/2)*.17,-7.2],[-7.1+(j%2)*.25,4.13+Math.floor(j/2)*.17,-6.65],.09,m.oak);
    // A small banded barrel planter hugs the existing flower-pot footprint.
    mesh(new THREE.CylinderGeometry(.34,.3,.44,10),m.honey,-6.8,4.22,-6.3);
    for(const yy of [4.06,4.36])ring(-6.8,yy,-6.3,.335,m.dark);
    for(let j=0;j<10;j++){const a=j*Math.PI/5;beam([-6.8+Math.cos(a)*.329,4.05,-6.3+Math.sin(a)*.329],[-6.8+Math.cos(a)*.329,4.41,-6.3+Math.sin(a)*.329],.009,m.oak);}
    jug(-5.95,6.3,-7.25,.8);pot(-4.86,6.3,-7.25,.5);
    for(const x of [-6.7,-6.48]){beam([x,4.1,-6.55],[x,5.17,-6.55],.025,m.dark);ring(x,5.23,-6.55,.07,m.gold,true);}beam([-6.75,5.05,-6.55],[-6.4,5.05,-6.55],.03,m.dark);
    box(-5.4,7.18,-7.38,1.1,1.05,.08,m.honey);box(-5.4,7.18,-7.32,.92,.87,.025,m.blue);poly([[-.42,0],[0,.35],[.42,0]],.025,m.artLilac,-5.4,6.83,-7.29);
    for(const [x,y,z] of [[4.55,6.56,-7.6],[-7.35,6.55,.3]]){stack(x,y,z,3);jug(x+.6,y,z,.8);pot(x-.6,y,z,.5);}
    chest(6.5,4,-6.7,1.4);basket(6.7,4,-7.6,.7);vine(4.5,7.3,-7.8);
    // Low window-side console, travel rolls and tiny star chart around the telescope.
    table(5.7,4,7.35,2.6,.65);runner(5.7,4.956,7.35,.42,.68);stack(5.1,4.96,7.35,3);jug(6.4,4.96,7.35,.7);scrollRoll(5.7,4.96,7.35);
    box(3.1,4.06,6.7,2.2,.03,1.75,m.ink);for(let j=0;j<8;j++)ball(2.3+(j%4)*.46,4.09,6.25+Math.floor(j/4)*.8,.035,m.gold);
    ring(3.1,5.8,7.59,.16,m.dark,true);beam([3.1,5.62,7.3],[3.1,5.65,7.36],.19,m.gold);
    runner(-3.1,4.96,6.5,.5,1.13);stack(-4.15,4.97,6.5,3);scrollRoll(-2.45,4.97,6.5);mug(-3.9,4.97,6.58);pot(-1.9,4.97,6.5,.42);
    // A low two-seat hobby island occupies the formerly bare west-central loft.
    rug(-4.5,4.005,1.9,4.4,3);table(-4.9,4,2.1,1.9,1.05);runner(-4.9,4.96,2.1,.5,1.07);stack(-5.4,4.96,2.1,2);mug(-4.6,4.96,2.1);chair(-6.25,4,2.1,-Math.PI/2);
    for(const z of [-5.3,4.9]){box(7.91,5.7,z,.1,1.35,1.75,m.honey);box(7.84,5.7,z,.025,1.15,1.55,m.paper);for(let k=0;k<5;k++)ball(7.81,5.4+(k%2)*.35,z-.55+k*.25,.09,k%2?m.artLilac:m.paper);}
    // Ropes visibly support high hanging planters; the lower private room stays available.
    for(const [x,y,z] of [[-7.5,2.65,7.3],[7.4,2.65,-5.7],[-7.5,6.5,5.7],[7.45,6.5,-4.9]]){pot(x,y,z,.6);for(const dx of [-.15,.15])beam([x+dx,y+.3,z],[x,y+.85,z],.012,m.dark);beam([x,y+.85,z],[x,y+1.05,z],.015,m.dark);vine(x,y+.65,z);}
    // Third pass: domestic vignettes sit inside the rooms, around a continuous central route.
    // The private x[-8,0], z[-8,0] floor remains entirely free below 1.2 m.
    const planks=[{p:[],n:[],uv:[],ix:[]},{p:[],n:[],uv:[],ix:[]}];
    function plank(x,y,z,w,h,d,tone){const dst=planks[tone],p=boxGeo.attributes.position,n=boxGeo.attributes.normal,uv=boxGeo.attributes.uv,offset=dst.p.length/3;for(let i=0;i<p.count;i++){dst.p.push(x+p.getX(i)*w,y+p.getY(i)*h,z+p.getZ(i)*d);dst.n.push(n.getX(i),n.getY(i),n.getZ(i));dst.uv.push(uv.getX(i),uv.getY(i));}for(let i=0;i<boxGeo.index.count;i++)dst.ix.push(offset+boxGeo.index.getX(i));}
    for(const [cx,cz,w,d,y] of [[4,-4,8,8,0],[0,4,16,8,0],[-1.45,0,13.1,16,4],[6.25,-4.5,2.3,7,4],[6.25,6.8,2.3,2.4,4]]){
      const n=Math.floor(w/.48);for(let j=0;j<n;j++)for(let k=0;k<Math.ceil(d/2);k++){
        const dd=Math.min(1.97,d-k*2-.02);if(dd>0)plank(cx-w/2+.26+j*.48,y+.003,cz-d/2+k*2+dd/2+.01,.46,.004,dd,(j+k)%3?0:1);
      }
    }
    planks.forEach((v,i)=>{const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(v.p,3));q.setAttribute('normal',new THREE.Float32BufferAttribute(v.n,3));q.setAttribute('uv',new THREE.Float32BufferAttribute(v.uv,2));q.setIndex(v.ix);mesh(q,i?m.floorShade:m.floorLight,0,0,0);});
    function cabinet(x,y,z,w,d,h=.9){
      soft(x,y+h/2,z,w,h,d,m.honey,.045,true);soft(x,y+h+.045,z,w+.08,.09,d+.08,m.floorLight,.04);
      const n=Math.max(2,Math.round(w/.65));for(let j=0;j<n;j++){
        const xx=x-w/2+(j+.5)*w/n;soft(xx,y+h*.51,z+d/2+.014,w/n-.08,h*.7,.045,m.paleWood,.02);
        ball(xx,y+h*.61,z+d/2+.06,.038,m.gold);
      }
    }
    function sofa(x,y,z,w=3.1,a=0){
      const start=g.children.length;
      soft(x,y+.4,z,w,.5,1.42,m.honey,.08,true);soft(x,y+.72,z-.05,w-.14,.27,1.28,m.linen,.12,true);
      soft(x,y+1.1,z+.58,w,.96,.28,m.linen,.12,true);
      for(const side of [-1,1]){soft(x+side*(w/2-.08),y+.94,z,.24,.62,1.45,m.lilac,.1,true);soft(x+side*w*.24,y+1.02,z+.25,.65,.55,.22,side<0?m.pink:m.lilac,.1);}
      for(let j=0;j<3;j++)soft(x-w*.3+j*w*.3,y+.88,z-.05,w*.28,.035,1.05,m.linen,.01);
      const parts=g.children.slice(start);if(a)parts.forEach(o=>{const dx=o.position.x-x,dz=o.position.z-z;o.position.set(x+dx*Math.cos(a)+dz*Math.sin(a),o.position.y,z-dx*Math.sin(a)+dz*Math.cos(a));o.rotation.y+=a;});
    }
    function stool(x,y,z,w=1,d=.85){soft(x,y+.37,z,w,.54,d,m.honey,.07,true);soft(x,y+.68,z,w+.04,.2,d+.04,m.lilac,.085,true);}
    function fern(x,y,z,s=1){
      mesh(new THREE.CylinderGeometry(.34*s,.26*s,.55*s,9),m.ceramic,x,y+.275*s,z,{solid:.55*s>.45});
      for(let j=0;j<9;j++){const a=j*2.4,rad=(.35+j%3*.12)*s,h=(.6+j%4*.13)*s;beam([x,y+.48*s,z],[x+Math.cos(a)*rad,y+h,z+Math.sin(a)*rad],.018*s,m.leaf);const leaf=ball(x+Math.cos(a)*rad*.8,y+h,z+Math.sin(a)*rad*.8,.24*s,m.leaf,.45+j%3*.17);leaf.scale.x=1+j%3*.23;leaf.rotation.z=a;}
    }
    // A family sitting room: conversation sofa, footstool, shared books and a tea table.
    sofa(-.95,0,5.05,2.8);table(-1.1,0,.85,1.5,.9);runner(-1.1,.955,.85,.5,.93);
    mug(-.65,.96,.8);stack(-1.57,.96,.75,3);jug(-1.1,.96,1,.7);stool(-1.3,0,3.6,1.1,.75);
    cabinet(-6.15,0,7.45,3,.65,.72);basket(-4.25,0,7.35,.85);fern(-2.7,0,7.3,.85);
    // Kitchen island and breakfast bench; the lane behind the dining table is 1.65 m wide.
    cabinet(4.6,0,-.4,1.6,1.5,1.02);runner(4.6,1.12,-.4,.6,1.5);jug(4.15,1.13,-.4,.85);mug(4.7,1.13,-.4);basket(5.05,1.13,-.4,.5);
    cabinet(7.45,0,-3.2,.7,2.4,1.1);stack(7.45,1.2,-3.7,2);jug(7.45,1.2,-2.65,.75);
    stool(.85,0,-3.35,.72,2.1);stool(4.95,0,-3.45,.72,1.7);basket(1,0,-6.85,.85);
    // Shoes, a folded throw, watering can and plants make the entrance a homecoming corner.
    cabinet(6.1,0,7.4,3.2,.85,.62);soft(5.7,.8,7.4,1.8,.22,.83,m.linen,.09);runner(5.5,.92,7.4,.5,.85);
    jug(7.2,.72,7.4,.8);fern(7.45,0,6.65,.7);chest(.95,0,7.45,.8);
    for(const x of [4.8,5.2]){soft(x,.16,6.96,.22,.26,.38,m.ink,.06);soft(x,.29,7.06,.22,.25,.2,m.ink,.06);}
    // A proper sleeping bay fills the west loft without taking the book-wall approach.
    soft(-5.65,4.44,-.8,3.2,.75,3.15,m.honey,.09,true);soft(-5.65,4.88,-.8,3.17,.25,3.1,m.linen,.12,true);
    soft(-5.65,5.05,-.37,3.2,.2,2.2,m.lilac,.1);soft(-5.65,5.05,-2.32,3.3,1.4,.2,m.honey,.07,true);
    for(const dx of [-.68,.68])soft(-5.65+dx,5.13,-1.87,1.1,.28,.7,m.linen,.12);
    soft(-5.65,5.2,.28,3.25,.1,.7,m.pink,.045);stool(-5.65,4,1.18,2.7,.65);
    cabinet(-3.55,4,-.85,1,.9,.82);mug(-3.55,4.92,-.85);stack(-3.55,4.92,-.6,2);basket(-3.5,4,.5,.8);
    cabinet(-6.1,4,4.25,3.3,.85,.9);jug(-5.4,5.0,4.25,.9);stack(-6.3,5,4.25,4);fern(-7.25,4,5.7,.85);
    // East library lounge: freestanding furniture leaves the stair landing cross-route open.
    sofa(3.05,4,-.05,3.1);table(3,4,-4.55,3.35,1.8);runner(3,4.956,-4.55,.6,1.83);
    stack(2.1,4.97,-4.55,4);mug(2.8,4.97,-4.5);jug(3.5,4.97,-4.6,.9);pot(4,4.97,-4.5,.6);
    stool(1.95,4,-6.2,1.25,.65);stool(4.1,4,-6.2,1.25,.65);fern(1.35,4,-.05,.7);
    cabinet(2.2,4,3.35,1.5,.45,1.05);basket(4.25,4,2.8,.85);fern(4.65,4,2.8,.8);
    // A low craft island and keepsake storage complement the desk rather than another owner's props.
    cabinet(-3.9,4,3.25,1.25,1.15,.75);stack(-3.9,4.85,3.25,4);basket(-3,4,1.15,.9);
    cabinet(-6.4,4,6.75,2.8,2.1,1.25);fern(-7.35,4,7.15,.75);jug(-5.65,5.35,6.75,.9);
    cabinet(6.45,4,-5.15,2.5,2.4,1.2);stack(6.45,5.3,-5.15,4);basket(6.45,4,-3.35,.8);
    // Tea for two stands clear of the host, gifts and the east-side stair approach.
    table(3.6,0,3.65,1.2,1.4);runner(3.6,.955,3.65,.5,1.43);mug(3.3,.96,3.65);jug(3.85,.96,3.65,.8);   // 移到入口走道右邊：一進門往前走不會撞到
    stool(3.4,0,4.7,.65,.6);fern(4.55,0,2.4,.58);fern(1.4,0,-5.7,.82);
    cabinet(.85,0,.7,.85,1.1,.8);basket(.85,.9,.7,.6);
    // The hall-side game table, folded linen and reading cabinets subdivide the loft.
    table(-1.1,4,1.1,1.5,1.8);runner(-1.1,4.956,1.1,.55,1.83);stack(-1.5,4.97,1.1,3);mug(-.6,4.97,1.1);
    chair(-1.35,4,2.9);basket(-1.5,4,-.4,.9);
    cabinet(-2.65,4,-4.25,1.45,1.2,1.1);stack(-2.65,5.19,-4.25,4);pot(-3.05,5.19,-4.25,.65);
    fern(-1.65,4,-7.5,.65);
    cabinet(.8,4,6.9,1.85,1.85,.85);soft(.8,5.0,6.9,1.65,.2,1.75,m.linen,.09);stack(.3,5.1,6.9,3);
    stool(4.85,4,5.4,1.05,1.2);basket(6,4,5.9,.85);fern(4.7,4,6.4,.8);
    cabinet(-7.25,4,-3.75,.75,2.5,1.5);basket(-7.15,4,-5.2,.8);
    cabinet(2.8,4,-6.9,2.5,.8,.68);soft(2.8,4.85,-6.9,2.3,.18,.75,m.lilac,.08);
    cabinet(-3.45,4,-.25,1.3,1.6,.82);basket(-3.45,4.92,-.25,.65);
    fern(1.9,0,1.3,.55);cabinet(4.65,0,-6.45,.65,.6,.82);jug(4.65,.92,-6.45,.75);
    cabinet(-.9,4,-3.95,1.15,1.3,.88);stack(-.9,4.98,-3.95,3);mug(-.65,4.98,-3.95);
    stool(2.1,4,-.95,1,.5);
    cabinet(-5.5,4,-2.85,2.7,.85,.9);basket(-6.1,5,-2.85,.6);stack(-4.8,5,-2.85,3);
    cabinet(-7.3,0,5.85,.6,1.1,.85);pot(-7.3,.94,5.85,.45);
    // A low upholstered footrest belongs to the tea corner; its top stays below the step limit.
    soft(1.2,.15,1.8,.7,.24,.6,m.honey,.045);soft(1.2,.34,1.8,.72,.14,.62,m.lilac,.06);
    cabinet(-1,4,-5,.45,.5,.9);jug(-1,4.99,-5,.7);
    fern(-6.4,4,-5.8,.9);fern(-7.15,4,3.2,.85);
    // Balcony planting is above the walking envelope; the two-metre circuit stays passable.
    for(const z of [-9.6,9.6])for(const x of [-6,-2.8,3.2,6.2])flowerBox(x,5.9,z,1.9,z<0?0:Math.PI);
    // 奶油波浪罩收住光，閱讀燈留在公共區椅旁。
    [[3.8,2.65,-4.7,3.76],[-5.5,6.65,-5.8,8.7883],[-2.3,7.3,4.5,10.4683],[6.6,6.6,.2,8.8216],[0,6.7,-9.1,7.6],[-4,2.65,-4,3.76]].forEach(p=>lamp(...p));
    floorLamp(1.03,1.94,-1.75);
    Object.assign(g.userData,{
      // 花茶便條牆聚焦，廚房雙層下燈與閱讀落地燈補任務光，我的房間維持固定高位燈槽。
      glow:[
        {kind:'cove',a:[-2.5,3.35,7.83],b:[-0.3,3.35,7.83],n:[0,-1],c:'#f4e6d0'},
        {kind:'under',a:[4.2,1.883,-7.72],b:[6.9,1.883,-7.72]},
        {kind:'kick',a:[1.1,0.1,-6.885],b:[6.4,0.1,-6.885],n:[0,1]},
        {kind:'under',a:[-7.45,0.863,2.3],b:[-5.75,0.863,2.3]},
        {kind:'cove',a:[-7.85,7.2,-3.85],b:[-7.85,7.2,-2.85],n:[1,0],c:'#f4e6d0'},
        {kind:'under',a:[-7.1,6.403,-0.9],b:[-7.1,6.403,1.3]},
        {kind:'cove',a:[-0.18,3.32,-6.3],b:[-0.18,3.32,-2],n:[-1,0],c:'#f4e6d0'},
        {kind:'under',a:[4.2,2.713,-7.72],b:[6.9,2.713,-7.72]},
        {kind:'spot',p:[3.8,3.45,-6.7],t:[4,2.3,-7.82],r:0.6},
        {kind:'spot',p:[-3.1,7.35,7.65],t:[-3.2,4.995,6.5],r:0.75}
      ],
      spawn:[2.6,0,6.2,Math.PI], exit:[2.6,7.6,.6], host:[.8,0,3.2,0], decor:{x:-4,y:0,z:-4},
      gifts:[[-.5,0,6.4,0],[3.5,0,1.5,0],[1.6,0,-.9,0],[-1.5,4,-2,0],[1.7,4,2.5,0]],
      lights:[[1.03,1.94,-1.75,'#ffd8ad',0.55,0.35],[3.8,2.65,-4.7,'#ffd8ad',1,0.5],[-5.4,4.92,-6.92,'#ffd8ad',0.6,0],[-2.3,7.3,4.5,'#ffd8ad',1.05,0.5],[6.6,6.6,0.2,'#ffd8ad',0.9,0.5],[-4,2.65,-4,'#ffd8ad',1,0.5]], sun:[.15,.7,1],
      spots:[
        {x:-4.3,y:0,z:2.35,r:1.1,kind:'look',label:'看看航路',name:'潮汐航路桌',lines:['這條空白航線，留給今天的腳步。','沿著海岸慢慢走，會遇到新的風景。','先認出自己在哪裡，再決定下一站吧。'],alone:['木桌上的小島地圖，夾著浪花書籤。','紅色虛線繞過海灣，停在尚未命名的小路。']},
        {x:3.1,y:0,z:-5.4,r:1.1,kind:'look',label:'泡杯花茶',name:'蜂蜜木小廚房',lines:['走了一圈，先喝點溫熱的花茶吧。','茶罐旁的便條，記著今天想完成的事。','小小的進步，也值得替自己慶祝。'],alone:['奶油色茶壺旁，排著曬乾的花瓣。','便條上畫了一顆星星，還留著一個空格。']},
        {x:-3.2,y:4,z:-6.85,r:1.1,kind:'look',label:'靠近爐火',name:'石砌壁爐與書牆',lines:['這個角落最適合把一天慢慢收好。','書牆上的每一格，都留著不同的好奇心。','聽見木柴聲，就知道可以休息一下了。'],alone:['石砌爐台泛著暖光，書脊映出蜂蜜色。','紫色軟椅旁，有一本還沒闔上的故事書。']},
        {x:-1.3,y:4,z:4.8,r:1.15,kind:'study',label:'翻翻手札',name:'尖拱窗下的潮汐手札',lines:['先回想今天學過的，再翻開手札吧。','不同科目的小線索，也可能在同一頁相遇。','把不懂的問題夾好，明天再來看看。'],alone:['手札攤在尖拱窗下，頁角壓著紫藤花。','書籤提醒你：先回想，再翻答案。']},
        {x:3.1,y:4,z:4.7,r:1.1,kind:'look',label:'看看星圖',name:'黃銅望遠鏡',lines:['白天先認方向，晚上再找星星。','望遠鏡旁的空白，留著今晚的新發現。','慢慢看，同一片天空也會有不同細節。'],alone:['黃銅鏡筒朝著尖拱窗外，腳架穩穩張開。','星圖上畫了一彎月亮，旁邊還沒有日期。']}
      ]
    });
    // house.mergeStatic preserves camThrough objects. Batch those static window faces here,
    // retaining the original materials, positions, normals, UVs and camera-through flag.
    g.updateMatrixWorld(true);
    for(const mat of [windowView,kit.glass()]) {
      const panes=g.children.filter(o=>o.isMesh&&o.userData.camThrough&&o.material===mat);
      if(panes.length<2)continue;
      const positions=[],normals=[],uvs=[],v=new THREE.Vector3(),n=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
      for(const pane of panes) {
        const q=pane.geometry,p=q.attributes.position,no=q.attributes.normal,uv=q.attributes.uv,ix=q.index;
        normalMatrix.getNormalMatrix(pane.matrixWorld);
        for(let i=0;i<(ix?ix.count:p.count);i++) {
          const k=ix?ix.getX(i):i;v.fromBufferAttribute(p,k).applyMatrix4(pane.matrixWorld);n.fromBufferAttribute(no,k).applyMatrix3(normalMatrix).normalize();
          positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);uvs.push(uv.getX(k),uv.getY(k));
        }
        g.remove(pane);
      }
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));q.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));q.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      const pane=mesh(q,mat,0,0,0,{camThrough:true});pane.name='batched-window-'+(mat===windowView?'scenery':'glass');pane.renderOrder=mat===windowView?0:1;
    }
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
