/* 孟德爾選豆壓機（bi-gene）：豌豆種子黃色 A 對綠色 a 完全顯性。
   左側是雙親配子樁（每位親代只送出一個等位基因），中間 2×2 壓格把雙親配子相配，
   格中豆色是表現型、字是基因型；右側三欄由四格直接計數 AA：Aa：aa 與黃：綠。
   「模擬 100 顆」以亂數各抽一個親代配子，顯示有限子代不保證剛好等於理論比例。 */
import { loadKit, helpers, basePlate, post, knob, emit } from "../_shared.mjs";
const { k, kitScript } = await loadKit();
const W = 720, H = 460;
const PLATE = { x: -160, y: -105, w: 320, d: 210, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [0, 0, 92]], W, H, { pad: 24, azimuth: 42 });
const HH = helpers(k, P); const { at, S, L, D } = HH;
const BZ = 8;
const CELLS = [[-52, -26], [2, -26], [-52, 22], [2, 22]]; // 四格中心（列＝親代二配子，欄…見 live）
const CW = 46;

function press() {
  const o = [];
  o.push(S(k.slabOf({ x: -84, y: -58, w: 146, d: 122, r: 4 }, 0, BZ, P, 4, 0.6), { tone: "mid" }));
  // 壓機門框
  o.push(post(k, P, HH, -76, -52, BZ, 58, 2.4));
  o.push(post(k, P, HH, 54, -52, BZ, 58, 2.4));
  o.push(S(k.slabOf({ x: -82, y: -58, w: 142, d: 12, r: 2 }, BZ + 58, 6, P, 3, 0.5), { tone: "mid" }));
  o.push(knob(k, P, HH, -11, -52, BZ + 64, 5));
  o.push(k.faceTextSvg(k.topMatrix([-11, -52], BZ + 64.4, P, "x"), "選豆壓機", { size: 3.2, tone: "hi", anchor: "middle" }));
  // 四格托盤
  CELLS.forEach(([cx, cy]) => {
    o.push(S(k.slabOf({ x: cx - CW / 2, y: cy - 21, w: CW, d: 42, r: 3 }, BZ, 3, P, 3, 0.4), { tone: "hi", crease: "lo" }));
    o.push(L(k.planOutline(k.insetPlan({ x: cx - CW / 2, y: cy - 21, w: CW, d: 42, r: 3 }, 3), BZ + 3, P, 3), { tone: "faint" }));
  });
  return o.join("");
}
function peaAt(cx, cy, cls) {
  const o = [];
  o.push(S(k.cylinder(cx, cy, 11, BZ + 3, 3, P, 28), { tone: "hi", className: cls }));
  o.push(S(k.cylinder(cx, cy, 9, BZ + 6, 4.5, P, 28), { tone: "hi", className: cls, crease: "lo" }));
  o.push(S(k.cylinder(cx, cy, 5.5, BZ + 10.5, 3, P, 22), { tone: "hi", className: cls }));
  o.push(D([at([cx + 3, cy + 2, BZ + 8])], { size: 0.5, tone: "lo" }));
  return o.join("");
}
function parents() {
  const o = [];
  // 左側兩座親代倉（顯示目前基因型的兩個字由 live 改）
  [[-128, -34, "親代一", "p1"], [-128, 26, "親代二", "p2"]].forEach(([x, y, lab, id]) => {
    o.push(S(k.slabOf({ x: x - 20, y: y - 18, w: 40, d: 36, r: 3 }, 0, 10, P, 3, 0.5), { tone: "mid" }));
    o.push(S(k.cylinder(x, y, 10, 10, 4, P, 28), { tone: "hi", className: id === "p1" ? "t-sky" : "t-mint", crease: "lo" }));
    o.push(`<text class="iso-face-text" data-tone="hi" transform="${k.topMatrix([x, y], 14.3, P, "x")}" font-size="5" text-anchor="middle" data-par="${id}">Aa</text>`);
    o.push(k.faceTextSvg(k.topMatrix([x, y + 24], 0.5, P, "x"), lab, { size: 3.2, tone: "hi", anchor: "middle" }));
    o.push(S(k.slabOf({ x: x + 20, y: y - 2, w: 16, d: 4, r: 1 }, BZ, 2, P, 2), { tone: "hi" })); // 送豆軌
  });
  // 格邊配子字（上＝親代二的兩種配子，左…以字樁表示親代一的兩種配子）
  [[-52, -52, "gT0"], [2, -52, "gT1"]].forEach(([x, y, id]) => {
    o.push(S(k.cylinder(x, y, 6, BZ, 3.5, P, 22), { tone: "hi", className: "t-mint" }));
    o.push(`<text class="iso-face-text" data-tone="hi" transform="${k.topMatrix([x, y], BZ + 3.8, P, "x")}" font-size="4.4" text-anchor="middle" data-gam="${id}">A</text>`);
  });
  [[-80, -26, "gL0"], [-80, 22, "gL1"]].forEach(([x, y, id]) => {
    o.push(S(k.cylinder(x, y, 6, BZ, 3.5, P, 22), { tone: "hi", className: "t-sky" }));
    o.push(`<text class="iso-face-text" data-tone="hi" transform="${k.topMatrix([x, y], BZ + 3.8, P, "x")}" font-size="4.4" text-anchor="middle" data-gam="${id}">A</text>`);
  });
  return o.join("");
}
function bars() {
  const o = [];
  const bx = 104;
  o.push(S(k.slabOf({ x: bx - 26, y: -34, w: 66, d: 68, r: 3 }, 0, 6, P, 4, 0.6), { tone: "mid" }));
  [["AA", bx - 8, "t-gold"], ["Aa", bx + 10, "t-gold"], ["aa", bx + 28, "t-mint"]].forEach(([lab, cx, cls]) => {
    o.push(S(k.cylinder(cx, 0, 7.6, 6, 2.6, P, 24), { tone: "mid" }));
    for (let i = 0; i < 4; i++) o.push(`<g data-bar="${lab}-${i}">${S(k.cylinder(cx, 0, 6.2, 8.6 + i * 13, 12, P, 24), { tone: "hi", className: cls, crease: "none" })}</g>`);
    o.push(S(k.cylinder(cx, 0, 7, 8.6 + 4 * 13, 2.4, P, 24), { tone: "mid" }));
    o.push(k.faceTextSvg(k.topMatrix([cx, 16], 6.4, P, "x"), lab, { size: 3.6, tone: "hi", anchor: "middle" }));
  });
  o.push(k.faceTextSvg(k.topMatrix([bx + 10, -26], 6.4, P, "x"), "四格計數（每段 1/4）", { size: 3, tone: "hi", anchor: "middle" }));
  o.push(knob(k, P, HH, bx + 10, 28, 6, 4));
  return o.join("");
}
let cellsSvg = "";
CELLS.forEach(([cx, cy], i) => {
  cellsSvg += `<g data-peaY="${i}">${peaAt(cx - 8, cy, "t-gold")}</g><g data-peaG="${i}">${peaAt(cx - 8, cy, "t-mint")}</g>`;
  cellsSvg += `<text class="iso-face-text" data-tone="hi" transform="${k.topMatrix([cx + 13, cy], BZ + 3.3, P, "x")}" font-size="5.4" text-anchor="middle" data-cell="${i}">Aa</text>`;
});
const svg = k.figureSvg({
  width: W, height: H,
  label: "孟德爾選豆壓機：左邊兩位親代各自只送出一個等位基因，中間四格是子代的基因型與豆色，右邊三欄數出 AA、Aa、aa 的比例。",
  body: [basePlate(k, P, HH, PLATE), press(), parents(), cellsSvg, bars()],
});
const live = `
const stage=document.querySelector(".iso-stage");
let P1="Aa", P2="Aa", sim=null;
const alleles=g=>g==="AA"?["A","A"]:g==="aa"?["a","a"]:["A","a"];
const norm=(x,y)=>[x,y].sort((a,b)=>(a==="A"?0:1)-(b==="A"?0:1)).join("");
const pheno=g=>g.includes("A")?"黃色（顯性）":"綠色（隱性）";
function draw(){
  const a1=alleles(P1), a2=alleles(P2);
  document.querySelector('[data-par="p1"]').textContent=P1;
  document.querySelector('[data-par="p2"]').textContent=P2;
  document.querySelector('[data-gam="gL0"]').textContent=a1[0];
  document.querySelector('[data-gam="gL1"]').textContent=a1[1];
  document.querySelector('[data-gam="gT0"]').textContent=a2[0];
  document.querySelector('[data-gam="gT1"]').textContent=a2[1];
  const cells=[]; for(let r=0;r<2;r++) for(let c=0;c<2;c++) cells.push(norm(a1[r],a2[c]));
  const cnt={AA:0,Aa:0,aa:0}; cells.forEach(g=>cnt[g]++);
  cells.forEach((g,i)=>{
    document.querySelector('[data-cell="'+i+'"]').textContent=g;
    document.querySelector('[data-peaY="'+i+'"]').style.opacity=g.includes("A")?"1":"0";
    document.querySelector('[data-peaG="'+i+'"]').style.opacity=g.includes("A")?"0":"1";
  });
  $$("[data-bar]").forEach(el=>{const [lab,i]=el.dataset.bar.split("-"); el.style.opacity=Number(i)<cnt[lab]?"1":"0.13";});
  const yel=cnt.AA+cnt.Aa, grn=cnt.aa;
  const gamTxt=g=>{const a=alleles(g); return a[0]===a[1]?("只送出 "+a[0]):("送出 A、a 各占 1/2");};
  let simTxt="";
  if(sim){ const sy=sim.AA+sim.Aa; simTxt=" 模擬 100 顆結果：AA "+sim.AA+"、Aa "+sim.Aa+"、aa "+sim.aa+"（黃 "+sy+"：綠 "+sim.aa+"），和理論 "+cnt.AA*25+"："+cnt.Aa*25+"："+cnt.aa*25+" 不必完全一樣，這是有限子代的隨機波動。"; }
  setRead(P1+" × "+P2+" · 黃 "+yel+"：綠 "+grn+"（每格 1/4）",
   "親代一 "+P1+"（"+gamTxt(P1)+"）× 親代二 "+P2+"（"+gamTxt(P2)+"）。四格等機率：基因型 AA：Aa：aa＝"+cnt.AA+"："+cnt.Aa+"："+cnt.aa+"；表現型黃色 "+yel+"/4：綠色 "+grn+"/4（黃色 A 完全顯性，AA 與 Aa 都是黃色）。每顆子代的機率都重新計算，不受前一顆影響。"+simTxt);
  document.querySelectorAll("[data-p1]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.p1===P1)));
  document.querySelectorAll("[data-p2]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.p2===P2)));
}
document.querySelectorAll("[data-p1]").forEach(b=>b.addEventListener("click",()=>{P1=b.dataset.p1; sim=null; draw();}));
document.querySelectorAll("[data-p2]").forEach(b=>b.addEventListener("click",()=>{P2=b.dataset.p2; sim=null; draw();}));
document.getElementById("bSim").addEventListener("click",()=>{
  const a1=alleles(P1), a2=alleles(P2), c={AA:0,Aa:0,aa:0};
  for(let i=0;i<100;i++) c[norm(a1[Math.random()<0.5?0:1], a2[Math.random()<0.5?0:1])]++;
  sim=c; draw();
});
stage.addEventListener("keydown",ev=>{const order=["AA","Aa","aa"]; if(ev.key==="ArrowRight"){P1=order[(order.indexOf(P1)+1)%3]; sim=null; draw();} if(ev.key==="ArrowLeft"){P2=order[(order.indexOf(P2)+1)%3]; sim=null; draw();}});
draw();
`;
emit({
  k, kitScript, id: "mendel-press", fig: "圖 16 · 生物", title: "孟德爾選豆壓機：棋盤方格與比例",
  hint: "按鈕換雙親基因型，看四格豆色與右側比例欄", readout: "Aa × Aa · 黃 3：綠 1", detail: "黃色為顯性：AA、Aa 都是黃豆，只有 aa 是綠豆。",
  keys: [{ mark: "lit", label: "黃豆＝顯性表現型" }, { mark: "green", label: "綠豆＝隱性表現型 aa" }, { mark: "raised", label: "藍樁＝親代一配子、綠樁＝親代二配子" }],
  point: "配子只帶一等位基因；Aa×Aa 為 1:2:1、表現型 3:1。",
  svg, live,
  controls: `<span>親代一</span><button type="button" data-p1="AA" aria-pressed="false">AA</button><button type="button" data-p1="Aa" aria-pressed="true">Aa</button><button type="button" data-p1="aa" aria-pressed="false">aa</button>
<span>親代二</span><button type="button" data-p2="AA" aria-pressed="false">AA</button><button type="button" data-p2="Aa" aria-pressed="true">Aa</button><button type="button" data-p2="aa" aria-pressed="false">aa</button>
<button id="bSim" type="button">模擬 100 顆</button>`,
});
