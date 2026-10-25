/* 潮汐小島 · 打擊感：鏡頭震動與觸控震動（v7.0）。
   kick(a)：會很快衰減的小幅抖動（咬鉤、高處落地、敲石頭、首領受擊），a 約 0.02–0.08；
   haptic(p)：手機的震動（只有 Android 有效，iOS Safari 不支援）。兩者都可以在設定關掉；系統開了「減少動態效果」就不震鏡頭。 */
const reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
export const opts = { shake: true, haptic: true };
let k = 0, t = 0;
export function kick(a) { if (!opts.shake || reduce.matches) return; k = Math.min(0.12, Math.max(k, a)); }
/** 常用的震動節奏：短促一下、兩下、長一點 */
export const PULSE = { tap: 15, hit: 40, bite: [30, 40, 60], ok: [12, 30, 12], bad: 70, rare: [20, 40, 20, 40, 80] };
export function haptic(p) { if (!opts.haptic) return; try { if (navigator.vibrate) navigator.vibrate(PULSE[p] || p); } catch (e) { /* 不支援就算了 */ } }
/** 每格在 camera.lookAt 之後呼叫：在鏡頭自己的座標軸上抖一下（不改鏡頭位置，碰撞與第一人稱都不受影響） */
export function apply(camera, dt) {
  if (k < 0.0005) { k = 0; return; }
  t += dt; const a = k;
  camera.rotateX((Math.sin(t * 47) + Math.sin(t * 23.3) * 0.6) * a * 0.25);
  camera.rotateY((Math.sin(t * 39.1 + 1.3) + Math.sin(t * 29.7) * 0.5) * a * 0.25);
  camera.rotateZ(Math.sin(t * 31 + 2.1) * a * 0.12);
  k *= Math.exp(-dt * 9);
}
