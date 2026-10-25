"""潮汐小島 · 懸崖岩壁貼圖：Codex 畫的岩壁 → 可無縫重複的 WebP，打包成 src/isle/models/tex_cliff.js。

  python tools/cliffpack.py <warm.png> <earth.png> [--size 512]

- 無縫處理：把圖片平移半張（左右、上下互換）得到一張「接縫在中央」的版本，
  靠近原圖邊緣的地方改用平移版（它在那裡是原圖中央、本來就連續），中間用原圖，兩者之間平滑過渡；
  結果左右、上下重複鋪貼都看不出接縫。
- 以 data URL 放進 window.TA.CLIFF = { warm, earth }（離線雙擊也能載入）。
"""
import base64, io, json, sys
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent

def seamless(im):
    w, h = im.size
    off = ImageChops.offset(im, w // 2, h // 2)
    mask = Image.new('L', (w, h)); px = mask.load(); band = 0.28
    for y in range(h):
        for x in range(w):
            d = min(x, w - 1 - x) / w, min(y, h - 1 - y) / h   # 到最近邊緣的距離（0–0.5）
            k = min(1.0, min(d[0], d[1]) / band)
            k = k * k * (3 - 2 * k)
            px[x, y] = int(k * 255)   # 255：用原圖；0：用平移版
    return Image.composite(im, off, mask)

def pack(path, size):
    im = Image.open(path).convert('RGB').resize((size, size), Image.LANCZOS)
    im = seamless(im)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=88, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue()), im

if __name__ == '__main__':
    args = sys.argv[1:]
    size = int(args[args.index('--size') + 1]) if '--size' in args else 512
    if '--size' in args: i = args.index('--size'); del args[i:i + 2]
    out = {}
    for name, f in zip(('warm', 'earth'), args):
        url, n, im = pack(f, size); out[name] = url
        print(f'{name}: {Path(f).name} -> {size}x{size} webp {n:,} B')
        if '--preview' in sys.argv: pass
    dst = ROOT / 'src' / 'isle' / 'models' / 'tex_cliff.js'
    dst.write_text('/* 潮汐小島 · 懸崖岩壁貼圖（Codex 繪製、tools/cliffpack.py 做成無縫，不要手動修改） */\n'
                   '(window.TA = window.TA || {}).CLIFF = ' + json.dumps(out, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'-> {dst.relative_to(ROOT)} ({dst.stat().st_size:,} bytes)')
