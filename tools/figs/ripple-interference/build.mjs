/* 水波槽干涉（ph-wave）：雙點波源同相振動，水波波速 v＝24 cm/s（示意定值），
   λ＝v/f；前方屏幕亮紋間距 Δy＝Lλ/d，強度由兩源波程差逐點計算。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 440;
const PLATE = { x: -150, y: -95, w: 300, d: 190, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 70]], W, H, { pad: 26, azimuth: 42, elevation: 38 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const TANK = { x: -110, y: -70, w: 220, d: 130, r: 4 }, WZ = 16;

function tank() {
  const o = [];
  o.push(S(k.slabOf(TANK, 0, 8, P, 5, 0.6), { tone: "mid" })); // 槽底座
  o.push(S(k.slabOf({ x: TANK.x + 6, y: TANK.y + 6, w: TANK.w - 12, d: TANK.d - 12, r: 3 }, 8, WZ - 8, P, 4), { tone: "hi", className: "t-sky", crease: "lo" })); // 水體
  for (const [x, y, w, d] of [[TANK.x, TANK.y, TANK.w, 5], [TANK.x, TANK.y + TANK.d - 5, TANK.w, 5], [TANK.x, TANK.y, 5, TANK.d], [TANK.x + TANK.w - 5, TANK.y, 5, TANK.d]])
    o.push(S(k.slabOf({ x, y, w, d, r: 1.5 }, 8, 14, P, 3, 0.4), { tone: "mid" })); // 四壁
  o.push(L(k.planOutline({ x: TANK.x + 10, y: TANK.y + 10, w: TANK.w - 20, d: TANK.d - 20, r: 3 }, WZ + 0.2, P, 4), { tone: "faint" }));
  // 前方屏幕條（41 個感測點，live 調透明度）
  let dots = "";
  for (let i = 0; i < 41; i++) { const [sx, sy] = at([-92 + i * 4.6, TANK.y + TANK.d - 14, WZ + 1]); dots += `<circle data-scr="${i}" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.7" fill="#3e5a8c" fill-opacity="0.15"/>`; }
  o.push(S(k.slabOf({ x: -100, y: TANK.y + TANK.d - 19, w: 200, d: 9, r: 1.5 }, WZ - 1, 1.2, P, 3), { tone: "lo", crease: "none" }));
  o.push(`<g data-part="screen">${dots}</g>`);
  return o.join("");
}
function dippers() { // 振動橫桿＋兩支點波源（live 隨間距左右移以 translateAlong 單支）
  const o = [];
  o.push(post(k, P, HH, -96, -52, 0, 44, 2.4)); o.push(post(k, P, HH, 96, -52, 0, 44, 2.4));
  o.push(S(k.slabOf({ x: -100, y: -56, w: 200, d: 8, r: 2 }, 44, 5, P, 3, 0.5), { tone: "mid" }));
  o.push(S(k.slabOf({ x: -16, y: -60, w: 32, d: 16, r: 2 }, 49, 9, P, 3, 0.5), { tone: "hi", className: "t-navy" })); // 馬達盒
  o.push(L(k.planOutline({ x: -12, y: -56, w: 24, d: 8, r: 1 }, 58, P, 3), { tone: "faint" }));
  o.push(knob(k, P, HH, 0, -52, 58, 4));
  return o.join("");
}
function dipper(id) {
  const o = [];
  o.push(S(k.slabOf({ x: -3, y: -54, w: 6, d: 8, r: 1 }, 36, 9, P, 2), { tone: "mid" }));
  o.push(S(k.cylinder(0, -40, 1.5, WZ, 22, P, 14), { tone: "mid", crease: "none" }));
  o.push(S(k.cylinder(0, -40, 3.4, WZ - 1, 2.4, P, 24), { tone: "hi", className: "t-gold" }));
  o.push(D([at([0, -40, WZ + 1.4])], { size: 0.7, tone: "hi" }));
  return `<g data-part="${id}">${o.join("")}</g>`;
}
let rings = "";
for (let s = 0; s < 2; s++) for (let i = 0; i < 7; i++) rings += `<path data-ring="${s}-${i}" class="iso-line" data-tone="${s ? "green" : "blue"}" d=""/>`;
const clip = `<clipPath id="tankclip"><path d="${k.planOutline({ x: TANK.x + 7, y: TANK.y + 7, w: TANK.w - 14, d: TANK.d - 14, r: 3 }, WZ + 0.6, P, 4)}"/></clipPath>`;
const svg = k.figureSvg({
  width: W, height: H,
  label: "水波槽：上方橫桿帶兩支點波源在水面同相振動，兩組圓形波重疊干涉，前方屏幕出現亮暗相間的圖樣。",
  body: [clip, basePlate(k, P, HH, PLATE), tank(), `<g data-part="rings" clip-path="url(#tankclip)">${rings}</g>`, dippers(), dipper("dip0"), dipper("dip1")],
});
const live = `
const P=${JSON.stringify(P)}, WZ=${WZ}, SY=-40, SCRY=${TANK.y + TANK.d - 14};
const stage=document.querySelector(".iso-stage");
const dip=[document.querySelector('[data-part="dip0"]'),document.querySelector('[data-part="dip1"]')];
const ringEls=$$("[data-ring]"), scrEls=$$("[data-scr]");
let f=4, sep=44, phase=0, play=!still.matches;
const V=120; // 世界單位/秒（水面 220 單位≙44 cm → 24 cm/s）
const lamU=()=>V/f;
function draw(){
  const lam=lamU(), xs=[-sep/2,sep/2];
  dip[0].setAttribute("transform",translateAlong(P,[xs[0],0,0]));
  dip[1].setAttribute("transform",translateAlong(P,[xs[1],0,0]));
  ringEls.forEach(el=>{const [s,i]=el.dataset.ring.split("-").map(Number); let r=((phase+i*lam)%(7*lam)); if(r<2)r=2;
    el.setAttribute("d",ring(xs[s],SY,r,WZ+0.6,P,44)); el.setAttribute("opacity",(1-r/(7*lam)).toFixed(2));});
  scrEls.forEach((el,i)=>{const x=-92+i*4.6; const d1=Math.hypot(x-xs[0],SCRY-SY), d2=Math.hypot(x-xs[1],SCRY-SY);
    const inten=Math.pow(Math.cos(Math.PI*(d1-d2)/lam),2); el.setAttribute("fill-opacity",(0.08+0.9*inten).toFixed(2)); el.setAttribute("fill",inten>0.6?"#3e5a8c":inten>0.3?"#7a93ad":"#c9d6e4");});
  const lamCm=24/f, dCm=sep/5, Lcm=(SCRY-SY)/5, dy=Lcm*lamCm/dCm;
  setRead("λ＝"+lamCm.toFixed(1)+" cm · Δy≈"+dy.toFixed(1)+" cm","頻率 f＝"+f.toFixed(1)+" Hz、波速 v＝24 cm/s → 波長 λ＝v/f＝"+lamCm.toFixed(1)+" cm；兩源距 d＝"+dCm.toFixed(1)+" cm、到屏幕 L≈"+Lcm.toFixed(0)+" cm，相鄰亮點距 Δy＝Lλ/d≈"+dy.toFixed(1)+" cm。波程差為 λ 整數倍處最亮。");
}
window.__tick=(dt)=>{ if(play)phase=(phase+V*dt)%(7*lamU()); draw(); return play; };
document.getElementById("inF").addEventListener("input",ev=>{f=parseFloat(ev.target.value);document.getElementById("inFv").textContent=f.toFixed(1)+" Hz";draw();});
document.querySelectorAll("[data-sep]").forEach(b=>b.addEventListener("click",()=>{sep=parseFloat(b.dataset.sep);document.querySelectorAll("[data-sep]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));draw();}));
document.getElementById("bPlay").addEventListener("click",ev=>{play=!play;ev.target.setAttribute("aria-pressed",String(play));ev.target.textContent=play?"暫停":"播放";wake();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); sep=clamp(((ev.clientX-r.left)/r.width)*2-0.35,0.12,1)*120; draw();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowRight"){sep=clamp(sep+6,14,120);draw();} if(ev.key==="ArrowLeft"){sep=clamp(sep-6,14,120);draw();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "ripple-interference", fig: "圖 4 · 物理", title: "水波槽：雙源干涉",
  hint: "左右拖改兩源距離，拉桿改頻率", readout: "λ＝6.0 cm", detail: "波程差決定亮暗。",
  keys: [{ mark: "lit", label: "屏幕感測點" }, { mark: "raised", label: "金色點波源" }],
  point: "Δy＝Lλ/d，λ＝v/f；頻率由波源定，波速由介質定（v 取定值示意）。",
  svg, live,
  controls: `<label>頻率 <input id="inF" type="range" min="2" max="8" step="0.5" value="4"><span class="val" id="inFv">4.0 Hz</span></label>
<button type="button" data-sep="28">源距 近</button><button type="button" data-sep="44" aria-pressed="true">源距 中</button><button type="button" data-sep="84">源距 遠</button>
<button id="bPlay" type="button" aria-pressed="true">暫停</button>`,
});
