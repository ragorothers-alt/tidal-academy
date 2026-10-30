/* 潮汐小島 · 夜市機率題產生器（純函式，可在 Node 測試）：
   骰子攤、抽籤攤、轉盤攤、套圈圈、彈珠台問「玩一次的期望值（淨得）」，撈球攤問不放回抽取的機率。答案都由計算得出。
   v9.4.0 每一題也帶著這一攤真的玩法：cost（玩一次的鈴錢）、exp（玩一次的期望淨得）、play(rnd)（照同一組機率開獎，回傳 { won, hit, show }）。 */
const ri = (a, b, rnd) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const frac = (n, d) => { const g = gcd(n, d) || 1; n /= g; d /= g; return d === 1 ? String(n) : `${n}/${d}`; };
const signed = v => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
/** 兩顆骰子點數和 ≥ t 的組合數 */
export function diceAtLeast(t) { let n = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= t) n++; return n; }
/** n 選 k */
export function choose(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
/** 從 4 個數字選項中挑出不重複的干擾項 */
function numOpts(ans, wrongs, rnd) {
  const set = [ans]; wrongs.forEach(w => { if (Number.isInteger(w) && !set.includes(w) && set.length < 4) set.push(w); });
  for (let d = 1; set.length < 4; d++) [ans + d * 5, ans - d * 5].forEach(w => { if (!set.includes(w) && set.length < 4) set.push(w); });
  const o = set.map(x => [x, rnd()]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
  return { opts: o.map(signed), a: o.indexOf(ans) };
}
/** 轉盤 8 格的排法（v9.4.0 夜市的轉盤模型：2 格大獎、3 格小獎、3 格銘謝惠顧） */
export const WHEEL = [2, 3, 3];
export const BOOTHS = {
  dice: rnd => {
    for (;;) {
      const t = ri(7, 11, rnd), m = diceAtLeast(t), g = gcd(m, 36), unit = 36 / g, P = unit * ri(1, Math.max(1, Math.floor(400 / unit)), rnd), c = pick([20, 30, 40, 50, 60, 80, 100], rnd);
      if (P < 40 || P > 600) continue;
      const ev = P * m / 36 - c, m2 = diceAtLeast(t + 1), alt = P * m2 / 36 - c;
      if (Math.abs(ev) > 200 || (ev > 0 && rnd() < 0.6)) continue;   // 大多數攤位期望值為負，比較像真實的夜市
      const o = numOpts(ev, [P * m / 36, -c, Number.isInteger(alt) ? alt : ev + 10, P - c], rnd);
      return { booth: '骰子攤', text: `付 ${c} 鈴錢擲兩顆公正骰子，點數和 <b>≥ ${t}</b> 就拿到 ${P} 鈴錢的獎品（否則沒有獎品）。玩一次的期望值（淨得）是多少鈴錢？`, ...o, ev, cost: c, exp: ev,
        why: `點數和 ≥ ${t} 的組合有 ${m} 種（共 36 種），機率 ${frac(m, 36)}。期望值 = ${P} × ${frac(m, 36)} − ${c} = ${signed(ev)}。`,
        play: r => { const a = ri(1, 6, r), b = ri(1, 6, r), hit = a + b >= t; return { won: hit ? P : 0, hit, show: `🎲 ${a} + ${b} = ${a + b}` }; } };
    }
  },
  ticket: rnd => {
    for (;;) {
      const n = pick([20, 25, 40, 50, 100], rnd), a = ri(1, 2, rnd), b = ri(2, 6, rnd), A = pick([200, 300, 500, 800, 1000], rnd), B = pick([20, 40, 50, 60, 100], rnd), c = pick([20, 30, 40, 50, 60], rnd);
      const tot = a * A + b * B; if (tot % n) continue;
      const ev = tot / n - c; if (Math.abs(ev) > 200 || (ev > 0 && rnd() < 0.6)) continue;   // 大多數攤位期望值為負，比較像真實的夜市
      const o = numOpts(ev, [tot / n, (A + B) / n - c, -c, (a * A) / n - c], rnd);
      return { booth: '抽籤攤', text: `籤筒裡有 ${n} 支籤：${a} 支大獎 ${A} 鈴錢、${b} 支小獎 ${B} 鈴錢，其餘沒有獎。抽一支要付 ${c} 鈴錢（抽完放回）。玩一次的期望值（淨得）是多少？`, ...o, ev, cost: c, exp: ev,
        why: `期望獎金 = (${a} × ${A} + ${b} × ${B}) ÷ ${n} = ${tot / n}，再減去成本 ${c} 鈴錢：${signed(ev)}。`,
        play: r => { const k = Math.floor(r() * n), won = k < a ? A : k < a + b ? B : 0; return { won, hit: won > 0, show: won === A ? '抽到大獎籤！' : won ? '抽到小獎籤' : '銘謝惠顧' }; } };
    }
  },
  spin: (rnd, o2) => {
    for (;;) {
      const parts = o2 && o2.parts ? o2.parts.slice() : [ri(1, 3, rnd), ri(1, 4, rnd), 0], tot = 8; if (!(o2 && o2.parts)) parts[2] = tot - parts[0] - parts[1]; if (parts[2] < 1) continue;
      const pz = [pick([200, 400, 800], rnd), pick([40, 80, 120], rnd), 0], c = pick([40, 60, 80, 100], rnd);
      const sum = parts[0] * pz[0] + parts[1] * pz[1]; if (sum % tot) continue;
      const ev = sum / tot - c; if (Math.abs(ev) > 200 || (ev > 0 && rnd() < 0.6)) continue;   // 大多數攤位期望值為負，比較像真實的夜市
      const o = numOpts(ev, [sum / tot, (pz[0] + pz[1]) / 3 - c, -c, ev + parts[2] * 10], rnd);
      return { booth: '轉盤攤', text: `轉盤平均分成 8 格：${parts[0]} 格是 ${pz[0]} 鈴錢、${parts[1]} 格是 ${pz[1]} 鈴錢、${parts[2]} 格「銘謝惠顧」。轉一次要 ${c} 鈴錢，期望值（淨得）是多少？`, ...o, ev, cost: c, exp: ev, parts,
        why: `期望獎金 = (${parts[0]} × ${pz[0]} + ${parts[1]} × ${pz[1]}) ÷ 8 = ${sum / tot}，減去 ${c}：${signed(ev)}。注意每一格機率是 1/8，不是三種獎各 1/3。`,
        play: r => { const k = Math.floor(r() * tot), kind = k < parts[0] ? 0 : k < parts[0] + parts[1] ? 1 : 2; return { won: pz[kind], hit: kind < 2, kind, show: kind === 0 ? `大獎！${pz[0]} 鈴錢` : kind === 1 ? `小獎 ${pz[1]} 鈴錢` : '銘謝惠顧' }; } };
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
    const c = pick([30, 40, 50], rnd), P = Math.max(c + 10, Math.floor(c * den / num * 0.85 / 10) * 10);   // 夜市的玩法：付 c 摸一次，猜中的情形就拿 P（期望值略為負）
    return { booth: '撈球攤', text: `袋子裡有 ${r} 顆紅球、${w} 顆白球，<b>不放回</b>地連續摸出兩顆。${label}的機率是多少？`, opts: o, a: o.indexOf(ans), cost: c, exp: P * num / den - c, prize: P, label,
      why: `不放回時第二顆的總數少 1：${kind === 'rr' ? `${r}/${n} × ${r - 1}/${n - 1}` : kind === 'rw' ? `先紅後白 ${r}/${n} × ${w}/${n - 1}，加上先白後紅 ${w}/${n} × ${r}/${n - 1}` : `兩紅 ${r}/${n} × ${r - 1}/${n - 1}，加上兩白 ${w}/${n} × ${w - 1}/${n - 1}`} = ${ans}。`,
      play: rr => { const i = Math.floor(rr() * n); let j = Math.floor(rr() * (n - 1)); if (j >= i) j++; const red = x => x < r, a = red(i), b = red(j), hit = kind === 'rr' ? a && b : kind === 'rw' ? a !== b : a === b; return { won: hit ? P : 0, hit, show: `${a ? '🔴' : '⚪'} ${b ? '🔴' : '⚪'}` }; } };
  },
  ring: rnd => {
    for (;;) {
      const [k, n] = pick([[3, 2], [4, 2], [4, 3], [5, 2], [5, 3]], rnd), K = k ** n, m = K - (k - 1) ** n, unit = K / gcd(m, K), P = unit * ri(1, Math.max(1, Math.floor(600 / unit)), rnd), c = pick([20, 30, 40, 50, 60, 80], rnd);
      if (P < 60 || P > 600) continue;
      const ev = P * m / K - c; if (Math.abs(ev) > 200 || (ev > 0 && rnd() < 0.6)) continue;   // 大多數攤位期望值為負
      const o = numOpts(ev, [n * P / k - c, P / k - c, P * m / K, -c], rnd);   // 常見的錯：把每個圈的機率直接相加、只算一個圈、忘了扣成本
      return { booth: '套圈圈', text: `付 ${c} 鈴錢可以丟 ${n} 個圈，每個圈套中的機率都是 1/${k}（彼此獨立）。<b>至少套中一個</b>就拿到 ${P} 鈴錢的獎品。玩一次的期望值（淨得）是多少？`, ...o, ev, cost: c, exp: ev,
        why: `至少套中一個 = 1 − 一個都沒套中 = 1 − (${k - 1}/${k})<sup>${n}</sup> = ${frac(m, K)}（不能把 ${n} 個 1/${k} 直接加起來）。期望值 = ${P} × ${frac(m, K)} − ${c} = ${signed(ev)}。`,
        play: r => { const hits = Array.from({ length: n }, () => r() < 1 / k), hit = hits.some(Boolean); return { won: hit ? P : 0, hit, show: hits.map(h => (h ? '⭕' : '✖')).join(' ') }; } };
    }
  },
  pachinko: rnd => {
    for (;;) {   // 4 排釘子：彈珠每排往左往右各 1/2，落在 5 格的機率是 1、4、6、4、1（÷ 16）
      const A = pick([160, 240, 320, 400, 480], rnd), B = pick([20, 30, 40, 50, 60], rnd), c = pick([40, 50, 60, 80], rnd);
      if ((A + 4 * B) % 8) continue;
      const ev = (A + 4 * B) / 8 - c; if (Math.abs(ev) > 200 || (ev > 0 && rnd() < 0.6)) continue;
      const o = numOpts(ev, [(2 * A + 2 * B) / 5 - c, (A + B) / 2 - c, (A + 4 * B) / 8, -c], rnd);   // 常見的錯：以為 5 格一樣容易
      return { booth: '彈珠台', text: `彈珠台有 4 排釘子，彈珠每碰到一根釘子往左、往右的機率各一半，最後落進底下 5 格之一。最左、最右兩格送 ${A} 鈴錢，旁邊兩格送 ${B} 鈴錢，正中間沒有獎。玩一次 ${c} 鈴錢，期望值（淨得）是多少？`, ...o, ev, cost: c, exp: ev,
        why: `往右走了 k 次就落在第 k 格，機率是 C(4,k) ÷ 16：五格依序 1/16、4/16、6/16、4/16、1/16（中間最容易）。期望獎金 = (2 × ${A} + 8 × ${B}) ÷ 16 = ${(A + 4 * B) / 8}，減去 ${c}：${signed(ev)}。`,
        play: r => { let s = 0; for (let i = 0; i < 4; i++) if (r() < 0.5) s++; const won = s === 0 || s === 4 ? A : s === 1 || s === 3 ? B : 0; return { won, hit: won > 0, slot: s, show: `彈珠落在第 ${s + 1} 格` }; } };
    }
  }
};
/** 夜市的四個傳統攤位（潮汐夜市的練習面板用；v9.4.0 的港邊夜市六攤都用） */
export const CLASSIC = ['dice', 'ticket', 'spin', 'balls'];
export function question(rnd = Math.random, kind) { return BOOTHS[kind || pick(Object.keys(BOOTHS), rnd)](rnd); }
