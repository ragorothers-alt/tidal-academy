/* 潮汐小島 · 程式化模型（img2threejs 重建，Codex 製作）：溪邊的水車磨坊（LMMODELS.waterwheel）。
   水車是名為 'wheel' 的子物件，原點在輪軸中心、繞自己的 x 軸轉（props.js 每格轉它）；象牙石、藍瓦、暖木。 */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};
  I.LMMODELS=I.LMMODELS||{};
  I.LMMODELS.waterwheel=function(THREE,kit){
    const g=new THREE.Group();g.name='waterwheel';
    const V=(x,y,z)=>new THREE.Vector3(x,y,z),m={},batches=new Map();
    function mat(id,c,opts,kind){m[id]=kit.mat(c,opts||{},kind);}
    mat('stone','#ebdfc5',{roughness:.92},'stone');
    mat('stoneShade','#cdbd9d',{roughness:.96},'stone');
    mat('wood','#986137',{roughness:.78},'wall');
    mat('woodLight','#b7834b',{roughness:.75},'wall');
    mat('woodDark','#60412d',{roughness:.88},'wall');
    // Repeatedly immersed rims/buckets stay wet; the inner spokes and upper flume stay dry.
    for(const[id,c]of[['wood','#986137'],['woodLight','#b7834b'],['woodDark','#60412d']])
      mat(id+'Wet',new THREE.Color(c).multiplyScalar(.80),{roughness:.44},'wall');
    mat('roof','#355782',{roughness:.72},'roof');
    mat('roofLight','#426a99',{roughness:.67},'roof');
    mat('gold','#c69b50',{roughness:.35,metalness:.67});
    mat('iron','#344359',{roughness:.43,metalness:.6});
    const flowOpts={transparent:true,side:THREE.DoubleSide,depthWrite:false,roughness:.20};
    mat('flumeFlow','#3f8f9e',{...flowOpts,opacity:.83},'flow');
    mat('raceFlow','#3b8393',{...flowOpts,opacity:.87},'flow');
    mat('sheetFlow','#78b7c2',{...flowOpts,opacity:.66},'flow');
    mat('sprayFlow','#b1d8db',{...flowOpts,opacity:.56},'flow');
    mat('foam','#e2f2ed',{roughness:.45,transparent:true,opacity:.77,side:THREE.DoubleSide,depthWrite:false});
    m.window=kit.win();
    function part(name,parent=g){const p=new THREE.Group();p.name=name;parent.add(p);return p;}
    function add(p,geo,id,pos,rot){
      if(rot){geo.rotateX(rot[0]);geo.rotateY(rot[1]);geo.rotateZ(rot[2]);}if(pos)geo.translate(...pos);
      let by=batches.get(p);if(!by){by=new Map();batches.set(p,by);}if(!by.has(id))by.set(id,[]);by.get(id).push(geo);
    }
    function flush(){for(const[p,by]of batches)for(const[id,geos]of by){
      const ps=[],ns=[],uvs=[],hasUV=geos.every(geo=>geo.attributes.uv);for(let geo of geos){if(geo.index){const old=geo;geo=geo.toNonIndexed();old.dispose();}if(!geo.attributes.normal)geo.computeVertexNormals();
        const pa=geo.attributes.position.array,na=geo.attributes.normal.array,ua=hasUV?geo.attributes.uv.array:null;
        for(let i=0;i<pa.length;i+=9){const ax=pa[i+3]-pa[i],ay=pa[i+4]-pa[i+1],az=pa[i+5]-pa[i+2],bx=pa[i+6]-pa[i],by=pa[i+7]-pa[i+1],bz=pa[i+8]-pa[i+2];if((ay*bz-az*by)**2+(az*bx-ax*bz)**2+(ax*by-ay*bx)**2<1e-18)continue;for(let j=0;j<9;j++){ps.push(pa[i+j]);ns.push(na[i+j]);}if(hasUV)for(let j=0;j<6;j++)uvs.push(ua[i/3*2+j]);}
        geo.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));if(hasUV)geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      const flowing=id.endsWith('Flow'),mesh=new THREE.Mesh(geo,m[id]);mesh.name=p.name+'_'+id+(flowing?'_water':'');mesh.castShadow=!flowing&&id!=='foam';mesh.receiveShadow=true;p.add(mesh);   // Keep _water/_foam suffixes: props.js restores the no-shadow flag after modelClone().
    }}
    // Twenty-triangle top chamfer, with flat normals and exact physical dimensions.
    function bevelBox(w,h,d,b=.025){
      b=Math.min(b,w*.22,h*.22,d*.22);
      const p=[],ii=[];
      for(const[y,ww,dd]of[[-h/2,w,d],[h/2-b,w,d],[h/2,w-2*b,d-2*b]])p.push(-ww/2,y,-dd/2,ww/2,y,-dd/2,ww/2,y,dd/2,-ww/2,y,dd/2);
      ii.push(0,1,2,0,2,3,8,10,9,8,11,10);
      for(let k=0;k<2;k++)for(let j=0;j<4;j++){const a=k*4+j,z=k*4+(j+1)%4;ii.push(a,a+4,z,z,a+4,z+4);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ii);const flat=geo.toNonIndexed();flat.computeVertexNormals();geo.dispose();return flat;
    }
    function box(p,id,w,h,d,pos,b=0,rot){add(p,b?bevelBox(w,h,d,b):new THREE.BoxGeometry(w,h,d),id,pos,rot);}
    function beam(p,id,a,b,w=.12,d=w){const A=V(...a),B=V(...b),geo=new THREE.BoxGeometry(w,A.distanceTo(B),d);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),B.clone().sub(A).normalize()));add(p,geo,id,A.add(B).multiplyScalar(.5).toArray());}
    function cylX(p,id,r,len,pos,segments=16){const geo=new THREE.CylinderGeometry(r,r,len,segments);geo.rotateZ(Math.PI/2);add(p,geo,id,pos);}
    function torusX(p,id,r,t,pos,segments=36){const geo=new THREE.TorusGeometry(r,t,4,Math.min(segments,24));geo.rotateY(Math.PI/2);add(p,geo,id,pos);}
    function tube(p,id,pts,r=.014,segments=16,sides=5){add(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(a=>V(...a))),segments,r,sides,false),id);}
    function ringX(p,id,outer,inner,width,x,cy=0,cz=0,segments=32,start=0,end=Math.PI*2){
      const vs=[],idx=[];
      for(let k=0;k<=segments;k++){const a=start+(end-start)*k/segments;
        for(const [xx,r]of[[-width/2,inner],[-width/2,outer],[width/2,outer],[width/2,inner]])vs.push(x+xx,cy+r*Math.cos(a),cz+r*Math.sin(a));}
      for(let k=0;k<segments;k++)for(let j=0;j<4;j++){const a=k*4+j,b=k*4+(j+1)%4,c=a+4,d=b+4;idx.push(a,c,b,b,c,d);}
      if(end-start<Math.PI*2-.001){idx.push(0,1,2,0,2,3);const a=segments*4;idx.push(a,a+2,a+1,a,a+3,a+2);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setIndex(idx);geo.computeVertexNormals();add(p,geo,id);
    }
    const foundation=part('stone-foundations'),building=part('mill-masonry'),timbers=part('timber-frame'),roof=part('slate-roof'),facade=part('doors-windows-lantern'),bearing=part('fixed-axle-bearings'),flume=part('fixed-flume'),water=part('water-race');
    const wheel=part('wheel');wheel.position.set(-.86,1.85,0);
    // Rough courses at channel banks and under the mill, all founded at y=0.
    for(let z=-1.54;z<1.7;z+=.47)for(let row=0;row<2;row++){
      const zz=z+(row%2)*.12;if(zz>1.8)continue;
      box(foundation,(row+Math.round(z*5))%3===0?'stoneShade':'stone',.36,.29,.45,[-2.20,.145+row*.29,zz],.035);
      box(foundation,'stone',.32,.29,.45,[-.02,.145+row*.29,zz],.03);
    }
    box(foundation,'stoneShade',2.26,.24,2.54,[1.30,.12,0],.025);
    for(let side=0;side<2;side++)for(let k=0;k<5;k++)box(foundation,k%3?'stone':'stoneShade',.435,.26,.29,[.42+k*.44,.28,side?1.2:-1.2],.025);
    // A freestanding masonry pier carries the outboard bearing, not the moving wheel.
    for(let row=0;row<5;row++)for(let j=0;j<2;j++)box(foundation,(row+j)%4?'stone':'stoneShade',.30,.28,.57,[-2.06+j*.30,.14+row*.28,0],.024);
    box(foundation,'stone',.76,.15,.73,[-1.91,1.475,0],.025);
    // Load-bearing wall shells with actual arched openings, rather than glass pasted on a box.
    function archPath(cx,bottom,spring,r){const h=new THREE.Path();h.moveTo(cx-r,bottom);h.lineTo(cx-r,spring);h.absarc(cx,spring,r,Math.PI,0,true);h.lineTo(cx+r,bottom);h.closePath();return h;}
    function wallShell(umin,umax,z,side,hole){
      const s=new THREE.Shape();s.moveTo(umin,.35);s.lineTo(umax,.35);s.lineTo(umax,2.75);s.lineTo(umin,2.75);s.closePath();if(hole)s.holes.push(archPath(...hole));
      const geo=new THREE.ExtrudeGeometry(s,{depth:.12,bevelEnabled:false,curveSegments:14});add(building,geo,'stoneShade',side?[.25,0,0]:[0,0,z],side?[0,-Math.PI/2,0]:null);
    }
    wallShell(-1.18,1.18,0,true,[.57,1.13,2.00,.31]);
    wallShell(.25,2.35,1.06,false,[1.56,.35,1.70,.35]);
    box(building,'stoneShade',2.1,2.40,.13,[1.30,1.55,-1.12]);
    box(building,'stoneShade',.13,2.40,2.36,[2.28,1.55,0]);
    // Courses are cut around the window and door, leaving the openings unobstructed.
    function courses(side){
      const umin=side?-1.18:.25,umax=side?1.18:2.35,c=side?.57:1.56,bot=side?1.12:.35,spring=side?2:1.7,r=side?.41:.45;
      for(let row=0;row<8;row++){
        const y=.35+row*.30,yt=y+.285;let intervals=[[umin,umax]];
        if(yt>bot&&y<spring+r){const half=y<=spring?r:Math.sqrt(Math.max(0,r*r-(y-spring)**2));intervals=[[umin,c-half],[c+half,umax]];}
        for(const[lo,hi]of intervals){if(hi-lo<.08)continue;const n=Math.max(1,Math.round((hi-lo)/.43));
          for(let j=0;j<n;j++){const w=(hi-lo)/n-.012,u=lo+(j+.5)*(hi-lo)/n;const id=(row+j)%6===0?'stoneShade':'stone';
            if(side)box(building,id,.145,.285,w,[.153,y+.1425,u],.017);
            else box(building,id,w,.285,.145,[u,y+.1425,1.155],.017);
          }
        }
      }
    }
    courses(true);courses(false);
    // Back/right courses remain visible during turntable inspection.
    for(let row=0;row<8;row++)for(let j=0;j<5;j++){
      box(building,'stone',.405,.285,.145,[.46+j*.42,.4925+row*.30,-1.145]);
      box(building,(row+j)%7===0?'stoneShade':'stone',.145,.285,.455,[2.285,.4925+row*.30,-.94+j*.47]);
    }
    // The front and back gables are solid timber-and-plaster triangles under the ridge.
    const gs=new THREE.Shape();gs.moveTo(.25,2.74);gs.lineTo(2.35,2.74);gs.lineTo(1.30,4.00);gs.closePath();
    for(const z of [-1.12,1.05])add(building,new THREE.ExtrudeGeometry(gs,{depth:.12,bevelEnabled:false}),'stone',[0,0,z]);
    // Gable roof slabs, to be overlaid by staggered shingle rows.
    const pitch=Math.atan2(1.21,1.34),slopeLen=Math.hypot(1.21,1.34);
    for(const s of [-1,1])box(roof,'roof',slopeLen,.10,2.91,[1.3+s*.67,3.40,0],0,[0,0,-s*pitch]);
    // Twin rims, correctly coplanar in YZ, with spokes physically socketed into the rim.
    for(const side of [-1,1]){
      const x=side*.375;
      ringX(wheel,'woodWet',1.50,1.285,.15,x);
      ringX(wheel,'woodLightWet',1.49,1.445,.166,x);
      for(let k=0;k<8;k++){
        const a=k*Math.PI/4,rad=r=>[x,r*Math.cos(a),r*Math.sin(a)];
        const id=k%2?'wood':'woodLight';
        beam(wheel,id,rad(.22),rad(.86),.13,.125);
        beam(wheel,id+'Wet',rad(.86),rad(1.39),.13,.125);
      }
      ringX(wheel,'iron',.31,.128,.055,side*.477,0,0,24);
      ringX(wheel,'gold',.32,.30,.057,side*.477,0,0,24);
      for(let k=0;k<8;k++){const a=k*Math.PI/4;cylX(wheel,'gold',.022,.02,[side*.515,.26*Math.cos(a),.26*Math.sin(a)],6);}
    }
    ringX(wheel,'woodDark',.235,.125,.90,0,0,0,24);
    // Sixteen buckets. Each bottom consists of three connected slats, supported by both rims.
    for(let k=0;k<16;k++){
      const a=k*Math.PI*2/16;
      for(let j=0;j<3;j++){
        const aa=a+(j-1)*.105,r=1.20+.045*(j-1)*(j-1);
        box(wheel,j===1?'woodWet':'woodLightWet',.66,.07,.17,[0,r*Math.cos(aa),r*Math.sin(aa)],0,[aa,0,0]);
      }
      const aa=a-.15;
      box(wheel,'woodWet',.68,.235,.055,[0,1.33*Math.cos(aa),1.33*Math.sin(aa)],0,[aa,0,0]);
    }
    // Stationary shaft passes through bored hubs and two real bearing supports.
    cylX(bearing,'woodDark',.105,2.52,[-.81,1.85,0],16);
    for(const x of [-2.07,.19]){
      ringX(bearing,'gold',.142,.107,.08,x,1.85,0,16);
      if(x<0){
        box(bearing,'iron',.36,.07,.57,[x,1.59,0],.014);
        ringX(bearing,'iron',.223,.126,.16,x,1.85,0,24,-Math.PI/2,Math.PI/2);
        for(const s of [-1,1])box(bearing,'iron',.16,.22,.099,[x,1.74,s*.174]);
        torusX(bearing,'gold',.225,.014,[x-.085,1.85,0],32);
        for(const z of [-.23,.23])cylX(bearing,'gold',.021,.025,[x-.195,1.63,z],6);
        cylX(bearing,'gold',.083,.034,[x-.22,1.85,0],16);
      }else{
        ringX(bearing,'iron',.247,.123,.11,x,1.85,0,24);ringX(bearing,'gold',.25,.224,.12,x,1.85,0,24);
        for(let k=0;k<8;k++){const a=k*Math.PI/4;cylX(bearing,'gold',.018,.025,[x-.068,1.85+.202*Math.cos(a),.202*Math.sin(a)],6);}
      }
    }
    // Flume from rear to the overshot lip. Posts sit on stone feet and carry cross beams.
    for(const z of [-1.61,-.52])for(const x of [-1.62,-.16]){
      box(foundation,'stone',.39,.29,.39,[x,.145,z],.025);
      box(flume,'woodWet',.16,.32,.16,[x,.45,z]);
      box(flume,'wood',.16,2.84,.16,[x,2.03,z],.012);
      box(flume,'gold',.18,.065,.18,[x,.335,z],.009);
    }
    for(const z of [-1.61,-.52]){
      box(flume,'wood',1.78,.16,.20,[-.89,3.39,z],.014);
      if(z<-1.5){beam(flume,'woodDark',[-1.62,1.88,z],[-.16,3.35,z],.09,.10);beam(flume,'woodLight',[-.16,1.88,z],[-1.62,3.35,z],.09,.10);}
      else for(const x of [-1.62,-.16])beam(flume,'woodLight',[x,2.69,-.52],[x,3.39,-1.61],.10,.10);
    }
    box(flume,'woodDarkWet',.80,.12,1.9,[-.87,3.50,-.94],.012);
    for(const x of [-1.27,-.47]){
      box(flume,'woodWet',.12,.14,1.98,[x,3.61,-.94]);
      box(flume,'wood',.12,.14,1.98,[x,3.75,-.94],.012);
      box(flume,'woodLight',.13,.055,2.0,[x,3.84,-.94],.009);
      for(const z of [-1.72,-1.05,-.35])box(flume,'gold',.14,.32,.055,[x,3.68,z],.006);
    }
    // Form pass: overlapping blue slate courses and a real ridge, gable fascias and eaves.
    for(const s of [-1,1]){
      for(let row=0;row<6;row++){
        const t=(row+.36)/6,xx=1.3+s*(1.34-t*1.34),yy=2.79+t*1.21;
        for(let col=0;col<8;col++){
          const zz=-1.27+col*.36+(row%2)*.035;
          box(roof,(row+col)%4===0?'roofLight':'roof',.39,.065,.35,[xx,yy+.12+row*.012,zz],.018,[0,0,-s*pitch]);
        }
      }
      box(timbers,'wood',.16,.17,2.98,[1.3+s*1.34,2.76,0],.014);
      for(const z of [-1.43,1.43])beam(timbers,'woodLight',[1.3,4.09,z],[1.3+s*1.43,2.70,z],.13,.16);
    }
    for(let k=0;k<8;k++)box(roof,k%3?'roof':'roofLight',.27,.16,.355,[1.3,4.145,-1.26+k*.36],.018);
    for(const z of [-1.18,1.18]){
      box(timbers,'wood',2.30,.16,.20,[1.30,2.76,z],.012);
      beam(timbers,'woodDark',[.24,2.74,z],[1.3,3.96,z],.09,.12);
      beam(timbers,'woodDark',[1.3,3.96,z],[2.36,2.74,z],.09,.12);
      box(timbers,'wood',.12,1.12,.16,[1.3,3.31,z],.009);
    }
    for(const x of [.24,2.36])for(const z of [-1.18,1.18]){
      box(timbers,'wood',.18,2.30,.19,[x,1.62,z],.012);
      box(foundation,'stone',.29,.27,.30,[x,.465,z],.018);
      box(timbers,'woodLight',.24,.14,.25,[x,2.68,z],.012);
    }
    // Gold ridge point on a blue socket, with a continuous base touching the ridge cap.
    box(roof,'roof',.22,.18,.22,[1.30,4.13,1.24],.018);
    box(roof,'gold',.19,.055,.19,[1.30,4.235,1.24],.012);
    const finial=new THREE.ConeGeometry(.075,.23,4);add(roof,finial,'gold',[1.30,4.3775,1.24],[0,Math.PI/4,0]);
    // Arched stone window surround and warm recessed glazing.
    function filledArch(cx,bottom,spring,r){const s=new THREE.Shape();s.moveTo(cx-r,bottom);s.lineTo(cx+r,bottom);s.lineTo(cx+r,spring);s.absarc(cx,spring,r,0,Math.PI,false);s.closePath();return s;}
    function archWedges(cx,spring,inner,outer,depth,pos,rot,count=9){
      for(let i=0;i<count;i++){
        const a=i*Math.PI/count+.012,b=(i+1)*Math.PI/count-.012,sh=new THREE.Shape();
        sh.moveTo(cx+inner*Math.cos(a),spring+inner*Math.sin(a));sh.lineTo(cx+outer*Math.cos(a),spring+outer*Math.sin(a));sh.lineTo(cx+outer*Math.cos(b),spring+outer*Math.sin(b));sh.lineTo(cx+inner*Math.cos(b),spring+inner*Math.sin(b));sh.closePath();
        add(facade,new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}),'stone',pos,rot);
      }
    }
    add(facade,new THREE.ShapeGeometry(filledArch(.57,1.14,2,.302),16),'window',[.139,0,0],[0,-Math.PI/2,0]);
    archWedges(.57,2,.318,.425,.13,[.135,0,0],[0,-Math.PI/2,0]);
    for(const z of [.199,.941])box(facade,'stone',.20,.88,.12,[.068,1.56,z],.015);
    box(facade,'stone',.30,.14,.91,[.04,1.09,.57],.018);
    box(facade,'woodDark',.075,.88,.047,[.105,1.57,.274]);box(facade,'woodDark',.075,.88,.047,[.105,1.57,.866]);
    box(facade,'woodLight',.075,1.145,.038,[.10,1.71,.57]);box(facade,'woodLight',.075,.045,.58,[.10,1.69,.57]);
    const archPts=[];for(let k=0;k<=20;k++){const a=k*Math.PI/20;archPts.push([.101,2+.303*Math.sin(a),.57+.303*Math.cos(a)]);}tube(facade,'woodDark',archPts,.026,20,5);
    // Front arched door, individually laid planks, iron straps and brass ring handle.
    add(facade,new THREE.ExtrudeGeometry(filledArch(1.56,.36,1.7,.344),{depth:.055,bevelEnabled:false,curveSegments:14}),'woodDark',[0,0,1.16]);
    for(let k=0;k<8;k++){
      const x=1.56+(k-3.5)*.080,top=1.7+Math.sqrt(Math.max(0,.343*.343-(x-1.56)**2));
      box(facade,k%3===0?'wood':'woodLight',.073,top-.397,.046,[x,(top+.397)/2,1.221],.006);
    }
    archWedges(1.56,1.70,.36,.455,.15,[0,0,1.16],null,9);
    for(const x of [1.152,1.968])box(facade,'stone',.115,1.35,.17,[x,1.025,1.235],.015);
    box(foundation,'stone',.96,.16,.44,[1.56,.32,1.40],.02);
    for(const y of [.70,1.53]){
      box(facade,'iron',.58,.07,.031,[1.56,y,1.267],.008);
      for(const x of [1.31,1.80]){const bolt=new THREE.CylinderGeometry(.019,.019,.018,6);bolt.rotateX(Math.PI/2);add(facade,bolt,'gold',[x,y,1.293]);}
    }
    box(facade,'iron',.065,.17,.021,[1.72,1.09,1.269],.008);
    add(facade,new THREE.TorusGeometry(.062,.010,5,16),'gold',[1.72,1.065,1.304]);
    // Corner hanging lantern, supported by a bent bracket and top ring.
    tube(facade,'gold',[[2.33,2.36,1.20],[2.54,2.36,1.30],[2.57,2.29,1.38]],.021,12,6);
    add(facade,new THREE.TorusGeometry(.041,.009,4,12),'gold',[2.57,2.26,1.38]);
    box(facade,'window',.185,.285,.185,[2.57,2.045,1.38]);
    for(const dx of [-.11,.11])for(const dz of [-.11,.11])box(facade,'gold',.024,.32,.024,[2.57+dx,2.045,1.38+dz]);
    for(const y of [1.875,2.21])box(facade,'gold',.27,.045,.27,[2.57,y,1.38],.009);
    const lr=new THREE.ConeGeometry(.197,.115,4);add(facade,lr,'gold',[2.57,2.285,1.38],[0,Math.PI/4,0]);
    // Fastened brass straps on the wheel, backed by the wooden annulus.
    for(const side of [-1,1])for(let k=0;k<8;k++){
      const a=k*Math.PI/4,x=side*.466;
      box(wheel,'gold',.025,.215,.085,[x,1.395*Math.cos(a),1.395*Math.sin(a)],.008,[a,0,0]);
      for(const r of [1.335,1.455])cylX(wheel,'iron',.016,.014,[side*.485,r*Math.cos(a),r*Math.sin(a)],6);
    }
    // Thin, deterministic woodgrain ridges on the most readable front spokes.
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4;
      for(const off of [-.028,.026]){
        const pts=[];for(let j=0;j<5;j++){const r=.36+j*.22,z=off+.004*Math.sin(j*2+k);pts.push([-.443,r*Math.cos(a)-z*Math.sin(a),r*Math.sin(a)+z*Math.cos(a)]);}
        tube(wheel,k%2?'woodDark':'wood',pts,.0032,5,3);
      }
    }
    // All water is in fixed groups, never under 'wheel'. A crowned cross-section gives
    // the sheet a thick centre/thin edges; the short free jet also has a tapered underside.
    // UV.x spans each ribbon. UV.y is downstream arc length (1 unit/metre), with v=1
    // at impact. Long upstream runs extend below zero so the flow shader's v>=.78
    // foam remains local to the landing instead of whitening the whole downstream half.
    function flowRibbon(p,id,sample,{n=16,cross=4,end=1,across=V(1,0,0),shell=false,edge=null}={}){
      const rows=[],vs=[],uv=[],ix=[];let length=0;
      for(let i=0;i<=n;i++){
        const row=sample(i/n);row.c=V(...row.p);if(i)length+=row.c.distanceTo(rows[i-1].c);row.s=length;rows.push(row);
      }
      const stride=cross+1,layerSize=(n+1)*stride;
      for(let layer=0;layer<(shell?2:1);layer++)for(let i=0;i<=n;i++){
        const row=rows[i],t=i/n,T=rows[Math.min(n,i+1)].c.clone().sub(rows[Math.max(0,i-1)].c).normalize();
        const A=(typeof across==='function'?across(t):across).clone().normalize(),N=T.clone().cross(A).normalize();
        for(let j=0;j<=cross;j++){
          const u=j/cross,q=u*2-1,crown=(row.h||0)*(1-q*q)*(layer?-.32:1);
          const point=row.c.clone().addScaledVector(A,(u-.5)*row.w).addScaledVector(N,crown);
          if(edge)point.add(edge(t,u));
          vs.push(...point.toArray());uv.push(u,end-length+row.s);
        }
      }
      for(let layer=0;layer<(shell?2:1);layer++)for(let i=0;i<n;i++)for(let j=0;j<cross;j++){
        const a=layer*layerSize+i*stride+j,b=a+stride;
        if(layer)ix.push(a,a+1,b,a+1,b+1,b);else ix.push(a,b,a+1,a+1,b,b+1);
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();add(p,geo,id);
    }
    // A few centimetres of fast dark water, well below the 3.84 m cap; a small lip hump.
    flowRibbon(flume,'flumeFlow',t=>({p:[-.87,3.626+.035*Math.exp(-(((t-.95)/.115)**2)),-1.865+1.89*t],w:.665-.025*t,h:.006}),{n:24,cross:6,end:.74});
    const jet=t=>[-.87,3.655-.09*t-.46*t*t,.025+.58*t];
    flowRibbon(water,'sheetFlow',t=>({p:jet(t*.64),w:.64-.14*t,h:.028-.016*t}),{n:16,cross:6,shell:true,end:.63});
    // The continuous lip sheet opens into three unequal fingers before hitting the buckets.
    for(const[k,off]of[-.164,0,.164].entries())flowRibbon(water,'sheetFlow',t=>{
      const q=jet(.64+.36*t);q[0]+=off+(k-1)*.014*t*t;
      return{p:q,w:(k===1?.172:.164)*(1-.58*t),h:.012-.008*t};
    },{n:10,cross:4,shell:true});
    // Only broken films cling to the upper buckets; separate narrow runnels peel away
    // farther round the wheel. This leaves readable wet wood between the streams.
    for(const[k,off]of[-.15,.10].entries())flowRibbon(water,'sheetFlow',t=>{
      const a=.46+.75*t,r=1.405;
      return{p:[-.87+off+.012*Math.sin(t*7+k),1.85+r*Math.cos(a),r*Math.sin(a)],w:.095*(1-.45*t),h:.009};
    },{n:14,cross:3,end:.74});
    for(const[k,off]of[-.15,.04,.19].entries())flowRibbon(water,'sprayFlow',t=>({
      p:[-.87+off+.018*Math.sin(t*5+k)*t,2.38-2.075*t*t,1.30+(.10+k*.025)*t],
      w:(.068-k*.009)*(1-.66*t),h:.008*(1-.8*t)
    }),{n:20,cross:3});
    // The fixed race follows +z, the downstream direction of Tidal River beside the mill.
    flowRibbon(water,'raceFlow',t=>({p:[-1.08,.287-.003*t,-1.825+3.575*t],w:1.82-.045*Math.sin(Math.PI*t),h:.006}),{n:30,cross:6,end:.74});
    // 出水口的石堰：堰頂略低於水面，水漫過堰頂、沿著石面落下（以前這裡是一片垂直的透明水幕，看起來像玻璃盒）。
    // 前緣不超過原本的 +z 邊界（z 1.9），模型置中與水車位置不變。
    box(foundation,'stoneShade',1.86,.27,.24,[-1.10,.135,1.76],.02);
    for(let k=0;k<4;k++)box(foundation,k%2?'stone':'stoneShade',.45,.07,.08,[-1.78+k*.46,.235,1.86],.015);   // 堰頂一排壓頂石，邊緣參差
    for(const off of[-.62,-.2,.25,.6])flowRibbon(water,'foam',t=>({p:[-1.08+off+.36*(t-.5),.078+.006*Math.sin(t*9+off*7),1.91+.025*Math.sin(t*7+off*5)],w:.075*Math.sin(Math.PI*t),h:.003}),{n:8,cross:2,across:V(0,0,1)});   // 落水處的白沫
    // Retain the former outlet end profile: it defines the original model's +z bound
    // and therefore its automatic centring / the wheel's placement in props.js.
    flowRibbon(water,'raceFlow',t=>({p:[-1.08,.287-.207*t*t,1.75+.15*(2*t-t*t)],w:1.78-.08*t,h:.006*(1-t)}),{
      n:10,cross:4,end:1,edge:(t,u)=>V(0,.008*t*Math.sin(u*19+t*27),.008*t*Math.sin(u*15+t*23))
    });
    // Broken, flattened foam arcs around the runnel impact, not white cylindrical tubes.
    for(let k=0;k<9;k++)flowRibbon(water,'foam',t=>{
      const a=k*Math.PI*2/9+.07+t*.55,r=1+.055*Math.sin(a*7);
      return{p:[-.85+.37*r*Math.cos(a),.307+.003*Math.sin(a*3),1.40+.235*r*Math.sin(a)],w:(.030+.028*(k%3)/2)*Math.sin(Math.PI*t),h:.003};
    },{n:7,cross:2,across:t=>{const a=k*Math.PI*2/9+.07+t*.55;return V(Math.cos(a),0,Math.sin(a));}});
    for(const off of[-.13,.08])flowRibbon(water,'foam',t=>({
      p:[-.85+off+.04*Math.sin(t*5),.31,1.35+.39*t],w:.038*Math.sin(Math.PI*t),h:.002
    }),{n:9,cross:2});
    // Outward ballistic splash petals; asymmetry avoids a static fountain/star silhouette.
    for(let k=0;k<6;k++){
      const a=-.3+k*1.09,dx=Math.cos(a),dz=Math.sin(a),reach=.20+.035*(k%3),lift=.12+.025*(k%2);
      flowRibbon(water,'sprayFlow',t=>({p:[-.85+dx*(.12+reach*t),.311+lift*4*t*(1-t),1.40+dz*(.09+reach*t)],w:.048*(1-.90*t),h:.006*(1-t)}),{n:10,cross:3,across:V(-dz,0,dx)});
    }
    // Small aerated contact tongues at the top bucket, fixed in the incoming water.
    for(const off of[-.17,.015,.17])flowRibbon(water,'sprayFlow',t=>({
      p:[-.87+off+(off<0?-.035:.025)*t,3.11+.055*Math.sin(Math.PI*t)-.10*t,.605+.16*t],w:.065*(1-.85*t),h:.006
    }),{n:7,cross:3});
    flush();
    // The visible base, including race and lantern, is centered on the ground origin.
    const bounds=new THREE.Box3().setFromObject(g),cx=(bounds.min.x+bounds.max.x)/2,cz=(bounds.min.z+bounds.max.z)/2;
    for(const p of g.children){p.position.x-=cx;p.position.z-=cz;}
    return g;
  };
})(typeof window!=='undefined'?window:globalThis);
