"""潮汐小島 · 3D 角色的表情臉皮：表情格與貼合臉型的小曲面（v8.8）
先跑 tools/face_bake.py 產生正面臉圖；這支讀 .face-work/<id>_face.png 與 _maps.npz，以及 tools/face_regions.json 的五官框：
  1. 表情格：閉眼（眨眼）、笑眼 ^^、說話張嘴、開心張嘴——原圖的眼睛／嘴先補成膚色，再畫睫毛線或嘴形；
     只留下和原圖不同的部分（邊緣柔化），平常的臉完全是 Tripo 原本畫的
  2. 小曲面：在眼睛、嘴的框裡取格點，座標、法線、骨頭權重來自 _maps.npz，往法線方向浮起一點點
  輸出 src/isle/data/modelfaces.js（window.TA.ISLE.MODELFACES[id]）與 .face-work/frames1.png…（檢查用總覽，五個角色一張）

用法：python tools/face_frames.py sen player
"""
import base64, json, os, sys
import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, '.face-work')
OUT_JS = os.path.join(ROOT, 'src', 'isle', 'data', 'modelfaces.js')
REGIONS = os.path.join(ROOT, 'tools', 'face_regions.json')
STEP = 6          # 小曲面格點間距（臉圖像素）
LIFT = 0.0009     # 往法線方向浮起（模型原始單位；遊戲裡約 1.3 mm）
FR = 2            # 表情格的解析度是臉圖的幾倍（線條畫得比較細緻）
SS = 4            # 畫線時的超取樣倍數（反鋸齒）
MOUTH_IN, TONGUE = (58, 46, 118), (140, 132, 222)   # 嘴巴裡、舌頭（BGR）


def load(mid):
    a = cv2.imread(os.path.join(WORK, mid + '_face.png'), cv2.IMREAD_UNCHANGED)
    return a[..., :3].copy(), a[..., 3] > 127, np.load(os.path.join(WORK, mid + '_maps.npz'))


def lab(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)


def fill_holes(m):
    m = m.astype(np.uint8); cn, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m); cv2.drawContours(out, cn, -1, 1, -1); return out > 0


def feature_mask(img, valid, box, thr, dark_only=False):
    """框裡和框邊膚色差很多的像素（眼睛：睫毛、虹膜、眼白；嘴：比膚色暗的線）"""
    L = lab(img); x, y, w, h = box
    edge = np.zeros(img.shape[:2], bool); edge[y:y + h, x:x + w] = True; edge[y + 2:y + h - 2, x + 2:x + w - 2] = False
    sk = np.median(L[edge & valid], 0)
    sub = L[y:y + h, x:x + w]; d = (sk[0] - sub[..., 0]) if dark_only else np.linalg.norm(sub - sk, axis=-1)
    m = np.zeros(img.shape[:2], np.uint8); m[y:y + h, x:x + w] = d > thr
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    n, lb, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.isin(lb, [i for i in range(1, n) if st[i, 4] >= 10])
    return fill_holes(keep) & valid


def smooth_fill(img, hole, known):
    """把 hole 補成周圍顏色的平滑延伸（調和內插：先用大範圍加權平均當初值，再反覆取四鄰平均），不會像 inpaint 拉出一條條的紋路"""
    out = img.astype(np.float32).copy(); k = known.astype(np.float32)
    for s in (24, 8):
        num = cv2.GaussianBlur(out * k[..., None], (0, 0), s); den = cv2.GaussianBlur(k, (0, 0), s)[..., None]
        out[hole] = (num / np.maximum(den, 1e-4))[hole]
    K = np.array([[0, .25, 0], [.25, 0, .25], [0, .25, 0]], np.float32)
    for _ in range(600):
        out[hole] = cv2.filter2D(out, -1, K, borderType=cv2.BORDER_REPLICATE)[hole]
    return out


class Region:
    """一個框（雙眼合在一起一個、嘴一個）：底圖是補好膚色的原圖，表情格疊在上面"""
    def __init__(self, img, valid, box, mask):
        x, y, w, h = box; self.box = box; self.sh = (h * FR * SS, w * FR * SS)
        hole = cv2.dilate(mask.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
        base = smooth_fill(img, ~valid, valid)   # 臉外面（透明處）先補上，免得黑色滲進來
        clean = smooth_fill(base, hole & valid, valid & ~hole)
        up = lambda a, i=cv2.INTER_CUBIC: cv2.resize(a[y:y + h, x:x + w], (w * FR, h * FR), interpolation=i)
        self.orig, self.clean = up(base), up(clean)
        m = up(mask.astype(np.uint8), cv2.INTER_NEAREST)
        self.erase = np.clip(cv2.GaussianBlur(cv2.dilate(m, np.ones((3 * FR, 3 * FR), np.uint8)).astype(np.float32), (0, 0), 1.3 * FR), 0, 1)   # 補膚色的範圍（邊緣柔化）
        self.frames = {}

    def P(self, px, py):   # 臉圖座標 → 超取樣座標
        return ((px - self.box[0]) * FR * SS, (py - self.box[1]) * FR * SS)

    def stroke(self, pts, wid):
        """可變粗細的筆畫（wid 是臉圖像素）→ 表情格解析度的 0..1 遮罩"""
        p = np.array([self.P(a, b) for a, b in pts], np.float64); wid = np.asarray(wid, np.float64) * FR * SS
        d = np.gradient(p, axis=0); d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-9
        n = np.stack([-d[:, 1], d[:, 0]], 1) * (wid[:, None] / 2)
        m = np.zeros(self.sh, np.uint8); cv2.fillPoly(m, [np.round(np.vstack([p + n, (p - n)[::-1]]) * 16).astype(np.int32)], 255, cv2.LINE_AA, 4)
        for q, w in ((p[0], wid[0]), (p[-1], wid[-1])): cv2.circle(m, tuple(np.round(q * 16).astype(int)), int(round(w / 2 * 16)), 255, -1, cv2.LINE_AA, 4)
        return self.down(m)

    def shape(self, pts):
        m = np.zeros(self.sh, np.uint8); cv2.fillPoly(m, [np.round(np.array([self.P(a, b) for a, b in pts]) * 16).astype(np.int32)], 255, cv2.LINE_AA, 4)
        return self.down(m)

    def down(self, m):
        return cv2.resize(m.astype(np.float32) / 255, (self.sh[1] // SS, self.sh[0] // SS), interpolation=cv2.INTER_AREA)

    def frame(self, name, layers, erase=None):
        col, a = self.clean.copy(), (self.erase if erase is None else erase).copy()   # erase：這一格要補成膚色的範圍（半閉眼只補眼皮蓋住的上半）
        for m, c in layers:
            col = col * (1 - m[..., None]) + np.array(c, np.float32) * m[..., None]; a = np.maximum(a, m)
        self.frames[name] = (col, a)


def eye_frames(img, valid, boxes):
    masks = [feature_mask(img, valid, b, 13) for b in boxes]
    ux0, uy0 = max(0, min(b[0] for b in boxes) - 4), max(0, min(b[1] for b in boxes) - 4)
    ux1, uy1 = min(img.shape[1], max(b[0] + b[2] for b in boxes) + 4), min(img.shape[0], max(b[1] + b[3] for b in boxes) + 4)
    allm = masks[0] | masks[1]
    R = Region(img, valid, (ux0, uy0, ux1 - ux0, uy1 - uy0), allm)
    px = img[allm]; lash = np.median(px[np.argsort(lab(img)[allm][:, 0])[:max(8, int(len(px) * 0.08))]], 0) * 0.85   # 睫毛色：眼睛裡最暗的 8%
    closed, happy, lids = [], [], {'half': ([], []), 'sad': ([], [])}
    for k, m in enumerate(masks):
        ys, xs = np.where(m); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1; ew, eh = x1 - x0, y1 - y0
        outer = -1 if k == 0 else 1; t = np.linspace(0, 1, 48); to = t if outer > 0 else 1 - t   # to：0＝內眼角、1＝眼尾
        # 閉眼：沿著下眼瞼、往下彎的一條睫毛線，眼尾粗一點、往外帶一小撇
        xs_ = x0 + 0.03 * ew + t * 0.95 * ew; ys_ = y0 + 0.60 * eh + 0.12 * eh * np.sin(np.pi * t) + 0.05 * eh * (to - 0.5)
        closed.append((R.stroke(zip(xs_, ys_), 0.085 * eh * (0.45 + 0.55 * np.sin(np.pi * t) ** 0.5) * (0.75 + 0.5 * to)), lash))
        ex, ey = (x1 if outer > 0 else x0), y0 + 0.625 * eh; f = np.linspace(0, 1, 12)
        closed.append((R.stroke(zip(ex + outer * 0.16 * ew * f, ey + 0.10 * eh * f ** 1.5), 0.06 * eh * (1 - 0.8 * f)), lash))
        # 笑眼：往上拱的弧
        xs_ = x0 + 0.10 * ew + t * 0.80 * ew; ys_ = y0 + 0.66 * eh - 0.30 * eh * np.sin(np.pi * t)
        happy.append((R.stroke(zip(xs_, ys_), 0.095 * eh * (0.35 + 0.65 * np.sin(np.pi * t) ** 0.6)), lash))
        # 半閉眼：眼皮蓋住上半，下半留原本的眼睛。睏（half）眼皮平平的；難過（sad）眼尾那邊垂得比較低
        xs_ = x0 + 0.01 * ew + t * 0.98 * ew
        for name, ys_ in (('half', y0 + 0.52 * eh - 0.11 * eh * np.sin(np.pi * t)), ('sad', y0 + (0.36 + 0.26 * to) * eh - 0.09 * eh * np.sin(np.pi * t))):
            pts = list(zip(xs_, ys_)); lids[name][0].append(R.shape(pts + [(xs_[-1], y0 - eh), (xs_[0], y0 - eh)]))
            lids[name][1].append((R.stroke(pts, 0.10 * eh * (0.2 + 0.8 * np.sin(np.pi * t) ** 0.7) * (0.8 + 0.4 * to)), lash))
    R.frame('closed', closed); R.frame('happy', happy)
    for name, (cover, lines) in lids.items(): R.frame(name, lines, R.erase * np.maximum(*cover))
    return R, lash


def mouth_frames(img, valid, box, lash):
    m = feature_mask(img, valid, box, 6, dark_only=True)
    R = Region(img, valid, box, m)
    ys, xs = np.where(m)
    lx0, lx1, ly = (xs.min(), xs.max() + 1, ys.mean()) if len(xs) else (box[0] + box[2] * .2, box[0] + box[2] * .8, box[1] + box[3] / 2)
    cx, lw = 0.5 * (lx0 + lx1), lx1 - lx0
    if lw < 0.5 * box[2]: cx = box[0] + box[2] / 2   # 只找到嘴線的一小段（很淡的嘴）：改用框的中間
    lw = max(lw, 0.7 * box[2])
    edge = np.array(lash) * 0.7 + np.array(MOUTH_IN) * 0.3

    def mouth(name, w, h, lift):
        y0 = ly + 0.1 * h; a = np.linspace(0, np.pi, 32); yc = y0 - h * (0.12 + lift)   # yc：嘴角的高度
        bottom = list(zip(cx + np.cos(a) * w / 2, yc + np.sin(a) * h * (0.97 + lift)))   # 下緣半圓（右 → 左），從嘴角開始：嘴角收成尖的，不會像蝴蝶結
        xt = np.linspace(-w / 2, w / 2, 32); top = list(zip(cx + xt, y0 - h * 0.12 - h * lift * (2 * xt / w) ** 2))   # 上緣：嘴角往上翹（左 → 右）
        inner = R.shape(bottom + top)
        ty = y0 + h * 0.6; tongue = R.shape(list(zip(cx + np.cos(a * 2) * w * 0.3, ty + np.sin(a * 2) * h * 0.3))) * inner
        R.frame(name, [(inner, MOUTH_IN), (tongue, TONGUE), (R.stroke(top, np.full(len(top), 0.9)), edge)])
    mouth('talk', 0.50 * lw, 0.34 * lw, 0.05)
    mouth('smile', 0.80 * lw, 0.42 * lw, 0.35)
    a = np.linspace(0, 2 * np.pi, 48); w, h = 0.36 * lw, 0.42 * lw   # 驚訝：小小的 o
    oh = R.shape(list(zip(cx + np.cos(a) * w / 2, ly + 0.1 * h + np.sin(a) * h / 2)))
    R.frame('oh', [(oh, MOUTH_IN), (R.stroke(list(zip(cx + np.cos(a[24:]) * w / 2, ly + 0.1 * h + np.sin(a[24:]) * h / 2)), np.full(24, 0.9)), edge)])
    line = np.median(img[m], 0) * 0.92 if m.any() else edge   # 難過：嘴角往下的一條線（和原本嘴線同色）
    xt = np.linspace(-0.3, 0.3, 32) * lw; R.frame('sad', [(R.stroke(list(zip(cx + xt, ly + 0.02 * lw + 0.16 * lw * (2 * xt / (0.6 * lw)) ** 2 - 0.04 * lw)), 1.3 * (0.5 + 0.5 * np.cos(xt / (0.3 * lw) * np.pi / 2))), line)])
    return R


def patch(R, maps):
    """框裡用得到的格子（任何一格表情不透明的地方）→ 頂點（原始網格座標、法線、uv、骨頭）與三角形"""
    x, y, w, h = R.box; need = np.zeros((h, w), bool)
    for col, a in R.frames.values(): need |= cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA) > 0.01
    need = cv2.dilate(need.astype(np.uint8), np.ones((STEP + 2, STEP + 2), np.uint8)) > 0
    gx = list(range(x, x + w, STEP)) + ([x + w - 1] if (w - 1) % STEP else []); gy = list(range(y, y + h, STEP)) + ([y + h - 1] if (h - 1) % STEP else [])
    vid, V = {}, []
    pos, nor, val, jnt, wgt, dep, fwd = (maps[k] for k in ('pos', 'nor', 'valid', 'jnt', 'wgt', 'depth', 'fwd'))

    def bulge(i, j):   # 這一格裡實際的臉比四個角拉成的平面凸出多少（有些模型的眼睛鼓起 2–3 mm，會從小曲面底下穿出來）
        blk, ok = dep[gy[j]:gy[j + 1] + 1, gx[i]:gx[i + 1] + 1], val[gy[j]:gy[j + 1] + 1, gx[i]:gx[i + 1] + 1]
        c = blk[[0, 0, -1, -1], [0, -1, 0, -1]]
        if not ok.all() or c.max() - c.min() > 0.006: return 0.0
        yy, xx = np.mgrid[0:1:blk.shape[0] * 1j, 0:1:blk.shape[1] * 1j]
        return max(0.0, float((blk - (c[0] * (1 - xx) * (1 - yy) + c[1] * xx * (1 - yy) + c[2] * (1 - xx) * yy + c[3] * xx * yy)).max()))
    BG = np.zeros((len(gy) + 1, len(gx) + 1))
    for j in range(len(gy) - 1):
        for i in range(len(gx) - 1): BG[j + 1, i + 1] = bulge(i, j)

    def vert(i, j):
        if (i, j) in vid: return vid[(i, j)]
        px, py = gx[i], gy[j]
        if not val[py, px]: vid[(i, j)] = -1; return -1
        p = pos[py, px] + fwd * (LIFT + BG[j:j + 2, i:i + 2].max())   # 往臉的正前方浮起：基本高度＋四周格子最大的凸出（有些模型眼睛的法線朝側面，沿法線浮不出來）
        vid[(i, j)] = len(V); V.append((p, nor[py, px], ((px + 0.5 - x) / w, 1 - (py + 0.5 - y) / h), jnt[py, px], wgt[py, px], dep[py, px])); return vid[(i, j)]
    T = []
    for j in range(len(gy) - 1):
        for i in range(len(gx) - 1):
            if not need[gy[j] - y:gy[j + 1] - y + 1, gx[i] - x:gx[i + 1] - x + 1].any(): continue
            q = [vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1)]
            for t in ((q[0], q[3], q[1]), (q[1], q[3], q[2])):   # 朝前（看著臉時逆時針）
                if min(t) < 0: continue
                d = [V[k][5] for k in t]
                if max(d) - min(d) > 0.006: continue   # 深度跳太多（跨到別的表面）就不連
                T.append(t)
    return V, T


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def webp(col, a):
    a8 = (a * 255).clip(0, 255).astype(np.uint8); col = col.clip(0, 255).astype(np.uint8); col[a8 == 0] = 0   # 全透明的地方不存顏色（壓得比較小）
    ok, buf = cv2.imencode('.webp', np.dstack([col, a8]), [cv2.IMWRITE_WEBP_QUALITY, 85])
    return 'data:image/webp;base64,' + base64.b64encode(buf.tobytes()).decode()


def pack(R, V, T):
    pos = np.array([v[0] for v in V], np.float64); nor = np.array([v[1] for v in V], np.float64); uv = np.array([v[2] for v in V], np.float64)
    lo, hi = pos.min(0), pos.max(0); sc = np.maximum(hi - lo, 1e-6)
    jw = np.hstack([np.array([v[3] for v in V], np.uint8), np.round(np.array([v[4] for v in V]) * 255).astype(np.uint8)])
    return {'q': [round(float(x), 6) for x in (*lo, *sc)],   # 座標量化成 0–65535：原始值 = q[0..2] + 值 / 65535 × q[3..5]
            'p': b64(np.round((pos - lo) / sc * 65535).astype(np.uint16)), 'n': b64(np.round(nor * 127).astype(np.int8)),
            'uv': b64(np.round(uv.clip(0, 1) * 65535).astype(np.uint16)), 'jw': b64(jw), 'i': b64(np.array(T, np.uint16).ravel()),
            'f': {k: webp(*v) for k, v in R.frames.items()}}


def sheet(rows):
    """檢查用：每個角色一列，原圖、各表情格（放大 3 倍）"""
    out = []
    for mid, regs in rows:
        tiles = []
        for R in regs:
            tiles.append(R.orig)
            for col, a in R.frames.values(): tiles.append(R.orig * (1 - a[..., None]) + col * a[..., None])
        H = max(t.shape[0] for t in tiles); cells = []
        for t in tiles: cells += [np.vstack([t, np.full((H - t.shape[0], t.shape[1], 3), 30, np.float32)]), np.full((H, 6, 3), 30, np.float32)]
        out.append(np.hstack(cells))
    for n in range(0, len(out), 5):   # 五個角色一張：frames1.png、frames2.png…
        part = out[n:n + 5]; W = max(r.shape[1] for r in part)
        img = np.vstack([np.hstack([r, np.full((r.shape[0], W - r.shape[1], 3), 30, np.float32)]) for r in part])
        cv2.imwrite(os.path.join(WORK, 'frames%d.png' % (n // 5 + 1)), img.clip(0, 255).astype(np.uint8))


def main(mids):
    regions = json.load(open(REGIONS, encoding='utf-8'))
    data = {}
    if os.path.exists(OUT_JS):
        s = open(OUT_JS, encoding='utf-8').read(); a = s.index('I.MODELFACES = ') + len('I.MODELFACES = '); data = json.loads(s[a:s.index(';\n', a)])
    rows = []
    for mid in mids:
        img, valid, maps = load(mid); rg = regions[mid]; H, W = img.shape[:2]
        fit = lambda b: [max(0, b[0]), max(0, b[1]), min(b[2], W - max(0, b[0])), min(b[3], H - max(0, b[1]))]   # 框不超出臉圖
        rg = {'eyes': [fit(b) for b in rg['eyes']], 'mouth': fit(rg['mouth'])}
        E, lash = eye_frames(img, valid, rg['eyes']); M = mouth_frames(img, valid, rg['mouth'], lash)
        d = {}
        for key, R in (('eyes', E), ('mouth', M)):
            V, T = patch(R, maps); d[key] = pack(R, V, T); print(mid, key, 'verts', len(V), 'tris', len(T), 'frames', list(R.frames))
        data[mid] = d; rows.append((mid, (E, M)))
    sheet(rows)
    body = json.dumps(data, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    js = ('/* 潮汐小島 · 3D 角色的表情臉皮（tools/face_frames.py 產生，不要手動修改）\n'
          '   每位角色 eyes／mouth 各一片（base64）：p 座標（Uint16，依 q 還原）、n 法線（Int8）、uv（Uint16）、jw 骨頭（4 個索引 + 4 個權重 0–255）、i 三角形（Uint16），f 表情格 WebP */\n'
          '(function (root) { const I = (root.TA = root.TA || {}).ISLE = root.TA.ISLE || {};\n'
          'I.MODELFACES = ' + body + ';\n'
          '})(typeof window !== \'undefined\' ? window : globalThis);\n')
    open(OUT_JS, 'w', encoding='utf-8', newline='\r\n').write(js)
    print('wrote', OUT_JS, len(js) // 1024, 'KB')


if __name__ == '__main__':
    main(sys.argv[1:])
