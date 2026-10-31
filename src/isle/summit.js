/* 潮汐小島 · 星環之頂（v9.5.2）：大講堂講台後的樓梯（拿到第一份總模擬考成績單後，光幕散開）通往城堡最高處的露天平台
   （室內 data/interiors_starsummit.js，Codex 製作；文字 data/academy.js 的 summit）。
   - 頭上浮著大星環（十段一科，依點亮的比例發光）；平台周圍十根水晶柱，一根一科。
   - 祭壇前挑戰最終首領（summit.boss）：它依序化成你每一科考科的樣子，一科一個階段（社會、自然借那一組裡你精熟度最低的那一科的海獸形體）。
     每個階段 PHASE_HP 血；答對造成傷害（越快越痛，前 30% 時間內暴擊），答錯或超時失去一顆心。心在各階段共用（燈塔首領戰的心數 + EXTRA_HEARTS），打倒一個階段回一顆心。
   - 首次勝利是結局儀式：大星環整圈亮起、望舒的話、手帳、FIRST_GEMS 潮晶與紀念家具；之後每次勝利 WIN_GEMS 潮晶，剩下的心每顆再 +5。
   紀錄：S().sa.final = { met, tries, wins, best 最快秒數, first 首勝的日子 } */
import * as THREE from 'three';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, dayKey } from './state.js';
import { open, setKeys, confirmIn, renderQ, keyText, keyIndex, showResult, subj, fmtT } from './hall.js';
import { timeFor, heartsMax } from './voyage.js';
import * as memo from './memo.js';
import { HOST } from './starbridge.js';
import { groups } from './greathall.js';

const TA = window.TA, L = TA.L;
export const PHASE_HP = 60, FIRST_GEMS = 200, WIN_GEMS = 40, EXTRA_HEARTS = 2;
let ctx = null, R = null, busy = false, tickT = 0, pend = null;
const D = () => (I.ACADEMY || {}).summit || {};
const one = a => (a && a.length ? a[Math.floor(Math.random() * a.length)] : '');
const hostSp = () => { const h = HOST(); return { name: h.name, color: h.color, voice: h.voice }; };
const rec = () => { const s = S(), a = s.sa = s.sa || {}; return (a.final = a.final || {}); };
const boss = () => Object.assign({ name: '晦星霧', en: 'THE DIMMING VEIL', lore: '' }, D().boss || {});
const touch = () => matchMedia('(pointer: coarse)').matches;
const units = sid => TA.DATA.units[sid] || [];
const litK = sid => { const u = units(sid); return u.length ? u.filter(x => ((TA.S.units || {})[x.id] || {}).stars > 0).length / u.length : 0; };
export const wins = () => rec().wins || 0;
export function init(c) { ctx = c; }

/* ---------- 首領的階段 ---------- */
/** 這一階段借哪一隻海獸的形體：一組裡你精熟度最低的那一科 */
export function formOf(g) { const subs = TA.SUBJECTS.filter(s => s.group === g); return subs.slice().sort((a, b) => L.subjectStats(a.id).mastery - L.subjectStats(b.id).mastery)[0].id; }
/** 這一階段的題目：一組裡每一科的進階題混在一起 */
function poolOf(g, used) {
  const subs = TA.SUBJECTS.filter(s => s.group === g).map(s => s.id), per = Math.ceil(14 / subs.length), ids = [];
  subs.forEach(sid => L.pickBoss(sid, per).forEach(id => { if (!used.has(id) && !ids.includes(id)) ids.push(id); }));
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids;
}
/** 祭壇前的介紹：首領、規則與紀錄 */
export function openFinal() {
  const B = boss(), f = rec(), ph = groups(), sid = formOf(ph[0] || '國文'), body = ui.el('div', 'hall vb-intro');
  body.innerHTML = `<div class="hall-scroll"><div class="vb-stage small sm-stage" style="--c:#a8a6cf"><canvas></canvas></div>
    <div class="hr-kicker">FINAL · ${ui.esc(B.en)}</div><h2>${ui.esc(B.name)}</h2><p>${ui.esc(B.lore)}</p>
    <ul class="vb-rules"><li>🌫️ 依序化成你的考科：${ph.map(ui.esc).join(' → ')}（一科一個階段，題目是那一科的進階題）</li><li>⚔️ 答對造成傷害：越快越痛，前 30% 時間內作答會暴擊；血量低於一半會狂暴，作答時間縮短 20%</li><li>❤️ 你有 ${heartsMax() + EXTRA_HEARTS} 顆心，各階段共用；答錯或超時失去一顆，打倒一個階段回一顆</li><li>💎 首次勝利 ${FIRST_GEMS} 潮晶與紀念家具，之後每次 ${WIN_GEMS} 潮晶（剩下的心每顆再 +5）</li></ul>
    <p class="muted">${f.wins ? `已經驅散 ${f.wins} 次 · 最快 ${fmtT(f.best || 0)}` : f.tries ? `挑戰過 ${f.tries} 次` : '還沒有挑戰過'}</p></div>
    <div class="hx-foot"><span class="spacer"></span><button type="button" class="btn danger fight">開始挑戰</button></div>`;
  let cr = null;
  open(`星環之頂 · ${B.name}`, body, { onClose: () => { if (cr) cr.stop(); } });
  const cv = body.querySelector('canvas'); if (TA.Creature) { cr = new TA.Creature(cv, sid); cr.start(); }
  body.querySelector('.fight').onclick = () => fight();
  setKeys(e => { if (e.code === 'Enter') { fight(); return true; } return false; });
}
function fight() {
  const phases = groups(), B = boss(), used = new Set(), t0 = Date.now(), log = [], f = rec();
  if (!phases.length) return;
  f.tries = (f.tries || 0) + 1; save();
  let ph = 0, ids = poolOf(phases[0], used), i = 0, hp = PHASE_HP, hearts = heartsMax() + EXTRA_HEARTS, rage = false, combo = 0, xp = 0, correct = 0, gap = false;
  let cur = null, view = null, locked = false, done = false, closed = false, qClock = 0, qT0 = 0, qLimit = 40000, cr = null, sel = [], fillV = '', sayT = 0;
  const maxH = hearts, body = ui.el('div', 'hall hx vb sm-fight');
  body.innerHTML = `<div class="vb-stage sm-stage"><canvas></canvas>
      <div class="vb-hp"><b></b><div class="vb-bar"><i class="ghost"></i><i class="fill"></i></div><span class="vb-num"></span></div>
      <div class="sm-phases">${phases.map((g, k) => `<span data-k="${k}">${ui.esc(g)}</span>`).join('')}</div><p class="sm-say"></p>
      <div class="vb-hearts"></div><div class="vb-qt"><i></i><span></span></div></div>
    <div class="hall-scroll hx-main"></div><div class="hx-foot"><span class="muted hx-hint"></span><span class="spacer"></span><button type="button" class="btn act"></button></div>`;
  const $ = s => body.querySelector(s), main = $('.hx-main'), act = $('.act'), hint = $('.hx-hint'), stage = $('.vb-stage'), name = $('.vb-hp b');
  const fill = $('.vb-bar .fill'), ghost = $('.vb-bar .ghost'), num = $('.vb-num'), heartsEl = $('.vb-hearts'), qt = $('.vb-qt i'), qtS = $('.vb-qt span'), say = $('.sm-say');
  const paintHearts = () => { heartsEl.innerHTML = Array.from({ length: maxH }, (_, k) => `<span class="${k < hearts ? 'on' : ''}">❤</span>`).join(''); };
  const bar = () => { const k = hp / PHASE_HP * 100; fill.style.width = k + '%'; setTimeout(() => { ghost.style.width = k + '%'; }, 450); num.textContent = Math.ceil(k); };
  const speak = t => { say.textContent = t || ''; say.classList.toggle('on', !!t); clearTimeout(sayT); if (t) sayT = setTimeout(() => say.classList.remove('on'), 5200); };
  const form = () => {   // 換成這一階段的形體：顏色、名字、海獸
    const sid = formOf(phases[ph]); stage.style.setProperty('--c', subj(sid).color); name.textContent = `${B.name} · ${phases[ph]}`;
    body.querySelectorAll('.sm-phases span').forEach(s => { const k = +s.dataset.k; s.classList.toggle('done', k < ph); s.classList.toggle('on', k === ph); });
    if (cr) cr.stop(); if (TA.Creature) { cr = new TA.Creature($('canvas'), sid); cr.start(); }
    rage = false; stage.classList.remove('rage'); hp = PHASE_HP; bar();
    speak(one((D().phase || {})[phases[ph]]));
  };
  const setHP = v => { hp = Math.max(0, Math.min(PHASE_HP, v)); bar(); if (hp <= PHASE_HP / 2 && hp > 0 && !rage) { rage = true; if (cr) cr.rage = 1; stage.classList.add('rage'); ui.toast(`${B.name}狂暴化！作答時間縮短 20%`); } };
  const paintAct = () => {
    if (gap) { act.textContent = '下一階段 →'; act.disabled = false; hint.textContent = `${phases[ph]}的霧散開了 · 回復一顆心`; return; }
    if (locked) { act.textContent = '下一題 →'; act.disabled = false; hint.textContent = 'Enter 繼續'; return; }
    if (cur.type === 'multi') { act.textContent = '送出答案'; act.disabled = !sel.length; hint.textContent = '多選題：選好再送出'; return; }
    if (cur.type === 'fill') { act.textContent = '送出答案'; act.disabled = !fillV; hint.textContent = '選填題：輸入答案後送出'; return; }
    act.textContent = '選一個答案'; act.disabled = true; hint.textContent = `第 ${ph + 1}／${phases.length} 階段 · 越快答對傷害越高`;
  };
  const show = () => {
    if (done) return;
    if (i >= ids.length) { const more = poolOf(phases[ph], used); ids = ids.concat(more.length ? more : poolOf(phases[ph], new Set())); }
    cur = L.view(L.Q[ids[i]]); used.add(cur.id); locked = false; sel = []; fillV = '';
    view = renderQ(cur, {
      no: `${phases[ph]} · 第 ${i + 1} 題`,
      onPick: k => { if (locked) return; if (cur.type === 'multi') { const at = sel.indexOf(k); if (at >= 0) sel.splice(at, 1); else sel.push(k); view.setPick(sel); Audio.sfx('tick'); paintAct(); } else answer(k); },
      onFill: v => { fillV = v; paintAct(); },
      onEnter: () => { if (!locked && fillV) answer(fillV); else if (locked) act.click(); },
    });
    main.innerHTML = ''; main.appendChild(view.el); main.scrollTop = 0; paintAct();
    if (view.input && !touch()) setTimeout(() => view.input.focus(), 30);
    qLimit = timeFor(cur, rage) * 1000; qT0 = Date.now(); clearInterval(qClock);
    qClock = setInterval(() => {
      if (body.querySelector('.hall-ov')) { qT0 += 100; return; }   // 確認框開著時暫停計時
      const k = 1 - (Date.now() - qT0) / qLimit; qt.style.width = Math.max(0, k * 100) + '%'; qt.parentNode.classList.toggle('warn', k < 0.25); qtS.textContent = Math.ceil(Math.max(0, k * qLimit / 1000)) + 's';
      if (k <= 0) { clearInterval(qClock); answer(null); }
    }, 100);
  };
  const answer = ans => {
    if (locked || done) return; locked = true; clearInterval(qClock);
    const ms = Date.now() - qT0, timeout = ans == null, ok = !timeout && L.check(cur, ans), score = timeout ? 0 : L.multiScore(cur, ans);
    combo = ok ? combo + 1 : 0; if (ok) correct++;
    xp += L.record(cur, ok, { combo }).xp;
    log.push({ id: cur.id, v: cur, ans: timeout ? null : ans, ok, score });
    view.mark(ok, ans);
    if (ok) {
      const fast = ms < qLimit * 0.3; let dmg = 7 + ((cur.d || 1) - 1) * 1.5 + Math.min(combo - 1, 5) * 0.8 + (1 - ms / qLimit) * 3; if (fast) dmg *= 1.4; dmg = Math.round(dmg);
      if (cr) cr.hit(); Audio.sfx(fast ? 'catch' : 'ok'); setHP(hp - dmg);
      stage.dataset.pop = (fast ? '暴擊 ' : '') + '-' + dmg;
    } else {
      if (cr) cr.attack(); Audio.sfx('bad'); hearts--; paintHearts(); setHP(hp + 4);
      stage.dataset.pop = timeout ? '時間到！' : '-❤';
    }
    stage.classList.remove('popping'); void stage.offsetWidth; stage.classList.add('popping');
    view.card.appendChild(ui.el('div', 'hq-ex' + (ok ? '' : ' bad'), `<b class="v">${ok ? '霧散開了一些！' : timeout ? '時間到！' : score > 0 ? `部分正確（學測給分 ${score}）` : '霧又聚了回來'}${ok ? '' : ` 正解 ${keyText(cur)}`}</b><div>${ui.rich(cur.e || '')}</div>`));
    if (hp <= 0) {
      if (cr) cr.die();
      if (ph + 1 >= phases.length) { finish(true); return; }
      gap = true; hearts = Math.min(maxH, hearts + 1); paintHearts(); Audio.sfx('rare'); speak(one(D().next) || '這一段霧散開了，回復一顆心。');
    } else if (hearts <= 0) { finish(false); return; }
    paintAct();
  };
  const finish = won => {
    if (done) return; done = true; clearInterval(qClock);
    const secs = Math.round((Date.now() - t0) / 1000);
    let gems = 5, first = false;
    if (won) {
      first = !f.wins; f.wins = (f.wins || 0) + 1; f.best = f.best ? Math.min(f.best, secs) : secs; if (first) f.first = dayKey();
      gems = (first ? FIRST_GEMS : WIN_GEMS) + hearts * 5; xp += L.gain(200, 0).xp;
      if (R) R.flare = 1;
    }
    L.gain(0, gems); L.checkAch(); TA.Store.save();
    Audio.sfx(won ? 'levelup' : 'bad');
    const kind = won ? (first ? 'first' : 'win') : 'lose';
    setTimeout(() => !closed && showResult({ mode: 'boss', title: B.name, total: log.length, correct, log, xp, gems, secs, again: () => fight(),
      kicker: won ? 'FINAL VICTORY' : 'NOT YET', heading: won ? `驅散了${B.name}` : `${B.name}還沒散開……`,
      sub: won ? (first ? '首次勝利：頭上的大星環整圈亮了起來。' : `剩餘 ${hearts} 顆心 · 用時 ${fmtT(secs)}`) : `停在第 ${ph + 1}／${phases.length} 階段（${phases[ph]}）：挑${phases[ph]}的單元多練幾題再回來。`,
      bigHtml: `<div class="vb-emblem${won ? ' won' : ''}">${won ? '🌟' : '🌫️'}</div>`, onClose: () => { pend = kind; } }), won ? 1600 : 900);
  };
  act.onclick = () => {
    if (gap) { gap = false; ph++; ids = poolOf(phases[ph], used); i = 0; form(); show(); return; }
    if (locked) { i++; show(); } else if (cur.type === 'multi' && sel.length) answer(sel.slice().sort((a, b) => a - b)); else if (cur.type === 'fill' && fillV) answer(fillV);
  };
  const guard = () => done ? Promise.resolve(true) : confirmIn(body, '從星環之頂撤退？', '這場挑戰不會留下勝負紀錄（已答的題目照樣記進學習紀錄）。', '撤退');
  open(`星環之頂 · ${B.name}`, body, { guard, onClose: () => { done = true; closed = true; clearInterval(qClock); clearTimeout(sayT); if (cr) cr.stop(); } });
  setKeys(e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return false;
    if (e.code === 'Enter' || e.code === 'Space') { act.click(); return true; }
    const k = keyIndex(e); if (k >= 0 && !locked && cur && cur.o && k < cur.o.length) { view.el.querySelectorAll('.hq-opt')[k].click(); return true; }
    return false;
  });
  paintHearts(); form(); show();
}

/* ---------- 擺上這次進門的東西（house.js 的 dress） ---------- */
/** 頭上的大星環：十段一科，點亮的比例越高越亮 */
function bigRing() {
  const g = new THREE.Group(), n = TA.SUBJECTS.length, gap = 0.03;
  g.userData.segs = TA.SUBJECTS.map((s, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.2, 10, 48, Math.PI * 2 / n - gap * 2), new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.1, roughness: 0.35, metalness: 0.25 }));
    m.rotation.z = i / n * Math.PI * 2 + gap; g.add(m); return m;
  });
  const inner = new THREE.Mesh(new THREE.TorusGeometry(4.9, 0.03, 6, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d6').multiplyScalar(1.4), transparent: true, opacity: 0.55 })); g.add(inner); g.userData.inner = inner;
  g.rotation.x = -Math.PI / 2 + 0.22;   // 斜斜地浮著，和島上看到的那一圈一樣
  return g;
}
function paint() {
  if (!R) return;
  const fl = R.flare || 0;
  if (R.ring) R.ring.userData.segs.forEach((m, i) => { const k = Math.max(litK(TA.SUBJECTS[i].id), fl); m.material.emissiveIntensity = 0.08 + k * 1.5; m.material.color.set(TA.SUBJECTS[i].color).multiplyScalar(0.55 + k * 0.45); });
  R.pillars.forEach(p => { p.k = Math.max(litK(p.sid), fl); });
}
/** house.js 進門時呼叫：大星環掛在 ring_big，水晶柱依點亮比例發光 */
export function dress(ud, g) {
  R = { ring: bigRing(), pillars: [], flare: 0, hold: false };
  const at = g && g.getObjectByName('ring_big'), p = new THREE.Vector3(0, 8.5, 0); if (at) at.getWorldPosition(p); R.ring.position.copy(p);
  TA.SUBJECTS.forEach(s => { const m = g && g.getObjectByName('pillar_' + s.id); if (m && m.isMesh && m.material) R.pillars.push({ m, sid: s.id, k: 0 }); });
  paint();
  return [R.ring];
}
export function undress() { R = null; }
/** 在星環之頂的每一格：大星環慢慢轉、水晶柱呼吸；挑戰的結果頁關掉後，望舒說話（首勝是結局儀式） */
export function tick(dt, t) {
  if (!R) return;
  R.ring.rotation.z += dt * 0.05; R.ring.userData.inner.rotation.z -= dt * 0.08;
  if (R.flare > 0 && !R.hold) { R.flare = Math.max(0, R.flare - dt * 0.05); }
  R.pillars.forEach((p, i) => { p.m.material.emissiveIntensity = 0.15 + p.k * 0.9 + Math.sin(t * 1.3 + i * 0.63) * 0.08 + (R.flare || 0) * 0.6; });
  if ((tickT -= dt) > 0) return; tickT = 0.5; paint();
  if (pend && !busy && !ui.panelOpen() && !ui.dialogOpen() && !ui.cardOpen()) act('after');
}

/* ---------- 互動（house.js 的 hook:starsummit） ---------- */
export async function act(topic) {
  if (busy) return; busy = true;
  try { await run(String(topic || '')); } finally { busy = false; ui.closeDialog(); if (ctx && ctx.paint) ctx.paint(); }
}
async function run(topic) {
  const sp = hostSp(), G = D();
  if (topic === 'altar') { await ui.say(sp, one(G.altar) || '晦星霧在台座前聚起來了。'); ui.closeDialog(); openFinal(); return; }
  if (topic !== 'after') return;
  const kind = pend; pend = null;
  if (kind === 'lose') { await ui.say(sp, one(G.lose) || '再練一練，下次再來。'); return; }
  if (kind === 'win') { await ui.say(sp, one(G.win) || '霧又散開了。'); return; }
  if (kind !== 'first') return;
  if (R) { R.flare = 1; R.hold = true; paint(); }   // 結局儀式：大星環整圈亮著，等望舒說完
  Audio.sfx('levelup');
  for (const l of G.first || []) await ui.say(sp, l);
  if (R) R.hold = false;
  const m = G.memo || {}; memo.add(m.title || '星環完整亮起的時刻', m.text || '', { key: 'sa:final', icon: '🌟' });
  if (G.prize && ctx && ctx.giveFurn) { ui.closeDialog(); await ctx.giveFurn(G.prize.id, '在星環之頂驅散了' + boss().name); }
}
/** 和望舒說話（在星環之頂） */
export async function talk() {
  const sp = hostSp(), G = D(), B = boss();
  await ui.say(sp, one(G.hello) || '今晚的風很輕。');
  const i = await ui.ask(sp, '想知道什麼呢？', [`${B.name}是什麼`, '挑戰的規則', '沒事了']);
  if (i === 0) await ui.say(sp, B.lore || '');
  else if (i === 1) await ui.say(sp, G.rule || '');
}
/** 第一次走上星環之頂：望舒說明 */
export async function opening() {
  const f = rec(); if (f.met) return; f.met = dayKey(); save();
  for (const l of D().intro || []) await ui.say(hostSp(), l);
  ui.closeDialog();
}
export const debug = () => ({ rec: JSON.parse(JSON.stringify(rec())), dressed: !!R, pillars: R ? R.pillars.length : 0, flare: R ? R.flare : 0, pend });
