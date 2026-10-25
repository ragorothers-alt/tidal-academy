"""潮汐小島 · 角色模型生產線（Tripo CLI）：立繪 → T 字站姿 → 3D 模型 → 骨架 → 動作 → 遊戲用模型檔。

  python tools/tripo_char.py <id> <立繪.png> [<id> <立繪.png> ...]

每位約 130 點（T 字站姿 5、P1 低面數模型 50、骨架 25、5 個動作 50）。
產物：src/isle/models/<id>.js（tools/glb_slim.py 轉檔）；過程檔在 --work 資料夾（預設 ./.tripo-work，不進版本控制）。
"""
import json, subprocess, sys, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRIPO = shutil.which('tripo') or shutil.which('tripo.cmd') or 'tripo'
ANIMS = ['preset:biped:idle', 'preset:biped:walk', 'preset:biped:run', 'preset:biped:sit', 'preset:biped:greet_01']

def run(args, work, log):
    p = subprocess.run([TRIPO, *args, '--json', '--yes'], cwd=work, capture_output=True, text=True, encoding='utf-8', errors='replace')
    log.write(f'$ tripo {" ".join(args)}\n{p.stderr[-1500:]}\n{p.stdout[-800:]}\n'); log.flush()
    last = [l for l in p.stdout.strip().splitlines() if l.startswith('{')]
    if p.returncode != 0 or not last: raise RuntimeError(f'tripo {args[0]} {args[1]} 失敗（exit {p.returncode}）')
    return json.loads(last[-1])

def make(cid, img, work):
    w = work / cid; w.mkdir(parents=True, exist_ok=True)
    with open(w / 'log.txt', 'a', encoding='utf-8') as log:
        t = run(['generate', 'image-to-image', str(img), '-p', 'template=t_pose', '-o', 'tpose'], w, log)
        m = run(['generate', 'image-to-model', t['task_id'], '--model', 'tripo-p1', '-p', 'face_limit=12000', '-p', 'texture=true', '-o', 'model'], w, log)
        c = run(['anim', 'check', m['task_id']], w, log)
        r = run(['anim', 'rig', m['task_id'], '--rig-type', 'biped', '-p', 'model=v1.0-20240301', '--out-format', 'glb', '-o', 'rig'], w, log)
        a = run(['anim', 'retarget', r['task_id'], '--animation', *ANIMS, '--animate-in-place', '--out-format', 'glb', '-o', 'anim'], w, log)
        glb = (w / a['model_file']) if not Path(a['model_file']).is_absolute() else Path(a['model_file'])
        subprocess.run([sys.executable, str(ROOT / 'tools' / 'glb_slim.py'), str(glb), cid], check=True, env={**__import__('os').environ, 'PYTHONIOENCODING': 'utf-8'})
        spent = sum(float(x.get('credits_consumed', 0)) for x in (t, m, c, r, a))
        (w / 'result.json').write_text(json.dumps({'id': cid, 'tasks': [x['task_id'] for x in (t, m, c, r, a)], 'credits': spent, 'preview': m.get('preview'), 'tpose': t.get('output_dir')}, ensure_ascii=False, indent=1), encoding='utf-8')
        return spent

if __name__ == '__main__':
    args = sys.argv[1:]
    work = Path(args[args.index('--work') + 1]) if '--work' in args else ROOT / '.tripo-work'
    if '--work' in args: i = args.index('--work'); args = args[:i] + args[i + 2:]
    total = 0
    for cid, img in zip(args[0::2], args[1::2]):
        try:
            s = make(cid, Path(img), work); total += s; print(f'OK {cid} {s:.0f} credits', flush=True)
        except Exception as e:
            print(f'FAIL {cid} {e}', flush=True)
    print(f'DONE total {total:.0f} credits', flush=True)
