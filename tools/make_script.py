#!/usr/bin/env python3
"""生成真人录音脚本 tools/录音脚本.md：每句一个文件名（与 audio/ 里的一致）。
真人录好后把 mp3 按同名放进 audio/，覆盖合成音即可（重新跑 gen_audio.py 不会覆盖已存在的文件）。"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def h(s):
    v = 5381
    for ch in s: v = ((v * 33) ^ ord(ch)) & 0xFFFFFFFF
    return format(v, 'x')
lines = json.load(open(os.path.join(ROOT, 'tools', 'lines.json'), encoding='utf8'))
names = {'reader': '读者模式旁白（沉稳、纪录片感）', 'kid': '小学生模式旁白（温暖、慢一点）', 'guide': '向导小智子（轻快、亲切）'}
out = ['# 《三体·阅读地图》真人录音脚本', '', '录音要求：安静环境，单声道，mp3 或 m4a 转 mp3；语速自然，每句单独一个文件；文件名必须与下面一致，放进 `audio/` 覆盖同名文件即可。', '']
for v in ['reader', 'kid', 'guide']:
    out.append('## ' + names[v] + '\n')
    n = 0
    for L in lines:
        if v in L['voices']:
            n += 1; out.append('%d. `%s_%s.mp3`\n   %s\n' % (n, v, h(L['text']), L['text']))
open(os.path.join(ROOT, 'tools', '录音脚本.md'), 'w', encoding='utf8').write('\n'.join(out))
print('ok', len(lines))
