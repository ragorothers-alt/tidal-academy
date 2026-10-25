/* 潮汐小島 · 函數圖形題產生器（純函式，可在 Node 測試）：
   畫出一個函數圖形，從 4 個方程式中選出相符的一個。干擾選項是常見錯誤（平移方向、正負號、底數、振幅與週期），
   並保證每個選項在畫面範圍內的圖形都明顯不同。 */
const ri = (a, b, rnd) => a + Math.floor(rnd() * (b - a + 1));
const pickr = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
const sgn = (v, x) => (v < 0 ? ` − ${x}` : ` + ${x}`);
const num = n => (n < 0 ? '−' + -n : String(n));
const shift = h => (h === 0 ? 'x' : h > 0 ? `(x − ${h})` : `(x + ${-h})`);
const coef = a => (a === 1 ? '' : a === -1 ? '−' : num(a));
const tail = k => (k === 0 ? '' : sgn(k, Math.abs(k)));

/** 各題型：產生參數、轉成函式與文字、列出干擾參數 */
export const KINDS = {
  quad: {
    name: '二次函數', view: { x0: -6, x1: 6, y0: -8, y1: 8 },
    gen: rnd => ({ a: pickr([-2, -1, 1, 2], rnd) * (rnd() < 0.3 ? 0.5 : 1), h: ri(-3, 3, rnd), k: ri(-4, 4, rnd) }),
    f: p => x => p.a * (x - p.h) ** 2 + p.k,
    tex: p => `y = ${p.a === 0.5 ? '½' : p.a === -0.5 ? '−½' : coef(p.a)}${p.h === 0 ? 'x' : shift(p.h)}<sup>2</sup>${tail(p.k)}`,
    wrong: p => [{ ...p, h: -p.h }, { ...p, a: -p.a }, { ...p, k: -p.k }, { ...p, h: -p.h, k: -p.k }, { ...p, a: p.a * 2 }, { ...p, h: p.k, k: p.h }],
    hint: p => `頂點在 (${num(p.h)}, ${num(p.k)})，開口${p.a > 0 ? '向上' : '向下'}。y = a(x − h)² + k 的頂點是 (h, k)：括號裡是「x − h」，所以 (x + 2) 代表向左平移 2。`
  },
  exp: {
    name: '指數與對數', view: { x0: -4, x1: 6, y0: -4, y1: 8 },
    gen: rnd => ({ t: rnd() < 0.5 ? 'exp' : 'log', b: pickr([2, 3, 0.5], rnd), k: ri(-2, 2, rnd) }),
    f: p => (p.t === 'exp' ? x => p.b ** x + p.k : x => (x > 0 ? Math.log(x) / Math.log(p.b) + p.k : NaN)),
    tex: p => {
      const b = p.b === 0.5 ? '(½)' : String(p.b), bl = p.b === 0.5 ? '½' : String(p.b);
      return p.t === 'exp' ? `y = ${b}<sup>x</sup>${tail(p.k)}` : `y = log<sub>${bl}</sub> x${tail(p.k)}`;
    },
    wrong: p => [{ ...p, k: -p.k }, { ...p, b: p.b === 0.5 ? 2 : 0.5 }, { ...p, t: p.t === 'exp' ? 'log' : 'exp' }, { ...p, b: p.b === 3 ? 2 : 3 }, { ...p, k: p.k + 2 }],
    hint: p => (p.t === 'exp'
      ? `指數函數 y = a<sup>x</sup> 一定通過 (0, 1)，再上下平移 ${p.k}；底數大於 1 遞增、介於 0 和 1 之間遞減。水平漸近線是 y = ${num(p.k)}。`
      : `對數函數 y = log<sub>a</sub> x 一定通過 (1, 0)，再上下平移 ${p.k}；只有 x > 0 才有定義，鉛直漸近線是 x = 0。底數大於 1 遞增、介於 0 和 1 之間遞減。`)
  },
  trig: {
    name: '三角函數', view: { x0: -2 * Math.PI, x1: 2 * Math.PI, y0: -4, y1: 4, pi: true },
    gen: rnd => ({ fn: rnd() < 0.5 ? 'sin' : 'cos', A: pickr([1, 2, 3], rnd) * (rnd() < 0.25 ? -1 : 1), B: pickr([1, 2, 0.5], rnd) }),
    f: p => x => p.A * Math[p.fn](p.B * x),
    tex: p => `y = ${coef(p.A)}${Math.abs(p.A) === 1 ? '' : ' '}${p.fn} ${p.B === 1 ? '' : p.B === 0.5 ? '(x/2)' : p.B}${p.B === 0.5 ? '' : 'x'}`,
    wrong: p => [{ ...p, B: p.B === 2 ? 0.5 : 2 }, { ...p, A: -p.A }, { ...p, fn: p.fn === 'sin' ? 'cos' : 'sin' }, { ...p, A: p.A > 0 ? p.A + 1 : p.A - 1 }, { ...p, B: p.B === 1 ? 2 : 1 }],
    hint: p => `振幅是 |A| = ${Math.abs(p.A)}，週期是 2π ÷ ${p.B === 0.5 ? '½' : p.B} = ${p.B === 1 ? '2π' : p.B === 2 ? 'π' : '4π'}。sin 通過原點，cos 在 x = 0 時是最大（或最小）值。`
  }
};
/** 兩個函式在畫面範圍內的最大差距（用來排除看起來一樣的干擾選項） */
export function gap(f, g, v) {
  let m = 0;
  for (let i = 0; i <= 200; i++) {
    const x = v.x0 + (v.x1 - v.x0) * i / 200, a = f(x), b = g(x);
    if (Number.isNaN(a) !== Number.isNaN(b)) { m = Math.max(m, 1); continue; }
    if (Number.isNaN(a)) continue;
    const ca = Math.max(v.y0 - 1, Math.min(v.y1 + 1, a)), cb = Math.max(v.y0 - 1, Math.min(v.y1 + 1, b));
    m = Math.max(m, Math.abs(ca - cb));
  }
  return m;
}
/** 產生一題：kind 可指定題型 */
export function question(rnd = Math.random, kind) {
  const K = kind || pickr(Object.keys(KINDS), rnd), D = KINDS[K];
  for (let t = 0; t < 200; t++) {
    const p = D.gen(rnd), f = D.f(p), opts = [{ p, tex: D.tex(p), f }];
    const ws = D.wrong(p).sort(() => rnd() - 0.5);
    for (const w of ws) {
      if (opts.length >= 4) break;
      const g = D.f(w), tx = D.tex(w);
      if (opts.some(o => o.tex === tx || gap(o.f, g, D.view) < 0.8)) continue;
      opts.push({ p: w, tex: tx, f: g });
    }
    if (opts.length < 4) continue;
    const order = opts.map((o, i) => [o, rnd() + i * 0]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    return { kind: K, name: D.name, view: D.view, f, p, opts: order, a: order.findIndex(o => o.p === p), hint: D.hint(p) };
  }
  return null;
}
