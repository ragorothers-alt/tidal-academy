/* W08 · rounded boulders and low coastal shelves; no baked surface images. */
import * as THREE from 'three';
import { natureMaterial, mergeNatureGeometry, natureRandom } from './naturemodels.js';

const CACHE = new Map();
export const ROCK_IDS = new Set(['prop_boulder', 'prop_shorerock']);

/* v9.23.5 風化的石頭：以前是 12×7 的光滑橢球（輪廓看得到折角、底部往內收成一圈陰影很深的凹槽，顏色是淡粉紫）。
   現在面數多一倍，表面有大小不一的鼓包，再用幾個隨機方向的平面削出風化的平整面；下半部往外張開，像半埋在地裡的大石頭露出來的那一截。
   顏色是自然的灰褐：靠地面深、頂部被太陽曬得淺；海邊的礁石靠水那一段是濕的深色、帶一點藻綠，島上的圓石頂上長苔。 */
function roundedSlab(rx, ry, rz, at, seed, coast) {
  const g = new THREE.SphereGeometry(1, 22, 14), p = g.attributes.position, colors = [], r = natureRandom(seed);
  const phase = r() * Math.PI * 2, v = new THREE.Vector3(), cuts = [];
  for (let k = 0; k < 7; k++) { const a = r() * Math.PI * 2, e = (r() - .22) * 1.25; cuts.push([new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).normalize(), .76 + r() * .18]); }
  const lump = (x, y, z) => Math.sin(x * 3.1 + phase) * Math.sin(y * 2.7 + phase * 1.7) * Math.sin(z * 3.3 - phase);
  const low = new THREE.Color(coast ? '#6c6a61' : '#7e7a70'), high = new THREE.Color(coast ? '#bab3a5' : '#b4ad9f'), moss = new THREE.Color('#7d9166'), algae = new THREE.Color('#58634b');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    v.set(x, y, z).multiplyScalar(1 + .07 * Math.sin(Math.atan2(z, x) * 3 + phase) + .06 * lump(x, y, z) + .03 * lump(x * 2.3 + 1, y * 2.3, z * 2.3 - 2));
    for (const [n, c] of cuts) { const d = v.dot(n); if (d > c) v.addScaledVector(n, (c - d) * .85); }   // 削平：超出平面的部分壓回去
    if (y < 0) { const hr = Math.hypot(v.x, v.z), t = THREE.MathUtils.smoothstep(-y, 0, .4); if (hr > 1e-4) { const k = 1 + (((1 + .28 * -y) * Math.hypot(v.x, v.y, v.z)) / hr - 1) * t; v.x *= k; v.z *= k; } v.y *= .62; }   // 下半部往外張開、壓扁：沒有往內收的凹槽
    else if (v.y > .7) v.y = .7 + (v.y - .7) * .55;
    p.setXYZ(i, v.x * rx + at[0], v.y * ry + at[1], v.z * rz + at[2]);
    const tone = lump(x * 1.7 + 3, y * 1.9, z * 1.6 + 5) * .12, c = low.clone().lerp(high, THREE.MathUtils.clamp(THREE.MathUtils.smoothstep(y, -.25, .8) + tone, 0, 1));
    if (coast) c.lerp(algae, THREE.MathUtils.smoothstep(-y, -.15, .35) * (.45 + .4 * Math.max(0, lump(x * 2 + 1, y, z * 2 + 4))));   // 泡得到水的那一段：濕的深色帶一點藻綠
    else if (y > .45 && Math.sin(x * 4 + z * 5 + phase) > -.1) c.lerp(moss, .7 * THREE.MathUtils.smoothstep(y, .45, .7));
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));g.computeVertexNormals();return g;
}
function model(id, variant) {
  const root = new THREE.Group(), geo = [], coast = id === 'prop_shorerock';
  if (coast) {
    const shapes = [[1,.83],[.9,1],[1,.68],[.8,.94]], [x,z] = shapes[variant];
    geo.push(roundedSlab(x,.28,z,[0,.17,0],97+variant,true));
    geo.push(roundedSlab(x*.8,.24,z*.68,[(variant-1.5)*.07,.38,-.09],103+variant,true));
    if (variant % 2 === 0) geo.push(roundedSlab(.38,.16,.36,[.28,.56,-.12],127+variant,true));
    // Sparse round barnacle nubs, integrated into the same material/draw call.
    for (let j=0;j<5;j++) {const g=new THREE.IcosahedronGeometry(.035+(j%2)*.012,1);g.scale(1,.55,1);g.translate(-.34+j*.135,.39+Math.sin(j)*.025,z*.65);const c=new THREE.Color('#cfc8b9'),cols=[];for(let k=0;k<g.attributes.position.count;k++)cols.push(c.r,c.g,c.b);g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geo.push(g);}
  } else {
    const shapes = [[.58,.72,.48],[.63,.61,.5],[.56,.66,.57]], [x,y,z] = shapes[variant];
    geo.push(roundedSlab(x,y,z,[0,y*.51,0],211+variant,false));
  }
  const mesh = new THREE.Mesh(mergeNatureGeometry(geo),natureMaterial('#ffffff','stone',true));
  mesh.name = coast ? 'rounded-coastal-shelves' : 'moss-topped-rounded-boulder';mesh.receiveShadow=true;mesh.castShadow=true;mesh.frustumCulled=false;root.add(mesh);   // v9.23.5 石頭會投影子（以前不投，像浮在地上）
  // Move geometry, rather than the root, so fit() preserves a true bottom-centred origin.
  const b = mesh.geometry.boundingBox, c=b.getCenter(new THREE.Vector3()), size=b.getSize(new THREE.Vector3());
  mesh.geometry.translate(-c.x,-b.min.y,-c.z);
  // Preserve the old GLB height/width envelope when fit() applies the caller's w.
  // Audited normalized bounds: boulder 2.8400213 x 1.3; coast 3.9423704 x 1.3.
  const ratio=coast?1.3/3.9423703703703703:1.3/2.840021344717183;
  mesh.geometry.scale(1,Math.max(size.x,size.z)*ratio/size.y,1);
  mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
  root.name=id;root.userData.natureProcedural=true;root.userData.natureVariant=variant;return {scene:root};
}
/** prop_boulder: 3 shared templates; prop_shorerock: 4. fit() keeps caller w/sink unchanged. */
export function natureRockModel(id, variant=0) {
  if(!ROCK_IDS.has(id)) return null;
  variant %= id==='prop_boulder'?3:4;const key=`${id}|${variant}`;
  if(!CACHE.has(key)) CACHE.set(key,model(id,variant));return CACHE.get(key);
}
