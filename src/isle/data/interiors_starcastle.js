/* 潮汐小島・星環學院：白石圓廳、星空穹頂與十間科目教室；室內規格見 house.js。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['starcastle'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '星環學院・雲上的白石城堡';
    const cols = [], rooms = {}, spots = [], lights = [], glow = [];
    const PI = Math.PI, H = PI / 12, T = Math.tan(H), V = a => new THREE.Vector3(...a);
    const subjects = [
      [1, 'chinese', '#ff8fa3', '筆墨與線裝書', ['墨香停在紙上，像替心事留一盞燈。', '寫慢一點，每一筆都能找到自己的位置。']],
      [2, 'english', '#7cc7ff', '雲端旅行書櫃', ['書櫃收著遠方寄來的問候。', '讀出一個新單字，就像推開一扇小窗。']],
      [3, 'history', '#ffb86b', '沙漏與陶罐', ['沙粒輕輕落下，替舊故事翻頁。', '陶罐裡沒有寶藏，只有被珍惜的日常。']],
      [4, 'geography', '#a6e07a', '小島等高線', ['山丘一層層升起，像雲海上的蛋糕。', '沿著彎彎的線，也能找到回家的路。']],
      [5, 'civics', '#ffd76b', '星徽投票箱', ['每張小紙條，都有被好好聽見的重量。', '天平慢慢停穩，提醒我們替彼此想想。']],
      [7, 'math', '#b9a2ff', '幾何星星工坊', ['小小稜角湊在一起，也能圍出溫柔的圓。', '還沒解開也沒關係，線索會陪你慢慢走。']],
      [8, 'physics', '#5ee7f0', '光與擺的實驗桌', ['輕輕推一下，小球把問候傳向另一端。', '光穿過稜鏡，把天空分成柔柔的顏色。']],
      [9, 'chemistry', '#62f0b8', '分子花束', ['圓球牽起小手，排成一束安靜的花。', '燒瓶只盛著清水，陪好奇心慢慢發芽。']],
      [10, 'biology', '#8ff07a', '葉子與顯微鏡', ['葉脈像小路，把陽光送到每個角落。', '鏡片後的小世界，也在認真過日子。']],
      [11, 'earth', '#93a8ff', '岩石與星圖', ['石頭收著大地走過的路。', '抬頭找一顆星，今晚就有溫柔的方向。']]
    ];
    const C = { cream:'#fff3e1', stone:'#eee5d8', floor:'#fbf3e8', gold:'#e5c48a', wood:'#d9b68c', dark:'#967956', lilac:'#c9b9df', ink:'#69768b', leaf:'#a7c9a2', water:'#94cce1', clay:'#dfb4a4', paper:'#fff9ed', night:'#263453', seam:'#e6dace', star:'#d9dfed' };
    const M = {};
    Object.keys(C).forEach(k => {
      const kind = k === 'gold' ? 'metal' : ['wood', 'dark'].includes(k) ? 'wood' : k === 'leaf' ? 'foliage' : k === 'paper' ? 'paper' : ['floor', 'stone'].includes(k) ? 'stone' : 'plaster';
      M[k] = kit.mat(C[k], { roughness:k === 'gold' ? .38 : k === 'floor' ? .48 : .88, metalness:k === 'gold' ? .42 : 0, side:THREE.DoubleSide }, kind);
      M[k].name = 'starcastle:' + k;
    });
    subjects.forEach(([, sid, c]) => { M[sid] = kit.mat(c, { roughness:.95 }, 'fabric'); M[sid].name = 'starcastle:' + sid; });
    const boardMat = kit.mat('#2f4a42', { roughness:.95 });
    const view = kit.view(), glass = kit.glass(), lamp = kit.lamp('#ffddb1'), shade = kit.shade('#fff3df');
    const stars = kit.mat('#d9dfed', { emissive:new THREE.Color('#aebddd'), emissiveIntensity:.35, roughness:.9 });
    const portalMat = kit.mat('#ffffff', { vertexColors:true, emissive:new THREE.Color('#cbdff5'), emissiveIntensity:.5, roughness:1, side:THREE.DoubleSide });
    const cube = new THREE.BoxGeometry(1, 1, 1), orb = new THREE.SphereGeometry(1, 10, 6);
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12), rod = new THREE.CylinderGeometry(1, 1, 1, 6);
    const boardGeo = new THREE.PlaneGeometry(3, 1.3), hoop = new THREE.TorusGeometry(1, .025, 5, 40);
    const geometries = new Map();
    function cached(key, make) { if (!geometries.has(key)) geometries.set(key, make()); return geometries.get(key); }
    function mesh(geo, m, x=0, y=0, z=0) {
      const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = !m.transparent; o.receiveShadow = true; g.add(o); return o;
    }
    function box(x, y, z, w, h, d, m, a=0) { const o=mesh(cube,m,x,y,z); o.scale.set(w,h,d); o.rotation.y=a; return o; }
    function ball(x, y, z, sx, sy, sz, m) { const o=mesh(orb,m,x,y,z); o.scale.set(sx,sy,sz); return o; }
    function cyl(x, y, z, r, h, m) { const o=mesh(cylinder,m,x,y,z); o.scale.set(r,h,r); return o; }
    function beam(a, b, r, m) { const A=V(a),B=V(b),d=B.clone().sub(A),o=mesh(rod,m,...A.clone().add(B).multiplyScalar(.5).toArray()); o.scale.set(r,d.length(),r); o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()); return o; }
    function line(pts, r, m) { for (let j=1;j<pts.length;j++) beam(pts[j-1],pts[j],r,m); }
    function at(a, r, s=0) { return [Math.sin(a)*r+Math.cos(a)*s, Math.cos(a)*r-Math.sin(a)*s]; }
    function lb(a, r, s, y, w, h, d, m) { const p=at(a,r,s); return box(p[0],y,p[1],w,h,d,m,a); }
    function lp(a, r, s, y) { const p=at(a,r,s); return [p[0],y,p[1]]; }
    function localBall(a,r,s,y,sx,sy,sz,m) { const p=at(a,r,s),o=ball(p[0],y,p[1],sx,sy,sz,m); o.rotation.y=a; return o; }
    function geo(P, IX) { const q=new THREE.BufferGeometry(); q.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); if(IX)q.setIndex(IX); q.computeVertexNormals(); return q; }
    // house.js 用世界軸向碰撞箱；斜牆與桌子細分，避免一個大外框吞掉走道。
    function colBox(a, r, s, w, d, y0, y1) {
      const poly=[at(a,r-d/2,s-w/2),at(a,r-d/2,s+w/2),at(a,r+d/2,s+w/2),at(a,r+d/2,s-w/2)];
      const bounds=p=>[Math.min(...p.map(v=>v[0])),y0,Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),y1,Math.max(...p.map(v=>v[1]))];
      if(Math.abs(Math.sin(a)*Math.cos(a))<1e-8){cols.push(bounds(poly));return;}
      // 沿世界長軸切薄片，每片裁出矩形投影；不把整個家具切成密集小方格。
      const bb=bounds(poly),axis=bb[3]-bb[0]>bb[5]-bb[2]?0:1,lo=axis?bb[2]:bb[0],hi=axis?bb[5]:bb[3],n=Math.ceil((hi-lo)/.07);
      function clip(p,t,sign){const out=[];for(let j=0;j<p.length;j++){const A=p[j],B=p[(j+1)%p.length],ina=(A[axis]-t)*sign>=-1e-9,inb=(B[axis]-t)*sign>=-1e-9;if(ina)out.push(A);if(ina!==inb){const f=(t-A[axis])/(B[axis]-A[axis]);out.push([A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f]);}}return out;}
      for(let j=0;j<n;j++){const p=clip(clip(poly,lo+(hi-lo)*j/n,1),lo+(hi-lo)*(j+1)/n,-1);if(p.length)cols.push(bounds(p));}
    }
    function floorPoly(points, name) {
      const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))),q=new THREE.ShapeGeometry(shape); q.rotateX(-PI/2);
      const o=mesh(q,M.floor); o.name=name; o.userData={walk:true,prop:true}; return o;
    }
    function arch(w,h,b=0) { const p=[[-w/2,b],[w/2,b],[w/2,b+h-w/2]]; for(let j=1;j<=16;j++){const t=j*PI/16;p.push([w/2*Math.cos(t),b+h-w/2+w/2*Math.sin(t)]);} return p; }
    function extrude(points,depth,m,a,r,s=0) {const p=at(a,r,s),q=cached('extrude:'+JSON.stringify([points,depth]),()=>new THREE.ExtrudeGeometry(new THREE.Shape(points.map(v=>new THREE.Vector2(...v))),{depth,bevelEnabled:false})),o=mesh(q,m,p[0],0,p[1]);o.rotation.y=a;return o;}
    function archTrim(a,r,s,w,h,b,m=M.gold,size=.035) { const pts=arch(w,h,b).slice(1).map(([u,y])=>lp(a,r,s+u,y)); line(pts,size,m); for(const u of [-w/2,w/2])beam(lp(a,r,s+u,b),lp(a,r,s+u,b+h-w/2),size,m); }
    function windowAt(a,r,s,b,w,h) {
      const q=cached('win:'+w+':'+h,()=>{
        const geo=new THREE.ShapeGeometry(new THREE.Shape(arch(w,h,b).map(([u,y])=>new THREE.Vector2(-u,y)))),p=geo.attributes.position,uv=geo.attributes.uv;
        for(let j=0;j<p.count;j++)uv.setXY(j,p.getX(j)/w+.5,(p.getY(j)-b)/h);return geo;
      });
      const p=at(a,r+.24,s),v=mesh(q,view,p[0],0,p[1]);v.rotation.y=a+PI;
      const p2=at(a,r+.015,s),gl=mesh(q,glass,p2[0],0,p2[1]);gl.rotation.y=a+PI;
      archTrim(a,r-.025,s,w,h,b,M.stone,.095);archTrim(a,r-.07,s,w-.06,h-.04,b+.02);
      lb(a,r-.08,s,b+h*.49,w,.045,.06,M.gold);lb(a,r-.08,s,b+h*.5,.04,h-.08,.06,M.gold);
      lb(a,r-.11,s,b-.06,w+.24,.12,.34,M.stone);
    }
    function annulus(a0,a1,ri,ro,y0,y1,m,collision=false,roof=false) {
      const n=Math.ceil((a1-a0)*ro/.20),P=[],IX=[];
      for(let j=0;j<=n;j++){const a=a0+(a1-a0)*j/n;for(const [r,y]of [[ri,y0],[ro,y0],[ri,y1],[ro,y1]]){const p=at(a,r);P.push(p[0],y,p[1]);}}
      for(let j=0;j<n;j++){const k=j*4;for(const [a,b,c,d]of [[0,4,2,6],[1,3,5,7],[0,1,4,5],[2,6,3,7]])IX.push(k+a,k+b,k+c,k+b,k+d,k+c);
        if(collision){const a=a0+(a1-a0)*(j+.5)/n,pts=[at(a0+(a1-a0)*j/n,ri),at(a0+(a1-a0)*j/n,ro),at(a0+(a1-a0)*(j+1)/n,ri),at(a0+(a1-a0)*(j+1)/n,ro)];cols.push([Math.min(...pts.map(p=>p[0])),y0,Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),y1,Math.max(...pts.map(p=>p[1]))]);}
      }
      IX.push(0,2,1,1,2,3,n*4,n*4+1,n*4+2,n*4+1,n*4+3,n*4+2);
      const o=mesh(geo(P,IX),m);if(roof)o.userData.roof=true;return o;
    }
    function torus(x,y,z,r,m,horizontal=true) {const o=mesh(hoop,m,x,y,z);o.scale.setScalar(r);if(horizontal)o.rotation.x=PI/2;return o;}
    function column(a,r,s,h=4.1) {
      const p=at(a,r,s);cyl(p[0],h/2,p[1],.16,h-.26,M.cream);cyl(p[0],.14,p[1],.25,.28,M.stone);
      for(const y of [.29,h-.24])cyl(p[0],y,p[1],.19,.09,M.gold);cyl(p[0],h-.08,p[1],.25,.16,M.stone);
      colBox(a,r,s,.48,.48,0,h);
    }
    function lantern(a,r,s,y) {
      const p=at(a,r,s);cyl(p[0],y,p[1],.15,.33,shade);for(const yy of [y-.2,y+.2])cyl(p[0],yy,p[1],.19,.065,M.gold);
      ball(p[0],y,p[1],.09,.12,.09,lamp);for(const u of [-.13,.13])beam(lp(a,r,s+u,y-.19),lp(a,r,s+u,y+.19),.012,M.gold);
    }
    // 圓廳地坪與對準十間教室的淡色星環鑲嵌。
    const hallFloor=mesh(new THREE.CircleGeometry(7,120),M.floor);hallFloor.rotation.x=-PI/2;hallFloor.name='starcastle:hall-floor';hallFloor.userData={walk:true,prop:true};
    for(const [r,t,m]of [[1.62,.018,M.gold],[2.55,.02,M.gold],[5.9,.022,M.lilac],[6.35,.014,M.gold]]){const q=new THREE.RingGeometry(r-t,r+t,120),o=mesh(q,m,0,.008,0);o.rotation.x=-PI/2;}
    subjects.forEach(([i,sid])=>{
      const a=i*PI/6,P=[],IX=[];for(let j=0;j<=10;j++)for(const r of [2.05,2.4]){const p=at(a-H*.68+j*H*1.36/10,r);P.push(p[0],.009,p[1]);}
      for(let j=0;j<10;j++){const k=j*2;IX.push(k,k+1,k+2,k+1,k+3,k+2);}mesh(geo(P,IX),M[sid]);
      for(let j=0;j<4;j++){const b=a-H*.66+(j+.5)*H*1.32/4;beam(lp(b,2.07,0,.014),lp(b,2.38,0,.014),.018,M.floor);}
      const p=at(a,2.78),q=mesh(cached('diamond',()=>geo([0,.0,-.11,.065,0,0,0,0,.11,-.065,0,0],[0,1,2,0,2,3])),M.gold,p[0],.01,p[1]);q.rotation.y=a;
    });
    cyl(0,.39,0,1.25,.78,M.stone);cyl(0,.08,0,1.3,.16,M.cream);cyl(0,.8,0,1.3,.10,M.cream);
    for(const y of [.16,.75,.85])cyl(0,y,0,1.305,.025,M.gold);colBox(0,0,0,2.6,2.6,0,.87);
    const ringAt=new THREE.Object3D();ringAt.name='ring_at';ringAt.position.set(0,2.4,0);g.add(ringAt);
    const doorHalf=i=>Math.asin((i===0?1.5:i===6?1.2:.9)/7);
    for(let i=0;i<12;i++){
      const a=i*PI/6,dh=doorHalf(i),next=(i+1)*PI/6-doorHalf((i+1)%12),w=i===0?3:i===6?2.4:1.8,h=i===0?3.5:i===6?3.6:2.8;
      annulus(a+dh,next,7,7.5,0,4.75,M.cream,true);
      annulus(a+dh,next,6.94,7.01,0,.19,M.stone);annulus(a+dh,next,6.965,7.02,.8,.86,M.gold);
      const spring=h-w/2,outline=[[-w/2,4.75],[w/2,4.75],[w/2,spring]];
      for(let j=1;j<=16;j++){const t=j*PI/16;outline.push([w/2*Math.cos(t),spring+w/2*Math.sin(t)]);}
      extrude(outline,.5,M.cream,a,7);archTrim(a,6.96,0,w,h,0,M.stone,.10);archTrim(a,6.86,0,w+.12,h+.08,0);
      for(const s of [-w/2-.18,w/2+.18])column(a,6.96,s,h-.25);
      if(i!==0&&i!==6){lb(a,6.80,0,3.2,1.48,.40,.11,M.gold);lb(a,6.73,0,3.2,1.4,.32,.05,M.paper);}
      // 高窗獨立於教室屋頂，白石窗間柱與連續檐帶支撐穹頂。
      annulus(a-H,a+H,7,7.5,4.75,5.04,M.stone,false,true);
      annulus(a-H,a+H,7,7.5,6.91,7.5,M.cream,false,true);
      annulus(a-H,a-.095,7,7.5,5.04,6.91,M.cream,false,true);annulus(a+.095,a+H,7,7.5,5.04,6.91,M.cream,false,true);
      const start=g.children.length;windowAt(a,7.02,0,5.04,1.3,1.87);for(let j=start;j<g.children.length;j++)g.children[j].userData.roof=true;
    }
    annulus(0,PI*2,6.85,7.6,7.42,7.57,M.gold,false,true);
    // 壓扁的半球穹頂高十點七公尺；星點亮度低於室內燈罩。
    const dome=mesh(new THREE.SphereGeometry(7.42,72,20,0,PI*2,0,PI/2),M.night,0,7.5,0);dome.scale.y=3.2/7.42;dome.userData.roof=true;
    for(let k=0;k<132;k++){
      const a=k*2.3999632297,rr=1.0+5.95*Math.sqrt((k+.5)/132),y=7.5+3.2*Math.sqrt(1-rr*rr/(7.42*7.42))-.055,p=at(a,rr),s=k%11===0?.04:.022;
      const o=ball(p[0],y,p[1],s,s*.65,s,stars);o.userData.roof=true;
    }
    for(let i=0;i<12;i++){
      const a=i*PI/6,pts=[];for(let j=0;j<=14;j++){const t=j*PI/28;pts.push(lp(a,7.39*Math.cos(t),0,7.49+3.2*Math.sin(t)));}
      const before=g.children.length;line(pts,.024,M.gold);for(let j=before;j<g.children.length;j++)g.children[j].userData.roof=true;
    }
    // 吊燈完全高於未來小星環的預留空間。
    beam([0,6.35,0],[0,10.58,0],.025,M.gold);torus(0,6.35,0,1.38,M.gold);torus(0,6.48,0,1.12,M.lilac);
    for(let j=0;j<10;j++){const a=j*PI/5,p=at(a,1.38);beam([0,7.2,0],[p[0],6.4,p[1]],.018,M.gold);cyl(p[0],6.28,p[1],.13,.24,shade);ball(p[0],6.18,p[1],.08,.06,.08,lamp);}
    lights.push([0,6.25,0,'#ffddb1',1.05,.65]);
    for(const a of [PI/3,-PI/3]){lantern(a,6.6,0,3.85);const p=at(a,6.48);lights.push([p[0],3.85,p[1],'#ffe1bd',.7,.3]);}
    for(const a of [PI/4,PI*3/4,PI*5/4,PI*7/4])glow.push({kind:'cove',a:lp(a,6.87,-1.05,7.12),b:lp(a,6.87,1.05,7.12),n:[-Math.sin(a),-Math.cos(a)],c:C.cream});
    // 入口玄關與白藍光幕：普通不透明網格會擋鏡頭，出口圈位於幕前。
    floorPoly([[-1.5,6.8],[1.5,6.8],[1.5,10.6],[-1.5,10.6]],'starcastle:vestibule-floor');
    for(const s of [-1,1]){
      box(s*1.63,2.1,9.04,.26,4.2,3.12,M.cream);colBox(0,9.04,s*1.63,.26,3.12,0,4.2);
      for(const r of [8.05,10.35])column(0,r,s*1.48,3.95);lantern(0,8.95,s*1.41,2.6);
      box(s*1.48,.16,9.03,.10,.28,2.9,M.stone);box(s*1.46,3.88,9.03,.11,.12,3.0,M.gold);
    }
    const vestibuleRoof=box(0,4.27,9.04,3.5,.14,3.2,M.lilac);vestibuleRoof.userData.roof=true;
    archTrim(0,10.48,0,2.7,3.8,0,M.stone,.16);archTrim(0,10.40,0,2.78,3.85,0,M.gold,.035);
    const portalGeo=new THREE.ShapeGeometry(new THREE.Shape(arch(2.7,3.8).map(v=>new THREE.Vector2(...v)))),col=[],pos=portalGeo.attributes.position;
    for(let j=0;j<pos.count;j++){const c=new THREE.Color('#c2daf3').lerp(new THREE.Color('#fffdf4'),Math.max(0,1-pos.getY(j)/3.8));col.push(c.r,c.g,c.b);}portalGeo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    mesh(portalGeo,portalMat,0,0,10.53).name='starcastle:lightbridge-veil';colBox(0,10.59,0,3,.12,0,4.2);
    lights.push([0,3.45,8.95,'#e2eaff',.8,.3]);
    // 北方大講堂雙扉：門扇及其金色星環徽章，不開門也不放門前家具。
    for(const s of [-.6,.6]){
      lb(PI,7.1,s,1.75,1.18,3.5,.18,M.paper);lb(PI,6.985,s,1.7,.93,2.8,.045,M.stone);
      for(const y of [.35,3.05])lb(PI,6.95,s,y,.98,.045,.045,M.gold);
      for(const u of [-.46,.46])lb(PI,6.95,s+u,1.7,.025,2.7,.045,M.gold);
      localBall(PI,6.88,s>0?.15:-.15,1.5,.045,.12,.04,M.gold);
    }
    colBox(PI,7.15,0,2.4,.3,0,3.6);
    const badge=torus(0,2.65,-6.88,.45,M.gold,false);badge.rotation.y=PI;
    for(let j=0;j<10;j++){const a=j*PI/5;ball(Math.sin(a)*.45,2.65+Math.cos(a)*.45,-6.85,.065,.065,.025,M.lilac);}
    // 共用放射隔牆，內面沒有柱、接縫或凸起；左牆星窗帶只保留低踢腳與頂線。
    const boundaries=new Set();subjects.forEach(([i])=>{boundaries.add(i*2-1);boundaries.add(i*2+1);});
    for(const k of boundaries){
      const b=k*PI/12,r0=7.5,r1=12.6/Math.cos(H),mid=(r0+r1)/2,len=r1-r0;
      lb(b,mid,0,2.1,.16,4.2,len,M.cream);colBox(b,mid,0,.16,len,0,4.2);
      for(const s of [-.095,.095]){lb(b,mid,s,.14,.04,.28,len,M.stone);lb(b,mid,s,3.99,.055,.12,len,M.gold);}
    }
    function book(a,r,s,y,w=.24,m=M.lilac) {lb(a,r,s,y+.045,w,.09,.32,m);lb(a,r-.008,s,y+.047,w-.035,.053,.327,M.paper);lb(a,r-.17,s,y+.045,w,.09,.025,m);}
    function globe(a,r,s,y,sz=.25) {
      const p=at(a,r,s);cyl(p[0],y+.035,p[1],sz*.7,.07,M.gold);beam(lp(a,r,s,y+.06),lp(a,r,s,y+.23),.025,M.gold);
      localBall(a,r,s,y+.45,sz,sz,sz,M.water);for(const [u,v]of [[-.08,.08],[.1,-.06],[.03,-.15]])localBall(a,r-sz*.90,s+u*sz/.25,y+.45+v*sz/.25,sz*.40,sz*.30,sz*.13,M.leaf);
      const o=torus(p[0],y+.45,p[1],sz*1.2,M.gold,false);o.rotation.y=a;o.rotation.z=.32;
    }
    function shelf(a,r,s,y,w=1,h=1.05) {
      lb(a,r+.20,s,y+h/2,w,h,.07,M.wood);for(const u of [-w/2,w/2])lb(a,r,s+u,y+h/2,.07,h,.5,M.wood);
      for(const yy of [0,h*.5,h])lb(a,r,s,y+yy,w+.08,.07,.54,M.wood);
      for(let j=0;j<6;j++)lb(a,r-.05,s-w*.38+j*w*.15,y+h*.27,.10,h*.35,.29,j%2?M.lilac:M.ink);
    }
    function pot(a,r,s,y) {const p=at(a,r,s);cyl(p[0],y+.17,p[1],.20,.34,M.clay);for(let j=0;j<6;j++){const t=j*PI/3;beam(lp(a,r,s,y+.3),lp(a,r+Math.cos(t)*.23,s+Math.sin(t)*.23,y+.75),.017,M.leaf);localBall(a,r+Math.cos(t)*.21,s+Math.sin(t)*.21,y+.72,.13,.22,.09,M.leaf);}}
    function desk(a,r,s,teacher=false) {
      const w=teacher?1.4:.9,d=teacher?.55:.5,h=teacher?.9:.72;
      lb(a,r,s,h-.045,w,.09,d,M.wood);lb(a,r+.03,s,h-.15,w-.10,.15,d-.07,M.cream);
      for(const u of [-w/2+.08,w/2-.08])for(const v of [-d/2+.07,d/2-.07])lb(a,r+v,s+u,(h-.14)/2,.055,h-.14,.055,M.dark);
      colBox(a,r,s,w,d,0,h);
      if(teacher){lb(a,r-.29,s,.61,w-.15,.32,.055,M.cream);lb(a,r-.325,s,.65,.24,.035,.025,M.gold);return;}
      const cr=r-.58;lb(a,cr,s,.42,.44,.07,.40,M.lilac);lb(a,cr-.18,s,.66,.43,.45,.055,M.wood);
      for(const u of [-.17,.17])for(const v of [-.14,.14])lb(a,cr+v,s+u,.2,.035,.4,.035,M.dark);
      book(a,r+.03,s,h,.24,M.paper);lb(a,r-.06,s+.22,h+.015,.025,.025,.25,M.gold);
    }
    // 右牆圖板只用幾何符號；科目名稱與黑板文字都留給主程式。
    function poster(a,sid) {
      const b=a-H,n=[Math.cos(b),-Math.sin(b)],c=at(b,9.75),p=[c[0]+n[0]*.105,c[1]+n[1]*.105],ry=b+PI/2;
      box(p[0],2.15,p[1],1.65,1.25,.065,M.wood,ry);const face=at(ry,.045),cx=p[0]+face[0],cz=p[1]+face[1];box(cx,2.15,cz,1.52,1.12,.02,M.paper,ry);
      function point(u,y,d=.063){return[cx+Math.cos(ry)*u+Math.sin(ry)*d,2.15+y,cz-Math.sin(ry)*u+Math.cos(ry)*d];}
      if(['history','geography','english'].includes(sid)){
        for(let j=0;j<5;j++)line([point(-.65,-.35+j*.17),point(.65,-.35+j*.17)],.008,M.seam);
        for(const [x,y,s]of [[-.3,.14,.21],[.2,-.13,.20],[.43,.25,.10]]){const q=point(x,y);ball(q[0],q[1],q[2],s,s*.65,.025,M.leaf).rotation.y=ry;}
        line([point(-.6,-.25),point(-.2,.3),point(.15,.08),point(.52,.37)],.015,M[sid]);
      }else if(sid==='math'){
        line([point(-.6,0),point(.6,0)],.012,M.ink);line([point(0,-.45),point(0,.45)],.012,M.ink);
        const pts=[];for(let j=0;j<=20;j++){const x=-.62+j*.062;pts.push(point(x,x*x*1.8-.32));}line(pts,.02,M[sid]);
      }else if(sid==='chemistry'){
        for(let row=0;row<4;row++)for(let j=0;j<9;j++){if(row===0&&j>1&&j<8)continue;const q=point(-.59+j*.147,.35-row*.21);box(q[0],q[1],q[2],.115,.16,.012,j%3?M[sid]:M.lilac,ry);}
      }else if(sid==='biology'){
        const q=point(0,0),o=torus(q[0],q[1],q[2],.37,M[sid],false);o.scale.y*=.75;o.rotation.y=ry;
        for(const [u,y]of [[0,0],[-.2,.13],[.17,-.14]]){const p=point(u,y);ball(p[0],p[1],p[2],.09,.065,.03,u?M.lilac:M.clay).rotation.y=ry;}
      }else if(sid==='earth'){
        const pts=[[-.55,.25],[-.28,.06],[0,.33],[.2,-.05],[.52,-.24]];line(pts.map(([u,y])=>point(u,y)),.012,M.ink);pts.forEach(([u,y])=>{const p=point(u,y);ball(p[0],p[1],p[2],.04,.04,.025,M.gold);});
      }else if(sid==='civics'){
        for(const u of [-.28,.28]){line([point(u-.16,-.3),point(u-.16,.3),point(u+.16,.3),point(u+.16,-.3)],.018,M[sid]);for(let j=0;j<4;j++)line([point(u-.11,.2-j*.13),point(u+.11,.2-j*.13)],.008,M.ink);}
      }else if(sid==='physics'){
        const pts=[];for(let j=0;j<=28;j++){const x=-.65+j*1.3/28;pts.push(point(x,Math.sin(x*8)*.3));}line(pts,.018,M[sid]);
      }else{
        // 橫軸卷軸與抽象墨跡，不生成錯字。
        for(const u of [-.75,.75]){const p=point(u,0);beam([p[0],1.5,p[2]],[p[0],2.8,p[2]],.045,M.gold);}
        for(let j=0;j<4;j++)line([point(.45-j*.3,.33),point(.39-j*.3,.05),point(.49-j*.3,-.18),point(.35-j*.3,-.35)],.026,M.ink);
      }
    }
    function theme(a,sid) {
      // 展示桌放在右後角，故事互動點在桌前；不碰左側星窗帶。
      const r=11.88,s=-2.48;lb(a,r,s,.73,1.08,.10,.64,M.wood);for(const u of [-.44,.44])lb(a,r,s+u,.35,.075,.70,.50,M.cream);colBox(a,r,s,1.13,.70,0,1.2);
      poster(a,sid);
      if(sid==='chinese'){
        for(let j=0;j<3;j++)book(a,r,s+.25,.79+j*.105,.35,j%2?M.chinese:M.lilac);
        lb(a,r-.05,s-.28,.82,.30,.08,.22,M.ink);lb(a,r,s-.28,1.1,.42,.055,.08,M.dark);
        for(let j=0;j<3;j++){beam(lp(a,r,s-.44+j*.14,.86),lp(a,r,s-.44+j*.14,1.42),.018,M.gold);localBall(a,r,s-.44+j*.14,.84,.025,.10,.025,M.ink);}
      }else if(sid==='english'){
        shelf(a,r,s,0,1.0,1.35);globe(a,r,s,1.39,.23);
        lb(a,8.2,-1.61,.55,.42,1.1,.25,M.wood);for(let j=0;j<3;j++)lb(a,8.04,-1.61,.5+j*.22,.35,.18,.045,M.paper);colBox(a,8.2,-1.61,.45,.3,0,1.1);
      }else if(sid==='history'){
        for(const u of [-.22,.22])for(const yy of [.83,1.44])lb(a,r,s+u,yy,.40,.055,.34,M.gold);
        const p=at(a,r,s-.22);for(const yy of [.99,1.28]){const o=mesh(cached('hourglass',()=>new THREE.ConeGeometry(.115,.27,10)),glass,p[0],yy,p[1]);if(yy<1.1)o.rotation.z=PI;}
        for(const u of [-.39,-.05])beam(lp(a,r,s+u,.84),lp(a,r,s+u,1.44),.015,M.gold);
        localBall(a,r,s+.3,1.03,.17,.24,.17,M.clay);const q=at(a,r,s+.3);cyl(q[0],1.28,q[1],.095,.14,M.clay);
      }else if(sid==='geography'){
        for(let j=0;j<5;j++){const o=mesh(cached('terrain',()=>new THREE.CylinderGeometry(1,1,1,14)),j%2?M.leaf:M.geography,...lp(a,r,s-.20,.83+j*.07));o.scale.set(.34-j*.05,.07,.24-j*.03);}
        globe(a,r,s+.31,.8,.18);
      }else if(sid==='civics'){
        lb(a,r,s+.26,1.0,.43,.4,.40,M.civics);lb(a,r,s+.26,1.21,.46,.04,.42,M.gold);lb(a,r,s+.26,1.235,.26,.012,.04,M.ink);
        beam(lp(a,r,s-.26,.8),lp(a,r,s-.26,1.5),.028,M.gold);beam(lp(a,r,s-.53,1.4),lp(a,r,s+.01,1.4),.02,M.gold);
        for(const u of [-.52,0]){beam(lp(a,r,s+u,1.4),lp(a,r,s+u,1.11),.008,M.gold);const p=at(a,r,s+u);cyl(p[0],1.09,p[1],.12,.03,M.gold);}
        for(let j=0;j<3;j++)book(a,8.22,-1.65,.10+j*.11,.38,M.civics);colBox(a,8.22,-1.65,.42,.36,0,.6);
      }else if(sid==='math'){
        for(const [u,key,make]of [[-.27,'ico',()=>new THREE.IcosahedronGeometry(.24,0)],[.28,'oct',()=>new THREE.OctahedronGeometry(.25)]])mesh(cached(key,make),M.math,...lp(a,r,s+u,1.08));
        beam(lp(a,8.25,-1.65,.13),lp(a,8.25,-1.65,1.25),.045,M.gold);beam(lp(a,8.25,-1.65,1.25),lp(a,8.25,-1.95,.13),.045,M.gold);colBox(a,8.25,-1.8,.42,.3,0,1.3);
      }else if(sid==='physics'){
        for(const u of [-.42,.05])for(const rr of [r-.15,r+.15])beam(lp(a,rr,s+u,.8),lp(a,rr,s+u,1.38),.018,M.gold);
        for(const rr of [r-.15,r+.15])beam(lp(a,rr,s-.42,1.38),lp(a,rr,s+.05,1.38),.018,M.gold);
        for(let j=0;j<4;j++){const u=s-.36+j*.11;for(const rr of [r-.15,r+.15])beam(lp(a,rr,u,1.38),lp(a,r,u,1.05),.006,M.dark);localBall(a,r,u,1.03,.055,.055,.055,M.ink);}
        const prism=mesh(cached('prism',()=>new THREE.CylinderGeometry(.19,.19,.3,3)),glass,...lp(a,r,s+.32,1));prism.rotation.z=PI/2;
        for(let j=0;j<5;j++)beam(lp(a,r-.14,s+.32,.88+j*.024),lp(a,r-.28,s+.48,.82+j*.04),.009,M[subjects[j][1]]);
        beam(lp(a,8.2,-1.65,.12),lp(a,8.2,-1.65,1.42),.024,M.gold);beam(lp(a,8.2,-1.65,1.4),lp(a,8.2,-1.39,1.4),.024,M.gold);beam(lp(a,8.2,-1.39,1.4),lp(a,8.2,-1.39,.65),.008,M.dark);localBall(a,8.2,-1.39,.6,.095,.095,.095,M.physics);colBox(a,8.2,-1.54,.4,.28,0,1.5);
      }else if(sid==='chemistry'){
        for(let j=0;j<3;j++){localBall(a,r,s-.37+j*.19,.98,.085,.12,.085,M.water);const p=at(a,r,s-.37+j*.19);cyl(p[0],1.13,p[1],.033,.15,glass);}
        lb(a,r,s-.18,.91,.58,.035,.24,M.gold);
        const points=[[r,s+.25,1.12],[r-.12,s+.48,1.33],[r+.12,s+.40,.91]];for(let j=1;j<3;j++)beam(lp(a,...points[0]),lp(a,...points[j]),.022,M.gold);points.forEach(([rr,u,y],j)=>localBall(a,rr,u,y,.10,.10,.10,j?M.chemistry:M.clay));
      }else if(sid==='biology'){
        pot(a,r,s+.25,.80);lb(a,r,s-.28,.84,.35,.06,.26,M.ink);beam(lp(a,r+.08,s-.28,.86),lp(a,r+.08,s-.28,1.3),.05,M.cream);beam(lp(a,r+.08,s-.28,1.3),lp(a,r-.12,s-.28,1.42),.06,M.ink);lb(a,r-.05,s-.28,1.07,.29,.035,.25,M.gold);
      }else{
        shelf(a,r,s,0,1.0,1.1);for(let j=0;j<4;j++){const q=mesh(cached('rock',()=>new THREE.DodecahedronGeometry(.13,0)),j%2?M.ink:M.clay,...lp(a,r-.03,s-.34+j*.23,1.25));q.scale.y=.75;}globe(a,r+.15,s+.22,1.14,.18);
      }
    }
    subjects.forEach(([i,sid,,name,lines])=>{
      const a=i*PI/6;
      floorPoly([at(a,6.98,-6.98*T),at(a,6.98,6.98*T),at(a,12.6,12.6*T),at(a,12.6,-12.6*T)],'starcastle:floor:'+sid);
      const roof=floorPoly([at(a,7.2,-7.2*T),at(a,7.2,7.2*T),at(a,12.86,12.86*T),at(a,12.86,-12.86*T)],'starcastle:ceiling:'+sid);roof.position.y=4.22;roof.material=M.cream;roof.userData={roof:true};
      const hw=12.6*T;
      // 外牆的兩個真正拱窗，黑板本身完全獨立、保留 PlaneGeometry 的預設 UV。
      const sh=new THREE.Shape([new THREE.Vector2(-hw,0),new THREE.Vector2(hw,0),new THREE.Vector2(hw,4.2),new THREE.Vector2(-hw,4.2)]);
      for(const s of [-2.36,2.36])sh.holes.push(new THREE.Path(arch(1,2.2,.9).map(([u,y])=>new THREE.Vector2(u+s,y)).reverse()));
      const p=at(a,12.6),outer=mesh(cached('classroom-outer-wall',()=>new THREE.ExtrudeGeometry(sh,{depth:.26,bevelEnabled:false})),M.cream,p[0],0,p[1]);outer.rotation.y=a;colBox(a,12.73,0,hw*2,.26,0,4.2);
      for(const s of [-2.36,2.36])windowAt(a,12.6,s,.9,1,2.2);
      lb(a,12.55,0,.14,hw*2,.28,.10,M.stone);lb(a,12.53,0,4.02,hw*2,.12,.11,M.gold);
      const bp=at(a,12.51),board=mesh(boardGeo,boardMat,bp[0],1.6,bp[1]);board.rotation.y=a+PI;board.name='board_'+sid;board.userData.prop=true;
      for(const u of [-1.55,1.55])lb(a,12.52,u,1.6,.10,1.5,.10,M.wood);for(const y of [.9,2.3])lb(a,12.52,0,y,3.2,.10,.10,M.wood);lb(a,12.40,0,.87,3.2,.055,.24,M.gold);
      for(const s of [-.45,.05,.5])lb(a,12.36,s,.91,.18,.025,.025,M.paper);
      lb(a,9.5,0,.009,1.06,.015,5.0,M[sid]);for(const s of [-.49,.49])lb(a,9.5,s,.018,.016,.012,4.9,M.gold);
      for(const r of [9.2,10.4])for(const s of [-1.15,1.15])desk(a,r,s);desk(a,11.85,0,true);
      // 只在右牆上方掛旗，左牆保留給稍後加入的星窗。
      const b=a-H,q=at(b,8.45),n=[Math.cos(b),-Math.sin(b)],ry=b+PI/2;
      box(q[0]+n[0]*.13,3.37,q[1]+n[1]*.13,.46,.65,.035,M[sid],ry);beam([q[0]+n[0]*.11,3.74,q[1]+n[1]*.11],[q[0]+n[0]*.11+Math.sin(b)*.28,3.74,q[1]+n[1]*.11+Math.cos(b)*.28],.025,M.gold);
      for(const r of [8.0,11.1]){const len=r*T*2;const o=lb(a,r,0,4.1,len,.14,.10,M.wood);o.userData.roof=true;}
      const light=at(a,10.3);lantern(a,10.3,0,3.7);lights.push([light[0],3.7,light[1],'#ffe1bd',.72,.3]);
      glow.push({kind:'spot',p:lp(a,12.05,0,3.65),t:[bp[0],1.6,bp[1]],r:1.6});
      theme(a,sid);
      const left=a+H,normal=[-Math.cos(left),Math.sin(left)],wall=[8.3,12].map(r=>{const v=at(left,r);return[v[0]+normal[0]*.1,v[1]+normal[1]*.1];});
      rooms[sid]={a,lesson:at(a,11),wallSpot:at(a,10.2,2.15),plate:[...lp(a,6.695,0,3.2),a+PI],wall:[...wall[0],...wall[1]],wallN:normal};
      for(const [topic,p,label,r]of [['lesson',rooms[sid].lesson,'上星環課',1.1],['wall',rooms[sid].wallSpot,'看星窗',1]])spots.push({x:p[0],y:0,z:p[1],r,kind:'hook:academy',topic:topic+':'+sid,label});
      const look=at(a,10.95,-2.12);spots.push({x:look[0],y:0,z:look[1],r:.85,kind:'look',topic:'look:'+sid,label:'看看擺設',name,lines});
    });
    spots.push({x:0,y:0,z:2.2,r:1.2,kind:'hook:academy',topic:'ring',label:'看星環'},{x:0,y:0,z:-6.1,r:1.3,kind:'hook:academy',topic:'hall',label:'大講堂'});
    Object.assign(g.userData,{spawn:[0,0,8.2,PI],exit:[0,9.7,.9],host:[2.6,0,3.4,0],spots,lights,glow,view:'sky',indoor:true,bounce:1.8,sun:[.35,.8,.5],cols,rooms});
    // 依材質合併靜態幾何；保留可走地板、黑板、星環錨點與不透明光幕的頂點色。
    // roof 僅供預覽剖視使用；正常場景全部可見，牆面和天花板照常擋鏡頭。
    g.updateMatrixWorld(true);
    const batches=new Map(),old=[],v=new THREE.Vector3(),nm=new THREE.Matrix3();
    g.traverse(o=>{
      if(!o.isMesh||o.userData.prop||o.userData.walk)return;
      const key=o.material.uuid+':'+!!o.userData.roof;
      if(!batches.has(key))batches.set(key,{m:o.material,roof:!!o.userData.roof,parts:[]});batches.get(key).parts.push(o);old.push(o);
    });
    batches.forEach(({m,roof,parts})=>{
      const P=[],N=[],UV=[],RGB=[];const hasColor=!!m.vertexColors;
      parts.forEach(o=>{
        const q=o.geometry,p=q.attributes.position,n=q.attributes.normal,uv=q.attributes.uv,c=q.attributes.color,ix=q.index;nm.getNormalMatrix(o.matrixWorld);
        for(let j=0,count=ix?ix.count:p.count;j<count;j++){
          const k=ix?ix.getX(j):j;v.fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld);P.push(v.x,v.y,v.z);v.fromBufferAttribute(n,k).applyMatrix3(nm).normalize();N.push(v.x,v.y,v.z);UV.push(uv?uv.getX(k):0,uv?uv.getY(k):0);if(hasColor)RGB.push(c?c.getX(k):1,c?c.getY(k):1,c?c.getZ(k):1);
        }
      });
      const q=geo(P);q.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));q.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));if(hasColor)q.setAttribute('color',new THREE.Float32BufferAttribute(RGB,3));const o=mesh(q,m);o.name='starcastle:merged:'+(m.name||m.type)+(roof?':roof':'');if(roof)o.userData.roof=true;
    });
    const unused=new Set(old.map(o=>o.geometry));old.forEach(o=>o.removeFromParent());g.traverse(o=>{if(o.isMesh)unused.delete(o.geometry);});unused.forEach(q=>q.dispose());
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
