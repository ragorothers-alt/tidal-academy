/* W07 · seeded, code-only island plants. Y-up, metre units, base at y=0.
   The broadleaf crown is supplied separately to props3d's shared InstancedMesh pool. */
import * as THREE from 'three';
import { bend } from './engine.js';

const MATERIALS = new Map(), MODELS = new Map();
export const natureRandom = seed => () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);

/** Keep the existing semantic kind/season/bend hooks; these assets do not sample photo detail. */
export function natureMaterial(color, kind = 'plain', vertexColors = false) {
  const key = `${color}|${kind}|${vertexColors}`;
  if (MATERIALS.has(key)) return MATERIALS.get(key);
  const m = bend(new THREE.MeshStandardMaterial({ color, vertexColors, roughness: 0.94, metalness: 0, side: THREE.DoubleSide }), kind);
  m.defines = { ...m.defines, TA_NATURE: '', TA_MODEL: '' };
  const compile = m.onBeforeCompile;
  m.onBeforeCompile = (sh, renderer) => {
    compile(sh, renderer);
    // Only remove this material's legacy bark/stone detail block. Snow and lighting remain intact.
    if (kind === 'bark') sh.fragmentShader = sh.fragmentShader.replace(/\{ vec3 qd = vWP \* vec3\(1\.6, 0\.7, 1\.6\);[^}]+\}/, '');
    if (kind === 'stone') sh.fragmentShader = sh.fragmentShader.replace(/\{\s*\/\/ 石材：不規則石塊與石縫[^}]+\}/, '');
  };
  m.customProgramCacheKey = () => `nature-v1-${kind}`;
  MATERIALS.set(key, m); return m;
}

/** Bake transforms, retaining UVs and vertex colours; one draw per semantic material. */
export function mergeNatureGeometry(list) {
  const p = [], n = [], c = [], uv = [], ix = []; let offset = 0;
  for (const g of list) {
    const a = g.attributes;
    for (let i = 0; i < a.position.count; i++) {
      p.push(a.position.getX(i), a.position.getY(i), a.position.getZ(i));
      n.push(a.normal.getX(i), a.normal.getY(i), a.normal.getZ(i));
      c.push(a.color ? a.color.getX(i) : 1, a.color ? a.color.getY(i) : 1, a.color ? a.color.getZ(i) : 1);
      uv.push(a.uv ? a.uv.getX(i) : 0, a.uv ? a.uv.getY(i) : 0);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) ix.push(offset + g.index.getX(i));
    else for (let i = 0; i < a.position.count; i++) ix.push(offset + i);
    offset += a.position.count;
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  for (const [name, array, width] of [['position', p, 3], ['normal', n, 3], ['color', c, 3], ['uv', uv, 2]]) g.setAttribute(name, new THREE.Float32BufferAttribute(array, width));
  g.setIndex(ix); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}

function tint(g, color, variation = 0.03) {
  const rgb = new THREE.Color(color), p = g.attributes.position, colors = [];
  for (let i = 0; i < p.count; i++) {
    const k = 1 + Math.sin(p.getX(i) * 9 + p.getY(i) * 4 + p.getZ(i) * 6) * variation;
    colors.push(rgb.r * k, rgb.g * k, rgb.b * k);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); return g;
}
function part(root, name, geometry, mat) {
  const m = new THREE.Mesh(geometry, mat); m.name = name; m.castShadow = m.receiveShadow = true; m.frustumCulled = false; root.add(m); return m;
}
function segment(a, b, r0, r1, sides = 9) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), sides, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); return g;
}

/** Continuous tapered rings avoid the straight cylinders and pinched fork seams. */
function curvedWood(points, radii, rings = 10, sides = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), p = [], uv = [], ix = [];
  const axis = new THREE.Vector3(0, 0, 1);
  for (let j = 0; j <= rings; j++) {
    const t = j / rings, c = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, axis).normalize(), front = new THREE.Vector3().crossVectors(right, tangent).normalize();
    const f = t * (radii.length - 1), k = Math.min(radii.length - 2, Math.floor(f)), radius = THREE.MathUtils.lerp(radii[k], radii[k + 1], f - k);
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * Math.PI * 2, v = c.clone().addScaledVector(right, Math.cos(a) * radius).addScaledVector(front, Math.sin(a) * radius * .93);
      p.push(v.x, Math.max(0, v.y), v.z); uv.push(i / sides, t);
      if (j < rings && i < sides) { const n = j * (sides + 1) + i; ix.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2); }
    }
  }
  // Closed ends are hidden inside the root flare / crown, but still cast solid shadows.
  for (const [j, reverse] of [[0, true], [rings, false]]) for (let i = 1; i < sides - 1; i++) {
    const n = j * (sides + 1); ix.push(n, n + (reverse ? i + 1 : i), n + (reverse ? i : i + 1));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals(); return g;
}

/** Folded lanceolate leaf, with an actual raised midrib and a curved tip (four triangles). */
function leaf(length, width, bendAmount = .025) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -width / 2, length * .48, bendAmount, 0, length * .52, bendAmount * 1.75, width / 2, length * .48, bendAmount, 0, length, -bendAmount * .2], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([.5, 0, 0, .5, .5, .5, 1, .5, .5, 1], 2));
  g.setIndex([0, 2, 1, 0, 3, 2, 1, 2, 4, 2, 3, 4]); g.computeVertexNormals(); return g;
}
function orientLeaf(g, at, direction, roll = 0) {
  g.rotateY(roll); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()));
  g.translate(...at.toArray()); return g;
}

// Four dominant masses plus seven smaller shoulders. Lower gaps expose the three main forks.
export const BROADLEAF_LOBES = [
  [-.53, 1.91, .05, .55, .43, .5], [.42, 2.04, -.23, .59, .45, .52],
  [.05, 2.25, .24, .54, .49, .48], [-.12, 1.88, -.57, .52, .4, .44],
  [-.83, 1.83, -.22, .3, .28, .3], [.8, 1.88, .11, .32, .29, .3],
  [-.46, 2.22, .43, .33, .3, .32], [.42, 1.76, .53, .37, .28, .32],
  [-.55, 1.68, .51, .32, .24, .3], [.51, 2.3, -.55, .3, .28, .27],
  [.01, 2.04, -.9, .31, .3, .26]
];
function broadleaf() {
  const root = new THREE.Group(), wood = [];
  wood.push(curvedWood([[0, .015, 0], [.10, .33, -.025], [.12, .72, -.035], [-.025, 1.14, .015], [-.18, 1.73, .08]], [.235, .171, .142, .108, .017], 12, 11));
  // Start each fork well inside the main stem: its closed end stays buried, with no collar seam.
  const fork = [.09, .86, -.02];
  for (const [mid, end] of [[[-.28, 1.44, .05], [-.62, 1.96, .07]], [[.3, 1.46, .04], [.67, 1.96, .05]], [[-.04, 1.57, -.32], [-.06, 2.13, -.69]]]) {
    wood.push(curvedWood([fork, mid, end], [.078, .068, .017], 7, 9));
    const b = [end[0] * .7, end[1] + .2, end[2] + .3]; wood.push(curvedWood([mid, [(mid[0] + b[0]) / 2, mid[1] + .26, b[2] - .06], b], [.045, .028, .009], 4, 7));
  }
  for (let i = 0; i < 5; i++) { const a = i * 2.399; wood.push(curvedWood([[Math.cos(a) * .36, .018, Math.sin(a) * .32], [Math.cos(a) * .19, .075, Math.sin(a) * .17], [.02, .25, -.01]], [.018, .063, .09], 4, 7)); }
  part(root, 'branching-trunk', mergeNatureGeometry(wood.map(g => tint(g, '#BA9680', .025))), natureMaterial('#ffffff', 'bark', true));
  root.userData.natureCanopy = BROADLEAF_LOBES;
  root.userData.natureBounds = { min: [-1.14, 0, -1.16], max: [1.14, 2.75, .85] };
  return root;
}

function palm() {
  const root = new THREE.Group(), wood = [], leaves = [], fruit = [];
  const at = t => [Math.sin(t * 1.35) * .25, t * 2.48, -.1 * t * t];
  for (let j = 0; j < 8; j++) {
    const t = j / 8, a = at(t), b = at((j + 1) / 8);
    wood.push(segment(a, b, .115 - t * .04, .108 - t * .04, 10));
    // Broad, shallow scar collars, not photograph-like stripes.
    const collar = new THREE.TorusGeometry(.114 - t * .04, .008, 3, 10); collar.rotateX(Math.PI / 2); collar.translate(...a); wood.push(collar);
  }
  const top = new THREE.Vector3(...at(1));
  for (let f = 0; f < 8; f++) {
    const a = f * Math.PI / 4 + (f % 2) * .12, L = 1.12 + (f % 3) * .1;
    const spine = t => top.clone().add(new THREE.Vector3(Math.cos(a) * L * t, .5 * Math.sin(t * Math.PI) - .24 * t, Math.sin(a) * L * t));
    for (let j = 0; j < 6; j++) {
      const start = spine(j / 6), end = spine((j + 1) / 6);
      leaves.push(tint(segment(start.toArray(), end.toArray(), .013, .007, 5), '#92B39C'));
    }
    for (let j = 1; j <= 10; j++) for (const side of [-1, 1]) {
      const t = j / 11, p = spine(t), direction = new THREE.Vector3(Math.cos(a) * .25 - Math.sin(a) * side, -.22 - t * .36, Math.sin(a) * .25 + Math.cos(a) * side);
      const g = orientLeaf(leaf((.28 + .2 * Math.sin(t * Math.PI)) * (1 - .4 * t), .115 * (1 - .4 * t), .035), p, direction);
      leaves.push(tint(g, side > 0 ? '#BDD0A8' : '#92B39C', .025));
    }
  }
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; const g = new THREE.IcosahedronGeometry(.13, 1); g.scale(.9, 1.15, .9); g.translate(top.x + Math.cos(a) * .19, top.y - .13, top.z + Math.sin(a) * .19); fruit.push(g); }
  part(root, 'curved-eight-section-trunk', mergeNatureGeometry(wood), natureMaterial('#B59986', 'bark'));
  part(root, 'eight-arched-fronds', mergeNatureGeometry(leaves), natureMaterial('#D0DBCB', 'pine', true));
  part(root, 'three-coconuts', mergeNatureGeometry(fruit), natureMaterial('#AD887A', 'bark'));
  return root;
}

function bamboo() {
  const root = new THREE.Group(), stems = [], leaves = [], r = natureRandom(709);
  for (let s = 0; s < 6; s++) {
    const a = s * 2.399, radius = s ? .22 + r() * .17 : 0, H = 2.35 + r() * .8, lean = (s - 2.5) * .025;
    const point = t => new THREE.Vector3(Math.cos(a) * radius + lean * t, t * H, Math.sin(a) * radius + Math.cos(a) * .09 * t);
    for (let j = 0; j < 7; j++) {
      const p = point(j / 7), q = point((j + 1) / 7), rad = .045 - j * .0028;
      stems.push(tint(segment(p.toArray(), q.toArray(), rad, rad - .0025, 10), s % 2 ? '#A8C4A3' : '#7FA093'));
      const ring = new THREE.TorusGeometry(rad + .0005, .0025, 3, 8); ring.rotateX(Math.PI / 2); ring.translate(...q.toArray()); stems.push(tint(ring, '#C4D3AB'));
      if (j < 2) continue;
      const angle = a + j * 2.2, end = q.clone().add(new THREE.Vector3(Math.cos(angle) * .23, .055, Math.sin(angle) * .23));
      stems.push(tint(segment(q.toArray(), end.toArray(), .011, .004, 5), '#A8C4A3'));
      for (let k = 0; k < 4; k++) {
        const p0 = q.clone().lerp(end, .3 + k * .2), angle0 = angle + (k % 2 ? -.75 : .75);
        leaves.push(tint(orientLeaf(leaf(.2 + r() * .08, .047, .018), p0, new THREE.Vector3(Math.cos(angle0), .12 - k * .1, Math.sin(angle0))), k % 2 ? '#C4D3AB' : '#A8C4A3'));
      }
    }
  }
  for (let j = 0; j < 2; j++) {const g = new THREE.ConeGeometry(.07, .28, 7);g.translate(.3 - j * .6, .14, .2);stems.push(tint(g, '#7FA093'));}
  part(root, 'six-culms-and-raised-nodes', mergeNatureGeometry(stems), natureMaterial('#ffffff', 'bark', true));
  part(root, 'folded-bamboo-leaves', mergeNatureGeometry(leaves), natureMaterial('#D0DBCB', 'pine', true));
  return root;
}

function shrub(variant) {
  const root = new THREE.Group(), green = [], flowers = [], r = natureRandom(819 + variant * 97);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399, radial = i < 2 ? .1 : .22 + r() * .13;
    const center = new THREE.Vector3(Math.cos(a) * radial, .16 + r() * .12 + (i < 2 ? .12 : 0), Math.sin(a) * radial * (.7 + variant * .1));
    const g = new THREE.IcosahedronGeometry(.19 + r() * .055, 1); g.scale(1, .85 + variant * .09, .92); g.translate(...center.toArray()); green.push(tint(g, i % 3 ? '#A5BE9A' : '#C1CDA2'));
    for (let k = 0; k < 9; k++) {
      const phi = k * 2.399, y = .2 + (k / 9) * .8, d = new THREE.Vector3(Math.cos(phi) * Math.sqrt(1 - y * y), y, Math.sin(phi) * Math.sqrt(1 - y * y));
      green.push(tint(orientLeaf(leaf(.035, .022, .006), center.clone().addScaledVector(d, .215), d), '#C1CDA2'));
    }
    if (i % 2 === 0) for (let j = 0; j < 5; j++) {
      const a0 = j * Math.PI * 2 / 5, petal = new THREE.IcosahedronGeometry(.024, 0);
      petal.scale(1, .5, 1.2); petal.translate(center.x + Math.cos(a0) * .027, center.y + .19, center.z + Math.sin(a0) * .027);
      flowers.push(tint(petal, i % 4 ? '#FFF0D4' : '#E4BDD3', 0));
    }
  }
  const mat = natureMaterial('#D0DBCB', 'sway', true); mat.defines.TA_SHRUB = '';
  part(root, 'nine-asymmetric-leaf-masses', mergeNatureGeometry(green), mat);
  part(root, 'cream-and-pink-flower-clusters', mergeNatureGeometry(flowers), natureMaterial('#ffffff', 'plain', true));
  root.userData.natureSink = .015;   // Apply after fit() recentres the bounds, so the base really sits in the soil.
  return root;
}

export const NATURE_IDS = new Set(['prop_tree', 'prop_palm', 'prop_bamboo', 'prop_shrub']);
/** Same {scene} contract as loadModel; templates share geometry and materials across clones. */
export function natureModel(id, variant = 0) {
  if (!NATURE_IDS.has(id)) return null;
  variant = id === 'prop_shrub' ? variant % 3 : 0;
  const key = `${id}|${variant}`;
  if (!MODELS.has(key)) {
    const root = id === 'prop_tree' ? broadleaf() : id === 'prop_palm' ? palm() : id === 'prop_bamboo' ? bamboo() : shrub(variant);
    root.name = id; root.userData.natureProcedural = true; root.userData.natureVariant = variant;
    MODELS.set(key, { scene: root });
  }
  return MODELS.get(key);
}

/** Crown geometry only; callers retain TA_GOLD/TA_TREEK/TA_LEAFTEX material hooks. */
export function natureCrown(model) {
  const lobes = model.userData.natureCanopy; if (!lobes) return null;
  model.updateMatrix();
  const cores = [], cards = [], origin = new THREE.Vector3(0, 1.96, -.08).applyMatrix4(model.matrix), rng = natureRandom(1707);
  for (let j = 0; j < lobes.length; j++) {
    const [x, y, z, sx, sy, sz] = lobes[j], center = new THREE.Vector3(x, y, z);
    // Each crown mass is a cloud of overlapping, flattened leaf cushions. No large ball core.
    const count = j < 4 ? 5 : 3, cushions = [[0, 0, 0, .66, .6, .66]];
    for (let k = 0; k < count; k++) {
      const a = k / count * Math.PI * 2 + j * 1.9, radial = .51 + .035 * Math.sin(k * 3.7 + j);
      cushions.push([Math.cos(a) * radial, Math.sin(k * 2.7 + j) * .16 - .015, Math.sin(a) * radial, .46, .48 + .04 * Math.sin(k * 2.1), .46]);
    }
    if (j < 4) cushions.push([-.08, .46, .08, .5, .45, .49], [.04, -.42, -.1, .46, .4, .46]);
    for (let k = 0; k < cushions.length; k++) {
      const [cx, cy, cz, rx, ry, rz] = cushions[k], core = new THREE.SphereGeometry(1, 10, 6), pp = core.attributes.position, pn = core.attributes.normal;
      for (let i = 0; i < pp.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pp, i), ripple = 1 + .035 * Math.sin(v.x * 5 + j + k) * Math.cos(v.z * 4 - v.y * 3);
        const q = new THREE.Vector3((cx + v.x * rx * ripple) * sx, (cy + v.y * ry * ripple) * sy, (cz + v.z * rz * ripple) * sz);
        pp.setXYZ(i, q.x, q.y, q.z);
        const n = new THREE.Vector3(v.x / (sx * rx), v.y / (sy * ry), v.z / (sz * rz)).normalize().multiplyScalar(.76).addScaledVector(q.clone().normalize(), .24).normalize();
        pn.setXYZ(i, n.x, n.y, n.z);
      }
      tint(core, '#91B480', .02); core.translate(x, y, z); core.applyMatrix4(model.matrix); core.translate(-origin.x, -origin.y, -origin.z); cores.push(core);
    }
    // Sparse single folded leaves blend into the core and soften its edge. No repeated multi-leaf stamps.
    for (let k = 0; k < 32; k++) {
      const yy = 1 - 2 * (k + .5) / 32, a = k * 2.399963 + j * 1.7 + (rng() - .5) * .45, rr = Math.sqrt(1 - yy * yy);
      const d = new THREE.Vector3(rr * Math.cos(a), yy, rr * Math.sin(a));
      const pos = center.clone().add(new THREE.Vector3(d.x * sx, d.y * sy, d.z * sz).multiplyScalar(.955 + rng() * .045));
      const normal = new THREE.Vector3(d.x * .8, d.y * .7 + .3, d.z * .8).normalize();
      const tangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, .13)).normalize(), up = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      const roll = rng() * Math.PI * 2, right = tangent.clone().multiplyScalar(Math.cos(roll)).addScaledVector(up, Math.sin(roll)), vertical = up.clone().multiplyScalar(Math.cos(roll)).addScaledVector(tangent, -Math.sin(roll));
      const span = .055 + rng() * .028, gg = new THREE.BufferGeometry();
      const points = [], UV = [0, 0, 1, 0, 1, 1, 0, 1, .5, .5];
      for (const [u, v] of [[-1,-1],[1,-1],[1,1],[-1,1],[0,0]]) {
        const q = pos.clone().addScaledVector(right, u * span * .32).addScaledVector(vertical, v * span / 2).addScaledVector(normal, u === 0 ? .008 : -.003);
        q.applyMatrix4(model.matrix).sub(origin); points.push(q.x, q.y, q.z);
      }
      gg.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));gg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));gg.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);gg.computeVertexNormals();
      // Broad crown volume + local lobe normals keep back faces readable without a flat card wall.
      const normals = gg.attributes.normal, pp = gg.attributes.position;
      for (let i = 0; i < pp.count; i++) { const nn = new THREE.Vector3().fromBufferAttribute(pp,i).normalize().multiplyScalar(.38).addScaledVector(normal,.62).normalize(); normals.setXYZ(i,nn.x,nn.y,nn.z); }
      cards.push(tint(gg, '#91B480', .035));
    }
  }
  return { C0: origin, parts: [mergeNatureGeometry(cores), mergeNatureGeometry(cards)] };
}
