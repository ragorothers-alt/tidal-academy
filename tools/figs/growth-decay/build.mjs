/* 成長衰減機（ma1-explog）：繪圖機床上 9 根量柱是 A(n)＝100·rⁿ（n＝0…8 期）。
   線性刻度直接比高度；對數刻度比 log₁₀A，每期增減固定 log₁₀r，所以變成等距。
   門檻期數以 log(目標/100)/log r 求臨界值，再取第一個滿足「嚴格超過／低於」的完整期數並代回核對。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 460;
const PLATE = { x: -160, y: -100, w: 320, d: 200, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 108]], W, H, { pad: 24, azimuth: 40 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const X0 = -112, DX = 27, CY = 18, BZ = 8, SEG = 7, SEGH = 11;

function plotter() {
  const o = [];
  o.push(S(k.slabOf({ x: -142, y: -46, w: 284, d: 108, r: 4 }, 0, BZ, P, 4, 0.6), { tone: "mid" }));
  // 橫向雙軌 + 期數刻點
  for (const y of [CY - 20, CY + 20]) o.push(S(k.slabOf({ x: -136, y: y - 2.5, w: 272, d: 5, r: 1 }, BZ, 2.5, P, 2, 0.4), { tone: "hi" }));
  for (let n = 0; n <= 8; n++) {
    o.push(D([at([X0 + n * DX, CY + 20, BZ + 2.5])], { size: 0.55 }));
    o.push(k.faceTextSvg(k.topMatrix([X0 + n * DX, CY + 32], BZ + 0.5, P, "x"), String(n), { size: 3.4, tone: "hi", anchor: "middle" }));
  }
  o.push(k.faceTextSvg(k.topMatrix([X0 + 4 * DX, CY + 46], BZ + 0.5, P, "x"), "期數 n", { size: 3.4, tone: "hi", anchor: "middle" }));
  // 每期量柱：9 節，live 依刻度開關
  for (let n = 0; n <= 8; n++) {
    const cx = X0 + n * DX;
    o.push(S(k.cylinder(cx, CY, 9.5, BZ, 3, P, 20), { tone: "mid" }));
    for (let i = 0; i < SEG; i++) o.push(`<g data-col="${n}-${i}">${S(k.cylinder(cx, CY, 7.8, BZ + 3 + i * SEGH, SEGH - 0.7, P, 20), { tone: "hi", className: n % 2 ? "t-mint" : "t-sky", crease: "none" })}</g>`);
    o.push(S(k.cylinder(cx, CY, 8.6, BZ + 3 + SEG * SEGH, 2.4, P, 20), { tone: "mid" }));
  }
  // 起始量倉
  o.push(S(k.slabOf({ x: -150, y: CY - 14, w: 18, d: 28, r: 2 }, 0, 18, P, 3, 0.5), { tone: "hi", className: "t-gold" }));
  o.push(k.faceTextSvg(k.topMatrix([-141, CY], 18.3, P, "x"), "100", { size: 3.6, tone: "hi", anchor: "middle" }));
  o.push(knob(k, P, HH, 138, CY + 34, 0, 5));
  o.push(post(k, P, HH, 138, CY - 34, 0, 40, 1.7));
  o.push(S(k.cylinder(138, CY - 34, 4, 40, 3, P, 22), { tone: "hi", className: "t-sky" }));
  o.push(S(k.slabOf({ x: 96, y: CY + 44, w: 52, d: 20, r: 2 }, 0, 3, P, 3), { tone: "hi", crease: "lo" }));
  o.push(k.faceTextSvg(k.topMatrix([122, CY + 54], 3.3, P, "x"), "起始量 100 單位", { size: 3, tone: "hi", anchor: "middle" }));
  return o.join("");
}
function marker() {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -9, y: -9, w: 18, d: 18, r: 8 }, BZ, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.cylinder(0, 0, 10.5, BZ, 2.5, P, 36), { tone: "hi", className: "t-gold" }));
  o.push(S(k.cylinder(0, 0, 3, BZ + 2.5, 8, P, 20), { tone: "hi", className: "t-gold", crease: "lo" }));
  o.push(D([at([0, 0, BZ + 10.5])], { size: 1, tone: "hi" }));
  return o.join("");
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "成長衰減繪圖機：九根量柱分別是第 0 到第 8 期的量，每期乘上同一倍率；切換對數刻度後每期增減變成等距離。",
  body: [basePlate(k, P, HH, PLATE), plotter(), `<g data-part="mark">${marker()}</g>`],
});
const live = `
const P=${JSON.stringify(P)}, X0=${X0}, DX=${DX}, CY=${CY};
const stage=document.querySelector(".iso-stage");
const mark=document.querySelector('[data-part="mark"]');
let pct=-20, n=3, logMode=false;
const A0=100;
const vals=()=>{const r=1+pct/100; return Array.from({length:9},(_,i)=>A0*Math.pow(r,i));};
const fmt=(v,d=1)=>v.toLocaleString("zh-TW",{maximumFractionDigits:d,minimumFractionDigits:0});
function draw(){
  const r=1+pct/100, vs=vals(), A=vs[n];
  let hs;
  if(logMode){ const ls=vs.map(v=>Math.log10(v)); const lo=Math.min(...ls,0.8), hi=Math.max(...ls,2.2); hs=ls.map(v=>(v-lo)/(hi-lo)); }
  else { const mx=Math.max(...vs); hs=vs.map(v=>v/mx); }
  $$("[data-col]").forEach(el=>{const [cn,ci]=el.dataset.col.split("-").map(Number); el.style.opacity=ci<Math.round(hs[cn]*${SEG})?"1":"0.12";});
  mark.setAttribute("transform",translateAlong(P,[X0+n*DX,CY+30,0]));
  let cross="";
  if(pct>0){ const f=Math.log(2)/Math.log(r); const fc=Math.floor(f)+1; cross="首次「嚴格超過兩倍（200）」：臨界 log 2/log "+r.toFixed(2)+"≈"+f.toFixed(2)+" 期，第一個完整期數是第 "+fc+" 期（第 "+fc+" 期＝"+fmt(A0*Math.pow(r,fc))+(fc>0?"，前一期＝"+fmt(A0*Math.pow(r,fc-1)):"")+"）。"; }
  else if(pct<0){ const f=Math.log(0.5)/Math.log(r); const fc=Math.floor(f)+1; cross="首次「嚴格低於一半（50）」：臨界 log 0.5/log "+r.toFixed(2)+"≈"+f.toFixed(2)+" 期，第一個完整期數是第 "+fc+" 期（第 "+fc+" 期＝"+fmt(A0*Math.pow(r,fc))+"，前一期＝"+fmt(A0*Math.pow(r,fc-1))+"）。"; }
  else cross="倍率為 1，量不增不減，沒有門檻期數。";
  const step=logMode?"對數刻度下每期移動 log₁₀"+r.toFixed(2)+"＝"+Math.log10(r).toFixed(3)+" 格，所以等距。":"線性刻度直接比量的大小（柱高以 9 期中最大量為滿格）。";
  setRead("第 "+n+" 期 · "+fmt(A)+" 單位",
   "每期"+(pct>0?"增加 "+pct+"%":pct<0?"減少 "+(-pct)+"%":"不變")+"，倍率 r＝"+r.toFixed(2)+"。第 "+n+" 期 A＝100×"+r.toFixed(2)+"^"+n+"＝"+fmt(A)+" 單位，log₁₀A≈"+Math.log10(A).toFixed(2)+"。"+cross+step);
  document.getElementById("inPv").textContent=(pct>0?"+":"")+pct+"%";
  document.getElementById("inNv").textContent="第 "+n+" 期";
  document.querySelectorAll("[data-scale]").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.scale==="log")===logMode)));
}
document.getElementById("inP").addEventListener("input",ev=>{pct=parseFloat(ev.target.value); draw();});
document.getElementById("inN").addEventListener("input",ev=>{n=parseInt(ev.target.value); draw();});
document.querySelectorAll("[data-scale]").forEach(b=>b.addEventListener("click",()=>{logMode=b.dataset.scale==="log"; draw();}));
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true; stage.setPointerCapture(ev.pointerId); mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); n=clamp(Math.round((ev.clientX-r.left)/r.width*9-0.5),0,8); document.getElementById("inN").value=n; draw();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowRight"){n=clamp(n+1,0,8);draw();} if(ev.key==="ArrowLeft"){n=clamp(n-1,0,8);draw();}});
draw();
`;
emit({
  k, kitScript, id: "growth-decay", fig: "圖 13 · 數學", title: "成長衰減機：每期倍率與對數刻度",
  hint: "拉每期變化率，在量柱上左右拖選期數，再切對數刻度比一比", readout: "第 3 期 · 51 單位", detail: "每期乘上同一倍率，不是加同一數量。",
  keys: [{ mark: "lit", label: "金標記＝目前選的期數" }, { mark: "raised", label: "量柱＝該期的量（依刻度縮放）" }],
  point: "每期乘同倍率 A＝A₀rⁿ；求期數取對數，完整的期數再前後代入核對。",
  svg, live,
  controls: `<label>每期變化 <input id="inP" type="range" min="-50" max="60" step="5" value="-20"><span class="val" id="inPv">-20%</span></label>
<label>期數 <input id="inN" type="range" min="0" max="8" step="1" value="3"><span class="val" id="inNv">第 3 期</span></label>
<button type="button" data-scale="lin" aria-pressed="true">線性刻度</button><button type="button" data-scale="log" aria-pressed="false">對數刻度</button>`,
});
