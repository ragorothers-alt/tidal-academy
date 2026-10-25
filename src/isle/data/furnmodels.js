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
  const palette = { wood:'#c69a73', 'wood-dark':'#ab805b', cream:'#f5ecd9', sage:'#a9c8b2', salmon:'#e4afa4', blue:'#a8c4d5', slate:'#586779', copper:'#bfab91' };
  const materials = {};
  for (const key of Object.keys(palette)) materials[key] = kit.mat(palette[key], {roughness:key==='copper'?.48:.76,metalness:key==='copper'?.25:0});
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
    const m=new THREE.Mesh(g, materials[material]);m.name=name;m.castShadow=true;m.receiveShadow=true;
    if(p)m.position.fromArray(p);if(rot)m.rotation.fromArray(rot);(parent||root).add(m);return m;
  }
  function ring(x, y, z, radius, tube, radial=6) {
    return new THREE.TorusGeometry(radius,tube,radial,28).rotateY(Math.PI/2).translate(x,y,z);
  }
  function flange(x) {
    const a=.115,b=.245,t=.026, v=[new THREE.Vector2(a,-t),new THREE.Vector2(b-.012,-t),new THREE.Vector2(b,-t+.012),new THREE.Vector2(b,t-.012),new THREE.Vector2(b-.012,t),new THREE.Vector2(a,t),new THREE.Vector2(a,-t)];
    return new THREE.LatheGeometry(v,28).rotateZ(Math.PI/2).translate(x,0,0);
  }
  function arch(w,h,d) {
    const s=new THREE.Shape(),r=w/2,b=-h/2,cy=h/2-r;
    s.moveTo(-r,b);s.lineTo(r,b);s.lineTo(r,cy);s.absarc(0,cy,r,0,Math.PI,false);s.lineTo(-r,b);
    const g=new THREE.ExtrudeGeometry(s,{depth:d-.03,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.015,bevelThickness:.015,curveSegments:stage>=4?24:12});g.translate(0,0,-(d-.03)/2);return g;
  }
  function tube(points, radius=.014,segments=36) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,6,false); }
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
        g=new THREE.TubeGeometry(new Winding(),h.turns*20,h.wireRadius,6,false);
      }
      if(stage>=1) {
        mesh(merge([flange(-.30),flange(.30)]),'cream','coil-bobbin-flanges',node);
        const sleeve=new THREE.CylinderGeometry(.116,.116,.60,28,1,true).rotateZ(Math.PI/2);
        const inner=mesh(sleeve,'cream','coil-open-inner-sleeve',node);inner.material=kit.mat(palette.cream,{roughness:.76,side:THREE.DoubleSide});
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
    else if(c.primitive==='cylinder')g=new THREE.CylinderGeometry(w/2,w/2,h,24,1).scale(1,1,depth/w);
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
