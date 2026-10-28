/* 潮汐小島 · 季節與學測倒數活動：週末模擬考祭典、倒數 100 天、跨年煙火、學測前夜、考後慶典、春櫻、中秋。 */
import * as THREE from 'three';
import { scene, bend, M, mesh, nightMats, cullable } from './engine.js';
import { groundAt } from './terrain.js';
import { PLAZA, modelClone, mergeStatic } from './props.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as glow from './glow.js';
import { I, S, save } from './state.js';
import { pickQ, record, pick, dayKey } from './quiz.js';

const TA = window.TA;
let fakeDate = null;
export const now = () => (fakeDate ? new Date(fakeDate) : new Date());
export function setDate(iso) { fakeDate = iso; refresh(); }
const MID_AUTUMN = { 2026: '2026-09-25', 2027: '2027-09-15', 2028: '2028-10-03' };
const LANTERN = { 2027: '2027-02-20', 2028: '2028-02-09', 2029: '2029-02-27' };
const SOLSTICE = { 2026: '2026-12-22', 2027: '2027-12-22', 2028: '2028-12-21' };
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((new Date(key(a)) - new Date(key(b))) / 864e5);
export const NAMES = { solstice: '冬至', xmas: '潮汐冬夜（聖誕）', lantern: '元宵燈會', cram: '考前衝刺', examday: '學測日', halloween: '潮汐夜祭', fish_cup: '釣魚大賽', bug_cup: '捕蟲大會', weekly: '週末模擬考祭典', d100: '學測倒數 100 天', d30: '學測倒數 30 天', d7: '學測倒數 7 天', newyear: '迎新年', eve: '學測前夜', after: '考後慶典', spring: '春櫻季', mid_autumn: '中秋賞月' };
const BANNER = { solstice: '冬至 吃湯圓', xmas: 'Merry Christmas', lantern: '元宵燈會', cram: '考前衝刺 穩穩來', examday: '學測加油！', halloween: '潮汐夜祭', fish_cup: '今日釣魚大賽', bug_cup: '今日捕蟲大會', weekly: '週末模擬考祭典', d100: '學測倒數 100 天！', d30: '倒數 30 天 一起加油', d7: '最後 7 天 穩穩來', newyear: '新年快樂！', eve: '明天見真章 早點睡', after: '辛苦了！考後慶典', spring: '春櫻季', mid_autumn: '中秋快樂' };

/** 今天有哪些活動 */
export function active(d) {
  d = d || now();
  const exam = new Date((TA.S.profile && TA.S.profile.examDate) || '2027-01-22'), left = dayDiff(exam, d), out = [];
  if (left === 100) out.push('d100'); if (left === 30) out.push('d30'); if (left === 7) out.push('d7');
  if (left === 1) out.push('eve');
  if (left <= 0 && left >= -2) out.push('examday');   // 學測考期三天（1/22–1/24）
  if (left >= 2 && left <= 30) out.push('cram');
  if (left <= -3 && left >= -9) out.push('after');
  const m = d.getMonth() + 1, dd = d.getDate();
  if ((m === 12 && dd === 31) || (m === 1 && dd === 1)) out.push('newyear');
  if ((m === 3 && dd >= 20) || (m === 4 && dd <= 20)) out.push('spring');
  if (m === 10 && dd >= 24) out.push('halloween');
  if (SOLSTICE[d.getFullYear()] === key(d)) out.push('solstice');
  if (m === 12 && (dd === 24 || dd === 25)) out.push('xmas');
  if (LANTERN[d.getFullYear()] === key(d)) out.push('lantern');
  if (MID_AUTUMN[d.getFullYear()] === key(d)) out.push('mid_autumn');
  if ((d.getDay() === 6 || d.getDay() === 0) && left > 0) out.push('weekly');
  if (d.getDay() === 3) out.push('fish_cup');
  if (d.getDay() === 5) out.push('bug_cup');
  return out;
}
export const fireworksTime = (d) => { d = d || now(); const h = d.getHours(), ev = active(d); if (((S().rating || {}).best || 1) >= 5 && h >= 19 && h < 22) return true; return (ev.includes('halloween') && d.getDate() === 31 && h >= 19 && h < 23) || (ev.includes('newyear') && (h >= 19 || h < 2)) || ((ev.includes('after') || ev.includes('d100') || ev.includes('mid_autumn')) && h >= 19 && h < 23); };

/* ---------- 場景佈置 ---------- */
// W27：底部原點、原擺位與活動邏輯不變；所有輪廓為低面數實體，只有文字用透明字圖。
const deco = new THREE.Group(); deco.name = 'event-decorations'; scene.add(deco);
let leafBase = null, decoGeometries = new Set();
const sharedEventGeometries = new WeakSet(), bannerMats = new Map();
const FEST = {
  weekly: ['#CAB4D8', '#F3BDD2', 'book'], d100: ['#E8C48B', '#CFBEE8', 'hourglass'],
  d30: ['#E1B8B1', '#FFF0D4', 'pencil'], d7: ['#AD9ABD', '#F5DBA6', 'seven'],
  cram: ['#9FB994', '#F5DBA6', 'pencil'], examday: ['#BCD0A9', '#FFF0D4', 'laurel'],
  eve: ['#9186A8', '#F9DCE5', 'moon'], after: ['#F3BDD2', '#A7DCD9', 'bow'],
  newyear: ['#CAB4D8', '#F5DBA6', 'comet'], spring: ['#F3BDD2', '#F9DCE5', 'flower'],
  mid_autumn: ['#E1B8B1', '#F5DBA6', 'moon'], solstice: ['#B7C7E2', '#FFF0D4', 'bowl'],
  xmas: ['#7F9E92', '#E1B8B1', 'star'], lantern: ['#E1B8B1', '#F5DBA6', 'lantern'],
  halloween: ['#CAB4D8', '#EAB084', 'bat'], fish_cup: ['#A7DCD9', '#B7C7E2', 'fish'],
  bug_cup: ['#BCD0A9', '#CFBEE8', 'butterfly']
};
const wood = () => M('#CDA67E'), cream = () => M('#F0E5D5'), gold = () => M('#E8C48B');
function warm(color = '#FFD39D', strength = 0.38) {
  const m = M(color, { emissive: new THREE.Color(color), emissiveIntensity: strength, roughness: 0.8 });
  m.userData.glowK = strength;
  if (!nightMats.includes(m)) nightMats.push(m);
  return m;
}
function tube(g, points, radius, mat, segments = 8, sides = 4) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const m = mesh(new THREE.TubeGeometry(curve, segments, radius, sides, false), mat); g.add(m); return m;
}
function relief(g, points, mat, x, y, z = 0, depth = 0.05) {
  const shape = new THREE.Shape(); points.forEach(([px, py], i) => i ? shape.lineTo(px, py) : shape.moveTo(px, py)); shape.closePath();
  const m = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 3 }), mat, x, y, z - depth / 2); g.add(m); return m;
}
function flower(g, x, y, z, color, size = 0.13) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, p = mesh(geo, M(color), x + Math.cos(a) * size * 0.6, y + Math.sin(a) * size * 0.6, z);
    p.scale.set(size * 0.65, size * 0.5, size * 0.35); p.rotation.z = a; g.add(p);
  }
  const core = mesh(geo, gold(), x, y, z + size * 0.27); core.scale.setScalar(size * 0.28); g.add(core);
}
function bow(g, x, y, z, color, scale = 1) {
  const b = new THREE.Group(); b.position.set(x, y, z); b.scale.setScalar(scale); g.add(b);
  [-1, 1].forEach(s => {
    tube(b, [[0, 0, 0], [s * 0.24, 0.16, 0.025], [s * 0.33, 0.03, 0.04], [s * 0.16, -0.035, 0.015], [0, 0, 0]], 0.055, M(color), 6, 3);
    relief(b, [[0, 0], [s * 0.13, -0.08], [s * 0.22, -0.48], [s * 0.1, -0.39], [s * 0.035, -0.49]], M(color), 0, 0, -0.015, 0.025);
  });
  const knot = mesh(new THREE.IcosahedronGeometry(0.09, 0), gold(), 0, 0, 0.055); b.add(knot);
}
function starPoints(n = 5, r = 0.17) {
  return Array.from({ length: n * 2 }, (_, i) => { const a = Math.PI / 2 + i / n * Math.PI; return [Math.cos(a) * r * (i % 2 ? 0.46 : 1), Math.sin(a) * r * (i % 2 ? 0.46 : 1)]; });
}
function crest(g, kind, mat) {
  const c = new THREE.Group(); c.position.set(0, 4.12, 0.18); g.add(c);
  const shape = p => relief(c, p, mat, 0, 0);
  if (kind === 'moon') { // 凹月輪廓本身有側壁；背面也完整。
    const p = []; for (let i = 0; i <= 10; i++) { const a = .65 + i / 10 * (Math.PI * 2 - 1.3); p.push([Math.cos(a) * .17, Math.sin(a) * .17]); }
    for (let i = 0; i <= 7; i++) { const a = -1.9 - i / 7 * 2.48; p.push([.10 + Math.cos(a) * .135, Math.sin(a) * .135]); } shape(p);
  } else if (kind === 'flower') flower(c, 0, 0, 0, '#F3BDD2', .16);
  else if (kind === 'fish') { shape([[-.18,0],[-.05,.10],[.11,.07],[.2,.13],[.18,0],[.2,-.13],[.11,-.07],[-.05,-.10]]); c.add(mesh(new THREE.IcosahedronGeometry(.022,0), M('#777A98'), -.09,.025,.035)); }
  else if (kind === 'butterfly') { [-1,1].forEach(s => { const w=mesh(new THREE.IcosahedronGeometry(.14,0),mat,s*.095,.025,0);w.scale.set(.8,1,.4);w.rotation.z=-s*.35;c.add(w); }); c.add(mesh(new THREE.CylinderGeometry(.025,.025,.22,5),wood())); }
  else if (kind === 'bat') shape([[-.24,.03],[-.15,.14],[-.11,.04],[-.055,.08],[-.035,.14],[0,.08],[.035,.14],[.055,.08],[.11,.04],[.15,.14],[.24,.03],[.14,-.04],[.10,-.09],[.04,-.07],[0,-.13],[-.04,-.07],[-.10,-.09],[-.14,-.04]]);
  else if (kind === 'book') { [-1,1].forEach(s => { const p=relief(c,[[0,-.1],[s*.2,-.06],[s*.2,.12],[s*.025,.08]],cream(),0,0,0,.045);p.rotation.y=s*.2; }); c.add(mesh(new THREE.BoxGeometry(.025,.21,.07),mat)); }
  else if (kind === 'pencil') { const p=mesh(new THREE.CylinderGeometry(.065,.065,.25,6),mat);p.rotation.z=-.45;c.add(p);const tip=mesh(new THREE.ConeGeometry(.065,.11,6),wood(),.075,.15,0);tip.rotation.z=-.45;c.add(tip); }
  else if (kind === 'hourglass') { shape([[-.13,.15],[.13,.15],[.04,0],[.13,-.15],[-.13,-.15],[-.04,0]]); }
  else if (kind === 'seven') { for(let i=0;i<7;i++)relief(c,starPoints(5,.045),mat,(i-3)*.065,Math.sin(i/6*Math.PI)*.08-.04,0,.03); }
  else if (kind === 'laurel') { [-1,1].forEach(s=>{for(let i=0;i<4;i++){const p=mesh(new THREE.OctahedronGeometry(.07,0),mat,s*(.08+Math.sin(i*.65)*.09),-.12+i*.075,0);p.scale.set(.6,1,.35);p.rotation.z=-s*.6;c.add(p);}}); }
  else if (kind === 'bowl') { shape([[-.19,.02],[.19,.02],[.13,-.13],[-.13,-.13]]); [-.09,0,.09].forEach((x,i)=>c.add(mesh(new THREE.IcosahedronGeometry(.055,0),cream(),x,.045+(i===1?.025:0),0))); }
  else if (kind === 'lantern') { c.add(mesh(new THREE.CylinderGeometry(.09,.09,.20,8,1),warm('#F5DBA6',.3))); [-.12,.12].forEach(y=>c.add(mesh(new THREE.CylinderGeometry(.1,.1,.035,8),wood(),0,y,0))); }
  else if (kind === 'bow') bow(c,0,0,0,'#F3BDD2',.5);
  else { shape(starPoints()); if(kind==='comet')relief(c,[[-.1,-.05],[-.4,-.14],[-.28,.01],[-.1,.03]],M('#CAB4D8'),0,0,-.01,.03); }
}
function banner(event) {
  const g = new THREE.Group(), w = 3.8, h = .65, r = .10, s = new THREE.Shape();
  s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  g.add(mesh(new THREE.ExtrudeGeometry(s,{depth:.02,bevelEnabled:true,bevelThickness:.01,bevelSize:.018,bevelSegments:1,curveSegments:3}),cream(),0,0,-.01));
  if (!bannerMats.has(event)) {
    const cv=document.createElement('canvas');cv.width=1024;cv.height=176;const ctx=cv.getContext('2d');
    let size=118;ctx.textAlign='center';ctx.textBaseline='middle';
    do{ctx.font=`900 ${size--}px "M PLUS Rounded 1c", "Microsoft JhengHei", sans-serif`;}while(ctx.measureText(BANNER[event]).width>950&&size>22);
    ctx.fillStyle='#685772';ctx.fillText(BANNER[event],512,91);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    bannerMats.set(event,M('#ffffff',{map:tex,alphaTest:.35,roughness:.9}));
  }
  [-1,1].forEach(s=>{const text=mesh(new THREE.PlaneGeometry(3.65,.57),bannerMats.get(event),0,0,s*.022,{noCast:true});text.rotation.y=s===1?0:Math.PI;g.add(text);});
  g.traverse(o=>{o.userData.camThrough=true;});return g;
}
function eventArch(event) {
  const g=new THREE.Group();g.name='arch';g.userData.event=event;
  const [accent,secondary,kind]=FEST[event], trim=M(accent);
  [-2.08,2.08].forEach((x,i)=>{
    g.add(mesh(new THREE.CylinderGeometry(.105,.13,3.83,8),wood(),x,1.915,0),mesh(new THREE.CylinderGeometry(.19,.21,.18,8),cream(),x,.09,0));
    [.23,3.65].forEach(y=>g.add(mesh(new THREE.CylinderGeometry(.14,.14,.08,8),gold(),x,y,0)));
    g.add(mesh(new THREE.BoxGeometry(.26,.25,.27),wood(),x,3.8,0)); // 榫接肩座
    flower(g,x,3.70,.18,i?secondary:accent,.16);flower(g,x+(i?-.14:.14),3.94,.12,secondary,.10);
    for(let j=0;j<3;j++){const leaf=mesh(new THREE.OctahedronGeometry(.16,0),M('#9FB994'),x+(i?-1:1)*(.10+j*.07),3.57-j*.12,.10-j*.04);leaf.scale.set(.5,1,.3);leaf.rotation.z=(i?-1:1)*.6;g.add(leaf);}
    bow(g,x+(i?-.10:.10),2.9,.14,accent,.8);
    tube(g,[[x-.06,.65,.06],[x+.12,1.2,.05],[x-.11,1.85,-.02],[x+.05,2.45,.06]],.025,M('#7F9E92'),8,3);
  });
  tube(g,[[-2.18,3.82,0],[-1.5,4.16,0],[0,4.21,0],[1.5,4.16,0],[2.18,3.82,0]],.10,wood(),12,6);
  const b=banner(event);b.position.set(0,3.67,.04);g.add(b);
  [-1.5,1.5].forEach(x=>tube(g,[[x,4.16,0],[x,4.05,0],[x,3.99,.04]],.018,gold(),2,4));
  tube(g,[[-2.15,3.25,.02],[0,3.02,.06],[2.15,3.25,.02]],.016,wood(),10,3);
  for(let i=0;i<7;i++){
    const x=-1.8+i*.6,y=3.03+.2*(x/2.15)**2;
    relief(g,[[-.105,0],[.105,0],[.08,-.24],[0,-.19],[-.08,-.24]],M(i%2?secondary:accent),x,y,.06,.025);
    if(i%2===0)g.add(mesh(new THREE.IcosahedronGeometry(.045,0),warm(),x,y+.015,.085,{noCast:true}));
  }
  crest(g,kind,trim);return g;
}
function eventLantern(event, index) {
  const g=new THREE.Group();g.name='lantern';const [accent]=FEST[event];
  g.add(mesh(new THREE.CylinderGeometry(.03,.035,1.3,6),wood(),0,.65,0));
  // 10 道立體紙褶，紙面低發光；木框與陶粉帽保持不發光。
  const profile=[[0,1.19],[.13,1.21],[.20,1.3],[.215,1.43],[.18,1.55],[.11,1.58],[0,1.59]];
  const geo=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),20);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(x,z),k=1+.045*Math.cos(a*10);p.setX(i,x*k);p.setZ(i,z*k);}geo.computeVertexNormals();
  g.add(mesh(geo,warm(index%2?'#FFF0D4':'#F5DBA6',.28)));
  [1.20,1.59].forEach(y=>g.add(mesh(new THREE.CylinderGeometry(.125,.125,.045,10),M(accent),0,y,0)));
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const pts=profile.slice(1,-1).map(([r,y])=>[Math.sin(a)*(r*1.045+.012),y,Math.cos(a)*(r*1.045+.012)]);tube(g,pts,.006,wood(),3,3);}
  tube(g,[[0,1.61,0],[.03,1.67,0],[0,1.72,0],[-.03,1.67,0],[0,1.61,0]],.008,wood(),4,3);
  g.add(mesh(new THREE.CylinderGeometry(.009,.009,.10,5),gold(),0,1.13,0),mesh(new THREE.ConeGeometry(.035,.085,5),M(accent),0,1.055,0));
  return g;
}
function eventPumpkin() {
  const g=new THREE.Group();g.name='pumpkin';
  const shell=new THREE.SphereGeometry(.26,32,12),p=shell.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(x,z),k=1.06*(1+.075*Math.cos(a*8));p.setXYZ(i,x*k,p.getY(i)*.85+.22,z*k);}shell.computeVertexNormals();
  const outer=[],inner=[],walls=[],idx=shell.index.array,edges=new Map();
  const v=i=>new THREE.Vector3().fromBufferAttribute(p,i);
  const inEye=(x,y,c)=>{const h=(y-.255)/.09;return h>=0&&h<=1&&Math.abs(x-c)<.065*(1-h);};
  for(let i=0;i<idx.length;i+=3){const ids=[idx[i],idx[i+1],idx[i+2]],verts=ids.map(v),c=verts[0].clone().add(verts[1]).add(verts[2]).divideScalar(3);
    const hole=c.z<-.17&&(inEye(c.x,c.y,-.105)||inEye(c.x,c.y,.105)||(c.y>.115&&c.y<.17&&Math.abs(c.x)<.14));
    if(!hole){verts.forEach(q=>outer.push(...q.toArray()));continue;}
    verts.forEach(q=>inner.push(q.x,q.y,q.z+.015));
    for(let e=0;e<3;e++){const a=ids[e],b=ids[(e+1)%3],key=[a,b].sort((x,y)=>x-y).join(':');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
  }
  edges.forEach(([a,b])=>{const A=v(a),B=v(b),C=B.clone().add(new THREE.Vector3(0,0,.015)),D=A.clone().add(new THREE.Vector3(0,0,.015));[A,B,C,A,C,D].forEach(q=>walls.push(...q.toArray()));});
  for(const [data,mat]of [[outer,M('#DDA27E')],[walls,M('#947B7B')],[inner,warm('#FFC98A',1.9)]]){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(data,3));geo.computeVertexNormals();g.add(mesh(geo,mat));}shell.dispose();
  tube(g,[[0,.42,0],[.015,.49,0],[.055,.52,.015]],.035,M('#7F9E92'),3,5);
  const leaf=mesh(new THREE.OctahedronGeometry(.085,0),M('#9FB994'),.075,.455,.025);leaf.scale.set(1,.25,.6);g.add(leaf);return g;
}
function christmasTree() {
  const g=new THREE.Group();g.name='xmas';const tree=modelClone('PROPMODELS','pine_b');
  if(tree){
    const box=new THREE.Box3().setFromObject(tree),size=box.getSize(new THREE.Vector3());tree.scale.set(2.6/Math.max(size.x,size.z),2.82/size.y,2.6/Math.max(size.x,size.z));tree.position.y=-box.min.y*tree.scale.y;g.add(tree);
    tree.traverse(o=>{if(o.isMesh)sharedEventGeometries.add(o.geometry);});tree.updateMatrixWorld(true);
  }else{ // 沿用體積枝團語彙的低面數備援，不依賴外部模型包完成時間。
    g.add(mesh(new THREE.CylinderGeometry(.14,.20,.7,8),wood(),0,.35,0));
    for(let layer=0;layer<5;layer++)for(let i=0;i<7;i++){const a=i/7*Math.PI*2+layer*.8,r=1.1-layer*.19;const b=mesh(new THREE.IcosahedronGeometry(1,0),M(layer%2?'#9FB994':'#7F9E92'),Math.cos(a)*r*.45,.75+layer*.44,Math.sin(a)*r*.45);b.scale.set(r*.7,.42,r*.7);g.add(b);}
  }
  const ray=new THREE.Raycaster();
  for(let i=0;i<14;i++){
    const a=i*2.4,h=.8+(i%5)*.38,r=1.25-(h-.7)*.42,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a));let pos=dir.clone().multiplyScalar(r);pos.y=h;
    if(tree){ray.set(dir.clone().multiplyScalar(3).setY(h),dir.clone().negate());const hit=ray.intersectObject(tree,true)[0];if(hit)pos=hit.point.clone().addScaledVector(dir,.055);}
    const ball=mesh(new THREE.SphereGeometry(.085+(i%3)*.009,6,4),M(['#E1B8B1','#FFF0D4','#CAB4D8'][i%3]),...pos.toArray());g.add(ball);g.add(mesh(new THREE.CylinderGeometry(.018,.018,.035,5),gold(),pos.x,pos.y+.10,pos.z));
  }
  const pts=[];for(let i=0;i<33;i++){const h=.65+i/32*2.02,a=i/32*Math.PI*6,r=1.17-(h-.65)*.49;pts.push([Math.cos(a)*r,h,Math.sin(a)*r]);if(i%4===0)g.add(mesh(new THREE.IcosahedronGeometry(.045,0),warm(),...pts[i],{noCast:true}));}
  tube(g,pts,.012,gold(),24,3);
  relief(g,starPoints(5,.22),warm('#F5DBA6',.6),0,2.95,0,.09);
  bow(g,0,1.98,.46,'#E1B8B1',.62);return g;
}
let pumpkinGlow = [];
export function refresh() {
  decoGeometries.forEach(geo => geo.dispose()); decoGeometries.clear(); pumpkinGlow.forEach(e => glow.unemit(e)); pumpkinGlow = [];
  while (deco.children.length) deco.remove(deco.children[0]);
  const ev = active();
  const main = ev.find(e => e !== 'spring' && e !== 'cram') || ev[0];
  if (main) {
    const [x, z] = [PLAZA[0], PLAZA[1] - 5.6], y = groundAt(x, z);
    const arch = eventArch(main); arch.position.set(x, y, z); deco.add(arch);
  }
  if (ev.includes('xmas')) {
    const x = PLAZA[0] - 3.2, z = PLAZA[1] + 2.6, y = groundAt(x, z);   // v7.6：廣場西南側（噴泉在東邊、大樹在西北邊）
    const tree = christmasTree(); tree.position.set(x, y, z); deco.add(tree);
  }
  if (ev.some(e => ['eve', 'mid_autumn', 'after', 'newyear', 'd100', 'lantern'].includes(e))) {
    const festival = ev.find(e => ['eve', 'mid_autumn', 'after', 'newyear', 'd100', 'lantern'].includes(e));
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, x = PLAZA[0] + Math.cos(a) * 4.2, z = PLAZA[1] + Math.sin(a) * 4.2 - 0.4, y = groundAt(x, z);
      const lantern = eventLantern(festival, i); lantern.position.set(x, y, z); deco.add(lantern);
    }
  }
  if (ev.includes('halloween')) {
    // v8.7 南瓜燈三五成群放在廣場邊緣、路燈旁與出入口之間（以前十二顆平均排一圈，好幾顆擋在步道正中間），一大兩小、臉朝廣場；
    // 每一群在夜裡有一團真的暖光（glow.js），刻出來的眼睛嘴巴也亮起來
    [[-0.6, 5.9], [0.6, 5.9], [1.66, 5.7], [4.2, 5.8]].forEach(([a, r]) => {
      const cx = PLAZA[0] + Math.cos(a) * r, cz = PLAZA[1] + Math.sin(a) * r - 0.4;
      [[0, 0, 1.15], [0.62, -0.28, 0.78], [-0.5, -0.36, 0.6]].forEach(([t, dr, s], j) => {
        const x = cx - Math.sin(a) * t + Math.cos(a) * dr, z = cz + Math.cos(a) * t + Math.sin(a) * dr, y = groundAt(x, z);
        const pumpkin = eventPumpkin(); pumpkin.scale.setScalar(s); pumpkin.position.set(x, y, z); pumpkin.rotation.y = -a + Math.PI / 2 + (j - 1) * 0.35; deco.add(pumpkin);
      });
      pumpkinGlow.push(glow.emit({ x: cx, y: groundAt(cx, cz) + 0.35, z: cz, kind: 'garden', color: '#ffb070', power: 0.7 }));
    });
  }
  const built = new Set(); deco.traverse(o => { if (o.isMesh && !sharedEventGeometries.has(o.geometry)) built.add(o.geometry); });
  mergeStatic(deco);   // 節慶裝飾擺好就不動：同材質的零件合併（南瓜燈一圈原本六十幾次繪製）
  deco.traverse(o => { o.frustumCulled = cullable(o); if (o.isMesh && !sharedEventGeometries.has(o.geometry)) decoGeometries.add(o.geometry); });
  built.forEach(geo => { if (!decoGeometries.has(geo)) geo.dispose(); });
  // 春櫻：圓樹的葉子換成粉紅（材質由 M() 快取共用）
  const leaf = M('#58b34d', {}, 'sway'); if (!leafBase) leafBase = leaf.color.clone();
  leaf.color.copy(ev.includes('spring') ? new THREE.Color('#ffc4dc') : leafBase);
}

/* ---------- 煙火 ---------- */
export const bursts = [];
const pGeo = n => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); return g; };
let fwT = 0, dotTex = null, burstStyle = 0;
function dot() {
  if (dotTex) return dotTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64); return (dotTex = new THREE.CanvasTexture(cv));
}
let focus = { x: 0, z: 0 };
export function update(dt, night, at) {
  if (at) focus = at;
  if (night > 0.5 && fireworksTime()) {
    fwT -= dt;
    if (fwT <= 0) { fwT = 0.7 + Math.random() * 1.4; launch(); }
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.t += dt; const pos = b.pts.geometry.attributes.position;
    for (let k = 0; k < b.n; k++) { b.v[k * 3 + 1] -= dt * 3; pos.array[k * 3] += b.v[k * 3] * dt; pos.array[k * 3 + 1] += b.v[k * 3 + 1] * dt; pos.array[k * 3 + 2] += b.v[k * 3 + 2] * dt; }
    pos.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.t / 1.8);
    if (b.t > 1.8) { scene.remove(b.pts); b.pts.geometry.dispose(); bursts.splice(i, 1); }
  }
}
function launch() { burst(focus.x + (Math.random() - 0.5) * 28, 6 + Math.random() * 3.5, focus.z - 15 - Math.random() * 7); }
/** 在 (x, y, z) 放一朵煙火（夜祭、升級、稀有生物都用）。opt：n 粒子數、size、speed、color、quiet 不出聲 */
export function burst(x, y, z, opt) {
  opt = opt || {}; const n = opt.n || 140, sp0 = opt.speed || 5;
  // 自動煙火三拍輪替：球花、環花、上揚垂柳；每朵 80% 主色＋兩種輔色，不增加點數或連發頻率。
  // 指定 color 的升級／生物回饋沿用原本的球形與顏色契約。
  const style = opt.color ? 0 : burstStyle++ % 3, geometry = pGeo(n);
  const colors = opt.color ? null : new Float32Array(n * 3);
  const palette = ['#E1B8B1', '#CAB4D8', '#F5DBA6'].map(c => new THREE.Color(c));
  const mainColor = colors ? (burstStyle - 1) % 3 : 0;
  const pts = new THREE.Points(geometry, bend(new THREE.PointsMaterial({ color: opt.color || '#ffffff', vertexColors: !!colors, size: opt.size || 1.4, map: dot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  const pos = geometry.attributes.position, v = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    pos.array[k * 3] = x; pos.array[k * 3 + 1] = y; pos.array[k * 3 + 2] = z;
    const a = Math.random() * 6.283, e = Math.acos(Math.random() * 2 - 1), sp = sp0 + Math.random() * sp0 * 0.4;
    v[k * 3] = Math.sin(e) * Math.cos(a) * sp;
    v[k * 3 + 1] = Math.cos(e) * sp;
    v[k * 3 + 2] = Math.sin(e) * Math.sin(a) * sp;
    if (style === 1) { v[k * 3] = Math.cos(a) * sp; v[k * 3 + 1] = Math.sin(a) * sp; v[k * 3 + 2] *= 0.12; }
    if (style === 2) { v[k * 3] *= 0.65; v[k * 3 + 1] = Math.abs(v[k * 3 + 1]) * 0.85; v[k * 3 + 2] *= 0.65; }
    if (colors) palette[(mainColor + (k % 20 < 16 ? 0 : k % 2 + 1)) % 3].toArray(colors, k * 3);
  }
  if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  pts.renderOrder = 3; pts.frustumCulled = false; scene.add(pts); bursts.push({ pts, v, n, t: 0 });
  if (!opt.quiet) { Audio.sfx('pop'); setTimeout(() => Audio.sfx('bite'), 120); }
}

/* ---------- 島民台詞 ---------- */
export function line(v) {
  const ev = active(); if (!ev.length || Math.random() < 0.4) return null;
  if (ev.includes('halloween') && !v.shop && I.LINES4 && I.LINES4[v.sid] && Math.random() < 0.7) return pick(I.LINES4[v.sid].costume);
  const L6 = !v.shop && I.LINES6 && I.LINES6[v.sid];
  if (L6) { const k = ['examday', 'solstice', 'xmas', 'lantern'].find(e => ev.includes(e)); if (k && L6[k]) return pick(L6[k]); if (ev.includes('cram') && L6.cram && Math.random() < 0.6) return pick(L6.cram); }
  const L1 = (I.LINES && I.LINES[v.shop ? 'shop' : v.sid]) || {}, e = ev.find(x => L1.event && L1.event[x]);
  return e ? pick(L1.event[e]) : null;
}

/* ---------- 活動禮物（每個活動每年一次，寄到信箱） ---------- */
export function gifts(sendLetter, villagers) {
  const s = S(); s.ev = s.ev || { got: {} }; s.ev.got = s.ev.got || {};
  const year = now().getFullYear(), today = active();
  // v7.1：錯過的活動禮物一週內補寄（只補玩家開始玩之後的活動）：活動獎勵是紀念，不是錯過就沒了
  const late = new Set(), born = TA.S.created || 0;
  for (let i = 1; i <= 7; i++) { const d = now(); d.setDate(d.getDate() - i); if (d.getTime() + 864e5 < born) break; active(d).forEach(e => { if (!today.includes(e)) late.add(e); }); }
  today.map(e => [e, false]).concat([...late].map(e => [e, true])).forEach(([e, isLate]) => {
    const f = (I.FURNITURE || []).find(x => x.src === 'event:' + e); const k = e + '-' + (e === 'weekly' ? dayKey() : year);
    if (e === 'weekly' || e === 'fish_cup' || e === 'bug_cup' || s.ev.got[k]) return;
    s.ev.got[k] = true;
    const v = pick(villagers.filter(x => !x.shop)), L1 = (I.LINES && I.LINES[v.sid]) || {}, L6 = (I.LINES6 && I.LINES6[v.sid] && I.LINES6[v.sid][e]) || null, txt = (L1.event && L1.event[e]) ? pick(L1.event[e]) : L6 ? pick(L6) : `${NAMES[e]}快樂！今天也照自己的步調，好好讀書、好好休息。`;
    sendLetter({ from: v.sid, title: `${NAMES[e]}：${v.name}的祝福${isLate ? '（補寄）' : ''}`, open: '給你：', text: (isLate ? `前幾天的${NAMES[e]}沒遇到你，這份還是要給你。` : '') + txt, gift: f ? { type: 'furn', id: f.id } : { type: 'bells', n: 1000 }, giftLine: f ? `隨信附上「${f.name}」，放在房間裡當紀念吧。` : '隨信附上 1000 鈴錢。', close: '—— ' + v.name });
  });
  save();
}

/* ---------- 週末模擬考祭典 ---------- */
const GROUPS = [['chinese'], ['english'], ['math'], ['history', 'geography', 'civics'], ['physics', 'chemistry', 'biology', 'earth']];
const weekKey = () => { const d = now(), day = (d.getDay() + 6) % 7, mon = new Date(d); mon.setDate(d.getDate() - day); return key(mon); };
export const weeklyOn = () => active().includes('weekly');
export const weeklyDone = () => (S().ev || {}).weekly === weekKey();
export async function weeklyMock(sp, giveFurn) {
  const s = S(); s.ev = s.ev || { got: {} };
  if (weeklyDone()) { await ui.say(sp, '這週的模擬考你已經參加過囉！下週末再來挑戰。'); return; }
  await ui.say(sp, '歡迎參加週末模擬考祭典！國、英、數、社、自各 2 題，一共 10 題。不限時，慢慢來。');
  let ok = 0, n = 0;
  for (const g of GROUPS) for (let k = 0; k < 2; k++) {
    const q = pickQ(pick(g)); if (!q) continue; n++;
    const i = await ui.ask(sp, `第 ${n} 題（${TA.subject(q.subject).name}）：` + q.q, q.o, { answer: q.a, abc: true, html: true, keys: true });
    const good = i === q.a; record(q, good); Audio.sfx(good ? 'ok' : 'bad'); if (good) ok++;
    if (!good) await ui.explain(sp, q);
  }
  s.ev.weekly = weekKey(); s.ev.best = Math.max(s.ev.best || 0, ok); save();
  const tier = ok >= 9 ? 'mock_gold' : ok >= 7 ? 'mock_silver' : ok >= 5 ? 'mock_bronze' : null;
  const f = tier && (I.FURNITURE || []).find(x => x.src === 'event:' + tier);
  await ui.say(sp, `你答對了 ${ok} / ${n} 題！${tier ? '這是你的獎盃！' : '下週再來，一定會更好。'}`);
  if (f) await giveFurn(f.id, `模擬考 ${ok} / ${n}`);
  const lamp = !s.ev.weeklyLamp && (I.FURNITURE || []).find(x => x.src === 'event:weekly');   // 第一次參加的紀念（以前這件家具拿不到）
  if (lamp) { s.ev.weeklyLamp = 1; save(); await giveFurn(lamp.id, '第一次參加週末模擬考祭典的紀念'); }
  s.bells += ok * 200; save();
}
