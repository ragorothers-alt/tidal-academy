/* 潮汐小島 · 程式化手持工具（img2threejs 重建）：TA.ISLE.TOOLMODELS[id] = (THREE, kit) => THREE.Group。
   握把在原點、沿 +y 延伸；chars.js 的 setTool 有對應的模型就用它。
   參考圖、strict-quality 規格、blockout 關卡與遊戲適配證據另存於工作資料夾。 */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.TOOLMODELS = I.TOOLMODELS || {};

  I.TOOLMODELS["rod"] = function (THREE, kit) {
    const rod = new THREE.Group();
    rod.name = 'island-fishing-rod';
    const teal = kit.mat('#639e99', {roughness:0.64, metalness:0.04});
    const cork = kit.mat('#d4aa74', {roughness:0.94, metalness:0});
    const steel = kit.mat('#89999d', {roughness:0.43, metalness:0.48});
    const dark = kit.mat('#4a5d6b', {roughness:0.57, metalness:0.22});
    const cream = kit.mat('#e6ddbb', {roughness:0.84, metalness:0});
    function mesh(geo, mat, name, x=0, y=0, z=0) {
      const item = new THREE.Mesh(geo, mat);
      item.name=name; item.position.set(x,y,z); rod.add(item); return item;
    }
    function lathe(points, segments=12) {
      return new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(p[0],p[1])),segments);
    }
    function move(geo,x,y,z,rx=0,ry=0,rz=0) {
      geo.rotateX(rx);geo.rotateY(ry);geo.rotateZ(rz);geo.translate(x,y,z);return geo;
    }
    function merge(list) {
      let count=0;
      const source=list.map(g=>g.index?g.toNonIndexed():g);
      for(const g of source)count+=g.getAttribute('position').count;
      const positions=new Float32Array(count*3), normals=new Float32Array(count*3);
      let offset=0;
      for(const g of source) {
        if(!g.getAttribute('normal'))g.computeVertexNormals();
        positions.set(g.getAttribute('position').array,offset);
        normals.set(g.getAttribute('normal').array,offset);
        offset+=g.getAttribute('position').array.length;
      }
      const result=new THREE.BufferGeometry();
      result.setAttribute('position',new THREE.BufferAttribute(positions,3));
      result.setAttribute('normal',new THREE.BufferAttribute(normals,3));
      return result;
    }
    function tube(points,radius,segments=12,sides=6) {
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
      return new THREE.TubeGeometry(curve,segments,radius,sides,false);
    }
    mesh(lathe([[0,-.03],[.014,-.03],[.014,0.20],[.0125,.36],[.010,.56],[.0075,.76],[.0045,.94],[.002,1.043],[0,1.05]],12),teal,'tapered-blank');
    mesh(lathe([[0,-.075],[.020,-.075],[.025,-.069],[.027,-.055],[.027,-.035],[.0255,.012],[.023,.045],[.020,.052],[0,.052]],12),cork,'cork-butt-grip');
    mesh(lathe([[0,.101],[.019,.101],[.022,.108],[.023,.124],[.0215,.171],[.019,.184],[.016,.188],[0,.188]],12),cork,'cork-foregrip');
    const cap=new THREE.SphereGeometry(1,12,6);cap.scale(.025,.010,.025);
    mesh(cap,dark,'rounded-butt-cap',0,-.070,0);
    const collars=[];
    for(const a of [[.051,.024,.012],[.098,.023,.012],[.189,.017,.010]]) collars.push(move(new THREE.CylinderGeometry(a[1],a[1],a[2],10),0,a[0],0));
    const guides=[[.34,.0165,.0115],[.53,.014,.010],[.70,.012,.008],[.86,.010,.006],[1.031,.008,.0028]];
    for(const [y,r,s] of guides)collars.push(move(new THREE.CylinderGeometry(s+.0025,s+.0025,.011,8),0,y-.003,0));
    mesh(merge(collars),steel,'metal-ferrules-and-guide-collars');
    mesh(tube([[0,.086,0],[.025,.090,0],[.049,.105,0]],.010,6,8),dark,'reel-seat-bridge');
    const body=new THREE.SphereGeometry(1,14,10);body.scale(.042,.034,.031);
    mesh(body,teal,'rounded-reel-housing',.073,.109,0);
    mesh(new THREE.CylinderGeometry(.033,.033,.033,14),cream,'cream-spool',.079,.150,0);
    const reelRims=[];
    reelRims.push(move(new THREE.TorusGeometry(.033,.004,5,16),.079,.1325,0,Math.PI/2));
    reelRims.push(move(new THREE.TorusGeometry(.035,.004,5,16),.079,.167,0,Math.PI/2));
    const spoolTop=new THREE.SphereGeometry(1,12,6);spoolTop.scale(.035,.007,.035);move(spoolTop,.079,.171,0);reelRims.push(spoolTop);
    mesh(merge(reelRims),teal,'rounded-spool-rims');
    mesh(tube([[.086,.101,.023],[.113,.089,.033],[.127,.062,.035],[.140,.056,.035]],.0055,8,6),steel,'bent-reel-crank');
    const knob=lathe([[0,-.019],[.008,-.019],[.012,-.014],[.013,-.008],[.013,.010],[.011,.016],[.007,.019],[0,.019]],10);knob.rotateZ(Math.PI/2);
    mesh(knob,cork,'rounded-cork-crank-knob',.155,.056,.035);
    const rings=[];
    for(const [y,r,s] of guides) {
      const x=s+r+.001;
      rings.push(move(new THREE.TorusGeometry(r,.0028,5,12),x,y,0));
      rings.push(tube([[s*.65,y-.006,0],[s+.005,y-.003,0],[x-r+.002,y,0]],.0025,3,5));
    }
    mesh(merge(rings),dark,'five-open-line-guides');
    mesh(tube([[.047,.137,-.017],[.045,.153,-.034],[.081,.160,-.043],[.116,.153,-.028],[.118,.140,0],[.111,.130,.023]],.0034,12,5),steel,'reel-bail-wire');
    return rod;
  };

  I.TOOLMODELS["net"] = function (THREE, kit) {
    const root = new THREE.Group();
    root.name = 'pastel-insect-net';
    const wood = kit.mat('#DDB27B', { roughness: 0.67, metalness: 0 });
    const coral = kit.mat('#EC9A87', { roughness: 0.46, metalness: 0 });
    const mint = kit.mat('#94BFA6', { roughness: 0.45, metalness: 0 });
    const ivory = kit.mat('#FFF9E9', { roughness: 0.84, metalness: 0, transparent: true, opacity: 0.66 });
    const thread = kit.mat('#DDD9C2', { roughness: 0.9, metalness: 0, transparent: true, opacity: 0.77 });
    const add = (name, geometry, material, position) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      if (position) mesh.position.set(...position);
      root.add(mesh);
      return mesh;
    };
    add('tan-wood-shaft', new THREE.CylinderGeometry(0.017, 0.022, 0.805, 12, 1), wood, [0, 0.3975, 0]);
    const cap = add('coral-rounded-grip-cap', new THREE.SphereGeometry(0.027, 12, 8), coral, [0, -0.017, 0]);
    cap.scale.set(1, 1.22, 1);
    const socket = add('coral-soft-connector', new THREE.CylinderGeometry(0.029, 0.025, 0.075, 12, 1), coral, [0, 0.786, 0]);
    const neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.802, 0),
      new THREE.Vector3(0, 0.86, -0.074),
      new THREE.Vector3(0, 0.9, -0.149)
    ]);
    add('mint-bent-hoop-socket', new THREE.TubeGeometry(neckCurve, 10, 0.021, 8, false), mint);
    const hoop = add('mint-circular-open-hoop', new THREE.TorusGeometry(0.16, 0.016, 8, 32), mint, [0, 0.9, 0]);
    hoop.rotation.x = Math.PI / 2;
    const radial = 24, rings = 9;
    const point = (t, angle) => {
      const r = 0.145 * Math.cos(t * Math.PI / 2);
      return new THREE.Vector3(r * Math.cos(angle), 0.9 - 0.185 * t, 0.205 * Math.sin(t * Math.PI / 2) + r * Math.sin(angle));
    };
    const verts = [], indices = [];
    for (let j = 0; j <= rings; j++) {
      for (let i = 0; i <= radial; i++) verts.push(...point(j / rings, i / radial * Math.PI * 2).toArray());
    }
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < radial; i++) {
        const a = j * (radial + 1) + i, b = a + radial + 1;
        indices.push(a, a + 1, b);
        if (j < rings - 1) indices.push(a + 1, b + 1, b);
  
      }
    }
    const shell = new THREE.BufferGeometry();
    shell.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    shell.setIndex(indices); shell.computeVertexNormals();
    const outerShell = shell.toNonIndexed();
    const shellPositions = Array.from(outerShell.attributes.position.array);
    const shellNormals = Array.from(outerShell.attributes.normal.array);
    const originalPositionCount = shellPositions.length;
    for (let i = 0; i < originalPositionCount; i += 9) {
      for (const k of [0, 6, 3]) {
        shellPositions.push(shellPositions[i+k], shellPositions[i+k+1], shellPositions[i+k+2]);
        shellNormals.push(-shellNormals[i+k], -shellNormals[i+k+1], -shellNormals[i+k+2]);
      }
    }
    const twoSidedShell = new THREE.BufferGeometry();
    twoSidedShell.setAttribute('position', new THREE.Float32BufferAttribute(shellPositions, 3));
    twoSidedShell.setAttribute('normal', new THREE.Float32BufferAttribute(shellNormals, 3));
    shell.dispose(); outerShell.dispose();
    add('ivory-translucent-sagging-bag', twoSidedShell, ivory);
    const strandGeometries = [];
    const strandCount = 12, strandSteps = 6;
    for (const direction of [-1, 1]) {
      for (let n = 0; n < strandCount; n++) {
        const points = [];
        for (let j = 0; j <= strandSteps; j++) {
          const t = j / strandSteps * 0.96;
          points.push(point(t, n / strandCount * Math.PI * 2 + direction * t * 1.85));
        }
        strandGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), strandSteps, 0.0018, 3, false));
      }
    }
    // Merge the repeated strands into one semantic mesh to keep mobile draw calls low.
    const positions = [], normals = [];
    for (const geometry of strandGeometries) {
      const flat = geometry.toNonIndexed();
      positions.push(...flat.attributes.position.array);
      normals.push(...flat.attributes.normal.array);
      geometry.dispose(); flat.dispose();
    }
    const lattice = new THREE.BufferGeometry();
    lattice.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lattice.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    add('ivory-diagonal-net-lattice', lattice, thread);
    return root;
  };

  I.TOOLMODELS["shovel"] = function (THREE, kit) {
    const root = new THREE.Group();
    root.name = 'shovel';
    const mat = {
      wood: kit.mat('#cb9459', { roughness: 0.76, metalness: 0 }),
      grip: kit.mat('#9bbb98', { roughness: 0.68, metalness: 0 }),
      socket: kit.mat('#65999a', { roughness: 0.58, metalness: 0.16 }),
      lip: kit.mat('#9bbbb0', { roughness: 0.53, metalness: 0.12 }),
      steel: kit.mat('#8aa7b1', { roughness: 0.48, metalness: 0.38 }),
      edge: kit.mat('#d0dcd9', { roughness: 0.38, metalness: 0.48 })
    };
    function add(name, geometry, material, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      mesh.position.set(x, y, z);
      root.add(mesh);
      return mesh;
    }
    function lathe(name, points, material, segments = 12) {
      return add(name, new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), segments), material);
    }
    // The D frame is a closed solid tube, not a filled paddle.
    const gripPoints = [
      [-0.043,-0.034,0],[0,-0.035,0],[0.043,-0.034,0],
      [0.054,-0.023,0],[0.052,0.025,0],[0.042,0.051,0],
      [0.026,0.068,0],[0,0.068,0],[-0.026,0.068,0],
      [-0.042,0.051,0],[-0.052,0.025,0],[-0.054,-0.023,0]
    ].map(p => new THREE.Vector3(p[0], p[1], p[2]));
    add('grip', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gripPoints, true, 'centripetal'), 40, 0.012, 7, true), mat.grip);
    lathe('grip-neck', [[0,0.07],[0.024,0.07],[0.025,0.09],[0.021,0.118],[0.019,0.13],[0,0.13]], mat.grip);
    lathe('shaft', [[0,0.106],[0.017,0.106],[0.018,0.13],[0.0175,0.35],[0.016,0.56],[0.015,0.65],[0,0.65]], mat.wood);
    lathe('socket', [[0,0.598],[0.02,0.598],[0.022,0.607],[0.027,0.651],[0.029,0.658],[0,0.658]], mat.socket);
    const collar = add('socket-lip', new THREE.TorusGeometry(0.0268, 0.0041, 6, 14), mat.lip, 0, 0.652, 0);
    collar.rotation.x = Math.PI / 2;
    const rivet = add('rivet', new THREE.SphereGeometry(0.008, 10, 6), mat.edge, 0, 0.624, 0.0225);
    rivet.scale.z = 0.5;
    // Closed variable-thickness scoop: front dish, convex reverse, rolled metal rim.
    const stations = [
      [0.62,0.025,0.018],[0.635,0.072,0.008],[0.65,0.102,-0.003],
      [0.68,0.11,-0.012],[0.72,0.109,-0.014],[0.76,0.103,-0.013],
      [0.80,0.088,-0.009],[0.835,0.061,-0.003],[0.865,0.034,0.004],
      [0.885,0.014,0.009],[0.895,0.005,0.010],[0.899,0.001,0.010]
    ];
    const rowCurve = new THREE.CatmullRomCurve3(stations.map(r => new THREE.Vector3(r[0], r[1], r[2])), false, 'catmullrom', 0.3);
    const rows = Array.from({length:24}, (_,i) => {const p=rowCurve.getPoint(i/23);return [p.x,Math.min(0.11,p.y),p.z];});
    const us = [-1,-0.88,-0.68,-0.45,-0.22,0,0.22,0.45,0.68,0.88,1];
    const positions = [], bodyIndices = [], edgeIndices = [];
    const nr = rows.length, nc = us.length, sideSize = nr * nc;
    for (let side = 0; side < 2; side++) {
      for (let r = 0; r < nr; r++) {
        const [y,w,base] = rows[r];
        const ribFade = Math.max(0, 1 - Math.abs(y - 0.67) / 0.11);
        for (const u of us) {
          const bowl = 0.025 * u * u;
          const lipRoll = Math.max(0, (Math.abs(u) - 0.88) / 0.12) * 0.003;
          const rib = 0.007 * Math.exp(-u*u / 0.025) * ribFade;
          const front = base + bowl - lipRoll + rib;
          const stock = 0.008 - 0.002 * u * u;
          positions.push(w*u, y, front - (side ? stock : 0));
        }
      }
    }
    function tri(list,a,b,c) { list.push(a,b,c); }
    for (let side = 0; side < 2; side++) {
      const off = side * sideSize;
      for (let r = 0; r < nr - 1; r++) {
        for (let c = 0; c < nc - 1; c++) {
          const a=off+r*nc+c,b=a+1,d=off+(r+1)*nc+c,e=d+1;
          const ids=(c===0||c===nc-2||r===nr-2)?edgeIndices:bodyIndices;
          if (!side) { tri(ids,a,b,e); tri(ids,a,e,d); }
          else { tri(ids,a,e,b); tri(ids,a,d,e); }
        }
      }
    }
    // Join the front and reverse all the way around the boundary.
    const loop=[];
    for(let c=0;c<nc;c++)loop.push(c);
    for(let r=1;r<nr;r++)loop.push(r*nc+nc-1);
    for(let c=nc-2;c>=0;c--)loop.push((nr-1)*nc+c);
    for(let r=nr-2;r>0;r--)loop.push(r*nc);
    for(let i=0;i<loop.length;i++) {
      const a=loop[i],b=loop[(i+1)%loop.length];
      tri(edgeIndices,a,b+sideSize,b);
      tri(edgeIndices,a,a+sideSize,b+sideSize);
    }
    const bladeGeometry=new THREE.BufferGeometry();
    bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    bladeGeometry.setIndex(bodyIndices.concat(edgeIndices));
    bladeGeometry.addGroup(0,bodyIndices.length,0);
    bladeGeometry.addGroup(bodyIndices.length,edgeIndices.length,1);
    bladeGeometry.computeVertexNormals();
    bladeGeometry.computeBoundingBox();
    add('blade',bladeGeometry,[mat.steel,mat.edge]);
    return root;
  };

  I.TOOLMODELS["can"] = function (THREE, kit) {
    const g = new THREE.Group(), body = new THREE.Group();
    g.name = 'mint-watering-can'; body.rotation.z = Math.PI; body.position.y = 0.17; g.add(body);
    // Reference is upright; this grip frame places the carrying bar at the hand origin.
    // chars.js supplies the shared -1.2 radian carrying rotation.
    const mint = kit.mat('#7cc7c0', { roughness: 0.43, metalness: 0.16 });
    const teal = kit.mat('#4d9791', { roughness: 0.47, metalness: 0.18 });
    const cream = kit.mat('#f3dfb6', { roughness: 0.62, metalness: 0.03 });
    const brass = kit.mat('#dbc18d', { roughness: 0.44, metalness: 0.32 });
    const dark = kit.mat('#335b56', { roughness: 0.8, metalness: 0.02 });
    const add = (name, geometry, material, x=0, y=0, z=0, parent=body) => {
      const m = new THREE.Mesh(geometry, material); m.name = name; m.position.set(x,y,z); parent.add(m); return m;
    };
    const lathe = (points, segments=20) => new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(p[0],p[1])), segments);
    const shell = lathe([[0,-0.06],[0.062,-0.06],[0.073,-0.057],[0.079,-0.047],[0.081,-0.025],[0.078,0.038],[0.072,0.058],[0.058,0.074],[0.044,0.079],[0.043,0.094],[0.037,0.094],[0.037,0.078],[0.052,0.068],[0.065,0.05],[0.07,0.03],[0.072,-0.042],[0,-0.042]]);
    add('rounded-enamel-vessel', shell, mint);
    const ring = (name,r,t,y,mat) => {const m=add(name,new THREE.TorusGeometry(r,t,5,20),mat,0,y,0);m.rotation.x=Math.PI/2;return m;};
    ring('rolled-base-seam',0.074,0.004,-0.055,teal);
    ring('rolled-filler-lip',0.041,0.005,0.094,mint);
    add('filler-cavity-floor',new THREE.CircleGeometry(0.037,16),dark,0,0.075,0).rotation.x=-Math.PI/2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.068,0.044,0),new THREE.Vector3(-0.08,0.105,0),new THREE.Vector3(-0.061,0.15,0),
      new THREE.Vector3(-0.035,0.17,0),new THREE.Vector3(0.035,0.17,0),new THREE.Vector3(0.061,0.15,0),
      new THREE.Vector3(0.08,0.105,0),new THREE.Vector3(0.068,0.044,0)
    ]);
    add('arched-carry-handle',new THREE.TubeGeometry(curve,18,0.009,6,false),teal);
    const grip = add('cream-carry-grip',new THREE.CapsuleGeometry(0.014,0.061,3,8),cream,0,0.17,0);grip.rotation.z=Math.PI/2;
    const joins = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014,8,5),brass,2); joins.name='handle-hinge-buttons';
    [-1,1].forEach((s,i)=>{const t=new THREE.Matrix4().compose(new THREE.Vector3(s*0.071,0.047,0.006),new THREE.Quaternion(),new THREE.Vector3(1,1,0.45));joins.setMatrixAt(i,t);});joins.instanceMatrix.needsUpdate=true;body.add(joins);
    const start=new THREE.Vector3(0,-0.005,0.061),end=new THREE.Vector3(0,0.092,0.194),dir=end.clone().sub(start).normalize();
    const spout=add('tapered-rising-spout',new THREE.CylinderGeometry(0.012,0.027,start.distanceTo(end),12,1,false),mint);spout.position.copy(start).add(end).multiplyScalar(0.5);spout.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
    const collar=add('spout-root-collar',new THREE.CylinderGeometry(0.028,0.029,0.012,12),teal);collar.position.copy(start).addScaledVector(dir,0.006);collar.quaternion.copy(spout.quaternion);
    const rose=new THREE.Group();rose.name='sprinkler-rose';rose.position.copy(end);rose.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);body.add(rose);
    add('sprinkler-back',lathe([[0,-0.018],[0.013,-0.018],[0.028,-0.009],[0.038,0.001],[0.039,0.009],[0.035,0.012],[0,0.012]],16),teal,0,0,0,rose);
    // Actual polygon openings reveal the dark back of the rose; no texture dots.
    const face=new THREE.Shape(),radius=0.0355;face.absarc(0,0,radius,0,Math.PI*2,false);
    const hole=(x,y)=>{const h=new THREE.Path();h.absarc(x,y,0.0021,0,Math.PI*2,true);face.holes.push(h);};hole(0,0);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;hole(Math.cos(a)*0.012,Math.sin(a)*0.012);}
    for(let i=0;i<10;i++){const a=i*Math.PI/5+0.15;hole(Math.cos(a)*0.026,Math.sin(a)*0.026);}
    const plate=add('perforated-cream-rose',new THREE.ShapeGeometry(face,5),cream,0,0.013,0,rose);plate.rotation.x=-Math.PI/2;
    const rim=add('rose-rolled-metal-rim',new THREE.TorusGeometry(0.0367,0.003,5,20),brass,0,0.012,0,rose);rim.rotation.x=Math.PI/2;
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
