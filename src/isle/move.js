/* 潮汐小島 · 房屋搬遷：在告示牌申請把導師的房子搬到空地（隔天生效），原址變成新的空地。 */
import { invalidate as mmRedraw } from './minimap.js';
import { groundAt } from './terrain.js';
import { plots, homes, makePlot, removeHouse, buildOnPlot } from './props.js';
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { I, S, save } from './state.js';
import { pick, dayKey } from './quiz.js';
import * as ledger from './ledger.js';

const COST = 2000;
const rel = () => { const s = S(); s.relocate = s.relocate || {}; return s.relocate; };
/** 啟動時套用所有已生效的搬遷（每次載入都要重做，因為場景是重新生成的） */
export function apply(villagers) {
  const today = dayKey();
  Object.entries(rel()).filter(([, m]) => m.day < today).sort((a, b) => (a[1].day + a[0]).localeCompare(b[1].day + b[0])).forEach(([sid, m]) => {
    const v = villagers.find(x => x.sid === sid), hi = homes.findIndex(h => h.owner === sid), pl = plots[m.plot];
    if (!v || hi < 0 || !pl || pl.built) return;
    const old = homes[hi]; removeHouse(old);
    const nh = buildOnPlot(pl, old.roof, sid === 'earth' ? 'earth_home' : undefined); nh.owner = sid; homes[hi] = nh; mmRedraw();
    makePlot(old.x, old.z);   // 原址變成空地
    v.home = nh.door.slice(); v.target = v.home.slice(); v.mesh.position.set(v.home[0], groundAt(v.home[0], v.home[1]), v.home[1]);
    m.applied = true;
  });
}
const dir = (x, z) => (x < -12 ? '西' : x > 12 ? '東' : '') + (z < -12 ? '北' : z > 12 ? '南' : '') || '中央';   // v6.79 的島大了一倍
const claimed = i => Object.values(rel()).some(m => m.plot === i) || Object.values((S().guests || {}).moved || {}).some(m => m.plot === i);
export async function menu(sp, villagers, paint) {
  const s = S(), tutors = villagers.filter(v => !v.shop && !v.guest && homes.some(h => h.owner === v.sid) && !(rel()[v.sid] && rel()[v.sid].day === dayKey()));
  const free = plots.map((p, i) => [p, i]).filter(([p, i]) => !p.built && !claimed(i));
  if (!free.length) { await ui.say(sp, '目前沒有空地可以搬喔。'); return; }
  await ui.say(sp, `房屋搬遷：把一位導師的房子搬到空地，費用 ${COST} 鈴錢，明天生效。原本的位置會空出來。`);
  const vi = await ui.ask(sp, '要幫誰搬家？', tutors.slice(0, 9).map(v => v.name).concat(['算了']));
  if (vi < 0 || vi >= Math.min(9, tutors.length)) return;
  const v = tutors[vi];
  const pi = await ui.ask(sp, `${v.name}要搬到哪塊空地？`, free.map(([p], k) => `空地 ${k + 1}（${dir(p.x, p.z) === '中央' ? '島中央' : '島的' + dir(p.x, p.z) + '邊'}）`).concat(['算了']));
  if (pi < 0 || pi >= free.length) return;
  if (s.bells < COST) { await ui.say(sp, '鈴錢不夠呢。'); return; }
  ledger.mark('shop'); s.bells -= COST; rel()[v.sid] = { plot: free[pi][1], day: dayKey() }; save(); Audio.sfx('coin'); paint && paint();
  const L = (I.LINES2 || {})[v.sid] || {};
  await ui.say({ name: v.name, color: v.color, voice: v.voice }, pick(L.moveAsk || ['新家耶！我好期待。']));
  await ui.say(sp, `申請完成！明天${v.name}就會住進新家。`);
}
/** 搬家後第一次見面的心得 */
export function movedLine(v) {
  const m = rel()[v.sid]; if (!m || !m.applied || m.greeted) return null;
  m.greeted = true; save(); return pick(((I.LINES2 || {})[v.sid] || {}).moveDone || ['新家住起來很舒服！']);
}
