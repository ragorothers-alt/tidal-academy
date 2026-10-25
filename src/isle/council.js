/* 潮汐小島 · 島民議會（公民）：同一批選票，用不同的選舉制度計票，結果可能不一樣。
   一輪 4 題：相對多數決、兩輪決選（絕對多數）、排序複選（逐輪淘汰），以及不分區立委的席次分配
   （政黨得票率 5% 門檻、最大餘數法）。題目與答案都由程式計算產生。 */
import * as ui from './ui.js';
import * as Audio from './audio.js';
import { S, save, practiced, dayKey } from './state.js';
import * as miles from './miles.js';

import { IDEAS, PARTIES, total, ballots, partyVote } from './vote.js';
const KEYS = Object.keys(IDEAS);

const pct = (a, b) => (a / b * 100).toFixed(1) + '%';
function ballotTable(groups) {
  return `<table class="cc-tb"><tr><th>人數</th><th>偏好順序（左邊最喜歡）</th></tr>${groups.map(g => `<tr><td>${g.n}</td><td>${g.order.map(k => `<b>${k}</b>`).join(' ＞ ')}</td></tr>`).join('')}</table>
    <p class="muted cc-ideas">${KEYS.map(k => `${k}：${IDEAS[k]}`).join('　')}</p>`;
}
const tline = t => Object.keys(t).map(k => `${k} ${t[k]}`).join('、');

export function open(paint) {
  const body = ui.el('div', 'council'); let k = 0, right = 0, B = ballots(), P = partyVote();
  const Q = [
    { name: '相對多數決', ask: '只看第一偏好，票數最多的提案勝出。哪個提案勝出？', ans: () => B.p.win, why: () => `第一偏好票數：${tline(B.p.t)}。` },
    { name: '兩輪決選（絕對多數）', ask: '第一輪若有提案過半就直接勝出；否則前兩名進入第二輪，每個人投給自己比較喜歡的那一個。哪個提案勝出？', ans: () => B.r.win, why: () => (B.r.t2 ? `第一輪：${tline(B.r.t)}，沒有人過半（總數 ${total(B.groups)}）。第二輪：${tline(B.r.t2)}。` : `第一輪：${tline(B.r.t)}，已經過半。`) },
    { name: '排序複選（逐輪淘汰）', ask: '每一輪淘汰第一偏好最少的提案，它的票轉給選民的下一個偏好，直到有提案過半。哪個提案勝出？', ans: () => B.v.win, why: () => B.v.rounds.map((t, i) => `第 ${i + 1} 輪：${tline(t)}`).join('；') + '。' }
  ];
  const opts4 = KEYS.map(x => [x, `${x} ${IDEAS[x]}`]);
  const draw = () => {
    if (k < 3) {
      const q = Q[k];
      body.innerHTML = `<p class="muted">第 ${k + 1} / 4 題 · 島民議會用同一批選票，試試不同的計票方式</p>${ballotTable(B.groups)}<p class="cc-q"><b>${q.name}</b>：${q.ask}</p><div class="rd-opts cc-opts"></div><div class="cc-fb"></div>`;
      choices(opts4, q.ans(), q.why());
    } else {
      const target = P.h.ok[Math.floor(Math.random() * P.h.ok.length)], ans = P.h.seats[target];
      const set = new Set([ans]); [ans - 1, ans + 1, ans - 2, ans + 2, ans + 3].forEach(x => { if (x >= 0 && set.size < 4) set.add(x); });
      const os = [...set].sort((a, b) => a - b).map(x => [x, `${x} 席`]);
      body.innerHTML = `<p class="muted">第 4 / 4 題 · 不分區席次分配（共 ${P.seats} 席，政黨得票率需達 5% 才能分配席次，以最大餘數法分配）</p>
        <table class="cc-tb"><tr><th>政黨</th><th>得票</th><th>得票率</th></tr>${PARTIES.map(p => `<tr><td>${p}</td><td>${P.votes[p].toLocaleString()}</td><td>${pct(P.votes[p], P.tot)}</td></tr>`).join('')}</table>
        <p class="cc-q"><b>${target}</b>可以分到幾席？</p><div class="rd-opts cc-opts"></div><div class="cc-fb"></div>`;
      const why = `過門檻的政黨：${P.h.ok.join('、')}，合計 ${P.h.base.toLocaleString()} 票。每黨先分到「得票 × ${P.seats} ÷ ${P.h.base.toLocaleString()}」的整數部分，剩下的席次依小數（餘數）由大到小分配。` +
        `<br>${P.h.ok.map(p => `${p}：${(P.votes[p] * P.seats / P.h.base).toFixed(3)} → ${P.h.seats[p]} 席`).join('；')}。`;
      choices(os, ans, why);
    }
  };
  const choices = (opts, ans, why) => {
    const box = body.querySelector('.cc-opts'); let done = false;
    opts.forEach(([v, t]) => {
      const b = ui.el('button', 'choice', ui.esc(t)); b.type = 'button';
      b.onclick = () => {
        if (done) return; done = true; const ok = v === ans; if (ok) right++; Audio.sfx(ok ? 'catch' : 'bad');
        [...box.children].forEach((x, j) => { x.disabled = true; if (opts[j][0] === ans) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
        const fb = body.querySelector('.cc-fb'); fb.innerHTML = `<p>${ok ? '<b>正確！</b>' : '<b>不對喔。</b>'}${why}</p>`;
        const nb = ui.el('button', 'btn gold', k >= 3 ? '看結果' : '下一題'); nb.type = 'button'; nb.onclick = () => { k++; if (k >= 4) finish(); else draw(); }; fb.appendChild(nb);
      };
      box.appendChild(b);
    });
  };
  const finish = () => {
    const s = S(), d = dayKey(), first = s.councilDay !== d && right > 0, b = first ? right * 300 : 0; if (first) s.councilDay = d; s.bells += b; practiced('council', right, 4); save(); if (right) miles.add('puzzle');
    body.innerHTML = `<p class="cc-q"><b>這一輪答對 ${right} / 4 題</b></p><p class="muted">${first ? `今日練習獎勵：${b} 鈴錢。` : (s.councilDay === d ? '今天的獎勵已經領過了，可以繼續練習。' : '答對至少一題就能領今天的獎勵，再試一次吧！')}</p>
      <p>同一批選票，用不同制度可能選出不同結果：相對多數決的勝出者不一定得到過半支持，甚至可能是多數人最不想要的選項；兩輪決選與排序複選則讓勝出者得到過半支持。台灣的立委選舉是「單一選區兩票制」：區域立委採相對多數決，不分區立委依政黨票比例分配（5% 門檻）。</p>`;
    const again = ui.el('button', 'btn gold', '再開一次議會'); again.type = 'button'; again.onclick = () => { k = 0; right = 0; B = ballots(); P = partyVote(); draw(); }; body.appendChild(again);
    paint && paint();
  };
  if (!B || !P) { ui.toast('議會暫時無法召開'); return; }
  draw();
  ui.panel('島民議會（公民）', body, { cls: 'shop-p' });
}
