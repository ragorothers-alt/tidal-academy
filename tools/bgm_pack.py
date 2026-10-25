"""潮汐小島 · 配樂打包：把 YuE2 產生的純音樂（flac）做成可以無縫循環的 BGM，打包成 src/isle/models/bgm_<name>.js。

用法：python tools/bgm_pack.py <name> <input.flac> [--xf 3]

1. 去掉開頭的靜音、結尾的淡出（只取音量穩定的段落）。
2. 在開頭附近找 a、結尾附近找 b，讓 b 前後聽起來最像 a 前後（頻譜相似，再用波形微調對齊），接縫比較不突兀。
3. 烘成循環：輸出 A[a+X : b]，最後 X 秒換成 A[b-X : b] 淡出 + A[a : a+X] 淡入（等功率），
   播完剛好接回開頭 A[a+X]——循環播放時沒有斷點。
4. 音量統一（RMS 約 -20 dBFS，峰值限制），轉成 MP3 128k，base64 存進 window.TA.BGM[name]（離線雙擊也能載入）。
需要 ffmpeg 與 numpy。
"""
import argparse, base64, json, pathlib, subprocess, sys
import numpy as np

SR = 44100
ROOT = pathlib.Path(__file__).resolve().parent.parent

def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()

def frames(mono, hop=2048, n=4096):
    k = (len(mono) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(k)[:, None]
    X = np.abs(np.fft.rfft(mono[idx] * np.hanning(n), axis=1))[:, 1:600]   # 約 6 kHz 以下（旋律與和聲）
    X = np.log1p(X * 10)
    return X / (np.linalg.norm(X, axis=1, keepdims=True) + 1e-9), hop

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('name'); ap.add_argument('src'); ap.add_argument('--xf', type=float, default=3.0)
    ap.add_argument('--head', type=float, default=None, help='手動指定 a（秒）'); ap.add_argument('--tail', type=float, default=None, help='手動指定 b（秒）')
    o = ap.parse_args()
    A = load(o.src); mono = A.mean(1); X = int(o.xf * SR)
    # 每 0.5 秒的音量，找出穩定段落
    w = SR // 2; rms = np.array([np.sqrt(np.mean(mono[i:i + w] ** 2)) for i in range(0, len(mono) - w, w)])
    ref = np.median(rms[rms > rms.max() * 0.05])
    ok = np.where(rms > ref * 0.5)[0]
    s0, s1 = ok[0] * w, (ok[-1] + 1) * w
    F, hop = frames(mono)
    W = int(2.0 * SR / hop)   # 比較前後各 2 秒
    def seg(i): return F[max(0, i - W):i + W].reshape(-1)
    a_lo, a_hi = s0 // hop + W, min(s0 // hop + int(10 * SR / hop), len(F) - W)
    b_lo, b_hi = max(s1 // hop - int(14 * SR / hop), a_hi + int(20 * SR / hop)), s1 // hop - W
    if o.head is not None: a_lo = a_hi = int(o.head * SR / hop)
    if o.tail is not None: b_lo = b_hi = int(o.tail * SR / hop)
    best = (-1, 0, 0)
    for ia in range(a_lo, a_hi + 1):
        va = seg(ia)
        for ib in range(b_lo, b_hi + 1):
            vb = seg(ib)
            if len(va) != len(vb): continue
            c = float(va @ vb) / (W * 2)
            if c > best[0]: best = (c, ia, ib)
    sim, ia, ib = best
    a, b = ia * hop, ib * hop
    # 波形微調：b 在 ±25 ms 內找和 a 最對齊的位置
    L = int(0.08 * SR); r = int(0.025 * SR); ref_w = mono[a:a + L]
    cands = [(float(np.dot(ref_w, mono[b + d:b + d + L])) / (np.linalg.norm(mono[b + d:b + d + L]) + 1e-9), d) for d in range(-r, r + 1, 4)]
    b += max(cands)[1]
    if a < X: a = X   # 要有 X 秒可以淡入
    out = A[a + X:b].copy()
    t = np.linspace(0, np.pi / 2, X)[:, None]
    out[-X:] = A[b - X:b] * np.cos(t) + A[a:a + X] * np.sin(t)
    # 音量：RMS -20 dBFS，峰值不超過 -1 dBFS
    g = 10 ** (-20 / 20) / (np.sqrt(np.mean(out ** 2)) + 1e-9); out *= g
    pk = np.abs(out).max(); lim = 10 ** (-1 / 20)
    if pk > lim: out = np.tanh(out / lim * 0.9) * lim / np.tanh(0.9) if pk > lim * 1.3 else out * (lim / pk)
    raw = out.astype(np.float32).tobytes()
    mp3 = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', '-'], input=raw, capture_output=True, check=True).stdout
    dur = len(out) / SR
    js = (f'/* 潮汐小島 · 配樂「{o.name}」（本機 YuE2 純音樂生成，tools/bgm_pack.py 烘成無縫循環；{dur:.2f} 秒） */\n'
          '(window.TA = window.TA || {}).BGM = window.TA.BGM || {};\n'
          f'window.TA.BGM[{json.dumps(o.name)}] = {{ dur: {dur:.4f}, src: "data:audio/mpeg;base64,{base64.b64encode(mp3).decode()}" }};\n')
    dst = ROOT / 'src' / 'isle' / 'models' / f'bgm_{o.name}.js'; dst.write_text(js, encoding='utf-8')
    # 試聽用：同一首接兩遍，聽接縫
    prev = pathlib.Path(o.src).with_name(f'{o.name}_loop_preview.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '160k', str(prev)], input=np.concatenate([out, out]).astype(np.float32).tobytes(), check=True)
    print(f'{o.name}: a={a / SR:.2f}s b={b / SR:.2f}s sim={sim:.3f} loop={dur:.1f}s mp3={len(mp3) // 1024}KB -> {dst.name}; preview {prev.name}')

if __name__ == '__main__':
    main()
