/* 潮汐小島 · img2threejs 夢幻住宅：english。正面 +Z，公尺，純幾何與共用 kit 材質。 */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};
  I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS['home_english']=function(THREE,kit){
    const M={
      plaster: kit.mat('#fff4ee', { roughness: 0.84, metalness: 0 }, 'stone'),
      stone: kit.mat('#d9c8b6', { roughness: 0.84, metalness: 0 }, 'stone'),
      stoneShade: kit.mat('#b8a490', { roughness: 0.84, metalness: 0 }, 'stone'),
      wood: kit.mat('#b07a4a', { roughness: 0.84, metalness: 0 }, 'wall'),
      honey: kit.mat('#d6a363', { roughness: 0.84, metalness: 0 }, 'wall'),
      dark: kit.mat('#654835', { roughness: 0.84, metalness: 0 }, 'wall'),
      roof: kit.mat('#d98aa0', { roughness: 0.84, metalness: 0 }, 'roof'),
      roofShade: kit.mat('#bd708c', { roughness: 0.84, metalness: 0 }, 'roof'),
      blue: kit.mat('#8cc8ef', { roughness: 0.84, metalness: 0 }, 'wall'),
      gold: kit.mat('#d9ad59', { roughness: 0.42, metalness: 0.65 }),
      leaf: kit.mat('#6f8e62', { roughness: 0.84, metalness: 0 }),
      pink: kit.mat('#edb0c9', { roughness: 0.84, metalness: 0 }),
      lavender: kit.mat('#a695cf', { roughness: 0.84, metalness: 0 }),
      chalk: kit.mat('#30474c', { roughness: 0.84, metalness: 0 }),
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
    g.name='lexi-storybook-letter-house';
    part='foundation';box(0,.11,-.2,3.52,.42,3.05,M.stone);
    part='body';box(0,1.78,-.2,3.3,2.96,2.8,M.plaster);
    // Cross-ridge roof: concave bell eaves, continuous curved silhouette, closed end gables.
    const roofCurve=[[0,5.72],[.30,5.62],[.62,5.30],[.90,4.86],[1.12,4.32],[1.32,3.77],[1.55,3.34],[1.80,3.21]];
    function roofSample(t){const k=Math.min(roofCurve.length-2,Math.floor(t*(roofCurve.length-1))),f=t*(roofCurve.length-1)-k;return [roofCurve[k][0]*(1-f)+roofCurve[k+1][0]*f,roofCurve[k][1]*(1-f)+roofCurve[k+1][1]*f];}
    part='roof';
    for(const side of [-1,1])for(let j=0;j<roofCurve.length-1;j++){const a=roofCurve[j],b=roofCurve[j+1];quad([-1.91,a[1],-.2+side*a[0]],[1.91,a[1],-.2+side*a[0]],[1.91,b[1],-.2+side*b[0]],[-1.91,b[1],-.2+side*b[0]],M.roof,.09);}
    const innerCurve=roofCurve.filter(p=>p[0]<=1.32);
    const gable=[[-1.4,0],[1.4,0],...innerCurve.slice().reverse().map(p=>[p[0],p[1]-3.17]),...innerCurve.slice(1).map(p=>[-p[0],p[1]-3.17])];
    for(const side of [-1,1])profile(gable,.10,side*1.65,3.07,-.2,M.plaster,Math.PI/2);
    part='dormer';
    const dormerProfile=[[-1.22,0],[1.22,0],[1.18,.60],[1.02,1.18],[.75,1.65],[.35,2.03],[0,2.16],[-.35,2.03],[-.75,1.65],[-1.02,1.18],[-1.18,.60]].map(p=>[p[0],p[1]*1.18]);
    profile(dormerProfile,1.67,-.22,3.37,-.20,M.roof);
    // Small chimney belongs to the macro silhouette, not a late decorative add-on.
    part='roof-trim';box(1.13,5.38,-1.00,.40,1.45,.43,M.stone);box(1.13,6.12,-1.00,.51,.13,.54,M.stoneShade);box(1.13,6.193,-1.00,.32,.018,.33,M.dark);
    g.userData.smoke=[1.2656,6.21,-1.00];
    part='bay-window';
    const bayFoot=[[-1.55,1.18],[-.03,1.18],[.02,1.55],[-.30,1.99],[-1.26,1.99],[-1.58,1.55]];
    const bp=new THREE.Shape(bayFoot.map(p=>new THREE.Vector2(p[0],-p[1])));const bg=new THREE.ExtrudeGeometry(bp,{depth:2.03,bevelEnabled:false});bg.rotateX(-Math.PI/2);add(bg,M.blue,0,.37,0);
    part='foundation';const bayBase=new THREE.ExtrudeGeometry(bp,{depth:.47,bevelEnabled:false});bayBase.rotateX(-Math.PI/2);add(bayBase,M.stone,0,-.10,0);part='bay-window';
    // Hip lid on bay is separate from the main roof and overlaps the wall by .08m.
    quad([-1.68,2.50,1.18],[.12,2.50,1.18],[-.24,2.91,1.38],[-1.30,2.91,1.38],M.roof,.08);
    quad([.12,2.50,1.18],[.09,2.50,1.62],[-.27,2.50,2.09],[-.24,2.91,1.38],M.roof,.08);
    quad([-.27,2.50,2.09],[-1.29,2.50,2.09],[-1.30,2.91,1.38],[-.24,2.91,1.38],M.roof,.08);
    quad([-1.29,2.50,2.09],[-1.68,2.50,1.62],[-1.68,2.50,1.18],[-1.30,2.91,1.38],M.roof,.08);
    part='steps';for(let j=0;j<3;j++)box(.86,.065+j*.115,2.12-j*.22,1.15-j*.07,.13,.66,M.stone);
    g.userData.door=[.86,2.43];g.userData.cols=[[-1.68,-1.65,1.68,1.23],[-1.62,1.2,.04,2.03]];g.userData.mailbox=[1.95,2.08];
    // Exposed timber at structural seams. The side arch closes beneath the curved shell.
    part='timber-frame';
    for(const x of [-1.58,1.58])for(const z of [-1.54,1.14]){box(x,1.82,z,.15,2.94,.15,M.wood);box(x,.43,z,.25,.24,.25,M.honey);}
    for(const y of [.40,2.76,3.19]){for(const z of [-1.62,1.22])box(0,y,z,3.39,.13,.12,M.wood);for(const x of [-1.69,1.69])box(x,y,-.2,.12,.13,2.83,M.wood);}
    for(const side of [-1,1]){const x=side*1.78;for(const sign of [-1,1])tube(roofCurve.map(p=>[x,p[1]+.015,-.2+sign*p[0]]),.075,M.honey,28);box(x,4.12,-.2,.12,1.90,.12,M.wood);}
    part='roof-trim';for(const z of [-2.01,1.61])box(0,3.21,z,3.88,.15,.15,M.honey);beam([-1.93,5.78,-.2],[1.93,5.78,-.2],.052,M.honey,8);
    part='dormer';
    const dp=dormerProfile.slice(2);tube(dp.map(p=>[p[0]-.22,p[1]+3.37,1.50]),.09,M.honey,36);
    roundWindow(-.22,4.56,1.50,.81);
    part='bay-window';
    // Each panel is oriented to one genuine facet of the projecting bay.
    windowArch(-.78,.71,2.005,.83,1.62,0);
    windowArch(-.14,.71,1.79,.43,1.55,Math.PI/4);
    windowArch(-1.42,.71,1.79,.43,1.55,-Math.PI/4);
    for(const x of [-1.27,-.29])box(x,1.46,2.04,.09,1.99,.10,M.honey);
    box(-.78,.48,2.02,1.14,.15,.14,M.honey);box(-.78,2.43,2.03,1.14,.13,.13,M.honey);
    part='door';arch(.86,.35,1.23,.88,1.82,.08,M.blue);archRing(.86,.32,1.31,1.13,2.05,.12,M.wood);
    for(let j=0;j<5;j++)box(.53+j*.16,1.03,1.322,.012,1.25,.02,M.wood);
    ball(1.10,1.20,1.40,.068,M.gold,1,1,.65);box(1.10,1.20,1.365,.10,.22,.035,M.gold);
    box(.86,2.43,1.46,1.39,.16,.60,M.honey);for(const x of [.27,1.45])beam([x,2.38,1.52],[x,2.12,1.26],.056,M.wood);
    part='side-windows';windowArch(1.708,.90,-.30,.63,1.26,Math.PI/2,true);windowArch(1.708,3.42,-.20,.75,1.28,Math.PI/2,true);windowArch(-1.708,1.03,-.35,.64,1.28,-Math.PI/2,true);windowArch(-1.708,3.42,-.20,.67,1.25,-Math.PI/2,true);
    part='rear-windows';windowArch(.12,.92,-1.625,.85,1.34,Math.PI,true);
    // Back dormer embeds in the rear roof and closes the previously unseen elevation.
    box(.08,3.59,-1.40,1.16,.91,.50,M.plaster);profile([[-.58,0],[.58,0],[.40,.49],[0,.72],[-.40,.49]],.50,.08,4.00,-1.67,M.roof);
    roundWindow(.08,3.84,-1.70,.40,Math.PI);
    part='lanterns';lantern(-1.71,2.18,1.46);lantern(.23,1.92,1.47);lantern(1.88,2.58,-.80,Math.PI/2);lantern(-1.88,2.58,-.80,-Math.PI/2);lantern(1.00,2.40,-1.83,Math.PI);
    part='foundation';for(let row=0;row<2;row++)for(let j=0;j<10;j++){const x=-1.59+j*.35;box(x,.01+row*.20,-1.735,.335,.184,.04,j%3?M.stone:M.stoneShade);}
    // Real low-poly shingle courses; shared kit roof material supplies village-scale finish.
    part='roof';
    for(const side of [-1,1])for(let row=0;row<14;row++){
      const a=roofSample(row/14),b=roofSample((row+1)/14);
      for(let k=0;k<13;k++){const x0=Math.max(-1.90,-1.90+k*.304-(row%2)*.15),x1=Math.min(1.90,x0+.291);if(x1-x0<.035)continue;
        // The dormer actually occupies this part of the front roof; don't lay shingles through it.
        if(side===1&&x0<1.08&&x1>-1.48&&a[0]>.54&&b[0]<1.48)continue;
        quad([x0,a[1]+.032,-.2+side*a[0]],[x1,a[1]+.032,-.2+side*a[0]],[x1,b[1]+.032,-.2+side*b[0]],[x0,b[1]+.032,-.2+side*b[0]],(k+row*2)%9===0?M.roofShade:M.roof,.027);
      }
    }
    part='shutters';for(const side of [-1,1]){
      const x=-.22+side*1.04;box(x,4.57,1.70,.36,1.44,.075,M.blue);for(const edge of [-1,1])box(x+edge*.16,4.57,1.75,.038,1.48,.045,M.blue);for(let j=0;j<10;j++)box(x,3.94+j*.134,1.76,.28,.055,.045,M.blue);
      box(x,4.57,1.783,.025,1.32,.027,M.honey);
    }
    // Stroke glyphs are geometry, not fonts, textures, sprites or shader decals.
    const glyphs={A:[[[0,0],[.5,1],[1,0]],[[.22,.43],[.78,.43]]],B:[[[0,0],[0,1],[.67,1],[.95,.8],[.67,.52],[0,.52]],[[.15,.52],[.72,.52],[1,.26],[.72,0],[0,0]]],C:[[[.95,.86],[.72,1],[.20,1],[0,.78],[0,.20],[.20,0],[.74,0],[.96,.16]]],E:[[[1,1],[0,1],[0,0],[1,0]],[[0,.51],[.8,.51]]],H:[[[0,0],[0,1]],[[1,0],[1,1]],[[0,.5],[1,.5]]],L:[[[0,1],[0,0],[1,0]]],O:[[[.2,0],[.8,0],[1,.2],[1,.8],[.8,1],[.2,1],[0,.8],[0,.2],[.2,0]]],W:[[[0,1],[.2,0],[.5,.5],[.8,0],[1,1]]],R:[[[0,0],[0,1],[.7,1],[1,.75],[.7,.5],[0,.5]],[[.6,.5],[1,0]]],D:[[[0,0],[0,1],[.65,1],[1,.75],[1,.25],[.65,0],[0,0]]]};
    function lettering(text,x,y,z,size,m,ry=0){let off=0;for(const ch of text){for(const stroke of glyphs[ch]||[])for(let k=0;k<stroke.length-1;k++)beam(at(x,y,z,off+stroke[k][0]*size*.65,stroke[k][1]*size,0,ry),at(x,y,z,off+stroke[k+1][0]*size*.65,stroke[k+1][1]*size,0,ry),size*.052,m,5);off+=size*.9;}}
    part='bunting';tube([[-1.42,2.44,2.32],[-.78,2.33,2.35],[-.15,2.44,2.32]],.013,M.wood,24);
    for(let j=0;j<3;j++){const x=-1.32+j*.40,y=2.37+Math.abs(j-1)*.025;profile([[-.17,0],[.17,0],[0,-.35]],.025,x,y,2.34,[M.pink,M.blue,M.gold][j]);lettering('ABC'[j],x-.055,y-.22,2.38,.145,M.plaster);}
    part='mail-slots';
    for(let j=0;j<3;j++){
      const z=.58-j*.40,x=1.72;lb(x,.66,z,0,0,0,.30,.43,.17,[M.pink,M.blue,M.gold][j],Math.PI/2);lb(x,.66,z,0,.11,.10,.18,.032,.02,M.dark,Math.PI/2);lb(x,.66,z,0,-.13,.11,.23,.027,.025,M.honey,Math.PI/2);lettering('ABC'[j],x+.12,.60,z+.044,.105,M.plaster,Math.PI/2);
    }
    box(1.74,.94,.18,.08,.055,1.27,M.honey);
    part='chalkboard';
    const bx=-1.70,bz=2.22;box(bx,.60,bz,.65,.91,.07,M.wood);box(bx,.60,bz+.045,.54,.79,.025,M.chalk);
    for(const x of [bx-.28,bx+.28]){beam([x,.11,bz+.09],[x,1.09,bz-.02],.032,M.honey);beam([x,.11,bz-.30],[x,1.06,bz-.02],.029,M.wood);}
    lettering('WORD',bx-.23,.79,bz+.069,.12,M.plaster);lettering('HELLO',bx-.23,.54,bz+.069,.106,M.plaster);box(bx,.43,bz+.076,.46,.018,.012,M.honey);
    // Open-book relief under the day's word, readable at normal island distance.
    for(const side of [-1,1]){beam([bx,.20,bz+.08],[bx,.35,bz+.08],.012,M.plaster);tube([[bx,.35,bz+.08],[bx+side*.11,.38,bz+.08],[bx+side*.21,.34,bz+.08],[bx+side*.21,.20,bz+.08],[bx+side*.11,.24,bz+.08],[bx,.20,bz+.08]],.011,M.plaster,12);}
    part='flowers';flowerbox(-.78,.51,2.19,.89);flowerbox(1.72,3.29,-.20,.78,Math.PI/2);flowerbox(-1.72,3.28,-.20,.67,-Math.PI/2);flowerbox(.12,.80,-1.74,.90,Math.PI);
    for(const x of [-1.58,1.52]){
      const vine=[];for(let j=0;j<18;j++){const y=.48+j*.15,xx=x+.045*Math.sin(j*1.1);vine.push([xx,y,1.33]);ball(xx+(j%2?.06:-.06),y,1.36,.075,M.leaf,.9,.55,.5);if(j%4===0){ball(xx,y+.04,1.40,.067,M.pink,1,1,.65);ball(xx,y+.04,1.44,.028,M.honey);}}tube(vine,.018,M.leaf,28);
    }
    // Lavender clumps stay close to the facade; the gameplay mailbox socket remains empty.
    for(const p of [[-1.78,.14,1.53],[1.58,.14,1.50],[-1.65,.14,-1.59]])for(let j=0;j<6;j++){const x=p[0]+.10*Math.cos(j),z=p[2]+.10*Math.sin(j),h=.26+.10*(j%3);beam([x,.08,z],[x,h,z],.013,M.leaf);for(let k=0;k<3;k++)ball(x,h+k*.06,z,.040,M.lavender,.7,1,.7);}
    // Final tactile bands use the same palette, with recessed shadow colors and thin lips.
    part='roof-trim';for(const z of [-2.02,1.62])box(0,3.30,z,3.86,.028,.06,M.gold);
    for(const side of [-1,1])tube(roofCurve.map(p=>[side*1.795,p[1]+.065,-.2+p[0]]),.022,M.gold,28);
    part='shutters';for(const side of [-1,1])for(const y of [4.06,4.94])beam([-.22+side*.90,y,1.46],[-.22+side*.94,y,1.72],.022,M.gold);
    for(let row=0;row<6;row++){const y=4.83+row*.21;box(1.13,y,-.774,.405,.018,.012,M.stoneShade);box(1.34,y,-1.0,.012,.018,.43,M.stoneShade);const z=-1.13+(row%2)*.20;box(1.342,y+.10,z,.013,.19,.014,M.stoneShade);}
    part='bay-window';box(-.78,.57,2.055,.88,.045,.034,M.blue);box(-.78,.42,2.055,.88,.035,.034,M.honey);
    for(const x of [-1.17,-.39])box(x,.50,2.06,.035,.21,.035,M.honey);
    part='foundation';for(const z of [-1.735,1.335])for(let j=0;j<10;j++)box(-1.59+j*.35,.23,z,.018,.13,.014,M.stoneShade);
    // Wood books tucked under the bay glass suggest Lexi's reading nook without building an interior.
    part='bay-window';for(let j=0;j<6;j++)box(-1.05+j*.10,.88,2.041,.068,.20+.035*(j%3),.035,j%3===0?M.blue:j%3===1?M.pink:M.honey);

    for(const b of batches.values())for(const q of b.geos)q.scale(1.12,1,1);
    g.userData.door[0]*=1.12;g.userData.mailbox[0]*=1.12;for(const c of g.userData.cols){c[0]*=1.12;c[2]*=1.12;}for(const l of lights)l[0]*=1.12;

    return finish();
  };
})(typeof window!=='undefined'?window:globalThis);
