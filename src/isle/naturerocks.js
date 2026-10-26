/* W08 · rounded boulders and low coastal shelves; no baked surface images. */
import * as THREE from 'three';
import { natureMaterial, mergeNatureGeometry, natureRandom } from './naturemodels.js';

const CACHE = new Map();
export const ROCK_IDS = new Set(['prop_boulder', 'prop_shorerock']);

function roundedSlab(rx, ry, rz, at, seed, coast) {
  const g = new THREE.SphereGeometry(1, 12, 7), p = g.attributes.position, colors = [], r = natureRandom(seed);
  const phase = r() * Math.PI * 2, low = new THREE.Color(coast ? '#8DADA8' : '#B8B1C1'), high = new THREE.Color(coast ? '#D3C6C7' : '#D6C9CD'), moss = new THREE.Color('#A0B59C');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // Four broad, softly flattened shoulders rather than fine fracture noise.
    const radial = 1 + .07 * Math.sin(Math.atan2(z,x) * 3 + phase) + .035 * Math.cos(y * 4 + phase);
    const yy = y < -.45 ? -.45 + (y + .45) * .15 : y > .65 ? .65 + (y - .65) * .4 : y;
    p.setXYZ(i, x * rx * radial + at[0], yy * ry + at[1], z * rz * radial + at[2]);
    const c = low.clone().lerp(high, THREE.MathUtils.smoothstep(y, -.2, .75));
    if (!coast && y > .53 && Math.sin(x * 4 + z * 5 + phase) > -.1) c.lerp(moss, .72);
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
    for (let j=0;j<5;j++) {const g=new THREE.IcosahedronGeometry(.035+(j%2)*.012,1);g.scale(1,.55,1);g.translate(-.34+j*.135,.39+Math.sin(j)*.025,z*.65);const c=new THREE.Color('#D3C6C7'),cols=[];for(let k=0;k<g.attributes.position.count;k++)cols.push(c.r,c.g,c.b);g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geo.push(g);}
  } else {
    const shapes = [[.58,.72,.48],[.63,.61,.5],[.56,.66,.57]], [x,y,z] = shapes[variant];
    geo.push(roundedSlab(x,y,z,[0,y*.51,0],211+variant,false));
  }
  const mesh = new THREE.Mesh(mergeNatureGeometry(geo),natureMaterial('#ffffff','stone',true));
  mesh.name = coast ? 'rounded-coastal-shelves' : 'moss-topped-rounded-boulder';mesh.receiveShadow=true;mesh.castShadow=false;mesh.frustumCulled=false;root.add(mesh);
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
