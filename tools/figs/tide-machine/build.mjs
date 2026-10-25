/* 潮汐機（es-ocean，本組主圖）：中央地球、繞行月球臂、右側太陽燈。
   引潮力月:日≈2.2:1；某港潮高 h(ψ)＝Am·cos2(ψ−θ月)＋As·cos2(ψ−θ日)，ψ 為地球自轉相位，
   振幅換算使大潮潮差≈4.2 m（臺中港量級示意）；滿潮間隔 12 時 25 分、每日延後約 50 分。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 760, H = 470;
const PLATE = { x: -160, y: -105, w: 320, d: 210, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 105]], W, H, { pad: 24, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const DZ = 10, ER = 26, ECZ = 46, ORB = 96, SUNX = 128;

function table() {
  const o = [];
  o.push(S(k.cylinder(0, 0, 118, 0, DZ, P, 72, 1), { tone: "mid", crease: "lo" }));
  o.push(L(k.ring(0, 0, ORB, DZ + 0.3, P, 72), { tone: "mid" }));
  o.push(L(k.ring(0, 0, ORB - 10, DZ + 0.3, P, 72), { tone: "faint" }));
  o.push(L(k.ring(0, 0, 110, DZ, P, 144), { tone: "lo" }));
  o.push(L(k.ring(0, 0, 107.6, DZ, P, 144), { tone: "faint" }));
  const t = k.radialTicks(0, 0, 110, 60, 5, DZ, [1.2, 2.4], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  for (let i = 0; i < 30; i++) { const a = i * Math.PI / 15; o.push(D([at([Math.cos(a) * ORB, Math.sin(a) * ORB, DZ + 0.4])], { size: i % 5 ? 0.5 : 0.85, tone: "mid" })); } // 月齡日點
  o.push(k.faceTextSvg(k.topMatrix([0, 118], DZ + 0.5, P, "x"), "朔望月 29.5 日", { size: 3.2, tone: "mid", anchor: "middle" }));
  return o.join("");
}
function earth() {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -34, y: -34, w: 68, d: 68, r: 30 }, DZ, 0.1, P)}" style="filter:blur(5px)"/>`];
  o.push(S(k.cylinder(0, 0, 13, DZ, ECZ - ER - DZ + 3, P, 36), { tone: "mid", crease: "none" }));
  o.push(S(k.cylinder(0, 0, 18, DZ, 3, P, 44), { tone: "mid" }));
  const prof = [[13, -21], [20, -15], [24.5, -7], [26, 0], [24.5, 7], [20, 15], [13, 21]];
  let prev = ECZ - 24;
  for (const [r, dz] of prof) { o.push(S(k.cylinder(0, 0, r, prev, (ECZ + dz) - prev, P, 56), { tone: "hi", className: Math.abs(dz) <= 7 ? "t-sky" : "t-mint", crease: "none" })); prev = ECZ + dz; }
  o.push(S(k.cylinder(0, 0, 6.5, ECZ + 21, 3, P, 32), { tone: "hi", className: "t-sky" }));
  o.push(S(k.cylinder(0, 0, 1.6, ECZ + 24, 12, P, 14), { tone: "mid", crease: "none" })); // 自轉軸
  o.push(D([at([0, 0, ECZ + 36])], { size: 0.8, tone: "hi" }));
  o.push(L(k.ring(0, 0, ER - 0.2, ECZ, P, 64), { tone: "lo" }));
  // 臺灣港浮標座（前面）
  o.push(S(k.slabOf({ x: -8, y: 34, w: 16, d: 12, r: 2 }, DZ, 4, P, 3), { tone: "hi", className: "t-navy" }));
  o.push(k.faceTextSvg(k.topMatrix([0, 40], DZ + 4.2, P, "x"), "臺中港", { size: 3, tone: "hi", anchor: "middle" }));
  return o.join("");
}
function moon() { // 以原點建，live 移到軌道上；臂線另外畫
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -12, y: -12, w: 24, d: 24, r: 10 }, DZ, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.cylinder(0, 0, 5, DZ, ECZ - 12 - DZ, P, 24), { tone: "mid", crease: "none" }));
  o.push(S(k.cylinder(0, 0, 7.5, ECZ - 8, 3, P, 32), { tone: "hi", crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 9, ECZ - 5, 5, P, 36), { tone: "hi", crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 7.5, ECZ, 4, P, 32), { tone: "hi", className: "t-gold", crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 4, ECZ + 4, 2.6, P, 24), { tone: "hi", className: "t-gold" }));
  o.push(D([at([2, 2, ECZ + 1]), at([-3, -1, ECZ + 1])], { size: 0.55, tone: "lo" })); // 月面斑點示意
  return o.join("");
}
function sunLamp() {
  const o = [];
  o.push(post(k, P, HH, SUNX, -66, 0, 66, 2.6));
  o.push(S(k.slabOf({ x: SUNX - 30, y: -70, w: 34, d: 9, r: 2 }, 62, 5, P, 3, 0.5), { tone: "mid" }));
  o.push(S(k.cylinder(SUNX - 16, -66, 11, 48, 4, P, 40), { tone: "hi", className: "t-gold" }));
  o.push(S(k.cylinder(SUNX - 16, -66, 8.5, 52, 7, P, 40), { tone: "hi", className: "t-gold", crease: "lo" }));
  o.push(S(k.cylinder(SUNX - 16, -66, 5, 59, 3, P, 28), { tone: "hi", className: "t-gold" }));
  o.push(k.faceTextSvg(k.topMatrix([SUNX - 16, -66], 62.4, P, "x"), "太陽", { size: 3.1, tone: "hi", anchor: "middle" }));
  o.push(knob(k, P, HH, SUNX, -40, 0, 5));
  return o.join("");
}
function gauge() { // 左前潮位柱：10 節水位
  const o = []; const gx = -126, gy = 62;
  o.push(S(k.slabOf({ x: gx - 18, y: gy - 16, w: 40, d: 34, r: 3 }, 0, 6, P, 4, 0.6), { tone: "mid" }));
  o.push(S(k.cylinder(gx, gy, 10.5, 6, 3, P, 36), { tone: "mid" }));
  o.push(S(k.cylinder(gx, gy, 10.5, 84, 3, P, 36), { tone: "mid" }));
  for (let i = 0; i < 10; i++) o.push(`<g data-tide="${i}">${S(k.cylinder(gx, gy, 8.8, 9 + i * 7.4, 6.8, P, 36), { tone: "hi", className: "t-sky", crease: "none" })}</g>`);
  o.push(post(k, P, HH, gx + 14, gy - 10, 6, 78, 1.2));
  o.push(k.faceTextSvg(k.topMatrix([gx, gy], 87.4, P, "x"), "潮位", { size: 3.1, tone: "hi", anchor: "middle" }));
  return o.join("");
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "潮汐機：中央地球外包著橢圓形潮汐隆起，月球在軌道臂上繞行，右上方太陽燈固定。朔望時日月隆起疊加成大潮，上下弦時部分抵消成小潮，左側潮位柱隨地球自轉漲落。",
  body: [basePlate(k, P, HH, PLATE), table(), gauge(), sunLamp(),
    earth(),
    `<path data-part="bulge" d="" fill="#7cc7ff" fill-opacity="0.34" stroke="#3e7fbf" stroke-width="0.9"/>`,
    `<path data-part="arm" class="iso-line" data-tone="mid" data-free="" d=""/>`,
    `<g data-part="moon">${moon()}</g>`,
    `<path data-part="port" class="iso-line" data-tone="lit" data-free="" d="" style="stroke-width:1.3"/>`],
});
const live = `
const P=${JSON.stringify(P)}, ER=${ER}, ECZ=${ECZ}, ORB=${ORB};
const mEl=document.querySelector('[data-part="moon"]'), bEl=document.querySelector('[data-part="bulge"]'), aEl=document.querySelector('[data-part="arm"]'), portEl=document.querySelector('[data-part="port"]');
const stage=document.querySelector(".iso-stage");
const AM=1.45, AS=0.66; // 月/日分量振幅(m)：比值 2.2，大潮潮差 2(AM+AS)=4.22 m
const SUNA=-2.25; // 太陽方向(弧度，指向右上太陽燈)
let ma=-2.25+2/29.5*2*Math.PI, psi=0, spin=!still.matches;
function phaseName(rel){ const d=((rel%(2*Math.PI))+2*Math.PI)%(2*Math.PI); const age=d/(2*Math.PI)*29.5;
  const Q=Math.PI/2, near=c=>Math.abs(d-c)<0.5, nm=near(0)||near(4*Q)?"朔前後":near(Q)?"上弦前後":near(2*Q)?"望（滿月）前後":near(3*Q)?"下弦前後":d<Q?"眉月（漸盈）":d<2*Q?"盈凸月":d<3*Q?"虧凸月":"殘月（漸虧）";   // 四個主要月相前後約 2 天，其餘是中間的月相
  return {age,nm,d}; }
function draw(){
  const mx=Math.cos(ma)*ORB, my=Math.sin(ma)*ORB;
  mEl.setAttribute("transform",translateAlong(P,[mx,my,0]));
  aEl.setAttribute("d",segment([0,0,ECZ],[mx,my,ECZ],P));
  const rel=ma-SUNA;
  // 隆起外緣 r(θ)=ER+4+月日兩組 cos2 隆起（圖示放大）
  const pts=[]; for(let i=0;i<=64;i++){const th=i/64*2*Math.PI; const r=ER+6+8.5*Math.cos(2*(th-ma))+3.9*Math.cos(2*(th-SUNA)); pts.push(iso([Math.cos(th)*r,Math.sin(th)*r,ECZ],P));}
  bEl.setAttribute("d",pathOf(pts,true));
  const h=AM*Math.cos(2*(psi-ma))+AS*Math.cos(2*(psi-SUNA));
  const range=2*Math.sqrt(AM*AM+AS*AS+2*AM*AS*Math.cos(2*rel));
  const frac=clamp((h+(AM+AS))/(2*(AM+AS)),0,1);
  $$("[data-tide]").forEach(el=>{el.style.opacity=parseInt(el.dataset.tide)<Math.round(frac*10)?"1":"0.12";});
  const pa=psi%(2*Math.PI);
  portEl.setAttribute("d",segment([0,0,ECZ+2],[Math.cos(pa)*(ER+1),Math.sin(pa)*(ER+1),ECZ+2],P));
  const ph=phaseName(rel);
  const kind=range>3.4?"大潮":range<2.0?"小潮":"平常潮";
  const trend=(AM*Math.cos(2*(psi+0.06-ma))+AS*Math.cos(2*(psi+0.06-SUNA)))>h?"漲潮中":"退潮中";
  setRead(kind+" · 潮差 "+range.toFixed(1)+" m","月相："+ph.nm+"（月齡約 "+ph.age.toFixed(0)+" 日）→ "+kind+"，潮差約 "+range.toFixed(1)+" m。臺中港目前潮高 "+(h>=0?"+":"")+h.toFixed(1)+" m（"+trend+"）；半日潮兩次滿潮隔約 12 時 25 分，隔日滿潮晚約 50 分。月球引潮力約為太陽 2.2 倍。");
}
window.__tick=(dt)=>{ if(spin)psi+=dt*0.85; draw(); return spin; };
function setPhase(d){ma=SUNA+d; const s=document.getElementById("inAge"); s.value=(d/(2*Math.PI)*29.5).toFixed(1); document.getElementById("inAgev").textContent="月齡 "+(d/(2*Math.PI)*29.5).toFixed(0)+" 日"; draw();}
document.getElementById("inAge").addEventListener("input",ev=>{const age=parseFloat(ev.target.value); document.getElementById("inAgev").textContent="月齡 "+age.toFixed(0)+" 日"; ma=SUNA+age/29.5*2*Math.PI; draw();});
document.querySelectorAll("[data-ph]").forEach(b=>b.addEventListener("click",()=>setPhase(parseFloat(b.dataset.ph))));
document.getElementById("bSpin").addEventListener("click",ev=>{spin=!spin;ev.target.setAttribute("aria-pressed",String(spin));ev.target.textContent=spin?"暫停自轉":"地球自轉";wake();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); const age=clamp((ev.clientX-r.left)/r.width,0,0.999)*29.5; ma=SUNA+age/29.5*2*Math.PI; const s=document.getElementById("inAge"); s.value=age; document.getElementById("inAgev").textContent="月齡 "+age.toFixed(0)+" 日"; draw();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowRight"){ma+=0.12;draw();} if(ev.key==="ArrowLeft"){ma-=0.12;draw();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "tide-machine", fig: "圖 8 · 地科", title: "潮汐機：大潮與小潮",
  hint: "左右拖轉月球改月相，看潮差與潮位柱", readout: "大潮 · 潮差 4.2 m", detail: "朔、望大潮；上、下弦小潮。",
  keys: [{ mark: "lit", label: "藍隆起＝海水" }, { mark: "raised", label: "金月球＋太陽燈" }],
  point: "月球引潮為主（約太陽 2.2 倍）；朔望疊加大潮，弦月抵消小潮（潮差為臺中港量級示意）。",
  svg, live,
  controls: `<label>月齡 <input id="inAge" type="range" min="0" max="29.5" step="0.5" value="2"><span class="val" id="inAgev">月齡 2 日</span></label>
<button type="button" data-ph="0">朔</button><button type="button" data-ph="1.5708">上弦</button><button type="button" data-ph="3.1416">望</button><button type="button" data-ph="4.7124">下弦</button>
<button id="bSpin" type="button" aria-pressed="true">暫停自轉</button>`,
});
