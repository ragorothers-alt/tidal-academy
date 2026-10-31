"""潮汐小島 · 共用動作包：從一個 Tripo 網頁版匯出的角色 GLB 只留骨架與指定的動作，給沒有這些動作的舊模型換算使用（actors.js 的 shareClips）。

  python tools/anim_pack.py <in.glb> <id> <動作名稱> [<動作名稱> ...]

- 拿掉網格、材質、貼圖與蒙皮，只留節點（骨架的靜止姿勢就是綁定姿勢）與動作。
- 動作只留旋轉，位移只留臀部（Hips），縮放全部拿掉；手指維持靜止姿勢。
- 輸出 src/isle/models/<id>.js，格式和 glb_slim.py 一樣。
"""
import base64, json, struct, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from glb_slim import read_glb, write_glb, write_list, ROOT

def pack(js, bin_, keep):
    views = js['bufferViews']
    def acc_bytes(i):
        a = js['accessors'][i]; v = views[a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        size = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']] * 4 * a['count']   # 動作都是 float
        return bin_[o:o + size]
    new_bin, accs, amap = bytearray(), [], {}
    def take(i):
        if i in amap: return amap[i]
        a = dict(js['accessors'][i]); data = acc_bytes(i)
        while len(new_bin) % 4: new_bin.extend(b'\0')
        a['bufferView'] = len(accs); a.pop('byteOffset', None)
        js_views.append({'buffer': 0, 'byteOffset': len(new_bin), 'byteLength': len(data)}); new_bin.extend(data)
        amap[i] = len(accs); accs.append(a); return amap[i]
    js_views = []
    names = {i: n.get('name', '') for i, n in enumerate(js['nodes'])}
    anims = []
    for an in js.get('animations', []):
        base = an.get('name', '').split('.')[0]
        if base not in keep: continue
        ch, sm = [], []
        for c in an['channels']:
            path, node = c['target']['path'], c['target']['node']
            if path == 'scale' or (path == 'translation' and not names[node].endswith('Hips')): continue
            if any(f in names[node] for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky', '_End')): continue   # 手指與末端骨頭維持靜止姿勢
            s = an['samplers'][c['sampler']]
            sm.append({'input': take(s['input']), 'output': take(s['output']), 'interpolation': s.get('interpolation', 'LINEAR')})
            ch.append({'sampler': len(sm) - 1, 'target': {'node': node, 'path': path}})
        anims.append({'name': base, 'channels': ch, 'samplers': sm})
    nodes = []
    for n in js['nodes']:
        n = {k: v for k, v in n.items() if k not in ('mesh', 'skin')}; nodes.append(n)
    out = {'asset': js['asset'], 'scene': js.get('scene', 0), 'scenes': js['scenes'], 'nodes': nodes, 'animations': anims,
           'accessors': accs, 'bufferViews': js_views, 'buffers': [{'byteLength': len(new_bin)}]}
    return out, bytes(new_bin)

if __name__ == '__main__':
    src, mid, keep = sys.argv[1], sys.argv[2], set(sys.argv[3:])
    js, bin_ = read_glb(src)
    js, bin_ = pack(js, bin_, keep)
    glb = write_glb(js, bin_)
    out = ROOT / 'src' / 'isle' / 'models' / f'{mid}.js'
    out.write_text(f"/* 潮汐小島 · 共用動作包「{mid}」（{'、'.join(sorted(keep))}；tools/anim_pack.py 轉檔） */\n(window.TA = window.TA || {{}}).MODELS = window.TA.MODELS || {{}};\nwindow.TA.MODELS[{json.dumps(mid)}] = '{base64.b64encode(glb).decode()}';\n", encoding='utf-8')
    write_list()
    print(f'{mid}: {[a["name"] for a in js["animations"]]} -> {len(glb):,} bytes -> {out.relative_to(ROOT)} ({out.stat().st_size:,} bytes)')
    import glb_pack; glb_pack.main([mid])   # 動作改成較小的數字格式
