"""潮汐小島 · 照片細節材質：Poly Haven（CC0）的無縫材質 → 遊戲的細節圖格式，打包成 src/isle/models/tex_photo.js。

  python tools/phototex.py <下載資料夾> [--size 512]

資料夾裡每種材質放兩張圖：<來源名稱>_d.jpg（顏色）與 <來源名稱>_n.jpg（OpenGL 法線圖）。
細節圖的格式跟 texgen-core.js 相同：RGB 以 128 為中心的明暗起伏（乘在材質顏色上，128 = 不變），
所以照片要先去掉平均顏色、只留下明暗與一點點色相變化，再把起伏幅度調到和程式產生的差不多。
輸出以 base64 存在 window.TA.TEX[名稱] = { d, n }（data URL），離線雙擊 isle.html 也能載入。
"""
import base64, io, json, sys
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
# 遊戲的細節材質名稱 → Poly Haven 材質，以及明暗起伏的幅度（標準差，0–255）與保留多少色相
MAP = {
    'grass': ('leafy_grass', 20, 0.35),
    'sand': ('coast_sand_01', 13, 0.25),
    'rock': ('rock_face_03', 24, 0.3),
    'planks': ('weathered_brown_planks', 20, 0.3),
    'plaster': ('white_plaster_02', 9, 0.2),
    'bark': ('bark_brown_02', 26, 0.25),
}

def detail(img, std_target, chroma):
    img = img.convert('RGB')
    lum = img.convert('L'); st = ImageStat.Stat(lum); mean, std = st.mean[0], max(st.stddev[0], 1e-3)
    cm = ImageStat.Stat(img).mean
    k = std_target / std
    px = img.load(); lp = lum.load(); w, h = img.size
    out = Image.new('RGB', (w, h)); op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]; l = lp[x, y]
            base = (l - mean) * k
            ch = [(c / max(cm[i], 1) - l / max(mean, 1)) * 128 * chroma for i, c in enumerate((r, g, b))]   # 和平均色相比的偏差
            op[x, y] = tuple(int(max(64, min(196, 128 + base + ch[i]))) for i in range(3))
    return out

def jpeg_url(img, q):
    buf = io.BytesIO(); img.save(buf, 'JPEG', quality=q, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

if __name__ == '__main__':
    src = Path(sys.argv[1]); size = int(sys.argv[sys.argv.index('--size') + 1]) if '--size' in sys.argv else 512
    pack, total = {}, 0
    for name, (ph, std, chroma) in MAP.items():
        d = Image.open(src / f'{ph}_d.jpg').resize((size, size), Image.LANCZOS)
        n = Image.open(src / f'{ph}_n.jpg').convert('RGB').resize((size, size), Image.LANCZOS)
        du, ds = jpeg_url(detail(d, std, chroma), 88); nu, ns = jpeg_url(n, 90)
        pack[name] = {'d': du, 'n': nu, 'src': ph}; total += ds + ns
        print(f'{name:8s} <- {ph:24s} detail {ds:,} B  normal {ns:,} B')
    out = ROOT / 'src' / 'isle' / 'models' / 'tex_photo.js'
    out.write_text('/* 潮汐小島 · 照片細節材質（Poly Haven，CC0；tools/phototex.py 產生，不要手動修改） */\n'
                   '(window.TA = window.TA || {}).TEX = ' + json.dumps(pack, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'-> {out.relative_to(ROOT)} ({out.stat().st_size:,} bytes, images {total:,} B)')
