/* 潮汐小島 · 夜市機率題產生器（純函式，可在 Node 測試）：
   骰子攤、抽籤攤、轉盤攤問「玩一次的期望值（淨得）」，抽球攤問不放回抽取的機率。答案都由計算得出。 */
const ri = (a, b, rnd) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const frac = (n, d) => { const g = gcd(n, d) || 1; n /= g; d /= g; return d === 1 ? String(n) : `${n}/${d}`; };
const signed = v => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
/** 兩顆骰子點數和 ≥ t 的組合數 */
export function diceAtLeast(t) { let n = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= t) n++; return n; }
/** 從 4 個數字選項中挑出不重複的干擾項 */
function numOpts(ans, wrongs, rnd) {
  const set = [ans]; wrongs.forEach(w => { if (Number.isInteger(w) && !set.includes(w) && set.length < 4) set.push(w); });
  for (let d = 1; set.length < 4; d++) [ans + d * 5, ans - d * 5].forEach(w => { if (!set.includes(w) && set.length < 4) set.push(w); });
  const o = set.map(x => [x, rnd()]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
  return { opts: o.map(signed), a: o.indexOf(ans) };
}
export const BOOTHS = {
  dice: rnd => {
    for (;;) {
      const t = ri(7, 11, rnd), m = diceAtLeast(t), g = gcd(m, 36), unit = 36 / g, P = unit * ri(1, Math.max(1, Math.floor(400 / unit)), rnd), c = pick([20, 30, 40, 50, 60, 80, 100], rnd);
      if (P < 40 || P > 600) continue;
      const ev = P * m / 36 - c, m2 = diceAtLeast(t + 1), alt = P * m2 / 36 - c;
      if (Math.abs(ev) > 200 || (ev > 0 && rnd() < 0.6)) continue;   // 大多數攤位期望值為負，比較像真實的夜市
      const o = numOpts(ev, [P * m / 36, -c, Number.isInteger(alt) ? alt : ev + 10, P - c], rnd);
      return { booth: '骰子攤', text: `付 ${c} 鈴錢擲兩顆公正骰子，點數和 <b>≥ ${t}</b> 就拿到 ${P} 鈴錢的獎品（否則沒有獎品）。玩一次的期望值（淨得）是多少鈴錢？`, ...o, ev,
        why: `點數和 ≥ ${t} 的組合有 ${m} 種（共 36 種），機率 ${frac(m, 36)}。期望值 = ${P} × ${frac(m, 36)} − ${c} = ${signed(ev)}。` };
    }
  },
  ticket: rnd => {
    for (;;) {
      const n = pick([20, 25, 40, 50, 100], rnd), a = ri(1, 2, rnd), b = ri(2, 6, rnd), A = pick([200, 300, 500, 800, 1000], rnd), B = pick([20, 40, 50, 60, 100], rnd), c = pick([20, 30, 40, 50, 60], rnd);
      const tot = a * A + b * B; if (tot % n) continue;
      const ev = tot / n - c; if (Math.abs(ev) > 200 || (ev > 0 && rnd() < 0.6)) continue;   // 大多數攤位期望值為負，比較像真實的夜市
      const o = numOpts(ev, [tot / n, (A + B) / n - c, -c, (a * A) / n - c], rnd);
      return { booth: '抽籤攤', text: `籤筒裡有 ${n} 支籤：${a} 支大獎 ${A} 鈴錢、${b} 支小獎 ${B} 鈴錢，其餘沒有獎。抽一支要付 ${c} 鈴錢（抽完放回）。玩一次的期望值（淨得）是多少？`, ...o, ev,
        why: `期望獎金 = (${a} × ${A} + ${b} × ${B}) ÷ ${n} = ${tot / n}，再減去成本 ${c} 鈴錢：${signed(ev)}。` };
    }
  },
  spin: rnd => {
    for (;;) {
      const parts = [ri(1, 3, rnd), ri(1, 4, rnd), 0], tot = 8; parts[2] = tot - parts[0] - parts[1]; if (parts[2] < 1) continue;
      const pz = [pick([200, 400, 800], rnd), pick([40, 80, 120], rnd), 0], c = pick([40, 60, 80, 100], rnd);
      const sum = parts[0] * pz[0] + parts[1] * pz[1]; if (sum % tot) continue;
      const ev = sum / tot - c; if (Math.abs(ev) > 200 || (ev > 0 && rnd() < 0.6)) continue;   // 大多數攤位期望值為負，比較像真實的夜市
      const o = numOpts(ev, [sum / tot, (pz[0] + pz[1]) / 3 - c, -c, ev + parts[2] * 10], rnd);
      return { booth: '轉盤攤', text: `轉盤平均分成 8 格：${parts[0]} 格是 ${pz[0]} 鈴錢、${parts[1]} 格是 ${pz[1]} 鈴錢、${parts[2]} 格「銘謝惠顧」。轉一次要 ${c} 鈴錢，期望值（淨得）是多少？`, ...o, ev,
        why: `期望獎金 = (${parts[0]} × ${pz[0]} + ${parts[1]} × ${pz[1]}) ÷ 8 = ${sum / tot}，減去 ${c}：${signed(ev)}。注意每一格機率是 1/8，不是三種獎各 1/3。` };
    }
  },
  balls: rnd => {
    const r = ri(2, 5, rnd), w = ri(2, 6, rnd), n = r + w, kind = pick(['rr', 'rw', 'sameish'], rnd);
    let num, den, label, wrong;
    if (kind === 'rr') { num = r * (r - 1); den = n * (n - 1); label = '兩顆都是紅球'; wrong = [frac(r * r, n * n), frac(r - 1, n - 1), frac(r, n)]; }
    else if (kind === 'rw') { num = 2 * r * w; den = n * (n - 1); label = '一紅一白（不計順序）'; wrong = [frac(r * w, n * (n - 1)), frac(2 * r * w, n * n), frac(r * w, n * n)]; }
    else { num = r * (r - 1) + w * (w - 1); den = n * (n - 1); label = '兩顆顏色相同'; wrong = [frac(r * r + w * w, n * n), frac(r * (r - 1), n * (n - 1)), frac(1, 2)]; }
    const ans = frac(num, den), set = [ans]; wrong.forEach(x => { if (!set.includes(x) && set.length < 4) set.push(x); });
    for (let k = 1; set.length < 4; k++) { const x = frac(num + k, den); if (!set.includes(x)) set.push(x); }
    const o = set.map(x => [x, rnd()]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
    return { booth: '撈球攤', text: `袋子裡有 ${r} 顆紅球、${w} 顆白球，<b>不放回</b>地連續摸出兩顆。${label}的機率是多少？`, opts: o, a: o.indexOf(ans),
      why: `不放回時第二顆的總數少 1：${kind === 'rr' ? `${r}/${n} × ${r - 1}/${n - 1}` : kind === 'rw' ? `先紅後白 ${r}/${n} × ${w}/${n - 1}，加上先白後紅 ${w}/${n} × ${r}/${n - 1}` : `兩紅 ${r}/${n} × ${r - 1}/${n - 1}，加上兩白 ${w}/${n} × ${w - 1}/${n - 1}`} = ${ans}。` };
  }
};
export function question(rnd = Math.random, kind) { return BOOTHS[kind || pick(Object.keys(BOOTHS), rnd)](rnd); }
