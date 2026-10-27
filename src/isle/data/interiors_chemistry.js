/* 潮汐小島 · chemistry 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['chemistry'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['chemistry'] = function (THREE, kit) {
    const g=new THREE.Group();g.name='chemistry-mint-orangerie-interior';
    const M={
      wall:kit.mat('#f6f1e4',{},'plaster'),wood:kit.mat('#a77648',{},'wood'),dark:kit.mat('#68482f',{metalness:.7,roughness:.4},'metal'),
      roof:kit.mat('#4f8f7a',{},'roof'),mint:kit.mat('#62c9a0',{metalness:.7,roughness:.4},'metal'),stone:kit.mat('#d8c8ac',{},'stone'),
      cream:kit.mat('#fff2ce',{},'ceramic'),pink:kit.mat('#ff9ec4',{},'fabric'),amber:kit.mat('#ffc66b',{},'foliage'),aqua:kit.mat('#8fe3c8',{},'wood'),
      leaf:kit.mat('#5d874e',{},'foliage'),lime:kit.mat('#93b55f',{},'foliage'),lavender:kit.mat('#b8a0dc',{},'foliage'),
      copper:kit.mat('#b8763d',{metalness:.65,roughness:.3},'metal'),cloth:kit.mat('#f1d5d8',{},'fabric'),lamp:kit.lamp('#ffd8ad')
    };
    // 同色的釉陶、軟布、紙張和塗漆木作各共用一份，不在單件物件內建材質。
    const S={
      paper:kit.mat('#fff2ce',{},'paper'),linen:kit.mat('#fff2ce',{},'fabric'),paleWood:kit.mat('#fff2ce',{},'wood'),petal:kit.mat('#fff2ce',{},'foliage'),grout:kit.mat('#fff2ce',{},'stone'),
      pinkPetal:kit.mat('#ff9ec4',{},'foliage'),pinkCeramic:kit.mat('#ff9ec4',{},'ceramic'),amberCeramic:kit.mat('#ffc66b',{},'ceramic'),aquaCeramic:kit.mat('#8fe3c8',{},'ceramic'),
      aquaFabric:kit.mat('#8fe3c8',{},'fabric'),mintWood:kit.mat('#62c9a0',{},'wood'),mintFabric:kit.mat('#62c9a0',{},'fabric'),
      amberCover:kit.mat('#ffc66b',{},'fabric'),violetCover:kit.mat('#b8a0dc',{},'fabric'),
      terracotta:kit.mat('#a77648',{},'ceramic'),darkWood:kit.mat('#68482f',{},'wood'),ink:kit.mat('#68482f',{},'paper'),woodInk:kit.mat('#a77648',{},'paper'),
      pinkPaper:kit.mat('#ff9ec4',{},'paper'),aquaPaper:kit.mat('#8fe3c8',{},'paper'),mintPaper:kit.mat('#62c9a0',{},'paper'),greenThread:kit.mat('#5d874e',{},'fabric'),
      paleMetal:kit.mat('#fff2ce',{metalness:.7,roughness:.4},'metal'),shade:kit.shade('#fff0da')
    };
    const covers=new Map([[M.cream,S.paper],[M.mint,S.mintFabric],[M.amber,S.amberCover],[M.aqua,S.aquaFabric],[M.lavender,S.violetCover]]);
    const bottleCeramics=new Map([[M.pink,S.pinkCeramic],[M.amber,S.amberCeramic],[M.aqua,S.aquaCeramic]]);
    const bottleGlass=new Map([[M.pink,kit.shade('#ff9ec4')],[M.amber,kit.shade('#ffc66b')],[M.aqua,kit.shade('#8fe3c8')]]);
    const cols=[];
    function add(q,m,x=0,y=0,z=0,ud){const o=new THREE.Mesh(q,m);o.position.set(x,y,z);if(ud)Object.assign(o.userData,ud);g.add(o);return o;}
    function box(x,y,z,w,h,d,m,solid=false){return add(new THREE.BoxGeometry(w,h,d),m,x,y,z,solid?{solid:true}:null);}
    const softGeos=new Map();
    function soft(x,y,z,w,h,d,m,solid=false,radius=.035){
      const key=[w,h,d,radius].join(',');let q=softGeos.get(key);
      if(!q){
        const r=Math.max(.001,Math.min(radius,w/2-.001,h/2-.001,d/2-.001));q=kit.rbox(w,h,d,r);
        softGeos.set(key,q);
      }
      return add(q,m,x,y,z,solid?{solid:true}:null);
    }
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1){const o=add(new THREE.SphereGeometry(r,8,5),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
    function cyl(x,y,z,rt,rb,h,m,n=16,solid=false){return add(new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z,solid?{solid:true}:null);}
    function beam(a,b,r,m){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),o=add(new THREE.CylinderGeometry(r,r,v.length(),6),m,...A.add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
    function tube(points,r,m){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),28,r,6,false),m);}
    const paleOak=kit.mat('#c8bd9e',{},'wood'),paleOakShade=kit.mat('#d4c9ad',{},'wood');
    function floor(x,z,w,d,y){const o=box(x,y-.12,z,w,.24,d,paleOak);o.userData.walk=true;return o;}
    function rect(x,y,w,h){return [[x-w/2,y],[x+w/2,y],[x+w/2,y+h],[x-w/2,y+h]];}
    function arch(x,y,w,h){const p=[[x-w/2,y],[x+w/2,y],[x+w/2,y+h-w/2]];for(let j=1;j<=18;j++){const a=j*Math.PI/18;p.push([x+w/2*Math.cos(a),y+h-w/2+w/2*Math.sin(a)]);}return p;}
    function wall(poly,holes,x,z,ry=0){const s=new THREE.Shape(poly.map(p=>new THREE.Vector2(...p)));holes.forEach(p=>s.holes.push(new THREE.Path(p.slice().reverse().map(v=>new THREE.Vector2(...v)))));const o=add(new THREE.ExtrudeGeometry(s,{depth:.3,bevelEnabled:false}),M.wall,x,0,z);o.rotation.y=ry;return o;}
    function windowArch(p,x,z,ry=0,out=1){
      const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys),cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;
      const loc=(u,y,d)=>[x+u*Math.cos(ry)+d*out*Math.sin(ry),y,z-u*Math.sin(ry)+d*out*Math.cos(ry)];
      const pts=p.map(v=>new THREE.Vector3(v[0],v[1],0));pts.push(pts[0].clone());const rim=add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',0),64,.075,6,false),M.wood,x,0,z);rim.rotation.y=ry;
      const view=add(new THREE.PlaneGeometry(w+.4,h+.4),kit.view(),...loc(cx,cy,.5),{prop:true});view.rotation.y=ry+(out>0?Math.PI:0);
      view.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,opacity:0,alphaTest:.5});
      const sh=new THREE.Shape(p.map(v=>new THREE.Vector2(...v))),glass=add(new THREE.ShapeGeometry(sh),kit.glass(),x,0,z,{camThrough:true});glass.rotation.y=ry+(out>0?Math.PI:0);glass.scale.x=out>0?-1:1;
      for(const [u,y,ww,hh] of [[cx,cy,.05,h],[cx,cy,w,.05]]){const o=box(...loc(u,y,-.05),ww,hh,.10,M.wood);o.rotation.y=ry;}
      const sill=box(...loc(cx,Math.min(...ys)-.1,-.12),w+.3,.15,.45,M.mint);sill.rotation.y=ry;
    }
    function bottle(x,y,z,s,m,lit=false){
      const profile=m===M.aqua?[[0,0],[.15,0],[.18,.08],[.18,.34],[.13,.43],[.065,.51],[.065,.66],[.09,.68],[.09,.72],[0,.72]]:m===M.amber?[[0,0],[.14,0],[.23,.09],[.27,.23],[.22,.39],[.07,.51],[.065,.66],[.09,.68],[.09,.72],[0,.72]]:[[0,0],[.18,0],[.23,.08],[.25,.23],[.19,.39],[.07,.51],[.065,.66],[.09,.68],[.09,.72],[0,.72]];
      const pts=profile.map(p=>new THREE.Vector2(p[0]*s,p[1]*s));
      const body=lit?bottleGlass.get(m):(bottleCeramics.get(m)||m);
      add(new THREE.LatheGeometry(pts,10),body,x,y,z,lit?{camThrough:true}:null);cyl(x,y+.75*s,z,.07*s,.07*s,.08*s,M.wood,8);
      soft(x,y+.25*s,z+.24*s,.2*s,.17*s,.02*s,S.paper);box(x,y+.25*s,z+.255*s,.10*s,.025*s,.012*s,S.ink);
      if(lit)ball(x,y+.25*s,z,.11*s,M.lamp);
    }
    function flowerpot(x,y,z,s=1,hanging=false){
      cyl(x,y+.24*s,z,.3*s,.21*s,.48*s,S.terracotta,10,!hanging);
      for(let j=0;j<7;j++){const a=j*2.4,xx=x+Math.sin(a)*.26*s,zz=z+Math.cos(a)*.26*s,yy=y+(.6+j%3*.07)*s;beam([x,y+.45*s,z],[xx,yy,zz],.022*s,M.leaf);ball(xx,yy,zz,.20*s,j%2?M.leaf:M.lime,1,.43,1);if(j%2===0){for(let k=0;k<5;k++){const b=k*Math.PI*2/5;ball(xx+Math.sin(b)*.065*s,yy+.08*s+Math.cos(b)*.065*s,zz,.05*s,j%3?S.pinkPetal:M.lavender);}ball(xx,yy+.08*s,zz+.035*s,.035*s,M.amber);}}
      if(hanging)for(const dx of [-.25,.25])beam([x+dx*s,y+.43*s,z],[x,y+1.2*s,z],.018,M.dark);
    }
    function pendant(x,y,z,s=1,m=M.amber){beam([x,y+.9*s,z],[x,y+.56*s,z],.022,M.dark);bottle(x,y,z,s,m,true);}
    function flaskLamp(x,y,z,top) {
      const glass=kit.shade('#fff1da');
      const profile=[[.10,0],[.24,.08],[.26,.23],[.15,.36],[.065,.46],[.065,.57]];
      add(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),20),glass,x,y,z);
      cyl(x,y+.20,z,.07,.08,.12,M.lamp);add(new THREE.CylinderGeometry(.27,.27,.045,20,1,true),M.copper,x,y+.04,z);
      cyl(x,y+.59,z,.095,.095,.065,M.copper);beam([x,y+.63,z],[x,top,z],.014,M.dark);box(x,top-.018,z,.14,.035,.14,M.copper);
    }
    function shelf(x,y,z,w,ry=0){const n=new THREE.Group();g.add(n);const before=g.children.length;for(const dx of [-w/2,w/2])box(dx,y+1.55,0,.09,3.1,.48,M.wood,true);for(let row=0;row<4;row++){box(0,y+.35+row*.75,0,w+.14,.10,.55,M.wood,true);for(let j=0;j<5;j++)bottle(-w*.4+j*w*.2,y+.41+row*.75,0,.7,[M.pink,M.amber,M.aqua][(row+j)%3]);}const children=g.children.slice(before);children.forEach(o=>n.add(o));n.position.set(x,0,z);n.rotation.y=ry;return n;}
    // The cottage is tall and narrow; the attached conservatory is a broad, ONE-storey glass drum.
    floor(-4,0,8,10,0);
    const circleFloor=clip(Array.from({length:64},(_,j)=>[3+4.3*Math.cos(j*Math.PI/32),0,4.3*Math.sin(j*Math.PI/32)]),0);
    const floorShape=new THREE.Shape(circleFloor.map(p=>new THREE.Vector2(p[0],-p[2]))),disk=add(new THREE.ExtrudeGeometry(floorShape,{depth:.24,bevelEnabled:false}),M.stone,0,-.24,0,{walk:true});disk.rotation.x=-Math.PI/2;
    for(let j=0;j<10;j++)box(-4,.005,-4.5+j,7.9,.025,.018,S.darkWood);
    const front=[[-8,0],[0,0],[0,7.2],[-4,10.5],[-8,7.2]],fw=arch(-6.45,1.05,1.3,2),bw=arch(-4.5,1.2,1.8,2.05),uw=arch(-4,7.4,1.65,2),door=arch(-3.2,0,2.05,3.05);
    wall(front,[fw,uw,door],0,5);wall(front,[bw,uw],0,-5.3);windowArch(fw,0,5);windowArch(uw,0,5);windowArch(bw,0,-5.3,0,-1);windowArch(uw,0,-5.3,0,-1);
    const west=arch(1.6,1.25,1.65,2);wall(rect(0,0,10,7.2),[west],-8.3,0,Math.PI/2);windowArch(west,-8,0,Math.PI/2,-1);
    // Side passage opens only on the ground floor, as in the exterior's attached greenhouse.
    const passage=arch(0,0,2.8,3.65);wall(rect(0,0,10,7.2),[passage],0,0,Math.PI/2);
    const path=passage.map(p=>new THREE.Vector3(p[0],p[1],0));path.push(path[0].clone());const trim=add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path,false,'catmullrom',0),64,.11,6,false),M.mint,0,0,0);trim.rotation.y=Math.PI/2;
    cols.push([-8.3,0,-5.3,-8,7.2,5.3],[-8,0,-5.3,0,10.5,-5],[-8,0,5,-4.225,7.2,5.3],[-2.175,0,5,0,7.2,5.3],[0,0,-5,.3,7.2,-1.4],[0,0,1.4,.3,7.2,5],[0,3.65,-1.4,.3,7.2,1.4]);
    const ds=new THREE.Shape(door.map(p=>new THREE.Vector2(...p)));add(new THREE.ExtrudeGeometry(ds,{depth:.12,bevelEnabled:false}),M.wood,0,0,5.08,{solid:true});for(const y of [.65,2.0])box(-2.7,y,5.01,.6,.08,.06,M.dark);add(new THREE.TorusGeometry(.1,.025,6,16),M.dark,-3.8,1.3,4.99);
    // Clip every conservatory panel against the cottage side, so glass/sky never cuts through the house.
    function clip(poly,threshold=.31){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=a[0]>=threshold,bi=b[0]>=threshold;if(ai)out.push(a);if(ai!==bi){const t=(threshold-a[0])/(b[0]-a[0]);out.push([threshold,a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])]);}}return out;}
    function surface(polys,m,ud){const p=[],uv=[];for(const poly of polys){const q=clip(poly);for(let i=1;i<q.length-1;i++)for(const v of [q[0],q[i],q[i+1]]){p.push(...v);uv.push((v[0]+2)/10,Math.max(0,Math.min(1,v[1]/9.8)));}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return add(geo,m,0,0,0,ud);}
    function domePolys(r,eave){const p=[],point=(a,t)=>[3+r*Math.cos(t)*Math.cos(a),eave+r*1.1*Math.sin(t),r*Math.cos(t)*Math.sin(a)];for(let j=0;j<48;j++){const a=j*Math.PI/24,b=(j+1)*Math.PI/24;p.push([[3+r*Math.cos(a),.5,r*Math.sin(a)],[3+r*Math.cos(b),.5,r*Math.sin(b)],point(b,0),point(a,0)]);for(let k=0;k<12;k++){const t=k*Math.PI/24,u=(k+1)*Math.PI/24;p.push([point(a,t),point(b,t),point(b,u),point(a,u)]);}}return p;}
    const glass=kit.glass().clone();glass.side=THREE.DoubleSide;glass.opacity=.12;surface(domePolys(4.3,4.3),glass,{camThrough:true});
    const baseSky=kit.view(),sky=baseSky.clone();sky.uniforms=baseSky.uniforms;sky.side=THREE.DoubleSide;const backdrop=surface(domePolys(4.8,4.3),sky,{prop:true});backdrop.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,opacity:0,alphaTest:.5});
    for(let j=0;j<48;j++){
      const a=j*Math.PI/24,b=(j+1)*Math.PI/24,mid=(a+b)/2,x=3+4.3*Math.cos(mid),z=4.3*Math.sin(mid);if(x<.38)continue;
      const o=box(x,.27,z,Math.hypot(4.3*(Math.cos(b)-Math.cos(a)),4.3*(Math.sin(b)-Math.sin(a)))+.04,.54,.3,M.stone);o.rotation.y=-mid-Math.PI/2;
      const xa=3+4.3*Math.cos(a),xb=3+4.3*Math.cos(b),za=4.3*Math.sin(a),zb=4.3*Math.sin(b);cols.push([Math.max(.3,Math.min(xa,xb)-.13),0,Math.min(za,zb)-.13,Math.max(xa,xb)+.13,4.4,Math.max(za,zb)+.13]);
    }
    // Twelve slender mint meridians and three dome rings match the exterior's glasshouse rhythm.
    for(let j=0;j<12;j++){const a=j*Math.PI/6,x=3+4.3*Math.cos(a),z=4.3*Math.sin(a);if(x>.31)beam([x,.4,z],[x,4.3,z],.065,M.mint);const pts=[];for(let k=0;k<=20;k++){const t=k*Math.PI/40,pt=[3+4.3*Math.cos(t)*Math.cos(a),4.3+4.73*Math.sin(t),4.3*Math.cos(t)*Math.sin(a)];if(pt[0]>.31)pts.push(pt);}if(pts.length>2)tube(pts,.06,M.mint);}
    for(const [y,r] of [[.6,4.3],[2.6,4.3],[4.3,4.3],[6.8,3.64],[8.4,2.14]]){let pts=[];for(let j=0;j<=96;j++){const a=j*Math.PI/48,p=[3+r*Math.cos(a),y,r*Math.sin(a)];if(p[0]>.31)pts.push(p);else if(pts.length>1){tube(pts,.05,M.mint);pts=[];}}if(pts.length>1)tube(pts,.05,M.mint);}
    for(let j=0;j<12;j++){const a=j*Math.PI/6,b=(j+1)*Math.PI/6,pts=[];for(let k=0;k<=16;k++){const t=k/16,ang=a+(b-a)*t,p=[3+4.3*Math.cos(ang),3.05+1.15*Math.sin(Math.PI*t),4.3*Math.sin(ang)];if(p[0]>.31)pts.push(p);}if(pts.length>2)tube(pts,.04,M.mint);}
    // Main house structure; green tiles stay outside a pale timber-lined loft ceiling.
    for(const z of [-4.91,4.91]){for(const x of [-7.85,-.15])box(x,3.6,z,.2,7.2,.2,M.wood);for(const y of [4.05,7.15])box(-4,y,z,7.9,.16,.18,M.wood);if(z<0)box(-4,.5,z,7.9,.16,.18,M.wood);else{box(-6.15,.5,z,3.7,.16,.18,M.wood);box(-1.05,.5,z,2.1,.16,.18,M.wood);}beam([-8,7.2,z],[-4,10.5,z],.12,M.wood);beam([-4,10.5,z],[0,7.2,z],.12,M.wood);}
    for(const y of [.55,4.05,7.1])box(-7.91,y,0,.16,.16,9.9,M.wood);
    for(const y of [4.05,7.1])box(-.13,y,0,.16,.16,9.9,M.wood);for(const z of [-3.2,3.2])box(-.13,.55,z,.16,.16,3.5,M.wood);
    function roof(a,b){
      const len=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
      const o=box((a[0]+b[0])/2,(a[1]+b[1])/2,0,len,.24,10.6,M.roof);o.rotation.z=angle;
      const lining=box(o.position.x,o.position.y-.18,0,len,.10,10.1,S.paleWood);lining.rotation.z=angle;lining.name='pale-timber-interior-roof-lining';
      for(let j=1;j<Math.ceil(len/.29);j++){const t=j/Math.ceil(len/.29);box(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-.26,0,.018,.026,9.95,M.wood);}
    }
    roof([-8.15,7.2],[-4,10.6]);roof([-4,10.6],[.15,7.2]);for(const z of [-4.7,-2.35,0,2.35,4.7]){beam([-8,7.15,z],[-4,10.4,z],.09,M.wood);beam([-4,10.4,z],[0,7.15,z],.09,M.wood);}
    floor(-2.9,1.85,5.8,6.3,4.2);floor(-6.9,3.75,2.2,2.5,4.2);floor(-4,-4.15,8,1.7,4.2);floor(-1,-2.3,2,2,4.2);
    for(let j=0;j<15;j++)box(-2.9,4.208,-1.08+j*.42,5.65,.014,.013,S.darkWood);
    for(const z of [-.9,.4,1.7,3,4.3])box(-2.9,3.94,z,5.8,.28,.16,M.wood);
    // L-shaped stair: two 3.9 m runs, 2.1 m rise each, 28.3 degrees, 1.8 m width.
    function ramp(a,b,width){const dx=b[0]-a[0],dz=b[2]-a[2],h=Math.hypot(dx,dz),nx=-dz/h*width/2,nz=dx/h*width/2,p=[[a[0]-nx,a[1],a[2]-nz],[b[0]-nx,b[1],b[2]-nz],[b[0]+nx,b[1],b[2]+nz],[a[0]+nx,a[1],a[2]+nz]],v=[];for(const i of [0,2,1,0,3,2])v.push(...p[i]);const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(v,3));q.computeVertexNormals();const o=add(q,M.wood,0,0,0,{walk:true});o.visible=false;for(let i=0;i<11;i++){const t=(i+.5)/11,y=a[1]+(b[1]-a[1])*t;const o=box(a[0]+dx*t,y,a[2]+dz*t,width,(b[1]-a[1])/11,h/11+.02,M.wood);o.rotation.y=Math.atan2(dx,dz);}for(const s of [-1,1]){beam([a[0]+nx*s,a[1]+.95,a[2]+nz*s],[b[0]+nx*s,b[1]+.95,b[2]+nz*s],.05,M.mint);for(let i=0;i<=11;i++){const t=i/11;beam([a[0]+dx*t+nx*s,a[1]+(b[1]-a[1])*t,a[2]+dz*t+nz*s],[a[0]+dx*t+nx*s,a[1]+(b[1]-a[1])*t+.95,a[2]+dz*t+nz*s],.025,M.mint);}}}
    ramp([-6.8,0,2.5],[-6.8,2.1,-1.4],1.8);floor(-6.8,-2.3,1.8,1.8,2.1);ramp([-5.9,2.1,-2.3],[-2,4.2,-2.3],1.8);
    function rail(a,b,y){beam([a[0],y+1,a[1]],[b[0],y+1,b[1]],.055,M.mint);const dx=b[0]-a[0],dz=b[1]-a[1],n=Math.ceil(Math.hypot(dx,dz)/.45);for(let i=0;i<=n;i++){const t=i/n;beam([a[0]+dx*t,y+.12,a[1]+dz*t],[a[0]+dx*t,y+1,a[1]+dz*t],.028,M.mint);}cols.push([Math.min(a[0],b[0])-.06,y+.1,Math.min(a[1],b[1])-.06,Math.max(a[0],b[0])+.06,y+1.05,Math.max(a[1],b[1])+.06]);}
    rail([-5.8,-1.3],[-2,-1.3],4.2);rail([-5.8,-1.3],[-5.8,2.5],4.2);rail([-8,2.5],[-5.8,2.5],4.2);rail([-8,-3.3],[-2,-3.3],4.2);
    // Curved tea counter under the conservatory; fluted wood face and labelled pastel flasks.
    const semi=new THREE.Shape();semi.moveTo(-1.55,0);semi.absarc(0,0,1.55,Math.PI,0,true);semi.lineTo(-1.55,0);const counter=add(new THREE.ExtrudeGeometry(semi,{depth:.96,bevelEnabled:false,curveSegments:24}),M.wood,3.4,.12,0,{solid:true});counter.rotation.x=-Math.PI/2;
    const top=add(new THREE.ExtrudeGeometry(semi,{depth:.10,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:1,curveSegments:24}),M.cream,3.4,1.08,0);top.rotation.x=-Math.PI/2;
    for(let j=0;j<13;j++)box(2+j*.23,.61,.04,.028,.86,.035,S.darkWood);
    for(let j=0;j<3;j++)bottle(2.6+j*.65,1.22,-1,.8,[M.amber,M.pink,M.aqua][j]);
    // Each labelled bottle has its own silhouette; food jars and observation jars occupy separate shelves.
    shelf(2.8,0,-3.75,3.1);shelf(6.9,0,-.15,1.4,Math.PI/2);
    soft(3.15,.55,3.65,2.3,1.1,.65,M.wood,true);soft(3.15,1.15,3.65,2.5,.14,.78,M.cream,true);for(let j=0;j<3;j++)bottle(2.5+j*.6,1.24,3.65,.65,[M.pink,M.amber,M.aqua][j]);
    for(let j=0;j<4;j++){const x=1.5+j*1.05,y=3.9-.25*Math.sin(j*Math.PI/3);pendant(x,y,2.9,.72,[M.pink,M.amber,M.aqua,M.pink][j]);}tube([[1.4,4.65,2.9],[2.5,4.4,2.9],[3.6,4.4,2.9],[4.8,4.65,2.9]],.025,M.dark);
    for(const p of [[.7,0,2.9,.9],[5.8,0,-2.8,1],[5.9,0,2.5,1],[1.2,0,-3.4,.9]])flowerpot(...p);
    for(const p of [[1.4,3.3,-3.2,.8],[5.8,3.5,-2.2,.8],[5.7,3.5,2,.8]])flowerpot(...p,true);
    pendant(5.7,2.8,-2.2,.7,M.aqua);
    const lily=new THREE.Shape();lily.moveTo(0,0);lily.lineTo(.8*Math.cos(.2),.8*Math.sin(.2));lily.absarc(0,0,.8,.2,Math.PI*2-.3,false);lily.lineTo(0,0);const lilyRug=add(new THREE.ShapeGeometry(lily,28),S.aquaFabric,1.8,.019,1.8);lilyRug.rotation.x=-Math.PI/2;
    for(let j=0;j<6;j++){const a=.5+j*.85;beam([1.8,.026,1.8],[1.8+.65*Math.cos(a),.026,1.8-.65*Math.sin(a)],.008,S.greenThread);}
    // Cottage: west-front copper still connected to the exterior pipe, washable kitchen and tea nook.
    box(-7.15,.5,4.05,1.25,1,1.3,M.stone,true);cyl(-7.15,1.3,4.05,.48,.5,.6,M.copper,16,true);ball(-7.15,1.6,4.05,.49,M.copper,1,.6,1);tube([[-7.15,1.8,4.05],[-7.15,3.2,4.05],[-7.75,3.5,4.05],[-8.12,3.5,4.05]],.10,M.copper);tube([[-7,1.45,4.05],[-6.5,1.45,4.05],[-6.4,1.15,4.05]],.055,M.copper);bottle(-6.4,1.02,4.05,.5,M.aqua);
    soft(-2.55,.5,-4.2,3.4,1,1.05,S.mintWood,true);soft(-2.55,1.07,-4.2,3.6,.14,1.2,M.cream,true);for(let j=0;j<3;j++){soft(-3.65+j*1.05,.55,-3.65,.9,.66,.08,M.wood);box(-3.65+j*1.05,.7,-3.58,.3,.055,.05,M.copper);}cyl(-3.5,1.2,-4.2,.3,.24,.13,M.copper);for(let j=0;j<4;j++)ball(-3.65+j*.1,1.32,-4.2,.10,M.amber);
    box(-1,2.35,-4.85,1.5,1.4,.12,S.mintWood);for(let j=0;j<4;j++)box(-1,1.9+j*.25,-4.76,1.2,.025,.025,M.cream);
    cyl(-1.2,.73,3.1,.65,.65,.12,M.wood,24,true);cyl(-1.2,.35,3.1,.12,.2,.7,M.mint,10);for(const z of [1.85,4.3]){cyl(-1.2,.38,z,.30,.30,.15,M.cloth);for(const x of [-1.4,-1])box(x,.15,z,.09,.3,.09,M.wood);}bottle(-1.2,.81,3.1,.45,M.amber);soft(-4.7,.025,1.3,1.8,.04,1.3,S.aquaFabric);
    // Loft: mint daybed, pale board ceiling, dried-herb rail and an orderly recipe desk.
    soft(-6.4,4.55,3.7,2.1,.65,2.3,M.wood,true);soft(-6.4,4.93,3.7,2,.22,2.2,S.linen,true,.065);soft(-6.4,5.08,3.4,2,.10,1.5,S.aquaFabric);for(const x of [-6.9,-5.9])ball(x,5.16,4.4,.32,M.pink,1.3,.45,.78);soft(-6.4,5.0,4.9,2.2,1.2,.15,S.mintWood,true);
    soft(-3.25,5.2,4.05,2.3,.15,1.1,M.wood,true);for(const x of [-4.2,-2.3])box(x,4.7,4.05,.14,1,.8,S.mintWood,true);soft(-3.25,5.3,4.05,.9,.035,.6,S.paper);for(let j=0;j<3;j++)bottle(-4+j*.4,5.3,4.45,.45,[M.pink,M.amber,M.aqua][j]);
    for(let row=0;row<3;row++){box(-.3,4.9+row*.65,2,.4,.1,2.1,M.wood);for(let j=0;j<5;j++)box(-.35,5.15+row*.65,1.25+j*.34,.28,.4,.22,j%2?S.paper:M.pink);}
    beam([-.4,6,-.3],[-.4,6,1],.04,M.wood);for(let j=0;j<5;j++){const z=-.2+j*.25;beam([-.4,6,z],[-.4,5.45,z],.022,M.dark);for(let k=0;k<4;k++)ball(-.4+(k%2?.08:-.08),5.55+k*.09,z,.12,M.leaf,1,.45,1);}
    soft(-3.8,4.23,1,2.5,.035,2.5,M.cloth);flowerpot(-4.7,4.2,4.45,.75);flowerpot(-.75,4.2,-4.5,.75);
    // Jingjing keeps fruit sections and a pressed mint sprig above the recipe desk.
    for(const x of [-4.9,-2.4]){soft(x,6.35,4.84,1.0,1.0,.09,S.mintWood);box(x,6.35,4.77,.86,.86,.035,S.paper);}
    const citrusPicture=add(new THREE.CylinderGeometry(.28,.28,.04,12),M.amber,-2.4,6.35,4.73);citrusPicture.rotation.x=Math.PI/2;
    for(let j=0;j<8;j++){const a=j*Math.PI/4;beam([-2.4,6.35,4.70],[-2.4+Math.cos(a)*.25,6.35+Math.sin(a)*.25,4.70],.012,S.paper);}
    beam([-4.9,5.98,4.71],[-4.9,6.72,4.71],.018,M.leaf);for(let j=0;j<5;j++)ball(-4.9+(j%2?.13:-.13),6.08+j*.11,4.70,.13,M.leaf,1,.52,.18);
    for(const [x,y,z] of [[-3.2,2.8,.3],[-3.2,6.6,1],[-6.9,4.25,-2.4]])pendant(x,y,z,.95,M.amber);
    // Round two: an inhabited citrus-tea conservatory, distinct from Rayne's copper workshop.
    // Small foliage uses shared low-poly geometry; everything remains deterministic and kit-only.
    function ring(x,y,z,r,t,m,rx=0,ry=0){const o=add(new THREE.TorusGeometry(r,t,5,20),m,x,y,z);o.rotation.set(rx,ry,0);return o;}
    function leaf(x,y,z,r=.16,m=M.leaf,sx=1,sy=.45,sz=.8){const o=add(new THREE.SphereGeometry(r,7,3),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
    function bloom(x,y,z,s=.12,m=M.pink){m=m===M.cream?S.petal:m===M.pink?S.pinkPetal:m;for(let k=0;k<5;k++){const a=k*Math.PI*2/5;leaf(x+Math.cos(a)*s*.65,y+Math.sin(a)*s*.65,z,s*.48,m,1,1,.45);}leaf(x,y,z+.025,s*.29,M.amber,1,1,.5);}
    function vine(a,b,n=14,flowers=true){
      const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2-.18,(a[2]+b[2])/2];tube([a,mid,b],.017,M.leaf);
      for(let j=0;j<n;j++){const t=(j+.5)/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t-.16*Math.sin(t*Math.PI),z=a[2]+(b[2]-a[2])*t;leaf(x+(j%2?.13:-.13),y,z,.18,j%3?M.leaf:M.lime);if(flowers&&j%4===0)bloom(x,y-.08,z+.06,.12,j%3?M.pink:M.cream);}
    }
    function basket(x,y,z,w=.65,h=.45,d=.52,fruit=false){
      soft(x,y+h/2,z,w,h,d,M.wood,h>.45);for(let j=0;j<5;j++)box(x,y+.06+j*(h-.1)/4,z+d/2+.015,w,.025,.025,S.paleWood);
      for(let j=0;j<7;j++)box(x-w/2+.04+j*(w-.08)/6,y+h/2,z+d/2+.03,.02,h-.04,.025,S.darkWood);
      ring(x,y+h*.75,z,w*.42,.025,M.wood);soft(x,y+h+.02,z,w+.04,.055,d+.04,M.wood);
      if(fruit)for(let j=0;j<6;j++){const xx=x+(j%3-1)*w*.22,zz=z+(j<3?-.11:.1);leaf(xx,y+h+.10+(j%2)*.025,zz,.12,M.amber,1,1,1);leaf(xx+.04,y+h+.19,zz,.07,M.leaf,1,.3,.6);}
    }
    function book(x,y,z,w=.25,h=.46,m=M.pink,flat=false){
      m=covers.get(m)||m;
      if(flat){soft(x,y+.055,z,w,.10,h,m);box(x,y+.055,z+.02,w*.92,.055,h*.94,S.paper);box(x-w*.47,y+.055,z,.025,.10,h,m);}
      else{soft(x,y+h/2,z,w,h,.30,m);box(x,y+h/2,z+.16,w*.75,h*.86,.018,S.paper);for(const dy of [.08,h-.08])box(x,y+dy,z+.18,w*.8,.017,.012,M.mint);}
    }
    function openbook(x,y,z,s=1){
      for(const side of [-1,1]){const o=soft(x+side*.23*s,y+.035,z,.46*s,.045,.60*s,S.paper);o.rotation.z=side*.06;for(let j=0;j<5;j++)box(x+side*.23*s,y+.065,z-.19*s+j*.08*s,.31*s,.007,.012,S.woodInk);}
      box(x,y+.07,z,.024,.02,.62*s,S.ink);box(x+.18*s,y+.079,z+.16*s,.06,.012,.3*s,M.pink);
    }
    function cup(x,y,z,s=1){cyl(x,y+.01*s,z,.16*s,.16*s,.025*s,M.cream,12);cyl(x,y+.09*s,z,.10*s,.085*s,.15*s,M.cream,12);cyl(x,y+.168*s,z,.082*s,.082*s,.008,M.amber,12);ring(x+.117*s,y+.10*s,z,.06*s,.016*s,M.copper);}
    function teapot(x,y,z,s=1){
      ball(x,y+.23*s,z,.26*s,M.copper,1,.88,1);cyl(x,y+.43*s,z,.17*s,.20*s,.05*s,M.cream,12);ball(x,y+.49*s,z,.06*s,M.copper);
      tube([[x+.18*s,y+.22*s,z],[x+.37*s,y+.29*s,z],[x+.44*s,y+.40*s,z]],.045*s,M.copper);ring(x-.28*s,y+.25*s,z,.17*s,.03*s,M.copper);
    }
    function citrus(x,y,z,r=.15,cut=false){
      if(cut){cyl(x,y+.018,z,r,r,.035,M.amber,12);cyl(x,y+.039,z,r*.82,r*.82,.009,S.petal,12);for(let j=0;j<8;j++){const a=j*Math.PI/4;beam([x,y+.046,z],[x+Math.cos(a)*r*.76,y+.046,z+Math.sin(a)*r*.76],.008,M.amber);}}
      else{leaf(x,y+r,z,r,M.amber,1,1,1);leaf(x+.04,y+r*2,z,.09,M.leaf,1,.3,.6);}
    }
    function pot(x,y,z,s=.7){
      cyl(x,y+.22*s,z,.27*s,.18*s,.44*s,S.terracotta,9,y<.1&&s>.85);ring(x,y+.43*s,z,.27*s,.035*s,M.cream,Math.PI/2);
      for(let j=0;j<6;j++){const a=j*2.4,xx=x+Math.sin(a)*.24*s,zz=z+Math.cos(a)*.24*s;beam([x,y+.4*s,z],[xx,y+.67*s,zz],.016,M.leaf);leaf(xx,y+.68*s,zz,.19*s,j%2?M.leaf:M.lime);if(j%2===0)bloom(xx,y+.79*s,zz,.11*s,j%3?M.pink:M.cream);}
    }
    function curtains(x,y,z,w,h,ry=0){
      const p=(u,v,d)=>[x+u*Math.cos(ry)+d*Math.sin(ry),y+v,z-u*Math.sin(ry)+d*Math.cos(ry)];beam(p(-w/2-.25,h+.12,0),p(w/2+.25,h+.12,0),.025,M.wood);
      for(const side of [-1,1]){for(let j=0;j<3;j++){const o=soft(...p(side*(w/2+.1)+(j-1)*.07,h/2,0),.11,h,.13,M.cloth);o.rotation.y=ry;}const tie=box(...p(side*(w/2+.1),h*.38,-.09),.27,.075,.05,S.mintFabric);tie.rotation.y=ry;}
    }
    // Plaster remains visible between shallow cottage panelling and window-safe timber braces.
    for(const [xa,xb,z] of [[-7.8,-4.35,4.82],[-2.05,-.2,4.82],[-7.8,-.2,-4.83]]){
      box((xa+xb)/2,.45,z,xb-xa,.74,.08,M.aqua);for(const y of [.07,.86])box((xa+xb)/2,y,z,xb-xa,.09,.13,M.wood);
      for(let x=xa+.12;x<xb;x+=.33)box(x,.45,z-.05,.02,.65,.04,S.mintWood);
    }
    for(const z of [-4.8,4.8]){
      for(const x of [-7.7,-.3])beam([x,3.82,z],[x+(x<-4?.65:-.65),3.2,z],.07,M.wood);
      box(-3,4.65,z,5.7,.65,.08,M.aqua);for(const y of [4.25,5.02])box(-3,y,z,5.7,.08,.11,M.wood);
      for(let x=-5.7;x<-.3;x+=.35)box(x,4.65,z-.05,.018,.62,.03,S.mintWood);
    }
    for(const y of [4.3,5.08,7.05])box(-.22,y,.7,.08,.08,8.2,M.wood);
    for(const z of [-4.4,-.25,4.4]){box(-.23,5.65,z,.10,2.8,.12,M.wood);beam([-.23,6.85,z],[ -.23,6.4,z+.45],.05,M.wood);}
    // 奶油罩遮住瓶頸上方；轉角瓶燈抬高，平台留兩公尺淨高。
    for(const [x,y,z,top] of [[-3.2,2.8,.3,3.96],[-3.2,6.6,1,9.6999],[-6.9,4.25,-2.4,7.9545]]){
      beam([x,y+.72,z],[x,top,z],.017,M.dark);cyl(x,y+.67,z,.11,.32,.17,S.shade,12);ring(x,y+.81,z,.05,.014,M.copper);
    }
    for(const [x,y,z] of [[1.5,3.9,2.9],[2.55,3.68,2.9],[3.6,3.68,2.9],[4.65,3.9,2.9]]){
      for(let j=0;j<2;j++)ring(x,y+.70+j*.09,z,.035,.012,M.copper,j%2*Math.PI/2);
    }
    // Recipe counter: usable centre front at z=.7; props occupy the rear half of the top.
    soft(3.4,1.196,-.69,2.5,.025,.32,M.cloth);openbook(3.52,1.24,-.35,.85);teapot(4.32,1.23,-.51,.8);cup(4.3,1.23,-1,.7);
    soft(2.45,1.225,-.85,.8,.04,.40,M.wood);citrus(2.25,1.25,-.87,.14,true);citrus(2.52,1.25,-.83,.13,true);citrus(2.7,1.25,-.85,.13);
    cyl(3.05,1.29,-1.06,.14,.10,.16,M.cream,10);beam([3.04,1.29,-1.06],[3.19,1.58,-1.08],.035,M.wood);leaf(2.97,1.42,-1.04,.09,M.leaf);
    cyl(3.1,1.34,-.56,.12,.10,.25,S.aquaCeramic,10);for(let j=0;j<3;j++)box(3.1,1.29+j*.055,-.443,.08,.01,.015,M.cream);
    // Slim curved bench drawers and neatly named label plates.
    for(const x of [2.45,3.4,4.35]){soft(x,.7,.09,.62,.32,.06,M.wood);soft(x,.71,.135,.20,.10,.025,S.paper);box(x,.6,.155,.15,.035,.025,M.copper);}
    basket(4.35,.11,-.55,.72,.45,.54,false);
    // Display shelf top rows alternate recipe volumes, scent bottles, citrus bowls and pots.
    for(const [x,y,z] of [[1.6,1.18,-3.7],[3.7,1.93,-3.7],[1.8,2.68,-3.7]])pot(x,y,z,.52);
    book(3.65,.43,-3.55,.20,.41,M.cloth);book(3.93,.43,-3.55,.16,.53,M.mint);book(2.15,1.18,-3.52,.17,.39,M.pink);
    cyl(3.2,3.55,-3.75,.40,.24,.16,M.wood,12);for(const x of [2.96,3.18,3.4])citrus(x,3.62,-3.75,.12);
    basket(2.65,.1,-3.54,.8,.45,.4,true);basket(3.7,.1,-3.54,.65,.42,.4,false);
    // A low perimeter potting ledge follows the round conservatory instead of forming a square room.
    for(const [a,b] of [[-.88,-.48],[.48,.88]]){
      const mid=(a+b)/2,r=3.82,x=3+r*Math.cos(mid),z=r*Math.sin(mid),w=1.42;
      const bench=soft(x,.82,z,w,.12,.52,M.wood,true);bench.rotation.y=-mid-Math.PI/2;
      for(const t of [a+.05,b-.05]){const xx=3+r*Math.cos(t),zz=r*Math.sin(t);cyl(xx,.4,zz,.065,.065,.8,M.mint,8,true);pot(xx,.9,zz,.65);}
    }
    // Copper still: bolts, gauge, condenser rings and a receiving cup make the process visible.
    for(const y of [1.12,1.55]){ring(-7.15,y,4.05,.49,.026,M.copper,Math.PI/2);for(let j=0;j<6;j++){const a=j*Math.PI/3;leaf(-7.15+.49*Math.cos(a),y,4.05+.49*Math.sin(a),.028,S.paleMetal,1,1,1);}}
    cyl(-7.15,1.76,4.05,.13,.16,.08,M.cream,10);ball(-7.15,1.90,4.05,.07,M.copper);
    ring(-6.92,1.35,4.52,.13,.025,M.copper);leaf(-6.92,1.35,4.53,.105,S.paper,1,1,.12);beam([-6.92,1.35,4.55],[-6.86,1.41,4.55],.01,M.dark);
    for(const y of [2.2,2.55,2.9])ring(-7.15,y,4.05,.115,.022,S.paleMetal,Math.PI/2);
    cup(-6.4,1.02,4.05,.65);leaf(-6.4,1.28,4.05,.035,M.aqua,1,1.3,1);
    // Kitchen mise en place, cup rail and cloth on the drawer front.
    teapot(-2.85,1.15,-4.15,.72);cup(-2.3,1.15,-4.17,.8);soft(-1.5,1.16,-4.17,.72,.035,.5,M.wood);citrus(-1.65,1.19,-4.17,.13,true);
    beam([-3.8,2.45,-4.68],[-2,2.45,-4.68],.027,M.copper);
    for(const x of [-3.65,-3.15,-2.65]){ring(x,2.4,-4.68,.065,.015,M.dark);cyl(x,2.18,-4.62,.10,.09,.20,M.cream,10);ring(x+.12,2.2,-4.62,.055,.014,M.copper);}
    soft(-2.65,.81,-3.56,.39,.44,.035,M.cloth);for(let j=0;j<3;j++)box(-2.8+j*.15,.81,-3.53,.017,.40,.02,S.mintFabric);
    soft(-1.2,.808,3.1,.56,.018,1.0,M.cloth);teapot(-1.2,.82,3.1,.55);cup(-1.55,.82,3.08,.65);cup(-.84,.82,3.08,.65);
    for(const z of [1.85,4.3]){soft(-1.2,.49,z,.52,.11,.50,M.pink,false,.055);for(const x of [-1.38,-1.02])beam([x,.15,z-.14],[x,.15,z+.14],.025,M.mint);}
    // Layered fabrics are all below .1 m: clear floor, visible texture and restrained palette.
    soft(-4.7,.012,1.2,2.25,.025,1.62,M.cloth);soft(-4.7,.034,1.2,1.98,.014,1.39,S.aquaFabric);
    for(const z of [.48,1.92])for(let j=0;j<12;j++)box(-5.65+j*.17,.025,z,.04,.025,.18,S.linen);
    ring(1.8,.035,1.8,.75,.022,S.linen,Math.PI/2);
    soft(-3.8,4.214,1,2.75,.025,2.75,M.pink);soft(-3.8,4.24,1,2.48,.014,2.48,M.cloth);
    for(const x of [-5,-2.6])box(x,4.255,1,.045,.008,2.36,S.linen);
    for(let j=0;j<12;j++)box(-4.92+j*.2,4.23,2.42,.05,.02,.16,S.linen);
    // Daybed: scalloped headboard caps, independent pillows, folded quilt and bedside recipe stack.
    for(let j=0;j<7;j++){const x=-7.3+j*.3;box(x,5.05,4.79,.06,1,.07,M.aqua);leaf(x,5.58,4.79,.09,S.paleWood,1,.65,.5);}
    soft(-6.4,5.17,2.85,2.03,.11,.42,M.cloth);for(const x of [-7.22,-5.58])box(x,5.23,2.85,.025,.012,.38,M.pink);
    soft(-7.55,4.57,3.7,.55,.74,.65,M.aqua,true);soft(-7.55,4.98,3.7,.62,.09,.70,S.paleWood);ring(-7.55,4.65,4.04,.05,.012,M.copper);book(-7.55,5.04,3.7,.40,.38,M.pink,true);pot(-7.55,5.16,3.7,.4);
    openbook(-3.10,5.31,3.95,.85);cup(-2.48,5.3,4.08,.7);teapot(-3.75,5.3,4.17,.55);soft(-3.25,5.29,4.05,.36,.025,1.03,M.cloth);
    soft(-3.25,4.69,4.5,.63,.14,.56,M.wood,true);soft(-3.25,4.80,4.5,.56,.12,.5,M.pink,false,.06);for(const dx of [-.23,.23])for(const dz of [-.19,.19])box(-3.25+dx,4.4,4.5+dz,.06,.4,.06,M.wood,true);
    // Tall recipe library faces the loft; varied spines, jars, leaning note cards, and basket base.
    for(let row=0;row<3;row++)for(let j=0;j<3;j++){const z=1.1+j*.55,y=4.96+row*.65;box(-.52,y+.17,z,.03,.26,.21,[S.mintFabric,M.cloth,S.amberCover][j]);box(-.54,y+.17,z,.01,.025,.13,M.wood);}
    basket(-.48,4.2,3.35,.55,.48,.58,false);pot(-.4,6.5,2,.55);
    for(let j=0;j<4;j++){const z=-.15+j*.26;ring(-.4,6.04,z,.055,.012,M.copper,0,Math.PI/2);bloom(-.4,5.46,z,.07,M.lavender);}
    // Soft drapes and flower boxes sit beside, never across, the actual arch apertures.
    curtains(-6.45,1.05,4.70,1.3,1.95);curtains(-4.5,1.2,-4.71,1.8,2,Math.PI);
    curtains(-4,7.4,4.7,1.65,1.95);curtains(-4,7.4,-4.7,1.65,1.95,Math.PI);
    for(const [x,y,z,w] of [[-6.45,.92,4.67,1.3],[-4,7.27,4.67,1.45],[-4.5,1.08,-4.67,1.5]]){
      soft(x,y,z,w,.15,.3,M.mint);for(const dx of [-.4,0,.4])pot(x+dx,y+.08,z,.42);
    }
    // Flower garlands trace the real conservatory meridians, high above the 1.6 m circulation.
    for(const a of [-1.05,-.45,.5,1.05]){
      const r=4.06,x=3+r*Math.cos(a),z=r*Math.sin(a);vine([x,1.6,z],[x,4.25,z],15);
      vine([x,4.25,z],[3+3.55*Math.cos(a),6.65,3.55*Math.sin(a)],14);
    }
    for(const z of [-1.65,1.65])vine([.39,1.15,z],[.39,3.55,z],14);
    vine([.45,3.55,-1.65],[.45,4.0,1.65],16);vine([1.0,3.75,-3.6],[4.2,3.7,-3.6],17);
    vine([-.42,6.65,4.64],[-2.8,6.65,4.64],13);vine([-5.55,8.8,4.64],[-5.55,7.6,4.64],10);
    for(const [x,y,z,top] of [[5.55,3.5,1.95,5.6],[1.25,3.6,-2.9,5.5],[5.6,3.6,-1.6,5.6]]){
      pot(x,y,z,.75);for(const dx of [-.19,.19])beam([x+dx,y+.32,z],[x,top,z],.014,M.dark);vine([x,y+.48,z],[x,y-.7,z],8);
    }
    pot(5.7,0,2.7,.85);pot(5.8,0,-2.85,.85);basket(1.2,0,3.55,.7,.51,.62,true);
    // Pale grout follows the clipped circular floor, retaining the original walk mesh.
    for(let x=.6;x<7.1;x+=.8){const span=Math.sqrt(4.2*4.2-(x-3)*(x-3));box(x,.006,0,.015,.008,span*2,S.grout);}
    for(let z=-3.6;z<=3.6;z+=.8){const span=Math.sqrt(4.2*4.2-z*z),lo=Math.max(.34,3-span),hi=3+span;box((lo+hi)/2,.006,z,hi-lo,.008,.015,S.grout);}
    // Final density pass: shallow botanical studies and a drying rail above the rear stair landing.
    for(const [x,style] of [[-6.35,0],[-4.25,1],[-2.15,2]]){
      box(x,5.78,-4.95,1.28,1.08,.07,S.mintWood);box(x,5.78,-4.905,1.13,.93,.02,S.paper);
      if(style===1){
        const fruit=cyl(x,5.84,-4.88,.30,.30,.018,M.amber,12);fruit.rotation.x=Math.PI/2;
        for(let j=0;j<8;j++){const a=j*Math.PI/4;beam([x,5.84,-4.86],[x+.26*Math.cos(a),5.84+.26*Math.sin(a),-4.86],.009,S.paper);}
      }else{
        beam([x,5.46,-4.88],[x,6.07,-4.88],.015,M.leaf);
        for(let j=0;j<5;j++)leaf(x+(j%2?.14:-.14),5.53+j*.11,-4.88,.13,style?M.lime:M.leaf,1,.45,.12);
        if(style===2)bloom(x,6.08,-4.86,.10,M.pink);
      }
      for(let j=0;j<3;j++)box(x-.29+j*.22,5.38,-4.875,.15,.012,.01,M.wood);
    }
    beam([-6.9,6.78,-4.87],[-1.6,6.78,-4.87],.028,M.wood);
    for(let j=0;j<8;j++){
      const x=-6.5+j*.64;beam([x,6.78,-4.85],[x,6.49,-4.85],.012,M.dark);
      for(let k=0;k<3;k++)leaf(x+(k-1)*.07,6.43+k*.03,-4.85,.12,M.leaf,.65,1,.2);
      ring(x,6.52,-4.83,.055,.012,S.linen);
    }
    box(-7.94,6.14,3.5,.07,1.25,1.14,M.wood);box(-7.89,6.14,3.5,.025,1.1,.99,S.paper);
    beam([-7.87,5.76,3.5],[-7.87,6.48,3.5],.018,M.leaf);
    for(let j=0;j<5;j++)leaf(-7.85,5.87+j*.12,3.5+(j%2?.16:-.16),.14,M.lime,.14,.46,1);
    box(-.10,5.94,-2.2,.065,1.12,1.48,M.wood);box(-.145,5.94,-2.2,.02,.97,1.33,S.paper);
    for(const [z,m] of [[-2.54,S.pinkPaper],[-1.94,S.aquaPaper]]){
      const points=[[5.65,z-.17],[5.88,z-.20],[6.03,z-.06],[6.25,z-.06],[6.25,z+.06],[6.03,z+.06],[5.88,z+.20],[5.65,z+.17],[5.65,z-.17]];
      for(let j=0;j<points.length-1;j++)beam([-.165,...points[j]],[ -.165,...points[j+1]],.017,m);
      beam([-.17,5.78,z-.13],[-.17,5.78,z+.13],.012,m);
    }
    for(let j=0;j<3;j++)box(-.17,5.50,-2.6+j*.33,.012,.012,.21,M.wood);
    // Round three: Jingjing's floor is a sequence of tea, fruit and growing corners.
    // Shared pale oak stays quieter than the honey joinery; all walk slabs stay unchanged.
    function vignette(name,fn){const start=g.children.length;fn();for(const o of g.children.slice(start))o.userData.corner=name;}
    for(let j=0;j<23;j++)box(-4,.012,-4.78+j*.427,7.94,.014,.41,j%4===0?paleOakShade:paleOak);
    for(let j=0;j<14;j++)box(-2.9,4.209,-1.07+j*.434,5.74,.014,.418,j%3===0?paleOakShade:paleOak);
    function cupboard(x,y,z,w,h,d){
      soft(x,y+h/2,z,w,h,d,M.aqua,true);soft(x,y+h+.05,z,w+.08,.10,d+.08,paleOakShade,true);
      for(const side of [-1,1]){soft(x+side*w*.24,y+h*.5,z+d/2+.025,w*.43,h*.7,.06,S.paleWood);ring(x+side*.09,y+h*.56,z+d/2+.07,.045,.012,M.copper);}
    }
    vignette('樓梯下的果皮分類站',()=>{
      cupboard(-6.8,0,-.95,1.62,.86,2.2);
      basket(-7.18,.96,-1.55,.65,.44,.6,true);basket(-6.5,.96,-.8,.55,.42,.55,false);
      bottle(-7.1,.96,-.35,.62,M.amber);bottle(-6.55,.96,-1.6,.68,M.aqua);
      basket(-6.8,0,.7,1.40,.44,.75,true);pot(-7.45,0,-2.7,.9);
    });
    vignette('屋中央的柑橘備料島',()=>{
      cupboard(-4.45,0,-1.8,1.46,.84,1.85);
      soft(-4.45,.98,-1.8,1.60,.14,2.02,paleOakShade,true);
      soft(-4.45,1.06,-1.8,.58,.02,1.65,M.cloth);
      openbook(-4.45,1.09,-2.36,.65);teapot(-4.5,1.09,-1.15,.65);
      for(const [x,z,r,cut] of [[-4.8,-1.8,.16,true],[-4.25,-1.85,.14,false],[-4.2,-1.45,.12,true]])citrus(x,1.07,z,r,cut);
      bottle(-4.85,1.09,-2.1,.55,M.aqua);cup(-4.05,1.09,-1.08,.7);
      basket(-4.45,.12,-1.8,.8,.46,.65,true);
    });
    vignette('玄關內側的候茶椅',()=>{
      soft(-4.95,.29,1.9,.85,.50,1.0,M.wood,true);soft(-4.95,.61,1.9,.84,.18,.94,M.pink,true,.065);
      soft(-4.95,.92,1.5,.88,.65,.20,S.aquaFabric,true,.065);soft(-4.95,.92,1.68,.48,.39,.17,S.linen,false,.065);
      soft(-4.0,.22,1.9,.5,.44,.55,M.wood);soft(-4.0,.48,1.9,.52,.08,.57,paleOakShade,true);cup(-4.0,.54,1.9,.7);   // 整組往左 1.1 m：出生點正前方留出走道
      basket(-2.3,0,4.4,.7,.43,.62,false);book(-2.3,.47,4.4,.40,.34,M.pink,true);
      cupboard(-.7,0,.95,.65,.66,.65);teapot(-.7,.77,.95,.5);cup(-.7,.77,.73,.6);
      cyl(-4.3,.33,1,.22,.18,.66,M.mint,10,true);pot(-4.3,.69,1,.65);
    });
    vignette('廚房旁的茶葉熟成櫃',()=>{
      cupboard(-.83,0,-2.65,1.03,1.02,1.45);
      for(let j=0;j<3;j++)bottle(-1.15+j*.31,1.13,-2.75,.65,[M.pink,M.amber,M.aqua][j]);
      pot(-.65,1.13,-2.2,.55);basket(-.8,0,-1.58,.85,.43,.50,false);
    });
    vignette('溫室後側的果皮聞香檯',()=>{
      cupboard(4.75,0,-2.77,1.65,.78,.94);
      for(let j=0;j<3;j++){bottle(4.18+j*.55,.90,-2.8,.7,[M.pink,M.amber,M.aqua][j]);citrus(4.2+j*.55,.90,-2.45,.12,j%2===0);}
      pot(5.7,0,-2.15,1.05);basket(4.7,.12,-2.8,.8,.42,.65,true);
    });
    vignette('溫室中央的育苗推車',()=>{
      cupboard(5.6,0,.25,1.12,.74,1.72);
      for(const x of [5.19,6.01])for(const z of [-.35,.85]){const o=cyl(x,.13,z,.10,.10,.08,M.copper,8);o.rotation.x=Math.PI/2;}
      for(const [x,z,s] of [[5.3,-.2,.78],[5.85,.15,.95],[5.4,.75,.65]])pot(x,.85,z,s);
      bottle(5.95,.85,.82,.55,M.aqua);soft(5.1,.99,.45,.04,.25,.23,S.paper);box(5.075,.99,.45,.012,.025,.12,S.mintPaper);
      soft(4.7,.3,2.4,.76,.60,.78,S.mintWood,true);pot(4.7,.64,2.4,.9);
      cyl(1.4,.33,1.15,.24,.20,.66,M.mint,10,true);pot(1.4,.69,1.15,.72);
      cyl(4.2,.33,1.75,.17,.15,.66,M.mint,10,true);pot(4.2,.69,1.75,.55);
    });
    vignette('閣樓的薄荷手帳小景',()=>{
      cupboard(-4.45,4.2,1.1,1.42,.64,.95);
      soft(-4.45,4.97,1.1,1.55,.12,1.05,paleOakShade,true);openbook(-4.45,5.05,1.13,.75);
      cup(-3.91,5.05,.89,.7);pot(-4.99,5.05,1.18,.55);bottle(-4.95,5.05,.76,.45,M.amber);
      basket(-5.2,4.2,-.1,.66,.49,.64,false);book(-5.2,4.74,-.1,.35,.29,M.lavender,true);
      soft(-4.7,4.44,2.1,.75,.42,.65,M.wood);soft(-4.7,4.70,2.1,.76,.15,.66,M.cloth,true,.065);
    });
    // 備料島燒瓶燈與廚房短層板，保留後窗右側的空牆。
    flaskLamp(-4.45,2.05,-1.8,2.8636);
    box(-2.725,2.84,-4.62,1.65,.12,.52,paleOakShade);box(-2.725,2.765,-4.338,1.65,.13,.035,paleOakShade);
    for(const x of [-3.3,-2.15])box(x,2.65,-4.83,.06,.38,.07,M.copper);
    Object.assign(g.userData,{
      // 廚房燈槽與檯面下燈鋪暖光，瓶架三層標籤光最清楚，閣樓植物畫保留焦點。
      glow:[
        {kind:'cove',a:[-3.7,3.52,-4.88],b:[-1.3,3.52,-4.88],n:[0,1],c:'#f6f1e4'},
        {kind:'under',a:[-3.45,2.768,-4.4],b:[-2,2.768,-4.4]},
        {kind:'under',a:[1.5,1.798,-3.515],b:[4.1,1.798,-3.515]},
        {kind:'kick',a:[-4,0.12,-3.67],b:[-1.8,0.12,-3.67],n:[0,1]},
        {kind:'cove',a:[-0.12,6.65,-2.95],b:[-0.12,6.65,-1.5],n:[-1,0],c:'#fff2ce'},
        {kind:'under',a:[-0.47,6.148,1.2],b:[-0.47,6.148,2.8]},
        {kind:'under',a:[1.5,1.048,-3.49],b:[3.6,1.048,-3.49]},
        {kind:'under',a:[1.5,2.548,-3.515],b:[4.1,2.548,-3.515]},
        {kind:'spot',p:[-2.55,3.7,-3.5],t:[-2.55,1.145,-4.15],r:0.8},
        {kind:'spot',p:[-6.7,8,2.9],t:[-4.9,6.35,4.735],r:0.6}
      ],
      spawn:[-3.2,0,3.4,Math.PI],exit:[-3.2,4.85,.62],host:[-2,0,-.3,0],cols,sun:[.95,.9,.35],
      lights:[[-3.2,3.0375,0.3,'#ffd8ad',0.85,0.85],[-4.45,2.25,-1.8,'#ffd8ad',0.95,0.8],[-3.2,6.8375,1,'#ffd8ad',0.9,0.85],[-6.9,4.4875,-2.4,'#ffd8ad',0.8,0.8],[2.55,3.8635,2.9,'#ffd8ad',0.8,0.8],[5.7,2.975,-2.2,'#ffd8ad',0.8,0.8]],
      gifts:[[-3.5,0,.1,0],[-2,0,-2.1,0],[1.8,0,2.2,0],[-3.5,4.2,-.1,0],[-1,4.2,2,0]],
      spots:[
        {x:3.4,y:0,z:.7,r:1.15,kind:'study',label:'讀讀配方',name:'半圓果茶配方台',lines:['啵啵，先核對材料和標籤，再開始吧。','同樣體積的茶，糖量不同，濃度也不同。','我把用量記好了，一起試三個小問題。'],alone:['配方簿用粉、黃、綠三色分好欄位。','旁邊的量杯已經洗淨晾乾。']},
        {x:3.1,y:0,z:2.65,r:1.1,kind:'look',label:'看看茶攤',name:'瓶燈下的果茶小櫃',lines:['今天的材料都確認過了，可以開張啦。','杯子自然晾乾，是水慢慢蒸發了。','我留一杯暖暖的，也留一段不趕的時間。'],alone:['小櫃接著外頭的果茶攤，瓶燈暖暖的。','食譜邊角記著朋友喜歡的甜度。']},
        {x:-5.7,y:0,z:4.05,r:1.05,kind:'look',label:'看看蒸餾器',name:'西側銅製蒸餾器',lines:['這根彎銅管，一路接到屋外的小爐子。','水蒸氣冷卻後，會凝結成小水滴。','今天先看我的紀錄，不急著開工喔。'],alone:['銅管轉了個圓彎，接住透明的小滴管。','紀錄簿上畫著蒸發與凝結的箭頭。']},
        {x:2.8,y:0,z:-2.55,r:1.05,kind:'look',label:'看看瓶架',name:'薄荷框旁的標籤瓶架',lines:['每瓶的日期都朝外，明天的我才不會猜。','這排是果皮香氣，觀察材料另外收好了。','檸檬和橘子的香氣，來自不同的分子。'],alone:['彩色小瓶都有軟木塞和整齊的標籤。','木架旁貼著一張慢慢聞香的果皮小畫。']},
        {x:-3.25,y:4.2,z:2.8,r:1.1,kind:'look',label:'翻翻食譜',name:'山牆窗下的配方書桌',lines:['我把每次用量寫在這裡，連沒成功的也留。','比較味道前，水量和溫度要先固定。','這一圈杯痕，是我們聊天聊太久的記號。'],alone:['食譜夾著果茶色的書籤，字寫得圓圓的。','窗光落在一圈淡淡的茶杯痕上。']},
        {x:-1.55,y:4.2,z:.2,r:1.05,kind:'look',label:'看看乾香草',name:'閣樓的薄荷乾燥架',lines:['洗好的薄荷掛高一點，風比較走得過去。','水分慢慢離開，葉子的觸感也會改變。','收好今天的觀察，剩下時間陪你聊聊。'],alone:['薄荷束一束束掛好，下面的小盤接住碎葉。','便條寫著日期，也畫了一張開心的笑臉。']}
      ]
    });
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
