/* 潮汐小島 · 程式化模型（img2threejs 重建）：岳的觀測小屋 earth_home；正面 +Z，海軍藍石板屋頂、木露台與百葉氣象箱。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['earth_home'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'earth-home';
    const M = {
      ivory: kit.mat('#efe3cd', { roughness: .91 }, 'stone'),
      stone: kit.mat('#f7ecd8', { roughness: .88 }, 'stone'),
      shadowStone: kit.mat('#d8c8ad', { roughness: .94 }, 'stone'),
      mortar: kit.mat('#c8b69a', { roughness: .97 }),
      oak: kit.mat('#92623d', { roughness:.8 }, 'wood'),
      honey: kit.mat('#b17b46', { roughness:.8 }, 'wood'),
      dark: kit.mat('#66432c', { roughness:.8 }, 'wood'),
      slate: kit.mat('#3c507e', { roughness: .69 }, 'roof'),
      slateLight: kit.mat('#4b6395', { roughness: .69 }, 'roof'),
      slateDark: kit.mat('#2b3e65', { roughness: .74 }, 'roof'),
      brass: kit.mat('#d4a64c', { roughness: .4, metalness: 0.72 },'metal'),
      brassLight: kit.mat('#edc76a', { roughness: .4, metalness: 0.68 },'metal'),
      glass: kit.win(),
      leaf: kit.mat('#637b3d', { roughness: .94 }),
      leafLight: kit.mat('#84974c', { roughness: .92 }),
      pink: kit.mat('#dc8391', { roughness: .87 }),
      cream: kit.mat('#f3dfa9', { roughness: .88 }),
      white: kit.mat('#f4efe2', { roughness: .85 }),
      black: kit.mat('#273540', { roughness: .82 }),
      lens: kit.mat('#163a55', { roughness: .17, metalness: .20 }),
      steam: kit.mat('#f4eee2', { roughness: 1, transparent: true, opacity: .52 })
    };
    // Static geometry is batched inside each named architectural assembly.
    const batches = new Map(); let part = 'stone-shell';
    function add(geo, mat, x=0,y=0,z=0,rx=0,ry=0,rz=0) {
      const q = geo.index ? geo.toNonIndexed() : geo.clone(); geo.dispose();
      q.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
      if (!q.attributes.normal) q.computeVertexNormals();
      const key=part+'|'+mat.uuid;
      if(!batches.has(key))batches.set(key,{part,mat,geos:[]});batches.get(key).geos.push(q);
    }
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0) {add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
    function rounded(x,y,z,w,h,d,m,r=.018,ry=0) {
      r=Math.min(r,w*.16,h*.16,d*.16);const s=new THREE.Shape(),hw=w/2-r,hh=h/2-r,a=hw-r,b=hh-r;
      s.moveTo(-a,-hh);s.lineTo(a,-hh);s.quadraticCurveTo(hw,-hh,hw,-b);s.lineTo(hw,b);s.quadraticCurveTo(hw,hh,a,hh);s.lineTo(-a,hh);s.quadraticCurveTo(-hw,hh,-hw,b);s.lineTo(-hw,-b);s.quadraticCurveTo(-hw,-hh,-a,-hh);
      add(new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:2}),m,x,y,z-d/2+r,0,ry);
    }
    function beam(a,b,r,m,r2=r,n=6) {const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),q=new THREE.CylinderGeometry(r2,r,v.length(),n,1);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));add(q,m,...A.add(B).multiplyScalar(.5).toArray());}
    function sphere(x,y,z,r,m,sx=1,sy=1,sz=1,n=7) {const q=new THREE.SphereGeometry(r,n,5);q.scale(sx,sy,sz);add(q,m,x,y,z);}
    function profile(points,depth,x,y,z,m,ry=0,bevel=0) {const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();add(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:10,steps:1}),m,x,y,z,0,ry);}
    function at(x,y,z,u,v,d,ry=0) {return [x+u*Math.cos(ry)+d*Math.sin(ry),y+v,z-u*Math.sin(ry)+d*Math.cos(ry)];}
    function lbox(x,y,z,u,v,d,w,h,dep,m,ry=0) {box(...at(x,y,z,u,v,d,ry),w,h,dep,m,0,ry);}
    function archShape(w,h) {const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();return s;}
    function arch(x,y,z,w,h,d,m,ry=0) {add(new THREE.ExtrudeGeometry(archShape(w,h),{depth:d,bevelEnabled:false,curveSegments:12,steps:1}),m,x,y,z,0,ry);}
    function archRing(x,y,z,w,h,t,m,ry=0) {const s=archShape(w,h),hole=archShape(w-2*t,h-2*t);s.holes.push(new THREE.Path(hole.getPoints(24).map(p=>new THREE.Vector2(p.x,p.y+t)).reverse()));add(new THREE.ExtrudeGeometry(s,{depth:.075,bevelEnabled:true,bevelThickness:.007,bevelSize:.007,bevelSegments:1,curveSegments:12,steps:1}),m,x,y,z,0,ry);}
    function quad(a,b,c,d,m,th=.035) {
      const pts=[a,b,c,d,...[a,b,c,d].map(v=>[v[0],v[1]-th,v[2]])],P=[];
      for(const tri of [[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]])for(const k of tri)P.push(...pts[k]);
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(P,3));q.computeVertexNormals();add(q,m);
    }
    function cap(x,y,z,s=1) {
      rounded(x,y,z,.20*s,.20*s,.20*s,M.brass,.018*s);
      add(new THREE.ConeGeometry(.145*s,.13*s,4),M.brassLight,x,y+.16*s,z,0,Math.PI/4);
      sphere(x,y-.012*s,z+.108*s,.026*s,M.brassLight,1,1,.45,6);
    }
    function roof(cx,cy,cz,left,right,rise,len,rows=8) {
      const ridge=cy+rise,back=cz-len/2,front=cz+len/2;
      for(const side of [-1,1]) {
        const hw=side<0?left:right;
        const surf=t=>ridge-rise*t+.035*Math.pow(t,8);
        const tile=(t0,t1,z0,z1,m,up)=>{
          let a=[cx,0,0];const x0=cx+side*hw*t0,x1=cx+side*hw*t1;
          const q=[[x0,surf(t0)+up,z0],[x1,surf(t1)+up,z0],[x1,surf(t1)+up,z1],[x0,surf(t0)+up,z1]];
          if(side>0)q.reverse();quad(...q,m,.035);
        };
        tile(0,1,back,front,M.slateDark,0);
        for(let row=0;row<rows;row++) {
          const pitch=len/11,shift=(row%2)*pitch/2;
          for(let j=-1;j<12;j++) {const z0=Math.max(back,back+j*pitch+shift),z1=Math.min(front,back+(j+1)*pitch+shift-.008);if(z1-z0<.03)continue;tile(row/rows,Math.min(1.008,(row+1.10)/rows),z0,z1,(j+row)%7===0?M.slateLight:(j+2*row)%11===0?M.slateDark:M.slate,.036+(rows-row)*.004);}
        }
        for(const z of [back-.014,front+.014]) {
          beam([cx,ridge+.035,z],[cx+side*hw,cy+.035,z],.068,M.dark);
          beam([cx,ridge+.10,z+.02],[cx+side*hw,cy+.10,z+.02],.026,M.brass);
        }
        box(cx+side*hw,cy+.01,cz,.13,.16,len+.08,M.oak);
        box(cx+side*hw,cy+.10,cz,.045,.033,len+.10,M.brass);
      }
      beam([cx,ridge+.09,back-.02],[cx,ridge+.09,front+.02],.043,M.brass, .043,8);
      cap(cx,ridge+.12,front+.005,.95);cap(cx,ridge+.12,back+.005,.80);
    }
    function windowArch(x,y,z,w,h,ry=0) {
      arch(x,y,z,w+.13,h+.08,.045,M.dark,ry);
      arch(...at(x,y,z,0,.065,.054,ry),w-.09,h-.12,.025,M.glass,ry);
      archRing(...at(x,y,z,0,-.04,.075,ry),w+.28,h+.20,.12,M.stone,ry);
      archRing(...at(x,y,z,0,.02,.16,ry),w+.025,h+.015,.048,M.honey,ry);
      for(const u of [-w*.24,0,w*.24]){const top=h-w/2+Math.sqrt(Math.max(0,(w*.44)**2-u*u));beam(at(x,y,z,u,.10,.205,ry),at(x,y,z,u,top,.205,ry),u===0?.023:.014,M.oak);}
      lbox(x,y,z,0,h*.43,.21,w-.06,.045,.04,M.oak,ry);
      for(let i=0;i<9;i++){const a=i*Math.PI/8,pt=at(x,y,z,Math.cos(a)*(w/2+.078),h-w/2+.025+Math.sin(a)*(w/2+.078),.17,ry);box(...pt,.024,.12,.045,M.shadowStone,0,ry,a-Math.PI/2);}
      lbox(x,y,z,0,-.065,.10,w+.30,.11,.25,M.stone,ry);
    }
    function flowers(x,y,z,w,ry=0) {
      const A=(u,v,d)=>at(x,y,z,u,v,d,ry);
      box(...A(0,0,0),w,.20,.29,M.oak,0,ry);box(...A(0,.10,.146),w+.04,.05,.05,M.honey,0,ry);
      for(const u of [-w*.39,w*.39]) {lbox(x,y,z,u,0,.16,.055,.26,.055,M.brass,ry);sphere(...A(u,.02,.195),.022,M.brassLight);beam(A(u,-.06,-.04),A(u,-.28,-.16),.035,M.dark);}
      for(let i=0;i<8;i++) {
        const u=-w*.42+i*w*.12,v=.17+.028*Math.sin(i*2.3);sphere(...A(u,v,.02),.10,i%2?M.leaf:M.leafLight,1,.65,1.15);
        sphere(...A(u+.026,v+.05,.11),.072,M.leaf,1.2,.5,.6);
        if(i<7){const fv=v+.07;for(let k=0;k<5;k++){const a=k*Math.PI*2/5;sphere(...A(u+Math.cos(a)*.045,fv+Math.sin(a)*.043,.15),.031,i%3?M.pink:M.cream,1,1,.58,6);}sphere(...A(u,fv,.176),.022,M.brassLight,1,1,.45,6);}
      }
    }
    // Blockout: footprint and the two steep gables establish the reference silhouette.
    box(0,.19,0,3.42,.38,2.94,M.mortar);
    box(0,1.43,0,3.12,2.10,2.60,M.ivory);
    profile([[-1.56,0],[1.56,0],[-.28,1.55]],2.60,0,2.44,-1.30,M.ivory);
    part='main-roof';roof(-.28,2.40,0,1.56,2.12,1.58,3.08);
    part='porch';roof(.43,2.02,1.43,.95,.95,.91,1.12,5);
    // Structural pass: staggered masonry foundation, dressed joints and timber sockets.
    part='masonry';
    for(let row=0;row<2;row++) {
      const h=.187,y=.098+row*.188;
      for(let j=0;j<10;j++) {const x=-1.58+j*.35+(row%2)*.075;if(x>1.59)continue;for(const z of [-1.48,1.48])rounded(x,y,z,.337,h,.045,(j+row)%4?M.stone:M.shadowStone,.008);}
      for(let j=0;j<8;j++)for(const x of [-1.71,1.71])box(x,y,-1.26+j*.36,.045,h,.344,(j+row)%3?M.stone:M.shadowStone);
    }
    for(const x of [-1.50,1.50])for(const z of [-1.25,1.25]) {
      rounded(x,.51,z,.30,.30,.30,M.stone,.018);rounded(x,.29,z,.41,.22,.41,M.stone,.02);
    }
    // Broad wall blocks are recessed behind the continuous timber frame.
    for(let row=0;row<6;row++) {
      const yy=.58+row*.30;
      for(let j=0;j<9;j++){const xx=-1.40+j*.35+(row%2)*.12;if(xx>1.47)continue;box(xx,yy,1.307,.33,.28,.026,(j+row)%5?M.ivory:M.stone);}
      for(let j=0;j<7;j++){const zz=-1.10+j*.35+(row%2)*.08;box(1.568,yy,zz,.026,.278,.33,(j+row)%6?M.ivory:M.stone);}
    }
    part='timber-frame';
    for(const x of [-1.50,1.50])for(const z of [-1.25,1.25])rounded(x,1.46,z,.17,1.91,.17,M.oak,.012);
    for(const y of [.46,2.37]) {
      for(const z of [-1.34,1.34])box(0,y,z,3.22,.15,.13,M.oak);
      for(const x of [-1.61,1.61])box(x,y,0,.13,.15,2.73,M.oak);
    }
    for(const z of [-1.345,1.345]) {
      beam([-1.54,2.40,z],[-.28,3.95,z],.081,M.oak);beam([1.54,2.40,z],[-.28,3.95,z],.081,M.oak);
      box(-.28,3.65,z,.13,.55,.13,M.oak);box(-1.00,2.79,z,.13,.65,.13,M.oak);box(.60,2.81,z,.13,.69,.13,M.oak);
      box(0,2.48,z,3.16,.17,.14,M.honey);
    }
    for(const x of [-.45,1.31]) {
      rounded(x,.30,1.62,.40,.24,.40,M.stone,.02);rounded(x,.56,1.62,.30,.28,.30,M.stone,.02);
      rounded(x,1.34,1.62,.18,1.35,.19,M.oak,.01);
      box(x,1.98,1.62,.29,.15,.30,M.honey);beam([x,1.97,1.62],[x+(x<0?.23:-.23),1.73,1.62],.061,M.oak);
      beam([x,1.97,1.62],[x,1.70,1.36],.061,M.oak);
    }
    profile([[-.78,0],[.78,0],[0,.77]],.12,.43,2.02,1.83,M.ivory);
    beam([-.45,2.05,1.98],[.43,2.90,1.98],.082,M.oak);beam([1.31,2.05,1.98],[.43,2.90,1.98],.082,M.oak);
    box(.43,2.63,1.98,.13,.53,.13,M.oak);box(.43,2.04,1.98,1.71,.14,.14,M.honey);
    // Arched door and window system. All glazing uses the live game window material.
    part='front-window';windowArch(-.96,.80,1.325,.75,1.22);
    part='side-window';windowArch(1.583,.93,.40,.66,1.12,Math.PI/2);windowArch(-1.583,1.03,-.20,.60,1.0,-Math.PI/2);windowArch(.20,1.02,-1.325,.67,1.05,Math.PI);
    part='round-window';
    add(new THREE.CylinderGeometry(.335,.335,.055,32),M.dark,-.28,3.13,1.36,Math.PI/2);
    add(new THREE.CylinderGeometry(.274,.274,.06,28),M.glass,-.28,3.13,1.398,Math.PI/2);
    add(new THREE.TorusGeometry(.354,.067,6,32),M.stone,-.28,3.13,1.435);
    add(new THREE.TorusGeometry(.284,.025,5,28),M.honey,-.28,3.13,1.479);
    box(-.28,3.13,1.507,.036,.54,.039,M.oak);box(-.28,3.13,1.507,.54,.037,.039,M.oak);
    for(let j=0;j<12;j++){const a=j*Math.PI/6;box(-.28+Math.cos(a)*.354,3.13+Math.sin(a)*.354,1.49,.018,.105,.02,M.shadowStone,0,0,a-Math.PI/2);}
    part='door';
    arch(.43,.39,1.34,.84,1.66,.095,M.dark);arch(.43,.42,1.445,.72,1.53,.025,M.oak);
    archRing(.43,.365,1.44,1.09,1.88,.14,M.stone);archRing(.43,.42,1.535,.77,1.55,.045,M.honey);
    for(let j=0;j<5;j++)box(.15+j*.14,.86,1.486,.129,.85,.026,j%2?M.honey:M.oak);
    arch(.43,1.21,1.49,.48,.66,.02,M.glass);archRing(.43,1.19,1.53,.54,.72,.041,M.dark);
    box(.43,1.52,1.576,.026,.53,.03,M.honey);box(.43,1.51,1.576,.48,.028,.03,M.honey);
    for(const y of [.60,1.04])box(.43,y,1.55,.67,.045,.03,M.dark);
    add(new THREE.TorusGeometry(.069,.014,6,16),M.brassLight,.62,1.00,1.59);sphere(.62,1.075,1.58,.037,M.brass,1,1,.5);rounded(.21,1.00,1.57,.05,.23,.025,M.brass,.006);
    part='steps';
    rounded(.43,.075,2.08,1.32,.15,.55,M.stone,.018);rounded(.43,.215,1.85,1.25,.15,.55,M.stone,.018);rounded(.43,.355,1.61,1.18,.15,.52,M.stone,.018);
    for(const y of [.14,.28,.42])for(let j=0;j<4;j++)box(-.02+j*.30,y,2.36-(y-.14)*1.7,.014,.015,.03,M.shadowStone);
    // Roof dormer is a solid embedded volume opening onto a genuine observation platform.
    part='dormer';
    box(.59,3.24,-.35,.73,.78,.72,M.ivory);profile([[-.36,0],[.36,0],[0,.43]],.76,.60,3.53,-.72,M.ivory);
    roof(.60,3.47,-.34,.49,.49,.53,.89,3);windowArch(.60,3.00,.046,.37,.79);
    part='deck';
    box(1.14,3.15,-.13,1.45,.17,1.51,M.dark);
    for(let j=0;j<8;j++)box(.51+j*.18,3.255,-.13,.171,.06,1.49,j%3?M.honey:M.oak);
    const x0=.43,x1=1.86,z0=-.88,z1=.62;
    for(const z of [z0,z1]) {
      box((x0+x1)/2,3.70,z,x1-x0+.05,.105,.10,M.honey);box((x0+x1)/2,3.37,z,x1-x0,.07,.07,M.oak);
      for(let j=0;j<6;j++)box(x0+.11+j*.24,3.52,z,.055,.35,.055,M.oak);
    }
    box(x1,3.70,(z0+z1)/2,.10,.105,z1-z0,M.honey);box(x1,3.37,(z0+z1)/2,.07,.07,z1-z0,M.oak);
    for(let j=0;j<6;j++)box(x1,3.52,z0+.12+j*.25,.055,.35,.055,M.oak);
    for(const x of [x0,x1])for(const z of [z0,z1]){box(x,3.53,z,.13,.61,.13,M.oak);cap(x,3.82,z,.75);}
    for(const z of [-.72,.44]) {box(1.38,3.03,z,.80,.15,.14,M.oak);beam([1.82,3.08,z],[1.49,2.69,z],.09,M.oak);box(1.78,3.11,z,.19,.18,.20,M.brass);}
    // Brass refractor: optical axis leans skyward, with three separated tripod feet.
    part='telescope';
    const tc=[1.15,3.93,-.10],feet=[[.76,3.29,.19],[1.55,3.29,.15],[1.12,3.29,-.55]];
    for(const f of feet){beam(f,tc,.042,M.dark,.034,6);beam([f[0],3.31,f[2]],[f[0]+(tc[0]-f[0])*.15,3.40,f[2]+(tc[2]-f[2])*.15],.046,M.brass);}
    for(let j=0;j<3;j++){const a=feet[j],b=feet[(j+1)%3];beam([a[0]+(tc[0]-a[0])*.48,3.60,a[2]+(tc[2]-a[2])*.48],[b[0]+(tc[0]-b[0])*.48,3.60,b[2]+(tc[2]-b[2])*.48],.014,M.brass);}
    add(new THREE.CylinderGeometry(.10,.10,.075,12),M.brass,tc[0],3.93,tc[2]);sphere(tc[0],4.035,tc[2],.071,M.brass);
    const axis=new THREE.Vector3(.66,.48,.20).normalize(),mid=new THREE.Vector3(1.18,4.18,-.08);
    function barrel(offset,length,r1,r2,mat){const q=new THREE.CylinderGeometry(r2,r1,length,16,1);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis));add(q,mat,...mid.clone().addScaledVector(axis,offset).toArray());}
    barrel(0,.74,.081,.108,M.brass);barrel(-.37,.20,.047,.047,M.oak);barrel(-.49,.055,.059,.059,M.brassLight);
    for(const offset of [-.24,.14,.36])barrel(offset,.05,offset===.36?.129:.102,offset===.36?.129:.102,M.brassLight);
    barrel(.405,.075,.133,.133,M.brass);barrel(.448,.012,.102,.102,M.black);barrel(.455,.010,.085,.085,M.lens);
    beam([1.10,4.09,-.08],[1.10,4.19,-.08],.035,M.brass);
    // Chimney mortar, gold vent and static steam are intentionally restrained at game scale.
    part='chimney';
    rounded(-1.03,3.64,-.78,.43,1.16,.46,M.ivory,.018);rounded(-1.03,4.24,-.78,.57,.17,.58,M.stone,.02);box(-1.03,4.34,-.78,.36,.04,.37,M.dark);
    for(let row=0;row<5;row++){const yy=3.21+row*.21;box(-1.03,yy,-.54,.44,.016,.015,M.shadowStone);box(-.80,yy,-.78,.015,.016,.46,M.shadowStone);box(-1.03+(row%2?.10:-.10),yy+.10,-.54,.015,.18,.015,M.shadowStone);}
    add(new THREE.ConeGeometry(.21,.15,4),M.brass,-1.03,4.43,-.78,0,Math.PI/4);add(new THREE.CylinderGeometry(.10,.10,.09,8),M.brass,-1.03,4.52,-.78);
    part='steam';sphere(-1.02,4.67,-.78,.13,M.steam,.85,1.2,.85);sphere(-.95,4.86,-.79,.17,M.steam,1,1.05,.9);sphere(-.80,5.04,-.82,.19,M.steam,1.2,.8,.9);
    part='flowers';flowers(-.96,.69,1.55,.98);flowers(1.72,.81,.40,.82,Math.PI/2);
    // Pendant lantern: four brass corner stays and a warm kit.win core.
    part='lantern';
    beam([1.08,1.97,1.64],[1.08,1.97,1.90],.025,M.dark);beam([1.08,1.97,1.90],[1.08,1.81,1.90],.018,M.brass);
    box(1.08,1.60,1.90,.15,.25,.15,M.glass);
    for(const u of [-.105,.105])for(const d of [-.105,.105])beam([1.08+u,1.43,1.90+d],[1.08+u,1.77,1.90+d],.014,M.brass);
    for(const yy of [1.43,1.77])box(1.08,yy,1.90,.25,.035,.25,M.brass);add(new THREE.ConeGeometry(.19,.13,4),M.brass,1.08,1.85,1.90,0,Math.PI/4);sphere(1.08,1.39,1.90,.035,M.brassLight);
    // White Stevenson screen, with open shadowed louver banks rather than a plain white box.
    part='instrument';
    const sx=1.45,sz=1.96;
    for(const x of [-.22,.22])for(const z of [-.20,.20]){beam([sx+x*1.12,.03,sz+z*1.12],[sx+x,.54,sz+z],.038,M.oak,.035,4);box(sx+x,.51,sz+z,.09,.07,.09,M.brass);}
    box(sx,.56,sz,.58,.08,.54,M.white);box(sx,.83,sz,.41,.48,.37,M.shadowStone);
    for(const x of [-.25,.25])for(const z of [-.235,.235])box(sx+x,.83,sz+z,.055,.50,.055,M.white);
    for(let j=0;j<7;j++) {
      const yy=.64+j*.061;
      for(const d of [-1,1]) {box(sx,yy,sz+d*.235,.45,.039,.07,M.white,-d*.28);box(sx+d*.25,yy,sz,.07,.039,.41,M.white,0,0,d*.28);}
    }
    box(sx,1.10,sz,.61,.075,.57,M.white);profile([[-.31,0],[.31,0],[0,.19]],.60,sx,1.12,sz-.30,M.white);
    for(const side of [-1,1]){const a=Math.atan(.19/.33);box(sx+side*.165,1.21,sz,.381,.045,.65,M.slate,0,0,-side*a);beam([sx,1.32,sz-.33],[sx,1.32,sz+.33],.018,M.white);}
    // A small chalk weather board is modeled; it does not use the game's sign/mailbox anchor.
    part='chalkboard';
    const bx=-1.05,bz=1.97;
    box(bx,.46,bz,.54,.65,.055,M.black,-.13);for(const x of [-.30,.30])box(bx+x,.43,bz,.065,.86,.085,M.oak,-.13);
    for(const yy of [.11,.82])box(bx,yy,bz+(yy-.46)*.13,.66,.065,.085,M.honey,-.13);
    for(const x of [-.30,.30])beam([bx+x,.77,bz-.02],[bx+x,.05,bz-.28],.031,M.dark);
    function cloud(cx,cy,scale){const points=[[-.12,0],[-.15,.04],[-.14,.09],[-.09,.11],[-.07,.17],[0,.19],[.06,.15],[.12,.14],[.15,.09],[.15,.03],[.11,0],[-.12,0]];for(let j=1;j<points.length;j++)beam([bx+cx+points[j-1][0]*scale,cy+points[j-1][1]*scale,bz+.052],[bx+cx+points[j][0]*scale,cy+points[j][1]*scale,bz+.052],.008,M.white,.008,4);}
    cloud(.04,.54,.75);cloud(-.08,.36,.52);cloud(.07,.20,.65);
    // Faceted end shoes and small metal rivets provide a few readable fantasy accents.
    part='gold-caps';for(const x of [-1.80,1.79])cap(x,2.47,1.55,.72);for(const x of [-.48,1.34])cap(x,2.08,1.99,.72);
    for(const x of [-1.50,1.50])for(const z of [-1.25,1.25])box(x,2.25,z,.23,.16,.23,M.dark);
    // Emit UV-preserving batches, retaining semantic assembly names for inspection.
    for(const b of batches.values()) {
      let count=0;for(const q of b.geos)count+=q.attributes.position.count;
      const P=new Float32Array(count*3),N=new Float32Array(count*3),U=new Float32Array(count*2);let off=0;
      for(const q of b.geos){const p=q.attributes.position,n=q.attributes.normal,u=q.attributes.uv;P.set(p.array,off*3);N.set(n.array,off*3);if(u)U.set(u.array,off*2);off+=p.count;q.dispose();}
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.BufferAttribute(P,3));q.setAttribute('normal',new THREE.BufferAttribute(N,3));q.setAttribute('uv',new THREE.BufferAttribute(U,2));q.computeBoundingSphere();
      const m=new THREE.Mesh(q,b.mat);m.name='earth-'+b.part+'-'+Object.keys(M).find(k=>M[k]===b.mat);m.castShadow=b.part!=='steam';m.receiveShadow=true;g.add(m);
    }
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
