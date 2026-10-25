/* 潮汐小島 · 存檔與物品：口袋、圖鑑、博物館、好感度、每日重置。存在同一份存檔裡（TA.S.isle）。 */
/** 今天的日期字串（本地時間 YYYY-MM-DD）；quiz.js 也會轉出同一個函式 */
export const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

import { watch } from './ledger.js';
const TA = window.TA;
export const I = TA.ISLE = TA.ISLE || {};
export const POCKET_N = 20;
export const KINDS = { fish: '魚', bug: '蟲', fossil: '化石', sea: '潮池生物', mineral: '礦物' };

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const OBJ = ['garden', 'stars', 'mats', 'miles', 'plan', 'wordle', 'tablets', 'cram', 'settings', 'guests', 'room', 'design', 'closet', 'look', 'tot', 'typhoonTalk', 'afterTalk', 'quizcup', 'diyDay', 'tidePools', 'wisp', 'homeVisit', 'tourney', 'ev', 'fr', 'frDay', 'storage', 'milestones', 'stats', 'relocate', 'bond', 'giftDay', 'bdayDone', 'tips', 'rating', 'gemDay', 'genePractice', 'cupDay', 'elements', 'practice'];
const ARR = ['recipes', 'foods', 'spots', 'reqs', 'mail', 'papers', 'vgifts'];
const NULLOBJ = ['focusRun', 'buff'];
const num = v => typeof v === 'number' && isFinite(v);
let checked = null;
/** 舊存檔或匯入的存檔可能缺欄位或型別錯誤：統一在這裡修正（每份存檔物件只檢查一次） */
function normalize(d) {
  OBJ.forEach(k => { if (k in d && !isObj(d[k])) delete d[k]; });
  ARR.forEach(k => { if (k in d && !Array.isArray(d[k])) delete d[k]; });
  NULLOBJ.forEach(k => { if (k in d && d[k] !== null && !isObj(d[k])) delete d[k]; });
  const g = d.garden; if (g) { if (!isObj(g.plants)) g.plants = {}; if (!Array.isArray(g.bag)) g.bag = []; if (!isObj(g.book)) g.book = {}; Object.keys(g.plants).forEach(k => { const p = g.plants[k]; if (!isObj(p) || typeof p.g !== 'string' || !num(p.st)) delete g.plants[k]; }); g.bag = g.bag.filter(b => isObj(b) && typeof b.g === 'string'); }
  if (d.stars) { if (!isObj(d.stars.book)) d.stars.book = {}; if (!num(d.stars.frag)) d.stars.frag = 0; }
  if (d.mats) Object.keys(d.mats).forEach(k => { if (!num(d.mats[k])) d.mats[k] = 0; });
  if (d.miles) { const m = d.miles; if (!num(m.pts)) m.pts = 0; if (!num(m.life)) m.life = 0; if (!isObj(m.got)) m.got = {}; if (!Array.isArray(m.tasks) || !isObj(m.cnt) || !isObj(m.done)) delete m.d; }
  if (d.plan) { if (!isObj(d.plan.days)) delete d.plan; else { if (!num(d.plan.target)) d.plan.target = 10; if (!isObj(d.plan.done)) d.plan.done = {}; Object.keys(d.plan.days).forEach(k => { if (!Array.isArray(d.plan.days[k])) d.plan.days[k] = []; }); } }
  if (d.wordle && !Array.isArray(d.wordle.guesses)) delete d.wordle;
  if (d.tablets && !isObj(d.tablets.done)) delete d.tablets;
  if (d.cram && !isObj(d.cram.check)) delete d.cram;
  if (d.focusRun && (!num(d.focusRun.endAt) || !num(d.focusRun.total) || !num(d.focusRun.min))) delete d.focusRun;
  if (d.buff && (!num(d.buff.until) || typeof d.buff.type !== 'string')) delete d.buff;
  if (d.stats) Object.keys(d.stats).forEach(k => { if (!num(d.stats[k]) || d.stats[k] < 0) delete d.stats[k]; });
  if (d.practice) Object.keys(d.practice).forEach(k => { const p = d.practice[k]; if (!isObj(p) || !num(p.n) || !num(p.ok) || !num(p.tot) || !num(p.days)) delete d.practice[k]; });
  if (d.settings) { d.settings.lowPerf = !!d.settings.lowPerf; d.settings.ultra = !!d.settings.ultra; d.settings.music = d.settings.music !== false; }
}
export function S() {
  const s = TA.S;
  if (!isObj(s.isle)) s.isle = {};
  const d = s.isle;
  if (checked !== d) { checked = d; normalize(d); watch(d); }   // 鈴錢帳本：bells 換成存取器（ledger.js）
  if (typeof d.bells !== 'number') d.bells = 1000;
  if (!Array.isArray(d.pockets)) d.pockets = Array(POCKET_N).fill(null);
  else if (d.pockets.length !== POCKET_N) { const items = d.pockets.filter(Boolean).slice(0, POCKET_N); d.pockets = items.concat(Array(POCKET_N - items.length).fill(null)); }   // 格數對不上（舊版或匯入的存檔）：東西往前排、補空格，不整包清空
  d.dex = Object.assign({ fish: {}, bug: {}, fossil: {}, sea: {}, mineral: {} }, d.dex || {});
  d.museum = Object.assign({ fish: {}, bug: {}, fossil: {}, sea: {}, mineral: {} }, d.museum || {});
  d.fr = d.fr || {}; d.frDay = d.frDay || {}; d.spots = d.spots || []; d.tips = d.tips || {};
  return d;
}
export const save = () => TA.Store.save();
/** 練習遊戲的紀錄（練習護照用）：輪數、答對／題數、練習天數 */
export function practiced(id, right, total) {
  const s = S(); s.practice = s.practice || {};
  const p = s.practice[id] = s.practice[id] || { n: 0, ok: 0, tot: 0, days: 0, last: '' };
  p.n++; p.ok += right; p.tot += total; const d = dayKey(); if (p.last !== d) { p.last = d; p.days++; }
}

/* ---------- 物種 ---------- */
export const list = k => (k === 'fish' ? I.FISH : k === 'bug' ? I.BUGS : k === 'sea' ? I.SEALIFE : k === 'mineral' ? I.MINERALS : k === 'food' ? I.FOODS : I.FOSSILS) || [];
export const find = (k, id) => list(k).find(x => x.id === id);
export function itemName(it) { if (!it) return ''; if (it.k === 'unk') return '未鑑定的化石'; if (it.k === 'ore') return '未鑑定的礦石'; if (it.k === 'pkg') return '要送出的筆記本'; const sp = find(it.k, it.id); return sp ? sp.name : it.id; }
export function itemPrice(it) { if (it.k === 'unk') return 100; if (it.k === 'ore') return 150; if (it.k === 'pkg') return 0; const sp = find(it.k, it.id); return sp ? sp.price : 0; }
/** 目前時間／月份出沒的物種，依稀有度加權抽一個 */
const W = [0, 10, 6, 3, 1.2, 0.4], WL = [0, 10, 8, 6, 3.5, 1.5];
/** 天氣（由 weather 模組更新）：下雨時才會出現 weather: 'rain' 的生物，空中的蟲會躲起來 */
export const env = { rain: false, luck: false };
export function available(k, where, d) {
  d = d || new Date(); const h = d.getHours() + d.getMinutes() / 60, m = d.getMonth() + 1;
  return list(k).filter(sp => (sp.weather !== 'rain' || env.rain) && !(env.rain && sp.where === 'air' && !sp.weather) && (!where || [].concat(where).includes(sp.where)) && (!sp.months || sp.months.includes(m)) && (!sp.hours || sp.hours.some(([a, b]) => h >= a && h < b)));
}
export function roll(k, where) {
  const pool = available(k, where); if (!pool.length) return null;
  const f = S().feel, lv = f && f.d === dayKey() ? f.n || 0 : 0;   // 手感（feel.js）：每級讓三星以上的權重多 12%
  const w = sp => ((env.luck ? WL : W)[sp.rarity] || 1) * (sp.rarity >= 3 ? 1 + lv * 0.12 : 1);
  const sum = pool.reduce((a, sp) => a + w(sp), 0);
  // 夜裡物種少、普通的都不出來時，稀有的比例不該暴增：總權重至少要有當天中午的量，不足的部分算給目前最普通的幾種
  const noon = new Date(); noon.setHours(12, 0, 0, 0);
  const ref = available(k, where, noon).reduce((a, sp) => a + ((env.luck ? WL : W)[sp.rarity] || 1), 0);
  let r = Math.random() * Math.max(sum, ref);
  for (const sp of pool) { r -= w(sp); if (r <= 0) return sp; }
  const low = Math.min(...pool.map(sp => sp.rarity || 1)), commons = pool.filter(sp => (sp.rarity || 1) === low);
  return commons[Math.floor(Math.random() * commons.length)];
}

/* ---------- 口袋 ---------- */
export function addItem(it) { const s = S(), i = s.pockets.findIndex(x => !x); if (i < 0) return false; s.pockets[i] = it; save(); return true; }
export function removeAt(i) { const s = S(), it = s.pockets[i]; s.pockets[i] = null; save(); return it; }
export const freeSlots = () => S().pockets.filter(x => !x).length;

/* ---------- 圖示：Codex 像素圖示，沒有時用表情符號替代 ---------- */
const cache = {};
const EMOJI = { fish: '🐟', bug: '🦋', fossil: '🦴', unk: '🪨', rod: '🎣', net: '🥅', shovel: '🪏', can: '🚿', branch: '🪵', stone: '🪨', shell: '🐚', fruit: '🍊', iron: '🔩', star: '⭐', bottle: '🍾', recipe: '📜', moon: '🌕', bells: '💰', heart: '💗' };
export function icon(id, k) {
  if (I.ICONS && I.ICONS[id]) return I.ICONS[id];
  const key = k + ':' + id; if (cache[key]) return cache[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  c.font = '44px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(EMOJI[id] || EMOJI[k] || '❓', 32, 36);
  return (cache[key] = cv.toDataURL());
}
export const itemIcon = it => it.k === 'unk' ? icon('fossil_unknown', 'unk') : it.k === 'ore' ? icon('ore_unknown', 'unk') : it.k === 'pkg' ? icon('ticket', 'pkg') : icon(it.id, it.k);

/* ---------- 每日 ---------- */
export function newDay(onNew) {
  const s = S(), k = dayKey();
  if (s.day !== k) { s.day = k; s.frDay = {}; s.spots = []; onNew && onNew(); save(); return true; }
  return false;
}
export const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
export const fmtHours = sp => !sp.hours ? '全天' : sp.hours.map(([a, b]) => (a === 0 && b === 24 ? '全天' : `${a}–${b} 時`)).join('、');
export const fmtMonths = sp => !sp.months || sp.months.length === 12 ? '全年' : sp.months.join('、') + ' 月';
export const WHERE = { sea: '海', river: '河', pond: '池塘', pier: '碼頭', flower: '花上', tree: '樹上', ground: '地面', air: '空中', rock: '岩石', water: '水面', beach: '沙灘', pool: '潮池', mud: '泥灘' };
const SEAWHERE = { pool: '潮池', rock: '潮池岩石', mud: '泥灘' };
/** 出沒地點名稱（潮池生物的 rock 是潮池邊的岩石） */
export const whereName = (k, x) => ((k === 'sea' ? SEAWHERE : WHERE)[x.where] || '');
