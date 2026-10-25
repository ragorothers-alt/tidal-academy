/* 向量起重機（ma2-vec）：格子吊床上兩支吊臂 a、b 以平行四邊形法合成 a＋b。
   全部由分量計算：|a|＝√(x²＋y²)、a·b＝x₁x₂＋y₁y₂＝|a||b|cosθ、
   平行四邊形面積＝|x₁y₂−x₂y₁|、a 在 b 上的正射影長＝|a·b|/|b|（數學 y 向上對應世界 −y）。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 460;
const PLATE = { x: -160, y: -108, w: 320, d: 216, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 66]], W, H, { pad: 24, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const O = [-72, 58], SC = 17, BZ = 8; // 原點（世界）、每格單位、床面高

function bed() {
  const o = [];
  o.push(S(k.slabOf({ x: -148, y: -92, w: 292, d: 184, r: 4 }, 0, BZ, P, 4, 0.6), { tone: "mid" }));
  // 格線範圍：數學 x −4…10、y −2…8，最外圈格線就是邊框，每條線兩端都落在邊框或另一條格線上
  const GX0 = O[0] - 4 * SC, GX1 = O[0] + 10 * SC, GY0 = O[1] - 8 * SC, GY1 = O[1] + 2 * SC;
  for (let i = -4; i <= 10; i++) o.push(L(k.lineOnTop([O[0] + i * SC, GY0], [O[0] + i * SC, GY1], BZ + 0.3, P), { tone: i === 0 ? "mid" : "faint" }));
  for (let j = -2; j <= 8; j++) o.push(L(k.lineOnTop([GX0, O[1] - j * SC], [GX1, O[1] - j * SC], BZ + 0.3, P), { tone: j === 0 ? "mid" : "faint" }));
  o.push(L(k.lineOnTop([GX0, O[1]], [GX1, O[1]], BZ + 0.4, P), { tone: "hi" }));
  o.push(L(k.lineOnTop([O[0], GY1], [O[0], GY0], BZ + 0.4, P), { tone: "hi" }));
  // 原點吊塔
  o.push(S(k.cylinder(O[0], O[1], 9, BZ, 4, P, 36), { tone: "mid" }));
  o.push(post(k, P, HH, O[0], O[1], BZ + 4, 34, 2.4));
  o.push(S(k.cylinder(O[0], O[1], 5, BZ + 38, 4, P, 28), { tone: "hi", className: "t-navy" }));
  o.push(k.faceTextSvg(k.topMatrix([O[0] - 16, O[1] + 16], BZ + 0.5, P, "x"), "原點 O", { size: 3.2, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([O[0] + 180, O[1] + 14], BZ + 0.5, P, "x"), "x 分量 →", { size: 3.2, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([O[0] - 16, O[1] - 140], BZ + 0.5, P, "x"), "y 分量", { size: 3.2, tone: "hi", anchor: "middle" }));
  // 床緣刻度與角柱
  const t = k.sideTicks(-140, 136, 8.5, 2, 92, BZ, [1.5, 2.8], P, "x");
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  for (const [x, y] of [[-140, -84], [136, -84], [136, 84]]) { o.push(post(k, P, HH, x, y, BZ, 18, 1.6)); o.push(S(k.cylinder(x, y, 3, BZ + 18, 2.4, P, 18), { tone: "hi", className: "t-gold" })); }
  o.push(knob(k, P, HH, -140, 84, BZ, 4.5));
  o.push(S(k.slabOf({ x: 104, y: 62, w: 40, d: 22, r: 2 }, BZ, 2, P, 3), { tone: "hi", crease: "lo" }));
  o.push(k.faceTextSvg(k.topMatrix([124, 73], BZ + 2.3, P, "x"), "每格 1 單位", { size: 3, tone: "hi", anchor: "middle" }));
  return o.join("");
}
function puck(cls, r = 4.6) {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -8, y: -8, w: 16, d: 16, r: 7 }, BZ, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.cylinder(0, 0, r + 1.8, BZ, 2, P, 28), { tone: "mid" }));
  o.push(S(k.cylinder(0, 0, r, BZ + 2, 5, P, 32, 0.4), { tone: "hi", className: cls, crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 1.7, BZ + 7, 6, P, 14), { tone: "mid", crease: "none" }));
  o.push(D([at([0, 0, BZ + 13])], { size: 0.9, tone: "hi" }));
  return o.join("");
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "向量格子吊床：藍吊臂 a 與綠吊臂 b 從原點伸出，虛線補成平行四邊形，金色對角線是合成向量 a＋b，面積與內積由分量算出。",
  body: [basePlate(k, P, HH, PLATE), bed(),
    `<path data-part="para" d="" fill="#ffc94a" fill-opacity="0.3" stroke="none"/>`,
    `<path data-part="arc" d="" fill="none" stroke="#3e5a8c" stroke-width="1.4"/>`,
    `<path data-part="ac" d="" fill="none" stroke="#1f9d7a" stroke-width="1.6" stroke-dasharray="4 3"/>`,
    `<path data-part="bc" d="" fill="none" stroke="#3e7fbf" stroke-width="1.6" stroke-dasharray="4 3"/>`,
    `<path data-part="va" d="" fill="none" stroke="#3e7fbf" stroke-width="3" stroke-linecap="round"/>`,
    `<path data-part="vb" d="" fill="none" stroke="#1f9d7a" stroke-width="3" stroke-linecap="round"/>`,
    `<path data-part="vc" d="" fill="none" stroke="#d98a2b" stroke-width="3.2" stroke-linecap="round"/>`,
    `<g data-part="pa">${puck("t-sky")}</g>`,
    `<g data-part="pb">${puck("t-mint")}</g>`,
    `<g data-part="pc">${puck("t-gold", 5.4)}</g>`],
});
const live = `
const P=${JSON.stringify(P)}, O=${JSON.stringify(O)}, SC=${SC}, BZ=${BZ};
const stage=document.querySelector(".iso-stage");
const el={}; for(const n of ["para","arc","ac","bc","va","vb","vc","pa","pb","pc"]) el[n]=document.querySelector('[data-part="'+n+'"]');
let A=[3,1], B=[1,3], sel="A";
const W2=(v)=>[O[0]+SC*v[0], O[1]-SC*v[1], BZ+1.4];
function seg(a,b){return segment(W2(a),W2(b),P);}
const fmt=v=>(Math.round(v*100)/100).toString();
function draw(){
  const c=[A[0]+B[0],A[1]+B[1]];
  el.pa.setAttribute("transform",translateAlong(P,[W2(A)[0],W2(A)[1],0]));
  el.pb.setAttribute("transform",translateAlong(P,[W2(B)[0],W2(B)[1],0]));
  el.pc.setAttribute("transform",translateAlong(P,[W2(c)[0],W2(c)[1],0]));
  el.va.setAttribute("d",seg([0,0],A)); el.vb.setAttribute("d",seg([0,0],B)); el.vc.setAttribute("d",seg([0,0],c));
  el.ac.setAttribute("d",seg(A,c)); el.bc.setAttribute("d",seg(B,c));
  el.para.setAttribute("d",pathOf([W2([0,0]),W2(A),W2(c),W2(B)].map(p=>iso(p,P)),true));
  const la=Math.hypot(A[0],A[1]), lb=Math.hypot(B[0],B[1]), lc=Math.hypot(c[0],c[1]);
  const dot=A[0]*B[0]+A[1]*B[1], det=A[0]*B[1]-A[1]*B[0];
  let angTxt, arcD="";
  if(la<1e-9||lb<1e-9){ angTxt="有零向量，夾角無定義"; }
  else{
    const cs=clamp(dot/(la*lb),-1,1), ang=Math.acos(cs)*180/Math.PI;
    const kind=Math.abs(dot)<1e-9?"（垂直）":dot>0?"（銳角）":"（鈍角）";
    angTxt="夾角 θ＝"+fmt(ang)+"°"+kind+"，cosθ＝"+fmt(cs);
    const a1=Math.atan2(A[1],A[0]), a2=Math.atan2(B[1],B[0]);
    let d=a2-a1; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
    const pts=[]; const n=16;
    for(let i=0;i<=n;i++){const a=a1+d*i/n; pts.push(iso(W2([Math.cos(a)*1.15,Math.sin(a)*1.15]),P));}
    arcD=pathOf(pts,false);
  }
  el.arc.setAttribute("d",arcD);
  const par=Math.abs(det)<1e-9&&(la>0&&lb>0)?"；行列式為 0，兩向量平行":"";
  const proj=lb<1e-9?"—":fmt(Math.abs(dot)/lb);
  setRead("a＋b＝("+c[0]+", "+c[1]+") · a·b＝"+fmt(dot),
   "藍 a＝("+A[0]+", "+A[1]+")，|a|＝"+fmt(la)+"；綠 b＝("+B[0]+", "+B[1]+")，|b|＝"+fmt(lb)+"。金 a＋b＝("+c[0]+", "+c[1]+")，|a＋b|＝"+fmt(lc)+"。內積 a·b＝"+A[0]+"×"+B[0]+"＋"+A[1]+"×"+B[1]+"＝"+fmt(dot)+"；"+angTxt+"。平行四邊形面積＝|"+fmt(det)+"|＝"+fmt(Math.abs(det))+"（三角形為其一半）；a 在 b 上的正射影長＝"+proj+par+"。");
  const v=sel==="A"?A:B;
  document.getElementById("inX").value=v[0]; document.getElementById("inY").value=v[1];
  document.getElementById("inXv").textContent=v[0]; document.getElementById("inYv").textContent=v[1];
  document.getElementById("selName").textContent=sel==="A"?"藍 a":"綠 b";
  document.querySelectorAll("[data-sel]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.sel===sel)));
}
function setV(x,y){ const v=[clamp(Math.round(x),-2,5),clamp(Math.round(y),-2,4)]; if(sel==="A")A=v; else B=v; draw(); }
document.getElementById("inX").addEventListener("input",ev=>setV(parseFloat(ev.target.value),(sel==="A"?A:B)[1]));
document.getElementById("inY").addEventListener("input",ev=>setV((sel==="A"?A:B)[0],parseFloat(ev.target.value)));
document.querySelectorAll("[data-sel]").forEach(b=>b.addEventListener("click",()=>{sel=b.dataset.sel; draw();}));
document.querySelectorAll("[data-preset]").forEach(b=>b.addEventListener("click",()=>{const p=b.dataset.preset.split(",").map(Number); A=[p[0],p[1]]; B=[p[2],p[3]]; draw();}));
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true; stage.setPointerCapture(ev.pointerId); mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); const fx=(ev.clientX-r.left)/r.width, fy=(ev.clientY-r.top)/r.height; setV(fx*9-3, 5-fy*7.5);}
stage.addEventListener("keydown",ev=>{const v=sel==="A"?A:B; if(ev.key==="ArrowRight")setV(v[0]+1,v[1]); if(ev.key==="ArrowLeft")setV(v[0]-1,v[1]); if(ev.key==="ArrowUp")setV(v[0],v[1]+1); if(ev.key==="ArrowDown")setV(v[0],v[1]-1);});
draw();
`;
emit({
  k, kitScript, id: "vector-crane", fig: "圖 12 · 數學", title: "向量起重機：合成、夾角與內積",
  hint: "先選藍 a 或綠 b，在格子上拖終點或拉分量滑桿", readout: "a＋b＝(4, 4)", detail: "虛線補成平行四邊形，金線是合成向量。",
  keys: [{ mark: "blue", label: "藍臂＝a" }, { mark: "green", label: "綠臂＝b" }, { mark: "lit", label: "金線＝a＋b、淡金面＝平行四邊形" }],
  point: "內積＝分量乘加＝|a||b|cosθ；內積 0 為垂直，行列式 0 為平行。",
  svg, live,
  controls: `<button type="button" data-sel="A" aria-pressed="true">調藍 a</button><button type="button" data-sel="B" aria-pressed="false">調綠 b</button>
<label><span id="selName">藍 a</span> 的 x 分量 <input id="inX" type="range" min="-2" max="5" step="1" value="3"><span class="val" id="inXv">3</span></label>
<label>y 分量 <input id="inY" type="range" min="-2" max="4" step="1" value="1"><span class="val" id="inYv">1</span></label>
<button type="button" data-preset="3,1,1,3">例：(3,1) 與 (1,3)</button><button type="button" data-preset="4,2,-1,2">例：垂直</button><button type="button" data-preset="2,1,4,2">例：平行</button>`,
});
