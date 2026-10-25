/** CPU-only, deterministic, toroidal material synthesis. No DOM or three dependency. */
export const DETAIL_NAMES = Object.freeze([
  'grass', 'dirt', 'sand', 'rock', 'plaster', 'planks', 'tiles', 'bark', 'leaves', 'cobble', 'masonry',
]);

const TAU = Math.PI * 2;
const SIN_SIZE = 8192;
const SIN = new Float32Array(SIN_SIZE);
for (let i = 0; i < SIN_SIZE; i++) SIN[i] = Math.sin(i * TAU / SIN_SIZE);
const wave = cycles => SIN[(cycles * SIN_SIZE) & (SIN_SIZE - 1)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
const wrap = (v, size) => v >= 0 && v < size ? v : ((v % size) + size) % size;

// Integer avalanche hashing: no global random state, time, or platform APIs.
function hash(x, y, seed) {
  let h = Math.imul(x ^ seed, 0x45d9f3b) ^ Math.imul(y ^ 0x27d4eb2d, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
const rand = (x, y, seed) => hash(x, y, seed) / 4294967296;

/** Value noise with an integer number of lattice cells around BOTH axes. */
function noise(size, cellsX, cellsY, seed) {
  const grid = new Float32Array(cellsX * cellsY);
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) grid[y * cellsX + x] = rand(x, y, seed) * 2 - 1;
  }
  const xs = new Uint16Array(size), ts = new Float32Array(size);
  for (let x = 0; x < size; x++) {
    const u = x * cellsX / size, ix = Math.floor(u), t = u - ix;
    xs[x] = ix;
    ts[x] = t * t * (3 - 2 * t);
  }
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y * cellsY / size, iy = Math.floor(v), t = v - iy;
    const ty = t * t * (3 - 2 * t), row0 = iy * cellsX, row1 = ((iy + 1) % cellsY) * cellsX;
    for (let x = 0; x < size; x++) {
      const ix = xs[x], next = (ix + 1) % cellsX, tx = ts[x];
      const a = grid[row0 + ix], b = grid[row1 + ix];
      const top = a + (grid[row0 + next] - a) * tx, bottom = b + (grid[row1 + next] - b) * tx;
      out[y * size + x] = top + (bottom - top) * ty;
    }
  }
  return out;
}

// Raster primitives write through the torus, including features crossing corners.
function stroke(h, l, size, x0, y0, dx, dy, width, height, tone, bend = 0, taper = false) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const length = Math.sqrt(dx * dx + dy * dy) || 1, px = -dy / length, py = dx / length;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, curve = bend * 4 * t * (1 - t);
    const x = x0 + dx * t + px * curve, y = y0 + dy * t + py * curve;
    const radius = taper ? width * (1 - t * 0.7) : width;
    const x1 = Math.floor(x - radius), x2 = Math.ceil(x + radius);
    const y1 = Math.floor(y - radius), y2 = Math.ceil(y + radius);
    for (let yy = y1; yy <= y2; yy++) {
      const row = wrap(yy, size) * size;
      for (let xx = x1; xx <= x2; xx++) {
        const d = Math.sqrt((xx - x) ** 2 + (yy - y) ** 2);
        const a = clamp(radius + 0.45 - d, 0, 0.8);
        if (a === 0) continue;
        const i = row + wrap(xx, size), tip = taper ? t * t * 9 : 0;
        h[i] += (height + tip - h[i]) * a;
        l[i] += (tone + tip - l[i]) * a;
      }
    }
  }
}

function pebble(h, l, size, cx, cy, radius, tone) {
  for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y++) {
    const row = wrap(y, size) * size;
    for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x++) {
      const q = ((x - cx) ** 2 + (y - cy) ** 2) / (radius * radius);
      if (q >= 1.5) continue;
      const i = row + wrap(x, size);
      if (q > 1) { l[i] -= (1.5 - q) * 12; continue; }
      const dome = Math.sqrt(1 - q), a = Math.min(1, (1 - q) * radius);
      h[i] += (8 + 20 * dome - h[i]) * a;
      l[i] += (tone + 8 * dome - l[i]) * a;
    }
  }
}

function grass(h, l, size, seed) {
  const scale = size / 512, count = Math.max(16, Math.round(6500 * Math.min(1, scale * scale)));
  for (let n = 0; n < count; n++) {
    const angle = rand(n, 1, seed) * TAU, length = (7 + rand(n, 2, seed) * 17) * scale;
    const tone = -12 + rand(n, 3, seed) * 43;
    stroke(h, l, size, rand(n, 4, seed) * size, rand(n, 5, seed) * size,
      Math.cos(angle) * length, Math.sin(angle) * length, Math.max(0.45, (0.6 + rand(n, 6, seed) * 0.5) * scale),
      7 + rand(n, 7, seed) * 22, tone, (rand(n, 8, seed) - 0.5) * 4 * scale, true);
  }
}

function dirt(h, l, size, seed) {
  const scale = size / 512;
  for (let n = 0; n < Math.max(4, 750 * Math.min(1, scale * scale)); n++) {
    pebble(h, l, size, rand(n, 1, seed) * size, rand(n, 2, seed) * size,
      Math.max(0.65, (0.7 + rand(n, 3, seed) * 2.8) * scale), rand(n, 4, seed) * 27 - 4);
  }
  for (let n = 0; n < 25; n++) {
    const angle = rand(n, 10, seed) * TAU, length = (10 + rand(n, 11, seed) * 49) * scale;
    stroke(h, l, size, rand(n, 12, seed) * size, rand(n, 13, seed) * size,
      Math.cos(angle) * length, Math.sin(angle) * length, Math.max(0.3, 0.55 * scale),
      -22, -23, (rand(n, 14, seed) - 0.5) * 10 * scale);
  }
}

function wood(h, l, size, seed, mid, fine, coarse, grain) {
  const fibers = noise(size, 4, 128, seed ^ 0x37f1);
  const phases = [], tones = [], knotsX = [], knotsY = [];
  for (let r = 0; r < 8; r++) {
    phases[r] = rand(r, 1, seed); tones[r] = (rand(r, 2, seed) - 0.5) * 17;
    knotsX[r] = rand(r, 3, seed); knotsY[r] = 0.3 + rand(r, 4, seed) * 0.4;
  }
  for (let y = 0; y < size; y++) {
    // Sample board joins at texel centres, with a symmetric groove at V=0/1.
    const v = (y + 0.5) * 8 / size, row = Math.floor(v), fy = v - row;
    const edgeY = Math.min(fy, 1 - fy) * size / 8;
    for (let x = 0; x < size; x++) {
      const i = y * size + x, u = (x + 0.5) / size;
      let dx = Math.abs(u - knotsX[row]); dx = Math.min(dx, 1 - dx);
      const dy = (fy - knotsY[row]) / 8;
      const radius = Math.sqrt(dx * dx * 230 + dy * dy * 2300);
      const knot = Math.max(0, 1 - radius), influence = 1 / (1 + radius * radius);
      const rings = wave(y * 120 / size + mid[i] * 0.9 + coarse[i] * 0.3 + influence * 1.2);
      const longGrain = wave(y * 232 / size + mid[i] * 1.1 + influence * 2.4);
      const knotRings = wave(radius * 4) * Math.max(0, 1 - radius / 2.5);
      const joint = u * 2 + phases[row], fx = joint - Math.floor(joint);
      const edgeX = Math.min(fx, 1 - fx) * size / 2;
      const seam = 1 - smooth((Math.min(edgeX, edgeY) - 0.35 * size / 512) / (1.65 * size / 512));
      const faceTone = tones[row] + coarse[i] * 9 + rings * 4 + longGrain * 2 + fibers[i] * 7 + fine[i] * 3 + grain[i] * 2 + knotRings * 4 - knot * 29;
      const faceHeight = rings * 2.5 + longGrain + fibers[i] * 3 + fine[i] * 2 + knotRings * 2 - knot * 10;
      // The groove masks each board's tone/grain, including at the torus seam.
      l[i] = faceTone * (1 - seam) + (-35 + grain[i]) * seam;
      h[i] = faceHeight * (1 - seam) - 35 * seam;
    }
  }
}

function roof(h, l, size, seed, mid, fine, grain) {
  const tones = new Float32Array(64);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) tones[r * 8 + c] = (rand(c, r, seed) - 0.5) * 18;
  for (let y = 0; y < size; y++) {
    const v = y * 8 / size, row = Math.floor(v), fy = v - row;
    for (let x = 0; x < size; x++) {
      const i = y * size + x, u = x * 8 / size;
      const above = wrap(row - 1, 8), ua = u + (above % 2) * 0.5;
      const ax = (ua - Math.floor(ua)) * 2 - 1;
      const aboveEdge = -0.3 + 0.7 * Math.sqrt(Math.max(0, 1 - ax * ax));
      const overlap = fy < aboveEdge;
      const r = overlap ? above : row, uu = u + (r % 2) * 0.5, col = Math.floor(uu) % 8;
      const fx = uu - Math.floor(uu), across = fx * 2 - 1;
      const dome = Math.sqrt(Math.max(0, 1 - across * across));
      const edge = 0.7 + 0.7 * dome - (overlap ? fy + 1 : fy);
      const lip = Math.max(0, 1 - Math.abs(edge) / 0.07);
      const cast = overlap ? 0 : Math.max(0, 1 - Math.abs(fy - aboveEdge) / 0.09);
      const join = 1 - smooth(Math.min(fx, 1 - fx) / 0.024);
      l[i] = tones[r * 8 + col] + dome * 12 + mid[i] * 6 + fine[i] * 5 + grain[i] * 2 - lip * 23 - cast * 24 - join * 18;
      h[i] = dome * 17 + mid[i] * 3 + fine[i] * 2 + (overlap ? fy + 1 : fy) * 6 - lip * 8 - join * 13;
    }
  }
}

function foliage(h, l, size, seed) {
  const scale = size / 512, count = Math.max(12, Math.round(9000 * Math.min(1, scale * scale)));
  for (let n = 0; n < count; n++) {
    const cx = rand(n, 1, seed) * size, cy = rand(n, 2, seed) * size;
    const a = rand(n, 3, seed) * TAU, cs = Math.cos(a), sn = Math.sin(a);
    const length = Math.max(1, (4 + rand(n, 4, seed) * 6) * scale);
    const width = Math.max(0.7, length * (0.38 + rand(n, 5, seed) * 0.22));
    const csL = cs / length, snL = sn / length, csW = cs / width, snW = sn / width;
    const extentX = Math.sqrt((cs * length) ** 2 + (sn * width) ** 2) * 1.162 + 0.5;
    const extentY = Math.sqrt((sn * length) ** 2 + (cs * width) ** 2) * 1.162 + 0.5;
    const tone = rand(n, 6, seed) * 27 - 9, height = rand(n, 7, seed) * 10 + 11;
    for (let y = Math.floor(cy - extentY); y <= Math.ceil(cy + extentY); y++) {
      const row = wrap(y, size) * size;
      const x0 = Math.floor(cx - extentX), x1 = Math.ceil(cx + extentX), dy = y - cy;
      let u = (x0 - cx) * csL + dy * snL, v = -(x0 - cx) * snW + dy * csW;
      for (let x = x0; x <= x1; x++, u += csL, v -= snW) {
        const q = u * u + v * v;
        if (q >= 1.35) continue;
        const i = row + wrap(x, size);
        if (q > 1) { l[i] -= (1.35 - q) * 17; continue; }
        const dome = Math.sqrt(1 - q), alpha = Math.min(1, (1 - q) * width * 1.5);
        const vein = Math.max(0, 1 - Math.abs(v) * width * 1.8) * (1 - Math.abs(u));
        h[i] += (height + dome * 9 + vein * 3 - h[i]) * alpha;
        l[i] += (tone + dome * 7 + vein * 5 + v * 2 - l[i]) * alpha;
      }
    }
  }
}

function stones(h, l, size, seed, mid, fine, grain) {
  const cells = 11, stride = cells + 2;
  const sx = new Float32Array(stride * stride), sy = new Float32Array(stride * stride), tones = new Float32Array(stride * stride);
  // One halo of periodic sites eliminates modulo/hash work from the pixel loop.
  for (let y = -1; y <= cells; y++) for (let x = -1; x <= cells; x++) {
    const i = (y + 1) * stride + x + 1, xx = wrap(x, cells), yy = wrap(y, cells);
    sx[i] = x + 0.5 + (rand(xx, yy, seed) - 0.5) * 0.56;
    sy[i] = y + 0.5 + (rand(xx, yy, seed ^ 0x37ac) - 0.5) * 0.56;
    tones[i] = (rand(xx, yy, seed ^ 0x4ba2) - 0.5) * 23;
  }
  const coords = new Float32Array(size), bins = new Uint16Array(size);
  for (let x = 0; x < size; x++) { coords[x] = x * cells / size; bins[x] = Math.floor(coords[x]); }
  for (let y = 0; y < size; y++) {
    const cy = coords[y], row = bins[y];
    for (let x = 0; x < size; x++) {
      const cx = coords[x], col = bins[x], i = y * size + x;
      let d1 = Infinity, d2 = Infinity, first = 0, second = 0;
      for (let yy = row; yy < row + 3; yy++) {
        const start = yy * stride + col;
        for (let k = start; k < start + 3; k++) {
          const dx = cx - sx[k], dy = cy - sy[k], d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; second = first; d1 = d; first = k; }
          else if (d < d2) { d2 = d; second = k; }
        }
      }
      const dx = sx[first] - sx[second], dy = sy[first] - sy[second];
      const edge = (d2 - d1) / (2 * Math.sqrt(dx * dx + dy * dy));
      const stone = smooth((edge - 0.02 + fine[i] * 0.007) / 0.17), dome = Math.max(0, 1 - d1);
      l[i] = -43 + stone * (51 + tones[first] + mid[i] * 11 + fine[i] * 8 + grain[i] * 4) + dome * stone * 5;
      h[i] = -35 + stone * (48 + dome * 12 + mid[i] * 6 + fine[i] * 4) + grain[i] * 1.3;
    }
  }
}

function blocks(h, l, size, seed, coarse, mid, fine, grain) {
  const rows = 8, ys = [0], configs = [];
  let total = 0;
  for (let r = 0; r < rows; r++) { total += 0.8 + rand(r, 1, seed) * 0.4; ys.push(total); }
  for (let r = 1; r <= rows; r++) ys[r] /= total;
  for (let r = 0; r < rows; r++) {
    const count = 4 + (hash(r, 2, seed) % 3), edges = [0], tones = [];
    let sum = 0;
    for (let c = 0; c < count; c++) {
      sum += 0.65 + rand(c, r, seed ^ 0x721c) * 0.7; edges.push(sum);
      tones.push((rand(c, r, seed ^ 0x183b) - 0.5) * 23);
    }
    for (let c = 1; c <= count; c++) edges[c] /= sum;
    const shift = rand(r, 3, seed), distances = new Float32Array(size), colors = new Float32Array(size);
    for (let x = 0; x < size; x++) {
      const u = (x / size + shift) % 1;
      let c = 0;
      while (c < count - 1 && u >= edges[c + 1]) c++;
      distances[x] = Math.min(u - edges[c], edges[c + 1] - u) * size;
      colors[x] = tones[c];
    }
    configs.push({ distances, colors });
  }
  let row = 0;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    while (row < rows - 1 && v >= ys[row + 1]) row++;
    const dy = Math.min(v - ys[row], ys[row + 1] - v) * size, config = configs[row];
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const edge = Math.min(dy, config.distances[x]) + mid[i] * 0.65 * size / 512;
      const stone = smooth((edge - 0.9 * size / 512) / (3.2 * size / 512));
      l[i] = -42 + stone * (57 + config.colors[x] + coarse[i] * 7 + fine[i] * 6 + grain[i] * 4);
      h[i] = -34 + stone * (54 + mid[i] * 8 + fine[i] * 5) + grain[i] * 1.5;
    }
  }
}

/**
 * A tile represents about 2 x 2 metres. RGB is LINEAR multiplicative detail,
 * centred on 128 (not sRGB albedo); A is height. Array row 0 is texture V=0.
 * The periodic domain is [0,size), not [0,size-1]: edge texels are neighbours,
 * not duplicates. Supports non-power-of-two sizes as well as the default 512.
 * @returns {{detail: Uint8Array, normal: Uint8Array}}
 */
export function genDetail(name, size = 512, seed = 1) {
  if (!DETAIL_NAMES.includes(name)) throw new RangeError(`Unknown detail material: ${name}`);
  if (!Number.isInteger(size) || size < 1 || size * size * 4 > 0x7fffffff) throw new RangeError('size must be a positive integer with a valid RGBA array length');
  if (!Number.isFinite(seed)) throw new TypeError('seed must be a finite number');
  seed |= 0;
  const count = size * size, h = new Float32Array(count), l = new Float32Array(count);
  const coarse = noise(size, 4, 4, seed ^ 0x4f17), mid = name === 'leaves' ? null : noise(size, 16, 16, seed ^ 0x7511);
  const fine = noise(size, 64, 64, seed ^ 0x219b), grain = new Float32Array(count);
  const fibers = name === 'bark' ? noise(size, 32, 4, seed ^ 0x4ab3) : null;
  const microFibers = name === 'bark' ? noise(size, 128, 12, seed ^ 0x48a1) : null;
  if (name === 'leaves') {
    for (let i = 0; i < count; i++) { l[i] = -28 + coarse[i] * 8 + fine[i] * 4; h[i] = -24 + coarse[i] * 4; }
  } else for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, c = coarse[i], m = mid[i], f = fine[i];
    const g = rand(x, y, seed ^ 0x139a) * 2 - 1;
    grain[i] = g;
    switch (name) {
      case 'grass': l[i] = c * 19 + m * 11 + f * 5 + g * 4; h[i] = c * 6 + f * 4 + g * 2; break;
      case 'dirt': {
        const speck = g > 0.91 ? (g - 0.91) * 200 : 0;
        l[i] = c * 15 + m * 11 + f * 9 + g * 8 - speck;
        h[i] = c * 8 + m * 12 + f * 7 + g * 4 - speck * 0.5;
        break;
      }
      case 'sand': {
        const phase = y * 6 / size + m * 0.12 + wave(x * 2 / size) * 0.08;
        const ripple = wave(phase) + wave(phase * 2) * 0.2;
        l[i] = c * 3 + m * 2 + f * 3 + g * 9 + ripple * 8;
        h[i] = m * 2 + f * 2 + g * 2.5 + ripple * 7;
        break;
      }
      case 'rock': {
        const strata = wave(x * 8 / size + y * 5 / size + m * 0.3);
        const crack = Math.max(0, 1 - Math.abs(m + c * 0.25 + f * 0.13) / 0.04) * smooth((c + 0.35) * 2);
        const pit = g < -0.94 ? (-g - 0.94) * 180 : 0;
        l[i] = c * 19 + m * 17 + f * 12 + g * 6 + strata * 9 - crack * 28 - pit;
        h[i] = c * 22 + m * 19 + f * 9 + g * 2.5 + strata * 7 - crack * 25 - pit;
        break;
      }
      case 'plaster': {
        const smear = wave(y * 41 / size + c * 0.25 + m * 0.1);
        const stain = Math.max(0, -c - 0.35);
        l[i] = c * 5 + m * 3 + f * 4 + g * 4 + smear * 0.8 - stain * 11;
        h[i] = c * 3 + m * 2 + f * 3 + g * 1.5 + smear;
        break;
      }
      case 'bark': {
        const fiber = fibers[i], groove = smooth((0.22 - fiber + m * 0.16) / 0.75);
        const split = Math.max(0, 1 - Math.abs(wave(x * 17 / size + fiber * 0.3 + m * 0.1)) / 0.09) * smooth((m + 0.45) * 1.5);
        l[i] = c * 13 + fiber * 17 + microFibers[i] * 8 + f * 5 + g * 4 - groove * 31 - split * 17;
        h[i] = c * 9 + fiber * 17 + microFibers[i] * 4 + f * 3 + g * 1.7 - groove * 27 - split * 14;
        break;
      }
      default: break; // Structured materials replace these fields below.
    }
  }
  const materialSeed = seed ^ 0x678a;
  switch (name) {
    case 'grass': grass(h, l, size, materialSeed); break;
    case 'dirt': dirt(h, l, size, materialSeed); break;
    case 'planks': wood(h, l, size, materialSeed, mid, fine, coarse, grain); break;
    case 'tiles': roof(h, l, size, materialSeed, mid, fine, grain); break;
    case 'leaves': foliage(h, l, size, materialSeed); break;
    case 'cobble': stones(h, l, size, materialSeed, mid, fine, grain); break;
    case 'masonry': blocks(h, l, size, materialSeed, coarse, mid, fine, grain); break;
    default: break;
  }

  return pack(h, l, size, name);
}

function pack(h, l, size, name) {
  const count = size * size;
  let mean = 0;
  for (let i = 0; i < count; i++) mean += l[i];
  mean /= count;
  const detail = new Uint8Array(count * 4), normal = new Uint8Array(count * 4);
  const warm = name === 'grass' || name === 'leaves' ? 2 : name === 'rock' ? -1.5 : 0.8;
  for (let i = 0; i < count; i++) {
    const j = i * 4, value = clamp(l[i] - mean + 128, 64, 196);
    const tint = clamp(h[i] / 35, -1, 1) * warm;
    detail[j] = Math.round(value + tint);
    detail[j + 1] = Math.round(value);
    detail[j + 2] = Math.round(value - tint);
    detail[j + 3] = Math.round(clamp(h[i] + 128, 8, 247));
  }
  // Wrapped Sobel of the ACTUAL stored height. DataTexture flipY=false makes
  // increasing row index +V, so -dH/dV is the OpenGL +Y normal convention.
  const strength = 0.012 * size / 512;
  for (let y = 0; y < size; y++) {
    const top = (y === 0 ? size - 1 : y - 1) * size;
    const row = y * size, bottom = (y + 1 === size ? 0 : y + 1) * size;
    for (let x = 0; x < size; x++) {
      const left = x === 0 ? size - 1 : x - 1, right = x + 1 === size ? 0 : x + 1;
      const tl = detail[(top + left) * 4 + 3], tr = detail[(top + right) * 4 + 3];
      const bl = detail[(bottom + left) * 4 + 3], br = detail[(bottom + right) * 4 + 3];
      const dx = tr + 2 * detail[(row + right) * 4 + 3] + br - tl - 2 * detail[(row + left) * 4 + 3] - bl;
      const dy = bl + 2 * detail[(bottom + x) * 4 + 3] + br - tl - 2 * detail[(top + x) * 4 + 3] - tr;
      const nx = -dx * strength, ny = -dy * strength, inv = 1 / Math.sqrt(1 + nx * nx + ny * ny), j = (row + x) * 4;
      normal[j] = Math.round((nx * inv + 1) * 127.5);
      normal[j + 1] = Math.round((ny * inv + 1) * 127.5);
      normal[j + 2] = Math.round((inv + 1) * 127.5);
      normal[j + 3] = 255;
    }
  }
  return { detail, normal };
}
