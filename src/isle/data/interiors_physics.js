/* 潮汐小島 · physics 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['physics'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['physics'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'physics-copper-workshop-interior';
    const M = {
      plaster: kit.mat('#f0e6d8', {}, 'plaster'), oak: kit.mat('#9a663f', {}, 'wood'),
      honey: kit.mat('#be8950', {}, 'wood'), dark: kit.mat('#5b4031', { metalness:.7, roughness:.4 }, 'metal'), stone: kit.mat('#d8c8ac', {}, 'stone'),
      floor: kit.mat('#b8ab93', {}, 'wood'), floorShade: kit.mat('#c3b7a0', {}, 'wood'), roof: kit.mat('#c8733f', {}, 'roof'), copper: kit.mat('#b8763d', { metalness:.75, roughness:.4 }, 'metal'),
      brass: kit.mat('#d5ad56', { metalness:.8, roughness:.36 }, 'metal'), cyan: kit.lamp('#5ee7f0').clone(),
      pink: kit.mat('#ecb5c8', {}, 'fabric'), lavender: kit.mat('#b79acb', {}, 'fabric'), leaf: kit.mat('#819565', {}, 'foliage'), cream: kit.mat('#fff0d5', {}, 'fabric'),
      rug: kit.mat('#ce845d', {}, 'fabric'), board: kit.mat('#456563', {}, 'paper'), lamp: kit.lamp('#ffdaa0')
    };
    M.cyan.emissiveIntensity = .22;   // 儀表維持原本固定的低亮度，不跟吊燈一起增亮。
    // 紙頁、杯盤與奶油色木作分開共用；保持原本的色碼、尺寸與位置。
    const S = {
      paper:kit.mat('#fff0d5',{},'paper'), ceramic:kit.mat('#fff0d5',{},'ceramic'), paleWood:kit.mat('#fff0d5',{},'wood'),
      violetPetal:kit.mat('#b79acb',{},'foliage'), honeyThread:kit.mat('#be8950',{},'fabric'),
      floorTile:kit.mat('#b8ab93',{},'stone'), cyanCover:kit.mat('#5ee7f0',{},'fabric'), tea:kit.mat('#5b4031',{},'ceramic'),
      diff:kit.lamp('#ffd8ad'), hood:kit.mat('#b8763d',{metalness:.65,roughness:.48,side:THREE.DoubleSide},'metal'),
      brassDome:kit.mat('#d5ad56',{metalness:.8,roughness:.36,side:THREE.DoubleSide},'metal')
    };
    const covers = new Map([[M.cream,S.paper],[M.cyan,S.cyanCover]]);
    const cols = [];
    function mesh(q, m, x, y, z, data) { const o = new THREE.Mesh(q, m); o.position.set(x, y, z); if (data) Object.assign(o.userData, data); g.add(o); return o; }
    function box(x,y,z,w,h,d,m,solid) { return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,solid?{solid:true}:null); }
    function beam(a,b,r,m) { const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A); const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),6),m,...A.add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o; }
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1) { const o=mesh(new THREE.SphereGeometry(r,10,6),m,x,y,z);o.scale.set(sx,sy,sz);return o; }
    function ring(x,y,z,r,t,m,ry=0) { const o=mesh(new THREE.TorusGeometry(r,t,6,32),m,x,y,z);o.rotation.y=ry;return o; }
    function pipe(points,r=.07) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,6,false),M.copper,0,0,0); }
    function floor(x,z,w,d,y,m=M.floor) { const o=box(x,y-.13,z,w,.26,d,m);o.userData.walk=true;return o; }
    function rect(x,y,w,h) { return [[x-w/2,y],[x+w/2,y],[x+w/2,y+h],[x-w/2,y+h]]; }
    function arch(x,y,w,h) { const p=[[x-w/2,y],[x+w/2,y],[x+w/2,y+h-w/2]];for(let i=1;i<=16;i++){const a=i*Math.PI/16;p.push([x+Math.cos(a)*w/2,y+h-w/2+Math.sin(a)*w/2]);}return p; }
    function circle(x,y,r) { return Array.from({length:48},(_,i)=>[x+r*Math.cos(i*Math.PI/24),y+r*Math.sin(i*Math.PI/24)]); }
    // A wall is an extruded polygon with actual holes. Collision uses separate plain boxes,
    // never the AABB of the holed wall (which would close the entrance).
    function wall(poly,holes,x,z,ry=0) { const s=new THREE.Shape(poly.map(p=>new THREE.Vector2(...p)));holes.forEach(p=>s.holes.push(new THREE.Path(p.slice().reverse().map(v=>new THREE.Vector2(...v)))));const o=mesh(new THREE.ExtrudeGeometry(s,{depth:.32,bevelEnabled:false,curveSegments:16}),M.plaster,x,0,z);o.rotation.y=ry;return o; }
    function opening(points,x,z,ry=0,round=false,out=1) {
      const a=points.map(p=>new THREE.Vector3(p[0],p[1],0));a.push(a[0].clone());
      const o=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(a,false,'catmullrom',0),64,round?.105:.075,6,false),round?M.brass:M.honey,x,0,z);o.rotation.y=ry;
      const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
      const cx=(minX+maxX)/2,cy=(minY+maxY)/2,w=maxX-minX,h=maxY-minY;
      const transform=(u,v,depth)=>[x+u*Math.cos(ry)+depth*out*Math.sin(ry),v,z-u*Math.sin(ry)+depth*out*Math.cos(ry)];
      const view=mesh(new THREE.PlaneGeometry(w+.45,h+.45),kit.view(),...transform(cx,cy,.52),{prop:true});view.rotation.y=ry+(out>0?Math.PI:0);
      view.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,opacity:0,alphaTest:.5});
      // Glass is clipped to the very same opening, and does not block the camera.
      const sh=new THREE.Shape(points.map(p=>new THREE.Vector2(...p))),gl=mesh(new THREE.ShapeGeometry(sh),kit.glass(),x,0,z,{camThrough:true});gl.rotation.y=ry+(out>0?Math.PI:0);gl.scale.x=out>0?-1:1;
      for(const dims of [[cx,cy,.055,h],[cx,cy,w,.055]]){const q=box(...transform(dims[0],dims[1],-.04),dims[2],dims[3],.10,M.oak);q.rotation.y=ry;}
      const sill=box(...transform(cx,minY-.10,-.10),w+.3,.16,.48,M.honey);sill.rotation.y=ry;
      if(round)for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(...transform(cx+Math.cos(a)*(w/2+.03),cy+Math.sin(a)*(w/2+.03),-.10),.055,M.copper);}
    }
    function gear(x,y,z,r,n=12) { ring(x,y,z,r*.74,r*.14,M.brass);for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const o=box(x+Math.cos(a)*r*.95,y+Math.sin(a)*r*.95,z,r*.28,r*.21,.11,M.copper);o.rotation.z=a;}for(let i=0;i<5;i++){const a=i*Math.PI*2/5;beam([x,y,z],[x+Math.cos(a)*r*.68,y+Math.sin(a)*r*.68,z],.04,M.brass);}ball(x,y,z+.08,r*.17,M.dark); }
    function planter(x,y,z,s=1) { const p=mesh(new THREE.CylinderGeometry(.26*s,.19*s,.42*s,8),S.ceramic,x,y+.21*s,z);p.userData.solid=true;for(let j=0;j<7;j++){const a=j*2.4;beam([x,y+.4*s,z],[x+Math.sin(a)*.25*s,y+(.7+j%3*.1)*s,z+Math.cos(a)*.25*s],.025*s,M.leaf);ball(x+Math.sin(a)*.25*s,y+(.72+j%3*.1)*s,z+Math.cos(a)*.25*s,.16*s,j%3?M.leaf:S.violetPetal,1,.6,1);} }
    function shade(x,y,z,r=.36) {
      mesh(new THREE.CylinderGeometry(r*.3,r,.24,16,1,true),S.hood,x,y+.072,z);
      mesh(new THREE.CylinderGeometry(Math.min(r*.74,.16),Math.min(r*.74,.16),.016,16),S.diff,x,y+.03,z);
      mesh(new THREE.CylinderGeometry(.07,.09,.08,10),M.brass,x,y+.22,z);
    }
    function lamp(x,y,z,top,r=.36) {
      shade(x,y,z,r);beam([x,y+.26,z],[x,top,z],.016,M.dark);box(x,top-.018,z,.14,.035,.14,M.brass);
    }
    function taskLamp(x,y,z) {
      mesh(new THREE.CylinderGeometry(.16,.18,.04,12),M.brass,x+.23,y-.32,z);
      beam([x+.23,y-.30,z],[x+.23,y+.18,z],.023,M.copper);beam([x+.23,y+.18,z],[x,y+.26,z],.023,M.copper);shade(x,y,z,.22);
    }
    function table(x,y,z,w,d) { mesh(kit.rbox(w,.16,d,.055),M.honey,x,y+1,z,{solid:true});for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.14),y+.45,z+b*(d/2-.14),.14,.9,.14,M.oak,true); }
    function chest(x,y,z,w=1.3) { box(x,y+.4,z,w,.8,.75,M.oak,true);for(const a of [-1,1])box(x+a*w*.35,y+.42,z+.4,.07,.72,.05,M.brass);box(x,y+.72,z,w+.08,.12,.84,M.honey);box(x,y+.46,z+.43,.19,.09,.05,M.dark); }
    // Expanded from the exterior's asymmetric volumes: tall cottage on the LEFT,
    // one-storey shed on the RIGHT; front is +Z. Two arch windows upstairs, no invented tower floor.
    floor(0,0,15,10,0,M.stone);
    for(let i=0;i<15;i++)for(let j=0;j<10;j++)box(-7+i,-.008,-4.5+j,.94,.025,.94,(i+j)%5===0?S.floorTile:M.stone);
    const frontMain=[[-7.5,0],[1,0],[1,7.1],[-3.25,10.4],[-7.5,7.1]];
    const winFront=arch(-5.9,1.1,1.65,2),winBack=arch(-4,1.2,1.9,2.05),up=arch(-3.25,7.3,1.9,2.1),door=arch(-2.7,0,2.1,3.1);
    wall(frontMain,[winFront,up,door],0,5);wall(frontMain,[winBack,up],0,-5.32);
    opening(winFront,0,5);opening(up,0,5);opening(winBack,0,-5.32,0,false,-1);opening(up,0,-5.32,0,false,-1);
    const doorShape=new THREE.Shape(door.map(p=>new THREE.Vector2(...p)));mesh(new THREE.ExtrudeGeometry(doorShape,{depth:.12,bevelEnabled:false}),M.honey,0,0,5.08,{solid:true});
    for(const y of [.65,2.05])box(-3.15,y,5.02,.7,.08,.06,M.dark);ring(-2.05,1.35,4.98,.10,.025,M.brass);box(-2.7,2.45,5.01,.32,.32,.04,M.brass).rotation.z=Math.PI/4;
    // Wall-side arch apertures: one west, one east, exactly as on the exterior.
    const side=arch(1.3,1.35,2,2.05);wall(rect(0,0,10,7.1),[side],-7.82,0,Math.PI/2);opening(side,-7.5,0,Math.PI/2,false,-1);
    const east=arch(0,1.25,1.8,1.95);wall(rect(0,0,10,4.3),[east],7.5,0,Math.PI/2);opening(east,7.5,0,Math.PI/2);
    const wing=[ [1,0],[7.5,0],[7.5,4.3],[1,6.5] ],port=circle(4.35,2.35,1.38);
    wall(wing,[port],0,5);wall(wing,[port],0,-5.32);opening(port,0,5,0,true);opening(port,0,-5.32,0,true,-1);
    cols.push([-7.82,0,-5.32,-7.5,7.1,5.32],[7.5,0,-5.32,7.82,4.3,5.32],[-7.5,0,-5.32,7.5,7.1,-5],[-7.5,0,5,-3.75,7.1,5.32],[-1.65,0,5,7.5,7.1,5.32]);
    // Honey timber framing and front/rear gable braces, kept away from the stair lane.
    for(const z of [-4.94,4.94]){
      for(const x of [-7.36,.85,7.35])box(x,x>1?2.1:3.5,z,.22,x>1?4.2:7,.22,M.oak);
      for(const y of [3.8,7.05])box(-3.25,y,z,8.45,.18,.18,M.oak);
      if(z<0)box(-3.25,.45,z,8.45,.18,.18,M.oak);else{box(-5.6,.45,z,3.7,.18,.18,M.oak);box(-.35,.45,z,2.5,.18,.18,M.oak);}
      box(4.2,.45,z,6.3,.18,.18,M.oak);beam([1,6.4,z],[7.5,4.25,z],.12,M.oak);
      beam([-7.5,7.1,z],[-3.25,10.4,z],.15,M.honey);beam([-3.25,10.4,z],[1,7.1,z],.15,M.honey);
    }
    // Upper slabs explicitly leave a 2.2 m wide stair opening; undersides and joists are visible.
    floor(-1.65,0,6.7,10,4);floor(-6.25,-3.9,2.5,2.2,4);floor(-6.25,4.7,2.5,.6,4);
    // The tall cottage's east wall continues above the lower shed roof.
    box(.99,5.55,0,.30,3.1,10,M.plaster,true);box(.8,7.02,0,.18,.18,10,M.oak);
    for(const z of [-4.8,0,4.8])box(.79,5.55,z,.18,3.1,.18,M.honey);
    for(const z of [-4.6,-3.2,-1.8,-.4,1,2.4,3.8])box(-1.65,3.72,z,6.7,.28,.17,M.oak);
    for(let i=0;i<17;i++)box(-4.8+i*.34,4.012,0,.018,.016,9.85,M.honey);
    // 4 m rise / 6.8 m run = 30.5 degrees, 20 visible risers of 0.2 m.
    const stairX=-6.25,lo=4,hi=-2.8;
    const ramp=mesh(new THREE.PlaneGeometry(1.85,Math.hypot(6.8,4)),M.floor,stairX,2,.6,{walk:true});ramp.rotation.x=-Math.PI/2-Math.atan2(4,6.8);ramp.visible=false;
    // Plane local +Y points toward -Z with this rotation; use +atan for a rising -Z slope.
    ramp.rotation.x=-Math.PI/2+Math.atan2(4,6.8);
    for(let i=0;i<20;i++)box(stairX,(i+.5)*.2,lo-(i+.5)*.34,1.85,.2,.35,M.honey);
    for(const x of [-7.25,-5.22]){beam([x,.95,4],[x,4.95,-2.8],.06,M.oak);for(let i=0;i<=10;i++)beam([x,i*.4,4-i*.68],[x,.95+i*.4,4-i*.68],.04,M.honey);}
    // Gallery guarding beside the opening; no full sloping AABB (it would block the stair).
    box(-5.03,5,.6,.14,.13,6.8,M.oak,true);box(-5.03,4.15,.6,.10,.12,6.8,M.honey);for(let i=0;i<12;i++)box(-5.03,4.55,-2.6+i*.58,.08,1.1,.08,M.honey);
    box(-6.25,5,4.35,2.5,.13,.14,M.oak,true);for(let i=0;i<5;i++)box(-7.25+i*.5,4.55,4.35,.08,1.1,.08,M.honey);
    // Inside faces of the same terracotta roofs; the main loft retains 3.1 m at the eaves.
    function roof(a,b,z,d) {const dx=b[0]-a[0],dy=b[1]-a[1],o=box((a[0]+b[0])/2,(a[1]+b[1])/2,z,Math.hypot(dx,dy),.24,d,M.roof);o.rotation.z=Math.atan2(dy,dx);return o;}
    roof([-7.65,7.1],[-3.25,10.5],0,10.6);roof([-3.25,10.5],[1.12,7.1],0,10.6);
    // The cupola is a recessed brass daylight instrument in the shed roof, not a new room.
    const sy=x=>6.5-(x-1)*2.25/6.65;
    roof([1,sy(1)],[3.6,sy(3.6)],0,10.6);roof([5.4,sy(5.4)],[7.65,sy(7.65)],0,10.6);
    roof([3.6,sy(3.6)],[5.4,sy(5.4)],-3.85,2.9);roof([3.6,sy(3.6)],[5.4,sy(5.4)],2.35,5.9);
    for(const z of [-4.6,-2.3,0,2.3,4.6]){beam([-7.5,7.03,z],[-3.25,10.35,z],.10,M.oak);beam([-3.25,10.35,z],[1,7.03,z],.10,M.oak);beam([1,6.37,z],[7.5,4.17,z],.09,M.oak);}
    const dome=mesh(new THREE.SphereGeometry(1.3,20,10,0,Math.PI*2,0,Math.PI/2),M.brass,4.5,5.5,-1.5);dome.material=S.brassDome;
    const dr=ring(4.5,5.5,-1.5,1.3,.085,M.copper);dr.rotation.x=Math.PI/2;
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])ball(4.5+Math.sin(a)*1.1,5.9,-1.5+Math.cos(a)*1.1,.19,M.cyan);
    // Workbench, hand-crank lamp and real dimensional gears underneath the rear porthole.
    table(4.35,0,-4,4.1,1.35);for(const x of [2.85,5.85])chest(x,0,-4.05,1.15);
    box(4.35,1.11,-3.95,1.2,.035,.65,S.paper);gear(3.7,1.22,-3.55,.25);gear(4.3,1.22,-3.55,.18);
    pipe([[1.55,1,-4.7],[1.55,3.8,-4.7],[2,4.1,-4.7],[3,4.1,-4.7],[3,3.3,-4.7],[3.5,3.2,-4.7]]);
    for(const x of [1.55,2.1]){mesh(new THREE.CylinderGeometry(.22,.22,.8,12),M.copper,x,2.1,-4.65);ball(x,2.1,-4.36,.15,M.cyan);ring(x,2.1,-4.33,.17,.035,M.brass);}
    gear(2.7,2.7,-4.73,.4);gear(3.24,3.2,-4.73,.28);gear(2.42,3.37,-4.73,.23);
    taskLamp(5.5,1.42,-3.9);beam([5.75,1.3,-3.8],[6.05,1.55,-3.8],.04,M.copper);beam([6.05,1.55,-3.8],[6.05,1.55,-3.5],.07,M.dark);
    // Tool rack and blueprint board; each peg is geometry rather than a photograph.
    box(7.23,2.15,2.85,.13,1.8,2.8,M.oak);for(let j=0;j<5;j++){const z=1.8+j*.48;beam([7.1,2.55,z],[7.1,1.8,z],.035,M.brass);ring(7.1,2.6,z,.1,.025,M.dark,Math.PI/2);}
    box(-.5,2.1,-4.8,2.1,1.45,.1,M.oak);box(-.5,2.1,-4.72,1.9,1.25,.06,M.board);
    const graph=[[-1.3,1.7,-4.67],[-.95,1.95,-4.67],[-.6,1.9,-4.67],[-.25,2.35,-4.67],[.25,2.55,-4.67]];for(let i=0;i<4;i++)beam(graph[i],graph[i+1],.014,S.paper);
    table(6.35,0,3.85,1.45,1.1);for(let i=0;i<4;i++)box(6.35,1.15+i*.12,3.85,.7,.1,.5,i%2?S.cyanCover:S.paper);
    taskLamp(6.35,1.85,3.85);beam([6.6,1.65,3.85],[6.9,1.85,3.85],.04,M.copper);beam([6.9,1.85,3.85],[6.9,1.85,3.55],.06,M.dark);
    // Living area: repaired sofa, stove/chimney, low rug, tea table and parts library.
    box(-.7,.43,2.4,1.9,.7,1.1,M.oak,true);mesh(kit.rbox(2,.9,.26,.10),M.pink,-.7,.87,2.72,{solid:true});mesh(kit.rbox(1.7,.24,.85,.10),M.cream,-.7,.85,2.2);for(const x of [-1.55,.15])mesh(kit.rbox(.2,.65,1.1,.055),M.honey,x,.85,2.25,{solid:true});
    mesh(kit.rbox(.5,.46,.18,.075),M.lavender,-1.1,1.1,2.48);mesh(kit.rbox(.5,.46,.18,.075),M.rug,-.3,1.1,2.48);
    box(-2.7,.02,1.3,3.3,.035,2.2,M.rug);for(const x of [-4.25,-1.15])box(x,.045,1.3,.08,.025,2.1,M.cream);
    mesh(kit.rbox(1.2,.16,.8,.08),M.honey,-3.7,.35,1.3);for(const x of [-4.1,-3.3])box(x,.15,1.3,.12,.3,.5,M.oak);ball(-3.7,.53,1.3,.14,S.ceramic,1,.7,1);ring(-3.51,.53,1.3,.07,.018,S.ceramic,Math.PI/2);   // 茶几往左：入口正前方留走道
    box(.35,.7,-4.3,1.15,1.4,1.15,M.stone,true);box(.35,.64,-3.7,.8,.65,.03,M.dark);box(.35,.6,-3.67,.42,.3,.04,M.lamp);box(.35,2.65,-4.3,.5,2.6,.5,M.stone,true);
    for(let j=0;j<4;j++){box(-2,1+j*.62,-4.7,2,.13,.55,M.honey);for(let k=0;k<5;k++)box(-2.75+k*.34,1.23+j*.62,-4.65,.25,.34,.36,(k+j)%3?S.paper:M.lavender);}
    chest(-4.15,0,-3.9);planter(-4.5,0,4.5,.9);planter(6.75,0,-4.3,.9);planter(2,0,4.25,1.1);
    // Attic is a real bedroom plus drawing nook, not another copy of the workshop.
    box(-2.2,4.28,-3.5,2.1,.56,2.7,M.oak,true);mesh(kit.rbox(2,.22,2.6,.10),M.cream,-2.2,4.65,-3.5,{solid:true});mesh(kit.rbox(2,.12,1.9,.055),M.lavender,-2.2,4.81,-3.15);for(const x of [-2.72,-1.68])mesh(kit.rbox(.84,.24,.5,.10),M.pink,x,4.86,-4.35);box(-2.2,4.8,-4.85,2.15,1.3,.14,M.honey,true);
    table(-3.25,4,3.8,2.5,1.1);box(-3.25,5.11,3.8,1.35,.035,.7,S.paper);gear(-3.7,5.2,3.65,.16,10);taskLamp(-2.3,5.42,3.8);
    chest(-.15,4,-3.6,1.1);planter(-4.4,4,-4.3,.85);planter(-4.3,4,4.4,.8);
    // Wall-mounted inventions: the loft's broad plaster panels carry Rayne's own sketches.
    for(const [x,z] of [[-4.35,-4.83],[-.65,4.83]]){
      box(x,6.05,z,1.4,.95,.10,M.oak);box(x,6.05,z+(z<0?.07:-.07),1.24,.79,.035,S.paper);
      const front=z+(z<0?.11:-.11);gear(x-.22,6.12,front,.24,10);gear(x+.27,5.99,front,.16,8);
      beam([x-.5,5.8,front],[x+.5,5.8,front],.012,M.board);
    }
    box(-5,5.85,4.78,1.1,.12,.4,M.honey);planter(-5,5.91,4.7,.55);
    box(-1.3,4.03,.25,3,.04,2.4,M.lavender);for(let i=0;i<6;i++)box(-4.75,5.1+i*.22,-3.5,.12,.15,1.8,i%2?M.honey:S.paleWood);
    // The windmill's shaft and gear train terminate at the loft front, matching its exterior site.
    beam([-3.55,7.6,2],[-3.55,10.2,2],.075,M.copper);gear(-3.55,7.5,2,.48);gear(-2.87,7.35,2,.25);
    // Round two: honey timber, repair marks and collected inventions, following Rayne's concept.
    // Keep the west stair, host's metre of clearance and all gift/interaction footprints intact.
    function soft(x,y,z,w,h,d,m,solid=false){return mesh(kit.rbox(w,h,d,Math.min(.065,w*.24,h*.45,d*.24)),m,x,y,z,solid?{solid:true}:null);}
    function cyl(x,y,z,r,h,m,r2=r){return mesh(new THREE.CylinderGeometry(r,r2,h,10),m,x,y,z);}
    function book(x,y,z,w=.24,h=.48,m=M.lavender,flat=false){
      m = covers.get(m) || m;
      if(flat){soft(x,y+.055,z,w,.11,h,m);box(x,y+.055,z+.015,w*.9,.065,h*.94,S.paper);box(x-w*.46,y+.055,z,.025,.11,h,m);}
      else{box(x,y+h/2,z,w,h,.32,m);box(x,y+h/2,z+.17,w*.7,h*.88,.015,S.paper);for(const dy of [.08,h-.09])box(x,y+dy,z+.185,w*.8,.018,.012,M.brass);}
    }
    function crate(x,y,z,w=1,h=.68,d=.7){
      box(x,y+h/2,z,w,h,d,M.oak,true);
      for(let j=0;j<4;j++)box(x-w/2+(j+.5)*w/4,y+h/2,z+d/2+.012,w/4-.025,h-.05,.035,M.honey);
      for(const dx of [-1,1]){box(x+dx*(w/2-.07),y+h/2,z+d/2+.045,.09,h+.04,.055,M.oak);for(const dy of [.09,h-.09])ball(x+dx*(w/2-.07),y+dy,z+d/2+.082,.028,M.brass);}
      beam([x-w*.38,y+.12,z+d/2+.09],[x+w*.38,y+h-.12,z+d/2+.09],.035,M.oak);
      for(const dz of [-1,1])box(x,y+h,z+dz*(d/2-.06),w+.05,.07,.12,M.honey);
    }
    function stool(x,y,z){
      cyl(x,y+.58,z,.38,.14,M.honey);soft(x,y+.68,z,.59,.12,.59,M.rug);
      for(const a of [0,Math.PI*2/3,Math.PI*4/3]){const dx=Math.sin(a),dz=Math.cos(a);beam([x+dx*.32,y+.05,z+dz*.32],[x+dx*.23,y+.54,z+dz*.23],.065,M.oak).userData.solid=true;}
      const foot=ring(x,y+.24,z,.28,.025,M.brass);foot.rotation.x=Math.PI/2;
    }
    function cup(x,y,z){cyl(x,y+.07,z,.09,.14,S.ceramic);cyl(x,y+.145,z,.073,.008,S.tea);ring(x+.105,y+.08,z,.053,.015,S.ceramic);cyl(x,y+.008,z,.14,.016,M.brass);}
    function jar(x,y,z,s=1){cyl(x,y+.16*s,z,.13*s,.32*s,M.copper);cyl(x,y+.34*s,z,.145*s,.045*s,M.brass);box(x,y+.17*s,z+.13*s,.15*s,.12*s,.015,S.paper);}
    function scroll(x,y,z){const o=cyl(x,y+.08,z,.08,.52,S.paper);o.rotation.z=Math.PI/2;box(x,y+.08,z,.055,.17,.17,M.rug);}
    function vine(a,b,n=12,flowers=false){
      beam(a,b,.018,M.leaf);
      for(let j=0;j<n;j++){const t=(j+.5)/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;
        ball(x+(j%2?.14:-.14),y,z,.16,M.leaf,1,.48,.7);
        if(flowers&&j%3===0)for(let k=0;k<4;k++)ball(x+.06*Math.sin(k*2),y-.10-k*.105,z+.06*Math.cos(k*2),.065,S.violetPetal,1,1.1,1);
      }
    }
    function curtain(x,y,z,w,h,ry=0){
      const pt=(u,v,d)=>[x+u*Math.cos(ry)+d*Math.sin(ry),y+v,z-u*Math.sin(ry)+d*Math.cos(ry)];
      beam(pt(-w/2-.3,h+.16,0),pt(w/2+.3,h+.16,0),.035,M.brass);
      for(const side of [-1,1]){for(let j=0;j<3;j++){const q=soft(...pt(side*(w/2+.12)+j*.07-.07,h/2,-.05),.115,h,.16,M.cream);q.rotation.y=ry;}const q=box(...pt(side*(w/2+.12),h*.37,-.16),.30,.09,.06,M.rug);q.rotation.y=ry;}
    }
    // Wainscot stops at the door. Small joints and corbels break up broad plaster surfaces.
    for(const [xa,xb,z] of [[-7.3,-3.9,4.83],[-1.5,7.3,4.83],[-7.3,7.3,-4.83]]){
      box((xa+xb)/2,.48,z,xb-xa,.75,.075,M.honey);for(const y of [.09,.91])box((xa+xb)/2,y,z-.025,xb-xa,.09,.12,M.oak);
      for(let x=xa+.18;x<xb;x+=.42)box(x,.48,z-.045,.025,.70,.045,M.oak);
    }
    for(const x of [-7.39,7.39])for(const z of [-3.8,2.85]){
      box(x,2,z,.16,3.8,.18,M.oak);beam([x,3.5,z],[x,3.06,z+.56],.07,M.honey);
    }
    for(const z of [-4.82,4.82]){
      for(const x of [-6.6,-.15])beam([x,3.65,z],[x+(x<-3?.6:-.6),3.05,z],.085,M.oak);
      box(-2.1,4.65,z,5.8,.74,.075,M.honey);for(const y of [4.1,5.05])box(-2.1,y,z,5.8,.09,.10,M.oak);
      for(let x=-4.8;x<.6;x+=.4)box(x,4.65,z-.02,.022,.70,.10,M.oak);
    }
    for(const y of [4.12,5.05,6.94])box(.76,y,0,.1,.085,9.65,M.honey);
    // Fine ceiling boards sit just under the original roof; the structural slopes are untouched.
    for(const [a,b] of [[[-7.5,7.1],[-3.25,10.4]],[[-3.25,10.4],[1,7.1]],[[1,6.5],[7.5,4.3]]]){
      const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/.32);
      for(let j=1;j<n;j++){const t=j/n;box(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-.14,0,.025,.035,9.9,M.honey);}
    }
    // 銅罩只露出內縮擴散片，小車桌保留最亮的工作光。
    for(const p of [[-3,2.85,.3,3.74],[4,3.9,.6,5.3583],[-2,6.3,.4,9.2719],[4.5,4.3,-1.5,6.8],[-2,2.598,-1.95,3.74]])lamp(...p);
    // Layered ochre workshop rug: bound edge and fringe, flat enough to walk across.
    soft(4.35,.018,1.25,3.35,.03,2.65,M.rug);soft(4.35,.038,1.25,3.08,.015,2.38,M.cream);soft(4.35,.049,1.25,2.88,.012,2.18,M.rug);
    for(const z of [-.1,2.6])for(let j=0;j<17;j++)box(2.84+j*.19,.025,z,.055,.025,.22,S.honeyThread);
    for(const z of [.24,2.36])box(4.35,.058,z,2.72,.01,.045,S.honeyThread);
    // The workbench reads as joinery rather than a slab: apron, drawer pulls and small tools.
    box(4.35,.83,-3.32,4.04,.29,.10,M.oak);
    for(const x of [2.9,5.8]){soft(x,.67,-3.28,.94,.52,.13,M.honey);for(const y of [.52,.78]){box(x,y,-3.19,.82,.025,.025,M.oak);ring(x,y+.04,-3.16,.065,.014,M.dark);}}
    soft(4.4,1.097,-4.02,.50,.025,1.2,M.rug);
    for(let i=0;i<3;i++){book(6.0,1.09+i*.12,-4.1,.64,.48,[M.lavender,M.cream,M.rug][i],true);}
    cup(5.15,1.09,-4.25);jar(2.7,1.09,-4.25,.8);scroll(4.3,1.10,-4.45);
    cyl(3.0,1.30,-3.85,.16,.40,M.oak);
    for(let i=0;i<4;i++){const x=2.9+i*.07;beam([x,1.27,-3.85],[x-.05,1.92-i*.09,-3.85],.025,M.dark);soft(x-.05,1.90-i*.09,-3.85,.09,.19,.08,M.honey);}
    soft(4.8,1.20,-3.57,.47,.17,.24,M.copper);box(4.8,1.37,-3.57,.45,.13,.08,M.dark);beam([4.8,1.16,-3.55],[4.8,.82,-3.15],.028,M.brass);ring(4.8,.87,-3.14,.08,.018,M.brass);
    for(let i=0;i<4;i++){const nut=ring(3.9+i*.13,1.145,-4.18,.045,.015,M.brass);nut.rotation.x=Math.PI/2;}
    stool(4.35,0,-4.1); // tucked under the bench; front interaction floor remains clear.
    // Pipe compression bands, clamps and two easily readable gauge needles.
    for(const x of [1.55,2.1])for(const y of [1.78,2.42]){cyl(x,y,-4.65,.24,.06,M.brass);for(let k=0;k<4;k++)ball(x+Math.sin(k*Math.PI/2)*.24,y,-4.65+Math.cos(k*Math.PI/2)*.24,.028,M.brass);}
    for(const [x,y] of [[1.55,2.1],[2.1,2.1]]){ball(x,y,-4.31,.12,S.paper,1,1,.12);beam([x,y,-4.285],[x+.065,y+.06,-4.285],.012,M.dark);}
    // North-east parts library; rotated shelves keep every object against the wall.
    for(let row=0;row<4;row++){
      const y=.55+row*.7;box(7.12,y,-2.25,.58,.10,2.4,M.honey,true);
      for(const z of [-3.25,-1.25])box(7.14,1.58,z,.12,2.65,.10,M.oak,true);
      for(let k=0;k<3;k++){const start=g.children.length;book(0,y+.06,0,.2,.33+(k%2)*.14,k%2?M.lavender:M.rug);for(const o of g.children.slice(start)){const xx=o.position.x,zz=o.position.z;o.position.x=7.12-zz;o.position.z=-3+k*.4+xx;o.rotation.y=-Math.PI/2;}}
      jar(6.94,y+.07,-1.55,.8);
    }
    // Reuse the lower library's spaces with spools and labelled parts instead of identical books.
    for(let row=0;row<3;row++){jar(-1.35,1.08+row*.62,-4.58,.65);book(-2.4,1.08+row*.62,-4.48,.17,.41+row*.03,M.rug);}
    crate(1.75,0,-4.15,.88,.74,.8);crate(1.75,.74,-4.15,.72,.52,.66);
    crate(6.7,0,4.35,.95,.72,.72);for(let j=0;j<3;j++)gear(6.5+j*.18,.85,4.29,.11,8);
    const barrel=cyl(7.0,.46,2.9,.36,.88,M.honey,.31);barrel.userData.solid=true;
    for(const y of [.15,.69,.87]){const q=ring(7,y,2.9,.36,.025,M.copper);q.rotation.x=Math.PI/2;}
    for(let j=0;j<10;j++){const a=j*Math.PI/5;beam([7+.35*Math.sin(a),.08,2.9+.35*Math.cos(a)],[7+.35*Math.sin(a),.85,2.9+.35*Math.cos(a)],.011,M.oak);}
    // Thin wall-hung ledges, rolled drawings and sketches fill gaps without narrowing circulation.
    for(const [x,y,z,w] of [[2.05,3.15,4.75,1.45],[6.3,3.42,-4.75,1.5],[-.2,2.8,4.78,1.6]]){
      box(x,y,z,w,.12,.4,M.honey);for(const dx of [-.38,.38])beam([x+dx,y-.32,z+.05],[x+dx,y,z-.17],.04,M.oak);jar(x-.35,y+.07,z-.05,.7);scroll(x+.30,y+.08,z-.05);
    }
    for(const x of [-6.65,-5.75]){box(x,2.6,-4.79,.66,.83,.07,M.honey);box(x,2.6,-4.73,.54,.71,.025,S.paper);gear(x,2.63,-4.69,.16,8);}
    for(const x of [-1.45,-.15]){soft(x,1.17,2.46,.46,.05,.035,M.cream);for(let j=0;j<3;j++)box(x-.12+j*.12,1.19,2.435,.018,.10,.025,M.rug);}
    cup(-4.02,.44,1.3);book(-3.43,.44,1.35,.42,.4,M.lavender,true);   // 跟著茶几往左 0.9 m
    // Attic bedding, headboard slats and bedside drawer stay on the bed side of the path.
    for(let j=0;j<7;j++)box(-3.1+j*.3,4.92,-4.75,.075,1.1,.08,M.oak);
    soft(-2.2,4.9,-2.65,2.02,.10,.46,M.rug);for(const x of [-3.1,-1.3])box(x,4.96,-2.65,.035,.015,.43,M.cream);
    soft(-.55,4.43,-2.7,.65,.86,.65,M.honey,true);soft(-.55,4.89,-2.7,.74,.09,.72,M.oak);ring(-.55,4.55,-2.32,.055,.014,M.brass);cup(-.55,4.95,-2.7);
    book(-2.9,5.14,3.93,.54,.44,M.rug,true);cup(-3.85,5.09,3.72);scroll(-3.35,5.13,4.12);soft(-3.6,5.10,3.8,.30,.018,.92,M.lavender);
    for(const x of [-4.1,-2.4])box(x,4.8,3.36,.58,.33,.06,M.honey);
    stool(-3.25,4,4.18);
    for(let row=0;row<3;row++){box(.48,4.55+row*.62,-.75,.45,.09,2.05,M.honey,true);for(let j=0;j<4;j++){const z=-1.5+j*.42;box(.48,4.78+row*.62,z,.28,.35+(j%2)*.10,.28,[S.paper,M.rug,M.lavender][j%3]);box(.30,4.79+row*.62,z,.015,.02,.19,M.brass);}}
    for(const z of [-1.73,.23])box(.53,5.18,z,.09,1.5,.08,M.oak,true);
    for(const z of [-.92,1.42])box(-1.3,4.06,z,2.9,.015,.07,M.cream);
    // Window curtains remain outside the true aperture. Violet trails soften beams and railing.
    curtain(-5.9,1.12,4.7,1.65,1.95);curtain(-4,1.2,-4.7,1.9,2,-Math.PI);
    curtain(-3.25,7.3,4.72,1.9,2);curtain(-3.25,7.3,-4.72,1.9,2,Math.PI);
    for(const [x,y,z,w] of [[4.35,1.02,4.66,1.7],[4.35,1.02,-4.65,1.7],[-3.25,7.18,4.7,1.45]]){
      soft(x,y,z,w,.19,.34,M.honey);for(const dx of [-.52,0,.52])planter(x+dx,y+.1,z,.45);
    }
    for(const [a,b] of [[[-5.04,5.12,-2],[-5.04,5.12,2.6]],[[-.1,3.6,4.64],[2.3,3.6,4.64]],[[6.9,3.8,-4.6],[5.8,3.65,-4.6]],[[-4.65,8.7,4.65],[-4.65,6.45,4.65]]])vine(a,b,12,true);
    for(const [x,y,z,top] of [[6.65,3.1,3,4.4],[-4.3,6.7,4.45,8.8]]){planter(x,y,z,.65);for(const dx of [-.16,.16])beam([x+dx,y+.3,z],[x,top,z],.014,M.dark);vine([x,y+.45,z],[x,y-.8,z],7,true);}
    // A shallow, floor-supported drawing rack replaces the impression of floating loft books.
    for(const z of [-4.46,-2.54])box(-4.77,5.13,z,.10,2.25,.10,M.oak,true);
    for(let j=0;j<6;j++)box(-4.77,5.0+j*.22,-3.5,.35,.055,2,M.honey);
    const basket=cyl(-.4,.23,4.4,.31,.44,M.honey,.25);
    for(const y of [.1,.2,.3,.4]){const rim=ring(-.4,y,4.4,.31,.015,S.paleWood);rim.rotation.x=Math.PI/2;}
    ring(-.4,.55,4.4,.25,.02,M.oak);
    for(let j=0;j<3;j++){const o=cyl(-.55+j*.15,.69,4.4,.055,.70,S.paper);o.userData.solid=true;ring(-.55+j*.15,1.045,4.4,.041,.01,M.oak).rotation.x=Math.PI/2;}
    for(const side of [-1,1]){const page=box(-3.55+side*.147,5.155,4.05,.285,.035,.39,S.paper);page.rotation.z=side*.06;for(let j=0;j<4;j++)box(-3.55+side*.147,5.178,3.93+j*.075,.20,.007,.01,M.board);}
    box(-3.55,5.179,4.05,.015,.015,.4,M.rug);
    // Final density pass: a bound hall runner and the next windmill's bedside drawing.
    soft(-.4,.016,-1.6,2.55,.025,2.75,M.rug);soft(-.4,.036,-1.6,2.31,.014,2.51,M.cream);soft(-.4,.048,-1.6,2.13,.011,2.33,M.rug);
    for(const z of [-3.02,-.18])for(let j=0;j<12;j++)box(-1.5+j*.20,.025,z,.045,.025,.16,S.honeyThread);
    box(-2.2,6.22,-4.91,1.42,1.12,.065,M.oak);box(-2.2,6.22,-4.865,1.26,.96,.026,S.paper);
    for(let j=0;j<4;j++){const a=j*Math.PI/2+.35;beam([-2.2,6.3,-4.84],[-2.2+Math.cos(a)*.4,6.3+Math.sin(a)*.4,-4.84],.04,M.copper);}
    ball(-2.2,6.3,-4.82,.065,M.brass);beam([-2.2,6.22,-4.84],[-2.2,5.88,-4.84],.025,M.board);
    for(const x of [-2.66,-2.45,-2.24])box(x,5.83,-4.84,.15,.012,.012,M.board);
    // Round three: clustered repair projects occupy the floor; the main cross aisle,
    // west stair, gift squares and the metre around every interaction stay clear.
    function vignette(name,fn,dz=0){const start=g.children.length;fn();for(const o of g.children.slice(start)){o.position.z+=dz;o.userData.corner=name;}}
    function cabinet(x,y,z,w,h,d){
      soft(x,y+h/2,z,w,h,d,M.oak,true);soft(x,y+h+.045,z,w+.06,.09,d+.06,M.honey,true);
      for(let j=0;j<3;j++){soft(x,y+.14+(h-.22)*j/2,z+d/2+.025,w-.12,.19,.055,M.floorShade);ring(x,y+.15+(h-.22)*j/2,z+d/2+.07,.055,.014,M.brass);}
    }
    // Weathered oak in the loft; subtle board variation shares the existing neutral palette.
    for(let j=0;j<24;j++)box(-1.65,4.008,-4.79+j*.414,6.67,.012,.397,j%4===0?M.floorShade:M.floor);
    vignette('樓梯下的回收零件站',()=>{
      cabinet(-6.23,0,-1.5,1.72,1.18,2.4);
      crate(-6.9,0,.25,.65,.62,.72);crate(-5.65,0,.15,.63,.79,.8);
      crate(-6.65,1.27,-1.75,.70,.52,.75);jar(-5.95,1.27,-1.35,1.2);
      for(const [x,z,r] of [[-6.7,-.7,.23],[-6.25,-.9,.3],[-5.8,-.7,.17]])gear(x,1.38,z,r,10);
      scroll(-6.1,1.28,-2.3);planter(-7.03,0,-2.85,.85);
      cabinet(-6.25,0,-4.15,2.02,1.32,1.06);crate(-6.65,1.41,-4.12,.65,.47,.65);jar(-5.75,1.41,-4.1,1.1);
      for(const x of [-6.85,-5.85]){const o=cyl(x,.36,1.1,.43,.72,M.honey,.37);o.userData.solid=true;for(const y of [.12,.58])ring(x,y,1.1,.43,.026,M.copper).rotation.x=Math.PI/2;scroll(x,.76,1.1);}
    });
    vignette('中央小車拆修桌',()=>{
      table(-2,0,-1.65,2.3,2.0);cabinet(-2,0,-1.65,1.58,.78,1.45);
      soft(-2,1.105,-1.65,1.8,.035,1.42,S.paper);
      soft(-2,1.32,-1.65,.92,.26,.62,M.copper);soft(-2,1.51,-1.68,.48,.18,.48,M.cyan);
      for(const x of [-2.38,-1.62])for(const z of [-1.94,-1.36]){const q=cyl(x,1.27,z,.17,.10,M.dark);q.rotation.x=Math.PI/2;ball(x,1.27,z+(z<-1.65?-.06:.06),.065,M.brass);}
      scroll(-2.7,1.11,-1.1);cup(-1.25,1.09,-2.15);jar(-1.18,1.09,-1.1,.75);
      crate(-2.6,0,-2.35,.65,.56,.52);stool(-.4,0,-1.6);
    },-.3);
    vignette('工坊中央的光學試驗車',()=>{
      cabinet(1.28,0,-2.55,1.65,.85,2.05);soft(1.28,.97,-2.55,1.78,.14,2.15,M.floorShade,true);
      beam([1.1,1.04,-2.05],[1.1,1.63,-2.05],.045,M.copper);ring(1.1,1.69,-2.05,.24,.04,M.brass);
      ball(1.1,1.69,-2.05,.19,M.cyan,1,1,.2);scroll(.72,1.05,-1.7);book(1.75,1.05,-2.25,.30,.44,M.lavender,true);
      crate(.62,0,-2.65,.65,.58,.52);jar(1.75,1.05,-1.75,.8);
    });
    vignette('手搖燈旁的工具推車',()=>{
      cabinet(4.56,0,.30,1.02,.88,1.92);
      for(const x of [4.2,4.92])for(const z of [-.43,1.03]){const q=cyl(x,.15,z,.12,.10,M.dark);q.rotation.x=Math.PI/2;}
      soft(4.56,.98,.30,.76,.035,1.5,M.rug);gear(4.56,1.17,-.15,.23,10);
      jar(4.56,1.04,.85,1);scroll(4.5,1.04,.35);book(4.4,1.04,-.45,.32,.37,M.lavender,true);
      cabinet(7.08,0,.30,.50,1.08,1.70);jar(7.08,1.17,-.1,.85);scroll(7.08,1.17,.8);
    });
    vignette('舷窗旁的明日出貨箱',()=>{
      cabinet(3.8,0,3.85,1.45,.76,1.30);crate(3.4,.85,3.85,.62,.48,.72);
      scroll(4.1,.85,3.6);jar(4.25,.85,4.18,.75);gear(3.45,1.5,3.88,.17,8);
      planter(4.85,0,4.35,.85);crate(2.8,0,4.35,.65,.57,.66);
    });
    vignette('客廳與工坊之間的擺錘展示',()=>{
      cabinet(1.02,0,1.35,1.34,.69,1.08);soft(1.02,.82,1.35,1.44,.14,1.18,M.floorShade,true);
      for(const x of [.6,1.44])beam([x,.91,1.35],[x,1.64,1.35],.035,M.copper);
      beam([.6,1.64,1.35],[1.44,1.64,1.35],.035,M.brass);
      for(let j=0;j<4;j++){const x=.78+j*.16;beam([x,1.64,1.35],[x,1.17,1.35],.009,M.dark);ball(x,1.13,1.35,.09,M.brass);}
      book(.58,.91,1.65,.35,.31,M.lavender,true);jar(1.48,.91,1.65,.65);scroll(1.02,.91,.98);
    },.05);
    vignette('閣樓的睡前閱讀角',()=>{
      soft(-1.5,4.35,.62,2.12,.58,1.34,M.oak,true);
      soft(-1.5,4.73,.62,1.96,.22,1.22,M.cream,true);
      soft(-1.5,5.05,.10,2.1,.76,.23,M.lavender,true);
      for(const x of [-2.48,-.52])soft(x,4.91,.62,.18,.55,1.3,M.honey,true);
      for(const [x,w,h] of [[-2,.44,.47],[-1.1,.51,.39]]){const q=soft(x,5.08,.33,w,h,.19,M.pink);q.rotation.z=x<-1.5?.12:-.14;}
      soft(-1.55,4.25,2.05,.90,.42,.70,M.rug,true);soft(-1.55,4.49,2.05,.91,.14,.71,M.cream,true);
      cabinet(-.5,4,-1.0,.92,.76,1.18);book(-.5,4.85,-1.1,.45,.37,M.lavender,true);cup(-.45,4.85,-.66);
    });
    vignette('閣樓欄杆旁的模型收納',()=>{
      cabinet(-4.55,4,.43,.70,.87,2.25);
      for(let j=0;j<4;j++){const start=g.children.length;book(-4.55,4.97,-.35+j*.28,.16,.31+j%3*.06,j%2?M.rug:M.lavender);for(const o of g.children.slice(start))o.rotation.z=j===2?.13:0;}
      gear(-4.52,5.25,1.18,.22,10);scroll(-4.55,4.97,-.5);jar(-4.55,4.97,.75,.85);
      soft(-4.1,4.21,4.0,.65,.42,.62,M.oak);soft(-4.1,4.47,4,.65,.13,.62,M.pink);
    });
    Object.assign(g.userData,{
      // 書牆與閣樓鋪暖光，銅罩和投射燈聚焦小車拆修桌，沙發底留短段柔光。
      glow:[
        {kind:'cove',a:[-2.9,3.42,-4.8],b:[-1.05,3.42,-4.8],n:[0,1],c:'#f0e6d8'},
        {kind:'under',a:[-2.1,2.795,-4.46],b:[-1.05,2.795,-4.46]},
        {kind:'kick',a:[-0.95,0.1,1.84],b:[0.05,0.1,1.84],n:[0,-1]},
        {kind:'under',a:[6.87,2.595,-3.05],b:[6.87,2.595,-1.5]},
        {kind:'wash',a:[0.66,6.85,-3.8],b:[0.66,6.85,-0.4],n:[-1,0],c:'#f0e6d8'},
        {kind:'under',a:[0.295,5.74,-1.6],b:[0.295,5.74,0.1]},
        {kind:'kick',a:[-3.1,4.11,-2.15],b:[-1.3,4.11,-2.15],n:[0,1]},
        {kind:'wash',a:[7.3,4.1,1.25],b:[7.3,4.1,2.5],n:[-1,0],c:'#f0e6d8'},
        {kind:'spot',p:[-1.2,3.45,-2.5],t:[-2,1.6,-1.98],r:0.7},
        {kind:'spot',p:[-2.2,9.3,-3.2],t:[-2.2,6.22,-4.84],r:0.75}
      ],
      spawn:[-2.7,0,3.4,Math.PI],exit:[-2.7,4.85,.62],host:[3,0,-.4,0],cols,
      sun:[.6,.65,.8],lights:[[-3,2.85,0.3,'#ffd8ad',0.75,0.5],[4,3.9,0.6,'#ffd8ad',0.8,0.5],[-2,6.3,0.4,'#ffd8ad',0.8,0.5],[5.5,1.42,-3.9,'#ffd8ad',0.4,0.35],[4.5,4.3,-1.5,'#ffd8ad',0.7,0.45],[-2,2.598,-1.95,'#ffd8ad',0.85,0.5]],
      gifts:[[-3.7,0,-1.8,0],[5.8,0,.2,0],[2.5,0,2.1,0],[-.2,4,1.9,0],[-3.4,4,-.8,0]],
      spots:[
        {x:4.35,y:0,z:-2.65,r:1.15,kind:'study',label:'試試草圖',name:'舷窗發明工作台',lines:['先把單位寫好，再替小車找出發方向。','一次只換一個零件，才知道誰幫了忙。','叮咚，陪我用三個小問題試試看吧。'],alone:['工作台攤著小車草圖，旁邊排好螺帽。','紙角用海邊的小石頭壓住了。']},
        {x:5.5,y:0,z:2.45,r:1.1,kind:'look',label:'看看手搖燈',name:'手搖燈與工具架',lines:['這盞燈的第一聲喀噠，我留給你聽。','手搖時做的功，會轉成光和熱。','轉累了就停，工具也需要休息呀。'],alone:['手搖把手磨得圓圓的，不會刮手。','工具架留著一個空鉤，像在等扳手回家。']},
        {x:-2.4,y:0,z:2.2,r:1.05,kind:'look',label:'歇一下',name:'修穩的小沙發',lines:['椅腳終於一樣長啦，坐著不會晃了。','受力平衡時，它就能穩穩陪你。','先喝水，草圖可以晚一點再畫。'],alone:['沙發扶手的木紋裡藏著小小修補痕。','茶杯旁留著一張提醒喝水的便條。']},
        {x:-3.25,y:4,z:2.55,r:1.1,kind:'look',label:'看看風車',name:'風車傳動草圖桌',lines:['風車的軸從屋頂一路接到這裡。','大齒輪帶小齒輪，轉速也會跟著變。','我想做個收紙條的抽屜，先想想防水。'],alone:['黃銅軸穿過斜樑，接到一對小齒輪。','草圖上畫著一個還沒完成的小抽屜。']},
        {x:-2.2,y:4,z:-1.35,r:1.1,kind:'look',label:'翻翻筆記',name:'閣樓床邊的明日筆記',lines:['睡前只記一個卡住的地方就好。','明早醒來，再找最省力的那一步。','小風車休息了，我們也晚安吧。'],alone:['床邊筆記夾著一片風車形書籤。','最後一行寫著：明天先找不見的螺帽。']}
      ]
    });
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
