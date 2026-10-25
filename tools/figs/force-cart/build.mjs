/* 力學台車：F合＝ma（ph-motion）。水平軌道台車由砝碼經滑輪拉動，
   a＝(mg−f)/(M+m)，g＝9.8 m/s²；摩擦力為定值動摩擦（簡化）。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();

const W = 720, H = 440;
const PLATE = { x: -155, y: -72, w: 315, d: 144, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 52]], W, H, { pad: 26, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;

const TRACK = { x: -125, y: -17, w: 250, d: 34, r: 2 };
function track() {
  const o = [];
  o.push(S(k.slabOf(TRACK, 0, 6, P, 4, 0.6), { tone: "mid" }));
  for (const y of [-12, 7]) o.push(S(k.slabOf({ x: -122, y, w: 244, d: 5, r: 1 }, 6, 3, P, 3, 0.4), { tone: "hi" }));
  for (const x of [-130, 122]) { // 兩端擋塊
    o.push(S(k.slabOf({ x, y: -19, w: 6, d: 38, r: 1.2 }, 0, 14, P, 3, 0.5), { tone: "mid" }));
    o.push(D([at([x + 3, -12, 14]), at([x + 3, 12, 14])], { size: 0.45 }));
  }
  const t = k.sideTicks(-120, 120, 6, 5, TRACK.y + TRACK.d, 6, [1.6, 3], P, "x");
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // 右端緩衝簧
  const c = k.coil(104, 122, [0, 12], 3.4, 5, "x", P);
  o.push(L(c.back, { tone: "lo" }), L(c.front, { tone: "mid" }));
  o.push(S(k.slabOf({ x: 100, y: -4, w: 4, d: 8, r: 1 }, 9, 7, P, 2), { tone: "mid" }));
  return o.join("");
}
function gates() { // 兩座光電閘門
  const o = [];
  for (const gx of [-45, 45]) {
    for (const gy of [-19, 19]) o.push(post(k, P, HH, gx, gy, 6, 30, 2.2));
    o.push(S(k.slabOf({ x: gx - 4, y: -21, w: 8, d: 42, r: 1.5 }, 36, 4, P, 3, 0.4), { tone: "mid" }));
    o.push(D([at([gx, -19, 40]), at([gx, 19, 40])], { size: 0.45 }));
    o.push(L(k.lineOnTop([gx, -19], [gx, 19], 40, P), { tone: "faint" }));
  }
  return o.join("");
}
function pulley() {
  const o = [];
  o.push(S(k.slabOf({ x: 108, y: -10, w: 20, d: 20, r: 2 }, 9, 3, P, 3), { tone: "mid" }));
  o.push(S(k.cylinder(118, 0, 9, 12, 3, P, 40, 0.5), { tone: "hi", className: "t-navy", crease: "lo" }));
  o.push(S(k.cylinder(118, 0, 2.4, 15, 3, P, 20), { tone: "mid" }));
  o.push(L(k.ring(118, 0, 6.5, 15, P, 40), { tone: "lo" }));
  // 砝碼導管（兩根導柱＋頂板）
  for (const gy of [-9, 9]) o.push(post(k, P, HH, 142, gy, 0, 42, 1.8));
  o.push(S(k.slabOf({ x: 134, y: -12, w: 16, d: 24, r: 2 }, 42, 3.5, P, 3, 0.4), { tone: "mid" }));
  o.push(D([at([142, -9, 45.5]), at([142, 9, 45.5])], { size: 0.45 }));
  o.push(knob(k, P, HH, -140, 52, 0, 5));
  return o.join("");
}
function cart() { // 以 x=0 為中心建，live 平移
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -19, y: -13, w: 38, d: 26, r: 3 }, 9, 0.1, P)}" style="filter:blur(3px)"/>`];
  o.push(S(k.slabOf({ x: -19, y: -13, w: 38, d: 26, r: 3 }, 9, 7, P, 5, 0.6), { tone: "hi", className: "t-gold", crease: "lo" }));
  o.push(L(k.planOutline({ x: -16, y: -10, w: 32, d: 20, r: 2 }, 16, P, 4), { tone: "lo" }));
  for (const bx of [-13, 13]) for (const by of [-11, 11]) o.push(S(k.cylinder(bx, by, 3.4, 6, 3, P, 20), { tone: "mid" }));
  for (let i = 0; i < 4; i++) // 可加載砝碼片（live 切換顯示）
    o.push(`<g data-cblock="${i}">${S(k.slabOf({ x: -11, y: -8, w: 22, d: 16, r: 1.5 }, 16 + i * 3.2, 3, P, 3, 0.4), { tone: "mid", className: "t-navy" })}</g>`);
  o.push(S(k.slabOf({ x: -1.2, y: -6, w: 2.4, d: 12, r: 0.8 }, 16, 17, P, 2), { tone: "hi", lit: true })); // 遮光旗
  o.push(D([at([17, 0, 13])], { size: 0.9, tone: "hi" }));
  o.push(S(k.cylinder(17, 0, 1.6, 11, 3, P, 14), { tone: "mid" })); // 掛鉤座
  return o.join("");
}
function hanger() { // 以 z=0 為底建，live 上下平移
  const o = [];
  o.push(S(k.cylinder(142, 0, 2, 8, 7, P, 16), { tone: "mid", crease: "none" }));
  o.push(S(k.cylinder(142, 0, 7.5, 6, 2, P, 32), { tone: "mid" }));
  for (let i = 0; i < 6; i++)
    o.push(`<g data-hdisc="${i}">${S(k.cylinder(142, 0, 6.6, i * 2.6 - 8, 2.4, P, 32, 0.3), { tone: "hi", className: i % 2 ? "t-mint" : "t-sky", crease: "lo" })}</g>`);
  o.push(D([at([142, 0, 15])], { size: 0.8, tone: "hi" }));
  return o.join("");
}

const X0 = -100, SPAN = 195; // 世界位移範圍（195 單位 ≙ 0.98 m，刻度 200 單位/m）
const svg = k.figureSvg({
  width: W, height: H,
  label: "力學台車實驗台：金色台車在水平軌道上，由細繩經滑輪連到砝碼。台車加速度等於合力除以總質量。",
  body: [
    basePlate(k, P, HH, PLATE), track(), gates(), pulley(),
    `<path data-part="string" class="iso-line" data-tone="hi" data-free="" d=""/>`,
    `<g data-part="cart">${cart()}</g>`,
    `<g data-part="hanger">${hanger()}</g>`,
  ],
});

const live = `
const P=${JSON.stringify(P)}, X0=${X0}, SPAN=${SPAN}, SCALE=200;
const cartEl=document.querySelector('[data-part="cart"]'), hangEl=document.querySelector('[data-part="hanger"]'), strEl=document.querySelector('[data-part="string"]');
const stage=document.querySelector(".iso-stage");
let M=0.60, m=0.15, fric=0, s=0, v=0, t=0, run=false, touring=!still.matches, tourT=0;
const acc=()=>Math.max(0,(m*9.8-fric)/(M+m));
function draw(){
  const cx=X0+s*SCALE;
  cartEl.setAttribute("transform",translateAlong(P,[cx,0,0]));
  const wz=30-s*20;
  hangEl.setAttribute("transform",translateAlong(P,[0,0,wz-8]));
  strEl.setAttribute("d",pathOf([iso([cx+18,0,13],P),iso([118,0,14],P),iso([142,0,wz+7],P)]));
  $$("[data-cblock]").forEach((el,i)=>el.style.display=i<Math.round((M-0.4)/0.2)?"":"none");
  $$("[data-hdisc]").forEach((el,i)=>el.style.display=i<Math.round(m/0.05)?"":"none");
  const a=acc(), F=Math.max(0,m*9.8-fric);
  setRead("a＝"+a.toFixed(2)+" m/s²", "合力 F＝"+F.toFixed(2)+" N（砝碼重 "+(m*9.8).toFixed(2)+" N－摩擦 "+fric.toFixed(1)+" N）÷ 總質量 "+(M+m).toFixed(2)+" kg ＝ a "+a.toFixed(2)+" m/s²；目前 v＝"+v.toFixed(2)+" m/s、x＝"+s.toFixed(2)+" m、t＝"+t.toFixed(2)+" s"+(run?"":(a===0?"（拉不動：砝碼重 ≤ 摩擦力）":"（按「放手」開始）")));
}
window.__tick=(dt)=>{
  if(touring){tourT+=dt; if(!run&&s===0&&tourT>0.6)run=true; if(s>=0.97){run=false; if(tourT>0){tourT=-1.4;} } if(tourT<-0.01&&tourT>-0.1){s=0;v=0;t=0;} }
  if(run){const a=acc(); v+=a*dt; s+=v*dt; t+=dt; if(s>=0.98){s=0.98;v=0;run=false;}}
  draw();
  return run||touring;
};
function bind(id,fn){const el=document.getElementById(id); el.addEventListener("input",()=>{touring=false;fn(parseFloat(el.value));document.getElementById(id+"v").textContent=el.dataset.fmt.replace("{}",parseFloat(el.value).toFixed(el.dataset.dec)); s=0;v=0;t=0;run=false;draw();idleTour(5000,()=>{touring=true;tourT=0;});});}
bind("inM",x=>M=x); bind("inm",x=>m=x); bind("inF",x=>fric=x);
document.getElementById("bGo").addEventListener("click",()=>{touring=false; if(s>=0.97){s=0;v=0;t=0;} run=true; wake();});
document.getElementById("bReset").addEventListener("click",()=>{touring=false;run=false;s=0;v=0;t=0;draw();});
let drag=false;
stage.addEventListener("pointerdown",e=>{drag=true;stage.setPointerCapture(e.pointerId);touring=false;run=false;move(e);});
stage.addEventListener("pointermove",e=>{if(drag)move(e);});
stage.addEventListener("pointerup",()=>{drag=false;});
stage.addEventListener("pointercancel",()=>{drag=false;});
function move(e){const r=stage.getBoundingClientRect(); s=clamp((e.clientX-r.left)/r.width*1.25-0.12,0,0.98); v=0;t=0; draw();}
stage.addEventListener("keydown",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();touring=false;run=!run;wake();} if(e.key==="ArrowRight"){s=clamp(s+0.05,0,0.98);draw();} if(e.key==="ArrowLeft"){s=clamp(s-0.05,0,0.98);draw();}});
draw(); wake();
`;

emit({
  k, kitScript, id: "force-cart", fig: "圖 1 · 物理", title: "力學台車：F合＝ma",
  hint: "拖台車或按「放手」", readout: "a＝1.96 m/s²", detail: "合力除以總質量就是加速度。",
  keys: [{ mark: "lit", label: "金台車＋遮光旗" }, { mark: "raised", label: "藍砝碼片可增減" }],
  point: "a＝F合/(M+m)；摩擦力先扣掉，質量含吊砝碼（g＝9.8）。",
  svg, live,
  controls: `<label>台車質量 <input id="inM" type="range" min="0.4" max="1.2" step="0.2" value="0.6" data-dec="1" data-fmt="{} kg"><span class="val" id="inMv">0.6 kg</span></label>
<label>吊砝碼 <input id="inm" type="range" min="0.05" max="0.3" step="0.05" value="0.15" data-dec="2" data-fmt="{} kg"><span class="val" id="inmv">0.15 kg</span></label>
<label>摩擦力 <input id="inF" type="range" min="0" max="1.5" step="0.1" value="0" data-dec="1" data-fmt="{} N"><span class="val" id="inFv">0.0 N</span></label>
<button id="bGo" type="button">放手</button><button id="bReset" type="button">重置</button>`,
});
