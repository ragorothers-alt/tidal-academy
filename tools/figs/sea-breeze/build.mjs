/* 海陸風對流箱（es-atmos）：左海右陸，太陽燈沿弧軌移動。
   溫度模型：陸 T＝25＋6·sin(2π(h−9)/24)、海 T＝25＋1.2·sin(2π(h−9)/24)（陸升降溫快、海緩，示意）；
   地面風向由較熱側上升決定，風速∝溫差（約 1.2 m/s/°C，上限 8）。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 450;
const PLATE = { x: -155, y: -80, w: 315, d: 160, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 105], [-126, -56, 86], [126, -56, 86]], W, H, { pad: 26, azimuth: 38 });
const HH = helpers(k, P); const { at, S, L, D } = HH;

function diorama() {
  const o = [];
  o.push(S(k.slabOf({ x: -130, y: -55, w: 260, d: 110, r: 4 }, 0, 7, P, 5, 0.6), { tone: "mid" }));
  o.push(S(k.slabOf({ x: -122, y: -47, w: 112, d: 94, r: 3 }, 7, 6, P, 4), { tone: "hi", className: "t-sky", crease: "lo" })); // 海
  o.push(S(k.slabOf({ x: 2, y: -47, w: 120, d: 94, r: 3 }, 7, 9, P, 4), { tone: "hi", className: "t-gold", crease: "lo" })); // 陸
  o.push(S(k.slabOf({ x: -14, y: -47, w: 16, d: 94, r: 2 }, 7, 7.5, P, 3), { tone: "hi", crease: "lo" })); // 沙灘
  for (let i = 0; i < 5; i++) o.push(L(k.lineOnTop([-122, -34 + i * 16], [-10, -34 + i * 16], 13.1, P), { tone: "faint" })); // 波紋（邊到邊）
  for (const [x, y] of [[28, -28], [58, 6], [92, -18], [70, 30], [36, 26]]) { // 陸上小屋/樹塊
    o.push(S(k.slabOf({ x, y, w: 14, d: 12, r: 1.5 }, 16, 8, P, 3, 0.4), { tone: "mid" }));
    o.push(S(k.cylinder(x + 7, y + 6, 6, 24, 4, P, 24), { tone: "hi", className: "t-navy" }));
  }
  o.push(k.faceTextSvg(k.topMatrix([-66, 0], 13.5, P, "x"), "海", { size: 6, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([62, 44], 16.3, P, "x"), "陸地", { size: 4.4, tone: "hi", anchor: "middle" }));
  // 兩支溫度柱
  for (const [id, cx, cy, cls] of [["seaT", -100, 36, "t-sky"], ["landT", 104, 36, "t-rose"]]) {
    o.push(S(k.cylinder(cx, cy, 6.5, 7, 2.5, P, 28), { tone: "mid" }));
    o.push(S(k.cylinder(cx, cy, 6.5, 62, 2.5, P, 28), { tone: "mid" }));
    for (let i = 0; i < 7; i++) o.push(`<g data-th="${id}${i}">${S(k.cylinder(cx, cy, 5.2, 10 + i * 7.4, 6.6, P, 28), { tone: "hi", className: cls, crease: "none" })}</g>`);
  }
  return o.join("");
}
function gantry() {
  const o = [];
  o.push(post(k, P, HH, -122, -52, 0, 78, 2.4)); o.push(post(k, P, HH, 122, -52, 0, 78, 2.4));
  o.push(S(k.slabOf({ x: -126, y: -56, w: 252, d: 9, r: 2 }, 78, 5, P, 3, 0.5), { tone: "mid" }));
  const t = k.topTicks(-118, 118, 6, 6, -55.2, 83, [1.8, 3.2], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  o.push(knob(k, P, HH, -122, -52, 83, 4));
  return o.join("");
}
function lamp() { // 太陽/月亮燈車，以 x=0 建 live 移
  const o = [];
  o.push(S(k.slabOf({ x: -9, y: -57, w: 18, d: 11, r: 2 }, 70, 8, P, 3), { tone: "mid" }));
  o.push(S(k.cylinder(0, -51, 2, 56, 14, P, 16), { tone: "mid", crease: "none" }));
  o.push(`<g data-part="lamphead">${S(k.cylinder(0, -51, 10, 48, 4, P, 36), { tone: "hi", className: "t-gold" })}${S(k.cylinder(0, -51, 7.5, 52, 4, P, 32), { tone: "hi", className: "t-gold", crease: "lo" })}</g>`);
  return o.join("");
}
function pucks() { // 4 顆空氣團，以原點建 live 沿環流移動
  let s = "";
  for (let i = 0; i < 4; i++) s += `<g data-puck="${i}">${S(k.cylinder(0, 8, 5.5, 0, 3.4, P, 28), { tone: "hi", className: i % 2 ? "t-mint" : "t-sky", crease: "lo" })}${D([at([0, 8, 3.4])], { size: 0.65, tone: "hi" })}</g>`;
  return s;
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "海陸風對流箱：左邊藍海右邊金陸地，上方太陽燈車隨時刻移動。白天陸熱空氣上升、海風吹向陸地，夜晚反向成陸風，彩色空氣團沿環流走。",
  body: [basePlate(k, P, HH, PLATE), diorama(), gantry(), `<g data-part="lamp">${lamp()}</g>`, pucks(),
    `<path data-part="loop" class="iso-line" data-tone="faint" data-dashed="true" d=""/>`],
});
const live = `
const P=${JSON.stringify(P)};
const lampEl=document.querySelector('[data-part="lamp"]'), loopEl=document.querySelector('[data-part="loop"]');
const puckEls=$$("[data-puck]"); const stage=document.querySelector(".iso-stage");
let hour=13, play=!still.matches, u=0;
const Tland=(h)=>25+6*Math.sin(2*Math.PI*(h-9)/24), Tsea=(h)=>25+1.2*Math.sin(2*Math.PI*(h-9)/24);
function loopPt(s,dir){ // 矩形環流：地面 y=8,z=20 ↔ 高空 z=58，x -70..62
  s=((s%1)+1)%1; const seg=[[ -70,20],[62,20],[62,58],[-70,58]];
  const per=[132,38,132,38], tot=340; let d=s*tot*dir; d=((d%tot)+tot)%tot;
  for(let i=0;i<4;i++){ if(d<=per[i]){const a=seg[i],b=seg[(i+1)%4]; const f=per[i]?d/per[i]:0; return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f];} d-=per[i]; }
  return seg[0];
}
function draw(){
  const tl=Tland(hour), ts=Tsea(hour), dt2=tl-ts;
  const lx=clamp((hour-5)/14,0,1)*210-105;
  lampEl.setAttribute("transform",translateAlong(P,[lx,0,0]));
  lampEl.style.opacity=(hour>5.5&&hour<18.5)?"1":"0.45";
  const loopPts=[[-70,8,20],[62,8,20],[62,8,58],[-70,8,58]].map(p=>iso(p,P));
  loopEl.setAttribute("d",pathOf(loopPts,true));
  const dir=dt2>=0?1:-1, wind=Math.min(8,Math.abs(dt2)*1.2);
  puckEls.forEach((el,i)=>{const [x,z]=loopPt(u+i*0.25,dir); el.setAttribute("transform",translateAlong(P,[x,0,z])); el.style.opacity=wind<0.4?"0.3":"1";});
  $$("[data-th]").forEach(el=>{const id=el.dataset.th; const n=parseInt(id.slice(-1)); const f=id.startsWith("land")?clamp((tl-18)/14,0,1):clamp((ts-18)/14,0,1); el.style.opacity=n<Math.round(f*7)?"1":"0.13";});
  const hh=Math.floor(hour), mm=Math.floor((hour-hh)*60);
  const when=String(hh).padStart(2,"0")+":"+String(mm).padStart(2,"0");
  const what=Math.abs(dt2)<0.4?"幾乎無風（轉換時刻）":dt2>0?"海風：地面風由海吹向陸":"陸風：地面風由陸吹向海";
  setRead(what.split("：")[0]+" "+wind.toFixed(1)+" m/s",when+"：陸地 "+tl.toFixed(1)+"°C、海面 "+ts.toFixed(1)+"°C（差 "+Math.abs(dt2).toFixed(1)+"°C）。"+what+"，風速約 "+wind.toFixed(1)+" m/s；較熱一側空氣上升、較冷一側下沉。陸地比熱小，升降溫都比海快。");
}
window.__tick=(dt)=>{ if(play)hour=(hour+dt*0.9)%24; const w=Math.min(8,Math.abs(Tland(hour)-Tsea(hour))*1.2); u=(u+dt*(0.02+w*0.018))%1;
  const s=document.getElementById("inH"); if(play){s.value=hour; document.getElementById("inHv").textContent=String(Math.floor(hour)).padStart(2,"0")+":00";} draw(); return play||w>0.3; };
document.getElementById("inH").addEventListener("input",ev=>{play=false;document.getElementById("bPlay").textContent="播放一天"; hour=parseFloat(ev.target.value); document.getElementById("inHv").textContent=String(Math.floor(hour)).padStart(2,"0")+":00"; draw(); wake();});
document.querySelectorAll("[data-h]").forEach(b=>b.addEventListener("click",()=>{play=false;document.getElementById("bPlay").textContent="播放一天"; hour=parseFloat(b.dataset.h); document.getElementById("inH").value=hour; document.getElementById("inHv").textContent=String(hour).padStart(2,"0")+":00"; draw(); wake();}));
document.getElementById("bPlay").addEventListener("click",ev=>{play=!play;ev.target.setAttribute("aria-pressed",String(play));ev.target.textContent=play?"暫停":"播放一天";wake();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);play=false;mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); hour=clamp((ev.clientX-r.left)/r.width,0,0.999)*24; document.getElementById("inH").value=hour; document.getElementById("inHv").textContent=String(Math.floor(hour)).padStart(2,"0")+":00"; draw(); wake();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowRight"){hour=(hour+1)%24;draw();wake();} if(ev.key==="ArrowLeft"){hour=(hour-1+24)%24;draw();wake();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "sea-breeze", fig: "圖 9 · 地科", title: "海陸風箱：白天海風、夜晚陸風",
  hint: "左右拖改時刻，看環流轉向", readout: "海風 5.8 m/s", detail: "白天陸熱海涼，海風吹向陸地。",
  keys: [{ mark: "lit", label: "彩色空氣團" }, { mark: "raised", label: "金陸地、藍海洋" }],
  point: "陸升降溫快於海：白天海風、夜晚陸風（溫速關係為簡化示意）。",
  svg, live,
  controls: `<label>時刻 <input id="inH" type="range" min="0" max="23.9" step="0.25" value="13"><span class="val" id="inHv">13:00</span></label>
<button type="button" data-h="13">午後 13 時</button><button type="button" data-h="1">凌晨 1 時</button>
<button id="bPlay" type="button" aria-pressed="true">暫停</button>`,
});
