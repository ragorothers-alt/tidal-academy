/* 潮汐小島 · 寫實模型（Tripo 精修，models/rf_<…>.js）的共用設定與小物件換裝（v9.12）
   RF：程式化模型的表 → 寫實模型 id 的前綴。設定「寫實模型」關掉或極省電畫質時一律不換。
   建築與地標在 props3d.realize 換（要重算剔除用的包圍體）；海洋生物、家具這類小物件用 swap()：
   程式化模型照常建好、立刻能用（碰撞、佔地、動畫零件都照舊），寫實模型載好再放進同一個群組、把原本的藏起來。 */
import * as THREE from 'three';
import { ULTRA } from './perf.js';
import { S } from './state.js';
import { loadModel, cachedModel, READY } from './actors.js';

export const RF = { BLDMODELS: 'rf_bld_', LMMODELS: 'rf_lm_', HARBORMODELS: 'rf_harbor_', WORKSMODELS: 'rf_works_', ACADEMYMODELS: 'rf_academy_', MARINEMODELS: 'rf_marine_', FURNMODELS: 'rf_furn_' };
export const realOn = () => { const c = S().settings || {}; return c.real !== false && !ULTRA; };
export const realId = (table, key) => (RF[table] || '') + key;
/** 這一件有寫實模型、而且現在要用 */
export const hasReal = (table, key) => !!RF[table] && realOn() && READY.has(realId(table, key));

const WRAP = new WeakMap();   // 群組 → 換上的寫實模型外層（不放 userData：clone 會把 userData 整包序列化）
export const realWrap = g => WRAP.get(g) || null;
const inv = new THREE.Matrix4(), mw = new THREE.Matrix4(), tb = new THREE.Box3();
/** g 裡看得到的網格在 g 自己座標裡的包圍盒（g 已經縮放、擺位也一樣） */
function localBox(g) {
  g.updateMatrixWorld(true); inv.copy(g.matrixWorld).invert(); const b = new THREE.Box3();
  g.traverse(o => { if (!o.isMesh || !o.visible) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.union(tb.copy(o.geometry.boundingBox).applyMatrix4(mw.multiplyMatrices(inv, o.matrixWorld))); });
  return b;
}
/** 把 g（程式化模型）換成 table/key 的寫實模型。
    fit 'box'：等比縮進原本的包圍盒、不超出（家具：佔地、碰撞照原本的）；'max'：最長邊和原本一樣（海洋生物：程式化的比例比較誇張，用體長對齊）。
    水平置中、底部對齊；原本的子物件只藏起來（游泳、開合的零件仍有參照，不會出錯）。已經載過的模型當場換上（房間重擺、擺放預覽不會閃一下）。
    done(wrap)：換上之後呼叫（擺放預覽要把材質換成半透明、商店要標記不能釋放的幾何）。回傳 true：會換 */
export function swap(g, table, key, fit = 'box', done = null) {
  if (!g || !hasReal(table, key)) return false;
  const id = realId(table, key), box = localBox(g); if (box.isEmpty()) return false;
  g.userData.real = id;
  const put = gl => {
    if (WRAP.has(g)) return;
    const model = gl.scene.clone(true), wrap = new THREE.Group(); wrap.name = 'real:' + id; wrap.add(model);
    const b = new THREE.Box3().setFromObject(model), ms = b.getSize(new THREE.Vector3()), mc = b.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const k = fit === 'max' ? Math.max(s.x, s.y, s.z) / Math.max(ms.x, ms.y, ms.z) : Math.min(s.x / ms.x, s.y / ms.y, s.z / ms.z);
    model.scale.setScalar(k); model.position.set(c.x - mc.x * k, box.min.y - b.min.y * k, c.z - mc.z * k);
    g.children.forEach(ch => { if (!ch.isLight) ch.visible = false; });
    g.add(wrap); WRAP.set(g, wrap);
    if (done) done(wrap);
  };
  const hit = cachedModel(id);
  if (hit) put(hit); else loadModel(id, 'plain').then(put).catch(e => console.warn('寫實模型載入失敗，維持原本的模型：' + id, e));
  return true;
}
/** 換上寫實模型的海洋生物：靜態模型沒有尾巴、鰭這些會動的零件，改成整隻輕輕動（游的左右擺、水母一縮一放、爬的微微起伏） */
export function realMove(g, anim, t, ph, speed = 1) {
  const w = WRAP.get(g); if (!w) return;
  const s = Math.sin;
  if (anim === 'swim') { w.rotation.y = s(t * (2 + speed * 2) + ph) * 0.08; w.rotation.z = s(t * 1.4 + ph) * 0.05; }
  else if (anim === 'pulse') { const k = Math.max(0, s(t * 2.1 + ph)); w.scale.set(1 + k * 0.06, 1 - k * 0.09, 1 + k * 0.06); }
  else if (anim === 'crawl') w.position.y = Math.abs(s(t * 6 + ph)) * 0.004;
}
