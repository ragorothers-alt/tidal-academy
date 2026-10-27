/* 潮汐小島 · chinese 家的整棟室內（v7.6）：TA.ISLE.INTERIORS['chinese'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['chinese'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'chinese-moon-poetry-teahouse';
    const P = {
      plaster:kit.mat('#f3efe6',{},'plaster'), timber:kit.mat('#4a3a32',{},'wood'),
      cedar:kit.mat('#79614b',{},'wood'), floor:kit.mat('#b8a58b',{},'wood'), floorLight:kit.mat('#c2b29a',{},'wood'),
      roof:kit.mat('#3d4a6b',{},'fabric'), tile:kit.mat('#3d4a6b',{},'ceramic'), roofEdge:kit.mat('#53617d',{},'ceramic'),
      paper:kit.mat('#fff0cf',{},'paper'), ink:kit.mat('#2d2f35',{},'paper'), jade:kit.mat('#647b4f',{},'foliage'),
      bamboo:kit.mat('#94a773',{},'foliage'), plum:kit.mat('#e3a0b9',{},'foliage'), lilac:kit.mat('#ac88c5',{},'foliage'),
      stone:kit.mat('#c8c3b4',{},'stone'), water:kit.glass(),
      brass:kit.mat('#b99a61',{roughness:.36,metalness:.8},'metal'), cloth:kit.mat('#a5a5b0',{},'fabric'),
      linen:kit.mat('#fff0cf',{},'fabric'), pinkCloth:kit.mat('#e3a0b9',{},'fabric'), tatami:kit.mat('#94a773',{},'fabric'), tatamiEdge:kit.mat('#647b4f',{},'fabric'),
      ceramic:kit.mat('#fff0cf',{},'ceramic'), jadeGlaze:kit.mat('#647b4f',{},'ceramic'), blueGlaze:kit.mat('#3d4a6b',{},'ceramic'), tea:kit.mat('#2d2f35',{},'ceramic'),
      iron:kit.mat('#3d4a6b',{roughness:.36,metalness:.8},'metal'), bambooWood:kit.mat('#94a773',{},'wood'),
      whitePetal:kit.mat('#fff0cf',{},'foliage'), pollen:kit.mat('#b99a61',{},'foliage'), inkStone:kit.mat('#2d2f35',{},'stone'),
      brush:kit.mat('#fff0cf',{},'fabric'), artGrey:kit.mat('#a5a5b0',{},'paper'), seal:kit.mat('#ab645d',{},'stone'),
      lamp:kit.lamp('#ffd9a0')
    };
    // Repeated ceramics, scroll ends and leaf clusters share immutable primitive geometry.
    const primitiveCache=new Map();
    function primitive(type,args){const key=type+'/'+args.map(v=>typeof v==='number'?+v.toFixed(6):v).join('/');if(!primitiveCache.has(key))primitiveCache.set(key,new THREE[type](...args));return primitiveCache.get(key);}
    const cyl=(...a)=>primitive('CylinderGeometry',a), sph=(...a)=>primitive('SphereGeometry',a), tor=(...a)=>primitive('TorusGeometry',a), ico=(...a)=>primitive('IcosahedronGeometry',a), cone=(...a)=>primitive('ConeGeometry',a);
    const cube=new THREE.BoxGeometry(1,1,1);
    const roundedGeometry=new Map();
    function roundBox(w,h,d,r=.06){
      r=Math.min(r,w*.45,h*.45,d*.45);const key=[w,h,d,r].join('/');
      if(!roundedGeometry.has(key))roundedGeometry.set(key,kit.rbox(w,h,d,r));
      return roundedGeometry.get(key);
    }
    // Sky uniforms stay shared with the engine; a transparent pass does not cast a fake window shadow.
    const viewSource=kit.view(),windowView=viewSource.clone();windowView.uniforms=viewSource.uniforms;windowView.transparent=true;windowView.depthWrite=false;
    function add(geo,mat,x,y,z,ud){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);if(ud)Object.assign(o.userData,ud);g.add(o);return o;}
    function b(x,y,z,w,h,d,mat,solid=false){const o=add(cube,mat,x,y,z);o.scale.set(w,h,d);if(solid)o.userData.solid=true;return o;}
    function rod(a,c,r,mat,n=7){const A=new THREE.Vector3(...a),C=new THREE.Vector3(...c),v=C.clone().sub(A);const o=add(cyl(r,r,v.length(),n),mat,...A.add(C).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
    function orb(x,y,z,r,mat,sx=1,sy=1,sz=1){const o=add(ico(r,1),mat,x,y,z);o.scale.set(sx,sy,sz);return o;}
    function shape(points,depth,mat,x,y,z,a=0){const s=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));const o=add(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1}),mat,x,y,z);o.rotation.y=a;return o;}
    function quad(top,th,mat){
      if(new THREE.Vector3().crossVectors(new THREE.Vector3(...top[1]).sub(new THREE.Vector3(...top[0])),new THREE.Vector3(...top[2]).sub(new THREE.Vector3(...top[0]))).y<0)top=top.slice().reverse();
      const lower=top.map(p=>[p[0],p[1]-th,p[2]]),p=top.concat(lower),positions=[],uv=[];
      for(const f of [[0,1,2,3],[7,6,5,4],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]])for(const k of [0,1,2,0,2,3]){positions.push(...p[f[k]]);uv.push(p[f[k]][0]+p[f[k]][2],p[f[k]][1]);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return add(geo,mat,0,0,0);
    }
    const W=(x,z,a,u,y,d=0)=>[x+u*Math.cos(a)+d*Math.sin(a),y,z-u*Math.sin(a)+d*Math.cos(a)];
    const cols=[];
    // White plaster is one perforated surface, never a painted-on window. Door collision is segmented.
    function wall(x,z,a,w,y0,y1,holes=[]){
      const s=new THREE.Shape([new THREE.Vector2(-w/2,0),new THREE.Vector2(w/2,0),new THREE.Vector2(w/2,y1-y0),new THREE.Vector2(-w/2,y1-y0)]);
      for(const h of holes){const p=new THREE.Path();if(h.r)p.absarc(h.u,h.cy-y0,h.r,0,Math.PI*2,true);else{p.moveTo(h.u-h.w/2,h.b-y0);p.lineTo(h.u-h.w/2,h.b+h.h-y0);p.lineTo(h.u+h.w/2,h.b+h.h-y0);p.lineTo(h.u+h.w/2,h.b-y0);p.closePath();}s.holes.push(p);}
      const o=add(new THREE.ExtrudeGeometry(s,{depth:.32,bevelEnabled:false,curveSegments:24}),P.plaster,...W(x,z,a,0,y0,-.16));o.rotation.y=a;
      const door=holes.find(h=>h.door);
      if(!door)o.userData.solid=true;
      else for(const [u0,u1,lo,hi] of [[-w/2,door.u-door.w/2,y0,y1],[door.u+door.w/2,w/2,y0,y1],[door.u-door.w/2,door.u+door.w/2,door.b+door.h,y1]]){
        const q=b(...W(x,z,a,(u0+u1)/2,(lo+hi)/2),u1-u0,hi-lo,.32,P.plaster,true);q.rotation.y=a;q.visible=false;
      }
      for(const h of holes){
        if(h.door){for(const u of [h.u-h.w/2,h.u+h.w/2])rod(W(x,z,a,u,h.b,.2),W(x,z,a,u,h.b+h.h,.2),.09,P.timber);rod(W(x,z,a,h.u-h.w/2,h.b+h.h,.2),W(x,z,a,h.u+h.w/2,h.b+h.h,.2),.09,P.timber);continue;}
        const cy=h.r?h.cy:h.b+h.h/2,ww=h.r?h.r*2:h.w,hh=h.r?h.r*2:h.h;
        const v=add(new THREE.PlaneGeometry(ww+.65,hh+.65),windowView,...W(x,z,a,h.u,cy,-.53),{camThrough:true});v.rotation.y=a;
        const glass=add(h.r?new THREE.CircleGeometry(h.r,48):new THREE.PlaneGeometry(ww,hh),kit.glass(),...W(x,z,a,h.u,cy,.03),{camThrough:true});glass.rotation.y=a;
        if(h.r){
          const ring=add(tor(h.r+.025,.085,6,48),P.timber,...W(x,z,a,h.u,cy,.2));ring.rotation.y=a;
          const fine=add(tor(h.r-.065,.025,5,48),P.cedar,...W(x,z,a,h.u,cy,.24));fine.rotation.y=a;
          if(h.crescent){
            const pts=[],r=h.r-.1;for(let k=0;k<=24;k++){const ang=-1.25+k*2.5/24;pts.push(W(x,z,a,h.u-.36+r*Math.cos(ang),cy+r*Math.sin(ang),.26));}
            for(let k=1;k<pts.length;k++)rod(pts[k-1],pts[k],.028,P.cedar);
            // The crescent and the short lattice bars are analytically clipped to the circle.
            for(let j=-3;j<=3;j++){const yy=j*r*.22,edge=Math.sqrt(r*r-yy*yy),inner=-.36+edge;rod(W(x,z,a,h.u+inner,cy+yy,.27),W(x,z,a,h.u+edge,cy+yy,.27),.02,P.timber);}
            for(const t of [.3,.55,.8]){const u=r*t,y=Math.sqrt(r*r-u*u);rod(W(x,z,a,h.u+u,cy-y,.28),W(x,z,a,h.u+u,cy+y,.28),.017,P.cedar);}
          }else{
            rod(W(x,z,a,h.u,cy-h.r+.1,.25),W(x,z,a,h.u,cy+h.r-.1,.25),.028,P.timber);
            for(const yy of [-h.r*.35,h.r*.35]){const edge=Math.sqrt(h.r*h.r-yy*yy);rod(W(x,z,a,h.u-edge,cy+yy,.25),W(x,z,a,h.u+edge,cy+yy,.25),.025,P.cedar);}
          }
        }else{
          for(const u of [-ww/2,ww/2])rod(W(x,z,a,h.u+u,cy-hh/2,.2),W(x,z,a,h.u+u,cy+hh/2,.2),.065,P.timber);
          for(const yy of [-hh/2,hh/2])rod(W(x,z,a,h.u-ww/2,cy+yy,.2),W(x,z,a,h.u+ww/2,cy+yy,.2),.065,P.cedar);
          for(let j=-1;j<=1;j++)rod(W(x,z,a,h.u+j*ww*.25,cy-hh/2,.24),W(x,z,a,h.u+j*ww*.25,cy+hh/2,.24),.023,P.timber);
          for(const yy of [-hh*.2,hh*.2])rod(W(x,z,a,h.u-ww/2,cy+yy,.24),W(x,z,a,h.u+ww/2,cy+yy,.24),.023,P.cedar);
        }
        const sill=b(...W(x,z,a,h.u,cy-hh/2-.08,.13),ww+.3,.13,.5,P.cedar);sill.rotation.y=a;
      }
    }
    function floor(x,z,w,d,y,mat=P.floor){const o=b(x,y-.12,z,w,.24,d,mat);o.userData.walk=true;return o;}
    function rail(a,c,y){
      rod([a[0],y+1.03,a[1]],[c[0],y+1.03,c[1]],.06,P.timber);
      const n=Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/.32);
      for(let k=0;k<=n;k++){const x=a[0]+(c[0]-a[0])*k/n,z=a[1]+(c[1]-a[1])*k/n;b(x,y+.52,z,.055,1.04,.055,P.cedar);}
      b((a[0]+c[0])/2,y+.52,(a[1]+c[1])/2,Math.abs(c[0]-a[0])+.08,1.04,Math.abs(c[1]-a[1])+.08,P.timber,true).visible=false;
    }
    function ramp(a,c,width){
      const A=new THREE.Vector3(...a),C=new THREE.Vector3(...c),v=C.clone().sub(A),len=v.length();
      const side=new THREE.Vector3(v.z,0,-v.x).normalize().multiplyScalar(width/2),p=[A.clone().sub(side),A.clone().add(side),C.clone().add(side),C.clone().sub(side)];
      const normal=new THREE.Vector3().crossVectors(p[1].clone().sub(p[0]),p[2].clone().sub(p[0]));if(normal.y<0)p.reverse();
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,1,2,0,2,3].flatMap(i=>p[i].toArray()),3));geo.computeVertexNormals();
      const o=add(geo,P.floor,0,0,0,{walk:true});o.visible=false;return len;
    }
    function paperLamp(x,y,z){
      const o=add(sph(.29,12,8),P.lamp,x,y,z);o.scale.set(1,1.2,1);
      for(const dy of [-.31,.31])add(cyl(.12,.12,.06,8),P.timber,x,y+dy,z);
      for(const yy of [-.17,0,.17]){const q=add(tor(.29*Math.sqrt(1-(yy/.36)**2),.011,4,20),P.cedar,x,y+yy,z);q.rotation.x=Math.PI/2;}
      const ceiling=y<3?3.48:topY(Math.min(1,Math.abs(x)/6.8))-.2;
      rod([x,y+.35,z],[x,ceiling,z],.015,P.timber);rod([x,y-.35,z],[x,y-.62,z],.014,P.brass);add(cone(.07,.2,5),P.roof,x,y-.69,z);
    }
    function bamboo(x,y,z,s=1){
      add(cyl(.38*s,.28*s,.5*s,8),P.ceramic,x,y+.25*s,z);
      for(let j=0;j<4;j++){const dx=(j%2-.5)*.27*s,dz=(Math.floor(j/2)-.5)*.27*s,h=(1.7+j*.21)*s;rod([x+dx,y+.4*s,z+dz],[x+dx,y+h,z+dz],.035*s,P.bambooWood);for(let k=0;k<4;k++){const yy=y+(.7+k*.36)*s;b(x+dx,yy,z+dz,.09*s,.045*s,.09*s,P.bambooWood);orb(x+dx+((k+j)%2?1:-1)*.25*s,yy+.1*s,z+dz,.19*s,P.bamboo,1.9,.28,.6);}}
    }
    function plum(x,y,z){
      add(cyl(.23,.16,.5,8),P.ceramic,x,y+.25,z);rod([x,y+.45,z],[x-.12,y+1.6,z],.035,P.timber);
      for(let j=0;j<5;j++){const a=j*1.9,end=[x+Math.cos(a)*.45,y+.9+j*.16,z+Math.sin(a)*.25];rod([x-.05,y+.7+j*.15,z],end,.02,P.timber);orb(...end,.14,P.plum);orb(end[0]+.13,end[1]+.1,end[2],.1,P.lilac);}
    }
    function cup(x,y,z){add(cyl(.1,.07,.13,9),P.ceramic,x,y+.065,z);add(cyl(.076,.076,.008,9),P.tea,x,y+.133,z);}
    function tea(x,y,z,w=2.2,d=1.2){
      b(x,y+.46,z,w,.14,d,P.timber,true);for(const xx of [-w*.4,w*.4])for(const zz of [-d*.32,d*.32])b(x+xx,y+.21,z+zz,.14,.42,.14,P.cedar);
      b(x,y+.54,z,.9,.018,.6,P.cloth);orb(x-.1,y+.7,z,.18,P.jadeGlaze,1, .8,1);rod([x-.15,y+.68,z],[x-.4,y+.8,z],.055,P.jadeGlaze);add(tor(.13,.026,5,14),P.jadeGlaze,x+.08,y+.78,z).rotation.y=Math.PI/2;
      cup(x+.42,y+.55,z+.1);cup(x-.55,y+.55,z-.15);
    }
    function cushion(x,y,z,mat=P.cloth){add(roundBox(1,.26,.85,.1),mat,x,y+.13,z);add(roundBox(.84,.035,.7,.015),P.linen,x,y+.27,z);for(const dx of [-.34,.34])b(x+dx,y+.294,z,.035,.012,.61,P.roof);}
    function shelf(x,y,z,w=3){
      b(x,y+1.3,z,w,2.6,.5,P.timber,true);
      for(const yy of [.2,1,1.8,2.6]){b(x,y+yy,z+.3,w+.1,.1,.65,P.cedar);if(yy<2)for(let k=0;k<12;k++){const xx=x-w*.43+k*w*.078,h=.34+(k%5)*.065;
        if(k===4||k===10){vase(xx,y+yy+.06,z+.35,.65);continue;}
        const book=b(xx,y+yy+h/2+.06,z+.35,w*.058,h,.3,[P.paper,P.roof,P.cloth,P.paper][k%4]);book.rotation.z=k%4===0?.065:0;const pages=b(xx,y+yy+h+.048,z+.33,w*.044,.014,.23,P.paper);pages.rotation.z=book.rotation.z;b(xx,y+yy+.17,z+.51,w*.052,.025,.01,P.brass);
      }}
    }
    function scroll(x,y,z,w,h,a=0,mode=0){
      const panel=b(x,y,z,w,h,.045,P.paper);panel.rotation.y=a;
      for(const dy of [-h/2,h/2])rod(W(x,z,a,-w*.56,y+dy,.05),W(x,z,a,w*.56,y+dy,.05),.035,P.cedar);
      // Stroke-built 山/月 motifs and ink mountains: geometric art, no bitmap text.
      if(mode===0){
        const strokes=[[[-.32,.04],[-.32,-.4],[.32,-.4],[.32,.04]],[[0,.28],[0,-.38]],[[-.24,.53],[.24,.53],[.24,.94],[-.24,.94],[-.24,.53]],[[0,.56],[0,.9]]];
        for(const points of strokes)for(let k=1;k<points.length;k++)rod(W(x,z,a,points[k-1][0]*w,y+points[k-1][1]*h*.36,.04),W(x,z,a,points[k][0]*w,y+points[k][1]*h*.36,.04),.018,P.ink,5);
      }else{
        for(let j=0;j<3;j++){const u=-w*.4+j*w*.23,pts=[[u,-h*.28],[u+w*.26,h*(.03+j*.045)],[u+w*.52,-h*.28]];const q=W(x,z,a,0,y,.05+j*.024);shape(pts,.018,j%2?P.artGrey:P.ink,...q,a);}
        const ring=add(tor(w*.12,.025,4,18),P.ink,...W(x,z,a,w*.23,y+h*.29,.055));ring.rotation.y=a;
      }
      const seal=b(...W(x,z,a,w*.29,y-h*.35,.07),.16,.16,.025,P.seal);seal.rotation.y=a;
    }

    // The lower tea hall is wide; the inset second floor and the veranda read as separate tiers.
    floor(0,0,16,12,0);floor(0,7,16,2,0,P.cedar);
    wall(0,6.16,Math.PI,16,0,3.56,[{u:-2.8,b:0,w:2,h:2.85,door:true},{u:4.5,b:1.05,w:2.15,h:1.95},{u:-5.8,b:1.05,w:1.7,h:1.95}]);
    wall(0,-6.16,0,16,0,3.56,[{u:-3.5,b:1.1,w:2.1,h:1.8},{u:3.5,b:1.1,w:2.1,h:1.8}]);
    wall(-8.16,0,Math.PI/2,12,0,3.56,[{u:1.2,b:1.05,w:2.2,h:1.95}]);wall(8.16,0,-Math.PI/2,12,0,3.56,[{u:-1.2,b:1.05,w:2.2,h:1.95}]);
    b(2.8,1.42,6.3,1.94,2.84,.15,P.timber,true);for(let k=0;k<6;k++)b(2.04+k*.3,1.4,6.39,.02,2.5,.02,P.cedar);
    // Inset upper floor: explicit L-shaped stairwell and panelled undersides.
    floor(-2.15,-.25,8.7,9.5,3.8);floor(4.35,-2.9,4.3,4.2,3.8);floor(3.25,3.05,2.1,2.9,3.8);
    // Ceiling of the ground-floor wings, outside the inset upper volume.
    b(-7.25,3.64,0,1.5,.2,12,P.cedar);b(7.25,3.64,0,1.5,.2,12,P.cedar);b(0,3.64,-5.5,13,.2,1,P.cedar);b(0,3.64,5.25,13,.2,1.5,P.cedar);
    for(const z of [-5.6,-2.8,0,3,5.7])b(-2.2,3.46,z,11.4,.2,.16,P.timber);
    for(const x of [-7.85,-.4,7.85])b(x,3.4,0,.16,.2,12,P.timber);
    // Two flights: 10 x 19 cm steps each, 30.7 degree slopes and a 1.8 m landing.
    ramp([5.4,0,4.5],[5.4,1.9,1.3],1.8);floor(5.4,.4,1.8,1.8,1.9,P.cedar);ramp([5.4,1.9,.4],[2.2,3.8,.4],1.8);
    for(let k=0;k<10;k++){b(5.4,k*.19+.095,4.34-k*.32,1.8,.19,.32,P.cedar);b(5.24-k*.32,1.9+k*.19+.095,.4,.32,.19,1.8,P.cedar);}
    rod([6.25,.95,4.5],[6.25,2.85,1.3],.05,P.timber);rod([5.4,2.85,-.44],[2.2,4.75,-.44],.05,P.timber);
    for(let k=0;k<=4;k++){const t=k/4;rod([6.25,1.9*t,4.5-3.2*t],[6.25,.95+1.9*t,4.5-3.2*t],.035,P.cedar);rod([5.4-3.2*t,1.9+1.9*t,-.44],[5.4-3.2*t,2.85+1.9*t,-.44],.035,P.cedar);}
    rail([2.2,-.8],[6.4,-.8],3.8);rail([4.36,1.6],[4.36,4.45],3.8);rail([2.2,1.6],[4.36,1.6],3.8);rail([6.4,-.8],[6.4,4.45],3.8);
    // Upper moon room: larger front crescent, smaller rear moon and one right-side lattice window.
    wall(0,4.66,Math.PI,13,3.8,7.2,[{u:1.8,cy:5.68,r:1.45,crescent:true}]);
    wall(0,-5.16,0,13,3.8,7.2,[{u:1,cy:5.8,r:1.17}]);
    wall(-6.66,-.25,Math.PI/2,9.5,3.8,7.2);wall(6.66,-.25,-Math.PI/2,9.5,3.8,7.2,[{u:-.65,b:4.8,w:1.85,h:1.7}]);
    for(const z of [-5.16,4.34])shape([[-6.5,0],[6.5,0],[0,1.9]],.32,P.plaster,0,7.2,z);
    function topY(t){return 9.1-2.15*t+.25*t**7;}
    for(const sign of [-1,1])for(let j=0;j<8;j++){const t0=j/8,t1=(j+1)/8;quad([[sign*6.8*t0,topY(t0),-5.5],[sign*6.8*t0,topY(t0),5],[sign*6.8*t1,topY(t1),5],[sign*6.8*t1,topY(t1),-5.5]],.18,P.tile);}
    // Lower eaves curl upward and expose their dark rafter tails over the front veranda.
    for(const front of [-1,1])for(let j=0;j<5;j++){const z0=(front>0?4.6:-5.2)+front*j*.68,z1=z0+front*.68,y0=3.85-.15*j+.027*j*j,y1=3.85-.15*(j+1)+.027*(j+1)*(j+1);quad([[-8.6,y0,z0],[8.6,y0,z0],[8.6,y1,z1],[-8.6,y1,z1]],.16,P.tile);}
    for(const x of [-7.7,-6,-.3,6,7.7])for(const z of [-5.8,6.6,7.6])b(x,3.38,z,.14,.16,1.1,P.timber);
    for(const z of [-5.05,-2.2,1.1,4.5])for(const sign of [-1,1]){const points=[];for(let j=0;j<=8;j++)points.push([sign*6.5*j/8,topY(j/8)-.18,z]);for(let j=1;j<points.length;j++)rod(points[j-1],points[j],.095,P.cedar);}
    rod([0,8.9,-5.1],[0,8.9,4.6],.13,P.timber);
    // Framed plaster, low cedar panelling and precise plank/tatami seams.
    for(const z of [-6,6]){b(0,3.35,z,16,.16,.16,P.timber);for(const x of [-7.8,-.7,7.8])b(x,1.7,z,.16,3.4,.16,P.timber);}
    for(const x of [-7.98,7.98]){b(x,.7,0,.07,.12,11.8,P.cedar);b(x,3.34,0,.12,.16,11.8,P.timber);}
    for(const z of [-5.02,4.52]){b(0,7.08,z,13,.16,.16,P.timber);for(const x of [-6.4,6.4])b(x,5.5,z,.14,3.4,.14,P.timber);b(0,8.05,z,.14,1.7,.14,P.timber);}
    for(let k=0;k<32;k++)b(-7.8+k*.5,.008,0,.014,.012,11.8,P.cedar);
    for(let k=0;k<19;k++){const z=-4.8+k*.5;b(-2.15,3.808,z,8.5,.012,.014,P.cedar);if(z<-.8)b(4.35,3.808,z,4.15,.012,.014,P.cedar);}
    // Ground-floor tea salon: low furniture, generous aisles, poetry gallery and ink-washing corner.
    b(-3.3,.025,2.5,5,.05,4.4,P.tatami);for(const x of [-5.7,-3.3,-.9])b(x,.056,2.5,.04,.012,4.3,P.tatamiEdge);for(const z of [.4,2.5,4.6])b(-3.3,.056,z,4.8,.012,.04,P.tatamiEdge);
    tea(-3.3,0,2.4,2.6,1.4);cushion(-3.3,0,3.9);cushion(-4.9,0,2.4);cushion(-3.3,0,.8);plum(-6.5,0,4.9);
    shelf(-4.5,0,-5.65,4.2);scroll(-1.1,2,-5.94,1.1,2.15,0,0);scroll(-7.94,2.1,-3.1,1.8,1.95,Math.PI/2,1);b(-6.5,.3,-3.2,1.3,.6,1,P.cedar,true);b(-6.5,.64,-3.2,1.4,.08,1.08,P.cedar);
    b(3.4,.45,-5.4,4,.9,1,P.timber,true);b(3.4,.96,-5.4,4.15,.12,1.1,P.stone);add(cyl(.48,.4,.22,16),P.stone,2.5,1.1,-5.4);add(cyl(.42,.42,.02,16),P.water,2.5,1.22,-5.4);rod([2.5,1.3,-5.8],[2.5,1.52,-5.8],.04,P.bambooWood);rod([2.5,1.52,-5.8],[2.5,1.52,-5.5],.04,P.bambooWood);
    for(let k=0;k<5;k++){b(3.6+k*.3,1.1,-5.4,.17,.2,.22,P.ceramic);rod([3.6+k*.3,1.18,-5.4],[3.6+k*.3,1.65,-5.45],.017,P.timber);}
    for(const x of [1.9,2.9,3.9,4.9]){b(x,.46,-4.885,.85,.67,.025,P.cedar);b(x,.61,-4.85,.25,.035,.05,P.brass);}
    bamboo(7,0,-3.6,.85);scroll(7.97,2.1,2.2,1.3,2,-Math.PI/2,1);
    // Veranda: three hanging poem cloths, bamboo, stone water bowl, paper lanterns and wisteria.
    for(const x of [-7.8,-.5,7.8]){b(x,1.7,7.8,.18,3.4,.18,P.timber,true);b(x,3.25,7.8,.55,.16,.35,P.cedar);}
    for(const x of [-5.8,-4.3,-2.8])scroll(x,2,7.82,.85,1.7,Math.PI,1);
    tea(-4.3,0,7.05,2.8,.9);bamboo(7,0,7.1,.8);add(cyl(.48,.35,.4,12),P.stone,-7,.2,6.9);add(cyl(.42,.42,.02,12),P.water,-7,.41,6.9);
    for(let k=0;k<9;k++){orb(-7.7+k*.3,3.3,7.9,.26,P.jade,1,.4,1);for(let j=0;j<5;j++)orb(-7.7+k*.3,3-j*.17,7.9,.115-j*.013,j%2?P.lilac:P.plum,.9,1.3,.9);}
    // Upper studio: moon-view tea, manuscript desk, scroll cabinet and a cat-sized resting nook.
    b(-2.1,3.825,2.1,4.7,.05,3.7,P.tatami);for(const x of [-4.3,-2.1,.1])b(x,3.855,2.1,.035,.012,3.6,P.tatamiEdge);
    tea(-2.1,3.8,2.65,2.6,1.25);cushion(-3.8,3.8,2.6);cushion(-2.1,3.8,1.2);plum(-5.25,3.8,3.8);
    b(2.7,4.63,-3.7,3.9,.16,1.5,P.timber,true);for(const x of [1.15,4.25])for(const z of [-4.25,-3.15])b(x,4.2,z,.13,.8,.13,P.cedar);
    b(2.4,4.73,-3.7,1.7,.025,1,P.paper);b(3.95,4.75,-3.65,.6,.09,.4,P.inkStone);rod([2,4.8,-3.6],[2.8,4.82,-3.8],.025,P.timber);b(2.4,4.755,-3.6,.18,.018,.13,P.seal);cup(1.2,4.72,-3.7);cushion(2.7,3.8,-2.3,P.roof);
    shelf(-4.5,3.8,-4.65,3.4);scroll(-1.7,5.65,-4.94,1.2,2.2,0,0);scroll(-6.45,5.7,-.3,1.8,2.2,Math.PI/2,1);
    b(-5.25,3.98,-1.7,1.7,.36,2.5,P.cloth);b(-5.25,4.2,-2.45,1.3,.16,.65,P.linen);bamboo(5.8,3.8,-4.25,.68);
    // Second dressing pass: ink-blue textiles, bound poetry, plum ceramics, and a working ink desk.
    const roundGeos=new Map();
    function soft(x,y,z,w,h,d,mat,r=.06,solid=false){r=Math.min(r,w*.45,h*.45,d*.45);const key=[w,h,d,r].join('/');if(!roundGeos.has(key))roundGeos.set(key,roundBox(w,h,d,r));const q=add(roundGeos.get(key),mat,x,y,z);if(solid)q.userData.solid=true;return q;}
    function ring(x,y,z,r,mat,vertical=false){const o=add(tor(r,.013,3,10),mat,x,y,z);if(!vertical)o.rotation.x=Math.PI/2;return o;}
    function volume(x,y,z,w=.55,angle=0){
      const start=g.children.length;b(x,y+.055,z,w,.11,.36,P.roof);b(x,y+.055,z+.184,w*.92,.06,.012,P.paper);
      for(const dx of [-w*.35,-w*.12,w*.12,w*.35]){b(x+dx,y+.115,z-.1,.02,.012,.11,P.paper);rod([x+dx,y+.075,z-.19],[x+dx,y+.12,z-.1],.008,P.linen,4);}
      if(angle){const group=new THREE.Group();group.position.set(x,y,z);g.add(group);for(const o of g.children.slice(start,-1)){o.position.sub(group.position);group.add(o);}group.rotation.y=angle;}
    }
    function bookPile(x,y,z,n=4){for(let j=0;j<n;j++)volume(x,y+j*.13,z,.55+(j%2)*.08,j%2?.08:-.04);}
    function rolled(x,y,z,n=3){for(let j=0;j<n;j++){const xx=x+(j%2)*.17,yy=y+.07+Math.floor(j/2)*.14;const o=add(cyl(.065,.065,.62,10),P.paper,xx,yy,z);o.rotation.z=Math.PI/2;for(const dx of [-.19,.19]){const q=add(cyl(.069,.069,.025,8),P.roof,xx+dx,yy,z);q.rotation.z=Math.PI/2;}for(const dx of [-.32,.32]){const q=ring(xx+dx,yy,z,.04,P.cedar,true);q.rotation.y=Math.PI/2;}}}
    function vase(x,y,z,s=1){
      const q=add(sph(.22,10,6),P.ceramic,x,y+.25*s,z);q.scale.set(.85*s,1.2*s,.85*s);
      add(cyl(.09*s,.12*s,.2*s,10),P.ceramic,x,y+.5*s,z);ring(x,y+.6*s,z,.09*s,P.blueGlaze);
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5;const mark=add(ico(.04,0),P.blueGlaze,x+Math.cos(a)*.18*s,y+(.19+(k%3)*.06)*s,z+Math.sin(a)*.18*s);mark.scale.set(s,s*.6,s*.4);}
    }
    function trailing(x,y,z){for(let j=0;j<9;j++){const xx=x+Math.sin(j*1.3)*.16;rod([xx,y-j*.12,z],[x+Math.sin((j+1)*1.3)*.16,y-(j+1)*.12,z],.012,P.jade,5);orb(xx+.1*(j%2?1:-1),y-j*.12,z,.1,j%2?P.bamboo:P.jade,1.4,.35,.65);}}
    function chest(x,y,z,w=1){soft(x,y+.3,z,w,.6,.65,P.cedar,.045,true);soft(x,y+.65,z,w+.04,.1,.68,P.timber,.03);for(const dx of [-w*.34,w*.34])b(x+dx,y+.36,z+.334,.06,.6,.025,P.iron);b(x,y+.5,z+.35,.15,.14,.025,P.brass);ring(x,y+.46,z+.38,.06,P.brass,true);}
    function basket(x,y,z){add(cyl(.32,.26,.42,10),P.cedar,x,y+.21,z);for(let j=0;j<5;j++)ring(x,y+.04+j*.08,z,.27+j*.012,P.bambooWood);const h=ring(x,y+.46,z,.3,P.timber,true);h.scale.y=.6;rolled(x-.1,y+.4,z,3);}
    function teaRunner(x,y,z,w,d){
      soft(x,y,z,w,.018,d,P.roof,.008);for(const s of [-1,1]){b(x,y-.16,z+s*d/2,w,.32,.014,P.roof);for(let j=0;j<6;j++)rod([x-w*.43+j*w*.17,y-.31,z+s*d/2],[x-w*.43+j*w*.17,y-.41,z+s*d/2],.01,P.linen,4);}
      for(let j=0;j<5;j++)rod([x-w*.3,y+.014,z-d*.4+j*d*.2],[x+w*.3,y+.014,z-d*.31+j*d*.2],.009,P.pinkCloth,5);
    }
    function matBorder(x,y,z,w,d){
      soft(x,y+.008,z,w,.018,d,P.roof,.015);soft(x,y+.022,z,w-.17,.012,d-.17,P.tatami,.01);
      for(let j=0;j<Math.floor(d/.11);j++)b(x,y+.032,z-d/2+.11+j*.11,w-.23,.008,.018,P.tatamiEdge);
      for(const s of [-1,1])for(let k=0;k<12;k++)b(x-w*.45+k*w*.081,y+.02,z+s*(d/2+.06),.025,.015,.13,P.linen);
    }
    function curtain(x,z,a,u,bottom,w,h){
      rod(W(x,z,a,u-w*.69,bottom+h+.14,.32),W(x,z,a,u+w*.69,bottom+h+.14,.32),.026,P.timber);
      for(const sign of [-1,1])for(let j=0;j<4;j++){
        const q=soft(...W(x,z,a,u+sign*(w*.59+j*.05),bottom+h/2,.3+j%2*.025),.115,h,.08,j%3===0?P.linen:P.roof,.025);q.rotation.y=a;
        const tie=b(...W(x,z,a,u+sign*(w*.59+j*.05),bottom+h*.34,.37),.12,.045,.045,P.brass);tie.rotation.y=a;
      }
    }
    // Timber infill and cedar wainscot stop below the existing window holes.
    for(const y0 of [0,3.8]){
      const xl=y0===0?7.96:6.48,zl=y0===0?-5.97:-4.97,zf=y0===0?5.97:4.48,width=y0===0?15.8:12.8;
      for(const x of [-xl,xl]){
        b(x,y0+.12,-.3,.1,.15,y0===0?11.7:9.3,P.timber);b(x,y0+.81,-.3,.1,.11,y0===0?11.7:9.3,P.cedar);
        for(let j=0;j<(y0===0?36:28);j++)b(x,y0+.43,(y0===0?-5.7:-4.6)+j*.33,.085,.62,.035,P.cedar);
        for(const z of [-3.5,.2,3.5]){b(x,y0+1.72,z,.15,3.38,.15,P.timber);rod([x,y0+2.75,z],[x,y0+3.28,z+.66],.06,P.cedar);}
      }
      for(const z of [zl,zf])for(const x of [-5.65,-.1,5.8]){
        if(y0===0&&z===zf&&x===5.8)continue;
        b(x,y0+.12,z,1.2,.15,.1,P.timber);b(x,y0+.8,z,1.2,.09,.1,P.cedar);for(let j=0;j<5;j++)b(x-.5+j*.25,y0+.43,z,.035,.62,.07,P.cedar);
      }
      for(const z of [zl,zf])b(0,y0+3.25,z,width,.13,.13,P.timber);
    }
    // Ceiling planks read as timber rather than the exterior roof finish alone.
    for(let j=0;j<31;j++)b(-7.5+j*.5,3.68,-.25,.018,.02,11.4,P.floor);
    for(const sign of [-1,1])for(let j=1;j<19;j++){
      const x=sign*j*.35,t=Math.abs(x)/6.8,q=b(x,topY(t)-.19,-.2,.035,.028,10,P.cedar);q.rotation.z=-sign*.29;
    }
    for(const z of [-4.85,4.42])for(const side of [-1,1])rod([side*6.32,6.3,z],[side*4.4,7.13,z],.085,P.timber);
    // Moon studio uses two slim drapes outside its full circular aperture.
    curtain(0,4.66,Math.PI,1.8,4.2,2.9,2.95);curtain(0,-5.16,0,1,4.63,2.34,2.34);
    curtain(0,-6.16,0,-3.5,1.15,2.1,1.8);curtain(0,-6.16,0,3.5,1.15,2.1,1.8);
    curtain(0,6.16,Math.PI,4.5,1.1,2.15,1.95);curtain(8.16,0,-Math.PI/2,-1.2,1.1,2.2,1.95);
    // Tie cords and tassels belong to every existing poem hanging.
    for(const [x,y,z,w,h,a] of [[-1.1,2,-5.94,1.1,2.15,0],[-7.94,2.1,-3.1,1.8,1.95,Math.PI/2],[7.97,2.1,2.2,1.3,2,-Math.PI/2],[-1.7,5.65,-4.94,1.2,2.2,0],[-6.45,5.7,-.3,1.8,2.2,Math.PI/2]]){
      for(const sign of [-1,1]){
        rod(W(x,z,a,sign*w*.45,y+h/2,.08),W(x,z,a,0,y+h/2+.24,.08),.01,P.timber,4);
        rod(W(x,z,a,sign*w*.36,y-h/2,.08),W(x,z,a,sign*w*.36,y-h/2-.16,.08),.009,P.brass,4);
        add(cone(.04,.14,5),P.roof,...W(x,z,a,sign*w*.36,y-h/2-.23,.08));
      }
    }
    // The tea salon is populated at table height with restrained plum-petal accents.
    matBorder(-3.3,.063,2.5,5.05,4.45);teaRunner(-3.3,.554,2.4,.68,1.42);
    // The jade tea pots now have lids, knobs, separate spouts and saucers.
    for(const [x,y,z] of [[-3.4,.7,2.4],[-2.2,4.5,2.65],[-4.4,.7,7.05]]){
      add(cyl(.13,.16,.035,10),P.jadeGlaze,x,y+.15,z);orb(x,y+.2,z,.045,P.blueGlaze);
      const spout=add(cone(.045,.15,8),P.jadeGlaze,x-.36,y+.13,z);spout.rotation.z=-.75;
      ring(x,y+.02,z,.2,P.jadeGlaze);
    }
    b(-3.3,.58,2.4,1.5,.06,.65,P.cedar);cup(-3.85,.62,2.6);cup(-2.8,.62,2.5);bookPile(-4.15,.56,2.13,2);
    for(let j=0;j<7;j++)orb(-4.1+j*.22,.58,2.82+Math.sin(j)*.12,.035,P.plum,1,.25,1.5);
    // Console storage beside the moon: books, rolls, vase and negative space inside the aperture.
    b(-1.8,4.15,4.04,4.6,.68,.52,P.timber,true).visible=false;b(-1.8,4.53,4.04,4.75,.12,.63,P.cedar);
    b(-1.8,4.15,4.28,4.6,.68,.07,P.timber);b(-1.8,3.84,4.04,4.6,.08,.53,P.cedar);
    for(const x of [-3.9,-2.3,-.7,.3])b(x,4.15,4.04,.07,.68,.5,P.cedar);
    rolled(-3.25,3.84,4.1,5);bookPile(-1.55,3.84,4.1,4);rolled(-.4,3.84,4.1,3);vase(-.1,4.6,4.05,.75);
    // Low window bench in the ground hall, filled rather than a bare block.
    b(-4.55,.38,5.35,4.8,.76,.62,P.timber,true).visible=false;b(-4.55,.8,5.35,4.95,.12,.72,P.cedar);
    b(-4.55,.38,5.63,4.8,.76,.06,P.timber);b(-4.55,.025,5.35,4.8,.05,.62,P.cedar);
    for(const x of [-6.7,-5.25,-3.8,-2.4])b(x,.4,5.35,.065,.72,.64,P.cedar);
    rolled(-6.2,.05,5.35,5);bookPile(-4.9,.05,5.35,4);rolled(-3.4,.05,5.35,4);vase(-2.6,.87,5.35,.85);bookPile(-5.6,.87,5.35,3);
    for(const [x,y,z] of [[-4.5,2.66,-5.65],[-4.5,6.46,-4.65]]){
      vase(x-.8,y,z,.8);bookPile(x+.25,y,z,3);trailing(x+.9,y+.1,z+.35);
      for(const yy of [y-2.38,y-1.58,y-.78]){rolled(x+.9,yy,z+.35,4);vase(x-.45,yy,z+.35,.55);}
    }
    plum(-7.3,.87,5.35);vase(-6.5,.7,-3.2,.85);bookPile(-6.45,.73,-3.2,2);
    // Individually readable five-petal plum blossoms instead of oversized berry clusters.
    for(const [x,y,z] of [[-6.5,0,4.9],[-5.25,3.8,3.8],[-7.3,.87,5.35]])for(let j=0;j<5;j++){
      const a=j*1.9,xx=x+Math.cos(a)*.45,yy=y+.9+j*.16,zz=z+Math.sin(a)*.25;
      for(let k=0;k<5;k++){const t=k*Math.PI*2/5;const petal=add(ico(.065,0),P.whitePetal,xx+Math.cos(t)*.09,yy+Math.sin(t)*.09,zz+.08);petal.scale.z=.5;}add(ico(.035,0),P.pollen,xx,yy,zz+.12);
    }
    // Author's tools: angled brush tips, brush rest, ink stick, water dropper and red seal paste.
    for(const [x,y,z] of [[2.7,4.74,-3.7],[4.6,1.03,-5.35]]){
      add(cyl(.13,.1,.3,9),P.cedar,x+.6,y+.15,z-.2);
      for(let j=0;j<5;j++){const end=[x+.44+j*.075,y+.66+(j%3)*.07,z-.24];rod([x+.6,y+.2,z-.2],end,.014,P.timber,6);rod(end,[end[0]-.035,end[1]+.11,end[2]],.025,P.brush,6);add(cone(.024,.1,6),P.inkStone,end[0]-.035,end[1]+.2,end[2]);}
      soft(x-.5,y+.025,z-.35,.55,.05,.25,P.inkStone,.025);b(x-.5,y+.06,z-.35,.32,.02,.12,P.inkStone);
      b(x-.25,y+.045,z+.2,.3,.09,.15,P.cedar);b(x-.25,y+.1,z+.2,.23,.018,.1,P.seal);vase(x+.95,y,z+.2,.28);
      rolled(x-.75,y,z+.17,2);b(x+.1,y+.025,z-.31,.65,.04,.09,P.stone);bookPile(x+1.2,y,z-.1,3);
    }
    teaRunner(3.3,4.734,-3.7,.43,1.52);
    matBorder(-2.1,3.862,2.1,4.75,3.75);teaRunner(-2.1,4.354,2.65,.68,1.28);bookPile(-2.85,4.36,2.65,2);cup(-1.4,4.36,2.7);
    // The resting nook now has a full bed silhouette rather than a single slab.
    soft(-5.25,4.08,-1.7,1.72,.32,2.45,P.linen,.1,true);soft(-5.25,4.27,-1.38,1.76,.16,1.62,P.roof,.07);
    soft(-5.25,4.38,-.82,1.78,.13,.55,P.cloth,.045);b(-5.25,4.36,-2.94,1.88,1.08,.14,P.cedar,true);
    for(const x of [-5.65,-4.85]){soft(x,4.37,-2.45,.65,.23,.52,P.linen,.1);b(x,4.495,-2.45,.43,.012,.035,P.pinkCloth);}
    for(let j=0;j<8;j++)b(-5.95+j*.2,4.36,-.57,.025,.035,.15,P.linen);
    b(-5.25,4.12,-1.7,1.78,.64,2.5,P.cloth,true).visible=false;
    chest(-6.02,3.8,-3.7,.72);basket(-6.05,3.8,1.75);basket(-7.1,0,-5.2);
    // Additional poem alcove on the left wall and tea storage keep perimeter bays lived in.
    scroll(-7.94,2.15,.1,1.1,1.85,Math.PI/2,0);scroll(6.48,5.7,-3.2,1,1.8,-Math.PI/2,1);
    b(7.55,.53,-.5,.65,1.06,1.45,P.cedar,true);vase(7.55,1.1,-.5,.8);rolled(7.55,1.1,-.8,4);
    for(const y of [1.95,2.76]){b(3.4,y,-5.92,3.9,.1,.36,P.cedar);for(let j=0;j<6;j++)if(j%2)vase(1.9+j*.6,y+.06,-5.88,.6);else bookPile(1.9+j*.6,y+.06,-5.88,2);}
    chest(-6.9,0,2.65,.75);trailing(-6.85,3.25,-4.9);trailing(6.4,6.95,-3.8);
    // Hanging poem cloths have dark borders, tassels and a pair of bamboo stem motifs.
    for(const x of [-5.8,-4.3,-2.8])for(const dx of [-.29,.29]){rod([x+dx,1.15,7.77],[x+dx,.92,7.77],.012,P.brass,5);add(cone(.045,.16,5),P.roof,x+dx,.85,7.77);}
    for(const x of [-.6,.6]){rod([x+.05,2.85,5.95],[x+.05,2.45,5.95],.012,P.brass,4);soft(x,2.05,5.94,.55,1.05,.04,P.roof,.02);for(let j=0;j<4;j++)b(x,1.65+j*.25,5.91,.32,.025,.018,P.linen);}
    [[-3.3,2.7,2.4],[-3.6,2.7,-3.6],[-2.1,6.45,2.45],[2.9,6.45,-3.35],[5,6.35,.4],[-4.3,2.7,7.05]].forEach(p=>paperLamp(...p));

    // Third pass: connected poetry, tea and reading vignettes occupy the room itself.
    // The central north/south aisle, every interaction and all five gift squares stay open.
    function cabinet(x,y,z,w,d,h=.82){
      soft(x,y+h/2,z,w,h,d,P.cedar,.065,true);
      soft(x,y+h+.065,z,w+.08,.13,d+.08,P.timber,.035);
      for(const dx of [-w*.34,0,w*.34]){
        soft(x+dx,y+h*.52,z+d/2+.017,w*.29,h*.7,.035,P.floor,.017);
        b(x+dx,y+h*.64,z+d/2+.045,.16,.035,.045,P.brass);
      }
      for(const dx of [-w*.4,w*.4])b(x+dx,y+.09,z,.12,.18,d*.8,P.timber);
      return y+h+.13;
    }
    function settee(x,y,z,w,d,side=0){
      soft(x,y+.3,z,w,.6,d,P.timber,.08,true);
      soft(x,y+.66,z,w-.12,.22,d-.12,P.cloth,.1);
      soft(x,y+.94,z-d*.42,w-.12,.55,.18,P.cedar,.07,true);
      for(const dx of [-w*.33,w*.33]){
        const q=soft(x+dx,y+.91,z-d*.15,w*.31,.32,d*.45,P.linen,.1);q.rotation.z=dx>0?-.06:.08;
        b(x+dx,y+1.074,z-d*.15,w*.23,.015,.035,P.pinkCloth);
      }
      if(side)soft(x+side*w*.45,y+.83,z,.16,.35,d*.92,P.cedar,.06,true);
    }
    function readingTable(x,y,z,w,d){
      soft(x,y+.64,z,w,.14,d,P.cedar,.065,true);
      soft(x,y+.3,z,w-.3,.5,d-.22,P.timber,.05,true);
      teaRunner(x,y+.72,z,w*.3,d*.85);bookPile(x-w*.25,y+.72,z,3);
      rolled(x+w*.25,y+.72,z-.12,3);cup(x+w*.22,y+.72,z+d*.25);
    }
    function plantStand(x,y,z,w=1.1){
      const h=cabinet(x,y,z,w,.78,.58);vase(x-.25,y+h,z,.8);plum(x+.18,y+h,z);
      bookPile(x-.12,y+.02,z+.405,2);
    }
    // Grey-washed cedar boards alternate subtly; seams remain below the density threshold.
    for(let j=0;j<16;j++)b(-7.5+j,0.018,0,.48,.02,11.8,j%3===0?P.floorLight:P.floor);
    for(let j=0;j<9;j++)b(-6.05+j,3.82,-.25,.48,.02,9.3,j%3===0?P.floorLight:P.floor);
    // West: an upholstered reading nook, footrest, book cabinet, rolled manuscripts and plum pot.
    settee(-5.1,0,-.75,2,2.25,-1);
    soft(-5.4,.17,.97,1.55,.34,.78,P.roof,.1);bookPile(-6.35,.77,-.6,3);
    const bookTop=cabinet(-3.4,0,-1.45,1.18,2.0,1.04);
    for(const z of [-2.1,-1.4,-.7]){bookPile(-3.42,bookTop,z,4);rolled(-3.15,bookTop,z+.17,3);}
    vase(-3.55,bookTop,-.65,.8);plantStand(-7.25,0,-1.55,.9);
    // Middle: a proper communal manuscript island and a low tea library at its south edge.
    readingTable(1.9,0,-.85,2.9,2.45);
    settee(1.5,0,1.3,1.8,.95);   // 縮短往左：入口正前方留走道vase(3.03,.72,-.95,.7);
    const southTop=cabinet(.6,0,.45,1.4,.72,.62);
    bookPile(.15,southTop,.45,3);rolled(.75,southTop,.45,4);vase(1.08,southTop,.45,.6);
    // East: tea jars and a bamboo bench, clear of both stair flights and the ink-washing spot.
    const eastTop=cabinet(5.8,0,-2.45,2.45,1.65,.72);
    for(const x of [5.05,5.8,6.55]){vase(x,eastTop,-2.65,.85);rolled(x-.13,eastTop,-2.05,3);}
    settee(7.22,0,1.65,.85,2.75);basket(7.3,0,3.65);
    const entryTop=cabinet(1.05,0,4.8,1.4,1.1,.72);rolled(.68,entryTop,4.8,5);vase(1.43,entryTop,4.8,.8);
    const rearTop=cabinet(.3,0,-5.25,1.35,.9,.8);bookPile(.05,rearTop,-5.2,3);vase(.7,rearTop,-5.2,.7);
    // The tea salon seats face the existing table instead of hugging the wall.
    settee(-5.55,0,3.75,1.55,1.35);basket(-5.85,0,2.17);
    soft(-3.3,.19,3.95,1.25,.38,.98,P.linen,.1);soft(-3.3,.19,.8,1.25,.38,.98,P.cloth,.1);
    // Veranda: tea preparation, travel scrolls and a waiting bench frame the central door aisle.
    settee(-.4,0,7.14,2.6,1.12);bookPile(-1.25,.78,7.13,3);
    const porchTop=cabinet(5.15,0,7.1,2.45,1.3,.78);
    teaRunner(5.15,porchTop,7.1,.6,1.08);vase(4.38,porchTop,7.1,.8);rolled(5.85,porchTop,7.1,5);cup(5.05,porchTop,7.2);
    soft(-5.05,.18,6.18,1.15,.36,.65,P.cloth,.1);soft(-3.45,.18,7.68,1.15,.36,.55,P.linen,.1);
    // Upper manuscript library: a low central scroll island, reading bed-seat and moon cabinet.
    const upperTop=cabinet(-2.35,3.8,-2.35,2.45,2.55,.82);
    teaRunner(-2.35,upperTop,-2.35,.68,2.2);bookPile(-3.05,upperTop,-2.9,5);rolled(-1.65,upperTop,-2.65,6);
    vase(-3.05,upperTop,-1.85,.75);cup(-1.7,upperTop,-1.85);
    settee(-5.3,3.8,2.2,1.7,1.65,-1);bookPile(-5.8,4.58,2.25,3);
    const moonTop=cabinet(3.35,3.8,3.83,1.6,.9,.72);
    rolled(2.95,moonTop,3.83,5);vase(3.75,moonTop,3.83,.85);
    plantStand(.8,3.8,3.65,1.65);
    // Small grouped accessories reinforce real storage rather than flat floor decoration.
    chest(-3.45,3.8,-.74,.9);basket(-1.3,3.8,-3.9);chest(5.65,3.8,-2,.8);
    for(const [x,y,z] of [[-5.85,0,2.17],[7.3,0,3.65],[-1.3,3.8,-3.9]]){
      const o=b(x,y+.29,z,.68,.58,.64,P.cedar,true);o.visible=false;
    }

    // Under-stair tea stock uses the otherwise dead space beneath the upper flight.
    const stairTop=cabinet(5.15,0,-.1,2.45,1.05,.75);
    rolled(4.48,stairTop,-.1,5);bookPile(5.2,stairTop,-.1,3);vase(5.92,stairTop,-.1,.65);
    // A low padded brush-washing stool keeps this cross-aisle fully walkable.
    soft(1.55,.18,-3.6,1.15,.36,.86,P.cloth,.1);
    b(1.55,.365,-3.6,.82,.012,.035,P.pinkCloth);
    // This moon-room sideboard leaves a 1.9 m cross-aisle north of the tea seat.
    const sideTop=cabinet(-.4,3.8,1.3,1.25,1.0,.66);
    rolled(-.65,sideTop,1.3,4);vase(-.05,sideTop,1.3,.85);

    // Bound-manuscript chest and desk stool trim the study bay without entering its clear squares.
    chest(-.65,3.8,-1.9,.65);rolled(-.83,4.51,-1.9,3);
    soft(2.62,4.09,-1.6,.8,.58,.9,P.cedar,.06,true);
    soft(2.62,4.45,-1.6,.86,.18,.94,P.roof,.08);

    // Cushioned reading footrests sit outside the host and poetry interaction clear squares.
    // At 34 cm they follow the house engine's low-furniture collision rule.
    soft(-2.4,.17,-2.15,.85,.34,.8,P.cloth,.1);
    soft(-3.25,.17,-3.8,.6,.34,.9,P.roof,.1);
    b(-2.4,.346,-2.15,.58,.012,.035,P.linen);b(-3.25,.346,-3.8,.35,.012,.035,P.linen);
    g.userData={
      // 環境用茶廳與月室洗牆，藏書層板和筆洗、書法案補任務光，山月詩畫為重點，茶座與床沿留柔和地光。
      glow:[
        {kind:'wash',a:[-7.9,3.23,-4.9],b:[-7.9,3.23,-3.9],n:[1,0],c:'#79614b'},
        {kind:'under',a:[-6.1,2.55,-5.065],b:[-3,2.55,-5.065]},
        {kind:'wash',a:[-6.38,6.9,-2.7],b:[-6.38,6.9,-1.4],n:[1,0],c:'#79614b'},
        {kind:'under',a:[1.65,2.705,-5.78],b:[5.1,2.705,-5.78]},
        {kind:'under',a:[-5.8,6.35,-4.065],b:[-3.2,6.35,-4.065]},
        {kind:'kick',a:[.8,.11,1.775],b:[2.2,.11,1.775],n:[0,1]},
        {kind:'kick',a:[-5.95,3.91,-.45],b:[-4.55,3.91,-.45],n:[0,1]},
        {kind:'spot',p:[-6.7,3.4,-3.1],t:[-7.91,2.1,-3.1],r:.95},
        {kind:'spot',p:[2.7,7.85,-3.5],t:[2.15,4.75,-3.95],r:.8}
      ],
      spawn:[2.8,0,4.3,Math.PI],exit:[2.8,5.7,.6],host:[-.8,0,-1.5,.4],cols,
      gifts:[[.9,0,2.6,0],[-.7,0,-4,0],[-6.9,0,.2,0],[.5,3.8,-1.2,0],[-4.4,3.8,.2,0]],
      lights:[[-3.3,2.7,2.4,'#ffd9a0',1.2],[-3.6,2.7,-3.6,'#ffd9a0',1.1],[-2.1,6.45,2.45,'#ffe0ad',1.3],[2.9,6.45,-3.35,'#ffd9a0',1.2],[5,6.35,.4,'#ffd9a0',1],[-4.3,2.7,7.05,'#ffd9a0',1.1]],sun:[-.15,.65,1],
      spots:[
        {x:-.85,y:0,z:2.4,r:1.1,kind:'look',label:'坐看茶煙',name:'留白茶席',lines:['喵……水還沒滾，先陪我等一會兒。','茶煙升起來，很像一句還沒寫完的詩。','留一點空白，話才有地方慢慢落下。'],alone:['茶席留著一只空杯，杯口朝向窗邊。','淡淡茶香停在竹編席上。']},
        {x:-4.6,y:0,z:-3.6,r:1.1,kind:'look',label:'讀讀詩箋',name:'山月詩箋與藏書',lines:['喵……我把喜歡的句子，抄在這裡。','同一個月字，放進不同句子就有不同心情。','你也可以挑一句，留給今天的自己。'],alone:['紙上有山、有月，角落鈐著小小的朱印。','書脊旁夾了一張寫到一半的詩箋。']},
        {x:3.4,y:0,z:-3.7,r:1.1,kind:'look',label:'看看筆洗',name:'竹管筆洗',lines:['筆洗乾淨了，心裡的句子才不會打結。','喵……墨色的深淺，也能替文字換個聲音。','這一缽水，今天已經陪我改了三次開頭。'],alone:['竹管下的水缽映著窗格，硯邊整齊排著筆。','一縷淡墨還沒散開。']},
        {x:-2.1,y:3.8,z:.7,r:1.2,kind:'look',label:'望望月窗',name:'新月格柵與觀月茶席',lines:['喵……窗框把天空留成了一輪月。','借景也像寫詩，選好邊界，意思就不同了。','今晚若有風，就讓它替我翻一頁。'],alone:['一弧木格柵收住窗景，另一半留給天空。','茶桌上的書翻到一頁寫著月的短詩。']},
        {x:1.1,y:3.8,z:-1.7,r:1.15,kind:'study',label:'展卷讀字',name:'墨言的書法案',lines:['喵……先讀懂這一句，再挑答案。','字音拿不準時，試著想想它在句裡的意思。','不用急，文字會把線索留在前後。'],alone:['宣紙上壓著毛筆，旁邊放著一本國文手札。','一枚朱印旁寫著：讀句，也讀前後。']}
      ]
    };
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);

