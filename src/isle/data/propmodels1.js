/* 潮汐小島 · 程式化模型（img2threejs 重建）：路燈、長椅、信箱、旗幟、花台。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};

  I.PROPMODELS['lamp'] = function(THREE,kit){
  const STAGE=7,root=new THREE.Group();root.name='tidal-lamp';
  const buckets=new Map(),cache=new Map(),PI=Math.PI,TAU=PI*2;
  const material=(c,o={},kind)=>{const k=JSON.stringify([c,o,kind]);if(!cache.has(k))cache.set(k,kit.mat(c,o,kind));return cache.get(k);};
  const neutral=STAGE<3?material('#a8a292',{roughness:.84}):null;
  const M={stone:neutral||material('#f0dec1',{roughness:.88},'stone'),stoneShade:neutral||material('#d8c7a9',{roughness:.9},'stone'),navy:neutral||material('#263754',{roughness:.53,metalness:.36}),roof:neutral||material('#334e73',{roughness:.7},'roof'),gold:neutral||material('#d2a24e',{roughness:.38,metalness:.72}),goldShade:neutral||material('#997135',{roughness:.49,metalness:.62}),core:neutral||kit.win(),glass:neutral||kit.win()};
  if(!neutral){M.core.color.set('#ffd08a');M.core.emissive.set('#ffbf68');M.core.emissiveIntensity=.32;M.core.roughness=.3;M.glass.transparent=true;M.glass.opacity=.15;M.glass.depthWrite=false;M.glass.side=THREE.DoubleSide;}
  function add(geo,m,part){if(geo.index){const q=geo.toNonIndexed();geo.dispose();geo=q;}if(STAGE>=7)part=m===M.core?'crystal':m===M.glass?'glass':m===M.gold?'brass':m===M.goldShade?'brass-shade':m===M.navy?'navy':m===M.roof?'slate':m===M.stone?'ivory':'ivory-shade';const key=part+'|'+m.uuid;if(!buckets.has(key))buckets.set(key,{m,part,list:[]});buckets.get(key).list.push(geo);}
  function put(geo,m,part,pos=[0,0,0],rot=[0,0,0]){geo.rotateX(rot[0]);geo.rotateY(rot[1]);geo.rotateZ(rot[2]);geo.translate(...pos);add(geo,m,part);}
  const cyl=(rt,rb,h,y,m,part,x=0,n=12)=>put(new THREE.CylinderGeometry(rt,rb,h,n,1),m,part,[x,y,0]);
  function rod(a,b,r,m,part,n=6){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),g=new THREE.CylinderGeometry(r,r,d.length(),n,1);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));g.translate(...va.add(vb).multiplyScalar(.5).toArray());add(g,m,part);}
  function tube(points,r,m,part,segs=12){add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segs,r,6,false),m,part);}
  function poly(points,depth,m,part,pos=[0,0,0],bevel=0){const s=new THREE.Shape();points.forEach((v,i)=>i?s.lineTo(...v):s.moveTo(...v));s.closePath();put(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:!!bevel,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:16}),m,part,pos);}
  function diamond(x,y,z,rx,ry,rz,m,part){const v=[[x,y+ry,z],[x+rx,y,z],[x,y,z+rz],[x-rx,y,z],[x,y,z-rz],[x,y-ry,z]],p=[];for(let i=0;i<4;i++)for(const j of [0,1+(i+1)%4,1+i,5,1+i,1+(i+1)%4])p.push(...v[j]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();add(g,m,part);}
  function hexRing(x,y,r,w,h,m,part){const p=[],idx=[],n=6;for(let i=0;i<n;i++){const a=i*TAU/n+PI/6,c=Math.cos(a),s=Math.sin(a);p.push(x+(r-w)*c,y-h/2,(r-w)*s,x+r*c,y-h/2,r*s,x+(r-w)*c,y+h/2,(r-w)*s,x+r*c,y+h/2,r*s);}for(let i=0;i<n;i++){const a=i*4,b=((i+1)%n)*4;idx.push(a+1,b+1,b+3,a+1,b+3,a+3,a+2,a+3,b+3,a+2,b+3,b+2,a,b,a+1,a+1,b,b+1,a,a+2,b+2,a,b+2,b);}for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(g,m,part);}
  // Primary masses remain present even in blockout.
  cyl(.28,.29,.055,.0275,M.stoneShade,'base',0,8);
  cyl(.235,.28,.12,.11,M.stone,'base',0,8);
  cyl(.225,.24,.045,.1925,M.stone,'base',0,8);
  cyl(.085,.14,.18,.3,M.navy,'column');
  cyl(.055,.085,.52,.62,M.navy,'column');
  cyl(.048,.057,1.98,1.81,M.navy,'column');
  cyl(.066,.057,.14,2.86,M.navy,'column');
  rod([0,2.91,0],[.28,3.00,0],.032,M.navy,'support');
  cyl(.205,.18,.055,2.285,M.goldShade,'lantern',.28,6);
  cyl(.04,.25,.17,2.89,M.roof,'hood',.28,6);
  if(STAGE<2)cyl(.092,.092,.36,2.55,M.core,'core',.28,6);
  if(STAGE>=1){
    // Closed structural load path: mast -> braced arm -> hanging ring -> roof.
    tube([[0,2.70,0],[.06,2.84,0],[.17,2.96,0],[.29,3.00,0]],.022,M.navy,'support',10);
    rod([.28,2.96,0],[.28,3.01,0],.014,M.gold,'support');
    put(new THREE.TorusGeometry(.034,.010,5,12),M.gold,'support',[.28,2.957,0]);
    for(let i=0;i<6;i++){const a=i*TAU/6+PI/6,x=.28+.185*Math.cos(a),z=.185*Math.sin(a);rod([x,2.30,z],[x,2.80,z],.015,M.gold,'lantern');}
    hexRing(.28,2.31,.205,.025,.035,M.gold,'lantern');hexRing(.28,2.795,.23,.023,.032,M.gold,'lantern');
  }
  if(STAGE>=2){
    // The crystal replaces the blockout cylinder with a six-sided bipyramid.
    for(const b of buckets.values())if(b.part==='core'){for(const g of b.list)g.dispose();b.list.length=0;}
    const pts=[],inds=[],n=6;pts.push(.28,2.76,0,.28,2.34,0);for(let i=0;i<n;i++){const a=i*TAU/n;pts.push(.28+.089*Math.cos(a),2.55,.089*Math.sin(a));}for(let i=0;i<n;i++)inds.push(0,2+(i+1)%n,2+i,1,2+i,2+(i+1)%n);const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));cg.setIndex(inds);const crystalGeo=cg.toNonIndexed();cg.dispose();crystalGeo.computeVertexNormals();add(crystalGeo,M.core,'core');
    for(const [y,r] of [[.24,.135],[.38,.09],[.85,.078],[1.02,.068],[2.07,.075],[2.14,.071],[2.83,.078],[2.94,.073]])cyl(r,r*.93,.035,y,M.gold,'trim');
    cyl(.105,.085,.07,.92,M.goldShade,'trim');cyl(.075,.09,.055,2.105,M.goldShade,'trim');
    hexRing(.28,2.813,.25,.028,.027,M.gold,'hood');
    for(let i=0;i<6;i++){const a=i*TAU/6+PI/6;rod([.28+.245*Math.cos(a),2.825,.245*Math.sin(a)],[.28+.04*Math.cos(a),2.974,.04*Math.sin(a)],.008,M.gold,'hood',5);}
    cyl(.065,.037,.045,2.984,M.gold,'hood',.28,8);
    cyl(.02,.055,.08,2.226,M.gold,'lantern',.28,6);
    diamond(.28,2.155,0,.027,.07,.027,M.gold,'lantern');
    // Small geometry-only crescent finial crowns the column without extending above 3.2m.
    const cres=[];for(let i=0;i<=20;i++){const a=(58+i*244/20)*PI/180;cres.push([Math.cos(a)*.087,Math.sin(a)*.087]);}for(let i=20;i>=0;i--){const a=(58+i*244/20)*PI/180;cres.push([.031+Math.cos(a)*.071,.006+Math.sin(a)*.071]);}
    cyl(.028,.052,.09,2.99,M.gold,'finial');poly(cres,.024,M.gold,'finial',[0,3.102,-.012],.002);
  }
  if(STAGE>=4){
    for(let i=0;i<6;i++){const a=i*TAU/6+PI/6,b=(i+1)*TAU/6+PI/6,x=.28+.183*Math.cos(a),z=.183*Math.sin(a),xx=.28+.183*Math.cos(b),zz=.183*Math.sin(b),pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute([x,2.328,z,xx,2.328,zz,xx,2.779,zz,x,2.779,z],3));pg.setIndex([0,1,2,0,2,3]);pg.computeVertexNormals();add(pg,M.glass,'glass');}
    for(let i=0;i<6;i++){const a=i*TAU/6+PI/6,x=.28+.186*Math.cos(a),z=.186*Math.sin(a);diamond(x,2.55,z,.022,.048,.022,M.gold,'lantern');}
    for(const z of [-.054,.054])rod([0,.45,z],[0,.78,z],.006,M.goldShade,'column',5);
    diamond(0,.94,.08,.03,.07,.012,M.gold,'trim');
    cyl(.045,.07,.032,2.34,M.gold,'core',.28,8);
  }
  // Merge within semantic assemblies; material and name remain stable for picking.
  for(const {m,part,list}of buckets.values()){if(!list.length)continue;let len=0;for(const g of list)len+=g.attributes.position.array.length;const p=new Float32Array(len),n=new Float32Array(len);let o=0;for(const g of list){p.set(g.attributes.position.array,o);n.set(g.attributes.normal.array,o);o+=g.attributes.position.array.length;g.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('normal',new THREE.BufferAttribute(n,3));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,m);mesh.name=part+'-'+(m===M.gold?'brass':m===M.navy?'navy':m===M.core?'warm':'surface');mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  return root;
};

  I.PROPMODELS['bench'] = function(THREE,kit){
  const root=new THREE.Group();root.name='tidal-bench';
  const STAGE=7, buckets=new Map();
  const mat=(c,o={},k)=>kit.mat(STAGE<3?'#b4b0a6':c,o,k);
  const M={stone:mat('#ece3d2',{roughness:.88},'stone'),stoneShade:mat('#d5c7af',{roughness:.93},'stone'),wood:mat('#986642',{roughness:.78},'wall'),woodLight:mat('#b78655',{roughness:.76},'wall'),iron:mat('#283449',{roughness:.48,metalness:.55}),blue:mat('#30496c',{roughness:.86}),gold:mat('#d0a34f',{roughness:.38,metalness:.7})};
  function add(geo,m){if(!geo.getAttribute('normal'))geo.computeVertexNormals();if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(geo.index?geo.toNonIndexed():geo);}
  function at(geo,x,y,z,rx=0,ry=0,rz=0){geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));return geo;}
  function block(x,y,z,w,h,d,m,rx=0,ry=0,rz=0,r=.005){
    let geo;if(STAGE<2||r===0)geo=new THREE.BoxGeometry(w,h,d);else{r=Math.min(r,w/3,h/3,d/3);const s=new THREE.Shape(),a=w/2-r,b=h/2-r;s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();geo=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:2});geo.translate(0,0,-(d-2*r)/2);}add(at(geo,x,y,z,rx,ry,rz),m);
  }
  function extrude(s,x,y,z,d,m,bevel=0){const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:12});geo.translate(0,0,-d/2);add(at(geo,x,y,z),m);}
  function star(x,y,z,r,m=M.gold){const s=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/2+i*Math.PI/4,rr=i%2?r*.28:r,xx=Math.cos(a)*rr,yy=Math.sin(a)*rr*(i%2?1:1.18);if(i)s.lineTo(xx,yy);else s.moveTo(xx,yy);}s.closePath();extrude(s,x,y,z,.008,m,.0005);}
  function crescent(x,y,z,r,m=M.gold){const s=new THREE.Shape(),a=Math.PI*.32;const ux=Math.cos(a)*r,uy=Math.sin(a)*r,dx=r*.42,ri=Math.hypot(ux-dx,uy);s.moveTo(ux,uy);s.absarc(0,0,r,a,Math.PI*2-a,false);const lo=Math.atan2(-uy,ux-dx),hi=Math.atan2(uy,ux-dx);s.absarc(dx,0,ri,lo,hi,true);s.closePath();extrude(s,x,y,z,.007,m,.0003);}
  function path(points,r,m,steps=22){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(new THREE.TubeGeometry(curve,steps,r,6,false),m);}
  function rod(a,b,r,m,segments=8){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());const geo=new THREE.CylinderGeometry(r,r,start.distanceTo(end),segments,1);geo.applyMatrix4(new THREE.Matrix4().compose(start.clone().add(end).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)));add(geo,m);}
  function finish(){let i=0;for(const [m,list]of buckets){let count=0;for(const geo of list)count+=geo.getAttribute('position').count;const pos=new Float32Array(count*3),norm=new Float32Array(count*3),uv=new Float32Array(count*2);let off=0;for(const geo of list){const p=geo.getAttribute('position'),n=geo.getAttribute('normal'),u=geo.getAttribute('uv');pos.set(p.array,off*3);norm.set(n.array,off*3);if(u)uv.set(u.array,off*2);off+=p.count;geo.dispose();}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(norm,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,m);mesh.name='bench-'+Object.keys(M).find(k=>M[k]===m)+'-batch';mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);i++;}return root;}

  // Load-bearing ivory end supports; front is +Z.
  for(const x of [-.77,.77]){
    block(x,.035,0,.27,.07,.61,M.stoneShade,0,0,0,.009);
    block(x,.085,0,.235,.045,.56,M.stone,0,0,0,.007);
    block(x,.245,0,.19,.30,.48,M.stone,0,0,0,.008);
    block(x,.405,0,.27,.075,.60,M.stone,0,0,0,.01);
    if(STAGE>=1){
      const s=new THREE.Shape();s.moveTo(-.073,-.1);s.lineTo(.073,-.1);s.lineTo(.073,.018);s.absarc(0,.018,.073,0,Math.PI,false);s.closePath();extrude(s,x,.22,.247,.012,M.blue,.002);
      if(STAGE>=4){crescent(x-.012,.213,.261,.048);star(x+.013,.216,.271,.032);}
    }
  }
  // Five wide slats. The upper seat plane is exactly y=0.45 for avatar placement.
  if(STAGE===0)block(0,.429,.025,1.58,.042,.47,M.wood,0,0,0,0);
  else for(let i=0;i<5;i++)block(0,.429,-.195+i*.102,1.58,.042,.094,i%2?M.woodLight:M.wood,0,0,0,.004);
  // Three broad back boards follow a shallow center rise instead of narrow rails.
  for(let j=0;j<3;j++){
    const cy=.568+j*.132;
    if(STAGE<2)block(0,cy,-.245,1.55,.108,.047,M.wood,0,0,0,0);
    else{const s=new THREE.Shape(),w=.775,h=.052;for(let i=0;i<=8;i++){const x=-w+i*w/4,y=-h+.016*(1-(x/w)**2);if(i)s.lineTo(x,y);else s.moveTo(x,y);}for(let i=8;i>=0;i--){const x=-w+i*w/4;s.lineTo(x,h+.016*(1-(x/w)**2));}s.closePath();extrude(s,0,cy,-.245,.042,j===1?M.woodLight:M.wood,.004);}
    if(STAGE>=4)for(const x of [-.683,.683]){const geo=new THREE.SphereGeometry(.012,8,5);geo.scale(1,1,.5);add(at(geo,x,cy,-.214),M.gold);}
  }
  // The side iron is a continuous broad arc with a front spiral and rear crest.
  for(const x of [-.77,.77]){
    if(STAGE===0){block(x,.7,-.26,.045,.53,.05,M.iron,0,0,0,0);block(x,.62,0,.05,.05,.49,M.iron,0,0,0,0);}
    else{
      path([[x,.418,-.26],[x,.64,-.26],[x,.87,-.275],[x,.948,-.285],[x,.964,-.245],[x,.935,-.218],[x,.908,-.234]],.021,M.iron,24);
      const pts=[];const zc=.205,yc=.535;for(let i=0;i<=14;i++){const a=-Math.PI*.15+i/14*Math.PI*1.65,r=.022+.051*i/14;pts.push([x,yc+r*Math.sin(a),zc+r*Math.cos(a)]);}pts.push([x,.645,.267],[x,.688,.18],[x,.677,.065],[x,.646,-.075],[x,.675,-.18],[x,.74,-.254]);path(pts,.022,M.iron,36);
    }
    if(STAGE>=4){block(x,.449,.205,.071,.018,.074,M.gold,0,0,0,.003);block(x,.449,-.263,.065,.018,.073,M.gold,0,0,0,.003);rod([x,.672,.148],[x,.677,.105],.025,M.gold);rod([x,.688,-.19],[x,.73,-.24],.025,M.gold);}
  }
  return finish();
};

  I.PROPMODELS['mailbox'] = function(THREE,kit){
  const root=new THREE.Group();root.name='tidal-mailbox';
  const STAGE=7, buckets=new Map();
  const mat=(c,o={},k)=>kit.mat(STAGE<3?'#b4b0a6':c,o,k);
  const M={stone:mat('#ece3d2',{roughness:.88},'stone'),stoneShade:mat('#d5c7af',{roughness:.93},'stone'),wood:mat('#986642',{roughness:.78},'wall'),iron:mat('#283449',{roughness:.48,metalness:.55}),blue:mat('#30496c',{roughness:.86}),gold:mat('#d0a34f',{roughness:.38,metalness:.7}),roof:mat('#3f5d88',{roughness:.68},'roof'),flag:mat('#5476a6',{roughness:.86})};
  function add(geo,m){if(!geo.getAttribute('normal'))geo.computeVertexNormals();if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(geo.index?geo.toNonIndexed():geo);}
  function at(geo,x,y,z,rx=0,ry=0,rz=0){geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));return geo;}
  function block(x,y,z,w,h,d,m,rx=0,ry=0,rz=0,r=.005){
    let geo;if(STAGE<2||r===0)geo=new THREE.BoxGeometry(w,h,d);else{r=Math.min(r,w/3,h/3,d/3);const s=new THREE.Shape(),a=w/2-r,b=h/2-r;s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();geo=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:2});geo.translate(0,0,-(d-2*r)/2);}add(at(geo,x,y,z,rx,ry,rz),m);
  }
  function extrude(s,x,y,z,d,m,bevel=0){const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:12});geo.translate(0,0,-d/2);add(at(geo,x,y,z),m);}
  function star(x,y,z,r,m=M.gold){const s=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/2+i*Math.PI/4,rr=i%2?r*.28:r,xx=Math.cos(a)*rr,yy=Math.sin(a)*rr*(i%2?1:1.18);if(i)s.lineTo(xx,yy);else s.moveTo(xx,yy);}s.closePath();extrude(s,x,y,z,.008,m,.0005);}
  function crescent(x,y,z,r,m=M.gold){const s=new THREE.Shape(),a=Math.PI*.32;const ux=Math.cos(a)*r,uy=Math.sin(a)*r,dx=r*.42,ri=Math.hypot(ux-dx,uy);s.moveTo(ux,uy);s.absarc(0,0,r,a,Math.PI*2-a,false);const lo=Math.atan2(-uy,ux-dx),hi=Math.atan2(uy,ux-dx);s.absarc(dx,0,ri,lo,hi,true);s.closePath();extrude(s,x,y,z,.007,m,.0003);}
  function path(points,r,m,steps=22){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(new THREE.TubeGeometry(curve,steps,r,6,false),m);}
  function rod(a,b,r,m,segments=8){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());const geo=new THREE.CylinderGeometry(r,r,start.distanceTo(end),segments,1);geo.applyMatrix4(new THREE.Matrix4().compose(start.clone().add(end).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)));add(geo,m);}
  function finish(){let i=0;for(const [m,list]of buckets){let count=0;for(const geo of list)count+=geo.getAttribute('position').count;const pos=new Float32Array(count*3),norm=new Float32Array(count*3),uv=new Float32Array(count*2);let off=0;for(const geo of list){const p=geo.getAttribute('position'),n=geo.getAttribute('normal'),u=geo.getAttribute('uv');pos.set(p.array,off*3);norm.set(n.array,off*3);if(u)uv.set(u.array,off*2);off+=p.count;geo.dispose();}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(norm,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,m);mesh.name='mailbox-'+Object.keys(M).find(k=>M[k]===m)+'-batch';mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);i++;}return root;}

  // Stepped ground plinth and a continuous column reaching the box underside.
  block(0,.025,0,.31,.05,.31,M.stoneShade,0,0,0,.008);
  block(0,.073,0,.285,.05,.285,M.stone,0,0,0,.007);
  block(0,.121,0,.245,.05,.245,M.stone,0,0,0,.006);
  block(0,.169,0,.207,.05,.207,M.gold,0,0,0,.004);
  block(0,.395,0,.145,.42,.145,M.stone,0,0,0,.005);
  block(0,.611,0,.19,.05,.19,M.stone,0,0,0,.007);
  block(0,.662,0,.225,.06,.225,M.stone,0,0,0,.008);
  block(0,.707,0,.27,.04,.27,M.stoneShade,0,0,0,.006);
  if(STAGE>=1){block(0,.398,.075,.07,.30,.01,M.blue,0,0,0,.004);if(STAGE>=4)star(0,.405,.084,.033);}
  // House box is continuously supported. Gable is a solid triangular extrusion.
  block(0,.927,0,.326,.407,.30,M.stone,0,0,0,.008);
  const gable=new THREE.Shape();gable.moveTo(-.165,0);gable.lineTo(.165,0);gable.lineTo(0,.17);gable.closePath();extrude(gable,0,1.125,0,.302,M.stone);
  if(STAGE>=1){
    for(const x of [-.157,.157])for(const z of [-.149,.149])block(x,.928,z,.037,.408,.039,M.wood,0,0,0,.004);
    for(const z of [-.157,.157]){block(0,.744,z,.35,.045,.033,M.wood,0,0,0,.004);for(const side of [-1,1])rod([side*.169,1.13,z],[0,1.3,z],.015,M.wood,6);}
    block(0,.909,.155,.267,.307,.012,M.stoneShade,0,0,0,.003);block(0,.918,.164,.252,.289,.014,M.stone,0,0,0,.003);
    // Inset slot: a dark backed recess with a thick gold perimeter, no false transparency.
    block(0,1.067,.174,.237,.041,.011,M.iron,0,0,0,.003);
    block(0,1.094,.182,.257,.013,.018,M.gold,0,0,0,.003);block(0,1.04,.182,.257,.013,.018,M.gold,0,0,0,.003);for(const x of [-.123,.123])block(x,1.067,.182,.014,.043,.018,M.gold,0,0,0,.003);
    if(STAGE>=4){const s=new THREE.Shape();s.moveTo(-.032,0);s.lineTo(.032,0);s.absarc(0,0,.032,0,-Math.PI,true);s.closePath();extrude(s,0,1.016,.184,.014,M.gold,.001);crescent(-.015,.913,.186,.058);star(.018,.933,.193,.036);}
  }
  // Two pitched roof solids, each with three legible slate courses.
  const theta=Math.atan2(.185,.215),slope=Math.hypot(.215,.185);
  for(const side of [-1,1]){
    block(side*.1075,1.2175,0,slope+.012,.026,.377,M.roof,0,0,-side*theta,.004);
    if(STAGE>=2)for(let j=0;j<3;j++){const t=(j+.5)/3,x=side*.215*t,y=1.31-.185*t+.017;for(const z of [-.094,.094])block(x,y,z,(slope/3)+.005,.012,.18,j%2?M.blue:M.roof,0,0,-side*theta,.002);}
    if(STAGE>=4){rod([side*.219,1.125,.195],[0,1.315,.195],.009,M.gold,6);rod([side*.219,1.125,-.195],[0,1.315,-.195],.009,M.gold,6);}
  }
  rod([0,1.322,-.197],[0,1.322,.197],.013,M.blue,6);
  if(STAGE>=4){rod([0,1.319,.173],[0,1.36,.173],.015,M.gold,8);const geo=new THREE.OctahedronGeometry(.027);geo.scale(.6,1.3,.6);add(at(geo,0,1.392,.173),M.gold);}
  // The compact flag is tethered to a real side bracket and remains inside 0.5m width.
  if(STAGE>=1){
    block(.194,1.063,.06,.075,.065,.047,M.blue,0,0,0,.004);rod([.23,1.052,.06],[.23,1.322,.06],.008,M.gold,6);
    const vs=[.231,1.303,.055,.235,1.297,-.065,.23,1.213,-.065,.231,1.223,.055],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setIndex([0,1,2,0,2,3,2,1,0,3,2,0]);const flag=geo.toNonIndexed();flag.computeVertexNormals();add(flag,M.flag);geo.dispose();
    if(STAGE>=4){const geo=new THREE.OctahedronGeometry(.013);geo.scale(.8,1.3,.8);add(at(geo,.23,1.336,.06),M.gold);}
  }
  const result=finish();for(const child of result.children){child.geometry.scale(1.05,1,1.15);child.geometry.computeBoundingSphere();}return result;
};

  I.PROPMODELS['banner'] = function(THREE,kit){
  const STAGE=7,root=new THREE.Group();root.name='tidal-banner';const PI=Math.PI,TAU=2*PI,buckets=new Map(),cache=new Map();
  const material=(c,o={},kind)=>{const k=JSON.stringify([c,o,kind]);if(!cache.has(k))cache.set(k,kit.mat(c,o,kind));return cache.get(k);};
  const neutral=STAGE<3?material('#a8a292',{roughness:.84}):null;
  const M={stone:neutral||material('#f0dec1',{roughness:.89},'stone'),stoneShade:neutral||material('#d8c7a9',{roughness:.92},'stone'),navy:neutral||material('#263754',{roughness:.55,metalness:.33}),cloth:neutral||material('#283b69',{roughness:.88}),gold:neutral||material('#d2a24e',{roughness:.38,metalness:.72}),goldShade:neutral||material('#997135',{roughness:.49,metalness:.62})};
  function add(g,m,part){if(g.index){const a=g.toNonIndexed();g.dispose();g=a;}if(STAGE>=7)part=m===M.gold?'brass':m===M.goldShade?'brass-shade':m===M.navy?'navy':m===M.cloth?'fabric':m===M.stone?'ivory':'ivory-shade';const k=part+'|'+m.uuid;if(!buckets.has(k))buckets.set(k,{m,part,list:[]});buckets.get(k).list.push(g);}
  function put(g,m,part,pos=[0,0,0],rot=[0,0,0]){g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...pos);add(g,m,part);}
  function cyl(rt,rb,h,y,m,part,n=16){put(new THREE.CylinderGeometry(rt,rb,h,n,1),m,part,[0,y,0]);}
  function rod(a,b,r,m,part,n=8){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),g=new THREE.CylinderGeometry(r,r,d.length(),n,1);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));g.translate(...va.add(vb).multiplyScalar(.5).toArray());add(g,m,part);}
  function poly(points,depth,m,part,pos=[0,0,0],flip=false){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:20});if(part==='emblem'){g.translate(...pos);const at=g.attributes.position,side=pos[2]<0?-1:1;for(let i=0;i<at.count;i++)at.setZ(i,fold(at.getX(i),at.getY(i))+side*(.014+at.getZ(i)-pos[2]));if(side<0){const idx=[];for(let i=0;i<at.count;i+=3)idx.push(i,i+2,i+1);g.setIndex(idx);}g.computeVertexNormals();add(g,m,part);}else{if(flip)g.rotateY(PI);put(g,m,part,pos);}}
  const fold=(x,y)=>STAGE>=2?.022*Math.sin((x-.16)/.78*PI*3.2)*(.25+.75*(2.72-y)/1.5):0;
  // Thin closed cloth volume; pointed lower edge is a continuous mesh.
  function sheet(part,m,th=.018){const nx=STAGE>=2?12:2,ny=STAGE>=7?12:STAGE>=2?18:2,p=[],ind=[];for(let side=0;side<2;side++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny,x=.16+.78*u,bottom=.91+.34*Math.abs(2*u-1),y=2.71+(bottom-2.71)*v;p.push(x,y,fold(x,y)+(side===0?th/2:-th/2));}const count=(nx+1)*(ny+1);for(let s=0;s<2;s++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=s*count+j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;if(!s)ind.push(a,c,b,b,c,d);else ind.push(a,b,c,b,d,c);}const edge=[];for(let i=0;i<=nx;i++)edge.push(i);for(let j=1;j<=ny;j++)edge.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)edge.push(ny*(nx+1)+i);for(let j=ny-1;j>0;j--)edge.push(j*(nx+1));for(let k=0;k<edge.length;k++){const a=edge[k],b=edge[(k+1)%edge.length];ind.push(a,b,a+count,b,b+count,a+count);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ind);g.computeVertexNormals();add(g,m,part);}
  cyl(.34,.34,.045,.0225,M.stoneShade,'base',24);cyl(.31,.34,.145,.1175,M.stone,'base',24);cyl(.285,.315,.05,.215,M.stone,'base',24);
  cyl(.102,.14,.09,.285,M.goldShade,'mast');cyl(.06,.10,.14,.385,M.gold,'mast');cyl(.049,.055,2.35,1.62,M.navy,'mast');cyl(.063,.059,.13,2.85,M.navy,'mast');
  rod([0,2.8,0],[1.01,2.8,0],.027,M.gold,'rod');sheet('cloth',M.cloth);
  if(STAGE>=1){
    for(const x of [.20,.55,.90]){const ps=[[x-.025,2.71,-.025],[x-.025,2.84,-.025],[x+.025,2.84,-.025],[x+.025,2.71,-.025]];poly(ps,.06,M.navy,'ties');}
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0,2.52,0],[.03,2.66,0],[.11,2.75,0],[.23,2.80,0]].map(v=>new THREE.Vector3(...v))),10,.015,5,false),M.gold,'rod');
    for(const y of [.39,.66,2.51,2.8,2.91])cyl(y===2.8?.073:.066,.064,.038,y,M.gold,'mast');
  }
  if(STAGE>=2){
    // Geometry-only gold hem lies on both faces, following the same fold field.
    for(const side of [-1,1]){
      const line=(points)=>{for(let k=0;k<points.length-1;k++){const a=points[k],b=points[k+1],steps=10;for(let i=0;i<steps;i++){const u=i/steps,v=(i+1)/steps,pa=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],pb=[a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v],dx=pb[0]-pa[0],dy=pb[1]-pa[1],len=Math.hypot(dx,dy),ox=-dy/len*.0085,oy=dx/len*.0085,points=[[pa[0]+ox,pa[1]+oy],[pa[0]-ox,pa[1]-oy],[pb[0]-ox,pb[1]-oy],[pb[0]+ox,pb[1]+oy]],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(v=>[v[0],v[1],fold(...v)+side*.018]),3));g.setIndex(side>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.computeVertexNormals();add(g,M.gold,'hem');}}};
      line([[.187,2.68],[.187,1.27],[.55,.956],[.913,1.27],[.913,2.68]]);
      // Crescent opens toward positive x, four-point star nested within it.
      const cres=[];for(let i=0;i<=28;i++){const a=(55+250*i/28)*PI/180;cres.push([Math.cos(a)*.255,Math.sin(a)*.255]);}for(let i=28;i>=0;i--){const a=(55+250*i/28)*PI/180;cres.push([.070+Math.cos(a)*.218,.012+Math.sin(a)*.218]);}
      poly(cres,.012,M.gold,'emblem',[.51,1.89,side*.05],side<0);
      const star=[[0,.16],[.038,.044],[.125,0],[.038,-.034],[0,-.16],[-.038,-.034],[-.125,0],[-.038,.044]];poly(star,.013,M.gold,'emblem',[.62,1.91,side*.052],side<0);
    }
    cyl(.05,.072,.055,2.955,M.gold,'finial',12);cyl(.001,.06,.15,3.055,M.gold,'finial',8);
    put(new THREE.SphereGeometry(.047,10,6),M.gold,'rod',[1.035,2.8,0]);
    for(const x of [.20,.55,.90])for(const side of [-1,1])poly([[0,.035],[.026,0],[0,-.042],[-.026,0]],.008,M.gold,'ties',[x,2.67,side*.038],side<0);
  }
  if(STAGE>=4){
    // Grounded base hoop and inset plinth shoulder retain the ivory area.
    cyl(.342,.342,.018,.041,M.gold,'base',24);cyl(.29,.29,.018,.239,M.goldShade,'base',24);
    for(const x of [.20,.55,.90]){rod([x-.025,2.73,.041],[x-.025,2.83,.041],.004,M.gold,'ties',4);rod([x+.025,2.73,.041],[x+.025,2.83,.041],.004,M.gold,'ties',4);}
  }
  for(const {m,part,list}of buckets.values()){let len=0;for(const g of list)len+=g.attributes.position.array.length;const p=new Float32Array(len),n=new Float32Array(len);let o=0;for(const g of list){p.set(g.attributes.position.array,o);n.set(g.attributes.normal.array,o);o+=g.attributes.position.array.length;g.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('normal',new THREE.BufferAttribute(n,3));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,m);mesh.name=part+'-'+(m===M.gold?'brass':m===M.navy?'navy':m===M.cloth?'fabric':'surface');mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  return root;
};

  I.PROPMODELS['planter'] = function(THREE, kit) {
  'use strict';
  const stage=8;
  const g=new THREE.Group();g.name='tidal-crescent-planter';
  const mats={
    stone:kit.mat('#f3efe6',{roughness:.9},'stone'),
    shade:kit.mat('#d8cbb7',{roughness:.94},'stone'),
    navy:kit.mat('#1f2c55',{roughness:.82},'stone'),
    gold:kit.mat('#d8b45a',{roughness:.4,metalness:.7}),
    soil:kit.mat('#494d2e',{roughness:1}),
    leaf:kit.mat('#62773f',{roughness:.94}),
    light:kit.mat('#a0ac58',{roughness:.92}),
    blue:kit.mat('#5b7fbf',{roughness:.85}),
    white:kit.mat('#fff3da',{roughness:.9}),
    yellow:kit.mat('#edc458',{roughness:.86})
  };
  const buckets=new Map();
  function add(geo,material,name){
    if(!geo.attributes.normal)geo.computeVertexNormals();
    if(!buckets.has(name))buckets.set(name,{material,geometries:[]});
    buckets.get(name).geometries.push(geo.index?geo.toNonIndexed():geo);
  }
  function transform(geo,x,y,z,rx=0,ry=0,rz=0){
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));return geo;
  }
  function box(x,y,z,w,h,d,m,name){add(transform(new THREE.BoxGeometry(w,h,d),x,y,z),m,name);}
  function bevelBox(x,y,z,w,h,d,m,name,b=.008){
    if(stage<3)return box(x,y,z,w,h,d,m,name);
    const s=new THREE.Shape();s.moveTo(-w/2+b,-h/2);s.lineTo(w/2-b,-h/2);s.lineTo(w/2,-h/2+b);s.lineTo(w/2,h/2-b);s.lineTo(w/2-b,h/2);s.lineTo(-w/2+b,h/2);s.lineTo(-w/2,h/2-b);s.lineTo(-w/2,-h/2+b);s.closePath();
    const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b*.45,bevelSegments:1,steps:1,curveSegments:1});
    add(transform(geo,x,y,z-d/2+b),m,name);
  }
  function blob(x,y,z,w,h,d,m,name){const geo=new THREE.SphereGeometry(1,8,4);geo.scale(w,h,d);add(transform(geo,x,y,z),m,name);}
  function stem(a,b,r=.006){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A),geo=new THREE.CylinderGeometry(r*.7,r,delta.length(),5);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(geo,mats.leaf,'leaf-masses');}
  // Closed broad leaf/petal shell with a raised central ridge, 12 triangles.
  function blade(a,b,w,curve,m,name,surfaceNormal=null){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),D=B.clone().sub(A),L=D.length(),U=D.clone().normalize();
    let W=(surfaceNormal||new THREE.Vector3(0,1,0)).clone().cross(U);if(W.lengthSq()<.001)W.set(1,0,0);W.normalize();
    const N=U.clone().cross(W).normalize(),P=(t,side,ridge=0)=>A.clone().addScaledVector(U,L*t).addScaledVector(W,w*side).addScaledVector(N,ridge+curve*Math.sin(t*Math.PI));
    const ring=[P(0,0),P(.35,-.8),P(.7,-.62),P(1,0),P(.7,.62),P(.35,.8)],C=P(.52,0,w*.18),under=C.clone().addScaledVector(N,-w*.25),v=[];
    for(let i=0;i<6;i++){v.push(...C.toArray(),...ring[i].toArray(),...ring[(i+1)%6].toArray());v.push(...under.toArray(),...ring[(i+1)%6].toArray(),...ring[i].toArray());}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();add(geo,m,name);
  }
  function relief(points,x,y,z,m,name,ry=0){const s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();add(transform(new THREE.ExtrudeGeometry(s,{depth:.009,bevelEnabled:false,steps:1,curveSegments:1}),x,y,z,0,ry),m,name);}
  function star(x,y,z,r=.034,ry=0){const p=[];for(let k=0;k<8;k++){let a=Math.PI/2+k*Math.PI/4,rr=k%2?r*.24:r;p.push([Math.cos(a)*rr,Math.sin(a)*rr]);}relief(p,x,y,z,mats.gold,'gold-relief',ry);}
  function crescent(x,y,z,r=.106){
    const p=[];for(let i=0;i<=20;i++){let a=(55+i*250/20)*Math.PI/180;p.push([Math.cos(a)*r,Math.sin(a)*r]);}
    // The inner arc shares exact outer endpoints so the relief forms one crescent.
    const cx=.042,ix=r*Math.cos(55*Math.PI/180)-cx,iy=r*Math.sin(55*Math.PI/180),ir=Math.hypot(ix,iy),ia=Math.atan2(iy,ix);
    for(let i=0;i<=18;i++){const a=-ia-(Math.PI*2-2*ia)*i/18;p.push([cx+Math.cos(a)*ir,Math.sin(a)*ir]);}
    relief(p,x,y,z,mats.gold,'gold-relief');
  }
  // Body, plinth, rim and corners are separate semantic batches.
  bevelBox(0,.0686,0,.85,.13,.85,mats.stone,'basin');
  bevelBox(0,.292,0,.76,.36,.76,mats.stone,'basin');
  if(stage>=2){
    box(0,.14,0,.782,.035,.782,mats.shade,'stone-shadow');
    for(const x of [-.36,.36])for(const z of [-.36,.36]){
      bevelBox(x,.293,z,.13,.335,.13,mats.stone,'pilasters',.006);
      bevelBox(x,.105,z,.174,.082,.174,mats.stone,'pilasters',.008);
      bevelBox(x,.474,z,.168,.063,.168,mats.stone,'pilasters',.008);
      if(stage>=3){
        for(const y of [.139,.44])box(x,y,z,.142,.017,.142,mats.gold,'gold-relief');
        const zf=z>0?z+.067:z-.067,xf=x>0?x+.067:x-.067;
        box(x,.29,zf,.072,.236,.006,mats.navy,'panels');
        box(xf,.29,z,.006,.236,.072,mats.navy,'panels');
        star(x,.29,zf+(z>0?.004:-.013),.024,z>0?0:Math.PI);
        star(xf+(x>0?.004:-.013),.29,z,.024,x>0?Math.PI/2:-Math.PI/2);
      }
    }
  }
  // Four overlapping rim rails leave a real soil well between them.
  for(const z of [-.384,.384])bevelBox(0,.507,z,.88,.084,.116,mats.stone,'rim');
  for(const x of [-.384,.384])bevelBox(x,.507,0,.116,.084,.66,mats.stone,'rim');
  box(0,.495,0,.71,.025,.71,mats.soil,'soil');
  if(stage>=3){
    // A recessed front panel field, ivory border and centered crest retain quiet wall space.
    box(0,.294,.383,.55,.25,.009,mats.shade,'stone-shadow');
    box(0,.3,.39,.515,.215,.012,mats.stone,'basin');
    crescent(-.027,.302,.4);star(.037,.31,.412,.047);star(-.19,.285,.407,.022);star(.19,.285,.407,.022);
  }
  // Low foliage masses establish the canopy silhouette during blockout.
  const clumps=[[-.21,.566,.19,.19,.055,.16],[.18,.575,.2,.17,.06,.16],[-.2,.59,-.15,.16,.07,.18],[.17,.6,-.16,.18,.075,.18],[0,.62,0,.23,.08,.21]];
  for(let i=0;i<clumps.length;i++){const q=clumps[i];blob(...q,stage>=4&&i%2?mats.light:mats.leaf,i%2?'leaf-light':'leaf-masses');}
  if(stage>=2){
    for(let i=0;i<54;i++){
      const a=i*2.3999632297,rad=.085+.29*((i*17)%53)/53,x=Math.cos(a)*rad,z=Math.sin(a)*rad,y=.61+.13*(1-rad/.38)+.025*Math.sin(i*1.7),len=.084+(i%4)*.015,dx=Math.cos(a)*len,dz=Math.sin(a)*len;
      blade([x,y,z],[x+dx,y+.04+.02*Math.sin(i),z+dz],.03+(i%3)*.007,.009,stage>=4&&i%3===0?mats.light:mats.leaf,stage>=4&&i%3===0?'leaf-light':'leaf-masses');
    }
    // Three short trailing sprays remain attached and keep all tips inside 1 m.
    for(const [x,z,dx,dz]of [[-.18,.37,.02,.025],[.33,.1,.025,.01],[.08,-.37,-.02,-.025]]){
      stem([x,.57,z],[x+dx,.36,z+dz],.004);
      for(let i=0;i<3;i++){const y=.52-i*.055,s=i%2?1:-1;blade([x+dx*i/3,y,z+dz*i/3],[x+dx*i/3+s*.046,y-.044,z+dz*i/3+.025],.021,.004,i%2?mats.light:mats.leaf,i%2?'leaf-light':'leaf-masses');}
    }
  }
  if(stage>=3){
    const heads=[
      [-.26,.69,.25,0,.068],[-.08,.76,.23,1,.067],[.18,.7,.27,0,.068],[.29,.67,.05,1,.062],[-.3,.73,-.04,1,.064],[-.13,.82,-.12,0,.071],[.08,.795,.04,0,.074],[.26,.77,-.19,0,.063],[.04,.84,-.25,1,.063],[-.22,.69,-.27,0,.056],[-.04,.675,.34,2,.043],[.3,.67,.27,2,.038],[-.32,.665,.18,2,.037],[-.23,.77,.06,2,.036],[.14,.735,-.3,2,.04],[.33,.695,-.13,2,.037],[.02,.74,.25,2,.04],[-.11,.735,-.32,2,.035],[.17,.695,.13,1,.05],[-.2,.69,.32,1,.049],[-.29,.67,-.18,2,.037],[.14,.84,-.13,2,.034],[-.04,.825,-.02,2,.035],[.26,.72,.13,0,.052],[-.05,.73,-.22,1,.051],[.33,.69,-.28,1,.045],[-.34,.68,.01,0,.047],[.05,.675,.36,1,.043],[-.25,.8,-.12,1,.044],[-.15,.7,.12,2,.041],[.1,.72,-.03,1,.052],[-.18,.76,-.28,2,.038],[.3,.73,.23,2,.035],[-.33,.73,-.25,1,.045]
    ];
    for(let i=0;i<heads.length;i++){
      const [x,y,z,color,baseR]=heads[i],r=baseR*1.2,top=[x,y,z];stem([x*.78,.52,z*.78],top,.0047);
      // Plane is tilted toward the front with the normal strongly upward.
      const U=new THREE.Vector3(1,0,0),V=new THREE.Vector3(0,.54,-.84),C=new THREE.Vector3(x,y,z),m=stage>=4?[mats.blue,mats.white,mats.yellow][color]:mats.leaf,name=['flowers-blue','flowers-white','flowers-yellow'][color];
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5+i*.48,d=U.clone().multiplyScalar(Math.cos(a)).addScaledVector(V,Math.sin(a)),base=C.clone().addScaledVector(d,r*.09),tip=C.clone().addScaledVector(d,r);blade(base.toArray(),tip.toArray(),r*.46,.004,m,name,new THREE.Vector3(0,.84,.54));}
      const disk=new THREE.OctahedronGeometry(1,0);disk.scale(r*.21,r*.16,r*.17);add(transform(disk,x,y+.009,z+.013),mats.yellow,'flower-centers');
      if(i%3===0)blade([x*.9,y-.1,z*.9],[x*.9+.07,y-.058,z*.9+.025],.025,.006,mats.light,'leaf-light');
    }
  }
  // Repeated petals/leaves merge once per semantic material, never hundreds of meshes.
  for(const [name,b]of buckets){
    let count=0;for(const q of b.geometries)count+=q.attributes.position.count;
    const pos=new Float32Array(count*3),norm=new Float32Array(count*3);let off=0;
    for(const q of b.geometries){pos.set(q.attributes.position.array,off);norm.set(q.attributes.normal.array,off);off+=q.attributes.position.array.length;q.dispose();}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(norm,3));geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,b.material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  }
  return g;
};

})(typeof window !== 'undefined' ? window : globalThis);
