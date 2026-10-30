/* 潮汐小島 · 藍眼淚（v8.9.1）：春夏的夜晚，沿岸的海水裡有夜光藻（夜光蟲），浪一拍打就發出藍光——馬祖的「藍眼淚」。
   四到九月才有（五、六月最常見）；每一晚固定（同一晚重新整理也一樣）；月亮越圓，海面越亮、藍光越淡；下雨、颱風天看不到。
   亮度交給 waves.js（碎浪、浪花前緣、海邊的濕腳印）與 fauna.js（魚跳出水面的水花）；傍晚提醒一次，第一次在海邊看到時記進回憶錄。 */
import * as waves from './waves.js';
import * as weather from './weather.js';
import * as ui from './ui.js';
import * as memo from './memo.js';
import { moonAge, SYNODIC } from './astro.js';
import { tileAt } from './terrain.js';
import { S, save } from './state.js';

const CHANCE = [0, 0, 0, 0.3, 0.6, 0.65, 0.5, 0.4, 0.25, 0, 0, 0];   // 一到十二月，每晚出現的機會
const fr = x => x - Math.floor(x), smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 夜晚算在哪一天：凌晨（中午以前）算前一晚 */
function nightOf(date) { const d = new Date(date); if (d.getHours() < 12) d.setDate(d.getDate() - 1); return d; }
const nightKey = date => { const d = nightOf(date); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
/** 這一晚的藍眼淚有多亮（0 = 沒有，最亮 1） */
export function tonight(date) {
  const d = nightOf(date), ch = CHANCE[d.getMonth()]; if (!ch) return 0;
  const r = fr(Math.sin((d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate()) * 78.233) * 43758.5453);
  if (r >= ch) return 0;
  const lit = (1 - Math.cos(2 * Math.PI * moonAge(d) / SYNODIC)) / 2;   // 月相：0 新月、1 滿月
  return (0.65 + 0.35 * fr(r * 9.17)) * (1 - 0.55 * lit);
}
/** 現在的亮度：晚上七點多漸漸亮起，清晨四點多淡去 */
export function level(date, hour) {
  const k = tonight(date); if (!k || weather.raining() || weather.typhoon()) return 0;
  return k * (hour >= 12 ? smooth(19.2, 20.2, hour) : 1 - smooth(3.8, 4.8, hour));
}
/** 站在海邊（沙灘上，或旁邊幾公尺內就是海） */
function nearShore(p) {
  if (tileAt(p.x, p.z) === -1) return true;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; if (tileAt(p.x + Math.sin(a) * 3, p.z + Math.cos(a) * 3) === -1) return true; }
  return false;
}
let cur = 0, warned = '', seen = '';
/** 每格：ctx = { player, date, hour, inside } */
export function update(dt, ctx) {
  cur += ((ctx.inside ? 0 : level(ctx.date, ctx.hour)) - cur) * Math.min(1, dt * 0.6);
  waves.setBlue(cur);
  if (ctx.inside) return;
  const key = nightKey(ctx.date);
  if (warned !== key && ctx.hour >= 18.5 && ctx.hour < 23 && tonight(ctx.date) > 0 && !weather.raining() && !weather.typhoon()) {   // 傍晚提醒一次
    warned = key; ui.toast('🌊 今晚海邊可能看得到藍眼淚：浪一拍上岸，海水就會亮起藍光');
  }
  if (seen !== key && cur > 0.25 && nearShore(ctx.player.position)) {
    seen = key;
    const s = S(); s.blueTears = (s.blueTears || 0) + 1; save();
    if (s.blueTears === 1) memo.add('在海邊看到了藍眼淚', '浪一拍上岸，海水就亮起一點一點的藍光', { key: 'bluetears', icon: '🌊' });
    ui.toast(s.blueTears === 1 ? '浪花在發光！海水裡的夜光藻被浪拍打時會發出藍光，這就是「藍眼淚」' : '今晚的浪又亮起藍光了');
  }
}
/** 現在的亮度（0–1），給魚的水花用 */
export const glow = () => cur;
