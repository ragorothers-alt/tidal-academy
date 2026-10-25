/* 潮汐小島 · 導師研究計畫：好感度 4 以上，和導師聊天選「研究計畫」。每位導師三個階段，各有三道門檻——
   好感度、該科的學習成果（答對題數 → 單元試煉星等 → 熟練題數）、鈴錢資助；達成並資助後播放研究劇情、送研究家具。
   劇情與家具在 data/research.js、data/researchfurn.js。進度存在 S().lab[sid] = { stage 完成到第幾階段, seen 聽過介紹, at 完成時間 }。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';

const TA = window.TA, L = TA.L;
export const OPEN_AT = 4;   // 好感度 4（第一段心事之後）開始可以聊研究計畫
/** 三個階段的門檻：好感度、學習成果、鈴錢。熟練＝同一題在不同天都答對、排到間隔複習第 4 格，第三階段至少要兩三週 */
export const STAGES = [
  { fr: 8, bells: 2000, study: { k: 'correct', n: 30 } },
  { fr: 14, bells: 5000, study: { k: 'stars', n: 3, min: 2 } },
  { fr: 20, bells: 10000, study: { k: 'mastered', n: 40 } },
];
const subjName = sid => (TA.subject(sid) || {}).name || '';
/** 學習成果：這一科累計答對題數、單元試煉達到星等的單元數、熟練題數 */
export function studyHave(sid, st) {
  const q = TA.S.q || {};
  if (st.k === 'stars') return Object.keys(L.UNITS).filter(u => L.UNITS[u].subject === sid && (((TA.S.units || {})[u] || {}).stars || 0) >= st.min).length;
  let n = 0;
  for (const id in q) { if ((L.Q[id] || {}).subject !== sid) continue; n += st.k === 'correct' ? (q[id].c || 0) : q[id].s >= L.MASTER_BOX ? 1 : 0; }
  return n;
}
const studyText = (sid, st) => st.k === 'correct' ? `累計答對${subjName(sid)}題目` : st.k === 'stars' ? `${subjName(sid)}單元試煉 ${st.min} 星以上` : `熟練的${subjName(sid)}題目`;
const studyUnit = st => st.k === 'stars' ? ' 個單元' : ' 題';
const studyHint = st => st.k === 'correct' ? '「來考我吧」、潮汐考場、每日潮汐裡這一科的題目都算。'
  : st.k === 'stars' ? '到潮汐考場打開航海圖，挑這一科的單元試煉：10 題答對 8 題以上就是 2 星。'
  : '同一題要在不同天都答對、排到間隔複習的第 4 格才算熟練——每日潮汐和島民出題會幫你排好複習，慢慢累積就好。';
const rec = sid => { const s = S(); s.lab = s.lab || {}; return (s.lab[sid] = s.lab[sid] || { stage: 0, seen: 0, at: [] }); };
export const stageOf = sid => ((S().lab || {})[sid] || {}).stage || 0;
export const available = v => !!(I.RESEARCH || {})[v.sid] && ((S().fr || {})[v.sid] || 0) >= OPEN_AT;
/** 下一個階段的門檻檢查（三個階段都完成時回傳 null） */
export function check(v) {
  const k = stageOf(v.sid), st = STAGES[k]; if (!st) return null;
  const fr = (S().fr || {})[v.sid] || 0, have = studyHave(v.sid, st.study), bells = S().bells || 0;
  const frOK = fr >= st.fr, studyOK = have >= st.study.n, bellsOK = bells >= st.bells;
  return { k, st, fr, have, bells, frOK, studyOK, bellsOK, ready: frOK && studyOK && bellsOK };
}
export const ready = v => available(v) && !!(check(v) || {}).ready;
export const menuLabel = v => '研究計畫' + (stageOf(v.sid) >= 3 ? '（已完成）' : ready(v) ? '（可以推進了！）' : '');
const reqLines = (v, c) => [
  `${c.frOK ? '✔' : '✘'} ${v.name}的好感度 ${Math.min(c.fr, c.st.fr)} / ${c.st.fr}`,   // 不寫「和弦的…」：數學導師叫弦
  `${c.studyOK ? '✔' : '✘'} ${studyText(v.sid, c.st.study)} ${Math.min(c.have, c.st.study.n)} / ${c.st.study.n}${studyUnit(c.st.study)}`,
  `${c.bellsOK ? '✔' : '✘'} 研究經費 ${c.st.bells.toLocaleString()} 鈴錢（你有 ${c.bells.toLocaleString()}）`,
];

/** 和導師聊研究計畫。H：{ giveFurn(id, sub), paint() } */
export async function talk(v, sp, H) {
  const R = (I.RESEARCH || {})[v.sid]; if (!R) return;
  const r = rec(v.sid);
  if (!r.seen) { r.seen = Date.now(); save(); for (const line of R.pitch) await ui.say(sp, line); }
  if (r.stage >= 3) { await ui.say(sp, `「${R.title}」已經完成了。${R.done[R.done.length - 1]}`); return; }
  const c = check(v), st = R.stages[r.stage];
  await ui.say(sp, `「${R.title}」第 ${r.stage + 1} 階段：${st.title}。${st.goal}`);
  if (!c.ready) {
    await ui.say(sp, `這個階段還需要：<br>${reqLines(v, c).join('<br>')}`, { html: true });
    if (!c.studyOK) await ui.say(sp, studyHint(c.st.study));
    else if (!c.frOK) await ui.say(sp, '多來找我聊天、一起讀書吧，我們會越來越有默契的。');
    else await ui.say(sp, '研究經費還不夠……釣魚、捉蟲、答題都能存到鈴錢，不急喔。');
    return;
  }
  const i = await ui.ask(sp, `條件都齊了：<br>${reqLines(v, c).join('<br>')}<br>要資助這個階段的研究嗎？`, [`資助 ${c.st.bells.toLocaleString()} 鈴錢，開始研究`, '下次再說'], { html: true, keys: true });
  if (i !== 0) { await ui.say(sp, '好，等你準備好再一起做。'); return; }
  S().bells -= c.st.bells; r.stage++; r.at.push(Date.now()); save(); Audio.sfx('coin');
  await ui.card({ icon: '', title: `🔬 研究計畫 · ${R.title}`, sub: `第 ${r.stage} 階段：${st.title}` });
  for (const line of st.lines) await ui.say(sp, line);
  if (st.furn) await H.giveFurn(st.furn, `${v.name}的研究成果（第 ${r.stage} 階段）`);
  if (r.stage >= 3) { for (const line of R.done) await ui.say(sp, line); ui.toast(`🎓 完成了${v.name}的研究計畫「${R.title}」！`); }
  L.checkAch(); if (H.paint) H.paint();
}

/** 手機「研究計畫」：十位導師的計畫、階段與下一步的門檻 */
export function openBook(villagers) {
  const body = ui.el('div', 'lab');
  const vs = villagers.filter(v => (I.RESEARCH || {})[v.sid]);
  const done = vs.filter(v => stageOf(v.sid) >= 3).length;
  body.appendChild(ui.el('p', 'muted', `完成 ${done} / ${vs.length} 個研究計畫。和導師的好感度到 ${OPEN_AT} 以後，聊天時選「研究計畫」；每個階段要好感度、這一科的學習成果，再加上研究經費。`));
  vs.forEach(v => {
    const R = I.RESEARCH[v.sid], k = stageOf(v.sid), fr = (S().fr || {})[v.sid] || 0, open = fr >= OPEN_AT, c = check(v);
    const dots = [0, 1, 2].map(j => `<i class="${j < k ? 'on' : ''}"></i>`).join('');
    const next = !open ? `<small>好感度 ${fr} / ${OPEN_AT} 時，${ui.esc(v.name)}會跟你說這個計畫</small>`
      : !c ? `<small class="ok">研究完成！得到三件研究家具</small>`
      : `<small>第 ${k + 1} 階段「${ui.esc(R.stages[k].title)}」：${reqLines(v, c).map(t => `<span class="${t[0] === '✔' ? 'ok' : ''}">${ui.esc(t)}</span>`).join('')}</small>${c.ready ? `<em>可以推進了！找${ui.esc(v.name)}聊天</em>` : ''}`;
    body.appendChild(ui.el('div', 'ph-row lab-row' + (c && c.ready ? ' ready' : ''), `<span class="av" style="--c:${v.color}">${v.sub.short || ''}</span><div><b>${ui.esc(v.name)} <small>${open ? '「' + ui.esc(R.title) + '」' : '？？？'}</small><span class="lab-dots">${dots}</span></b>${next}</div>`));
  });
  ui.panel('研究計畫', body, { cls: 'phone' });
}
/** 任務欄提示用：第一位可以推進研究的導師 */
export const firstReady = villagers => villagers.find(v => ready(v)) || null;
