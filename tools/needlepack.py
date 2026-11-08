"""潮汐小島 · 松杉的針葉圖集：Blender 算的 2×2 雲杉枝（透明背景、透明處已填好針葉色）→ WebP，打包成 src/isle/models/tex_needles.js。

  python tools/needlepack.py <needles.png>

- 圖集必須是 1024×1024（data/propmodels5.js 的替身畫布同尺寸，換上時不必重新配置貼圖）。
- 以 data URL 放進 window.TA.NEEDLES（離線雙擊也能載入）。
"""
import base64, io, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

if __name__ == '__main__':
    im = Image.open(sys.argv[1]).convert('RGBA')
    if im.size != (1024, 1024): im = im.resize((1024, 1024), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=86, method=6)
    url = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    dst = ROOT / 'src' / 'isle' / 'models' / 'tex_needles.js'
    dst.write_text('/* 潮汐小島 · 松杉的針葉圖集（Blender 算的 2×2 雲杉枝，tools/needlepack.py 打包，不要手動修改） */\n'
                   "(window.TA = window.TA || {}).NEEDLES = '" + url + "';\n", encoding='utf-8')
    print(f'needles: webp {len(buf.getvalue()):,} B -> {dst.relative_to(ROOT)} ({dst.stat().st_size:,} bytes)')
