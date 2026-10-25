/* 反應速率活塞槽（ch-react）：固體＋酸產氣推動活塞。一級速率模型 dn/dt＝k(A0−n)，
   k＝k0·2^((T−25)/10)·(催化劑×4)·(粉末×2) 為教學簡化；產氣量以理想氣體定壓換算體積。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 460;
const PLATE = { x: -150, y: -85, w: 305, d: 170, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 140]], W, H, { pad: 26, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const CX = -30, R = 34, BASEZ = 14;

function chamber() {
  const o = [];
  // 加熱座與火焰座
  o.push(S(k.slabOf({ x: CX - 44, y: -44, w: 88, d: 88, r: 4 }, 0, 6, P, 5, 0.6), { tone: "mid" }));
  o.push(S(k.cylinder(CX, 0, 16, 6, 5, P, 40), { tone: "hi", className: "t-navy" }));
  o.push(`<g data-part="flame">${S(k.cylinder(CX, 0, 9, 11, 3, P, 32), { tone: "hi", className: "t-rose" })}</g>`);
  // 反應液與固體床
  o.push(S(k.cylinder(CX, 0, R - 2, BASEZ, 10, P, 56), { tone: "hi", className: "t-sky", crease: "lo" }));
  o.push(`<g data-part="solid">` + (() => { let s = ""; for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = 8 + (i % 3) * 8; s += S(k.cylinder(CX + Math.cos(a) * rr, Math.sin(a) * rr, 4.6, BASEZ + 8, 3.5, P, 14), { tone: "hi", className: "t-gold" }); } return s; })() + `</g>`);
  // 玻璃筒壁刻度柱（四根量柱）
  for (const a of [0.6, 2.2, 3.8, 5.4]) {
    const x = CX + Math.cos(a) * (R + 3), y = Math.sin(a) * (R + 3);
    o.push(post(k, P, HH, x, y, BASEZ, 92, 1.5));
  }
  o.push(S(k.cylinder(CX, 0, R + 5, BASEZ + 94, 3, P, 56), { tone: "mid" })); // 頂環
  o.push(S(k.cylinder(CX, 0, R + 5, BASEZ - 2, 3, P, 56), { tone: "mid" })); // 底環
  for (let i = 1; i <= 5; i++) o.push(L(k.sideArc(CX, 0, R + 1, BASEZ + i * 16, P, 36), { tone: "faint" }));
  o.push(k.faceTextSvg(k.topMatrix([CX, 0], BASEZ - 4, P, "x"), "mL", { size: 3.2, tone: "mid", anchor: "middle" }));
  return o.join("");
}
function piston() {
  const o = [];
  o.push(S(k.cylinder(CX, 0, R - 1, 0, 6, P, 56, 0.5), { tone: "hi", className: "t-mint", crease: "lo" }));
  o.push(S(k.cylinder(CX, 0, 3, 6, 16, P, 20), { tone: "mid", crease: "none" }));
  o.push(S(k.cylinder(CX, 0, 9, 22, 3.5, P, 32), { tone: "mid" }));
  o.push(L(k.knurl(CX, 0, 9, 22, 25.5, 36, P), { tone: "lo" }));
  o.push(D([at([CX, 0, 25.5])], { size: 0.6, tone: "hi" }));
  return o.join("");
}
function sideBench() { // 右側試劑架：催化劑匙、溫度計柱、計時錶
  const o = [];
  const bx = 66;
  o.push(S(k.slabOf({ x: bx - 30, y: -34, w: 66, d: 68, r: 3 }, 0, 8, P, 4, 0.6), { tone: "mid" }));
  o.push(S(k.cylinder(bx - 12, -14, 11, 8, 14, P, 36, 0.4), { tone: "hi", className: "t-rose", crease: "lo" })); // 催化劑罐
  o.push(S(k.cylinder(bx - 12, -14, 11.8, 22, 2.5, P, 36), { tone: "mid" }));
  o.push(k.faceTextSvg(k.topMatrix([bx - 12, -14], 24.7, P, "x"), "催化劑", { size: 2.9, tone: "hi", anchor: "middle" }));
  o.push(post(k, P, HH, bx + 16, 14, 8, 62, 1.6)); // 溫度計桿
  o.push(`<g data-part="therm">${S(k.cylinder(bx + 16, 14, 3.4, 10, 8, P, 20), { tone: "hi", className: "t-sky" })}</g>`);
  o.push(S(k.cylinder(bx + 2, 20, 12, 8, 4, P, 40, 0.5), { tone: "hi", crease: "lo" })); // 碼錶盤
  o.push(L(k.ring(bx + 2, 20, 10, 12, P, 48), { tone: "lo" }));
  o.push(L(k.ring(bx + 2, 20, 8.2, 12, P, 48), { tone: "faint" }));
  const t = k.radialTicks(bx + 2, 20, 10, 24, 6, 12, [0.9, 1.8], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  o.push(knob(k, P, HH, bx - 18, 22, 8, 4.5));
  return o.join("");
}
function gasDots() {
  let dots = "";
  for (let i = 0; i < 14; i++) dots += `<circle data-gas="${i}" r="1.6" fill="#2f6fb4" fill-opacity="0.85"/>`;
  return `<g data-part="gas">${dots}</g>`;
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "反應速率活塞槽：左筒中固體與酸反應產氣，薄荷色活塞被氣體推高；升溫、磨粉、加催化劑都會讓活塞升得更快。",
  body: [basePlate(k, P, HH, PLATE), chamber(), sideBench(), `<g data-part="piston">${piston()}</g>`, gasDots()],
});
const live = `
const P=${JSON.stringify(P)}, CX=${CX}, BASEZ=${BASEZ};
const pisEl=document.querySelector('[data-part="piston"]'), gasEls=$$("[data-gas]"), solEl=document.querySelector('[data-part="solid"]'), flEl=document.querySelector('[data-part="flame"]'), thEl=document.querySelector('[data-part="therm"]');
const stage=document.querySelector(".iso-stage");
let T=25, powder=true, cat=false, run=false, n=0, t=0, touring=!still.matches, tourT=0;
const A0=1, VMAX=120; // 全部反應產氣 120 mL
const kk=()=>0.045*Math.pow(2,(T-25)/10)*(cat?4:1)*(powder?2:1);
const seed=[[0.3,0.85],[-0.5,0.75],[0.7,0.7],[-0.2,0.9],[0.1,0.8],[-0.75,0.6],[0.5,0.88],[-0.4,0.65],[0.85,0.55],[-0.9,0.5],[0.2,0.72],[-0.1,0.95],[0.6,0.62],[-0.6,0.82]];
function draw(){
  const vol=n/A0*VMAX, pz=BASEZ+16+(vol/VMAX)*58;
  pisEl.setAttribute("transform",translateAlong(P,[0,0,pz]));
  const shown=Math.round(n/A0*gasEls.length);
  gasEls.forEach((el,i)=>{ const ph=(t*(0.6+T/40)+i*0.37)%1; const zz=BASEZ+14+ph*Math.max(8,(pz-BASEZ-18));
    const [sx,sy]=iso([CX+seed[i][0]*20,seed[i][1]*20,zz],P); el.setAttribute("cx",sx.toFixed(1)); el.setAttribute("cy",sy.toFixed(1)); el.style.display=i<shown||run?"":"none"; el.setAttribute("fill-opacity",i<shown?"0.85":"0.35");});
  solEl.style.opacity=String(1-0.75*(n/A0));
  flEl.style.opacity=T>26?"1":"0.25";
  thEl.setAttribute("transform",translateAlong(P,[0,0,clamp((T-15)/50,0,1)*36]));
  const rate=kk()*(A0-n)/A0*VMAX;
  setRead("已產氣 "+vol.toFixed(0)+" mL","溫度 "+T.toFixed(0)+"°C、"+(powder?"粉末（接觸面積大）":"塊狀")+"、催化劑"+(cat?"有":"無")+" → 速率常數 k≈"+kk().toFixed(3)+"/s，目前產氣速率≈"+rate.toFixed(1)+" mL/s；已反應 "+(n/A0*100).toFixed(0)+"%、產氣 "+vol.toFixed(0)+" mL。催化劑只加快、不增加總產量（上限 "+VMAX+" mL）。");
}
window.__tick=(dt)=>{
  if(touring){tourT+=dt; if(tourT>0.7)run=true; if(n>=0.995&&tourT>2){n=0;t=0;run=false;tourT=0;}}
  if(run&&n<A0){ n=Math.min(A0,n+kk()*(A0-n)*dt); t+=dt; if(n>=A0)run=false; }
  else if(run)t+=dt;
  draw(); return run||touring;
};
function fresh(){n=0;t=0;run=false;draw();}
document.getElementById("inT").addEventListener("input",ev=>{T=parseFloat(ev.target.value);document.getElementById("inTv").textContent=T.toFixed(0)+"°C";touring=false;draw();wake();});
document.getElementById("bForm").addEventListener("click",ev=>{powder=!powder;ev.target.setAttribute("aria-pressed",String(powder));ev.target.textContent=powder?"固體：粉末":"固體：塊狀";touring=false;draw();});
document.getElementById("bCat").addEventListener("click",ev=>{cat=!cat;ev.target.setAttribute("aria-pressed",String(cat));ev.target.textContent=cat?"催化劑：有":"催化劑：無";touring=false;draw();wake();});
document.getElementById("bGo").addEventListener("click",()=>{touring=false;if(n>=A0)fresh();run=true;wake();idleTour(7000,()=>{touring=true;tourT=0;n=0;t=0;run=false;});});
document.getElementById("bReset").addEventListener("click",()=>{touring=false;fresh();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);touring=false;mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); T=clamp(15+clamp(1-(ev.clientY-r.top)/r.height,0,1)*50,15,65); const s=document.getElementById("inT"); s.value=T; document.getElementById("inTv").textContent=T.toFixed(0)+"°C"; draw(); wake();}
stage.addEventListener("keydown",ev=>{if(ev.key===" "){ev.preventDefault();run=!run;wake();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "reaction-piston", fig: "圖 6 · 化學", title: "反應速率槽：產氣活塞",
  hint: "上下拖改溫度，按「開始反應」看活塞上升", readout: "已產氣 0 mL", detail: "升溫、磨粉、催化劑都會加速。",
  keys: [{ mark: "lit", label: "薄荷活塞＋藍氣泡" }, { mark: "raised", label: "金色固體反應物" }],
  point: "濃度、溫度、接觸面積、催化劑↑速率↑；催化劑不改變產量（倍率為簡化）。",
  svg, live,
  controls: `<label>溫度 <input id="inT" type="range" min="15" max="65" step="1" value="25"><span class="val" id="inTv">25°C</span></label>
<button id="bForm" type="button" aria-pressed="true">固體：粉末</button><button id="bCat" type="button" aria-pressed="false">催化劑：無</button>
<button id="bGo" type="button">開始反應</button><button id="bReset" type="button">重置</button>`,
});
