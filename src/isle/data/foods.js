/* 潮汐小島 · 料理：食材、食譜與料理背後的化學／生物知識。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};

  I.FOODS = [
    { id: "orange_jam", name: "橘子果醬", need: { fruit: 3, branch: 1 }, effect: "bells", price: 600,
      desc: "橘色果醬帶著細細果皮，甜酸裡透出柑橘清香，抹上吐司就是暖暖的早餐。",
      fact: "橘子果皮含有果膠，這種植物細胞壁中的多醣能在適當糖量與酸度下形成網狀凝膠，把水分留在其中，讓果醬呈現可塗抹的稠度。" },
    { id: "grilled_fish", name: "烤魚", need: { fish: 2, branch: 1 }, effect: "speed", price: 900,
      desc: "魚皮烤得金黃微脆，筷子一撥露出嫩白魚肉，淡淡鹹香像家裡的晚餐。",
      fact: "烤魚時，熱使肌肉蛋白質原有的立體構造改變，接著彼此聚集，肉色與口感也跟著變化；這叫變性，不代表肽鍵都被水解。" },
    { id: "oyster_omelet", name: "蚵仔煎", need: { oyster: 2, branch: 1 }, effect: "luck", price: 1200,
      desc: "鮮蚵裹在軟Ｑ粉漿與金黃蛋香裡，淋上一點甜鹹醬，熱熱吃最有夜市味。",
      fact: "蚵仔煎的家常粉漿含澱粉，加水受熱後顆粒吸水膨脹，形成糊化帶來的軟Ｑ口感；雞蛋蛋白質則因受熱變性而凝固。" },
    { id: "orange_juice", name: "橘子汁", need: { fruit: 2 }, effect: "speed", price: 350,
      desc: "現榨橘子汁透著亮亮橘黃，果肉細細浮在杯中，酸甜清香陪你歇一下。",
      fact: "橘子汁的維生素Ｃ又稱抗壞血酸，接觸氧氣會逐漸氧化而減少；較低的保存溫度能放慢反應，現榨後盡早飲用可減少久放造成的損失。" },
    { id: "pea_soup", name: "豌豆濃湯", need: { pea: 3, branch: 1 }, effect: "bells", price: 800,
      desc: "嫩綠濃湯慢慢冒著熱氣，豌豆甜味和綿密口感融在一匙裡，喝完暖到心底。",
      fact: "豌豆含有澱粉，在水中加熱時澱粉顆粒吸水膨脹、逐漸糊化，使濃湯更稠；攪打主要縮小食物顆粒，並不等於把澱粉分解成糖。" },
    { id: "fish_soup", name: "魚湯", need: { fish: 1, branch: 1 }, effect: "luck", price: 700,
      desc: "清亮湯裡躺著嫩白魚肉，薑香輕輕托住海味，一碗就像阿嬤端來的照顧。",
      fact: "家常魚湯加鹽調味時，氯化鈉晶體中的鈉離子與氯離子分開，周圍水分子以極性吸引並包圍它們；溶解是離子分散，不是鹽憑空消失。" },
    { id: "caramel_orange", name: "焦糖橘子", need: { fruit: 2, branch: 2 }, effect: "bells", price: 1000,
      desc: "橘瓣披上薄薄琥珀糖衣，先是焦糖微苦香，再湧出酸甜果汁，像午後的小獎勵。",
      fact: "焦糖化是糖受高溫作用後分解與重組，生成褐色和香氣物質；它不需要胺基化合物，與還原糖和含胺基物質參與的梅納反應不同。" },
    { id: "roasted_peas", name: "烤豌豆莢", need: { pea: 2, branch: 1 }, effect: "speed", price: 450,
      desc: "豌豆莢烤出幾點焦香，豆仁仍帶清甜，一顆顆剝著吃，是巷口閒聊的小點心。",
      fact: "烘烤先讓豆莢表面部分水分蒸發；表面溫度升高時，還原糖與含胺基物質可發生梅納反應，產生褐色與香氣，並非所有褐色都叫焦糖化。" },
    { id: "steamed_shellfish", name: "清蒸鮮蚵", need: { oyster: 3, branch: 1 }, effect: "luck", price: 1500,
      desc: "白嫩鮮蚵蒸得飽滿透亮，湯汁留著淡淡海潮味，配一點薑絲就很家常。",
      fact: "蚵仔是雙殼類，利用鰓過濾水中微小的食物；清蒸時熱會讓肌肉蛋白質變性並凝固，因此肉質逐漸緊實，這是生物構造與烹調化學的交會。" },
    { id: "pea_fish_stew", name: "豌豆燉魚", need: { pea: 2, fish: 2, branch: 1 }, effect: "bells", price: 1800,
      desc: "豌豆與魚肉在小鍋裡慢燉，嫩綠映著乳白魚塊，湯匙舀起滿滿清甜與暖意。",
      fact: "豌豆提供澱粉，魚肉提供蛋白質；消化時需由不同酵素分段催化水解，最終產生能被小腸吸收的葡萄糖與胺基酸，供身體利用。" }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
