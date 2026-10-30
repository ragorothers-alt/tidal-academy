/* 潮汐小島 · 島民尋路（v8.9）：全島 0.5 公尺一格的可走地圖，A* 找路後拉直成幾個轉折點。
   島民原本只會朝目標直線走、被擋住就停下，只能在自己家附近活動；有了路線就能照作息走到廣場、碼頭、燈塔與山頂。
   地圖在第一次找路時建立；碰撞物有增減（島嶼設計、搬家、DIY 工作台）時下一次找路前重建。
   步道上的格子成本比較低：島民會沿著石板路走，不會斜切過草地和花圃。 */
const R = 0.5, H = 48, N = 192, AGENT = 0.25, STEP = 0.7;   // 一格 0.5 m、範圍 ±48 m；島民半徑與一步能上下的高度和 main.js 的 walkable 一致
let env = null, ok = null, hy = null, cost = null, sig = '';
/** env：{ ground(x, z), water(x, z) → 是否是水、colliders 陣列、roads（規劃的步道，規劃座標）、warp(x, z) → 世界座標 } */
export function init(e) { env = e; sig = ''; }
const idx = (i, j) => j * N + i;
const cellOf = (x, z) => [Math.floor((x + H) / R), Math.floor((z + H) / R)];
const centerOf = (i, j) => [-H + (i + 0.5) * R, -H + (j + 0.5) * R];
const inb = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
function signature() { let s = env.colliders.length; for (const c of env.colliders) s += (c.r ? c.x * 3.1 + c.z * 7.3 : c.x0 * 1.7 + c.z1 * 5.9); return s.toFixed(3); }
function build() {
  ok = new Uint8Array(N * N); hy = new Float32Array(N * N); cost = new Float32Array(N * N).fill(1.35);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const [x, z] = centerOf(i, j), k = idx(i, j);
    if (env.water(x, z)) continue;
    hy[k] = env.ground(x, z); ok[k] = 1;
  }
  // 碰撞物：圓形與方框，連同島民的半徑一起塗掉
  for (const c of env.colliders) {
    const x0 = c.r ? c.x - c.r - AGENT : c.x0 - AGENT, x1 = c.r ? c.x + c.r + AGENT : c.x1 + AGENT, z0 = c.r ? c.z - c.r - AGENT : c.z0 - AGENT, z1 = c.r ? c.z + c.r + AGENT : c.z1 + AGENT;
    const [i0, j0] = cellOf(x0, z0), [i1, j1] = cellOf(x1, z1);
    for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) {
      const [x, z] = centerOf(i, j);
      if (c.r ? Math.hypot(c.x - x, c.z - z) < c.r + AGENT : x > x0 && x < x1 && z > z0 && z < z1) ok[idx(i, j)] = 0;
    }
  }
  // 步道：沿規劃的折線每 0.4 m 取一點、套上地形扭曲，路寬內的格子成本較低
  (env.roads || []).forEach(rd => {
    const w = (rd.width || 2) / 2, p = rd.path || [];
    for (let s = 0; s + 1 < p.length; s++) {
      const [ax, az] = p[s], [bx, bz] = p[s + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.4));
      for (let t = 0; t <= n; t++) {
        const [x, z] = env.warp(ax + (bx - ax) * t / n, az + (bz - az) * t / n), [ci, cj] = cellOf(x, z), rr = Math.ceil(w / R);
        for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) {
          const i = ci + di, j = cj + dj; if (!inb(i, j)) continue;
          const [cx, cz] = centerOf(i, j); if (Math.hypot(cx - x, cz - z) <= w) cost[idx(i, j)] = 1;
        }
      }
    }
  });
  sig = signature();
}
function ready() { if (!env) return false; if (!ok || sig !== signature()) build(); return true; }
/** 兩格之間走得過去：兩格都能站、高度差在一步以內；斜走時兩側的格子也要能站（不切牆角） */
function link(a, b, ai, aj, bi, bj) {
  if (!ok[b] || Math.abs(hy[a] - hy[b]) > STEP) return false;
  if (ai !== bi && aj !== bj) { const c = idx(ai, bj), d = idx(bi, aj); if (!ok[c] || !ok[d] || Math.abs(hy[c] - hy[a]) > STEP || Math.abs(hy[d] - hy[a]) > STEP) return false; }
  return true;
}
/** 離 (x, z) 最近、能站的格子（maxR 公尺內），找不到回傳 -1 */
function snapCell(x, z, maxR = 3) {
  const [ci, cj] = cellOf(x, z); if (inb(ci, cj) && ok[idx(ci, cj)]) return idx(ci, cj);
  let best = -1, bd = 1e9; const rr = Math.ceil(maxR / R);
  for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) {
    const i = ci + di, j = cj + dj; if (!inb(i, j) || !ok[idx(i, j)]) continue;
    const [cx, cz] = centerOf(i, j), d = Math.hypot(cx - x, cz - z); if (d < bd && d <= maxR) { bd = d; best = idx(i, j); }
  }
  return best;
}
/** 最近的可站位置（世界座標），找不到回傳 null */
export function snap(x, z, maxR = 3) { if (!ready()) return null; const k = snapCell(x, z, maxR); return k < 0 ? null : centerOf(k % N, Math.floor(k / N)); }
/** 這一點能不能站 */
export function standable(x, z) { if (!ready()) return true; const [i, j] = cellOf(x, z); return inb(i, j) && !!ok[idx(i, j)]; }
/* A*：二元堆積、八方向、對角線成本 √2；找太久（超過 maxN 格）就放棄 */
let G = null, F = null, from = null, seen = null, closed = null, stamp = 0, heap = null;
function lineClear(ax, az, bx, bz, road = true) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.2));
  let [pi, pj] = cellOf(ax, az), prev = idx(pi, pj);
  for (let t = 1; t <= n; t++) {
    const [i, j] = cellOf(ax + (bx - ax) * t / n, az + (bz - az) * t / n); if (!inb(i, j)) return false;
    const k = idx(i, j); if (k === prev) continue;
    if (!link(prev, k, pi, pj, i, j)) return false;
    if (road && cost[k] > cost[prev] + 0.01) return false;   // 拉直時不要離開步道切過草地
    prev = k; pi = i; pj = j;
  }
  return true;
}
/** 兩點之間能直直走過去（不撞牆、不下水、沒有一步跨不上的高低差）；routine.js 繞過擋路的人時用 */
export function clear(ax, az, bx, bz) { return !ready() || lineClear(ax, az, bx, bz, false); }
/** 從 (x0, z0) 走到 (x1, z1) 的路線：轉折點陣列（不含起點、含終點），找不到回傳 null */
export function path(x0, z0, x1, z1, maxN = 26000) {
  if (!ready()) return null;
  const s = snapCell(x0, z0, 2), g = snapCell(x1, z1, 3); if (s < 0 || g < 0) return null;
  if (s === g) return [[x1, z1]];
  if (!G) { G = new Float32Array(N * N); F = new Float32Array(N * N); from = new Int32Array(N * N); seen = new Uint32Array(N * N); closed = new Uint32Array(N * N); heap = new Int32Array(N * N * 8); }   // 同一格可能因為找到更短的路而重複放進堆積
  stamp++;
  const gi = g % N, gj = Math.floor(g / N), hh = k => { const dx = Math.abs(k % N - gi), dz = Math.abs(Math.floor(k / N) - gj); return (Math.max(dx, dz) + 0.4142 * Math.min(dx, dz)); };
  let hn = 0;
  const push = k => { let i = hn++; heap[i] = k; while (i > 0) { const p = (i - 1) >> 1; if (F[heap[p]] <= F[k]) break; heap[i] = heap[p]; i = p; } heap[i] = k; };
  const pop = () => { const top = heap[0], last = heap[--hn]; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; const fm = () => (m === i ? F[last] : F[heap[m]]); if (l < hn && F[heap[l]] < fm()) m = l; if (r < hn && F[heap[r]] < fm()) m = r; if (m === i) break; heap[i] = heap[m]; i = m; } heap[i] = last; return top; };
  G[s] = 0; F[s] = hh(s); from[s] = -1; seen[s] = stamp; push(s);
  let found = false, n = 0;
  while (hn > 0) {
    const k = pop(); if (closed[k] === stamp) continue; closed[k] = stamp;
    if (k === g) { found = true; break; }
    if (++n > maxN) break;
    const ki = k % N, kj = Math.floor(k / N);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i = ki + di, j = kj + dj; if (!inb(i, j)) continue;
      const b = idx(i, j); if (closed[b] === stamp || !link(k, b, ki, kj, i, j)) continue;
      const ng = G[k] + (di && dj ? 1.4142 : 1) * (cost[k] + cost[b]) * 0.5;
      if (seen[b] !== stamp || ng < G[b]) { seen[b] = stamp; G[b] = ng; F[b] = ng + hh(b); from[b] = k; push(b); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = g; k !== -1; k = from[k]) cells.push(k); cells.reverse();
  const pts = cells.map(k => centerOf(k % N, Math.floor(k / N)));
  pts[0] = [x0, z0]; if (Math.hypot(x1 - pts[pts.length - 1][0], z1 - pts[pts.length - 1][1]) < 0.8) pts[pts.length - 1] = [x1, z1];
  // 拉直：從目前的點往後找最遠、中間都走得過去的點
  const out = []; let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !lineClear(pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--;
    out.push(pts[b]); a = b;
  }
  return out;
}
/** 路線的總長（公尺） */
export const lengthOf = (x, z, pts) => { let L = 0, px = x, pz = z; for (const [a, b] of pts) { L += Math.hypot(a - px, b - pz); px = a; pz = b; } return L; };
