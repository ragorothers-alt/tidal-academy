/* 潮汐小島 · 旅客島民、圖書館與島嶼評價台詞。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};

  I.GUESTS = [
    {
      id: 'sui_sui', name: '穗穗', kind: 'hamster',
      fur: '#e9bf38', inner: '#fff3ba', shirt: '#522e68', pants: '#293849',
      acc: 'hat', voice: 565,
      persona: '把每個選項分別裝進小口袋的多選題獵人，愛蒐集票根，找到線索時會壓低聲音偷偷歡呼。',
      catch: '一格一格',
      focus: { mode: 'multi', subject: null, label: '多選題特訓' },
      lines: {
        arrive: [
          '你好，我是穗穗！帳篷旁那排小夾子是我的，夾題卡用的，沒有在曬餅乾。',
          '我帶了一袋多選題來露營。你想坐坐的話，我先把椅子上的票根收起來，一格一格。'
        ],
        greet: [
          '一格一格，今天的口袋整理好了！左邊放題卡，右邊……啊，是昨天的糖紙。',
          '噓，我剛找到一張很漂亮的船票。先讓你看，題卡等一下再拿。',
          '你來啦！帽子底下有點熱，我們去樹蔭裡聊。'
        ],
        challenge: [
          '今天玩多選題特訓，我們把每個選項各放一格，再回題目找它的線索。',
          '先不用猜總共有幾個答案；哪一格讓你猶豫，就留張小紙條，一格一格看。'
        ],
        pass: [
          '找到啦！我要小小聲歡呼，免得把你剛整理好的想法吹散。',
          '你連那些不起眼的小格子都照顧到了，這張題卡可以好好收起來。',
          '一格一格，這道題的線索收好了！我在紙邊替它畫了一個小小的圈。'
        ],
        fail: [
          '有一格跟我們想的不一樣。把說明放旁邊，我陪你對照看看。',
          '先把拿不定主意的選項夾住就好，今天不用把整袋都整理完。',
          '答錯不會把你的座位收走。我先倒水，你想再看時再叫我。'
        ],
        movein: [
          '這裡有人願意聽我講一張小票根的故事，我有點捨不得拆帳篷了。',
          '如果能住下來，我想替題卡做個抽屜，也替你的來訪留一張椅子。'
        ],
        settled: [
          '一格一格，我真的有自己的抽屜了！請進，帽子可以掛門邊。',
          '今天收的是船票，題卡先休息。你想看哪一疊，我拿給你。'
        ],
        chat: [
          '這張票根被雨淋過，我還是留著。那天有人借我傘，紙皺皺的也很好看。',
          '我替抽屜寫了標籤，結果「還沒決定」那格最滿。它們住得挺自在的。',
          '帽沿可以擋陽光，還能暫時接住落葉。只是站起來前要記得看看。',
          '我常把喜歡的點心留到最後，最後又捨不得吃。今天想練習先咬一口。',
          '要不要一起做張散步票？沒有期限，想坐著看海也算使用過了。'
        ]
      },
      // 票根抽屜與逐項整理桌；另一側留床與一個小小招待角。
      home: {
        wall: 'wp_notebook_grid', floor: 'fl_honey_oak',
        items: [
          { id: 'open_bookcase', x: 0, z: 0, r: 3 },
          { id: 'pastel_study_desk', x: 1, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 2, z: 1, r: 2 },
          { id: 'open_bookcase', x: 5, z: 0, r: 0 },
          { id: 'pastel_single_bed', x: 7, z: 0, r: 0 },
          { id: 'bedside_cabinet', x: 6, z: 0, r: 0 },
          { id: 'coral_chest_of_drawers', x: 0, z: 2, r: 3 },
          { id: 'pedestal_analog_clock', x: 2, z: 2, r: 0 },
          { id: 'pastel_wardrobe', x: 0, z: 4, r: 3 },
          { id: 'lavender_armchair', x: 1, z: 5, r: 3 },
          { id: 'tea_set_on_tray', x: 2, z: 5, r: 0 },
          { id: 'soft_floor_lamp', x: 0, z: 6, r: 3 },
          { id: 'leafy_potted_plant', x: 7, z: 7, r: 2 },
          { id: 'woven_rectangular_rug', x: 1, z: 5, r: 0 }
        ]
      }
    },
    {
      id: 'dou_dian', name: '逗點', kind: 'sheep',
      fur: '#bd536f', inner: '#ffe2ae', shirt: '#175c64', pants: '#e6ceb0',
      acc: 'bow', voice: 360,
      persona: '主持題組讀書會的玫瑰羊，總先替大家放好書籤，自己卻常聊到忘了喝茶。',
      catch: '留個逗號',
      focus: { mode: 'group', subject: 'chinese', label: '國文題組讀書會' },
      lines: {
        arrive: [
          '歡迎坐到營地的小圓桌！我是逗點，這場讀書會目前只有我和一片掉進茶杯的葉子。',
          '我帶了國文題組和很多書籤。你可以先挑書籤，留個逗號，我們再慢慢認識。'
        ],
        greet: [
          '你的椅子還在這裡，留個逗號。今天想先聊近況嗎？',
          '我剛把大家的書籤排好，又忘了自己的放在哪裡。你看，是不是在蝴蝶結旁？',
          '茶還沒泡，我倒是已經準備好聽你說話了。說什麼都可以。'
        ],
        challenge: [
          '今天讀國文題組。我們先看看共用的文章，再把每一題想問的地方找出來。',
          '題目之間可以停一下。留個逗號，回文章確認後，再決定往哪裡走。'
        ],
        pass: [
          '你把文章和問題接得好清楚，正好一起喝口茶。',
          '這一頁讀書會有你的聲音，想替書籤挑個顏色嗎？',
          '留個逗號，這份開心值得在紙邊留一小筆。'
        ],
        fail: [
          '我們先停在這裡，看看說明指的是文章哪一段。桌上有地方攤開。',
          '這一頁還有沒接上的地方也沒關係，書籤會替我們記住位置。',
          '今天想先散會也可以。留個逗號，下次來仍然有你的椅子。'
        ],
        movein: [
          '我很喜歡這裡的聊天聲，連讀到一半的停頓都有人陪。',
          '想把小圓桌搬到島上，開一間想發言或只想聽都歡迎的讀書會。'
        ],
        settled: [
          '請進！圓桌搬好了，我連不想說話時的座位都留好了。',
          '留個逗號，今天讀書會從一杯水開始。書放旁邊就好。'
        ],
        chat: [
          '我的書籤有長有短，最短那張原本是包點心的紙。捨不得就留下來了。',
          '我想幫圓桌取名字，大家一聊就聊到傍晚。桌子還沒名字，點心倒是吃完了。',
          '有時我講到一半忘記下一句，就看看大家。有人笑一下，我也跟著笑。',
          '蝴蝶結今天綁得很端正，因為出門前試了三次。昨天歪歪的那個也很喜歡。',
          '讀書會可以有散步場嗎？帶一本書出門，最後一起坐在樹下，也挺好的。'
        ]
      },
      // 讀書會圓桌有四向座位；沙發區接住散會後還想聊的午後。
      home: {
        wall: 'wp_coral_check', floor: 'fl_white_ash',
        items: [
          { id: 'open_bookcase', x: 0, z: 0, r: 3 },
          { id: 'chinese_threadbound_cabinet', x: 4, z: 0, r: 0 },
          { id: 'open_bookcase', x: 5, z: 0, r: 0 },
          { id: 'pastel_single_bed', x: 6, z: 0, r: 0 },
          { id: 'bedside_cabinet', x: 7, z: 0, r: 1 },
          { id: 'round_dining_table', x: 1, z: 2, r: 0 },
          { id: 'wood_dining_chair', x: 2, z: 1, r: 0 },
          { id: 'wood_dining_chair', x: 0, z: 2, r: 3 },
          { id: 'wood_dining_chair', x: 1, z: 4, r: 2 },
          { id: 'wood_dining_chair', x: 3, z: 2, r: 1 },
          { id: 'soft_floor_lamp', x: 0, z: 3, r: 3 },
          { id: 'soft_table_lamp', x: 7, z: 6, r: 1 },
          { id: 'mint_two_seat_sofa', x: 5, z: 5, r: 0 },
          { id: 'tea_set_on_tray', x: 6, z: 6, r: 0 },
          { id: 'low_coffee_table', x: 5, z: 7, r: 2 },
          { id: 'flower_pot', x: 7, z: 7, r: 2 },
          { id: 'layered_oval_rug', x: 5, z: 6, r: 0 }
        ]
      }
    },
    {
      id: 'pin_tu', name: '拼圖', kind: 'panda',
      fur: '#3d67b8', inner: '#fce9bf', shirt: '#e5e8d8', pants: '#214a47',
      acc: 'glasses', voice: 260,
      persona: '用不同顏色便條串起想法的跨科偵探，喜歡拼布，結案時總先把沒想通的那片好好留著。',
      catch: '拼一片',
      focus: { mode: 'mixed', subject: null, label: '跨科混合偵探社' },
      lines: {
        arrive: [
          '我是拼圖，帳篷上那些色塊是我縫的。嗯，這一角還空著，打算留給旅途的新故事。',
          '我的行李裡有不同科目的題卡。想跟我拼一片嗎？先坐下也可以。'
        ],
        greet: [
          '拼一片，你來得剛好。我正在替一張不知道放哪裡的便條找位置。',
          '眼鏡擦好了，偵探社今天先受理「點心去哪裡了」。我好像就是當事人。',
          '這裡還有一塊空桌面，你的想法可以先放著，不用立刻接起來。'
        ],
        challenge: [
          '今天是跨科混合挑戰，題卡會換科目。我們先辨認這一題在問什麼，再選用手邊的想法。',
          '換科時我會陪你停一下。拼一片，不必急著把每張便條都接成同一條線。'
        ],
        pass: [
          '這張題卡，你找到了自己的入口。偵探社的便條上又多一條線索了。',
          '拼一片，今天的拼布多了一角！我想把這段一起想的時間縫進去。',
          '你願意換個方法看下一題，我很喜歡剛才那個停下來想的表情。'
        ],
        fail: [
          '這張便條暫時還沒找到位置。先看看解說，我們不用硬把它塞進去。',
          '換科有時會讓我也愣一下。把剛才卡住的地方記下來，慢慢整理。',
          '先收工也很好，沒拼完的布有自己的盒子，你的想法也能留到下次。'
        ],
        movein: [
          '這座島上有好多不同的想法，我想住下來，聽聽它們怎麼相遇。',
          '如果能搬來，我想開個小偵探社，接到一半的便條也都歡迎。'
        ],
        settled: [
          '偵探社開門了！請進，今天不用帶案件，帶自己來就好。',
          '拼一片，窗邊的布還沒縫完。要陪我挑顏色，還是一起喝茶？'
        ],
        chat: [
          '我的拼布裡有一塊舊口袋，現在還能裝東西。被子上有口袋，我覺得很方便。',
          '我寫了一張「記得找眼鏡」的便條，戴著眼鏡找了好久才看懂。',
          '有些布邊不太整齊，我先留下來。也許下一塊剛好喜歡這樣的形狀。',
          '便條顏色太多，今天決定隨手拿。結果午餐清單和偵探筆記穿了一樣的外套。',
          '你覺得這一角適合縫海浪還是椅子？我想留下我們一起坐過的地方。'
        ]
      },
      // 跨科收藏圍著研究桌；拼布茶角與書櫃各有自己的側邊。
      home: {
        wall: 'wp_wood_linen', floor: 'fl_lavender_plain',
        items: [
          { id: 'chinese_threadbound_cabinet', x: 0, z: 0, r: 3 },
          { id: 'history_ancient_map_table', x: 1, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 2, z: 1, r: 2 },
          { id: 'english_dictionary_shelf', x: 4, z: 0, r: 0 },
          { id: 'math_geometry_models', x: 5, z: 0, r: 0 },
          { id: 'biology_microscope', x: 6, z: 0, r: 0 },
          { id: 'pedestal_analog_clock', x: 7, z: 0, r: 1 },
          { id: 'pastel_single_bed', x: 0, z: 1, r: 3 },
          { id: 'coral_chest_of_drawers', x: 0, z: 2, r: 3 },
          { id: 'soft_floor_lamp', x: 7, z: 2, r: 1 },
          { id: 'mint_two_seat_sofa', x: 7, z: 4, r: 1 },
          { id: 'low_coffee_table', x: 5, z: 4, r: 1 },
          { id: 'open_bookcase', x: 0, z: 5, r: 3 },
          { id: 'tea_set_on_tray', x: 6, z: 5, r: 0 },
          { id: 'open_bookcase', x: 1, z: 7, r: 2 },
          { id: 'leafy_potted_plant', x: 7, z: 7, r: 2 },
          { id: 'woven_rectangular_rug', x: 5, z: 6, r: 0 }
        ]
      }
    },
    {
      id: 'shi_jie', name: '石階', kind: 'koala',
      fur: '#8b4c94', inner: '#f3d2ac', shirt: '#c7ce46', pants: '#332845',
      acc: 'scarf', voice: 205,
      persona: '替難題拆出小落腳處的解題搭檔，喜歡矮凳與迷你擺設，說話總先替人留一段坐穩的時間。',
      catch: '先踩這格',
      focus: { mode: 'hard', subject: 'math', label: '數學難題小步走' },
      lines: {
        arrive: [
          '你好，我叫石階。營地這張矮凳是我帶的，坐起來剛好，背包可以先放旁邊。',
          '我喜歡陪人拆難題。先踩這格，今天先認識彼此，不用急著拿出草稿。'
        ],
        greet: [
          '先踩這格，坐穩再說。圍巾剛曬好，還有一點暖暖的味道。',
          '今天整理了幾張空白紙，空白的時候也很可愛。你想拿一張嗎？',
          '我把矮凳挪近一些了，你不用伸長脖子聽我說話。'
        ],
        challenge: [
          '今天是數學高難度題。我們先把題目給的條件攤開，只挑一個能開始的地方。',
          '不用一次走到最後。先踩這格，寫下一步，再看看要不要繼續。'
        ],
        pass: [
          '你一步步走到這裡了，我想陪你坐下，看看剛才留下的草稿。',
          '那個原本沒有落腳處的地方，被你慢慢找到了。這張紙值得留著。',
          '先踩這格，在這裡坐穩，回頭看看你寫過的路，我也跟著開心。'
        ],
        fail: [
          '這一步還有點晃，我們先坐下看說明，找一處能重新開始的位置。',
          '難題走到一半就停，也有可留下的草稿。別急著把整張擦掉。',
          '今天不往前走也可以。你的背包交給凳子，肩膀先歇一下。'
        ],
        movein: [
          '我喜歡這座島願意讓人坐穩再出發，想把矮凳留得久一點。',
          '搬來以後，我想有一張大桌子，讓寫到一半的草稿也有地方過夜。'
        ],
        settled: [
          '先踩這格，歡迎到家裡來。鞋子放穩，矮凳就在旁邊。',
          '桌上那張紙還沒寫完，我留著明天再想。現在正好能聽你說說話。'
        ],
        chat: [
          '我的迷你椅子坐不了人，我還是替它縫了坐墊。小小的舒服也想照顧到。',
          '買凳子的時候，我每張都坐了一下。店家最後也拉張凳子陪我坐。',
          '圍巾尾巴有個小結，是提醒我帶鑰匙的。現在又加了一個，提醒我看看第一個。',
          '我想做一座很小的樓梯，讓窗邊的擺設也能慢慢上樓。',
          '今天我們只坐在這裡也很好。門口的小路，明天還可以一起走。'
        ]
      },
      // 兩張矮凳陪伴拆步草稿；迷你收藏、床與休息角沿牆配置。
      home: {
        wall: 'wp_blackboard', floor: 'fl_sand_stripe',
        items: [
          { id: 'pastel_single_bed', x: 0, z: 0, r: 3 },
          { id: 'bedside_cabinet', x: 0, z: 1, r: 3 },
          { id: 'math_abacus', x: 2, z: 0, r: 0 },
          { id: 'pastel_study_desk', x: 5, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 5, z: 1, r: 2 },
          { id: 'math_geometry_models', x: 7, z: 0, r: 1 },
          { id: 'round_wood_stool', x: 2, z: 2, r: 0 },
          { id: 'round_wood_stool', x: 2, z: 3, r: 0 },
          { id: 'open_bookcase', x: 0, z: 3, r: 3 },
          { id: 'soft_floor_lamp', x: 7, z: 3, r: 1 },
          { id: 'lavender_armchair', x: 5, z: 5, r: 0 },
          { id: 'low_coffee_table', x: 6, z: 5, r: 1 },
          { id: 'open_bookcase', x: 7, z: 5, r: 1 },
          { id: 'tea_set_on_tray', x: 2, z: 6, r: 0 },
          { id: 'flower_pot', x: 0, z: 7, r: 2 },
          { id: 'layered_oval_rug', x: 5, z: 5, r: 1 }
        ]
      }
    },
    {
      id: 'you_mi', name: '郵米', kind: 'otter',
      fur: '#48a6b0', inner: '#faefbb', shirt: '#7e244c', pants: '#f0c85a',
      acc: 'bow', voice: 440,
      persona: '把單字卡當小信投遞的口袋郵差，走路輕快，最喜歡收到朋友用自己的話寫的回信。',
      catch: '投遞啦',
      focus: { mode: 'vocab', subject: 'english', label: '單字衝刺郵局' },
      lines: {
        arrive: [
          '投遞啦！我是郵米，第一次到這個營地，先送一張寫著我名字的小卡給你。',
          '郵袋裡裝的是英文單字卡。你願意陪我整理嗎？我們可以坐著投遞。'
        ],
        greet: [
          '投遞啦，今天第一封問候送給你！信封裡先留空，想聊什麼都裝得下。',
          '我把郵袋放下了，現在兩隻手都可以拿點心。你也坐呀。',
          '蝴蝶結有點歪，是剛才走得太開心了。見到你就更開心。'
        ],
        challenge: [
          '今天開單字衝刺郵局，看看題卡上的提示，再替單字選一個合適的回答。',
          '哪張卡還不熟，我們就先放進待回信那格。投遞啦，衝刺也可以照你的步調。'
        ],
        pass: [
          '這封小信送到了！我想在今天的信封上畫一個開心的圈。',
          '你和這幾張單字卡打過招呼了，下次碰面可以再聊一聊。',
          '投遞啦，這封謝謝你陪我整理的信，不需要回覆。'
        ],
        fail: [
          '這封小信先放待回信，不會退給你一張責備自己的紙。',
          '看看卡片的說明吧，我陪你把容易混在一起的地方留個記號。',
          '郵袋今天可以先關起來。喝口水，下次想收信時再來。'
        ],
        movein: [
          '我很喜歡這裡的收件人，會接住小信，也會問我有沒有休息。',
          '想在島上開個小郵局，單字卡和朋友的近況，都能慢慢投遞。'
        ],
        settled: [
          '投遞啦！啊，這次是你來敲我的門。快進來，郵袋剛好收好了。',
          '待回信抽屜搬好了，旁邊那張椅子是留給來聊天的你。'
        ],
        chat: [
          '我喜歡信封裡夾一張很小的畫，不必畫得像，收到時還是會笑出來。',
          '郵袋最底下有一顆鈴鐺，找東西時叮一聲，好像它也想參加聊天。',
          '有封信只寫了「今天想坐一下」，我帶著兩杯水去赴約了。',
          '我在挑明天用的信封，點點的和條紋的都很好。乾脆各帶一張。',
          '回信晚一點也沒關係。我比較想知道，你寫那張紙的時候坐得舒不舒服。'
        ]
      },
      // 三格信件斗櫃與側向分揀桌；單字架之外有能放下郵袋的沙發。
      home: {
        wall: 'wp_blue_dot', floor: 'fl_coral_check',
        items: [
          { id: 'coral_chest_of_drawers', x: 0, z: 0, r: 0 },
          { id: 'coral_chest_of_drawers', x: 1, z: 0, r: 0 },
          { id: 'coral_chest_of_drawers', x: 2, z: 0, r: 0 },
          { id: 'english_alphabet_blocks', x: 4, z: 0, r: 0 },
          { id: 'english_dictionary_shelf', x: 5, z: 0, r: 0 },
          { id: 'pastel_study_desk', x: 6, z: 0, r: 1 },
          { id: 'wood_dining_chair', x: 5, z: 1, r: 3 },
          { id: 'soft_table_lamp', x: 7, z: 0, r: 1 },
          { id: 'pastel_single_bed', x: 0, z: 3, r: 3 },
          { id: 'bedside_cabinet', x: 0, z: 4, r: 3 },
          { id: 'soft_floor_lamp', x: 7, z: 4, r: 1 },
          { id: 'low_coffee_table', x: 1, z: 5, r: 2 },
          { id: 'mint_two_seat_sofa', x: 1, z: 6, r: 2 },
          { id: 'tea_set_on_tray', x: 5, z: 6, r: 0 },
          { id: 'leafy_potted_plant', x: 7, z: 7, r: 2 },
          { id: 'woven_rectangular_rug', x: 1, z: 7, r: 0 }
        ]
      }
    },
    {
      id: 'liu_bai', name: '留白', kind: 'cat',
      fur: '#ebe19a', inner: '#a45583', shirt: '#173d74', pants: '#607044',
      acc: 'brush', voice: 295,
      persona: '喜歡剪貼與改稿的國文留白師，說話俐落，會先收好橡皮擦再認真聽完別人的一句話。',
      catch: '空一行',
      focus: { mode: 'subject', subject: 'chinese', label: '國文留白練習' },
      lines: {
        arrive: [
          '我是留白。營地這張紙剪了一半，另一半還沒想到要貼什麼，先留著。',
          '我帶了國文題卡，也帶了幾張空白紙。空一行，讓我們的第一句話有地方坐。'
        ],
        greet: [
          '空一行。來，桌上的紙挪開了，放你的杯子剛剛好。',
          '我剛收好剪刀，現在可以專心聽你說。',
          '今天的紙邊有點歪，我看了看，決定就這樣貼。'
        ],
        challenge: [
          '今天練國文。我們先讀題目，把它想問的地方留在紙上，再慢慢找自己的回答。',
          '拿不定主意時就空一行，回去看題目或說明，再補上一句。'
        ],
        pass: [
          '這個回答放進來很合適。我把草稿邊的小夾子打開，讓你帶走。',
          '你把想法說清楚了，我很喜歡這張紙現在的樣子。',
          '空一行，讓這次想通的地方好好待著。我的小夾子都準備好了。'
        ],
        fail: [
          '這裡可以改。先看看說明，原來的草稿也不用丟。',
          '留一行給這個疑問吧，下次想到什麼，再接在旁邊。',
          '橡皮擦先收起來也可以。我把紙夾好，等你想看時再拿。'
        ],
        movein: [
          '我想把剪貼簿留在這座島，空頁還很多，想慢慢貼進這裡的日常。',
          '搬來以後，能不能常讓我聽你說一句話？短短一句也好。'
        ],
        settled: [
          '請進。空一行，桌子上正好有你的杯子位置。',
          '剪貼簿住進抽屜了。今天要翻舊頁，還是只坐一下？'
        ],
        chat: [
          '我剪下一張包裝紙的小窗，貼進本子裡。翻開時，像替昨天開了扇窗。',
          '橡皮擦屑剛掃完，又發現尾巴上有一點。我決定先整理尾巴。',
          '有張卡片我改了好幾次，最後只寫「想見你」。剛好夠。',
          '今天不想寫字，所以替空白頁貼了個框。它現在看起來很神氣。',
          '你慢慢講。我喜歡聽一句話原本的樣子，停頓也會留著。'
        ]
      },
      // 寬桌陪伴剪貼與改稿；坐墊、茶几和空白牆面構成輕盈客廳。
      home: {
        wall: 'wp_ivory_wash', floor: 'fl_slate_wood',
        items: [
          { id: 'pastel_single_bed', x: 0, z: 0, r: 0 },
          { id: 'bedside_cabinet', x: 1, z: 0, r: 0 },
          { id: 'chinese_brush_inkstone', x: 3, z: 0, r: 0 },
          { id: 'chinese_threadbound_cabinet', x: 4, z: 0, r: 0 },
          { id: 'open_bookcase', x: 7, z: 0, r: 1 },
          { id: 'pastel_study_desk', x: 5, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 5, z: 1, r: 2 },
          { id: 'soft_floor_lamp', x: 7, z: 3, r: 1 },
          { id: 'soft_floor_cushion', x: 0, z: 4, r: 0 },
          { id: 'soft_floor_cushion', x: 1, z: 4, r: 0 },
          { id: 'low_coffee_table', x: 0, z: 5, r: 0 },
          { id: 'tea_set_on_tray', x: 2, z: 5, r: 0 },
          { id: 'pastel_wardrobe', x: 7, z: 5, r: 1 },
          { id: 'flower_pot', x: 0, z: 7, r: 2 },
          { id: 'woven_rectangular_rug', x: 0, z: 4, r: 0 }
        ]
      }
    },
    {
      id: 'hui_quan', name: '迴圈', kind: 'bunny',
      fur: '#6359b3', inner: '#e5c77b', shirt: '#ef8154', pants: '#202b47',
      acc: 'goggles', voice: 530,
      persona: '喜歡回頭檢查想法的難題慢修員，隨手畫繞圈線，護目鏡很醒目卻常忘記自己戴著它。',
      catch: '繞回看看',
      focus: { mode: 'hard', subject: 'physics', label: '物理難題慢修站' },
      lines: {
        arrive: [
          '你好！我是迴圈，剛把帳篷繩上的結重綁了一次。嗯，這次有記得留出走路的地方。',
          '我帶來幾張想慢慢修的物理難題。繞回看看，不急，先借你這張乾淨的凳子。'
        ],
        greet: [
          '繞回看看，我是不是把護目鏡放在……啊，就在額頭上！',
          '我剛替草稿畫了個圈，圈太大，連旁邊的點心也框進去了。',
          '來啦！今天的慢修站有空位，你想帶個疑問來坐，還是先聊天？'
        ],
        challenge: [
          '今天慢慢修物理高難度題，先留下題目的條件，再看看自己的第一個想法。',
          '走到卡住的地方，我們就繞回看看。可以畫草圖，也可以先寫一句疑問。'
        ],
        pass: [
          '接上了！剛才那張有圈圈的草稿，現在多了一段你想通的路。',
          '你願意回頭照顧卡住的那一步，我想替今天畫個很開心的圈。',
          '慢修站多了一個接上的地方！我替草稿夾好，讓這個想法留得住。'
        ],
        fail: [
          '這個想法還沒接好，我們把說明攤開，只找剛才卡住的一處。',
          '繞回看看也可以慢一點。你想先把題目收起來，我會替草稿夾好。',
          '今天試過的路還留在紙上，不會白白消失。現在耳朵也想休息一下。'
        ],
        movein: [
          '我在這裡重畫草稿時，有人會問我要不要水。想留在這樣的地方。',
          '搬來以後，我想做一個慢修角，讓還沒接好的想法都有位置。'
        ],
        settled: [
          '慢修站搬好了！請進，這次我有先把門邊的繩子收乾淨。',
          '繞回看看，原來你已經坐下了。我先把護目鏡摘掉，再陪你聊。'
        ],
        chat: [
          '我畫的線總愛繞圈，最後看起來像一碗麵。現在草稿本旁邊真的放了碗。',
          '護目鏡擦得太亮時，我會對著它看自己的耳朵有沒有歪。通常都有一點。',
          '今天把一團繩整理好了，最喜歡的部分是終於可以把桌面擦乾淨。',
          '有個圈圈我忘了為什麼畫，就在旁邊寫「當時應該有想法」。先保留吧。',
          '要不要幫我挑一張唱片？我想讓慢修站今天有一段只用來聽的時間。'
        ]
      },
      // 側牆草稿桌與難題收藏；唱片和坐墊陪伴收工後的慢修員。
      home: {
        wall: 'wp_lavender_stripe', floor: 'fl_geometry_grid',
        items: [
          { id: 'physics_tesla_lamp', x: 0, z: 0, r: 3 },
          { id: 'physics_newton_cradle', x: 2, z: 0, r: 0 },
          { id: 'open_bookcase', x: 4, z: 0, r: 0 },
          { id: 'math_geometry_models', x: 5, z: 0, r: 0 },
          { id: 'pastel_single_bed', x: 6, z: 0, r: 1 },
          { id: 'bedside_cabinet', x: 7, z: 1, r: 1 },
          { id: 'pastel_study_desk', x: 0, z: 1, r: 3 },
          { id: 'wood_dining_chair', x: 1, z: 2, r: 1 },
          { id: 'pastel_wardrobe', x: 7, z: 3, r: 1 },
          { id: 'soft_floor_lamp', x: 0, z: 5, r: 3 },
          { id: 'soft_floor_cushion', x: 5, z: 5, r: 0 },
          { id: 'retro_record_player', x: 6, z: 5, r: 0 },
          { id: 'low_coffee_table', x: 5, z: 6, r: 0 },
          { id: 'cactus_pot', x: 0, z: 7, r: 2 },
          { id: 'layered_oval_rug', x: 5, z: 5, r: 0 }
        ]
      }
    },
    {
      id: 'xiao_cha', name: '小岔', kind: 'fox',
      fur: '#86bbc8', inner: '#edc389', shirt: '#8e2f35', pants: '#efe0c2',
      acc: 'hat', voice: 330,
      persona: '替英文長題組畫停靠路線的閱讀領航員，收集手畫小地圖，遇到岔路總先陪人坐下辨認。',
      catch: '停靠一下',
      focus: { mode: 'group', subject: 'english', label: '英文題組停靠站' },
      lines: {
        arrive: [
          '我是小岔，第一次來這個營地，地圖上剛多畫了一張你的椅子。',
          '我帶了英文題組來，想一起讀時就停靠一下。現在先認得彼此的名字也很好。'
        ],
        greet: [
          '停靠一下，這張椅子今天在樹蔭裡。我在地圖旁邊畫了小小的圈。',
          '帽子掛好了，今天不用出遠門，也可以聊一段很遠的故事。',
          '你來啦。我正替手畫地圖留空白，還有地方放你的新路線。'
        ],
        challenge: [
          '今天是英文題組閱讀，先看文章和問題，再決定要回哪一段找線索。',
          '長一點的文章可以分段停靠。不熟的地方先做記號，我陪你回去看看。'
        ],
        pass: [
          '這趟閱讀停靠得很穩，你找到題目要回去看的地方了。',
          '小地圖上多了一條走過的路。要替今天的停靠站畫張椅子嗎？',
          '停靠一下，這張題卡有你的路線了。我在旁邊畫了一張舒服的椅子。'
        ],
        fail: [
          '這次停到另一段了。看看說明，我陪你回到題目指的地方。',
          '文章還不熟也沒關係，先留個記號，想再讀時就從這裡開始。',
          '你可以先靠岸休息。地圖我替你收著，下次再走也找得到。'
        ],
        movein: [
          '我開始認得島上的椅子，也認得你走來時的腳步，想在這裡住下。',
          '如果搬來，我想把閱讀路線放在小桌旁，讓每次停靠都有水喝。'
        ],
        settled: [
          '停靠一下，你到我的家了。帽子放門邊，椅子已經擦乾淨。',
          '小地圖掛好了，最喜歡的一站是這裡。因為朋友會來坐。'
        ],
        chat: [
          '我畫地圖時會把好坐的地方畫得大一點，走到那裡就想多待一會。',
          '今天畫的小路有點歪，我沒重畫。那一段本來就走得很悠閒。',
          '帽子裡夾著一張很舊的小地圖，上面還畫著第一次借我水杯的朋友。',
          '有次散步走回原本那張椅子，我就把路線取名叫「坐一下再坐一下」。',
          '你想把哪個地方畫進來？不必有特別的風景，喜歡待著就可以。'
        ]
      },
      // 閱讀桌與字典靠後牆；左側停靠椅、右側沙發留出兩種閱讀姿勢。
      home: {
        wall: 'wp_mint_stripe', floor: 'fl_blue_tiles',
        items: [
          { id: 'english_dictionary_shelf', x: 0, z: 0, r: 3 },
          { id: 'pastel_study_desk', x: 1, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 1, z: 1, r: 2 },
          { id: 'geography_globe', x: 4, z: 0, r: 0 },
          { id: 'open_bookcase', x: 5, z: 0, r: 0 },
          { id: 'bedside_cabinet', x: 6, z: 0, r: 0 },
          { id: 'pastel_single_bed', x: 7, z: 0, r: 0 },
          { id: 'pedestal_analog_clock', x: 5, z: 2, r: 0 },
          { id: 'low_coffee_table', x: 0, z: 3, r: 1 },
          { id: 'lavender_armchair', x: 1, z: 3, r: 1 },
          { id: 'tea_set_on_tray', x: 0, z: 5, r: 0 },
          { id: 'mint_two_seat_sofa', x: 5, z: 5, r: 0 },
          { id: 'hanging_standing_lantern', x: 7, z: 5, r: 1 },
          { id: 'soft_floor_lamp', x: 0, z: 6, r: 3 },
          { id: 'flower_pot', x: 7, z: 7, r: 2 },
          { id: 'woven_rectangular_rug', x: 0, z: 3, r: 1 }
        ]
      }
    },
    {
      id: 'shuang_shuang', name: '雙雙', kind: 'penguin',
      fur: '#d77ca2', inner: '#fff6c2', shirt: '#25483a', pants: '#5b2440',
      acc: 'glasses', voice: 240,
      persona: '喜歡左右攤開草稿的多選對照員，愛蒐集成對杯子，但也會替找不到同伴的杯子留位置。',
      catch: '都看一眼',
      focus: { mode: 'multi', subject: 'chemistry', label: '化學多選對照室' },
      lines: {
        arrive: [
          '我是雙雙，這兩個杯子都是我的。營地有人來坐時，就有一個可以借出去。',
          '我帶了化學多選題，還有左右攤開用的草稿。都看一眼，先看看哪張椅子舒服。'
        ],
        greet: [
          '都看一眼，今天兩個杯子都洗好了。你喜歡哪個？',
          '左邊是題卡，右邊是還沒寫的紙。中間這個位置正好放點心。',
          '我剛扶正眼鏡，現在可以好好看著你聽近況。'
        ],
        challenge: [
          '今天練化學多選題，題目和草稿分放兩邊，每個選項都回頭對照一次。',
          '都看一眼，也看看自己還在猶豫的地方；不用先替答案個數做決定。'
        ],
        pass: [
          '兩邊的線索整理好了，你剛才照顧到每個選項的樣子很仔細。',
          '這張草稿可以收進今天那格，旁邊我留了放你杯子的空位。',
          '都看一眼，現在看看窗外吧。眼鏡和眼睛都想換個風景。'
        ],
        fail: [
          '我們先把說明放到右邊，對照剛才拿不定主意的那個選項。',
          '這次少看了一處也沒關係，做個記號，下次它就有自己的位置。',
          '紙先收好，杯子還留著。你想休息，我就陪你看窗外。'
        ],
        movein: [
          '在島上，第二個杯子常常有人用。我想把這種日子留得長一點。',
          '如果搬來，我想有張寬桌子，左右能放草稿，中間能招待你。'
        ],
        settled: [
          '歡迎！桌子夠寬，杯子也放好了。都看一眼，想坐哪邊？',
          '今天右邊那疊紙還空著，我先用它畫了一個請你喝茶的小圈。'
        ],
        chat: [
          '兩個杯子花色不一樣，放一起倒很好看。我最近不太堅持要買同一款了。',
          '我有隻落單的杯子，給它留了最好的位置。它現在每天陪我喝水。',
          '想買一對新拖鞋，試穿時左右拿錯。走兩步就發現今天很不對勁。',
          '桌子的左右我記得很清楚，點心的位置就常常換。好像每邊都很適合。',
          '你來時不用幫我找另一個杯子。先坐下，我喜歡替朋友挑一個。'
        ]
      },
      // 寬床與對照書桌分居兩側；茶角的雙杯、雙椅呼應成對收藏。
      home: {
        wall: 'wp_cloud_tile', floor: 'fl_mint_tiles',
        items: [
          { id: 'pastel_double_bed', x: 0, z: 0, r: 0 },
          { id: 'bedside_cabinet', x: 2, z: 0, r: 0 },
          { id: 'open_bookcase', x: 4, z: 0, r: 0 },
          { id: 'pastel_study_desk', x: 5, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 5, z: 1, r: 2 },
          { id: 'chemistry_test_tube_rack', x: 7, z: 0, r: 1 },
          { id: 'coral_chest_of_drawers', x: 0, z: 3, r: 3 },
          { id: 'soft_table_lamp', x: 7, z: 6, r: 1 },
          { id: 'low_coffee_table', x: 5, z: 4, r: 0 },
          { id: 'tea_set_on_tray', x: 5, z: 5, r: 0 },
          { id: 'tea_set_on_tray', x: 6, z: 5, r: 0 },
          { id: 'wood_dining_chair', x: 5, z: 6, r: 2 },
          { id: 'wood_dining_chair', x: 6, z: 6, r: 2 },
          { id: 'compact_kitchenette', x: 0, z: 6, r: 3 },
          { id: 'flower_pot', x: 7, z: 7, r: 2 },
          { id: 'layered_oval_rug', x: 5, z: 6, r: 0 }
        ]
      }
    },
    {
      id: 'zhi_yuan', name: '紙鳶', kind: 'deer',
      fur: '#a0bd75', inner: '#f4e6b5', shirt: '#58356b', pants: '#e8c58f',
      acc: 'leaf', voice: 410,
      persona: '用色紙與小圖切換思路的跨科拼貼師，愛做紙風箏，總會把重畫的那面也留給朋友看。',
      catch: '換張紙',
      focus: { mode: 'mixed', subject: null, label: '跨科混合拼貼課' },
      lines: {
        arrive: [
          '我是紙鳶，營地旁的小紙風箏是我做的。現在先收著，想讓它陪我們坐一會。',
          '我帶了不同科目的題卡和一疊色紙。換張紙，先替今天挑個你喜歡的顏色。'
        ],
        greet: [
          '換張紙！今天這張還沒畫，你想先把近況放在哪一角？',
          '頭上的葉子又歪了，我決定跟紙風箏一樣，先讓它自在一點。',
          '我剪了一張小椅子，正想貼進本子裡。你來坐，剛好有真的椅子。'
        ],
        challenge: [
          '今天做跨科混合練習，每換一科，我們就重新看這題需要怎麼想。',
          '換張紙也可以換個起點。想寫字、畫小圖，或先說出疑問，都有地方放。'
        ],
        pass: [
          '這張紙有自己的樣子，你替眼前這道題找到合適的開始了。',
          '這段一起換方法的時間，我想貼進最常翻的那一頁。',
          '換張紙，這張留給慶祝。要畫點心還是畫我們的椅子？'
        ],
        fail: [
          '這張還可以再畫。看看解說，我陪你把剛才不清楚的地方留出來。',
          '換科換得有點忙時，我也會停一下。先照顧眼前這張紙就好。',
          '先收起來也可以，紙的背面還在。今天不用急著把兩面寫滿。'
        ],
        movein: [
          '我喜歡島上這麼多不同的角落，想慢慢把它們剪進自己的本子。',
          '如果能搬來，我想留一面清爽的牆，貼我們一起想過的小圖。'
        ],
        settled: [
          '換張紙，我的家終於有新的一頁！來，桌邊有你的座位。',
          '紙風箏已經收好了，今天可以陪我挑幾張色紙，也可以陪我什麼都不做。'
        ],
        chat: [
          '我把一張畫歪的椅子貼在本子裡，朋友說看起來很好坐。我也越看越喜歡。',
          '紙風箏的尾巴我剪得太長，收起來時像替它疊一條很細的被子。',
          '挑色紙常挑得忘了時間，今天只帶三張出門，終於比較快坐下了。',
          '有張紙的背面留著你上次畫的小圈，我剪東西時特別繞開它。',
          '我想把今天的午後貼進本子，可能只需要一張椅子和兩個杯子。'
        ]
      },
      // 拼貼桌對著跨科收藏；床邊與沙發邊都留有植物和收紙空間。
      home: {
        wall: 'wp_sage_plain', floor: 'fl_white_ash',
        items: [
          { id: 'open_bookcase', x: 0, z: 0, r: 0 },
          { id: 'open_bookcase', x: 1, z: 0, r: 0 },
          { id: 'chinese_threadbound_cabinet', x: 2, z: 0, r: 0 },
          { id: 'soft_table_lamp', x: 2, z: 1, r: 0 },
          { id: 'pastel_study_desk', x: 5, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 5, z: 1, r: 2 },
          { id: 'geography_globe', x: 7, z: 0, r: 1 },
          { id: 'history_compass', x: 7, z: 1, r: 1 },
          { id: 'leafy_potted_plant', x: 0, z: 2, r: 3 },
          { id: 'flower_pot', x: 0, z: 3, r: 3 },
          { id: 'cactus_pot', x: 7, z: 4, r: 1 },
          { id: 'pastel_single_bed', x: 0, z: 5, r: 3 },
          { id: 'bedside_cabinet', x: 0, z: 6, r: 3 },
          { id: 'mint_two_seat_sofa', x: 7, z: 5, r: 1 },
          { id: 'low_coffee_table', x: 5, z: 5, r: 1 },
          { id: 'tea_set_on_tray', x: 7, z: 7, r: 2 },
          { id: 'woven_rectangular_rug', x: 5, z: 7, r: 0 }
        ]
      }
    },
    {
      id: 'wo_wo', name: '窩窩', kind: 'owl',
      fur: '#e997a0', inner: '#bce0d7', shirt: '#334e84', pants: '#f4deab',
      acc: 'scarf', voice: 185,
      persona: '邀人用自己的話重述題目的歷史小劇場搭檔，低聲說話、愛替紙偶換圍巾，輪到別人時聽得特別專心。',
      catch: '換我聽聽',
      focus: { mode: 'subject', subject: 'history', label: '歷史複述小劇場' },
      lines: {
        arrive: [
          '你好，我是窩窩。營地這張小椅子是給紙偶的，大張的這張可以給你。',
          '我帶了歷史題卡，想陪人把讀到的問題說成自己的話。換我聽聽，先聽你的名字。'
        ],
        greet: [
          '換我聽聽，今天想從哪件小事開始？紙偶已經坐好當觀眾了。',
          '我剛替紙偶換圍巾，結果自己的還搭在椅背。等我披好再來。',
          '你來了，這裡正好安靜。我把唱片先暫停，留一段時間給你。'
        ],
        challenge: [
          '今天練歷史題，先讀清題目，再試著用自己的話說說它要我們想什麼。',
          '換我聽聽。不想說出聲也可以寫下來，再回題目看看有沒有漏掉的線索。'
        ],
        pass: [
          '我聽懂你剛才怎麼想了，紙偶也坐得很專心。想替今天留個小標題嗎？',
          '這一幕有你的說法，收進劇場本裡，回頭想看時就翻得到。',
          '換我聽聽，這張題卡有你的聲音。我替小劇場本留了一行，記下剛才的想法。'
        ],
        fail: [
          '這一幕可以重來。先讀說明，看看剛才漏聽了哪條線索。',
          '紙偶不會催場，你也不用急著把話講得很完整。我陪你留個停頓。',
          '今天先謝幕也可以。圍巾和座位都留著，下次想來就坐下。'
        ],
        movein: [
          '我喜歡這裡有人願意看我的小紙偶，也願意講自己的故事，想留下來。',
          '搬來以後，想把兩張坐墊排好，開一個沒有催場鈴的小劇場。'
        ],
        settled: [
          '小劇場搬好了，歡迎進來。紙偶今天坐旁邊，讓我們先聊。',
          '換我聽聽。茶桌已經擦乾淨，圍巾也不佔你的椅子了。'
        ],
        chat: [
          '紙偶的圍巾太長，我替它多繞一圈。現在它看起來比我還怕冷。',
          '有個紙偶總是站不穩，我就替它做了一張椅子。坐著演也很好。',
          '我喜歡聽朋友講很小的事，像是今天找到哪個杯子。故事可以從那裡開始。',
          '想替劇場加一個開場動作，最後選了大家一起把坐墊拍鬆。',
          '你想只聽不說也可以。我替紙偶翻翻本子，你就靠著椅背歇歇。'
        ]
      },
      // 研究桌與紙偶坐墊分區；圓茶桌的三面座位保留完整出入動線。
      home: {
        wall: 'wp_wood_linen', floor: 'fl_coral_check',
        items: [
          { id: 'open_bookcase', x: 0, z: 0, r: 3 },
          { id: 'history_ancient_map_table', x: 1, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 1, z: 1, r: 2 },
          { id: 'chinese_threadbound_cabinet', x: 4, z: 0, r: 0 },
          { id: 'history_compass', x: 5, z: 0, r: 0 },
          { id: 'bedside_cabinet', x: 6, z: 0, r: 0 },
          { id: 'pastel_single_bed', x: 7, z: 0, r: 0 },
          { id: 'retro_record_player', x: 0, z: 3, r: 3 },
          { id: 'hanging_standing_lantern', x: 7, z: 4, r: 1 },
          { id: 'wood_dining_chair', x: 5, z: 4, r: 0 },
          { id: 'tea_set_on_tray', x: 6, z: 4, r: 0 },
          { id: 'round_dining_table', x: 5, z: 5, r: 0 },
          { id: 'wood_dining_chair', x: 7, z: 5, r: 1 },
          { id: 'wood_dining_chair', x: 4, z: 5, r: 3 },
          { id: 'low_coffee_table', x: 0, z: 5, r: 2 },
          { id: 'soft_floor_cushion', x: 0, z: 6, r: 2 },
          { id: 'soft_floor_cushion', x: 1, z: 6, r: 2 },
          { id: 'leafy_potted_plant', x: 7, z: 6, r: 1 },
          { id: 'woven_rectangular_rug', x: 0, z: 6, r: 0 }
        ]
      }
    },
    {
      id: 'pao_fu', name: '泡芙', kind: 'frog',
      fur: '#c6cde8', inner: '#f6d091', shirt: '#934818', pants: '#3f365e',
      acc: null, voice: 590,
      persona: '把題目畫成方框小圖的生物草稿畫家，愛畫點心盒，分享時總先承認自己的線也會歪。',
      catch: '畫個框',
      focus: { mode: 'subject', subject: 'biology', label: '生物草稿小畫室' },
      lines: {
        arrive: [
          '我是泡芙！營地這張小畫畫的是點心盒，還沒畫點心，因為我剛剛吃掉了。',
          '我帶了生物題卡和畫草稿的紙。畫個框，先把今天見到你的開心放進來。'
        ],
        greet: [
          '畫個框，你來啦！今天的框有點歪，坐得下我們就好。',
          '我的筆剛削好，正想畫你的杯子。可以等你喝完水再畫。',
          '畫室今天有空白紙，也有空椅子。你想先選哪個？'
        ],
        challenge: [
          '今天練生物題。我們先讀題目，想用小圖整理時，就把重要的字放進草稿框裡。',
          '畫個框，不用畫得漂亮。拿不定主意的地方可以留白，再回題目確認。'
        ],
        pass: [
          '這張草稿有你的想法了！線歪不歪我先不管，我想記住剛才一起想的樣子。',
          '你把題目和自己的小圖對照好了，今天這頁我想替你夾起來。',
          '畫個框，裝今天的小小開心。剩下的空白要不要畫點心？'
        ],
        fail: [
          '框裡還有沒放好的地方，我們看看說明，在旁邊慢慢補。',
          '不用整張重畫，先留住已經想過的部分。紙上還有空位。',
          '筆可以先放下，畫室不會因為這一題就關門。想坐著歇歇也歡迎。'
        ],
        movein: [
          '我想在島上留一間小畫室，把見到朋友的日子一格一格畫下來。',
          '搬來後想留幾張空白紙，你來時就一起畫，或一起把紙好好放著。'
        ],
        settled: [
          '畫個框，這回框裡是我的家！請進，紙和椅子都準備好了。',
          '今天的點心盒還沒畫完，我先收一邊，桌面留給你。'
        ],
        chat: [
          '我畫的泡芙有時像枕頭，所以這一頁取名叫「想睡的點心」。',
          '筆盒裡有一支很短的鉛筆，我替它留最前面的位置，拿起來比較容易。',
          '今天想畫一張完全不改的草稿，第一個框就歪了。我看著它，慢慢笑了。',
          '有朋友在我的小圖旁畫了顆星，我沒擦。現在每次翻開都會看一下。',
          '你不想畫也沒關係，幫我挑個點心盒的顏色吧，或陪我坐到茶喝完。'
        ]
      },
      // 方框草稿桌旁有生物收藏；大床與長沙發讓畫室也能安心歇筆。
      home: {
        wall: 'wp_notebook_grid', floor: 'fl_lavender_plain',
        items: [
          { id: 'pastel_study_desk', x: 0, z: 0, r: 0 },
          { id: 'wood_dining_chair', x: 0, z: 1, r: 2 },
          { id: 'biology_microscope', x: 2, z: 0, r: 0 },
          { id: 'open_bookcase', x: 4, z: 0, r: 0 },
          { id: 'open_bookcase', x: 5, z: 0, r: 0 },
          { id: 'bedside_cabinet', x: 5, z: 1, r: 3 },
          { id: 'pastel_double_bed', x: 6, z: 0, r: 0 },
          { id: 'soft_table_lamp', x: 5, z: 2, r: 0 },
          { id: 'mint_two_seat_sofa', x: 0, z: 4, r: 3 },
          { id: 'low_coffee_table', x: 1, z: 4, r: 1 },
          { id: 'tea_set_on_tray', x: 2, z: 5, r: 0 },
          { id: 'soft_floor_cushion', x: 1, z: 6, r: 0 },
          { id: 'leafy_potted_plant', x: 7, z: 5, r: 1 },
          { id: 'coral_chest_of_drawers', x: 0, z: 6, r: 3 },
          { id: 'flower_pot', x: 7, z: 7, r: 2 },
          { id: 'layered_oval_rug', x: 1, z: 6, r: 0 }
        ]
      }
    }
  ];

  I.LIBRARIAN = {
    name: '書棲', kind: 'dog',
    fur: '#263c52', inner: '#f0c591', shirt: '#dbcfa6', pants: '#71877f',
    acc: 'glasses', voice: 225, catch: '替你留頁',
    greet: [
      '歡迎，我是書棲。替你留頁，也替你留一張有燈的閱讀桌。',
      '你來了，書架剛整理好。先放下背包，慢慢挑想看的地方。',
      '圖書館今天有安靜的座位，也有我可以陪你聊一小段的座位。'
    ],
    mistakes: [
      '有幾道做過的錯題在這裡，想不想一起看看，當時卡在哪裡？',
      '替你留頁。這些錯題可以一張張看，先從眼前這張慢慢開始。',
      '錯題本整理好了，題目和說明可以放在一起，想複習時我陪你找。'
    ],
    due: [
      '今天排到幾張複習卡，想和它們打個招呼嗎？',
      '有些做過的題到了安排回看的日子，我替你放在桌邊，照你的步調翻。',
      '替你留頁，今天的複習清單在這裡。我們從眼前這題慢慢開始。'
    ],
    vocab: [
      '單字卡收在這一格，要不要一起複習看看？旁邊有地方做記號。',
      '有些單字想再和你見個面，先看看卡上的提示，不熟的可以留著慢慢看。',
      '替你留頁，單字複習的小桌空著。帶一杯水來坐也很合適。'
    ],
    notes: [
      '這邊是單元筆記，挑你今天想看的單元，慢慢翻就好。',
      '做題時留下的疑問，可以帶到單元筆記這裡，一邊對照一邊看。',
      '替你留頁。想先讀筆記再做題，也有一張桌子等你。'
    ],
    praise: [
      '你剛才願意回頭看那個疑問，我把翻過的位置替你夾好了。',
      '這一頁多了你自己的記號，下一次翻開，就有地方接著看。',
      '你把想法說給我聽，我很開心。這張桌子今天有一段屬於你的故事。',
      '剛才這個想通的地方，我替你留個書籤，回頭想看時就找得到。'
    ],
    comfort: [
      '讀到卡住的地方，先停一下也可以。你想看說明時，我再把它拿過來。',
      '這裡的座位不會因為答錯就收走，背包放下，喝口水吧。',
      '今天想先休息，我就替你留頁。下次想讀時，再從這頁繼續。',
      '還沒弄懂的疑問可以留在紙邊，你不用帶著完整的答案才走進來。'
    ],
    empty: [
      '現在沒有待整理的錯題。想翻單元筆記，或單純坐著看書，都歡迎。',
      '錯題架目前空著，替你留頁的書籤還在。今天可以挑自己喜歡的閱讀。'
    ]
  };

  // 後牆八座書架、兩側各兩座書架；四組閱讀桌、椅、檯燈沿兩翼排列。
  // 所有家具使用獨立地格，檯燈不疊放在桌面；中央四格與雙格入口留空。
  I.LIBRARY = {
    wall: 'wp_wood_linen', floor: 'fl_white_ash',
    items: [
      { id: 'open_bookcase', x: 0, z: 0, r: 0 },
      { id: 'chinese_threadbound_cabinet', x: 1, z: 0, r: 0 },
      { id: 'open_bookcase', x: 2, z: 0, r: 0 },
      { id: 'english_dictionary_shelf', x: 3, z: 0, r: 0 },
      { id: 'open_bookcase', x: 4, z: 0, r: 0 },
      { id: 'chinese_threadbound_cabinet', x: 5, z: 0, r: 0 },
      { id: 'english_dictionary_shelf', x: 6, z: 0, r: 0 },
      { id: 'open_bookcase', x: 7, z: 0, r: 0 },
      { id: 'leafy_potted_plant', x: 0, z: 1, r: 3 },
      { id: 'flower_pot', x: 7, z: 1, r: 1 },
      { id: 'open_bookcase', x: 0, z: 2, r: 3 },
      { id: 'pastel_study_desk', x: 1, z: 2, r: 0 },
      { id: 'pastel_study_desk', x: 5, z: 2, r: 0 },
      { id: 'open_bookcase', x: 7, z: 2, r: 1 },
      { id: 'soft_table_lamp', x: 0, z: 3, r: 3 },
      { id: 'wood_dining_chair', x: 1, z: 3, r: 2 },
      { id: 'wood_dining_chair', x: 6, z: 3, r: 2 },
      { id: 'soft_table_lamp', x: 7, z: 3, r: 1 },
      { id: 'open_bookcase', x: 0, z: 5, r: 2 },
      { id: 'open_bookcase', x: 7, z: 5, r: 2 },
      { id: 'pastel_study_desk', x: 1, z: 5, r: 0 },
      { id: 'pastel_study_desk', x: 5, z: 5, r: 0 },
      { id: 'soft_table_lamp', x: 0, z: 6, r: 3 },
      { id: 'wood_dining_chair', x: 1, z: 6, r: 2 },
      { id: 'wood_dining_chair', x: 6, z: 6, r: 2 },
      { id: 'soft_table_lamp', x: 7, z: 6, r: 1 },
      { id: 'flower_pot', x: 0, z: 7, r: 2 },
      { id: 'leafy_potted_plant', x: 7, z: 7, r: 2 }
    ]
  };

  I.RATING = {
    title: [
      '一星｜小島剛亮起第一盞燈，已經有一個可以開始的地方。',
      '二星｜日常慢慢有了輪廓，轉角也開始留得住腳步。',
      '三星｜讀書、散步和相遇都有了自己的位置，小島住起來很舒服。',
      '四星｜這裡有好多被用心照顧的角落，走到哪裡都想多待一下。',
      '五星｜潮汐小島裝著滿滿的共同回憶，也留得下下一個悠閒的午後。'
    ],
    tips: {
      study: [
        '想讓學習日常更豐富，可以挑一科做幾題，再留下想回看的地方。',
        '到圖書館回看錯題或複習卡吧，替還沒想通的地方留個記號。',
        '也可以先讀一段單元筆記，替下次做題留個書籤。'
      ],
      museum: [
        '有新的收藏時，帶去博物館看看吧，讓展區多一段你的故事。',
        '想添一點島上的回憶，可以去找找還沒捐贈的收藏。'
      ],
      friends: [
        '遇見島民時，停下來聊聊吧，一句問候也能讓今天更熱鬧。',
        '營地有旅客來訪時，可以先認識對方，再挑想一起玩的挑戰。'
      ],
      home: [
        '挑一件喜歡的家具，替家裡布置一個想坐下來的角落吧。',
        '換張壁紙或地板也很好，記得替門口和走路的位置留些空間。'
      ],
      dex: [
        '想出門走走時，看看圖鑑還有哪些沒遇過的小鄰居。',
        '帶著釣竿或捕蟲網散步，遇到新的收藏再把那份開心記下來。'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
