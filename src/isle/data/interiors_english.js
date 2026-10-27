/* 潮汐小島 · english 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['english'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['english'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'Lexi・故事書字母屋';
    const C = { cream:'#fff4ee', wood:'#b07a4a', honey:'#d6a363', dark:'#654835', rose:'#d98aa0', blue:'#8cc8ef', pink:'#edb0c9', lilac:'#a695cf', leaf:'#6f8e62', gold:'#d9ad59', chalk:'#30474c', paper:'#fff9df' };
    // 同色依用途共用材質；只在色票建立一次，不增加幾何或改動動線。
    const finish = { wood:{roughness:.72}, fabric:{roughness:1}, ceramic:{roughness:.28}, metal:{metalness:.82,roughness:.36}, foliage:{roughness:.88}, paper:{roughness:.92}, plaster:{roughness:.9}, stone:{roughness:.94} };
    const kinds = { cream:'plaster', wood:'wood', honey:'wood', dark:'wood', rose:'fabric', blue:'wood', pink:'fabric', lilac:'fabric', leaf:'foliage', gold:'metal', chalk:'stone', paper:'paper' };
    const M = {}; Object.keys(C).forEach(k => { const kind = kinds[k]; M[k] = kit.mat(C[k], finish[kind], kind); });
    const swatches = (kind, keys) => Object.fromEntries(keys.split(' ').map(k => [k, kit.mat(C[k], finish[kind], kind)]));
    const cloth = swatches('fabric', 'blue paper gold dark');
    const glaze = swatches('ceramic', 'blue pink paper rose dark gold');
    const petal = swatches('foliage', 'pink lilac rose gold');
    const print = swatches('paper', 'blue pink lilac rose leaf wood gold');
    const timber = swatches('wood', 'lilac pink cream');
    const iron = swatches('metal', 'dark rose');
    const stone = swatches('stone', 'cream');
    const glass = kit.glass(), view = kit.view(), glow = kit.lamp('#ffe0a6');
    const Y = 4.4, T = .32;
    const floorM = ['#c7ab89','#c1a382','#cfb493'].map(c => kit.mat(c,finish.wood,'wood'));
    function mesh(geo, m, x=0,y=0,z=0, solid=false, walk=false) {
      const o = new THREE.Mesh(geo, m); o.position.set(x,y,z); o.userData.solid=solid; o.userData.walk=walk; g.add(o); return o;
    }
    function box(x,y,z,w,h,d,m,solid=false,walk=false,r=0) { return mesh(r ? kit.rbox(w,h,d,r) : new THREE.BoxGeometry(w,h,d),m,x,y,z,solid,walk); }
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1) { const o=mesh(new THREE.SphereGeometry(r,10,6),m,x,y,z);o.scale.set(sx,sy,sz);return o; }
    function beam(a,b,r,m) { const A=new THREE.Vector3(...a), B=new THREE.Vector3(...b); const o=mesh(new THREE.CylinderGeometry(r,r,A.distanceTo(B),6),m,...A.clone().add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());return o; }
    function at(x,z,u,d,a) {return [x+u*Math.cos(a)+d*Math.sin(a),z-u*Math.sin(a)+d*Math.cos(a)];}
    function localBox(x,z,u,y,d,w,h,dep,m,a=0,solid=false) {const p=at(x,z,u,d,a);const o=box(p[0],y,p[1],w,h,dep,m,solid);o.rotation.y=a;return o;}
    function profile(points,depth,x,y,z,m,a=0,solid=false) { const s=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));const o=mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:16}),m,x,y,z,solid);o.rotation.y=a;return o; }
    function arch(w,h) {const r=w/2,cy=h-r,p=[[-r,0],[r,0],[r,cy]];for(let j=1;j<=20;j++){const a=j*Math.PI/20;p.push([r*Math.cos(a),cy+r*Math.sin(a)]);}return p;}
    function wall(x,z,w,bottom,top,a=0,opening) {
      const s=new THREE.Shape([new THREE.Vector2(-w/2,bottom),new THREE.Vector2(w/2,bottom),new THREE.Vector2(w/2,top),new THREE.Vector2(-w/2,top)]);
      if(opening) {const p=opening.circle ? Array.from({length:40},(_,j)=>[opening.x+Math.cos(j*Math.PI/20)*opening.r,opening.y+Math.sin(j*Math.PI/20)*opening.r]) : arch(opening.w,opening.h).map(p=>[p[0]+opening.x,p[1]+opening.y]);s.holes.push(new THREE.Path(p.map(v=>new THREE.Vector2(...v)).reverse()));}
      const o=mesh(new THREE.ExtrudeGeometry(s,{depth:T,bevelEnabled:false,curveSegments:16}),M.cream,x,0,z,true);o.rotation.y=a;
      localBox(x,z,0,bottom+.15,-.035,w,.3,.09,M.blue,a);
      localBox(x,z,0,bottom+.42,-.06,w,.07,.1,M.honey,a);
      localBox(x,z,0,top-.10,-.04,w,.18,.15,M.wood,a);
      for(const u of [-w/2+.09,w/2-.09])localBox(x,z,u,(bottom+top)/2,-.08,.18,top-bottom,.18,M.wood,a);
      return o;
    }
    function windowAt(x,z,w,bottom,top,a,op,shutters=true) {
      wall(x,z,w,bottom,top,a,op);
      const r=op.circle?op.r:op.w/2,cy=op.circle?op.y:op.y+(op.h-r),lo=op.circle?op.y-r:op.y;
      const outline=op.circle?Array.from({length:41},(_,j)=>[op.x+r*Math.cos(j*Math.PI/20),op.y+r*Math.sin(j*Math.PI/20)]):arch(op.w,op.h).map(p=>[p[0]+op.x,p[1]+op.y]);
      for(let j=1;j<outline.length;j++){const p=at(x,z,outline[j-1][0],-.04,a),q=at(x,z,outline[j][0],-.04,a);beam([p[0],outline[j-1][1],p[1]],[q[0],outline[j][1],q[1]],.07,M.honey);}
      const pts=op.circle?outline.slice(0,-1):outline;
      const p=at(x,z,0,.14,a);const pane=profile(pts,.016,p[0],0,p[1],glass,a);pane.userData.camThrough=true;
      const v=at(x,z,op.x,.75,a),h=op.circle?r*2:op.h;
      const sky=mesh(new THREE.PlaneGeometry(r*2+.7,h+.7),view,v[0],lo+h/2,v[1]);sky.rotation.y=a+Math.PI;sky.userData.camThrough=true;
      localBox(x,z,op.x,lo+h*.48,-.1,r*1.98,.055,.09,M.wood,a);
      localBox(x,z,op.x,lo+h/2,-.1,.055,h,.09,M.wood,a);
      localBox(x,z,op.x,lo-.07,-.13,r*2+.34,.14,.45,M.honey,a);
      if(shutters) for(const side of [-1,1]){const u=op.x+side*(r+.34);for(let j=0;j<9;j++)localBox(x,z,u,lo+.12+j*(h-.25)/8,-.13,.43,.10,.08,M.blue,a);for(const edge of [-1,1])localBox(x,z,u+edge*.22,lo+h/2,-.14,.045,h,.09,M.blue,a);}
    }
    function floor(x,z,w,d,y) {box(x,y-.14,z,w,.28,d,floorM[0],false,true);box(x,y-.30,z,w,.045,d,M.cream);let j=0;for(let u=x-w/2;u<x+w/2-.01;u+=.7){const bw=Math.min(.69,x+w/2-u-.01);box(u+bw/2,y-.014,z,bw,.03,d-.02,floorM[j++%3]);}}
    const glyph={A:[[[0,0],[.5,1],[1,0]],[[.2,.42],[.8,.42]]],B:[[[0,0],[0,1],[.65,1],[1,.76],[.6,.52],[0,.52]],[[.15,.52],[.7,.52],[1,.24],[.65,0],[0,0]]],C:[[[1,.86],[.7,1],[.2,1],[0,.75],[0,.2],[.2,0],[.7,0],[1,.16]]],W:[[[0,1],[.2,0],[.5,.5],[.8,0],[1,1]]],O:[[[.2,0],[.8,0],[1,.2],[1,.8],[.8,1],[.2,1],[0,.8],[0,.2],[.2,0]]],R:[[[0,0],[0,1],[.65,1],[1,.75],[.65,.5],[0,.5]],[[.6,.5],[1,0]]],D:[[[0,0],[0,1],[.65,1],[1,.75],[1,.25],[.65,0],[0,0]]],H:[[[0,0],[0,1]],[[1,0],[1,1]],[[0,.5],[1,.5]]],I:[[[.5,0],[.5,1]],[[0,1],[1,1]],[[0,0],[1,0]]],T:[[[0,1],[1,1]],[[.5,0],[.5,1]]]};
    function word(text,x,y,z,size,m=M.paper,flip=false) {const px=u=>x+(flip?((text.length-1)*.85+.62)*size-u:u);for(let j=0;j<text.length;j++)for(const stroke of glyph[text[j]]||[])for(let k=1;k<stroke.length;k++)beam([px(j*size*.85+stroke[k-1][0]*size*.62),y+stroke[k-1][1]*size,z],[px(j*size*.85+stroke[k][0]*size*.62),y+stroke[k][1]*size,z],size*.04,m);}
    function books(x,y,z,n) {for(let j=0;j<n;j++){const h=.34+(j%4)*.075;box(x+j*.17,y+h/2,z,.13,h,.32,[print.blue,print.pink,print.lilac,print.rose][j%4]);box(x+j*.17,y+h*.25,z+.17,.07,.035,.02,M.gold);}}
    function shelf(x,y,z,w=2.5) {box(x,y+1.2,z,w,2.4,.48,M.wood,true);box(x,y+1.2,z+.25,w-.16,2.24,.03,M.dark);for(let j=0;j<4;j++){box(x,y+.1+j*.66,z+.07,w,.10,.57,M.honey);books(x-w/2+.19,y+.17+j*.66,z+.12,Math.floor(w/.22));}}
    function plant(x,y,z,s=1) {mesh(new THREE.CylinderGeometry(.22*s,.17*s,.35*s,8),glaze.blue,x,y+.175*s,z);for(let j=0;j<5;j++){const a=j*2.4;beam([x,y+.3*s,z],[x+Math.sin(a)*.26*s,y+(.65+j*.08)*s,z+Math.cos(a)*.22*s],.025*s,M.leaf);ball(x+Math.sin(a)*.25*s,y+(.63+j*.08)*s,z+Math.cos(a)*.21*s,.18*s,M.leaf,1,.55,.7);ball(x+Math.sin(a)*.25*s,y+(.76+j*.08)*s,z+Math.cos(a)*.21*s,.095*s,j%2?petal.pink:petal.lilac);}}
    function mug(x,y,z,m) {mesh(new THREE.CylinderGeometry(.10,.085,.18,10),m,x,y+.09,z);const o=mesh(new THREE.TorusGeometry(.07,.024,5,12),m,x+.12,y+.10,z);o.rotation.y=Math.PI/2;box(x,y+.185,z,.10,.008,.10,glaze.dark);}
    function bunnyChair(x,z,a) {const q=new THREE.Group();g.add(q);const start=g.children.length;box(x,.53,z,.88,.18,.85,M.honey,true,false,.05);box(x,.68,z,.78,.15,.74,M.pink,false,false,.07);for(const u of [-.3,.3])for(const v of [-.28,.28])box(x+u,.25,z+v,.10,.5,.10,M.wood);for(const u of [-.22,.22])ball(x+u,1.25,z+.30,.22,M.honey,.73,2.1,.33);box(x,1.00,z+.29,.65,.30,.12,M.honey);for(const o of g.children.slice(start)){g.remove(o);q.add(o);o.position.x-=x;o.position.z-=z;}q.position.set(x,0,z);q.rotation.y=a;}
    // Two storeys; the projecting bay is a real extension of the ground-floor plan.
    floor(0,0,12,11,0);
    const bay=[[-4.8,5.5],[.2,5.5],[.2,6.35],[-.8,7.6],[-3.8,7.6],[-4.8,6.35]];
    const bs=new THREE.Shape(bay.map(p=>new THREE.Vector2(p[0],-p[1])));const bg=new THREE.ExtrudeGeometry(bs,{depth:.28,bevelEnabled:false});bg.rotateX(-Math.PI/2);mesh(bg,floorM[1],0,-.28,0,false,true);
    floor(-1.35,1.2,9.3,8.6,Y);floor(0,-4.3,12,2.4,Y);floor(5.85,1.2,.3,8.6,Y);
    windowAt(-6,0,11,0,Y,-Math.PI/2,{x:.4,y:1.0,w:2.0,h:2.6});
    windowAt(6,0,11,0,Y,Math.PI/2,{x:.4,y:1.0,w:2.0,h:2.6});
    windowAt(0,-5.5,12,0,Y,Math.PI,{x:-.3,y:.95,w:2.7,h:2.7});
    wall(-5.4,5.5,1.2,0,Y);wall(1.1,5.5,1.8,0,Y);wall(5,5.5,2,0,Y);
    box(3,3.65,5.5,2,1.5,T,M.cream,true);box(3,1.4,5.68,1.8,2.8,.12,M.blue,true,false,.04);
    for(const x of [2.04,3.96])box(x,1.45,5.29,.13,2.9,.2,M.wood);ball(3.65,1.35,5.57,.09,M.gold);
    windowAt(-2.3,7.6,3.0,0,3.9,0,{x:0,y:1.05,w:2.62,h:2.48},false);
    const sideW=Math.hypot(1,1.25);
    windowAt(-4.3,6.975,sideW,0,3.9,-Math.atan2(1.25,1),{x:0,y:1.05,w:1.18,h:2.4},false);
    windowAt(-.3,6.975,sideW,0,3.9,Math.atan2(1.25,1),{x:0,y:1.05,w:1.18,h:2.4},false);
    wall(-4.8,5.925,.85,0,3.9,-Math.PI/2);wall(.2,5.925,.85,0,3.9,Math.PI/2);
    box(-2.3,3.98,6.5,5.05,.20,2.2,M.cream);
    // Upstairs windows preserve the front/rear round dormers and both side arches.
    windowAt(-6,0,11,Y,8.0,-Math.PI/2,{x:0,y:5.35,w:2.05,h:2.25});
    windowAt(6,0,11,Y,8.0,Math.PI/2,{x:0,y:5.35,w:2.05,h:2.25});
    wall(-4.45,5.5,3.1,Y,8);wall(3.65,5.5,4.7,Y,8);
    windowAt(-.8,5.5,4.2,Y,9.0,0,{circle:true,x:0,y:6.8,r:1.43});
    windowAt(0,-5.5,12,Y,8.0,Math.PI,{circle:true,x:-.3,y:6.55,r:.82});
    // Curved cross-ridge shell: closed sloping plaster soffits, split around the front dormer.
    const curve=[[0,11.65],[1.0,11.3],[2.0,10.6],[3.0,9.55],[4.0,8.6],[5.5,7.95]];
    function roofStrip(x0,x1,z0,y0,z1,y1) {const len=Math.hypot(z1-z0,y1-y0);const o=box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,.22,len,M.cream);o.rotation.x=-Math.atan2(y1-y0,z1-z0);for(const x of [x0+.1,x1-.1])beam([x,y0-.18,z0],[x,y1-.18,z1],.09,M.honey);}
    for(const sign of [-1,1])for(let j=1;j<curve.length;j++){const a=curve[j-1],b=curve[j];if(sign===1&&j>=4){roofStrip(-6,-2.9,sign*a[0],a[1],sign*b[0],b[1]);roofStrip(1.3,6,sign*a[0],a[1],sign*b[0],b[1]);}else roofStrip(-6,6,sign*a[0],a[1],sign*b[0],b[1]);}
    // Curved dormer head, and side gable infills above the side-window walls.
    const dp=[[-2.9,8.0],[-2.4,8.8],[-1.6,9.4],[-.8,9.65],[0,9.4],[.8,8.8],[1.3,8.0]];
    // Close the union of the curved main roof and the projecting dormer, without open cheek seams.
    function dormerHeight(x) {for(let j=1;j<dp.length;j++)if(x<=dp[j][0]){const a=dp[j-1],b=dp[j],t=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;}return 8;}
    function roofQuad(a,b,c,d) {const v=[a,b,c,d,...[a,b,c,d].map(p=>[p[0],p[1]-.18,p[2]])],idx=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7],q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(v.flat(),3));q.setIndex(idx);q.computeVertexNormals();mesh(q,M.cream);}
    for(let j=4;j<curve.length;j++){const a=curve[j-1],b=curve[j];for(let k=1;k<dp.length;k++){const x0=dp[k-1][0],x1=dp[k][0];roofQuad([x0,Math.max(a[1],dormerHeight(x0)),a[0]],[x1,Math.max(a[1],dormerHeight(x1)),a[0]],[x1,Math.max(b[1],dormerHeight(x1)),b[0]],[x0,Math.max(b[1],dormerHeight(x0)),b[0]]);}}
    box(-.8,9.36,5.5,4.2,.72,T,M.cream);
    for(let j=1;j<dp.length;j++)beam([dp[j-1][0],dp[j-1][1]-.18,5.45],[dp[j][0],dp[j][1]-.18,5.45],.075,M.honey);
    const gp=[[-5.5,7.95],...curve.slice().reverse().map(p=>[-p[0],p[1]]),...curve.slice(1).map(p=>[p[0],p[1]]),[5.5,7.95]];
    for(const side of [-1,1])profile(gp,.25,side*6,0,0,M.cream,Math.PI/2);
    for(const z of [-4.4,-2.2,0,2.2,4.4])box(0,Y-.38,z,11.8,.23,.20,M.wood);
    for(const x of [-5.5,-2.8,.5])box(x,Y-.40,0,.15,.28,10.8,M.honey);
    // A 1.8 m straight stair: 22 visible 0.20 m risers and one invisible, continuous walk ramp.
    const sx=4.5,z0=4.0,z1=-3.1,run=z0-z1,n=22;
    for(let j=0;j<n;j++){const h=(j+1)*Y/n;box(sx,h-.1,z0-(j+.5)*run/n,1.8,.20,run/n+.015,M.honey);box(sx,h+.006,z0-(j+.5)*run/n,1.23,.012,run/n-.02,M.pink);}
    const ramp=mesh(new THREE.PlaneGeometry(1.8,Math.hypot(run,Y)),M.wood,sx,Y/2,(z0+z1)/2,false,true);ramp.rotation.x=-Math.PI/2+Math.atan2(Y,run);ramp.visible=false;
    for(const x of [3.5,5.5]){beam([x,.9+Y*.50/run,z0-.50],[x,Y+.9,z1],.06,M.wood);for(let j=0;j<=11;j++){const z=j===0?z0-.50:z0-j*run/11,y=j===0?Y*.50/run:j*Y/11;box(x,y+.48,z,.09,.96,.09,M.honey,true);ball(x,y+1.0,z,.08,M.honey);}}
    // Landing guards leave the north approach open. Individual rails do not seal the stair mouth.
    for(const z of [-2,0,2,3.9])box(3.42,Y+.52,z,.10,1.04,.10,M.honey,true);
    box(3.42,Y+1.04,.9,.10,.10,6.2,M.wood,true);box(4.5,Y+1.04,4.09,2.2,.10,.10,M.wood,true);box(4.5,Y+.52,4.09,2.2,.08,.10,M.honey,true);
    // Bay reading sofa and social tea table, with unmistakable rabbit-ear chairs.
    box(-2.3,.40,6.85,2.85,.80,1.05,M.blue,true,false,.06);box(-2.3,.87,6.85,2.85,.17,1.08,M.pink,false,false,.08);
    for(let j=0;j<3;j++)box(-3.15+j*.85,1.12,7.16,.68,.56,.22,[M.rose,cloth.blue,M.lilac][j],false,false,.10);
    mesh(new THREE.CylinderGeometry(2.15,2.15,.028,48),M.pink,-2.3,.018,2.9);
    mesh(new THREE.CylinderGeometry(1.80,1.80,.031,48),cloth.paper,-2.3,.020,2.9);
    mesh(new THREE.CylinderGeometry(.75,.75,.13,32),M.honey,-2.3,.76,2.6,true);mesh(new THREE.CylinderGeometry(.13,.30,.68,10),M.wood,-2.3,.34,2.6,true);
    bunnyChair(-3.8,2.4,-Math.PI/2);bunnyChair(-2.1,.7,0);
    mug(-2.5,.83,2.5,glaze.blue);mug(-2.0,.83,2.6,glaze.pink);box(-2.35,.85,2.95,.42,.05,.32,M.lilac);
    shelf(-4.5,0,-5.05,2.6);shelf(-.6,0,-5.05,2.1);
    box(-3.3,1.0,-3.97,2.65,.15,1.10,M.honey,true,false,.04);for(const x of [-4.35,-2.25])for(const z of [-4.22,-3.58])box(x,.48,z,.12,.95,.12,M.wood,true);
    box(-3.45,1.11,-3.8,.9,.06,.55,M.paper);books(-2.8,1.09,-4.0,4);mug(-4.2,1.09,-3.9,glaze.pink);
    box(-3.3,2.65,-5.18,2.3,1.05,.08,M.blue);box(-3.3,2.65,-5.10,2.15,.90,.035,M.chalk);word('WORD',-4.12,2.62,-5.06,.37);
    // Tiny kitchenette, correspondence cabinet and three colour-coded mail slots.
    box(-5.48,.65,-1.5,.74,1.3,2.1,M.blue,true);box(-5.45,1.34,-1.5,.90,.12,2.2,glaze.paper);mug(-5.45,1.4,-1.1,glaze.pink);plant(-5.4,1.4,-2.2,.65);
    box(.85,.6,4.94,1.55,1.2,.65,M.blue,true);box(.85,1.24,4.94,1.65,.10,.75,M.honey);
    for(let j=0;j<3;j++){box(.25+j*.6,2.15,5.17,.48,.64,.22,[timber.pink,M.blue,M.gold][j],true,false,.06);box(.25+j*.6,2.30,5.02,.32,.045,.04,M.dark);word('ABC'[j],.12+j*.6,1.93,4.99,.28,M.paper,true);}
    box(1.4,2.55,-5.17,1.4,1.4,.09,M.honey);for(let j=0;j<5;j++){box(.95+(j%2)*.65,2.15+Math.floor(j/2)*.4,-5.10,.45,.32,.035,[M.paper,print.pink,print.blue][j%3]);}
    // Personal upstairs: a bunny bed, moon-window couch, pen-pal desk and a travelling trunk.
    box(-4.25,Y+.35,-3.65,2.2,.70,2.8,M.honey,true,false,.07);box(-4.25,Y+.76,-3.65,2.12,.22,2.7,cloth.paper,false,false,.08);box(-4.25,Y+.90,-3.0,2.16,.12,1.35,M.pink,false,false,.05);box(-4.25,Y+.98,-4.45,1.7,.25,.65,cloth.blue,false,false,.09);
    for(const x of [-4.75,-3.75])ball(x,Y+1.25,-4.95,.23,M.honey,.7,2.2,.35);
    shelf(-5.55,Y,1.6,.65);plant(-5.45,Y,.55);
    box(-.8,Y+.38,4.77,2.65,.76,1.0,M.blue,true,false,.06);box(-.8,Y+.83,4.75,2.7,.16,1.0,M.pink,false,false,.08);for(const x of [-1.6,0])box(x,Y+1.06,5.12,.65,.48,.18,M.lilac,false,false,.08);
    box(.4,Y+.95,-4.65,2.5,.14,1.0,M.honey,true);for(const x of [-.6,1.4])box(x,Y+.45,-4.65,.13,.9,.7,M.wood,true);box(.2,Y+1.07,-4.65,.8,.06,.5,M.paper);mug(1.1,Y+1.03,-4.65,glaze.blue);books(-.5,Y+1.03,-4.9,4);
    box(-2.1,Y+.3,.95,1.1,.60,.65,timber.lilac,true,false,.06);for(const x of [-2.45,-1.75])box(x,Y+.3,.595,.06,.6,.025,M.gold);box(-2.1,Y+.36,.59,.20,.12,.03,M.gold);
    // Loose cards, flowers, hanging letter bunting and book-shaped wall ornaments.
    for(const p of [[-5.3,0,4.9],[1.5,0,-4.9],[-5.2,Y,4.5],[2.3,Y,-4.9]])plant(...p);
    for(const y of [3.25,Y+2.75])for(let j=0;j<5;j++){const x=-4.2+j*1.25,yy=y-.22*Math.sin(j*Math.PI/4);profile([[-.32,0],[.32,0],[0,-.58]],.025,x,yy,4.7,[M.pink,cloth.blue,cloth.gold][j%3]);word('ABC'[j%3],x-.13,yy-.41,4.74,.34,M.paper,true);if(j)beam([x-1.25,y-.22*Math.sin((j-1)*Math.PI/4),4.7],[x,yy,4.7],.014,cloth.dark);}
    // A lived-in postcard gallery and trailing leaves break up the broad plaster panels.
    function postcard(x,y,z,a,colour) {
      localBox(x,z,0,y,0,1.15,1.25,.09,M.honey,a);
      localBox(x,z,0,y,-.055,.98,1.08,.035,M.paper,a);
      const p=at(x,z,0,-.09,a);beam([p[0],y-.34,p[1]],[p[0],y+.15,p[1]],.025,print.leaf);
      ball(p[0],y+.20,p[1],.17,colour,1,1,.30);
      for(const sign of [-1,1]){const q=at(x,z,sign*.15,-.09,a);ball(q[0],y-.12,q[1],.16,print.leaf,1,.42,.25);}
    }
    for(const y of [2.6,Y+2.0]){postcard(-4.6,y,5.25,0,print.pink);postcard(3.55,y,5.25,0,print.lilac);}
    postcard(-2.0,Y+2.0,-5.16,Math.PI,print.pink);postcard(3.6,Y+2.0,-5.16,Math.PI,print.lilac);
    for(const x of [-5.82,5.82])for(const y of [2.45,Y+2.45]){
      const a=x<0?-Math.PI/2:Math.PI/2;
      localBox(x,3.1,0,y,0,1.8,.10,.35,M.honey,a);
      for(let j=0;j<6;j++)localBox(x,3.1,-.65+j*.22,y+.25,-.02,.16,.43+(j%2)*.10,.25,[print.pink,print.blue,print.lilac][j%3],a);
    }
    for(const p of [[-2.75,Y+2.9,5.15],[1.2,Y+2.9,5.15],[-4.7,3.55,6.1]])for(let j=0;j<10;j++){
      const x=p[0]+.12*Math.sin(j),y=p[1]-j*.16;ball(x,y,p[2],.11,M.leaf,1,.55,.42);if(j%4===0)ball(x,y,p[2]-.05,.085,petal.pink);
    }
    mesh(new THREE.CylinderGeometry(1.42,1.42,.024,40),M.pink,-.8,Y+.018,3.15);
    mesh(new THREE.CylinderGeometry(1.22,1.22,.026,40),cloth.paper,-.8,Y+.02,3.15);
    // The right-rear exterior chimney continues through both floors above a small tea stove.
    box(5.55,5.45,-4.5,.65,10.9,.85,stone.cream,true);
    for(let j=0;j<12;j++)box(5.2,.5+j*.78,-4.5,.025,.025,.84,M.honey);
    box(5.28,.62,-4.45,.93,1.24,1.02,iron.rose,true,false,.06);box(4.80,.70,-4.45,.035,.55,.65,iron.dark);
    const fire=box(4.77,.70,-4.45,.025,.34,.42,glow);fire.userData.camThrough=true;
    // Round two: Lexi's illustrated storybook home. All additions sit outside the original aisles.
    function soft(x,y,z,r,m,sx=1,sy=1,sz=1) {const o=mesh(new THREE.SphereGeometry(r,6,4),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
    function flower(x,y,z,s=.12,m=petal.pink,centre=petal.gold) {for(let j=0;j<5;j++){const a=j*Math.PI*2/5;soft(x+Math.cos(a)*s*.7,y+Math.sin(a)*s*.7,z,s*.62,m,1,1,.4);}soft(x,y,z+.035,s*.37,centre,1,1,.5);}
    function vine(x,y,z,n=12,a=0) {for(let j=0;j<n;j++){const u=.12*Math.sin(j*1.6),yy=y-j*.14,p=at(x,z,u,-.04,a);if(j)beam([p[0],yy,p[1]],[x,y-(j-1)*.14,z],.013,M.leaf);const q=at(x,z,u+(j%2?.11:-.11),-.04,a);soft(q[0],yy,q[1],.12,M.leaf,1,.5,.45);if(j%5===0)flower(p[0],yy,p[1]-.04,.09,petal.rose);}}
    function bouquet(x,y,z,s=1) {soft(x,y+.18*s,z,.20*s,glaze.paper,.9,1.2,.9);mesh(new THREE.CylinderGeometry(.09*s,.13*s,.16*s,8),glaze.paper,x,y+.36*s,z);for(let j=0;j<5;j++){const a=j*2.4,xx=x+Math.sin(a)*.23*s,zz=z+Math.cos(a)*.18*s,yy=y+(.63+j%2*.13)*s;beam([x,y+.38*s,z],[xx,yy,zz],.012*s,M.leaf);soft(xx,yy-.14*s,zz,.11*s,M.leaf,1,.4,.7);flower(xx,yy,zz,.12*s,j%2?petal.pink:petal.lilac);}}
    function cushion(x,y,z,m,check=false) {box(x,y,z,.61,.51,.18,m,false,false,.09);soft(x,y,z-.11,.04,cloth.paper,1,1,.5);if(check){for(let j=-2;j<=2;j++){box(x+j*.10,y,z-.104,.038,.44,.009,cloth.paper);box(x,y+j*.09,z-.11,.54,.027,.009,cloth.paper);}}else flower(x,y,z-.13,.13,cloth.paper,cloth.gold);}
    function openBook(x,y,z,s=1) {for(const sign of [-1,1]){const o=box(x+sign*.20*s,y+.024,z,.40*s,.045,.52*s,M.paper);o.rotation.z=sign*.065;box(x+sign*.20*s,y-.012,z,.43*s,.025,.56*s,M.lilac);for(let j=0;j<4;j++)box(x+sign*.20*s,y+.052,z-.16*s+j*.09*s,.28*s,.007,.012,print.wood);}box(x,y+.06,z,.025,.008,.50*s,M.pink);}
    function stack(x,y,z,n=3) {for(let j=0;j<n;j++){box(x,y+j*.12+.05,z,.55,.10,.38,[cloth.blue,M.pink,M.lilac][j%3]);box(x,y+j*.12+.05,z-.198,.44,.05,.012,M.paper);}}
    function basket(x,y,z,s=.65) {mesh(new THREE.CylinderGeometry(s*.48,s*.37,s*.55,10),M.honey,x,y+s*.28,z,true);for(let j=0;j<4;j++){const o=mesh(new THREE.TorusGeometry(s*(.39+j*.023),.018,4,16),M.wood,x,y+s*(.10+j*.14),z);o.rotation.x=Math.PI/2;}const h=mesh(new THREE.TorusGeometry(s*.39,.025,4,16,Math.PI),M.wood,x,y+s*.53,z);h.rotation.z=0;}
    function rabbit(x,y,z,s=.45) {soft(x,y+s*.34,z,s*.32,cloth.paper,1,1.2,.8);soft(x,y+s*.71,z,s*.27,cloth.paper);for(const sign of [-1,1]){soft(x+sign*s*.13,y+s*1.04,z,s*.13,cloth.paper,.6,2,.6);soft(x+sign*s*.10,y+s*.75,z-.24*s,s*.025,cloth.dark);}soft(x,y+s*.66,z-.26*s,s*.045,M.rose);}
    function jar(x,y,z,m=glaze.blue) {mesh(new THREE.CylinderGeometry(.10,.12,.24,8),m,x,y+.12,z);mesh(new THREE.CylinderGeometry(.115,.115,.04,8),M.honey,x,y+.26,z);box(x,y+.13,z-.12,.13,.10,.015,M.paper);}
    function curtain(x,z,u,lo,h,w,a=0) {for(const sign of [-1,1]){for(let j=0;j<4;j++)localBox(x,z,u+sign*(w/2+.18)+j*.065,lo+h*.5,-.25,.095,h,.12,j%2?cloth.blue:cloth.paper,a);localBox(x,z,u+sign*(w/2+.25),lo+h*.38,-.34,.36,.075,.10,M.rose,a);}localBox(x,z,u,lo+h+.08,-.22,w+.9,.07,.08,M.honey,a);}
    // Inset wainscoting, shallow timber braces and picture rails never close a window opening.
    for(const fy of [0,Y]){
      for(const side of [-1,1]){const a=side*Math.PI/2;for(let u=-4.8;u<=4.8;u+=.75){localBox(side*5.81,0,u,fy+.68,-.025,.65,.52,.045,M.blue,a);localBox(side*5.81,0,u,fy+.68,-.06,.49,.36,.02,timber.cream,a);}localBox(side*5.81,0,0,fy+1,-.07,10.7,.06,.09,M.honey,a);for(const u of [-4.8,-2.5,2.5,4.8]){localBox(side*5.81,0,u,fy+2.05,-.04,.12,3.7,.13,M.wood,a);const p=at(side*5.81,0,u,-.06,a),q=at(side*5.81,0,u+(u<0?.65:-.65),-.06,a);beam([p[0],fy+3.0,p[1]],[q[0],fy+3.65,q[1]],.055,M.honey);}}
      for(const z of [-5.28,5.27])for(const x of [-5,-3.6,1.8,4.9]){if(z>0&&((x>-4.8&&x<.2)||(x>2&&x<4)))continue;box(x,fy+.70,z,.82,.54,.045,M.blue);box(x,fy+.70,z-.03,.65,.38,.025,timber.cream);}
    }
    for(const sign of [-1,1])for(let j=1;j<curve.length;j++){const a=curve[j-1],b=curve[j];for(let k=1;k<=3;k++){const t=k/4,z=sign*(a[0]+(b[0]-a[0])*t),y=a[1]+(b[1]-a[1])*t-.15;if(sign>0&&z>3){box(-4.48,y,z,2.9,.045,.065,M.honey);box(3.65,y,z,4.5,.045,.065,M.honey);}else box(0,y,z,11.7,.045,.065,M.honey);}}
    for(const x of [-4,-2,0,2,4])for(const sign of [-1,1])for(let j=1;j<curve.length;j++){const a=curve[j-1],b=curve[j];if(sign>0&&j>=4&&x>-2.9&&x<1.3)continue;beam([x,a[1]-.17,sign*a[0]],[x,b[1]-.17,sign*b[0]],.055,M.wood);}
    curtain(-2.3,7.40,0,1.15,2.3,2.62);curtain(-6,0,.4,1.05,2.45,2,-Math.PI/2);curtain(6,0,.4,1.05,2.45,2,Math.PI/2);curtain(0,-5.30,-.3,1,2.5,2.7,Math.PI);curtain(-.8,5.28,0,Y+.9,2.75,2.9);curtain(-6,0,0,Y+1,2.3,2.05,-Math.PI/2);
    // Floral bay seat: drawer fronts, piping, gingham and appliqued cushions.
    for(let j=0;j<3;j++){const x=-3.2+j*.9;box(x,.43,6.30,.80,.43,.07,M.honey);box(x,.43,6.25,.65,.30,.05,M.blue);soft(x,.45,6.20,.065,M.gold);box(x,.975,6.84,.83,.035,.85,M.rose,false,false,.01);cushion(x,1.24,7.07,j===1?cloth.blue:M.pink,j===1);}
    for(const x of [-3.8,-2.1]){const z=x===-3.8?2.4:.7;for(const sign of [-1,1]){const p=at(x,z,sign*.22,.37,x===-3.8?-Math.PI/2:0);soft(p[0],1.28,p[1],.13,M.rose,.7,2,.35);}for(const u of [-.22,0,.22])for(const v of [-.22,.0,.22]){const p=at(x,z,u,v,x===-3.8?-Math.PI/2:0);soft(p[0],.766,p[1],.023,cloth.paper,1,.3,1);}}
    for(let j=0;j<12;j++){const a=j*Math.PI/6;soft(-2.3+Math.sin(a)*1.97,.04,2.9+Math.cos(a)*1.97,.28,M.rose,1,.10,1);}for(let j=0;j<7;j++){const a=j*Math.PI*2/7;soft(-2.3+Math.sin(a)*.7,.044,2.9+Math.cos(a)*.7,.55,M.pink,1,.025,1);}
    box(-2.3,.839,2.6,.38,.018,1.30,M.pink);for(const z of [1.96,3.24])box(-2.3,.85,z,.39,.018,.06,cloth.paper);bouquet(-2.3,.86,2.45,.65);stack(-2.55,.85,2.93,2);
    soft(-1.9,.97,2.32,.14,glaze.paper,1,1,1);const spout=mesh(new THREE.ConeGeometry(.07,.27,8),glaze.paper,-1.73,1.01,2.32);spout.rotation.z=-.8;soft(-1.9,1.12,2.32,.09,glaze.blue,1,.4,1);
    for(const p of [[-2.5,.83,2.5],[-2,.83,2.6]])flower(p[0],p[1]+.10,p[2]-.1,.052,glaze.paper,glaze.gold);
    const plate=mesh(new THREE.CylinderGeometry(.20,.16,.035,12),glaze.blue,-2.68,.86,2.20);for(let j=0;j<3;j++)soft(-2.76+j*.085,.93,2.2,.07,j%2?glaze.gold:glaze.rose);
    // High shelf galleries add variety without spending floor area.
    for(const fy of [0,Y])for(const side of [-1,1]){const a=side*Math.PI/2;for(const z of [-3.2,3.2]){localBox(side*5.7,z,0,fy+2.15,-.1,1.85,.11,.42,M.honey,a);for(let j=0;j<5;j++)localBox(side*5.7,z,-.67+j*.18,fy+2.42,-.10,.14,.38+(j%3)*.10,.25,[print.pink,print.lilac,print.blue][j%3],a);const q=at(side*5.7,z,.58,-.16,a);jar(q[0],fy+2.21,q[1]);vine(side*5.6,fy+2.27,z+.7,7,a);}}
    for(const fy of [0,Y])for(const x of (fy===0?[-4.9,-.4]:[-4.9,2.7])){const yy=fy+(fy===0?2.4:1.9);box(x,yy+.025,-5.02,1.65,.10,.46,M.honey);stack(x,yy+.075,-5.02,2);jar(x+.5,yy+.075,-5.02,glaze.pink);rabbit(x-.5,yy+.075,-5.00,.36);}
    mesh(new THREE.CylinderGeometry(.19,.25,.08,12),M.gold,-4.35,2.58,-5.02);beam([-4.35,2.62,-5.02],[-4.35,2.86,-5.02],.045,M.gold);soft(-4.35,3.1,-5.02,.30,M.blue);for(let j=0;j<5;j++)soft(-4.35+Math.sin(j*2.2)*.22,3.1+Math.cos(j*2.2)*.19,-4.78,.10,M.gold,1,.6,.25);
    box(-5.64,Y+.31,-4.02,.50,.62,.58,M.wood,true);box(-5.64,Y+.65,-4.02,.55,.06,.63,M.honey);
    for(const p of [[-5.4,1.4,-1.9],[-.05,1.31,4.92],[-5.64,Y+.68,-4.02],[1.4,Y+1.04,-4.7]])bouquet(...p,.65);
    for(const p of [[-4.9,3.5,5.0],[-5.65,3.7,-3.8],[5.65,3.7,2.5],[-5.5,Y+3.3,3.6],[2.4,Y+3.3,5.15]]){plant(p[0],p[1]-.34,p[2],.70);for(const dx of [-.16,.16])beam([p[0]+dx,p[1],p[2]],[p[0],p[1]+.75,p[2]],.014,iron.dark);vine(...p,12);}
    for(const fy of [0,Y])for(const x of [-5.72,5.72])for(const z of [-4.6,4.4])vine(x,fy+3.65,z,15,x<0?-Math.PI/2:Math.PI/2);
    for(const p of [[-2.3,.76,7.18],[-5.72,.86,-.5],[5.72,.86,-.5],[-.8,Y+.78,5.1]]){box(p[0],p[1],p[2],.92,.22,.30,M.honey);for(let j=0;j<4;j++)bouquet(p[0]-.32+j*.21,p[1]+.11,p[2],.37);}
    // Actual pen-pal clutter, tag-covered cabinetry and the illustrated notice board.
    for(const p of [[-3.45,1.14,-3.8],[.2,Y+1.1,-4.65],[-2.3,.99,6.65]])openBook(...p,.70);
    for(const p of [[-2.27,1.1,-4],[1.2,Y+1.04,-4.7]]){mesh(new THREE.CylinderGeometry(.12,.10,.22,8),glaze.blue,p[0],p[1]+.11,p[2]);for(let j=0;j<4;j++)beam([p[0]+(j-1.5)*.04,p[1]+.10,p[2]],[p[0]+(j-1.5)*.06,p[1]+.48,p[2]-.04],.015,j%2?print.rose:M.gold);}
    for(const fy of [0,Y])for(let j=0;j<4;j++){const x=.85+j*.28;box(x,fy+1.34,4.88,.22,.02,.15,M.paper);beam([x-.1,fy+1.353,4.81],[x,fy+1.353,4.9],.006,print.rose);beam([x,fy+1.353,4.9],[x+.1,fy+1.353,4.81],.006,print.rose);}
    for(let j=0;j<5;j++){const x=.95+(j%2)*.65,y=2.15+Math.floor(j/2)*.4;soft(x,y+.12,-5.065,.035,j%2?print.blue:print.rose);flower(x,y-.02,-5.065,.095,j%2?print.pink:print.gold,print.gold);}
    for(const x of [.42,1.27]){box(x,.65,4.58,.69,.85,.04,M.honey);box(x,.65,4.55,.57,.70,.03,M.blue);soft(x,.7,4.51,.055,M.gold);}
    for(const p of [[-5.5,0,3.2],[1.7,0,-5.0],[-5.35,Y,3.8]]){basket(...p,.65);stack(p[0],p[1]+.40,p[2],2);}
    box(-4.25,Y+1.04,-4.98,2.12,1.22,.15,M.honey,true,false,.06);box(-4.25,Y+1.05,-4.88,1.83,.77,.06,cloth.blue,false,false,.08);
    for(const x of [-4.75,-3.78]){box(x,Y+1.02,-4.38,.80,.25,.58,cloth.paper,false,false,.09);box(x,Y+1.155,-4.37,.64,.02,.45,cloth.blue,false,false,.03);}
    box(-4.25,Y+1.02,-2.64,2.14,.16,.52,M.lilac,false,false,.04);for(let j=0;j<7;j++){box(-5.12+j*.29,Y+.97,-3.14,.018,.012,1.02,cloth.paper);box(-4.25,Y+.97,-3.67+j*.15,2.06,.012,.018,M.rose);}for(const x of [-4.9,-4.5,-4.1,-3.7])box(x,Y+1.115,-2.64,.06,.015,.5,cloth.paper);
    for(const p of [[-1.6,Y+1.10,5.10],[0,Y+1.10,5.10]])cushion(...p,cloth.blue,true);rabbit(-2.1,Y+.64,.95,.5);box(-2.1,Y+.4,.58,.34,.20,.012,M.paper);flower(-2.1,Y+.4,.56,.07,print.pink,print.gold);
    // Low textile islands visually fill the broad floor while preserving every reserved square.
    box(-2.8,.018,-1.45,3.4,.025,1.10,cloth.blue,false,false,.08);box(-2.8,.034,-1.45,3.17,.012,.88,cloth.paper,false,false,.06);
    box(-2.2,Y+.02,1.95,2.7,.026,1.3,M.lilac,false,false,.08);box(-2.2,Y+.037,1.95,2.47,.012,1.07,M.pink,false,false,.06);
    // Inspection one: finish the broad furniture faces and soften the two window seats.
    for(const p of [[-3.3,1.0,-3.9,2.65],[.4,Y+.95,-4.65,2.5]]){box(p[0],p[1]-.19,p[2]+.49,p[3]-.15,.27,.10,M.wood);for(const sign of [-1,1]){box(p[0]+sign*.64,p[1]-.19,p[2]+.55,.95,.20,.045,M.honey);soft(p[0]+sign*.64,p[1]-.19,p[2]+.59,.04,M.gold);}box(p[0],p[1]+.10,p[2],.34,.018,.93,cloth.blue);}
    for(const p of [[-2.3,0,6.85],[-.8,Y,4.77]]){for(const sign of [-1,1]){box(p[0]+sign*1.37,p[1]+.88,p[2],.16,.27,.97,M.honey);box(p[0]+sign*1.37,p[1]+1.03,p[2],.19,.10,.94,M.pink);}for(const dx of [-.84,0,.84]){box(p[0]+dx,p[1]+.42,p[2]-.54,.75,.48,.05,M.honey);box(p[0]+dx,p[1]+.42,p[2]-.58,.61,.34,.025,M.blue);soft(p[0]+dx,p[1]+.44,p[2]-.62,.045,M.gold);}}
    for(const yy of [.12,.23,.63]){const o=mesh(new THREE.TorusGeometry(yy<.3?.29:.20,.04,5,16),M.honey,-2.3,yy,2.6);o.rotation.x=Math.PI/2;}
    for(const fy of [0,Y])for(const x of [-4.95,1.95]){postcard(x,fy+2.6,-5.12,Math.PI,print.rose);vine(x+.48,fy+3.05,-5.08,8,Math.PI);}
    box(-.8,Y+.95,4.73,.68,.07,.74,M.lilac);for(let j=0;j<5;j++)box(-1.1+j*.15,Y+.99,4.73,.025,.01,.72,cloth.paper);
    box(2.85,.29,-5.0,.72,.58,.65,M.wood,true);for(const yy of [.10,.28,.46])box(2.85,yy,-4.66,.74,.12,.045,M.honey);for(const x of [2.58,3.12])box(x,.29,-4.63,.07,.58,.04,M.wood);stack(2.85,.59,-5.0,2);

    // Round three: small social scenes fill the floor, with the entrance, gifts and story spots reserved.
    function corner(name,x,y,z,a,fn) {const start=g.children.length;fn();const q=new THREE.Group();q.name=name;for(const o of g.children.slice(start)){g.remove(o);q.add(o);}q.position.set(x,y,z);q.rotation.y=a;g.add(q);return q;}
    function roundTable(w,d,h=.78) {box(0,h-.07,0,w,.14,d,M.honey,true,false,.09);for(const x of [-w*.36,w*.36])for(const z of [-d*.32,d*.32])box(x,(h-.14)/2,z,.13,h-.14,.13,M.wood,true,false,.035);}
    function bookCart(w=1.5,d=.64) {box(0,.43,0,w,.76,d,M.blue,true,false,.065);for(const yy of [.18,.58]){box(0,yy,-.335,w-.13,.09,.055,M.honey);books(-w*.40,yy+.06,-.02,Math.floor(w/.23));}box(0,.86,0,w+.08,.11,d+.08,M.honey,true,false,.04);for(const x of [-w*.36,w*.36])for(const z of [-.22,.22])soft(x,.08,z,.09,iron.dark);}
    function lounge(w=1.9) {box(0,.39,0,w,.66,.92,M.blue,true,false,.09);box(0,.76,0,w-.12,.18,.84,M.pink,false,false,.09);box(0,1.05,.35,w,.65,.20,M.honey,true,false,.07);for(const x of [-w/2+.12,w/2-.12])box(x,.86,0,.18,.34,.9,M.honey,true,false,.07);for(const x of [-.45,.45])cushion(x,1.05,.20,x<0?M.lilac:cloth.blue,true);}
    function footstool(x,z,m=M.lilac) {box(x,.24,z,.92,.48,.76,M.honey,true,false,.08);box(x,.52,z,.94,.15,.78,m,false,false,.08);}
    function leafyStand(x,z,s=1) {box(x,.29,z,.66,.58,.66,M.honey,true,false,.07);plant(x,.58,z,s);}
    corner('筆友共寫中島',.85,0,-2.9,0,()=>{roundTable(2.40,1.65,.86);box(0,.94,0,.44,.016,1.10,cloth.blue);openBook(-.65,.94,0,.9);stack(.63,.94,-.12,3);mug(1.10,.94,.15,glaze.pink);bouquet(.20,.94,-.24,.65);for(let j=0;j<3;j++)box(-.12+j*.25,.96,.24,.21,.025,.15,M.paper);basket(-1.2,0,-.25,.65);});
    corner('故事交換雙面書車',-.65,0,.12,0,()=>{bookCart(1.65);stack(-.42,.93,0,2);rabbit(.48,.93,0,.45);});
    corner('字卡共讀小沙發',-3.05,0,-.58,0,()=>{lounge(1.9);openBook(.25,.88,-.04,.6);basket(-1.03,0,.20,.65);});
    corner('凸窗故事野餐箱',-4.8,0,5.40,0,()=>{box(0,.35,0,.85,.70,1.15,M.blue,true,false,.07);box(0,.74,0,.88,.12,1.18,M.honey,true,false,.05);stack(0,.81,.15,3);bouquet(0,.81,-.33,.55);});
    corner('單字茶點推車',.75,0,-.02,0,()=>{bookCart(.88);mug(-.16,.93,0,glaze.blue);jar(.18,.93,0,glaze.pink);box(0,1.06,-.28,.40,.30,.04,M.paper);word('HI',-.12,1.00,-.25,.16,print.rose);});
    corner('朋友行李與花籃',-4.75,0,3.75,0,()=>{box(0,.32,0,.80,.64,.72,timber.lilac,true,false,.08);for(const x of [-.25,.25])box(x,.33,-.37,.045,.50,.025,M.gold);stack(0,.68,.05,2);bouquet(-.12,.94,0,.55);basket(.65,0,.05,.60);});
    corner('月窗共讀沙發島',-3.9,Y,2.08,0,()=>{lounge(2.65);footstool(.1,1.38);});
    corner('睡前花茶邊几',-5.05,Y,3.55,0,()=>{roundTable(.72,.78,.82);mug(-.16,.90,0,glaze.pink);bouquet(.17,.90,.04,.65);basket(.0,0,-.65,.70);});
    corner('筆友手帳窄工作桌',.65,Y,-1.70,0,()=>{roundTable(2.0,.50,.84);openBook(-.50,.91,0,.70);stack(.43,.91,0,3);jar(.98,.91,0,glaze.blue);});
    corner('故事劇場矮書牆',1.0,Y,1.62,0,()=>{bookCart(1.30,1.45);rabbit(-.55,.94,0,.52);bouquet(.55,.94,.02,.65);openBook(-.1,.94,0,.72);});
    corner('月亮故事行李',2.4,Y,4.92,0,()=>{box(0,.40,0,.90,.80,1.0,M.blue,true,false,.08);box(0,.85,0,.94,.10,1.04,M.honey);stack(0,.91,.14,3);bouquet(0,.91,-.25,.75);basket(-.6,0,.04,.65);});
    corner('床尾小花架',-2.85,Y,-3.80,0,()=>{leafyStand(0,0,.85);stack(0,.60,0,2);});
    for(const p of [[-1.7,0,-4.85],[2.5,0,-4.60],[-5.15,0,2.00],[-5.15,Y,.05],[2.45,Y,-5.0]])corner('高低花盆與澆水罐',...p,0,()=>{leafyStand(0,0,.95);jar(.36,0,.18,glaze.blue);basket(-.38,0,.18,.55);});


    corner('樓梯下故事道具收納島',4.70,0,-1.60,0,()=>{box(0,.50,0,1.95,1.0,2.15,M.blue,true,false,.09);box(0,1.05,0,2.0,.10,2.20,M.honey,true,false,.055);for(const x of [-.48,.48]){box(x,.52,1.10,.80,.72,.04,timber.cream);soft(x,.55,1.14,.055,M.gold);}stack(-.55,1.12,-.5,4);bouquet(.55,1.12,-.55,.8);rabbit(.55,1.12,.55,.6);openBook(-.45,1.12,.50,.85);});
    corner('茶敘花瓣小沙發',-1.05,0,1.64,-Math.PI/2,()=>{lounge(1.25);rabbit(.3,.86,.03,.5);});
    corner('旅行故事分冊箱',-2.2,Y,0,0,()=>{box(0,.37,0,1.50,.74,.82,M.blue,true,false,.08);box(0,.79,0,1.56,.10,.88,M.honey);stack(-.45,.85,0,3);rabbit(.46,.85,0,.5);});
    corner('圓窗花茶書櫃',1.30,Y,3.45,Math.PI/2,()=>{bookCart(1.95);bouquet(-.65,.94,0,.7);mug(.65,.94,0,glaze.pink);});
    corner('閣樓共讀腳凳',-2.45,Y,3.65,0,()=>{footstool(0,0,cloth.blue);stack(0,.61,0,3);basket(-.67,0,0,.65);});


    corner('花茶書籤展示柱',4.65,0,.10,0,()=>{box(0,.43,0,.60,.86,1.14,M.blue,true,false,.065);box(0,.91,0,.64,.10,1.18,M.honey);stack(0,.97,-.26,3);bouquet(0,.97,.25,.7);});
    corner('朋友留言花盆',1.28,0,.30,0,()=>{leafyStand(0,0,.88);jar(.30,0,.1,glaze.pink);});
    corner('圍坐讀故事軟墊',-.04,Y,.25,0,()=>{box(0,.18,0,1.60,.36,1.20,cloth.blue,false,false,.10);box(0,.385,0,1.48,.07,1.08,M.pink,false,false,.08);flower(0,.44,-.1,.16,cloth.paper,cloth.gold);});


    corner('門邊待寄信件小箱',2.15,0,3.10,0,()=>{box(0,.18,0,.48,.36,.55,M.honey,false,false,.06);box(0,.38,0,.50,.055,.57,M.blue,false,false,.035);for(let j=0;j<3;j++)box(0,.415+j*.006,-.10+j*.11,.31,.008,.19,M.paper);});
    corner('凸窗圍讀花瓣墊',-3.05,0,4.10,0,()=>{box(0,.17,0,.82,.34,.78,M.rose,false,false,.10);box(0,.365,0,.75,.05,.71,M.pink,false,false,.07);flower(0,.41,0,.12,cloth.paper,cloth.gold);});


    corner('床側睡前書凳',-2.70,Y,-2.90,0,()=>{box(0,.16,0,.72,.32,.68,M.honey,false,false,.07);box(0,.35,0,.75,.07,.71,cloth.blue,false,false,.06);box(0,.406,0,.49,.035,.36,M.pink);box(0,.429,0,.40,.009,.30,M.paper);});

    // 書頁罩藏住亮芯，桌面用細臂燈補光。
    const lightCream=kit.shade('#f3e4d3'),lightBlue=kit.mat('#7fa5ba',{roughness:.82},'wood'),lightBrass=kit.mat('#b88c4c',{metalness:.72,roughness:.42},'metal'),lightDiff=kit.lamp('#f5c98d');
    function bookLamp(x,y,z,top){
      box(x,y+.19,z,.70,.05,.40,lightCream,false,false,.015);
      for(const u of [-.33,.33])box(x+u,y+.09,z,.04,.18,.40,lightBlue);
      for(const d of [-.18,.18]){box(x,y+.09,z+d,.62,.18,.04,lightCream);for(let j=0;j<10;j++)box(x-.28+j*.062,y+.10,z+d,.016,.18+Math.abs(j-4.5)*.006,.055,lightCream);}
      box(x,y+.03,z,.16,.018,.14,lightDiff);beam([x,y+.215,z],[x,top,z],.012,lightBrass);
      box(x,top+.025,z,.16,.05,.16,lightBlue,false,false,.015);
    }
    function tableLamp(x,y,z){
      mesh(new THREE.CylinderGeometry(.12,.16,.045,12),lightBrass,x,y-.44,z);beam([x,y-.415,z],[x,y-.06,z],.022,lightBrass);
      box(x,y+.11,z,.36,.045,.30,lightBlue,false,false,.015);
      for(const d of [-.14,.14])box(x,y+.045,z+d,.36,.13,.02,lightCream);
      for(const u of [-.17,.17])box(x+u,y+.045,z,.02,.13,.26,lightCream);
      box(x,y+.03,z,.16,.012,.14,lightDiff);
    }
    bookLamp(0,3.08,-2.5,4.075);bookLamp(-3.1,7.30,2.1,10.30);
    tableLamp(.35,1.7525,4.94);tableLamp(-.65,5.8825,-4.58);
    function writingLamp(){
      mesh(new THREE.CylinderGeometry(.11,.13,.035,12),lightBrass,-4.42,1.0925,-4.15);
      beam([-4.42,1.11,-4.15],[-4.42,1.86,-4.15],.018,lightBrass);beam([-4.42,1.86,-4.15],[-3.82,1.89,-3.90],.018,lightBrass);
      box(-3.82,1.90,-3.90,.86,.06,.18,lightBlue,false,false,.012);for(const d of [-.08,.08])box(-3.82,1.86,-3.90+d,.86,.06,.02,lightBrass);
    }
    writingLamp();

    // Ground spawn is 1.4 m from the exit centre; gifts have their own reserved floor squares.
    Object.assign(g.userData,{
      // 黑板是焦點，短頂槽與層板補光，座床底留低位導引。
      glow:[
        {kind:'under',a:[-4.22,1.85,-3.9],b:[-3.42,1.85,-3.9]},
        {kind:'cove',a:[-5.88,3.65,2.8],b:[-5.88,3.65,4.1],n:[1,0],c:'#f3e4d3'},
        {kind:'under',a:[-5.43,2.095,-3.9],b:[-5.43,2.095,-2.4]},
        {kind:'spot',p:[-3.3,3.88,-3.6],t:[-3.3,2.65,-5.075],r:.8},
        {kind:'kick',a:[-3.5,.1,6.45],b:[-1.1,.1,6.45],n:[0,-1]},
        {kind:'cove',a:[-4.1,7.5,-5.37],b:[-2.9,7.5,-5.37],n:[0,1],c:'#f3e4d3'},
        {kind:'kick',a:[-5.2,4.5,-2.38],b:[-3.3,4.5,-2.38],n:[0,1]}
      ],
      spawn:[3,0,3.55,Math.PI],exit:[3,5.02,.62],host:[.65,0,1.8,-.8],
      gifts:[[1.2,0,-1.0,0],[-4.5,0,.65,Math.PI/2],[1.6,Y,.2,0],[-.2,Y,-.9,0]],
      lights:[[0,3.08,-2.5,'#ffe0b0',1.1,.5],[-3.1,7.3,2.1,'#ffe0b0',1.1,.5],[.35,1.7525,4.94,'#ffe0b0',.55,.32],[-.65,5.8825,-4.58,'#ffe0b0',.6,.32]],sun:[-.3,.9,1],
      spots:[
        {x:-2.3,y:0,z:5.25,r:1.2,kind:'look',label:'窗邊故事',name:'三面凸窗閱讀角',lines:['坐這裡嘛，雲也會來旁聽故事。','這杯貼了單字，喝茶也能交朋友！','故事讀到一半，書籤就替我守住冒險。'],alone:['粉色坐墊還留著一本翻開的故事書。','三面窗把海風與光一起收進閱讀角。']},
        {x:-3.3,y:0,z:-2.4,r:1.15,kind:'study',label:'今日單字',name:'日常單字故事桌',lines:['挑一個單字，我們把它寫進故事吧！','先猜上下文，答案常藏在前後句。','我把容易忘的字，貼在最愛的杯子上。','念錯也沒關係，開口就是新的第一頁。'],alone:['桌上的單字卡連成一段小小的故事。','馬克杯、書籤和筆筒都有字母標籤。']},
        {x:.85,y:0,z:3.55,r:1.05,kind:'look',label:'拆小信箱',name:'字母朋友信箱牆',lines:['每格信箱都住著一位等回信的朋友。','我會把新學的問候，偷偷寫進下一封。','收到明信片的那天，連雨聲都像掌聲。'],alone:['三只粉藍金色信箱依字母排在門旁。','未寄出的信封上畫著一張大笑臉。']},
        {x:-.8,y:Y,z:3.25,r:1.2,kind:'look',label:'圓窗讀夢',name:'大圓老虎窗沙發',lines:['這扇圓窗，是我故事裡的月亮！','晚上在這裡念一句，明天就多一點勇氣。','窗框像句點，可是冒險還沒有結束喔。'],alone:['圓窗旁的故事書停在有月亮的那頁。','天藍百葉與蜂蜜木框映著柔和的天色。']},
        {x:-4.25,y:Y,z:-1.25,r:1.1,kind:'look',label:'晚安書籤',name:'兔耳床與旅行箱',lines:['睡前只讀一頁，是我最常破的約定。','兔耳床頭幫我聽著夢裡的新單字。','旅行箱還空著，我想裝滿朋友的故事。'],alone:['兔耳床頭靠著藍色枕頭與粉色小被。','旅行箱的扣環旁，夾著一張花朵書籤。']},
        {x:.4,y:Y,z:-3.0,r:1.1,kind:'look',label:'寫封回信',name:'後圓窗筆友桌',lines:['前面的窗讀故事，後面的窗寫回信。','字不必漂亮，願意分享就很動人。','今天的海是什麼顏色？幫我寫一句嘛。'],alone:['小圓窗下，幾張明信片壓在杯子旁。','信紙留了一半，像在等下一位朋友。']}
      ]
    });
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);

