/* 潮汐小島 · 程式化模型（img2threejs 重建）：潮汐考場與潮汐圖書館。 */
/* Stylized single-view reconstruction. Metres, base at y=0, entrance faces +Z.
 * Materials use the game kit; text is supplied at userData.sign by the game. */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};

I.BLDMODELS['exam']=function tidalExamHall(THREE,kit){
 const g=new THREE.Group();g.name='tidal-exam-hall';
 const stone=kit.mat('#f3efe6',{roughness:.86},'stone'),shadow=kit.mat('#d8cbb7',{roughness:.9},'stone'),roof=kit.mat('#3e5a8c',{roughness:.66},'roof'),roofLight=kit.mat('#5b7fbf',{roughness:.67},'roof'),gold=kit.mat('#d8b45a',{roughness:.4,metalness:.72}),navy=kit.mat('#1f2c55',{roughness:.88}),wood=kit.mat('#8f6040',{roughness:.78}),dark=kit.mat('#543d2e',{roughness:.82}),pane=kit.win();
 const batches=new Map(), groups=new Map();
 function add(geo,mat,part){if(!geo.attributes.normal)geo.computeVertexNormals();const k=part+'|'+mat.uuid;if(!batches.has(k))batches.set(k,{mat,part,geos:[]});batches.get(k).geos.push(geo.index?geo.toNonIndexed():geo);}
 function tf(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0){geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));return geo;}
 function place(geo,m,part,p=[0,0,0],r=[0,0,0]){add(tf(geo,...p,...r),m,part);}
 function box(w,h,d,m,part,p,r){place(new THREE.BoxGeometry(w,h,d),m,part,p,r);}
 function cyl(rt,rb,h,m,part,p,r,n=16){place(new THREE.CylinderGeometry(rt,rb,h,n,1),m,part,p,r);}
 function rod(a,b,r,m,part,n=8){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),v=vb.clone().sub(va),geo=new THREE.CylinderGeometry(r,r,v.length(),n,1);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize()));geo.translate(...va.add(vb).multiplyScalar(.5).toArray());add(geo,m,part);}
 function profile(w,h,pointed=true){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h*.63);if(pointed){s.quadraticCurveTo(w*.43,h*.87,0,h);s.quadraticCurveTo(-w*.43,h*.87,-w/2,h*.63);}else{s.absarc(0,h-w/2,w/2,0,Math.PI,false);}s.closePath();return s;}
 function flat(shape,depth,m,part,p,r,bevel=0){place(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:12,steps:1}),m,part,p,r);}
 function outline(w,h,t,dep,m,part,p,r,pointed=true){const s=profile(w,h,pointed),inn=profile(w-2*t,h-t*1.8,pointed),pts=inn.getPoints(24).map(v=>new THREE.Vector2(v.x,v.y+t));s.holes.push(new THREE.Path(pts.reverse()));flat(s,dep,m,part,p,r,0);}
 function gable(w,d,y,rise,m,part){const s=new THREE.Shape();s.moveTo(-d/2,0);s.lineTo(d/2,0);s.lineTo(0,rise);s.closePath();flat(s,w,m,part,[-w/2,y,0],[0,Math.PI/2,0]);}
 function star(x,y,z,r,m,part){const s=new THREE.Shape();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.28:r;const xx=Math.sin(a)*rr,yy=Math.cos(a)*rr;i?s.lineTo(xx,yy):s.moveTo(xx,yy);}s.closePath();flat(s,.012,m,part,[x,y,z]);}
 // Blockout: low bilateral wings, one central tower, pitched roofs and wide entry steps.
 box(3.84,.28,2.98,shadow,'hall-body',[0,.14,0]);
 box(3.66,1.88,2.78,stone,'hall-body',[0,1.2,0]);
 box(3.88,.17,3.02,stone,'eaves',[0,2.2,0]);
 gable(3.82,3.0,2.25,.9,roof,'roofs');
 box(1.16,1.66,1.16,stone,'tower-body',[0,3.02,.48]);
 box(1.36,.12,1.36,stone,'tower-body',[0,3.88,.48]);
 const sp=new THREE.ConeGeometry(1.04,.82,4,1);sp.rotateY(Math.PI/4);place(sp,roof,'spire',[0,4.32,.48]);
 for(let i=0;i<4;i++)box(2.12-i*.12,.12,1.0-i*.16,shadow,'stairs',[0,.06+i*.12,1.8-i*.08]);
 // Game stage 1, structure: supported two-column arcade and arched openings.
 for(const x of [-.66,.66]){
  box(.44,.18,.48,shadow,'columns',[x,.51,1.71]);
  cyl(.205,.22,.1,stone,'columns',[x,.64,1.71]);
  cyl(.158,.19,1.02,stone,'columns',[x,1.2,1.71]);
  cyl(.22,.17,.11,stone,'columns',[x,1.765,1.71]);
  box(.46,.12,.46,stone,'columns',[x,1.87,1.71]);
 }
 const arcade=new THREE.Shape();arcade.absarc(0,0,.76,0,Math.PI,false);arcade.lineTo(-.55,0);arcade.absarc(0,0,.55,Math.PI,0,true);arcade.closePath();
 flat(arcade,.34,stone,'arcade',[0,1.71,1.54],undefined,.018);
 flat(profile(.86,1.5),.065,dark,'door',[0,.47,1.4]);
 flat(profile(.76,1.43),.025,wood,'door',[0,.49,1.474]);
 outline(1.04,1.69,.105,.11,shadow,'door-surround',[0,.44,1.41]);
 function windowAt(x,y,z,w=.49,h=1.27,ang=0){
  flat(profile(w,h),.025,pane,'windows',[x,y,z],[0,ang,0]);
  outline(w+.15,h+.11,.075,.055,stone,'windows',[x,y-.035,z+.018],[0,ang,0]);
  const v=new THREE.Vector3(0,-.04,.025).applyAxisAngle(new THREE.Vector3(0,1,0),ang);
  box(w+.24,.075,.15,shadow,'windows',[x+v.x,y+v.y,z+v.z],[0,ang,0]);
 }
 for(const x of [-1.34,1.34])windowAt(x,.5,1.405);
 for(const side of [-1,1])for(const z of [-.7,.64])windowAt(side*1.84,.5,z,.52,1.27,side*Math.PI/2);
 for(const x of [-1.15,1.15])windowAt(x,.5,-1.405,.5,1.27,Math.PI);
 // Flat supported sign seat; game supplies the text plane at +Z.
 box(1.88,.54,.11,stone,'sign-seat',[0,2.73,1.9]);
 box(2.0,.065,.2,shadow,'sign-seat',[0,2.43,1.88]);
 // Game stage 2, form: clock identity, tower corners, inset panes and dormers.
 // Recessed dial cartridge: the drum seats on the tower, every mark on the face.
 function clockRing(ro,ri,dep,z,m){const q=[[ri,-dep/2],[ro,-dep/2],[ro,dep/2],[ri,dep/2],[ri,-dep/2]].map(v=>new THREE.Vector2(...v));place(new THREE.LatheGeometry(q,48),m,'clock',[0,3.36,z],[Math.PI/2,0,0]);}
 cyl(.395,.395,.048,shadow,'clock',[0,3.36,1.079],[Math.PI/2,0,0],48);
 clockRing(.425,.355,.055,1.100,gold);
 cyl(.354,.354,.018,stone,'clock',[0,3.36,1.111],[Math.PI/2,0,0],48);
 clockRing(.375,.355,.008,1.124,navy);
 clockRing(.416,.405,.009,1.132,shadow);
 for(let i=0;i<60;i++){
  const a=i*Math.PI/30,major=i%5===0,len=major?(i%15===0?.071:.057):.014,r=major?.308:.339;
  box(major?.020:.006,len,.009,navy,'clock',[Math.sin(a)*r,3.36+Math.cos(a)*r,1.1245],[0,0,-a]);
 }
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;cyl(.009,.009,.009,gold,'clock',[Math.sin(a)*.393,3.36+Math.cos(a)*.393,1.132],[Math.PI/2,0,0],8);}
 // The hour and minute hands run on separate levels, both bored for the centre arbor.
 function hand(a,len,w,z){const s=new THREE.Shape();s.moveTo(-w/2,-.049);s.lineTo(w/2,-.049);s.lineTo(w*.43,len*.76);s.lineTo(0,len);s.lineTo(-w*.43,len*.76);s.closePath();const hole=new THREE.Path();hole.absarc(0,0,.018,0,Math.PI*2,true);s.holes.push(hole);flat(s,.012,navy,'clock',[0,3.36,z],[0,0,-a]);}
 hand(-Math.PI/3,.216,.047,1.134);hand(Math.PI/3,.285,.031,1.155);
 cyl(.017,.017,.059,gold,'clock',[0,3.36,1.1495],[Math.PI/2,0,0],12);
 clockRing(.038,.018,.012,1.173,gold);
 cyl(.025,.025,.010,gold,'clock',[0,3.36,1.184],[Math.PI/2,0,0],12);
 for(const x of [-.57,.57])for(const z of [-.08,1.04]){
  box(.14,1.5,.14,stone,'tower-corners',[x,3.0,z]);
  for(const y of [2.38,3.74])box(.22,.15,.22,shadow,'tower-corners',[x,y,z]);
 }
 for(const x of [-1.28,1.28]){
  flat(profile(.44,.55),.29,stone,'dormers',[x,2.59,.72]);
  flat(profile(.31,.44),.018,pane,'dormers',[x,2.62,1.018]);
  outline(.4,.54,.04,.035,gold,'dormers',[x,2.59,1.033]);
  const s=new THREE.Shape();s.moveTo(-.28,0);s.lineTo(0,.31);s.lineTo(.28,0);s.closePath();flat(s,.37,roof,'dormers',[x,2.95,.69]);
  box(.52,.075,.24,stone,'dormers',[x,2.57,.98]);
  rod([x,2.64,1.077],[x,3.02,1.077],.009,navy,'dormers',6);
 }
 star(0,4.85,.48,.115,gold,'spire-finial');
 cyl(.038,.07,.10,gold,'spire-finial',[0,4.74,.48]);
 // Game stage 3, material and surface: broad slate rhythm, stone courses and leaded panes.
 const roofMid=kit.mat('#496a9b',{roughness:.65},'roof'),honey=kit.mat('#ba8756',{roughness:.76}),plinth=kit.mat('#798499',{roughness:.88},'stone');
 const slope=Math.atan(.9/1.5),slopeLength=Math.hypot(.9,1.5);
 for(const side of [-1,1])for(let row=0;row<6;row++)for(let col=0;col<16;col++){
  const x=-1.79+col*.239+(row%2?.018:0),t=(row+.5)/6;
  box(.233,.023,slopeLength/6+.015,((row*3+col*7+(side+1))%7===0?roofLight:(row+col)%3===0?roofMid:roof),'slate-tiles',[x,3.15-.9*t+.015,side*1.5*t],[side*slope,0,0]);
 }
 for(const side of [-1,1]){
  rod([-1.92,2.25,side*1.5],[1.92,2.25,side*1.5],.018,gold,'roof-gold');
  for(const x of [-1.92,1.92])rod([x,2.25,side*1.5],[x,3.17,0],.022,gold,'roof-gold');
 }
 rod([-1.92,3.17,0],[1.92,3.17,0],.024,gold,'roof-gold');
 for(let face=0;face<4;face++)for(let row=0;row<6;row++){
  const t0=row/6+.008,t1=(row+1)/6-.008,n=6-row;
  for(let col=0;col<n;col++){
   const lo=-1+2*col/n+.015,hi=-1+2*(col+1)/n-.015;
   const raw=[[lo*.735*(1-t0),3.91+.82*t0,.735*(1-t0)+.008],[hi*.735*(1-t0),3.91+.82*t0,.735*(1-t0)+.008],[hi*.735*(1-t1),3.91+.82*t1,.735*(1-t1)+.008],[lo*.735*(1-t1),3.91+.82*t1,.735*(1-t1)+.008]],verts=[];
   for(const k of [0,1,2,0,2,3]){const v=new THREE.Vector3(...raw[k]).applyAxisAngle(new THREE.Vector3(0,1,0),face*Math.PI/2);v.z+=.48;verts.push(...v.toArray());}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();add(geo,(row+col+face)%4===0?roofLight:roofMid,'spire-tiles');
  }
 }
 for(const x of [-.735,.735])for(const z of [-.735,.735])rod([x,3.92,.48+z],[0,4.735,.48],.014,gold,'spire-gold');
 for(const x of [-1.76,1.76])for(const z of [-1.31,1.31]){
  box(.3,.28,.3,plinth,'masonry',[x,.37,z]);
  for(let row=0;row<5;row++)box(row%2?.26:.29,.305,row%2?.29:.26,row%2?stone:shadow,'masonry',[x,.65+row*.32,z]);
  box(.34,.17,.34,stone,'masonry',[x,2.23,z]);
  box(.29,.1,.29,gold,'masonry',[x,2.35,z]);
 }
 for(const y of [.58,.94,1.3,1.66,2.02]){
  for(const z of [-1.395,1.395])box(3.6,.009,.008,shadow,'stone-courses',[0,y,z]);
  for(const x of [-1.835,1.835])box(.008,.009,2.7,shadow,'stone-courses',[x,y,0]);
 }
 for(const z of [-1.396,1.396])for(let row=0;row<4;row++)for(let j=0;j<7;j++)box(.008,.31,.007,shadow,'stone-courses',[-1.55+j*.5+(row%2?.2:0),.76+row*.36,z]);
 function leaded(x,y,z,w=.49,h=1.27,ang=0){
  function local(p){const v=new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0,1,0),ang);return[x+v.x,y+v.y,z+v.z];}
  outline(w+.025,h+.025,.027,.018,navy,'window-lead',[x,y,z],[0,ang,0]);
  rod(local([0,.03,.054]),local([0,h-.09,.054]),.011,navy,'window-lead',6);
  for(const yy of [.38,.83])rod(local([-w*.47,yy,.055]),local([w*.47,yy,.055]),.009,navy,'window-lead',6);
  for(const side of [-1,1])rod(local([side*w*.43,.68,.055]),local([0,1.13,.055]),.009,navy,'window-lead',6);
  const s=new THREE.Shape();s.moveTo(0,.14);s.lineTo(.055,.035);s.lineTo(.13,0);s.lineTo(.055,-.035);s.lineTo(0,-.14);s.lineTo(-.055,-.035);s.lineTo(-.13,0);s.lineTo(-.055,.035);s.closePath();flat(s,.01,gold,'window-stars',local([0,.66,.068]),[0,ang,0]);
 }
 for(const x of [-1.34,1.34])leaded(x,.5,1.438);
 for(const side of [-1,1])for(const z of [-.7,.64])leaded(side*1.87,.5,z,.52,1.27,side*Math.PI/2);
 for(const x of [-1.15,1.15])leaded(x,.5,-1.438,.5,1.27,Math.PI);
 for(const side of [-1,1]){
  flat(profile(.3,.72),.022,pane,'tower-panes',[side*.587,2.81,.48],[0,side*Math.PI/2,0]);
  outline(.38,.8,.04,.035,stone,'tower-panes',[side*.61,2.78,.48],[0,side*Math.PI/2,0]);
  rod([side*.66,2.85,.48],[side*.66,3.45,.48],.009,gold,'tower-panes',6);
 }
 // Pane and wood rail form the entrance transom above the double door.
 flat(profile(.75,.43),.016,pane,'door-transom',[0,1.55,1.521]);
 outline(.77,.45,.026,.025,navy,'door-transom',[0,1.54,1.54]);
 for(const x of [-.23,0,.23])rod([x,1.57,1.57],[x*.55,1.87,1.57],.009,gold,'door-transom',6);
 box(.75,.055,.04,dark,'door-panels',[0,1.54,1.535]);box(.015,1.02,.02,dark,'door-panels',[0,1.0,1.526]);
 for(const side of [-1,1])for(const y of [.77,1.25]){
  box(.27,.33,.012,dark,'door-panels',[side*.194,y,1.526]);box(.225,.28,.013,wood,'door-panels',[side*.194,y,1.535]);
  box(.19,.018,.015,honey,'door-panels',[side*.194,y+.13,1.544]);
 }
 for(const x of [-.066,.066])rod([x,1.05,1.567],[x,1.2,1.567],.013,gold,'door-handles',8);
 const cap=new THREE.Shape();cap.absarc(0,0,.79,0,Math.PI,false);cap.lineTo(-.755,0);cap.absarc(0,0,.755,Math.PI,0,true);cap.closePath();flat(cap,.5,roof,'porch-roof',[0,1.71,1.42]);
 const crown=[];for(let i=0;i<=24;i++){const a=i*Math.PI/24;crown.push(new THREE.Vector3(Math.cos(a)*.79,1.71+Math.sin(a)*.79,1.936));}add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crown),24,.013,5,false),gold,'porch-roof');
 box(.135,.16,.39,stone,'arcade-keystone',[0,2.43,1.74]);
 // Game stage 4, civic identity and warm light: supported navy flags and a door lantern.
 for(const x of [-.97,.97]){
  const flag=new THREE.Shape();flag.moveTo(-.115,0);flag.lineTo(.115,0);flag.lineTo(.115,-.69);flag.lineTo(0,-.8);flag.lineTo(-.115,-.69);flag.closePath();flat(flag,.012,navy,'banners',[x,1.92,1.51]);
  const border=[[-.105,-.02],[.105,-.02],[.105,-.675],[0,-.775],[-.105,-.675],[-.105,-.02]];for(let j=1;j<border.length;j++)rod([x+border[j-1][0],1.92+border[j-1][1],1.531],[x+border[j][0],1.92+border[j][1],1.531],.006,gold,'banners',5);
  rod([x-.17,1.97,1.52],[x+.17,1.97,1.52],.015,gold,'banner-support',8);
  for(const dx of [-.135,.135]){rod([x+dx,1.98,1.39],[x+dx,1.98,1.52],.014,navy,'banner-support',8);cyl(.022,.022,.048,gold,'banner-support',[x+dx,1.93,1.52],undefined,8);}
  place(new THREE.TorusGeometry(.073,.01,5,24,Math.PI*1.72),gold,'banner-emblem',[x-.009,1.57,1.543],[0,0,.43]);star(x+.025,1.57,1.545,.038,gold,'banner-emblem');
 }
 const lampY=2.14,lampZ=1.955;
 rod([0,2.42,1.83],[0,2.42,lampZ],.013,navy,'lantern-hook',8);rod([0,2.42,lampZ],[0,2.32,lampZ],.012,gold,'lantern-hook',8);
 cyl(.065,.06,.165,pane,'lantern-core',[0,lampY,lampZ],undefined,6);
 cyl(.102,.087,.04,gold,'lantern-frame',[0,2.035,lampZ],undefined,6);
 cyl(.006,.106,.10,gold,'lantern-frame',[0,2.285,lampZ],undefined,6);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.sin(a)*.078,z=lampZ+Math.cos(a)*.078;rod([x,2.052,z],[x,2.24,z],.007,gold,'lantern-frame',5);}
 cyl(.017,.017,.035,gold,'lantern-frame',[0,2.35,lampZ],undefined,8);
 for(const x of [-.915,.915])box(.018,.49,.012,gold,'sign-border',[x,2.73,1.961]);
 for(const y of [2.48,2.98])box(1.84,.018,.012,gold,'sign-border',[0,y,1.961]);
 // Meshes are merged only within a named architectural assembly and material.
 for(const b of batches.values()){
  let count=0;for(const geo of b.geos)count+=geo.attributes.position.count;
  const pos=new Float32Array(count*3),norm=new Float32Array(count*3),uv=new Float32Array(count*2);let off=0;
  for(const geo of b.geos){const p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv;pos.set(p.array,off*3);norm.set(n.array,off*3);if(u)uv.set(u.array,off*2);off+=p.count;geo.dispose();}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(norm,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.computeBoundingSphere();
  let group=groups.get(b.part);if(!group){group=new THREE.Group();group.name=b.part;groups.set(b.part,group);g.add(group);}const mesh=new THREE.Mesh(geo,b.mat);mesh.name=b.part+'-surface-'+group.children.length;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 }
 // Give each semantic assembly its own measured pivot while preserving world positions.
 for(const group of groups.values()){
  group.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
  for(const child of group.children)child.geometry.translate(-center.x,-center.y,-center.z);
  group.position.copy(center);
 }
 g.userData.sign=[0,2.73,1.98];return g;
};


/* Tidal Library: staged procedural game reconstruction; front +Z, metres. */
I.BLDMODELS['library'] = function tidalLibrary(THREE, kit) {
  'use strict';
  const g = new THREE.Group(); g.name = 'tidal-arched-library';
  g.userData.sign = [-0.35, 2.69, 1.455];
  const cache = new Map(), batches = new Map();
  function mat(c, o = {}, k) { const key = c + JSON.stringify(o) + k; if (!cache.has(key)) cache.set(key, kit.mat(c, o, k)); return cache.get(key); }
  const M = {
    ivory: mat('#eee4ce', {roughness:.9}, 'stone'),
    light: mat('#f3ebda', {roughness:.88}, 'stone'),
    shadow: mat('#d2c4a8', {roughness:.95}, 'stone'),
    mortar: mat('#bcaf96', {roughness:1}, 'stone'),
    slate: mat('#315b70', {roughness:.72}, 'roof'),
    slateLight: mat('#426d83', {roughness:.69}, 'roof'),
    slateDark: mat('#263e55', {roughness:.79}, 'roof'),
    blue: mat('#274967', {roughness:.78}),
    cyan: mat('#4c8b9f', {roughness:.72}),
    gold: mat('#d5ae5c', {roughness:.4,metalness:.65}),
    oak: mat('#875b3d', {roughness:.83}, 'wall'),
    oakLight: mat('#ac7c50', {roughness:.8}, 'wall'),
    oakDark: mat('#503b2f', {roughness:.91}, 'wall'),
    pages: mat('#f2dfb5', {roughness:.9}),
    glass: kit.win()
  };
  const mid = new Map(Object.values(M).map((m, i) => [m, i]));
  function add(geo, material, part) {
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const key = part + ':' + mid.get(material);
    if (!batches.has(key)) batches.set(key, {material,part,geometries:[]});
    batches.get(key).geometries.push(geo.index ? geo.toNonIndexed() : geo);
  }
  function tf(geo,x,y,z,rx=0,ry=0,rz=0) { return geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1))); }
  function box(x,y,z,w,h,d,m,part,rx=0,ry=0,rz=0) { add(tf(new THREE.BoxGeometry(w,h,d),x,y,z,rx,ry,rz),m,part); }
  function cylinder(x,y,z,rt,rb,h,m,part,n=20) { add(tf(new THREE.CylinderGeometry(rt,rb,h,n),x,y,z),m,part); }
  function shape(points,depth,x,y,z,m,part,ry=0,bevel=0) {
    const s=new THREE.Shape();s.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)s.lineTo(points[i][0],points[i][1]);s.closePath();
    const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1,curveSegments:12});add(tf(geo,x,y,z,0,ry),m,part);
  }
  function beam(a,b,r,m,part,r2=r,n=6) { const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),geo=new THREE.CylinderGeometry(r2,r,d.length(),n);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));geo.translate(...A.clone().add(B).multiplyScalar(.5).toArray());add(geo,m,part); }
  function archPoints(w,h) {
    const r=w,shoulder=h-Math.sqrt(3)*w/2,p=[[-w/2,0],[w/2,0],[w/2,shoulder]];
    for(let i=0;i<=12;i++){const a=i*Math.PI/36;p.push([-w/2+Math.cos(a)*r,shoulder+Math.sin(a)*r]);}
    for(let i=0;i<=12;i++){const a=Math.PI*2/3+i*Math.PI/36;p.push([w/2+Math.cos(a)*r,shoulder+Math.sin(a)*r]);}return p;
  }
  function arch(x,y,z,w,h,d,m,part,ry=0) {shape(archPoints(w,h),d,x,y,z,m,part,ry);}
  function archRim(x,y,z,w,h,t,d,m,part,ry=0) {
    const outer=new THREE.Shape(archPoints(w,h).map(p=>new THREE.Vector2(...p)));
    const inner=archPoints(w-2*t,h-t*1.7).map(p=>new THREE.Vector2(p[0],p[1]+t));outer.holes.push(new THREE.Path(inner.reverse()));
    add(tf(new THREE.ExtrudeGeometry(outer,{depth:d,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,steps:1,curveSegments:10}),x,y,z,0,ry),m,part);
  }
  function localBox(x,y,z,lx,ly,lz,w,h,d,m,part,ry=0) {
    const c=Math.cos(ry),s=Math.sin(ry);box(x+lx*c+lz*s,y+ly,z-lx*s+lz*c,w,h,d,m,part,0,ry);
  }
  function quad(a,b,c,d,m,part) {
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));geo.computeVertexNormals();add(geo,m,part);
  }
  // Game blockout: body assemblies retain independent semantic names.
  box(-.35,.15,-.02,2.94,.3,2.74,M.shadow,'foundation');
  cylinder(1.15,.15,-.68,.72,.74,.3,M.shadow,'foundation');
  box(-.35,1.58,-.02,2.74,2.56,2.5,M.ivory,'hall-body');
  cylinder(1.15,1.92,-.68,.68,.69,3.24,M.ivory,'tower-body',24);
  for(const z of [1.23,-1.36])shape([[-1.37,0],[1.37,0],[0,1.28]],.13,-.35,2.85,z,M.ivory,'hall-body');
  for(const side of [-1,1])shape([[0,4.21],[side*1.52,2.94],[side*1.52,2.86],[0,4.13]],2.96,-.35,0,-1.5,M.slate,'hall-roof');
  cylinder(1.15,3.51,-.68,.725,.725,.16,M.shadow,'tower-cornice');
  cylinder(1.15,3.6,-.68,.77,.77,.10,M.slateDark,'tower-roof');
  cylinder(1.15,4.195,-.68,0,.755,1.09,M.slate,'tower-roof',24);
  // Entry structure, broad stairs and flat sign reservation.
  for(let i=0;i<3;i++){const h=.1*(i+1),z=2.04-i*.25;box(-.35,h/2,z,1.5,h,.48,M.ivory,'stairs');box(-.35,h+.008,z,1.53,.026,.49,M.light,'stairs');}
  box(-.35,.32,1.39,1.5,.06,.45,M.shadow,'stairs');
  box(-.35,1.24,1.254,1.02,1.84,.11,M.oakDark,'entry');
  box(-.35,2.69,1.347,1.94,.56,.1,M.oakDark,'sign-board');
  box(-.35,2.69,1.407,1.86,.48,.035,M.blue,'sign-board');
  // Structure pass: load-bearing courses, broad quoins and pointed openings.
  box(-.35,.45,1.265,2.79,.18,.09,M.slateDark,'stone-trim');
  box(-.35,.45,-1.305,2.79,.18,.09,M.slateDark,'stone-trim');
  for(const x of [-1.735,1.035])box(x,.45,-.02,.09,.18,2.57,M.slateDark,'stone-trim');
  cylinder(1.15,.45,-.68,.7,.7,.18,M.slateDark,'tower-cornice',24);
  cylinder(1.15,2.54,-.68,.715,.715,.14,M.shadow,'tower-cornice',24);
  cylinder(1.15,2.46,-.68,.705,.705,.055,M.slateDark,'tower-cornice',24);
  for(const x of [-1.66,.96])for(const z of [1.22,-1.25]){
    box(x,1.61,z,.22,2.54,.24,M.shadow,'buttresses');
    for(let j=0;j<8;j++)box(x,.47+j*.303,z,.27,.282,.28,j%3?M.ivory:M.light,'buttresses');
    box(x,.21,z,.38,.25,.37,M.shadow,'buttresses');box(x,.37,z,.31,.12,.32,M.light,'buttresses');
    box(x,2.91,z,.33,.16,.34,M.light,'buttresses');
  }
  for(const z of [1.26,-1.28])box(-.35,2.87,z,2.89,.17,.18,M.shadow,'stone-trim');
  for(const x of [-1.73,1.03])box(x,2.87,-.02,.14,.17,2.64,M.shadow,'stone-trim');
  // Tall lancets: blue opaque stone inlays surround untouched kit.win glass.
  function windowModule(x,y,z,w,h,ry=0,part='hall-windows') {
    arch(x,y,z,w+.11,h+.075,.055,M.shadow,part,ry);
    arch(x,y+.035,z,w,h,.076,M.blue,part,ry);
    const c=Math.cos(ry),s=Math.sin(ry),front=(dist)=>[x+s*dist,y,z+c*dist];
    const inset=front(.077);arch(inset[0],y+.09,inset[2],w*.76,h-.2,.018,M.cyan,part,ry);
    const q=front(.10);arch(q[0],y+.09,q[2],w*.42,h-.2,.015,M.glass,part,ry);
    archRim(q[0],y+.025,q[2],w+.045,h+.035,.055,.06,M.light,part,ry);
    localBox(x,y,z,0,-.035,.06,w+.23,.1,.22,M.shadow,part,ry);
    localBox(x,y,z,0,.09+(h-.2)*.43,.13,.022,(h-.2)*.83,.035,M.gold,part,ry);
    localBox(x,y,z,0,.42,.13,w*.72,.025,.035,M.gold,part,ry);
    const sx=w*.14,sy=Math.min(.15,h*.13),diamond=[[0,sy],[sx*.25,sy*.25],[sx,0],[sx*.25,-sy*.25],[0,-sy],[-sx*.25,-sy*.25],[-sx,0],[-sx*.25,sy*.25]];
    const p=front(.14);shape(diamond,.025,p[0],y+h*.58,p[2],M.gold,part,ry);
  }
  for(const x of [-1.31,.61])windowModule(x,.62,1.276,.44,1.76);
  for(const z of [-.7,.37])windowModule(1.023,.62,z,.64,1.79,Math.PI/2);
  for(const z of [-.7,.37])windowModule(-1.723,.62,z,.64,1.79,-Math.PI/2);
  for(const x of [-1.08,.2])windowModule(x,.67,-1.312,.61,1.69,Math.PI);
  windowModule(1.15,2.77,.006,.42,.61,0,'tower-windows');
  windowModule(1.77,1.02,-.66,.44,1.05,Math.PI/2,'tower-windows');
  // Arched oak doorway sits in a layered stone reveal above the landing.
  arch(-.35,.32,1.285,1.12,1.92,.075,M.oakDark,'entry');
  arch(-.35,.35,1.375,.93,1.77,.045,M.oak,'entry');
  archRim(-.35,.31,1.357,1.33,2.1,.14,.12,M.light,'entry');
  archRim(-.35,.36,1.462,.98,1.81,.044,.03,M.oakLight,'entry');
  for(let j=0;j<6;j++)box(-.742+j*.157,1.02,1.438,.147,1.29,.025,j%2?M.oak:M.oakLight,'entry');
  box(-.35,1.16,1.47,.032,1.64,.027,M.oakDark,'entry');
  for(const y of [.55,1.55])box(-.35,y,1.472,.83,.055,.035,M.oakDark,'entry');
  // Form and material pass: laid slate courses, cornice caps and restrained gold edging.
  for(const side of [-1,1]){
    for(let row=0;row<7;row++)for(let col=0;col<11;col++){
      const t0=row/7,t1=(row+1)/7-.006,x0=-.35+side*1.52*t0,x1=-.35+side*1.52*t1;
      const z0=-1.49+col*.269+(row%2)*.011,z1=Math.min(1.452,z0+.257);
      const y0=4.21-1.27*t0+.022,y1=4.21-1.27*t1+.026;
      const a=[x0,y0,z0],b=[x0,y0,z1],c=[x1,y1,z1],d=[x1,y1,z0],m=(row+col)%4===0?M.slateLight:(row+col)%7===0?M.slateDark:M.slate;
      quad(...(side>0?[a,b,c,d]:[d,c,b,a]),m,'slate-courses');
    }
    for(const z of [1.467,-1.49]){
      beam([-.35,4.245,z],[-.35+side*1.53,2.955,z],.042,M.slateDark,'roof-trim',.042,8);
      beam([-.35,4.258,z+.012],[-.35+side*1.53,2.97,z+.012],.018,M.gold,'roof-trim',.018,6);
    }
    box(-.35+side*1.53,2.908,-.018,.08,.105,2.98,M.slateDark,'roof-trim');
    box(-.35+side*1.534,2.967,-.018,.022,.025,2.98,M.gold,'roof-trim');
  }
  beam([-.35,4.244,-1.49],[-.35,4.244,1.48],.035,M.gold,'roof-trim',.035,8);
  for(let row=0;row<5;row++)for(let col=0;col<24;col++){
    const t0=row/5,t1=(row+1)/5-.005,y0=3.65+1.09*t0,y1=3.65+1.09*t1;
    const theta=col*Math.PI/12+.003,m=(row+col)%4===0?M.slateLight:(row+col)%7===0?M.slateDark:M.slate;
    const geo=new THREE.CylinderGeometry(.755*(1-t1)+.008,.755*(1-t0)+.008,y1-y0,1,1,true,theta,Math.PI/12-.006);
    add(tf(geo,1.15,(y0+y1)/2,-.68),m,'slate-courses');
  }
  cylinder(1.15,3.652,-.68,.782,.782,.034,M.gold,'roof-trim',24);
  cylinder(1.15,4.735,-.68,.055,.065,.08,M.gold,'roof-finials',10);
  cylinder(1.15,4.87,-.68,0,.074,.19,M.gold,'roof-finials',6);
  for(const z of [1.29,-1.29]){
    box(-.35,4.07,z,.13,.21,.17,M.light,'roof-trim');
    box(-.35,4.205,z,.18,.07,.21,M.shadow,'roof-trim');
  }
  // The open-book relief is the only large emblem; it stays above the game sign.
  arch(-.35,3.06,1.365,1.08,.93,.045,M.blue,'book-crest');
  archRim(-.35,3.035,1.415,1.14,.98,.042,.025,M.gold,'book-crest');
  for(const side of [-1,1]){
    const page=[[0,.02],[side*.43,.11],[side*.47,.63],[side*.12,.59],[0,.52]];
    shape(page,.065,-.35,3.18,1.452,M.gold,'book-crest');
    const paper=[[side*.025,.075],[side*.365,.16],[side*.4,.56],[side*.12,.535],[side*.025,.49]];
    shape(paper,.027,-.35,3.18,1.524,M.pages,'book-crest');
    for(let line=0;line<3;line++)beam([-.35+side*.09,3.39+line*.09,1.561],[-.35+side*.32,3.42+line*.09,1.561],.008,M.shadow,'book-crest',.008,4);
  }
  beam([-.35,3.23,1.56],[-.35,3.72,1.56],.018,M.gold,'book-crest',.018,6);
  // Door hardware and paired warm lanterns use shared, unmodified kit.win material.
  for(const x of [-.43,-.27]){beam([x,.9,1.516],[x,1.15,1.516],.014,M.gold,'entry',.014,6);box(x,1.02,1.485,.042,.32,.018,M.gold,'entry');}
  for(const y of [.62,1.42])for(const x of [-.65,-.05])box(x,y,1.495,.17,.023,.02,M.gold,'entry');
  for(const x of [-1.065,.365]){
    box(x,2.02,1.37,.12,.22,.08,M.gold,'lanterns');
    beam([x,2.1,1.39],[x,2.1,1.65],.022,M.gold,'lanterns');
    beam([x,2.1,1.65],[x,1.99,1.65],.015,M.gold,'lanterns');
    box(x,1.79,1.65,.145,.30,.145,M.glass,'lanterns');
    for(const dx of [-.09,.09])for(const dz of [-.09,.09])beam([x+dx,1.61,1.65+dz],[x+dx*.76,1.96,1.65+dz*.76],.012,M.gold,'lanterns');
    box(x,1.61,1.65,.23,.045,.23,M.gold,'lanterns');
    add(tf(new THREE.ConeGeometry(.16,.15,4),x,2.02,1.65,0,Math.PI/4),M.gold,'lanterns');
    cylinder(x,2.115,1.65,0,.025,.07,M.gold,'lanterns',6);
    cylinder(x,1.55,1.65,0,.033,.08,M.gold,'lanterns',6);
  }
  for(const yy of [2.435,2.945])box(-.35,yy,1.429,1.94,.025,.026,M.gold,'sign-board');
  // Surface pass: a few wide masonry courses, subordinate to the window and roof silhouettes.
  for(let row=0;row<7;row++){
    const y=.66+row*.315;
    for(const z of [1.237,-1.277]){
      box(-.35,y,z,2.64,.012,.012,M.shadow,'masonry-courses');
      for(let col=0;col<6;col++){
        const x=-1.55+col*.43+(row%2)*.18;
        if(x<.93)box(x,y+.151,z,.011,.285,.013,M.shadow,'masonry-courses');
      }
    }
    for(const x of [-1.727,1.027]){
      box(x,y,-.02,.012,.012,2.38,M.shadow,'masonry-courses');
      for(let col=0;col<5;col++){
        const z=-1.12+col*.47+(row%2)*.18;
        if(z<1.2)box(x,y+.151,z,.013,.285,.011,M.shadow,'masonry-courses');
      }
    }
  }
  for(let row=0;row<9;row++){
    const y=.64+row*.315;
    if(y<3.48)add(tf(new THREE.TorusGeometry(.692,.006,4,24),1.15,y,-.68,Math.PI/2),M.shadow,'masonry-courses');
    for(let col=0;col<12;col++){
      const a=col*Math.PI/6+(row%2)*Math.PI/12;
      const x=1.15+Math.sin(a)*.692,z=-.68+Math.cos(a)*.692;
      beam([x,y+.016,z],[x,Math.min(3.47,y+.293),z],.005,M.shadow,'masonry-courses',.005,4);
    }
  }
  // Material batches stay separated by meaningful assembly.
  const parts = new Map();
  for(const b of batches.values()){
    let n=0;for(const geo of b.geometries)n+=geo.attributes.position.count;
    const p=new Float32Array(n*3),normal=new Float32Array(n*3);let at=0;
    for(const geo of b.geometries){p.set(geo.attributes.position.array,at);normal.set(geo.attributes.normal.array,at);at+=geo.attributes.position.array.length;geo.dispose();}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3));geometry.computeBoundingSphere();
    if(!parts.has(b.part)){const part=new THREE.Group();part.name=b.part;parts.set(b.part,part);g.add(part);}
    const mesh=new THREE.Mesh(geometry,b.material);mesh.name=b.part+'-material-'+mid.get(b.material);mesh.castShadow=true;mesh.receiveShadow=true;parts.get(b.part).add(mesh);
  }
  return g;
};

})(typeof window !== 'undefined' ? window : globalThis);
