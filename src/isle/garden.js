/* 潮汐小島 · 花園與遺傳：在草地種豌豆、紫茉莉，澆水長大、開花後自花或人工授粉結出子代；
   子代的基因型依孟德爾定律隨機產生，森會用你花園裡真實的親代出遺傳題，答對替你檢測基因型。
   存檔 S().garden = { plants: { "tx,tz": { sp, g, st, wet, pa, pb, known, mate } }, bag: [...], book: { 表現型: 日期 } } */
import * as THREE from 'three';
import { scene, M, mesh } from './engine.js';
import { C, T, groundAt, isBridge } from './terrain.js';
import { blocked, SITES, homes } from './props.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import { pick, dayKey } from './quiz.js';
import * as G from './genetics.js';
import * as miles from './miles.js';

export const SEEDS = [
  { sp: 'pea', g: 'PPTT', name: '紫花高莖豌豆種子', price: 240 },
  { sp: 'pea', g: 'pptt', name: '白花矮莖豌豆種子', price: 240 },
  { sp: 'mira', g: 'RR', name: '紅花紫茉莉種子', price: 240 },
  { sp: 'mira', g: 'WW', name: '白花紫茉莉種子', price: 240 }
];
const HOW = {
  pea_pt: '商店有賣純種（PPTT）種子。', pea_wd: '商店有賣純種（pptt）種子。',
  pea_pd: '純種紫高 × 純種白矮得到 F1（PpTt），讓 F1 自花授粉，F2 就有機會出現。',
  pea_wt: '純種紫高 × 純種白矮得到 F1（PpTt），讓 F1 自花授粉，F2 就有機會出現。',
  mira_r: '商店有賣純種（RR）種子。', mira_w: '商店有賣純種（WW）種子。',
  mira_k: '讓紅花和白花紫茉莉相鄰開花，或替它們人工授粉。'
};
const STAGE = ['新芽', '花苞', '開花'];
const BAG_MAX = 40;
const data = () => { const s = S(); s.garden = s.garden || {}; const g = s.garden; g.plants = g.plants || {}; g.bag = g.bag || []; g.book = g.book || {}; return g; };
export const bookCount = () => Object.keys(data().book).length;
export const plantCount = () => Object.keys(data().plants).length;

/* ---------- 外觀 ---------- */
const group = new THREE.Group(); scene.add(group);
const meshes = {};
const cell = k => { const [tx, tz] = k.split(',').map(Number); return { tx, tz, x: tx - C + 0.5, z: tz - C + 0.5 }; };
const GREEN = '#5aa845', LEAF = '#6fbf52';
function leaf(g, x, y, z, r, s) { const m = mesh(new THREE.SphereGeometry(0.07, 8, 6), M(LEAF), x, y, z, { noCast: true }); m.scale.set(1.5 * s, 0.35 * s, 0.8 * s); m.rotation.y = r; g.add(m); }
function build(k) {
  if (meshes[k]) { group.remove(meshes[k]); delete meshes[k]; }
  const p = data().plants[k]; if (!p) return;
  const { x, z } = cell(k), g = new THREE.Group(); g.position.set(x, groundAt(x, z), z);
  g.add(mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.05, 12), M(p.wet ? '#4a3020' : '#7a5238'), 0, 0.025, 0, { noCast: true }));
  const ph = G.pheno(G.phenoOf(p.sp, p.g)), H = p.sp === 'pea' ? (ph.tall ? 0.85 : 0.4) : 0.58;
  if (p.st === 0) { leaf(g, 0.05, 0.09, 0, 0.3, 1); leaf(g, -0.05, 0.09, 0, -0.3 + Math.PI, 1); g.add(mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.08, 5), M(GREEN), 0, 0.06, 0)); }
  else {
    const h = p.st === 1 ? H * 0.6 : H;
    g.add(mesh(new THREE.CylinderGeometry(0.014, 0.02, h, 5), M(GREEN, {}, 'pine'), 0, h / 2 + 0.04, 0));
    for (let i = 0; i < 3; i++) leaf(g, Math.cos(i * 2.1) * 0.07, 0.08 + h * (0.25 + i * 0.2), Math.sin(i * 2.1) * 0.07, i * 2.1, 1.1);
    if (p.st === 1) g.add(mesh(new THREE.SphereGeometry(0.055, 8, 6), M('#8cc66a'), 0, h + 0.06, 0));
    else if (p.sp === 'pea') {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.4, fx = Math.cos(a) * 0.08, fz = Math.sin(a) * 0.08, fy = h - i * 0.08;
        const f1 = mesh(new THREE.SphereGeometry(0.065, 8, 6), M(ph.color), fx, fy, fz); f1.scale.set(1, 0.9, 0.45); f1.rotation.y = a; g.add(f1);
        const f2 = mesh(new THREE.SphereGeometry(0.04, 8, 6), M(ph.color), fx * 1.3, fy - 0.04, fz * 1.3); g.add(f2);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const a = i * 1.257, r = i ? 0.09 : 0, fy = h + (i ? -0.04 : 0.02);
        const c = mesh(new THREE.ConeGeometry(0.06, 0.13, 8, 1, true), M(ph.color, { side: THREE.DoubleSide }), Math.cos(a) * r, fy, Math.sin(a) * r); c.rotation.x = Math.PI; c.rotation.z = (i ? 0.5 : 0) * Math.cos(a); g.add(c);
      }
    }
  }
  g.scale.setScalar(1.45); g.traverse(o => { o.frustumCulled = false; });
  group.add(g); meshes[k] = g;
}
export function init(player, h) { P = player; hooks = h || {}; Object.keys(data().plants).forEach(build); }
let P = null, hooks = {};

/* ---------- 格子 ---------- */
const keyOf = (tx, tz) => tx + ',' + tz;
function front() { const fx = P.position.x + Math.sin(P.rotation.y) * 0.95, fz = P.position.z + Math.cos(P.rotation.y) * 0.95; const tx = Math.floor(fx + C), tz = Math.floor(fz + C); return { tx, tz, k: keyOf(tx, tz) }; }
function canPlant(tx, tz) {
  const t = T(tx, tz), x = tx - C + 0.5, z = tz - C + 0.5, s = S();
  if (isBridge(tx, tz) || (t !== 1 && t !== 2)) return '花要種在草地上';
  if ((s.design || {})[keyOf(tx, tz)] || data().plants[keyOf(tx, tz)]) return '這格已經有東西了';
  if (blocked(x, z, 0.4)) return '這裡太擠了';
  const doors = [...homes.map(h => h.door), SITES.museum && SITES.museum.front, SITES.shop && SITES.shop.front, SITES.exam && SITES.exam.door, SITES.library && SITES.library.door, SITES.lighthouse && SITES.lighthouse.door, SITES.board && SITES.board.door, SITES.telescope && SITES.telescope.door].filter(Boolean);
  if (doors.some(d => Math.hypot(d[0] - x, d[1] - z) < 1.2)) return '不要擋住門口';
  if ((s.spots || []).some(o => !o.dug && Math.hypot(o.x - x, o.z - z) < 0.9)) return '這裡有化石裂縫';
  return null;
}
const nb = (k, r) => { const { tx, tz } = cell(k), out = []; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dx || dz) out.push([tx + dx, tz + dz, dx, dz]); return out; };
const dirName = (dx, dz) => ((dx < 0 ? '西' : dx > 0 ? '東' : '') + (dz < 0 ? '北' : dz > 0 ? '南' : '')) + '邊';
const label = (p, full) => (p.st < 2 ? G.SPECIES[p.sp].name + '（還沒開花）' : G.pheno(G.phenoOf(p.sp, p.g)).name) + (full && p.known ? ` ${p.g}` : '');
const bagLabel = b => (b.st >= 2 || b.known ? G.pheno(G.phenoOf(b.sp, b.g)).name + (b.st >= 2 ? '' : '種子') : G.SPECIES[b.sp].name + (b.st != null ? '幼苗' : '種子')) + (b.known ? `（${b.g}）` : '（基因型未知）');

/* ---------- 互動 ---------- */
/** 面前的格子適合做什麼：回傳提示文字（沒有就空字串） */
export function hint(tool, spotAhead) {
  if (!P) return '';
  const f = front(), p = data().plants[f.k];
  if (p) return tool === 'can' ? (p.wet ? '查看花' : '澆水') : tool === 'shovel' ? '挖起花苗' : !tool ? '查看花' : '';
  if (tool === 'shovel' && !spotAhead && data().bag.length && !canPlant(f.tx, f.tz)) return '種花';
  return '';
}
/** E：回傳要執行的動作（async 函式），沒有就 null */
export function handler(tool, spotAhead) {
  if (!P) return null;
  const f = front(), p = data().plants[f.k];
  if (p) { if (tool === 'can' && !p.wet) return () => water(f.k); if (tool === 'shovel') return () => digUp(f.k); if (!tool || tool === 'can') return () => inspect(f.k); return null; }
  if (tool === 'shovel' && !spotAhead && data().bag.length && !canPlant(f.tx, f.tz)) return () => plant(f.k);
  if (tool === 'can') return async () => { ui.toast('對著花澆水吧（買種子：阿潮的商店）'); };
  return null;
}
const GARDEN = { name: '花園', color: '#5aa845', voice: 520 };
async function water(k) {
  const p = data().plants[k]; p.wet = true; save(); build(k); miles.add('water');
  P.userData.swing = 1; Audio.sfx('plop'); ui.floatText(meshes[k], '💧', '#5ab0ff');
  ui.toast(p.st < 2 ? `澆好水了，明天${p.st === 0 ? '會長出花苞' : '就會開花'}！` : p.mate ? '澆好水了，明天會結出人工授粉的種子' : '澆好水了，開花的植株澆水後有機會結出種子');
}
async function inspect(k) {
  const g = data(), p = g.plants[k], ph = G.phenoOf(p.sp, p.g);
  const parts = [label(p), STAGE[p.st], p.wet ? '今天澆過水' : '還沒澆水', p.known ? `基因型 ${p.g}` : '基因型 ？？（可以請森檢測）'];
  if (p.pa) parts.push(`親代 ${p.self ? p.pa + '（自花授粉）' : p.pa + ' × ' + p.pb}`.replace(/undefined/g, '？'));
  await ui.say(GARDEN, parts.join('｜'));
  if (p.mate) { const m = g.plants[p.mate]; await ui.say(GARDEN, `已經人工授粉（父本：${m ? label(m, true) : '已不在'}），澆水後明天會結出種子。`); }
  if (p.st === 2 && p.sp === 'pea') {
    const h = await ui.ask(GARDEN, '豌豆結莢了！', ['採收豌豆（+2，植株回到花苞）', '看看人工授粉', '先不要']);
    if (h === 0) { const s = S(); s.mats = s.mats || {}; s.mats.pea = (s.mats.pea || 0) + 2; p.st = 1; p.wet = false; p.mate = null; save(); build(k); Audio.sfx('pop'); ui.toast('採收了 2 個豌豆，可以拿來做菜'); return; }
    if (h !== 1) return;
  }
  if (p.st < 1 || (p.st < 2 && p.sp !== 'pea')) return;
  const bud = p.st === 1;
  const mates = nb(k, 2).map(([x, z]) => [keyOf(x, z), g.plants[keyOf(x, z)]]).filter(([, q]) => q && q.sp === p.sp && q.st === 2);
  if (!mates.length) { if (!p.mate && !bud) await ui.say(GARDEN, p.sp === 'pea' ? '豌豆會自花授粉：澆了水，明天有機會結出自交的種子。附近有開花的豌豆時，也可以替它人工授粉（實際上要趁花苞還沒散粉時去雄）。' : '真實的紫茉莉也能自花授粉。本遊戲簡化為相鄰植株間傳粉或人工授粉：讓兩株開花的紫茉莉相鄰並澆水，就有機會結種子。'); return; }
  const i = await ui.ask(GARDEN, bud ? '這株豌豆還是花苞，正是去雄的好時機。要替它人工授粉嗎？' : '要替這株花人工授粉嗎？', ['人工授粉', '先不要']);
  if (i !== 0) return;
  const { tx, tz } = cell(k);
  const j = await ui.ask(GARDEN, '要用哪一株的花粉？（這株當母本）', mates.slice(0, 6).map(([mk, q]) => { const c = cell(mk); return `${label(q, true)}（${dirName(c.tx - tx, c.tz - tz)}）`; }).concat(['算了']));
  if (j < 0 || j >= Math.min(6, mates.length)) return;
  p.mate = mates[j][0]; save(); Audio.sfx('pop');
  await ui.say(GARDEN, p.sp === 'pea' ? (bud ? '趁花苞還沒散粉，先摘掉這朵花的雄蕊（去雄），再把另一株的花粉塗到柱頭上——這就是孟德爾的人工授粉。繼續澆水，等它開花後就會結出雜交的種子！' : '實際人工雜交時，應在母本花苞尚未散粉前去雄，避免自花授粉，再把父本花粉塗到柱頭上。遊戲簡化為對開花植株操作，記得澆水，明天會結出雜交的種子！') : '人工雜交要先排除母本自身及其他來源的花粉，再把指定父本花粉塗到柱頭上。遊戲已替你簡化去雄與隔離步驟，記得澆水，明天會結出雜交的種子！');
}
async function digUp(k) {
  const g = data(), p = g.plants[k];
  if (g.bag.length >= BAG_MAX) { await ui.say(GARDEN, '種子袋滿了，先種一些吧。'); return; }
  const i = await ui.ask(GARDEN, `要把這株${label(p)}挖起來，收進種子袋嗎？`, ['挖起來', '不要']);
  if (i !== 0) return;
  g.bag.push({ sp: p.sp, g: p.g, known: p.known, pa: p.pa, pb: p.pb, self: p.self, st: p.st }); delete g.plants[k]; build(k); save(); Audio.sfx('dig');
  ui.toast('收進種子袋了，用鏟子對著草地就能再種下');
}
async function plant(k) {
  const g = data(), groups = [];
  g.bag.forEach((b, i) => { const l = bagLabel(b), e = groups.find(x => x.l === l); if (e) e.i.push(i); else groups.push({ l, i: [i] }); });
  const j = await ui.ask(GARDEN, '要種下什麼？', groups.slice(0, 8).map(x => `${x.l} ×${x.i.length}`).concat(['算了']));
  if (j < 0 || j >= Math.min(8, groups.length)) return;
  const b = g.bag.splice(groups[j].i[0], 1)[0];
  g.plants[k] = { sp: b.sp, g: b.g, st: b.st >= 2 ? 1 : (b.st || 0), wet: false, pa: b.pa, pb: b.pb, self: !!b.self, known: !!b.known, day: dayKey() };
  save(); build(k); P.userData.swing = 1; Audio.sfx('dig');
  ui.toast('種好了！拿澆水壺（4）每天澆水');
}

/* ---------- 每天 ---------- */
/** 下雨時自動澆水 */
export function rain() { const g = data(); let n = 0; Object.entries(g.plants).forEach(([k, p]) => { if (!p.wet) { p.wet = true; n++; build(k); } }); if (n) save(); }
/** 新的一天：澆過水的長大、開花的結種子；回傳摘要（沒有變化回傳空字串） */
export function newDay(rnd) {
  rnd = rnd || Math.random;
  const g = data(), P0 = g.plants, born = [], grown = [], seeds = [];
  const entries = Object.entries(P0);
  entries.forEach(([k, p]) => {
    if (!p.wet || p.st < 2) return;
    let mate = null;
    if (p.mate && P0[p.mate] && P0[p.mate].st === 2 && P0[p.mate].sp === p.sp) mate = P0[p.mate];
    else if (p.sp === 'pea') { if (rnd() < 0.35) mate = p; }
    else { const ms = nb(k, 1).map(([x, z]) => P0[keyOf(x, z)]).filter(q => q && q.sp === p.sp && q.st === 2 && q !== p); if (ms.length && rnd() < 0.3) mate = ms[Math.floor(rnd() * ms.length)]; }
    p.mate = null;
    if (!mate || born.length + seeds.length >= 8) return;
    const child = { sp: p.sp, g: G.breed(p.sp, p.g, mate.g, rnd), pa: p.g, pb: mate.g, self: mate === p, known: false };
    const spots = nb(k, 1).filter(([x, z]) => !P0[keyOf(x, z)] && !canPlant(x, z));
    if (spots.length) { const [x, z] = spots[Math.floor(rnd() * spots.length)]; P0[keyOf(x, z)] = Object.assign(child, { st: 0, wet: false, day: dayKey() }); born.push(keyOf(x, z)); }
    else if (g.bag.length < BAG_MAX) { g.bag.push(child); seeds.push(child); }
  });
  entries.forEach(([, p]) => { if (p.wet && p.st < 2) { p.st++; grown.push(p); } p.wet = false; });
  const fresh = register();
  Object.keys(P0).forEach(build); save();
  const out = [];
  if (grown.length) out.push(`${grown.length} 株長大了`);
  if (born.length) out.push(`冒出 ${born.length} 株新芽`);
  if (seeds.length) out.push(`${seeds.length} 顆種子掉進種子袋`);
  if (fresh.length) out.push(`新花色：${fresh.map(id => G.pheno(id).name).join('、')}`);
  return out.length ? '花園：' + out.join('，') : '';
}
/** 開花的表現型登錄進花園筆記；新登錄每種 300 鈴錢 */
function register() {
  const g = data(), s = S(), fresh = [];
  Object.values(g.plants).forEach(p => { if (p.st < 2) return; const id = G.phenoOf(p.sp, p.g); if (!g.book[id]) { g.book[id] = dayKey(); fresh.push(id); s.bells += 300; } });
  if (fresh.length) save();
  return fresh;
}

/* ---------- 商店與筆記 ---------- */
export function openSeedShop(v, paint) {
  const s = S(), body = ui.el('div', 'fshop');
  const draw = () => {
    body.innerHTML = `<p class="muted">每包 3 顆純種種子 · 你有 ${s.bells.toLocaleString()} 鈴錢 · 種子袋 ${data().bag.length} / ${BAG_MAX}</p>`;
    const grid = ui.el('div', 'fs-grid');
    SEEDS.forEach(it => {
      const ph = G.pheno(G.phenoOf(it.sp, it.g)), si = (I.ICONS || {})['seed_' + it.sp], b = ui.el('button', 'fs-item', `${si ? `<img src="${si}" alt="" style="image-rendering:pixelated">` : `<i class="sw" style="background:radial-gradient(circle at 50% 45%, ${ph.color} 0 32%, #6fbf52 34% 100%)"></i>`}<b>${it.name}</b><small>${it.g} · ${it.price} 鈴錢</small>`); b.type = 'button';
      b.onclick = () => {
        if (s.bells < it.price) { ui.toast('鈴錢不夠了'); Audio.sfx('bad'); return; }
        if (data().bag.length + 3 > BAG_MAX) { ui.toast('種子袋快滿了'); Audio.sfx('bad'); return; }
        s.bells -= it.price; for (let i = 0; i < 3; i++) data().bag.push({ sp: it.sp, g: it.g, known: true }); save(); Audio.sfx('coin'); paint && paint();
        ui.toast(s.gardenTip ? `買了${it.name} ×3` : '買好了！拿鏟子（3）對著草地按 E 種下，再用澆水壺（4）澆水'); s.gardenTip = true; draw();
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
    body.appendChild(ui.el('p', 'muted', '豌豆：花色紫（P）對白（p）、莖高高（T）對矮（t）皆為完全顯性。紫茉莉：花色不完全顯性，RR 紅、RW 粉紅、WW 白。'));
  };
  draw(); ui.panel(`${v.name}的種子櫃`, body, { cls: 'shop-p' });
}
export function openBook() {
  const g = data(), body = ui.el('div', 'gbook');
  const ic = id => (I.ICONS || {})['flower_' + id];
  const rows = G.PHENOS.map(ph => { const got = g.book[ph.id]; return `<div class="gb-row${got ? '' : ' no'}">${ic(ph.id) ? `<img src="${ic(ph.id)}" alt="">` : `<i style="--c:${ph.color}"></i>`}<div><b>${got ? ph.name : '？？？'}</b><small>${got ? '登錄於 ' + got : HOW[ph.id]}</small></div></div>`; }).join('');
  const bag = g.bag.length ? Object.entries(g.bag.reduce((a, b) => { const l = bagLabel(b); a[l] = (a[l] || 0) + 1; return a; }, {})).map(([l, n]) => `${l} ×${n}`).join('、') : '空的';
  body.innerHTML = `<p class="muted">花色登錄 ${bookCount()} / ${G.PHENOS.length} · 花園裡有 ${plantCount()} 株</p>${rows}<p class="muted">種子袋：${bag}</p><p class="muted">玩法：鏟子種下 → 澆水壺每天澆水（下雨會自動澆）→ 兩天後開花。開花的豌豆會自花授粉；對著植株空手按 E 可以人工授粉（豌豆要趁花苞還沒散粉時去雄，花苞期就能操作）。子代的基因型照孟德爾定律隨機決定，可以找森做遺傳題來檢測。</p>`;
  ui.panel('花園筆記', body, { cls: 'phone' });
}

/* ---------- 森的遺傳諮詢 ---------- */
export async function consult(sp) {
  const g = data(), s = S();
  const unk = Object.entries(g.plants).filter(([, p]) => !p.known && p.st >= 2 && p.pa);
  await ui.say(sp, unk.length ? '想知道花的基因型嗎？先陪我想一題，和它親代有關的遺傳題，答對我就幫你檢測。' : '花園裡目前沒有需要檢測的花呢。要不要練一題遺傳題？');
  const opts = unk.slice(0, 6).map(([k, p]) => { const c = cell(k), d = (c.x < -12 ? '西' : c.x > 12 ? '東' : '') + (c.z < -12 ? '北' : c.z > 12 ? '南' : ''); return `檢測：${label(p)}（${d ? '島的' + d + '邊' : '島中央'}）`; });
  const i = await ui.ask(sp, '要做什麼呢？', opts.concat(['練習一題遺傳題', '下次再說']));
  if (i < 0 || i > opts.length) return;
  const rnd = Math.random;
  if (i === opts.length) {
    const d = dayKey(); s.genePractice = s.genePractice && s.genePractice.d === d ? s.genePractice : { d, n: 0 };
    const spc = rnd() < 0.6 ? 'pea' : 'mira', all = spc === 'pea' ? ['PPTT', 'PPTt', 'PpTT', 'PpTt', 'PPtt', 'Pptt', 'ppTT', 'ppTt', 'pptt'] : ['RR', 'RW', 'WW'];
    const self = spc === 'pea' && rnd() < 0.3, a = pick(all), b = self ? a : pick(all), c = G.breed(spc, a, b, rnd), q = G.question(spc, a, b, c, pick(['pheno', 'pheno', 'geno', 'ratio']), rnd, self);
    const j = await ui.ask(sp, q.q, q.o, { keys: true, quiz: true });
    if (j === q.a) { Audio.sfx('ok'); const gain = s.genePractice.n < 5 ? 100 : 0; s.genePractice.n++; s.bells += gain; save(); hooks.paint && hooks.paint(); await ui.say(sp, '答對了！' + (gain ? '這是 100 鈴錢。' : '')); }
    else { Audio.sfx('bad'); await ui.say(sp, `正確答案是「${q.o[q.a]}」。`); }
    await ui.say(sp, q.e);
    return;
  }
  const [k, p] = unk[i], kind = pick(['pheno', 'ratio']), q = G.question(p.sp, p.pa, p.pb || p.pa, p.g, kind, rnd, !!p.self);
  const j = await ui.ask(sp, q.q, q.o, { keys: true, quiz: true });
  if (j !== q.a) { Audio.sfx('bad'); await ui.say(sp, `正確答案是「${q.o[q.a]}」。`); await ui.say(sp, q.e); await ui.say(sp, '沒關係，想通了再來找我檢測。'); return; }
  Audio.sfx('ok'); await ui.say(sp, '答對了！' + q.e);
  p.known = true; s.bells += 200; save(); hooks.paint && hooks.paint();
  const P2 = G.parse(p.sp, p.g), het = P2.some(x => x[0] !== x[1]);
  await ui.say(sp, `檢測結果：這株${label(p)}的基因型是 ${p.g}。${het ? '它有異型合子的基因座，自花授粉後代會出現性狀分離。' : '它是同型合子（純種），自花授粉後代的表現型都和它一樣。'}謝禮 200 鈴錢。`);
  build(k);
}
