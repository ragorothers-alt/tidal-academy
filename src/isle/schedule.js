/* 潮汐小島 · 島民作息表（v8.9，純函式）：依日期與時間算出每位導師現在該做什麼、今天有哪些團體活動。
   資料在 data/routines.js（I.ROUTINES、I.GATHERINGS）；routine.js 依結果讓島民走過去、拿道具、做動作，town.js 用 busyHours() 避開在家時段。 */
const D = () => ((globalThis.TA || {}).ISLE || {});
/** 地點與活動在手機裡的名稱（routine.js 的 PLACES、ACTS 用同一組 key；資料測試也照這兩張表檢查） */
export const PLACE_NAMES = { plazaTree: '廣場大樹下', fountain: '噴泉邊', plazaBench: '廣場長椅', market: '市集', pierEnd: '碼頭盡頭', pier: '碼頭', beach: '海灘', camp: '海灘營地', hotel: '飯店前',
  cape: '東岬', shrine: '山頂祠堂', spring: '高地泉水邊', mill: '水車磨坊', garden: '廣場花台', veggies: '菜園', flowers: '花田', board: '告示牌前', terrace: '學院台地', telescope: '觀星台',
  river: '溪邊', loop: '環島步道', chess: '廣場棋桌', picnic: '南邊草地', nightMarket: '港邊夜市', nightBusk: '夜市東頭' };
export const ACT_NAMES = { read: '讀書', cards: '翻單字卡', write: '寫詩', sketch: '畫地圖', violin: '拉小提琴', sing: '唱歌', tambourine: '打鈴鼓', tinker: '修東西', water: '澆花', observe: '觀察花草',
  look: '看雲看海', stars: '看星星', tea: '喝果茶', cook: '煮湯', stretch: '做早操', chess: '下棋', kite: '放風箏', picnic: '野餐', sunset: '看夕陽', shop: '逛攤位', jog: '慢跑' };
export const gatherings = () => D().GATHERINGS || [];
export const gathering = id => gatherings().find(g => g.id === id) || null;
/** 這個團體活動在星期 day 的名單 */
export const membersOf = (g, day) => (g.byDay ? g.byDay[day] || [] : g.who || []);
/** 這個人在這個團體活動裡做什麼 */
export const actOf = (g, sid) => (typeof g.act === 'string' ? g.act : (g.act || {})[sid] || 'read');
/** 某一天（Date）的團體活動：[{ g, id, from, to, who }]，依開始時間排序 */
export function gatheringsOn(date) {
  const d = date.getDay();
  return gatherings().filter(g => g.days.includes(d)).map(g => ({ g, id: g.id, from: g.from, to: g.to, who: membersOf(g, d) })).sort((a, b) => a.from - b.from);
}
/** 某位導師某一天的行程：團體活動優先，個人作息和團體活動重疊就略過；依時間排序 [{ from, to, place, act, gid }] */
export function dayPlan(sid, date) {
  const R = (D().ROUTINES || {})[sid], d = date.getDay(), wk = d === 0 || d === 6;
  const gs = gatheringsOn(date).filter(x => x.who.includes(sid)).map(x => ({ from: x.from, to: x.to, place: x.g.place, act: actOf(x.g, sid), gid: x.id }));
  const own = ((R && (wk ? R.weekend : R.weekday)) || []).map(([from, to, place, act]) => ({ from, to, place, act, gid: null })).filter(b => !gs.some(g => b.from < g.to && g.from < b.to));
  return gs.concat(own).sort((a, b) => a.from - b.from);
}
/** 這個時間正在進行的那一段（沒有就回傳 null） */
export const blockAt = (sid, date, hour) => dayPlan(sid, date).find(b => hour >= b.from && hour < b.to) || null;
/** 有行程的整點（town.js 排在家時段時避開） */
export function busyHours(sid, date) {
  const s = new Set();
  dayPlan(sid, date).forEach(b => { for (let h = Math.floor(b.from); h < Math.ceil(b.to); h++) s.add(h); });
  return s;
}
/** 時間寫成「7:30」 */
export const clock = h => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
