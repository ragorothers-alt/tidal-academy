/* 潮汐小島 · 程式化模型（img2threejs 重建）：潮汐博物館、天文望遠鏡觀星台、島嶼評價告示牌。 */
/* 潮汐小島 · 程式化模型（img2threejs 重建）：白石柱廊與藍金圓頂潮汐博物館。 */
(function(root){
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS.museum=function(THREE,kit){
    const STAGE=8;
    const g=new THREE.Group();g.name='tidal-crescent-museum';g.userData.sign=[0,3.35,1.905];
    const stone=kit.mat('#f3efe6',{roughness:.88},'stone'),shade=kit.mat('#d8cbb7',{roughness:.91},'stone'),light=kit.mat('#fff7e9',{roughness:.86},'stone');
    const blue=kit.mat('#3e5a8c',{roughness:.65},'roof'),blueLight=kit.mat('#526fa3',{roughness:.68},'roof'),blueDark=kit.mat('#283e67',{roughness:.72},'roof');
    const gold=kit.mat('#d8b45a',{roughness:.35,metalness:.72}),goldShade=kit.mat('#a78137',{roughness:.43,metalness:.64});
    const wood=kit.mat('#8f6040',{roughness:.78}),woodDark=kit.mat('#5d3d2a',{roughness:.85}),navy=kit.mat('#1f2c55',{roughness:.77}),glass=kit.win();glass.color.set('#497aa6');
    const groups={},batches=new Map(),tmp=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),unit=new THREE.Vector3(1,1,1);
    function part(id){const p=new THREE.Group();p.name=id;g.add(p);groups[id]=p;return p;}
    ['root','body','lower-roof','drum','dome','portico','steps','cornice','columns','door','side-windows','drum-windows','finial','lantern','ribs','star-emblem','column-bands','masonry-joints','door-mullions','roof-seams','sign-architrave'].forEach(part);
    function add(id,geo,mat,x=0,y=0,z=0,rot){if(STAGE<3)mat=stone;q.setFromEuler(new THREE.Euler(...(rot||[0,0,0])));tmp.compose(v.set(x,y,z),q,unit);geo.applyMatrix4(tmp);let list=batches.get(id);if(!list)batches.set(id,list=new Map());let bucket=list.get(mat);if(!bucket)list.set(mat,bucket=[]);bucket.push(geo.index?geo.toNonIndexed():geo);}
    function box(id,w,h,d,m,x,y,z,rot){add(id,new THREE.BoxGeometry(w,h,d),m,x,y,z,rot);}
    function cyl(id,r1,r2,h,m,x,y,z,n=20){add(id,new THREE.CylinderGeometry(r1,r2,h,n),m,x,y,z);}
    function rod(id,a,b,r,m,n=8){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),d=bb.clone().sub(aa);const geo=new THREE.CylinderGeometry(r,r,d.length(),n);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));const p=aa.add(bb).multiplyScalar(.5);add(id,geo,m,...p.toArray());}
    function pathTube(id,points,r,m,segments=24,radial=6){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(id,new THREE.TubeGeometry(curve,segments,r,radial,false),m);}
    function profile(w,h){const s=new THREE.Shape(),r=w/2,cy=h-r;s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,cy);s.absarc(0,cy,r,0,Math.PI,false);s.closePath();return s;}
    function arch(id,w,h,d,m,x,y,z,rot){const geo=new THREE.ExtrudeGeometry(profile(w,h),{depth:d,bevelEnabled:false,curveSegments:12});add(id,geo,m,x,y,z,rot);}
    function archFrame(id,w,h,thick,depth,m,x,y,z,rot){const s=profile(w,h),inner=profile(w-2*thick,h-thick);s.holes.push(new THREE.Path(inner.getPoints(24).map(p=>new THREE.Vector2(p.x,p.y+thick))));const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:12});add(id,geo,m,x,y,z,rot);}
    function beam(id,a,b,w,d,m){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),delta=bb.clone().sub(aa);const geom=new THREE.BoxGeometry(w,delta.length(),d);geom.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));add(id,geom,m,...aa.add(bb).multiplyScalar(.5).toArray());}
    // Body and broad stair: the front porch stays in the inherited collision footprint.
    box('root',7.0,.26,4.4,shade,0,.13,-.35);box('root',6.85,.18,4.26,stone,0,.35,-.35);
    box('body',6.72,2.57,3.38,stone,0,1.71,-.86);
    for(let i=0;i<4;i++){const z=2.6-i*.225,back=1.3;box('steps',4.95-i*.04,.13*(i+1),z-back,shade,0,.065*(i+1),(z+back)/2);if(STAGE>=2)box('steps',5.0-i*.04,.035,.105,light,0,.13*(i+1)+.017,z-.0525);}
    box('steps',5.5,.14,1.05,stone,0,.53,1.325);
    box('cornice',6.98,.23,4.34,stone,0,3.08,-.35);
    // Shallow hipped roof built from a closed loft; its blue field supports the drum.
    {const bottom=[[-3.48,3.21,-2.52],[3.48,3.21,-2.52],[3.48,3.21,1.82],[-3.48,3.21,1.82]],top=[[-2.12,3.95,-1.5],[2.12,3.95,-1.5],[2.12,3.95,.63],[-2.12,3.95,.63]],p=[],ind=[];bottom.concat(top).forEach(a=>p.push(...a));ind.push(0,2,1,0,3,2,4,5,6,4,6,7);for(let j=0;j<4;j++){let k=(j+1)%4;ind.push(j,k,k+4,j,k+4,j+4);}for(let i=0;i<ind.length;i+=3){const a=ind[i+1];ind[i+1]=ind[i+2];ind[i+2]=a;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ind);const flat=geo.toNonIndexed();flat.computeVertexNormals();add('lower-roof',flat,blue);geo.dispose();}
    cyl('drum',2.025,2.04,.81,stone,0,4.17,-.35,40);cyl('drum',2.15,2.15,.12,shade,0,3.82,-.35,48);
    const domeGeo=new THREE.SphereGeometry(2.12,48,20,0,Math.PI*2,0,Math.PI/2);domeGeo.scale(1,.84,1);add('dome',domeGeo,blue,0,4.54,-.35);
    cyl('finial',.38,.48,.1,gold,0,6.36,-.35);cyl('finial',.22,.35,.15,gold,0,6.46,-.35);add('finial',new THREE.SphereGeometry(.16,16,10),blueLight,0,6.63,-.35);add('finial',new THREE.ConeGeometry(.105,.32,6),gold,0,6.81,-.35);
    // Four stout portico columns, a smaller triangular pediment, and a warm arched door.
    for(const x of [-2.48,-1.48,1.48,2.48]){
      cyl('columns',.255,.30,2.31,stone,x,1.815,1.42,24);
      if(STAGE>=1){box('columns',.73,.24,.73,shade,x,.62,1.42);cyl('columns',.35,.35,.13,light,x,.795,1.42);box('columns',.77,.2,.76,light,x,3.015,1.42);cyl('column-bands',.31,.31,.115,gold,x,.88,1.42);cyl('column-bands',.31,.31,.105,gold,x,2.865,1.42);cyl('column-bands',.305,.305,.17,navy,x,2.96,1.42);}
    }
    box('portico',5.86,.18,.94,shade,0,3.15,1.4);box('sign-architrave',5.72,.64,.92,stone,0,3.35,1.4);
    {const s=new THREE.Shape();s.moveTo(-2.82,0);s.lineTo(2.82,0);s.lineTo(0,1.13);s.closePath();add('portico',new THREE.ExtrudeGeometry(s,{depth:.84,bevelEnabled:false}),stone,0,3.66,.98);}
    arch('door',1.55,2.25,.13,woodDark,0,.48,.835);arch('door',1.36,2.07,.14,wood,0,.5,.98);
    if(STAGE>=1){archFrame('door',1.87,2.43,.18,.14,shade,0,.44,.92);box('door',.035,1.77,.045,woodDark,0,1.385,1.145);for(const x of [-.1,.1])rod('door-mullions',[x,1.06,1.17],[x,1.31,1.17],.026,gold);}
    if(STAGE>=2){
      beam('portico',[-2.85,3.67,1.86],[0,4.83,1.86],.14,.08,light);beam('portico',[0,4.83,1.86],[2.85,3.67,1.86],.14,.08,light);box('portico',5.83,.12,.08,light,0,3.68,1.86);
      // Windows stand proud of masonry by 0.02, arch frames establish true relief.
      function window(id,x,y,z,rot,w=.72,h=1.54){arch(id,w+.17,h+.13,.075,shade,x,y-.04,z,rot);arch(id,w,h,.09,navy,x,y,z+.001,rot);arch(id,w-.15,h-.13,.1,glass,x,y+.07,z+.002,rot);archFrame(id,w,h,.045,.14,gold,x,y,z+.004,rot);}
      for(const side of [-1,1])for(const z of [-1.9,-.65,.55]){const rot=[0,side*Math.PI/2,0];const p=new THREE.Group();p.name='window-bay';const id='side-windows';window(id,side*3.367,.75,z,rot);}
      for(const x of [-2.65,2.65])window('side-windows',x,.89,.836,undefined,.6,1.36);
      for(let n=0;n<8;n++){const a=n*Math.PI/4,rot=[0,a,0],x=2.034*Math.sin(a),z=-.35+2.034*Math.cos(a);window('drum-windows',x,3.92,z,rot,.37,.61);}
      // Central leaf glazing follows the round head, with broad brass diamonds.
      for(const x of [-.32,.32]){arch('door',.49,1.32,.026,glass,x,1.16,1.127);rod('door-mullions',[x,1.25,1.16],[x,2.2,1.16],.012,gold);for(const sign of [-1,1]){rod('door-mullions',[x-.18,1.75,1.17],[x,1.75+sign*.22,1.17],.012,gold);rod('door-mullions',[x+.18,1.75,1.17],[x,1.75+sign*.22,1.17],.012,gold);}}
      // Gold crescent and four-point star, shallow embossed rather than painted.
      const cres=new THREE.Shape();cres.absarc(0,0,.48,Math.PI*.21,Math.PI*1.79,false);cres.quadraticCurveTo(-.9,0,.48*Math.cos(Math.PI*.21),.48*Math.sin(Math.PI*.21));add('star-emblem',new THREE.ExtrudeGeometry(cres,{depth:.065,bevelEnabled:false,curveSegments:24}),gold,-.08,4.09,1.825);
      const st=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/2+i*Math.PI/4,r=i%2?.09:.29;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?st.lineTo(x,y):st.moveTo(x,y);}st.closePath();add('star-emblem',new THREE.ExtrudeGeometry(st,{depth:.075,bevelEnabled:false}),gold,.24,4.13,1.825);
      for(let n=0;n<8;n++){const a=n*Math.PI/4,pts=[];for(let k=0;k<=16;k++){const t=k/16*Math.PI/2;pts.push([2.14*Math.sin(t)*Math.sin(a),4.54+1.795*Math.cos(t),-.35+2.14*Math.sin(t)*Math.cos(a)]);}pathTube('ribs',pts,.029,gold,32);}
      cyl('ribs',2.18,2.18,.09,gold,0,4.555,-.35,48);
      // A single compact lantern, supported by a visible hook above the door.
      rod('lantern',[0,2.86,1.04],[0,2.86,1.3],.018,goldShade);rod('lantern',[0,2.86,1.3],[0,2.73,1.3],.018,goldShade);cyl('lantern',.11,.14,.26,glass,0,2.58,1.3,6);cyl('lantern',.15,.15,.045,gold,0,2.425,1.3,6);add('lantern',new THREE.ConeGeometry(.19,.16,6),gold,0,2.79,1.3);for(let j=0;j<6;j++){const a=j*Math.PI/3,x=Math.cos(a)*.13,z=1.3+Math.sin(a)*.13;rod('lantern',[x,2.44,z],[x,2.72,z],.014,goldShade);}
    }
    if(STAGE>=4){
      // Restrained real slate courses and stone joints; deterministic without noise.
      for(let row=1;row<6;row++){const t=row/6*Math.PI/2,r=2.126*Math.sin(t),y=4.54+1.786*Math.cos(t);const geo=new THREE.TorusGeometry(r,.009,4,64);add('roof-seams',geo,blueDark,0,y,-.35,[Math.PI/2,0,0]);}
      for(let row=1;row<6;row++){const count=12+row*4;for(let j=0;j<count;j++){const a=(j+(row%2)*.5)/count*Math.PI*2,pts=[];for(let k=0;k<=4;k++){const t=(row+k/4)/6*Math.PI/2;pts.push([2.128*Math.sin(t)*Math.sin(a),4.54+1.788*Math.cos(t),-.35+2.128*Math.sin(t)*Math.cos(a)]);}pathTube('roof-seams',pts,.006,blueDark,4,3);}}
      for(let row=0;row<4;row++){const y=.68+row*.57;for(const side of [-1,1])box('masonry-joints',.014,.014,3.3,shade,side*3.365,y,-.86);box('masonry-joints',6.69,.014,.014,shade,0,y,-2.554);}
      // Eave rims and corner pilasters repeat only at construction boundaries.
      for(const x of [-3.28,3.28])for(const z of [-2.46,.74]){box('body',.2,2.45,.2,light,x,1.75,z);box('body',.34,.16,.26,shade,x,2.96,z);}
      box('cornice',7.04,.09,4.4,light,0,3.235,-.35);
      for(const side of [-1,1])beam('roof-seams',[side*3.46,3.27,1.8],[side*2.1,3.99,.63],.045,.045,gold);
    }
    // Merge compatible geometry within each named assembly; preserve UVs for kit finish.
    for(const [id,mats] of batches)for(const [mat,geos] of mats){let total=0;for(const a of geos)total+=a.attributes.position.count;const pp=new Float32Array(total*3),nn=new Float32Array(total*3),uu=new Float32Array(total*2);let at=0;for(const a of geos){const count=a.attributes.position.count;pp.set(a.attributes.position.array,at*3);if(a.attributes.normal)nn.set(a.attributes.normal.array,at*3);if(a.attributes.uv)uu.set(a.attributes.uv.array,at*2);at+=count;a.dispose();}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pp,3));geo.setAttribute('normal',new THREE.BufferAttribute(nn,3));geo.setAttribute('uv',new THREE.BufferAttribute(uu,2));const mesh=new THREE.Mesh(geo,mat);mesh.name=id+'-'+groups[id].children.length;mesh.castShadow=true;mesh.receiveShadow=true;groups[id].add(mesh);}
    return g;
  };
})(typeof window!=='undefined'?window:globalThis);

/* 潮汐小島 · 程式化觀星台：薄石平台、黃銅渾天儀與暖木三腳望遠鏡。 */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};
  I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS.telescope=function(THREE,kit){
    const g=new THREE.Group();g.name='telescope-observatory';
    const M={stone:kit.mat('#eee4cf',{roughness:.89},'stone'),stone2:kit.mat('#d8cab0',{roughness:.92},'stone'),joint:kit.mat('#baac91',{roughness:.95}),navy:kit.mat('#2b456b',{roughness:.66}),ivory:kit.mat('#eee3cb',{roughness:.7}),gold:kit.mat('#d8b45a',{roughness:.4,metalness:.6}),goldLight:kit.mat('#ecd193',{roughness:.34,metalness:.55}),darkGold:kit.mat('#94733c',{roughness:.5,metalness:.66}),wood:kit.mat('#8e6040',{roughness:.8},'wall'),woodLight:kit.mat('#b18354',{roughness:.78},'wall'),crystal:kit.mat('#5faef0',{roughness:.27,metalness:.1,emissive:'#5dbeff',emissiveIntensity:.68}),lens:kit.win()};
    M.lens.color.set('#467dd4');
    const parts=new Map();
    function add(id,geo,mat){if(!geo.getAttribute('normal'))geo.computeVertexNormals();const k=id+':'+Object.keys(M).find(k=>M[k]===mat);if(!parts.has(k))parts.set(k,{id,mat,geos:[]});parts.get(k).geos.push(geo.index?geo.toNonIndexed():geo);}
    function transform(geo,p,r=[0,0,0]){return geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(1,1,1)));}
    function cylinder(id,p,rt,rb,h,mat,seg=24,r){add(id,transform(new THREE.CylinderGeometry(rt,rb,h,seg),p,r),mat);}
    function box(id,p,s,mat,r){add(id,transform(new THREE.BoxGeometry(...s),p,r),mat);}
    function beam(id,a,b,rt,rb,mat,seg=10){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),geo=new THREE.CylinderGeometry(rt,rb,d.length(),seg);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(id,geo,mat);}
    function woodBeam(id,a,b,w,d,mat){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),geo=new THREE.BoxGeometry(w,v.length(),d);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate(...A.add(B).multiplyScalar(.5).toArray());add(id,geo,mat);}
    function torus(id,p,R,t,mat,r=[0,0,0],seg=48){add(id,transform(new THREE.TorusGeometry(R,t,6,seg),p,r),mat);}
    function annulus(id,inner,outer,y,mat,start=0,end=Math.PI*2,segments=96){const v=[];for(let j=0;j<segments;j++){const a=start+(end-start)*j/segments,b=start+(end-start)*(j+1)/segments;const A=[Math.sin(a)*inner,y,Math.cos(a)*inner],B=[Math.sin(a)*outer,y,Math.cos(a)*outer],C=[Math.sin(b)*outer,y,Math.cos(b)*outer],D=[Math.sin(b)*inner,y,Math.cos(b)*inner];v.push(...A,...B,...C,...A,...C,...D);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();add(id,geo,mat);}
    function star(id,p,rad,mat,flat=false){const shape=new THREE.Shape();for(let j=0;j<16;j++){const a=Math.PI/2+j*Math.PI/8,R=j%2?rad*.24:rad*(j%4===0?1:.65),x=Math.cos(a)*R,y=Math.sin(a)*R;if(j===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.006,steps:1,bevelEnabled:false});if(flat)geo.rotateX(-Math.PI/2);geo.translate(...p);add(id,geo,mat);}
    // The whole floor, including inlay, remains below y=.1 for walkability.
    cylinder('platform',[0,.039,0],2.18,2.2,.078,M.stone,96);
    cylinder('platform',[0,.084,0],2.16,2.18,.012,M.stone2,96);
    cylinder('platform',[0,.092,0],2.15,2.15,.004,M.stone,96);
    annulus('floor-inlay',1.78,2.025,.0945,M.navy);
    for(const r of [1.77,2.038,2.12])annulus('floor-inlay',r,r+.016,.096,M.gold);
    annulus('compass',.66,.674,.096,M.gold);annulus('compass',.69,.7,.096,M.darkGold);
    star('compass',[0,.092,0],.63,M.gold,true);
    for(let j=0;j<16;j++){const a=j*Math.PI/8;box('floor-joints',[Math.sin(a)*1.45,.095,Math.cos(a)*1.45],[.009,.002,1.35],M.joint,[0,a,0]);if(j%2===0)star('compass',[Math.sin(a)*1.9,.092,Math.cos(a)*1.9],.065,M.gold,true);}
    // Compact armillary, its complete low silhouette fits the existing r=.55 collider.
    const ac=[-.145,1.26,-.135];
    cylinder('armillary',[-.145,.13,-.135],.208,.235,.068,M.stone,24);
    cylinder('armillary',[-.145,.19,-.135],.19,.205,.065,M.navy,24);
    cylinder('armillary',[-.145,.241,-.135],.205,.205,.038,M.gold,24);
    cylinder('armillary-stem',[-.145,.42,-.135],.073,.118,.33,M.gold,16);
    cylinder('armillary-stem',[-.145,.67,-.135],.065,.065,.16,M.darkGold,16);
    cylinder('armillary-stem',[-.145,.792,-.135],.104,.073,.08,M.goldLight,16);
    torus('armillary-rings',ac,.37,.032,M.gold,[0,0,.08],56);
    torus('armillary-ring2',ac,.342,.025,M.goldLight,[.2,Math.PI/2,.1],56);
    torus('armillary-ring3',ac,.359,.03,M.gold,[Math.PI/2-.2,0,.25],56);
    beam('armillary-stem',[-.145,.8,-.135],[-.145,1.69,-.135],.018,.018,M.darkGold,8);
    const cg=new THREE.IcosahedronGeometry(.22,1);cg.scale(1,.98,1);cg.translate(...ac);cg.computeVertexNormals();add('crystal',cg,M.crystal);
    cylinder('finial',[-.145,1.672,-.135],.038,.038,.061,M.gold,12);
    const diamond=new THREE.OctahedronGeometry(.071);diamond.scale(.65,1.5,.65);diamond.translate(-.145,1.746,-.135);add('finial',diamond,M.gold);
    cylinder('armillary-hub',[-.145,1.26,.26],.089,.089,.046,M.darkGold,24,[Math.PI/2,0,0]);
    cylinder('armillary-hub',[-.145,1.26,.286],.071,.071,.015,M.goldLight,24,[Math.PI/2,0,0]);star('armillary-hub',[-.145,1.26,.296],.063,M.gold);
    // Three splayed feet carry a braced pier and a vertical azimuth bearing.
    const tc=[.225,0,.08];
    for(let j=0;j<3;j++){
      const a=-.3+j*Math.PI*2/3,foot=[tc[0]+Math.sin(a)*.238,.109,tc[2]+Math.cos(a)*.238],neck=[tc[0]+Math.sin(a)*.067,1.34,tc[2]+Math.cos(a)*.067];
      woodBeam('tripod-legs',foot,neck,.074,.085,M.wood);
      woodBeam('tripod-legs',[foot[0]+.006,foot[1]+.06,foot[2]+.004],[neck[0]+.006,neck[1]-.08,neck[2]+.004],.019,.09,M.woodLight);
      woodBeam('tripod-feet',foot,[foot[0]*.98,foot[1]+.12,foot[2]*.98],.098,.106,M.gold);
      const collar=foot.map((v,k)=>v+(neck[k]-v)*.76);woodBeam('tripod-feet',collar,collar.map((v,k)=>v+(neck[k]-foot[k])*.055),.095,.1,M.gold);
      const mid=foot.map((v,k)=>v+(neck[k]-v)*.38);beam('tripod-braces',[tc[0],.57,tc[2]],mid,.013,.013,M.darkGold,8);
    }
    cylinder('tripod-braces',[tc[0],.57,tc[2]],.043,.043,.065,M.gold,12);
    cylinder('tripod-head',[tc[0],1.365,tc[2]],.15,.15,.077,M.darkGold,24);
    cylinder('tripod-head',[tc[0],1.416,tc[2]],.166,.166,.025,M.gold,24);
    cylinder('tripod-head',[tc[0],1.457,tc[2]],.084,.084,.057,M.navy,20);
    cylinder('tripod-head',[tc[0],1.504,tc[2]],.147,.147,.037,M.gold,24);
    for(let j=0;j<24;j++){const a=j*Math.PI/12;box('tripod-head',[tc[0]+Math.sin(a)*.130,1.524,tc[2]+Math.cos(a)*.130],[.008,.003,j%3===0?.022:.012],M.darkGold,[0,a,0]);}
    // Altitude bearings lie on a horizontal axis exactly normal to the optical axis.
    const origin=new THREE.Vector3(.225,1.76,.08),axis=new THREE.Vector3(.8,.53,.28).normalize(),across=new THREE.Vector3(-axis.z,0,axis.x).normalize(),up=new THREE.Vector3().crossVectors(across,axis).normalize();
    function point(t){return origin.clone().addScaledVector(axis,t).toArray();}
    const opticQ=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
    function sleeve(id,t0,t1,r0,r1,th,mat,seg=18){const p=[[r0-th,t0],[r0,t0],[r1,t1],[r1-th,t1],[r0-th,t0]].map(v=>new THREE.Vector2(...v)),geo=new THREE.LatheGeometry(p,seg);geo.applyQuaternion(opticQ);geo.translate(...origin.toArray());add(id,geo,mat);}
    // Hollow tube sections butt against stepped retaining rings; no nested solid cones.
    sleeve('barrel-navy',-.37,-.16,.113,.124,.018,M.navy);
    sleeve('barrel',-.16,-.06,.124,.134,.018,M.ivory);
    sleeve('barrel',-.06,.06,.134,.134,.018,M.ivory);
    sleeve('barrel',.06,.18,.134,.143,.018,M.ivory);
    sleeve('barrel-navy',.18,.52,.143,.163,.018,M.navy);
    sleeve('barrel',.52,.83,.163,.185,.018,M.ivory);
    for(const [a,b,ri,ro] of [[-.39,-.37,.095,.13],[-.177,-.143,.123,.143],[.163,.197,.144,.161],[.503,.537,.165,.185],[.813,.85,.184,.201]])sleeve('barrel-collars',a,b,ro,ro,ro-ri,M.gold);
    // Objective is recessed inside an open dew shield and retained by an annular lip.
    sleeve('objective-lip',.85,.965,.205,.211,.023,M.gold,24);
    sleeve('objective-lip',.965,.986,.211,.211,.025,M.darkGold,24);
    beam('telescope-lens',point(.943),point(.953),.182,.182,M.lens,32);
    sleeve('objective-lip',.953,.965,.190,.190,.009,M.gold,24);
    sleeve('eyepiece',-.43,-.39,.062,.095,.014,M.gold,12);
    sleeve('eyepiece',-.59,-.43,.047,.062,.012,M.gold,12);
    sleeve('eyepiece',-.62,-.59,.048,.048,.016,M.navy,12);
    beam('eyepiece',point(-.613),point(-.608),.031,.031,M.lens,16);
    // Octagonal clamping saddle has flat trunnion seats and a true tube bore.
    const clamp=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,x=Math.cos(a)*.174,y=Math.sin(a)*.174;i?clamp.lineTo(x,y):clamp.moveTo(x,y);}clamp.closePath();
    const bore=new THREE.Path();bore.absarc(0,0,.134,0,Math.PI*2,true);clamp.holes.push(bore);
    const cg2=new THREE.ExtrudeGeometry(clamp,{depth:.10,steps:1,bevelEnabled:false,curveSegments:12});cg2.translate(0,0,-.05);
    const radialDown=up.clone().negate(),frame=new THREE.Matrix4().makeBasis(across,radialDown,axis);cg2.applyMatrix4(frame);cg2.translate(...origin.toArray());add('telescope-yoke',cg2,M.gold);
    const seat=.174*Math.cos(Math.PI/8),forkYaw=Math.atan2(across.x,across.z),axleQ=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),across);
    function bearing(s0,s1,ro,ri,mat){const geo=new THREE.LatheGeometry([[ri,s0],[ro,s0],[ro,s1],[ri,s1],[ri,s0]].map(v=>new THREE.Vector2(...v)),12);geo.applyQuaternion(axleQ);geo.translate(...origin.toArray());add('telescope-yoke',geo,mat);}
    for(const side of [-1,1]){
      const s=new THREE.Shape();s.moveTo(-.09,1.52);s.lineTo(.09,1.52);s.lineTo(.09,1.76);s.absarc(0,1.76,.09,0,Math.PI,false);s.lineTo(-.09,1.52);s.closePath();
      const hole=new THREE.Path();hole.absarc(0,1.76,.067,0,Math.PI*2,true);s.holes.push(hole);
      const geo=new THREE.ExtrudeGeometry(s,{depth:.05,bevelEnabled:false,steps:1,curveSegments:12});geo.translate(0,0,-.025);geo.rotateY(forkYaw);geo.translate(origin.x+across.x*side*.22,0,origin.z+across.z*side*.22);add('telescope-yoke',geo,M.gold);
      const end=origin.clone().addScaledVector(across,side*.254).toArray(),start=origin.clone().addScaledVector(across,side*seat).toArray();beam('telescope-yoke',start,end,.041,.041,M.darkGold,16);
      bearing(side*.22-.028,side*.22+.028,.067,.042,M.darkGold);
      // Feet of both fork cheeks land on the azimuth platter via a cross saddle.
      const a=origin.clone().addScaledVector(across,side*.22);woodBeam('telescope-yoke',[tc[0],1.503,tc[2]],[a.x,1.538,a.z],.075,.075,M.gold);
    }
    // Front altitude scale, lock boss and thumb lever share the trunnion axis.
    bearing(.248,.267,.107,.042,M.goldLight);bearing(.267,.289,.061,.042,M.darkGold);
    const hub=origin.clone().addScaledVector(across,.30).toArray();beam('telescope-yoke',origin.clone().addScaledVector(across,.254).toArray(),hub,.032,.032,M.gold,16);
    const hDir=new THREE.Vector3(axis.x,0,axis.z).normalize();
    for(let i=0;i<12;i++){const a=i*Math.PI/6,p=origin.clone().addScaledVector(across,.269).addScaledVector(hDir,Math.sin(a)*.089);p.y+=Math.cos(a)*.089;const geo=new THREE.BoxGeometry(.008,.017,.004);geo.rotateZ(-a);geo.rotateY(forkYaw);geo.translate(...p.toArray());add('telescope-yoke',geo,M.darkGold);}
    const leverEnd=origin.clone().addScaledVector(across,.302).addScaledVector(hDir,.095);leverEnd.y-=.060;beam('telescope-yoke',hub,leverEnd.toArray(),.014,.014,M.gold,10);
    // Finder rings are carried on two short feet outside the main barrel envelope.
    const finder=t=>origin.clone().addScaledVector(axis,t).addScaledVector(up,.232).toArray();
    for(const u of [.15,.45]){
      const r=u<.2?.142:.159,a=origin.clone().addScaledVector(axis,u).addScaledVector(up,r),b=origin.clone().addScaledVector(axis,u).addScaledVector(up,.190);
      beam('finder',a.toArray(),b.toArray(),.018,.018,M.gold,8);
      const geo=new THREE.LatheGeometry([[.031,-.018],[.042,-.018],[.042,.018],[.031,.018],[.031,-.018]].map(v=>new THREE.Vector2(...v)),12);geo.applyQuaternion(opticQ);geo.translate(...finder(u));add('finder',geo,M.gold);
    }
    const fg=new THREE.LatheGeometry([[.023,.06],[.030,.06],[.030,.56],[.023,.56],[.023,.06]].map(v=>new THREE.Vector2(...v)),16);fg.applyQuaternion(opticQ);fg.translate(...origin.clone().addScaledVector(up,.232).toArray());add('finder',fg,M.navy);
    beam('finder',finder(.552),finder(.558),.022,.022,M.lens,16);
    // Merge static relief into each named material-part; retain useful semantic part nodes.
    const nodes=new Map();
    const pivots={platform:[0,0,0],'floor-inlay':[0,0,0],'floor-joints':[0,0,0],compass:[0,0,0],armillary:[-.145,.1,-.135],'armillary-stem':[-.145,.26,-.135],'armillary-rings':ac,'armillary-ring2':ac,'armillary-ring3':ac,crystal:ac,finial:[-.145,1.64,-.135],'armillary-hub':[-.145,1.26,.26],'tripod-legs':[.225,1.34,.08],'tripod-feet':[.225,.1,.08],'tripod-braces':[.225,.57,.08],'tripod-head':[.225,1.34,.08],'telescope-yoke':[.225,1.735,.08],barrel:origin.toArray(),'barrel-navy':origin.toArray(),'barrel-collars':origin.toArray(),'objective-lip':point(.84),'telescope-lens':point(.943),eyepiece:point(-.4),finder:finder(.06)};
    for(const b of parts.values()){
      let len=0;for(const q of b.geos)len+=q.attributes.position.array.length;
      const pos=new Float32Array(len),nor=new Float32Array(len);let at=0;
      for(const q of b.geos){pos.set(q.attributes.position.array,at);nor.set(q.attributes.normal.array,at);at+=q.attributes.position.array.length;q.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.computeBoundingSphere();
      const pivot=pivots[b.id]||[0,0,0];geo.translate(-pivot[0],-pivot[1],-pivot[2]);
      if(!nodes.has(b.id)){const node=new THREE.Group();node.name=b.id;node.position.fromArray(pivot);nodes.set(b.id,node);g.add(node);}
      const mesh=new THREE.Mesh(geo,b.mat);mesh.name=b.id+':'+Object.keys(M).find(k=>M[k]===b.mat);mesh.castShadow=true;mesh.receiveShadow=true;nodes.get(b.id).add(mesh);
    }
    for(const [id,node] of nodes)if(id==='armillary'||id.startsWith('armillary-')||id==='crystal'||id==='finial')node.position.add(new THREE.Vector3(-.045,0,-.10));
    return g;
  };
})(typeof window!=='undefined'?window:globalThis);

/* Tidal Academy: procedural fantasy island noticeboard. */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS.board = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'board-model';
    const M = {
      stone: kit.mat('#eee3cb', {roughness:.88}, 'stone'),
      wood: kit.mat('#8f6040', {roughness:.78}, 'wall'),
      woodLight: kit.mat('#a9774e', {roughness:.76}, 'wall'),
      dark: kit.mat('#513b2d', {roughness:.85}),
      roof: kit.mat('#3e5a8c', {roughness:.66}, 'roof'),
      roofLight: kit.mat('#5b7fb0', {roughness:.64}, 'roof'),
      gold: kit.mat('#cba555', {roughness:.43, metalness:.66}),
      paper: kit.mat('#f4e7c9', {roughness:.94}),
      ink: kit.mat('#746c59', {roughness:.92}),
      glow: kit.win()
    };
    const buckets = new Map();
    function add(geo, material, part) {
      const key=part+':'+material; let b=buckets.get(key);
      if(!b){b={part,material,geos:[]};buckets.set(key,b);} b.geos.push(geo);
    }
    function tf(geo,x,y,z,rx=0,ry=0,rz=0){geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));return geo;}
    function box(x,y,z,w,h,d,mat,part,rx=0,ry=0,rz=0){add(tf(new THREE.BoxGeometry(w,h,d),x,y,z,rx,ry,rz),mat,part);}
    function profile(points,depth,x,y,z,mat,part,bevel=0,rz=0){const shape=new THREE.Shape();shape.moveTo(...points[0]);for(let i=1;i<points.length;i++)shape.lineTo(...points[i]);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1,curveSegments:12});add(tf(geo,x,y,z,0,0,rz),mat,part);}
    function beam(a,b,r,mat,part,r2=r,seg=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);const geo=new THREE.CylinderGeometry(r2,r,v.length(),seg);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate(...A.clone().add(B).multiplyScalar(.5).toArray());add(geo,mat,part);}
    function sphere(x,y,z,r,mat,part,sx=1,sy=1,sz=1){const geo=new THREE.SphereGeometry(r,8,5);geo.scale(sx,sy,sz);add(tf(geo,x,y,z),mat,part);}
    // PASS:blockout ? a broad frame with two grounded posts and shallow blue gable.
    box(0,.045,0,1.46,.09,.4,'stone','root');
    for(const side of [-1,1]){
      const x=side*.63,part=side<0?'post-left':'post-right';
      box(x,.14,0,.25,.19,.3,'stone','root');
      box(x,.96,0,.14,1.60,.17,'wood',part);
    }
    box(0,1.18,0,1.22,1.04,.12,'wood','board');
    // GAME structure: timber gable, independent slate roof skin.
    const gable=[[-.79,-.065]];for(let j=0;j<=16;j++){const x=-.79+j*1.58/16;gable.push([x,roofY(x)-1.815]);}gable.push([.79,-.065]);profile(gable,.13,0,1.79,-.065,'wood','roof');
    function roofY(x){const t=Math.abs(x)/.8;return 2.14-.40*t+.055*t*t*t*t;}
    function quad(a,b,c,d,mat,part){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));geo.computeVertexNormals();add(geo,mat,part);}
    for(const side of [-1,1])for(let i=0;i<8;i++){const x0=side*.8*i/8,x1=side*.8*(i+1)/8,y0=roofY(x0),y1=roofY(x1);const a=[x0,y0,-.27],b=[x0,y0,.27],c=[x1,y1,.27],d=[x1,y1,-.27];if(side>0)quad(a,b,c,d,'roof','roof');else quad(d,c,b,a,'roof','roof');}

    // GAME structure: four staggered paper sheets, connected lantern cages.
    const papers=[[-.37,1.16,.32,.56,-.035],[.04,1.32,.32,.28,.055],[-.005,.96,.24,.27,-.02],[.38,1.07,.23,.40,.045]];
    const paperNames=['paper-large','paper-upper','paper-lower','paper-right'];
    papers.forEach((p,i)=>{const w=p[2],h=p[3];profile([[-w/2,-h/2],[w/2-.038,-h/2],[w/2,-h/2+.043],[w/2,h/2],[-w/2,h/2]],.014,p[0],p[1],.079,'paper',paperNames[i],0,p[4]);});
    for(const side of [-1,1]){
      const part=side<0?'lantern-left':'lantern-right',x=side*.795;
      beam([side*.63,1.72,0],[x,1.72,0],.028,'wood',part);
      beam([x,1.72,0],[x,1.62,0],.012,'gold',part);
      box(x,1.41,0,.135,.25,.135,'glow',part);
      for(const dx of [-.074,.074])for(const z of [-.074,.074])beam([x+dx,1.27,z],[x+dx,1.55,z],.01,'gold',part);
      for(const y of [1.26,1.56])box(x,y,0,.19,.035,.19,'gold',part);
      add(tf(new THREE.ConeGeometry(.123,.105,4),x,1.625,0,0,Math.PI/4),'gold',part);
      add(tf(new THREE.ConeGeometry(.043,.065,4),x,1.217,0,Math.PI,Math.PI/4),'gold',part);
    }
    for(const y of [.665,1.70])box(0,y,.032,1.26,.075,.17,'woodLight','board');
    for(const x of [-.60,.60])box(x,1.18,.062,.07,1.04,.11,'woodLight','board');

    // GAME form: slate overlaps, curved fascia, stone cornices and brass collars.
    function slateQuad(a,b,c,d,mat){quad(a,b,c,d,mat,'roof');const ps=[a,b,c,d];for(let i=0;i<4;i++){const p=ps[i],q=ps[(i+1)%4],lo=v=>[v[0],v[1]-.015,v[2]];quad(q,p,lo(p),lo(q),mat,'roof');}}
    for(const side of [-1,1]){
      for(let row=0;row<4;row++)for(let j=0;j<5;j++){
        const xa=side*(.005+row*.199),xb=side*(.005+(row+1)*.199),z0=-.267+j*.107,z1=z0+.104;
        const a=[xa,roofY(xa)+.012,z0],b=[xa,roofY(xa)+.012,z1],c=[xb,roofY(xb)+.015,z1],d=[xb,roofY(xb)+.015,z0];
        if(side>0)slateQuad(a,b,c,d,(row+j)%3?'roof':'roofLight');else slateQuad(d,c,b,a,(row+j)%3?'roof':'roofLight');
      }
      for(const z of [-.274,.274])for(let j=0;j<8;j++){const x0=side*j*.1,x1=side*(j+1)*.1;beam([x0,roofY(x0)+.025,z],[x1,roofY(x1)+.025,z],.009,'gold','roof');}
      box(side*.63,.245,0,.18,.035,.205,'gold',side<0?'post-left':'post-right');
      box(side*.63,.52,0,.16,.035,.19,'gold',side<0?'post-left':'post-right');
      box(side*.63,.23,0,.29,.045,.33,'stone','root');
      box(side*.63,.09,0,.31,.055,.36,'stone','root');
    }
    beam([0,2.175,-.27],[0,2.175,.27],.017,'gold','roof');
    for(const z of [-.245,.245]){add(tf(new THREE.ConeGeometry(.025,.10,5),0,2.232,z),'gold','roof');}
    // Front moon and star relief leaves the sign region below it clear.
    const moon=[];for(let i=0;i<=18;i++){const a=(55+i*250/18)*Math.PI/180;moon.push([Math.cos(a)*.112,Math.sin(a)*.112]);}for(let i=0;i<=18;i++){const a=(295-i*230/18)*Math.PI/180;moon.push([.035+Math.cos(a)*.086,Math.sin(a)*.086]);}
    profile(moon,.014,0,2.005,.279,'gold','emblem');
    function star(x,y,z,r,part){const pts=[];for(let j=0;j<8;j++){const a=Math.PI/2+j*Math.PI/4,R=j%2?r*.26:r;pts.push([Math.cos(a)*R,Math.sin(a)*R]);}profile(pts,.012,x,y,z,'gold',part);}
    star(.012,2.005,.297,.059,'emblem');
    // Clipped corner parchment silhouettes and pin crowns.
    papers.forEach((p,i)=>{sphere(p[0],p[1]+p[3]*.5-.037,.104,.015,'gold','pins',1,1,.55);});
    // GAME surface/material: broad planks, sparse schematic ink, real sign backplate.
    for(let row=0;row<6;row++)box(0,.755+row*.158,.068,1.12,.152,.014,row%3?'wood':'woodLight','board');
    papers.forEach((p,i)=>{
      const name=paperNames[i],c=Math.cos(p[4]),sn=Math.sin(p[4]);
      function stroke(x,y,w,h){box(p[0]+x*c-y*sn,p[1]+x*sn+y*c,.101,w,h,.0025,'ink',name,0,0,p[4]);}
      stroke(0,p[3]*.5-.105,p[2]*.57,.009);
      stroke(-p[2]*.03,p[3]*.5-.143,p[2]*.53,.007);
      if(i!==1){stroke(-p[2]*.07,p[3]*.5-.183,p[2]*.45,.007);}
      if(i===0){
        stroke(-.034,-.085,.102,.008);stroke(.015,-.123,.13,.007);stroke(-.044,-.155,.08,.007);
        const pts=[[-.05,-.03],[0,.035],[.052,-.03],[.024,-.03],[0,0],[-.025,-.03]];
        profile(pts,.002,p[0],p[1]+.035,.101,'ink',name,0,p[4]);
      }
      if(i===3){stroke(.016,-.046,.09,.007);stroke(-.006,-.08,.13,.007);}
      const w=p[2],h=p[3],px=p[0]+(w*.5-.02)*c-(-h*.5+.02)*sn,py=p[1]+(w*.5-.02)*sn+(-h*.5+.02)*c;
      profile([[-.022,-.02],[.018,.024],[-.022,.024]],.007,px,py,.092,'paper',name,0,p[4]);
    });
    for(const x of [-.55,.55])for(const y of [.73,1.61]){const sx=x>0?-1:1,sy=y>1?-1:1;profile([[0,0],[sx*.085,0],[0,sy*.085]],.012,x,y,.103,'gold','fittings');}
    // The 1.2 x .3 game label is fully backed and sits .050 in front of this plate.
    box(0,1.46/.88,.185,1.26,.33/.88,.07,'dark','board');
    box(0,1.46/.88,.221,1.22,.305/.88,.004,'woodLight','board');
    for(const x of [-.57,.57])box(x,1.46/.88,.135,.045,.30/.88,.12,'wood','board');
    // Named pivot groups support inspection/picking without userData payload.
    // GAME assembly: rear load path, stable semantic pivots, no runtime metadata.
    beam([-.53,.75,-.079],[.53,1.58,-.079],.022,'wood','board');
    beam([.53,.75,-.084],[-.53,1.58,-.084],.022,'wood','board');
    const pivots={root:[0,0,0],'post-left':[-.63,.8448,0],'post-right':[.63,.8448,0],board:[0,1.0384,0],roof:[0,1.5752,0],'lantern-left':[-.795,1.5136,0],'lantern-right':[.795,1.5136,0],'paper-large':[-.37,1.0208,.079],'paper-upper':[.04,1.1616,.079],'paper-lower':[-.005,.8448,.079],'paper-right':[.38,.9416,.079],pins:[0,1.0384,.104],fittings:[0,1.0384,.103],emblem:[0,1.7644,.279]};

    for(const b of buckets.values()){
      const positions=[],normals=[];
      for(let geo of b.geos){const v=geo.index?geo.toNonIndexed():geo;positions.push(...v.attributes.position.array);normals.push(...v.attributes.normal.array);}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geometry.scale(1,.88,1);
      const pivot=pivots[b.part]||[0,0,0];geometry.translate(-pivot[0],-pivot[1],-pivot[2]);let node=g.getObjectByName(b.part);if(!node){node=new THREE.Group();node.name=b.part;node.position.fromArray(pivot);g.add(node);}
      const mesh=new THREE.Mesh(geometry,M[b.material]);mesh.name=b.part+'-'+b.material;mesh.castShadow=true;mesh.receiveShadow=true;node.add(mesh);
    }

    g.userData.sign=[0,1.46,.273];
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
