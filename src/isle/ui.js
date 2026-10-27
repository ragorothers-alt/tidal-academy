/* 潮汐小島 · 介面：對話（逐字＋動物語）、選項與限時答題、收穫卡片、提示、面板、頭頂標籤。 */
import { screenOf as project, camera } from './engine.js';
/** 頭上的提示（飄字、泡泡、表情）要放在哪：第一人稱時鏡頭就在頭裡，投影會跑到畫面外，改放畫面中央偏上 */
const _p = camera.position.clone();
function screenOf(obj, dy) {
  if (obj && !obj.isVector3 && obj.getWorldPosition) { const p = obj.getWorldPosition(_p); if (Math.hypot(p.x - camera.position.x, p.z - camera.position.z) < 0.9) return [innerWidth / 2, innerHeight * (0.36 - (dy || 0) * 0.04), true]; }
  return project(obj, dy);
}
import * as Audio from './audio.js';
import * as shake from './shake.js';

const $ = id => document.getElementById(id);
/** 截短長文字：盡量停在句號等標點，超過時補上「…」 */
export function clip(s, n) { s = plain(s); if (s.length <= n) return s; const cut = s.slice(0, n), m = Math.max(...['。', '！', '？', '；', '. ', '! ', '? '].map(p => cut.lastIndexOf(p))); return m > n * 0.5 ? cut.slice(0, m + 1) : cut.replace(/\s+\S*$/, '') + '…'; }
/** 面板可以暫時接管鍵盤（例如單字謎打字），回傳 true 表示已處理 */
export let keyHook = null;
export const setKeyHook = fn => { keyHook = fn; };
export const plain = s => String(s == null ? '' : s).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '');
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SUP = Object.fromEntries([...'0123456789+-−=()nixykmabcdet'].map((c, i) => [c, '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻⁼⁽⁾ⁿⁱˣʸᵏᵐᵃᵇᶜᵈᵉᵗ'[i]]));
const SUB = Object.fromEntries([...'0123456789+-−=()aeoxhklmnpstijruv'].map((c, i) => [c, '₀₁₂₃₄₅₆₇₈₉₊₋₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜᵢⱼᵣᵤᵥ'[i]]));
/** 一行的預覽文字（清單、摘要）：拿掉標記，但上下標換成 Unicode 小字（x²、CO₂），Σ 的上下限寫成 Σ(k=1→10)——不會變成看不懂的「Σk=110」 */
export const flat = s => plain(String(s == null ? '' : s).replace(/([Σ∑∏])<sub>([^<]*)<\/sub><sup>([^<]*)<\/sup>/g, '$1($2→$3)')
  .replace(/<(sup|sub)>([^<]*)<\/\1>/g, (m, t, x) => { const T = t === 'sup' ? SUP : SUB; return [...x].every(c => T[c]) ? [...x].map(c => T[c]).join('') : (t === 'sup' ? '^' : '_') + (x.length > 1 ? '(' + x + ')' : x); }));
/** 數學排版：大型運算子（Σ、∏）題庫寫成 Σ<sub>k=1</sub><sup>10</sup>，排成課本那樣上限在上、下限在下（不是擠在符號右邊的小字）；
 *  平均數 x̄、ȳ 的上橫線改用 CSS 畫（圓體字型不會擺組合字元，橫線會跑到 x 後面的等號上） */
const mathMarks = h => h.replace(/([Σ∑∏])<sub>([^<]*)<\/sub><sup>([^<]*)<\/sup>/g, '<span class="bigop"><span>$3</span><span class="bo">$1</span><span>$2</span></span>')
  .replace(/([A-Za-z])̄|ȳ/g, (m, c) => `<span class="ovl">${c || 'y'}</span>`);
export const rich = s => mathMarks(esc(s == null ? '' : s).replace(/&lt;(\/?)(u|b|i|sup|sub)&gt;/g, '<$1$2>').replace(/&lt;br\s*\/?&gt;/g, '<br>'));
export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

/* ---------- 對話 ---------- */
/** 上一次 ask 從選項出現到作答的毫秒數 */
let lastMs = 0;
export const answerMs = () => lastMs;
const D = { open: false, typing: false, resolve: null, choices: null, hl: 0, timer: 0, full: '', quiz: false };
/** 閱讀設定（手機「設定」）：speed 打字速度倍率（0 = 立即顯示整句）、timer 限時倍率（1.5 = 寬鬆、0 = 不限時） */
export const read = { speed: 1, timer: 1 };
export const dialogOpen = () => D.open;
/** 正在作答：對話框出了題目（選項題、選填鍵盤），一直到這段對話結束（含答對答錯與解析）；或打開了考場的面板（模擬考、練習、單字燈塔）。
    這段時間背景不必重畫（post.render 停在最後一格，省電） */
export const answering = () => (D.open && D.quiz && !!(D.choices || D.input)) || (!$('panel').hidden && $('panelBox').classList.contains('hall-p'));   // 只在選項、數字鍵盤出現時停格（省電）；作答後的揭曉、島民的反應與解析照常播放
/** 對話正在逐字顯示中（角色嘴巴開合用）與目前說話者名稱 */
export const typing = () => D.typing;
export const speakerName = () => (D.open ? $('dlgName').textContent : '');
function speaker(sp) {
  $('dlg').hidden = false; D.open = true;
  $('dlgName').textContent = sp ? sp.name : '你';
  $('dlg').style.setProperty('--c', sp ? sp.color : '#7cc7ff');
  $('dlgName').hidden = sp === null;
}
function type(text, pitch, html) {
  const t = $('dlgText'); D.full = text; D.typing = true; $('dlgNext').classList.add('off');
  clearInterval(D.iv); let i = 0; const full = html ? rich(text) : esc(plain(text));
  return new Promise(res => {
    const done = () => { clearInterval(D.iv); D.typing = false; t.innerHTML = full; res(); };
    D.finishType = done;
    // 逐字打出：排版（上下標、Σ 的上下限、粗體）跟著字一起出現（以前打字時是拿掉標記的純文字，x² 會先顯示成 x2）——每一步重建、只留前 k 個字
    const cut = (e, k) => { for (const c of [...e.childNodes]) { if (k <= 0) { c.remove(); continue; } if (c.nodeType === 3) { if (c.data.length > k) c.data = c.data.slice(0, k); k -= c.data.length; } else k = cut(c, k); } return k; };
    const show = k => { t.innerHTML = full; cut(t, k); };
    t.innerHTML = full; t.scrollTop = 0; const src = t.textContent;
    if (!src.length || !read.speed) { done(); return; }   // 文字速度「立即顯示」：不逐字打
    show(0);
    const step = src.length > 100 ? 3 : 1; let n = 0;   // 長題目、長解析打字快一點，不用等太久
    D.iv = setInterval(() => { i = Math.min(src.length, i + step); show(i); if (step > 1) t.scrollTop = t.scrollHeight; if (++n % 2 === 0 && /\S/.test(src[i - 1] || '')) Audio.blip(pitch || 300); if (i >= src.length) done(); }, Math.max(8, 30 / read.speed));
  });
}
/** 觸控裝置沒有鍵盤：提示文字裡的按鍵改說畫面上的按鈕（「按 E」→「按『動作』」、拿掉「Esc 結束」這類子句） */
const COARSE = matchMedia('(pointer: coarse)');
export function keys(text) {
  if (!COARSE.matches || typeof text !== 'string') return text;
  return text
    .replace(/[（(][^（）()]*Esc[^（）()]*[）)]/g, '')                       // 「（Esc 結束）」整段括號
    .replace(/[、，,·]\s*(?:按\s*)?Esc\s*[^、，,·。！）)\n]*/g, '')        // 「、Esc 收起工具」
    .replace(/按\s*E(?![A-Za-z])\s*/g, '按「動作」')
    .replace(/(^|[：:、，,·（(\s])E(?:／點擊)?\s*(?=(?:放置|放下|拍照|使用|處理|擺在|擺放|許願|互動|繼續|確定|打開|拆掉|拆除))/g, '$1「動作」')   // 「E 放置」「E 拍照」；只認操作動詞，題目裡的選項 E 不動
    .replace(/（或 X）/g, '')
    .replace(/按 V 仰望天空/g, '按「✨ 仰望」看天空').replace(/\bV 仰望天空/g, '「✨ 仰望」看天空').replace(/\bF 造島工具/g, '「🛠 工具」造島')
    .replace(/\bV 或移動/g, '「✨ 仰望」或移動').replace(/\bZ 復原/g, '「↶ 復原」').replace(/\bR 旋轉/g, '「↻ 旋轉」')   // 夢境島與擺放家具：畫面上對應的按鈕
    .replace(/按\s*F\s*(?=擺出|裝潢|打開裝潢|打開飯店)/g, '點「🛋」')   // 裝潢：右側的 🛋 鈕
    .replace(/按\s*Tab\s*打開手機/g, '點右下角的手機').replace(/按\s*P\s*進入拍照模式/g, '從手機打開「相機」').replace(/按\s*G\s*鋪步道/g, '點「🌷」鋪步道')
    .replace(/空白鍵/g, '「跳」鈕').trim();
}
/** 說一段話，等玩家按下繼續 */
export async function say(sp, text, opt) {
  speaker(sp); $('choices').innerHTML = ''; clearTimer();
  fit(opt && opt.big != null ? opt.big : plain(text).length > BIG_TEXT || passageOn());
  await type(keys(text), sp && sp.voice, opt && opt.html);
  $('dlgNext').classList.remove('off');
  return new Promise(res => { D.resolve = res; });
}
/** 對話框的大小：題目、選項或解析比較長（題組、多選、長選項）時換成大題目面板——寬、可以捲動、選項排成大按鈕。
    題目的長短與難度不必遷就對話框。long：選項比較長，排成單欄 */
const BIG_TEXT = 110, BIG_OPT = 30;
const passageOn = () => { const p = $('passage'); return !!p && !p.hidden; };
function fit(big, long) { const d = $('dlg'); d.classList.toggle('big', !!big); d.classList.toggle('long-opts', !!long); document.body.classList.toggle('dlg-big', !!big); }
/** 說話並給選項；opt.timer 秒數到了回傳 -1。
    opt：html 允許 b/u/i/sup/sub/br、keys 標上按鍵（abc 時標 A–E，學測的選項代號；數字鍵 1–5 一樣能選）、multi 多選、big 強制大面板、
    answer 正確選項（數字或陣列；有的話作答後先揭曉對錯再回傳） */
export async function ask(sp, text, options, opt) {
  opt = opt || {};
  speaker(sp); $('choices').innerHTML = ''; clearTimer();
  if (opt.abc || opt.quiz) D.quiz = true;   // 題目（選項標 A–E 的都是題庫題；其他題目傳 quiz）
  const lens = options.map(o => plain(o).length), maxO = Math.max(0, ...lens);
  fit(opt.big != null ? opt.big : plain(text).length > BIG_TEXT || maxO > BIG_OPT || !!opt.multi || passageOn(), maxO > 16 || (options.length <= 5 && lens.reduce((a, b) => a + b, 0) > 56));   // 文意選填的十個短單字排兩欄
  const shown = type(text, sp && sp.voice, opt.html);
  if (!opt.waitType) { await shown; }
  const tAsk = performance.now();
  return new Promise(res => {
    const multi = !!opt.multi, picked = new Set();
    D.choices = multi ? options.concat(['✓ 送出答案']) : options; D.hl = Math.min(opt.hl || 0, D.choices.length - 1); D.multi = multi; D.at = performance.now();
    const box = $('choices'); box.innerHTML = '';
    // 選項文字包一層 span：大題目面板的 .choice 是 flex，沒包的話 x²、CO₂ 的上下標會被拆成各自的 flex 項目、中間隔一大段
    D.choices.forEach((o, i) => { const b = el('button', 'choice', `<span class="ch-t">${opt.html ? rich(o) : esc(plain(o))}</span>`); b.type = 'button'; b.style.animationDelay = (i * 0.05) + 's'; b.onclick = e => { e.stopPropagation(); pick(i); }; b.onmouseenter = () => { D.hl = i; hl(); }; box.appendChild(b); });
    if (opt.keys) [...box.children].forEach((b, i) => { if (opt.abc && multi && i === options.length) return; b.insertAdjacentHTML('afterbegin', opt.abc ? `<kbd data-n="${(i + 1) % 10}">${LETTERS[i] || i + 1}</kbd>` : `<kbd>${(i + 1) % 10}</kbd>`); });
    hl();
    if (multi) box.lastChild.classList.add('submit');
    const pick = i => {
      if (!D.choices) return;
      if (multi && i >= 0 && i < options.length) { picked.has(i) ? picked.delete(i) : picked.add(i); box.children[i].classList.toggle('on', picked.has(i)); Audio.sfx('tick'); return; }
      if (multi && i === options.length && !picked.size) { Audio.sfx('bad'); return; }
      D.choices = null; D.multi = false; clearTimer(); lastMs = performance.now() - tAsk;
      const out = multi && i >= 0 ? [...picked].sort((a, b) => a - b) : i;
      if (opt.answer != null) {   // 對錯揭曉（v7.0）：正解變綠打勾、選錯的變紅並抖一下，沒選到的正解框出來；停一下再繼續，答錯停久一點好對照
        const A = [].concat(opt.answer), right = multi ? i >= 0 && out.length === A.length && out.every(x => A.includes(x)) : A.includes(i);
        [...box.children].forEach((b, j) => {
          b.disabled = true; b.classList.remove('hl'); b.style.animationDelay = '0s';
          if (j >= options.length) { b.classList.add('dim'); return; }
          const chosen = multi ? i >= 0 && out.includes(j) : j === i;
          b.classList.add(A.includes(j) ? (chosen ? 'right' : 'miss') : chosen ? 'wrong' : 'dim');
        });
        box.classList.add('reveal');
        setTimeout(() => { box.innerHTML = ''; box.classList.remove('reveal'); res(out); }, right ? 420 : 820);
        return;
      }
      box.innerHTML = ''; res(out);
    };
    D.submit = () => pick(options.length);
    D.pick = pick;
    const T = opt.timer && read.timer ? opt.timer * read.timer : 0;   // 作答時間：寬鬆就延長，不限時就不計時
    if (T) {
      const bar = $('dlgTimer'); bar.hidden = false; const t0 = performance.now(), lim = T * 1000; let lastS = -1;
      D.tv = setInterval(() => { const k = 1 - (performance.now() - t0) / lim; bar.firstChild.style.width = Math.max(0, k * 100) + '%'; bar.classList.toggle('warn', k < 0.3); const s = Math.ceil(k * T); if (k < 0.3 && s !== lastS) { lastS = s; Audio.sfx('tick'); } if (k <= 0) pick(-1); }, 50);
    }
  });
}
const LETTERS = 'ABCDEFGHIJ';   // 文意選填有十個選項
/** 選填題：螢幕上的數字鍵盤（也能直接用鍵盤打數字、-、/、.，Enter 送出），回傳輸入的字串；opt.timer 秒數到了回傳 -1 */
export async function input(sp, text, opt) {
  opt = opt || {};
  speaker(sp); $('choices').innerHTML = ''; clearTimer(); D.quiz = true;
  fit(true, false);
  await type(text, sp && sp.voice, opt.html);
  const tAsk = performance.now();
  return new Promise(res => {
    let val = '';
    const box = $('choices'); box.innerHTML = '';
    const wrap = el('div', 'fill'), disp = el('div', 'fill-disp'), pad = el('div', 'fill-pad');
    const paint = () => { disp.innerHTML = val ? `<b>${esc(val)}</b>` : '<span>輸入答案：整數、分數（a/b）或小數</span>'; };
    const done = v => { D.input = null; box.innerHTML = ''; clearTimer(); lastMs = performance.now() - tAsk; res(v); };
    const press = k => {
      if (!D.input) return;
      if (k === '送出') { if (!val) { Audio.sfx('bad'); return; } done(val); return; }
      if (k === '⌫') val = val.slice(0, -1); else if (k === '清除') val = ''; else if (k === '−') val = val.startsWith('-') ? val.slice(1) : '-' + val; else if (val.length < 12) val += k;
      Audio.sfx('tick'); paint();
    };
    ['7', '8', '9', '⌫', '4', '5', '6', '−', '1', '2', '3', '/', '0', '.', '清除', '送出'].forEach(k => { const b = el('button', 'fill-k' + (k === '送出' ? ' go' : /[0-9.]/.test(k) ? '' : ' fn'), k); b.type = 'button'; b.onclick = e => { e.stopPropagation(); press(k); }; pad.appendChild(b); });
    wrap.append(disp, pad); box.appendChild(wrap); paint();
    D.input = { press }; D.at = performance.now();
    const T = opt.timer && read.timer ? opt.timer * read.timer : 0;   // 作答時間：寬鬆就延長，不限時就不計時
    if (T) {
      const bar = $('dlgTimer'); bar.hidden = false; const t0 = performance.now(), lim = T * 1000; let lastS = -1;
      D.tv = setInterval(() => { const k = 1 - (performance.now() - t0) / lim; bar.firstChild.style.width = Math.max(0, k * 100) + '%'; bar.classList.toggle('warn', k < 0.3); const s = Math.ceil(k * T); if (k < 0.3 && s !== lastS) { lastS = s; Audio.sfx('tick'); } if (k <= 0) done(-1); }, 50);
    }
  });
}
function clearTimer() { clearInterval(D.tv); $('dlgTimer').hidden = true; }
function hl() { [...$('choices').children].forEach((b, i) => b.classList.toggle('hl', i === D.hl)); }
export function closeDialog() { figBtn(null); D.open = false; D.quiz = false; D.choices = null; D.input = null; clearTimer(); $('dlg').hidden = true; $('choices').innerHTML = ''; passage(null); fit(false); }
/** 題庫題目的正確答案：(B)「選項」；多選題列出全部（html，給 say 的 {html:true} 用） */
export const ansOf = q => q.type === 'fill' ? `「${[].concat(q.ans)[0]}」` : [].concat(q.a).map(i => `(${LETTERS[i]})${/^[「『]/.test(plain(q.o[i])) ? q.o[i] : `「${q.o[i]}」`}`).join('、');
/** 答錯（或時間到）之後：說出正確答案，再把完整解析講完（長的解析自動換大面板，不截短） */
export async function explain(sp, q, lead) {
  await say(sp, `${lead || ''}正確答案是 ${ansOf(q)}。`, { html: true });
  const f = figHook && figHook(q);   // 這一題有互動示意圖（figs.js）：說解析的時候，對話框右上角出現「看示意圖」
  figBtn(f);
  try { if (q.e) await say(sp, q.e, { html: true }); else if (f) await say(sp, '點右上角的「看示意圖」，看看它是怎麼運作的。'); }
  finally { figBtn(null); }
}
let figHook = null;
/** 答對時的稱讚：這一題有示意圖的話，說話時對話框右上角也有「看示意圖」（猜對的也能回頭看懂） */
export async function praise(sp, text, q) { const f = figHook && q && figHook(q); figBtn(f); try { await say(sp, text); } finally { figBtn(null); } }
/** figs.js 掛上來：回傳這一題的示意圖 { title, open } 或 null */
export const setFigHook = fn => { figHook = fn; };
function figBtn(f) {
  const old = $('dlgFig'); if (old) old.remove(); if (!f) return;
  const b = el('button', 'dlg-fig', '📐 看示意圖'); b.id = 'dlgFig'; b.type = 'button'; b.title = f.title;
  b.onclick = e => { e.stopPropagation(); f.open(); };
  $('dlg').querySelector('.dlg-bubble').appendChild(b);
}
/** 題組的閱讀材料（傳 null 關閉） */
export function passage(text) {
  const p = $('passage'); if (!p) return;
  document.body.classList.toggle('has-passage', !!text);
  if (!text) { p.hidden = true; p.dataset.key = ''; return; }
  if (p.dataset.key === text) { p.hidden = false; return; }
  p.dataset.key = text; p.innerHTML = `<b>閱讀材料</b><div>${rich(text)}</div>`; p.hidden = false; p.scrollTop = 0;
}
/** 玩家按下繼續（E／點擊） */
export function advance() {
  if (cardRes) { const r = cardRes; cardRes = null; const im = cardPocket && $('card').querySelector('.card-icon img'), rc = im && (im.getBoundingClientRect().width ? im.getBoundingClientRect() : $('card').querySelector('.card-in').getBoundingClientRect()); $('card').hidden = true; if (rc && rc.width) flyToPocket(im.src, [rc.left + rc.width / 2, rc.top + Math.min(rc.height / 2, 90)], Math.min(rc.width, 96)); cardPocket = false; r(); return true; }   // 收進口袋的卡片：關掉時圖示飛進背包
  if (!D.open) return false;
  if (D.typing) { D.finishType && D.finishType(); return true; }
  if (D.input) return true;   // 選填題用 Enter 或「送出」，E／空白鍵不會送出
  if (D.choices) { if (performance.now() - (D.at || 0) > 450) D.pick(D.hl); return true; }   // 選項剛出現的 0.45 秒內不接受 E／空白鍵：連按收竿、跳躍時不會誤答
  if (D.resolve) { const r = D.resolve; D.resolve = null; r(); }
  return true;
}
/** 點畫面（觸控、滑鼠點島上、「繼續」鈕）：只把字打完或往下一句。出了選項或選填鍵盤時，要點選項本身才算作答——點背景不會替你選 */
export function tapAdvance() { if (!cardRes && D.open && !D.typing && (D.choices || D.input)) return true; return advance(); }
export function dialogKey(e) {
  if (D.input && !D.typing) {
    const k = /^[0-9.\/]$/.test(e.key) ? e.key : e.key === '-' ? '−' : e.key === 'Backspace' ? '⌫' : e.key === 'Enter' ? '送出' : e.key === 'Delete' ? '清除' : null;
    if (k) { if (performance.now() - (D.at || 0) > 300) D.input.press(k); return true; }
    return false;
  }
  if (!D.choices) return false;
  if (/^(Digit|Numpad)[0-9]$/.test(e.code)) { const n = +e.code.slice(-1), i = n === 0 ? 9 : n - 1; if (i < D.choices.length) D.pick(i); return true; }   // 1–9、0（第十個選項）
  if (D.multi && e.code === 'Enter') { D.submit(); return true; }
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'KeyW' || e.code === 'KeyS') { const up = e.code === 'ArrowUp' || e.code === 'KeyW'; D.hl = (D.hl + (up ? -1 : 1) + D.choices.length) % D.choices.length; hl(); Audio.sfx('tick'); return true; }
  return false;
}

/* ---------- 收穫卡片（我釣到了！） ---------- */
let cardRes = null, cardAt = 0, cardPocket = false;
let cardChain = Promise.resolve();
/** 卡片排隊顯示：前一張還沒關閉時，下一張會等它（避免覆蓋掉前一張的完成回呼） */
/** 獲得卡片。o：icon、title、sub、extra（html）、rare 稀有的金色光芒 */
export function card(o) { const p = cardChain.then(() => showCard(o)); cardChain = p.catch(() => {}); return p; }
function showCard(o) {
  const c = $('card'); c.hidden = false; cardPocket = !!o.pocket;
  c.innerHTML = `<div class="card-in${o.rare ? ' rare' : ''}"><div class="card-icon">${o.icon ? `<img src="${o.icon}" alt="">` : ''}</div><b>${esc(o.title)}</b>${o.sub ? `<p>${rich(keys(o.sub))}</p>` : ''}${o.extra ? `<div class="card-extra">${o.extra}</div>` : ''}<small>${COARSE.matches ? '點一下繼續' : '按 E 繼續'}</small></div>`;
  Audio.sfx(o.rare ? 'rare' : 'catch'); if (o.rare) shake.haptic('rare');   // 稀有（四、五星）：金色旋轉光芒與閃亮的音效
  return new Promise(res => { cardRes = res; cardAt = performance.now(); });
}
export const cardOpen = () => !!cardRes;
/* 觸控：點卡片任何地方就繼續（卡片蓋住整個畫面，點不到底下的畫面與「繼續」鈕；剛出現的 0.35 秒內不算，免得連點跳過）。
   點對話框本身也能繼續——選項、選填題的按鈕自己處理，不在這裡 */
$('card').addEventListener('click', () => { if (cardRes && performance.now() - cardAt > 350) advance(); });
$('dlg').addEventListener('click', e => { if (cardRes || !D.open || D.choices || D.input || (e.target.closest && e.target.closest('button, input, a, .choices'))) return; advance(); });

/* ---------- 提示 ---------- */
export function toast(text, tone) {
  text = keys(text); const box = $('toasts'); if ([...box.children].some(c => c.textContent === text)) return;
  while (box.children.length >= 3) box.firstChild.remove();
  const t = el('div', 'toast' + (tone ? ' ' + tone : ''), esc(text)); box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
}
export function emote(obj, text, color) {
  const e = el('div', 'emote'); e.textContent = text; e.style.color = color || '#ff7b9c'; $('labels').appendChild(e);
  const t0 = performance.now(); const tick = () => { const [x, y] = screenOf(obj, 1.9); e.style.left = x + 'px'; e.style.top = y + 'px'; if (performance.now() - t0 < 1600) requestAnimationFrame(tick); else e.remove(); }; tick();
}
/** 角色頭上的「心思泡泡」：奶油色的圓泡泡裡一個小圖示，下面兩顆小圓點像在想事情（島民自己做決定時用，跟著角色移動） */
export function think(obj, text, ms) {
  const e = el('div', 'think', `<span>${esc(text)}</span>`); $('labels').appendChild(e);
  const t0 = performance.now(), D2 = ms || 2200; const tick = () => { const [x, y] = screenOf(obj, 2.0); e.style.left = x + 'px'; e.style.top = y + 'px'; if (performance.now() - t0 < D2) requestAnimationFrame(tick); else e.remove(); }; tick();
}
/** 角色頭上的小對話泡泡（跟著角色移動，ms 毫秒後消失） */
export function bubble(obj, text, ms) {
  const e = el('div', 'bubble', esc(text)); $('labels').appendChild(e);
  const t0 = performance.now(), D2 = ms || 2400; const tick = () => { const [x, y] = screenOf(obj, 2.05); e.style.left = x + 'px'; e.style.top = y + 'px'; if (performance.now() - t0 < D2) requestAnimationFrame(tick); else e.remove(); }; tick();
}
/** 收進口袋：圖示從 from（螢幕座標 [x, y]，或 3D 物件）沿弧線飛進背包按鈕，按鈕彈一下；口袋只剩 2 格以下按鈕變色（main.js 的 paintPocket） */
export function flyToPocket(src, from, size) {
  const b = $('pocketBtn'); if (!b || !b.getClientRects().length) return;
  const [x0, y0] = Array.isArray(from) ? from : screenOf(from, 1.1), r = b.getBoundingClientRect(), x1 = r.left + r.width / 2, y1 = r.top + r.height / 2;
  const e = el('div', 'fly-item', /^(data:|blob:|https?:|\/|\.)/.test(src || '') || /\.(png|webp|jpe?g|svg)$/i.test(src || '') ? `<img src="${src}" alt="">` : esc(src || '🎒'));
  const s0 = Math.min(1.6, (size || 44) / 44), mx = (x0 + x1) / 2 + (x1 - x0) * 0.1, my = Math.min(y0, y1) - 70;
  document.body.appendChild(e);
  const T = (x, y, s) => `translate(${x - 22}px, ${y - 22}px) scale(${s})`;
  const a = e.animate([{ transform: T(x0, y0, s0), opacity: 1 }, { transform: T(mx, my, s0 * 0.8), opacity: 1, offset: 0.45 }, { transform: T(x1, y1, 0.35), opacity: 0.85 }], { duration: 560, easing: 'cubic-bezier(.45,0,.7,.35)' });
  a.onfinish = () => { e.remove(); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); Audio.sfx('tick', { pitch: 1.5, vol: 0.5 }); };
}
export function floatText(obj, text, color) {
  const e = el('div', 'float'); e.textContent = text; if (color) e.style.color = color; $('labels').appendChild(e);
  const [x, y] = screenOf(obj, 1.7); e.style.left = x + 'px'; e.style.top = y + 'px'; setTimeout(() => e.remove(), 1400);
}

/* ---------- 面板 ---------- */
let panelBack = null, panelBackAt = 0, panelBackLabel = '手機';   // 從手機打開的下一個面板：左上角放「‹ 手機」（setBack 之後 1 秒內打開的面板才算）
/** 下一個打開的面板加上返回鈕（手機的 App 用；label：返回到哪裡，例如「自由練習」） */
export const setBack = (fn, label) => { panelBack = fn; panelBackAt = performance.now(); panelBackLabel = label || '手機'; };
let panelClose = null, panelGuard = null;   // panelGuard：關閉前要確認（例如模擬考作答中），回傳 Promise<boolean>
export const panelOpen = () => !$('panel').hidden;
export function panel(title, body, opt) {
  const p = $('panel'); document.body.classList.add('panel-open');
  if (!p.hidden && panelClose) { const f = panelClose; panelClose = null; f(); }   // 直接換成另一個面板：舊面板的清理（語音、動畫、監聽器）也要做
  p.hidden = false; Audio.sfx('open');
  const box = $('panelBox'); box.className = 'pn-box' + (opt && opt.cls ? ' ' + opt.cls : '');
  box.innerHTML = ''; const head = el('div', 'pn-head', `<b>${esc(title)}</b>`); const x = el('button', 'pn-x', '✕'); x.type = 'button'; x.onclick = () => requestClose(); head.appendChild(x);
  box.appendChild(head); box.appendChild(body); panelClose = opt && opt.onClose; panelGuard = (opt && opt.guard) || null;
  { const back = panelBack && performance.now() - panelBackAt < 1000 && !(opt && opt.cls && /\bphone-home\b/.test(opt.cls)) ? panelBack : null; panelBack = null;
    if (back) { const b = el('button', 'pn-back', '‹ ' + esc(panelBackLabel)); b.type = 'button'; b.onclick = () => { const g = panelGuard; if (g) g().then(ok => { if (ok) back(); }); else back(); }; head.insertBefore(b, head.firstChild); } }
  box.tabIndex = -1; if (document.activeElement && document.activeElement !== document.body && !box.contains(document.activeElement)) document.activeElement.blur(); box.focus({ preventScroll: true });
}
/** 要求關閉面板：有離開確認的面板先問過（✕、點面板外面、Esc 都走這裡） */
export function requestClose() { const g = panelGuard; if (!g) { closePanel(); return; } g().then(ok => { if (ok && panelGuard === g) closePanel(); }); }
export function closePanel() { panelGuard = null; $('panel').hidden = true; document.body.classList.remove('panel-open'); const f = panelClose; panelClose = null; if (f) f(); }

/** 分頁籤列（.dex-tabs）在窄螢幕上是橫向捲動的一排：重畫後把選中的那一顆捲到看得到的地方 */
export function showTab(tabs) {
  const edge = () => tabs.classList.toggle('more', tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 2);   // 右邊還有沒露出來的分頁：右緣淡出
  if (!tabs.dataset.st) { tabs.dataset.st = '1'; tabs.addEventListener('scroll', edge, { passive: true }); }
  setTimeout(() => { const on = tabs.querySelector('.on'); if (on && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = on.offsetLeft - tabs.offsetLeft - (tabs.clientWidth - on.offsetWidth) / 2; edge(); }, 0);
}
/* ---------- 動森風 UI：物品提示泡泡、按鍵提示列、圓形轉場 ---------- */
let tipEl = null, tipFor = null;
function showTip(target) {
  const text = target.dataset.tip; if (!text) return;
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'ac-tip'; document.body.appendChild(tipEl); }
  const r = target.getBoundingClientRect(), cx = r.left + r.width / 2; tipEl.textContent = text; tipEl.style.top = r.top + 'px';
  tipEl.hidden = false; tipEl.style.animation = 'none';
  const w = tipEl.offsetWidth, lx = Math.min(Math.max(cx, w / 2 + 8), innerWidth - w / 2 - 8);   // 靠近畫面邊緣的按鈕：泡泡往內推，箭頭仍對準按鈕
  tipEl.style.left = lx + 'px'; tipEl.style.setProperty('--ax', (cx - lx) + 'px');
  void tipEl.offsetWidth; tipEl.style.animation = ''; tipFor = target;
}
const hideTip = () => { if (tipEl) tipEl.hidden = true; tipFor = null; };
// 瀏覽器原生的 title 小黃框換成青綠色泡泡（第一次滑過時把 title 搬到 data-tip）
let touchy = false;   // 剛剛是用手指點的：點完瀏覽器會補一個 mouseover，提示會一直留在畫面上，所以觸控時不顯示
document.addEventListener('pointerdown', e => { touchy = e.pointerType === 'touch'; }, true);
document.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') touchy = false; }, true);
const noHover = matchMedia('(hover: none)');
document.addEventListener('mouseover', e => {
  const t = e.target.closest && e.target.closest('[title], [data-tip]'); if (!t || t === tipFor) return;
  if (touchy || noHover.matches) { if (t.title) { t.dataset.tip = t.title; t.removeAttribute('title'); } return; }
  if (t.title) { t.dataset.tip = t.title; t.removeAttribute('title'); }
  showTip(t);
});
document.addEventListener('mouseout', e => { if (tipFor && !(e.relatedTarget && tipFor.contains(e.relatedTarget))) hideTip(); });
document.addEventListener('pointerdown', hideTip, true);
// 按鍵提示列：對話、選項、面板開著時，右下角提示可以按什麼
const hints = document.createElement('div'); hints.className = 'ac-hints'; document.body.appendChild(hints);
let hintKey = '';
setInterval(() => {
  const k = !$('panel').hidden ? 'panel' : D.open ? (D.choices ? 'choice' : 'dlg') : '';
  if (k === hintKey) return; hintKey = k;
  const H = { panel: [['Esc', '關閉'], ['Tab', '移動']], choice: [['↑↓', '選擇'], ['E', '確定']], dlg: [['E', '繼續']] }[k] || [];
  hints.innerHTML = H.map(([a, b]) => `<span><kbd>${a}</kbd>${b}</span>`).join(''); hints.classList.toggle('on', !!H.length);
  if (!k) hideTip();
}, 150);
/** 圓形轉場：從畫面中央擴張打開（進出建築時） */
export function iris(dur) {
  const o = document.createElement('div'); o.className = 'ac-iris'; document.body.appendChild(o);
  const t0 = performance.now(), D2 = dur || 650;
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / D2), e = 1 - Math.pow(1 - k, 3);
    o.style.setProperty('--r', (e * 80) + '%');
    if (k < 1) setTimeout(step, 16); else o.remove();
  };
  step();
}
