/* 潮汐小島 · 任務欄（左上角時鐘下方）：一直告訴玩家接下來可以做什麼。
   新手引導：六個小步驟（打招呼 → 答對一題 → 釣魚 → 抓蟲 → 看信箱 → 接委託），每一步寫清楚怎麼做，完成有小獎勵；
   順序不限，先做到後面的步驟也算。全部完成後改成顯示今天的潮汐里程目標與進度，點一下打開完整清單。
   持續引導：新手引導之後，目標下面一直有「現在可以做」——依當下的狀況（口袋、委託、信箱、潮汐、天色、活動、讀書計畫、錯題）
   與還沒玩過或今天還沒玩的玩法挑 1–3 件事，附上怎麼做；今日目標全部完成後也不會空著。每 15 秒重新挑一次。
   進度由 miles.js 的事件通知（miles.add／addOnce／ping）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as miles from './miles.js';
import * as social from './social.js';
import * as planner from './planner.js';
import * as tide from './tide.js';
import * as events from './events.js';
import * as dream from './dream.js';
import * as garden from './garden.js';
import * as astro from './stars.js';
import * as trip from './trip.js';
import { S, save, I, dayKey, freeSlots } from './state.js';

const TA = window.TA;
const touch = () => matchMedia('(pointer: coarse)').matches;
const STEPS = [
  { key: 'talk', title: '和島民打招呼', how: () => touch() ? '走到任何一位島民旁邊，按右下角的「動作」' : '走到任何一位島民旁邊按 E（WASD 走路）' },
  { key: 'quiz', title: '答對一題', how: () => '和島民聊天時選「來考我吧！」——答對可以一直挑戰下去，獎金越疊越多' },
  { key: 'fish', title: '釣一條魚', how: () => (touch() ? '點左下角的釣竿' : '按 1 拿出釣竿') + '，面向水裡的魚影拋竿；浮標往下沉、冒出「！」時馬上收竿，回答英文單字題' },
  { key: 'bug', title: '抓一隻蟲', how: () => (touch() ? '點左下角的捕蟲網' : '按 2 拿出捕蟲網') + '，靠近花叢間飛舞的蟲揮網，回答國文題' },
  { key: 'mail', title: '看看信箱', how: () => (touch() ? '點右下角的手機' : '按 Tab 打開手機') + ' → 信箱；島民會寄單元筆記和禮物給你' },
  { key: 'accept', title: '接一個委託', how: () => '找頭上有「!」的島民聊天，選「有什麼需要幫忙的嗎？」' },
];
const REWARD = 300, FINISH = 1000;
const k = (key, tap) => touch() ? tap : key;   // 鍵盤與觸控各自的說法
const E = () => k(' E', '「動作」');
const PHONE = () => k('按 Tab 打開手機', '點右下角的手機');
/** 今日目標（潮汐里程）每一項怎麼做：任務欄顯示下一個還沒完成的提示 */
const HOW = {
  study: () => '找島民「來考我吧！」、解數學石碑，或到潮汐考場考模擬考、做錯題複習都算',
  quiz: () => '島上任何題目都算：島民出題、石碑、釣魚、抓蟲、鑑定…',
  fish: () => k('按 1 拿出釣竿', '點左下角的釣竿') + '，面向水裡的魚影拋竿，冒出「！」時馬上收竿',
  bug: () => k('按 2 拿出捕蟲網', '點左下角的捕蟲網') + '，靠近飛舞的蟲揮網',
  fossil: () => k('按 3 拿出鏟子', '點左下角的鏟子') + '，挖地上星形的裂縫；挖到的化石拿去博物館給史遙鑑定',
  sea: () => '退潮時（手機的潮汐表看時間）到沙灘邊的潮池，空手靠近按' + E(),
  talk: () => '走到島民旁邊按' + E() + '，每位島民每天算一次',
  req: () => '找頭上有「!」的島民接委託，照他說的完成後回去找他',
  donate: () => '把魚、蟲或鑑定好的化石帶去博物館，跟史遙選「捐贈給博物館」',
  gift: () => '和島民聊天選「送禮物」，送口袋裡的魚、蟲、水果或料理',
  water: () => k('按 4 拿出澆水壺', '點左下角的澆水壺') + '，替花園裡的花澆水',
  shell: () => '在沙灘上找貝殼，走過去按' + E() + '撿起來',
  craft: () => '家門口的 DIY 工作台：有材料就能照配方做家具',
  photo: () => k('按 P 進入拍照模式', '手機 →「相機」') + '，按快門拍一張',
  focus: () => '打開手機 →「專注時光」，專心讀書時島上也會陪你',
  puzzle: () => '島上的三塊數學石碑，或手機裡的每日單字謎',
  radio: () => '找英文導師 Lexi，選「海風電台（英文聽力）」',
};

/* ---------- 現在可以做 ---------- */
const nameOf = sid => ((I.VILLAGERS || []).find(v => v.sid === sid) || {}).name || (TA.subject(sid) || {}).name || '島民';
/** 導師的練習小遊戲：每天第一輪有答對可以領鈴錢（state.js 的 practiced 記錄 S().practice[id]） */
const GAMES = [
  ['radio', 'english', '海風電台（英文聽力）'], ['idiom', 'chinese', '成語診所'], ['plot', 'math', '函數圖形（看圖選方程式）'],
  ['market', 'math', '潮汐夜市（期望值）'], ['chrono', 'history', '年代排序挑戰'], ['council', 'civics', '島民議會（選舉制度）'],
  ['throw', 'physics', '拋射實驗場'], ['periodic', 'chemistry', '元素週期表'], ['moon', 'earth', '月相觀測'],
];
/** 還沒試過的玩法：試過一次就不再提（判斷都從存檔來） */
const FIRST = [
  ['shopin', s => !(s.stats || {}).shopIn, () => '潮汐商店走得進去了：到店門口按' + E() + '進門，今天的家具、壁紙地板、服裝和種子都擺在店裡'],
  ['figs', s => !(s.stats || {}).figs, () => '看解析時，對話框右上角的「📐 看示意圖」可以打開一台會動的小機器；考場的逐題回顧也有'],
  ['yue', s => !(s.stats || {}).yueVisit, () => '岳搬進了觀星小屋：他在家時到門口按' + E() + '拜訪，書桌、星座圖、火山模型都能翻開地科筆記'],
  ['mill', s => !(s.stats || {}).mill, () => '小河東岸蓋了水車磨坊：走到門前按' + E() + '看告示牌，還能答一題能量題'],
  ['donate', s => !Object.values(s.museum || {}).some(o => Object.keys(o || {}).length), () => '還沒捐過展品：把魚、蟲或鑑定好的化石帶去博物館，跟史遙選「捐贈給博物館」'],
  ['garden', () => !garden.plantCount(), () => '花園還是空的：到阿潮的商店「買種子」種花，花開後可以研究孟德爾遺傳（找森諮詢）'],
  ['cook', s => !(s.stats || {}).cook, () => '還沒做過料理：找晶晶上料理教室學食譜，回家門口的工作台做菜'],
  ['diy', s => !(s.stats || {}).diy, () => '還沒用過 DIY 工作台：撿樹枝、石頭、貝殼，到家門口的工作台照配方做家具'],
  ['dream', s => !(s.stats || {}).dream && dream.count() > 0, () => '還沒做過夢：回家在床邊按' + E() + '睡一覺，夢裡會重考錯題本的題目'],
  ['focus', s => !(s.stats || {}).focusMin, () => '讀書時可以開「專注時光」：' + PHONE() + ' →「專注時光」，島上會陪你一起專心'],
  ['lab', s => !Object.keys(s.lab || {}).length && Object.values(s.fr || {}).some(f => f >= 4), () => '和熟識的導師聊天時選「研究計畫」：一起做一個長期研究，完成每個階段都有研究家具'],
  ['lexicon', () => !Object.keys(TA.S.voc || {}).length, () => '還沒背過單字卡：' + PHONE() + ' →「單字燈塔」翻卡，熟悉、模糊、不熟會排不同的複習間隔'],
  ['wordle', s => !(s.stats || {}).wordle, () => '每日單字謎：' + PHONE() + ' →「單字謎」，每天一題英文單字'],
  ['tablets', s => !(s.stats || {}).tablets, () => '島上有三塊數學石碑，每天換一題（題庫的數學題），走過去按' + E()],
  ['stars', () => !astro.bookCount(), () => '晚上 7 點到清晨 5 點、沒下雨時，到學院台地的觀星台觀星，登錄星座'],
  ['visit', s => !(s.stats || {}).homeVisits, () => '和熟識的島民聊天，可以「邀請來我家玩」，他會參觀你的房間、陪你讀書'],
  ['trip', s => !(s.stats || {}).trips && trip.tickets() > 0, () => '你有潮汐券：到碼頭盡頭搭船去神秘島，答題帶走稀有的魚、蟲、礦石'],
];
let ENV = () => ({});   // main.js 給的：{ hour 遊戲時鐘（可預覽調整）, raining, tourney 大賽進行中 }
/** 依現在的狀況挑建議：[{t 文字, act 點了做什麼}]，最重要的在前面 */
function suggestions(max) {
  const s = S(), env = ENV() || {}, h = env.hour != null ? env.hour : new Date().getHours(), day = dayKey(), out = [];
  const add = (t, act) => { if (t && out.length < max && !out.some(o => o.t === t)) out.push({ t, act }); };
  if (env.tourney) return [{ t: '大賽進行中：時間內盡量多釣（抓），答對題目才算分！' }];
  const pk = s.pockets.filter(Boolean);
  // 1. 手上就能處理的事
  if (pk.some(x => x.k === 'unk')) add('口袋裡有未鑑定的化石：帶去博物館給史遙鑑定');
  if (pk.some(x => x.k === 'ore')) add('口袋裡有未鑑定的礦石：找岳鑑定');
  const mine = (s.reqs || []).find(r => r.accepted && !r.done);
  if (mine) add(`委託進行中：${social.reqText(mine)}${mine.type === 'weak' || mine.type === 'quiz' ? `（找${nameOf(mine.sid)}聊天就能開始）` : mine.type === 'deliver' ? '' : `（完成後回去找${nameOf(mine.sid)}）`}`, 'reqs');
  const un = social.unread(); if (un) add(`信箱有 ${un} 封新信：${PHONE()} → 信箱`, 'mail');
  { const who = H.labReady && H.labReady(); if (who) add(`${who}的研究計畫可以推進了：找${who}聊天，選「研究計畫」`); }
  if (H.chest && H.chest()) add(`今日航程完成 3 項了：${PHONE()} →「今日學習」開寶箱（+60 經驗、+50 潮晶）`, 'today');
  const free = freeSlots(); if (free <= 3) add(free ? `口袋快滿了（剩 ${free} 格）：到阿潮的商店賣東西，或捐給博物館` : '口袋滿了：到阿潮的商店賣東西，或捐給博物館');
  // 2. 現在才有的事（活動、時段、潮汐）
  const ev = events.active();
  if (ev.includes('weekly') && !events.weeklyDone()) add('週末模擬考祭典：找史遙參加，考完有獎品');
  const cup = (kind, sid, name) => { if (ev.includes(kind + '_cup') && ((s.tourney || {})[kind] || {}).prizeDay !== day) add(`今天有${name}：找${nameOf(sid)}報名，限時 3 分鐘拚獎牌`); };
  cup('fish', 'english', '釣魚大賽'); cup('bug', 'biology', '捕蟲大會');
  if (ev.includes('halloween') && h >= 17) add('潮汐夜祭：找島民選「不給糖就搗蛋！」，答對拿糖果，到阿潮的商店換限定家具');
  const pr = planner.progress(), left = pr.filter(x => x.n < x.need);
  if (left.length) add(`今天的讀書計畫：${left.map(x => `${(TA.subject(x.sid) || {}).name} ${x.n}/${x.need}`).join('、')}——找${left.map(x => nameOf(x.sid)).join('、')}「來考我吧！」`, 'plan');
  if (tide.state(env.date).low) add('現在退潮：沙灘邊的潮池和泥灘有生物可以觀察（空手靠近按' + E() + '）');
  if (astro.isNight(h) && !env.raining) add('今晚沒下雨：到學院台地的觀星台觀星，找找這個季節的星座');
  const vd = TA.L.vocabDue().length; if (vd >= 10) add(`有 ${vd} 個單字到期了：${PHONE()} →「單字燈塔」翻卡複習`, 'vocab');
  const mis = dream.count(); if (mis >= 3) add(`錯題本有 ${mis} 題：回家睡一覺，在夢裡重考（在不同天答對 3 次才會離開錯題本）`);
  if (!mine) { const r = (s.reqs || []).find(x => !x.accepted && !x.done); if (r) add(`${nameOf(r.sid)}頭上有「!」：找他接委託`); }
  // 3. 還沒試過的玩法、今天還沒玩的練習（每天換一個）
  const seed = [...day].reduce((a, c) => a + c.charCodeAt(0), 0);
  const fresh = FIRST.filter(([, need]) => need(s)); if (fresh.length) add(fresh[seed % fresh.length][2]());
  const P = s.practice || {}, todo = GAMES.filter(([id]) => (P[id] || {}).last !== day);
  if (todo.length) { const [id, sid, name] = todo[seed % todo.length]; add(`${(P[id] || {}).n ? '今天還沒玩' : '還沒玩過'}：${nameOf(sid)}的「${name}」（每天第一輪答對有鈴錢）`); }
  if (((s.quizcup || {}).d) !== day) add('潮汐考場的「潮汐盃快問快答」：和三位導師比 10 題，每天一次');
  const best = (s.streakQ || {}).best || 0;
  add(best ? `連續挑戰最佳紀錄 ${best} 題：找島民「來考我吧！」挑戰新紀錄` : '找島民「來考我吧！」：答對一題獎金就疊上去，看你能連對幾題');
  return out;
}

let el = null, open = true, H = {};   // H.openMiles：打開潮汐里程（和手機裡同一個，兌換帽子要穿得上）；openMail／openPlanner／openReqs
const data = () => { const s = S(); if (!s.guide) s.guide = { done: {}, fin: !!s.intro }; return s.guide; };   // 已經玩過的存檔（開場介紹看過了）直接略過新手引導

export function init(hooks) {
  H = hooks || {}; el = document.getElementById('quest'); if (!el) return;
  if (H.env) ENV = H.env;
  data();
  el.addEventListener('click', e => {
    if (e.target.closest('.q-toggle')) { open = !open; paint(); return; }
    const a = e.target.closest('[data-act]');
    if (a) { const f = { mail: H.openMail, plan: H.openPlanner, reqs: H.openReqs, vocab: H.openVocab, today: H.openToday }[a.dataset.act]; if (f) { f(); return; } }
    if (data().fin && H.openMiles) H.openMiles();   // 點今日目標：打開完整的潮汐里程
  });
  miles.listen(onEvent);
  setInterval(() => { if (!document.hidden) paint(); }, 15000);   // 潮汐、天色、時段會變：定期重新挑建議
  paint();
}
function onEvent(key) {
  const g = data(); if (g.fin) { paint(); return; }
  const st = STEPS.find(x => x.key === key); if (!st || g.done[key]) { paint(); return; }
  g.done[key] = true; const s = S(); s.bells += REWARD; save(); Audio.sfx('coin');
  ui.toast(`✔ 新手引導：${st.title}（+${REWARD} 鈴錢）`);
  if (STEPS.every(x => g.done[x.key])) {
    g.fin = true; s.bells += FINISH; save();
    setTimeout(() => ui.card({ icon: '', title: '新手引導完成！', sub: `再送你 ${FINISH.toLocaleString()} 鈴錢。<br>之後左上角會列出今天的潮汐里程目標，下面的「現在可以做」會隨時提示島上可以做的事；手機的「島上指南」整理了所有玩法。` }), 900);
  }
  paint();
}
/** 重畫任務欄（main.js 的 paintHud 也會呼叫） */
/** 內容一樣就不重寫（每 2 秒畫一次；整塊重寫會讓手指點到一半的按鈕被換掉） */
const setHTML = h => { if (el.__h !== h) { el.__h = h; el.innerHTML = h; } };
export function paint() {
  if (!el) return;
  const g = data();
  if (!g.fin) {
    const i = STEPS.findIndex(x => !g.done[x.key]), st = STEPS[i], n = STEPS.filter(x => g.done[x.key]).length;
    el.hidden = false; el.classList.toggle('closed', !open);
    setHTML(`<div class="q-head"><b>新手引導 ${n + 1}/${STEPS.length}</b><button type="button" class="q-toggle" aria-label="收合">${open ? '－' : '＋'}</button></div>` +
      (open ? `<div class="q-step">${st.title}</div><small>${st.how()}</small>` : `<div class="q-step">${st.title}</div>`));
    return;
  }
  const m = miles.check(), left = m.tasks.filter(t => !m.done[t.id]).length, next = m.tasks.find(t => !m.done[t.id]);
  const narrow = innerWidth <= 640, tips = suggestions(left ? (narrow ? 1 : 2) : (narrow ? 2 : 3));   // 手機畫面小：少列一則
  el.hidden = false; el.classList.toggle('closed', !open);
  const head = `<div class="q-head"><b>${left ? `今日目標 ${m.tasks.length - left}/${m.tasks.length}` : '今日目標 ✔ 全部完成'}</b><button type="button" class="q-toggle" aria-label="收合">${open ? '－' : '＋'}</button></div>`;
  if (!open) { setHTML(head + (tips[0] ? `<div class="q-now one">💡 ${ui.esc(tips[0].t)}</div>` : '')); return; }
  const goals = left
    ? '<ul>' + m.tasks.map(t => { const p = Math.min(t.need, miles.progress(m, t)); return `<li class="${m.done[t.id] ? 'ok' : ''}">${m.done[t.id] ? '✔' : '○'} ${ui.esc(t.name.replace(/（.*?）/, ''))}${m.done[t.id] || t.need <= 1 ? '' : ` <i>${p}/${t.need}</i>`}</li>`; }).join('') + `</ul>${next && HOW[next.id] ? `<small class="q-how">💡 ${HOW[next.id]()}</small>` : ''}`
    : '<small class="q-done">潮汐里程的獎勵記得兌換（點這裡）</small>';
  const now = tips.length ? `<div class="q-sub">現在可以做</div><ul class="q-now">${tips.map(x => `<li${x.act ? ` data-act="${x.act}" class="act"` : ''}>${ui.esc(x.t)}</li>`).join('')}</ul>` : '';
  setHTML(head + goals + now + (left ? '<small>點這裡看潮汐里程與獎勵</small>' : ''));
}
