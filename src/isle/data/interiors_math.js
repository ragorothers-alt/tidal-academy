/* 潮汐小島 · math 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['math'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['math'] = function (THREE, kit) {
    const g=new THREE.Group();g.name='弦・八角音樂盒塔屋';
    const A=7,Y=4.2,H=8.6,W=2*A*Math.tan(Math.PI/8),a0=Math.PI/8,a1=5*Math.PI/8;
    const palette={wall:'#f1ecf7',wood:'#ac815c',honey:'#d6b17a',ink:'#2b2d42',ivory:'#fbfbf6',gold:'#d9ad59',violet:'#7f86c9',soft:'#bcb5df',plum:'#a695cf',leaf:'#748962',pink:'#edb0c9',paper:'#fff5db'};
    // 同色依用途共用材質；只在色票建立一次，不增加幾何或改動動線。
    const finish = { wood:{roughness:.72}, fabric:{roughness:1}, ceramic:{roughness:.28}, metal:{metalness:.82,roughness:.36}, foliage:{roughness:.88}, paper:{roughness:.92}, plaster:{roughness:.9}, stone:{roughness:.94} };
    const kinds = { wall:'plaster', wood:'wood', honey:'wood', ink:'metal', ivory:'wood', gold:'metal', violet:'wood', soft:'fabric', plum:'fabric', leaf:'foliage', pink:'fabric', paper:'paper' };
    const M = {}; Object.keys(palette).forEach(k => { const kind = kinds[k]; M[k] = kit.mat(palette[k], finish[kind], kind); });
    const swatches = (kind, keys) => Object.fromEntries(keys.split(' ').map(k => [k, kit.mat(palette[k], finish[kind], kind)]));
    const cloth = swatches('fabric', 'ivory violet gold ink');
    const glaze = swatches('ceramic', 'ivory violet ink wood gold');
    const petal = swatches('foliage', 'plum violet');
    const print = swatches('paper', 'ink soft ivory violet plum');
    const timber = swatches('wood', 'ink plum soft');
    const stone = swatches('stone', 'wall');
    const floorM=['#b5a48f','#ad9d8b','#bdad99'].map(c=>kit.mat(c,finish.wood,'wood'));
    const view=kit.view(),glass=kit.glass(),glow=kit.lamp('#ffdda0');const farView=view.clone();farView.uniforms=view.uniforms;farView.transparent=true;farView.depthWrite=false;farView.fragmentShader=view.fragmentShader.replace('texture2D(map, vUv)','texture2D(map, vec2(.5+.5*sin(vUv.x*6.2831853),vUv.y))');const cols=[];
    function mesh(q,m,x=0,y=0,z=0,solid=false,walk=false){const o=new THREE.Mesh(q,m);o.position.set(x,y,z);o.userData.solid=solid;o.userData.walk=walk;g.add(o);return o;}
    function box(x,y,z,w,h,d,m,solid=false,r=0){return mesh(r?kit.rbox(w,h,d,r):new THREE.BoxGeometry(w,h,d),m,x,y,z,solid);}
    function polar(a,r,y=0){return [Math.sin(a)*r,y,Math.cos(a)*r];}
    function face(a,u,y,d=A){return [Math.sin(a)*d+Math.cos(a)*u,y,Math.cos(a)*d-Math.sin(a)*u];}
    function fb(a,u,y,d,w,h,dep,m,solid=false){const p=face(a,u,y,d),o=box(...p,w,h,dep,m,solid);o.rotation.y=a;return o;}
    function beam(a,b,r,m,solid=false){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),o=mesh(new THREE.CylinderGeometry(r,r,p.distanceTo(q),6),m,...p.clone().add(q).multiplyScalar(.5).toArray(),solid);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.clone().sub(p).normalize());if(solid&&Math.abs(q.x-p.x)>.02&&Math.abs(q.z-p.z)>.02){o.userData.solid=false;const n=Math.ceil(p.distanceTo(q)/.10);for(let j=0;j<n;j++){const u=p.clone().lerp(q,j/n),v=p.clone().lerp(q,(j+1)/n);cols.push([Math.min(u.x,v.x)-r,Math.min(u.y,v.y)-r,Math.min(u.z,v.z)-r,Math.max(u.x,v.x)+r,Math.max(u.y,v.y)+r,Math.max(u.z,v.z)+r]);}}return o;}
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1){const o=mesh(new THREE.SphereGeometry(r,r<.16?6:8,r<.16?3:5),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
    function shapeMesh(points,depth,m,x=0,y=0,z=0,a=0,holes=[]){const s=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));for(const p of holes)s.holes.push(new THREE.Path(p.map(v=>new THREE.Vector2(...v)).reverse()));const o=mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:20}),m,x,y,z);o.rotation.y=a;return o;}
    function arch(w,h){const r=w/2,cy=h-r,p=[[-r,0],[r,0],[r,cy]];for(let j=1;j<=24;j++){const t=j*Math.PI/24;p.push([r*Math.cos(t),cy+r*Math.sin(t)]);}return p;}
    function circle(r,cx=0,cy=0){return Array.from({length:48},(_,j)=>[cx+r*Math.cos(j*Math.PI/24),cy+r*Math.sin(j*Math.PI/24)]);}
    // The eight wall planes have real cut-outs. Small collision cells follow diagonal faces accurately.
    function wall(a,y,op){
      let p=[[-W/2,y],[W/2,y],[W/2,y+4.2],[-W/2,y+4.2]],holes=[];
      const outline=op.circle?circle(op.r,0,op.y):arch(op.w,op.h).map(v=>[v[0],v[1]+op.y]);
      if(op.door){const r=op.w/2,cy=op.y+op.h-r;p=[[-W/2,y],[-r,y],[-r,cy],...Array.from({length:24},(_,j)=>{const t=Math.PI-(j+1)*Math.PI/24;return[r*Math.cos(t),cy+r*Math.sin(t)];}),[r,y],[W/2,y],[W/2,y+4.2],[-W/2,y+4.2]];}else holes=[outline];
      const pos=face(a,0,0,A);shapeMesh(p,.32,M.wall,...pos,a,holes);
      const wallCell=Math.abs(Math.sin(a)*Math.cos(a))>.1?.05:.36;for(let u=-W/2;u<W/2;u+=wallCell){const w=Math.min(wallCell,W/2-u),mid=u+w/2;if(op.door&&Math.abs(mid)<op.w/2+.05)continue;const q=face(a,mid,y+2.1,A+.16),hx=Math.abs(Math.cos(a))*w/2+Math.abs(Math.sin(a))*.16,hz=Math.abs(Math.sin(a))*w/2+Math.abs(Math.cos(a))*.16;cols.push([q[0]-hx,y,q[2]-hz,q[0]+hx,y+4.2,q[2]+hz]);}
      if(op.door){for(const sign of [-1,1]){const u=sign*(W+op.w)/4,w=(W-op.w)/2;fb(a,u,y+.14,A-.04,w,.28,.08,timber.soft);fb(a,u,y+.43,A-.055,w,.065,.10,M.gold);}}else{fb(a,0,y+.14,A-.04,W,.28,.08,timber.soft);fb(a,0,y+.43,A-.055,W,.065,.10,M.gold);}
      fb(a,0,y+4.04,A-.07,W,.20,.18,M.violet);
      for(const u of [-W/2+.09,W/2-.09])fb(a,u,y+2.1,A-.08,.17,4.2,.18,M.violet);
      const ring=op.circle?[...outline,outline[0]]:outline;
      for(let j=1;j<ring.length;j++)beam(face(a,ring[j-1][0],ring[j-1][1],A-.07),face(a,ring[j][0],ring[j][1],A-.07),.065,M.gold);
      if(!op.door){const q=face(a,0,0,A+.15);const pane=shapeMesh(outline,.012,glass,...q,a);pane.userData.camThrough=true;}
      const low=op.circle?op.y-op.r:op.y,wh=op.circle?op.r*2:op.h,ww=op.circle?op.r*2:op.w;
      const q=face(a,0,low+wh/2,A+.78),backdrop=view.clone();
      backdrop.transparent=true;backdrop.depthWrite=false;backdrop.uniforms=Object.assign({},view.uniforms,{uFaceNormal:{value:new THREE.Vector2(Math.sin(a),Math.cos(a))}});
      backdrop.fragmentShader='uniform vec2 uFaceNormal;\n'+view.fragmentShader.replace('void main(){','void main(){ if(max(max(abs(cameraPosition.x),abs(cameraPosition.z)),(abs(cameraPosition.x)+abs(cameraPosition.z))*.7071068)>7.34) discard;');
      const sky=mesh(new THREE.PlaneGeometry(ww+.8,wh+.8),backdrop,...q);sky.rotation.y=a+Math.PI;sky.userData.camThrough=true;
      if(op.circle){
        // Eight petals and eight radial spokes preserve the geometric rose window.
        const r=op.r;
        for(let j=0;j<8;j++){const t=j*Math.PI/4,points=[];for(let k=0;k<=16;k++){const v=k*Math.PI/8,rad=r*(.48+.40*Math.cos(v)),side=r*.18*Math.sin(v);points.push(face(a,Math.sin(t)*rad+Math.cos(t)*side,op.y+Math.cos(t)*rad-Math.sin(t)*side,A-.13));}for(let k=1;k<points.length;k++)beam(points[k-1],points[k],.018,M.gold);}
        const rr=mesh(new THREE.TorusGeometry(r*.18,.025,5,24),M.gold,...face(a,0,op.y,A-.14));rr.rotation.y=a;
      }else if(!op.door){fb(a,0,low+wh*.48,A-.12,ww,.055,.09,M.honey);fb(a,0,low+wh/2,A-.12,.05,wh,.09,M.honey);fb(a,0,low-.08,A-.13,ww+.32,.16,.42,M.honey);}
      if(op.door&&y>0){
        // Open French casement, keeping the same side-arch count as the exterior.
        const q=face(a,-op.w/2,op.y,A+.2),leaf=shapeMesh(arch(op.w,op.h),.045,glass,...q,a+Math.PI/2);leaf.userData.camThrough=true;
        for(const side of [-1,1])fb(a,side*(op.w/2+.06),op.y+op.h/2,A-.07,.12,op.h,.18,M.gold);fb(a,0,(y+op.y)/2,A+.16,op.w,op.y-y,.32,stone.wall,false);
      }
    }
    function octRadius(ap,a){const t=((a+Math.PI/8)%(Math.PI/4)+Math.PI/4)%(Math.PI/4)-Math.PI/8;return ap/Math.cos(t);}
    function slab(points,y,walk=true,m=floorM[0]){const p=new THREE.Shape(points.map(v=>new THREE.Vector2(v[0],-v[1])));const q=new THREE.ExtrudeGeometry(p,{depth:.25,bevelEnabled:false});q.rotateX(-Math.PI/2);const o=mesh(q,m,0,y-.25,0,false,walk);return o;}
    function wedge(a,b,ri0,ri1,ro0,ro1,y,walk=true,m=floorM[0]){return slab([[Math.sin(a)*ri0,Math.cos(a)*ri0],[Math.sin(a)*ro0,Math.cos(a)*ro0],[Math.sin(b)*ro1,Math.cos(b)*ro1],[Math.sin(b)*ri1,Math.cos(b)*ri1]],y,walk,m);}
    slab(Array.from({length:8},(_,j)=>{const a=Math.PI/8+j*Math.PI/4,r=A/Math.cos(Math.PI/8);return[Math.sin(a)*r,Math.cos(a)*r];}),0);
    // Muted oak boards stop at the octagonal perimeter; staggered joints add slight tonal variation.
    for(let row=0;row<25;row++){const z=-6.6+row*.55,d=.53,half=Math.min(A-.02,A*Math.SQRT2-Math.abs(z)-d/2)-.02;let x=-half,j=0;while(x<half-.01){const w=Math.min(j===0?(row%2?1.15:2.25):2.25,half-x);box(x+w/2,.001,z,w-.015,.002,d,floorM[(row+j)%3]);x+=w;j++;}}
    for(let j=0;j<32;j++){
      const a=j*Math.PI/16,b=(j+1)*Math.PI/16,ri0=octRadius(2.0,a),ri1=octRadius(2.0,b),ro0=octRadius(A,a),ro1=octRadius(A,b);
      if(j>=2&&j<10){wedge(a,b,ri0,ri1,4.13,4.13,Y,true,floorM[j%3]);wedge(a,b,6.17,6.17,ro0,ro1,Y,true,floorM[j%3]);}else wedge(a,b,ri0,ri1,ro0,ro1,Y,true,floorM[j%3]);
      // Broad outside balcony, an actual walkable loop rather than a painted railing.
      wedge(a,b,octRadius(A+.33,a),octRadius(A+.33,b),octRadius(9.2,a),octRadius(9.2,b),Y,true,stone.wall);
    }
    slab([[-7.45,-.94],[-6.85,-.94],[-6.85,.94],[-7.45,.94]],Y);
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;
      wall(a,0,j===0?{door:true,y:0,w:2.2,h:3.05}:{y:.95,w:j%2?1.7:1.6,h:2.75});
      wall(a,Y,j===0?{circle:true,y:Y+2.23,r:1.67}:j>=3&&j<=5?{circle:true,y:Y+2.20,r:.87}:j===6?{door:true,y:Y+.5,w:1.75,h:2.75}:{y:Y+.50,w:1.6,h:2.75});
      // Every structural seam continues up into the conical roof as an exposed violet rib.
      const p=polar(a+Math.PI/8,A/Math.cos(Math.PI/8),H/2);box(p[0],p[1],p[2],.24,H,.24,M.violet);
      const foot=polar(a+Math.PI/8,A/Math.cos(Math.PI/8),H-.31);beam(foot,[0,12.55,0],.12,M.violet);
      // Piano-key cornice on all eight planes, inside the room just below the eaves.
      fb(a,0,H-.38,A-.14,W,.68,.16,timber.ink);
      for(let k=0;k<14;k++){const u=(k-6.5)*W/14;fb(a,u,H-.38,A-.25,W/14-.025,.64,.14,M.ivory);if([0,1,3,4,5].includes(k%7))fb(a,u+W/28,H-.24,A-.35,.13,.36,.11,timber.ink);}
      fb(a,0,H+.02,A-.22,W,.10,.16,M.gold);
    }
    // Solid-volume eight-facet cone; each triangular soffit is visible from the atrium.
    for(let j=0;j<8;j++){const a=Math.PI/8+j*Math.PI/4,b=a+Math.PI/4,p=polar(a,A/Math.cos(Math.PI/8),H),q=polar(b,A/Math.cos(Math.PI/8),H);const vs=[[0,12.95,0],p,q,[0,12.73,0],[p[0],H-.18,p[2]],[q[0],H-.18,q[2]]],idx=[0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs.flat(),3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,timber.soft);}
    // A quarter-turn ceremonial stair: 28 risers, 1.9 m wide; separate invisible ramp panels.
    const N=28,rad=5.15;
    function quad(a,b,c,d,m,walk=false){const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...d],3));q.setIndex([0,1,2,0,2,3]);q.computeVertexNormals();return mesh(q,m,0,0,0,false,walk);}
    for(let j=0;j<N;j++){
      const a=a0+(a1-a0)*j/N,b=a0+(a1-a0)*(j+1)/N,y0=Y*j/N,y1=Y*(j+1)/N;
      wedge(a,b,4.20,4.20,6.10,6.10,y1,false,M.honey);
      wedge(a+.004,b-.004,4.40,4.40,5.90,5.90,y1+.009,false,M.soft);
      const r=quad(polar(a,4.20,y0),polar(a,6.10,y0),polar(b,6.10,y1),polar(b,4.20,y1),M.honey,true);r.visible=false;
      if(j%2===0)for(const rr of [4.16,6.14]){const p=polar(a,rr,y0+.51);box(p[0],p[1],p[2],.055,1.02,.055,M.ink,true);ball(p[0],y0+1.07,p[2],.07,M.gold);}
      for(const rr of [4.16,6.14])beam(polar(a,rr,y0+1.0),polar(b,rr,y1+1.0),.04,M.ink,true);
    }
    // Staff balustrades: five parallel lines, note-heads, and gold-topped corner uprights.
    function staff(ap,y,outer){for(let j=0;j<8;j++){const a=Math.PI/8+j*Math.PI/4,b=a+Math.PI/4,r=ap/Math.cos(Math.PI/8),p=polar(a,r,y),q=polar(b,r,y);box(p[0],y+.53,p[2],.10,1.06,.10,M.ink,true);ball(p[0],y+1.1,p[2],.09,M.gold);for(let k=0;k<5;k++)beam([p[0],y+.22+k*.18,p[2]],[q[0],y+.22+k*.18,q[2]],.025,M.ink,true);for(const t of [.32,.67]){const x=p[0]+(q[0]-p[0])*t,z=p[2]+(q[2]-p[2])*t;ball(x,y+.45,z,.105,M.gold,1,.65,1);beam([x+.05,y+.45,z],[x+.05,y+.91,z],.022,M.gold);}if(outer)beam([p[0],y+.05,p[2]],[q[0],y+.05,q[2]],.06,M.honey);}}
    staff(2.0,Y,false);staff(9.25,Y,true);
    const panorama=new THREE.CylinderGeometry(10.55,10.55,9,64,1,true);panorama.scale(-1,1,1);const horizon=mesh(panorama,farView,0,Y+3.0,0);horizon.userData.camThrough=true;
    // Preserve the exterior side-window sill: low steps rise 0.5 m, then descend onto the balcony.
    for(let j=0;j<4;j++){let h=(j+1)*.125;box(-5.8-(j+.5)*1.35/4,Y+h/2,0,1.35/4+.01,h,1.75,M.honey);h=.5-j*.125;box(-7.15-(j+.5)*.9/4,Y+h/2,0,.9/4+.01,h,1.75,M.honey);}
    const sillIn=quad([-5.8,Y,-.875],[-7.15,Y+.5,-.875],[-7.15,Y+.5,.875],[-5.8,Y,.875],M.honey,true);sillIn.visible=false;
    const sillOut=quad([-7.15,Y+.5,-.875],[-8.05,Y,-.875],[-8.05,Y,.875],[-7.15,Y+.5,.875],M.honey,true);sillOut.visible=false;
    // Guard the stair aperture's inner edge, without closing either landing.
    for(let j=0;j<12;j++){const a=a0+(a1-a0)*j/12,b=a0+(a1-a0)*(j+1)/12;beam(polar(a,4.10,Y+1.02),polar(b,4.10,Y+1.02),.04,M.ink,true);if(j%2===0){const p=polar(a,4.1,Y+.5);box(p[0],p[1],p[2],.07,1,.07,M.ink,true);}}
    // Ground-floor compass carpet: eight different but symmetric triangular inlays.
    mesh(new THREE.CylinderGeometry(2.4,2.4,.028,48),M.plum,0,.016,0);
    for(let j=0;j<8;j++){const a=j*Math.PI/4,b=a+Math.PI/8;quad([0,.034,0],polar(a,2.18,.034),polar(b,1.05,.034),polar(a+Math.PI/4,2.18,.034),j%2?cloth.ivory:cloth.gold);}
    function books(x,y,z,n){for(let j=0;j<n;j++){const h=.42+(j%3)*.09;box(x+j*.18,y+h/2,z,.14,h,.32,j%2?print.violet:print.plum);box(x+j*.18,y+.13,z+.17,.08,.03,.02,M.gold);}}
    function plant(x,y,z){mesh(new THREE.CylinderGeometry(.25,.20,.40,8),glaze.ivory,x,y+.20,z);mesh(new THREE.CylinderGeometry(.255,.255,.07,8),glaze.violet,x,y+.15,z);for(let j=0;j<5;j++){const a=j*2.4,xx=x+Math.sin(a)*.25,zz=z+Math.cos(a)*.25;beam([x,y+.35,z],[xx,y+.95+j%3*.09,zz],.018,M.leaf);ball(xx,y+.76,zz,.14,M.leaf,1,.5,1);for(let k=0;k<2;k++)ball(xx,y+.93+k*.09,zz,.075,petal.plum,.65,1,.65);}}
    function polyModel(x,y,z,r){const geo=new THREE.IcosahedronGeometry(r,0),edges=new THREE.EdgesGeometry(geo),p=edges.attributes.position;for(let j=0;j<p.count;j+=2)beam([x+p.getX(j),y+p.getY(j),z+p.getZ(j)],[x+p.getX(j+1),y+p.getY(j+1),z+p.getZ(j+1)],.012,M.gold);geo.dispose();edges.dispose();}
    function lamp(x,y,z){mesh(new THREE.CylinderGeometry(.28,.23,.55,8),glow,x,y,z);for(let j=0;j<8;j++){const a=j*Math.PI/4;beam([x+Math.sin(a)*.28,y-.31,z+Math.cos(a)*.28],[x+Math.sin(a)*.28,y+.31,z+Math.cos(a)*.28],.022,M.gold);}mesh(new THREE.ConeGeometry(.38,.24,8),M.gold,x,y+.41,z);mesh(new THREE.CylinderGeometry(.34,.34,.08,8),M.gold,x,y-.34,z);}
    function metronome(x,y,z,s=1){shapeMesh([[-.22*s,0],[.22*s,0],[.12*s,.85*s],[-.12*s,.85*s]],.28*s,M.wood,x,y,z-.14*s);beam([x,y+.14*s,z+.17*s],[x+.13*s,y+.78*s,z+.17*s],.025*s,M.gold);box(x+.09*s,y+.62*s,z+.19*s,.18*s,.11*s,.05*s,M.gold);}
    // Upright piano has playable-looking individual keys and real music on its open score.
    box(-4.55,.57,-2.8,2.65,1.14,.85,M.wood,true,.06);box(-4.55,1.38,-3.04,2.65,1.22,.43,M.honey,true,.06);box(-4.55,1.03,-2.38,2.7,.17,.45,timber.ink,true);
    for(let j=0;j<21;j++){box(-5.77+j*.122,1.14,-2.26,.11,.09,.40,M.ivory);if([0,1,3,4,5].includes(j%7))box(-5.71+j*.122,1.22,-2.36,.065,.11,.24,timber.ink);}
    box(-4.55,1.54,-2.78,.92,.67,.05,M.paper);for(let k=0;k<5;k++)box(-4.55,1.34+k*.095,-2.74,.83,.012,.012,print.ink);for(let k=0;k<5;k++){ball(-4.85+k*.16,1.44+k%3*.095,-2.71,.035,print.ink,1,.7,.3);box(-4.82+k*.16,1.53+k%3*.095,-2.71,.014,.18,.02,print.ink);}
    box(-5.15,.46,-1.75,1.65,.20,.62,M.plum,true,.06);for(const x of [-5.8,-4.5])box(x,.2,-1.75,.12,.4,.45,M.wood,true);metronome(-3.65,2.02,-2.98,.8);
    // Separate, orderly proof desk faces the rear light, with ruler, triangle and coordinate board.
    box(.1,1.02,-4.75,3.1,.16,1.12,M.honey,true,.04);for(const x of [-1.1,1.3])box(x,.50,-4.75,.24,1.0,.84,M.wood,true);box(-.35,1.13,-4.65,1.15,.06,.65,M.paper);books(.65,1.11,-4.9,4);
    shapeMesh([[0,0],[.6,0],[0,.6]],.04,M.gold,.6,1.14,-4.5,-Math.PI/2);
    box(2.15,2.55,-6.66,1.6,1.45,.10,M.violet);box(2.15,2.55,-6.59,1.45,1.25,.03,M.ink);
    for(let j=0;j<5;j++){box(2.15,2.1+j*.21,-6.56,1.3,.012,.012,print.soft);box(1.6+j*.275,2.55,-6.55,.012,1.1,.012,print.soft);}beam([1.6,2.16,-6.53],[2.7,2.95,-6.53],.025,M.gold);
    // Low, symmetric storage lives under the windows; all main walking lanes remain open.
    for(const sign of [-1,1]){
      box(sign*4.35,.48,3.25,1.6,.96,.70,M.wood,true,.04);box(sign*4.35,1.0,3.25,1.7,.10,.8,M.honey);books(sign*4.35-.55,1.06,3.25,6);polyModel(sign*4.35,1.96,3.25,.30);
      plant(sign*3.9,0,-5.3);plant(sign*4.2,Y,-4.6);plant(sign<0?-3.25:4.0,Y,sign<0?5.90:4.5);
    }
    // Upstairs is a wide ring with distinct sleep, score archive and rose-window listening bays.
    box(-4.4,Y+.34,-2.8,2.2,.68,2.8,M.wood,true,.06);box(-4.4,Y+.77,-2.8,2.15,.22,2.75,cloth.ivory,false,.08);box(-4.4,Y+.93,-2.12,2.2,.12,1.35,M.plum,false,.05);box(-4.4,Y+1.0,-3.65,1.75,.25,.65,M.soft,false,.07);
    ball(-4.4,Y+1.3,-3.65,.30,cloth.ink,1,1,.42);ball(-4.4,Y+1.25,-3.51,.22,cloth.ivory,.85,1,.25);for(const x of [-4.51,-4.29])ball(x,Y+1.43,-3.50,.035,cloth.ink);const beak=mesh(new THREE.ConeGeometry(.065,.13,4),cloth.gold,-4.4,Y+1.33,-3.43);beak.rotation.x=Math.PI/2;
    box(0,Y+.4,6.25,2.6,.8,.85,M.wood,true,.05);box(0,Y+.86,6.20,2.55,.15,.82,M.plum,false,.06);for(const x of [-.83,0,.83])box(x,Y+1.09,6.53,.62,.50,.20,M.soft,false,.08);
    for(const x of [-1.15,1.15]){box(x,Y+.64,-6.1,1.7,1.28,.6,M.wood,true);for(let j=0;j<2;j++){box(x,Y+.25+j*.65,-5.76,1.5,.08,.06,M.honey);books(x-.65,Y+.3+j*.65,-5.9,7);}}
    box(0,Y+1.0,-4.96,2.6,.14,.9,M.honey,true);for(const x of [-1.0,1.0])box(x,Y+.5,-4.8,.15,1,.65,M.wood,true);box(0,Y+1.10,-4.8,1.0,.06,.6,M.paper);metronome(.8,Y+1.1,-4.8,.7);
    // Radial floor seams, framed geometry, paired note shelves, and balcony flower planters.
    for(let j=0;j<8;j++){const a=j*Math.PI/4;for(const y of [2.65,Y+2.45])for(const sign of [-1,1]){
      if(j===4&&y<Y&&sign===-1)continue;fb(a,sign*1.98,y,A-.10,.87,1.05,.10,M.gold);fb(a,sign*1.98,y,A-.17,.72,.89,.025,print.ivory);
      const p=face(a,sign*1.98,y,A-.24);polyModel(p[0],p[1],p[2],.27);
    }
      if(j!==6){const p=face(a,0,Y,9.5);plant(...p);beam(face(a,0,Y+.26,9.16),face(a,0,Y+.26,9.5),.035,M.ink);}
      beam(polar(a,2.1,Y-.29),polar(a,6.9,Y-.29),.08,M.violet);
    }
    // The weather-vane spindle is suggested by a non-moving metronome-shaped roof boss inside.
    metronome(0,11.45,0,1.15);beam([0,11.45,0],[0,12.8,0],.055,M.gold);
    const lamps=[[-3.6,3.0,-2.0],[3.2,3.1,2.0],[.4,3.0,-4.4],[-3.4,7.15,2.6],[3.1,7.15,-3.2],[0,10.3,0]];for(const p of lamps)lamp(...p);
    beam([0,10.7,0],[0,12.6,0],.045,M.gold);
    // Round two: Xian's ordered purple-and-brass music salon, with geometric craft details.
    function dot(x,y,z,r,m,sx=1,sy=1,sz=1){const o=mesh(new THREE.SphereGeometry(r,5,3),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
    function lavender(x,y,z,s=1){for(let j=0;j<5;j++){const a=j*2.4,xx=x+Math.sin(a)*.17*s,zz=z+Math.cos(a)*.17*s;beam([x,y,z],[xx,y+(.5+j%2*.14)*s,zz],.012*s,M.leaf);dot(xx,y+.28*s,zz,.12*s,M.leaf,1,.35,.7);for(let k=0;k<3;k++)dot(xx,y+(.41+k*.10+j%2*.13)*s,zz,.065*s,j%2?petal.plum:petal.violet,.8,1,.8);}}
    function flowerpot(x,y,z,s=1){mesh(new THREE.CylinderGeometry(.23*s,.17*s,.36*s,8),glaze.ivory,x,y+.18*s,z,true);mesh(new THREE.CylinderGeometry(.232*s,.21*s,.09*s,8),glaze.violet,x,y+.14*s,z);lavender(x,y+.35*s,z,s);}
    function trail(x,y,z,n=9){for(let j=0;j<n;j++){const xx=x+.10*Math.sin(j*1.5),yy=y-j*.14;beam([xx,yy,z],[x+.10*Math.sin((j+1)*1.5),yy-.14,z],.012,M.leaf);dot(xx+(j%2?.08:-.08),yy,z,.11,M.leaf,1,.5,.5);if(j%4===0)dot(xx,yy,z-.035,.075,petal.plum);}}
    function note(x,y,z,s=1,a=0){dot(x,y,z,.12*s,M.gold,1.25,.7,.35);beam([x+.10*s,y,z],[x+.10*s,y+.65*s,z],.026*s,M.gold);if(a){beam([x+.10*s,y+.65*s,z],[x+.39*s,y+.55*s,z],.035*s,M.gold);}}
    function score(x,y,z,s=1){for(const sign of [-1,1]){const p=box(x+sign*.23*s,y+.025,z,.46*s,.035,.60*s,M.paper);p.rotation.z=sign*.05;box(x+sign*.23*s,y-.005,z,.49*s,.02,.63*s,cloth.violet);for(let j=0;j<5;j++)box(x+sign*.23*s,y+.05,z-.20*s+j*.08*s,.35*s,.006,.01,print.ink);for(let j=0;j<3;j++)dot(x+sign*.23*s+(j-1)*.09*s,y+.058,z+((j%2)-.5)*.08*s,.023,print.ink,1,.25,1);}box(x,y+.06,z,.018,.008,.58*s,M.gold);}
    function pile(x,y,z,n=3){for(let j=0;j<n;j++){box(x,y+.06+j*.13,z,.59,.115,.42,j%2?M.plum:cloth.violet);box(x,y+.06+j*.13,z+.219,.46,.064,.016,M.paper);for(const dx of [-.20,.2])box(x+dx,y+.06+j*.13,z+.23,.018,.10,.015,M.gold);}}
    function penguin(x,y,z,s=.5){dot(x,y+s*.45,z,s*.40,cloth.ink,1,1.2,.67);dot(x,y+s*.42,z-.22*s,s*.31,cloth.ivory,.90,1,.35);for(const sign of [-1,1]){dot(x+sign*s*.13,y+s*.71,z-.28*s,s*.035,cloth.ink);dot(x+sign*s*.22,y+.05*s,z-.06*s,s*.12,cloth.gold,1,.5,1.4);}const b=mesh(new THREE.ConeGeometry(.085*s,.16*s,4),cloth.gold,x,y+s*.60,z-.34*s);b.rotation.x=-Math.PI/2;}
    function mug(x,y,z){mesh(new THREE.CylinderGeometry(.12,.10,.23,10),glaze.ivory,x,y+.115,z);const h=mesh(new THREE.TorusGeometry(.085,.025,5,12),glaze.ivory,x+.15,y+.13,z);h.rotation.y=Math.PI/2;mesh(new THREE.CylinderGeometry(.10,.10,.008,10),glaze.wood,x,y+.234,z);dot(x,y+.12,z+.108,.069,glaze.ink,1,1.25,.25);dot(x,y+.10,z+.13,.048,glaze.ivory,1,1.1,.25);dot(x,y+.145,z+.135,.022,glaze.gold,1,.5,.5);}
    function vase(x,y,z,s=.8){dot(x,y+.18*s,z,.24*s,glaze.gold,.9,1,1);mesh(new THREE.CylinderGeometry(.10*s,.12*s,.13*s,8),glaze.gold,x,y+.38*s,z);lavender(x,y+.4*s,z,s);}
    function basket(x,y,z){mesh(new THREE.CylinderGeometry(.31,.25,.42,10),M.honey,x,y+.21,z);for(let j=0;j<4;j++){const r=mesh(new THREE.TorusGeometry(.26+j*.013,.018,4,14),M.wood,x,y+.06+j*.105,z);r.rotation.x=Math.PI/2;}for(let j=0;j<4;j++)mesh(new THREE.CylinderGeometry(.045,.045,.57,6),M.paper,x-.14+j*.09,y+.43,z);}
    function deskLamp(x,y,z){mesh(new THREE.CylinderGeometry(.18,.22,.07,12),M.gold,x,y+.035,z);beam([x,y+.07,z],[x,y+.55,z],.035,M.gold);beam([x,y+.55,z],[x-.21,y+.76,z],.035,M.gold);const c=mesh(new THREE.ConeGeometry(.25,.22,12,1,true),M.gold,x-.23,y+.71,z);c.rotation.z=-.25;const b=mesh(new THREE.CircleGeometry(.20,12),glow,x-.25,y+.61,z);b.rotation.x=Math.PI/2;}
    function curtain(a,y,w=1.6,h=2.5){for(const sign of [-1,1]){for(let j=0;j<3;j++)fb(a,sign*(w/2+.19)+j*.065,y+h/2,A-.23,.09,h,.12,j%2?M.soft:M.plum);fb(a,sign*(w/2+.25),y+h*.40,A-.33,.31,.075,.10,M.gold);}fb(a,0,y+h+.05,A-.25,w+.8,.055,.07,M.gold);}
    // Each facade bay gets low panel mouldings, paired capitals and violet diagonal brackets.
    for(let j=0;j<8;j++){const a=j*Math.PI/4;for(const fy of [0,Y]){
      for(const u of [-2.25,-1.5,1.5,2.25]){fb(a,u,fy+.69,A-.13,.63,.52,.065,M.honey);fb(a,u,fy+.69,A-.18,.50,.38,.025,M.wood);}for(const u of [-2.65,2.65]){fb(a,u,fy+3.6,A-.20,.34,.30,.30,M.violet);beam(face(a,u,fy+3.08,A-.2),face(a,u+(u<0?.5:-.5),fy+3.91,A-.2),.09,M.violet);}
      if(j!==0&&!(fy>0&&j===6)){const yy=fy===0?.97:fy+.55;curtain(a,yy,fy>0&&j>=3&&j<=5?1.75:1.6,fy>0?2.6:2.7);}
    }
      // Fine radial roof boarding follows the original eight conical soffits.
      const a0r=a+Math.PI/8,a1r=a0r+Math.PI/4,rr=A/Math.cos(Math.PI/8);for(let k=1;k<=5;k++){const t=k/6;beam(polar(a0r,rr*t,12.73+(H-.18-12.73)*t),polar(a1r,rr*t,12.73+(H-.18-12.73)*t),.025,M.honey);}for(const t of [.33,.67]){const p0=polar(a0r,rr,H-.20),p1=polar(a1r,rr,H-.20);beam([0,12.68,0],[p0[0]+(p1[0]-p0[0])*t,H-.20,p0[2]+(p1[2]-p0[2])*t],.04,M.violet);}
    }
    for(const p of lamps){const rr=Math.max(Math.abs(p[0]),Math.abs(p[2]),(Math.abs(p[0])+Math.abs(p[2]))/Math.SQRT2),top=p[1]<Y?3.90:12.73+(H-.18-12.73)*rr/A-.08;beam([p[0],p[1]+.55,p[2]],[p[0],top,p[2]],.021,M.ink);for(let y=p[1]+.58;y<top;y+=.18){const link=mesh(new THREE.TorusGeometry(.05,.012,4,8),M.gold,p[0],y,p[2]);link.rotation.y=Math.round(y*10)%2*Math.PI/2;}}
    // Musical wall shelves are actual five-line staves, filled with books, geometry and plants.
    for(const j of [1,3,5,7]){const a=j*Math.PI/4;for(const fy of [0,Y]){const u=j%4===1?-1.93:1.93;for(let k=0;k<5;k++)fb(a,u,fy+2.0+k*.12,A-.34,1.10,.025,.035,M.ink);for(const yy of [2.08,2.83]){fb(a,u,fy+yy,A-.39,1.10,.09,.40,M.honey);for(let k=0;k<4;k++)fb(a,u-.37+k*.20,fy+yy+.28,A-.38,.14,.46+(k%3)*.08,.26,k%2?print.plum:print.violet);}const p=face(a,u+.32,fy+3.52,A-.46);polyModel(...p,.19);const n=face(a,u-.32,fy+1.84,A-.44);note(...n,.60,1);trail(...face(a,u+.48,fy+2.83,A-.5),9);}}
    // Cabinet fronts, brass pulls and coloured folio labels make the original blocks read as joinery.
    for(const sign of [-1,1]){const x=sign*4.35;for(const dx of [-.4,.4]){box(x+dx,.50,3.618,.65,.70,.045,M.honey);box(x+dx,.50,3.65,.53,.56,.025,M.wood);dot(x+dx,.56,3.68,.045,M.gold);}vase(x+.48,1.08,3.25,.65);pile(x-.42,1.08,3.25,3);}
    for(const x of [-1.1,1.3]){box(x,.54,-4.14,.62,.86,.09,M.honey);for(let j=0;j<3;j++){box(x,.27+j*.26,-4.08,.51,.20,.035,M.wood);beam([x-.10,.28+j*.26,-4.05],[x+.10,.28+j*.26,-4.05],.018,M.gold);}}
    box(.1,1.111,-4.75,.48,.017,1.1,M.plum);score(-.35,1.15,-4.60,.87);mug(1.12,1.12,-4.70);deskLamp(-1.06,1.13,-4.9);vase(.63,1.13,-4.99,.65);
    box(.40,1.16,-4.30,.76,.025,.08,M.gold);for(let j=0;j<8;j++)box(.07+j*.09,1.178,-4.27,.009,.007,j%2?.03:.05,M.ink);
    beam([.11,1.19,-4.62],[.34,1.20,-4.26],.018,M.gold);beam([.11,1.19,-4.62],[-.06,1.19,-4.24],.018,M.gold);dot(.11,1.21,-4.62,.035,M.ink);
    mesh(new THREE.CylinderGeometry(.11,.09,.23,8),glaze.violet,.9,1.24,-5.02);for(let j=0;j<4;j++)beam([.84+j*.04,1.23,-5.02],[.81+j*.06,1.61,-5.02],.012,j%2?M.gold:M.ink);
    // The penguin chair stays tucked under the proof desk, clear of its interaction position.
    box(.1,.52,-5.86,.90,.18,.75,M.wood,true,.04);box(.1,.65,-5.86,.83,.14,.70,M.plum,false,.06);for(const dx of [-.34,.34]){box(.1+dx,.27,-5.86,.10,.54,.60,M.wood,true);box(.1+dx,1.00,-6.11,.10,1.0,.10,M.honey,true);box(.1+dx,.86,-5.83,.10,.10,.72,M.honey);}box(.1,1.17,-6.13,.73,.62,.10,M.honey,false,.05);penguin(.1,.72,-6.0,.48);
    // Piano mouldings, three pedals, quilted bench and distinct score annotations.
    for(const x of [-5.73,-3.37]){box(x,.63,-2.34,.13,1.10,.09,M.honey);dot(x,1.95,-3.0,.08,M.gold);}for(const y of [.20,.91,1.96])box(-4.55,y,-2.35,2.56,.06,.06,M.honey);for(const x of [-4.85,-4.55,-4.25]){beam([x,.10,-2.74],[x,.10,-2.11],.035,M.gold);dot(x,.12,-2.1,.075,M.gold,1,.45,1.5);}for(let j=0;j<6;j++)box(-5.85+j*.27,.574,-1.75,.018,.008,.54,M.soft);for(const x of [-5.55,-5.15,-4.75])dot(x,.58,-1.75,.025,cloth.gold,1,.3,1);
    flowerpot(-5.8,0,-3.7,.9);flowerpot(-3.10,0,-4.35,.75);pile(-5.25,2.02,-3.04,2);vase(-4.82,2.04,-3.03,.65);note(-4.0,2.08,-3.0,.50,1);
    // Both large rugs get a real bound edge and alternating woven compass petals.
    const rim=mesh(new THREE.TorusGeometry(2.36,.035,4,64),cloth.gold,0,.047,0);rim.rotation.x=Math.PI/2;const innerRim=mesh(new THREE.TorusGeometry(2.19,.025,4,64),cloth.ivory,0,.052,0);innerRim.rotation.x=Math.PI/2;for(let j=0;j<32;j++){const a=j*Math.PI/16;const p=polar(a,2.30,.056),q=polar(a+.028,2.40,.056);beam(p,q,.012,cloth.ivory);}for(let j=0;j<8;j++){const a=j*Math.PI/4;quad(polar(a-.14,1.02,.043),polar(a,1.98,.043),polar(a+.14,1.02,.043),[0,.043,0],j%2?M.soft:cloth.ivory);}
    // Window boxes remain below the actual openings, with a deliberate paired arrangement.
    for(const fy of [0,Y])for(const j of [2,3,4,5,7]){const a=j*Math.PI/4;if(fy>0&&j===2)continue;const y=fy+.78;fb(a,0,y,A-.30,1.24,.23,.38,M.honey);for(const u of [-.43,0,.43]){const p=face(a,u,y+.12,A-.34);lavender(...p,.60);}}
    for(const fy of [0,Y])for(const j of [3,5,7]){const a=j*Math.PI/4,p=face(a,2.28,fy,A-.45);flowerpot(...p,.9);basket(...face(a,-2.25,fy,A-.4));}
    // Soft upstairs life: headboard, separate pillows, folded runner and a geometrical quilt.
    box(-4.4,Y+1.0,-4.13,2.3,1.25,.16,M.honey,true,.06);box(-4.4,Y+1.05,-4.02,2.06,.86,.05,cloth.violet,false,.04);for(const x of [-4.92,-3.91]){box(x,Y+1.0,-3.63,.86,.25,.63,cloth.ivory,false,.08);box(x,Y+1.14,-3.63,.70,.015,.48,M.soft);}box(-4.4,Y+1.04,-1.93,2.16,.13,.48,M.soft,false,.04);
    for(let j=0;j<5;j++){const x=-5.27+j*.43;beam([x,Y+1.002,-2.75],[Math.min(x+.45,-3.35),Y+1.002,-2.24],.012,cloth.gold);beam([x,Y+1.002,-2.24],[Math.min(x+.45,-3.35),Y+1.002,-2.75],.012,cloth.ivory);}for(const x of [-5.15,-4.75,-4.35,-3.95,-3.55])box(x,Y+1.115,-1.93,.04,.01,.44,cloth.violet);
    for(const x of [-.83,0,.83]){box(x,Y+.97,6.20,.77,.025,.75,M.soft);dot(x,Y+1.11,6.40,.035,cloth.gold,1,1,.3);}penguin(.86,Y+.97,6.35,.46);
    for(const sign of [-1,1]){const x=sign*1.65;box(x,Y+.49,5.90,.59,.98,.62,M.wood,true,.035);box(x,Y+1.02,5.9,.66,.10,.68,M.honey);vase(x,Y+1.08,5.9,.65);}
    for(const x of [-1.15,1.15])for(let j=0;j<2;j++){for(let k=0;k<6;k++){box(x-.60+k*.23,Y+.55+j*.65,-5.72,.12,.035,.018,M.gold);}pile(x+.45,Y+1.33,-6.08,2);}score(-.28,Y+1.1,-4.8,.9);mug(.75,Y+1.08,-4.73);deskLamp(-.94,Y+1.08,-4.9);
    box(-4.50,Y+.018,.25,1.65,.026,2.4,cloth.violet,false,.05);box(-4.50,Y+.034,.25,1.44,.012,2.19,M.soft,false,.04);box(0,Y+.018,-3.50,2.8,.026,1.05,M.plum,false,.05);box(0,Y+.034,-3.50,2.59,.012,.84,cloth.ivory,false,.04);
    // Musical notes and cascading lavender on the inner gallery never intrude onto its walking ring.
    for(let j=0;j<8;j++){const a=Math.PI/8+j*Math.PI/4,p=polar(a,2.02/Math.cos(Math.PI/8),Y+.72);note(...p,.75,j%2);const q=polar(a,2.02/Math.cos(Math.PI/8),Y-.22);trail(...q,9);}
    for(const j of [0,2,4,6]){const a=j*Math.PI/4,p=face(a,1.9,Y+1.05,9.12);lavender(...p,.65);trail(...p,10);}
    // Inspection one: textile bays divide the floor without adding physical obstructions.
    for(const p of [[-4.55,0,-1.75,2.75,1.35],[0,Y,4.75,2.55,1.40],[3.1,0,1.2,1.4,2.8]]){box(p[0],p[1]+.018,p[2],p[3],.025,p[4],M.plum);box(p[0],p[1]+.034,p[2],p[3]-.14,.012,p[4]-.14,cloth.gold);box(p[0],p[1]+.043,p[2],p[3]-.22,.009,p[4]-.22,M.soft);for(const sign of [-1,1])for(let j=0;j<7;j++)box(p[0]-p[3]*.4+j*p[3]*.8/6,p[1]+.027,p[2]+sign*(p[4]/2+.045),.025,.013,.13,cloth.ivory);}
    // Symmetry study and folio storage decorate previously blank mid-wall panels.
    for(const fy of [0,Y])for(const j of [2,4,6]){if(fy>0&&j===6)continue;const a=j*Math.PI/4;for(const u of [-1.8,1.8]){const p=face(a,u,fy+2.6,A-.25);const ring=mesh(new THREE.TorusGeometry(.29,.02,4,16),M.gold,...p);ring.rotation.y=a;for(let k=0;k<3;k++){const t=k*Math.PI/3;beam(face(a,u+Math.cos(t)*.28,fy+2.6+Math.sin(t)*.28,A-.27),face(a,u-Math.cos(t)*.28,fy+2.6-Math.sin(t)*.28,A-.27),.015,M.violet);}}}
    box(5.3,.28,-3.9,.68,.56,.64,M.wood,true);for(const yy of [.10,.28,.46])box(5.3,yy,-3.56,.70,.12,.04,M.honey);for(const x of [5.05,5.55])box(x,.28,-3.53,.065,.56,.04,M.wood);pile(5.3,.57,-3.9,2);

    // Round three: orderly music, geometry and listening islands; the compass centre stays accessible.
    function corner(name,x,y,z,a,fn){const start=g.children.length;fn();const q=new THREE.Group();q.name=name;for(const o of g.children.slice(start)){g.remove(o);q.add(o);}q.position.set(x,y,z);q.rotation.y=a;g.add(q);return q;}
    function table(w,d,h=.9){box(0,h-.075,0,w,.15,d,M.honey,true,.08);for(const x of [-w*.35,w*.35])box(x,(h-.15)/2,0,.22,h-.15,d*.72,M.wood,true,.04);box(0,h+.013,0,.36,.018,d-.05,M.plum);}
    function folio(w=1.6,d=.72){box(0,.53,0,w,1.06,d,M.wood,true,.07);box(0,1.11,0,w+.08,.10,d+.06,M.honey,true,.04);for(const yy of [.28,.74]){box(0,yy,-d/2-.025,w-.12,.38,.045,M.honey);for(const x of [-w*.25,w*.25]){box(x,yy,-d/2-.055,.42,.19,.035,print.plum);beam([x-.11,yy,-d/2-.08],[x+.11,yy,-d/2-.08],.02,M.gold);}}}
    function seat(w=1.6){box(0,.37,0,w,.66,.82,M.wood,true,.07);box(0,.76,0,w-.10,.18,.78,M.plum,false,.08);box(0,1.08,.30,w,.60,.20,M.honey,true,.06);for(const x of [-w*.26,w*.26])box(x,1.04,.18,.48,.42,.16,M.soft,false,.07);for(const x of [-w/2+.07,w/2-.07])box(x,.85,0,.14,.22,.82,M.honey,true,.05);}
    function tea(x,z){table(.8,.76,.78);mug(-.18,.82,.02);vase(.20,.82,-.04,.70);}
    function geometryShelf(w=1.8){folio(w,.80);polyModel(-w*.28,1.52,0,.29);pile(w*.22,1.18,.0,3);vase(w*.35,1.18,.1,.65);}
    corner('成對節拍收納島',2.12,0,.65,0,()=>{folio(2.15,1.30);score(-.32,1.18,0,.72);metronome(.54,1.18,-.10,.65);pile(-.55,1.18,.06,2);});
    corner('幾何模型工作島',3.90,0,-3.62,0,()=>{table(2.1,1.80,1.0);polyModel(-.52,1.40,0,.29);score(.35,1.10,.04,.85);vase(.82,1.10,-.25,.6);box(-.15,1.13,.37,.8,.03,.07,M.gold);basket(-.62,0,.1);});
    corner('右窗樂譜檔案',5.8,0,-.65,0,()=>{geometryShelf(1.25);basket(-.4,0,.78);flowerpot(.3,0,-.78,.95);});
    corner('左窗室內樂座席',-4.95,0,.94,Math.PI/2,()=>{seat(1.9);penguin(-.40,.87,.04,.52);score(.28,.88,-.05,.60);});
    corner('五線譜茶歇矮桌',-3.75,0,3.70,0,()=>{table(2.0,1.20,.76);score(-.50,.85,.04,.72);mug(.34,.85,.14);vase(.65,.85,-.22,.80);basket(-.55,0,-.10);});
    corner('對稱圓舞曲座席',-2.10,0,5.72,0,()=>{seat(1.65);pile(-.48,.87,-.06,2);penguin(.44,.87,.03,.52);flowerpot(-1.07,0,.10,.9);});
    corner('節奏練習積木檯',.93,0,-.95,0,()=>{table(1.45,.70,.73);score(-.30,.82,0,.60);for(let j=0;j<4;j++)box(.2+j*.16,.86,0,.12,.18+(j%2)*.10,.19,j%2?M.ivory:timber.plum,false,.035);});
    corner('前廳琴譜分冊櫃',2.35,0,2.10,0,()=>{folio(1.60,1.10);pile(-.25,1.18,.03,3);vase(.35,1.18,-.06,.7);});
    corner('後廳幾何材料櫃',-2.15,0,-5.58,0,()=>{geometryShelf(1.10);});
    corner('西廊成對聆聽席',-4.20,Y,.20,Math.PI/2,()=>{seat(2.0);penguin(-.50,.87,.03,.50);score(.35,.87,.02,.7);});
    corner('西廊茶與幾何',-4.55,Y,3.85,0,()=>{table(2.0,1.60,.8);mug(-.40,.9,.08);polyModel(.32,1.24,0,.26);vase(.5,.9,-.25,.65);basket(-.53,0,.0);});
    corner('南廊樂譜對稱櫃',-2.12,Y,5.20,0,()=>{geometryShelf(1.10);});
    corner('東北譜稿收納島',4.70,Y,-4.30,0,()=>{folio(1.15,.60);score(-.20,1.19,0,.65);metronome(.35,1.19,-.13,.6);});
    corner('北窗數學模型櫃',3.05,Y,-5.25,0,()=>{geometryShelf(1.85);});
    corner('西北床尾譜箱',-2.6,Y,-4.85,0,()=>{folio(.90,1.55);pile(0,1.18,0,3);penguin(.25,1.55,.0,.38);});
    // Thin diagonal planters need local collision cells, otherwise their world AABB cuts across the room.
    const planterColliderGeo=new THREE.BoxGeometry(1,1,1);
    function planterRail(w,y,h,d,m,r,diagonal){box(0,y,0,w,h,d,m,false,r);if(y>.5)return;const cw=w+.07,n=diagonal?Math.ceil(cw/.10):1;for(let i=0;i<n;i++){const o=mesh(planterColliderGeo,m,-cw/2+(i+.5)*cw/n,.4225,0,true);o.scale.set(cw/n,.845,.26);o.visible=false;}}
    // Balcony planters are only 0.25 m deep: a continuous 1.6 m clear loop survives inside them.
    for(let j=0;j<8;j++){const a=j*Math.PI/4;for(const u of (j===6?[-2.12,2.12]:[0]))corner('陽台窄薰衣草花槽',...face(a,u,Y,9.16),a,()=>{const w=j===6?2.05:6.25;planterRail(w,.39,.78,.24,glaze.ivory,.055,j%2);planterRail(w+.07,.80,.09,.26,M.honey,.025,j%2);for(let x=-w/2+.25;x<w/2;x+=.80){lavender(x,.85,0,.95);trail(x,.86,.06,5);}});}

    corner('室內樂分譜長桌',-3.85,0,1.50,0,()=>{table(1.25,2.0,.82);score(-.28,.92,.04,.75);mug(.37,.92,.2);vase(.42,.92,-.3,.7);pile(-.48,.92,-.3,2);});
    corner('和弦幾何教具櫃',-2.45,0,-2.90,0,()=>{folio(1.95,1.20);polyModel(-.4,1.55,.0,.30);metronome(.47,1.18,-.15,.7);score(.15,1.18,.22,.65);});
    corner('節奏木片工作檯',4.20,0,-1.25,0,()=>{table(1.20,1.45,.87);score(-.15,.98,.25,.65);for(let j=0;j<4;j++)box(.2,.99,-.42+j*.19,.35,.10,.13,j%2?M.ivory:timber.plum,false,.03);vase(-.25,.98,-.45,.6);});
    corner('窗光四拍茶敘',-1.95,0,3.55,0,()=>{table(1.45,1.20,.75);score(-.28,.85,0,.7);mug(.4,.85,.24);vase(.42,.85,-.24,.65);pile(-.45,.85,-.3,2);});
    corner('南廊聽音腳凳',-3.6,Y,5.20,0,()=>{box(0,.29,0,1.10,.58,.80,M.honey,true,.08);box(0,.65,0,1.13,.16,.82,M.plum,false,.09);score(-.20,.75,.05,.65);penguin(.35,.75,0,.5);flowerpot(.88,0,.05,.85);});



    corner('指揮者拍號茶架',-1.45,0,2.25,0,()=>{table(.90,.55,.72);metronome(-.25,.82,0,.65);pile(.25,.82,0,2);});
    corner('床邊音樂旅行箱',-6.15,Y,-1.65,0,()=>{folio(.65,1.30);pile(0,1.18,-.35,3);vase(0,1.18,.3,.7);});
    corner('階頂幾何陳列',6.20,Y,-2.50,0,()=>{folio(.70,1.60);polyModel(0,1.51,-.2,.24);vase(0,1.18,.3,.6);});
    corner('東窗分拍長櫃',6.60,Y,.10,0,()=>{folio(.50,1.80);pile(0,1.18,-.5,3);vase(0,1.18,.48,.7);});


    corner('低矮拍號器材箱',-1.85,0,-.85,0,()=>{box(0,.18,0,1.50,.36,1.30,M.wood,false,.065);box(0,.39,0,1.53,.065,1.33,timber.plum,false,.045);for(const x of [-.36,.36])box(x,.2,-.37,.035,.25,.02,M.gold);box(0,.43,0,.65,.012,.45,M.paper);for(let k=0;k<5;k++)box(0,.439,-.15+k*.07,.5,.004,.01,print.ink);});
    for(const p of [[-2.55,3.25],[0,3.00]])corner('八拍地坐聆聽墊',p[0],Y,p[1],0,()=>{const r=p[0]===0?.78:.92;mesh(new THREE.CylinderGeometry(r,r+.02,.36,8),M.soft,0,.18,0);mesh(new THREE.CylinderGeometry(r-.06,r-.02,.055,8),M.plum,0,.385,0);for(let j=0;j<8;j++){const a=j*Math.PI/4;beam([0,.418,0],[Math.sin(a)*.66,.418,Math.cos(a)*.66],.012,cloth.gold);}dot(0,.42,0,.06,cloth.ivory,1,.15,1);});


    corner('琴邊合奏踏板箱',-5.90,0,-.50,0,()=>{box(0,.18,0,.70,.36,.80,M.honey,false,.06);box(0,.39,0,.73,.06,.83,timber.plum,false,.045);for(const x of [-.23,.23])box(x,.22,-.41,.035,.20,.02,M.gold);box(0,.426,0,.42,.01,.36,M.paper);for(let k=0;k<5;k++)box(0,.434,-.12+k*.06,.34,.004,.008,print.ink);});


    corner('折疊譜架器材箱',2.80,Y,-2.85,0,()=>{box(0,.17,0,1.40,.34,1.20,M.wood,false,.07);box(0,.37,0,1.44,.06,1.24,timber.plum,false,.05);for(const x of [-.48,.48])box(x,.22,-.615,.04,.22,.025,M.gold);box(0,.412,0,.84,.012,.50,M.paper);for(let k=0;k<5;k++)box(0,.424,-.17+k*.085,.65,.004,.012,print.ink);});

    // Combine static walk surfaces by material and visibility, preserving every original triangle and ramp.
    // house.js deliberately skips walk meshes when merging; doing this here avoids 80+ separate slab draws.
    g.updateMatrixWorld(true);
    const walkBatches=new Map();g.traverse(o=>{if(!o.isMesh||!o.userData.walk)return;const key=o.material.uuid+'|'+o.visible;if(!walkBatches.has(key))walkBatches.set(key,[]);walkBatches.get(key).push(o);});
    walkBatches.forEach(list=>{if(list.length<2)return;const P=[],N=[],UV=[],v=new THREE.Vector3(),normal=new THREE.Matrix3();for(const o of list){const ge=o.geometry,pa=ge.attributes.position,na=ge.attributes.normal,uv=ge.attributes.uv,ix=ge.index,n=ix?ix.count:pa.count;normal.getNormalMatrix(o.matrixWorld);for(let i=0;i<n;i++){const k=ix?ix.getX(i):i;v.fromBufferAttribute(pa,k).applyMatrix4(o.matrixWorld);P.push(v.x,v.y,v.z);v.fromBufferAttribute(na,k).applyMatrix3(normal).normalize();N.push(v.x,v.y,v.z);UV.push(uv?uv.getX(k):0,uv?uv.getY(k):0);}}const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(P,3));ge.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));ge.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));const o=mesh(ge,list[0].material,0,0,0,false,true);o.visible=list[0].visible;o.name='合併可走樓板';for(const old of list){g.remove(old);old.geometry.dispose();}});

    Object.assign(g.userData,{
      // 環境以短燈槽與樓上洗牆分層，五線譜層板和證明桌補任務光，白色鋼琴樂譜為重點，床與譜櫃底柔光收邊。
      glow:[
        {kind:'cove',a:[-6.88,3.5,-2.05],b:[-6.88,3.5,-1.25],n:[1,0],c:'#bcb5df'},
        {kind:'under',a:face(5*Math.PI/4,-2.4,2.78,6.45),b:face(5*Math.PI/4,-1.5,2.78,6.45)},
        {kind:'wash',a:[-2.05,7.75,-6.8],b:[-1.25,7.75,-6.8],n:[0,1],c:'#bcb5df'},
        {kind:'under',a:face(5*Math.PI/4,-2.4,6.98,6.45),b:face(5*Math.PI/4,-1.5,6.98,6.45)},
        {kind:'kick',a:[-5.35,4.3,-1.4],b:[-3.45,4.3,-1.4],n:[0,1]},
        {kind:'kick',a:[3.75,.1,3.6],b:[4.95,.1,3.6],n:[0,1]},
        {kind:'spot',p:[-4.6,3.78,-1],t:[-4.55,1.55,-2.75],r:.55},
        {kind:'spot',p:[.1,3.75,-4.5],t:[-.35,1.2,-4.6],r:.75}
      ],
      spawn:[0,0,4.9,Math.PI],exit:[0,6.48,.62],host:[-1.55,0,.4,.4],cols,
      gifts:[[2.55,0,-1.6,0],[-2.55,0,1.6,0],[-4.9,Y,2.0,Math.PI/2],[3.2,Y,-4.2,0]],
      lights:lamps.map((p,j)=>[...p,'#ffdda8',j===5?1.1:1.25]),sun:[0,.85,1],
      spots:[
        {x:.1,y:0,z:-3.1,r:1.15,kind:'study',label:'合拍解題',name:'座標草稿與證明書桌',lines:['先把條件排好，我們再決定下一拍。','式子每移一步，都要帶著等號的平衡。','圖上的座標很守時，只有我的橡皮擦遲到。','卡住就放慢，我陪你把這一小節接起來。'],alone:['草稿依條件、推導、檢查分成整齊三欄。','尺與鉛筆並排，旁邊畫了一尾小魚。']},
        {x:-3.3,y:0,z:-1.15,r:1.05,kind:'look',label:'聽聽琴鍵',name:'直立鋼琴與小節樂譜',lines:['這裡是練琴區，錯一拍也能接回來。','八度很像走一圈，回到熟悉的位置。','節拍器不會催你，它只是很有規律地點頭。'],alone:['黑白琴鍵上擺著一本攤開的樂譜。','小節線與草稿上的分欄，有相似的節奏。']},
        {x:0,y:0,z:1.3,r:1.2,kind:'look',label:'數數八角',name:'八方對稱羅盤地毯',lines:['八個方向都排好了，請隨意選一拍。','轉過四十五度，這個圖樣又和自己合拍。','我只要求地毯對稱，麵包屑就隨它吧。'],alone:['八片交錯的三角形繞著地毯中心排列。','黃銅色線條把八角房間的方向接在一起。']},
        {x:0,y:Y,z:4.65,r:1.2,kind:'look',label:'玫瑰聽音',name:'八瓣玫瑰窗聆聽長椅',lines:['八片花瓣把同一束光，分成了八個樂句。','這裡不必解題，坐著聽海浪就好。','休止符也佔一個位置，休息當然算進度。'],alone:['玫瑰窗的八瓣金色窗櫺映在紫色坐墊上。','五線譜欄杆繞著挑空，留下安靜的回音。']},
        {x:0,y:Y,z:-3.5,r:1.15,kind:'look',label:'整理樂譜',name:'後窗樂譜檔案桌',lines:['我把草稿與樂譜分開，才不會彈出答案。','每份樂譜都有編號，找回旋律比較省力。','這張只畫了魚，歸在今天的休止符。'],alone:['成對的檔案櫃，依小節編號放好樂譜。','桌上的節拍器停在中間，像等人接拍。']},
        {x:-8.2,y:Y,z:.3,r:1.1,kind:'look',label:'陽台數拍',name:'五線譜環繞陽台',lines:['走完這圈陽台，剛好替今天畫一個圓。','欄杆五條線要排整齊，海風可以自由一點。','你看，花也會在重拍時輕輕點頭。'],alone:['敞開的側拱窗通往一整圈八角陽台。','五道黑色橫線與金色音符圍著海景。']}
      ]
    });
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);

