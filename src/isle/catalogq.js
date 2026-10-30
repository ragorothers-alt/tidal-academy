/* 潮汐小島 · 收藏目錄的資料規則（純函式，tests/isle.test.cjs 直接測）：家具怎麼拿到、哪些算在目錄裡、收集獎勵的門檻。 */
export const CATS = [['', '全部'], ['bed', '床'], ['seat', '椅子'], ['table', '桌子'], ['storage', '收納'], ['study', '學習'], ['light', '燈'], ['plant', '植物'], ['rug', '地毯'], ['deco', '擺飾'], ['trophy', '獎盃']];
export const KINDS = [['fish', '魚類'], ['bug', '昆蟲'], ['fossil', '化石'], ['sea', '潮間帶生物'], ['mineral', '礦物'], ['marine', '海洋生物']];
/** 活動家具的來源（src 是 event:<名稱>） */
export const EV = {
  after: '考後慶典', bug_cup: '週五捕蟲大會的獎盃', d100: '學測倒數 100 天', eve: '學測前夜', fish_cup: '週三釣魚大賽的獎盃',
  garden: '花園：培育出四種豌豆', halloween: '潮汐夜祭（用糖果在商店兌換）', lantern: '元宵燈會', mid_autumn: '中秋',
  mock_gold: '週末模擬考祭典（9 題以上）', night_market: '週六港邊夜市的集章卡（第 1、3、5 次集滿）', mock_silver: '週末模擬考祭典（7–8 題）', mock_bronze: '週末模擬考祭典（5–6 題）',
  newyear: '跨年', solstice: '冬至', spring: '春櫻', stars: '觀星（星座圖鑑、星之碎片）', weekly: '第一次參加週末模擬考祭典', xmas: '聖誕',
  dex_all: '五種圖鑑全部收齊', museum_all: '博物館五個展區全部捐齊',
};
/** 目錄裡的家具：飯店的固定擺設（hotel-fixed）拿不到，不算 */
export const inCatalog = f => !!f && f.src !== 'hotel-fixed';
/** 家具怎麼拿到；name(sid) 回傳導師名字 */
export function how(f, name) {
  const src = String(f.src || '');
  if (f.hotel) return '潮汐渡假飯店：用優惠券兌換';
  if (f.shard) return '夢境島：用夢之碎片兌換';
  if (src === 'shop') return '阿潮的商店（每天換貨）';
  if (src === 'diy') return 'DIY 工作台：從漂流瓶學到配方後手作';
  if (src.startsWith('gift:')) return `${name(src.slice(5))}的心事（好感度）`;
  if (src.startsWith('research:')) return `${name(src.slice(9))}的研究計畫`;
  if (src.startsWith('event:')) return EV[src.slice(6)] || '';
  return '';
}
/** 家具目錄的里程碑：[種數, 鈴錢] */
export const FURN_GOALS = [[50, 3000], [100, 8000], [150, 15000]];
/** 一種收藏是不是收齊了：have 是已登錄的 id 集合（物件），all 是全部 id */
export const full = (have, all) => all.length > 0 && all.every(id => have && have[id]);
