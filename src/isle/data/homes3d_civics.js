/* 潮汐小島：civics；img2threejs 分階段程式化重建。地面原點，正面 +Z，材質只透過 kit。 */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{}; I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS['home_civics']=function(THREE,kit){
    const g = new THREE.Group(); g.name = 'home-civics';
    const parts = new Map(), batches = new Map(); let part = 'foundation', parent = g;
    const M = {
      plaster: kit.mat('#fbf3e4', { roughness: .93 }, 'stone'),
      stone: kit.mat('#c8bea7', { roughness: .95 }, 'stone'),
      cream: kit.mat('#eee0bd', { roughness: .86 }, 'stone'),
      wood: kit.mat('#98704d', { roughness: .82 }, 'wall'),
      honey: kit.mat('#bd9561', { roughness: .76 }, 'wall'),
      dark: kit.mat('#554631', { roughness: .9 }, 'wall'),
      roof: kit.mat('#e0b25a', { roughness: .86 }, 'roof'),
      roofLight: kit.mat('#edc477', { roughness: .80 }, 'roof'),
      roofDark: kit.mat('#b58b42', { roughness: .87 }, 'roof'),
      brass: kit.mat('#d1a654', { roughness: .42, metalness: .62 }),
      coral: kit.mat('#e6735c', { roughness: .88 }),
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

    // Blockout: bilateral low house, four-sided hip, and deep welcome porch.
    assembly('foundation');box(0,.12,-.06,4.36,.44,4.02,M.stone);
    assembly('welcome-shell');box(0,1.57,-.55,4.12,2.46,2.42,M.plaster);
    assembly('golden-hip');hip(0,2.94,0,2.40,2.10,1.55,.56);
    assembly('deep-porch');box(0,.37,1.28,4.36,.14,1.42,M.wood);
    assembly('round-columns');for(const x of [-2.04,-.72,.72,2.04]){
      round(x,.55,1.82,.35,.37,.35,M.cream);add(new THREE.CylinderGeometry(.115,.145,1.94,12),M.plaster,x,1.67,1.82);round(x,2.68,1.82,.32,.16,.32,M.cream);
    }
    assembly('entry-steps');for(let j=0;j<3;j++)round(0,.045+j*.115,2.27-j*.18,1.50-j*.08,.12,.45,M.cream,.015);
    g.userData.door=[0,1.44];g.userData.cols=[[-2.06,-1.76,2.06,.66],[-2.22,.76,-.78,2.02],[.78,.76,2.22,2.02]];g.userData.mailbox=[-2.22,2.30];
    g.userData.lights=[[-.57,2.08,.97],[.57,2.08,.97],[-1.82,2.46,2.02],[-1.10,2.34,2.02],[-.36,2.28,2.02],[.36,2.28,2.02],[1.10,2.34,2.02],[1.82,2.46,2.02],[1.48,1.88,-1.96]];

    // Structure: continuous porch floor, column capitals, inset wall framing, and paired dormers.
    assembly('foundation');stonework(0,-.06,4.36,4.02,.34);
    assembly('timber-frame');
    for(const x of [-2.06,2.06])for(const z of [-1.76,.66]){round(x,1.60,z,.15,2.46,.15,M.wood);round(x,.48,z,.24,.24,.24,M.cream);}
    for(const z of [-1.82,.72])for(const y of [.43,2.77])box(0,y,z,4.24,.14,.14,M.honey);
    for(const x of [-2.13,2.13])for(const y of [.43,2.77])box(x,y,-.55,.13,.14,2.63,M.honey);
    for(const z of [-2.10,2.10])box(0,2.925,z,4.82,.15,.13,M.wood);for(const x of [-2.40,2.40])box(x,2.925,0,.13,.15,4.18,M.wood);
    box(0,2.78,1.82,4.45,.17,.21,M.wood);for(const x of [-2.04,-.72,.72,2.04]){
      for(const y of [.76,2.56])add(new THREE.CylinderGeometry(.17,.17,.075,12),M.cream,x,y,1.82);
      box(x,2.80,1.82,.37,.12,.37,M.honey);beam([x,2.72,1.82],[x,2.47,1.55],.05,M.honey);
    }
    assembly('deep-porch');for(let j=0;j<18;j++)box(-2.06+j*.243,.465,1.28,.230,.043,1.40,j%4?M.honey:M.wood);
    for(const x of [-2.14,2.14]){box(x,.79,1.29,.10,.08,1.34,M.honey);for(let j=0;j<6;j++)box(x,.64,.72+j*.235,.045,.30,.045,M.wood);}
    assembly('door');door(0,.44,.73);
    assembly('arched-windows');win(-1.35,1.06,.68,.65,1.16);win(1.35,1.06,.68,.65,1.16);
    for(const z of [-1.08,-.02]){win(2.075,1.03,z,.62,1.22,Math.PI/2);win(-2.075,1.03,z,.62,1.22,-Math.PI/2);}
    for(const x of [-1.13,0,1.13])win(x,1.08,-1.77,.58,1.15,Math.PI);
    assembly('paired-dormers');for(const x of [-1.05,1.05]){
      box(x,3.67,1.02,.76,.63,.66,M.plaster);profile([[-.38,0],[.38,0],[0,.37]],.68,x,3.985,.69,M.plaster);
      gable(x,3.98,1.02,.50,.43,.85);for(const side of [-1,1])beam([x+side*.48,4.0,1.49],[x,4.40,1.49],.045,M.wood);
      win(x,3.43,1.37,.40,.73);
    }
    assembly('window-mullions');for(const x of [-1.05,1.05])box(x,3.78,1.56,.024,.56,.025,M.honey);

    // Form: tiled hips, fabric canopy, gathering furniture and balance silhouette.
    assembly('roof-courses');hipTiles(0,2.94,0,2.40,2.10,1.55,.56,10);for(const x of [-1.05,1.05])gableTiles(x,3.98,1.02,.50,.43,.85,4,4);
    assembly('striped-awning');
    for(let j=0;j<18;j++){
      const x=-2.23+j*.262,m=j%2?M.cream:M.coral;
      slab([[x-.13,2.88,1.83],[x+.13,2.88,1.83],[x+.13,2.62,2.38],[x-.13,2.62,2.38]],m,.025);
      profile([[-.13,0],[.13,0],[.13,-.13],[.10,-.17],[-.10,-.17],[-.13,-.13]],.025,x,2.62,2.38,m);
    }
    for(const x of [-2.18,2.18])beam([x,2.67,1.82],[x,2.57,2.35],.022,M.brass);beam([-2.36,2.61,2.36],[2.36,2.61,2.36],.022,M.honey);
    assembly('picnic-table');
    for(let j=0;j<4;j++)round(-1.43,1.02,1.01+j*.15,1.04,.105,.143,j%2?M.honey:M.wood,.012);
    for(const x of [-1.81,-1.05])for(const s of [-1,1])beam([x,.47,1.28+s*.43],[x,.96,1.28-s*.12],.045,M.wood,6);
    for(const z of [.87,1.76]){round(-1.43,.72,z,1.17,.09,.22,M.honey,.015);for(const x of [-1.81,-1.05])beam([x,.47,z],[x,.70,z],.04,M.wood);}
    box(-1.43,.62,1.29,.85,.07,.07,M.wood);box(-1.43,1.085,1.28,.20,.015,.63,M.coral);box(-1.43,1.09,1.28,.07,.016,.63,M.cream);
    add(new THREE.CylinderGeometry(.073,.058,.15,10),M.cream,-1.62,1.19,1.23);add(new THREE.TorusGeometry(.048,.012,5,10),M.cream,-1.52,1.18,1.23,0,Math.PI/2);for(const x of [-1.21,-1.40])add(new THREE.CylinderGeometry(.038,.034,.07,8),M.cream,x,1.145,1.40);
    assembly('swing-bench');
    for(let j=0;j<4;j++)round(1.43,.80,1.12+j*.12,1.02,.065,.105,j%2?M.honey:M.wood,.010);
    for(let j=0;j<4;j++)round(1.43,.98+j*.095,1.01,1.04,.076,.055,M.honey,.008);
    for(const x of [.88,1.98]){round(x,1.04,1.30,.075,.07,.67,M.wood,.010);for(const z of [1.09,1.53])beam([x,.80,z],[x,1.05,z],.021,M.wood,5);}
    round(1.70,.99,1.27,.25,.29,.13,M.coral,.035);round(1.50,.95,1.26,.18,.23,.12,M.cream,.027);
    assembly('chain-hangers');
    for(const x of [.95,1.91])for(const z of [1.10,1.51]){
      beam([x,.85,z],[x,2.77,z],.012,M.dark,5);for(let j=0;j<11;j++)add(new THREE.TorusGeometry(.024,.006,4,7),M.brass,x,.89+j*.17,z,0,j%2?Math.PI/2:0);
    }
    assembly('bulletin-board');round(-.70,1.48,.84,.44,.70,.10,M.dark,.018);round(-.70,1.48,.90,.36,.62,.05,M.honey,.010);profile([[-.27,0],[.27,0],[0,.16]],.07,-.70,1.82,.82,M.wood);
    assembly('paper-notes');for(let j=0;j<6;j++){const x=-.80+(j%2)*.18,y=1.26+Math.floor(j/2)*.19;box(x,y,.938,.13,.15,.012,j%3===0?M.coral:j%3===1?M.cream:M.lavender,0,0,(j%2-.5)*.10);ball(x,y+.058,.95,.013,M.brass,1,1,.45);}
    assembly('balance-vane');
    beam([0,4.50,0],[0,5.20,0],.030,M.brass,8);add(new THREE.CylinderGeometry(.12,.16,.10,8),M.brass,0,4.58,0);ball(0,5.26,0,.07,M.brass);
    const balance=new THREE.Group();balance.name='anim:spin:y:0.18';balance.position.set(0,5.13,0);g.add(balance);parent=balance;
    beam([-.58,0,0],[.58,0,0],.024,M.brass,8);for(const x of [-.55,.55]){
      ball(x,0,0,.036,M.brass);for(const dx of [-.17,.17])beam([x,0,0],[x+dx,-.34,0],.012,M.brass,5);
      for(const dz of [-.10,.10])beam([x,0,0],[x,-.34,dz],.009,M.brass,5);
      const q=new THREE.LatheGeometry([new THREE.Vector2(.01,0),new THREE.Vector2(.10,.018),new THREE.Vector2(.19,.074),new THREE.Vector2(.195,.09),new THREE.Vector2(.17,.08),new THREE.Vector2(.08,.04),new THREE.Vector2(.01,.025)],12);add(q,M.brass,x,-.43,0);
    }assembly('balance-vane');
    assembly('deep-porch');round(0,.495,1.27,.87,.025,.51,M.coral,.008);box(0,.513,1.27,.74,.008,.39,M.cream);box(0,.518,1.27,.68,.009,.33,M.coral);

    // Material: warm gold/cream/coral stay within one shared 15-color palette.
    assembly('flowers-vines');
    for(const x of [-1.05,1.05])flowers(x,3.35,1.60,.57);
    for(const x of [-1.43,1.43]){
      round(x,.66,2.015,1.00,.38,.31,M.plaster,.018);round(x,.87,2.015,1.05,.07,.36,M.cream,.014);flowers(x,.91,2.035,.97);
    }
    flowers(2.17,.96,-.55,.88,Math.PI/2);flowers(-2.17,.96,-.55,.88,-Math.PI/2);flowers(0,.97,-1.91,.88,Math.PI);
    for(const x of [-2.04,-.72,.72,2.04])vine(x,.84,1.97,1.63);
    vine(-1.98,.43,-1.87,2.12,Math.PI);vine(1.98,.43,-1.87,2.12,Math.PI);
    // Stepped wall panels and small capital plaques provide readable relief without maps.
    assembly('round-columns');for(const x of [-2.04,-.72,.72,2.04]){round(x,.55,2.002,.23,.20,.025,M.plaster,.007);ball(x,2.68,2.002,.030,M.brass,1,1,.4);}
    assembly('door');arch(0,1.73,.895,.45,.43,.02,M.dark);arch(0,1.77,.919,.35,.33,.018,M.glass);box(0,1.91,.948,.022,.29,.02,M.honey);

    // Lighting geometry only: the game owns all actual Light objects and day/night transitions.
    g.userData.lights=[[-.57,1.93,1.04],[.57,1.93,1.04],[-1.82,2.18,2.20],[-1.10,2.06,2.20],[-.36,2.00,2.20],[.36,2.00,2.20],[1.10,2.06,2.20],[1.82,2.18,2.20],[1.48,1.88,-1.96]];
    assembly('lanterns');lantern(-.57,1.93,1.04);lantern(.57,1.93,1.04);lantern(1.48,1.88,-1.96,Math.PI);
    const bulbLine=[[-1.82,2.34,2.20],[-1.10,2.22,2.20],[-.36,2.16,2.20],[.36,2.16,2.20],[1.10,2.22,2.20],[1.82,2.34,2.20]];
    for(const x of [-1.82,1.82])beam([x,2.76,1.84],[x,2.34,2.20],.012,M.brass,5);
    tube(bulbLine,.014,M.dark,28);
    for(const p of g.userData.lights.slice(2,8)){
      beam([p[0],p[1]+.16,p[2]],[p[0],p[1]+.085,p[2]],.012,M.brass,5);add(new THREE.CylinderGeometry(.043,.043,.035,7),M.brass,p[0],p[1]+.082,p[2]);ball(...p,.070,M.glass,.83,1.25,.83);
    }

    // Planters and inner columns have separate footprints; the center stair/door lane stays open.
    g.userData.cols=[[-2.16,-1.86,2.16,.78],[-2.25,.78,-.80,2.28],[.80,.78,2.25,2.28],[-.91,1.63,-.53,2.01],[.53,1.63,.91,2.01]];
    g.userData.sculptRuntime={version:'kit-house-1',owner:'civics',fidelity:'stylized-low-poly',pivotPolicy:'named assemblies around local bounds centers; spin group at true balance pivot',assemblyPicking:true,explodable:true};

    // Static pieces are batched per semantic assembly/material; island integration may merge by color.
    g.userData.sculptRuntime.budget={maxTriangles:60000,maxColors:16,sharedPalette:true,staticBatching:'semantic-part/material',textures:false,instancing:false};

    return finish();
  };
})(typeof window!=='undefined'?window:globalThis);
