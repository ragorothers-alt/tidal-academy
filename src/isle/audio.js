/* 潮汐小島 · 聲音：動物語、音效、海浪（即時合成）與配樂。
   配樂：錄好的曲子（models/bgm_*.js，本機 YuE2 純音樂生成，已烘成無縫循環）依白天／夜晚／雨天／節日（白天、晚上各一首）切換；
   曲子還沒載入好時先安靜，載入失敗才改用即時合成的整點風配樂。 */
let ctx = null, master = null, musicOn = true;
export const ready = () => !!ctx;
export function start(getMood) {
  if (ctx) return; ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.5;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;   // 音效疊在一起（連答、升級、煙火）時不爆音
  master.connect(comp); comp.connect(ctx.destination);
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const wg = ctx.createGain(); wg.gain.value = 0.05;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.035; lfo.connect(lg); lg.connect(wg.gain); lfo.start();
  src.connect(lp); lp.connect(wg); wg.connect(master); src.start();
  // 配樂匯流：雨天時降低高頻
  musicBus = ctx.createGain(); musicBus.gain.value = 1; musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 9000;
  musicBus.connect(musicLP); musicLP.connect(master);
  let step = 0, next = ctx.currentTime + 0.2, mood = null, moodT = 0, motif = null, motifKey = '';
  setInterval(() => {
    if (!mood || ctx.currentTime > moodT) { mood = moodOf(getMood ? getMood() : {}); moodT = ctx.currentTime + 1; musicLP.frequency.setTargetAtTime(mood.rain ? 1400 : 9000, ctx.currentTime, 1.5); }
    if (mood.key !== motifKey) { motifKey = mood.key; motif = makeMotif(mood); }
    const synth = bgmUpdate(mood);   // 錄好的配樂在播（或正在載入）時，合成配樂不出聲
    const spb = 60 / mood.bpm / 2;
    while (next < ctx.currentTime + 0.4) {
      if (musicOn && synth) {
        const ch = mood.chords[Math.floor(step / 8) % mood.chords.length], bar = Math.floor(step / 16) % 4;
        if (step % 8 === 0) { ch.forEach(n => note(n - 12, next, spb * 7, 0.03, 'sine', musicBus)); note(ch[0] - 24, next, spb * 3, 0.055, 'triangle', musicBus); }
        if (step % 8 === 4 && mood.walk) note(ch[2] - 24, next, spb * 2, 0.04, 'triangle', musicBus);
        const deg = motif[(step % 16)];
        if (deg >= 0 && !(bar === 3 && step % 16 > 11)) { const m = mood.root + mood.oct + mood.scale[deg % mood.scale.length] + 12 * Math.floor(deg / mood.scale.length); note(m, next, spb * (mood.legato || 2.2), mood.lead, mood.wave, musicBus); if (mood.bell) note(m + 12, next, spb * 3, mood.lead * 0.3, 'sine', musicBus); }
        if (mood.perc && step % 4 === 2) hat(next, mood.perc);
      }
      next += spb; step++;
    }
  }, 100);
}
/** 依季節、晝夜、天氣、活動決定曲風；每個整點的旋律不同 */
const SEASON = {
  spring: { bpm: 96, root: 60, scale: [0, 2, 4, 7, 9], chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], wave: 'triangle', lead: 0.032, oct: 12, walk: true },
  summer: { bpm: 112, root: 62, scale: [0, 2, 4, 7, 9], chords: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], wave: 'square', lead: 0.018, oct: 12, walk: true, perc: 0.025 },
  autumn: { bpm: 86, root: 57, scale: [0, 2, 3, 7, 9], chords: [[57, 60, 64], [62, 65, 69], [55, 59, 62], [57, 60, 64]], wave: 'triangle', lead: 0.03, oct: 12, legato: 3 },
  winter: { bpm: 74, root: 58, scale: [0, 3, 5, 7, 10], chords: [[58, 62, 65], [55, 58, 62], [51, 55, 58], [53, 57, 60]], wave: 'sine', lead: 0.04, oct: 12, bell: true, legato: 3.2 }
};
export function moodOf(o) {
  const m = (o.month || new Date().getMonth() + 1), season = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  const b = Object.assign({}, SEASON[season]);
  if (o.night) { b.bpm *= 0.84; b.oct = 0; b.lead *= 0.8; b.perc = 0; }
  if (o.rain) { b.bpm *= 0.9; b.perc = 0; b.rain = true; }
  if (o.festival) { b.bpm += 12; b.perc = 0.03; b.walk = true; }
  b.holiday = !!o.holiday && !o.rain;   // 錄好的祭典曲只在真正的節日（不含每週的小活動）
  b.key = [season, o.hour, !!o.night, !!o.rain, !!o.festival].join('|');
  b.hour = o.hour || 0; b.season = season; b.night = !!o.night;
  return b;
}
function makeMotif(b) {
  let seed = [...b.key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17) || 1;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const density = b.night ? 0.45 : b.rain ? 0.5 : 0.7, out = []; let d = 2 + Math.floor(r() * 3);
  for (let i = 0; i < 16; i++) { if (i % 2 === 0 && r() < density || i === 0) { d = Math.max(0, Math.min(8, d + Math.floor(r() * 5) - 2)); out.push(d); } else out.push(-1); }
  return out;
}
function hat(t, vol) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); s.stop(t + 0.06); }
let musicBus = null, musicLP = null;
/* 錄好的配樂：BGM[name] = { buf, a, b }（循環範圍，秒）、null（載入中）或 'none'（沒有檔案、解碼失敗） */
const BGM = {}, BGM_VOL = 0.5;
let bgmCur = null;   // { name, src, g }
const bgmName = m => m.rain ? 'rain' : m.holiday ? (m.night ? 'festival_night' : 'festival') : m.night ? 'night' : 'day';   // 節日的晚上：篠笛與太鼓的夏祭り
function loadBgm(name) {
  if (name in BGM) return; BGM[name] = null;
  const fail = () => { BGM[name] = 'none'; };
  const done = () => {
    const e = window.TA && window.TA.BGM && window.TA.BGM[name]; if (!e) { fail(); return; }
    const bin = atob(e.src.slice(e.src.indexOf(',') + 1)), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    delete window.TA.BGM[name];   // 解碼後就不需要 base64 字串
    ctx.decodeAudioData(u8.buffer).then(buf => {
      // MP3 編碼器會在開頭補一小段靜音：從第一個有聲音的取樣開始算，循環長度用打包時記下的秒數（接縫不會多出空白）
      const c0 = buf.getChannelData(0), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : c0; let s = 0;
      while (s < c0.length && Math.abs(c0[s]) < 1e-4 && Math.abs(c1[s]) < 1e-4) s++;
      const a = s / buf.sampleRate; BGM[name] = { buf, a, b: Math.min(buf.duration, a + e.dur) };
    }, fail);
  };
  if (window.TA && window.TA.BGM && window.TA.BGM[name]) { done(); return; }
  const sc = document.createElement('script'); sc.src = (window.__MODEL_BASE || 'src/isle/models/') + 'bgm_' + name + '.js'; sc.onload = done; sc.onerror = fail; document.head.appendChild(sc);
}
/** 每 0.1 秒：依目前的氣氛換曲（新曲載入好才淡入、舊曲同時淡出）；傳回是否要改用合成配樂 */
function bgmUpdate(mood) {
  const want = bgmName(mood); if (musicOn) loadBgm(want);
  const it = BGM[want], now = ctx.currentTime;
  const target = !musicOn ? null : it && it !== 'none' ? want : it === null && bgmCur ? bgmCur.name : null;   // 新曲還在載入：舊曲繼續播
  if ((bgmCur ? bgmCur.name : null) !== target) {
    if (bgmCur) { const o = bgmCur; o.g.gain.cancelScheduledValues(now); o.g.gain.setTargetAtTime(0, now, 0.9); o.src.stop(now + 6); }
    bgmCur = null;
    if (target) {
      const { buf, a, b } = BGM[target], src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; src.loop = true; src.loopStart = a; src.loopEnd = b;
      g.gain.setValueAtTime(0, now); g.gain.setTargetAtTime(BGM_VOL, now + 0.3, 1.0);
      src.connect(g); g.connect(musicBus); src.start(now + 0.05, a); bgmCur = { name: target, src, g };
    }
  }
  return !bgmCur && it === 'none';
}
let noiseBuf = null;
export const setMusic = on => { musicOn = on; };
function note(m, t, dur, vol, type, dest) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
}
/** 滑音：頻率從 f0 滑到 f1（跳躍、彈起來） */
function sweep(f0, f1, t, dur, vol, type) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, f0, f1, vol, q) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
}
/** 動物語：每個字一個短促的方波 */
export function blip(pitch) {
  if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'square'; o.frequency.value = pitch * (0.85 + Math.random() * 0.4); f.type = 'lowpass'; f.frequency.value = 1800;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.08);
}
/** 音效。opt.pitch：升幾個半音（連答越答越高）；opt.vol：音量倍數（腳步聲依速度） */
export function sfx(name, opt) {
  if (!ctx) return; const t = ctx.currentTime, P = (opt && opt.pitch) || 0, V = (opt && opt.vol) || 1;
  switch (name) {
    case 'ok': [72, 76, 79, 84].forEach((n, i) => note(n + P, t + i * 0.09, 0.5, 0.12, 'triangle')); if (P >= 5 && P % 5 === 0) note(96, t + 0.36, 0.6, 0.05, 'sine'); break;   // 每連對五題多一聲鈴
    case 'bad': [64, 60].forEach((n, i) => note(n, t + i * 0.12, 0.5, 0.1, 'triangle')); break;
    case 'catch': [67, 72, 76, 79, 84, 88].forEach((n, i) => note(n, t + i * 0.07, 0.7, 0.1, 'triangle')); note(48, t, 1.2, 0.08, 'sine'); break;
    case 'cast': noise(t, 0.35, 600, 2600, 0.06, 0.7); break;
    case 'plop': noise(t, 0.25, 1400, 300, 0.12, 1.2); note(70, t, 0.1, 0.04, 'sine'); break;
    case 'nibble': noise(t, 0.12, 1800, 900, 0.07, 2); break;
    case 'bite': noise(t, 0.4, 2400, 300, 0.2, 0.8); note(76, t, 0.12, 0.06, 'square'); break;
    case 'swish': noise(t, 0.25, 800, 3500, 0.08, 0.8); break;
    case 'dig': noise(t, 0.18, 300, 120, 0.25, 0.8); noise(t + 0.12, 0.15, 500, 200, 0.15, 0.8); break;
    case 'pop': note(84 + Math.random() * 4, t, 0.1, 0.06, 'sine'); break;
    case 'open': note(79, t, 0.12, 0.05, 'triangle'); note(84, t + 0.06, 0.15, 0.05, 'triangle'); break;
    case 'coin': note(88, t, 0.08, 0.07, 'square'); note(93, t + 0.07, 0.2, 0.07, 'square'); break;
    case 'tick': note(96, t, 0.03, 0.04, 'square'); break;
    case 'clap': for (let i = 0; i < 7; i++) noise(t + i * 0.14 + Math.random() * 0.03, 0.05, 2400, 1600, 0.07, 1.4); break;
    case 'step': noise(t, 0.06, 500, 250, 0.03, 1); break;
    // v7.0 新增：以前 'place' 不存在（手作、造島擺放、做菜都沒聲音）；升級、稀有、跳躍、拒絕各有自己的聲音，不再全部借用 'catch'
    case 'place': noise(t, 0.06, 900, 500, 0.22, 3); note(55, t, 0.08, 0.08, 'sine'); noise(t + 0.09, 0.05, 1100, 650, 0.14, 3); break;   // 木頭敲擊
    case 'jump': sweep(330 * Math.pow(2, P / 12), 660 * Math.pow(2, P / 12), t, 0.16, 0.06, 'triangle'); noise(t, 0.12, 700, 2200, 0.03, 0.8); break;   // 依段數升調
    case 'land': noise(t, 0.09, 400, 160, 0.1 * V, 0.9); break;
    case 'levelup': [60, 64, 67, 72].forEach((n, i) => note(n, t + i * 0.07, 0.3, 0.09, 'triangle')); [72, 76, 79, 84].forEach(n => note(n, t + 0.3, 1.3, 0.06, 'triangle')); note(48, t + 0.3, 1.4, 0.09, 'sine');
      [96, 100, 103, 108].forEach((n, i) => note(n, t + 0.45 + i * 0.08, 0.25, 0.025, 'sine')); break;   // 小號角：琶音 → 長和弦 → 星星閃
    case 'rare': [84, 88, 91, 96, 100, 103].forEach((n, i) => note(n, t + i * 0.05, 0.45, 0.05, 'sine')); note(60, t, 1.6, 0.07, 'triangle'); note(67, t, 1.6, 0.05, 'triangle'); noise(t, 1.0, 6000, 9000, 0.02, 4); break;   // 閃閃發亮
    case 'deny': note(57, t, 0.11, 0.06, 'triangle'); note(53, t + 0.1, 0.16, 0.06, 'triangle'); break;   // 不行喔（不是答錯）
    case 'splash': noise(t, 0.45, 2200, 400, 0.2, 0.7); noise(t + 0.05, 0.32, 900, 200, 0.14, 1); note(64, t, 0.08, 0.03, 'sine'); break;
    case 'whistle': sweep(1800, 2100, t, 0.5, 0.05, 'sine'); break;
    // 腳步聲：依地面換音色（沙、木板、石板、草、雪）
    case 'st_sand': noise(t, 0.08, 700, 300, 0.035 * V, 0.8); break;
    case 'st_wood': noise(t, 0.05, 1300, 800, 0.05 * V, 3); note(50, t, 0.05, 0.03 * V, 'sine'); break;
    case 'st_stone': noise(t, 0.04, 2600, 1500, 0.035 * V, 2); noise(t + 0.01, 0.05, 600, 300, 0.025 * V, 1); break;
    case 'st_grass': noise(t, 0.09, 3200, 1800, 0.022 * V, 0.6); break;
    case 'st_snow': noise(t, 0.11, 1600, 700, 0.04 * V, 0.9); noise(t + 0.03, 0.06, 3000, 2000, 0.015 * V, 1); break;
  }
}

let rainG = null;
/** 雨聲（0–1） */
export function setRain(k) {
  if (!ctx) return;
  if (!rainG) { const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.35; rainG = ctx.createGain(); rainG.gain.value = 0; src.connect(f); f.connect(rainG); rainG.connect(master); src.start(); }
  rainG.gain.setTargetAtTime(Math.min(1, k) * 0.2, ctx.currentTime, 0.6);
}
