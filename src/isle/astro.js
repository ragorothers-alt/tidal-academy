/* 潮汐小島 · 天文計算（純函式，可在 node 測試）：台灣（北緯 23.5°、東經 121°）的恆星時與地平座標。 */
export const LAT = 23.5, LON = 121;
const D2R = Math.PI / 180;
/** 地方恆星時（小時） */
export function lst(date) { const jd = date.getTime() / 864e5 + 2440587.5; return (((18.697374558 + 24.06570982441908 * (jd - 2451545.0) + LON / 15) % 24) + 24) % 24; }
/** 赤經（時）赤緯（度）→ [地平高度, 方位角]（度；方位從北向東量） */
export function altAz(ra, dec, L) {
  const H = (L - ra) * 15 * D2R, d = dec * D2R, p = LAT * D2R;
  const sa = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H), alt = Math.asin(Math.max(-1, Math.min(1, sa)));
  const ca = (Math.sin(d) - Math.sin(alt) * Math.sin(p)) / (Math.cos(alt) * Math.cos(p) || 1e-9);
  let az = Math.acos(Math.max(-1, Math.min(1, ca))) / D2R; if (Math.sin(H) > 0) az = 360 - az;
  return [alt / D2R, az];
}
/** 目前活躍的流星雨（peak 為 MM-DD，前後 days 天內） */
export function activeShower(list, date) {
  const y = date.getFullYear();
  return list.find(m => { const [mm, dd] = m.peak.split('-').map(Number); for (const yy of [y - 1, y, y + 1]) { const pk = new Date(yy, mm - 1, dd, 12); if (Math.abs(date - pk) <= (m.days || 1) * 864e5 + 432e5) return true; } return false; }) || null;
}

/* ---------- 月相與潮汐（簡化的半日潮模型） ---------- */
export const SYNODIC = 29.530588853, M2 = 12.4206;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
/** 月齡（天，0＝新月、約 14.8＝滿月） */
export const moonAge = date => ((((date.getTime() - NEW_MOON) / 864e5) % SYNODIC) + SYNODIC) % SYNODIC;
export function moonPhase(age) {
  const k = Math.round(age / SYNODIC * 8) % 8;
  return ['新月', '眉月', '上弦月', '盈凸月', '滿月', '虧凸月', '下弦月', '殘月'][k];
}
/** 月亮過中天的當地時刻（小時）：新月約正午，之後每天晚約 50 分鐘 */
export const moonTransit = age => (12 + age * 24 / SYNODIC) % 24;
/** 潮差係數：新月、滿月附近是大潮（約 1），上下弦附近是小潮（約 0.4） */
export const tideRange = age => 0.7 + 0.3 * Math.cos(2 * Math.PI * age / (SYNODIC / 2));
/** 潮位（約 −1～1）：月亮過中天與下中天附近滿潮，相隔約 12 時 25 分 */
export function tideAt(date) {
  const age = moonAge(date), h = date.getHours() + date.getMinutes() / 60, tr = moonTransit(age);
  // h − tr 是月亮的時角（以太陽時計）；中天時刻已隨月齡每天延後約 50 分鐘，所以用 12 小時的時角週期，實際兩次滿潮相隔約 12.42 小時
  return tideRange(age) * Math.cos(2 * Math.PI * (h - tr) / 12);
}
/** 一天的滿潮、乾潮時刻：[{ t: 小時, high: bool, h: 潮位 }] */
export function tideTable(date) {
  const d0 = new Date(date); d0.setHours(0, 0, 0, 0); const at = m => tideAt(new Date(d0.getTime() + m * 6e4)), out = [];
  for (let m = 1; m < 1440; m += 1) { const a = at(m - 1), b = at(m), c = at(m + 1); if ((b > a && b >= c) || (b < a && b <= c)) { if (!out.length || m - out[out.length - 1].m > 60) out.push({ m, t: m / 60, high: b > a, h: b }); } }
  return out;
}
