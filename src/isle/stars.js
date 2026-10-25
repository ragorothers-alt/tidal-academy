/* 潮汐小島 · 觀星：學院台地觀星台的天文望遠鏡打開全天星圖。依台灣（北緯 23.5°、東經 121°）與當下時間，
   把星表的赤經赤緯換算成地平座標畫出來；點星座答地科題登錄星座圖鑑，晴朗的夜晚會有流星，點到就許願得到星之碎片。 */
import * as ui from './ui.js';
import * as challenge from './challenge.js';   // 答對後可以接著連續挑戰（challenge.js 也會用到這裡，循環相依要用 import * as）
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import { pickQ, pickQU, record, dayKey } from './quiz.js';
import { lst, altAz, activeShower } from './astro.js';

const D2R = Math.PI / 180;
const data = () => { const s = S(); s.stars = s.stars || {}; const d = s.stars; d.book = d.book || {}; d.frag = d.frag || 0; return d; };
export const bookCount = () => Object.keys(data().book).length;
export const fragments = () => data().frag;

/* ---------- 天文計算（純函式在 astro.js） ---------- */
export const shower = date => activeShower(I.METEOR_SHOWERS || [], date);
export const isNight = h => h >= 19 || h < 5;

/* ---------- 星圖畫面 ---------- */
let box = null, cv = null, ctx = null, raf = 0, st = null;
function close() { if (!box || (st && st.busy)) return; cancelAnimationFrame(raf); box.remove(); box = null; document.body.classList.remove('stargazing'); st && st.onClose && st.onClose(); st = null; }
export const isOpen = () => !!box;
/**
 * 打開星圖。opt: { date, host: 岳的說話者, weather: 'clear'|'cloudy', paint, onClose }
 */
export function open(opt) {
  if (box) return;
  const date = opt.date || new Date(), L = lst(date), sh = shower(date);
  st = Object.assign({ date, L, sh, meteors: [], next: 2 + Math.random() * 4, t: 0, sel: null, busy: false }, opt);
  // 背景星（固定亂數，隨恆星時轉動）
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  st.bg = Array.from({ length: 420 }, () => ({ ra: r() * 24, dec: Math.asin(r() * 2 - 1) / D2R, m: 3.5 + r() * 2.5, tw: r() * 6.28 }));
  st.cons = (I.CONSTELLATIONS || []).map(c => {
    const pts = c.stars.map(s => { const [alt, az] = altAz(s.ra, s.dec, L); return { s, alt, az }; });
    const up = pts.filter(p => p.alt > 0);
    return { c, pts, vis: up.length >= Math.ceil(pts.length / 2) && Math.max(...pts.map(p => p.alt)) > 8 };
  });
  box = ui.el('div', 'sky-view');
  const visN = st.cons.filter(x => x.vis).length, got = st.cons.filter(x => x.vis && data().book[x.c.id]).length;
  box.innerHTML = `<header><b>全天星圖</b><span>${date.getMonth() + 1} 月 ${date.getDate()} 日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} · 台灣</span><span class="sky-n">現在看得到 ${visN} 個星座（已登錄 ${got}）· 星之碎片 ${data().frag}</span><button type="button" class="sky-x">✕</button></header>
    <canvas></canvas><footer>${sh ? `☄ ${ui.esc(sh.name)}活躍中，流星特別多！` : opt.weather === 'cloudy' ? '雲有點多，星星少了一些。' : '中心是天頂、外圈是地平線；上北下南、左東右西（抬頭看天空的方向）。'}點標著「？」的星座觀測，答對地科題就能登錄；看到流星就快點它許願！</footer>`;
  document.body.appendChild(box); document.body.classList.add('stargazing');
  cv = box.querySelector('canvas'); ctx = cv.getContext('2d');
  box.querySelector('.sky-x').onclick = close;
  cv.addEventListener('pointerdown', e => { const rc = cv.getBoundingClientRect(); click(e.clientX - rc.left, e.clientY - rc.top); });
  let last = performance.now();
  const loop = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; draw(dt); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  Audio.sfx('pop');
}
/** 鍵盤：Esc 關閉 */
export function key(e) { if (!box) return false; if (st.busy) return true; if (e.code === 'Escape' || e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); close(); } return true; }

let W = 0, H = 0, R = 0, CX = 0, CY = 0;
const proj = (alt, az) => { const rr = R * (90 - alt) / 90; return [CX - rr * Math.sin(az * D2R), CY - rr * Math.cos(az * D2R)]; };
function draw(dt) {
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h; R = Math.min(w, h) / 2 - 34; CX = w / 2; CY = h / 2;
  st.t += dt;
  const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, R); g.addColorStop(0, '#0b1636'); g.addColorStop(0.75, '#132657'); g.addColorStop(1, '#2a3f78');
  ctx.fillStyle = '#060b1c'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(160,190,255,.25)'; ctx.lineWidth = 1; [30, 60].forEach(a => { ctx.beginPath(); ctx.arc(CX, CY, R * (90 - a) / 90, 0, 7); ctx.stroke(); });
  ctx.fillStyle = 'rgba(220,230,255,.85)'; ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [['北', 0], ['東', 90], ['南', 180], ['西', 270]].forEach(([n, az]) => { const [x, y] = proj(-6.5, az); ctx.fillText(n, x, y); });
  const cloudy = st.weather === 'cloudy';
  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.clip();
  st.bg.forEach(b => { if (cloudy && b.m > 4.5) return; const [alt, az] = altAz(b.ra, b.dec, st.L); if (alt < 0) return; const [x, y] = proj(alt, az), a = (0.75 - (b.m - 3.5) * 0.18) * (0.75 + 0.25 * Math.sin(st.t * 2 + b.tw)), r0 = b.m < 4.5 ? 1.3 : 0.9; ctx.fillStyle = `rgba(230,236,255,${a})`; ctx.beginPath(); ctx.arc(x, y, r0, 0, 7); ctx.fill(); });
  // 星座
  st.cons.forEach(o => {
    if (!o.vis) return; const known = !!data().book[o.c.id], sel = st.sel === o;
    ctx.strokeStyle = sel ? 'rgba(255,214,120,.9)' : known ? 'rgba(140,200,255,.55)' : 'rgba(140,170,255,.0)'; ctx.lineWidth = sel ? 2 : 1.4;
    o.c.lines.forEach(([a, b]) => { const A = o.pts[a], B = o.pts[b]; if (A.alt < 0 && B.alt < 0) return; const [x1, y1] = proj(A.alt, A.az), [x2, y2] = proj(B.alt, B.az); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
    o.pts.forEach(p => { if (p.alt < 0) return; const [x, y] = proj(p.alt, p.az), m = p.s.mag, r0 = Math.max(1.2, 4.2 - m * 0.75), tw = 0.8 + 0.2 * Math.sin(st.t * 3 + p.s.ra * 7);
      ctx.fillStyle = `rgba(255,250,235,${Math.min(1, 0.55 + (3 - m) * 0.15) * tw})`; ctx.beginPath(); ctx.arc(x, y, r0, 0, 7); ctx.fill(); });
    const up = o.pts.filter(p => p.alt > 0), cx = up.reduce((a, p) => a + proj(p.alt, p.az)[0], 0) / up.length, cy = up.reduce((a, p) => a + proj(p.alt, p.az)[1], 0) / up.length;
    o.cx = cx; o.cy = cy;
    ctx.font = known ? '700 13px system-ui, sans-serif' : '800 15px system-ui, sans-serif'; ctx.fillStyle = known ? 'rgba(170,215,255,.9)' : 'rgba(255,214,120,.95)';
    ctx.fillText(known ? o.c.name : '？', cx, cy + (known ? 18 : 0));
  });
  // 流星
  st.next -= dt;
  if (st.next <= 0 && !cloudy) { const a = Math.random() * 6.28, r0 = R * (0.2 + Math.random() * 0.6), dir = a + Math.PI * (0.6 + Math.random() * 0.8); st.meteors.push({ x: CX + Math.cos(a) * r0, y: CY + Math.sin(a) * r0, vx: Math.cos(dir) * 340, vy: Math.sin(dir) * 340, t: 0, life: 0.9 + Math.random() * 0.4 }); st.next = st.sh ? 1 + Math.random() * 2.5 : 5 + Math.random() * 9; }
  st.meteors = st.meteors.filter(m => { m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; if (m.t > m.life) return false;
    const k = 1 - m.t / m.life, gr = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.18, m.y - m.vy * 0.18); gr.addColorStop(0, `rgba(255,255,240,${k})`); gr.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.strokeStyle = gr; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 0.18, m.y - m.vy * 0.18); ctx.stroke(); return true; });
  ctx.restore();
}
async function click(x, y) {
  if (!st || st.busy || ui.dialogOpen() || ui.cardOpen()) return;
  const m = st.meteors.find(m => Math.hypot(m.x - x, m.y - y) < 46 || Math.hypot(m.x - m.vx * 0.09 - x, m.y - m.vy * 0.09 - y) < 46);
  if (m) { st.meteors.splice(st.meteors.indexOf(m), 1); wish(); return; }
  const o = st.cons.filter(o => o.vis && o.cx != null).map(o => ({ o, d: Math.min(Math.hypot(o.cx - x, o.cy - y), ...o.pts.filter(p => p.alt > 0).map(p => { const [px, py] = proj(p.alt, p.az); return Math.hypot(px - x, py - y); })) })).sort((a, b) => a.d - b.d)[0];
  if (o && o.d < 34) observe(o.o);
}
function wish() {
  const d = data(), today = dayKey(); d.wishDay = d.wishDay && d.wishDay.d === today ? d.wishDay : { d: today, n: 0 };
  Audio.sfx('catch');
  if (d.wishDay.n >= 12) { ui.toast('今晚已經許了好多願望，碎片明天再收集吧'); return; }
  d.wishDay.n++; d.frag++; save(); ui.toast(`🌠 許願成功！得到 1 顆星之碎片（共 ${d.frag} 顆）`);
  const n = box && box.querySelector('.sky-n'); if (n) n.textContent = n.textContent.replace(/星之碎片 \d+/, '星之碎片 ' + d.frag);
}
async function observe(o) {
  st.sel = o; const d = data(), c = o.c, host = st.host;
  if (d.book[c.id]) { await info(c); st.sel = null; return; }
  const q = pickQU(['es-cosmos', 'es-motion'], 3) || pickQ('earth', 3); if (!q) return;
  st.busy = true;
  try {
    const i = await ui.ask(host, `觀測到一個星座！先回答一題地科題，答對就能登錄：${q.q}`, q.o, { answer: q.a, abc: true, keys: true, html: true });
    const ok = i === q.a; record(q, ok); ui.closeDialog();
    if (!ok) { Audio.sfx('bad'); await ui.explain(host, q, '可惜，'); await ui.say(host, '再點一次這個星座，換一題試試看。'); ui.closeDialog(); return; }
    d.book[c.id] = dayKey(); S().bells += 400; save(); st && st.paint && st.paint();
    await info(c, true);
    await challenge.keepGoing(host, q);
  } finally { st && (st.busy = false, st.sel = null); }
}
function info(c, fresh) {
  return ui.card({ icon: '', title: `${fresh ? '登錄新星座：' : ''}${c.name}（${c.en}）`, sub: `<b>${c.season}季星座 · 代表亮星：${ui.esc(c.bright || '')}</b><br>${ui.esc(c.desc)}<br><br>💡 ${ui.esc(c.fact)}${fresh ? '<br><br>觀測獎勵 400 鈴錢' : ''}` });
}

/* ---------- 星座圖鑑（手機） ---------- */
export function openBook() {
  const d = data(), body = ui.el('div', 'gbook'), all = I.CONSTELLATIONS || [];
  body.innerHTML = `<p class="muted">登錄 ${bookCount()} / ${all.length} 個星座 · 星之碎片 ${d.frag} 顆（找岳交換獎勵）</p>` + all.map(c => { const got = d.book[c.id]; return `<div class="gb-row${got ? '' : ' no'}"><i style="--c:${got ? '#3b5a8a' : '#8a93a8'}"></i><div><b>${got ? c.name : '？？？'} <small>${got ? c.en : ''}</small></b><small>${c.season}季星座${got ? ' · ' + ui.esc(c.bright || '') + ' · 登錄於 ' + got : ''}</small></div></div>`; }).join('') +
    `<p class="muted">晚上 7 點到清晨 5 點、沒下雨時，到學院台地的觀星台觀星。不同季節、不同時刻看得到的星座不一樣。</p>`;
  ui.panel('星座圖鑑', body, { cls: 'phone' });
}
export const debug = () => st;
