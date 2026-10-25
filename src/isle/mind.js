/* 潮汐小島 · 島民的心思：用 laya（不生成文字、一次就給出選擇的決策引擎）讓島民自己決定接下來做什麼。
   每隔一段時間，把外面島民的情況（個性、季節時間天氣、在哪裡、身邊有誰、玩家多遠、剛剛做了什麼）一次送出，
   拿回「接下來想做什麼」「心情」「想不想主動找玩家」的機率；島民做完上一件事、要選下一步時，
   main.js 會在目前做得到的事情裡依這些機率挑一件（不是每次都挑最高的那件，島上才不會大家做一樣的事）。
   laya 透過開發伺服器（tools/serve.py）的 /api/laya/ 轉送，API key 只在伺服器端；
   連不上（例如網頁版、伺服器沒開）時不送任何東西，島民照原本的方式隨意走動。 */
import * as weather from './weather.js';
import * as seasons from './seasons.js';
import { I, S } from './state.js';

/** 島民可以選的事（key → 給 laya 看的說明、做這件事時頭上冒出的小圖示） */
export const ACTIONS = {
  stroll: ['在島上隨意散步、到處看看', '🚶'],
  plaza: ['到廣場大樹下，和大家待在一起', '🌳'],
  bench: ['找一張長椅坐下來休息、看風景', '🪑'],
  flowers: ['去花叢邊看花、聞花香', '🌸'],
  water: ['到小溪或海邊看水、吹海風', '🌊'],
  friend: ['去找另一位島民聊天', '💬'],
  player: ['走過去和玩家打招呼', '👋'],
  hobby: ['待在原地做自己喜歡的事', '🎵']
};
export const MOODS = { happy: ['開心、有活力', '😊'], calm: ['平靜、悠閒', '😌'], sleepy: ['有點睏', '💤'], lonely: ['有點寂寞、想找人說話', '🥺'], curious: ['好奇、想到處看看', '👀'] };
const crit = o => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'player').map(([k, [d]]) => [k, d]));   // 「走過來打招呼」不放進選項：情況描述提到玩家時，模型會一面倒選它；改由 greet 這題決定
const QUESTIONS = {
  action: { type: 'choice', instructions: '依照這位島民的個性與現在的情況，接下來幾分鐘他最想做哪一件事？', criteria: crit(ACTIONS) },
  mood: { type: 'choice', instructions: '這位島民現在的心情？', criteria: crit(MOODS) },
  greet: { type: 'noul', instructions: '這位島民現在想主動走過去跟玩家說話嗎？' }
};
const API = 'api/laya/', EVERY = 12, STALE = 90, PER_CALL = 16;

let online = null, busy = false, nextAt = 0, probeAt = 0, fails = 0, noProxy = false;
const plans = new Map();   // sid → { probs, mood, greet, at, used }
export const enabled = () => (S().settings || {}).laya !== false;
/** null：還沒試過；true：連得上；false：連不上 */
export const status = () => online;

export async function probe() {
  try { const r = await fetch(API + 'health', { cache: 'no-store' }); noProxy = r.status === 404 || r.status === 403;   // 沒有轉送（網頁版）或轉送只給本機用（區網裝置）：不再自動重試
  online = r.ok && (await r.json()).status === 'ok'; }
  catch (e) { online = false; }
  fails = online ? 0 : fails + 1;
  return online;
}
/** 連不上時多久再試：沒有轉送（網頁版，404）就不再自動試；伺服器暫時連不上就 1、2、5、10 分鐘慢慢拉長（打開設定會立刻重試） */
const retryIn = () => (noProxy ? Infinity : [60, 120, 300, 600][Math.min(fails, 4) - 1] || 60);

const PAST = { stroll: '在島上散步', plaza: '在廣場大樹下', bench: '坐在長椅上休息', flowers: '在花叢邊看花', water: '在水邊吹海風', friend: '和其他島民聊天', player: '和玩家打招呼', hobby: '在做自己喜歡的事' };
const PART = h => (h < 5 ? '深夜' : h < 11 ? '早上' : h < 13 ? '中午' : h < 17 ? '下午' : h < 19 ? '傍晚' : '晚上');
const WX = { clear: '晴天', cloudy: '多雲', rain: '下著雨', storm: '颳著暴風雨' };
const persona = v => v.persona || ((I.VILLAGERS || []).find(x => x.sid === v.sid) || {}).persona || '';
/** 給 laya 看的一段情況描述（ctx 由 main.js 提供：時間、這個島民在哪、身邊有誰、玩家多遠） */
function describe(v, ctx) {
  const h = ctx.hour, near = ctx.nearby(v), last = (v.mind && PAST[v.mind.act]) || '在家附近走走';
  return `島民：${v.name}。個性：${persona(v)}\n`
    + `現在是${seasons.NAMES[seasons.current()]}天的${PART(h)} ${Math.floor(h)} 點，${WX[weather.now] || '晴天'}。\n`
    + `他現在在${ctx.place(v)}，${near.length ? '身邊有' + near.join('、') : '身邊沒有別人'}。`
    + `玩家在 ${Math.round(ctx.playerDist(v))} 公尺外${ctx.talkedRecently(v) ? '，剛剛才和他聊過天' : ''}。`
    + `他剛剛${last}${v.mind && v.mind.mood ? '，心情' + MOODS[v.mind.mood][0] : ''}。`;
}

/** 每幀呼叫：時間到了就替外面的島民一起問一次（背景進行，不擋畫面） */
export function update(now, list, ctx) {
  if (!enabled()) return;
  if (online !== true) { if (now >= probeAt) { probeAt = Infinity; probe().then(() => { probeAt = now + retryIn(); }); } return; }
  if (busy || now < nextAt || !list.length) return;
  nextAt = now + EVERY;
  const vs = list.slice().sort((a, b) => ctx.playerDist(a) - ctx.playerDist(b)).slice(0, PER_CALL);   // 離玩家近的先問
  const items = vs.map(v => ({ state: { body: describe(v, ctx) }, questions: QUESTIONS }));
  busy = true;
  fetch(API + 'predict_batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('laya ' + r.status))))
    .then(j => (j.results || []).forEach((res, i) => {
      const a = res && res.answers; if (!a || !a.action || !a.action.probabilities) return;
      plans.set(vs[i].sid, { probs: a.action.probabilities, mood: a.mood && a.mood.choice, greet: a.greet ? a.greet.noul : 0, at: now, used: false });
    }))
    .catch(() => { online = false; fails = 1; probeAt = now + 60; })   // 斷線：一分鐘後再試，這段時間島民照原本的方式走動
    .finally(() => { busy = false; });
}

/** 島民要選下一步時拿一次決定（每個決定只用一次；太舊或沒有就回 null，照原本的方式走） */
export function take(v, now) {
  const p = plans.get(v.sid);
  if (!enabled() || !p || p.used || now - p.at > STALE) return null;
  p.used = true; return p;
}
/** 在做得到的事情裡依機率挑一件（機率稍微攤平一點，常見的選擇多、少見的偶爾也會出現）；
    想找玩家另外判斷：機率是 greet（0–1）× 0.7，愛社交的島民比較常走過來 */
export function pick(probs, feasible, greet) {
  if (feasible.player && Math.random() < (greet || 0) * 0.7) return 'player';
  const keys = Object.keys(ACTIONS).filter(k => k !== 'player' && feasible[k]);
  if (!keys.length) return null;
  const w = keys.map(k => Math.pow(Math.max(probs[k] || 0, 0), 0.6) + 0.03), sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < keys.length; i++) { r -= w[i]; if (r <= 0) return keys[i]; }
  return keys[keys.length - 1];
}
