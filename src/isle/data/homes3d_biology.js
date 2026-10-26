/* 森的櫻樹花園小屋。img2threejs staged reconstruction; front +Z, metres.
 * Kit-only materials, deterministic geometry, no textures or model-owned lights. */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['home_biology'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'home-biology-sakura-garden';
    const M = {
      plaster: kit.mat('#f3ead8', { roughness: .93 }, 'stone'),
      stone: kit.mat('#c7b9a3', { roughness: .94 }, 'stone'),
      stoneLight: kit.mat('#e4d8c0', { roughness: .91 }, 'stone'),
      wood: kit.mat('#8a5a3b', { roughness: .85 }, 'wall'),
      honey: kit.mat('#b8824c', { roughness: .80 }, 'wall'),
      dark: kit.mat('#543b30', { roughness: .94 }),
      moss: kit.mat('#7d9a5c', { roughness: .96 }, 'roof'),
      mossLight: kit.mat('#9bb573', { roughness: .96 }),
      leaf: kit.mat('#526f43', { roughness: .96 }),
      pink: kit.mat('#f3b2c9', { roughness: .90 }, 'sakura'),
      rose: kit.mat('#e88fb2', { roughness: .90 }, 'sakura'),
      cream: kit.mat('#fff0cb', { roughness: .88 }),
      brass: kit.mat('#d6ac60', { roughness: .39, metalness: .65 }),
      lavender: kit.mat('#a39bc9', { roughness: .92 }),
      carrot: kit.mat('#dd9255', { roughness: .92 }),
      glass: kit.win()
    };
    const batches = new Map(), assemblies = new Map(); let part = 'foundation';
    function add(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0) {
      if (geo.index) { const q=geo.toNonIndexed();geo.dispose();geo=q; }
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const key=part+'|'+mat.uuid;
      if(!batches.has(key))batches.set(key,{part,mat,geos:[]});batches.get(key).geos.push(geo);
    }
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0){add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
    function slab(points,depth,x,y,z,m,ry=0,bevel=0){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();add(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:5,steps:1}),m,x,y,z,0,ry);}
    function rounded(x,y,z,w,h,d,m,r=.025,ry=0){r=Math.min(r,w/5,h/5,d/5);slab([[-w/2+r,-h/2],[w/2-r,-h/2],[w/2,-h/2+r],[w/2,h/2-r],[w/2-r,h/2],[-w/2+r,h/2],[-w/2,h/2-r],[-w/2,-h/2+r]],d-2*r,x,y,z-d/2+r,m,ry,r);}
    function beam(a,b,r,m,r2=r,n=7){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),q=new THREE.CylinderGeometry(r2,r,v.length(),n,1);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));add(q,m,...A.add(B).multiplyScalar(.5).toArray());}
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1,n=7){const q=new THREE.SphereGeometry(r,n,n<=6?3:4);q.scale(sx,sy,sz);add(q,m,x,y,z);}
    function crown(x,y,z,r,m,sx=1,sy=1,sz=1){const q=new THREE.IcosahedronGeometry(r,1);q.scale(sx,sy,sz);q.computeVertexNormals();add(q,m,x,y,z);}
    function sweep(pts,r0,r1,m,n=9,steps=14){const c=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),frames=c.computeFrenetFrames(steps,false),P=[],idx=[];
      for(let i=0;i<=steps;i++){const t=i/steps,p=c.getPoint(t),r=r0+(r1-r0)*t;for(let j=0;j<n;j++){const a=j/n*Math.PI*2,rr=r*(1+.055*Math.sin(j*2.3+i*.8));P.push(...p.clone().addScaledVector(frames.normals[i],Math.cos(a)*rr).addScaledVector(frames.binormals[i],Math.sin(a)*rr).toArray());}}
      for(let i=0;i<steps;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n;idx.push(a,b,a+n,b,b+n,a+n);}
      for(let j=1;j<n-1;j++){idx.push(0,j+1,j);const a=steps*n;idx.push(a,a+j,a+j+1);}
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(P,3));q.setIndex(idx);q.computeVertexNormals();add(q,m);
    }
    function at(x,y,z,u,v,d,ry=0){return [x+u*Math.cos(ry)+d*Math.sin(ry),y+v,z-u*Math.sin(ry)+d*Math.cos(ry)];}
    function localBox(x,y,z,u,v,d,w,h,dep,m,ry=0){box(...at(x,y,z,u,v,d,ry),w,h,dep,m,0,ry);}
    function archPts(w,h){const r=w/2,out=[[-r,0],[r,0],[r,h-r]];for(let i=1;i<=16;i++){const a=i*Math.PI/16;out.push([r*Math.cos(a),h-r+r*Math.sin(a)]);}return out;}
    function arch(x,y,z,w,h,d,m,ry=0){slab(archPts(w,h),d,x,y,z,m,ry,.008);}
    function ringArch(x,y,z,w,h,t,m,ry=0){const s=new THREE.Shape(archPts(w,h).map(p=>new THREE.Vector2(...p))),hole=archPts(w-2*t,h-2*t).map(p=>new THREE.Vector2(p[0],p[1]+t));s.holes.push(new THREE.Path(hole.reverse()));add(new THREE.ExtrudeGeometry(s,{depth:.055,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:1,steps:1,curveSegments:4}),m,x,y,z,0,ry);}
    function tube(pts,r,m,steps=14){add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),steps,r,5,false),m);}
    // PASS 1 — blockout: cottage, curved moss gable and connected tree silhouette.
    box(.30,.10,-.05,3.12,.38,2.80,M.stone);
    part='shell';box(.30,1.48,-.05,2.90,2.38,2.55,M.plaster);
    part='gables';slab([[-1.45,0],[1.45,0],[-.40,1.48]],2.55,.30,2.65,-1.325,M.plaster);
    part='roof';slab([[-1.75,0],[-1.18,.55],[-.40,1.57],[.65,.86],[1.75,0],[1.75,-.12],[-.40,1.42],[-1.75,-.12]],3.02,.30,2.67,-1.56,M.moss);
    part='tree';sweep([[-1.62,-.13,-.62],[-1.75,1.0,-.63],[-1.65,2.1,-.70],[-1.35,3.2,-.92],[-.98,4.48,-1.02]],.40,.12,M.wood);
    part='branches';sweep([[-1.46,2.2,-.91],[-1.18,3.35,-.87],[-.3,4.15,-.83],[1.1,4.55,-.65]],.25,.065,M.wood);sweep([[-1.47,2.6,-.9],[-1.90,3.25,-.8],[-2.05,4.18,-.6]],.21,.06,M.wood);
    part='canopy';
    const masses=[[-1.60,4.30,-.95,.78,1,.82,1.1],[-.85,4.95,-1.0,.94,1,.85,1],[-.10,5.18,-.55,.84,1.1,.82,1],[.87,4.88,-.60,.85,1,.8,1.1],[1.70,4.50,-.48,.65,1,.8,1.1],[-1.86,4.12,.02,.58,1,.85,1],[-1.18,4.62,.20,.67,1,.80,1],[.0,4.87,.20,.63,1.15,.73,1],[.93,4.62,.28,.63,1,.75,1],[1.68,4.33,.35,.56,1,.75,1],[-1.38,4.31,-1.61,.53,1.0,.8,1],[-.16,4.78,-1.60,.62,1.1,.8,1],[1.12,4.47,-1.44,.62,1,.8,1]];
    masses.forEach((p,i)=>crown(...p.slice(0,4),i%4===0?M.rose:M.pink,...p.slice(4)));
    // PASS 2 — structure: continuous timber sockets, all-sided glazing and garden assemblies.
    part='timber';
    for(const x of [-1.12,1.72])for(const z of [-1.29,1.22]){
      rounded(x,1.5,z,.17,2.4,.17,M.wood,.022);box(x,.40,z,.25,.20,.25,M.honey);
    }
    for(const z of [-1.35,1.28])for(const y of [.37,2.65])box(.30,y,z,3.02,.16,.14,M.wood);
    for(const x of [-1.20,1.80])for(const y of [.37,2.65])box(x,y,-.05,.14,.16,2.71,M.wood);
    for(const z of [-1.35,1.29]){
      beam([-1.17,2.68,z],[-.10,4.13,z],.078,M.wood);beam([-.10,4.13,z],[1.77,2.68,z],.078,M.wood);
      box(-.10,3.25,z,.12,1.13,.13,M.wood);beam([-1.06,2.64,z],[-.58,3.27,z],.048,M.honey);beam([1.65,2.65,z],[1.01,3.10,z],.048,M.honey);
    }
    for(const x of [-1.47,2.05])for(const z of [-1.57,1.47])box(x,2.66,z,.16,.16,.23,M.wood);
    for(const z of [-1.58,1.48]){
      tube([[-1.45,2.68,z],[-.88,3.24,z],[-.10,4.24,z]],.071,M.wood);tube([[-.10,4.24,z],[.95,3.53,z],[2.05,2.68,z]],.071,M.wood);
    }
    beam([-.10,4.24,-1.61],[-.10,4.24,1.51],.063,M.honey);
    part='door';
    arch(-.35,.31,1.245,1.0,1.9,.075,M.dark);arch(-.35,.33,1.33,.88,1.79,.045,M.wood);
    ringArch(-.35,.285,1.33,1.16,2.05,.13,M.stoneLight);ringArch(-.35,.33,1.415,.91,1.83,.049,M.honey);
    part='windows';
    function windowArch(x,y,z,w,h,ry=0){
      arch(x,y,z,w+.12,h+.09,.032,M.dark,ry);arch(...at(x,y,z,0,.045,.039,ry),w-.08,h-.07,.026,M.glass,ry);
      ringArch(...at(x,y,z,0,-.04,.070,ry),w+.22,h+.18,.105,M.stoneLight,ry);ringArch(...at(x,y,z,0,.025,.133,ry),w+.01,h+.015,.045,M.honey,ry);
      localBox(x,y,z,0,h*.49,.197,.038,h-.07,.038,M.wood,ry);localBox(x,y,z,0,h*.47,.20,w-.07,.043,.038,M.wood,ry);localBox(x,y,z,0,-.095,.10,w+.28,.095,.25,M.honey,ry);
    }
    windowArch(.98,.86,1.25,.75,1.18);windowArch(1.757,.90,.37,.72,1.20,Math.PI/2);windowArch(1.757,1.05,-.85,.55,.98,Math.PI/2);windowArch(-1.157,1.0,.64,.61,1.08,-Math.PI/2);
    windowArch(-.56,.92,-1.345,.70,1.12,Math.PI);windowArch(.98,1.04,-1.345,.68,1.04,Math.PI);
    function roundWindow(x,y,z,r,ry=0){
      const p=at(x,y,z,0,0,.025,ry),q=new THREE.CylinderGeometry(r,r,.044,24);q.rotateX(Math.PI/2);add(q,M.glass,...p,0,ry);
      add(new THREE.TorusGeometry(r+.065,.065,6,24),M.wood,x,y,z,0,ry);add(new THREE.TorusGeometry(r+.016,.023,5,24),M.honey,...at(x,y,z,0,0,.047,ry),0,ry);
      localBox(x,y,z,0,0,.070,.035,r*2,.04,M.honey,ry);localBox(x,y,z,0,0,.072,r*2,.036,.04,M.honey,ry);
    }
    roundWindow(-.10,3.32,1.385,.27);roundWindow(-.10,3.32,-1.44,.27,Math.PI);
    part='dormer';box(1.46,3.32,-.30,1.08,.72,.82,M.plaster);slab([[-.41,0],[.41,0],[0,.5]],1.08,.92,3.68,-.30,M.plaster,Math.PI/2);
    slab([[-.55,0],[0,.56],[.55,0],[.55,-.09],[0,.47],[-.55,-.09]],1.22,.90,3.66,-.30,M.moss,Math.PI/2);
    for(const z of [-.72,.12])box(2.02,3.35,z,.13,.79,.11,M.wood);
    beam([2.14,3.67,-.85],[2.14,4.22,-.30],.055,M.honey);beam([2.14,4.22,-.30],[2.14,3.67,.25],.055,M.honey);
    part='windows';roundWindow(2.085,3.67,-.30,.255,Math.PI/2);
    part='steps';
    rounded(-.35,.035,2.13,1.40,.13,.60,M.stoneLight,.035);rounded(-.35,.145,1.91,1.29,.13,.56,M.stoneLight,.029);rounded(-.35,.255,1.66,1.17,.13,.56,M.stoneLight,.025);
    part='branches';sweep([[-1.63,2.48,-.67],[-1.9,2.94,-.05],[-2.2,3.23,.29],[-2.40,3.26,.34]],.17,.065,M.wood,8,10);
    part='roots';
    for(const [dx,dz] of [[-.62,-.18],[-.48,.46],[.18,.65],[.55,-.45]])sweep([[-1.61,.28,-.64],[-1.61+dx*.55,.07,-.64+dz*.6],[-1.61+dx,-.06,-.64+dz]],.20,.045,M.wood,7,7);
    part='birdhouse';
    box(-1.95,2.49,-.03,.36,.43,.32,M.honey);slab([[-.18,0],[.18,0],[0,.22]],.34,-1.95,2.70,-.20,M.honey);slab([[-.25,0],[0,.26],[.25,0],[.25,-.045],[0,.205],[-.25,-.045]],.44,-1.95,2.71,-.25,M.moss);
    add(new THREE.CylinderGeometry(.065,.065,.02,12),M.dark,-1.95,2.56,.14,Math.PI/2);beam([-1.95,2.40,.12],[-1.95,2.40,.27],.026,M.wood);
    part='beehive';
    for(const x of [-2.25,-1.86])for(const z of [.83,1.22])beam([x,.04,z],[x,.45,z],.04,M.wood,.04,4);
    box(-2.055,.48,1.025,.61,.07,.59,M.dark);box(-2.055,.76,1.025,.54,.5,.50,M.honey);
    slab([[-.34,0],[0,.23],[.34,0],[.34,-.06],[0,.17],[-.34,-.06]],.64,-2.055,1.01,.705,M.moss);
    box(-2.055,.60,1.285,.20,.043,.015,M.dark);box(-2.055,.565,1.34,.26,.04,.15,M.wood);
    part='branches';beam([-2.42,3.20,.33],[-1.79,3.20,.33],.055,M.wood,.055,7);
    part='swing';rounded(-2.13,.64,.36,.59,.10,.29,M.honey,.02);for(const x of [-2.365,-1.895]){tube([[x,.66,.34],[x-.015,1.72,.33],[x,3.17,.33]],.018,M.cream,14);beam([x-.04,3.20,.33],[x+.04,3.20,.33],.026,M.honey);}
    part='vegetables';
    for(const x of [1.84,2.43])box(x,.28,-.16,.07,.45,1.86,M.wood);
    for(const z of [-1.08,.77])box(2.135,.28,z,.64,.45,.07,M.honey);
    box(2.135,.32,-.16,.53,.12,1.73,M.dark);
    for(const x of [1.84,2.43])for(const z of [-1.08,.77]){box(x,.34,z,.105,.59,.105,M.honey);add(new THREE.ConeGeometry(.084,.10,4),M.honey,x,.685,z,0,Math.PI/4);}
    // PASS 3 — form: staggered scallops, dimensional rosettes and gardener's tools.
    part='scallops';
    function roofY(t,side){return side<0?(t<.577?4.24-1.02*t/.577:3.22-.55*(t-.577)/.423):(t<.488?4.24-.71*t/.488:3.53-.86*(t-.488)/.512);}
    for(const side of [-1,1])for(let row=0;row<8;row++){
      const t0=row/8,t1=Math.min(1.012,(row+1.17)/8),hw=side<0?1.35:2.15;
      const A=new THREE.Vector3(-.10+side*hw*t0,roofY(t0,side),0),B=new THREE.Vector3(-.10+side*hw*t1,roofY(t1,side),0),v=B.clone().sub(A),len=v.length();v.normalize();
      const u=new THREE.Vector3(0,0,side),n=new THREE.Vector3().crossVectors(u,v).normalize(),basis=new THREE.Matrix4().makeBasis(u,v,n);
      for(let j=0;j<12;j++){
        const z=-1.45+j*.255+(row%2)*.10;if(z>1.43)continue;
        const w=.248,s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,len-.06);s.quadraticCurveTo(w/2,len+.012,0,len+.025);s.quadraticCurveTo(-w/2,len+.012,-w/2,len-.06);s.closePath();
        const q=new THREE.ExtrudeGeometry(s,{depth:.034,bevelEnabled:false,curveSegments:3,steps:1});q.applyMatrix4(basis);const p=A.clone().addScaledVector(n,.045+(8-row)*.0015);p.z=z;add(q,(row+j)%6===0?M.mossLight:M.moss,...p.toArray());
      }
    }
    part='dormer';
    for(const side of [-1,1])for(let row=0;row<3;row++)for(let j=0;j<5;j++){
      const d=(row+.6)/3*.56;box(1.0+j*.235,4.22-d,-.30+side*d*.982,.229,.045,.28,(row+j)%5===0?M.mossLight:M.moss,side*Math.atan(.56/.55));
    }
    part='timber';
    for(const x of [-1.18,1.78])for(let j=0;j<5;j++){const z=-1.11+j*.54;beam([x,2.54,z],[x+(x<0?-.20:.20),2.69,z],.052,M.wood);}
    for(const z of [-1.355,1.293]){
      beam([1.62,.45,z],[1.30,.81,z],.055,M.honey);beam([-1.06,.45,z],[-.87,.70,z],.055,M.honey);
    }
    part='foundation';
    for(let row=0;row<2;row++)for(let j=0;j<9;j++){
      const x=-1.10+j*.35+(row%2)*.10;if(x>1.72)continue;
      for(const z of [-1.47,1.37])rounded(x,.012+row*.17,z,.335,.155,.07,(j+row)%4?M.stoneLight:M.stone,.012);
    }
    for(const x of [-1.27,1.87])for(let row=0;row<2;row++)for(let j=0;j<7;j++)box(x,.012+row*.17,-1.23+j*.375,.07,.155,.36,(j+row)%3?M.stoneLight:M.stone);
    part='door';
    for(let j=0;j<7;j++){const u=-.36+j*.12,top=1.79-.44+Math.sqrt(Math.max(0,.44*.44-u*u)),height=top-.08;box(-.35+u,.37+height/2,1.388,.112,height,.022,j%3?M.wood:M.honey);}
    for(const y of [.67,1.25]){box(-.35,y,1.44,.75,.045,.032,M.dark);box(-.68,y,1.476,.06,.075,.035,M.brass);}
    add(new THREE.TorusGeometry(.078,.016,6,16),M.brass,-.12,1.06,1.505);ball(-.12,1.145,1.496,.036,M.brass,1,1,.45);box(-.13,1.04,1.463,.10,.22,.025,M.dark);
    for(let j=0;j<9;j++){const a=j*Math.PI/8;box(-.35+Math.cos(a)*.51,1.75+Math.sin(a)*.51,1.403,.083,.045,.035,M.stone,0,0,a-Math.PI/2);}
    part='beehive';
    for(let row=0;row<4;row++){box(-2.055,.55+row*.118,1.284,.54,.012,.012,M.wood);box(-1.779,.55+row*.118,1.025,.012,.012,.50,M.wood);}
    for(const x of [-2.23,-1.88])for(const y of [.67,.91])ball(x,y,1.294,.018,M.brass,1,1,.4,6);
    part='branches';
    for(const pts of [
      [[-1.30,3.25,-.95],[-1.6,3.7,-1.3],[-1.68,4.4,-1.5]],
      [[-.75,3.8,-.83],[-.48,4.35,-1.3],[-.2,4.7,-1.6]],
      [[.28,4.28,-.75],[.75,4.48,-.18],[1.30,4.45,.35]],
      [[-.9,3.7,-.9],[-.8,4.2,-.1],[-1.1,4.52,.25]],
      [[.45,4.32,-.75],[.97,4.2,-1.27],[1.28,4.47,-1.45]]
    ])sweep(pts,.09,.026,M.wood,7,9);
    part='canopy';
    masses.forEach((p,i)=>{
      const x=p[0]+.16*Math.sin(i*4.2),y=p[1]+.10,z=p[2]+.34,r=p[3]*.43;
      crown(x,y,z,r,i%3===0?M.rose:M.pink,1.3,.78,1.0);crown(p[0]-.28,p[1]-.24,p[2]+.12,p[3]*.40,i%3===1?M.rose:M.pink,1,.9,1.1);
    });
    part='vegetables';
    for(const x of [1.795,2.475])for(const y of [.17,.32,.47])box(x,y,-.16,.035,.014,1.76,M.honey);
    for(let j=0;j<6;j++){
      const z=-.91+j*.28;
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ball(2.11+Math.cos(a)*.12,.51+Math.sin(k)*.025,z+Math.sin(a)*.10,.11,k%2?M.leaf:M.mossLight,.65,1.6,.55);}
      if(j%2===0){add(new THREE.ConeGeometry(.063,.22,7),M.carrot,2.28,.49,z,Math.PI);beam([2.28,.58,z],[2.28,.77,z+.015],.017,M.leaf);}
    }
    part='watering-can';
    add(new THREE.CylinderGeometry(.125,.16,.27,10,1,true),M.leaf,1.92,.23,1.91);add(new THREE.CylinderGeometry(.157,.157,.025,10),M.leaf,1.92,.10,1.91);add(new THREE.TorusGeometry(.126,.015,5,14),M.brass,1.92,.37,1.91,Math.PI/2);
    tube([[1.78,.18,1.91],[1.63,.28,1.91],[1.67,.48,1.91],[1.83,.44,1.91]],.022,M.leaf,12);
    beam([2.02,.23,1.91],[2.29,.50,1.94],.05,M.leaf,.034,8);beam([2.26,.47,1.937],[2.34,.55,1.946],.065,M.brass,.074,8);
    part='leaf-sign';
    beam([-1.02,2.22,1.32],[-1.02,2.22,1.62],.035,M.wood);for(const x of [-1.15,-.89])beam([x,2.21,1.61],[x,2.04,1.61],.012,M.brass);
    slab([[-.24,-.17],[.24,-.17],[.27,.14],[.20,.22],[-.20,.22],[-.27,.14]],.06,-1.02,1.82,1.58,M.honey,0,.015);
    slab([[-.13,-.07],[-.10,.09],[.12,.16],[.13,-.02],[-.05,-.12]],.014,-1.02,1.82,1.652,M.leaf);beam([-1.15,1.70,1.675],[-.91,1.96,1.675],.010,M.brass, .010,4);
    for(let j=0;j<3;j++)beam([-1.09+j*.06,1.77+j*.06,1.675],[-.97+j*.033,1.78+j*.055,1.675],.008,M.brass,.008,4);
    part='flowers';
    function rosette(x,y,z,s=1,m=M.rose,up=false,ry=0){
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5,u=Math.cos(a)*.052*s,v=Math.sin(a)*.052*s,p=up?[x+u,y,z+v]:at(x,y,z,u,v,0,ry);ball(...p,.042*s,m,up?1:1,up?.42:1,up?1:.48,6);}
      ball(x,y+(up?.015:0),z+(up?0:.019),.028*s,M.cream,1,up?.45:1,up?1:.5,6);
    }
    function flowerbox(x,y,z,w,ry=0){
      box(x,y,z,w,.18,.27,M.wood,0,ry);localBox(x,y,z,0,.09,.15,w+.035,.05,.045,M.honey,ry);
      for(let j=0;j<7;j++){const u=-w*.42+j*w*.14,p=at(x,y,z,u,.16,.02,ry);ball(...p,.115,j%2?M.leaf:M.mossLight,1,.65,1.2);rosette(...at(x,y,z,u,.22,.14,ry),.82,j%3?M.rose:M.cream,false,ry);}
      for(const u of [-w*.36,w*.36])beam(at(x,y,z,u,-.07,.08,ry),at(x,y,z,u,-.26,-.10,ry),.025,M.dark);
    }
    flowerbox(.98,.78,1.53,.98);flowerbox(1.94,.81,.37,.90,Math.PI/2);flowerbox(-.56,.83,-1.55,.94,Math.PI);flowerbox(.98,.96,-1.55,.86,Math.PI);
    // Creeping flowering vines follow roof verges and selected posts instead of covering entrances.
    for(const [sx,ex,z,side] of [[-.10,2.05,1.53,1],[-.10,-1.45,1.53,-1],[-.10,2.05,-1.62,1]]){
      const pts=[];for(let j=0;j<9;j++){const t=j/8;pts.push([sx+(ex-sx)*t,roofY(t,side)+.12,z]);}tube(pts,.025,M.leaf,18);
      for(let j=1;j<9;j++){const t=j/8,x=sx+(ex-sx)*t,y=roofY(t,side)+.15;ball(x,y,z,.12,j%2?M.leaf:M.mossLight,1.4,.55,.8);if(j%2)rosette(x,y+.04,z+.055,.80,j%3?M.rose:M.cream);}
    }
    for(const [x,z,y0,n] of [[1.79,1.32,1.55,8],[-1.22,1.32,.72,10],[1.80,-1.34,1.0,10],[-1.63,-.48,.35,11]]){
      const pts=[];for(let j=0;j<n;j++){const y=y0+j*.10,xx=x+Math.sin(j*1.8)*.048;pts.push([xx,y,z]);ball(xx+(j%2?-.055:.055),y,z,.095,j%3?M.leaf:M.mossLight,1.25,.62,.7);if(j%3===1)rosette(xx,y,z+.07,.76,j%2?M.cream:M.lavender);}tube(pts,.016,M.leaf,12);
    }
    for(const [x,z] of [[-1.55,1.12],[-1.58,1.55],[-2.23,1.5],[1.46,1.64],[1.68,1.28],[2.06,-1.29],[-1.18,-1.63],[.15,-1.63],[1.38,-1.61]]){
      for(let j=0;j<4;j++){const xx=x+.11*Math.sin(j*2),zz=z+.12*Math.cos(j*2.5),yy=.18+(j%2)*.13;beam([xx,.02,zz],[xx,yy,zz],.012,M.leaf,.01,5);ball(xx,.13,zz,.10,M.leaf,1,.65,1);rosette(xx,yy,zz,.78,j%3?M.rose:M.lavender,true);}
    }
    masses.forEach((p,i)=>{if(i%2===0)rosette(p[0],p[1]-.08,p[2]+p[3]*.80,1.2,i%4?M.rose:M.cream);});
    // PASS 4 — material/lookdev: same 16-color kit palette across the whole asset.
    // Warm glazing is shared by windows and five framed lantern cores; the game owns lighting.
    part='lanterns';
    function lantern(x,y,z,ground=false,rear=false){
      if(ground){beam([x,.015,z],[x,y-.14,z],.035,M.wood,.028,7);box(x,.08,z,.16,.10,.16,M.stoneLight);}
      else{const wall=rear?-1.35:1.28;beam([x,y+.32,wall],[x,y+.32,z],.023,M.wood);beam([x,y+.32,z],[x,y+.17,z],.015,M.brass);}
      box(x,y,z,.13,.22,.13,M.glass);
      for(const dx of [-.095,.095])for(const dz of [-.095,.095])beam([x+dx,y-.14,z+dz],[x+dx,y+.14,z+dz],.012,M.brass,.012,4);
      for(const yy of [y-.145,y+.145])box(x,yy,z,.225,.035,.225,M.brass);
      add(new THREE.ConeGeometry(.17,.105,4),M.brass,x,y+.212,z,0,Math.PI/4);ball(x,y-.19,z,.029,M.brass,1,1,1,6);
    }
    const lightCenters=[[-.99,2.40,1.53],[1.62,2.04,1.43],[-2.16,.71,1.77],[1.98,.75,1.55],[1.72,2.26,-1.57]];
    lightCenters.forEach((p,i)=>lantern(...p,i===2||i===3,i===4));
    part='flowers';
    // Seat canopy blossoms on the actual faceted surface, including the hidden back side.
    const canopyProbe=new THREE.Group();
    for(const b of batches.values())if(b.part==='canopy')for(const q of b.geos)canopyProbe.add(new THREE.Mesh(q,M.pink));
    canopyProbe.updateMatrixWorld(true);const ray=new THREE.Raycaster();
    for(const side of [-1,1])for(const i of [0,2,4,5,7,9,11,12]){
      const p=masses[i];ray.set(new THREE.Vector3(p[0]+p[3]*.12,p[1]+p[3]*.19,side*10),new THREE.Vector3(0,0,-side));
      const hit=ray.intersectObject(canopyProbe,true)[0];if(hit)rosette(hit.point.x,hit.point.y,hit.point.z+side*.018,1.28,M.cream,false,side<0?Math.PI:0);
    }
    // Small safe refinements: back cross-brace, sill brackets and contrasting wooden feet.
    part='timber';beam([-.98,.47,-1.43],[-.95,.75,-1.43],.045,M.honey);beam([.12,.47,-1.43],[.12,2.58,-1.43],.065,M.wood);
    // FORM
    // MATERIAL
    // Base pivots make named architectural assemblies selectable and independently reusable.
    const pivots=new Map();
    for(const b of batches.values()){
      if(!pivots.has(b.part))pivots.set(b.part,new THREE.Box3());
      for(const q of b.geos){q.computeBoundingBox();pivots.get(b.part).union(q.boundingBox);}
    }
    for(const [name,b] of pivots){const p=b.getCenter(new THREE.Vector3());p.y=b.min.y;pivots.set(name,p);}
    // Emit one mesh per semantic assembly/material, preserving UVs for the live kit.
    for(const b of batches.values()){
      let count=0;for(const q of b.geos)count+=q.attributes.position.count;
      const P=new Float32Array(count*3),N=new Float32Array(count*3),U=new Float32Array(count*2);let off=0;
      for(const q of b.geos){P.set(q.attributes.position.array,off*3);N.set(q.attributes.normal.array,off*3);if(q.attributes.uv)U.set(q.attributes.uv.array,off*2);off+=q.attributes.position.count;q.dispose();}
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.BufferAttribute(P,3));q.setAttribute('normal',new THREE.BufferAttribute(N,3));q.setAttribute('uv',new THREE.BufferAttribute(U,2));const pivot=pivots.get(b.part);q.translate(-pivot.x,-pivot.y,-pivot.z);q.computeBoundingSphere();
      if(!assemblies.has(b.part)){const a=new THREE.Group();a.name='biology-'+b.part;a.position.copy(pivot);a.userData.componentId=b.part;assemblies.set(b.part,a);g.add(a);}
      const mesh=new THREE.Mesh(q,b.mat);mesh.name='biology-'+b.part+'-'+Object.keys(M).find(k=>M[k]===b.mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.componentId=b.part;assemblies.get(b.part).add(mesh);
    }
    g.userData.door=[-.35,2.49];g.userData.cols=[[-1.27,-1.48,1.88,1.38],[-2.12,-1.25,-1.15,-.16],[1.79,-1.18,2.50,.87],[-2.44,.69,-1.70,1.38],[-2.46,.19,-1.79,.55]];
    g.userData.mailbox=[.90,2.26];g.userData.lights=lightCenters;
    g.userData.sculptRuntime={coordinateSystem:'Y-up, front +Z, metres',parts:Array.from(assemblies.keys()),sockets:{entrance:[-.35,.35,1.43],treeRoot:[-1.62,0,-.62]},colliders:g.userData.cols,static:true};
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
