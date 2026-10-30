/* 潮汐小島 · 風箏節的地科與物理題（純函式，可在 Node 測試）：
   風向（風向袋、風箏飄在哪一邊）、海風與陸風、等壓線疏密與風速、台灣的季風、風箏在空中的力平衡、尾巴的作用，以及放線的高度 h = L · sin θ。
   每題 { kind, text, opts, a, why }；opts 有四個、不重複。風箏節當天的風向由日期決定（白天吹海風：草地南邊是海，風從東南、南或西南吹來）。 */
export const DIRS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];   // 索引 i 的方位角是 i × 45°（北 = 0、順時針）
export const opp = i => (i + 4) % 8;
/** 方位 i 在地圖上的單位向量（x 往東、z 往南）：北是 (0, −1) */
export const vec = i => { const a = i * Math.PI / 4; return [Math.round(Math.sin(a) * 1e9) / 1e9, Math.round(-Math.cos(a) * 1e9) / 1e9]; };
/** 某一天的海風從哪裡吹來（東南、南、西南其中之一，同一天固定） */
export function windOn(ymd) { let h = 7; for (const c of String(ymd)) h = (h * 31 + c.charCodeAt(0)) % 1000003; return [3, 4, 5][h % 3]; }
export const SIN = { 30: 0.5, 45: 0.71, 60: 0.87 }, COS = { 30: 0.87, 45: 0.71, 60: 0.5 };
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
const fix = v => String(Math.round(v * 10) / 10);
const shuffle = (ans, wrongs, rnd, fmt = x => x) => {
  const set = [ans]; wrongs.forEach(w => { if (w != null && !set.includes(w) && set.length < 4) set.push(w); });
  for (let k = 1; set.length < 4; k++) { const w = typeof ans === 'number' ? Math.round((ans + k * (k % 2 ? 2.5 : -1.5)) * 10) / 10 : ans + k; if (!set.includes(w) && (typeof w !== 'number' || w > 0)) set.push(w); }
  const o = set.map(x => [x, rnd()]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
  return { opts: o.map(fmt), a: o.indexOf(ans) };
};

/* ---------- 風與天氣 ---------- */
export const WIND = {
  /** 風向袋的尾巴飄向下風處：尾巴朝哪裡，風就從反方向吹來 */
  sock: (rnd, from = pick([0, 1, 2, 3, 4, 5, 6, 7], rnd)) => { const to = opp(from), side = [(from + 2) % 8, (from + 6) % 8];
    return { kind: 'sock', text: `風向袋的尾巴飄向${DIRS[to]}方。現在吹的是什麼風？`, ...shuffle(`${DIRS[from]}風`, [`${DIRS[to]}風`, `${DIRS[side[0]]}風`, `${DIRS[side[1]]}風`], rnd), why: `風向袋被風吹得往下風處飄，尾巴朝${DIRS[to]}，風就是從${DIRS[from]}方吹來的。風向是說「風從哪裡吹來」，所以是${DIRS[from]}風。` }; },
  /** 吹某方向的風時，風箏飄在人的下風處 */
  side: (rnd, from = pick([0, 1, 2, 3, 4, 5, 6, 7], rnd)) => { const to = opp(from), side = [(from + 2) % 8, (from + 6) % 8];
    return { kind: 'side', text: `吹${DIRS[from]}風的時候，飛起來的風箏會在放風箏的人哪一邊？`, ...shuffle(`${DIRS[to]}邊`, [`${DIRS[from]}邊`, `${DIRS[side[0]]}邊`, `${DIRS[side[1]]}邊`], rnd), why: `${DIRS[from]}風是從${DIRS[from]}方吹來的，風箏被吹往下風處，所以飄在人的${DIRS[to]}邊——放風箏要背對著風。` }; },
  breeze: rnd => { const day = rnd() < 0.6;
    return { kind: 'breeze', text: `天氣晴朗、沒有鋒面的${day ? '白天' : '晚上'}，海邊近地面的風通常怎麼吹？`, ...shuffle(day ? '從海洋吹向陸地（海風）' : '從陸地吹向海洋（陸風）', [day ? '從陸地吹向海洋（陸風）' : '從海洋吹向陸地（海風）', '幾乎都是由上往下吹', '一整天都沒有風'], rnd),
      why: day ? '白天陸地升溫比海快，陸地上方的空氣受熱上升、近地面氣壓較低，風從氣壓較高的海面吹向陸地，叫海風。' : '晚上陸地降溫比海快，陸地上方的近地面氣壓變得比海面高，風從陸地吹向海洋，叫陸風。' }; },
  heat: rnd => ({ kind: 'heat', text: '白天海邊吹海風，最主要的原因是什麼？', ...shuffle('陸地比熱較小、升溫較快，陸地上方近地面氣壓較低', ['海水比熱較小、升溫較快，海面上氣壓較低', '月球的引力把空氣拉向陸地', '地球自轉讓風一定從海上吹來'], rnd),
    why: '同樣曬太陽，比熱小的陸地升溫快，陸地上空氣受熱上升，近地面形成低壓；海面相對是高壓，風就從海吹向陸。' }),
  isobar: rnd => { const [a, b] = rnd() < 0.5 ? ['甲', '乙'] : ['乙', '甲'];
    return { kind: 'isobar', text: `同一張地面天氣圖上，${a}地附近的等壓線比${b}地密得多。哪裡的風通常比較強？`, ...shuffle(`${a}地`, [`${b}地`, '兩地一樣強', '要看哪裡的氣溫比較高'], rnd), why: '等壓線越密，代表短距離內氣壓差越大（氣壓梯度大），推動空氣的力越大，風就越強。' }; },
  monsoon: rnd => { const winter = rnd() < 0.6;
    return { kind: 'monsoon', text: `台灣${winter ? '秋冬' : '夏天'}盛行的季風，主要是哪一個方向？`, ...shuffle(winter ? '東北季風' : '西南季風', [winter ? '西南季風' : '東北季風', '東南季風', '西北季風'], rnd),
      why: winter ? '秋冬亞洲大陸冷、氣壓高，冷空氣往南吹，經過地球自轉偏向後，到台灣成為東北季風；新竹的「九降風」就是它。' : '夏天亞洲大陸熱、氣壓低，海上的空氣吹向大陸，到台灣附近是西南季風，常帶來豐沛的雨水。' }; },
  balance: rnd => ({ kind: 'balance', text: '風箏穩穩停在空中、一動也不動的時候，它受到的合力是多少？', ...shuffle('零：重力、線的拉力和風的力互相抵消', ['等於風箏的重量，方向朝下', '等於風的力，方向朝下風處', '等於線的拉力，方向朝上'], rnd),
    why: '靜止（或等速）的物體加速度是零，由牛頓第二定律 F = ma，合力也是零：重力、線的拉力、風對風箏的力三個力平衡。' })
};
/** 工坊的題目：尾巴的作用 */
export const tailQ = rnd => ({ kind: 'tail', text: '菱形風箏下面綁一條長長的尾巴，主要是為了什麼？', ...shuffle('尾巴在下方增加阻力，讓風箏頭朝上、迎著風比較穩', ['讓風箏變重，才不會飛太高', '尾巴會產生往上的升力', '只是為了好看，對飛行沒有影響'], rnd),
  why: '尾巴受到的空氣阻力作用在風箏下方，像風向標的尾翼一樣，讓風箏的頭保持朝上、正對著風，不容易打轉翻落。' });

/* ---------- 放線的高度：線拉直時 h = L · sin θ ---------- */
export function heightQ(L, deg, rnd) {
  const s = SIN[deg], c = COS[deg], h = L * s;
  return { kind: 'height', text: `線放出 ${L} 公尺、拉直時和地面夾 ${deg}°。風箏大約比你的手高多少？（sin ${deg}° ≈ ${s}、cos ${deg}° ≈ ${c}）`,
    ...shuffle(Math.round(h * 10) / 10, [Math.round(L * c * 10) / 10, L, Math.round(L / s * 10) / 10].map(w => (w > 0 ? w : null)), rnd, x => `${fix(x)} 公尺`),
    why: `線、地面和風箏的高度圍成直角三角形，線是斜邊：高度 = 線長 × sin ${deg}° ≈ ${L} × ${s} = ${fix(h)} 公尺（cos 算的是水平距離）。` };
}
/** 放風箏的三題：第一題一定是看當天的風向袋，另外兩題從其他種類挑 */
export function flightQs(from, rnd = Math.random) {
  const rest = ['side', 'breeze', 'heat', 'isobar', 'monsoon', 'balance'].sort(() => rnd() - 0.5).slice(0, 2);
  return [WIND.sock(rnd, from)].concat(rest.map(k => (k === 'side' ? WIND.side(rnd, from) : WIND[k](rnd))));
}
