/* player | procedural low-poly reference reconstruction; +Z front, meters. */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['home_player'] = function (THREE, kit) {
const g = new THREE.Group(); g.name = 'home-player';
    const M = {
      plaster: kit.mat('#f4e6d0', { roughness: 0.91, metalness: 0 }, 'stone'),
      stone: kit.mat('#ded0ba', { roughness: 0.92, metalness: 0 }, 'stone'),
      stoneShade: kit.mat('#b5a28a', { roughness: 0.95, metalness: 0 }, 'stone'),
      oak: kit.mat('#8b5a36', { roughness: 0.82, metalness: 0 }, 'wall'),
      honey: kit.mat('#b07a4a', { roughness: 0.8, metalness: 0 }, 'wall'),
      dark: kit.mat('#4b342d', { roughness: 0.9, metalness: 0 }, 'wall'),
      roof: kit.mat('#9c4a3a', { roughness: 0.78, metalness: 0 }, 'roof'),
      roofShade: kit.mat('#b45c47', { roughness: 0.8, metalness: 0 }, 'roof'),
      gold: kit.mat('#d4aa59', { roughness: 0.4, metalness: 0.65 }),
      leaf: kit.mat('#617747', { roughness: 0.92, metalness: 0 }),
      leafLight: kit.mat('#8c9d61', { roughness: 0.92, metalness: 0 }),
      pink: kit.mat('#e3a0b9', { roughness: 0.88, metalness: 0 }),
      lavender: kit.mat('#ac88c5', { roughness: 0.9, metalness: 0 }),
      cream: kit.mat('#fff0cf', { roughness: 0.88, metalness: 0 }),
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

    // Pass 0: silhouette, volumes, balcony footprint and grounded entrance.
    part='foundation';box(0,.125,-.10,4.50,.65,3.70,M.stone);
    part='walls';box(0,2.18,-.05,3.40,3.46,3.00,M.plaster);
    profile([[-1.70,0],[1.70,0],[0,2.52]],3.0,0,3.91,-1.55,M.plaster,0,0);
    part='main-roof';
    function roofY(t){return 6.47-2.73*t+.055*t**6;}
    for(const side of [-1,1])slab([0,roofY(0),-1.76],[side*2.10,roofY(1),-1.76],[side*2.10,roofY(1),1.76],[0,roofY(0),1.76],.115,M.roof);
    part='balcony';box(0,2.77,-.03,4.55,.19,3.98,M.honey);
    part='stairs';
    for(let i=0;i<3;i++){const top=.15*(i+1);box(.55,top/2,2.29-i*.23,1.72,top,.50,M.stone);}
    part='chimney';box(-1.12,5.22,-.91,.43,2.56,.48,M.stone);
    box(-1.12,6.51,-.91,.62,.15,.65,M.stone);
    g.userData.door=[.55,2.38];
    g.userData.cols=[[-1.78,-1.64,1.78,1.54],[-2.30,-1.98,-1.83,1.90],[1.83,-1.98,2.30,1.90],[-1.95,-2.01,1.95,-1.62],[-1.93,1.72,-1.12,2.48]];
    g.userData.mailbox=[1.94,2.30];
    g.userData.lights=[[-2.13,3.58,1.98],[2.13,3.58,1.98],[-2.13,3.58,-1.92],[2.13,3.58,-1.92],[-.32,1.95,1.87],[1.38,1.95,1.87]];
    g.userData.smoke=[-1.12,6.78,-.91];

    // Pass 1: load-bearing frame, continuous rails and real glazed openings.
    part='frame';
    for(const z of [-1.58,1.49])for(const y of [.48,2.67,3.91])box(0,y,z,3.56,.14,.14,M.oak);
    for(const x of [-1.73,1.73])for(const y of [.48,2.67,3.91])box(x,y,-.05,.14,.14,3.12,M.oak);
    for(const x of [-1.67,1.67])for(const z of [-1.52,1.42]){panel(x,2.18,z,.17,3.54,.18,M.honey);box(x,.54,z,.31,.22,.31,M.stoneShade);}
    for(const z of [-1.60,1.50]){
      box(0,5.08,z,.13,2.75,.14,M.honey);
      box(0,4.99,z,2.14,.13,.14,M.honey);
      for(const side of [-1,1])beam([0,6.47,z],[side*2.08,3.76,z],.082,M.oak,.082,4);
    }
    // Balcony posts sit outside the wall so the porch keeps real negative space.
    for(const x of [-2.13,-.32,1.38,2.13])for(const z of [-1.92,1.98]){
      box(x,1.63,z,.14,2.38,.14,M.honey);box(x,.52,z,.28,.23,.28,M.stone);
      for(const yy of [2.56,2.88,3.54])box(x,yy,z,.23,.12,.23,M.oak);
      box(x,3.22,z,.13,.88,.13,M.honey);
      beam([x,2.25,z],[x+(x<0?.27:-.27),2.69,z],.06,M.oak,.06,4);
      beam([x,2.25,z],[x,2.69,z+(z>0?-.29:.29)],.06,M.oak,.06,4);
    }
    part='balcony';
    for(const z of [-1.94,2.00])for(const yy of [2.96,3.49]){box(0,yy,z,4.38,.10,.10,M.honey);box(0,yy+.053,z,4.40,.025,.12,M.oak);}
    for(const x of [-2.18,2.18])for(const yy of [2.96,3.49]){box(x,yy,.02,.10,.10,3.98,M.honey);box(x,yy+.053,.02,.12,.025,4.0,M.oak);}
    // Low porch rails leave the 1.72m-wide stair mouth open.
    for(const x of [-2.18,2.18])for(const yy of [.68,1.10])box(x,yy,.02,.09,.075,3.98,M.honey);
    for(const yy of [.68,1.10]){box(-1.24,yy,2.00,1.87,.075,.10,M.honey);box(1.88,yy,2.00,.58,.075,.10,M.honey);}
    part='windows';
    archWindow(-.64,3.30,1.48,.63,1.54);archWindow(.64,3.30,1.48,.63,1.54);
    archWindow(-.85,.85,1.48,.68,1.25);
    archWindow(1.74,.90,-.35,.78,1.20,Math.PI/2);
    archWindow(-1.74,.90,-.35,.78,1.20,-Math.PI/2);
    archWindow(-.70,3.32,-1.59,.60,1.46,Math.PI);archWindow(.66,3.32,-1.59,.60,1.46,Math.PI);
    rectWindow(-.72,1.55,-1.60,.72,.97,Math.PI);
    part='entrance';
    profile(pointed(1.10,1.98),.08,.55,.44,1.49,M.stone);
    profile(pointed(.94,1.81),.11,.55,.46,1.58,M.dark);
    profile(pointed(.80,1.71),.035,.55,.48,1.70,M.honey);
    box(.55,.49,1.81,1.05,.07,.33,M.stoneShade);
    // Rear balcony access is decorative; the game has one interaction anchor.
    box(.60,1.30,-1.65,.75,1.67,.10,M.oak);rectWindow(.60,1.53,-1.71,.42,.66,Math.PI);
    part='doorhardware';ring(.77,1.20,1.77,.064,.013,M.gold);sphere(.77,1.28,1.77,.025,M.gold);
    for(const y of [.83,1.53]){box(.31,y,1.76,.27,.04,.025,M.dark);sphere(.22,y,1.78,.018,M.gold);}
    part='stairs';
    for(let i=0;i<3;i++){const top=.15*(i+1);box(.55,top+.012,2.29-i*.23,1.76,.025,.50,M.stoneShade);}

    // Pass 2: scalloped roof courses, turned rails, dormer, lamps and stonework.
    part='roofcourses';
    for(const side of [-1,1])for(let row=0;row<12;row++){
      const t0=row/12,t1=Math.min(1,(row+1.16)/12),step=3.52/13,start=-1.76-(row%2)*step*.5;
      for(let j=0;j<15;j++){
        const z0=Math.max(-1.76,start+j*step),z1=Math.min(1.76,start+(j+1)*step-.008);if(z1-z0<.035)continue;
        const mid=(z0+z1)/2,drop=.016,uv=[[t0,z0],[t0,z1],[t1-drop,z1],[t1-.004,z1-.025],[t1,mid+.025],[t1,mid-.025],[t1-.004,z0+.025],[t1-drop,z0]];
        const lift=.028+(12-row)*.002;
        prism(uv.map(([t,z])=>[side*2.10*t,roofY(t)+lift,z]),.033,(row+j)%7===0?M.roofShade:M.roof);
      }
    }
    for(let j=0;j<15;j++)place(new THREE.CylinderGeometry(.09,.09,.245,8,1,false,0,Math.PI),M.roof,0,6.51,-1.70+j*.239,Math.PI/2);
    part='frame';
    for(const z of [-1.80,1.80])for(const side of [-1,1]){
      tube([[0,6.49,z],[side*.70,5.57,z],[side*1.40,4.64,z],[side*2.12,3.80,z]],.075,M.honey,14);
      tube([[0,6.55,z+.026],[side*.70,5.63,z+.026],[side*1.40,4.70,z+.026],[side*2.12,3.86,z+.026]],.017,M.gold,14);
    }
    for(const x of [-2.11,2.11]){box(x,3.74,0,.14,.14,3.61,M.oak);box(x,3.80,0,.17,.025,3.63,M.honey);}
    for(const z of [-1.82,1.82]){box(0,6.50,z,.17,.31,.17,M.honey);place(new THREE.ConeGeometry(.115,.23,4),M.gold,0,6.75,z,0,Math.PI/4);}
    panel(0,5.53,1.54,.22,.22,.06,M.honey);box(0,5.53,1.60,.11,.11,.045,M.gold,0,0,Math.PI/4);
    // Side dormer intersects the pitched roof as a volume, with its own gabled cap.
    part='main-roof';
    box(1.57,4.65,.15,.88,.69,.77,M.plaster);
    profile([[-.385,0],[.385,0],[0,.46]],.90,1.10,4.98,.15,M.plaster,Math.PI/2,0);
    for(const sign of [-1,1])slab([1.10,5.47,.15],[2.08,5.47,.15],[2.08,4.98,.15+sign*.49],[1.10,4.98,.15+sign*.49],.075,M.roof);
    part='frame';for(const sign of [-1,1])beam([2.11,5.48,.15],[2.11,4.98,.15+sign*.49],.055,M.honey,.055,4);
    part='windows';archWindow(2.022,4.40,.15,.43,.72,Math.PI/2);
    part='balusters';
    function spindle(x,y,z,h=.52){
      const q=new THREE.LatheGeometry([[.037,0],[.040,.06],[.025,.12],[.047,.24],[.028,.37],[.027,.46],[.039,.50]].map(([r,v])=>new THREE.Vector2(r,v*h/.50)),6);
      place(q,M.honey,x,y,z);box(x,y+.025,z,.075,.05,.075,M.oak);box(x,y+h-.012,z,.075,.035,.075,M.oak);
    }
    for(const z of [-1.94,2.00])for(let j=0;j<18;j++)spindle(-2.03+j*.239,3.01,z,.44);
    for(const x of [-2.18,2.18])for(let j=0;j<16;j++)spindle(x,3.01,-1.80+j*.24,.44);
    for(const x of [-2.18,2.18])for(let j=0;j<15;j++)spindle(x,.73,-1.76+j*.25,.33);
    for(let j=0;j<8;j++)spindle(-2.05+j*.23,.73,2,.33);for(const x of [1.72,1.98,2.16])spindle(x,.73,2,.33);
    // Diamond lattice adds local identity without texturing the glass.
    part='glazing';
    function diamonds(x,y,z,w,h,ry=0){
      for(const dir of [-1,1])for(let j=-3;j<=3;j++){
        const u0=-w*.37,u1=w*.37,cy=h*.44+j*.19;
        const pts=[[u0,cy+dir*u0],[u1,cy+dir*u1]];
        if(pts.every(v=>v[1]>.10&&v[1]<h*.77))beam(W(x,y,z,pts[0][0],pts[0][1],.155,ry),W(x,y,z,pts[1][0],pts[1][1],.155,ry),.011,M.honey,.011,4);
      }
    }
    for(const x of [-.64,.64])diamonds(x,3.30,1.48,.63,1.54);diamonds(-.85,.85,1.48,.68,1.25);
    part='entrance';
    for(let j=0;j<5;j++)box(.55-.30+j*.15,1.04,1.746,.008,1.10,.008,M.oak);
    const outer=pointed(1.13,2.00),inner=pointed(.88,1.78).map(v=>new THREE.Vector2(v[0],v[1]+.075)),archShape=new THREE.Shape(outer.map(v=>new THREE.Vector2(...v)));
    archShape.holes.push(new THREE.Path(inner.reverse()));
    place(new THREE.ExtrudeGeometry(archShape,{depth:.11,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,steps:1,curveSegments:3}),M.stone,.55,.43,1.66);
    for(const side of [-1,1])for(let j=0;j<5;j++)box(.55+side*.508,.58+j*.24,1.782,.12,.012,.012,M.stoneShade);
    // Stone courses are laid over the base, not floating above it.
    part='masonry';
    for(let row=0;row<3;row++){
      const y=-.08+row*.19;
      for(let j=0;j<12;j++)for(const z of [-1.965,1.765]){const x=-2.09+j*.38+(row%2?.10:0);if(x>2.16)continue;box(x,y,z,.363,.178,.045,(j+row)%4===0?M.stoneShade:M.stone);}
      for(let j=0;j<10;j++)for(const x of [-2.265,2.265])box(x,y,-1.80+j*.36,.045,.178,.34,(j+row)%4===0?M.stoneShade:M.stone);
    }
    part='chimney';
    for(let row=0;row<11;row++){
      const yy=4.04+row*.22;box(-1.12,yy,-.657,.44,.015,.015,M.stoneShade);box(-.893,yy,-.91,.015,.015,.49,M.stoneShade);
      box(-1.12+(row%2?.10:-.10),yy+.105,-.65,.015,.19,.015,M.stoneShade);
    }
    box(-1.12,6.63,-.91,.30,.08,.33,M.dark);
    for(const x of [-1.32,-.92])box(x,6.70,-.91,.07,.18,.44,M.stone);
    for(const z of [-1.095,-.725])box(-1.12,6.70,z,.35,.18,.07,M.stone);
    g.userData.smoke=[-1.12,6.80,-.91];
    part='fountain';
    const fx=-1.55,fz=2.08;
    place(new THREE.CylinderGeometry(.37,.40,.15,10),M.stone,fx,.05,fz);
    place(new THREE.CylinderGeometry(.23,.28,.18,10),M.stoneShade,fx,.20,fz);
    const bowl=new THREE.LatheGeometry([[.11,0],[.16,.035],[.29,.14],[.37,.18],[.38,.23],[.33,.245],[.28,.18],[.13,.09]].map(v=>new THREE.Vector2(...v)),12);place(bowl,M.stone,fx,.26,fz);
    place(new THREE.CylinderGeometry(.31,.31,.018,12),M.water,fx,.46,fz);
    place(new THREE.CylinderGeometry(.065,.09,.37,8),M.stone,fx,.60,fz);
    const topBowl=new THREE.LatheGeometry([[.055,0],[.10,.03],[.20,.08],[.21,.12],[.18,.14],[.075,.05]].map(v=>new THREE.Vector2(...v)),10);place(topBowl,M.stone,fx,.71,fz);
    place(new THREE.CylinderGeometry(.174,.174,.015,10),M.water,fx,.815,fz);sphere(fx,.90,fz,.065,M.stone,1,1.3,1);
    for(const sign of [-1,1])tube([[fx+sign*.15,.82,fz],[fx+sign*.22,.70,fz],[fx+sign*.25,.49,fz]],.012,M.water,10);
    part='lamps';
    function lantern(x,y,z,upper){
      box(x,y,z,.16,.30,.16,M.glass);
      for(const a of [-1,1])for(const c of [-1,1])beam([x+a*.11,y-.19,z+c*.11],[x+a*.085,y+.18,z+c*.085],.014,M.gold,.014,5);
      for(const yy of [y-.19,y+.18])box(x,yy,z,.25,.035,.25,M.gold);
      place(new THREE.ConeGeometry(.19,.14,4),M.oak,x,y+.26,z,0,Math.PI/4);sphere(x,y-.24,z,.032,M.gold);
      beam([x,y+.33,z],[x,y+.45,z],.017,M.dark);ring(x,y+.44,z,.047,.011,M.gold);
      if(upper){box(x,y+.28,z-.13,.13,.72,.13,M.honey);beam([x,y+.53,z-.12],[x,y+.53,z],.025,M.gold);}
      else{box(x,y+.26,z-.16,.09,.21,.06,M.oak);beam([x,y+.39,z-.15],[x,y+.39,z],.024,M.gold);}
    }
    g.userData.lights.forEach((p,i)=>lantern(...p,i<4));

    // Pass 3: final shared palette, living flower boxes and attached wisteria.
    planter(-.64,3.21,1.74,.78);planter(.64,3.21,1.74,.78);
    planter(-.85,.77,1.74,.92);planter(1.95,.80,-.35,.86,Math.PI/2);
    planter(-.70,3.23,-1.83,.76,Math.PI);planter(.66,3.23,-1.83,.76,Math.PI);
    vine(-1.78,3.54,2.03,1.23,.70);vine(2.03,3.54,-.92,.96,.51);vine(-1.78,3.54,-1.95,1.05,.65);
    part='flowerboxes';
    // A planted pocket replaces the reference dock, keeping the mailbox landing clear.
    box(-2.09,.075,2.16,.41,.20,.58,M.stone);box(-2.09,.18,2.16,.45,.035,.62,M.stoneShade);
    for(let j=0;j<9;j++){
      const x=-2.12+Math.sin(j*2.1)*.13,z=1.95+(j%3)*.17;
      flower(x,.27+(j%2)*.025,z,.061,j%3===0?M.pink:j%3===1?M.lavender:M.cream);
    }
    for(const p of [[-1.21,.10,2.36],[-1.07,.09,2.15],[-2.20,.06,1.68]]){
      sphere(...p,.12,M.leaf,1.3,.52,1.1,6);flower(p[0],p[1]+.10,p[2],.055,M.lavender);
    }
    // Small balcony deck cap strips make the wrap readable from the top without extra colors.
    part='balcony';
    for(let j=0;j<20;j++)for(const side of [-1,1])box(side*1.98,2.873,-1.87+j*.195,.46,.012,.018,M.oak);
    for(const z of [-1.84,1.84])for(let j=0;j<19;j++)box(-2.10+j*.232,2.873,z,.015,.012,.28,M.oak);
    // Door approach remains free; flower pockets and low porch rails have separate collision boxes.
    g.userData.cols=[[-1.78,-1.64,1.78,1.54],[-2.30,-1.98,-1.83,1.90],[1.83,-1.98,2.30,1.90],[-1.95,-2.01,1.95,-1.62],[-2.42,1.80,-1.09,2.54],[-2.28,1.55,-.36,2.08],[1.28,1.55,2.30,2.06]];

    emit();
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
