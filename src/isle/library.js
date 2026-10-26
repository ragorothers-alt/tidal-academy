/* 潮汐小島 · 潮汐圖書館：館員陪你做「今天的複習」（和手機、夢境、潮靈同一份清單，L.reviewToday）、單字複習，並可翻閱錯題本與全部單元的潮汐筆記。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import { pick } from './quiz.js';
import { drill, picker } from './drill.js';
import * as words from './words.js';
import { openMistakes, reviewLine, reviewEmpty } from './hall.js';
import * as figs from './figs.js';

const TA = window.TA, L = TA.L;
export const LIB = () => Object.assign({ name: '書書', kind: 'panda', fur: '#f6f2ea', inner: '#ffffff', shirt: '#6a8fd0', pants: '#3a3040', acc: 'glasses', voice: 320, catch: '', greet: ['歡迎來到潮汐圖書館。'], mistakes: ['把答錯的題再練一次吧。'], due: ['今天有幾題到了複習時間。'], vocab: ['來複習單字吧。'], notes: ['想讀哪一單元的筆記？'], praise: ['很好！'], comfort: ['沒關係，再看一次解析。'], empty: ['目前沒有錯題，太棒了！'] }, I.LIBRARIAN || {});
export const sp = () => { const b = LIB(); return { name: b.name, color: '#6a8fd0', voice: b.voice }; };
export const room = () => I.LIBRARY || { wall: '', floor: '', items: [] };

export async function talk() {
  const b = LIB(), s = sp();
  await ui.say(s, pick(b.greet) + (b.catch && Math.random() < 0.5 ? b.catch : ''));
  for (;;) {
    const voc = L.vocabDue().length, rv = L.reviewToday();
    const opts = [];
    opts.push([`繼續今天的複習（${rv.left ? `還有 ${rv.left} 題${rv.done ? ` · 已複習 ${rv.done}` : ''}` : rv.done ? `完成了 ✔ ${rv.done} 題` : '沒有題目'}）`, 'rv']);
    opts.push([`單字複習（到期 ${voc} 個）`, 'voc']);
    opts.push(['翻閱錯題本（清單與詳解）', 'book'], ['每日單字謎', 'word'], ['翻閱單元筆記', 'notes'], ['再見', 'bye']);
    const i = await ui.ask(s, '今天想做什麼呢？', opts.map(o => o[0]));
    const k = opts[i] ? opts[i][1] : 'bye';
    if (k === 'word') { ui.closeDialog(); words.open(); return; }
    if (k === 'bye') { await ui.say(s, '慢慢來，明天見。'); return; }
    if (k === 'notes') { ui.closeDialog(); openNotes(); return; }
    if (k === 'book') { ui.closeDialog(); openMistakes(); return; }
    if (k === 'rv') {
      const ids = L.reviewNext(6); if (!ids.length) { await ui.say(s, reviewEmpty() + '。可以翻翻單元筆記，或去讀新單元。'); continue; }
      await ui.say(s, pick(ids.some(L.isMistake) ? b.mistakes : b.due));
      const before = L.mistakes().length, r = await drill(s, picker({ mode: 'ids', ids }), ids.length, { praise: b.praise });
      await result(s, r, before - L.mistakes().length);
      await ui.say(s, reviewLine() + '。');
    }
    if (k === 'voc') {
      await ui.say(s, pick(b.vocab));
      const r = await drill(s, picker({ mode: 'vocab' }), 10, { praise: b.praise });
      await result(s, r);
    }
  }
}
async function result(s, r, fixed) {
  const b = LIB(), bells = r.ok * 150; S().bells += bells; save();
  if (r.ok) Audio.sfx('coin');
  await ui.say(s, `答對 ${r.ok} / ${r.n} 題${fixed > 0 ? `，修好了 ${fixed} 道錯題` : ''}。${r.ok ? `館方贊助 ${bells} 鈴錢！` : pick(b.comfort)}`);
}

/* ---------- 單元筆記 ---------- */
export function openNotes(sid, unitId) {
  sid = sid || TA.SUBJECTS[0].id;
  const body = ui.el('div', 'notes');
  const tabs = ui.el('div', 'dex-tabs'), list = ui.el('div', 'notes-units'), view = ui.el('div', 'notes-view');
  const paintTabs = () => { tabs.innerHTML = ''; TA.SUBJECTS.forEach(x => { const b = ui.el('button', 'dex-tab' + (x.id === sid ? ' on' : ''), x.name); b.type = 'button'; b.onclick = () => { sid = x.id; paintTabs(); paintUnits(); }; tabs.appendChild(b); }); ui.showTab(tabs); };
  const paintUnits = () => {
    list.innerHTML = ''; view.innerHTML = '<p class="muted">選一個單元。錯題多的單元會標紅點。</p>';
    (TA.DATA.units[sid] || []).forEach(u => {
      const mis = (L.BY_UNIT[u.id] || []).filter(id => L.isMistake(id)).length;
      const b = ui.el('button', 'unit-btn' + (mis ? ' hot' : ''), `${ui.esc(u.name)}${mis ? `<i>${mis}</i>` : ''}`); b.type = 'button';
      b.onclick = () => { [...list.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); view.innerHTML = (u.notes || []).map(n => `<div class="letter-note"><b>${ui.rich(n.t)}</b><div>${ui.rich(n.b)}</div></div>`).join('') || '<p class="muted">這個單元還沒有筆記。</p>'; view.scrollTop = 0; Audio.sfx('pop');
        const fs = figs.forUnit(u.id);   // 這個單元的互動示意圖：列在筆記上面，關掉後回到這一頁
        if (fs.length) { const row = ui.el('div', 'fig-links'); fs.forEach(f => { const fb = ui.el('button', 'btn', '📐 ' + ui.esc(f.title)); fb.type = 'button'; fb.onclick = () => figs.open(f, () => setTimeout(() => openNotes(sid, u.id), 0)); row.appendChild(fb); }); view.prepend(row); } };
      list.appendChild(b);
    });
  };
  paintTabs(); paintUnits();
  if (unitId) { const i = (TA.DATA.units[sid] || []).findIndex(u => u.id === unitId); if (i >= 0 && list.children[i]) list.children[i].click(); }   // 答錯後直接翻到那個單元
  body.append(tabs, list, view);
  ui.panel('潮汐筆記（' + Object.values(TA.DATA.units).reduce((a, us) => a + us.reduce((b, u) => b + (u.notes || []).length, 0), 0) + ' 則）', body, { cls: 'notes-p' });
}
