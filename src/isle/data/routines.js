/* 潮汐小島 · v8.9 島民作息：每位導師一天裡固定做的事，以及一週的團體活動（schedule.js 讀取、routine.js 讓島民照著做）。
   時間是小時（7.5 = 7:30）；weekday 平日、weekend 週末（六、日）。團體活動和個人作息重疊時以團體活動為準，被蓋到的那段就略過。
   place 是 routine.js 的地點（PLACES），act 是做什麼（拿什麼、什麼動作，見 routine.js 的 ACTS）。
   史遙守在博物館、阿潮顧店，不排作息。下雨、颱風天戶外活動取消，島民照下雨天的方式行動。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};

  I.ROUTINES = {
    chinese: {   // 墨言：溪邊寫詩、台地上讀書、晚上在大樹下看書
      weekday: [[9.5, 11, 'river', 'write'], [14, 15.5, 'terrace', 'read'], [20, 21, 'plazaTree', 'read']],
      weekend: [[9, 10.75, 'spring', 'write'], [14.5, 16, 'pierEnd', 'write']]
    },
    english: {   // Lexi：噴泉邊翻單字卡、海灘和飯店前找人聊天練英文
      weekday: [[9, 10.5, 'fountain', 'cards'], [14, 15.5, 'beach', 'cards'], [16, 16.9, 'hotel', 'cards']],
      weekend: [[10, 11.5, 'beach', 'cards'], [15, 16.5, 'plazaBench', 'cards']]
    },
    math: {   // 弦：大樹下練琴、台地上讀書、傍晚在飯店前拉一曲
      weekday: [[10, 11.5, 'plazaTree', 'violin'], [14, 15.5, 'terrace', 'read'], [16, 16.9, 'hotel', 'violin']],
      weekend: [[9.5, 11, 'pierEnd', 'violin'], [15, 16.5, 'plazaTree', 'violin']]
    },
    geography: {   // 嵐：清晨繞島慢跑、東岬畫地圖、高地祠堂寫生
      weekday: [[6.5, 7.4, 'loop', 'jog'], [10, 11.5, 'cape', 'sketch'], [14.5, 16, 'shrine', 'sketch']],
      weekend: [[6.4, 7.25, 'loop', 'jog'], [9.5, 11, 'spring', 'sketch'], [13.5, 14.75, 'beach', 'sketch']]
    },
    civics: {   // 衡：告示牌前看公告、市集幫忙、晚上在噴泉邊的燈下讀報（週二、四下午要下棋，傍晚留給在家時段）
      weekday: [[9, 10.5, 'board', 'read'], [13.5, 14.75, 'market', 'shop'], [19, 20, 'fountain', 'read']],
      weekend: [[10, 11.5, 'plazaBench', 'read'], [14, 15.5, 'hotel', 'read']]
    },
    physics: {   // 雷恩：修水車、修燈塔、晚上到觀星台調望遠鏡
      weekday: [[9, 11, 'mill', 'tinker'], [13.5, 15, 'cape', 'tinker'], [20, 21, 'telescope', 'stars']],
      weekend: [[9.5, 11.5, 'mill', 'tinker'], [14, 15.5, 'pier', 'tinker']]
    },
    chemistry: {   // 晶晶：市集泡果茶、菜園照顧香草、廣場長椅喝茶
      weekday: [[9.5, 11, 'market', 'tea'], [14, 15.5, 'veggies', 'observe'], [16, 16.9, 'plazaBench', 'tea']],
      weekend: [[9, 10.5, 'veggies', 'observe'], [14, 16, 'market', 'tea']]
    },
    biology: {   // 森：一早替花台澆水、在花田觀察昆蟲、下午到高地泉水邊
      weekday: [[7, 8.5, 'garden', 'water'], [10, 11.5, 'flowers', 'observe'], [14.5, 16, 'spring', 'observe']],
      weekend: [[9, 10.5, 'garden', 'water'], [13.5, 15, 'flowers', 'observe']]
    },
    earth: {   // 岳：清晨在東岬看日出、營地煮湯、下午記雲、晚上觀星
      weekday: [[6, 7, 'cape', 'look'], [10, 11.5, 'camp', 'cook'], [15, 16.5, 'cape', 'look'], [20.5, 21.5, 'telescope', 'stars']],
      weekend: [[6, 7, 'cape', 'look'], [10, 11.5, 'camp', 'cook']]
    }
  };

  /* 團體活動：days 是星期幾（0 = 星期日）；who 固定名單，或 byDay 依星期幾換人；act 可以是一種，或依人不同 {sid: act}。
     subj 是加入時一起解的那一題出自哪一科（不在名單上的科目也可以，例如下棋出數學）。 */
  I.GATHERINGS = [
    { id: 'morning_read', name: '晨讀會', icon: '📖', days: [1, 2, 3, 4, 5], from: 7, to: 8, place: 'plazaTree',
      who: ['chinese', 'english', 'civics'], act: { chinese: 'read', english: 'cards', civics: 'read' }, subj: ['chinese', 'english', 'civics'] },
    { id: 'morning_exercise', name: '早操', icon: '🤸', days: [0, 6], from: 7.5, to: 8.25, place: 'fountain',
      who: ['geography', 'biology', 'physics', 'english'], act: 'stretch', subj: ['biology'] },
    { id: 'sports_warmup', name: '運動會熱身', icon: '🏃', days: [0], from: 9, to: 10, place: 'sportsWarm',   // v9.4.1 週日的運動會開場：在跑道南邊做熱身操（下雨不辦）
      who: ['geography', 'biology', 'physics', 'english'], act: 'stretch', subj: ['physics'] },
    { id: 'market_lunch', name: '市集午餐', icon: '🍙', days: [0, 1, 2, 3, 4, 5, 6], from: 12, to: 13, place: 'market',
      byDay: { 0: ['math', 'earth', 'civics'], 1: ['chemistry', 'math'], 2: ['geography', 'civics'], 3: ['chemistry', 'earth'], 4: ['english', 'physics'], 5: ['chemistry', 'biology'], 6: ['chinese', 'geography', 'english'] },
      act: 'shop', subj: ['chemistry', 'biology', 'geography'] },
    { id: 'pier_sunset', name: '碼頭看夕陽', icon: '🌅', days: [0, 1, 2, 3, 4, 5, 6], from: 17, to: 18.25, place: 'pierEnd',
      byDay: { 0: ['chinese', 'geography'], 1: ['chinese', 'earth'], 2: ['english', 'biology'], 3: ['geography', 'physics'], 4: ['math', 'chemistry'], 5: ['civics', 'chinese'], 6: ['earth', 'english', 'biology'] },
      act: 'sunset', subj: ['earth', 'physics'] },
    { id: 'tree_concert', name: '大樹下合奏', icon: '🎻', days: [3], from: 19, to: 20, place: 'plazaTree',
      who: ['math', 'english', 'chemistry'], act: { math: 'violin', english: 'sing', chemistry: 'tambourine' }, subj: ['math', 'physics'] },
    { id: 'chess', name: '下棋', icon: '♟️', days: [2, 4], from: 15, to: 16.5, place: 'chess',
      who: ['civics', 'physics'], act: 'chess', subj: ['math', 'civics'] },
    { id: 'kite', name: '放風箏', icon: '🪁', days: [0], from: 15, to: 17, place: 'cape',
      who: ['geography', 'biology', 'earth'], act: 'kite', subj: ['earth', 'physics'] },
    { id: 'stargaze', name: '觀星會', icon: '🔭', days: [5, 6], from: 20.5, to: 22, place: 'telescope',
      who: ['earth', 'physics', 'chinese'], act: 'stars', subj: ['earth'] },
    { id: 'picnic', name: '野餐', icon: '🧺', days: [6], from: 11, to: 12.75, place: 'picnic',
      who: ['chemistry', 'biology', 'math'], act: 'picnic', subj: ['chemistry', 'biology'] },
    { id: 'night_market', name: '逛港邊夜市', icon: '🏮', days: [6], from: 19, to: 21, place: 'nightMarket',   // v9.4.0 週六晚上的夜市（攤位 18:00–23:00）
      who: ['geography', 'biology', 'civics'], act: 'shop', subj: ['math'] },
    { id: 'night_busk', name: '夜市街頭演奏', icon: '🎻', days: [6], from: 19, to: 20, place: 'nightBusk',   // 週六的合奏搬到夜市東頭
      who: ['math', 'english', 'chemistry'], act: { math: 'violin', english: 'sing', chemistry: 'tambourine' }, subj: ['math', 'physics'] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
