/* 潮汐小島 · 單字燈塔：翻卡間隔複習（不熟／模糊／熟悉）、選義快答、例句填空、中翻英、字表與發音。
   紀錄寫進 TA.S.voc，和釣魚、海風電台、單字謎是同一份單字複習；到期的字會優先出現。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as hall from './hall.js';
import { speak } from './radio.js';
import { LEVELS, LV_COLORS, KINDS, buildQuiz, deck, levelStats, mark } from './lexq.js';

const TA = window.TA, L = TA.L, U = TA.U;
const QN = 15, FN = 20, LET = 'ABCD';
const ICON = ((TA.ISLE || {}).APPICONS || {})['🃏'];   // 手機 App 的單字卡圖示（emoji 在 Windows 會變成撲克牌鬼牌）
const lvName = l => l ? 'Level ' + l : '全部級數';
const canTalk = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
const say = w => { if (!speak(w, 0.85)) ui.toast('這台裝置沒有英文語音，無法發音'); };
const chips = lv => [0, ...LEVELS].map(l => `<button type="button" data-lv="${l}" class="${l === lv ? 'on' : ''}" style="--c:${LV_COLORS[l] || '#3aa88f'}">${lvName(l)}</button>`).join('');

/** 單字燈塔首頁：總覽、級數篩選、四種練習、各級進度 */
export function open() {
  const S = TA.S; let lv = LEVELS.includes(S.vocLv) ? S.vocLv : 0;
  const body = ui.el('div', 'hall lx');
  const paint = () => {
    const all = levelStats(L.VOCAB, S.voc, 0, L.MASTER_BOX), cur = levelStats(L.VOCAB, S.voc, lv, L.MASTER_BOX);
    const dueAll = L.vocabDue(), due = dueAll.filter(v => !lv || v.lv === lv).length, today = L.dayRec().voc;
    body.innerHTML = `<div class="hall-scroll">
      <div class="lx-sum"><div><b>${all.m}</b><small>熟練</small></div><div><b>${all.learning}</b><small>學習中</small></div><div><b>${dueAll.length}</b><small>今日到期</small></div><div><b>${all.total}</b><small>總字數</small></div></div>
      <div class="hm-chips lx-lv">${chips(lv)}</div>
      <button type="button" class="lx-main" data-m="flash"><i>${ICON ? `<img src="${ICON}" alt="">` : '🃏'}</i><div><b>翻卡學習</b><small>今天已翻 ${today} 張 · ${lvName(lv)}到期 ${due} 張、新字 ${cur.fresh} 個</small></div><span>開始 →</span></button>
      <div class="hs-grid lx-modes">
        <button type="button" class="hs-pick" data-m="meaning"><b>選義快答</b><small>看英文選中文</small></button>
        <button type="button" class="hs-pick" data-m="cloze"><b>例句填空</b><small>學測詞彙題手感</small></button>
        <button type="button" class="hs-pick" data-m="reverse"><b>中翻英</b><small>看中文選單字</small></button>
        <button type="button" class="hs-pick" data-m="list"><b>字表瀏覽</b><small>搜尋、發音、熟練度</small></button>
      </div>
      <div class="hs-label">級數進度　大考中心參考詞彙分級 · 熟練＝連續答對到第 ${L.MASTER_BOX} 格</div>
      <div class="lx-levels">${LEVELS.map(l => { const st = levelStats(L.VOCAB, S.voc, l, L.MASTER_BOX), k = st.total ? st.m / st.total : 0; return `<button type="button" class="lx-lvc${l === lv ? ' on' : ''}" data-lv="${l}" style="--c:${LV_COLORS[l]};--k:${k.toFixed(3)}"><b>Level ${l}</b><span class="lx-ring"><em>${Math.round(k * 100)}%</em></span><small>熟練 ${st.m} · 學習中 ${st.learning}</small><small>未學 ${st.fresh} · 共 ${st.total} 字</small></button>`; }).join('')}</div>
      <p class="muted lx-note">翻卡時「不熟」的字這一輪最後會再出現一次；「模糊」明天再複習；「熟悉」照間隔排程往後延。釣魚、海風電台、單字謎也用同一份紀錄。</p>
    </div>`;
    body.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { lv = +b.dataset.lv; S.vocLv = lv; TA.Store.save(); Audio.sfx('tick'); paint(); });
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const m = b.dataset.m; Audio.sfx('pop'); if (m === 'flash') flash(lv); else if (m === 'list') wordlist(lv); else quiz(m, lv); });
  };
  paint();
  hall.open('單字燈塔', body);
  hall.setKeys(e => { if (e.code === 'Enter' || e.code === 'Space') { flash(lv); return true; } return false; });
}

/* ---------- 翻卡 ---------- */
/** 翻卡學習：到期的字優先，再補新字（由低級數往上） */
export function flash(lv, n) {
  const S = TA.S;
  const cards = deck(lv || 0, n || FN, L.vocabDue(), L.vocabNew(lv || null), Math.random, U.rng(U.dayKey() + 'voc'));
  const body = ui.el('div', 'hall lx-flash');
  if (!cards.length) {
    body.innerHTML = `<div class="hall-scroll"><p class="hm-empty">${lvName(lv)}的單字今天都複習完了！換個級數，或明天再來。</p></div><div class="hx-foot"><span class="spacer"></span><button type="button" class="btn">回單字燈塔</button></div>`;
    body.querySelector('.btn').onclick = () => open();
    hall.open('翻卡學習', body); hall.setKeys(e => { if (e.code === 'Enter' || e.code === 'Space') { open(); return true; } return false; });
    return;
  }
  const res = [0, 0, 0], seen = [], again = new Set();
  let i = 0, flipped = false, xp = 0;
  body.innerHTML = `<div class="hx-bar"><b class="hx-title">翻卡學習 · ${lvName(lv)}</b><span class="hx-prog"></span></div>
    <div class="lx-stage"><div class="lx-card" role="button" tabindex="0" aria-label="翻面"></div></div>
    <div class="lx-grades"><button type="button" class="lx-g g0" data-g="0"><b>不熟</b><kbd>1</kbd></button><button type="button" class="lx-g g1" data-g="1"><b>模糊</b><kbd>2</kbd></button><button type="button" class="lx-g g2" data-g="2"><b>熟悉</b><kbd>3</kbd></button></div>
    <div class="hx-foot"><span class="muted lx-hint">${matchMedia('(pointer: coarse)').matches ? '點卡片翻面，再選熟悉程度' : `點卡片或按空白鍵翻面，1–3 評分${canTalk() ? ' · S 發音' : ''}`}</span><span class="spacer"></span><button type="button" class="btn ghost end">結束翻卡</button></div>`;
  const card = body.querySelector('.lx-card'), grades = body.querySelector('.lx-grades'), prog = body.querySelector('.hx-prog');
  const paint = () => {
    const v = cards[i], r = S.voc[v.w];
    flipped = false; card.classList.remove('flipped'); grades.classList.remove('show');
    const state = !r ? '<span class="lx-st new">NEW</span>' : r.s >= L.MASTER_BOX ? '<span class="lx-st">熟練</span>' : '<span class="lx-st">複習</span>';
    card.innerHTML = `<span class="lx-face front"><em class="lx-tag" style="--c:${LV_COLORS[v.lv] || '#3aa88f'}">L${v.lv}</em>${state}<b class="lx-word">${ui.esc(v.w)}</b><i class="lx-pos">${ui.esc(v.pos || '')}</i>${canTalk() ? '<span class="lx-say" role="button" tabindex="-1" aria-label="發音">🔊</span>' : ''}<small>翻面看意思</small></span>
      <span class="lx-face back"><b class="lx-word sm">${ui.esc(v.w)} <i class="lx-pos">${ui.esc(v.pos || '')}</i></b><span class="lx-zh">${ui.esc(v.zh || '')}</span>${v.ex ? `<span class="lx-ex">${ui.rich(mark(v))}</span>` : ''}${v.exZh ? `<small class="lx-exzh">${ui.esc(v.exZh)}</small>` : ''}</span>`;
    const sp = card.querySelector('.lx-say'); if (sp) sp.onclick = e => { e.stopPropagation(); say(v.w); };
    prog.textContent = `${i + 1} / ${cards.length}`;
    card.animate && card.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  };
  const flip = () => { flipped = !flipped; card.classList.toggle('flipped', flipped); grades.classList.toggle('show', flipped); Audio.sfx('tick'); };
  const grade = g => {
    if (!flipped) { flip(); return; }
    const v = cards[i];
    L.recordVocab(v.w, g === 2 ? true : g === 1 ? 'soft' : false);
    res[g]++; xp += g ? 4 : 1; seen.push([v, g]);
    Audio.sfx(g === 2 ? 'ok' : g === 1 ? 'pop' : 'bad');
    if (g === 0 && !again.has(v.w)) { again.add(v.w); cards.push(v); }   // 不熟的字這一輪最後再出現一次
    i++;
    if (i >= cards.length) done(); else paint();
  };
  const done = () => {
    const n = res[0] + res[1] + res[2];
    if (!n) { open(); return; }
    L.touchStreak(); L.checkAch(); TA.Store.save();
    const out = ui.el('div', 'hall hr');
    out.innerHTML = `<div class="hall-scroll"><div class="hr-hero"><div class="lx-big">${ICON ? `<img src="${ICON}" alt="">` : '🃏'}</div><div><div class="hr-kicker">FLASHCARDS</div><h2>翻卡完成</h2><p class="muted">熟悉 ${res[2]} · 模糊 ${res[1]} · 不熟 ${res[0]}（共翻 ${n} 次）</p><div class="hr-stats"><span>經驗 <b>+${xp}</b></span><span>今天已翻 <b>${L.dayRec().voc}</b> 張</span></div></div></div>
      <div class="hs-label">這一輪的單字</div><div class="lx-recap">${seen.map(([v, g]) => `<span class="g${g}"><b>${ui.esc(v.w)}</b>${ui.esc(v.zh || '')}</span>`).join('')}</div></div>
      <div class="hx-foot"><button type="button" class="btn ghost hub">回單字燈塔</button><span class="spacer"></span><button type="button" class="btn ghost more">再翻 ${FN} 張</button><button type="button" class="btn ok">完成</button></div>`;
    out.querySelector('.hub').onclick = () => open();
    out.querySelector('.more').onclick = () => flash(lv);
    out.querySelector('.ok').onclick = () => ui.closePanel();
    hall.open('翻卡學習 · 結果', out); Audio.sfx(res[2] >= n * 0.7 ? 'catch' : 'coin');
    hall.setKeys(e => { if (e.code === 'Enter' || e.code === 'Space') { ui.closePanel(); return true; } return false; });
  };
  card.onclick = () => flip();
  grades.querySelectorAll('[data-g]').forEach(b => b.onclick = () => grade(+b.dataset.g));
  body.querySelector('.end').onclick = () => done();
  hall.open('翻卡學習', body, { onClose: () => { if (seen.length) { L.touchStreak(); L.checkAch(); TA.Store.save(); } } });
  hall.setKeys(e => {
    if (e.code === 'Space' || e.code === 'Enter') { if (!flipped) flip(); else grade(2); return true; }
    if (/^(Digit|Numpad)[123]$/.test(e.code)) { grade(+e.code.slice(-1) - 1); return true; }
    if (e.code === 'KeyS' && canTalk()) { say(cards[i].w); return true; }
    return false;
  });
  paint();
}

/* ---------- 單字測驗 ---------- */
/** 15 題：已經學過 12 個字以上就考學過的字，否則考整個級數 */
export function quiz(kind, lv) {
  const pool = L.VOCAB.filter(v => !lv || v.lv === lv), learned = pool.filter(v => TA.S.voc[v.w]);
  const items = buildQuiz(kind, learned.length >= 12 ? learned : pool, QN, L.VOCAB, Math.random);
  if (!items.length) { ui.toast('這個級數沒有單字'); return; }
  run(items, `${KINDS[kind] || '單字測驗'} · ${lvName(lv)}`, () => quiz(kind, lv));
}
function run(items, title, again) {
  const t0 = Date.now(), log = [];
  let i = 0, locked = false, correct = 0, xp = 0, view = null;
  const body = ui.el('div', 'hall hx lx-quiz');
  body.innerHTML = `<div class="hx-bar"><b class="hx-title">${ui.esc(title)}</b><span class="hx-prog"></span></div><div class="hall-scroll hx-main"></div><div class="hx-foot"><span class="muted hx-hint"></span><button type="button" class="btn act"></button></div>`;
  const main = body.querySelector('.hx-main'), act = body.querySelector('.act'), hint = body.querySelector('.hx-hint'), prog = body.querySelector('.hx-prog');
  const show = () => {
    locked = false; const q = items[i];
    prog.textContent = `${i + 1} / ${items.length}`;
    view = hall.renderQ(q, { no: `${i + 1} / ${items.length}`, onPick: k => answer(k) });
    main.innerHTML = ''; main.appendChild(view.el); main.scrollTop = 0;
    act.textContent = '選一個答案'; act.disabled = true; hint.textContent = '按 1–4（或 A–D）作答';
  };
  const answer = k => {
    if (locked) return; locked = true;
    const q = items[i], ok = k === q.a;
    if (ok) correct++;
    L.recordVocab(q.word, ok); xp += ok ? 4 : 1;
    log.push({ id: q.id, v: q, ans: k, ok });
    Audio.sfx(ok ? 'ok' : 'bad'); view.mark(ok, k);
    const ex = ui.el('div', 'hq-ex' + (ok ? '' : ' bad'), `<b class="v">${ok ? '答對了！' : `答錯了　正解 ${LET[q.a]}`}</b><div>${ui.rich(q.e)}</div>${canTalk() ? '<button type="button" class="btn ghost sm say">🔊 發音</button>' : ''}`);
    const sb = ex.querySelector('.say'); if (sb) sb.onclick = () => say(q.word);
    view.card.appendChild(ex); ex.scrollIntoView({ block: 'nearest' });
    act.textContent = i + 1 < items.length ? '下一題 →' : '看結果'; act.disabled = false; hint.textContent = `Enter 繼續${canTalk() ? ' · S 發音' : ''}`;
  };
  const next = () => { if (i + 1 < items.length) { i++; show(); } else finish(); };
  const finish = () => {
    const gems = Math.round(correct / 2);
    if (gems) L.gain(0, gems);
    L.touchStreak(); L.checkAch(); TA.Store.save();
    hall.showResult({ mode: 'set', title, kicker: 'VOCABULARY', total: log.length, correct, pct: Math.round(correct / Math.max(1, log.length) * 100), secs: Math.round((Date.now() - t0) / 1000), log, xp, gems, again });
  };
  act.onclick = () => { if (locked) next(); };
  hall.open(title, body, { onClose: () => { if (log.length && log.length < items.length) { L.touchStreak(); L.checkAch(); TA.Store.save(); } } });
  hall.setKeys(e => {
    if (e.code === 'Enter' || e.code === 'Space') { act.click(); return true; }
    if (e.code === 'KeyS' && locked && canTalk()) { say(items[i].word); return true; }
    const k = hall.keyIndex(e); if (k >= 0 && k < 4 && !locked) { view.el.querySelectorAll('.hq-opt')[k].click(); return true; }
    return false;
  });
  show();
}

/* ---------- 字表 ---------- */
/** 字表：搜尋英文或中文、看例句、發音、熟練度（4 格） */
export function wordlist(lv) {
  const S = TA.S; let cur = lv || 0;
  const body = ui.el('div', 'hall lx-list');
  body.innerHTML = `<div class="lx-tools"><input type="search" class="lx-q" placeholder="搜尋單字或中文…" aria-label="搜尋單字"><div class="hm-chips">${chips(cur)}</div></div><div class="hall-scroll lx-items"></div><div class="hx-foot"><span class="muted lx-count"></span><span class="spacer"></span><button type="button" class="btn ghost hub">回單字燈塔</button></div>`;
  const input = body.querySelector('.lx-q'), list = body.querySelector('.lx-items'), count = body.querySelector('.lx-count');
  const paint = () => {
    const qy = input.value.trim().toLowerCase();
    const all = L.VOCAB.filter(v => (!cur || v.lv === cur) && (!qy || v.w.toLowerCase().includes(qy) || (v.zh || '').includes(qy)));
    const items = all.slice(0, 200);
    list.innerHTML = items.map((v, k) => { const r = S.voc[v.w], s = r ? r.s : 0; return `<details class="lx-it" data-k="${k}"><summary><b>${ui.esc(v.w)}</b><i>${ui.esc(v.pos || '')}</i><span class="lx-zh2">${ui.esc(v.zh || '')}</span><em style="--c:${LV_COLORS[v.lv] || '#3aa88f'}">L${v.lv}</em><span class="lx-dots" title="${r ? `答過 ${r.n} 次` : '還沒學過'}">${[0, 1, 2, 3].map(j => `<i class="${s > j ? 'on' : ''}"></i>`).join('')}</span></summary><div class="lx-body">${v.ex ? `<p>${ui.rich(mark(v))}</p>` : ''}${v.exZh ? `<small class="muted">${ui.esc(v.exZh)}</small>` : ''}${canTalk() ? '<button type="button" class="btn ghost sm say">🔊 發音</button>' : ''}</div></details>`; }).join('') || '<p class="hm-empty muted">找不到符合的單字</p>';
    list.querySelectorAll('.say').forEach(b => { const v = items[+b.closest('[data-k]').dataset.k]; b.onclick = () => say(v.w); });
    count.textContent = all.length > items.length ? `符合 ${all.length} 個，先列出前 ${items.length} 個` : `共 ${all.length} 個`;
  };
  input.addEventListener('input', paint);
  body.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { cur = +b.dataset.lv; body.querySelectorAll('[data-lv]').forEach(x => x.classList.toggle('on', x === b)); Audio.sfx('tick'); paint(); });
  body.querySelector('.hub').onclick = () => open();
  paint();
  hall.open('字表', body);
  if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => input.focus(), 30);
}
