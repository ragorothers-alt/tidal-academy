/* 單擺能量儀（ph-energy）：真實單擺方程式 θ''＝−(g/L)sinθ 數值積分（g＝9.8），
   U＝mgL(1−cosθ)、K＝½m(Lθ')²，忽略阻力故 K+U 守恆；右側兩管能量柱即時顯示。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 460;
const PLATE = { x: -150, y: -80, w: 305, d: 160, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 150]], W, H, { pad: 26, azimuth: 36 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const PIV = [-28, 0, 128], LEN = 92; // 樞軸、擺長（世界單位；92≙0.60 m）

function frame() {
  const o = [];
  o.push(post(k, P, HH, PIV[0] - 34, -26, 0, 122, 3));
  o.push(post(k, P, HH, PIV[0] - 34, 26, 0, 122, 3));
  o.push(S(k.slabOf({ x: PIV[0] - 40, y: -30, w: 46, d: 60, r: 2.5 }, 122, 6, P, 4, 0.5), { tone: "mid" })); // 頂樑
  o.push(S(k.cylinder(PIV[0], 0, 23, 117, 5, P, 48, 0.5), { tone: "hi", crease: "lo" })); // 量角盤
  o.push(L(k.ring(PIV[0], 0, 21, 122, P, 72), { tone: "lo" }));
  o.push(L(k.ring(PIV[0], 0, 18.6, 122, P, 72), { tone: "faint" }));
  const t = k.radialTicks(PIV[0], 0, 21, 36, 3, 122, [1.2, 2.4], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  o.push(S(k.cylinder(PIV[0], 0, 3.4, 112, 17, P, 24), { tone: "mid" })); // 樞軸
  o.push(knob(k, P, HH, PIV[0], 0, 129, 4.5));
  // 弧形刻度軌（最低點附近兩支光電門）
  for (const gx of [-14, 14]) { o.push(post(k, P, HH, PIV[0] + gx, 18, 0, 26, 1.7)); o.push(S(k.cylinder(PIV[0] + gx, 18, 2.6, 26, 2, P, 18), { tone: "hi", className: "t-gold" })); }
  o.push(S(k.slabOf({ x: PIV[0] - 52, y: 14, w: 104, d: 8, r: 1.5 }, 0, 4, P, 3, 0.4), { tone: "mid" }));
  const st = k.sideTicks(PIV[0] - 48, PIV[0] + 48, 6, 5, 22, 4, [1.4, 2.6], P, "x");
  o.push(L(st.minor, { tone: "lo" }), L(st.major, { tone: "mid" }));
  return o.join("");
}
function bars() { // 右側能量柱：每柱 10 節，live 開關
  const o = [];
  const bx = 84;
  o.push(S(k.slabOf({ x: bx - 22, y: -30, w: 62, d: 60, r: 3 }, 0, 6, P, 4, 0.6), { tone: "mid" }));
  for (const [id, cx, cls, lab] of [["U", bx - 6, "t-sky", "位能"], ["K", bx + 18, "t-gold", "動能"]]) {
    o.push(S(k.cylinder(cx, 0, 9.5, 6, 3, P, 36), { tone: "mid" }));
    o.push(S(k.cylinder(cx, 0, 8, 86, 3, P, 36), { tone: "mid" }));
    for (let i = 0; i < 10; i++) o.push(`<g data-bar="${id}${i}">${S(k.cylinder(cx, 0, 7.6, 9 + i * 7.6, 7, P, 36), { tone: "hi", className: cls, crease: "none" })}</g>`);
    o.push(k.faceTextSvg(k.topMatrix([cx, 16], 7, P, "x"), lab, { size: 3.8, tone: "hi", anchor: "middle" }));
    o.push(post(k, P, HH, cx, -20, 6, 80, 1.2));
  }
  o.push(knob(k, P, HH, bx + 6, 24, 6, 4));
  return o.join("");
}
function bob() {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -11, y: -11, w: 22, d: 22, r: 9 }, -8, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.cylinder(0, 0, 9.5, -8, 3, P, 40), { tone: "hi", className: "t-gold" }));
  o.push(S(k.cylinder(0, 0, 11, -5, 7, P, 44, 0.5), { tone: "hi", className: "t-gold", crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 8, 2, 4, P, 36), { tone: "hi", className: "t-gold" }));
  o.push(S(k.cylinder(0, 0, 2, 6, 6, P, 16), { tone: "mid", crease: "none" }));
  o.push(L(k.knurl(0, 0, 11, -5, 2, 44, P), { tone: "lo" }));
  return o.join("");
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "單擺能量儀：金擺錘在支架下擺動，右側藍柱是重力位能、金柱是動能，兩柱總高不變。",
  body: [basePlate(k, P, HH, PLATE), frame(), bars(),
    `<path data-part="rod" class="iso-line" data-tone="hi" data-free="" d="" style="stroke-width:1.4"/>`,
    `<path data-part="rod2" class="iso-line" data-tone="lo" data-free="" d=""/>`,
    `<g data-part="bob">${bob()}</g>`],
});
const live = `
const P=${JSON.stringify(P)}, PIV=${JSON.stringify(PIV)};
const rodEl=document.querySelector('[data-part="rod"]'), rod2El=document.querySelector('[data-part="rod2"]'), bobEl=document.querySelector('[data-part="bob"]');
const stage=document.querySelector(".iso-stage");
let Lm=0.60, m=0.50, th=0.65, om=0, hold=true, touring=!still.matches, tourT=0;
const G=9.8, LSC=92/0.60; // 世界單位/公尺
function draw(){
  const Lu=Lm*LSC, bx=PIV[0]+Math.sin(th)*Lu, bz=PIV[2]-Math.cos(th)*Lu;
  bobEl.setAttribute("transform",translateAlong(P,[bx,0,bz]));
  rodEl.setAttribute("d",segment([PIV[0],0,PIV[2]],[bx,0,bz+8],P));
  rod2El.setAttribute("d",segment([PIV[0],-3,PIV[2]],[bx,-3,bz+8],P)+segment([PIV[0],3,PIV[2]],[bx,3,bz+8],P));
  const h=Lm*(1-Math.cos(th)), v=Math.abs(Lm*om), U=m*G*h, K=0.5*m*v*v, E=U+K;
  const fU=E>1e-9?U/E:0, fK=E>1e-9?K/E:0;
  $$("[data-bar]").forEach(el=>{const id=el.dataset.bar; const n=parseInt(id.slice(1)); const f=id[0]==="U"?fU:fK; el.style.opacity=n<Math.round(f*10)?"1":"0.13";});
  setRead("K+U＝"+E.toFixed(2)+" J","擺角 "+(th*57.2958).toFixed(0)+"°、高出最低點 h＝"+(h*100).toFixed(1)+" cm、速率 v＝"+v.toFixed(2)+" m/s；位能 U＝"+U.toFixed(2)+" J、動能 K＝"+K.toFixed(2)+" J，總力學能 "+E.toFixed(2)+" J 不變。週期 T＝2π√(L/g)≈"+(2*Math.PI*Math.sqrt(Lm/G)).toFixed(2)+" s（與質量無關）。");
}
window.__tick=(dt)=>{
  if(touring){tourT+=dt; if(hold&&tourT>0.8){hold=false;} if(tourT>9){tourT=0;th=0.65;om=0;hold=true;}}
  if(!hold){ const n=8,h=dt/n; for(let i=0;i<n;i++){om+=-(G/Lm)*Math.sin(th)*h; th+=om*h;} }
  draw(); return !hold||touring;
};
document.getElementById("inA").addEventListener("input",ev=>{const d=parseFloat(ev.target.value);document.getElementById("inAv").textContent=d.toFixed(0)+"°"; th=d*Math.PI/180; om=0; hold=true; touring=false; draw();});
document.getElementById("inM").addEventListener("input",ev=>{m=parseFloat(ev.target.value);document.getElementById("inMv").textContent=m.toFixed(2)+" kg";draw();});
document.getElementById("inL").addEventListener("input",ev=>{Lm=parseFloat(ev.target.value);document.getElementById("inLv").textContent=Lm.toFixed(2)+" m";draw();});
document.getElementById("bGo").addEventListener("click",()=>{touring=false;hold=false;wake();idleTour(6000,()=>{touring=true;tourT=8.5;});});
document.getElementById("bHold").addEventListener("click",()=>{touring=false;hold=true;om=0;draw();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);touring=false;hold=true;om=0;mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>{if(drag){drag=false;hold=false;wake();}});
stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); th=clamp(((ev.clientX-r.left)/r.width-0.38)*2.4,-1.1,1.1); draw();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowRight"){th=clamp(th+0.06,-1.1,1.1);hold=true;om=0;draw();} if(ev.key==="ArrowLeft"){th=clamp(th-0.06,-1.1,1.1);hold=true;om=0;draw();} if(ev.key===" "){ev.preventDefault();hold=!hold;wake();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "pendulum-energy", fig: "圖 5 · 物理", title: "單擺能量儀：動能與位能",
  hint: "拖擺錘拉高再放開，看兩柱此消彼長", readout: "K+U 守恆", detail: "最高點位能最大、最低點動能最大。",
  keys: [{ mark: "lit", label: "藍柱＝位能、金柱＝動能" }, { mark: "raised", label: "金擺錘" }],
  point: "只有重力作功時 K+U 守恆；繩張力不作功（忽略阻力）。",
  svg, live,
  controls: `<label>釋放角 <input id="inA" type="range" min="5" max="60" step="1" value="37"><span class="val" id="inAv">37°</span></label>
<label>擺錘質量 <input id="inM" type="range" min="0.2" max="1" step="0.1" value="0.5"><span class="val" id="inMv">0.50 kg</span></label>
<label>擺長 <input id="inL" type="range" min="0.4" max="0.8" step="0.05" value="0.6"><span class="val" id="inLv">0.60 m</span></label>
<button id="bGo" type="button">放手</button><button id="bHold" type="button">抓住</button>`,
});
