/* 潮汐小島 · 角色：大頭身的人類與十多種動物島民（程式組模）、配件、手持工具、走路動畫。 */
import * as THREE from 'three';
import { bend, M as M0, mesh, U } from './engine.js';
import { animateModel } from './actors.js';
const M = (c, o) => M0(c, o, 'char');   // 角色專用材質：不積雪、不變紅葉

const S = (r, w, h) => new THREE.SphereGeometry(r, w || 12, h || 8);
const WHITE = () => bend(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
/** 眼睛：深色眼珠＋帶顏色的虹膜下緣＋兩個高光；每隻眼睛是一個 group，眨眼時壓扁 */
function eyes(head, o) {
  const big = o.kind === 'owl', y = o.kind === 'frog' ? 0.3 : 0.03, z = o.kind === 'frog' ? 0.14 : 0.338, gap = big ? 0.13 : o.kind === 'frog' ? 0.17 : 0.125;
  const r = big ? 0.08 : 0.062, iris = o.iris || (o.kind === 'human' ? '#5a3a2a' : '#3a2a40');
  head.userData.eyes = []; head.userData.brows = [];
  [-1, 1].forEach(s => {
    const g = new THREE.Group(); g.position.set(s * gap, y, z); g.rotation.y = s * 0.28;
    const e = mesh(S(r, 16, 12), M('#231a28', { roughness: 0.25 }), 0, 0, 0, { noCast: true }); e.scale.set(0.9, 1.3, 0.5);
    const ir = mesh(S(r * 0.62, 12, 8), M(iris, { roughness: 0.3 }), 0, -r * 0.42, r * 0.22, { noCast: true }); ir.scale.set(0.95, 0.75, 0.4);
    const h1 = mesh(S(r * 0.34, 8, 6), WHITE(), s * -r * 0.18 + r * 0.25, r * 0.5, r * 0.36, { noCast: true });
    const h2 = mesh(S(r * 0.15, 6, 4), WHITE(), -r * 0.2, -r * 0.35, r * 0.38, { noCast: true });
    g.add(e, ir, h1, h2); head.add(g); head.userData.eyes.push(g);
    if (o.kind !== 'owl' && o.kind !== 'frog') {   // 眉毛：表情時會動
      const b = mesh(new THREE.CapsuleGeometry(0.012, 0.06, 3, 6), M(o.brow || (o.kind === 'human' ? (o.hair || '#5a3a2a') : '#3a2a30')), s * gap, y + 0.13, z + 0.01, { noCast: true });
      b.rotation.z = Math.PI / 2; b.userData.s = s; head.add(b); head.userData.brows.push(b);
    }
  });
}
/** 嘴：微笑（弧線）、張嘴（深紅＋舌頭）、驚訝（小圓）三種形狀，依表情與說話切換 */
function mouth(head, o) {
  if (o.kind === 'owl' || o.kind === 'penguin') return;
  const snouty = !['human', 'frog'].includes(o.kind), g = new THREE.Group();
  g.position.set(0, snouty ? -0.2 : -0.17, snouty ? 0.355 : 0.335); head.add(g);
  const dark = M('#5a2430', { roughness: 0.6 });
  const smile = mesh(new THREE.TorusGeometry(0.038, 0.009, 6, 14, Math.PI), M('#3a2026'), 0, 0.012, 0, { noCast: true }); smile.rotation.z = Math.PI;
  const open = new THREE.Group(); const om = mesh(S(0.048, 12, 8), dark, 0, 0, 0, { noCast: true }); om.scale.set(1, 0.75, 0.35);
  const tg = mesh(S(0.026, 8, 6), M('#ff8a9a'), 0, -0.016, 0.008, { noCast: true }); tg.scale.set(1.2, 0.6, 0.4); open.add(om, tg);
  const oh = mesh(S(0.028, 10, 8), dark, 0, -0.005, 0, { noCast: true }); oh.scale.set(0.85, 1, 0.35);
  g.add(smile, open, oh); head.userData.mouth = { g, smile, open, oh };
}
/* ---------- 手繪臉部貼圖（I.FACES，Codex 繪製）：貼在頭部前方的球面貼片上，依表情切換格子 ---------- */
const FACES = () => (window.TA && window.TA.ISLE && window.TA.ISLE.FACES) || null;
const texCache = {}, texPend = {};   // texPend：圖片還沒解碼完時先拿到的 clone（不放 userData：clone 時會被 JSON 複製）
function faceTex(key) {
  const F = FACES(); if (!F || !F[key]) return null;
  if (!texCache[key]) {   // v8.6 圖片解碼完才標記更新：以前還沒載入就 needsUpdate，主控台一直警告「no image data」
    const pend = texPend[key] = [], t = new THREE.TextureLoader().load(F[key], () => { pend.splice(0).forEach(c => { c.needsUpdate = true; }); });
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[key] = t;
  }
  const base = texCache[key]; let t;
  if (base.image && base.image.width) t = base.clone();   // clone（copy）裡會 needsUpdate：圖已解碼才用
  else { t = new THREE.Texture(); t.source = base.source; t.colorSpace = base.colorSpace; t.anisotropy = base.anisotropy; texPend[key].push(t); }   // 還沒解碼：共用同一份 source，載好再標記更新
  t.repeat.set(1, 1 / 6); t.offset.set(0, 5 / 6); return t;
}
const usesDecalEyes = k => !['owl', 'penguin', 'frog'].includes(k);
/** 球面貼片：中心在頭部前方（theta = 從頭頂量的角度），寬 pw、高 th（弧度），和頭部同樣的縮放 */
function patch(head, map, theta, pw, th, scale, radius, pos) {
  const geo = new THREE.SphereGeometry(radius || 0.3735, 24, 12, Math.PI / 2 - pw / 2, pw, theta - th / 2, th);
  const mat = bend(new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false }));
  const m = new THREE.Mesh(geo, mat); m.scale.copy(scale); if (pos) m.position.copy(pos); m.renderOrder = 1; head.add(m); return m;
}
function faceDecal(head, o, scale) {
  const D = {};
  const eyeT = faceTex(o.kind === 'human' ? 'eyesLash' : 'eyes');
  if (eyeT) D.eyes = patch(head, eyeT, Math.acos(0.03 / 0.37) + 0.03, 1.74, 0.86, scale);
  if (o.kind === 'human') { const mt = faceTex('mouth'); if (mt) D.mouth = patch(head, mt, Math.acos(-0.165 / 0.37), 0.9, 0.46, scale); }
  head.userData.decal = D;
  return !!D.eyes;
}
const EYE = { open: 0, half: 1, closed: 2, happy: 3, surprised: 4, sad: 5 }, MOUTH = { smile: 0, open: 1, oh: 2, sad: 3, talk: 4, cat: 5 };
const setFrame = (m, i) => { if (m) m.material.map.offset.y = (5 - i) / 6; };
const ear = (head, geo, mat, x, y, z, rz, ry) => { const e = mesh(geo, mat, x, y, z); e.rotation.set(0, ry || 0, rz || 0); head.add(e); return e; };

/** o: {kind, fur, inner, shirt, pants, shoe, hair, acc} */
export function chibi(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = o.fur || '#ffd9b8', K = o.kind, furM = M(skin), innerM = M(o.inner || '#ffffff');
  const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.18, 4, 12), M(o.shirt || '#7cc7ff'), 0, 0.5, 0); torso.scale.set(1.1, 1, 0.9); body.add(torso);
  const parts = { shirt: [torso], pants: [], shoe: [], hair: [] };
  const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.09, 0.32, 0); const pm = mesh(new THREE.CapsuleGeometry(0.065, 0.14, 4, 8), M(o.pants || skin), 0, -0.13, 0), sm = mesh(S(0.08, 8, 6), M(o.shoe || (K === 'human' ? '#6b4f3a' : skin)), 0, -0.24, 0.03); p.add(pm, sm); parts.pants.push(pm); parts.shoe.push(sm); body.add(p); return p; });
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.25, 0.62, 0); const am = mesh(new THREE.CapsuleGeometry(0.055, 0.16, 4, 8), M(o.shirt || '#7cc7ff'), 0, -0.1, 0); parts.shirt.push(am); p.add(am); p.add(mesh(S(0.06, 8, 6), furM, 0, -0.22, 0)); p.rotation.z = s * 0.25; body.add(p); return p; });
  // 冬裝：針織圍巾（顏色依角色換），積雪的戶外才圍上
  const wear = new THREE.Group(); wear.visible = false; body.add(wear);
  { const SC = ['#e8504a', '#3f8fd8', '#f2b632', '#5fbf6a', '#b07ad8', '#ff8aa8', '#f4f0e6'], hsh = [...(o.shirt || '') + (o.fur || '') + K].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const sm = M(o.scarf || SC[hsh % SC.length], { roughness: 1 }), knit = mesh(new THREE.TorusGeometry(0.2, 0.068, 10, 24), sm, 0, 0.77, 0); knit.rotation.x = Math.PI / 2; knit.scale.set(1.1, 0.95, 1); wear.add(knit);
    const tail = mesh(new THREE.BoxGeometry(0.1, 0.26, 0.05), sm, 0.11, 0.62, 0.2); tail.rotation.set(0.25, 0, 0.22); wear.add(tail);
    const stripe = M('#fffaf0', { roughness: 1 }); wear.add(mesh(new THREE.BoxGeometry(0.104, 0.03, 0.055), stripe, 0.115, 0.56, 0.214)); wear.children[2].rotation.copy(tail.rotation); }
  const head = new THREE.Group(); head.position.y = 1.08; body.add(head);
  const hm = mesh(S(0.37, 24, 18), furM); hm.scale.set(K === 'frog' ? 1.25 : 1.08, K === 'frog' ? 0.82 : 0.95, 1); head.add(hm);
  const decal = usesDecalEyes(K) && faceDecal(head, o, hm.scale);
  if (!decal) eyes(head, o);
  [-1, 1].forEach(s => { const c = mesh(S(0.06, 8, 6), M('#ff9fb0', { transparent: true, opacity: 0.75 }), s * (K === 'frog' ? 0.28 : 0.22), -0.08, 0.3, { noCast: true }); c.scale.set(1, 0.6, 0.3); head.add(c); });
  const snout = (w, col, nose) => { const sn = mesh(S(0.12), M(col || o.inner || '#ffffff'), 0, -0.1, 0.3, { noCast: true }); sn.scale.set(w || 1.3, 0.8, 0.7); head.add(sn); head.userData.snout = sn; head.add(mesh(S(0.035, 8, 6), M(nose || '#ff7a8a'), 0, -0.05, 0.38, { noCast: true })); };
  const tail = (geo, mat, y, z, rx) => { const t = mesh(geo, mat, 0, y, z); t.rotation.x = rx || 0; body.add(t); return t; };

  if (K === 'human') {
    const hair = mesh(new THREE.SphereGeometry(0.4, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), M(o.hair || '#5a3a2a'), 0, 0.05, -0.03); hair.scale.set(1.08, 1, 1.05); hair.rotation.x = -0.42; head.add(hair);   // 往後傾：前緣停在額頭，不蓋住眼睛
    const bang = mesh(S(0.2), M(o.hair || '#5a3a2a'), 0.12, 0.24, 0.24); bang.scale.set(1.4, 0.55, 0.6); head.add(bang); parts.hair.push(hair, bang);
    head.add(mesh(S(0.025, 6, 4), M('#d0705a'), 0, -0.12, 0.35, { noCast: true }));
  } else if (K === 'cat') {
    snout();
    [-1, 1].forEach(s => { const e = ear(head, new THREE.ConeGeometry(0.12, 0.24, 4), furM, s * 0.2, 0.33, 0, -s * 0.35, Math.PI / 4); const ei = ear(head, new THREE.ConeGeometry(0.06, 0.14, 4), innerM, s * 0.2, 0.31, 0.04, -s * 0.35, Math.PI / 4); void e; void ei; });
    tail(new THREE.CapsuleGeometry(0.04, 0.35, 4, 6), furM, 0.45, -0.24, -0.9);
  } else if (K === 'bunny') {
    snout();
    [-1, 1].forEach(s => { ear(head, new THREE.CapsuleGeometry(0.07, 0.36, 4, 8), furM, s * 0.12, 0.52, -0.02, -s * 0.15); ear(head, new THREE.CapsuleGeometry(0.035, 0.28, 4, 6), innerM, s * 0.12, 0.52, 0.04, -s * 0.15); });
    body.add(mesh(S(0.09), M('#ffffff'), 0, 0.38, -0.2));
  } else if (K === 'owl') {
    [-1, 1].forEach(s => { const r = mesh(S(0.13, 16, 10), M('#ffffff'), s * 0.13, 0.02, 0.29, { noCast: true }); r.scale.set(1, 1, 0.35); head.add(r); ear(head, new THREE.ConeGeometry(0.06, 0.18, 6), furM, s * 0.24, 0.32, 0, -s * 0.5); });
    const beak = mesh(new THREE.ConeGeometry(0.05, 0.13, 8), M('#ffb347'), 0, -0.1, 0.37, { noCast: true }); beak.rotation.x = Math.PI / 2 + 0.4; head.add(beak);
    const belly = mesh(S(0.17), innerM, 0, 0.5, 0.12, { noCast: true }); belly.scale.set(1, 1.1, 0.6); body.add(belly);
  } else if (K === 'penguin') {
    const face = mesh(S(0.3, 16, 12), innerM, 0, -0.04, 0.12, { noCast: true }); face.scale.set(1.05, 0.85, 0.85); head.add(face);
    const beak = mesh(new THREE.ConeGeometry(0.05, 0.12, 8), M('#ffb347'), 0, -0.08, 0.38, { noCast: true }); beak.rotation.x = Math.PI / 2; head.add(beak);
    const belly = mesh(S(0.17), innerM, 0, 0.5, 0.12, { noCast: true }); belly.scale.set(1, 1.15, 0.6); body.add(belly);
  } else if (K === 'deer') {
    snout(1.1);
    [-1, 1].forEach(s => { const e = ear(head, S(0.1), furM, s * 0.33, 0.18, -0.02, -s * 0.9); e.scale.set(1.6, 0.6, 0.5); const ant = new THREE.Group(); ant.position.set(s * 0.14, 0.32, -0.05); ant.rotation.z = -s * 0.3; ant.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.3, 6), M('#c8a070'), 0, 0.15, 0)); const br = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 6), M('#c8a070'), s * 0.05, 0.2, 0); br.rotation.z = -s * 0.8; ant.add(br); head.add(ant); });
    [[0.12, 0.2], [-0.15, 0.25], [0.2, -0.05]].forEach(([x, y]) => head.add(mesh(S(0.025, 6, 4), M('#fff6e6'), x, y, 0.33, { noCast: true })));
  } else if (K === 'dog') {
    snout(1.25, o.inner, '#2b2230');
    [-1, 1].forEach(s => { const e = ear(head, S(0.12), M(o.inner2 || '#a86a3a'), s * 0.34, 0.06, 0, s * 0.3); e.scale.set(0.55, 1.4, 0.8); });
    tail(new THREE.CapsuleGeometry(0.045, 0.18, 4, 6), furM, 0.5, -0.24, -0.5);
  } else if (K === 'fox') {
    const sn = mesh(new THREE.ConeGeometry(0.13, 0.26, 10), innerM, 0, -0.1, 0.38, { noCast: true }); sn.rotation.x = Math.PI / 2; head.add(sn);
    head.add(mesh(S(0.035, 8, 6), M('#2b2230'), 0, -0.1, 0.52, { noCast: true }));
    [-1, 1].forEach(s => { ear(head, new THREE.ConeGeometry(0.13, 0.3, 4), furM, s * 0.2, 0.36, 0, -s * 0.3, Math.PI / 4); ear(head, new THREE.ConeGeometry(0.05, 0.1, 4), M('#3a2a2a'), s * 0.245, 0.49, 0, -s * 0.3, Math.PI / 4); });
    const t = tail(S(0.14), furM, 0.38, -0.3, 0); t.scale.set(0.8, 0.8, 1.8); const tip = mesh(S(0.09), M('#ffffff'), 0, 0.42, -0.52); body.add(tip);
  } else if (K === 'frog') {
    [-1, 1].forEach(s => head.add(mesh(S(0.12), furM, s * 0.17, 0.26, 0.06)));
    const m = mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 16, Math.PI), M('#5a2a2a'), 0, -0.08, 0.31, { noCast: true }); m.rotation.z = Math.PI; head.add(m);
    const belly = mesh(S(0.16), innerM, 0, 0.5, 0.12, { noCast: true }); belly.scale.set(1, 1.1, 0.6); body.add(belly);
  } else if (K === 'squirrel') {
    snout(1.1);
    [-1, 1].forEach(s => ear(head, new THREE.ConeGeometry(0.07, 0.16, 8), furM, s * 0.2, 0.36, 0, -s * 0.25));
    [[0.4, -0.3, 0.16], [0.7, -0.42, 0.18], [0.98, -0.38, 0.17], [1.15, -0.22, 0.13]].forEach(([y, z, r]) => body.add(mesh(S(r), furM, 0, y, z)));
  } else if (K === 'bear') {
    snout(1.2, o.inner, '#3a2a2a');
    [-1, 1].forEach(s => { ear(head, S(0.1), furM, s * 0.26, 0.3, -0.02); ear(head, S(0.055), innerM, s * 0.26, 0.3, 0.05); });
  } else if (K === 'sheep') {
    const face = mesh(S(0.3, 16, 12), innerM, 0, -0.04, 0.1, { noCast: true }); face.scale.set(1, 0.95, 0.8); head.add(face);
    [[0, 0.3, -0.02, 0.17], [-0.2, 0.24, 0, 0.14], [0.2, 0.24, 0, 0.14], [-0.1, 0.33, 0.12, 0.12], [0.1, 0.33, 0.12, 0.12], [0, 0.2, -0.25, 0.18]].forEach(([x, y, z, r]) => head.add(mesh(S(r), furM, x, y, z)));
    [-1, 1].forEach(s => { const h = mesh(new THREE.TorusGeometry(0.09, 0.035, 8, 14, Math.PI * 1.5), M('#c8a070'), s * 0.3, 0.12, 0); h.rotation.y = s * Math.PI / 2; head.add(h); const e = ear(head, S(0.07), innerM, s * 0.36, -0.02, 0.04, s * 0.3); e.scale.set(1.5, 0.6, 0.6); });
    head.add(mesh(S(0.03, 8, 6), M('#8a6a6a'), 0, -0.1, 0.36, { noCast: true }));
  } else if (K === 'hamster') {
    snout(0.9);
    [-1, 1].forEach(s => { ear(head, S(0.08), furM, s * 0.22, 0.3, -0.02); ear(head, S(0.045), innerM, s * 0.22, 0.3, 0.03); const c = mesh(S(0.13), innerM, s * 0.25, -0.12, 0.18, { noCast: true }); c.scale.set(1, 0.85, 0.8); head.add(c); });
  } else if (K === 'panda') {
    snout(1.15, '#ffffff', '#2b2230');
    [-1, 1].forEach(s => { ear(head, S(0.1), M('#2b2230'), s * 0.26, 0.3, -0.02); const pt = mesh(S(0.09), M('#2b2230'), s * 0.13, 0.01, 0.29, { noCast: true }); pt.scale.set(1, 1.3, 0.5); pt.rotation.z = s * 0.4; head.add(pt); });
  } else if (K === 'koala') {
    [-1, 1].forEach(s => { const e = ear(head, S(0.16), furM, s * 0.36, 0.18, -0.02); e.scale.set(0.8, 1, 0.6); const ei = ear(head, S(0.1), innerM, s * 0.37, 0.18, 0.05); ei.scale.set(0.8, 1, 0.5); });
    const nose = mesh(S(0.08), M('#3a3040'), 0, -0.06, 0.34, { noCast: true }); nose.scale.set(0.9, 1.3, 0.7); head.add(nose);
  } else if (K === 'otter') {
    snout(1.4, o.inner, '#3a2a2a');
    [-1, 1].forEach(s => ear(head, S(0.06), furM, s * 0.3, 0.2, 0));
    tail(new THREE.CapsuleGeometry(0.07, 0.3, 4, 6), furM, 0.25, -0.3, -1.2);
  }
  // 嘴巴：人類用頭部貼片；有吻部的動物把貓嘴貼圖貼在吻部前下方；狐狸、無尾熊、綿羊貼在鼻子下方；其他用立體嘴
  if (decal && K !== 'human') {
    const mt = faceTex('mouth'), sn = head.userData.snout;
    if (mt && sn) head.userData.decal.mouth = patch(head, mt, 1.86, 1.12, 0.84, sn.scale, 0.1215, sn.position);
    else if (mt && ['fox', 'koala', 'sheep'].includes(K)) { const y = K === 'fox' ? -0.255 : K === 'koala' ? -0.2 : -0.2; head.userData.decal.mouth = patch(head, mt, Math.acos(y / 0.355), 0.62, 0.34, hm.scale); }
    else mouth(head, o);
    head.userData.decal.animal = true;
  } else if (!(decal && K === 'human')) mouth(head, o);
  // 配件
  const acc = o.acc;
  if (acc === 'glasses') [-1, 1].forEach(s => head.add(mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16), M('#3a3040'), s * 0.13, 0.02, 0.36, { noCast: true })));
  if (acc === 'goggles') { [-1, 1].forEach(s => head.add(mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 16), M('#6ad0e0', { roughness: 0.3 }), s * 0.12, 0.22, 0.3, { noCast: true }))); const band = mesh(new THREE.TorusGeometry(0.38, 0.025, 6, 24), M('#3a3040'), 0, 0.2, 0); band.rotation.x = Math.PI / 2; head.add(band); }
  if (acc === 'scarf') { const sc = mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), M('#ff7a5a'), 0, 0.78, 0); sc.rotation.x = Math.PI / 2; body.add(sc); body.add(mesh(new THREE.BoxGeometry(0.1, 0.25, 0.05), M('#ff7a5a'), 0.1, 0.62, 0.2)); }
  if (acc === 'hat') { head.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), M('#e8c070'), 0, 0.3, 0)); head.add(mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.2, 16), M('#e8c070'), 0, 0.4, 0)); }
  if (acc === 'bow') { [-1, 1].forEach(s => { const b = mesh(S(0.08), M('#ff6a8a'), s * 0.09, 0.36, 0.1); b.scale.set(1.3, 0.8, 0.5); head.add(b); }); head.add(mesh(S(0.04), M('#ff6a8a'), 0, 0.36, 0.12)); }
  if (acc === 'leaf') { const l = mesh(S(0.1), M('#5cb85c'), 0.05, 0.4, 0); l.scale.set(1.6, 0.3, 0.8); l.rotation.z = 0.4; head.add(l); }
  if (acc === 'brush') { const b = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), M('#7a5238'), 0, -0.32, 0.05); b.rotation.x = 0.4; arms[1].add(b); }
  const partyHat = mesh(new THREE.ConeGeometry(0.15, 0.36, 12), M('#ff7a9a'), 0.1, 0.46, 0); partyHat.rotation.z = -0.3; partyHat.visible = false;
  partyHat.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), M('#ffe14a'), 0, 0.2, 0)); head.add(partyHat);
  const hand = new THREE.Group(); hand.position.set(0, -0.24, 0.05); arms[1].add(hand);
  const umbrella = new THREE.Group(); umbrella.visible = false; umbrella.position.set(0.18, 1.55, 0);
  umbrella.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), M('#6b4f3a'), 0, -0.4, 0));
  const canopy = mesh(new THREE.SphereGeometry(0.62, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), M(o.umbrella || o.shirt || '#ff8a7a', { side: THREE.DoubleSide }), 0, 0, 0); umbrella.add(canopy);
  root.add(umbrella);
  const hatSlot = new THREE.Group(); head.add(hatSlot);
  root.userData = { wear, parts, hatSlot, partyHat, umbrella, body, head, legs, arms, hand, walk: 0, speed: 0, blink: 2 + Math.random() * 3, swing: 0, expr: 'neutral', exprT: 0, talk: false, look: null, phase: Math.random() * 6 };
  root.traverse(m => { if (m.isMesh && m.material !== undefined && !m.material.transparent) m.castShadow = true; });
  return root;
}

/* ---------- 手持工具 ---------- */
const TPROTO = {};   // 程式化工具模型（data/toolmodels.js）：每種只建一次，之後 clone
export function setTool(ch, tool) {
  const hand = ch.userData.hand; while (hand.children.length) hand.remove(hand.children[0]);
  ch.userData.tool = tool;
  if (!tool) return;
  const g = new THREE.Group(); hand.add(g); g.rotation.x = -1.2;
  const tf = ((window.TA.ISLE || {}).TOOLMODELS || {})[tool];
  if (tf && TPROTO[tool] !== null) {
    try {
      if (!TPROTO[tool]) { const p = tf(THREE, { mat: (c, o) => M(c, o) }); if (!(p && p.isObject3D)) throw new Error('沒有回傳 Object3D'); p.traverse(o => { o.userData = {}; if (o.isMesh) o.castShadow = true; }); TPROTO[tool] = p; }
      g.add(TPROTO[tool].clone(true)); return;
    } catch (e) { TPROTO[tool] = null; console.warn('程式化工具模型建立失敗，改用原本的模型：' + tool, e); }
  }
  const stick = (len, col) => mesh(new THREE.CylinderGeometry(0.018, 0.022, len, 6), M(col || '#b98a55'), 0, len / 2 - 0.05, 0);
  if (tool === 'rod') { g.add(stick(1.1, '#c99a62')); g.add(mesh(S(0.04, 8, 6), M('#ef6f5e'), 0, -0.02, 0)); }
  if (tool === 'net') { g.add(stick(0.8)); const ring = mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 16), M('#d8d0c0'), 0, 0.9, 0); ring.rotation.x = Math.PI / 2; g.add(ring); const bag = mesh(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), M('#ffffff', { transparent: true, opacity: 0.6, side: THREE.DoubleSide }), 0, 0.9, -0.15); bag.rotation.x = -Math.PI / 2; g.add(bag); }
  if (tool === 'can') { const b = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 12), M('#7cc7c0', { metalness: 0.3, roughness: 0.5 }), 0, 0.12, 0.08); b.rotation.x = 1.2; g.add(b); const sp = mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.24, 6), M('#7cc7c0'), 0, 0.3, 0.02); sp.rotation.x = 0.5; g.add(sp); const hd = mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12, Math.PI), M('#5aa8a0'), 0, 0.12, -0.04); hd.rotation.y = Math.PI / 2; g.add(hd); }
  if (tool === 'shovel') { g.add(stick(0.7)); const b = mesh(S(0.12, 10, 8), M('#b8c0c8', { metalness: 0.4, roughness: 0.4 }), 0, 0.72, 0); b.scale.set(1, 1.3, 0.25); g.add(b); }
}

/* ---------- 表情 ---------- */
/** 設定表情：'neutral' | 'happy' | 'surprised' | 'sad'，dur 秒後回到平常（0 表示一直維持） */
export function setExpr(ch, expr, dur) { const u = ch.userData; u.expr = expr; u.exprT = dur || 0; }
/** 說話中：嘴巴開合 */
export function setTalk(ch, on) { ch.userData.talk = !!on; }
/** 看向某個世界座標（null 表示看前方） */
export function lookAt(ch, v) { ch.userData.look = v || null; }
const tmpV = new THREE.Vector3();

/* ---------- 動畫 ---------- */
export function animate(ch, dt, moving, t, rate = 1) {   // rate：步伐快慢（慢走時 < 1）
  const u = ch.userData;
  if (u.wear) u.wear.visible = U.uSnow.value > 0.5;   // 冬天戶外圍圍巾
  if (u.gltf) { animateModel(ch, dt, moving, rate); return; }   // 套了 3D 模型的角色：改播骨架動作
  u.speed += ((moving ? 1 : 0) - u.speed) * Math.min(1, dt * 10);
  u.run = (u.run || 0) + ((moving === 2 ? 1 : 0) - (u.run || 0)) * Math.min(1, dt * 6);
  u.walk += dt * (moving === 2 ? 15 : 10) * u.speed * rate;
  const sw = Math.sin(u.walk) * (0.7 + u.run * 0.25) * u.speed;
  u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw;
  u.arms[0].rotation.x = -sw * 0.8;
  u.arms[0].rotation.z = -0.25 - u.run * 0.25; u.arms[1].rotation.z = 0.25 + u.run * 0.25 * (u.tool ? 0 : 1);
  u.swing = Math.max(0, u.swing - dt * 3);
  u.arms[1].rotation.x = u.tool ? -0.5 - Math.sin(u.swing * Math.PI) * 1.6 + sw * 0.2 : sw * 0.8;
  // 身體：走路上下起伏、骨盆左右擺、跑步時前傾；站著時輕輕呼吸
  const idle = 1 - u.speed;
  u.body.position.y = Math.abs(Math.sin(u.walk)) * (0.06 + u.run * 0.03) * u.speed + Math.sin(t * 2) * 0.008;
  u.body.rotation.z = Math.sin(u.walk) * 0.06 * u.speed;
  u.body.rotation.x = u.speed * (0.05 + u.run * 0.14);
  u.body.scale.y = 1 + Math.sin(t * 2.2 + (u.phase || 0)) * 0.012 * idle;
  // 頭：走路時反向晃一點；看向目標（限制角度，平滑轉頭）
  let yaw = 0, pitch = 0;
  if (u.look) {
    tmpV.copy(u.look); ch.worldToLocal(tmpV); tmpV.y -= 1.1;
    yaw = THREE.MathUtils.clamp(Math.atan2(tmpV.x, tmpV.z), -0.9, 0.9); pitch = THREE.MathUtils.clamp(-Math.atan2(tmpV.y, Math.hypot(tmpV.x, tmpV.z)), -0.3, 0.3);
    if (Math.abs(Math.atan2(tmpV.x, tmpV.z)) > 1.9) yaw = pitch = 0;   // 在背後就不硬轉
  } else if (idle > 0.9) yaw = Math.sin(t * 0.37 + (u.phase || 0)) * 0.25 * Math.max(0, Math.sin(t * 0.13 + (u.phase || 0) * 2));   // 發呆時偶爾東張西望
  u.head.rotation.y += (yaw - u.head.rotation.y) * Math.min(1, dt * 6);
  u.head.rotation.x += (pitch - u.head.rotation.x) * Math.min(1, dt * 6);
  u.head.rotation.z = Math.sin(u.walk * 0.5) * 0.05 * u.speed + (u.expr === 'happy' ? Math.sin(t * 6) * 0.06 : 0);
  // 表情計時
  if (u.exprT > 0) { u.exprT -= dt; if (u.exprT <= 0) { u.exprT = 0; u.expr = 'neutral'; } }
  const ex = u.expr || 'neutral';
  // 眨眼（開心時眼睛彎成弧、驚訝時睜大）
  u.blink -= dt; const close = u.blink < 0.12;
  const eyeY = close ? 0.12 : ex === 'happy' ? 0.35 : ex === 'surprised' ? 1.25 : ex === 'sad' ? 0.8 : 1;
  (u.head.userData.eyes || []).forEach(g => { g.scale.y += (eyeY - g.scale.y) * Math.min(1, dt * 25); g.scale.x = ex === 'surprised' ? 1.12 : 1; });
  if (u.blink < 0) u.blink = 2 + Math.random() * 4;
  (u.head.userData.brows || []).forEach(b => {
    const s = b.userData.s, ty = ex === 'surprised' ? 0.05 : ex === 'sad' ? 0.015 : ex === 'happy' ? 0.025 : 0;
    const rz = Math.PI / 2 + (ex === 'sad' ? -s * 0.35 : ex === 'surprised' ? s * 0.12 : 0);
    b.userData.y0 = b.userData.y0 ?? b.position.y; b.position.y += (b.userData.y0 + ty - b.position.y) * Math.min(1, dt * 12); b.rotation.z += (rz - b.rotation.z) * Math.min(1, dt * 12);
  });
  // 手繪臉部貼圖：眼睛依眨眼與表情換格子；人類的嘴巴依說話與表情換格子
  const dc = u.head.userData.decal;
  if (dc && dc.eyes) setFrame(dc.eyes, close ? EYE.closed : ex === 'happy' ? EYE.happy : ex === 'surprised' ? EYE.surprised : ex === 'sad' ? EYE.sad : u.blink < 0.22 ? EYE.half : EYE.open);
  const rest = dc && dc.animal ? MOUTH.cat : MOUTH.smile;
  if (dc && dc.mouth) setFrame(dc.mouth, u.talk ? (Math.sin(t * 17) > -0.2 ? MOUTH.talk : rest) : ex === 'happy' ? MOUTH.open : ex === 'surprised' ? MOUTH.oh : ex === 'sad' ? MOUTH.sad : rest);
  // 嘴：說話時開合；開心張嘴、驚訝 O 型、平常微笑
  const m = u.head.userData.mouth;
  if (m) {
    let shape = ex === 'surprised' ? 'oh' : ex === 'happy' ? 'open' : 'smile', open = 1;
    if (u.talk) { const k = Math.sin(t * 17) * 0.5 + 0.5; shape = k > 0.35 ? 'open' : 'smile'; open = 0.55 + k * 0.6; }
    m.smile.visible = shape === 'smile'; m.open.visible = shape === 'open'; m.oh.visible = shape === 'oh';
    m.open.scale.y = shape === 'open' ? open : 1; m.smile.scale.x = ex === 'sad' ? 0.7 : 1; m.smile.rotation.z = ex === 'sad' ? 0 : Math.PI;
  }
  // 坐姿：大腿往前平伸、雙手放在膝上、身體微微後靠
  if (u.sit) { u.legs[0].rotation.x = u.legs[1].rotation.x = -1.45; u.arms[0].rotation.set(-0.7, 0, -0.12); u.arms[1].rotation.set(-0.7, 0, 0.12); u.body.rotation.set(-0.05, 0, 0); u.body.position.y = Math.sin(t * 2) * 0.006; }
  // 鼓掌：雙手往前伸、一開一合地拍，身體跟著一跳一跳
  if (u.clapT > 0) {
    u.clapT -= dt; const k = Math.sin(t * 24) > 0 ? 0.04 : 0.38;
    u.arms[0].rotation.set(-1.2, 0, k); u.arms[1].rotation.set(-1.2, 0, -k);
    if (!u.sit) u.body.position.y += Math.abs(Math.sin(t * 12)) * 0.035;
  }
}
/** 拍手 d 秒（島民替你喝采） */
export function clap(ch, d) { ch.userData.clapT = d || 2; setExpr(ch, 'happy', d || 2); }
/** 坐下／站起來（姿勢由 animate 處理，位置與高度由呼叫端決定） */
export function setSit(ch, on) { ch.userData.sit = !!on; }
