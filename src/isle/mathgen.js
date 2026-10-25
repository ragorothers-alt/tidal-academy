/* 潮汐小島 · 數學謎題產生器（純函式，可在 node 測試）：數列、排列組合、對數、機率、根與係數、特殊角、向量內積。
   每題回傳 { q, o: [4 個選項], a: 正確索引, e: 解析 }，答案由計算得出。 */
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n, d) => { if (n === 0) return '0'; const g = gcd(n, d), N = n / g, D = d / g; return D === 1 ? String(N) : `${N}/${D}`; };
const SUB = n => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function opts(ans, wrong, r) {
  const set = [String(ans)]; for (const w of wrong) { const s = String(w); if (!set.includes(s)) set.push(s); if (set.length === 4) break; }
  let k = 1; while (set.length < 4) { const s = String(typeof ans === 'number' ? ans + k * 3 : ans + "'".repeat(k)); if (!set.includes(s)) set.push(s); k++; }
  const o = shuffle(set, r); return { o, a: o.indexOf(String(ans)) };
}
export const TYPES = ['arith', 'geo', 'comb', 'log', 'dice', 'vieta', 'trig', 'dot'];
export function make(type, r) {
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  if (type === 'arith') {
    const a1 = ri(2, 9), d = ri(2, 7), n = ri(8, 15), ans = a1 + (n - 1) * d;
    return Object.assign({ q: `等差數列 ${a1}, ${a1 + d}, ${a1 + 2 * d}, … 的第 ${n} 項是多少？`, e: `公差 d = ${d}，第 n 項 = a₁ + (n − 1)d = ${a1} + ${n - 1} × ${d} = ${ans}。` }, opts(ans, [ans + d, ans - d, a1 + n * d + d], r));
  }
  if (type === 'geo') {
    const a1 = ri(1, 3), q = ri(2, 3), n = ri(5, 7), ans = a1 * q ** (n - 1);
    return Object.assign({ q: `等比數列 ${a1}, ${a1 * q}, ${a1 * q * q}, … 的第 ${n} 項是多少？`, e: `公比 r = ${q}，第 n 項 = a₁ × rⁿ⁻¹ = ${a1} × ${q}^${n - 1} = ${ans}。` }, opts(ans, [ans * q, ans / q, a1 * q ** n + 1], r));
  }
  if (type === 'comb') {
    const n = ri(5, 9), k = ri(2, 3), ans = C(n, k), perm = ans * (k === 2 ? 2 : 6);
    return Object.assign({ q: `從 ${n} 位同學中選出 ${k} 位當代表（不排順序），共有幾種選法？`, e: `組合數 C(${n}, ${k}) = ${n}! ÷ (${k}! × ${n - k}!) = ${ans}。若要排順序才是排列 P(${n}, ${k}) = ${perm}。` }, opts(ans, [perm, C(n, k + 1), n * k], r));
  }
  if (type === 'log') {
    const b = [2, 3, 5, 10][ri(0, 3)], k = ri(2, b === 10 ? 4 : b === 2 ? 6 : 4), x = b ** k;
    const lg = b === 10 ? 'log' : 'log' + SUB(b);
    return Object.assign({ q: `${lg} ${x}（以 ${b} 為底）等於多少？`, e: `因為 ${b}^${k} = ${x}，所以 ${lg} ${x} = ${k}。` }, opts(k, [k + 1, k - 1, x / b], r));
  }
  if (type === 'dice') {
    const s = ri(4, 10), n = [...Array(6)].reduce((a, _, i) => a + [...Array(6)].filter((__, j) => i + j + 2 === s).length, 0), ans = frac(n, 36);
    const wrong = [frac(n + 1, 36), frac(Math.max(1, n - 1), 36), frac(n, 6)];
    return Object.assign({ q: `同時擲兩顆公正骰子，點數和為 ${s} 的機率是多少？`, e: `兩顆骰子共 36 種等可能結果，點數和為 ${s} 的有 ${n} 種，機率 ${n}/36 = ${ans}。` }, opts(ans, wrong, r));
  }
  if (type === 'vieta') {
    const p = ri(-6, 6) || 2, q = ri(-6, 6) || 3, B = -(p + q), Cc = p * q, sum = p + q, prod = p * q, askSum = r() < 0.5;
    const eq = `x² ${B >= 0 ? '+ ' + B : '− ' + -B}x ${Cc >= 0 ? '+ ' + Cc : '− ' + -Cc} = 0`.replace('+ 1x', '+ x').replace('− 1x', '− x').replace(' + 0x', '');
    const ans = askSum ? sum : prod;
    return Object.assign({ q: `方程式 ${eq} 的兩根${askSum ? '之和' : '之積'}是多少？`, e: `由根與係數的關係，x² + bx + c = 0 的兩根和 = −b = ${sum}，兩根積 = c = ${prod}。` }, opts(ans, askSum ? [-sum, prod, sum + 1] : [-prod, sum, prod + 1], r));
  }
  if (type === 'trig') {
    const T = [['sin 30°', '1/2'], ['cos 60°', '1/2'], ['sin 45°', '√2/2'], ['cos 45°', '√2/2'], ['sin 60°', '√3/2'], ['cos 30°', '√3/2'], ['tan 45°', '1'], ['tan 60°', '√3'], ['tan 30°', '√3/3'], ['sin 90°', '1'], ['cos 90°', '0']];
    const [f, ans] = T[ri(0, T.length - 1)], all = ['1/2', '√2/2', '√3/2', '1', '√3', '√3/3', '0'];
    return Object.assign({ q: `${f} 的值是多少？`, e: `特殊角：sin 30° = cos 60° = 1/2，sin 45° = cos 45° = √2/2，sin 60° = cos 30° = √3/2，tan 30° = √3/3，tan 45° = 1，tan 60° = √3。所以 ${f} = ${ans}。` }, opts(ans, shuffle(all.filter(x => x !== ans), r), r));
  }
  const a = [ri(-4, 5), ri(-4, 5)], b = [ri(-4, 5), ri(-4, 5)], ans = a[0] * b[0] + a[1] * b[1];
  return Object.assign({ q: `向量 a = (${a[0]}, ${a[1]})、b = (${b[0]}, ${b[1]})，內積 a · b 是多少？`, e: `a · b = ${a[0]} × ${b[0]} + ${a[1]} × ${b[1]} = ${ans}。` }, opts(ans, [a[0] * b[1] + a[1] * b[0], ans + 2, -ans || 1], r));
}
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** 每天每塊石碑的題目：同一天三塊的題型一定不同，種子充分混合日期與石碑編號 */
export function daily(seedStr, k) {
  const base = hash(seedStr + ':tablet') % TYPES.length;
  let seed = (hash(seedStr + '#' + k) % 2147483646) + 1;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5; i++) r();
  return make(TYPES[(base + k * 3) % TYPES.length], r);
}
