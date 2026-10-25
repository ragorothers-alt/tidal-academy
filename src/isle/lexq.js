/* 潮汐小島 · 單字燈塔的出題與排程（純函式，不碰畫面，tests/isle.test.cjs 直接測）。
   題目文字只用 <b> <i> <br>（ui.rich 會轉義其他標籤），所以這裡不先轉義。 */
export const LEVELS = [3, 4, 5, 6];
export const LV_COLORS = { 3: '#4a9fe0', 4: '#2fb58a', 5: '#e2a21a', 6: '#e8687e' };
export const KINDS = { meaning: '選義快答', cloze: '例句填空', reverse: '中翻英' };
const posKey = p => String(p || '').split(/[./]/)[0];
const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reEsc = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/** 例句挖空：找得到單字（含變化形）就回傳挖空後的句子，找不到回傳 null */
export function blank(v) {
  if (!v.ex) return null;
  const stem = v.w.length > 4 ? v.w.slice(0, v.w.length - (/e$/.test(v.w) ? 1 : 0)) : v.w;
  const re = new RegExp('\\b' + reEsc(stem) + '[a-z]*', 'gi');   // 同一句出現兩次時兩個都挖掉，不會露出答案
  return re.test(v.ex) ? v.ex.replace(re, '＿＿＿＿') : null;
}

/** 單字測驗：kind 是 meaning（看英文選中文）、cloze（例句填空）、reverse（看中文選英文）或 mix。
    words 是出題範圍，pool 是整份單字表（拿來當誘答選項），回傳的題目可以直接給 hall.renderQ 畫 */
export function buildQuiz(kind, words, n, pool, rnd) {
  rnd = rnd || Math.random;
  return shuffle(words, rnd).slice(0, n).map(v => {
    const same = pool.filter(x => x.w !== v.w && x.zh !== v.zh && posKey(x.pos) === posKey(v.pos) && Math.abs(x.lv - v.lv) <= 1);
    const base = same.length >= 3 ? same : pool.filter(x => x.w !== v.w && x.zh !== v.zh);
    const others = shuffle(base, rnd).filter((x, i, arr) => arr.findIndex(y => y.zh === x.zh || y.w === x.w) === i).slice(0, 3);
    let type = kind === 'mix' ? ['meaning', 'cloze', 'reverse'][Math.floor(rnd() * 3)] : kind;
    const blanked = type === 'cloze' ? blank(v) : null;
    if (type === 'cloze' && !blanked) type = 'meaning';   // 例句裡找不到這個字（不規則變化）就改考意思
    const choices = shuffle([v].concat(others), rnd), a = choices.indexOf(v);
    const q = type === 'meaning' ? `<b>${v.w}</b>　<i>${v.pos || ''}</i><br>最接近的中文意思是？`
      : type === 'reverse' ? `「${v.zh}」（${v.pos || ''}）的英文是？`
      : `${blanked}<br><i>${v.exZh || ''}</i>`;
    const o = choices.map(x => type === 'meaning' ? x.zh : x.w);
    const e = `<b>${v.w}</b>（${v.pos || ''}）${v.zh}　Level ${v.lv}${v.ex ? `<br>${v.ex}` : ''}${v.exZh ? `<br>${v.exZh}` : ''}`;
    return { id: `voc:${v.w}:${type}`, word: v.w, vocab: v, kind: type, subject: 'english', type: 'single', d: v.lv >= 5 ? 3 : v.lv >= 4 ? 2 : 1, q, o, a, e };
  });
}

/** 翻卡的牌組：先排到期的字（打亂），再補新字（同一天順序固定、由低級數往上學） */
export function deck(lv, n, due, fresh, rnd, dayRnd) {
  const d = shuffle(due.filter(v => !lv || v.lv === lv), rnd || Math.random);
  const f = shuffle(fresh.filter(v => !lv || v.lv === lv), dayRnd || rnd || Math.random).sort((x, y) => x.lv - y.lv);
  return d.slice(0, n).concat(f.slice(0, Math.max(0, n - d.length)));
}

/** 某個級數（0 = 全部）的進度：總字數、熟練、學習中、未學 */
export function levelStats(vocab, voc, lv, master) {
  let m = 0, learning = 0, total = 0;
  vocab.forEach(v => { if (lv && v.lv !== lv) return; total++; const r = voc[v.w]; if (!r) return; if (r.s >= master) m++; else learning++; });
  return { total, m, learning, fresh: total - m - learning };
}

/** 例句裡把單字（含變化形）標成粗體，給翻卡背面用 */
export function mark(v) {
  if (!v.ex) return '';
  const re = new RegExp('(\\b' + reEsc(v.w.slice(0, Math.max(3, v.w.length - 2))) + '[a-z]*)', 'i');
  return v.ex.replace(re, '<b>$1</b>');
}
