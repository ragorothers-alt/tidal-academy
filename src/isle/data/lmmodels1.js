/* 潮汐小島 · 程式化模型（img2threejs 重建）：噴泉、城門、石拱橋、白石階梯與碼頭。 */
/* Reference-led stylized game geometry. Forge blockout stopped at its bounded
 * image gate; the user-authorized game adaptations are validated separately.
 * Units: metres. +Y up. Bridge runs +X; stairs rise toward -Z; pier runs +Z.
 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.LMMODELS = I.LMMODELS || {};

  // 小型、實體花葉；只在原輪廓內的指定基座／外緣生長，不佔走道。
  function dressLandmark(THREE, kit, g, paths, flowers, flowerColor = '#f3bdd2') {
    const bins = [[], []], V = p => new THREE.Vector3(...p);
    const add = (geo, bin, p, scale, ry = 0) => {
      if (scale) geo.scale(...scale); geo.rotateY(ry); geo.translate(...p);
      const raw = geo.index ? geo.toNonIndexed() : geo;
      if (raw !== geo) geo.dispose(); bins[bin].push(raw);
    };
    for (const pts of paths) {
      const curve = new THREE.CatmullRomCurve3(pts.map(V));
      add(new THREE.TubeGeometry(curve, 8, .009, 4, false), 0, [0,0,0]);
      for (let j = 0; j < 6; j++) {
        const p = curve.getPoint((j + .5) / 6), side = j % 2 ? 1 : -1;
        add(new THREE.OctahedronGeometry(1), 0, [p.x + side * .035, p.y, p.z], [.065,.025,.035], side * .6);
      }
    }
    for (const [x,y,z] of flowers) {
      for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 2 / 5;
        add(new THREE.SphereGeometry(1,4,2), 1, [x + .035*Math.cos(a),y+.01,z+.035*Math.sin(a)], [.038,.025,.038]);
      }
      for (const side of [-1,1]) add(new THREE.OctahedronGeometry(1), 0, [x+side*.037,y-.035,z], [.065,.018,.034], side*.7);
    }
    const mats = [kit.mat('#9fb994',{roughness:.94}),kit.mat(flowerColor,{roughness:.88})];
    bins.forEach((geos,i) => {
      if (!geos.length) return;
      const positions=[],normals=[];
      for (const geo of geos) {positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);geo.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      const mesh=new THREE.Mesh(geo,mats[i]);mesh.name=i?'landmark-flowers':'landmark-leaves';mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    });
  }


I.LMMODELS['fountain']=function(THREE,kit){const g=new THREE.Group();g.name='MODEL';
const stone=kit.mat('#efe3d1',{roughness:.85},'stone'),shade=kit.mat('#c8bdd1',{roughness:.9},'stone'),blue=kit.mat('#ad9abd',{roughness:.65},'roof'),navy=kit.mat('#9186a8',{roughness:.55}),gold=kit.mat('#e8c48b',{roughness:.4,metalness:0.6},'metal'),wood=kit.mat('#cda67e',{roughness:.8},'wood');const bins=new Map();
function put(geo,mat,name,x=0,y=0,z=0,rx=0,ry=0,rz=0){const mx=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1));geo.applyMatrix4(mx);const key=name+'-'+mat.uuid;if(!bins.has(key))bins.set(key,{mat,name,geos:[]});bins.get(key).geos.push(geo);}
function flush(){for(const {mat,name,geos}of bins.values()){let pos=[],nor=[],uv=[],idx=[],off=0;for(const a of geos){const p=a.getAttribute('position'),n=a.getAttribute('normal'),u=a.getAttribute('uv');pos.push(...p.array);nor.push(...n.array);uv.push(...u.array);const ii=a.index?Array.from(a.index.array):Array.from({length:p.count},(_,i)=>i);for(const i of ii)idx.push(i+off);off+=p.count;a.dispose();}const a=new THREE.BufferGeometry();a.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));a.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));a.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));a.setIndex(idx);const m=new THREE.Mesh(a,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;g.add(m);}return g;}
function box(w,h,d,mat,name,x,y,z,rz=0){const b=Math.min(.018,w*.12,h*.12,d*.12),sh=new THREE.Shape();sh.moveTo(-w/2+b,-h/2+b);sh.lineTo(w/2-b,-h/2+b);sh.lineTo(w/2-b,h/2-b);sh.lineTo(-w/2+b,h/2-b);sh.closePath();const gg=new THREE.ExtrudeGeometry(sh,{depth:d-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:1});gg.translate(0,0,-d/2+b);put(gg,mat,name,x,y,z,0,0,rz);}
function cyl(rt,rb,h,mat,name,x,y,z,n=32){put(new THREE.CylinderGeometry(rt,rb,h,n),mat,name,x,y,z);}
function ring(ro,ri,h,mat,name,y,rx=0,rz=0,x=0,z=0){const v=[[ri,-h/2],[ro,-h/2],[ro,h/2],[ri,h/2],[ri,-h/2]].map(a=>new THREE.Vector2(...a));put(new THREE.LatheGeometry(v,64),mat,name,x,y,z,rx,0,rz);}
function profile(points,depth,mat,name,z=0){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const a=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,curveSegments:20});a.translate(0,0,z-depth/2);put(a,mat,name);}
function tube(points,r,mat,name,n=24){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));put(new THREE.TubeGeometry(c,n,r,6,false),mat,name);}
function diamond(x,y,z,w,h,mat,name){profile([[x,y+h/2],[x+w/2,y],[x,y-h/2],[x-w/2,y]],.035,mat,name,z);}
function crescent(x,y,z,r,mat,name){const sh=new THREE.Shape();sh.moveTo(x+.6*r,y+.8*r);sh.bezierCurveTo(x-1.35*r,y+1.04*r,x-1.35*r,y-1.04*r,x+.72*r,y-.7*r);sh.bezierCurveTo(x-.5*r,y-.63*r,x-.53*r,y+.28*r,x+.6*r,y+.8*r);const gg=new THREE.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:true,bevelSize:.009,bevelThickness:.008,bevelSegments:1,curveSegments:22});gg.translate(0,0,z);put(gg,mat,name);}
function star(x,y,z,r,mat,name){const pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;const rr=i%2?r*.3:r;pts.push([x+Math.sin(a)*rr,y+Math.cos(a)*rr]);}profile(pts,.03,mat,name,z);}

cyl(1.57,1.64,.14,shade,'basin',0,.07,0,64);ring(1.59,1.36,.31,stone,'basin',.285);put(new THREE.LatheGeometry([[1.34,-.0275],[1.61,-.0275],[1.625,-.0125],[1.625,.0125],[1.61,.0275],[1.34,.0275],[1.34,-.0275]].map(p=>new THREE.Vector2(...p)),64),stone,'pool-coping',0,.465,0);ring(1.59,1.39,.035,navy,'navy-rim',.504);ring(1.61,1.59,.027,gold,'gold-rim-line',.507);ring(1.39,1.36,.025,gold,'gold-rim-line',.507);
const water=kit.mat('#abd0ce',{transparent:true,opacity:.72,depthWrite:false,roughness:.28});cyl(1.37,1.37,.028,water,'water',0,.359,0,64);
cyl(.52,.56,.11,gold,'pedestal-step',0,.385,0);cyl(.46,.51,.095,shade,'pedestal-step',0,.46,0);cyl(.43,.43,.54,stone,'pedestal',0,.765,0);cyl(.46,.46,.08,stone,'pedestal',0,1.055,0);cyl(.35,.43,.055,gold,'pedestal-cap',0,1.122,0);cyl(.2,.3,.085,navy,'pedestal-cap',0,1.17,0);cyl(.17,.22,.075,gold,'pedestal-cap',0,1.2125,0);
// A fixed meridian carries two nested, independently pivoted armillary bands.
// Local Y is the polar shaft; the equator is normal to it, the ecliptic is oblique.
const tilt=.34,obliquity=.41,cy=2.04,polar=new THREE.Vector3(Math.sin(tilt),Math.cos(tilt),0),node=new THREE.Vector3(Math.cos(tilt),-Math.sin(tilt),0);
function band(ro,ri,h,mat,name,p,q,n=48){const a=new THREE.LatheGeometry([[ri,-h/2],[ro,-h/2],[ro,h/2],[ri,h/2],[ri,-h/2]].map(v=>new THREE.Vector2(...v)),n);if(q)a.applyQuaternion(q);a.translate(...p);put(a,mat,name);}
function shaft(a,b,r,mat,name,n=12){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),geo=new THREE.CylinderGeometry(r,r,d.length(),n);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());put(geo,mat,name);}
const C=new THREE.Vector3(0,cy,0),P=t=>C.clone().addScaledVector(polar,t).toArray(),N=t=>C.clone().addScaledVector(node,t).toArray();
const meridianQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2),equatorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-tilt),eclipticQ=equatorQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),obliquity));
band(.79,.733,.07,gold,'armillary',[0,cy,0],meridianQ);
// The meridian's low point seats directly on the existing gold pedestal cap.
band(.714,.674,.045,gold,'equator',[0,cy,0],equatorQ);
band(.631,.596,.04,gold,'armillary',[0,cy,0],eclipticQ);
shaft(P(-.733),P(.733),.028,navy,'armillary');
for(const s of [-1,1]){
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),polar);
 band(.082,.03,.055,gold,'armillary',P(s*.756),q,16);
 band(.089,.055,.038,gold,'armillary',P(s*.469),q,16);
 // Coaxial hinge pins bridge actual gaps between the nested ring edges.
 shaft(N(s*.631),N(s*.733),.021,navy,'armillary',10);
 const nq=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),node);
 band(.047,.022,.028,gold,'equator',N(s*.659),nq,12);
}
for(let i=0;i<36;i++){
 const a=i*Math.PI/18,l=i%3===0?.035:.019;
 put(new THREE.BoxGeometry(.009,l,.008),navy,'armillary',Math.sin(a)*(.79-l/2),cy+Math.cos(a)*(.79-l/2),.039,0,0,-a);
}
for(const s of [-1,1])put(new THREE.CylinderGeometry(.023,.023,.018,8),gold,'armillary',s*.755,cy,.046,Math.PI/2);
const crystal=kit.mat('#b7a4c7',{roughness:.42,metalness:.02,emissive:'#d5c7e6',emissiveIntensity:.18});// A faceted crystal with a real axial bore; the spindle never crosses a solid face.
let cg=new THREE.LatheGeometry([[.055,-.45],[.105,-.45],[.33,-.28],[.44,0],[.33,.28],[.105,.45],[.055,.45],[.055,-.45]].map(v=>new THREE.Vector2(...v)),8);cg=cg.toNonIndexed();cg.computeVertexNormals();cg.rotateZ(-tilt);cg.translate(0,cy,0);put(cg,crystal,'crystal');
for(let i=0;i<4;i++){const a=i*Math.PI/2,xx=Math.sin(a),zz=Math.cos(a);tube([[xx*.32,1.105,zz*.32],[xx*.69,1.25,zz*.69],[xx*.91,1.76,zz*.91],[xx*.85,1.94,zz*.85]],.024,gold,'gold-spouts',16);box(.13,.15,.13,gold,'gold-spouts',xx*.85,1.97,zz*.85);tube([[xx*.86,1.96,zz*.86],[xx*1.01,1.79,zz*1.01],[xx*1.16,1.13,zz*1.16],[xx*1.2,.385,zz*1.2]],.037,water,'falling-streams',22);}

const pale=kit.mat('#d9e5df',{roughness:.3,transparent:true,opacity:.54,depthWrite:false});
for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,xx=Math.sin(a),zz=Math.cos(a),x=xx*1.55,z=zz*1.55;box(.2,.15,.2,shade,'rim-bevel',x,.175,z);box(.17,.24,.17,stone,'rim-bevel',x,.365,z);box(.2,.055,.2,stone,'rim-bevel',x,.51,z);const cg=new THREE.ConeGeometry(.12,.068,4);put(cg,stone,'rim-bevel',x,.566,z,0,Math.PI/4);const m=new THREE.Matrix4().makeRotationY(a);const dg=new THREE.OctahedronGeometry(.07,0);dg.scale(.65,1.5,.35);dg.applyMatrix4(m);put(dg,gold,'pier-diamond',x+xx*.103,.363,z+zz*.103);}
for(let i=0;i<8;i++){const a=i*Math.PI/4,xx=Math.sin(a),zz=Math.cos(a);const geo=new THREE.OctahedronGeometry(.045,0);geo.scale(1,.28,1);put(geo,gold,'gold-rim-line',xx*1.49,.533,zz*1.49);}
// Separate geometry for the central crescent emblem and raised plinth borders.
crescent(0,.76,.439,.17,gold,'pedestal-crescent');star(.07,.795,.482,.07,gold,'pedestal-crescent');
for(let i=0;i<4;i++){const a=i*Math.PI/2;const x=Math.sin(a)*1.2,z=Math.cos(a)*1.2;for(const r of [.105,.19]){const rr=new THREE.TorusGeometry(r,.009,5,24);put(rr,pale,'water-ripples',x,.383,z,Math.PI/2);}for(let j=0;j<3;j++){const aa=a+j*2.1;put(new THREE.SphereGeometry(.017,5,4),pale,'water-ripples',x+Math.sin(aa)*.095,.41+j*.025,z+Math.cos(aa)*.095);}}

const stoneLight=kit.mat('#e8decf',{roughness:.86},'stone');for(let row=0;row<2;row++)for(let i=0;i<20;i++){const aa=i*Math.PI/10+(row%2)*Math.PI/20;const geo=new THREE.CylinderGeometry(1.598,1.598,.127,4,1,true,aa+.004,Math.PI/10-.008);put(geo,(i+row)%3===0?stoneLight:stone,'surface-seams',0,.195+row*.137,0);}const result=flush();result.position.y=.00001;return result;};


I.LMMODELS['gate']=function(THREE,kit){const g=new THREE.Group();g.name='MODEL';
const stone=kit.mat('#efe3d1',{roughness:.85},'stone'),shade=kit.mat('#c8bdd1',{roughness:.9},'stone'),blue=kit.mat('#ad9abd',{roughness:.65},'roof'),navy=kit.mat('#9186a8',{roughness:.55}),gold=kit.mat('#e8c48b',{roughness:.4,metalness:0.6},'metal'),wood=kit.mat('#cda67e',{roughness:.8},'wood');const bins=new Map();
function put(geo,mat,name,x=0,y=0,z=0,rx=0,ry=0,rz=0){const mx=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1));geo.applyMatrix4(mx);const key=name+'-'+mat.uuid;if(!bins.has(key))bins.set(key,{mat,name,geos:[]});bins.get(key).geos.push(geo);}
function flush(){for(const {mat,name,geos}of bins.values()){let pos=[],nor=[],uv=[],idx=[],off=0;for(const a of geos){const p=a.getAttribute('position'),n=a.getAttribute('normal'),u=a.getAttribute('uv');pos.push(...p.array);nor.push(...n.array);uv.push(...u.array);const ii=a.index?Array.from(a.index.array):Array.from({length:p.count},(_,i)=>i);for(const i of ii)idx.push(i+off);off+=p.count;a.dispose();}const a=new THREE.BufferGeometry();a.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));a.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));a.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));a.setIndex(idx);const m=new THREE.Mesh(a,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;g.add(m);}return g;}
function box(w,h,d,mat,name,x,y,z,rz=0){const b=Math.min(.018,w*.12,h*.12,d*.12),sh=new THREE.Shape();sh.moveTo(-w/2+b,-h/2+b);sh.lineTo(w/2-b,-h/2+b);sh.lineTo(w/2-b,h/2-b);sh.lineTo(-w/2+b,h/2-b);sh.closePath();const gg=new THREE.ExtrudeGeometry(sh,{depth:d-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:1});gg.translate(0,0,-d/2+b);put(gg,mat,name,x,y,z,0,0,rz);}
function cyl(rt,rb,h,mat,name,x,y,z,n=32){put(new THREE.CylinderGeometry(rt,rb,h,n),mat,name,x,y,z);}
function ring(ro,ri,h,mat,name,y,rx=0,rz=0,x=0,z=0){const v=[[ri,-h/2],[ro,-h/2],[ro,h/2],[ri,h/2],[ri,-h/2]].map(a=>new THREE.Vector2(...a));put(new THREE.LatheGeometry(v,64),mat,name,x,y,z,rx,0,rz);}
function profile(points,depth,mat,name,z=0){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const a=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,curveSegments:20});a.translate(0,0,z-depth/2);put(a,mat,name);}
function tube(points,r,mat,name,n=24){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));put(new THREE.TubeGeometry(c,n,r,6,false),mat,name);}
function diamond(x,y,z,w,h,mat,name){profile([[x,y+h/2],[x+w/2,y],[x,y-h/2],[x-w/2,y]],.035,mat,name,z);}
function crescent(x,y,z,r,mat,name){const sh=new THREE.Shape();sh.moveTo(x+.6*r,y+.8*r);sh.bezierCurveTo(x-1.35*r,y+1.04*r,x-1.35*r,y-1.04*r,x+.72*r,y-.7*r);sh.bezierCurveTo(x-.5*r,y-.63*r,x-.53*r,y+.28*r,x+.6*r,y+.8*r);const gg=new THREE.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:true,bevelSize:.009,bevelThickness:.008,bevelSegments:1,curveSegments:22});gg.translate(0,0,z);put(gg,mat,name);}
function star(x,y,z,r,mat,name){const pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;const rr=i%2?r*.3:r;pts.push([x+Math.sin(a)*rr,y+Math.cos(a)*rr]);}profile(pts,.03,mat,name,z);}

for(const side of [-1,1]){const x=2.22*side;box(.98,.18,1.12,shade,'pier-footing',x,.09,0);box(.88,.17,1.02,stone,'pier-footing',x,.245,0);box(.76,.13,.88,stone,'pier-footing',x,.385,0);box(.67,2.36,.69,stone,'pier-shaft',x,1.62,0);box(.77,.13,.8,stone,'capital-step',x,2.83,0);box(.8,.11,.83,navy,'navy-inlay',x,2.93,0);box(.98,.17,.96,stone,'capital-step',x,3.065,0);box(.87,.12,.84,stone,'capital-step',x,3.185,0);}
const arch=[];for(let i=0;i<=24;i++){const x=-1.88+3.76*i/24;arch.push([x,3.08+.4*Math.sqrt(Math.max(0,1-(x/1.88)**2))]);}for(let i=24;i>=0;i--){const x=-1.88+3.76*i/24;arch.push([x,3.33+.4*Math.sqrt(Math.max(0,1-(x/1.88)**2))]);}profile(arch,.6,stone,'arch-voussoirs');
const roofY=x=>3.39+.99*(1-Math.abs(x)/2.88)**1.65+.19*(Math.abs(x)/2.88)**8,roofPts=[];for(let i=0;i<=40;i++){const x=-2.88+5.76*i/40;roofPts.push([x,roofY(x)]);}for(let i=40;i>=0;i--){const x=-2.88+5.76*i/40;roofPts.push([x,roofY(x)-.13]);}profile(roofPts,1.5,blue,'curved-blue-roof');
for(const z of [-.76,.76]){tube(Array.from({length:33},(_,i)=>{const x=-2.88+5.76*i/32;return[x,roofY(x)+.01,z];}),.037,gold,'gold-fascia',40);tube(Array.from({length:33},(_,i)=>{const x=-2.88+5.76*i/32;return[x,roofY(x)-.13,z];}),.062,wood,'eaves-wood',40);}
const disc=new THREE.CylinderGeometry(.34,.34,.07,32);put(disc,navy,'crest-disc',0,3.96,.83,Math.PI/2);put(new THREE.TorusGeometry(.345,.035,8,48),gold,'crest-rim',0,3.96,.88);crescent(-.04,3.96,.91,.235,gold,'crest-crescent');star(.075,4.03,.94,.11,gold,'crest-star');
const glass=kit.win();for(const side of [-1,1]){const x=2.22*side,z=.65;box(.2,.38,.06,gold,'lantern-mount',x,2.48,.4);tube([[x,2.6,.4],[x,2.65,.65],[x,2.5,z]],.025,gold,'lantern-mount',10);cyl(.06,.06,.16,gold,'lantern-frame',x,2.48,z,8);cyl(.16,.23,.18,gold,'lantern-frame',x,2.31,z,4);cyl(.17,.15,.37,glass,'lantern-core',x,2.04,z,4);cyl(.2,.2,.055,gold,'lantern-frame',x,1.83,z,8);cyl(.07,.17,.13,gold,'lantern-frame',x,1.75,z,8);for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;box(.027,.4,.027,gold,'lantern-frame',x+.15*Math.sin(a),2.05,z+.15*Math.cos(a));}}

const lightBlue=kit.mat('#b7a4c7',{roughness:.64},'roof');
// Continuous timber gables close the head assembly above the stone arch.
const gable=[];for(let i=0;i<=30;i++){const x=-2.35+4.7*i/30;gable.push([x,roofY(x)-.11]);}gable.push([2.35,3.35]);for(let i=24;i>=0;i--){const x=-1.88+3.76*i/24;gable.push([x,3.35+.4*Math.sqrt(Math.max(0,1-(x/1.88)**2))]);}gable.push([-2.35,3.35]);for(const z of [-.45,.45])profile(gable,.1,wood,'gable-timber',z);
for(let side of [-1,1])for(let row=0;row<5;row++)for(let col=0;col<8;col++){const xa=side*(.04+col*.345),xb=side*(.04+(col+1)*.345-.016);const min=Math.min(xa,xb),max=Math.max(xa,xb),pts=[[min,roofY(min)+.014],[max,roofY(max)+.014],[max,roofY(max)+.05],[min,roofY(min)+.05]];profile(pts,.274,(row+col)%3===0?lightBlue:blue,'roof-tile-bands',-.6+row*.3);}
for(const side of [-1,1]){const x=2.22*side;box(.19,1.4,.025,gold,'navy-inlay-frame',x,1.36,.362);box(.145,1.33,.03,navy,'navy-inlay',x,1.36,.382);diamond(x,.645,.405,.13,.2,gold,'gold-diamond');diamond(x,2.155,.405,.14,.2,gold,'gold-diamond');for(const z of [-.365,.365]){box(.075,2.25,.045,shade,'pier-pilaster',x-.25,1.6,z);box(.075,2.25,.045,shade,'pier-pilaster',x+.25,1.6,z);}}
// Cap the three roof crests with short brass finials.
for(const x of [-2.65,0,2.65]){const y=roofY(x)+.055;box(.19,.09,.22,gold,'roof-finials',x,y+.045,0);cyl(.055,.09,.08,gold,'roof-finials',x,y+.12,0,8);const h=x===0?.23:.2;put(new THREE.OctahedronGeometry(.11,0),gold,'roof-finials',x,y+.23,0,0,Math.PI/4);}
for(let i=1;i<16;i++){const x=-1.88+3.76*i/16,y=3.18+.4*Math.sqrt(Math.max(0,1-(x/1.88)**2));box(.012,.17,.615,shade,'arch-seams',x,y,0,-Math.atan2(-.4*x/1.88**2,Math.sqrt(Math.max(.01,1-(x/1.88)**2))));}
const result=flush();result.position.y=.00001;dressLandmark(THREE,kit,result,[[[2.47,3.15,.44],[2.50,2.72,.44],[2.45,2.16,.44]],[[-2.47,3.05,.44],[-2.50,2.78,.44],[-2.46,2.54,.44]]],[[2.49,3.02,.46],[2.50,2.86,.46],[2.48,2.70,.46],[2.48,2.54,.46],[2.46,2.37,.46],[-2.49,3.00,.46],[-2.50,2.84,.46],[-2.48,2.68,.46]],'#cfbee8');return result;};

I.LMMODELS['bridge']=function(THREE,kit){
  'use strict';
  const stage=5;
  const g=new THREE.Group();g.name='tidal-ivory-arch-bridge';
  const batches=new Map(),materials=new Map(),palette=stage>=3;
  const mat=(color,opts={},kind)=>{const key=JSON.stringify([color,opts,kind]);if(!materials.has(key))materials.set(key,kit.mat(palette?color:'#d9cfbc',palette?opts:{roughness:.9},kind));return materials.get(key);};
  const M={stone:mat('#efe3d1',{roughness:.89},'stone'),light:mat('#f0e5d5',{roughness:.86},'stone'),shade:mat('#d8cfce',{roughness:.92},'stone'),mortar:mat('#c8bdd1',{roughness:.97},'stone'),blue:mat('#a49bb5',{roughness:.77},'stone'),blue2:mat('#b7a4c7',{roughness:.74},'stone'),gold:mat('#e8c48b',{roughness:.4,metalness:0.6},'metal'),goldDark:mat('#b99b80',{roughness:.4,metalness:0.6},'metal'),roof:mat('#9186a8',{roughness:.73},'roof'),roof2:mat('#ad9abd',{roughness:.7},'roof'),core:palette?kit.win():null};
  if(!M.core)M.core=M.light;
  const ids=new Map(Object.values(M).map((m,i)=>[m,i]));
  const deckY=x=>.02+.45*Math.sin(Math.PI*(x+3.2)/6.4);
  const archY=x=>-.98+.76*Math.sin(Math.PI*(x+3.2)/6.4);
  function add(geo,m,part){if(!geo.getAttribute('normal'))geo.computeVertexNormals();if(geo.index){const old=geo;geo=geo.toNonIndexed();old.dispose();}const key=part+'|'+ids.get(m);if(!batches.has(key))batches.set(key,{part,m,geos:[]});batches.get(key).geos.push(geo);}
  function place(geo,m,part,x=0,y=0,z=0,rx=0,ry=0,rz=0){geo.rotateX(rx);geo.rotateY(ry);geo.rotateZ(rz);geo.translate(x,y,z);add(geo,m,part);}
  function box(x,y,z,w,h,d,m,part,bevel=0){
    if(bevel>0){const b=Math.min(bevel,w*.2,h*.2,d*.2),s=new THREE.Shape(),a=w/2-b,c=h/2-b;s.moveTo(-a,-c);s.lineTo(a,-c);s.lineTo(a,c);s.lineTo(-a,c);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,steps:1,curveSegments:1});place(geo,m,part,x,y,z-(d-2*b)/2);}
    else place(new THREE.BoxGeometry(w,h,d),m,part,x,y,z);
  }
  function profile(x0,x1,upper,lower,z0,z1,m,part,n=8,b=0){
    x0+=b;x1-=b;const s=new THREE.Shape();s.moveTo(x0,upper(x0)-b);for(let i=1;i<=n;i++){const x=x0+(x1-x0)*i/n;s.lineTo(x,upper(x)-b);}for(let i=n;i>=0;i--){const x=x0+(x1-x0)*i/n;s.lineTo(x,lower(x)+b);}s.closePath();place(new THREE.ExtrudeGeometry(s,{depth:z1-z0-2*b,bevelEnabled:b>0,bevelSize:b,bevelThickness:b,bevelSegments:1,steps:1,curveSegments:1}),m,part,0,0,z0+b);
  }
  function rod(a,b,r,m,part,n=7,rTop=r){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A),geo=new THREE.CylinderGeometry(rTop,r,dir.length(),n,1);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(geo,m,part);}
  function cyl(x,y,z,rt,rb,h,m,part,n=8){place(new THREE.CylinderGeometry(rt,rb,h,n,1),m,part,x,y,z);}
  function badge(x,y,z,s,side,part){
    const cres=new THREE.Shape(),r=s,ri=s*.72,off=s*.37;const start=Math.PI*.29,end=Math.PI*1.71;cres.moveTo(Math.cos(start)*r,Math.sin(start)*r);for(let i=1;i<=24;i++){const a=start+(end-start)*i/24;cres.lineTo(Math.cos(a)*r,Math.sin(a)*r);}for(let i=0;i<=20;i++){const a=end-(end-start)*i/20;cres.lineTo(off+Math.cos(a)*ri,Math.sin(a)*ri);}cres.closePath();place(new THREE.ExtrudeGeometry(cres,{depth:.006,bevelEnabled:false,steps:1,curveSegments:1}),M.gold,part,x,y,z,0,side<0?Math.PI:0);
    const star=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/2+i*Math.PI/4,R=i%2?s*.13:s*.53,px=Math.cos(a)*R,py=Math.sin(a)*R;if(i)star.lineTo(px,py);else star.moveTo(px,py);}star.closePath();place(new THREE.ExtrudeGeometry(star,{depth:.006,bevelEnabled:false,steps:1}),M.gold,part,x+s*.27,y,z+side*.001,0,side<0?Math.PI:0);
  }
  function diamond(x,y,z,w,h,m,side,part){const s=new THREE.Shape();s.moveTo(0,h/2);s.lineTo(w/2,0);s.lineTo(0,-h/2);s.lineTo(-w/2,0);s.closePath();place(new THREE.ExtrudeGeometry(s,{depth:.005,bevelEnabled:false,steps:1}),m,part,x,y,z,0,side<0?Math.PI:0);}
  // Full-width arch is load-bearing and a single continuous opening.
  profile(-3.2,3.2,x=>deckY(x)-.014,archY,-1.21,1.21,M.shade,'arch',64);
  // Every walking vertex is on or below the exact collision curve; inset joints are .014 deep.
  if(stage>=2){
    for(let row=0;row<4;row++){
      const z0=-.93+row*.465+.004,z1=z0+.457;
      const shift=row%2?.2:0;
      for(let col=-1;col<17;col++){
        const x0=Math.max(-3.2,-3.2+col*.4+shift+.003),x1=Math.min(3.2,-3.2+(col+1)*.4+shift-.003);
        if(x1>x0)profile(x0,x1,deckY,x=>deckY(x)-.035,z0,z1,(row+col)%5===0?M.light:(row+col)%4===0?M.shade:M.stone,'deck',4);
      }
    }
    for(const side of [-1,1])for(let i=0;i<16;i++){
      const z0=side<0?-1.205:.936,z1=side<0?-.936:1.205;
      profile(-3.2+i*.4+.003,-3.2+(i+1)*.4-.003,deckY,x=>deckY(x)-.035,z0,z1,i%3?M.blue:M.blue2,'deck',4);
    }
  }
  // Small terminal abutments stay within the deck endpoints and 3m total width.
  for(const x of [-2.98,2.98])for(const side of [-1,1]){
    const z=side*1.35,top=deckY(x)+.64;
    box(x,(-.99+top)/2,z,.44,top+.99,.28,M.stone,'piers',stage>=2?.012:0);
    if(stage>=2){
      box(x,-.865,z,.44,.25,.296,M.shade,'piers',.01);
      box(x,top-.035,z,.44,.12,.296,M.light,'piers',.012);
      box(x,top+.035,z,.405,.045,.27,M.light,'piers',.009);
      const face=side*1.491;
      box(x,top-.35,side*1.492,.268,.49,.008,M.blue,'piers');
      for(const dx of [-.162,.162])box(x+dx,top-.34,side*1.493,.035,.55,.008,M.light,'piers');
      badge(x,top-.35,face,.104,side,'piers');
      for(const dx of [-.112,.112])diamond(x+dx,top-.12,face,.035,.09,M.gold,side,'piers');
    }
  }
  for(const side of [-1,1]){
    const z0=side<0?-1.43:1.215,z1=side<0?-1.215:1.43;
    profile(-2.85,2.85,x=>deckY(x)+.108,x=>deckY(x)-.07,side<0?-1.44:1.205,side<0?-1.205:1.44,M.shade,'parapets',32);
    profile(-2.85,2.85,x=>deckY(x)+.535,x=>deckY(x)+.07,z0,z1,stage>=2?M.mortar:M.stone,'parapets',64);
    if(stage>=2){
      for(let i=0;i<12;i++){
        const x0=-2.85+i*.475+.006,x1=x0+.463;
        profile(x0,x1,x=>deckY(x)+.515,x=>deckY(x)+.105,z0-.001,z1+.001,i%4===0?M.light:M.stone,'parapets',4);
        profile(x0-.004,x1+.004,x=>deckY(x)+.625,x=>deckY(x)+.525,side<0?-1.493:1.205,side<0?-1.205:1.493,i%3===0?M.light:M.stone,'parapets',2,.012);
      }
      profile(-2.83,2.83,x=>deckY(x)+.525,x=>deckY(x)+.49,side<0?-1.436:1.431,side<0?-1.431:1.436,M.blue,'parapets',64);
      // Dark blue spandrel and separately laid limestone voussoirs.
      profile(-2.84,2.84,x=>deckY(x)-.068,x=>archY(x)+.22,side<0?-1.235:1.211,side<0?-1.211:1.235,M.blue,'arch',64);
      for(let i=0;i<28;i++){
        const x0=-3.2+i*6.4/28+.003,x1=-3.2+(i+1)*6.4/28-.003;
        profile(x0,x1,x=>archY(x)+.224,archY,side<0?-1.265:1.21,side<0?-1.21:1.265,i%5===0?M.light:i%4===0?M.shade:M.stone,'arch',3);
      }
      profile(-2.84,2.84,x=>deckY(x)-.035,x=>deckY(x)-.085,side<0?-1.255:1.235,side<0?-1.235:1.255,M.light,'arch',64);
      for(const x of [-1.28,1.28]){
        const y=deckY(x);
        box(x,y+.337,side*1.355,.14,.52,.26,M.light,'parapets',.009);
        box(x,y+.612,side*1.35,.23,.09,.285,M.light,'parapets',.009);
        diamond(x,y+.33,side*1.491,.095,.22,M.gold,side,'parapets');
        diamond(x,y+.33,side*1.493,.055,.145,M.blue,side,'parapets');
      }
    }else profile(-2.85,2.85,x=>deckY(x)+.625,x=>deckY(x)+.535,side<0?-1.493:1.205,side<0?-1.205:1.493,M.stone,'parapets',64);
  }
  // One lantern at each end, diagonally opposed to keep the entrances open.
  for(const [x,z,label] of [[-2.98,1.35,'west'],[2.98,-1.35,'east']]){
    const part='lantern-'+label,base=deckY(x)+.698;
    if(stage<2){cyl(x,base+.15,z,.043,.07,.3,M.stone,part);box(x,base+.46,z,.14,.32,.14,M.stone,part);cyl(x,base+.665,z,0,.148,.15,M.stone,part,4);continue;}
    box(x,base+.018,z,.18,.04,.18,M.goldDark,part,.007);
    cyl(x,base+.06,z,.057,.083,.055,M.gold,part);
    cyl(x,base+.168,z,.037,.056,.18,M.roof,part);
    cyl(x,base+.269,z,.076,.04,.045,M.gold,part);
    cyl(x,base+.307,z,.091,.063,.04,M.goldDark,part);
    box(x,base+.335,z,.176,.035,.164,M.gold,part,.006);
    box(x,base+.505,z,.106,.303,.095,M.core,part,.008);
    for(const dx of [-.073,.073])for(const dz of [-.066,.066])rod([x+dx,base+.35,z+dz],[x+dx*.8,base+.675,z+dz*.8],.0105,M.gold,part,6);
    box(x,base+.675,z,.16,.034,.15,M.gold,part,.005);
    // Four-sided slate cap with a brass eave, four raised hip ribs and a finial.
    const cap=new THREE.ConeGeometry(.148,.138,4,1);cap.rotateY(Math.PI/4);place(cap,M.roof,part,x,base+.76,z);
    box(x,base+.695,z,.204,.024,.204,M.goldDark,part,.005);
    for(const dx of [-1,1])for(const dz of [-1,1])rod([x+dx*.102,base+.708,z+dz*.102],[x,base+.827,z],.008,M.gold,part,5);
    cyl(x,base+.832,z,.038,.05,.024,M.gold,part,8);
    const fin=new THREE.ConeGeometry(.034,.105,6);place(fin,M.gold,part,x,base+.896,z);
    cyl(x,base+.858,z,.026,.025,.045,M.gold,part,7);
  }
  for(const [x,z]of[[-2.38,-1.35],[2.38,1.35]]) {
    box(x,deckY(x)+.707,z,.38,.16,.24,M.light,'parapets',.018);
  }
  dressLandmark(THREE,kit,g,[],[-2.38,2.38].flatMap((x,i)=>[-.10,0,.10].map(dx=>[x+dx,deckY(x)+.84,(i?1:-1)*1.35])));
  // Preserve position, normal and UV channels while batching only within semantic parts.
  const groups=new Map();
  for(const b of batches.values()){
    let count=0;for(const geo of b.geos)count+=geo.attributes.position.count;
    const pos=new Float32Array(count*3),nor=new Float32Array(count*3),uv=new Float32Array(count*2);let v=0;
    for(const geo of b.geos){const p=geo.getAttribute('position'),n=geo.getAttribute('normal'),u=geo.getAttribute('uv');pos.set(p.array,v*3);nor.set(n.array,v*3);if(u)uv.set(u.array,v*2);v+=p.count;geo.dispose();}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,b.m);mesh.name=b.part+'-'+ids.get(b.m);mesh.castShadow=true;mesh.receiveShadow=true;
    if(!groups.has(b.part)){const node=new THREE.Group();node.name=b.part;groups.set(b.part,node);g.add(node);}groups.get(b.part).add(mesh);
  }
  return g;
}
;


I.LMMODELS['stairs'] = function stairsFactory(THREE,kit){

  'use strict';
  const g=new THREE.Group();g.name='stairs';
  const level=7,mats={},batches=new Map();
  function mat(id,color,opts,kind){return mats[id]||(mats[id]=kit.mat(level<3?'#d5cdbb':color,opts||{},kind));}
  const M={stone:mat('stone','#efe3d1',{roughness:.9},'stone'),light:mat('light','#f0e5d5',{roughness:.87},'stone'),shade:mat('shade','#d1c5ca',{roughness:.94},'stone'),seam:mat('seam','#b9aebc',{roughness:1}),navy:mat('navy','#a69ab7',{roughness:.7}),gold:mat('gold','#e8c48b',{roughness:.4,metalness:0.6},'metal'),wood:mat('wood','#cda67e',{roughness:.8},'wood'),wood2:mat('wood2','#d7b38c',{roughness:.8},'wood'),dark:mat('dark','#947b7b',{roughness:.8},'wood'),rope:mat('rope','#e3d2b6',{roughness:.96}),glass:kit.win()};
  function add(geo,m,name){if(!geo.getAttribute('normal'))geo.computeVertexNormals();if(!geo.getAttribute('uv')){const p=geo.getAttribute('position'),u=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){u[i*2]=p.getX(i);u[i*2+1]=p.getY(i)+p.getZ(i);}geo.setAttribute('uv',new THREE.BufferAttribute(u,2));}const k=(level<7?name+':':'')+Object.values(M).indexOf(m);if(!batches.has(k))batches.set(k,{m,name,geos:[]});batches.get(k).geos.push(geo.index?geo.toNonIndexed():geo);}
  function tf(geo,x,y,z,rx=0,ry=0,rz=0){return geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));}
  function box(x,y,z,w,h,d,m,name,rx=0,ry=0,rz=0){add(tf(new THREE.BoxGeometry(w,h,d),x,y,z,rx,ry,rz),m,name);}
  function rounded(x,y,z,w,h,d,m,name,r=.018){if(level<2||Math.min(w,h,d)<r*3)return box(x,y,z,w,h,d,m,name);const s=new THREE.Shape(),a=w/2-r,b=h/2-r;s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:d-r*2,steps:1,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,curveSegments:1});geo.translate(0,0,-d/2+r);add(tf(geo,x,y,z),m,name);}
  function cyl(x,y,z,rt,rb,h,m,name,seg=8){const geo=new THREE.CylinderGeometry(rt,rb,h,seg,1);if(seg===4)geo.rotateY(Math.PI/4);add(tf(geo,x,y,z),m,name);}
  function beam(a,b,r,m,name,seg=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),geo=new THREE.CylinderGeometry(r,r,v.length(),seg);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(geo,m,name);}
  function shape(pts,depth,x,y,z,m,name,ry=0){const s=new THREE.Shape();s.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)s.lineTo(...pts[i]);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:16});add(tf(geo,x,y,z,0,ry),m,name);}
  function star(x,y,z,r,m,name,ry=0){const p=[];for(let i=0;i<8;i++){const a=Math.PI/2+i*Math.PI/4,R=i%2?r*.25:r;p.push([Math.cos(a)*R,Math.sin(a)*R]);}shape(p,.012,x,y,z,m,name,ry);}
  function crescent(x,y,z,r,name,ry=0){const p=[];for(let i=0;i<=22;i++){const a=(50+i*260/22)*Math.PI/180;p.push([Math.cos(a)*r,Math.sin(a)*r]);}for(let i=0;i<=20;i++){const a=(295-i*230/20)*Math.PI/180;p.push([r*.3+Math.cos(a)*r*.74,Math.sin(a)*r*.74]);}shape(p,.014,x,y,z,M.gold,name,ry);}
  function lamp(x,base,z,name,scale=1){
   const S=scale,cy=(v)=>base+v*S;
   cyl(x,cy(.035),z,.09*S,.115*S,.07*S,M.gold,name);cyl(x,cy(.11),z,.045*S,.06*S,.1*S,M.gold,name);
   cyl(x,cy(.18),z,.13*S,.095*S,.06*S,M.gold,name,4);
   if(level>=3)cyl(x,cy(.355),z,.103*S,.087*S,.3*S,M.glass,name,4);
   for(const a of [Math.PI/4,Math.PI*3/4,Math.PI*5/4,Math.PI*7/4])beam([x+Math.sin(a)*.12*S,cy(.21),z+Math.cos(a)*.12*S],[x+Math.sin(a)*.145*S,cy(.51),z+Math.cos(a)*.145*S],.012*S,M.gold,name);
   cyl(x,cy(.52),z,.155*S,.155*S,.035*S,M.gold,name,4);cyl(x,cy(.605),z,.025*S,.155*S,.14*S,M.navy,name,4);cyl(x,cy(.675),z,.035*S,.04*S,.025*S,M.gold,name);
   cyl(x,cy(.75),z,0,.05*S,.12*S,M.gold,name,4);
   if(level>=4)for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const dx=Math.sin(a),dz=Math.cos(a);beam([x+dx*.145*S,cy(.51),z+dz*.145*S],[x+dx*.025*S,cy(.675),z+dz*.025*S],.008*S,M.gold,name);}
  }
  function finish(){for(const [id,b]of batches){const count=b.geos.reduce((n,a)=>n+a.getAttribute('position').count,0),geo=new THREE.BufferGeometry();for(const [attr,size]of [['position',3],['normal',3],['uv',2]]){const arr=new Float32Array(count*size);let offset=0;for(const a of b.geos){arr.set(a.getAttribute(attr).array,offset);offset+=a.getAttribute(attr).array.length;}geo.setAttribute(attr,new THREE.BufferAttribute(arr,size));}geo.computeBoundingBox();geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,b.m);mesh.name=level>=7?'stairs-material-'+id:b.name;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);for(const a of b.geos)a.dispose();}return g;}

  // Twelve horizontal noses lie on y=-z/3; first tread is a plane at ground datum.
  for(let i=0;i<12;i++){const y=i/6,z=-i*.5;
   if(i===0){const geo=new THREE.PlaneGeometry(2,.5);geo.rotateX(-Math.PI/2);geo.translate(0,0,-.25);add(geo,M.light,'flight');}
   else rounded(0,y/2,z-.25,2,y,.5,i%3===1?M.light:M.stone,'flight',.02);
   if(level>=4&&i>0){const xx=(i%3-1)*.47;box(xx,y-.001,z-.255,.006,.002,.43,M.shade,'tread-joints');}
  }
  box(0,1,-6.2,2,2,.4,M.light,'flight');
  function wallPrism(points,x,depth,m,name){shape(points,depth,x,0,0,m,name,Math.PI/2);}
  // Local shape u=-z, v=y; extrude along +x. No void below either exterior wall.
  const wall=[[ -.25,0],[6.4,0],[6.4,2.55],[6,2.55],[0,.55],[-.25,.55]];
  for(const side of [-1,1]){
   const x0=side>0?1:-1.35;
   wallPrism(wall,x0,.35,M.stone,'parapets');
   if(level>=2){const pts=[[-.22,.55],[0,.55],[6,2.55],[6.38,2.55],[6.38,2.63],[6,2.63],[0,.63],[-.22,.63]];wallPrism(pts,x0,.35,M.light,'sloped-caps');}
   if(level>=3){for(const xf of [side>0?1.346:-1.35,side>0?1:-1.004])wallPrism([[.28,.34],[5.78,2.1733],[5.78,2.3433],[.28,.51]],xf,.004,M.navy,'navy-inlays');
    if(level>=4)for(const xf of [side>0?1.347:-1.35,side>0?1:-1.003])for(const off of [.33,.51])wallPrism([[.25,off],[5.8,off+1.85],[5.8,off+1.866],[.25,off+.016]],xf,.003,M.gold,'navy-inlays');
   }
   if(level>=0)for(const [z,base]of [[.06,0],[-6.08,2]]){
    rounded(side*1.175,(base+.7)/2,z,.35,base+.7,.38,M.stone,'endpoint-piers',.012);
    rounded(side*1.175,.055,z,.35,.11,.4,M.shade,'endpoint-piers',.01);
    rounded(side*1.175,base+.695,z,.35,.11,.4,M.light,'endpoint-piers',.012);
    rounded(side*1.175,base+.775,z,.31,.05,.34,M.light,'endpoint-piers',.01);
    if(level>=3)box(side*1.175,base+.39,z+.191,.22,.42,.004,M.navy,'endpoint-piers');
    lamp(side*1.175,base+.8,z,'lamps',level>=2?1.05:.82);
    if(level>=4){star(side*1.175,base+.57,z+.198,.055,M.gold,'emblems');crescent(side*1.175-.014,base+.32,z+.199,.077,'emblems');star(side*1.175+.02,base+.32,z+.216,.033,M.gold,'emblems');}
   }
   if(level>=4){for(let row=1;row<8;row++){const y=row*.31,minU=Math.max(0,(y-.52)*3);if(minU>=6.4)continue;wallPrism([[minU,y],[6.39,y],[6.39,y+.007],[minU,y+.007]],side>0?1.348:-1.35,.002,M.shade,'parapets');}
    for(let i=0;i<12;i++){const u=.3+i*.51,top=u/3+.51;for(let row=0;row<Math.floor(top/.31);row++){if((i+row)%2)continue;wallPrism([[u,row*.31],[u+.007,row*.31],[u+.007,(row+1)*.31],[u,(row+1)*.31]],side>0?1.348:-1.35,.002,M.shade,'parapets');}}
   }
  }
  return finish();

};


I.LMMODELS['pier'] = function pierFactory(THREE,kit){

  'use strict';
  const g=new THREE.Group();g.name='pier';
  const level=7,mats={},batches=new Map();
  function mat(id,color,opts,kind){return mats[id]||(mats[id]=kit.mat(level<3?'#d5cdbb':color,opts||{},kind));}
  const M={stone:mat('stone','#efe3d1',{roughness:.9},'stone'),light:mat('light','#f0e5d5',{roughness:.87},'stone'),shade:mat('shade','#d1c5ca',{roughness:.94},'stone'),seam:mat('seam','#b9aebc',{roughness:1}),navy:mat('navy','#a69ab7',{roughness:.7}),gold:mat('gold','#e8c48b',{roughness:.4,metalness:0.6},'metal'),wood:mat('wood','#cda67e',{roughness:.8},'wood'),wood2:mat('wood2','#d7b38c',{roughness:.8},'wood'),dark:mat('dark','#947b7b',{roughness:.8},'wood'),rope:mat('rope','#e3d2b6',{roughness:.96}),glass:kit.win()};
  function add(geo,m,name){if(!geo.getAttribute('normal'))geo.computeVertexNormals();if(!geo.getAttribute('uv')){const p=geo.getAttribute('position'),u=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){u[i*2]=p.getX(i);u[i*2+1]=p.getY(i)+p.getZ(i);}geo.setAttribute('uv',new THREE.BufferAttribute(u,2));}const k=(level<7?name+':':'')+Object.values(M).indexOf(m);if(!batches.has(k))batches.set(k,{m,name,geos:[]});batches.get(k).geos.push(geo.index?geo.toNonIndexed():geo);}
  function tf(geo,x,y,z,rx=0,ry=0,rz=0){return geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));}
  function box(x,y,z,w,h,d,m,name,rx=0,ry=0,rz=0){add(tf(new THREE.BoxGeometry(w,h,d),x,y,z,rx,ry,rz),m,name);}
  function rounded(x,y,z,w,h,d,m,name,r=.018){if(level<2||Math.min(w,h,d)<r*3)return box(x,y,z,w,h,d,m,name);const s=new THREE.Shape(),a=w/2-r,b=h/2-r;s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:d-r*2,steps:1,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,curveSegments:1});geo.translate(0,0,-d/2+r);add(tf(geo,x,y,z),m,name);}
  function cyl(x,y,z,rt,rb,h,m,name,seg=8){const geo=new THREE.CylinderGeometry(rt,rb,h,seg,1);if(seg===4)geo.rotateY(Math.PI/4);add(tf(geo,x,y,z),m,name);}
  function beam(a,b,r,m,name,seg=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),geo=new THREE.CylinderGeometry(r,r,v.length(),seg);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(geo,m,name);}
  function shape(pts,depth,x,y,z,m,name,ry=0){const s=new THREE.Shape();s.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)s.lineTo(...pts[i]);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:16});add(tf(geo,x,y,z,0,ry),m,name);}
  function star(x,y,z,r,m,name,ry=0){const p=[];for(let i=0;i<8;i++){const a=Math.PI/2+i*Math.PI/4,R=i%2?r*.25:r;p.push([Math.cos(a)*R,Math.sin(a)*R]);}shape(p,.012,x,y,z,m,name,ry);}
  function crescent(x,y,z,r,name,ry=0){const p=[];for(let i=0;i<=22;i++){const a=(50+i*260/22)*Math.PI/180;p.push([Math.cos(a)*r,Math.sin(a)*r]);}for(let i=0;i<=20;i++){const a=(295-i*230/20)*Math.PI/180;p.push([r*.3+Math.cos(a)*r*.74,Math.sin(a)*r*.74]);}shape(p,.014,x,y,z,M.gold,name,ry);}
  function lamp(x,base,z,name,scale=1){
   const S=scale,cy=(v)=>base+v*S;
   cyl(x,cy(.035),z,.09*S,.115*S,.07*S,M.gold,name);cyl(x,cy(.11),z,.045*S,.06*S,.1*S,M.gold,name);
   cyl(x,cy(.18),z,.13*S,.095*S,.06*S,M.gold,name,4);
   if(level>=3)cyl(x,cy(.355),z,.103*S,.087*S,.3*S,M.glass,name,4);
   for(const a of [Math.PI/4,Math.PI*3/4,Math.PI*5/4,Math.PI*7/4])beam([x+Math.sin(a)*.12*S,cy(.21),z+Math.cos(a)*.12*S],[x+Math.sin(a)*.145*S,cy(.51),z+Math.cos(a)*.145*S],.012*S,M.gold,name);
   cyl(x,cy(.52),z,.155*S,.155*S,.035*S,M.gold,name,4);cyl(x,cy(.605),z,.025*S,.155*S,.14*S,M.navy,name,4);cyl(x,cy(.675),z,.035*S,.04*S,.025*S,M.gold,name);
   cyl(x,cy(.75),z,0,.05*S,.12*S,M.gold,name,4);
   if(level>=4)for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const dx=Math.sin(a),dz=Math.cos(a);beam([x+dx*.145*S,cy(.51),z+dz*.145*S],[x+dx*.025*S,cy(.675),z+dz*.025*S],.008*S,M.gold,name);}
  }
  function finish(){for(const [id,b]of batches){const count=b.geos.reduce((n,a)=>n+a.getAttribute('position').count,0),geo=new THREE.BufferGeometry();for(const [attr,size]of [['position',3],['normal',3],['uv',2]]){const arr=new Float32Array(count*size);let offset=0;for(const a of b.geos){arr.set(a.getAttribute(attr).array,offset);offset+=a.getAttribute(attr).array.length;}geo.setAttribute(attr,new THREE.BufferAttribute(arr,size));}geo.computeBoundingBox();geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,b.m);mesh.name=level>=7?'pier-material-'+id:b.name;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);for(const a of b.geos)a.dispose();}return g;}

  function panelQuad(a,b,c,d,m,name){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,0,1,1,1,0,0,1,1,1,0],2));geo.computeVertexNormals();add(geo,m,name);}
  // Flush tessellated deck; joints occupy real coplanar strips so every x,z samples y=.45.
  const pitch=6.4/24,seam=level>=4?.008:0,deckZ=new Float32Array(49),deckY=Math.fround(.45),deckLow=Math.fround(.44);
  for(let i=0;i<24;i++){deckZ[i*2]=i*pitch;deckZ[i*2+1]=(i+1)*pitch-seam;}deckZ[48]=6.4;
  box(0,.34,3.2,3,.2,6.4,M.wood,'deck');
  for(let i=0;i<24;i++){const a=deckZ[i*2],b=deckZ[i*2+1],c=deckZ[i*2+2];
   panelQuad([-1.5,deckY,a],[-1.5,deckY,b],[1.5,deckY,b],[1.5,deckY,a],i%4===0?M.wood2:M.wood,'deck');
   if(seam)panelQuad([-1.5,deckY,b],[-1.5,deckY,c],[1.5,deckY,c],[1.5,deckY,b],M.dark,'deck');
   if(level>=4)for(const x of [-1.34,1.34])cyl(x,.445,a+pitch*.25,.018,.018,.01,M.gold,'deck',6);
  }
  panelQuad([-1.5,deckLow,deckZ[48]],[-1.5,deckY,deckZ[48]],[-1.5,deckY,deckZ[0]],[-1.5,deckLow,deckZ[0]],M.wood,'deck');
  panelQuad([1.5,deckLow,deckZ[0]],[1.5,deckY,deckZ[0]],[1.5,deckY,deckZ[48]],[1.5,deckLow,deckZ[48]],M.wood,'deck');
  panelQuad([-1.5,deckLow,deckZ[0]],[-1.5,deckY,deckZ[0]],[1.5,deckY,deckZ[0]],[1.5,deckLow,deckZ[0]],M.wood,'deck');
  panelQuad([1.5,deckLow,deckZ[48]],[1.5,deckY,deckZ[48]],[-1.5,deckY,deckZ[48]],[-1.5,deckLow,deckZ[48]],M.wood,'deck');
  for(const side of [-1,1]){
   rounded(side*1.57,.21,3.2,.26,.34,6.4,M.dark,'fascia',.018);
   if(level>=2)rounded(side*1.57,.405,3.2,.26,.08,6.4,M.wood2,'fascia',.012);
   for(const z of [.35,2.25,4.15,6.1]){
    rounded(side*1.34,-.63,z,.3,1.94,.32,M.dark,'piles',.018);
    rounded(side*1.34,-1.49,z,.34,.22,.36,M.stone,'piles',.014);
    rounded(side*1.34,-.27,z,.306,.14,.326,M.shade,'tide-bands',.012);
    if(level>=1){beam([side*1.34,-1.15,z],[side*1.34,.11,z+Math.min(.72,6.3-z)],.085,M.dark,'braces',4);beam([side*1.34,-1.15,z],[side*1.34,.11,z-Math.min(.6,z-.12)],.085,M.dark,'braces',4);}
   }
   if(level>=1)for(const z of [.7,5.7]){
    rounded(side*1.6,.655,z,.19,.41,.2,M.dark,'bollards',.012);rounded(side*1.6,.875,z,.2,.05,.21,M.gold,'bollards',.009);
    if(level>=4)for(const yy of [.56,.605]){const geo=new THREE.TorusGeometry(.084,.014,4,8);geo.rotateX(Math.PI/2);geo.translate(side*1.6,yy,z);add(geo,M.rope,'rope-collars');}
   }
  }
  // Terminal slab joins the wood at the same exact top y=.45.
  box(0,.22,7.2,3.4,.36,1.6,M.shade,'platform');
  // Shared Float32 grid edges avoid centre/half-size rounding cracks between slab tops.
  const slabX=Float32Array.from({length:7},(_,i)=>(i-3)*(3.4/6));
  const slabZ=Float32Array.from({length:5},(_,i)=>6.4+i*.4),slabY=Math.fround(.45);
  function slabQuad(a,b,c,d,m){panelQuad(a,b,c,d,m,'platform');}
  for(let iz=0;iz<4;iz++)for(let ix=0;ix<6;ix++){const x0=slabX[ix],x1=slabX[ix+1],z0=slabZ[iz],z1=slabZ[iz+1];slabQuad([x0,slabY,z0],[x0,slabY,z1],[x1,slabY,z1],[x1,slabY,z0],(ix+iz)%4?M.stone:M.light);}
  const x0=slabX[0],x1=slabX[6],z0=slabZ[0],z1=slabZ[4],yb=Math.fround(.4);
  slabQuad([x0,yb,z1],[x0,slabY,z1],[x0,slabY,z0],[x0,yb,z0],M.stone);
  slabQuad([x1,yb,z0],[x1,slabY,z0],[x1,slabY,z1],[x1,yb,z1],M.stone);
  slabQuad([x0,yb,z0],[x0,slabY,z0],[x1,slabY,z0],[x1,yb,z0],M.stone);
  slabQuad([x1,yb,z1],[x1,slabY,z1],[x0,slabY,z1],[x0,yb,z1],M.stone);
  for(const side of [-1,1]){
   rounded(side*1.6,-.575,7.65,.2,2.05,.22,M.stone,'platform',.012);
   if(level>=0){const lift=level>=2?.55:0;rounded(side*1.6,.75+lift/2,7.65,.2,.6+lift,.28,M.light,'lamps',.012);if(level>=3)box(side*1.6,.76+lift/2,7.798,.11,.39+lift,.006,M.navy,'lamps');rounded(side*1.6,1.08+lift,7.65,.2,.07,.28,M.light,'lamps',.009);lamp(side*1.6,1.13+lift,7.65,'lamps',.62);}
  }
  if(level>=0){
   cyl(1.62,1.48,6.55,.018,.025,2.06,M.gold,'banner',8);cyl(1.62,2.54,6.55,0,.042,.09,M.gold,'banner',4);
   beam([1.62,2.35,6.53],[1.62,2.35,7.23],.02,M.dark,'banner',8);
   if(level>=3){const pts=[[0,0],[.66,0],[.66,-1.07],[.33,-.89],[0,-1.07]];shape(pts,.025,1.61,2.32,6.55,M.navy,'banner',-Math.PI/2);
    if(level>=4){for(const a of [[0,0,.66,0],[.66,0,.66,-1.07],[.66,-1.07,.33,-.89],[.33,-.89,0,-1.07],[0,-1.07,0,0]])beam([1.615,2.32+a[1],6.55+a[0]],[1.615,2.32+a[3],6.55+a[2]],.009,M.gold,'banner');crescent(1.61,1.91,6.86,.17,'emblems',Math.PI/2);star(1.61,1.91,6.89,.095,M.gold,'emblems',Math.PI/2);}
   }
  }
  return finish();

};

})(typeof window !== 'undefined' ? window : globalThis);
