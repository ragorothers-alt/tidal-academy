"""潮汐小島 · 模型檔再壓縮：把 src/isle/models/<id>.js 裡的 GLB 改用較小的數字格式，外觀不變。

  python tools/glb_pack.py --all          # 全部模型（已經壓過的會略過）
  python tools/glb_pack.py sen player     # 指定模型
  python tools/glb_pack.py --check sen    # 只印出會省多少、誤差多大，不寫檔

- 法線：float32 → int8（KHR_mesh_quantization；角度誤差不到 0.5°）
- 貼圖座標：float32 → uint16（只在 0–1 範圍內時；誤差 < 1/65535，1024 貼圖上不到 0.02 像素）
- 骨架權重：float32 → uint8（glTF 本身支援；每個頂點的四個權重加總仍是 1）
- 動畫旋轉：float32 → int16（glTF 本身支援；誤差約 0.003°）
- 動畫的時間軸：內容一樣的只留一份（每條骨頭的動作原本各存一份相同的時間）
- 索引：頂點不到 65536 個的模型，uint32 → uint16（無損）
頂點位置、索引、貼圖都不動。three.js 的 GLTFLoader 會自己把這些格式還原成浮點數。
"""
import base64, hashlib, json, re, struct, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / 'src' / 'isle' / 'models'
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
QEXT = 'KHR_mesh_quantization'


def read(path):
    s = path.read_text(encoding='utf-8')
    m = re.search(r"\] = '([A-Za-z0-9+/=]+)';", s)
    if not m: return None
    b = base64.b64decode(m.group(1)); assert b[:4] == b'glTF'
    off, js, bin_ = 12, None, b''
    while off < len(b):
        ln, typ = struct.unpack('<II', b[off:off + 8]); chunk = b[off + 8:off + 8 + ln]
        if typ == 0x4E4F534A: js = json.loads(chunk)
        elif typ == 0x004E4942: bin_ = chunk
        off += 8 + ln
    return s, m, js, bin_


def write_glb(js, bin_):
    j = json.dumps(js, separators=(',', ':'), ensure_ascii=False).encode('utf-8'); j += b' ' * ((4 - len(j) % 4) % 4)
    bin_ = bytes(bin_) + b'\0' * ((4 - len(bin_) % 4) % 4)
    total = 12 + 8 + len(j) + 8 + len(bin_)
    return b'glTF' + struct.pack('<II', 2, total) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(bin_), 0x004E4942) + bin_


def pack(js, bin_):
    views, accs = js['bufferViews'], js['accessors']
    data = {}   # accessor 索引 → (新的位元組, byteStride 或 None)；沒列在這裡的 accessor 原樣搬過去

    def arr(i):
        a = accs[i]; v = views[a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
        o = v.get('byteOffset', 0) + a.get('byteOffset', 0); st = v.get('byteStride')
        if st and st != n * dt.itemsize:   # 交錯排列的資料
            raw = np.frombuffer(bin_, np.uint8, st * (a['count'] - 1) + n * dt.itemsize, o)
            return np.stack([np.frombuffer(raw[k * st:k * st + n * dt.itemsize].tobytes(), dt) for k in range(a['count'])])
        return np.frombuffer(bin_, dt, a['count'] * n, o).reshape(a['count'], n)

    err = {}
    def note(k, e): err[k] = max(err.get(k, 0.0), float(e))
    quant = QEXT in js.get('extensionsUsed', [])
    for mesh in js.get('meshes', []):
        for p in mesh['primitives']:
            at = p['attributes']
            i = p.get('indices')   # 頂點不到 65536 個：索引用 uint16 就夠（原本 uint32）
            if i is not None and accs[i]['componentType'] == 5125 and i not in data and accs[at['POSITION']]['count'] < 65536:
                data[i] = (arr(i).astype(np.uint16).tobytes(), None); accs[i]['componentType'] = 5123
                if 'min' in accs[i]: accs[i]['min'] = [int(x) for x in accs[i]['min']]; accs[i]['max'] = [int(x) for x in accs[i]['max']]
            i = at.get('NORMAL')
            if i is not None and accs[i]['componentType'] == 5126 and i not in data:
                n = arr(i).astype(np.float64); ok = np.linalg.norm(n, axis=1) > 0.5; n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)   # ok：原檔裡少數長度是 0 的法線不算誤差
                q = np.clip(np.round(n * 127), -127, 127).astype(np.int8)
                back = q / 127.0; back /= np.maximum(np.linalg.norm(back, axis=1, keepdims=True), 1e-12)
                note('normal°', np.degrees(np.arccos(np.clip((back * n).sum(1)[ok], -1, 1))).max())
                pad = np.zeros((len(q), 4), np.int8); pad[:, :3] = q   # 頂點屬性每筆要對齊 4 位元組
                data[i] = (pad.tobytes(), 4); accs[i].update(componentType=5120, normalized=True); accs[i].pop('min', None); accs[i].pop('max', None); quant = True
            for key in [k for k in at if k.startswith('TEXCOORD_')]:
                i = at[key]
                if accs[i]['componentType'] != 5126 or i in data: continue
                u = arr(i).astype(np.float64)
                if u.min() < 0 or u.max() > 1: continue
                q = np.round(u * 65535).astype(np.uint16); note('uv', np.abs(q / 65535.0 - u).max())
                data[i] = (q.tobytes(), None); accs[i].update(componentType=5123, normalized=True); accs[i].pop('min', None); accs[i].pop('max', None); quant = True
            i = at.get('WEIGHTS_0')
            if i is not None and accs[i]['componentType'] == 5126 and i not in data:
                w = arr(i).astype(np.float64); w /= np.maximum(w.sum(1, keepdims=True), 1e-12)
                q = np.floor(w * 255).astype(np.int64); rest = 255 - q.sum(1)   # 把差額補給小數部分最大的那幾個，加總剛好 255
                frac = w * 255 - q; order = np.argsort(-frac, axis=1)
                for r in range(4):
                    sel = rest > r; q[sel, order[sel, r]] += 1
                q = q.astype(np.uint8); note('weight', np.abs(q / 255.0 - w).max())
                data[i] = (q.tobytes(), None); accs[i].update(componentType=5121, normalized=True); accs[i].pop('min', None); accs[i].pop('max', None)
    for an in js.get('animations', []):
        for ch in an['channels']:
            if ch['target']['path'] != 'rotation': continue
            i = an['samplers'][ch['sampler']]['output']
            if accs[i]['componentType'] != 5126 or i in data: continue
            r = arr(i).astype(np.float64); r /= np.maximum(np.linalg.norm(r, axis=1, keepdims=True), 1e-12)
            q = np.clip(np.round(r * 32767), -32767, 32767).astype(np.int16)
            b = q / 32767.0; b /= np.linalg.norm(b, axis=1, keepdims=True)
            note('rot°', np.degrees(2 * np.arccos(np.clip(np.abs((b * r).sum(1)), -1, 1))).max())
            data[i] = (q.tobytes(), None); accs[i].update(componentType=5122, normalized=True); accs[i].pop('min', None); accs[i].pop('max', None)
    # 內容一樣的動畫時間軸只留一份
    seen = {}
    for an in js.get('animations', []):
        for s in an['samplers']:
            i = s['input']; a = arr(i); h = hashlib.sha1(a.tobytes()).hexdigest() + str(a.shape)
            s['input'] = seen.setdefault(h, i)
    # 重新排 BIN：只留還有用到的 accessor／圖片
    used = set()
    for mesh in js.get('meshes', []):
        for p in mesh['primitives']:
            used.update(p['attributes'].values()); used.update(t for tg in p.get('targets', []) for t in tg.values())
            if 'indices' in p: used.add(p['indices'])
    for sk in js.get('skins', []):
        if 'inverseBindMatrices' in sk: used.add(sk['inverseBindMatrices'])
    for an in js.get('animations', []):
        for s in an['samplers']: used.update((s['input'], s['output']))
    amap, new_accs, new_views, new_bin = {}, [], [], bytearray()
    def add_view(blob, stride=None, target=None):
        while len(new_bin) % 4: new_bin.append(0)
        v = {'buffer': 0, 'byteOffset': len(new_bin), 'byteLength': len(blob)}
        if stride: v['byteStride'] = stride
        if target: v['target'] = target
        new_views.append(v); new_bin.extend(blob); return len(new_views) - 1
    for i in sorted(used):
        a = dict(accs[i])
        if i in data: blob, stride = data[i]
        else:
            v = views[a['bufferView']] if 'bufferView' in a else None; st = v and v.get('byteStride')
            if st:   # 已經是對齊過的交錯資料（例如上一輪壓好的法線）：原樣搬，保留 byteStride
                o = v.get('byteOffset', 0) + a.get('byteOffset', 0); blob, stride = bin_[o:o + st * a['count']], st
            else: blob, stride = arr(i).tobytes(), None
        a['bufferView'] = add_view(blob, stride); a.pop('byteOffset', None)
        amap[i] = len(new_accs); new_accs.append(a)
    for img in js.get('images', []):
        if 'bufferView' in img:
            v = views[img['bufferView']]; o = v.get('byteOffset', 0)
            img['bufferView'] = add_view(bin_[o:o + v['byteLength']])
    for mesh in js.get('meshes', []):
        for p in mesh['primitives']:
            p['attributes'] = {k: amap[v] for k, v in p['attributes'].items()}
            if 'indices' in p: p['indices'] = amap[p['indices']]
            if 'targets' in p: p['targets'] = [{k: amap[v] for k, v in tg.items()} for tg in p['targets']]
    for sk in js.get('skins', []):
        if 'inverseBindMatrices' in sk: sk['inverseBindMatrices'] = amap[sk['inverseBindMatrices']]
    for an in js.get('animations', []):
        for s in an['samplers']: s['input'] = amap[s['input']]; s['output'] = amap[s['output']]
    js['accessors'], js['bufferViews'], js['buffers'] = new_accs, new_views, [{'byteLength': len(new_bin)}]
    if quant:
        for k in ('extensionsUsed', 'extensionsRequired'):
            js[k] = sorted(set(js.get(k, [])) | {QEXT})
    return js, bytes(new_bin), err


def main(argv):
    check = '--check' in argv; argv = [a for a in argv if a != '--check']
    ids = sorted(f.stem for f in MODELS.glob('*.js')) if argv == ['--all'] else argv
    tot0 = tot1 = 0
    for mid in ids:
        path = MODELS / f'{mid}.js'; r = read(path)
        if not r: continue
        s, m, js, bin_ = r
        old = len(m.group(1))
        js, bin_, err = pack(js, bin_)
        b64 = base64.b64encode(write_glb(js, bin_)).decode()
        if len(b64) >= old: print(f'{mid}: 沒有可以再壓的，略過'); continue   # 每一步都只處理還是原格式的資料，重跑不會再動
        tot0 += old; tot1 += len(b64)
        print(f'{mid}: {old // 1024:,} KB → {len(b64) // 1024:,} KB（{100 - len(b64) * 100 // old}% 較小）誤差 ' + '，'.join(f'{k} {v:.4g}' for k, v in err.items()))
        if not check: path.write_text(s[:m.start(1)] + b64 + s[m.end(1):], encoding='utf-8')
    if tot0: print(f'合計 {tot0 / 1048576:.1f} MB → {tot1 / 1048576:.1f} MB')


if __name__ == '__main__':
    main(sys.argv[1:])
