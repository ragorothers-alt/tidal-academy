/* ???? ? ??????img2threejs ????TA.ISLE.BLDMODELS[key] = (THREE, kit) => THREE.Group?
   props.js ?????????????????????????????? */
(function (root) {
  'use strict';
  const TA = root.TA = root.TA || {};
  const I = TA.ISLE = TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};


  I.BLDMODELS['shop'] = function tidalShop(THREE,kit) {
  'use strict';
  const g=new THREE.Group(); g.name='tidal-crescent-shop'; g.userData.sign=[-.53,2.16,1.66];
  const mats=new Map(), batches=new Map();
  const mat=(color,opts={},kind=undefined)=>{const k=kind+color+JSON.stringify(opts);if(!mats.has(k))mats.set(k,kit.mat(color,opts,kind));return mats.get(k);};
  // Shared finishes: smooth cream plaster, actual limestone feet, honey timber and lilac slate.
  const plaster=mat('#f0e5d5',{roughness:.92},'plaster'),stone=mat('#e8decf',{roughness:.94},'stone');
  const wood=mat('#cda67e',{roughness:.8},'wood'),woodDark=mat('#947b7b',{roughness:.8},'wood');
  const roof=mat('#ad9abd',{roughness:.78},'roof'),gold=mat('#e8c48b',{roughness:.4,metalness:0.6},'metal');
  const rose=mat('#e6b8bf',{roughness:.94}),cream=mat('#fff0d4',{roughness:.94}),foliage=mat('#9fb994',{roughness:.94}),glass=kit.win();
  const canopyRose=mat('#e6b8bf',{roughness:.94},'fabric'),canopyCream=mat('#fff0d4',{roughness:.94},'fabric'),potRose=mat('#e6b8bf',{roughness:.94},'ceramic');
  const M={stone,stone2:stone,mortar:stone,plaster,wood,woodLight:wood,woodDark,roof,roof2:roof,roof3:roof,gold,red:rose,cream,canopyRose,canopyCream,leaf:foliage,leaf2:foliage,fruitRed:rose,fruitGold:cream,blue:roof,pot:potRose,glow:glass,glass};
  const materialId=new Map(Object.values(M).map((m,i)=>[m,i]));
  function add(geo,m,name='detail'){if(!geo.getAttribute('normal'))geo.computeVertexNormals();const key=name==='main-wall'?name:name==='main-frame'?'main-frame':String(materialId.get(m));if(!batches.has(key))batches.set(key,{m,geos:[],name:name==='main-wall'?name:name==='main-frame'?name:'shop-detail-'+key});batches.get(key).geos.push(geo.index?geo.toNonIndexed():geo);}
  function tf(geo,x,y,z,rx=0,ry=0,rz=0){return geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));}
  function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0,name){add(tf(new THREE.BoxGeometry(w,h,d),x,y,z,rx,ry,rz),m,name);}
  function sphere(x,y,z,r,m,sx=1,sy=1,sz=1){const geo=new THREE.SphereGeometry(r,8,6);geo.scale(sx,sy,sz);add(tf(geo,x,y,z),m);}
  function beam(a,b,r,m,r2=r,seg=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A),geo=new THREE.CylinderGeometry(r2,r,dir.length(),seg);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));geo.translate(...A.clone().add(B).multiplyScalar(.5).toArray());add(geo,m);}
  function shape(points,depth,x,y,z,m,ry=0,bevel=0){const s=new THREE.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:16});add(tf(geo,x,y,z,0,ry),m);}
  function pathTube(pts,r,m,segments=24){add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),segments,r,5,false),m);}
  function archPts(w,h,n=16){const pts=[[-w/2,0],[w/2,0],[w/2,h-w/2]];for(let i=0;i<=n;i++){let a=i*Math.PI/n;pts.push([Math.cos(a)*w/2,h-w/2+Math.sin(a)*w/2]);}return pts;}
  function arch(x,y,z,w,h,depth,m,ry=0){shape(archPts(w,h),depth,x,y,z,m,ry);}
  function archRim(x,y,z,w,h,r,m,ry=0){const pts=[[-w/2,0],[-w/2,h-w/2]];for(let i=0;i<=20;i++){const a=Math.PI-i*Math.PI/20;pts.push([Math.cos(a)*w/2,h-w/2+Math.sin(a)*w/2]);}pts.push([w/2,0]);const c=Math.cos(ry),s=Math.sin(ry);pathTube(pts.map(p=>[x+p[0]*c,y+p[1],z-p[0]*s]),r,m,40);}
  function crescent(x,y,z,r,ry=0){const pts=[];for(let i=0;i<=30;i++){let a=(50+i*260/30)*Math.PI/180;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}for(let i=0;i<=26;i++){let a=(295-i*230/26)*Math.PI/180;pts.push([r*.29+Math.cos(a)*r*.74,Math.sin(a)*r*.74]);}shape(pts,.026,x,y,z,M.gold,ry);}
  function star(x,y,z,r,ry=0){const pts=[];for(let i=0;i<8;i++){let a=Math.PI/2+i*Math.PI/4,R=i%2?r*.23:r;pts.push([Math.cos(a)*R,Math.sin(a)*R]);}shape(pts,.025,x,y,z,M.gold,ry);}
  // Stone foundation and deliberately bounded main wall shell.
  box(0,.105,0,3.46,.21,2.78,M.mortar);box(0,1.245,0,3.3,2.08,2.62,M.plaster,0,0,0,'main-wall');
  for(let row=0;row<2;row++){for(let i=0;i<9;i++){const w=.365,x=-1.63+i*.408+(row%2)*.04;box(x,.085+row*.14,1.365,w,.127,.11,(i+row)%3?M.stone:M.stone2);box(x,.085+row*.14,-1.365,w,.127,.11,(i+row)%3?M.stone2:M.stone);}for(let i=0;i<7;i++){let z=-1.18+i*.39;for(const side of [-1,1])box(side*1.69,.085+row*.14,z,.1,.127,.36,(i+row)%3?M.stone:M.stone2);}}
  for(const x of [-1.62,1.62])for(const z of [-1.29,1.29]){box(x,1.24,z,.14,2.02,.14,M.wood,0,0,0,'main-frame');for(let i=0;i<6;i++)box(x,.36+i*.29,z,.24,.25,.24,i%2?M.stone2:M.stone);}
  for(const y of [.38,2.23]){box(0,y,1.344,3.36,.12,.13,M.wood,0,0,0,'main-frame');box(0,y,-1.344,3.36,.12,.13,M.wood,0,0,0,'main-frame');for(const x of [-1.68,1.68])box(x,y,0,.12,.12,2.68,M.wood,0,0,0,'main-frame');}
  // Main roof: shallow curved eaves and separately laid slate courses.
  const mainY=t=>3.48-1.23*t+.055*Math.sin(t*Math.PI)+.055*Math.pow(t,9);
  function quad(a,b,c,d,m,th=.035){const V=[...a,...c,...b,...a,...d,...c],v=new Float32Array(V),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(v,3));geo.computeVertexNormals();add(geo,m);const low=p=>[p[0],p[1]-th,p[2]];let ps=[a,b,c,d];for(let i=0;i<4;i++){let p=ps[i],q=ps[(i+1)%4];let gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute([...p,...q,...low(q),...p,...low(q),...low(p)],3));gg.computeVertexNormals();add(gg,m);}}
  // Continuous roof shells block light through the offset slate joints.
  for(const side of [-1,1])box(0,2.83,side*.75,3.8,.075,1.94,M.roof3,side*.687,0,0);
  // Crosswise main ridge, descending toward front and rear eaves.
  for(const side of [-1,1]){for(let row=0;row<7;row++){let t0=row/7,t1=(row+1)/7,z0=side*1.5*t0,z1=side*1.5*t1;for(let j=0;j<13;j++){let x0=-1.9+j*.293,x1=Math.min(1.9,x0+.285);const off=((j+row)%3===0?M.roof2:(j+row)%5===0?M.roof3:M.roof),a=[x0,mainY(t0)+.018,z0],b=[x1,mainY(t0)+.018,z0],c=[x1,mainY(t1)+.024,z1],d=[x0,mainY(t1)+.024,z1];quad(...(side>0?[a,b,c,d]:[d,c,b,a]),off);}}
    for(const x of [-1.9,1.9])pathTube([[x,2.305,side*1.5],[x,2.51,side*1.25],[x,2.99,side*.63],[x,3.49,0]],.043,M.gold,18);
    box(0,2.25,side*1.46,3.8,.13,.12,M.wood);box(0,2.32,side*1.49,3.8,.045,.045,M.gold);
  }
  // Solid side gables close the roof shell, with visible timber trusses.
  for(const side of [-1,1]){shape([[-1.31,0],[1.31,0],[0,1.19]],.08,side*1.61,2.27,0,M.plaster,Math.PI/2);for(const zz of [-1,1])beam([side*1.69,2.28,zz*1.31],[side*1.69,3.47,0],.052,M.wood);beam([side*1.7,2.28,0],[side*1.7,3.44,0],.045,M.wood);beam([side*1.7,2.55,-1.0],[side*1.7,2.55,1.0],.045,M.wood);}
  beam([-1.92,3.51,0],[1.92,3.51,0],.048,M.gold);for(const x of [-1.79,-.4,1.78]){beam([x,3.51,0],[x,3.75,0],.045,M.gold,.015);sphere(x,3.57,0,.07,M.gold,1,.7,1);}
  // Tall forward cross-gable over entrance; white gable and oak truss stay visible.
  shape([[-.98,0],[.98,0],[.98,.26],[0,1.46],[-.98,.26]],.18,.73,2.24,1.43,M.plaster);
  for(const side of [-1,1])box(.73+side*.49,3.0,.86,1.55,.075,1.42,M.roof3,0,0,-side*.886);
  const gy=t=>3.70-1.27*t+.07*Math.pow(t,5);
  for(const side of [-1,1]){for(let row=0;row<7;row++){let t0=row/7,t1=(row+1)/7,x0=.73+side*.98*t0,x1=.73+side*.98*t1;for(let j=0;j<6;j++){let z0=.13+j*.246,z1=z0+.237;const a=[x0,gy(t0)+.018,z0],b=[x1,gy(t1)+.022,z0],c=[x1,gy(t1)+.022,z1],d=[x0,gy(t0)+.018,z1];quad(...(side<0?[d,c,b,a]:[a,b,c,d]),(j+row)%3?M.roof:M.roof2);}}
    const pts=[[.73+side*.99,2.47,1.64],[.73+side*.78,2.7,1.64],[.73+side*.4,3.21,1.64],[.73,3.72,1.64]];pathTube(pts,.073,M.wood,24);pathTube(pts.map(p=>[p[0],p[1]+.025,p[2]+.062]),.027,M.gold,24);
  }
  beam([.73,3.73,.12],[.73,3.73,1.67],.045,M.gold);box(.73,2.93,1.66,.12,1.03,.13,M.wood);box(.73,2.74,1.66,1.36,.1,.12,M.wood);for(const side of [-1,1])beam([.73,3.34,1.66],[.73+side*.56,2.73,1.66],.043,M.wood);
  function finial(x,y,z,h){sphere(x,y+.035,z,.075,M.gold,1,.6,1);beam([x,y,z],[x,y+h*.52,z],.034,M.gold,.029);for(const s of [-1,1]){shape([[0,0],[s*.11,.09],[s*.06,.13],[0,.08]],.025,x,y+h*.19,z-.012,M.gold);}add(tf(new THREE.ConeGeometry(.067,h*.48,6),x,y+h*.76,z),M.gold);}
  finial(.73,3.75,1.48,.44);finial(-.94,3.36,1.25,.28);
  // Small left dormer with leaded arched glazing.
  box(-.94,2.75,.76,.58,.59,.62,M.plaster);shape([[-.38,0],[.38,0],[0,.48]],.53,-.94,2.88,.61,M.wood);
  for(const s of [-1,1]){box(-.94+s*.22,3.12,.87,.59,.065,.8,M.roof,0,0,-s*.82);beam([-.94,3.36,1.29],[-.94+s*.45,2.91,1.29],.035,M.gold);}arch(-.94,2.6,1.292,.34,.59,.022,M.glass);archRim(-.94,2.6,1.32,.36,.61,.035,M.gold);beam([-.94,2.61,1.35],[-.94,3.12,1.35],.013,M.wood);box(-.94,2.57,1.31,.53,.08,.16,M.stone);
  // Chimney with staggered limestone blocks and blue cap.
  box(1.15,3.12,-.78,.42,1.11,.43,M.mortar);for(let r=0;r<5;r++){for(let j=0;j<2;j++){box(1.045+j*.21,2.65+r*.205,-.55,.198,.188,.035,(r+j)%2?M.stone:M.stone2);box(1.375,2.65+r*.205,-.885+j*.21,.035,.188,.198,(r+j)%2?M.stone2:M.stone);}}box(1.15,3.68,-.78,.55,.16,.55,M.stone);box(1.15,3.78,-.78,.39,.06,.4,M.roof);finial(1.15,3.81,-.78,.3);
  // Large recessed storefront and stained-glass wood mullions.
  box(-.77,1.11,1.338,1.68,1.34,.06,M.woodDark);box(-.77,1.12,1.378,1.52,1.18,.04,M.glass);
  for(const x of [-1.6,-1.08,-.56,.02]){box(x,1.1,1.44,.055,1.28,.08,M.wood);for(const y of [.54,1.65])sphere(x,y,1.485,.04,M.gold,.8,.8,.5);}for(const y of [.53,.94,1.64])box(-.79,y,1.44,1.72,.055,.09,M.wood);box(-.78,.48,1.46,1.86,.12,.25,M.wood);for(let i=0;i<3;i++){let x=-1.35+i*.53;archRim(x,1.13,1.445,.44,.51,.018,M.gold);}
  // Neutral 2.0 by .5 sign board reserved for game text overlay.
  box(-.53,2.16,1.55,2.05,.54,.075,M.woodDark);box(-.53,2.16,1.595,1.96,.45,.025,M.roof);for(const y of [1.91,2.41])box(-.53,y,1.621,2.05,.028,.022,M.gold);for(const x of [-1.54,.48])box(x,2.16,1.621,.028,.5,.022,M.gold);
  // Arched door and block voussoirs; handles and hinges are actual geometry.
  arch(.79,.26,1.37,.84,1.67,.09,M.woodDark);arch(.79,.29,1.48,.73,1.54,.032,M.wood);arch(.79,.9,1.519,.55,.85,.016,M.glass);archRim(.79,.25,1.51,.96,1.84,.086,M.stone);archRim(.79,.3,1.55,.75,1.56,.038,M.woodLight);
  for(let i=0;i<5;i++){let x=.49+i*.148;box(x,.58,1.535,.13,.54,.034,i%2?M.wood:M.woodLight);}for(const y of [.35,.78])box(.79,y,1.566,.67,.046,.025,M.woodDark);for(const x of [.57,.79,1.01])box(x,1.18,1.56,.022,.57,.022,M.gold);box(.79,1.13,1.56,.55,.025,.024,M.gold);for(const s of [-1,1])beam([.79,1.75,1.56],[.79+s*.2,1.48,1.56],.014,M.gold);
  for(let i=0;i<9;i++){const a=i*Math.PI/8;box(.79+Math.cos(a)*.505,1.61+Math.sin(a)*.505,1.49,.17,.135,.21,i%2?M.stone2:M.stone,0,0,a-Math.PI/2);}for(const x of [.31,1.27])for(let i=0;i<4;i++)box(x,.43+i*.28,1.44,.16,.252,.18,i%2?M.stone:M.stone2);
  beam([.49,.65,1.595],[.49,.88,1.595],.018,M.gold);sphere(.49,.79,1.616,.035,M.gold);for(const y of [.42,.79])box(1.07,y,1.582,.16,.025,.026,M.gold);
  // New moon badge above doorway.
  arch(.79,2.14,1.665,.77,.62,.025,M.roof3);archRim(.79,2.14,1.705,.8,.65,.038,M.gold);crescent(.75,2.45,1.725,.22);star(.85,2.46,1.75,.12);
  // Entrance steps: front end exactly z=2.1.
  for(let i=0;i<3;i++){const h=.075*(i+1),z=1.92-i*.18;box(.79,h/2,z,1.1,h,.32,M.stone);box(.79,h+.008,z+.01,1.12,.025,.33,i%2?M.stone2:M.stone);}box(.79,.244,1.52,.72,.012,.3,M.roof3);star(.79,.255,1.64,.065,Math.PI/2);
  // Red and ivory striped curved canopy with scalloped hanging edge.
  const awX=-.78,awW=1.9,nstripe=10;
  for(let i=0;i<nstripe;i++){const x0=awX-awW/2+i*awW/nstripe,x1=x0+awW/nstripe-.004,m=i%2?M.canopyCream:M.canopyRose;for(let j=0;j<5;j++){let t0=j/5,t1=(j+1)/5;const f=t=>[1.45+t*.62,1.88-.13*t-.12*t*t];let p=f(t0),q=f(t1);quad([x0,p[1],p[0]],[x1,p[1],p[0]],[x1,q[1],q[0]],[x0,q[1],q[0]],m,.014);}const pts=[[-awW/nstripe/2,0],[awW/nstripe/2,0],[awW/nstripe/2,-.095]];for(let j=0;j<=8;j++){let a=j*Math.PI/8;pts.push([Math.cos(a)*awW/nstripe/2,-.095-Math.sin(a)*.06]);}shape(pts,.025,(x0+x1)/2,1.63,2.06,m);}
  beam([-1.76,1.64,2.04],[.22,1.64,2.04],.025,M.gold);for(const x of [-1.75,.21]){beam([x,1.92,1.4],[x,1.64,2.04],.025,M.gold);sphere(x,1.64,2.04,.054,M.gold);}
  // Fruit crates and shop shelving add depth below the display glazing.
  function crate(x,z,w=.7){box(x,.37,z,w,.36,.4,M.woodDark);for(const s of [-1,1])for(let r=0;r<3;r++)box(x,.235+r*.115,z+s*.21,w,.09,.035,r%2?M.woodLight:M.wood);for(const q of [-1,1])box(x+q*(w/2-.045),.38,z+.224,.07,.4,.05,M.woodLight);beam([x-w/2+.04,.21,z+.26],[x+w/2-.04,.56,z+.26],.026,M.woodLight);for(let i=0;i<4;i++)for(let j=0;j<2;j++){const xx=x-w*.33+i*w*.22,zz=z-.105+j*.19;const mm=(i+j)%3?M.fruitGold:M.fruitRed;sphere(xx,.59+Math.sin(i*2+j)*.018,zz,.08,mm,1,.92,1);beam([xx,.658,zz],[xx+.007,.695,zz],.006,M.woodDark);} }
  box(-.77,.092,1.73,1.73,.184,.54,M.stone);crate(-1.19,1.73,.72);crate(-.38,1.73,.65);for(let k=0;k<2;k++){box(-.77,.69+k*.38,1.39,1.46,.035,.23,M.woodLight);for(let i=0;i<7;i++)sphere(-1.34+i*.19,.76+k*.38,1.47,.055,i%2?M.fruitRed:M.fruitGold);}
  // Side leaded arched window, bay shelf, rear window and blue pennant.
  function sideWindow(x,y,z,ry){arch(x,y,z,.61,1.13,.027,M.glass,ry);archRim(x,y,z,.66,1.18,.045,M.wood,ry);const c=Math.cos(ry),s=Math.sin(ry);for(let i=-1;i<=1;i++)beam([x+c*i*.18,y+.07,z-s*i*.18],[x+c*i*.18,y+.85,z-s*i*.18],.014,M.gold);beam([x-c*.28,y+.57,z+s*.28],[x+c*.28,y+.57,z-s*.28],.015,M.gold);if(Math.abs(Math.cos(ry))<.1)box(x+.045,y-.03,z,.2,.12,.82,M.wood);else box(x,y-.03,z+.045,.82,.12,.2,M.wood);}
  sideWindow(1.665,.73,-.25,Math.PI/2);sideWindow(-1.665,.72,-.3,-Math.PI/2);sideWindow(0,.8,-1.344,Math.PI);
  box(1.71,1.43,.81,.18,1.16,.48,M.woodDark);box(1.805,1.43,.81,.04,1.02,.4,M.glass);for(const z of [.59,.81,1.03])box(1.835,1.43,z,.035,1.03,.026,M.gold);box(1.77,.85,.81,.28,.12,.61,M.wood);box(1.76,2.04,.81,.29,.09,.62,M.roof);
  beam([1.64,2.13,-.87],[1.87,2.13,-.87],.025,M.gold);beam([1.87,2.13,-.87],[1.87,2.13,-.32],.02,M.gold);shape([[-.23,0],[.23,0],[.23,-.58],[0,-.77],[-.23,-.58]],.027,1.84,2.08,-.6,M.roof3,Math.PI/2);crescent(1.88,1.78,-.6,.135,Math.PI/2);star(1.905,1.8,-.57,.06,Math.PI/2);
  // Lantern cages with warm cores; no built-in light sources.
  function lantern(x,y,z){pathTube([[x-.08,y+.35,z-.08],[x-.08,y+.49,z-.08],[x+.02,y+.52,z-.02],[x+.1,y+.42,z]],.019,M.gold,12);beam([x+.1,y+.42,z],[x+.1,y+.3,z],.014,M.gold);box(x+.1,y+.12,z,.145,.27,.145,M.glow);for(const dx of [-.087,.087])for(const dz of [-.087,.087])beam([x+.1+dx,y-.03,z+dz],[x+.1+dx*.7,y+.29,z+dz*.7],.012,M.gold);add(tf(new THREE.ConeGeometry(.145,.12,4),x+.1,y+.35,z,0,Math.PI/4),M.gold);box(x+.1,y-.04,z,.22,.045,.22,M.gold);sphere(x+.1,y-.1,z,.037,M.gold);}
  lantern(1.29,1.48,1.65);lantern(-1.56,1.23,1.63);
  // Pots, ivory flowers and ivy rise from grounded stems.
  function leaf(x,y,z,a,m=M.leaf){const geo=new THREE.SphereGeometry(1,6,4);geo.scale(.065,.13,.022);geo.rotateZ(a);geo.translate(x,y,z);add(geo,m);}
  function pot(x,z,h=.28){add(tf(new THREE.CylinderGeometry(.145,.11,h,10),x,.22+h/2,z),M.pot);add(tf(new THREE.TorusGeometry(.145,.02,5,10),x,.22+h,z,Math.PI/2),M.stone2);for(let i=0;i<5;i++){let a=i*2.4;leaf(x+Math.cos(a)*.1,.22+h+.13+Math.sin(i)*.025,z+Math.sin(a)*.09,a,i%2?M.leaf:M.leaf2);if(i%2===0){let fx=x+Math.cos(a)*.11,fy=.22+h+.24,fz=z+Math.sin(a)*.11;for(let k=0;k<5;k++)sphere(fx+Math.cos(k*1.256)*.034,fy+Math.sin(k*1.256)*.034,fz,.028,M.cream,1,1,.4);sphere(fx,fy,fz+.015,.019,M.fruitGold);}}}
  box(1.52,.11,1.5,.35,.22,.35,M.stone);pot(1.52,1.5,.3);pot(-1.59,1.22,.35);pot(-1.49,-1.14,.27);
  const vinePts=[[1.65,.28,1.32],[1.68,.66,1.35],[1.6,.99,1.37],[1.69,1.34,1.34],[1.61,1.66,1.37],[1.65,2.14,1.32]];pathTube(vinePts,.015,M.woodDark,28);for(let i=0;i<21;i++){let y=.37+i*.082,x=1.65+Math.sin(i*1.1)*.055,s=i%2?1:-1;leaf(x+s*.075,y,1.38,s*.67,i%3?M.leaf:M.leaf2);}
  // Three light wisteria clusters share the awning's rose finish; no extra material or light.
  for(let j=0;j<3;j++)for(let k=0;k<3;k++)sphere(1.70+j*.045,1.94-k*.10-j*.055,1.39+j*.016,.055-k*.009,M.red,.78,1.2,.7);
  for(const side of [-1,1])for(let i=0;i<5;i++){const z=-1.04+i*.48;beam([side*1.63,2.16,z],[side*1.81,2.3,z],.044,M.wood);}
  // Merge same-material geometry into a small set of static draw calls.
  for(const b of batches.values()){let count=0;for(const geo of b.geos)count+=geo.attributes.position.count;const pos=new Float32Array(count*3),nor=new Float32Array(count*3);let offset=0;for(const geo of b.geos){pos.set(geo.attributes.position.array,offset);nor.set(geo.attributes.normal.array,offset);offset+=geo.attributes.position.array.length;geo.dispose();}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,b.m);mesh.name=b.name;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);}
  return g;
};

/* Stylized lighthouse game development after stopped img2threejs blockout.
 * Coordinate frame: base centre [0,0,0], +Y up, front +Z.
 * No external assets; all sculpting and material variation are deterministic.
 */
  I.BLDMODELS['lighthouse'] =function(THREE,kit){
  const root=new THREE.Group();root.name='lighthouse-arena';
  root.userData.sign=[0,2.48,1.16];
  const TAU=Math.PI*2,cache=new Map(),buckets=new Map();
  const mat=(color,opts={},kind)=>{const key=JSON.stringify([color,opts,kind]);if(!cache.has(key))cache.set(key,kit.mat(color,opts,kind));return cache.get(key);};
  const plaster=mat('#f0e5d5',{roughness:.92},'plaster'),limestone=mat('#e8decf',{roughness:.94},'stone');
  const stone=[limestone,limestone,limestone,limestone],dark=limestone;
  const slate=mat('#ad9abd',{roughness:.8},'roof'),navy=[slate,slate],roof=[slate,slate,slate];
  const gold=mat('#e8c48b',{roughness:.4,metalness:0.6},'metal'),goldShade=mat('#b9a184',{roughness:.4,metalness:0.6},'metal');
  const wood=mat('#cda67e',{roughness:.8},'wood'),woodDark=mat('#947b7b',{roughness:.8},'wood');
  const crystal=mat('#f4c994',{roughness:.3,emissive:'#ffd39d',emissiveIntensity:.28}),crystalLight=crystal;
  const pane=kit.win();
  // Glass shells must not mutate kit.win(): it is shared by every building window.
  const lanternGlass=mat('#e8deef',{roughness:.18,metalness:.1,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide},'glass');
  function push(g,m,name){if(g.index){const a=g.toNonIndexed();g.dispose();g=a;}const key=name+'|'+m.uuid;if(!buckets.has(key))buckets.set(key,{name,m,list:[]});buckets.get(key).list.push(g);}
  function place(g,m,name,pos=[0,0,0],rot=[0,0,0]){g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...pos);push(g,m,name);}
  function cyl(rt,rb,h,m,name,pos,n=32){place(new THREE.CylinderGeometry(rt,rb,h,n,1),m,name,pos);}
  function box(w,h,d,m,name,pos,rot){place(new THREE.BoxGeometry(w,h,d),m,name,pos,rot);}
  function tor(r,t,m,name,y,n=48){place(new THREE.TorusGeometry(r,t,6,n),m,name,[0,y,0],[Math.PI/2,0,0]);}
  function line(points,r,m,name,segs=2){const vs=points.map(p=>new THREE.Vector3(...p)),curve=new THREE.CatmullRomCurve3(vs);push(new THREE.TubeGeometry(curve,Math.max(points.length*segs,8),r,5,false),m,name);}
  function rod(a,b,r,m,name,n=7){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),g=new THREE.CylinderGeometry(r,r,d.length(),n,1);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));g.translate(...va.add(vb).multiplyScalar(.5).toArray());push(g,m,name);}
  function sector(ri,ro,y,h,a,span,m,name,segments=3,topR=ro){
    const pos=[],ind=[];for(let j=0;j<=segments;j++){const t=a+span*j/segments,s=Math.sin(t),c=Math.cos(t);const rit=Math.max(.001,ri-(ro-topR));pos.push(ri*s,y,ri*c,ro*s,y,ro*c,rit*s,y+h,rit*c,topR*s,y+h,topR*c);}
    const q=(a,b,c,d)=>ind.push(a,b,d,b,c,d);
    for(let j=0;j<segments;j++){const o=j*4,n=o+4;q(o+1,n+1,n+3,o+3);q(o,n,n+1,o+1);q(o+2,o+3,n+3,n+2);q(o,o+2,n+2,n);}
    q(0,1,3,2);const e=segments*4;q(e+1,e,e+2,e+3);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals();push(g,m,name);
  }
  function profile(w,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h*.62);s.quadraticCurveTo(w*.48,h*.84,0,h);s.quadraticCurveTo(-w*.48,h*.84,-w/2,h*.62);s.closePath();return s;}
  function arch(w,h,th,depth,m,name,pos,ang=0){const s=profile(w,h),inner=profile(w-2*th,h-th*1.65);const pts=inner.getPoints(16).map(v=>new THREE.Vector2(v.x,v.y+th));const hole=new THREE.Path(pts.reverse());s.holes.push(hole);const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:1,steps:1,curveSegments:10});place(g,m,name,pos,[0,ang,0]);}
  function diamond(r,parity){const v=[[0,r,0],[r,0,0],[0,0,r],[-r,0,0],[0,0,-r],[0,-r,0]],pos=[];for(let i=0;i<4;i++){if(parity!==undefined&&i%2!==parity)continue;for(const k of [0,1+(i+1)%4,1+i,5,1+i,1+(i+1)%4])pos.push(...v[k]);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;}
  function finial(x,y,z,s=1){cyl(.065*s,.085*s,.07*s,gold,'gold-finials',[x,y+.035*s,z],12);cyl(.023*s,.055*s,.13*s,gold,'gold-finials',[x,y+.12*s,z],8);const g=diamond(.09*s);g.scale(.64,1.7,.64);place(g,gold,'gold-finials',[x,y+.255*s,z]);cyl(.001,.025*s,.15*s,gold,'gold-finials',[x,y+.43*s,z],8);}
  const radius=y=>.87-(Math.max(.42,Math.min(4.65,y))-.42)*.035;
  // Separate circular base bucket keeps footprint auditable after geometry merging.
  cyl(1.135,1.135,.1,dark,'circular-base',[0,.05,0],48);
  for(let layer=0;layer<3;layer++){
    const ro=1.14-layer*.055,y=.1+layer*.105;
    for(let i=0;i<24;i++){const a=i*TAU/24+(layer%2)*TAU/48;sector(.68,ro,y,.1,a+.004,TAU/24-.008,stone[(i+layer*3)%4],'circular-base',3);}
  }
  cyl(.91,.98,.12,stone[0],'stone-base',[0,.425,0],48);
  // Continuous tapered plaster avoids dense ashlar seams. Only two quiet lilac belts.
  cyl(radius(4.65)-.014,radius(.45)-.014,4.2,plaster,'tower-body-core',[0,2.55,0],48);
  cyl(radius(4.65),radius(.45),4.2,plaster,'tower-body',[0,2.55,0],48);
  for(const y of [.78,2.66])cyl(radius(y+.08)+.008,radius(y-.08)+.008,.16,slate,'tower-belts',[0,y,0],48);
  // Concentric carved collars at base and under lantern balcony.
  cyl(.895,.915,.09,stone[2],'tower-collars',[0,.53,0],48);
  cyl(.76,.77,.095,stone[2],'tower-collars',[0,4.55,0],48);
  cyl(1.045,.82,.13,stone[1],'balcony-stone',[0,4.64,0],48);
  cyl(1.105,1.105,.11,stone[2],'balcony-stone',[0,4.76,0],48);
  tor(1.07,.026,gold,'balcony-gold',4.825);
  // Projecting carved brackets, each rooted to the tower wall.
  for(let i=0;i<12;i++){
    const a=i*TAU/12,s=Math.sin(a),c=Math.cos(a);
    const pts=[[.75*s,4.2,.75*c],[.77*s,4.4,.77*c],[.91*s,4.54,.91*c],[1.04*s,4.59,1.04*c]];
    line(pts,.05,stone[2],'balcony-corbels',3);
    cyl(.055,.038,.14,stone[1],'balcony-corbels',[.77*s,4.18,.77*c],8);
    cyl(.062,.062,.044,gold,'balcony-gold',[.77*s,4.27,.77*c],8);
  }
  // Gold balcony: solid posts, two rails, repeated small spear caps.
  tor(1.035,.025,gold,'balcony-gold',4.95);tor(1.035,.027,gold,'balcony-gold',5.2);
  for(let i=0;i<16;i++){const a=i*TAU/16,x=1.035*Math.sin(a),z=1.035*Math.cos(a);cyl(.047,.047,.018,goldShade,'balcony-gold',[x,4.824,z],8);rod([x,4.833,z],[x,5.24,z],i%2?.016:.024,gold,'balcony-gold');if(i%2===0)finial(x,5.2,z,.4);}
  // Staircase: 62 discrete horizontal treads rising around the cylindrical masonry.
  const stairPoints=[],supportPoints=[];
  for(let i=0;i<62;i++){
    const t=i/61,a=.53+t*TAU*1.12,y=1.57+t*2.99,ri=radius(y)-.025,ro=1.105;
    sector(ri,ro,y-.075,.075,a,.125,stone[(i%3===0)?2:0],'spiral-treads',2);
    if(i%3===0){const aa=a+.062,x=1.085*Math.sin(aa),z=1.085*Math.cos(aa);rod([x,y+.02,z],[x,y+.29,z],.013,gold,'stair-gold');}
    const aa=a+.062;stairPoints.push([1.085*Math.sin(aa),y+.29,1.085*Math.cos(aa)]);supportPoints.push([1.075*Math.sin(aa),y-.08,1.075*Math.cos(aa)]);
  }
  line(stairPoints,.015,gold,'stair-gold',1);line(supportPoints,.038,stone[1],'stair-stringer',1);
  // Repeated pointed arched windows with real raised frame depth and inset glazing.
  function windowAt(a,y,w=.29,h=.78){const r=radius(y)+.015,x=Math.sin(a)*r,z=Math.cos(a)*r;const g=profile(w-.055,h-.08);place(new THREE.ExtrudeGeometry(g,{depth:.015,bevelEnabled:false,curveSegments:8}),pane,'arched-window-glass',[x,y,z],[0,a,0]);arch(w+.055,h+.04,.052,.036,stone[2],'window-stone',[x,y-.025,z],a);arch(w-.005,h-.025,.017,.048,gold,'window-gold',[x+Math.sin(a)*.027,y+.005,z+Math.cos(a)*.027],a);const p0=[x+Math.sin(a)*.07,y+.06,z+Math.cos(a)*.07],p1=[p0[0],y+h-.12,p0[2]];rod(p0,p1,.009,gold,'window-gold',6);box(w+.09,.055,.12,stone[0],'window-stone',[x,y-.035,z],[0,a,0]);}
  windowAt(.88,1.05,.27,.77);windowAt(-.9,2.85,.27,.83);windowAt(.1,3.65,.26,.72);windowAt(Math.PI,2.35,.27,.8);windowAt(Math.PI*1.5,1.2,.25,.72);
  // Front entrance platform and radial stone steps extending only to z=1.57.
  for(let k=0;k<3;k++)box(.9+k*.16,.105,.27,stone[k%4],'front-entry-steps',[0,.29-k*.095,1.12+k*.12]);
  box(.98,.12,.48,stone[2],'front-entry-steps',[0,.39,1.0]);
  const doorShape=profile(.59,1.23);place(new THREE.ExtrudeGeometry(doorShape,{depth:.05,bevelEnabled:true,bevelThickness:.01,bevelSize:.01,bevelSegments:1,curveSegments:10}),wood,'entrance-door',[0,.45,1.035]);
  arch(.88,1.49,.095,.16,stone[2],'entrance-porch',[0,.39,1.01]);
  arch(.69,1.32,.026,.055,goldShade,'entrance-gold',[0,.43,1.09]);
  for(let x of [-.205,-.1,0,.1,.205])box(.008,1.0,.009,woodDark,'door-plank-seams',[x,.96,1.097]);
  for(let side of [-1,1]){box(.18,1.15,.22,stone[0],'entrance-porch',[side*.48,.99,1.03]);box(.23,.11,.27,stone[2],'entrance-porch',[side*.48,.53,1.03]);box(.22,.09,.27,goldShade,'entrance-gold',[side*.48,1.5,1.03]);}
  // Porch gable roof, overlapping slate rows and gold fascia.
  const roofY=1.84,roofHalf=.64,rise=.42,roofZ=1.0,roofDepth=.61;
  const gable=new THREE.Shape();gable.moveTo(-roofHalf,roofY);gable.lineTo(roofHalf,roofY);gable.lineTo(0,roofY+rise);gable.closePath();place(new THREE.ExtrudeGeometry(gable,{depth:.1,bevelEnabled:false}),stone[2],'porch-gable',[0,0,roofZ-roofDepth/2]);
  for(let side of [-1,1]){
    for(let j=0;j<4;j++){const x=side*(j+.5)*roofHalf/4,y=roofY+rise*(1-Math.abs(x)/roofHalf);box(roofHalf/4+.035,.055,roofDepth,roof[j%3],'porch-slate',[x,y+.025,roofZ],[0,0,-side*Math.atan2(rise,roofHalf)]);}
    rod([0,roofY+rise+.045,roofZ+roofDepth/2],[side*(roofHalf+.025),roofY+.02,roofZ+roofDepth/2],.026,gold,'entrance-gold',8);
  }
  box(.065,.06,.7,gold,'entrance-gold',[0,roofY+rise+.04,roofZ]);
  // Navy and gold sign backboard, physically bracketed to masonry behind the game label.
  box(1.82,.47,.06,gold,'sign-frame',[0,2.48,1.07]);
  box(1.75,.4,.085,navy[0],'sign-backboard',[0,2.48,1.075]);
  for(let side of [-1,1]){box(.055,.07,.5,goldShade,'sign-brackets',[side*.56,2.39,.83]);rod([side*.56,2.18,.63],[side*.56,2.39,1.03],.022,goldShade,'sign-brackets');}
  // Four short perimeter stone pillars topped by tiny gold spires.
  for(const a of [Math.PI*.25,-Math.PI*.25,Math.PI*.76,-Math.PI*.76]){const x=.96*Math.sin(a),z=.96*Math.cos(a);cyl(.112,.138,.12,stone[2],'base-pillars',[x,.36,z],8);cyl(.085,.1,.4,stone[0],'base-pillars',[x,.62,z],8);cyl(.13,.13,.09,stone[2],'base-pillars',[x,.855,z],8);cyl(.08,.1,.06,gold,'gold-finials',[x,.93,z],8);finial(x,.95,z,.5);}
  // Door diamond emblem and ring handles.
  const emblem=diamond(.1);emblem.scale(.66,1.2,.24);place(emblem,gold,'entrance-gold',[0,1.26,1.13]);
  place(new THREE.TorusGeometry(.035,.009,5,10),gold,'entrance-gold',[.16,.91,1.13]);
  // A thrust bearing carries the rotating lamp and its concentric Fresnel drum.
  function band(ro,ri,h,y,m,name,n=32){place(new THREE.LatheGeometry([[ri,-h/2],[ro,-h/2],[ro,h/2],[ri,h/2],[ri,-h/2]].map(v=>new THREE.Vector2(...v)),n),m,name,[0,y,0]);}
  cyl(.65,.72,.12,goldShade,'lantern-base',[0,4.9,0],32);cyl(.69,.69,.05,gold,'lantern-base',[0,4.985,0],32);
  cyl(.20,.25,.055,goldShade,'crystal-mount',[0,5.0375,0],24);
  band(.215,.075,.026,5.078,gold,'crystal-mount',24);
  cyl(.065,.065,.040,goldShade,'crystal-mount',[0,5.098,0],16);
  cyl(.365,.365,.035,gold,'crystal-mount',[0,5.1355,0],32);
  cyl(.18,.25,.045,goldShade,'crystal-mount',[0,5.1755,0],24);
  const cup=new THREE.LatheGeometry([[.012,5.198],[.030,5.198],[.063,5.28],[.042,5.28],[.012,5.218],[.012,5.198]].map(v=>new THREE.Vector2(...v)),16);push(cup,gold,'crystal-mount');
  const cg=diamond(.22,0);cg.scale(.66,1.28,.66);place(cg,crystal,'luminous-crystal',[0,5.48,0],[0,Math.PI/8,0]);
  const cg2=diamond(.22,1);cg2.scale(.66,1.28,.66);place(cg2,crystalLight,'crystal-light-facets',[0,5.48,0],[0,Math.PI/8,0]);
  // Solid stepped annuli sit on a continuous transparent cylindrical lens wall.
  band(.301,.287,.486,5.504,lanternGlass,'fresnel-lens',48);
  for(let j=0;j<7;j++){
    const y=5.30+j*.064,r=.312+.016*(1-Math.abs(j-3)/3);
    const lens=new THREE.LatheGeometry([[.301,y-.026],[r,y-.026],[r+.009,y],[.301,y+.026],[.301,y-.026]].map(v=>new THREE.Vector2(...v)),48);push(lens,lanternGlass,'fresnel-lens');
  }
  band(.345,.287,.024,5.249,gold,'crystal-cage',32);band(.345,.287,.024,5.759,gold,'crystal-cage',32);
  for(let i=0;i<4;i++){const a=Math.PI/4+i*TAU/4,x=.337*Math.sin(a),z=.337*Math.cos(a);rod([x,5.153,z],[x,5.771,z],.010,gold,'crystal-cage',8);cyl(.017,.017,.015,goldShade,'crystal-cage',[x,5.779,z],6);}
  for(let i=0;i<12;i++){const a=i*TAU/12;cyl(.012,.012,.010,goldShade,'crystal-mount',[.197*Math.sin(a),5.096,.197*Math.cos(a)],6);}
  // Octagonal room: two solid panes per bay, separated by a real vertical mullion.
  for(let i=0;i<8;i++){
    const a=i*TAU/8+Math.PI/8,x=.685*Math.sin(a),z=.685*Math.cos(a),a2=a+TAU/8,x2=.685*Math.sin(a2),z2=.685*Math.cos(a2),mx=(x+x2)/2,mz=(z+z2)/2;
    rod([x,4.99,z],[x,5.96,z],.025,gold,'lantern-frame',8);
    cyl(.044,.052,.05,gold,'lantern-frame',[x,5.1,z],8);cyl(.051,.035,.07,gold,'lantern-frame',[x,5.88,z],8);
    const dx=x2-x,dz=z2-z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,yaw=Math.atan2(-uz,ux),w=(len-.062)/2;
    for(const side of [-1,1])box(w,.85,.006,lanternGlass,'lantern-glass',[mx+side*ux*(w/2+.007),5.5,mz+side*uz*(w/2+.007)],[0,yaw,0]);
    box(.014,.85,.018,gold,'lantern-frame',[mx,5.5,mz],[0,yaw,0]);
    for(const y of [5.065,5.935])rod([x,y,z],[x2,y,z2],.015,gold,'lantern-frame',8);
    // The tracery is carried outside the glazing, returning into both corner posts.
    const nx=Math.sin(a+Math.PI/8)*.016,nz=Math.cos(a+Math.PI/8)*.016;
    line([[x,5.65,z],[x*.9+mx*.1+nx,5.8,z*.9+mz*.1+nz],[mx+nx,5.96,mz+nz],[x2*.9+mx*.1+nx,5.8,z2*.9+mz*.1+nz],[x2,5.65,z2]],.012,gold,'lantern-tracery',3);
  }
  // Octagonal sill/eave rails land on all eight post heads instead of floating circles.
  for(const y of [5.01,5.96])for(let i=0;i<8;i++){const a=i*TAU/8+Math.PI/8,b=a+TAU/8;rod([.685*Math.sin(a),y,.685*Math.cos(a)],[.685*Math.sin(b),y,.685*Math.cos(b)],.024,gold,'lantern-frame',8);}
  // Conical slate roof in staggered individual segments, with thin gold radial ribs.
  cyl(.92,.92,.075,goldShade,'roof-eave',[0,6.0,0],48);tor(.92,.024,gold,'roof-gold',6.04);
  const roofBottom=6.04,roofHeight=.84,r0=.91,r1=.12,rows=6,columns=24;
  cyl(.12,.91,.84,roof[0],'slate-roof',[0,6.46,0],48);
  for(let j=0;j<rows;j++){
    const y=roofBottom+j*roofHeight/rows,ro=r0-(r0-r1)*j/rows,rt=r0-(r0-r1)*(j+1)/rows;
    for(let i=0;i<columns;i++){const a=i*TAU/columns+(j%2)*TAU/columns*.5;sector(Math.max(.02,ro-.05),ro,y,.14,a+.004,TAU/columns-.008,roof[(i+j*2)%3],'slate-roof',2,rt);}
  }
  for(let i=0;i<8;i++){const a=i*TAU/8+Math.PI/8;rod([.925*Math.sin(a),6.06,.925*Math.cos(a)],[.12*Math.sin(a),6.88,.12*Math.cos(a)],.016,gold,'roof-gold',6);}
  // Open vent neck under a rain cap; existing finial and maximum height stay fixed.
  band(.115,.075,.022,6.891,gold,'roof-gold',16);
  for(let i=0;i<8;i++){const a=i*TAU/8;box(.018,.031,.018,goldShade,'roof-gold',[.095*Math.sin(a),6.9175,.095*Math.cos(a)]);}
  cyl(.045,.15,.01975,gold,'roof-gold',[0,6.942875,0],16);
  const top=diamond(.105);top.scale(.64,1.45,.64);place(top,gold,'roof-gold',[0,7.105,0]);
  cyl(.001,.018,.14,gold,'roof-gold',[0,7.31,0],8);
  // Merge by semantic assembly and cached material; keep stable human-readable names.
  for(const {name,m,list} of buckets.values()){
    let count=0;for(const g of list)count+=g.getAttribute('position').count;
    const pos=new Float32Array(count*3),norm=new Float32Array(count*3);let off=0;
    for(const g of list){const p=g.getAttribute('position'),n=g.getAttribute('normal');pos.set(p.array,off);if(n)norm.set(n.array,off);off+=p.count*3;g.dispose();}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(norm,3));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  return root;
};

})(typeof window !== 'undefined' ? window : globalThis);
