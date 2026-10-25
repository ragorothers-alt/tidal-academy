/* 潮汐小島 · 島嶼規劃打包：把 Codex 的總體規劃（plan_layout.json）精簡成遊戲讀的 src/isle/data/islandplan.js。
   node tools/planpack.cjs [plan.json]（預設 tools/island_plan.json）
   只留地形與擺設需要的欄位（多邊形、折線、座標）；推導出來的格子、院子的可種植範圍、說明文字都不帶進遊戲。
   座標是世界座標（公尺），還沒套地形扭曲：terrain.js 會用同一套多邊形逐格分類，畫面上再統一扭曲。 */
const fs = require('fs'), path = require('path');
const src = process.argv[2] || path.join(__dirname, 'island_plan.json');   // 預設：專案裡的規劃原稿（Codex 的總體規劃，去掉推導出來的格子）

const p = JSON.parse(fs.readFileSync(src, 'utf8'));
const r2 = v => Math.round(v * 100) / 100;
const pt = a => [r2(a[0]), r2(a[1])];
const poly = a => a.map(pt);
/** 擺設的座標：規劃裡有的寫成 { x, z, rot }、有的寫成 [x, z, rot]（路燈、旗幟、長椅、花台）——兩種都收（v6.83 以前只收物件，陣列的全變成 null、全部疊在原點附近） */
const xz = o => Array.isArray(o) ? [r2(o[0]), r2(o[1])] : [r2(o.x), r2(o.z)];
const rot = o => (Array.isArray(o) ? o[2] : o.rot) || 0;
const site = o => { const s = { x: r2(o.x), z: r2(o.z), w: o.w, d: o.d, face: o.face }; if (o.door) s.door = pt(o.door); if (o.radius) s.r = o.radius; return s; };
const out = {
  v: 1,
  levels: p.levels, water: p.waterSurfaces,
  coast: poly(p.coast), sandWidth: p.sandWidth, sandZones: (p.sandZones || []).map(o => poly(o.poly)),
  plateaus: p.plateaus.map(o => ({ name: o.name, level: o.level, poly: poly(o.poly) })),
  ponds: p.ponds.map(o => ({ name: o.name, level: o.level, poly: poly(o.poly) })),
  rivers: p.rivers.map(o => ({ name: o.name, w: o.width, path: poly(o.path) })),
  streams: p.streams.map(o => ({ name: o.name, w: o.width, path: poly(o.path) })),
  falls: p.waterfalls.map(o => ({ x: o.x, z: o.z, from: o.from, to: o.to, facing: o.facing, w: o.width, top: o.fromWaterY, bot: o.toWaterY })),
  stairs: p.stairs.map(o => ({ name: o.name, from: o.from, to: o.to, w: o.width, a: pt(o.start), b: pt(o.end) })),
  roads: p.roads.map(o => ({ name: o.name, kind: o.subtype || o.kind, w: o.width, path: poly(o.path) })),
  sites: Object.fromEntries(Object.entries(p.sites).map(([k, o]) => [k, site(o)])),
  homes: p.homes.map(o => ({ id: o.id, who: o.name, x: r2(o.x), z: r2(o.z) })),
  plots: p.plots.map(o => ({ id: o.id, x: r2(o.x), z: r2(o.z) })),
  landmarks: p.landmarks.filter(o => !/distant|celestial/.test(o.kind)).map(o => ({ kind: o.kind, x: r2(o.x), z: r2(o.z), rot: o.rot || 0, size: o.size })),
  props: {
    lamps: p.props.lamps.map(xz),
    banners: p.props.banners.map(o => [...xz(o), rot(o)]),
    benches: p.props.benches.map(o => [...xz(o), rot(o)]),
    planters: p.props.planters.map(xz),
    trees: p.props.trees.map(o => [o.kind, r2(o.x), r2(o.z)]),
    forests: p.props.forests.map(o => ({ kind: o.kind || o.species, density: o.density, poly: poly(o.poly) })),
    flowers: p.props.flowerFields.map(o => ({ name: o.name, poly: poly(o.poly) })),
    mailboxes: (p.props.mailboxes || []).map(o => ({ x: r2(o.x), z: r2(o.z), house: o.houseId }))
  }
};
const dst = path.join(__dirname, '..', 'src', 'isle', 'data', 'islandplan.js');
fs.writeFileSync(dst, '/* 潮汐小島 · 島嶼規劃（Codex 的總體規劃，tools/planpack.cjs 產生；要改佈局請改規劃後重新打包，不要手動修改） */\n' +
  '(function (root) { const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {}; I.PLAN = ' + JSON.stringify(out) + '; })(typeof window !== \'undefined\' ? window : globalThis);\n', 'utf8');
console.log('-> ' + path.relative(process.cwd(), dst) + ' (' + fs.statSync(dst).size.toLocaleString() + ' bytes)');
