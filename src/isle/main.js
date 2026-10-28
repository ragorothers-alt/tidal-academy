/* 潮汐小島 · 主程式：島民、對話選單、博物館、商店、口袋、手機、輸入與主迴圈。 */
import * as THREE from 'three';
import { scene, camera, renderer, U, sun, sky, applyTime, screenOf, skyU, bend, CURVE, HZ, cullable, dropTinyShadows } from './engine.js';
import { N, C, T, terrain, groundAt, tileAt, isBridge, isFord, foamMat, seaMesh, waterY as fwY, GRID_SHIFT, tileOf, waterAt } from './terrain.js';
import { colliders, blocked, penetration, PLAZA, SITES, homes, onPier, PIER, seats, nudgeHome, flowerSpots, onRoad, spin as spinProps } from './props.js';
import * as mind from './mind.js';
import { chibi, animate, setTool, setExpr, setTalk, lookAt, clap, setSit } from './chars.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as life from './life.js';
import * as room from './room.js';
import * as social from './social.js';
import * as events from './events.js';
import * as town from './town.js';
import * as library from './library.js';
import * as rating from './rating.js';
import * as weather from './weather.js';
import * as guest from './guest.js';
import * as gifts from './gifts.js';
import * as design from './design.js';
import * as move from './move.js';
import * as garden from './garden.js';
import * as astro from './stars.js';
import * as homevisit from './homevisit.js';
import * as photo from './photo.js';
import * as diy from './diy.js';
import * as tide from './tide.js';
import * as spirit from './spirit.js';
import * as report from './report.js';
import * as miles from './miles.js';
import * as wardrobe from './wardrobe.js';
import * as cooking from './cooking.js';
import * as ores from './rocks.js';
import * as balloon from './balloon.js';
import * as trip from './trip.js';
import * as focus from './focus.js';
import * as planner from './planner.js';
import * as words from './words.js';
import * as tablets from './tablets.js';
import * as quizcup from './quizcup.js';
import * as museum from './museum.js';
import * as shopin from './shopin.js';
import * as yuehome from './yuehome.js';
import * as house from './house.js';
import * as cram from './cram.js';
import * as settings from './settings.js';
import { ULTRA } from './perf.js';
import * as challenge from './challenge.js';
import { createHand } from './fphand.js';
import * as guide from './guide.js';
import * as feel from './feel.js';
import * as hall from './hall.js';   // 潮汐考場：模擬考、錯題本、成績統計
import * as voyage from './voyage.js';   // 航海圖、單元試煉、每日潮汐、激流衝刺、燈塔首領戰
import * as lexicon from './lexicon.js';   // 單字燈塔：翻卡、單字測驗、字表
import * as profile from './profile.js';   // 我的檔案、船員登記、潮汐護符
import * as lab from './lab.js';   // 導師研究計畫
import * as catalog from './catalog.js';   // 收藏目錄與收集獎勵
import * as post from './post.js';
import * as glow from './glow.js';
import * as shadows from './shadows.js';
import * as walldress from './walldress.js';
import * as motes from './motes.js';
import * as grass from './grass.js';
import * as waves from './waves.js';
import * as seasons from './seasons.js';
import * as shake from './shake.js';
import * as written from './written.js';
import * as route from './route.js';
import * as fieldnote from './fieldnote.js';
import * as bond from './bond.js';
import * as ledger from './ledger.js';
import * as highland from './highland.js';
import * as details from './details.js';
import * as hotel from './hotel.js';
import * as nightlights from './nightlights.js';   // v8.0 室外燈光設計：步道柱燈、橋與階梯的藏燈、樹與地標的投光
import * as dreamisle from './dreamisle.js';
import * as actors from './actors.js';
import * as props3d from './props3d.js';
import * as fantasy from './fantasy.js';
import * as minimap from './minimap.js';
import * as winter from './winter.js';
import * as memo from './memo.js';
import * as radio from './radio.js';
import * as throwGame from './throw.js';
import * as chrono from './chrono.js';
import * as periodic from './periodic.js';
import * as council from './council.js';
import * as plot from './plot.js';
import * as idiom from './idiom.js';
import * as market from './market.js';
import * as moon from './moon.js';
import * as dream from './dream.js';
import * as passport from './passport.js';
/** 在神秘島或博物館裡（不在主島場景） */
const elsewhere = () => trip.inside || museum.inside || dreamisle.inside || shopin.inside || yuehome.inside || house.inside;
import { drill, picker } from './drill.js';
import { pickQ, pickQU, askQ, record, pick, bag, dayKey } from './quiz.js';
import * as figs from './figs.js';
import { env, I, S, save, KINDS, list, find, itemName, itemPrice, itemIcon, icon, removeAt, addItem, newDay, stars, fmtHours, fmtMonths, WHERE, whereName, POCKET_N, available, onConcept } from './state.js';

const TA = window.TA, L = TA.L;
const $ = id => document.getElementById(id);

/* ---------- 存檔換算：v6.15 格子從 64 擴大到 96，用格子編號記錄的資料（島嶼設計、花園）往右下移 GRID_SHIFT 格 ---------- */
{ const s = S(); if ((s.gridV || 1) < 2 && GRID_SHIFT) {
    const mv = k => { const [a, b] = k.split(',').map(Number); return (a + GRID_SHIFT) + ',' + (b + GRID_SHIFT); };
    if (s.design) s.design = Object.fromEntries(Object.entries(s.design).map(([k, v]) => [mv(k), v]));
    if (s.garden && s.garden.plants) s.garden.plants = Object.fromEntries(Object.entries(s.garden.plants).map(([k, p]) => { if (p && p.mate) p.mate = mv(p.mate); return [mv(k), p]; }));
    s.gridV = 2; save();
  } }
/* ---------- 存檔換算：v6.79 島嶼照新規劃重建（星環學院）。玩家在戶外擺的設計與種的花，跟著家一起搬：
   整片平移「新家 − 舊家」格，落在水裡、路上、建築或門口的那幾格就近找空格；真的放不下的設計照原價退鈴錢、花收回種子袋。
   原本站的位置在新島上沒有意義，回到廣場 ---------- */
let relocNote = null;
{ const s = S(); if ((s.gridV || 1) < 3) {
    const me = homes.find(h => h.owner === 'player'), dx = Math.round(me.x - (-9)), dz = Math.round(me.z - 4), used = new Set();
    const free = (tx, tz) => { const t = T(tx, tz), x = tx - C + 0.5, z = tz - C + 0.5; return !used.has(tx + ',' + tz) && (t === 1 || t === 2) && !isBridge(tx, tz) && !blocked(x, z, 0.45) && !onRoad(x, z) && !homes.some(h => Math.hypot(h.door[0] - x, h.door[1] - z) < 1.4); };
    const spot = k => { const [a, b] = k.split(',').map(Number); for (let r = 0; r <= 6; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; const tx = a + dx + i, tz = b + dz + j; if (free(tx, tz)) { const nk = tx + ',' + tz; used.add(nk); return nk; } } return null; };
    let moved = 0, refund = 0, bagged = 0;
    if (s.design) { const out = {}; Object.entries(s.design).forEach(([k, id]) => { const nk = spot(k); if (nk) { out[nk] = id; moved++; } else { const it = design.item(id); refund += it ? it.price : 0; } }); s.design = out; }
    if (s.garden && s.garden.plants) {
      const map = {}, out = {}; s.garden.bag = s.garden.bag || [];
      Object.entries(s.garden.plants).forEach(([k, p]) => { const nk = spot(k); if (nk) { map[k] = nk; out[nk] = p; moved++; } else { s.garden.bag.push({ sp: p.sp, g: p.g, known: p.known, pa: p.pa, pb: p.pb, self: p.self, st: p.st }); bagged++; } });
      Object.values(out).forEach(p => { if (p.mate) p.mate = map[p.mate] || null; });
      s.garden.plants = out;
    }
    if (refund) s.bells = (s.bells || 0) + refund;
    s.pos = null; s.gridV = 3; save();
    relocNote = s.intro ? { moved, refund, bagged } : null;   // 新存檔不用說明（本來就是新島）
  } }
/* ---------- 玩家 ---------- */
settings.applyEarly();
const nightFill = new THREE.PointLight('#ffe2b8', 0, 7, 1.6); scene.add(nightFill);   // 白天強度 0（燈一直在，換日夜時不用重編著色器）
const player = chibi({ kind: 'human', shirt: '#7cc7ff', pants: '#5a6fb0', hair: '#5a3a2a', shoe: '#ff8a6a' });
actors.dress(player, 'player');
wardrobe.apply(player);
scene.add(player);
highland.build(player);   // 西部高地的樹林、瀑布、山頂（要在其他會找空地的模組之前）
details.build();   // 海岸岩石、季節落葉／落花、蘑菇
props3d.dressAll();   // 杉樹、椰子樹、竹子、長椅、路燈、信箱換成 3D 模型（有做好的才換）
fantasy.build();   // 日系奇幻遠景：浮空島、天空城堡、白鳥
hotel.init({   // 碼頭旁的潮汐渡假飯店（大廳與客房借用室內場景）
  player, thumb: id => room.thumb(id), addStorage: (id, n) => room.addStorage(id, n),
  enter: (home, opt, host, done) => {
    life.cancel(); moveTo = null; if (roomHost && roomHost.mesh && roomHost !== host) room.scene.remove(roomHost.mesh);   // 從大廳直接進客房：先把大廳的經理移走
    roomHost = host;
    room.enter(player, () => { if (host && host.mesh) room.scene.remove(host.mesh); roomHost = null; done && done(); }, Object.assign({ home }, opt));
    if (host && host.mesh) { room.scene.add(host.mesh); host.mesh.visible = true; }
  },
  outside: (x, z, ry) => { scene.add(player); player.position.set(x, ground(x, z), z); player.rotation.y = ry || 0; camPos.copy(player.position).add(camOff); },
  lock: on => { talking = on ? { name: 'hotel' } : null; }, busy: () => !!talking
});
life.init(player, cheer);
/* 島民喝采：附近的島民看到你釣到魚、抓到蟲、挖到化石，會轉過來拍手、說一句話（稀有或新登錄時更激動） */
const CHEER = { fish: ['好厲害！', '釣到了耶！', '哇——好大！', '你是釣魚高手！'], bug: ['抓到了！', '好快的身手！', '漂亮！', '牠好可愛～'], fossil: ['挖到寶了！', '是化石耶！', '快拿去給史遙看！'], wow: ['太稀有了吧！！', '我第一次看到！', '傳說中的那個！？', '島上的大新聞！'] };
function cheer(e) {
  // 回憶錄：第一條魚、第一隻蟲、第一塊化石、第一次遇見的稀有生物
  { const s0 = S(), nm = e.sp ? e.sp.name : '';
    if (e.kind === 'fish' && e.first && Object.keys(s0.dex.fish || {}).length === 1) memo.add('釣到了第一條魚', nm, { key: 'first:fish', icon: '🎣' });
    else if (e.kind === 'bug' && e.first && Object.keys(s0.dex.bug || {}).length === 1) memo.add('抓到了第一隻蟲', nm, { key: 'first:bug', icon: '🦋' });
    else if (e.kind === 'fossil') memo.add('挖到了第一塊化石', '拿去博物館給史遙鑑定吧', { key: 'first:fossil', icon: '🦴' });
    else if (e.first && e.sp && (e.sp.rarity || 1) >= 4) memo.add(`遇見了稀有的${nm}`, e.kind === 'fish' ? '釣到的' : '抓到的', { key: 'rare:' + e.sp.id, icon: '🌟' }); }
  const p = player.position, rare = e.sp && (e.sp.rarity || 1) >= 4, near = villagers.filter(v => !v.away && !v.chatting && !v.sitting && v.mesh.visible && talking !== v && Math.hypot(v.mesh.position.x - p.x, v.mesh.position.z - p.z) < 9)
    .sort((a, b) => Math.hypot(a.mesh.position.x - p.x, a.mesh.position.z - p.z) - Math.hypot(b.mesh.position.x - p.x, b.mesh.position.z - p.z)).slice(0, 3);
  if (!near.length) return;
  setTimeout(() => Audio.sfx('clap'), 300);
  near.forEach((v, i) => setTimeout(() => {
    v.faceTo = { mesh: player }; v.wait = Math.max(v.wait, 3.5); v.target = [v.mesh.position.x, v.mesh.position.z];
    clap(v.mesh, 2.2); ui.emote(v.mesh, rare || e.first ? '🎉' : '👏', '#ffb84a');
    ui.bubble(v.mesh, pick(rare || (e.first && i === 0) ? CHEER.wow : CHEER[e.kind] || CHEER.fish), 2400);
    setTimeout(() => { if (v.faceTo && v.faceTo.mesh === player) v.faceTo = null; }, 3000);
  }, 200 + i * 260));
  const s = S(); s.stats = s.stats || {}; s.stats.cheers = (s.stats.cheers || 0) + near.length;
}
const ground = (x, z) => (onPier(x, z) ? 0.47 : groundAt(x, z));
{ const s = S(), p = s.pos || [PLAZA[0] + 1.5, PLAZA[1] + 3]; player.position.set(p[0], ground(p[0], p[1]), p[1]); }

/* ---------- 島民 ---------- */
const FALLBACK = [
  { sid: 'english', name: 'Lexi', kind: 'bunny', fur: '#f7eef4', inner: '#ffb3c8', shirt: '#7cc7ff', pants: '#f7eef4', voice: 470, greet: { day: ['Hi there! 今天天氣真好～'] }, ask: ['來個英文小問答吧！'], ok: ['Awesome!'], bad: ['沒關係，明天再試！'], tips: ['閱讀測驗先看題目再讀文章。'], chat: ['我最喜歡海邊了！'] },
  { sid: 'chinese', name: '墨言', kind: 'cat', fur: '#5a5f6e', inner: '#f2c6c6', shirt: '#efe6d0', pants: '#5a5f6e', acc: 'brush', voice: 380, greet: { day: ['喵……今天想寫一首詩。'] }, ask: ['考考你。'], ok: ['喵！答得漂亮。'], bad: ['喵嗚……很容易念錯呢。'], tips: ['字音題先想字義。'], chat: ['樹下最適合讀書。'] },
  { sid: 'history', name: '史遙', kind: 'owl', fur: '#9b7a55', inner: '#f4e6c8', shirt: '#7a5aa8', pants: '#9b7a55', acc: 'glasses', voice: 230, greet: { day: ['呼呼……歡迎來到博物館！'] }, ask: ['讓我考考你。'], ok: ['呼呼！太棒了！'], bad: ['呼……再看一次時代背景。'], tips: ['讀史料先問誰寫的。'], chat: ['我最喜歡化石了。'] }
];
const VDATA = (I.VILLAGERS && I.VILLAGERS.length ? I.VILLAGERS : FALLBACK);
const villagers = [];
const myHome = homes.find(h => h.owner === 'player');
{
  let hi = 1;
  VDATA.forEach(d => {
    const v = Object.assign({}, d); v.sub = TA.subject(v.sid); v.color = v.sub.color; v.voice = v.voice || 400;
    if (v.sid === 'history') v.home = SITES.museum.front.slice();
    else {   // 規劃指定了每戶的家（h.who 是島民的名字）；沒指定的照順序住進空著的房子
      let h = homes.find(q => q.who === v.name && !q.owner); if (!h) { while (homes[hi] && homes[hi].owner) hi++; h = homes[hi++]; }
      v.home = h ? h.door.slice() : [PLAZA[0] + (Math.random() - 0.5) * 6, PLAZA[1] + 2]; if (h) h.owner = v.sid;
    }
    v.range = v.sid === 'history' ? 1.5 : 3.2;
    v.mesh = chibi(v); scene.add(v.mesh); actors.dress(v.mesh, v.sid);   // 有 3D 模型的島民換上模型
    const x = v.home[0], z = v.home[1]; v.mesh.position.set(x, ground(x, z), z); v.target = [x, z]; v.wait = Math.random() * 3;
    v.tag = ui.el('div', 'tag', `${ui.esc(v.name)}<small>${v.sub.name}</small>`); v.tag.style.setProperty('--c', v.color); $('labels').appendChild(v.tag);
    villagers.push(v);
  });
  // 商店店員
  const sd = I.SHOP || { name: '阿潮', kind: 'otter', fur: '#9a6a4a', inner: '#e8d0b0', shirt: '#5fbf6a', pants: '#9a6a4a', voice: 330, greet: ['歡迎光臨潮汐商店！'], sell: ['謝謝惠顧！'], poor: ['口袋空空的呢。'], bye: ['下次再來！'] };
  const v = Object.assign({}, sd, { sid: 'shop', shop: true, color: '#5fbf6a', sub: { name: '店長', color: '#5fbf6a' } });
  v.home = SITES.shop.front.slice(); v.range = 0.8; v.mesh = chibi(v); scene.add(v.mesh); actors.dress(v.mesh, 'shop');
  v.mesh.position.set(v.home[0], ground(v.home[0], v.home[1]), v.home[1]); v.target = v.home.slice(); v.wait = 2;
  v.tag = ui.el('div', 'tag', `${ui.esc(v.name)}<small>店長</small>`); v.tag.style.setProperty('--c', v.color); $('labels').appendChild(v.tag);
  villagers.push(v);
  villagers.forEach(o => props3d.track(o.mesh, 0.7, 1.0, 0.9));   // 畫面外的島民不畫（影子落進畫面的只畫進陰影貼圖）
}
const sp = v => ({ name: v.name, color: v.color, voice: v.voice });
async function giveFurn(id, sub) { const f = room.furn(id); if (!f) return; room.addStorage(id); await ui.card({ icon: room.thumb(id), title: `得到「${f.name}」！`, sub: (sub ? sub + '<br>' : '') + '回家按 F 擺出來吧。' }); }
move.apply(villagers);   // 已生效的房屋搬遷（要在其他系統讀取房子位置之前）
social.init(villagers, { paint: () => paintHud(), toast: t => ui.toast(t), giveFurn: id => room.addStorage(id) });
town.init(villagers, { walkable: (x, z) => walkable(x, z, ground(x, z), null), giveFurn, icon, savePos: () => { if (!room.inside && !elsewhere()) S().pos = [player.position.x, player.position.z]; save(); } });
guest.init({ chibi, villagers, homes, paint: () => paintHud() });
gifts.init(room);
garden.init(player, { paint: () => paintHud() });
tide.init(player);
tablets.init(player, { paint: () => paintHud() });
balloon.init(player, { giveFurn });
/* 導師家的學習角落：書桌、書架翻開這一科的筆記；招牌家具讓導師說一句話（資料：data/homelines.js 的 I.HOME_STUDY） */
room.setVisitItemHook(async (it, f) => {
  const v = roomHost, st = v && (I.HOME_STUDY || {})[v.sid]; if (!st) return false;
  if (it.id === st.sig && (st.lines || []).length) { await ui.say(sp(v), pick(st.lines)); ui.closeDialog(); return true; }
  if ((st.study || []).includes(it.id)) {
    const i = await ui.ask(sp(v), `${f.name}：${f.desc || ''}`, [st.label || '翻開這一科的筆記', '看看就好']); ui.closeDialog();
    if (i === 0) library.openNotes(v.sid, st.unit);
    return true;
  }
  return false;
});
museum.init(player, () => { const f = SITES.museum, x = f.x, z = f.z + 2.6; player.position.set(x, ground(x, z), z); player.rotation.y = 0; camPos.copy(player.position).add(camOff); paintHud(); });
const shopV = villagers.find(v => v.shop);
shopin.init(player, shopV, {
  onExit: () => { const f = SITES.shop, x = f.x + 0.8, z = f.z + 2.75; player.position.set(x, ground(x, z), z); player.rotation.y = 0; if (shopV) { shopV.mesh.visible = true; shopV.mesh.position.set(shopV.home[0], ground(shopV.home[0], shopV.home[1]), shopV.home[1]); shopV.mesh.rotation.y = 0; shopV.target = shopV.home.slice(); shopV.wait = 2; } camPos.copy(player.position).add(camOff); paintHud(); },
  counter: () => talk(shopV),
  wear: () => { ui.closeDialog(); wardrobe.openShop(shopV, player, paintHud); },
  seed: () => { ui.closeDialog(); garden.openSeedShop(shopV, paintHud); },
  sell: () => { ui.closeDialog(); openPockets('sell', shopV); },
  stock: () => dailyStock(), buy: f => buyShopItem(f), bought: () => shopBought()
});
const earthV = villagers.find(v => v.sid === 'earth');
const YUE_HOOKS = {
  onExit: () => {
    roomHost = null; moveTo = null; nearDoor = null; nearV = null;
    const d = DOORS().find(x => x.v === earthV).door;
    player.position.set(d[0], ground(d[0], d[1] + 0.55), d[1] + 0.55); player.rotation.y = 0;
    camPos.copy(player.position).add(camOff); paintHud();
  },
  talk: () => talk(earthV),
  notes: unit => library.openNotes('earth', unit),
  dex: () => openDex('mineral'),
  soup: async () => {
    if (talking) return; talking = earthV; Audio.sfx('pop');
    try {
      await ui.say(sp(earthV), pick([
        '湯要小火慢慢煮……雲也是慢慢走的。先坐下吧，我替你留了最舒服的椅子。',
        '今天煮的是南瓜濃湯。等它咕嘟三下，我們再一起看雲，不急。',
        '山裡帶回來的香草，放一點就好。喝完熱湯，今晚陪我到閣樓看星星吧。',
        '鍋子裡的熱對流，跟天空有點像呢……不過現在先喝湯，課本等一下。'
      ]));
    } finally { ui.closeDialog(); talking = null; paintHud(); }
  }
};
yuehome.init(player, earthV, YUE_HOOKS);
house.init(player);
const HOUSE_HOOKS = { dex: YUE_HOOKS.dex, soup: YUE_HOOKS.soup, notes: YUE_HOOKS.notes, decor: () => houseDecor(),
  review: () => libAct('rv'), vocab: () => libAct('voc'), mistakes: () => libAct('book'), words: () => libAct('word'),   // v8.1 圖書館的功能點
  libnotes: sid => { ui.closeDialog(); library.openNotes(sid || shelfSid()); },   // v8.3 十科書架：面向哪一格就翻開哪一科
  wing: k => museum.openWing(k),   // 博物館的展區（topic 是展區）
  exhibit: t => museum.exhibitCard(t.k, t.id), theme: () => themeAct(), box: () => donationBox(), guestbook: () => guestbook() };   // v8.3 展品、小特展、捐贈箱、留言簿
trip.init(player, () => { const x = PIER.x, z = PIER.z + PIER.len - 1.4; player.position.set(x, ground(x, z), z); player.rotation.y = 0; camPos.copy(player.position).add(camOff); paintHud(); });
spirit.init(player, () => skyU.night.value > 0.5);
diy.init(player, myHome, { thumb: id => room.thumb(id), addStorage: (id, n) => room.addStorage(id, n) });
let gardenMsg = '';
design.init();
// HUD 按鈕換成和手機一樣的 App 圖示
[['designBtn', '🌷'], ['decorBtn', '🛋'], ['pocketBtn', '🎒']].forEach(([id, k]) => { const src = (I.APPICONS || {})[k], b = $(id); if (src && b) b.innerHTML = '<img src="' + src + '" alt="">'; });
if (nudgeHome(villagers, S().design)) props3d.dressAll();   // 溪畔那一棟島民的家挪到構圖較好的位置（其他佈置都排好之後）；新房子的信箱換上 3D 模型
walldress.init();   // 牆上的藤蔓、垂花、窗台花箱與吊花籃（所有建築都蓋好之後）
grass.init();   // 草叢最後建立：避開所有建築與物件
minimap.prepaint(() => hotel.siteInfo && hotel.siteInfo());   // 佈置都排好了：小地圖底圖先在背景畫
winter.init(player);   // 冰柱、炊煙、雪人（積雪時才出現）
waves.init();
// 成就：學習與小島生活共用一份；小島事件發生後定期檢查
TA.on('achievement', a => { ui.toast(`🏆 成就解鎖：${a.name}（+${a.gems} 潮晶）`); Audio.sfx('rare'); });
TA.on('levelup', d => { ui.toast('⬆ ' + profile.levelText(d)); Audio.sfx('levelup'); paintLv(); celebrate(`Lv.${d.lv}`, d.title, '#f0a43a'); });
/** 慶祝：畫面中央的大字橫幅（沿用季節標題的動畫）＋角色頭上的幾朵煙火（升級、每日目標、連續天數） */
function celebrate(big, line, col, small) {
  const el = document.createElement('div'); el.className = 'season-banner lv-banner' + (small ? ' small' : ''); el.style.setProperty('--sc', col || '#f0a43a');
  el.innerHTML = `<b>${ui.esc(big)}</b><span>${ui.esc(line)}</span>`; document.body.appendChild(el); setTimeout(() => el.remove(), 4200);
  if (room.inside || elsewhere()) return;
  const p = player.position, n = small ? 1 : 3;
  for (let i = 0; i < n; i++) setTimeout(() => events.burst(p.x + (Math.random() - 0.5) * 3, p.y + 3.2 + Math.random(), p.z + (Math.random() - 0.5) * 3, { n: 90, size: 0.7, speed: 3.2, quiet: i > 0 }), i * 260);
}
TA.on('toast', t => ui.toast((t.title ? t.title + '：' : '') + (t.text || '')));   // learn.js 的提示（例如潮汐護符替你守住了連續紀錄）
TA.on('wallet', () => { paintLv(); countUp($('bells'), S().bells); });
TA.on('streak', () => { paintHud(); const sk = L.streakAlive(); if (started && sk >= 2 && S().streakCel !== dayKey()) { S().streakCel = dayKey(); save(); celebrate(`🔥 ${sk} 天`, '連續學習', '#ef7a4a', true); } });
setInterval(() => { try { L.checkAch(); } catch (e) { console.error(e); } }, 5000);
function phoneAch() {
  const got = TA.S.ach || {}, body = ui.el('div', 'ach'), shown = L.ACH;
  const groups = [['學習', a => !a.id.startsWith('isle_')], ['小島生活', a => a.id.startsWith('isle_')]];
  const n = shown.filter(a => got[a.id]).length;
  body.appendChild(ui.el('p', 'muted', `已解鎖 ${n} / ${shown.length} · 潮晶 ${TA.S.gems}（可在商店換鈴錢）`));
  groups.forEach(([title, f]) => {
    const list = shown.filter(f); if (!list.length) return;
    body.appendChild(ui.el('b', 'ach-h', `${title}（${list.filter(a => got[a.id]).length} / ${list.length}）`));
    list.forEach(a => body.appendChild(ui.el('div', 'ph-row ach-row' + (got[a.id] ? ' got' : ''), `<span class="av" style="--c:${got[a.id] ? '#ffb84a' : '#c8bca8'}">${got[a.id] ? '🏆' : '？'}</span><div><b>${ui.esc(a.name)}</b><small>${ui.esc(a.desc)} · ${a.gems} 潮晶</small></div>`)));
  });
  ui.panel('成就', body, { cls: 'phone' });
}
function birthdayNews() {
  const b = villagers.filter(v => !v.shop && gifts.isBirthday(v));
  if (b.length) setTimeout(() => ui.toast(`🎂 今天是${b.map(v => v.name).join('、')}的生日！`), 1500);
  const s = S(), k = 'me:' + new Date().getFullYear();
  if (gifts.playerBirthday() && !(s.bdayDone || {})[k]) { s.bdayDone = s.bdayDone || {}; s.bdayDone[k] = true; s.bells += 3000; save(); social.sendLetter({ fromName: '全體島民', title: '生日快樂！', open: '親愛的你：', text: villagers.filter(v => !v.shop && !v.guest).map(v => `${v.name}：「${(I.PLAYER_BDAY || {})[v.sid] || '生日快樂！'}」`).join('\n'), giftLine: '大家湊了 3000 鈴錢給你當生日禮物。', close: '—— 潮汐小島的大家' }); setTimeout(() => ui.toast('🎉 生日快樂！看看信箱'), 2500); }
}   // 旅客在 town/social 之後加入，不參與作息與委託
// 信箱旗子（有未讀訊息時豎起；材質要套 bend，否則不會跟著地平線彎下去而浮在半空）
const flag = new THREE.Group();
if (myHome) { const fx = myHome.x + 1.9 * 1, fz = myHome.z + 1.6; flag.position.set(fx + 0.22, ground(fx, fz) + 1.05, fz); flag.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03), bend(new THREE.MeshStandardMaterial({ color: '#888' })))); const fl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.2), bend(new THREE.MeshStandardMaterial({ color: '#ef3f3f' }))); fl.position.set(0, 0.14, 0.1); flag.add(fl); scene.add(flag); }
const mailPos = myHome ? [myHome.x + 1.9, myHome.z + 1.6] : [0, 0];
const greetOf = v => {
  const L7 = (I.LINES7 || {})[v.sid]; if (weather.raining() && L7 && L7.rain && Math.random() < 0.6) return bag('r:' + v.sid, L7.rain);   // v8.5 雨天的招呼
  const h = new Date().getHours(), g = v.greet || {}, slot = h < 5 || h >= 21 ? 'night' : h < 11 ? 'morning' : h < 17 ? 'day' : 'evening';
  const arr = Array.isArray(g) ? g : g[slot] || g.day || ['你好！']; return bag(`g:${v.sid}:${slot}`, arr);   // 洗牌袋：輪完一輪才重複
};
const tail = v => (v.catch && Math.random() < 0.5 ? v.catch : '');

/* ---------- 對話 ---------- */
let talking = null;
async function talk(v) {
  if (talking || life.busy) return;
  talking = v; v.lastTalkT = simT; life.cancel(); town.interrupt(v); Audio.sfx('pop'); setExpr(v.mesh, 'happy', 1.4);
  try {
    if (room.inside && room.isOwn() && roomHost === v && homevisit.pendingSid() === v.sid) { const r = await homevisit.talk(v, sp(v)); if (r === 'leave') { visitorLeave(v); return; } if (r !== null) return; }
    if (v.shop) await shopTalk(v); else if (v.guest) await guest.talk(v); else await villagerTalk(v);
  }
  finally { ui.closeDialog(); talking = null; paintHud(); }
}
async function villagerTalk(v) {
  miles.addOnce('talk', v.sid);
  const s = S(), fr = s.fr[v.sid] || 0;
  const ml = move.movedLine(v); if (ml) await ui.say(sp(v), ml + tail(v));
  const bl = gifts.isBirthday(v) && ((gifts.pref(v) || {}).lines || {}).birthday, pb = gifts.playerBirthday() && (I.PLAYER_BDAY || {})[v.sid];
  if (bl || pb) await ui.say(sp(v), pick(bl || [pb]) + tail(v)); else
  await ui.say(sp(v), (yuehome.inside && v === earthV ? '你來啦……熱湯還在爐上。那張藍色扶手椅是留給你的，慢慢坐。' : (house.inside && houseSid !== 'museum' || room.inside && !room.isOwn()) && roomHost === v ? pick(['歡迎來我家！隨便坐～', '你來啦！家裡有點亂，別介意。', '歡迎！要喝杯茶嗎？']) : events.line(v) || bond.recall(v) || greetOf(v)) + tail(v));
  if (weather.typhoon() && (room.inside || yuehome.inside || house.inside && houseSid !== 'museum') && roomHost === v) await typhoonTalk(v);
  else if (weather.afterTyphoon()) { const s0 = S(); s0.afterTalk = s0.afterTalk && s0.afterTalk.d === dayKey() ? s0.afterTalk : { d: dayKey(), who: {} }; if (!s0.afterTalk.who[v.sid]) { s0.afterTalk.who[v.sid] = true; save(); await ui.say(sp(v), L5(v.sid, 'after', ['颱風過去了，大家都平安就好。'])); } }
  { const rem = planner.remind(v); if (rem) await ui.say(sp(v), rem); }
  await town.playBond(v, sp(v));
  for (;;) {
    const opts = [['practice', `一起練習（${challenge.SET} 題、不限時）`], ['quiz', '連續挑戰（獎金越疊越多）'], ['tip', '讀書秘訣'], ['chat', '聊聊天']];   // 穩定練習是預設；想拚紀錄再選連續挑戰
    const unk = s.pockets.filter(x => x && x.k === 'unk').length;
    const don = s.pockets.filter(x => x && KINDS[x.k] && !s.museum[x.k][x.id]).length;
    if (v.sid === 'history') { if (unk) opts.unshift(['appraise', `鑑定化石（${unk}）`]); if (don) opts.unshift(['donate', `捐贈給博物館（${don}）`]); opts.push(['specimen', '標本研究（現在看不到的生物）'], ['museum', '看看博物館展品']); }
    social.menu(v, sp(v)).reverse().forEach(([l, f]) => opts.unshift(['fn', l, f]));
    const TK = { english: 'fish', biology: 'bug' }[v.sid];
    if (TK && events.active().includes(TK + '_cup') && !life.tourney) opts.unshift(['fn', TK === 'fish' ? '參加釣魚大賽' : '參加捕蟲大會', () => joinTourney(v, TK)]);
    if (events.active().includes('halloween') && (hourOverride ?? nowHour()) >= 17 && !((S().tot || {})[dayKey()] || {})[v.sid]) opts.unshift(['fn', '不給糖就搗蛋！', () => trickOrTreat(v)]);
    if (v.sid === 'earth' && ores.count()) opts.unshift(['fn', `鑑定礦石（${ores.count()}）`, () => ores.appraise(sp(v))]);
    if (v.sid === 'english') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '海風電台（英文聽力）', async () => { ui.closeDialog(); radio.open(paintHud); return 'exit'; }]);
    if (v.sid === 'physics') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '拋射實驗場', async () => { ui.closeDialog(); throwGame.open(paintHud); return 'exit'; }]);
    if (v.sid === 'history') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '年代排序挑戰', async () => { ui.closeDialog(); chrono.open(paintHud); return 'exit'; }]);
    if (v.sid === 'chinese') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '成語診所（成語誤用）', async () => { ui.closeDialog(); idiom.open(paintHud); return 'exit'; }]);
    if (v.sid === 'earth') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '月相觀測', async () => { ui.closeDialog(); moon.open(paintHud); return 'exit'; }]);
    if (v.sid === 'math') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '潮汐夜市（期望值）', async () => { ui.closeDialog(); market.open(paintHud); return 'exit'; }]);
    if (v.sid === 'math') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '函數圖形（看圖選方程式）', async () => { ui.closeDialog(); plot.open(paintHud); return 'exit'; }]);
    if (v.sid === 'civics') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '島民議會（選舉制度）', async () => { ui.closeDialog(); council.open(paintHud); return 'exit'; }]);
    if (v.sid === 'chemistry') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '元素週期表', async () => { ui.closeDialog(); periodic.open(paintHud); return 'exit'; }]);
    if (v.sid === 'chemistry') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '料理教室', () => cooking.lesson(sp(v))]);
    if (v.sid === 'earth' && astro.fragments() >= 5) opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', `用星之碎片換獎勵（${astro.fragments()} 顆）`, () => fragTrade(v)]);
    if (v.sid === 'biology') opts.splice(opts.findIndex(o => o[0] === 'quiz'), 0, ['fn', '花園遺傳諮詢', () => garden.consult(sp(v))]);
    if (v.sid === 'history' && events.weeklyOn() && !events.weeklyDone()) opts.unshift(['fn', '參加週末模擬考祭典', () => events.weeklyMock(sp(v), giveFurn)]);
    opts.splice(opts.findIndex(o => o[0] === 'chat'), 0, ['fn', gifts.canGiftToday(v) ? '送禮物' : '送禮物（今天已送）', () => gifts.give(v, sp(v))]);
    if (gifts.isBirthday(v)) opts.unshift(['fn', '祝你生日快樂！', () => gifts.celebrate(v, sp(v))]);
    if (!room.inside && !elsewhere() && homevisit.canInvite(v)) opts.splice(opts.findIndex(o => o[0] === 'chat'), 0, ['fn', '邀請來我家玩', () => homevisit.invite(v, sp(v))]);
    if (lab.available(v)) opts.splice(opts.findIndex(o => o[0] === 'chat'), 0, ['fn', lab.menuLabel(v), () => lab.talk(v, sp(v), { giveFurn, paint: paintHud })]);
    if (town.bondLevel(v.sid) >= 3) opts.splice(1, 0, ['fn', '開讀書會（5 題，鈴錢加倍）', () => town.studyClub(v, sp(v))]);
    opts.push(['bye', '再見']);
    const i = await ui.ask(sp(v), pick(['還有什麼事嗎？', '想做什麼呢？', '嗯？']), opts.map(o => o[1]));
    const k = opts[i] ? opts[i][0] : 'bye';
    if (k === 'fn') { const r = await opts[i][2](); paintHud(); if (r === 'exit') return; continue; }
    if (k === 'bye') { await ui.say(sp(v), pick(['下次見！', '要常來找我喔！', '加油喔！']) + tail(v)); return; }
    if (k === 'practice') { await ledger.run('practice', () => challenge.practice(v)); paintHud(); const t = lab.claimSmall(tutors()); if (t) ui.toast(t); }
    if (k === 'quiz') { await ledger.run('streak', () => challenge.streak(v)); paintHud(); }
    if (k === 'tip') { const n = (s.tips[v.sid] || 0) % (v.tips || []).length; s.tips[v.sid] = n + 1; save(); await ui.say(sp(v), (v.tips || ['多練習就會進步！'])[n] || '多練習就會進步！'); }
    if (k === 'chat') await ui.say(sp(v), bag('c:' + v.sid, v.chat || ['今天天氣真好。']) + tail(v));
    if (k === 'appraise') await appraise(v);
    if (k === 'donate') await donate(v);
    if (k === 'specimen') await specimen(v);
    if (k === 'museum') { ui.closeDialog(); openDex('fossil'); return; }
  }
  void fr;
}
/* ---------- 釣魚大賽、捕蟲大會 ---------- */
const CUP = { fish: { gold: 650, silver: 400, bronze: 180, tool: 'rod', name: '釣魚大賽' }, bug: { gold: 520, silver: 320, bronze: 140, tool: 'net', name: '捕蟲大會' } };   // 金牌大約要釣 10 條、抓 13 隻
const tline = (k, f, d) => pick((((I.LINES2 || {}).tourney || {})[k] || {})[f] || d);
async function joinTourney(v, kind) {
  const s = S(); s.tourney = s.tourney || {}; const rec = s.tourney[kind] || {};
  for (const l of [].concat(tline(kind, 'intro', [`歡迎參加${CUP[kind].name}！限時 3 分鐘，答對題目才算分。`]))) await ui.say(sp(v), l);
  if (rec.best) await ui.say(sp(v), `你的最佳紀錄是 ${rec.best} 分。金獎門檻 ${CUP[kind].gold} 分、銀獎 ${CUP[kind].silver} 分、銅獎 ${CUP[kind].bronze} 分。`);
  const i = await ui.ask(sp(v), '準備好了嗎？', ['開始！', '等一下']);
  if (i !== 0) return;
  await ui.say(sp(v), tline(kind, 'start', ['預備——開始！']));
  ui.closeDialog();
  if (player.userData.tool !== CUP[kind].tool) equip(CUP[kind].tool);
  life.startTourney(kind, t => tourneyEnd(v, t));
  return 'exit';
}
async function tourneyEnd(v, t) {
  if (talking || life.busy || ui.dialogOpen() || ui.cardOpen() || ui.panelOpen() || astro.isOpen() || photo.active() || focus.active()) { setTimeout(() => tourneyEnd(v, t), 500); return; }
  talking = v;
  try {
    const kind = t.kind, C2 = CUP[kind], s = S(); s.tourney = s.tourney || {}; const rec = s.tourney[kind] = s.tourney[kind] || {};
    const first = rec.best == null || t.score > rec.best; rec.best = Math.max(rec.best || 0, t.score);
    const medal = t.score >= C2.gold ? 'gold' : t.score >= C2.silver ? 'silver' : t.score >= C2.bronze ? 'bronze' : 'none';
    await ui.say(sp(v), tline(kind, 'end', ['時間到！']));
    await ui.say(sp(v), `你一共${kind === 'fish' ? '釣到' : '抓到'} ${t.n} 隻，得到 ${t.score} 分${first && t.score ? '，刷新個人紀錄！' : '。'}`);
    await ui.say(sp(v), tline(kind, medal, ['謝謝參加！']));
    const today = dayKey();
    if (rec.prizeDay !== today && medal !== 'none') {
      rec.prizeDay = today;
      const cup = (I.FURNITURE || []).find(f => f.id === `cup_${kind}_${medal}`);
      if (cup) await giveFurn(cup.id, `${C2.name}${medal === 'gold' ? '金獎' : '銀獎'}`);
      else { const b = medal === 'bronze' ? 1000 : 2000; s.bells += b; await ui.card({ icon: icon('bells', 'bells'), title: `${C2.name}銅獎：${b} 鈴錢`, sub: '下次挑戰銀獎吧！' }); }
    } else if (medal === 'none') { s.bells += 300; await ui.say(sp(v), '這是參加獎 300 鈴錢！'); }
    save(); paintHud();
  } finally { ui.closeDialog(); talking = null; }
}

challenge.init({ sp: v => sp(v), player, tail: v => tail(v), hearts: f => hearts(f), gift: v => gift(v), giveFurn: (id, sub) => giveFurn(id, sub) });
const hearts = f => '♥'.repeat(Math.min(5, Math.ceil(f / 4))) + '♡'.repeat(5 - Math.min(5, Math.ceil(f / 4)));
async function gift(v) {
  const s = S(), b = 500 + Math.floor(Math.random() * 5) * 100; s.bells += b; save();
  await ui.say(sp(v), pick(v.gift || ['這個送你！']));
  await ui.card({ icon: icon('bells', 'bells'), title: `收到 ${b} 鈴錢！`, sub: `${v.name}的謝禮` });
}

/* ---------- 博物館 ---------- */
async function appraise(v) {
  const s = S(); let lastQ = null;
  for (let i = 0; i < s.pockets.length; i++) {
    const it = s.pockets[i]; if (!it || it.k !== 'unk') continue;
    const fs = list('fossil'); if (!fs.length) { await ui.say(sp(v), '圖鑑資料還沒準備好呢。'); return; }
    const fresh = fs.filter(f => !s.dex.fossil[f.id]), fo = pick(fresh.length && Math.random() < 0.75 ? fresh : fs);
    const q = pickQ(fo.sid) || pickQ('earth');
    await ui.say(sp(v), `呼呼……這塊化石，要先答對一題${TA.subject(fo.sid).name}才能判斷。`);
    const a = await ui.ask(sp(v), q.q, q.o, { answer: q.a, abc: true, html: true, keys: true });
    const ok = a === q.a; record(q, ok);
    if (ok) {
      s.pockets[i] = { k: 'fossil', id: fo.id }; const first = !s.dex.fossil[fo.id]; s.dex.fossil[fo.id] = s.dex.fossil[fo.id] || Date.now(); save();
      lastQ = q; await ui.card({ icon: icon(fo.id, 'fossil'), title: `鑑定結果：${fo.name}`, sub: fo.desc, extra: `<span class="era">${ui.esc(fo.era || '')}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}` });
    } else { Audio.sfx('bad'); await ui.explain(sp(v), q, '呼……'); await ui.say(sp(v), '這塊化石我再研究一下。想通了再拿來，我會換一題考你。'); return; }
  }
  if (lastQ && guide.finished()) await challenge.keepGoing(sp(v), lastQ, { v });   // v8.2 新手引導還沒做完：鑑定完直接問捐贈，不插連續挑戰
  await ui.say(sp(v), '全部鑑定完了！要捐給博物館嗎？');
}
async function donate(v) {
  const s = S(), got = []; let n = 0;
  for (let i = 0; i < s.pockets.length; i++) {
    const it = s.pockets[i]; if (!it || !KINDS[it.k] || s.museum[it.k][it.id]) continue;
    const spc = find(it.k, it.id); s.museum[it.k][it.id] = Date.now(); s.pockets[i] = null; n++; got.push(it); save(); miles.add('donate');
    Audio.sfx('ok');
    await ui.say(sp(v), `喔喔！這是${spc ? spc.name : it.id}！${spc && spc.desc ? spc.desc : ''}`);
  }
  s.bells += n * 200; save();
  await ui.say(sp(v), n ? `謝謝你捐了 ${n} 件展品！博物館又更豐富了。這是 ${n * 200} 鈴錢的謝禮，呼呼。` : '目前沒有可以捐的東西呢。');
  if (n) await afterDonate(got, sp(v));
}

/* ---------- 商店 ---------- */
async function shopTalk(v) {
  await ui.say(sp(v), events.line(v) || pick(v.greet || ['歡迎光臨！']));
  const s = S(), has = s.pockets.some(Boolean);
  const opts = [['furn', '買家具'], ['wear', '服裝櫃台'], ['seed', '買種子'], ['sell', '賣東西'], ['ticket', `買潮汐券（3,000 鈴錢，有 ${trip.tickets()} 張）`], ['gem', `用潮晶換鈴錢（有 ${TA.S.gems} 潮晶）`]];
  if (events.active().includes('halloween') || s.candy) opts.push(['candy', `糖果兌換（${s.candy || 0} 顆）`]);
  opts.push(['bye', '只是看看']);
  const i = await ui.ask(sp(v), '要做什麼呢？', opts.map(o => o[1])), k = (opts[i] || ['bye'])[0];
  if (k === 'furn') { ui.closeDialog(); openFurnShop(v); return; }
  if (k === 'wear') { ui.closeDialog(); wardrobe.openShop(v, player, paintHud); return; }
  if (k === 'seed') { ui.closeDialog(); garden.openSeedShop(v, paintHud); return; }
  if (k === 'gem') { await gemTrade(v); return; }
  if (k === 'candy') { await candyShop(v); return; }
  if (k === 'ticket') {
    if (s.ticketDay === dayKey()) { await ui.say(sp(v), '今天的潮汐券已經賣完了，明天再來吧！潮汐里程也可以換潮汐券喔。'); return; }   // 每天限買一張
    if (s.bells < 3000) { await ui.say(sp(v), '鈴錢不夠呢。潮汐里程也可以換潮汐券喔！'); return; }
    ledger.mark('shop'); s.bells -= 3000; s.ticketDay = dayKey(); trip.addTickets(1); Audio.sfx('coin'); paintHud(); await ui.say(sp(v), `這是潮汐券！到碼頭盡頭找船長海鷗就能出發。你現在有 ${trip.tickets()} 張。`); return;
  }
  if (k !== 'sell') { await ui.say(sp(v), pick(v.bye || ['下次再來！'])); return; }
  if (!has) { await ui.say(sp(v), pick(v.poor || ['口袋空空的呢。'])); return; }
  ui.closeDialog(); openPockets('sell', v);
}

async function gemTrade(v) {
  const s = S(), d = dayKey(); s.gemDay = s.gemDay && s.gemDay.d === d ? s.gemDay : { d, n: 0 };
  const left = Math.min(TA.S.gems, 100 - s.gemDay.n);
  if (left < 10) { await ui.say(sp(v), TA.S.gems < 10 ? '潮晶不夠呢。答題、翻單字卡、專注讀書、解成就都能拿到潮晶喔！' : '今天的兌換額度用完了（每天最多 100 潮晶），明天再來吧！'); return; }
  const opts = [10, 50, 100].filter(n => n <= left);
  const i = await ui.ask(sp(v), `1 潮晶可以換 100 鈴錢。今天還能換 ${left} 潮晶。`, opts.map(n => `${n} 潮晶 → ${n * 100} 鈴錢`).concat(['不用了']));
  if (i < 0 || i >= opts.length) return;
  const n = opts[i]; TA.S.gems -= n; s.gemDay.n += n; ledger.mark('exchange'); s.bells += n * 100; save(); Audio.sfx('coin'); paintHud();
  await ui.say(sp(v), `成交！這是 ${n * 100} 鈴錢。`);
}

/* ---------- 溪邊的水車磨坊：告示牌講上射式水車的能量轉換，可以看示意圖或答一題能量題（每天第一次答對有謝禮） ---------- */
async function millTalk() {
  if (talking) return; talking = { name: 'mill' };
  const s = S(); s.stats = s.stats || {}; s.stats.mill = (s.stats.mill || 0) + 1; save();
  const sp = { name: '磨坊告示牌', color: '#8a6a4a' };
  try {
    await ui.say(sp, '上射式水車：水槽把溪水送到輪頂，水落進葉板，水的重力位能變成水車轉動的動能，再經由輪軸帶動磨坊裡的石磨。');
    const i = await ui.ask(sp, '水落下的高度越高、水量越多，水車能得到的能量就越多（位能 ＝ mgh）。要做什麼呢？', ['看「單擺能量儀」示意圖', '答一題能量題', '離開']);
    if (i === 0) { ui.closeDialog(); const f = figs.FIGS.find(x => x.id === 'pendulum-energy'); if (f) figs.open(f); return; }
    if (i !== 1) return;
    const q = pickQU(['ph-energy'], 3); if (!q) { await ui.say(sp, '今天的題目都答過了，明天再來吧！'); return; }
    const { ok } = await askQ(sp, q, '能量題：'); record(q, ok);
    if (!ok) { Audio.sfx('bad'); await ui.explain(sp, q); return; }
    Audio.sfx('ok');
    if (s.millDay !== dayKey()) { s.millDay = dayKey(); s.bells += 200; save(); paintHud(); await ui.praise(sp, '答對了！磨坊送你 200 鈴錢當謝禮（每天一次）。', q); }
    else await ui.praise(sp, '答對了！水車轉得更起勁了。', q);
  } finally { ui.closeDialog(); talking = null; paintHud(); }
}

/* ---------- 家具店 ---------- */
function dailyStock() {
  const all = (I.FURNITURE || []).filter(f => f.src === 'shop'), k = dayKey();
  let seed = [...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 11) >>> 0; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick4 = all.slice().sort(() => r() - 0.5).slice(0, 6);
  const sell = x => x && x.price > 0;   // 飯店專用的款式（標價 0、用優惠券換）不在鈴錢商店賣
  const wp = (I.WALLPAPER || []).filter(sell).sort(() => r() - 0.5)[0], fl = (I.FLOORING || []).filter(sell).sort(() => r() - 0.5)[0];
  return { furn: pick4, papers: [wp, fl].filter(Boolean) };
}
/** 今天在商店買過的件數（櫃台清單與店內展示台共用同一份紀錄） */
function shopBought() { const s = S(), d = dayKey(); if (!s.shopDay || s.shopDay.d !== d) s.shopDay = { d, n: {} }; return s.shopDay.n; }
const isPaperItem = f => !f.cat && (I.WALLPAPER || []).concat(I.FLOORING || []).includes(f);
/** 買一件商店商品：扣鈴錢、壁紙地板登記／家具進倉庫、記下今日件數。買不起或壁紙已有就回傳 false */
function buyShopItem(f) {
  const s = S(), paper = isPaperItem(f);
  if (s.bells < f.price || (paper && (s.papers || []).includes(f.id))) return false;
  ledger.mark('shop'); s.bells -= f.price; if (paper) { s.papers = s.papers || []; s.papers.push(f.id); } else room.addStorage(f.id);
  const B = shopBought(); B[f.id] = (B[f.id] || 0) + 1;
  save(); Audio.sfx('coin'); paintHud();
  return true;
}
function openFurnShop(v) {
  const s = S(), st = dailyStock(), body = ui.el('div', 'nk');
  let pend = null;   // 等待確認購買的商品
  const bought = shopBought;
  const paint = () => {
    const B = bought();
    body.innerHTML = `<div class="nk-top"><span class="nk-sign">今日商品<small>每天更換</small></span><span class="nk-wallet"><i></i>${s.bells.toLocaleString()}</span></div>`;
    // 商品排在木頭層架上：家具一層三件，最下層是壁紙與地板
    const rows = [st.furn.slice(0, 3), st.furn.slice(3, 6), st.papers].filter(r => r.length);
    s.papers = s.papers || [];
    rows.forEach(row => {
      const shelf = ui.el('div', 'nk-shelf');
      row.forEach(f => {
        const paper = !f.cat && (I.WALLPAPER || []).concat(I.FLOORING || []).includes(f), own = paper && s.papers.includes(f.id);
        const kind = paper ? ((I.WALLPAPER || []).includes(f) ? '壁紙' : '地板') : '';
        const pic = paper ? `<i class="sw" style="background:linear-gradient(135deg, ${f.c1} 50%, ${f.c2} 50%)"></i>` : `<img src="${room.thumb(f.id)}" alt="">`;
        const it = ui.el('button', 'nk-item' + (own ? ' own' : '') + (pend === f ? ' on' : ''), `<span class="nk-pic">${pic}</span><span class="nk-tag"><b>${ui.esc(f.name)}</b><small>${own ? '已擁有' : f.price.toLocaleString() + ' 鈴錢'}${kind ? ' · ' + kind : ''}</small></span>${B[f.id] ? `<u>已買 ${B[f.id]}</u>` : ''}`);
        it.type = 'button'; if (f.desc) it.dataset.tip = f.desc;
        it.onclick = () => { if (own) { ui.toast('已經有這個了'); return; } pend = f; paint(); };
        shelf.appendChild(it);
      });
      body.appendChild(shelf);
    });
    // 購買確認泡泡
    if (pend) {
      const ok = s.bells >= pend.price, cf = ui.el('div', 'nk-confirm', `<span>${ok ? `要買「${ui.esc(pend.name)}」嗎？<b>${pend.price.toLocaleString()} 鈴錢</b>` : `「${ui.esc(pend.name)}」要 ${pend.price.toLocaleString()} 鈴錢，還差 ${(pend.price - s.bells).toLocaleString()}……`}</span>`);
      const yes = ui.el('button', 'btn' + (ok ? ' gold' : ' off'), ok ? '買！' : '鈴錢不夠'), no = ui.el('button', 'btn', '再想想'); yes.type = no.type = 'button';
      yes.onclick = () => { const f = pend; if (!ok) { Audio.sfx('deny'); return; } pend = null; buy(f); };
      no.onclick = () => { pend = null; paint(); };
      cf.append(yes, no); body.appendChild(cf); setTimeout(() => yes.focus({ preventScroll: true }), 0);
    } else body.appendChild(ui.el('p', 'nk-hint', `${ui.esc(v.name)}：「慢慢看喔！點商品就能買。」`));
  };
  const buy = f => {
    if (!buyShopItem(f)) { Audio.sfx('deny'); return; }
    ui.toast(`買了${f.name}！回家按 F 裝潢`); paint();
    const el = body.querySelectorAll('.nk-item'); el.forEach(e => { if (e.textContent.includes(f.name)) e.classList.add('pop'); });
  };
  paint(); ui.panel(`${v.name}的家具店`, body, { cls: 'nook-p' });
}

/* ---------- 口袋 ---------- */
function openPockets(mode, shopV) {
  const s = S(), body = ui.el('div', 'pk');
  const grid = ui.el('div', 'pk-grid'), info = ui.el('div', 'pk-info', mode === 'sell' ? '點選要賣的東西' : '點選物品查看');
  const paint = () => {
    grid.innerHTML = '';
    s.pockets.forEach((it, i) => {
      const b = ui.el('button', 'pk-slot' + (it ? '' : ' empty')); b.type = 'button';
      if (it) { b.innerHTML = `<img src="${itemIcon(it)}" alt="">`; b.title = itemName(it); }
      b.onclick = () => { if (!it) return; select(i); };
      grid.appendChild(b);
    });
  };
  const select = i => {
    const it = s.pockets[i], spc = it.k === 'unk' ? null : find(it.k, it.id), price = itemPrice(it);
    info.innerHTML = `<div class="pk-sel"><img src="${itemIcon(it)}" alt=""><div><b>${ui.esc(itemName(it))}</b><small>${it.k === 'unk' ? '拿去博物館鑑定 · 收購價 ' + price + ' 鈴錢' : it.k === 'pkg' ? '委託的包裹，送到收件島民手上' : it.k === 'ore' ? '拿去給岳鑑定 · 收購價 ' + price + ' 鈴錢' : it.k === 'food' ? `料理 · ${cooking.EFFECT[(cooking.food(it.id) || {}).effect || 'bells'][1]} 30 分鐘 · 收購價 ${price} 鈴錢` : (KINDS[it.k] + (s.museum[it.k][it.id] ? ' · 已捐贈' : ' · 未捐贈') + ' · 收購價 ' + price + ' 鈴錢')}</small>${spc && spc.desc ? `<p>${ui.esc(spc.desc)}</p>` : ''}</div></div>`;
    const row = ui.el('div', 'pk-act');
    if (mode === 'sell' && it.k !== 'pkg') { const b = ui.el('button', 'btn gold', `賣出 ${price} 鈴錢`); b.type = 'button'; b.onclick = () => { removeAt(i); ledger.mark('sell'); s.bells += price; save(); Audio.sfx('coin'); paintHud(); paint(); info.innerHTML = `賣出了！現在有 ${s.bells.toLocaleString()} 鈴錢`; }; row.appendChild(b); }
    else if (it.k === 'food') { const b = ui.el('button', 'btn gold', '吃掉'); b.type = 'button'; b.onclick = () => { removeAt(i); cooking.eat(it.id); paint(); paintHud(); info.innerHTML = '好好吃！'; }; row.appendChild(b); }
    else if (it.k === 'fish' || it.k === 'bug') { const b = ui.el('button', 'btn', '放生'); b.type = 'button'; b.onclick = () => { removeAt(i); Audio.sfx('swish'); paint(); info.innerHTML = '再見啦～'; }; row.appendChild(b); }
    info.appendChild(row);
  };
  body.append(grid, info); paint();
  ui.panel(mode === 'sell' ? `${shopV.name}的收購櫃台` : `口袋（${s.pockets.filter(Boolean).length} / ${POCKET_N}）`, body, { cls: 'pocket' });
}

/* ---------- 圖鑑 ---------- */
function openDex(kind) {
  const s = S(), body = ui.el('div', 'dex'); kind = kind || 'fish';
  const tabs = ui.el('div', 'dex-tabs'), grid = ui.el('div', 'dex-grid'), info = ui.el('div', 'dex-info');
  const paint = () => {
    tabs.innerHTML = ''; ['fish', 'bug', 'sea', 'fossil', 'mineral'].filter(k => list(k).length).forEach(k => { const L2 = list(k), got = L2.filter(x => s.dex[k][x.id]).length, mus = L2.filter(x => s.museum[k][x.id]).length; const b = ui.el('button', 'dex-tab' + (k === kind ? ' on' : ''), `${KINDS[k]} <small>${got}/${L2.length} · 館藏 ${mus}</small>`); b.type = 'button'; b.onclick = () => { kind = k; paint(); }; tabs.appendChild(b); }); ui.showTab(tabs);
    grid.innerHTML = ''; info.innerHTML = '<small class="muted">點圖示查看說明。灰色剪影是還沒取得的。</small>';
    list(kind).forEach(x => {
      const got = s.dex[kind][x.id], mus = s.museum[kind][x.id];
      const noted = !got && fieldnote.has(kind, x.id), b = ui.el('button', 'dex-cell' + (got ? '' : ' unknown') + (mus ? ' donated' : '') + (noted ? ' noted' : '')); b.type = 'button'; b.innerHTML = `<img src="${icon(x.id, kind)}" alt="">${mus ? '<i>館</i>' : noted ? '<i>記</i>' : ''}`;
      b.onclick = () => { info.innerHTML = got ? `<div class="pk-sel"><img src="${icon(x.id, kind)}" alt=""><div><b>${ui.esc(x.name)} <small>${ui.esc(x.en || x.era || '')}</small></b><small>${kind === 'mineral' ? '莫氏硬度 ' + x.mohs + ' · ' + stars(x.rarity) : kind === 'fossil' ? '鑑定科目：' + (TA.subject(x.sid) || {}).name : `${whereName(kind, x)}${x.weather === 'rain' ? '（雨天限定）' : ''} · ${kind === 'sea' ? '退潮時' : fmtHours(x)} · ${fmtMonths(x)} · ${stars(x.rarity)}`} · ${x.price} 鈴錢${mus ? ' · 已捐贈' : ''}</small>${x.habitat ? `<p><b>自然棲地：</b>${ui.esc(x.habitat)}</p>` : ''}<p>${ui.esc(x.desc || '')}</p></div></div>` : `<div class="pk-sel"><img class="sil" src="${icon(x.id, kind)}" alt=""><div><b>？？？</b><small>${kind === 'mineral' ? '用鏟子敲石頭偶爾會敲出礦石，交給岳鑑定後登錄' : kind === 'fossil' ? '挖到化石並答題鑑定後登錄' : `出沒：${whereName(kind, x)}${x.weather === 'rain' ? '（雨天）' : ''} · ${kind === 'sea' ? '退潮時' : fmtHours(x)} · ${fmtMonths(x)}${kind === 'fish' || kind === 'bug' ? (available(kind).some(y => y.id === x.id) ? ' · <b>現在就看得到</b>' : ' · 現在看不到：可以找史遙做標本研究') : ''}`}</small></div></div>`; };
      grid.appendChild(b);
    });
  };
  const fn = fieldnote.section(); if (fn) body.append(fn);   // 答錯溜走的生物：觀察筆記，答對一題新的題目就補完
  body.append(tabs, grid, info); paint();
  ui.panel('潮汐圖鑑', body, { cls: 'dexp' });
}

/** 標本研究（v7.1）：季節、時段或天氣不對、現在島上看不到的魚蟲，可以在博物館的標本室研究——
    3 題答對 2 題就登錄圖鑑、帶走一份標本（一天一次）。放學後才上線的玩家也補得到白天或過季的生物 */
async function specimen(v) {
  const s = S(), d = dayKey(), say = t => ui.say(sp(v), t);
  if (s.specimenDay === d) { await say('今天的標本研究做過了，明天再來看看別的吧。'); return; }
  const cand = ['fish', 'bug'].flatMap(k => { const now = new Set(available(k).map(x => x.id)); return list(k).filter(x => !s.dex[k][x.id] && !now.has(x.id) && x.rarity <= 3).map(x => [k, x]); });
  if (!cand.length) { await say('圖鑑裡還缺的生物，現在島上都找得到喔！拿著釣竿和捕蟲網出去看看吧。'); return; }
  if (!s.pockets.some(x => !x)) { await say('口袋滿了，先整理一下再來拿標本吧。'); return; }
  const opts = cand.sort(() => Math.random() - 0.5).slice(0, 3);
  const i = await ui.ask(sp(v), '標本室裡有幾種現在島上看不到的生物（季節、時段或天氣不對）。一起研究標本：3 題答對 2 題，就能登錄圖鑑、帶走一份標本。要研究哪一種？', opts.map(([k, x]) => `${x.name}（${k === 'fish' ? '魚' : '蟲'} · ${x.weather === 'rain' ? '雨天 · ' : ''}${fmtHours(x)} · ${fmtMonths(x)}）`).concat(['下次吧']), { keys: true });
  if (i < 0 || i >= opts.length) return;
  const [k, x] = opts[i], res = await drill(sp(v), picker({ mode: 'subject', subject: k === 'fish' ? 'english' : 'chinese' }), 3, {});
  s.specimenDay = d; save();
  if (res.ok < 2) { await say(`答對 ${res.ok} / ${res.n}，差一點。標本還在，明天再來研究吧。`); return; }
  const first = !s.dex[k][x.id]; s.dex[k][x.id] = s.dex[k][x.id] || Date.now(); const room = addItem({ k, id: x.id }); save(); ui.closeDialog();
  await ui.card({ pocket: room, icon: icon(x.id, k), title: `標本研究：${x.name}`, sub: `答對 ${res.ok} / ${res.n}！${x.name}平常${fmtHours(x)}、${fmtMonths(x)}才看得到。`, extra: `<span class="stars">${stars(x.rarity)}</span>${first ? '<em>新登錄圖鑑！</em>' : ''}` });
}

/* ---------- 手機 ---------- */
let hourOverride = null;
/** 目前的遊戲時間（除錯時可覆寫小時） */
const simDate = () => { const d = new Date(); if (hourOverride != null) d.setHours(Math.floor(hourOverride), Math.floor((hourOverride % 1) * 60), 0, 0); return d; };
const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
/** 從練習護照直接開啟某個練習遊戲 */
function openGame(id) {
  const G = { radio, idiom, plot, market, chrono, council, throw: throwGame, periodic, moon };
  if (G[id]) G[id].open(paintHud);
}
/** 睡覺：夢境複習（錯題）或深度睡眠進入夢境島 */
async function sleepMenu() {
  const i = await ui.ask({ name: '床鋪', color: '#b9a2ff', voice: 300 }, '要睡一覺嗎？', ['夢境複習（錯題本的題目）', '深度睡眠：去夢境島自由造島', '還是不睡了']);
  if (i === 0) { ui.closeDialog(); await dream.sleep(paintHud); return; }
  if (i !== 1) { ui.closeDialog(); return; }
  ui.closeDialog();
  // 夢境島是另一個場景：先離開房間（不播放出門的轉場），醒來時再回到家裡
  const go = await dreamisle.chooser(); void go;
}
function phoneDream() {
  if (!(room.inside && room.isOwn() || house.inside && houseSid === 'player') || roomHost) { ui.toast('回到自己家裡才能睡覺做夢（有床的話，也可以直接到床邊按 E）'); return; }
  ui.closePanel(); talking = { name: 'dream' }; sleepMenu().finally(() => { talking = null; });
}
room.setBedHook(() => sleepMenu());
dreamisle.init({ player, addStorage: (id, n) => room.addStorage(id, n), beforeEnter: () => { if (room.inside) room.exit(); if (house.inside) house.leave(); }, villagers: () => villagers.filter(v => !v.shop && !v.guest), wake: () => { enterHome(); setTimeout(() => ui.toast('醒來了。夢境島會一直保留著，下次睡覺還能回去'), 800); } });
const appBase = n => n.replace(/（.*?）$/, '');   // 「信箱（5）」→「信箱」
/** 一排 App 圖示（手機首頁與兩個學習入口共用）：點了記進「最近使用」，打開的面板左上角有返回鈕（back、label） */
function appGrid(apps, back, label) {
  const grid = ui.el('div', 'apps');
  apps.forEach(([n, ic, c, fn]) => {
    const img = (I.APPICONS || {})[ic], m = n.match(/^(.*?)（(.+)）$/), name = m ? m[1] : n, tag = m ? (m[2] === '今日' ? '!' : m[2]) : '';   // 「信箱（5）」：數字改成圖示角落的紅色小圓點，名稱不再折成兩行
    const a = ui.el('button', 'app', `<i style="--c:${c}">${img ? `<img src="${img}" alt="">` : ic}${tag ? `<b class="ap-dot">${tag}</b>` : ''}</i>${name}`); a.type = 'button';
    a.onclick = () => { const s0 = S(); s0.phoneRecent = [appBase(n)].concat((s0.phoneRecent || []).filter(x => x !== appBase(n))).slice(0, 4); save(); ui.setBack(back, label); fn(); };
    if (tag) a.setAttribute('aria-label', n); grid.appendChild(a);
  });
  return grid;
}
/** 考科航線裡的 App */
const trackApps = () => [['航海圖', '🧭', '#c8f0e8', () => voyage.openChart()], ['讀書計畫', '📅', '#d0e8ff', () => planner.open(paintHud)], ['成績統計', '📊', '#d8e8ff', () => hall.openStats()], ['學習週報', '📈', '#c8f0d8', () => report.open()]];
/** 自由練習裡的 App：[複習與基本功, 練習遊戲] */
const freeApps = () => { const vdue = L.vocabDue().length; return [
  [['每日潮汐' + (TA.S.daily.done ? '' : '（今日）'), '🌅', '#ffe8b0', () => voyage.openDaily()], ['單字燈塔' + (vdue ? `（${Math.min(99, vdue)}）` : ''), '🃏', '#c8f0e0', () => lexicon.open()], ['錯題本', '📕', '#ffd0c8', () => hall.openMistakes()], ['夢境複習' + (dream.count() ? `（${dream.count()}）` : ''), '💤', '#e0d8ff', phoneDream], ['非選練習', '✍️', '#ffe8d8', () => written.open()], ['激流衝刺', '⚡', '#fff0a8', () => voyage.openRush()], ['專注時光', '⏳', '#ffe0b0', () => { ui.closePanel(); focus.open(paintHud); }]],
  [['練習護照', '🛂', '#f0e8c0', () => passport.open(openGame)], ['單字謎' + (words.doneToday() ? '' : '（今日）'), '🔤', '#e8f0c0', () => words.open(paintHud)], ['海風電台', '📻', '#c8e8ff', () => radio.open(paintHud)], ['拋射實驗', '🥥', '#ffe0c0', () => throwGame.open(paintHud)], ['年代排序', '🏺', '#f0e0c8', () => chrono.open(paintHud)], ['元素週期表', '⚗️', '#e0d8ff', () => periodic.open(paintHud)], ['島民議會', '🗳', '#d0f0e8', () => council.open(paintHud)], ['函數圖形', '📉', '#d8e8ff', () => plot.open(paintHud)], ['成語診所', '🖌', '#f8e0d0', () => idiom.open(paintHud)], ['潮汐夜市', '🏮', '#ffd8b0', () => market.open(paintHud)], ['月相觀測', '🌙', '#d0d8f8', () => moon.open(paintHud)]]
]; };
const hubApps = () => trackApps().concat(...freeApps());
/** 今天的複習（hall.reviewLine／reviewGo）：今日學習與自由練習上方的一張卡 */
function reviewCard() {
  const r = L.reviewToday(), box = ui.el('div', 'rv-card' + (r.left ? '' : ' done'), `<i>🔁</i><span><b>${hall.reviewLine()}</b><small>錯題與到期題合成一份，只排要考的考科；圖書館、睡覺做夢、潮靈、導師的「一起練習」也從這份出題，做哪一個都算。${!r.left && r.more ? `今天的份做完了，還有 ${r.more} 題可以明天再來。` : ''}</small></span>`);
  const b = ui.el('button', 'btn' + (r.left ? ' gold' : ' ghost'), r.left ? '繼續複習' : r.more ? '再多做一些' : '沒有了'); b.type = 'button';
  b.disabled = !r.left && !r.more; b.onclick = () => hall.reviewGo(8); box.appendChild(b);
  return box;
}
/** 考科航線：要考的考科、各考科的級分估算與最弱單元；航海圖、讀書計畫、成績統計、學習週報從這裡進 */
function phoneTrack() {
  const groups = L.trackGroups(), main = L.mainGroups(), body = ui.el('div', 'phone-sec hub');
  const top = ui.el('div', 'hub-top', `<span><b>要考：${groups.join('、')}</b><small>${main.length ? `主力考科：${main.join('、')}（每日潮汐的新題多一倍）` : '還沒選主力考科'}${L.phase() ? ` · ${L.phase() === 'final' ? '考前一週' : '考前 30 天'}` : ''}</small></span>`);
  const ed = ui.el('button', 'btn ghost sm', '調整航線'); ed.type = 'button'; ed.onclick = () => { ui.setBack(phoneTrack, '考科航線'); openProfile(); }; top.appendChild(ed); body.appendChild(top);
  { const sm = semesterHtml(); if (sm) body.appendChild(ui.el('div', '', sm)); }   // v8.5 我的學期
  const weak = L.weakUnits(40).filter(w => w.weak), list = ui.el('div', 'hub-groups');
  groups.forEach(g => {
    const e = L.estimate(g === '數學' ? '數學A' : g), subs = TA.SUBJECTS.filter(x => x.group === g), w = weak.find(x => x.subject.group === g);
    const row = ui.el('div', 'hub-g' + (main.includes(g) ? ' main' : ''), `<b>${g}${main.includes(g) ? '<em>主力</em>' : ''}</b><span>${e && e.lv ? `估計 ${e.lo}–${e.hi} 級分` : `再練 ${e ? e.need : 40} 題就能估級分`}<small>${w ? `最弱：${ui.esc(w.unit.name)}（${Math.round(w.st.acc * 100)}%）` : '還沒有確認的弱點單元'}</small></span>`);
    if (w) { const b = ui.el('button', 'btn sm', '補弱點'); b.type = 'button'; b.onclick = () => hall.runSet(`${w.unit.name} · 單元練習`, L.pickUnit(w.id, 10), { again: phoneTrack }); row.appendChild(b); }
    const c = ui.el('button', 'btn ghost sm', '航海圖'); c.type = 'button'; c.onclick = () => { ui.setBack(phoneTrack, '考科航線'); voyage.openChart(subs[0] && subs[0].id); }; row.appendChild(c);
    list.appendChild(row);
  });
  body.appendChild(list);
  body.appendChild(ui.el('h4', 'ph-sec', '進度與計畫')); body.appendChild(appGrid(trackApps(), phoneTrack, '考科航線'));
  body.appendChild(ui.el('p', 'muted', '沒有列在航線裡的考科也能自由練：航海圖、錯題本與導師都有全部的科目。'));
  ui.setBack(phone); ui.panel('考科航線', body, { cls: 'phone' });   // 從裡面的 App 返回時也有「‹ 手機」
}
/** 自由練習：今天的複習、複習與基本功、練習遊戲 */
function phoneFree() {
  const body = ui.el('div', 'phone-sec hub'), [base, games] = freeApps();
  body.appendChild(reviewCard());
  body.appendChild(ui.el('h4', 'ph-sec', '複習與基本功')); body.appendChild(appGrid(base, phoneFree, '自由練習'));
  body.appendChild(ui.el('h4', 'ph-sec', '練習遊戲')); body.appendChild(appGrid(games, phoneFree, '自由練習'));
  ui.setBack(phone); ui.panel('自由練習', body, { cls: 'phone' });
}
const PHONE_CORE = ['考前衝刺', '今日學習', '考科航線', '自由練習', '模擬考', '信箱', '委託', '島民', '口袋', '地圖', '圖鑑', '島上指南', '設定'];
let phoneMore = false;   // 這次打開遊戲按過「更多 App」
function phone() {
  const body = ui.el('div', 'phone-sec');
  // 手機狀態列：時間、日期與天氣（像 NookPhone 的上緣）
  { const d = simDate(), hh = Math.floor(hourOverride ?? nowHour()), mm = Math.floor(((hourOverride ?? nowHour()) % 1) * 60);
    body.appendChild(ui.el('div', 'ph-status', `<b>${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</b><span>${d.getMonth() + 1} 月 ${d.getDate()} 日（${'日一二三四五六'[d.getDay()]}）</span><i>${$('wx') ? $('wx').textContent : ''}</i>`)); }
  const SEC = [
    ['學習', [   // v7.1：學習只留四個入口（今天、考科航線、自由練習、模考）；其他模式收進兩個入口裡，用過的會出現在「最近使用」
      ...(cram.active() ? [['考前衝刺', '🎯', '#ffc0b8', () => cram.open(paintHud)]] : []),
      ['今日學習', '📚', '#9fe0a0', phoneToday], ['考科航線', '⛵', '#c8e4ff', phoneTrack], ['自由練習', '🧩', '#e8f0c0', phoneFree], ['模擬考', '📝', '#ffe0d0', () => hall.openMock()]
    ]],
    ['島上生活', [
      ['信箱' + (social.unread() ? `（${social.unread()}）` : ''), '✉️', '#ffc8d8', () => social.openMail()], ['委託', '📋', '#c8e0ff', () => social.phoneList()],
      ['潮汐里程' + (miles.badge() ? `（${miles.badge()}）` : ''), '🌊', '#a8e0f8', () => miles.open(id => { wardrobe.own('hats', id); ui.toast('到衣櫃換上新帽子吧'); })],
      ...(weather.typhoon() ? [['颱風電話', '📞', '#c0d0ff', typhoonPhone]] : []),
      ['島民', '🐰', '#ffb3c8', phoneVillagers], ['研究計畫' + (lab.firstReady(villagers.filter(v => !v.shop && !v.guest)) ? '（!）' : ''), '🔬', '#d8e0ff', () => lab.openBook(villagers.filter(v => !v.shop && !v.guest))], ['口袋', '🎒', '#ffd36b', () => openPockets()], ['地圖', '🗺', '#a6e3ff', phoneMap], ['潮汐表', '〽️', '#b0e0f0', () => tide.openTable(simDate())], ['島嶼評價', '⭐', '#ffe08a', () => rating.open()]
    ]],
    ['收藏與手作', [
      ['收藏目錄', '🗂', '#e8dcc8', () => catalog.open({ openDex: k => openDex(k), stock: () => dailyStock(), paint: paintHud })],
      ['圖鑑', '📖', '#b9d0ff', () => openDex()], ['星座圖鑑', '🔭', '#c0c8ff', () => astro.openBook()], ['花園筆記', '🌱', '#d8f5b0', () => garden.openBook()], ['DIY 配方', '🔨', '#f0d8b0', () => diy.openBench(false)],
      ['衣櫃', '👕', '#ffd0e8', () => wardrobe.openCloset(player)], ['相機', '📷', '#ffd6a0', () => { ui.closePanel(); if (elsewhere()) ui.toast('這裡暫時不能拍照'); else photo.toggle(room.inside); }], ['相簿', '🖼', '#e0d0ff', () => photo.album()], ['回憶錄', '📔', '#ffd8c8', () => memo.open()],
      ['島嶼設計', '🌷', '#c8f0c0', () => { if (room.inside || elsewhere()) ui.toast('回到潮汐小島的戶外才能設計島嶼'); else design.open(player, paintHud); }], ['裝潢', '🛋', '#e0c8a8', () => { if (room.inside) room.openDecor(); else if (house.inside && houseSid === 'player') { ui.closePanel(); houseDecor(); } else ui.toast('回到家裡才能裝潢'); }]
    ]],
    ['工具', [['我的檔案', '🪪', '#dce6ff', openProfile], ['鈴錢帳本', '📒', '#f0e6c8', openLedger], ['島上指南', '🧭', '#d8f0e0', () => settings.guide()], ['我的生日', '🎂', '#ffd0e0', () => gifts.openBirthday(paintHud)], ['時間', '⏰', '#ffc0a0', phoneTime], ['成就', '🏆', '#ffe0a0', phoneAch], ['設定', '⚙️', '#e0e0e8', () => settings.open()]]]
  ];
  const base = appBase;
  // 新手期（新手引導沒做完、玩不到 3 天）：先列常用的 App，其他收在「更多」；熟手在設定裡打開「手機顯示全部 App」
  const full = phoneMore || (S().settings || {}).phoneAll || (guide.finished() && Object.keys(TA.S.days || {}).length >= 3);
  if (!full) {
    const all = SEC.flatMap(x => x[1]), core = all.filter(a => PHONE_CORE.includes(base(a[0]))), used = (S().phoneRecent || []).map(r => all.find(a => base(a[0]) === r)).filter(a => a && !core.includes(a));
    SEC.length = 0; SEC.push(['常用', core.concat(used)], [`其他 ${all.length - core.length - used.length} 個 App`, [['顯示全部', '➕', '#e8e8f0', () => { phoneMore = true; phone(); }]]]);   // 數字放標題，不放紅點（不是通知）
  }
  { const all = SEC.flatMap(x => x[1]).concat(hubApps()), recent = full ? (S().phoneRecent || []).map(r => all.find(a => base(a[0]) === r)).filter(Boolean) : []; if (recent.length) SEC.unshift(['最近使用', recent]); }   // 兩個入口裡的 App 用過也會出現在這裡   // 最近用過的 App 排在最上面
  SEC.forEach(([title, apps]) => { body.appendChild(ui.el('h4', 'ph-sec', title)); body.appendChild(appGrid(apps, phone, '手機')); });
  ui.panel('潮汐手機', body, { cls: 'phone phone-home' });
}
function phoneVillagers() {
  const s = S(), body = ui.el('div', 'ph-list');
  const WH = { out: '在外面散步', home: '在家（可以拜訪）', sleep: '睡覺中' }, h = hourOverride ?? nowHour();
  villagers.filter(v => !v.shop && !v.guest).forEach(v => {
    const f = s.fr[v.sid] || 0, lv = town.bondLevel(v.sid), next = town.BOND_AT[lv];
    const bd = gifts.pref(v); body.appendChild(ui.el('div', 'ph-row', `<span class="av" style="--c:${v.color}">${v.sub.short || ''}</span><div><b>${ui.esc(v.name)} <small>${WH[town.where(v, h)]}${town.homeHours(v) ? ' · 今天在家 <span class="nw">' + town.homeHours(v).replace('、', '</span>、<span class="nw">') + '</span>' : ''}${bd ? ' · 🎂 ' + gifts.fmtDate(bd.date) : ''}</small></b><small>${v.sub.name}導師 · <span class="hearts">${hearts(f)}</span> · 心事 ${lv}/${town.BOND_AT.length}${next ? `（好感度 ${f}/${next}）` : `（全部解鎖${bond.count(v.sid) ? ` · 共同回憶 ${bond.count(v.sid)}` : ''}）`}　今日 ${s.frDay[v.sid] || 0}/3</small></div>`));
  });
  ui.panel('島民', body, { cls: 'phone' });
}
/** 今日學習：今日路線（選時長、學習＋島上的事＋可選加碼、寶箱與收工摘要）、複習狀況、可以怎麼學 */
function phoneToday() {
  const S0 = TA.S, st = route.state(), mis = L.mistakes().length, vd = L.vocabDue().length;
  if (st.extra.all && route.claimExtra()) { L.gain(30, 10); TA.Store.save(); ui.toast('✨ 三項加碼（每日潮汐、單字、專注）都完成了：+30 經驗、+10 潮晶'); }
  const row = (id, ic, t, sub, v, need, lab, opt) => `<button type="button" class="td-task${v >= need ? ' done' : ''}${opt ? ' opt' : ''}" data-t="${id}"><i>${v >= need ? '✔' : ic}</i><span><b>${t}</b><small>${sub}</small><em style="--k:${Math.min(1, v / need).toFixed(3)}"></em></span><code>${lab}</code></button>`;
  const two = (st.study.v >= st.study.need) + (st.life.v >= st.life.need);
  const body = ui.el('div', 'today', `
    <div class="rt-len"><span>今天大概有</span>${route.LENS.map(n => `<button type="button" class="rt-chip${n === st.len ? ' on' : ''}" data-len="${n}">${n} 分鐘</button>`).join('')}</div>
    <div class="td-voy"><div class="td-vh"><b>今日路線</b><small>學習和島上的事都做完：開寶箱（+60 經驗、+50 潮晶），看今天的收工摘要</small><button type="button" class="btn td-chest${st.ready ? ' gold' : ''}"${st.ready || st.chest ? '' : ' disabled'}>${st.chest ? '收工摘要' : st.ready ? '🎁 開寶箱' : `${two} / 2`}</button></div>
      ${row('study', '📚', `學習 ${st.study.need} 分鐘`, st.study.cram ? '考前衝刺的 5 題精選做完就算完成；其他學習也都算' : '哪裡的學習都算：島民出題、每日潮汐、考場、非選練習、單字卡（4 張約 1 分）、專注時光', st.study.v, st.study.need, `${Math.min(st.study.v, st.study.need)} / ${st.study.need} 分`)}
      ${row('life', '🏝', `島上的事 ${st.life.need} 件`, '任選：釣魚、捉蟲、挖化石、潮池、委託、捐贈、送禮、澆花、撿貝殼、做家具、拍照', st.life.v, st.life.need, `${Math.min(st.life.v, st.life.need)} / ${st.life.need}`)}
      ${st.extra.rest ? `<div class="td-task opt done"><i>🌙</i><span><b>${st.extra.name}</b><small>最後幾天，睡飽比多寫一份考卷更有用</small></span><code></code></div>` : row('extra', '✨', `加碼（可選）：${st.extra.name}`, st.extra.all ? '三項加碼都完成了！' : '想多練一點再做；不做也算完成今天', st.extra.v, st.extra.need, `${st.extra.v} / ${st.extra.need}`, true)}
    </div>
    ${weekHtml()}
    ${pinHtml()}
    ${borrowHtml()}
    <div class="rt-quiet">${route.quiet() ? `<span>🌿 ${route.quietWhy()}：島民不會主動找你出題</span>` : '<span>想安靜逛逛的話：</span>'}<button type="button" class="btn ghost rt-walk">${st.walk ? '結束散步模式' : st.shut ? '回到學習模式' : '🌿 散步模式'}</button></div>
    <div class="rv-slot"></div>
    <ul class="rt-stat"><li>錯題本 <b>${mis}</b> 題</li><li>到期單字 <b>${vd}</b> 個</li><li>連續學習 <b>${L.streakAlive()}</b> 天</li></ul>
    ${events.active().length ? `<p class="ev-now">🎉 今日活動：${events.active().map(e => events.NAMES[e]).join('、')}</p>` : ''}
    <p class="muted">島民出題、釣魚、捉蟲、鑑定化石也會優先拿複習題。複習題很多時不用一次補完，做完今天的份就好。</p>
    <div class="td-acts"><button type="button" class="btn" data-h="daily">每日潮汐</button><button type="button" class="btn" data-h="vocab">單字燈塔</button><button type="button" class="btn" data-h="track">考科航線</button><button type="button" class="btn" data-h="free">自由練習</button></div>`);
  body.querySelector('.rv-slot').replaceWith(reviewCard());
  body.querySelectorAll('[data-len]').forEach(b => { b.onclick = () => { route.setLen(+b.dataset.len); Audio.sfx('tick'); paintHud(); phoneToday(); }; });
  body.querySelector('.td-chest').onclick = () => {
    if (st.ready) { S0.daily.chest = true; L.gain(60, 50); L.checkAch(); TA.Store.save(); Audio.sfx('catch'); ui.toast('🎁 今日路線完成！+60 經驗、+50 潮晶'); daySummary(); return; }
    if (st.chest) daySummary();
  };
  { const w = body.querySelector('.rt-wk'); if (w) w.onclick = () => lab.openBook(tutors()); }
  body.querySelectorAll('[data-bw]').forEach(b => { b.onclick = () => borrowAct(b.dataset.bw); });
  body.querySelectorAll('[data-pin]').forEach(b => { b.onclick = () => { pinSet(b.dataset.pin); phoneToday(); }; });
  body.querySelector('.rt-walk').onclick = () => { if (st.walk) route.setWalk(false); else if (st.shut) route.shut(false); else route.setWalk(true); Audio.sfx('tick'); paintHud(); phoneToday(); };
  body.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => ({ study: () => (st.study.cram ? cram.open(paintHud) : voyage.openDaily()), life: () => { ui.closePanel(); ui.toast('島上的事任選一件：釣魚、捉蟲、挖化石、接委託、捐贈、送禮、澆花……'); }, extra: () => ({ daily: () => voyage.openDaily(), vocab: () => lexicon.flash(S0.vocLv || 0), focus: () => { ui.closePanel(); focus.open(paintHud); } })[st.extra.id]() })[b.dataset.t](); });
  body.querySelectorAll('[data-h]').forEach(b => { b.onclick = () => { ui.setBack(phoneToday, '今日學習'); ({ daily: () => voyage.openDaily(), vocab: () => lexicon.open(), track: phoneTrack, free: phoneFree })[b.dataset.h](); }; });
  ui.panel('今日學習', body, { cls: 'phone' });
}
const tutors = () => villagers.filter(v => !v.shop && !v.guest);
/** 本週計畫（lab.js）：今日學習裡的一行；還沒有導師願意聊研究時不顯示 */
function weekHtml() {
  if (!tutors().some(v => lab.available(v))) return '';
  const w = lab.weekLine(tutors()), sm = lab.weekSmall(tutors());
  { const t = lab.claimSmall(tutors()); if (t) setTimeout(() => ui.toast(t), 300); }   // v8.5 本週小成果
  const small = sm ? `<small class="rt-small">本週小成果：練 ${sm.need} 道${ui.esc((TA.subject(sm.v.sid) || {}).name || '')}題 ${sm.done ? '✔' : `${sm.n}/${sm.need}`}</small>` : '';
  return small + `<button type="button" class="rt-wk">${w ? `📌 本週計畫：${ui.esc(w.v.name)}「${ui.esc(w.title)}」第 ${w.stage} 階段${w.done ? ' ✔ 這週推進了' : w.ready ? `<b>可以推進了！找${ui.esc(w.v.name)}聊天</b>` : `<small>還差：${ui.esc(w.left.join('、'))}</small>`}` : '📌 選一個本週計畫：一次追蹤一位導師的研究，做完一個階段就是小島的永久成果'}</button>`;
}
/** 鈴錢帳本（ledger.js）：最近 7 天的收入與支出，依來源分 */
function openLedger() {
  const rows = ledger.sum(7), inc = rows.reduce((a, r) => a + r[1], 0), out = rows.reduce((a, r) => a + r[2], 0);
  const body = ui.el('div', 'ph-list ledger', `<p class="muted">最近 7 天：收入 <b>${inc.toLocaleString()}</b> · 支出 <b>${out.toLocaleString()}</b> 鈴錢（從 v7.1 開始記錄）</p>` +
    (rows.length ? rows.map(([k, a, b]) => `<div class="ph-row"><div><b>${ui.esc(ledger.NAMES[k] || k)}</b><small>${a ? `+${a.toLocaleString()}` : ''}${a && b ? ' · ' : ''}${b ? `−${b.toLocaleString()}` : ''}</small></div><i class="lg-bar" style="--k:${Math.max(a, b) / Math.max(1, ...rows.map(r => Math.max(r[1], r[2])))};--c:${a >= b ? '#2fb38f' : '#e0875a'}"></i></div>`).join('') : '<p class="muted">還沒有紀錄。</p>') +
    '<p class="muted">各種玩法的收入應該差不多：一起練習、委託、賣東西都是穩定的來源；連續挑戰的回報主要是紀錄與獎品。</p>');
  ui.panel('鈴錢帳本', body, { cls: 'phone' });
}
/** 收工摘要：今天學了什麼、島上做了什麼；選「收工」就進入自由時間 */
function daySummary() {
  const st = route.state(), body = ui.el('div', 'wb', route.summary() + `<div class="td-acts">${st.shut ? '<button type="button" class="btn" data-s="back">回到學習模式</button>' : '<button type="button" class="btn gold" data-s="shut">收工，自由時間</button><button type="button" class="btn" data-s="more">還想再學一點</button>'}</div>`);
  body.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { const k = b.dataset.s; if (k === 'shut') { route.shut(); ui.toast('🌿 自由時間：島民不會主動找你出題'); } if (k === 'back') route.shut(false); paintHud(); ui.closePanel(); }; });
  ui.panel('今天的收工摘要', body, { cls: 'phone' });
}
/** 每天第一次進島：問今天大概有多少時間（預設上次的選擇）；選好之後任務欄只列今天的路線 */
async function routeAsk() {
  if (route.asked() || !guide.finished()) return;
  const n0 = route.len(), opts = route.LENS.map(n => `${n} 分鐘${n === 20 ? '：複習一小段、逛一下島' : n === 40 ? '：學習加上島上生活' : '：專注讀書加複習'}`);
  const i = await ui.ask({ name: '今日路線', color: '#5ab0e0', voice: 520 }, (L.phase() === 'final' ? '考前一週了：建議選 20 分鐘，做完考前衝刺的 5 題就休息。' : '') + '今天大概有多少時間？選好之後，左上角只列今天要做的兩件事（隨時可以在手機「今日學習」改）。', opts, { keys: true, hl: route.LENS.indexOf(n0) });
  ui.closeDialog();
  route.setLen(route.LENS[i] || n0); paintHud();
}
function phoneMap() {
  if (elsewhere()) { ui.toast('在這裡看不到潮汐小島的地圖'); return; }
  const cv = document.createElement('canvas'); cv.className = 'ph-map';
  // 有小地圖的插畫底圖就用它，標上化石、島民與自己
  if (minimap.drawFull(cv, (P, c) => {
    S().spots.filter(o => !o.dug).forEach(o => { const [x, y] = P(o.x, o.z); c.fillStyle = '#6b4a2e'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillText('★', x, y + 7); });
    const dot = (x0, z0, cl, r) => { const [x, y] = P(x0, z0); c.fillStyle = cl; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.stroke(); };
    villagers.forEach(v => dot(v.mesh.position.x, v.mesh.position.z, v.color, 7));
    dot(player.position.x, player.position.z, '#ff7a5a', 10);
  })) { const body = ui.el('div'); body.appendChild(cv); body.appendChild(ui.el('p', 'muted', '★ 是今天的化石位置（每天換）・橘色大圓點是你')); ui.panel('地圖', body, { cls: 'phone' }); return; }
  cv.width = N * 4; cv.height = N * 4; const c = cv.getContext('2d');
  const col = { '-1': '#4cc9d8', 0: '#f6e7b8', 1: '#84cf5c', 2: '#6fbd4f', 3: '#6fe0e6', 4: '#c9a87a', 5: '#5aa846', 6: '#6fe0e6', 7: '#c9a87a' };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { c.fillStyle = isBridge(x, z) ? '#c99a62' : col[T(x, z)]; c.fillRect(x * 4, z * 4, 5, 5); }
  homes.forEach(h => { c.fillStyle = '#ef6f5e'; c.fillRect((h.x + C) * 4 - 6, (h.z + C) * 4 - 6, 12, 12); });
  const dot = (x, z, cl, r) => { c.fillStyle = cl; c.beginPath(); c.arc((x + C) * 4, (z + C) * 4, r, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); };
  villagers.forEach(v => dot(v.mesh.position.x, v.mesh.position.z, v.color, 6));
  S().spots.filter(o => !o.dug).forEach(o => { c.fillStyle = '#6b4a2e'; c.font = 'bold 16px sans-serif'; c.fillText('★', (o.x + C) * 4 - 6, (o.z + C) * 4 + 6); });
  dot(player.position.x, player.position.z, '#ff7a5a', 8);
  const body = ui.el('div'); body.appendChild(cv); body.appendChild(ui.el('p', 'muted', '★ 是今天的化石位置（每天換）'));
  ui.panel('地圖', body, { cls: 'phone' });
}
function phoneTime() {
  const body = ui.el('div', 'ph-set', `<label>預覽時間（拖曳看日夜的天色與光線）<input type="range" min="0" max="24" step="0.25" value="${hourOverride ?? nowHour()}"></label><p class="muted">這只是預覽畫面：魚、蟲的出沒、島民作息與活動都照現實時間。想補看不到的生物，可以找史遙做「標本研究」。</p>`);
  body.querySelector('input').oninput = e => { hourOverride = +e.target.value; paintHud(); };
  const r = ui.el('button', 'btn', '回到現實時間'); r.type = 'button'; r.onclick = () => { hourOverride = null; paintHud(); ui.closePanel(); }; body.appendChild(r);
  ui.panel('時間', body, { cls: 'phone' });
}

/* ---------- HUD ---------- */
const TOOLS = [['rod', '釣竿'], ['net', '捕蟲網'], ['shovel', '鏟子'], ['can', '澆水壺']];
function paintTools() {
  const box = $('tools'); box.innerHTML = '';
  TOOLS.forEach(([id, n], i) => { const b = ui.el('button', 'tool' + (player.userData.tool === id ? ' on' : ''), `<img src="${icon(id, id)}" alt=""><kbd>${i + 1}</kbd>`); b.type = 'button'; b.title = n; b.setAttribute('aria-label', `${n}（${i + 1}）`); b.onclick = () => equip(id); box.appendChild(b); });
}
function equip(id) { const t = player.userData.tool === id ? null : id; life.cancel(); setTool(player, t); S().tool = t; save(); paintTools(); Audio.sfx('pop'); if (t) ui.toast(`拿出${TOOLS.find(x => x[0] === t)[1]}：按 E 使用`); }
/** HUD 數字：往目標值跳上去（0.4 秒）並彈一下；變少直接換 */
function countUp(el, v) {
  const old = +(el.dataset.v ?? v); el.dataset.v = v;
  if (v <= old || !started) { el.textContent = v.toLocaleString(); return; }
  const t0 = performance.now(); bump(el.parentElement || el);
  const step = () => { const k = Math.min(1, (performance.now() - t0) / 400), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(old + (v - old) * e).toLocaleString(); if (k < 1 && el.dataset.v == v) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const bump = el => { if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
function paintHud() {
  guide.paint();
  { const free = S().pockets.filter(x => !x).length, b = $('pocketBtn'); b.classList.toggle('full', free <= 2); b.title = `口袋 (I)${free <= 2 ? ` · 只剩 ${free} 格` : ''}`; }   // 口袋快滿：背包按鈕變橘色
  const d = new Date(), h = hourOverride ?? nowHour(), hh = Math.floor(h), mm = Math.floor((h % 1) * 60);
  $('hm').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('date').textContent = `${d.getMonth() + 1}月${d.getDate()}日（${'日一二三四五六'[d.getDay()]}）${tide.icon2(simDate())}${cooking.hudText() ? ' · ' + cooking.hudText() : ''}`;
  $('wx').textContent = weather.icon() || (h >= 6 && h < 18.5 ? '☀' : '🌙');
  const exam = Math.round((new Date(TA.S.profile.examDate || '2027-01-22') - new Date(dayKey())) / 864e5);
  $('exam').textContent = exam > 0 ? `學測 D-${exam}` : exam >= -2 ? '學測加油！' : '學測辛苦了'; $('exam').classList.toggle('cram', exam >= -2 && exam <= 30);
  const q = L.effort(L.dayRec()), goal = TA.S.profile.dailyGoal || 30, sk = L.streakAlive();   // 非選題折算的題數也算
  const rd = started && route.state().done;   // v8.2 今日路線走完：右上也說完成了（自訂題數是可選的），不會一邊說可以收工、一邊還差一半
  $('goal').textContent = rd && q < goal ? `✔ 今日路線 · ${q} 題${sk ? ` · 🔥${sk}` : ''}` : `今日 ${q} / ${goal}${sk ? ` · 🔥${sk}` : ''}`;
  $('goal').title = (rd && q < goal ? `今天的路線完成了，可以收工；自訂的練習目標 ${q} / ${goal} 題是可選的。` : '') + (sk ? `連續學習 ${sk} 天` : '今天答滿 10 題（或專注一輪）就開始累積連續天數'); $('goal').classList.toggle('done', q >= goal || rd);
  if (started && q >= goal && S().goalCel !== dayKey()) { S().goalCel = dayKey(); save(); celebrate('今日目標達成', `${q} 題 · 今天辛苦了！`, '#2fa88f', true); Audio.sfx('ok', { pitch: 7 }); bump($('goal')); }   // 每天第一次達標慶祝一下
  paintLv();
  const fl = feel.level(); $('feel').hidden = !fl; if (fl) $('feel').textContent = `手感 ${feel.stars(fl)}`;
  countUp($('bells'), S().bells);
  const tk = life.tourney; $('tourney').hidden = !tk; $('tourney').classList.toggle('warn', !!tk && tk.left < 10); if (tk) $('tourney').innerHTML = `<b>${CUP[tk.kind].name}</b> ⏱ ${Math.floor(tk.left / 60)}:${String(Math.floor(tk.left % 60)).padStart(2, '0')} · ${tk.score} 分 · ${tk.n} 隻`;
  const hw = events.active().includes('halloween');
  villagers.forEach(v => { v.tag && v.tag.classList.toggle('req', !!(!v.shop && social.badge(v))); if (v.mesh.userData.partyHat) v.mesh.userData.partyHat.visible = gifts.isBirthday(v); if (v.costume !== hw) { v.costume = hw; wardrobe.setHat(v.mesh, hw ? 'witch' : null); } });
  planner.check(paintHud);
  const un = social.unread(); flag.visible = un > 0; $('phoneBtn').dataset.n = un || ''; 
}

/** 等級膠囊與潮晶（答題、升級、買護符時也會更新） */
function paintLv() {
  const S = TA.S, lv = L.levelOf(S.xp), b = $('lv'), g = $('gems');
  if (b) { b.innerHTML = `Lv.${lv.lv} <small>${lv.title}</small>`; b.style.setProperty('--k', (lv.cur / lv.need).toFixed(3)); b.title = `${lv.title} · 再 ${lv.need - lv.cur} 經驗升級（點一下打開我的檔案）`; }
  if (g) g.textContent = S.gems.toLocaleString();
}
const openProfile = () => profile.open({ ach: phoneAch, paint: paintHud });

/* ---------- 輸入 ---------- */
const keys = {};
addEventListener('keydown', e => {
  if (e.repeat && (e.code === 'Space' || e.code === 'KeyE')) return;
  keys[e.code] = true;
  if (!started) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (ui.keyHook && ui.panelOpen() && !ui.cardOpen() && !ui.dialogOpen() && ui.keyHook(e)) return;
  { const tg = e.target, typing = !!tg && (/^(TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable || tg.tagName === 'INPUT' && !/^(range|checkbox|radio|button|submit|file|color)$/.test(tg.type));
    if (typing && e.code === 'Tab' && !e.isComposing && ui.panelOpen()) { panelTab(e); return; }   // v8.6 文字區也在面板的焦點循環裡
    if (typing && (e.isComposing || e.keyCode === 229 || e.code !== 'Escape')) return; }   // v8.2 在輸入框打字（含注音組字：ㄛ在 I、ㄑ在 F）：按鍵交給輸入框，不會關掉面板；Esc 照常關閉
  if (focus.active() && !ui.cardOpen() && !ui.dialogOpen()) return;
  if (ui.panelOpen() && ui.dialogOpen() && !ui.cardOpen()) { if (e.code === 'Escape' || e.code === 'Tab') { e.preventDefault(); ui.requestClose(); } return; }   // 對話上面開著面板（例如解析時打開的示意圖）：按鍵給面板，不推進底下的對話
  if (ui.cardOpen() || ui.dialogOpen()) { if (ui.dialogKey(e)) { e.preventDefault(); return; } if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); ui.advance(); } return; }
  if (astro.isOpen() && !ui.panelOpen()) { astro.key(e); return; }
  if (photo.active() && !ui.panelOpen()) { photo.key(e); return; }
  if (dreamisle.inside && !ui.panelOpen() && dreamisle.key(e)) return;
  if (elsewhere() && ['KeyG', 'KeyP', 'KeyF'].includes(e.code) && !(house.inside && e.code === 'KeyF')) return;
  if (ui.panelOpen()) {
    const box = $('panelBox'), home = box.classList.contains('phone-home'), fresh = document.activeElement === box || !box.contains(document.activeElement);
    if (e.code === 'Tab' && !(home && fresh)) { panelTab(e); return; }   // v8.6 每個面板都一樣：Tab 在按鈕之間移動（以前手機裡的 App 按 Tab 會整個關掉）；只有剛打開的手機主畫面按 Tab 是收起手機
    if (home && /^Arrow(Up|Down|Left|Right)$/.test(e.code)) { panelTab(e, e.code === 'ArrowUp' || e.code === 'ArrowLeft'); return; }   // 手機主畫面：方向鍵在 App 之間移動
    if (e.code === 'Escape' || e.code === 'Tab' || e.code === 'KeyI' || e.code === 'KeyF') { e.preventDefault(); ui.requestClose(); } return;
  }
  if (room.inside && room.key(e)) return;
  if (design.active()) { if (e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); design.act(); return; } if (e.code === 'Escape' || e.code === 'KeyQ' || e.code === 'KeyG') { design.stop(); return; } }
  if (!room.inside && e.code === 'KeyG') { design.open(player, paintHud); return; }
  if (room.inside && e.code === 'KeyF') { room.openDecor(); return; }
  if (house.inside && houseSid === 'player' && e.code === 'KeyF') { houseDecor(); return; }   // v8.2 自己家（整棟室內）按 F 也是裝潢；第一人稱用滾輪拉近或兩指張開
  if (e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); act(); }   // E 互動、空白鍵跳躍（J 也能跳）
  else if (e.code === 'Space') { e.preventDefault(); doJump(); }
  else if (e.code === 'Tab') { e.preventDefault(); phone(); }
  else if (e.code === 'KeyJ') { if (!e.repeat) doJump(); }
  else if (e.code === 'KeyI') openPockets();
  else if (e.code === 'KeyV' && !room.inside && !elsewhere()) toggleScenic();
  else if (e.code === 'KeyF' && !room.inside && (!elsewhere() || house.inside)) setFp(!fpOn);
  else if (e.code === 'Home' && !room.inside && !elsewhere()) { zoom = 1; camYaw = 0; camV.tilt = 0; fpOn = false; saveCam(); ui.toast('回到預設視角'); }
  else if (e.code === 'KeyP' && !design.active() && !room.placing()) { life.cancel(); photo.toggle(room.inside); }
  else if (/^Digit[1-4]$/.test(e.code)) equip(TOOLS[+e.code.slice(5) - 1][0]);
  else if (e.code === 'Digit0' || e.code === 'KeyQ') { if (player.userData.tool) equip(player.userData.tool); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
let nearV = null, moveTo = null, wasAway = false, pendingMove = false;   // pendingMove：過了午夜，回到島上時套用搬家   // wasAway：上一格在室內或離島（進出時清掉點地面走路的目標）
let entering = false;
/** v8.2 進門：先收圈，黑幕真的畫出來之後才建室內——第一次進館的建立與編譯停頓藏在黑幕後面，不會卡在門口像沒反應 */
function viaDoor(fn) {
  if (entering) return; entering = true; life.cancel(); moveTo = null;
  ui.closeIris().then(lift => {
    try { fn(); } catch (e) { console.warn('進門失敗', e); }
    finally { if (document.querySelectorAll('.ac-iris').length < 2) ui.iris(300); lift(); entering = false; }   // 沒有進門（門鎖著）：自己打開圈
  });
}
function act() {
  if (entering) return;
  if (jump.air && !talking && !life.busy) { inBuf.act = performance.now(); return; }   // 空中不能互動（進門、釣魚等）：先記著，落地後 0.15 秒內補做
  if (talking || life.busy || astro.isOpen() || jump.air) return;
  if (sitting) { standUp(); return; }
  if (design.active()) { design.act(); return; }
  if (museum.inside) { const mh = museum.handler(); if (mh) { talking = { name: 'museum' }; Promise.resolve(mh()).finally(() => { talking = null; ui.closeDialog(); }); } return; }
  if (shopin.inside) { const sh = shopin.handler(); if (sh) Promise.resolve(sh()).finally(() => paintHud()); return; }
  if (yuehome.inside) { const yh = yuehome.handler(); if (yh) Promise.resolve(yh()).finally(() => paintHud()); return; }
  if (house.inside) {
    const z = house.zone(); if (!z) return;
    if (z.kind === 'host') { const hv = house.hostNow(); if (hv.isLib) libTalk(); else talk(hv); return; }
    if (z.kind === 'guest') { talk(z.v); return; }   // v8.3 來館裡的島民
    if (z.kind === 'furn') { talking = { name: 'house' }; room.itemMenu(z.item).finally(() => { talking = null; ui.closeDialog(); house.refreshDecor(room.ownDecor()); paintHud(); }); return; }   // 自己家的家具：轉向、收起、床可以睡覺
    if (z.kind === 'hook:decor') { houseDecor(); return; }
    const fn = z.kind.startsWith('hook:') ? HOUSE_HOOKS[z.kind.slice(5)] : null, mine = houseSid === 'player';   // 玩家家：來作客的島民不會替你介紹你家的東西
    if (fn) { Promise.resolve(fn(z.topic)).finally(() => paintHud()); return; }   // 岳家的圖鑑、湯、筆記自己管理對話狀態（湯會自己設 talking）
    talking = { name: 'house' }; spotAct(z, mine ? null : house.hostNow(), mine ? null : houseSid).finally(() => { talking = null; ui.closeDialog(); paintHud(); }); return;
  }
  if (dreamisle.inside) { const dh = dreamisle.handler(); if (dh) { talking = { name: 'dreamisle' }; Promise.resolve(dh()).finally(() => { talking = null; }); } return; }
  if (trip.inside) { const th = trip.tripHandler(); if (th) { talking = { name: 'trip' }; Promise.resolve(th()).finally(() => { talking = null; ui.closeDialog(); paintHud(); }); } return; }
  if (room.inside) {
    const host = roomHost;
    if (host && Math.hypot(host.mesh.position.x - player.position.x, host.mesh.position.z - player.position.z) < 1.8) { if (host.isLib) libTalk(); else if (host.isHotel) hotelTalk(host); else talk(host); return; }
    const it = room.facingItem(); if (it) { talking = { name: 'room' }; room.itemMenu(it).finally(() => { talking = null; }); } return;
  }
  if (nearDoor) {
    const d = nearDoor;
    if (d.kind === 'mill') { millTalk(); return; } if (d.kind === 'board') { boardMenu(); return; } if (d.kind === 'stars') { stargaze(); return; } if (d.kind === 'diy') { benchMenu(); return; }
    const go = { mine: () => enterHome(), home: () => visit(d.v), library: () => enterLibrary(), museum: () => enterMuseum(), hotel: () => hotel.enterLobby(),
      shop: () => { if (shopV) { town.interrupt(shopV); if (shopV.sitting) standVillager(shopV); shopV.sitGoal = null; } shopin.enter(); } }[d.kind];
    if (go) viaDoor(go); else building(d.kind);
    return;
  }
  if (nearMail) { social.openMail(); return; }
  if (nearV) { talk(nearV); return; }
  { const st = nearSeat(); if (st) { sitDown(st); return; } }
  const dk = trip.handler();
  if (dk) { talking = { name: 'boat' }; Promise.resolve(dk()).finally(() => { talking = null; ui.closeDialog(); paintHud(); }); return; }
  const tb = tablets.handler();
  if (tb) { talking = { name: 'tablet' }; Promise.resolve(tb()).finally(() => { talking = null; ui.closeDialog(); paintHud(); }); return; }
  const bh = balloon.handler();
  if (bh) { talking = { name: 'balloon' }; Promise.resolve(bh()).finally(() => { talking = null; ui.closeDialog(); paintHud(); }); return; }
  const sh = spirit.handler();
  if (sh) { talking = { name: 'spirit' }; Promise.resolve(sh()).finally(() => { talking = null; ui.closeDialog(); paintHud(); }); return; }
  const hh = highland.handler() || hotel.handler();
  if (hh) { talking = { name: 'ladder' }; Promise.resolve(hh()).finally(() => { talking = null; }); return; }
  const wh = winter.handler();
  if (wh) { talking = { name: 'snowman' }; Promise.resolve(wh()).finally(() => { talking = null; ui.closeDialog(); paintHud(); }); return; }
  const gh = garden.handler(player.userData.tool, player.userData.tool === 'shovel' && life.spotAhead());
  const dh = !gh && (diy.handler(player.userData.tool) || tide.handler(player.userData.tool));
  if (gh || dh) { talking = { name: 'garden' }; Promise.resolve((gh || dh)()).finally(() => { talking = null; ui.closeDialog(); paintHud(); }); return; }
  life.action(player.userData.tool);
}
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
$('cv').addEventListener('pointerdown', e => {
  if (!started) return;
  if (e.pointerType !== 'mouse' && touchDown(e)) return;   // 觸控：左邊的隱藏式搖桿、兩指縮放
  canvasDown(e, false);
});
/** 按下畫面。tap：在搖桿區域裡只是點一下（放開時才補做）——直接當成點擊，不開始拖曳轉視角 */
function canvasDown(e, tap) {
  if (house.inside) {   // 整棟室內：和島上一樣右鍵拖曳轉鏡頭、第一人稱拖曳轉頭、觸控點地板走過去
    if (ui.cardOpen() || ui.dialogOpen()) { ui.tapAdvance(); return; }
    if (e.button === 1 || e.button === 2) { camDrag = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
    if (e.button === 0 && (fpView() || e.pointerType !== 'mouse')) fpDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false };
    return;
  }
  if ((e.button === 1 || e.button === 2) && !room.inside && !elsewhere() && !photo.active()) { camDrag = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
  if (shopin.inside) { if (ui.cardOpen() || ui.dialogOpen()) ui.tapAdvance(); else { const p = shopin.pointerDown(e); if (p && e.pointerType !== 'mouse') moveTo = { x: p.x, z: p.z }; } return; }   // 觸控點地面走過去（室內）
  if (yuehome.inside) { if (ui.cardOpen() || ui.dialogOpen()) ui.tapAdvance(); else if (!ui.panelOpen()) { const p = yuehome.pointerDown(e); if (p && e.pointerType !== 'mouse') moveTo = { x: p.x, z: p.z }; } return; }
  if (elsewhere()) { if (ui.cardOpen() || ui.dialogOpen()) ui.tapAdvance(); return; }
  if (photo.pointerDown(e)) return;
  if (ui.cardOpen() || ui.dialogOpen()) { ui.tapAdvance(); return; }   // 點島上：出了選項時不會替你作答
  if (room.inside) { const p = room.pointerDown(e); if (p && e.pointerType !== 'mouse') moveTo = { x: p.x, z: p.z }; return; }   // 滑鼠點擊不走路（觸控點一下仍會走過去）
  if (design.active() && design.pointer(e)) return;
  if (tap) { tapAt(e.clientX, e.clientY); return; }
  if (e.button === 0 && (fpView() || (e.pointerType !== 'mouse' && !photo.active()))) { fpDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false }; return; }   // 第一人稱與觸控：按下先不走，看是拖曳轉視角還是點一下（滑鼠在第三人稱點擊不走路，用鍵盤移動、右鍵拖曳轉視角）
}
/** 觸控點畫面：點到島民就走過去聊天，點到地面就走過去 */
function tapAt(cx, cy) {
  if (house.inside) { const p = house.pick(cx, cy); if (p) moveTo = { x: p.x, z: p.z }; return; }
  mouse.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(villagers.map(v => v.mesh), true);
  if (hits.length) { const v = villagers.find(v => isChild(v.mesh, hits[0].object)); if (v) { moveTo = { x: v.mesh.position.x, z: v.mesh.position.z, talk: v }; return; } }
  const hit = ray.intersectObject(terrain)[0]; if (hit) moveTo = { x: hit.point.x, z: hit.point.z };
}
addEventListener('pointermove', e => photo.pointerMove(e)); addEventListener('pointerup', () => photo.pointerUp());
$('actBtn').addEventListener('click', e => { e.stopPropagation(); if (ui.cardOpen() || ui.dialogOpen()) ui.tapAdvance(); else act(); });
$('jumpBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); doJump(); });
const isChild = (root, o) => { while (o) { if (o === root) return true; o = o.parent; } return false; };
$('phoneBtn').onclick = () => { if (talking || ui.dialogOpen() || ui.cardOpen() || focus.active() || astro.isOpen()) return; phone(); };
/* ---------- 觸控：隱藏式搖桿、兩指縮放、擺放工具列 ----------
   左手：畫面左邊（上方的時鐘與引導以下、寬度約 45%）任何地方按下去，搖桿就出現在拇指下面，拖曳就走，放開就收起來。
   輕推慢走、推到圓盤邊緣是一般走路；拇指再往外拖到約兩個半徑才奔跑（v6.84.1：以前推到邊緣就跑，手指一滑就爆衝）。
   拇指拖得很遠時搖桿跟著移過去，不會卡住。在那裡只是點一下（沒有拖動、很快放開）仍然是點擊：走過去、點島民聊天。
   右手：拖曳轉視角、點一下走過去。兩根手指幾乎同時按下是縮放（第一人稱捏合回到一般鏡頭）；搖桿那根手指不算在縮放裡 */
const joy = { x: 0, y: 0, run: false, id: null };
const coarse = matchMedia('(pointer: coarse)');   // 觸控裝置：提示不提鍵盤
let touchDown = () => false;
{
  const el = $('joy'), knob = $('joyKnob'), R = 46, J = { cx: 0, cy: 0, px: 0, py: 0, t0: 0, moved: false, e0: null };
  const zone = (x, y) => x < innerWidth * 0.45 && y > innerHeight * 0.18;
  const place = () => { el.style.left = J.cx + 'px'; el.style.top = J.cy + 'px'; };
  const set = (x, y) => {
    let dx = x - J.cx, dy = y - J.cy, d = Math.hypot(dx, dy);
    if (d > R * 2.8) { J.cx += dx / d * (d - R * 2.8); J.cy += dy / d * (d - R * 2.8); dx = x - J.cx; dy = y - J.cy; d = R * 2.8; place(); }   // 拇指拖得很遠：搖桿跟過去
    const nx = d ? dx / d : 0, ny = d ? dy / d : 0, m = THREE.MathUtils.clamp((d / R - 0.15) / 0.7, 0, 1), k = Math.min(1, d / R);   // m：走多快（中心一小圈不動，推到 85% 是一般走路）
    joy.run = d > R * (joy.run ? 1.6 : 2.1);   // 拖到約兩個半徑外才跑（放回來一點才停跑，不會在邊界上忽跑忽走）
    joy.x = nx * m; joy.y = ny * m; el.classList.toggle('run', joy.run); knob.style.transform = `translate(${nx * k * R}px, ${ny * k * R}px)`;
  };
  const release = () => { joy.id = null; joy.x = joy.y = 0; joy.run = false; knob.style.transform = ''; el.classList.remove('on', 'run'); };
  const pts = new Map();   // 畫面上搖桿以外的手指：pointerId → [x, y]（轉視角、兩指縮放）
  let pinch = 0, pinchFp = 0;   // pinchFp：拉到最近時兩指的距離，再張開三成就進入第一人稱
  const startPinch = () => { const [p, q] = [...pts.values()]; pinch = Math.hypot(p[0] - q[0], p[1] - q[1]); pinchFp = 0; fpDrag = null; };
  touchDown = e => {
    const now = performance.now();
    if (joy.id !== null && !J.moved && now - J.t0 < 250) {   // 兩根手指幾乎同時按下：是縮放，不是搖桿
      pts.set(joy.id, [J.px, J.py]); release(); pts.set(e.pointerId, [e.clientX, e.clientY]); startPinch(); return true;
    }
    if (joy.id === null && zone(e.clientX, e.clientY) && !ui.cardOpen() && !ui.dialogOpen() && !photo.active() && !(room.inside && room.placing())) {
      joy.id = e.pointerId; J.cx = J.px = e.clientX; J.cy = J.py = e.clientY; J.t0 = now; J.moved = false; J.e0 = e;
      joy.x = joy.y = 0; joy.run = false; knob.style.transform = ''; place(); el.classList.add('on', 'used'); return true;
    }
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { startPinch(); return true; }
    return pts.size > 2;
  };
  addEventListener('pointermove', e => {
    if (e.pointerId === joy.id) {
      J.px = e.clientX; J.py = e.clientY;
      if (!J.moved && Math.hypot(e.clientX - J.cx, e.clientY - J.cy) > 10) { J.moved = true; moveTo = null; }   // 拖動超過 10 像素才開始走（點一下不會抖一步）
      if (J.moved) set(e.clientX, e.clientY);
      return;
    }
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size !== 2 || !pinch) return;
    const [p, q] = [...pts.values()], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    const out = !room.inside && !elsewhere() && !photo.active() && !design.active();
    if (out && fpOn) { if (d < pinch * 0.75) { setFp(false); pinch = d; } return; }   // 第一人稱：兩指捏合回到一般鏡頭
    const z = zoom * pinch / d;
    if (out && z < 0.55) { pinchFp = pinchFp || d; if (d > pinchFp * 1.3) { setFp(true); pinchFp = 0; } } else pinchFp = 0;
    zoom = THREE.MathUtils.clamp(z, 0.55, 1.6); pinch = d;
  });
  const up = e => {
    if (e.pointerId === joy.id) {
      const tap = e.type === 'pointerup' && !J.moved && performance.now() - J.t0 < 400, e0 = J.e0;
      release(); J.e0 = null; if (tap && started) canvasDown(e0, true);   // 只是點一下：照一般的點擊處理
      return;
    }
    if (pts.delete(e.pointerId) && pts.size < 2) pinch = 0;
  };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  $('cv').addEventListener('contextmenu', e => e.preventDefault());
  // 擺放工具列
  $('pbRotate').onclick = e => { e.stopPropagation(); room.key({ code: 'KeyR', preventDefault() {} }); };
  $('pbCancel').onclick = e => { e.stopPropagation(); if (design.active()) design.stop(); else room.key({ code: 'Escape', preventDefault() {} }); };
}
$('cv').addEventListener('pointermove', e => { if (room.inside) room.pointerMove(e); });
$('decorBtn').onclick = () => { if (room.inside) room.openDecor(); else if (house.inside && houseSid === 'player') houseDecor(); };
$('designBtn').onclick = () => { if (design.active()) design.stop(); else design.open(player, paintHud); };
$('pocketBtn').onclick = () => openPockets();
$('panel').addEventListener('pointerdown', e => { if (e.target.id === 'panel') ui.requestClose(); });   // 點面板外面：有離開確認的（模擬考）先問

/* ---------- 移動 ---------- */
/* ---------- 高度：物件頂端、腳下的地板、水面 ---------- */
const topRay = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0), rayFrom = new THREE.Vector3();
/** 碰撞物件的頂端高度：第一次用到時從正上方往下打射線量出來並記住 */
function colTop(c) {
  if (c.top != null) return c.top;
  const x = c.r ? c.x : (c.x0 + c.x1) / 2, z = c.r ? c.z : (c.z0 + c.z1) / 2;
  topRay.set(rayFrom.set(x, 40, z), DOWN); topRay.far = 60; topRay.camera = camera;   // Sprite 的射線檢測需要攝影機
  let top = groundAt(x, z) + 1;
  for (const h of topRay.intersectObjects(scene.children, true)) {
    if (!h.object.isMesh || h.point.y > 30 || !h.object.visible) continue;
    let o = h.object, ch = false; while (o) { if (o.userData && o.userData.walk !== undefined) { ch = true; break; } o = o.parent; }
    if (ch) continue;   // 略過角色
    top = h.point.y; break;
  }
  return (c.top = Math.max(top, groundAt(x, z) + 0.6));   // 射線沒打到物件（細桿等）時至少當成 0.6 高
}
const isWater = (x, z) => { const [tx, tz] = tileOf(x, z), t = T(tx, tz); return !onPier(x, z) && !isBridge(tx, tz) && !isFord(tx, tz) && (t < 0 || t === 3 || t === 6); };
const waterY = (x, z) => fwY(x, z) ?? seaMesh.position.y;
/** 腳下可以站的高度：地面（或水面），以及腳下、不高於 feet + 0.35 的物件頂端（石頭、屋頂…） */
function floorAt(x, z, feet) {
  let y = isWater(x, z) ? waterY(x, z) : ground(x, z);
  for (const c of colliders) {
    const over = c.r ? Math.hypot(c.x - x, c.z - z) < c.r : x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;
    if (over) { const tp = colTop(c); if (tp <= feet + 0.35 && tp > y) y = tp; }
  }
  return y;
}
const LIM = C + 3;   // 跳出島外太遠就不讓繼續往外
/** 玩家的移動判斷：依「腳的實際高度」決定能不能越過地形、水面與物件 */
function playerOK(x, z) {
  const feet = player.position.y, air = jump.air;
  if (Math.abs(x) > LIM || Math.abs(z) > LIM) return false;
  if (!air && isWater(x, z)) return false;   // 走路不能下水，跳起來才越得過
  const g = isWater(x, z) ? waterY(x, z) : ground(x, z);
  if (g > feet + (air ? 0.05 : 0.7)) return false;   // 前面的地形比腳高：在空中要更高才越得過
  { const sk = c => feet >= colTop(c) - (air ? 0 : 0.05);   // 腳比物件頂端高就越過去
    if (blocked(x, z, 0.25, sk)) {
      // 已經陷在牆角或物件邊緣裡（跳下來、被推擠）時，往外走的這一步要放行，否則四面都會被擋死
      const sp = player.position, now = penetration(sp.x, sp.z, 0.25, sk);
      if (!(now > 0 && penetration(x, z, 0.25, sk) <= now + 1e-4)) return false;   // 不再更深就放行（沿著牆滑出來也可以）
    } }
  const sp = player.position;
  for (const v of villagers) {
    if (v.away || feet > v.mesh.position.y + 1.3) continue;   // 從島民頭上跳過
    const d = Math.hypot(v.mesh.position.x - x, v.mesh.position.z - z);
    if (d < 0.55 && d < Math.hypot(v.mesh.position.x - sp.x, v.mesh.position.z - sp.z)) return false;
  }
  return true;
}
function walkable(x, z, fromY, self) {
  if (self === player && !room.inside) return playerOK(x, z);
  const [tx, tz] = tileOf(x, z), t = T(tx, tz);
  if (!onPier(x, z) && !isBridge(tx, tz) && !isFord(tx, tz) && (t < 0 || t === 3 || t === 6)) return false;
  if (Math.abs(ground(x, z) - fromY) > 0.7) return false;
  if (blocked(x, z, 0.25)) return false;
  // 角色之間的碰撞：只擋住「越走越近」的移動；已經重疊時（例如出門時剛好站在島民身上）允許往外走開
  const sp = self && self.position, hit = q => { const d = Math.hypot(q.x - x, q.z - z); return d < 0.55 && (!sp || d < Math.hypot(q.x - sp.x, q.z - sp.z)); };
  for (const v of villagers) if (v.mesh !== self && hit(v.mesh.position)) return false;
  if (self !== player && player.position.y < ground(x, z) + 1.3 && hit(player.position)) return false;
  return true;
}
function stepChar(ch, dx, dz, dt, speed) {
  const p = ch.position, y = ground(p.x, p.z), nx = p.x + dx * speed * dt, nz = p.z + dz * speed * dt;
  const ok = (x, z) => walkable(x, z, y, ch);
  if (ok(nx, nz)) { p.x = nx; p.z = nz; } else if (ok(nx, p.z)) p.x = nx; else if (ok(p.x, nz)) p.z = nz; else return false;
  return true;
}
const angLerp = (a, b, k) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;

/* ---------- 回家 ---------- */
let nearDoor = null, nearMail = false;
/* ---------- 坐下看風景：長椅、碼頭盡頭。坐一會兒，附近的島民會走過來坐在旁邊，說說話 ---------- */
let sitting = null;   // { seat, slot, t, mate, said, next }
const sitLook = new THREE.Vector3(), sitCam = new THREE.Vector3(), sitTmp = new THREE.Vector3();
const slotPos = (st, k) => { const o = k ? 0.36 : -0.36; return [st.x + Math.cos(st.ry) * o, st.z - Math.sin(st.ry) * o]; };
const seatY = st => (st.h != null ? st.h : ground(st.x, st.z) + 0.02) - 0.32;
function nearSeat() {
  if (sitting) return null; const p = player.position;
  return seats.find(st => Math.hypot(p.x - st.x, p.z - st.z) < 1.25 && Math.abs(ground(st.x, st.z) - p.y) < 0.8 && !(villagers.some(v => v.sitting && v.sitting.seat === st && v.sitting.slot === 0) && villagers.some(v => v.sitting && v.sitting.seat === st && v.sitting.slot === 1))) || null;
}
function sitDown(st) {
  const taken = villagers.find(v => v.sitting && v.sitting.seat === st);
  sitting = { seat: st, slot: taken ? 1 - taken.sitting.slot : 0, t: 0, mate: taken || null, said: 0, next: 1.5 };
  setSit(player, true); life.cancel(); moveTo = null; Audio.sfx('pop');
  if (fpOn) { const a = st.ry + Math.PI; camYaw = Math.atan2(Math.sin(a), Math.cos(a)); fpPitch = -0.1; }   // 第一人稱：坐下時面向座位前方的風景
  if (!S().sitTip) { S().sitTip = 1; save(); ui.toast('坐下來看看風景吧（移動或按 E 就會站起來）'); }
}
function standUp() {
  if (!sitting) return; const st = sitting.seat, [x, z] = slotPos(st, sitting.slot);
  setSit(player, false); const fx = Math.sin(st.ry), fz = Math.cos(st.ry);
  const ox = st.edge ? -fx * 0.6 : fx * 0.75, oz = st.edge ? -fz * 0.6 : fz * 0.75;
  player.position.set(x + ox, ground(x + ox, z + oz), z + oz);
  villagers.forEach(v => { if (v.sitting && v.sitting.seat === st) v.standAt = simT + 2.5; });
  sitting = null;
}
/* ---------- 島民自己做決定（mind.js 透過 laya 決定，這裡把決定變成走去哪裡、做什麼） ---------- */
const thinks = v => !v.shop && !v.guest && v.sid !== 'history';
let greetAnyT = -1e9;
const HOBBY = { chinese: '✍️', english: '📖', math: '📐', history: '🏺', geography: '🧭', civics: '⚖️', physics: '🔭', chemistry: '⚗️', biology: '🌱', earth: '🪨' };   // 做自己的事：各科島民的興趣   // 店長與博物館的史遙守在崗位上
const mindCtx = {
  hour: 12,
  playerDist: v => Math.hypot(player.position.x - v.mesh.position.x, player.position.z - v.mesh.position.z),
  nearby: v => villagers.filter(o => o !== v && !o.away && o.mesh.visible && Math.hypot(o.mesh.position.x - v.mesh.position.x, o.mesh.position.z - v.mesh.position.z) < 6).map(o => o.name).slice(0, 3),
  place: v => placeOf(v),
  talkedRecently: v => simT - (v.lastTalkT ?? -1e9) < 120
};
function placeOf(v) {
  const x = v.mesh.position.x, z = v.mesh.position.z;
  if (Math.hypot(x - v.home[0], z - v.home[1]) < 4) return '自己家門口';
  if (Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 6) return '廣場的大樹附近';
  if (onPier(x, z)) return '碼頭上';
  if (v.sitting) return '長椅上';
  for (let k = 0; k < 6; k++) if (waterAt(x + Math.cos(k * 1.047) * 1.5, z + Math.sin(k * 1.047) * 1.5) != null) return '水邊';
  return tileAt(x, z) === 0 ? '海邊的沙灘上' : '島上的草地';
}
const seatFree = (st, k, self) => !(sitting && sitting.seat === st && sitting.slot === k) && !villagers.some(o => o !== self && ((o.sitting && o.sitting.seat === st && o.sitting.slot === k) || (o.benchGoal && !o.away && simT < o.benchGoal.until && o.benchGoal.seat === st && o.benchGoal.slot === k)));
/** 附近找一個水邊的位置（自己在陸地上、旁邊 1.2 公尺有水） */
function waterSpot(x, z) {
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * 6.283, d = 3 + Math.random() * 9, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (waterAt(px, pz) != null || (tileAt(px, pz) === 3 && !onPier(px, pz)) || !walkable(px, pz, ground(px, pz), null)) continue;   // 踏石過溪的那幾格也算水（比看得到的踏石寬，站在邊上像站在水面上）
    for (let k = 0; k < 6; k++) if (waterAt(px + Math.cos(k * 1.047) * 1.2, pz + Math.sin(k * 1.047) * 1.2) != null) return [px, pz];
  }
  return null;
}
/* ---------- 島民主動出題（challenge.js）：每隔 3–5 分鐘挑一位附近有空的島民，頭上冒 ❓ 走過來，到了就問要不要回答 ---------- */
let popAt = 180 + Math.random() * 120;   // 下一次的時間（simT）
function popTick() {
  if (simT < popAt) return;
  if ((S().settings && S().settings.popQuiz === false) || route.quiet()) { popAt = simT + 60; return; }   // 收工、散步模式、休息時間、剛拒絕過：不主動出題
  if (talking || sitting || life.busy || life.tourney || life.fishing() || design.active() || photo.active() || astro.isOpen() || focus.active() || ui.dialogOpen() || ui.cardOpen() || ui.panelOpen() || villagers.some(v => v.popQuiz)) { popAt = simT + 15; return; }   // 玩家正在忙：過一會兒再看
  const p = player.position, c = villagers.filter(v => thinks(v) && !v.away && v.mesh.visible && !v.sitting && !v.sitGoal && !v.benchGoal && !v.chatting && !v.goPlayer && (L.BY_SUBJECT[v.sid] || []).length)
    .map(v => [v, Math.hypot(v.mesh.position.x - p.x, v.mesh.position.z - p.z)]).filter(([, d]) => d > 3 && d < 28).sort((a, b) => a[1] - b[1]);
  if (!c.length) { popAt = simT + 20; return; }   // 附近沒人：20 秒後再找
  const v = c[Math.floor(Math.random() * Math.min(3, c.length))][0];
  v.goPlayer = simT + 30; v.popQuiz = true; v.wait = 99; v.greetT = greetAnyT = simT; ui.think(v.mesh, '❓', 4000);
  popAt = simT + 180 + Math.random() * 120;
}
async function popTalk(v) {
  if (talking || life.busy || life.tourney || life.fishing() || ui.dialogOpen() || ui.cardOpen() || ui.panelOpen() || astro.isOpen() || photo.active() || focus.active() || design.active() || room.inside || elsewhere()) { greetPlayer(v); return; }   // 走到時玩家剛好在忙：打聲招呼就好
  talking = v; v.lastTalkT = simT; moveTo = null; life.cancel(); town.interrupt(v); Audio.sfx('pop'); setExpr(v.mesh, 'happy', 1.4);
  try { await ledger.run('popquiz', () => challenge.popQuiz(v)); } finally { ui.closeDialog(); talking = null; paintHud(); }
}
/** 走過來的島民對玩家說一句當下時段的問候 */
function greetPlayer(v) {
  const h = hourOverride ?? nowHour(), g = ((I.VILLAGERS || []).find(x => x.sid === v.sid) || {}).greet || {}, lines = g[h < 11 ? 'morning' : h < 17 ? 'day' : h < 20 ? 'evening' : 'night'] || [];
  if (!lines.length) return;
  ui.bubble(v.mesh, lines[Math.floor(Math.random() * lines.length)], 3600); Audio.blip(v.voice || 400); setExpr(v.mesh, 'happy', 2);
}
/** v8.6 laya 連不上（或關掉）時的本機小動作：一半的時候照天氣與時段自己決定——晴天白天多停在花旁、傍晚到水邊看夕陽、
    下雨時回家門口躲雨、晚上少去廣場；另一半照原本的作息走 */
function localPlan(v, hour) {
  if (mind.enabled() && mind.status() === true) return null;
  if (simT - (v.localAt ?? -1e9) < 20 || Math.random() > 0.5) return null;   // 同一位 20 秒內最多一次：頭上的想法泡泡不會一直冒
  v.localAt = simT;
  const rain = weather.raining(), night = hour >= 20 || hour < 5, gold = hour >= 16.5 && hour < 18.5;
  const probs = rain ? { stroll: 0.05, hobby: 0.55, plaza: 0.02, bench: 0.02, flowers: 0.02, water: 0.01, friend: 0.1 }
    : { stroll: 0.25, hobby: 0.2, plaza: night ? 0.05 : 0.15, bench: 0.15, flowers: !night && hour >= 8 && !gold ? 0.35 : 0.03, water: gold ? 0.4 : 0.08, friend: 0.2 };
  return { probs, mood: null, greet: 0.12, local: true, shelter: rain };
}
/** 島民要選下一步：拿 laya 的決定（連不上時偶爾用 localPlan），在目前做得到的事情裡挑一件，變成目的地與停留時間；沒有決定就回傳 false */
function decide(v, dp, hour) {
  if (!thinks(v)) return false;
  const p = mind.take(v, simT) || localPlan(v, hour); if (!p) return false;
  const m = v.mesh, x = m.position.x, z = m.position.z, r = Math.max(2, v.range || 3), dist = (a, b) => Math.hypot(a - x, b - z);
  const benches = []; seats.forEach(st => { if (dist(st.x, st.z) < 14 && Math.abs(ground(st.x, st.z) - m.position.y) < 0.8) [0, 1].forEach(k => { if (seatFree(st, k, v)) benches.push({ st, k }); }); });
  const flowers = flowerSpots.filter(f => dist(f[0], f[1]) < 12), water = waterSpot(x, z);
  const friends = villagers.filter(o => o !== v && o !== talking && thinks(o) && !o.away && o.mesh.visible && !o.chatting && !o.sitting && dist(o.mesh.position.x, o.mesh.position.z) < 18);
  const act = mind.pick(p.probs, {
    stroll: true, hobby: true, plaza: dist(PLAZA[0], PLAZA[1]) < 28, bench: benches.length > 0, flowers: flowers.length > 0, water: !!water, friend: friends.length > 0,
    player: dp < 14 && !talking && !sitting && simT - (v.greetT ?? -1e9) > 120 && simT - greetAnyT > 45   // 同一位兩分鐘內、全島 45 秒內只來打招呼一次
  }, p.greet);
  if (!act) return false;
  const go = (tx, tz, linger) => { v.target = [tx, tz]; v.wait = Math.hypot(tx - x, tz - z) / 1.3 + linger; };
  if (act === 'stroll') go(v.home[0] + (Math.random() - 0.5) * r * 3, v.home[1] + (Math.random() - 0.5) * r * 3, 2 + Math.random() * 4);
  else if (act === 'plaza') go(PLAZA[0] + (Math.random() - 0.5) * 5, PLAZA[1] + (Math.random() - 0.5) * 5, 10 + Math.random() * 8);
  else if (act === 'bench') {
    const b = benches[Math.floor(Math.random() * benches.length)], [sx, sz] = slotPos(b.st, b.k), k = b.st.edge ? -0.7 : 0.8, front = [sx + Math.sin(b.st.ry) * k, sz + Math.cos(b.st.ry) * k];
    v.benchGoal = { seat: b.st, slot: b.k, front, until: simT + dist(front[0], front[1]) / 1.3 + 8, stay: 15 + Math.random() * 20 }; v.target = front; v.wait = 99;
  }
  else if (act === 'flowers') { const f = flowers[Math.floor(Math.random() * flowers.length)]; go(f[0] + (Math.random() - 0.5) * 1.6, f[1] + (Math.random() - 0.5) * 1.6, 6 + Math.random() * 6); }
  else if (act === 'water') go(water[0], water[1], 8 + Math.random() * 6);
  else if (act === 'friend') {
    const f = friends.sort((a, b) => dist(a.mesh.position.x, a.mesh.position.z) - dist(b.mesh.position.x, b.mesh.position.z))[0];
    if (!town.invite(v, f, hour, !!talking)) { const a = Math.atan2(x - f.mesh.position.x, z - f.mesh.position.z); go(f.mesh.position.x + Math.sin(a) * 1.3, f.mesh.position.z + Math.cos(a) * 1.3, 4 + Math.random() * 3); }   // 沒有可以聊的話題：走到朋友旁邊待一下
  }
  else if (act === 'player') { v.goPlayer = simT + 15; v.greetT = greetAnyT = simT; v.wait = 99; }
  else if (p.shelter) go(v.home[0] + (Math.random() - 0.5) * 1.2, v.home[1] + (Math.random() - 0.5) * 1.2, 14 + Math.random() * 10);   // v8.6 下雨：回家門口躲雨
  else { v.target = [x, z]; v.wait = 8 + Math.random() * 6; }   // hobby：待在原地做自己的事
  const prevMood = v.mind && v.mind.mood; v.mind = { act, mood: p.mood };
  if (dp < 16) {   // 頭上冒出要做的事；做自己的事時是各自的興趣，心情變了再冒一個心情
    ui.think(m, act === 'hobby' ? (p.shelter ? '☔' : HOBBY[v.sid] || '🎵') : mind.ACTIONS[act][1]);
    if (p.mood && p.mood !== prevMood && mind.MOODS[p.mood]) setTimeout(() => { if (!v.away) ui.think(m, mind.MOODS[p.mood][1]); }, 2300);
  }
  return true;
}
function standVillager(v) {
  const st = v.sitting.seat, [x, z] = slotPos(st, v.sitting.slot), fx = Math.sin(st.ry), fz = Math.cos(st.ry), k = st.edge ? -0.7 : 0.8;
  setSit(v.mesh, false); v.mesh.position.set(x + fx * k, ground(x + fx * k, z + fz * k), z + fz * k); v.sitting = null; v.standAt = 0; v.wait = 2; v.target = [v.mesh.position.x, v.mesh.position.z];
}
const SIT_L = {
  day: ['偶爾停下來發呆，也是很重要的喔。', '坐在這裡，煩惱好像都變小了。', '考試會順利的，我相信你。', '你最近很努力，我都有看到喔。', '能和你一起坐在這裡真好。', '風吹起來好舒服……再坐一下下就好。'],
  golden: ['夕陽好漂亮……今天也辛苦了。', '每天這個時候的海，顏色都不一樣呢。', '看著夕陽，覺得今天讀的東西都會記住。', '天空變成橘色了！我最喜歡這個時候。'],
  night: ['星星好多……你知道哪顆是天狼星嗎？', '晚上的海風好舒服。', '累了就早點休息喔，明天再一起加油。', '聽，海浪的聲音。'],
  snow: ['下雪的島好安靜。', '呼——好冷，可是好漂亮。', '雪落在海面上，一下子就不見了。'],
  rain: ['下雨天坐著聽雨聲，也不錯呢。', '雨停了以後，說不定會有彩虹。']
};
function sitTick(dt) {
  const st = sitting.seat; sitting.t += dt;
  // 坐了 4 秒：附近有空的島民就走過來坐在另一邊
  if (!sitting.mate && sitting.t > 4 && !sitting.asked) {
    sitting.asked = true; const p = player.position;
    const v = villagers.filter(v => !v.away && !v.chatting && !v.sitting && !v.sitGoal && talking !== v && Math.hypot(v.mesh.position.x - p.x, v.mesh.position.z - p.z) < 20)
      .sort((a, b) => Math.hypot(a.mesh.position.x - p.x, a.mesh.position.z - p.z) - Math.hypot(b.mesh.position.x - p.x, b.mesh.position.z - p.z))[0];
    if (v) { const slot = 1 - sitting.slot, [x, z] = slotPos(st, slot), k = st.edge ? -0.7 : 0.8; v.sitGoal = { seat: st, slot, x: x + Math.sin(st.ry) * k, z: z + Math.cos(st.ry) * k, until: simT + 14 }; v.target = [v.sitGoal.x, v.sitGoal.z]; v.wait = 99; sitting.mate = v; }
  }
  const v = sitting.mate;
  if (v && v.sitting && v.sitting.seat === st) {
    if ((sitting.next -= dt) <= 0 && sitting.said < 3) {
      const night = skyU.night.value > 0.5, gold = post.fx.golden > 0.3, pool = weather.raining() ? (seasons.winter() ? SIT_L.snow : SIT_L.rain) : night ? SIT_L.night : gold ? SIT_L.golden : seasons.winter() ? SIT_L.snow.concat(SIT_L.day) : SIT_L.day;
      ui.bubble(v.mesh, pick(pool), 4200); setTalk(v.mesh, true); setTimeout(() => setTalk(v.mesh, false), 1400);
      sitting.said++; sitting.next = 9;
      if (sitting.said === 1) {
        const s = S(), d = dayKey(); s.sitDay = s.sitDay && s.sitDay.d === d ? s.sitDay : { d, who: {} };
        memo.add(`和${v.name}一起${gold ? '看了夕陽' : night ? '看了星星' : '坐著吹風'}`, seasons.winter() ? '冬天的島，好安靜' : '', { key: 'sit:' + v.sid, icon: gold ? '🌅' : night ? '🌌' : '🪑' });
        if (!s.sitDay.who[v.sid] && !v.guest) { s.sitDay.who[v.sid] = 1; bond.addFr(v, 1); s.stats = s.stats || {}; s.stats.sits = (s.stats.sits || 0) + 1; save(); setTimeout(() => ui.toast(`和${v.name}一起${gold ? '看了夕陽' : night ? '看了星星' : '坐著吹風'}，好感度 +1`), 1800); }
      }
    }
  } else if (v && !v.sitGoal && !v.sitting) sitting.mate = null;
}
const GUIDE = { name: '潮汐考場', color: '#5b8fd6', voice: 300 }, KEEPER = { name: '燈塔守衛', color: '#ef6f5e', voice: 260 };
const DOORS = () => [
  myHome && { kind: 'mine', door: myHome.door, label: '回家' },
  ...homes.filter(h => h.owner && h.owner !== 'player').map(h => { const v = villagers.find(x => x.sid === h.owner); return v && { kind: 'home', door: h.door, v, label: `拜訪${v.name}的家` }; }),
  SITES.exam && { kind: 'exam', door: SITES.exam.door, label: '進入潮汐考場（模擬考、錯題本、成績統計）' },
  SITES.lighthouse && { kind: 'arena', door: SITES.lighthouse.door, label: '進入燈塔（首領戰）' },
  SITES.library && { kind: 'library', door: SITES.library.door, label: '進入潮汐圖書館（錯題本）' },
  SITES.board && { kind: 'board', door: SITES.board.door, label: '看告示牌（評價、搬遷）' },
  SITES.museum && { kind: 'museum', door: [SITES.museum.x, SITES.museum.z + 2.3], label: '參觀博物館' },
  SITES.waterwheel && { kind: 'mill', door: [SITES.waterwheel.x + 1.0, SITES.waterwheel.z + 2.5], label: '看水車磨坊的告示牌' },
  SITES.shop && { kind: 'shop', door: [SITES.shop.x + 0.8, SITES.shop.z + 2.2], label: '進入潮汐商店' },
  SITES.telescope && { kind: 'stars', door: SITES.telescope.door, label: '用天文望遠鏡觀星' },
  diy.benchSite() && { kind: 'diy', door: diy.benchSite().door, label: '使用 DIY 工作台' },
  hotel.siteInfo() && { kind: 'hotel', door: hotel.siteInfo().door, label: '進入潮汐渡假飯店' }
].filter(Boolean);
const whereOf = (v, h) => (v.guest ? (guest.atHome(v, h) ? 'home' : 'out') : town.where(v, h));
/** 島民的家加上你送的家具：照順序找空位擺（後牆優先，門口留路） */
function homeWithGifts(v, home) {
  const ids = (S().treasure || {})[v.sid] || []; if (!ids.length || !home.items) return { home, shown: [] };
  const h = Object.assign({}, home, { items: home.items.slice() }), shown = [], occ = new Set();
  const size = (f, r) => { const [w, d] = f.size || [1, 1]; return r % 2 ? [d, w] : [w, d]; };
  const mark = it => { const f = room.furn(it.id); if (!f || f.cat === 'rug') return; const [w, d] = size(f, it.r); for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) occ.add((it.x + x) + ',' + (it.z + z)); };
  h.items.forEach(mark);
  ids.forEach(id => {
    const f = room.furn(id); if (!f) return;
    if (h.items.some(it => it.id === id)) { shown.push(f); return; }
    const [w, d] = size(f, 0);
    outer: for (let z = 0; z + d <= 8; z++) for (let x = 0; x + w <= 8; x++) {
      if (z + d >= 8 && x <= 4 && x + w > 3) continue;
      let ok = true; if (f.cat !== 'rug') for (let dz = 0; dz < d && ok; dz++) for (let dx = 0; dx < w; dx++) if (occ.has((x + dx) + ',' + (z + dz))) { ok = false; break; }
      if (!ok) continue;
      const it = { id, x, z, r: 0 }; h.items.push(it); mark(it); shown.push(f); break outer;
    }
  });
  return { home: h, shown };
}
function visit(v) {
  const w = whereOf(v, hourOverride ?? nowHour()), away = w !== 'home';   // v7.6：主人不在家（或睡了）也能進去逛：門沒鎖，桌上留了紙條
  const home0 = v.guest ? v.roomLayout : (I.HOMES || {})[v.sid]; if (!home0) { ui.toast('門鎖著'); return; }
  const { home, shown } = v.guest ? { home: home0, shown: [] } : homeWithGifts(v, home0);
  life.cancel(); moveTo = null; if (!away) town.interrupt(v);
  if (!away) bond.note(v, 'visit');   // v8.5 第一次到他家（主人在家時）
  const note = () => { if (away) setTimeout(() => ui.toast(w === 'sleep' ? `${v.name}睡著了……輕手輕腳地看看就好` : `${v.name}不在家。桌上留了紙條：「${bag('n:' + v.sid, ((I.LINES7 || {})[v.sid] || {}).note || ['出去走走，自己坐喔！'])}」`), 700); };   // v8.6 每人自己的紙條
  if (house.has(v.sid) && !v.guest) {   // v7.6：整棟室內（外觀怎樣、裡面就怎樣）
    if (!away) { if (v.sitting) standVillager(v); v.sitGoal = null; }
    roomHost = away ? null : v; nearDoor = null; nearV = null;
    if (v.sid === 'earth') { const s0 = S(); s0.stats = s0.stats || {}; s0.stats.yueVisit = (s0.stats.yueVisit || 0) + 1; save(); }
    const gifts = ((S().treasure || {})[v.sid] || []).map(id => room.furn(id)).filter(Boolean), yaw0 = camYaw, d = DOORS().find(x => x.v === v).door;
    houseSid = v.sid;
    house.enter(v.sid, { host: away ? null : v, gifts, onExit: () => {
      roomHost = null; moveTo = null; nearDoor = null; nearV = null; houseSid = null; camYaw = yaw0;
      if (!away) { const gy = ground(d[0], d[1]), spot = [[1, 0.6], [-1, 0.6], [0, 1.3]].map(([ox, oz]) => [d[0] + ox, d[1] + oz]).find(([x, z]) => walkable(x, z, gy, v.mesh)) || v.home; v.mesh.position.set(spot[0], ground(spot[0], spot[1]), spot[1]); v.target = v.home.slice(); }
      player.position.set(d[0], ground(d[0], d[1] + 0.5), d[1] + 0.5); player.rotation.y = 0; camPos.copy(player.position).add(camOff); paintHud();
    } });
    camYaw = house.spawnYaw() + Math.PI; fpPitch = -0.05; note();
    if (gifts.length && !away) setTimeout(() => { if (!house.inside || roomHost !== v) return; ui.emote(v.mesh, '💖', '#ff7b9c'); ui.bubble(v.mesh, `你送我的「${pick(gifts).name}」，我好好擺著喔！`, 3600); }, 900);
    return;
  }
  if (v.sid === 'earth' && !v.guest) {
    if (!away) { if (v.sitting) standVillager(v); v.sitGoal = null; }
    roomHost = away ? null : v; nearDoor = null; nearV = null;
    { const s0 = S(); s0.stats = s0.stats || {}; s0.stats.yueVisit = (s0.stats.yueVisit || 0) + 1; save(); }   // 拜訪過岳（「還沒試過的玩法」用）
    const gifts = ((S().treasure || {})[v.sid] || []).map(id => room.furn(id)).filter(Boolean);   // 岳的禮物架放得下全部禮物：不經過通用房間的找空位（那裡放不下的會被略過）
    yuehome.enter(gifts, { away }); note();
    if (gifts.length && !away) setTimeout(() => { if (!yuehome.inside || roomHost !== v) return; ui.emote(v.mesh, '💖', '#ff7b9c'); ui.bubble(v.mesh, `你送我的「${pick(gifts).name}」，我好好擺著喔！`, 3600); }, 900);
    return;
  }
  if (away) {
    roomHost = null;
    room.enter(player, () => { scene.add(player); const d = DOORS().find(x => x.v === v).door; player.position.set(d[0], ground(d[0], d[1] + 0.4), d[1] + 0.4); player.rotation.y = 0; camPos.copy(player.position).add(camOff); }, { home, sid: v.sid });
    note(); return;
  }
  roomHost = v;
  room.enter(player, () => { roomHost = null; scene.add(player); scene.add(v.mesh); const d = DOORS().find(x => x.v === v).door; const gy = ground(d[0], d[1]), spot = [[1, 0.6], [-1, 0.6], [0, 1.3]].map(([ox, oz]) => [d[0] + ox, d[1] + oz]).find(([x, z]) => walkable(x, z, gy, v.mesh)) || v.home; v.mesh.position.set(spot[0], ground(spot[0], spot[1]), spot[1]); v.target = v.home.slice(); player.position.set(d[0], ground(d[0], d[1] + 0.4), d[1] + 0.4);   /* 島民送到門旁邊，不和出門的玩家重疊 */ player.rotation.y = 0; camPos.copy(player.position).add(camOff); }, { home, sid: v.sid });
  room.scene.add(v.mesh); v.mesh.visible = true; v.mesh.position.set(0, 0, -1.2); v.mesh.rotation.y = 0;
  if (shown.length) setTimeout(() => { if (roomHost !== v) return; ui.emote(v.mesh, '💖', '#ff7b9c'); ui.bubble(v.mesh, `你送我的「${pick(shown).name}」，我好好擺著喔！`, 3600); }, 900);   // 珍惜你送的禮物
}
let roomHost = null, houseSid = null, myHouseCls = false;
/** v7.6：整棟室內的互動點（書桌複習三題、其他說一句這家的小故事）；主人在家由主人說（lines），不在家或在自己家是旁白（alone） */
async function spotAct(s, host, subject) {
  const own = !!host;
  const who = own ? (host.isLib ? library.sp() : sp(host)) : { name: s.name || s.label, color: '#a58bc9', voice: 300 };
  const pool = own ? s.lines : s.alone || s.lines, lines = pool && pool.length ? pool : ['……'];
  subject = s.subject || (subject && TA.subject(subject) ? subject : null);   // 圖書館、博物館不是科目：書桌的 subject 指定（博物館是歷史）
  if (houseSid === 'library' && s.id === 'reading_corner') { await seatMenu(who, lines); return; }   // v8.3 夾層的讀書椅：坐下來專注
  if (houseSid === 'library' && s.id === 'rare_atlas') { await logbook(who, lines); return; }   // v8.5 圓塔的珍本：你的學期航海誌
  if (s.kind === 'study') { await ui.say(who, pick(lines)); ui.closeDialog(); await drill(who, picker(subject ? { mode: 'subject', subject } : { mode: 'mixed' }), 3, {}); return; }
  await ui.say(who, pick(lines));
}
const libMesh = chibi(library.LIB()); libMesh.traverse(m => { m.frustumCulled = false; }); actors.dress(libMesh, 'library');
const LIBHOST = { isLib: true, sid: 'library', mesh: libMesh };
/* ---------- v8.3 新館：十科書架、讀書椅、借閱、展品與小特展、捐贈箱、留言簿、來館的島民 ---------- */
const SHELF = ['chinese', 'english', 'math', 'history', 'geography', 'civics', 'physics', 'chemistry', 'biology', 'earth'];   // 圖書館十科書架由左到右（data/interiors_library.js 的名牌順序）
const shelfSid = () => SHELF[Math.max(0, Math.min(9, Math.round((player.position.x + 5.04) / 1.12)))];
const libSpots = () => SHELF.map((sid, i) => ({ x: -5.04 + 1.12 * i, y: 0, z: -4.9, r: 0.72, kind: 'hook:libnotes', topic: sid, label: `翻開${(TA.subject(sid) || {}).name || ''}筆記` }));
const wait = ms => new Promise(r => setTimeout(r, ms));
/** 今天誰來館裡：博物館（史遙在時找她聊天、不在時來看展）、圖書館（下雨天來避雨，晴天偶爾來看書）；一棟一天最多兩次 */
function hallVisitor(kind) {
  const h = hourOverride ?? nowHour(), s = S(), day = dayKey();
  if (!s.hallVisit || s.hallVisit.d !== day) s.hallVisit = { d: day, n: {} };
  if ((s.hallVisit.n[kind] || 0) >= 2) return null;
  const rain = weather.raining(), V = I.HALL_VISITS || {};
  let pool = villagers.filter(v => !v.shop && !v.guest && v.sid !== 'history' && !v.away && v !== talking && !v.chatting && v.mesh.visible && whereOf(v, h) === 'out' && (V[v.sid] || town.chatsFor('history', v.sid).length));
  if (!pool.length || Math.random() > (kind === 'library' && rain ? 0.85 : 0.4)) return null;
  const v = (kind === 'library' && rain && pool.find(x => x.sid === 'biology')) || pick(pool);
  town.interrupt(v); if (v.sitting) standVillager(v); v.sitGoal = null;
  s.hallVisit.n[kind] = (s.hallVisit.n[kind] || 0) + 1; save();
  return v;
}
/** 走近館裡的島民：先說一句（博物館裡史遙在的話，兩人聊一段原本在島上聊的雙人閒聊） */
async function hallChat(v, kind, host) {
  for (let k = 0; k < 240; k++) { await wait(500); if (!house.inside || !house.guestsNow().includes(v)) return; if (!talking && !ui.dialogOpen() && Math.hypot(player.position.x - v.mesh.position.x, player.position.z - v.mesh.position.z) < 4.5) break; }
  if (!house.inside || !house.guestsNow().includes(v)) return;
  const V = (I.HALL_VISITS || {})[v.sid] || {}, cs = host && host.sid === 'history' ? town.chatsFor('history', v.sid) : [];
  const own = kind === 'library' ? (weather.raining() ? V.rain : V.library) : V.museum;
  const lines = cs.length && (Math.random() < 0.7 || !own) ? pick(cs).lines : own && own.length ? [[v.sid, pick(own)]] : [];
  for (const [sid, t] of lines) {
    if (!house.inside || !house.guestsNow().includes(v)) return;
    const m = sid === v.sid ? v.mesh : host && sid === host.sid ? host.mesh : null; if (!m) continue;
    const ms = 2600 + String(t).length * 85; ui.bubble(m, t, ms); await wait(ms + 250);
  }
}
/** 夾層的讀書椅：坐下來專注（現成的專注時光），或聽一段小故事 */
async function seatMenu(who, lines) {
  const b = S().borrow, sub = b && b.sid ? `（帶著「${b.name}」）` : '';
  const i = await ui.ask(library.sp(), pick(['這張讀書椅靠窗，光線剛好。要坐下來專心一下嗎？', '這盞燈替你留著。想休息也可以，想專心也可以。']) + sub, ['專注 15 分鐘', '專注 25 分鐘', '先坐一下就好', '離開']);
  if (i === 0 || i === 1) { ui.closeDialog(); focus.begin(i ? 25 : 15, b ? b.sid : null, paintHud, '圖書館・夾層的讀書椅'); return; }
  if (i === 2) await ui.say(who, pick(lines));
}
/* ---------- v8.5 「這次先做」：在今日學習挑一件事，固定在任務欄最上面；量得到的會自動打勾，隔天換新的 ---------- */
const dayN = () => L.dayRec();
const musN = () => Object.values(S().museum || {}).reduce((a, o) => a + Object.keys(o || {}).length, 0);
function pinOptions() {
  const s = S(), b = s.borrow, th = museum.themeNow(), out = [];
  if (b) out.push({ k: 'borrow', t: `讀借閱中的「${b.name}」，再用 5 題新題試試`, base: () => ((s.stats || {}).borrowTry || 0), done: v => ((s.stats || {}).borrowTry || 0) > v, go: () => borrowAct('read') });
  if (L.reviewToday().left) out.push({ k: 'review', t: '做完今天的複習', base: () => 0, done: () => !L.reviewToday().left, go: () => hall.reviewGo(8) });
  out.push({ k: 'donate', t: '捐一件新的展品給博物館', base: musN, done: v => musN() > v, go: () => ui.toast('釣魚、捉蟲、挖化石、潮池……帶去博物館找史遙，或放進捐贈箱') });
  if (th) out.push({ k: 'theme', t: `湊齊本週小特展「${th.title}」`, base: () => 0, done: () => !!(s.themes || {})[th.id], go: () => ui.toast('到博物館圓廳的特展台看看還缺哪一件') });
  out.push({ k: 'written', t: '寫一題非選題', base: () => dayN().wq || 0, done: v => (dayN().wq || 0) > v, go: () => written.open() });
  out.push({ k: 'vocab', t: '翻 20 張單字卡', base: () => dayN().voc || 0, done: v => (dayN().voc || 0) >= v + 20, go: () => lexicon.open() });
  out.push({ k: 'mock', t: '做一次模擬考（短版也可以）', base: () => (TA.S.exams || []).length, done: v => (TA.S.exams || []).length > v, go: () => hall.openMock() });
  return out;
}
function pinNow() {
  const p = S().pin; if (!p || p.d !== dayKey()) return null;
  const o = pinOptions().find(x => x.k === p.k); if (!o) return null;
  const done = o.done(p.v); if (done && !p.cel) { p.cel = 1; save(); setTimeout(() => ui.toast(`📌 完成了：${o.t}`), 300); Audio.sfx('ok'); }
  return { t: o.t, done };
}
function pinSet(k) { const s = S(); if (!k) { s.pin = null; save(); return; } const o = pinOptions().find(x => x.k === k); if (!o) return; s.pin = { k, d: dayKey(), v: o.base(), cel: 0 }; save(); Audio.sfx('tick'); paintHud(); }
function pinGo() { const p = S().pin, o = p && pinOptions().find(x => x.k === p.k); if (o) o.go(); else phoneToday(); }
function pinHtml() {
  const p = S().pin && S().pin.d === dayKey() ? S().pin : null, opts = pinOptions();
  if (p) { const o = opts.find(x => x.k === p.k), done = o && o.done(p.v); return `<div class="td-borrow"><span>📌 這次先做：<b>${ui.esc(o ? o.t : '')}</b>${done ? '　✔ 完成了' : '（固定在左上角的任務欄）'}</span><button type="button" class="btn ghost sm" data-pin="">${done ? '換一件' : '取消'}</button></div>`; }
  return `<div class="td-borrow"><span>📌 這次先做哪一件？挑一件固定在任務欄最上面（可選）</span>${opts.map(o => `<button type="button" class="btn ghost sm" data-pin="${o.k}">${ui.esc(o.t)}</button>`).join('')}</div>`;
}
/* ---------- v8.5 學期航海誌：每個月從回憶錄挑一件真的發生過的事，收在圖書館圓塔；我的學期：只算你要考的考科 ---------- */
async function logbook(who, lines) {
  const LB = S().logbook || {}, ks = Object.keys(LB).sort();
  if (!ks.length) { await ui.say(who, pick(lines) + '……旁邊有一本空白的航海誌。在回憶錄挑一件這個月的事收進來，它就會寫在這裡。'); return; }
  await ui.say(who, `${pick(lines)}……旁邊那本是你的航海誌，已經有 ${ks.length} 頁了。`);
  const body = ui.el('div', 'wb', `<ul class="wb-list">${ks.map(k => { const e = LB[k]; return `<li><b>${k.slice(0, 4)} 年 ${+k.slice(5)} 月</b>　${e.icon} ${ui.esc(e.title)}${e.sub ? `<br><small>${ui.esc(e.sub)}</small>` : ''}</li>`; }).join('')}</ul><p class="muted">每個月一頁，在手機的「回憶錄」挑。答錯又修好、第一次說清楚一個觀念，都很值得收進來。</p>`);
  ui.closeDialog(); ui.panel('學期航海誌', body, { cls: 'letter-p' });
}
const tutorOf = sid => villagers.find(v => v.sid === sid && !v.guest);
function semester() {
  const Q = TA.S.q, s0 = S(), subs = TA.SUBJECTS.filter(s => L.inTrack(s.id) && tutorOf(s.id));
  const rows = subs.map(s => {
    const ids = L.BY_SUBJECT[s.id] || [], fixed = ids.filter(id => { const r = Q[id]; return r && r.wr > 0 && r.s >= 3; }).length, mast = ids.filter(id => (Q[id] || {}).s >= L.MASTER_BOX).length, lab = ((s0.lab || {})[s.id] || {}).stage || 0;
    return { s, items: [['錯題', Math.min(fixed, 5), 5], ['熟練', Math.min(mast, 40), 40], ['研究', Math.min(lab, 1), 1]] };
  });
  const full = (TA.S.exams || []).some(e => !e.drill && L.trackGroups().includes(e.group) && L.MOCK[e.group] && e.n >= L.MOCK[e.group].realN * 0.9);
  const all = rows.flatMap(r => r.items).concat([['做一次整卷模擬考', full ? 1 : 0, 1]]), done = all.filter(([, v, n]) => v >= n).length;
  return { rows, full, done, total: all.length };
}
function semesterHtml() {
  const m = semester(); if (!m.rows.length) return '';
  const s0 = S(); if (m.done >= m.total && !s0.semDone) { s0.semDone = Date.now(); s0.bells += 5000; save(); memo.add('我的學期', `要考的 ${m.rows.length} 科都完成了學期目標：修好錯題、熟練、研究，還有一次整卷模考。`, { icon: '🎓' }); setTimeout(() => ui.toast('🎓 我的學期完成了！+5,000 鈴錢'), 300); }
  const it = ([t, v, n]) => `<i class="${v >= n ? 'ok' : ''}">${v >= n ? `✔ ${t}` : `${t} ${v}/${n}`}</i>`;   // 科目多時預設收起來，不把考科清單擠到下面
  return `<details class="hub-sem"${m.rows.length <= 4 && m.done < m.total ? ' open' : ''}><summary><b>🎓 我的學期 ${m.done} / ${m.total}</b><small>${m.done >= m.total ? '完成了！' : '點開看每科還差什麼'}</small></summary>`
    + `<small>每一科：修好 5 道錯題、熟練 40 題、和那一科的導師完成一個研究階段；再加一次整卷模擬考。只算你要考的考科（「調整航線」可改）。</small>`
    + m.rows.map(r => `<div><span><em style="background:${r.s.color}"></em>${r.s.name}</span>${r.items.map(it).join('')}</div>`).join('')
    + `<div><span>模考</span>${it(['整卷一次', m.full ? 1 : 0, 1]).replace('<i ', '<i style="grid-column: span 3" ')}</div></details>`;
}
/** 今日學習的「借閱中」 */
function borrowHtml() {
  const b = S().borrow; if (!b) return '';
  return `<div class="td-borrow"><span>📌 借閱中：<b>${ui.esc((TA.subject(b.sid) || {}).name || '')}「${ui.esc(b.name)}」</b></span><button type="button" class="btn sm" data-bw="read">接著讀</button><button type="button" class="btn sm" data-bw="try">用新題試試</button><button type="button" class="btn ghost sm" data-bw="back">還書</button></div>`;
}
function borrowAct(k) {
  const b = S().borrow; if (!b) return;
  if (k === 'read') { ui.setBack(phoneToday, '今日學習'); library.openNotes(b.sid, b.unit); return; }
  if (k === 'try') { const ids = L.pickUnit(b.unit, 5); if (!ids.length) { ui.toast('這個單元暫時沒有題目'); return; } const st = S().stats = S().stats || {}; st.borrowTry = (st.borrowTry || 0) + 1; save(); hall.runSet(`${b.name} · 讀完試試`, ids, { again: phoneToday }); return; }
  S().borrow = null; save(); ui.toast(`「${b.name}」還回書架了`); phoneToday();
}
/** 捐完：館裡馬上擺上新展品；問要不要去看看它的位置（小光點指路） */
async function afterDonate(got, who) {
  if (!house.inside || houseSid !== 'museum' || !got.length) return;
  house.redress(); house.setVisitSpots(museum.spots());
  const it = got[got.length - 1], at = museum.where(it.k, it.id); if (!at) return;
  const i = await ui.ask(who, `「${itemName(it)}」已經擺上${museum.wingName(it.k)}展區了。要去看看它的位置嗎？`, ['去看看', '先不用']);
  if (i === 0) { ui.closeDialog(); house.mark(at[0], at[1] + 0.5, at[2]); ui.toast(`${museum.wingName(it.k)}展區：跟著小光點走`); }
}
/** 捐贈箱：館長不在也能捐（已經鑑定好、館裡還沒有的），之後收到一封收件信 */
async function donationBox() {
  if (talking) return; talking = { name: 'box' };
  const NAR = { name: '捐贈箱', color: '#c9a05a', voice: 300 };
  try {
    const s = S(), can = s.pockets.map((it, i) => [it, i]).filter(([it]) => it && KINDS[it.k] && !s.museum[it.k][it.id]);
    const raw = s.pockets.filter(x => x && (x.k === 'unk' || x.k === 'ore')).length;
    if (!can.length) { await ui.say(NAR, '投入口旁貼著一張小卡：「已經鑑定好、館裡還沒有的展品，可以放進來。」' + (raw ? `口袋裡有 ${raw} 件還沒鑑定的東西：化石請史遙、礦石請岳先看看吧。` : '口袋裡目前沒有可以捐的東西。')); return; }
    const i = await ui.ask(NAR, `口袋裡有 ${can.length} 件館裡還沒有的展品：${can.map(([it]) => itemName(it)).join('、')}。要放進捐贈箱嗎？`, ['全部放進去', '先不要']);
    if (i !== 0) return;
    const got = can.map(([it, idx]) => { s.museum[it.k][it.id] = Date.now(); s.pockets[idx] = null; miles.add('donate'); return it; });
    s.bells += got.length * 200; save(); Audio.sfx('ok');
    await ui.say(NAR, `咚——${got.length} 件展品落進箱子裡。箱子上的小牌子亮了一下：「謝謝你，謝禮 ${got.length * 200} 鈴錢已經放進錢包。」`);
    const facts = got.map(it => find(it.k, it.id)).filter(x => x && x.desc).slice(0, 2).map(x => `「${x.name}」：${x.desc}`).join('\n');
    social.sendLetter({ from: 'history', title: '捐贈箱的收件信', open: `${TA.S.profile.name || '你'}好：`, text: `今天在捐贈箱收到 ${got.map(it => itemName(it)).join('、')}，我已經替${got.length > 1 ? '它們' : '它'}擺上展示位了。${facts ? '\n' + facts : ''}`, close: '—— 史遙' });
    await afterDonate(got, NAR);
  } finally { talking = null; ui.closeDialog(); paintHud(); }
}
/** 留言簿：寫一句「我今天第一次知道……」，下次來翻得到（也收進回憶錄） */
async function guestbook() {
  if (talking) return; talking = { name: 'guestbook' };
  const NAR = { name: '留言簿', color: '#a58bc9', voice: 300 };
  let write = false;
  try {
    const g = S().guestbook || [], last = g.slice(-3).reverse().map(e => `${e.d}「${e.t}」`).join('　');
    const i = await ui.ask(NAR, g.length ? `翻到你寫過的幾頁：${last}` : '扉頁上史遙寫著：「我喜歡看大家記下自己的第一次。」後面的頁子還空著。', ['寫一句', '闔上']);
    write = i === 0;
  } finally { talking = null; ui.closeDialog(); paintHud(); }
  if (!write) return;
  const body = ui.el('div', 'mm-write', `<label>我今天第一次知道……<textarea maxlength="60" rows="2" placeholder="例如：菊石的殼越往外越大，是一圈一圈長出來的。"></textarea></label><p class="muted">會留在博物館的留言簿，也收進回憶錄。</p>`);
  const ta = body.querySelector('textarea'), ok = ui.el('button', 'btn gold', '寫上去'); ok.type = 'button';
  ok.onclick = () => { const t = ta.value.trim(); if (!t) { ui.toast('寫一點什麼吧'); return; } const d = new Date(), s = S(); s.guestbook = (s.guestbook || []).concat([{ d: `${d.getMonth() + 1}/${d.getDate()}`, t }]).slice(-40); save(); ui.closePanel(); memo.add('博物館留言簿', t, { icon: '🖋' }); Audio.sfx('catch'); ui.toast('寫進留言簿了'); };
  body.appendChild(ok); ui.panel('潮汐博物館 · 留言簿', body, { cls: 'memo-p' }); setTimeout(() => ta.focus(), 50);
}
/** 圓廳的特展台 */
async function themeAct() {
  if (talking) return; talking = { name: 'theme' };
  try { const hv = house.hostNow(), who = hv && hv.sid === 'history' ? sp(hv) : { name: '特展台', color: '#c9a05a', voice: 300 }; await museum.openTheme(who, { memo: (a, b) => memo.add(a, b, { icon: '🏛' }), paint: paintHud }); }
  finally { talking = null; paintHud(); }
}
/** v8.1 圖書館、博物館的整棟室內（house.js）：出館回到門口；建不起來就用舊的房間／展廳 */
function enterPublic(key, host, door, opt = {}) {
  const yaw0 = camYaw;
  nearDoor = null; nearV = null; houseSid = key; roomHost = host;
  const ok = house.enter(key, { host, dress: opt.dress, spots: opt.spots, guests: opt.guests, onExit: () => {
    if (opt.after) opt.after();
    roomHost = null; houseSid = null; moveTo = null; nearDoor = null; nearV = null; camYaw = yaw0;
    player.position.set(door[0], ground(door[0], door[1]), door[1]); player.rotation.y = 0; camPos.copy(player.position).add(camOff); paintHud();
  } });
  if (!ok) { houseSid = null; roomHost = null; return false; }
  camYaw = house.spawnYaw() + Math.PI; fpPitch = -0.05;
  (opt.guests || []).forEach(g => hallChat(g.v, key, host && !host.isLib ? host : null));
  return true;
}
function enterMuseum() {
  life.cancel(); moveTo = null;
  if (house.has('museum')) {
    const f = SITES.museum, v = villagers.find(x => x.sid === 'history'), at = !!v && !v.away && v.mesh.visible && Math.hypot(v.mesh.position.x - f.front[0], v.mesh.position.z - f.front[1]) < 8;   // 史遙守在博物館門口：她在附近的話，進館後她站在服務台
    if (at) { town.interrupt(v); if (v.sitting) standVillager(v); v.sitGoal = null; bond.note(v, 'visit'); }
    const gv = hallVisitor('museum'), guests = gv ? [{ v: gv, at: (at ? [[4.75, 0, 3.9, -0.7], [5.0, 0, 5.6, -2.3], [2.9, 0, 4.0, 0.9]] : []).concat([[-1.6, 0, -1.6, -0.8], [1.6, 0, -1.6, 0.8], [-6.6, 0, 1.6, 2.4]]) }] : [];   // v8.3 偶爾有島民來找史遙（或來看展）
    const back = () => { museum.undress(); if (at) { v.mesh.position.set(f.front[0], ground(f.front[0], f.front[1]), f.front[1]); v.target = v.home.slice(); } if (gv) { gv.target = gv.home.slice(); } };
    if (enterPublic('museum', at ? v : null, [f.x, f.z + 2.6], { dress: museum.dress, spots: ud => museum.spots(ud), guests, after: back })) { museum.welcome(); return; }
  }
  museum.enter();
}
async function libAct(k) {
  if (talking) return; talking = { name: 'library' };
  try { await library.act(k); } finally { ui.closeDialog(); talking = null; paintHud(); }
}
function enterLibrary() {
  life.cancel(); moveTo = null;
  if (house.has('library')) {
    const d = SITES.library.door, gv = hallVisitor('library'), guests = gv ? [{ v: gv, at: [[1.6, 0, 2.4, -2.4], [-1.6, 0, 2.4, 2.4], [2.2, 0, 4.9, -2.2], [-2.6, 0, 0.4, 2.0]] }] : [];   // v8.3 下雨天島民會來避雨看書（晴天偶爾）
    if (enterPublic('library', LIBHOST, [d[0], d[1] + 0.4], { spots: libSpots, guests, after: () => { if (gv) gv.target = gv.home.slice(); } })) return;
  }
  roomHost = LIBHOST;
  room.enter(player, () => { roomHost = null; room.scene.remove(libMesh); scene.add(player); const d = SITES.library.door; player.position.set(d[0], ground(d[0], d[1] + 0.4), d[1] + 0.4); player.rotation.y = 0; camPos.copy(player.position).add(camOff); }, { home: library.room(), sid: 'library' });
  room.scene.add(libMesh); libMesh.position.set(0.5, 0, -1.8); libMesh.rotation.y = 0;
}
async function hotelTalk(host) {
  if (talking) return; talking = { name: 'hotel' };
  try { await hotel.talk(host); } finally { ui.closeDialog(); talking = null; paintHud(); }
}
async function libTalk() {
  if (talking) return; talking = { name: 'library' };
  try { await library.talk(); } finally { ui.closeDialog(); talking = null; paintHud(); }
}
async function benchMenu() {
  if (talking) return; talking = { name: 'bench' };
  try { const i = await ui.ask({ name: 'DIY 工作台', color: '#c99a62', voice: 300 }, '要做什麼呢？', ['手作家具', '料理', '離開']); ui.closeDialog(); if (i === 0) diy.openBench(true); else if (i === 1) cooking.openKitchen(paintHud); }
  finally { talking = null; }
}
/* ---------- 颱風天 ---------- */
const L5 = (sid, k, d) => pick((((I.LINES5 || {})[sid] || {})[k]) || d);
const DISASTER = /颱風|豪雨|土石|地震|海嘯|淹水|防災|災害|液化|洪|坡地|崩塌|避難|警報/;
/** 颱風天和島民聊防災：從家裡打電話，或在他家裡聊 */
async function typhoonTalk(v, byPhone) {
  const s = S(), d = dayKey(); s.typhoonTalk = s.typhoonTalk && s.typhoonTalk.d === d ? s.typhoonTalk : { d, tip: {}, quiz: {} };
  const T = s.typhoonTalk; T.tip = T.tip || {}; T.quiz = T.quiz || {};
  if (!T.tip[v.sid] || byPhone) {
    T.tip[v.sid] = true; save();
    await ui.say(sp(v), L5(v.sid, 'home', ['颱風天，待在家裡最安全。']));
    await ui.say(sp(v), L5(v.sid, 'tip', ['以中央氣象署發布的颱風警報為準，不要到海邊觀浪。']));
  }
  if (T.quiz[v.sid]) return;
  const all = (L.BY_UNIT['es-climate'] || []).concat(L.BY_UNIT['es-solid'] || []).filter(id => !L.Q[id].pid && L.Q[id].type !== 'multi');
  const dis = all.filter(id => DISASTER.test(ui.plain(L.Q[id].q + ' ' + L.Q[id].o.join(' '))));
  const ids = dis.length >= 3 ? dis : (L.BY_UNIT['es-climate'] || []).filter(id => !L.Q[id].pid && L.Q[id].type !== 'multi');
  if (ids.length < 3) return;
  const label = dis.length >= 3 ? '防災' : '氣候變遷與防災';
  const i = await ui.ask(sp(v), `剛好一起複習${label}，要做 3 題嗎？`, ['好', '下次吧']);
  if (i !== 0) return;
  T.quiz[v.sid] = true; save();
  const res = await drill(sp(v), picker({ mode: 'ids', ids }), 3, {});
  const b = 300 + res.ok * 300, before = s.fr[v.sid] || 0; s.bells += b; bond.addFr(v, 1); save();
  await ui.say(null, `${label}讀書會：答對 ${res.ok} / ${res.n} 題，得到 ${b} 鈴錢${s.fr[v.sid] > before ? `，${v.name}的好感度 +1` : `（${v.name}的好感度已滿）`}`);
}
/** 手機「颱風電話」：颱風天待在室內，也能和島民聊防災 */
function typhoonPhone() {
  const body = ui.el('div', 'ph-list'), T = (S().typhoonTalk && S().typhoonTalk.d === dayKey()) ? S().typhoonTalk : { quiz: {} };
  villagers.filter(v => !v.shop && !v.guest).forEach(v => {
    const b = ui.el('button', 'ph-row', `<span class="av" style="--c:${v.color}">${v.sub.short || ''}</span><div><b>${ui.esc(v.name)}</b><small>${(T.quiz || {})[v.sid] ? '今天已一起複習過' : '打電話聊聊防災'}</small></div>`); b.type = 'button';
    b.onclick = async () => { ui.closePanel(); if (talking) return; talking = v; try { await typhoonTalk(v, true); } finally { ui.closeDialog(); talking = null; paintHud(); } };
    body.appendChild(b);
  });
  ui.panel('颱風電話', body, { cls: 'phone' });
}
function ticketGift() {
  const s = S(); if (s.ticketGift) return; s.ticketGift = true; trip.addTickets(1);
  social.sendLetter({ fromName: '船長海鷗', title: '神秘島航線開航！', open: '你好，我是負責神秘島航線的船長海鷗：', text: '碼頭盡頭的小船每天都能出航，每次隨機前往一座主題島：魚群島、花海島、礦石島、果樹島、星砂島。\n每座島有 8 個地方可以探索，答對題目就能帶回稀有的魚蟲、礦石、水果或星之碎片。', giftLine: '附上一張潮汐券，第一趟我請客！之後可以用潮汐里程兌換，或在阿潮的商店購買。', close: '—— 船長海鷗' });
}
function typhoonNews() {
  const s = S(), d = dayKey();
  if (weather.typhoon() && s.typhoonMail !== d) {
    s.typhoonMail = d; save();
    social.sendLetter({ fromName: '史遙', title: '颱風警報：今天請待在室內', open: '呼呼，颱風今天經過潮汐小島：', text: '請待在家裡或安全的室內，可以用手機的「颱風電話」和島民聊聊防災；如果收到撤離通知，請依指示撤離。\n・以中央氣象署發布的警報與資訊為準。\n・不要到海邊觀浪、釣魚，也不要靠近河川與山坡。\n・颱風眼經過時風雨會短暫變小，但很快又會轉強，不要以為颱風已經走了。\n・準備手電筒、飲水與緊急避難包，停電時注意用電安全。', giftLine: '颱風過後，海邊會有被沖上岸的漂流木和貝殼；現實中撿拾漂流木要先查政府公告的開放區域與規定。', close: '—— 博物館館長 史遙' });
    setTimeout(() => ui.toast('🌀 颱風來了！請待在室內，打開手機的「颱風電話」和島民聊聊防災'), 2600);
  }
  if (weather.afterTyphoon()) setTimeout(() => ui.toast('颱風過後，海邊沖上來好多漂流木和貝殼！'), 3200);
}
/* ---------- 潮汐夜祭（萬聖節） ---------- */
const L4 = (sid, k, d) => pick((((I.LINES4 || {})[sid] || {})[k]) || d);
async function trickOrTreat(v) {
  const s = S(), d = dayKey(); s.tot = s.tot && s.tot[d] ? { [d]: s.tot[d] } : { [d]: {} }; s.tot[d][v.sid] = true; save();
  await ui.say(sp(v), L4(v.sid, 'trick', ['哎呀，被你抓到了！先回答我一題吧。']));
  const q = pickQ(v.sid, 3); if (!q) return;
  const i = await ui.ask(sp(v), q.q, q.o, { answer: q.a, abc: true, keys: true, html: true }), ok = i === q.a; record(q, ok);
  if (ok) { s.candy = (s.candy || 0) + 2; save(); Audio.sfx('catch'); ui.emote(v.mesh, '🍬', '#ff9a3a'); await ui.say(sp(v), L4(v.sid, 'treat', ['答對了！這兩顆糖果給你。'])); await ui.say(null, `得到 2 顆糖果（共 ${s.candy} 顆）。到阿潮的商店可以換夜祭限定家具。`); await challenge.keepGoing(sp(v), q, { v }); }
  else { Audio.sfx('bad'); ui.emote(player, '🎃', '#ff9a3a'); await ui.say(sp(v), L4(v.sid, 'prank', ['嘿嘿，搗蛋成功！'])); await ui.explain(sp(v), q); }
}
async function candyShop(v) {
  const s = S(), items = (I.FURNITURE || []).filter(f => f.src === 'event:halloween'), hasHat = wardrobe.owns('hats', 'witch');
  await ui.say(sp(v), L4('shop', 'intro', ['糖果兌換櫃台開張囉！']));
  const opts = items.map(f => `${f.name}（5 顆糖果）`).concat(hasHat ? [] : ['魔女帽（3 顆糖果）'], ['不用了']);
  const i = await ui.ask(sp(v), `你有 ${s.candy || 0} 顆糖果。要換什麼？`, opts);
  if (i < 0 || i >= opts.length - 1) return;
  const isHat = !hasHat && i === items.length, cost = isHat ? 3 : 5;
  if ((s.candy || 0) < cost) { await ui.say(sp(v), events.active().includes('halloween') ? '糖果還不夠呢。每天晚上 5 點後，找今天還沒挑戰的島民答題，答對可得 2 顆糖果！' : '糖果還不夠呢。剩下的糖果可以留著，等下次潮汐夜祭再收集更多。'); return; }
  s.candy -= cost; save(); Audio.sfx('coin'); await ui.say(sp(v), L4('shop', 'trade', ['成交！夜祭快樂！']));
  if (isHat) { wardrobe.own('hats', 'witch'); await ui.card({ icon: '', title: '得到「魔女帽」！', sub: '打開手機的衣櫃換上吧。' }); }
  else await giveFurn(items[i].id, '潮汐夜祭限定');
}
/* ---------- 觀星 ---------- */
function stargaze() {
  const h = hourOverride ?? nowHour();
  if (!astro.isNight(h)) { ui.toast('天還亮著……晚上 7 點到清晨 5 點再來觀星吧'); return; }
  if (weather.raining()) { ui.toast('下雨了，雲層太厚看不到星星'); return; }
  const d = new Date(); if (hourOverride != null) { d.setHours(Math.floor(h), Math.floor((h % 1) * 60), 0, 0); }
  const yue = villagers.find(v => v.sid === 'earth');
  astro.open({ date: d, host: yue ? sp(yue) : { name: '岳', color: '#7a6a5a', voice: 240 }, weather: weather.now, paint: paintHud, onClose: () => { paintHud(); milestones(); } });
}
async function fragTrade(v) {
  const s = S(), n = astro.fragments(), canLamp = !(s.milestones || {}).projector && n >= 20;
  const opts = ['5 顆 → 1000 鈴錢'].concat(canLamp ? ['20 顆 → 星空投影燈'] : []).concat(['不用了']);
  const i = await ui.ask(sp(v), `星之碎片是流星留下的禮物。${canLamp ? '' : '收集 20 顆可以換星空投影燈喔。'}要換什麼？`, opts);
  if (i === 0) { s.stars.frag -= 5; s.bells += 1000; save(); Audio.sfx('coin'); paintHud(); await ui.say(sp(v), '這是 1000 鈴錢，願望會一顆一顆實現的。'); }
  else if (canLamp && i === 1) { s.stars.frag -= 20; s.milestones = s.milestones || {}; s.milestones.projector = true; save(); await giveFurn('star_projector', '用 20 顆星之碎片換來的'); }
}
/** 花園與觀星的里程碑獎勵（家具） */
async function milestones() {
  if (focus.active() || talking || life.busy || ui.dialogOpen() || ui.cardOpen() || ui.panelOpen() || astro.isOpen() || photo.active()) { setTimeout(milestones, 20000); return; }
  const s = S(), m = s.milestones = s.milestones || {}, gb = (s.garden || {}).book || {};
  if (!m.peaPot && ['pea_pt', 'pea_pd', 'pea_wt', 'pea_wd'].every(k => gb[k])) { m.peaPot = true; save(); await giveFurn('pea_pot', '培育出全部四種豌豆表現型！'); ui.closeDialog(); }
  if (!m.telescope && astro.bookCount() >= 10) { m.telescope = true; save(); await giveFurn('telescope_model', '登錄了 10 個星座！'); ui.closeDialog(); }
}
async function boardMenu() {
  if (talking) return; talking = { name: 'board' }; const B = { name: '島務告示牌', color: '#ffb84a', voice: 280 };
  try {
    const i = await ui.ask(B, '告示牌上貼著島嶼評價與房屋搬遷的申請表。', ['看島嶼評價', '房屋搬遷', '離開']);
    if (i === 0) { ui.closeDialog(); await rating.open(); }
    if (i === 1) await move.menu(B, villagers, paintHud);
  } finally { ui.closeDialog(); talking = null; }
}
async function building(kind) {
  talking = { name: kind };
  try {
    if (kind === 'exam') {
      const i = await ui.ask(GUIDE, '歡迎來到潮汐考場！要做什麼呢？', ['模擬考（依學測時間比例計時）', '每日潮汐（12 題）' + (TA.S.daily.done ? '（今天已完成）' : ''), '航海圖（單元試煉、點亮燈塔）', `錯題本（${L.mistakes().length} 題）`, '成績統計（模考趨勢、弱點單元）', '激流衝刺（90 秒）', '潮汐盃快問快答' + (quizcup.playedToday() ? '（今天已比過）' : ''), '離開'], { keys: true });
      const go = [() => hall.openMock(), () => voyage.openDaily(), () => voyage.openChart(), () => hall.openMistakes(), () => hall.openStats(), () => voyage.openRush()][i];
      if (go) { ui.closeDialog(); go(); } else if (i === 6) await quizcup.play(GUIDE, villagers);
    } else await town.arena(KEEPER);
  } finally { ui.closeDialog(); talking = null; paintHud(); }
}
function enterHome() {
  life.cancel(); moveTo = null;
  const s = S();
  if (!s.homeInit) { // 第一次回家：送幾件基本家具與壁紙地板
    s.homeInit = true; s.papers = s.papers || [];
    const cheap = cat => (I.FURNITURE || []).filter(f => f.src === 'shop' && f.cat === cat).sort((a, b) => a.price - b.price)[0];
    ['bed', 'table', 'light', 'plant'].forEach(c => { const f = cheap(c); if (f) room.addStorage(f.id); });
    if (I.WALLPAPER && I.WALLPAPER[0]) { s.papers.push(I.WALLPAPER[0].id); room.room().wall = I.WALLPAPER[0].id; }
    if (I.FLOORING && I.FLOORING[0]) { s.papers.push(I.FLOORING[0].id); room.room().floor = I.FLOORING[0].id; }
    save(); setTimeout(() => ui.toast('歡迎回家！按 F 打開裝潢，把家具擺出來吧'), 600);
  }
  const vis = villagers.find(x => x.sid === homevisit.pendingSid()), h = hourOverride ?? nowHour(), guestIn = vis && whereOf(vis, h) !== 'sleep';   // 今天邀請的客人已經在家裡等了
  if (house.has('player')) {   // v7.6：整棟房子；「我的房間」裡是你擺的家具
    if (guestIn) { town.interrupt(vis); roomHost = vis; }
    houseSid = 'player'; const yaw0 = camYaw;
    house.enter('player', { decor: room.ownDecor(), host: guestIn ? vis : null, onExit: () => {
      if (roomHost) visitorLeave(roomHost, true); houseSid = null; moveTo = null; camYaw = yaw0;
      const d = myHome.door; player.position.set(d[0], ground(d[0], d[1] + 0.4), d[1] + 0.4); player.rotation.y = 0; camPos.copy(player.position).add(camOff); paintHud();
    } });
    camYaw = house.spawnYaw() + Math.PI; fpPitch = -0.05;
    if (guestIn) setTimeout(() => ui.toast(`${vis.name}來作客了！過去跟他打招呼吧`), 500);
    return;
  }
  room.enter(player, () => { if (roomHost) visitorLeave(roomHost, true); scene.add(player); const d = myHome.door; player.position.set(d[0], ground(d[0], d[1] + 0.4), d[1] + 0.4); player.rotation.y = 0; camPos.copy(player.position).add(camOff); });
  if (guestIn) {
    town.interrupt(vis); roomHost = vis; room.scene.add(vis.mesh); vis.mesh.visible = true; vis.mesh.position.set(1.2, 0, -0.8); vis.mesh.rotation.y = 0;
    setTimeout(() => ui.toast(`${vis.name}來作客了！過去跟他打招呼吧`), 500);
  }
}
/** 玩家家：切到「我的房間」的俯視佈置畫面；從房門走出來就回到整棟房子（站在房間入口） */
function houseDecor() {
  if (!house.inside || houseSid !== 'player') return;
  const at = house.decorAt(), guest = roomHost, back = house.leave({ keep: true });
  if (!at) { if (back) back(); return; }
  roomHost = null;
  room.enter(player, () => {
    roomHost = guest;
    house.enter('player', { decor: room.ownDecor(), host: guest, spawn: at, onExit: back });
    camYaw = at[3] + Math.PI; fpPitch = -0.05;
  });
  setTimeout(() => { if (room.inside) room.openDecor(); }, 350);
}
/** 客人回家（或玩家離開房間時客人一起出門） */
function visitorLeave(v, silent) {
  if (roomHost === v) roomHost = null;
  scene.add(v.mesh); v.mesh.position.set(v.home[0], ground(v.home[0], v.home[1]), v.home[1]); v.target = v.home.slice();
  if (!silent) ui.toast(`${v.name}回家了`);
}

/** v8.6 面板裡的焦點循環（Tab／Shift+Tab；back 指定往前），焦點不會跑到面板外面 */
function panelTab(e, back) {
  const box = $('panelBox'), f = [...box.querySelectorAll('button:not([disabled]), input, select, textarea, [href], [contenteditable="true"], summary')].filter(x => x.offsetParent !== null);
  e.preventDefault(); if (!f.length) return;
  const up = back != null ? back : e.shiftKey, i = f.indexOf(document.activeElement), n = up ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i >= f.length - 1 ? 0 : i + 1);
  f[n].focus();
}

/* ---------- 開始 ---------- */
let started = false;
function startGame() {
  if (started) return; started = true;
  minimap.init({ player, villagers, camera, plaza: PLAZA, hotel: () => hotel.siteInfo && hotel.siteInfo(), S, tmp: new THREE.Vector3(), onOpen: () => { if (!ui.panelOpen()) phoneMap(); } });   // 右上角的小地圖
  birthdayNews(); { const sb = () => { if (ui.panelOpen() || ui.dialogOpen() || ui.cardOpen()) { setTimeout(sb, 1200); return; } seasons.banner(); }; setTimeout(sb, 900); }   // 季節橫幅：等船員登記與開場對話結束再出來，不疊在表單上   // v6.34.0 起這兩個呼叫被上一行的註解吃掉，開始時沒有執行
  if (gardenMsg) { const m = gardenMsg; gardenMsg = ''; setTimeout(() => ui.toast('🌷 ' + m), 2200); }
  setTimeout(milestones, 3000); typhoonNews(); ticketGift();
  setTimeout(() => { if (catalog.checkRewards(social.sendLetter)) paintHud(); }, 4500);   // 收齊圖鑑、捐齊博物館、家具目錄里程碑：寄信送獎勵
  const spl = $('splash'); if (spl) { spl.classList.add('out'); setTimeout(() => spl.remove(), 700); }
  const HOLIDAY_BGM = new Set(['newyear', 'lantern', 'mid_autumn', 'halloween', 'xmas', 'solstice']);   // 放祭典配樂的節日
  Audio.start(() => { const h = hourOverride ?? nowHour(), d = new Date(); return { month: d.getMonth() + 1, hour: Math.floor(h), night: skyU.night.value > 0.5, rain: weather.raining(), festival: events.active().some(e => e !== 'spring'), holiday: events.active().some(e => HOLIDAY_BGM.has(e)) }; });
  const s = S();
  if (s.tool) setTool(player, s.tool);
  onConcept((c, r) => { Audio.sfx('ok'); ui.toast(`概念「${c.name}」升格 ${'●'.repeat(r.s)}${'○'.repeat(4 - r.s)}${r.s === 2 ? '：已驗證！' : r.s === 1 ? '：過幾天再做對一輪就驗證了' : ''}`); });   // v7.1 概念應用
  guide.init({   // 左上角的任務欄（新存檔會進入新手引導，之後一直有「現在可以做」）
    openMiles: () => miles.open(id => { wardrobe.own('hats', id); ui.toast('到衣櫃換上新帽子吧！'); }),
    openMail: () => { if (!talking && !ui.dialogOpen()) social.openMail(); },
    openPlanner: () => { if (!talking && !ui.dialogOpen()) planner.open(paintHud); },
    openReqs: () => { if (!talking && !ui.dialogOpen()) social.phoneList(); },
    openVocab: () => { if (!talking && !ui.dialogOpen()) lexicon.open(); },
    openToday: () => { if (!talking && !ui.dialogOpen()) phoneToday(); },
    chest: () => route.state().ready,
    cramDone: () => cram.doneToday(),
    wishShelf: () => { const w = catalog.wishInfo(dailyStock()).find(x => x.ready && !catalog.orderable(x.f)); return w ? w.f.name : ''; },
    week: () => { const w = tutors().some(v => lab.available(v)) && lab.weekLine(tutors()); return w ? (w.done ? `本週計畫 ✔ ${w.v.name}的研究推進了` : w.ready ? `本週計畫：${w.v.name}的研究可以推進了` : `本週計畫：${w.v.name}「${w.title}」第 ${w.stage} 階段`) : ''; },
    openCram: () => { if (!talking && !ui.dialogOpen()) cram.open(paintHud); },
    openPassport: () => { if (!talking && !ui.dialogOpen()) passport.open(openGame); },
    labReady: () => { const v = lab.firstReady(villagers.filter(x => !x.shop && !x.guest)); return v ? v.name : ''; },
    pin: () => pinNow(), openPin: () => { if (!talking && !ui.dialogOpen()) pinGo(); },
    env: () => ({ hour: hourOverride ?? nowHour(), date: simDate(), raining: weather.raining(), tourney: !!life.tourney }),
  });
  paintTools(); paintHud();
  (async () => {
    if (!TA.S.profile.onboarded) await profile.setup();   // 新存檔：先做船員登記（名字、每日目標、學測日期）
    if (!s.intro) await intro();
    else if (!s.news50) { s.news50 = true; save(); ui.card({ title: '新玩法：練習遊戲與夢境複習', sub: '手機多了「練習遊戲」區：九種各科小遊戲（英聽、成語、函數圖形、期望值、年代、選舉制度、拋射、元素、月相）和練習護照。回到自己家睡一覺，夢裡會重考錯題本的題目。' }); }
    if (relocNote && s.intro) {   // 舊存檔第一次進新島：介紹新的城鎮，說明庭院的東西搬到哪了
      const r = relocNote; relocNote = null;
      await ui.card({ title: '小島改建完成：星環學院', sub: `島上照新的城鎮規劃重建了：碼頭與城門、主街、噴泉廣場，北邊的學院台地上是博物館、考場、圖書館與觀星台。<br>你的家搬到廣場西邊` + (r.moved ? `，庭院裡的 ${r.moved} 樣擺設與花也跟著搬過去了。` : '。') + (r.refund ? `<br>放不下的設計已退回 ${r.refund} 鈴錢。` : '') + (r.bagged ? `<br>${r.bagged} 株花收回種子袋。` : '') });
    }
    if (new URLSearchParams(location.search).get('go')) deepLink(); else if (!welcomeBack()) await routeAsk();
  })();
  focus.resume(paintHud);
}
/** 回島小結：隔了兩天以上再回來時，整理這段時間累積的複習、單字、信件與連續紀錄，給出今天的第一步 */
function welcomeBack() {
  const U2 = TA.U, S0 = TA.S; if (!awayFrom || !S0.profile.onboarded) return false;
  const away = U2.dayNum() - U2.keyToNum(awayFrom); if (!(away >= 2)) return false;
  const due = L.dueList().length, mis = L.mistakes().length, vd = L.vocabDue().length, un = social.unread(), exam = U2.daysUntil(S0.profile.examDate || profile.DEFAULT_EXAM);
  const gap = S0.streak.last ? U2.dayNum() - U2.keyToNum(S0.streak.last) : 99;
  const streak = gap <= 1 ? `連續學習 ${S0.streak.cur} 天，今天也來延續吧！`
    : gap === 2 && S0.streak.shields > 0 ? `今天答滿 10 題（或專注一輪），潮汐護符就會替你保住 ${S0.streak.cur} 天的連續紀錄（護符還有 ${S0.streak.shields} 個）。`
    : S0.streak.best ? `連續學習先歸零了（最長紀錄 ${S0.streak.best} 天）；今天答滿 10 題就重新開始累積。` : '今天答滿 10 題（或專注一輪），就開始累積連續學習天數。';
  const [, mo, da] = awayFrom.split('-').map(Number);
  const body = ui.el('div', 'wb', `<p class="wb-lead">歡迎回來！上次來島上是 <b>${away}</b> 天前（${mo} 月 ${da} 日），大家都在等你。</p>
    <ul class="wb-list"><li>📚 到期複習 <b>${due}</b> 題 · 錯題本 <b>${mis}</b> 題</li><li>🃏 到期單字 <b>${vd}</b> 個</li>${un ? `<li>✉️ 信箱有 <b>${un}</b> 封新信</li>` : ''}<li>🔥 ${streak}</li>${exam > 0 ? `<li>📅 距離學測還有 <b>${exam}</b> 天</li>` : ''}</ul>
    <p class="muted">${away >= 7 && due > 30 ? '到期的題目比較多，不用一次補完：今天先做每日潮汐，其他的交給島民慢慢出題。' : '從每日潮汐開始最省力：12 題裡已經排好到期的複習、弱點和新題。'}</p>
    <div class="td-acts"><button type="button" class="btn gold" data-w="daily">每日潮汐</button>${vd ? '<button type="button" class="btn" data-w="vocab">單字燈塔</button>' : ''}${un ? '<button type="button" class="btn" data-w="mail">看信箱</button>' : ''}<button type="button" class="btn" data-w="walk">先到處逛逛</button></div>`);
  body.querySelectorAll('[data-w]').forEach(b => { b.onclick = () => ({ daily: () => voyage.openDaily(), vocab: () => lexicon.open(), mail: () => social.openMail(), walk: () => ui.closePanel() })[b.dataset.w](); });
  ui.panel('歡迎回來', body, { cls: 'phone' });
  return true;
}
/** 舊的學習中心連結（index.html?go=…）會轉到這裡：開始後直接打開對應的面板 */
function deepLink() {
  const q = new URLSearchParams(location.search), go = q.get('go'), sid = q.get('sid'); if (!go) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* file:// 有些瀏覽器不允許 */ }
  const map = { boss: () => (TA.subject(sid) ? voyage.openBoss(sid) : voyage.openChart()), mock: () => hall.openMock(), chart: () => voyage.openChart(TA.subject(sid) ? sid : undefined), daily: () => voyage.openDaily(), rush: () => voyage.openRush(), review: () => hall.openMistakes(), stats: () => hall.openStats(), vocab: () => lexicon.open(), written: () => written.open(), focus: () => focus.open(paintHud), profile: openProfile, home: phoneToday };
  if (map[go]) setTimeout(map[go], 600);
}
async function intro() {
  const v = villagers.find(v => v.shop); talking = v;
  await ui.say(sp(v), `歡迎來到潮汐小島${TA.S.profile.name ? '，' + TA.S.profile.name : ''}！我是商店的店長${v.name}。`);
  await ui.say(sp(v), '這座島上住著十位學院導師。找他們聊天，他們會考你學測題目——答對能拿鈴錢、增加好感度。');
  await ui.say(sp(v), '這四樣工具送你：釣竿（1）、捕蟲網（2）、鏟子（3）、澆水壺（4）。釣魚要答英文單字，捉蟲要答國文題，挖到化石就拿去博物館給史遙鑑定。');
  await ui.say(sp(v), '每天的到期複習和錯題，會優先出現在島上；晚上回家睡覺，夢裡還會重考錯題本的題目。');
  await ui.say(sp(v), (coarse.matches ? '點右下角的手機' : '按 Tab 打開手機') + '，每天先看「今日學習」：它替你排好一條 20 到 60 分鐘的路線，走完就可以收工。想自己挑的話，「自由練習」裡有各科小遊戲和練習護照；「島上指南」整理了島上所有能做的事。');
  await ui.say(sp(v), '不知道先做什麼的話，看左上角的任務欄——它會一步一步告訴你。祝你在島上玩得開心！');
  ui.closeDialog(); talking = null; S().intro = true; S().news50 = true; save();
}
$('start').onclick = startGame;
$('lv').onclick = () => { if (!ui.dialogOpen()) openProfile(); };
{ const el = $('spInfo'), days = TA.U.daysUntil(TA.S.profile.examDate || profile.DEFAULT_EXAM);   // 開始畫面：學測倒數與題庫規模
  if (el) el.textContent = `${days > 0 ? `距離學測 ${days} 天 · ` : ''}${L.ALL.length.toLocaleString()} 道原創題 · ${L.VOCAB.length.toLocaleString()} 個學測單字 · 10 科 ${Object.keys(L.UNITS).length} 個單元`; }
{ const b = $('start'); b.disabled = false; b.classList.remove('loading'); b.textContent = '點一下開始'; }   // 載入完才能按：之前按了也不會有反應，所以先顯示「島嶼載入中…」

/* ---------- 主迴圈 ---------- */
const clock = new THREE.Clock();
const headPos = new THREE.Vector3(), headPos2 = new THREE.Vector3();
const sunTmp = { f: new THREE.Vector3(), v: new THREE.Vector3(), g: new THREE.Vector3(), p: new THREE.Vector3() };
const camOff = new THREE.Vector3(0, 6.6, 14.8), camPos = new THREE.Vector3(), look = new THREE.Vector3(); let camY = null, talkK = 0; const talkMid = new THREE.Vector3();
let zoom = 1, puffT = 0, saveT = 0, hudT = 0;
/** 走路與奔跑的速度（公尺／秒，v6.84.1 起慢一成多）；pace 是現在的速度：起步時幾分之一秒加速到位，搖桿輕推時走得慢 */
const WALK = 3.0, RUN = 5.2;
let pace = 0;
/* 自由視角：滾輪拉近拉遠（拉近時鏡頭同時放低、接近平視），按住右鍵或中鍵拖曳繞著角色轉（左右）與調整俯角（上下）；
   移動方向跟著鏡頭轉。按 Home 回到預設視角。設定會存起來。 */
const camV = Object.assign({ dist: 1, yaw: 0, tilt: 0 }, S().camView || {});
let camYaw = camV.yaw, camDrag = null;
/* 第一人稱視角：F 切換；滾輪拉到最近再往前滾、兩指張開到最近也會進入，往後滾、兩指捏合回到一般鏡頭。
   鏡頭在角色眼睛的位置，拖曳畫面轉頭（左右轉向、上下看），WASD／搖桿照視線方向走，←→ 鍵轉向；聊天時自動看著對方。
   室內、博物館、神秘島、拍照與島嶼設計時暫時換回一般鏡頭。 */
let fpOn = !!camV.fp, fpK = fpOn ? 1 : 0, fpPitch = -0.05, fpWheel = 0, fpWheelT = 0, fpDrag = null, fpFocus = 12, fpFocusW = 12, fpFocusT = 0, fpBack = 0, fpResync = false;
const fpView = () => fpOn && started && !room.inside && (!elsewhere() || house.inside) && !photo.active() && !design.active();   // 住宅的整棟室內也能第一人稱
const fpTmp = { h: new THREE.Vector3(), off: new THREE.Vector3(0, 1.1, 0), f: new THREE.Vector3(), e: new THREE.Vector3(), t: new THREE.Vector3(), p: new THREE.Vector3() };
const fpHand = createHand(player, scene);   // 第一人稱時鏡頭右下角的手與工具
const saveCam = () => { S().camView = { dist: zoom, yaw: camYaw, tilt: camV.tilt, fp: fpOn }; };
function setFp(on) {
  if (on === fpOn) return; fpOn = on; fpWheel = 0; fpDrag = null;
  if (on) {
    const a = player.rotation.y + Math.PI; camYaw = Math.atan2(Math.sin(a), Math.cos(a)); fpPitch = -0.05; scenicOn = false;   // 從角色面向的方向看出去
    ui.toast(coarse.matches ? '第一人稱視角：拖曳畫面轉頭、搖桿移動（兩指捏合回到一般鏡頭）' : '第一人稱視角：拖曳畫面轉頭、WASD 移動、←→ 轉向（再按 F 或滾輪往後回到一般鏡頭）');
  } else ui.toast('回到一般鏡頭');
  saveCam();
}
settings.hooks.fp = { get: () => fpOn, set: setFp };   // 設定頁的開關
/** 第一人稱轉頭：拖曳的位移換成左右轉向與上下看 */
function fpLook(dx, dy, touch) { const k = touch ? 0.0075 : 0.0055; camYaw -= dx * k; fpPitch = THREE.MathUtils.clamp(fpPitch - dy * k, -1.2, 1.2); }
/** 視角與近裁切面：一般鏡頭 36°；第一人稱放寬（直式螢幕再寬一點），近裁切面拉近才不會貼著牆看穿過去。k：第一人稱的程度 */
function fpLens(k, nearIn) {   // nearIn：整棟室內的第三人稱鏡頭貼著牆，近裁切面也要近
  const a = camera.aspect > 0.2 ? camera.aspect : 1.6, wide = a >= 1.3 ? 60 : Math.min(88, 2 * Math.atan(Math.tan(Math.PI / 6) * 1.3 / a) * 180 / Math.PI);   // 視窗大小還是 0 時（aspect 是 NaN）先當成橫式
  const fov = 36 + (wide - 36) * k, near = k > 0.5 ? 0.15 : nearIn || 0.5;
  if (!(Math.abs(camera.fov - fov) <= 0.01) || camera.near !== near) { camera.fov = fov; camera.near = near; camera.updateProjectionMatrix(); }
  player.visible = k < 0.6;   // 鏡頭進到頭裡之前把自己藏起來
}
zoom = camV.dist;
addEventListener('wheel', e => {
  if (ui.panelOpen() || room.inside || (elsewhere() && !house.inside)) return;
  if (!photo.active() && !design.active()) {   // 第一人稱：往後滾回到一般鏡頭；拉到最近後繼續往前滾就進入
    const now = performance.now(); if (now - fpWheelT > 450) fpWheel = 0; fpWheelT = now;
    if (fpOn) { if (e.deltaY > 0 && (fpWheel += e.deltaY) > 80) setFp(false); return; }
    if (zoom <= 0.381 && e.deltaY < 0) { if ((fpWheel -= e.deltaY) > 260) { setFp(true); return; } } else fpWheel = 0;
  }
  zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.0012, 0.38, 1.8); saveCam();
}, { passive: true });
addEventListener('pointermove', e => {
  if (fpDrag && e.pointerId === fpDrag.id) {   // 拖曳轉視角：第一人稱轉頭；觸控的第三人稱繞著角色轉、上下調俯角（和右鍵拖曳一樣）。移動超過幾個像素才算拖曳，否則放開時當成點一下
    if (!fpDrag.moved && Math.hypot(e.clientX - fpDrag.x0, e.clientY - fpDrag.y0) > 7) fpDrag.moved = true;
    if (fpDrag.moved && fpView()) fpLook(e.clientX - fpDrag.x, e.clientY - fpDrag.y, e.pointerType === 'touch');
    else if (fpDrag.moved) { camYaw -= (e.clientX - fpDrag.x) * 0.0075; camV.tilt = THREE.MathUtils.clamp(camV.tilt + (e.clientY - fpDrag.y) * 0.004, -0.35, 0.55); }
    fpDrag.x = e.clientX; fpDrag.y = e.clientY; return;
  }
  if (!camDrag) return;
  if (fpView()) fpLook(e.clientX - camDrag.x, e.clientY - camDrag.y, false);
  else { camYaw -= (e.clientX - camDrag.x) * 0.006; camV.tilt = THREE.MathUtils.clamp(camV.tilt + (e.clientY - camDrag.y) * 0.004, -0.35, 0.55); }
  camDrag.x = e.clientX; camDrag.y = e.clientY;
});
addEventListener('pointerup', e => {
  if (fpDrag && e.pointerId === fpDrag.id) { const d = fpDrag; fpDrag = null; if (d.moved) saveCam(); else if (e.pointerType !== 'mouse' && joy.id === null && !ui.cardOpen() && !ui.dialogOpen()) tapAt(e.clientX, e.clientY); return; }   // 點一下：走過去（按著搖桿時不算，免得轉視角時手指沒滑開就改了方向）
  if (camDrag && (e.button === 1 || e.button === 2)) { camDrag = null; saveCam(); }
});
addEventListener('pointercancel', e => { if (fpDrag && e.pointerId === fpDrag.id) fpDrag = null; });
/** 依縮放與俯角算出鏡頭相對角色的位置（未含左右旋轉） */
function viewOffset(out) {
  const k = THREE.MathUtils.clamp((zoom - 0.38) / (1.8 - 0.38), 0, 1);
  const pitch = THREE.MathUtils.clamp(THREE.MathUtils.lerp(0.12, 0.58, Math.pow(k, 0.8)) + camV.tilt, 0.05, 1.2), dist = 16.2 * zoom;   // 拉近時接近平視
  return out.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
}
camPos.copy(player.position).add(camOff);
const puffs = [];
function puff(x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#fffaf0', transparent: true, opacity: 0.8 })); m.position.set(x + (Math.random() - 0.5) * 0.2, y + 0.05, z + (Math.random() - 0.5) * 0.2); m.userData.t = 0; scene.add(m); puffs.push(m); }
const awayFrom = S().day || '';   // 上次登島的日期：下一行的 newDay 會覆寫它，回島小結要先記下來
newDay(() => { social.newDay(); gardenMsg = garden.newDay(); }); memo.anniversary(); if (!S().reqs) social.newDay(); life.layoutSpots(); events.refresh(); events.gifts(social.sendLetter, villagers); report.weekly(social.sendLetter);
setInterval(() => { if (catalog.checkRewards(social.sendLetter)) paintHud(); }, 30000);   // 捐贈、收集之後：收集獎勵
setInterval(() => { if (weather.raining()) garden.rain(); if (newDay(() => { social.newDay(); gardenMsg = garden.newDay(); })) { pendingMove = true; life.layoutSpots(); events.refresh(); events.gifts(social.sendLetter, villagers); guest.refresh(); birthdayNews(); diy.layout(); tide.refresh(); report.weekly(social.sendLetter); memo.anniversary(); ui.toast('新的一天開始了！看看信箱和島民的委託吧'); if (gardenMsg) { const m = gardenMsg; gardenMsg = ''; setTimeout(() => ui.toast('🌷 ' + m), 1800); } setTimeout(milestones, 3000); typhoonNews(); } paintHud(); }, 30000);

let simT = 0, camPull = 1;   // camPull：鏡頭碰撞時拉近到原本距離的幾成
let scenic = 0, scenicOn = false;
const camRay = new THREE.Raycaster(), camCol = { a: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1.0, 0) };
camRay.camera = camera;   // Sprite 的射線檢測需要攝影機（否則碰到蟲子等貼圖會報錯）
let camBlk = null, camBlkT = 0;
/** 會擋住鏡頭的東西：房子、建築與樹（每 2 秒更新一次清單；角色、草、地形、水不算） */
function camBlockers() {
  if (camBlk && performance.now() - camBlkT < 2000) return camBlk;
  camBlkT = performance.now();
  return (camBlk = scene.children.filter(o => o.isGroup && (o.children.length > 3 || o.userData.culled) && !(o.userData && o.userData.walk !== undefined) && o !== player));   // culled：建築的零件收進了一個 body 群組（props3d.register），子物件少但還是會擋
}
const UPV = new THREE.Vector3(0, 1, 0);
const SCENIC = new THREE.Vector3(0, 4.8, 12.5), SCENIC_L = new THREE.Vector3(0, -0.3, -2.5), scTmp = { o: new THREE.Vector3(), l: new THREE.Vector3(), d: new THREE.Vector3() };
function toggleScenic() { if (fpOn) { fpOn = false; scenicOn = false; saveCam(); } scenicOn = !scenicOn; ui.toast(scenicOn ? '風景鏡頭：視角放低，看得到更遠的海、天空與遠山（再按 V 回到一般鏡頭）' : '回到一般鏡頭'); }
const hzTmp = { f: new THREE.Vector3(), p: new THREE.Vector3(), r: new THREE.Vector3() };
const MOON_AZ = 0.55;   // 月亮的方位（北偏東，和 engine.js 的月光方向一致）
const FP_EYE = 0.03;   // 眼睛比頭骨高一點（和島民的眼睛差不多高）
/** 第一人稱自動對焦：沿視線找最先碰到的地面、房子、樹或島民 */
function fpAutoFocus(eye, fw) {
  let d = 40;
  for (let s = 0.5; s < 40; s += s < 8 ? 0.35 : 1) { const x = eye.x + fw.x * s, z = eye.z + fw.z * s; if (eye.y + fw.y * s < Math.max(ground(x, z), 0.02)) { d = s; break; } }
  camRay.set(eye, fw); camRay.far = d;
  const hit = camRay.intersectObjects(camBlockers(), true).find(h => h.object.isMesh && h.object.visible); if (hit) d = hit.distance;
  for (const v of villagers) { if (!v.mesh.visible) continue; const p = hzTmp.p.copy(v.mesh.position); p.y += 1.0; p.sub(eye); const L = p.length(); if (L < d && p.dot(fw) > L * 0.975) d = L; }
  return THREE.MathUtils.clamp(d, 3, 40);
}
/* ---------- 跳躍：空白鍵（手機「跳」鈕）。落地前最多跳三次：二段跳、三段跳（前空翻） ---------- */
const JUMP_V = [6.4, 6.0, 7.4], GRAV = 22;
/** 腳步聲：依腳下的地面換音色（碼頭木板、石板路與石橋、雪地、沙灘、草地） */
let stepAcc = 0;
function footstep(fast) {
  const p = player.position, [tx, tz] = tileOf(p.x, p.z), tl = tileAt(p.x, p.z);
  const k = onPier(p.x, p.z) ? 'st_wood' : onRoad(p.x, p.z) || isBridge(tx, tz) ? 'st_stone' : seasons.snowK() > 0.5 && tl !== 0 ? 'st_snow' : tl === 0 ? 'st_sand' : 'st_grass';
  Audio.sfx(k, { vol: fast ? 1.35 : 1 });
}
const jump = { air: false, v: 0, n: 0, flip: 0, squash: 0, safe: null }, inBuf = { act: 0, jump: 0 }, lastDir = new THREE.Vector2(0, 1), sink = { t: 0, to: null };
function doJump() {
  if (sitting) { standUp(); return; }
  if (dreamisle.inside) { if (!talking && !ui.dialogOpen() && !ui.panelOpen()) dreamisle.jump(); return; }
  if (!started || room.inside || elsewhere() || design.active() || life.busy || life.fishing() || talking || ui.dialogOpen() || ui.cardOpen() || ui.panelOpen()) return;
  if (jump.n >= 3) { inBuf.jump = performance.now(); return; }   // 三段跳還在空中：落地時補跳
  jump.air = true; jump.n++; jump.v = JUMP_V[jump.n - 1]; if (jump.n === 3) { jump.flip = 0.0001; setExpr(player, 'happy', 1); }
  const p = player.position; for (let i = 0; i < (jump.n === 1 ? 3 : 6); i++) puff(p.x, p.y, p.z);
  Audio.sfx('jump', { pitch: (jump.n - 1) * 4 });   // 一段比一段高
}
/** 每幀更新高度：地面上貼著地板走（走出邊緣會掉下去），空中受重力；落水會被沖回岸邊。回傳是否在空中 */
function jumpTick(dt) {
  const p = player.position;
  if (!jump.air) {
    const f = floorAt(p.x, p.z, p.y);
    if (f < p.y - 0.5) { jump.air = true; jump.v = 0; }   // 走出屋頂、石頭或高台邊緣：開始往下掉
    else { p.y += (f - p.y) * Math.min(1, dt * 14); if (!isWater(p.x, p.z)) jump.safe = [p.x, p.z]; return false; }
  }
  jump.v -= GRAV * dt; const prev = p.y; p.y += jump.v * dt;
  if (jump.flip) jump.flip = Math.min(1, jump.flip + dt * 1.9);
  const f = floorAt(p.x, p.z, prev);
  if (jump.v < 0 && p.y <= f) {   // 落地
    const imp = Math.min(1.6, -jump.v / 8); p.y = f; jump.v = 0; jump.flip = 0; jump.air = false; jump.squash = jump.n >= 2 ? 0.35 : 0.22; jump.n = 0;
    if (isWater(p.x, p.z) && f >= ground(p.x, p.z) - 0.01 && !colliders.some(c => (c.r ? Math.hypot(c.x - p.x, c.z - p.z) < c.r : p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1) && Math.abs(colTop(c) - f) < 0.01)) {
      Audio.sfx('splash'); for (let i = 0; i < 8; i++) puff(p.x, p.y, p.z); setExpr(player, 'surprised', 1.5);
      waves.ripple(p.x, p.z, 0.6); waves.ripple(p.x, p.z, 1.1);
      ui.toast('撲通！掉進水裡了，被浪推回岸邊');
      sink.t = 0.45; sink.to = jump.safe || [PLAZA[0], PLAZA[1] + 2]; moveTo = null; shake.kick(0.03); shake.haptic('tap');   // 先沉下去一下，再用圓形轉場送回岸邊（以前直接瞬移）
    } else {
      for (let i = 0; i < 4; i++) puff(p.x, p.y, p.z); Audio.sfx('land', { vol: 0.5 + imp * 0.6 }); if (imp > 1.05) { shake.kick(0.03 * imp); shake.haptic('tap'); }
      const nw = performance.now();   // 輸入緩衝：落地前一瞬間按的跳躍、互動不會被吃掉
      if (nw - inBuf.jump < 150) { inBuf.jump = 0; setTimeout(doJump, 0); } else if (nw - inBuf.act < 150) { inBuf.act = 0; setTimeout(act, 0); }
    }
    return false;
  }
  return true;
}
/** 空中姿勢：舉手、縮腿；第三跳繞身體中心前空翻；落地時壓扁一下 */
function jumpPose(dt) {
  const u = player.userData, b = u.body, air = jump.air;
  u.airK = (u.airK || 0) + ((air ? 1 : 0) - (u.airK || 0)) * Math.min(1, dt * (air ? 12 : 9));   // 3D 模型的空中縮腿、揚手（actors.js 的 airPose 下一格套用）
  if (u.gltf) {   // 3D 模型：空翻與落地壓扁套在模型本身（以前改的是隱藏的 Q 版身體，看不到）
    const m = u.gltf.model, H = u.gltf.base, a = air && jump.flip ? jump.flip * Math.PI * 2 : 0, c = 0.55;
    m.rotation.x = a; m.position.set(H.x, H.y + c - c * Math.cos(a) + (air ? 0 : u.gltf.hop || 0), H.z - c * Math.sin(a)); u.isPlayer = true;
    jump.squash = Math.max(0, jump.squash - dt * 2.2);
    const k = Math.sin(jump.squash / 0.35 * Math.PI) * 0.18, S = u.gltf.baseS; m.scale.set(S * (1 + k * 0.6), S * (1 - k), S * (1 + k * 0.6));
    return;
  }
  if (air) {
    u.arms[0].rotation.x = u.arms[1].rotation.x = -2.5; u.legs[0].rotation.x = 0.5; u.legs[1].rotation.x = -0.3;
    const a = jump.flip ? jump.flip * Math.PI * 2 : 0, c = 0.55;   // 以身體中心（離地約 0.55）為軸翻轉
    b.rotation.x = a; b.position.y += c - c * Math.cos(a); b.position.z = -c * Math.sin(a);
  } else { b.rotation.x = 0; b.position.z = 0; }
  jump.squash = Math.max(0, jump.squash - dt * 2.2);
  const k = Math.sin(jump.squash / 0.35 * Math.PI) * 0.18; b.scale.set(1 + k * 0.6, 1 - k, 1 + k * 0.6);
}
const houseHand = createHand(player, house.scene);   // 整棟室內的第一人稱手（室內是另一個場景）
/** 整棟室內的每一格：天色跟著島上時間、第一人稱的過渡與手、互動提示 */
function houseTick(dt, t, ix, iz, len, moving, run, locked, fpNow) {
  seasons.update(dt, t, { inside: true });
  player.userData.umbrella.visible = false; villagers.forEach(v => { v.mesh.userData.umbrella.visible = false; v.tag.style.opacity = 0; });
  const { golden } = applyTime(hourOverride ?? nowHour());
  fpK += ((fpNow ? 1 : 0) - fpK) * Math.min(1, dt * 4.5); if (Math.abs(fpK - (fpNow ? 1 : 0)) < 0.003) fpK = fpNow ? 1 : 0;
  fpLens(fpK, 0.12);
  house.tick(dt, t, { ix, iz, len, moving, run, locked, night: skyU.night.value, golden, fpK, yaw: camYaw, pitch: fpPitch, tilt: camV.tilt, zoom });
  if (!house.inside) return;
  houseHand.update(dt, { active: fpK > 0.92, show: fpNow && !talking && !ui.dialogOpen() && !ui.cardOpen() && !ui.panelOpen(), camera, tool: player.userData.tool, umbrella: false, fishing: false, moving, run, yaw: camYaw, pitch: fpPitch, t });
  photo.grab(renderer.domElement); memo.grab(renderer.domElement);
  let pr = $('labels').querySelector('.prompt'); const h = !locked && house.hint();
  if (h) { if (!pr) { pr = ui.el('div', 'prompt'); $('labels').appendChild(pr); } pr.innerHTML = `<kbd>E</kbd>${h}`; const [x, y] = screenOf(player, 2.25); pr.style.left = x + 'px'; pr.style.top = y + 'px'; }
  else if (pr) pr.remove();
  document.body.classList.toggle('talking', ui.dialogOpen() || ui.cardOpen());
  $('actBtn').textContent = h || (ui.dialogOpen() || ui.cardOpen() ? '繼續' : '動作');
  hudT += dt; if (hudT > 2) { hudT = 0; paintHud(); }
}
function tick(fixed) {
  const dt = fixed || Math.min(0.05, clock.getDelta()); simT += dt; const t = simT;
  post.fx.hold = ui.answering();   // 作答中：背景不重畫（post.render 停在最後一格）
  U.uOccR.value = 0;   // 遮擋鏤空只在島上戶外啟用（下面戶外段落才會設定）
  U.uTime.value = t;
  if (sink.t > 0) { sink.t -= dt; player.position.y -= dt * 1.6; if (sink.t <= 0) { const s = sink.to; player.position.set(s[0], ground(s[0], s[1]), s[1]); camY = null; ui.iris(560); } }   // 落水：沉下去 → 轉場 → 回到岸邊
  const locked = !started || talking || ui.dialogOpen() || ui.cardOpen() || ui.panelOpen() || life.busy || astro.isOpen() || photo.active() || focus.active() || sink.t > 0;
  const fpNow = fpView();
  if (fpNow && fpResync) { const a = player.rotation.y + Math.PI; camYaw = Math.atan2(Math.sin(a), Math.cos(a)); fpPitch = -0.05; fpResync = false; }   // 從室內、博物館、神秘島回來：看向角色面對的方向（不是剛走出來的門）
  let ix = (keys.KeyD || (keys.ArrowRight && !fpNow) ? 1 : 0) - (keys.KeyA || (keys.ArrowLeft && !fpNow) ? 1 : 0) + joy.x, iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + joy.y;
  if (fpNow && !locked) camYaw -= ((keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0)) * dt * 2.2;   // 第一人稱：←→ 轉向，A／D 橫移
  if (locked || life.fishing()) { ix = iz = 0; if (locked) moveTo = null; }
  if (ix || iz) moveTo = null;
  if ((ix || iz) && camYaw && !room.inside && (!elsewhere() || house.inside)) { const c = Math.cos(camYaw), s = Math.sin(camYaw), rx = ix * c + iz * s, rz = -ix * s + iz * c; ix = rx; iz = rz; }   // 鏡頭轉了，前後左右也跟著轉
  if (moveTo) { const dx = moveTo.x - player.position.x, dz = moveTo.z - player.position.z, d = Math.hypot(dx, dz); if (d < (moveTo.talk ? 1.3 : 0.15)) { const v = moveTo.talk; moveTo = null; if (v) { player.rotation.y = Math.atan2(dx, dz); talk(v); } } else { ix = dx / d; iz = dz / d; if (fpNow && d > 0.6) camYaw = angLerp(camYaw, Math.atan2(-ix, -iz), Math.min(1, dt * 5)); } }   // 第一人稱點地面走過去：視線跟著轉過去
  if (sitting && !locked && (ix || iz)) standUp();
  if (sitting) { ix = iz = 0; moveTo = null; }
  const run = keys.ShiftLeft || keys.ShiftRight || joy.run, len = Math.hypot(ix, iz), moving = len > 0.01;
  { const away = room.inside || elsewhere(); if (away !== wasAway) { wasAway = away; moveTo = null; } if (!away && pendingMove) { pendingMove = false; move.apply(villagers); } }   // 跨日的搬家：在島上時才搬（不會在你拜訪時把房子搬走）   // 進出室內、離島：上一個場景點的目的地不能帶過去
  if (house.inside) {
    minimap.update(dt, false);   // v8.2 室內收起島上的小地圖（地名不會停在進門前）
    if (myHouseCls !== (houseSid === 'player')) { myHouseCls = houseSid === 'player'; document.body.classList.toggle('my-house', myHouseCls); }   // 自己家顯示 🛋 裝潢鈕
    houseTick(dt, t, ix, iz, len, moving, run, locked, fpNow); return;
  }
  if (room.inside || elsewhere()) { seasons.update(dt, t, { inside: true }); fpK = 0; fpLens(0); fpResync = true; }   // 室內、博物館、神秘島不顯示島上的季節，也用一般鏡頭
  if (room.inside || elsewhere()) { player.userData.umbrella.visible = dreamisle.inside && dreamisle.raining() && !player.userData.tool; villagers.forEach(v => { v.mesh.userData.umbrella.visible = false; }); }   // 室內不撐傘（傘只在島上的每一格依雨勢更新，進門前在下雨就會一直撐著）；回到島上的下一格自動恢復
  if (room.inside) { roomTick(dt, t, ix, iz, len, moving, locked); return; }
  if (elsewhere()) {
    if (trip.inside || yuehome.inside || shopin.inside) applyTime(hourOverride ?? nowHour());   // 天色跟著主島的時間，岳家的窗景與燈光也跟著變化
    if (yuehome.inside) yuehome.tick(dt, t, ix, iz, len, moving, run, locked, skyU.night.value); else if (shopin.inside) shopin.tick(dt, t, ix, iz, len, moving, run, locked, skyU.night.value); else if (museum.inside) museum.tick(dt, t, ix, iz, len, moving, run, locked); else if (dreamisle.inside) dreamisle.tick(dt, t, ix, iz, len, moving, run, locked); else trip.tick(dt, t, ix, iz, len, moving, run, locked);
    let pr = $('labels').querySelector('.prompt'); const h = !locked && (yuehome.inside ? yuehome.hint() : shopin.inside ? shopin.hint() : museum.inside ? museum.hint() : dreamisle.inside ? dreamisle.hint() : trip.tripHint());
    if (h) {
      if (!pr) { pr = ui.el('div', 'prompt'); $('labels').appendChild(pr); }
      pr.innerHTML = `<kbd>E</kbd>${h}`; const [x, y] = screenOf(player, 2.25);
      const half = yuehome.inside ? pr.offsetWidth / 2 + 10 : 0;
      pr.style.left = (half ? THREE.MathUtils.clamp(x, half, innerWidth - half) : x) + 'px'; pr.style.top = y + 'px';
    } else if (pr) pr.remove();
    villagers.forEach(v => { v.tag.style.opacity = 0; });
    document.body.classList.toggle('talking', ui.dialogOpen() || ui.cardOpen());
    $('actBtn').textContent = h || (ui.dialogOpen() || ui.cardOpen() ? '繼續' : '動作');
    hudT += dt; if (hudT > (life.tourney ? 0.25 : 2)) { hudT = 0; paintHud(); }
    return;
  }
  if (moving) {
    const want = (run ? RUN : WALK * (0.3 + 0.7 * Math.min(1, len))) * cooking.speedMul();   // 搖桿推多少走多快（鍵盤、點地面 = 一般走路）
    pace = Math.max(pace, want * 0.4); pace += (want - pace) * Math.min(1, dt * 7);   // 起步從四成速度加速上去，不會一按就全速衝出去
    ix /= len; iz /= len;
    { const d = Math.abs(Math.atan2(Math.sin(Math.atan2(ix, iz) - player.rotation.y), Math.cos(Math.atan2(ix, iz) - player.rotation.y)));   // 急轉彎（超過約 100°）：先減速再轉過去，有重量感
      if (d > 1.75 && !keys.KeyC && !fpNow) pace *= Math.max(0.35, 1 - dt * 9); }
    lastDir.set(ix, iz);
    if (!stepChar(player, ix, iz, dt, pace) && moveTo) moveTo = null;
    if (!keys.KeyC) player.rotation.y = angLerp(player.rotation.y, Math.atan2(ix, iz), Math.min(1, dt * 12));   // 按住 C：螃蟹走路（鎖定面向）
    const snowy = seasons.snowK() > 0.5 && tileAt(player.position.x, player.position.z) !== 0;   // 雪地上走路也會踢起細雪
    if ((run || snowy) && (puffT -= dt) < 0) { puffT = run ? 0.12 : 0.26; puff(player.position.x, player.position.y, player.position.z); }
  }
  if (fpNow && !sitting) player.rotation.y = camYaw + Math.PI;   // 第一人稱：身體朝著視線（面前的島民、門、釣魚的方向都以看的地方為準）
  const inAir = sink.t > 0 ? false : jumpTick(dt);   // 落水沉下去的那一下不貼地
  if (moving && !inAir && !sitting) { const fast = run && pace > WALK * 1.15, SL = fast ? 0.9 : 0.62; stepAcc += pace * dt; if (stepAcc > SL) { stepAcc -= SL; footstep(fast); } } else stepAcc = 0.45;   // 腳步聲：每走一步一聲
  { const tv = talking && talking.mesh ? talking : nearV; lookAt(player, tv && tv.mesh ? headPos2.copy(tv.mesh.position).setY(tv.mesh.position.y + 1.1) : null); }
  if (ui.cardOpen()) setExpr(player, 'happy', 0.5);   // 抓到、解鎖成就時開心
  if (!moving) {   // 放開方向鍵：約 0.1 秒內滑停（走路動作淡出的時候腳不會在原地滑）
    if (pace > 0.35 && !locked && !inAir && !sitting) { pace *= Math.exp(-dt * 20); stepChar(player, lastDir.x, lastDir.y, dt, pace); } else pace = 0;
  }
  animate(player, dt, moving && !inAir ? (run && pace > WALK * 1.15 ? 2 : 1) : 0, t, moving ? THREE.MathUtils.clamp(pace / (run && pace > WALK * 1.15 ? RUN : WALK), 0.45, 1.2) : 1); jumpPose(dt);   // 腳步跟著速度：慢走時步伐也慢，腳不會在地上滑
  if (sitting) { const [sx, sz] = slotPos(sitting.seat, sitting.slot); player.position.set(sx, seatY(sitting.seat), sz); player.rotation.y = sitting.seat.ry; jump.air = false; sitTick(dt); }
  // 島民
  nearV = null; let best = 2.2;
  const hourNow = hourOverride ?? nowHour();
  town.update(dt, hourNow, player, !!talking); popTick();
  mindCtx.hour = hourNow; mind.update(simT, villagers.filter(v => thinks(v) && !v.away && v.mesh.visible), mindCtx);
  const [plx, ply] = screenOf(player, 1.6), plD = camera.position.distanceTo(player.position);   // 角色頭上在畫面的位置：後面島民的名牌疊上來時淡一點
  villagers.forEach(v => {
    const away = whereOf(v, hourNow) !== 'out' && talking !== v;
    v.away = away; v.mesh.visible = !away;
    if (away) { v.tag.style.opacity = 0; v.benchGoal = null; v.goPlayer = 0; return; }   // 回家或睡覺：要去的長椅與打招呼都取消
    const m = v.mesh, dpx = player.position.x - m.position.x, dpz = player.position.z - m.position.z, dp = Math.hypot(dpx, dpz);
    let mv = 0;
    if (v.sitting) {
      const st = v.sitting.seat, [sx, sz] = slotPos(st, v.sitting.slot); m.position.set(sx, seatY(st), sz); m.rotation.y = st.ry; setSit(m, true);
      lookAt(m, sitting && sitting.mate === v && Math.sin(t * 0.4 + v.mesh.id) > 0.2 ? headPos.copy(player.position).setY(player.position.y + 1.1) : null); animate(m, dt, 0, t);
      if (v.standAt && simT > v.standAt) standVillager(v);
      const [tx, ty, tvis] = screenOf(m, 1.6); v.tag.style.left = tx + 'px'; v.tag.style.top = ty + 'px'; v.tag.style.opacity = tvis && dp < 7 ? 0.9 : 0;
      return;
    }
    if (v.sitGoal) {
      const g = v.sitGoal; v.target = [g.x, g.z]; v.wait = 99;
      const [gx, gz] = slotPos(g.seat, g.slot);
      if (Math.hypot(m.position.x - g.x, m.position.z - g.z) < 0.45 || Math.hypot(m.position.x - gx, m.position.z - gz) < 1.5) { v.sitting = { seat: g.seat, slot: g.slot }; v.sitGoal = null; Audio.sfx('pop'); puff(gx, seatY(g.seat) + 0.3, gz); }   // 走到旁邊就坐上去（被椅子擋住也沒關係）
      else if (simT > g.until || !sitting || sitting.seat !== g.seat) { v.sitGoal = null; v.wait = 1; if (sitting && sitting.mate === v) sitting.mate = null; }
    }
    if (v.benchGoal) {   // 走去長椅（mind.js）：到了而且位子還空著就坐下；逾時就取消（不管現在是不是停在玩家旁邊）
      const g = v.benchGoal;
      if (Math.hypot(m.position.x - g.front[0], m.position.z - g.front[1]) < 0.5) { v.benchGoal = null; v.wait = 1; if (seatFree(g.seat, g.slot, v)) { v.sitting = { seat: g.seat, slot: g.slot }; v.standAt = simT + g.stay; } }
      else if (simT > g.until) { v.benchGoal = null; v.wait = 1; }
    }
    if (v.goPlayer) {   // 自己決定走過來打招呼（mind.js）：跟著玩家走，到了就說一句問候
      if (dp < 2.6 && !talking) { v.goPlayer = 0; v.wait = 4; if (v.popQuiz) { v.popQuiz = false; popTalk(v); } else greetPlayer(v); }
      else if (simT > v.goPlayer || talking || sitting) { v.goPlayer = 0; v.wait = 1; v.popQuiz = false; }
      else { v.target = [player.position.x - dpx / (dp || 1) * 1.6, player.position.z - dpz / (dp || 1) * 1.6]; v.wait = 99; }
    }
    if (v.faceTo && !v.sitGoal && !(talking === v || dp < 2.4)) { const fx = v.faceTo.mesh.position.x - m.position.x, fz = v.faceTo.mesh.position.z - m.position.z; m.rotation.y = angLerp(m.rotation.y, Math.atan2(fx, fz), Math.min(1, dt * 6)); }
    else if (talking === v || (dp < 2.4 && !v.chatting && !v.sitGoal)) m.rotation.y = angLerp(m.rotation.y, Math.atan2(dpx, dpz), Math.min(1, dt * 6));
    else {
      v.wait -= dt;
      if (v.wait <= 0 && !v.chatting && !decide(v, dp, hourNow)) { v.target = [v.home[0] + (Math.random() - 0.5) * v.range * 2, v.home[1] + (Math.random() - 0.5) * v.range * 2]; v.wait = 3 + Math.random() * 5; }
      const dx = v.target[0] - m.position.x, dz = v.target[1] - m.position.z, d = Math.hypot(dx, dz);
      if (d > 0.2) { if (stepChar(m, dx / d, dz / d, dt, 1.3)) { mv = 1; m.rotation.y = angLerp(m.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6)); } else v.target = [m.position.x, m.position.z]; }
    }
    m.position.y += (ground(m.position.x, m.position.z) - m.position.y) * Math.min(1, dt * 10);
    setTalk(m, talking === v && ui.typing() && ui.speakerName() === v.name);
    lookAt(m, talking === v || dp < 4.5 ? headPos.copy(player.position).setY(player.position.y + 1.1) : (v.faceTo ? headPos.copy(v.faceTo.mesh.position).setY(v.faceTo.mesh.position.y + 1.1) : null));
    animate(m, dt, mv, t);
    const facing = (-dpx * Math.sin(player.rotation.y) - dpz * Math.cos(player.rotation.y)) / (dp || 1);
    if (dp < best && !talking && !sitting && !v.sitGoal && (facing > 0.35 || !player.userData.tool)) { best = dp; nearV = v; }
    const [sx, sy, vis] = screenOf(m, 1.75); v.tag.style.left = sx + 'px'; v.tag.style.top = sy + 'px'; v.tag.style.opacity = vis && dp < 7 && talking !== v ? Math.min(1, (7 - dp) / 2) * (Math.hypot(sx - plx, sy - ply) < 64 && camera.position.distanceTo(m.position) > plD ? 0.25 : 1) : 0;   // 只顯示附近島民的名牌，避免互相重疊
  });
  // 提示
  let pr = $('labels').querySelector('.prompt');
  const tool = player.userData.tool;
  nearDoor = locked || Math.cos(player.rotation.y) > -0.3 ? null : DOORS().find(d => Math.hypot(player.position.x - d.door[0], player.position.z - d.door[1]) < 1.3) || null;
  nearMail = !!myHome && !locked && !nearDoor && Math.hypot(player.position.x - mailPos[0], player.position.z - mailPos[1]) < 1.2;
  if (nearDoor || nearMail) nearV = null;
  const gHint = !locked && !nearDoor && !nearMail && !nearV && !design.active() ? ((sitting ? '站起來' : nearSeat() ? '坐下' : '') || highland.hint() || hotel.hint() || trip.hint() || tablets.hint() || balloon.hint() || spirit.hint() || winter.hint() || garden.hint(tool, tool === 'shovel' && life.spotAhead()) || diy.hint(tool) || tide.hint(tool)) : '';
  const hint = !locked && (design.active() ? (coarse.matches ? '放置' : '放置（Esc 結束）') : nearDoor ? nearDoor.label : nearMail ? '看信箱' + (social.unread() ? `（${social.unread()}）` : '') : nearV ? '聊天' : gHint ? gHint : tool === 'can' ? '澆水' : tool === 'rod' ? (life.fishing() ? { bite: '拉起！', nibble: '等一下…' }[life.rodState()] || '收竿' : '拋竿') : tool === 'net' ? '揮網' : tool === 'shovel' ? '挖掘' : '');
  if (hint) { if (!pr) { pr = ui.el('div', 'prompt'); $('labels').appendChild(pr); } pr.innerHTML = `<kbd>E</kbd>${hint}`; pr.classList.toggle('urgent', hint === '拉起！'); $('actBtn').classList.toggle('urgent', hint === '拉起！'); const [x, y] = fpK > 0.5 ? [innerWidth / 2, innerHeight * 0.64] : screenOf(nearV && !nearDoor && !nearMail ? nearV.mesh : player, 2.25); pr.style.left = x + 'px'; pr.style.top = y + 'px'; }
  else if (pr) pr.remove();
  document.body.classList.toggle('placing', design.active());
  document.body.classList.toggle('talking', ui.dialogOpen() || ui.cardOpen());
  $('actBtn').textContent = hint || (ui.dialogOpen() || ui.cardOpen() ? '繼續' : '動作');
  life.update(dt, t, run && moving);
  tide.update(dt, t, simDate()); spirit.update(dt, t); balloon.update(dt, t, !weather.raining() && !weather.now.startsWith('cloud') && (hourOverride ?? nowHour()) >= 8 && (hourOverride ?? nowHour()) < 18); env.luck = cooking.lucky();
  design.update();
  for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.userData.t += dt; p.scale.setScalar(1 + p.userData.t * 4); p.material.opacity = 0.8 * (1 - p.userData.t / 0.5); p.position.y += dt * 0.5; if (p.userData.t > 0.5) { scene.remove(p); puffs.splice(i, 1); } }
  // 光照與鏡頭
  const { dir, night, golden } = applyTime(hourOverride ?? nowHour());
  nightFill.position.set(player.position.x + 1.2, player.position.y + 2.8, player.position.z + 2.2); nightFill.intensity = night * 2.6;   // 夜裡角色身邊一圈柔和的暖光（像動森，晚上也看得清楚自己）
  events.update(dt, night, player.position);
  { const py = player.position.y;   // 鏡頭高度：跳起來時停在起跳的高度（跳得看起來更高、不暈），落地或掉下去再跟上
    if (camY == null || Math.abs(py - camY) > 4 || room.inside || elsewhere() || sitting) camY = py;
    else if (!jump.air) camY += (py - camY) * Math.min(1, dt * 7);
    else camY = THREE.MathUtils.clamp(camY, py - 2.2, py + 0.2);
    look.set(player.position.x, camY + 1.3, player.position.z); }
  { // 聊天時（第三人稱）：鏡頭拉近一點、看向兩個人的中間，表情與反應看得清楚（v7.0）
    const tm = talking && talking.mesh && !fpNow && !sitting ? talking.mesh : null; talkK += ((tm ? 1 : 0) - talkK) * Math.min(1, dt * 3);
    if (tm) talkMid.set((player.position.x + tm.position.x) / 2, (camY + tm.position.y) / 2 + 1.25, (player.position.z + tm.position.z) / 2);
    if (talkK > 0.001) look.lerp(talkMid, talkK * 0.6); }
  const rk = weather.update(dt, hourOverride ?? nowHour(), night, look, (w, prev) => {
    env.rain = w === 'rain' || w === 'storm'; paintHud(); if (w === 'rain') garden.rain();
    const sn = seasons.winter();
    if (w === 'rain') ui.toast(sn ? '下雪了！雨天限定的生物出來了' : '下雨了！雨天限定的生物出來了'); else if (prev === 'rain') ui.toast(sn ? '雪停了' : '雨停了');
  });
  const rainVis = seasons.winter() ? 0 : rk;   // 冬天下的是雪：不撐傘、沒有雨聲與水面雨滴
  Audio.setRain && Audio.setRain(rainVis);
  villagers.forEach(v => { v.mesh.userData.umbrella.visible = rainVis > 0.35; });
  player.userData.umbrella.visible = rainVis > 0.35 && !player.userData.tool;
  const za = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.9 : 1;
  if (sitLook.lengthSq() === 0) sitLook.copy(look);
  if (sitting && seatY(sitting.seat) < 2.5) {   // 高處（山頂）的座位沿用平常的鏡頭：從斜後方俯看，海面才不會被滾筒地平線彎掉
    const st = sitting.seat, fx0 = Math.sin(st.ry), fz0 = Math.cos(st.ry), y0 = seatY(st);
    // 從座位後上方看出去；後面有懸崖、建築或樹的話就把鏡頭拉高、拉近，避免卡進去
    if (!sitting.cam) { let best = null; for (const [d, h] of [[6.6, 4.4], [5.4, 5.2], [4.2, 6.0], [3.0, 7.0], [2.0, 8.0]]) { const cx = st.x - fx0 * d, cz = st.z - fz0 * d; let clear = groundAt(cx, cz) < y0 + h - 1.2 && !blocked(cx, cz, 0.6); for (let k = 0.25; k < 1 && clear; k += 0.25) clear = groundAt(st.x - fx0 * d * k, st.z - fz0 * d * k) < y0 + h * k + 0.6 && (h > 5.5 || !blocked(st.x - fx0 * d * k, st.z - fz0 * d * k, 0.5, c => colTop(c) < y0 + h * k - 0.5)); if (clear) { best = [cx, y0 + h, cz]; break; } } sitting.cam = best || [st.x - fx0 * 1.5, y0 + 8, st.z - fz0 * 1.5]; }
    sitCam.set(sitting.cam[0], sitting.cam[1], sitting.cam[2]); camPos.lerp(sitCam, Math.min(1, dt * 1.4));
    sitLook.lerp(sitTmp.set(st.x + fx0 * 2.6, y0 + 0.4, st.z + fz0 * 2.6), Math.min(1, dt * 1.4));   // 往前下方看：滾筒地平線會把遠方彎下去，平視只會看到天空
  } else {
    // 風景鏡頭（V）：鏡頭放低、視線往前上方抬，看得到更遠的海、天空與遠山
    scenic += ((scenicOn && !photo.active() ? 1 : 0) - scenic) * Math.min(1, dt * 2.2);
    const yawNow = photo.active() ? 0 : camYaw;
    const off = scTmp.o.copy(photo.active() ? photo.offset(camOff) : viewOffset(camOff)).lerp(SCENIC, scenic).multiplyScalar(za * (1 - 0.3 * talkK)).applyAxisAngle(UPV, yawNow), lt = scTmp.l.copy(look).add(scTmp.d.copy(SCENIC_L).multiplyScalar(scenic).applyAxisAngle(UPV, yawNow));
    camPos.lerp(look.clone().add(off), Math.min(1, dt * (photo.active() ? 8 : 4)));
    sitLook.lerp(lt, Math.min(1, dt * 6)); if (sitLook.distanceToSquared(lt) < 0.0004 || photo.active()) sitLook.copy(lt);
  }
  camera.position.copy(camPos);
  { // 鏡頭碰撞：角色和鏡頭之間被房子、樹擋住時，把鏡頭拉到障礙物前面（地形不算，滾筒地平線會讓地面看起來擋住）
    const from = camCol.a.copy(sitLook).add(camCol.up), dir = camCol.d.copy(camPos).sub(from), len = dir.length();
    let want = 1;   // 鏡頭要在角色到原本鏡位之間的幾成（1 = 沒被擋）
    if (len > 0.5 && !sitting && !photo.active() && fpK < 1) {
      dir.divideScalar(len); camRay.set(from, dir); camRay.far = len;
      const hit = camRay.intersectObjects(camBlockers(), true).find(h => h.object.isMesh && h.object.visible && !h.object.material.transparent && h.object.parent !== scene && !h.object.userData.camThrough);   // camThrough：高掛的招牌等薄板不擋鏡頭（站在牌樓底下時鏡頭不會突然貼到頭頂）
      if (hit) want = Math.max(0.6, hit.distance - 0.4) / len;
    }
    camPull += (want - camPull) * Math.min(1, dt * (want < camPull ? 14 : 3));   // 被擋：快速拉近；不擋了：慢慢退回（不再一格就跳過去）
    if (camPull < 0.999 && len > 0.5) camera.position.copy(from).addScaledVector(dir.normalize(), len * camPull);
  }
  fpK += ((fpNow ? 1 : 0) - fpK) * Math.min(1, dt * 4.5); if (Math.abs(fpK - (fpNow ? 1 : 0)) < 0.003) fpK = fpNow ? 1 : 0;
  if (fpK > 0) {   // 第一人稱：鏡頭從身後滑進角色眼睛的位置
    const u = player.userData, hb = (u.gltf && u.gltf.head) || u.head, o = fpTmp.h;
    if (!jump.flip) { hb.getWorldPosition(o).sub(player.position); o.set(THREE.MathUtils.clamp(o.x, -0.3, 0.3), THREE.MathUtils.clamp(o.y, 0.4, 1.6), THREE.MathUtils.clamp(o.z, -0.3, 0.3)); fpTmp.off.lerp(o, Math.min(1, dt * 10)); }   // 頭骨跟著走路、坐下的動作上下（前空翻時不跟著轉）
    const eye = fpTmp.e.copy(player.position).add(fpTmp.off); eye.y += FP_EYE;
    let back = 0;
    if (fpNow && talking && talking.mesh) {   // 聊天時轉頭看著對方的臉；站得太近就把鏡頭往後退一點，不會貼在對方頭髮上
      const tm = talking.mesh, m = tm.position, g = tm.userData.gltf, fy = g && g.head ? g.head.getWorldPosition(fpTmp.t).y + 0.05 : m.y + 1.2;
      const dx = m.x - eye.x, dz = m.z - eye.z, dh = Math.hypot(dx, dz), kk = Math.min(1, dt * 4); back = Math.max(0, 1.8 - dh);
      camYaw = angLerp(camYaw, Math.atan2(-dx, -dz), kk); fpPitch += (Math.atan2(fy - eye.y, dh + fpBack) - fpPitch) * kk;
    }
    fpBack += (back - fpBack) * Math.min(1, dt * 4);
    const cp = Math.cos(fpPitch), fw = fpTmp.f.set(-Math.sin(camYaw) * cp, Math.sin(fpPitch), -Math.cos(camYaw) * cp);
    eye.x += fw.x * 0.1 + Math.sin(camYaw) * fpBack; eye.z += fw.z * 0.1 + Math.cos(camYaw) * fpBack;
    if ((fpFocusT -= dt) < 0) { fpFocusT = 0.12; fpFocusW = fpAutoFocus(eye, fw); }   // 自動對焦：看著的東西清楚
    fpFocus += (fpFocusW - fpFocus) * Math.min(1, dt * 5);
    const k = fpK * fpK * (3 - 2 * fpK);
    camera.position.lerp(eye, k);
    camera.lookAt(fpTmp.p.copy(eye).addScaledVector(fw, 10).sub(sitLook).multiplyScalar(k).add(sitLook));
  } else camera.lookAt(sitLook);
  shake.apply(camera, dt);   // 打擊感：咬鉤、落地的鏡頭震動
  fpLens(fpK);
  fpHand.update(dt, { active: fpK > 0.92, show: fpNow && !talking && !sitting && !ui.dialogOpen() && !ui.cardOpen() && !ui.panelOpen(), camera, tool: player.userData.tool, umbrella: player.userData.umbrella.visible, fishing: life.fishing(), moving, run, yaw: camYaw, pitch: fpPitch, t });
  sky.position.copy(camera.position);
  /* 滾筒地平線的彎曲程度跟著「鏡頭比前方地面高多少」調整：鏡頭放低、或面對比自己高的台地時，
     原本的彎曲會讓地平線近到台地地面翻到背面看不見，只剩樹、草和建築浮在天空裡；這時把彎曲放輕，鏡頭高時維持原樣 */
  if (!room.inside && !elsewhere()) {
    const fw = camera.getWorldDirection(hzTmp.f).setY(0).normalize(); let gMax = -9;
    for (let s = 3; s <= 24; s += 1.5) gMax = Math.max(gMax, ground(camera.position.x + fw.x * s, camera.position.z + fw.z * s));
    const hk = THREE.MathUtils.clamp((camera.position.y - gMax - 1.2) / 3.8, 0, 1), kWant = CURVE * Math.max(0.04, hk * hk);   // 鏡頭只比前方地面高一兩公尺時幾乎不彎
    U.uCurve.value += (kWant - U.uCurve.value) * Math.min(1, dt * 3);
  }
  { // 彎曲的海面在畫面上最高到哪裡（地平線）：沿著鏡頭前方取海面上的點，套用同樣的視空間彎曲後投影，取最高的一點，再換算成天幕方向的高度
    camera.updateMatrixWorld(); const fw = camera.getWorldDirection(hzTmp.f).setY(0).normalize(), F = U.uBendF.value, K = U.uCurve.value; let best = -9, bestD = 1e9, bestS = 0;
    for (let s = 4; s < 240; s += 3) {
      const v = hzTmp.p.set(camera.position.x + fw.x * s, 0.02, camera.position.z + fw.z * s).applyMatrix4(camera.matrixWorldInverse);
      const bz = Math.max(-v.z - F, 0); v.y -= bz * bz * K; if (v.z > -0.5) continue; const dz = -v.z; v.applyMatrix4(camera.projectionMatrix); if (v.y > best) { best = v.y; bestD = dz; bestS = s; }
    }
    HZ.y = best; HZ.d = bestS > 100 ? 1e9 : bestD;   // 地平線：比它遠、又在它下面的東西被彎下去的海面擋住（地平線太遠時海面已經到盡頭，不算）
    const r = hzTmp.r.set(0, best, 0.5).unproject(camera).sub(camera.position).normalize(), L0 = skyU.lift.value;
    skyU.hz.value = (r.y + L0) / Math.hypot(r.x, r.y + L0, r.z);
    { const rt = hzTmp.r.set(0, 1, 0.5).unproject(camera).sub(camera.position).normalize(); skyU.span.value = (rt.y + L0) / Math.hypot(rt.x, rt.y + L0, rt.z) - skyU.hz.value; }   // 畫面上緣在天幕上的高度：天空漸層從地平線鋪到這裡
    { const sd = skyU.sunDir.value, hy = skyU.hz.value + sd.y * 0.95, hr = Math.sqrt(Math.max(0, 1 - hy * hy)) / (Math.hypot(sd.x, sd.z) || 1); skyU.sunSky.value.set(sd.x * hr, hy, sd.z * hr); }   // 太陽畫在畫面地平線上方「真實仰角」的位置（一般鏡頭與第一人稱一致）
    { const md = MOON_AZ, hy = Math.min(0.95, skyU.hz.value + 0.48), hr = Math.sqrt(1 - hy * hy); skyU.moonDir.value.set(Math.sin(md) * hr, hy, -Math.cos(md) * hr); }   // 月亮：北偏東、地平線上方約 30°
    fantasy.update(dt, t, night, !room.inside && !elsewhere());
    glow.update(dt, player.position, !room.inside && !elsewhere());   // 窗戶、路燈、燈籠的光：真燈分給玩家附近的光源
    minimap.update(dt, !room.inside && !elsewhere() && !photo.active());
    shadows.begin(camera, dir, player.position);
    props3d.cull();   // 畫面外、沉到地平線下的模型不畫；影子落進畫面的才畫進陰影貼圖（兩層陰影框也在這裡擺好）
    grass.cull();   // 畫面外的草塊不畫，遠處的草稀一點
  }
  foamMat.opacity = 0.45 + Math.sin(t * 1.6) * 0.2;
  // 光影：逆光輪廓、後製的太陽位置與天氣、空氣微塵
  const fxClear = Math.max(0, 1 - rk * 1.1) * (weather.now.startsWith('cloud') ? 0.45 : 1);
  const fxFwd = camera.getWorldDirection(sunTmp.f), fxSv = sunTmp.v.copy(dir).setY(0).normalize(), fxFv = sunTmp.g.set(fxFwd.x, 0, fxFwd.z).normalize();
  const fxFront = THREE.MathUtils.smoothstep(fxSv.dot(fxFv), 0.05, 0.75) * (1 - night);
  // 天空用抬高後的方向畫（skyU.lift），反推太陽在天幕上的實際方向再投影
  const L = skyU.lift.value, sS = skyU.sunSky.value, A = sS.y * L + Math.sqrt(Math.max(0, sS.y * sS.y * L * L - L * L + 1));   // 用天幕上畫太陽的方向（以畫面地平線為準）反推畫面位置
  const fxSp = sunTmp.p.set(sS.x * A, sS.y * A - L, sS.z * A).multiplyScalar(200).add(camera.position).project(camera);
  post.fx.golden = golden * (1 - night); post.fx.haze.copy(scene.fog.color).lerp(skyU.bot.value, 0.5); post.fx.sunW.copy(dir); post.fx.clear = fxClear; post.fx.night = night; post.fx.sunCol.copy(sun.color);
  post.fx.sunVis = fxSp.z < 1 ? fxFront : 0; post.fx.sun.set(THREE.MathUtils.clamp((fxSp.x + 1) / 2, -0.1, 1.1), THREE.MathUtils.clamp((fxSp.y + 1) / 2, 0.55, 1.08));   // 太陽在畫面外時，把光源拉到畫面邊緣附近
  U.uSunV.value.copy(dir).transformDirection(camera.matrixWorldInverse); U.uRimCol.value.copy(sun.color);
  U.uRim.value = (0.28 + golden * 0.4) * fxClear * (1 - night);   // 白天也有側逆光的亮邊
  U.uShade.value = fxClear * (1 - night) * (1 - golden * 0.6);
  U.uTrans.value = fxClear * (1 - night) * (0.55 + golden * 0.75);   // 葉片透光：晴天有，黃金時段的逆光最明顯
  motes.update(dt, t, look, golden, night, fxClear);
  waves.update(dt, player, { night, rain: rainVis, inAir: jump.air, fish: life.fishShadows && life.fishShadows() });
  spinProps(dt);   // 溪邊的水車
  U.uPlayer.value.copy(player.position);
  skyU.cover.value = weather.now.startsWith('cloud') || rk > 0.2 ? 0.9 : 0.22;   // 晴天：高空的薄雲少一點（大朵積雲由 cumulus.js 負責）
  seasons.update(dt, t, { date: simDate(), inside: false, focus: look, wet: rk > 0.2, cloudy: weather.now.startsWith('cloud'), night });
  winter.update(dt, t, night); highland.update(dt, t, night); details.update(t, dt, look, rk > 0.2); hotel.update(dt, t, hourOverride ?? nowHour(), true);
  // 遮擋鏤空：玩家在螢幕上的位置與深度（擋在前面的東西在這個圓裡挖空）
  { const pv = sunTmp.v.copy(player.position).setY(player.position.y + 0.8).applyMatrix4(camera.matrixWorldInverse), pr = renderer.getPixelRatio();
    const [ox, oy] = screenOf(player, 0.8);
    U.uOccP.value.set(ox * pr, (innerHeight - oy) * pr); U.uOccR.value = fpK > 0.3 ? 0 : 74 * pr; U.uOccD.value = -pv.z; U.uOccY.value = player.position.y; post.fx.focus = fpK ? THREE.MathUtils.lerp(-pv.z, fpFocus, fpK) : -pv.z; U.uBendF.value = Math.max(4, -pv.z - 2); }   // 第一人稱：不挖空、對焦在看著的東西
  const dof0 = post.fx.dof; post.fx.dof = dof0 * (1 - fpK * 0.8);   // 第一人稱景深很淡（看海平線時對焦在遠處，近處的海浪、閃光不能糊掉）
  post.render(t); post.fx.dof = dof0; photo.grab(renderer.domElement); memo.grab(renderer.domElement);
  saveT += dt; if (saveT > 10 && !TA.importing) { saveT = 0; S().pos = [Math.round(player.position.x * 10) / 10, Math.round(player.position.z * 10) / 10]; save(); }
  hudT += dt; if (hudT > (life.tourney ? 0.25 : 2)) { hudT = 0; paintHud(); }
}
function roomTick(dt, t, ix, iz, len, moving, locked) {
  const placing = room.placing();
  if (placing) { ix = iz = 0; moving = false; moveTo = null; }
  if (moving) {
    const p = player.position, sp = 2.5 * (0.3 + 0.7 * Math.min(1, len)); ix /= len; iz /= len;
    const nx = p.x + ix * sp * dt, nz = p.z + iz * sp * dt;
    if (room.walkable(nx, nz)) { p.x = nx; p.z = nz; } else if (room.walkable(nx, p.z)) p.x = nx; else if (room.walkable(p.x, nz)) p.z = nz; else moveTo = null;
    player.rotation.y = angLerp(player.rotation.y, Math.atan2(ix, iz), Math.min(1, dt * 12));
    if (p.z > 3.75 && iz > 0) { room.exit(); return; }
  }
  player.position.y = 0;
  animate(player, dt, moving ? 1 : 0, t, moving ? THREE.MathUtils.clamp(0.3 + 0.7 * Math.min(1, len), 0.45, 1) : 1);
  const host = roomHost;
  if (host) { const hx = player.position.x - host.mesh.position.x, hz = player.position.z - host.mesh.position.z; host.mesh.rotation.y = angLerp(host.mesh.rotation.y, Math.atan2(hx, hz), Math.min(1, dt * 5)); animate(host.mesh, dt, 0, t); }
  const nearHost = host && !locked && Math.hypot(host.mesh.position.x - player.position.x, host.mesh.position.z - player.position.z) < 1.8;
  villagers.forEach(v => { v.tag.style.opacity = 0; });
  let pr = $('labels').querySelector('.prompt');
  const it = !locked && !placing && !nearHost && room.facingItem();
  if (nearHost) { if (!pr) { pr = ui.el('div', 'prompt'); $('labels').appendChild(pr); } pr.innerHTML = '<kbd>E</kbd>聊天'; const [x, y] = screenOf(host.mesh, 2.0); pr.style.left = x + 'px'; pr.style.top = y + 'px'; }
  else if (it) { if (!pr) { pr = ui.el('div', 'prompt'); $('labels').appendChild(pr); } pr.innerHTML = '<kbd>E</kbd>查看家具'; const [x, y] = screenOf(player, 2.0); pr.style.left = x + 'px'; pr.style.top = y + 'px'; }
  else if (pr) pr.remove();
  document.body.classList.toggle('placing', placing); document.body.classList.toggle('room-placing', placing);
  document.body.classList.toggle('talking', ui.dialogOpen() || ui.cardOpen());
  $('actBtn').textContent = placing ? '放下' : it ? '查看' : nearHost ? '聊天' : '動作';
  const { night, golden } = applyTime(hourOverride ?? nowHour());
  room.render(dt, night, { golden, t, winter: seasons.winter() }); photo.grab(renderer.domElement); memo.grab(renderer.domElement);
  hudT += dt; if (hudT > (life.tourney ? 0.5 : 2)) { hudT = 0; paintHud(); }
}
let lastFrame = 0;
/** 每一格。作答中背景不畫，島上的狀態每 0.05 秒更新一次就夠（不必跟著螢幕每秒 60 次）；極省電模式每秒 30 格 */
function frame(now) { if (now - lastFrame > (post.fx.hold ? 45 : ULTRA ? 28 : 0)) { lastFrame = now; tick(); } requestAnimationFrame(frame); }
// 滾筒地平線會把遠處往下彎，three.js 原本的視錐剔除會誤剔除遠方高物：engine.js 換成彎曲前後兩個位置都判斷（v7.3），一般網格交給它剔除
scene.traverse(o => { o.frustumCulled = cullable(o); }); dropTinyShadows(scene);
paintHud(); paintTools();
requestAnimationFrame(frame);
addEventListener('pagehide', () => { if (TA.importing) return; if (!room.inside && !elsewhere()) S().pos = [player.position.x, player.position.z]; TA.Store.flush(); });
window.__isle = { yuehome, house, shopin, dailyStock, renderer, camera, camOff: () => camOff, popNow: () => { popAt = 0; }, fp: { set: setFp, aim: (y, p) => { camYaw = y; fpPitch = p; }, state: () => ({ fpOn, fpK, camYaw, fpPitch, fpFocus }) }, scenicCfg: () => ({ SCENIC, SCENIC_L }), SITES, guest, weather, winter, act, diy, openFurnShop, hotel, dreamisle, cheer, visit, enterLibrary, enterMuseum, homeWithGifts, seats, sitDown, standUp, sitState: () => sitting, memo, T, N, C, rating, DOORS, town, social, events, room, enterHome, tick, player, villagers, setHour: h => { hourOverride = h; paintHud(); }, talk, life, S, start: startGame, equip };
