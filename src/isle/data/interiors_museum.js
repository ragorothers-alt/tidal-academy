/* 潮汐小島 · 博物館的整棟室內（v8.1）：TA.ISLE.INTERIORS['museum'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['museum'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '潮汐博物館・發現的圓頂';
    const C = { cream:'#fff3db', stone:'#f5e8cd', floor:'#fff4df', honey:'#d9ad70', dark:'#ac774a', brass:'#f4bf55', dome:'#c8b4e2', ink:'#a496bf', water:'#36c8ef', tide:'#9be6df', leaf:'#8fa995', fern:'#557c73', lilac:'#d9c4e9', print:'#777a98', bone:'#e8d8b6', paper:'#fffaf0', joint:'#e8dac2', wing:'#ffe6bd', ceiling:'#ffe8c5' };
    const kinds = {cream:'plaster',stone:'stone',floor:'stone',honey:'wood',dark:'wood',brass:'metal',dome:'plaster',ink:'fabric',water:'ceramic',tide:'ceramic',leaf:'foliage',fern:'foliage',lilac:'fabric',print:'paper',bone:'stone',paper:'paper',joint:'stone',wing:'plaster',ceiling:'plaster'};
    const M = {}; Object.keys(C).forEach(k => { const kind=kinds[k]; M[k]=kit.mat(C[k],{roughness:kind==='metal'?.28:kind==='wood'?.68:kind==='ceramic'?.38:k==='floor'?.38:.86,metalness:kind==='metal'?.38:0,side:THREE.DoubleSide},kind); });
    const view=kit.view(), glass=kit.glass(), lamp=kit.lamp('#ffc690'), warm=kit.lamp('#ffcf9c'), shade=kit.shade(C.floor);
    // 側廳窗景不投影，讓日光真正穿過拱洞；仍共用即時島景。
    const sideView=view.clone();sideView.uniforms=view.uniforms;sideView.transparent=true;sideView.depthWrite=false;
    const V=(a)=>new THREE.Vector3(...a), cols=[];
    function mesh(geo,m,x=0,y=0,z=0,solid=false,walk=false) {const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(solid)o.userData.solid=true;if(walk)o.userData.walk=true;g.add(o);return o;}
    const cube=new THREE.BoxGeometry(1,1,1), inset=cube.clone(), plate=cube.clone(), vtrim=cube.clone(), htrim=cube.clone(), orb=new THREE.SphereGeometry(1,8,5);
    inset.setIndex(Array.from(cube.index.array).slice(0,30));
    plate.setIndex(Array.from(cube.index.array).slice(24,30));vtrim.setIndex([...Array.from(cube.index.array).slice(0,12),...Array.from(cube.index.array).slice(24,30)]);htrim.setIndex(Array.from(cube.index.array).slice(12,30));
    function box(x,y,z,w,h,d,m,solid=false,r=0) {const radius=r&&Math.min(w,h,d)>.10?Math.min(r,.045):0,o=mesh(radius?kit.rbox(w,h,d,radius):cube,m,x,y,z,solid);if(!radius)o.scale.set(w,h,d);return o;}
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1) {const o=mesh(orb,m,x,y,z);o.scale.set(r*sx,r*sy,r*sz);return o;}
    function beam(a,b,r,m) {const A=V(a),B=V(b),d=B.clone().sub(A);const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),6),m,...A.clone().add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
    function tube(pts,r,m) {for(let j=1;j<pts.length;j++)beam(pts[j-1],pts[j],r,m);}
    function ring(x,y,z,r,t,m) {const o=mesh(new THREE.TorusGeometry(r,t,6,48),m,x,y,z);o.rotation.x=Math.PI/2;return o;}
    function arch(w,h,b=0) {const r=w/2,cy=b+h-r,p=[[-r,b],[r,b],[r,cy]];for(let j=1;j<=16;j++){const a=j*Math.PI/16;p.push([r*Math.cos(a),cy+r*Math.sin(a)]);}return p;}
    function shape(points,depth,m,x=0,y=0,z=0,a=0) {const s=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));const o=mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:10}),m,x,y,z);o.rotation.y=a;return o;}
    function at(x,z,u,d,a) {return [x+u*Math.cos(a)+d*Math.sin(a),z-u*Math.sin(a)+d*Math.cos(a)];}
    function localBox(x,z,u,y,d,w,h,dep,m,a=0,solid=false,r=0) {const p=at(x,z,u,d,a),o=box(p[0],y,p[1],w,h,dep,m,solid,r);o.rotation.y=a;return o;}
    function outline(x,z,points,a,m=M.brass,r=.04,d=0) {tube(points.map(([u,y])=>{const p=at(x,z,u,d,a);return[p[0],y,p[1]];}),r,m);}
    function wall(x,z,w,h,a,openings=[],solid=true,depth=.30,finish=M.cream) {
      const s=new THREE.Shape([new THREE.Vector2(-w/2,0),new THREE.Vector2(w/2,0),new THREE.Vector2(w/2,h),new THREE.Vector2(-w/2,h)]);
      openings.forEach(op=>s.holes.push(new THREE.Path(arch(op.w,op.h,op.y).map(p=>new THREE.Vector2(p[0]+op.u,p[1])).reverse())));
      const o=mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:10}),finish,x,0,z,solid);o.rotation.y=a;
      localBox(x,z,0,.16,-.035,w,.32,.10,M.stone,a);localBox(x,z,0,.88,-.035,w,.10,.12,M.honey,a);localBox(x,z,0,h-.13,-.06,w,.21,.22,M.stone,a);
      for(let u=-w/2+.5;u<w/2;u+=1.35)localBox(x,z,u,.53,-.04,1.14,.53,.055,M.stone,a);
      openings.forEach(op=>{
        outline(x,z,arch(op.w,op.h,op.y).map(p=>[p[0]+op.u,p[1]]),a,M.stone,.10,-.035);
        outline(x,z,arch(op.w-.12,op.h-.08,op.y+.04).map(p=>[p[0]+op.u,p[1]]),a,M.brass,.025,-.10);
        const p=at(x,z,op.u,.75,a),v=mesh(new THREE.PlaneGeometry(op.w+.42,op.h+.42),finish===M.wing?sideView:view,p[0],op.y+op.h/2,p[1]);v.rotation.y=a+Math.PI;
        localBox(x,z,op.u,op.y+op.h*.45,-.10,op.w,.045,.065,M.brass,a);localBox(x,z,op.u,op.y+op.h/2,-.10,.045,op.h-.08,.065,M.brass,a);
        localBox(x,z,op.u,op.y-.04,-.10,op.w+.35,.12,.42,M.stone,a);
      });return o;
    }
    function column(x,z,h=3.55,r=.24) {
      box(x,.13,z,r*2+.10,.26,r*2+.10,M.stone,true,.035);
      mesh(new THREE.CylinderGeometry(r*.86,r,h-.50,12),M.cream,x,(h+.08)/2,z,true);
      for(const y of [.32,h-.31,h-.15])mesh(new THREE.CylinderGeometry(r*1.12,r*1.12,.08,12),M.brass,x,y,z);
      box(x,h-.065,z,r*2+.20,.13,r*2+.20,M.stone);
    }
    function portal(x,z,a,w=3,h=3.2) {
      const pts=arch(w,h),outer=arch(w+.28,h+.18),s=new THREE.Shape(outer.map(p=>new THREE.Vector2(...p)));s.holes.push(new THREE.Path(pts.map(p=>new THREE.Vector2(...p)).reverse()));
      const o=mesh(new THREE.ExtrudeGeometry(s,{depth:.26,bevelEnabled:false}),M.stone,x,0,z);o.rotation.y=a;
      outline(x,z,pts,a,M.brass,.035,-.025);
      for(const u of [-w/2-.11,w/2+.11]){localBox(x,z,u,1.10,.06,.26,2.20,.42,M.stone,a);localBox(x,z,u,.18,.06,.40,.36,.50,M.stone,a);}
    }
    function top(pts,m) {const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([pts[0],pts[1],pts[2],pts[0],pts[2],pts[3]].flat(),3));geo.computeVertexNormals();return mesh(geo,m);}
    // 米白大理石、拼花與連續嵌線。
    const floor=box(0,-.16,0,24,.32,18,M.floor);floor.userData.walk=true;
    for(let x=-12;x<=12;x+=1.5)box(x,.002,0,.006,.003,18,M.joint);
    for(let z=-9;z<=9;z+=1.5)box(0,.003,z,24,.003,.006,M.joint);
    for(const x of [-6,6,-1.35,1.35]){box(x,.006,0,.16,.008,17.2,M.lilac);for(const side of [-1,1])box(x+side*.10,.011,0,.022,.008,17.2,M.brass);}
    for(const z of [-8.5,8.5]){box(0,.008,z,23,.008,.18,M.lilac);for(const side of [-1,1])box(0,.013,z+side*.12,23,.008,.025,M.brass);}
    function inlay(points,m,y=.015){const sh=new THREE.Shape(points.map(p=>new THREE.Vector2(...p))),o=mesh(new THREE.ShapeGeometry(sh),m,0,y,-1);o.rotation.x=-Math.PI/2;return o;}
    for(const [r,w,m]of [[2.7,.05,M.brass],[3.0,.18,M.lilac],[3.8,.025,M.brass],[4.65,.15,M.lilac],[4.88,.045,M.brass],[5.12,.025,M.brass]]){
      const o=mesh(new THREE.RingGeometry(r-w/2,r+w/2,64),m,0,.014,-1);o.rotation.x=-Math.PI/2;
    }
    for(let j=0;j<16;j++){
      const a=j*Math.PI/8,pt=(r,t)=>[Math.sin(t)*r,Math.cos(t)*r];
      inlay([pt(.65,a),pt(2.78,a+.035),pt(3.90,j%2?a:a+.012),pt(2.78,a-.035)],j%2?M.brass:M.dome);
      inlay([pt(4.05,a),pt(4.37,a+.035),pt(4.65,a),pt(4.37,a-.035)],M.lilac,.016);
    }
    // 八扇一樓拱窗，背牆無窗；正門保留實際可通行的洞。
    for(const side of [-1,1])wall(side*12,0,18,4.4,side*Math.PI/2,[-5.54,1.12,7.51].map(z=>({u:-side*z,y:1,w:2.2,h:2.85})),true,.30,M.wing);
    wall(0,-9,24,4.4,Math.PI);
    wall(-6.65,9,10.7,4.4,0,[{u:-2.81,y:1,w:1.2,h:2.2}]);
    wall(6.65,9,10.7,4.4,0,[{u:2.81,y:1,w:1.2,h:2.2}]);
    const dh=new THREE.Shape([new THREE.Vector2(-1.3,0),new THREE.Vector2(1.3,0),new THREE.Vector2(1.3,4.4),new THREE.Vector2(-1.3,4.4)]);
    dh.holes.push(new THREE.Path(arch(2.6,2.2).map(p=>new THREE.Vector2(...p)).reverse()));mesh(new THREE.ExtrudeGeometry(dh,{depth:.30,bevelEnabled:false}),M.cream,0,0,9);
    portal(0,8.98,0,2.6,2.2);
    // 門扇位於洞口外側，玻璃菱紋與把手朝室內。
    for(const x of [-.65,.65]){box(x,1.03,9.12,1.25,2.04,.07,M.honey);box(x,1.36,9.07,.90,1.20,.025,glass);for(const s of [-1,1])beam([x-.42,1.0,9.045],[x+.42,1.0+s*.55,9.045],.018,M.brass);ball(x+(x<0?.47:-.47),.95,9.035,.045,M.brass);}
    box(0,1.04,9.055,.08,2.08,.10,M.dark);
    for(const x of [-5.2,-3.2,3.2,5.2])column(x,7.9);
    const crescent=[];for(let j=0;j<=24;j++){const a=.65+(Math.PI*2-1.3)*j/24;crescent.push([Math.cos(a)*.38,Math.sin(a)*.38]);}for(let j=24;j>=0;j--){const a=.85+(Math.PI*2-1.7)*j/24;crescent.push([.13+Math.cos(a)*.30,Math.sin(a)*.30]);}
    shape(crescent,.045,M.brass,-.16,3.25,8.80);shape([[0,.28],[.065,.065],[.28,0],[.065,-.065],[0,-.28],[-.065,-.065],[-.28,0],[-.065,.065]],.04,M.brass,.34,3.25,8.80);
    // 四個展廳拱口上方連續石帶，下方保留三公尺通路。
    for(const x of [-6,6]){
      for(const [a,b] of [[-9,-4.5],[-1.5,3.5],[6.5,9]]){box(x,2.2,(a+b)/2,.24,4.4,b-a,M.cream,true);for(const y of [.18,.92,4.26])box(x,y,(a+b)/2,.34,.12,b-a,M.stone);}
      for(const z of [-3,5]){portal(x,z,Math.PI/2);box(x,3.92,z,.24,.96,3,M.cream);}
    }
    portal(0,-4.90,0,3.6,3.2);
    // 奶油圓柱沿拱口兩側成列，金色柱頭承住鼓座。
    for(const x of [-5.75,5.75])for(const z of [-4.75,-1.25,3.25,6.75])column(x,z,4.15,.31);
    for(const x of [-2.15,2.15])column(x,-4.90,4.15,.29);
    // 周邊四坡斜天花與圓形開口。
    for(let j=0;j<64;j++){
      const a=j*Math.PI/32,b=(j+1)*Math.PI/32;
      const edge=t=>{const s=Math.sin(t),c=Math.cos(t),r=Math.min(12/Math.max(Math.abs(s),.0001),(c>0?10:8)/Math.max(Math.abs(c),.0001));return[s*r,4.4,-1+c*r];};
      top([edge(a),edge(b),[5.7*Math.sin(b),5.10,-1+5.7*Math.cos(b)],[5.7*Math.sin(a),5.10,-1+5.7*Math.cos(a)]],Math.abs((edge(a)[0]+edge(b)[0])/2)>5.8?M.ceiling:M.cream);
      if(j%8===0)beam(edge(a),[5.7*Math.sin(a),5.04,-1+5.7*Math.cos(a)],.065,M.stone);
    }
    for(const x of [-11.80,11.80])for(const z of [-8.6,-3.7,-.5,3.4,8.5]){
      box(x,2.1,z,.26,4.2,.34,M.cream);box(x,.18,z,.40,.36,.49,M.stone);box(x,.39,z,.34,.065,.42,M.brass);
      box(x,4.13,z,.38,.12,.46,M.brass);box(x,4.27,z,.48,.16,.56,M.cream);
    }

    // 側廳的暖奶油護牆、金線與木質斜頂肋條。
    function timber(a,b,w=.09,d=.10,m=M.honey){const A=V(a),B=V(b),v=B.clone().sub(A),o=box(...A.clone().add(B).multiplyScalar(.5).toArray(),w,v.length(),d,m);o.quaternion.setFromUnitVectors(V([0,1,0]),v.normalize());return o;}
    function roofY(x,z){const r=Math.hypot(x,z+1),sn=x/r,cs=(z+1)/r,outer=Math.min(12/Math.max(Math.abs(sn),.0001),(cs>0?10:8)/Math.max(Math.abs(cs),.0001));return 4.4+.7*(outer-r)/(outer-5.7);}
    for(const side of [-1,1]){
      const a=side*Math.PI/2,x=side*12;
      for(const y of [.32,.96,3.98,4.31])localBox(x,0,0,y,-.12,17.4,y===.96?.065:.10,.14,y===.96?M.brass:M.cream,a);
      for(let u=-8.2;u<8.6;u+=1.35){
        localBox(x,0,u,.57,-.105,1.12,.50,.035,M.cream,a);
        for(const v of [-.50,.50])localBox(x,0,u+v,.57,-.14,.024,.40,.026,M.honey,a);
        for(const y of [.37,.77])localBox(x,0,u,y,-.14,1.02,.024,.026,M.honey,a);
      }
      for(const z of [-7.9,-5.0,-2.0,2.8,5.8,8.25]){
        for(let j=0;j<4;j++){const ax=side*(6.35+j*1.36),bx=side*(6.35+(j+1)*1.36);timber([ax,roofY(ax,z)-.035,z],[bx,roofY(bx,z)-.035,z],.095,.12);}
      }
      for(const xx of [7.0,9.4,11.55])for(const [za,zb]of [[-8.55,-.45],[1.6,8.55]]){
        const x=side*xx;for(let j=0;j<4;j++){const z=za+(zb-za)*j/4,zz=za+(zb-za)*(j+1)/4;timber([x,roofY(x,z)-.012,z],[x,roofY(x,zz)-.012,zz],.045,.055,M.cream);}
      }
      // 燈槽貼外牆，發光面上方保留四十公分的回光斜頂。
      for(const [za,zb]of [[-8.1,-.15],[2.0,8.15]]){
        box(side*11.91,4.11,(za+zb)/2,.15,.32,zb-za,M.wing);
        box(side*11.77,3.98,(za+zb)/2,.35,.08,zb-za,M.cream);
      }
      for(const z of [-5.54,1.12,7.51]){
        const p=at(x,z,0,-.15,a),o=mesh(new THREE.RingGeometry(.285,.315,20),M.brass,p[0],3.22,p[1]);o.scale.y=1.2;o.rotation.y=a;
      }
      // 北側端牆也讀得出同一組暖奶油飾面。
      box(side*9.05,2.2,-8.81,5.48,4.32,.035,M.wing);
      for(const y of [.18,.91,4.24])box(side*9.05,y,-8.74,5.48,.10,.12,y===.91?M.brass:M.cream);
    }
    // 四個展區共用一張圖集，保留紙面筆觸與黃銅窄框。
    const artOptions={roughness:.91,side:THREE.DoubleSide,name:'側廳主題圖'};let artMap=null;
    if(typeof document!=='undefined'){
      const cv=document.createElement('canvas');cv.width=cv.height=1024;const c=cv.getContext('2d');
      for(let k=0;k<4;k++){
        c.save();c.translate(k%2*512,Math.floor(k/2)*512);c.fillStyle=C.paper;c.fillRect(0,0,512,512);
        c.strokeStyle=C.honey;c.lineWidth=2;c.strokeRect(18,18,476,476);c.save();c.beginPath();c.rect(35,67,442,362);c.clip();
        if(k===0){
          c.fillStyle='#d6eee5';c.fillRect(35,67,442,362);
          for(let j=0;j<7;j++){c.strokeStyle=j%2?C.tide:C.water;c.lineWidth=15-j; c.beginPath();for(let x=30;x<490;x+=4){const y=120+j*42+Math.sin(x*.023+j)*17;x===30?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}
          for(let j=0;j<6;j++){const x=110+j%3*130,y=163+Math.floor(j/3)*157;c.fillStyle=j%2?C.honey:C.fern;c.beginPath();c.ellipse(x,y,34,14,-.18,0,7);c.fill();c.beginPath();c.moveTo(x+27,y);c.lineTo(x+51,y-22);c.lineTo(x+51,y+18);c.fill();c.fillStyle=C.paper;c.beginPath();c.arc(x-21,y-3,3,0,7);c.fill();}
        }else if(k===1){
          c.strokeStyle=C.fern;c.lineWidth=3;
          for(let j=0;j<4;j++){const x=76+j*116;c.beginPath();c.moveTo(x,410);c.quadraticCurveTo(x-42,260,x,100);c.stroke();for(let n=0;n<6;n++){const y=380-n*43;c.fillStyle=n%2?C.leaf:C.fern;c.beginPath();c.ellipse(x+(n%2?15:-15),y,23,8,n%2?-.7:.7,0,7);c.fill();}}
          for(let j=0;j<4;j++){const x=160+j%2*195,y=185+Math.floor(j/2)*155;for(const s of [-1,1]){c.fillStyle=j%2?C.dome:C.honey;c.beginPath();c.ellipse(x+s*25,y-12,29,39,s*.5,0,7);c.fill();c.fillStyle=C.lilac;c.beginPath();c.ellipse(x+s*20,y+26,23,27,s*.5,0,7);c.fill();}c.strokeStyle=C.dark;c.lineWidth=5;c.beginPath();c.moveTo(x,y-30);c.lineTo(x,y+40);c.stroke();}
        }else if(k===2){
          const colors=[C.bone,C.honey,C.dome,C.stone,C.dark,C.lilac];for(let j=0;j<6;j++){c.fillStyle=colors[j];c.beginPath();c.moveTo(20,120+j*51);for(let x=20;x<=500;x+=10)c.lineTo(x,110+j*52+Math.sin(x*.013+j*.3)*29);c.lineTo(500,500);c.lineTo(20,500);c.fill();}
          c.strokeStyle=C.paper;c.lineWidth=3;for(const x of [130,265,405]){c.beginPath();c.moveTo(x,100);c.lineTo(x-32,414);c.stroke();}
          for(let j=0;j<5;j++){const x=110+j*66;c.fillStyle=j%2?C.tide:C.dome;c.beginPath();c.moveTo(x,290);c.lineTo(x+15,245-j%2*36);c.lineTo(x+34,277);c.lineTo(x+27,328);c.lineTo(x+6,337);c.closePath();c.fill();c.strokeStyle=C.paper;c.lineWidth=2;c.stroke();}
        }else{
          const gr=c.createLinearGradient(0,65,0,430);gr.addColorStop(0,'#d9e8eb');gr.addColorStop(.45,C.water);gr.addColorStop(1,C.tide);c.fillStyle=gr;c.fillRect(35,67,442,362);
          c.fillStyle=C.leaf;c.beginPath();c.moveTo(35,120);c.lineTo(135,156);c.lineTo(170,226);c.lineTo(263,267);c.lineTo(215,306);c.lineTo(35,350);c.fill();
          c.fillStyle=C.bone;c.beginPath();c.moveTo(35,244);c.bezierCurveTo(235,264,153,326,375,366);c.lineTo(477,429);c.lineTo(35,429);c.fill();
          for(let j=0;j<6;j++){c.strokeStyle=C.paper;c.lineWidth=3;c.beginPath();c.ellipse(320+j%3*46,236+j*25,52,5,-.12,0,Math.PI);c.stroke();c.fillStyle=C.stone;c.beginPath();c.ellipse(85+j*65,390-j%3*19,28,14,.2,0,7);c.fill();}
          c.fillStyle=C.paper;c.fillRect(99,122,20,62);c.fillStyle=C.honey;c.beginPath();c.moveTo(93,122);c.lineTo(109,104);c.lineTo(126,122);c.fill();
        }
        c.restore();c.fillStyle=C.dark;c.font='bold 22px sans-serif';c.textAlign='center';c.fillText(['潮汐・魚群與海流','花葉之間・蝴蝶觀察','時間的切面・岩層','退潮之後・海岸紀錄'][k],256,468);
        c.fillStyle=C.honey;for(let j=0;j<42;j++)c.fillRect(42+j*10,486,2,2);c.restore();
      }
      const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;artMap=t;
    }
    // 圖集稍後掛上，避免共用材質鍵把畫布編碼成 PNG。
    const art=kit.mat(C.paper,artOptions,'paper');if(artMap){art.map=artMap;art.needsUpdate=true;}
    function picture(x,z,a,k,w=1.22,h=1.20){
      localBox(x,z,0,2.77,-.040,w+.14,h+.14,.065,M.honey,a);
      for(const u of [-1,1])localBox(x,z,u*(w/2+.025),2.77,.024,.05,h+.09,.045,M.brass,a);
      for(const v of [-1,1])localBox(x,z,0,2.77+v*(h/2+.025),.024,w+.09,.05,.045,M.brass,a);
      const geo=new THREE.PlaneGeometry(w,h),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+k%2)/2,(uv.getY(i)+1-Math.floor(k/2))/2);
      const o=mesh(geo,art,x,2.77,z);o.rotation.y=a;localBox(x,z,0,2.01,.025,.42,.075,.018,M.paper,a);
    }
    picture(-9,-8.68,0,0,1.55,1.20);picture(9,-8.68,0,1,1.55,1.20);
    function flag(x,z,a,star=false){
      shape([[-.26,3.65],[.26,3.65],[.26,2.70],[0,2.52],[-.26,2.70]],.018,M.lilac,x,0,z,a);
      localBox(x,z,0,3.68,.02,.68,.035,.045,M.brass,a);
      const pts=star?[[0,.20],[.06,.06],[.20,0],[.06,-.06],[0,-.20],[-.06,-.06],[-.20,0],[-.06,.06]]:crescent.map(([u,y])=>[u*.46,y*.46]);
      const o=shape(pts,.006,M.brass,x,3.14,z,a);o.position.add(V([Math.sin(a)*.025,0,Math.cos(a)*.025]));
      for(const y of [2.82,2.89])localBox(x,z,0,y,.03,.23,.012,.008,M.brass,a);
    }
    function sconce(x,z,a){
      localBox(x,z,0,2.62,0,.17,.34,.055,M.brass,a);
      const p=at(x,z,0,.21,a);timber([x,2.53,z],[p[0],2.53,p[1]],.035,.035,M.brass);
      mesh(new THREE.CylinderGeometry(.105,.16,.24,6,1,true),shade,p[0],2.75,p[1]);mesh(new THREE.CylinderGeometry(.105,.105,.016,6),lamp,p[0],2.63,p[1]);
      ball(p[0],2.91,p[1],.04,M.brass);
    }
    for(const side of [-1,1]){
      const x=side*11.76,a=-side*Math.PI/2;
      for(const z of [-2.65,-1.05])picture(x,z,a,side<0?0:1);
      for(const z of [4.15,5.70])picture(x,z,a,side<0?3:2,1.12,1.12);
      for(const z of [-7.5,2.75]){flag(x,z,a,z>0);sconce(x,z+(z>0?-.52:.65),a);}
    }

    // 鼓座八拱高窗在曲牆內真正挖洞。
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4,wd=5.72*Math.PI/4,s=new THREE.Shape([new THREE.Vector2(-wd/2,3.55),new THREE.Vector2(wd/2,3.55),new THREE.Vector2(wd/2,5.1),new THREE.Vector2(-wd/2,5.1)]);
      s.holes.push(new THREE.Path(arch(1.24,1.47,3.59).map(p=>new THREE.Vector2(...p)).reverse()));
      const geo=new THREE.ExtrudeGeometry(s,{depth:.30,bevelEnabled:false,curveSegments:12}),p=geo.attributes.position;
      for(let i=0;i<p.count;i++){const t=a+p.getX(i)/5.72,r=5.72+p.getZ(i);p.setXYZ(i,r*Math.sin(t),p.getY(i),-1+r*Math.cos(t));}p.needsUpdate=true;geo.computeVertexNormals();mesh(geo,M.stone);
      tube(arch(1.24,1.47,3.59).map(([u,y])=>[(5.69)*Math.sin(a+u/5.72),y,-1+(5.69)*Math.cos(a+u/5.72)]),.048,M.brass);
      const v=mesh(new THREE.PlaneGeometry(1.65,1.65),view,6.47*Math.sin(a),4.40,-1+6.47*Math.cos(a));v.rotation.y=a+Math.PI;
      beam([5.69*Math.sin(a),3.63,-1+5.69*Math.cos(a)],[5.69*Math.sin(a),5.02,-1+5.69*Math.cos(a)],.018,M.brass);
    }
    ring(0,3.55,-1,5.72,.095,M.stone);ring(0,5.08,-1,5.7,.09,M.brass);
    const dome=new THREE.SphereGeometry(5.7,64,20,0,Math.PI*2,Math.asin(.85/5.7),Math.PI/2-Math.asin(.85/5.7));dome.scale(1,.84,1);mesh(dome,M.dome,0,5.1,-1);
    for(let j=0;j<8;j++){const a=j*Math.PI/4,pts=[];for(let i=0;i<=20;i++){const t=Math.asin(.85/5.7)+(Math.PI/2-Math.asin(.85/5.7))*i/20;pts.push([5.66*Math.sin(t)*Math.sin(a),5.1+5.66*.84*Math.cos(t),-1+5.66*Math.sin(t)*Math.cos(a)]);}tube(pts,.11,M.brass);}
    ring(0,9.81,-1,.87,.075,M.brass);ring(0,9.78,-1,.97,.032,M.brass);
    const sky=mesh(new THREE.CircleGeometry(.96,40),view,0,10.15,-1);sky.rotation.x=Math.PI/2;
    // 圓廳燈槽的石帶與回光頂板。
    for(const x of [-5.17,5.17]){box(x,4.75,-1,.10,.38,4.35,M.stone);box(x,5.13,-1,.48,.10,4.35,M.cream);}
    ring(0,5.03,-1,5.54,.065,M.stone);ring(0,5.10,-1,5.58,.028,warm);
    for(const z of [-6.17,4.17]){box(0,4.75,z,4.35,.38,.10,M.stone);box(0,5.13,z,4.35,.10,.48,M.cream);}
    box(0,3.88,-8.89,9.2,.12,.28,M.stone);
    // 同一套櫃身與裝飾面板，兩面圖卡各自獨立。
    function cabinet(x,z,w,d,h,type) {
      box(x,.17,z,w,.34,d,M.honey,true,.045);box(x,.35,z,w,.055,d,M.brass);
      box(x,(h+.38)/2,z,w-.12,h-.38,.18,type==='fish'?M.water:M.paper);
      box(x,h,z,w,.07,d+.22,M.honey,false,.025);box(x,h+.06,z,w,.035,d+.20,M.brass);
      for(const side of [-1,1]){box(x+side*(w/2-.055),(h+.35)/2,z,.11,h-.35,d,M.honey,true);box(x+side*(w/2-.09),.18,z,.045,.27,d+.015,M.brass);}
      for(let j=0;j<5;j++)box(x-w/2+.28+j*(w-.56)/4,.19,z+d/2+.008,.32,.17,.018,M.dark,false,.035);
      for(const side of [-1,1]){
        const xx=x+side*(w/2+.035);mesh(new THREE.CylinderGeometry(.045,.065,h-.23,8),M.brass,xx,(h+.30)/2,z+d/2+.022);
        if(type==='fish'){box(xx,.19,z+d/2,.15,.32,.16,M.stone);box(xx,.045,z+d/2,.17,.06,.18,M.brass);}
      }
      if(type==='bug'){
        const crown=arch(w*.82,.42,h+.08);shape(crown,.11,M.honey,x,0,z-.055);outline(x,z,crown,0,M.brass,.024,-.065);
        ball(x,h+.57,z,.065,M.brass);
      }
      // 碰撞沿配置外框，內部透明罩不逐格建立。
      cols.push([x-w/2,0,z-d/2,x+w/2,h,z+d/2]);
    }
    for(const z of [-6.9,-4,-1.1])cabinet(-9,z,2.4,.60,2.05,'fish');
    for(const z of [-6.3,-2.4])cabinet(9,z,2.4,.46,2.05,'bug');
    for(const z of [2.4,5.5])cabinet(9,z,2.4,.60,1.90,'mineral');
    // 底板、細框、空名牌永遠存在；法線與圖卡完全共面平行。
    const layout={"fish":[["goldfish",-9.78,0.76,-6.589,0.0,0.4,0.0],["common_carp",-9.26,0.76,-6.589,0.0,0.4,0.0],["grass_carp",-8.74,0.76,-6.589,0.0,0.4,0.0],["silver_carp",-8.22,0.76,-6.589,0.0,0.4,0.0],["bighead_carp",-9.78,1.22,-6.589,0.0,0.4,0.0],["mosquitofish",-9.26,1.22,-6.589,0.0,0.4,0.0],["guppy",-8.74,1.22,-6.589,0.0,0.4,0.0],["weather_loach",-8.22,1.22,-6.589,0.0,0.4,0.0],["redbelly_tilapia",-9.78,1.68,-6.589,0.0,0.4,0.0],["taiwan_chub",-9.26,1.68,-6.589,0.0,0.4,0.0],["flathead_mullet",-8.74,1.68,-6.589,0.0,0.4,0.0],["milkfish",-8.22,1.68,-6.589,0.0,0.4,0.0],["dusky_rabbitfish",-9.78,0.76,-7.211,3.1415926536,0.4,0.0],["silver_stripe_round_herring",-9.26,0.76,-7.211,3.1415926536,0.4,0.0],["ayu",-8.74,0.76,-7.211,3.1415926536,0.4,0.0],["taiwan_striped_barb",-8.22,0.76,-7.211,3.1415926536,0.4,0.0],["formosan_river_loach",-9.78,1.22,-7.211,3.1415926536,0.4,0.0],["taiwan_shoveljaw_carp",-9.26,1.22,-7.211,3.1415926536,0.4,0.0],["japanese_eel",-8.74,1.22,-7.211,3.1415926536,0.4,0.0],["giant_mottled_eel",-8.22,1.22,-7.211,3.1415926536,0.4,0.0],["amur_catfish",-9.78,1.68,-7.211,3.1415926536,0.4,0.0],["blotched_snakehead",-9.26,1.68,-7.211,3.1415926536,0.4,0.0],["chub_mackerel",-8.74,1.68,-7.211,3.1415926536,0.4,0.0],["japanese_jack_mackerel",-8.22,1.68,-7.211,3.1415926536,0.4,0.0],["black_seabream",-9.78,0.76,-3.689,0.0,0.4,0.0],["skipjack_tuna",-9.26,0.76,-3.689,0.0,0.4,0.0],["mahi_mahi",-8.74,0.76,-3.689,0.0,0.4,0.0],["swordfish",-8.22,0.76,-3.689,0.0,0.4,0.0],["albacore",-9.78,1.22,-3.689,0.0,0.4,0.0],["blacktip_shark",-9.26,1.22,-3.689,0.0,0.4,0.0],["greater_amberjack",-8.74,1.22,-3.689,0.0,0.4,0.0],["spotted_knifejaw",-8.22,1.22,-3.689,0.0,0.4,0.0],["orange_spotted_grouper",-9.78,1.68,-3.689,0.0,0.4,0.0],["threeline_grunt",-9.26,1.68,-3.689,0.0,0.4,0.0],["clarks_anemonefish",-8.74,1.68,-3.689,0.0,0.4,0.0],["longspine_porcupinefish",-8.22,1.68,-3.689,0.0,0.4,0.0],["ocean_sunfish",-9.78,0.76,-4.311,3.1415926536,0.4,0.0],["palette_surgeonfish",-9.26,0.76,-4.311,3.1415926536,0.4,0.0],["russells_oarfish",-8.74,0.76,-4.311,3.1415926536,0.4,0.0],["whale_shark",-8.22,0.76,-4.311,3.1415926536,0.4,0.0],["taiwan_ricefish",-9.78,1.22,-4.311,3.1415926536,0.4,0.0],["paradise_fish",-9.26,1.22,-4.311,3.1415926536,0.4,0.0],["rosy_bitterling",-8.74,1.22,-4.311,3.1415926536,0.4,0.0],["topmouth_gudgeon",-8.22,1.22,-4.311,3.1415926536,0.4,0.0],["red_seabream",-9.78,1.68,-4.311,3.1415926536,0.4,0.0],["yellowfin_seabream",-9.26,1.68,-4.311,3.1415926536,0.4,0.0],["silver_pomfret",-8.74,1.68,-4.311,3.1415926536,0.4,0.0],["japanese_butterfish",-8.22,1.68,-4.311,3.1415926536,0.4,0.0],["japanese_spanish_mackerel",-9.78,0.76,-0.789,0.0,0.4,0.0],["japanese_hairtail",-9.26,0.76,-0.789,0.0,0.4,0.0],["pacific_bluefin_tuna",-8.74,0.76,-0.789,0.0,0.4,0.0],["yellowfin_tuna",-8.22,0.76,-0.789,0.0,0.4,0.0],["indo_pacific_sailfish",-9.78,1.22,-0.789,0.0,0.4,0.0],["spotwing_flyingfish",-9.26,1.22,-0.789,0.0,0.4,0.0],["moorish_idol",-8.74,1.22,-0.789,0.0,0.4,0.0],["scissortail_sergeant",-8.22,1.22,-0.789,0.0,0.4,0.0],["spotted_scat",-9.78,1.68,-0.789,0.0,0.4,0.0],["barred_flagtail",-9.26,1.68,-0.789,0.0,0.4,0.0],["crescent_grunter",-8.74,1.68,-0.789,0.0,0.4,0.0],["blue_spotted_ribbontail_ray",-8.22,1.68,-0.789,0.0,0.4,0.0],["shortsnout_redspotted_goby",-9.78,0.76,-1.411,3.1415926536,0.4,0.0],["silver_gudgeon",-9.26,0.76,-1.411,3.1415926536,0.4,0.0],["indo_pacific_tarpon",-8.74,0.76,-1.411,3.1415926536,0.4,0.0],["barramundi",-8.22,0.76,-1.411,3.1415926536,0.4,0.0],["east_asian_threadfin",-9.78,1.22,-1.411,3.1415926536,0.4,0.0],[null,-9.26,1.22,-1.411,3.1415926536,0.4,0.0],[null,-8.74,1.22,-1.411,3.1415926536,0.4,0.0],[null,-8.22,1.22,-1.411,3.1415926536,0.4,0.0],[null,-9.78,1.68,-1.411,3.1415926536,0.4,0.0],[null,-9.26,1.68,-1.411,3.1415926536,0.4,0.0],[null,-8.74,1.68,-1.411,3.1415926536,0.4,0.0],[null,-8.22,1.68,-1.411,3.1415926536,0.4,0.0]],"bug":[["zigzag_ladybird",8.14,0.75,-6.059,0.0,0.36,0.0],["indochina_mantis",8.57,0.75,-6.059,0.0,0.36,0.0],["pinkwinged_grasshopper",9.0,0.75,-6.059,0.0,0.36,0.0],["formosan_giant_cricket",9.43,0.75,-6.059,0.0,0.36,0.0],["wandering_glider",9.86,0.75,-6.059,0.0,0.36,0.0],["variegated_green_skimmer",8.14,1.22,-6.059,0.0,0.36,0.0],["black_cicada",8.57,1.22,-6.059,0.0,0.36,0.0],["asian_honey_bee",9.0,1.22,-6.059,0.0,0.36,0.0],["blue_tiger",9.43,1.22,-6.059,0.0,0.36,0.0],["great_eggfly",9.86,1.22,-6.059,0.0,0.36,0.0],["giant_wood_spider",8.14,1.69,-6.059,0.0,0.36,0.0],["horn_eyed_ghost_crab",8.57,1.69,-6.059,0.0,0.36,0.0],["milky_fiddler_crab",9.0,1.69,-6.059,0.0,0.36,0.0],["mottled_sally_lightfoot",9.43,1.69,-6.059,0.0,0.36,0.0],["common_bluetail",9.86,1.69,-6.059,0.0,0.36,0.0],["saddlebag_glider",8.14,0.75,-6.541,3.1415926536,0.36,0.0],["paper_kite",8.57,0.75,-6.541,3.1415926536,0.36,0.0],["black_winged_firefly",9.0,0.75,-6.541,3.1415926536,0.36,0.0],["japanese_rhinoceros_beetle",9.43,0.75,-6.541,3.1415926536,0.36,0.0],["taiwan_flat_stag_beetle",9.86,0.75,-6.541,3.1415926536,0.36,0.0],["crimson_dropwing",8.14,1.22,-6.541,3.1415926536,0.36,0.0],["red_cotton_stainer",8.57,1.22,-6.541,3.1415926536,0.36,0.0],["orange_oakleaf",9.0,1.22,-6.541,3.1415926536,0.36,0.0],["coconut_crab",9.43,1.22,-6.541,3.1415926536,0.36,0.0],["tsudas_giant_stick_insect",9.86,1.22,-6.541,3.1415926536,0.36,0.0],["golden_birdwing",8.14,1.69,-6.541,3.1415926536,0.36,0.0],["two_spotted_stag_beetle",8.57,1.69,-6.541,3.1415926536,0.36,0.0],["formosan_miyama_stag",9.0,1.69,-6.541,3.1415926536,0.36,0.0],["oni_stag_beetle",9.43,1.69,-6.541,3.1415926536,0.36,0.0],["deer_stag_beetle",9.86,1.69,-6.541,3.1415926536,0.36,0.0],["yellow_margin_firefly",8.14,0.75,-2.159,0.0,0.36,0.0],["large_blacktip_firefly",8.57,0.75,-2.159,0.0,0.36,0.0],["blacktip_firefly",9.0,0.75,-2.159,0.0,0.36,0.0],["mountain_window_firefly",9.43,0.75,-2.159,0.0,0.36,0.0],["serrate_snow_firefly",9.86,0.75,-2.159,0.0,0.36,0.0],["striped_blue_crow",8.14,1.22,-2.159,0.0,0.36,0.0],["rounded_wing_blue_crow",8.57,1.22,-2.159,0.0,0.36,0.0],["double_branded_blue_crow",9.0,1.22,-2.159,0.0,0.36,0.0],["blue_banded_swallowtail",9.43,1.22,-2.159,0.0,0.36,0.0],["common_rose",9.86,1.22,-2.159,0.0,0.36,0.0],["nantou_darter",8.14,1.69,-2.159,0.0,0.36,0.0],["black_stream_glider",8.57,1.69,-2.159,0.0,0.36,0.0],["common_blue_jewel",9.0,1.69,-2.159,0.0,0.36,0.0],["atlas_moth",9.43,1.69,-2.159,0.0,0.36,0.0],["wangs_silkmoth",9.86,1.69,-2.159,0.0,0.36,0.0],["chinese_moon_moth",8.14,0.75,-2.641,3.1415926536,0.36,0.0],["giant_african_snail",8.57,0.75,-2.641,3.1415926536,0.36,0.0],["formosan_cyclophorus_snail",9.0,0.75,-2.641,3.1415926536,0.36,0.0],["tropical_leatherleaf_slug",9.43,0.75,-2.641,3.1415926536,0.36,0.0],["moltrechts_tree_frog",9.86,0.75,-2.641,3.1415926536,0.36,0.0],["ornate_narrow_mouthed_frog",8.14,1.22,-2.641,3.1415926536,0.36,0.0],["graceful_earthworm",8.57,1.22,-2.641,3.1415926536,0.36,0.0],["kew_hammerhead_flatworm",9.0,1.22,-2.641,3.1415926536,0.36,0.0],[null,9.43,1.22,-2.641,3.1415926536,0.36,0.0],[null,9.86,1.22,-2.641,3.1415926536,0.36,0.0],[null,8.14,1.69,-2.641,3.1415926536,0.36,0.0],[null,8.57,1.69,-2.641,3.1415926536,0.36,0.0],[null,9.0,1.69,-2.641,3.1415926536,0.36,0.0],[null,9.43,1.69,-2.641,3.1415926536,0.36,0.0],[null,9.86,1.69,-2.641,3.1415926536,0.36,0.0],["small_white",7.95,1.2,-8.68,0.0,0.4,0.0],["lime_swallowtail",8.65,1.2,-8.68,0.0,0.4,0.0],["plain_tiger",9.35,1.2,-8.68,0.0,0.4,0.0],["common_mormon",10.05,1.2,-8.68,0.0,0.4,0.0]],"fossil":[["trilobite_fossil",-4.14,0.82,-8.68,0.0,0.6,0.0],["ammonite_fossil",-3.22,0.82,-8.68,0.0,0.6,0.0],["belemnite_fossil",-2.3,0.82,-8.68,0.0,0.6,0.0],["orthoconic_nautiloid",-1.38,0.82,-8.68,0.0,0.6,0.0],["graptolite_fossil",-0.46,0.82,-8.68,0.0,0.6,0.0],["fusulinid_limestone",0.46,0.82,-8.68,0.0,0.6,0.0],["nummulite_fossil",1.38,0.82,-8.68,0.0,0.6,0.0],["pentamerid_fossil",2.3,0.82,-8.68,0.0,0.6,0.0],["crinoid_fossil",3.22,0.82,-8.68,0.0,0.6,0.0],["echinoid_fossil",4.14,0.82,-8.68,0.0,0.6,0.0],["coral_reef_fossil",-4.14,1.52,-8.68,0.0,0.6,0.0],["bivalve_mould",-3.22,1.52,-8.68,0.0,0.6,0.0],["stromatolite_fossil",-2.3,1.52,-8.68,0.0,0.6,0.0],["megalodon_tooth",-1.38,1.52,-8.68,0.0,0.6,0.0],["fossil_fish_skeleton",-0.46,1.52,-8.68,0.0,0.6,0.0],["tyrannosaurus_tooth_cast",0.46,1.52,-8.68,0.0,0.6,0.0],["triceratops_skull_model",1.38,1.52,-8.68,0.0,0.6,0.0],["archaeopteryx_model",2.3,1.52,-8.68,0.0,0.6,0.0],["dinosaur_track_model",3.22,1.52,-8.68,0.0,0.6,0.0],["woolly_mammoth_molar",4.14,1.52,-8.68,0.0,0.6,0.0],["palaeoloxodon_molar",-3.88,0.82,-5.42,0.0,0.6,0.436332313],["petrified_wood",-3.12,0.82,-5.42,0.0,0.6,0.436332313],["fern_compression_fossil",-3.88,1.15,-6.18,0.0,0.6,0.436332313],["amber_insect",-3.12,1.15,-6.18,0.0,0.6,0.436332313],["changbin_stone_flake",3.12,0.82,-5.42,0.0,0.6,0.436332313],[null,3.88,0.82,-5.42,0.0,0.6,0.436332313],[null,3.12,1.15,-6.18,0.0,0.6,0.436332313],[null,3.88,1.15,-6.18,0.0,0.6,0.436332313]],"sea":[["hermit_crab",-10.25,0.7,2.2,1.5707963268,0.4,0.436332313],["fiddler_crab",-10.25,0.7,2.8,1.5707963268,0.4,0.436332313],["blue_sea_star",-10.25,0.7,3.4,1.5707963268,0.4,0.436332313],["sea_urchin",-10.25,0.7,4.0,1.5707963268,0.4,0.436332313],["sea_anemone",-10.25,0.7,4.6,1.5707963268,0.4,0.436332313],["sea_hare",-10.85,1.05,2.2,1.5707963268,0.4,0.436332313],["brittle_star",-10.85,1.05,2.8,1.5707963268,0.4,0.436332313],["barnacle",-10.85,1.05,3.4,1.5707963268,0.4,0.436332313],["chiton",-10.85,1.05,4.0,1.5707963268,0.4,0.436332313],["limpet",-10.85,1.05,4.6,1.5707963268,0.4,0.436332313],["periwinkle",-10.25,0.7,5.8,1.5707963268,0.4,0.436332313],["oyster",-10.25,0.7,6.4,1.5707963268,0.4,0.436332313],["sea_cucumber",-10.25,0.7,7.0,1.5707963268,0.4,0.436332313],["small_octopus",-10.25,0.7,7.6,1.5707963268,0.4,0.436332313],["mudskipper",-10.25,0.7,8.2,1.5707963268,0.4,0.436332313],["colorful_nudibranch",-10.85,1.05,5.8,1.5707963268,0.4,0.436332313],["damselfish",-10.85,1.05,6.4,1.5707963268,0.4,0.436332313],["swimming_crab",-10.85,1.05,7.0,1.5707963268,0.4,0.436332313],["soldier_crab",-10.85,1.05,7.6,1.5707963268,0.4,0.436332313],["sea_slater",-10.85,1.05,8.2,1.5707963268,0.4,0.436332313],["shoushan_coral",-10.4,1.25,1.3,0.0,0.42,0.0],["starry_moray",-9.7,1.25,1.3,0.0,0.42,0.0],[null,-9.0,1.25,1.3,0.0,0.42,0.0],[null,-8.3,1.25,1.3,0.0,0.42,0.0],[null,-7.6,1.25,1.3,0.0,0.42,0.0]],"mineral":[["quartz",8.1,0.84,2.711,0.0,0.42,0.0],["orthoclase",8.55,0.84,2.711,0.0,0.42,0.0],["biotite",9.0,0.84,2.711,0.0,0.42,0.0],["calcite",9.45,0.84,2.711,0.0,0.42,0.0],["gypsum",9.9,0.84,2.711,0.0,0.42,0.0],["fluorite",8.1,1.48,2.711,0.0,0.42,0.0],["pyrite",8.55,1.48,2.711,0.0,0.42,0.0],["magnetite",9.0,1.48,2.711,0.0,0.42,0.0],["hematite",9.45,1.48,2.711,0.0,0.42,0.0],["graphite",9.9,1.48,2.711,0.0,0.42,0.0],["olivine",8.1,0.84,5.811,0.0,0.42,0.0],["pyroxene",8.55,0.84,5.811,0.0,0.42,0.0],["hornblende",9.0,0.84,5.811,0.0,0.42,0.0],["garnet",9.45,0.84,5.811,0.0,0.42,0.0],["chalcopyrite",9.9,0.84,5.811,0.0,0.42,0.0],["malachite",8.1,1.48,5.811,0.0,0.42,0.0],["hokutolite",8.55,1.48,5.811,0.0,0.42,0.0],["sulfur",9.0,1.48,5.811,0.0,0.42,0.0],[null,9.45,1.48,5.811,0.0,0.42,0.0],[null,9.9,1.48,5.811,0.0,0.42,0.0],["corundum",8.3,1.1,7.84,3.1415926536,0.45,0.0],["taiwan_jade",9.7,1.1,7.84,3.1415926536,0.45,0.0]]};
    const exhibits={};
    const catalog={fish:I.FISH,bug:I.BUGS,fossil:I.FOSSILS,sea:I.SEALIFE,mineral:I.MINERALS};
    function slot(s,k) {
      const [,x,y,z,ry,sz,tilt]=s,n=new THREE.Vector3(Math.sin(ry)*Math.cos(tilt),Math.sin(tilt),Math.cos(ry)*Math.cos(tilt)),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-tilt,ry,0,'YXZ'));
      function piece(u,v,d,w,h,dep,m,geo=inset) {const p=new THREE.Vector3(u,v,d).applyQuaternion(q).add(new THREE.Vector3(x,y,z)),o=mesh(geo,m,p.x,p.y,p.z);o.scale.set(w,h,dep);o.quaternion.copy(q);return o;}
      piece(0,0,-.028,sz+.045,sz+.045,.02,k==='fish'?M.water:k==='sea'?M.tide:k==='fossil'?M.bone:M.paper,plate);
      for(const u of [-1,1])piece(u*(sz/2+.032),0,-.005,.022,sz+.085,.035,k==='fossil'?M.stone:M.brass,vtrim);
      for(const v of [-1,1])piece(0,v*(sz/2+.032),-.005,sz+.085,.022,.035,k==='fossil'?M.stone:M.brass,htrim);
      // 紙牌落在框內的下緣，避開圖卡正方形。
      piece(0,-sz/2-.023,-.003,Math.min(.26,sz*.65),.028,.018,M.paper);
      if(k==='fish'){
        piece(0,-sz*.43,-.013,sz,.045,.007,M.paper);
        for(let j=0;j<3;j++){
          const p=V([-sz*.39+j*.065,-sz*.32+j%2*.025,-.014]).applyQuaternion(q).add(V([x,y,z]));
          const o=ball(...p.toArray(),.036,j%2?M.fern:M.leaf,.40,1.7,.12);o.quaternion.copy(q);
        }
      }
      if(k==='fish')for(let j=0;j<2;j++){const p=V([sz*.38,-sz*.28+j*.10,-.016]).applyQuaternion(q).add(V([x,y,z]));ball(...p.toArray(),.013,M.paper);}
    }
    Object.keys(layout).forEach(k=>{
      layout[k].forEach(s=>slot(s,k));const byId=new Map(layout[k].filter(s=>s[0]).map(s=>[s[0],s]));
      const used=new Set(),spare=layout[k].filter(s=>!s[0]);let next=0;exhibits[k]=(catalog[k]||[]).map(o=>{const s=byId.get(o.id)||spare[next++];if(s){used.add(s);return s.slice(1);}return null;}).filter(Boolean);
      layout[k].filter(s=>!used.has(s)).forEach(s=>exhibits[k].push(s.slice(1)));
    });
    // 玻璃只在礦櫃頂，魚類及標本圖卡前方留空。
    // 玻璃每個櫃面一張，彙成一個幾何，距圖卡四公分。
    const glassP=[],glassN=[];
    function pane(x,y,z,w,h,ry) {const c=Math.cos(ry),s=Math.sin(ry);for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){glassP.push(x+u*w*.5*c,y+v*h*.5,z-u*w*.5*s);glassN.push(s,0,c);}}
    for(const z of [2.4,5.5]){const o=mesh(new THREE.PlaneGeometry(2.15,.52),glass,9,1.92,z);o.rotation.x=-Math.PI/2;}
    // 兩組化石階台與二十格後牆石板。
    for(const x of [-3.5,3.5]){
      box(x,.23,-5.8,1.8,.46,1.8,M.honey,true,.05);
      shape([[4.95,.35],[6.65,.35],[6.65,1.38],[6.34,1.38],[6.08,.84],[5.62,1.05],[5.35,.51]],1.70,M.stone,x-.85,0,0,Math.PI/2);
    }
    for(const z of [3.4,7]){
      cols.push([-11.5,0,z-1.5,-9.9,1.4,z+1.5]);
      box(-10.7,.175,z,1.6,.35,3,M.honey,true,.08);box(-10.7,.36,z,1.59,.05,2.97,M.brass);
      shape([[-11.48,.35],[-9.92,.35],[-9.92,.43],[-10.22,.43],[-10.42,.87],[-10.80,.79],[-11.02,1.21],[-11.48,1.21]],2.98,M.tide,0,0,z-1.49);
      for(let j=0;j<12;j++){const zz=z-1.40+j*.25;ball(-9.96,.43,zz,.12,M.stone,.65,.45,1.2);}
      for(const zz of [z-1.42,z+1.42]){ball(-11.26,1.05,zz,.20,M.stone,1,1.4,.8);ball(-10.95,.78,zz,.14,M.stone);for(let j=0;j<3;j++)ball(-11.22+j*.10,1.24+j%2*.13,zz,.055,M.fern,.50,3,.5);}
      for(let j=0;j<12;j++)box(-9.905,.19,z-1.35+j*.245,.025,.21,.016,M.dark);
    }
    // 斜面承台以同一四元數貼住圖卡，不用水平盒穿過圖卡。
    for(const k of ['sea','fossil'])for(const s of layout[k])if(s[6]){
      const [,x,y,z,ry,sz,t]=s,q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-t,ry,0,'YXZ')),p=V([0,0,-.065]).applyQuaternion(q).add(V([x,y,z]));
      const o=box(...p.toArray(),sz+.12,sz+.16,.055,k==='sea'?M.tide:M.stone);o.quaternion.copy(q);
    }
    for(let j=0;j<5;j++){const x=-10.4+j*.70;box(x,.58,1.23,.08,1.16,.08,M.honey);box(x,1.30,1.218,.62,.68,.065,M.brass);box(x,1.30,1.253,.57,.63,.012,M.paper);box(x,1.30,1.264,.49,.55,.008,M.honey);box(x,1.30,1.275,.46,.52,.008,M.paper);}
    box(-9,2.45,1.15,3.65,.12,.30,M.stone);box(-9,2.30,1.12,3.7,.20,.08,M.stone);box(-9,2.29,1.13,3.70,.10,.09,M.honey);
    for(const x of [8.3,9.7]){
      mesh(new THREE.CylinderGeometry(.38,.42,.58,6),M.honey,x,.29,8.2,true);
      for(const y of [.06,.58])mesh(new THREE.CylinderGeometry(.43,.43,.055,6),M.brass,x,y,8.2);
      mesh(new THREE.CylinderGeometry(.34,.38,.12,6),M.lilac,x,.67,8.2);
      mesh(new THREE.CylinderGeometry(.31,.31,.035,6),M.paper,x,.77,8.2);
      cols.push([x-.38,0,7.82,x+.38,1.65,8.58]);
      for(let j=0;j<6;j++){
        const a=j*Math.PI/3,xx=x+.37*Math.sin(a),zz=8.2+.37*Math.cos(a);
        if(j!==3)beam([xx,.73,zz],[xx,1.43,zz],.018,M.brass);beam([xx,1.43,zz],[x,1.73,8.2],.018,M.brass);
        beam([xx,.73,zz],[x+.37*Math.sin(a+Math.PI/3),.73,8.2+.37*Math.cos(a+Math.PI/3)],.018,M.brass);
      }
      mesh(new THREE.ConeGeometry(.43,.34,6),shade,x,1.60,8.2);mesh(new THREE.CylinderGeometry(.26,.26,.018,12),warm,x,1.40,8.2);ball(x,1.81,8.2,.055,M.brass);
    }
    // 獨立低多邊形骨架，與館藏化石完全分開。
    const plinth=mesh(new THREE.CylinderGeometry(1,1,.35,64),M.stone,0,.175,-1.4);plinth.scale.set(2.4,1,1.1);cols.push([-2.4,0,-2.5,2.4,.55,-.3]);
    const lip=ring(0,.35,-1.4,1,.018,M.brass);lip.scale.set(2.35,1,1.04);
    const spine=[];for(let j=0;j<12;j++){const x=-1.75+j*.28,y=1.66+.28*Math.sin(j*Math.PI/13);spine.push([x,y,-1.45]);ball(x,y,-1.45,.115,M.bone,1,.9,1);beam([x,y,-1.45],[x-.06,y+.23,-1.45],.036,M.bone);}
    tube(spine,.065,M.bone);
    for(let j=0;j<10;j++)for(const side of [-1,1]){const x=-1.53+j*.27,y=1.72+.24*Math.sin(j*Math.PI/11),pts=[];for(let n=0;n<=6;n++){const a=n*Math.PI/8;pts.push([x+.08*Math.sin(a),y-.62*(1-Math.cos(a)), -1.45+side*.48*Math.sin(a)]);}tube(pts,.036,M.bone);}
    tube([[-1.8,1.65,-1.45],[-2.05,1.47,-1.45],[-2.25,1.22,-1.45]],.055,M.bone);
    tube([[1.32,1.80,-1.45],[1.57,2.02,-1.45],[1.73,2.28,-1.45],[1.93,2.45,-1.45]],.09,M.bone);
    box(2.0,2.48,-1.45,.51,.32,.32,M.bone,false,.05);box(2.12,2.32,-1.45,.40,.075,.29,M.bone);for(const z of [-1.62,-1.28])ball(1.87,2.53,z,.07,M.dark,1,1,.25);
    for(const x of [-1.12,.83])for(const side of [-1,1]){const z=-1.45+side*.35;beam([x,1.65,z],[x-.18,1.04,z+side*.15],.082,M.bone);ball(x-.18,1.04,z+side*.15,.095,M.bone);beam([x-.18,1.04,z+side*.15],[x+.04,.45,z+side*.19],.055,M.bone);beam([x-.04,.45,z+side*.19],[x+.27,.42,z+side*.19],.047,M.bone);}
    for(const x of [-1.0,.7])beam([x,.36,-1.45],[x,1.55,-1.45],.022,M.brass);
    for(let j=0;j<4;j++)ball(-1.6+j*1.0,.44,-2.10,.20,M.stone,1.4,.55,.8);
    box(0,.52,-.40,.65,.10,.28,M.honey);box(0,.58,-.40,.55,.025,.20,M.paper);
    // 服務台、島史桌與留言簿的小景。
    function desk(x,z,w,d) {box(x,.37,z,w-.10,.74,d-.10,M.honey,true,.045);box(x,.79,z,w,.08,d,M.honey,true,.06);box(x,.14,z,w,.06,d,M.brass);for(let j=0;j<6;j++)box(x-w/2+.20+j*(w-.40)/5,.43,z+d/2-.035,.028,.53,.025,M.dark);}
    function book(x,y,z,w=.40,d=.28) {box(x,y+.025,z,w,.05,d,M.ink);box(x,y+.055,z,w-.035,.035,d-.025,M.paper);box(x,y+.08,z,w,.018,d,M.dome);}
    function openBook(x,y,z,w=.55) {for(const side of [-1,1]){const o=box(x+side*w*.24,y+.025,z,w*.48,.045,.36,M.paper);o.rotation.z=-side*.10;for(let j=0;j<4;j++)box(x+side*w*.24,y+.055,z-.12+j*.07,w*.33,.004,.008,M.print);}beam([x,y+.02,z-.18],[x,y+.02,z+.18],.012,M.brass);}
    function plant(x,y,z,s=.5) {mesh(new THREE.CylinderGeometry(.18*s,.13*s,.30*s,8),M.floor,x,y+.15*s,z);for(let j=0;j<7;j++){const a=j*2.4;beam([x,y+.28*s,z],[x+Math.sin(a)*.25*s,y+(.7+j%3*.12)*s,z+Math.cos(a)*.25*s],.012*s,M.fern);ball(x+Math.sin(a)*.25*s,y+(.7+j%3*.12)*s,z+Math.cos(a)*.25*s,.20*s,j%2?M.leaf:M.fern,.7,1.6,.35);}}
    // 弧形木檯保留原服務位置，弧面細板與黃銅腳線收邊。
    const arcDesk=(y,h,r,depth,m)=>{
      const p=[];for(let j=0;j<=24;j++){const a=-.72+j*.06;p.push([3.9+Math.sin(a)*r,2.8+Math.cos(a)*r-r]);}
      for(let j=24;j>=0;j--){const a=-.72+j*.06;p.push([3.9+Math.sin(a)*(r-depth),2.8+Math.cos(a)*(r-depth)-r]);}
      const o=shape(p,h,m,0,y+h,0);o.rotation.x=Math.PI/2;return o;
    };
    arcDesk(.05,.70,1.85,.62,M.honey);arcDesk(.76,.08,1.91,.74,M.honey);arcDesk(.10,.045,1.87,.65,M.brass);arcDesk(.71,.035,1.87,.65,M.brass);
    cols.push([2.59,0,1.69,5.21,.84,2.91]);
    for(let j=0;j<17;j++){const a=-.67+j*.084;beam([3.9+Math.sin(a)*1.855,.18,2.8+Math.cos(a)*1.855-1.85],[3.9+Math.sin(a)*1.855,.67,2.8+Math.cos(a)*1.855-1.85],.012,M.dark);}
    openBook(3.50,.84,2.61);box(4.55,.88,2.57,.42,.08,.30,M.dark);for(let j=0;j<4;j++)box(4.55,.93+j*.014,2.57,.34,.012,.24,M.paper);box(4.9,.94,2.40,.28,.22,.23,M.honey,false,.02);ball(4.13,.92,2.97,.065,M.brass);plant(2.85,.84,2.34,.50);
    desk(-3.6,5.5,2.8,.8);openBook(-3.65,.84,5.40,.80);book(-4.60,.84,5.45);box(-2.60,.88,5.38,.16,.14,.16,M.brass);beam([-2.60,.94,5.38],[-2.73,1.27,5.39],.014,M.dark);shape([[0,0],[.15,.09],[.10,.22]],.01,M.paper,-2.75,1.13,5.4);
    box(-3.6,1.52,5.84,2.50,1.22,.075,M.honey);box(-3.6,1.52,5.79,2.34,1.06,.025,M.paper);
    for(let j=0;j<7;j++){box(-4.55+j*.32,1.52,5.77,.025,.60,.012,M.brass);box(-4.55+j*.32,1.28+(j%3)*.20,5.75,.23,.10,.01,j%2?M.dome:M.print);}
    desk(-5.5,7,.6,.8);openBook(-5.5,.84,7,.46);box(-5.59,.94,6.75,.09,.18,.09,M.brass);for(let j=0;j<3;j++)beam([-5.61+j*.025,1.0,6.75],[-5.64+j*.025,1.17,6.75],.008,M.honey);book(-5.50,.84,7.22,.38,.22);
    box(2.2,.40,7.6,.70,.80,.60,M.honey,true,.05);box(2.2,.84,7.6,.72,.08,.62,M.brass);box(2.2,.89,7.58,.33,.025,.055,M.dark);ball(2.2,.57,7.29,.11,M.brass,1,1,.12);box(2.64,.82,7.54,.17,.025,.24,M.paper);
    // 櫃帽觀察用具與裝飾，全部留在既有櫃體範圍。
    plant(8.05,2.10,-6.3,.48);book(9.67,2.10,-6.3,.35,.25);box(9.20,2.12,-6.3,.32,.03,.23,M.paper);ring(9.2,2.15,-6.30,.075,.012,M.brass);
    book(-9.7,2.10,-6.9,.36,.25);box(-8.25,2.11,-6.9,.30,.03,.24,M.paper);
    book(9.70,1.95,2.4,.34,.24);box(8.25,1.98,2.4,.30,.08,.22,M.paper);ring(9.2,1.97,2.4,.07,.012,M.brass);ball(8.77,2.04,2.4,.11,M.stone);
    for(const z of [1.98,4.82,5.58,8.42]){ball(-11.30,.70,z,.12,M.stone,1,.6,1);plant(-11.30,.72,z,.24);}


    // 窗下薄長凳只占外牆口袋，薰衣草坐墊朝向展櫃。
    function sillPlant(x,y,z){
      mesh(new THREE.CylinderGeometry(.14,.10,.23,6),M.floor,x,y+.115,z);mesh(new THREE.CylinderGeometry(.145,.145,.04,6),M.brass,x,y+.24,z);
      for(let j=0;j<5;j++){const a=j*2.4,xx=x+Math.sin(a)*.15,zz=z+Math.cos(a)*.15;timber([x,y+.23,z],[xx,y+.57+j%2*.12,zz],.014,.014,M.fern);const o=mesh(new THREE.PlaneGeometry(.15,.30),j%2?M.leaf:M.fern,xx,y+.52+j%2*.12,zz);o.rotation.set(.25,a,.25);}
    }
    for(const [side,z,w]of [[-1,-5.54,1.8],[1,-5.54,1.8],[-1,1.12,1.25],[1,7.51,1.8]]){
      const a=side*Math.PI/2,x=side*11.60;
      localBox(x,z,0,.37,0,w,.14,.40,M.honey,a,true);
      for(const u of [-w/2+.14,w/2-.14])localBox(x,z,u,.16,0,.12,.32,.32,M.honey,a,true);
      localBox(x,z,0,.48,0,w-.08,.10,.37,M.lilac,a);
      for(const u of [-w/6,w/6])localBox(x,z,u,.535,0,.012,.012,.34,M.dome,a);
      const p=at(side*12,z,-.83,-.24,side*Math.PI/2);sillPlant(p[0],1.05,p[1]);
    }

    // 中央側袋的島嶼地貌桌，主通行視廊完整保留。
    for(const side of [-1,1]){
      const x=side*3.65,d=side<0?3.25:2.50,cz=side<0?1.225:.85;desk(x,cz,4.10,d);
      box(x,.85,cz,3.90,.035,d-.20,M.tide,false,.05);
      for(let j=0;j<5;j++){const xx=x+Math.sin(j*2.3)*.62,zz=.85+Math.cos(j*2.3)*.57;ball(xx,.98+j%2*.12,zz,.30,j%2?M.stone:M.leaf,1.6,.35,1.0);}
      for(let j=0;j<5;j++){box(x-1.0+j*.5,.89,1.95,.35,.025,.14,M.paper);}
      book(x-.87,.87,.05,.36,.28);openBook(x+.78,.88,.10,.5);plant(x+1.02,.84,1.60,.5);
    }
    desk(0,-6.20,1.45,1.35);box(0,.86,-6.2,1.28,.035,1.18,M.bone);for(let j=0;j<4;j++)ball(-.40+j*.27,.96,-6.2,.13,M.stone,1,1+j*.2,1);book(0,.88,-5.80,.48,.27);
    // 休息凳與研究工具落在牆邊口袋，不占檢索台站位。
    function bench(x,z,w,d,a=0) {
      localBox(x,z,0,.38,0,w,.16,d,M.honey,a,true,.05);localBox(x,z,0,.49,0,w-.10,.09,d-.08,M.lilac,a,false,.05);
      for(const u of [-w/2+.16,w/2-.16])for(const v of [-d/2+.1,d/2-.1])localBox(x,z,u,.18,v,.10,.36,.10,M.honey,a,true);
      localBox(x,z,0,.75,-d/2+.03,w,.44,.08,M.honey,a,true,.035);
    }
    for(const x of [-6.55,6.55])for(const z of [.9,7.5])bench(x,z,1.30,.62,Math.PI/2);
    for(const [x,z] of [[-7.4,3.25],[-7.4,7.35],[7.0,-7.75],[10.95,-.2]]){
      box(x,.40,z,.78,.80,.78,M.honey,true,.05);box(x,.82,z,.82,.06,.82,M.stone,false,.06);openBook(x,.86,z,.50);plant(x+.19,.87,z-.18,.44);
    }

    // 文書桌端的卷軸櫥，與右側短凳界定三點二公尺主廊。
    desk(-1.9,5.5,.60,.80);book(-1.9,.84,5.5,.44,.28);bench(2.1,4.30,.80,.70);
    // 分區交會的觀察桌與前廳休息角。
    mesh(new THREE.CylinderGeometry(.60,.64,.12,16),M.honey,9,.75,0,true);mesh(new THREE.CylinderGeometry(.18,.32,.69,10),M.honey,9,.345,0,true);openBook(9,.83,0,.6);plant(9.3,.82,-.24,.55);
    bench(10.65,-4.35,.90,.60,Math.PI/2);book(10.65,.56,-4.35,.38,.25);
    for(const x of [-2.15,2.15])bench(x,8.4,1.10,.55);
    for(const [x,z] of [[5.25,6.35],[5.25,3.55],[-7.0,8.4]])plant(x,0,z,1.15);
    // 後角的小型研究櫥，收納圖冊、標本紙包與館史照片。
    for(const [x,z] of [[-11.20,-8.25],[11.20,-8.25]]){
      desk(x,z,1.0,.90);plant(x,.84,z,.85);book(x-.30,.84,z+.24,.3,.25);
      box(x,1.42,z-.40,1.0,1.08,.07,M.honey);for(let j=0;j<3;j++)box(x-.29+j*.29,1.42,z-.35,.22,.78,.02,M.paper);
    }

    // 薰衣草盆景、黃銅絨繩與收藏小展台補足觀看區邊緣。
    function lavender(x,z){plant(x,0,z,1.15);for(let j=0;j<6;j++){const a=j*2.4;ball(x+Math.sin(a)*.22,.83+j%3*.12,z+Math.cos(a)*.22,.095,M.dome,.8,1.4,.8);}cols.push([x-.22,0,z-.22,x+.22,1.1,z+.22]);}
    function plaque(x,z,a=0){mesh(new THREE.CylinderGeometry(.14,.18,.08,8),M.brass,x,.04,z);beam([x,.05,z],[x,.86,z],.025,M.brass);localBox(x,z,0,1.02,0,.52,.28,.04,M.honey,a);localBox(x,z,0,1.02,.025,.46,.22,.008,M.paper,a);}
    for(const [x,z]of [[-4.7,-3.2],[4.7,-3.2],[-4.9,3.1],[4.9,6.8],[-11.2,5.2],[10.95,8.1]])lavender(x,z);
    for(const [x,z]of [[-2.8,-3.15],[2.8,-3.15]])plaque(x,z);
    for(const side of [-1,1]){
      const x=side*2.7;for(const z of [-2.4,-.5]){mesh(new THREE.CylinderGeometry(.11,.15,.06,10),M.brass,x,.03,z);beam([x,.06,z],[x,.78,z],.024,M.brass);ball(x,.81,z,.055,M.brass);}
      tube([[x,.76,-2.4],[x,.64,-1.93],[x,.60,-1.45],[x,.64,-.98],[x,.76,-.5]],.023,M.ink);
    }
    for(const [x,z]of [[-3.7,-3.4],[3.7,-3.4],[3.8,6.95]]){
      mesh(new THREE.CylinderGeometry(.45,.49,.68,12),M.honey,x,.34,z,true);mesh(new THREE.CylinderGeometry(.50,.50,.07,12),M.stone,x,.715,z);
      if(z>0){ring(x,1.08,z,.26,.022,M.brass).rotation.z=.30;ball(x,1.08,z,.21,M.tide);beam([x,.75,z],[x,.90,z],.025,M.brass);}
      else if(x<0){const pts=[];for(let j=0;j<32;j++){const a=j*.30,r=.018+j*.006;pts.push([x+r*Math.cos(a),.97+r*Math.sin(a),z]);}tube(pts,.025,M.bone);}
      else{for(let j=0;j<5;j++)beam([x-.18+j*.09,.78,z+.08],[x,1.12,z-.07],.040,M.bone);}
    }
    bench(5.6,-7.7,1.6,.55,Math.PI/2);bench(-5.6,-7.7,1.6,.55,Math.PI/2);
    bench(7.1,8.55,1.35,.62);
    for(const x of [-4.8,4.8]){desk(x,-4.3,1.15,1.0);book(x,.84,-4.3,.45,.30);plant(x+.22,.84,-4.5,.45);}
    desk(7.55,-4.35,.65,.65);openBook(7.55,.84,-4.35,.44);ring(7.65,1.02,-4.35,.10,.014,M.brass);
    plaque(-1.98,3.0,-.3);
    bench(-7.1,6.6,1.6,.65,Math.PI/2);
    desk(-7.7,8.60,2.4,.60);openBook(-7.15,.84,8.60,.60);plant(-6.70,.84,8.60,.65);
    for(const x of [-3.85,3.85]){
      desk(x,8.55,1.65,.48);book(x-.45,.84,8.55,.34,.23);plant(x+.45,.84,8.55,.8);
      box(x,1.65,8.83,1.45,1.05,.07,M.honey);box(x,1.65,8.78,1.32,.92,.018,M.paper);
      for(let j=0;j<3;j++)box(x-.4+j*.4,1.65,8.76,.30,.62,.012,j%2?M.lilac:M.tide);
    }
    // 壁面布旗以月徽接續入口的黃銅語彙。
    for(const x of [-5.83,5.83])for(const z of [.4,7.5]){
      const a=x<0?Math.PI/2:-Math.PI/2;localBox(x,z,0,2.65,0,.48,.95,.025,M.dome,a);localBox(x,z,0,3.18,.025,.65,.035,.04,M.brass,a);
      outline(x,z,[[0,2.88],[.12,2.76],[0,2.64],[-.12,2.76],[0,2.88]],a,M.brass,.014,.025);
    }
    // 五面空白展區框，文字由館藏引擎更新。
    const wingSigns={fish:[-5.84,3.55,-3,Math.PI/2,2.2],bug:[5.84,3.55,-3,-Math.PI/2,2.2],fossil:[0,3.55,-4.90,0,2.2],sea:[-5.84,3.55,5,Math.PI/2,2.2],mineral:[5.84,3.55,5,-Math.PI/2,2.2]};
    Object.values(wingSigns).forEach(([x,y,z,a,w])=>{localBox(x,z,0,y,-.055,w+.14,w/4+.12,.075,M.honey,a,false,.04);for(const u of [-1,1])localBox(x,z,u*(w/2+.02),y,-.005,.025,w/4+.08,.035,M.brass,a);for(const v of [-1,1])localBox(x,z,0,y+v*(w/8+.02),-.005,w+.06,.025,.035,M.brass,a);});
    function lantern(x,y,z,ceiling) {
      beam([x,y+.35,z],[x,ceiling,z],.017,M.brass);mesh(new THREE.CylinderGeometry(.16,.23,.12,6),M.brass,x,y+.27,z);mesh(new THREE.CylinderGeometry(.18,.18,.42,6),shade,x,y+.02,z);mesh(new THREE.CylinderGeometry(.20,.16,.08,6),M.brass,x,y-.23,z);mesh(new THREE.CylinderGeometry(.145,.145,.018,12),lamp,x,y,z);
      for(let j=0;j<6;j++){const a=j*Math.PI/3;beam([x+.18*Math.cos(a),y-.19,z+.18*Math.sin(a)],[x+.18*Math.cos(a),y+.23,z+.18*Math.sin(a)],.012,M.brass);}
    }
    for(const [x,y,z] of [[-9,3.45,-4],[9,3.45,-4],[-8.7,3.3,5],[9,3.3,5]])lantern(x,y,z,4.66);
    beam([0,4.9,-1],[0,9.80,-1],.015,M.brass);mesh(new THREE.CylinderGeometry(.58,.26,.18,32),shade,0,4.68,-1);mesh(new THREE.CylinderGeometry(.29,.29,.018,24),warm,0,4.6,-1);ring(0,4.77,-1,.58,.025,M.brass);
    mesh(new THREE.CylinderGeometry(.11,.14,.045,16),M.brass,3.9,.87,2.8);tube([[3.9,.89,2.8],[3.9,1.28,2.8],[3.9,1.43,2.75],[3.9,1.43,2.65]],.018,M.brass);mesh(new THREE.CylinderGeometry(.07,.16,.13,16,1,true),shade,3.9,1.42,2.8);mesh(new THREE.CylinderGeometry(.11,.11,.018,16),warm,3.9,1.35,2.8);
    // 重點燈上方的細黃銅安裝桿。
    beam([-2.4,4.58,.5],[-2.4,4.40,.5],.018,M.brass);box(-2.4,4.65,.5,.30,.08,.30,M.stone);
    beam([2.4,4.58,-.5],[2.4,4.40,-.5],.018,M.brass);box(2.4,4.65,-.5,.30,.08,.30,M.stone);
    Object.assign(g.userData,{bounce:2.5,spawn:[0,0,7.2,3.141592653589793],exit:[0,8.65,0.65],host:[3.9,0,4.9,0],spots:[{"x":-9,"y":0,"z":-2.55,"r":0.9,"kind":"hook:wing","topic":"fish","label":"魚類展區","name":"水色館藏檢索台","lines":["慢慢看，每一格都留給一段水中故事。","捐來的魚，我會仔細記下牠的名字。","水草和氣泡，也在等新朋友入住。"],"alone":["水色背板映著空白的名牌。","按下檢索台，可以查看完整魚類館藏。"]},{"x":9,"y":0,"z":-4.35,"r":0.9,"kind":"hook:wing","topic":"bug","label":"昆蟲展區","name":"昆蟲標本檢索台","lines":["翅膀上的細紋，像一封很小的信。","標本不用多，先把每一件照顧好。","空著的格子，是留給下一次發現的。"],"alone":["玻璃框後留著整齊的空名牌。","這裡能查到昆蟲的完整館藏。"]},{"x":0,"y":0,"z":-4.0,"r":0.85,"kind":"hook:wing","topic":"fossil","label":"化石展區","name":"化石年代表前檢索台","lines":["石頭不急，我們也可以慢慢讀。","這副骨架是模型，真化石各有位置。","一小片葉痕，也可能保存很長的時間。"],"alone":["骨架旁的階梯展台留著空位。","檢索台收錄了所有化石的紀錄。"]},{"x":-8.5,"y":0,"z":5,"r":0.85,"kind":"hook:wing","topic":"sea","label":"潮池展區","name":"潮池觀察檢索台","lines":["潮水退去時，記得把腳步放輕。","保育類只留下照片，讓牠留在海裡。","一張清楚的照片，也是珍貴的捐贈。"],"alone":["淺色展台像一小片退潮的海岸。","照片旁的空框，正等著新的觀察。"]},{"x":9,"y":0,"z":3.95,"r":0.85,"kind":"hook:wing","topic":"mineral","label":"礦物展區","name":"晶洞館藏檢索台","lines":["光換個角度，晶面就會換個表情。","我替每顆礦物留了一張小名牌。","漂亮之外，硬度也藏著辨認線索。"],"alone":["玻璃盒裡的名牌排列得很整齊。","晶洞造型的櫃子也有獨立展示位。"]},{"x":-3.6,"y":0,"z":3.9,"r":0.85,"kind":"study","label":"複習歷史","name":"島史年表與古文書桌","lines":["先看這張年表，再一起想三題吧。","年代是路標，人的選擇才是故事。","別急著背答案，先找事件的前後。","這頁古文書，還留著前人的筆跡。"],"alone":["年表把零散的年代連成了一條路。","桌上留著三題歷史複習的提示。"],"subject":"history"},{"x":1.7,"y":0,"z":6.25,"r":0.65,"kind":"look","label":"看看捐贈箱","name":"黃銅月徽捐贈收件箱","lines":["第一份捐贈，只有一顆小小的石頭。","我把每位捐贈者的名字都好好收著。","小發現湊在一起，就成了這座館。"],"alone":["箱蓋上的新月，已被摸得亮亮的。","旁邊放著整齊的收件空白卡。"]},{"x":-4.2,"y":0,"z":7.0,"r":0.65,"kind":"look","label":"翻翻留言簿","name":"蜂蜜木留言簿架","lines":["有人寫：今天第一次認出海膽了。","留言簿裡，最常出現的是謝謝。","我喜歡看大家記下自己的第一次。"],"alone":["有一頁畫著歪歪的貓頭鷹館長。","翻到最後，還有一大片空白等著你。"]}],lights:[[0,4.6,-1,"#ffcf9c",0.9,0.65],[-9,3.45,-4,"#ffc690",0.6,0.45],[9,3.45,-4,"#ffc690",0.55,0.45],[-8.7,3.3,5,"#ffc690",0.55,0.4],[9,3.3,5,"#ffc690",0.55,0.4],[3.9,1.35,2.8,"#ffcf9c",0.45,0.3]],glow:[{"kind":"cove","a":[-11.55,4.02,-8.1],"b":[-11.55,4.02,-0.15],"n":[1,0],"c":"#ffe6bd"},{"kind":"cove","a":[-11.55,4.02,2],"b":[-11.55,4.02,8.15],"n":[1,0],"c":"#ffe6bd"},{"kind":"cove","a":[11.55,4.02,-8.1],"b":[11.55,4.02,-0.15],"n":[-1,0],"c":"#ffe6bd"},{"kind":"cove","a":[11.55,4.02,2],"b":[11.55,4.02,8.15],"n":[-1,0],"c":"#ffe6bd"},{"kind":"cove","a":[-5.0,4.75,-3.0],"b":[-5.0,4.75,1.0],"n":[1,0],"c":"#f0e5d5"},{"kind":"cove","a":[5.0,4.75,-3.0],"b":[5.0,4.75,1.0],"n":[-1,0],"c":"#f0e5d5"},{"kind":"cove","a":[-2,4.75,-6.0],"b":[2,4.75,-6.0],"n":[0,1],"c":"#fff3db"},{"kind":"cove","a":[-2,4.75,4.0],"b":[2,4.75,4.0],"n":[0,-1],"c":"#fff3db"},{"kind":"spot","p":[-2.4,4.3,0.5],"t":[-0.7,1.9,-1.45],"r":1.3},{"kind":"spot","p":[2.4,4.3,-0.5],"t":[0.9,1.7,-1.5],"r":1.2}],sun:[12,9,1.12],cols,exhibits,wingSigns});
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
