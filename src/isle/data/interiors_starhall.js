/* 潮汐小島・大講堂：白石扇廳、五色應考桌與通往星環之頂的星階；室內規格見 house.js。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['starhall'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '大講堂・雲上的每週模擬考';
    const KEY='starhall',cols=[],spots=[],lights=[];

    const PI = Math.PI, V = a => new THREE.Vector3(...a);
    const C = { cream:'#fff3e1', stone:'#eee5d8', floor:'#fbf3e8', gold:'#e5c48a', wood:'#d9b68c', dark:'#967956', lilac:'#c9b9df', ink:'#69768b', paper:'#fff9ed', night:'#263453', seam:'#e6dace' }, M = {};
    Object.keys(C).forEach(k => {
      const kind=k==='gold'?'metal':['wood','dark'].includes(k)?'wood':['floor','stone'].includes(k)?'stone':k==='paper'?'paper':'plaster';
      M[k]=kit.mat(C[k],{roughness:k==='gold'?.38:k==='floor'?.48:.88,metalness:k==='gold'?.42:0,side:THREE.DoubleSide},kind);M[k].name=KEY+':'+k;
    });
    const cube=new THREE.BoxGeometry(1,1,1),orb=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,16),rod=new THREE.CylinderGeometry(1,1,1,6),geometries=new Map();
    function cached(key,make){if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);}
    function mesh(q,m,x=0,y=0,z=0){const o=new THREE.Mesh(q,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;g.add(o);return o;}
    function box(x,y,z,w,h,d,m,a=0){const o=mesh(cube,m,x,y,z);o.scale.set(w,h,d);o.rotation.y=a;return o;}
    function ball(x,y,z,sx,sy,sz,m){const o=mesh(orb,m,x,y,z);o.scale.set(sx,sy,sz);return o;}
    function cyl(x,y,z,r,h,m){const o=mesh(cylinder,m,x,y,z);o.scale.set(r,h,r);return o;}
    function beam(a,b,r,m){const A=V(a),B=V(b),d=B.clone().sub(A),o=mesh(rod,m,...A.clone().add(B).multiplyScalar(.5).toArray());o.scale.set(r,d.length(),r);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
    function line(pts,r,m){for(let j=1;j<pts.length;j++)beam(pts[j-1],pts[j],r,m);}
    function geo(P,IX){const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(P,3));if(IX)q.setIndex(IX);q.computeVertexNormals();return q;}
    function local(x,z,a,u,v,y){return[x+Math.cos(a)*u+Math.sin(a)*v,y,z-Math.sin(a)*u+Math.cos(a)*v];}
    function lb(x,z,a,u,v,y,w,h,d,m){const p=local(x,z,a,u,v,y);return box(p[0],y,p[2],w,h,d,m,a);}
    // 旋轉家具沿長軸切成薄碰撞箱，走道不會被斜桌的外框吃掉。
    function col(x,z,w,d,a=0,y0=0,y1=2){
      const poly=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>{const p=local(x,z,a,u,v,0);return[p[0],p[2]];});
      const bounds=p=>[Math.min(...p.map(v=>v[0])),y0,Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),y1,Math.max(...p.map(v=>v[1]))];
      if(Math.abs(Math.sin(a)*Math.cos(a))<1e-8){cols.push(bounds(poly));return;}
      const bb=bounds(poly),axis=bb[3]-bb[0]>bb[5]-bb[2]?0:1,lo=axis?bb[2]:bb[0],hi=axis?bb[5]:bb[3],n=Math.ceil((hi-lo)/.1);
      function clip(p,t,sign){const out=[];for(let j=0;j<p.length;j++){const A=p[j],B=p[(j+1)%p.length],ina=(A[axis]-t)*sign>=-1e-9,inb=(B[axis]-t)*sign>=-1e-9;if(ina)out.push(A);if(ina!==inb){const f=(t-A[axis])/(B[axis]-A[axis]);out.push([A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f]);}}return out;}
      for(let j=0;j<n;j++){const p=clip(clip(poly,lo+(hi-lo)*j/n,1),lo+(hi-lo)*(j+1)/n,-1);if(p.length)cols.push(bounds(p));}
    }
    function floorPoly(points,name,y=0,m=M.floor){const q=new THREE.ShapeGeometry(new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))));q.rotateX(-PI/2);const o=mesh(q,m,0,y,0);o.name=KEY+':'+name;o.userData={walk:true,prop:true};return o;}
    function arch(w,h,b=0){const p=[[-w/2,b],[w/2,b],[w/2,b+h-w/2]];for(let j=1;j<=20;j++){const t=j*PI/20;p.push([w/2*Math.cos(t),b+h-w/2+w/2*Math.sin(t)]);}return p;}
    function archTrim(x,z,a,w,h,b=0,m=M.gold,r=.035){const pts=arch(w,h,b).slice(1).map(([u,y])=>local(x,z,a,u,0,y));line(pts,r,m);beam(local(x,z,a,-w/2,0,b),local(x,z,a,-w/2,0,b+h-w/2),r,m);}
    function archCap(x,z,a,w,h,b,top,depth,m){const p=[[-w/2,top],[w/2,top],...arch(w,h,b).slice(2)];const q=new THREE.ExtrudeGeometry(new THREE.Shape(p.map(v=>new THREE.Vector2(...v))),{depth,bevelEnabled:false});const o=mesh(q,m,x,0,z);o.rotation.y=a;return o;}
    function ring(x,y,z,r,t,m){const o=mesh(cached('ring:'+r+':'+t,()=>new THREE.RingGeometry(r-t,r+t,96)),m,x,y,z);o.rotation.x=-PI/2;return o;}
    function star(x,y,z,r,m,points=5){const pts=[];for(let j=0;j<points*2;j++){const a=j*PI/points,rr=j%2?r*.42:r;pts.push([x+Math.sin(a)*rr,z-Math.cos(a)*rr]);}const q=new THREE.ShapeGeometry(new THREE.Shape(pts.map(([u,v])=>new THREE.Vector2(u,-v))));q.rotateX(-PI/2);return mesh(q,m,0,y,0);}

    const desks={},glow=[],view=kit.view(),glass=kit.glass(),lamp=kit.lamp('#ffddb1'),shade=kit.shade('#fff3df');
    const starMat=kit.mat('#d9dfed',{emissive:new THREE.Color('#aebddd'),emissiveIntensity:.35,roughness:.9});
    // 半八角白石大廳與中央星環地坪，南方通道一路留到應考桌前。
    floorPoly([[-8,-9],[8,-9],[11,-5],[11,5.8],[8,9],[-8,9],[-11,5.8],[-11,-5]],'hall-floor');
    floorPoly([[-1.5,8.7],[1.5,8.7],[1.5,10],[-1.5,10]],'door-floor');
    ring(0,.009,1.8,3.2,.018,M.gold);ring(0,.011,1.8,3.4,.012,M.lilac);
    for(const s of [-1,1]){box(s*1.36,.012,2.5,.025,.016,8.2,M.gold);box(s*1.47,.012,2.5,.045,.016,8.2,M.lilac);}
    function wall(x,z,w,d,a=0,h=7.8){box(x,h/2,z,w,h,d,M.cream,a);col(x,z,w,d,a,0,h);box(x,.15,z,w+.05,.3,d+.05,M.stone,a);box(x,4.97,z,w+.09,.1,d+.09,M.gold,a);}
    // 真正鏤空的高拱窗，窗景與玻璃分兩層，避免窗外被實牆遮住。
    function windowAt(x,z,a){
      const w=1.65,h=3.5,b=1.05,q=cached('window',()=>{const q=new THREE.ShapeGeometry(new THREE.Shape(arch(w,h,b).map(v=>new THREE.Vector2(...v)))),p=q.attributes.position,uv=q.attributes.uv;for(let j=0;j<p.count;j++)uv.setXY(j,p.getX(j)/w+.5,(p.getY(j)-b)/h);return q;});
      const p=local(x,z,a,0,-.22,0),v=mesh(q,view,p[0],0,p[2]);v.rotation.y=a;
      const pp=local(x,z,a,0,.015,0),gl=mesh(q,glass,pp[0],0,pp[2]);gl.rotation.y=a;
      archTrim(x,z,a,w+.08,h+.06,b-.02,M.stone,.11);archTrim(...[x,z,a,w,h,b,M.gold,.032]);
      lb(x,z,a,0,.06,b-.08,w+.3,.16,.32,M.stone);lb(x,z,a,0,.06,b+h*.46,w,.035,.06,M.gold);lb(x,z,a,0,.07,b+h*.48,.035,h-.16,.06,M.gold);
      lb(x,z,a,0,-.04,b/2,w+.1,b,.45,M.cream);archCap(x,z,a,w,h,b,7.8,.45,M.cream);
      col(x,z,.5,w+.18,a+PI/2,0,7.8);
    }
    for(const s of [-1,1]){
      const a=-s*PI/2;
      for(const z of [-3,1,5])windowAt(s*11,z,a);
      for(const [z,len]of [[-4.45,1.1],[-1,2.35],[3,2.35],[5.75,.15]])wall(s*11,z,.5,len);
      for(const [x,z,dx,dz]of [[s*9.5,-7,s*3,4],[s*9.5,7.4,-s*3,3.2]]){const len=Math.hypot(dx,dz),a=Math.atan2(dx,dz);wall(x,z,.5,len,a);}
      wall(s*4.75,9,6.5,.5);wall(s*1.66,9.45,.28,1.1,0,3.9);
    }
    // 南拱門與北牆分段；西北開口留給上行的星階。
    archCap(0,8.86,0,3,4.1,0,7.8,.5,M.cream);archTrim(0,8.7,0,3,4.1,0,M.stone,.13);archTrim(0,8.55,0,3.14,4.18);
    wall(1.075,-9.15,13.85,.5);wall(-7.9,-9.15,.2,.5);archCap(-6.8,-9.1,0,1.9,3.35,.45,7.8,.5,M.cream);
    // 高拱夜藍穹頂及金色肋線，點星貼在內表面下方。
    const roofStart=g.children.length,dome=mesh(new THREE.SphereGeometry(1,64,20,0,PI*2,0,PI/2),M.night,0,5.25,0);dome.scale.set(13.2,2.5,11.7);
    for(let k=0;k<176;k++){const a=k*2.3999632297,rr=.94*Math.sqrt((k+.5)/176),x=Math.sin(a)*13.2*rr,z=Math.cos(a)*11.7*rr,y=5.25+2.5*Math.sqrt(1-rr*rr)-.045,s=k%13===0?.042:.025;ball(x,y,z,s,s*.7,s,starMat);}
    for(let k=0;k<12;k++){const a=k*PI/6,pts=[];for(let j=0;j<=20;j++){const t=j*PI/40;pts.push([Math.sin(a)*13.15*Math.cos(t),5.24+2.48*Math.sin(t),Math.cos(a)*11.65*Math.cos(t)]);}line(pts,.025,M.gold);}
    for(let j=roofStart;j<g.children.length;j++)g.children[j].userData.roof=true;
    // 舞臺正面兩座緩階配隱藏坡道，主持人與成績單前方皆不放家具。
    box(0,.215,-7.3,16,.43,3.4,M.stone);floorPoly([[-8,-9],[8,-9],[8,-5.6],[-8,-5.6]],'stage-floor',.45);
    box(0,.36,-5.59,16,.13,.06,M.gold);
    for(const [x,w]of [[-6.75,2.5],[0,7.6],[6.75,2.5]])col(x,-5.61,w,.1,0,0,.48);
    for(const x of [-4.7,4.7]){
      for(let j=0;j<3;j++){const h=(j+1)*.15,z=-4.6-j*.4;box(x,h/2,z,1.8,h,.4,M.stone);box(x,h+.006,z+.18,1.8,.012,.025,M.gold);}
      const q=geo([x-.9,0,-4.4,x+.9,0,-4.4,x-.9,.45,-5.62,x+.9,.45,-5.62],[0,1,2,1,3,2]),o=mesh(q,M.floor);o.visible=false;o.userData={walk:true,prop:true};o.name='starhall:stage-ramp';
    }
    // 獨立成績單面朝南方，畫布替換材質時不會牽動任何靜態零件。
    const boardMat=new THREE.MeshStandardMaterial({color:'#2f4a42',roughness:.95}),board=mesh(new THREE.PlaneGeometry(6,2.6),boardMat,0,3,-8.85);board.name='board_grand';board.userData.prop=true;
    box(0,3,-8.92,6.25,2.85,.08,M.dark);
    for(const x of [-3.1,3.1])box(x,3,-8.8,.11,2.86,.12,M.gold);for(const y of [1.63,4.37])box(0,y,-8.8,6.3,.1,.12,M.gold);
    function lantern(x,y,z){cyl(x,y,z,.16,.28,shade);for(const yy of [y-.18,y+.18])cyl(x,yy,z,.2,.06,M.gold);ball(x,y,z,.1,.12,.1,lamp);}
    for(const x of [-3.65,3.65]){beam([x,3.54,-8.9],[x,3.54,-8.54],.025,M.gold);lantern(x,3.3,-8.54);const o=mesh(new THREE.OctahedronGeometry(.19),starMat,x,3.8,-8.54);o.scale.y=1.3;lights.push([x,3.3,-8.2,'#ffe1bd',.85,.25]);}
    box(0,.53,-6.3,1,.16,.76,M.dark);box(0,1.08,-6.3,.65,1,.46,M.wood);const top=box(0,1.63,-6.3,1.14,.12,.75,M.wood);top.rotation.x=.15;box(0,1.35,-6.04,.45,.36,.035,M.gold);col(0,-6.3,1.14,.86,0,.45,1.8);
    spots.push({x:0,y:0,z:-4.9,r:1.2,kind:'hook:starhall',topic:'board',label:'看成績單'});
    // 五色應考桌向舞臺微彎；銘牌的局部正面為正南，平面法線朝向來客。
    const exam=[['zh','#ff8fa3',-6,-2.6,-.18],['en','#7cc7ff',-3,-3.1,-.09],['ma','#b9a2ff',0,-3.4,0],['so','#ffb86b',3,-3.1,.09],['na','#5ee7f0',6,-2.6,.18]];
    exam.forEach(([key,color,x,z,a])=>{
      const m=kit.mat(color,{roughness:.95},'fabric');m.name='starhall:'+key;
      lb(x,z,a,0,0,1.02,1.32,.12,.72,M.wood);lb(x,z,a,0,0,.89,1.16,.18,.62,M.cream);lb(x,z,a,0,0,1.086,.43,.012,.7,m);
      for(const u of [-.53,.53])for(const v of [-.25,.25])lb(x,z,a,u,v,.45,.065,.9,.065,M.dark);col(x,z,1.32,.72,a,0,1.08);
      lb(x,z,a,0,.86,.45,.56,.1,.5,m);lb(x,z,a,0,1.08,.74,.56,.62,.07,M.wood);for(const u of [-.22,.22])for(const v of [.67,1.05])lb(x,z,a,u,v,.22,.045,.44,.045,M.dark);
      const cp=local(x,z,a,0,.89,0);col(cp[0],cp[2],.56,.55,a,0,1.05);
      const ip=local(x,z,a,-.43,-.12,1.15);cyl(ip[0],ip[1],ip[2],.07,.14,M.ink);beam([ip[0],1.19,ip[2]],[ip[0]+.06,1.45,ip[2]-.03],.012,M.gold);
      lb(x,z,a,.18,-.04,1.09,.3,.015,.34,M.paper);const sp=local(x,z,a,0,-.08,1.65),gem=mesh(new THREE.OctahedronGeometry(.14),m,...sp);gem.rotation.z=.2;
      const plate=local(x,z,a,0,.39,.95),stand=local(x,z,a,0,1.65,0);desks[key]={at:[x,z],ry:a,plate:[...plate,a]};spots.push({x:stand[0],y:0,z:stand[2],r:.9,kind:'hook:starhall',topic:'desk:'+key,label:'坐下應考'});
    });
    // 木長椅沿弧線分節，中央淨寬大於兩公尺六；椅腳與椅背共用碰撞範圍。
    for(const s of [-1,1])for(const row of [-.15,1.5,3.15,4.8])for(const xx of [3.05,5.0,6.95]){
      const x=s*xx,z=row+.025*(xx-1.3)**2,a=s*.035*(xx-1.3);
      lb(x,z,a,0,0,.48,1.84,.13,.52,M.wood);lb(x,z,a,0,.25,.8,1.84,.62,.065,M.wood);lb(x,z,a,0,.29,.9,1.7,.045,.025,M.gold);
      for(const u of [-.72,.72])for(const v of [-.16,.16])lb(x,z,a,u,v,.22,.07,.44,.07,M.dark);col(x,z,1.84,.6,a,0,1.11);
    }
    // 西北星階向上盤旋，僅供觀賞；光幕與互動點留在可走的舞臺上。
    archTrim(-6.8,-8.72,0,1.9,3.35,.45,M.stone,.14);archTrim(-6.8,-8.57,0,2.08,3.46,.45);
    floorPoly([[-7.75,-9],[-5.85,-9],[-5.85,-10.5],[-7.75,-10.5]],'stair-niche',.45);
    for(let j=0;j<14;j++){const a=j*.16,x=-6.8+Math.sin(a)*.68,z=-9.25-j*.22,y=.53+j*.17;box(x,y,z,1.25,.13,.32,M.lilac,a);box(x,y+.075,z,1.25,.022,.04,starMat,a);}
    wall(-8.05,-10.5,.35,3.1,0,5.6);wall(-5.55,-10.5,.35,3.1,0,5.6);wall(-6.8,-12.1,2.8,.35,0,5.6);
    const veilMat=new THREE.MeshStandardMaterial({color:'#c9b9df',emissive:new THREE.Color('#b9caff'),emissiveIntensity:.4,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
    const veil=mesh(new THREE.PlaneGeometry(1.83,2.48),veilMat,-6.8,1.7,-8.79);veil.name='summit_veil';veil.userData.prop=true;
    const summit=[-6.8,-7.25];spots.push({x:summit[0],y:.45,z:summit[1],r:1.1,kind:'hook:starhall',topic:'summit',label:'星環之頂'});
    for(const s of [-1,1])for(const z of [-3,2.3,6.6]){const x=s*(z>6?9.65:10.5),wx=s*(z>6?10.1:10.78);beam([wx,3.82,z],[x,3.82,z],.025,M.gold);beam([x,3.82,z],[x,3.72,z],.025,M.gold);lantern(x,3.55,z);lights.push([x-s*.15,3.55,z,'#ffe1bd',.8,.28]);}
    lights.push([0,4.8,1.4,'#e0dcff',.9,.35],[-6.8,2.7,-9.25,'#c8d7ff',.9,.35]);
    for(const s of [-1,1])glow.push({kind:'cove',a:[s*10.5,4.9,-4],b:[s*10.5,4.9,5.5],n:[-s,0],c:C.cream});
    spots.push({x:-8.9,y:0,z:2.4,r:.85,kind:'look',label:'看看窗外',name:'雲海高窗',lines:['雲把遠方的喧鬧輕輕收起。','窗邊的光，陪你把呼吸放慢。']},{x:4.8,y:0,z:6.65,r:.8,kind:'look',label:'看看長椅',name:'安靜的木長椅',lines:['木紋記得每次努力的重量。','歇一會兒，也是在向前走。']},{x:4.6,y:.45,z:-8.1,r:.8,kind:'look',label:'看看金框',name:'成績單的星光',lines:['星光不替任何人排定位置。','每次抬頭，都能看見新的路。']});
    Object.assign(g.userData,{spawn:[0,0,7.2,PI],exit:[0,9,.9],host:[2.4,.45,-6,0],spots,lights,glow,view:'sky',indoor:true,bounce:2,sun:[.35,.8,.5],cols,desks,summit});

    // 依材質合併靜態幾何；互動零件、可走地板及鏡頭穿透標記各自保留。
    // roof 供預覽剖視；正常場景的牆與穹頂照常擋鏡頭。
    g.updateMatrixWorld(true);
    const batches=new Map(),old=[],v=new THREE.Vector3(),nm=new THREE.Matrix3();
    g.traverse(o=>{
      if(!o.isMesh||o.userData.prop||o.userData.walk)return;
      const key=o.material.uuid+':'+!!o.userData.roof+':'+!!o.userData.camThrough;
      if(!batches.has(key))batches.set(key,{m:o.material,roof:!!o.userData.roof,cam:!!o.userData.camThrough,parts:[]});batches.get(key).parts.push(o);old.push(o);
    });
    batches.forEach(({m,roof,cam,parts})=>{
      const P=[],N=[],UV=[],RGB=[],hasColor=!!m.vertexColors;
      parts.forEach(o=>{
        const q=o.geometry,p=q.attributes.position,n=q.attributes.normal,uv=q.attributes.uv,c=q.attributes.color,ix=q.index;nm.getNormalMatrix(o.matrixWorld);
        for(let j=0,count=ix?ix.count:p.count;j<count;j++){const k=ix?ix.getX(j):j;v.fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld);P.push(v.x,v.y,v.z);v.fromBufferAttribute(n,k).applyMatrix3(nm).normalize();N.push(v.x,v.y,v.z);UV.push(uv?uv.getX(k):0,uv?uv.getY(k):0);if(hasColor)RGB.push(c?c.getX(k):1,c?c.getY(k):1,c?c.getZ(k):1);}
      });
      const q=geo(P);q.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));q.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));if(hasColor)q.setAttribute('color',new THREE.Float32BufferAttribute(RGB,3));const o=mesh(q,m);o.name=KEY+':merged:'+(m.name||m.type)+(roof?':roof':'');if(roof)o.userData.roof=true;if(cam){o.userData.camThrough=true;o.castShadow=false;o.receiveShadow=false;o.renderOrder=-900;}
    });
    const unused=new Set(old.map(o=>o.geometry));old.forEach(o=>o.removeFromParent());g.traverse(o=>{if(o.isMesh)unused.delete(o.geometry);});unused.forEach(q=>q.dispose());
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
