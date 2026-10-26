/* 潮汐小島 · 牆上的藤蔓與垂花（v6.81）：參考插畫裡每棟房子都有的生活感——爬牆的藤蔓、屋簷垂下的藤花、窗台花箱、門邊的吊花籃。
   模型是 Codex 照參考圖重建的（data/propmodels4.js：ivy_wall、ivy_drape、window_box、hanging_basket，牆面在 z = 0、植物往 +z 長）。
   位置從建築本身找：glow.js 掃描出來的窗戶（位置、朝向、窗框上下緣）與門口，再從牆外往牆打一條射線，貼在真正的牆面上。
   同一種模型全部共用 InstancedMesh（一種零件一次畫完）。所有建築都蓋好之後（main.js，鋪草之前）呼叫 init() */
import * as THREE from 'three';
import { scene, bend } from './engine.js';
import { groundAt, cliffTops } from './terrain.js';
import { protoParts, chunkInstances, homes, SITES } from './props.js';
import { buildings } from './props3d.js';

const ray = new THREE.Raycaster(), vO = new THREE.Vector3(), vD = new THREE.Vector3();
/** 從牆外（朝外的方向 nx, nz）往牆打射線，回傳牆面上的點與距離 */
function wallHit(g, x, y, z, nx, nz) {
  vO.set(x + nx * 3, y, z + nz * 3); vD.set(-nx, 0, -nz); ray.set(vO, vD); ray.far = 4.5;
  const h = ray.intersectObject(g, true).find(h => h.object.isMesh && !h.object.material.transparent);
  return h ? { x: h.point.x, y: h.point.y, z: h.point.z, d: h.distance } : null;
}
const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
const NO_SWAY = new Map();
/** 貼在牆上的葉子不跟著風擺（擺動會讓藤蔓離開牆面）：sway 材質換成合併版（TA_MERGED，四季變色照舊） */
const still = m => { if (m.userData.kind !== 'sway' || (m.defines && 'TA_MERGED' in m.defines)) return m; if (!NO_SWAY.has(m)) { const c = m.clone(); c.defines = Object.assign({}, m.defines, { TA_MERGED: '' }); NO_SWAY.set(m, bend(c, 'sway')); } return NO_SWAY.get(m); };

const PLACE = { ivy_wall: [], ivy_drape: [], window_box: [], hanging_basket: [] };
const put = (key, x, y, z, nx, nz, sx) => PLACE[key].push(new THREE.Matrix4().compose(new THREE.Vector3(x + nx * 0.012, y, z + nz * 0.012), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(nx, nz)), new THREE.Vector3(sx || 1, 1, 1)));   // sx：沿牆方向縮窄
export const counts = () => Object.fromEntries(Object.entries(PLACE).map(([k, v]) => [k, v.length]));

function dress(g, doors) {
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), gy = groundAt(c.x, c.z), r = hash(c.x, c.z);
  const wins = g.userData.glow.filter(e => e.kind === 'window');
  const door = doors.find(d => d[0] > box.min.x - 0.4 && d[0] < box.max.x + 0.4 && d[1] > box.max.z - 0.6 && d[1] < box.max.z + 3.2);
  const nearWin = (x, z, nx, nz, y0, y1, pad) => wins.some(w => w.nx === nx && w.nz === nz && Math.abs((nx ? w.z - z : w.x - x)) < w.w2 + pad && w.y1 > y0 && w.y0 < y1);
  // 1. 窗台花箱：一樓的窗戶（最多三扇），花箱頂邊貼在窗框下緣
  wins.filter(w => w.y0 - groundAt(w.x, w.z) > 0.45 && w.y0 - groundAt(w.x, w.z) < 2.4 && w.w2 > 0.22 && !(door && w.nz > 0 && Math.abs(w.x - door[0]) < 0.9))
    .sort((a, b) => a.y0 - b.y0).slice(0, 3).forEach(w => {
      const h = wallHit(g, w.x, w.y0 - 0.12, w.z, w.nx, w.nz); if (!h || h.d > 3.6) return;
      put('window_box', h.x, w.y0 - 0.03, h.z, w.nx, w.nz);
    });
  // 牆面的實際範圍（建築的包圍盒含屋簷、台階，不是牆）：沿牆每 0.2 公尺打一條射線，最常出現的深度就是牆面
  const spans = {};
  for (const [nx, nz] of [[0, 1], [1, 0], [-1, 0]]) {
    const lo = nz ? box.min.x : box.min.z, hi = nz ? box.max.x : box.max.z, hits = [];
    for (let u = lo + 0.1; u < hi; u += 0.2) {
      const px = nz ? u : nx > 0 ? box.max.x : box.min.x, pz = nz ? box.max.z : u, h = wallHit(g, px, gy + 1.3, pz, nx, nz);
      if (h) hits.push({ u, h, k: Math.round((nz ? h.z : h.x) * 10) });
    }
    if (hits.length < 4) continue;
    const tally = {}; hits.forEach(o => { tally[o.k] = (tally[o.k] || 0) + 1; });
    const wk = +Object.entries(tally).sort((a, b) => nz || nx > 0 ? b[1] - a[1] || b[0] - a[0] : b[1] - a[1] || a[0] - b[0])[0][0];
    const on = hits.filter(o => Math.abs(o.k - wk) <= 1);   // 落在牆面上的取樣（台階、門廊柱、燈籠會比較凸出）
    spans[nx + ',' + nz] = { nx, nz, plane: wk / 10, u0: Math.min(...on.map(o => o.u)), u1: Math.max(...on.map(o => o.u)), on };
  }
  const onWall = (s, u, half) => s.on.some(o => Math.abs(o.u - (u - half)) < 0.15) && s.on.some(o => Math.abs(o.u - (u + half)) < 0.15) && s.on.some(o => Math.abs(o.u - u) < 0.15);
  // 2. 門邊的吊花籃：門的兩側、正面兩個角；避開窗戶與門框
  const front = spans['0,1'];
  if (front) {
    const cand = (door ? [door[0] + 0.85, door[0] - 0.85, door[0] + 1.25, door[0] - 1.25] : []).concat([front.u0 + 0.35, front.u1 - 0.35]);
    if (r < 0.5) cand.reverse();
    for (const bx of cand) {
      if (bx < front.u0 + 0.2 || bx > front.u1 - 0.2 || nearWin(bx, 0, 0, 1, gy + 1.1, gy + 2.2, 0.15) || (door && Math.abs(bx - door[0]) < 0.6) || !onWall(front, bx, 0.15)) continue;
      put('hanging_basket', bx, gy + 2.05, front.plane, 0, 1); break;
    }
  }
  // 3. 爬牆藤蔓：側牆靠前半段，從地面往上爬（避開那面牆上的窗）
  for (const side of r < 0.5 ? [1, -1] : [-1, 1]) {
    const px = side > 0 ? box.max.x : box.min.x, pz = c.z + (box.max.z - c.z) * 0.35;
    if (nearWin(px, pz, side, 0, gy, gy + 2.6, 0.75)) continue;
    const h = wallHit(g, px, gy + 0.9, pz, side, 0); if (!h || h.d > 3.6) continue;
    put('ivy_wall', h.x, gy - 0.03, h.z, side, 0); break;
  }
  // 4. 屋簷垂下的藤花：正面或側牆，從屋簷下緣垂下來；靠近窗戶時縮窄（不蓋住窗）。約七成的房子有
  if (r > 0.3) {
    const order = [spans['0,1'], r < 0.65 ? spans['-1,0'] : spans['1,0'], r < 0.65 ? spans['1,0'] : spans['-1,0']].filter(Boolean);
    let done = false;
    for (const s of order) {
      if (done) break;
      for (const t of [0.12, 0.88, 0.5, 0.3, 0.7]) {
        const u = s.u0 + (s.u1 - s.u0) * t;
        let eave = null, prev = null;
        for (let y = gy + 1.4; y < gy + 5.5; y += 0.12) {   // 往上掃：一直打在牆面上；打到更凸出的屋簷、或打不到，就是屋簷下緣
          const h = wallHit(g, s.nz ? u : (s.nx > 0 ? box.max.x : box.min.x), y, s.nz ? box.max.z : u, s.nx, s.nz);
          const dk = h ? Math.round((s.nz ? h.z : h.x) * 10) : null;
          if (dk === null || (s.nz ? dk > Math.round(s.plane * 10) + 1 : s.nx > 0 ? dk > Math.round(s.plane * 10) + 1 : dk < Math.round(s.plane * 10) - 1)) { eave = prev; break; }
          prev = y;
        }
        if (!eave || eave - gy < 1.9 || eave - gy > 3.7 || (door && s.nz && Math.abs(u - door[0]) < 1.1)) continue;   // 太高：掃到了山牆的三角形（不是屋簷）
        let k = 1; while (k > 0.45 && nearWin(s.nz ? u : 0, s.nz ? 0 : u, s.nx, s.nz, eave - 1.4, eave, 0.85 * k)) k -= 0.15;   // 太靠近窗戶：縮窄一點再試
        if (k <= 0.45 || !onWall(s, u, 0.85 * k * 0.8)) continue;
        put('ivy_drape', s.nz ? u : s.plane, eave + 0.02, s.nz ? s.plane : u, s.nx, s.nz, k); done = true; break;
      }
    }
  }
}

export function init() {
  if (!((window.TA.ISLE || {}).PROPMODELS || {}).ivy_wall) return;   // 還沒有模型
  const doors = homes.map(h => h.door).concat(['shop', 'museum', 'exam', 'library'].map(k => SITES[k] && (SITES[k].door || SITES[k].front)).filter(Boolean));
  buildings().forEach(g => { try { dress(g, doors); } catch (e) { console.warn('牆上的植物放不上去：', e); } });
  // v7.4 擋土牆（Codex 第二輪 B7）：台地與山頂邊緣兩公尺高的白石牆，隔一段從牆頂垂下一叢藤、偶爾一叢從牆腳爬上來（只佔牆面一成多，門口附近不放）
  const picked = [];
  cliffTops.forEach(([x, y, z, dx, dz]) => {
    if (y < 2.7) return;   // 牆頂（扣掉草皮邊）約 2.86（台地）、4.86（山頂）
    const gy = groundAt(x + dx * 0.6, z + dz * 0.6); if (y - gy < 1.4) return;
    const h = hash(x * 0.37, z * 0.37); if (h > 0.36 || picked.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6) || doors.some(d => d && Math.hypot(d[0] - x, d[1] - z) < 3)) return;
    picked.push([x, z]);
    if (h < 0.25) put('ivy_drape', x + dx * 0.03, y + 0.16, z + dz * 0.03, dx, dz, 0.55 + h * 1.6);   // 從牆頂的草皮邊（+0.14）垂下來
    else put('ivy_wall', x + dx * 0.03, gy - 0.03, z + dz * 0.03, dx, dz);
  });
  Object.entries(PLACE).forEach(([key, list]) => {
    if (!list.length) return; const parts = protoParts('PROPMODELS', key); if (!parts) return;
    chunkInstances(parts, list, still, true);   // 分塊：看不到的牆上植物不畫；貼在牆上的植物影子只落在牆面，不畫進陰影貼圖
  });
}
