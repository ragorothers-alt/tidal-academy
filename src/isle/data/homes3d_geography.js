/* 潮汐小島：geography；img2threejs 分階段程式化重建。地面原點，正面 +Z，材質只透過 kit。 */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{}; I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS['home_geography']=function(THREE,kit){
    const g = new THREE.Group(); g.name = 'home-geography';
    const parts = new Map(), batches = new Map(); let part = 'foundation', parent = g;
    const M = {
      plaster: kit.mat('#f2e8d6', { roughness: .93 }, 'stone'),
      stone: kit.mat('#c8bea7', { roughness: .95 }, 'stone'),
      cream: kit.mat('#eee0bd', { roughness: .86 }, 'stone'),
      wood: kit.mat('#8b6a45', { roughness: .82 }, 'wall'),
      honey: kit.mat('#bd9561', { roughness: .76 }, 'wall'),
      dark: kit.mat('#554631', { roughness: .9 }, 'wall'),
      roof: kit.mat('#6f9a5e', { roughness: .86 }, 'roof'),
      roofLight: kit.mat('#8aa86e', { roughness: .80 }, 'roof'),
      roofDark: kit.mat('#526f45', { roughness: .87 }, 'roof'),
      brass: kit.mat('#d1a654', { roughness: .42, metalness: .62 }),
      coral: kit.mat('#de8651', { roughness: .88 }),
      leaf: kit.mat('#70834f', { roughness: .94 }),
      pink: kit.mat('#e9a8b6', { roughness: .91 }),
      lavender: kit.mat('#b3a0d0', { roughness: .91 }),
      glass: kit.win()
    };
    function assembly(id) { part=id; parent=g; }
    function add(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0) {
      let q=geo.index?geo.toNonIndexed():geo.clone();geo.dispose();
      q.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
      if(!q.attributes.normal)q.computeVertexNormals();
      const key=parent.uuid+'|'+part+'|'+mat.uuid;
      if(!batches.has(key))batches.set(key,{parent,part,mat,geos:[]});batches.get(key).geos.push(q);
    }
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0){add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
    function round(x,y,z,w,h,d,m,r=.018,ry=0) {
      r=Math.min(r,w*.18,h*.18,d*.18);const s=new THREE.Shape();
      s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
      add(new THREE.ExtrudeGeometry(s,{depth:d-r*2,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:1,curveSegments:2,steps:1}),m,x,y,z-d/2+r,0,ry);
    }
    function beam(a,b,r,m,n=6,r2=r){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);const q=new THREE.CylinderGeometry(r2,r,v.length(),n,1);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));add(q,m,...A.add(B).multiplyScalar(.5).toArray());}
    function tube(pts,r,m,n=16){add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),n,r,5,false),m);}
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1){const q=new THREE.SphereGeometry(r,7,4);q.scale(sx,sy,sz);add(q,m,x,y,z);}
    function profile(pts,dep,x,y,z,m,ry=0,bevel=0){const s=new THREE.Shape(pts.map(p=>new THREE.Vector2(...p)));s.closePath();add(new THREE.ExtrudeGeometry(s,{depth:dep,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1,curveSegments:8}),m,x,y,z,0,ry);}
    function slab(pts,m,th=.035){
      pts=pts.map(p=>p.slice());const u=new THREE.Vector3(...pts[1]).sub(new THREE.Vector3(...pts[0])),v=new THREE.Vector3(...pts[2]).sub(new THREE.Vector3(...pts[0]));if(u.cross(v).y<0)pts.reverse();
      const n=pts.length,P=[...pts,...pts.map(p=>[p[0],p[1]-th,p[2]])],a=[];
      const tri=(i,j,k)=>a.push(...P[i],...P[j],...P[k]);
      for(let i=1;i<n-1;i++){tri(0,i,i+1);tri(n,n+i+1,n+i);}for(let i=0;i<n;i++){let j=(i+1)%n;tri(i,i+n,j+n);tri(i,j+n,j);}
      const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(a,3));q.computeVertexNormals();add(q,m);
    }
    function gable(cx,ey,cz,hw,rise,len){
      for(const side of [-1,1])slab([[cx,ey+rise,cz-len/2],[cx+side*hw,ey,cz-len/2],[cx+side*hw,ey,cz+len/2],[cx,ey+rise,cz+len/2]],M.roofDark,.10);
    }
    function hip(cx,ey,cz,hw,hd,rise,ridge=.0){
      const peak=ey+rise;
      for(const side of [-1,1])slab([[cx+side*hw,ey,cz-hd],[cx+side*hw,ey,cz+hd],[cx+side*ridge,peak,cz]],M.roofDark,.09);
      for(const side of [-1,1])slab([[cx-hw,ey,cz+side*hd],[cx+hw,ey,cz+side*hd],[cx+ridge,peak,cz],[cx-ridge,peak,cz]],M.roofDark,.09);
    }
    function tileColor(row,col){return (row+col*3)%11===0?M.roofLight:(col+row*2)%17===0?M.roofDark:M.roof;}
    function gableTiles(cx,ey,cz,hw,rise,len,rows=9,cols=11){
      for(const side of [-1,1])for(let row=0;row<rows;row++){
        const a=row/rows,b=Math.min(1.006,(row+1.08)/rows),pitch=len/cols,shift=(row%2)*pitch/2;
        for(let j=-1;j<cols;j++){
          const z0=Math.max(cz-len/2,cz-len/2+j*pitch+shift),z1=Math.min(cz+len/2,cz-len/2+(j+1)*pitch+shift-.008);if(z1-z0<.04)continue;
          const P=(t,z)=>[cx+side*hw*t,ey+rise*(1-t)+.035+(1-a)*.016,z];
          slab([P(a,z0),P(a,z1),P(b-.035,z1),P(b,z1-(z1-z0)*.23),P(b,z0+(z1-z0)*.23),P(b-.035,z0)],tileColor(row,j),.035);
        }
      }
      for(const z of [cz-len/2-.015,cz+len/2+.015])for(const side of [-1,1]){beam([cx,ey+rise+.07,z],[cx+side*hw,ey+.06,z],.060,M.honey);beam([cx,ey+rise+.12,z],[cx+side*hw,ey+.11,z],.017,M.brass);}
      beam([cx,ey+rise+.06,cz-len/2-.05],[cx,ey+rise+.06,cz+len/2+.05],.065,M.roofLight,8);
    }
    function hipTiles(cx,ey,cz,hw,hd,rise,ridge=0,rows=8){
      for(const face of [0,1,2,3])for(let row=0;row<rows;row++){
        const a=row/rows,b=Math.min(.996,(row+1.07)/rows),span=(face<2?hw*(1-a)+ridge*a:hd*(1-a)),cols=Math.max(1,Math.ceil(2*span/.30));
        const sign=face%2?1:-1;
        const P=(t,u)=>face<2?[cx+(2*u-1)*(hw*(1-t)+ridge*t),ey+rise*t+.042+row*.001,cz+sign*hd*(1-t)]:[cx+sign*(hw*(1-t)+ridge*t),ey+rise*t+.042+row*.001,cz+(2*u-1)*hd*(1-t)];
        for(let j=0;j<cols;j++){const u0=j/cols+.008/cols,u1=(j+1)/cols-.008/cols;slab([P(a,u0),P(a,u1),P(b,u1),P(b,u0)],tileColor(row,j+face),.035);}
      }
      for(const x of [-1,1])for(const z of [-1,1])beam([cx+x*hw,ey+.05,cz+z*hd],[cx+x*ridge,ey+rise+.07,cz],.052,M.roofLight,6);
      if(ridge>0)beam([cx-ridge,ey+rise+.075,cz],[cx+ridge,ey+rise+.075,cz],.058,M.roofLight,8);
    }
    function stonework(cx,cz,w,d,top=.36){
      for(let row=0;row<2;row++){const yy=top-.29+row*.20;
        for(let j=0;j<Math.ceil(w/.38);j++){const xx=cx-w/2+.20+j*.38;if(xx>cx+w/2-.10)continue;for(const zz of [cz-d/2,cz+d/2])round(xx,yy,zz,.362,.185,.06,(j+row)%3?M.stone:M.cream,.008);}
        for(let j=0;j<Math.ceil(d/.39);j++){const zz=cz-d/2+.20+j*.39;if(zz>cz+d/2-.10)continue;for(const xx of [cx-w/2,cx+w/2])box(xx,yy,zz,.06,.185,.37,(j+row)%3?M.stone:M.cream);}
      }
    }
    function at(x,y,z,u,v,d,ry=0){return [x+u*Math.cos(ry)+d*Math.sin(ry),y+v,z-u*Math.sin(ry)+d*Math.cos(ry)];}
    function lb(x,y,z,u,v,d,w,h,dep,m,ry=0){box(...at(x,y,z,u,v,d,ry),w,h,dep,m,0,ry);}
    function archPts(w,h){const r=w/2,pts=[[-r,0],[r,0],[r,h-r]];for(let i=1;i<=12;i++){const a=i*Math.PI/12;pts.push([Math.cos(a)*r,h-r+Math.sin(a)*r]);}return pts;}
    function arch(x,y,z,w,h,dep,m,ry=0){profile(archPts(w,h),dep,x,y,z,m,ry,.005);}
    function archRing(x,y,z,w,h,t,m,ry=0){const s=new THREE.Shape(archPts(w,h).map(p=>new THREE.Vector2(...p)));s.holes.push(new THREE.Path(archPts(w-2*t,h-2*t).map(p=>new THREE.Vector2(p[0],p[1]+t)).reverse()));add(new THREE.ExtrudeGeometry(s,{depth:.07,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,curveSegments:8,steps:1}),m,x,y,z,0,ry);}
    function win(x,y,z,w,h,ry=0){
      arch(x,y,z,w+.13,h+.08,.05,M.dark,ry);arch(...at(x,y,z,0,.055,.056,ry),w-.04,h-.08,.025,M.glass,ry);
      archRing(...at(x,y,z,0,-.04,.09,ry),w+.24,h+.20,.12,M.honey,ry);
      lb(x,y,z,0,h*.46,.17,.033,h-.08,.04,M.wood,ry);lb(x,y,z,0,h*.48,.17,w-.03,.042,.04,M.wood,ry);
      lb(x,y,z,0,-.075,.10,w+.31,.12,.27,M.honey,ry);
    }
    function door(x,y,z){
      arch(x,y,z,1.08,1.94,.08,M.dark);arch(x,y+.02,z+.09,.9,1.8,.045,M.wood);archRing(x,y-.04,z+.11,1.20,2.08,.13,M.cream);
      for(let i=0;i<6;i++)box(x-.365+i*.146,y+.70,z+.14,.133,1.26,.018,i%2?M.wood:M.honey);
      for(const yy of [.43,1.12]){box(x,y+yy,z+.18,.76,.055,.035,M.dark);for(const dx of [-.30,.30])ball(x+dx,y+yy,z+.205,.023,M.brass,1,1,.45);}
      add(new THREE.TorusGeometry(.065,.014,5,14),M.brass,x+.25,y+.89,z+.23);ball(x+.25,y+.96,z+.22,.03,M.brass);
    }
    function lantern(x,y,z,ry=0){
      const A=(u,v,d)=>at(x,y,z,u,v,d,ry);beam(A(0,.24,-.18),A(0,.24,0),.022,M.dark);beam(A(0,.24,0),A(0,.15,0),.014,M.brass);
      box(x,y,z,.12,.23,.12,M.glass);for(const u of [-.09,.09])for(const d of [-.09,.09])beam(A(u,-.145,d),A(u,.145,d),.012,M.brass,5);
      for(const v of [-.15,.15])box(...A(0,v,0),.22,.04,.22,M.brass,0,ry);add(new THREE.ConeGeometry(.16,.11,4),M.brass,x,y+.22,z,0,ry+Math.PI/4);ball(x,y-.21,z,.025,M.brass);
    }
    function flowers(x,y,z,w,ry=0){
      const A=(u,v,d)=>at(x,y,z,u,v,d,ry);lb(x,y,z,0,0,0,w,.19,.27,M.wood,ry);lb(x,y,z,0,.10,.13,w+.04,.045,.06,M.honey,ry);
      for(let i=0;i<7;i++){const u=(i/6-.5)*w*.88,v=.17+.035*Math.sin(i*1.8);ball(...A(u,v,0),.095,M.leaf,1.2,.65,1);for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ball(...A(u+Math.cos(a)*.047,v+.045+Math.sin(a)*.047,.11),.035,i%3===0?M.cream:i%3===1?M.pink:M.lavender,1,1,.48);}ball(...A(u,v+.045,.133),.022,M.brass);}
    }
    function vine(x,y,z,h,ry=0){
      const A=(u,v,d)=>at(x,y,z,u,v,d,ry),pts=[];for(let i=0;i<=12;i++)pts.push(A(Math.sin(i*1.05)*.10,i*h/12,0));tube(pts,.014,M.leaf,20);
      for(let i=0;i<12;i++){const u=Math.sin(i*1.05)*.10,v=i*h/12;ball(...A(u+(i%2?.09:-.09),v,.035),.073,M.leaf,1.6,.65,.4);if(i%3===0)for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ball(...A(u+Math.cos(a)*.05,v+Math.sin(a)*.05,.08),.035,i%2?M.cream:M.pink,1,1,.5);}}
    }
    function finish(){
      for(const b of batches.values()){
        let target=parts.get(b.parent.uuid+'|'+b.part);if(!target){target=new THREE.Group();target.name=b.part;b.parent.add(target);parts.set(b.parent.uuid+'|'+b.part,target);}
        const len=b.geos.reduce((n,q)=>n+q.attributes.position.array.length,0),pos=new Float32Array(len),norm=new Float32Array(len);let offset=0;
        for(const q of b.geos){pos.set(q.attributes.position.array,offset);norm.set(q.attributes.normal.array,offset);offset+=q.attributes.position.array.length;q.dispose();}
        const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.BufferAttribute(pos,3));q.setAttribute('normal',new THREE.BufferAttribute(norm,3));q.computeBoundingSphere();const mesh=new THREE.Mesh(q,b.mat);mesh.name=b.part+'-surface-'+target.children.length;mesh.castShadow=true;mesh.receiveShadow=true;target.add(mesh);
      }
      if(g.userData.sculptRuntime){
        const runtime=g.userData.sculptRuntime;runtime.nodes={};runtime.meshes={};runtime.destructionGroups={};
        for(const target of parts.values()){
          const bounds=new THREE.Box3();for(const mesh of target.children){mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox);}
          const pivot=bounds.getCenter(new THREE.Vector3());target.position.copy(pivot);
          for(const mesh of target.children)mesh.geometry.translate(-pivot.x,-pivot.y,-pivot.z);
          const id=target.parent.name+'/'+target.name;
          runtime.nodes[id]={name:target.name,pivot:pivot.toArray(),parent:target.parent.name,channels:['visibility','materialState']};
          runtime.meshes[id]=target.children.map(m=>m.name);runtime.destructionGroups[id]={breakable:false,seam:'architectural assembly'};
        }
        runtime.sockets={door:[g.userData.door[0],.40,g.userData.door[1]],mailbox:[g.userData.mailbox[0],0,g.userData.mailbox[1]]};
        g.userData.lights.forEach((p,i)=>runtime.sockets['lamp-'+i]=p.slice());
        for(const [name,p] of Object.entries(runtime.sockets)){const socket=new THREE.Object3D();socket.name='socket:'+name;socket.position.set(...p);g.add(socket);}
        runtime.colliders=g.userData.cols.map((b,i)=>({id:'house-col-'+i,type:'box-xz',bounds:b.slice(),isTrigger:false}));
        runtime.animation=[];g.traverse(n=>{if(n.name.startsWith('anim:'))runtime.animation.push({name:n.name,pivot:n.position.toArray()});});
      }
      return g;
    }

    // Blockout: ground-centered footprint, asymmetrical gable and side lookout.
    assembly('foundation');box(0,.13,-.20,4.34,.42,3.20,M.stone);
    assembly('cottage-shell');box(-.70,1.51,-.20,2.80,2.42,2.80,M.plaster);
    profile([[-1.40,0],[1.40,0],[0,1.83]],2.80,-.70,2.72,-1.60,M.plaster);
    assembly('green-gables');gable(-.70,2.70,-.20,1.62,1.88,3.27);
    assembly('lookout-tower');box(1.40,2.35,-.15,1.50,4.40,1.65,M.wood);
    assembly('lookout-deck');box(1.40,4.49,-.15,1.78,.18,1.89,M.dark);
    assembly('open-canopy');hip(1.40,5.87,-.15,1.02,1.07,.87);
    for(const x of [.62,2.18])for(const z of [-.94,.64])box(x,5.20,z,.15,1.40,.15,M.wood);
    assembly('entry-steps');for(let j=0;j<3;j++)round(-.80,.055+j*.10,1.97-j*.19,1.30-j*.08,.11,.44,M.cream,.015);
    g.userData.door=[-.80,1.97];g.userData.cols=[[-2.10,-1.60,.70,1.20],[.65,-.98,2.15,.68],[.80,1.12,2.20,1.94]];g.userData.mailbox=[-1.76,2.22];
    g.userData.lights=[[-1.63,1.85,1.43],[.38,1.91,1.43],[2.26,3.31,.36],[1.39,5.56,.71],[-1.62,1.89,-1.83],[1.41,3.24,-1.15]];

    // Structure: stone joints, honest load paths, both storeys of glazing, and open rails.
    assembly('foundation');stonework(0,-.20,4.34,3.20,.37);
    assembly('timber-frame');
    for(const x of [-2.08,.66])for(const z of [-1.58,1.18]){round(x,1.53,z,.17,2.42,.17,M.wood);round(x,.42,z,.25,.22,.25,M.cream);}
    for(const y of [.40,2.68])for(const z of [-1.64,1.24])box(-.70,y,z,2.96,.15,.15,M.wood);
    for(const x of [-2.16,.76])for(const y of [.40,2.68])box(x,y,-.20,.13,.15,2.92,M.wood);
    for(const z of [-1.65,1.25]){
      beam([-2.23,2.70,z],[-.70,4.57,z],.086,M.wood);beam([.83,2.70,z],[-.70,4.57,z],.086,M.wood);
      box(-.70,4.25,z,.12,.58,.12,M.honey);box(-.70,2.88,z,2.78,.12,.11,M.honey);
      for(const x of [-2.01,.61])beam([x,2.63,z],[x+(x<0?.40:-.40),2.28,z],.052,M.wood);
    }
    for(const x of [.67,2.13])for(const z of [-.96,.66])round(x,2.42,z,.20,4.08,.20,M.honey);
    for(const y of [.44,2.40,4.36]){
      for(const z of [-1.02,.72]){box(1.40,y,z,1.74,.17,.15,M.dark);box(1.40,y+.07,z+.012,1.79,.04,.17,M.honey);}
      for(const x of [.60,2.20]){box(x,y,-.15,.16,.17,1.79,M.dark);box(x,y+.07,-.15,.18,.04,1.84,M.honey);}
    }
    for(let i=0;i<10;i++){const x=.72+i*.15;for(const z of [-.986,.686])box(x,1.42,z,.016,1.72,.018,M.dark);}
    for(let i=0;i<10;i++){const z=-.88+i*.16;box(2.166,1.42,z,.018,1.72,.016,M.dark);box(2.166,3.37,z,.018,1.70,.016,M.dark);}
    for(const z of [-1.02,.72]){beam([.76,.64,z],[1.06,1.03,z],.044,M.honey);beam([2.04,2.62,z],[1.74,2.99,z],.044,M.honey);}
    assembly('lookout-deck');
    for(let i=0;i<9;i++)box(.65+i*.188,4.605,-.15,.177,.055,1.84,i%3?M.honey:M.wood);
    for(const z of [-1.02,.72]){
      box(1.40,5.12,z,1.82,.095,.095,M.honey);box(1.40,4.76,z,1.77,.06,.06,M.wood);
      for(let j=0;j<7;j++)box(.67+j*.244,4.94,z,.045,.34,.045,M.wood);
    }
    for(const x of [.52,2.28]){box(x,5.12,-.15,.095,.095,1.82,M.honey);for(let j=0;j<7;j++)box(x,4.94,-.91+j*.25,.045,.34,.045,M.wood);}
    for(const x of [.62,2.18])for(const z of [-.94,.64]){round(x,5.16,z,.19,1.39,.19,M.honey);round(x,5.83,z,.27,.14,.27,M.honey);for(const side of [-1,1])beam([x,5.79,z],[x+side*.19,5.56,z],.044,M.wood);}
    assembly('open-canopy');for(const z of [-1.19,.89])box(1.40,5.85,z,2.12,.15,.13,M.wood);for(const x of [.38,2.42])box(x,5.85,-.15,.13,.15,2.13,M.wood);
    assembly('door');door(-.80,.30,1.23);
    assembly('arched-windows');win(-.70,3.04,1.22,.65,1.05);win(-.70,3.04,-1.62,.65,1.05,Math.PI);win(.14,.90,1.22,.42,1.12);win(-2.11,.94,-.25,.72,1.18,-Math.PI/2);win(-.83,.96,-1.62,.70,1.20,Math.PI);
    win(1.40,2.90,.69,.58,1.10);win(2.16,.93,-.16,.62,1.13,Math.PI/2);win(2.16,2.88,-.16,.62,1.12,Math.PI/2);win(1.40,2.91,-.99,.58,1.08,Math.PI);
    assembly('window-mullions');for(const y of [1.25,3.20])box(2.34,y,-.16,.024,.025,.55,M.honey);

    // Form: shingle courses and owner-specific travel equipment, all inside the shared footprint.
    assembly('roof-courses');gableTiles(-.70,2.70,-.20,1.62,1.88,3.27,10,12);hipTiles(1.40,5.87,-.15,1.02,1.07,.87,0,6);
    assembly('telescope');
    const tc=[1.25,5.23,.23];for(const f of [[.94,4.64,.45],[1.57,4.64,.45],[1.28,4.64,-.17]])beam(f,tc,.028,M.dark,6);
    beam([1.25,5.20,.23],[1.25,5.33,.23],.048,M.brass,8);
    const axis=new THREE.Vector3(-.75,.22,.48).normalize(),mid=new THREE.Vector3(1.23,5.43,.30);
    const barrel=(off,len,r,m)=>{const q=new THREE.CylinderGeometry(r,r,len,12);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis));add(q,m,...mid.clone().addScaledVector(axis,off).toArray());};
    barrel(0,.55,.075,M.brass);barrel(-.31,.15,.035,M.dark);barrel(.26,.08,.10,M.brass);barrel(.306,.015,.080,M.dark);barrel(.315,.016,.065,M.glass);barrel(-.39,.045,.048,M.brass);
    assembly('rope-ladder');
    for(const z of [-.47,.21]){tube([[2.29,.16,z],[2.33,1.70,z],[2.29,3.3,z],[2.26,4.56,z]],.024,M.cream,26);}
    for(let j=0;j<14;j++){const y=.30+j*.30;beam([2.30,y,-.50],[2.30,y,.24],.039,M.wood,7);for(const z of [-.47,.21]){add(new THREE.TorusGeometry(.052,.012,4,8),M.cream,2.30,y,z,0,0,Math.PI/2);}}
    assembly('windsock');
    beam([2.15,4.52,-.70],[2.15,6.70,-.70],.031,M.wood,8);beam([2.15,6.70,-.70],[2.15,6.70,-.45],.025,M.honey);
    tube([[2.15,6.70,-.45],[2.15,6.56,-.39],[2.15,6.48,-.34]],.012,M.cream,8);
    const wind=[[[2.15,6.48,-.34],.15],[[2.15,6.46,-.07],.135],[[2.15,6.43,.20],.11],[[2.15,6.38,.47],.08],[[2.15,6.32,.73],.044],[[2.15,6.30,.98],.015]];
    for(let i=0;i<wind.length-1;i++){const A=wind[i][0],B=wind[i+1][0],v=new THREE.Vector3(...B).sub(new THREE.Vector3(...A)),q=new THREE.CylinderGeometry(wind[i+1][1],wind[i][1],v.length(),8,1,true);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));add(q,i%2?M.cream:M.coral,...new THREE.Vector3(...A).add(new THREE.Vector3(...B)).multiplyScalar(.5).toArray());}
    add(new THREE.TorusGeometry(.15,.018,5,12),M.brass,2.15,6.48,-.34);
    assembly('compass-vane');
    beam([1.40,6.68,-.15],[1.40,7.14,-.15],.028,M.brass,8);ball(1.40,6.83,-.15,.064,M.brass);
    const vane=new THREE.Group();vane.name='anim:spin:y:0.35';vane.position.set(1.40,7.13,-.15);g.add(vane);parent=vane;
    beam([-.43,0,0],[.43,0,0],.018,M.brass);beam([0,0,-.39],[0,0,.39],.014,M.brass);
    profile([[.20,-.09],[.43,0],[.20,.09]],.025,0,0,0,M.brass);profile([[-.42,-.07],[-.30,0],[-.42,.07]],.025,0,0,0,M.brass);
    add(new THREE.TorusGeometry(.20,.018,5,16),M.brass,0,0,0,Math.PI/2);assembly('compass-vane');
    assembly('map-bunting');
    const flagPts=[[-2.00,2.58,1.42],[-1.35,2.43,1.45],[-.68,2.40,1.45],[.02,2.45,1.45],[.60,2.59,1.42]];tube(flagPts,.013,M.cream,22);
    for(let i=0;i<7;i++){const x=-1.86+i*.375,y=2.43+.11*Math.pow((i-3)/3,2);profile([[-.14,0],[.14,0],[0,-.25]],.014,x,y,1.46,i%2?M.roof:M.cream);beam([x-.05,y-.07,1.48],[x+.05,y-.14,1.48],.008,M.brass,4);beam([x-.05,y-.14,1.48],[x+.05,y-.07,1.48],.008,M.brass,4);}
    assembly('field-crates');
    function crate(x,z,w,h){box(x,h/2+.03,z,w,h,.55,M.dark);for(let j=0;j<4;j++){const y=.09+j*(h-.09)/3;box(x,y,z+.29,w+.03,.075,.055,M.honey);box(x,y,z-.29,w+.03,.075,.055,M.wood);}for(const xx of [x-w/2,x+w/2]){box(xx,.03+h/2,z+.31,.055,h,.07,M.wood);box(xx,.03+h/2,z-.31,.055,h,.07,M.wood);}beam([x-w*.4,.10,z+.33],[x+w*.4,h-.04,z+.33],.024,M.wood);for(let j=0;j<6;j++){const xx=x+Math.sin(j*2.4)*w*.29,zz=z+Math.cos(j*1.7)*.18;ball(xx,h+.03,zz,.10,j%2?M.stone:M.cream,1,.7,1);if(j%2)ball(xx+.025,h+.12,zz,.06,M.leaf,1.4,.35,.6);}}
    crate(1.10,1.55,.58,.39);crate(1.83,1.45,.61,.54);
    assembly('backpack-staff');
    round(-1.82,.51,1.41,.38,.61,.29,M.roof,.045);round(-1.82,.53,1.59,.27,.27,.09,M.roofDark,.025);round(-1.82,.81,1.46,.43,.14,.34,M.roof,.025);
    for(const x of [-1.95,-1.69]){box(x,.51,1.64,.035,.56,.02,M.honey);round(x,.53,1.66,.065,.08,.025,M.brass,.009);}
    add(new THREE.CylinderGeometry(.107,.107,.42,10),M.cream,-1.82,.93,1.40,0,0,Math.PI/2);for(const x of [-1.97,-1.67])add(new THREE.TorusGeometry(.112,.014,4,10),M.honey,x,.93,1.40,0,Math.PI/2);
    tube([[-2.15,.03,1.54],[-2.11,.72,1.52],[-2.07,1.37,1.50],[-2.13,1.48,1.50],[-2.23,1.43,1.50]],.030,M.wood,18);beam([-2.09,1.20,1.51],[-2.01,1.07,1.53],.012,M.cream);
    assembly('hardware');for(const x of [.67,2.13])for(const y of [2.40,4.36]){box(x,y,.834,.22,.16,.035,M.dark);for(const dx of [-.065,.065])ball(x+dx,y,.86,.027,M.brass,1,1,.4);}

    // Material: sage roof, plaster, warm timber and restrained pink/lavender/cream blossoms.
    assembly('flowers-vines');
    flowers(-.70,2.94,1.49,.84);flowers(.14,.79,1.50,.61);flowers(1.40,2.78,.94,.75);flowers(-2.23,.83,-.25,.82,-Math.PI/2);flowers(-.83,.85,-1.84,.82,Math.PI);
    vine(-2.10,1.15,1.34,1.42);vine(.58,.51,1.36,2.02);vine(2.13,.45,.84,1.62);vine(2.25,.48,-.88,1.75,Math.PI/2);
    for(const s of [-1,1]){const x=-.70+s*.52;round(x,3.49,1.31,.22,.75,.07,M.wood,.014);for(let j=0;j<3;j++)box(x-.062+j*.063,3.49,1.36,.011,.69,.014,M.dark);for(const y of [3.25,3.70]){box(x,y,1.38,.23,.035,.025,M.honey);ball(x+s*.063,y,1.40,.019,M.brass,1,1,.4);}}
    assembly('door');arch(-.80,1.67,1.395,.43,.38,.02,M.dark);arch(-.80,1.70,1.42,.33,.29,.017,M.glass);box(-.80,1.83,1.45,.022,.24,.02,M.honey);

    // Six warm lantern cores are kit.win(), paired one-for-one with halo coordinates.
    g.userData.lights=[[-1.63,1.85,1.43],[.62,2.22,1.45],[2.31,3.33,.51],[.73,5.58,.75],[-1.62,1.89,-1.83],[.72,3.45,-1.17]];
    assembly('lanterns');g.userData.lights.forEach((p,i)=>lantern(...p,i===2?Math.PI/2:i>=4?Math.PI:0));

    // Player approach, crate/tower obstructions and a clear 0.4m mailbox reservation.
    g.userData.cols=[[-2.18,-1.70,.77,1.30],[.55,-1.08,2.43,.85],[.77,1.10,2.22,1.94],[-2.15,1.24,-1.56,1.69]];
    g.userData.sculptRuntime={version:'kit-house-1',owner:'geography',fidelity:'stylized-low-poly',pivotPolicy:'named assemblies around local bounds centers; spin group at true roof pivot',assemblyPicking:true,explodable:true};

    // Static pieces are batched per semantic assembly/material; island integration may merge by color.
    g.userData.sculptRuntime.budget={maxTriangles:60000,maxColors:16,sharedPalette:true,staticBatching:'semantic-part/material',textures:false,instancing:false};

    return finish();
  };
})(typeof window!=='undefined'?window:globalThis);
