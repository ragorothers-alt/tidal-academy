/* 潮汐小島 · 設定與指南：存檔備份（匯出／匯入）、重置進度、畫質（標準／省電／極省電，手機較順）、配樂開關、島上指南。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { renderer, sun } from './engine.js';
import { S, save } from './state.js';
import { fx } from './post.js';
import { setPool } from './glow.js';
import * as seasons from './seasons.js';
import * as mind from './mind.js';
import * as shake from './shake.js';

const TA = window.TA;
export const VERSION = '7.1.0';
export const hooks = {};   // main.js 掛上來的開關（第一人稱視角）
const DEF = { lowPerf: false, ultra: false, music: true, fx: true, popQuiz: true, keepGoing: true, phoneAll: false, fs: 1, speed: 1, timer: 1, shake: true, haptic: true };
/** 設定值：原地補上預設值（不換掉物件——設定面板拿著同一個物件改，換掉的話後面的修改就存不進去） */
const cfg = () => { const s = S(); if (!s.settings || typeof s.settings !== 'object') s.settings = {}; for (const k in DEF) if (!(k in s.settings)) s.settings[k] = DEF[k]; return s.settings; };
/** 閱讀設定：文字大小（CSS 變數 --fs，只放大文字區塊）、打字速度、作答時間 */
export function applyRead() { const c = cfg(); document.documentElement.style.setProperty('--fs', String(c.fs || 1)); ui.read.speed = c.speed == null ? 1 : c.speed; ui.read.timer = c.timer == null ? 1 : c.timer; }
/** 啟動時套用（省電模式要在建立陰影前決定，切換後重新整理生效） */
export function applyEarly() {
  const c = cfg();
  if (c.lowPerf) { renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; sun.shadow.mapSize.set(2048, 2048); setPool(6); }   // 省電：每一格最多照 6 盞燈
  if (c.lowPerf && c.ultra) { renderer.setPixelRatio(0.75); setPool(3); }   // 極省電（手機、平板）：解析度再降一級、夜晚每格最多 3 盞燈；其餘見 perf.js
  Audio.setMusic(c.music); shake.opts.shake = c.shake; shake.opts.haptic = c.haptic;
  fx.on = c.fx && !c.lowPerf;
  { let last = 0; TA.Store.onFail = () => { if (Date.now() - last < 60000) return; last = Date.now(); ui.toast('存檔失敗：這台裝置的空間可能不足（或是無痕模式）。請到「設定」匯出存檔備份', 'bad'); }; }   // 存檔寫不進去：一分鐘最多提醒一次
  if (TA.Store.broken) setTimeout(() => ui.toast('上次的存檔讀不出來，已經另外保留一份；如果有匯出的備份，可以到「設定」匯入', 'bad'), 3000);
  applyRead();
}
function download(name, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export function open() {
  const c = cfg(), body = ui.el('div', 'settings');
  const row = (label, desc, btn) => { const r = ui.el('div', 'st-row', `<div><b>${label}</b><small>${desc}</small></div>`); r.appendChild(btn); return r; };
  const toggle = (on, fn) => { const b = ui.el('button', 'btn' + (on ? ' gold' : ' off'), on ? '開' : '關'); b.type = 'button'; b.onclick = fn; return b; };
  mind.probe().then(() => { if (body.isConnected) draw(); });   // 打開設定時重新檢查 laya 連線
  const draw = () => {
    body.innerHTML = '';
    const cyc = (label, desc, key, opts) => { let k = opts.findIndex(o => o[0] === c[key]); if (k < 0) k = 0; const b = ui.el('button', 'btn gold', opts[k][1]); b.type = 'button'; b.onclick = () => { c[key] = opts[(k + 1) % opts.length][0]; save(); applyRead(); draw(); }; body.appendChild(row(label, desc, b)); };
    cyc('文字大小', '對話、題目、選項、閱讀材料與解析的字級（點一下換）', 'fs', [[1, '標準'], [1.15, '大'], [1.3, '特大']]);
    cyc('文字速度', '島民說話時逐字出現的速度；說話中也可以按一下直接顯示整句', 'speed', [[1, '標準'], [2.5, '快'], [0, '立即顯示'], [0.5, '慢']]);
    cyc('作答時間', '釣魚、捉蟲、潮池、島民出題、連續挑戰等對話裡的限時題。模擬考、激流衝刺、首領戰本身是計時挑戰，不受影響', 'timer', [[1, '標準'], [1.5, '寬鬆（×1.5）'], [0, '不限時']]);
    body.appendChild(row('配樂', '白天、夜晚、雨天、節日各有自己的曲子', toggle(c.music, () => { c.music = !c.music; Audio.setMusic(c.music); save(); draw(); })));
    body.appendChild(row('畫面震動', '咬鉤、從高處落地、敲石頭時鏡頭輕輕震一下（系統開了「減少動態效果」時不震）', toggle(c.shake, () => { c.shake = !c.shake; shake.opts.shake = c.shake; save(); draw(); })));
    body.appendChild(row('觸控震動', '手機咬鉤、答對、抓到稀有生物時震一下（只有 Android 支援）', toggle(c.haptic, () => { c.haptic = !c.haptic; shake.opts.haptic = c.haptic; save(); draw(); if (c.haptic) shake.haptic('ok'); })));
    body.appendChild(row('光影特效', '泛光、逆光光束、黃昏的金色光暈與暖色調（省電模式下自動關閉）', toggle(c.fx, () => { c.fx = !c.fx; fx.on = c.fx && !c.lowPerf; save(); draw(); })));
    if (hooks.fp) body.appendChild(row('第一人稱視角', '從角色的眼睛看出去（在島上）：拖曳畫面轉頭，搖桿或 WASD 照視線方向走。也可以按 F，或把鏡頭拉到最近再繼續拉近', toggle(hooks.fp.get(), () => { hooks.fp.set(!hooks.fp.get()); draw(); })));
    body.appendChild(row('島民主動出題', '每隔 3–5 分鐘，附近的島民會走過來考你一題（優先出錯題），答對有隨機獎勵', toggle(c.popQuiz, () => { c.popQuiz = !c.popQuiz; save(); draw(); })));
    body.appendChild(row('答對後邀請繼續挑戰', '釣魚、抓蟲、石碑等答對後，偶爾問你要不要接著連續挑戰（每隔幾分鐘最多問一次）', toggle(c.keepGoing, () => { c.keepGoing = !c.keepGoing; save(); draw(); })));
    body.appendChild(row('手機顯示全部 App', '剛開始玩的前幾天，手機先列常用的 App，其他收在「更多」裡；打開這個就一直全部列出', toggle(c.phoneAll, () => { c.phoneAll = !c.phoneAll; save(); draw(); })));
    const sb = ui.el('button', 'btn gold', c.season && c.season !== 'auto' ? seasons.NAMES[c.season] + '天' : `自動（${seasons.NAMES[seasons.auto()]}）`); sb.type = 'button';
    sb.onclick = () => { const o = seasons.ORDER; c.season = o[(o.indexOf(c.season || 'auto') + 1) % o.length]; save(); draw(); setTimeout(() => seasons.banner(), 300); };
    body.appendChild(row('季節', '島上的景色：自動依日期（冬天積雪、秋天紅葉、春天落櫻），也可以固定成喜歡的季節', sb));
    { const lv = c.lowPerf ? (c.ultra ? 2 : 1) : 0, NAMES = ['標準', '省電', '極省電'];   // 畫質：點一下換下一級
      const b = ui.el('button', 'btn ' + (lv ? 'gold' : 'off'), NAMES[lv]); b.type = 'button';
      b.onclick = () => { const n = (lv + 1) % 3; c.lowPerf = n > 0; c.ultra = n === 2; save(); ui.toast(NAMES[n] + '：重新整理後生效'); draw(); };
      body.appendChild(row('畫質', '標準：完整的光影。省電：關閉陰影與光影特效、降低解析度、草叢減半。極省電（手機、平板）：再降解析度、每秒 30 格、草叢剩三分之一、花改成簡單的形狀、遠處的小東西不畫。點一下換，重新整理後生效', b)); }
    { const st = mind.status(), on = c.laya !== false;   // 島民自己做決定（laya）：開關與連線狀態
      const desc = !on ? '關閉：島民在家附近隨意走動' : st === true ? '已連上 laya：島民依個性、時間與天氣決定接下來做什麼（散步、坐長椅、看花、找朋友聊天、走過來跟你打招呼）' : st === false ? '連不上 laya 伺服器（例如網頁版、伺服器沒開），島民先照原本的方式走動，連上後自動接手' : '檢查連線中…';
      body.appendChild(row('島民自己做決定', desc, toggle(on, () => { c.laya = !on; save(); draw(); }))); }
    const ex = ui.el('button', 'btn', '匯出'); ex.type = 'button';
    ex.onclick = () => { TA.Store.flush && TA.Store.flush(); const d = new Date(); download(`tidal-academy-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`, TA.Store.exportJSON()); ui.toast('已匯出存檔（學習紀錄與小島的進度；相簿與回憶錄的照片不在裡面）'); };
    body.appendChild(row('匯出存檔', '進度只存在這個瀏覽器，清除瀏覽資料會遺失；請定期匯出備份。備份包含學習紀錄與小島的進度，相簿與回憶錄的照片不包含在內' + (TA.Store.ok === false ? '。⚠ 目前存檔寫不進這台裝置，請立刻匯出' : ''), ex));
    const im = ui.el('button', 'btn', '匯入'); im.type = 'button';
    im.onclick = () => {
      const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json';
      f.onchange = async () => {
        const file = f.files && f.files[0]; if (!file) return;
        if (!confirm('匯入存檔會取代目前全部的進度（學習紀錄與小島），確定嗎？')) return;
        try { const text = await file.text(); TA.importing = true; TA.Store.importJSON(text); ui.toast('匯入成功，重新載入中…'); setTimeout(() => location.reload(), 800); }
        catch (e) { TA.importing = false; ui.toast('匯入失敗：' + e.message, 'bad'); return; }
      };
      f.click();
    };
    body.appendChild(row('匯入存檔', '換裝置時，匯入之前匯出的 .json 檔', im));
    const rs = ui.el('button', 'btn off', '重置'); rs.type = 'button';
    rs.onclick = () => {
      if (!confirm('重置所有進度？這會刪除這台裝置上的全部作答紀錄、單字、成就、潮晶，以及小島的房子、圖鑑、相簿與回憶錄，無法復原。建議先匯出備份。')) return;
      if (!confirm('再確認一次：真的要全部重置、從頭開始嗎？')) return;
      TA.importing = true; TA.Store.reset();   // importing：重新載入前不要再把舊的位置寫回去
      ['tidal-isle-photos', 'tidal-isle-memo'].forEach(n => { try { indexedDB.deleteDatabase(n); } catch (e) { /* 沒有 IndexedDB */ } });
      ui.toast('已重置，重新載入中…'); setTimeout(() => location.reload(), 800);
    };
    body.appendChild(row('重置所有進度', '刪除這台裝置上的全部進度，從船員登記重新開始（建議先匯出備份）', rs));
    body.appendChild(ui.el('p', 'muted', `潮汐學院 · 潮汐小島 v${VERSION} · 離線可玩 · 進度只存在這台裝置`));
  };
  draw(); ui.panel('設定', body, { cls: 'phone' });
}
const GUIDE = [
  ['不知道做什麼', '看左上角的任務欄：剛開始是新手引導，一步一步帶你打招呼、答題、釣魚、抓蟲、看信箱、接委託（每步都有獎勵）；完成後改成今天的潮汐里程目標，還會提示下一項怎麼做，點一下看完整清單與獎勵。下面的「現在可以做」會一直依當下狀況提示：口袋裡的化石、進行中的委託、新信、退潮、晚上觀星、今天的活動與讀書計畫、錯題、還沒玩過的玩法…（有箭頭的可以直接點開）'],
  ['每天', '導師「一起練習」（一組 5 題、不限時，答對的鈴錢不收回）與「連續挑戰」（越答越難、獎金越疊越多，答錯拿回一半；島上任何題目答對後也都能「繼續挑戰」）、島民主動出題、委託（含弱點委託）、信箱的單元筆記、潮汐里程、讀書計畫、每日單字謎、數學石碑、考前衝刺（倒數 30 天）'],
  ['採集', '越稀有的魚和蟲考越難的題目（大魚考難字）；連續答對會累積「手感」（右上角 ●●●○○，最多 5 級），稀有生物更容易出現，答錯手感減半。浮標會吸引最靠近的魚影，瞄準想要的魚拋竿。釣竿（1，英文單字）、捕蟲網（2，國文）、鏟子（3，化石／敲石頭）、澆水壺（4）；空手搖樹、撿貝殼；退潮時的潮池與泥灘（地科海洋）'],
  ['學習場所', '潮汐考場（模擬考、每日潮汐、航海圖與單元試煉、錯題本、成績統計、激流衝刺、快問快答；手機也能直接打開）、燈塔（首領戰）、潮汐圖書館（錯題特訓、單元筆記）、天文望遠鏡（晚上觀星）、博物館展廳'],
  ['手機的學習 App', '今日學習（今日航程：每日潮汐、單字 20 張、答題目標、專注 25 分鐘，完成任 3 項開寶箱）、單字燈塔（翻卡：不熟／模糊／熟悉，選義快答、例句填空、中翻英、字表與發音）、專注時光（番茄鐘，完成後可以休息，休息時照常在島上走動）、我的檔案（等級與稱號、潮晶、連續天數與潮汐護符、名字、每日目標與學測日期）'],
  ['練習小遊戲', '手機或導師選單：海風電台（英文聽力，Lexi）、拋射實驗場（物理，雷恩）、年代排序（歷史，史遙）、元素週期表（化學，晶晶：元素猜謎與位置挑戰）、島民議會（公民，衡：選舉制度與席次分配）、函數圖形（數學，弦：看圖選方程式）、成語診所（國文，墨言：成語誤用）、潮汐夜市（數學，弦：機率與期望值）、月相觀測（地科，岳）；每天第一次有答對的那一輪可以領鈴錢'],
  ['夢境複習', '在自己家裡睡一覺（床邊按 E，或手機「夢境複習」）：夢裡重考錯題本的題目；錯題要在不同天答對 3 次（隔天、再隔兩天）才會離開錯題本，剛答錯的題目要過 20 分鐘以上才會再出現'],
  ['島上生活', '潮汐商店走得進去（今日家具的實物展示、壁紙與地板樣品架、服裝人台、種子架、收購箱，櫃台找阿潮）、DIY 工作台（手作與料理）、花園（孟德爾遺傳）、島嶼設計（G）、拍照（P）、邀請島民來作客'],
  ['拜訪導師', '每位導師每天大約有三個小時在家（白天兩小時、晚上一小時，手機「島民」看得到今天的時段），這時到他家門口拜訪：書桌、書架可以翻開那一科的筆記，招牌家具會讓導師聊幾句。岳住在觀星小屋，爐子上燉著湯，星座圖、火山模型、礦物櫃都連到地科筆記與圖鑑，木梯可以爬上閣樓。你送的家具會擺出來'],
  ['互動示意圖', '看解析時對話框右上角的「📐 看示意圖」：一台會動、有即時讀數的小機器（物理、化學、地科、生物、數學、地理）。考場的逐題回顧、潮汐筆記的單元頁也打得開'],
  ['水車磨坊', '小河東岸、石拱橋旁。走到門前看告示牌：上射式水車把水的位能變成動能；可以打開單擺能量示意圖，或答一題能量題（每天第一次答對有謝禮）'],
  ['收藏目錄', '手機「收藏目錄」：家具（拿到過就登錄，灰色的點一下看怎麼拿到）、壁紙與地板、服裝、圖鑑與博物館的進度。收齊一種圖鑑、捐齊一個展區、家具目錄 50／100／150 種時，史遙或阿潮會寄信送獎勵；五種圖鑑全收齊、博物館全捐齊各有一座紀念獎盃'],
  ['研究計畫與心事', '好感度 4 以上和導師聊天選「研究計畫」：每位導師一個三階段的長期研究，每個階段要好感度、這一科的學習成果（累計答對題數 → 單元試煉星等 → 熟練題數）和研究經費，完成後一起做研究、得到研究家具；手機「研究計畫」看進度。好感度 4／8／12／16／20 各有一段心事'],
  ['導師專屬', '史遙：鑑定化石、捐贈；岳：鑑定礦石、星之碎片；森：花園遺傳諮詢；晶晶：料理教室；Lexi／森：週三釣魚大賽、週五捕蟲大會'],
  ['活動', '週末模擬考祭典、學測倒數、潮汐夜祭（萬聖節）、冬至、聖誕、跨年、元宵、春櫻、中秋、颱風天、熱氣球、潮靈小汐、神秘島（潮汐券）'],
  ['答題', '選項標 A–E（和學測一樣），按數字鍵 1–5 或點選作答；多選題勾好再按「送出答案」（Enter）。題目、選項比較長或是題組時，對話框會換成大題目面板，閱讀材料放在旁邊（手機放在上方），都可以捲動；答錯會說出正確答案和完整解析。手機「設定」可以調整文字大小、文字速度與作答時間（寬鬆或不限時）'],
  ['操作', 'WASD 移動、Shift 奔跑、按住 C 螃蟹走路（鎖定面向，橫著走、倒著退）、空白鍵跳躍（落地前最多三連跳，第三跳會前空翻；跳得夠高就能越過河流與物件，掉進水裡會被推回岸邊）、E 互動、V 風景鏡頭（視角放低看遠景）、滾輪拉近拉遠（越近越平視）、按住右鍵或中鍵拖曳轉動視角、Home 回到預設視角、F 第一人稱視角（島上；拖曳畫面轉頭、←→ 轉向，拉到最近再往前滾也會進入）、Tab 手機、I 口袋、F 裝潢（家裡）、G 島嶼設計、P 拍照；手機、平板：畫面左半邊按住拖曳就是搖桿（搖桿出現在拇指下面；輕推慢走，再往外拖遠一點奔跑），右半邊拖曳轉視角（可以同時），兩指縮放']
];
export function guide() {
  const body = ui.el('div', 'settings');
  body.innerHTML = GUIDE.map(([t, d]) => `<div class="st-row"><div><b>${t}</b><small>${d}</small></div></div>`).join('') + '<p class="muted">島上的題庫題與單字題都共用同一套間隔複習（答錯的題目之後會再出現）；數學石碑也出自題庫；花園遺傳題、年代排序等程式產生的練習是獨立的，不計入錯題本。</p>';
  ui.panel('島上指南', body, { cls: 'phone' });
}
