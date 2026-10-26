/* chinese | procedural low-poly reference reconstruction; +Z front, meters. */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['home_chinese'] = function (THREE, kit) {
const g = new THREE.Group(); g.name = 'home-chinese';
    const M = {
      plaster: kit.mat('#f3efe6', { roughness: 0.92, metalness: 0 }, 'stone'),
      stone: kit.mat('#c8c3b4', { roughness: 0.95, metalness: 0 }, 'stone'),
      stoneShade: kit.mat('#9b9c91', { roughness: 0.95, metalness: 0 }, 'stone'),
      oak: kit.mat('#4a3a32', { roughness: 0.86, metalness: 0 }, 'wall'),
      honey: kit.mat('#79614b', { roughness: 0.84, metalness: 0 }, 'wall'),
      dark: kit.mat('#2d2f35', { roughness: 0.9, metalness: 0 }, 'wall'),
      roof: kit.mat('#3d4a6b', { roughness: 0.8, metalness: 0 }, 'roof'),
      roofShade: kit.mat('#53617d', { roughness: 0.82, metalness: 0 }, 'roof'),
      gold: kit.mat('#b99a61', { roughness: 0.4, metalness: 0.65 }),
      leaf: kit.mat('#647b4f', { roughness: 0.93, metalness: 0 }),
      leafLight: kit.mat('#94a773', { roughness: 0.93, metalness: 0 }),
      pink: kit.mat('#e3a0b9', { roughness: 0.88, metalness: 0 }),
      lavender: kit.mat('#ac88c5', { roughness: 0.9, metalness: 0 }),
      cream: kit.mat('#fff0cf', { roughness: 0.9, metalness: 0 }),
      water: kit.mat('#90cdd1', { roughness: 0.24, metalness: 0 }),
      glass: kit.win(),
    };
    // All primitives are merged only within their named assembly and shared material.
    // UVs remain intact for the game's kit stone / wood / roof finish.
    const batches = new Map(); let part = 'foundation';
    function add(geo, mat) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const flat = geo.toNonIndexed(); geo.dispose(); geo = flat; }
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      const key = part + ':' + mat.uuid;
      if (!batches.has(key)) batches.set(key, { part, mat, geos: [] });
      batches.get(key).geos.push(geo);
    }
    function place(geo, mat, x, y, z, rx=0, ry=0, rz=0) {
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
      add(geo,mat);
    }
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0) { place(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz); }
    function beam(a,b,r,m,r2=r,n=6) {
      const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);
      const geo=new THREE.CylinderGeometry(r2,r,v.length(),n,1);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));
      geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(geo,m);
    }
    function sphere(x,y,z,r,m,sx=1,sy=1,sz=1,n=7) {
      const geo=new THREE.SphereGeometry(r,n,4);geo.scale(sx,sy,sz);geo.translate(x,y,z);add(geo,m);
    }
    function tube(pts,r,m,n=14) { add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v))),n,r,5,false),m); }
    function profile(points,depth,x,y,z,m,ry=0,bevel=.008) {
      const s=new THREE.Shape(points.map(v=>new THREE.Vector2(...v)));
      place(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1,curveSegments:4}),m,x,y,z,0,ry);
    }
    function panel(x,y,z,w,h,d,m,ry=0) {
      const r=Math.min(.035,w*.1,h*.1),s=new THREE.Shape();
      s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
      place(new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,steps:1,curveSegments:2}),m,x,y,z-d/2,0,ry);
    }
    function slab(a,b,c,d,th,m) {
      let v=[a,b,c,d];const normal=new THREE.Vector3().crossVectors(new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
      if(normal.y<0)v=[a,d,c,b];
      const P=[...v,...v.map(p=>[p[0],p[1]-th,p[2]])],out=[],uv=[];
      for(const ids of [[0,1,2,3],[7,6,5,4],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]) {
        for(const j of [0,1,2,0,2,3]){const p=P[ids[j]];out.push(...p);uv.push(p[0]+p[2],p[1]+p[2]);}
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();add(geo,m);
    }
    function W(x,y,z,u,v,o,ry=0){return [x+u*Math.cos(ry)+o*Math.sin(ry),y+v,z-u*Math.sin(ry)+o*Math.cos(ry)];}
    function prism(top,th,m){
      const ab=new THREE.Vector3(...top[1]).sub(new THREE.Vector3(...top[0])),ac=new THREE.Vector3(...top[2]).sub(new THREE.Vector3(...top[0]));
      if(new THREE.Vector3().crossVectors(ab,ac).y<0)top=top.slice().reverse();
      const center=top.reduce((a,b)=>a.map((v,i)=>v+b[i]/top.length),[0,0,0]),lower=top.map(v=>[v[0],v[1]-th,v[2]]),bottom=[center[0],center[1]-th,center[2]],P=[],U=[];
      function tri(a,b,c){for(const v of [a,b,c]){P.push(...v);U.push(v[0]+v[2],v[1]+v[2]);}}
      for(let i=0;i<top.length;i++){const j=(i+1)%top.length;tri(center,top[i],top[j]);tri(bottom,lower[j],lower[i]);tri(top[i],lower[i],lower[j]);tri(top[i],lower[j],top[j]);}
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(P,3));q.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));q.computeVertexNormals();add(q,m);
    }
    function localBox(x,y,z,u,v,o,w,h,d,m,ry=0){box(...W(x,y,z,u,v,o,ry),w,h,d,m,0,ry);}
    function pointed(w,h){
      const a=w/2;return [[-a,0],[a,0],[a,h*.57],[a*.86,h*.75],[a*.48,h*.91],[0,h],[-a*.48,h*.91],[-a*.86,h*.75],[-a,h*.57]];
    }
    function archWindow(x,y,z,w,h,ry=0) {
      profile(pointed(w+.16,h+.13),.05,x,y-.04,z,M.dark,ry);
      profile(pointed(w+.075,h+.065),.065,x,y-.012,z+.001*Math.cos(ry),M.honey,ry);
      const q=W(x,y,z,0,.04,.075,ry);profile(pointed(w-.10,h-.09),.025,...q,M.glass,ry);
      const frame=pointed(w,h);
      for(let i=0;i<frame.length;i++)beam(W(x,y,z,...frame[i],.13,ry),W(x,y,z,...frame[(i+1)%frame.length],.13,ry),.026,M.oak,.026,5);
      beam(W(x,y,z,0,.08,.14,ry),W(x,y,z,0,h-.06,.14,ry),.018,M.honey,.018,5);
      for(const v of [h*.30,h*.58])localBox(x,y,z,0,v,.14,w-.08,.035,.035,M.honey,ry);
      localBox(x,y,z,0,-.04,.13,w+.22,.09,.24,M.stone,ry);
    }
    function rectWindow(x,y,z,w,h,ry=0) {
      localBox(x,y,z,0,0,0,w+.16,h+.15,.07,M.dark,ry);
      localBox(x,y,z,0,0,.05,w-.03,h-.03,.04,M.glass,ry);
      for(const u of [-w/2,w/2])localBox(x,y,z,u,0,.10,.075,h+.16,.10,M.oak,ry);
      for(const v of [-h/2,h/2])localBox(x,y,z,0,v,.10,w+.14,.08,.11,M.honey,ry);
      localBox(x,y,z,0,0,.13,.03,h,.04,M.oak,ry);
      for(const v of [-h*.19,h*.19])localBox(x,y,z,0,v,.13,w,.03,.04,M.oak,ry);
      localBox(x,y,z,0,-h/2-.07,.10,w+.25,.09,.27,M.stone,ry);
    }
    function flower(x,y,z,size=.065,color=M.pink) {
      sphere(x,y-.035,z,size*1.6,M.leaf,1.4,.45,1.1,6);
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5;sphere(x+Math.cos(a)*size*.65,y,z+Math.sin(a)*size*.65,size*.63,color,1,.65,1,5);}
      sphere(x,y+.026,z,size*.34,M.cream,1,.7,1,5);
    }
    function planter(x,y,z,w,ry=0) {
      const old=part;part='flowerboxes';
      localBox(x,y,z,0,0,0,w,.20,.25,M.oak,ry);localBox(x,y,z,0,.10,0,w+.06,.055,.29,M.honey,ry);
      for(const u of [-w*.38,w*.38])localBox(x,y,z,u,0,.14,.045,.23,.035,M.gold,ry);
      for(let j=0;j<7;j++){const p=W(x,y,z,-w*.40+j*w*.8/6,.18+Math.sin(j*1.8)*.02,.015+Math.cos(j)*.035,ry);flower(...p,.055,j%3===0?M.pink:j%3===1?M.lavender:M.cream);}
      part=old;
    }
    function vine(x,y,z,length=.95,width=.60) {
      const old=part;part='wisteria';
      tube([[x-width*.5,y-.15,z],[x-width*.25,y+.06,z],[x+width*.2,y+.08,z],[x+width*.5,y-.12,z]],.022,M.oak);
      for(let j=0;j<7;j++){
        const xx=x-width*.47+j*width*.94/6,zz=z+Math.sin(j*2)*.05,len=length*(.68+.30*Math.sin(j*2.4+1)**2);
        sphere(xx,y+.01,zz,.12,j%2?M.leaf:M.leafLight,1.3,.45,.9,6);
        tube([[xx,y,zz],[xx+.035,y-len*.50,zz+.045],[xx-.01,y-len,zz+.08]],.009,M.leaf,8);
        for(let k=0;k<6;k++){const t=k/5;sphere(xx+Math.sin(k*2+j)*.035*(1-t),y-.12-t*len,zz+.07,.082*(1-t*.65),j%3?M.lavender:M.pink,.85,1.25,.85,6);}
      }part=old;
    }
    function ring(x,y,z,r,t,m,rx=0,ry=0) {place(new THREE.TorusGeometry(r,t,5,24),m,x,y,z,rx,ry);}
    function emit() {
      const groups=new Map();
      for(const b of batches.values()){
        let n=0;for(const q of b.geos)n+=q.attributes.position.count;
        const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let at=0;
        for(const q of b.geos){P.set(q.attributes.position.array,at*3);N.set(q.attributes.normal.array,at*3);U.set(q.attributes.uv.array,at*2);at+=q.attributes.position.count;q.dispose();}
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));geo.setAttribute('uv',new THREE.BufferAttribute(U,2));
        geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,b.mat);mesh.name=b.part+'-'+Object.keys(M).find(k=>M[k]===b.mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.explodeWithParent=true;
        if(!groups.has(b.part)){const pg=new THREE.Group();pg.name=b.part;pg.userData.componentId=b.part;groups.set(b.part,pg);g.add(pg);}
        groups.get(b.part).add(mesh);
      }
      // Centre each assembly pivot without changing any world-space vertex.
      for(const pg of groups.values()){
        const center=new THREE.Box3().setFromObject(pg).getCenter(new THREE.Vector3());
        for(const mesh of pg.children)mesh.position.sub(center);pg.position.copy(center);
      }
      g.userData.sculptRuntime={nodes:Object.fromEntries([...groups.keys()].map(k=>[k,k])),destructionGroups:[...groups.keys()],colliders:g.userData.cols,sockets:{door:g.userData.door,mailbox:g.userData.mailbox,lights:g.userData.lights},breakable:false};
    }

    // Pass 0: broad lower hall, inset moon-window storey, two curved roof tiers.
    part='foundation';box(0,.10,-.10,4.40,.64,3.55,M.stone);
    part='walls';box(0,1.56,-.20,3.85,2.36,2.90,M.plaster);
    part='upper-storey';box(-.10,3.56,-.20,3.20,1.55,2.48,M.plaster);
    profile([[-1.60,0],[1.60,0],[0,.91]],2.48,-.10,4.335,-1.44,M.plaster,0,0);
    part='main-roof';
    function lowerY(t){return 3.41-.90*t+.24*t**7;}
    function upperY(t){return 5.28-1.22*t+.29*t**7;}
    for(const side of [-1,1])for(let j=0;j<8;j++){
      const t0=j/8,t1=(j+1)/8;slab([-2.43,lowerY(t0),-.20+side*1.95*t0],[2.43,lowerY(t0),-.20+side*1.95*t0],[2.43,lowerY(t1),-.20+side*1.95*t1],[-2.43,lowerY(t1),-.20+side*1.95*t1],.095,M.roof);
    }
    part='upper-roof';
    for(const side of [-1,1])for(let j=0;j<8;j++){
      const t0=j/8,t1=(j+1)/8;slab([-.10+side*2.12*t0,upperY(t0),-1.73],[-.10+side*2.12*t1,upperY(t1),-1.73],[-.10+side*2.12*t1,upperY(t1),1.34],[-.10+side*2.12*t0,upperY(t0),1.34],.09,M.roof);
    }
    part='veranda';box(0,.44,1.48,4.38,.18,.95,M.honey);
    part='stairs';for(let i=0;i<3;i++){const h=.14*(i+1);box(.65,h/2,2.27-i*.21,1.50,h,.45,M.stone);}
    g.userData.door=[.65,2.34];
    g.userData.cols=[[-1.99,-1.70,1.99,1.30],[-2.19,1.33,-.38,1.93],[-1.91,1.91,-1.18,2.54],[2.0,-1.24,2.53,.51],[1.42,1.77,1.96,2.35]];
    g.userData.mailbox=[2.21,2.27];
    g.userData.lights=[[-1.93,2.18,1.85],[-.34,2.18,1.85],[1.89,2.18,1.85],[-1.87,2.22,-1.64],[1.88,2.22,-1.64],[1.68,.79,2.08]];

    // Pass 1: dark timber frame, open veranda and the upper moon-window system.
    part='frame';
    for(const x of [-1.94,1.94])for(const z of [-1.66,1.28]){box(x,1.57,z,.16,2.42,.16,M.oak);box(x,.45,z,.28,.24,.28,M.stoneShade);}
    for(const z of [-1.69,1.30])for(const y of [.44,.78,2.66])box(0,y,z,3.95,.13,.13,M.oak);
    for(const x of [-1.98,1.98])for(const y of [.44,.78,2.66])box(x,y,-.20,.13,.13,3.05,M.oak);
    for(const x of [-1.64,1.44])for(const z of [-1.46,1.06])box(x,3.63,z,.13,1.48,.13,M.oak);
    for(const z of [-1.48,1.09]){
      box(-.10,3.03,z,3.25,.12,.13,M.honey);box(-.10,4.33,z,3.29,.13,.13,M.oak);
      box(-.10,4.83,z,.11,.91,.13,M.oak);
      // Curved gable fascia is added in form pass, using the roof profile itself.
    }
    // Veranda columns carry the lower eave, with restrained bracket blocks.
    for(const x of [-2.02,-.42,1.94]){
      box(x,1.56,1.84,.13,2.20,.13,M.oak);box(x,.49,1.84,.25,.18,.25,M.stone);
      box(x,2.51,1.84,.28,.12,.28,M.honey);
      for(const sign of [-1,1])beam([x,2.26,1.84],[x+sign*.20,2.60,1.84],.045,M.oak,.045,4);
    }
    part='veranda';
    for(const y of [.64,1.03])box(-1.19,y,1.94,1.63,.075,.08,M.oak);
    for(let j=0;j<6;j++){const x=-1.92+j*.285;box(x,.83,1.94,.055,.39,.055,M.honey);}
    for(const x of [-2.10,2.10])for(const y of [.64,1.03])box(x,y,1.48,.075,.075,.92,M.oak);
    part='moon-window';
    function moon(x,y,z,r,ry=0){
      place(new THREE.CylinderGeometry(r+.10,r+.10,.05,32),M.dark,x,y,z,Math.PI/2,0,0);
      // Cylinder's axis is rotated into +Z; discs and torus are truly volumetric.
      place(new THREE.CylinderGeometry(r,r,.04,32),M.glass,x,y,z+(ry===0?.055:-.055),Math.PI/2,0,0);
      ring(x,y,z+(ry===0?.10:-.10),r+.025,.054,M.oak);
      ring(x,y,z+(ry===0?.12:-.12),r-.025,.018,M.honey);
    }
    moon(-.40,3.79,1.11,.67);moon(.22,3.77,-1.48,.48,Math.PI);
    part='windows';
    rectWindow(-1.04,1.50,1.31,.84,1.13);rectWindow(1.48,1.50,1.31,.61,1.09);
    rectWindow(1.99,1.51,-.45,.82,1.12,Math.PI/2);
    rectWindow(-1.99,1.51,-.43,.78,1.12,-Math.PI/2);
    rectWindow(-.85,1.53,-1.71,.80,1.06,Math.PI);rectWindow(.86,1.53,-1.71,.80,1.06,Math.PI);
    rectWindow(1.51,3.68,-.23,.68,.83,Math.PI/2);
    part='entrance';
    box(.65,1.36,1.36,1.04,1.91,.11,M.honey);box(.65,1.35,1.44,.90,1.80,.12,M.dark);box(.65,1.35,1.515,.78,1.72,.045,M.oak);
    box(.65,.46,1.64,1.05,.07,.36,M.stoneShade);
    for(const y of [.86,1.61])box(.65,y,1.56,.71,.055,.03,M.dark);
    ring(.89,1.23,1.58,.057,.012,M.gold);sphere(.89,1.30,1.58,.024,M.gold);
    part='stairs';for(let i=0;i<3;i++)box(.65,.14*(i+1)+.012,2.27-i*.21,1.54,.024,.46,M.stoneShade);

    // Pass 2: curved fascia, scalloped roof tiers, moon lattice and poet's ornaments.
    part='roofcourses';
    function courseTile(t0,t1,a0,a1,map,mat){
      const mid=(a0+a1)/2,d=.018;
      prism([[t0,a0],[t0,a1],[t1-d,a1],[t1-.004,a1-.025],[t1,mid+.023],[t1,mid-.023],[t1-.004,a0+.025],[t1-d,a0]].map(([t,a])=>map(t,a)),.028,mat);
    }
    // The upper storey hides the middle of this roof; no unseen tile field is generated.
    for(const side of [-1,1])for(let row=0;row<7;row++){
      const t0=row/7,t1=Math.min(1,(row+1.15)/7);
      for(let j=0;j<17;j++){
        const x0=Math.max(-2.43,-2.43+j*.304-(row%2)*.152),x1=Math.min(2.43,x0+.295);if(x1-x0<.03)continue;
        if(t1<.65&&x0> -1.73&&x1<1.56)continue;
        courseTile(t0,t1,x0,x1,(t,x)=>[x,lowerY(t)+.033+(7-row)*.002,-.20+side*1.95*t],(j+row)%8?M.roof:M.roofShade);
      }
    }
    for(const side of [-1,1])for(let row=0;row<8;row++)for(let j=0;j<12;j++){
      const t0=row/8,t1=Math.min(1,(row+1.14)/8),z0=Math.max(-1.73,-1.73+j*.282-(row%2)*.141),z1=Math.min(1.34,z0+.274);if(z1-z0<.03)continue;
      courseTile(t0,t1,z0,z1,(t,z)=>[-.10+side*2.12*t,upperY(t)+.033+(8-row)*.002,z],(j+row)%9?M.roof:M.roofShade);
    }
    part='frame';
    // Curved end fascia follows the same functions as the tile shell.
    for(const x of [-2.43,2.43])for(const sign of [-1,1]){
      const pts=[];for(let k=0;k<=8;k++){const t=k/8;pts.push([x,lowerY(t)-.045,-.20+sign*1.95*t]);}
      tube(pts,.066,M.oak,18);tube(pts.map(p=>[p[0],p[1]+.069,p[2]]),.024,M.honey,18);
      tube([[x,lowerY(.84),-.20+sign*1.95*.84],[x,lowerY(1)+.06,-.20+sign*1.95],[x,lowerY(1)+.14,-.20+sign*2.01]],.060,M.roof,8);
      sphere(x,lowerY(1)+.14,-.20+sign*2.01,.058,M.roof,1,.75,1,6);
    }
    for(const z of [-1.75,1.36])for(const sign of [-1,1]){
      const pts=[];for(let k=0;k<=10;k++){const t=k/10;pts.push([-.10+sign*2.12*t,upperY(t)-.035,z]);}
      tube(pts,.072,M.oak,20);tube(pts.map(p=>[p[0],p[1]+.067,p[2]+.025]),.025,M.honey,20);
      tube([[sign*1.87-.10,upperY(.88),z],[sign*2.12-.10,upperY(1)+.04,z],[sign*2.18-.10,upperY(1)+.16,z]],.065,M.roof,10);
      sphere(sign*2.18-.10,upperY(1)+.16,z,.063,M.roof,1,.75,1,6);
    }
    for(const z of [-2.15,1.75]){box(0,2.69,z,4.89,.13,.12,M.oak);box(0,2.77,z,4.91,.035,.14,M.honey);}
    for(let j=0;j<17;j++)for(const z of [-2.07,1.67])box(-2.30+j*.288,2.65,z,.09,.16,.25,M.honey);
    for(let j=0;j<13;j++)place(new THREE.CylinderGeometry(.075,.075,.25,8),M.roof,-.10,5.31,-1.68+j*.249,Math.PI/2);
    for(const z of [-1.76,1.37]){box(-.10,5.31,z,.14,.25,.16,M.oak);box(-.10,5.45,z,.105,.14,.13,M.roof,0,0,.12);}
    // Crescent lattice is clipped to both circles, never extends outside the moon frame.
    part='lattice';
    const mx=-.40,my=3.79,mz=1.25,r=.625,arc=[];
    for(let j=0;j<=20;j++){const a=-1.37+j*2.74/20;arc.push([mx-.25+r*Math.cos(a),my+r*Math.sin(a),mz]);}tube(arc,.023,M.oak,24);
    for(let j=-3;j<=3;j++){
      const v=j*.17,outer=Math.sqrt(r*r-v*v),inner=-.25+Math.sqrt(Math.max(0,r*r-v*v));
      beam([mx+inner,my+v,mz],[mx+outer,my+v,mz],.012,M.honey,.012,4);
    }
    for(const u of [.16,.32,.48,.59]){
      let start=null,last=null;
      for(let k=0;k<=64;k++){const v=-r+k*2*r/64,inside=u*u+v*v<r*r&&(u+.25)**2+v*v>r*r;
        if(inside){if(start===null)start=v;last=v;}else if(start!==null){beam([mx+u,my+start,mz],[mx+u,my+last,mz],.012,M.honey,.012,4);start=null;}
      }if(start!==null)beam([mx+u,my+start,mz],[mx+u,my+last,mz],.012,M.honey,.012,4);
    }
    // Rear moon uses a simpler cross-lattice, readable at the village camera distance.
    for(const yy of [-.18,.18])box(.22,3.77+yy,-1.60,.85,.027,.03,M.oak);
    box(.22,3.77,-1.60,.025,.90,.035,M.honey);
    part='poem-cloths';
    const clothXs=[-1.61,-1.07,-.53];
    clothXs.forEach((x,j)=>{
      beam([x-.23,2.54,1.92],[x+.23,2.54,1.92],.025,M.oak,.025,6);
      profile([[-.18,0],[-.16,-.94],[.015,-.965],[.16,-.91],[.18,0]],.024,x,2.51,1.94,M.cream,0,.004);
      for(const u of [-.14,.14])beam([x+u,2.55,1.92],[x+u,2.45,1.96],.011,M.honey,.011,4);
      beam([x,1.56,1.97],[x,1.47,1.97],.009,M.gold,.009,4);place(new THREE.ConeGeometry(.025,.10,5),M.roof,x,1.43,1.97);
    });
    part='ink-poetry';
    // Stroke-built short poetic phrases: 山月 / 水光 / 入心. No font texture or sprite.
    const glyphs={
      mountain:[[[.50,.95],[.50,.10]],[[.10,.66],[.10,.10],[.90,.10],[.90,.66]]],
      moon:[[[.18,.10],[.18,.90],[.80,.90],[.80,.10],[.65,.15]],[[.20,.64],[.78,.64]],[[.20,.40],[.78,.40]]],
      water:[[[.50,.94],[.50,.10],[.39,.16]],[[.12,.67],[.36,.65],[.12,.22]],[[.80,.78],[.59,.52],[.91,.18]]],
      light:[[[.50,.94],[.50,.60]],[[.20,.85],[.30,.65]],[[.80,.85],[.70,.65]],[[.10,.52],[.90,.52]],[[.39,.49],[.32,.20],[.13,.10]],[[.62,.49],[.62,.13],[.88,.13],[.92,.27]]],
      enter:[[[.37,.91],[.58,.49],[.12,.08]],[[.47,.72],[.90,.08]]],
      heart:[[[.22,.63],[.12,.32]],[[.36,.54],[.42,.14],[.76,.14],[.86,.32]],[[.51,.86],[.65,.67]],[[.85,.65],[.94,.46]]]
    };
    const text=[['mountain','moon'],['water','light'],['enter','heart']];
    clothXs.forEach((x,j)=>text[j].forEach((ch,k)=>glyphs[ch].forEach(stroke=>{for(let i=1;i<stroke.length;i++){const a=stroke[i-1],b=stroke[i];beam([x+(a[0]-.5)*.23,2.06-k*.35+a[1]*.25,1.98],[x+(b[0]-.5)*.23,2.06-k*.35+b[1]*.25,1.98],.008,M.dark,.008,4);}})));
    part='brush-sign';
    const sx=1.53,sy=2.08,sz=2.03;
    beam([sx,2.58,1.80],[sx,2.58,sz],.022,M.oak);beam([sx,2.58,sz],[sx,2.36,sz],.012,M.gold);ring(sx,sy,sz,.25,.027,M.gold);
    beam([sx+.14,sy+.24,sz+.025],[sx-.02,sy-.04,sz+.025],.034,M.oak,.027,7);
    beam([sx-.02,sy-.04,sz+.025],[sx-.08,sy-.15,sz+.025],.045,M.cream,.025,7);
    beam([sx-.08,sy-.15,sz+.025],[sx-.15,sy-.22,sz+.025],.025,M.dark,.001,6);
    box(sx+.06,sy-.16,sz,.24,.075,.12,M.cream);for(const x of [-.08,.20])place(new THREE.CylinderGeometry(.048,.048,.13,8),M.honey,sx+x,sy-.16,sz,Math.PI/2);
    part='lamps';
    function paperLamp(x,y,z){
      sphere(x,y,z,.19,M.glass,1,1.22,1,12);
      for(const yy of [-.205,.205])place(new THREE.CylinderGeometry(.075,.075,.035,10),M.oak,x,y+yy,z);
      for(let j=0;j<6;j++){const a=j*Math.PI/3,pts=[];for(let k=0;k<=8;k++){const v=-Math.PI*.43+k*Math.PI*.86/8;pts.push([x+Math.cos(v)*.195*Math.cos(a),y+Math.sin(v)*.236,z+Math.cos(v)*.195*Math.sin(a)]);}tube(pts,.0065,M.honey,10);}
      for(const yy of [-.12,0,.12])ring(x,y+yy,z,.19*Math.sqrt(1-(yy/.24)**2),.0055,M.honey,Math.PI/2);
      beam([x,y+.23,z],[x,2.62,z],.012,M.dark,.012,4);beam([x,y-.23,z],[x,y-.34,z],.009,M.gold,.009,4);place(new THREE.ConeGeometry(.025,.12,5),M.roof,x,y-.39,z);
    }
    g.userData.lights.slice(0,5).forEach(p=>paperLamp(...p));
    // Small stone lantern stands independently at front right.
    const lx=1.68,lz=2.08;
    place(new THREE.CylinderGeometry(.22,.26,.14,6),M.stoneShade,lx,.07,lz);
    place(new THREE.CylinderGeometry(.09,.14,.38,6),M.stone,lx,.33,lz);
    box(lx,.58,lz,.37,.12,.37,M.stone);box(lx,.79,lz,.23,.27,.23,M.glass);
    for(const x of [-.15,.15])for(const z of [-.15,.15])box(lx+x,.79,lz+z,.065,.35,.065,M.stoneShade);
    box(lx,1.00,lz,.43,.09,.43,M.stone);place(new THREE.ConeGeometry(.35,.18,4),M.stone,lx,1.12,lz,0,Math.PI/4);sphere(lx,1.25,lz,.065,M.stoneShade);
    part='water-bowl';
    const bx=-1.55,bz=2.18;
    const bowl=new THREE.LatheGeometry([[.19,0],[.28,.04],[.34,.18],[.34,.31],[.29,.33],[.26,.25],[.18,.11]].map(v=>new THREE.Vector2(...v)),12);place(bowl,M.stone,bx,-.025,bz);
    place(new THREE.CylinderGeometry(.265,.265,.018,12),M.water,bx,.225,bz);
    beam([bx-.23,.40,bz-.12],[bx+.15,.40,bz-.12],.026,M.leafLight,.026,6);
    beam([bx-.23,.40,bz-.12],[bx-.23,.05,bz-.12],.025,M.leaf,.025,6);
    tube([[bx+.12,.39,bz-.12],[bx+.15,.35,bz-.10],[bx+.15,.31,bz-.06]],.009,M.water,8);
    part='masonry';
    for(let row=0;row<3;row++){const y=-.12+row*.18;
      for(let j=0;j<12;j++)for(const z of [-1.90,1.69]){const x=-2.0+j*.36+(row%2?.12:0);if(x>2.08)continue;box(x,y,z,.346,.165,.05,(j+row)%4?M.stone:M.stoneShade);}
      for(let j=0;j<10;j++)for(const x of [-2.21,2.21])box(x,y,-1.77+j*.36,.05,.165,.345,(j+row)%4?M.stone:M.stoneShade);
    }
    part='entrance';for(let j=0;j<5;j++)box(.65-.30+j*.15,1.35,1.545,.008,1.56,.008,M.honey);

    // Pass 3: bamboo, attached wisteria, flower boxes and a small plum silhouette.
    part='windows';rectWindow(.91,3.69,1.11,.47,.70);
    planter(.91,3.25,1.26,.62);
    planter(-1.04,.86,1.53,.96);planter(1.48,.86,1.54,.65);
    planter(2.16,.87,-.45,.88,Math.PI/2);
    planter(-.85,.89,-1.89,.91,Math.PI);planter(.86,.89,-1.89,.91,Math.PI);
    vine(-2.00,2.74,1.80,1.26,.65);vine(-1.57,3.19,1.20,.72,.56);vine(-1.99,2.77,-1.67,1.02,.58);
    part='bamboo';
    // Five culms emerge from one narrow side bed; tips stay inside the 5.2m envelope.
    box(2.20,.07,-.39,.43,.18,1.65,M.stoneShade);box(2.20,.17,-.39,.47,.04,1.68,M.stone);
    function bambooLeaf(a,b,w,phase){
      const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),len=v.length();
      const sh=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(w,len*.37),new THREE.Vector2(0,len),new THREE.Vector2(-w*.60,len*.33)]);
      const geo=new THREE.ExtrudeGeometry(sh,{depth:.009,bevelEnabled:false,steps:1});
      geo.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),phase));
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate(...a);add(geo,phase>1?M.leaf:M.leafLight);
    }
    const culms=[[2.11,-.98,2.74],[2.28,-.63,3.10],[2.14,-.27,2.67],[2.31,.05,2.98],[2.11,.34,2.57]];
    culms.forEach(([x,z,h],j)=>{
      const dx=(j%2?.04:-.03);
      beam([x,.14,z],[x+dx,h,z-.04],.030,M.leaf,.022,7);
      for(let k=0;k<7;k++){
        const y=.28+k*(h-.32)/7;place(new THREE.CylinderGeometry(.034,.035,.032,7),M.leafLight,x+dx*y/h,y,z-.04*y/h);
        if(k<3)continue;
        const dir=k%2===0?-1:1,tip=[x+dir*.19,y+.16,z+(j%2?.15:-.15)];
        beam([x,y,z],tip,.012,M.leaf,.006,5);
        bambooLeaf(tip,[tip[0]+dir*.08,tip[1]+.19,tip[2]+.07],.042,k*.4);
        bambooLeaf(tip,[tip[0]-dir*.11,tip[1]+.10,tip[2]+.18],.038,k*.5+.3);
        bambooLeaf(tip,[tip[0]+dir*.10,tip[1]-.16,tip[2]-.09],.041,k*.4+.6);
      }
    });
    part='lattice';
    // This is a flat decorative plum silhouette on the glazing, not a modeled room.
    tube([[-.82,3.29,1.257],[-.72,3.45,1.259],[-.77,3.64,1.26],[-.91,3.84,1.26]],.015,M.oak,13);
    beam([-.74,3.50,1.26],[-.49,3.67,1.26],.012,M.oak,.007,5);
    beam([-.78,3.64,1.26],[-1.00,3.72,1.26],.011,M.oak,.006,5);
    for(const [x,y] of [[-.91,3.84],[-.85,3.75],[-.78,3.65],[-.49,3.67],[-.59,3.59],[-1.00,3.72]]){
      for(let j=0;j<5;j++){const a=j*Math.PI*2/5;sphere(x+Math.cos(a)*.028,y+Math.sin(a)*.028,1.275,.025,M.pink,1,1,.48,5);}
      sphere(x,y,1.29,.012,M.cream,1,1,.5,5);
    }
    part='flowerboxes';
    box(-2.08,.07,2.16,.40,.18,.53,M.stoneShade);box(-2.08,.17,2.16,.44,.035,.57,M.stone);
    for(let j=0;j<8;j++)flower(-2.08+Math.sin(j*2.2)*.12,.25,2.01+(j%3)*.145,.058,j%3===0?M.pink:j%3===1?M.lavender:M.cream);
    for(const p of [[-1.11,.08,2.37],[-1.05,.07,2.02],[2.18,.06,1.14]])flower(p[0],p[1]+.08,p[2],.065,M.cream);
    part='veranda';
    for(let j=0;j<18;j++)box(-2.10+j*.247,.537,1.51,.012,.012,.89,M.oak);
    // A low tea bench supports the literary veranda without blocking the entrance.
    box(-1.22,.73,1.55,.77,.10,.32,M.honey);
    for(const x of [-1.51,-.93])box(x,.61,1.55,.08,.23,.25,M.oak);
    place(new THREE.CylinderGeometry(.065,.075,.075,8),M.cream,-1.18,.82,1.57);
    ring(-1.18,.86,1.57,.062,.008,M.honey,Math.PI/2);
    g.userData.cols=[[-1.99,-1.70,1.99,1.30],[-2.19,1.33,-.38,1.99],[-2.36,1.90,-1.18,2.54],[1.99,-1.27,2.56,.76],[1.42,1.77,1.96,2.35]];

    emit();
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
