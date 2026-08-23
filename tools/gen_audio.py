#!/usr/bin/env python3
"""用微软神经网络语音为 tools/lines.json 里的每一句生成 mp3 → audio/，并写 audio/manifest.js。
用法：python3 tools/gen_audio.py  （已存在的文件跳过；改了文案只会重生成变化的句子）"""
import json, os, asyncio, hashlib, sys, subprocess
sys.path.insert(0, os.path.expanduser('~/Library/Python/3.9/lib/python/site-packages'))
import edge_tts
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, 'audio'); os.makedirs(AUD, exist_ok=True)
VOICES = {  # 声线：读者旁白=云健（男，纪录片感）；小学生旁白=晓晓（女，温暖）；向导小智子=晓伊（女，活泼）
  'reader': ('zh-CN-YunjianNeural', '-6%', '+0Hz'),
  'kid':    ('zh-CN-XiaoxiaoNeural', '-10%', '+0Hz'),
  'guide':  ('zh-CN-XiaoyiNeural', '+0%', '+0Hz'),
}
def h(s):  # 与 narration.js 里同样的 djb2 哈希
    v = 5381
    for ch in s: v = ((v * 33) ^ ord(ch)) & 0xFFFFFFFF
    return format(v, 'x')
lines = json.load(open(os.path.join(ROOT, 'tools', 'lines.json'), encoding='utf8'))
jobs = []
for L in lines:
    for v in L['voices']:
        key = v + '_' + h(L['text']); f = os.path.join(AUD, key + '.mp3')
        jobs.append((key, v, L['text'], f))
sem = None
async def one(key, v, text, f):
    if os.path.exists(f) and os.path.getsize(f) > 1000: return 'skip'
    voice, rate, pitch = VOICES[v]
    for attempt in range(4):
        try:
            async with sem:
                await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(f)
                await asyncio.sleep(0.4)
            if os.path.getsize(f) > 1000: return 'ok'
        except Exception as e:
            if attempt == 3: print('ERR', key, type(e).__name__, str(e)[:120], flush=True)
            await asyncio.sleep(3 + attempt * 4)
    return 'fail'
async def main():
    global sem; sem = asyncio.Semaphore(3)
    res = await asyncio.gather(*[one(*j) for j in jobs])
    print('ok', res.count('ok'), 'skip', res.count('skip'), 'fail', res.count('fail'))
    # 时长 → manifest
    man = {}
    for key, v, text, f in jobs:
        if not os.path.exists(f) or os.path.getsize(f) < 1000: continue
        try:
            d = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).decode().strip())
        except Exception: d = 0
        man[key] = [key + '.mp3', round(d, 2)]
    open(os.path.join(AUD, 'manifest.js'), 'w', encoding='utf8').write('/* 由 tools/gen_audio.py 生成：键 = 声线_文本哈希 → [文件, 秒] */\nwindow.SM = window.SM || {}; SM.AUDIO_MANIFEST = ' + json.dumps(man, ensure_ascii=False) + ';\n')
    total = sum(os.path.getsize(os.path.join(AUD, k + '.mp3')) for k in man)
    print('manifest', len(man), 'files,', round(total / 1e6, 1), 'MB,', round(sum(v[1] for v in man.values()) / 60, 1), 'min')
asyncio.run(main())
