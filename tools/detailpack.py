"""潮汐小島 · 細節貼圖：Blender／程式烘焙的無縫細節（亮度 d＋法線 n）→ WebP，打包成 src/isle/models/tex_detail.js。

  python tools/detailpack.py <資料夾> [--size 512]

- 資料夾裡是 <名稱>_d.png（灰階亮度，平均 128 = 不變）與 <名稱>_n.png（切線空間法線，OpenGL 慣例）。
- 名稱：grass、sand、rock、planks、plaster、bark、leaves、metal（engine.js 的 DET；缺的那種沿用程式畫的微表面）。
- 以 data URL 放進 window.TA.DETAIL = { 名稱: { d, n } }（離線雙擊也能載入）。
"""
import base64, io, json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NAMES = ['grass', 'sand', 'rock', 'planks', 'plaster', 'bark', 'leaves', 'metal']

def webp(path, size, q):
    im = Image.open(path).convert('RGB')
    if im.size != (size, size): im = im.resize((size, size), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

if __name__ == '__main__':
    args = sys.argv[1:]
    size = int(args[args.index('--size') + 1]) if '--size' in args else 512
    src = Path(args[0]); out = {}; total = 0
    for name in NAMES:
        d, n = src / f'{name}_d.png', src / f'{name}_n.png'
        if not (d.exists() and n.exists()): print(f'{name}: 缺檔，略過'); continue
        du, dn = webp(d, size, 86); nu, nn = webp(n, size, 90)
        out[name] = {'d': du, 'n': nu}; total += dn + nn
        print(f'{name}: d {dn:,} B, n {nn:,} B')
    dst = ROOT / 'src' / 'isle' / 'models' / 'tex_detail.js'
    dst.write_text('/* 潮汐小島 · 細節貼圖（Blender／程式烘焙的無縫亮度與法線，tools/detailpack.py 打包，不要手動修改） */\n'
                   '(window.TA = window.TA || {}).DETAIL = ' + json.dumps(out, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'-> {dst.relative_to(ROOT)} ({dst.stat().st_size:,} bytes, 圖 {total:,} B)')
