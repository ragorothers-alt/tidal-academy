/* 行星風帶儀（ge-climate）：地球儀上的彩色環是七個氣壓帶中心（赤道低壓、副熱帶高壓 ±30°、
   副極地低壓 ±60°、極地高壓在兩極）。氣壓帶隨太陽直射點季節南北移，本圖取約 ±8° 緯度作示意
   （移位量＝8°·sin(2π(月份−3.2)/12)，7 月最偏北、1 月最偏南）；選定緯度落在何帶由「緯度−移位」判定。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 470;
const PLATE = { x: -160, y: -105, w: 320, d: 210, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 118]], W, H, { pad: 24, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const DZ = 10, ER = 34, ECZ = 58, GX = -34;

function globe() {
  const o = [`<path class="iso-halo" d="${k.haloOf({ x: GX - 42, y: -42, w: 84, d: 84, r: 34 }, DZ, 0.1, P)}" style="filter:blur(5px)"/>`];
  o.push(S(k.cylinder(GX, 0, 52, 0, DZ, P, 56, 0.8), { tone: "mid", crease: "lo" }));
  o.push(L(k.ring(GX, 0, 48, DZ, P, 96), { tone: "lo" }));
  o.push(L(k.ring(GX, 0, 45.6, DZ, P, 96), { tone: "faint" }));
  const t = k.radialTicks(GX, 0, 48, 24, 6, DZ, [1.2, 2.4], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  o.push(S(k.cylinder(GX, 0, 12, DZ, ECZ - ER - DZ + 4, P, 28), { tone: "mid", crease: "none" }));
  o.push(S(k.cylinder(GX, 0, 17, DZ, 3, P, 36), { tone: "mid" }));
  const prof = [[16, -29], [24, -22], [30, -13], [33.5, -4], [34, 0], [33.5, 6], [30, 15], [24, 23], [16, 29]];
  let prev = ECZ - 32;
  prof.forEach(([r, dz], i) => { o.push(S(k.cylinder(GX, 0, r, prev, (ECZ + dz) - prev, P, 48), { tone: "hi", className: i % 2 ? "t-mint" : "t-sky", crease: "none" })); prev = ECZ + dz; });
  o.push(S(k.cylinder(GX, 0, 7, ECZ + 29, 3, P, 24), { tone: "hi", className: "t-sky" }));
  o.push(S(k.cylinder(GX, 0, 1.7, ECZ + 32, 14, P, 12), { tone: "mid", crease: "none" }));
  o.push(D([at([GX, 0, ECZ + 46])], { size: 0.9, tone: "hi" }));
  for (const la of [-60, -30, 0, 30, 60]) {
    const rr = ER * Math.cos(la * Math.PI / 180), zz = ECZ + ER * Math.sin(la * Math.PI / 180);
    o.push(L(k.sideArc(GX, 0, rr, zz, P, 64), { tone: la === 0 ? "lo" : "faint" }));
  }
  o.push(k.faceTextSvg(k.topMatrix([GX, 52], DZ + 0.5, P, "x"), "赤道面", { size: 3, tone: "mid", anchor: "middle" }));
  return o.join("");
}
function sunLamp() {
  const o = [];
  const sx = 96, sy = -64;
  o.push(post(k, P, HH, sx, sy, 0, 92, 2.4));
  o.push(`<g data-part="sun">`
    + S(k.cylinder(sx, sy, 4.4, 68, 9, P, 24), { tone: "mid" })
    + S(k.slabOf({ x: sx - 32, y: sy - 3, w: 36, d: 6, r: 1.5 }, 74, 3.5, P, 2, 0.4), { tone: "mid" })
    + S(k.cylinder(sx - 18, sy, 11, 60, 4, P, 36), { tone: "hi", className: "t-gold" })
    + S(k.cylinder(sx - 18, sy, 8.5, 64, 7, P, 36), { tone: "hi", className: "t-gold", crease: "lo" })
    + S(k.cylinder(sx - 18, sy, 5, 71, 3, P, 24), { tone: "hi", className: "t-gold" }) + `</g>`);
  o.push(k.faceTextSvg(k.topMatrix([sx - 18, sy + 16], DZ + 0.5, P, "x"), "太陽（直射點）", { size: 3, tone: "hi", anchor: "middle" }));
  o.push(knob(k, P, HH, sx, sy + 30, 0, 5));
  return o.join("");
}
function latRuler() {
  const o = [];
  const rx = 92, ry = 46;
  o.push(S(k.slabOf({ x: rx - 14, y: ry - 16, w: 52, d: 34, r: 3 }, 0, 6, P, 4, 0.6), { tone: "mid" }));
  o.push(post(k, P, HH, rx + 8, ry, 6, 76, 1.3));
  const t = k.sideTicks(rx - 8, rx + 30, 6.3, 3, ry + 17, 6, [1.5, 2.8], P, "x");
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  o.push(k.faceTextSvg(k.topMatrix([rx + 11, ry], 86, P, "x"), "緯度尺", { size: 3.2, tone: "hi", anchor: "middle" }));
  o.push(k.faceTextSvg(k.topMatrix([rx + 11, ry + 12], 6.4, P, "x"), "北 ↑ 南 ↓", { size: 3, tone: "hi", anchor: "middle" }));
  return o.join("");
}
const beltDefs = [[85, "#3e7fbf"], [60, "#1f9d7a"], [30, "#d98a2b"], [0, "#c65b8f"], [-30, "#d98a2b"], [-60, "#1f9d7a"], [-85, "#3e7fbf"]];
let beltPaths = "";
beltDefs.forEach(([la, col], i) => { beltPaths += `<path data-belt="${i}" d="" fill="none" stroke="${col}" stroke-width="${la === 0 ? 3.4 : 2.6}" stroke-linecap="round"/>`; });
const svg = k.figureSvg({
  width: W, height: H,
  label: "行星風帶地球儀：彩色環標出赤道低壓、副熱帶高壓、副極地低壓與極地高壓，隨月份南北移動；金環是你選的緯度，右側太陽燈高度代表直射點。",
  body: [basePlate(k, P, HH, PLATE), globe(), beltPaths,
    `<path data-part="sel" d="" fill="none" stroke="#3e5a8c" stroke-width="2" stroke-dasharray="5 3"/>`,
    sunLamp(), latRuler(),
    `<g data-part="lmark">${S(k.cylinder(100, 46, 4.6, 6, 4, P, 24), { tone: "hi", className: "t-navy" })}</g>`],
});
const live = `
const P=${JSON.stringify(P)}, ER=${ER}, ECZ=${ECZ}, GX=${GX};
const stage=document.querySelector(".iso-stage");
const BELTS=${JSON.stringify(beltDefs.map(b => b[0]))};
let month=7, lat=38;
function ringAt(laDeg){ const a=clamp(laDeg,-88,88)*Math.PI/180; return sideArc(GX,0,Math.max(2.5,ER*Math.cos(a)),ECZ+ER*Math.sin(a),P,72); }
function classify(eff, la){
  const a=Math.abs(eff), hemi=la>=0?"北半球":"南半球";
  if(a<10) return ["赤道低壓（熱帶輻合帶）","空氣上升、對流旺盛而多雨", hemi==="北半球"?"東北信風在此輻合":"東南信風在此輻合"];
  if(a<20) return ["信風帶（往赤道低壓移動的空氣）","雨量看輻合帶是否到來：輻合帶移到就多雨，移開就乾", la>=0?"東北信風（由東北吹來）":"東南信風（由東南吹來）"];
  if(a<36) return ["副熱帶高壓","空氣下沉增溫、不易成雲，通常乾燥（大沙漠多在此帶）", la>=0?"北側接西風、南側接東北信風":"北側接東南信風、南側接西風"];
  if(a<55) return ["盛行西風帶（往副極地低壓移動）","常有鋒面與溫帶氣旋通過，降水較多", "盛行西風（整體由西向東）"];
  if(a<72) return ["副極地低壓","西風與極地東風交會抬升，多雲雨", "西風與極地東風交會"];
  return ["極地高壓","冷空氣下沉，乾冷少雨", "極地東風（由東吹向西）"];
}
function draw(){
  const shift=8*Math.sin(2*Math.PI*(month-3.2)/12);
  $$("[data-belt]").forEach(el=>{ el.setAttribute("d", ringAt(BELTS[Number(el.dataset.belt)]+shift)); });
  document.querySelector('[data-part="sel"]').setAttribute("d", ringAt(lat));
  document.querySelector('[data-part="lmark"]').setAttribute("transform", translateAlong(P,[0,0, clamp((lat+60)/120,0,1)*68]));
  const decl=23.5*Math.sin(2*Math.PI*(month-3.2)/12);
  document.querySelector('[data-part="sun"]').setAttribute("transform", translateAlong(P,[0,0,decl*0.55]));
  const eff=lat-shift;
  const [band, wx, wind]=classify(eff, lat);
  const ex=(Math.abs(lat)>=33&&Math.abs(lat)<=43)?"這個緯度夏天常被副熱帶高壓罩住、冬天改受西風影響，就是地中海型「夏乾冬雨」的原因。"
    :(Math.abs(lat)>=8&&Math.abs(lat)<=20)?"這個緯度輻合帶來時是雨季、移開後由高壓與乾燥信風接管，就是莽原的乾濕季。"
    :(Math.abs(lat)>=20&&Math.abs(lat)<=32)?"這個緯度長年接近副熱帶高壓下沉區，是大沙漠常見的緯度。"
    :(Math.abs(lat)<8)?"這個緯度終年接近赤道低壓，是熱帶雨林常見的緯度。":"";
  setRead(month+" 月 · 緯度 "+lat+"° 在"+band.split("（")[0],
   month+" 月：直射點約在 "+(decl>=0?"北":"南")+"緯 "+Math.abs(decl).toFixed(0)+"°，氣壓帶整體"+(shift>=0?"北":"南")+"移約 "+Math.abs(shift).toFixed(0)+"°（示意）。你選的 "+(lat>=0?"北":"南")+"緯 "+Math.abs(lat)+"° 相對氣壓帶的位置相當於緯度 "+eff.toFixed(0)+"°，屬於「"+band+"」："+wx+"；盛行風："+wind+"。"+ex);
  document.getElementById("inMv").textContent=month+" 月";
  document.getElementById("inLv").textContent=(lat>=0?"北緯 ":"南緯 ")+Math.abs(lat)+"°";
}
document.getElementById("inM").addEventListener("input",ev=>{month=parseInt(ev.target.value); draw();});
document.getElementById("inL").addEventListener("input",ev=>{lat=parseInt(ev.target.value); draw();});
document.querySelectorAll("[data-mo]").forEach(b=>b.addEventListener("click",()=>{month=parseInt(b.dataset.mo); document.getElementById("inM").value=month; draw();}));
document.querySelectorAll("[data-lat]").forEach(b=>b.addEventListener("click",()=>{lat=parseInt(b.dataset.lat); document.getElementById("inL").value=lat; draw();}));
let drag=false;
stage.addEventListener("pointerdown",ev=>{drag=true; stage.setPointerCapture(ev.pointerId); mv(ev);});
stage.addEventListener("pointermove",ev=>{if(drag)mv(ev);});
stage.addEventListener("pointerup",()=>drag=false); stage.addEventListener("pointercancel",()=>drag=false);
function mv(ev){const r=stage.getBoundingClientRect(); lat=clamp(Math.round(60-((ev.clientY-r.top)/r.height)*130),-60,60); document.getElementById("inL").value=lat; draw();}
stage.addEventListener("keydown",ev=>{if(ev.key==="ArrowUp"){lat=clamp(lat+2,-60,60);draw();} if(ev.key==="ArrowDown"){lat=clamp(lat-2,-60,60);draw();} if(ev.key==="ArrowRight"){month=month%12+1;draw();} if(ev.key==="ArrowLeft"){month=(month+10)%12+1;draw();}});
draw();
`;
emit({
  k, kitScript, id: "wind-belts", fig: "圖 15 · 地理", title: "行星風帶儀：氣壓帶與風帶",
  hint: "拉月份看氣壓帶南北移，上下拖或拉緯度看落在何帶", readout: "7 月 · 北緯 38°", detail: "同一個緯度，夏天和冬天可能被不同的帶控制。",
  keys: [{ mark: "red", label: "桃紅環＝赤道低壓" }, { mark: "lit", label: "橘環＝副熱帶高壓" }, { mark: "green", label: "綠環＝副極地低壓" }, { mark: "blue", label: "藍環＝極地高壓、深藍虛線＝選定緯度" }],
  point: "氣壓帶隨直射點南北移（示意 ±8°）：低壓上升多雨、高壓下沉乾燥。",
  svg, live,
  controls: `<label>月份 <input id="inM" type="range" min="1" max="12" step="1" value="7"><span class="val" id="inMv">7 月</span></label>
<label>觀察緯度 <input id="inL" type="range" min="-60" max="60" step="1" value="38"><span class="val" id="inLv">北緯 38°</span></label>
<button type="button" data-mo="1">1 月</button><button type="button" data-mo="7">7 月</button>
<button type="button" data-lat="38">地中海 38°N</button><button type="button" data-lat="13">莽原 13°N</button><button type="button" data-lat="25">沙漠帶 25°N</button><button type="button" data-lat="51">倫敦 51°N</button>`,
});
