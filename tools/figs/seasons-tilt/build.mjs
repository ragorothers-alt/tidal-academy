/* 四季儀（es-motion）：地軸傾斜 23.5° 且指向固定，地球繞中央太陽燈公轉。
   太陽直射緯度 δ＝23.5°·sin(2π(日序−80)/365) 近似；正午仰角＝90°−|φ−δ|；
   晝長由 cosH＝−tanφ·tanδ（H 為半晝長時角）計算，極晝極夜夾限處理。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 440;
const PLATE = { x: -150, y: -100, w: 300, d: 200, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 92], [-104, -84, 82], [104, -84, 40]], W, H, { pad: 26, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const ORB = 86, DZ = 12, ER = 17, ECZ = 40; // 軌道半徑、盤高、地球半徑、球心高

function table() {
  const o = [];
  o.push(S(k.cylinder(0, 0, 112, 0, DZ, P, 72, 1), { tone: "mid", crease: "lo" }));
  o.push(L(k.ring(0, 0, ORB, DZ + 0.3, P, 72), { tone: "mid" }));
  o.push(L(k.ring(0, 0, ORB - 9, DZ + 0.3, P, 72), { tone: "faint" }));
  o.push(L(k.ring(0, 0, 104, DZ, P, 144), { tone: "lo" }));
  o.push(L(k.ring(0, 0, 101.6, DZ, P, 144), { tone: "faint" }));
  const t = k.radialTicks(0, 0, 104, 48, 4, DZ, [1.2, 2.4], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; o.push(D([at([Math.cos(a) * ORB, Math.sin(a) * ORB, DZ + 0.4])], { size: 0.7, tone: "mid" })); }
  // 北極星指向標柱（地軸永遠指向它）
  o.push(post(k, P, HH, -104, -84, 0, 74, 2));
  o.push(S(k.cylinder(-104, -84, 4.5, 74, 4, P, 24), { tone: "hi", className: "t-gold" }));
  o.push(k.faceTextSvg(k.topMatrix([-104, -84], 78.4, P, "x"), "北極星", { size: 3, tone: "hi", anchor: "middle" }));
  return o.join("");
}
function sun() {
  const o = [];
  o.push(post(k, P, HH, 0, 0, DZ, 18, 3));
  o.push(S(k.cylinder(0, 0, 13, ECZ - 8, 4, P, 44), { tone: "hi", className: "t-gold" }));
  o.push(S(k.cylinder(0, 0, 10, ECZ - 4, 8, P, 44), { tone: "hi", className: "t-gold", crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 6, ECZ + 4, 4, P, 32), { tone: "hi", className: "t-gold" }));
  o.push(L(k.knurl(0, 0, 13, ECZ - 8, ECZ - 4, 52, P), { tone: "lo" }));
  return o.join("");
}
function earth() { // 以球心在原點、z=ECZ 建，live 平移到軌道位置；地軸線另外重算
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: -ER, y: -ER, w: ER * 2, d: ER * 2, r: ER }, DZ, 0.1, P)}" style="filter:blur(4px)"/>`];
  o.push(S(k.cylinder(0, 0, 8, DZ, ECZ - ER - DZ + 4, P, 28), { tone: "mid", crease: "none" })); // 支柱
  const prof = [[9, -13], [14, -9], [16.5, -4], [17, 0], [16.5, 4], [14, 9], [9, 13]];
  let prev = ECZ - 15;
  for (const [r, dz] of prof) { o.push(S(k.cylinder(0, 0, r, prev, (ECZ + dz) - prev, P, 48), { tone: "hi", className: Math.abs(dz) < 5 ? "t-mint" : "t-sky", crease: "none" })); prev = ECZ + dz; }
  o.push(L(k.ring(0, 0, ER - 0.3, ECZ, P, 56), { tone: "lo" })); // 赤道（未傾，示意）
  o.push(S(k.cylinder(0, 0, 5, ECZ + 13, 2.5, P, 28), { tone: "hi", className: "t-sky" }));
  return o.join("");
}
const svg = k.figureSvg({
  width: W, height: H,
  label: "四季儀：中央太陽燈，外圈軌道上地球儀的地軸傾斜二十三點五度且永遠指向北極星標柱，公轉時直射點南北移動造成四季。",
  body: [basePlate(k, P, HH, PLATE), table(), sun(),
    `<path data-part="rays" class="iso-line" data-tone="red" data-free="" d=""/>`,
    `<g data-part="earth">${earth()}</g>`,
    `<path data-part="axis" class="iso-line" data-tone="lit" data-free="" d="" style="stroke-width:1.4"/>`,
    knob(k, P, HH, 124, 76, 0, 5.5)],
});
const live = `
const P=${JSON.stringify(P)}, ORB=${ORB}, ER=${ER}, ECZ=${ECZ};
const eEl=document.querySelector('[data-part="earth"]'), axEl=document.querySelector('[data-part="axis"]'), rayEl=document.querySelector('[data-part="rays"]');
const stage=document.querySelector(".iso-stage");
let month=5, lat=25, city="臺北", play=!still.matches;
const NAMES=["一月","二月","三月（春分）","四月","五月","六月（夏至）","七月","八月","九月（秋分）","十月","十一月","十二月（冬至）"];
const MDAYS=[15,45,74,105,135,166,196,227,258,288,319,349];
function decl(m){ const day=MDAYS[clamp(Math.round(m),0,11)]; return 23.5*Math.sin(2*Math.PI*(day-80)/365); }
function draw(){
  const th=(month-5)/12*2*Math.PI; // 六月在 +x 側示意
  const ex=Math.cos(th)*ORB, ey=Math.sin(th)*ORB;
  eEl.setAttribute("transform",translateAlong(P,[ex,ey,0]));
  // 地軸：固定指向北極星方向（世界 -x,-y 上方傾斜 23.5°）
  const t=23.5*Math.PI/180, ax=[-Math.sin(t)*0.8,-Math.sin(t)*0.6,Math.cos(t)];
  const L1=ER+10;
  axEl.setAttribute("d",segment([ex-ax[0]*L1,ey-ax[1]*L1,ECZ-ax[2]*L1],[ex+ax[0]*L1,ey+ax[1]*L1,ECZ+ax[2]*L1],P));
  let rays="";
  for(const s of [-0.5,0,0.5]){ rays+=segment([Math.cos(th)*14,-Math.sin(th)*0+Math.sin(th)*14+s*6,ECZ+s*10],[ex*0.82,ey*0.82+s*6,ECZ+s*10],P); }
  rayEl.setAttribute("d",rays);
  const d=decl(month), alt=90-Math.abs(lat-d);
  const cH=clamp(-Math.tan(lat*Math.PI/180)*Math.tan(d*Math.PI/180),-1,1);
  const dayH=2*Math.acos(cH)*180/Math.PI/15;
  const season=d>12?"北半球夏季":d<-12?"北半球冬季":"春秋之交";
  setRead("正午仰角 "+alt.toFixed(1)+"°","約 "+NAMES[Math.round(month)%12]+"：太陽直射 "+(d>=0?"北緯 ":"南緯 ")+Math.abs(d).toFixed(1)+"°（"+season+"）。"+city+"（"+(lat>=0?"北緯 ":"南緯 ")+Math.abs(lat).toFixed(1)+"°）正午仰角＝90°−|φ−δ|＝"+alt.toFixed(1)+"°，白晝約 "+dayH.toFixed(1)+" 小時。四季來自地軸傾斜，不是日地距離。");
}
window.__tick=(dt)=>{ if(play){month+=dt*0.55; if(month>=12)month-=12; const s=document.getElementById("inMon"); s.value=month; document.getElementById("inMonv").textContent=(Math.floor(month)+1)+" 月";} draw(); return play; };
document.getElementById("inMon").addEventListener("input",ev=>{play=false;document.getElementById("bPlay").textContent="播放公轉"; month=parseFloat(ev.target.value); document.getElementById("inMonv").textContent=(Math.floor(month)+1)+" 月"; draw();});
document.querySelectorAll("[data-city]").forEach(b=>b.addEventListener("click",()=>{lat=parseFloat(b.dataset.lat); city=b.dataset.city; document.querySelectorAll("[data-city]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); draw();}));
document.getElementById("bPlay").addEventListener("click",ev=>{play=!play;ev.target.setAttribute("aria-pressed",String(play));ev.target.textContent=play?"暫停":"播放公轉";wake();});
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true;stage.setPointerCapture(ev.pointerId);play=false;mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); month=clamp((ev.clientX-r.left)/r.width,0,0.999)*12; document.getElementById("inMon").value=month; document.getElementById("inMonv").textContent=(Math.floor(month)+1)+" 月"; draw();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowRight"){month=(month+0.4)%12;draw();} if(ev.key==="ArrowLeft"){month=(month-0.4+12)%12;draw();}});
draw(); wake();
`;
emit({
  k, kitScript, id: "seasons-tilt", fig: "圖 7 · 地科", title: "四季儀：地軸傾斜與直射點",
  hint: "左右拖動公轉，選城市看正午仰角", readout: "正午仰角 88.5°", detail: "地軸傾斜 23.5°，直射點在南北回歸線間移動。",
  keys: [{ mark: "lit", label: "深藍地軸（指向固定）" }, { mark: "raised", label: "金太陽燈" }],
  point: "四季成因是地軸傾斜 23.5°，不是日地距離（近日點在一月初）。",
  svg, live,
  controls: `<label>月份 <input id="inMon" type="range" min="0" max="11.9" step="0.1" value="5"><span class="val" id="inMonv">6 月</span></label>
<button type="button" data-city="臺北" data-lat="25" aria-pressed="true">臺北 25°N</button><button type="button" data-city="高雄" data-lat="22.6">高雄 22.6°N</button><button type="button" data-city="赤道" data-lat="0">赤道 0°</button><button type="button" data-city="雪梨" data-lat="-33.9">雪梨 33.9°S</button>
<button id="bPlay" type="button" aria-pressed="true">暫停</button>`,
});
