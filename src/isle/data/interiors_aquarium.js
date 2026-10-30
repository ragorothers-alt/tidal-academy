/* 潮汐小島 · 博物館的海洋館（v9.0，Codex 製作）：TA.ISLE.INTERIORS['aquarium'] = (THREE, kit) => Group；規格見 house.js 開頭的說明。 */
(function (root) {
  'use strict';
  const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};
  I.INTERIORS = I.INTERIORS || {};
  I.INTERIORS['aquarium'] = function (THREE, kit) {
    const g = new THREE.Group(); g.name = '潮汐海洋館・水光慢慢';
    const C = { floor:'#293e50', joint:'#3a5264', wall:'#183249', ceiling:'#203e53', cream:'#fff3db', honey:'#d9ad70', dark:'#8e6747', brass:'#e7b85f', fabric:'#86acb5', seam:'#bdd7d5', sand:'#d8cba4', greenSand:'#a6b99b', deepSand:'#46545c', base:'#142b3b', paper:'#fff4df', ink:'#506f7b', fern:'#557c73', leaf:'#8fa995', pot:'#c4d1c9' };
    const kinds = { floor:'stone', joint:'stone', wall:'plaster', ceiling:'plaster', cream:'plaster', honey:'wood', dark:'wood', brass:'metal', fabric:'fabric', seam:'fabric', sand:'stone', greenSand:'stone', deepSand:'stone', base:'stone', paper:'paper', ink:'paper', fern:'foliage', leaf:'foliage', pot:'ceramic' };
    const M = {}, cols = [];
    Object.keys(C).forEach(k => {
      const kind = kinds[k];
      M[k] = kit.mat(C[k], { roughness:k === 'floor' ? .24 : kind === 'metal' ? .3 : kind === 'wood' ? .68 : .84, metalness:kind === 'metal' ? .4 : 0, side:THREE.DoubleSide }, kind);
      M[k].name = 'aquarium:' + k;
    });
    const cool = kit.lamp('#bfe8ff'), warm = kit.lamp('#ffcf9c'), shade = kit.shade('#fff3db');
    const glass = kit.glass().clone(); Object.assign(glass, { color:new THREE.Color('#d9f2ff'), opacity:.09, transparent:true, depthWrite:false, side:THREE.DoubleSide });
    const water = kit.mat('#5cb7d3', { transparent:true, opacity:.065, depthWrite:false, roughness:.18, side:THREE.FrontSide }, 'glass');
    const deepWater = kit.mat('#ffffff', { vertexColors:true, transparent:true, opacity:.14, depthWrite:false, roughness:.2, side:THREE.FrontSide }, 'glass');
    const paint = kit.mat('#ffffff', { vertexColors:true, roughness:.92, emissive:new THREE.Color('#16485e'), emissiveIntensity:.24, side:THREE.DoubleSide }, 'plaster');
    const cube = new THREE.BoxGeometry(1, 1, 1), orb = new THREE.SphereGeometry(1, 10, 6), borrowed = new Set();
    function mesh(geo, m, x=0, y=0, z=0, solid=false) {
      const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (solid) o.userData.solid = true;
      o.castShadow = !m.transparent; o.receiveShadow = true; g.add(o); return o;
    }
    function box(x, y, z, w, h, d, m, solid=false, r=0) {
      const geo = r ? kit.rbox(w, h, d, r) : cube; if (r) borrowed.add(geo);
      const o = mesh(geo, m, x, y, z, solid); if (!r) o.scale.set(w, h, d); return o;
    }
    function ball(x, y, z, sx, sy, sz, m) { const o = mesh(orb, m, x, y, z); o.scale.set(sx, sy, sz); return o; }
    function beam(a, b, r, m) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), v = B.clone().sub(A);
      const o = mesh(new THREE.CylinderGeometry(r, r, v.length(), 6), m, ...A.clone().add(B).multiplyScalar(.5).toArray());
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return o;
    }
    function ring(x, y, z, r, t, m) { const o = mesh(new THREE.TorusGeometry(r, t, 6, 64), m, x, y, z); o.rotation.x = Math.PI/2; return o; }
    function cylinder(x, y, z, r, h, m, open=false) { return mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, open), m, x, y, z); }
    function through(o, order=0) { o.userData.camThrough = true; o.renderOrder = order; return o; }
    function gradient(x, y, z, w, h, d, dark, light) {
      const geo = new THREE.BoxGeometry(w, h, d), p = geo.attributes.position, rgb = [];
      const lo = new THREE.Color(dark), hi = new THREE.Color(light);
      for (let j=0; j<p.count; j++) { const c = lo.clone().lerp(hi, (p.getY(j)+h/2)/h); rgb.push(c.r, c.g, c.b); }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(rgb, 3)); return mesh(geo, paint, x, y, z, true);
    }
    const floor = box(0, -.12, 0, 16, .24, 13, M.floor);
    const walk = mesh(cube, M.floor, 0, -.04, 0); walk.scale.set(16, .08, 13); walk.visible = false;
    walk.userData = { walk:true, prop:true, camThrough:true }; walk.name = 'aquarium:walk';
    floor.name = 'aquarium:polished-floor';
    for (let x=-7.5; x<8; x+=1.5) box(x, .002, 0, .009, .004, 13, M.joint);
    for (let z=-6; z<6.5; z+=1.5) box(0, .003, z, 16, .004, .009, M.joint);
    for (const x of [-7.83, 7.83]) box(x, .009, 0, .022, .008, 12.6, M.brass);
    for (const z of [-6.32, 6.32]) box(0, .009, z, 15.65, .008, .022, M.brass);
    box(0, 2.2, -6.6, 16.4, 4.4, .2, M.wall, true);
    for (const x of [-8.1, 8.1]) box(x, 2.2, 0, .2, 4.4, 13.4, M.wall, true);
    for (const x of [-4.75, 4.75]) box(x, 2.2, 6.6, 6.5, 4.4, .2, M.wall, true);
    const ceiling = box(0, 4.46, 0, 16.4, .12, 13.4, M.ceiling); ceiling.name = 'aquarium:ceiling';
    for (const x of [-7.92, 7.92]) for (const y of [.15, 4.22]) box(x, y, 0, .13, .18, 12.9, y<1 ? M.honey : M.cream);
    for (const z of [-6.43, 6.43]) {
      box(0, 4.22, z, 16, .18, .13, M.cream);
      if (z<0) box(0, .15, z, 16, .18, .13, M.honey);
      else for (const x of [-4.75, 4.75]) box(x, .15, z, 6.5, .18, .13, M.honey);
    }
    for (const x of [-5.4, -2.7, 2.7, 5.4]) {
      const pts = [];
      for (let j=0; j<=20; j++) { const z=-6.2+j*.62; pts.push([x+.16*Math.sin(z*.8), 4.32, z]); }
      for (let j=1; j<pts.length; j++) beam(pts[j-1], pts[j], .025, M.joint);
    }
    function tank(where, bounds, front, sand, dark, light) {
      const [x0,y0,z0,x1,y1,z1] = bounds, x=(x0+x1)/2, z=(z0+z1)/2, w=x1-x0, h=y1-y0, d=z1-z0;
      box(x, y0/2, z, w+.16, y0, d+.16, M.base, true);
      box(x, y0+.04, z, w, .08, d, sand);
      const wet = through(box(x, (y0+y1)/2, z, w, h, d, water), 1); wet.name = 'aquarium:water:' + where;
      if (front[1]) {
        gradient(x, (y0+y1)/2, z0-.05, w+.2, h, .1, dark, light);
        for (const xx of [x0-.05,x1+.05]) gradient(xx, (y0+y1)/2, z, .1, h, d, dark, light);
        through(box(x, (y0+y1)/2, -4.35, w+.06, h, .04, glass, true), 2).name = 'aquarium:glass:' + where;
        for (const yy of [y0-.05,y1+.05]) { box(x, yy, -4.35, w+.26, .14, .16, M.honey); box(x, yy, -4.245, w+.18, .025, .035, M.brass); }
        for (const xx of [x0-.06,x1+.06]) { box(xx, (y0+y1)/2, -4.35, .14, h, .16, M.honey); box(xx, (y0+y1)/2, -4.245, .025, h, .035, M.brass); }
        box(x, y1-.045, -4.48, w-.12, .045, .08, cool);
      } else {
        const side = front[0], back=side>0 ? x0-.05 : x1+.05, fx=side>0 ? -6.15 : 6.15;
        gradient(back, (y0+y1)/2, z, .1, h, d+.2, dark, light);
        for (const zz of [z0-.05,z1+.05]) gradient(x, (y0+y1)/2, zz, w, h, .1, dark, light);
        through(box(fx, (y0+y1)/2, z, .04, h, d+.06, glass, true), 2).name = 'aquarium:glass:' + where;
        for (const yy of [y0-.05,y1+.05]) { box(fx, yy, z, .16, .14, d+.26, M.honey); box(fx+side*.105, yy, z, .035, .025, d+.18, M.brass); }
        for (const zz of [z0-.06,z1+.06]) { box(fx, (y0+y1)/2, zz, .16, h, .14, M.honey); box(fx+side*.105, (y0+y1)/2, zz, .035, h, .025, M.brass); }
        box(fx-side*.13, y1-.045, z, .08, .045, d-.12, cool);
      }
    }
    const tanks = [
      { where:'reef', box:[-6,.35,-6.3,6,3.6,-4.4], front:[0,1] },
      { where:'shallow', box:[-7.9,.35,-3.2,-6.2,3,2.6], front:[1,0] },
      { where:'seagrass', box:[6.2,.35,-3.2,7.9,3,2.6], front:[-1,0] },
      { where:'deep', cyl:[0,.2,1.25,.45,3.9] }
    ];
    tank('reef', tanks[0].box, tanks[0].front, M.sand, '#123a59', '#68abbc');
    tank('shallow', tanks[1].box, tanks[1].front, M.sand, '#185067', '#8bc9cf');
    tank('seagrass', tanks[2].box, tanks[2].front, M.greenSand, '#1b5059', '#74b9ac');
    cylinder(0, .21, .2, 1.32, .42, M.base);
    cylinder(0, .46, .2, 1.25, .02, M.deepSand);
    const deep = through(cylinder(0, 2.175, .2, 1.25, 3.45, deepWater), 1); deep.name = 'aquarium:water:deep';
    const deepRGB=[], deepP=deep.geometry.attributes.position;
    for (let j=0; j<deepP.count; j++) { const c=new THREE.Color('#0a203e').lerp(new THREE.Color('#2b6890'),(deepP.getY(j)+1.725)/3.45); deepRGB.push(c.r,c.g,c.b); }
    deep.geometry.setAttribute('color',new THREE.Float32BufferAttribute(deepRGB,3));
    through(cylinder(0, 2.175, .2, 1.28, 3.45, glass, true), 2).name = 'aquarium:glass:deep';
    cylinder(0, 4, .2, 1.32, .2, M.base);
    for (const y of [.42, 3.94]) ring(0, y, .2, 1.3, .025, M.brass);
    ring(0, 3.87, .2, 1.23, .025, cool);
    for (let j=0; j<48; j++) {
      const a=j*Math.PI/24, b=(j+1)*Math.PI/24, x0=1.28*Math.cos(a), x1=1.28*Math.cos(b), z0=.2+1.28*Math.sin(a), z1=.2+1.28*Math.sin(b);
      const o = box((x0+x1)/2, 2.175, (z0+z1)/2, Math.abs(x1-x0)+.025, 3.45, Math.abs(z1-z0)+.025, M.base, true);
      o.visible = false; o.userData.prop = true; o.userData.camThrough = true; o.name = 'aquarium:column-collider'; // 分段碰撞保留圓缸動線。
    }
    function bench(x) {
      cols.push([x-.85,0,-1.93,x+.85,1.05,-1.24]);
      box(x, .34, -1.6, 1.7, .18, .66, M.honey, true, .04);
      box(x, .49, -1.6, 1.6, .14, .61, M.fabric, false, .04);
      box(x, .8, -1.29, 1.7, .5, .1, M.honey, true, .035);
      box(x, .81, -1.355, 1.56, .32, .045, M.fabric);
      for (const dx of [-.65,.65]) for (const dz of [-.22,.22]) box(x+dx, .15, -1.6+dz, .1, .3, .1, M.dark);
      for (const dx of [-.29,.29]) box(x+dx, .563, -1.6, .012, .008, .54, M.seam);
      for (const dx of [-.79,.79]) box(x+dx, .63, -1.6, .12, .09, .64, M.honey, false, .025);
      for (const dx of [-.74,.74]) box(x+dx, .23, -1.6, .07, .045, .56, M.brass);
    }
    bench(-3.55); bench(3.55);
    function pedestal(x, z, a=0) {
      box(x, .13, z, .52, .26, .48, M.base, true, .035);
      box(x, .59, z, .26, .78, .24, M.honey, true, .025);
      const panel = new THREE.Group(); panel.position.set(x, 1.03, z); panel.rotation.set(-.35, a, 0); g.add(panel);
      function plate(w,h,d,m,y=0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); o.position.y=y; panel.add(o); }
      plate(.58,.08,.43,M.brass); plate(.53,.018,.38,M.paper,.05);
      for (let j=0; j<3; j++) { const o = new THREE.Mesh(new THREE.BoxGeometry(.32-j*.04,.004,.014),M.ink); o.position.set(.035,.062,-.09+j*.07); panel.add(o); }
      const badge = new THREE.Mesh(new THREE.CircleGeometry(.045,12),M.brass); badge.rotation.x=-Math.PI/2; badge.position.set(-.2,.063,-.07); panel.add(badge);
      cols.push([x-.3,0,z-.28,x+.3,1.2,z+.28]);
    }
    pedestal(-6.95,-3.8); pedestal(-6.85,3.18,Math.PI/2); pedestal(6.85,3.18,-Math.PI/2); pedestal(2.72,2.8,-.3);
    function fern(x,z) {
      cols.push([x-.3,0,z-.3,x+.3,1.15,z+.3]);
      mesh(new THREE.CylinderGeometry(.3,.22,.43,12),M.pot,x,.215,z,true);
      ring(x,.43,z,.285,.023,M.brass); cylinder(x,.43,z,.265,.025,M.base);
      for (let j=0; j<9; j++) {
        const a=j*2.4, reach=.43+(j%3)*.06, height=.74+(j%3)*.12;
        const points = [[x,.44,z],[x+Math.sin(a)*reach*.35,height,z+Math.cos(a)*reach*.35],[x+Math.sin(a)*reach,height-.1,z+Math.cos(a)*reach]];
        beam(points[0],points[1],.013,M.fern); beam(points[1],points[2],.01,M.fern);
        for (let k=1; k<=4; k++) for (const side of [-1,1]) {
          const t=k/5, xx=x+Math.sin(a)*reach*t, zz=z+Math.cos(a)*reach*t;
          const o=ball(xx+side*Math.cos(a)*.07, .51+(height-.5)*Math.sin(t*Math.PI*.7), zz-side*Math.sin(a)*.07, .13*(1-t*.55), .018, .045, j%2 ? M.leaf : M.fern);
          o.rotation.y=-a+side*.4;
        }
      }
    }
    for (const x of [-7.15,7.15]) { fern(x,5.65); fern(x,-5.55); }
    function arch(w,h) {
      const r=w/2, cy=h-r, p=[[-r,0],[-r,cy]];
      for (let j=0; j<=24; j++) { const a=Math.PI-j*Math.PI/24; p.push([r*Math.cos(a),cy+r*Math.sin(a)]); }
      p.push([r,0]); return p;
    }
    const outline = arch(2.8,3.25), outer = arch(3.1,3.42);
    const infill = new THREE.Shape([[-1.5,0],[1.5,0],[1.5,4.4],[-1.5,4.4]].map(p=>new THREE.Vector2(...p)));
    infill.holes.push(new THREE.Path(outline.map(p=>new THREE.Vector2(...p))));
    mesh(new THREE.ExtrudeGeometry(infill,{depth:.2,bevelEnabled:false}),M.wall,0,0,6.5); // 拱肩補牆，不阻擋出口。
    const shape = new THREE.Shape(outer.map(p=>new THREE.Vector2(...p)));
    shape.holes.push(new THREE.Path(outline.slice().reverse().map(p=>new THREE.Vector2(...p))));
    mesh(new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false}),M.cream,0,0,6.32);
    for (let j=1; j<outline.length; j++) beam([...outline[j-1],6.29],[...outline[j],6.29],.025,M.brass);
    const door = new THREE.Shape(outline.map(p=>new THREE.Vector2(...p)));
    mesh(new THREE.ExtrudeGeometry(door,{depth:.06,bevelEnabled:false}),M.honey,0,0,6.55);
    box(0,1.12,6.5,.045,2.24,.025,M.dark);
    for (const x of [-.16,.16]) ball(x,1.05,6.47,.035,.035,.035,M.brass);
    box(0,3.72,6.36,3.65,.5,.16,M.honey,false,.035);
    box(0,3.72,6.255,3.49,.38,.035,warm);
    if (typeof document !== 'undefined' && document.createElement) {
      const cv=document.createElement('canvas'); cv.width=1024; cv.height=160; const c=cv.getContext('2d');
      if (c) {
        c.fillStyle='#183249'; c.fillRect(0,0,1024,160); c.strokeStyle='#e7b85f'; c.lineWidth=4; c.strokeRect(12,12,1000,136);
        c.fillStyle='#fff3db'; c.textAlign='center'; c.textBaseline='middle'; c.font='600 80px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; c.fillText('潮汐海洋館',512,83);
        const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace;
        const sign=kit.mat('#ffffff',{map:t,emissiveMap:t,emissive:new THREE.Color('#fff3db'),emissiveIntensity:.65,roughness:.8},'paper');
        const o=mesh(new THREE.PlaneGeometry(3.4,.35),sign,0,3.72,6.23); o.rotation.y=Math.PI;
      }
    }
    for (const x of [-2.6,2.6]) {
      beam([x,4.38,4.8],[x,3.65,4.8],.018,M.brass);
      ball(x,3.47,4.8,.25,.24,.25,shade); ring(x,3.45,4.8,.25,.016,M.brass); ball(x,3.34,4.8,.12,.035,.12,warm);
    }
    function spot(topic,name,x,z,lines,alone) { return { x,y:0,z,r:1.3,kind:'hook:aqtank',topic,label:'看'+({'外海深處':'深海'}[name]||name)+'缸',name:name+'水族缸',lines,alone }; }
    Object.assign(g.userData, {
      spawn:[0,0,4.6,Math.PI], exit:[0,6.1,.75], bounce:1.2,indoor:true, sun:[.2,1,.3], cols, tanks,
      spots:[
        spot('reef','珊瑚礁',0,-3.35,['把腳步放輕，水光正在慢慢搖。','坐一會兒，陪藍色的午後發呆。','這片小小海灣，收著島上的夢。'],['玻璃映著柔光，像一封海的信。','先留一點空白，等海裡的朋友。']),
        spot('shallow','淺灘',-5.15,-.3,['淺淺的藍色，像今天溫柔的風。','沙床安安靜靜，等潮水說故事。','靠近一點看，也記得輕聲說話。'],['細沙鋪成小路，通往安靜海岸。','這裡的時間，像退潮一樣緩慢。']),
        spot('seagrass','海草床',5.15,-.3,['這一抹柔綠，替海灣留著清涼。','讓眼睛歇一下，跟水色慢慢走。','每個小角落，都值得好好等待。'],['綠藍相接的地方，藏著小安穩。','把今天的煩惱，輕輕留在岸上。']),
        spot('deep','外海深處',0,2.1,['深藍像條被子，輕輕蓋住喧鬧。','繞著水光走一圈，心也安靜了。','外海很遠，這份寧靜離你很近。'],['圓圓的玻璃裡，留著一片深藍。','不急著往前走，再陪海坐一下。'])
      ],
      lights:[[-3,3.4,-3.9,'#bfe8ff',.85,.35],[-5.8,2.8,-.3,'#bfe8ff',.65,.25],[5.8,2.8,-.3,'#bfe8ff',.65,.25],[0,3.85,1.6,'#9bcfff',.6,.2],[-2.6,3.34,4.8,'#ffcf9c',.6,.4],[2.6,3.34,4.8,'#ffcf9c',.6,.4]]
    });
    g.updateMatrixWorld(true);
    const buckets = new Map(), old = [], V = new THREE.Vector3(), normal = new THREE.Matrix3();
    g.traverse(o => {
      if (!o.isMesh || !o.visible || o.userData.walk || o.userData.camThrough || o.material.transparent) return;
      if (o.userData.solid) { const b=new THREE.Box3().setFromObject(o); cols.push([...b.min.toArray(),...b.max.toArray()]); }
      if (!buckets.has(o.material)) buckets.set(o.material, []); buckets.get(o.material).push(o); old.push(o);
    });
    buckets.forEach((parts,m) => {
      const P=[],N=[],UV=[],RGB=[], hasColor=parts.every(o=>o.geometry.attributes.color);
      for (const o of parts) {
        const geo=o.geometry, p=geo.attributes.position, n=geo.attributes.normal, uv=geo.attributes.uv, color=geo.attributes.color, ix=geo.index;
        normal.getNormalMatrix(o.matrixWorld);
        for (let j=0, count=ix ? ix.count : p.count; j<count; j++) {
          const k=ix ? ix.getX(j) : j;
          V.fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld); P.push(V.x,V.y,V.z);
          V.fromBufferAttribute(n,k).applyMatrix3(normal).normalize(); N.push(V.x,V.y,V.z);
          UV.push(uv ? uv.getX(k) : 0,uv ? uv.getY(k) : 0);
          if (hasColor) RGB.push(color.getX(k),color.getY(k),color.getZ(k));
        }
      }
      const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));
      if (hasColor) geo.setAttribute('color',new THREE.Float32BufferAttribute(RGB,3));
      const o=mesh(geo,m); o.name='aquarium:merged:'+(m.name || m.type); // 靜態零件依材質合併。
    });
    const used = new Set(old.map(o=>o.geometry)); old.forEach(o=>o.removeFromParent());
    g.traverse(o=>{ if (o.isMesh) used.delete(o.geometry); }); used.forEach(geo=>{ if (!borrowed.has(geo)) geo.dispose(); });
    return g;
  };
})(typeof window !== 'undefined' ? window : globalThis);
