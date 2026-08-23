#!/usr/bin/env python3
"""把 index.html + css + js 打成单文件：dist/三体阅读地图.html（双击即玩）与 dist/artifact.html（claude.ai Artifact 片段）。"""
import re, os
here = os.path.dirname(os.path.abspath(__file__)); os.chdir(here); os.makedirs('dist', exist_ok=True)
html = open('index.html', encoding='utf8').read(); css = open('css/style.css', encoding='utf8').read()
def inline(m):
    js = open(m.group(1), encoding='utf8').read(); assert '</script' not in js, m.group(1); return '<script>\n' + js + '\n</script>'
body = re.sub(r'<script src="([^"]+)"></script>', inline, html).replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
open('dist/三体阅读地图.html', 'w', encoding='utf8').write(body)
inner = re.search(r'<body>(.*)</body>', body, re.S).group(1); style = re.search(r'<style>.*?</style>', body, re.S).group(0)
open('dist/artifact.html', 'w', encoding='utf8').write('<title>三体·阅读地图</title>\n' + style + '\n' + inner)
print('ok:', os.path.getsize('dist/三体阅读地图.html') // 1024, 'KB')
