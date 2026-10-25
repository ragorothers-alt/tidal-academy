/* 單位圓儀（ma2-trig）：轉盤上半徑 1 的單位圓，終邊交圓於 P＝(cosθ, sinθ)。
   藍段是 P 在 x 軸的投影 cosθ，綠段是縱坐標 sinθ，金段是切線 x＝1 上的 tanθ＝sinθ/cosθ；
   度與弧度、象限與參考角都由同一個 θ 算出（tan 圖示超過 ±1.6 時截斷，數值仍照算）。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 460;
const PLATE = { x: -158, y: -108, w: 316, d: 216, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 58]], W, H, { pad: 24, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const C = [-24, 2], DZ = 10, R = 62, DR = 94;

function disc() {
  const o = [];
  o.push(S(k.cylinder(C[0], C[1], DR, 0, DZ, P, 72, 1), { tone: "mid", crease: "lo" }));
  o.push(L(k.ring(C[0], C[1], DR - 4, DZ, P, 144), { tone: "lo" }));
  o.push(L(k.ring(C[0], C[1], DR - 6.4, DZ, P, 144), { tone: "faint" }));
  const t = k.radialTicks(C[0], C[1], DR - 4, 72, 6, DZ, [1.2, 2.4], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  o.push(L(k.ring(C[0], C[1], R, DZ + 0.3, P, 96), { tone: "hi" }));
  o.push(L(k.ring(C[0], C[1], R - 9, DZ + 0.3, P, 96), { tone: "faint" }));
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; o.push(D([at([C[0] + Math.cos(a) * R, C[1] - Math.sin(a) * R, DZ + 0.4])], { size: i % 3 ? 0.5 : 0.85, tone: "mid" })); }
  // 坐標軸（數學 y 向上＝世界 −y）
  o.push(L(k.lineOnTop([C[0] - 80, C[1]], [C[0] + 80, C[1]], DZ + 0.3, P), { tone: "mid" }));
  o.push(L(k.lineOnTop([C[0], C[1] - 80], [C[0], C[1] + 80], DZ + 0.3, P), { tone: "mid" }));
  for (const [x, y] of [[80, 0], [-80, 0], [0, -80], [0, 80]]) o.push(S(k.cylinder(C[0] + x, C[1] + y, 2.4, DZ, 2, P, 18), { tone: "mid" }));
  o.push(k.faceTextSvg(k.topMatrix([C[0] + 84, C[1] + 10], DZ + 0.5, P, "x"), "0°", { size: 3.4, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([C[0] - 10, C[1] - 84], DZ + 0.5, P, "x"), "90°", { size: 3.4, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([C[0] - 84, C[1] - 10], DZ + 0.5, P, "x"), "180°", { size: 3.4, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([C[0] + 12, C[1] + 84], DZ + 0.5, P, "x"), "270°", { size: 3.4, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([C[0] + 30, C[1] + 14], DZ + 0.5, P, "x"), "半徑 1", { size: 3, tone: "mid", anchor: "middle" }));
  // 切線 x＝1 的直軌
  o.push(S(k.slabOf({ x: C[0] + R - 2, y: C[1] - 64, w: 4.5, d: 128, r: 1 }, DZ, 1.4, P, 2), { tone: "hi", crease: "lo" }));
  o.push(post(k, P, HH, C[0] + R, C[1] - 66, DZ, 12, 1.4));
  o.push(post(k, P, HH, C[0] + R, C[1] + 66, DZ, 12, 1.4));
  o.push(k.faceTextSvg(k.topMatrix([C[0] + R + 12, C[1] - 52], DZ + 0.5, P, "x"), "切線 x＝1", { size: 3, tone: "hi", anchor: "middle" }));
  // 中心樞軸
  o.push(S(k.cylinder(C[0], C[1], 6.5, DZ, 4, P, 32), { tone: "mid" }));
  o.push(knob(k, P, HH, C[0], C[1], DZ + 4, 4));
  o.push(k.faceTextSvg(k.topMatrix([C[0] - 14, C[1] + 14], DZ + 0.5, P, "x"), "原點", { size: 3, tone: "mid", anchor: "middle" }));
  return o.join("");
}
function signBoard() {
  const o = [];
  const bx = 96, by = 58;
  o.push(S(k.slabOf({ x: bx - 34, y: by - 17, w: 68, d: 34, r: 3 }, 0, 6, P, 4, 0.6), { tone: "mid" }));
  o.push(S(k.slabOf({ x: bx - 30, y: by - 13, w: 60, d: 26, r: 2 }, 6, 1.2, P, 3), { tone: "hi", crease: "lo" }));
  o.push(k.faceTextSvg(k.topMatrix([bx, by - 4], 7.4, P, "x"), "一全二正", { size: 3.6, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([bx, by + 7], 7.4, P, "x"), "三切四餘", { size: 3.6, tone: "hi", anchor: "middle" }));
  o.push(knob(k, P, HH, bx - 38, by + 22, 0, 4.5));
  o.push(post(k, P, HH, bx + 40, by - 20, 0, 26, 1.6));
  o.push(S(k.cylinder(bx + 40, by - 20, 3.4, 26, 2.5, P, 20), { tone: "hi", className: "t-sky" }));
  return o.join("");
}
function puck(cls, r = 5) {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -8, y: -8, w: 16, d: 16, r: 7 }, DZ, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.cylinder(0, 0, r + 1.6, DZ, 2, P, 28), { tone: "mid" }));
  o.push(S(k.cylinder(0, 0, r, DZ + 2, 4.5, P, 32, 0.4), { tone: "hi", className: cls, crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 1.8, DZ + 6.5, 3.5, P, 14), { tone: "mid", crease: "none" }));
  o.push(D([at([0, 0, DZ + 10])], { size: 0.85, tone: "hi" }));
  return o.join("");
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "單位圓轉盤：終邊與單位圓交於一點，藍段是 cos 的投影、綠段是 sin、金色切線段是 tan，讀數顯示角度、弧度、象限與參考角。",
  body: [basePlate(k, P, HH, PLATE), disc(), signBoard(),
    `<path data-part="sector" d="" fill="#ffc94a" fill-opacity="0.4" stroke="none"/>`,
    `<path data-part="ray" d="" fill="none" stroke="#9a7d62" stroke-width="1" stroke-dasharray="3 3"/>`,
    `<path data-part="cos" d="" fill="none" stroke="#3e7fbf" stroke-width="3" stroke-linecap="round"/>`,
    `<path data-part="sin" d="" fill="none" stroke="#1f9d7a" stroke-width="3" stroke-linecap="round"/>`,
    `<path data-part="tan" d="" fill="none" stroke="#d98a2b" stroke-width="3" stroke-linecap="round"/>`,
    `<path data-part="arm" d="" fill="none" stroke="#3e5a8c" stroke-width="2.2" stroke-linecap="round"/>`,
    `<g data-part="foot">${puck("t-sky", 3.6)}</g>`,
    `<g data-part="tanpt">${puck("t-rose", 3.6)}</g>`,
    `<g data-part="pt">${puck("t-gold", 5)}</g>`],
});
const live = `
const P=${JSON.stringify(P)}, C=${JSON.stringify(C)}, DZ=${DZ}, R=${R};
const stage=document.querySelector(".iso-stage");
const el={}; for(const n of ["sector","ray","cos","sin","tan","arm","foot","tanpt","pt"]) el[n]=document.querySelector('[data-part="'+n+'"]');
let deg=50, spin=false;
const W2=(mx,my)=>[C[0]+R*mx, C[1]-R*my, DZ+1.6];
function seg(a,b){return segment(W2(a[0],a[1]),W2(b[0],b[1]),P);}
function gcd(a,b){return b?gcd(b,a%b):a;}
function draw(){
  const d=((Math.round(deg)%360)+360)%360, th=d*Math.PI/180;
  const c=Math.cos(th), s=Math.sin(th);
  el.pt.setAttribute("transform",translateAlong(P,W2(c,s).map((v,i)=>i<2?v:0)));
  el.foot.setAttribute("transform",translateAlong(P,[C[0]+R*c,C[1],0]));
  el.arm.setAttribute("d",seg([0,0],[c,s]));
  el.cos.setAttribute("d",seg([0,0],[c,0]));
  el.sin.setAttribute("d",seg([c,0],[c,s]));
  const ax=[]; const n=Math.max(2,Math.round(d/6));
  ax.push(iso([C[0],C[1],DZ+1.2],P));
  for(let i=0;i<=n;i++){const a=i/n*th; ax.push(iso(W2(Math.cos(a)*0.34,Math.sin(a)*0.34),P));}
  el.sector.setAttribute("d",pathOf(ax,true));
  const undef=Math.abs(c)<1e-9, tn=undef?Infinity:s/c;
  const showTan=!undef&&Math.abs(tn)<=1.6;
  el.tanpt.style.opacity=showTan?"1":"0.12";
  if(showTan){ el.tanpt.setAttribute("transform",translateAlong(P,[C[0]+R,C[1]-R*tn,0])); el.tan.setAttribute("d",seg([1,0],[1,tn])); el.ray.setAttribute("d",seg([c,s],[1,tn])); }
  else { el.tan.setAttribute("d",""); el.ray.setAttribute("d",""); }
  const quad=d%90===0?"在坐標軸上":("第"+"一二三四"[Math.floor(d/90)]+"象限");
  const rr=d%180, ref=rr<=90?rr:180-rr;
  const g=gcd(d,180)||1, fn=d/g, fd=180/g;
  const radTxt=d===0?"0 弧度":(fd===1?(fn===1?"π":fn+"π"):(fn===1?"π/"+fd:fn+"π/"+fd))+" 弧度（約 "+th.toFixed(2)+"）";
  const sgn=v=>v>0.0005?"+":v<-0.0005?"−":"0";
  const tanTxt=undef?"tan 無定義（cos＝0）":"tanθ＝"+tn.toFixed(2)+(Math.abs(tn)>1.6?"（切線段超出圖面）":"");
  setRead("θ＝"+d+"° · sin "+s.toFixed(2)+"、cos "+c.toFixed(2),
    "θ＝"+d+"°＝"+radTxt+"，"+quad+"，參考角 "+ref+"°。圓上點 (cosθ, sinθ)＝("+c.toFixed(2)+", "+s.toFixed(2)+")；藍段 cosθ＝"+c.toFixed(2)+"、綠段 sinθ＝"+s.toFixed(2)+"、"+tanTxt+"。正負號 sin "+sgn(s)+"、cos "+sgn(c)+"、tan "+(undef?"—":sgn(tn))+"，且 sin²θ＋cos²θ＝1。");
  const sl=document.getElementById("inD"); if(document.activeElement!==sl) sl.value=d;
  document.getElementById("inDv").textContent=d+"°";
}
window.__tick=(dt)=>{ if(!spin) return false; deg+=dt*28; draw(); return true; };
document.getElementById("inD").addEventListener("input",ev=>{deg=parseFloat(ev.target.value); spin=false; syncSpin(); draw();});
function syncSpin(){const b=document.getElementById("bSpin"); b.setAttribute("aria-pressed",String(spin)); b.textContent=spin?"停止轉動":"自動轉一圈";}
document.getElementById("bSpin").addEventListener("click",()=>{ if(still.matches){deg+=30; draw(); return;} spin=!spin; syncSpin(); wake(); });
document.querySelectorAll("[data-deg]").forEach(b=>b.addEventListener("click",()=>{deg=parseFloat(b.dataset.deg); spin=false; syncSpin(); draw();}));
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true; stage.setPointerCapture(ev.pointerId); spin=false; syncSpin(); mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); deg=clamp((ev.clientX-r.left)/r.width,0,0.999)*360; draw();}
stage.addEventListener("keydown",ev=>{const st=ev.shiftKey?15:5; if(ev.key==="ArrowRight"){deg+=st;draw();} if(ev.key==="ArrowLeft"){deg-=st;draw();}});
draw();
`;
emit({
  k, kitScript, id: "unit-circle", fig: "圖 11 · 數學", title: "單位圓儀：sin、cos 與 tan 投影",
  hint: "左右拖或拉滑桿轉終邊，看藍綠金三段與正負號", readout: "θ＝50°", detail: "圓上點坐標就是 (cosθ, sinθ)。",
  keys: [{ mark: "blue", label: "藍段＝cosθ（x 投影）" }, { mark: "green", label: "綠段＝sinθ" }, { mark: "lit", label: "金段＝tanθ（切線段）" }],
  point: "點坐標 (cosθ, sinθ)；tan＝sin/cos，先看象限定正負。",
  svg, live,
  controls: `<label>角度 θ <input id="inD" type="range" min="0" max="359" step="1" value="50"><span class="val" id="inDv">50°</span></label>
<button type="button" data-deg="30">30°</button><button type="button" data-deg="150">150°</button><button type="button" data-deg="210">210°</button><button type="button" data-deg="330">330°</button>
<button id="bSpin" type="button" aria-pressed="false">自動轉一圈</button>`,
});
