/* 潮汐小島 · 互動示意圖：用 anatomy skill 畫的等角機械圖（把一個概念做成一台會動、有即時讀數的小機器）。
   每張是 figs/ 裡一個獨立的 HTML（圖庫內嵌、不連網路），依單元與關鍵字配到題目：
   解析說到一半時對話框右上角出現「看示意圖」，點了用大面板打開；潮汐筆記的單元頁上面也列出這個單元的示意圖。 */
import * as ui from './ui.js';
import { S, save } from './state.js';

/** 示意圖清單：{ id（figs/<id>.html）, unit（單元 id）, title（面板標題）, kw（題目或解析符合才配，省略＝整個單元都配） } */
export const FIGS = [
  { id: 'force-cart', unit: 'ph-motion', title: '力學台車：F合＝ma', kw: /F合|合力|摩擦力|台車/ },
  { id: 'kepler-orbit', unit: 'ph-gravity', title: '克卜勒軌道儀：等面積定律', kw: /克卜勒|近日點|遠日點|等面積|半長軸|橢圓軌道|公轉週期|行星.{0,10}(?:軌道|公轉)/ },
  { id: 'induction-coil', unit: 'ph-em', title: '電磁感應台：磁鐵與檢流計', kw: /電磁感應|檢流計|磁通量|感應電流|感應電動勢|冷次/ },
  { id: 'ripple-interference', unit: 'ph-wave', title: '水波槽：雙源干涉', kw: /干涉|亮紋|雙狹縫|狹縫間距|疊加|同相|反相|相長|相消/ },
  { id: 'pendulum-energy', unit: 'ph-energy', title: '單擺能量儀：動能與位能', kw: /單擺|力學能|動能|位能/ },
  { id: 'reaction-piston', unit: 'ch-react', title: '反應速率槽：產氣活塞', kw: /反應速率|催化劑|活化能|接觸面積|有效碰撞|碰撞頻率/ },
  { id: 'seasons-tilt', unit: 'es-motion', title: '四季儀：地軸傾斜與直射點', kw: /地軸|直射|正午太陽仰角|夏至|冬至|白晝|晝長/ },
  { id: 'tide-machine', unit: 'es-ocean', title: '潮汐機：大潮與小潮', kw: /潮汐|大潮|小潮|潮差|滿潮|乾潮|漲潮|退潮|引潮/ },
  { id: 'sea-breeze', unit: 'es-atmos', title: '海陸風箱：白天海風、夜晚陸風', kw: /海陸風|海風|陸風|午後雷陣雨|熱對流|局部環流|山谷風/ },
  { id: 'enzyme-hill', unit: 'bi-physio', title: '酵素壓機：活化能丘', kw: /活化能|變性|生物催化劑|澱粉酶|酵素|受質/ },
  { id: 'unit-circle', unit: 'ma2-trig', title: '單位圓儀：sin、cos 與 tan 投影', kw: /象限|參考角|同界角|弧度|廣義角|sin\s?-?\d+°|cos\s?-?\d+°|tan\s?\d+°|sin\s?θ\s?=|cos\s?θ\s?=|tan\s?θ\s?=/ },
  { id: 'vector-crane', unit: 'ma2-vec', title: '向量起重機：合成、夾角與內積', kw: /內積|夾角|正射影|a·b|平行四邊形面積|\|a \+ b\||\|a − b\|/ },
  { id: 'growth-decay', unit: 'ma1-explog', title: '成長衰減機：每期倍率與對數刻度', kw: /每期|每小時有|完整期數|本利和|衰減訊號|存滿|首次超過|首次低於/ },
  { id: 'galton-board', unit: 'ma2-prob', title: '高爾頓落珠板：正面次數的分布', kw: /硬幣|投籃|命中|恰好進|恰有一次成功|恰有兩次成功|正面的枚數/ },
  { id: 'wind-belts', unit: 'ge-climate', title: '行星風帶儀：氣壓帶與風帶', kw: /副熱帶高壓|赤道低壓|熱帶輻合|信風|西風帶|盛行西風|氣壓帶|下沉乾燥/ },
  { id: 'mendel-press', unit: 'bi-gene', title: '孟德爾選豆壓機：棋盤方格與比例', kw: /Aa|Tt|試交|紫花|異型合子/ },
];

const BASE = () => window.__FIG_BASE || 'src/isle/figs/';
/** 示意圖頁面的網址（考場面板裡的疊層也用） */
export const url = f => BASE() + f.id + '.html';
/** 看過幾次示意圖（「還沒試過的玩法」用） */
export function mark() { const s = S(); s.stats = s.stats || {}; s.stats.figs = (s.stats.figs || 0) + 1; save(); }
/** 這一題配哪一張：同單元裡關鍵字符合的優先，其次整個單元通用的 */
export function figFor(q) {
  if (!q || !q.unit) return null;
  const list = FIGS.filter(f => f.unit === q.unit); if (!list.length) return null;
  const text = ui.plain((q.q || '') + ' ' + (q.e || '') + ' ' + (q.passage || ''));
  return list.find(f => f.kw && f.kw.test(text)) || list.find(f => !f.kw) || null;
}
/** 單元的全部示意圖（潮汐筆記用） */
export const forUnit = uid => FIGS.filter(f => f.unit === uid);
/** 用大面板打開一張示意圖（關掉就回到原本的對話或筆記） */
export function open(f, back) {
  const body = ui.el('div', 'fig-wrap');
  const fr = document.createElement('iframe'); fr.className = 'fig-frame'; fr.src = url(f); mark(); fr.title = f.title; fr.setAttribute('sandbox', 'allow-scripts');
  body.appendChild(fr);
  ui.panel('示意圖 · ' + f.title, body, { cls: 'fig-p', onClose: back });
}
ui.setFigHook(q => { const f = figFor(q); return f && { title: f.title, open: () => open(f) }; });
