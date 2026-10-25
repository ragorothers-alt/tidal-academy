/* 潮汐學院 · 首領海獸：程序化繪製的發光生物（觸手、眼睛、尖刺、核心），隨戰況做出反應。 */
(function (root) {
  'use strict';
  const TA = root.TA = root.TA || {};

  TA.BOSSES = {
    chinese:   { feat: 'horns', name: '墨潮蛟', en: 'INK-TIDE SERPENT', tent: 5, eyes: 1, spikes: 9, wob: 0.16, len: 1.25, lore: '以錯別字與誤讀的典故為食，墨色潮水裡藏著千年的文氣。' },
    english:   { feat: 'halo', name: '迷霧海妖', en: 'SIREN OF THE MIST', tent: 7, eyes: 2, spikes: 0, wob: 0.22, len: 1.1, lore: '用似是而非的時態與片語迷惑航海者，聽懂她的歌才能穿過霧。' },
    math:      { feat: 'spiral', name: '無盡渦旋', en: 'THE ENDLESS VORTEX', tent: 8, eyes: 1, spikes: 12, wob: 0.1, len: 0.95, lore: '每一圈漩渦都是一條方程式。算錯一步，就被捲進深淵。' },
    history:   { feat: 'masts', name: '時之沉船', en: 'WRECK OF AGES', tent: 4, eyes: 3, spikes: 6, wob: 0.12, len: 1.3, lore: '沉沒在時間之海的古船，船骨上刻滿被遺忘的年代。' },
    geography: { feat: 'claws', name: '裂谷巨蟹', en: 'THE RIFT CRAB', tent: 6, eyes: 2, spikes: 14, wob: 0.08, len: 0.8, lore: '沿著板塊交界爬行，甲殼上是整片大陸的地形。' },
    civics:    { feat: 'dome', name: '天秤水母', en: 'LIBRA JELLY', tent: 9, eyes: 1, spikes: 0, wob: 0.26, len: 1.5, lore: '在權利與義務之間漂浮，只有公平的判斷能讓它平靜。' },
    physics:   { feat: 'bolts', name: '雷霆鰻王', en: 'THUNDER EEL KING', tent: 3, eyes: 2, spikes: 10, wob: 0.14, len: 1.6, lore: '全身流竄著電磁感應，牛頓定律是唯一能預測它的方法。' },
    chemistry: { feat: 'bubbles', name: '劇毒珊瑚', en: 'TOXIC CORAL', tent: 11, eyes: 4, spikes: 7, wob: 0.18, len: 0.9, lore: '用失衡的化學反應式不斷增生，配平它，它就會崩解。' },
    biology:   { feat: 'up', name: '萬象海葵', en: 'MYRIAD ANEMONE', tent: 13, eyes: 1, spikes: 0, wob: 0.2, len: 1.0, lore: '把演化的分支都長成了觸手，每一根都藏著一段基因密碼。' },
    earth:     { feat: 'whale', name: '深淵巨鯨', en: 'ABYSSAL LEVIATHAN', tent: 2, eyes: 2, spikes: 5, wob: 0.09, len: 1.8, lore: '從地函深處浮起，背上馱著颱風與星空。' }
  };

  class Creature {
    constructor(canvas, sid, opts) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.sid = sid;
      this.cfg = TA.BOSSES[sid]; this.color = TA.subject(sid).color;
      this.small = opts && opts.small; this.t = Math.random() * 10;
      this.hitT = 0; this.atkT = 0; this.rage = 0; this.dead = 0; this.hp = 1; this.lookX = 0; this.lookY = 0;
      this.rnd = TA.U.rng(sid);
      this.seeds = Array.from({ length: 40 }, () => this.rnd());
      this.resize(); this.running = false;
      this._ro = () => this.resize(); window.addEventListener('resize', this._ro);
    }
    resize() {
      const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width || 300; this.h = r.height || 200; this.cv.width = this.w * dpr; this.cv.height = this.h * dpr; this.dpr = dpr;
    }
    start() { if (this.running) return; this.running = true; let last = performance.now(); const f = now => { if (!this.running) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; this.update(dt); this.draw(); this.raf = requestAnimationFrame(f); }; this.raf = requestAnimationFrame(f); }
    stop() { this.running = false; cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._ro); }
    hit() { this.hitT = 1; }
    attack() { this.atkT = 1; }
    die() { this.dead = 0.001; }
    update(dt) {
      this.t += dt * (1 + this.rage * 0.8);
      this.hitT = Math.max(0, this.hitT - dt * 3); this.atkT = Math.max(0, this.atkT - dt * 2.2);
      if (this.dead) this.dead = Math.min(1, this.dead + dt * 0.7);
      this.lookX += (Math.sin(this.t * 0.7) * 0.6 - this.lookX) * dt * 2; this.lookY += (Math.cos(this.t * 0.53) * 0.4 - this.lookY) * dt * 2;
    }
    draw() {
      const { ctx, w, h, cfg, t } = this, S = this.seeds;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * (this.small ? 0.26 : 0.24);
      const lunge = Math.sin(this.atkT * Math.PI) * 0.22, recoil = Math.sin(this.hitT * Math.PI) * 0.1;
      const cx = w / 2 + Math.sin(t * 0.6) * R * 0.08 + (this.hitT ? (Math.random() - 0.5) * 10 * this.hitT : 0);
      const cy = h * (this.small ? 0.5 : 0.47) + Math.sin(t * 1.1) * R * 0.1 - recoil * R;
      const sc = (1 + lunge) * (1 - this.dead * 0.6);
      const col = this.color, rageCol = '#ff4d6d';
      const alpha = 1 - this.dead;
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.scale(sc, sc);

      // 外光暈
      const glow = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 2.6);
      glow.addColorStop(0, hexA(this.rage > 0 ? mix(col, rageCol, this.rage) : col, 0.35)); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, R * 2.6, 0, 6.283); ctx.fill();

      // 觸手
      ctx.lineCap = 'round';
      for (let i = 0; i < cfg.tent; i++) {
        const base = cfg.feat === 'up' ? Math.PI + (i / (cfg.tent - 1)) * Math.PI + (S[i] - 0.5) * 0.2 : (i / cfg.tent) * Math.PI + Math.PI * 0.08 + (S[i] - 0.5) * 0.3;
        const ang = base + (cfg.tent > 6 ? 0 : 0.0);
        const len = R * (1.4 + S[i + 5] * 0.8) * cfg.len;
        const seg = 14;
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          let px = Math.cos(ang) * R * 0.8, py = Math.sin(ang) * R * 0.8 + R * 0.2;
          ctx.moveTo(px, py);
          for (let k = 1; k <= seg; k++) {
            const u = k / seg;
            const sway = Math.sin(t * (1.4 + S[i] ) + u * 4 + i) * R * 0.35 * u * (1 + this.rage * 0.6) - lunge * R * u * 1.5;
            const a2 = ang + Math.sin(t * 0.8 + i) * 0.15;
            px = Math.cos(a2) * (R * 0.8 + len * u) + Math.cos(a2 + 1.57) * sway;
            py = Math.sin(a2) * (R * 0.8 + len * u) * 0.9 + R * 0.2 + Math.sin(a2 + 1.57) * sway;
            ctx.lineTo(px, py);
          }
          if (pass === 0) { ctx.strokeStyle = hexA(col, 0.18); ctx.lineWidth = R * 0.22; }
          else { const g = ctx.createLinearGradient(0, 0, px, py); g.addColorStop(0, hexA(col, 0.95)); g.addColorStop(1, hexA(col, 0.05)); ctx.strokeStyle = g; ctx.lineWidth = R * 0.08; }
          ctx.stroke();
        }
        // 觸手末端光點
        ctx.fillStyle = hexA('#ffffff', 0.5 + 0.5 * Math.sin(t * 3 + i));
      }

      // 背景特徵
      const F = cfg.feat;
      if (F === 'spiral') {
        ctx.save(); ctx.rotate(t * 0.6);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.strokeStyle = hexA(col, 0.5 - k * 0.12); ctx.lineWidth = 3 - k * 0.6;
          for (let a = 0; a < 12.6; a += 0.12) { const rr = R * (1.15 + a * 0.06 + k * 0.18); const x = Math.cos(a + k * 2.1) * rr, y = Math.sin(a + k * 2.1) * rr * 0.55; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
        }
        ctx.restore();
      }
      if (F === 'halo') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.strokeStyle = hexA(col, 0.25 - k * 0.06); ctx.lineWidth = 2; ctx.ellipse(0, -R * 0.1, R * (1.35 + k * 0.22 + Math.sin(t * 1.5 + k) * 0.05), R * (1.35 + k * 0.22) * 0.9, 0, 0, 6.283); ctx.stroke(); }
        for (let k = 0; k < 9; k++) {
          const a = -Math.PI * 0.9 + k * 0.22, sw = Math.sin(t * 1.3 + k) * R * 0.25;
          ctx.beginPath(); ctx.strokeStyle = hexA(mix(col, '#ffffff', 0.3), 0.3); ctx.lineWidth = R * 0.05;
          ctx.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); ctx.quadraticCurveTo(Math.cos(a) * R * 1.6 + sw, Math.sin(a) * R * 1.4, Math.cos(a) * R * 1.3 + sw * 2, R * 0.9); ctx.stroke();
        }
        ctx.restore();
      }
      if (F === 'masts') {
        ctx.save(); ctx.lineCap = 'round';
        [[-0.35, 1.7], [0.15, 2.1], [0.55, 1.5]].forEach(([x, hh], k) => {
          ctx.save(); ctx.translate(x * R, -R * 0.55); ctx.rotate(Math.sin(t * 0.8 + k) * 0.06 - 0.08 + k * 0.08);
          ctx.strokeStyle = hexA(mix(col, '#2a1a0a', 0.5), 0.95); ctx.lineWidth = R * 0.07; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -R * hh); ctx.stroke();
          ctx.lineWidth = R * 0.04; ctx.beginPath(); ctx.moveTo(-R * 0.35, -R * hh * 0.75); ctx.lineTo(R * 0.35, -R * hh * 0.75); ctx.stroke();
          ctx.fillStyle = hexA(mix(col, '#f4ead2', 0.5), 0.55); ctx.beginPath(); ctx.moveTo(-R * 0.32, -R * hh * 0.73);
          ctx.quadraticCurveTo(R * 0.1 + Math.sin(t * 2 + k) * R * 0.1, -R * hh * 0.45, -R * 0.28, -R * hh * 0.25); ctx.lineTo(R * 0.05, -R * hh * 0.3); ctx.lineTo(R * 0.3, -R * hh * 0.73); ctx.closePath(); ctx.fill();
          ctx.restore();
        });
        ctx.restore();
      }
      if (F === 'claws') {
        [-1, 1].forEach(side => {
          const open = 0.35 + Math.sin(t * 2.2 + side) * 0.25 + lunge * 1.5;
          ctx.save(); ctx.translate(side * R * 1.05, R * 0.05); ctx.rotate(side * (-0.5 + Math.sin(t * 1.1) * 0.1));
          ctx.strokeStyle = hexA(col, 0.9); ctx.lineWidth = R * 0.16; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * R * 0.45, -R * 0.35); ctx.stroke();
          ctx.translate(side * R * 0.5, -R * 0.42);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5); g.addColorStop(0, hexA(mix(col, '#ffffff', 0.35), 1)); g.addColorStop(1, hexA(col, 0.85));
          ctx.fillStyle = g;
          ctx.save(); ctx.rotate(-side * open); ctx.beginPath(); ctx.ellipse(side * R * 0.28, -R * 0.08, R * 0.38, R * 0.17, 0, 0, 6.283); ctx.fill(); ctx.restore();
          ctx.save(); ctx.rotate(side * open * 0.6); ctx.beginPath(); ctx.ellipse(side * R * 0.26, R * 0.1, R * 0.32, R * 0.13, 0, 0, 6.283); ctx.fill(); ctx.restore();
          ctx.restore();
        });
      }
      if (F === 'whale') {
        ctx.save(); ctx.translate(R * 1.5, -R * 0.05); ctx.rotate(Math.sin(t * 1.4) * 0.35);
        ctx.fillStyle = hexA(mix(col, '#061420', 0.25), 0.95);
        ctx.beginPath(); ctx.moveTo(-R * 0.3, 0); ctx.quadraticCurveTo(R * 0.25, -R * 0.1, R * 0.55, -R * 0.55); ctx.quadraticCurveTo(R * 0.35, -R * 0.05, R * 0.6, R * 0.45); ctx.quadraticCurveTo(R * 0.2, R * 0.1, -R * 0.3, R * 0.12); ctx.fill();
        ctx.restore();
      }

      // 本體（扭動的圓）
      const pts = 64; ctx.beginPath();
      const bsx = F === 'whale' ? 1.55 : 1, bsy = F === 'whale' ? 0.72 : 1;
      for (let k = 0; k <= pts; k++) {
        const a = (k / pts) * Math.PI * 2;
        let r = R * (1 + cfg.wob * Math.sin(a * 3 + t * 1.3) * 0.5 + cfg.wob * 0.5 * Math.sin(a * 5 - t * 2.1 + S[3] * 6));
        if (cfg.spikes) { const sp = Math.pow(Math.max(0, Math.cos(a * cfg.spikes + t * 0.2)), 8); r += sp * R * 0.32 * (1 + this.rage * 0.5); }
        const x = Math.cos(a) * r * bsx;
        let y = Math.sin(a) * r * 0.92 * bsy;
        if (F === 'dome' && y > 0) y *= 0.35;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      const body = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R * 1.3);
      body.addColorStop(0, hexA(mix(col, '#ffffff', 0.35), 0.95)); body.addColorStop(0.45, hexA(col, 0.75)); body.addColorStop(1, hexA(mix(col, '#020814', 0.75), 0.95));
      ctx.fillStyle = body; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = hexA(mix(col, '#ffffff', 0.5), 0.6); ctx.stroke();
      // 內部紋路
      ctx.save(); ctx.clip();
      for (let i = 0; i < 6; i++) {
        ctx.beginPath(); ctx.strokeStyle = hexA('#ffffff', 0.06 + 0.04 * Math.sin(t + i)); ctx.lineWidth = R * 0.06;
        ctx.arc(Math.sin(t * 0.3 + i) * R * 0.3, R * 0.2 + i * R * 0.05, R * (0.4 + i * 0.13), Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
      ctx.restore();

      // 前景特徵
      if (F === 'horns') {
        [-1, 1].forEach(side => {
          ctx.save(); ctx.translate(side * R * 0.45, -R * 0.78); ctx.rotate(side * 0.35);
          const g = ctx.createLinearGradient(0, 0, 0, -R * 0.8); g.addColorStop(0, hexA(col, 1)); g.addColorStop(1, hexA('#ffffff', 0.9));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-R * 0.12, 0); ctx.quadraticCurveTo(side * R * 0.25, -R * 0.45, side * R * 0.18, -R * 0.85); ctx.quadraticCurveTo(0, -R * 0.4, R * 0.12, 0); ctx.fill();
          ctx.restore();
        });
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 5; k++) { const a = t * 0.4 + k * 1.26; ctx.strokeStyle = hexA(col, 0.18); ctx.lineWidth = R * 0.12; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 1.5, Math.sin(a) * R * 0.9, R * 0.25, a, a + 2.5); ctx.stroke(); }
        ctx.restore();
      }
      if (F === 'bolts' && Math.sin(t * 7) > 0.2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(mix(col, '#ffffff', 0.6), 0.9); ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 12;
        const ft = Math.floor(t * 9);
        for (let k = 0; k < 3; k++) {
          const a0 = (ft + k * 3) * 1.7; let x = Math.cos(a0) * R * 0.95, y = Math.sin(a0) * R * 0.9; ctx.beginPath(); ctx.moveTo(x, y);
          for (let j = 0; j < 6; j++) { x += Math.cos(a0) * R * 0.18 + (((j * 7 + k * 13 + ft) % 5) - 2) * R * 0.08; y += Math.sin(a0) * R * 0.18 + (((j * 3 + k * 5 + ft) % 5) - 2) * R * 0.08; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.restore();
      }
      if (F === 'bubbles') {
        for (let k = 0; k < 10; k++) {
          const ph = (t * 0.35 + S[k + 10]) % 1, x = (S[k + 20] - 0.5) * R * 2.4 + Math.sin(t * 2 + k) * R * 0.08, y = -R * 0.6 - ph * R * 2.2, rr = R * (0.05 + S[k] * 0.07) * (1 - ph * 0.3);
          ctx.strokeStyle = hexA(mix(col, '#ffffff', 0.4), 0.7 * (1 - ph)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.stroke();
        }
      }
      if (F === 'dome') {
        ctx.strokeStyle = hexA('#ffffff', 0.25); ctx.lineWidth = 2;
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(0, R * 0.05, R * (0.3 + k * 0.22), R * (0.2 + k * 0.18), 0, Math.PI, 0); ctx.stroke(); }
      }

      // 眼睛
      const eyes = cfg.eyes;
      for (let i = 0; i < eyes; i++) {
        const ex = eyes === 1 ? 0 : (i / (eyes - 1) - 0.5) * R * (eyes > 2 ? 1.1 : 0.8);
        const ey = -R * 0.12 + (eyes > 2 ? Math.abs(i / (eyes - 1) - 0.5) * R * 0.3 : 0);
        const er = R * (eyes === 1 ? 0.36 : 0.22) * (eyes > 3 ? 0.75 : 1);
        const blink = Math.max(0.08, Math.abs(Math.sin(t * 0.35 + i * 1.7)) > 0.985 ? 0.1 : 1);
        ctx.save(); ctx.translate(ex, ey); ctx.scale(1, blink);
        ctx.fillStyle = '#071019'; ctx.beginPath(); ctx.ellipse(0, 0, er, er * 0.82, 0, 0, 6.283); ctx.fill();
        const irisC = this.rage > 0.2 ? rageCol : mix(col, '#ffffff', 0.55);
        const ig = ctx.createRadialGradient(this.lookX * er * 0.3, this.lookY * er * 0.25, 0, this.lookX * er * 0.3, this.lookY * er * 0.25, er * 0.62);
        ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.3, irisC); ig.addColorStop(1, hexA(irisC, 0));
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(this.lookX * er * 0.3, this.lookY * er * 0.25, er * 0.62, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#02060c'; ctx.beginPath(); ctx.ellipse(this.lookX * er * 0.32, this.lookY * er * 0.26, er * 0.12, er * 0.42, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }
      // 受擊白閃
      if (this.hitT > 0) {
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${this.hitT * 0.45})`;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
      // 消散粒子
      if (this.dead > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) {
          const a = S[i % 40] * 6.283 + i, d = R * (0.3 + this.dead * 3 * (0.5 + S[(i + 7) % 40]));
          ctx.fillStyle = hexA(col, (1 - this.dead) * 0.9);
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d - this.dead * 40, 3 * (1 - this.dead) + 1, 0, 6.283); ctx.fill();
        }
        ctx.restore();
      }
    }
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  function mix(a, b, k) {
    const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map(s => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  TA.Creature = Creature;
  TA.U.hexA = hexA; TA.U.mixHex = mix;
})(typeof window !== 'undefined' ? window : globalThis);
