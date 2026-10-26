/* 潮汐小島 · 專注時光：島上的番茄鐘。以實際時間計算（重新整理也會接續）。完成一輪記入專注紀錄（每日分鐘、累計分鐘、
   XP、潮晶），另外給島上的鈴錢與潮汐里程；之後可以接著休息（休息時島上照常可以走動，畫面上方倒數，時間到會提醒）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
import * as miles from './miles.js';

const TA = window.TA, L = TA.L, U = TA.U;
export const PRESETS = [[15, '快閃', '15 分專注 · 3 分休息', 3], [25, '經典番茄', '25 分專注 · 5 分休息', 5], [50, '深潛', '50 分專注 · 10 分休息', 10], [90, '模考長潮', '90 分 · 模擬一節考試', 15]];
const restOf = m => (PRESETS.find(p => p[0] === m) || [0, '', '', 5])[3];
const run = () => S().focusRun || null;
const rest = () => S().restRun || null;
export const active = () => !!run();
let box = null, timer = 0, onDone = null, pill = null, rtimer = 0;
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const left = r => Math.max(0, r.paused != null ? r.paused : (r.endAt - Date.now()) / 1000);
function award(min, full) {
  if (min < 5) return 0;
  const s = S(), d = L.dayRec(); d.min += min; d.focus = true; TA.S.focus.min += min; if (full) TA.S.focus.sessions++;
  const gems = Math.round(min / 5) * 2, bells = min * 40; L.gain(min * 3, gems); L.touchStreak(); L.checkAch();
  s.bells += bells; s.stats = s.stats || {}; s.stats.focusMin = (s.stats.focusMin || 0) + min; save(); miles.add('focus', min);
  return bells;
}
/** 專注統計：今日分鐘、累積小時、完成輪數，加上最近七天的長條 */
function statsHtml() {
  const d = L.dayRec(), F = TA.S.focus || { min: 0, sessions: 0 }, today = U.dayKey(), week = [];
  for (let k = 6; k >= 0; k--) { const key = U.numToKey(U.dayNum() - k); week.push([key, (TA.S.days[key] || {}).min || 0]); }
  const mx = Math.max(30, ...week.map(w => w[1]));
  return `<div class="fs-stats"><div><b>${d.min}</b><small>今日分鐘</small></div><div><b>${Math.round(F.min / 6) / 10}</b><small>累積小時</small></div><div><b>${F.sessions}</b><small>完成輪數</small></div></div>
    <div class="fs-week">${week.map(([k, m]) => `<div class="fw${k === today ? ' today' : ''}" title="${k}：${m} 分鐘"><span><i style="height:${(m / mx * 100).toFixed(1)}%"></i></span><small>${m ? m : ''}</small><small>${U.weekday(U.keyToNum(k))}</small></div>`).join('')}</div>`;
}
/** 選擇時間後開始；專注或休息進行中就打開對應的畫面 */
export function open(paint) {
  if (run()) { show(paint); return; }
  if (rest()) { restPanel(paint); return; }
  const body = ui.el('div', 'focus-pick');
  body.innerHTML = `<p class="muted">專注期間島上的操作會暫停；計時以實際時間計算，切換分頁或重新整理都不會中斷。完成一輪得到經驗、潮晶與鈴錢（當日有專注里程任務時也會累積），之後可以接著休息。</p>${statsHtml()}`;
  const subj = ui.el('select', 'focus-sub'); subj.innerHTML = '<option value="">（不指定科目）</option>' + TA.SUBJECTS.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  body.appendChild(ui.el('label', '', '這次要讀：')).appendChild(subj);
  const grid = ui.el('div', 'fs-grid');
  PRESETS.forEach(([m, n, d]) => { const b = ui.el('button', 'fs-item', `<b>${n}</b><small>${d}</small>`); b.type = 'button'; b.onclick = () => start(m, subj.value, paint); grid.appendChild(b); });
  body.appendChild(grid);
  ui.panel('專注時光', body, { cls: 'shop-p' });
}
function start(m, sid, paint) {
  S().focusRun = { min: m, total: m * 60, endAt: Date.now() + m * 60000, sid: sid || null }; S().restRun = null; save();
  hidePill(); ui.closePanel(); Audio.sfx('ok'); show(paint);
}
function show(paint) {
  onDone = paint || onDone;
  if (!box) {
    box = ui.el('div', 'focus-view'); document.body.appendChild(box); document.body.classList.add('focusing');
    box.innerHTML = `<div class="fv-wave"></div><div class="fv-card"><small class="fv-sub"></small><div class="fv-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg"/></svg><b class="fv-time"></b></div><p class="fv-tip">把手機放遠一點，一次只做一件事。</p><div class="fv-act"><button type="button" class="btn fv-pause">暫停</button><button type="button" class="btn fv-stop">結束並記錄</button></div></div>`;
    box.querySelector('.fv-pause').onclick = () => { const r = run(); if (!r) return; if (r.paused != null) { r.endAt = Date.now() + r.paused * 1000; r.paused = null; } else r.paused = left(r); save(); draw(); };
    box.querySelector('.fv-stop').onclick = () => stop(true);
  }
  draw(); clearInterval(timer); timer = setInterval(draw, 500);
}
const TIPS = ['把手機放遠一點，一次只做一件事。', '卡住的題目先做記號，回頭再看。', '累了就喝口水、伸個懶腰。', '寫下一句今天學到的事，記得更牢。', '專注的時間，比讀了幾頁更重要。'];
const REST_TIPS = ['休息時間別滑手機——起來喝水、看遠方、伸展肩頸。', '休息前寫下剛剛卡住的一個問題，回來先解決它。', '去島上散步、跟島民聊聊天，或翻幾張單字卡。', '深呼吸：吸 4 秒、停 4 秒、吐 6 秒，重複三次。', '把下一輪要讀的範圍寫成一句話，目標越小越容易開始。'];
function draw() {
  const r = run(); if (!r) { hide(); return; }
  const l = left(r), k = 1 - l / r.total, sub = r.sid ? (TA.subject(r.sid) || {}).name : '';
  box.querySelector('.fv-time').textContent = fmt(l);
  box.querySelector('.fv-sub').textContent = `專注中${sub ? ' · ' + sub : ''} · ${r.min} 分鐘${r.paused != null ? '（已暫停）' : ''}`;
  box.querySelector('.fg').style.strokeDashoffset = (326.7 * (1 - k)).toFixed(1);
  box.querySelector('.fv-pause').textContent = r.paused != null ? '繼續' : '暫停';
  box.querySelector('.fv-tip').textContent = TIPS[Math.floor((r.total - l) / 300) % TIPS.length];
  document.title = `● ${fmt(l)} · 潮汐小島`;
  if (l <= 0 && r.paused == null) finish();
}
function hide() { clearInterval(timer); if (box) { box.remove(); box = null; } document.body.classList.remove('focusing'); document.title = '潮汐小島'; }
function finish() {
  const r = run(); S().focusRun = null; save(); hide();
  const b = award(r.min, true), rm = restOf(r.min); Audio.sfx('catch');
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* 不支援震動 */ }
  const body = ui.el('div', 'focus-pick fs-done');
  body.innerHTML = `<p class="fs-head"><b>專注完成：${r.min} 分鐘</b>${r.sid ? ` · ${ui.esc((TA.subject(r.sid) || {}).name || '')}` : ''}</p><p class="muted">+${r.min * 3} 經驗 · +${Math.round(r.min / 5) * 2} 潮晶 · +${b} 鈴錢</p>${statsHtml()}
    <div class="fs-acts"><button type="button" class="btn gold rest">休息 ${rm} 分鐘</button><button type="button" class="btn ghost skip">不用休息，回島上</button></div><p class="muted">休息時島上照常可以走動，畫面上方會倒數，時間到會提醒你。</p>`;
  body.querySelector('.rest').onclick = () => { startRest(rm, r.min, r.sid); ui.closePanel(); };
  body.querySelector('.skip').onclick = () => ui.closePanel();
  ui.panel('專注完成', body, { cls: 'shop-p' });
  onDone && onDone();
}
export function stop(credit) {
  const r = run(); if (!r) return;
  if (left(r) <= 0 && r.paused == null) { finish(); return; }
  S().focusRun = null; save(); hide();
  const done = Math.floor((r.total - left(r)) / 60);
  if (credit && done >= 5) { const b = award(done, false); ui.toast(`已記錄專注 ${done} 分鐘（+${b} 鈴錢）`); } else if (credit) ui.toast('專注不到 5 分鐘，這次先不記錄');
  onDone && onDone();
}

/* ---------- 休息 ---------- */
function startRest(m, next, sid) { S().restRun = { min: m, total: m * 60, endAt: Date.now() + m * 60000, next, sid: sid || null }; save(); Audio.sfx('open'); showPill(); }
function showPill() {
  if (!pill) { pill = ui.el('button', 'rest-pill'); pill.type = 'button'; pill.title = '休息中（點一下可以提早開始下一輪）'; pill.onclick = () => restPanel(onDone); document.body.appendChild(pill); }
  tickRest(); clearInterval(rtimer); rtimer = setInterval(tickRest, 1000);
}
function tickRest() {
  const r = rest(); if (!r) { hidePill(); return; }
  const l = Math.max(0, (r.endAt - Date.now()) / 1000);
  pill.innerHTML = `☕ 休息 <b>${fmt(l)}</b>`;
  if (l <= 0) { S().restRun = null; save(); hidePill(); Audio.sfx('open'); ui.toast('☕ 休息結束！準備好就再專注一輪吧（手機「自由練習」→「專注時光」）'); }
}
function hidePill() { clearInterval(rtimer); if (pill) { pill.remove(); pill = null; } }
function restPanel(paint) {
  const r = rest(); if (!r) { open(paint); return; }
  const l = Math.max(0, (r.endAt - Date.now()) / 1000);
  const body = ui.el('div', 'focus-pick');
  body.innerHTML = `<p class="fs-head"><b>休息中，還有 ${fmt(l)}</b></p><p class="muted">${REST_TIPS[Math.floor(Date.now() / 600000) % REST_TIPS.length]}</p>
    <div class="fs-acts"><button type="button" class="btn gold again">開始下一輪（${r.next} 分鐘）</button><button type="button" class="btn ghost end">結束休息</button></div>`;
  body.querySelector('.again').onclick = () => start(r.next, r.sid, paint);
  body.querySelector('.end').onclick = () => { S().restRun = null; save(); hidePill(); ui.closePanel(); };
  ui.panel('休息時間', body, { cls: 'shop-p' });
}
/** 啟動時：上次的計時（專注或休息）還在進行就接續 */
export function resume(paint) { onDone = paint || onDone; if (run()) show(paint); else if (rest()) showPill(); }
export const key = e => { if (!box) return false; if (e.code === 'Escape') e.preventDefault(); return true; };
