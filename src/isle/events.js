/* 潮汐小島 · 季節與學測倒數活動：週末模擬考祭典、倒數 100 天、跨年煙火、學測前夜、考後慶典、春櫻、中秋。 */
import * as THREE from 'three';
import { scene, bend, M, mesh, nightMats, cullable } from './engine.js';
import { groundAt } from './terrain.js';
import { PLAZA, woodSign, mergeStatic } from './props.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import { pickQ, record, pick, dayKey } from './quiz.js';

const TA = window.TA;
let fakeDate = null;
export const now = () => (fakeDate ? new Date(fakeDate) : new Date());
export function setDate(iso) { fakeDate = iso; refresh(); }
const MID_AUTUMN = { 2026: '2026-09-25', 2027: '2027-09-15', 2028: '2028-10-03' };
const LANTERN = { 2027: '2027-02-20', 2028: '2028-02-09', 2029: '2029-02-27' };
const SOLSTICE = { 2026: '2026-12-22', 2027: '2027-12-22', 2028: '2028-12-21' };
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((new Date(key(a)) - new Date(key(b))) / 864e5);
export const NAMES = { solstice: '冬至', xmas: '潮汐冬夜（聖誕）', lantern: '元宵燈會', cram: '考前衝刺', examday: '學測日', halloween: '潮汐夜祭', fish_cup: '釣魚大賽', bug_cup: '捕蟲大會', weekly: '週末模擬考祭典', d100: '學測倒數 100 天', d30: '學測倒數 30 天', d7: '學測倒數 7 天', newyear: '迎新年', eve: '學測前夜', after: '考後慶典', spring: '春櫻季', mid_autumn: '中秋賞月' };
const BANNER = { solstice: '冬至 吃湯圓', xmas: 'Merry Christmas', lantern: '元宵燈會', cram: '考前衝刺 穩穩來', examday: '學測加油！', halloween: '潮汐夜祭', fish_cup: '今日釣魚大賽', bug_cup: '今日捕蟲大會', weekly: '週末模擬考祭典', d100: '學測倒數 100 天！', d30: '倒數 30 天 一起加油', d7: '最後 7 天 穩穩來', newyear: '新年快樂！', eve: '明天見真章 早點睡', after: '辛苦了！考後慶典', spring: '春櫻季', mid_autumn: '中秋快樂' };

/** 今天有哪些活動 */
export function active(d) {
  d = d || now();
  const exam = new Date((TA.S.profile && TA.S.profile.examDate) || '2027-01-22'), left = dayDiff(exam, d), out = [];
  if (left === 100) out.push('d100'); if (left === 30) out.push('d30'); if (left === 7) out.push('d7');
  if (left === 1) out.push('eve');
  if (left <= 0 && left >= -2) out.push('examday');   // 學測考期三天（1/22–1/24）
  if (left >= 2 && left <= 30) out.push('cram');
  if (left <= -3 && left >= -9) out.push('after');
  const m = d.getMonth() + 1, dd = d.getDate();
  if ((m === 12 && dd === 31) || (m === 1 && dd === 1)) out.push('newyear');
  if ((m === 3 && dd >= 20) || (m === 4 && dd <= 20)) out.push('spring');
  if (m === 10 && dd >= 24) out.push('halloween');
  if (SOLSTICE[d.getFullYear()] === key(d)) out.push('solstice');
  if (m === 12 && (dd === 24 || dd === 25)) out.push('xmas');
  if (LANTERN[d.getFullYear()] === key(d)) out.push('lantern');
  if (MID_AUTUMN[d.getFullYear()] === key(d)) out.push('mid_autumn');
  if ((d.getDay() === 6 || d.getDay() === 0) && left > 0) out.push('weekly');
  if (d.getDay() === 3) out.push('fish_cup');
  if (d.getDay() === 5) out.push('bug_cup');
  return out;
}
export const fireworksTime = (d) => { d = d || now(); const h = d.getHours(), ev = active(d); if (((S().rating || {}).best || 1) >= 5 && h >= 19 && h < 22) return true; return (ev.includes('halloween') && d.getDate() === 31 && h >= 19 && h < 23) || (ev.includes('newyear') && (h >= 19 || h < 2)) || ((ev.includes('after') || ev.includes('d100') || ev.includes('mid_autumn')) && h >= 19 && h < 23); };

/* ---------- 場景佈置 ---------- */
const deco = new THREE.Group(); scene.add(deco);
let leafBase = null;
export function refresh() {
  while (deco.children.length) deco.remove(deco.children[0]);
  const ev = active();
  const main = ev.find(e => e !== 'spring' && e !== 'cram') || ev[0];
  if (main) {
    const [x, z] = [PLAZA[0], PLAZA[1] - 5.6], y = groundAt(x, z);   // 廣場北側、噴泉正後方：從南邊走來看像節慶的背景拱門，不再擋在鏡頭與中央噴泉之間（兩側的路燈、旗幟、花台都在 4 公尺外）
    const arch = new THREE.Group(); arch.position.set(x, y, z); deco.add(arch);
    [-2.2, 2.2].forEach(dx => arch.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 8), M('#c48a54'), dx, 2.1, 0)));   // 拱門加高：招牌在噴泉渾天儀的上方
    const b = woodSign(BANNER[main], 4.2, 0.85, main === 'eve' ? '#2f4a7a' : main === 'weekly' ? '#3d5a2e' : '#6a2c22'); b.position.set(0, 3.9, 0); b.traverse(o => { o.userData.camThrough = true; }); arch.add(b);   // 風化的木頭招牌，漆上活動名稱
    for (let i = 0; i < 9; i++) { const f = mesh(new THREE.ConeGeometry(0.16, 0.3, 3), M(['#ff7a7a', '#ffd23f', '#7cc7ff', '#8fe08a'][i % 4]), -2 + i * 0.5, 3.35 - Math.sin(i / 8 * Math.PI) * 0.2, 0); f.rotation.x = Math.PI; arch.add(f); }
  }
  if (ev.includes('xmas')) {   // 廣場的聖誕樹
    const x = PLAZA[0] + 3, z = PLAZA[1] + 1.5, y = groundAt(x, z);
    deco.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 8), M('#8a5a3b'), x, y + 0.3, z));
    [[1.3, 1.0], [1.0, 1.7], [0.7, 2.3]].forEach(([r, h]) => deco.add(mesh(new THREE.ConeGeometry(r, 1.1, 12), M('#3f8a4e'), x, y + h, z)));
    const star = M('#ffe14a', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 1 }); if (!nightMats.includes(star)) nightMats.push(star);
    deco.add(mesh(new THREE.OctahedronGeometry(0.22, 0), star, x, y + 2.95, z));
    for (let i = 0; i < 14; i++) { const a = i * 2.4, h = 0.7 + (i % 5) * 0.38, r = 1.25 - (h - 0.7) * 0.42; const bm = M(['#ff5a6a', '#7cc7ff', '#ffd84a', '#ffffff'][i % 4], { emissive: new THREE.Color(['#ff5a6a', '#7cc7ff', '#ffd84a', '#ffffff'][i % 4]), emissiveIntensity: 0.3 }); if (!nightMats.includes(bm)) nightMats.push(bm); deco.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), bm, x + Math.cos(a) * r, y + h, z + Math.sin(a) * r)); }
  }
  if (ev.some(e => ['eve', 'mid_autumn', 'after', 'newyear', 'd100', 'lantern'].includes(e))) {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, x = PLAZA[0] + Math.cos(a) * 4.2, z = PLAZA[1] + Math.sin(a) * 4.2 - 0.4, y = groundAt(x, z);
      const lm = M(i % 2 ? '#ffb86b' : '#ff8a7a', { emissive: new THREE.Color(i % 2 ? '#ffb86b' : '#ff8a7a'), emissiveIntensity: 0.4 }); if (!nightMats.includes(lm)) nightMats.push(lm);
      deco.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), M('#6b4f3a'), x, y + 0.65, z), mesh(new THREE.SphereGeometry(0.2, 12, 10), lm, x, y + 1.4, z));
    }
  }
  if (ev.includes('halloween')) {   // 南瓜燈圍著廣場
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, x = PLAZA[0] + Math.cos(a) * 5, z = PLAZA[1] + Math.sin(a) * 5 - 0.4, y = groundAt(x, z);
      const pm = M('#ff9a3a', { emissive: new THREE.Color('#ff7a1a'), emissiveIntensity: 0.25 }); if (!nightMats.includes(pm)) nightMats.push(pm);
      const p = mesh(new THREE.SphereGeometry(0.26, 14, 10), pm, x, y + 0.22, z); p.scale.set(1.15, 0.85, 1.15); p.rotation.y = -a + Math.PI / 2; deco.add(p);
      deco.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), M('#5a8a3a'), x, y + 0.46, z));
      const face = M('#ffe08a', { emissive: new THREE.Color('#ffd040'), emissiveIntensity: 1.2 }); if (!nightMats.includes(face)) nightMats.push(face);
      const fx = x - Math.cos(a) * 0.27, fz = z - Math.sin(a) * 0.27;
      [-1, 1].forEach(s2 => { const e = mesh(new THREE.ConeGeometry(0.04, 0.07, 3), face, fx + Math.sin(a) * s2 * 0.09, y + 0.28, fz - Math.cos(a) * s2 * 0.09, { noCast: true }); deco.add(e); });
      deco.add(mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), face, fx, y + 0.17, fz, { noCast: true }));
    }
  }
  mergeStatic(deco);   // 節慶裝飾擺好就不動：同材質的零件合併（南瓜燈一圈原本六十幾次繪製）
  deco.traverse(o => { o.frustumCulled = cullable(o); });
  // 春櫻：圓樹的葉子換成粉紅（材質由 M() 快取共用）
  const leaf = M('#58b34d', {}, 'sway'); if (!leafBase) leafBase = leaf.color.clone();
  leaf.color.copy(ev.includes('spring') ? new THREE.Color('#ffc4dc') : leafBase);
}

/* ---------- 煙火 ---------- */
export const bursts = [];
const pGeo = n => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); return g; };
let fwT = 0, dotTex = null;
function dot() {
  if (dotTex) return dotTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64); return (dotTex = new THREE.CanvasTexture(cv));
}
let focus = { x: 0, z: 0 };
export function update(dt, night, at) {
  if (at) focus = at;
  if (night > 0.5 && fireworksTime()) {
    fwT -= dt;
    if (fwT <= 0) { fwT = 0.7 + Math.random() * 1.4; launch(); }
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.t += dt; const pos = b.pts.geometry.attributes.position;
    for (let k = 0; k < b.n; k++) { b.v[k * 3 + 1] -= dt * 3; pos.array[k * 3] += b.v[k * 3] * dt; pos.array[k * 3 + 1] += b.v[k * 3 + 1] * dt; pos.array[k * 3 + 2] += b.v[k * 3 + 2] * dt; }
    pos.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.t / 1.8);
    if (b.t > 1.8) { scene.remove(b.pts); b.pts.geometry.dispose(); bursts.splice(i, 1); }
  }
}
function launch() { burst(focus.x + (Math.random() - 0.5) * 28, 6 + Math.random() * 3.5, focus.z - 15 - Math.random() * 7); }
/** 在 (x, y, z) 放一朵煙火（夜祭、升級、稀有生物都用）。opt：n 粒子數、size、speed、color、quiet 不出聲 */
export function burst(x, y, z, opt) {
  opt = opt || {}; const n = opt.n || 140, sp0 = opt.speed || 5;
  const pts = new THREE.Points(pGeo(n), bend(new THREE.PointsMaterial({ color: opt.color || pick(['#ff7a9a', '#ffd23f', '#7cf5e1', '#b38bff', '#ffffff']), size: opt.size || 1.4, map: dot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  const pos = pts.geometry.attributes.position, v = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { pos.array[k * 3] = x; pos.array[k * 3 + 1] = y; pos.array[k * 3 + 2] = z; const a = Math.random() * 6.283, e = Math.acos(Math.random() * 2 - 1), sp = sp0 + Math.random() * sp0 * 0.4; v[k * 3] = Math.sin(e) * Math.cos(a) * sp; v[k * 3 + 1] = Math.cos(e) * sp; v[k * 3 + 2] = Math.sin(e) * Math.sin(a) * sp; }
  pts.renderOrder = 3; pts.frustumCulled = false; scene.add(pts); bursts.push({ pts, v, n, t: 0 });
  if (!opt.quiet) { Audio.sfx('pop'); setTimeout(() => Audio.sfx('bite'), 120); }
}

/* ---------- 島民台詞 ---------- */
export function line(v) {
  const ev = active(); if (!ev.length || Math.random() < 0.4) return null;
  if (ev.includes('halloween') && !v.shop && I.LINES4 && I.LINES4[v.sid] && Math.random() < 0.7) return pick(I.LINES4[v.sid].costume);
  const L6 = !v.shop && I.LINES6 && I.LINES6[v.sid];
  if (L6) { const k = ['examday', 'solstice', 'xmas', 'lantern'].find(e => ev.includes(e)); if (k && L6[k]) return pick(L6[k]); if (ev.includes('cram') && L6.cram && Math.random() < 0.6) return pick(L6.cram); }
  const L1 = (I.LINES && I.LINES[v.shop ? 'shop' : v.sid]) || {}, e = ev.find(x => L1.event && L1.event[x]);
  return e ? pick(L1.event[e]) : null;
}

/* ---------- 活動禮物（每個活動每年一次，寄到信箱） ---------- */
export function gifts(sendLetter, villagers) {
  const s = S(); s.ev = s.ev || { got: {} }; s.ev.got = s.ev.got || {};
  const year = now().getFullYear(), today = active();
  // v7.1：錯過的活動禮物一週內補寄（只補玩家開始玩之後的活動）：活動獎勵是紀念，不是錯過就沒了
  const late = new Set(), born = TA.S.created || 0;
  for (let i = 1; i <= 7; i++) { const d = now(); d.setDate(d.getDate() - i); if (d.getTime() + 864e5 < born) break; active(d).forEach(e => { if (!today.includes(e)) late.add(e); }); }
  today.map(e => [e, false]).concat([...late].map(e => [e, true])).forEach(([e, isLate]) => {
    const f = (I.FURNITURE || []).find(x => x.src === 'event:' + e); const k = e + '-' + (e === 'weekly' ? dayKey() : year);
    if (e === 'weekly' || e === 'fish_cup' || e === 'bug_cup' || s.ev.got[k]) return;
    s.ev.got[k] = true;
    const v = pick(villagers.filter(x => !x.shop)), L1 = (I.LINES && I.LINES[v.sid]) || {}, L6 = (I.LINES6 && I.LINES6[v.sid] && I.LINES6[v.sid][e]) || null, txt = (L1.event && L1.event[e]) ? pick(L1.event[e]) : L6 ? pick(L6) : `${NAMES[e]}快樂！今天也照自己的步調，好好讀書、好好休息。`;
    sendLetter({ from: v.sid, title: `${NAMES[e]}：${v.name}的祝福${isLate ? '（補寄）' : ''}`, open: '給你：', text: (isLate ? `前幾天的${NAMES[e]}沒遇到你，這份還是要給你。` : '') + txt, gift: f ? { type: 'furn', id: f.id } : { type: 'bells', n: 1000 }, giftLine: f ? `隨信附上「${f.name}」，放在房間裡當紀念吧。` : '隨信附上 1000 鈴錢。', close: '—— ' + v.name });
  });
  save();
}

/* ---------- 週末模擬考祭典 ---------- */
const GROUPS = [['chinese'], ['english'], ['math'], ['history', 'geography', 'civics'], ['physics', 'chemistry', 'biology', 'earth']];
const weekKey = () => { const d = now(), day = (d.getDay() + 6) % 7, mon = new Date(d); mon.setDate(d.getDate() - day); return key(mon); };
export const weeklyOn = () => active().includes('weekly');
export const weeklyDone = () => (S().ev || {}).weekly === weekKey();
export async function weeklyMock(sp, giveFurn) {
  const s = S(); s.ev = s.ev || { got: {} };
  if (weeklyDone()) { await ui.say(sp, '這週的模擬考你已經參加過囉！下週末再來挑戰。'); return; }
  await ui.say(sp, '歡迎參加週末模擬考祭典！國、英、數、社、自各 2 題，一共 10 題。不限時，慢慢來。');
  let ok = 0, n = 0;
  for (const g of GROUPS) for (let k = 0; k < 2; k++) {
    const q = pickQ(pick(g)); if (!q) continue; n++;
    const i = await ui.ask(sp, `第 ${n} 題（${TA.subject(q.subject).name}）：` + q.q, q.o, { answer: q.a, abc: true, html: true, keys: true });
    const good = i === q.a; record(q, good); Audio.sfx(good ? 'ok' : 'bad'); if (good) ok++;
    if (!good) await ui.explain(sp, q);
  }
  s.ev.weekly = weekKey(); s.ev.best = Math.max(s.ev.best || 0, ok); save();
  const tier = ok >= 9 ? 'mock_gold' : ok >= 7 ? 'mock_silver' : ok >= 5 ? 'mock_bronze' : null;
  const f = tier && (I.FURNITURE || []).find(x => x.src === 'event:' + tier);
  await ui.say(sp, `你答對了 ${ok} / ${n} 題！${tier ? '這是你的獎盃！' : '下週再來，一定會更好。'}`);
  if (f) await giveFurn(f.id, `模擬考 ${ok} / ${n}`);
  const lamp = !s.ev.weeklyLamp && (I.FURNITURE || []).find(x => x.src === 'event:weekly');   // 第一次參加的紀念（以前這件家具拿不到）
  if (lamp) { s.ev.weeklyLamp = 1; save(); await giveFurn(lamp.id, '第一次參加週末模擬考祭典的紀念'); }
  s.bells += ok * 200; save();
}
