"""潮汐小島 · 3D 角色的表情臉皮（v8.8）
Tripo 模型的眼睛、嘴巴是畫在貼圖上的，而且貼圖是碎片拼貼，沒辦法直接畫表情貼圖。
這支工具從正面「拍」每個角色的臉：在頭骨座標裡把頭部三角形正投影到一張圖上，每個像素取
「在頭部中心前方、最深的一層朝前表面」——也就是皮膚（瀏海在更前面，後腦的頭髮在中心後面）。
得到正面臉圖，以及每個像素的網格座標、法線、骨頭權重，交給 tools/face_frames.py 做表情格與貼合臉型的小曲面
（actors.js 做成共用模型骨架的 SkinnedMesh，跟臉一起動）。

用法：python tools/face_bake.py sen player       → 輸出到 .face-work/（--out 可改）
      <id>_face.png（正面臉圖）、<id>_maps.npz（座標、法線、骨頭、深度、有效遮罩）、<id>_info.json
"""
import base64, json, os, re, struct, sys
import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.path.join(ROOT, 'src', 'isle', 'models')
PPU = 2400   # 每單位（模型原始高度 1）幾個像素

CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8, 5122: np.int16, 5120: np.int8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load_glb(mid):
    s = open(os.path.join(MODELS, mid + '.js'), encoding='utf-8').read()
    b = base64.b64decode(re.search(r"= '([^']+)'", s).group(1))
    clen = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + clen])
    o = 20 + clen; blen = struct.unpack('<I', b[o:o + 4])[0]
    return j, b[o + 8:o + 8 + blen]


def accessor(j, B, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', dt.itemsize * n)
    raw = np.frombuffer(B, dtype=np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=off)
    arr = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], dt.itemsize * n), strides=(stride, 1)).copy()
    arr = arr.view(dt).reshape(a['count'], n)
    if a.get('normalized'):
        arr = arr.astype(np.float32) / float(np.iinfo(dt).max)
    return arr.astype(np.float32) if dt.kind == 'f' or a.get('normalized') else arr


def node_name(j, k):
    return re.sub(r'^mixamorig:?', '', j['nodes'][k].get('name', ''))


def bake(mid, out):
    j, B = load_glb(mid)
    prim = j['meshes'][0]['primitives'][0]; at = prim['attributes']
    P = accessor(j, B, at['POSITION']); N = accessor(j, B, at['NORMAL']); UV = accessor(j, B, at['TEXCOORD_0'])
    J = accessor(j, B, at['JOINTS_0']).astype(int); W = accessor(j, B, at['WEIGHTS_0'])
    I = accessor(j, B, prim['indices']).reshape(-1, 3).astype(int)
    skin = j['skins'][0]; joints = skin['joints']; IBM = accessor(j, B, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)   # glTF 是 column-major
    names = [node_name(j, k) for k in joints]
    h = names.index('Head')
    # 頭骨與它底下的骨頭（頭頂、頭髮骨）都算頭部
    kids = {k: j['nodes'][k].get('children', []) for k in range(len(j['nodes']))}
    sub, st = set(), [joints[h]]
    while st:
        k = st.pop(); sub.add(k); st += kids[k]
    hj = np.array([joints[q] in sub for q in range(len(joints))])
    headW = (W * hj[J]).sum(1)
    mix = any(n.startswith('mixamorig') for n in (j['nodes'][k].get('name', '') for k in joints))
    M = IBM[h]; R3 = M[:3, :3]
    PL = (P @ R3.T) + M[:3, 3]; NL = N @ R3.T; NL /= np.linalg.norm(NL, axis=1, keepdims=True) + 1e-9
    f = R3 @ np.array([0, 0, 1.0] if mix else [1.0, 0, 0]); f /= np.linalg.norm(f)   # 模型的正面：Mixamo 骨架朝 +Z、Tripo 骨架朝 +X
    u = R3 @ np.array([0, 1.0, 0]); u -= f * (u @ f); u /= np.linalg.norm(u)
    r = np.cross(u, f)   # 角色的左手邊＝看著角色時的右邊（圖的 +x）
    A, Bv, D = PL @ r, PL @ u, PL @ f
    hv = headW > 0.9
    dc = 0.5 * (D[hv].min() + D[hv].max())   # 頭部前後的中間
    front = hv & (D > dc)
    a0, a1, b0, b1 = A[front].min(), A[front].max(), Bv[front].min(), Bv[front].max()
    Wd, Ht = int((a1 - a0) * PPU) + 1, int((b1 - b0) * PPU) + 1
    tex_i = j['materials'][prim.get('material', 0)]['pbrMetallicRoughness']['baseColorTexture']['index']
    img = j['images'][j['textures'][tex_i]['source']]; bv = j['bufferViews'][img['bufferView']]
    atlas = cv2.imdecode(np.frombuffer(B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']], np.uint8), cv2.IMREAD_COLOR).astype(np.float32)
    TH, TW = atlas.shape[:2]
    zb = np.full((Ht, Wd), np.inf, np.float32); tri = np.full((Ht, Wd), -1, np.int32); bar = np.zeros((Ht, Wd, 3), np.float32)
    tris = I[(headW[I] > 0.3).all(1)]   # 臉的下半部（下巴、嘴）有一部分綁在脖子上，也要算進來
    for k, t in enumerate(tris):
        pa = np.stack([(A[t] - a0) * PPU, (b1 - Bv[t]) * PPU], 1)   # 圖的座標（y 往下）
        e1, e2 = pa[1] - pa[0], pa[2] - pa[0]
        area = e1[0] * e2[1] - e1[1] * e2[0]
        if area >= -1e-6: continue   # 只留朝前的面（y 往下翻過來之後，朝前的面變成順時針）
        x0, x1 = int(np.floor(pa[:, 0].min())), int(np.ceil(pa[:, 0].max())); y0, y1 = int(np.floor(pa[:, 1].min())), int(np.ceil(pa[:, 1].max()))
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, Wd - 1), min(y1, Ht - 1)
        if x1 < x0 or y1 < y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        px, py = gx - pa[0, 0], gy - pa[0, 1]
        l1 = (px * e2[1] - py * e2[0]) / area; l2 = (e1[0] * py - e1[1] * px) / area; l0 = 1 - l1 - l2
        ins = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4)
        if not ins.any(): continue
        d = l0 * D[t[0]] + l1 * D[t[1]] + l2 * D[t[2]]
        sl = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        ok = ins & (d > dc) & (d < zb[sl])   # 中心前方、最深的一層＝皮膚
        if not ok.any(): continue
        zb[sl][ok] = d[ok]; tri[sl][ok] = k; bar[sl][ok] = np.stack([l0, l1, l2], -1)[ok]
    valid = tri >= 0
    tv = tris[np.clip(tri, 0, None)]   # 每個像素的三個頂點
    w = bar[..., :, None]
    # 臉皮是共用模型骨架的 SkinnedMesh：座標存原始網格座標（GLTFLoader 用單位矩陣綁定，世界座標＝Σ 骨頭 × 反綁定 × 頂點），
    # 骨頭權重照底下那個三角形內插，頭轉、脖子動時跟臉一起變形
    pos = (P[tv] * w).sum(2); nor = (N[tv] * w).sum(2); nor /= np.linalg.norm(nor, axis=-1, keepdims=True) + 1e-9
    uv = (UV[tv] * w).sum(2)
    dense = np.zeros(tv.shape[:2] + (len(joints),), np.float32)
    for c in range(3):
        for q in range(4):
            np.add.at(dense, (*np.indices(tv.shape[:2]), J[tv[..., c], q]), W[tv[..., c], q] * bar[..., c])
    jnt = np.argsort(-dense, axis=-1)[..., :4]; wgt = np.take_along_axis(dense, jnt, -1); wgt /= wgt.sum(-1, keepdims=True) + 1e-9
    mx = np.mod(uv[..., 0], 1.0) * TW - 0.5; my = np.mod(uv[..., 1], 1.0) * TH - 0.5
    col = cv2.remap(atlas, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    col[~valid] = 0
    os.makedirs(out, exist_ok=True)
    cv2.imwrite(os.path.join(out, mid + '_face.png'), np.dstack([col, valid * 255.0]).clip(0, 255).astype(np.uint8))
    np.savez_compressed(os.path.join(out, mid + '_maps.npz'), pos=pos.astype(np.float32), nor=nor.astype(np.float32), valid=valid,
                        jnt=jnt.astype(np.uint8), wgt=wgt.astype(np.float32), depth=np.where(valid, zb, 0).astype(np.float32))
    info = {'id': mid, 'w': Wd, 'h': Ht, 'ppu': PPU, 'mix': mix, 'r': r.tolist(), 'u': u.tolist(), 'f': f.tolist(),
            'a0': float(a0), 'b1': float(b1), 'dc': float(dc), 'headTris': int(len(tris)), 'validPx': int(valid.sum())}
    json.dump(info, open(os.path.join(out, mid + '_info.json'), 'w'), indent=1)
    print(mid, Wd, 'x', Ht, 'head tris', len(tris), 'valid px', int(valid.sum()), 'mix', mix)


if __name__ == '__main__':
    args = sys.argv[1:]; out = os.path.join(ROOT, '.face-work')
    if '--out' in args:
        k = args.index('--out'); out = args[k + 1]; del args[k:k + 2]
    for mid in args:
        bake(mid, out)
