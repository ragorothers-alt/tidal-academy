/* 潮汐小島 · 拋射實驗場：海邊的拋體運動小遊戲。調整仰角與初速，把椰子丟進遠處的籃子。
   忽略空氣阻力、同一高度落地：射程 R = v² · sin 2θ ÷ g（g = 9.8 m/s²）。每輪 3 個目標，答對越多鈴錢越多。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, practiced } from './state.js';
import { dayKey } from './quiz.js';
import * as miles from './miles.js';

const G = 9.8, TOL = 1.2;
export const range = (v, deg) => v * v * Math.sin(2 * deg * Math.PI / 180) / G;
export function open(paint) {
  const body = ui.el('div', 'throw'); let round = 0, hits = 0, clean = 0, target = 0, ang = 45, spd = 15, anim = 0, tries = 0, wait = false;
  const newTarget = () => { target = Math.round((8 + Math.random() * 30) * 2) / 2; tries = 0; };
  body.innerHTML = `<p class="muted">把椰子丟進籃子！忽略空氣阻力、從同一高度出手：射程 R = v² · sin 2θ ÷ g（g = 9.8 m/s²）。每個目標可以丟 3 次。</p>
    <canvas class="th-cv" width="640" height="260"></canvas>
    <div class="th-ctl"><label>仰角 θ <b class="th-a"></b>°<input type="range" min="5" max="85" step="1" class="th-ang"></label>
    <label>初速 v <b class="th-v"></b> m/s<input type="range" min="5" max="20" step="0.5" class="th-spd"></label></div>
    <div class="th-row"><button type="button" class="btn gold th-go">丟出去！</button><b class="th-tg"></b><span class="th-msg"></span></div>`;
  const cv = body.querySelector('.th-cv'), c = cv.getContext('2d'), ia = body.querySelector('.th-ang'), iv = body.querySelector('.th-spd'), msg = body.querySelector('.th-msg');
  const SX = 40, SY = 220, SCALE = 560 / 45;   // 1 公尺 = 12.4 px，畫面寬 45 m
  const fs = n => `${Math.round(n * Math.max(1, 640 / (cv.clientWidth || 640)))}px sans-serif`;   // 小螢幕上畫布縮小時，字放大維持可讀
  const scene = (path, land) => {
    c.clearRect(0, 0, 640, 260);
    c.fillStyle = '#cfefff'; c.fillRect(0, 0, 640, 260); c.fillStyle = '#f3e2b8'; c.fillRect(0, SY, 640, 40);
    for (let m = 0; m <= 45; m += 5) { const x = SX + m * SCALE; c.fillStyle = '#b8a070'; c.fillRect(x, SY, 1, 6); c.font = fs(10); c.fillText(m + 'm', x - 8, SY + 18); }
    const tx = SX + target * SCALE; c.fillStyle = '#a87a48'; c.fillRect(tx - TOL * SCALE, SY - 14, TOL * 2 * SCALE, 14); c.fillStyle = '#ff7a5a'; c.font = 'bold ' + fs(12); c.fillText(`籃子 ${target} m`, tx - 26, SY - 20); const tg = body.querySelector('.th-tg'); if (tg) tg.textContent = `目標：${target} m`;
    c.fillStyle = '#5a8a3a'; c.fillRect(SX - 6, SY - 22, 12, 22);
    const r = 34; c.strokeStyle = '#ef6f5e'; c.lineWidth = 3; c.beginPath(); c.moveTo(SX, SY - 22); c.lineTo(SX + Math.cos(ang * Math.PI / 180) * r, SY - 22 - Math.sin(ang * Math.PI / 180) * r); c.stroke();
    if (path) { c.strokeStyle = 'rgba(90,60,40,.5)'; c.setLineDash([4, 4]); c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.setLineDash([]); const [x, y] = path[path.length - 1]; c.fillStyle = '#8a5a2b'; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); }
    if (land != null) { c.fillStyle = '#3f6fbf'; c.font = 'bold ' + fs(12); c.fillText(`落點 ${land.toFixed(1)} m`, SX + land * SCALE - 26, SY + 34); }
  };
  const sync = () => { ang = +ia.value; spd = +iv.value; body.querySelector('.th-a').textContent = ang; body.querySelector('.th-v').textContent = spd; scene(); };
  ia.value = ang; iv.value = spd; ia.oninput = iv.oninput = sync;
  body.querySelector('.th-go').onclick = () => {
    if (anim || wait || round >= 3) return; tries++;
    const A = ang, V = spd;   // 發射當下的數值：飛行途中拉滑桿不影響這一次
    const th = A * Math.PI / 180, vx = V * Math.cos(th), vy = V * Math.sin(th), T = 2 * vy / G, R = range(V, A), path = []; let t0 = performance.now();
    Audio.sfx('swish');
    const step = now => {
      const t = Math.min(T, (now - t0) / 1000 * 1.6), x = vx * t, y = vy * t - 0.5 * G * t * t; path.push([SX + x * SCALE, SY - 22 - y * SCALE]); scene(path);
      if (t < T) { anim = requestAnimationFrame(step); return; }
      anim = 0; scene(path, R); const hit = Math.abs(R - target) <= TOL;
      if (hit) { hits++; if (tries === 1) clean++; Audio.sfx('catch'); msg.innerHTML = `<b>進籃了！</b> R = ${V}² × sin ${2 * A}° ÷ 9.8 ≈ ${R.toFixed(1)} m`; }
      else { Audio.sfx('bad'); msg.innerHTML = `差了 ${(R - target).toFixed(1)} m。R = v² · sin 2θ ÷ g ≈ ${R.toFixed(1)} m${tries >= 3 ? '　（換下一個目標）' : ''}`; }
      if (hit || tries >= 3) { round++; if (round >= 3) return finish(); wait = true; setTimeout(() => { wait = false; newTarget(); scene(); }, 1200); }
    };
    anim = requestAnimationFrame(step);
  };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.throwDay !== d && hits > 0, b = first ? hits * 800 : 0; if (first) s.throwDay = d; s.bells += b; s.stats = s.stats || {}; s.stats.throwHits = (s.stats.throwHits || 0) + hits; practiced('throw', hits, 3, { right: clean, total: 3 }); save();   /* 概念證據只算第一發就進籃的：用公式先算好，而不是靠試射調整 */ if (hits) miles.add('puzzle');
    msg.innerHTML = `這一輪命中 ${hits} / 3 個籃子。${first ? `今日練習獎勵：${b} 鈴錢。` : ''}提示：同樣的初速，仰角 45° 射程最遠；互餘的仰角（兩角和為 90°，例如 30° 與 60°）射程相同。`;
    const again = ui.el('button', 'btn', '再玩一輪'); again.type = 'button'; again.onclick = () => { round = 0; hits = 0; clean = 0; newTarget(); msg.textContent = ''; again.remove(); scene(); }; body.querySelector('.th-row').appendChild(again);
    paint && paint();
  };
  newTarget();
  ui.panel('拋射實驗場（物理）', body, { cls: 'shop-p', onClose: () => { cancelAnimationFrame(anim); anim = 0; } });
  sync(); requestAnimationFrame(sync);   // 面板插入後才量得到畫布實際寬度（小螢幕字級）
}
