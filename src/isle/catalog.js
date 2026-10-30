/* 潮汐小島 · 收藏目錄：家具（拿到過就登錄，送人、賣掉也不會消失）、壁紙與地板、服裝，以及圖鑑與博物館的收集進度。
   收齊一種圖鑑、捐齊一個展區、家具目錄達到 50／100／150 種時，史遙或阿潮會寄信送獎勵（打開信就收到）。
   存檔：S().catalog = { 家具 id: 第一次拿到的時間 }（room.addStorage 記錄）、S().collect = { 已寄出的獎勵: 時間 }。
   v7.1：願望清單（S().wish，最多 3 件）顯示還差多少、今天的貨架有沒有；拿到過的一般家具可以訂購複本（每天 2 件，送到倉庫）。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save, list, icon } from './state.js';
import * as room from './room.js';
import { COLORS, HAIRS, HATS, owns } from './wardrobe.js';
import { CATS, KINDS, how, inCatalog, FURN_GOALS, full } from './catalogq.js';
import * as ledger from './ledger.js';
import { dayKey } from './state.js';

const tutor = sid => ((I.VILLAGERS || []).find(v => v.sid === sid) || {}).name || '島民';
const furnList = () => (I.FURNITURE || []).filter(inCatalog);
export function catalog() { const s = S(); s.catalog = s.catalog || {}; return s.catalog; }
/** 舊存檔：倉庫、房間裡的家具都算拿到過。
    v8.6 飯店客房與夢境島的佈置是免費的擺設目錄（不用倉庫裡的東西），擺過不算拿到；真的買下、用夢境碎片解鎖的會經過 addStorage 登錄 */
export function backfill() {
  const s = S(), c = catalog(); let n = 0;
  const add = id => { if (id && !c[id] && room.furn(id)) { c[id] = Date.now(); n++; } };
  Object.keys(s.storage || {}).forEach(add);
  ((s.room || {}).items || []).forEach(it => add(it.id));
  if (n) save();
}
const ids = k => list(k).map(x => x.id);
const kindFull = (where, k) => full((S()[where] || {})[k], ids(k));
const got = (where, k) => ids(k).filter(id => ((S()[where] || {})[k] || {})[id]).length;
const furnCount = () => { const c = catalog(); return furnList().filter(f => c[f.id]).length; };
const papers = () => (I.WALLPAPER || []).map(p => [p, '壁紙']).concat((I.FLOORING || []).map(p => [p, '地板']));
const ownPaper = p => (S().papers || []).includes(p.id) || (S().room || {}).wall === p.id || (S().room || {}).floor === p.id;
const HAT_HOW = { shop: '阿潮商店的服裝櫃台', halloween: '潮汐夜祭', miles: '潮汐里程兌換' };

/* ---------- 願望清單與訂購（v7.1） ---------- */
export const WISH_MAX = 3, ORDER_MAX = 2;
export const wishes = () => { const s = S(); s.wish = Array.isArray(s.wish) ? s.wish.filter(id => room.furn(id)).slice(0, WISH_MAX) : []; return s.wish; };
const orders = () => { const s = S(), d = dayKey(); if (!s.orders || s.orders.d !== d) s.orders = { d, n: 0 }; return s.orders; };
/** 可以訂購：拿到過的一般商店家具（有標價） */
export const orderable = f => !!f && f.src === 'shop' && f.price > 0 && !!catalog()[f.id];
export function toggleWish(id) { const w = wishes(), i = w.indexOf(id); if (i >= 0) w.splice(i, 1); else { if (w.length >= WISH_MAX) return false; w.push(id); } save(); return true; }
export function order(f) {
  const s = S(), o = orders();
  if (!orderable(f)) return '還沒拿到過的家具不能訂購，先在阿潮的貨架上找找';
  if (o.n >= ORDER_MAX) return `今天已經訂了 ${ORDER_MAX} 件，明天再來`;
  if (s.bells < f.price) return `鈴錢不夠（還差 ${(f.price - s.bells).toLocaleString()}）`;
  ledger.mark('order'); s.bells -= f.price; o.n++; room.addStorage(f.id); save(); return '';
}
/** 願望清單的一段說明（收藏目錄上方、今日學習用）：[{ f, text, ready }] */
export function wishInfo(stock) {
  const s = S(), inStock = new Set(((stock || {}).furn || []).map(f => f.id));
  return wishes().map(id => {
    const f = room.furn(id), own = !!catalog()[id];
    if (orderable(f)) { const gap = f.price - s.bells; return { f, ready: gap <= 0, text: gap <= 0 ? `可以訂購了（${f.price.toLocaleString()} 鈴錢）` : `訂購還差 ${gap.toLocaleString()} 鈴錢（約 ${Math.ceil(gap / 800)} 組一起練習或委託）` }; }
    if (f.src === 'shop' && !own) return { f, ready: inStock.has(id), text: inStock.has(id) ? `今天阿潮的貨架上就有！（${f.price.toLocaleString()} 鈴錢）` : '等阿潮的貨架出現（每天換貨；買過一次之後就能訂購）' };
    return { f, ready: false, text: own ? '已經拿到過了' : `怎麼拿到：${how(f, tutor) || '特別的機會'}` };
  });
}

/* ---------- 收集獎勵（寄信） ---------- */
function rewards() {
  const furn = id => room.furn(id) ? { type: 'furn', id } : null;
  const out = [];
  KINDS.forEach(([k, n]) => {
    out.push({ key: 'dex_' + k, ok: () => kindFull('dex', k), m: { from: 'history', title: `${n}圖鑑收齊了！`, text: `你把島上所有的${n}都登錄進圖鑑了！一筆一筆的觀察紀錄，就是最好的博物學筆記。`, gift: { type: 'bells', n: 5000 }, giftLine: '隨信附上 5,000 鈴錢，當作研究經費吧。' } });
    out.push({ key: 'mus_' + k, ok: () => kindFull('museum', k), m: { from: 'history', title: `${n}展區全部捐齊了！`, text: `${n}展區的展示櫃一格都沒有空著了。來參觀的島民都說，這裡是潮汐博物館最熱鬧的一區。謝謝你。`, gift: { type: 'bells', n: 8000 }, giftLine: '隨信附上 8,000 鈴錢。' } });
  });
  out.push({ key: 'dex_all', ok: () => KINDS.filter(([k]) => k !== 'marine').every(([k]) => kindFull('dex', k)), m: { from: 'history', title: '五種圖鑑全部收齊！', text: '魚、蟲、化石、潮間帶生物和礦物——你把這座島上能找到的生命與石頭都記下來了。這座獎盃，請放在房間最顯眼的地方。', gift: furn('trophy_naturalist') || { type: 'bells', n: 20000 }, giftLine: room.furn('trophy_naturalist') ? '隨信附上「島嶼博物學家獎盃」。' : '隨信附上 20,000 鈴錢。' } });
  out.push({ key: 'mus_all', ok: () => KINDS.filter(([k]) => k !== 'marine').every(([k]) => kindFull('museum', k)), m: { from: 'history', title: '潮汐博物館全數捐齊！', text: '五個展區都滿了，潮汐博物館終於成為一座完整的博物館。這張感謝狀，代表全體島民的謝意。', gift: furn('trophy_curator') || { type: 'bells', n: 30000 }, giftLine: room.furn('trophy_curator') ? '隨信附上「潮汐博物館感謝狀」。' : '隨信附上 30,000 鈴錢。' } });
  FURN_GOALS.forEach(([n, b]) => out.push({ key: 'furn' + n, ok: () => furnCount() >= n, m: { from: 'shop', title: `家具收藏 ${n} 種！`, text: `聽說你的家具目錄已經登錄 ${n} 種了！常來店裡的客人裡，你是最會佈置房間的一位。這是店裡的一點心意。`, gift: { type: 'bells', n: b }, giftLine: `隨信附上 ${b.toLocaleString()} 鈴錢。` } }));
  return out;
}
/** 檢查收集獎勵：達成了還沒寄的就寄信（回傳寄了幾封） */
export function checkRewards(sendLetter) {
  const s = S(); s.collect = s.collect || {}; let n = 0;
  rewards().forEach(r => {
    if (s.collect[r.key] || !r.ok()) return;
    s.collect[r.key] = Date.now(); n++;
    sendLetter(Object.assign({ open: '給你：', close: r.m.from === 'shop' ? '—— 阿潮' : '—— 史遙' }, r.m));
  });
  if (n) save();
  return n;
}

/* ---------- 目錄面板 ---------- */
let gen = 0;   // 換分頁或關閉面板時，停止還沒畫完的縮圖
/** 收藏目錄。hooks：{ openDex(k) 打開圖鑑 } */
export function open(hooks) {
  hooks = hooks || {}; backfill();
  let tab = 'furn', cat = '';
  const body = ui.el('div', 'catalog');
  const paint = () => {
    const my = ++gen, c = catalog(), F = furnList(), pp = papers();
    const nWear = COLORS.filter(x => owns('colors', x.id)).length + HAIRS.filter(x => owns('hairs', x.id)).length + HATS.filter(x => owns('hats', x.id)).length, tWear = COLORS.length + HAIRS.length + HATS.length;
    const dexN = KINDS.reduce((a, [k]) => a + got('dex', k), 0), dexT = KINDS.reduce((a, [k]) => a + ids(k).length, 0), musN = KINDS.reduce((a, [k]) => a + got('museum', k), 0);
    const T = [['furn', '家具', `${furnCount()} / ${F.length}`], ['paper', '壁紙與地板', `${pp.filter(([p]) => ownPaper(p)).length} / ${pp.length}`], ['wear', '服裝', `${nWear} / ${tWear}`], ['dex', '圖鑑與博物館', `圖鑑 ${dexN} / ${dexT}`]];
    body.innerHTML = `<div class="hm-chips ct-tabs">${T.map(([id, n, v]) => `<button type="button" data-tab="${id}" class="${id === tab ? 'on' : ''}">${n}<small>${v}</small></button>`).join('')}</div><div class="ct-main"></div>`;
    body.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; Audio.sfx('tick'); paint(); });
    const main = body.querySelector('.ct-main');
    if (tab === 'furn') {
      const shown = F.filter(f => !cat || f.cat === cat);
      const wi = wishInfo(hooks.stock && hooks.stock());
      main.innerHTML = (wi.length ? `<div class="ct-wish"><b>☆ 願望清單</b>${wi.map(w => `<div class="${w.ready ? 'ok' : ''}"><span>${ui.esc(w.f.name)}</span><small>${ui.esc(w.text)}</small></div>`).join('')}</div>` : '<p class="muted ct-wish0">點一件家具可以「加入願望」（最多 3 件）：這裡會告訴你還差多少、今天的貨架有沒有。</p>') + `<div class="hm-chips ct-cats">${CATS.map(([id, n]) => `<button type="button" data-cat="${id}" class="${id === cat ? 'on' : ''}">${n}</button>`).join('')}</div><div class="dex-grid ct-grid"></div><div class="dex-info"><small class="muted">家具目錄 ${furnCount()} / ${F.length} 種：拿到過的家具都會登錄（送人、賣掉也不會消失）；灰色的是還沒拿到的，點一下看怎麼拿到。登錄 ${FURN_GOALS.map(g => g[0]).join('／')} 種時，阿潮會寄禮物給你。</small></div>`;
      main.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; Audio.sfx('tick'); paint(); });
      const grid = main.querySelector('.ct-grid'), info = main.querySelector('.dex-info'), queue = [];
      shown.forEach(f => {
        const own = !!c[f.id], b = ui.el('button', 'dex-cell thumb-wait' + (own ? '' : ' unknown'), '<img alt="">'); b.type = 'button'; b.title = own ? f.name : '？？？'; b.setAttribute('aria-busy', 'true');   // v8.7 以前排隊格留白，現在先顯示骨架
        b.onclick = () => { const catN = (CATS.find(x => x[0] === f.cat) || [, ''])[1], [w, d] = f.size || [1, 1], n = (S().storage || {})[f.id] || 0;
          info.innerHTML = `<div class="pk-sel"><img src="${room.thumb(f.id)}" alt="" class="${own ? '' : 'sil'}"><div><b>${ui.esc(f.name)} <small>${catN} · ${w}×${d} 格${own ? (n ? ` · 倉庫裡有 ${n} 件` : ' · 已登錄') : ' · 還沒拿到'}</small></b><p>${ui.esc(f.desc || '')}</p><small>怎麼拿到：${ui.esc(how(f, tutor) || '特別的機會')}</small></div></div>`; Audio.sfx('pop');
          const acts = ui.el('div', 'ct-acts'), wb = ui.el('button', 'btn ghost', wishes().includes(f.id) ? '★ 移出願望' : `☆ 加入願望（${wishes().length}/${WISH_MAX}）`); wb.type = 'button';
          wb.onclick = () => { if (!toggleWish(f.id)) { ui.toast(`願望最多 ${WISH_MAX} 件，先移掉一件`); Audio.sfx('deny'); return; } Audio.sfx('tick'); paint(); };
          acts.appendChild(wb);
          if (orderable(f)) { const ob = ui.el('button', 'btn gold', `訂購一件 · ${f.price.toLocaleString()} 鈴錢`); ob.type = 'button'; ob.onclick = () => { const err = order(f); if (err) { ui.toast(err); Audio.sfx('deny'); return; } Audio.sfx('coin'); ui.toast(`📦 ${f.name}送到倉庫了（今天還能訂 ${ORDER_MAX - orders().n} 件）`); hooks.paint && hooks.paint(); paint(); }; acts.appendChild(ob); }
          info.appendChild(acts); };
        grid.appendChild(b); queue.push([b.querySelector('img'), f.id]);
      });
      const pump = () => { if (my !== gen || !body.isConnected) return; const t = performance.now(); while (queue.length && performance.now() - t < 14) { const [img, id] = queue.shift(); room.setThumb(img, room.thumb(id)); } if (queue.length) setTimeout(pump, 16); };
      setTimeout(pump, 30);   // v8.7 以前生成後直接出圖，現在共用 setThumb 等待就緒與淡入，保留分批排程
    } else if (tab === 'paper') {
      main.innerHTML = ['壁紙', '地板'].map(kind => `<b class="ach-h">${kind}</b><div class="ct-swatches">${pp.filter(x => x[1] === kind).map(([p]) => `<span class="ct-sw${ownPaper(p) ? '' : ' no'}" title="${ui.esc(p.name || p.id)}"><i style="background:${p.c1}${p.c2 ? `;box-shadow:inset 0 -10px 0 ${p.c2}` : ''}"></i>${ui.esc(p.name || '')}</span>`).join('')}</div>`).join('') + '<p class="muted">壁紙與地板在阿潮的商店（每天換貨），飯店的款式用優惠券兌換。虛線色塊表示未取得，名稱仍可閱讀。</p>';   // v8.7 以前靠整格灰淡表示狀態，現在改以虛線標示未取得
    } else if (tab === 'wear') {
      main.innerHTML = `<b class="ach-h">帽子</b><div class="ct-list">${HATS.map(h => `<span class="${owns('hats', h.id) ? 'ok' : ''}">${owns('hats', h.id) ? '✔' : '○'} ${ui.esc(h.name)}<small>${HAT_HOW[h.src] || '特別活動'}</small></span>`).join('')}</div>
        <b class="ach-h">衣服顏色（染布）</b><div class="ct-swatches">${COLORS.map(x => `<span class="ct-sw${owns('colors', x.id) ? '' : ' no'}"><i style="background:${x.c}"></i>${ui.esc(x.name)}</span>`).join('')}</div>
        <b class="ach-h">髮色</b><div class="ct-swatches">${HAIRS.map(x => `<span class="ct-sw${owns('hairs', x.id) ? '' : ' no'}"><i style="background:${x.c}"></i>${ui.esc(x.name)}</span>`).join('')}</div>
        <p class="muted">帽子、染布與髮色都在阿潮商店的服裝櫃台（每天換款）；部分帽子要靠活動或潮汐里程。</p>`;
    } else {
      const s = S(), col = s.collect || {};
      const bar = (a, b) => `<i class="ct-bar" style="--k:${b ? (a / b).toFixed(3) : 0}"></i>`;
      main.innerHTML = `<div class="ct-dex">${KINDS.map(([k, n]) => { const t = ids(k).length, d = got('dex', k), m = got('museum', k); return `<div class="ct-row"><b>${n}</b><span>圖鑑 ${d} / ${t}${bar(d, t)}<small>${col['dex_' + k] ? '✔ 收齊獎勵已寄出' : d >= t ? '收齊了！獎勵寄出中' : `還差 ${t - d} 種 · 收齊得 5,000 鈴錢`}</small></span><span>博物館 ${m} / ${t}${bar(m, t)}<small>${col['mus_' + k] ? '✔ 捐齊獎勵已寄出' : m >= t ? '捐齊了！獎勵寄出中' : `還差 ${t - m} 件 · 捐齊得 8,000 鈴錢`}</small></span><button type="button" class="btn sm" data-dex="${k}">圖鑑</button></div>`; }).join('')}</div>
        <div class="ct-goals"><span class="${col.dex_all ? 'ok' : ''}">${col.dex_all ? '✔' : '🏆'} 五種圖鑑全部收齊：島嶼博物學家獎盃</span><span class="${col.mus_all ? 'ok' : ''}">${col.mus_all ? '✔' : '🏛'} 博物館五個展區全部捐齊：潮汐博物館感謝狀</span>${FURN_GOALS.map(([n, b]) => `<span class="${col['furn' + n] ? 'ok' : ''}">${col['furn' + n] ? '✔' : '🛋'} 家具目錄 ${n} 種：${b.toLocaleString()} 鈴錢</span>`).join('')}</div>
        <p class="muted">鑑定化石、礦石要找史遙和岳；捐贈到博物館找史遙。保育類的柴山多杯孔珊瑚只拍照記錄，照片會直接展示在博物館。</p>`;
      main.querySelectorAll('[data-dex]').forEach(b => b.onclick = () => hooks.openDex && hooks.openDex(b.dataset.dex));
    }
  };
  paint();
  ui.panel('收藏目錄', body, { cls: 'shop-p', onClose: () => { gen++; } });
}
