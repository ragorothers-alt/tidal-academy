/* 潮汐小島 · 程式化模型（img2threejs 重建）：山頂祠堂、水道橋、海鳥雕像、水井與三向指路牌。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.LMMODELS = I.LMMODELS || {};

  // 地標的細磨石／霧面瓦：保留原 kind、雪與地平線變形，只移除照片細節。
  // 32² 程式顆粒讓同色材質共用，也讓 mergeStatic 保留這份局部表面設定。
  let finishTexture;
  function finishKit(THREE, kit) {
    return Object.assign({}, kit, {mat(color, opts, kind) {
      if (kind !== 'stone' && kind !== 'roof' && kind !== 'wall') return kit.mat(color, opts, kind);
      if (!finishTexture) {
        const data = new Uint8Array(32 * 32 * 4);
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
          const i = (y * 32 + x) * 4, v = 251 + ((x * 17 + y * 29 + x * y * 3) % 5);
          data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
        }
        finishTexture = new THREE.DataTexture(data, 32, 32);
        finishTexture.colorSpace = THREE.SRGBColorSpace;
        finishTexture.wrapS = finishTexture.wrapT = THREE.RepeatWrapping;
        finishTexture.magFilter = finishTexture.minFilter = THREE.LinearFilter;
        finishTexture.needsUpdate = true;
      }
      const m = kit.mat(color, Object.assign({}, opts, {name: 'landmark-matte-v1'}), kind);
      if (!m.userData.landmarkFinish) {
        const compile = m.onBeforeCompile, cacheKey = m.customProgramCacheKey();
        m.map = finishTexture;
        m.onBeforeCompile = function(shader, renderer) {
          compile.call(this, shader, renderer);
          shader.fragmentShader = shader.fragmentShader
            .replace(/triD\(uD0,[^;\n]*?,\s*gB\)/g, 'vec3(0.5)')
            .replace(/triN\(uN0,[^;\n]*?,\s*gB\)/g, 'vec3(0.0)')
            .replace('board * grain * (0.89 + lip * 0.11)', '(0.98 + (board * grain - 1.0) * 0.18)')
            .replace('(0.86 + (1.0 - gap) * 0.1 + n_h(floor(p)) * 0.08) * (0.94 + c2 * 0.08)', '(0.985 + (1.0 - gap) * 0.01 + n_h(floor(p)) * 0.015)')
            .replace('(0.74 + scal * 0.26) * (0.89 + edge * 0.11)', '(0.94 + scal * 0.06) * (0.97 + edge * 0.03)');
        };
        m.customProgramCacheKey = () => cacheKey + '-landmark-matte-v1';
        m.userData.landmarkFinish = true; m.needsUpdate = true;
      }
      return m;
    }});
  }
  // 木件按材質先合併；旋轉輪單獨處理。如此後續 mergeStatic 不會重建 wall 材質，
  // 也不會把細木紋恢復成共用照片；wheel 的原點／層級／動畫軸保持不動。
  function finishTimbers(THREE, g) {
    const wheel = g.getObjectByName('wheel');
    for (const scope of wheel ? [g, wheel] : [g]) {
      scope.updateWorldMatrix(true,true);
      const inv = new THREE.Matrix4().copy(scope.matrixWorld).invert(), bins = new Map();
      scope.traverse(o => {
        if (!o.isMesh || Array.isArray(o.material) || !['wall', 'wood'].includes(o.material.userData.kind)) return;
        if (scope === g && wheel) {let p=o;while(p&&p!==wheel)p=p.parent;if(p===wheel)return;}
        if (!bins.has(o.material)) bins.set(o.material,[]); bins.get(o.material).push(o);
      });
      for (const [mat, meshes] of bins) {
        if (meshes.length < 2) continue;
        const positions=[],normals=[],uv=[];
        for (const mesh of meshes) {
          const src=mesh.geometry, geo=src.index?src.toNonIndexed():src.clone();
          geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,mesh.matrixWorld));
          const p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv;
          positions.push(...p.array);normals.push(...n.array);
          if(u)uv.push(...u.array);else for(let i=0;i<p.count;i++)uv.push(p.getX(i),p.getY(i));
          geo.dispose();src.dispose();mesh.parent.remove(mesh);
        }
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
        const mesh=new THREE.Mesh(geo,mat);mesh.name=meshes[0].name;mesh.castShadow=true;mesh.receiveShadow=true;scope.add(mesh);
      }
    }
    return g;
  }

  // 小型、實體花葉；只在原輪廓內的指定基座／外緣生長，不佔走道。
  function dressLandmark(THREE, kit, g, paths, flowers, flowerColor = '#f3bdd2') {
    const bins = [[], []], V = p => new THREE.Vector3(...p);
    const add = (geo, bin, p, scale, ry = 0) => {
      if (scale) geo.scale(...scale); geo.rotateY(ry); geo.translate(...p);
      const raw = geo.index ? geo.toNonIndexed() : geo;
      if (raw !== geo) geo.dispose(); bins[bin].push(raw);
    };
    for (const pts of paths) {
      const curve = new THREE.CatmullRomCurve3(pts.map(V));
      add(new THREE.TubeGeometry(curve, 8, .009, 4, false), 0, [0,0,0]);
      for (let j = 0; j < 6; j++) {
        const p = curve.getPoint((j + .5) / 6), side = j % 2 ? 1 : -1;
        add(new THREE.OctahedronGeometry(1), 0, [p.x + side * .035, p.y, p.z], [.065,.025,.035], side * .6);
      }
    }
    for (const [x,y,z] of flowers) {
      for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 2 / 5;
        add(new THREE.SphereGeometry(1,4,2), 1, [x + .035*Math.cos(a),y+.01,z+.035*Math.sin(a)], [.038,.025,.038]);
      }
      for (const side of [-1,1]) add(new THREE.OctahedronGeometry(1), 0, [x+side*.037,y-.035,z], [.065,.018,.034], side*.7);
    }
    const mats = [kit.mat('#9fb994',{roughness:.94}),kit.mat(flowerColor,{roughness:.88})];
    bins.forEach((geos,i) => {
      if (!geos.length) return;
      const positions=[],normals=[];
      for (const geo of geos) {positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);geo.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      const mesh=new THREE.Mesh(geo,mats[i]);mesh.name=i?'landmark-flowers':'landmark-leaves';mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    });
  }


  // shrine — meters; origin at ground, entrance toward +Z.
  I.LMMODELS['shrine'] = function tidalCrystalShrine(THREE, kit) { kit=finishKit(THREE,kit);
    const g = new THREE.Group(); g.name = 'shrine';
    const stage = 8;
    const color = (c) => stage >= 4 ? c : '#e5dbc7';
    const M = {
      stone: kit.mat(color('#efe3d1'), {roughness: .88}, 'stone'),
      shade: kit.mat(color('#c8bdd1'), {roughness: .95}, 'stone'),
      blue: kit.mat(color('#ad9abd'), {roughness: .69}),
      gold: kit.mat(color('#cda67c'), {roughness: .4, metalness:0.6},'metal'),
      goldLight: kit.mat(color('#e8c48b'), {roughness: .4, metalness:0.6},'metal'),
      crystal: kit.mat(color('#abd0ce'), {roughness: .40, metalness: .02,
        emissive: stage >= 4 ? '#d5c7e6' : '#000000', emissiveIntensity: stage >= 4 ? .20 : 0}),
      crystalShade: kit.mat(color('#9db5c9'), {roughness: .44, metalness: .02,
        emissive: stage >= 4 ? '#d5c7e6' : '#000000', emissiveIntensity: stage >= 4 ? .20 : 0})
    };
    const nodes = {}, batches = new Map();
    function node(id, parent) {const n = new THREE.Group(); n.name = id; (parent ? nodes[parent] : g).add(n); nodes[id] = n; return n;}
    node('plinth'); node('colonnade'); node('canopy');
    const parents = {'steps':'plinth','floor':'plinth','dome':'canopy','fascia':'canopy','finial':'canopy','column-collars':'colonnade','column-inlays':'colonnade','dome-ribs':'canopy','canopy-badges':'canopy','crystal':'altar','altar-claws':'altar'};
    for (const id of ['steps','floor','altar','crystal','column-collars','column-inlays','dome','fascia','finial','dome-ribs','canopy-badges','altar-claws']) node(id, parents[id]);
    for (let i=0;i<6;i++) node('pillar-'+i,'colonnade');
    function add(geo, mat, part) {
      const raw = geo.index ? geo.toNonIndexed() : geo;
      if (!raw.getAttribute('normal')) raw.computeVertexNormals();
      const key = part + ':' + Object.keys(M).find(k => M[k] === mat);
      if (!batches.has(key)) batches.set(key,{part,mat,geos:[]});
      batches.get(key).geos.push(raw);
      if (raw !== geo) geo.dispose();
    }
    function cyl(part, r, h, y, mat, x=0, z=0, top=r, n=32) {const a=new THREE.CylinderGeometry(top,r,h,n,1); a.translate(x,y,z); add(a,mat,part);}
    function lathe(part, points, mat, x=0, y=0, z=0, n=48) {const a=new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),n);a.translate(x,y,z);add(a,mat,part);}
    function ring(part, inner, outer, y, mat, n=64) {const a=new THREE.RingGeometry(inner,outer,n);a.rotateX(-Math.PI/2);a.translate(0,y,0);add(a,mat,part);}
    function tube(part, points, r, mat, n=18) {add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),n,r,5,false),mat,part);}
    function plate(part, pts, depth, x,y,z, mat, ry=0, bevel=.004) {
      const s=new THREE.Shape();s.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)s.lineTo(...pts[i]);s.closePath();
      const a=new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:6});
      a.rotateY(ry);a.translate(x,y,z);add(a,mat,part);
    }
    function diamond(part,x,y,z,w,h,mat,ry=0) {plate(part,[[0,h/2],[w/2,0],[0,-h/2],[-w/2,0]],.012,x,y,z,mat,ry);}
    // Two deliberately low circular risers: the walkable top is only .32 m above ground.
    lathe('steps',[[0,0],[1.85,0],[1.88,.025],[1.88,.075],[1.85,.10],[1.73,.10],[1.75,.12],[1.75,.195],[1.72,.22],[0,.22]],M.stone);
    lathe('floor',[[0,.21],[1.57,.21],[1.60,.235],[1.60,.295],[1.575,.32],[0,.32]],M.stone);
    // Six open bays; circular .17 m column plinths leave .91 m between adjacent supports.
    for(let i=0;i<6;i++) {
      const t=Math.PI/6+i*Math.PI/3,x=1.25*Math.sin(t),z=1.25*Math.cos(t);
      cyl('pillar-'+i,.123,stage>=2?2.12:2.34,stage>=2?1.60:1.49,M.stone,x,z,.111,16);
      if(stage===1) {
        cyl('pillar-'+i,.17,.25,.445,M.stone,x,z,.15,12);
        cyl('pillar-'+i,.155,.12,2.67,M.stone,x,z,.17,12);
      }
      if(stage>=2) {
        lathe('column-collars',[[.001,.32],[.145,.32],[.17,.345],[.17,.48],[.145,.51],[.145,.565],[.123,.59]],M.stone,x,0,z,12);
        lathe('column-collars',[[.12,2.55],[.145,2.57],[.165,2.61],[.165,2.66],[.15,2.69],[.15,2.73]],M.stone,x,0,z,12);
        cyl('column-collars',.143,.045,.55,M.gold,x,z,.143,16);
        cyl('column-collars',.147,.047,2.57,M.gold,x,z,.147,16);
        if(stage>=5) {
          cyl('column-inlays',.124,.058,2.44,M.blue,x,z,.124,16);
          const px=x+Math.sin(t)*.124,pz=z+Math.cos(t)*.124;
          const outline=[[-.064,-.47],[-.064,.43],[0,.54],[.064,.43],[.064,-.47],[0,-.57]];
          plate('column-inlays',outline,.009,px,1.56,pz,M.gold,t);
          plate('column-inlays',outline.map(p=>[p[0]*.73,p[1]*.90]),.012,px+Math.sin(t)*.012,1.56,pz+Math.cos(t)*.012,M.blue,t,.001);
          diamond('column-inlays',px+Math.sin(t)*.027,1.50,pz+Math.cos(t)*.027,.075,.17,M.goldLight,t);
        }
      }
    }
    // A real canopy with stone soffit, low navy frieze, oblate dome and a tiered spire.
    lathe('fascia',[[0,2.70],[1.59,2.70],[1.67,2.74],[1.67,2.78],[1.60,2.80],[1.52,2.80],[1.52,2.94],[1.56,2.94],[1.56,2.965],[0,2.965]],M.stone);
    if(stage>=2) {
      cyl('fascia',1.574,.130,2.867,M.blue,0,0,1.548,48);
      for(const y of [2.801,2.939])cyl('fascia',y<2.9?1.582:1.563,.016,y,M.gold,0,0,y<2.9?1.582:1.563,48);
    }
    const dome=new THREE.SphereGeometry(1,48,20,0,Math.PI*2,0,Math.PI/2);
    dome.scale(1.51,1.02,1.51);dome.translate(0,2.95,0);add(dome,M.blue,'dome');
    if(stage>=3) {
      // Meridian ribbons have actual width; they stay readable from the distant island camera.
      for(let i=0;i<6;i++) {
        const theta=Math.PI/6+i*Math.PI/3,verts=[],n=24;
        function point(t, side) {const r=1.525*Math.sin(t),w=.025+.018*Math.sin(t),a=theta+side*w/Math.max(.15,r);return [r*Math.sin(a),2.95+1.033*Math.cos(t),r*Math.cos(a)];}
        for(let j=0;j<n;j++) {const t0=.10+(Math.PI/2-.10)*j/n,t1=.10+(Math.PI/2-.10)*(j+1)/n,a=point(t0,-1),b=point(t0,1),c=point(t1,1),d=point(t1,-1);verts.push(...a,...c,...b,...a,...d,...c);}
        const r=new THREE.BufferGeometry();r.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));r.computeVertexNormals();add(r,M.gold,'dome-ribs');
        if(stage>=5) {const r=1.681,x=r*Math.sin(theta),z=r*Math.cos(theta);diamond('canopy-badges',x,2.863,z,.19,.39,M.gold,theta);diamond('canopy-badges',x+Math.sin(theta)*.015,2.875,z+Math.cos(theta)*.015,.074,.19,M.goldLight,theta);}
      }
      if(stage>=5) {
        // Fine stone joints follow dome curvature rather than hovering above it.
        for(const t of [.46,.84,1.18]) {
          const a=new THREE.TorusGeometry(1.512*Math.sin(t),.0065,4,64);a.rotateX(Math.PI/2);a.translate(0,2.95+1.021*Math.cos(t),0);add(a,M.shade,'dome');
        }
        for(let i=0;i<6;i++){const theta=i*Math.PI/3,pts=[];for(let j=0;j<=16;j++){const t=.13+(Math.PI/2-.13)*j/16;pts.push([1.512*Math.sin(t)*Math.sin(theta),2.95+1.021*Math.cos(t),1.512*Math.sin(t)*Math.cos(theta)]);}tube('dome',pts,.0055,M.shade,18);}
      }
      lathe('finial',[[0,3.93],[.19,3.93],[.235,3.96],[.235,4.01],[.165,4.035],[.152,4.07],[.1,4.09],[.09,4.15],[.135,4.19],[.082,4.24],[.07,4.29],[.11,4.31],[0,4.46]],M.gold,0,0,0,12);
    } else cyl('finial',.17,.53,4.195,M.stone,0,0,0,12);
    // Compact altar and double-point crystal. Crystal center is y=1.51 m.
    lathe('altar',[[0,.32],[.31,.32],[.35,.35],[.35,.41],[.31,.44],[.28,.46],[.26,.49],[.26,.99],[.30,1.02],[.33,1.055],[.33,1.105],[.28,1.13],[0,1.13]],M.stone,0,0,0,12);
    if(stage>=3) {
      cyl('altar',.285,.024,.49,M.gold,0,0,.285,12);cyl('altar',.323,.024,1.09,M.gold,0,0,.323,12);
      if(stage>=5) {diamond('altar',0,.79,.265,.14,.29,M.gold);diamond('altar',0,.79,.285,.089,.22,M.blue);}
      for(let i=0;i<3;i++){const t=i*Math.PI*2/3,pts=[[.23*Math.sin(t),1.09,.23*Math.cos(t)],[.29*Math.sin(t),1.16,.29*Math.cos(t)],[.28*Math.sin(t),1.30,.28*Math.cos(t)]];tube('altar-claws',pts,.027,M.gold,10);}
    }
    const verts=[],vertsShade=[],N=6,rings=[[1.12,.015],[1.34,.18],[1.63,.20],[1.90,0]];
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){
      const at=(row,k)=>{const t=(k+.5)*Math.PI*2/N;return [rings[row][1]*Math.sin(t),rings[row][0],rings[row][1]*Math.cos(t)];},a=at(j,i),b=at(j,i+1),c=at(j+1,i+1),d=at(j+1,i);(i%3===0?vertsShade:verts).push(...a,...b,...c,...a,...c,...d);
    }
    const crystal=new THREE.BufferGeometry();crystal.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));crystal.computeVertexNormals();add(crystal,M.crystal,'crystal');
    const crystalShade=new THREE.BufferGeometry();crystalShade.setAttribute('position',new THREE.Float32BufferAttribute(vertsShade,3));crystalShade.computeVertexNormals();add(crystalShade,M.crystalShade,'crystal');
    if(stage>=5) {
      ring('floor',1.36,1.50,.322,M.blue);
      ring('floor',1.345,1.365,.325,M.gold);ring('floor',1.501,1.519,.325,M.gold);
      ring('floor',.52,.65,.322,M.blue);ring('floor',.515,.53,.325,M.gold);ring('floor',.65,.665,.325,M.gold);
      for(let i=0;i<6;i++) {const t=i*Math.PI/3,r=1.43,s=.055;const pts=[[0,s*1.8],[s*.23,s*.23],[s,0],[s*.23,-s*.23],[0,-s*1.8],[-s*.23,-s*.23],[-s,0],[-s*.23,s*.23]],shape=new THREE.Shape();shape.moveTo(...pts[0]);pts.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();const a=new THREE.ShapeGeometry(shape);a.rotateX(-Math.PI/2);a.rotateY(t);a.translate(r*Math.sin(t),.327,r*Math.cos(t));add(a,M.gold,'floor');}
    }
    // Merge only within named components and materials: no extra draw calls for repeated fillets.
    for(const {part,mat,geos} of batches.values()) {
      const count=geos.reduce((n,a)=>n+a.attributes.position.count,0),pos=new Float32Array(count*3),norm=new Float32Array(count*3),uv=new Float32Array(count*2);let offset=0;
      for(const a of geos) {const p=a.attributes.position,n=a.attributes.normal,u=a.attributes.uv;pos.set(p.array,offset*3);norm.set(n.array,offset*3);if(u)uv.set(u.array,offset*2);offset+=p.count;a.dispose();}
      const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(pos,3));geom.setAttribute('normal',new THREE.BufferAttribute(norm,3));geom.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      const mesh=new THREE.Mesh(geom,mat);mesh.name=part+'-'+Object.keys(M).find(k=>M[k]===mat);mesh.castShadow=true;mesh.receiveShadow=true;nodes[part].add(mesh);
    }
    dressLandmark(THREE,kit,g,[],[-1.35,1.35].flatMap(x=>[-.09,0,.09].map(d=>[x+d,.37,.68])));
    return g;
  };

  // aqueduct — meters; origin at ground, entrance toward +Z.
  I.LMMODELS['aqueduct'] = function (THREE, kit) { kit=finishKit(THREE,kit);
  const g = new THREE.Group(); g.name = 'aqueduct';
  const assemblies = {};
  for (const name of ['pier-assembly', 'arch-assembly', 'channel-assembly']) {
    const node = new THREE.Group(); node.name = name; g.add(node); assemblies[name] = node;
  }
  const STAGE = 7;
  const L = 4.25, pitch = 8.5 / 3, rise = 1.02, spring = 1, rx = 7 / 6;
  const piers = [-L, -pitch / 2, pitch / 2, L], bays = [-pitch, 0, pitch];
  const mats = {
    stone: kit.mat(STAGE < 3 ? '#e8e3d7' : '#efe3d1', { roughness: .86 }, 'stone'),
    shade: kit.mat(STAGE < 3 ? '#ded7ca' : '#c8bdd1', { roughness: .9 }, 'stone'),
    blue: kit.mat(STAGE < 3 ? '#e8e3d7' : '#a69ab7', { roughness: .72 }),
    gold: kit.mat(STAGE < 3 ? '#ded7ca' : '#e8c48b', { roughness: .4, metalness:0.6 },'metal'),
    water: kit.mat(STAGE < 3 ? '#e8e3d7' : '#abd0ce', { roughness: .18, transparent: true, opacity: .8 }),
    ripple: kit.mat('#d8e6df', { roughness: .22, transparent: true, opacity: .56 })
  };
  const buckets = new Map();
  function add(name, material, geo) {
    if (!buckets.has(name)) buckets.set(name, { material, geos: [] });
    buckets.get(name).geos.push(geo);
  }
  function extrude(points, depth, z, bevel) {
    const shape = new THREE.Shape(); points.forEach((p, i) => shape[i ? 'lineTo' : 'moveTo'](p[0], p[1])); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1, steps: 1 });
    geo.translate(0, 0, z - depth / 2 + bevel); return geo;
  }
  function box(name, mat, x, y, z, w, h, d, bevel = .012) {
    const a = Math.max(-L, x - w / 2), b = Math.min(L, x + w / 2);
    if (b <= a) return;
    if (STAGE < 2 || a !== x - w / 2 || b !== x + w / 2) bevel = 0;
    bevel = Math.min(bevel, h / 4, (b-a) / 4, d / 4);
    if (!bevel) { const geo = new THREE.BoxGeometry(b-a, h, d); geo.translate((a+b)/2,y,z); add(name,mat,geo); return; }
    add(name, mat, extrude([[a+bevel,y-h/2+bevel],[b-bevel,y-h/2+bevel],[b-bevel,y+h/2-bevel],[a+bevel,y+h/2-bevel]],d,z,bevel));
  }
  function clippedPoly(points) {
    for (const [limit, sign] of [[-L,1],[L,-1]]) {
      const out=[]; for (let i=0;i<points.length;i++) {
        const a=points[i],b=points[(i+1)%points.length],ia=sign*(a[0]-limit)>=-1e-8,ib=sign*(b[0]-limit)>=-1e-8;
        if(ia)out.push(a);if(ia!==ib){const t=(limit-a[0])/(b[0]-a[0]);out.push([limit,a[1]+t*(b[1]-a[1])]);}
      } points=out;
    } return points;
  }
  function star(x,y,z,w,h) {
    const p=clippedPoly([[x,y+h],[x+w*.25,y+h*.22],[x+w,y],[x+w*.25,y-h*.22],[x,y-h],[x-w*.25,y-h*.22],[x-w,y],[x-w*.25,y+h*.22]]);
    if(p.length>=3)add('gold-stars',mats.gold,extrude(p,.042,z,0));
    const q=clippedPoly([[x,y+h*.82],[x+w*.2,y+h*.18],[x+w*.82,y],[x,y-h*.82],[x,y]]);
    if(q.length>=3)add('gold-stars',mats.gold,extrude(q,.014,z+Math.sign(z)*.024,0));
  }
  piers.forEach((x,i)=>{
    const name='pier-'+i;
    box(name,mats.stone,x,.105,0,.76,.21,1.18,.018);
    box(name,mats.stone,x,.25,0,.62,.12,1.04,.014);
    box(name,mats.stone,x,.655,0,.5,.73,.88,.014);
    if(STAGE>=1){
      box(name,mats.stone,x,1.065,0,.64,.13,1.02,.012);
      box(name,mats.stone,x,1.165,0,.55,.09,.94,.01);
      for(const s of [-1,1]){
        box('pier-panels',mats.blue,x,.635,s*.449,.265,.57,.018,.004);
        box(name,mats.stone,x-.19,.635,s*.467,.085,.63,.06,.008);
        box(name,mats.stone,x+.19,.635,s*.467,.085,.63,.06,.008);
      }
      box('gold-trims',mats.gold,x,1.005,0,.64,.068,1.035,.006);
      box('gold-trims',mats.gold,x,.286,0,.635,.035,1.055,.004);
    }
    if(STAGE>=4)for(const s of [-1,1])star(x,.64,s*.478,.085,.15);
  });
  bays.forEach((x,i)=>{
    const path=[[x-rx,2.535],[x+rx,2.535],[x+rx,spring]];
    const n=STAGE<2?12:20;
    for(let j=0;j<=n;j++){const t=j*Math.PI/n;path.push([x+rx*Math.cos(t),spring+rise*Math.sin(t)]);}
    add('arch-'+i,mats.stone,extrude(path,.88,0,0));
    if(STAGE>=1){
      for(const s of [-1,1])for(let j=0;j<13;j++){
        const a=j*Math.PI/13+.004,b=(j+1)*Math.PI/13-.004,p=[];
        for(let k=0;k<=2;k++){const t=a+(b-a)*k/2;p.push([x+(rx+.145)*Math.cos(t),spring+(rise+.145)*Math.sin(t)]);}
        for(let k=2;k>=0;k--){const t=a+(b-a)*k/2;p.push([x+rx*Math.cos(t),spring+rise*Math.sin(t)]);}
        add('ring-'+i,mats.stone,extrude(p,.055,s*.468,0));
      }
    }
    if(STAGE>=4)for(const s of [-1,1])star(x,2.225,s*.506,.12,.19);
  });
  box('trough-bed',mats.shade,0,2.64,0,8.5,.10,1.04,.008);
  box('blue-frieze',mats.blue,0,2.5,.457,8.5,.18,.025,.003);
  box('blue-frieze',mats.blue,0,2.5,-.457,8.5,.18,.025,.003);
  box('parapet-front',mats.stone,0,2.79,.52,8.5,.22,.16,.01);
  box('parapet-rear',mats.stone,0,2.79,-.52,8.5,.22,.16,.01);
  if(STAGE>=2)piers.forEach(x=>{for(const s of [-1,1]){
    box('parapet-posts',mats.stone,x,2.735,s*.49,.31,.33,.22,.012);
    box('gold-trims',mats.gold,x,2.535,s*.49,.305,.035,.22,.004);
  }});
  box('water',mats.water,0,2.72,0,8.5,.04,.87,0);
  if(STAGE>=4){
    // Restrained masonry courses stay outside the passable negative spaces.
    for(const x of piers)for(const y of [.43,.78,.93])for(const s of [-1,1])
      box('masonry-seams',mats.shade,x,y,s*.441,.5,.007,.005,0);
    for(let x=-3.65;x<4.25;x+=.61)for(const s of [-1,1])
      box('masonry-seams',mats.shade,x,2.79,s*.599,.009,.18,.002,0);
    for(let i=0;i<10;i++){
      const x=-3.75+i*.82,z=(i%3-1)*.21;
      box('water-ripples',mats.ripple,x,2.743,z,.35+(i%2)*.16,.003,.014,0);
      box('water-ripples',mats.ripple,x+.19,2.743,z+.055,.14,.003,.009,0);
    }
  }
  // One mesh per named semantic system keeps the repeated masonry inexpensive.
  buckets.forEach(({material,geos},name)=>{
    let count=0;const arrays=[];
    for(const source of geos){const geo=source.index?source.toNonIndexed():source;const a=geo.attributes.position.array;arrays.push(a);count+=a.length;if(geo!==source)geo.dispose();source.dispose();}
    const positions=new Float32Array(count);let at=0;for(const a of arrays){positions.set(a,at);at+=a.length;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
    const parent = name.startsWith('arch-') || name.startsWith('ring-') ? 'arch-assembly' : name.startsWith('pier-') || name.startsWith('gold-') ? 'pier-assembly' : 'channel-assembly';
    assemblies[parent].add(mesh);
  });
  dressLandmark(THREE,kit,g,[[[-2.84,2.88,.51],[-2.95,2.55,.51],[-2.88,2.16,.51]],[[2.80,2.87,-.51],[2.91,2.58,-.51],[2.84,2.36,-.51]]],[[-2.90,2.53,.51],[2.86,2.60,-.51]]);
  return g;
};

  // statue — meters; origin at ground, entrance toward +Z.
  I.LMMODELS['statue'] = function (THREE, kit) { kit=finishKit(THREE,kit);
    const g = new THREE.Group();
    g.name = 'tidal-seabird-monument';
    const STAGE = 8;
    const stone = kit.mat('#efe3d1', { roughness: .88 }, 'stone');
    const bird = kit.mat('#f0e5d5', { roughness: .83 });
    const feather = kit.mat('#e8decf', { roughness: .85 });
    const navy = kit.mat('#b7a4c7', { roughness: .78, metalness: .08 });
    const gold = kit.mat('#e8c48b', { roughness: .4, metalness:0.6 },'metal');
    const eye = kit.mat('#777a98', { roughness: .25, metalness: .1 });
    const V = (x,y,z) => new THREE.Vector3(x,y,z);
    function merge(geos) {
      const ps=[], ns=[], uv=[];
      for (const source of geos) {
        const a=source.index?source.toNonIndexed():source;
        if (!a.attributes.normal) a.computeVertexNormals();
        const p=a.attributes.position,n=a.attributes.normal,u=a.attributes.uv;
        for(let i=0;i<p.count;i++) {
          ps.push(p.getX(i),p.getY(i),p.getZ(i));ns.push(n.getX(i),n.getY(i),n.getZ(i));
          uv.push(u?u.getX(i):p.getX(i),u?u.getY(i):p.getY(i));
        }
        if (a!==source) a.dispose();
        source.dispose();
      }
      const a=new THREE.BufferGeometry();
      a.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));
      a.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));
      a.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      return a;
    }
    function part(name,geos,material) {
      if(!geos.length)return;
      const geometry=merge(geos);
      if(name.startsWith('wing')) geometry.scale(.86,1,1);
      const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
    }
    function transform(a,position,scale,rotation) {
      if(scale)a.scale(...scale);if(rotation)a.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)));if(position)a.translate(...position);return a;
    }
    function roundedTier(w,d,h,y,ch=.07,b=.009) {
      const x=w/2-b,z=d/2-b,c=Math.min(ch,x*.8,z*.8),s=new THREE.Shape();
      s.moveTo(-x+c,-z);s.lineTo(x-c,-z);s.lineTo(x,-z+c);s.lineTo(x,z-c);s.lineTo(x-c,z);s.lineTo(-x+c,z);s.lineTo(-x,z-c);s.lineTo(-x,-z+c);s.closePath();
      const a=new THREE.ExtrudeGeometry(s,{depth:h-2*b,bevelEnabled:STAGE>=3,bevelThickness:b,bevelSize:b,bevelSegments:1,steps:1,curveSegments:1});
      a.rotateX(-Math.PI/2);a.translate(0,y+b,0);return a;
    }
    function box(w,h,d,x,y,z) {return transform(new THREE.BoxGeometry(w,h,d),[x,y,z]);}
    function tube(points,r,segments=8,radial=6) {
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>V(...p))),segments,r,radial,false);
    }
    function extrusion(shape,depth,z,bevel=.004) {
      const a=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:STAGE>=3,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:14});a.translate(0,0,z);return a;
    }
    function ellipse(rx,ry,rz,x,y,z) {return transform(new THREE.SphereGeometry(1,8,5),[x,y,z],[rx,ry,rz]);}
    // A watertight variable-radius loft. Each ring is [x,y,z,width,depth].
    // Width is measured along side and depth along normal, independently of path length.
    function loft(rings,side=V(1,0,0),radial=10) {
      const p=[],ix=[],uv=[];
      for(let j=0;j<rings.length;j++) {
        const r=rings[j],prev=rings[Math.max(0,j-1)],next=rings[Math.min(rings.length-1,j+1)];
        const tangent=V(next[0]-prev[0],next[1]-prev[1],next[2]-prev[2]).normalize();
        let s=side.clone().addScaledVector(tangent,-side.dot(tangent)).normalize();
        if(s.lengthSq()<.1)s=V(1,0,0);
        const n=new THREE.Vector3().crossVectors(s,tangent).normalize();
        for(let k=0;k<radial;k++) {
          const t=k/radial*Math.PI*2,c=Math.cos(t),sn=Math.sin(t);
          p.push(r[0]+s.x*r[3]*c+n.x*r[4]*sn,r[1]+s.y*r[3]*c+n.y*r[4]*sn,r[2]+s.z*r[3]*c+n.z*r[4]*sn);
          uv.push(k/radial,j/(rings.length-1));
          if(j<rings.length-1) {const a=j*radial+k,b=j*radial+(k+1)%radial,c0=(j+1)*radial+k,d=(j+1)*radial+(k+1)%radial;ix.push(a,c0,b,b,c0,d);}
        }
      }
      for(let k=1;k<radial-1;k++) {ix.push(0,k,k+1);const e=(rings.length-1)*radial;ix.push(e,e+k+1,e+k);}
      const a=new THREE.BufferGeometry();a.setAttribute('position',new THREE.Float32BufferAttribute(p,3));a.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));a.setIndex(ix);a.computeVertexNormals();return a;
    }
    function leaf(start,end,width,thickness,bend=.025,radial=8,steps=6) {
      const A=V(...start),B=V(...end),delta=B.clone().sub(A),side=V(delta.y,-delta.x,0).normalize(),rings=[];
      for(let i=0;i<=steps;i++) {const t=i===steps?1:i/(steps-1)*.95,q=A.clone().addScaledVector(delta,t);q.z+=Math.sin(Math.PI*t)*bend;
        const f=Math.pow(Math.sin(Math.PI*t),.52)*(1-.20*t),w=Math.max(.0015,width*f),d=Math.max(.001,thickness*Math.pow(Math.sin(Math.PI*t),.65));rings.push([q.x,q.y,q.z,w,d]);}
      return loft(rings,side,radial);
    }
    function mirror(a) {
      const p=a.attributes.position,n=a.attributes.normal;
      for(let i=0;i<p.count;i++){p.setX(i,-p.getX(i));if(n)n.setX(i,-n.getX(i));}
      if(a.index){const x=a.index.array;for(let i=0;i<x.length;i+=3){const t=x[i+1];x[i+1]=x[i+2];x[i+2]=t;}}
      else for(let i=0;i<p.count;i+=3)for(const att of Object.values(a.attributes)){for(let k=0;k<att.itemSize;k++){const ar=att.array,t=ar[(i+1)*att.itemSize+k];ar[(i+1)*att.itemSize+k]=ar[(i+2)*att.itemSize+k];ar[(i+2)*att.itemSize+k]=t;}}
      return a;
    }
    part('plinth',[roundedTier(.94,.94,.12,0,.10),roundedTier(.84,.84,.10,.12,.075)],stone);
    part('pedestal',[roundedTier(.7,.7,.52,.22,.035)],stone);
    part('capstone',[roundedTier(.90,.90,.12,.74,.065),roundedTier(.75,.75,.065,.86,.035)],stone);
    const pillarGeo=[],goldGeo=[],inlayGeo=[];
    if(STAGE>=2) for(const x of [-.34,.34]) for(const z of [-.34,.34]) {
      pillarGeo.push(transform(roundedTier(.125,.125,.48,.255,.018),[x,0,z]),transform(roundedTier(.165,.165,.055,.225,.02),[x,0,z]),transform(roundedTier(.17,.17,.07,.68,.018),[x,0,z]));
      goldGeo.push(box(.132,.033,.132,x,.728,z),box(.112,.018,.112,x,.865,z));
      if(STAGE>=3)goldGeo.push(transform(new THREE.ConeGeometry(.073,.118,4),[x,.935,z],null,[0,Math.PI/4,0]));
      inlayGeo.push(box(.034,.31,.006,x,.463,z+.066));
    }
    if(STAGE>=2) {
      const plaque=new THREE.Shape();plaque.moveTo(-.24,.28);plaque.lineTo(.24,.28);plaque.lineTo(.24,.51);plaque.quadraticCurveTo(.23,.67,0,.67);plaque.quadraticCurveTo(-.23,.67,-.24,.51);plaque.closePath();
      inlayGeo.push(extrusion(plaque,.012,.353));
      goldGeo.push(tube([[-.258,.28,.371],[-.258,.51,.371],[-.20,.65,.371],[0,.695,.371],[.20,.65,.371],[.258,.51,.371],[.258,.28,.371]],.012,22,6));
      for(const x of [-.34,.34]) goldGeo.push(tube([[x-.035,.315,.435],[x,.285,.435],[x+.035,.315,.435]],.007,4,5));
    }
    part('pillars',pillarGeo,stone);part('pedestal-gold',goldGeo,gold);part('inlays',inlayGeo,navy);
    if(STAGE>=2) {
      // Explicit crescent contour avoids a solid disk and opens toward the star (+X).
      const c=new THREE.Shape();c.moveTo(.065,.627);c.bezierCurveTo(-.155,.68,-.235,.428,-.055,.344);c.bezierCurveTo(.011,.314,.098,.352,.12,.406);c.bezierCurveTo(.024,.338,-.087,.416,-.09,.502);c.bezierCurveTo(-.094,.565,-.035,.617,.065,.627);c.closePath();
      const star=new THREE.Shape();star.moveTo(.052,.572);star.lineTo(.073,.51);star.lineTo(.135,.489);star.lineTo(.073,.468);star.lineTo(.052,.406);star.lineTo(.031,.468);star.lineTo(-.031,.489);star.lineTo(.031,.51);star.closePath();
      part('emblem',[extrusion(c,.015,.377),extrusion(star,.021,.38)],gold);
    }
    const rock=new THREE.SphereGeometry(1,10,5);const rp=rock.attributes.position;
    for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),s=1+.06*Math.sin(x*9+z*5);rp.setXYZ(i,x*.285*s,Math.max(-.09,y*.13),z*.235*s);}rock.computeVertexNormals();rock.translate(0,.981,0);
    part('rock',[rock],stone);
    const feet=[];
    for(const x of [-.13,.13]) {
      feet.push(tube([[x,1.30,-.012],[x,1.19,.014],[x,1.105,.053]],.025,5,7));
      if(STAGE>=2)for(const spread of [-1,0,1])feet.push(tube([[x,1.11,.049],[x+spread*.036,1.085,.12],[x+spread*.06,1.075,.186]],.016,5,6));
      if(STAGE>=3)feet.push(tube([[x,1.105,.035],[x+.009,1.082,-.04],[x+.013,1.076,-.08]],.013,4,5));
    }
    part('feet',feet,gold);
    // The head, neck and breast are ONE continuous radial loft, not stacked ellipsoids.
    const bodyControls=[
      [0,1.255,-.033,.055,.075],[0,1.31,-.012,.16,.16],[0,1.40,.006,.242,.218],
      [0,1.52,.032,.276,.244],[0,1.65,.05,.267,.23],[0,1.76,.064,.225,.195],
      [0,1.86,.092,.156,.158],[0,1.96,.12,.12,.133],[0,2.06,.137,.115,.135],
      [0,2.15,.151,.132,.143],[0,2.23,.163,.142,.142],[0,2.30,.159,.125,.126],
      [0,2.347,.15,.084,.088],[0,2.367,.143,.008,.012]
    ];
    const bodyRings=[];
    for(let k=0;k<bodyControls.length-1;k++) {
      const steps=STAGE>=3?3:2;
      for(let j=0;j<steps;j++) {const t=j/steps,a=bodyControls[Math.max(0,k-1)],b=bodyControls[k],c=bodyControls[k+1],d=bodyControls[Math.min(bodyControls.length-1,k+2)],r=[];
        for(let f=0;f<5;f++)r.push(.5*((2*b[f])+(-a[f]+c[f])*t+(2*a[f]-5*b[f]+4*c[f]-d[f])*t*t+(-a[f]+3*b[f]-3*c[f]+d[f])*t*t*t));bodyRings.push(r);}
    }
    bodyRings.push(bodyControls.at(-1));
    const bodyGeometry=[loft(bodyRings,V(1,0,0),STAGE>=3?20:16)];
    if(STAGE>=3) {
      function breastSurface(x,y) {
        let k=0;while(k<bodyRings.length-2&&bodyRings[k+1][1]<y)k++;
        const a=bodyRings[k],b=bodyRings[k+1],t=Math.max(0,Math.min(1,(y-a[1])/(b[1]-a[1]))),w=a[3]+(b[3]-a[3])*t,d=a[4]+(b[4]-a[4])*t,z=a[2]+(b[2]-a[2])*t;
        return z+d*Math.sqrt(Math.max(0,1-x*x/(w*w)));
      }
      for(const [x,y,length,width] of [[0,1.91,.20,.047],[-.085,1.79,.22,.055],[.085,1.79,.22,.055],[0,1.69,.25,.066],[-.13,1.57,.19,.055],[.13,1.57,.19,.055],[0,2.085,.15,.041]]) {
        const rings=[];
        for(let j=0;j<=5;j++){const t=j/5,yy=y-length*t,f=Math.pow(Math.sin(t*Math.PI),.7);rings.push([x,yy,breastSurface(x,yy)-.004,Math.max(.001,width*f),Math.max(.001,.014*f)]);}
        bodyGeometry.push(loft(rings,V(1,0,0),6));
      }
    }
    part('bird-body',bodyGeometry,bird);
    // Arched scapular wing mass plus individually tapering flight feathers.
    // Local coordinates are authored once; reflection negates only X and reverses winding.
    const wingCore=[
      [.20,1.68,-.006,.095,.065],[.34,1.78,-.002,.15,.075],[.49,1.96,-.02,.145,.065],
      [.62,2.015,-.044,.13,.057],[.75,1.91,-.065,.12,.05],[.90,1.70,-.085,.095,.039],[1.015,1.53,-.12,.007,.008]
    ];
    const wingRings=[];
    for(let k=0;k<wingCore.length-1;k++)for(let j=0;j<3;j++) {
      const t=j/3,a=wingCore[Math.max(0,k-1)],b=wingCore[k],c=wingCore[k+1],d=wingCore[Math.min(wingCore.length-1,k+2)],r=[];
      for(let f=0;f<5;f++)r.push(.5*((2*b[f])+(-a[f]+c[f])*t+(2*a[f]-5*b[f]+4*c[f]-d[f])*t*t+(-a[f]+3*b[f]-3*c[f]+d[f])*t*t*t));wingRings.push(r);
    }
    wingRings.push(wingCore.at(-1));
    for(const sign of [1,-1]) {
      const core=loft(wingRings,V(0,1,0),10);
      if(sign<0)mirror(core);
      part(sign>0?'wing-l':'wing-r',[core],bird);
      const fs=[];
      if(STAGE>=2) {
        // Long primaries fan from curved front shoulder toward a falling outer edge.
        for(let i=0;i<9;i++) {
          const t=i/8;
          const start=[.31+.44*t,1.77+.24*Math.sin(t*Math.PI*.78),.01-.075*t];
          const end=[.42+.61*t,1.40+.16*Math.sin(t*Math.PI)-.015*t,-.065-.05*t];
          fs.push(leaf(start,end,.078-.017*t,.026,.025,6,5));
        }
        if(STAGE>=3) {
          for(let row=0;row<2;row++)for(let i=0;i<7;i++) {
            const t=i/6,x=.29+.48*t,y=1.77+.23*Math.sin(t*Math.PI*.76)-row*.085,z=.071-row*.012-.08*t;
            fs.push(leaf([x,y+.045,z],[x+.07,y-.15-row*.012,z+.009],.064-row*.008,.018,.009,6,4));
          }
        }
      }
      if(sign<0)for(const a of fs)mirror(a);
      part(sign>0?'wing-feathers-l':'wing-feathers-r',fs,feather);
    }
    if(STAGE>=3) {
      const trims=[];
      for(const s of [-1,1])trims.push(tube([[s*.63,2.026,.025],[s*.75,1.916,.018],[s*.9,1.713,.006],[s*1.01,1.55,-.02]],.012,12,5));
      part('wing-trim',trims,gold);
      const strips=[];
      for(const s of [-1,1]) {const a=leaf([.76,1.89,.025],[1.02,1.49,-.055],.025,.008,.015,6,5);if(s<0)mirror(a);strips.push(a);}
      part('wing-navy',strips,navy);
    }
    const tail=[];
    for(let i=0;i<(STAGE>=2?5:3);i++) {const t=i-(STAGE>=2?2:1);tail.push(leaf([t*.033,1.40,-.11],[t*.056,1.16-Math.abs(t)*.014,-.43-Math.abs(t)*.013],.051,.024,-.018,6,5));}
    part('tail',tail,feather);
    const beakRings=[
      [0,2.211,.268,.068,.048],[0,2.221,.31,.075,.049],[0,2.224,.376,.066,.04],
      [0,2.217,.443,.052,.036],[0,2.197,.496,.031,.033],[0,2.169,.516,.009,.016],[0,2.161,.512,.001,.001]
    ];
    const beaks=[loft(beakRings,V(1,0,0),10)];
    if(STAGE>=2)beaks.push(loft([[0,2.181,.272,.058,.02],[0,2.182,.345,.064,.023],[0,2.174,.424,.037,.016],[0,2.165,.481,.002,.001]],V(1,0,0),8));
    part('beak',beaks,gold);
    if(STAGE>=2)part('eyes',[ellipse(.009,.015,.015,.132,2.26,.19),ellipse(.009,.015,.015,-.132,2.26,.19)],eye);
    dressLandmark(THREE,kit,g,[],[[-.34,.24,.31],[-.25,.25,.35],[.31,.24,-.32],[.23,.25,-.35]]);
    return g;
  };

  // well — meters; origin at ground, entrance toward +Z.
  I.LMMODELS['well']=function(THREE,kit){ kit=finishKit(THREE,kit);
 const g=new THREE.Group(),STAGE=7,batches=new Map();
 const mats={stone:kit.mat('#efe3d1',{roughness:.88},'stone'),accent:kit.mat('#d8cfce',{roughness:.9},'stone'),wood:kit.mat('#cda67e',{roughness:.8},'wood'),roof:kit.mat('#ad9abd',{roughness:.63},'roof'),blue:kit.mat('#b7a4c7',{roughness:.64},'roof'),gold:kit.mat('#e8c48b',{roughness:.4,metalness:0.6},'metal'),rope:kit.mat('#e3d2b6',{roughness:.92}),inner:kit.mat('#777a98',{roughness:.93},'stone'),darkwood:kit.mat('#947b7b',{roughness:.8},'wood')};
 function add(geo,mat,name,p=[0,0,0],r=[0,0,0]){const m=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(1,1,1));geo.applyMatrix4(m);const k=name+'|'+mat;if(!batches.has(k))batches.set(k,{name,mat,geos:[]});batches.get(k).geos.push(geo);}
 function box(w,h,d,p,mat='wood',name='timber-frame',r=[0,0,0]){add(new THREE.BoxGeometry(w,h,d),mat,name,p,r);}
 function beam(a,b,w,d,mat='wood',name='timber-frame'){const v=new THREE.Vector3().fromArray(b).sub(new THREE.Vector3().fromArray(a)),geo=new THREE.BoxGeometry(w,v.length(),d);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);add(geo,mat,name);}
 function cyl(rt,rb,h,p,mat,name,r=[0,0,0],n=16,open=false){const geo=new THREE.CylinderGeometry(rt,rb,h,n,1,open);if(name==='well-interior'&&open){geo.scale(-1,1,1);geo.computeVertexNormals();}add(geo,mat,name,p,r);}
 function tor(rad,tube,p,mat,name,r=[0,0,0],arc=Math.PI*2){add(new THREE.TorusGeometry(rad,tube,5,24,arc),mat,name,p,r);}
 function sector(ro,ri,y,h,a,b){const s=new THREE.Shape();s.absarc(0,0,ro,a,b,false);s.lineTo(ri*Math.cos(b),ri*Math.sin(b));s.absarc(0,0,ri,b,a,true);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:h,steps:1,curveSegments:3,bevelEnabled:STAGE>=2,bevelSegments:1,bevelSize:.006,bevelThickness:.006});geo.rotateX(-Math.PI/2);geo.translate(0,y,0);return geo;}
 for(let row=0;row<3;row++){const n=14;for(let i=0;i<n;i++){const a=(i+(row%2)*.5)*Math.PI*2/n+.009,b=a+Math.PI*2/n-.018;add(sector(row===2?.735:.69,.465,row*.205+.008,.196,a,b),STAGE>=3&&(i+row*3)%5===0?'accent':'stone','stone-ring');}}
 cyl(.450,.450,.54,[0,.30,0],'inner','well-interior',[0,0,0],28,true);cyl(.45,.45,.025,[0,.035,0],'inner','well-interior',[0,0,0],28);
 // Bore the timber uprights, then fit the bronze bearing sleeves into those bores.
function annulus(ro,ri,h,p,mat,name,r=[0,0,0],n=16){add(new THREE.LatheGeometry([[ri,-h/2],[ro,-h/2],[ro,h/2],[ri,h/2],[ri,-h/2]].map(v=>new THREE.Vector2(...v)),n),mat,name,p,r);}
for(const x of [-.48,.48]){const s=new THREE.Shape();s.moveTo(-.11,-.65);s.lineTo(.11,-.65);s.lineTo(.11,.65);s.lineTo(-.11,.65);s.closePath();const hole=new THREE.Path();hole.absarc(0,.15,.075,0,Math.PI*2,true);s.holes.push(hole);const post=new THREE.ExtrudeGeometry(s,{depth:.2,bevelEnabled:false,curveSegments:12,steps:1});post.translate(0,0,-.1);add(post,'wood','timber-frame',[x,1.28,0],[0,Math.PI/2,0]);box(.26,.12,.28,[x,.64,0],'stone','stone-ring');beam([x,1.62,0],[x>0?.24:-.24,1.94,0],.12,.16);box(.19,.12,.34,[x,1.93,0]);}
 box(1.19,.14,.2,[0,1.94,0]);
 const slope=Math.atan2(.48,.69),len=Math.hypot(.69,.48);
 for(const side of [-1,1]){
  if(STAGE<2)box(len,.065,1.00,[side*.345,2.18,0],'roof','roof-tiles',[0,0,-side*slope]);
  else for(let row=0;row<4;row++)for(let col=0;col<7;col++){const u=(row+.5)/4,x=side*u*.69,z=(col-3)*.137;box(len/4+.028,.045,.134,[x,2.42-u*.48+.004+(3-row)*.012, z],(row+col)%4===0?'blue':'roof','roof-tiles',[0,0,-side*slope]);}
  for(const z of [-.49,.49])beam([0,2.445,z],[side*.68,1.925,z],.07,.072,'wood','timber-frame');
  box(.075,.08,1.04,[side*.685,1.93,0],'wood','timber-frame');
 }
 if(STAGE>=1){
  // Axle, bored stave drum, flanges and two post bearings share one X axis.
  cyl(.036,.036,1.22,[.015,1.43,0],'gold','gold-hardware',[0,0,Math.PI/2],12);
  annulus(.096,.038,.50,[0,1.43,0],'darkwood','winch',[0,0,Math.PI/2],24);
  for(const x of [-.2675,.2675])annulus(.142,.038,.035,[x,1.43,0],'gold','gold-hardware',[0,0,Math.PI/2],20);
  for(const x of [-.48,.48]){
   annulus(.075,.037,.24,[x,1.43,0],'gold','gold-hardware',[0,0,Math.PI/2]);
   const outside=x+Math.sign(x)*.13;
   annulus(.09,.037,.025,[outside,1.43,0],'gold','gold-hardware',[0,0,Math.PI/2]);
   for(const dy of [-.11,.11]){box(.035,.04,.14,[x+Math.sign(x)*.11,1.43+dy,0],'gold','gold-hardware');cyl(.017,.017,.018,[x+Math.sign(x)*.135,1.43+dy,0],'darkwood','gold-hardware',[0,0,Math.PI/2],6);}
  }
  // Crank is keyed to the axle; its free grip rotates on a short end pin.
  cyl(.063,.063,.035,[.6425,1.43,0],'gold','gold-hardware',[0,0,Math.PI/2],12);
  box(.04,.245,.045,[.64,1.325,0],'gold','gold-hardware');
  cyl(.022,.022,.14,[.73,1.21,0],'gold','gold-hardware',[0,0,Math.PI/2],10);
  annulus(.038,.023,.12,[.73,1.21,0],'wood','winch',[0,0,Math.PI/2],12);
  // Eight contiguous turns leave the drum tangentially, then fall to the bail crown.
  const pts=[];for(let i=0;i<=128;i++){const t=i/128,a=Math.PI/2+t*Math.PI*16;pts.push(new THREE.Vector3(-.21+t*.42,1.43+.116*Math.cos(a),.116*Math.sin(a)));}
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),128,.020,5,false),'rope','rope');
  const drop=new THREE.CatmullRomCurve3([new THREE.Vector3(.21,1.43,.116),new THREE.Vector3(.215,1.38,.116),new THREE.Vector3(.215,1.17,.116),new THREE.Vector3(.215,1.054,.116)]);
  add(new THREE.TubeGeometry(drop,12,.020,5,false),'rope','rope');
  const bx=.215,bz=.116,by=.68;
  const bucketPts=[[0,0],[.10,0],[.126,.235],[.112,.235],[.088,.028],[0,.028]].map(v=>new THREE.Vector2(...v));
  add(new THREE.LatheGeometry(bucketPts,18),'wood','bucket',[bx,by,bz]);
  for(const h of [.043,.190]){const r=.10+.026*h/.235;annulus(r+.012,r,.022,[bx,by+h,bz],'gold','gold-hardware',[0,0,0],18);}
  // Twelve slender seams follow the tapered bucket wall, ending under its hoops.
  for(let i=0;i<12;i++){const a=i*Math.PI/6;beam([bx+.106*Math.cos(a),by+.054,bz+.106*Math.sin(a)],[bx+.12*Math.cos(a),by+.18,bz+.12*Math.sin(a)],.004,.004,'darkwood','bucket');}
  tor(.126,.013,[bx,by+.235,bz],'gold','gold-hardware',[0,0,0],Math.PI);
  for(const s of [-1,1])cyl(.018,.018,.018,[bx+s*.126,by+.235,bz],'gold','gold-hardware',[0,0,Math.PI/2],8);
 }
 if(STAGE>=2){box(.065,.06,1.05,[0,2.465,0],'gold','gold-hardware');for(const z of [-.49,.49]){cyl(.058,.07,.05,[0,2.49,z],'gold','gold-hardware',[0,0,0],4);add(new THREE.OctahedronGeometry(.065,0),'gold','gold-hardware',[0,2.53,z]);}for(const x of [-.58,.58])for(const z of [-.49,.49])box(.1,.09,.08,[x,2.01,z],'gold','gold-hardware');}
 for(const {name,mat,geos} of batches.values()){let size=0;const list=geos.map(geo=>{const n=geo.index?geo.toNonIndexed():geo;size+=n.attributes.position.array.length;return n;});const pos=new Float32Array(size),normal=new Float32Array(size);let at=0;for(const geo of list){pos.set(geo.attributes.position.array,at);normal.set(geo.attributes.normal.array,at);at+=geo.attributes.position.array.length;}for(let i=1;i<pos.length;i+=3)if(pos[i]>.615)pos[i]=.615+(pos[i]-.615)*.70;const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.BufferAttribute(pos,3));merged.setAttribute('normal',new THREE.BufferAttribute(normal,3));merged.computeVertexNormals();const mesh=new THREE.Mesh(merged,mats[mat]);mesh.name=name+(mat==='blue'?'-blue':'');mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);}
 dressLandmark(THREE,kit,g,[[[-.50,.64,.10],[-.54,.96,.12],[-.49,1.18,.13]],[[.52,.63,-.09],[.55,.84,-.08],[.50,.99,-.08]]],[[-.52,.86,.16],[.51,.78,-.05]]);
 return finishTimbers(THREE,g);
};

  // signpost — meters; origin at ground, entrance toward +Z.
  I.LMMODELS['signpost']=function(THREE,kit){ kit=finishKit(THREE,kit);
 const g=new THREE.Group(),STAGE=7,batches=new Map(),mats={stone:kit.mat('#efe3d1',{roughness:.87},'stone'),wood:kit.mat('#cda67e',{roughness:.8},'wood'),light:kit.mat('#d7b38c',{roughness:.8},'wood'),blue:kit.mat('#ad9abd',{roughness:.63},'roof'),gold:kit.mat('#e8c48b',{roughness:.4,metalness:0.6},'metal')};
 function add(geo,mat,name,p=[0,0,0],r=[0,0,0]){geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(1,1,1)));const k=name+'|'+mat;if(!batches.has(k))batches.set(k,{name,mat,geos:[]});batches.get(k).geos.push(geo);}
 function cube(w,h,d,p,mat,name){if(STAGE<2){add(new THREE.BoxGeometry(w,h,d),mat,name,p);return;}const s=new THREE.Shape(),b=Math.min(.014,w*.08,h*.08,d*.2),x=w/2-b,y=h/2-b;s.moveTo(-x+b,-y);s.lineTo(x-b,-y);s.lineTo(x,-y+b);s.lineTo(x,y-b);s.lineTo(x-b,y);s.lineTo(-x+b,y);s.lineTo(-x,y-b);s.lineTo(-x,-y+b);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelSegments:1,bevelSize:b,bevelThickness:b,steps:1});geo.translate(0,0,-d/2+b);add(geo,mat,name,p);}
 cube(.48,.17,.48,[0,.085,0],'stone','stone-base');cube(.37,.08,.37,[0,.21,0],'stone','stone-base');cube(.29,.26,.29,[0,.37,0],'stone','stone-base');cube(.34,.065,.34,[0,.52,0],'stone','stone-base');
 cube(.18,1.52,.18,[0,1.3,0],'wood','wood-post');
 function arrow(name,length,y,dir,z,angle=0){const sh=new THREE.Shape(),h=.22;sh.moveTo(-.08,-h/2);sh.lineTo(length-.19,-h/2);sh.lineTo(length,.0);sh.lineTo(length-.19,h/2);sh.lineTo(-.08,h/2);sh.closePath();function shapeGeo(scale,depth){const gg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:STAGE>=2,bevelSize:.008,bevelThickness:.006,bevelSegments:1,steps:1});gg.translate(0,0,-depth/2);if(scale!==1)gg.scale(scale,scale,1);return gg;}const rot=[0,angle,dir<0?Math.PI:0];add(shapeGeo(1,.055),'blue','blue-borders',[0,y,z],rot);const face=shapeGeo(.90,.062);add(face,'wood',name,[dir>0?.005:-.005,y,z+.001],rot);
 if(STAGE>=2){for(const yy of [-.069,.069]){const geo=new THREE.BoxGeometry(length*.63,.012,.008);geo.translate(length*.40,yy,.039);add(geo,'light',name,[0,y,z],rot);}}
 }
 arrow('arrow-east',.84,1.64,1,.106);arrow('arrow-west',.83,1.94,-1,.108);arrow('arrow-forward',.76,1.26,1,.028,-1.45);
 if(STAGE>=1){
  for(const y of [1.25,1.64,1.94])cube(.23,.26,.07,[0,y,.14],'gold','gold-fittings');
  cube(.24,.075,.24,[0,2.06,0],'gold','gold-fittings');cube(.35,.03,.35,[0,.525,0],'gold','gold-fittings');
  for(const y of [1.25,1.64,1.94]){const ball=new THREE.SphereGeometry(.026,8,5);add(ball,'gold','gold-fittings',[0,y,.19]);}
  const star=new THREE.Shape();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2===0?.12:.036,x=Math.sin(a)*r,y=Math.cos(a)*r*(i%4===0?1.35:1);i?star.lineTo(x,y):star.moveTo(x,y);}star.closePath();const geo=new THREE.ExtrudeGeometry(star,{depth:.035,bevelEnabled:true,bevelSize:.009,bevelThickness:.012,bevelSegments:1,steps:1});geo.translate(0,0,-.0175);add(geo,'gold','star-finial',[0,2.22,0]);
  if(STAGE>=2){for(const z of [-.15,.15])cube(.18,.16,.012,[0,.37,z],'blue','blue-borders');}
 }
 for(const {name,mat,geos}of batches.values()){let size=0;const list=geos.map(x=>{const n=x.index?x.toNonIndexed():x;size+=n.attributes.position.array.length;return n;});const p=new Float32Array(size),n=new Float32Array(size);let at=0;for(const geo of list){p.set(geo.attributes.position.array,at);n.set(geo.attributes.normal.array,at);at+=geo.attributes.position.array.length;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setAttribute('normal',new THREE.BufferAttribute(n,3));const mesh=new THREE.Mesh(geo,mats[mat]);mesh.name=name+(mat==='light'?'-grain':'');mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);}
 g.userData.sign=[.38,1.64,.195];return finishTimbers(THREE,g);
};

})(typeof window !== 'undefined' ? window : globalThis);
