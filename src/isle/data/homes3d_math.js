/* 潮汐小島 · img2threejs 夢幻住宅：math。正面 +Z，公尺，純幾何與共用 kit 材質。 */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};
  I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS['home_math']=function(THREE,kit){
    const M={
      plaster: kit.mat('#f1ecf7', { roughness: 0.84, metalness: 0 }, 'plaster'),
      stone: kit.mat('#d4c8d6', { roughness: 0.84, metalness: 0 }, 'stone'),
      stoneShade: kit.mat('#b3a3bc', { roughness: 0.84, metalness: 0 }, 'stone'),
      wood: kit.mat('#ac815c', { roughness: 0.84, metalness: 0 }, 'wood'),
      honey: kit.mat('#d6b17a', { roughness: 0.84, metalness: 0 }, 'wood'),
      dark: kit.mat('#2b2d42', { roughness: 0.45, metalness: 0.6 }, 'metal'),
      roof: kit.mat('#7f86c9', { roughness: 0.84, metalness: 0 }, 'roof'),
      roofShade: kit.mat('#6872af', { roughness: 0.84, metalness: 0 }, 'roof'),
      ivory: kit.mat('#fbfbf6', { roughness: 0.84, metalness: 0 }, 'ceramic'),
      gold: kit.mat('#d9ad59', { roughness: 0.42, metalness: 0.65 }, 'metal'),
      leaf: kit.mat('#748962', { roughness: 0.84, metalness: 0 }),
      pink: kit.mat('#edb0c9', { roughness: 0.84, metalness: 0 }),
      lavender: kit.mat('#a695cf', { roughness: 0.84, metalness: 0 }),
      glass: kit.win()
    };
    // Geometry is batched by semantic assembly and shared palette material.
    const g = new THREE.Group(), batches = new Map();
    let part = 'body';
    const lights = [];
    function add(geo, mat, x=0,y=0,z=0,rx=0,ry=0,rz=0) {
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
      if(geo.index){const n=geo.toNonIndexed();geo.dispose();geo=n;}
      const key=part+'|'+mat.uuid;
      if(!batches.has(key))batches.set(key,{mat,part,geos:[]});
      batches.get(key).geos.push(geo);
    }
    function box(x,y,z,w,h,d,m,ry=0,rz=0){add(new THREE.BoxGeometry(w,h,d),m,x,y,z,0,ry,rz);}
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1){const q=new THREE.SphereGeometry(r,r<.13?6:8,r<.13?3:5);q.scale(sx,sy,sz);add(q,m,x,y,z);}
    function beam(a,b,r,m,n=6,r2=r){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);const q=new THREE.CylinderGeometry(r2,r,delta.length(),n);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));add(q,m,...A.add(B).multiplyScalar(.5).toArray());}
    function tube(pts,r,m,segments=24){add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),segments,r,5,false),m);}
    function profile(pts,depth,x,y,z,m,ry=0){const sh=new THREE.Shape(pts.map(p=>new THREE.Vector2(...p)));add(new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false,steps:1,curveSegments:8}),m,x,y,z,0,ry);}
    function archPoints(w,h){const r=w/2,cy=h-r,pts=[[-r,0],[r,0],[r,cy]];for(let j=1;j<=16;j++){const a=Math.PI*j/16;pts.push([r*Math.cos(a),cy+r*Math.sin(a)]);}return pts;}
    function arch(x,y,z,w,h,depth,m,ry=0){profile(archPoints(w,h),depth,x,y,z,m,ry);}
    function archRing(x,y,z,w,h,t,m,ry=0){const sh=new THREE.Shape(archPoints(w,h).map(p=>new THREE.Vector2(...p)));sh.holes.push(new THREE.Path(archPoints(w-2*t,h-2*t).map(p=>new THREE.Vector2(p[0],p[1]+t)).reverse()));add(new THREE.ExtrudeGeometry(sh,{depth:.055,bevelEnabled:false,steps:1}),m,x,y,z,0,ry);}
    function at(x,y,z,u,v,d,ry=0){return[x+u*Math.cos(ry)+d*Math.sin(ry),y+v,z-u*Math.sin(ry)+d*Math.cos(ry)];}
    function lb(x,y,z,u,v,d,w,h,dep,m,ry=0){box(...at(x,y,z,u,v,d,ry),w,h,dep,m,ry);}
    function disk(x,y,z,r,dep,m,ry=0,n=32){add(new THREE.CylinderGeometry(r,r,dep,n),m,x,y,z,Math.PI/2,0,-ry);}
    function ring(x,y,z,r,t,m,ry=0){add(new THREE.TorusGeometry(r,t,6,32),m,x,y,z,0,ry);}
    function quad(a,b,c,d,m,th=.035){
      const vs=[a,b,c,d,...[a,b,c,d].map(v=>[v[0],v[1]-th,v[2]])],out=[];
      // Orient the top outward; closed undersides keep roofs volumetric from every angle.
      const norm=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a)));
      const tris=[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]];
      for(const tr of tris){const ids=norm.y<0?[tr[0],tr[2],tr[1]]:tr;for(const id of ids)out.push(...vs[id]);}
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(out,3));q.computeVertexNormals();add(q,m);
    }
    function windowArch(x,y,z,w,h,ry=0,shutters=false){
      arch(x,y,z,w+.12,h+.1,.05,M.dark,ry);arch(...at(x,y,z,0,.06,.06,ry),w-.06,h-.10,.035,M.glass,ry);
      archRing(...at(x,y,z,0,-.035,.105,ry),w+.24,h+.22,.10,M.stone,ry);archRing(...at(x,y,z,0,.025,.16,ry),w+.035,h+.045,.047,M.honey,ry);
      lb(x,y,z,0,h*.48,.218,w-.04,.045,.04,M.wood,ry);lb(x,y,z,0,h*.50,.218,.043,h-.1,.04,M.wood,ry);
      lb(x,y,z,0,-.055,.12,w+.34,.10,.27,M.honey,ry);
      if(shutters){
        const saved=part;part='shutters';
        for(const side of [-1,1]){const u=side*(w*.5+.25);lb(x,y,z,u,h*.48,.10,.34,h*.93,.075,M.blue,ry);for(const edge of [-1,1])lb(x,y,z,u+edge*.145,h*.48,.15,.035,h*.97,.04,M.blue,ry);for(let j=0;j<8;j++)lb(x,y,z,u,.10+j*h*.104,.156,.275,.045,.05,M.blue,ry);}
        part=saved;
      }
    }
    function roundWindow(x,y,z,r,ry=0,rose=false){
      disk(x,y,z,r+.11,.08,M.stone,ry);disk(...at(x,y,z,0,0,.07,ry),r,.055,M.glass,ry);ring(...at(x,y,z,0,0,.12,ry),r+.035,.065,M.honey,ry);
      if(!rose){lb(x,y,z,0,0,.19,r*1.86,.045,.04,M.wood,ry);lb(x,y,z,0,0,.19,.045,r*1.86,.04,M.wood,ry);}
      else{for(let j=0;j<8;j++){const a=j*Math.PI/4,pts=[];for(let k=0;k<=16;k++){const t=Math.PI*2*k/16,rad=r*(.49+.39*Math.cos(t)),side=r*.19*Math.sin(t);pts.push(at(x,y,z,Math.sin(a)*rad+Math.cos(a)*side,Math.cos(a)*rad-Math.sin(a)*side,.19,ry));}tube(pts,.019,M.gold,24);}ring(...at(x,y,z,0,0,.20,ry),r*.20,.021,M.gold,ry);}
    }
    function lantern(x,y,z,ry=0){
      const keep=part;part='lanterns';
      lb(x,y,z,0,.09,-.16,.12,.30,.06,M.gold,ry);beam(at(x,y,z,0,.24,-.14,ry),at(x,y,z,0,.30,.02,ry),.026,M.gold);
      add(new THREE.CylinderGeometry(.115,.085,.29,6),M.glass,x,y,z);add(new THREE.CylinderGeometry(.15,.15,.045,6),M.gold,x,y-.16,z);add(new THREE.ConeGeometry(.17,.14,6),M.gold,x,y+.215,z);
      for(let j=0;j<6;j++){const a=j*Math.PI/3;beam([x+Math.sin(a)*.112,y-.15,z+Math.cos(a)*.112],[x+Math.sin(a)*.112,y+.15,z+Math.cos(a)*.112],.013,M.gold);}
      lights.push([x,y,z]);part=keep;
    }
    function flowerbox(x,y,z,w,ry=0){
      const keep=part;part='flowers';lb(x,y,z,0,0,0,w,.22,.30,M.wood,ry);lb(x,y,z,0,.12,.16,w+.05,.06,.045,M.honey,ry);
      for(let j=0;j<7;j++){const u=(j-3)*w*.13;ball(...at(x,y,z,u,.19,0,ry),.115,M.leaf,1,.7,1);const v=.26+.035*Math.sin(j*2);for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ball(...at(x,y,z,u+.045*Math.cos(a),v+.04*Math.sin(a),.13,ry),.04,j%3?M.pink:M.lavender,1,1,.55);}ball(...at(x,y,z,u,v,.16,ry),.025,M.honey);}
      for(const u of [-w*.38,w*.38]){const pts=[];for(let j=0;j<8;j++){const v=-j*.075,xx=u+.04*Math.sin(j);pts.push(at(x,y,z,xx,v,.14,ry));ball(...at(x,y,z,xx+(j%2?.04:-.04),v,.15,ry),.065,M.leaf,.8,.5,.45);}tube(pts,.012,M.leaf,14);}
      part=keep;
    }
    function finish(){
      for(const b of batches.values()){
        const n=b.geos.reduce((a,q)=>a+q.attributes.position.count,0),pos=new Float32Array(n*3),nor=new Float32Array(n*3);let off=0;
        for(const q of b.geos){pos.set(q.attributes.position.array,off);nor.set(q.attributes.normal.array,off);off+=q.attributes.position.array.length;q.dispose();}
        const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.BufferAttribute(pos,3));q.setAttribute('normal',new THREE.BufferAttribute(nor,3));
        const mesh=new THREE.Mesh(q,b.mat);mesh.name=b.part+'-'+b.mat.color.getHexString();mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.componentId=b.part;
        let group=g.children.find(c=>c.name===b.part);if(!group){group=new THREE.Group();group.name=b.part;group.userData.componentId=b.part;g.add(group);}group.add(mesh);
      }
      g.userData.lights=lights;
      g.userData.sculptRuntime={version:1,forward:'+Z',units:'m',parts:g.children.filter(c=>!c.name.startsWith('anim:')).map(c=>c.name),sockets:{entrance:g.userData.door},colliders:g.userData.cols,detachable:false};
      return g;
    }
    g.name='xian-octagonal-music-box-house';
    const A=1.65,R=A/Math.cos(Math.PI/8),theta=Math.PI/8;
    function oct(radius,h,x,y,z,m){add(new THREE.CylinderGeometry(radius,radius,h,8),m,x,y,z,0,theta);}
    function face(a,u,y,d){return[Math.sin(a)*d+Math.cos(a)*u,y,Math.cos(a)*d-Math.sin(a)*u];}
    part='foundation';oct(R+.12,.42,0,.11,0,M.stone);
    part='body';oct(R,3.94,0,2.27,0,M.plaster);
    part='roof';add(new THREE.ConeGeometry(2.17,2.22,8),M.roof,0,5.51,0,0,theta);
    part='balcony';oct(R+.26,.13,0,2.53,0,M.stone);
    part='steps';for(let j=0;j<3;j++)box(0,.06+j*.11,2.17-j*.19,1.37-j*.12,.12,.68,M.stone);
    g.userData.door=[0,2.43];g.userData.cols=[[-1.66,-1.66,1.66,1.66]];g.userData.mailbox=[1.45,2.25];
    part='corner-posts';for(let j=0;j<8;j++){const a=theta+j*Math.PI/4,x=Math.sin(a)*R,z=Math.cos(a)*R;box(x,2.28,z,.10,3.85,.10,M.dark,a);box(x,.43,z,.23,.30,.23,M.stone,a);}
    part='piano-frieze';oct(R+.08,.44,0,4.24,0,M.dark);
    const faceW=2*A*Math.tan(Math.PI/8);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;
      for(let k=0;k<7;k++){const u=(k-3)*faceW/7;box(...face(a,u,4.24,A+.105),faceW/7-.012,.39,.07,M.ivory,a);}
      for(const k of [0,1,3,4,5]){const u=(k-2.5)*faceW/7;box(...face(a,u,4.32,A+.16),.077,.24,.08,M.dark,a);}
      box(...face(a,0,4.49,A+.11),faceW+.10,.085,.14,M.honey,a);box(...face(a,0,4.0,A+.05),faceW,.08,.10,M.honey,a);
    }
    part='door';arch(0,.32,A+.018,.91,1.81,.07,M.wood);archRing(0,.29,A+.09,1.18,2.04,.13,M.stone);
    for(let j=0;j<6;j++)box(-.355+j*.142,1.07,A+.098,.012,1.29,.02,M.honey);ball(.27,1.18,A+.18,.062,M.gold);box(.27,1.18,A+.135,.10,.20,.04,M.gold);
    part='rose-window';roundWindow(0,3.31,A+.025,.64,0,true);
    part='side-windows';for(const a of [-Math.PI/4,Math.PI/4,-Math.PI/2,Math.PI/2]){const p=face(a,0,.84,A+.025);windowArch(...p,.52,1.29,a);const q=face(a,0,2.81,A+.025);windowArch(...q,.51,1.11,a);}
    part='rear-windows';for(const a of [Math.PI,Math.PI*.75,Math.PI*1.25]){windowArch(...face(a,0,.89,A+.025),.55,1.20,a);roundWindow(...face(a,0,3.29,A+.025),.36,a,true);}
    part='staff-rail';
    for(let j=0;j<8;j++){
      const a=theta+j*Math.PI/4,b=theta+(j+1)*Math.PI/4,rad=R+.24,p=[Math.sin(a)*rad,2.68,Math.cos(a)*rad],q=[Math.sin(b)*rad,2.68,Math.cos(b)*rad];
      beam(p,[p[0],3.15,p[2]],.035,M.dark,8);ball(p[0],3.18,p[2],.055,M.gold);
      for(let k=0;k<5;k++)beam([p[0],2.65+k*.10,p[2]],[q[0],2.65+k*.10,q[2]],.017,M.dark,6);
    }
    part='lanterns';for(const a of [-Math.PI/4,Math.PI/4,Math.PI*.75,Math.PI*1.25]){const side=Math.sign(Math.sin(a)),p=face(a,-side*.44,1.92,A+.26);lantern(...p,a);const q=face(a,side*.44,3.57,A+.26);lantern(...q,a);}
    part='roof-ribs';for(let j=0;j<8;j++){const a=theta+j*Math.PI/4;beam([Math.sin(a)*2.18,4.43,Math.cos(a)*2.18],[0,6.66,0],.027,M.honey,6);}
    part='foundation';for(let j=0;j<8;j++){const a=j*Math.PI/4;for(let k=0;k<4;k++)box(...face(a,(k-1.5)*faceW/4,.12,A+.12),faceW/4-.018,.30,.05,k%3?M.stone:M.stoneShade,a);}
    // Notes on all eight rail faces: the rail itself always retains five staff lines.
    part='music-notes';for(let j=0;j<8;j++){
      const a=j*Math.PI/4,d=(R+.24)*Math.cos(Math.PI/8)+.026;
      for(const u of [-.28,.22]){const head=face(a,u,2.77,d);ball(...head,.070,M.gold,1.2,.78,.48);beam(face(a,u+.065,2.77,d),face(a,u+.065,3.10,d),.015,M.gold);tube([face(a,u+.065,3.10,d),face(a,u+.17,3.05,d),face(a,u+.19,2.98,d)],.014,M.gold,10);}
    }
    part='roof';
    // Eight planar conic facets, each divided into staggered courses with subtle raised laps.
    const coneTop=6.62,coneBottom=4.40;
    for(let j=0;j<8;j++){
      const a=theta+j*Math.PI/4,b=theta+(j+1)*Math.PI/4;
      function roofP(t,u){const r=2.17*t;return[(Math.sin(a)*(1-u)+Math.sin(b)*u)*r,coneTop-(coneTop-coneBottom)*t+.021,(Math.cos(a)*(1-u)+Math.cos(b)*u)*r];}
      for(let row=1;row<11;row++)for(let k=0;k<row+1;k++){
        const u0=k/(row+1)+.004,u1=(k+1)/(row+1)-.004;
        quad(roofP(row/11,u0),roofP(row/11,u1),roofP(Math.min(1,(row+1.04)/11),u1),roofP(Math.min(1,(row+1.04)/11),u0),(j+row+k)%11===0?M.roofShade:M.roof,.018);
      }
    }
    part='flowers';for(const a of [-Math.PI/4,Math.PI/4])flowerbox(...face(a,0,.69,A+.15),.76,a);
    for(const a of [-Math.PI/4,Math.PI/4,Math.PI*.75,Math.PI*1.25])flowerbox(...face(a,0,2.59,A+.31),.52,a);
    for(const a of [Math.PI,Math.PI*.75,Math.PI*1.25])flowerbox(...face(a,0,.77,A+.12),.62,a);
    // Light, visible asymmetry in flower petals; the architecture remains exactly bilateral.
    for(const sign of [-1,1])for(let j=0;j<7;j++){const x=sign*(.93+.08*(j%3)),z=1.54+.10*Math.sin(j),y=.22+.06*(j%3);beam([x,.06,z],[x,y+.12,z],.012,M.leaf);ball(x,y,z,.09,M.leaf,1,.55,.8);for(let k=0;k<3;k++)ball(x,y+.12+k*.045,z,.038,M.lavender,.7,1,.7);}
    part='balcony';for(let j=0;j<8;j++){const a=theta+j*Math.PI/4;beam([Math.sin(a)*(R+.22),2.45,Math.cos(a)*(R+.22)],[Math.sin(a)*R,2.19,Math.cos(a)*R],.065,M.dark,6);}
    // Only this assembly rotates. Its local origin is the actual vertical spindle.
    const vaneAssembly=new THREE.Group();vaneAssembly.name='metronome';vaneAssembly.userData.componentId='metronome';
    const vane=new THREE.Group();vane.name='anim:spin:y:0.28';vane.position.set(0,6.90,0);vaneAssembly.add(vane);g.add(vaneAssembly);
    function vm(geo,mat,x,y,z,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geo,mat);m.name='metronome-'+vane.children.length;m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;vane.add(m);return m;}
    vm(new THREE.CylinderGeometry(.025,.035,.39,8),M.gold,0,-.10,0);
    vm(new THREE.SphereGeometry(.08,8,5),M.gold,0,-.08,0);
    const metShape=new THREE.Shape([new THREE.Vector2(-.14,.05),new THREE.Vector2(.14,.05),new THREE.Vector2(.075,.59),new THREE.Vector2(-.075,.59)]);
    vm(new THREE.ExtrudeGeometry(metShape,{depth:.12,bevelEnabled:false}),M.wood,0,0,-.06);
    vm(new THREE.BoxGeometry(.022,.44,.025),M.ivory,0,.31,.079);
    vm(new THREE.BoxGeometry(.023,.43,.026),M.gold,.04,.34,.10,0,0,-.34);
    vm(new THREE.BoxGeometry(.09,.07,.04),M.gold,.096,.43,.11);
    vm(new THREE.BoxGeometry(.82,.027,.027),M.gold,0,.01,0);
    for(const side of [-1,1])vm(new THREE.ConeGeometry(.075,.15,4),M.gold,side*.46,.01,0,0,0,-side*Math.PI/2);
    vm(new THREE.ConeGeometry(.07,.13,4),M.gold,0,.66,0);
    part='balcony';
    for(let j=0;j<8;j++){const a=theta+j*Math.PI/4,b=theta+(j+1)*Math.PI/4,r=R+.27;beam([Math.sin(a)*r,2.58,Math.cos(a)*r],[Math.sin(b)*r,2.58,Math.cos(b)*r],.018,M.honey,6);}
    part='rose-window';for(let j=0;j<8;j++){const a=j*Math.PI/4;ball(Math.sin(a)*.704,3.31+Math.cos(a)*.704,A+.17,.030,M.gold,1,1,.5);}
    part='piano-frieze';for(let j=0;j<8;j++){const a=j*Math.PI/4;box(...face(a,0,4.47,A+.19),faceW+.045,.028,.035,M.gold,a);}
    part='door';for(const side of [-1,1]){box(side*.56,.65,A+.13,.16,.34,.17,M.stone);box(side*.56,.83,A+.14,.20,.065,.20,M.honey);}

    return finish();
  };
})(typeof window!=='undefined'?window:globalThis);
