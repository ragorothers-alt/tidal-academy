/* 潮汐小島 · 博物館的海洋館（v9.0）：從博物館的拱門走進相連的海洋館（data/interiors_aquarium.js，Codex 製作）。
   捐贈過的海洋生物依棲地住進四座水族缸——珊瑚礁、淺灘、海草床與中央圓柱的外海深處，用潛水時同一套模型在缸裡游、爬或輕輕搖。
   缸裡的珊瑚、岩石、海草與小魚群（不是館藏）也擺在這裡，還沒有館藏時缸也不會空蕩蕩。走到缸前按 E 看這一缸的館藏與說明。 */
import * as THREE from 'three';
import * as ui from './ui.js';
import { S, list, icon, stars, fmtHours, fmtMonths, whereName, photoOnly } from './state.js';
import { model, fishGeo, HAB } from './dive.js';

const DECO = {
  reef: [['coral_table', 2], ['coral_branch', 4], ['coral_round', 3], ['rock_a', 2], ['anemone_bed', 2], ['sea_urchins', 1]],
  shallow: [['rock_b', 2], ['sea_urchins', 1], ['anemone_bed', 1], ['seagrass_patch', 1]],
  seagrass: [['seagrass_patch', 4], ['rock_b', 1]],
  deep: [['rock_a', 1], ['rock_b', 1]]
};
const FISH = { reef: ['#ff9a3a', '#4aa0ff'], shallow: ['#ffd84a'], seagrass: ['#c8e070'], deep: ['#c0d8f0'] };
let root = null, tanks = [], dwellers = [], schools = [], placed = new Set();
/** 館藏（海洋館裡有幾種） */
export const count = () => Object.keys(S().museum.marine || {}).length;
const rnd = () => Math.random();
/** 缸裡一個隨機點（離玻璃與缸壁留一點邊）；floor：貼在沙上 */
function inTank(tk, floor, m = 0.25) {
  if (tk.cyl) { const [cx, cz, r, y0, y1] = tk.cyl, a = rnd() * 6.28, d = Math.sqrt(rnd()) * (r - m); return new THREE.Vector3(cx + Math.cos(a) * d, floor ? y0 : y0 + 0.4 + rnd() * (y1 - y0 - 0.9), cz + Math.sin(a) * d); }
  const [x0, y0, z0, x1, y1, z1] = tk.box;
  return new THREE.Vector3(x0 + m + rnd() * (x1 - x0 - 2 * m), floor ? y0 : y0 + 0.4 + rnd() * (y1 - y0 - 0.9), z0 + m + rnd() * (z1 - z0 - 2 * m));
}
function clampIn(tk, p, m = 0.2) {
  if (tk.cyl) { const [cx, cz, r, y0, y1] = tk.cyl, dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz); if (d > r - m) { p.x = cx + dx / d * (r - m); p.z = cz + dz / d * (r - m); } p.y = THREE.MathUtils.clamp(p.y, y0 + 0.1, y1 - 0.35); return; }
  const [x0, y0, z0, x1, y1, z1] = tk.box; p.x = THREE.MathUtils.clamp(p.x, x0 + m, x1 - m); p.y = THREE.MathUtils.clamp(p.y, y0 + 0.1, y1 - 0.35); p.z = THREE.MathUtils.clamp(p.z, z0 + m, z1 - m);
}
/** 缸的大小（最短的一邊）：模型縮放用 */
const tankSpan = tk => tk.cyl ? tk.cyl[2] * 2 : Math.min(tk.box[3] - tk.box[0], tk.box[5] - tk.box[2]);

/** 第一次進館：擺好每座缸的造景與小魚群 */
function setup(ud) {
  root = new THREE.Group(); root.name = '海洋館的水族缸'; tanks = ud.tanks || []; dwellers = []; schools = []; placed = new Set();
  tanks.forEach(tk => {
    const span = tankSpan(tk), c = tk.cyl ? [tk.cyl[0], tk.cyl[4] - 0.4, tk.cyl[1]] : [(tk.box[0] + tk.box[3]) / 2, tk.box[4] - 0.4, (tk.box[2] + tk.box[5]) / 2];
    const lt = new THREE.PointLight(tk.where === 'deep' ? '#5f9fe0' : '#9fe4ff', tk.where === 'deep' ? 3 : 6, span * 2.6 + 2, 1.6); lt.position.set(...c); root.add(lt);   // 缸裡的水色燈：照亮沙、珊瑚與生物，也從玻璃透出來
    (DECO[tk.where] || []).forEach(([key, n]) => {
      for (let i = 0; i < n; i++) {
        const m = model('REEFMODELS', key); if (!m) continue;
        const p = inTank(tk, true, 0.45); m.position.copy(p); m.rotation.y = rnd() * 6.28; m.scale.setScalar(Math.min(1, span / 2.2) * (0.6 + rnd() * 0.3));
        m.userData.sway = m.userData.anim === 'sway'; m.userData.ph = rnd() * 6; root.add(m); dwellers.push({ m, deco: true, tk });
      }
    });
    (FISH[tk.where] || []).forEach(color => {
      const n = tk.where === 'reef' ? 12 : 8, im = new THREE.InstancedMesh(fishGeo(), new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.15, flatShading: true, side: THREE.DoubleSide }), n);
      im.frustumCulled = false; root.add(im);
      schools.push({ im, n, tk, c: inTank(tk, false, 0.6), r: Math.min(0.9, span * 0.3), w: (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.3), off: Array.from({ length: n }, () => [rnd() * 0.3, (rnd() - 0.5) * 0.4, rnd() * 6.28]) });
    });
  });
}
/** 捐過、還沒放進缸的生物：放進牠棲地的缸（沒有那座缸就放珊瑚礁缸） */
function stock() {
  const got = S().museum.marine || {};
  list('marine').forEach(sp => {
    if (!got[sp.id] || placed.has(sp.id)) return;
    const tk = tanks.find(t => t.where === sp.where) || tanks[0]; if (!tk) return;
    const m = model('MARINEMODELS', sp.id); if (!m) return;
    const anim = m.userData.anim || 'still', kind = sp.speed === 0 ? 'fixed' : ['crawl', 'still', 'clam', 'sway'].includes(anim) ? 'crawl' : 'swim';
    const L = (sp.size || 20) / 100, s = THREE.MathUtils.clamp(0.35 / Math.max(0.12, Math.min(L, 1)), 1, 2.2);   // 小生物放大一點，看得清楚
    m.scale.setScalar(s); const p = inTank(tk, kind !== 'swim', 0.35); m.position.copy(p); m.rotation.y = rnd() * 6.28; root.add(m);
    const parts = { tail: m.getObjectByName('tail'), finL: m.getObjectByName('finL'), finR: m.getObjectByName('finR'), bell: m.getObjectByName('bell'), lid: m.getObjectByName('lid'), arms: [], legs: [] };
    for (let k = 0; k < 16; k++) { const a = m.getObjectByName('arm' + k), l = m.getObjectByName('leg' + k); if (a) parts.arms.push(a); if (l) parts.legs.push(l); }
    dwellers.push({ m, sp, anim, kind, parts, tk, ph: rnd() * 6.28, goal: null, dir: new THREE.Vector3(Math.cos(p.x), 0, Math.sin(p.z)).normalize() });
    placed.add(sp.id);
  });
}
/** 進館（house.enter 的 dress）：回傳要擺進場景的東西 */
export function dress(ud) {
  if (!root || root.userData.ud !== ud) { setup(ud); root.userData.ud = ud; }
  stock(); return [root];
}
const tmp = new THREE.Vector3(), sm = new THREE.Matrix4(), sq = new THREE.Quaternion(), ss = new THREE.Vector3(1, 1, 1), sv = new THREE.Vector3(), se = new THREE.Euler();
/** 每一格：生物在缸裡游、爬、搖；小魚群繞圈 */
export function tick(dt, t) {
  if (!root || !root.parent) return;
  const s = Math.sin;
  for (const d of dwellers) {
    const m = d.m;
    if (d.deco) { if (m.userData.sway) m.rotation.z = s(t * 0.8 + m.userData.ph) * 0.04; continue; }
    const P = d.parts, ph = d.ph, sp = d.sp;
    if (P.tail) P.tail.rotation.y = s(t * (2 + sp.speed * 2) + ph) * 0.35;
    if (P.finL) { P.finL.rotation.z = s(t * 1.8 + ph) * 0.55; if (P.finR) P.finR.rotation.z = -s(t * 1.8 + ph) * 0.55; }
    if (P.bell) { const k = Math.max(0, s(t * 2.1 + ph)); P.bell.scale.set(1 + k * 0.12, 1 - k * 0.16, 1 + k * 0.12); }
    if (P.lid) P.lid.rotation.x = -(0.12 + 0.12 * Math.max(0, s(t * 0.5 + ph)));
    P.arms.forEach((a, i) => { a.rotation.x = s(t * 2 + i * 0.8 + ph) * 0.22; });
    P.legs.forEach((l, i) => { l.rotation.x = s(t * 9 + i * 1.3) * (d.kind === 'crawl' ? 0.3 : 0.06); });
    if (d.anim === 'sway') m.rotation.z = s(t * 0.9 + ph) * 0.05;
    if (d.kind === 'fixed') continue;
    if (!d.goal || m.position.distanceTo(d.goal) < 0.25) d.goal = inTank(d.tk, d.kind === 'crawl', 0.35);
    tmp.copy(d.goal).sub(m.position); if (d.kind === 'crawl') tmp.y = 0; tmp.normalize();
    d.dir.lerp(tmp, Math.min(1, dt * 0.9)).normalize();
    const spd = d.kind === 'crawl' ? 0.07 + sp.speed * 0.03 : [0, 0.14, 0.26, 0.4][sp.speed] || 0.2;
    m.position.addScaledVector(d.dir, spd * dt); clampIn(d.tk, m.position);
    if (d.kind === 'crawl') m.position.y = d.tk.cyl ? d.tk.cyl[3] : d.tk.box[1];
    m.rotation.y = Math.atan2(d.dir.x, d.dir.z);
  }
  for (const f of schools) {
    for (let i = 0; i < f.n; i++) {
      const [ro, yo, ph] = f.off[i], a = t * f.w + i * 0.5 + ph * 0.1, r = f.r + ro;
      sv.set(f.c.x + Math.cos(a) * r, f.c.y + yo + s(t * 1.3 + ph) * 0.08, f.c.z + Math.sin(a) * r); clampIn(f.tk, sv, 0.12);
      se.set(0, Math.atan2(-Math.sin(a) * Math.sign(f.w), Math.cos(a) * Math.sign(f.w)) + s(t * 9 + ph) * 0.12, 0); sq.setFromEuler(se);
      f.im.setMatrixAt(i, sm.compose(sv, sq, ss));
    }
    f.im.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- 缸前按 E：這一缸的館藏 ---------- */
export function openTank(where) {
  const s = S(), got = s.museum.marine || {}, L2 = list('marine').filter(x => x.where === where), n = L2.filter(x => got[x.id]).length, name = (HAB[where] || {}).name || '';
  const body = ui.el('div', 'dex'), grid = ui.el('div', 'dex-grid'), info = ui.el('div', 'dex-info', `<small class="muted">${name}水族缸的館藏 ${n} / ${L2.length}。點一下看說明；灰色的還沒捐贈——穿上潛水衣，到${name}的潛點找找看。</small>`);
  L2.forEach(x => {
    const has = got[x.id], b = ui.el('button', 'dex-cell' + (has ? ' donated' : ' unknown'), `<img src="${icon(x.id, 'marine')}" alt="">`); b.type = 'button';
    b.onclick = () => {
      info.innerHTML = has ? `<div class="pk-sel"><img src="${icon(x.id, 'marine')}" alt=""><div><b>${ui.esc(x.name)} <small>${ui.esc(x.en || '')}</small></b><small>${whereName('marine', x)}${x.tide === 'high' ? '（漲潮）' : ''} · ${fmtHours(x)} · ${fmtMonths(x)} · ${stars(x.rarity)}${photoOnly('marine', x) ? ' · 照片與模型展示（本尊留在海裡）' : ''}</small><p>${ui.esc(x.desc || '')}</p>${x.fact ? `<p><b>小知識：</b>${ui.esc(x.fact)}</p>` : ''}</div></div>`
        : `<div class="pk-sel"><img class="sil" src="${icon(x.id, 'marine')}" alt=""><div><b>？？？</b><small>出沒：潛水・${whereName('marine', x)} · ${fmtHours(x)} · ${fmtMonths(x)}</small></div></div>`;
    };
    grid.appendChild(b);
  });
  body.append(grid, info); ui.panel(`海洋館 · ${name}`, body, { cls: 'dexp' });
}
export const debug = () => ({ tanks: tanks.map(t => t.where), dwellers: dwellers.filter(d => !d.deco).map(d => d.sp.id), schools: schools.length });
