"""潮汐小島 · 雲朵素材去背：綠幕上的雲（Codex 畫的）→ 透明背景的 WebP，打包成 src/isle/models/tex_clouds.js。

  python tools/cloudkey.py <out_name> <img1.png> [img2.png ...] [--width 768] [--global CLOUDS]

- 背景色取四個角落的中位數；每個像素的不透明度由「比背景綠多少」決定（綠色比紅、藍多越多越透明）。
- 半透明的邊緣把背景的綠色反算掉（觀察到的顏色 = a·雲 + (1-a)·背景），再把殘留的綠色壓到紅藍的平均，邊緣不會有綠邊。
- 裁到雲的範圍（留一點邊），縮到指定寬度，存成有透明度的 WebP，以 data URL 放進 window.TA.CLOUDS（離線雙擊也能載入）。
"""
import base64, io, json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

def key(path, width):
    im = Image.open(path).convert('RGB'); w, h = im.size; px = im.load()
    corners = sorted([px[x, y] for x in (2, w - 3) for y in (2, h - 3)], key=lambda c: c[1])
    bg = corners[len(corners) // 2]
    out = Image.new('RGBA', (w, h)); op = out.load(); x0, y0, x1, y1 = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            spill = g - max(r, b)   # 綠色比紅藍多多少：背景大約 200 以上，雲接近 0
            a = 1.0 - min(1.0, max(0.0, (spill - 12) / (bg[1] - max(bg[0], bg[2]) - 40)))
            if a <= 0.01: op[x, y] = (0, 0, 0, 0); continue
            # 反算：雲 = (觀察 - (1-a)·背景) / a
            cr, cg, cb = [(v - (1 - a) * bv) / a for v, bv in zip((r, g, b), bg)]
            cg = min(cg, (cr + cb) / 2 - 2 * (1 - a))   # 殘留的綠色壓掉（越透明的邊緣壓得越多）
            op[x, y] = tuple(int(max(0, min(255, v))) for v in (cr, cg, cb)) + (int(a * 255),)
            if a > 0.2: x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
    pad = 12
    out = out.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))
    if out.width > width: out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
    buf = io.BytesIO(); out.save(buf, 'WEBP', quality=88, method=6)
    return out.size, 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

if __name__ == '__main__':
    args = [a for a in sys.argv[1:]]
    width = int(args[args.index('--width') + 1]) if '--width' in args else 768
    if '--width' in args: i = args.index('--width'); del args[i:i + 2]
    glob = args[args.index('--global') + 1] if '--global' in args else 'CLOUDS'   # 打包成哪個全域變數（遠景貼圖用 FARBG）
    if '--global' in args: i = args.index('--global'); del args[i:i + 2]
    name, files = args[0], args[1:]
    pack = []
    for f in files:
        (w, h), url, n = key(f, width); pack.append({'w': w, 'h': h, 'src': url})
        print(f'{Path(f).name}: {w}x{h} webp {n:,} B')
    out = ROOT / 'src' / 'isle' / 'models' / f'{name}.js'
    out.write_text('/* 潮汐小島 · ' + ('雲朵貼圖' if glob == 'CLOUDS' else '遠景貼圖') + '（Codex 繪製、tools/cloudkey.py 去背，不要手動修改） */\n'
                   '(window.TA = window.TA || {}).' + glob + ' = ' + json.dumps(pack, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'-> {out.relative_to(ROOT)} ({out.stat().st_size:,} bytes)')
