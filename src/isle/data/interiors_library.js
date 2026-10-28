/* 潮汐小島 · 圖書館的整棟室內（v8.1）：TA.ISLE.INTERIORS['library'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['library'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '潮汐圖書館・書海與航圖';
    const C = { cream:'#fff1dc', stone:'#eee1c9', wood:'#d9ad73', dark:'#a67a4e', lilac:'#b69acb', slate:'#7b89aa', gold:'#e8c48b', paper:'#fff0d4', pink:'#f3bdd2', blue:'#6a8fd0', leaf:'#92ad8c', red:'#c96c78', sky:'#9cbede', yellow:'#e5cd91', mint:'#a7cdbb', peach:'#e6ad93', sand:'#c3aa84', ink:'#3a3040' };
    const kinds = { cream:'plaster', stone:'stone', wood:'wood', dark:'wood', lilac:'fabric', slate:'plaster', gold:'metal', paper:'paper', pink:'fabric', blue:'paper', leaf:'foliage', red:'fabric', sky:'paper', yellow:'paper', mint:'paper', peach:'paper', sand:'paper', ink:'paper' }, M = {};
    Object.keys(C).forEach(k => { const kind=kinds[k]; M[k]=kit.mat(C[k],{roughness:kind==='metal'?.36:kind==='wood'?.76:.93,metalness:kind==='metal'?.65:0},kind); });
    const ceramic=kit.mat(C.cream,{roughness:.28},'ceramic'), cloth=kit.mat(C.slate,{},'fabric'), glass=kit.glass(), view=kit.view().clone(), lamp=kit.lamp('#ffd3a0'), shade=kit.shade(C.paper);
    // 窗景仍共用島上全景與時刻，夜間透射收成靛藍。
    const outdoor=kit.view();view.uniforms=outdoor.uniforms;if(view.fragmentShader)view.fragmentShader=view.fragmentShader.replace('rgb * 0.92', 'rgb * mix(vec3(0.92), vec3(0.18,0.24,0.48), uNight)');
    const bookM=['pink','sky','yellow','lilac','leaf','peach','blue','mint','red','sand'].map(k=>kit.mat(C[k],{roughness:.92},'paper'));
    const cols=[], batches=new Map(), unit=new THREE.BoxGeometry(1,1,1).toNonIndexed(), tmp=new THREE.Vector3(), norm=new THREE.Vector3(), mat4=new THREE.Matrix4(), quat=new THREE.Quaternion();
    function mesh(geo,m,x=0,y=0,z=0,solid=false,walk=false) { const o=new THREE.Mesh(geo,m); o.position.set(x,y,z);o.userData.solid=solid;o.userData.walk=walk;g.add(o);return o; }
    function box(x,y,z,w,h,d,m=M.wood,solid=false,walk=false,r=0) { return mesh(r?kit.rbox(w,h,d,r):new THREE.BoxGeometry(w,h,d),m,x,y,z,solid,walk); }
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1) { const o=mesh(new THREE.SphereGeometry(r,m===M.leaf?6:8,m===M.leaf?3:4),m,x,y,z);o.scale.set(sx,sy,sz);return o; }
    function beam(a,b,r,m=M.wood) { const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),o=mesh(new THREE.CylinderGeometry(r,r,A.distanceTo(B),m===M.leaf?3:4),m,...A.clone().add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());return o; }
    function at(x,z,u,d,a=0) { return [x+u*Math.cos(a)+d*Math.sin(a),z-u*Math.sin(a)+d*Math.cos(a)]; }
    function lb(x,z,u,y,d,w,h,dep,m,a=0,solid=false,r=0) { const p=at(x,z,u,d,a),o=box(p[0],y,p[1],w,h,dep,m,solid,false,r);o.rotation.y=a;return o; }
    function batch(x,y,z,w,h,d,m,a=0,tilt=0) {
      if(!batches.has(m))batches.set(m,{p:[],n:[],uv:[]});const b=batches.get(m),p=unit.attributes.position,n=unit.attributes.normal,uv=unit.attributes.uv;
      quat.setFromEuler(new THREE.Euler(0,a,tilt));mat4.compose(new THREE.Vector3(x,y,z),quat,new THREE.Vector3(w,h,d));
      for(let i=0;i<p.count;i++){tmp.fromBufferAttribute(p,i).applyMatrix4(mat4);norm.fromBufferAttribute(n,i).applyQuaternion(quat);b.p.push(...tmp.toArray());b.n.push(...norm.toArray());b.uv.push(uv.getX(i),uv.getY(i));}
    }
    function face(x,y,z,w,h,m,a=0){if(!batches.has(m))batches.set(m,{p:[],n:[],uv:[]});const b=batches.get(m);for(const [u,v] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,-.5],[.5,.5],[-.5,.5]]){const p=at(x,z,u*w,0,a);b.p.push(p[0],y+v*h,p[1]);b.n.push(Math.sin(a),0,Math.cos(a));b.uv.push(u+.5,v+.5);}}
    function flush(){batches.forEach((b,m)=>{const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));q.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));q.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));mesh(q,m);});}
    function polygon(points,depth,x,y,z,m,a=0) { const s=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));const o=mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:10}),m,x,y,z);o.rotation.y=a;return o; }
    function floor(x,z,w,d,y){box(x,y-.125,z,w,.25,d,M.wood,false,true);box(x,y-.265,z,w,.035,d,M.cream);for(let u=-w/2+.3;u<w/2;u+=.6){box(x+u,y+.002,z,.006,.004,d,M.dark);for(let v=-d/2+((Math.round(u*10)%3+3)%3)*1.2;v<d/2;v+=3.6)box(x+u+.30,y+.003,z+v,.58,.004,.006,M.dark);}}
    function arch(w,h){const s=new THREE.Shape(),r=w/2, spring=h-Math.sqrt(3)*r;s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,spring);s.absarc(-r,spring,2*r,0,Math.PI/3,false);s.absarc(r,spring,2*r,2*Math.PI/3,Math.PI,false);s.lineTo(-r,0);return s.getPoints(12).map(p=>[p.x,p.y]);}
    function wall(x,z,w,h,a,ops=[],bottom=0){
      const outline=h===13.32?[[-w/2,bottom],[w/2,bottom],[w/2,5.8],[0,h],[-w/2,5.8]]:[[-w/2,bottom],[w/2,bottom],[w/2,h],[-w/2,h]];const s=new THREE.Shape(outline.map(p=>new THREE.Vector2(...p)));
      ops.forEach(o=>s.holes.push(new THREE.Path(arch(o.w,o.h).map(p=>new THREE.Vector2(p[0]+o.u,p[1]+o.y)).reverse())));
      const o=mesh(new THREE.ExtrudeGeometry(s,{depth:.28,bevelEnabled:false,curveSegments:12}),M.cream,x,0,z);o.rotation.y=a;
      const door=ops.find(p=>p.door),runs=door?[[-w/2,door.u-door.w/2],[door.u+door.w/2,w/2]]:[[-w/2,w/2]];for(const [lo,hi]of runs){lb(x,z,(lo+hi)/2,bottom+.31,-.025,hi-lo,.62,.10,M.stone,a);lb(x,z,(lo+hi)/2,bottom+.68,-.06,hi-lo,.07,.12,M.wood,a);}lb(x,z,0,5.45,-.04,w,.12,.10,M.lilac,a);
      ops.forEach(p=>windowAt(x,z,p.u,p.y,p.w,p.h,a,p.internal,p.door));
    }
    function windowAt(x,z,u,y,w,h,a,internal=false,door=false){
      const points=arch(w,h),edges=points.map(p=>{const q=at(x,z,u+p[0],-.06,a);return[q[0],y+p[1],q[1]];});for(let j=1;j<edges.length;j++)beam(edges[j-1],edges[j],door?.12:.135,M.stone);
      if(door){for(const sd of [-1,1]){lb(x,z,u+sd*.98,1.05,-.16,.28,2.1,.15,M.dark,a);lb(x,z,u+sd*.96,1.10,-.26,.035,.28,.04,M.gold,a);}return;}
      if(internal){const gp=at(x,z,u,.12,a);polygon(points,.012,gp[0],y,gp[1],glass,a);}
      if(!internal){const p=at(x,z,u,.45,a),o=mesh(new THREE.ShapeGeometry(new THREE.Shape(points.map(q=>new THREE.Vector2(q[0]*1.04,(q[1]-h/2)*1.04)))),view,p[0],y+h/2,p[1]);o.rotation.y=a+Math.PI;}
      lb(x,z,u,y+h*.46,-.105,w,.065,.07,M.gold,a);lb(x,z,u,y+h*.5,-.10,.055,h,.07,M.gold,a);
      const cy=y+h*.70,ds=w*.24;[[0,ds],[ds,0],[0,-ds],[-ds,0],[0,ds]].slice(1).forEach((p,j)=>{const prev=[[0,ds],[ds,0],[0,-ds],[-ds,0]][j],A=at(x,z,u+prev[0],-.13,a),B=at(x,z,u+p[0],-.13,a);beam([A[0],cy+prev[1],A[1]],[B[0],cy+p[1],B[1]],.033,M.gold);});
      lb(x,z,u,y-.07,-.10,w+.44,.18,.64,M.stone,a);for(const sd of [-1,1])lb(x,z,u+sd*(w/2+.13),y+h*.43,-.035,.16,h*.86,.14,M.slate,a);
    }
    function rail(a,b,y=4){const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),n=Math.ceil(L/.3);beam([a[0],y+1.08,a[1]],[b[0],y+1.08,b[1]],.065);beam([a[0],y+.13,a[1]],[b[0],y+.13,b[1]],.06);for(let j=0;j<=n;j++){const t=j/n,x=a[0]+dx*t,z=a[1]+dz*t;beam([x,y+.14,z],[x,y+1.05,z],j===0||j===n?.065:.035);if(j%2===0)ball(x,y+.62,z,.065,M.wood,.75,1.6,.75);}cols.push([Math.min(a[0],b[0])-.05,y,Math.min(a[1],b[1])-.05,Math.max(a[0],b[0])+.05,y+1.15,Math.max(a[1],b[1])+.05]);}
    function books(x,y,z,w,a=0,color=-1){const n=Math.floor(w/.14),s0=Math.floor(Math.abs(Math.sin(x*12.99+y*78.23+z*37.72))*9973);let set=0,setH=0,setM=null;for(let j=0;j<n;j++){const k=j+s0,r=((k*2654435761)>>>0)%1000/1000;if(set<=0&&color<0&&r<.12){set=3;setH=.31+(k%4)*.04;setM=bookM[(k*7)%10];}const inSet=set>0;set--;const h=inSet?setH:.29+((k*7)%6)*.028+r*.02,bw=.088+((k*3)%4)*.01,p=at(x,z,-w/2+.08+j*w/n,0,a),m=inSet?setM:bookM[color<0?(k*3+(k>>2))%10:color];batch(p[0],y+h/2,p[1],bw,h,.25,m,a,!inSet&&r>.93?.08+r*.05:0);const t=at(p[0],p[1],0,.133,a);face(t[0],y+h*(.22+(k%3)*.04),t[1],bw*.58,.022,M.gold,a);face(t[0],y+h*.79,t[1],bw*.58,.012,M.paper,a);}}   // v8.7 每一格書架依位置換起點（固定，不會每次進門都變），偶爾一套三本同色同高、標籤高低不一（以前每格同一個 %3／%5／%10 週期，書牆像重複的花紋）
    function shelf(x,y,z,w,h,a=0,color=-1){const corners=[at(x,z,-w/2,-.25,a),at(x,z,w/2,-.25,a),at(x,z,-w/2,.28,a),at(x,z,w/2,.28,a)];cols.push([Math.min(...corners.map(p=>p[0])),y,Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),y+h,Math.max(...corners.map(p=>p[1]))]);lb(x,z,0,y+h/2,-.19,w,h,.10,M.dark,a);for(const sd of [-1,1])lb(x,z,sd*(w/2-.04),y+h/2,.015,.08,h,.48,M.wood,a);lb(x,z,0,y+.16,.02,w,.30,.48,M.wood,a);const n=Math.floor((h-.36)/.55);for(let j=0;j<=n;j++){const yy=y+.36+j*.55;lb(x,z,0,yy,.015,w,.07,.52,M.wood,a);if(j<n){const p=at(x,z,0,.03,a);books(p[0],yy+.04,p[1],w-.16,a,color);}}lb(x,z,0,y+h+.025,.015,w+.08,.09,.55,M.wood,a);}
    function stack(x,y,z,n=3,a=0){for(let j=0;j<n;j++){const o=box(x,y+.045+j*.078,z,.36+j%2*.05,.065,.26,bookM[j%10],false,false,.012);o.rotation.y=a+j*.05;box(x,y+.049+j*.078,z+.137,.31,.032,.008,M.paper);}}
    function openBook(x,y,z,s=.6,a=0,tilt=0){const start=g.children.length;box(x,y,z,s,.035,s*.62,M.red);for(const sd of [-1,1]){const o=box(x+sd*s*.245,y+.04,z,s*.47,.035,s*.59,M.paper);o.rotation.z=sd*-.09;const p=sign(29,x+sd*s*.245,y+.068,z,s*.41,s*.52);p.rotation.x=-Math.PI/2;}box(x+.025,y+.075,z+s*.15,.035,.012,s*.64,M.red);if(a||tilt){const q=new THREE.Group();g.add(q);for(const o of g.children.slice(start,-1)){g.remove(o);q.add(o);o.position.sub(new THREE.Vector3(x,y,z));}q.position.set(x,y,z);q.rotation.set(tilt,a,0);}}
    function plant(x,y,z,s=1){mesh(new THREE.CylinderGeometry(.22*s,.16*s,.36*s,9),ceramic,x,y+.18*s,z,true);for(let j=0;j<7;j++){const a=j*2.4,h=(.55+j%3*.12)*s,dx=Math.sin(a)*.29*s,dz=Math.cos(a)*.24*s;beam([x,y+.3*s,z],[x+dx,y+h,z+dz],.017*s,M.leaf);const o=ball(x+dx,y+h,z+dz,.20*s,M.leaf,1.35,.35,.72);o.rotation.z=Math.sin(a)*.5;}}
    function mug(x,y,z){mesh(new THREE.CylinderGeometry(.085,.07,.15,9),ceramic,x,y+.075,z);const o=mesh(new THREE.TorusGeometry(.055,.017,5,10),M.gold,x+.09,y+.08,z);o.rotation.y=Math.PI/2;}
    function chair(x,y,z,a=0,m=M.lilac,w=.72){lb(x,z,0,y+.42,0,w,.13,.70,M.wood,a,true,.04);lb(x,z,0,y+.53,0,w-.07,.14,.64,m,a,false,.07);lb(x,z,0,y+.93,.28,w,.77,.14,m,a,true,.07);for(const u of [-w*.36,w*.36])for(const d of [-.24,.24])lb(x,z,u,y+.2,d,.065,.4,.065,M.wood,a);}
    function table(x,y,z,w,d,h=.72){box(x,y+h-.05,z,w,.10,d,M.wood,true,false,.06);for(const u of [-w/2+.15,w/2-.15])for(const v of [-d/2+.15,d/2-.15])box(x+u,y+(h-.1)/2,z+v,.13,h-.1,.13,M.wood);box(x,y+h-.20,z,w-.24,.18,d-.24,M.wood);}
    function roundTable(x,y,z,r=.48,h=.62){mesh(new THREE.CylinderGeometry(r,r,.09,20),M.wood,x,y+h-.045,z,true);mesh(new THREE.CylinderGeometry(.08,.13,h-.1,8),M.wood,x,y+(h-.1)/2,z);mesh(new THREE.CylinderGeometry(r*.65,r*.7,.08,12),M.wood,x,y+.04,z);}
    function flat(points,y,m){if(!batches.has(m))batches.set(m,{p:[],n:[],uv:[]});const b=batches.get(m),area=points.reduce((v,p,j)=>{const q=points[(j+1)%points.length];return v+p[0]*q[1]-q[0]*p[1];},0);for(let j=1;j<points.length-1;j++)for(const p of area>0?[points[0],points[j+1],points[j]]:[points[0],points[j],points[j+1]]){b.p.push(p[0],y,p[1]);b.n.push(0,1,0);b.uv.push(p[0],p[1]);}}
    function rug(x,y,z,w,d){
      box(x,y+.018,z,w,.025,d,M.lilac,false,false,.04);
      const frame=(inset,width,m)=>{const a=w/2-inset,b=d/2-inset;for(const v of [-b,b])flat([[x-a,z+v-width/2],[x+a,z+v-width/2],[x+a,z+v+width/2],[x-a,z+v+width/2]],y+.039,m);for(const u of [-a,a])flat([[x+u-width/2,z-b],[x+u+width/2,z-b],[x+u+width/2,z+b],[x+u-width/2,z+b]],y+.039,m);};
      frame(.07,.035,rugCream);frame(.23,.20,M.pink);frame(.39,.035,rugCream);
      const flower=(u,v,r,m)=>{for(let j=0;j<4;j++){const a=j*Math.PI/2,dx=Math.cos(a)*r,dz=Math.sin(a)*r;flat([[u,v],[u+dx-dz*.35,v+dz+dx*.35],[u+dx*1.5,v+dz*1.5],[u+dx+dz*.35,v+dz-dx*.35]],y+.047,m);}};
      for(let u=-w/2+.55;u<w/2-.3;u+=.42)for(const sd of [-1,1])flower(x+u,z+sd*(d/2-.23),.075,M.lilac);
      for(let v=-d/2+.55;v<d/2-.3;v+=.42)for(const sd of [-1,1])flower(x+sd*(w/2-.23),z+v,.075,M.lilac);
      for(const u of [-w*.25,w*.25])for(const v of [-d*.25,d*.25])flower(x+u,z+v,.22,M.pink);
      for(let j=0;j<8;j++){const a=j*Math.PI/4;flower(x+Math.sin(a)*w*.17,z+Math.cos(a)*d*.17,.15,M.pink);}
    }
    function deskLamp(x,lightY,z,baseY,metal=true){mesh(new THREE.CylinderGeometry(.13,.16,.045,12),M.gold,x,baseY+.025,z);beam([x,baseY+.04,z],[x,lightY+.08,z],.022,M.gold);const o=mesh(metal?new THREE.SphereGeometry(.19,16,7,0,Math.PI*2,0,Math.PI/2):new THREE.CylinderGeometry(.095,.18,.22,12,1,true),metal?M.gold:shade,x,lightY+.06,z);mesh(new THREE.CylinderGeometry(.14,.14,.018,14),lamp,x,lightY,z);ball(x,lightY+(metal?.26:.2),z,.035,M.gold);return o;}   // v8.7 布罩燈的頂珠貼在罩頂（以前懸空約 5.5cm）
    function lantern(x,y,z,a=0){const p=at(x,z,0,-.18,a);beam([x,y+.14,z],[p[0],y+.14,p[1]],.025,M.gold);box(p[0],y,p[1],.17,.25,.17,shade);mesh(new THREE.ConeGeometry(.16,.14,4),M.gold,p[0],y+.20,p[1]).rotation.y=Math.PI/4;for(const u of [-.09,.09])for(const v of [-.09,.09])beam([p[0]+u,y-.14,p[1]+v],[p[0]+u,y+.14,p[1]+v],.013,M.gold);}
    function picture(x,y,z,a=0){lb(x,z,0,y,0,.65,.9,.07,M.wood,a);lb(x,z,0,y,-.045,.54,.78,.014,M.paper,a);for(let j=0;j<4;j++){const p=at(x,z,(j%2?1:-1)*.12,-.058,a);ball(p[0],y-.25+j*.16,p[1],.085,M.leaf,1.1,.5,.14);}}
    function emblem(x,y,z,s=1,a=0){
      const p=at(x,z,0,-.055,a);for(const sd of [-1,1]){polygon([[0,-.11],[sd*.23,-.18],[sd*.23,.21],[sd*.11,.25],[0,.20]].map(q=>[q[0]*s,q[1]*s]),.025,p[0],y,p[1],M.paper,a);for(let j=0;j<3;j++){const A=at(x,z,sd*.04*s,-.08,a),B=at(x,z,sd*.18*s,-.08,a);beam([A[0],y+(.13-j*.075)*s,A[1]],[B[0],y+(.15-j*.075)*s,B[1]],.008*s,M.gold);}}
      lb(x,z,0,y, -.09,.025*s,.38*s,.03,M.gold,a);
    }
    // 厚牆、真正的尖拱開口，以及四角方墩。
    floor(0,0,18,16,0);
    const front=[{u:-6.31,y:1.1,w:1.45,h:4.25},{u:6.31,y:1.1,w:1.45,h:4.25},{u:0,y:0,w:1.55,h:2.10,door:true}];
    wall(0,8,18,5.8,0,front);wall(0,-8,18,13.32,Math.PI,[{u:4.8,y:1.1,w:2.3,h:8.5},{u:-3.61,y:1.1,w:2.3,h:8.5}]);
    const doorCam=mesh(new THREE.PlaneGeometry(1.55,2.1),kit.mat(C.dark,{visible:false,side:THREE.DoubleSide},'wood'),0,1.05,7.98);doorCam.userData.prop=true;
    wall(-9,0,16,5.8,-Math.PI/2,[{u:-4.35,y:.85,w:2.65,h:4.6},{u:2.5,y:.85,w:2.65,h:4.6}]);
    wall(9,-5.4,5.2,5.8,Math.PI/2,[{u:-1.05,y:.85,w:2.65,h:4.6,internal:true}]);wall(9,3.6,8.8,5.8,Math.PI/2,[{u:1.1,y:.85,w:2.65,h:4.6}]);
    box(9,3.88,-1.8,.28,.24,2,M.stone);box(9,8.0,-1.8,.28,.3,2,M.stone);
    cols.push([-9.28,0,-8.28,-9,5.8,8.28],[-9.28,0,-8.28,9.28,5.8,-8],[-9,0,8,-.775,5.8,8.28],[.775,0,8,9,5.8,8.28],[9,0,-8,9.28,8,-2.8],[9,0,-.8,9.28,8,8]);
    for(const x of [-8.65,8.65])for(const z of [-7.65,7.65]){box(x,2.9,z,.45,5.8,.45,M.stone,true);for(let y=.5;y<5.7;y+=.65)box(x,y,z,.48,.055,.48,M.cream);box(x,.16,z,.65,.32,.65,M.stone);box(x,5.65,z,.68,.25,.68,M.stone);}
    for(const z of [8])polygon([[-9,5.8],[9,5.8],[0,13.32]],.28,0,0,z,M.cream,z<0?Math.PI:0);
    // 斜頂在塔身相交處收邊，橋上不留穿入的屋殼。
    const rp=[],roofY=x=>13.32-.8355*Math.abs(x);function tri(a,b,c){rp.push(...a,...b,...c);}
    for(const side of [-1,1])for(let z=-8;z<8-.01;z+=.20){const z1=Math.min(8,z+.20),edge=v=>side<0?9:Math.min(9,Math.abs(v+4.22)<4.5?9.85-Math.sqrt(20.25-(v+4.22)**2):9),a=edge(z),b=edge(z1);tri([0,13.32,z],[side*a,roofY(a),z],[side*b,roofY(b),z1]);tri([0,13.32,z],[side*b,roofY(b),z1],[0,13.32,z1]);}
    const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));rg.computeVertexNormals();const roofmat=kit.mat(C.cream,{side:THREE.DoubleSide},'plaster');mesh(rg,roofmat);
    beam([0,13.18,-8],[0,13.18,8],.14);for(let z=-7.8;z<8;z+=1.6){beam([-9,5.72,z],[0,13.2,z],.20);const e=Math.abs(z+4.22)<4.5?Math.min(9,9.85-Math.sqrt(20.25-(z+4.22)**2)):9;beam([0,13.2,z],[e,roofY(e)-.12,z],.20);if(z>-.7||z<-7.5){beam([-8.8,5.72,z],[8.8,5.72,z],.15);beam([-4,5.72,z],[0,9.4,z],.07);beam([4,5.72,z],[0,9.4,z],.07);}}
    // 後側夾層、二十級踏階與連續的隱藏坡道。
    floor(-5.7,-5.7,2.2,2.6,4);floor(1.1,-5.2,11.4,3.6,4);floor(5.9,-3.1,1.8,2.6,4);floor(7.5,-1.8,5,2,4);
    box(0,3.51,-3.62,13.6,.34,.30,M.wood);box(0,4.03,-3.38,13.6,.12,.13,M.wood);
    rail([-6.8,-7],[6.8,-7]);rail([-6.8,-7],[-6.8,-4.4]);rail([-4.6,-4.4],[-4.6,-3.4]);rail([-4.6,-3.4],[5,-3.4]);rail([5,-3.4],[5,-.8]);rail([6.8,-7],[6.8,-2.8]);rail([6.8,-2.8],[9.8,-2.8]);rail([5,-.8],[9.8,-.8]);
    for(let j=0;j<20;j++){const h=(j+1)*.2,z=2-(j+.5)*.32;box(-5.7,h-.07,z,2.2,.14,.32,M.wood);box(-5.7,h-.17,z-.135,2.2,.20,.05,M.dark);}
    const slope=mesh(new THREE.PlaneGeometry(2.2,Math.hypot(6.4,4)),M.wood,-5.7,2,-1.2,false,true);slope.rotation.x=-Math.PI/2+Math.atan2(4,6.4);slope.visible=false;
    for(const x of [-6.82,-4.58]){beam([x,.95,2.10],[x,4.95,-4.30],.065);for(let j=0;j<=20;j+=2){const z=2-j*.32,y=j*.2;beam([x,y,z],[x,y+1.02,z],.035);}cols.push([x-.04,0,-.1,x+.04,1.7,2.05]);for(let j=0;j<20;j++)cols.push([x-.045,j*.2,2-(j+1)*.32,x+.045,j*.2+1.1,2-j*.32]);}
    // 圓塔外弧與錐頂，左側接合保留主廳內牆與玻璃凹龕。
    for(const y of [0,4]){const geo=new THREE.CylinderGeometry(4.5,4.5,.25,24);mesh(geo,M.wood,9.85,y-.125,-4.22,false,true);}
    for(let j=12;j<24;j++){const a=j*Math.PI/12,b=(j+1)*Math.PI/12,A=[9.85+Math.sin(a)*4.5,-4.22+Math.cos(a)*4.5],B=[9.85+Math.sin(b)*4.5,-4.22+Math.cos(b)*4.5],x=(A[0]+B[0])/2,z=(A[1]+B[1])/2,joined=(x<=6.8&&z>=-7&&z<=-3.4)||(x>=5&&x<=6.8&&z>=-4.4&&z<=-.8)||(x>=5&&x<=10&&z>=-2.8&&z<=-.8);if(!joined)rail(A,B);}
    for(let j=0;j<24;j++){const a=(j+.5)*Math.PI/12,r=4.5*Math.cos(Math.PI/24),x=9.85+Math.sin(a)*r,z=-4.22+Math.cos(a)*r,w=2*4.5*Math.sin(Math.PI/24),op=[];if(x<8.95){const l=at(x,z,-w/2,0,a),r=at(x,z,w/2,0,a),y0=Math.min(8.6,roofY(l[0])-.06),y1=Math.min(8.6,roofY(r[0])-.06);if(y0<8.6||y1<8.6)polygon([[-w/2,y0],[w/2,y1],[w/2,8.64],[-w/2,8.64]],.28,x,0,z,roofmat,a);continue;}
      if(j===0||j===23)continue;
      if(j===5||j===6)continue;
      wall(x,z,w+.02,8.6,a,op);const dx=Math.sin(a)*.14,dz=Math.cos(a)*.14;cols.push([x-w*Math.abs(Math.cos(a))/2-.12,0,z-w*Math.abs(Math.sin(a))/2-.12,x+w*Math.abs(Math.cos(a))/2+.12,8.6,z+w*Math.abs(Math.sin(a))/2+.12]);
    }
    wall(9.85,.20,2.36,8.6,0,[{u:0,y:5.0,w:1.6,h:2.9}]);cols.push([8.67,0,.20,11.03,8.6,.48]);
    wall(14.25,-4.1,2.36,8.6,Math.PI/2,[{u:0,y:.85,w:1.6,h:2.65}]);cols.push([14.25,0,-5.28,14.53,8.6,-2.92]);
    for(const x of [8.67,11.03])box(x,4.3,.11,.12,8.6,.28,M.stone);for(const z of [-5.28,-2.92])box(14.17,4.3,z,.28,8.6,.12,M.stone);
    for(const x of [-6,-3,3,6]){const z0=x>0?-1: -8;beam([x,roofY(x)-.22,z0],[x,roofY(x)-.22,8],.14);}
    const cone=mesh(new THREE.ConeGeometry(4.5,6.5,24,1,true),roofmat,9.85,11.85,-4.22);for(let j=0;j<24;j++){const a=j*Math.PI/12,b=(j+1)*Math.PI/12;beam([9.85+Math.sin(a)*4.46,8.55,-4.22+Math.cos(a)*4.46],[9.85+Math.sin(b)*4.46,8.55,-4.22+Math.cos(b)*4.46],.10);}for(let j=0;j<8;j++){const a=j*Math.PI/4;beam([9.85+Math.sin(a)*4.46,8.55,-4.22+Math.cos(a)*4.46],[9.85,15.05,-4.22],.16);}
    // 十科名牌與其他文字共用一張圖集、同一個紙材質。
    const rugCream=kit.mat(C.paper,{},'fabric'),bannerCloth=kit.mat(C.slate,{},'fabric');
    const cv=document.createElement('canvas');cv.width=2048;cv.height=1280;const ctx=cv.getContext('2d'),labels=['國文','英文','數學','歷史','地理','公民','物理','化學','生物','地科','A','B','C','D','E','F','R','E','A','D','B','O','O','K','潮汐圖書館','借還書','珍本・潮汐航海圖集','單字卡片','十科筆記','閱讀是一場航行','館史・潮聲與書頁','WORDS','P','A','G','E','錯題本','READ・PAGE・BOOK'];
    ctx.fillStyle=C.paper;ctx.fillRect(0,0,2048,1280);ctx.textAlign='center';ctx.textBaseline='middle';labels.forEach((s,i)=>{const x=i%8*256,y=Math.floor(i/8)*256;ctx.strokeStyle=C.gold;ctx.lineWidth=5;ctx.strokeRect(x+8,y+8,240,240);ctx.fillStyle=C.ink;ctx.font=(s.length>6?'bold 32px ':s.length>3?'bold 64px ':'bold 120px ')+'"Microsoft JhengHei",sans-serif';ctx.fillText(s,x+128,y+128,234);});
    ctx.save();ctx.translate(1536,768);ctx.fillStyle=C.sky;ctx.fillRect(16,16,224,224);ctx.fillStyle=C.leaf;ctx.beginPath();ctx.moveTo(58,60);[[130,36],[190,76],[168,120],[204,173],[134,207],[82,170],[43,116]].forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fill();ctx.strokeStyle=C.paper;ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle=C.gold;ctx.setLineDash([9,6]);ctx.beginPath();ctx.moveTo(28,196);ctx.bezierCurveTo(78,85,191,234,217,54);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=C.ink;ctx.font='bold 23px "Microsoft JhengHei",sans-serif';ctx.fillText('潮汐島航線',128,226);ctx.restore();
    ctx.save();ctx.translate(1280,768);ctx.fillStyle=C.paper;ctx.fillRect(0,0,256,256);ctx.fillStyle=C.ink;ctx.font='22px serif';ctx.fillText('NOTES',128,26);ctx.strokeStyle=C.dark;ctx.lineWidth=2;for(let j=0;j<11;j++){ctx.beginPath();ctx.moveTo(20,54+j*17);ctx.lineTo(j%4===3?185:236,54+j*17);ctx.stroke();}ctx.restore();
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;const labelM=kit.mat(C.paper,{map:tex,roughness:.92},'paper');
    function sign(i,x,y,z,w=.8,h=.26,a=0){const q=new THREE.PlaneGeometry(w,h),uv=q.attributes.uv,u=i%8/8,v=1-Math.floor(i/8)/5;for(let j=0;j<uv.count;j++)uv.setXY(j,u+uv.getX(j)/8,v-.2+uv.getY(j)/5);const o=mesh(q,labelM,x,y,z);o.rotation.y=a;return o;}
    for(let i=0;i<10;i++){const x=-5.04+1.12*i;shelf(x,0,-5.8,1.12,2.6,0,i);box(x,2.26,-5.476,.99,.36,.07,M.dark);sign(i,x,2.26,-5.432,.9,.29);mesh(new THREE.CylinderGeometry(.075,.075,.025,10),lamp,x,2.53,-5.47);}
    box(0,2.62,-5.5,11.25,.10,.36,M.wood);
    // 主桌、六張軟椅與手邊的書頁。
    rug(0,0,.5,5.8,6);table(0,0,.3,3.6,4);for(const x of [-2.2,2.2])for(const z of [-.8,.5,1.8])chair(x,0,z,x<0?-Math.PI/2:Math.PI/2,z===.5?M.pink:M.lilac,.65);
    for(const x of [-.85,.85])deskLamp(x,1.1,.3,.72);for(const p of [[-.65,-.8],[.65,1.5],[.65,-.95]])openBook(p[0],.76,p[1],.62);stack(-.6,.75,1.4,3);mug(.2,.74,.85);box(-.15,.755,-.4,.42,.015,.54,M.paper);beam([-.1,.78,-.55],[.18,.78,-.22],.012,M.gold);plant(.1,.75,-1.1,.5);
    for(const x of [-1.05,1.05]){beam([x,5.70,.5],[x,roofY(x)-.1,.5],.022,M.gold);mesh(new THREE.SphereGeometry(.46,24,12),shade,x,5.3,.5).scale.set(1,.85,1);for(let j=0;j<12;j++){const a=j*Math.PI/6,pts=[];for(let k=0;k<=8;k++){const p=k*Math.PI/8;pts.push([x+Math.cos(a)*Math.sin(p)*.467,5.3+Math.cos(p)*.395,.5+Math.sin(a)*Math.sin(p)*.467]);}for(let k=1;k<pts.length;k++)beam(pts[k-1],pts[k],.008,M.gold);}ball(x,4.89,.5,.065,M.gold);}
    // 入口借還區：書棲的位置留在櫃台外側。
    box(-4,.42,4.7,3.2,.84,.9,M.wood,true,false,.10);box(-4,.44,5.159,2.98,.62,.035,M.slate,false,false,.04);box(-4,.88,4.7,3.38,.13,1.04,M.wood,false,false,.10);emblem(-4,.46,5.19,1.3);for(const x of [-5.35,-2.65])box(x,.44,5.183,.025,.58,.015,M.gold);deskLamp(-4,1.1,4.7,.95,false);openBook(-4.85,.96,4.8,.6);stack(-3.05,.95,4.6,3);box(-3.6,.97,4.92,.25,.04,.2,M.dark);box(-3.6,1.03,4.92,.07,.10,.07,M.gold);sign(25,-5.1,1.15,4.42,.65,.23);
    function cart(x,y,z){box(x,y+.36,z,.72,.66,.46,M.wood,true,false,.04);for(const yy of [.15,.65])box(x,y+yy,z,.82,.06,.52,M.wood);books(x,y+.19,z,.66);stack(x,y+.69,z,3);for(const u of [-.3,.3])for(const d of [-.17,.17])ball(x+u,y+.08,z+d,.065,M.ink);beam([x-.39,y+.68,z-.2],[x-.39,y+.95,z-.2],.025,M.gold);}
    cart(-2,0,6.9);cart(7.5,0,4.85);cart(3.2,0,-6.9);
    // 卡片目錄櫃，半開的一格露出索引卡。
    box(-7.8,.74,3.9,1.7,1.48,.7,M.dark,true);box(-7.8,1.54,3.9,1.82,.10,.8,M.wood);for(let row=0;row<6;row++)for(let col=0;col<6;col++){const x=-8.49+col*.277,y=.18+row*.215,open=row===2&&col===3,z=4.27+(open?.14:0);box(x,y,z,.253,.19,.04,M.wood,false,false,.012);box(x,y,z+.025,.10,.055,.015,M.paper);ball(x,y-.047,z+.04,.025,M.gold,1.4,.65,.7);if(open){box(x,y+.03,z-.05,.23,.06,.17,M.dark);for(let k=0;k<4;k++)box(x,y+.08,z-.08+k*.03,.18,.11,.012,M.paper);}}
    for(let i=0;i<6;i++)sign(10+i,-8.49+i*.277,1.41,4.316,.23,.17);plant(-8.3,1.60,3.85,.5);box(-7.22,1.68,3.9,.14,.2,.14,ceramic);for(let i=0;i<5;i++)beam([-7.28+i*.025,1.68,3.9],[-7.26+i*.025,1.98+(i%2)*.06,3.9],.008,bookM[i]);
    // 紅書籤講台與木框拼字板。
    box(5.4,.48,-2.2,1.35,.96,.82,M.wood,true,false,.05);box(5.4,.50,-1.77,1.12,.66,.035,M.dark);books(5.4,.22,-1.71,1.0);const top=box(5.4,1.05,-2.2,1.5,.09,1,M.wood);top.rotation.x=Math.PI/9;openBook(5.4,1.12,-2.2,.95,0,Math.PI/9);box(5.42,.85,-1.66,.13,.62,.025,M.red);box(5.75,1.17,-2,.18,.015,.18,bookM[2]);mesh(new THREE.CylinderGeometry(.18,.14,.35,10,1,true),M.dark,6.55,.175,-2.5);plant(4.23,0,-2.65,.7);
    const board=box(8.5,1.45,0,.16,1.8,2.4,M.wood,true,false,.05);box(8.4,1.34,0,.025,1.94,2.18,M.dark);for(let j=0;j<7;j++)box(8.378,1.45,-1.02+j*.34,.014,1.57,.012,M.wood);for(let j=0;j<5;j++)box(8.378,.74+j*.35,0,.014,.012,2.15,M.wood);
    [[16,-.68,2.15],[17,-.34,2.15],[18,0,2.15],[19,.34,2.15],[32,0,1.81],[33,0,1.47],[34,0,1.13],[35,0,.79],[20,-.68,.45],[21,-.34,.45],[22,0,.45],[23,.34,.45]].forEach(([i,z,y])=>{box(8.34,y,z,.05,.29,.29,M.paper);sign(i,8.309,y,z,.25,.25,-Math.PI/2);});box(8.26,.24,0,.50,.10,2.5,M.wood);stack(8.18,.63,-.78,2);box(8.03,.73,.7,.34,.22,.35,M.wood);plant(8.05,0,1.55,.8);
    // 窗座、畫框與書徽布旗。
    box(-6.5,.23,7.3,2.4,.46,.8,M.wood,true,false,.05);box(-6.5,.50,7.3,2.25,.14,.74,M.pink,false,false,.07);box(-7.2,.74,7.49,.48,.45,.15,M.lilac,false,false,.06);box(-6.6,.60,7.22,.5,.08,.65,cloth,false,false,.04);stack(-5.7,.60,7.3,2);mug(-5.5,.59,7.13);
    for(const x of [-8.7,8.7])for(const z of [-.4,5.8]){picture(x,2.6,z,x<0?Math.PI/2:-Math.PI/2);lantern(x,3.3,z,x<0?-Math.PI/2:Math.PI/2);}
    for(const x of [-8.3,8.3]){box(x,3.45,6.5,.55,1.3,.025,M.lilac);emblem(x,3.5,6.47,1.1,Math.PI);beam([x-.35,4.18,6.5],[x+.35,4.18,6.5],.022,M.gold);}
    sign(24,0,3.0,7.91,2.1,.38,Math.PI);emblem(0,4.1,7.9,2,Math.PI);for(const x of [-1.3,1.3])lantern(x,2,7.8,0);
    // 高書牆依斜頂收頭，後窗仍然完整敞開。
    for(let j=0;j<5;j++)shelf(-2.65+j*1.06,4,-7.64,1.06,Math.min(8.3,roofY(-2.65+j*1.06)-4.35));
    shelf(-7.2,4,-7.64,1.8,2.5);shelf(5.9,4,-7.64,1.6,2.35);
    for(const x of [-.88,-.32])beam([x,4,-6.66],[x,7.65,-7.3],.034);for(let j=0;j<11;j++)beam([-.88,4.2+j*.32,-6.70-j*.056],[-.32,4.2+j*.32,-6.70-j*.056],.025);beam([-3.2,7.8,-7.24],[2.1,7.8,-7.24],.025,M.gold);
    chair(-2,4,-6.45,0,M.lilac,1);box(-2,4.62,-6.10,.72,.08,.4,cloth,false,false,.04);roundTable(-3.25,4,-6.3,.4,.65);openBook(-3.25,4.68,-6.3,.5);box(-2,4.23,-5.96,.5,.32,.38,M.lilac,false,false,.06);plant(-4.0,4,-6.45,.7);stack(.7,4.04,-5.8,3);
    // 塔內上下閱讀角與弧牆書架。
    function arcShelves(y,h){for(let j=2;j<=10;j++){if(j===5||j===6)continue;const a=j*Math.PI/12,x=9.85+Math.sin(a)*4.02,z=-4.22+Math.cos(a)*4.02;shelf(x,y,z,.95,h,a+Math.PI);}}
    arcShelves(0,1.25);arcShelves(4,3.8);
    roundTable(11.6,0,-5.8,.95,.70);deskLamp(11.6,1.2,-5.8,.74);openBook(11.55,.74,-5.6,.65);mesh(new THREE.CylinderGeometry(.28,.36,.12,12),M.wood,12.1,.80,-6.2);beam([12.1,.84,-6.2],[12.1,1.15,-6.2],.045,M.gold);ball(12.1,1.35,-6.2,.37,bookM[1]);for(let i=0;i<6;i++){const a=i*1.1;ball(12.1+Math.sin(a)*.28,1.35+Math.cos(a)*.16,-5.98,.10,M.leaf,1.3,.7,.25);}const ring=mesh(new THREE.TorusGeometry(.43,.022,6,24),M.gold,12.1,1.35,-6.2);ring.rotation.z=.28;
    box(12.25,.26,-4.2,1.25,.52,.72,M.wood,true,false,.06);box(12.25,.57,-4.2,1.15,.14,.65,M.pink,false,false,.07);plant(13,0,-6.5,.9);rug(10.4,0,-4.15,3.4,3.3);
    box(12,4.425,-4,.8,.85,.7,M.wood,true,false,.05);const atlas=box(12,4.87,-4,.87,.06,.75,M.wood);atlas.rotation.x=-.20;openBook(12,4.93,-4,.7,0,-.20);const cover=polygon([[-.46,0],[.46,0],[.46,.29],[-.46,.29]],.82,12,4.96,-4.41,glass);cover.rotation.x=-.20;cover.userData.camThrough=true;for(const x of [11.54,12.46])beam([x,4.96,-3.59],[x,5.12,-4.41],.025,M.gold);sign(26,12,4.63,-3.63,.65,.16);box(12.48,4.93,-4.1,.15,.1,.16,M.dark);
    rug(10.3,4,-1.8,3.6,2.3);for(const x of [9.8,10.7])chair(x,4,-.55,0,M.pink,1);box(10.25,4.46,-.55,2.0,.12,.77,M.wood,false,false,.07);for(const x of [9.7,10.8]){box(x,4.78,-.49,.48,.46,.19,M.lilac,false,false,.08);box(x,4.65,-.60,.42,.09,.40,cloth,false,false,.04)};roundTable(11.6,4,-2.15,.45,.62);stack(11.6,4.65,-2.15,2);mug(11.9,4.64,-2.15);deskLamp(10.4,5.2,-2.3,4.0,false);plant(12.15,4,-1.45,.9);plant(10.1,4,-7.55,1.2);
    // 牆邊書車、閱讀小景與植物讓空間有被照顧的密度。
    shelf(-8.34,0,-.6,2.6,2.0,Math.PI/2);shelf(8.34,0,6.2,2.7,1.35,-Math.PI/2);shelf(-8.34,0,-6.8,1.5,2,Math.PI/2);
    for(const p of [[-8,0,6.1],[-7.8,0,-2.2],[7.9,0,-6.9],[3.7,0,6.5],[4,4,-6.5]])plant(...p,.85);
    roundTable(4.55,0,4.9,.62,.68);openBook(4.55,.72,4.9,.6);chair(5.65,0,4.9,Math.PI/2,M.pink);chair(4.55,0,6.15,0);mug(4.8,.72,4.7);rug(4.7,0,5.25,3.3,3.4);
    roundTable(-2.5,0,-2.7,.45,.65);stack(-2.5,.70,-2.7,4);plant(-3.4,0,-2.7,.8);
    // 書梯下收納、沿牆閱覽位與後廊的低書島。
    box(-5.7,1.1,-2.9,2.08,2.2,2.55,M.wood,true);for(let j=0;j<3;j++)books(-5.7,.3+j*.55,-1.60,1.85);
    for(const z of [-6.9,-.5,5.7]){if(z!==5.7)shelf(-8.1,0,z,1.3,1.25,Math.PI/2);}
    shelf(7.6,0,-6.7,2.3,2.1,Math.PI);shelf(7.8,0,-3.9,1.7,1.25,-Math.PI/2);
    table(3.75,0,7.3,2.3,.7,.9);stack(3.4,.94,7.3,4);plant(4.45,.94,7.3,.5);plant(1.95,0,7.10,1.1);
    table(-2,0,-3.15,1.8,.7,.75);openBook(-2,.79,-3.15,.55);stack(-2.5,.79,-3.15,3);
    table(3.1,0,-3.15,1.8,.7,.75);openBook(3.1,.79,-3.15,.55);plant(3.7,.79,-3.15,.45);
    table(5.1,0,1.8,1.4,.8,.72);stack(5.1,.76,1.8,3);chair(5.1,0,2.8,0,M.lilac);plant(6.4,0,2.6,.9);
    for(const x of [1.6,3.9]){shelf(x,4,-6.25,1.7,.95);openBook(x,5.02,-6.25,.6);}
    table(7.5,4,-5.6,1.4,.8,.7);openBook(7.5,4.74,-5.6,.55);plant(6.9,4,-6.5,.65);
    roundTable(10.1,0,-7.0,.65,.7);stack(10.1,.74,-7,3);chair(9,0,-7,Math.PI/2);plant(8.9,0,-5.5,.85);
    table(10.9,4,-6.6,1.75,.9,.72);openBook(10.9,4.76,-6.6,.65);chair(10.1,4,-5.9,Math.PI);plant(12.2,4,-6.6,.65);
    plant(1.7,0,4.8,1.0);plant(-1.65,0,4.8,.8);cart(1.8,0,-4.55);
    table(6.8,0,-5.1,2.2,1.35,.74);openBook(6.8,.78,-5.1,.6);chair(6.8,0,-6.2,Math.PI,M.pink,.9);plant(7.9,0,-5.3,.7);
    box(6.5,.28,7.3,2.4,.56,.8,M.wood,true,false,.06);box(6.5,.62,7.3,2.25,.16,.73,M.lilac,false,false,.07);stack(5.7,.73,7.3,3);plant(7.3,.73,7.3,.55);
    roundTable(-7.65,0,-4.6,.55,.67);openBook(-7.65,.71,-4.6,.55);chair(-7.7,0,-5.85,Math.PI,M.pink,.8);plant(-8,0,-3.55,.8);
    roundTable(11.2,0,-1.8,.7,.7);openBook(11.2,.74,-1.8,.65);chair(12.5,0,-1.8,Math.PI/2,M.lilac,.9);chair(11.6,0,-.4,0,M.pink,.9);plant(13,0,-2.7,.75);
    box(2.35,4.30,-3.8,3.6,.6,.52,M.wood,true,false,.05);stack(1.2,4.64,-3.8,3);plant(2.1,4.64,-3.8,.55);plant(3.5,4.64,-3.8,.55);
    shelf(13.4,4,-4.6,2.6,3.6,-Math.PI/2);table(7.5,4,-4.8,1.55,1.2,.68);stack(7.5,4.72,-4.8,4);chair(7.6,4,-6,Math.PI,M.lilac,.85);
    table(5,0,1.15,1.1,.6,.65);openBook(5,.69,1.15,.5);box(1.45,.26,-2.9,.65,.52,.65,M.wood,true,false,.04);stack(1.45,.56,-2.9,4);
    table(-7.35,0,-7.1,2,.8,.85);openBook(-7.35,.89,-7.1,.7);plant(-6.9,.89,-7.1,.6);shelf(-1.7,0,7.55,.85,1.25,Math.PI);plant(-7.35,0,1.15,1.5);plant(7.8,4,-3.65,1.1);
    box(-5.1,1.15,4.40,.69,.29,.035,M.wood);beam([-5.1,.94,4.4],[-5.1,1.08,4.4],.015,M.gold);box(-8.84,2.2,4.8,.05,.45,1.05,M.wood);sign(27,-8.8,2.2,4.8,.98,.38,Math.PI/2);sign(28,3.9,3.51,-3.44,.9,.2);
    for(let j=0;j<4;j++)box(1.8,.83+j*.035,-4.55+j*.035,.30,.17,.012,M.paper);beam([5.85,1.18,-2.0],[5.85,1.28,-2.45],.012,M.gold);box(5.1,1.17,-2.14,.15,.012,.17,bookM[7]);box(7.55,.29,2.0,.6,.32,.6,M.wood,false,false,.05);stack(7.55,.47,2,2);
    for(const p of [[12,5.02,-4,.65,.36,-Math.PI/2-.2],[11.55,.82,-5.6,.60,.35,-Math.PI/2]]){const o=sign(30,p[0],p[1],p[2],p[3],p[4]);o.rotation.x=p[5];}
    for(let j=0;j<6;j++){ball(4.18+Math.sin(j)*.12,3.65-j*.18,-3.37,.10,M.leaf,1,.5,.5);beam([4.18,3.8-j*.18,-3.37],[4.18,3.6-j*.18,-3.37],.012,M.leaf);}
    // 燈槽的背板與頂飾，保留向上的散光空間。
    box(.25,3.55,-3.46,9.7,.24,.12,M.wood);box(.25,4.06,-3.25,9.7,.08,.8,M.wood);
    box(-.55,8.5,-7.31,5.3,.48,.10,M.cream);box(-.55,8.9,-7.12,5.3,.08,.40,M.wood);
    box(5.4,3.69,-2.2,1.5,.14,.30,M.wood);box(12,7.38,-4,1.0,.15,.3,M.wood);
    // 奶油壁柱、藍灰書徽旗與窗臺小物，沿原有牆線加細節。
    function banner(x,z,a){
      const p=at(x,z,0,-.10,a);polygon([[-.40,4.65],[.40,4.65],[.40,3.18],[0,2.85],[-.40,3.18]],.025,p[0],0,p[1],bannerCloth,a);
      emblem(...(()=>{const q=at(x,z,0,-.14,a);return[q[0],3.85,q[1],1.55,a]})());
      const A=at(x,z,-.52,-.13,a),B=at(x,z,.52,-.13,a);beam([A[0],4.72,A[1]],[B[0],4.72,B[1]],.035,M.gold);
    }
    function vine(x,y,z,n=8){for(let j=0;j<n;j++){const u=Math.sin(j*1.8)*.10;beam([x,y-j*.16,z],[x+u,y-(j+1)*.16,z],.012,M.leaf);ball(x+u,y-(j+.7)*.16,z,.115,M.leaf,1.3,.48,.6);}}
    for(const sd of [-1,1]){
      const x=sd*8.83,a=sd*Math.PI/2;
      for(const z of [-7.1,-.65,6.1]){box(x,2.9,z,.28,5.8,.42,M.cream);box(x,.17,z,.46,.34,.60,M.stone);box(x,5.48,z,.50,.28,.64,M.wood);box(x,5.18,z,.34,.14,.50,M.stone);}
      banner(x,-.65,a);for(const z of [-2.2,4.8]){picture(sd*8.72,3.7,z,a);picture(sd*8.72,2.45,z,a);lantern(sd*8.62,4.65,z,-a);}
      for(const z of [-4.35,2.5]){const q=at(sd*9,z,0,-.26,a);plant(q[0],.95,q[1],.52);const p=at(sd*9,z,.68,-.28,a);stack(p[0],.95,p[1],3,a);}
    }
    for(const x of [-4.8,3.61]){plant(x-.65,1.20,-7.72,.55);stack(x+.55,1.20,-7.72,3);box(x,4.36,-7.73,2.65,.16,.56,M.stone);plant(x-.65,4.45,-7.68,.55);stack(x+.55,4.45,-7.68,3);}
    for(const x of [-4.0,-.8,3.8]){plant(x,5.12,-3.43,.46);vine(x,5.22,-3.30,10);}
    for(const z of [-2.3,-1.2]){plant(6.8,5.12,z,.42);vine(6.74,5.15,z,8);}
    for(const x of [-3.1,3.1])banner(x,7.88,0);
    for(const x of [-8.65,8.65])for(const z of [-7.65,7.65])box(x,4.6,z,.19,.28,.52,M.wood);
    for(const x of [-5.04,5.04])plant(x,2.72,-5.80,.48);
    sign(36,5.4,.79,-1.735,.72,.24);sign(37,8.285,2.53,0,1.85,.25,-Math.PI/2);
    for(let row=0;row<6;row++)for(let col=0;col<6;col++)sign(10+(row*6+col)%6,-8.49+col*.277,.18+row*.215,4.302+(row===2&&col===3?.14:0),.075,.043);
    // 圓塔的簷圈、閱讀燈與拱窗之間的畫框。
    box(9.85,8.08,.24,2.16,.30,.08,M.wood);box(9.85,8.72,-.03,2.28,.10,.55,M.wood);
    for(const y of [4.12,8.43])for(let j=1;j<12;j++){const a=j*Math.PI/12,b=(j+1)*Math.PI/12;beam([9.85+Math.sin(a)*4.38,y,-4.22+Math.cos(a)*4.38],[9.85+Math.sin(b)*4.38,y,-4.22+Math.cos(b)*4.38],.10);}
    for(const z of [-7.2,-.9]){picture(12.6,6.6,z,-Math.PI/2);lantern(12.65,7.3,z,Math.PI/2);}
    plant(9.30,5.12,-.08,.5);stack(10.35,5.12,-.08,3);vine(12.8,8.0,-5.8,9);
    const portal=arch(2.0,3.6).map(p=>[8.83,4+p[1],-1.8-p[0]]);for(let j=1;j<portal.length;j++)beam(portal[j-1],portal[j],.13,M.stone);
    flush();
    Object.assign(g.userData, {"bounce":2.4,"spawn":[0,0,5.9,3.141592653589793],"exit":[0,7.5,0.65],"host":[-4,0,6.5,1.2120256565243244],"sun":[-0.75,0.85,0.2],"spots":[{"id":"review","kind":"hook:review","x":0,"y":0,"z":3.7,"r":0.85,"label":"今天的複習","name":"主閱覽桌","lines":["這張長桌，留給今天想再試一次的你。","書先翻開，複習一題就算出發。","今天到期的題目，我幫你排好了。","檯燈亮著，慢慢想也沒關係。"],"alone":["攤開的書，正停在今天的複習頁。","筆記旁留著一支削好的鉛筆。","暖暖的檯燈，替下一位讀者留著。"]},{"id":"vocab","kind":"hook:vocab","x":-7.8,"y":0,"z":5.5,"r":0.75,"label":"單字複習","name":"字母卡片目錄櫃","lines":["小抽屜裡，每個單字都有自己的家。","先抽一張卡，看看還記不記得。","忘記也沒關係，翻面就有線索。","字母標籤，是這座小書櫃的路標。"],"alone":["A到Z的卡片，整齊排在小抽屜裡。","一張單字卡露出來，等人把它讀完。","抽屜把手被摸得亮亮的。"]},{"id":"mistakes","kind":"hook:mistakes","x":5.4,"y":0,"z":-0.5,"r":0.85,"label":"錯題本","name":"紅書籤錯題本講台","lines":["紅書籤夾著的，是再學一次的機會。","錯題本不記失敗，只記還能進步的地方。","便利貼上，都是以前讀者留下的提醒。","再看一次解析，也是一種前進。"],"alone":["大書攤在講台上，紅書籤安靜垂下。","便利貼寫著：這次試著說明原因。","頁邊有擦掉又重寫的鉛筆痕。"]},{"id":"libnotes","kind":"hook:libnotes","x":0,"y":0,"z":-4.35,"r":0.8,"label":"單元筆記","name":"十科筆記書架","lines":["十個科目，一科一格，慢慢挑就好。","書背的顏色，是找筆記的小捷徑。","遇到卡住的單元，先翻翻這一排。","筆記不用一次讀完，懂一段也很好。"],"alone":["十塊名牌，帶著筆記排成一列。","每種書背色，都對應一個科目。","這裡的每本筆記，都等著再次被翻開。"]},{"id":"words","kind":"hook:words","x":6.9,"y":0,"z":0,"r":0.85,"label":"單字謎","name":"木框字母拼字板","lines":["木字塊拼在一起，就會長出新單字。","今天的字母，正在等你找到位置。","卡住時，不妨先看看交叉的那一格。","猜一個字，也能替一天添一點樂趣。"],"alone":["木框裡的字塊，像一張小小地圖。","字母托盤裡，還留著幾塊空位。","上一位讀者，把字塊排得整整齊齊。"]},{"id":"reading_corner","kind":"look","x":-2,"y":4,"z":-4.8,"r":0.8,"label":"坐下來讀書","name":"書廊讀書椅","lines":["這張椅子，陪過小島最長的一場雨。","雨停之後，讀者把彩虹畫進了書籤。","我把那張書籤，留在旁邊的小書裡。","有時候，安靜坐著也會找到答案。"],"alone":["椅邊的書籤，畫著雨後的小小彩虹。","毛毯折得很整齊，像在替誰留位子。","書頁裡夾著一張淡淡的雨天速寫。"]},{"id":"window_globe","kind":"look","x":10.6,"y":0,"z":-3.65,"r":0.85,"label":"看看地球儀","name":"圓塔窗邊地球儀","lines":["這顆地球儀，是老船長送給圖書館的。","他說，讀一本書就像多走一段航程。","窗邊的航圖，畫著他第一次靠岸的地方。","轉到海洋那面，也別忘了看看小島。"],"alone":["地球儀底座刻著一艘很小的船。","舊航圖的角落，畫著熟悉的小島。","窗光落在海洋上，像一條安靜的航線。"]},{"id":"rare_atlas","kind":"look","x":10.6,"y":4,"z":-4,"r":0.65,"label":"看看珍本","name":"潮汐航海圖集","lines":["這本圖集，畫著小島還沒取名的時候。","最早的讀者，用貝殼替書頁作記號。","現在換成軟書籤，貝殼收在小盒裡。","你看，港口旁已經有一盞小燈了。"],"alone":["舊圖集裡，港口還只是一條鉛筆線。","旁邊的小盒，收藏著一枚薄薄的貝殼。","泛黃的紙上，有一盞被仔細描過的燈。"]}],"lights":[[0,5.3,0.5,"#ffd3a0",0.95,1.2],[-0.85,1.1,0.3,"#ffcc96",0.48,0.22],[0.85,1.1,0.3,"#ffcc96",0.48,0.22],[-4,1.1,4.7,"#ffd3a0",0.38,0.25],[10.4,5.2,-2.3,"#ffd3a0",0.48,0.35],[11.6,1.2,-5.8,"#ffd3a0",0.38,0.3],[-3.25,1.5,6.78,"#e2d7f0",0.1,0]],"glow":[{"kind":"cove","a":[-8.8,5.4,-3],"b":[-8.8,5.4,6],"n":[1,0],"c":"#f0e5d5"},{"kind":"cove","a":[8.8,5.4,0.6],"b":[8.8,5.4,6],"n":[-1,0],"c":"#f0e5d5"},{"kind":"under","a":[-5.6,2.55,-5.39],"b":[5.6,2.55,-5.39]},{"kind":"cove","a":[-4.4,3.54,-3.25],"b":[4.9,3.54,-3.25],"n":[0,1],"c":"#cda67e"},{"kind":"wash","a":[-3.2,8.66,-7.12],"b":[2.1,8.66,-7.12],"n":[0,1],"c":"#f0e5d5"},{"kind":"kick","a":[-5.6,0.12,5.12],"b":[-2.4,0.12,5.12],"n":[0,1]},{"kind":"under","a":[-8.65,1.48,4.24],"b":[-6.95,1.48,4.24]},{"kind":"cove","a":[9.0,8.15,.06],"b":[10.7,8.15,.06],"n":[0,-1],"c":"#fff1dc"},{"kind":"spot","p":[5.4,3.55,-2.2],"t":[5.4,1.05,-2.2],"r":0.75},{"kind":"spot","p":[12.0,7.2,-4.0],"t":[12.0,4.8,-4.0],"r":0.65}]});
    g.userData.cols=cols;
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
