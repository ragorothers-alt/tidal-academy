/* 潮汐小島 · 非選練習（v7.0）：中譯英、英文作文、國寫、數學非選、社會與自然混合題的非選部分。
   在面板裡寫答案（字數統計、計時、草稿自動保留），寫完對照參考答案，依評分要點逐項自評；
   分數記進學習進度（learn.js 的 recordWritten：折算題數算進每日目標與連續學習，自評未達八成會排回來複習）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as hall from './hall.js';

const TA = window.TA, L = TA.L;
const SOC = ['history', 'geography', 'civics'], SCI = ['physics', 'chemistry', 'biology', 'earth'];
/** 分類：名稱、圖示、科目顏色、建議作答時間（分鐘）、字數統計方式 */
const TABS = [
  { id: 'en-trans', name: '中譯英', icon: '🔤', c: '#5ab0e0', min: 4, count: 'words', test: w => w.kind === 'en-trans', lead: '學測翻譯一句 4 分：句意完整、句型與時態正確、用字恰當。先寫出主要結構，再補上細節。' },
  { id: 'en-essay', name: '英文作文', icon: '✍️', c: '#4a90d9', min: 35, count: 'words', test: w => w.kind === 'en-essay', lead: '學測作文 20 分：內容 5、組織 5、文法句構 4、字彙拼字 4、體例 2。建議 120 字以上，兩段都要回應題目的要求。' },
  { id: 'zh-essay', name: '國寫', icon: '🖋️', c: '#e0875a', min: 45, count: 'chars', test: w => w.kind === 'zh-essay', lead: '國寫每大題 25 分：(一) 依材料作答、(二) 長文寫作。先讀懂材料、抓住題旨，再組織段落。' },
  { id: 'math-open', name: '數學非選', icon: '📐', c: '#7a6fd0', min: 12, count: 'chars', test: w => w.kind === 'math-open', lead: '非選題看過程給分：寫出關鍵式子、每一步的理由，最後清楚寫出答案。' },
  { id: 'soc', name: '社會簡答', icon: '🏛️', c: '#c9a227', min: 4, count: 'chars', test: w => w.kind === 'short' && SOC.includes(w.sid), lead: '混合題的非選部分：根據材料作答，寫出關鍵概念與證據，不必長篇大論。' },
  { id: 'sci', name: '自然簡答', icon: '🔬', c: '#3fae7a', min: 5, count: 'chars', test: w => w.kind === 'short' && SCI.includes(w.sid), lead: '混合題的非選部分：計算寫出過程與單位，說明題寫出原因與依據。' }
];
const tabOf = w => TABS.find(t => t.test(w)) || TABS[0];
const DKEY = 'tidal-written-draft';   // 草稿：只存在這台裝置（不放進存檔，存檔不會越來越大）
const drafts = (() => { try { return JSON.parse(localStorage.getItem(DKEY) || '{}') || {}; } catch (e) { return {}; } })();
const saveDrafts = () => { try { localStorage.setItem(DKEY, JSON.stringify(drafts)); } catch (e) { /* 空間不足就算了 */ } };
const countOf = (s, how) => how === 'words' ? (String(s).match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length : String(s).replace(/\s/g, '').length;
const fmtMin = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** 下一題：到期的先、沒寫過的次之、最後是自評最低的 */
function pickNext(list) {
  const due = list.filter(w => L.wrDue(w)).sort((a, b) => L.wrRec(a.id).due - L.wrRec(b.id).due);
  if (due.length) return due[0];
  const fresh = list.filter(w => !L.wrRec(w.id));
  if (fresh.length) { const lv = Math.min(...fresh.map(w => w.d)); const easy = fresh.filter(w => w.d === lv); return easy[Math.floor(Math.random() * easy.length)]; }
  return list.slice().sort((a, b) => L.wrRec(a.id).sc - L.wrRec(b.id).sc)[0];
}

/** 打開非選練習（tab：分類 id） */
export function open(tab) {
  const all = L.written();
  let cur = TABS.some(t => t.id === tab) ? tab : TABS.find(t => all.some(t.test))?.id || TABS[0].id;
  const body = ui.el('div', 'hall hs wr');
  const paint = () => {
    const T = TABS.find(t => t.id === cur), list = all.filter(T.test);
    const done = list.filter(w => L.wrRec(w.id)).length, due = list.filter(w => L.wrDue(w)).length;
    body.innerHTML = `<div class="hall-scroll">
      <p class="hs-lead">寫完再對照參考答案，依評分要點逐項給自己打分數。自評未達八成的題目會再排回來；每練一題都算進今天的學習（依題型折算題數）。</p>
      <div class="hs-label">題型</div><div class="hs-grid g3">${TABS.map(t => { const ls = all.filter(t.test), dn = ls.filter(w => L.wrDue(w)).length; return `<button type="button" class="hs-pick${t.id === cur ? ' on' : ''}" data-t="${t.id}" style="--c:${t.c}"><b>${t.icon} ${t.name}</b><small>${ls.length ? `${ls.length} 題${dn ? ` · ${dn} 題到期` : ''}` : '準備中'}</small></button>`; }).join('')}</div>
      <p class="hs-info">${T.lead}</p>
      ${list.length ? `<div class="hs-label">題目（寫過 ${done} / ${list.length}${due ? ` · 到期 ${due}` : ''}）</div><div class="wr-list">${list.map(w => { const r = L.wrRec(w.id), st = r ? Math.round(r.best * 100) : null;
        return `<button type="button" class="wr-item${L.wrDue(w) ? ' due' : ''}" data-id="${ui.esc(w.id)}"><span class="wr-d">${'★'.repeat(w.d)}</span><b>${ui.rich(w.title)}</b><small>${w.pts} 分${r ? ` · 最佳 ${st}%${L.wrDue(w) ? ' · 到期' : ''}` : ''}</small></button>`; }).join('')}</div>` : '<p class="muted">這一類的題目還在準備中。</p>'}
    </div><div class="hx-foot"><span class="muted">${list.length ? '按「練一題」會先出到期的題目，再出沒寫過的。' : ''}</span>${list.length ? '<button type="button" class="btn go">練一題</button>' : ''}</div>`;
    body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { cur = b.dataset.t; Audio.sfx('tick'); paint(); });
    body.querySelectorAll('[data-id]').forEach(b => b.onclick = () => practice(all.find(w => w.id === b.dataset.id), () => open(cur)));
    const go = body.querySelector('.go'); if (go) go.onclick = () => practice(pickNext(list), () => open(cur));
  };
  paint();
  hall.open('潮汐考場 · 非選練習', body);
}

/** 作答 */
function practice(w, back) {
  if (!w) return;
  const T = tabOf(w), parts = w.parts && w.parts.length ? w.parts : [{ q: '', pts: w.pts }], t0 = Date.now();
  const d0 = drafts[w.id] || [];
  const body = ui.el('div', 'hall hx wr');
  body.innerHTML = `<div class="hx-bar"><b class="hx-title">${T.icon} ${ui.rich(w.title)} · ${w.pts} 分</b><span class="hx-timer"></span></div>
    <div class="hall-scroll hx-main">
      ${w.material ? `<div class="wr-mat"><div class="hs-label">閱讀材料</div><div>${ui.rich(w.material)}</div></div>` : ''}
      <div class="wr-q">${ui.rich(w.q)}</div>
      ${parts.map((p, i) => `<div class="wr-part">${p.q ? `<div class="wr-pq">${ui.rich(p.q)}<em>（${p.pts} 分）</em></div>` : ''}
        <textarea class="wr-ta" data-i="${i}" rows="${T.count === 'words' && w.kind === 'en-trans' ? 3 : w.kind === 'math-open' || w.kind === 'short' ? 5 : 10}" spellcheck="false" placeholder="${w.kind === 'en-trans' || w.kind === 'en-essay' ? 'Write your answer here…' : '在這裡作答…'}">${ui.esc(d0[i] || '')}</textarea>
        <div class="wr-cnt" data-c="${i}"></div></div>`).join('')}
    </div>
    <div class="hx-foot"><button type="button" class="btn ghost back">← 回題目列表</button><span class="muted">建議 ${T.min} 分鐘；草稿會自動保留</span><button type="button" class="btn go">寫好了，對照參考答案</button></div>`;
  const tas = [...body.querySelectorAll('.wr-ta')], timer = body.querySelector('.hx-timer');
  const recount = () => tas.forEach((ta, i) => { const n = countOf(ta.value, T.count); body.querySelector(`[data-c="${i}"]`).textContent = T.count === 'words' ? `${n} words` : `${n} 字`; });
  tas.forEach(ta => ta.oninput = () => { drafts[w.id] = tas.map(x => x.value); saveDrafts(); recount(); });
  recount();
  const tick = setInterval(() => { if (!document.body.contains(timer)) { clearInterval(tick); return; } const s = (Date.now() - t0) / 1000; timer.textContent = `⏱ ${fmtMin(s)}`; timer.classList.toggle('over', s > T.min * 60); }, 500);
  body.querySelector('.back').onclick = () => { clearInterval(tick); back(); };
  body.querySelector('.go').onclick = async () => {
    const ans = tas.map(x => x.value.trim());
    if (!ans.some(Boolean) && !(await hall.confirmIn(body, '還沒寫答案', '直接看參考答案的話，這次記成 0 分，明天再排回來練。', '直接看答案'))) return;
    clearInterval(tick); review(w, ans, Math.round((Date.now() - t0) / 1000), back);
  };
  hall.open('潮汐考場 · 非選練習', body, { guard: () => tas.some(x => x.value.trim()) ? hall.confirmIn(body, '先離開作答？', '草稿會保留在這台裝置，之後可以接著寫。', '離開') : Promise.resolve(true), onClose: () => clearInterval(tick) });
  setTimeout(() => tas[0] && tas[0].focus(), 120);
}

/** 對照參考答案、逐項自評 */
function review(w, ans, secs, back) {
  const T = tabOf(w), parts = w.parts && w.parts.length ? w.parts : null, got = w.keys.map(() => 0), empty = !ans.some(Boolean);
  const refs = [].concat(w.ref || []);
  const body = ui.el('div', 'hall hx wr');
  body.innerHTML = `<div class="hx-bar"><b class="hx-title">${T.icon} ${ui.rich(w.title)} · 自評</b><span class="hx-timer">用了 ${fmtMin(secs)}</span></div>
    <div class="hall-scroll hx-main">
      <div class="hs-label">你的答案</div>
      <div class="wr-mine">${empty ? '<span class="muted">（沒有作答）</span>' : ans.map((a, i) => `${parts ? `<b>${['(一)', '(二)', '(三)', '(四)'][i] || ''}</b> ` : ''}${ui.esc(a || '（空白）')}`).join('<br><br>')}</div>
      <div class="hs-label">評分要點（對照參考答案，逐項給自己分數）</div>
      <div class="wr-keys">${w.keys.map((k, i) => `<div class="wr-key" data-k="${i}"><span>${ui.rich(k.t)}</span><span class="wr-sc">${[0, k.p >= 2 ? k.p / 2 : null, k.p].filter(v => v != null).map(v => `<button type="button" data-v="${v}"${empty ? ' disabled' : ''}>${v === 0 ? '沒寫到' : v === k.p ? `寫到 ${k.p}` : `部分 ${v}`}</button>`).join('')}</span></div>`).join('')}</div>
      <div class="hs-label">參考答案</div>
      ${refs.map((r, i) => `<div class="wr-ref">${refs.length > 1 ? `<b>參考 ${i + 1}</b><br>` : ''}${ui.rich(r)}</div>`).join('')}
      ${w.tip ? `<div class="wr-tip"><b>常見失分</b><br>${ui.rich(w.tip)}</div>` : ''}
    </div>
    <div class="hx-foot"><span class="wr-total"></span><button type="button" class="btn go">記錄這次的分數</button></div>`;
  const total = body.querySelector('.wr-total');
  const sum = () => { const s = got.reduce((a, b) => a + b, 0); total.innerHTML = `自評 <b>${+s.toFixed(1)}</b> / ${w.pts} 分`; return s; };
  body.querySelectorAll('.wr-key').forEach(row => {
    const i = +row.dataset.k, bs = [...row.querySelectorAll('button')];
    const mark = () => bs.forEach(b => b.classList.toggle('on', +b.dataset.v === got[i]));
    bs.forEach(b => b.onclick = () => { got[i] = +b.dataset.v; Audio.sfx('tick'); mark(); sum(); });
    mark();
  });
  sum();
  body.querySelector('.go').onclick = () => {
    const s = sum(), r = L.recordWritten(w, s), k = r.k;
    delete drafts[w.id]; saveDrafts();
    Audio.sfx(k >= 0.8 ? 'ok' : k >= 0.5 ? 'pop' : 'tick');
    ui.toast(k >= 0.8 ? `自評 ${Math.round(k * 100)}%！很穩，過一段時間再複習一次（+${r.xp} 經驗）` : k >= 0.5 ? `自評 ${Math.round(k * 100)}%：把沒寫到的要點記下來，過幾天再寫一次（+${r.xp} 經驗）` : `自評 ${Math.round(k * 100)}%：明天再練一次這題（+${r.xp} 經驗）`);
    back();
  };
  hall.open('潮汐考場 · 非選練習', body);
}
