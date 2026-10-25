/* 潮汐小島 · 程式化模型（img2threejs 重建）：盆花組、樹籬、矮石欄、花壇與廣場樹座花圈。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};

// floral-final.js
(function () {
  // This source is staged by build-floral.cjs; all construction helpers are private.
  const stage = 3;
  const I = (globalThis.TA = globalThis.TA || {}).ISLE = globalThis.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};
  function tools(THREE, kit, name) {
    const root = new THREE.Group(); root.name = name;
    const buckets = new Map();
    function put(geo, mat, label) {
      if (!geo.getAttribute('normal')) geo.computeVertexNormals();
      const source = geo.index ? geo.toNonIndexed() : geo;
      if (!buckets.has(mat)) buckets.set(mat, { name: label, p: [], n: [] });
      const b = buckets.get(mat), p = source.getAttribute('position'), n = source.getAttribute('normal');
      for (let i = 0; i < p.array.length; i++) { b.p.push(p.array[i]); b.n.push(n.array[i]); }
      if (source !== geo) source.dispose(); geo.dispose();
    }
    function meshFrom(points, indices) {
      const p = []; for (const i of indices) p.push(...points[i]);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.computeVertexNormals(); return geo;
    }
    function box(w,h,d,x,y,z,mat,label) { const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);put(g,mat,label); }
    function lathe(profile, segments, x, z, mat, label) {
      const g=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),segments);g.translate(x,0,z);put(g,mat,label);
    }
    function lobe(x,y,z,rx,ry,rz,mat) { const g=new THREE.SphereGeometry(1,8,4);g.scale(rx,ry,rz);g.translate(x,y,z);put(g,mat,'foliage'); }
    function rod(a,b,r,mat,label) {
      const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),g=new THREE.CylinderGeometry(r,r,v.length(),5,1,true);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));g.translate(...A.add(B).multiplyScalar(.5).toArray());put(g,mat,label);
    }
    function leaf(x,y,z,length,width,az,tilt,mat) {
      const c=Math.cos(az),s=Math.sin(az),ct=Math.cos(tilt),st=Math.sin(tilt);
      const raw=[[0,0,0],[-width/2,0,length*.45],[0,length*.075,length*.45],[0,0,length],[width/2,0,length*.45]];
      const pts=raw.map(p=>{const yy=p[1]*ct+p[2]*st,zz=-p[1]*st+p[2]*ct;return [x+p[0]*c+zz*s,y+yy,z+zz*c-p[0]*s];});
      put(meshFrom(pts,[0,2,1,1,2,3,3,2,4,4,2,0,0,1,4,1,3,4]),mat,'foliage');
    }
    function bloom(x,y,z,r,mat,center,seed) {
      // Broad rounded petal profiles, folded upwards; explicit reverse faces remain visible from rear.
      const n=new THREE.Vector3(.16*Math.sin(seed*2.3),1,.22+.12*Math.cos(seed)).normalize();
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n);
      for(let j=0;j<5;j++) {
        const a=j*Math.PI*.4+seed*.35,c=Math.cos(a),s=Math.sin(a);
        const raw=[[0,0,r*.12],[-r*.30,r*.07,r*.42],[-r*.31,r*.18,r*.8],[0,r*.22,r],[r*.31,r*.18,r*.8],[r*.30,r*.07,r*.42]];
        const pts=raw.map(p=>new THREE.Vector3(p[0]*c+p[2]*s,p[1],p[2]*c-p[0]*s).applyQuaternion(q).add(new THREE.Vector3(x,y,z)).toArray());
        put(meshFrom(pts,[0,2,1,0,3,2,0,4,3,0,5,4,0,1,2,0,2,3,0,3,4,0,4,5]),mat,'petals');
      }
      const g=new THREE.OctahedronGeometry(r*.22,0);g.scale(1,.55,1);g.translate(x,y+r*.07,z);put(g,center,'flower-centers');
    }
    function chamfer(w,h,d,b,x,y,z,mat,label) {
      const rings=[],p=[],idx=[];
      for(const [yy,inset]of [[-h/2,b],[-h/2+b,0],[h/2-b,0],[h/2,b]]) {
        const X=w/2-inset,Z=d/2-inset,C=Math.min(b,X*.3,Z*.3);
        rings.push([[-X+C,yy,-Z],[X-C,yy,-Z],[X,yy,-Z+C],[X,yy,Z-C],[X-C,yy,Z],[-X+C,yy,Z],[-X,yy,Z-C],[-X,yy,-Z+C]]);
      }
      for(const r of rings)for(const v of r)p.push([v[0]+x,v[1]+y,v[2]+z]);
      for(let j=0;j<8;j++){const k=(j+1)%8;for(let r=0;r<3;r++)idx.push(r*8+j,(r+1)*8+j,(r+1)*8+k,r*8+j,(r+1)*8+k,r*8+k);}
      for(let j=1;j<7;j++)idx.push(0,j,j+1,24,25+j,24+j);
      put(meshFrom(p,idx),mat,label);
    }
    function finish() {
      for(const [mat,b]of buckets){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.computeBoundingBox();g.computeBoundingSphere();const m=new THREE.Mesh(g,mat);m.name=name+'-'+b.name; m.castShadow=true;m.receiveShadow=true;root.add(m);}
      if(name==='flower-pots') {
        // Bake the shallow footprint and center into geometry so clone/instancing transforms stay at identity.
        for(const m of root.children)m.geometry.scale(1,1,.93);
        const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());
        for(const m of root.children){m.geometry.translate(-center.x,0,-center.z);m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();}
      }
      return root;
    }
    return {root,put,box,lathe,lobe,rod,leaf,bloom,chamfer,finish};
  }

  I.PROPMODELS['flower_pots'] = function (THREE, kit) {
    const t=tools(THREE,kit,'flower-pots');
    const M={wood:kit.mat('#9f6943',{roughness:.88},'wall'),terra:kit.mat('#bc7652',{roughness:.9}),ivory:kit.mat('#f3efe6',{roughness:.64}),gold:kit.mat('#b4955c',{roughness:.46,metalness:.35}),leaf:kit.mat('#5f813e',{roughness:.92},'sway'),blue:kit.mat('#5280cc',{roughness:.8}),yellow:kit.mat('#edc45e',{roughness:.82}),pink:kit.mat('#eaa0b2',{roughness:.83}),navy:kit.mat('#263b65',{roughness:.65})};
    const pots=[{x:0,z:-.075,h:.43,r:.205,mat:M.wood,type:0},{x:-.252,z:.11,h:.255,r:.15,mat:M.terra,type:1},{x:.252,z:.105,h:.275,r:.162,mat:M.ivory,type:2}];
    for(const p of pots){
      const r=p.r,h=p.h;
      let profile=p.type===0?[[0,0],[r*.82,0],[r*.91,.018],[r,.17],[r*.98,h-.018],[r*.95,h],[r*.83,h],[r*.82,h-.035],[0,h-.035]]:p.type===1?[[0,0],[r*.63,0],[r*.67,.012],[r*.91,h-.065],[r*.99,h-.058],[r,h-.015],[r*.96,h],[r*.81,h],[r*.79,h-.045],[0,h-.045]]:[[0,0],[r*.56,0],[r*.79,.02],[r*.98,.085],[r,.14],[r*.94,.22],[r*.84,h-.025],[r*.85,h],[r*.73,h],[r*.73,h-.028],[0,h-.028]];
      t.lathe(profile,stage<2?10:14,p.x,p.z,p.mat,'vessels');
      if(stage>0){
        if(p.type===0){for(const y of [.09,.335]){const r0=y<.2?r*.973:r*.987;t.lathe([[r0,y-.019],[r0+.007,y-.015],[r0+.007,y+.015],[r0,y+.019]],14,p.x,p.z,M.gold,'hoops');}
          for(let j=0;j<12;j++){const a=j*Math.PI/6;t.rod([Math.sin(a)*r*.927,.035,p.z+Math.cos(a)*r*.927],[Math.sin(a)*r*.98,.409,p.z+Math.cos(a)*r*.98],.0028,M.wood,'vessels');}
        }else if(p.type===2)t.lathe([[r*.94,.223],[r*.918,.237]],14,p.x,p.z,M.navy,'ceramic-inlay');
      }
      const cy=h+.065,rx=r*1.12,ry=p.type===0?.135:.105;
      for(let j=0;j<3;j++){const a=j*2.4;t.lobe(p.x+Math.sin(a)*r*.35,cy+(j%2)*.018,p.z+Math.cos(a)*r*.3,rx*.72,ry*.73,rx*.68,M.leaf);}
      if(stage>0){
        const count=p.type===0?27:20;
        for(let j=0;j<count;j++){const a=j*2.39996+p.type*.73,u=Math.sqrt((j+.4)/count),xx=p.x+Math.sin(a)*r*.84*u,zz=p.z+Math.cos(a)*r*.84*u,yy=h+.10+ry*.68*Math.sqrt(1-u*u);t.leaf(xx,yy,zz,.075+.018*(j%3),.057+.012*(j%2),a,.1+((j%5)-2)*.16,M.leaf);}
      }
      if(stage>1){
        const count=p.type===0?10:8;
        for(let j=0;j<count;j++){const a=j*2.39996+p.type*.6,u=Math.sqrt((j+.4)/count)*.84,xx=p.x+Math.sin(a)*r*u,zz=p.z+Math.cos(a)*r*u,yy=h+.155+ry*.65*(1-u*u)+(j%3)*.012; const colors=[M.blue,M.ivory,M.blue,M.yellow,M.ivory,M.blue,M.pink,M.ivory];t.rod([xx,h+.07,zz],[xx,yy,zz],.004,M.leaf,'foliage');t.bloom(xx,yy,zz,.05+.006*(j%3),colors[(j+p.type*2)%colors.length],M.yellow,j+p.type*9);}
        // Two leaf cascades leave the rims visible and stay inside the .9 by .6 footprint.
        for(let j=0;j<3;j++)t.leaf(p.x+(p.type===1?-.095:.08),h+.055-j*.055,p.z+.13,.068,.047,.2+j*.4,-.95,M.leaf);
      }
    }
    return t.finish();
  };

  I.PROPMODELS['flower_bed'] = function (THREE, kit) {
    const t=tools(THREE,kit,'flower-bed');
    const M={stone:kit.mat('#f3efe6',{roughness:.88},'stone'),stoneShade:kit.mat('#ded2bb',{roughness:.91},'stone'),navy:kit.mat('#263b65',{roughness:.66}),soil:kit.mat('#493a2c',{roughness:1}),leaf:kit.mat('#557b3f',{roughness:.93},'sway'),leafLight:kit.mat('#78994f',{roughness:.91},'sway'),blue:kit.mat('#527fca',{roughness:.82}),white:kit.mat('#faf2db',{roughness:.84}),yellow:kit.mat('#edc45e',{roughness:.83}),lavender:kit.mat('#b09bcf',{roughness:.84})};
    // Inlay is a continuous ring sandwiched between stone courses, with genuine depth.
    for(const side of [-1,1]){
      if(stage===0){t.box(2.4,.30,.11,0,.15,side*.37,M.stone,'stone-rim');continue;}
      for(let j=0;j<6;j++){
        const x=-1+j*.4;
        t.chamfer(.398,.154,.11,.006,x,.077,side*.37,(j+side)%3?M.stone:M.stoneShade,'stone-rim');
        t.chamfer(.398,.12,.11,.006,x,.24,side*.37,M.stone,'stone-rim');
      }
      t.box(2.386,.026,.105,0,.167,side*.37,M.navy,'navy-inlay');
    }
    for(const side of [-1,1]){
      if(stage===0)t.box(.11,.30,.63,side*1.145,.15,0,M.stone,'stone-rim');
      else{t.chamfer(.11,.154,.63,.006,side*1.145,.077,0,M.stone,'stone-rim');t.chamfer(.11,.12,.63,.006,side*1.145,.24,0,M.stone,'stone-rim');t.box(.105,.026,.63,side*1.145,.167,0,M.navy,'navy-inlay');}
    }
    t.box(2.18,.025,.63,0,.2625,0,M.soil,'soil');
    for(let i=0;i<8;i++){
      const cx=-.96+i*.274,cz=.04*Math.sin(i*2.1),cy=.34+.015*(i%3);
      t.lobe(cx,cy,cz,.235,.09,.28,i%3?M.leaf:M.leafLight);
      if(stage>0){for(let j=0;j<14;j++){const a=j*2.39996+i*.7,u=Math.sqrt((j+.3)/14),xx=cx+Math.sin(a)*.17*u,zz=cz+Math.cos(a)*.2*u,yy=.375+.07*Math.sqrt(1-u*u);t.leaf(xx,yy,zz,.095+.016*(j%3),.065,a,.12+((j%5)-2)*.16,(i+j)%4?M.leaf:M.leafLight);}}
      if(stage>1){for(let j=0;j<6;j++){const a=j*2.39996+i*.9,u=.27+.11*j,xx=cx+Math.sin(a)*.18*u,zz=cz+Math.cos(a)*.215*u,yy=.475+.014*((i+j)%3);const colors=[M.blue,M.white,M.blue,M.yellow,M.white,M.lavender];t.rod([xx,.37,zz],[xx,yy,zz],.004,M.leaf,'foliage');t.bloom(xx,yy,zz,.062+.006*((j+i)%3),colors[(j+i*2)%6],M.yellow,j+i*7);}}
    }
    if(stage>1){
      for(let i=0;i<5;i++){
        const x=-.82+i*.4,z=-.095+.035*(i%2),h=.548+.009*(i%3);t.rod([x,.36,z],[x+.014,h,z],.005,M.leaf,'foliage');
        for(let j=0;j<4;j++) {const a=j*2.1,g=new THREE.OctahedronGeometry(.016-j*.0015,0);g.scale(1,1.25,1);g.translate(x+Math.sin(a)*.013,.465+j*.025,z+Math.cos(a)*.013);t.put(g,M.lavender,'lavender-spikes');}
      }
    }
    return t.finish();
  };
})();


// hedge/factory.js
/* Tidal Academy: reference-derived clipped hedge/fence factory, no external assets. */
(function(root){
const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};I.PROPMODELS=I.PROPMODELS||{};
I.PROPMODELS['hedge']=function(THREE,kit){
 const group=new THREE.Group();group.name='hedge';
 const HEDGE=true, edge=HEDGE?1:1.1, buckets=[];
 const mats=[
 kit.mat('#f3efe6',{roughness:.86},'stone'),
 kit.mat('#304b7d',{roughness:.71}),
 kit.mat('#d6ae54',{roughness:.36,metalness:.65})
 ];
 if(HEDGE){mats.push(kit.mat('#7e963f',{roughness:.92},'sway'),kit.mat('#a8b952',{roughness:.86},'sway'),kit.mat('#c7cd66',{roughness:.82},'sway'));}
 else{mats.push(kit.mat('#916340',{roughness:.82},'wall'),kit.mat('#bb8856',{roughness:.78},'wall'));}
 for(let i=0;i<mats.length;i++)buckets.push([]);
 function triangle(dst,a,b,c){dst.push(...a,...b,...c);}
 function clipped(poly,bound,sign,cuts){
  const out=[];
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],ina=sign*(a[0]-bound)>=-1e-9,inb=sign*(b[0]-bound)>=-1e-9;
   if(ina)out.push(a);
   if(ina!==inb){const t=(bound-a[0])/(b[0]-a[0]),p=[bound,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];out.push(p);cuts.push(p);}
  }return out;
 }
 function hull(points){
  const q=Array.from(new Map(points.map(p=>[p[1].toFixed(7)+','+p[2].toFixed(7),p])).values()).sort((a,b)=>a[1]-b[1]||a[2]-b[2]);
  const cross=(a,b,c)=>(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]);
  const lo=[],hi=[];for(const p of q){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],p)<=1e-12)lo.pop();lo.push(p);}
  for(let j=q.length-1;j>=0;j--){const p=q[j];while(hi.length>1&&cross(hi[hi.length-2],hi[hi.length-1],p)<=1e-12)hi.pop();hi.push(p);}
  lo.pop();hi.pop();return lo.concat(hi);
 }
 function put(index,geo,x,y,z,rx,ry,rz){
  if(rx)geo.rotateX(rx);if(ry)geo.rotateY(ry);if(rz)geo.rotateZ(rz);geo.translate(x||0,y||0,z||0);
  const n=geo.index?geo.toNonIndexed():geo,p=n.attributes.position.array,dst=buckets[index],cutsL=[],cutsR=[];
  for(let j=0;j<p.length;j+=9){
   let poly=[[p[j],p[j+1],p[j+2]],[p[j+3],p[j+4],p[j+5]],[p[j+6],p[j+7],p[j+8]]];
   poly=clipped(poly,-edge,1,cutsL);if(poly.length)poly=clipped(poly,edge,-1,cutsR);
   for(let k=1;k<poly.length-1;k++)triangle(dst,poly[0],poly[k],poly[k+1]);
  }
  for(const pair of [[cutsL,-1],[cutsR,1]]){const h=hull(pair[0]);if(h.length>2){const center=[h[0][0],h.reduce((a,p)=>a+p[1],0)/h.length,h.reduce((a,p)=>a+p[2],0)/h.length];for(let j=0;j<h.length;j++){const a=h[j],b=h[(j+1)%h.length];if(pair[1]>0)triangle(dst,center,a,b);else triangle(dst,center,b,a);}}}
  if(n!==geo)n.dispose();geo.dispose();
 }
 function geo(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return g;}
 function chamfer(w,h,d,b){
  const arr=[],rings=[];
  function ring(y,x,z,inset){x-=inset;z-=inset;const q=Math.min(b,x*.3,z*.3);return [[-x+q,y,-z],[x-q,y,-z],[x,y,-z+q],[x,y,z-q],[x-q,y,z],[-x+q,y,z],[-x,y,z-q],[-x,y,-z+q]];}
  rings.push(ring(0,w/2,d/2,b),ring(b,w/2,d/2,0),ring(h-b,w/2,d/2,0),ring(h,w/2,d/2,b));
  for(let k=0;k<3;k++)for(let j=0;j<8;j++){const q=(j+1)%8;triangle(arr,rings[k][j],rings[k+1][j],rings[k+1][q]);triangle(arr,rings[k][j],rings[k+1][q],rings[k][q]);}
  for(let j=0;j<8;j++){const q=(j+1)%8;triangle(arr,[0,0,0],rings[0][j],rings[0][q]);triangle(arr,[0,h,0],rings[3][q],rings[3][j]);}return geo(arr);
 }
 function block(i,w,h,d,x,y,z,b){if(i===2||h<.035){const q=new THREE.BoxGeometry(w,h,d);put(i,q,x,y+h/2,z);}else put(i,chamfer(w,h,d,b||.004),x,y,z);}
 function profile(points,depth){const s=new THREE.Shape();s.moveTo(points[0][0],points[0][1]);for(let j=1;j<points.length;j++)s.lineTo(points[j][0],points[j][1]);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:8});g.translate(0,0,-depth/2);return g;}
 function diamond(w,h){return profile([[0,h/2],[w/2,0],[0,-h/2],[-w/2,0]],.008);}
 function star(w,h){return profile([[0,h/2],[w*.14,h*.12],[w/2,0],[w*.14,-h*.12],[0,-h/2],[-w*.14,-h*.12],[-w/2,0],[-w*.14,h*.12]],.008);}
 // Full symmetric pillars are cut at module endpoints, including every cap and finial.
 for(const x of [-edge,edge]){
  const collar=HEDGE?.84:.725,cap=HEDGE?.895:.78;
  block(0,.31,.09,.33,x,0,0,.008);
  block(0,.272,.035,.292,x,.085,0,.006);
  block(0,.237,collar-.11,.255,x,.11,0,.006);
  block(1,.255,.058,.275,x,collar-.035,0,.004);
  block(2,.258,.011,.278,x,collar-.043,0,.002);
  block(0,.313,.045,.34,x,cap-.028,0,.006);
  block(0,.265,.030,.294,x,cap+.012,0,.005);
  block(0,.212,.025,.245,x,cap+.037,0,.004);
  block(2,.095,.022,.108,x,cap+.061,0,.003);
  const finial=new THREE.OctahedronGeometry(1,0);finial.scale(.042,.059,.042);
  put(2,finial,x,cap+.141,0);
  // Narrow front/rear navy lancets and geometric brass stars remain legible at game distance.
  const panelH=HEDGE?.51:.44,py=.18;
  const arch=[[-.065,0],[.065,0],[.065,panelH-.055],[.034,panelH-.022],[0,panelH],[-.034,panelH-.022],[-.065,panelH-.055]];
  for(const s of [-1,1]){
   put(2,profile(arch.map(p=>[p[0]*1.11,p[1]+.004]),.006),x,py-.004,s*.130,0,s<0?Math.PI:0);
   put(1,profile(arch,.008),x,py,s*.135,0,s<0?Math.PI:0);
   put(2,star(.056,.090),x,py+panelH*.47,s*.143);
   put(2,diamond(.035,.061),x,collar-.105,s*.139);
  }
 }
 if(HEDGE){
  // Faceted core clumps create a continuous hedge volume while the outer rosettes break its outline.
  for(let i=0;i<8;i++)for(let j=0;j<2;j++){
   const x=-.78+i*(1.56/7),y=.275+j*.394+.009*((i+j)%3);
   const q=new THREE.SphereGeometry(1,7,4);q.scale(.172,.239,.232);put(3+(i+j)%2,q,x,y,0,0,(i%3)*.31,0);
  }
  function leaf(index,x,y,z,L,W,rx,ry,rz){
   const r=[[0,0,0],[W*.35,L*.22,0],[W*.50,L*.58,0],[0,L,0],[-W*.50,L*.58,0],[-W*.35,L*.22,0]],a=[],front=[0,L*.48,.014],back=[0,L*.48,-.008];
   for(let j=0;j<6;j++){const n=(j+1)%6;triangle(a,front,r[j],r[n]);triangle(a,back,r[n],r[j]);}
   const leafGeometry=geo(a);leafGeometry.rotateZ(rz||0);put(index,leafGeometry,x,y,z,rx,ry,0);
  }
  for(const side of [-1,1])for(let row=0;row<3;row++)for(let col=0;col<6;col++){
   const xx=-.735+col*.292+(row%2)*.018,yy=.225+row*.245+.012*((col*3+row)%4),zz=side*(.231+.009*((col+row)%3));
   const angle=(col*1.19+row*.73),idx=3+((col+row+1)%3);
   for(let petal=0;petal<4;petal++){
    const a=angle+petal*Math.PI/2,L=.166+.008*((col+row+petal)%3),W=.108+.005*((col+petal)%2);
    leaf(idx,xx,yy,zz,L,W,side<0?Math.PI:0,side*.12,a);
   }
  }
  for(let col=0;col<6;col++){
   const x=-.72+col*.288,y=.865+.006*(col%3);
   for(let p=0;p<4;p++)leaf(4+(col+p)%2,x,y,0,.207,.130,-Math.PI/2,0,p*Math.PI/2+col*.73);
  }
 }else{
  // Rail ends visibly enter the gold sockets; broad timber highlight keeps the warm material readable.
  for(const y of [.27,.605]){
   block(3,1.995,.115,.106,0,y-.0575,0,.009);
   block(4,1.983,.014,.092,0,y+.043,0,.003);
   for(const x of [-.975,.975]){block(2,.068,.154,.154,x,y-.077,0,.007);block(3,.081,.114,.111,x,y-.057,0,.003);}
  }
 }
 const names=HEDGE?['ivory-posts','navy-insets','brass-fittings','foliage-shade','foliage-main','foliage-highlights']:['ivory-posts','navy-insets','brass-fittings','timber-rails','timber-highlight'];
 for(let i=0;i<buckets.length;i++){
  const a=buckets[i];if(!a.length)continue;
  const geometry=geo(a),uv=[];for(let j=0;j<a.length;j+=3)uv.push(a[j],a[j+1]);
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,mats[i]);mesh.name=names[i];mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
};
})(typeof window!=='undefined'?window:globalThis);


// fence/factory.js
/* Tidal Academy: reference-derived clipped hedge/fence factory, no external assets. */
(function(root){
const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};I.PROPMODELS=I.PROPMODELS||{};
I.PROPMODELS['fence']=function(THREE,kit){
 const group=new THREE.Group();group.name='fence';
 const HEDGE=false, edge=HEDGE?1:1.1, buckets=[];
 const mats=[
 kit.mat('#f3efe6',{roughness:.86},'stone'),
 kit.mat('#304b7d',{roughness:.71}),
 kit.mat('#d6ae54',{roughness:.36,metalness:.65})
 ];
 if(HEDGE){mats.push(kit.mat('#7e963f',{roughness:.92},'sway'),kit.mat('#a8b952',{roughness:.86},'sway'),kit.mat('#c7cd66',{roughness:.82},'sway'));}
 else{mats.push(kit.mat('#916340',{roughness:.82},'wall'),kit.mat('#bb8856',{roughness:.78},'wall'));}
 for(let i=0;i<mats.length;i++)buckets.push([]);
 function triangle(dst,a,b,c){dst.push(...a,...b,...c);}
 function clipped(poly,bound,sign,cuts){
  const out=[];
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],ina=sign*(a[0]-bound)>=-1e-9,inb=sign*(b[0]-bound)>=-1e-9;
   if(ina)out.push(a);
   if(ina!==inb){const t=(bound-a[0])/(b[0]-a[0]),p=[bound,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];out.push(p);cuts.push(p);}
  }return out;
 }
 function hull(points){
  const q=Array.from(new Map(points.map(p=>[p[1].toFixed(7)+','+p[2].toFixed(7),p])).values()).sort((a,b)=>a[1]-b[1]||a[2]-b[2]);
  const cross=(a,b,c)=>(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]);
  const lo=[],hi=[];for(const p of q){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],p)<=1e-12)lo.pop();lo.push(p);}
  for(let j=q.length-1;j>=0;j--){const p=q[j];while(hi.length>1&&cross(hi[hi.length-2],hi[hi.length-1],p)<=1e-12)hi.pop();hi.push(p);}
  lo.pop();hi.pop();return lo.concat(hi);
 }
 function put(index,geo,x,y,z,rx,ry,rz){
  if(rx)geo.rotateX(rx);if(ry)geo.rotateY(ry);if(rz)geo.rotateZ(rz);geo.translate(x||0,y||0,z||0);
  const n=geo.index?geo.toNonIndexed():geo,p=n.attributes.position.array,dst=buckets[index],cutsL=[],cutsR=[];
  for(let j=0;j<p.length;j+=9){
   let poly=[[p[j],p[j+1],p[j+2]],[p[j+3],p[j+4],p[j+5]],[p[j+6],p[j+7],p[j+8]]];
   poly=clipped(poly,-edge,1,cutsL);if(poly.length)poly=clipped(poly,edge,-1,cutsR);
   for(let k=1;k<poly.length-1;k++)triangle(dst,poly[0],poly[k],poly[k+1]);
  }
  for(const pair of [[cutsL,-1],[cutsR,1]]){const h=hull(pair[0]);if(h.length>2){const center=[h[0][0],h.reduce((a,p)=>a+p[1],0)/h.length,h.reduce((a,p)=>a+p[2],0)/h.length];for(let j=0;j<h.length;j++){const a=h[j],b=h[(j+1)%h.length];if(pair[1]>0)triangle(dst,center,a,b);else triangle(dst,center,b,a);}}}
  if(n!==geo)n.dispose();geo.dispose();
 }
 function geo(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return g;}
 function chamfer(w,h,d,b){
  const arr=[],rings=[];
  function ring(y,x,z,inset){x-=inset;z-=inset;const q=Math.min(b,x*.3,z*.3);return [[-x+q,y,-z],[x-q,y,-z],[x,y,-z+q],[x,y,z-q],[x-q,y,z],[-x+q,y,z],[-x,y,z-q],[-x,y,-z+q]];}
  rings.push(ring(0,w/2,d/2,b),ring(b,w/2,d/2,0),ring(h-b,w/2,d/2,0),ring(h,w/2,d/2,b));
  for(let k=0;k<3;k++)for(let j=0;j<8;j++){const q=(j+1)%8;triangle(arr,rings[k][j],rings[k+1][j],rings[k+1][q]);triangle(arr,rings[k][j],rings[k+1][q],rings[k][q]);}
  for(let j=0;j<8;j++){const q=(j+1)%8;triangle(arr,[0,0,0],rings[0][j],rings[0][q]);triangle(arr,[0,h,0],rings[3][q],rings[3][j]);}return geo(arr);
 }
 function block(i,w,h,d,x,y,z,b){if(i===2||h<.035){const q=new THREE.BoxGeometry(w,h,d);put(i,q,x,y+h/2,z);}else put(i,chamfer(w,h,d,b||.004),x,y,z);}
 function profile(points,depth){const s=new THREE.Shape();s.moveTo(points[0][0],points[0][1]);for(let j=1;j<points.length;j++)s.lineTo(points[j][0],points[j][1]);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:8});g.translate(0,0,-depth/2);return g;}
 function diamond(w,h){return profile([[0,h/2],[w/2,0],[0,-h/2],[-w/2,0]],.008);}
 function star(w,h){return profile([[0,h/2],[w*.14,h*.12],[w/2,0],[w*.14,-h*.12],[0,-h/2],[-w*.14,-h*.12],[-w/2,0],[-w*.14,h*.12]],.008);}
 // Full symmetric pillars are cut at module endpoints, including every cap and finial.
 for(const x of [-edge,edge]){
  const collar=HEDGE?.84:.725,cap=HEDGE?.895:.78;
  block(0,.31,.09,.33,x,0,0,.008);
  block(0,.272,.035,.292,x,.085,0,.006);
  block(0,.237,collar-.11,.255,x,.11,0,.006);
  block(1,.255,.058,.275,x,collar-.035,0,.004);
  block(2,.258,.011,.278,x,collar-.043,0,.002);
  block(0,.313,.045,.34,x,cap-.028,0,.006);
  block(0,.265,.030,.294,x,cap+.012,0,.005);
  block(0,.212,.025,.245,x,cap+.037,0,.004);
  block(2,.095,.022,.108,x,cap+.061,0,.003);
  const finial=new THREE.OctahedronGeometry(1,0);finial.scale(.042,.059,.042);
  put(2,finial,x,cap+.141,0);
  // Narrow front/rear navy lancets and geometric brass stars remain legible at game distance.
  const panelH=HEDGE?.51:.44,py=.18;
  const arch=[[-.065,0],[.065,0],[.065,panelH-.055],[.034,panelH-.022],[0,panelH],[-.034,panelH-.022],[-.065,panelH-.055]];
  for(const s of [-1,1]){
   put(2,profile(arch.map(p=>[p[0]*1.11,p[1]+.004]),.006),x,py-.004,s*.130,0,s<0?Math.PI:0);
   put(1,profile(arch,.008),x,py,s*.135,0,s<0?Math.PI:0);
   put(2,star(.056,.090),x,py+panelH*.47,s*.143);
   put(2,diamond(.035,.061),x,collar-.105,s*.139);
  }
 }
 if(HEDGE){
  // Faceted core clumps create a continuous hedge volume while the outer rosettes break its outline.
  for(let i=0;i<8;i++)for(let j=0;j<3;j++){
   const x=-.78+i*(1.56/7),y=.235+j*.246+.009*((i+j)%3);
   const q=new THREE.IcosahedronGeometry(1,0);q.scale(.166,.202,.232);put(3+(i+j)%2,q,x,y,0,0,(i%3)*.31,0);
  }
  function leaf(index,x,y,z,L,W,rx,ry,rz){
   const r=[[0,0,0],[W*.35,L*.22,0],[W*.50,L*.58,0],[0,L,0],[-W*.50,L*.58,0],[-W*.35,L*.22,0]],a=[],front=[0,L*.48,.014],back=[0,L*.48,-.008];
   for(let j=0;j<6;j++){const n=(j+1)%6;triangle(a,front,r[j],r[n]);triangle(a,back,r[n],r[j]);}
   put(index,geo(a),x,y,z,rx,ry,rz);
  }
  for(const side of [-1,1])for(let row=0;row<3;row++)for(let col=0;col<6;col++){
   const xx=-.735+col*.292+(row%2)*.018,yy=.225+row*.245+.012*((col*3+row)%4),zz=side*(.231+.009*((col+row)%3));
   const angle=(col*1.19+row*.73),idx=3+((col+row+1)%3);
   for(let petal=0;petal<4;petal++){
    const a=angle+petal*Math.PI/2,L=.166+.008*((col+row+petal)%3),W=.108+.005*((col+petal)%2);
    leaf(idx,xx,yy,zz,L,W,side<0?Math.PI:0,side*.12,a);
   }
  }
  for(let col=0;col<6;col++){
   const x=-.72+col*.288,y=.865+.006*(col%3);
   for(let p=0;p<4;p++)leaf(4+(col+p)%2,x,y,0,.207,.130,-Math.PI/2,0,p*Math.PI/2+col*.73);
  }
 }else{
  // Rail ends visibly enter the gold sockets; broad timber highlight keeps the warm material readable.
  for(const y of [.27,.605]){
   block(3,1.995,.115,.106,0,y-.0575,0,.009);
   block(4,1.983,.014,.092,0,y+.043,0,.003);
   for(const x of [-.975,.975]){block(2,.068,.154,.154,x,y-.077,0,.007);block(3,.081,.114,.111,x,y-.057,0,.003);}
  }
 }
 const names=HEDGE?['ivory-posts','navy-insets','brass-fittings','foliage-shade','foliage-main','foliage-highlights']:['ivory-posts','navy-insets','brass-fittings','timber-rails','timber-highlight'];
 for(let i=0;i<buckets.length;i++){
  const a=buckets[i];if(!a.length)continue;
  const geometry=geo(a),uv=[];for(let j=0;j<a.length;j+=3)uv.push(a[j],a[j+1]);
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,mats[i]);mesh.name=names[i];mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
};
})(typeof window!=='undefined'?window:globalThis);


// tree_ring/factory.js
/* Tidal Academy: ivory annular tree seat, open center and low flower wreath. */
I.PROPMODELS['tree_ring'] = function (THREE, kit) {
  const g=new THREE.Group(); g.name='tree_ring';
  const stageRank=7;
  const colored=stageRank>=3, detailed=stageRank>=2, sectors=12, TAU=Math.PI*2;
  const materials={
    foundation:kit.mat(colored?'#d8cbb7':'#ddd5c6',{roughness:.9},'stone'),
    seat:kit.mat(colored?'#f3efe6':'#e6dfd1',{roughness:.84},'stone'),
    panels:kit.mat(colored?'#1f2c55':'#737a84',{roughness:.72}),
    ornament:kit.mat(colored?'#d8b45a':'#c1b6a0',{roughness:.43,metalness:.35}),
    foliage:kit.mat('#ffffff',{roughness:.86}),
    blossoms:kit.mat('#ffffff',{roughness:.79}),
    centers:kit.mat(colored?'#e6bb43':'#c8c0a8',{roughness:.74})
  };
  materials.foliage.vertexColors=true; materials.blossoms.vertexColors=true;
  const bins={};
  function put(id,geo,matrix,color){
    const raw=geo.index?geo.toNonIndexed():geo.clone();
    if(matrix)raw.applyMatrix4(matrix);
    const bucket=bins[id]||(bins[id]={p:[],n:[],c:[]}),p=raw.getAttribute('position'),n=raw.getAttribute('normal');
    const c=new THREE.Color(color||'#ffffff');
    for(let j=0;j<p.count;j++){if(j%3===0){const a=new THREE.Vector3().fromBufferAttribute(p,j),b=new THREE.Vector3().fromBufferAttribute(p,j+1),d=new THREE.Vector3().fromBufferAttribute(p,j+2);if(b.sub(a).cross(d.sub(a)).lengthSq()<1e-18){j+=2;continue;}}bucket.p.push(p.getX(j),p.getY(j),p.getZ(j));bucket.n.push(n.getX(j),n.getY(j),n.getZ(j));if(id==='foliage'||id==='blossoms')bucket.c.push(c.r,c.g,c.b);}
    raw.dispose(); geo.dispose();
  }
  function transform(x,y,z,rx,ry,rz,sx,sy,sz){return new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),new THREE.Vector3(sx||1,sy||1,sz||1));}
  // Revolved closed radial cross-section. Never caps across the central opening.
  function sector(id,profile,a0,a1,steps,color){
    const p=[],n=[],v=(r,y,a)=>new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r);
    function tri(a,b,c){const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();for(const q of [a,b,c]){p.push(q.x,q.y,q.z);n.push(normal.x,normal.y,normal.z);}}
    for(let k=0;k<profile.length;k++){const A=profile[k],D=profile[(k+1)%profile.length];for(let j=0;j<steps;j++){const t0=a0+(a1-a0)*j/steps,t1=a0+(a1-a0)*(j+1)/steps;const a=v(A[0],A[1],t0),b=v(A[0],A[1],t1),c=v(D[0],D[1],t1),d=v(D[0],D[1],t0);tri(a,b,c);tri(a,c,d);}}
    if(a1-a0<TAU-.001){const points=profile.map(q=>new THREE.Vector2(q[0],q[1]));const tris=THREE.ShapeUtils.triangulateShape(points,[]);for(const f of tris){tri(v(...profile[f[0]],a0),v(...profile[f[1]],a0),v(...profile[f[2]],a0));tri(v(...profile[f[0]],a1),v(...profile[f[2]],a1),v(...profile[f[1]],a1));}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));put(id,geo,null,color);
  }
  const bore=.45/Math.cos(Math.PI/24)+.00004;
  for(let i=0;i<sectors;i++){
    const a=i*TAU/sectors-TAU/sectors/2,b=a+TAU/sectors,gap=stageRank? .0035:0;
    sector('foundation',[[1.1,0],[1.59,0],[1.61,.02],[1.61,.075],[1.59,.095],[1.1,.095]],a+gap,b-gap,2);
    if(i===0)sector('body',[[1.105,.075],[1.565,.075],[1.565,.386],[1.105,.386]],0,TAU,24);
    const cap=detailed?[[1.11,.356],[1.598,.356],[1.62,.378],[1.62,.428],[1.598,.45],[1.132,.45],[1.11,.428]]:[[1.11,.356],[1.62,.356],[1.62,.45],[1.11,.45]];
    sector('seat',cap,a+gap,b-gap,4);
    if(i===0)sector('inner',[[bore,0],[.60,0],[.615,.02],[.615,.33],[.595,.36],[bore+.017,.36],[bore,.343]],-Math.PI/24,TAU-Math.PI/24,24);
    if(stageRank>=1){
      const mid=(a+b)/2,lo=a+.039,hi=b-.039;
      sector('panels',[[1.565,.112],[1.575,.112],[1.575,.345],[1.565,.345]],lo,hi,2);
      for(const y of [.105,.345])sector('ornament',[[1.573,y],[1.584,y],[1.584,y+.009],[1.573,y+.009]],lo-.005,hi+.005,2);
      for(const t of [lo,hi])put('ornament',new THREE.BoxGeometry(.011,.248,.011),transform(1.578*Math.sin(t),.23,1.578*Math.cos(t),0,t,0));
      const sh=new THREE.Shape(),R=.074,r=.063,d=.036,x=(R*R-r*r+d*d)/(2*d),y=Math.sqrt(R*R-x*x),ao=Math.atan2(y,x),ai=Math.atan2(y,x-d);
      sh.moveTo(x,y);sh.absarc(0,0,R,ao,TAU-ao,false);sh.absarc(d,0,r,-ai,ai,true);sh.closePath();
      const moon=new THREE.ExtrudeGeometry(sh,{depth:.009,steps:1,curveSegments:6,bevelEnabled:false});
      put('ornament',moon,transform(1.58*Math.sin(mid),.231,1.58*Math.cos(mid),0,mid,.28));
      const star=new THREE.Shape();star.moveTo(0,.054);star.lineTo(.014,.007);star.lineTo(.027,0);star.lineTo(.014,-.007);star.lineTo(0,-.054);star.lineTo(-.014,-.007);star.lineTo(-.027,0);star.lineTo(-.014,.007);star.closePath();
      put('ornament',new THREE.ExtrudeGeometry(star,{depth:.008,steps:1,bevelEnabled:false}),transform(1.573*Math.sin(a),.23,1.573*Math.cos(a),0,a,0));
    }
  }
  if(!detailed)sector('foliage',[[.62,.30],[1.105,.30],[.86,.385]],0,TAU,48,'#929884');
  if(detailed){
    function ellipsoid(id,x,y,z,sx,sy,sz,ry,rz,color,ws=6,hs=3){put(id,id==='blossoms'&&ws===6?new THREE.SphereGeometry(1,6,2):new THREE.OctahedronGeometry(1,0),transform(x,y,z,0,ry,rz,sx,sy,sz),color);}
    const greens=colored?['#64873d','#78994a','#486d36','#8aa251']:['#929884'];
    sector('foliage',[[.62,.30],[1.105,.30],[.86,.385]],0,TAU,48,greens[2%greens.length]);
    for(let i=0;i<36;i++){
      const a=i*TAU/36,rr=.71+.25*((i*7)%11)/10,y=.355+.025*(i%3),x=rr*Math.sin(a),z=rr*Math.cos(a);
      for(let j=0;j<3;j++){
        const t=a+j*TAU/3+(i%4)*.21,len=.13+.021*((i+j)%3);
        ellipsoid('foliage',x+Math.sin(t)*.047,y+.02*j,z+Math.cos(t)*.047,.047,.022,len,t,.35*(j-1),greens[(i+j)%greens.length],5,3);
      }
    }
    for(let i=0;i<30;i++){
      const a=i*TAU/30+.05*Math.sin(i*2.4),rr=.755+.20*((i*7)%9)/8,x=Math.sin(a)*rr,z=Math.cos(a)*rr,y=.433+.036*(i%3),size=i%3===0?.072:.053;
      const col=colored?(i%4===0?'#6c8bc9':i%4===1?'#f2cf5f':'#fff8df'):'#dbd8cc';
      put('foliage',new THREE.CylinderGeometry(.007,.008,y-.31,3),transform(x,(y+.31)/2,z),greens[i%greens.length]);
      for(let j=0;j<5;j++){const t=a+j*TAU/5;ellipsoid('blossoms',x+Math.sin(t)*size*.63,y,z+Math.cos(t)*size*.63,size*.42,.015,size*.68,t,0,col,6,3);}
      ellipsoid('centers',x,y+.015,z,size*.23,.020,size*.23,0,0,null,6,3);
    }
    for(let i=0;i<6;i++){
      const a=i*TAU/6+.2,rr=.91,x=Math.sin(a)*rr,z=Math.cos(a)*rr,top=.58+.025*(i%2);
      put('foliage',new THREE.CylinderGeometry(.006,.008,top-.32,3),transform(x,(top+.32)/2,z),greens[i%greens.length]);
      for(let j=0;j<3;j++){const t=a+j*2.4,h=.48+.042*j;ellipsoid('blossoms',x+.019*Math.sin(t),h,z+.019*Math.cos(t),.023-.004*j,.027,.023-.004*j,t,.2,colored?'#aa98cd':'#c6c1ca',5,3);}
    }
  }
  for(const id of Object.keys(bins)){
    const b=bins[id],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));if(b.c.length)geo.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));
    const mat=materials[id]||materials.foundation,m=new THREE.Mesh(geo,mat);m.name=id;m.castShadow=true;m.receiveShadow=true;g.add(m);
  }
  return g;
};

})(typeof window !== 'undefined' ? window : globalThis);
