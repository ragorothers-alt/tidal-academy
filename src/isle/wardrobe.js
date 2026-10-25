/* 潮汐小島 · 服裝：商店的服裝櫃台賣帽子與染布（上衣、褲子、鞋子共用顏色）、染髮；手機「衣櫃」隨時換裝。
   存檔 S().look = { shirt, pants, shoe, hair, hat }，S().closet = { colors: [], hairs: [], hats: [] }。 */
import * as THREE from 'three';
import { M as M0, mesh } from './engine.js';
const M = (c, o) => M0(c, o, 'char');   // 角色身上的衣服、帽子、頭髮：不積雪
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save } from './state.js';
import { dayKey } from './quiz.js';

export const COLORS = [
  ['sky', '天空藍', '#7cc7ff'], ['navy', '海軍藍', '#5a6fb0'], ['coral', '珊瑚橘', '#ff8a6a'], ['rose', '玫瑰粉', '#ff9fc0'], ['lemon', '檸檬黃', '#ffd84a'],
  ['mint', '薄荷綠', '#8fe0b8'], ['forest', '森林綠', '#4f9a5a'], ['lilac', '紫丁香', '#b9a2ff'], ['berry', '莓果紅', '#d8455a'], ['cocoa', '可可棕', '#8a5a3b'],
  ['cream', '奶油白', '#fff3dc'], ['ink', '墨黑', '#3a3442'], ['denim', '丹寧', '#4a6a9a'], ['teal', '湖水綠', '#3fb0b0']
].map(([id, name, c]) => ({ id, name, c }));
export const HAIRS = [['brown', '深棕', '#5a3a2a'], ['black', '黑', '#2a2228'], ['honey', '蜂蜜', '#c88a3a'], ['ash', '灰褐', '#8a7a70'], ['pink', '櫻花粉', '#ff9fc0'], ['blue', '海藍', '#5a8ad8'], ['mint', '薄荷', '#7fd8b0'], ['silver', '銀白', '#e0e0e8']].map(([id, name, c]) => ({ id, name, c }));
const half = (r, c) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), c);
export const HATS = [
  { id: 'straw', name: '草帽', price: 900, src: 'shop', build: g => { g.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 24), M('#e8c878'), 0, 0.3, 0), mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.17, 20), M('#e8c878'), 0, 0.4, 0), mesh(new THREE.CylinderGeometry(0.283, 0.283, 0.05, 20), M('#d8455a'), 0, 0.35, 0)); } },
  { id: 'beanie', name: '毛線帽', price: 800, src: 'shop', build: g => { const h = half(0.4, M('#d8455a')); h.position.y = 0.06; h.scale.set(1.04, 0.95, 1.04); g.add(h, mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.08, 20), M('#fff3dc'), 0, 0.08, 0), mesh(new THREE.SphereGeometry(0.08, 10, 8), M('#fff3dc'), 0, 0.46, 0)); } },
  { id: 'grad', name: '學士帽', price: 1500, src: 'shop', build: g => { g.add(mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.12, 16), M('#2a2a34'), 0, 0.33, 0)); const b = mesh(new THREE.BoxGeometry(0.62, 0.04, 0.62), M('#2a2a34'), 0, 0.41, 0); b.rotation.y = Math.PI / 4; g.add(b, mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), M('#ffd84a'), 0.3, 0.32, 0.12), mesh(new THREE.SphereGeometry(0.03, 8, 6), M('#ffd84a'), 0, 0.44, 0)); } },
  { id: 'beret', name: '貝雷帽', price: 1000, src: 'shop', build: g => { const b = mesh(new THREE.SphereGeometry(0.3, 16, 10), M('#5a6fb0'), 0.05, 0.36, -0.02); b.scale.set(1.25, 0.34, 1.2); b.rotation.z = -0.18; g.add(b, mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6), M('#5a6fb0'), 0.05, 0.46, 0)); } },
  { id: 'cap', name: '鴨舌帽', price: 800, src: 'shop', build: g => { const h = half(0.39, M('#3fb0b0')); h.position.y = 0.08; g.add(h); const v = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16, 1, false, -Math.PI / 2, Math.PI), M('#2a8a8a'), 0, 0.12, 0.3); g.add(v); } },
  { id: 'cat_ears', name: '貓耳髮箍', price: 1200, src: 'shop', build: g => { const t = mesh(new THREE.TorusGeometry(0.38, 0.022, 6, 20, Math.PI), M('#3a3442'), 0, 0.08, 0); t.rotation.y = Math.PI / 2; g.add(t); [-1, 1].forEach(s => { const e = mesh(new THREE.ConeGeometry(0.1, 0.2, 4), M('#3a3442'), s * 0.22, 0.42, 0); e.rotation.z = -s * 0.35; const inn = mesh(new THREE.ConeGeometry(0.05, 0.12, 4), M('#ff9fc0'), s * 0.22, 0.41, 0.03); inn.rotation.copy(e.rotation); g.add(e, inn); }); } },
  { id: 'witch', name: '魔女帽', price: 0, src: 'halloween', build: g => { g.add(mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.03, 24), M('#4a3a6a'), 0, 0.3, 0)); const c = mesh(new THREE.ConeGeometry(0.27, 0.62, 16), M('#4a3a6a'), 0.04, 0.62, -0.02); c.rotation.z = -0.22; g.add(c, mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.06, 16), M('#ff9a3a'), 0, 0.35, 0)); } },
  { id: 'flower', name: '花冠', price: 0, src: 'miles', build: g => { const r = mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 20), M('#5aa845'), 0, 0.28, 0); r.rotation.x = Math.PI / 2; g.add(r); ['#ff9fc0', '#ffd84a', '#ffffff', '#b9a2ff', '#ff8a6a', '#7cc7ff'].forEach((c, i) => { const a = i / 6 * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), M(c), Math.cos(a) * 0.33, 0.3, Math.sin(a) * 0.33)); }); } },
  { id: 'star_pin', name: '星星髮夾', price: 0, src: 'miles', build: g => { [[0.22, 0.3, 0.2, 0.09], [0.3, 0.18, 0.14, 0.06]].forEach(([x, y, z, r]) => { const st = mesh(new THREE.OctahedronGeometry(r, 0), M('#ffe14a', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 0.3 }), x, y, z); st.scale.set(1, 1, 0.4); g.add(st); }); } }
];
const hat = id => HATS.find(h => h.id === id);
const color = id => COLORS.find(c => c.id === id);
export const DEFAULT = { shirt: 'sky', pants: 'navy', shoe: 'coral', hair: 'brown', hat: null };
function closet() { const s = S(); s.closet = s.closet || { colors: ['sky', 'navy', 'coral'], hairs: ['brown'], hats: [] }; return s.closet; }
export const look = () => { const s = S(); s.look = Object.assign({}, DEFAULT, s.look || {}); return s.look; };
export function own(kind, id) { const c = closet(); if (!c[kind].includes(id)) { c[kind].push(id); save(); } }
export const owns = (kind, id) => closet()[kind].includes(id);

/** 把造型套到角色身上（換掉該部位網格的材質，不影響共用材質的其他角色） */
export function apply(ch, lk) {
  lk = lk || look(); const P = ch.userData.parts; if (!P) return;
  ['shirt', 'pants', 'shoe'].forEach(k => { const c = color(lk[k]); if (c) P[k].forEach(m => { m.material = M(c.c); }); });
  const h = HAIRS.find(x => x.id === lk.hair); if (h) P.hair.forEach(m => { m.material = M(h.c); });
  setHat(ch, lk.hat);
}
export function setHat(ch, id) {
  const slot = ch.userData.hatSlot; if (!slot) return; while (slot.children.length) slot.remove(slot.children[0]);
  const H = hat(id); if (H) { H.build(slot); slot.traverse(o => { o.frustumCulled = false; o.castShadow = true; }); }
}
/** 今天的帽子貨架（每天換 3 款） */
function stock() { const k = dayKey(); let seed = [...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 13) >>> 0; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); return HATS.filter(h => h.src === 'shop').sort(() => r() - 0.5).slice(0, 3); }

/* ---------- 服裝櫃台 ---------- */
export function openShop(v, ch, paint) {
  const s = S(), body = ui.el('div', 'fshop');
  const draw = () => {
    body.innerHTML = `<p class="muted">今日帽子每天換貨 · 染布買一次，上衣、褲子、鞋子都能用 · 你有 ${s.bells.toLocaleString()} 鈴錢</p>`;
    const grid = ui.el('div', 'fs-grid');
    stock().forEach(h => { const own2 = owns('hats', h.id), b = ui.el('button', 'fs-item' + (own2 ? ' own' : ''), `<i class="sw hat-sw">🎩</i><b>${h.name}</b><small>${own2 ? '已擁有' : h.price + ' 鈴錢'}</small>`); b.type = 'button'; b.onclick = () => { if (own2) return; buy(h.price, () => own('hats', h.id), h.name); }; grid.appendChild(b); });
    COLORS.forEach(c => { const own2 = owns('colors', c.id), b = ui.el('button', 'fs-item' + (own2 ? ' own' : ''), `<i class="sw" style="background:${c.c}"></i><b>${c.name}染布</b><small>${own2 ? '已擁有' : '400 鈴錢'}</small>`); b.type = 'button'; b.onclick = () => { if (!own2) buy(400, () => own('colors', c.id), c.name + '染布'); }; grid.appendChild(b); });
    HAIRS.forEach(c => { const own2 = owns('hairs', c.id), b = ui.el('button', 'fs-item' + (own2 ? ' own' : ''), `<i class="sw" style="background:${c.c};border-radius:50% 50% 30% 30%"></i><b>${c.name}髮色</b><small>${own2 ? '已擁有' : '800 鈴錢'}</small>`); b.type = 'button'; b.onclick = () => { if (!own2) buy(800, () => own('hairs', c.id), c.name + '髮色'); }; grid.appendChild(b); });
    body.appendChild(grid);
    const go = ui.el('button', 'btn gold', '打開衣櫃換裝'); go.type = 'button'; go.onclick = () => { ui.closePanel(); openCloset(ch); }; body.appendChild(go);
  };
  const buy = (price, give, name) => { if (s.bells < price) { ui.toast('鈴錢不夠了'); Audio.sfx('bad'); return; } s.bells -= price; give(); save(); Audio.sfx('coin'); paint && paint(); ui.toast(`買了${name}！到衣櫃換上吧`); draw(); };
  draw(); ui.panel(`${v.name}的服裝櫃台`, body, { cls: 'shop-p' });
}
/* ---------- 衣櫃 ---------- */
export function openCloset(ch) {
  const body = ui.el('div', 'closet'), lk = look(), c = closet();
  const SLOTS = [['shirt', '上衣'], ['pants', '褲子'], ['shoe', '鞋子'], ['hair', '頭髮'], ['hat', '帽子']];
  let slot = 'shirt';
  const draw = () => {
    body.innerHTML = '';
    const tabs = ui.el('div', 'dex-tabs'); SLOTS.forEach(([k, n]) => { const b = ui.el('button', 'dex-tab' + (k === slot ? ' on' : ''), n); b.type = 'button'; b.onclick = () => { slot = k; draw(); }; tabs.appendChild(b); }); body.appendChild(tabs); ui.showTab(tabs);
    const grid = ui.el('div', 'fs-grid');
    const opts = slot === 'hat' ? [{ id: null, name: '不戴' }].concat(HATS.filter(h => c.hats.includes(h.id))) : slot === 'hair' ? HAIRS.filter(h => c.hairs.includes(h.id)) : COLORS.filter(x => c.colors.includes(x.id));
    opts.forEach(o => { const b = ui.el('button', 'fs-item' + (lk[slot] === o.id ? ' on' : ''), `<i class="sw" style="background:${o.c || '#fff8ea'}">${slot === 'hat' ? (o.id ? '🎩' : '✕') : ''}</i><b>${o.name}</b>`); b.type = 'button'; b.onclick = () => { lk[slot] = o.id; save(); apply(ch, lk); Audio.sfx('pop'); draw(); }; grid.appendChild(b); });
    body.appendChild(grid);
    body.appendChild(ui.el('p', 'muted', '更多帽子、染布與髮色在阿潮商店的服裝櫃台；有些帽子是活動與潮汐里程的限定獎勵。'));
  };
  draw(); ui.panel('衣櫃', body, { cls: 'shop-p' });
}
