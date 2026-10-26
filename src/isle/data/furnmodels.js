/* 潮汐小島 · 程式化家具模型（img2threejs 重建）：TA.ISLE.FURNMODELS[id] = (THREE, kit) => THREE.Group。
   room.buildFurniture 有對應的模型就用它，沒有就用 furniture 資料裡的 parts。
   依 img2threejs v2.0.0（Apache-2.0）流程重建；規格、TypeScript 與關卡紀錄保存在 codex-img2three 工作資料夾。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.FURNMODELS = I.FURNMODELS || {};
  I.FURNMODELS["res_physics_1"] = function (THREE, kit) {
  const stage = 7;
  const components = [{"id":"root","parent":null,"primitive":"box","material":"wood","dimensions":{"width":1.86,"height":0.14,"depth":0.9},"transform":{"position":[0,0.65,0],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.055}}},{"id":"leg-west-rear","parent":"root","primitive":"box","material":"wood","dimensions":{"width":0.16,"height":0.62,"depth":0.16},"transform":{"position":[-0.78,-0.34,-0.32],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.045}}},{"id":"leg-west-front","parent":"root","primitive":"box","material":"wood","dimensions":{"width":0.16,"height":0.62,"depth":0.16},"transform":{"position":[-0.78,-0.34,0.32],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.045}}},{"id":"leg-east-rear","parent":"root","primitive":"box","material":"wood","dimensions":{"width":0.16,"height":0.62,"depth":0.16},"transform":{"position":[0.78,-0.34,-0.32],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.045}}},{"id":"leg-east-front","parent":"root","primitive":"box","material":"wood","dimensions":{"width":0.16,"height":0.62,"depth":0.16},"transform":{"position":[0.78,-0.34,0.32],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.045}}},{"id":"lower-shelf","parent":"root","primitive":"box","material":"wood","dimensions":{"width":1.62,"height":0.1,"depth":0.72},"transform":{"position":[0,-0.47,0],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.035}}},{"id":"front-apron","parent":"root","primitive":"box","material":"wood-dark","dimensions":{"width":1.55,"height":0.19,"depth":0.16},"transform":{"position":[0,-0.12,0.3],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.025}}},{"id":"drawer-west","parent":"root","primitive":"box","material":"wood","dimensions":{"width":0.72,"height":0.14,"depth":0.055},"transform":{"position":[-0.39,-0.11,0.385],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.035}}},{"id":"knob-west","parent":"root","primitive":"sphere","material":"cream","dimensions":{"width":0.065,"height":0.065,"depth":0.055},"transform":{"position":[-0.39,-0.11,0.432],"rotation":[0,0,0]},"geometryDescriptor":{}},{"id":"drawer-east","parent":"root","primitive":"box","material":"wood","dimensions":{"width":0.72,"height":0.14,"depth":0.055},"transform":{"position":[0.39,-0.11,0.385],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.035}}},{"id":"knob-east","parent":"root","primitive":"sphere","material":"cream","dimensions":{"width":0.065,"height":0.065,"depth":0.055},"transform":{"position":[0.39,-0.11,0.432],"rotation":[0,0,0]},"geometryDescriptor":{}},{"id":"coil-cradle","parent":"root","primitive":"box","material":"wood-dark","dimensions":{"width":0.79,"height":0.08,"depth":0.53},"transform":{"position":[-0.43,0.12,-0.025],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.03}}},{"id":"coil","parent":"root","primitive":"torus","material":"copper","dimensions":{"width":0.5,"height":0.5,"depth":0.52},"transform":{"position":[-0.43,0.34,-0.05],"rotation":[0,1.5707963267948966,0]},"geometryDescriptor":{"helix":{"turns":13,"length":0.54,"radius":0.204,"wireRadius":0.018,"tails":[[[-0.27,-0.204,0],[-0.29,-0.2,0.1],[-0.26,-0.175,0.23]],[[0.27,-0.204,0],[0.28,-0.2,0.1],[0.23,-0.175,0.23]]]}}},{"id":"magnet","parent":"root","primitive":"box","material":"salmon","dimensions":{"width":0.3,"height":0.105,"depth":0.105},"transform":{"position":[-0.095,0.34,-0.05],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.018}}},{"id":"magnet-blue","parent":"root","primitive":"box","material":"blue","dimensions":{"width":0.15,"height":0.105,"depth":0.105},"transform":{"position":[0.055,0.34,-0.05],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.018}}},{"id":"meter","parent":"root","primitive":"box","material":"sage","dimensions":{"width":0.5,"height":0.55,"depth":0.24},"transform":{"position":[0.5,0.34,-0.07],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.15}}},{"id":"meter-base","parent":"root","primitive":"box","material":"cream","dimensions":{"width":0.6,"height":0.09,"depth":0.38},"transform":{"position":[0.5,0.12,-0.045],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.045}}},{"id":"dial","parent":"root","primitive":"cylinder","material":"cream","dimensions":{"width":0.38,"height":0.025,"depth":0.38},"transform":{"position":[0.5,0.38,0.065],"rotation":[1.5707963267948966,0,0]},"geometryDescriptor":{}},{"id":"needle","parent":"root","primitive":"box","material":"salmon","dimensions":{"width":0.018,"height":0.215,"depth":0.014},"transform":{"position":[0.535,0.395,0.087],"rotation":[0,0,-0.36]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.005}}},{"id":"needle-pivot","parent":"root","primitive":"sphere","material":"copper","dimensions":{"width":0.055,"height":0.055,"depth":0.025},"transform":{"position":[0.5,0.295,0.09],"rotation":[0,0,0]},"geometryDescriptor":{}},{"id":"terminal-a","parent":"root","primitive":"cylinder","material":"cream","dimensions":{"width":0.07,"height":0.07,"depth":0.07},"transform":{"position":[-0.69,0.165,0.18],"rotation":[0,0,0]},"geometryDescriptor":{}},{"id":"terminal-b","parent":"root","primitive":"cylinder","material":"cream","dimensions":{"width":0.07,"height":0.07,"depth":0.07},"transform":{"position":[-0.2,0.165,0.18],"rotation":[0,0,0]},"geometryDescriptor":{}},{"id":"terminal-c","parent":"root","primitive":"cylinder","material":"cream","dimensions":{"width":0.07,"height":0.07,"depth":0.07},"transform":{"position":[0.3,0.165,0.13],"rotation":[0,0,0]},"geometryDescriptor":{}},{"id":"terminal-d","parent":"root","primitive":"cylinder","material":"cream","dimensions":{"width":0.07,"height":0.07,"depth":0.07},"transform":{"position":[0.7,0.165,0.13],"rotation":[0,0,0]},"geometryDescriptor":{}},{"id":"lead-a","parent":"root","primitive":"tube","material":"slate","dimensions":{"width":1,"height":1,"depth":1},"transform":{"position":[0,0,0],"rotation":[0,0,0]},"geometryDescriptor":{"tubePath":{"points":[[-0.69,0.17,0.2],[-0.6,0.1,0.33],[-0.1,0.1,0.33],[0.25,0.14,0.21],[0.3,0.17,0.15]]}}},{"id":"lead-b","parent":"root","primitive":"tube","material":"slate","dimensions":{"width":1,"height":1,"depth":1},"transform":{"position":[0,0,0],"rotation":[0,0,0]},"geometryDescriptor":{"tubePath":{"points":[[-0.2,0.17,0.2],[-0.06,0.1,0.27],[0.48,0.1,0.32],[0.67,0.13,0.25],[0.7,0.17,0.15]]}}},{"id":"book-blue","parent":"root","primitive":"box","material":"blue","dimensions":{"width":0.55,"height":0.075,"depth":0.36},"transform":{"position":[-0.38,-0.38,0.08],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.02}}},{"id":"book-salmon","parent":"root","primitive":"box","material":"salmon","dimensions":{"width":0.55,"height":0.075,"depth":0.36},"transform":{"position":[-0.38,-0.305,0.08],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.02}}},{"id":"book-pages","parent":"root","primitive":"box","material":"cream","dimensions":{"width":0.49,"height":0.045,"depth":0.31},"transform":{"position":[-0.35,-0.38,0.08],"rotation":[0,0,0]},"geometryDescriptor":{"edgeTreatment":{"bevelRadius":0.006}}}];
  const root = new THREE.Group(); root.name = 'Coil Induction Workbench';
  const nodes = {}, meshes = {}, sockets = {}, colliders = {}, destructionGroups = {};
  const palette = { wood:'#cda67e', 'wood-dark':'#b98e6b', cream:'#f0e5d5', sage:'#bcd0a9', salmon:'#ebc3c5', blue:'#b7c7e2', slate:'#777a98', copper:'#ceaa83' };
  const materials = {};
  const surface = (key, kind, side) => kit.mat(palette[key], Object.assign(
    kind === 'metal' ? {roughness:.38,metalness:.75} : {roughness:.78}, side == null ? {} : {side}), kind);
  for (const key of Object.keys(palette)) materials[key] = surface(key,
    key === 'wood' || key === 'wood-dark' ? 'wood' : key === 'cream' ? 'ceramic' : 'metal');
  function merge(items) {
    const pos=[], nor=[];
    for (const original of items) {
      const g=original.index?original.toNonIndexed():original;
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    }
    const result=new THREE.BufferGeometry();
    result.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    result.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3)); return result;
  }
  function mesh(g, material, name, parent, p, rot) {
    // 雕塑版有具名零件：紙頁、布面書封與儀表紙盤不能沿用同色的陶瓷／金屬。
    const kind = /page|^dial-mesh$/.test(name) ? 'paper' : /^book-(blue|salmon)-mesh$/.test(name) ? 'fabric' : null;
    const m=new THREE.Mesh(g, kind ? surface(material,kind) : materials[material]);m.name=name;m.castShadow=true;m.receiveShadow=true;
    if(p)m.position.fromArray(p);if(rot)m.rotation.fromArray(rot);(parent||root).add(m);return m;
  }
  function ring(x, y, z, radius, tube, radial=6) {
    return new THREE.TorusGeometry(radius,tube,radial,16).rotateY(Math.PI/2).translate(x,y,z);
  }
  function flange(x) {
    const a=.115,b=.245,t=.026, v=[new THREE.Vector2(a,-t),new THREE.Vector2(b-.012,-t),new THREE.Vector2(b,-t+.012),new THREE.Vector2(b,t-.012),new THREE.Vector2(b-.012,t),new THREE.Vector2(a,t),new THREE.Vector2(a,-t)];
    return new THREE.LatheGeometry(v,16).rotateZ(Math.PI/2).translate(x,0,0);
  }
  function arch(w,h,d) {
    const s=new THREE.Shape(),r=w/2,b=-h/2,cy=h/2-r;
    s.moveTo(-r,b);s.lineTo(r,b);s.lineTo(r,cy);s.absarc(0,cy,r,0,Math.PI,false);s.lineTo(-r,b);
    const g=new THREE.ExtrudeGeometry(s,{depth:d-.03,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.015,bevelThickness:.015,curveSegments:stage>=4?24:12});g.translate(0,0,-(d-.03)/2);return g;
  }
  function tube(points, radius=.014,segments=20) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,5,false); }
  for(const c of components) {
    const node=new THREE.Group();node.name=c.id;node.position.fromArray(c.transform.position);node.rotation.fromArray(c.transform.rotation);
    (c.parent?nodes[c.parent]:root).add(node);nodes[c.id]=node;node.userData.sculptComponent=c;
    const d=c.dimensions,w=d.width,h=d.height,depth=d.depth, id=c.id;
    let g;
    if(id==='coil') {
      // The generated single torus does not describe a wound solenoid; preserve the unlocked macro and replace its geometry.
      node.rotation.set(0,0,0);
      const turns=stage===0?7:13, rings=[];
      if(stage===0){for(let i=0;i<turns;i++)rings.push(ring(-.195+i*.39/(turns-1),0,0,.194,.027));g=merge(rings);}
      else {
        const h=c.geometryDescriptor.helix;
        class Winding extends THREE.Curve { getPoint(t,target=new THREE.Vector3()) {const a=Math.PI+Math.PI*2*h.turns*t;return target.set(-h.length/2+h.length*t,h.radius*Math.cos(a),h.radius*Math.sin(a));} }
        g=new THREE.TubeGeometry(new Winding(),h.turns*10,h.wireRadius,5,false);
      }
      if(stage>=1) {
        mesh(merge([flange(-.30),flange(.30)]),'cream','coil-bobbin-flanges',node);
        const sleeve=new THREE.CylinderGeometry(.116,.116,.60,16,1,true).rotateZ(Math.PI/2);
        const inner=mesh(sleeve,'cream','coil-open-inner-sleeve',node);inner.material=surface('cream','ceramic',THREE.DoubleSide);
        const tails=merge(c.geometryDescriptor.helix.tails.map(points=>tube(points,.010,12)));
        const tailMesh=mesh(tails,'copper','coil-winding-ends',node);tailMesh.userData.explodeWithParent=true;
      }
    } else if(id==='meter'&&stage>=2)g=arch(w,h,depth);
    else if(stage>=3&&(id==='book-blue'||id==='book-salmon')) {
      const p=new THREE.Shape(),t=.015;
      p.moveTo(-w/2,-h/2);p.lineTo(w/2,-h/2);p.lineTo(w/2,-h/2+t);p.lineTo(-w/2+.018,-h/2+t);p.lineTo(-w/2+.018,h/2-t);p.lineTo(w/2,h/2-t);p.lineTo(w/2,h/2);p.lineTo(-w/2,h/2);p.closePath();
      g=new THREE.ExtrudeGeometry(p,{depth,bevelEnabled:false,steps:1});g.translate(0,0,-depth/2);
      if(id==='book-salmon')mesh(kit.rbox(w-.055,h-.030,depth-.035,.005),'cream','book-salmon-page-block',node,[.015,0,0]);
    }
    else if(stage>=4&&id.startsWith('terminal-')){
      const profile=[[.014,-h/2],[w/2,-h/2],[w/2,h/2-.007],[w/2-.007,h/2],[.014,h/2],[.014,-h/2]].map(p=>new THREE.Vector2(...p));g=new THREE.LatheGeometry(profile,16);
    }
    else if(c.primitive==='box')g=kit.rbox(w,h,depth,Math.min(c.geometryDescriptor.edgeTreatment.bevelRadius,Math.min(w,h,depth)*.46));
    else if(c.primitive==='sphere')g=new THREE.SphereGeometry(.5,12,8).scale(w,h,depth);
    else if(c.primitive==='cylinder')g=new THREE.CylinderGeometry(w/2,w/2,h,16,1).scale(1,1,depth/w);
    else if(c.primitive==='tube')g=tube(c.geometryDescriptor.tubePath.points);
    else g=new THREE.BoxGeometry(w,h,depth);
    const m=mesh(g,c.material,id+'-mesh',node);m.userData.sculptComponent=c;meshes[id]=m;
    colliders[id]={type:'static',component:id};destructionGroups[id]=[node];
    const socket=new THREE.Object3D();socket.name=id+'-socket';node.add(socket);sockets[id+':'+id+'-socket']=socket;
  }
  if(stage>=3) {
    const dial=nodes.dial, ticks=[];
    // Radial marks occupy the visible upper semicircle, actual raised relief, not a decal.
    for(let i=0;i<=10;i++){
      const a=Math.PI*.12+i*Math.PI*.76/10;
      const g=new THREE.BoxGeometry(.011,i%5===0?.036:.025,.009);
      g.rotateZ(a-Math.PI/2);g.translate(Math.cos(a)*.154,Math.sin(a)*.154,.020);ticks.push(g);
    }
    // Dial's generated cylinder frame is X-rotated; mount marks in the instrument's front XY plane.
    const dialComponent=components.find(c=>c.id==='dial');
    const ticksMesh=mesh(merge(ticks),'slate','meter-radial-ticks',nodes.root,[.50,dialComponent.transform.position[1],.091]);ticksMesh.userData.explodeWithParent=true;
    const plugGeos=[];
    for(const id of ['terminal-a','terminal-b','terminal-c','terminal-d']) {
      const c=components.find(c=>c.id===id);if(!c)continue;
      const p=c.transform.position;
      plugGeos.push(new THREE.CylinderGeometry(.021,.024,.025,12).rotateX(Math.PI/2).translate(p[0],p[1],p[2]+.04));
    }
    const plugs=mesh(merge(plugGeos),'copper','cable-copper-plugs',nodes.root);plugs.userData.explodeWithParent=true;
  }
  root.userData.sculptRuntime={nodes,meshes,sockets,colliders,destructionGroups};
  root.userData.reconstruction={source:'img2threejs staged TypeScript generation with geometry and kit adaptation',stage,static:true,materialMaps:false};

  // Game-only conversion embellishment after all eight sculpt passes: physical induction emblem plaque.
  mesh(kit.rbox(.18,.075,.014,.006),'cream','game-induction-plaque',root,[0,.54,.423]);
  mesh(kit.rbox(.15,.052,.006,.003),'slate','game-plaque-inset',root,[0,.54,.434]);
  mesh(new THREE.TorusGeometry(.016,.003,4,12),'copper','game-plaque-coil-emblem',root,[0,.54,.442]);
  mesh(new THREE.BoxGeometry(.018,.006,.004),'copper','game-plaque-magnet-emblem',root,[0,.54,.446]);
  const fasteners=[];
  for(const x of [-.073,.073])for(const y of [.515,.565])fasteners.push(new THREE.SphereGeometry(.004,8,6).translate(x,y,.439));
  for(const x of [-.76,-.10])fasteners.push(new THREE.SphereGeometry(.006,8,6).translate(x,.812,.21));
  mesh(merge(fasteners),'copper','game-plaque-and-cradle-fasteners',root);
  // A final static game prop can batch tiny parts while keeping the accepted sculpt artifacts intact.
  root.updateMatrixWorld(true);
  const conversionBatches=[];
  for(const key of ['cream','copper']) {
    const sources=[];
    root.traverse(o=>{if(o.isMesh&&o.material===materials[key]&&(/^(terminal-|knob-|needle-pivot-)/.test(o.name)||['cable-copper-plugs','game-plaque-coil-emblem','game-plaque-magnet-emblem','game-plaque-and-cradle-fasteners'].includes(o.name)))sources.push(o);});
    if(sources.length<2)continue;
    // kit.rbox is cached: clone every geometry before applying a world transform.
    const combined=merge(sources.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld)));
    const batch=mesh(combined,key,'game-micro-batch-'+key,root);
    batch.userData.sourceComponentIds=sources.map(o=>o.userData.sculptComponent?.id||o.name);
    conversionBatches.push({material:key,mesh:batch.name,sources:batch.userData.sourceComponentIds});
    for(const old of sources){if(old.userData.sculptComponent)meshes[old.userData.sculptComponent.id]=batch;old.parent.remove(old);}
  }
  root.userData.gameConversion={static:true,embellishment:'Modeled cream/slate induction emblem plaque with copper ring/bar and six merged fasteners; no text or image map.',conversionBatches,source:'optimization-pass.factory.js after all eight accepted sculpt reviews',interactionExcluded:'User requested static furniture only; no animation/event handlers/explode runtime.'};

  return root;
};
})(typeof window !== 'undefined' ? window : globalThis);

/* W25：共享粉彩色票、低面數曲面與靜態材質批次。
   原始 parts 完整保留，仍是回退與尺寸的依據；玩家家、商店縮圖、裝潢共用同一工廠。 */
(function (root) {
  const I = root.TA.ISLE;
  const COLORS = ['#f0e5d5', '#e8decf', '#c8bdd1', '#cda67e', '#b98e6b', '#947b7b',
    '#ad9abd', '#9186a8', '#777a98', '#9fb994', '#bcd0a9', '#7f9e92',
    '#f3bdd2', '#f9dce5', '#cfbee8', '#fff0d4', '#a7dcd9', '#b7c7e2',
    '#d5bedd', '#ffd39d', '#e8c48b', '#ceaa83', '#ebc3c5', '#5d607a'];
  const SWATCH = { '#c69a73': '#cda67e', '#9f795d': '#b98e6b', '#ae8058': '#b98e6b',
    '#f5ecd9': '#f0e5d5', '#a9c8b2': '#bcd0a9', '#e4afa4': '#ebc3c5',
    '#a8c4d5': '#b7c7e2', '#c4bad6': '#cfbee8', '#586779': '#777a98',
    '#83ad88': '#9fb994', '#b8cf9b': '#bcd0a9', '#8a7260': '#947b7b',
    '#35594e': '#7f9e92', '#365c51': '#7f9e92', '#5a8070': '#9fb994', '#416c5c': '#7f9e92', '#58766a': '#7f9e92',
    '#604637': '#b98e6b', '#70523f': '#b98e6b', '#4e3b32': '#947b7b', '#89674b': '#cda67e',
    '#76553d': '#b98e6b', '#70513e': '#b98e6b', '#76523d': '#b98e6b' };
  const rgb = hex => [1, 3, 5].map(n => parseInt(hex.slice(n, n + 2), 16));
  const palette = COLORS.map(c => [c, rgb(c)]), mapped = new Map();
  function color(c) {
    c = (c || '#cccccc').toLowerCase();
    if (SWATCH[c]) return SWATCH[c];
    if (!mapped.has(c)) {
      const v = rgb(c);
      mapped.set(c, palette.reduce((best, p) => {
        const d = p[1].reduce((s, a, j) => s + (a - v[j]) ** 2, 0);
        return d < best[1] ? [p[0], d] : best;
      }, [COLORS[0], Infinity])[0]);
    }
    return mapped.get(c);
  }
  // parts 沒有零件名稱；在工廠集中標示用途（索引從 0 起），不以顏色猜材質。
  // 同色可用於木框、床墊、釉陶及紙頁；只有用途相同才共用材質及合批。
  function surfaces(base, groups = {}) {
    const parts = [];
    for (const [kind, ranges] of Object.entries(groups)) for (const range of ranges.split(',')) {
      const [lo, hi = lo] = range.split('-').map(Number);
      for (let i = lo; i <= hi; i++) parts[i] = kind;
    }
    return { base, parts };
  }
  const SURFACES = {
    // 入門家具：木構／軟包、五金、書、燈罩、陶盆與葉子。
    pastel_single_bed: surfaces('wood', { fabric: '5,7,9-12' }),
    pastel_double_bed: surfaces('wood', { fabric: '5,7,9-14' }),
    mint_two_seat_sofa: surfaces('fabric', { wood: '0-3' }),
    lavender_armchair: surfaces('fabric', { wood: '0-3' }),
    wood_dining_chair: surfaces('wood', { fabric: '5' }),
    round_wood_stool: surfaces('wood', { fabric: '5' }),
    low_coffee_table: surfaces('wood'),
    round_dining_table: surfaces('wood'),
    pastel_study_desk: surfaces('wood', { paper: '11-12', ceramic: '13', metal: '15' }),
    bedside_cabinet: surfaces('wood', { metal: '7' }),
    pastel_wardrobe: surfaces('wood', { metal: '10-11' }),
    coral_chest_of_drawers: surfaces('wood', { metal: '9-11' }),
    open_bookcase: surfaces('wood', { paper: '7-14,16-18', ceramic: '15,19' }),
    soft_table_lamp: surfaces('wood', { lamp: '2-3', metal: '4-5' }),
    soft_floor_lamp: surfaces('wood', { lamp: '2-3', metal: '4-5' }),
    hanging_standing_lantern: surfaces('wood', { metal: '3,11', lamp: '6' }),
    leafy_potted_plant: surfaces('foliage', { ceramic: '0-1', stone: '2', wood: '3-5' }),
    cactus_pot: surfaces('foliage', { ceramic: '0-1', stone: '2' }),
    flower_pot: surfaces('foliage', { ceramic: '0-1', stone: '2' }),
    layered_oval_rug: surfaces('fabric'),
    woven_rectangular_rug: surfaces('fabric'),
    pedestal_analog_clock: surfaces('wood', { paper: '3', metal: '4-11' }),
    retro_tv_on_stand: surfaces('wood', { metal: '8,10-16', lamp: '9' }),
    pastel_refrigerator: surfaces('metal', { wood: '7-8' }),
    compact_kitchenette: surfaces('wood', { ceramic: '5', metal: '8-22' }),
    rounded_bathtub: surfaces('ceramic', { wood: '0-3', glass: '5', metal: '10-13' }),
    bathroom_vanity: surfaces('wood', { metal: '7-8,12-13,17', ceramic: '9-11' }),
    tea_set_on_tray: surfaces('ceramic', { wood: '0-4' }),
    retro_record_player: surfaces('wood', { metal: '6,8-11,14-15', paper: '7', fabric: '13' }),
    soft_floor_cushion: surfaces('fabric'),
    // 島民禮物：紙本、實驗器皿與機械模型各自分流。
    chinese_brush_inkstone: surfaces('wood', { fabric: '5,7,9', stone: '10-12', ceramic: '13' }),
    chinese_threadbound_cabinet: surfaces('wood', { paper: '11,15,19', fabric: '12-14,16-18,20-22' }),
    english_alphabet_blocks: surfaces('wood'),
    english_dictionary_shelf: surfaces('wood', { paper: '8-21' }),
    math_abacus: surfaces('wood', { metal: '5,11,17' }),
    math_geometry_models: surfaces('wood'),
    history_ancient_map_table: surfaces('wood', { paper: '5-13', metal: '14-15' }),
    history_compass: surfaces('metal', { paper: '1', wood: '10', glass: '11,13' }),
    geography_globe: surfaces('paper', { wood: '0', metal: '1,3-4' }),
    geography_contour_model: surfaces('wood', { paper: '12' }),
    civics_balance_scale: surfaces('metal', { wood: '0', paper: '13' }),
    civics_gavel: surfaces('wood', { metal: '4-7', paper: '8' }),
    physics_newton_cradle: surfaces('metal', { wood: '0', fabric: '8-9,11-12,14-15,17-18,20-21' }),
    physics_tesla_lamp: surfaces('metal', { wood: '0', ceramic: '2', lamp: '12-13', paper: '14' }),
    chemistry_test_tube_rack: surfaces('glass', { wood: '0-3' }),
    chemistry_water_molecule: surfaces('ceramic', { wood: '0', metal: '1,5-6', paper: '7' }),
    biology_microscope: surfaces('metal', { glass: '12-14', lamp: '15' }),
    biology_dna_helix: surfaces('ceramic', { wood: '0', paper: '1', metal: '18-23' }),
    earth_volcano_model: surfaces('stone', { wood: '0', foliage: '10-12', paper: '13' }),
    earth_planetarium: surfaces('metal', { wood: '0', glass: '4-5', lamp: '10-13,15,17-20,22' }),
    // 紀念品：獎盃金屬、織旗、御守與枝葉；發光零件維持自發光。
    trophy_mock_gold: surfaces('metal', { wood: '0' }),
    trophy_mock_silver: surfaces('metal', { stone: '0-1' }),
    trophy_mock_bronze: surfaces('metal', { wood: '0' }),
    flag_hundred_day_pledge: surfaces('fabric', { wood: '0,2', metal: '1,3' }),
    lamp_newyear_firework: surfaces('metal', { wood: '0', lamp: '3,11-18' }),
    clock_exam_countdown: surfaces('metal', { paper: '1-11', wood: '12-13', lamp: '14-15' }),
    rack_qualification_omamori: surfaces('fabric', { wood: '0-3', ceramic: '16-17' }),
    ornament_spring_blossom: surfaces('foliage', { ceramic: '0-1', stone: '2', wood: '3-5', paper: '18' }),
    lamp_midautumn_moon: surfaces('ceramic', { wood: '0-2', metal: '3', lamp: '4', paper: '14' }),
    model_weekly_reading_lighthouse: surfaces('plaster', { wood: '0', stone: '1', metal: '5-11,15', lamp: '12-13', ceramic: '14' }),
    cup_fish_gold: surfaces('metal', { wood: '0' }),
    cup_fish_silver: surfaces('metal', { stone: '0' }),
    cup_bug_gold: surfaces('metal', { wood: '0' }),
    cup_bug_silver: surfaces('metal', { stone: '0' }),
    star_projector: surfaces('metal', { glass: '2', lamp: '4-12' }),
    telescope_model: surfaces('metal', { glass: '9,11,14' }),
    pea_pot: surfaces('foliage', { ceramic: '0-1', stone: '2', wood: '3-5' }),
    // DIY 與節慶：木／石／鐵構、布棚、玻璃瓶與陶器。
    diy_wood_stool: surfaces('wood'),
    diy_twig_frame: surfaces('wood', { paper: '2' }),
    diy_wood_crate: surfaces('wood'),
    diy_log_bench: surfaces('wood'),
    diy_stone_table: surfaces('stone'),
    diy_stone_lantern: surfaces('stone', { metal: '7', lamp: '8' }),
    diy_shell_wind_chime: surfaces('ceramic', { wood: '0-2', fabric: '3,9,15' }),
    diy_shell_lamp: surfaces('ceramic', { wood: '0', metal: '2', lamp: '3-7' }),
    diy_shell_box: surfaces('ceramic', { wood: '0,2' }),
    diy_orange_crate: surfaces('wood', { foliage: '13-20' }),
    diy_juice_stall: surfaces('wood', { metal: '4-5', fabric: '6-10', glass: '11-12,14-15', foliage: '17-19' }),
    diy_iron_bookshelf: surfaces('metal', { wood: '5,7,9,11', paper: '12-16' }),
    diy_iron_study_desk: surfaces('metal', { wood: '4-5,7-8,13', paper: '10-11', ceramic: '14' }),
    diy_star_chandelier: surfaces('metal', { lamp: '4-9' }),
    diy_starry_rug: surfaces('fabric'),
    diy_star_sand_bottle: surfaces('glass', { stone: '0-1', wood: '6', lamp: '7-15' }),
    pumpkin_lantern: surfaces('foliage', { wood: '0,7', lamp: '9-14' }),
    ghost_cushion: surfaces('fabric'),
    candy_jar: surfaces('ceramic', { glass: '0-9' }),
    witch_cauldron: surfaces('metal', { glass: '5-11', wood: '14', paper: '16' }),
    xmas_tree: surfaces('foliage', { ceramic: '0-1', wood: '2', metal: '6,13-18', lamp: '7-12' }),
    tangyuan_bowl: surfaces('ceramic', { wood: '0-4', glass: '6,14-19' }),
    lantern_rabbit: surfaces('paper', { wood: '0-2', metal: '3', fabric: '4', lamp: '5-8,16-18' }),
    // 飯店系列：塗裝木料仍是木；藤編／榻榻米／繡花視為織物。
    hotel_beach_surfboard: surfaces('wood'),
    hotel_beach_striped_chaise: surfaces('wood', { fabric: '5-11' }),
    hotel_beach_shell_table: surfaces('wood', { ceramic: '9-14' }),
    hotel_beach_shell_lamp: surfaces('ceramic', { wood: '0', lamp: '2-6,10' }),
    hotel_beach_buoy_basket: surfaces('fabric', { ceramic: '10-13' }),
    hotel_wa_tatami_tea_table: surfaces('wood', { fabric: '5-9', ceramic: '11-19' }),
    hotel_wa_paper_lantern: surfaces('wood', { lamp: '2', fabric: '8-9' }),
    hotel_wa_plum_cushion: surfaces('fabric'),
    hotel_wa_plum_screen: surfaces('wood', { paper: '4-6', foliage: '15-19', metal: '20-21' }),
    hotel_wa_tea_cabinet: surfaces('wood', { ceramic: '12-15', paper: '16' }),
    hotel_country_gingham_sofa: surfaces('fabric', { wood: '0-4' }),
    hotel_country_crockery_hutch: surfaces('wood', { ceramic: '15-24' }),
    hotel_country_porch_rocker: surfaces('wood', { fabric: '21' }),
    hotel_country_market_flower_basket: surfaces('foliage', { fabric: '0,2-5', stone: '1' }),
    hotel_country_glowing_hearth: surfaces('stone', { wood: '7-8', lamp: '9-11', ceramic: '21', foliage: '22' }),
    hotel_kids_block_castle_cabinet: surfaces('wood', { fabric: '17,21' }),
    hotel_kids_wooden_rocking_horse: surfaces('wood', { fabric: '11' }),
    hotel_kids_balloon_floor_lamp: surfaces('metal', { fabric: '3-4,6-7,9-10', lamp: '5,8,11' }),
    hotel_kids_crayon_play_table: surfaces('wood', { ceramic: '9' }),
    hotel_kids_little_flag_tent_bed: surfaces('fabric', { wood: '0,3-7,11' }),
    hotel_star_tripod_telescope: surfaces('metal', { glass: '11-12' }),
    hotel_star_moon_floor_lamp: surfaces('metal', { lamp: '4-8' }),
    hotel_star_constellation_table: surfaces('metal', { wood: '3' }),
    hotel_star_standing_star: surfaces('metal', { ceramic: '3,9' }),
    hotel_star_stargazing_sofa: surfaces('fabric', { metal: '0-3' }),
    hotel_forest_tree_stump_table: surfaces('wood'),
    hotel_forest_mushroom_stool: surfaces('wood', { fabric: '3-8' }),
    hotel_forest_moss_sprout_planter: surfaces('foliage', { ceramic: '0-2', stone: '3,12' }),
    hotel_forest_birdhouse_stand: surfaces('wood', { foliage: '1-2' }),
    hotel_forest_vine_floor_lamp: surfaces('foliage', { metal: '0-1,3', lamp: '2,4' }),
    hotel_retro_pastel_arcade: surfaces('wood', { lamp: '6', metal: '12,14-15,17' }),
    hotel_retro_comet_pinball: surfaces('metal', { wood: '4-6', lamp: '7-9' }),
    hotel_retro_rabbit_ear_tv_console: surfaces('wood', { metal: '7-8,11,13-21', lamp: '12' }),
    hotel_retro_cherry_diner_stool: surfaces('metal', { fabric: '4-5' }),
    hotel_retro_neon_arrow_sign: surfaces('metal', { lamp: '5-11' }),
    hotel_library_grand_reading_bookcase: surfaces('wood', { fabric: '7-18', paper: '19-21', metal: '22' }),
    hotel_library_forest_reading_armchair: surfaces('fabric', { wood: '0-3' }),
    hotel_library_scholar_pedestal_globe: surfaces('metal', { wood: '0-2,4', paper: '6,8-10' }),
    hotel_library_typewriter_writing_desk: surfaces('metal', { wood: '0-4', paper: '19-22' }),
    hotel_library_green_pullchain_floor_lamp: surfaces('metal', { lamp: '4,6' }),
    // 夢境家具：柔軟面仍是 fabric，彩色發光保留原主題色。
    dream_cloud_sofa: surfaces('fabric', { wood: '0-4' }),
    dream_cloud_bed: surfaces('fabric', { wood: '0-4' }),
    dream_star_lamppost: surfaces('metal', { lamp: '5-11', paper: '12' }),
    dream_crescent_swing: surfaces('ceramic', { stone: '0-1', metal: '2,14-15', fabric: '16-19' }),
    dream_moon_lamp: surfaces('ceramic', { metal: '2', lamp: '3-15' }),
    dream_rainbow_arch: surfaces('ceramic'),
    dream_crystal_cluster: surfaces('glass', { stone: '0-1' }),
    dream_glowing_mushrooms: surfaces('foliage'),
    dream_cotton_candy_tree: surfaces('foliage', { wood: '1-3' }),
    dream_candy_pillar: surfaces('ceramic'),
    dream_hot_air_balloon: surfaces('fabric', { wood: '0', metal: '12', lamp: '13' }),
    dream_carousel_pony: surfaces('wood', { metal: '2,22', fabric: '13-15', lamp: '16-21' }),
    dream_star_fountain: surfaces('ceramic', { glass: '2,6,15-20', metal: '8', lamp: '9-14' }),
    dream_dream_clock_tower: surfaces('wood', { ceramic: '4', lamp: '5,12', paper: '7', metal: '8-10' }),
    dream_bubble_machine: surfaces('metal', { lamp: '6', glass: '7-12' }),
    dream_feather_pillows: surfaces('fabric'),
    dream_dream_candelabra: surfaces('ceramic', { lamp: '6,10,14', metal: '15' }),
    dream_constellation_rug: surfaces('fabric'),
    // 研究系列：文字／地圖紙面、機械金屬、試劑玻璃、植物與石製模型。
    res_chinese_1: surfaces('wood', { paper: '5-9', stone: '10-11', ceramic: '12,15-16', fabric: '14' }),
    res_chinese_2: surfaces('wood', { paper: '5,7,9-18' }),
    res_chinese_3: surfaces('wood', { paper: '4,6,10,12,16,18', fabric: '5,7,11,13,17,19' }),
    res_english_1: surfaces('wood', { paper: '2-3,5-6,8-9,11-12,14-15,17-18,20-21', metal: '4,7,10,13,16,19' }),
    res_english_2: surfaces('wood', { paper: '5-17' }),
    res_english_3: surfaces('wood', { paper: '10-15' }),
    res_math_1: surfaces('wood', { paper: '5-13', fabric: '15' }),
    res_math_2: surfaces('metal', { wood: '0-3' }),
    res_math_3: surfaces('metal', { wood: '0', paper: '2,16' }),
    res_history_1: surfaces('wood', { paper: '6-11' }),
    res_history_2: surfaces('wood', { fabric: '2,8', paper: '3,5-6,9,11-12,14', metal: '13' }),
    res_history_3: surfaces('wood', { ceramic: '6-9', paper: '10-12,14-18', metal: '13' }),
    res_geography_1: surfaces('wood', { paper: '5-13', metal: '14', fabric: '15' }),
    res_geography_2: surfaces('wood', { paper: '11' }),
    res_geography_3: surfaces('wood', { paper: '5-6,14-16', metal: '9-13' }),
    res_civics_1: surfaces('metal', { wood: '0,8-11', plaster: '1', lamp: '5' }),
    res_civics_2: surfaces('wood', { paper: '3-10', metal: '11-12', fabric: '14,16,18,20' }),
    res_civics_3: surfaces('wood', { paper: '5-15', metal: '16' }),
    res_physics_2: surfaces('metal', { wood: '0,7-16', ceramic: '1-3', paper: '18-21' }),
    res_physics_3: surfaces('metal', { wood: '0,3,15', ceramic: '5', lamp: '8', paper: '14' }),
    res_chemistry_1: surfaces('glass', { wood: '0', metal: '1-3', paper: '5,11', stone: '6' }),
    res_chemistry_2: surfaces('glass', { wood: '0', metal: '1,12-15,18', paper: '16-17' }),
    res_chemistry_3: surfaces('wood', { glass: '6,8,10,12,14,16', paper: '7,9,11,13,15,17,19', metal: '18' }),
    res_biology_1: surfaces('wood', { paper: '5,7,11', foliage: '6,12-15', metal: '8', glass: '10' }),
    res_biology_2: surfaces('wood', { ceramic: '5,11', stone: '6,12', foliage: '7-9,13-15', paper: '10,16,19-20' }),
    res_biology_3: surfaces('wood', { paper: '5', foliage: '7-16' }),
    res_earth_1: surfaces('metal', { wood: '0,11-12', paper: '13,21' }),
    res_earth_2: surfaces('metal', { wood: '0-3' }),
    res_earth_3: surfaces('wood', { paper: '5-7,18', metal: '8-17' }),
    trophy_naturalist: surfaces('metal', { wood: '0-1', stone: '16-23' }),
    trophy_curator: surfaces('wood', { metal: '6,8,11-12,15', paper: '7,9-10,16,19-23', ceramic: '17-18' }),
    hotel_front_desk: surfaces('wood', { metal: '3-5', lamp: '6', paper: '7', ceramic: '8', foliage: '9' }),
    hotel_lounge_rug: surfaces('fabric'),
    hotel_key_rack: surfaces('wood', { ceramic: '1-8' }),
  };
  const METAL = { roughness: .38, metalness: .75, vertexColors: true };
  const GLASS = { roughness: .08, metalness: 0, transparent: true, opacity: .18, depthWrite: false, vertexColors: true };
  const MATTE = { roughness: .78, vertexColors: true };
  function model(THREE, kit, f) {
    const group = new THREE.Group(); group.name = 'furn:' + f.id;
    const batches = new Map(), bounds = new THREE.Box3(), tmp = new THREE.Object3D();
    const semantic = SURFACES[f.id] || { base: f.cat === 'rug' ? 'fabric' : 'wood', parts: [] };
    const material = (c, e, kind = semantic.base) => {
      // room 的精簡 kit 只有 mat/rbox；保留完整 kit 的 lamp/glass，並以相同參數適配精簡 kit。
      if (kind === 'glass' && kit.glass) return { mat: kit.glass() };
      if (kind === 'lamp' && kit.lamp) return { mat: kit.lamp(f.cat === 'light' ? '#ffd39d' : color(c)) };
      const opts = kind === 'metal' ? METAL : kind === 'glass' ? GLASS : MATTE;
      // 以線性色彩頂點保存 W25 色票：同 kind 的不同顏色可合成一批，避免材質種類乘上 24 色。
      if (!e && kind !== 'lamp') return { mat: kit.mat('#ffffff', opts, kind), tint: new THREE.Color(color(c)) };
      const glow = f.cat === 'light' ? '#ffd39d' : color(c);
      return { mat: kit.mat(glow, { ...opts, roughness: kind === 'glass' ? .08 : .75, vertexColors: false, emissive: new THREE.Color(glow), emissiveIntensity: f.cat === 'light' ? .65 : .35 }, kind === 'lamp' ? undefined : kind) };
    };
    function add(geo, surface, pt = {}) {
      tmp.position.fromArray(pt.p || [0, 0, 0]); tmp.rotation.set(pt.rx || 0, pt.ry || 0, pt.rz || 0);
      tmp.scale.set(1, pt.t === 'sph' ? pt.sy || 1 : 1, 1); tmp.updateMatrix();
      const g = geo.clone().applyMatrix4(tmp.matrix); g.computeBoundingBox();
      const tint = surface.tint, colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) { colors[i] = tint ? tint.r : 1; colors[i + 1] = tint ? tint.g : 1; colors[i + 2] = tint ? tint.b : 1; }
      g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const mat = surface.mat;
      if (!batches.has(mat)) batches.set(mat, []); batches.get(mat).push(g);
    }
    function basic(pt, original) {
      if (pt.t === 'box') {
        const r = original ? pt.r || 0 : Math.max(pt.r || 0, Math.min(.014, Math.min(...pt.s) * .22));
        const upholstered = (f.cat === 'bed' || f.cat === 'seat') && color(pt.c) !== '#cda67e' && pt.s[1] > .2;
        return kit.rbox(...pt.s, original || upholstered ? r : Math.min(r, .049));
      }
      if (pt.t === 'cyl') return new THREE.CylinderGeometry(pt.rt ?? pt.r ?? .2, pt.rb ?? pt.r ?? .2, pt.h || .2, 16);
      if (pt.t === 'cone') return new THREE.ConeGeometry(pt.r || .2, pt.h || .3, 16);
      if (pt.t === 'sph') return new THREE.SphereGeometry(pt.r || .2, original ? 16 : 12, original ? 12 : 8);
      if (pt.t === 'tor') return new THREE.TorusGeometry(pt.r || .2, pt.tube || .04, original ? 8 : 6, original ? 20 : 16);
      return null;
    }
    function pillow(s, seat) {
      const g = new THREE.SphereGeometry(1, 16, 10), p = g.attributes.position;
      const q = (v, exp) => Math.sign(v) * Math.pow(Math.abs(v), exp);
      for (let i = 0; i < p.count; i++) {
        const x = q(p.getX(i), .55) * s[0] / 2, z = q(p.getZ(i), .55) * s[2] / 2;
        let y = q(p.getY(i), .55) * s[1] / 2;
        if (seat && y > 0) y -= .007 * (1 - (2 * x / s[0]) ** 2) * (1 - (2 * z / s[2]) ** 2);
        p.setXYZ(i, x, y, z);
      }
      g.computeVertexNormals(); return g;
    }
    function shell(rt, rb, h, thickness) {
      // 封閉旋轉截面：有外壁、內壁和環形底口，燈芯不被實心圓錐堵住。
      const t = thickness, points = [[rb, -h / 2], [rt, h / 2], [Math.max(.002, rt - t), h / 2 - t],
        [Math.max(.002, rb - t), -h / 2 + t], [rb, -h / 2]].map(p => new THREE.Vector2(...p));
      return new THREE.LatheGeometry(points, 20);
    }
    const plush = f.cat === 'bed' || f.cat === 'seat';
    (f.parts || []).forEach((pt, index) => {
      const original = basic(pt, true); if (!original) return;
      tmp.position.fromArray(pt.p || [0, 0, 0]); tmp.rotation.set(pt.rx || 0, pt.ry || 0, pt.rz || 0);
      tmp.scale.set(1, pt.t === 'sph' ? pt.sy || 1 : 1, 1); tmp.updateMatrix();
      original.computeBoundingBox(); bounds.union(original.boundingBox.clone().applyMatrix4(tmp.matrix));
      // rbox 幾何由 kit 快取，絕不在共享幾何上原地修改。
      if (pt.t !== 'box') original.dispose();
      let g = basic(pt, false), m = material(pt.c, pt.e, pt.kind || semantic.parts[index] || semantic.base);
      if (plush && pt.t === 'box' && pt.r >= .05 && pt.s[1] <= .2 && pt.s[2] > .25 && Math.min(...pt.s) >= .1 && color(pt.c) !== '#cda67e') {
        g = pillow(pt.s, f.cat === 'seat');
      }
      if (f.cat === 'bed' && pt.t === 'box' && pt.s[2] < .18 && pt.s[1] > .65) {
        const [w, h, d] = pt.s, s = new THREE.Shape(), r = Math.min(.12, w * .15);
        s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2 - r);
        s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
        s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.closePath();
        g = new THREE.ExtrudeGeometry(s, { depth: d - .012, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 1, curveSegments: 5, steps: 1 }); g.translate(0, 0, -(d - .012) / 2);
      }
      if (f.cat === 'light' && pt.t === 'cone' && !pt.e && color(pt.c) === '#f0e5d5') {
        g.dispose(); g = shell(pt.r * .18, pt.r, pt.h, .005);
      }
      if (f.id === 'soft_table_lamp' && index === 2) {
        g.dispose();
        const points = [[.232, -.07], [.26, -.025], [.22, .065], [.12, .105], [0, .112],
          [0, .106], [.116, .099], [.215, .059], [.254, -.025], [.226, -.064], [.232, -.07]];
        g = new THREE.LatheGeometry(points.map(p => new THREE.Vector2(...p)), 24);
        add(g, m, { p: pt.p }); g.dispose(); return;
      }
      if (f.id === 'leafy_potted_plant' && pt.t === 'sph') {
        // 厚實彎葉取代串珠；中脊抬起、葉端收尖，背面仍有體積。
        g.dispose(); g = new THREE.SphereGeometry(pt.r, 12, 8);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x * .75, y, z * .24 + .15 * y * y / pt.r); }
        g.computeVertexNormals(); add(g, m, { ...pt, rz: (index % 2 ? 1 : -1) * .52, ry: index * .9 }); g.dispose(); return;
      }
      if (f.id === 'flower_pot' && pt.t === 'tor') {
        if (index > 2) {
          g.dispose();
          for (let j = 0; j < 5; j++) {
            const a = j * Math.PI * 2 / 5, petal = new THREE.SphereGeometry(.031, 8, 5).scale(1, 1.25, .45);
            add(petal, m, { p: [pt.p[0] + Math.sin(a) * .044, pt.p[1] + Math.cos(a) * .044, pt.p[2]], rz: -a }); petal.dispose();
          }
          return;
        }
      }
      add(g, m, pt);
      if (pt.t !== 'box' || (plush && pt.r >= .05 && pt.s[1] <= .2 && pt.s[2] > .25 && Math.min(...pt.s) >= .1 && color(pt.c) !== '#cda67e') || (f.cat === 'bed' && pt.s[2] < .18 && pt.s[1] > .65)) g.dispose();
    });
    if (f.id === 'layered_oval_rug' || f.id === 'woven_rectangular_rug') {
      // 毯面僅 8mm；原包圍盒的最高點由一小段翹起的布角保留，避免變成疊層石板。
      batches.forEach(list => list.forEach(g => g.dispose())); batches.clear();
      const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const w = size.x, d = size.z, oval = /oval|moon|cloud/.test(f.id), s = new THREE.Shape(), r = oval ? d / 2 : Math.min(.055, d / 5);
      s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
      s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2);
      s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
      const g = new THREE.ExtrudeGeometry(s, { depth: .008, bevelEnabled: false, steps: 1, curveSegments: 8 }); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), curl = Math.max(0, (x / w - .30) / .20) * Math.max(0, (-z / d - .28) / .22);
        p.setY(i, p.getY(i) + Math.max(0, size.y - .008) * curl);
      }
      g.computeVertexNormals(); add(g, material('#f0e5d5', 0, 'fabric'), { p: [center.x, bounds.min.y, center.z] }); g.dispose();
      if (oval) for (const [k, c] of [[.86, '#ebc3c5'], [.72, '#bcd0a9']]) {
        const ring = new THREE.RingGeometry(.94, 1, 32).rotateX(-Math.PI / 2).scale(w * k / 2, 1, d * k / 2);
        add(ring, material(c, 0, 'fabric'), { p: [center.x, bounds.min.y + .009, center.z] }); ring.dispose();
      }
      // 低對比織帶；流蘇以 5 束／側的真線束保留。
      for (const sign of [-1, 1]) {
        const band = kit.rbox(w * .78, .002, d * .055, .001);
        if (!oval) add(band, material(sign < 0 ? '#bcd0a9' : '#ebc3c5', 0, 'fabric'), { p: [center.x, bounds.min.y + .009, center.z + sign * d * .28] });
        if (!oval) for (let j = 0; j < 5; j++) {
          const tassel = new THREE.CylinderGeometry(.004, .004, .065, 5).rotateX(Math.PI / 2);
          add(tassel, material('#e8decf', 0, 'fabric'), { p: [center.x + (j - 2) * w * .15, bounds.min.y + .005, center.z + sign * (d / 2 - .035)] }); tassel.dispose();
        }
      }
    }
    // 床被前沿一條自然垂邊；保持在原有床框內，不增加佔格。
    if (f.src === 'shop' && f.cat === 'bed') {
      const blanket = f.parts.find(p => p.t === 'box' && p.s[2] > 1 && p.s[1] < .12 && color(p.c) !== '#cda67e');
      if (blanket) { const s = blanket.s, geo = kit.rbox(s[0] * .96, .12, .038, .016); add(geo, material(blanket.c, 0, 'fabric'), { p: [0, blanket.p[1] - .045, blanket.p[2] + s[2] / 2 - .025] }); }
    }
    // 同用途的零件合成一個非索引網格；粉彩保存在頂點，材質透過 kit.mat 全域共用。
    for (const [mat, list] of batches) {
      const positions = [], normals = [], uvs = [], colors = [];
      for (const source of list) {
        const g = source.index ? source.toNonIndexed() : source;
        const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, c = g.attributes.color;
        for (let i = 0; i < p.count; i++) { positions.push(p.getX(i), p.getY(i), p.getZ(i)); normals.push(n.getX(i), n.getY(i), n.getZ(i)); uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0); colors.push(c.getX(i), c.getY(i), c.getZ(i)); }
        if (g !== source) g.dispose(); source.dispose();
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const mesh = new THREE.Mesh(geo, mat); mesh.name = 'surface:' + mat.userData.kind; mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
    }
    // 包圍盒與原始 parts 完全一致：原點、世界尺寸及依模型建立的碰撞盒均保持。
    group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(group), size = b.getSize(new THREE.Vector3()), target = bounds.getSize(new THREE.Vector3());
    const scale = target.divide(size), offset = bounds.min.clone().sub(b.min.clone().multiply(scale));
    const transform = new THREE.Matrix4().compose(offset, new THREE.Quaternion(), scale);
    group.children.forEach(m => { m.geometry.applyMatrix4(transform); m.geometry.computeBoundingBox(); m.geometry.computeBoundingSphere(); });
    group.userData.fid = f.id; return group;
  }
  (I.FURNITURE || []).forEach(f => {
    if (!I.FURNMODELS[f.id]) I.FURNMODELS[f.id] = (THREE, kit) => model(THREE, kit, f);
  });
  // hotel.js 在資料腳本之後才補上這三件；延後到實際建模時取資料。
  ['hotel_front_desk', 'hotel_lounge_rug', 'hotel_key_rack'].forEach(id => {
    I.FURNMODELS[id] = (THREE, kit) => model(THREE, kit, I.FURNITURE.find(f => f.id === id));
  });
})(typeof window !== 'undefined' ? window : globalThis);
