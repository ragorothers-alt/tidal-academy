/* 潮汐小島 · 航海圖與試煉
   航海圖：十科的單元燈塔（星等、精熟度、筆記、試煉）、科目練習與錯題、首領卡。
   單元試煉：10 題，正確率 60／80／100% 得 1／2／3 星，新得到的星星送潮晶。第一次讀完單元筆記 +15 經驗。
   每日潮汐：每天 12 題（到期複習、弱點單元、新題），可以分次做完；做完記一次「今日航程」。
   激流衝刺：90 秒快問快答（基本、標準難度的單選），答對加時、連對加倍率，答錯扣 5 秒。
   燈塔首領戰：十隻知識海獸。答對造成傷害（越快越痛，前 30% 時間內暴擊），答錯或超時失去一顆心；半血以下狂暴，作答時間縮短 20%。
   紀錄：TA.S.units、daily、dailyDone、rush、boss。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { open, setKeys, confirmIn, notesIn, renderQ, keyText, keyIndex, showResult, runSet, openMistakes, subj, fmtT } from './hall.js';

const TA = window.TA, L = TA.L;
const touch = () => matchMedia('(pointer: coarse)').matches;
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
/** 第一次讀某單元的筆記：+15 經驗 */
function readNotes(host, u) {
  const rec = TA.S.units[u.id] = TA.S.units[u.id] || {};
  if (!rec.notes) { rec.notes = Date.now(); L.gain(15, 0); TA.Store.save(); ui.toast(`第一次讀「${u.name}」的筆記 +15 經驗`); }
  notesIn(host, u);
}

/* ---------- 航海圖 ---------- */
export function openChart(sid) {
  sid = sid || TA.SUBJECTS[0].id;
  const body = ui.el('div', 'hall vc');
  let cr = null;
  const paint = () => {
    if (cr) { cr.stop(); cr = null; }
    const s = subj(sid), st = L.subjectStats(sid), units = TA.DATA.units[sid] || [], b = TA.BOSSES[sid], win = (TA.S.boss[sid] || {}).wins || 0, mist = L.pickReview(9999, sid).length;
    const lit = units.filter(u => (TA.S.units[u.id] || {}).stars > 0).length;
    body.innerHTML = `<div class="vc-tabs">${TA.SUBJECTS.map(x => `<button type="button" data-s="${x.id}" class="${x.id === sid ? 'on' : ''}" style="--c:${x.color}">${x.name}</button>`).join('')}</div>
      <div class="hall-scroll">
        <div class="vc-hero" style="--c:${s.color}">
          <div class="vc-info"><div class="hr-kicker">${s.group} · ${units.length} 座燈塔（已點亮 ${lit}） · ${st.total} 題</div><h2>${s.name}</h2>
            <div class="hr-stats"><span>精熟 <b>${Math.round(st.mastery * 100)}%</b></span><span>已作答 <b>${st.seen}</b></span><span>正確率 <b>${st.attempts ? Math.round(st.acc * 100) + '%' : '—'}</b></span><span>已熟練 <b>${st.mastered}</b></span></div>
            <div class="vc-acts"><button type="button" class="btn" data-a="rand">隨機 10 題</button><button type="button" class="btn ghost" data-a="mis"${mist ? '' : ' disabled'}>錯題複習 ${mist}</button></div></div>
          <div class="vc-boss"><canvas></canvas><div><b>${b.name}</b><small>${b.en}</small><p>${b.lore}</p><span class="vc-pill">${win ? `已擊敗 ${win} 次` : '尚未擊敗'}</span><button type="button" class="btn danger" data-a="boss">挑戰首領</button></div></div>
        </div>
        <div class="hs-label">單元燈塔（先讀筆記，再打試煉；正確率 60／80／100% 得 1／2／3 星）</div>
        <div class="vc-path">${units.map((u, i) => { const us = L.unitStats(u.id), rec = TA.S.units[u.id] || {}; return `<div class="vc-unit${rec.stars ? ' lit' : ''}" style="--c:${s.color}"><i>${i + 1}</i><div class="vc-um"><div><b>${ui.esc(u.name)}</b><span class="vc-stars">${stars(rec.stars || 0)}</span></div><small>${us.total} 題 · 已作答 ${us.seen} · 精熟 ${Math.round(us.mastery * 100)}%${rec.best ? ` · 最佳 ${rec.best}%` : ''}</small><span class="vc-bar" style="--k:${us.mastery.toFixed(3)}"></span></div><button type="button" class="btn ghost sm${rec.notes ? '' : ' glow'}" data-n="${u.id}">筆記</button><button type="button" class="btn sm" data-t="${u.id}">試煉</button></div>`; }).join('')}</div>
      </div>`;
    body.querySelectorAll('[data-s]').forEach(x => { x.onclick = () => { sid = x.dataset.s; Audio.sfx('tick'); paint(); }; });
    body.querySelector('[data-a="rand"]').onclick = () => runSet(`${s.name} · 隨機 10 題`, L.pickSubject(sid, 10), { again: () => openChart(sid) });
    body.querySelector('[data-a="mis"]').onclick = () => openMistakes(sid);
    body.querySelector('[data-a="boss"]').onclick = () => openBoss(sid);
    body.querySelectorAll('[data-n]').forEach(x => { x.onclick = () => readNotes(body, L.UNITS[x.dataset.n]); });
    body.querySelectorAll('[data-t]').forEach(x => { x.onclick = () => runUnit(x.dataset.t); });
    const tab = body.querySelector('.vc-tabs .on'); if (tab) tab.scrollIntoView({ block: 'nearest', inline: 'center' });
    const cv = body.querySelector('.vc-boss canvas');
    if (cv && TA.Creature && body.isConnected) { cr = new TA.Creature(cv, sid, { small: true }); cr.start(); }
  };
  open('航海圖', body, { onClose: () => { if (cr) cr.stop(); } });
  paint();
}

/* ---------- 單元試煉 ---------- */
export function runUnit(uid) {
  const u = L.UNITS[uid]; if (!u) return;
  runSet(`${u.name} · 單元試煉`, L.pickUnit(uid, 10), {
    mode: 'unit', again: () => runUnit(uid),
    finish: r => {
      const acc = r.total ? r.correct / r.total : 0, st = acc >= 1 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0;
      const rec = TA.S.units[uid] = TA.S.units[uid] || {}, gained = Math.max(0, st - (rec.stars || 0));
      rec.stars = Math.max(rec.stars || 0, st); rec.best = Math.max(rec.best || 0, Math.round(acc * 100));
      r.gems = gained * 8 + (gained && st === 3 ? 15 : 0);
      r.kicker = 'UNIT TRIAL'; r.heading = st ? ['', '燈塔點亮', '燈塔明亮', '燈塔閃耀'][st] : '還差一點';
      r.sub = `${u.name} · 正確率 ${Math.round(acc * 100)}%${st ? '' : '（60% 以上得一星）'}${gained ? ` · 新得 ${gained} 顆星` : ''}`;
      r.bigHtml = `<div class="vc-bigstars">${[1, 2, 3].map(k => `<span class="${k <= st ? 'on' : ''}">★</span>`).join('')}</div>`;
    },
  });
}

/* ---------- 每日潮汐 ---------- */
export function openDaily() {
  const ids = L.pickDaily(), D = TA.S.daily, replay = !!D.done;
  runSet('每日潮汐', ids, {
    mode: 'daily', from: replay ? 0 : D.idx || 0,
    onAnswer: i => { if (replay) return; D.idx = i + 1; if (D.idx >= ids.length) D.done = true; TA.Store.save(); },
    finish: r => {
      r.kicker = 'DAILY TIDE'; r.gems = 0;
      if (!replay && D.done && !D.claimed) { D.claimed = true; TA.S.dailyDone = (TA.S.dailyDone || 0) + 1; r.gems = 20; r.xp += L.gain(60, 0).xp; }
      r.heading = D.done ? '今日潮汐完成' : '已保存進度';
      r.sub = D.done ? (replay ? `再練一次：答對 ${r.correct} / ${r.total}` : `答對 ${r.correct} / ${r.total} · 完成今天的 12 題（累計 ${TA.S.dailyDone} 天）`) : `答對 ${r.correct} / ${r.total} · 已做到第 ${D.idx} / ${ids.length} 題，下次接著做`;
    },
  });
}

/* ---------- 激流衝刺 ---------- */
export function openRush() {
  let sid = '';
  const body = ui.el('div', 'hall hs');
  const paint = () => {
    body.innerHTML = `<div class="hall-scroll">
      <div class="vr-rules"><div><b>90</b><small>秒起始時間</small></div><div><b>+1.5</b><small>秒／答對</small></div><div><b>−5</b><small>秒／答錯</small></div><div><b>×4</b><small>最高倍率</small></div></div>
      <p class="hs-lead">只出基本、標準難度的單選題，考驗反應與熟練度。連續答對 3 題倍率提高一級；答錯的題目結束後都能看解析，並排入錯題本。</p>
      <div class="hs-label">選擇海域</div><div class="hs-grid g6"><button type="button" class="hs-pick${sid ? '' : ' on'}" data-s=""><b>全科</b><small>十科混合</small></button>${TA.SUBJECTS.map(s => `<button type="button" class="hs-pick${sid === s.id ? ' on' : ''}" data-s="${s.id}" style="--c:${s.color}"><b>${s.name}</b><small>${(L.BY_SUBJECT[s.id] || []).length} 題</small></button>`).join('')}</div>
    </div><div class="hx-foot"><span class="muted">個人最佳 ${(TA.S.rush.best || 0).toLocaleString()} 分</span><span class="spacer"></span><button type="button" class="btn go">開始衝刺</button></div>`;
    body.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { sid = b.dataset.s; Audio.sfx('tick'); paint(); }; });
    body.querySelector('.go').onclick = () => runRush(sid || null);
  };
  paint();
  open('激流衝刺', body);
  setKeys(e => { if (e.code === 'Enter') { runRush(sid || null); return true; } return false; });
}
function runRush(sid) {
  const feed = L.rushFeed(sid), log = [], t0 = Date.now();
  let score = 0, combo = 0, xp = 0, correct = 0, left = 90, last = performance.now(), cur = null, view = null, locked = false, done = false, clock = 0;
  const body = ui.el('div', 'hall hx vr');
  body.innerHTML = `<div class="vr-hud"><div class="vr-score"><b>0</b><small>分</small></div><div class="vr-mult">×1</div><div class="vr-time"><i></i><span>90</span></div></div><div class="hall-scroll hx-main"></div>`;
  const main = body.querySelector('.hx-main'), sEl = body.querySelector('.vr-score b'), mEl = body.querySelector('.vr-mult'), bar = body.querySelector('.vr-time i'), tEl = body.querySelector('.vr-time span');
  const mult = () => 1 + Math.min(6, Math.floor(combo / 3)) * 0.5;
  const next = () => {
    if (done) return;
    const id = feed(); cur = L.view(L.Q[id]); locked = false;
    view = renderQ(cur, { no: `#${log.length + 1}`, onPick: k => answer(k) });
    main.innerHTML = ''; main.appendChild(view.el); main.scrollTop = 0;
  };
  const answer = k => {
    if (locked || done) return; locked = true;
    const ok = L.check(cur, k);
    combo = ok ? combo + 1 : 0; if (ok) correct++;
    xp += L.record(cur, ok, { combo }).xp;
    log.push({ id: cur.id, v: cur, ans: k, ok, score: ok ? 1 : 0 });
    if (ok) { const g = Math.round(100 * mult() * (cur.d === 2 ? 1.2 : 1)); score += g; left = Math.min(99, left + 1.5); Audio.sfx('ok'); }
    else { left = Math.max(0, left - 5); Audio.sfx('bad'); }
    sEl.textContent = score.toLocaleString(); mEl.textContent = '×' + mult(); body.classList.toggle('hot', combo >= 6);
    view.mark(ok, k);
    setTimeout(next, ok ? 420 : 1300);
  };
  const end = () => {
    if (done) return; done = true; clearInterval(clock);
    const R = TA.S.rush, prev = R.best || 0, newBest = score > prev;
    R.best = Math.max(prev, score); R.runs = (R.runs || 0) + 1;
    const gems = Math.floor(score / 150); if (gems) L.gain(0, gems);
    L.checkAch(); TA.Store.save();
    showResult({ mode: 'rush', title: '激流衝刺', total: log.length, correct, log, xp, gems, secs: Math.round((Date.now() - t0) / 1000), onlyWrong: true, again: () => runRush(sid),
      kicker: newBest ? 'NEW RECORD' : 'RUSH', heading: `${score.toLocaleString()} 分`, sub: newBest ? '刷新個人最佳紀錄！' : `個人最佳 ${prev.toLocaleString()} 分 · 答對 ${correct} / ${log.length} 題`,
      bigHtml: `<div class="vr-big"><b>${score.toLocaleString()}</b><small>分</small></div>` });
  };
  const tick = () => {
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    if (done) return;
    left = Math.max(0, left - dt); bar.style.width = Math.min(100, left / 90 * 100) + '%'; tEl.textContent = Math.ceil(left); body.classList.toggle('warn', left < 10);
    if (left <= 0) end();
  };
  const guard = () => done ? Promise.resolve(true) : confirmIn(body, '結束衝刺？', '現在離開不會記錄分數（已答的題目照樣記進學習紀錄）。', '離開');
  open('激流衝刺', body, { guard, onClose: () => { done = true; clearInterval(clock); } });
  setKeys(e => { const k = keyIndex(e); if (k >= 0 && cur && cur.o && k < cur.o.length) { answer(k); return true; } return false; });
  next(); clock = setInterval(tick, 100);
}

/* ---------- 燈塔首領戰 ---------- */
const BASE_T = { math: 80, physics: 65, chemistry: 65, english: 45, chinese: 45 };
const timeFor = (q, rage) => Math.round(((BASE_T[q.subject] || 40) + (q.d === 3 ? 15 : 0) + (q.passage ? 35 : 0) + (q.type === 'multi' ? 15 : q.type === 'fill' ? 40 : 0)) * (rage ? 0.8 : 1));
const heartsMax = () => 3 + (L.streakAlive() >= 7 ? 1 : 0);
/** 首領介紹：海獸、規則與紀錄 */
export function openBoss(sid) {
  const s = subj(sid), b = TA.BOSSES[sid], rec = TA.S.boss[sid], st = L.subjectStats(sid), body = ui.el('div', 'hall vb-intro');
  body.innerHTML = `<div class="hall-scroll"><div class="vb-stage small" style="--c:${s.color}"><canvas></canvas></div>
    <div class="hr-kicker">BOSS · ${b.en}</div><h2>${b.name}</h2><p>${b.lore}</p>
    <ul class="vb-rules"><li>⚔️ 答對造成傷害：越快越痛，前 30% 時間內作答會暴擊</li><li>❤️ 你有 ${heartsMax()} 顆心${heartsMax() > 3 ? '（連續學習 7 天以上 +1）' : ''}；答錯或超時失去一顆</li><li>⚡ 首領血量低於一半會狂暴：作答時間縮短 20%</li><li>💎 勝利獎勵 40 潮晶${rec && rec.wins ? '' : '（首勝再 +60）'}</li></ul>
    <p class="muted">${s.name}精熟 ${Math.round(st.mastery * 100)}%${rec && rec.best ? ` · 最快 ${fmtT(rec.best)}` : ''}${rec && rec.wins ? ` · 已擊敗 ${rec.wins} 次` : ''} · 進階題為主</p></div>
    <div class="hx-foot"><button type="button" class="btn ghost prac">先去練習</button><span class="spacer"></span><button type="button" class="btn danger fight">開戰</button></div>`;
  let cr = null;
  open(`燈塔 · ${b.name}`, body, { onClose: () => { if (cr) cr.stop(); } });
  const cv = body.querySelector('canvas'); if (TA.Creature) { cr = new TA.Creature(cv, sid); cr.start(); }
  body.querySelector('.prac').onclick = () => openChart(sid);
  body.querySelector('.fight').onclick = () => runBoss(sid);
  setKeys(e => { if (e.code === 'Enter') { runBoss(sid); return true; } return false; });
}
function runBoss(sid) {
  const s = subj(sid), b = TA.BOSSES[sid], used = new Set(), t0 = Date.now(), log = [];
  let ids = L.pickBoss(sid, 18), i = 0, hp = 100, hearts = heartsMax(), maxH = hearts, rage = false, combo = 0, xp = 0, correct = 0;
  let cur = null, view = null, locked = false, done = false, closed = false, qClock = 0, qT0 = 0, qLimit = 40000, cr = null, sel = [], fillV = '';
  const body = ui.el('div', 'hall hx vb');
  body.innerHTML = `<div class="vb-stage" style="--c:${s.color}"><canvas></canvas>
      <div class="vb-hp"><b>${b.name}</b><div class="vb-bar"><i class="ghost"></i><i class="fill"></i></div><span class="vb-num">100</span></div>
      <div class="vb-hearts"></div><div class="vb-qt"><i></i><span></span></div></div>
    <div class="hall-scroll hx-main"></div><div class="hx-foot"><span class="muted hx-hint"></span><span class="spacer"></span><button type="button" class="btn act"></button></div>`;
  const main = body.querySelector('.hx-main'), act = body.querySelector('.act'), hint = body.querySelector('.hx-hint');
  const fill = body.querySelector('.vb-bar .fill'), ghost = body.querySelector('.vb-bar .ghost'), num = body.querySelector('.vb-num'), heartsEl = body.querySelector('.vb-hearts'), qt = body.querySelector('.vb-qt i'), qtS = body.querySelector('.vb-qt span'), stage = body.querySelector('.vb-stage');
  const paintHearts = () => { heartsEl.innerHTML = Array.from({ length: maxH }, (_, k) => `<span class="${k < hearts ? 'on' : ''}">❤</span>`).join(''); };
  const setHP = v => { const prev = hp; hp = Math.max(0, Math.min(100, v)); fill.style.width = hp + '%'; setTimeout(() => { ghost.style.width = hp + '%'; }, 450); num.textContent = Math.ceil(hp); if (prev > 50 && hp <= 50 && hp > 0 && !rage) { rage = true; if (cr) cr.rage = 1; stage.classList.add('rage'); ui.toast(`${b.name}狂暴化！作答時間縮短 20%，撐住！`); } };
  const paintAct = () => {
    if (locked) { act.textContent = '下一題 →'; act.disabled = false; hint.textContent = 'Enter 繼續'; return; }
    if (cur.type === 'multi') { act.textContent = '送出答案'; act.disabled = !sel.length; hint.textContent = '多選題：選好再送出'; return; }
    if (cur.type === 'fill') { act.textContent = '送出答案'; act.disabled = !fillV; hint.textContent = '選填題：輸入答案後送出'; return; }
    act.textContent = '選一個答案'; act.disabled = true; hint.textContent = '越快答對傷害越高';
  };
  const show = () => {
    if (done) return;
    if (i >= ids.length) { const more = L.pickBoss(sid, 18).filter(x => !used.has(x)); ids = ids.concat(more.length ? more : L.pickBoss(sid, 18)); }
    cur = L.view(L.Q[ids[i]]); used.add(cur.id); locked = false; sel = []; fillV = '';
    view = renderQ(cur, {
      no: `第 ${i + 1} 題`,
      onPick: k => { if (locked) return; if (cur.type === 'multi') { const at = sel.indexOf(k); if (at >= 0) sel.splice(at, 1); else sel.push(k); view.setPick(sel); Audio.sfx('tick'); paintAct(); } else answer(k); },
      onFill: v => { fillV = v; paintAct(); },
      onEnter: () => { if (!locked && fillV) answer(fillV); else if (locked) act.click(); },
    });
    main.innerHTML = ''; main.appendChild(view.el); main.scrollTop = 0; paintAct();
    if (view.input && !touch()) setTimeout(() => view.input.focus(), 30);
    qLimit = timeFor(cur, rage) * 1000; qT0 = Date.now(); clearInterval(qClock);
    qClock = setInterval(() => {
      if (body.querySelector('.hall-ov')) { qT0 += 100; return; }   // 確認框或筆記開著時暫停計時
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
      stage.dataset.pop = (fast ? '暴擊 ' : '') + '-' + dmg; stage.classList.remove('popping'); void stage.offsetWidth; stage.classList.add('popping');
    } else {
      if (cr) cr.attack(); Audio.sfx('bad'); hearts--; paintHearts(); setHP(hp + 6);
      stage.dataset.pop = timeout ? '時間到！' : '-❤'; stage.classList.remove('popping'); void stage.offsetWidth; stage.classList.add('popping');
    }
    const ex = ui.el('div', 'hq-ex' + (ok ? '' : ' bad'), `<b class="v">${ok ? '命中！' : timeout ? '時間到！' : score > 0 ? `部分正確（學測給分 ${score}）` : '被反擊了！'}${ok ? '' : ` 正解 ${keyText(cur)}`}</b><div>${ui.rich(cur.e || '')}</div>`);
    view.card.appendChild(ex);
    if (hp <= 0) { finish(true); return; }
    if (hearts <= 0) { finish(false); return; }
    paintAct();
  };
  const finish = won => {
    if (done) return; done = true; clearInterval(qClock);
    if (cr) { if (won) cr.die(); }
    const secs = Math.round((Date.now() - t0) / 1000);
    let gems = 5, first = false;
    if (won) {
      const rec = TA.S.boss[sid] = TA.S.boss[sid] || { wins: 0, best: 0 };
      first = !rec.wins; rec.wins++; rec.best = rec.best ? Math.min(rec.best, secs) : secs;
      gems = 40 + (first ? 60 : 0) + hearts * 5; xp += L.gain(120, 0).xp;
    }
    L.gain(0, gems); L.checkAch(); TA.Store.save();
    Audio.sfx(won ? 'catch' : 'bad');
    setTimeout(() => !closed && showResult({ mode: 'boss', title: `${b.name}`, total: log.length, correct, log, xp, gems, secs, again: () => runBoss(sid),
      kicker: won ? 'VICTORY' : 'DEFEATED', heading: won ? `擊敗 ${b.name}` : `${b.name}還沒倒下……`,
      sub: won ? (first ? '首次擊敗！這片海域重新亮起來了。' : `剩餘 ${hearts} 顆心 · 用時 ${fmtT(secs)}`) : `首領還剩 ${Math.ceil(hp)}% 血量。多練習${s.name}再回來挑戰吧！`,
      bigHtml: `<div class="vb-emblem${won ? ' won' : ''}">${won ? '🏆' : '🛡️'}</div>` }), won ? 1600 : 900);
  };
  act.onclick = () => { if (locked) { i++; show(); } else if (cur.type === 'multi' && sel.length) answer(sel.slice().sort((a, b) => a - b)); else if (cur.type === 'fill' && fillV) answer(fillV); };
  const guard = () => done ? Promise.resolve(true) : confirmIn(body, '從首領戰撤退？', '這場戰鬥不會留下勝負紀錄（已答的題目照樣記進學習紀錄）。', '撤退');
  open(`燈塔 · ${b.name}`, body, { guard, onClose: () => { done = true; closed = true; clearInterval(qClock); if (cr) cr.stop(); } });
  setKeys(e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return false;
    if (e.code === 'Enter' || e.code === 'Space') { act.click(); return true; }
    const k = keyIndex(e); if (k >= 0 && !locked && cur && cur.o && k < cur.o.length) { view.el.querySelectorAll('.hq-opt')[k].click(); return true; }
    return false;
  });
  paintHearts();
  const cv = body.querySelector('canvas'); if (TA.Creature) { cr = new TA.Creature(cv, sid); cr.start(); }
  show();
}
