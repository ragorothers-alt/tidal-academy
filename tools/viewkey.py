"""潮汐小島 · 住宅窗景去背：洋紅幕風景（Codex 繪製）→ 透明 WebP，打包成 src/isle/models/tex_view.js。

  python tools/viewkey.py <原圖.png> [--size 512]

- 以 RGB 到純洋紅（#FF00FF）的歐氏距離決定不透明度：32 以下全透明、180 以上全不透明，中間 smoothstep。
  不用「紅、藍比綠多」判斷，避免把偏藍的薰衣草山景當成背景。
- 半透明邊緣反算前景（觀察色 = a·前景 + (1-a)·洋紅），再依鄰近實心前景移除剩餘色幕污染。
- 透明處填鄰近前景的模糊 RGB；預乘透明度後縮圖，再補一次透明 RGB，避免黑邊或粉紅邊。
- 需要 Pillow、NumPy、SciPy；只寫入 tex_view.js，不改載入程式、不在專案內產生中間圖。
"""
import argparse
import base64
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parent.parent
KEY = np.array((255.0, 0.0, 255.0), dtype=np.float32)
CLEAR_DISTANCE = 32.0
OPAQUE_DISTANCE = 180.0
QUALITY = 88


def nearby_colors(rgb, solid):
    """每個位置取最近實心前景的顏色，沒有前景時拒絕輸出空白貼圖。"""
    if not solid.any():
        raise ValueError('找不到不透明的風景，請檢查原圖是否只有洋紅色幕。')
    indices = distance_transform_edt(~solid, return_distances=False, return_indices=True)
    return rgb[indices[0], indices[1]]


def fill_transparent(rgb, alpha, radius):
    # 從最近前景延伸顏色，再模糊；只改全透明處的 RGB，不動前景或 alpha。
    nearest = nearby_colors(rgb, alpha >= 0.99)
    blur = np.asarray(Image.fromarray(np.uint8(np.clip(nearest, 0, 255))).filter(
        ImageFilter.GaussianBlur(radius)), dtype=np.float32)
    return np.where((alpha > 0)[..., None], rgb, blur)


def key(path, size):
    with Image.open(path) as source:
        pixels = np.asarray(source.convert('RGBA'), dtype=np.float32)
    rgb, source_alpha = pixels[..., :3], pixels[..., 3] / 255.0
    distance = np.linalg.norm(rgb - KEY, axis=2)
    t = np.clip((distance - CLEAR_DISTANCE) / (OPAQUE_DISTANCE - CLEAR_DISTANCE), 0, 1)
    alpha = t * t * (3 - 2 * t)

    # 反算色幕混色；不可把藍色直接壓到綠色以下，否則會破壞薰衣草陰影。
    foreground = (rgb - (1 - alpha[..., None]) * KEY) / np.maximum(alpha[..., None], 1e-6)
    reference = nearby_colors(rgb, (distance >= OPAQUE_DISTANCE) & (source_alpha >= 0.99))
    # 距離 matte 是估計值：用鄰近實心前景到色幕的方向，扣掉反算後仍殘留的洋紅。
    direction = KEY - reference
    spill = np.clip(np.sum((foreground - reference) * direction, axis=2) /
                    np.maximum(np.sum(direction * direction, axis=2), 1), 0, 1)
    edge = (alpha > 0) & (alpha < 1)
    foreground = np.where(edge[..., None], foreground - spill[..., None] * direction, foreground)
    foreground = np.clip(foreground, 0, 255)
    alpha *= source_alpha
    foreground = fill_transparent(foreground, alpha, radius=3)

    # 各通道以浮點預乘 alpha 縮圖，避免透明 RGB 滲進可見邊緣；alpha 另外縮放。
    target = (size, size)
    resized_alpha = np.asarray(Image.fromarray(alpha).resize(target, Image.Resampling.LANCZOS))
    resized_alpha = np.clip(resized_alpha, 0, 1)
    channels = []
    for channel in range(3):
        premultiplied = foreground[..., channel] * alpha
        value = np.asarray(Image.fromarray(premultiplied).resize(target, Image.Resampling.LANCZOS))
        channels.append(value / np.maximum(resized_alpha, 1e-6))
    rgb_small = np.clip(np.stack(channels, axis=2), 0, 255)
    alpha_u8 = np.uint8(np.rint(resized_alpha * 255))
    rgb_small = fill_transparent(rgb_small, alpha_u8 / 255.0, radius=2)
    out = Image.fromarray(np.dstack((np.uint8(np.rint(rgb_small)), alpha_u8)))
    buf = io.BytesIO()
    out.save(buf, 'WEBP', quality=QUALITY, method=6, exact=True)
    return buf.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('image', type=Path)
    parser.add_argument('--size', type=int, default=512)
    args = parser.parse_args()
    if args.size < 1:
        parser.error('--size 必須大於 0')
    webp = key(args.image, args.size)
    url = 'data:image/webp;base64,' + base64.b64encode(webp).decode('ascii')
    out = ROOT / 'src' / 'isle' / 'models' / 'tex_view.js'
    out.write_text('/* 潮汐小島 · 住宅室內的窗景（Codex 繪製、tools/viewkey.py 去背，不要手動修改） */\n'
                   '(window.TA = window.TA || {}).VIEW = ' + json.dumps(url) + ';\n', encoding='utf-8')
    print(f'{args.image.name} -> {args.size}x{args.size} webp {len(webp):,} B (quality={QUALITY})')
    print(f'-> {out.relative_to(ROOT)} ({out.stat().st_size:,} bytes)')
    print(f'RGB key distance: transparent <= {CLEAR_DISTANCE:g}, opaque >= {OPAQUE_DISTANCE:g}')


if __name__ == '__main__':
    main()
