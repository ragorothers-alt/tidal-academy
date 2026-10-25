/* 潮汐小島 · 遺傳（純函式，可在 node 測試）：豌豆的花色 P/p、莖高 T/t 皆為完全顯性；紫茉莉花色 R/W 為不完全顯性。 */
export const SPECIES = {
  pea: { name: '豌豆', loci: [['P', 'p'], ['T', 't']], self: true },
  mira: { name: '紫茉莉', loci: [['R', 'W']], self: false }
};
export const PHENOS = [
  { id: 'pea_pt', sp: 'pea', name: '紫花高莖豌豆', short: '紫高', color: '#9a5fd0', tall: true },
  { id: 'pea_pd', sp: 'pea', name: '紫花矮莖豌豆', short: '紫矮', color: '#9a5fd0', tall: false },
  { id: 'pea_wt', sp: 'pea', name: '白花高莖豌豆', short: '白高', color: '#f6f3ff', tall: true },
  { id: 'pea_wd', sp: 'pea', name: '白花矮莖豌豆', short: '白矮', color: '#f6f3ff', tall: false },
  { id: 'mira_r', sp: 'mira', name: '紅花紫茉莉', short: '紅', color: '#e8344e', tall: true },
  { id: 'mira_k', sp: 'mira', name: '粉紅花紫茉莉', short: '粉紅', color: '#ff8fbf', tall: true },
  { id: 'mira_w', sp: 'mira', name: '白花紫茉莉', short: '白', color: '#fffaf2', tall: true }
];
export const pheno = id => PHENOS.find(p => p.id === id);

/** 'PpTt' → [['P','p'],['T','t']]；每個基因座的對偶基因依顯性（或 R 在前）排序 */
export function parse(sp, g) { const L = SPECIES[sp].loci, out = []; for (let i = 0; i < L.length; i++) out.push(norm(sp, i, [g[i * 2], g[i * 2 + 1]])); return out; }
const norm = (sp, i, pair) => pair.slice().sort((a, b) => SPECIES[sp].loci[i].indexOf(a) - SPECIES[sp].loci[i].indexOf(b));
export const fmt = (sp, pairs) => pairs.map((p, i) => norm(sp, i, p).join('')).join('');
export const clean = (sp, g) => fmt(sp, parse(sp, g));

/** 表現型 id */
export function phenoOf(sp, g) {
  const P = parse(sp, g);
  if (sp === 'pea') return 'pea_' + (P[0].includes('P') ? 'p' : 'w') + (P[1].includes('T') ? 't' : 'd');
  const k = P[0].join(''); return k === 'RR' ? 'mira_r' : k === 'RW' ? 'mira_k' : 'mira_w';
}
/** 配子：每個基因座各取一個對偶基因，2^n 種組合等機率（可重複） */
export function gametes(sp, g) {
  let out = [''];
  parse(sp, g).forEach(pair => { const nx = []; out.forEach(a => pair.forEach(x => nx.push(a + x))); out = nx; });
  return out;
}
/** 雜交：回傳 {基因型: 次數}、總次數 */
export function cross(sp, a, b) {
  const ga = gametes(sp, a), gb = gametes(sp, b), n = SPECIES[sp].loci.length, cnt = {};
  ga.forEach(x => gb.forEach(y => { const pairs = []; for (let i = 0; i < n; i++) pairs.push([x[i], y[i]]); const k = fmt(sp, pairs); cnt[k] = (cnt[k] || 0) + 1; }));
  return { cnt, total: ga.length * gb.length };
}
/** 依孟德爾定律隨機產生一個子代 */
export function breed(sp, a, b, rnd) {
  rnd = rnd || Math.random; const ga = gametes(sp, a), gb = gametes(sp, b), n = SPECIES[sp].loci.length;
  const x = ga[Math.floor(rnd() * ga.length)], y = gb[Math.floor(rnd() * gb.length)], pairs = [];
  for (let i = 0; i < n; i++) pairs.push([x[i], y[i]]);
  return fmt(sp, pairs);
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const frac = (n, d) => (n === 0 ? '0' : n === d ? '1' : `${n / gcd(n, d)}/${d / gcd(n, d)}`);
const val = f => { if (!f.includes('/')) return +f; const [a, b] = f.split('/'); return a / b; };
export function probPheno(sp, a, b, pid) { const { cnt, total } = cross(sp, a, b); const n = Object.entries(cnt).filter(([g]) => phenoOf(sp, g) === pid).reduce((s, [, c]) => s + c, 0); return [n, total]; }
export function probGenoGivenPheno(sp, a, b, g) {
  const { cnt } = cross(sp, a, b), pid = phenoOf(sp, g), inP = Object.entries(cnt).filter(([x]) => phenoOf(sp, x) === pid);
  return [cnt[clean(sp, g)] || 0, inP.reduce((s, [, c]) => s + c, 0)];
}
/** 子代表現型比例，例：紫花高莖：紫花矮莖：… = 9：3：3：1 */
export function ratio(sp, a, b) {
  const { cnt } = cross(sp, a, b), by = {};
  Object.entries(cnt).forEach(([g, c]) => { const p = phenoOf(sp, g); by[p] = (by[p] || 0) + c; });
  const ids = PHENOS.filter(p => by[p.id]).map(p => p.id), d = ids.reduce((x, id) => gcd(x, by[id]), 0);
  return { ids, nums: ids.map(id => by[id] / d) };
}
const POOL = ['0', '1/16', '1/8', '3/16', '1/4', '1/3', '3/8', '1/2', '9/16', '2/3', '3/4', '1'];
function options(ans, rnd) {
  const others = POOL.filter(f => f !== ans).sort((x, y) => Math.abs(val(x) - val(ans)) - Math.abs(val(y) - val(ans)) + (rnd() - 0.5) * 0.3);
  const o = [ans, ...others.slice(0, 3)].sort((x, y) => val(x) - val(y));
  return { o, a: o.indexOf(ans) };
}
const label = (sp, a, b, self) => (self ? `${a}（自花授粉）` : `${a} × ${b}`);
const gameteText = (sp, g) => { const G = gametes(sp, g), c = {}; G.forEach(x => { c[x] = (c[x] || 0) + 1; }); return Object.entries(c).map(([x, n]) => `${x}（${frac(n, G.length)}）`).join('、'); };
const NOTE = { pea: '豌豆花色紫（P）對白（p）、莖高高（T）對矮（t）都是完全顯性。', mira: '紫茉莉花色是不完全顯性：RR 紅、RW 粉紅、WW 白。' };
/**
 * 依花園裡真實的親代出題。
 * kind: 'pheno' 子代出現某表現型的機率；'geno' 某表現型中是某基因型的機率；'ratio' 子代表現型比例。
 */
export function question(sp, a, b, g, kind, rnd, self) {
  rnd = rnd || Math.random; a = clean(sp, a); b = clean(sp, b); g = clean(sp, g);
  const pid = phenoOf(sp, g), pn = pheno(pid).name, head = `親代 ${label(sp, a, b, self && a === b)}，`;
  const gm = self && a === b ? `親代產生的配子：${gameteText(sp, a)}。` : `${a} 的配子：${gameteText(sp, a)}；${b} 的配子：${gameteText(sp, b)}。`;
  const sc = new Set(gametes(sp, a)).size * new Set(gametes(sp, b)).size / (gametes(sp, a).length * gametes(sp, b).length), sz = x => (Number.isInteger(x * sc) ? x * sc : x);
  const [gn0, gt0] = probGenoGivenPheno(sp, a, b, g), gn = sz(gn0), gt = sz(gt0);
  if (kind === 'geno' && gt > gn) {
    const ans = frac(gn, gt), { o, a: ai } = options(ans, rnd);
    return { q: `${head}子代中的「${pn}」個體，基因型是 ${g} 的機率是多少？`, o, a: ai, e: `${NOTE[sp]}${gm}「${pn}」共佔 ${gt} 份組合，其中 ${g} 佔 ${gn} 份，所以是 ${ans}。` };
  }
  if (kind === 'ratio') {
    const r = ratio(sp, a, b), names = r.ids.map(id => pheno(id).short).join('：'), ans = r.nums.join('：');
    const cands = ['1', '1：1', '3：1', '1：2：1', '9：3：3：1', '1：1：1：1', '3：3：1：1', '3：1：3：1', '2：1', '1：3', '1：1：1', '2：1：1', '1：1：2'].filter(x => x !== ans && x.split('：').length === r.nums.length);
    if (cands.length >= 1) {
      while (cands.length < 3) cands.push(r.nums.map((n, i) => (i === 0 ? n + cands.length : n)).join('：'));
      const o = [ans, ...cands.sort(() => rnd() - 0.5).slice(0, 3)].sort(() => rnd() - 0.5);
      return { q: `${head}子代表現型（${names}）的比例是？`, o, a: o.indexOf(ans), e: `${NOTE[sp]}${gm}把配子兩兩組合後，${names} = ${ans}。` };
    }
  }
  const [n0, t0] = probPheno(sp, a, b, pid), n = sz(n0), t = sz(t0), ans = frac(n0, t0), { o, a: ai } = options(ans, rnd);
  return { q: `${head}子代是「${pn}」的機率是多少？`, o, a: ai, e: `${NOTE[sp]}${gm}配子兩兩組合共 ${t} 種等機率組合，「${pn}」佔 ${n} 種，機率 ${ans}。` };
}
