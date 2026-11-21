"""潮汐小島 · 沙灘浪沫的遮罩圖集：三張可無縫拼接的灰階遮罩（Codex 繪製）→ 一張 RGB WebP，打包成 src/isle/models/tex_foam.js。

  python tools/foampack.py <資料夾> [--size 768] [--q 70]

- 資料夾裡要有 foam_lace.png（退浪留下的薄泡沫網）、foam_thick.png（浪頭的厚白泡）、foam_bubbles.png（快消散的零星小泡）。
- 紅 = 薄網、綠 = 厚泡、藍 = 小泡；黑 = 沒有泡沫。
- 以 data URL 放進 window.TA.FOAM（離線雙擊也能載入）。
"""
import base64, io, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

def arg(name, default):
    return int(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default

if __name__ == '__main__':
    src, size, q = Path(sys.argv[1]), arg('--size', 768), arg('--q', 70)
    chans = [Image.open(src / n).convert('L').resize((size, size), Image.LANCZOS) for n in ('foam_lace.png', 'foam_thick.png', 'foam_bubbles.png')]
    buf = io.BytesIO(); Image.merge('RGB', chans).save(buf, 'WEBP', quality=q, method=6)
    url = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    dst = ROOT / 'src' / 'isle' / 'models' / 'tex_foam.js'
    dst.write_text('/* 潮汐小島 · 沙灘浪沫的遮罩圖集（紅 薄網、綠 厚泡、藍 小泡；tools/foampack.py 打包，不要手動修改） */\n'
                   "(window.TA = window.TA || {}).FOAM = '" + url + "';\n", encoding='utf-8')
    print(f'foam: webp {len(buf.getvalue()):,} B -> {dst.relative_to(ROOT)} ({dst.stat().st_size:,} bytes)')
