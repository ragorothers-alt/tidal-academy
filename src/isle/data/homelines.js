/* 潮汐小島 · 導師家的學習角落：書桌、書架可以翻開這一科的筆記；招牌家具會讓導師說一句話（room.js／main.js 讀 I.HOME_STUDY） */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.HOME_STUDY = {
    chinese: {
      study: ['pastel_study_desk', 'chinese_threadbound_cabinet'],
      unit: 'zh-poem',
      label: '翻開「詩詞曲賞析」的筆記',
      sig: 'chinese_brush_inkstone',
      lines: [
        '喵……硯臺裡的墨像夜海，正好陪我讀一首詩。',
        '毛筆停在紙上的月亮旁，今晚這首詩，有一點想家的味道。',
        '這枝筆寫過風，也寫過茶香，今天想替你留一行。'
      ]
    },
    english: {
      study: ['english_dictionary_shelf', 'round_dining_table'],
      unit: 'en-phrase',
      label: '翻開「片語與搭配詞」的筆記',
      sig: 'english_alphabet_blocks',
      lines: [
        '嗨！字母積木排好了，今天想和哪個單字交朋友？',
        '積木拼成單字還不夠，我想替它找個合拍的搭配詞！',
        '這排字母積木少了一塊？啊，我拿去拼點心的名字了！'
      ]
    },
    math: {
      study: ['pastel_study_desk', 'open_bookcase', 'low_coffee_table'],
      unit: 'ma1-seq',
      label: '翻開「數列與級數」的筆記',
      sig: 'math_abacus',
      lines: [
        '我替算珠排了數列，它們倒比我的合唱隊守規矩。',
        '上珠記五，下珠記一；我的算珠樂譜，節拍有點特別。',
        '珠子一顆顆歸位了，我的草稿還排著隊等檢查呢。'
      ]
    },
    geography: {
      study: ['pastel_study_desk', 'low_coffee_table'],
      unit: 'ge-skill',
      label: '翻開「地理技能與地圖」的筆記',
      sig: 'geography_contour_model',
      lines: [
        '嘿！山丘模型的小圈圈，像把今天走過的坡路收進家裡。',
        '模型上的等高線擠得好近！這段坡路，我們慢慢走。',
        '我沿著模型找了條緩坡，下次散步，連點心都不怕晃！'
      ]
    },
    civics: {
      study: ['round_dining_table', 'open_bookcase'],
      unit: 'ci-society',
      label: '翻開「公共性與多元社會」的筆記',
      sig: 'civics_balance_scale',
      lines: [
        '天平旁放著大家的紙條，每一種需要，我都想好好聽。',
        '看著天平，我想起野餐分工；每個人能做的事不太一樣。',
        '天平今天沒放砝碼，旁邊先留一張紙，記下你的理由。'
      ]
    },
    physics: {
      study: ['pastel_study_desk', 'open_bookcase', 'low_coffee_table'],
      unit: 'ph-energy',
      label: '翻開「能量與核能」的筆記',
      sig: 'physics_newton_cradle',
      lines: [
        '牛頓擺停下來了……我想追追看，能量去了哪裡。',
        '小球碰撞的聲音，也分走了一點能量。我想把它畫進草圖。',
        '這幾顆小球來回傳能量，害我忘了工具箱還沒收好。'
      ]
    },
    chemistry: {
      study: ['round_dining_table'],
      unit: 'ch-stoich',
      label: '翻開「化學計量」的筆記',
      sig: 'chemistry_test_tube_rack',
      lines: [
        '試管裡的小泡泡還沒冒頭，我先把這次用量記下來。',
        '試管架上的標籤寫的是莫耳數，配方可不是只看顏色呢。',
        '啵啵，試管都排好了！這次的濃度，我也記在食譜邊角了。'
      ]
    },
    biology: {
      study: ['pastel_study_desk', 'low_coffee_table'],
      unit: 'bi-cell',
      label: '翻開「生命的特性與細胞」的筆記',
      sig: 'biology_microscope',
      lines: [
        '你、你看……顯微鏡下這些細胞，比我畫得還整齊。',
        '顯微鏡旁留了一張細胞素描，線條有點歪，也想給你看。',
        '我把顯微鏡調到低倍了，葉子裡的細胞……想一起看看嗎？'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
