/* 潮汐小島 · 程式化模型（img2threejs 重建）：海邊旅館、露營地、手作工作台、市集攤位。 */

// hotel
/* Tidal Academy: procedural ivory arcade hotel, timber balcony and slate cross gables. */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['hotel'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'hotel';
    const M = {
      stone: kit.mat('#eee4d0', { roughness: .9 }, 'stone'),
      stoneAlt: kit.mat('#dfd0b6', { roughness: .94 }, 'stone'),
      stoneLight: kit.mat('#f5eddd', { roughness: .86 }, 'stone'),
      plaster: kit.mat('#f0e6d2', { roughness: .9 }, 'stone'),
      wood: kit.mat('#895c3d', { roughness: .77 }),
      woodDark: kit.mat('#62412e', { roughness: .85 }),
      woodLight: kit.mat('#ad7b4f', { roughness: .73 }),
      plank: kit.mat('#946842', { roughness: .8 }, 'wall'),
      roof: kit.mat('#3d5685', { roughness: .66 }, 'roof'),
      roofAlt: kit.mat('#496898', { roughness: .69 }, 'roof'),
      roofLight: kit.mat('#5576a3', { roughness: .65 }, 'roof'),
      roofDark: kit.mat('#2e4168', { roughness: .73 }, 'roof'),
      navy: kit.mat('#25385c', { roughness: .9 }),
      gold: kit.mat('#d6b15a', { roughness: .4, metalness: .7 }),
      recess: kit.mat('#463b31', { roughness: .98 }),
      glass: kit.win(),
      leaf: kit.mat('#5c7947', { roughness: .88 }),
      leafLight: kit.mat('#869658', { roughness: .88 }),
      flower: kit.mat('#f3e7bc', { roughness: .87 })
    };
    const batches = new Map(), materialIds = new Map();
    Object.keys(M).forEach((k, i) => materialIds.set(M[k], i));
    const vec = a => new THREE.Vector3(a[0], a[1], a[2]);
    function add(part, geometry, material, p = [0, 0, 0], r = [0, 0, 0], scale = [1, 1, 1], quaternion) {
      const q = quaternion || new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2]));
      const matrix = new THREE.Matrix4().compose(vec(p), q, vec(scale));
      let geo = geometry.index ? geometry.toNonIndexed() : geometry;
      geo.applyMatrix4(matrix);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!geo.attributes.uv) {
        const a = geo.attributes.position, uv = new Float32Array(a.count * 2);
        for (let i = 0; i < a.count; i++) { uv[i * 2] = a.getX(i); uv[i * 2 + 1] = a.getY(i); }
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
      const key = part + ':' + materialIds.get(material);
      if (!batches.has(key)) batches.set(key, { part, material, p: [], n: [], uv: [] });
      const b = batches.get(key);
      for (const [name, target] of [['position', b.p], ['normal', b.n], ['uv', b.uv]]) {
        const a = geo.getAttribute(name).array; for (let i = 0; i < a.length; i++) target.push(a[i]);
      }
      geo.dispose(); if (geo !== geometry) geometry.dispose();
    }
    function box(part, w, h, d, p, material, r, bevel = 0) {
      if (!bevel) return add(part, new THREE.BoxGeometry(w, h, d), material, p, r);
      const b = Math.min(bevel, w / 4, h / 4, d / 4), s = new THREE.Shape();
      const x = w / 2 - b, y = h / 2 - b;
      s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: d - b * 2, steps: 1, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 1 });
      geo.translate(0, 0, -d / 2 + b); add(part, geo, material, p, r);
    }
    function beam(part, a, b, width, depth, material) {
      const av = vec(a), bv = vec(b), delta = bv.clone().sub(av);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
      add(part, new THREE.BoxGeometry(width, delta.length() + .025, depth), material, av.add(bv).multiplyScalar(.5).toArray(), undefined, undefined, q);
    }
    function cyl(part, rt, rb, h, p, material, segments = 10, r) { add(part, new THREE.CylinderGeometry(rt, rb, h, segments), material, p, r); }
    function sphere(part, radius, p, material, scale = [1, 1, 1]) { add(part, new THREE.SphereGeometry(radius, 8, 5), material, p, undefined, scale); }
    function polygon(part, points, depth, p, material, r, bevel = 0) {
      const s = new THREE.Shape(); points.forEach((a, i) => i ? s.lineTo(a[0], a[1]) : s.moveTo(a[0], a[1])); s.closePath();
      add(part, new THREE.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 8 }), material, p, r);
    }
    function archFill(part, w, h, depth, p, material, r) {
      const rr = w / 2, spring = h - rr, pts = [[-rr, 0], [rr, 0], [rr, spring]];
      for (let i = 1; i <= 16; i++) { const a = Math.PI * i / 16; pts.push([Math.cos(a) * rr, spring + Math.sin(a) * rr]); }
      polygon(part, pts, depth, p, material, r);
    }
    function archRing(part, x, spring, z, inner, outer, depth, material, rotation = 0) {
      const pts = [];
      for (let i = 0; i <= 18; i++) { const a = Math.PI * i / 18; pts.push([Math.cos(a) * outer, Math.sin(a) * outer]); }
      for (let i = 18; i >= 0; i--) { const a = Math.PI * i / 18; pts.push([Math.cos(a) * inner, Math.sin(a) * inner]); }
      polygon(part, pts, depth, [x, spring, z], material, [0, rotation, 0]);
    }
    function archStones(cx, spring, z, inner, outer) {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = i * Math.PI / n + .009, b = (i + 1) * Math.PI / n - .009;
        polygon('arcade', [[Math.cos(a) * inner, Math.sin(a) * inner], [Math.cos(a) * outer, Math.sin(a) * outer], [Math.cos(b) * outer, Math.sin(b) * outer], [Math.cos(b) * inner, Math.sin(b) * inner]], .52, [cx, spring, z], i % 4 === 1 ? M.stoneAlt : i % 3 === 0 ? M.stoneLight : M.stone, undefined, .009);
      }
    }
    function crest(part, x, y, z, size) {
      const pts = [];
      for (let i = 0; i <= 22; i++) { const a = (.23 + i / 22 * 1.54) * Math.PI; pts.push([Math.cos(a) * size * .5, Math.sin(a) * size * .5]); }
      for (let i = 0; i <= 22; i++) { const a = (1.68 - i / 22 * 1.36) * Math.PI; pts.push([size * .18 + Math.cos(a) * size * .4, Math.sin(a) * size * .4]); }
      polygon(part, pts, .018, [x, y, z], M.gold);
      const s = size * .26;
      polygon(part, [[0,s],[s*.24,s*.22],[s,0],[s*.24,-s*.22],[0,-s],[-s*.24,-s*.22],[-s,0],[-s*.24,s*.22]], .022, [x+size*.18,y,z+.008], M.gold);
    }
    function windowFront(x, bottom, z, width, height, door = false) {
      const part = door ? 'entry-door' : 'windows';
      archFill(part, width + .18, height + .12, .085, [x, bottom - .03, z], M.recess);
      archFill(part, width, height, .07, [x, bottom, z + .05], door ? M.wood : M.glass);
      const rr = width / 2, sy = bottom + height - rr;
      archRing(part, x, sy, z + .08, rr, rr + .11, .09, M.woodDark);
      box(part, .1, height - rr + .04, .1, [x - rr - .055, bottom + (height - rr) / 2, z + .13], M.woodDark);
      box(part, .1, height - rr + .04, .1, [x + rr + .055, bottom + (height - rr) / 2, z + .13], M.woodDark);
      box(part, width + .38, .12, .24, [x, bottom - .025, z + .095], M.stoneLight, undefined, .018);
      if (door) {
        archFill(part, width - .24, height - .18, .018, [x,bottom+.1,z+.126], M.woodLight);
        archFill(part, width - .35, height * .61, .022, [x,bottom+height*.38,z+.15], M.glass);
        for (let i = -3; i <= 3; i++) box(part, .025, height * .37, .025, [x+i*width/8,bottom+height*.2,z+.166], M.woodDark);
        box(part, .07, height-.08, .045, [x,bottom+height/2,z+.19], M.woodDark);
        box(part, width-.12, .1, .055, [x,bottom+height*.38,z+.19], M.woodDark);
        box(part, width-.2, .065, .045, [x,bottom+height*.73,z+.19], M.wood);
        for (const dx of [-.15,.15]) {
          box(part,.065,.25,.045,[x+dx,bottom+.83,z+.225],M.gold,undefined,.012);
          sphere(part,.046,[x+dx,bottom+.84,z+.262],M.gold,[.8,1,1]);
        }
        for (const dx of [-width*.4,width*.4]) for (const yy of [.4,1.1]) box(part,.17,.048,.035,[x+dx,bottom+yy,z+.195],M.gold);
      } else {
        box(part, .055, height - .07, .045, [x, bottom + height / 2, z + .155], M.wood);
        box(part, width-.1, .055, .045, [x, bottom + height*.43, z + .155], M.wood);
        if (width > 1) for (const dx of [-width*.25,width*.25]) box(part,.035,height*.58,.045,[x+dx,bottom+height*.3,z+.155],M.wood);
      }
    }
    function windowSide(side, z, bottom, width, height) {
      const part = 'side-windows', x = side * 3.045, rot = side * Math.PI / 2;
      archFill(part,width+.15,height+.1,.08,[x,bottom-.025,z],M.recess,[0,rot,0]);
      archFill(part,width,height,.11,[x+side*.035,bottom,z],M.glass,[0,rot,0]);
      const sy=bottom+height-width/2;
      archRing(part,x+side*.105,sy,z,width/2,width/2+.1,.09,M.woodDark,rot);
      for (const zz of [-width/2-.05,width/2+.05]) box(part,.16,height-width/2,.095,[x+side*.12,bottom+(height-width/2)/2,z+zz],M.wood);
      box(part,.14,height-.06,.05,[x+side*.17,bottom+height/2,z],M.wood);
      box(part,.14,.05,width-.08,[x+side*.17,bottom+height*.43,z],M.wood);
      box(part,.3,.12,width+.34,[x+side*.08,bottom-.035,z],M.stoneLight,undefined,.015);
    }
    // Foundation and a recessed lower facade leave the arcade as real negative space.
    box('foundation',6.45,.22,5.35,[0,.11,-.02],M.stoneAlt,undefined,.025);
    box('foundation',6.28,.12,5.2,[0,.28,-.04],M.stone,undefined,.018);
    box('lower-walls',6.05,2.43,4.26,[0,1.535,-.25],M.stone);
    box('upper-walls',6.05,2.02,4.26,[0,3.83,-.25],M.plaster);
    box('arcade-floor',6.34,.15,1.1,[0,.315,2.52],M.stoneLight,undefined,.012);
    for(let i=0;i<3;i++)box('entry-steps',2.3-i*.12,.12, .64-i*.16,[0,.06+i*.105,3.03-i*.12],i%2?M.stoneLight:M.stoneAlt,undefined,.014);
    // Discrete courses make the load-bearing piers readable in the game camera.
    for(const x of [-2.97,-.99,.99,2.97]) {
      box('arcade',.67,.27,.76,[x,.48,2.65],M.stoneAlt,undefined,.025);
      box('arcade',.55,.19,.65,[x,.7,2.65],M.stoneLight,undefined,.018);
      for(let j=0;j<4;j++)box('arcade',.43,.219,.55,[x,.907+j*.228,2.65],j%3===1?M.stoneAlt:M.stone,undefined,.012);
      box('arcade',.62,.17,.68,[x,1.75,2.65],M.stoneLight,undefined,.018);
    }
    for(const x of [-1.98,0,1.98])archStones(x,1.75,2.36,.78,1.02);
    box('arcade',6.38,.23,.65,[0,2.79,2.65],M.stone);
    // Stone blocks on the plinth and restrained masonry strips on the side walls.
    for(let side of [-1,1]) {
      for(let j=0;j<6;j++)for(let i=0;i<5;i++)box('masonry-courses',.04,.28,.77,[side*3.04,.58+j*.37,-2.0+i*.83+(j%2)*.05],(i+j)%4===0?M.stoneLight:M.stoneAlt);
      for(let j=0;j<3;j++)box('masonry-courses',.48,.29,.48,[side*2.8,.65+j*.45,-2.16],j%2?M.stoneLight:M.stone);
    }
    // The continuous timber balcony is supported by the four stone piers.
    box('balcony',6.58,.24,1.26,[0,2.96,2.29],M.woodDark,undefined,.024);
    box('balcony',6.48,.12,1.16,[0,3.1,2.29],M.plank,undefined,.016);
    box('balcony',6.6,.17,.18,[0,2.98,2.91],M.woodLight,undefined,.017);
    for(const x of [-3.1,-1.02,1.02,3.1]) {
      box('balcony',.2,.85,.2,[x,3.56,2.82],M.wood,undefined,.018);
      box('balcony',.29,.1,.29,[x,4.0,2.82],M.woodLight,undefined,.015);
      add('balcony',new THREE.ConeGeometry(.16,.15,4),M.gold,[x,4.12,2.82],[0,Math.PI/4,0]);
    }
    for(let i=0;i<=19;i++)box('balcony',.09,.69,.09,[-2.94+i*.31,3.56,2.82],i%4===0?M.woodLight:M.wood);
    box('balcony',6.45,.14,.16,[0,3.91,2.82],M.woodLight,undefined,.018);
    box('balcony',6.35,.1,.12,[0,3.23,2.82],M.wood);
    for(const side of [-1,1]) {
      box('balcony',.13,.13,1.02,[side*3.1,3.91,2.3],M.woodLight,undefined,.012);
      for(let j=0;j<4;j++)box('balcony',.09,.69,.09,[side*3.1,3.56,1.91+j*.23],M.wood);
      beam('timber-frame',[side*2.95,2.56,2.0],[side*2.95,2.9,2.72],.17,.15,M.wood);
    }
    // Upper timber frame wraps all four faces and meets the roof eaves.
    for(const yy of [3.09,4.79])box('timber-frame',6.27,.18,4.52,[0,yy,-.25],M.woodDark);
    for(const side of [-1,1])for(const zz of [-2.4,1.9])box('timber-frame',.2,1.62,.2,[side*3.02,3.95,zz],M.wood);
    for(const x of [-2.72,-.94,.94,2.72])box('timber-frame',.17,1.6,.16,[x,3.94,1.96],M.wood);
    for(const side of [-1,1])for(const zz of [-1.35,.5])box('timber-frame',.17,1.62,.16,[side*3.08,3.95,zz],M.wood);
    for(const side of [-1,1]) {
      beam('timber-frame',[side*2.72,4.72,1.99],[side*2.24,4.27,1.99],.12,.1,M.woodLight);
      beam('timber-frame',[side*3.11,3.22,-2.27],[side*3.11,3.73,-1.85],.11,.12,M.woodLight);
    }
    // Three upper arched balcony windows and the broad center double entrance.
    windowFront(0,.39,1.89,1.6,2.06,true);
    for(const x of [-1.98,1.98])windowFront(x,.77,1.89,.9,1.45);
    for(const x of [-1.91,0,1.91])windowFront(x,3.28,1.93,1.04,1.35);
    for(const side of [-1,1])for(const zz of [-1.38,.58]) { windowSide(side,zz,.83,.77,1.35); windowSide(side,zz,3.33,.78,1.25); }
    // Rear is inferred as a compatible, closed timber-and-stone facade.
    for(const xx of [-2,0,2]) {
      box('rear-facade',.15,4.16,.15,[xx,2.58,-2.43],M.wood);
      box('rear-facade',.82,1.03,.08,[xx,3.92,-2.46],M.glass);
      box('rear-facade',.055,1.08,.12,[xx,3.92,-2.49],M.wood);
      box('rear-facade',.88,.07,.12,[xx,3.92,-2.49],M.wood);
    }
    // Main slate roof: a broad gable running along X.
    const rz=-.25, ridge=6.5, eave=4.86, reach=2.54, slope=Math.atan2(ridge-eave,reach), length=Math.hypot(reach,ridge-eave);
    for(const side of [-1,1]) {
      box('roof',6.76,.13,length+.12,[0,(ridge+eave)/2,rz+side*reach/2],M.roofDark,[side*slope,0,0]);
      for(let row=0;row<7;row++)for(let col=0;col<13;col++) {
        const xx=-3.1+col*.52+(row%2)*.08, zz=rz+side*(reach-(row+.5)*reach/7), yy=eave+(row+.5)*(ridge-eave)/7+.075;
        const ww=Math.min(.51,6.7/13); if(xx+ww/2>3.36)continue;
        box('roof',ww,.045,length/7+.055,[xx,yy,zz],(row+col*3)%8===0?M.roofLight:(row*2+col)%4===0?M.roofAlt:M.roof,[side*slope,0,0],.009);
      }
      beam('roof-trim',[-3.34,eave-.03,rz+side*reach],[3.34,eave-.03,rz+side*reach],.16,.18,M.woodLight);
    }
    // Solid gable ends and their timber braces close the roof volume.
    for(const side of [-1,1]) {
      polygon('gable-infill',[[-2.53,0],[2.53,0],[0,1.6]],.15,[side*3.02,eave,-.25],M.plaster,[0,side*Math.PI/2,0]);
      for(const sign of [-1,1])beam('roof-trim',[side*3.29,eave,rz+sign*reach],[side*3.29,ridge,rz],.18,.19,M.wood);
      beam('timber-frame',[side*3.13,eave,rz],[side*3.13,ridge-.13,rz],.14,.14,M.wood);
      beam('timber-frame',[side*3.14,eave,rz-1.9],[side*3.14,ridge-.25,rz],.12,.12,M.wood);
      beam('timber-frame',[side*3.14,eave,rz+1.9],[side*3.14,ridge-.25,rz],.12,.12,M.wood);
    }
    // Central cross gable projects forward, giving the hotel its reference silhouette.
    const crossHalf=1.64,crossTop=6.65,crossBase=4.87, crossSlope=Math.atan2(crossTop-crossBase,crossHalf), crossLen=Math.hypot(crossHalf,crossTop-crossBase);
    polygon('front-gable',[[-crossHalf,0],[crossHalf,0],[0,crossTop-crossBase]],.14,[0,crossBase,2.48],M.plaster);
    polygon('gable-infill',[[-crossHalf,0],[crossHalf,0],[0,crossTop-crossBase]],.08,[0,crossBase,-.075],M.plaster);
    for(const side of [-1,1]) {
      box('cross-roof',crossLen+.14,.13,2.78,[side*crossHalf/2,(crossTop+crossBase)/2,1.35],M.roofDark,[0,0,-side*crossSlope]);
      for(let row=0;row<5;row++)for(let col=0;col<7;col++) {
        const xx=side*(crossHalf-(row+.5)*crossHalf/5), yy=crossBase+(row+.5)*(crossTop-crossBase)/5+.08, zz=.13+col*.395;
        box('cross-roof',crossLen/5+.05,.042,.388,[xx,yy,zz],(row+col)%4===0?M.roofLight:(row+col)%3===0?M.roofAlt:M.roof,[0,0,-side*crossSlope],.007);
      }
      beam('roof-trim',[side*1.74,4.84,2.78],[0,6.72,2.78],.2,.22,M.woodLight);
      beam('roof-trim',[side*1.75,4.9,2.84],[0,6.74,2.84],.045,.045,M.gold);
      beam('timber-frame',[side*1.32,4.94,2.66],[0,6.4,2.66],.13,.12,M.wood);
    }
    box('timber-frame',3.1,.16,.18,[0,4.95,2.63],M.woodDark);
    box('timber-frame',.15,1.45,.13,[0,5.65,2.65],M.wood);
    windowFront(0,5.22,2.65,.6,.87);
    beam('roof-trim',[-3.31,6.55,rz],[3.31,6.55,rz],.09,.1,M.gold);
    beam('roof-trim',[0,6.7,.05],[0,6.7,2.78],.09,.1,M.gold);
    for(const p of [[0,6.72,2.78],[-3.26,6.58,rz],[3.26,6.58,rz]]) {
      box('roof-trim',.19,.16,.19,p,M.gold,undefined,.025);
      add('roof-trim',new THREE.ConeGeometry(.13,.18,4),M.gold,[p[0],p[1]+.16,p[2]],[0,Math.PI/4,0]);
    }
    // Offset warm-stone chimney with visible staggered courses and open dark cap.
    for(let j=0;j<5;j++)box('chimney',.63,.23,.65,[2.07,5.64+j*.238,-.83],j%3===0?M.stoneAlt:M.stone,undefined,.015);
    box('chimney',.82,.17,.82,[2.07,6.76,-.83],M.stoneLight,undefined,.025);
    box('chimney',.54,.035,.54,[2.07,6.86,-.83],M.recess);
    // Pointed navy banners and shallow gold tide emblems.
    for(const x of [-1.98,1.98]) {
      beam('banners',[x-.48,1.69,3.025],[x+.48,1.69,3.025],.055,.055,M.gold);
      for(const dx of [-.43,.43])sphere('banners',.07,[x+dx,1.69,3.025],M.gold);
      const pts=[[-.38,.49],[.38,.49],[.38,-.34],[0,-.61],[-.38,-.34]];
      polygon('banners',pts,.035,[x,1.12,3.02],M.gold);
      polygon('banners',pts.map(p=>[p[0]*.87,p[1]*.87]),.026,[x,1.12,3.06],M.navy);
      crest('banners',x,1.16,3.092,.43);
      for(const dx of [-.29,.29])box('banners',.055,.07,.06,[x+dx,1.63,3.067],M.gold,undefined,.012);
    }
    // Lantern bodies have an open, substantial brass cage and kit-managed luminous cores.
    function lantern(x,y,z) {
      box('lanterns',.12,.19,.1,[x,y+.3,z-.2],M.woodDark);
      beam('lanterns',[x,y+.36,z-.22],[x,y+.36,z],.05,.05,M.gold);
      cyl('lanterns',.05,.05,.15,[x,y+.27,z],M.gold,8);
      box('lanterns',.25,.36,.23,[x,y-.02,z],M.glass,undefined,.018);
      for(const dx of [-.14,.14])for(const dz of [-.13,.13])box('lanterns',.035,.39,.035,[x+dx,y-.02,z+dz],M.gold);
      box('lanterns',.35,.07,.32,[x,y-.24,z],M.gold,undefined,.018);
      box('lanterns',.35,.06,.32,[x,y+.19,z],M.gold,undefined,.018);
      add('lanterns',new THREE.ConeGeometry(.255,.18,4),M.gold,[x,y+.29,z],[0,Math.PI/4,0]);
      sphere('lanterns',.055,[x,y-.32,z],M.gold);
    }
    for(const x of [-.99,.99])lantern(x,2.13,3.02);
    for(const x of [-1.0,1.0])lantern(x,4.36,2.31);
    // Balcony planters remain sparse so that the front rail reads from a distance.
    for(const x of [-2.2,2.2]) {
      box('planters',.81,.2,.31,[x,3.29,2.77],M.woodDark,undefined,.018);
      box('planters',.87,.07,.35,[x,3.4,2.77],M.woodLight,undefined,.012);
      for(let j=0;j<7;j++) {
        const xx=x-.33+j*.11, yy=3.48+Math.sin(j*1.7)*.035, zz=2.76+(j%2)*.1;
        sphere('planters',.15,[xx,yy,zz],j%3?M.leaf:M.leafLight,[1.2,.45,.75]);
        if(j%2===0) { sphere('planters',.055,[xx,yy+.075,zz+.04],M.gold,[.7,.7,.5]); for(let k=0;k<4;k++)sphere('planters',.047,[xx+Math.cos(k*Math.PI/2)*.058,yy+.08+Math.sin(k*Math.PI/2)*.045,zz+.055],M.flower,[1,.7,.55]); }
      }
    }
    // Flat sign backing: game label is placed 0.05m in front of its navy face.
    box('sign-backing',2.62,.69,.14,[0,3.15,3.015],M.woodDark,undefined,.025);
    box('sign-backing',2.4,.55,.035,[0,3.15,3.1025],M.navy);
    for(const dx of [-1.24,1.24])sphere('sign-backing',.035,[dx,3.15,3.112],M.gold,[1,1,.5]);
    g.userData.sign = [0,3.15,3.17];
    // Batch only within semantic assemblies and retain UVs for kit surface treatment.
    const groups = new Map();
    for(const b of batches.values()) {
      if(!groups.has(b.part)) { const p = new THREE.Group(); p.name=b.part; groups.set(b.part,p);g.add(p); }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
      geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));
      geo.computeBoundingBox();geo.computeBoundingSphere();
      const mesh=new THREE.Mesh(geo,b.material);mesh.name=b.part+'-'+materialIds.get(b.material);mesh.castShadow=true;mesh.receiveShadow=true;groups.get(b.part).add(mesh);
    }
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// camp
/* Tidal Academy: stylized crescent camp, reconstructed with img2threejs staged sculpt spec. */
(function (root) {
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.BLDMODELS = I.BLDMODELS || {};
  I.BLDMODELS['camp'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = 'camp';
    const M = {
      canvas: kit.mat('#eee1c8', { roughness: .94 }),
      shade: kit.mat('#d8c3a0', { roughness: .95 }),
      wood: kit.mat('#8f6040', { roughness: .8 }, 'wall'),
      light: kit.mat('#ba8756', { roughness: .78 }, 'wall'),
      dark: kit.mat('#563a27', { roughness: .88 }, 'wall'),
      gold: kit.mat('#d8b45a', { roughness: .4, metalness: .7 }),
      rope: kit.mat('#c9aa7d', { roughness: .93 }),
      stone: kit.mat('#c9c0ac', { roughness: .9 }, 'stone'),
      stone2: kit.mat('#e3dac5', { roughness: .88 }, 'stone'),
      flag: kit.mat('#304a7b', { roughness: .9 }),
      fire: kit.mat('#ff9a3c', { roughness: .75, emissive: '#ff9a3c', emissiveIntensity: 1.2, transparent: true, opacity: .86 }),
      glass: kit.win()
    };
    M.canvas.side = M.shade.side = M.flag.side = THREE.DoubleSide;
    const groups = {}, batches = new Map();
    function group(name) { if (!groups[name]) { const v = new THREE.Group(); v.name = name; g.add(v); groups[name] = v; } return groups[name]; }
    function add(geo, mat, part, x, y, z, rx, ry, rz, sx, sy, sz) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x || 0, y || 0, z || 0), q, new THREE.Vector3(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz)));
      const src = geo.index ? geo.toNonIndexed() : geo; const key = part + ':' + mat.uuid;
      if (!batches.has(key)) batches.set(key, { part, mat, positions: [], normals: [], uvs: [] });
      const b = batches.get(key), p = src.getAttribute('position'), n = src.getAttribute('normal'), u = src.getAttribute('uv');
      for (let i = 0; i < p.count; i++) { b.positions.push(p.getX(i), p.getY(i), p.getZ(i)); b.normals.push(n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0); b.uvs.push(u ? u.getX(i) : p.getX(i), u ? u.getY(i) : p.getY(i)); }
      if (src !== geo) src.dispose(); geo.dispose();
    }
    function box(part, mat, x, y, z, w, h, d, rx, ry, rz) { add(new THREE.BoxGeometry(w, h, d), mat, part, x, y, z, rx, ry, rz); }
    function ball(part, mat, x, y, z, r, sx, sy, sz) { add(new THREE.SphereGeometry(r, 10, 6), mat, part, x, y, z, 0, 0, 0, sx, sy, sz); }
    function beam(part, mat, a, b, r, r2) { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va); const geo = new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, d.length(), 8); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); const c = va.add(vb).multiplyScalar(.5); add(geo, mat, part, c.x, c.y, c.z); }
    function tube(part, mat, points, radius, segs) { const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))); add(new THREE.TubeGeometry(curve, segs || 16, radius, 5, false), mat, part); }
    function profile(part, mat, pts, depth, x, y, z, rx, ry, rz, bevel, centerDepth) { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 1, steps: 1, curveSegments: 16 }); if (centerDepth) geo.translate(0, 0, -depth / 2); add(geo, mat, part, x, y, z, rx, ry, rz); }
    function meshSurface(part, mat, rows, cols, fn) { const p = [], uv = [], indices = []; for (let v = 0; v <= rows; v++) for (let u = 0; u <= cols; u++) { p.push(...fn(u / cols, v / rows)); uv.push(u / cols, v / rows); } for (let v = 0; v < rows; v++) for (let u = 0; u < cols; u++) { let a = v * (cols + 1) + u; indices.push(a, a + 1, a + cols + 2, a, a + cols + 2, a + cols + 1); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals(); add(geo, mat, part); }
    function crescent(part, r, x, y, z, basis) { const shape = new THREE.Shape(), inner = r * .97, c = r * .43, ix = (r * r - inner * inner + c * c) / (2 * c), iy = Math.sqrt(r * r - ix * ix), a = Math.atan2(iy, ix), b = Math.atan2(iy, ix - c); shape.moveTo(ix, iy); shape.absarc(0, 0, r, a, Math.PI * 2 - a, false); shape.absarc(c, 0, inner, -b, b, true); shape.closePath(); const geo = new THREE.ExtrudeGeometry(shape, { depth: .012, bevelEnabled: false, curveSegments: 24 }); if (basis) geo.applyMatrix4(basis); add(geo, M.gold, part, x, y, z); }
    function star(part, r, x, y, z, basis) { const pts = []; for (let i = 0; i < 8; i++) { let a = Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? r * .28 : r; pts.push([Math.cos(a) * q, Math.sin(a) * q]); } const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: .018, bevelEnabled: false }); if (basis) geo.applyMatrix4(basis); add(geo, M.gold, part, x, y, z); }
    // Two continuous canvas roof shells carry broad tension folds and darker rolled hems.
    const yAt = t => 1.91 - 1.85 * t - .065 * Math.sin(t * Math.PI);
    for (const side of [-1, 1]) {
      meshSurface('tent', M.canvas, 10, 12, (u, v) => { const z = -.89 + u * 1.43, x = side * (1.25 * v + .018 * Math.sin(u * Math.PI * 6) * Math.sin(v * Math.PI)); return [x, yAt(v) + .018 * Math.sin(u * Math.PI * 6 + .6) * Math.sin(v * Math.PI), z]; });
      tube('tent', M.shade, [[side * 1.25, .07, -.91], [side * 1.27, .065, -.3], [side * 1.25, .07, .55]], .036, 18);
      for (const z of [-.88, -.16, .53]) tube('tent', M.shade, [[0, 1.924, z], [side * .4, 1.29, z], [side * .85, .62, z], [side * 1.25, .07, z]], .012, 18);
      // The entrance flaps have a pulled-in waist, leaving an actual walk-through opening.
      meshSurface('tent', M.canvas, 14, 5, (u, v) => { const outer = 1.24 * v, inner = .63 * Math.sin(Math.PI * v * .6) + .13 * v, x = side * (outer * (1 - u) + inner * u), yy = 1.95 * (1 - v) + .055; return [x, yy + .045 * Math.sin(u * Math.PI) * Math.sin(v * 12), .552 + .027 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI)]; });
      tube('tent', M.shade, [[0, 1.96, .58], [side * .36, 1.37, .58], [side * .63, .82, .58], [side * .72, .06, .58]], .027, 22);
      beam('tent', M.wood, [side * 1.29, .065, .48], [0, 1.96, .48], .057, .071);
      beam('tent', M.wood, [side * 1.27, .065, -.88], [0, 1.96, -.88], .057, .067);
      beam('tent', M.wood, [side * 1.34, .02, .48], [side * 1.3, .36, .48], .056, .066);
      beam('tent', M.wood, [side * 1.34, .02, -.88], [side * 1.3, .33, -.88], .056, .066);
      tube('tent', M.rope, [[side * .58, .78, .58], [side * .72, .74, .59], [side * .76, .79, .58], [side * .64, .84, .58], [side * .58, .78, .58]], .022, 16);
      ball('tent', M.gold, side * .67, .8, .597, .055, 1, 1, .6);
      tube('tent', M.rope, [[side * .66, .78, .58], [side * .68, .63, .58], [side * .64, .58, .58]], .017, 10);
    }
    // Rear closure, floor and warm inside rim remain visible through the real front opening.
    profile('tent', M.dark, [[-1.25, .035], [1.25, .035], [0, 1.93]], .025, 0, 0, -.91);
    box('tent', M.dark, 0, .026, -.19, 2.5, .05, 1.48);
    box('tent', M.light, 0, .057, .47, 1.22, .045, .15);
    beam('tent', M.wood, [0, 1.99, -.94], [0, 1.99, .57], .076, .076);
    for (const z of [-.83, .47]) {
      beam('tent', M.wood, [0, 1.83, z], [0, 2.1, z], .075, .07);
      add(new THREE.ConeGeometry(.091, .09, 6), M.gold, 'tent', 0, 2.11, z);
      for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(.098, .02, 5, 16), M.rope, 'tent', 0, 1.963 + k * .036, z, Math.PI / 2, 0, -.3);
    }
    // Gold insignia is attached to the right slope, not floating in front of the entry.
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-.572, .82, 0), new THREE.Vector3(.82, .572, 0));
    crescent('tent', .265, .61, 1.04, -.17, basis); star('tent', .125, .61, 1.04, -.29, basis);
    // A short navy pennant and crescent rise above the rear ridge.
    beam('tent', M.wood, [0, 2.06, -.74], [.77, 2.06, -.74], .027);
    meshSurface('tent', M.flag, 5, 8, (u, v) => [.17 + u * .57, 2.045 - v * (.33 + .065 * u), -.73 + .035 * Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI)]);
    crescent('tent', .083, .43, 1.87, -.69);
    // Compact radial stone hearth sits clear of the campsite's interaction spot.
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = .313, x = .9 + Math.cos(a) * r, z = 1.2 + Math.sin(a) * r; const w = .185 + (i % 3) * .006; profile('fire-ring', i % 3 ? M.stone2 : M.stone, [[-w / 2, -.075], [w / 2, -.075], [w / 2 + .018, .055], [.05, .105], [-.075, .09], [-w / 2 - .012, .025]], .15, x, .1, z, 0, -a, 0, .012, true); }
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; beam('fire-logs', M.dark, [.9 - Math.cos(a) * .24, .115, 1.2 - Math.sin(a) * .24], [.9 + Math.cos(a) * .24, .185, 1.2 + Math.sin(a) * .24], .061, .047); }
    const fs = new THREE.Shape(); fs.moveTo(-.13, 0); fs.bezierCurveTo(-.25, .17, -.04, .2, -.07, .38); fs.bezierCurveTo(.02, .28, .01, .15, .055, .14); fs.bezierCurveTo(.105, .24, .16, .34, .1, .5); fs.bezierCurveTo(.31, .26, .2, .08, .13, 0); fs.closePath();
    for (let i = 0; i < 3; i++) add(new THREE.ExtrudeGeometry(fs, { depth: .026, bevelEnabled: false, curveSegments: 12 }), M.fire, 'flame', .9, .16, 1.2, 0, i * Math.PI / 3, 0, i === 1 ? .78 : .9, i === 1 ? .85 : 1, 1);
    // Board-built supply crate, with batched brass corner plates and a warm lantern.
    const cx = 1.21, cz = .28;
    box('supply-crate', M.dark, cx, .245, cz, .53, .47, .5);
    for (let j = 0; j < 4; j++) { const y = .08 + j * .105; for (const side of [-1, 1]) { box('supply-crate', j % 2 ? M.wood : M.light, cx, y, cz + side * .257, .51, .091, .025); box('supply-crate', j % 2 ? M.light : M.wood, cx + side * .28, y, cz, .025, .091, .49); } }
    for (let j = 0; j < 4; j++) box('supply-crate', j % 2 ? M.wood : M.light, cx - .205 + j * .137, .489, cz, .128, .035, .52);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = cx + sx * .245, z = cz + sz * .235; box('supply-crate', M.wood, x, .25, z, .073, .5, .072); for (const y of [.065, .46]) { box('supply-crate', M.gold, x, y, z + sz * .043, .09, .085, .018); ball('supply-crate', M.gold, x, y, z + sz * .057, .018, 1, 1, .5); } }
    box('lantern', M.gold, cx, .535, cz, .255, .065, .25);
    box('lantern', M.glass, cx, .7, cz, .18, .28, .175);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam('lantern', M.gold, [cx + sx * .105, .55, cz + sz * .103], [cx + sx * .105, .86, cz + sz * .103], .013);
    for (const sz of [-1, 1]) { beam('lantern', M.gold, [cx - .09, .57, cz + sz * .112], [cx + .09, .83, cz + sz * .112], .008); beam('lantern', M.gold, [cx + .09, .57, cz + sz * .112], [cx - .09, .83, cz + sz * .112], .008); }
    box('lantern', M.gold, cx, .86, cz, .255, .035, .25);
    add(new THREE.ConeGeometry(.183, .115, 4), M.gold, 'lantern', cx, .927, cz, 0, Math.PI / 4, 0, 1, 1, 1);
    ball('lantern', M.gold, cx, .994, cz, .037, 1, .6, 1);
    add(new THREE.TorusGeometry(.058, .012, 5, 16), M.gold, 'lantern', cx, 1.055, cz);
    // Blank flat board: game text overlays at the declared centre.
    const signPost = new THREE.CylinderGeometry(.041, .048, 1.13, 8);
    signPost.translate(-1.4, .565, .97);
    const signPostPositions = signPost.getAttribute('position');
    for (let i = 0; i < signPostPositions.count; i++) if (Math.abs(signPostPositions.getY(i)) < 1e-7) signPostPositions.setY(i, 0);
    add(signPost, M.wood, 'sign');
    box('sign', M.dark, -1.4, 1.02, 1, 1.25, .35, .075);
    box('sign', M.light, -1.4, 1.02, 1.045, 1.2, .3, .026);
    for (const x of [-1.97, -.83]) for (const y of [.9, 1.14]) ball('sign', M.gold, x, y, 1.064, .014, 1, 1, .5);
    for (const b of batches.values()) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(b.positions, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.normals, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uvs, 2)); geo.computeBoundingBox(); geo.computeBoundingSphere(); const mesh = new THREE.Mesh(geo, b.mat); mesh.name = b.part + '-' + Object.keys(M).find(k => M[k] === b.mat); mesh.castShadow = true; mesh.receiveShadow = true; group(b.part).add(mesh); }
    groups.tent.scale.z = .95;
    g.userData.sign = [-1.4, 1.02, 1.108];
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// diy
/* Tidal Academy: image-reconstructed timber workshop and striped market. */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};
  I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS['diy']=function(THREE,kit){
    const STAGE=4,g=new THREE.Group();g.name='tidal-diy';
    const M={wood:kit.mat('#8b5b3b',{roughness:.84},'wall'),woodLight:kit.mat('#b28351',{roughness:.8},'wall'),woodDark:kit.mat('#4f382a',{roughness:.95},'wall'),navy:kit.mat('#324e77',{roughness:.94}),gold:kit.mat('#d5ab58',{roughness:.44,metalness:.45}),steel:kit.mat('#6d7c8f',{roughness:.6,metalness:.25})};
    if('diy'==='market'){delete M.navy;delete M.steel;M.stone=kit.mat('#e8dfca',{roughness:.94},'stone');M.stoneShade=kit.mat('#d5c7ad',{roughness:.96},'stone');M.red=kit.mat('#c86450',{roughness:.94});M.cream=kit.mat('#f3e5c9',{roughness:.96});M.fruitRed=kit.mat('#c9533d',{roughness:.62});M.fruitGold=kit.mat('#e2b64c',{roughness:.67});M.leaf=kit.mat('#67834c',{roughness:.88});}
    const parts=new Map();
    function put(part,geo,mat){if(!geo.getAttribute('normal'))geo.computeVertexNormals();if(!geo.getAttribute('uv'))geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count*2),2));if(!parts.has(part))parts.set(part,[]);parts.get(part).push({geo:geo.index?geo.toNonIndexed():geo,mat});}
    function tr(geo,x,y,z,rx=0,ry=0,rz=0){return geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));}
    function box(part,x,y,z,w,h,d,mat,bevel=.007,rx=0,ry=0,rz=0){let geo;if(STAGE>=2&&bevel>0&&Math.min(w,h,d)>bevel*3){const b=Math.min(bevel,w/4,h/4,d/4),s=new THREE.Shape();s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();geo=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,steps:1,curveSegments:1});geo.translate(0,0,-d/2+b);}else geo=new THREE.BoxGeometry(w,h,d);put(part,tr(geo,x,y,z,rx,ry,rz),mat);}
    function beam(part,a,b,r,mat,r2=r,seg=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),geo=new THREE.CylinderGeometry(r2,r,v.length(),seg);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate(...A.clone().add(B).multiplyScalar(.5).toArray());put(part,geo,mat);}
    function sphere(part,x,y,z,r,mat,sx=1,sy=1,sz=1,segments=8,rings=5){const geo=new THREE.SphereGeometry(r,segments,rings);geo.scale(sx,sy,sz);put(part,tr(geo,x,y,z),mat);}
    function shape(part,points,depth,x,y,z,mat,rx=0,ry=0,rz=0){const s=new THREE.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();put(part,tr(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:1}),x,y,z,rx,ry,rz),mat);}
    function tube(part,pts,r,mat,n=12){put(part,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),n,r,5,false),mat);}
    function sheet(part,points,mat){const geo=new THREE.BufferGeometry(),[a,b,c,d]=points;geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...c,...b,...a,...d,...c,...a,...b,...c,...a,...c,...d],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,1,1,0,0,0,0,1,1,1,0,0,1,0,1,1,0,0,1,1,0,1],2));geo.computeVertexNormals();put(part,geo,mat);}
    function stud(x,y,z,r=.023){sphere('fasteners',x,y,z,r,M.gold,1,1,.5,6,3);}
    function brace(part,a,b,width,depth,mat){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A),geo=new THREE.BoxGeometry(width,dir.length(),depth);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));geo.translate(...A.clone().add(B).multiplyScalar(.5).toArray());put(part,geo,mat);}
        const W=1.78,D=.99;
    // Broad planked tabletop stays at the requested 0.85 meter working height.
    for(let j=0;j<5;j++)box('bench',0,.797,-.4+j*.2,W,.106,.191,j%2?M.wood:M.woodLight,.01);
    for(const x of [-.75,.75])for(const z of [-.38,.38]){box('frame',x,.39,z,.125,.78,.125,M.wood,.012);box('frame',x,.065,z,.2,.13,.2,M.woodDark,.008);if(STAGE>=1){box('fasteners',x,.075,z,.22,.12,.22,M.gold,.009);stud(x,.083,z+.115);}}
    for(const z of [-.38,.38])box('frame',0,.66,z,1.6,.14,.105,M.wood,.01);
    for(const x of [-.75,.75])box('frame',x,.23,0,.1,.1,.85,M.wood,.007);
    box('frame',0,.22,-.38,1.57,.1,.1,M.wood,.008);
    if(STAGE>=1)for(const x of [-.75,.75])for(const z of [-.38,.38])brace('frame',[x,.3,z],[x-Math.sign(x)*.32,.69,z],.07,.07,M.wood);
    // Uprights, real diagonal braces, squared gold collars and pointed finials.
    for(const x of [-.8,.8])for(const z of [-.43,.43]){const top=z<0?2.08:1.91;box('frame',x,(.85+top)/2,z,.105,top-.85,.105,M.wood,.008);box('frame',x,.895,z,.16,.1,.16,M.woodLight,.009);if(STAGE>=1){box('fasteners',x,.92,z,.18,.09,.18,M.gold,.007);stud(x,.922,z+.095);box('fasteners',x,top,z,.17,.11,.16,M.gold,.008);put('fasteners',tr(new THREE.ConeGeometry(.094,.1,4),x,top+.102,z,0,Math.PI/4),M.gold);}}
    for(const z of [-.43,.43])box('frame',0,z<0?1.974:1.818,z,1.76,.07,.075,M.wood,.005);
    if(STAGE>=1)for(const x of [-.8,.8])for(const z of [-.43,.43])brace('frame',[x,1.57,z],[x-Math.sign(x)*.2,z<0?1.974:1.818,z],.065,.075,M.wood);
    const roofY=t=>2.08-.22*t-.055*Math.sin(t*Math.PI);
    for(let j=0;j<6;j++){const t0=j/6,t1=(j+1)/6,y0=roofY(t0),y1=roofY(t1),z0=-.56+1.12*t0,z1=-.56+1.12*t1;sheet('canopy',[[-.96,y0,z0],[.96,y0,z0],[.96,y1,z1],[-.96,y1,z1]],M.navy);}
    box('canopy',0,1.828,.561,1.92,.074,.025,M.navy,.003);
    if(STAGE>=2){for(const x of [-.95,-.48,0,.48,.95])tube('canopy',Array.from({length:7},(_,j)=>[x,roofY(j/6)+.005,-.56+1.12*j/6]),.006,M.navy,12);for(const x of [-.8,-.26,.26,.8])box('fasteners',x,1.838,.579,.038,.07,.019,M.gold,.003);}
    if(STAGE>=1){
      // Three planks make a short rear tool rack; tools hang forward of it.
      for(let j=0;j<3;j++)box('rack',0,1.19+j*.12,-.375,1.38,.11,.06,j%2?M.wood:M.woodLight,.006);
      for(const x of [-.61,.61])for(const y of [1.2,1.43])stud(x,y,-.337,.017);
      // Hammer: octagonal broad head, leather-toned grip bands.
      beam('tools',[-.43,1.04,-.282],[-.43,1.43,-.282],.026,M.woodLight,.024,8);
      box('tools',-.43,1.45,-.28,.26,.1,.1,M.steel,.012);
      beam('tools',[-.43,1.02,-.28],[-.43,1.16,-.28],.031,M.woodDark,.031,8);
      for(let j=0;j<4;j++)beam('tools',[-.43,1.025+j*.035,-.28],[-.43,1.03+j*.035,-.28],.032,M.wood,.032,8);
      // Saw blade is a true tapered profile with coarse silhouette teeth.
      const teeth=[[.0,0],[.13,0],[.115,-.06]];for(let j=0;j<6;j++)teeth.push([.11-j*.009,-.08-j*.041],[.085-j*.009,-.095-j*.041]);teeth.push([-.03,-.35],[-.038,-.03]);
      shape('tools',teeth,.018,-.03,1.32,-.28,M.steel,0,0,-.1);
      box('tools',.005,1.39,-.27,.18,.13,.045,M.woodLight,.01,0,0,-.1);
      box('tools',.005,1.39,-.244,.105,.058,.008,M.woodDark,.004,0,0,-.1);
      // Pliers use connected jaws, two split grips and a central hinge.
      for(const side of [-1,1]){tube('tools',[[.46+side*.04,1.46,-.272],[.46+side*.057,1.39,-.272],[.46,1.3,-.272],[.46-side*.055,1.15,-.272]],.017,M.steel,9);beam('tools',[.46-side*.05,1.17,-.272],[.46-side*.082,1.025,-.272],.025,M.woodLight,.023,6);}
      sphere('tools',.46,1.3,-.251,.035,M.steel,1,1,.45,8,4);stud(.46,1.3,-.23,.012);
      for(const x of [-.43,.005,.46])stud(x,1.47,-.3,.017);
      // Clamp base, slide, separated jaws and connected screw/crank.
      box('vise',-.58,.88,.34,.39,.065,.31,M.steel,.012);box('vise',-.66,.965,.39,.2,.19,.2,M.steel,.012);box('vise',-.48,.965,.39,.13,.19,.2,M.steel,.01);box('vise',-.58,1.06,.39,.4,.035,.2,M.gold,.005);
      box('vise',-.58,1.07,.39,.026,.041,.22,M.woodDark,.002);
      box('vise',-.67,.78,.49,.15,.19,.11,M.steel,.01);beam('vise',[-.67,.84,.46],[-.67,.84,.565],.025,M.gold,.025,8);
      beam('vise',[-.72,.77,.558],[-.59,.91,.558],.014,M.gold,.014,8);sphere('vise',-.73,.756,.558,.027,M.gold,1,1,1,8,4);sphere('vise',-.58,.923,.558,.027,M.gold,1,1,1,8,4);
      for(const x of [-.76,-.4])stud(x,.917,.49,.019);
      box('workpieces',.33,.885,.11,.36,.065,.16,M.woodLight,.01,0,.12);box('workpieces',.31,.939,.11,.32,.04,.13,M.woodLight,.007,0,-.1);
    }
    if(STAGE>=4){for(let j=0;j<4;j++)box('seams',0,.852,-.3+j*.2,1.72,.002,.006,M.woodDark,0);for(const z of [-.43,.43])for(const x of [-.69,.69])stud(x,.82,z+.06,.018);}
    if(STAGE>=1){for(const x of [-.39,.39])box('sign',x,1.92,.49,.035,.22,.09,M.gold,.004);box('sign',0,2.01625,.524,1.045,.35625,.032,M.gold,.006);box('sign',0,2.01625,.544,1.0,.3125,.012,M.navy,.003);g.userData.sign=[0,2.01625,.6];}

    for(const [part,items] of parts){const positions=[],normals=[],uvs=[],mats=[],groups=[];let offset=0;for(const {mat}of items)if(!mats.includes(mat))mats.push(mat);for(let mi=0;mi<mats.length;mi++){const start=offset;for(const {geo,mat}of items){if(mat!==mats[mi])continue;if('diy'==='diy'){const p=geo.attributes.position;for(let j=0;j<p.count;j++)if(p.getY(j)>.85)p.setY(j,.85+(p.getY(j)-.85)*.8);geo.computeVertexNormals();}const p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv;positions.push(...p.array);normals.push(...n.array);uvs.push(...u.array);offset+=p.count;}groups.push({start,count:offset-start,materialIndex:mi});}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));for(const gr of groups)geo.addGroup(gr.start,gr.count,gr.materialIndex);const mesh=new THREE.Mesh(geo,mats);mesh.name=part;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);}
    if('diy'==='diy'&&g.userData.sign)g.userData.sign[1]=.85+(g.userData.sign[1]-.85)*.8;
    return g;
  };
})(typeof window!=='undefined'?window:globalThis);

// market
/* Tidal Academy: image-reconstructed red and ivory striped produce market. */
(function(root){
  'use strict';
  const I=(root.TA=root.TA||{}).ISLE=root.TA.ISLE||{};
  I.BLDMODELS=I.BLDMODELS||{};
  I.BLDMODELS['market']=function(THREE,kit){
    const STAGE=4,g=new THREE.Group();g.name='tidal-market';
    const M={wood:kit.mat('#8b5b3b',{roughness:.84},'wall'),woodLight:kit.mat('#b28351',{roughness:.8},'wall'),woodDark:kit.mat('#4f382a',{roughness:.95},'wall'),gold:kit.mat('#d5ab58',{roughness:.4,metalness:.65}),stone:kit.mat('#e8dfca',{roughness:.94},'stone'),stoneShade:kit.mat('#d5c7ad',{roughness:.96},'stone'),red:kit.mat('#c86450',{roughness:.94}),cream:kit.mat('#f3e5c9',{roughness:.96}),fruitRed:kit.mat('#c9533d',{roughness:.62}),fruitGold:kit.mat('#e2b64c',{roughness:.67}),leaf:kit.mat('#67834c',{roughness:.88})};
    const parts=new Map();
    function put(part,geo,mat){if(!geo.getAttribute('normal'))geo.computeVertexNormals();if(!geo.getAttribute('uv'))geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count*2),2));if(!parts.has(part))parts.set(part,[]);parts.get(part).push({geo:geo.index?geo.toNonIndexed():geo,mat});}
    function tr(geo,x,y,z,rx=0,ry=0,rz=0){return geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));}
    function box(part,x,y,z,w,h,d,mat,bevel=.007,rx=0,ry=0,rz=0){let geo;if(STAGE>=2&&bevel>0&&Math.min(w,h,d)>bevel*3){const b=Math.min(bevel,w/4,h/4,d/4),s=new THREE.Shape();s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();geo=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,steps:1,curveSegments:1});geo.translate(0,0,-d/2+b);}else geo=new THREE.BoxGeometry(w,h,d);put(part,tr(geo,x,y,z,rx,ry,rz),mat);}
    function beam(part,a,b,r,mat,r2=r,seg=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),geo=new THREE.CylinderGeometry(r2,r,v.length(),seg);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));geo.translate(...A.clone().add(B).multiplyScalar(.5).toArray());put(part,geo,mat);}
    function sphere(part,x,y,z,r,mat,sx=1,sy=1,sz=1,segments=8,rings=5){const geo=new THREE.SphereGeometry(r,segments,rings);geo.scale(sx,sy,sz);put(part,tr(geo,x,y,z),mat);}
    function shape(part,points,depth,x,y,z,mat,rx=0,ry=0,rz=0){const s=new THREE.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();put(part,tr(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:1}),x,y,z,rx,ry,rz),mat);}
    function tube(part,pts,r,mat,n=12){put(part,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),n,r,5,false),mat);}
    function sheet(part,points,mat){const geo=new THREE.BufferGeometry(),[a,b,c,d]=points;geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...c,...b,...a,...d,...c,...a,...b,...c,...a,...c,...d],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,1,1,0,0,0,0,1,1,1,0,0,1,0,1,1,0,0,1,1,0,1],2));geo.computeVertexNormals();put(part,geo,mat);}
    function stud(x,y,z,r=.023){sphere('fasteners',x,y,z,r,M.gold,1,1,.5,6,3);}
    function brace(part,a,b,width,depth,mat){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A),geo=new THREE.BoxGeometry(width,dir.length(),depth);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));geo.translate(...A.clone().add(B).multiplyScalar(.5).toArray());put(part,geo,mat);}
        // Four timber uprights and broad stepped ivory stone feet.
    for(const x of [-1.02,1.02])for(const z of [-.48,.48]){const top=z<0?2.22:1.96;box('frame',x,(.26+top)/2,z,.145,top-.26,.145,M.wood,.014);box('feet',x,.105,z,.35,.21,.35,M.stone,.018);box('feet',x,.265,z,.28,.14,.28,M.stone,.012);if(STAGE>=1){box('frame',x,.43,z,.22,.16,.21,M.woodLight,.012);box('fasteners',x,.44,z+.111,.08,.08,.025,M.gold,.008,0,0,Math.PI/4);box('frame',x,top,z,.22,.17,.22,M.woodLight,.012);put('frame',tr(new THREE.ConeGeometry(.151,.09,4),x,top+.125,z,0,Math.PI/4),M.woodLight);box('fasteners',x,top,z+.12,.07,.07,.024,M.gold,.005,0,0,Math.PI/4);}}
    box('frame',0,2.23,-.48,2.16,.095,.105,M.woodLight,.009);
    for(const x of [-1.02,1.02])brace('frame',[x,2.025,-.48],[x,1.715,.53],.10,.10,M.wood);
    box('counter',0,.835,0,2.28,.16,1.08,M.wood,.012);for(let j=0;j<5;j++)box('counter',0,.924,-.43+j*.215,2.3,.048,.205,M.woodLight,.006);
    if(STAGE>=1){for(const x of [-1.02,1.02])brace('frame',[x,1.4,.45],[x,1.74,.53],.085,.085,M.wood);}
    const N=9,sw=2.42/N,roofY=t=>2.23-.4*t-.075*Math.sin(t*Math.PI);
    for(let i=0;i<N;i++){const x0=-1.21+i*sw,x1=x0+sw,m=i%2?M.cream:M.red;for(let j=0;j<6;j++){let a=j/6,b=(j+1)/6;sheet('canopy',[[x0,roofY(a),-.65+a*1.36],[x1,roofY(a),-.65+a*1.36],[x1,roofY(b),-.65+b*1.36],[x0,roofY(b),-.65+b*1.36]],m);}if(STAGE>=2){const p=[[-sw/2,0],[sw/2,0],[sw/2,-.09]];for(let j=0;j<=8;j++){const a=j*Math.PI/8;p.push([Math.cos(a)*sw/2,-.09-Math.sin(a)*.065]);}shape('canopy',p,.024,(x0+x1)/2,1.835,.709,m);}}
    if(STAGE>=1){beam('frame',[-1.22,1.84,.698],[1.22,1.84,.698],.027,M.woodLight,.027,8);for(const x of [-1.21,1.21]){box('fasteners',x,1.83,.704,.055,.11,.067,M.gold,.01);}}
    function tray(x){box('trays',x,.985,.06,.63,.055,.69,M.woodDark,.006);for(const z of [-.29,.41]){for(let k=0;k<2;k++)box('trays',x,1.025+k*.08,z,.63,.071,.037,k?M.wood:M.woodLight,.005);for(const q of [-1,1]){box('trays',x+q*.281,1.064,z+.02,.058,.19,.045,M.woodLight,.004);if(z>0)for(const y of [1.02,1.11])stud(x+q*.281,y,z+.048,.013);}}for(const q of [-1,1])box('trays',x+q*.315,1.06,.06,.035,.18,.69,M.wood,.004);}
    function crate(x){box('lower-crates',x,.075,.07,.76,.05,.73,M.woodDark,.009);for(const z of [-.31,.45]){for(let k=0;k<3;k++)box('lower-crates',x,.15+k*.12,z,.76,.106,.035,k%2?M.woodLight:M.wood,.005);box('lower-crates',x-.255,.5,z,.25,.09,.035,M.woodLight,.005);box('lower-crates',x+.255,.5,z,.25,.09,.035,M.woodLight,.005);box('lower-crates',x,.543,z,.28,.025,.036,M.woodLight,.004);for(const q of [-1,1]){box('lower-crates',x+q*.35,.31,z+.02,.07,.48,.05,M.woodLight,.006);if(STAGE>=4&&z>0)for(const y of [.13,.44])stud(x+q*.35,y,z+.05,.014);}}for(const q of [-1,1])for(let k=0;k<4;k++)box('lower-crates',x+q*.39,.16+k*.12,.07,.038,.105,.75,k%2?M.wood:M.woodLight,.004);for(let j=0;j<4;j++)box('lower-crates',x,.557,-.22+j*.19,.78,.035,.177,M.wood,.004);}
    if(STAGE>=1){for(const x of [-.68,0,.68])tray(x);crate(-.43);crate(.43);
      for(let zone=0;zone<3;zone++)for(let row=0;row<3;row++)for(let i=0;i<3;i++){const x=-.68+zone*.68+(i-1)*.165+(row%2)*.018,z=-.16+row*.205,y=1.155+(row===1?.024:0);if(zone===0){sphere('produce',x,y,z,.098,M.fruitRed,1,.9,1,8,5);beam('produce',[x,y+.074,z],[x+.009,y+.112,z],.009,M.woodDark,.006,5);}else if(zone===1){sphere('produce',x,y-.015,z,.086,M.fruitGold,1,1.1,1,8,5);sphere('produce',x+.005,y+.067,z,.05,M.fruitGold,.83,1.2,.83,7,4);beam('produce',[x+.005,y+.104,z],[x+.018,y+.14,z],.008,M.woodDark,.005,5);}else{sphere('produce',x,y,z,.102,M.leaf,1,.88,1,8,5);if(STAGE>=4){for(const q of [-1,1])sphere('produce',x+q*.038,y+.037,z+.025,.056,M.leaf,.8,1,.65,6,3);}}}
    }
    if(STAGE>=4){for(let j=0;j<4;j++)box('seams',0,.951,-.325+j*.215,2.26,.002,.005,M.woodDark,0);for(const x of [-1.02,1.02])for(const z of [-.48,.48])box('feet',x,.211,z,.293,.011,.294,M.stoneShade,0);}

    // Contiguous material runs keep each semantic part to a few draw calls.
    for(const [part,items] of parts){
      const byMaterial=new Map();for(const item of items){if(!byMaterial.has(item.mat))byMaterial.set(item.mat,[]);byMaterial.get(item.mat).push(item.geo);}
      const positions=[],normals=[],uvs=[],mats=[],groups=[];let offset=0;
      for(const [mat,geos]of byMaterial){const mi=mats.length;mats.push(mat);const start=offset;for(const geo of geos){positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);uvs.push(...geo.attributes.uv.array);offset+=geo.attributes.position.count;geo.dispose();}groups.push({start,count:offset-start,materialIndex:mi});}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));for(const gr of groups)geo.addGroup(gr.start,gr.count,gr.materialIndex);geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,mats);mesh.name=part;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
    }
    return g;
  };
})(typeof window!=='undefined'?window:globalThis);
