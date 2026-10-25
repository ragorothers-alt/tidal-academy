/* 高爾頓落珠板（ma2-prob）：每顆珠子連續碰 6 排釘，每排獨立以 1/2 向左或向右，
   等同擲 6 枚公正硬幣；落入第 k 格＝出現 k 次正面（向右），理論機率 C(6,k)/2⁶。
   實驗次數由實際亂數累計，理論值另外算出供對照；樣本少時頻率本來就會偏離理論。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 460;
const PLATE = { x: -160, y: -110, w: 320, d: 220, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 86]], W, H, { pad: 24, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const BZ = 8, ROWY = -60, DY = 19, DX = 26, SEG = 7, SEGH = 8;

function board() {
  const o = [];
  o.push(S(k.slabOf({ x: -132, y: -96, w: 264, d: 192, r: 4 }, 0, BZ, P, 4, 0.6), { tone: "mid" }));
  // 投珠斗與入口軌
  o.push(S(k.slabOf({ x: -18, y: -104, w: 36, d: 16, r: 2 }, BZ, 12, P, 3, 0.5), { tone: "hi", className: "t-gold" }));
  o.push(k.faceTextSvg(k.topMatrix([0, -96], BZ + 12.3, P, "x"), "投珠口", { size: 3.4, tone: "hi", anchor: "middle" }));
  o.push(S(k.slabOf({ x: -3, y: -92, w: 6, d: 22, r: 1 }, BZ, 2, P, 2), { tone: "hi" }));
  o.push(post(k, P, HH, -22, -88, BZ, 20, 1.5));
  o.push(post(k, P, HH, 22, -88, BZ, 20, 1.5));
  // 六排釘
  for (let r = 0; r < 6; r++) for (let i = 0; i <= r; i++) {
    const x = (i - r / 2) * DX, y = ROWY + r * DY;
    o.push(S(k.cylinder(x, y, 2.6, BZ, 7, P, 14), { tone: "hi", className: "t-navy", crease: "lo" }));
    o.push(D([at([x, y, BZ + 7])], { size: 0.4, tone: "hi" }));
  }
  // 兩側導板
  o.push(S(k.slabOf({ x: -104, y: -70, w: 5, d: 118, r: 1.5 }, BZ, 9, P, 2, 0.4), { tone: "mid" }));
  o.push(S(k.slabOf({ x: 99, y: -70, w: 5, d: 118, r: 1.5 }, BZ, 9, P, 2, 0.4), { tone: "mid" }));
  // 七個收集格：隔板 + 計數柱 + 格號（正面次數）
  for (let kk = 0; kk <= 6; kk++) {
    const cx = (kk - 3) * DX;
    for (let i = 0; i < SEG; i++) o.push(`<g data-bin="${kk}-${i}">${S(k.cylinder(cx, 70, 5.6, BZ + 2 + i * SEGH, SEGH - 0.8, P, 18), { tone: "hi", className: kk === 3 ? "t-gold" : "t-sky", crease: "none" })}</g>`);
    o.push(S(k.cylinder(cx, 70, 7, BZ, 2, P, 20), { tone: "mid" }));
    o.push(k.faceTextSvg(k.topMatrix([cx, 92], BZ + 0.5, P, "x"), String(kk), { size: 4, tone: "hi", anchor: "middle" }));
  }
  for (let wI = 0; wI <= 7; wI++) o.push(S(k.slabOf({ x: (wI - 3.5) * DX - 1.6, y: 56, w: 3.2, d: 30, r: 1 }, BZ, 10, P, 2, 0.4), { tone: "mid" }));
  o.push(k.faceTextSvg(k.topMatrix([0, 104], 0.5, P, "x"), "格號＝正面次數（共擲 6 枚）", { size: 3.2, tone: "hi", anchor: "middle" }));
  o.push(knob(k, P, HH, -138, -88, 0, 5));
  o.push(S(k.slabOf({ x: 112, y: 70, w: 38, d: 24, r: 2 }, 0, 4, P, 3), { tone: "hi", crease: "lo" }));
  o.push(k.faceTextSvg(k.topMatrix([131, 82], 4.3, P, "x"), "每排左右各半", { size: 3, tone: "hi", anchor: "middle" }));
  return o.join("");
}
function ball() {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -7, y: -7, w: 14, d: 14, r: 6 }, BZ, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.cylinder(0, 0, 5.4, BZ, 2.5, P, 24), { tone: "hi", className: "t-rose" }));
  o.push(S(k.cylinder(0, 0, 4.2, BZ + 2.5, 3.5, P, 24), { tone: "hi", className: "t-gold", crease: "lo" }));
  o.push(D([at([0, 0, BZ + 6])], { size: 0.9, tone: "hi" }));
  return o.join("");
}
function thMark() {
  return S(k.cylinder(0, 0, 3.2, BZ, 2, P, 16), { tone: "hi", className: "t-navy" });
}
let ths = "";
for (let kk = 0; kk <= 6; kk++) ths += `<g data-th="${kk}">${thMark()}</g>`;
const svg = k.figureSvg({
  width: W, height: H,
  label: "高爾頓落珠板：珠子連續碰六排釘後落入七格之一，格號是出現正面的次數，柱高是實際次數，深色小標是理論期望次數的高度。",
  body: [basePlate(k, P, HH, PLATE), board(), ths, `<g data-part="ball">${ball()}</g>`],
});
const live = `
const P=${JSON.stringify(P)}, BZ=${BZ}, ROWY=${ROWY}, DY=${DY}, DX=${DX}, SEG=${SEG}, SEGH=${SEGH};
const ballEl=document.querySelector('[data-part="ball"]');
const C6=[1,6,15,20,15,6,1];
let counts=[0,0,0,0,0,0,0], total=0, queue=0, path=null, stepT=0, fast=false;
function onePath(){ const ds=[]; let kk=0; for(let i=0;i<6;i++){const right=Math.random()<0.5?1:0; ds.push(right); kk+=right;} return {ds,kk}; }
function pointsOf(ds){ const pts=[[0,-80]]; let x=0; for(let r=0;r<6;r++){ x+=(ds[r]?1:-1)*DX/2; pts.push([x, ROWY+r*DY+9]); } pts.push([x,70]); return pts; }
function placeBall(x,y){ ballEl.setAttribute("transform",translateAlong(P,[x,y,0])); }
function draw(){
  const exp=C6.map(c=>total*c/64);
  const mx=Math.max(1,...counts,...exp);
  $$("[data-bin]").forEach(el=>{const [kk,i]=el.dataset.bin.split("-").map(Number); el.style.opacity=i<Math.round(counts[kk]/mx*SEG)?"1":"0.12";});
  $$("[data-th]").forEach(el=>{const kk=Number(el.dataset.th); el.style.opacity=total?"1":"0"; el.setAttribute("transform",translateAlong(P,[(kk-3)*DX+9,70, 2+exp[kk]/mx*SEG*SEGH]));});
  if(!total){ setRead("尚未投珠","每顆珠子連碰 6 排釘，就像擲 6 枚公正硬幣。先投 1 顆看路徑，再投 100 顆比一比：第 3 格（恰 3 次正面）的理論機率是 C(6,3)/2^6＝20/64≈31.3%。"); return; }
  let best=0; counts.forEach((c,i)=>{if(c>counts[best])best=i;});
  setRead("共 "+total+" 顆 · 正面 3 次佔 "+(counts[3]/total*100).toFixed(1)+"%",
   "共投 "+total+" 顆。正面 3 次：實驗 "+counts[3]+"/"+total+"＝"+(counts[3]/total*100).toFixed(1)+"%，理論 C(6,3)/2^6＝20/64≈31.3%（期望約 "+exp[3].toFixed(1)+" 顆，深色小標是各格期望高度）。目前最多的是正面 "+best+" 次（"+counts[best]+" 顆）。顆數越多，頻率通常越靠近理論，但每一批都可能偏離。");
}
function finishBall(){ counts[path.kk]++; total++; path=null; queue--; draw(); if(queue>0) startBall(); else placeBall(0,-80); }
function startBall(){ path=onePath(); path.pts=pointsOf(path.ds); stepT=0; placeBall(path.pts[0][0],path.pts[0][1]); }
window.__tick=(dt)=>{
  if(!path) return false;
  const dur=fast?0.55:1.05, steps=path.pts.length-1;
  stepT+=dt/dur*steps;
  const i=Math.min(Math.floor(stepT),steps-1), f=clamp(stepT-i,0,1);
  const a=path.pts[i], b=path.pts[i+1];
  placeBall(lerp(a[0],b[0],f), lerp(a[1],b[1],f));
  if(stepT>=steps) finishBall();
  return !!path||queue>0;
};
function drop(m,instant){
  if(instant||still.matches){ for(let i=0;i<m;i++){counts[onePath().kk]++; total++;} draw(); return; }
  fast=m>1; queue+=m; if(!path) startBall(); wake();
}
document.getElementById("b1").addEventListener("click",()=>drop(1,false));
document.getElementById("b10").addEventListener("click",()=>drop(10,false));
document.getElementById("b100").addEventListener("click",()=>drop(100,true));
document.getElementById("bClr").addEventListener("click",()=>{counts=[0,0,0,0,0,0,0]; total=0; queue=0; path=null; placeBall(0,-80); draw();});
const stage=document.querySelector(".iso-stage");
stage.addEventListener("keydown",ev=>{if(ev.key===" "){ev.preventDefault(); drop(1,false);}});
placeBall(0,-80); draw();
`;
emit({
  k, kitScript, id: "galton-board", fig: "圖 14 · 數學", title: "高爾頓落珠板：正面次數的分布",
  hint: "按投珠鈕累積次數，比較柱高與深色理論標記", readout: "尚未投珠", detail: "落入第 3 格就像 6 枚硬幣恰好 3 枚正面。",
  keys: [{ mark: "lit", label: "金珠＝正在落下的一顆" }, { mark: "raised", label: "柱高＝實際次數" }, { mark: "edge", label: "深色小標＝理論期望高度" }],
  point: "獨立且機率固定才用二項公式（本圖每次成功率 1/2）。",
  svg, live,
  controls: `<button id="b1" type="button">投 1 顆</button><button id="b10" type="button">連投 10 顆</button><button id="b100" type="button">快速投 100 顆</button><button id="bClr" type="button">清除重來</button>`,
});
