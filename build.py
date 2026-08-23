#!/usr/bin/env python3
"""构建：
  dist/三体阅读地图.html  单文件（旁白音频以 data URI 内嵌，原始音质）——双击即玩
  dist/artifact.html      Artifact 片段（音频按需转码到更低码率以满足 16MB 上限）
用法：python3 build.py"""
import re, os, json, base64, subprocess, tempfile, shutil
here = os.path.dirname(os.path.abspath(__file__)); os.chdir(here); os.makedirs('dist', exist_ok=True)
html = open('index.html', encoding='utf8').read(); css = open('css/style.css', encoding='utf8').read()

def load_manifest():
    p = 'audio/manifest.js'
    if not os.path.exists(p): return {}
    s = open(p, encoding='utf8').read(); m = re.search(r'SM\.AUDIO_MANIFEST = (\{.*\});', s, re.S)
    return json.loads(m.group(1)) if m else {}

def manifest_js(man):
    return 'window.SM = window.SM || {}; SM.AUDIO_MANIFEST = ' + json.dumps(man, ensure_ascii=False) + ';'

def embed_manifest(man, src_dir):
    out = {}
    for k, (f, d) in man.items():
        p = os.path.join(src_dir, f)
        if not os.path.exists(p): continue
        out[k] = ['data:audio/mpeg;base64,' + base64.b64encode(open(p, 'rb').read()).decode(), d]
    return out

def transcode(man, kbps):
    tmp = tempfile.mkdtemp(prefix='santi_audio_')
    for k, (f, d) in man.items():
        src = os.path.join('audio', f)
        if os.path.exists(src): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '22050', '-b:a', f'{kbps}k', os.path.join(tmp, f)], check=False)
    return tmp

def inline_scripts(html, manifest_inline):
    def inline(m):
        src = m.group(1).split('?')[0]
        if src == 'audio/manifest.js': return '<script>\n' + manifest_inline + '\n</script>'
        js = open(src, encoding='utf8').read(); assert '</script' not in js, src; return '<script>\n' + js + '\n</script>'
    body = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    return re.sub(r'<link rel="stylesheet" href="css/style.css[^"]*">', lambda m: '<style>\n' + css + '\n</style>', body)

man = load_manifest()
total = sum(os.path.getsize(os.path.join('audio', f)) for f, d in man.values() if os.path.exists(os.path.join('audio', f)))
print('audio clips:', len(man), round(total / 1e6, 1), 'MB')

# 1) 单文件：原始音质内嵌
body = inline_scripts(html, manifest_js(embed_manifest(man, 'audio')))
open('dist/三体阅读地图.html', 'w', encoding='utf8').write(body)
print('single-file:', round(os.path.getsize('dist/三体阅读地图.html') / 1e6, 1), 'MB')

# 2) Artifact：控制在 ~15MB 以内（base64 膨胀 1.33 倍）
LIMIT = 10.8e6; tmp = None; kb = None
if total > LIMIT:
    for kb in (32, 24, 20, 16, 12):
        if tmp: shutil.rmtree(tmp, ignore_errors=True)
        tmp = transcode(man, kb)
        t2 = sum(os.path.getsize(os.path.join(tmp, f)) for f, d in man.values() if os.path.exists(os.path.join(tmp, f)))
        print(f'  artifact transcode {kb}kbps → {round(t2/1e6,1)} MB')
        if t2 <= LIMIT: break
src_dir = tmp or 'audio'
body2 = inline_scripts(html, manifest_js(embed_manifest(man, src_dir)))
inner = re.search(r'<body>(.*)</body>', body2, re.S).group(1); style = re.search(r'<style>.*?</style>', body2, re.S).group(0)
open('dist/artifact.html', 'w', encoding='utf8').write('<title>三体·阅读地图</title>\n' + style + '\n' + inner)
if tmp: shutil.rmtree(tmp, ignore_errors=True)
print('artifact:', round(os.path.getsize('dist/artifact.html') / 1e6, 1), 'MB', ('(%skbps)' % kb if kb else '(原始音质)'))
