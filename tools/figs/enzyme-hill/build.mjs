/* 酵素能量丘壓機（bi-physio）：受質小球要翻過活化能丘才變產物。
   Ea 無酵素 80、有酵素 40 kJ/mol，ΔE＝−30 不變；每次嘗試能量取指數分布（平均 RT 量級經示意放大），
   成功率以 exp(−Ea/(R·T·k)) 形式呈現相對快慢；酵素 >60°C 變性失效、低溫只是變慢（回溫恢復）。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 450;
const PLATE = { x: -155, y: -80, w: 315, d: 160, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 105]], W, H, { pad: 26, azimuth: 40 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const TY = 6, TZ = 10; // 軌道 y、底高
const STEPS = [[-118, 0], [-86, 2], [-58, 8], [-34, 20], [-14, 36], [2, 46], [16, 36], [30, 20], [46, 10], [64, 4], [88, 0]]; // [x, 丘高]

function track() {
  const o = [];
  o.push(S(k.slabOf({ x: -132, y: TY - 20, w: 258, d: 40, r: 3 }, 0, TZ, P, 4, 0.5), { tone: "mid" }));
  for (let i = 0; i < STEPS.length - 1; i++) {
    const [x0, h0] = STEPS[i], [x1] = STEPS[i + 1];
    const peak = i === 4 || i === 5;
    const seg = S(k.slabOf({ x: x0, y: TY - 11, w: x1 - x0 + 1, d: 22, r: 1.2 }, TZ, Math.max(2.5, h0), P, 3, 0.4), { tone: "hi", className: peak ? "t-rose" : "t-sky", crease: "lo" });
    o.push(peak ? `<g data-peak="${i}">${seg}</g>` : seg);
  }
  o.push(S(k.slabOf({ x: -132, y: TY - 24, w: 258, d: 4, r: 1 }, TZ, 5, P, 2), { tone: "mid" })); // 後擋
  const t = k.sideTicks(-126, 120, 7, 5, TY + 20, TZ, [1.6, 3], P, "x");
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // 左受質倉、右產物倉
  o.push(S(k.slabOf({ x: -148, y: TY - 16, w: 18, d: 32, r: 2 }, 0, 16, P, 3, 0.5), { tone: "hi", className: "t-mint" }));
  o.push(k.faceTextSvg(k.topMatrix([-139, TY], 16.3, P, "x"), "受質", { size: 3.2, tone: "hi", anchor: "middle" }));
  o.push(S(k.slabOf({ x: 118, y: TY - 16, w: 26, d: 32, r: 2 }, 0, 10, P, 3, 0.5), { tone: "hi", className: "t-gold" }));
  o.push(k.faceTextSvg(k.topMatrix([131, TY], 10.3, P, "x"), "產物", { size: 3.2, tone: "hi", anchor: "middle" }));
  let prods = "";
  for (let i = 0; i < 8; i++) prods += `<g data-prod="${i}">${S(k.cylinder(124 + (i % 4) * 5.5, TY - 5 + Math.floor(i / 4) * 9, 2.2, 10, 3, P, 16), { tone: "hi", className: "t-gold" })}</g>`;
  o.push(prods);
  return o.join("");
}
function press() { // 酵素壓桿：橫樑與壓板在丘頂，live 下壓
  const o = [];
  o.push(post(k, P, HH, -6, TY - 34, 0, 88, 2.6));
  o.push(post(k, P, HH, 26, TY - 34, 0, 88, 2.6));
  o.push(`<g data-part="press">`
    + S(k.slabOf({ x: -14, y: TY - 38, w: 48, d: 10, r: 2 }, 86, 5, P, 3, 0.5), { tone: "mid" })
    + S(k.slabOf({ x: 2, y: TY - 35, w: 8, d: 27, r: 1.5 }, 63, 23, P, 2), { tone: "mid" })
    + S(k.slabOf({ x: -10, y: TY - 14, w: 32, d: 28, r: 2 }, 57, 6, P, 3, 0.5), { tone: "hi", className: "t-mint" })
    + k.faceTextSvg(k.topMatrix([6, TY], 63.3, P, "x"), "酵素", { size: 3.4, tone: "hi", anchor: "middle" })
    + `</g>`);
  o.push(knob(k, P, HH, 10, TY - 34, 91, 4.5));
  return o.join("");
}
function ball() {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -7, y: TY - 7, w: 14, d: 14, r: 6 }, 0, 0.1, P)}" style="filter:blur(2px)"/>`];
  o.push(S(k.cylinder(0, TY, 5.4, 0, 2.4, P, 28), { tone: "hi", className: "t-mint" }));
  o.push(S(k.cylinder(0, TY, 6.4, 2.4, 3.6, P, 32), { tone: "hi", className: "t-mint", crease: "lo" }));
  o.push(S(k.cylinder(0, TY, 4.6, 6, 2.4, P, 24), { tone: "hi", className: "t-mint" }));
  o.push(D([at([0, TY, 8.4])], { size: 0.6, tone: "hi" }));
  return o.join("");
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "酵素能量丘壓機：左邊受質小球要翻過中間粉紅能量丘才會變成右邊產物。薄荷色酵素壓板把丘壓低，小球就容易過去，但起點與終點高度差不變。",
  body: [basePlate(k, P, HH, PLATE), track(), press(), `<g data-part="ball">${ball()}</g>`, knob(k, P, HH, -132, 58, 0, 5)],
});
const live = `
const P=${JSON.stringify(P)}, TZ=${TZ}, STEPS=${JSON.stringify(STEPS)};
const ballEl=document.querySelector('[data-part="ball"]'), pressEl=document.querySelector('[data-part="press"]');
const peakEls=$$("[data-peak]"), prodEls=$$("[data-prod]");
const stage=document.querySelector(".iso-stage");
let enz=true, temp=37, ballX=-112, anim=null, tries=0, ok=0, touring=!still.matches, tourT=0, pressY=1, pressT=1;
const denatured=()=>temp>60;
const Ea=()=>(enz&&!denatured())?40:80;
function hillZ(x){ const drop=(enz&&!denatured())?pressY:0;
  for(let i=0;i<STEPS.length-1;i++){const [x0,h0]=STEPS[i],[x1,h1]=STEPS[i+1];
    if(x>=x0&&x<=x1){ let h=h0+(h1-h0)*(x-x0)/(x1-x0); const c=(x0+x1)/2; if(c>-20&&c<22)h-=drop*22*Math.exp(-Math.pow((x-1)/17,2)); return TZ+Math.max(2.5,h);}}
  return TZ+2.5; }
function pSucc(){ // 示意：平均嘗試能量隨溫度升，成功率對 Ea 指數敏感
  const avg=14+temp*0.55; return clamp(Math.exp(-Ea()/avg*1.55),0.005,0.97); }
function draw(){
  const bz=hillZ(ballX);
  ballEl.setAttribute("transform",translateAlong(P,[ballX,0,bz]));
  pressEl.setAttribute("transform",translateAlong(P,[0,0,-pressY*22]));
  peakEls.forEach(el=>el.setAttribute("transform",translateAlong(P,[0,0,-pressY*20])));
  pressEl.style.opacity=denatured()?"0.45":"1";
  prodEls.forEach((el,i)=>el.style.display=i<Math.min(8,ok)?"":"none");
  const p=pSucc();
  const rel=Math.exp((80-Ea())/(14+temp*0.55)*1.55);
  setRead("Ea＝"+Ea()+" kJ/mol","酵素"+(denatured()?"已變性失效（>60°C）":enz?"有":"無")+"、"+temp.toFixed(0)+"°C：活化能 Ea＝"+Ea()+" kJ/mol、反應熱 ΔE＝−30 kJ/mol（不變）；每次嘗試成功率≈"+(p*100).toFixed(0)+"%"+(enz&&!denatured()?"，約為無酵素的 "+rel.toFixed(1)+" 倍":"")+"。已嘗試 "+tries+" 次、成功 "+ok+" 顆。酵素不提供能量、反應後不變。");
}
function fire(){
  if(anim)return; tries++;
  const avg=14+temp*0.55; const E=-Math.log(1-Math.random()*0.999)*avg/1.55;
  const cross=E>=Ea()*0.62; // 與 pSucc 同量級的示意門檻
  anim={x0:-112,t:0,cross, peakX:2};
  wake();
}
window.__tick=(dt)=>{
  pressY+= ((pressT)-pressY)*(1-Math.exp(-dt/0.18)); if(Math.abs(pressT-pressY)<0.01)pressY=pressT;
  if(touring){tourT+=dt; if(tourT>1.0&&!anim){fire(); tourT=0;}}
  if(anim){ anim.t+=dt*0.85; const t=anim.t;
    if(anim.cross){ ballX=lerp(-112,126,clamp(t,0,1)); if(t>=1){ok++; anim=null; ballX=-112;} }
    else { const half=clamp(t*2,0,1); const go=lerp(-112,-24,half); ballX=t<0.5?go:lerp(-24,-112,clamp((t-0.5)*2,0,1)); if(t>=1){anim=null; ballX=-112;} }
  }
  draw(); return !!anim||touring||Math.abs(pressT-pressY)>0.01;
};
document.getElementById("bEnz").addEventListener("click",ev=>{enz=!enz; pressT=enz?1:0; touring=false; ev.target.setAttribute("aria-pressed",String(enz)); ev.target.textContent=enz?"酵素：加入":"酵素：拿掉"; draw(); wake(); idleTour(6000,()=>{touring=true;tourT=0;});});
document.getElementById("inT").addEventListener("input",ev=>{temp=parseFloat(ev.target.value); document.getElementById("inTv").textContent=temp.toFixed(0)+"°C"; touring=false; pressT=(enz&&!denatured())?1:(enz?0:0); draw(); wake(); idleTour(6000,()=>{touring=true;tourT=0;});});
document.getElementById("bFire").addEventListener("click",()=>{touring=false; fire(); idleTour(6000,()=>{touring=true;tourT=0;});});
document.getElementById("bReset").addEventListener("click",()=>{tries=0;ok=0;anim=null;ballX=-112;draw();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);touring=false;mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>{if(drag){drag=false;fire();}});
stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); if(!anim)ballX=clamp(-112+clamp((ev.clientX-r.left)/r.width,0,1)*130,-112,10); draw();}
stage.addEventListener("keydown",ev=>{if(ev.key===" "||ev.key==="Enter"){ev.preventDefault();touring=false;fire();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "enzyme-hill", fig: "圖 10 · 生物", title: "酵素壓機：活化能丘",
  hint: "按「發射受質」試翻丘，切換酵素與溫度", readout: "Ea＝40 kJ/mol", detail: "酵素把活化能丘壓低，反應熱不變。",
  keys: [{ mark: "lit", label: "薄荷壓板＝酵素" }, { mark: "raised", label: "粉紅丘頂＝活化能" }],
  point: "酵素降低活化能、不供能不改變 ΔE；高溫變性、低溫僅變慢（成功率為示意）。",
  svg, live,
  controls: `<label>溫度 <input id="inT" type="range" min="0" max="100" step="1" value="37"><span class="val" id="inTv">37°C</span></label>
<button id="bEnz" type="button" aria-pressed="true">酵素：加入</button><button id="bFire" type="button">發射受質</button><button id="bReset" type="button">歸零</button>`,
});
