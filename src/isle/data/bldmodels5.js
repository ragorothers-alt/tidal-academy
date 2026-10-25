/* 潮汐小島 · 程式化住宅（img2threejs 參考重建）：cottage_a、cottage_b、cottage_c、player_home。正面 +Z；僅屋頂主色依 kit.roof 換色。 */

/* 潮汐小島 · 程式化模型（img2threejs 重建）：象牙木架山牆小屋 cottage_a。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['cottage_a'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'ivory-timber-cottage-a';
    const batches = new Map();
    const M = {
      plaster: kit.mat('#f1e7d4', { roughness: .91 }, 'stone'),
      stone: kit.mat('#e5d9c2', { roughness: .91 }, 'stone'),
      stoneShade: kit.mat('#d3c5ab', { roughness: .94 }, 'stone'),
      mortar: kit.mat('#b6a78e', { roughness: .98 }, 'stone'),
      oak: kit.mat('#855b3c', { roughness: .83 }, 'wall'),
      oakLight: kit.mat('#ac7a4d', { roughness: .78 }, 'wall'),
      oakDark: kit.mat('#5b402e', { roughness: .9 }, 'wall'),
      roof: kit.mat(kit.roof || '#4f6fb8', { roughness: .73 }, 'roof'),
      gold: kit.mat('#d8b15b', { roughness: .4, metalness: .68 }),
      leaf: kit.mat('#66814c', { roughness: .94 }),
      leafLight: kit.mat('#859554', { roughness: .94 }),
      pink: kit.mat('#d98790', { roughness: .82 }),
      cream: kit.mat('#f5e6ba', { roughness: .87 }),
      pollen: kit.mat('#d2a548', { roughness: .72 }),
      glass: kit.win()
    };
    function add(geo, mat, part) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const n = geo.toNonIndexed(); geo.dispose(); geo = n; }
      const key = part + '|' + mat.uuid;
      if (!batches.has(key)) batches.set(key, { mat, part, geos: [] });
      batches.get(key).geos.push(geo);
    }
    function place(geo, mat, part, x, y, z, rx = 0, ry = 0, rz = 0) {
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
      add(geo, mat, part);
    }
    function box(x,y,z,w,h,d,m,p='timber-frame',rx=0,ry=0,rz=0) { place(new THREE.BoxGeometry(w,h,d),m,p,x,y,z,rx,ry,rz); }
    function roundBox(x,y,z,w,h,d,m,p='masonry-joints',r=.012,ry=0) {
      if (p==='foundation'||(p==='chimney'&&h<.205)) { box(x,y,z,w,h,d,m,p,0,ry);return; }
      r=Math.min(r,w*.2,h*.2,d*.2);
      const s=new THREE.Shape(); s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
      place(new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:1,steps:1,curveSegments:2}),m,p,x,y,z-d/2+r,0,ry);
    }
    function profile(points,depth,x,y,z,m,p,ry=0,bevel=0) {
      const s=new THREE.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();
      place(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:12}),m,p,x,y,z,0,ry);
    }
    function beam(a,b,r,m,p='timber-frame',radial=6,r2=r) {const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),geo=new THREE.CylinderGeometry(r2,r,d.length(),radial,1);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(geo,m,p);}
    function tube(pts,r,m,p='brass-details',segments=24) {add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(a=>new THREE.Vector3(...a))),segments,r,5,false),m,p);}
    function ball(x,y,z,r,m,p='flowerboxes',sx=1,sy=1,sz=1) {const geo=new THREE.SphereGeometry(r,5,3);geo.scale(sx,sy,sz);geo.translate(x,y,z);add(geo,m,p);}
    function quad(a,b,c,d,m,p='slate-courses',th=.038) {
      // Eight vertices and six faces give the slate a readable thickness at its lower edge.
      if ((c[2]-a[2])*(b[0]-a[0])-(c[0]-a[0])*(b[2]-a[2])<0) { const q=b;b=d;d=q; }
      const pts=[a,b,c,d,...[a,b,c,d].map(v=>[v[0],v[1]-th,v[2]])],v=[];
      for(const tri of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])for(const i of tri)v.push(...pts[i]);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();add(geo,m,p);
    }
    function archPts(w,h,n=16) {const r=w/2,cy=h-r,out=[[-r,0],[r,0],[r,cy]];for(let i=1;i<=n;i++){const a=i*Math.PI/n;out.push([r*Math.cos(a),cy+r*Math.sin(a)]);}return out;}
    function arch(x,y,z,w,h,dep,m,p,ry=0) {profile(archPts(w,h),dep,x,y,z,m,p,ry,.006);}
    function archBand(x,y,z,w,h,t,dep,m,p,ry=0) {
      const out=archPts(w,h),inside=archPts(w-2*t,h-2*t).map(v=>new THREE.Vector2(v[0],v[1]+t));
      const s=new THREE.Shape(out.map(v=>new THREE.Vector2(...v)));s.holes.push(new THREE.Path(inside.reverse()));
      place(new THREE.ExtrudeGeometry(s,{depth:dep,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,steps:1,curveSegments:10}),m,p,x,y,z,0,ry);
    }
    function world(x,y,z,u,v,off,ry=0) {return [x+u*Math.cos(ry)+off*Math.sin(ry),y+v,z-u*Math.sin(ry)+off*Math.cos(ry)];}
    function localBox(x,y,z,u,v,off,w,h,d,m,p,ry) {const a=world(x,y,z,u,v,off,ry);box(...a,w,h,d,m,p,0,ry);}
    function finial(x,y,z,s=1) {
      place(new THREE.CylinderGeometry(.066*s,.084*s,.065*s,8),M.gold,'brass-details',x,y+.032*s,z);
      place(new THREE.CylinderGeometry(.049*s,.055*s,.17*s,4),M.gold,'brass-details',x,y+.12*s,z,0,Math.PI/4);
      place(new THREE.ConeGeometry(.09*s,.13*s,4),M.gold,'brass-details',x,y+.27*s,z,0,Math.PI/4);
    }
    // Broad, shallow ashlar plinth. Mortar is recessed behind the dressed blocks.
    box(0,.19,0,3.40,.38,2.98,M.mortar,'foundation');
    box(0,1.405,0,3.20,2.11,2.80,M.plaster,'wall-body');
    for(let row=0;row<2;row++) {
      for(let j=0;j<9;j++) {const x=-1.51+j*.378;for(const z of [-1.515,1.515])roundBox(x,.10+row*.19,z,.366,.183,.075,(j+row)%3?M.stone:M.stoneShade,'foundation',.012);}
      for(let j=0;j<8;j++) {const z=-1.31+j*.375;for(const x of [-1.70,1.70])roundBox(x,.10+row*.19,z,.075,.183,.363,(j+row)%4?M.stone:M.stoneShade,'foundation',.012);}
    }
    // Four oak corner posts, masonry footings, and continuous head and mid rails.
    for(const x of [-1.52,1.52])for(const z of [-1.33,1.33]) {
      roundBox(x,1.43,z,.19,2.09,.19,M.oak,'timber-frame',.013);
      roundBox(x,.49,z,.33,.25,.33,M.stone,'masonry-joints',.018);
      roundBox(x,.30,z,.40,.19,.40,M.stoneShade,'masonry-joints',.018);
    }
    for(const z of [-1.43,1.43])for(const y of [.44,1.46,2.40])box(0,y,z,3.25,y===1.46?.10:.16,.12,M.oak,'timber-frame');
    for(const x of [-1.62,1.62])for(const y of [.44,1.46,2.40])box(x,y,0,.12,y===1.46?.1:.16,2.88,M.oak,'timber-frame');
    // Crosswise main roof, solid side gables and hand-laid slate courses.
    const roofY=t=>3.77-1.35*t+.045*Math.pow(t,7),roofZ=1.73,roofX=1.88;
    for(const side of [-1,1]) {
      profile([[-1.40,0],[1.40,0],[0,1.35]],.065,side*1.60,2.40,0,M.plaster,'main-roof',Math.PI/2);
      beam([side*1.65,2.43,-1.39],[side*1.65,3.74,0],.055,M.oak);
      beam([side*1.65,3.74,0],[side*1.65,2.43,1.39],.055,M.oak);
      box(side*1.65,3.02,0,.11,1.25,.11,M.oak,'timber-frame');
      quad([-roofX,roofY(0),0],[roofX,roofY(0),0],[roofX,roofY(1),side*roofZ],[-roofX,roofY(1),side*roofZ],M.roof,'main-roof',.085);
      for(let row=0;row<7;row++) {
        const t0=row/7,t1=Math.min(1,(row+1.11)/7),start=-roofX-(row%2)*.148;
        for(let j=0;j<14;j++) {
          const x0=Math.max(-roofX,start+j*.296),x1=Math.min(roofX,start+(j+1)*.296-.009);if(x1<=x0)continue;
          const up=.026+(7-row)*.003;
          quad([x0,roofY(t0)+up,side*roofZ*t0],[x1,roofY(t0)+up,side*roofZ*t0],[x1,roofY(t1)+up,side*roofZ*t1],[x0,roofY(t1)+up,side*roofZ*t1],M.roof,'slate-courses');
        }
      }
      box(0,2.40,side*1.71,3.80,.16,.14,M.oak,'timber-frame');
      box(0,2.48,side*1.77,3.81,.033,.034,M.gold,'brass-details');
      for(const x of [-1.88,1.88]) {
        tube([[x,2.46,side*1.73],[x,2.74,side*1.35],[x,3.30,side*.63],[x,3.81,0]],.054,M.oak,'timber-frame',18);
        tube([[x,2.50,side*1.75],[x,2.78,side*1.35],[x,3.34,side*.63],[x,3.85,0]],.022,M.gold,'brass-details',18);
      }
    }
    beam([-1.89,3.83,0],[1.89,3.83,0],.052,M.gold,'brass-details',8);
    for(const x of [-1.78,1.78])finial(x,3.85,0,.75);
    // Projecting right entrance gable: its roof overlaps the main slope, never a flat decal.
    const cx=.70,cw=.94,gy=t=>3.79-1.33*t+.045*Math.pow(t,6);
    profile([[-.82,0],[.82,0],[0,1.23]],.24,cx,2.44,1.35,M.plaster,'entrance-gable');
    for(const side of [-1,1]) {
      quad([cx,gy(0),.02],[cx+side*cw,gy(1),.02],[cx+side*cw,gy(1),1.78],[cx,gy(0),1.78],M.roof,'entrance-gable',.075);
      for(let row=0;row<6;row++)for(let j=0;j<7;j++) {
        const t0=row/6,t1=Math.min(1,(row+1.12)/6),z0=.02+j*.252,z1=Math.min(1.78,z0+.243),up=.03+(6-row)*.003;
        quad([cx+side*cw*t0,gy(t0)+up,z0],[cx+side*cw*t1,gy(t1)+up,z0],[cx+side*cw*t1,gy(t1)+up,z1],[cx+side*cw*t0,gy(t0)+up,z1],M.roof,'slate-courses');
      }
      tube([[cx+side*.98,2.47,1.755],[cx+side*.75,2.75,1.755],[cx+side*.36,3.29,1.755],[cx,3.84,1.755]],.085,M.oak,'timber-frame',20);
      tube([[cx+side*.98,2.51,1.81],[cx+side*.75,2.79,1.81],[cx+side*.36,3.33,1.81],[cx,3.88,1.81]],.024,M.gold,'brass-details',20);
    }
    beam([cx,3.85,.04],[cx,3.85,1.80],.05,M.gold,'brass-details',8);
    box(cx,3.02,1.62,.15,1.13,.13,M.oak,'timber-frame');
    box(cx,2.48,1.62,1.70,.15,.13,M.oak,'timber-frame');
    for(const side of [-1,1])beam([cx,3.22,1.64],[cx+side*.58,2.53,1.64],.035,M.oakLight);
    roundBox(cx,3.55,1.68,.24,.30,.19,M.oak,'timber-frame',.018);finial(cx,3.87,1.75,.84);
    // True roof dormer: opaque cheek walls, gable volume and a pitched cap above the front roof.
    const dx=-.96;
    box(dx,3.03,.95,.70,.69,.70,M.plaster,'dormer');
    profile([[-.35,0],[.35,0],[0,.46]],.66,dx,3.23,.60,M.plaster,'dormer');
    for(const side of [-1,1]) {
      quad([dx,3.72,.56],[dx+side*.49,3.22,.56],[dx+side*.49,3.22,1.34],[dx,3.72,1.34],M.roof,'dormer-roof',.055);
      for(let row=0;row<3;row++)for(let j=0;j<4;j++){const t0=row/3,t1=Math.min(1,(row+1.1)/3),z=.56+j*.195;quad([dx+side*.49*t0,3.75-.5*t0,z],[dx+side*.49*t1,3.75-.5*t1,z],[dx+side*.49*t1,3.75-.5*t1,z+.187],[dx+side*.49*t0,3.75-.5*t0,z+.187],M.roof,'slate-courses',.028);}
      beam([dx,3.74,1.36],[dx+side*.50,3.22,1.36],.062,M.oak,'timber-frame');
      beam([dx,3.78,1.40],[dx+side*.50,3.26,1.40],.019,M.gold,'brass-details');
      box(dx+side*.315,2.99,1.30,.075,.62,.09,M.oak,'timber-frame');
    }
    beam([dx,3.75,.58],[dx,3.75,1.37],.027,M.gold,'brass-details');finial(dx,3.75,1.34,.6);
    // Glazed openings all share the game window material, including the lantern core.
    function windowArch(x,y,z,w,h,ry=0,dormer=false,part='front-window') {
      const p=dormer?'dormer':part;
      arch(x,y,z,w+.12,h+.1,.035,M.oakDark,p,ry);
      const A=world(x,y,z,0,.045,.048,ry);arch(...A,w-.075,h-.07,.025,M.glass,p,ry);
      const B=world(x,y,z,0,-.015,.063,ry);archBand(...B,w+.24,h+.20,.105,.07,M.stone,p,ry);
      const C=world(x,y,z,0,.025,.103,ry);archBand(...C,w+.025,h+.015,.045,.035,M.oak,p,ry);
      const top=h-w/2;
      for(const u of [-w*.24,0,w*.24]) {const vh=top+Math.sqrt(Math.max(0,(w*.43)**2-u*u));const a=world(x,y,z,u,.09,.16,ry),b=world(x,y,z,u,Math.min(h-.06,vh),.16,ry);beam(a,b,u===0?.019:.013,M.oak,'window-mullions',5);}
      for(const v of [h*.36,h*.65])localBox(x,y,z,0,v,.161,w-.08,.033,.033,M.oak,'window-mullions',ry);
      if(!dormer) {
        const outer=(w+.23)/2,cy=h-w/2+.005;
        for(let i=0;i<=8;i++){const a=i*Math.PI/8,pt=world(x,y,z,Math.cos(a)*outer,cy+Math.sin(a)*outer,.112,ry);box(...pt,.105,.065,.079,i%3?M.stone:M.stoneShade,'masonry-joints',0,ry,a-Math.PI/2);}
      }
    }
    windowArch(-.87,.79,1.424,.94,1.26);
    windowArch(1.613,.91,.03,.71,1.09,Math.PI/2,false,'right-window');
    windowArch(-1.613,.97,-.20,.65,1.03,-Math.PI/2);
    windowArch(-.30,.98,-1.424,.69,1.00,Math.PI);
    windowArch(dx,2.76,1.286,.36,.59,0,true);
    // Deep oak arched entrance with small glazed fanlight, plank field, ring pull and voussoirs.
    const doorX=.70,doorY=.39,doorZ=1.46;
    arch(doorX,doorY,doorZ,.84,1.75,.08,M.oakDark,'door');
    arch(doorX,doorY+.028,doorZ+.088,.72,1.66,.035,M.oak,'door');
    archBand(doorX-.001,doorY-.015,doorZ+.06,1.14,1.98,.155,.13,M.stone,'door');
    archBand(doorX,doorY+.025,doorZ+.14,.78,1.72,.044,.035,M.oakLight,'door');
    for(let i=0;i<5;i++)box(doorX-.284+i*.142,doorY+.50,doorZ+.15,.133,.90,.025,i%2?M.oakLight:M.oak,'door');
    arch(doorX,doorY+.89,doorZ+.151,.48,.64,.015,M.glass,'door');
    archBand(doorX,doorY+.87,doorZ+.174,.55,.70,.041,.022,M.oakLight,'door');
    box(doorX,doorY+1.18,doorZ+.207,.027,.52,.027,M.oak,'window-mullions');
    box(doorX,doorY+1.16,doorZ+.209,.48,.028,.025,M.oak,'window-mullions');
    for(const y of [.53,.95])box(doorX,doorY+y,doorZ+.19,.66,.055,.03,M.oakDark,'door');
    for(const y of [.40,.80])box(doorX-.22,doorY+y,doorZ+.22,.15,.027,.026,M.gold,'brass-details');
    for(let i=0;i<9;i++){const a=i*Math.PI/8;box(doorX+Math.cos(a)*.51,doorY+1.43+Math.sin(a)*.51,doorZ+.22,.12,.075,.035,i%3?M.stone:M.stoneShade,'masonry-joints',0,0,a-Math.PI/2);}
    for(const side of [-1,1])for(let row=0;row<5;row++)roundBox(doorX+side*.50,.53+row*.26,doorZ+.13,.17,.248,.17,row%3?M.stone:M.stoneShade,'masonry-joints',.008);
    place(new THREE.TorusGeometry(.067,.014,5,14),M.gold,'brass-details',doorX+.12,1.02,doorZ+.239);
    ball(doorX+.12,1.098,doorZ+.234,.029,M.gold,'brass-details',1,1,.5);
    // Entrance staircase rests on ground and ends at z=2.29.
    for(let i=0;i<2;i++){const h=.18*(i+1),z=2.025-i*.335;roundBox(doorX,h/2+.014,z,1.20,h-.028,.53,M.stone,'entrance-stairs',.014);box(doorX,h+.009,z,1.22,.025,.54,M.stoneShade,'entrance-stairs');}
    // Paired corbels carry the eave weight; their square ends gain restrained brass corner caps.
    for(const x of [-1.53,-.24,1.55])for(const z of [-1.34,1.34]) {
      box(x,2.27,z,.18,.29,.18,M.oak,'timber-frame');
      beam([x,2.10,z],[x,2.34,z+(z>0?.28:-.28)],.065,M.oak,'timber-frame',6);
    }
    for(const x of [-1.79,1.79])for(const z of [-1.70,1.70]){box(x,2.42,z,.15,.16,.15,M.gold,'brass-details');ball(x,2.43,z+(z>0?.083:-.083),.025,M.gold,'brass-details',1,1,.45);}
    // Flower boxes stay inside the eave footprint on the side and use broad, sparse blossoms.
    function planter(x,y,z,w,ry=0,small=false) {
      const p='flowerboxes',depth=small?.21:.28;
      localBox(x,y,z,0,0,0,w,.20,depth,M.oakDark,p,ry);
      for(const v of [-.055,.055])localBox(x,y,z,0,v,depth*.49,w+.035,.075,.04,M.oakLight,p,ry);
      localBox(x,y,z,0,.115,0,w+.08,.045,depth+.055,M.oak,p,ry);
      for(const side of [-1,1]){
        localBox(x,y,z,side*(w/2-.04),0,depth*.58,.085,.235,.045,M.oak,p,ry);
        for(const v of [-.065,.065]){const a=world(x,y,z,side*(w/2-.04),v,depth*.69,ry);ball(...a,.022,M.gold,'brass-details',1,1,.6);}
        const a=world(x,y,z,side*w*.34,-.13,-.04,ry),b=world(x,y,z,side*w*.34,-.24,-.12,ry);beam(a,b,.035,M.oak,p);
      }
      const n=small?5:8;
      for(let i=0;i<n;i++) {
        const u=-w*.41+i*w*.82/(n-1),v=.20+Math.sin(i*2.1)*.045,off=.025+Math.cos(i*1.7)*.05;
        const a=world(x,y,z,u,.11,off,ry),b=world(x,y,z,u+.02,v+.045,off,ry);beam(a,b,.01,M.leaf,p,4);
        for(const side of [-1,1]){const leaf=world(x,y,z,u+side*.05,v-.02,off+side*.04,ry);ball(...leaf,small?.065:.085,i%2?M.leaf:M.leafLight,p,1.1,.55,.63);}
        const bloom=world(x,y,z,u+.01,v+.07,off+.045,ry),r=small?.031:.041;
        for(let k=0;k<5;k++){const ang=k*Math.PI*2/5;ball(bloom[0]+Math.cos(ang)*r*.85,bloom[1]+Math.sin(ang)*r*.85,bloom[2],r,i%3?M.cream:M.pink,p,1,.9,.55);}
        ball(bloom[0],bloom[1],bloom[2]+r*.4,r*.48,M.pollen,p,1,1,.55);
      }
    }
    planter(-.87,.72,1.62,1.10);
    planter(1.68,.84,.03,.83,Math.PI/2);
    planter(dx,2.70,1.36,.57,0,true);
    // Chimney uses readable ashlar courses and a real dark flue opening beneath a brass lip.
    box(1.20,3.57,-.65,.43,1.38,.44,M.mortar,'chimney');
    for(let row=0;row<6;row++) {
      for(let side=0;side<2;side++) {
        const off=side?.113:-.113;
        roundBox(1.20+off,2.98+row*.205,-.418,.216,.197,.042,(row+side)%3?M.stone:M.stoneShade,'chimney',.007);
        roundBox(1.432,2.98+row*.205,-.65+off,.042,.197,.216,(row+side)%3?M.stone:M.stoneShade,'chimney',.007);
      }
    }
    roundBox(1.20,4.18,-.65,.60,.17,.60,M.stone,'chimney',.015);
    box(1.20,4.285,-.65,.30,.06,.30,M.oakDark,'chimney');
    for(const x of [1.055,1.345])box(x,4.35,-.65,.055,.13,.35,M.gold,'chimney');
    for(const z of [-.795,-.505])box(1.20,4.35,z,.25,.13,.055,M.gold,'chimney');
    // Single wall lantern, connected to the entrance post by a curling bronze bracket.
    const lx=1.31,ly=1.62,lz=1.72;
    box(lx,ly+.23,1.58,.09,.24,.07,M.gold,'lantern');
    tube([[lx,ly+.28,1.60],[lx-.08,ly+.43,1.68],[lx-.09,ly+.46,1.83],[lx+.015,ly+.40,lz],[lx+.015,ly+.32,lz]],.019,M.gold,'lantern',15);
    beam([lx+.015,ly+.32,lz],[lx+.015,ly+.23,lz],.015,M.gold,'lantern');
    box(lx,ly,lz,.155,.27,.155,M.glass,'lantern');
    for(const xx of [-1,1])for(const zz of [-1,1])beam([lx+xx*.105,ly-.17,lz+zz*.105],[lx+xx*.085,ly+.16,lz+zz*.085],.014,M.gold,'lantern',5);
    place(new THREE.ConeGeometry(.18,.14,4),M.gold,'lantern',lx,ly+.23,lz,0,Math.PI/4);
    box(lx,ly-.18,lz,.24,.045,.24,M.gold,'lantern');ball(lx,ly-.235,lz,.033,M.gold,'lantern');
    // Join only within a named semantic part/material pair; all pieces keep stable pickable names.
    for(const b of batches.values()) {
      const len=b.geos.reduce((n,geo)=>n+geo.attributes.position.array.length,0),pos=new Float32Array(len),norm=new Float32Array(len);let at=0;
      for(const geo of b.geos){pos.set(geo.attributes.position.array,at);norm.set(geo.attributes.normal.array,at);at+=geo.attributes.position.array.length;geo.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(norm,3));geo.computeBoundingSphere();
      const mesh=new THREE.Mesh(geo,b.mat);mesh.name=b.part;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    }
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);


/* Tidal Academy - ivory timber cottage with terracotta turret; procedural reference reconstruction. */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['cottage_b'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'cottage_b';
    const TAU = Math.PI * 2, buckets = new Map();
    const M = {
      ivory: kit.mat('#f3eadd', {roughness:.89}, 'stone'),
      stone: kit.mat('#efdfc6', {roughness:.87}, 'stone'),
      stone2: kit.mat('#dfceb3', {roughness:.92}, 'stone'),
      stone3: kit.mat('#f9edd9', {roughness:.85}, 'stone'),
      wood: kit.mat('#8f6040', {roughness:.82}, 'wall'),
      woodLight: kit.mat('#b48554', {roughness:.79}, 'wall'),
      woodDark: kit.mat('#5c3e2b', {roughness:.9}, 'wall'),
      roof: kit.mat(kit.roof || '#c4584e', {roughness:.72}, 'roof'),
      gold: kit.mat('#d9b15a', {roughness:.4, metalness:.72}),
      iron: kit.mat('#4e473a', {roughness:.67, metalness:.35}),
      leaf: kit.mat('#57723d', {roughness:.95}),
      leafLight: kit.mat('#889855', {roughness:.92}),
      pink: kit.mat('#db8b99', {roughness:.88}),
      cream: kit.mat('#fff1cc', {roughness:.87}),
      glass: kit.win()
    };
    function add(geo, mat, name) {
      if (geo.index) { const flat=geo.toNonIndexed();geo.dispose();geo=flat; }
      if (!geo.attributes.normal) geo.computeVertexNormals();
      name=({'main-gables':'main-body','timber-belt':'timber-structure','timber-eaves':'timber-structure','timber-posts':'timber-structure','eave-brackets':'timber-structure','turret-corbels':'turret-timber','turret-belt':'turret-timber','door-plank-seams':'door-reveal','door-glazing-rim':'door-reveal','door-plank-crossbars':'door-carved-rim','window-muntins':'window-timber','flowerbox-corbels':'flowerbox-planks'})[name]||name;
      const key=name+'|'+mat.uuid;
      if (!buckets.has(key)) buckets.set(key,{name,mat,list:[]});
      buckets.get(key).list.push(geo);
    }
    function put(geo, mat, name, p=[0,0,0], r=[0,0,0]) {
      geo.rotateX(r[0]);geo.rotateY(r[1]);geo.rotateZ(r[2]);geo.translate(...p);add(geo,mat,name);
    }
    function box(x,y,z,w,h,d,m,n,r=[0,0,0],bevel=0) {
      let q;
      if(bevel>0 && Math.min(w,h,d)>bevel*2.1){
        const b=bevel,s=new THREE.Shape();s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();
        q=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:1,steps:1,curveSegments:1});q.translate(0,0,-d/2+b);
      }else q=new THREE.BoxGeometry(w,h,d);
      put(q,m,n,[x,y,z],r);
    }
    function cyl(x,y,z,rt,rb,h,m,n,segs=24){put(new THREE.CylinderGeometry(rt,rb,h,segs,1),m,n,[x,y,z]);}
    function sphere(x,y,z,rx,ry,rz,m,n,rotation=0){const q=new THREE.SphereGeometry(1,6,4);q.scale(rx,ry,rz);put(q,m,n,[x,y,z],[0,0,rotation]);}
    function rod(a,b,r,m,n,segs=7){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dir=vb.clone().sub(va);const q=new THREE.CylinderGeometry(r,r,dir.length(),segs,1);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));q.translate(...va.add(vb).multiplyScalar(.5).toArray());add(q,m,n);}
    function tube(points,r,m,n,segs=20){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(new THREE.TubeGeometry(c,segs,r,6,false),m,n);}
    function loc(x,y,z,u,v,w,a){return [x+u*Math.cos(a)+w*Math.sin(a),y+v,z-u*Math.sin(a)+w*Math.cos(a)];}
    function archShape(w,h,base=0){const s=new THREE.Shape(),rr=w/2,cy=base+h-rr;s.moveTo(-rr,base);s.lineTo(rr,base);s.lineTo(rr,cy);s.absarc(0,cy,rr,0,Math.PI,false);s.lineTo(-rr,base);s.closePath();return s;}
    function archPanel(x,y,z,w,h,depth,m,n,a=0){const q=new THREE.ExtrudeGeometry(archShape(w,h),{depth,bevelEnabled:false,curveSegments:6,steps:1});put(q,m,n,[x,y,z],[0,a,0]);}
    function archRim(x,y,z,w,h,t,depth,m,n,a=0){const s=archShape(w+2*t,h+2*t,-t);s.holes.push(new THREE.Path(archShape(w,h).getPoints(8).reverse()));const q=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:1,curveSegments:6,steps:1});put(q,m,n,[x,y,z],[0,a,0]);}
    function sector(cx,cz,ri,ro,y,h,a,span,m,n,seg=3,rt=ro){
      const ps=[],idx=[],innerTop=Math.max(.01,ri-(ro-rt));
      for(let j=0;j<=seg;j++){const t=a+span*j/seg,ss=Math.sin(t),cc=Math.cos(t);ps.push(cx+ri*ss,y,cz+ri*cc,cx+ro*ss,y,cz+ro*cc,cx+innerTop*ss,y+h,cz+innerTop*cc,cx+rt*ss,y+h,cz+rt*cc);}
      const quad=(a,b,c,d)=>idx.push(a,b,d,b,c,d);
      for(let j=0;j<seg;j++){const q=j*4,k=q+4;quad(q+1,k+1,k+3,q+3);quad(q,k,k+1,q+1);quad(q+2,q+3,k+3,k+2);quad(q,q+2,k+2,k);}
      quad(0,1,3,2);const e=seg*4;quad(e+1,e,e+2,e+3);const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));q.setIndex(idx);q.computeVertexNormals();add(q,m,n);
    }
    function stoneArch(x,y,z,w,h,t,a=0,name='window-masonry'){
      const r=w/2,spring=h-r;
      for(const side of [-1,1])for(let j=0;j<3;j++){
        const p=loc(x,y,z,side*(r+t/2),spring*(j+.5)/3,0,a);box(...p,t*.98,spring/3-.012,.12,j%2?M.stone:M.stone3,name,[0,a,0],.012);
      }
      for(let j=0;j<9;j++){
        const aa=j*Math.PI/9+.009,bb=(j+1)*Math.PI/9-.009,s=new THREE.Shape();s.moveTo(Math.cos(aa)*r,spring+Math.sin(aa)*r);s.lineTo(Math.cos(bb)*r,spring+Math.sin(bb)*r);s.lineTo(Math.cos(bb)*(r+t),spring+Math.sin(bb)*(r+t));s.lineTo(Math.cos(aa)*(r+t),spring+Math.sin(aa)*(r+t));s.closePath();const q=new THREE.ExtrudeGeometry(s,{depth:.13,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,curveSegments:2,steps:1});put(q,j%3?M.stone3:M.stone,name,[x,y,z-.025],[0,a,0]);
      }
    }
    // Low ivory footing; the circular courses make the turret visible in plan.
    box(.18,.245,-.08,2.94,.49,2.7,M.stone2,'foundation-core');
    for(let row=0;row<2;row++){
      const y=.12+row*.235;
      for(const sz of [-1,1])for(let j=0;j<6;j++){
        const x=-1.06+j*.51+(row%2)*.0;box(x,y,-.08+sz*1.335,.497,.224,.13,(j+row)%3?M.stone:M.stone3,'foundation-courses',[0,0,0],.012);
      }
      for(const sx of [-1,1])for(let j=0;j<5;j++)box(.18+sx*1.46,y,-1.13+j*.53,.14,.224,.517,(j+row)%3?M.stone:M.stone2,'foundation-courses',[0,0,0],.012);
      for(let j=0;j<18;j++)sector(-.97,.7,.62,.775-row*.012,row*.235,.229,j*TAU/18+.006,TAU/18-.012,(j+row)%3?M.stone:M.stone3,'turret-footing',3);
    }
    // Main plaster volume and the filled front/rear gables under the roof.
    box(.16,1.445,-.08,2.8,2.03,2.5,M.ivory,'main-body');
    const gable=new THREE.Shape();gable.moveTo(-1.4,0);gable.lineTo(1.4,0);gable.lineTo(0,1.16);gable.closePath();
    put(new THREE.ExtrudeGeometry(gable,{depth:2.5,bevelEnabled:false}),M.ivory,'main-gables',[.16,2.46,-1.33]);
    cyl(-.97,1.485,.7,.724,.735,2.15,M.ivory,'turret-wall',32);
    // Exposed warm timber: low belt, corners, eaves, and short rooted corbels.
    for(const z of [-1.355,1.195]){
      box(.16,.65,z,2.88,.13,.095,M.wood,'timber-belt');box(.16,2.405,z,2.96,.18,.15,M.wood,'timber-eaves');
      for(const x of [-1.25,1.57]){
        box(x,1.52,z,.145,1.88,.145,M.wood,'timber-posts',[0,0,0],.012);
        box(x,.48,z,.28,.3,.25,M.stone3,'corner-shoes',[0,0,0],.015);
        rod([x,2.08,z],[x,2.36,z+.18*(z>0?1:-1)],.055,M.wood,'eave-brackets',8);
      }
    }
    for(const x of [-1.265,1.585]){box(x,.65,-.08,.09,.13,2.62,M.wood,'timber-belt');box(x,2.405,-.08,.14,.18,2.8,M.wood,'timber-eaves');}
    for(const a of [-.9,.9,2.35,-2.35]){
      const x=-.97+Math.sin(a)*.72,z=.7+Math.cos(a)*.72;
      box(x,1.49,z,.11,1.96,.11,M.wood,'turret-timber',[0,a,0],.009);
      rod([x,2.21,z],[x+Math.sin(a)*.06,2.47,z+Math.cos(a)*.06],.055,M.wood,'turret-corbels',8);
    }
    cyl(-.97,.695,.7,.739,.739,.12,M.wood,'turret-belt',32);
    cyl(-.97,2.515,.7,.78,.76,.16,M.woodDark,'turret-eave',32);
    // Saddle roof: thick underlay, staggered individual ceramic shingles, end fascia.
    const ridgeX=.16,ridgeY=3.65,half=1.64,rise=1.28,roofZ=-.08,roofD=3.02,slope=rise/half,angle=Math.atan(slope),len=Math.hypot(half,rise);
    for(const side of [-1,1]){
      box(ridgeX+side*half/2,ridgeY-rise/2,roofZ,len+.03,.125,roofD,M.roof,'main-roof-underlay',[0,0,-side*angle]);
      for(let row=0;row<7;row++){
        const xx=(row+.5)*half/7,yy=ridgeY-xx*slope;
        for(let col=0;col<11;col++){
          let z=-1.59+col*.285+(row%2)*.1425;
          if(z>1.38)continue;
          if(side===1 && xx>.72 && xx<1.38 && Math.abs(z+.04)<.42)continue;
          const z0=Math.max(-1.60,z-.1385),z1=Math.min(1.44,z+.1385),w=.255+(row===6?.025:0),d=z1-z0;
          if(d<=.012)continue;z=(z0+z1)/2;
          box(ridgeX+side*xx,yy+.087+(6-row)*.003,z,w/Math.cos(angle),.061,d,M.roof,'main-roof-shingles',[0,0,-side*angle],.012);
        }
      }
      box(ridgeX+side*1.66,2.345,roofZ,.11,.19,3.09,M.woodDark,'roof-fascia');
      for(const z of [-1.62,1.46]){
        rod([ridgeX,3.69,z],[ridgeX+side*1.68,2.37,z],.073,M.wood,'gable-fascia',8);
        rod([ridgeX,3.745,z+.015],[ridgeX+side*1.69,2.415,z+.015],.018,M.gold,'gable-gold',6);
        box(ridgeX+side*1.66,2.4,z,.16,.17,.2,M.gold,'eave-caps',[0,0,-side*angle],.012);
      }
    }
    for(let j=0;j<12;j++){const q=new THREE.CylinderGeometry(.086,.086,.247,10,1);q.rotateX(Math.PI/2);q.translate(.16,3.751,-1.48+j*.26);add(q,M.roof,'ridge-tiles');}
    box(.16,3.75,1.47,.18,.19,.17,M.gold,'ridge-terminal',[0,0,0],.015);
    // Turret cone with seven stepped rings of radial shingles, broad eave and brass spire.
    const tx=-.97,tz=.7,coneY=2.63,coneH=1.25,rr=.90,rt=.075;
    cyl(tx,coneY+.605,tz,rt,rr,1.23,M.roof,'turret-roof-shell',36);
    cyl(tx,2.603,tz,.907,.907,.07,M.woodDark,'turret-eave',36);
    for(let row=0;row<7;row++){
      const y=coneY+row*coneH/7,r0=rr-(rr-rt)*row/7,r1=rr-(rr-rt)*(row+1)/7,N=24;
      for(let j=0;j<N;j++)sector(tx,tz,Math.max(.025,r0-.055),r0+.015,y,.191,j*TAU/N+(row%2)*TAU/(N*2)+.006,TAU/N-.012,M.roof,'turret-roof-shingles',1,r1+.018);
    }
    cyl(tx,3.915,tz,.115,.14,.11,M.gold,'turret-finial',16);
    cyl(tx,4.005,tz,.043,.075,.1,M.gold,'turret-finial',12);
    sphere(tx,4.08,tz,.073,.075,.073,M.gold,'turret-finial');
    cyl(tx,4.23,tz,.002,.086,.255,M.gold,'turret-finial',12);
    // Arched glazing modules: raised stone, recessed timber reveal and sturdy muntins.
    function windowAt(x,y,z,w,h,a=0,masonry=true){
      archPanel(x,y,z,w,h,.035,M.woodDark,'window-reveals',a);
      const p=loc(x,y,z,0,.035,.04,a);archPanel(...p,w-.075,h-.07,.025,M.glass,'window-glass',a);
      archRim(x,y,z,w,h,.038,.075,M.wood,'window-timber',a);
      if(masonry)stoneArch(x,y,z-.026,w+.07,h+.045,.09,a);
      const b0=loc(x,y,z,0,.045,.086,a),b1=loc(x,y,z,0,h-.04,.086,a);rod(b0,b1,.019,M.woodLight,'window-muntins',6);
      const p0=loc(x,y,z,-w*.45,h*.45,.089,a),p1=loc(x,y,z,w*.45,h*.45,.089,a);rod(p0,p1,.021,M.wood,'window-muntins',6);
      const c=loc(x,y,z,0,-.052,.065,a);box(...c,w+.23,.1,.21,M.stone3,'window-sills',[0,a,0],.013);
    }
    windowAt(-.97,1.01,1.438,.61,1.06,0,true);
    windowAt(1.577,1.0,-.11,.67,1.08,Math.PI/2,true);
    windowAt(-.47,.99,1.237,.27,.83,.85,true);
    windowAt(.19,1.03,-1.355,.62,1.02,Math.PI,true);
    windowAt(-1.263,1.05,-.67,.56,.99,-Math.PI/2,true);
    // Arched oak entry. Door centre x=.30 is the navigation anchor for game placement.
    const dx=.30,dy=.33,dz=1.23,dw=.76,dh=1.72;
    archPanel(dx,dy,dz,dw,dh,.074,M.woodDark,'door-reveal');
    archPanel(dx,dy+.025,dz+.065,dw-.04,dh-.04,.045,M.wood,'oak-door');
    stoneArch(dx,dy-.005,dz+.018,dw+.045,dh+.025,.14,0,'doorway-stones');
    archRim(dx,dy+.012,dz+.101,dw-.04,dh-.045,.035,.036,M.woodLight,'door-carved-rim');
    for(let j=0;j<6;j++)box(dx-.30+j*.12,dy+.60,dz+.132,.009,1.13,.009,M.woodDark,'door-plank-seams');
    box(dx,dy+.13,dz+.148,.68,.11,.035,M.woodLight,'door-plank-crossbars',[0,0,0],.008);
    box(dx,dy+.74,dz+.148,.68,.08,.035,M.woodLight,'door-plank-crossbars',[0,0,0],.008);
    archPanel(dx,dy+.98,dz+.145,.46,.60,.018,M.glass,'door-glazing');
    archRim(dx,dy+.98,dz+.15,.46,.60,.028,.025,M.woodDark,'door-glazing-rim');
    rod([dx,dy+1.0,dz+.183],[dx,dy+1.55,dz+.183],.014,M.woodLight,'door-glazing-mullions',6);
    rod([dx-.205,dy+1.22,dz+.183],[dx+.205,dy+1.22,dz+.183],.014,M.woodLight,'door-glazing-mullions',6);
    for(const yy of [dy+.34,dy+.78]){box(dx-.285,yy,dz+.17,.13,.035,.025,M.iron,'door-hinges');sphere(dx-.32,yy,dz+.19,.019,.024,.018,M.gold,'door-hardware');}
    box(dx+.17,dy+.62,dz+.183,.065,.13,.025,M.gold,'door-hardware',[0,0,0],.009);
    put(new THREE.TorusGeometry(.073,.014,7,18),M.gold,'door-hardware',[dx+.17,dy+.555,dz+.213]);
    sphere(dx+.17,dy+.63,dz+.208,.026,.026,.02,M.gold,'door-hardware');
    // White entrance treads only; no mailbox or sign is duplicated by the model.
    box(dx,.065,1.9,1.24,.13,.70,M.stone,'entry-steps',[0,0,0],.015);
    box(dx,.23,1.57,1.16,.20,.66,M.stone3,'entry-steps',[0,0,0],.015);
    // A small stone dormer is nested into the right-hand roof slope, normal +X.
    box(1.1,3.04,-.10,.62,.53,.72,M.ivory,'dormer-wall');
    const ds=new THREE.Shape();ds.moveTo(-.36,0);ds.lineTo(.36,0);ds.lineTo(0,.35);ds.closePath();
    put(new THREE.ExtrudeGeometry(ds,{depth:.67,bevelEnabled:false}),M.ivory,'dormer-gable',[.79,3.305,-.10],[0,Math.PI/2,0]);
    windowAt(1.431,2.89,-.10,.39,.43,Math.PI/2,false);
    for(const z of [-.46,.26])box(1.43,3.05,z,.11,.61,.09,M.wood,'dormer-timber');
    for(const s of [-1,1]){
      const ang=Math.atan2(.37,.46),z=-.10+s*.235;
      box(1.12,3.475,z,.87,.07,.59,M.roof,'dormer-roof',[s*ang,0,0]);
      rod([1.57,3.69,-.10],[1.57,3.32,-.10+s*.48],.044,M.wood,'dormer-fascia',7);
      for(let r=0;r<3;r++)for(let j=0;j<3;j++)box(.84+j*.275,3.729-(r+.5)*.145*Math.tan(ang),-.10+s*(r+.5)*.145,.267,.045,.19,M.roof,'dormer-shingles',[s*ang,0,0],.008);
    }
    box(1.575,3.68,-.10,.11,.12,.13,M.gold,'dormer-crest',[0,0,0],.01);
    // Block chimney with capstone and a small dark open flue.
    box(.94,3.41,-.8,.40,1.10,.41,M.stone2,'chimney-core');
    for(let r=0;r<5;r++){
      const y=2.96+r*.22;
      for(let j=0;j<2;j++)box(.835+j*.215,y,-.8,.207,.208,.43,(r+j)%3?M.stone:M.stone3,'chimney-blocks',[0,0,0],.012);
    }
    box(.94,4.01,-.8,.57,.16,.57,M.stone3,'chimney-cap',[0,0,0],.018);
    box(.94,4.103,-.8,.36,.032,.36,M.iron,'chimney-flue');
    for(const side of [-1,1]){box(.94+side*.196,4.135,-.8,.064,.08,.44,M.gold,'chimney-rim');box(.94,4.135,-.8+side*.196,.34,.08,.064,M.gold,'chimney-rim');}
    // Brass lantern anchored to the entry post, with night-reactive kit.win core.
    box(.91,1.96,1.245,.08,.24,.07,M.iron,'lantern-bracket');
    tube([[.91,2.0,1.27],[.91,2.16,1.39],[.91,2.16,1.55],[.91,2.06,1.59]],.019,M.gold,'lantern-bracket',14);
    rod([.91,2.065,1.59],[.91,1.955,1.59],.015,M.gold,'lantern-frame',7);
    box(.91,1.735,1.59,.18,.31,.18,M.glass,'lantern-core');
    for(const xx of [-1,1])for(const zz of [-1,1])rod([.91+xx*.115,1.56,1.59+zz*.115],[.91+xx*.09,1.91,1.59+zz*.09],.014,M.gold,'lantern-frame',6);
    box(.91,1.555,1.59,.27,.055,.27,M.gold,'lantern-frame',[0,0,0],.009);
    put(new THREE.ConeGeometry(.18,.15,4),M.gold,'lantern-cap',[.91,1.963,1.59],[0,Math.PI/4,0]);
    sphere(.91,1.49,1.59,.035,.052,.035,M.gold,'lantern-frame');
    // Two deep window boxes with carved wood braces, restrained leaves and daisies.
    function flowerbox(x,y,z,w,a=0){
      const p=(u,v,d)=>loc(x,y,z,u,v,d,a);
      box(...p(0,0,0),w,.2,.28,M.woodDark,'flowerbox-cases',[0,a,0],.008);
      for(let r=0;r<2;r++)box(...p(0,-.05+r*.1,.145),w+.015,.08,.033,M.wood,'flowerbox-planks',[0,a,0],.007);
      box(...p(0,.115,.01),w+.06,.05,.32,M.woodLight,'flowerbox-rims',[0,a,0],.007);
      for(const side of [-1,1]){
        box(...p(side*(w/2-.07),0,.173),.065,.21,.035,M.gold,'flowerbox-straps',[0,a,0],.005);
        const b=p(side*w*.32,-.11,.08),c=p(side*w*.32,-.29,-.055);rod(b,c,.045,M.wood,'flowerbox-corbels',7);
      }
      for(let i=0;i<13;i++){
        const u=-w*.43+(i%7)*w*.14,v=.16+(i%3)*.025,d=-.06+Math.floor(i/7)*.14,pp=p(u,v,d),theta=(i%2?1:-1)*(.48+(i%3)*.15);
        sphere(...pp,.062,.135,.035,i%3?M.leaf:M.leafLight,'flowerbox-foliage',theta);
      }
      for(let i=0;i<7;i++){
        const u=-w*.37+i*w*.12,v=.23+(i%3)*.05,d=.035+(i%2)*.035,c=p(u,v,d),m=i%3===0?M.cream:M.pink;
        for(let j=0;j<5;j++){const t=j*TAU/5,pp=p(u+Math.cos(t)*.047,v+Math.sin(t)*.047,d+.01);sphere(...pp,.031,.042,.022,m,'flowerbox-petals',-t+.25);}
        sphere(c[0],c[1],c[2]+.028,.025,.025,.018,M.gold,'flowerbox-centres');
      }
    }
    flowerbox(-.97,.93,1.52,.90,0);
    flowerbox(1.635,.92,-.11,.91,Math.PI/2);
    // Static batches preserve semantic assemblies while limiting runtime draw calls.
    for(const {name,mat,list} of buckets.values()){
      let count=0;for(const q of list)count+=q.attributes.position.count;
      const pos=new Float32Array(count*3),norm=new Float32Array(count*3),uv=new Float32Array(count*2);let vo=0,uo=0;
      for(const q of list){const p=q.attributes.position,n=q.attributes.normal,t=q.attributes.uv;pos.set(p.array,vo);norm.set(n.array,vo);if(t)uv.set(t.array,uo);vo+=p.count*3;uo+=p.count*2;q.dispose();}
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.BufferAttribute(pos,3));q.setAttribute('normal',new THREE.BufferAttribute(norm,3));q.setAttribute('uv',new THREE.BufferAttribute(uv,2));q.computeBoundingSphere();
      const mesh=new THREE.Mesh(q,mat);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    }
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);


/* Tidal Academy: ivory timber cottage with oculus, flower window and green slate porch. */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['cottage_c'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'cottage-c-oculus';
    const M = {
      ivory: kit.mat('#f3ebdc', { roughness: .92 }, 'stone'),
      stone: kit.mat('#eee2ce', { roughness: .90 }, 'stone'),
      stone2: kit.mat('#d8c9b0', { roughness: .95 }, 'stone'),
      mortar: kit.mat('#b6aa92', { roughness: 1 }, 'stone'),
      wood: kit.mat('#8f6040', { roughness: .83 }, 'wall'),
      wood2: kit.mat('#af7d50', { roughness: .79 }, 'wall'),
      dark: kit.mat('#60452f', { roughness: .90 }),
      roof: kit.mat(kit.roof || '#5f8a4a', { roughness: .78 }, 'roof'),
      gold: kit.mat('#d8b05c', { roughness: .40, metalness: .68 }),
      gold2: kit.mat('#997136', { roughness: .52, metalness: .56 }),
      leaf: kit.mat('#4f743c', { roughness: .96 }),
      leaf2: kit.mat('#819949', { roughness: .94 }),
      cream: kit.mat('#fff0ca', { roughness: .88 }),
      pink: kit.mat('#dc887e', { roughness: .88 }),
      yellow: kit.mat('#deb04d', { roughness: .79 }),
      glass: kit.win()
    };
    const batches = new Map(); let group = 'foundation';
    function add(geo, material) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.index) { const old = geo; geo = geo.toNonIndexed(); old.dispose(); }
      const key = group + '|' + material.uuid;
      if (!batches.has(key)) batches.set(key, { name: group, material, parts: [] });
      batches.get(key).parts.push(geo);
    }
    function put(geo, m, x, y, z, rx = 0, ry = 0, rz = 0) {
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
      add(geo,m);
    }
    function roundBox(w,h,d,r=.01) {
      r = Math.min(r,w/5,h/5,d/5);
      const s = new THREE.Shape(), x=w/2-r, y=h/2-r;
      s.moveTo(-x,-y);s.lineTo(x,-y);s.lineTo(x,y);s.lineTo(-x,y);s.closePath();
      const geo = new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:1});
      geo.translate(0,0,-d/2+r); return geo;
    }
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0,r=0) { put(r?roundBox(w,h,d,r):new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz); }
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1) { const q=new THREE.SphereGeometry(r,8,5);q.scale(sx,sy,sz);put(q,m,x,y,z); }
    function beam(a,b,r,m,r2=r,n=6) { const A=new THREE.Vector3(...a), B=new THREE.Vector3(...b), v=B.clone().sub(A);const geo=new THREE.CylinderGeometry(r2,r,v.length(),n);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(geo,m); }
    function tube(points,r,m,segments=24) { add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,5,false),m); }
    function shape(points,depth,x,y,z,m,ry=0,bevel=0) { const s=new THREE.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();put(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:12}),m,x,y,z,0,ry); }
    function archPts(w,h,n=16) {const p=[[-w/2,0],[w/2,0],[w/2,h-w/2]];for(let i=0;i<=n;i++){const a=i*Math.PI/n;p.push([Math.cos(a)*w/2,h-w/2+Math.sin(a)*w/2]);}return p;}
    function arch(x,y,z,w,h,d,m,ry=0) {shape(archPts(w,h),d,x,y,z,m,ry);}
    function archRim(x,y,z,w,h,r,m,ry=0) {const p=[[-w/2,0],[-w/2,h-w/2]];for(let i=0;i<=24;i++){const a=Math.PI-i*Math.PI/24;p.push([Math.cos(a)*w/2,h-w/2+Math.sin(a)*w/2]);}p.push([w/2,0]);const c=Math.cos(ry),s=Math.sin(ry);tube(p.map(p=>[x+c*p[0],y+p[1],z-s*p[0]]),r,m,32);}
    function torus(x,y,z,r,t,m,rx=0,ry=0) {put(new THREE.TorusGeometry(r,t,5,24),m,x,y,z,rx,ry);}
    // Limestone foundation, staggered broad courses and corner pads.
    box(0,.13,0,3.44,.26,2.94,M.mortar,0,0,0,.02);
    box(0,1.29,0,3.28,2.10,2.76,M.ivory,0,0,0,.024);
    for(let row=0;row<2;row++) {
      const y=.105+row*.205;
      for(let i=0;i<8;i++) { const x=-1.49+i*.425;for(const s of [-1,1])box(x,y,s*1.432,.405,.19,.11,(i+row)%3?M.stone:M.stone2,0,0,0,.012); }
      for(let i=0;i<7;i++) {const z=-1.22+i*.405;for(const s of [-1,1])box(s*1.666,y,z,.11,.19,.385,(i+row)%3?M.stone:M.stone2,0,0,0,.012);}
    }
    for(const x of [-1.60,1.60])for(const z of [-1.32,1.32]) {box(x,.22,z,.29,.44,.31,M.stone,0,0,0,.023);box(x,.47,z,.30,.11,.33,M.stone,0,0,0,.014);}
    // Broad timber skeleton, with brass capped joinery and short supporting braces.
    group='timber-frame';
    for(const x of [-1.57,1.57])for(const z of [-1.32,1.32])box(x,1.40,z,.18,1.90,.18,M.wood,0,0,0,.015);
    for(const y of [.57,2.30]) {for(const z of [-1.394,1.394])box(0,y,z,3.36,.15,.13,M.wood,0,0,0,.013);for(const x of [-1.637,1.637])box(x,y,0,.12,.15,2.80,M.wood,0,0,0,.012);}
    for(const x of [-1.54,1.54])for(const z of [-1.40,1.40]) {box(x,2.29,z,.23,.21,.19,M.wood2,0,0,0,.018);box(x,2.31,z+(z>0?.102:-.102),.20,.15,.025,M.gold,0,0,0,.012);}
    for(const x of [-1.56,1.56])for(const z of [-1.35,1.35])beam([x,1.91,z],[x-Math.sign(x)*.26,2.28,z],.055,M.wood);
    // Solid gables sit below roof skins; front oculus is framed in an ivory voussoir ring.
    group='gable';
    for(const z of [-1.37,1.37])shape([[-1.63,0],[1.63,0],[0,1.45]],.07,0,2.34,z,M.ivory, z<0?Math.PI:0);
    for(const z of [-1.48,1.48]) {for(const s of [-1,1])beam([s*1.76,2.24,z],[0,3.87,z],.093,M.wood);box(0,3.68,z,.14,.45,.16,M.wood,0,0,0,.01);for(const x of [-.66,.66])box(x,2.60,z,.13,.44,.12,M.wood,0,0,0,.01);}
    group='slate-roof';
    const rise=1.64, run=1.91, peak=3.88, a=Math.atan2(rise,run), L=Math.hypot(rise,run);
    for(const side of [-1,1]) {
      box(side*run/2,peak-rise/2,0,L,.09,3.32,M.roof,0,0,-side*a);
      for(let row=0;row<8;row++)for(let j=0;j<11;j++) {
        const t=(row+.5)/8, z=-1.525+j*.305+(row%2?.055:0);
        const zz=Math.min(1.53,z);
        box(side*run*t,peak-rise*t+.058,zz,L/8+.028,.065,.30,M.roof,0,0,-side*(a-.025),.008);
      }
      box(side*1.90,2.23,0,.12,.18,3.40,M.wood,0,0,0,.013);
      for(const z of [-1.70,1.70]) {beam([0,3.91,z],[side*1.94,2.25,z],.065,M.wood2);beam([0,3.95,z],[side*1.94,2.29,z],.022,M.gold);}
    }
    beam([0,3.96,-1.72],[0,3.96,1.72],.055,M.wood2);beam([0,4.005,-1.70],[0,4.005,1.70],.022,M.gold);
    function finial(x,y,z,h=.28) {box(x,y+.02,z,.18,.08,.17,M.gold,0,0,0,.015);ball(x,y+.10,z,.062,M.gold,1,.7,1);put(new THREE.ConeGeometry(.074,h*.63,4),M.gold,x,y+.12+h*.31,z,0,Math.PI/4);}
    finial(0,4.00,1.51,.27);finial(0,4.00,-1.49,.21);
    group='oculus';
    const wy=3.03,wz=1.482;
    put(new THREE.CircleGeometry(.335,32),M.glass,0,wy,wz);
    torus(0,wy,wz+.025,.355,.047,M.dark);torus(0,wy,wz+.052,.393,.048,M.wood2);
    for(let i=0;i<12;i++){const p=[],a0=i*Math.PI/6+.012,a1=(i+1)*Math.PI/6-.012;for(let j=0;j<=3;j++){const a=a0+(a1-a0)*j/3;p.push([Math.cos(a)*.49,Math.sin(a)*.49]);}for(let j=3;j>=0;j--){const a=a0+(a1-a0)*j/3;p.push([Math.cos(a)*.423,Math.sin(a)*.423]);}shape(p,.065,0,wy,wz+.015,i%4?M.stone:M.stone2,0,.005);}
    box(0,wy,wz+.08,.038,.65,.035,M.wood);box(0,wy,wz+.082,.65,.038,.035,M.wood);
    // Large arched flower window; thick stone border, recessed glazing and curved oak frame.
    group='front-flower-window';
    const wx=-.73, bottom=.80, zf=1.414;
    arch(wx,bottom-.02,zf,1.35,1.46,.045,M.dark);arch(wx,bottom,zf+.047,1.20,1.35,.025,M.glass);
    archRim(wx,bottom-.045,zf+.09,1.28,1.46,.052,M.wood2);
    const cy=bottom+1.42-.68;
    for(let i=0;i<9;i++){const p=[],a0=i*Math.PI/9+.015,a1=(i+1)*Math.PI/9-.015;for(let j=0;j<=2;j++){const a=a0+(a1-a0)*j/2;p.push([Math.cos(a)*.795,cy+Math.sin(a)*.795]);}for(let j=2;j>=0;j--){const a=a0+(a1-a0)*j/2;p.push([Math.cos(a)*.684,cy+Math.sin(a)*.684]);}shape(p,.12,wx,0,zf+.025,i%4?M.stone:M.stone2,0,.008);}
    for(const side of [-1,1])for(let i=0;i<4;i++)box(wx+side*.742,bottom+.075+i*.165,zf+.07,.13,.155,.17,i%3?M.stone:M.stone2,0,0,0,.012);
    box(wx,bottom-.065,zf+.10,1.54,.13,.26,M.stone,0,0,0,.015);
    for(const dx of [-.38,0,.38]) {const top=bottom+1.35-.60+Math.sqrt(Math.max(0,.60*.60-dx*dx));box(wx+dx,(bottom+top)/2,zf+.112,.04,top-bottom,.04,M.wood);}
    for(const y of [1.08,1.47,1.85])box(wx,y,zf+.115,y>1.7?1.04:1.20,.043,.04,M.wood);
    // Right entrance retains its asymmetric position. Door centre x=.93, ground approach +Z.
    group='door';
    const dx=.93;
    arch(dx,.30,1.423,.78,1.70,.07,M.dark);arch(dx,.32,1.501,.66,1.57,.025,M.wood);
    archRim(dx,.29,1.47,.88,1.82,.075,M.stone);archRim(dx,.32,1.548,.69,1.59,.033,M.wood2);
    for(let i=0;i<5;i++) {const xx=dx-.26+i*.13,top=1.56+Math.sqrt(Math.max(0,.33*.33-(xx-dx)*(xx-dx)));box(xx,(.36+top)/2,1.54,.118,top-.36,.027,i%2?M.wood:M.wood2);}
    for(const y of [.59,1.07])box(dx,y,1.569,.62,.038,.022,M.dark);
    for(const y of [.58,1.07])box(dx-.245,y,1.585,.12,.026,.025,M.gold2,0,0,0,.005);
    box(dx+.15,.99,1.581,.075,.15,.024,M.gold,0,0,0,.01);ball(dx+.15,1.03,1.61,.045,M.gold,1,1,.6);torus(dx+.15,.94,1.625,.066,.012,M.gold);
    box(dx-.22,.94,1.594,.035,.18,.025,M.gold,0,0,0,.007);
    // Porch is a shallow right mono-pitch roof, with a socketed pillar and curved supporting brace.
    group='porch';
    const pa=.25,pc=.99,py=2.47;
    box(pc,py,1.48,1.72,.09,.70,M.roof,0,0,-pa);
    for(let row=0;row<5;row++)for(let j=0;j<3;j++){let x=.31+row*.34,y=2.64-(x-.31)*Math.tan(pa);box(x,y,1.25+j*.245,.36,.047,.24,M.roof,0,0,-pa,.007);}
    beam([.15,2.68,1.825],[1.83,2.25,1.825],.064,M.wood2);beam([.15,2.72,1.825],[1.83,2.29,1.825],.021,M.gold);
    box(1.78,2.25,1.48,.12,.16,.72,M.wood,0,0,0,.012);
    box(1.58,.25,1.405,.31,.50,.32,M.stone,0,0,0,.024);box(1.58,.52,1.405,.34,.1,.35,M.stone,0,0,0,.014);box(1.58,1.37,1.405,.18,1.67,.18,M.wood,0,0,0,.015);box(1.58,2.18,1.405,.26,.15,.22,M.wood2,0,0,0,.01);
    tube([[1.57,1.80,1.48],[1.49,2.00,1.48],[1.26,2.19,1.48],[1.08,2.27,1.48]],.055,M.wood,18);
    box(1.76,2.26,1.825,.19,.16,.05,M.gold,0,0,-pa,.012);finial(1.69,2.35,1.60,.21);
    group='entrance-steps';
    box(dx,.065,1.99,1.13,.13,.55,M.stone,0,0,0,.018);box(dx,.15,1.64,1.08,.30,.48,M.stone,0,0,0,.018);
    for(let i=0;i<3;i++)box(dx-.36+i*.36,.136,1.99,.345,.017,.51,i%2?M.ivory:M.stone,0,0,0,.006);
    // Limestone chimney with cap, recessed flue and a small brass rain hood.
    group='chimney';
    box(1.00,3.55,-.64,.43,1.16,.44,M.mortar,0,0,0,.012);
    for(let r=0;r<5;r++) {let y=3.03+r*.224;for(const side of [-1,1])for(let j=0;j<2;j++){box(.896+j*.211,y,-.64+side*.222,.198,.21,.035,(r+j)%3?M.stone:M.stone2,0,0,0,.009);box(1.0+side*.222,y,-.744+j*.211,.035,.21,.198,(r+j)%3?M.stone:M.stone2,0,0,0,.009);}}
    box(1,4.12,-.64,.56,.17,.56,M.stone,0,0,0,.018);box(1,4.224,-.64,.39,.045,.39,M.dark,0,0,0,.006);
    beam([1,4.23,-.64],[1,4.37,-.64],.075,M.gold2,.075,8);put(new THREE.ConeGeometry(.14,.10,4),M.gold,1,4.40,-.64,0,Math.PI/4);
    // Side and rear arched windows are conservative completions of the concealed faces.
    function smallWindow(x,y,z,ry) {
      arch(x,y,z,.62,1.06,.024,M.glass,ry);archRim(x,y,z,.70,1.15,.067,M.stone,ry);archRim(x,y+.02,z+.012,.59,1.04,.026,M.wood,ry);
      const c=Math.cos(ry),s=Math.sin(ry),p=(u,v,out)=>[x+c*u+s*out,y+v,z-s*u+c*out];beam(p(0,.05,.05),p(0,.97,.05),.017,M.wood);beam(p(-.28,.49,.05),p(.28,.49,.05),.017,M.wood);
      if(Math.abs(c)<.1)box(x+Math.sign(s)*.035,y-.05,z,.22,.13,.84,M.stone,0,0,0,.012);else box(x,y-.05,z+Math.sign(c)*.035,.84,.13,.22,M.stone,0,0,0,.012);
    }
    group='side-windows';smallWindow(1.654,.92,-.15,Math.PI/2);smallWindow(-1.654,.94,-.28,-Math.PI/2);
    group='rear-window';smallWindow(-.48,.96,-1.414,Math.PI);
    group='lantern';
    const lx=1.36,ly=1.47,lz=1.69;
    box(lx,ly+.30,1.42,.11,.24,.08,M.wood2,0,0,0,.01);
    tube([[lx,ly+.36,1.46],[lx,ly+.48,1.54],[lx,ly+.46,1.68],[lx,ly+.36,lz]],.015,M.gold,14);
    torus(lx,ly+.31,lz,.042,.011,M.gold,0,Math.PI/2);
    box(lx,ly+.08,lz,.16,.25,.16,M.glass,0,0,0,.008);
    for(const sx of [-1,1])for(const sz of [-1,1])beam([lx+sx*.105,ly-.07,lz+sz*.105],[lx+sx*.079,ly+.24,lz+sz*.079],.011,M.gold);
    put(new THREE.ConeGeometry(.16,.12,4),M.gold,lx,ly+.29,lz,0,Math.PI/4);box(lx,ly-.08,lz,.24,.045,.24,M.gold,0,0,0,.006);ball(lx,ly-.13,lz,.035,M.gold);
    // Flowerboxes use merged leaf and petal clusters rather than individual draw calls.
    group='flowerbox';
    box(-.73,.70,1.54,1.48,.20,.30,M.dark,0,0,0,.012);box(-.73,.68,1.707,1.52,.17,.055,M.wood2,0,0,0,.012);box(-.73,.79,1.70,1.54,.055,.075,M.wood,0,0,0,.007);
    for(const x of [-1.37,-.09]) {box(x,.67,1.748,.10,.25,.04,M.wood,0,0,0,.008);for(const y of [.62,.74])ball(x,y,1.774,.020,M.gold,1,1,.45);}
    function leaf(x,y,z,a,m) {const q=new THREE.SphereGeometry(1,6,4);q.scale(.055,.115,.027);q.rotateZ(a);put(q,m,x,y,z);}
    function bloom(x,y,z,m,r=.055) {for(let p=0;p<5;p++){const a=p*Math.PI*2/5;ball(x+Math.cos(a)*r*.70,y+Math.sin(a)*r*.55,z,r*.55,m,1,1,.50);}ball(x,y,z+.018,r*.36,M.yellow,1,1,.55);}
    for(let i=0;i<11;i++){let x=-1.35+i*.125,y=.85+Math.sin(i*2.4)*.035;beam([x,.77,1.57],[x+.017,y+.06,1.61],.007,M.leaf);for(let j=0;j<3;j++)leaf(x+Math.sin(i*2+j)*.07,y,1.58+Math.cos(j*2)*.06,Math.sin(i+j)*1.3,(i+j)%2?M.leaf:M.leaf2);if(i%2===0)bloom(x+.01,y+.10,1.68,i%3===0?M.pink:M.cream,.068);}
    group='side-flowerbox';
    box(1.68,.76,-.15,.26,.19,.89,M.wood,0,0,0,.01);for(let i=0;i<5;i++){let z=-.47+i*.16;leaf(1.74,.9,z,i*.7,M.leaf2);leaf(1.66,.88,z,-i*.9,M.leaf);if(i%2===0)bloom(1.78,.98,z,i%3?M.cream:M.pink,.05);}
    // The game places mailbox and owner signage; this factory deliberately has neither.
    for(const b of batches.values()) {
      let count=0;for(const q of b.parts)count+=q.attributes.position.count;
      const positions=new Float32Array(count*3),normals=new Float32Array(count*3);let off=0;
      for(const q of b.parts){positions.set(q.attributes.position.array,off);normals.set(q.attributes.normal.array,off);off+=q.attributes.position.array.length;q.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));geo.computeBoundingSphere();
      const mesh=new THREE.Mesh(geo,b.material);mesh.name='cottage-c-'+b.name+'-'+b.material.id;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    }
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);


/* 潮汐小島 · 程式化模型（img2threejs 重建）：帶陽台與星形風向標的玩家之家。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['player_home'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'player_home';
    const PASS = 1;
    const roofColor = kit.roof || '#4f6fb8';
    const tint = (color, amount) => new THREE.Color(color).multiplyScalar(amount).getStyle();
    const M = {
      plaster: kit.mat('#f3e9d8', { roughness: .9 }, 'stone'),
      stone: kit.mat('#f3efe6', { roughness: .88 }, 'stone'),
      stone2: kit.mat('#d8cbb7', { roughness: .92 }, 'stone'),
      mortar: kit.mat('#b7a995', { roughness: .98 }),
      wood: kit.mat('#8f6040', { roughness: .76 }, 'wall'),
      dark: kit.mat('#65432f', { roughness: .82 }),
      honey: kit.mat('#ba8756', { roughness: .73 }),
      roof: kit.mat(roofColor, { roughness: .64 }, 'roof'),
      roofLight: kit.mat(tint(roofColor, 1.12), { roughness: .66 }, 'roof'),
      roofDark: kit.mat(tint(roofColor, .83), { roughness: .71 }, 'roof'),
      gold: kit.mat('#d8b45a', { roughness: .38, metalness: .72 }),
      glass: kit.win(),
      leaf: kit.mat('#648247', { roughness: .88 }),
      leafLight: kit.mat('#8d9b56', { roughness: .87 }),
      pink: kit.mat('#df8f91', { roughness: .88 }),
      cream: kit.mat('#f7dfb0', { roughness: .86 })
    };
    // Integral details share a draw call inside their named architectural assembly.
    const buckets = new Map(); let part = 'foundation';
    function add(geometry, material, x=0, y=0, z=0, rx=0, ry=0, rz=0) {
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)), new THREE.Vector3(1,1,1));
      const geo = geometry.index ? geometry.toNonIndexed() : geometry.clone(); geo.applyMatrix4(matrix);
      const key = part + ':' + material.uuid;
      if (!buckets.has(key)) buckets.set(key, { material, name: part, geos: [] });
      buckets.get(key).geos.push(geo); geometry.dispose(); return geo;
    }
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0) { add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz); }
    function roundBox(x,y,z,w,h,d,m,b=.025) {
      const sh=new THREE.Shape(),r=Math.min(b,w/5,h/5),hw=w/2-1.5*r,hh=h/2-1.5*r;
      sh.moveTo(-hw,-hh-r);sh.lineTo(hw,-hh-r);sh.quadraticCurveTo(hw+r,-hh-r,hw+r,-hh);sh.lineTo(hw+r,hh);sh.quadraticCurveTo(hw+r,hh+r,hw,hh+r);sh.lineTo(-hw,hh+r);sh.quadraticCurveTo(-hw-r,hh+r,-hw-r,hh);sh.lineTo(-hw-r,-hh);sh.quadraticCurveTo(-hw-r,-hh-r,-hw,-hh-r);
      add(new THREE.ExtrudeGeometry(sh,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r/2,bevelSegments:1,steps:1,curveSegments:2}),m,x,y,z-d/2+r);
    }
    function beam(a,b,r,m) {
      const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),geo=new THREE.CylinderGeometry(r,r,d.length(),6);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())); add(geo,m,...va.add(vb).multiplyScalar(.5).toArray());
    }
    function profile(points,depth,x,y,z,m,ry=0,bevel=0) {
      const sh=new THREE.Shape();points.forEach((p,i)=>i?sh.lineTo(...p):sh.moveTo(...p));sh.closePath();
      add(new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:10,steps:1}),m,x,y,z,0,ry,0);
    }
    function sphere(x,y,z,r,m,sx=1,sy=1,sz=1) {const geo=new THREE.SphereGeometry(r,7,5);geo.scale(sx,sy,sz);add(geo,m,x,y,z);}
    function archShape(w,h) {const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();return s;}
    function arch(x,y,z,w,h,d,m,ry=0) {add(new THREE.ExtrudeGeometry(archShape(w,h),{depth:d,bevelEnabled:false,curveSegments:12,steps:1}),m,x,y,z,0,ry);}
    function ring(x,y,z,w,h,t,m,ry=0) {
      const sh=archShape(w,h),hole=archShape(w-2*t,h-t);const pts=hole.getPoints(24).map(p=>new THREE.Vector2(p.x,p.y+t));const path=new THREE.Path(pts);sh.holes.push(path);
      add(new THREE.ExtrudeGeometry(sh,{depth:.055,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,curveSegments:12,steps:1}),m,x,y,z,0,ry);
    }
    function local(x,y,z,ry,p) {return [x+Math.cos(ry)*p[0]+Math.sin(ry)*p[2],y+p[1],z-Math.sin(ry)*p[0]+Math.cos(ry)*p[2]];}
    function windowArch(x,y,z,w,h,ry=0,stone=true) {
      arch(x,y,z,w+.12,h+.07,.04,M.dark,ry); arch(...local(x,y,z,ry,[0,.055,.047]),w-.1,h-.1,.025,M.glass,ry);
      ring(...local(x,y,z,ry,[0,-.055,.065]),w+.23,h+.16,.105,stone?M.stone:M.honey,ry);
      ring(...local(x,y,z,ry,[0,.015,.13]),w+.015,h-.005,.045,M.wood,ry);
      const v=(a,b,r,m)=>beam(local(x,y,z,ry,a),local(x,y,z,ry,b),r,m);
      v([0,.06,.18],[0,h-.1,.18],.019,M.honey);v([-w*.42,h*.45,.18],[w*.42,h*.45,.18],.018,M.honey);
      if(stone) for(let j=0;j<7;j++){const a=j*Math.PI/6,pos=local(x,y,z,ry,[Math.cos(a)*(w/2+.06),h-w/2+Math.sin(a)*(w/2+.06),.13]); const gg=new THREE.BoxGeometry(.02,.13,.075);gg.rotateZ(a-Math.PI/2);add(gg,M.stone2,...pos,0,ry);}
      const at=local(x,y,z,ry,[0,-.06,.13]);box(...at,w+.25,.085,.23,M.stone,0,ry);
    }
    function flowers(x,y,z,w,ry=0) {
      const at=p=>local(x,y,z,ry,p);
      box(...at([0,0,0]),w,.16,.23,M.wood,0,ry);box(...at([0,.08,.11]),w+.035,.047,.045,M.honey,0,ry);
      for(const s of [-1,1])box(...at([s*w*.33,-.14,-.04]),.065,.24,.1,M.dark,0,ry);
      for(let j=0;j<7;j++){const xx=-w*.42+j*w*.14,yy=.13+.024*Math.sin(j*1.7);sphere(...at([xx,yy,.025]),.103,j%2?M.leaf:M.leafLight,1,.65,1);sphere(...at([xx+.025,yy+.047,.078]),.043,j%3?M.pink:M.cream,1,.8,1);if(j%2===0)sphere(...at([xx-.03,yy+.055,.09]),.025,M.cream);}
    }
    function roof(cx,cy,cz,half,rise,length,ry=0,tiled=true) {
      const a=Math.atan(rise/half),len=Math.hypot(half,rise),at=p=>local(cx,cy,cz,ry,p);
      const surface=t=>rise*(1-t)+.027*Math.pow(t,8);
      for(const s of [-1,1]){
        const slab=new THREE.BoxGeometry(len,.08,length);slab.rotateZ(-s*a);slab.translate(s*half/2,rise/2,0);slab.rotateY(ry);add(slab,M.roofDark,cx,cy,cz);
        if(tiled)for(let row=0;row<8;row++){
          const t0=row/8,t1=(row+1)/8+.012,x0=s*half*t0,x1=s*half*Math.min(1.012,t1),y0=surface(t0)+.066,y1=surface(Math.min(1.012,t1))+.066;
          const pitch=length/11,shift=(row%2)*pitch/2;
          for(let j=-1;j<12;j++){let z0=Math.max(-length/2,-length/2+j*pitch+shift),z1=Math.min(length/2,-length/2+(j+1)*pitch+shift-.01);if(z1-z0<.035)continue;
            const points=[[x0,y0,z0],[x1,y1,z0],[x1,y1,z1],[x0,y0,z1]],P=[];
            const down=p=>[p[0],p[1]-.026,p[2]],face=(a,b,c)=>P.push(...a,...b,...c);
            const q=s>0?[...points].reverse():points;face(q[0],q[1],q[2]);face(q[0],q[2],q[3]);
            for(let k=0;k<4;k++){const p=q[k],n=q[(k+1)%4];face(p,down(p),n);face(n,down(p),down(n));}
            const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.computeVertexNormals();geo.rotateY(ry);add(geo,(row+j)%5===0?M.roofLight:(row+j)%7===0?M.roofDark:M.roof,cx,cy,cz);
          }
        }
        for(const zz of [-length/2,length/2]){beam(at([0,rise+.055,zz]),at([s*half,.055,zz]),.058,M.wood);beam(at([0,rise+.09,zz+.024]),at([s*half,.09,zz+.024]),.021,M.gold);}
        beam(at([s*half,.005,-length/2]),at([s*half,.005,length/2]),.055,M.dark);
        beam(at([s*half,.063,-length/2]),at([s*half,.063,length/2]),.019,M.gold);
      }
      beam(at([0,rise+.09,-length/2]),at([0,rise+.09,length/2]),.043,M.gold);
    }

    roundBox(0,.16,0,3.42,.32,2.94,M.stone,.026);roundBox(0,.36,0,3.32,.13,2.83,M.stone2,.02);
    part='wall-shell'; box(0,1.46,0,3.12,2.16,2.6,M.plaster);
    profile([[-1.56,0],[1.56,0],[0,1.54]],2.6,0,2.53,-1.3,M.plaster);
    part='main-roof';roof(0,2.47,0,1.80,1.61,3.16,0,PASS>=1);
    part='balcony';box(0,2.60,1.43,2.13,.14,.54,M.wood);box(0,3.05,1.71,2.15,.095,.09,M.honey);
    part='chimney';box(1.01,3.59,-.78,.43,1.27,.44,M.stone);roundBox(1.01,4.25,-.78,.55,.15,.55,M.stone,.02);box(1.01,4.337,-.78,.36,.025,.36,M.dark);
    part='weather-vane';beam([0,4.17,1.16],[0,4.79,1.16],.028,M.gold);beam([-.38,4.62,1.16],[.4,4.62,1.16],.022,M.gold);
    const star=[];for(let i=0;i<8;i++){const a=Math.PI/2+i*Math.PI/4,r=i%2?.065:.23;star.push([Math.cos(a)*r,Math.sin(a)*r]);}profile(star,.045,0,4.91,1.135,M.gold);
    profile([[0,0],[.15,.08],[.1,0],[.15,-.08]],.035,.26,4.62,1.143,M.gold);sphere(-.35,4.62,1.16,.055,M.gold);
    part='entrance-steps';roundBox(.43,.09,1.98,1.27,.18,.60,M.stone,.025);roundBox(.43,.24,1.70,1.16,.18,.55,M.stone,.02);
    if(PASS>=1){
      part='frame';
      for(const xx of [-1.52,1.52])for(const zz of [-1.28,1.28]){box(xx,1.43,zz,.16,2.20,.16,M.wood);roundBox(xx,.48,zz,.29,.42,.30,M.stone,.02);}
      for(const y of [.65,2.43]){for(const z of [-1.32,1.32])box(0,y,z,3.16,.13,.10,M.wood);for(const x of [-1.6,1.6])box(x,y,0,.1,.13,2.64,M.wood);}
      for(const z of [-1.325,1.325]){beam([-1.57,2.49,z],[0,4.10,z],.065,M.wood);beam([1.57,2.49,z],[0,4.10,z],.065,M.wood);box(0,3.58,z,.11,.9,.12,M.wood);}
      for(const x of [-.35,.98])box(x,1.46,1.337,.10,1.84,.10,M.wood);
      for(const z of [-.8,.92])box(1.615,1.51,z,.10,1.75,.10,M.wood);
      // A real side dormer, embedded into the right roof slope.
      part='dormer';box(1.13,3.10,-.08,.97,.69,.75,M.plaster);profile([[-.375,0],[.375,0],[0,.47]],.98,1.62,3.40,-.08,M.plaster,-Math.PI/2);roof(1.18,3.36,-.08,.48,.49,1.08,Math.PI/2,true);
      windowArch(1.684,2.98,-.08,.46,.72,Math.PI/2,false);
      part='front-door'; arch(.43,.36,1.325,.84,1.63,.1,M.dark);arch(.43,.40,1.43,.72,1.51,.025,M.wood);ring(.43,.34,1.44,1.03,1.84,.115,M.stone);ring(.43,.40,1.51,.77,1.53,.038,M.honey);
      arch(.43,1.15,1.488,.5,.64,.02,M.glass);box(.43,1.38,1.53,.024,.45,.025,M.honey);box(.43,1.33,1.54,.48,.025,.025,M.honey);
      for(let j=0;j<5;j++)box(.15+j*.14,.78,1.488,.128,.70,.025,j%2?M.honey:M.wood);
      for(const y of [.52,1.08])box(.43,y,1.525,.65,.046,.024,M.dark);
      add(new THREE.TorusGeometry(.065,.014,5,14),M.gold,.64,.98,1.58);sphere(.64,1.05,1.56,.035,M.gold);beam([.16,.90,1.565],[.16,1.07,1.565],.018,M.gold);
      part='front-window';windowArch(-.98,.89,1.33,.65,1.12);flowers(-.98,.77,1.53,.84);
      part='upper-door';windowArch(0,2.64,1.332,.72,1.10,0,true);
      part='side-window';windowArch(1.57,.90,.43,.68,1.15,Math.PI/2);flowers(1.75,.77,.43,.83,Math.PI/2);
      part='rear-window';windowArch(0,1.11,-1.31,.73,1.03,Math.PI,false);
      part='balcony';
      for(let j=0;j<9;j++)box(-.94+j*.235,2.84,1.71,.055,.38,.06,M.wood);
      for(const x of [-1.04,1.04]){box(x,2.91,1.70,.10,.57,.11,M.wood);add(new THREE.ConeGeometry(.10,.13,4),M.gold,x,3.25,1.7,0,Math.PI/4);for(const z of [1.42,1.69])box(x,3.04,z,.08,.08,.30,M.honey);beam([x,2.50,1.70],[x,2.18,1.34],.052,M.wood);}
      box(0,2.72,1.71,2.15,.07,.08,M.dark);flowers(-.53,2.98,1.69,.68);
      part='lantern';beam([1.10,1.98,1.34],[1.10,1.98,1.62],.029,M.dark);beam([1.1,1.98,1.62],[1.10,1.82,1.62],.02,M.gold);box(1.10,1.65,1.62,.16,.25,.16,M.glass);
      for(const x of [-.105,.105])for(const z of [-.105,.105])beam([1.1+x,1.49,1.62+z],[1.1+x,1.81,1.62+z],.012,M.gold);
      for(const y of [1.49,1.81])box(1.10,y,1.62,.26,.038,.26,M.gold);add(new THREE.ConeGeometry(.20,.14,4),M.gold,1.10,1.90,1.62,0,Math.PI/4);sphere(1.1,1.43,1.62,.04,M.gold);
      part='masonry';
      for(let row=0;row<2;row++)for(let j=0;j<9;j++){const x=-1.51+j*.377+(row%2)*.07;if(x>1.6)continue;box(x,.12+row*.15,1.475,.35,.137,.018,(j+row)%3?M.stone:M.stone2);}
      for(const side of [-1,1])for(let j=0;j<7;j++)box(side*1.711,.17,-1.20+j*.39,.018,.26,.365,j%3?M.stone:M.stone2);
      for(let row=0;row<5;row++){const y=3.04+row*.225;box(1.231,y,-.78,.018,.014,.44,M.stone2);box(1.01,y,-.552,.44,.014,.018,M.stone2);box(1.01+(row%2?.10:-.10),y+.10,-.552,.012,.19,.02,M.stone2);}
    }
    for(const bucket of buckets.values()){
      let count=0;for(const q of bucket.geos)count+=q.attributes.position.count;
      const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2);let off=0;
      for(const q of bucket.geos){const p=q.attributes.position,n=q.attributes.normal,u=q.attributes.uv;positions.set(p.array,off*3);if(n)normals.set(n.array,off*3);if(u)uvs.set(u.array,off*2);off+=p.count;q.dispose();}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,bucket.material);mesh.name=bucket.name+'-'+Object.keys(M).find(k=>M[k]===bucket.material);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    }
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
