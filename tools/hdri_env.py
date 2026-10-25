"""潮汐小島 · 天空倒影貼圖：Poly Haven（CC0）的 Radiance .hdr 全景天空 → 512×256 的 sRGB JPEG（data URL），
附加到 src/isle/models/tex_photo.js 的 window.TA.TEX.env，給水面與玻璃當環境反射（不參與整體打光）。

  python tools/hdri_env.py <sky.hdr> [--exposure 0.9]

不依賴 imageio：自己讀 Radiance RGBE（含新式 RLE 掃描線）。亮度用簡單的 Reinhard 色調映射壓進 0–1。
"""
import base64, io, re, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

def read_hdr(path):
    b = Path(path).read_bytes(); i = 0
    while True:   # 檔頭到空行為止
        j = b.index(b'\n', i); line = b[i:j]; i = j + 1
        if line == b'': break
    j = b.index(b'\n', i); m = re.match(rb'-Y (\d+) \+X (\d+)', b[i:j]); i = j + 1
    h, w = int(m.group(1)), int(m.group(2))
    rows = []
    for _ in range(h):
        if b[i] == 2 and b[i + 1] == 2 and (b[i + 2] << 8 | b[i + 3]) == w:   # 新式 RLE：四個通道分開壓縮
            i += 4; ch = [bytearray() for _ in range(4)]
            for c in range(4):
                while len(ch[c]) < w:
                    n = b[i]; i += 1
                    if n > 128: ch[c] += bytes([b[i]]) * (n - 128); i += 1
                    else: ch[c] += b[i:i + n]; i += n
            rows.append(list(zip(*ch)))
        else:
            rows.append([tuple(b[i + k * 4:i + k * 4 + 4]) for k in range(w)]); i += w * 4
    return w, h, rows

if __name__ == '__main__':
    src = sys.argv[1]; exp = float(sys.argv[sys.argv.index('--exposure') + 1]) if '--exposure' in sys.argv else 0.9
    w, h, rows = read_hdr(src)
    img = Image.new('RGB', (w, h)); px = img.load()
    for y, row in enumerate(rows):
        for x, (r, g, b, e) in enumerate(row):
            if e == 0: px[x, y] = (0, 0, 0); continue
            f = 2.0 ** (e - 136) * exp
            c = [v * f for v in (r, g, b)]
            px[x, y] = tuple(int(255 * (v / (1 + v)) ** (1 / 2.2) + 0.5) for v in c)
    img = img.resize((512, 256), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, 'JPEG', quality=88)
    url = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
    out = ROOT / 'src' / 'isle' / 'models' / 'tex_photo.js'
    s = out.read_text(encoding='utf-8').rstrip()
    s = re.sub(r'\nwindow\.TA\.TEX\.env = .*$', '', s)
    out.write_text(s + "\nwindow.TA.TEX.env = '" + url + "';\n", encoding='utf-8')
    print(f'env {w}x{h} -> 512x256 jpeg {len(buf.getvalue()):,} B -> {out.relative_to(ROOT)}')
