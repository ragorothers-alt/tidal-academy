/* 潮汐小島 · 月相觀測題產生器（純函式，可在 Node 測試）。
   以 8 個代表月相（月齡 0、3.7、7.4 … 天）出題：看圖認月相、何時在哪個方位看到、亮面朝向、日月食的條件。
   簡化模型：月亮每天約晚 50 分鐘升起；新月約 6 時升起、12 時過中天，上弦約 12 時升起、18 時過中天，以此類推。 */
import { SYNODIC } from './astro.js';

export const PHASES = ['新月', '眉月', '上弦月', '盈凸月', '滿月', '虧凸月', '下弦月', '殘月'];
export const ageOf = i => i * SYNODIC / 8;
/** 月相 i 的升起、過中天、落下時刻（小時，0–24） */
export const times = i => ({ rise: (6 + i * 3) % 24, transit: (12 + i * 3) % 24, set: (18 + i * 3) % 24 });
/** 被照亮的比例 0–1 */
export const lit = age => (1 - Math.cos(2 * Math.PI * age / SYNODIC)) / 2;
/** 北半球看到的亮面：上半月亮在右（西）側，下半月亮在左（東）側 */
export const side = i => (i === 0 || i === 4 ? null : i < 4 ? '右（西）' : '左（東）');
export const hh = h => (h === 0 ? '午夜 12 點' : h < 6 ? `凌晨 ${h} 點` : h === 6 ? '清晨 6 點' : h < 12 ? `上午 ${h} 點` : h === 12 ? '中午 12 點' : h < 18 ? `下午 ${h - 12} 點` : h === 18 ? '傍晚 6 點' : `晚上 ${h - 12} 點`);
const dir = (h, i) => { const t = times(i); if (h === t.rise) return '東方地平線'; if (h === t.transit) return '天空最高處（過中天）'; if (h === t.set) return '西方地平線'; return null; };
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
const shuffle = (a, rnd) => a.map(x => [x, rnd()]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
function opts(ans, pool, rnd) { const o = [ans, ...shuffle(pool.filter(x => x !== ans), rnd).slice(0, 3)]; const s = shuffle(o, rnd); return { opts: s, a: s.indexOf(ans) }; }

export const KINDS = {
  /** 看圖認月相（新月看不到，所以不出新月） */
  picture: rnd => {
    const i = 1 + Math.floor(rnd() * 7);
    return { kind: 'picture', i, age: ageOf(i), q: '圖中是哪一個月相？（北半球觀察）', ...opts(PHASES[i], PHASES.slice(1), rnd),
      why: `${PHASES[i]}：月齡約 ${Math.round(ageOf(i))} 天，${side(i) ? `亮面在${side(i)}側` : '整面都亮'}。北半球看，上半個月（盈）亮面在右，下半個月（虧）亮面在左。` };
  },
  /** 某時刻在某方位看到月亮 → 哪個月相 */
  when: rnd => {
    for (;;) {
      const i = Math.floor(rnd() * 8), t = times(i), h = pick([t.rise, t.transit, t.set], rnd), where = dir(h, i);
      if (i === 0) continue;   // 新月與太陽同升同落，看不到
      if ((h >= 7 && h <= 17) && rnd() < 0.7) continue;   // 多出晚上能觀察的情境
      return { kind: 'when', i, age: null, q: `${hh(h)}，在<b>${where}</b>看到月亮，這時最可能是哪個月相？`, ...opts(PHASES[i], PHASES.slice(1), rnd),
        why: `${PHASES[i]}約 ${hh(t.rise)}升起、${hh(t.transit)}過中天（在天空最高處）、${hh(t.set)}落下。月亮每天約晚 50 分鐘升起，所以月相每前進 1/8，時刻約晚 3 小時。` };
    }
  },
  /** 給月相 → 何時升起或過中天 */
  rise: rnd => {
    const i = pick([2, 4, 6], rnd), t = times(i), what = pick(['rise', 'transit'], rnd), ans = hh(t[what]);
    const pool = [0, 6, 12, 18].map(hh);
    return { kind: 'rise', i, age: ageOf(i), q: `${PHASES[i]}大約在什麼時候${what === 'rise' ? '從東方升起' : '過中天（位於天空最高處）'}？`, ...opts(ans, pool, rnd),
      why: `${PHASES[i]}約 ${hh(t.rise)}升起、${hh(t.transit)}過中天、${hh(t.set)}落下。記法：滿月和太陽相對（太陽下山時升起）；上弦月比滿月早 6 小時、下弦月晚 6 小時。` };
  },
  /** 日月食發生在哪個月相 */
  eclipse: rnd => {
    const solar = rnd() < 0.5, ans = solar ? '新月' : '滿月';
    return { kind: 'eclipse', i: solar ? 0 : 4, age: null, q: `${solar ? '日食' : '月食'}只可能發生在哪個月相？`, ...opts(ans, ['新月', '上弦月', '滿月', '下弦月'], rnd),
      why: solar ? '日食是月球擋住太陽，太陽、月球、地球依序排成一直線，此時是新月（朔）。白道與黃道約有 5° 夾角，所以不是每次新月都有日食。'
        : '月食是月球進入地球的影子，太陽、地球、月球依序排成一直線，此時是滿月（望）。白道與黃道約有 5° 夾角，所以不是每次滿月都有月食。' };
  }
};
export function question(rnd = Math.random, kind) { return KINDS[kind || pick(Object.keys(KINDS), rnd)](rnd); }
