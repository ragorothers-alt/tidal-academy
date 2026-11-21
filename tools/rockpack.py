"""潮汐小島 · 海岸岩石的紋理圖集：三張可無縫拼接的灰階圖（Codex 繪製）→ 一張 RGB WebP，打包成 src/isle/models/tex_rock.js。

  python tools/rockpack.py <資料夾> [--size 768] [--q 72]

- 資料夾裡要有 rock_strata.png（岩層高度）、rock_pitted.png（海蝕孔洞高度）、rock_stain.png（潮痕、水漬、藤壺遮罩）。
- 紅 = 岩層高度、綠 = 孔洞高度（亮 = 凸出）、藍 = 潮痕與附著物（亮 = 有）。
- 以 data URL 放進 window.TA.ROCK（離線雙擊也能載入）。
"""
import base64, io, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

def arg(name, default):
    return int(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default

if __name__ == '__main__':
    src, size, q = Path(sys.argv[1]), arg('--size', 768), arg('--q', 72)
    chans = [Image.open(src / n).convert('L').resize((size, size), Image.LANCZOS) for n in ('rock_strata.png', 'rock_pitted.png', 'rock_stain.png')]
    buf = io.BytesIO(); Image.merge('RGB', chans).save(buf, 'WEBP', quality=q, method=6)
    url = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    dst = ROOT / 'src' / 'isle' / 'models' / 'tex_rock.js'
    dst.write_text('/* 潮汐小島 · 海岸岩石的紋理圖集（紅 岩層高度、綠 孔洞高度、藍 潮痕；tools/rockpack.py 打包，不要手動修改） */\n'
                   "(window.TA = window.TA || {}).ROCK = '" + url + "';\n", encoding='utf-8')
    print(f'rock: webp {len(buf.getvalue()):,} B -> {dst.relative_to(ROOT)} ({dst.stat().st_size:,} bytes)')
