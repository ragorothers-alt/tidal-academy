/* 克卜勒軌道儀：等面積定律（ph-gravity）。橢圓半長軸 a＝1 AU，
   以克卜勒方程 M＝E−e·sinE 求位置；速率用 vis-viva v²∝(2/r−1/a)，圓軌道速率＝29.8 km/s。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 440;
const PLATE = { x: -150, y: -100, w: 300, d: 200, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 64]], W, H, { pad: 26, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const A = 88, CZ = 10; // 半長軸（世界單位）、盤面高

function table() {
  const o = [];
  o.push(S(k.cylinder(0, 0, 112, 0, CZ, P, 72, 1), { tone: "mid", crease: "lo" }));
  o.push(L(k.ring(0, 0, 104, CZ, P, 144), { tone: "lo" }));
  o.push(L(k.ring(0, 0, 101.6, CZ, P, 144), { tone: "faint" }));
  const t = k.radialTicks(0, 0, 104, 72, 6, CZ, [1.2, 2.4], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; o.push(S(k.cylinder(Math.cos(a) * 96, Math.sin(a) * 96, 2.2, CZ, 1.2, P, 16), { tone: "mid" })); }
  return o.join("");
}
function sunLamp(fx) { // 焦點上的太陽燈（live 隨 e 移動整組）
  const o = [];
  o.push(post(k, P, HH, 0, 0, CZ, 26, 2.4));
  o.push(S(k.cylinder(0, 0, 11, CZ + 28, 3, P, 40), { tone: "hi", className: "t-gold" }));
  o.push(S(k.cylinder(0, 0, 8, CZ + 31, 6, P, 40), { tone: "hi", className: "t-gold", crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 4.5, CZ + 37, 3, P, 28), { tone: "hi", className: "t-gold" }));
  o.push(L(k.knurl(0, 0, 11, CZ + 28, CZ + 31, 48, P), { tone: "lo" }));
  o.push(D([at([0, 0, CZ + 40])], { size: 0.9, tone: "hi" }));
  return `<g data-part="sun">${o.join("")}</g>`;
}
function planet() {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -9, y: -9, w: 18, d: 18, r: 8 }, CZ, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.cylinder(0, 0, 7.5, CZ, 2, P, 36), { tone: "mid" }));
  o.push(S(k.cylinder(0, 0, 6, CZ + 2, 4, P, 36), { tone: "hi", className: "t-mint", crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 4, CZ + 6, 3, P, 28), { tone: "hi", className: "t-sky" }));
  o.push(S(k.cylinder(0, 0, 1.8, CZ + 9, 4, P, 16), { tone: "mid", crease: "none" }));
  o.push(D([at([0, 0, CZ + 13])], { size: 1, tone: "hi" }));
  return o.join("");
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "克卜勒軌道轉盤：太陽燈在橢圓焦點，行星沿橢圓軌道運行，連線在相同時間掃過相同面積，近日點快、遠日點慢。",
  body: [
    basePlate(k, P, HH, PLATE), table(),
    `<path data-part="sector" d="" fill="#7cc7ff" fill-opacity="0.38" stroke="none"/>`,
    `<path data-part="groove" class="iso-line" data-tone="mid" d=""/>`,
    `<path data-part="arm" class="iso-line" data-tone="lit" data-free="" d="" style="stroke-width:1.2"/>`,
    sunLamp(),
    knob(k, P, HH, -128, 78, 0, 5.5),
    `<g data-part="planet">${planet()}</g>`,
  ],
});
const live = `
const P=${JSON.stringify(P)}, A=${A}, CZ=${CZ};
const gEl=document.querySelector('[data-part="groove"]'), sEl=document.querySelector('[data-part="sector"]'), aEl=document.querySelector('[data-part="arm"]');
const pEl=document.querySelector('[data-part="planet"]'), sunEl=document.querySelector('[data-part="sun"]');
const stage=document.querySelector(".iso-stage");
let e=0.5, M=0.6, play=!still.matches, hist=[];
const T=10; // 一圈 10 秒（示意）
function pos(Mv){ let E=Mv; for(let i=0;i<6;i++)E=E-(E-e*Math.sin(E)-Mv)/(1-e*Math.cos(E));
  const x=A*Math.cos(E), y=A*Math.sqrt(1-e*e)*Math.sin(E), fx=A*e;
  return {x,y,fx,r:Math.hypot(x-fx,y)/A}; }
function groove(){ const pts=[]; for(let i=0;i<=72;i++){const E=i/72*2*Math.PI; pts.push([A*Math.cos(E), A*Math.sqrt(1-e*e)*Math.sin(E)]);} return onTop(pts,CZ+0.3,P,true); }
function draw(){
  const p=pos(M);
  gEl.setAttribute("d",groove());
  pEl.setAttribute("transform",translateAlong(P,[p.x,p.y,0]));
  sunEl.setAttribute("transform",translateAlong(P,[p.fx,0,0]));
  aEl.setAttribute("d",segment([p.fx,0,CZ+13],[p.x,p.y,CZ+6],P));
  // 過去 1/12 週期掃過的扇形
  const pts=[iso([p.fx,0,CZ+0.4],P)]; const N=18;
  for(let i=0;i<=N;i++){const q=pos(M-2*Math.PI/12+(2*Math.PI/12)*i/N); pts.push(iso([q.x,q.y,CZ+0.4],P));}
  sEl.setAttribute("d",pathOf(pts,true));
  const v=29.8*Math.sqrt(Math.max(0.05,2/p.r-1));
  const where=p.r<0.75?"近近日點":p.r>1.25?"近遠日點":"途中";
  setRead("r＝"+p.r.toFixed(2)+" AU · v＝"+v.toFixed(1)+" km/s","離心率 e＝"+e.toFixed(2)+"；日距 r＝"+p.r.toFixed(2)+" AU（"+where+"），速率 "+v.toFixed(1)+" km/s。藍扇形是最近 1/12 週期掃過的面積：走到哪都一樣大，所以近太陽時必須跑快。");
}
window.__tick=(dt)=>{ if(play)M=(M+2*Math.PI*dt/T)%(2*Math.PI); draw(); return play; };
document.getElementById("inE").addEventListener("input",ev=>{e=parseFloat(ev.target.value);document.getElementById("inEv").textContent=e.toFixed(2);draw();});
document.getElementById("bPlay").addEventListener("click",ev=>{play=!play;ev.target.setAttribute("aria-pressed",String(play));ev.target.textContent=play?"暫停":"播放";wake();});
document.getElementById("bNear").addEventListener("click",()=>{M=0;draw();});
document.getElementById("bFar").addEventListener("click",()=>{M=Math.PI;draw();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);play=false;document.getElementById("bPlay").textContent="播放";mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); M=clamp((ev.clientX-r.left)/r.width,0,1)*2*Math.PI; draw();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowRight"){M=(M+0.15)%(2*Math.PI);draw();} if(ev.key==="ArrowLeft"){M=(M-0.15+2*Math.PI)%(2*Math.PI);draw();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "kepler-orbit", fig: "圖 2 · 物理", title: "克卜勒軌道儀：等面積定律",
  hint: "拖動改位置，拉桿改橢圓扁平程度", readout: "r＝1.00 AU", detail: "近日點快、遠日點慢。",
  keys: [{ mark: "lit", label: "太陽—行星連線" }, { mark: "raised", label: "金太陽燈在焦點" }],
  point: "太陽在焦點不在中心；等時掃等面積，故近日點最快。",
  svg, live,
  controls: `<label>離心率 e <input id="inE" type="range" min="0" max="0.7" step="0.05" value="0.5"><span class="val" id="inEv">0.50</span></label>
<button id="bPlay" type="button" aria-pressed="true">暫停</button><button id="bNear" type="button">跳到近日點</button><button id="bFar" type="button">跳到遠日點</button>`,
});
