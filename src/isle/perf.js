/* 潮汐小島 · 畫質等級：0 標準、1 省電、2 極省電（手機、平板）。
   啟動時讀一次存檔裡的設定（草、花的幾何在載入時就建好），切換後重新整理生效 */
const st = (((window.TA || {}).S || {}).isle || {}).settings || {};
export const LEVEL = st.lowPerf ? (st.ultra ? 2 : 1) : 0;
/** 極省電：解析度再降、每秒 30 格、草叢剩三分之一、低面數的花、遠處的小東西不畫、夜晚每格最多 3 盞燈 */
export const ULTRA = LEVEL === 2;
