/* Yue's walkable earth-science cottage. Textures are cached; all visit-owned
   geometry and materials are released. The camera-side walls are cut away. */
import * as THREE from 'three';
import { camera, U } from './engine.js';
import { animate } from './chars.js';
import { buildFurniture, furn } from './room.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as post from './post.js';
import { ULTRA } from './perf.js';
const HW=3.5, HD=3, LY=2.25, R=.22;
const LOFT={x0:.45,x1:3.3,z0:-2.83,z1:-.7}, BOTTOM={x:.75,y:0,z:.68}, TOP={x:.75,y:LY,z:-1.05};
const C={wood:'#95633d',light:'#bd8b54',dark:'#563c2b',navy:'#294770',gold:'#d0a356',ivory:'#f3e6ce',blue:'#456596',stone:'#e2d4bd'};
export let inside=false;
let P,V,H,sc,visit,away=false,savedP,savedV,savedCurve,floor=0,climb=null,cols=[],spots=[],windows=[],steam=[],loftVisual,loftOpacity=1,hemi,key,warm,lanternMat,soupMat;
const camPos=new THREE.Vector3(),camTarget=new THREE.Vector3(),desired=new THREE.Vector3(),TX={},GIFT_MODELS=new Map();
export function init(player,villager,hooks){P=player;V=villager;H=hooks||{};}
function texture(name,w,h,draw,repeat){
 if(TX[name])return TX[name];const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);
 const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=ULTRA?2:4;
 if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);}return TX[name]=t;
}
function grain(){return texture('wood',512,512,(c,w,h)=>{
 let seed=47;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
 for(let row=0;row<12;row++){const y=row*h/12,rh=h/12;let x=row%2?-90:-10;
 while(x<w){const v=.88+rnd()*.2,len=100+rnd()*110;c.fillStyle=`rgb(${176*v|0},${117*v|0},${66*v|0})`;c.fillRect(x,y,len,rh);c.strokeStyle='rgba(69,39,19,.23)';c.lineWidth=1.3;c.strokeRect(x,y,len,rh);
 for(let k=0;k<7;k++){c.strokeStyle=`rgba(80,43,19,${.04+rnd()*.08})`;c.beginPath();const yy=y+4+rnd()*(rh-8);c.moveTo(x+3,yy);c.bezierCurveTo(x+len*.3,yy+2,x+len*.7,yy-2,x+len-3,yy);c.stroke();}x+=len;}}
 },[1.65,1.4]);}
function chart(kind){return texture(kind,512,kind==='rug'?512:384,(c,w,h)=>{
 c.fillStyle=kind==='cloud'?'#f6edcf':kind==='rug'?'#d4bf99':'#203958';c.fillRect(0,0,w,h);c.strokeStyle=kind==='rug'?'#a98958':'#d2ab61';c.lineWidth=9;c.strokeRect(12,12,w-24,h-24);c.lineWidth=2;c.strokeRect(24,24,w-48,h-48);
 if(kind==='rug'){c.strokeStyle='#b59a70';for(let x=46;x<w-40;x+=24)for(let y=46;y<h-40;y+=24){c.beginPath();c.moveTo(x,y-6);c.lineTo(x+6,y);c.lineTo(x,y+6);c.lineTo(x-6,y);c.closePath();c.stroke();}return;}
 c.textAlign='center';c.fillStyle=kind==='cloud'?'#485b70':'#f2dba3';c.font='bold 27px serif';c.fillText(kind==='cloud'?'CLOUD ATLAS':'THE NIGHT SKY',w/2,57);
 if(kind==='cloud'){[[125,135],[352,135],[125,255],[352,255]].forEach(([x,y],i)=>{c.fillStyle='#bed2df';c.beginPath();c.ellipse(x,y,65,17,0,0,Math.PI*2);c.fill();for(let j=0;j<4;j++){c.beginPath();c.arc(x-36+j*22,y-12-Math.sin(j)*15*(i%2+1),19,0,Math.PI*2);c.fill();}c.fillStyle='#65768a';c.font='17px serif';c.fillText(['Cumulus','Cirrus','Stratus','Nimbus'][i],x,y+42);});}
 else{for(let i=0;i<95;i++){c.fillStyle=i%4?'#d8c99c':'#fff1c8';c.beginPath();c.arc(35+((i*97+31)%438),75+((i*61+17)%270),i%7?1.25:2.4,0,Math.PI*2);c.fill();}
 const pts=[[95,145],[170,123],[222,174],[290,153],[366,207],[346,278],[260,289]];c.strokeStyle='#e1b75c';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();pts.forEach(([x,y])=>{c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();});c.strokeStyle='rgba(168,193,209,.24)';for(let i=0;i<4;i++){c.beginPath();c.ellipse(w/2,h/2+15,75+i*45,108,-.2,0,Math.PI*2);c.stroke();}}
 });}
function mat(name,color,opt={}){if(visit.materials.has(name))return visit.materials.get(name);const m=new THREE.MeshStandardMaterial({color,roughness:.7,...opt});visit.materials.set(name,m);return m;}
const M=n=>mat(n,C[n]);
function geometry(g){visit.geometry.add(g);return g;}
function add(p,g,m,x,y,z,cast=true){const o=new THREE.Mesh(geometry(g),m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;p.add(o);return o;}
function box(p,w,h,d,m,x,y,z,bevel=0){
 const g=new THREE.BoxGeometry(w,h,d,bevel?2:1,bevel?2:1,bevel?2:1);
 if(bevel){const a=g.attributes.position,v=new THREE.Vector3(),q=new THREE.Vector3(),r=Math.min(bevel,w/3,h/3,d/3);for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i);q.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));v.sub(q).normalize().multiplyScalar(r).add(q);a.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();}return add(p,g,m,x,y,z);
}
const cyl=(p,r,rb,h,m,x,y,z,n=14)=>add(p,new THREE.CylinderGeometry(r,rb,h,n),m,x,y,z);
const sph=(p,r,m,x,y,z)=>add(p,new THREE.SphereGeometry(r,14,10),m,x,y,z);
const tor=(p,r,t,m,x,y,z,arc=Math.PI*2)=>add(p,new THREE.TorusGeometry(r,t,6,24,arc),m,x,y,z);
function collider(x,z,w,d,f=0,kind='furniture'){cols.push({x0:x-w/2,z0:z-d/2,x1:x+w/2,z1:z+d/2,floor:f,kind});}
function spot(kind,label,x,z,extra={}){spots.push({kind,label,x,z,y:0,r:.9,...extra});}
function panel(p,tex,w,h,x,y,z,ry=0,name=''){const o=add(p,new THREE.PlaneGeometry(w,h),mat('map:'+tex.uuid+name,'#fff',{map:tex,roughness:.85}),x,y,z,false);o.rotation.y=ry;return o;}
function archWindow(p,x,y,z,ry=0,size=1){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;g.scale.setScalar(size);p.add(g);
 const glass=mat('glass:'+windows.length,'#ffe2a4',{emissive:'#ffd391',emissiveIntensity:.55,roughness:.4});windows.push(glass);
 box(g,.9,.83,.045,glass,0,0,.02);add(g,new THREE.CircleGeometry(.45,24,0,Math.PI),glass,0,.415,.045,false);
 [-.52,.52].forEach(xx=>box(g,.15,.95,.15,M('stone'),xx,.02,.04,.025));tor(g,.52,.075,M('stone'),0,.43,.045,Math.PI);box(g,1.18,.12,.26,M('wood'),0,-.48,.09,.02);
 box(g,.045,1.16,.06,M('dark'),0,.17,.09);box(g,.91,.045,.06,M('dark'),0,-.03,.09);
}
function lantern(p,x,y,z){const gold=M('gold');cyl(p,.012,.012,.24,gold,x,y+.27,z,6);cyl(p,.18,.23,.11,gold,x,y+.1,z,6);cyl(p,.09,.12,.28,lanternMat,x,y-.08,z,8);box(p,.27,.055,.27,gold,x,y-.24,z,.015);[-1,1].forEach(s=>[-1,1].forEach(t=>box(p,.018,.3,.018,gold,x+s*.1,y-.08,z+t*.1)));}
function plant(p,x,y,z,scale=1){cyl(p,.15*scale,.11*scale,.24*scale,mat('pot','#a66d49'),x,y+.12*scale,z,10);for(let i=0;i<5;i++){const a=i*2.4,l=sph(p,.15*scale,mat('leaf','#708951'),x+Math.sin(a)*.13*scale,y+(.3+i*.065)*scale,z+Math.cos(a)*.12*scale);l.scale.set(.7,1.5,.6);l.rotation.z=Math.sin(a)*.6;}}
function chair(p,x,z,ry=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;p.add(g);box(g,.5,.1,.48,M('wood'),0,.44,0,.025);[-1,1].forEach(a=>[-1,1].forEach(b=>box(g,.065,.44,.065,M('wood'),a*.18,.22,b*.17)));[-.19,.19].forEach(xx=>box(g,.06,.55,.06,M('wood'),xx,.73,-.19));box(g,.44,.2,.055,M('light'),0,.93,-.19,.025);collider(x,z,.5,.48);}
function bowl(p,x,y,z){cyl(p,.15,.1,.075,M('ivory'),x,y+.035,z,16);cyl(p,.13,.13,.009,soupMat,x,y+.075,z,16);for(let i=0;i<3;i++)sph(p,.022,mat('carrot','#e78c48'),x+Math.sin(i*2)*.075,y+.082,z+Math.cos(i*2)*.07);}
function stove(p){
 const iron=mat('iron','#35434d',{metalness:.35,roughness:.5}),gold=M('gold');
 box(p,.86,.83,.77,iron,-3,.46,-.25,.04);box(p,.96,.1,.88,iron,-3,.9,-.25,.025);
 box(p,.51,.45,.04,M('dark'),-3,.43,.15,.04);box(p,.4,.33,.045,M('navy'),-3,.44,.18,.03);
 tor(p,.1,.014,gold,-3,.45,.21);box(p,.025,.1,.025,gold,-2.9,.45,.23);
 [-.27,.27].forEach(dx=>cyl(p,.045,.045,.035,gold,-3+dx,.78,.18,8).rotation.x=Math.PI/2);
 cyl(p,.075,.075,2.27,iron,-3.18,2.05,-.51,12);cyl(p,.105,.105,.11,iron,-3.18,3.2,-.51,12);
 cyl(p,.26,.2,.24,iron,-2.95,1.07,-.1,20);cyl(p,.245,.245,.015,soupMat,-2.95,1.2,-.1,20);
 [-1,1].forEach(s=>{const o=tor(p,.072,.025,iron,-2.95+s*.28,1.12,-.1,Math.PI);o.rotation.y=Math.PI/2;});
 for(let i=0;i<6;i++){const a=i*2.4;sph(p,.035,mat(i%2?'carrot':'leaf',i%2?'#e78c48':'#708951'),-2.95+Math.sin(a)*.16,1.216,-.1+Math.cos(a)*.16);}
 box(p,.75,.79,.7,M('navy'),-3.02,.4,-1.12,.035);box(p,.85,.07,.78,M('ivory'),-3.02,.84,-1.12,.025);box(p,.55,.035,.47,iron,-3.02,.884,-1.12,.025);
 const faucet=tor(p,.12,.02,gold,-3.2,1.03,-1.32,Math.PI);faucet.rotation.y=Math.PI/2;
 box(p,.06,.045,1.2,M('wood'),-3.37,1.68,-.57);
 for(let i=0;i<3;i++){const o=cyl(p,.09,.08,.03,mat('copper','#bc8951',{metalness:.6,roughness:.4}),-3.3,1.46,-.95+i*.31,14);o.rotation.z=Math.PI/2;box(p,.025,.16,.025,gold,-3.3,1.61,-.95+i*.31);}
 collider(-3,-.68,.92,1.74);spot('soup','嚐嚐岳的暖心燉湯',-2.28,.05,{r:.68});
 const tex=texture('steam',64,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,249,222,.56)');g.addColorStop(1,'rgba(255,249,222,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
 for(let i=0;i<3;i++){const m=new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.3,depthWrite:false});visit.extraMaterials.add(m);const s=new THREE.Sprite(m);s.position.set(-2.95,1.4+i*.15,-.1);s.scale.set(.24,.48,1);p.add(s);steam.push(s);}
}
function desk(p){
 box(p,1.78,.12,.61,M('light'),-2.05,.9,-2.43,.03);[-.73,.73].forEach(dx=>box(p,.1,.86,.47,M('wood'),-2.05+dx,.43,-2.43,.025));
 box(p,.53,.6,.53,M('wood'),-1.48,.55,-2.44,.025);for(let i=0;i<3;i++){box(p,.48,.16,.025,M('light'),-1.48,.39+i*.18,-2.158,.01);sph(p,.022,M('gold'),-1.48,.39+i*.18,-2.13);}
 const a=panel(p,chart('cloud'),.63,.46,-2.33,.969,-2.39);a.rotation.x=-Math.PI/2;const b=panel(p,chart('stars'),.47,.4,-1.75,.969,-2.38);b.rotation.x=-Math.PI/2;
 box(p,.42,.43,.39,M('wood'),-2.12,.22,-1.88,.025);box(p,.46,.07,.43,M('navy'),-2.12,.47,-1.88,.025);
 plant(p,-2.72,.96,-2.48,.6);for(let i=0;i<3;i++)box(p,.08,.23+i*.025,.18,mat('book'+i,['#38597c','#ab684f','#8b986c'][i]),-1.3+i*.085,1.08,-2.5,.005);
 collider(-2.05,-2.43,1.78,.61);collider(-2.12,-1.88,.46,.43);spot('notes','讀雲圖與氣象筆記',-1.55,-1.58,{topic:'es-atmos',r:.72});
 panel(p,chart('stars'),.82,1.25,-.63,1.45,-2.91);box(p,.87,.055,.075,M('gold'),-.63,2.1,-2.85);spot('notes','研究牆上的星座圖',-.6,-2.05,{topic:'es-motion',r:.68});
}
function dining(p){
 const rug=panel(p,chart('rug'),2.7,2.48,-.8,.012,.95);rug.rotation.x=-Math.PI/2;
 cyl(p,.64,.64,.11,M('light'),-.8,.8,.88,32);tor(p,.617,.017,M('gold'),-.8,.788,.88).rotation.x=Math.PI/2;
 cyl(p,.12,.17,.68,M('wood'),-.8,.39,.88,12);box(p,.85,.08,.17,M('wood'),-.8,.06,.88,.025);box(p,.17,.08,.85,M('wood'),-.8,.06,.88,.025);collider(-.8,.88,1.22,1.22);
 bowl(p,-1.08,.86,.91);bowl(p,-.55,.86,1.07);const teapot=sph(p,.125,M('ivory'),-.7,.98,.65);teapot.scale.y=.85;cyl(p,.08,.1,.035,M('gold'),-.7,1.09,.65,12);sph(p,.025,M('gold'),-.7,1.125,.65);
 const handle=tor(p,.09,.021,M('gold'),-.57,.99,.65);handle.rotation.y=Math.PI/2;const spout=cyl(p,.024,.05,.17,M('gold'),-.86,1,.65,10);spout.rotation.z=-.95;
 box(p,.26,.055,.2,M('navy'),-.98,.9,.58,.007);box(p,.22,.012,.17,M('ivory'),-.98,.935,.58);chair(p,-1.72,.84,Math.PI/2);chair(p,-.78,1.83,0);
 const g=new THREE.Group();g.position.set(-.02,0,-.28);g.rotation.y=-.32;p.add(g);box(g,.69,.21,.66,M('wood'),0,.24,0,.05);box(g,.55,.19,.54,M('blue'),0,.45,.04,.06);box(g,.67,.72,.2,M('blue'),0,.75,-.3,.08);
 [-.34,.34].forEach(xx=>{box(g,.13,.36,.59,M('blue'),xx,.57,0,.045);box(g,.1,.24,.1,M('wood'),xx,.13,.21,.02);});const pillow=box(g,.33,.32,.13,mat('pillow','#f2dfb7'),.03,.71,-.13,.05);pillow.rotation.z=-.15;collider(-.02,-.28,.92,.92);
}
function sciences(p){
 box(p,1.17,.72,.63,M('wood'),2.65,.38,-2.42,.025);box(p,1.27,.09,.73,M('light'),2.65,.78,-2.42,.025);
 [-.28,.28].forEach(dx=>{box(p,.47,.52,.035,M('light'),2.65+dx,.4,-2.083,.01);sph(p,.025,M('gold'),2.65+dx+(dx>0?-.11:.11),.44,-2.05);});
 [-.54,0,.54].forEach(dx=>box(p,.026,.79,.027,M('gold'),2.65+dx,1.2,-2.08));[-2.74,-2.1].forEach(z=>box(p,1.16,.025,.025,M('gold'),2.65,1.61,z));box(p,1.15,.035,.64,M('wood'),2.65,1.18,-2.42);
 for(let i=0;i<6;i++){const crystal=add(p,new THREE.OctahedronGeometry(.16,0),mat('crystal'+i,['#9d7ccc','#e3c568','#a0b7c5','#6696cc','#de9662','#e7d9b4'][i],{metalness:.15,roughness:.25}),2.23+i%3*.4,(i<3?.84:1.22)+.14,-2.4);crystal.scale.set(.72,1.25,.8);crystal.rotation.z=i*.16;}
 collider(2.65,-2.42,1.27,.73);spot('dex','觀察礦物標本',1.5,-1.8,{r:1});
 box(p,1.03,.74,.64,M('wood'),2.76,.37,-.72,.03);box(p,1.14,.08,.75,M('light'),2.76,.79,-.72,.025);box(p,.76,.06,.56,M('stone'),2.76,.86,-.72,.02);
 add(p,new THREE.CylinderGeometry(.09,.31,.47,7,1,true),mat('rock','#6c7278'),2.76,1.12,-.72).rotation.y=.1;
 const lava=mat('lava','#df6542',{emissive:'#bc4228',emissiveIntensity:.35});cyl(p,.09,.07,.035,lava,2.76,1.37,-.72,10);box(p,.055,.34,.035,lava,2.77,1.19,-.55).rotation.x=-.43;
 collider(2.76,-.72,1.14,.75);spot('notes','研究火山與板塊模型',1.94,-.32,{topic:'es-rock',r:.75});
 cyl(p,.4,.45,.11,M('wood'),2.46,.52,1.43,24);cyl(p,.07,.15,.45,M('wood'),2.46,.25,1.43,12);cyl(p,.21,.24,.05,M('gold'),2.46,.61,1.43,16);cyl(p,.045,.07,.25,M('gold'),2.46,.75,1.43,12);
 cyl(p,.045,.045,.87,M('gold'),2.46,.91,1.43,10).rotation.z=-1.06;
 [-1,1].forEach(s=>{const x=2.46+s*.32,y=.91+s*.19;sph(p,.255,mat('dome','#203a60',{metalness:.25,roughness:.35}),x,y,1.43);tor(p,.15,.032,M('gold'),x+.12,y+.02,1.62).rotation.y=.3;cyl(p,.095,.095,.025,mat('lens','#142b40',{metalness:.3,roughness:.2}),x+.125,y+.02,1.65,16).rotation.x=Math.PI/2;
 for(let j=0;j<11;j++){const a=j*2.4,yy=-.17+(j%5)*.076,rr=Math.sqrt(Math.max(.005,.255*.255-yy*yy));sph(p,j%4?.009:.017,M('gold'),x+Math.sin(a)*rr,y+yy,1.43+Math.cos(a)*rr);}});
 collider(2.46,1.43,.92,.83);spot('notes','打開雙穹頂星象儀',1.58,1.45,{r:.8,topic:'es-motion'});plant(p,3.03,0,.25,1.1);collider(3.03,.25,.43,.43);
}
function loft(p){
 const g=new THREE.Group();p.add(g);loftVisual=g;
 // Own upper-storey materials allow a gentle cutaway while the player walks below.
 const wood=mat('loftwood',C.wood),light=mat('loftlight',C.light),gold=mat('loftgold',C.gold,{metalness:.5,roughness:.35}),blue=mat('loftblue',C.blue),cream=mat('loftcream',C.ivory);
 box(g,2.85,.16,2.13,mat('loftfloor','#c29863',{map:grain()}),1.875,LY-.08,-1.765,.025);box(g,2.98,.17,.17,wood,1.875,LY-.17,-.7,.025);
 [.45,3.3].forEach(x=>{box(p,.17,LY,.17,M('wood'),x,LY/2,-2.78,.025);box(g,.15,.67,.15,wood,x,LY+.31,-.7,.025);box(g,.19,.13,.19,gold,x,LY+.7,-.7,.02);});
 // Guard every open edge, leaving only the ladder's narrow entrance.
 box(g,2.14,.1,.11,wood,2.23,LY+.65,-.7,.02);for(let x=1.18;x<3.2;x+=.34)box(g,.055,.58,.055,wood,x,LY+.31,-.7);
 box(g,.1,.1,2.1,wood,3.3,LY+.65,-1.75,.02);for(let z=-2.65;z<-.8;z+=.35)box(g,.055,.58,.055,wood,3.3,LY+.31,z);
 box(g,.09,.1,1.4,wood,.45,LY+.65,-2.1,.02);for(let z=-2.65;z<-1.55;z+=.35)box(g,.055,.58,.055,wood,.45,LY+.31,z);
 box(g,1.12,.26,1.28,wood,1.65,LY+.22,-2.14,.04);box(g,1.1,.2,1.26,cream,1.65,LY+.44,-2.14,.06);box(g,1.13,.09,.91,blue,1.65,LY+.57,-2,.045);
 const lines=mat('quiltlines','#627eaa');for(let i=0;i<7;i++)box(g,.012,.005,.87,lines,1.15+i*.165,LY+.62,-2);for(let i=0;i<5;i++)box(g,1.03,.005,.01,lines,1.65,LY+.621,-2.35+i*.17);
 box(g,1.13,.045,.17,cream,1.65,LY+.63,-2.29,.02);box(g,.7,.15,.3,cream,1.65,LY+.62,-2.56,.06).rotation.x=.16;box(g,1.22,.78,.13,wood,1.65,LY+.54,-2.78,.04);
 [-.55,.55].forEach(dx=>{box(g,.1,.98,.1,light,1.65+dx,LY+.54,-2.78,.02);sph(g,.075,gold,1.65+dx,LY+1.08,-2.78);});
 box(g,.48,.55,.43,wood,2.68,LY+.29,-2.52,.025);box(g,.54,.065,.49,light,2.68,LY+.6,-2.52,.02);sph(g,.022,gold,2.68,LY+.41,-2.282);
 // Loft plants use their own material too, so fading never changes ground furniture.
 cyl(g,.1,.08,.17,mat('loftpot','#a66d49'),2.68,LY+.74,-2.52,10);sph(g,.13,mat('loftleaf','#708951'),2.68,LY+.94,-2.52);
 const rug=panel(g,chart('stars'),.64,1.13,2.65,LY+.008,-1.31,0,'loft');rug.rotation.x=-Math.PI/2;
 collider(1.65,-2.14,1.17,1.28,1,'bed');collider(2.68,-2.52,.54,.49,1);spot('bed','看看岳的觀星睡前筆記',2.54,-1.58,{y:LY,r:.7,topic:'es-motion'});spot('ladder','爬下木梯',TOP.x,TOP.z,{y:LY,r:.65});
 const z0=.34,z1=-.96,length=Math.hypot(LY,z0-z1),angle=-Math.atan2(z0-z1,LY);
 [-.29,.29].forEach(dx=>{box(p,.1,length+.18,.13,M('wood'),BOTTOM.x+dx,LY/2,(z0+z1)/2,.02).rotation.x=angle;});for(let i=0;i<9;i++){const t=(i+.5)/9;box(p,.57,.065,.19,M('light'),BOTTOM.x,LY*t,z0+(z1-z0)*t,.015);}
 collider(.75,-.32,.75,1.38,0,'ladder');spot('ladder','爬上木梯，去閣樓看看',BOTTOM.x,BOTTOM.z,{r:.65});bake(g);
}
// Miniatures keep the original furniture shapes and colours in a single palette batch.
// Textured or translucent parts retain their original materials and shared geometry.
function prepareGift(model){
 const palette=mat('gift-miniatures','#ffffff',{vertexColors:true,roughness:.72});
 model.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=false;o.userData.sharedGeometry=true;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  if(o.isSkinnedMesh||materials.some(m=>m.map||m.alphaMap||m.transparent||m.side!==THREE.FrontSide))return;
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(),n=g.attributes.position.count,original=g.attributes.color,colours=new Float32Array(n*3);
  const paint=(start,count,m)=>{
   const c=m.color||new THREE.Color('#ffffff');
   for(let i=start;i<Math.min(n,start+count);i++){
    colours[i*3]=c.r*(original&&m.vertexColors?original.getX(i):1);
    colours[i*3+1]=c.g*(original&&m.vertexColors?original.getY(i):1);
    colours[i*3+2]=c.b*(original&&m.vertexColors?original.getZ(i):1);
   }
  };
  paint(0,n,materials[0]);
  if(materials.length>1)g.groups.forEach(group=>paint(group.start,group.count,materials[group.materialIndex]||materials[0]));
  g.setAttribute('color',new THREE.BufferAttribute(colours,3));g.clearGroups();o.geometry=geometry(g);o.material=palette;o.userData.sharedGeometry=false;
 });
}
function gifts(p,shown){
 const list=[...new Map((shown||[]).map(f=>{const d=furn(typeof f==='string'?f:f.id);return[d&&d.id,d];})).values()].filter(Boolean);if(!list.length)return;
 // A reserved exhibition shelf makes even very large gifted furniture safe at the door.
 const rows=Math.ceil(list.length/2),height=Math.max(.16,rows*.58);box(p,1.12,height,.055,M('navy'),-2.75,height/2,2.13,.02);[-3.3,-2.2].forEach(x=>box(p,.045,height+.1,.55,M('wood'),x,height/2,2.45));
 for(let i=0;i<=rows;i++)box(p,1.15,.045,.63,M('wood'),-2.75,.055+i*.58,2.43,.01);
 list.forEach((f,i)=>{if(!GIFT_MODELS.has(f.id))GIFT_MODELS.set(f.id,buildFurniture(f));const model=GIFT_MODELS.get(f.id).clone(true),bb=new THREE.Box3().setFromObject(model),size=bb.getSize(new THREE.Vector3()),center=bb.getCenter(new THREE.Vector3());prepareGift(model);
 const fit=Math.min(.48/Math.max(size.x,.01),.46/Math.max(size.y,.01),.48/Math.max(size.z,.01),.8),holder=new THREE.Group();holder.position.set(-3.02+i%2*.55,.08+Math.floor(i/2)*.58,2.42);model.scale.setScalar(fit);model.position.set(-center.x*fit,-bb.min.y*fit,-center.z*fit);holder.add(model);p.add(holder);});
 box(p,1.17,.035,.03,M('gold'),-2.75,height+.08,2.13);collider(-2.75,2.43,1.15,.64,0,'gifts');spot('gifts','看看珍藏的禮物家具',-1.85,2.32,{r:.8,names:list.map(f=>f.name)});
}
/** One static mesh per material keeps the decorated cottage inexpensive. */
function bake(root){
 root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),buckets=new Map(),transform=new THREE.Matrix4();root.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material)||!o.geometry.attributes.normal)return;if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(o);});
 buckets.forEach((objects,material)=>{if(objects.length<2)return;const parts=objects.map(o=>{let g=o.geometry.clone();g.applyMatrix4(transform.copy(inv).multiply(o.matrixWorld));if(g.index){const n=g.toNonIndexed();g.dispose();g=n;}return g;}),count=parts.reduce((n,g)=>n+g.attributes.position.count,0),merged=new THREE.BufferGeometry();
 ['position','normal','uv','color'].forEach(name=>{if(!parts.some(g=>g.attributes[name]))return;const itemSize=name==='uv'?2:3,data=new Float32Array(count*itemSize);if(name==='color')data.fill(1);let off=0;parts.forEach(g=>{if(g.attributes[name])data.set(g.attributes[name].array,off);off+=g.attributes.position.count*itemSize;});merged.setAttribute(name,new THREE.BufferAttribute(data,itemSize));});
 const m=new THREE.Mesh(geometry(merged),material);m.castShadow=objects.some(o=>o.castShadow);m.receiveShadow=true;root.add(m);parts.forEach(g=>g.dispose());objects.forEach(o=>{o.removeFromParent();if(!o.userData.sharedGeometry){o.geometry.dispose();visit.geometry.delete(o.geometry);}});});
}
function build(shown){
 visit={geometry:new Set(),materials:new Map(),extraMaterials:new Set()};cols=[];spots=[];windows=[];steam=[];const s=new THREE.Scene();s.background=new THREE.Color('#eadfc9');
 hemi=new THREE.HemisphereLight('#fff4df','#8f735a',1.7);s.add(hemi);key=new THREE.DirectionalLight('#ffe9c6',2.2);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(ULTRA?512:1024,ULTRA?512:1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.5,far:22});key.shadow.bias=-.0007;key.shadow.normalBias=.025;s.add(key,key.target);
 warm=new THREE.PointLight('#ffcc83',ULTRA?5:7,9,1.6);warm.position.set(-1.6,2.4,.2);s.add(warm);if(!ULTRA){const fill=new THREE.PointLight('#ffd99c',3,7,1.6);fill.position.set(2.25,3.6,-1.2);s.add(fill);}
 lanternMat=mat('lantern','#ffe2a7',{emissive:'#ffbd66',emissiveIntensity:.85});soupMat=mat('soup','#d99447',{roughness:.35});mat('gold',C.gold,{metalness:.5,roughness:.35});
 box(s,7.16,.2,6.16,M('dark'),0,-.14,0,.025);box(s,7,.08,6,mat('floor','#fff',{map:grain(),roughness:.7}),0,-.04,0);
 const wall=mat('wall',C.ivory,{roughness:.96});box(s,7.13,3.52,.15,wall,0,1.76,-3.07,.025);box(s,.15,3.52,6.15,wall,-3.57,1.76,0,.025);
 [[0,-2.92,6.94,.06],[-3.42,0,.06,6]].forEach(([x,z,w,d])=>{box(s,w,.78,d,M('navy'),x,.39,z);box(s,w,.045,d+.025,M('gold'),x,.8,z);box(s,w,.11,d+.04,M('dark'),x,.055,z);});
 const seam=mat('seam','#3d5878');for(let x=-3.2;x<3.5;x+=.42)box(s,.014,.7,.015,seam,x,.39,-2.88);for(let z=-2.7;z<3;z+=.42)box(s,.015,.7,.014,seam,-3.38,.39,z);
 [-3.46,.36,3.46].forEach(x=>box(s,.17,3.58,.2,M('wood'),x,1.79,-2.89,.025));box(s,7.15,.18,.25,M('wood'),0,3.48,-2.92,.025);box(s,.25,.18,6.15,M('wood'),-3.48,3.48,0,.025);
 box(s,.16,.28,6.13,M('stone'),3.54,.09,0,.02);[-2.21,2.21].forEach(x=>box(s,2.55,.28,.16,M('stone'),x,.09,3.07,.02));box(s,1.65,.025,.64,mat('doormat','#b49a69'),0,.014,2.64,.02);
 archWindow(s,-2.15,1.65,-2.91,0,1.05);archWindow(s,-3.4,1.65,1,Math.PI/2,1.02);
 tor(s,.37,.07,M('stone'),-.75,2.92,-2.89);const glass=mat('roundglass','#f4cb83',{emissive:'#edc081',emissiveIntensity:.45});windows.push(glass);add(s,new THREE.CircleGeometry(.33,24),glass,-.75,2.92,-2.895,false);box(s,.045,.64,.06,M('wood'),-.75,2.92,-2.82);box(s,.64,.045,.06,M('wood'),-.75,2.92,-2.82);
 lantern(s,-.3,2.62,-2.7);lantern(s,-3.05,2.65,1.65);lantern(s,2.95,3.42,-2.65);stove(s);desk(s);dining(s);sciences(s);gifts(s,shown);
 bake(s);loft(s);if(!away){spot('talk',`和${V?V.name:'岳'}聊聊`,-1.45,-.65,{r:.68});collider(-2.05,-.68,.48,.48,0,'host');}   // v7.6：岳不在家時沒有聊天點
 s.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});return s;
}
function snapshot(o){return o&&{parent:o.parent,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone(),visible:o.visible,look:o.userData.look};}
function restore(o,saved){if(!o||!saved)return;o.removeFromParent();if(saved.parent)saved.parent.add(o);o.position.copy(saved.position);o.quaternion.copy(saved.quaternion);o.scale.copy(saved.scale);o.visible=saved.visible;o.userData.look=saved.look;o.updateMatrixWorld(true);}
export function enter(shown=[],opt={}){
 if(inside||!P||!H)return false;away=!!opt.away;savedP=snapshot(P);savedV=away?null:snapshot(V&&V.mesh);savedCurve=U.uCurve.value;sc=build(shown);inside=true;floor=0;climb=null;loftOpacity=1;U.uCurve.value=0;
 sc.add(P);P.position.set(0,0,2.15);P.rotation.set(0,Math.PI,0);P.visible=true;if(V&&V.mesh&&!away){sc.add(V.mesh);V.mesh.position.set(-2.05,0,-.68);V.mesh.rotation.set(0,.5,0);V.mesh.visible=true;V.mesh.userData.look=new THREE.Vector3(0,1.1,0);}
 updateCamera(1,true);document.body.classList.add('in-trip','in-yue-home');ui.iris();Audio.sfx('open');return true;
}
function dispose(){
 if(!visit)return;visit.geometry.forEach(g=>g.dispose());visit.materials.forEach(m=>m.dispose());visit.extraMaterials.forEach(m=>m.dispose());if(sc)sc.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.dispose();});
 visit=null;cols=[];spots=[];windows=[];steam=[];loftVisual=null;
}
export function leave(){
 if(!inside)return;inside=false;climb=null;restore(P,savedP);restore(V&&V.mesh,savedV);U.uCurve.value=savedCurve;dispose();sc=null;document.body.classList.remove('in-trip','in-yue-home');ui.iris();Audio.sfx('open');if(H.onExit)H.onExit();else if(H.leave)H.leave();
}
export function blockedAt(x,z,which=floor){
 if(which===1){if(x<LOFT.x0+R||x>LOFT.x1-R||z<LOFT.z0+R||z>LOFT.z1-R)return true;}
 else if(x<-HW+.27||x>HW-.27||z<-HD+.27||z>HD-.18&&Math.abs(x)>.83)return true;
 return cols.some(c=>c.floor===which&&x>c.x0-R&&x<c.x1+R&&z>c.z0-R&&z<c.z1+R);
}
function zone(){if(!inside||!P||climb)return null;let best=null,distance=Infinity;spots.forEach(s=>{if(Math.abs(s.y-P.position.y)>.4)return;const d=Math.hypot(P.position.x-s.x,P.position.z-s.z);if(d<s.r&&d<distance){best=s;distance=d;}});return best;}
export const hint=()=>{if(!inside)return'';if(climb)return'扶好木梯，慢慢來…';const s=zone();if(s)return s.label;return floor===0&&Math.abs(P.position.x)<.9&&P.position.z>2.1?'往下走，離開岳的家':'';};
function startClimb(){if(climb)return;const to=floor===0?TOP:BOTTOM;climb={from:P.position.clone(),to:new THREE.Vector3(to.x,to.y,to.z),elapsed:0,duration:1.25,floor:floor===0?1:0};P.rotation.y=floor===0?Math.PI:0;Audio.sfx('tick');}
export function handler(){
 const s=zone();if(!s)return null;if(s.kind==='ladder')return startClimb;if(s.kind==='talk')return()=>H.talk&&H.talk(V);if(s.kind==='dex')return()=>H.dex&&H.dex();if(s.kind==='soup')return()=>H.soup&&H.soup();
 if(s.kind==='gifts')return async()=>{await ui.say(V,`你送我的${s.names.map(n=>'「'+n+'」').join('、')}，都好好珍藏在這裡。每次看見，就會想起你呢！`);ui.closeDialog();};return()=>H.notes&&H.notes(s.topic);
}
export function handle(){const fn=handler();if(!fn)return false;fn();return true;}
function updateCamera(dt,instant=false){
 const portrait=camera.aspect<.85,follow=portrait?.75:.36;camTarget.set(P.position.x*follow,1.2+P.position.y*.74,P.position.z*(portrait?.6:.3)-.1);
 const scale=portrait?1.16:1;desired.copy(camTarget).add(new THREE.Vector3(5.8*scale,6.7*scale,8.9*scale));if(instant)camPos.copy(desired);else camPos.lerp(desired,1-Math.exp(-dt*4));camera.position.copy(camPos);camera.lookAt(camTarget);
}
export function tick(dt,t,ix=0,iz=0,len=0,moving=false,run=false,locked=false,night=0){
 if(!inside)return;dt=Math.min(dt,.05);let walking=false;
 if(climb){climb.elapsed+=dt;const k=Math.min(1,climb.elapsed/climb.duration),eased=k*k*(3-2*k);P.position.lerpVectors(climb.from,climb.to,eased);if(k===1){floor=climb.floor;P.position.copy(climb.to);climb=null;}}
 else if(moving&&!locked&&len>0){const speed=run?3.8:2.4*(.3+.7*Math.min(1,len));ix/=len;iz/=len;const dx=ix*speed*dt,dz=iz*speed*dt;
 if(floor===0&&P.position.z+dz>HD-.17&&Math.abs(P.position.x+dx)<.83&&iz>0){leave();return;}
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.09));for(let i=0;i<steps;i++){const nx=P.position.x+dx/steps,nz=P.position.z+dz/steps;if(!blockedAt(nx,nz)){P.position.x=nx;P.position.z=nz;walking=true;}else{if(!blockedAt(nx,P.position.z)){P.position.x=nx;walking=true;}if(!blockedAt(P.position.x,nz)){P.position.z=nz;walking=true;}}}P.rotation.y=Math.atan2(ix,iz);}
 if(!climb)P.position.y=floor===1?LY:0;animate(P,dt,walking?run?2:1:0,t);
 if(V&&V.mesh&&V.mesh.parent===sc){const m=V.mesh,want=Math.atan2(P.position.x-m.position.x,P.position.z-m.position.z);let d=want-m.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));m.rotation.y+=d*Math.min(1,dt*3);m.userData.look.copy(P.position);m.userData.look.y+=1.1;animate(m,dt,0,t);}
 const n=THREE.MathUtils.clamp(night||0,0,1);hemi.intensity=1.65-n*.48;key.intensity=2.15-n*1.2;warm.intensity=(ULTRA?4:6)+n*2.4;key.color.set(n>.5?'#e7d9c6':'#ffe9c6');lanternMat.emissiveIntensity=.65+n*.6;
 windows.forEach(m=>{m.color.set(n>.5?'#526b91':'#ffdf9d');m.emissive.set(n>.5?'#34496f':'#ffd18b');m.emissiveIntensity=n>.5?.35:.55;});steam.forEach((s,i)=>{const k=(t*.28+i/3)%1;s.position.set(-2.95+Math.sin(t*1.6+i)*.04,1.26+k*.67,-.1);s.material.opacity=Math.sin(k*Math.PI)*.2;s.scale.set(.15+k*.18,.28+k*.3,1);});
 const fadeTo=floor===0&&!climb&&P.position.x>.22&&P.position.z<-.48?.12:1;loftOpacity+=(fadeTo-loftOpacity)*Math.min(1,dt*7);loftVisual.traverse(o=>{if(!o.isMesh)return;const m=o.material,transparent=loftOpacity<.995;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=loftOpacity;m.depthWrite=loftOpacity>.9;});
 updateCamera(dt);const fx=post.fx,dof=fx.dof,ao=fx.ao;fx.golden=.15;fx.clear=1;fx.sunVis=0;fx.night=n;fx.focus=camera.position.distanceTo(P.position);fx.dof=dof*.24;fx.ao=ao*(ULTRA?.65:1.1);post.render(t,sc,camera);fx.dof=dof;fx.ao=ao;
}
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),hit=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
export function pointerDown(e){
 if(!inside||climb)return null;ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,camera);plane.constant=floor===1?-LY:0;if(!ray.ray.intersectPlane(plane,hit))return null;let x=hit.x,z=hit.z;
 if(floor===1){x=THREE.MathUtils.clamp(x,LOFT.x0+.25,LOFT.x1-.25);z=THREE.MathUtils.clamp(z,LOFT.z0+.25,LOFT.z1-.25);}else{x=THREE.MathUtils.clamp(x,-HW+.3,HW-.3);z=THREE.MathUtils.clamp(z,-HD+.3,HD-.1);}
 for(let i=0;i<20&&blockedAt(x,z);i++){x+=(P.position.x-x)*.22;z+=(P.position.z-z)*.22;}return blockedAt(x,z)?null:{x,z};
}
export function inspect(){
 const counts={meshes:0,triangles:0,lights:0,estimatedDrawCalls:0};if(sc)sc.traverse(o=>{if(o.isLight)counts.lights++;if(o.isMesh){counts.meshes++;counts.estimatedDrawCalls+=Array.isArray(o.material)?o.material.length:1;counts.triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
 return{inside,scene:sc,collisions:cols.map(c=>({...c})),spots:spots.map(s=>({...s})),loft:{y:LY,bounds:{...LOFT},bottom:{...BOTTOM},top:{...TOP}},player:P?{x:P.position.x,y:P.position.y,z:P.position.z}:null,floor,climbing:!!climb,counts,blockedAt};
}
