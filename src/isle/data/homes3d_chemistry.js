/* 晶晶的玻璃溫室茶實驗屋。正面 +Z；kit-only，無貼圖／燈光物件。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['home_chemistry'] = function (THREE, kit) {
    const STAGE = 3;
    const g = new THREE.Group(); g.name = 'home-chemistry-glass-tea-laboratory';
    const M = {
      plaster: kit.mat('#f6f1e4', { roughness: .92 }, 'stone'),
      stone: kit.mat('#d8c8ac', { roughness: .94 }, 'stone'),
      wood: kit.mat('#a77648', { roughness: .8 }, 'wall'),
      dark: kit.mat('#68482f', { roughness: .87 }, 'wall'),
      roof: kit.mat('#4f8f7a', { roughness: .84 }, 'roof'),
      mint: kit.mat('#62c9a0', { roughness: .43, metalness: .30 }),
      clear: kit.mat('#d8fff0', { roughness: .08, metalness: .02, transparent: true, opacity: .19, depthWrite: false, side: THREE.DoubleSide }),
      pink: kit.mat('#ff9ec4', { roughness: .36 }),
      amber: kit.mat('#ffc66b', { roughness: .33 }),
      aqua: kit.mat('#8fe3c8', { roughness: .34 }),
      copper: kit.mat('#b8763d', { roughness: .26, metalness: .72 }),
      leaf: kit.mat('#5d874e', { roughness: .94 }),
      leafLight: kit.mat('#93b55f', { roughness: .94 }),
      lavender: kit.mat('#b8a0dc', { roughness: .86 }),
      cream: kit.mat('#fff2ce', { roughness: .88 }),
      glow: kit.win()
    };
    const batches = new Map(); let part = 'foundation';
    function add(geo, mat, x=0,y=0,z=0,rx=0,ry=0,rz=0) {
      const q = geo.index ? geo.toNonIndexed() : geo.clone(); geo.dispose();
      q.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)), new THREE.Vector3(1,1,1)));
      if (!q.attributes.normal) q.computeVertexNormals();
      const key = part + '|' + mat.uuid;
      if (!batches.has(key)) batches.set(key, { part, mat, geos: [] });
      batches.get(key).geos.push(q);
    }
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0) { add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz); }
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1,n=8) { const q=new THREE.SphereGeometry(r,n,n<=7?3:5);q.scale(sx,sy,sz);add(q,m,x,y,z); }
    function cyl(x,y,z,rt,rb,h,m,n=12) { add(new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z); }
    function beam(a,b,r,m,n=6) { const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),q=new THREE.CylinderGeometry(r,r,v.length(),n);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));add(q,m,...A.add(B).multiplyScalar(.5).toArray()); }
    function tube(pts,r,m,n=24) { add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),n,r,6,false),m); }
    function profile(points,depth,x,y,z,m,ry=0,bevel=0) { const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();add(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:8,steps:1}),m,x,y,z,0,ry); }
    function archPoints(w,h) { const r=w/2,p=[[-r,0],[r,0],[r,h-r]];for(let j=1;j<=12;j++){const a=j*Math.PI/12;p.push([r*Math.cos(a),h-r+r*Math.sin(a)]);}return p; }
    function arch(x,y,z,w,h,d,m,ry=0) { profile(archPoints(w,h),d,x,y,z,m,ry,.005); }
    function archRing(x,y,z,w,h,t,m,ry=0) { const s=new THREE.Shape(archPoints(w,h).map(p=>new THREE.Vector2(...p)));s.holes.push(new THREE.Path(archPoints(w-2*t,h-2*t).map(p=>new THREE.Vector2(p[0],p[1]+t)).reverse()));add(new THREE.ExtrudeGeometry(s,{depth:.075,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,curveSegments:8}),m,x,y,z,0,ry); }
    function quad(a,b,c,d,m,th=.04) { if((c[2]-a[2])*(b[0]-a[0])-(c[0]-a[0])*(b[2]-a[2])<0){const q=b;b=d;d=q;}const v=[a,b,c,d,...[a,b,c,d].map(p=>[p[0],p[1]-th,p[2]])],out=[];for(const t of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])for(const k of t)out.push(...v[k]);const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(out,3));q.computeVertexNormals();add(q,m); }
    function ring(cx,y,cz,r,t,m) { const q=new THREE.TorusGeometry(r,t,6,40);add(q,m,cx,y,cz,Math.PI/2); }
    // BLOCKOUT: left gabled cottage and lower, broad transparent greenhouse.
    box(-.92,.17,-.16,2.24,.34,2.86,M.stone);
    part='cottage';box(-.92,1.53,-.16,2.13,2.42,2.71,M.plaster);
    profile([[-1.065,0],[1.065,0],[0,2.12]],2.71,-.92,2.74,-1.515,M.plaster);
    part='main-roof';
    for(const s of [-1,1]) {
      quad([-.92,4.94,-1.72],[-.92+s*1.25,2.73,-1.72],[-.92+s*1.25,2.73,1.40],[-.92,4.94,1.40],M.roof,.10);
    }
    part='greenhouse';cyl(1.02,.23,-.12,1.31,1.33,.46,M.stone,40);
    add(new THREE.CylinderGeometry(1.30,1.30,1.84,40,1,true),M.clear,1.02,1.36,-.12);
    const dome=new THREE.SphereGeometry(1.30,40,16,0,Math.PI*2,0,Math.PI/2);dome.scale(1,1.12,1);add(dome,M.clear,1.02,2.28,-.12);
    part='door';arch(-.74,.31,1.204,.90,1.80,.09,M.wood);
    part='steps';box(-.74,.105,1.73,1.14,.21,.60,M.stone);box(-.74,.245,1.47,1.10,.17,.42,M.plaster);
    part='tea-stall';box(1.08,.56,1.48,1.52,.91,.58,M.wood);
    // STRUCTURE: independent selectable assemblies, windows, ribs and equipment.
    function windowArch(x,y,z,w,h,ry=0) {
      const local=(u,v,d)=>[x+u*Math.cos(ry)+d*Math.sin(ry),y+v,z-u*Math.sin(ry)+d*Math.cos(ry)];
      arch(...local(0,0,0),w+.09,h+.07,.04,M.dark,ry);arch(...local(0,.045,.045),w-.06,h-.055,.025,M.glow,ry);
      archRing(...local(0,-.025,.06),w+.20,h+.16,.09,M.stone,ry);archRing(...local(0,.025,.13),w+.02,h+.015,.037,M.wood,ry);
      beam(local(0,.09,.205),local(0,h-.04,.205),.022,M.wood);
      beam(local(-w*.41,h*.48,.205),local(w*.41,h*.48,.205),.018,M.wood);
      box(...local(0,-.065,.08),w+.25,.09,.21,M.wood,0,ry);
    }
    function bottle(x,y,z,s,m,lit=false) {
      const pts=[[0,0],[.085,0],[.115,.035],[.124,.105],[.104,.19],[.046,.245],[.039,.33],[.050,.34],[.050,.365],[0,.365]].map(p=>new THREE.Vector2(p[0]*s,p[1]*s));
      add(new THREE.LatheGeometry(pts,10),lit?M.clear:m,x,y,z);cyl(x,y+.374*s,z,.041*s,.041*s,.035*s,M.wood,8);
      if(lit){ball(x,y+.10*s,z,.093*s,m,1,.8,1,8);ball(x,y+.18*s,z,.070*s,M.glow,.8,.9,.8,7);}
    }
    function lantern(x,y,z,s=1) {
      box(x,y,z,.16*s,.24*s,.16*s,M.glow);
      for(const dx of [-.09,.09])for(const dz of [-.09,.09])box(x+dx*s,y,z+dz*s,.022*s,.28*s,.022*s,M.copper);
      add(new THREE.ConeGeometry(.16*s,.13*s,4),M.copper,x,y+.20*s,z,0,Math.PI/4);
      box(x,y-.155*s,z,.21*s,.05*s,.21*s,M.copper);tube([[x,y+.25*s,z],[x,y+.36*s,z],[x-.10*s,y+.40*s,z]],.018*s,M.dark,8);
    }
    if(STAGE>=1) {
      part='timber-frame';
      for(const x of [-1.96,.12])for(const z of [-1.48,1.18])box(x,1.55,z,.15,2.42,.16,M.wood);
      for(const z of [-1.56,1.24]) {
        for(const y of [.40,2.70])box(-.92,y,z,2.20,.14,.13,M.wood);
        beam([-1.99,2.71,z],[-.92,4.83,z],.072,M.wood);beam([.15,2.71,z],[-.92,4.83,z],.072,M.wood);
        box(-.92,4.47,z,.12,.74,.14,M.wood);box(-.92,3.03,z,1.90,.14,.14,M.wood);
      }
      for(const x of [-2.04,.20])for(const y of [.40,2.70])box(x,y,-.16,.12,.14,2.88,M.wood);
      // Continuous roof edge timbers emphasize the soft overhang.
      for(const z of [-1.74,1.42])for(const s of [-1,1])beam([-.92,4.96,z],[-.92+s*1.26,2.76,z],.065,M.dark);
      for(const x of [-2.17,.33])box(x,2.71,-.16,.13,.16,3.18,M.wood);
      part='door';archRing(-.74,.285,1.29,1.16,2.02,.13,M.stone);archRing(-.74,.32,1.385,.94,1.83,.043,M.dark);
      add(new THREE.TorusGeometry(.061,.012,6,14),M.dark,-.93,1.03,1.455);ball(-.93,1.105,1.45,.028,M.copper);
      for(const y of [.78,1.51])box(-.54,y,1.425,.23,.044,.04,M.dark);
      part='front-windows';windowArch(-1.62,.76,1.204,.42,1.04);windowArch(-.92,3.18,1.204,.58,1.03);
      part='rear-windows';windowArch(-.92,3.18,-1.52,.58,1.03,Math.PI);windowArch(-1.02,.83,-1.52,.65,1.12,Math.PI);
      windowArch(-2.006,.90,-.52,.54,1.03,-Math.PI/2);
      part='main-roof';quad([-1.40,2.38,1.27],[-.10,2.38,1.27],[-.10,2.19,1.73],[-1.40,2.19,1.73],M.roof,.065);
      part='timber-frame';for(const x of [-1.34,-.16]){box(x,2.17,1.27,.09,.33,.12,M.wood);beam([x,2.01,1.28],[x,2.24,1.64],.043,M.wood);}
      part='chimney';box(-.40,4.39,-.79,.34,1.56,.37,M.plaster);box(-.40,5.14,-.79,.46,.16,.48,M.stone);box(-.40,5.245,-.79,.27,.08,.28,M.dark);
      part='greenhouse-frame';
      for(const y of [.47,1.36,2.28])ring(1.02,y,-.12,1.31,.037,M.mint);
      for(let j=0;j<12;j++) {
        const a=j*Math.PI/6,px=1.02+1.31*Math.cos(a),pz=-.12+1.31*Math.sin(a);
        beam([px,.43,pz],[px,2.30,pz],.038,M.mint,8);
        const points=[];for(let k=0;k<=12;k++){const t=k*Math.PI/24;points.push([1.02+1.31*Math.cos(t)*Math.cos(a),2.28+1.46*Math.sin(t),-.12+1.31*Math.cos(t)*Math.sin(a)]);}tube(points,.035,M.mint,24);
      }
      ring(1.02,3.13,-.12,1.062,.027,M.mint);ring(1.02,3.57,-.12,.58,.025,M.mint);
      cyl(1.02,3.76,-.12,.22,.22,.10,M.mint,12);cyl(1.02,3.85,-.12,.055,.08,.10,M.mint,8);ball(1.02,3.97,-.12,.10,M.mint);
      part='bottle-shelves';
      for(const x of [.50,1.99])box(x,1.23,-.63,.065,1.70,.065,M.wood);
      for(const y of [.51,1.05,1.60,2.12]){box(1.25,y,-.63,1.63,.07,.30,M.wood);box(1.25,y+.045,-.80,1.63,.07,.04,M.dark);}
      part='bottles';for(let row=0;row<3;row++)for(let j=0;j<6;j++)bottle(.62+j*.25,.55+row*.55,-.62,.64+(j%3)*.05,[M.pink,M.amber,M.aqua][(j+row)%3]);
      part='tea-stall';
      box(1.08,1.045,1.48,1.67,.12,.72,M.dark);box(1.08,1.112,1.48,1.70,.035,.74,M.wood);
      for(const x of [.28,1.88])box(x,1.21,1.39,.065,2.10,.065,M.wood);
      quad([.21,2.24,1.13],[1.95,2.24,1.13],[1.95,2.11,1.96],[.21,2.11,1.96],M.cream,.035);
      part='bottles';for(let j=0;j<4;j++)bottle(.60+j*.29,1.13,1.53,.75,[M.amber,M.pink,M.aqua][j%3]);
      part='distiller';const dz=STAGE>=2?1.34:-.36;
      box(-2.22,.44,dz,.54,.88,.66,M.stone);box(-2.22,.90,dz,.62,.09,.73,M.plaster);
      cyl(-2.22,1.12,dz,.26,.27,.35,M.copper,16);ball(-2.22,1.27,dz,.26,M.copper,1,.68,1,16);cyl(-2.22,1.49,dz,.075,.13,.16,M.copper);
      tube([[-2.22,1.52,dz],[-2.43,1.78,dz],[-2.43,2.40,dz],[-2.26,2.58,dz],[-1.98,2.53,dz]],.055,M.copper,28);
      ring(-2.22,1.12,dz,.274,.022,M.copper);
      part='bottle-lights';tube([[.22,2.78,1.34],[.70,2.59,1.54],[1.18,2.58,1.58],[1.65,2.78,1.36]],.014,M.dark,30);
      for(const [x,y,z,s,m,top] of [[.22,2.36,1.36,.86,M.aqua,2.78],[.69,2.28,1.57,.86,M.pink,2.60],[1.17,2.27,1.60,.86,M.amber,2.59],[1.65,2.36,1.37,.86,M.aqua,2.78]]) {bottle(x,y,z,s,m,true);beam([x,y+.34*s,z],[x,top,z],.012,M.copper);}
      part='lanterns';lantern(-.25,1.87,1.47,.72);lantern(1.02,2.76,-.12,.95);lantern(1.65,1.75,-1.20,.7);
    }
    function flower(x,y,z,s=1,m=M.pink) {for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ball(x+Math.cos(a)*.052*s,y+Math.sin(a)*.052*s,z,.039*s,m,1,1,.55,6);}ball(x,y,z+.016*s,.025*s,M.amber,1,1,.50,6);}
    function leaf(x,y,z,s=1,flip=1) {ball(x,y,z,.112*s,flip>0?M.leaf:M.leafLight,1,.45,.60,6);}
    function planter(x,y,z,w=.63) {
      part='flowerboxes';box(x,y,z,w,.20,.28,M.dark);box(x,y+.10,z,w+.05,.05,.32,M.wood);
      for(const dx of [-w*.37,w*.37]){box(x+dx,y,z+.16,.045,.24,.035,M.wood);beam([x+dx,y-.08,z],[x+dx,y-.23,z-.12],.025,M.dark);}
      const facing=z<0?-1:1;
      for(let j=0;j<7;j++){const xx=x-w*.40+j*w*.13,yy=y+.19+.035*Math.sin(j*2.1);leaf(xx,yy,z,.95,j%2?1:-1);leaf(xx,yy-.07,z+facing*.15,.75,-1);if(j%2===0)flower(xx,yy+.055,z+facing*.14,.85,j%3?M.pink:M.cream);}
    }
    function vine(points,flowers=true) {
      part='vines';tube(points,.018,M.leaf,24);
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
      const facing=points[0][2]<-1.4?-1:1;
      for(let j=0;j<18;j++){const p=curve.getPoint(j/17),side=j%2?1:-1;leaf(p.x+side*.075,p.y+.025,p.z+facing*.012,.85,side);leaf(p.x-side*.035,p.y-.055,p.z+facing*.045,.70,-side);if(flowers&&j%3===0)flower(p.x+side*.075,p.y,p.z+facing*.088,.92,j%6?M.lavender:M.cream);}
    }
    if(STAGE>=2) {
      part='main-roof';
      const roofY=t=>4.975-2.21*t+.035*Math.pow(t,6);
      for(const s of [-1,1])for(let row=0;row<10;row++)for(let j=-1;j<12;j++) {
        const t0=row/10,t1=Math.min(1.012,(row+1.12)/10),z0=Math.max(-1.74,-1.74+j*.285+(row%2)*.142),z1=Math.min(1.43,-1.74+(j+1)*.285+(row%2)*.142-.008);if(z1-z0<.035)continue;
        const up=.023+(10-row)*.002;
        quad([-.92+s*1.25*t0,roofY(t0)+up,z0],[-.92+s*1.25*t1,roofY(t1)+up,z0],[-.92+s*1.25*t1,roofY(t1)+up,z1],[-.92+s*1.25*t0,roofY(t0)+up,z1],M.roof,.035);
      }
      for(let j=0;j<13;j++){const zz=-1.65+j*.25;box(-.92,4.99,zz,.19,.09,.265,M.roof,0,0,Math.PI/4);}
      // A readable layered eave and corner corbels avoid razor-thin roof edges.
      part='timber-frame';for(const z of [-1.56,1.25])for(const x of [-1.93,.09]){box(x,2.62,z,.23,.26,.23,M.wood);beam([x,2.43,z],[x,2.68,z+(z>0?.18:-.18)],.046,M.wood);}
      part='door';for(let j=0;j<6;j++)box(-1.105+j*.146,1.02,1.409,.010,1.25,.016,M.dark);
      for(let j=0;j<10;j++){const a=j*Math.PI/9;box(-.74+.52*Math.cos(a),1.735+.52*Math.sin(a),1.415,.035,.12,.08,M.plaster,0,0,a-Math.PI/2);}
      part='chimney';for(let row=0;row<7;row++){const y=3.65+row*.21;for(const z of [-.985,-.595])box(-.40,y,z,.35,.012,.008,M.stone);for(const x of [-.575,-.225])box(x,y,-.79,.008,.012,.37,M.stone);if(row%2)box(-.41,y+.10,-.987,.012,.20,.009,M.stone);}
      part='greenhouse-frame';
      for(let j=0;j<12;j++) {
        const a=j*Math.PI/6,b=(j+1)*Math.PI/6,mid=(a+b)/2,points=[];
        for(let k=0;k<=16;k++){const t=k/16,aa=a+(b-a)*t;points.push([1.02+1.313*Math.cos(aa),1.84+.42*Math.sin(Math.PI*t),-.12+1.313*Math.sin(aa)]);}tube(points,.025,M.mint,16);
        for(const y of [.48,1.36,2.28])ball(1.02+1.343*Math.cos(a),y,-.12+1.343*Math.sin(a),.027,M.copper,1,1,1,6);
        if(j===1||j===4||j===10){part='flowerboxes';const xx=1.02+1.02*Math.cos(mid),zz=-.12+1.02*Math.sin(mid);cyl(xx,2.01,zz,.13,.095,.17,M.wood,8);for(const u of [-.10,.10])beam([xx+u,2.10,zz],[xx,2.43,zz],.009,M.dark);for(let k=0;k<5;k++){const q=k*Math.PI*2/5;leaf(xx+.11*Math.cos(q),2.12,zz+.11*Math.sin(q),.9,k%2);flower(xx+.11*Math.cos(q),2.14,zz+.11*Math.sin(q)+.03,.55,k%2?M.cream:M.pink);}part='greenhouse-frame';}
      }
      // Front and rear plantings remain out of the entrance and mailbox reserves.
      planter(-.92,3.14,1.47,.78);planter(-.92,3.14,-1.68,.78);
      planter(-1.64,.31,1.52,.57);planter(-1.10,.37,-1.81,.75);
      vine([[-1.92,.35,1.34],[-1.88,1.30,1.35],[-1.78,2.24,1.35],[-1.55,2.80,1.36],[-1.32,3.42,1.35]]);
      vine([[-.09,.42,1.34],[-.10,1.20,1.36],[-.07,2.08,1.32],[.00,2.57,1.35]]);
      vine([[-1.86,.42,-1.62],[-1.89,1.43,-1.63],[-1.73,2.60,-1.64],[-1.43,3.35,-1.65]]);
      vine([[.05,.47,-1.62],[.07,1.60,-1.63],[-.13,2.60,-1.64],[-.44,3.32,-1.65]]);
      vine([[2.22,.46,.32],[2.28,1.32,.35],[2.17,2.23,.40],[1.91,2.68,.63]]);
      vine([[1.87,.45,1.72],[1.89,1.20,1.72],[1.89,2.08,1.70],[1.56,2.12,1.77]]);
      part='tea-stall';for(let j=0;j<9;j++)box(.40+j*.17,.61,1.778,.012,.78,.015,M.dark);
      for(let j=0;j<9;j++){const xx=.29+j*.195;profile([[-.098,0],[.098,0],[.08,-.10],[0,-.16],[-.08,-.10]],.027,xx,2.11,1.956,M.cream);}
      // Lemon bowl, mortar, a small recipe book and a stool complete the tea workspace.
      cyl(.48,1.16,1.24,.13,.08,.08,M.wood,10);for(let j=0;j<4;j++)ball(.42+j*.045,1.23,1.24,.044,M.amber,1,.85,1,7);
      box(1.62,1.15,1.55,.30,.045,.24,M.cream,0,.10);box(1.62,1.177,1.55,.009,.018,.23,M.dark,0,.1);
      cyl(1.96,.59,1.97,.20,.20,.09,M.wood,12);for(const x of [1.84,2.08])for(const z of [1.87,2.07])beam([x,.11,z],[1.96+(x-1.96)*.78,.56,1.97+(z-1.97)*.78],.028,M.wood);
      part='distiller';arch(-2.22,.08,1.684,.31,.50,.028,M.dark);archRing(-2.22,.065,1.71,.42,.60,.057,M.plaster);add(new THREE.TorusGeometry(.028,.007,5,10),M.copper,-2.28,.34,1.765);
      for(const y of [1.67,2.29])cyl(-2.43,y,1.34,.077,.077,.055,M.copper,10);
      tube([[-2.12,1.17,1.34],[-1.99,1.18,1.34],[-1.98,1.03,1.34]],.027,M.copper,10);
      part='lily-stones';
      for(const [x,z,r] of [[-.74,1.95,.27],[-.81,2.27,.24],[-.64,2.45,.13]]){
        const points=[[0,0]];for(let j=0;j<=24;j++){const a=.18+j*(Math.PI*2-.45)/24;points.push([Math.sin(a)*r,Math.cos(a)*r]);}const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));const geo=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:1,steps:1});add(geo,M.leafLight,x,.053,z,Math.PI/2);for(let j=0;j<5;j++){const a=.35+j*1.12;beam([x,.065,z],[x+Math.sin(a)*r*.86,.065,z+Math.cos(a)*r*.86],.006,M.leaf,5);}
      }
    }
    // PASS-DETAILS
    const parts = new Map();
    for (const b of batches.values()) {
      let node=parts.get(b.part);if(!node){node=new THREE.Group();node.name=b.part;node.userData.part=true;node.userData.selectable=true;parts.set(b.part,node);g.add(node);}
      const merged=new THREE.BufferGeometry();
      const count=b.geos.reduce((n,q)=>n+q.attributes.position.count,0);
      for(const name of ['position','normal','uv']){const itemSize=name==='uv'?2:3,a=new Float32Array(count*itemSize);let offset=0;for(const q of b.geos){const v=q.getAttribute(name);if(v)a.set(v.array,offset);offset+=q.attributes.position.count*itemSize;}merged.setAttribute(name,new THREE.BufferAttribute(a,itemSize));}
      merged.computeBoundingSphere();const mesh=new THREE.Mesh(merged,b.mat);mesh.name=b.part+':'+b.mat.color.getHexString();mesh.castShadow=!b.mat.transparent;mesh.receiveShadow=true;mesh.userData.explodeWithParent=true;node.add(mesh);b.geos.forEach(q=>q.dispose());
    }
    // Each selectable assembly owns a true centre pivot; its layout can expand about
    // the building centre without detaching relief from the architectural shell.
    for(const node of parts.values()) {
      const centre=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      node.children.forEach(mesh=>{mesh.geometry.translate(-centre.x,-centre.y,-centre.z);mesh.geometry.computeBoundingSphere();});
      node.position.copy(centre);node.userData.pivot=centre.toArray();
    }
    g.userData.door=[-.74,2.12];
    g.userData.cols=[[-2.01,-1.57,.18,1.20],[.18,-1.42,2.34,1.19],[.29,1.20,1.88,1.80],[-2.53,.97,-1.91,1.71]];
    g.userData.mailbox=[-1.95,2.30];
    g.userData.lights=[[-.25,1.87,1.47],[1.02,2.76,-.12],[.22,2.515,1.36],[.69,2.435,1.57],[1.17,2.425,1.60],[1.65,2.515,1.37],[1.65,1.75,-1.20]];
    g.userData.smoke=[-.40,5.29,-.79];
    g.userData.sculptRuntime={version:1,coordinateFrame:{up:'+Y',forward:'+Z',units:'metres'},parts:Array.from(parts.keys()),pivots:Array.from(parts.values()).map(node=>({name:node.name,position:node.position.toArray()})),sockets:{entrance:[-.74,.31,1.30],chimney:[-.40,5.29,-.79]},colliders:g.userData.cols,selectableParts:true,explodeMode:'scale-layout-about-model-centre',stylized:true};
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
