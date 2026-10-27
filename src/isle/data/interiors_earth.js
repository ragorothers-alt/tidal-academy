/* 潮汐小島 · earth 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['earth'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['earth'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '岳的圓木暖湯與屋頂觀星木屋';
    const M = {
      log: kit.mat('#8a6040', {}, 'wood'), honey: kit.mat('#bc8a55', {}, 'wood'), dark: kit.mat('#4d382e', {}, 'wood'),
      floor: kit.mat('#aa9981', { vertexColors: true }, 'wood'), seam: kit.mat('#c5b59b', {}, 'wood'),
      stone: kit.mat('#b9b0a2', {}, 'stone'), lightStone: kit.mat('#d7ccba', {}, 'stone'),
      cream: kit.mat('#f4e7ce', {}, 'fabric'), roof: kit.mat('#4a6b4f', {}, 'wood'),
      green: kit.mat('#688665', {}, 'fabric'), navy: kit.mat('#354c70', {}, 'fabric'), blue: kit.mat('#8aaebe', {}, 'fabric'),
      pink: kit.mat('#e9a7bd', {}, 'foliage'), lavender: kit.mat('#ae96ca', {}, 'foliage'),
      brass: kit.mat('#d7ad57', { metalness: .82, roughness: .38 }, 'metal'),
      charcoal: kit.mat('#302c32', { metalness: .7, roughness: .4 }, 'metal'),
      soup: kit.mat('#e7b15b', {}, 'ceramic'), carrot: kit.mat('#dd9255', {}, 'foliage'),
      // Reuse semantic swatches across every floor, including the roof deck.
      paper: kit.mat('#f4e7ce', {}, 'paper'), chart: kit.mat('#354c70', {}, 'paper'), ink: kit.mat('#d7ad57', {}, 'paper'),
      ceramic: kit.mat('#f4e7ce', {}, 'ceramic'), greenCup: kit.mat('#688665', {}, 'ceramic'),
      tea: kit.mat('#302c32', {}, 'ceramic'),
      leaf: kit.mat('#688665', {}, 'foliage'), flowerCenter: kit.mat('#f4e7ce', {}, 'foliage'),
      mineralLavender: kit.mat('#ae96ca', {}, 'stone'), mineralBlue: kit.mat('#8aaebe', {}, 'stone'),
      mineralCream: kit.mat('#f4e7ce', {}, 'stone'), soot: kit.mat('#302c32', { roughness: 1 }, 'stone'),
      greenWood: kit.mat('#688665', {}, 'wood'), navyWood: kit.mat('#354c70', {}, 'wood'),
      roofCloth: kit.mat('#4a6b4f', {}, 'fabric'), darkCloth: kit.mat('#4d382e', {}, 'fabric'),
      honeyCloth: kit.mat('#bc8a55', {}, 'fabric'), goldCloth: kit.mat('#d7ad57', {}, 'fabric'),
      iron: kit.mat('#4d382e', { metalness: .7, roughness: .4 }, 'metal'),
      navyMetal: kit.mat('#354c70', { metalness: .7, roughness: .4 }, 'metal'),
      blueMetal: kit.mat('#8aaebe', { metalness: .7, roughness: .4 }, 'metal'),
      hood: kit.mat('#b8763d', { metalness:.65, roughness:.48, side:THREE.DoubleSide }, 'metal'),
      lanternShade: kit.shade('#ffd8ad'), diff: kit.lamp('#ffd8ad'), glow: kit.lamp('#ffcb82'), glass: kit.glass()
    };
    const shapes=new Map();
    function shape(key,make) {if(!shapes.has(key))shapes.set(key,make());return shapes.get(key);}
    const B = (w,h,d) => shape('b'+[w,h,d],()=>new THREE.BoxGeometry(w,h,d));
    function mesh(q,m,x,y,z,ud) {const o=new THREE.Mesh(q,m);o.position.set(x,y,z);if(ud)Object.assign(o.userData,ud);g.add(o);return o;}
    function box(x,y,z,w,h,d,m,solid) {return mesh(B(w,h,d),m,x,y,z,solid?{solid:true}:null);}
    function rod(a,b,r,m,n=8) {const A=new THREE.Vector3(...a),C=new THREE.Vector3(...b),v=C.clone().sub(A);const o=mesh(shape('rod'+n,()=>new THREE.CylinderGeometry(1,1,1,n)),m,...A.add(C).multiplyScalar(.5).toArray());o.scale.set(r,v.length(),r);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
    function rock(x,y,z,r,m,sx=1,sy=1,sz=1) {const q=shape('rock'+[r,sx,sy,sz],()=>new THREE.IcosahedronGeometry(r,0).scale(sx,sy,sz));return mesh(q,m,x,y,z);}
    function arch(w,h) {const p=[[-w/2,0],[w/2,0],[w/2,h-w/2]];for(let j=1;j<=20;j++){const a=j*Math.PI/20;p.push([Math.cos(a)*w/2,h-w/2+Math.sin(a)*w/2]);}return p;}
    function extrude(p,holes=[],depth=.34) {const s=new THREE.Shape(p.map(v=>new THREE.Vector2(...v)));holes.forEach(h=>s.holes.push(new THREE.Path(h.slice().reverse().map(v=>new THREE.Vector2(...v)))));return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:8});}
    function at(x,z,u,d,ry) {return [x+u*Math.cos(ry)+d*Math.sin(ry),z-u*Math.sin(ry)+d*Math.cos(ry)];}
    function localBox(x,z,u,y,d,w,h,dep,m,ry,solid) {const [xx,zz]=at(x,z,u,d,ry);const o=box(xx,y,zz,w,h,dep,m,solid);o.rotation.y=ry;return o;}
    // Log courses stop at actual arch apertures. Shared backing has the same holes through its full thickness.
    function logWall(x,z,w,y0,h,ry,openings=[]) {
      const holes=openings.map(a=>arch(a.w,a.h).map(p=>[p[0]+a.u,p[1]+a.y]));
      const shell=mesh(extrude([[-w/2,y0],[w/2,y0],[w/2,y0+h],[-w/2,y0+h]],holes,.36),M.log,x,0,z,{solid:true});shell.rotation.y=ry;
      let row=0;
      for(let yy=y0+.21;yy<y0+h;yy+=.42,row++) {
        const blocked=openings.filter(a=>yy+.22>a.y && yy-.22<a.y+a.h).map(a=>{
          const t=Math.max(0,yy-.22-a.y-(a.h-a.w/2));
          const half=t>0?Math.sqrt(Math.max(0,a.w*a.w/4-t*t)):a.w/2;
          return [a.u-half-.02,a.u+half+.02];
        }).sort((a,b)=>a[0]-b[0]);
        let u=-w/2;
        for(const a of blocked.concat([[w/2,w/2]])) {
          if(a[0]>u+.03) {const [ax,az]=at(x,z,u,-.09,ry),[bx,bz]=at(x,z,a[0],-.09,ry);rod([ax,yy,az],[bx,yy,bz],.23,row%4?M.honey:M.log,10);}
          u=Math.max(u,a[1]);
        }
      }
      openings.forEach(a=>{
        if(a.passage)return;
        const outer=arch(a.w+.28,a.h+.14).map(p=>[p[0],p[1]-.14]);
        const [fx,fz]=at(x,z,a.u,-.19,ry);
        const rim=mesh(extrude(outer,[arch(a.w,a.h)],.16),M.honey,fx,a.y,fz);rim.rotation.y=ry;
        if(a.door) {
          const transom=arch(.68,.84).map(p=>[p[0],p[1]+1.85]);
          const door=mesh(extrude(arch(a.w-.08,a.h-.06),[transom],.14),M.honey,...[...at(x,z,a.u,.1,ry).slice(0,1),a.y,at(x,z,a.u,.1,ry)[1]]);door.rotation.y=ry;
          for(let j=0;j<7;j++)localBox(x,z,a.u-.6+j*.2,.98,-.13,.018,1.6,.03,M.dark,ry);
          const [wx,wz]=at(x,z,a.u,.88,ry);const transomView=mesh(new THREE.PlaneGeometry(1.2,1.4),kit.view(),wx,a.y+2.27,wz,{camThrough:true});transomView.rotation.y=ry+Math.PI;
          const [px,pz]=at(x,z,a.u,-.08,ry);const glass=mesh(new THREE.ShapeGeometry(new THREE.Shape(transom.map(v=>new THREE.Vector2(...v)))),M.glass,px,a.y,pz,{camThrough:true});glass.rotation.y=ry+Math.PI;
          localBox(x,z,a.u,a.y+2.25,-.14,.05,.74,.05,M.honey,ry);
          localBox(x,z,a.u,1.45,-.15,.55,.6,.04,M.navy,ry);
          const ring=mesh(new THREE.TorusGeometry(.12,.02,6,16),M.brass,...[...at(x,z,a.u+.45,-.2,ry).slice(0,1),1.4,at(x,z,a.u+.45,-.2,ry)[1]]);ring.rotation.y=ry;
          return;
        }
        const [vx,vz]=at(x,z,a.u,.86,ry);
        const view=mesh(new THREE.PlaneGeometry(a.w+.8,a.h+.7),kit.view(),vx,a.y+a.h/2,vz,{camThrough:true});view.rotation.y=ry+Math.PI;
        const [gx,gz]=at(x,z,a.u,.12,ry);
        const pane=mesh(new THREE.ShapeGeometry(new THREE.Shape(arch(a.w,a.h).map(v=>new THREE.Vector2(...v)))),M.glass,gx,a.y,gz,{camThrough:true});pane.rotation.y=ry+Math.PI;
        localBox(x,z,a.u,a.y+a.h*.49,-.22,.07,a.h,.10,M.dark,ry);
        localBox(x,z,a.u,a.y+a.h*.48,-.22,a.w,.07,.10,M.dark,ry);
        localBox(x,z,a.u,a.y-.12,-.18,a.w+.45,.16,.62,M.honey,ry,true);
        for(const side of [-1,1]) {
          localBox(x,z,a.u+side*(a.w/2+.37),a.y+a.h*.43,-.18,.46,a.h*.84,.10,M.roof,ry);
          for(let j=0;j<5;j++)localBox(x,z,a.u+side*(a.w/2+.37),a.y+.25+j*a.h*.14,-.25,.4,.05,.05,M.honey,ry);
        }
      });
    }
    function floor(x,z,w,d,y) {
      // The boards are floor, not furniture. Merge them with the slab into one walk mesh.
      const pos=[],norm=[],colors=[];
      function part(geo,dx,dy,dz,shade) {
        const q=geo.toNonIndexed(),p=q.attributes.position,n=q.attributes.normal;
        for(let i=0;i<p.count;i++) {
          pos.push(p.getX(i)+dx,p.getY(i)+dy,p.getZ(i)+dz);
          norm.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(shade,shade,shade);
        }
        q.dispose();
      }
      part(B(w,.24,d),0,-.12,0,1);
      let row=0;
      for(let u=-w/2;u<w/2-.01;u+=.5,row++) {
        const width=Math.min(.485,w/2-u);
        part(B(width,.012,d-.016),u+width/2,.001,0,.90+(row*5%8)*.013);
      }
      const q=new THREE.BufferGeometry();
      q.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      q.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
      q.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      mesh(q,M.floor,x,y,z,{walk:true});
    }
    function shade(x,y,z,r=.34) {
      mesh(new THREE.CylinderGeometry(r*.3,r,.24,16,1,true),M.hood,x,y+.072,z);
      mesh(new THREE.CylinderGeometry(Math.min(r*.74,.16),Math.min(r*.74,.16),.016,16),M.diff,x,y+.03,z);rock(x,y+.22,z,.065,M.brass);
    }
    function lamp(x,y,z,top) {
      shade(x,y,z);rod([x,y+.26,z],[x,top,z],.018,M.charcoal,6);box(x,top-.018,z,.14,.035,.14,M.brass);
    }
    function lantern(x,y,z,top) {
      mesh(new THREE.CylinderGeometry(.14,.14,.36,12),M.lanternShade,x,y,z);
      mesh(new THREE.CylinderGeometry(.055,.055,.10,12),M.diff,x,y,z);
      for(const yy of [y-.22,y+.22])mesh(new THREE.CylinderGeometry(.23,.23,.06,12),M.hood,x,yy,z);
      for(let j=0;j<4;j++){const a=j*Math.PI/2;rod([x+.19*Math.cos(a),y-.22,z+.19*Math.sin(a)],[x+.19*Math.cos(a),y+.22,z+.19*Math.sin(a)],.018,M.iron,6);}
      mesh(new THREE.ConeGeometry(.27,.16,12),M.hood,x,y+.33,z);rod([x,y+.41,z],[x,top,z],.018,M.charcoal,6);
    }
    function sconce(x,y,z) {
      box(x+.25,y+.072,z,.045,.32,.24,M.hood);rod([x+.23,y+.122,z],[x,y+.122,z],.024,M.brass);shade(x,y,z,.22);
    }
    function table(x,y,z,w,d,h=1.05) {
      mesh(kit.rbox(w,.18,d,.055),M.honey,x,y+h,z,{solid:true});
      for(const xx of [-w/2+.18,w/2-.18])for(const zz of [-d/2+.16,d/2-.16])box(x+xx,y+h/2,z+zz,.18,h,.18,M.dark,true);
      for(const zz of [-d/2+.14,d/2-.14]) {box(x,y+h-.20,z+zz,w-.20,.22,.12,M.log);box(x,y+.23,z+zz,w-.2,.10,.12,M.honey);}
      for(const xx of [-w/2+.19,w/2-.19])for(const zz of [-d/2+.06,d/2-.06])rock(x+xx,y+h+.10,z+zz,.045,M.brass);
    }
    function book(x,y,z,w,m) {box(x,y+.09,z,w,.18,.68,m);box(x,y+.095,z+.35,w-.08,.1,.025,M.paper);}
    function chart(x,y,z,w,h,ry=0,cloud=false) {
      const q=new THREE.Group();q.position.set(x,y,z);q.rotation.y=ry;g.add(q);
      function move(o){g.remove(o);q.add(o);return o;}
      move(box(0,0,0,w+.18,h+.18,.12,M.honey));move(box(0,0,.075,w,h,.04,M.chart));
      if(cloud) {
        for(let j=0;j<3;j++) {for(let k=0;k<3;k++)move(rock(-w*.3+k*.13,.25-j*.35,.12,.14,M.paper,1.2,.7,.15));move(box(w*.1,.2-j*.35,.13,w*.35,.025,.02,M.ink));}
      } else {
        for(const r of [Math.min(w,h)*.28,Math.min(w,h)*.42])move(mesh(new THREE.TorusGeometry(r,.012,4,32),M.ink,0,0,.13));
        const stars=[[-.35,-.25],[-.2,.26],[.04,.05],[.33,.3],[.25,-.32]];
        stars.forEach((p,j)=>{const xx=p[0]*w,yy=p[1]*h;move(rock(xx,yy,.14,.045,M.paper,1,1,.3));if(j)move(rod([stars[j-1][0]*w,stars[j-1][1]*h,.14],[xx,yy,.14],.012,M.ink,4));});
      }
      return q;
    }
    function chair(x,y,z,m,ry=0) {
      const q=new THREE.Group();q.position.set(x,y,z);q.rotation.y=ry;q.userData.solid=true;g.add(q);
      const old=[];function grab(o){g.remove(o);q.add(o);old.push(o);}
      grab(box(0,.40,0,1.35,.65,1.25,M.dark));grab(box(0,.84,0,1.28,.32,1.15,m));grab(box(0,1.36,.52,1.40,1.10,.26,m));
      for(const dx of [-.75,.75])grab(box(dx,.98,0,.20,.35,1.45,M.honey));
      for(let j=0;j<5;j++)grab(box(-.52+j*.25,1.40,.68,.08,1,.05,j%2?M.cream:M.green));
      return q;
    }
    // Cabin proportions and door/window sides follow homes3d_earth; no biology plaster or tree plan is reused.
    floor(0,0,16,14,0);
    logWall(0,7,16,0,4,0,[{u:2.1,y:.02,w:1.8,h:3.15,door:true},{u:-5.1,y:1.05,w:2.2,h:2.6}]);
    logWall(-6.85,7,2.3,4,3.5,0);logWall(2.85,7,10.3,4,3.5,0);
    logWall(0,-7,16,0,7.5,Math.PI,[{u:1.8,y:1.1,w:2.2,h:2.5}]);
    logWall(-8,0,14,0,7.5,-Math.PI/2,[{u:.8,y:1.15,w:2,h:2.4}]);
    logWall(8,0,14,0,4,Math.PI/2,[{u:-1.2,y:1.15,w:2.1,h:2.4}]);
    logWall(8,-6.6,.8,4,3.5,Math.PI/2);logWall(8,4.3,5.4,4,3.5,Math.PI/2);
    // Ground-to-attic U stair: two shallow runs and a generous turning landing.
    floor(-3.1,0,9.8,14,4);floor(7.15,0,1.7,14,4);
    floor(4.1,-5.6,4.6,2.8,4);floor(4.1,4.05,4.6,5.9,4);
    floor(4.25,-3.35,4.5,1.9,2);
    function flight(x,y,z0,z1,rise,width,steps) {
      const dz=z1-z0,run=Math.abs(dz),angle=Math.atan2(rise,run);
      const ramp=mesh(new THREE.PlaneGeometry(width,Math.hypot(run,rise)),M.honey,x,y+rise/2,(z0+z1)/2,{walk:true});
      ramp.rotation.x=-Math.PI/2+(dz<0?angle:-angle);ramp.visible=false;
      for(let j=0;j<steps;j++)box(x,y+(j+.5)*rise/steps-.06,z0+dz*(j+.5)/steps,width,.12,run/steps+.025,M.honey);
      for(const xx of [x-width/2-.09,x+width/2+.09]) {
        rod([xx,y-.14,z0],[xx,y+rise-.14,z1],.095,M.dark);
        const rail=rod([xx,y+1,z0],[xx,y+rise+1,z1],.06,M.honey);rail.userData.solid=true;
        for(let j=0;j<=4;j++)box(xx,y+j*rise/4+.5,z0+dz*j/4,.10,1,.10,M.dark,true);
      }
      return {from:[x,y,z0],to:[x,y+rise,z1],width,steps,slope:angle*180/Math.PI};
    }
    const stairs=[flight(5.45,0,1.1,-2.4,2,1.8,9),flight(3.05,2,-2.4,1.1,2,1.8,9)];
    // Railings stay outside the walking ramps; each landing remains reachable from its open end.
    for(const x of [1.85,6.125]) {box(x,4.58,-1.45,.10,1.16,5.4,M.dark,true);box(x,5.16,-1.45,.18,.12,5.4,M.honey,true);}
    box(4.2,5.16,-4.2,4.7,.12,.12,M.honey,true);
    for(const z of [-6.7,-4.5,-1.7,1.5,4.6,6.65])box(-3,3.72,z,9.8,.30,.22,M.dark);
    // The symmetrical moss-green pitched roof becomes the attic's timber ceiling.
    function roof(a,b,z,d) {const o=box((a[0]+b[0])/2,(a[1]+b[1])/2,z,Math.hypot(b[0]-a[0],b[1]-a[1]),.22,d,M.honey);o.rotation.z=Math.atan2(b[1]-a[1],b[0]-a[0]);}
    roof([-8.3,7.5],[0,10.5],-1.7,10.6); // Front dormer interrupts this slope between z=3.6 and the facade.
    roof([-8.3,7.5],[-5.7,8.44],5.3,3.4);roof([-2.3,9.67],[0,10.5],5.3,3.4);
    roof([0,10.5],[8.3,7.5],-6.6,.8);roof([0,10.5],[8.3,7.5],4.3,5.4);
    roof([0,10.5],[6.3,8.22],-2.3,7.8);
    for(const z of [-6.7,-3.7,.9,3.3,6.7]) {rod([-8.1,7.4,z],[0,10.35,z],.12,M.dark);if(z< -6.2 || z>1.6)rod([0,10.35,z],[8.1,7.4,z],.12,M.dark);}
    rod([0,10.35,-7],[0,10.35,7],.16,M.dark);
    mesh(extrude([[-8.3,7.5],[8.3,7.5],[0,10.5]],[],.36),M.log,0,0,-7);
    mesh(extrude([[-8.3,7.5],[-5.7,7.5],[-5.7,8.44]],[],.36),M.log,0,0,7);
    mesh(extrude([[-2.3,7.5],[8.3,7.5],[0,10.5],[-2.3,9.67]],[],.36),M.log,0,0,7);
    // Front arched dormer, on the left of the entrance just as outside.
    floor(-4,7.4,3.4,1.6,4);
    logWall(-4,8.2,3.4,4,5.1,0,[{u:0,y:6.4,w:1.55,h:2.2}]);
    for(const x of [-5.7,-2.3])box(x,6.55,7.35,.24,5.1,1.7,M.honey,true);
    mesh(extrude([[-1.7,9.1],[1.7,9.1],[0,10.5]],[],.3),M.log,-4,0,8.2);
    for(const s of [-1,1]) {const o=box(-4+s*.85,9.8,6.0,2.2,.18,4.8,M.honey);o.rotation.z=-s*.69;}
    // Large stone chimney on the left/rear, with a recessed hearth and hanging soup pot.
    const fire=mesh(extrude([[-1.75,.1],[1.75,.1],[1.75,3.95],[-1.75,3.95]],[arch(2.1,2.65).map(v=>[v[0],v[1]+.4])],1.35),M.stone,-7.85,0,-3.3,{solid:true});fire.rotation.y=Math.PI/2;
    box(-7.16,7.25,-3.3,1.7,6.6,3.5,M.stone,true);
    for(let row=0;row<22;row++)for(const z of [-4.85,-3.95,-3.05,-2.15]) {
      const yy=.24+row*.47;if(yy<3.2 && z>-4.45 && z<-2.15)continue;
      box(-6.43,yy,z,.22,.40,.78,(row+Math.round(z))%3?M.lightStone:M.stone);
    }
    box(-6.3,3.45,-3.3,.8,.22,3.9,M.honey,true);box(-6.8,.16,-3.3,2.9,.30,4.1,M.lightStone);
    const back=mesh(new THREE.ShapeGeometry(new THREE.Shape(arch(2.12,2.68).map(v=>new THREE.Vector2(...v)))),M.soot,-7.74,.39,-3.3);back.rotation.y=Math.PI/2;
    for(let j=0;j<5;j++) {const z=-3.9+j*.3;rod([-7.4,.45,z],[-6.7,.45,z+.28],.10,M.dark);rock(-7.15,.70,z,.22,M.glow,.65,1.7,.7);}
    rod([-7.12,2.78,-4.2],[-7.12,2.78,-2.4],.05,M.charcoal);rod([-7.12,2.78,-3.3],[-7.12,2.0,-3.3],.018,M.charcoal);
    mesh(new THREE.SphereGeometry(.48,12,6,0,Math.PI*2,0,Math.PI*.8),M.charcoal,-7.12,1.4,-3.3);
    mesh(new THREE.CylinderGeometry(.40,.40,.035,16),M.soup,-7.12,1.82,-3.3);
    for(let j=0;j<5;j++)rock(-7.12+Math.sin(j*2.3)*.22,1.86,-3.3+Math.cos(j*2.3)*.22,.075,j%2?M.flowerCenter:M.carrot);
    // Warm green plaid and the blue guest chair are deliberately different from 森's petal furniture.
    chair(-3.7,0,1.5,M.blue,.25);chair(.7,0,1.5,M.green,-.3);
    table(-1.5,0,1.6,2.35,1.45,.60);book(-1.65,.72,1.6,.7,M.navy);book(-1.50,.91,1.6,.65,M.green);
    for(const x of [-2.2,-.65]){mesh(new THREE.CylinderGeometry(.14,.12,.24,10),M.ceramic,x,.83,1.9);mesh(new THREE.TorusGeometry(.10,.025,5,12),M.ceramic,x+.16,.85,1.9);}
    box(-5.0,.45,4.8,3.2,.70,1.2,M.dark,true);box(-5,.92,4.8,3.1,.25,1.1,M.green,true);box(-5,1.4,5.3,3.3,1.1,.22,M.honey,true);
    for(const x of [-5.9,-4.5])box(x,1.25,5.1,.65,.6,.3,M.cream);
    mesh(new THREE.CylinderGeometry(2.2,2.2,.035,32),M.roofCloth,-1.5,.025,1.5);
    const star=[];for(let j=0;j<16;j++){const a=j*Math.PI/8,r=j%2?.48:1.55;star.push([Math.cos(a)*r,Math.sin(a)*r]);}
    const rug=mesh(new THREE.ShapeGeometry(new THREE.Shape(star.map(v=>new THREE.Vector2(...v)))),M.cream,-1.5,.05,1.5);rug.rotation.x=-Math.PI/2;
    table(-1.8,0,-5.9,3.5,1.4);book(-1.9,1.17,-5.8,1.1,M.navy);
    const globe=mesh(new THREE.SphereGeometry(.34,12,8),M.blueMetal,-.5,1.55,-6);const orbit=mesh(new THREE.TorusGeometry(.41,.023,5,24),M.brass,-.5,1.55,-6);orbit.rotation.z=.35;
    chart(-4.1,2.7,-6.7,1.6,1.6);chart(0,2.7,-6.7,1.3,1.3,0,true);
    // Mineral drawers contain faceted crystals; the user's mineral dex stays wired through hook:dex.
    box(-5.5,.74,-6,2.4,1.4,1.2,M.dark,true);
    for(let j=0;j<3;j++){box(-5.5,.25+j*.38,-5.37,2.2,.30,.06,M.honey);for(const x of [-6.1,-4.9])rock(x,.25+j*.38,-5.30,.045,M.brass);}
    for(let j=0;j<5;j++){const x=-6.35+j*.42;mesh(new THREE.ConeGeometry(.17,.50+(j%3)*.12,5),[M.mineralLavender,M.mineralBlue,M.mineralCream][j%3],x,1.75,-6);box(x,1.47,-5.65,.3,.025,.15,M.paper);}
    // Attic: sheltered sleeping corner and cloud notebook beneath the front dormer.
    box(-4.4,4.72,-4.6,3.0,.26,3.2,M.dark,true);
    for(const x of [-5.68,-3.12])for(const z of [-5.95,-3.25])box(x,4.30,z,.20,.60,.20,M.log,true);
    mesh(kit.rbox(2.85,.26,3,.12),M.cream,-4.4,4.98,-4.6,{solid:true});
    box(-4.4,5.19,-4.2,2.9,.16,2.2,M.green);box(-4.4,5.55,-6.2,3.15,1.4,.20,M.honey,true);
    for(let j=0;j<8;j++)box(-5.65+j*.36,5.28,-4.2,.08,.025,2.2,j%2?M.navy:M.cream);
    for(const x of [-5.2,-3.7])rock(x,5.28,-5.55,.43,M.cream,1.2,.4,.7);
    table(-4,4,5.8,2.8,1.3);book(-4,5.17,5.8,1.1,M.navy);chart(-6.65,6.2,6.65,1.35,1.1,Math.PI,true);
    chart(-.5,6.25,6.65,1.6,2,Math.PI);table(-.6,4,-5.9,2,1.2);book(-.6,5.17,-5.9,.85,M.green);
    // Close the dormer's high cheeks to the existing slope; only its arched window admits sky.
    for(const x of [-5.7,-2.3])box(x,8.9,5.1,.25,1.3,3.0,M.honey);
    box(-4,9.67,3.68,3.4,.22,.25,M.dark);
    for(let j=0;j<5;j++){const xx=-1.3+j*.35;book(xx,5.4,-5.95,.22,j%2?M.navy:M.paper);}
    // The exterior's right/rear ladder is expanded into a safe two-flight roof stair.
    floor(8.6,-5.1,4.6,2.2,7.35);
    // Recess the lower roof flight 15 cm from the existing east wall corner.
    stairs.push(flight(7.25,4,1.5,-4,3.35,1.8,14),flight(9.8,7.35,-4,1.5,3.35,1.8,14));
    // Stair outer rails and landing guards, with the turning route unobstructed.
    box(10.95,7.9,-5.05,.12,1.1,2.2,M.honey,true);box(8.6,7.9,-6.2,4.6,1.1,.12,M.honey,true);
    floor(3.1,-1.35,6.2,9.7,10.7);floor(8.65,-5.1,4.9,2.2,10.7);floor(8.65,2.5,4.9,2,10.7);
    // Bottom face of the roof deck has proper joists; railings have individually solid balusters.
    for(const z of [-5.8,-3.8,-1.4,1.1,2.6])box(3.1,10.38,z,6.2,.32,.22,M.dark);
    function rail(a,b) {const length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(length/.75);const r=rod([a[0],11.9,a[1]],[b[0],11.9,b[1]],.075,M.honey);r.userData.solid=true;for(let j=0;j<=steps;j++)box(a[0]+(b[0]-a[0])*j/steps,11.3,a[1]+(b[1]-a[1])*j/steps,.12,1.2,.12,M.dark,true);}
    rail([0,-6.2],[11.1,-6.2]);rail([0,-6.2],[0,3.5]);rail([0,3.5],[11.1,3.5]);rail([11.1,-6.2],[11.1,3.5]);rail([6.2,-3.9],[6.2,1.4]);
    // Open sky uses the engine's time-aware window scenery, beyond the platform perimeter.
    const view=kit.view();
    const sky=new THREE.ShaderMaterial({uniforms:view.uniforms,vertexShader:view.vertexShader,fragmentShader:view.fragmentShader,side:THREE.BackSide,transparent:true,depthWrite:false});
    const dome=mesh(new THREE.SphereGeometry(24,48,24),sky,3,10,0,{camThrough:true});dome.name='共用時段天空的觀星穹景';dome.renderOrder=-10;
    const starPositions=[];
    for(let j=0;j<130;j++){const a=j*2.39996323,v=.08+(j+.5)/130*.88,r=Math.sqrt(1-v*v)*22;starPositions.push(3+Math.cos(a)*r,10+v*22,Math.sin(a)*r);}
    const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
    const starMat=new THREE.ShaderMaterial({uniforms:{uNight:view.uniforms.uNight},transparent:true,depthWrite:false,
      vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=2.6;}',
      fragmentShader:'uniform float uNight;void main(){float d=length(gl_PointCoord-vec2(0.5));gl_FragColor=vec4(1.0,0.91,0.78,smoothstep(0.5,0.05,d)*uNight);}' });
    const stars=new THREE.Points(starGeo,starMat);stars.name='夜間裝飾星光';stars.userData.prop=true;g.add(stars);
    // A genuinely dimensional brass telescope, tripod, finder, eyepiece, and star pennant.
    const tc=[4.5,12.05,-2.0];for(const p of [[3.6,10.75,-1.4],[5.4,10.75,-1.4],[4.5,10.75,-3.1]]){const leg=rod(p,tc,.075,M.iron);leg.userData.solid=true;}
    rock(...tc,.22,M.brass);rod(tc,[4.5,12.4,-2],.10,M.brass);
    const axis=new THREE.Vector3(.85,.5,-.15).normalize(),mid=new THREE.Vector3(4.7,12.6,-2);
    function barrel(t,len,r,m){const c=mid.clone().addScaledVector(axis,t);const o=mesh(new THREE.CylinderGeometry(r,r,len,16),m,...c.toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);return o;}
    barrel(0,2.4,.25,M.brass);barrel(-1.38,.5,.12,M.iron);barrel(1.3,.25,.34,M.brass);barrel(1.44,.025,.26,M.navyMetal);
    for(const t of [-.9,.25,1.05])barrel(t,.075,.28,M.brass);
    rod([4.3,12.85,-1.9],[5.2,13.4,-2.05],.07,M.brass);
    chart(2.1,11.6,2.7,1.5,1.5,Math.PI);chair(1.05,10.7,-.90,M.blue,-Math.PI/2);
    const pennant=mesh(extrude([[-.6,0],[.6,0],[0,-1.6]],[],.03),M.navy,5.5,11.85,2.76);chart(5.5,11.1,2.72,.75,.8,Math.PI);
    // Stacked firewood, rolled blankets and a small flowering jug soften the lodge's edges.
    for(let j=0;j<7;j++)rod([-7.1+(j%3)*.30,.3+Math.floor(j/3)*.27,-.7],[-7.1+(j%3)*.30,.3+Math.floor(j/3)*.27,.1],.14,M.honey);
    for(const [x,y,z] of [[-5.9,1.6,5.1],[-6.15,1.8,-6],[-.6,5.5,-6]]) {
      mesh(new THREE.CylinderGeometry(.18,.24,.35,8),M.ceramic,x,y,z);for(let j=0;j<4;j++){const xx=x+Math.sin(j*2.4)*.23,zz=z+Math.cos(j*2.4)*.18;rod([x,y+.15,z],[xx,y+.7,zz],.018,M.leaf,5);rock(xx,y+.65,zz,.14,j%2?M.pink:M.lavender,1,.7,1);}
    }
    // Second dressing pass: a collected mountain lodge, with astronomy and camping artefacts.
    function soft(x,y,z,w,h,d,m,r=.05) {return mesh(shape('r'+[w,h,d,r],()=>kit.rbox(w,h,d,r)),m,x,y,z);}
    function cluster(name,x,y,z,ry,fn) {
      const start=g.children.length;fn();const q=new THREE.Group();q.name=name;
      g.children.slice(start).forEach(o=>q.add(o));q.position.set(x,y,z);q.rotation.y=ry;g.add(q);return q;
    }
    function books(x,y,z,n=4) {
      for(let j=0;j<n;j++){const w=.5+j%2*.08;soft(x+j%2*.05,y+.06+j*.13,z,w,.11,.39,[M.navy,M.green,M.honeyCloth][j%3],.018);box(x,y+.06+j*.13,z+.201,w-.08,.065,.015,M.paper);}
    }
    function flowers(x,y,z,s=1) {
      mesh(new THREE.CylinderGeometry(.16*s,.24*s,.36*s,8),M.ceramic,x,y+.18*s,z);
      mesh(new THREE.TorusGeometry(.13*s,.027*s,4,12),M.ceramic,x,y+.37*s,z).rotation.x=Math.PI/2;
      for(let j=0;j<5;j++) {
        const a=j*2.4,xx=x+Math.sin(a)*.26*s,zz=z+Math.cos(a)*.19*s,yy=y+(.69+j%3*.07)*s;
        rod([x,y+.3*s,z],[xx,yy,zz],.014*s,M.leaf,5);rock(xx,yy-.14*s,zz,.17*s,M.leaf,1.4,.4,.6);
        for(let k=0;k<5;k++)rock(xx+Math.sin(k*1.256)*.08*s,yy,zz+Math.cos(k*1.256)*.08*s,.075*s,j%2?M.pink:M.lavender,1,.6,1);
        rock(xx,yy+.03*s,zz,.04*s,M.flowerCenter);
      }
    }
    function trail(a,b,n=8) {
      for(let j=0;j<n;j++) {
        const t=j/(n-1),p=a.map((v,k)=>v+(b[k]-v)*t);p[0]+=.09*Math.sin(j*2.1);
        rock(...p,.21,M.leaf,1.3,.6,.7);
        if(j%2===0){rock(p[0]+.08,p[1]+.06,p[2]+.07,.14,j%4?M.pink:M.lavender,1,.7,.6);rock(p[0]+.08,p[1]+.10,p[2]+.09,.045,M.flowerCenter);}
        if(j)rod(a.map((v,k)=>v+(b[k]-v)*(j-1)/(n-1)),p,.017,M.leaf,5);
      }
    }
    function armillary(x,y,z,s=1) {
      mesh(new THREE.CylinderGeometry(.22*s,.27*s,.08*s,12),M.brass,x,y+.04*s,z);
      rod([x,y+.08*s,z],[x,y+.35*s,z],.05*s,M.brass);
      for(let j=0;j<3;j++){const o=mesh(new THREE.TorusGeometry(.32*s,.023*s,5,28),M.brass,x,y+.67*s,z);o.rotation.set(j===0?Math.PI/2:.35,j*.65,j*.6);}
      rock(x,y+.67*s,z,.15*s,M.blueMetal,1,1,1);rod([x-.19*s,y+.28*s,z],[x+.19*s,y+1.05*s,z],.018*s,M.brass);
    }
    function rolls(x,y,z,n=3) {
      for(let j=0;j<n;j++) {
        const xx=x+j*.16,zz=z+j%2*.10;
        rod([xx,y+.08,zz-.30],[xx,y+.08,zz+.30],.075,M.paper,10);
        rod([xx,y+.08,zz-.03],[xx,y+.08,zz+.03],.082,M.honeyCloth,10);
        mesh(new THREE.TorusGeometry(.051,.014,4,12),M.chart,xx,y+.08,zz+.31);
      }
    }
    function shelf(x,y,z,w,h,ry) {
      cluster('岳的滿架觀測書與礦物櫃',x,y,z,ry,()=>{
        box(0,h/2,-.20,w,h,.10,M.dark,true);
        for(const xx of [-w/2,w/2])box(xx,h/2,0,.13,h,.50,M.honey,true);
        const rows=4;
        for(let row=0;row<rows;row++) {
          const yy=.18+row*(h-.35)/(rows-1);box(0,yy,0,w+.12,.11,.55,M.honey,true);
          const count=Math.max(6,Math.floor((w-.22)/.17));
          for(let j=0;j<count;j++) {
            const xx=-w/2+.17+j*(w-.30)/count,hh=.32+(j+row)%4*.07;
            if(row===2 && j>count-5){if(j%2===0){rock(xx,yy+.22,.04,.16,[M.mineralLavender,M.mineralBlue,M.mineralCream][j%3],.7,1.5,.8);box(xx,yy+.07,.19,.2,.025,.09,M.paper);}}
            else {box(xx,yy+.06+hh/2,.02,.13,hh,.30,[M.navy,M.green,M.honeyCloth,M.paper][(j+row)%4]);for(const v of [.14,.27])box(xx,yy+v,.178,.09,.018,.012,M.brass);}
          }
        }
        box(0,h+.05,0,w+.28,.15,.64,M.log);box(0,.12,.05,w+.20,.20,.63,M.log);
      });
    }
    function crate(x,y,z,w=1) {
      box(x,y+.30,z,w,.60,.70,M.dark,true);
      for(let j=0;j<3;j++)for(const side of [-1,1])box(x,y+.12+j*.19,z+side*.36,w,.14,.07,M.honey);
      for(const dx of [-w/2+.08,w/2-.08])for(const dz of [-.39,.39])box(x+dx,y+.30,z+dz,.10,.64,.06,M.log);
    }
    function cask(x,y,z) {
      mesh(new THREE.CylinderGeometry(.38,.35,.76,12),M.honey,x,y+.38,z,{solid:true});
      for(const yy of [.12,.63])mesh(new THREE.TorusGeometry(.38,.035,5,16),M.charcoal,x,y+yy,z).rotation.x=Math.PI/2;
      for(let j=0;j<12;j++){const a=j*Math.PI/6;rod([x+Math.sin(a)*.372,y+.08,z+Math.cos(a)*.372],[x+Math.sin(a)*.372,y+.70,z+Math.cos(a)*.372],.012,M.dark,4);}
      mesh(new THREE.CylinderGeometry(.34,.34,.045,12),M.log,x,y+.77,z);
    }
    // Timber framing, black iron straps and individually patterned ceiling planks.
    for(const x of [-7.65,-.1,7.65])for(const z of [-6.65,6.65]) {
      // Do not place a column on the original doorway.
      box(x,3.55,z,.22,7.1,.22,M.dark,true);
      for(const yy of [3.38,7.12]) {
        box(x,yy,z,.27,.24,.27,M.charcoal);
        for(const dx of [-.075,.075])rock(x+dx,yy,z+.15,.035,M.brass);
        for(const side of [-1,1])if(Math.abs(x+side*.9)<7.7)rod([x,yy-.65,z],[x+side*.9,yy-.03,z],.09,M.honey);
      }
    }
    for(let x=-7.5;x<6.2;x+=.47) {
      const yy=10.5-Math.abs(x)*3/8.3-.15;
      if(x< -5.8 || (x> -2.3 && x<6.2))box(x,yy,0,.025,.035,13.2,M.dark);
      else box(x,yy,-1.7,.025,.035,10.3,M.dark);
    }
    for(const z of [-5.7,-2.8,.2,3.3,5.8])box(-3,3.59,z,9.5,.07,.09,M.honey);
    for(let x=-7.5;x<1.6;x+=.48)box(x,3.752,0,.017,.012,13.5,M.log);
    // The grey chimney slab becomes a framed, book-filled built-in in the sleeping corner.
    shelf(-6.27,4.02,-3.3,3.37,3.30,Math.PI/2);
    box(-6.285,5.67,-3.3,.06,3.30,3.37,M.log);
    box(-7.15,5.67,-1.48,1.78,3.30,.12,M.log,true);
    for(let j=0;j<9;j++)box(-7.15,4.13+j*.37,-1.39,1.80,.10,.08,M.honey);
    for(let yy=7.65;yy<10.3;yy+=.44)for(let j=0;j<4;j++)box(-6.27,yy,-4.68+j*.83,.12,.36,.76,j%2?M.lightStone:M.stone);
    shelf(.55,0,-6.40,1.25,3.05,0);shelf(6.95,0,5.90,1.65,2.9,-Math.PI/2);
    shelf(-7.42,4,2.65,2.5,2.9,Math.PI/2);shelf(3.25,4,6.5,2.2,2.75,Math.PI);
    // Hearth mantel, useful fire tools and small stacked logs, clear of the soup standing spot.
    books(-6.18,3.58,-4.2,3);flowers(-6.20,3.58,-2.1,.8);
    for(const z of [-4.65,-2.0])trail([-6.05,3.85,z],[-5.98,2.8,z],7);
    for(const z of [-4.62,-2.06]) {
      mesh(new THREE.CylinderGeometry(.08,.13,.10,10),M.brass,-6.05,3.62,z);
      mesh(new THREE.CylinderGeometry(.06,.06,.32,8),M.ceramic,-6.05,3.83,z);rock(-6.05,4.03,z,.07,M.glow,.6,1.4,.6);
    }
    for(let j=0;j<4;j++) {const z=-1.20+j*.16;rod([-6.80,.2,z],[-6.80,1.40,z],.025,M.charcoal,6);mesh(new THREE.TorusGeometry(.07,.018,4,12),M.charcoal,-6.80,1.47,z);rock(-6.80,.24,z,.11,M.charcoal,.45,1.6,.5);}
    box(-6.8,.14,-.94,.65,.10,.83,M.charcoal);
    crate(-7.25,0,3.4,1.10);cask(-7.18,0,5.9);
    for(let j=0;j<8;j++)rod([-7.6+j%3*.28,.15+Math.floor(j/3)*.24,3.25],[-7.6+j%3*.28,.15+Math.floor(j/3)*.24,3.85],.12,M.honey);
    // Plaid is crossed warp and weft, with tassels rather than isolated stripes.
    function plaid(x,y,z,w,d,m=M.green) {
      soft(x,y,z,w,.03,d,m,.02);
      for(let j=0;j<=Math.floor(w/.25);j++)box(x-w/2+j*.25,y+.018,z,.032,.008,d,M.cream);
      for(let j=0;j<=Math.floor(d/.25);j++)box(x,y+.026,z-d/2+j*.25,w,.008,.035,M.navy);
    }
    for(const x of [-3.7,.7]) {
      soft(x,.99,1.48,1.13,.09,1.05,M.cream);
      plaid(x-.22,1.05,1.5,.52,1.05);
      soft(x-.22,.65,.95,.52,.78,.035,M.green,.02);
      for(let j=0;j<6;j++){box(x-.46+j*.09,.65,.92,.025,.77,.018,M.cream);rod([x-.46+j*.09,.25,.92],[x-.46+j*.09,.10,.92],.012,M.cream,4);}
      soft(x+.23,1.22,1.85,.55,.50,.20,M.blue);
    }
    plaid(-1.5,.706,1.6,.68,1.30);flowers(-1.93,1.18,1.49,.55);armillary(-1.02,.73,1.35,.58);
    // An embroidered two-layer star carpet and flat runners visually occupy the open paths.
    soft(-1.5,.013,1.5,5.6,.018,4.5,M.cream,.10);soft(-1.5,.026,1.5,5.35,.018,4.25,M.roofCloth,.08);
    for(const z of [-.48,3.48])for(let j=0;j<20;j++)box(-4.03+j*.265,.044,z,.13,.012,.045,M.goldCloth);
    for(let j=0;j<22;j++)for(const z of [-.87,3.87])rod([-4.2+j*.255,.024,z],[-4.2+j*.255,.024,z+(z<0?-.12:.12)],.015,M.cream,4);
    soft(1.75,.025,-1.9,2.9,.022,3.6,M.navy,.06);soft(1.75,.041,-1.9,2.65,.010,3.35,M.green,.04);
    soft(-2.1,4.025,1.3,3.8,.025,3.8,M.cream,.09);soft(-2.1,4.043,1.3,3.55,.012,3.55,M.green,.06);
    soft(4.8,10.723,1.45,3.8,.025,1.75,M.navy,.06);
    // Open charts, rolled maps, compass, journal and miniature instrument at the study desk.
    plaid(-1.8,1.154,-5.9,1.6,1.25);
    for(const x of [-2.55,-1.95]) {
      const page=box(x,1.202,-5.70,.56,.035,.70,M.paper);page.rotation.z=x< -2.2?-.06:.06;
      mesh(new THREE.TorusGeometry(.18,.01,4,24),M.chart,x,1.228,-5.70).rotation.x=-Math.PI/2;
      for(let j=0;j<4;j++)rock(x+Math.sin(j*2.1)*.16,1.24,-5.70+Math.cos(j*2.1)*.18,.025,M.ink);
    }
    rolls(-2.95,1.17,-6.1);armillary(-.5,1.17,-6,.8);
    mesh(new THREE.CylinderGeometry(.19,.19,.055,16),M.ink,-1.1,1.20,-5.55);
    mesh(new THREE.CylinderGeometry(.16,.16,.012,16),M.paper,-1.1,1.235,-5.55);
    rod([-1.1,1.25,-5.69],[-1.1,1.25,-5.41],.012,M.chart,4);flowers(-3.18,1.16,-5.7,.60);
    cluster('星圖書桌的坐墊木椅',-3.8,0,-6.0,.4,()=>{
      soft(0,.57,0,.85,.18,.85,M.green).userData.solid=true;box(0,1.12,.33,.90,.90,.14,M.honey,true);
      for(const x of [-.32,.32])for(const z of [-.30,.30])box(x,.28,z,.10,.56,.10,M.dark,true);
      for(let j=0;j<4;j++)box(-.3+j*.20,1.12,.42,.045,.7,.025,M.cream);
    });
    // Curtains stay to the sides of the green shutters and keep the arch's daylight unobstructed.
    function curtains(x,y,z,w,h,ry) {
      cluster('觀星木屋的束帶窗簾與花台',x,y,z,ry,()=>{
        rod([-w/2-.32,h+.15,0],[w/2+.32,h+.15,0],.032,M.iron);
        for(const side of [-1,1]) {
          for(let j=0;j<3;j++)soft(side*(w/2+.25)+j*.07,h*.55,.1,.13,h*.88,.12,j%2?M.cream:M.green,.035);
          box(side*(w/2+.32),h*.39,.19,.32,.07,.06,M.brass);flowers(side*w*.32,-.03,.13,.48);
        }
      });
    }
    curtains(-5.1,1.05,6.58,2.2,2.6,Math.PI);curtains(-1.8,1.1,-6.5,2.2,2.5,0);
    curtains(-7.50,1.15,.8,2,2.4,Math.PI/2);curtains(7.51,1.15,1.2,2.1,2.4,-Math.PI/2);
    curtains(-4,6.4,7.80,1.55,2.2,Math.PI);
    // Loft sleeping nook: overstuffed mattress, headboard carpentry and full crossed quilt.
    plaid(-4.4,5.30,-4.2,2.82,2.12);
    soft(-4.4,5.39,-3.38,2.78,.15,.58,M.navy,.05);
    for(let j=0;j<10;j++)box(-5.62+j*.27,5.47,-3.38,.020,.012,.51,M.cream);
    for(const x of [-5.96,-2.84]){box(x,5.45,-6.2,.16,1.8,.24,M.log,true);rock(x,6.42,-6.2,.17,M.honey);}
    for(let j=0;j<8;j++)box(-5.78+j*.39,5.57,-6.07,.025,1.12,.035,M.dark);
    box(-2.07,4.45,-5.7,.78,.90,.82,M.log,true);soft(-2.07,4.94,-5.7,.89,.12,.91,M.honey);
    for(const yy of [4.24,4.60]){box(-2.07,yy,-5.25,.65,.26,.05,M.greenWood);rock(-2.07,yy,-5.20,.045,M.brass);}
    books(-2.07,5.02,-5.7,2);flowers(-1.98,5.3,-5.75,.45);
    // Rolled sleeping bag with visible spiral ends, leather straps and a packed expedition bag.
    rod([-5.85,4.43,-.62],[-4.6,4.43,-.62],.34,M.green,12);
    for(const x of [-5.65,-4.8]) {const band=mesh(new THREE.TorusGeometry(.35,.04,5,18),M.darkCloth,x,4.43,-.62);band.rotation.y=Math.PI/2;}
    for(const x of [-5.86,-4.59]){const spiral=mesh(new THREE.TorusGeometry(.20,.04,5,18),M.cream,x,4.43,-.62);spiral.rotation.y=Math.PI/2;}
    soft(-7.0,4.6,5.6,.90,1.15,.60,M.green,.12).userData.solid=true;
    soft(-7.0,4.4,5.97,.65,.42,.20,M.honeyCloth,.04);for(const x of [-7.27,-6.73])box(x,4.65,5.94,.10,1.10,.06,M.darkCloth);
    crate(-6.60,4,6.6,1.1);cask(6.80,4,5.7);rolls(-4.88,5.18,5.65,3);flowers(-3.02,5.18,5.75,.7);
    books(-.6,5.18,-5.9,2);armillary(-.8,5.56,-5.9,.5);
    for(const [x,z] of [[-7.5,6.4],[-.1,-6.4],[6.8,6.3]]) {trail([x,3.45,z],[x,2.0,z],8);trail([x,7.1,z],[x,5.8,z],7);}
    for(const [x,y,z,top] of [[-7.35,2.55,5.5,3.7],[-7.2,6.45,1.0,7.72]]) {
      flowers(x,y,z,.9);
      for(const side of [-1,1])rod([x+side*.17,y+.30,z],[x,top,z],.014,M.darkCloth,5);
      trail([x+.19,y+.3,z],[x+.23,y-.45,z],5);
    }
    // Deck accessories hug the parapets; the telescope interaction and all stair mouths remain open.
    table(5.55,10.7,-5.7,1.3,.8,.72);rolls(5.3,11.52,-5.7,2);armillary(5.9,11.52,-5.7,.45);
    crate(.65,10.7,1.9,.8);soft(.65,11.36,1.9,.85,.16,.70,M.blue);
    rod([5.10,12.7,-1.92],[5.72,13.08,-2.02],.055,M.navyMetal);
    for(let j=0;j<10;j++) {const a=j*Math.PI/5;rock(4.5+Math.cos(a)*.25,12.02,-2+Math.sin(a)*.25,.035,M.brass);}
    // Third pass: collected camping equipment lives in useful islands, with open public aisles.
    function roundSolid(x,y,z,w,h,d,m,r=.07) {const o=soft(x,y,z,w,h,d,m,r);o.userData.solid=true;return o;}
    function trunk(x,y,z,w,d,h,m=M.greenWood) {
      roundSolid(x,y+h/2,z,w,h,d,m,.08);soft(x,y+h+.045,z,w+.06,.10,d+.05,M.honey,.045);
      for(const dx of [-w*.34,w*.34]) {
        soft(x+dx,y+h/2,z+d/2+.025,.10,h-.05,.045,M.darkCloth,.015);
        soft(x+dx,y+h*.73,z+d/2+.06,.17,.15,.035,M.brass,.02);
      }
      rod([x-.16,y+h*.55,z+d/2+.10],[x+.16,y+h*.55,z+d/2+.10],.024,M.brass,6);
    }
    function cup(x,y,z,m=M.greenCup) {
      mesh(new THREE.CylinderGeometry(.14,.11,.25,10),m,x,y+.125,z);
      mesh(new THREE.CylinderGeometry(.115,.115,.012,10),M.tea,x,y+.255,z);
      mesh(new THREE.TorusGeometry(.10,.025,5,12),m,x+.15,y+.14,z);
    }
    function kettle(x,y,z) {
      rock(x,y+.25,z,.32,M.charcoal,1,1,.9);mesh(new THREE.CylinderGeometry(.20,.25,.06,10),M.brass,x,y+.49,z);
      rock(x,y+.56,z,.055,M.iron);rod([x+.2,y+.25,z],[x+.5,y+.4,z],.055,M.brass);
      mesh(new THREE.TorusGeometry(.28,.025,5,18,Math.PI),M.brass,x,y+.51,z);
    }
    function fieldBox(x,y,z,w,d,h) {
      trunk(x,y,z,w,d,h,M.dark);
      for(let j=0;j<4;j++) {
        const xx=x-w*.33+j*w*.22;
        rock(xx,y+h+.22,z-Math.min(.12,d*.1),.16,[M.mineralLavender,M.mineralBlue,M.mineralCream,M.stone][j],.75,1.25+j%2*.4,.9);
        soft(xx,y+h+.115,z+d*.3,.22,.02,.13,M.paper,.01);
      }
    }
    function campStool(x,y,z,m=M.blue,w=.85) {
      roundSolid(x,y+.55,z,w,.18,.72,m,.08);
      for(const dz of [-.24,.24])for(const side of [-1,1])rod([x+side*.33,y+.04,z+dz],[x-side*.28,y+.49,z+dz],.045,M.iron);
      rock(x,y+.27,z+.26,.05,M.brass);
    }
    function openAtlas(x,y,z) {
      for(const side of [-1,1]) {
        const o=soft(x+side*.29,y+.04,z,.56,.055,.72,M.paper,.015);o.rotation.z=side*.06;
        mesh(new THREE.TorusGeometry(.16,.012,4,20),M.chart,x+side*.29,y+.083,z).rotation.x=Math.PI/2;
        for(let j=0;j<3;j++)rock(x+side*.29+Math.sin(j*2.1)*.12,y+.09,z+Math.cos(j*2.1)*.14,.022,M.ink);
      }
    }
    cluster('一樓・中央遠足打包與地形標本島',2.0,0,-5.05,0,()=>{
      table(0,0,0,3.1,2.25);trunk(-.68,0,0,1.28,1.48,.72);trunk(.77,0,0,1.2,1.48,.72,M.navyWood);
      openAtlas(-.60,1.15,.15);rolls(.52,1.15,-.4,4);armillary(1.02,1.15,.32,.65);cup(.12,1.15,.55);
    });
    cluster('一樓・岳整理岩石的小工作檯',-3.45,0,-3.15,0,()=>{
      fieldBox(0,0,0,1.4,.40,.76);books(-.37,.87,0,3);flowers(.45,.87,-.10,.70);
      mesh(new THREE.TorusGeometry(.16,.026,5,18),M.brass,.35,.91,.06).rotation.x=-Math.PI/2;
    });
    cluster('一樓・湯鍋旁的餐具與柴薪角',-5.62,0,-.44,0,()=>{
      trunk(0,0,0,1.55,1.58,.90);kettle(-.23,1.04,-.30);cup(.35,1.04,.32);flowers(.45,1.04,-.40,.80);
      rolls(-.4,1.04,.4,2);
    });
    cluster('一樓・兩人喝湯的窗前餐茶櫃',-1.25,0,5.12,0,()=>{
      trunk(0,0,0,3.15,1.45,.84);plaid(0,.97,0,2.9,1.28);
      kettle(-.76,1.0,-.15);cup(.38,1.0,.25);cup(.92,1.0,-.18);books(.25,1.0,-.35,3);flowers(-1.18,1.0,.26,.75);
      campStool(-2.0,0,-.1,M.green);
    });
    cluster('一樓・門邊待出發的露營行李',5.55,0,6.0,0,()=>{
      trunk(0,0,0,3.25,1.0,1.03);trunk(-.85,1.12,0,1.02,.82,.47,M.navyWood);rolls(.05,1.15,-.10,4);
      soft(.95,1.35,0,.76,.42,.66,M.green,.13);for(const dx of [.7,1.18])box(dx,1.4,.34,.08,.40,.04,M.darkCloth);
      flowers(-1.24,1.12,0,.90);
    });
    cluster('一樓・樓梯前的靴子與觀測箱',5.65,0,3.37,0,()=>{
      trunk(0,0,0,3.3,1.12,.72);fieldBox(0,.83,0,1.12,.83,.33);
      books(-.88,.85,.22,3);books(.88,.85,.22,2);
    });
    cluster('一樓・打包中途坐下來讀圖的長凳',0,0,-1.55,0,()=>{
      trunk(0,0,0,2.5,1.1,.57);soft(0,.75,0,2.4,.24,1.03,M.green,.10);
      soft(-.67,.97,.34,.62,.49,.20,M.blue,.08);books(.62,.89,-.19,3);cup(.04,.89,.21);
    });
    // Store the spare stool beside the window, clear of the host-to-mineral return aisle.
    campStool(-7.05,0,3.35,M.blue,.95);books(-7.05,.69,3.35,2);
    trunk(1.15,0,3.05,1.1,.75,.56);cup(1.15,.69,3.05);
    trunk(-.40,0,-4.75,.60,.70,.72,M.navyWood);books(-.4,.85,-4.75,3);
    cluster('一樓・主人圈外的低採集袋',-4.2,0,-.05,0,()=>{
      // Keep the host's 1 m circle clear; this soft bag stays entirely below 0.45 m.
      soft(0,.16,0,.90,.32,.72,M.green,.12);soft(0,.34,0,.77,.04,.65,M.navy,.018);
      for(const x of [-.28,.28])soft(x,.18,0,.055,.35,.74,M.darkCloth,.012);
      rod([-.16,.39,.08],[.16,.39,.08],.02,M.brass,5);
    });
    cluster('一樓・讀圖凳旁的高花器',2.35,0,-.60,0,()=>{
      trunk(0,0,0,.7,1.85,.70);flowers(0,.83,0,1.15);books(.17,.83,.48,2);
      flowers(0,.83,-.61,.72);flowers(0,.83,.65,.72);
    });
    cluster('一樓・打包島邊待繫上的睡袋與星圖',1.60,0,-3.15,0,()=>{
      soft(0,.17,0,.80,.34,.66,M.green,.14);
      for(const x of [-.24,.24])soft(x,.18,0,.055,.35,.69,M.darkCloth,.015);
      soft(0,.37,0,.58,.055,.44,M.navy,.02);soft(0,.40,.02,.48,.018,.34,M.paper,.01);
      rod([-.18,.42,.03],[.15,.42,.03],.012,M.brass,5);
    });
    cluster('一樓・梯後雨具與野外觀測收納',6.55,0,-4.03,0,()=>{
      trunk(0,0,0,1.6,1.1,1.10);fieldBox(0,1.21,0,1.3,.85,.25);rolls(-.35,1.58,.10,3);flowers(.5,1.58,-.16,.75);
    });
    trunk(6.97,0,-6.34,1.3,.7,.82);kettle(6.97,.95,-6.34);
    // Loft: an indoor campsite for cloud watching, recording and mending equipment.
    cluster('閣樓・攤開氣象圖的營地長桌',-1.65,4,.15,0,()=>{
      table(0,0,0,3.1,2.45);trunk(-.72,0,0,1.28,1.80,.72);trunk(.73,0,0,1.25,1.80,.72);
      plaid(0,1.16,0,1.0,2.2);openAtlas(-.66,1.2,-.15);armillary(.77,1.2,-.65,.80);
      cup(.97,1.2,.70);rolls(-.70,1.2,.74,3);books(.22,1.2,.17,3);
      trunk(0,0,2.1,2.7,.78,.56,M.navyWood);soft(0,.73,2.1,2.6,.20,.75,M.green,.09);
    });
    cluster('閣樓・風停之後的格紋休息榻',-5.65,4,1.45,Math.PI/2,()=>{
      trunk(0,0,0,2.45,1.65,.58);soft(0,.78,0,2.35,.28,1.55,M.green,.12);
      roundSolid(0,1.15,.67,2.5,.85,.21,M.honey);plaid(-.58,.94,-.05,.66,1.4);
      for(const x of [-.63,.63])soft(x,1.11,.44,.65,.58,.24,M.cream,.08);
      books(.66,.95,-.40,3);cup(.02,.95,-.42);
    });
    cluster('閣樓・雲量紀錄與舊觀測本長櫃',-1.0,4,6.12,0,()=>{
      trunk(0,0,0,2.45,1.0,.91);openAtlas(-.50,1.04,0);rolls(.35,1.04,-.16,3);flowers(.88,1.04,.11,.8);
    });
    cluster('閣樓・換季帳篷與摺毯收納島',4.55,4,4.70,0,()=>{
      trunk(0,0,0,2.85,1.78,.72);trunk(-.62,.81,-.12,1.25,1.2,.42,M.navyWood);
      soft(.65,.98,.10,1.15,.40,1.43,M.green,.13);plaid(.65,1.2,.12,1.05,1.30);
      rolls(-.45,1.32,-.1,4);flowers(1.05,.86,-.55,.65);
    });
    cluster('閣樓・北側的觀測器材歸檔牆',3.65,4,-6.35,0,()=>{
      trunk(0,0,0,3.65,.85,1.12);fieldBox(-1.0,1.21,0,1.25,.65,.26);armillary(.20,1.25,0,.85);
      books(1.20,1.25,0,4);flowers(1.55,1.25,-.06,.65);
    });
    cluster('閣樓・床邊查閱舊觀測本的小箱',-1.65,4,-3.30,0,()=>{
      trunk(0,0,0,1.95,1.0,.92,M.navyWood);openAtlas(0,1.05,0);flowers(.45,1.05,-.21,.65);
    });
    cluster('閣樓・營地長桌旁的摺疊記錄台',1.5,4,4.30,0,()=>{
      trunk(0,0,0,1.2,.8,.82);books(-.24,.95,0,4);flowers(.35,.95,-.1,.9);cup(.05,.95,.20);
    });
    campStool(-2.0,4,4.10,M.green);books(-2,4.68,4.10,3);
    trunk(4.8,4,3.55,1.6,.65,.65,M.navyWood);rolls(4.45,4.78,3.55,4);
    trunk(1.25,4,-5.7,.65,1.80,1.0,M.navyWood);armillary(1.25,5.13,-5.80,.65);books(1.25,5.13,-6.12,3);
    // Roof deck keeps a 2 m east-west landing approach and the telescope's standing circle.
    cluster('屋頂・星圖校對的防露工作島',3.0,10.7,-4.85,0,()=>{
      trunk(.2,0,0,2.60,2.0,.90,M.navyWood);table(0,0,1.12,2.10,.95,.70);
      openAtlas(-.35,1.03,0);armillary(.56,1.03,-.17,.65);rolls(-.5,.82,1.10,3);cup(.39,.82,1.25);
    });
    cluster('屋頂・靠欄的薄荷花箱',.67,10.7,-3.30,0,()=>{
      trunk(0,0,0,1.1,1.9,.62);
      for(let j=0;j<4;j++)flowers(0,.75,-.63+j*.42,.9+j%2*.15);
    });
    cluster('屋頂・披毯等流星的雙人軟榻',1.35,10.7,1.90,0,()=>{
      trunk(0,0,0,2.4,2.35,.58);soft(0,.79,0,2.32,.26,2.27,M.blue,.11);
      roundSolid(0,1.16,1.04,2.44,.84,.19,M.honey);plaid(-.36,.95,0,.60,2.10);
      soft(.39,1.08,.43,.55,.50,.22,M.cream,.08);books(.37,.95,-.42,3);cup(-.50,.95,-.35);
    });
    cluster('屋頂・望遠鏡鏡蓋與觀測工具檯',5.18,10.7,.35,0,()=>{
      trunk(0,0,0,1.70,2.1,.82);fieldBox(0,.95,-.20,1.14,.86,.26);
      books(-.32,.95,.51,2);cup(.35,.95,.48);soft(.23,1.30,-.20,.52,.10,.52,M.navyMetal,.05);
    });
    cluster('屋頂・背風處的防水器材長箱',8.42,10.7,-5.96,0,()=>{
      trunk(0,0,0,3.66,.65,.78);rolls(-1.0,.91,0,4);books(.80,.91,0,3);
    });
    // 銅罩讓星圖桌保有焦點，圓燈籠照樓梯與觀星平台。
    lamp(-1.3,3.1,1.8,3.76);lamp(-2.2,6.8,1.9,9.5879);sconce(7.45,1.728,3.45);
    lantern(7.4,7.4,.2,8.1);lantern(8.6,9.9,-5.1,10.46);lantern(4.5,13.3,-3.8,14);
    const aim=new THREE.Vector3(0,-1.95,-.86).normalize(),collar=mesh(new THREE.CylinderGeometry(.10,.17,.16,16,1,true),M.hood,-.5,3.2621,-4.9049);
    collar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),aim.clone().negate());
    box(8.4,6.4,.2,.16,3.4,.16,M.dark,true);rod([8.4,8.1,.2],[7.4,8.1,.2],.065,M.honey);
    box(5.8,12.35,-3.8,.18,3.3,.18,M.dark,true);rod([5.8,14,-3.8],[4.5,14,-3.8],.07,M.honey);
    Object.assign(g.userData,{
      // 星圖與地球儀聚焦，書架下燈補標籤，樓梯壁燈與低櫃腳光引導夜間步伐。
      glow:[
        {kind:'cove',a:[-3,3.15,6.58],b:[-1.2,3.15,6.58],n:[0,-1],c:'#bc8a55'},
        {kind:'under',a:[0.1,1.923,-6.165],b:[1,1.923,-6.165]},
        {kind:'kick',a:[4.2,0.107,3.935],b:[7,0.107,3.935],n:[0,1]},
        {kind:'cove',a:[-7.55,7.25,1.3],b:[-7.55,7.25,2.95],n:[1,0],c:'#bc8a55'},
        {kind:'under',a:[-6.035,6.108,-4.6],b:[-6.035,6.108,-2]},
        {kind:'kick',a:[-6.3,0.107,4.195],b:[-3.7,0.107,4.195],n:[0,-1]},
        {kind:'kick',a:[0.4,10.807,0.72],b:[2.3,10.807,0.72],n:[0,-1]},
        {kind:'spot',p:[-0.5,3.5,-4.8],t:[-0.5,1.55,-5.66],r:0.6},
        {kind:'spot',p:[-1.95,3.55,-5.2],t:[-1.95,1.225,-5.7],r:0.65}
      ],
      spawn:[2.1,0,5.1,Math.PI],exit:[2.1,6.55,.6],host:[-3,0,-1.1,.35],sun:[-.7,.8,.55],
      gifts:[[4.8,0,4.8,0],[-6.4,0,1.8,0],[5.5,0,-5.7,0],[0,4,4.5,0],[-.1,4,-4.2,0],[1.3,10.7,-4.8,0]],
      lights:[[7.45,1.728,3.45,'#ffd8ad',0.65,0.35],[-1.3,3.1,1.8,'#ffd8ad',1.05,0.5],[-2.2,6.8,1.9,'#ffd8ad',1.05,0.5],[7.4,7.4,0.2,'#ffd8ad',1,0.85],[8.6,9.9,-5.1,'#ffd8ad',0.95,0.85],[4.5,13.3,-3.8,'#ffd8ad',0.9,0.85]],
      spots:[
        {x:-1.8,y:0,z:-4.2,r:1.2,kind:'study',label:'讀讀星圖',name:'岳的星圖與地球儀書桌',lines:['湯還要煮一會兒，陪我讀一小題吧。','先認清圖上的方向，再慢慢找線索。','地球在轉，星空的位置也得配合時間看。'],alone:['星圖旁的地球儀停在海洋那一面。','書頁夾著便條：先看方向，想累了就喝湯。']},
        {x:-5.25,y:0,z:-4.36,r:1.1,kind:'hook:dex',label:'看看礦物',name:'分格礦物標本櫃',lines:['這些石頭各有脾氣，拿在手裡慢慢看。','顏色只是一條線索，硬度和條痕也有用。','先翻圖鑑，不急著替它取名字。'],alone:['標本下的小紙卡記著硬度與條痕。','櫃角的放大鏡被擦得很乾淨。']},
        {x:-5.15,y:0,z:-3.3,r:1.15,kind:'hook:soup',label:'喝口熱湯',name:'石砌壁爐上的玉米湯',lines:['你來啦……玉米湯還在爐上。','先讓手暖起來，今天的事可以慢慢說。','鍋蓋上的小水珠，是水氣冷卻凝結的。'],alone:['小鍋懸在爐火上，玉米與紅蘿蔔慢慢浮起。','藍色杯子留在手邊，像在等一位朋友。']},
        {x:-4,y:4,z:4.0,r:1.2,kind:'hook:notes',topic:'es-atmos',label:'讀讀雲圖',name:'老虎窗下的氣象觀察筆記',lines:['早上的雲像沒摺好的棉被，我畫在這裡。','看雲也記時間和風向，隔天才好比對。','門外的百葉箱照常量，我只把筆記帶上樓。'],alone:['窗下的筆記記著雲量、風向和觀測時間。','封面貼著小紙條：出門前看看天氣黑板。']},
        {x:-4,y:4,z:-1.8,r:1.2,kind:'look',label:'看看睡袋',name:'閣樓的格紋被與露營睡袋',lines:['今晚有雲也很好，早一點把被子攤開。','我留了一條乾的毛毯，山風來時用得上。','沒看完的星星，明晚還能接著看。'],alone:['格紋被攤得鬆鬆的，旁邊收著一卷睡袋。','床頭的觀察本合起來，今天到這裡就好。']},
        {x:3.25,y:10.7,z:-.1,r:1.3,kind:'look',label:'看看遠鏡',name:'屋頂平台的黃銅望遠鏡',lines:['扶著欄杆慢慢走，我把椅子留在旁邊。','星圖要對上日期和時刻，才找得到方向。','白天我把鏡頭蓋好，晚上再陪你看一會兒。'],alone:['大型黃銅鏡筒架在三腳架上，旁邊留著藍椅。','深藍星旗在欄杆旁，日期刻盤停在觀測頁。']}
      ],
      architecture:{levels:[0,4,10.7],landings:[2,7.35],stairs,windows:{groundArches:4,frontDormerArch:1,doorTransom:1},chimney:'左後側石砌煙囪',roofDeck:'右半部開放觀星平台',exteriorFunctionalProps:'百葉箱與天氣黑板留在外觀既有位置'}
    });
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
