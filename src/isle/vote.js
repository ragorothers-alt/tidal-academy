/* 潮汐小島 · 選舉計票（純函式，可在 Node 測試）：相對多數決、兩輪決選、排序複選、最大餘數法席次分配與題目產生。 */
export const IDEAS = { A: '圖書館擴建', B: '星空天文台', C: '海邊溫泉', D: '週末市集' };
const KEYS = Object.keys(IDEAS);
const firsts = (groups, alive) => {
  const t = {}; alive.forEach(k => { t[k] = 0; });
  groups.forEach(g => { const k = g.order.find(x => alive.includes(x)); t[k] += g.n; });
  return t;
};
export const total = groups => groups.reduce((a, g) => a + g.n, 0);
const top = t => Object.keys(t).sort((a, b) => t[b] - t[a]);
/** 相對多數決：第一偏好最多者當選 */
export function plurality(groups) { const t = firsts(groups, KEYS); return { win: top(t)[0], t }; }
/** 兩輪決選：第一輪過半直接當選，否則前兩名進入第二輪 */
export function runoff(groups) {
  const t = firsts(groups, KEYS), r = top(t), N = total(groups);
  if (t[r[0]] * 2 > N) return { win: r[0], t, t2: null };
  const t2 = firsts(groups, r.slice(0, 2)); return { win: top(t2)[0], t, t2 };
}
/** 排序複選（即時決選）：每輪淘汰第一偏好最少者，票轉給下一個偏好，直到有人過半 */
export function irv(groups) {
  let alive = KEYS.slice(); const rounds = [], N = total(groups);
  for (;;) {
    const t = firsts(groups, alive), r = top(t); rounds.push(t);
    if (t[r[0]] * 2 > N || alive.length <= 2) return { win: r[0], rounds };
    alive = alive.filter(k => k !== r[r.length - 1]);
  }
}
/** 不分區席次：得票率達門檻的政黨，以最大餘數法（黑爾基數）分配 seats 席 */
export function hare(votes, seats, thr) {
  const sum = Object.values(votes).reduce((a, b) => a + b, 0), ok = Object.keys(votes).filter(k => votes[k] / sum >= thr);
  const base = ok.reduce((a, k) => a + votes[k], 0), out = {}, rem = [];
  Object.keys(votes).forEach(k => { out[k] = 0; });
  ok.forEach(k => { const q = votes[k] * seats / base; out[k] = Math.floor(q); rem.push([k, q - Math.floor(q)]); });
  let left = seats - ok.reduce((a, k) => a + out[k], 0);
  rem.sort((a, b) => b[1] - a[1]).forEach(([k]) => { if (left > 0) { out[k]++; left--; } });
  return { seats: out, ok, base };
}
const ri = (a, b, rnd) => a + Math.floor(rnd() * (b - a + 1));
const distinct = t => { const v = Object.values(t); return new Set(v).size === v.length; };
/** 產生一組選票：各輪都沒有同票，而且三種制度至少出現兩種不同結果 */
export function ballots(rnd = Math.random) {
  for (let k = 0; k < 4000; k++) {
    const groups = [], used = new Set();
    for (let i = 0; i < 5; i++) {
      const order = KEYS.slice().sort(() => rnd() - 0.5), key = order.join('');
      if (used.has(key)) continue; used.add(key); groups.push({ n: ri(4, 30, rnd), order });
    }
    if (groups.length < 4) continue;
    const p = plurality(groups), r = runoff(groups), v = irv(groups);
    if (!distinct(p.t) || (r.t2 && !distinct(r.t2)) || !v.rounds.every(distinct)) continue;
    if (new Set([p.win, r.win, v.win]).size < 2) continue;
    return { groups, p, r, v };
  }
  return null;
}
export const PARTIES = ['海鷗黨', '珊瑚黨', '燈塔黨', '潮汐黨', '椰子黨', '星砂黨'];
/** 產生不分區選舉：6 個政黨，至少一黨未過 5% 門檻，餘數不同 */
export function partyVote(rnd = Math.random, seats = 34) {
  for (let k = 0; k < 4000; k++) {
    const w = PARTIES.map((_, i) => (i < 2 ? 25 + rnd() * 20 : i < 4 ? 6 + rnd() * 14 : 1 + rnd() * 6));
    const sum = w.reduce((a, b) => a + b, 0), votes = {};
    PARTIES.forEach((p, i) => { votes[p] = Math.round(w[i] / sum * 1000) * 100; });   // 以百票為單位，總票數約十萬
    const h = hare(votes, seats, 0.05), tot = Object.values(votes).reduce((a, b) => a + b, 0);
    if (h.ok.length === PARTIES.length || h.ok.length < 3) continue;
    const rems = h.ok.map(p => votes[p] * seats / h.base % 1);
    if (new Set(rems.map(x => x.toFixed(6))).size !== rems.length) continue;
    if (PARTIES.some(p => Math.abs(votes[p] / tot - 0.05) < 0.003)) continue;   // 避免卡在門檻邊緣
    return { votes, seats, h, tot };
  }
  return null;
}

