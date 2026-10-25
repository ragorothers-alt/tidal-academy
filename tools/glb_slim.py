"""潮汐小島 · 角色／資產模型瘦身：Tripo 產生的 GLB → 遊戲用的 JS 模型檔。

  python tools/glb_slim.py <in.glb> <id> [--color 1024] [--normal 512]

- 顏色貼圖縮成 JPEG（預設 1024），法線貼圖縮成 JPEG（預設 512，0 表示拿掉），金屬粗糙度貼圖拿掉（改成固定粗糙度）。
- 輸出 src/isle/models/<id>.js：把 GLB 以 base64 存在 window.TA.MODELS[id]，
  遊戲執行時用 <script> 動態載入（離線雙擊 isle.html 也能用，不需要伺服器）。
"""
import base64, io, json, struct, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

def read_glb(path):
    b = Path(path).read_bytes()
    assert b[:4] == b'glTF', 'not a GLB'
    off, js, bin_ = 12, None, b''
    while off < len(b):
        ln, typ = struct.unpack('<II', b[off:off + 8]); chunk = b[off + 8:off + 8 + ln]
        if typ == 0x4E4F534A: js = json.loads(chunk)
        elif typ == 0x004E4942: bin_ = chunk
        off += 8 + ln
    return js, bin_

def write_glb(js, bin_):
    j = json.dumps(js, separators=(',', ':')).encode('utf-8'); j += b' ' * ((4 - len(j) % 4) % 4)
    bin_ += b'\0' * ((4 - len(bin_) % 4) % 4)
    total = 12 + 8 + len(j) + 8 + len(bin_)
    return b'glTF' + struct.pack('<II', 2, total) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(bin_), 0x004E4942) + bin_

def slim(js, bin_, color=1024, normal=512):
    views = js['bufferViews']
    def view_bytes(i): v = views[i]; o = v.get('byteOffset', 0); return bin_[o:o + v['byteLength']]
    # 哪張圖是什麼用途
    role = {}
    for m in js.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        if 'baseColorTexture' in pbr: role[js['textures'][pbr['baseColorTexture']['index']]['source']] = 'color'
        if 'metallicRoughnessTexture' in pbr: role.setdefault(js['textures'][pbr['metallicRoughnessTexture']['index']]['source'], 'mr'); del pbr['metallicRoughnessTexture']
        pbr['metallicFactor'] = 0.0; pbr['roughnessFactor'] = 0.82
        if 'normalTexture' in m:
            role.setdefault(js['textures'][m['normalTexture']['index']]['source'], 'normal')
            if not normal: del m['normalTexture']
        for k in ('occlusionTexture', 'emissiveTexture'):
            if k in m: role.setdefault(js['textures'][m[k]['index']]['source'], 'other'); del m[k]
    # 重新組 BIN：非圖片的 bufferView 原樣搬過去，圖片重新壓縮
    new_bin, new_views, remap = bytearray(), [], {}
    img_view = {img['bufferView']: i for i, img in enumerate(js.get('images', [])) if 'bufferView' in img}
    keep_imgs = {i for i, r in role.items() if r == 'color' or (r == 'normal' and normal)}
    for vi, v in enumerate(views):
        if vi in img_view:
            ii = img_view[vi]
            if ii not in keep_imgs: continue
            im = Image.open(io.BytesIO(view_bytes(vi))).convert('RGB')
            size = color if role.get(ii) == 'color' else normal
            if max(im.size) > size: im = im.resize((size, size), Image.LANCZOS)
            buf = io.BytesIO(); im.save(buf, 'JPEG', quality=86 if role.get(ii) == 'color' else 90); data = buf.getvalue()
            js['images'][ii]['mimeType'] = 'image/jpeg'
        else:
            data = view_bytes(vi)
        while len(new_bin) % 4: new_bin += b'\0'
        nv = {k: val for k, val in v.items() if k not in ('byteOffset', 'byteLength')}
        nv['buffer'] = 0; nv['byteOffset'] = len(new_bin); nv['byteLength'] = len(data)
        remap[vi] = len(new_views); new_views.append(nv); new_bin += data
    for a in js.get('accessors', []):
        if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
    # 拿掉不用的圖片與貼圖，重新編號
    imgs = js.get('images', []); keep = [i for i in range(len(imgs)) if i in keep_imgs]
    imap = {o: n for n, o in enumerate(keep)}
    js['images'] = [dict(imgs[o], bufferView=remap[imgs[o]['bufferView']]) for o in keep]
    texs = js.get('textures', []); tkeep = [t for t in range(len(texs)) if texs[t]['source'] in imap]
    tmap = {o: n for n, o in enumerate(tkeep)}
    js['textures'] = [dict(texs[o], source=imap[texs[o]['source']]) for o in tkeep]
    for m in js.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        if 'baseColorTexture' in pbr: pbr['baseColorTexture']['index'] = tmap[pbr['baseColorTexture']['index']]
        if 'normalTexture' in m: m['normalTexture']['index'] = tmap[m['normalTexture']['index']]
    js['bufferViews'] = new_views; js['buffers'] = [{'byteLength': len(new_bin)}]
    return js, bytes(new_bin)

def write_list():
    """依 src/isle/models/ 裡的檔案產生 src/isle/model-list.js（遊戲用來判斷哪些角色已經有模型）"""
    ids = sorted(f.stem for f in (ROOT / 'src' / 'isle' / 'models').glob('*.js'))
    head = '/* 潮汐小島 · 已完成的 3D 模型（tools/glb_slim.py 自動產生，不要手動修改） */'
    (ROOT / 'src' / 'isle' / 'model-list.js').write_text(head + chr(10) + 'export const MODEL_IDS = ' + json.dumps(ids) + ';' + chr(10), encoding='utf-8')

if __name__ == '__main__':
    if sys.argv[1:] == ['--list']: write_list(); sys.exit(0)
    src, mid = sys.argv[1], sys.argv[2]
    color = int(sys.argv[sys.argv.index('--color') + 1]) if '--color' in sys.argv else 1024
    normal = int(sys.argv[sys.argv.index('--normal') + 1]) if '--normal' in sys.argv else 512
    js, bin_ = read_glb(src)
    js, bin_ = slim(js, bin_, color, normal)
    glb = write_glb(js, bin_)
    out = ROOT / 'src' / 'isle' / 'models' / f'{mid}.js'; out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(f"/* 潮汐小島 · 3D 模型「{mid}」（Tripo 產生，tools/glb_slim.py 轉檔） */\n(window.TA = window.TA || {{}}).MODELS = window.TA.MODELS || {{}};\nwindow.TA.MODELS[{json.dumps(mid)}] = '{base64.b64encode(glb).decode()}';\n", encoding='utf-8')
    write_list()
    print(f'{mid}: {Path(src).stat().st_size:,} -> glb {len(glb):,} bytes -> {out.relative_to(ROOT)} ({out.stat().st_size:,} bytes)')
    sys.path.insert(0, str(Path(__file__).resolve().parent)); import glb_pack; glb_pack.main([mid])   # 再把法線、貼圖座標、權重、動畫改成較小的數字格式
