/* 潮汐學院 · 共用工具：DOM、文字標記、亂數、日期、圖示。 */
(function (root) {
  'use strict';
  const TA = root.TA = root.TA || {};
  const U = TA.U = {};

  /* ---------- DOM ---------- */
  U.$ = (sel, ctx) => (ctx || document).querySelector(sel);
  U.$$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  /** h('div.card#id', {onclick, style:{}, dataset:{}, html:'..'}, ...children) */
  U.h = function (tag, attrs, ...kids) {
    const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(tag) || [];
    const node = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => { if (t === '.') node.classList.add(v); else node.id = v; });
    if (attrs !== undefined && (attrs === null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach(c => node.classList.add(c));
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) node.style.setProperty(sk, v[sk]); else node.style[sk] = v[sk]; } }
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k.startsWith('--')) node.style.setProperty(k, v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    const add = c => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return node;
  };
  U.clear = n => { while (n.firstChild) n.removeChild(n.firstChild); return n; };
  /** 清空後填入子節點（略過 null/false） */
  U.fill = (n, ...kids) => { U.clear(n); kids.flat().forEach(k => { if (k != null && k !== false) n.append(k); }); return n; };

  /* ---------- 題庫文字標記：只允許 u b i sup sub br ---------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  U.esc = esc;
  U.rich = function (s) {
    return esc(s == null ? '' : s)
      .replace(/&lt;(\/?)(u|b|i|sup|sub)&gt;/g, '<$1$2>')
      .replace(/&lt;br\s*\/?&gt;/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/([Σ∑∏])<sub>([^<]*)<\/sub><sup>([^<]*)<\/sup>/g, '<span class="bigop"><span>$3</span><span class="bo">$1</span><span>$2</span></span>')   // Σ 的上下限疊在符號上下（課本的排版）
      .replace(/([A-Za-z])̄|ȳ/g, (m, c) => '<span class="ovl">' + (c || 'y') + '</span>');   // x̄、ȳ 的上橫線用 CSS 畫（字型不會擺組合字元）
  };
  U.plain = s => String(s == null ? '' : s).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '');

  /* ---------- 亂數 ---------- */
  U.hash = function (str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  U.rng = function (seed) { let a = (typeof seed === 'string' ? U.hash(seed) : seed) >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  U.shuffle = function (arr, rnd) { const a = arr.slice(); rnd = rnd || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  U.pick = (arr, rnd) => arr[Math.floor((rnd || Math.random)() * arr.length)];
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.sum = arr => arr.reduce((a, b) => a + b, 0);

  /* ---------- 日期（以本地日為單位） ---------- */
  U.dayKey = function (d) { d = d || new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  U.dayNum = function (d) { d = d || new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000); };
  U.keyToNum = function (key) { const [y, m, d] = key.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
  U.numToKey = function (n) { const d = new Date(n * 86400000); const p = x => String(x).padStart(2, '0'); return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()); };
  U.daysUntil = function (key) { return U.keyToNum(key) - U.dayNum(); };
  U.fmtTime = function (sec) { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + String(s).padStart(2, '0'); };
  U.fmtNum = n => Number(n).toLocaleString('zh-TW');
  U.pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  U.weekday = n => '日一二三四五六'[new Date(n * 86400000).getUTCDay()];

  /* ---------- 動畫小工具 ---------- */
  U.tween = function (dur, fn, ease) {
    ease = ease || (t => 1 - Math.pow(1 - t, 3));
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => { const t = Math.min(1, (now - t0) / dur); fn(ease(t)); if (t < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  };
  U.countUp = function (node, from, to, dur, fmt) {
    fmt = fmt || (v => U.fmtNum(Math.round(v)));
    return U.tween(dur || 900, t => { node.textContent = fmt(from + (to - from) * t); });
  };
  U.wait = ms => new Promise(r => setTimeout(r, ms));
  U.reduced = () => TA.S && TA.S.settings && TA.S.settings.motion === 'reduced';

  /* ---------- 圖示（線性 24px） ---------- */
  const P = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/>',
    sword: '<path d="M14.5 3.5h6v6L10 20l-2.5.5L7 18 14.5 3.5Z" transform="rotate(0)"/><path d="m5 14 5 5M3.5 20.5l3-3"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z"/>',
    exam: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5V2h6v1.5M8.5 9h7M8.5 13h7M8.5 17h4"/>',
    cards: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>',
    loop: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    flame: '<path d="M12 21c-4 0-7-2.7-7-6.6 0-3.3 2.3-5.4 3.8-7.4.6 1.6 1.6 2.6 2.7 3C11.3 6.8 12.6 4 15 2.5c-.2 2.6.8 4.4 2.2 6C18.5 10 19 12 19 14.4 19 18.3 16 21 12 21Z"/><path d="M12 21c-1.8 0-3-1.2-3-2.9 0-1.9 1.6-3 3-4.6 1.4 1.6 3 2.7 3 4.6 0 1.7-1.2 2.9-3 2.9Z"/>',
    gem: '<path d="M6.5 3.5h11L21 9l-9 11.5L3 9l3.5-5.5Z"/><path d="M3 9h18M9.5 3.5 8 9l4 11.5L16 9l-1.5-5.5"/>',
    heart: '<path d="M12 20.5s-8-4.8-8-10.8A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8 3.1c0 6-8 10.8-8 10.8Z"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    back: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    bulb: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16.5h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/>',
    bookmark: '<path d="M6.5 3.5h11v17L12 16.5l-5.5 4v-17Z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    trophy: '<path d="M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0V4Z"/><path d="M7.5 6.5H4.5c0 3 1.4 4.5 3.3 4.8M16.5 6.5h3c0 3-1.4 4.5-3.3 4.8M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z"/>',
    play: '<path d="M7 4.5v15l12.5-7.5L7 4.5Z"/>',
    pause: '<path d="M7.5 5v14M16.5 5v14"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    wave: '<path d="M2.5 9c2.4-2.4 4.8-2.4 7.2 0s4.8 2.4 7.2 0 3.6-1.8 4.6-1.2"/><path d="M2.5 15c2.4-2.4 4.8-2.4 7.2 0s4.8 2.4 7.2 0 3.6-1.8 4.6-1.2"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z"/>',
    sparkle: '<path d="M12 3c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8Z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 2.5v5M16 2.5v5"/>',
    lighthouse: '<path d="M10 7h4l1.5 13.5h-7L10 7Z"/><path d="M9 7h6M10.5 4h3v3h-3zM12 2v2M8.5 12.5h7M8 17h8M4.5 20.5h15"/><path d="M15.5 5 20 3.5M8.5 5 4 3.5"/>',
    skip: '<path d="M5 5v14l9.5-7L5 5Z"/><path d="M18.5 5v14"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 3.5v12M7 10.5l5 5 5-5M4.5 20.5h15"/>',
    upload: '<path d="M12 15.5v-12M7 8.5l5-5 5 5M4.5 20.5h15"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5"/><path d="M20 3.5v5h-5"/>',
    brain: '<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3.5 3.5 0 0 0 8.5 19H12V4.5a2.5 2.5 0 0 0-3 0Z"/><path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2 3.5 3.5 0 0 1-4.5 6.3H12"/>',
    swords: '<path d="M14.5 17.5 3.5 6.5V3.5h3l11 11"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 14.5 3.5h6v6l-3 5"/><path d="M5 14l-3 3M3 21l2-2"/>'
  };
  U.icon = function (name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.sparkle) + '</svg>';
  };
  U.ico = function (name, cls) { const s = document.createElement('span'); s.className = 'ico-wrap'; s.innerHTML = U.icon(name, cls); return s; };
})(typeof window !== 'undefined' ? window : globalThis);
