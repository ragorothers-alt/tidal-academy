/* 潮汐小島 · 今日路線（v7.1）：一天只有一份清單——一份學習、一件島上的事、一個可選的加碼。
   玩家選今天大概有 20／40／60 分鐘（記住上次的選擇）。學習量用學習分鐘（L.studyMin，和連續學習同一個算法）：一題（含看解析）約 1 分、
   單字卡 4 張約 1 分、專注 1 分鐘算 1 分，非選題依題型折算題數。哪裡的學習都算（島民、每日潮汐、考場、單字燈塔、專注、練習遊戲）；島上的事也是任選：
   釣魚、捉蟲、挖化石、潮池、委託、捐贈、送禮、澆花、撿貝殼、做家具、拍照（潮汐里程的計數）。
   兩步完成就能開寶箱、看今天的收工摘要；選「收工」之後是自由時間。
   安靜（quiet）：收工後、散步模式、專注後的休息時間，以及拒絕一次邀答後的 20 分鐘——島民不主動出題、答對後不邀連答、旅客先問要不要讀題。 */
import { S, save, dayKey } from './state.js';
import * as miles from './miles.js';
import * as cram from './cram.js';

const TA = window.TA, L = TA.L;
export const LENS = [20, 40, 60];
const STUDY = { 20: 10, 40: 20, 60: 35 }, LIFE = { 20: 1, 40: 2, 60: 3 };
const LIFE_KEYS = ['fish', 'bug', 'fossil', 'sea', 'req', 'donate', 'gift', 'water', 'shell', 'craft', 'photo'];
/** 預設時長：上次選的；沒選過就依每日目標題數猜 */
const guess = () => { const g = TA.S.profile.dailyGoal || 30; return g <= 20 ? 20 : g <= 40 ? 40 : 60; };
function data() {
  const s = S(), d = dayKey();
  if (!s.route || s.route.d !== d) s.route = { d, len: 0, asked: false, shut: false, walk: false, extra: false, hush: 0 };
  return s.route;
}
export const len = () => data().len || (L.phase() === 'final' ? 20 : S().routeLen || guess());   // 考前一週沒選時預設短的
export const asked = () => data().asked;
export function setLen(n) { if (!LENS.includes(n)) return; const r = data(); r.len = n; r.asked = true; S().routeLen = n; save(); }
const lifeN = () => LIFE_KEYS.reduce((a, k) => a + miles.count(k), 0);
/** 加碼（可選）：第一個還沒做完的——每日潮汐、單字 20 張、專注 25 分鐘 */
function extraOf(d) {
  if (L.phase() === 'final') return { id: 'rest', name: '考前一週不加碼：早點休息', v: 1, need: 1, rest: true };
  const D = TA.S.daily, idx = D.date === dayKey() ? (D.idx || 0) : 0, n = D.set.length || L.dailySize();
  const list = [
    { id: 'daily', name: `每日潮汐 ${n} 題`, v: D.done ? n : idx, need: n },
    { id: 'vocab', name: '單字 20 張', v: Math.min(20, d.voc || 0), need: 20 },
    { id: 'focus', name: '專注 25 分鐘', v: Math.min(25, d.min || 0), need: 25 },
  ];
  return list.find(x => x.v < x.need) || Object.assign(list[0], { all: true });
}
/** 今天的路線：{ len, study:{v,need}, life:{v,need}, extra:{id,name,v,need}, ready 兩步都完成, chest 已領寶箱, shut 收工, walk 散步模式 } */
export function state() {
  L.pickDaily();   // 換日時先重設每日潮汐（寶箱的領取紀錄跟著它，日期要是今天）
  const r = data(), n = len(), d = L.dayRec(), D = TA.S.daily;
  const ph = L.phase(), cr = !!ph && cram.doneToday();   // 考前 30 天起：做完考前衝刺的 5 題精選就算完成學習
  const study = { v: cr ? Math.max(L.studyMin(d), STUDY[n]) : L.studyMin(d), need: STUDY[n], cram: !!ph }, life = { v: lifeN(), need: LIFE[n] };
  const done = study.v >= study.need && life.v >= life.need;
  const chest = !!D.chest && D.date === dayKey();
  return { len: n, study, life, extra: extraOf(d), done, chest, ready: done && !chest, shut: r.shut, walk: r.walk };
}
/** 加碼完成：一天一次小獎勵（呼叫端負責提示） */
export function claimExtra() { const r = data(), e = extraOf(L.dayRec()); if (r.extra || !e.all || e.rest) return false; r.extra = true; save(); return true; }
export function shut(on) { const r = data(); r.shut = on !== false; save(); }
export function setWalk(on) { const r = data(); r.walk = !!on; save(); }
/** 拒絕一次邀答：全島安靜 min 分鐘（島民主動出題、連答邀請共用） */
export function hush(min) { const r = data(); r.hush = Math.max(r.hush || 0, Date.now() + (min || 20) * 60000); save(); }
const resting = () => { const rr = S().restRun; return !!rr && rr.endAt > Date.now(); };
export const quiet = () => { const r = data(); return r.shut || r.walk || resting() || Date.now() < (r.hush || 0); };
/** 為什麼安靜（任務欄、今日學習顯示） */
export const quietWhy = () => { const r = data(); return r.shut ? '今天收工了，自由時間' : r.walk ? '散步模式' : resting() ? '專注後的休息時間' : Date.now() < (r.hush || 0) ? '島民先不來打擾你' : ''; };
/** 收工摘要的內容（HTML） */
export function summary() {
  if (TA.Store && TA.Store.flush) TA.Store.flush();   // v8.2 先真的寫一次，摘要才知道有沒有存進去
  const d = L.dayRec(), st = state();
  const parts = [d.q ? `答題 ${d.q} 題（答對 ${d.c}）` : '', d.wq ? `非選題折算 ${d.wq} 題` : '', d.voc ? `單字卡 ${d.voc} 張` : '', d.min ? `專注 ${d.min} 分鐘` : ''].filter(Boolean);
  const life = LIFE_KEYS.map(k => [k, miles.count(k)]).filter(([, n]) => n);
  const NAME = { fish: '釣魚', bug: '捉蟲', fossil: '挖化石', sea: '潮池觀察', req: '委託', donate: '捐贈', gift: '送禮', water: '澆花', shell: '撿貝殼', craft: '做家具', photo: '拍照' };
  return `<p class="rt-sum-lead">今天的 ${st.len} 分鐘路線完成了！</p>
    <ul class="wb-list"><li>📚 學習約 <b>${st.study.v}</b> 分鐘：${parts.join('、') || '—'}</li><li>🏝 島上：${life.map(([k, n]) => `${NAME[k]} ${n}`).join('、') || '—'}</li><li>🔥 連續學習 ${L.streakAlive()} 天</li></ul>
    <p class="muted">${TA.Store.ok === false ? '<b>這台裝置暫時存不進進度（空間不足或無痕模式）：先到「設定」匯出備份再離開。</b>' : '進度都存好了，現在離開也沒關係。'}選「收工」之後是自由時間：島民不會主動找你出題、答對後也不邀連答；想練習的時候，找導師「一起練習」或打開手機都可以。</p>`;
}
