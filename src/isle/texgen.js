import * as THREE from 'three';
/* 潮汐小島 · 寫實細節材質（由工具產生）：把 texgen-core.js 算出的細節圖與法線圖包成 three.js 的 DataTexture。 */
import { genDetail, DETAIL_NAMES } from './texgen-core.js';

export { DETAIL_NAMES, genDetail };

/**
 * Fresh, caller-owned textures; call dispose() when no longer needed.
 * Both contain linear data: do not mark detail as SRGBColorSpace.
 * Keep flipY=false to match the core's +V / OpenGL +Y normals.
 * Set anisotropy from renderer.capabilities.getMaxAnisotropy() at the call site.
 */
export function detailTextures(name, size = 512) {
  const pixels = genDetail(name, size);
  function texture(data, suffix) {
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.name = `isle-${name}-${suffix}`;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.NoColorSpace;
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  }
  return { detail: texture(pixels.detail, 'detail'), normal: texture(pixels.normal, 'normal') };
}
