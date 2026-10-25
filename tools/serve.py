"""開發用靜態伺服器（停用快取）：python tools/serve.py [port] [host]
   host 預設 127.0.0.1（只有本機）；給 0.0.0.0 讓同一個區網的手機、平板也能連（會公開整個專案資料夾）

   另外轉送 laya（島民自己做決定用的決策引擎）：
     GET  /api/laya/health         → <laya>/health
     POST /api/laya/predict_batch  → <laya>/v1/predict_batch
   laya 的位址與 API key 從環境變數 LAYA_URL、LAYA_API_KEY 讀，或從使用者資料夾的
   ~/.config/tidal-academy/laya.json（{"url": "http://...", "key": "..."}）讀。
   key 只留在這台電腦的伺服器端，不會進到專案資料夾、git 或瀏覽器裡；遊戲和這個伺服器同一個來源，不需要 CORS。
   沒有設定或連不上時回 503，遊戲就照原本的方式讓島民隨意走動。
   轉送只接受這台電腦自己的請求（伺服器綁 0.0.0.0 時，區網的手機平板不能借用 key，島民在那些裝置上照原本的方式走動）；
   要讓區網裝置也用 laya，設環境變數 LAYA_ALLOW_LAN=1。
   laya 伺服器有兩種介面，自動判斷（看它的 /openapi.json）：
     /v1/predict_batch：{"items": [{state, questions}, ...]}（最多 64 筆）
     /v1/systemone/batch：{"states": [...], "questions": {...}}（最多 8 筆、同一組問題）——轉送會依問題分組、每 8 筆一批，結果照原本的順序拼回去
   key 留空就不帶 Authorization。"""
import http.server, sys, functools, os, json, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def laya_conf():
    url, key = os.environ.get('LAYA_URL'), os.environ.get('LAYA_API_KEY')
    path = os.path.join(os.path.expanduser('~'), '.config', 'tidal-academy', 'laya.json')
    if (not url or not key) and os.path.exists(path):
        try:
            with open(path, encoding='utf-8') as f: c = json.load(f)
            url, key = url or c.get('url'), key or c.get('key')
        except (OSError, ValueError): pass
    return (url or '').rstrip('/'), key or ''


ROUTES = {'/api/laya/health': ('GET', '/health', 5), '/api/laya/predict_batch': ('POST', '/v1/predict_batch', 30)}
STYLE = {}   # laya 位址 → 'items' 或 'systemone'


def laya_style(url):
    if url not in STYLE:
        try:
            with urllib.request.urlopen(url + '/openapi.json', timeout=5) as r: paths = json.load(r).get('paths', {})
            STYLE[url] = 'systemone' if '/v1/systemone/batch' in paths and '/v1/predict_batch' not in paths else 'items'
        except Exception: return 'items'   # 判斷不出來先當舊介面，下次再試
    return STYLE[url]


def call(url, path, key, body, timeout):
    req = urllib.request.Request(url + path, data=body, method='POST' if body is not None else 'GET', headers={'Content-Type': 'application/json'})
    if key: req.add_header('Authorization', 'Bearer ' + key)
    with urllib.request.urlopen(req, timeout=timeout) as r: return r.status, r.read()


def systemone_batch(url, key, body, timeout):
    """把 {"items": [...]} 轉成 /v1/systemone/batch（同一組問題、每批最多 8 筆），結果照原順序拼回 {"results": [...]}"""
    items = json.loads(body).get('items') or []
    if not isinstance(items, list) or not 1 <= len(items) <= 64: return 422, json.dumps({'error': "'items' must be 1..64 objects"}).encode()
    results, groups = [None] * len(items), {}
    for i, it in enumerate(items): groups.setdefault(json.dumps(it.get('questions'), sort_keys=True), []).append(i)
    for idx in groups.values():
        for k in range(0, len(idx), 8):
            part = idx[k:k + 8]
            st, out = call(url, '/v1/systemone/batch', key, json.dumps({'states': [items[i]['state'] for i in part], 'questions': items[part[0]]['questions']}).encode(), timeout)
            res = json.loads(out).get('results') or []
            for i, r in zip(part, res): results[i] = r
    return 200, json.dumps({'results': results}).encode()
MAX_BODY = 512 * 1024


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a): pass

    def reply(self, code, data):
        b = data if isinstance(data, bytes) else json.dumps(data).encode('utf-8')
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def proxy(self, method):
        route = ROUTES.get(self.path.split('?')[0])
        if not route or route[0] != method: return False
        if self.client_address[0] not in ('127.0.0.1', '::1', '::ffff:127.0.0.1') and os.environ.get('LAYA_ALLOW_LAN') != '1':
            self.reply(403, {'error': 'laya proxy is local-only'}); return True
        url, key = laya_conf()
        if not url: self.reply(503, {'error': 'laya not configured'}); return True
        body = None
        if method == 'POST':
            n = int(self.headers.get('Content-Length') or 0)
            if n <= 0 or n > MAX_BODY: self.reply(413, {'error': 'bad body size'}); return True
            body = self.rfile.read(n)
        try:
            if method == 'POST' and laya_style(url) == 'systemone': self.reply(*systemone_batch(url, key, body, route[2]))
            else: self.reply(*call(url, route[1], key, body, route[2]))
        except urllib.error.HTTPError as e: self.reply(e.code, e.read() or b'{}')
        except ValueError: self.reply(400, {'error': 'bad json'})
        except Exception as e: self.reply(503, {'error': 'laya unreachable', 'detail': type(e).__name__})
        return True

    def do_GET(self):
        if not self.proxy('GET'): super().do_GET()

    def do_POST(self):
        if not self.proxy('POST'): self.reply(404, {'error': 'not found'})


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
host = sys.argv[2] if len(sys.argv) > 2 else '127.0.0.1'
http.server.ThreadingHTTPServer((host, port), functools.partial(H, directory=ROOT)).serve_forever()
