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
    mat('roof','#355782',{roughness:.72},'roof');
    mat('roofLight','#426a99',{roughness:.67},'roof');
    mat('gold','#c69b50',{roughness:.35,metalness:.67});
    mat('iron','#344359',{roughness:.43,metalness:.6});
    mat('water','#4eaac0',{roughness:.23,metalness:.12,transparent:true,opacity:.78});
    mat('foam','#d6f6f6',{roughness:.38,emissive:'#8acbdb',emissiveIntensity:.1});
    m.window=kit.win();
    m.water.side=THREE.DoubleSide;
    function part(name,parent=g){const p=new THREE.Group();p.name=name;parent.add(p);return p;}
    function add(p,geo,id,pos,rot){
      if(rot){geo.rotateX(rot[0]);geo.rotateY(rot[1]);geo.rotateZ(rot[2]);}if(pos)geo.translate(...pos);
      let by=batches.get(p);if(!by){by=new Map();batches.set(p,by);}if(!by.has(id))by.set(id,[]);by.get(id).push(geo);
    }
    function flush(){for(const[p,by]of batches)for(const[id,geos]of by){
      const ps=[],ns=[];for(let geo of geos){if(geo.index){const old=geo;geo=geo.toNonIndexed();old.dispose();}if(!geo.attributes.normal)geo.computeVertexNormals();
        const pa=geo.attributes.position.array,na=geo.attributes.normal.array;
        for(let i=0;i<pa.length;i+=9){const ax=pa[i+3]-pa[i],ay=pa[i+4]-pa[i+1],az=pa[i+5]-pa[i+2],bx=pa[i+6]-pa[i],by=pa[i+7]-pa[i+1],bz=pa[i+8]-pa[i+2];if((ay*bz-az*by)**2+(az*bx-ax*bz)**2+(ax*by-ay*bx)**2<1e-18)continue;for(let j=0;j<9;j++){ps.push(pa[i+j]);ns.push(na[i+j]);}}
        geo.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));const mesh=new THREE.Mesh(geo,m[id]);mesh.name=p.name+'_'+id;mesh.castShadow=id!=='water'&&id!=='foam';mesh.receiveShadow=true;p.add(mesh);
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
      ringX(wheel,'wood',1.50,1.285,.15,x);
      ringX(wheel,'woodLight',1.49,1.445,.166,x);
      for(let k=0;k<8;k++){
        const a=k*Math.PI/4,rad=r=>[x,r*Math.cos(a),r*Math.sin(a)];
        beam(wheel,k%2?'wood':'woodLight',rad(.22),rad(1.39),.13,.125);
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
        box(wheel,j===1?'wood':'woodLight',.66,.07,.17,[0,r*Math.cos(aa),r*Math.sin(aa)],0,[aa,0,0]);
      }
      const aa=a-.15;
      box(wheel,'wood',.68,.235,.055,[0,1.33*Math.cos(aa),1.33*Math.sin(aa)],0,[aa,0,0]);
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
      box(flume,'wood',.16,3.16,.16,[x,1.87,z],.012);
      box(flume,'gold',.18,.065,.18,[x,.335,z],.009);
    }
    for(const z of [-1.61,-.52]){
      box(flume,'wood',1.78,.16,.20,[-.89,3.39,z],.014);
      if(z<-1.5){beam(flume,'woodDark',[-1.62,1.88,z],[-.16,3.35,z],.09,.10);beam(flume,'woodLight',[-.16,1.88,z],[-1.62,3.35,z],.09,.10);}
      else for(const x of [-1.62,-.16])beam(flume,'woodLight',[x,2.69,-.52],[x,3.39,-1.61],.10,.10);
    }
    box(flume,'woodDark',.80,.12,1.9,[-.87,3.50,-.94],.012);
    for(const x of [-1.27,-.47]){
      box(flume,'wood',.12,.28,1.98,[x,3.68,-.94],.012);
      box(flume,'woodLight',.13,.055,2.0,[x,3.84,-.94],.009);
      for(const z of [-1.72,-1.05,-.35])box(flume,'gold',.14,.32,.055,[x,3.68,z],.006);
    }
    // Water race and a broad source sheet; detailed crests are added at form pass.
    box(water,'water',1.82,.11,3.65,[-1.08,.24,0]);
    box(flume,'water',.67,.035,1.85,[-.87,3.63,-.94]);
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
    // Water is stationary; its source touches the trough and its lower tail joins the race.
    function waterSheet(p,pts,width,id='water',n=26){
      const curve=new THREE.CatmullRomCurve3(pts.map(q=>V(...q))),vs=[],ix=[],cross=width<.2?2:4;
      for(let i=0;i<=n;i++){const t=i/n,c=curve.getPoint(t),w=width*(.91+.09*Math.sin(t*16));for(let j=0;j<=cross;j++){const u=j/cross;vs.push(c.x+(u-.5)*w,c.y+.008*Math.sin(u*19+t*27),c.z+.008*Math.sin(u*15+t*23));}}
      for(let i=0;i<n;i++)for(let j=0;j<cross;j++){const a=i*(cross+1)+j,b=a+cross+1;ix.push(a,b,a+1,a+1,b,b+1);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setIndex(ix);geo.computeVertexNormals();add(p,geo,id);
    }
    const cascade=[[-.87,3.65,-.02],[-.87,3.51,.10],[-.87,3.30,.29],[-.87,3.16,.58],[-.87,2.89,1.03],[-.87,2.40,1.37],[-.87,1.83,1.48],[-.87,1.18,1.32],[-.87,.52,1.10],[-.87,.30,1.20]];
    waterSheet(water,cascade.slice(0,5),.50,'water',14);
    for(const off of [-.18,0,.18])waterSheet(water,cascade.slice(4).map((a,i)=>[a[0]+off+.015*Math.sin(i*2+off),a[1],a[2]+.009]),.11,'water',16);
    for(const off of [-.23,.22]){
      for(const [a,b]of[[0,5],[7,10]])tube(water,'foam',cascade.slice(a,b).map((q,i)=>[q[0]+off,q[1]+.012,q[2]+.012+Math.sin(i*2+off)*.01]),.006,8,3);
    }
    // Graphic crests are geometry ribbons lying on the water surface, not a texture.
    function crest(p,pts,w,id='foam'){
      const cv=new THREE.CatmullRomCurve3(pts.map(a=>V(...a))),vs=[],ix=[],n=8;
      for(let i=0;i<=n;i++){const t=i/n,c=cv.getPoint(t),T=cv.getTangent(t),N=V(-T.z,0,T.x).normalize().multiplyScalar(w*(.25+.75*Math.sin(Math.PI*t)));vs.push(c.x-N.x,c.y,c.z-N.z,c.x+N.x,c.y,c.z+N.z);}
      for(let i=0;i<n;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setIndex(ix);geo.computeVertexNormals();add(p,geo,id);
    }
    for(let k=0;k<24;k++){
      const x=-1.88+(k%6)*.28,z=-1.62+Math.floor(k/6)*.99+.12*Math.sin(k*1.7),y=.301;
      crest(water,[[x-.06,y,z-.14],[x+.04,y+.006,z],[x-.025,y,z+.18]],.012+(k%3)*.005);
    }
    for(let k=0;k<9;k++){
      const x=-1.16+(k%3)*.28,z=-1.76+Math.floor(k/3)*.65;
      crest(flume,[[x-.09,3.653,z-.1],[x+.07,3.653,z],[x-.02,3.653,z+.14]],.008);
    }
    waterSheet(water,[[-1.08,.297,1.75],[-1.08,.23,1.86],[-1.08,.08,1.90]],1.78,'water',10);
    for(let k=0;k<7;k++){const x=-1.82+k*.245;crest(water,[[x-.1,.31,1.15],[x+.03,.32,1.25],[x+.11,.31,1.39]],.025);}
    flush();
    // The visible base, including race and lantern, is centered on the ground origin.
    const bounds=new THREE.Box3().setFromObject(g),cx=(bounds.min.x+bounds.max.x)/2,cz=(bounds.min.z+bounds.max.z)/2;
    for(const p of g.children){p.position.x-=cx;p.position.z-=cz;}
    return g;
  };
})(typeof window!=='undefined'?window:globalThis);
