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
export const VERSION = '8.7.0';
export const hooks = {};   // main.js 掛上來的開關（第一人稱視角）
const DEF = { lowPerf: false, ultra: false, music: true, fx: true, popQuiz: true, keepGoing: true, phoneAll: false, noConf: false, noWhy: false, fs: 1, speed: 1, timer: 1, shake: true, haptic: true };
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
    body.appendChild(row('作答時標示把握', '一組練習裡有 2 題，選完答案先問「有把握嗎」：猜對的題目明天再確認一次，很有把握卻答錯的會在錯題本標出來', toggle(!c.noConf, () => { c.noConf = !c.noConf; save(); draw(); })));   // v8.4
    body.appendChild(row('答錯後標記錯因', '一組練習的第一道錯題，看完解析後選「觀念、計算、漏看條件、用猜的」；錯題本會依錯因分組（可以跳過）', toggle(!c.noWhy, () => { c.noWhy = !c.noWhy; save(); draw(); })));
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
  ['不知道做什麼', '看左上角的任務欄：剛開始是新手引導，四步做出第一個成果（認識導師、答對一題、採集一次、捐出第一件展品）；之後是今天的路線（學習 N 分鐘、島上的事 N 件），點一下打開手機「今日學習」。下面的「現在可以做」會依當下狀況提示：口袋裡的化石、進行中的委託、新信、退潮、晚上觀星、今天的活動、到期的概念、還沒玩過的玩法…（有箭頭的可以直接點開）'],
  ['每日小目標', '今日學習的「這次先做」可挑借閱練題、複習、捐新展品、小特展、非選題、20 張單字卡或一次模考，依進度列出選項；固定在任務欄建議最上方，點一下開功能或看地點提示，依紀錄自動標示完成（借閱練題要做完交卷才算），可取消或換一件、隔天重選。考科航線的「我的學期」只算要考的科目：每科修好 5 道錯題、熟練 40 題、完成一個研究階段，再做所選考科的整卷模考（題型專練不算）；達成後回來查看得 5,000 鈴錢與回憶。回憶錄每個月選一張卡收進學期航海誌，到圖書館圓塔樓上的潮汐航海圖集旁翻閱'],
  ['每天', '導師「一起練習」（一組 5 題、不限時，答對的鈴錢不收回）與「連續挑戰」（越答越難、獎金越疊越多，答錯拿回一半；島上答對後也能繼續挑戰）、島民主動出題、委託（含弱點委託）、信箱的單元筆記、潮汐里程、讀書計畫、數學石碑、考前衝刺（倒數 30 天）。每日單字謎在圖書館或手機：綠色 ● 位置正確、黃色 ○ 有字母但位置不對。信箱最多 30 封，可收藏 5 封；滿了先移除最舊的未收藏已讀信，須移除未讀信時先領出禮物'],
  ['採集', '圖鑑有魚 65 種、蟲類分類 57 種（含蟹、蛙等小生物）、化石 25 種、潮間帶生物 22 種、礦物 20 種。越稀有的魚和蟲考越難的題目（大魚考難字）；連續答對會累積「手感」（右上角 ●●●○○，最多 5 級），稀有生物更容易出現，答錯手感減半。浮標會吸引最靠近的魚影；夜間海釣也有白腹鯖與日本銀帶鯡（丁香魚）。釣竿（1，英文單字）、捕蟲網（2，國文）、鏟子（3，化石／敲石頭）、澆水壺（4）；空手搖樹、撿貝殼；退潮潮池與泥灘考地科海洋'],
  ['學習場所', '潮汐考場有模擬考、每日潮汐、航海圖、錯題本、成績統計、激流衝刺與快問快答，燈塔有首領戰；模考可選節奏練習，留最後 1/6 時間檢查，交卷看最久三題、改答案與標記紀錄。潮汐圖書館找書棲複習；十科書架按 E（觸控點互動鈕）開對應科目，共 727 則筆記。選「帶著這本」一次借一本、不限期，今日學習可接著讀、按「用新題試試」練該單元 5 題（未做過的優先）、還書；夾層讀書椅可專注 15／25 分鐘，自動選借閱科目，也可聽故事。圖書館與博物館偶爾有島民來訪，下雨時有人來看書避雨；自己家床邊可做夢複習，晚上可用天文望遠鏡觀星'],
  ['手機的學習 App', '學習區只有四個入口：今日學習（今天的路線、複習、寶箱與收工摘要）、考科航線（要考的考科、各科級分估算、最弱單元；我的學期、航海圖、讀書計畫、成績統計、學習週報）、自由練習（每日潮汐、單字燈塔、錯題本、夢境複習、非選練習、激流衝刺、專注時光與練習遊戲）、模擬考。週報分列題數、非選折算、概念、單字與專注投入，以及到期複習、跨日答對升格的題數、把握與錯因；有任何學習的日子都算。用過的 App 會出現在最上面的「最近使用」'],
  ['練習小遊戲', '手機「自由練習」的「練習遊戲」區或導師選單：海風電台（英文聽力，Lexi）、拋射實驗場（物理，雷恩）、年代排序（歷史，史遙）、元素週期表（化學，晶晶：元素猜謎與位置挑戰）、島民議會（公民，衡：選舉制度與席次分配）、函數圖形（數學，弦：看圖選方程式）、成語診所（國文，墨言：成語誤用）、潮汐夜市（數學，弦：機率與期望值）、月相觀測（地科，岳）；每天第一次有答對的那一輪可以領鈴錢。每個遊戲背後的概念另外記錄，隔幾天再做對一輪才算驗證（練習護照看得到）'],
  ['今天的複習', '錯題與到期題合成一份清單（只排要考的考科，每天約 20 題，考前一週 12 題）：手機「今日學習」、圖書館、自己家床邊按 E（觸控點互動鈕）、晚上的潮靈、導師「一起練習」都從這份出題。錯題須不同天答對 3 次才離開錯題本，剛答過先冷卻 20 分鐘；單字複習同輪也不重複。圖書館複習與十題單字、夢境複習、考前衝刺，一組至少 4 題且目前不是選填題時，可點「先到這裡」或按 Esc：這題不算、前面照記；導師挑戰與委託仍做完整組'],
  ['學得更有效', '不限時且至少 3 題的對話練習抽 2 個題位，科目單選題才問「有把握／有點猜」：選答案後按 E／G，觸控點按鈕，確認前可換答案。猜對先不升格（新題先到第 1 格）；很有把握卻答錯會提醒看解析、在錯題本標示。一組首道錯題看完解析可標觀念不清楚、計算或粗心、漏看條件、用猜的，也可跳過；錯題本按錯因或「很有把握卻答錯」篩選練習。導師一起練習偶爾以兩道易混題收尾，先想方法、答完看差別；共 40 組，同組 7 天內不重複'],
  ['島上生活', '潮汐商店（家具、壁紙地板、服裝、種子與收購箱，櫃台找阿潮）、DIY 工作台（手作與料理）、花園（孟德爾遺傳）、島嶼設計（G）、拍照（P）、邀請島民來作客。自己家與飯店客房按 F 裝潢，觸控點裝潢鈕，也能開手機「裝潢」；每個房間最多擺 160 件，同格不能重疊鋪地毯'],
  ['拜訪導師', '九位導師每天約三個小時在家（白天兩小時、晚上一小時，手機「島民」看時段）；史遙在博物館，沒有獨立住家。主人不在也能進去逛，桌上留有各自的紙條。整棟室內的書桌先聊故事，再練 3 題；展示點依提示聊故事、翻筆記或圖鑑。岳住觀星小屋，星圖書桌練地科題、礦物櫃開圖鑑，閣樓雲圖翻地科筆記，沿樓梯到屋頂望遠鏡。你送的家具會擺出來；首次在主人在家時拜訪、一起練習、完成委託或送禮，超過兩天後見面可能被提起，並寫進回憶錄'],
  ['互動示意圖', '看解析時對話框右上角的「📐 看示意圖」：一台會動、有即時讀數的小機器（物理、化學、地科、生物、數學、地理）。考場的逐題回顧、潮汐筆記的單元頁也打得開'],
  ['水車磨坊', '小河東岸、石拱橋旁。走到門前看告示牌：上射式水車把水的位能變成動能；可以打開單擺能量示意圖，或答一題能量題（每天第一次答對有謝禮）'],
  ['收藏目錄', '手機「收藏目錄」：180 件可收藏家具（拿到過就登錄，灰色點一下看取得方式）、壁紙與地板各 18 款、服裝、圖鑑與博物館進度。一般壁紙地板各 10 款用鈴錢，飯店各 8 款用優惠券，夢幻家具用夢之碎片。飯店客房與夢境島的免費擺設不算取得、不能因此訂購或累計里程碑；買下或用碎片兌換才登錄，已登錄的保留。收齊一種圖鑑、捐齊一區、家具目錄 50／100／150 種會寄獎勵；五種圖鑑全收齊得「島嶼博物學家獎盃」，博物館全捐齊得「潮汐博物館感謝狀」'],
  ['研究計畫與心事', '好感度 4 以上和導師聊「研究計畫」：每人三階段，各要好感、學習成果（累計答對 → 單元試煉星等 → 熟練題數）與經費，完成得研究家具；手機「研究計畫」看進度並選本週計畫。該週練 12 道那科的不同題目，再開今日學習領本週小成果：300 鈴錢與回憶，不抵大階段條件。十位導師在好感 4／8／12／16／20 各有心事，共 50 段；滿 20 後，練習額度內的好感及送禮、委託、並坐多出的好感，累積每 3 點寫一筆共同回憶'],
  ['導師專屬', '史遙：鑑定化石、捐贈；岳：鑑定礦石、星之碎片；森：花園遺傳；晶晶：料理；Lexi／森：週三釣魚大賽、週五捕蟲大會。博物館展品前按 E（觸控點互動鈕）看名字、小知識與捐贈日期，首件名牌署名；館內捐贈後可跟光點找位置，館長不在也能用捐贈箱，每件謝禮 200 鈴錢並寄收件信。骨架前的本週小特展共 12 個輪替主題，捐齊 3 件後到特展台查看，各主題首次得 1,500 鈴錢與回憶；留言簿可記事，捐齊展區名牌變金色'],
  ['活動', '週末模擬考祭典、學測倒數、潮汐夜祭（萬聖節）、冬至、聖誕、跨年、元宵、春櫻、中秋、颱風天、熱氣球、潮靈小汐、神秘島（潮汐券）。找碎片時可問小汐最近一片的方向與約略距離，附近會提醒就在周圍；小地圖上方是北'],
  ['答題', '選項標 A–E，按 1–5 或點選；多選題勾好按「送出答案」（Enter）。長題與題組換大面板，閱讀材料在旁邊（手機在上方），可捲動；答錯看正解與完整解析。設定可調文字大小、速度、作答時間，並關閉把握與錯因提示。面板用 Tab／Shift+Tab 循環選按鈕與輸入框，Esc 關閉；剛開手機主畫面再按 Tab 收起，方向鍵切 App。文字框打字不會因 I、F 關閉；長面板標題與關閉鈕留在上方。系統開「減少動態效果」會短淡入、不白閃、不飛入口袋，循環動畫只播一次'],
  ['操作', 'WASD 移動、Shift 奔跑、按住 C 鎖定面向橫移、空白鍵或 J 跳躍（落地前最多三連跳，第三跳前空翻，可越過河流與物件；掉水會回岸邊）、E 互動（Enter 也可以）、1–4 釣竿／捕蟲網／鏟子／澆水壺、V 風景鏡頭、滾輪縮放、右鍵或中鍵拖曳轉視角、Home 還原、F 第一人稱（島上；拖曳轉頭、←→ 轉向）、Tab 手機、I 口袋、F 裝潢（自己家與飯店客房）、G 島嶼設計、P 拍照。自己家用滾輪拉到最近再往前滾進第一人稱，手機到設定切換「第一人稱視角」。手機、平板：左半邊按住拖曳出搖桿，輕推走、推遠跑；右半邊拖曳轉視角，兩指縮放；點畫面按鈕互動、跳躍。直向工具列在左側較高處，矮螢幕橫向在下方中央；入館收起小地圖，登記前、小螢幕在對話裡作答與季節橫幅時通知先排隊']
];
export function guide() {
  const body = ui.el('div', 'settings');
  body.innerHTML = GUIDE.map(([t, d]) => `<div class="st-row"><div><b>${t}</b><small>${d}</small></div></div>`).join('') + '<p class="muted">島上的題庫題與單字題都共用同一套間隔複習（答錯的題目之後會再出現）；數學石碑也出自題庫；花園遺傳題、年代排序等程式產生的練習是獨立的，不計入錯題本。</p>';
  ui.panel('島上指南', body, { cls: 'phone' });
}
