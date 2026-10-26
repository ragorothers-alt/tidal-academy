/* 潮汐小島 · 岳的夢幻觀星圓木屋。正面 +Z；kit-only materials. */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};
  I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS['home_earth']=function(THREE,kit){
    const g=new THREE.Group();g.name='home-earth-stargazing-log-cabin';
    const M={
      wood:kit.mat('#8a6040',{roughness:.83},'wood'),
      honey:kit.mat('#bc8a55',{roughness:.78},'wood'),
      dark:kit.mat('#4d382e',{roughness:.92},'wood'),
      cream:kit.mat('#f4e7ce',{roughness:.9},'stone'),
      stone:kit.mat('#b9b0a2',{roughness:.96},'stone'),
      stoneLight:kit.mat('#d7ccba',{roughness:.92},'stone'),
      roof:kit.mat('#4a6b4f',{roughness:.85},'roof'),
      roofLight:kit.mat('#688665',{roughness:.84},'roof'),
      brass:kit.mat('#d7ad57',{roughness: 0.38,metalness: 0.6}, 'metal'),
      leaf:kit.mat('#718957',{roughness:.95}),
      pink:kit.mat('#e9a7bd',{roughness:.88}),
      lavender:kit.mat('#ae96ca',{roughness:.9}),
      flag:kit.mat('#5b526e',{roughness:.9},'fabric'),
      charcoal:kit.mat('#283c3b',{roughness:.86}),
      ember:kit.mat('#ef9853',{roughness:.8,emissive:'#ef9853',emissiveIntensity:.3}),
      // One fabric batch for the banner and hammock; the telescope lens keeps its plain finish.
      lens:kit.mat('#5b526e',{roughness:.93}),
      fabricCream:kit.mat('#f4e7ce',{roughness:.9},'fabric'),
      fabricPink:kit.mat('#e9a7bd',{roughness:.9},'fabric'),
      fabricLavender:kit.mat('#ae96ca',{roughness:.9},'fabric'),
      glass:kit.win()
    };
    let p=g;
    function part(id){p=new THREE.Group();p.name=id;p.userData={componentId:id,animationRole:'static-assembly',pivot:[0,0,0],collider:'authored-proxy',breakable:false};g.add(p);return p;}
    function add(geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0){const mesh=new THREE.Mesh(geo,m);mesh.name=p.name+'-'+p.children.length;mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=true;mesh.receiveShadow=true;p.add(mesh);return mesh;}
    function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0){return add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
    function chamferBox(x,y,z,w,h,d,m,r=.018){r=Math.min(r,w*.15,h*.15,d*.2);const s=new THREE.Shape(),W=w/2,H=h/2;s.moveTo(-W+r,-H);s.lineTo(W-r,-H);s.lineTo(W,-H+r);s.lineTo(W,H-r);s.lineTo(W-r,H);s.lineTo(-W+r,H);s.lineTo(-W,H-r);s.lineTo(-W,-H+r);s.closePath();return add(new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:1,steps:1,curveSegments:1}),m,x,y,z-d/2+r);}
    function beam(a,b,r,m,n=8,r2=r){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);const q=new THREE.CylinderGeometry(r2,r,v.length(),n,1);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));return add(q,m,...A.add(B).multiplyScalar(.5).toArray());}
    function ball(x,y,z,r,m,sx=1,sy=1,sz=1){const q=new THREE.SphereGeometry(r,7,5);q.scale(sx,sy,sz);return add(q,m,x,y,z);}
    function profile(points,depth,x,y,z,m,ry=0){const s=new THREE.Shape();points.forEach((v,i)=>i?s.lineTo(...v):s.moveTo(...v));s.closePath();return add(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:10}),m,x,y,z,0,ry);}
    function quad(a,b,c,d,m,th=.035){if((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])<0){const t=b;b=d;d=t;}const pts=[a,b,c,d,...[a,b,c,d].map(v=>[v[0],v[1]-th,v[2]])],P=[];for(const t of [[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]])for(const i of t)P.push(...pts[i]);const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.Float32BufferAttribute(P,3));q.computeVertexNormals();return add(q,m);}
    function archPoints(w,h,n=12){const r=w/2,pts=[[-r,0],[r,0],[r,h-r]];for(let i=1;i<=n;i++){const a=i*Math.PI/n;pts.push([Math.cos(a)*r,h-r+Math.sin(a)*r]);}return pts;}
    function arch(x,y,z,w,h,dep,m){return profile(archPoints(w,h),dep,x,y,z,m);}
    function archBand(x,y,z,w,h,t,m){const s=new THREE.Shape(archPoints(w,h).map(v=>new THREE.Vector2(...v)));s.holes.push(new THREE.Path(archPoints(w-2*t,h-2*t).map(v=>new THREE.Vector2(v[0],v[1]+t)).reverse()));return add(new THREE.ExtrudeGeometry(s,{depth:.075,bevelEnabled:true,bevelThickness:.007,bevelSize:.007,bevelSegments:1,steps:1,curveSegments:8}),m,x,y,z);}
    function window(x,y,z,w,h,ry=0){const before=p,q=new THREE.Group();q.name='framed-window-'+before.children.length;q.position.set(x,y,z);q.rotation.y=ry;before.add(q);p=q;
      arch(0,0,0,w+.12,h+.09,.06,M.dark);arch(0,.07,.065,w-.10,h-.12,.025,M.glass);archBand(0,-.02,.11,w+.20,h+.16,.105,M.honey);
      box(0,h*.48,.205,.04,h-.08,.04,M.honey);box(0,h*.46,.207,w-.05,.042,.04,M.honey);box(0,-.04,.13,w+.30,.10,.28,M.honey);
      for(const side of [-1,1]){box(side*(w*.5+.18),h*.43,.05,.23,h*.85,.07,M.roof);for(let j=0;j<4;j++)box(side*(w*.5+.18),.15+j*h*.17,.10,.21,.025,.03,M.honey);}
      p=before;
    }
    part('root');box(0,.17,-.10,3.63,.34,2.98,M.stone);box(0,1.38,-.10,3.24,2.04,2.50,M.wood);
    for(let row=0;row<2;row++){const y=.085+row*.17;for(let j=0;j<9;j++)for(const z of [-1.59,1.39])box(-1.61+j*.40+(row%2)*.07,y,z,.38,.155,.10,(j+row)%3?M.stoneLight:M.stone);for(let j=0;j<7;j++)for(const x of [-1.82,1.82])box(x,y,-1.37+j*.40,.09,.155,.38,(j+row)%3?M.stone:M.stoneLight);}
    for(let row=0;row<9;row++){const y=.49+row*.226;for(const z of [-1.39,1.19])beam([-1.77,y,z],[1.77,y,z],.135,row%3?M.wood:M.honey,10);for(const x of [-1.65,1.65])beam([x,y+.07,-1.52],[x,y+.07,1.32],.132,row%3?M.wood:M.honey,10);}
    part('roof');profile([[-1.72,0],[1.72,0],[0,1.38]],2.70,0,2.40,-1.45,M.wood);
    for(const side of [-1,1]){
      quad([0,3.82,-1.72],[0,3.82,1.48],[side*2.0,2.40,1.48],[side*2.0,2.40,-1.72],M.roof,.12);
      for(let row=0;row<8;row++)for(let j=0;j<13;j++){const t0=row/8,t1=Math.min(1,(row+1.10)/8),z0=-1.72+j*.25+(row%2)*.11,z1=Math.min(1.48,z0+.24);if(z1<=z0||z0>=1.48)continue;const lift=.035+(8-row)*.004;quad([side*2*t0,3.82-1.42*t0+lift,z0],[side*2*t1,3.82-1.42*t1+lift,z0],[side*2*t1,3.82-1.42*t1+lift,z1],[side*2*t0,3.82-1.42*t0+lift,z1],(row+j)%9?M.roof:M.roofLight,.035);}
      for(const z of [-1.74,1.50]){beam([0,3.88,z],[side*2.02,2.44,z],.085,M.honey);beam([0,3.94,z],[side*2.03,2.50,z],.022,M.brass,6);}
      beam([side*2.0,2.40,-1.75],[side*2.0,2.40,1.52],.10,M.wood);
    }
    beam([0,3.89,-1.77],[0,3.89,1.51],.09,M.honey);
    for(const z of [-1.46,1.26])for(let row=0;row<5;row++){const yy=2.49+row*.23,half=1.66*(1-(yy-2.40)/1.38);beam([-half,yy,z],[half,yy,z],.12,row%2?M.wood:M.honey,8);}
    part('chimney');box(-1.86,2.40,-.72,.68,4.45,.72,M.stone);
    for(let row=0;row<15;row++){const yy=.19+row*.292;for(const side of [-1,1])for(let j=0;j<2;j++){const shift=(row%2?.035:-.025);chamferBox(-2.035+j*.35+shift,yy,-.72+side*.377,.335,.273,.10,(row+j)%3?M.stoneLight:M.stone,.018);chamferBox(-1.86+side*.36,yy,-.91+j*.37,.10,.27,.35,(row+j)%3?M.stoneLight:M.cream,.016);}}
    box(-1.86,4.61,-.72,.85,.18,.87,M.stoneLight);box(-1.86,4.72,-.72,.48,.045,.50,M.charcoal);
    for(const x of [-2.13,-1.59])for(const z of [-1.0,-.44])box(x,4.84,z,.07,.30,.07,M.dark);
    box(-1.86,5.02,-.72,.88,.10,.90,M.roof);
    part('roof-deck');box(.92,3.82,-.42,1.94,.20,1.66,M.dark);
    for(let j=0;j<11;j++)box(.06+j*.173,3.945,-.42,.164,.055,1.64,j%3?M.honey:M.wood);
    for(const x of [.05,1.80])for(const z of [-1.16,.30]){box(x,3.53,z,.15,1.18,.15,M.wood);beam([x,3.72,z],[x-(x>.9?.30:-.30),3.22,z],.07,M.honey);}
    part('platform-rails');
    for(const z of [-1.22,.38]){box(.92,4.42,z,1.98,.09,.10,M.honey);box(.92,4.06,z,1.93,.06,.07,M.wood);for(let j=0;j<8;j++)box(.05+j*.25,4.23,z,.055,.40,.055,M.wood);}
    for(const x of [-.05,1.89]){box(x,4.42,-.42,.10,.09,1.70,M.honey);for(let j=0;j<6;j++)box(x,4.23,-1.08+j*.26,.055,.40,.055,M.wood);}
    for(const x of [-.05,1.89])for(const z of [-1.22,.38]){box(x,4.23,z,.14,.71,.14,M.honey);add(new THREE.ConeGeometry(.11,.12,4),M.brass,x,4.64,z,0,Math.PI/4);}
    part('telescope');
    const tc=[.97,4.62,-.42];for(const f of [[.49,3.98,-.05],[1.43,3.98,-.10],[.94,3.98,-1.0]]){beam(f,tc,.044,M.dark);beam(f,[f[0],4.12,f[2]],.052,M.brass);}
    ball(.97,4.67,-.42,.12,M.brass);beam([.97,4.61,-.42],[.97,4.83,-.42],.055,M.brass);
    const axis=new THREE.Vector3(.83,.53,.15).normalize(),mid=new THREE.Vector3(1.03,4.91,-.41);
    function barrel(off,len,r1,r2,m){const c=mid.clone().addScaledVector(axis,off);const q=new THREE.CylinderGeometry(r2,r1,len,16,1);q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis));add(q,m,...c.toArray());}
    barrel(0,1.13,.11,.16,M.brass);barrel(-.68,.27,.055,.066,M.dark);barrel(-.83,.055,.075,.075,M.brass);barrel(.64,.14,.19,.19,M.brass);barrel(.717,.012,.143,.143,M.charcoal);barrel(.724,.009,.121,.121,M.lens);
    for(const off of [-.42,.23,.51])barrel(off,.048,off>.4?.18:.145,off>.4?.18:.145,M.honey);
    part('porch');for(const x of [-.45,1.31]){box(x,.42,1.62,.34,.22,.34,M.stoneLight);box(x,1.30,1.62,.18,1.69,.18,M.wood);box(x,2.14,1.62,.29,.13,.29,M.honey);beam([x,2.15,1.62],[x+(x<0?.29:-.29),1.84,1.62],.065,M.honey);}
    for(const side of [-1,1]){quad([.43,3.0,.97],[.43,3.0,1.98],[.43+side*1.03,2.14,1.98],[.43+side*1.03,2.14,.97],M.roof,.10);beam([.43,3.05,2.0],[.43+side*1.05,2.19,2.0],.075,M.honey);}
    profile([[-.84,0],[.84,0],[0,.70]],.12,.43,2.14,1.78,M.honey);
    part('door');arch(.43,.34,1.33,1.06,1.91,.10,M.dark);arch(.43,.38,1.45,.87,1.77,.03,M.honey);archBand(.43,.32,1.48,1.08,1.96,.105,M.cream);
    for(let j=0;j<6;j++)box(.085+j*.137,.92,1.50,.125,1.02,.025,j%2?M.wood:M.honey);
    arch(.43,1.40,1.51,.43,.56,.02,M.glass);archBand(.43,1.37,1.55,.52,.64,.055,M.dark);box(.43,1.66,1.65,.03,.43,.03,M.honey);
    add(new THREE.TorusGeometry(.066,.014,5,12),M.brass,.69,1.10,1.61);ball(.69,1.18,1.59,.034,M.brass);
    for(let j=0;j<3;j++)box(.43,.075+j*.13,2.14-j*.25,1.20-j*.04,.15,.61,M.stoneLight);
    part('windows');window(-1.04,.77,1.33,.68,1.03);window(1.80,.93,.25,.65,.95,Math.PI/2);window(-1.80,.97,.16,.60,.91,-Math.PI/2);window(-.38,.94,-1.54,.68,.99,Math.PI);
    part('dormer');box(-.81,2.97,.91,.68,.64,.63,M.wood);profile([[-.34,0],[.34,0],[0,.38]],.66,-.81,3.21,.59,M.honey);
    for(const side of [-1,1]){quad([-.81,3.65,.54],[-.81,3.65,1.31],[-.81+side*.47,3.19,1.31],[-.81+side*.47,3.19,.54],M.roof,.065);beam([-.81,3.67,1.33],[-.81+side*.48,3.23,1.33],.055,M.honey);}
    window(-.81,2.77,1.26,.39,.64);
    part('ladder');for(const z of [-1.14,-.68])beam([2.08,.05,z],[1.79,3.99,z],.048,M.honey);for(let j=0;j<13;j++){const yy=.20+j*.286,x=2.08-.29*(yy/3.99);beam([x,yy,-1.14],[x,yy,-.68],.038,M.wood);}
    part('weather-screen');const sx=1.45,sz=1.96;
    for(const x of [-.21,.21])for(const z of [-.19,.19])beam([sx+x*1.13,.02,sz+z*1.12],[sx+x,.55,sz+z],.033,M.honey,4);
    box(sx,.56,sz,.57,.08,.52,M.cream);box(sx,.83,sz,.40,.48,.36,M.stone);
    for(const x of [-.247,.247])for(const z of [-.225,.225])box(sx+x,.84,sz+z,.045,.50,.045,M.cream);
    for(let row=0;row<7;row++){const yy=.64+row*.06;for(const side of [-1,1]){box(sx,yy,sz+side*.23,.45,.033,.06,M.cream,-side*.25);box(sx+side*.25,yy,sz,.06,.033,.40,M.cream,0,0,side*.25);}}
    box(sx,1.11,sz,.60,.07,.57,M.cream);for(const side of [-1,1])box(sx+side*.142,1.20,sz,.32,.045,.57,M.cream,0,0,-side*.45);
    part('weather-board');const bx=-1.05,bz=1.97;
    box(bx,.47,bz,.52,.63,.045,M.charcoal,-.13);for(const x of [-.30,.30])box(bx+x,.43,bz,.06,.84,.07,M.honey,-.13);for(const yy of [.12,.82])box(bx,yy,bz,.64,.06,.075,M.honey);
    for(const x of [-.29,.29])beam([bx+x,.76,bz-.02],[bx+x,.04,bz-.22],.027,M.wood);
    // Three geometric weather icons keep the observation board readable without textures.
    add(new THREE.TorusGeometry(.054,.008,4,12),M.cream,bx-.10,.65,bz+.052);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;beam([bx-.10+Math.cos(a)*.074,.65+Math.sin(a)*.074,bz+.054],[bx-.10+Math.cos(a)*.097,.65+Math.sin(a)*.097,bz+.054],.006,M.cream,4);}
    const cloud=[[-.12,0],[-.15,.04],[-.12,.09],[-.07,.10],[-.04,.16],[.03,.17],[.08,.11],[.13,.10],[.15,.04],[.11,0],[-.12,0]];
    for(let j=1;j<cloud.length;j++)beam([bx+.03+cloud[j-1][0]*.85,.42+cloud[j-1][1]*.85,bz+.052],[bx+.03+cloud[j][0]*.85,.42+cloud[j][1]*.85,bz+.052],.007,M.cream,4);
    for(let j=0;j<3;j++)beam([bx-.06+j*.08,.35,bz+.052],[bx-.09+j*.08,.29,bz+.052],.007,M.cream,4);
    beam([bx+.14,.17,bz+.052],[bx+.14,.31,bz+.052],.013,M.cream,5);ball(bx+.14,.15,bz+.052,.028,M.cream,1,1,.45);
    part('log-end-rings');for(const x of [-1.65,1.65])for(let row=0;row<9;row++){const y=.56+row*.226;add(new THREE.TorusGeometry(.082,.009,4,10),M.honey,x,y,1.327);beam([x-.03,y-.09,1.334],[x+.02,y-.025,1.334],.006,M.dark,4);}
    part('brass-bands');for(const off of [-.42,.23,.51])barrel(off,.026,off>.4?.186:.151,off>.4?.186:.151,M.brass);
    beam([.82,5.03,-.41],[1.29,5.33,-.34],.029,M.brass,8);ball(1.31,5.34,-.34,.047,M.charcoal);
    beam([.91,4.99,-.39],[.91,5.09,-.39],.014,M.brass,5);beam([1.20,5.12,-.35],[1.20,5.27,-.35],.014,M.brass,5);
    part('stone-joints');for(const y of [.31,1.18,2.05,3.22,4.10])chamferBox(-1.86,y,-.31,.34,.08,.07,M.stoneLight,.008);
    part('star-banner');const fx=1.41,fz=.452;
    beam([fx-.34,4.38,fz],[fx+.34,4.38,fz],.024,M.brass);
    profile([[-.31,0],[.31,0],[0,-.80]],.025,fx,4.34,fz,M.flag);
    for(const side of [-1,1])beam([fx+side*.30,4.33,fz+.033],[fx,3.56,fz+.033],.009,M.brass,4);
    const stars=[[-.14,-.16],[.12,-.19],[.02,-.35],[-.10,-.47],[.04,-.64]];
    for(let j=0;j<stars.length;j++){const v=stars[j];ball(fx+v[0],4.34+v[1],fz+.039,.021,M.brass,1,1,.45);if(j)beam([fx+stars[j-1][0],4.34+stars[j-1][1],fz+.038],[fx+v[0],4.34+v[1],fz+.038],.005,M.brass,4);}
    add(new THREE.TorusGeometry(.056,.012,4,14,Math.PI*1.60),M.brass,fx-.17,4.25,fz+.04,0,0,.60);
    part('hammock');
    for(const z of [-.39,1.12]){chamferBox(2.16,.69,z,.15,1.38,.15,M.honey);for(let j=0;j<3;j++)add(new THREE.TorusGeometry(.092,.011,4,8),M.fabricCream,2.16,1.19+j*.033,z,Math.PI/2);}
    for(let j=0;j<12;j++){const t0=j/12,t1=(j+1)/12,z0=-.27+t0*1.26,z1=-.27+t1*1.26,y0=1.19-.50*Math.sin(Math.PI*t0),y1=1.19-.50*Math.sin(Math.PI*t1);quad([1.96,y0,z0],[2.34,y0,z0],[2.34,y1,z1],[1.96,y1,z1],j%4===0?M.fabricPink:M.fabricCream,.018);}
    for(const x of [1.96,2.34])for(const end of [-1,1])beam([x,1.19,end<0?-.27:.99],[2.16,1.25,end<0?-.39:1.12],.014,M.fabricCream,5);
    for(let j=0;j<9;j++){const t=j/8,z=-.20+t*1.12,y=1.18-.50*Math.sin(Math.PI*(z+.27)/1.26);beam([2.35,y,z],[2.35,y-.10,z],.009,M.fabricCream,4);ball(2.35,y-.11,z,.018,M.fabricCream);}
    box(2.14,.80,.34,.30,.15,.29,M.fabricLavender,0,0,.09);
    part('campfire');const cx=-2.08,cz=1.94;
    for(let j=0;j<11;j++){const a=j*Math.PI*2/11;ball(cx+Math.cos(a)*.33,.10,cz+Math.sin(a)*.33,.097,j%3?M.stone:M.stoneLight,1.16,.72,.96);}
    for(const a of [0,Math.PI/3,Math.PI*2/3])beam([cx+Math.cos(a)*.24,.10,cz+Math.sin(a)*.24],[cx-Math.cos(a)*.24,.10,cz-Math.sin(a)*.24],.045,M.dark,6);
    for(const v of [[0,.32,0],[.11,.24,.01],[-.10,.24,-.04]])add(new THREE.ConeGeometry(.075,v[1],5),M.ember,cx+v[0],.17+v[1]/2,cz+v[2],0,0,v[0]);
    const tip=[cx,1.28,cz];for(const f of [[cx-.34,.03,cz-.24],[cx+.34,.03,cz-.24],[cx,.03,cz+.31]])beam(f,tip,.025,M.wood,6);
    beam(tip,[cx,.98,cz],.009,M.charcoal,5);ball(cx,.78,cz,.175,M.charcoal,1,1,.91);add(new THREE.TorusGeometry(.142,.020,5,12),M.brass,cx,.90,cz,Math.PI/2);add(new THREE.CylinderGeometry(.132,.132,.012,12),M.ember,cx,.899,cz);
    add(new THREE.TorusGeometry(.15,.013,5,12,Math.PI),M.charcoal,cx,.98,cz,0,0,0);
    part('lanterns');
    function lantern(x,y,z){box(x,y,z,.14,.23,.14,M.glass);for(const dx of [-.095,.095])for(const dz of [-.095,.095])beam([x+dx,y-.145,z+dz],[x+dx,y+.145,z+dz],.011,M.brass,5);for(const yy of [y-.15,y+.15])chamferBox(x,yy,z,.24,.04,.24,M.dark,.008);add(new THREE.ConeGeometry(.18,.12,4),M.brass,x,y+.23,z,0,Math.PI/4);ball(x,y-.19,z,.028,M.brass);beam([x,y+.28,z],[x,y+.38,z],.013,M.dark,5);}
    for(const v of [[1.13,1.73,1.74],[-.36,1.94,1.73],[-1.82,1.69,.65],[1.82,1.69,-.50],[.10,4.13,.36],[1.76,4.13,-1.18]])lantern(...v);
    part('flowers');
    function blossom(x,y,z,m){ball(x,y,z,.037,M.brass,1,1,.6);for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ball(x+Math.cos(a)*.047,y+Math.sin(a)*.047,z,.038,m,1,1,.55);}}
    function flowerBox(x,y,z,w,ry=0){const before=p,q=new THREE.Group();q.name='flower-box-'+before.children.length;q.position.set(x,y,z);q.rotation.y=ry;before.add(q);p=q;chamferBox(0,0,0,w,.20,.30,M.wood,.015);box(0,.10,.15,w+.04,.05,.045,M.honey);for(let j=0;j<7;j++){const xx=-w*.42+j*w*.14;ball(xx,.17,.03,.105,M.leaf,1.05,.60,1);if(j<6)blossom(xx,.22+(j%2)*.04,.15,j%3?M.pink:M.lavender);}p=before;}
    flowerBox(-1.04,.64,1.54,1.03);flowerBox(1.95,.80,.25,.87,Math.PI/2);flowerBox(-.38,.80,-1.70,.95,Math.PI);flowerBox(-1.96,.84,.16,.82,-Math.PI/2);
    for(const start of [[-.41,2.75,1.95],[1.30,2.30,1.94],[-1.86,3.86,-.28],[1.60,3.40,.35]]){
      const [x,y,z]=start;for(let j=0;j<9;j++){const xx=x+Math.sin(j*1.3)*.075,yy=y-j*.115,zz=z+.025*Math.cos(j);ball(xx,yy,zz,.095,M.leaf,1,.57,.65);if(j<8){ball(xx+.035,yy-.035,zz+.06,.066,j%2?M.pink:M.lavender,.78,1.10,.72);ball(xx-.029,yy-.08,zz+.06,.050,j%2?M.lavender:M.pink,.76,1.1,.65);}}
    }
    for(const v of [[-1.52,.20,1.60],[-2.02,.21,.80],[1.95,.21,1.31],[-1.25,.19,-1.79],[.66,.19,-1.78]]){ball(...v,.16,M.leaf,1.4,.7,1);blossom(v[0],v[1]+.08,v[2]+.05,M.pink);}
    part('compass-medallions');function star(x,y,z,r){const pts=[];for(let j=0;j<16;j++){const a=Math.PI/2+j*Math.PI/8,rr=j%2?r*.34:r;pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}profile(pts,.024,x,y,z,M.brass);}
    star(.43,2.48,1.93,.16);star(.43,1.13,1.54,.115);
    // Preserve semantic assemblies while batching their static fragments by shared kit material.
    g.updateMatrixWorld(true);
    for(const assembly of g.children){
      const batches=new Map(),inv=assembly.matrixWorld.clone().invert();assembly.traverse(o=>{if(!o.isMesh)return;const q=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();q.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld));if(!q.attributes.normal)q.computeVertexNormals();const key=o.material.uuid;if(!batches.has(key))batches.set(key,{material:o.material,geos:[]});batches.get(key).geos.push(q);});
      const old=[];assembly.traverse(o=>{if(o.isMesh)old.push(o.geometry);});assembly.clear();for(const q of old)q.dispose();
      for(const b of batches.values()){
        let count=0;for(const q of b.geos)count+=q.attributes.position.count;
        const P=new Float32Array(count*3),N=new Float32Array(count*3),U=new Float32Array(count*2);let off=0;
        for(const q of b.geos){P.set(q.attributes.position.array,off*3);N.set(q.attributes.normal.array,off*3);if(q.attributes.uv)U.set(q.attributes.uv.array,off*2);off+=q.attributes.position.count;q.dispose();}
        const q=new THREE.BufferGeometry();q.setAttribute('position',new THREE.BufferAttribute(P,3));q.setAttribute('normal',new THREE.BufferAttribute(N,3));q.setAttribute('uv',new THREE.BufferAttribute(U,2));q.computeBoundingSphere();
        const mesh=new THREE.Mesh(q,b.material);mesh.name=assembly.name+'-'+Object.keys(M).find(k=>M[k]===b.material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.explodeWithParent=true;assembly.add(mesh);
      }
    }
    g.userData={door:[.43,2.48],cols:[[-1.79,-1.56,1.79,1.33],[-2.30,-1.18,-1.43,-.27],[1.89,-.65,2.42,1.28],[-2.53,1.41,-1.63,2.39],[1.15,1.66,1.75,2.26],[-1.4,1.72,-.7,2.16],[-.56,1.51,-.34,1.73],[1.20,1.51,1.42,1.73]],mailbox:[-.5,2.36],lights:[[1.13,1.73,1.74],[-.36,1.94,1.73],[-1.82,1.69,.65],[1.82,1.69,-.50],[.10,4.13,.36],[1.76,4.13,-1.18]],smoke:[-1.86,5.11,-.72],sculptRuntime:{profile:'architectural-static',front:'+Z',units:'meters',parts:g.children.map(v=>v.name)}};
    return g;
  };
})(typeof window!=='undefined'?window:globalThis);
