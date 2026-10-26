/* 潮汐小島 · 程式化模型（img2threejs 重建）：水晶地燈、貨箱組與白藍小木船。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.PROPMODELS = I.PROPMODELS || {};

  // Bake static pieces by shared material before props.js handles scene-level
  // instances. Keep attachment objects and assembly groups at their old roots.
  // The local paint pass retains each kit kind and its seasonal/bend hooks, but
  // uses geometry and quiet procedural grain instead of photographic detail.
  function finishPainted(THREE, group) {
    group.updateMatrixWorld(true);
    const batches = new Map(), removed = [], geometries = new Set(), inv = group.matrixWorld.clone().invert();
    group.traverse(o => {
      if (!o.isMesh) return;
      const source = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      if (!source.attributes.normal) source.computeVertexNormals();
      let batch = batches.get(o.material);
      if (!batch) batches.set(o.material, batch = { name: o.name, positions: [], normals: [] });
      for (let i = 0; i < (o.isInstancedMesh ? o.count : 1); i++) {
        const matrix = new THREE.Matrix4();
        if (o.isInstancedMesh) o.getMatrixAt(i, matrix);
        matrix.premultiply(o.matrixWorld).premultiply(inv);
        const geo = source.clone().applyMatrix4(matrix);
        batch.positions.push(...geo.attributes.position.array); batch.normals.push(...geo.attributes.normal.array); geo.dispose();
      }
      if (source !== o.geometry) source.dispose();
      removed.push(o); geometries.add(o.geometry);
    });
    removed.forEach(o => o.parent.remove(o)); geometries.forEach(g => g.dispose());
    for (const [material, batch] of batches) {
      if (material.userData.kind === 'wall' || material.userData.kind === 'stone') {
        const compile = material.onBeforeCompile, cache = material.customProgramCacheKey.bind(material);
        material.onBeforeCompile = function(shader, renderer) {
          compile.call(this, shader, renderer);
          shader.fragmentShader = shader.fragmentShader
            .replace(/triD\(uD\d, qd?, gB\)/g, 'vec3(0.5)')
            .replace(/triN\(uN\d, qd?, gB\)/g, 'vec3(0.0)');
        };
        material.customProgramCacheKey = () => cache() + '-painted-prop';
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material); mesh.name = batch.name;
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    }
    return group;
  }

  I.PROPMODELS['crystal_lamp'] = function (THREE, kit) {
    const root = new THREE.Group();
    root.name = 'crystal_lamp';
    const stone = kit.mat('#F1E4D1', { roughness: 0.84 }, 'stone');
    const blue = kit.mat('#CDA67E', { roughness:.8 }, 'wood');
    const gold = kit.mat('#E8C48B', { roughness: .4, metalness: 0.6 },'metal');
    const crystal = kit.mat('#BCA6CB', { roughness: 0.32, metalness: 0.03, emissive: '#D5BEDD', emissiveIntensity: 0.24 });
    const crystalLight = kit.mat('#F3BDD2', { roughness: 0.30, metalness: 0.02, emissive: '#FFD39D', emissiveIntensity: 0.18 });
    const buckets = new Map();
    function put(name, mat, geo, x, y, z, ry) {
      geo.rotateY(ry || 0); geo.translate(x || 0, y || 0, z || 0);
      const g = geo.index ? geo.toNonIndexed() : geo;
      let b = buckets.get(mat);
      if (!b) { b = { name, mat: mat, positions: [] }; buckets.set(mat, b); }
      b.positions.push.apply(b.positions, g.attributes.position.array);
      if (g !== geo) g.dispose(); geo.dispose();
    }
    function chamfer(w, h, d, y, bevel, topScale) {
      const positions = [], rings = [], b = bevel || 0.005, scale = topScale || 1;
      function ring(yy, xx, zz, inset) {
        const q = Math.min(b, xx * 0.18, zz * 0.18), x = xx - inset, z = zz - inset;
        return [[-x+q,yy,-z],[x-q,yy,-z],[x,yy,-z+q],[x,yy,z-q],[x-q,yy,z],[-x+q,yy,z],[-x,yy,z-q],[-x,yy,-z+q]];
      }
      rings.push(ring(y,w/2,d/2,b),ring(y+b,w/2,d/2,0),ring(y+h-b,w*scale/2,d*scale/2,0),ring(y+h,w*scale/2,d*scale/2,b));
      function tri(a,b,c) { positions.push.apply(positions,a.concat(b,c)); }
      for(let r=0;r<3;r++) for(let j=0;j<8;j++){const n=(j+1)%8;tri(rings[r][j],rings[r+1][j],rings[r+1][n]);tri(rings[r][j],rings[r+1][n],rings[r][n]);}
      for(let j=0;j<8;j++){const n=(j+1)%8;tri([0,y,0],rings[0][j],rings[0][n]);tri([0,y+h,0],rings[3][n],rings[3][j]);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return g;
    }
    function profile(points, depth, bevel) {
      const s=new THREE.Shape();s.moveTo(points[0][0],points[0][1]);for(let j=1;j<points.length;j++)s.lineTo(points[j][0],points[j][1]);s.closePath();
      return new THREE.ExtrudeGeometry(s,{depth:depth,bevelEnabled:!!bevel,bevelThickness:bevel||0,bevelSize:bevel||0,bevelSegments:1,steps:1,curveSegments:8});
    }
    put('base',stone,chamfer(.32,.065,.32,0,.006));
    put('base',stone,chamfer(.277,.039,.277,.06,.005));
    put('pillar',blue,chamfer(.242,.255,.242,.085,.006,.86));
    put('capital',stone,chamfer(.286,.045,.286,.325,.005));
    put('capital',stone,chamfer(.239,.036,.239,.366,.004));
    put('capital',stone,chamfer(.242,.025,.242,.437,.004));
    put('capital',stone,chamfer(.277,.03,.277,.457,.005));
    put('panels',blue,chamfer(.231,.043,.231,.398,.002));
    const outer=[[-.069,0],[.069,0],[.069,.123],[.06,.143],[.04,.162],[0,.178],[-.04,.162],[-.06,.143],[-.069,.123]];
    const inner=outer.map(p=>[p[0]*.85,p[1]*.91+.005]);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2, z=.115, x=Math.sin(a)*z, zz=Math.cos(a)*z;
      put('emblems',gold,profile(outer,.006,.0015),x,.126,zz,a);
      put('panels',blue,profile(inner,.007,0),Math.sin(a)*.121,.129,Math.cos(a)*.121,a);
      const crescent=[];
      for(let j=0;j<=15;j++){const t=.24*Math.PI+j/15*1.52*Math.PI;crescent.push([-.008+Math.cos(t)*.036,.215+Math.sin(t)*.046]);}
      for(let j=15;j>=0;j--){const t=.22*Math.PI+j/15*1.56*Math.PI;crescent.push([.002+Math.cos(t)*.026,.217+Math.sin(t)*.034]);}
      put('emblems',gold,profile(crescent,.004,0),Math.sin(a)*.131,0,Math.cos(a)*.131,a);
      const star=[[0,.021],[.006,.006],[.021,0],[.006,-.006],[0,-.021],[-.006,-.006],[-.021,0],[-.006,.006]];
      put('emblems',gold,profile(star,.005,.0008),Math.sin(a)*.133+.012*Math.cos(a),.217,Math.cos(a)*.133-.012*Math.sin(a),a);
      const jewel=[[0,.02],[.011,0],[0,-.02],[-.011,0]];
      put('emblems',gold,profile(jewel,.005,.001),Math.sin(a)*.118,.419,Math.cos(a)*.118,a);
    }
    put('cup',gold,new THREE.CylinderGeometry(.112,.106,.032,12),0,.5,0);
    const ring=new THREE.TorusGeometry(.106,.008,4,12);ring.rotateX(Math.PI/2);put('cup',gold,ring,0,.518,0);
    const claw=[[-.018,0],[.018,0],[.022,.047],[.043,.104],[0,.171],[-.039,.104],[-.015,.053]];
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      put('claws',gold,profile(claw,.025,.003),Math.sin(a)*.103,.504,Math.cos(a)*.103,a);
    }
    // Two palette groups preserve large crystal facets without transparency sorting.
    const rr=[{y:.505,r:.073},{y:.55,r:.103},{y:.727,r:.108},{y:.80,r:.069},{y:.90,r:0}], dark=[], light=[];
    function facet(dst,a,b,c){dst.push.apply(dst,a.concat(c,b));}
    function p(r,j){const a=j/6*Math.PI*2+Math.PI/6;return [Math.sin(a)*r.r,r.y,Math.cos(a)*r.r];}
    for(let k=0;k<rr.length-1;k++)for(let j=0;j<6;j++){
      const n=(j+1)%6, dst=(j===0||j===4||(j+k)%5===0)?light:dark;
      if(rr[k+1].r===0)facet(dst,p(rr[k],j),p(rr[k+1],j),p(rr[k],n));
      else {
        facet(dst,p(rr[k],j),p(rr[k+1],j),p(rr[k+1],n));
        facet(dst,p(rr[k],j),p(rr[k+1],n),p(rr[k],n));
      }
    }
    for(let j=0;j<6;j++)facet(dark,[0,.505,0],p(rr[0],(j+1)%6),p(rr[0],j));
    for(const item of [['crystal',crystal,dark],['crystal-facets',crystalLight,light]]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(item[2],3));put(item[0],item[1],g);}
    for(const b of buckets.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));g.computeVertexNormals();const m=new THREE.Mesh(g,b.mat);m.name=b.name;m.castShadow=true;m.receiveShadow=true;root.add(m);}
    const socket=new THREE.Object3D();socket.name='crystal-glow-socket';socket.position.set(0,.66,0);root.add(socket);
    return finishPainted(THREE, root);
  };

  I.PROPMODELS['crates'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'cargo-crates';
    const wood = kit.mat('#B98E6B', { roughness:.8 }, 'wood');
    const frame = kit.mat('#CDA67E', { roughness:.8 }, 'wood');
    const darkWood = wood;
    const iron = kit.mat('#9186A8', { roughness: .65, metalness: .22 });
    const gold = kit.mat('#E8C48B', { roughness: .4, metalness: 0.6 },'metal');
    const cloth = kit.mat('#F1E4D1', { roughness: 1 }, 'fabric');
    cloth.side = THREE.DoubleSide;
    const rope = frame;
    function merged(parts) {
      const arrays = { position: [], normal: [], uv: [] };
      parts.forEach(source => {
        const geo = source.index ? source.toNonIndexed() : source;
        for (const key of Object.keys(arrays)) {
          const attribute = geo.getAttribute(key);
          if (attribute) arrays[key].push(...attribute.array);
        }
        if (geo !== source) geo.dispose(); source.dispose();
      });
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(arrays.position, 3));
      out.setAttribute('normal', new THREE.Float32BufferAttribute(arrays.normal, 3));
      out.setAttribute('uv', new THREE.Float32BufferAttribute(arrays.uv, 2));
      return out;
    }
    function box(w,h,d,x,y,z,rz) {
      const geo = new THREE.BoxGeometry(w,h,d);
      if (rz) geo.rotateZ(rz); geo.translate(x,y,z); return geo;
    }
    function add(parent,geometry,name,material) {
      const mesh = new THREE.Mesh(geometry,material||wood); mesh.name=name;
      mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
    }
    function group(name,x,y,z) {
      const root=new THREE.Group();root.name=name;root.position.set(x,y,z);g.add(root);return root;
    }
    function rail(w,h,d,x,y,z,rz) { return { w,h,d,x,y,z,rz:rz||0 }; }
    function frameInstances(parent,parts,name) {
      const outline=new THREE.Shape();outline.moveTo(-.45,-.45);outline.lineTo(.45,-.45);outline.lineTo(.45,.45);outline.lineTo(-.45,.45);outline.closePath();
      const geometry=new THREE.ExtrudeGeometry(outline,{depth:.9,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:1,steps:1});geometry.translate(0,0,-.45);
      const mesh=new THREE.InstancedMesh(geometry,frame,parts.length);
      const transform=new THREE.Object3D();
      parts.forEach((p,i)=>{transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,0,p.rz);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});
      mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    }
    function crate(name,w,h,d,x,z) {
      const root=group(name,x,0,z),panels=[],rails=[];
      const rows=4;
      for(let i=0;i<rows;i++) {
        const y=.07+(h-.14)*(i+.5)/rows,ph=(h-.14)/rows-.008;
        for(const sign of [-1,1]) {
          panels.push(box(w-.12,ph,.025,0,y,sign*(d/2-.018)));
          panels.push(box(.025,ph,d-.12,sign*(w/2-.018),y,0));
        }
      }
      for(let i=0;i<4;i++) panels.push(box((w-.12)/4-.007,.025,d-.12,(i-1.5)*(w-.12)/4,h-.025,0));
      panels.push(box(w-.1,.025,d-.1,0,.025,0));
      for(const sx of [-1,1]) for(const sz of [-1,1]) rails.push(rail(.078,h,.078,sx*(w/2-.039),h/2,sz*(d/2-.039)));
      for(const y of [.045,h-.045]) for(const sign of [-1,1]) {
        rails.push(rail(w-.156,.09,.065,0,y,sign*(d/2-.039)));
        rails.push(rail(.065,.09,d-.156,sign*(w/2-.039),y,0));
      }
      const dx=w-.15,dy=h-.15;
      for(const sz of [-1,1]) rails.push(rail(Math.hypot(dx,dy),.065,.035,0,h/2,sz*(d/2+.0175),-Math.atan2(dy,dx)));
      add(root,merged(panels),name+'-panels');frameInstances(root,rails,name+'-frames');
      const fasteners=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.024,0),gold,8),transform=new THREE.Object3D();let instance=0;
      for(const sx of [-1,1])for(const y of [.05,h-.05])for(const sz of [-1,1]){
        transform.position.set(sx*(w/2-.039),y,sz*(d/2+.006));transform.scale.set(.72,1.1,.28);transform.updateMatrix();fasteners.setMatrixAt(instance++,transform.matrix);
      }
      fasteners.name=name+'-caps';fasteners.castShadow=true;root.add(fasteners);
    }
    crate('crate-large',.68,.91,.57,-.31,-.17);
    crate('crate-small',.48,.48,.43,-.48,.28);
    const barrel=group('barrel',.44,0,-.105);
    const profile=[[0,0],[.22,0],[.245,.04],[.27,.2],[.285,.39],[.27,.61],[.235,.76],[0,.76]];
    const staveGeometry=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(p[0],p[1])),20).toNonIndexed(),staves=[[],[]];
    const positions=staveGeometry.getAttribute('position'),normals=staveGeometry.getAttribute('normal'),uvs=staveGeometry.getAttribute('uv');
    for(let i=0;i<positions.count;i+=3){
      const angle=Math.atan2(positions.getX(i)+positions.getX(i+1)+positions.getX(i+2),positions.getZ(i)+positions.getZ(i+1)+positions.getZ(i+2));
      const section=((Math.floor((angle+Math.PI)*20/(Math.PI*2))%20)+20)%20;
      const target=staves[section%4===0?1:0];
      for(let j=0;j<3;j++)target.push(positions.getX(i+j),positions.getY(i+j),positions.getZ(i+j),normals.getX(i+j),normals.getY(i+j),normals.getZ(i+j),uvs.getX(i+j),uvs.getY(i+j));
    }
    staves.forEach((values,index)=>{
      const p=[],n=[],uv=[];for(let i=0;i<values.length;i+=8){p.push(...values.slice(i,i+3));n.push(...values.slice(i+3,i+6));uv.push(...values.slice(i+6,i+8));}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      if(index) {
        const backing=new THREE.CylinderGeometry(.217,.217,.004,20);backing.translate(0,.760,0);
        add(barrel,merged([geometry,backing]),'barrel-stave-shade',darkWood);
      } else add(barrel,geometry,'barrel-staves',frame);
    });staveGeometry.dispose();
    const hoops=[];
    for(const [y,r]of [[.11,.259],[.39,.285],[.65,.259]]) {
      const ring=[[r-.004,y-.032],[r+.012,y-.028],[r+.012,y+.028],[r-.004,y+.032],[r-.004,y-.032]];
      hoops.push(new THREE.LatheGeometry(ring.map(p=>new THREE.Vector2(p[0],p[1])),20));
    }
    add(barrel,merged(hoops),'barrel-hoops',iron);
    // Four solid lid planks leave narrow visible seams above a dark wooden backing.
    const lidPlanks=[],lidRadius=.217;
    for(let board=0;board<4;board++) {
      const x0=-lidRadius+board*lidRadius/2+.0025,x1=-lidRadius+(board+1)*lidRadius/2-.0025;
      const outline=new THREE.Shape();
      for(let step=0;step<=10;step++) {
        const x=x0+(x1-x0)*step/10,z=Math.sqrt(Math.max(0,lidRadius*lidRadius-x*x));
        if(step===0)outline.moveTo(x,z);else outline.lineTo(x,z);
      }
      for(let step=10;step>=0;step--) {
        const x=x0+(x1-x0)*step/10,z=-Math.sqrt(Math.max(0,lidRadius*lidRadius-x*x));outline.lineTo(x,z);
      }
      outline.closePath();
      const plank=new THREE.ExtrudeGeometry(outline,{depth:.010,steps:1,bevelEnabled:false});
      plank.rotateX(-Math.PI/2);plank.translate(0,.763,0);lidPlanks.push(plank);
    }
    const lid=merged(lidPlanks);
    const rim=new THREE.LatheGeometry([[.219,.758],[.237,.758],[.237,.785],[.219,.785],[.219,.758]].map(p=>new THREE.Vector2(...p)),20);
    add(barrel,merged([lid,rim]),'barrel-lid',frame);
    const rivets=new THREE.InstancedMesh(new THREE.SphereGeometry(.0135,6,2),gold,24),rivetTransform=new THREE.Object3D();let rivet=0;
    for(const [y,r]of [[.11,.274],[.39,.3],[.65,.274]])for(let j=0;j<8;j++){
      const angle=j*Math.PI/4;rivetTransform.position.set(Math.sin(angle)*r,y,Math.cos(angle)*r);rivetTransform.scale.set(1,1,.5);rivetTransform.rotation.set(0,angle,0);rivetTransform.updateMatrix();rivets.setMatrixAt(rivet++,rivetTransform.matrix);
    }
    rivets.name='barrel-hoop-rivets';rivets.castShadow=true;barrel.add(rivets);
    function sack(name,x,z,scale) {
      const root=group(name,x,0,z);
      const geo=new THREE.LatheGeometry([[0,0],[.16,.006],[.205,.025],[.225,.10],[.217,.245],[.184,.36],[.12,.425],[.058,.466],[.065,.493],[.112,.56],[.128,.585]].map(p=>new THREE.Vector2(...p)),16);
      const attribute=geo.getAttribute('position');
      for(let i=0;i<attribute.count;i++){
        let x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i);const angle=Math.atan2(x,z),mouth=Math.max(0,(y-.49)/.095),body=Math.sin(Math.min(1,y/.47)*Math.PI);
        const folds=1+.055*Math.cos(5*angle+.5)*body+.13*Math.sin(5*angle+.7)*mouth;
        x*=folds;z*=folds;y+=.018*Math.sin(5*angle+.7)*mouth;
        x+=.012*Math.sin(y*7)*body;attribute.setXYZ(i,x*scale,y*scale,z*scale*.86);
      }
      geo.computeVertexNormals();add(root,geo,name+'-cloth',cloth);
      const loops=[];
      for(let i=0;i<=32;i++){const t=i/32,angle=t*Math.PI*4;loops.push(new THREE.Vector3(Math.sin(angle)*.063,.46+t*.02,Math.cos(angle)*.054));}
      const pieces=[new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loops),20,.0075,5,false)];
      for(const [dx,dy,dz]of [[.072,-.12,.09],[.022,-.075,.115]]){
        const points=[[.016,.474,.052],[.035,.467,.077],[dx,.474+dy*.6,dz],[dx+.009,.474+dy,dz-.008]].map(p=>new THREE.Vector3(...p));
        pieces.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),4,.008,5,false));
      }
      const knot=new THREE.SphereGeometry(.018,6,2);knot.scale(1.2,.85,.8);knot.translate(.022,.475,.063);pieces.push(knot);
      const tie=merged(pieces);tie.scale(scale,scale,scale);add(root,tie,name+'-tie',rope);
    }
    sack('sack-large',-.02,.255,1);sack('sack-small',.32,.345,.74);
    // Optional deterministic arrangements for callers; the default footprint,
    // group names and bottom origin stay unchanged. No random factory output.
    const layout = ((Math.trunc(kit.cargoLayout || 0) % 3) + 3) % 3;
    if (layout === 1) {
      g.getObjectByName('crate-small').position.set(.48,0,.315);
      g.getObjectByName('barrel').position.set(.44,0,-.18);
      g.getObjectByName('sack-large').position.set(-.48,0,.29);
      g.getObjectByName('sack-small').position.set(-.03,0,.34);
    } else if (layout === 2) {
      g.getObjectByName('crate-large').position.set(.37,0,-.17);
      g.getObjectByName('crate-small').position.set(.47,0,.28);
      g.getObjectByName('sack-large').position.set(-.10,0,.255);
      g.getObjectByName('sack-small').position.set(-.39,0,.345);
      g.getObjectByName('barrel').position.set(-.42,0,-.105);
      g.getObjectByName('barrel').rotation.y = Math.PI / 10;
    }
    finishPainted(THREE, g);
    if (layout) {
      // All three arrangements share the existing placement/collision envelope.
      const b = new THREE.Box3().setFromObject(g), size = b.getSize(new THREE.Vector3());
      const scale = new THREE.Vector3(1.465845689252019 / size.x, 0.9100000262260437 / size.y, 1.0200000114738943 / size.z);
      const fit = new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z);
      fit.setPosition(-0.7200000058114528 - b.min.x * scale.x, -b.min.y * scale.y, -0.490000009611249 - b.min.z * scale.z);
      g.traverse(o => { if (o.isMesh) { o.geometry.applyMatrix4(fit); o.geometry.computeBoundingBox(); o.geometry.computeBoundingSphere(); } });
    }
    return g;
  };

  /* Tidal crescent boat: stylized game export from the best available closed-bottom blockout.
   * Formal img2threejs stopped at its blockout correction limit; later passes are not credited.
   * Bow is +Z. All helpers are local and every material is supplied by the game kit.
   */
  I.PROPMODELS['boat'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'boat';
    const mats = {
      ivory: kit.mat('#F1E4D1', { roughness:.8 }, 'wood'),
      blue: kit.mat('#BCA6CB', { roughness:.8 }, 'wood'),
      wood: kit.mat('#B98E6B', { roughness:.8 }, 'wood'),
      woodlight: kit.mat('#CDA67E', { roughness:.8 }, 'wood'),
      gold: kit.mat('#E8C48B', { roughness: .4, metalness: 0.6 },'metal')
    };
    mats.dark = mats.wood;
    const N = 48;
    function contour(t, sx, sz, y) {
      const c = Math.cos(t), q = Math.sin(t);
      return [0.48 * q * (0.96 - 0.04 * c) * sx, y + 0.065 * Math.pow(Math.abs(c), 4) * Math.min(1, sz / .9), 1.08 * c * sz];
    }
    function surface(rings, inward) {
      const p = [], ix = [];
      for (const [sx, sz, y] of rings) for (let i = 0; i <= N; i++) p.push(...contour(i * Math.PI * 2 / N, sx, sz, y));
      for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < N; i++) {
        const a = r * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
        if (inward) ix.push(a, c, b, b, c, d); else ix.push(a, b, c, b, d, c);
      }
      const geo = new THREE.BufferGeometry();
      const clean=[];
      for(let k=0;k<ix.length;k+=3){
        const a=ix[k]*3,b=ix[k+1]*3,c=ix[k+2]*3,ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
        const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
        if(nx*nx+ny*ny+nz*nz>1e-18)clean.push(ix[k],ix[k+1],ix[k+2]);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setIndex(clean); geo.computeVertexNormals(); return geo;
    }
    function put(name, geo, mat, x, y, z) {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    }
    const lower = [[0,0,-.15],[.18,.7,-.15],[.48,.85,-.08],[.75,.95,.06],[.94,.997,.225]];
    put('hull', surface(lower, false), mats.blue);
    put('upper-hull', surface([[.94,.997,.225],[.96,1,.25],[1,1,.41]], false), mats.ivory);
    put('interior', surface([[0,0,.09],[.70,.88,.09],[.84,.94,.13],[.89,.965,.25],[.91,.975,.41]], true), mats.wood);
    function rimGeometry() {
      const p=[],ix=[],C=8;
      for(let i=0;i<=N;i++){
        const t=i*Math.PI*2/N,c=Math.cos(t),q=Math.sin(t),base=contour(t,.957,.986,.421);
        const radial=new THREE.Vector3(q,0,c*.45).normalize();
        for(let j=0;j<=C;j++){
          const a=j*Math.PI*2/C;
          p.push(base[0]+radial.x*.027*Math.cos(a),base[1]+.024*Math.sin(a),base[2]+radial.z*.027*Math.cos(a));
        }
      }
      for(let i=0;i<N;i++)for(let j=0;j<C;j++){const a=i*(C+1)+j,b=a+C+1;ix.push(a,b,a+1,a+1,b,b+1);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();return geo;
    }
    put('gunwale', rimGeometry(), mats.woodlight);
    const floor = new THREE.Shape(); floor.moveTo(-.25,-.65); floor.quadraticCurveTo(-.34,0,-.25,.65); floor.quadraticCurveTo(0,.86,.25,.65); floor.quadraticCurveTo(.34,0,.25,-.65); floor.quadraticCurveTo(0,-.83,-.25,-.65);
    const floorGeo = new THREE.ExtrudeGeometry(floor, {depth:.03,bevelEnabled:false,curveSegments:8}); floorGeo.rotateX(-Math.PI/2);
    put('floor', floorGeo, mats.woodlight,0,.095,0);
    function bevelBoard(w,h,d,b) {
      const s=new THREE.Shape(),x=w/2-b,z=d/2-b;
      s.moveTo(-x,-z);s.lineTo(x,-z);s.lineTo(x,z);s.lineTo(-x,z);s.closePath();
      const geo=new THREE.ExtrudeGeometry(s,{depth:h-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:2,steps:1,curveSegments:1});
      geo.rotateX(-Math.PI/2);geo.translate(0,-h/2+b,0);return geo;
    }
    const seatGeo = bevelBoard(.745,.055,.23,.008);
    put('seats', seatGeo, mats.woodlight,0,.315,-.42);
    put('seat-forward', seatGeo, mats.woodlight,0,.315,.42);
    // Three solid U ribs follow the inner hull. They sit above the floor and
    // below the seats; the original outer shell and bow envelope are retained.
    for (const z of [-.68, 0, .68]) {
      const width = .36 * Math.sqrt(1 - Math.pow(z / 1.10, 2));
      const rib = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-width,.365,z),new THREE.Vector3(-width*.82,.19,z),
        new THREE.Vector3(0,.14,z),new THREE.Vector3(width*.82,.19,z),new THREE.Vector3(width,.365,z)
      ]);
      put('hull-rib-'+z,new THREE.TubeGeometry(rib,8,.014,5,false),mats.woodlight);
    }
    for (const side of [-1,1]) {
      const socket = new THREE.TorusGeometry(.018,.006,5,10);
      socket.rotateX(Math.PI/2);
      put('oar-socket-'+side,socket,mats.gold,side*.438,.45,-.05);
    }
    const bow = new THREE.Shape(); bow.moveTo(-.06,-.08); bow.quadraticCurveTo(-.15,.03,-.07,.13); bow.quadraticCurveTo(.0,.20,.09,.15); bow.quadraticCurveTo(-.015,.13,-.025,.045); bow.quadraticCurveTo(-.02,-.035,.065,-.045); bow.quadraticCurveTo(.025,-.11,-.06,-.08);
    const crescentGeo = new THREE.ExtrudeGeometry(bow,{depth:.036,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,curveSegments:10}); crescentGeo.rotateY(Math.PI/2); crescentGeo.translate(-.018,0,0);
    put('crescent',crescentGeo,mats.gold,0,.595,1.055);
    const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.075,.78),new THREE.Vector3(0,-.01,.92),new THREE.Vector3(0,.18,1.058),new THREE.Vector3(0,.47,1.08),new THREE.Vector3(0,.54,1.06)]);
    put('stem',new THREE.TubeGeometry(stem,12,.023,6,false),mats.gold);
    const sternBase=bevelBoard(.095,.07,.075,.008);
    put('stern-cap',sternBase,mats.gold,0,.492,-1.065);
    const finial=new THREE.OctahedronGeometry(1,0);finial.scale(.04,.07,.04);
    put('stern',finial,mats.gold,0,.578,-1.065);
    const stars=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),mats.gold,2);stars.name='stars';
    const starMatrix=new THREE.Matrix4(),starQuaternion=new THREE.Quaternion();
    for(let i=0;i<2;i++)starMatrix.compose(new THREE.Vector3((i?1:-1)*.447,.26,-.17),starQuaternion,new THREE.Vector3(.017,.065,.038)),stars.setMatrixAt(i,starMatrix);
    stars.castShadow=true;stars.receiveShadow=true;g.add(stars);
    const rivets=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,5),mats.gold,4);rivets.name='rivets';
    let ri=0;
    for(const side of [-1,1])for(const z of [-.58,.58]){
      const c=z/1.08,x=.48*Math.sqrt(1-c*c)*(.96-.04*c)*.976;
      starMatrix.compose(new THREE.Vector3(side*x,.29,z),starQuaternion,new THREE.Vector3(.012,.018,.018));rivets.setMatrixAt(ri++,starMatrix);
    }
    rivets.castShadow=true;rivets.receiveShadow=true;g.add(rivets);
    const seamPositions=[],seamIndices=[];
    for(const x of [-.15,0,.15]){
      const line=new THREE.BoxGeometry(.005,.003,1.12);line.translate(x,.129,0);
      const offset=seamPositions.length/3;seamPositions.push(...line.attributes.position.array);for(const i of line.index.array)seamIndices.push(i+offset);line.dispose();
    }
    const seamGeometry=new THREE.BufferGeometry();seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seamPositions,3));seamGeometry.setIndex(seamIndices);seamGeometry.computeVertexNormals();
    put('wood-seams',seamGeometry,mats.dark);
    // Normalize the entire assembled boat, including its crescent, to z in [-1.15, +1.15].
    // Baking the affine transform keeps the returned root at identity and is deterministic.
    g.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(g,true),zCenter=(box.max.z+box.min.z)/2,zScale=2.3/(box.max.z-box.min.z),scaled=new Set();
    g.traverse(function(o){
      if(!o.isMesh)return;
      if(!scaled.has(o.geometry)){o.geometry.scale(1,1,zScale);scaled.add(o.geometry);}
      o.position.z=(o.position.z-zCenter)*zScale;
      if(o.isInstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,starMatrix);starMatrix.elements[14]*=zScale;o.setMatrixAt(i,starMatrix);}
    });
    return finishPainted(THREE, g);
  };

})(typeof window !== 'undefined' ? window : globalThis);
