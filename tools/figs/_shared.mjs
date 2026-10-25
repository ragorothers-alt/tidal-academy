/* 潮汐小島互動示意圖共用骨架：載入 anatomy kit、遊戲配色、響應式版面、底座零件。
   每張圖的 build.mjs 呼叫 loadKit() 後用 helpers(k,P) 畫圖，再用 shell() 包成自含 HTML。
   重建：node tools/figs/<id>/build.mjs（可加 --audit 做幾何檢查） */
import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url)); // tools/figs
export const ROOT = join(HERE, "..", "..");
export const OUTDIR = join(ROOT, "src", "isle", "figs");

function skillDir() {
  const cands = [
    process.env.ANATOMY_SKILL,
    join(homedir(), ".config", "muse", "skills", "anatomy"),
    join(homedir(), ".codex", "skills", "anatomy"),
    join(homedir(), ".claude", "skills", "anatomy"),
  ].filter(Boolean);
  for (const c of cands) if (existsSync(join(c, "kit", "iso-kit.mjs"))) return c;
  throw new Error("找不到 anatomy skill，請設 ANATOMY_SKILL 環境變數");
}

export async function loadKit() {
  const SK = skillDir();
  const k = await import(pathToFileURL(join(SK, "kit", "iso-kit.mjs")).href);
  const inline = await import(pathToFileURL(join(SK, "scripts", "inline-kit.mjs")).href);
  return { k, kitScript: inline.kitScript, SK };
}

/** 綁好 P 的速記：S 實心、L 線、D 點、at 投影、byDepth 排序 */
export function helpers(k, P) {
  const at = (pt) => k.iso(pt, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  return { at, S, L, D, byDepth };
}

/** 通用工作底座：光暈、四腳、厚板、凹槽、角螺絲、前緣刻度尺、銘牌 */
export function basePlate(k, P, H, PLATE, { plateH = 12, footH = 5, ruler = true, label = true } = {}) {
  const { at, S, L, D, byDepth } = H;
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -plateH - footH, plateH, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -plateH - footH, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -plateH - footH + 1.6, footH - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -plateH, plateH, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (ruler) {
    const strip = { x: PLATE.x + 14, y: PLATE.y + PLATE.d - 15, w: PLATE.w - 28, d: 7, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  }
  if (label) {
    const lp = { x: PLATE.x + PLATE.w - 62, y: PLATE.y + 8, w: 44, d: 16, r: 1.5 };
    out.push(S(k.slabOf(lp, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(lp, 1.6), 0.8, P, 4), { tone: "faint" }));
    out.push(L(k.lineOnTop([lp.x + 5, lp.y + 5], [lp.x + 32, lp.y + 5], 0.8, P), { tone: "lo", free: true }));
    out.push(L(k.lineOnTop([lp.x + 5, lp.y + 9], [lp.x + 24, lp.y + 9], 0.8, P), { tone: "lo", free: true }));
    out.push(L(k.lineOnTop([lp.x + 5, lp.y + 13], [lp.x + 27, lp.y + 13], 0.8, P), { tone: "lo", free: true }));
    out.push(D([at([lp.x + 3, lp.y + 3, 0.8]), at([lp.x + lp.w - 3, lp.y + lp.d - 3, 0.8])], { size: 0.45 }));
  }
  return out.join("");
}

/** 直立柱：底座環＋柱身＋兩道接縫圈＋頂蓋 */
export function post(k, P, H, x, y, z0, h, r = 3.2) {
  const { S, L } = H;
  const out = [];
  out.push(S(k.cylinder(x, y, r + 1.8, z0, 3, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, r, z0 + 3, h - 3, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([z0 + h * 0.4, z0 + h * 0.7].map((z) => k.sideArc(x, y, r, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, r + 0.6, z0 + h, 1.8, P, 28), { tone: "mid" }));
  return out.join("");
}

/** 滾花旋鈕（附指針線），傳回群組字串 */
export function knob(k, P, H, x, y, z, r = 6, tone = "mid") {
  const { at, S, L, D } = H;
  const out = [];
  out.push(S(k.cylinder(x, y, r, z, 4, P, 32), { tone }));
  out.push(L(k.knurl(x, y, r, z, z + 4, 36, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([x, y], [x + r - 0.6, y], z + 4, P), { tone: "hi", free: "start" }));
  out.push(D([at([x, y, z + 4])], { size: 0.5, tone: "hi" }));
  return out.join("");
}

/* ---- 頁面外殼：遊戲配色 + 滿版不捲動版面 ---- */
export const EXTRA_CSS = `
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:#f6ead0;color:#6b4f3a;font-family:'Noto Sans TC','PingFang TC','Microsoft JhengHei',system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.iso-page{height:100dvh;margin:0;padding:10px;display:flex;flex-direction:column}
.iso-figure{margin:0;flex:1;min-height:0;display:flex;flex-direction:column}
.iso-plate{flex:1;min-height:0;display:flex;flex-direction:column;padding:44px 16px 12px;border-radius:14px;background:#fff8e7;box-shadow:0 0 0 2px #9a7d62}
.iso-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;touch-action:pan-y;outline-offset:4px}
.iso-svg{width:100%;height:100%;max-height:100%}
.iso-plate-corner{font-family:'Noto Sans TC','PingFang TC','Microsoft JhengHei',system-ui,sans-serif;font-size:12px}
.iso-plate-corner[data-corner="title"]{text-transform:none;letter-spacing:.02em;font-weight:700;color:#6b4f3a;font-size:14px}
.iso-plate-corner[data-corner="readout"]{font-weight:700;color:#3e5a8c;display:none}
.iso-plate-corner[data-corner="hint"]{display:none}
.fig-hint{flex:none;margin-top:4px;font-size:12.5px;color:#9a7d62}
.iso[data-theme="light"]{--anatomy-page:#f6ead0;--anatomy-card:#fff8e7;--anatomy-text:#6b4f3a;--anatomy-strong:#4a3423;--anatomy-muted:#9a7d62;--anatomy-paper:#fff8e7;--anatomy-face:#fffdf4;--anatomy-top:#fffdf4;--anatomy-shade-0:#e6d5b5;--anatomy-shade-1:#eddfc4;--anatomy-shade-2:#f3e9d2;--anatomy-shade-3:#f9f1de;--anatomy-lit-top:#eaf3ff;--anatomy-lit-shade:#cfdef2;--anatomy-hi:#6b4f3a;--anatomy-mid:#9a7d62;--anatomy-lo:#c4ab8d;--anatomy-faint:#e0d0b2;--anatomy-lit:#3e5a8c;--anatomy-halo:#b89b74;--anatomy-dot:#6b4f3a;--anatomy-red:#d98a2b;--anatomy-green:#1f9d7a;--anatomy-blue:#3e7fbf}
.iso-solid.t-gold>.iso-top{fill:#ffc94a}.iso-solid.t-gold>.iso-shade{fill:#f2b83c}
.iso-solid.t-mint>.iso-top{fill:#5fd4b8}.iso-solid.t-mint>.iso-shade{fill:#3fbfa2}
.iso-solid.t-sky>.iso-top{fill:#7cc7ff}.iso-solid.t-sky>.iso-shade{fill:#5aa8e8}
.iso-solid.t-navy>.iso-top{fill:#3e5a8c}.iso-solid.t-navy>.iso-shade{fill:#334f7c}
.iso-solid.t-rose>.iso-top{fill:#ffb59d}.iso-solid.t-rose>.iso-shade{fill:#f09a7d}
.fig-read{flex:none;margin-top:6px;padding:8px 12px;border-radius:10px;background:#fffdf4;box-shadow:inset 0 0 0 1.5px #e0d0b2;font-size:14px;line-height:1.45;color:#4a3423;min-height:38px}
.fig-read b{color:#3e5a8c}
.fig-ctl{flex:none;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
.fig-ctl button{min-height:44px;min-width:44px;padding:8px 14px;border-radius:999px;border:2px solid #9a7d62;background:#fffdf4;color:#6b4f3a;font:600 14px 'Noto Sans TC','PingFang TC','Microsoft JhengHei',system-ui,sans-serif;cursor:pointer}
.fig-ctl button[aria-pressed="true"]{background:#ffc94a;border-color:#b7791f;color:#4a3423}
.fig-ctl label{display:flex;align-items:center;gap:8px;min-height:44px;padding:4px 10px;border-radius:10px;background:#fffdf4;box-shadow:inset 0 0 0 1.5px #e0d0b2;font-size:13px;font-weight:600}
.fig-ctl input[type="range"]{width:120px;height:32px;accent-color:#3e5a8c}
.fig-ctl .val{min-width:64px;color:#3e5a8c;font-variant-numeric:tabular-nums}
.iso-legend{flex:none;padding:8px 4px 0}
.iso-caption{font-size:13px;color:#6b4f3a}
.iso-keys{font-size:12px;color:#9a7d62}
@media (max-width:560px){
  .iso-page{padding:6px}
  .iso-plate{padding:40px 8px 8px}
  .iso-plate-corner{font-size:11px}
  .iso-plate-corner[data-corner="title"]{font-size:12px;max-width:62vw;white-space:normal;text-align:right}
  .iso-plate-corner[data-corner="hint"]{display:none}
  .iso-plate-corner[data-corner="readout"]{display:none}
  .fig-read{font-size:13px}
  .fig-ctl input[type="range"]{width:96px}
  .iso-keys{display:none}
}
@media (prefers-reduced-motion: reduce){.iso-line[data-flow]{animation:none}}
`;

/** 共用 live 前言：$、clamp、setRead、rAF 迴圈管理（圖自訂 window.__tick 後呼叫 wake()） */
export const LIVE_HEAD = `
const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const still=matchMedia("(prefers-reduced-motion: reduce)");
function setRead(short,detail){const c=document.querySelector("[data-readout]");if(c&&c.textContent!==short)c.textContent=short;const d=document.querySelector("[data-read]");const t=(detail==null?short:detail);if(d&&d.textContent!==t)d.textContent=t;const st=document.querySelector(".iso-stage");if(st)st.setAttribute("aria-valuetext",short);}
let __raf=0,__last=0,__vis=true;
function __loop(now){const dt=__last?Math.min((now-__last)/1000,1/30):1/60;__last=now;let more=false;try{more=!!window.__tick(dt);}catch(e){more=false;}__raf=(more&&__vis&&!document.hidden)?requestAnimationFrame(__loop):0;if(!__raf)__last=0;}
function wake(){if(!__raf&&__vis&&!document.hidden){__last=0;__raf=requestAnimationFrame(__loop);}}
function stopLoop(){if(__raf)cancelAnimationFrame(__raf);__raf=0;__last=0;}
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopLoop();else wake();});
new IntersectionObserver((es)=>{__vis=es[es.length-1].isIntersecting;if(__vis)wake();else stopLoop();},{rootMargin:"120px 0px"}).observe(document.querySelector(".iso-stage"));
let __idleT=0;
function idleTour(ms,fn){clearTimeout(__idleT);__idleT=setTimeout(()=>{if(!still.matches){fn();wake();}},ms);}
`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 包成自含 HTML 並寫入 src/isle/figs/<id>.html；--audit 時做 NaN/路徑檢查 */
export function emit({ k, kitScript, id, title, fig, hint, readout, detail, keys, point, svg, controls, live, ariaLabel }) {
  const body = k.plateHtml({
    fig, title, hint, readout,
    keys: keys || [],
    caption: "重點：" + point,
    body: `<div class="iso-stage" tabindex="0" role="application" aria-label="${esc(ariaLabel || title)}">${svg}</div>`
      + `<div class="fig-hint">操作：${esc(hint)}</div>`
      + `<div class="fig-read"><span data-read>${esc(detail || readout)}</span></div>`
      + `<div class="fig-ctl">${controls || ""}</div>`,
  });
  const script = (kitScript() + "\n" + LIVE_HEAD + "\n" + live).replace(/<\/(script)/gi, "<\\/$1");
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${k.ISO_CSS}\n${EXTRA_CSS}</style></head><body class="iso" data-theme="light"><main class="iso-page">${body}</main><script type="module">${script}</script></body></html>`;
  if (process.argv.includes("--audit")) {
    const bad = [];
    const ds = [...html.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]).join(" ");
    if (/NaN|undefined/.test(ds)) bad.push("路徑含 NaN/undefined");
    const solids = (html.match(/iso-solid/g) || []).length;
    const paths = (html.match(/<path/g) || []).length;
    if (solids < 25) bad.push(`實心零件太少 (${solids})`);
    if (Buffer.byteLength(html, "utf8") > 300 * 1024) bad.push(`檔案過大 (${Buffer.byteLength(html, "utf8")})`);
    if (/(?:href|src)\s*=\s*"https?:/.test(html)) bad.push("含外部連結");
    if (/localStorage|\balert\(/.test(live)) bad.push("含禁用 API");
    console.log(`[audit] ${id}: solids=${solids} paths=${paths} bytes=${Buffer.byteLength(html, "utf8")}`);
    if (bad.length) { console.error("[audit] FAILED:", bad.join("；")); process.exit(1); }
    console.log("[audit] audit passed");
  }
  mkdirSync(OUTDIR, { recursive: true });
  const out = join(OUTDIR, id + ".html");
  writeFileSync(out, html, "utf8");
  console.log(`wrote ${out} (${statSync(out).size} bytes)`);
  return out;
}
