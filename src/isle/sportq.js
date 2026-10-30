/* 潮汐小島 · 島嶼運動會的物理題產生器（純函式，可在 Node 測試）：
   短跑問平均速率、加速度、等加速度的位移與時間；擲沙包問射程 R = v² · sin 2θ ÷ g、最遠的仰角、互餘的仰角；拔河問合力、F = ma、最大靜摩擦力與牛頓第三定律。
   每題 { kind, text, opts, a, why }；opts 有四個、不重複，答案由計算得出。比賽本身的運動（跑步的 x(t)、沙包的拋物線）也在這裡算。 */
export const G = 9.8;
const ri = (a, b, rnd) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
const fix = v => String(Math.round(v * 10) / 10);   // 一位小數，整數不帶 .0
const shuffle = (ans, wrongs, rnd, fmt = x => x) => {
  const set = [ans]; wrongs.forEach(w => { if (w != null && !set.includes(w) && set.length < 4) set.push(w); });
  for (let k = 1; set.length < 4; k++) { const w = typeof ans === 'number' ? Math.round((ans + k * (k % 2 ? 1.5 : -1.1)) * 10) / 10 : ans + k; if (!set.includes(w) && (typeof w !== 'number' || w > 0)) set.push(w); }
  const o = set.map(x => [x, rnd()]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
  return { opts: o.map(fmt), a: o.indexOf(ans) };
};
const num = (v, wrongs, rnd, unit) => shuffle(Math.round(v * 10) / 10, wrongs.map(w => (w > 0 ? Math.round(w * 10) / 10 : null)), rnd, x => `${fix(x)} ${unit}`);

/* ---------- 跑步：先等加速度、到極速後等速 ---------- */
/** 從靜止起跑（加速度 acc、極速 top）跑完 d 公尺要幾秒 */
export function runTime(acc, top, d) { const ta = top / acc, da = top * top / (2 * acc); return da >= d ? Math.sqrt(2 * d / acc) : ta + (d - da) / top; }
/** t 秒時跑到哪裡 */
export function runAt(acc, top, t) { const ta = top / acc; return t <= ta ? 0.5 * acc * t * t : top * ta / 2 + top * (t - ta); }
export const RUN = {
  avg: rnd => { const v = pick([3, 4, 5, 6], rnd), t = pick([2, 3, 4, 5], rnd), d = v * t;
    return { kind: 'avg', text: `一位選手 ${t} 秒跑了 ${d} 公尺，平均速率是多少？`, ...num(v, [d * t, t / d * 10, d + t], rnd, 'm/s'), why: `平均速率 = 路程 ÷ 時間 = ${d} ÷ ${t} = ${v} m/s。` }; },
  acc: rnd => { const a = pick([1.5, 2, 2.5, 3], rnd), t = pick([2, 3, 4], rnd), v = a * t;
    return { kind: 'acc', text: `從靜止起跑，${t} 秒後速率達到 ${fix(v)} m/s。這段時間的平均加速度是多少？`, ...num(a, [v * t, v, t / v * 10], rnd, 'm/s²'), why: `加速度 = 速度的變化 ÷ 時間 = (${fix(v)} − 0) ÷ ${t} = ${fix(a)} m/s²。` }; },
  dist: rnd => { const a = pick([2, 3, 4], rnd), t = pick([2, 3], rnd), s = a * t * t / 2;
    return { kind: 'dist', text: `從靜止以 ${a} m/s² 的加速度起跑（等加速度），前 ${t} 秒跑了多遠？`, ...num(s, [a * t * t, a * t, a * t / 2], rnd, 'm'), why: `等加速度從靜止出發：s = ½at² = ½ × ${a} × ${t}² = ${fix(s)} m（別忘了 ½）。` }; },
  time: rnd => { const a = pick([2, 2.5, 4, 5], rnd), v = pick([5, 6, 8, 10], rnd), t = v / a; if (!Number.isInteger(t * 10)) return RUN.time(rnd);
    return { kind: 'time', text: `加速度是 ${fix(a)} m/s²、最快能跑 ${v} m/s。從靜止起跑，幾秒後達到最快速率？`, ...num(t, [v * a, a / v * 10, v - a], rnd, '秒'), why: `t = 速度的變化 ÷ 加速度 = ${v} ÷ ${fix(a)} = ${fix(t)} 秒。` }; }
};
/** 跑完以後：用這場比賽的數據出一題（某位跑者跑完 d 公尺用了 T 秒的平均速率） */
export function afterRun(name, d, T, top, rnd) {
  T = Math.round(T * 100) / 100; const v = d / T;   // 時間照計分板寫到小數第二位，答案用同一個數字算
  return { kind: 'race', text: `${name}跑完 ${d} 公尺用了 ${T} 秒。整段的平均速率大約是多少？`, ...num(v, [top, T / d * 10, d * T / 10], rnd, 'm/s'), why: `平均速率 = ${d} ÷ ${T} ≈ ${fix(v)} m/s；比最快時的 ${fix(top)} m/s 慢，因為起跑那一段還在加速。` };
}

/* ---------- 擲沙包：忽略空氣阻力、同一高度落地 ---------- */
export const range = (v, deg) => v * v * Math.sin(2 * deg * Math.PI / 180) / G;
export const THROW = {
  best: rnd => { const o = shuffle(45, [30, 60, 75, 15], rnd, x => `${x}°`);
    return { kind: 'best', text: '初速一樣、忽略空氣阻力、從同一個高度丟出去也落回同一個高度：仰角多少時沙包飛得最遠？', ...o, why: '射程 R = v² · sin 2θ ÷ g，sin 2θ 在 2θ = 90°、也就是 θ = 45° 時最大。' }; },
  pair: rnd => { const t = pick([15, 20, 30, 35], rnd), ans = 90 - t, o = shuffle(ans, [45, 2 * t, 60, 30, 75, 15].filter(x => x !== t), rnd, x => `${x}°`);   // 干擾項：最遠的 45°、兩倍的角度
    return { kind: 'pair', text: `用某個初速、仰角 ${t}° 丟出的沙包落在某處。初速不變，還有哪一個仰角會落在同一個地方？`, ...o, why: `sin 2θ 在 2θ 和 180° − 2θ 時一樣大：${t}° 和 ${ans}° 互餘（加起來 90°），射程相同。` }; },
  far: rnd => { const v = pick([6, 7, 8, 9, 10], rnd), R = range(v, 45);
    return { kind: 'far', text: `初速 ${v} m/s、仰角 45° 丟出沙包（g = 9.8 m/s²，忽略空氣阻力），大約飛多遠？`, ...num(R, [2 * R, v / G * 10, v * v / 2 / G], rnd, 'm'), why: `R = v² · sin 90° ÷ g = ${v}² ÷ 9.8 ≈ ${fix(R)} m。` }; }
};
/** 沙包的位置：出手後 t 秒（x 往前、y 往上，從出手點算） */
export function bagAt(v, deg, t) { const th = deg * Math.PI / 180; return [v * Math.cos(th) * t, v * Math.sin(th) * t - 0.5 * G * t * t]; }
export const flight = (v, deg) => 2 * v * Math.sin(deg * Math.PI / 180) / G;

/* ---------- 拔河：力與運動 ---------- */
export const TUG = {
  net: rnd => { const F1 = pick([300, 350, 400, 450], rnd), F2 = F1 - pick([50, 100, 150], rnd), d = F1 - F2;
    const o = shuffle(`${d} N，往甲隊那邊`, [`${F1 + F2} N，往甲隊那邊`, `${d} N，往乙隊那邊`, '0 N，繩子不動'], rnd);
    return { kind: 'net', text: `把繩子當成一個物體：甲隊往左拉 ${F1} N、乙隊往右拉 ${F2} N。繩子受到的合力是多少、往哪邊？`, ...o, why: `兩個力方向相反，合力 = ${F1} − ${F2} = ${d} N，往力比較大的甲隊那邊。` }; },
  fma: rnd => { const m = pick([2, 4, 5, 10], rnd), a = pick([1, 1.5, 2, 3], rnd), F = m * a;
    return { kind: 'fma', text: `質量 ${m} kg 的物體受到 ${fix(F)} N 的合力，加速度是多少？`, ...num(a, [F * m, m / F * 10, F + m], rnd, 'm/s²'), why: `F = ma，a = F ÷ m = ${fix(F)} ÷ ${m} = ${fix(a)} m/s²。` }; },
  fric: rnd => { const m = pick([40, 50, 60], rnd), mu = pick([0.4, 0.5, 0.6, 0.8], rnd), f = mu * m * 10;
    return { kind: 'fric', text: `質量 ${m} kg 的人站在水平地面上，鞋底和地面的靜摩擦係數是 ${mu}。地面最多能給他多大的靜摩擦力？（g 取 10 m/s²）`, ...num(f, [m * 10, mu * m, f * 2], rnd, 'N'), why: `正向力 N = mg = ${m} × 10 = ${m * 10} N，最大靜摩擦力 = μN = ${mu} × ${m * 10} = ${fix(f)} N。` }; },
  third: rnd => { const o = shuffle('一樣大', ['甲隊拉繩子的力比較大', '繩子拉甲隊的力比較大', '要看哪一隊贏'], rnd);
    return { kind: 'third', text: '拔河時，甲隊拉繩子的力，和繩子拉甲隊的力，大小關係是？', ...o, why: '這是一對作用力與反作用力（牛頓第三定律）：大小相等、方向相反、作用在不同物體上。' }; },
  win: rnd => { const o = shuffle('地面給他們的摩擦力比較大', ['他們拉繩子的力比繩子拉他們的力大', '他們的重力比較大', '繩子比較靠近他們'], rnd);
    return { kind: 'win', text: '拔河時，兩隊和繩子之間的拉力其實一樣大。那贏的那一隊，關鍵是什麼？', ...o, why: '看整個「兩隊＋繩子」：水平方向的外力只有地面給的靜摩擦力。哪一隊的腳底得到的摩擦力比較大，整體就往那邊加速。' }; }
};
const pickKind = (T, rnd) => T[pick(Object.keys(T), rnd)](rnd);
export const runQ = (rnd = Math.random) => pickKind(RUN, rnd);
export const throwQ = (rnd = Math.random) => pickKind(THROW, rnd);
export const tugQ = (rnd = Math.random) => pickKind(TUG, rnd);
