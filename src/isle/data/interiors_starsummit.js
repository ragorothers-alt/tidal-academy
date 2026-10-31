/* 潮汐小島・星環之頂：雲海露臺、十科水晶與星夜祭壇；室內規格見 house.js。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['starsummit'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '星環之頂・群星之上的白石露臺';
    const KEY='starsummit',cols=[],spots=[],lights=[];

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

    // 圓臺南緣挖出真正的下行階口，其餘白石地面連成一片。
    const points=[];for(let j=0;j<=160;j++){const a=PI+.15+(2*PI-.3)*j/160;points.push([Math.sin(a)*9,-Math.cos(a)*9]);}points.push([Math.sin(.15)*9,8.25],[-Math.sin(.15)*9,8.25]);
    floorPoly(points,'terrace-floor');
    const foundation=mesh(new THREE.CylinderGeometry(8.98,8.6,.65,96,1,true,PI+.15,2*PI-.3),M.stone,0,-.325,0);
    // 星環鑲嵌貼地而不重疊，中央薄臺可直接走上去。
    for(const [r,t,m]of [[8.28,.025,M.gold],[6.1,.024,M.gold],[5.87,.015,M.lilac],[2.6,.025,M.gold],[2.4,.016,M.lilac]])ring(0,.012,0,r,t,m);
    for(let j=0;j<10;j++){const a=j*PI/5,x=Math.sin(a)*4.9,z=-Math.cos(a)*4.9;star(x,.014,z,.22,M.gold);beam([Math.sin(a)*3,.016,-Math.cos(a)*3],[Math.sin(a)*5.55,.016,-Math.cos(a)*5.55],.009,M.lilac);}
    const dais=cyl(0,.05,0,2,.1,M.stone);dais.name='starsummit:altar-dais';dais.userData={walk:true,prop:true};ring(0,.108,0,1.9,.035,M.gold);star(0,.11,0,1.65,M.gold,5);star(0,.113,0,1.37,M.floor,5);
    cyl(0,.43,0,.39,.66,M.cream);cyl(0,.16,0,.46,.12,M.stone);cyl(0,.8,0,.46,.1,M.gold);col(0,0,.92,.92,0,.1,.85);
    const ringBig=new THREE.Group();ringBig.name='ring_big';ringBig.position.set(0,8.5,0);g.add(ringBig);
    // 半步旋轉的十柱環繞南階口，水晶材質逐柱獨立，供主程式調整發光。
    const subjects=[['chinese','#ff8fa3'],['english','#7cc7ff'],['math','#b9a2ff'],['history','#ffb86b'],['geography','#a6e07a'],['civics','#ffd76b'],['physics','#5ee7f0'],['chemistry','#62f0b8'],['biology','#8ff07a'],['earth','#93a8ff']];
    const crystalGeo=new THREE.LatheGeometry([new THREE.Vector2(.08,0),new THREE.Vector2(.34,.25),new THREE.Vector2(.4,1.91),new THREE.Vector2(.24,2.24),new THREE.Vector2(0,2.6)],6);
    subjects.forEach(([sid,color],j)=>{
      const a=PI/10+j*PI/5,x=Math.sin(a)*7.2,z=-Math.cos(a)*7.2;
      cyl(x,.13,z,.57,.26,M.stone);cyl(x,.29,z,.45,.08,M.gold);col(x,z,1.14,1.14,0,0,.65);
      const m=new THREE.MeshStandardMaterial({color,emissive:new THREE.Color(color),emissiveIntensity:.25,roughness:.28,metalness:.12,flatShading:true});m.name='starsummit:crystal:'+sid;
      const o=mesh(crystalGeo,m,x,.34,z);o.name='pillar_'+sid;o.rotation.y=a;o.userData.prop=true;
      for(const yy of [.42,.65])ring(x,yy,z,.36,.018,M.gold);
      if(j%2===0)lights.push([x,1.85,z,color,.85,.32]);
    });
    // 低矮實心欄腳配白石欄杆，南方唯一缺口接向階口。
    const gap=.19,n=112;
    for(let j=0;j<n;j++){
      const a0=PI+gap+(2*PI-gap*2)*j/n,a1=PI+gap+(2*PI-gap*2)*(j+1)/n,a=(a0+a1)/2,r=8.78,w=(a1-a0)*r+.012,x=Math.sin(a)*r,z=-Math.cos(a)*r;
      box(x,.16,z,w,.32,.3,M.stone,-a);box(x,1,z,w,.13,.38,M.cream,-a);box(x,1.075,z,w,.025,.4,M.gold,-a);col(x,z,w,.38,-a,0,1.1);
      if(j%3===0){cyl(x,.65,z,.075,.7,M.cream);cyl(x,.35,z,.115,.09,M.gold);}
    }
    // 南方小亭罩著向下的階梯；階梯在臺面缺口裡逐級隱入雲中。
    const lamp=kit.lamp('#e2d7ff'),shade=kit.shade('#fff3df');
    for(const x of [-1.58,1.58])for(const z of [8.2,10.05]){
      cyl(x,1.6,z,.16,3.2,M.cream);cyl(x,.12,z,.25,.24,M.stone);cyl(x,3.18,z,.23,.14,M.gold);col(x,z,.5,.5,0,0,3.3);
    }
    for(const z of [8.2,10.05]){archTrim(0,z,0,3.16,3.85,0,M.stone,.15);archTrim(0,z-.1,0,3.2,3.89,0,M.gold,.035);}
    const P=[],IX=[];for(let j=0;j<=32;j++){const a=j*PI/32;for(const z of [8.08,10.18])P.push(Math.cos(a)*1.77,2.3+Math.sin(a)*1.72,z);}for(let j=0;j<32;j++){const k=j*2;IX.push(k,k+1,k+2,k+1,k+3,k+2);}const pavilionRoof=mesh(geo(P,IX),M.night);pavilionRoof.userData.roof=true;
    for(let j=0;j<9;j++){const y=-j*.18,z=8.4+j*.3;box(0,y-.08,z,2.45,.16,.3,M.stone);box(0,y+.006,z-.135,2.45,.012,.025,M.gold);}
    const ramp=mesh(geo([-1.225,0,8.25,1.225,0,8.25,-1.225,-1.62,10.95,1.225,-1.62,10.95],[0,1,2,1,3,2]),M.floor);ramp.visible=false;ramp.userData={walk:true,prop:true};
    for(const x of [-1.6,1.6]){ball(x,2.5,8.15,.12,.18,.12,lamp);cyl(x,2.48,8.15,.19,.32,shade);lights.push([x,2.5,8.05,'#e2d7ff',.75,.25]);}
    lights.push([0,2,0,'#fff0d2',1.05,.4]);
    // 天穹、星點與雲海都不擋鏡頭；透明背景材質也避免室內建置時重啟投影。
    const skyGeo=new THREE.SphereGeometry(70,64,32),skyP=skyGeo.attributes.position,skyRGB=[];
    for(let j=0;j<skyP.count;j++){const y=skyP.getY(j)/70,c=new THREE.Color('#d7a6c9');if(y>=0)c.lerp(new THREE.Color('#535486'),Math.min(1,y*3));if(y>.3)c.lerp(new THREE.Color('#151b42'),(y-.3)/.7);if(y<0)c.lerp(new THREE.Color('#7b78a6'),Math.min(1,-y*3));skyRGB.push(c.r,c.g,c.b);}
    skyGeo.setAttribute('color',new THREE.Float32BufferAttribute(skyRGB,3));const skyMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false,transparent:true}),sky=mesh(skyGeo,skyMat);sky.name='starsummit:sky';sky.userData={camThrough:true,prop:true};sky.castShadow=false;sky.receiveShadow=false;sky.renderOrder=-1000;
    const starP=[],starRGB=[];for(let j=0;j<680;j++){const y=.045+.95*(j+.5)/680,a=j*2.3999632297,r=Math.sqrt(1-y*y)*65;starP.push(Math.sin(a)*r,y*65,Math.cos(a)*r);const c=new THREE.Color(j%5===0?'#ffd9d6':j%3===0?'#c5d4ff':'#f4edff');starRGB.push(c.r,c.g,c.b);}
    const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starP,3));starGeo.setAttribute('color',new THREE.Float32BufferAttribute(starRGB,3));const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({size:2,sizeAttenuation:false,vertexColors:true,fog:false,transparent:true,opacity:.9,depthWrite:false}));stars.name='starsummit:stars';stars.userData={camThrough:true,prop:true};stars.renderOrder=-950;g.add(stars);
    const cloudMat=new THREE.MeshBasicMaterial({color:'#e1d4eb',fog:false,transparent:true,opacity:.92,depthWrite:false}),cloudPink=new THREE.MeshBasicMaterial({color:'#edcfdf',fog:false,transparent:true,opacity:.85,depthWrite:false});
    const seaGeo=new THREE.CircleGeometry(65,96);seaGeo.rotateX(-PI/2);const sea=mesh(seaGeo,cloudMat,0,-7,0);sea.userData.camThrough=true;sea.castShadow=false;sea.receiveShadow=false;
    for(let j=0;j<48;j++){const a=j*2.3999632297,r=13+36*Math.sqrt((j+.5)/48),o=ball(Math.sin(a)*r,-6+(j%4)*.17,Math.cos(a)*r,5+j%4,1.1+(j%3)*.25,3.8+j%3,j%3===0?cloudPink:cloudMat);o.userData.camThrough=true;o.castShadow=false;o.receiveShadow=false;}
    const moonMat=new THREE.MeshBasicMaterial({color:'#fff1d8',fog:false,depthWrite:false,transparent:true}),moon=ball(-32,22,-42,2,2,2,moonMat);moon.userData={camThrough:true,prop:true};moon.castShadow=false;moon.receiveShadow=false;moon.renderOrder=-940;
    spots.push({x:0,y:0,z:2.8,r:1.3,kind:'hook:starsummit',topic:'altar',label:'挑戰星環之頂'},{x:-6.2,y:0,z:5.15,r:.85,kind:'look',label:'看看雲海',name:'雲下的潮汐小島',lines:['雲縫裡的小島，仍亮著熟悉的燈。','走得再高，回家的方向都在。']},{x:5.6,y:0,z:-5.4,r:.8,kind:'look',label:'看看星空',name:'安靜的遠星',lines:['星星沒有催促，只在遠方等你。','把勇氣放在心上，就能再走一步。']},{x:-5.8,y:0,z:-5.1,r:.8,kind:'look',label:'看看月光',name:'白石上的月色',lines:['月光停在欄邊，像一封無字的信。','今晚的努力，會被溫柔記住。']});
    Object.assign(g.userData,{spawn:[0,0,7,PI],exit:[0,9.2,.9],host:[2.6,0,5.6,PI],spots,lights,indoor:true,bg:'#1b1d3a',bounce:1.6,sun:[-.4,.7,-.5],cols});

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
