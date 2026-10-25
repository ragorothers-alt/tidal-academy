/* 潮汐小島 · 我的檔案：等級與稱號、經驗、潮晶、連續學習與潮汐護符、個人資料（名字、每日目標、學測日期）、備考航線（v7.1：要考的考科與主力考科）。
   新存檔第一次開始時先做「船員登記」（原本在學習中心的初次設定），登記完送 50 潮晶。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import * as hall from './hall.js';

const TA = window.TA, L = TA.L, U = TA.U;
export const SHIELD_COST = 80, SHIELD_MAX = 3, DEFAULT_EXAM = '2027-01-22';
const GOALS = [[20, '輕鬆', '約 25 分鐘'], [30, '穩定', '約 40 分鐘'], [50, '衝刺', '約 1 小時'], [80, '爆肝', '1.5 小時以上']];
export const name = () => (TA.S.profile.name || '').trim() || '旅人';
/** 備考航線的選擇鈕：要考的考科（至少一科；全選存成空陣列＝全部）、主力考科（最多 2 科，只能從要考的裡面選） */
function trackHtml(main) {
  const tk = L.trackGroups(), mg = L.mainGroups();
  return `${main ? '' : `<div class="pf-track">${TA.GROUPS.map(g => `<button type="button" class="pl-chip${tk.includes(g) ? ' on' : ''}" data-tg="${g}">${g}</button>`).join('')}</div>`}
    <div class="pf-track"><small>主力</small>${tk.map(g => `<button type="button" class="pl-chip${mg.includes(g) ? ' on' : ''}" data-tm="${g}">${g}</button>`).join('')}</div>`;
}
function bindTrack(box, redraw) {
  const P = TA.S.profile; P.track = P.track || { groups: [], main: [] };
  box.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => {
    const g = b.dataset.tg, cur = L.trackGroups(), on = cur.includes(g);
    if (on && cur.length <= 1) { ui.toast('至少要選一個考科'); Audio.sfx('deny'); return; }
    const next = on ? cur.filter(x => x !== g) : cur.concat(g);
    P.track.groups = next.length === TA.GROUPS.length ? [] : TA.GROUPS.filter(x => next.includes(x)); P.track.main = (P.track.main || []).filter(x => next.includes(x));
    TA.Store.save(); Audio.sfx('tick'); redraw();
  });
  box.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => {
    const g = b.dataset.tm, m = L.mainGroups(), on = m.includes(g);
    if (!on && m.length >= 2) { ui.toast('主力考科最多選 2 科'); Audio.sfx('deny'); return; }
    P.track.main = on ? m.filter(x => x !== g) : m.concat(g); TA.Store.save(); Audio.sfx('tick'); redraw();
  });
}
/** 升級時的提示文字（稱號換了才寫「新稱號」） */
export function levelText(d) {
  const prev = L.TITLES.filter(([l]) => l <= d.lv - 1).pop(), fresh = !prev || prev[1] !== d.title;
  return `升到 Lv.${d.lv}！${fresh ? `新稱號「${d.title}」` : `稱號「${d.title}」`} · +20 潮晶`;
}

/** 我的檔案。hooks：{ ach 打開成就, paint 重畫 HUD } */
export function open(hooks) {
  hooks = hooks || {};
  const S = TA.S, P = S.profile, body = ui.el('div', 'hall pf');
  const paint = () => {
    const lv = L.levelOf(S.xp), k = lv.cur / lv.need, got = L.ACH.filter(a => S.ach[a.id]).length, total = L.ACH.length;
    const next = L.TITLES.find(([l]) => l > lv.lv), streak = L.streakAlive(), days = U.daysUntil(P.examDate || DEFAULT_EXAM);
    body.innerHTML = `<div class="hall-scroll">
      <div class="pf-hero"><div class="pf-ring" style="--k:${k.toFixed(3)}"><small>LV</small><b>${lv.lv}</b></div>
        <div><div class="hr-kicker">${ui.esc(lv.title)}</div><h2>${ui.esc(name())}</h2><p class="muted">再 ${(lv.need - lv.cur).toLocaleString()} 經驗升到 Lv.${lv.lv + 1} · 總經驗 ${S.xp.toLocaleString()}${next ? ` · Lv.${next[0]} 得到稱號「${next[1]}」` : ''}</p>
          <div class="pf-chips"><span class="gold">潮晶 <b>${S.gems.toLocaleString()}</b></span><button type="button" class="ach">成就 <b>${got} / ${total}</b></button><span>連續學習 <b>${streak}</b> 天（最長 ${S.streak.best}）</span><span>潮汐護符 <b>${S.streak.shields} / ${SHIELD_MAX}</b></span></div></div></div>
      <div class="hs-label">個人資料</div>
      <div class="pf-form">
        <label><span>名字</span><input type="text" class="pf-name" maxlength="12" placeholder="旅人" value="${ui.esc(P.name || '')}"></label>
        <label><span>每日目標題數</span><input type="number" class="pf-goal" min="10" max="200" step="5" value="${P.dailyGoal || 30}"></label>
        <label><span>學測日期 <small class="muted">${days > 0 ? `還有 ${days} 天` : '已經考完了'}</small></span><input type="date" class="pf-date" value="${P.examDate || DEFAULT_EXAM}"></label>
      </div>
      <p class="muted pf-note">116 學年度學測預定 2027/1/22–24，請以大考中心公告為準。每日目標會用在 HUD 的「今日」、潮汐里程與學習週報。</p>
      <div class="hs-label">備考航線</div>
      <div class="pf-trk">${trackHtml(false)}</div>
      <p class="muted pf-note">每日潮汐、讀書計畫、考前衝刺與弱點委託只排要考的考科；主力考科的新題多一倍。沒選的科目島上照樣可以玩、可以練。改了之後從明天的每日潮汐開始照新的航線排；讀書計畫可以按「依弱點重新排」。</p>
      <div class="hs-label">潮汐護符</div>
      <div class="pf-shield"><i>🛡</i><div><b>漏掉一天也不會中斷連續學習</b><small>某天沒學到，護符會自動替你保住連續紀錄（用掉一個）。最多同時持有 ${SHIELD_MAX} 個；目前 ${S.streak.shields} 個。</small></div><button type="button" class="btn buy"${S.streak.shields >= SHIELD_MAX || S.gems < SHIELD_COST ? ' disabled' : ''}>${S.streak.shields >= SHIELD_MAX ? '已經滿了' : `${SHIELD_COST} 潮晶`}</button></div>
      <div class="hs-label">稱號之路</div>
      <div class="pf-titles">${L.TITLES.map(([l, t]) => `<span class="${lv.lv >= l ? 'on' : ''}${lv.title === t ? ' cur' : ''}"><small>Lv.${l}</small>${ui.esc(t)}</span>`).join('')}</div>
      <p class="muted pf-note">經驗來自答題、單字、專注與各種練習；每升一級送 20 潮晶。潮晶可以在商店換鈴錢、買潮汐護符。</p>
    </div>`;
    const nm = body.querySelector('.pf-name'), gl = body.querySelector('.pf-goal'), dt = body.querySelector('.pf-date');
    nm.onchange = () => { P.name = nm.value.trim().slice(0, 12); TA.Store.save(); hooks.paint && hooks.paint(); paint(); };
    gl.onchange = () => { P.dailyGoal = U.clamp(Math.round((+gl.value || 30) / 5) * 5, 10, 200); TA.Store.save(); hooks.paint && hooks.paint(); paint(); };
    dt.onchange = () => { if (dt.value) { P.examDate = dt.value; TA.Store.save(); hooks.paint && hooks.paint(); paint(); } };
    body.querySelector('.buy').onclick = async () => {
      if (S.streak.shields >= SHIELD_MAX || S.gems < SHIELD_COST) return;
      if (!(await hall.confirmIn(body, '買一個潮汐護符？', `花 ${SHIELD_COST} 潮晶。漏掉一天時，護符會自動替你保住連續紀錄。`, '購買'))) return;
      S.gems -= SHIELD_COST; S.streak.shields++; TA.Store.save(); TA.emit('wallet'); Audio.sfx('coin'); ui.toast(`🛡 買了一個潮汐護符（${S.streak.shields} / ${SHIELD_MAX}）`); paint();
    };
    body.querySelector('.ach').onclick = () => hooks.ach && hooks.ach();
    const trk = body.querySelector('.pf-trk'), redrawT = () => { trk.innerHTML = trackHtml(false); bindTrack(trk, redrawT); }; bindTrack(trk, redrawT);
  };
  paint();
  hall.open('我的檔案', body);
}

/** 船員登記：新存檔第一次開始時填名字、每日目標、學測日期。關掉也算登記（用預設值），之後可以在「我的檔案」改 */
export function setup() {
  return new Promise(res => {
    const S = TA.S, P = S.profile; let goal = GOALS.some(g => g[0] === P.dailyGoal) ? P.dailyGoal : 30, done = false;
    const body = ui.el('div', 'hall pf-setup');
    body.innerHTML = `<div class="hall-scroll">
      <h2>在出航之前</h2>
      <p class="muted">島上的導師會依照你的作答紀錄排程複習、找出弱點。進度存在這台裝置上，不需要帳號。</p>
      <label class="pf-field"><span>怎麼稱呼你？</span><input type="text" class="pf-name" maxlength="12" placeholder="例如：小潮" value="${ui.esc(P.name || '')}"></label>
      <div class="pf-field"><span>每天想完成幾題？</span><div class="hs-grid pf-goals">${GOALS.map(([n, t, d]) => `<button type="button" class="hs-pick${n === goal ? ' on' : ''}" data-n="${n}"><b>${n} 題</b><small>${t} · ${d}</small></button>`).join('')}</div></div>
      <label class="pf-field"><span>學測日期</span><input type="date" class="pf-date" value="${P.examDate || DEFAULT_EXAM}"><small class="muted">預設為 116 學年度學測首日（2027/1/22），請以大考中心公告為準。</small></label>
      <div class="pf-field"><span>要考哪些考科？最想加強哪一兩科？</span><div class="pf-trk">${trackHtml(false)}</div><small class="muted">每日潮汐和讀書計畫只排要考的考科，主力考科多排一些。不確定的話直接跳過（全部考科）。</small></div>
    </div>
    <div class="hx-foot"><span class="muted">之後都可以在手機「我的檔案」修改</span><span class="spacer"></span><button type="button" class="btn go">開始我的航程 →</button></div>`;
    const nm = body.querySelector('.pf-name'), dt = body.querySelector('.pf-date'), trk = body.querySelector('.pf-trk'), redrawT = () => { trk.innerHTML = trackHtml(false); bindTrack(trk, redrawT); }; bindTrack(trk, redrawT);
    body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { goal = +b.dataset.n; body.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b)); Audio.sfx('tick'); });
    const finish = close => {
      if (done) return; done = true;
      P.name = nm.value.trim().slice(0, 12); P.dailyGoal = goal; P.examDate = dt.value || P.examDate || DEFAULT_EXAM;
      if (!P.onboarded) { P.onboarded = true; S.gems += 50; TA.emit('wallet'); }
      TA.Store.save(); Audio.sfx('coin');
      if (close) ui.closePanel();
      setTimeout(() => ui.toast(`🎫 船員登記完成，${name()}！送你 50 潮晶`), 300);
      res();
    };
    body.querySelector('.go').onclick = () => finish(true);
    hall.open('船員登記', body, { onClose: () => finish(false) });
    hall.setKeys(e => { if (e.code === 'Enter') { finish(true); return true; } return false; });
    if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => nm.focus(), 60);
  });
}
