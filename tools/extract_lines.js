// 提取全部会被朗读的文本 → tools/lines.json  [{text, voices:['kid'|'reader'|'guide', ...]}]
const fs = require('fs'), path = require('path'); const root = path.join(__dirname, '..');
global.window = global; global.SM = {};
for (const f of ['data.js', 'data2.js', 'data3.js']) new Function(fs.readFileSync(path.join(root, 'js', f), 'utf8'))();
const lines = new Map(); const add = (t, v) => { if (!t || t.length < 4) return; t = String(t).trim(); if (!lines.has(t)) lines.set(t, new Set()); lines.get(t).add(v); };
// 数据里的旁白
SM.ISLANDS.forEach(i => { add(i.say.kid, 'kid'); add(i.say.reader, 'reader'); });
// 向导
add(SM.GUIDE.intro.kid, 'guide'); add(SM.GUIDE.intro.reader, 'guide'); SM.GUIDE.nearIsland.forEach(t => add(t, 'guide')); SM.GUIDE.walk.forEach(t => add(t, 'guide'));
Object.values(SM.GUIDE.lineChange).forEach(t => add(t, 'guide')); add(SM.GUIDE.end, 'guide');
['book2', 'book3'].forEach(k => { if (SM.GUIDE[k]) { add(SM.GUIDE[k].kid, 'guide'); add(SM.GUIDE[k].reader, 'guide'); } });
['book2end', 'book3end', 'kidWarn', 'welcomeBack'].forEach(k => add(SM.GUIDE[k], 'guide'));
if (SM.GUIDE.book3 && SM.GUIDE.kidWarn) add(SM.GUIDE.book3.kid + ' ' + SM.GUIDE.kidWarn, 'guide');
// main.js 里的向导句
add('这座岛你已经走过了，想再看一遍也可以。', 'guide'); add('没关系，随时可以再进去。', 'guide');
add('已切换到小学生模式：字少一点，讲慢一点。', 'guide'); add('已切换到读者模式：旁白更完整，每站附"想一想"。', 'guide');
SM.ISLANDS.forEach(i => add('收好了！继续沿河往前走，下一站是"' + i.title + '"。', 'guide'));
// stage.js 收卡
add('你收到了一张线索卡。', 'kid'); add('你收到了一张线索卡。', 'reader'); [2, 3, 4].forEach(n => { add('你收到了' + n + '张线索卡。', 'kid'); add('你收到了' + n + '张线索卡。', 'reader'); });
// islands*.js 里 api.say(...) 的字符串
const strRe = /'((?:[^'\\]|\\.)*)'/g;
function scanFile(f) {
  const src = fs.readFileSync(path.join(root, 'js', f), 'utf8'); let idx = 0;
  while ((idx = src.indexOf('api.say(', idx)) >= 0) {
    let i = idx + 8, depth = 1, inStr = null; const start = i;
    while (i < src.length && depth > 0) { const ch = src[i]; if (inStr) { if (ch === '\\') i++; else if (ch === inStr) inStr = null; } else { if (ch === "'" || ch === '"') inStr = ch; else if (ch === '(') depth++; else if (ch === ')') depth--; } i++; }
    const arg = src.slice(start, i - 1);
    // 第一个参数（去掉 {label:...} 之类）
    const firstArg = arg.split(/,\s*\{/)[0];
    if (/api\.kid\s*\?/.test(firstArg)) { const m = firstArg.match(/api\.kid\s*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/); if (m) { add(m[1].replace(/\\'/g, "'"), 'kid'); add(m[2].replace(/\\'/g, "'"), 'reader'); } }
    else { let m; strRe.lastIndex = 0; while ((m = strRe.exec(firstArg))) { const t = m[1].replace(/\\'/g, "'"); if (t.length >= 6) { add(t, 'kid'); add(t, 'reader'); } } }
    idx = i;
  }
  // 童话：text: api.kid ? 'A' : 'B'
  const tre = /text:\s*api\.kid\s*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g; let m2; while ((m2 = tre.exec(src))) { add(m2[1], 'kid'); add(m2[2], 'reader'); }
  // 乱纪元结果 msg
  const mre = /msg = choice === 'dehy' \? '((?:[^'\\]|\\.)*)' : '((?:[^'\\]|\\.)*)'/g; let m3; while ((m3 = mre.exec(src))) { add(m3[1], 'kid'); add(m3[1], 'reader'); add(m3[2], 'kid'); add(m3[2], 'reader'); }
  const nre = /else \{ msg = choice === 'dehy' \? '((?:[^'\\]|\\.)*)' : '((?:[^'\\]|\\.)*)'/g; let m4; while ((m4 = nre.exec(src))) { add(m4[1], 'kid'); add(m4[1], 'reader'); add(m4[2], 'kid'); add(m4[2], 'reader'); }
}
['islands.js', 'islands2.js', 'islands3.js'].forEach(scanFile);
const out = [...lines.entries()].map(([text, v]) => ({ text, voices: [...v] }));
fs.writeFileSync(path.join(__dirname, 'lines.json'), JSON.stringify(out, null, 1));
const chars = out.reduce((a, l) => a + l.text.length * l.voices.length, 0);
console.log('lines:', out.length, 'voice-lines:', out.reduce((a, l) => a + l.voices.length, 0), 'chars:', chars);
