/* 潮汐小島 · 北海岸的潮洞（v9.1，Codex 製作）：TA.ISLE.INTERIORS['tidecave'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['tidecave'] = (THREE, kit) => {
    const g = new THREE.Group(); g.name = '北海岸潮洞・退潮的星光';
    const cols = [], M = {}, C = { rock:'#8e8b81', wet:'#526c69', seam:'#6d746c', sand:'#c9b994', shelf:'#a29c88', barnacle:'#e6d9be', shell:'#f1ddc1', star:'#df947d', weed:'#527f72', wood:'#8f7050', grain:'#624f40', brass:'#c3a365', sandstone:'#bdad91', shale:'#777d7a', fossil:'#e6d0a4', niche:'#666e70' };
    Object.keys(C).forEach(k => {
      const kind = k === 'wood' || k === 'grain' ? 'wood' : k === 'brass' ? 'metal' : k === 'weed' ? 'foliage' : 'stone';
      M[k] = kit.mat(C[k], { roughness:k === 'wet' ? .32 : k === 'sand' ? .5 : k === 'brass' ? .38 : .87, metalness:k === 'brass' ? .48 : 0, side:THREE.DoubleSide }, kind);
      M[k].name = 'tidecave:' + k;
    });
    function material(key, colour, opts, kind) { M[key] = kit.mat(colour, opts, kind); M[key].name = 'tidecave:' + key; return M[key]; }
    material('water', '#4caaa4', { transparent:true, opacity:.73, depthWrite:false, roughness:.16, side:THREE.DoubleSide }, 'glass');
    material('blue', '#164c83', { transparent:true, opacity:.84, depthWrite:false, roughness:.18, emissive:new THREE.Color('#104e85'), emissiveIntensity:.32, side:THREE.DoubleSide }, 'glass');
    material('glow', '#a0f7ec', { emissive:new THREE.Color('#62e6e5'), emissiveIntensity:2.2, roughness:.4 }, 'stone');
    material('violet', '#c2b2e1', { emissive:new THREE.Color('#8272c2'), emissiveIntensity:.38, roughness:.29 }, 'stone');
    material('quartz', '#eee6ed', { emissive:new THREE.Color('#b6b0d5'), emissiveIntensity:.24, roughness:.23 }, 'stone');
    material('beam', '#fff3d3', { transparent:true, opacity:.025, depthWrite:false, blending:THREE.AdditiveBlending, emissive:new THREE.Color('#ffe7b1'), emissiveIntensity:.8, side:THREE.DoubleSide }, 'glass');
    material('ripple', '#9dd7cc', { transparent:true, opacity:.25, depthWrite:false, roughness:.3, side:THREE.DoubleSide }, 'glass');
    material('daylight', '#e4f1f5', { emissive:new THREE.Color('#d3e6ed'), emissiveIntensity:.7, roughness:1, side:THREE.DoubleSide }, 'glass');
    const cube = new THREE.BoxGeometry(1, 1, 1), orb = new THREE.SphereGeometry(1, 8, 5);
    let seed = 91027;
    function rnd() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
    function mesh(geo, m, x=0, y=0, z=0, solid=false) {
      const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = !m.transparent; o.receiveShadow = true;
      if (solid) o.userData.solid = true; g.add(o); return o;
    }
    function box(x, y, z, w, h, d, m, solid=false) { const o=mesh(cube,m,x,y,z,solid); o.scale.set(w,h,d); return o; }
    function ball(x, y, z, sx, sy, sz, m) { const o=mesh(orb,m,x,y,z); o.scale.set(sx,sy,sz); return o; }
    function through(o) { o.userData.camThrough=true; return o; }
    function geometry(vertices, indices) {
      const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      if (indices) geo.setIndex(indices); geo.computeVertexNormals(); return geo;
    }
    function beam(a, b, r, m) {
      const A=new THREE.Vector3(...a), B=new THREE.Vector3(...b), d=B.clone().sub(A);
      const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),6),m,...A.add(B).multiplyScalar(.5).toArray());
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()); return o;
    }
    function tube(points, radius, m) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),points.length*2,radius,5,false),m); }
    function walk(geo, x=0, y=0, z=0, name='floor') {
      const o=mesh(geo,M.sand,x,y,z); o.visible=false; o.name='tidecave:walk:'+name;
      o.userData={ walk:true, prop:true, camThrough:true }; return o;
    }
    const outline=[[-5.8,-7],[-3,-7.2],[2.9,-7.2],[5.7,-6.7],[7,-4.8],[7.2,-1],[6.9,2],[5.4,3.8],[1.1,4],[1.1,8],[-1.1,8],[-1.1,4],[-5.4,3.8],[-6.9,2],[-7.15,-1],[-7,-4.7]];
    const pools=[{x:4.5,z:-1,rx:1.35,rz:1.05,glow:true},{x:-3,z:1.1,rx:1.1,rz:.8},{x:2.65,z:-4.9,rx:.85,rz:.65}];
    const floorShape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,-z)));
    for (const p of pools) {
      const hole=new THREE.Path(); hole.absellipse(p.x,-p.z,p.rx,p.rz,0,Math.PI*2,true); floorShape.holes.push(hole);
    }
    const floorGeo=new THREE.ShapeGeometry(floorShape,40); floorGeo.rotateX(-Math.PI/2);
    mesh(floorGeo,M.sand).name='tidecave:wet-sand'; walk(floorGeo.clone());
    function roofY(x,z) { return 4.62+.65*Math.max(0,1-x*x/57)*Math.max(0,1-(z+1.5)*(z+1.5)/37)+.07*Math.sin(x*2.1+z*1.7)+.065*Math.sin(x*4.3)*Math.cos(z*3.7); }
    function rough(x,y,z) { return Math.sin(x*3.7+y*5.3+z*2.9)*.055+Math.sin(x*8.1-z*5.7+y*2.3)*.025; }
    for (let k=0;k<outline.length;k++) {
      const a=outline[k], b=outline[(k+1)%outline.length];
      if (a[1]>=4 && b[1]>=4) continue;
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.ceil(length/.55), nx=-(b[1]-a[1])/length, nz=(b[0]-a[0])/length;
      const row=[-.24,.35,.86,1.04,1.2,1.34,2.1,3.2,4.15,4.65];
      for (let j=0;j<n;j++) {
        const x0=a[0]+(b[0]-a[0])*j/n, z0=a[1]+(b[1]-a[1])*j/n, x1=a[0]+(b[0]-a[0])*(j+1)/n, z1=a[1]+(b[1]-a[1])*(j+1)/n;
        cols.push([Math.min(x0,x1)-.18,-.4,Math.min(z0,z1)-.18,Math.max(x0,x1)+.18,4.7,Math.max(z0,z1)+.18]);
        for (let r=0;r<row.length-1;r++) {
          const v=[];
          for (const [x,z,y0] of [[x0,z0,row[r]],[x1,z1,row[r]],[x0,z0,row[r+1]],[x1,z1,row[r+1]]]) {
            const y=y0===4.65 ? roofY(x,z)+.13 : y0, inward=Math.max(0,y-2.8)*.2+rough(x,y,z)*1.5+.07*Math.sin(z*2+x*1.8+y*2.2);
            v.push(x+nx*inward,y+rough(x,0,z)*.5,z+nz*inward);
          }
          mesh(geometry(v,[0,2,1,1,2,3]),r<3?M.wet:r<5?M.seam:M.rock);
        }
        if (j%2===0) for (let q=0;q<3;q++) {
          const t=(q+.3)/3, x=x0+(x1-x0)*t+nx*.095, z=z0+(z1-z0)*t+nz*.095;
          const o=mesh(new THREE.ConeGeometry(.035+rnd()*.025,.055,5,1,true),M.barnacle,x,1.08+rnd()*.15,z);
          o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(nx,.12,nz).normalize());
        }
      }
    }
    const ceilingP=[], ceilingI=[];
    for (let ring=0;ring<=18;ring++) for (let j=0;j<=64;j++) {
      const a=(j%64)*Math.PI/32,dx=Math.cos(a),dz=Math.sin(a),inner=1/Math.hypot(dx/.64,dz/.56)*(1+.055*Math.sin(a*7)+.025*Math.cos(a*11));
      const outer=Math.min(dx>1e-6?5.5/dx:dx<-1e-6?-9.5/dx:1e5,dz>1e-6?6.5/dz:dz<-1e-6?-5.5/dz:1e5),r=inner+(outer-inner)*ring/18;
      const x=2+dx*r,z=-2+dz*r;ceilingP.push(x,roofY(x,z),z);
    }
    for (let ring=0;ring<18;ring++) for (let j=0;j<64;j++) {
      const a=ring*65+j;ceilingI.push(a,a+1,a+65,a+1,a+66,a+65);
    }
    mesh(geometry(ceilingP,ceilingI),M.rock).name='tidecave:ceiling';
    const lip=[],lipI=[];
    for(let j=0;j<=64;j++){
      const a=(j%64)*Math.PI/32,r=1+.055*Math.sin(a*7)+.025*Math.cos(a*11),x=2+Math.cos(a)*.64*r,z=-2+Math.sin(a)*.56*r;
      lip.push(x,roofY(x,z),z,x+.05*Math.cos(a),5.78,z+.05*Math.sin(a));if(j<64){const k=j*2;lipI.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    mesh(geometry(lip,lipI),M.rock);const sky=through(mesh(new THREE.CircleGeometry(.85,48),M.daylight,2,5.84,-2));sky.rotation.x=Math.PI/2;
    const arch=[[-1.1,-.12],[-1.14,1.25],[-1.1,2.05],[-.88,2.6],[-.48,2.94],[0,3.05],[.48,2.94],[.88,2.6],[1.1,2.05],[1.14,1.25],[1.1,-.12]];
    for (let z=4;z<8;z+=.5) for (let j=0;j<arch.length-1;j++) {
      const v=[]; for (const [x,y,zz] of [[...arch[j],z],[...arch[j+1],z],[...arch[j],z+.5],[...arch[j+1],z+.5]]) v.push(x+rough(x,y,zz)*.3,y+rough(x,y,zz)*.4,zz);
      mesh(geometry(v,[0,1,2,1,3,2]),j===0||j===9?M.wet:M.rock);
    }
    for (const x of [-1.4,1.4]) box(x,1.5,6,.6,3.4,4,M.rock,true).visible=false;
    cols.push([-1.8,-.3,8.15,1.8,3.5,8.5]);
    for (const x of [-1.08,1.08]) for (let z=4.2;z<8;z+=.25) ball(x,1.1+rnd()*.1,z,.035,.025,.045,M.barnacle);
    const stoneGeo=new THREE.IcosahedronGeometry(1,1), rp=stoneGeo.attributes.position;
    for (let j=0;j<rp.count;j++) {
      const x=rp.getX(j),y=rp.getY(j),z=rp.getZ(j),f=1+rough(x*2,y*2,z*2)*1.5; rp.setXYZ(j,x*f,y*f,z*f);
    }
    stoneGeo.computeVertexNormals();
    function rock(x,y,z,sx,sy,sz,m=M.rock,solid=false) { const o=mesh(stoneGeo,m,x,y,z,solid); o.scale.set(sx,sy,sz); o.rotation.y=rnd()*6.28; return o; }
    for (const [x,z,sx,sz] of [[-5,2.25,1.2,.7],[1.1,1.35,1,.6],[5.65,-3,.65,.9],[-.7,-3.5,.8,.5],[-5.5,-2,.65,.55]]) rock(x,-.045,z,sx,.08,sz,M.shelf);
    for (const [x,z,sx,sy,sz] of [[6.05,2.15,.7,.7,.65],[-6.1,2.65,.6,.6,.6],[6.1,-6,.6,.6,.55],[-6.4,-3.9,.5,.8,.55]]) rock(x,sy*.62,z,sx,sy,sz,M.rock,true);
    const ledgeOutline=[[-5.8,-7],[-2.2,-7],[-2,-6.75],[-2,-4.75],[-2.2,-4.5],[-5.7,-4.5],[-6,-4.8],[-6,-6.7]];
    const ledgeShape=new THREE.Shape(ledgeOutline.map(([x,z])=>new THREE.Vector2(x,-z))),ledgeGeo=new THREE.ShapeGeometry(ledgeShape);ledgeGeo.rotateX(-Math.PI/2);
    mesh(ledgeGeo,M.shelf,0,.6).name='tidecave:ledge-top';walk(ledgeGeo.clone(),0,.6,0,'ledge');
    for(let j=0;j<ledgeOutline.length;j++){
      const a=ledgeOutline[j],b=ledgeOutline[(j+1)%ledgeOutline.length];
      mesh(geometry([a[0],-.25,a[1],b[0],-.25,b[1],a[0],.6,a[1],b[0],.6,b[1]],[0,1,2,1,3,2]),M.rock);
    }
    cols.push([-6,-.25,-7,-2,.6,-4.5]);
    const rampP=[-4,0,-2.1,-2.2,0,-2.1,-4,.6,-4.5,-2.2,.6,-4.5], rampI=[0,1,2,1,3,2];
    mesh(geometry(rampP,rampI),M.shelf).name='tidecave:ramp'; walk(geometry(rampP,rampI),0,0,0,'ramp');
    mesh(geometry([-4,-.04,-2.1,-4,.6,-4.5,-4,-.04,-4.5,-2.2,-.04,-2.1,-2.2,-.04,-4.5,-2.2,.6,-4.5],[0,1,2,3,4,5]),M.rock);
    for (let j=0;j<7;j++) { const z=-4.6-j*.32; rock(-5.9,.2,z,.25,.37,.29); }
    function oval(x,y,z,rx,rz,m) { const o=mesh(new THREE.CircleGeometry(1,48),m,x,y,z); o.rotation.x=-Math.PI/2; o.scale.set(rx,rz,1); return o; }
    for (let pindex=0;pindex<pools.length;pindex++) {
      const p=pools[pindex];
      oval(p.x,-.26,p.z,p.rx*1.02,p.rz*1.02,p.glow?M.niche:M.wet);
      const water=through(oval(p.x,-.065,p.z,p.rx,p.rz,p.glow?M.blue:M.water)); water.name='tidecave:pool:'+pindex; water.renderOrder=1;
      cols.push([p.x-p.rx,-.4,p.z-p.rz,p.x+p.rx,.8,p.z+p.rz]);
      for (let j=0;j<24;j++) {
        const a=j*Math.PI/12, x=p.x+Math.cos(a)*(p.rx+.08),z=p.z+Math.sin(a)*(p.rz+.08);
        rock(x,.005,z,.16+rnd()*.055,.07+rnd()*.035,.13+rnd()*.04,j%4?M.wet:M.shelf);
      }
      for (let j=0;j<3;j++) {
        const geo=new THREE.TorusGeometry(.2+j*.16,.008,3,28); geo.rotateX(Math.PI/2);
        const o=through(mesh(geo,M.ripple,p.x+.14,-.057,p.z+.1)); o.scale.z=.65; o.renderOrder=2;
      }
      if (p.glow) for (let j=0;j<100;j++) {
        const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*.91,s=.012+rnd()*.015;
        through(ball(p.x+Math.cos(a)*p.rx*r,-.048+rnd()*.012,p.z+Math.sin(a)*p.rz*r,s,s*.45,s,M.glow));
      }
      for (let j=0;j<5;j++) {
        const a=3.6+j*.16,x=p.x+Math.cos(a)*(p.rx+.05),z=p.z+Math.sin(a)*(p.rz+.05),h=.22+rnd()*.24;
        tube([[x,.02,z],[x+.05,h*.55,z-.03],[x-.025,h,z+.025]],.018,M.weed);
      }
    }
    for (const [x,z,h,r] of [[-5.8,-2.8,1.1,.27],[6.1,.7,.85,.23],[5.8,-4,.75,.22],[-5.5,-6.6,.6,.18]]) {
      const y=x<-5&&z<-6?.6:0;
      mesh(new THREE.ConeGeometry(r,h,7,3),M.rock,x,y+h/2,z,true); rock(x,y+.07,z,r*1.4,.12,r*1.3,M.wet);
    }
    for (const [x,z,h,r] of [[-5.9,1.4,.8,.22],[-4.5,-4.8,.7,.23],[.3,-6.4,.6,.18],[5.9,-2.8,.9,.25],[3.7,2.5,.75,.22],[-2.6,2.9,.7,.2],[1,-.6,.65,.17],[-6,-4.9,.8,.24],[5.7,-5.8,.6,.2]]) {
      const o=mesh(new THREE.ConeGeometry(r,h,7,3),M.rock,x,roofY(x,z)-h/2+.05,z); o.rotation.z=Math.PI;
      rock(x,roofY(x,z)-.04,z,r*1.5,.14,r*1.25);
    }
    rock(-6.65,.8,0,.53,.85,.92,M.niche,true);
    rock(-6.4,.52,0,.63,.16,.74,M.shelf);
    for (let j=0;j<11;j++) {
      const x=-6.48+rnd()*.46,z=-.55+rnd()*1.1,h=.45+rnd()*.78,r=.09+rnd()*.065,m=j%3?M.violet:M.quartz;
      const crystal=new THREE.Group(); crystal.position.set(x,.57,z); crystal.rotation.set((rnd()-.5)*.45,0,(rnd()-.5)*.65); g.add(crystal);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h*.72,6),m); stem.position.y=h*.36; crystal.add(stem);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(r,h*.28,6),m); tip.position.y=h*.86; crystal.add(tip);
    }
    cols.push([-7.05,0,-.95,-5.96,2.1,.95]);
    for (let j=0;j<12;j++) {
      const y=.12+j*.29, points=[];
      for (let k=0;k<=16;k++) {
        const x=-1.95+k*3.9/16,wave=.025*Math.sin(x*2.3)+.013*Math.cos(x*5);
        points.push(x,y+wave,-6.86+.025*Math.sin(x*3),x,y+.285+wave,-6.86+.025*Math.sin(x*3));
      }
      const ix=[]; for (let k=0;k<16;k++) { const a=k*2; ix.push(a,a+2,a+1,a+1,a+2,a+3); }
      mesh(geometry(points,ix),j%2?M.shale:M.sandstone);
    }
    cols.push([-2.05,-.2,-7.3,2.05,3.7,-6.83]);
    oval(5,.008,-5.5,.87,.68,M.sand);
    const spiral=[];
    for (let j=0;j<=100;j++) { const a=j*.16,r=.025+j*.0045; spiral.push([5+Math.cos(a)*r,.035,-5.5+Math.sin(a)*r*.86]); }
    tube(spiral,.038,M.fossil);
    for (let j=28;j<100;j+=3) {
      const a=j*.16,r=.025+j*.0045; beam([5+Math.cos(a)*(r-.04),.057,-5.5+Math.sin(a)*(r-.04)*.86],[5+Math.cos(a)*(r+.045),.057,-5.5+Math.sin(a)*(r+.045)*.86],.013,M.sandstone);
    }
    rock(5.38,-.005,-5.43,.3,.044,.26,M.sand); rock(4.55,.015,-5.8,.15,.07,.12,M.wet);
    cols.push([4.35,-.2,-6.15,5.7,.6,-4.9]);
    const cx=-4.5,cz=-6;
    box(cx,.91,cz,1.4,.62,.8,M.wood,true);
    for (let j=0;j<4;j++) for (const z of [cz-.405,cz+.405]) box(cx,.67+j*.15,z,1.36,.014,.012,M.grain);
    for (const dx of [-.64,.64]) box(cx+dx,.92,cz,.055,.58,.84,M.grain);
    const lid=[],lidI=[];
    for (let j=0;j<=12;j++) { const a=j*Math.PI/12; for (const dx of [-.7,.7]) lid.push(cx+dx,1.22+Math.sin(a)*.26,cz+Math.cos(a)*.4); }
    for (let j=0;j<12;j++) { const a=j*2; lidI.push(a,a+1,a+2,a+1,a+3,a+2); }
    mesh(geometry(lid,lidI),M.wood);
    for (const dx of [-.71,.71]) {
      const v=[cx+dx,1.22,cz]; for(let j=0;j<=12;j++){const a=j*Math.PI/12;v.push(cx+dx,1.22+Math.sin(a)*.26,cz+Math.cos(a)*.4);}
      const ix=[];for(let j=1;j<=12;j++)ix.push(0,j,j+1);mesh(geometry(v,ix),M.wood);
    }
    for (const dx of [-.48,.48]) {
      for (const z of [cz-.411,cz+.411]) box(cx+dx,.92,z,.065,.62,.025,M.brass);
      const pts=[]; for (let j=0;j<=12;j++){const a=j*Math.PI/12;pts.push([cx+dx,1.23+Math.sin(a)*.268,cz+Math.cos(a)*.412]);} tube(pts,.033,M.brass);
    }
    for (const dx of [-.64,.64]) for (const dz of [-.35,.35]) for (const y of [.65,1.18]) box(cx+dx,y,cz+dz,.14,.11,.14,M.brass);
    box(cx,1.13,cz+.424,.18,.24,.035,M.brass); ball(cx,1.12,cz+.445,.025,.035,.014,M.grain);
    cols.push([cx-.73,.6,cz-.44,cx+.73,1.5,cz+.46]);
    for (const [x,z,s] of [[-4.9,2.15,.18],[3.8,-.25,.14],[5.62,-3.05,.17]]) {
      const v=[x,.105,z]; for (let j=0;j<10;j++){const a=j*Math.PI/5,r=j%2?s*.42:s;v.push(x+Math.sin(a)*r,.072,z+Math.cos(a)*r);}
      const ix=[];for(let j=1;j<=10;j++)ix.push(0,j,j===10?1:j+1);mesh(geometry(v,ix),M.star);
      ball(x,.11,z,.035,.015,.035,M.shell);
    }
    for (const [x,z] of [[-4.6,2.3],[1.3,1.38],[5.55,-3.3],[-.8,-3.4]]) {
      const o=mesh(new THREE.SphereGeometry(.105,10,5,0,Math.PI),M.shell,x,.067,z);o.scale.set(1,.4,.9);o.rotation.y=rnd()*6.28;
      for(let j=0;j<5;j++){const a=(j-2)*.27;beam([x,.09,z-.045],[x+Math.sin(a)*.08,.09,z+.065],.006,M.sandstone);}
    }
    beam([-5.45,.16,3.02],[-3.9,.11,2.8],.095,M.wood); beam([-4.8,.13,2.93],[-4.55,.19,2.58],.042,M.wood);
    cols.push([-5.56,-.1,2.69,-3.79,.55,3.16]);
    for (let j=0;j<3;j++) {
      const o=through(mesh(new THREE.CylinderGeometry(.45+j*.08,.9+j*.12,4.85,32,1,true),M.beam,2,2.7,-2)); o.name='tidecave:sunshaft:'+j; o.renderOrder=3;
    }
    for (let j=0;j<26;j++) {const a=rnd()*6.28,r=rnd()*.55;through(ball(2+Math.cos(a)*r,.3+rnd()*4.4,-2+Math.sin(a)*r,.012,.012,.012,M.quartz));}
    function spot(topic,label,name,x,y,z,lines,alone) { return {x,y,z,r:1.2,kind:'hook:cave',topic,label,name,lines,alone}; }
    Object.assign(g.userData, {
      spawn:[0,0,6.1,Math.PI],exit:[0,7.6,.8],indoor:true,bg:'#1b2326',bounce:1.1,sun:[.1,1,.2],cols,
      lights:[[2,4.45,-2,'#ffe4af',1.1,.25],[4.5,.8,-1,'#7cddd8',.85,.25],[-6,1.8,0,'#c8b6ed',.65,.2],[0,2.25,6.9,'#d6eaff',1.05,0],[-4.1,2.9,-5.6,'#ffe2b6',.45,.15]],
      spots:[
        spot('wall','看岩層','岩層壁',0,0,-5.75,['一層深色一層淺色，都是海的日記。','把時間放慢，就能讀懂石頭的故事。','浪花走了好遠，還把回憶留在這裡。'],['岩層像疊好的被子，安靜等你翻閱。','指尖停在石紋前，聽見很遠的潮聲。']),
        spot('pool','看潮池','發光潮池',4.5,0,1.1,['小小藍光聚在水裡，像星星來度假。','輕輕蹲下看，別驚動這一池的晚安。','海把夜空藏在這裡，退潮才借你看。'],['水面亮著細細星點，心也跟著柔軟。','不必帶走星光，陪它安靜坐一會兒。']),
        spot('vein','敲礦脈','水晶礦脈',-5.1,0,0,['淡紫色晶面閃一下，像偷偷說你好。','輕敲之前先聽聽，石頭也有小脾氣。','這一點溫柔的光，藏過好多次潮汐。'],['晶尖映著潮池的光，像一束小花。','掌心留著暖意，洞裡的風慢慢走過。']),
        spot('fossil','挖化石','沙中化石',5,0,-4,['小小螺旋睡在沙裡，做了很長的夢。','慢慢撥開一點沙，讓往日露出笑容。','很久以前的海，也喜歡這座小島呢。'],['沙粒抱著螺旋紋，像替回憶蓋被子。','先把腳步放輕，別吵醒古老的小夢。']),
        spot('chest','打開寶箱','舊木箱',-4.5,.6,-4.95,['木箱帶著海鹽香，等下一個好奇心。','黃銅角磨得亮亮的，像收著小太陽。','也許最好的寶物，就是一起來探險。'],['箱蓋還留著浪痕，像一封未拆的信。','站在暖暖的石台上，聽木頭輕輕響。'])
      ]
    });
    g.updateMatrixWorld(true);
    const buckets=new Map(),old=[],V=new THREE.Vector3(),normal=new THREE.Matrix3();
    g.traverse(o=>{
      if(!o.isMesh||!o.visible||o.userData.walk||o.userData.prop)return;
      if(o.userData.solid){const b=new THREE.Box3().setFromObject(o);cols.push([...b.min.toArray(),...b.max.toArray()]);}
      if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(o);old.push(o);
    });
    buckets.forEach((parts,m)=>{
      const P=[],N=[],UV=[]; const camThrough=parts.every(o=>o.userData.camThrough),order=Math.max(...parts.map(o=>o.renderOrder));
      for(const o of parts){
        const geo=o.geometry,p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,ix=geo.index;normal.getNormalMatrix(o.matrixWorld);
        for(let j=0,count=ix?ix.count:p.count;j<count;j++){
          const k=ix?ix.getX(j):j;V.fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld);P.push(V.x,V.y,V.z);
          V.fromBufferAttribute(n,k).applyMatrix3(normal).normalize();N.push(V.x,V.y,V.z);UV.push(uv?uv.getX(k):0,uv?uv.getY(k):0);
        }
      }
      const geo=geometry(P);geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));
      const o=mesh(geo,m);o.name='tidecave:merged:'+m.name.slice(9);if(camThrough)o.userData.camThrough=true;o.renderOrder=order; // 靜態零件依材質合併。
    });
    const used=new Set(old.map(o=>o.geometry));old.forEach(o=>o.removeFromParent());
    g.traverse(o=>{if(o.isMesh)used.delete(o.geometry);});used.forEach(geo=>geo.dispose());
    for(const o of [...g.children])if(o.isGroup&&o.children.length===0)g.remove(o);
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
