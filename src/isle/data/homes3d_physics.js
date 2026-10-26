/* 雷恩的發明工坊 · img2threejs 程式化低多邊形重建。正面 +Z，單位公尺。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['home_physics'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'home-physics-inventor-workshop';
    const PASS = 3;
    // One shared material per palette entry; host batching keeps the rotor separate.
    const M = {
      plaster: kit.mat('#f0e6d8', { roughness: .91 }, 'stone'),
      stone: kit.mat('#d8c8ac', { roughness: .92 }, 'stone'),
      stoneShade: kit.mat('#b9a88e', { roughness: .96 }, 'stone'),
      oak: kit.mat('#9a663f', { roughness: .83 }, 'wall'),
      honey: kit.mat('#be8950', { roughness: .77 }, 'wall'),
      dark: kit.mat('#5b4031', { roughness: .87 }, 'wall'),
      roof: kit.mat('#c8733f', { roughness: .82 }, 'roof'),
      roofLight: kit.mat('#df8b4b', { roughness: .79 }, 'roof'),
      copper: kit.mat('#b8763d', { roughness: .42, metalness: .52 }),
      brass: kit.mat('#d5ad56', { roughness: .38, metalness: .62 }),
      cyan: kit.mat('#5ee7f0', { roughness: .24, metalness: .15, emissive: '#5ee7f0', emissiveIntensity: .15 }),
      leaf: kit.mat('#658451', { roughness: .95 }),
      leafLight: kit.mat('#94a55f', { roughness: .94 }),
      pink: kit.mat('#ec9fbb', { roughness: .85 }),
      lavender: kit.mat('#aa86c5', { roughness: .86 }),
      glass: kit.win()
    };
    const batches = new Map(), parts = {}, pivots = {
      foundation:[0,0,0], cottage:[-.85,.35,0], 'main-roof':[-.85,3.05,0],
      workshop:[1.3,.35,0], 'workshop-roof':[1.3,2.85,0], cupola:[1.4,3.43,-.45],
      windmill:[-.95,5.05,.62], door:[-1.10,.42,1.30]
    };
    let part = 'foundation';
    function put(geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0) {
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const old=geo;geo=old.toNonIndexed();old.dispose(); }
      const key=part+'|'+m.uuid;
      if(!batches.has(key))batches.set(key,{part,mat:m,geos:[]});batches.get(key).geos.push(geo);
    }
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0){put(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
    function profile(points,dep,x,y,z,m,ry=0,bevel=.008){const s=new THREE.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();put(new THREE.ExtrudeGeometry(s,{depth:dep,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:8,steps:1}),m,x,y,z,0,ry);}
    function beam(a,b,r,m,r2=r,n=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),q=new THREE.CylinderGeometry(r2,r,d.length(),n);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));q.translate(...A.add(B).multiplyScalar(.5).toArray());put(q,m);}
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1,n=8){const q=new THREE.SphereGeometry(r,n,5);q.scale(sx,sy,sz);put(q,m,x,y,z);}
    function tube(pts,r,m,n=20){put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(a=>new THREE.Vector3(...a))),n,r,6,false),m);}
    function ring(x,y,z,r,t,m,ry=0,n=24){put(new THREE.TorusGeometry(r,t,6,n),m,x,y,z,0,ry);}
    function quad(a,b,c,d,m,th=.045){if(new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).cross(new THREE.Vector3(...c).sub(new THREE.Vector3(...a))).y<0){const tmp=b;b=d;d=tmp;}const v=[],p=[a,b,c,d,...[a,b,c,d].map(q=>[q[0],q[1]-th,q[2]])];for(const f of [[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]])for(const i of f)v.push(...p[i]);const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(v,3));q.computeVertexNormals();put(q,m);}
    function archPts(w,h){const r=w/2,cy=h-r,p=[[-r,0],[r,0],[r,cy]];for(let i=1;i<=12;i++){const a=i*Math.PI/12;p.push([r*Math.cos(a),cy+r*Math.sin(a)]);}return p;}
    function arch(x,y,z,w,h,dep,m,ry=0){profile(archPts(w,h),dep,x,y,z,m,ry);}
    function archFrame(x,y,z,w,h,t,dep,m,ry=0){const s=new THREE.Shape(archPts(w,h).map(v=>new THREE.Vector2(...v))),hole=archPts(w-2*t,h-2*t).map(v=>new THREE.Vector2(v[0],v[1]+t));s.holes.push(new THREE.Path(hole.reverse()));put(new THREE.ExtrudeGeometry(s,{depth:dep,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,curveSegments:8,steps:1}),m,x,y,z,0,ry);}
    function local(x,y,z,u,v,o,ry=0){return [x+u*Math.cos(ry)+o*Math.sin(ry),y+v,z-u*Math.sin(ry)+o*Math.cos(ry)];}
    function lbox(x,y,z,u,v,o,w,h,d,m,ry=0){box(...local(x,y,z,u,v,o,ry),w,h,d,m,0,ry);}
    // Pass 1: asymmetric masonry volumes and every silhouette-defining roof element.
    box(-.02,.06,-.08,4.70,.44,3.38,M.stone);
    part='cottage';box(-.85,1.70,-.10,2.50,2.70,2.80,M.plaster);
    for(const z of [-1.50,1.24])profile([[-1.25,0],[1.25,0],[0,2.00]],.06,-.85,3.05,z,M.plaster,0,0);
    part='workshop';box(1.30,1.52,-.10,1.80,2.34,2.80,M.plaster);
    for(const z of [-1.50,1.24])profile([[-.90,0],[.90,0],[-.90,.78]],.06,1.3,2.69,z,M.plaster,0,0);
    part='main-roof';
    for(const side of [-1,1])quad([-.85,5.10,-1.74],[-.85,5.10,1.56],[-.85+side*1.53,2.96,1.56],[-.85+side*1.53,2.96,-1.74],M.roof,.10);
    part='workshop-roof';quad([.24,3.59,-1.70],[.24,3.59,1.55],[2.43,2.78,1.55],[2.43,2.78,-1.70],M.roof,.10);
    part='steps';box(-.65,.055,2.12,1.38,.11,.64,M.stone);box(-.65,.16,1.83,1.28,.20,.59,M.stone);box(-.65,.29,1.52,1.17,.30,.54,M.stone);
    part='chimney';box(-.12,4.83,-.85,.43,1.32,.44,M.stone);box(-.12,5.47,-.85,.58,.16,.58,M.stoneShade);box(-.12,5.58,-.85,.34,.10,.34,M.dark);
    part='cupola';box(1.40,3.57,-.45,.86,.64,.80,M.oak);box(1.4,3.91,-.45,1.0,.12,.94,M.honey);put(new THREE.SphereGeometry(.45,16,8,0,Math.PI*2,0,Math.PI/2),M.brass,1.4,3.98,-.45);put(new THREE.TorusGeometry(.45,.035,6,24),M.copper,1.4,3.99,-.45,Math.PI/2);ball(1.4,4.54,-.45,.07,M.brass);
    part='windmill';beam([-.95,4.93,.62],[-.95,5.98,.62],.072,M.copper);box(-.95,5.10,.62,.42,.12,.42,M.honey);beam([-1.35,4.56,.15],[-.95,5.68,.62],.04,M.dark);
    const rotor=new THREE.Group();rotor.name='anim:spin:z:0.65';rotor.position.set(-.95,6.02,.84);
    const rotorMaterial=M.honey;
    function rotorMesh(geo,mat,x=0,y=0,z=0,rz=0){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.z=rz;mesh.name='windmill-rotor-'+rotor.children.length;mesh.castShadow=true;mesh.userData.explodeWithParent=true;rotor.add(mesh);}
    for(let i=0;i<4;i++){const a=i*Math.PI/2+.36;const s=new THREE.Shape();s.moveTo(-.09,.20);s.lineTo(.09,.20);s.lineTo(.20,1.09);s.lineTo(-.20,1.09);s.closePath();rotorMesh(new THREE.ExtrudeGeometry(s,{depth:.065,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:1,steps:1}),rotorMaterial,0,0,0,a);}
    rotorMesh(new THREE.SphereGeometry(.19,12,7),M.brass,0,0,.09);
    const lights=[];
    function windowArch(x,y,z,w,h,ry=0,shutters=false){
      arch(x,y,z,w+.12,h+.12,.035,M.dark,ry);
      arch(...local(x,y,z,0,.065,.045,ry),w-.04,h-.02,.025,M.glass,ry);
      archFrame(...local(x,y,z,0,0,.07,ry),w+.16,h+.16,.09,.06,M.honey,ry);
      lbox(x,y,z,0,h*.48,.13,.043,h-.10,.035,M.oak,ry);
      lbox(x,y,z,0,h*.48,.13,w-.03,.045,.035,M.oak,ry);
      lbox(x,y,z,0,-.025,.11,w+.31,.10,.21,M.honey,ry);
      if(shutters)for(const s of [-1,1]){lbox(x,y,z,s*(w*.5+.18),h*.44,.055,.23,h*.91,.06,M.honey,ry);for(const v of [.12,.61])lbox(x,y,z,s*(w*.5+.18),v,.095,.23,.04,.025,M.dark,ry);}
    }
    function lantern(x,y,z,ry=0){
      const old=part;part='lanterns';lights.push(local(x,y,z,0,0,.22,ry));
      beam(local(x,y,z,0,.36,0,ry),local(x,y,z,0,.36,.22,ry),.025,M.dark);
      beam(local(x,y,z,0,.36,.22,ry),local(x,y,z,0,.21,.22,ry),.018,M.brass);
      lbox(x,y,z,0,0,.22,.16,.25,.16,M.glass,ry);
      for(const u of [-.105,.105])for(const o of [.115,.325])beam(local(x,y,z,u,-.155,o,ry),local(x,y,z,u,.16,o,ry),.013,M.copper);
      for(const v of [-.16,.16])lbox(x,y,z,0,v,.22,.26,.035,.26,M.brass,ry);
      put(new THREE.ConeGeometry(.20,.14,4),M.copper,...local(x,y,z,0,.245,.22,ry),0,Math.PI/4+ry);ball(...local(x,y,z,0,-.22,.22,ry),.035,M.brass);part=old;
    }
    if(PASS>=1){
      part='timber-frame';
      for(const x of [-2.08,.37,2.18])for(const z of [-1.46,1.29]){box(x,1.64,z,.16,2.58,.16,M.oak);box(x,.43,z,.29,.35,.29,M.stone);}
      for(const z of [-1.54,1.34]){
        for(const y of [.64,3.00])box(-.85,y,z,2.62,.14,.12,M.oak);
        for(const x of [-1.30,-.02])box(x,2.62,z,.13,.77,.13,M.honey);
        for(const side of [-1,1]){beam([-.85,5.10,z],[ -.85+side*1.52,2.96,z],.10,M.oak);beam([-.85,4.98,z],[-.85+side*1.48,2.97,z],.035,M.honey);}
        box(-.85,4.74,z,.13,.54,.13,M.oak);
        box(1.3,2.67,z,1.92,.14,.12,M.oak);
        beam([.27,3.57,z],[2.43,2.78,z],.08,M.oak);
        for(const x of [.44,2.16])beam([x,2.42,z],[x+(x<1?.24:-.24),2.67,z],.065,M.honey);
      }
      for(const x of [-2.11,.40,2.21]){box(x,.64,-.10,.12,.14,2.92,M.oak);box(x,x>1?2.67:3.00,-.10,.13,.16,2.99,M.oak);}
      for(const z of [-1.16,-.36,.44,1.20]){for(const x of [-2.16,.47])beam([x,2.71,z],[x+(x<0?-.18:.14),2.96,z],.062,M.honey);}
      part='door';arch(-.65,.40,1.31,1.05,1.98,.09,M.dark);arch(-.65,.42,1.40,.88,1.80,.045,M.honey);archFrame(-.65,.37,1.415,1.12,2.08,.115,.09,M.stone);
      for(let j=0;j<6;j++){const x=-1.00+j*.14;box(x,1.09,1.452,.007,1.25,.008,M.oak);}
      for(const y of [.72,1.69]){box(-.86,y,1.49,.36,.055,.035,M.dark);ball(-1.00,y,1.515,.022,M.brass);}
      box(-.65,1.68,1.477,.22,.22,.025,M.brass,0,0,Math.PI/4);box(-.65,1.68,1.494,.145,.145,.022,M.glass,0,0,Math.PI/4);
      ring(-.39,1.05,1.53,.068,.016,M.brass);ball(-.39,1.12,1.52,.035,M.brass);
      // Small tiled door hood, with real braces embedded in the wall.
      quad([-1.34,2.59,1.26],[-1.34,2.45,1.83],[.04,2.45,1.83],[.04,2.59,1.26],M.roof,.065);
      for(const x of [-1.25,-.05]){box(x,2.42,1.55,.11,.13,.63,M.honey);beam([x,2.39,1.73],[x,2.12,1.35],.047,M.oak);}
      part='front-windows';windowArch(-1.65,.90,1.31,.60,1.14);windowArch(-.85,3.40,1.315,.70,1.10,0,true);
      windowArch(2.215,1.05,-.02,.65,1.04,Math.PI/2);
      part='rear-windows';windowArch(-.85,3.40,-1.515,.70,1.10,Math.PI,true);windowArch(-1.10,1.07,-1.515,.72,1.18,Math.PI);windowArch(-2.115,1.15,-.42,.74,1.18,-Math.PI/2);
      part='portholes';
      for(const z of [1.365,-1.56]){
        put(new THREE.CylinderGeometry(.56,.56,.045,32),M.glass,1.46,1.67,z,Math.PI/2);
        ring(1.46,1.67,z,.575,.070,M.copper);ring(1.46,1.67,z+(z>0?.02:-.02),.518,.023,M.dark);
        box(1.46,1.67,z,.047,1.00,.10,M.oak);box(1.46,1.67,z,1.00,.047,.10,M.oak);
        for(let j=0;j<12;j++){const a=j*Math.PI/6;ball(1.46+Math.cos(a)*.58,1.67+Math.sin(a)*.58,z+(z>0?.055:-.055),.032,M.brass,1,1,.50);}
      }
      part='cupola';
      // Braced open pedestal covers the blockout cube with a dark inset.
      for(const z of [-.862,-.038]){box(1.4,3.60,z,.69,.42,.025,M.dark);for(const side of [-1,1])beam([1.08,3.36,z],[1.72,3.83,z],.038,M.honey);}
      for(const x of [1.00,1.80])box(x,3.6,-.45,.10,.60,.84,M.honey);
      for(const z of [-.86,-.04])box(1.4,3.84,z,.86,.08,.08,M.honey);
      for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const x=1.4+Math.sin(a)*.43,z=-.45+Math.cos(a)*.43;put(new THREE.CylinderGeometry(.108,.108,.04,16),M.cyan,x,4.16,z,Math.PI/2,a);ring(x,4.16,z,.123,.026,M.copper,a,16);}
      lantern(-2.12,1.90,1.32);lantern(.03,1.88,1.33);lantern(2.23,1.94,.83,Math.PI/2);lantern(-1.86,1.98,-1.55,Math.PI);lantern(.92,1.07,1.43);
    }
    function leaf(x,y,z,s,m,ry=0,rz=0){
      const edge=[[-.065,.025,0],[0,.17,0],[.065,.025,0],[.045,-.04,0],[0,-.08,0],[-.045,-.04,0]],v=[];
      for(let j=0;j<edge.length;j++){const a=edge[j],b=edge[(j+1)%edge.length];v.push(0,.018,.025,...b,...a,0,.018,-.012,...a,...b);}
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(v,3));q.scale(s,s,s);q.computeVertexNormals();put(q,m,x,y,z,0,ry,rz);
    }
    function flowers(x,y,z,w,ry=0){
      const old=part;part='flowerboxes';lbox(x,y,z,0,0,0,w,.19,.27,M.oak,ry);lbox(x,y,z,0,.10,.025,w+.07,.045,.32,M.honey,ry);
      for(const u of [-w*.33,w*.33]){lbox(x,y,z,u,-.13,-.015,.07,.22,.27,M.honey,ry);beam(local(x,y,z,u,-.22,-.12,ry),local(x,y,z,u,-.08,.10,ry),.025,M.oak);}
      for(let j=0;j<Math.ceil(w/.12);j++){const u=-w*.43+j*.12;for(const s of [-1,1])leaf(...local(x,y,z,u+s*.022,.12,.09,ry),.92,j%3?M.leaf:M.leafLight,ry,s*(.6+(j%3)*.18));const q=local(x,y,z,u,.21+(j%3)*.045,.10,ry),col=j%3===0?M.lavender:j%3===1?M.pink:M.plaster;
        for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ball(q[0]+Math.cos(a)*.057,q[1]+Math.sin(a)*.057,q[2],.039,col,1,1,.60,6);}ball(q[0],q[1],q[2]+.024,.025,M.brass,1,1,.6,6);
      }
      part=old;
    }
    function vine(x,z,ry=0,h=2.6){
      const old=part;part='vines';const p=[];for(let j=0;j<=10;j++)p.push(local(x,.4,z,Math.sin(j*1.2)*.09,j*h/10,.06,ry));tube(p,.018,M.leaf,24);
      for(let j=0;j<22;j++){const yy=.42+j*h/22,u=Math.sin(j*.8)*.13,s=j%2?1:-1;for(const t of [-1,1])leaf(...local(x,yy,z,u+t*.055,0,.085,ry),1.05+(j%3)*.14,j%3?M.leaf:M.leafLight,ry,t*(.7+(j%3)*.14));if(j%4===0){const q2=local(x,yy,z,u+s*.15,.02,.11,ry);for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ball(q2[0]+Math.cos(a)*.054,q2[1]+Math.sin(a)*.054,q2[2],.040,j%8?M.pink:M.plaster,1,1,.65,6);}ball(q2[0],q2[1],q2[2]+.03,.021,M.brass);}}
      for(let j=0;j<3;j++){const p=local(x,.4+h,z,.10+j*.085,-j*.06,.12,ry);for(let k=0;k<6-j;k++)ball(p[0],p[1]-.06*k,p[2],.054-k*.005,M.lavender,1,1.25,.8,6);}
      part=old;
    }
    function gear(x,y,z,r,teeth){
      ring(x,y,z,r*.74,r*.16,M.copper,0,24);ring(x,y,z,r*.74,r*.05,M.brass,0,24);
      for(let j=0;j<teeth;j++){const a=j*Math.PI*2/teeth;box(x+Math.cos(a)*r*.94,y+Math.sin(a)*r*.94,z,r*.24,r*.20,.085,M.brass,0,0,a);}
      for(let j=0;j<5;j++){const a=j*Math.PI*2/5;beam([x,y,z],[x+Math.cos(a)*r*.68,y+Math.sin(a)*r*.68,z],.028,M.copper);}
      put(new THREE.CylinderGeometry(r*.21,r*.21,.12,8),M.brass,x,y,z,Math.PI/2);ball(x,y,z+.08,.037,M.dark);
    }
    if(PASS>=2){
      // Staggered tile geometry remains readable in the fake-kit preview as well as the host.
      part='main-roof';
      for(const side of [-1,1])for(let row=0;row<9;row++)for(let col=-1;col<11;col++){
        const t0=row/9,t1=Math.min(1.01,(row+1.11)/9),z0=Math.max(-1.74,-1.74+col*.33+(row%2)*.165),z1=Math.min(1.56,-1.74+(col+1)*.33+(row%2)*.165-.013);if(z1-z0<.025)continue;
        const x0=-.85+side*1.53*t0,x1=-.85+side*1.53*t1,up=.035+(9-row)*.004;
        quad([x0,5.10-2.14*t0+up,z0],[x0,5.10-2.14*t0+up,z1],[x1,5.10-2.14*t1+up,z1],[x1,5.10-2.14*t1+up,z0],(row+col*2)%9===0?M.roofLight:M.roof,.045);
      }
      for(let j=0;j<11;j++){beam([-.85,5.16,-1.74+j*.30],[-.85,5.16,-1.74+j*.30+.285],.10,M.roofLight,.10,8);}
      part='workshop-roof';
      for(let row=0;row<6;row++)for(let col=-1;col<11;col++){const t0=row/6,t1=Math.min(1.01,(row+1.10)/6),z0=Math.max(-1.70,-1.7+col*.325+(row%2)*.1625),z1=Math.min(1.55,-1.7+(col+1)*.325+(row%2)*.1625-.012);if(z1-z0<.02)continue;quad([.24+2.19*t0,3.59-.81*t0+.045,z0],[.24+2.19*t0,3.59-.81*t0+.045,z1],[.24+2.19*t1,3.59-.81*t1+.045,z1],[.24+2.19*t1,3.59-.81*t1+.045,z0],(row+col*2)%8===0?M.roofLight:M.roof,.04);}
      part='door';for(let row=0;row<2;row++)for(let j=0;j<5;j++){const x0=-1.34+j*.276,x1=x0+.262,z0=1.26+row*.29,z1=z0+.31;quad([x0,2.59-row*.071+.032,z0],[x0,2.59-(row+1)*.071+.032,z1],[x1,2.59-(row+1)*.071+.032,z1],[x1,2.59-row*.071+.032,z0],j%3?M.roof:M.roofLight,.038);}
      part='foundation';
      for(const z of [-1.78,1.62])for(let row=0;row<2;row++)for(let j=0;j<13;j++){const x=-2.16+j*.36;if(z>0&&x> -1.36&&x<.08)continue;box(x,-.065+row*.195,z,.345,.181,.045,(j+row)%4?M.stone:M.stoneShade);}
      for(const x of [-2.385,2.345])for(let row=0;row<2;row++)for(let j=0;j<9;j++)box(x,-.065+row*.195,-1.57+j*.36,.035,.181,.34,(j+row)%4?M.stone:M.stoneShade);
      part='chimney';for(let j=0;j<6;j++){box(-.12,4.28+j*.195,-.622,.44,.012,.015,M.stoneShade);box(.105,4.28+j*.195,-.85,.015,.012,.44,M.stoneShade);box(-.12+(j%2?.08:-.08),4.37+j*.195,-.622,.012,.17,.015,M.stoneShade);}box(-.12,5.641,-.85,.25,.018,.25,M.dark);
      part='copper-pipes';
      tube([[.44,.62,1.53],[.36,.75,1.53],[.36,1.08,1.53],[.29,1.17,1.53],[.29,2.70,1.53],[.36,2.85,1.53],[.47,2.91,1.53],[.47,3.20,1.53]],.057,M.copper,30);
      for(const y of [.83,1.9,2.62,3.14])put(new THREE.CylinderGeometry(.079,.079,.075,8),M.brass,y>2.8?.47:.29,y,1.53);
      put(new THREE.CylinderGeometry(.155,.155,.56,12),M.copper,.49,1.37,1.62);ball(.49,1.68,1.62,.155,M.brass,1,.45,1);ball(.49,1.07,1.62,.155,M.copper,1,.45,1);
      for(const y of [1.13,1.61]){put(new THREE.CylinderGeometry(.173,.173,.054,12),M.brass,.49,y,1.62);for(let j=0;j<8;j++){const a=j*Math.PI/4;ball(.49+Math.sin(a)*.17,y,1.62+Math.cos(a)*.17,.022,M.copper);}}
      ball(.49,1.37,1.776,.075,M.cyan,1,1,.5);ring(.49,1.37,1.798,.081,.018,M.brass);
      tube([[2.22,.24,-1.08],[2.25,.43,-1.08],[2.25,2.53,-1.08],[2.30,2.66,-1.08]],.048,M.copper,20);
      tube([[.40,.60,-1.59],[.40,.79,-1.62],[.48,.88,-1.62],[.48,2.42,-1.62],[.37,2.57,-1.62],[.37,3.1,-1.62]],.049,M.copper,24);
      for(const y of [.53,1.25,2.20])put(new THREE.CylinderGeometry(.065,.065,.065,8),M.brass,2.25,y,-1.08);
      part='gears';gear(.57,2.27,1.52,.245,12);gear(.76,2.68,1.52,.165,10);gear(.78,.99,1.69,.14,10);
      // Hand-crank workshop lamp mechanism, not a printed emblem.
      beam([.78,.99,1.72],[.78,.99,1.89],.034,M.copper);beam([.78,.99,1.89],[.89,1.14,1.89],.032,M.brass);beam([.89,1.14,1.89],[.89,1.14,2.0],.04,M.dark);
      part='workbench';box(1.43,.82,1.66,1.30,.12,.48,M.honey);for(const x of [.89,1.97]){box(x,.48,1.67,.10,.60,.35,M.oak);beam([x,.38,1.46],[x,.77,1.82],.045,M.honey);}box(1.48,.37,1.65,.70,.42,.35,M.oak);for(const y of [.19,.55])box(1.48,y,1.844,.74,.04,.04,M.honey);for(const x of [1.15,1.81])box(x,.37,1.843,.045,.38,.04,M.brass);box(1.48,.39,1.875,.12,.07,.025,M.dark);
      flowers(-1.65,.79,1.46,.78);flowers(-.85,3.30,1.47,.89);flowers(-.85,3.30,-1.67,.89,Math.PI);flowers(-1.10,.96,-1.67,.91,Math.PI);flowers(2.36,.94,-.02,.84,Math.PI/2);flowers(1.50,.94,1.66,.94);flowers(-2.27,1.03,-.42,.90,-Math.PI/2);
      vine(-2.02,1.39,0,2.5);vine(-.20,-1.58,Math.PI,3.3);vine(2.23,-1.19,Math.PI/2,2.0);
      // Blade bands, plank seams and rivets stay children of the actual animated rotor.
      for(let j=0;j<4;j++){const a=j*Math.PI/2+.36;const rot=(x,y)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];let p=rot(0,.35);rotorMesh(new THREE.BoxGeometry(.23,.09,.085),M.copper,...p,.045,a);for(const u of [-.07,.07]){p=rot(u,.35);rotorMesh(new THREE.SphereGeometry(.024,6,4),M.brass,...p,.10);}for(const u of [-.06,.06]){p=rot(u,.70);rotorMesh(new THREE.BoxGeometry(.009,.61,.01),M.oak,...p,.071,a);}}
      for(let j=0;j<8;j++){const a=j*Math.PI/4;rotorMesh(new THREE.SphereGeometry(.025,6,4),M.copper,.16*Math.cos(a),.16*Math.sin(a),.19);}
    }
    // Merge only within the animated rotor: four palette buckets, one intact moving assembly.
    if(PASS>=2){
      const rotorBatches=new Map();
      for(const m of rotor.children){m.updateMatrix();const q=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();q.applyMatrix4(m.matrix);if(!rotorBatches.has(m.material))rotorBatches.set(m.material,[]);rotorBatches.get(m.material).push(q);m.geometry.dispose();}
      rotor.clear();
      for(const [mat,geos] of rotorBatches){const count=geos.reduce((s,q)=>s+q.attributes.position.count,0),v=new Float32Array(count*3),n=new Float32Array(count*3);let off=0;for(const q of geos){v.set(q.attributes.position.array,off*3);n.set(q.attributes.normal.array,off*3);off+=q.attributes.position.count;q.dispose();}const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.BufferAttribute(v,3));q.setAttribute('normal',new THREE.BufferAttribute(n,3));const m=new THREE.Mesh(q,mat);m.name='windmill-rotor-'+Object.keys(M).find(k=>M[k]===mat);m.castShadow=true;m.userData.explodeWithParent=true;rotor.add(m);}
    }
    // Named, material-batched assemblies preserve selection and sensible action pivots.
    for(const b of batches.values()){
      if(!parts[b.part]){const p=new THREE.Group();p.name=b.part;p.position.fromArray(pivots[b.part]||[0,0,0]);p.userData={componentId:b.part,selectable:true,destruction:{breakable:false,fractureGroup:b.part},collider:{type:'box'}};parts[b.part]=p;g.add(p);}
      const p=parts[b.part];let count=0;for(const q of b.geos)count+=q.attributes.position.count;
      const pos=new Float32Array(count*3),norm=new Float32Array(count*3),uv=new Float32Array(count*2);let off=0;
      for(const q of b.geos){q.translate(-p.position.x,-p.position.y,-p.position.z);pos.set(q.attributes.position.array,off*3);norm.set(q.attributes.normal.array,off*3);if(q.attributes.uv)uv.set(q.attributes.uv.array,off*2);off+=q.attributes.position.count;q.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(norm,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.computeBoundingSphere();
      const mesh=new THREE.Mesh(geo,b.mat);mesh.name=b.part+'-'+Object.keys(M).find(k=>M[k]===b.mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.explodeWithParent=true;p.add(mesh);
    }
    // Rotor is local to its own rotation centre, never batched into stationary architecture.
    if(parts.windmill){parts.windmill.add(rotor);rotor.position.sub(parts.windmill.position);}
    // Runtime targets are serializable IDs. Hidden socket nodes add no geometry or lighting.
    const socketDefs={door:[-.65,.42,1.34],rotor:[-.95,6.02,.84],smoke:[-.12,5.64,-.85]};
    for(const [id,pos] of Object.entries(socketDefs)){const socket=new THREE.Object3D();socket.name='socket:'+id;socket.position.fromArray(pos);g.add(socket);}
    g.updateMatrixWorld(true);
    for(const p of Object.values(parts)){const b=new THREE.Box3().setFromObject(p),center=b.getCenter(new THREE.Vector3()).sub(p.position);p.userData.collider={type:'box',center:center.toArray(),size:b.getSize(new THREE.Vector3()).toArray(),isTrigger:false};p.userData.explodable=true;}
    g.userData={door:[-.65,2.12],cols:[[-2.11,-1.51,.40,1.32],[.40,-1.51,2.24,1.94]],mailbox:[-1.90,1.95],lights,smoke:[-.12,5.64,-.85],sculptRuntime:{root:g.name,components:Object.keys(parts),animationPivots:[rotor.name],sockets:{door:[-.65,.42,1.34],rotor:[-.95,6.02,.84],smoke:[-.12,5.64,-.85]},destructionGroups:Object.keys(parts),colliderSource:'cols'}};
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
