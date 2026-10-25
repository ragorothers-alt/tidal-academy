"""潮汐學院建置：輸出多資產的 dist/ 資料夾，雙擊 isle.html 即可離線遊玩（不需伺服器）。

  dist/isle.html         潮汐小島（所有學習模式都在島上）
  dist/index.html        轉到 isle.html（舊的學習中心網址與 ?go= 連結）
  dist/assets/*.js|css   依用途分組的資產（檔名帶內容雜湊，方便快取與版本管理）
  dist/assets/manifest.json  資產清單：大小、雜湊、來源檔

潮汐小島的 ES 模組在建置時轉成一般腳本（file:// 不能載入模組），three.js 由 vendor/three/three.cjs 包成全域 THREE。
"""
from pathlib import Path
import hashlib, json, re, shutil

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
ASSETS = DIST / 'assets'

# ---------- 同步開發用頁面的題庫清單 ----------
data_files = sorted((ROOT / 'src' / 'data').glob('*.js'))
data_tags = '\n'.join(f'<script src="src/data/{f.name}"></script>' for f in data_files)
for page in ('isle.html',):
    p = ROOT / page
    dev = p.read_text(encoding='utf-8')
    dev2 = re.sub(r'<!--DATA-->.*?<!--/DATA-->', lambda m: '<!--DATA-->\n' + data_tags + '\n<!--/DATA-->', dev, flags=re.S)
    if dev2 != dev: p.write_text(dev2, encoding='utf-8')

# ---------- 工具 ----------
manifest = {}
def emit(name, text, sources):
    data = text.encode('utf-8')
    h = hashlib.sha256(data).hexdigest()[:10]
    stem, ext = name.rsplit('.', 1)
    fname = f'{stem}.{h}.{ext}'
    (ASSETS / fname).write_bytes(data)
    manifest[name] = {'file': fname, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'sources': sources}
    return 'assets/' + fname
def read(rel): return (ROOT / rel).read_text(encoding='utf-8')
def concat(files): return '\n;\n'.join(f'/* ---- {f} ---- */\n' + read(f) for f in files)
def scripts_of(page):
    return [m for m in re.findall(r'<script src="([^"]+)"></script>', read(page))]

# ---------- 潮汐小島：ES 模組 → 一般腳本 ----------
# import 那一行後面可以有 // 註解（以前不認得這種寫法：那幾行沒被轉換、相依的模組也沒打包，正式版直接打不開）
IMPORT = re.compile(r"^import\s+(.+?)\s+from\s+'([^']+)';[ \t]*(?://[^\n]*)?$", re.M)
def bundle_modules(entry):
    order, seen = [], set()
    def visit(rel):
        if rel in seen: return
        seen.add(rel)
        for _, src in IMPORT.findall(read(rel)):
            if src.startswith('./'): visit(str(Path(rel).parent / src[2:]).replace('\\', '/'))
        order.append(rel)
    visit(entry)
    # 先建立每個模組的命名空間物件：「import * as x」在循環匯入時也能拿到同一個物件（用到時才讀取）
    out = ['(function () {', "'use strict';", 'const __M = {};', ''.join(f"__M['{Path(r).stem}'] = {{}};" for r in order)]
    done = set()
    for rel in order:
        src, key = read(rel), Path(rel).stem
        def imp(m):
            what, frm = m.group(1), m.group(2)
            target = 'window.THREE' if frm == 'three' else f"__M['{Path(frm).stem}']"
            if what.startswith('* as '): return f'const {what[5:].strip()} = {target};'
            if what.startswith('{'):
                if frm != 'three' and Path(frm).stem not in done:
                    raise SystemExit(f'循環匯入：{rel} 以具名方式匯入尚未載入的 {frm}（請改用 import * as，或拆開循環）')
                names = [n.strip() for n in what.strip('{} ').split(',') if n.strip()]
                return 'const { ' + ', '.join(n.replace(' as ', ': ') for n in names) + f' }} = {target};'
            raise SystemExit(f'不支援的 import 寫法：{rel}: {m.group(0)}')
        src = IMPORT.sub(imp, src)
        names = re.findall(r'^export\s+(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)', src, re.M)
        for decl in re.findall(r'^export\s+(?:const|let|var)\s+(.*)$', src, re.M):
            depth, part, parts = 0, '', []
            for ch in decl:   # 以最外層逗號切開「a = 1, b = []」
                if ch in '([{': depth += 1
                elif ch in ')]}': depth -= 1
                if ch == ',' and depth == 0: parts.append(part); part = ''
                elif ch == ';' and depth == 0: break
                else: part += ch
            parts.append(part)
            names += [m.group(1) for m in (re.match(r'\s*([A-Za-z_$][\w$]*)', p) for p in parts) if m]
        for grp in re.findall(r'^export\s*\{([^}]*)\};?\s*$', src, re.M):
            names += [n.strip().split(' as ')[-1].strip() for n in grp.split(',') if n.strip()]
        src = re.sub(r'^export\s*\{[^}]*\};?\s*$', '', src, flags=re.M)
        src = re.sub(r'^export\s+', '', src, flags=re.M)
        getters = ', '.join(f'{n}: {{ get() {{ return {n}; }}, enumerable: true }}' for n in dict.fromkeys(names))
        out.append(f'/* ---- {rel} ---- */\n(function () {{\n{src}\nObject.defineProperties(__M[\'{key}\'], {{ {getters} }});\n}})();')
        done.add(key)
    out.append('})();')
    return '\n'.join(out), order

# ---------- 建置 ----------
if DIST.exists(): shutil.rmtree(DIST)
ASSETS.mkdir(parents=True)

base = ['src/core/registry.js', 'src/core/util.js', 'src/core/store.js', 'src/core/learn.js', 'src/core/creature.js']
data = [f'src/data/{f.name}' for f in data_files]
# 只打包 isle.html 實際載入的資料檔（避免把尚未啟用或寫到一半的檔案打包進去）
isle_data = [s for s in scripts_of('isle.html') if s.startswith('src/isle/data/') and (ROOT / s).exists()]

a_base = emit('base.js', concat(base), base)
a_data = emit('data.js', concat(data), data)
a_isle_data = emit('isle-data.js', concat(isle_data), isle_data)
three = read('vendor/three/three.cjs')
a_three = emit('three.js', '(function () { var module = { exports: {} }, exports = module.exports;\n' + three + '\nwindow.THREE = module.exports; })();', ['vendor/three/three.cjs'])
isle_js, isle_order = bundle_modules('src/isle/main.js')
_left = re.findall(r'^[ \t]*import\s.*$', isle_js, re.M)
if _left: raise SystemExit('打包後還有沒轉換的 import（寫法不支援）：\n' + '\n'.join(_left[:5]))
a_isle = emit('isle.js', isle_js, isle_order)
a_isle_css = emit('isle.css', read('src/isle/isle.css'), ['src/isle/isle.css'])
shutil.copy(ROOT / 'vendor' / 'three' / 'LICENSE', ASSETS / 'three-LICENSE.txt')
# 3D 模型（Tripo 產生）：原樣複製到 dist/models/，遊戲用到時才以 <script> 載入
MODELS = ROOT / 'src' / 'isle' / 'models'
if MODELS.exists():
    (DIST / 'models').mkdir(exist_ok=True)
    for f in sorted(MODELS.glob('*.js')):
        shutil.copy(f, DIST / 'models' / f.name)

# 互動示意圖（figs.js，anatomy skill 畫的獨立 HTML）：原樣複製到 dist/figs/
FIGDIR = ROOT / 'src' / 'isle' / 'figs'
if FIGDIR.exists():
    (DIST / 'figs').mkdir(exist_ok=True)
    for f in sorted(FIGDIR.glob('*.html')):
        shutil.copy(f, DIST / 'figs' / f.name)

def page(src_page, css, scripts, extra=''):
    html = read(src_page)
    html = re.sub(r'\s*<link rel="stylesheet" href="src/[^"]+">', '', html)
    html = re.sub(r'\s*<script type="importmap">.*?</script>', '', html, flags=re.S)
    html = re.sub(r'\s*<script[^>]*src="[^"]+"[^>]*></script>', '', html)
    html = re.sub(r'<!--DATA-->\s*<!--/DATA-->', '', html)
    html = re.sub(r'\s*<script>TA\.Store\.load\(\); TA\.L\.index\(\);</script>', '', html)
    html = html.replace('</head>', ''.join(f'\n<link rel="stylesheet" href="{c}">' for c in css) + '\n</head>', 1)
    tags = ''.join(f'\n<script src="{s}"></script>' for s in scripts)
    html = html.replace('</body>', tags + extra + '\n</body>', 1)
    return html

(DIST / 'index.html').write_text(read('index.html'), encoding='utf-8')   # 轉址頁原樣複製
(DIST / 'isle.html').write_text(page('isle.html', [a_isle_css], [a_base, a_data, a_isle_data, a_three], '\n<script>TA.Store.load(); TA.L.index(); window.__MODEL_BASE = "models/"; window.__FIG_BASE = "figs/";</script>\n<script src="' + a_isle + '"></script>'), encoding='utf-8')
(ASSETS / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

total = sum(v['bytes'] for v in manifest.values())
print(f'Built dist/: isle.html (index.html redirects to it), {len(manifest)} assets, {total:,} bytes, {len(data_files)} data files.')
for k, v in manifest.items(): print(f"  {v['file']:<28} {v['bytes']:>10,}")
