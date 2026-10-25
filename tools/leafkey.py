"""潮汐小島 · 樹葉貼圖去背：洋紅幕上的葉叢（Codex 畫的）→ 透明背景的 WebP，打包成 src/isle/models/tex_leaves.js。

  python tools/leafkey.py <gold.png> <green.png> [--size 512]

- 葉子有黃綠色，不能用綠幕，所以用洋紅幕（#FF00FF）：每個像素的不透明度由「紅、藍都比綠多多少」決定。
- 半透明的邊緣把背景的洋紅反算掉（觀察到的顏色 = a·葉 + (1-a)·背景），殘留的洋紅再壓掉（藍不超過綠），邊緣不會有粉紅邊。
- 透明處填上鄰近葉子的顏色（縮圖時邊緣才不會發黑），縮成正方形，存成有透明度的 WebP，
  以 data URL 放進 window.TA.LEAVES = { gold, green }（離線雙擊也能載入）。
"""
import base64, io, json, sys
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent

def key(path, size):
    im = Image.open(path).convert('RGB'); w, h = im.size; px = im.load()
    corners = [px[x, y] for x in (3, w - 4) for y in (3, h - 4)]
    bg = tuple(sorted(c[i] for c in corners)[len(corners) // 2] for i in range(3))
    bgs = min(bg[0], bg[2]) - bg[1]   # 背景的洋紅程度（約 255）
    out = Image.new('RGBA', (w, h)); op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            spill = min(r, b) - g
            a = 1.0 - min(1.0, max(0.0, (spill - 10) / (bgs - 50)))
            if a <= 0.01: op[x, y] = (0, 0, 0, 0); continue
            cr, cg, cb = [(v - (1 - a) * bv) / a for v, bv in zip((r, g, b), bg)]
            cb = min(cb, cg)   # 葉子的藍色不會比綠多：多出來的是洋紅殘留
            op[x, y] = tuple(int(max(0, min(255, v))) for v in (cr, cg, cb)) + (int(a * 255),)
    out = out.resize((size, size), Image.LANCZOS)
    # 透明處的顏色換成模糊後的葉色（只改 RGB，不改透明度）
    rgb = out.convert('RGB'); alpha = out.getchannel('A')
    fill = Image.new('RGB', out.size, (150, 130, 40))
    blur = Image.composite(rgb, fill, alpha.point(lambda v: 255 if v > 128 else 0)).filter(ImageFilter.GaussianBlur(6))
    rgb = Image.composite(rgb, blur, alpha.point(lambda v: 255 if v > 8 else 0))
    out = Image.merge('RGBA', (*rgb.split(), alpha))
    buf = io.BytesIO(); out.save(buf, 'WEBP', quality=90, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

if __name__ == '__main__':
    args = sys.argv[1:]
    size = int(args[args.index('--size') + 1]) if '--size' in args else 512
    if '--size' in args: i = args.index('--size'); del args[i:i + 2]
    pack = {}
    for name, f in zip(('gold', 'green'), args):
        url, n = key(f, size); pack[name] = url
        print(f'{name}: {Path(f).name} -> {size}x{size} webp {n:,} B')
    out = ROOT / 'src' / 'isle' / 'models' / 'tex_leaves.js'
    out.write_text('/* 潮汐小島 · 廣場大樹的葉叢貼圖（Codex 繪製、tools/leafkey.py 去背，不要手動修改） */\n'
                   '(window.TA = window.TA || {}).LEAVES = ' + json.dumps(pack, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'-> {out.relative_to(ROOT)} ({out.stat().st_size:,} bytes)')
