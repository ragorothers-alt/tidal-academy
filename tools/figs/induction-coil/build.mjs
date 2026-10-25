/* 電磁感應實驗台（ph-em）：磁鐵進出直立線圈，檢流計偏轉。
   磁通量模型 Φ∝1/(1+(d/28)²)（d 為磁鐵尖端到線圈中心距離，示意），ε＝−N·dΦ/dt 數值微分。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 460;
const PLATE = { x: -150, y: -85, w: 305, d: 170, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 150]], W, H, { pad: 26, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const CX = -42, COIL_Z = 14, COIL_H = 42; // 線圈中心 x、底、高
const METER = [78, 6], MR = 30, MZ = 16;

function coilStand() {
  const o = [];
  o.push(S(k.slabOf({ x: CX - 26, y: -26, w: 52, d: 52, r: 3 }, 0, 6, P, 5, 0.6), { tone: "mid" }));
  o.push(S(k.cylinder(CX, 0, 12, 6, COIL_Z - 6, P, 36), { tone: "mid", crease: "none" }));
  // 線圈：六圈粗環＋內管
  o.push(S(k.cylinder(CX, 0, 10.5, COIL_Z, COIL_H, P, 36), { tone: "lo", crease: "none" }));
  for (let i = 0; i < 6; i++)
    o.push(S(k.cylinder(CX, 0, 15.5, COIL_Z + 1 + i * 7, 4.6, P, 44, 0.4), { tone: "hi", className: i % 2 ? "t-sky" : "t-mint", crease: "lo" }));
  o.push(S(k.cylinder(CX, 0, 16.5, COIL_Z + COIL_H, 2.5, P, 44), { tone: "mid" }));
  o.push(S(k.cylinder(CX, 0, 16.5, COIL_Z - 2.5, 2.5, P, 44), { tone: "mid" }));
  // 導軌立架
  o.push(post(k, P, HH, CX - 30, -24, 0, 128, 2.6));
  o.push(post(k, P, HH, CX + 30, -24, 0, 128, 2.6));
  o.push(S(k.slabOf({ x: CX - 36, y: -28, w: 72, d: 9, r: 2 }, 126, 5, P, 3, 0.5), { tone: "mid" }));
  o.push(D([at([CX - 30, -24, 131]), at([CX + 30, -24, 131])], { size: 0.5 }));
  const t = k.sideTicks(COIL_Z, 120, 6, 5, CX + 30, 0, [0, 0], P, "y"); // 佔位不用
  o.push(knob(k, P, HH, CX - 30, 34, 0, 5));
  // 接線端子
  o.push(S(k.cylinder(CX + 20, 18, 3, 6, 5, P, 20), { tone: "hi", className: "t-gold" }));
  o.push(S(k.cylinder(CX + 20, 30, 3, 6, 5, P, 20), { tone: "hi", className: "t-navy" }));
  return o.join("");
}
function magnet() { // 以磁鐵底端 z=0 建，live 上下移
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: CX - 8, y: -8, w: 16, d: 16, r: 4 }, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.cylinder(CX, 0, 7, 0, 11, P, 36, 0.4), { tone: "hi", className: "t-rose", crease: "lo" })); // 下半 N 極（朝下）
  o.push(S(k.cylinder(CX, 0, 7, 11, 11, P, 36, 0.4), { tone: "hi", className: "t-navy", crease: "lo" }));
  o.push(L(k.sideArc(CX, 0, 7, 11, P, 24), { tone: "hi" }));
  o.push(S(k.cylinder(CX, 0, 2.2, 22, 14, P, 18), { tone: "mid", crease: "none" }));
  o.push(S(k.cylinder(CX, 0, 5, 36, 4, P, 28), { tone: "mid" }));
  o.push(L(k.knurl(CX, 0, 5, 36, 40, 28, P), { tone: "lo" }));
  o.push(k.faceTextSvg(k.topMatrix([CX, 0], 40.2, P, "x"), "N↓", { size: 3.4, tone: "hi", anchor: "middle" }));
  return o.join("");
}
function meter() {
  const [mx, my] = METER; const o = [];
  o.push(S(k.slabOf({ x: mx - 38, y: my - 38, w: 76, d: 76, r: 5 }, 0, MZ, P, 6, 0.8), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan({ x: mx - 38, y: my - 38, w: 76, d: 76, r: 5 }, 4), MZ, P, 6), { tone: "faint" }));
  o.push(S(k.cylinder(mx, my, MR, MZ, 5, P, 64, 0.7), { tone: "hi", crease: "lo" }));
  o.push(L(k.knurl(mx, my, MR, MZ + 2, MZ + 5, 72, P, 0.3), { tone: "lo" }));
  o.push(L(k.ring(mx, my, MR - 4, MZ + 5, P, 96), { tone: "lo" }));
  o.push(L(k.ring(mx, my, MR - 7.2, MZ + 5, P, 96), { tone: "faint" }));
  const t = k.radialTicks(mx, my, MR - 4, 40, 5, MZ + 5, [1.6, 3.2], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  o.push(L(k.ring(mx, my, 2.2, MZ + 5, P, 20), { tone: "mid" }));
  o.push(k.faceTextSvg(k.topMatrix([mx, my + 15], MZ + 5, P, "x"), "G", { size: 3.6, tone: "mid", anchor: "middle" }));
  o.push(S(k.cylinder(mx - 30, my + 30, 3, MZ, 4, P, 20), { tone: "hi", className: "t-gold" }));
  o.push(S(k.cylinder(mx - 18, my + 33, 3, MZ, 4, P, 20), { tone: "hi", className: "t-navy" }));
  o.push(knob(k, P, HH, mx + 28, my + 28, MZ, 4.5));
  return o.join("");
}
function wires() {
  const a1 = at([CX + 20, 18, 11]), a2 = at([CX + 20, 30, 11]);
  const b1 = at([METER[0] - 30, METER[1] + 30, MZ + 4]), b2 = at([METER[0] - 18, METER[1] + 33, MZ + 4]);
  const mid1 = at([10, 42, 2]), mid2 = at([16, 52, 2]);
  return k.wireSvg(a1, b1, { via: [mid1], tone: "red", size: 1.3 }) + k.wireSvg(a2, b2, { via: [mid2], tone: "blue", size: 1.3 });
}
const needleD = (ang) => { const [mx, my] = METER; return k.lineOnTop([mx - Math.sin(ang) * 5, my + Math.cos(ang) * 5], [mx + Math.sin(ang) * (MR - 4), my - Math.cos(ang) * (MR - 4)], MZ + 5.4, P); };
const svg = k.figureSvg({
  width: W, height: H,
  label: "電磁感應實驗台：棒磁鐵沿導軌進出直立線圈，線圈接檢流計。磁通量變化才有感應電流，動得越快偏轉越大。",
  body: [basePlate(k, P, HH, PLATE), coilStand(), wires(), meter(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleD(0)}" style="stroke-width:1.3"/>`,
    `<g data-part="magnet">${magnet()}</g>`],
});
const live = `
const P=${JSON.stringify(P)}, COILC=${COIL_Z + COIL_H / 2}, MR=${MR}, MZ=${MZ}, METER=${JSON.stringify(METER)};
const magEl=document.querySelector('[data-part="magnet"]'), ndEl=document.querySelector('[data-part="needle"]');
const stage=document.querySelector(".iso-stage");
let z=118, zT=118, N=300, phiPrev=null, eps=0, ang=0, angV=0, touring=!still.matches, tourT=0, auto=null;
const flux=(zz)=>{const d=Math.max(0,zz-COILC); return 1/(1+Math.pow(d/30,2));}; // 磁鐵越深入線圈磁通越大（zz 為磁鐵底高）
const needleD=(a)=>lineOnTop([METER[0]-Math.sin(a)*5,METER[1]+Math.cos(a)*5],[METER[0]+Math.sin(a)*(MR-4),METER[1]-Math.cos(a)*(MR-4)],MZ+5.4,P);
function draw(){
  magEl.setAttribute("transform",translateAlong(P,[0,0,z]));
  ndEl.setAttribute("d",needleD(ang));
  const inside=z<COILC+6;
  const dir=eps>0.15?"線圈上端成 N 極排斥（反抗靠近）":eps<-0.15?"線圈上端成 S 極挽留（反抗離開）":"幾乎無感應電流";
  setRead("ε≈"+eps.toFixed(1)+" mV","匝數 N＝"+N+"；感應電動勢 ε≈"+eps.toFixed(1)+" mV。"+dir+"。"+(inside&&Math.abs(eps)<0.15?"磁鐵停在線圈裡：磁通量再大、不變就沒電流。":"磁通量變得越快，ε 越大。"));
}
window.__tick=(dt)=>{
  if(touring){tourT+=dt; zT=78+44*Math.sin(tourT*0.9);}
  if(auto){zT=auto.to; if(Math.abs(z-auto.to)<1.2)auto=null;}
  const prev=z;
  z=still.matches?zT:z+(zT-z)*(1-Math.exp(-dt/0.10));
  if(Math.abs(zT-z)<0.02)z=zT;
  const ph=flux(z);
  if(phiPrev!==null&&dt>0){const dphi=(ph-phiPrev)/dt; eps=clamp(N*dphi*1.7,-60,60);} // 換算係數使快速插入約數十 mV（示意）
  phiPrev=ph;
  const target=clamp(eps/60,-1,1)*1.15;
  for(let i=0;i<4;i++){angV+=((target-ang)*90-angV*11)*dt/4; ang+=angV*dt/4;}
  if(!touring&&!auto&&Math.abs(z-zT)<0.05){eps*=0.9; if(Math.abs(eps)<0.05)eps=0;}
  draw();
  return touring||!!auto||Math.abs(z-zT)>0.05||Math.abs(angV)>0.01||Math.abs(eps)>0.06;
};
document.getElementById("inN").addEventListener("input",ev=>{N=parseInt(ev.target.value);document.getElementById("inNv").textContent=N+" 匝";draw();});
document.getElementById("bIn").addEventListener("click",()=>{touring=false;auto={to:26};wake();});
document.getElementById("bOut").addEventListener("click",()=>{touring=false;auto={to:118};wake();});
document.getElementById("bSlow").addEventListener("click",()=>{touring=false;auto=null;zT=z>70?30:114;wake();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);touring=false;auto=null;mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); zT=clamp(124-clamp((ev.clientY-r.top)/r.height,0,1)*104,20,124); wake();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowDown"){zT=clamp(zT-10,20,124);wake();} if(ev.key==="ArrowUp"){zT=clamp(zT+10,20,124);wake();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "induction-coil", fig: "圖 3 · 物理", title: "電磁感應台：磁鐵與檢流計",
  hint: "上下拖磁鐵，或按快速插入／抽出", readout: "ε≈0 mV", detail: "磁通量要變化才有感應電流。",
  keys: [{ mark: "lit", label: "檢流計指針" }, { mark: "raised", label: "粉色端為 N 極" }],
  point: "ε＝−NΔΦ/Δt：只看變化快慢；靜置線圈中無電流（磁通模型為示意）。",
  svg, live,
  controls: `<label>線圈匝數 <input id="inN" type="range" min="100" max="600" step="50" value="300"><span class="val" id="inNv">300 匝</span></label>
<button id="bIn" type="button">快速插入</button><button id="bOut" type="button">快速抽出</button><button id="bSlow" type="button">慢慢移動</button>`,
});
