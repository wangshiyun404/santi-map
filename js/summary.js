/* 终点产出：按部生成可保存/打印的"我的阅读地图" */
SM.Summary = (function () {
  var W = 1800, FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function wrap(g, text, x, y, maxW, lh) { var line = '', cy = y; for (var i = 0; i < text.length; i++) { var t = line + text[i]; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, cy); line = text[i]; cy += lh; } else line = t; } if (line) g.fillText(line, x, cy); return cy + lh; }

  /* 每部的人物关系图布局 */
  var PEOPLE = {
    1: { nodes: { yewenjie: [420, 150], yezhetai: [160, 60], listener: [420, 330], wangmiao: [900, 150], shiqiang: [1180, 90], evans: [900, 330], sophon: [1480, 200] },
         rel: [['yezhetai', 'yewenjie', '父亲之死 → 失去信任'], ['listener', 'yewenjie', '警告"不要回答"'], ['yewenjie', 'wangmiao', '在游戏聚会中相遇'], ['yewenjie', 'evans', '共同创立ETO'], ['shiqiang', 'wangmiao', '搭档 · 古筝行动'], ['evans', 'wangmiao', '审判日号 · 被夺取信息'], ['sophon', 'wangmiao', '倒计时 · 锁死科学']] },
    2: { nodes: { luoji: [520, 180], yewenjie: [200, 70], zhuangyan: [200, 330], shiqiang: [860, 90], hines: [860, 330], zhangbeihai: [1250, 150], droplet: [1250, 340], tyler: [560, 380], reydiaz: [1520, 90] },
         rel: [['yewenjie', 'luoji', '墓前的两条公理'], ['zhuangyan', 'luoji', '梦中情人 · 冬眠'], ['shiqiang', 'luoji', '老友 · 守护'], ['hines', 'luoji', '同为面壁者'], ['tyler', 'luoji', '同为面壁者'], ['reydiaz', 'zhangbeihai', '（同一时代）'], ['zhangbeihai', 'droplet', '末日之战前逃离'], ['luoji', 'droplet', '雪地对峙 · 威慑']] }
  };
  var ENDING = { 1: '"虫子从来没有被战胜过。" —— 走完这张地图，去翻开原著吧。第二部《黑暗森林》的大门就在前方。', 2: '"给岁月以文明，而不是给文明以岁月。" —— 第二部走完了。前面那道门后，是《死神永生》。' };
  var MIRROR = { 2: '镜像：第一部叶文洁"按住三秒，发出坐标" ↔ 第二部罗辑"握住三秒，不松手"；第一部"发射" ↔ 第二部"咒语"。' };

  function draw(cv, H, book) {
    book = book || 1; var B = SM.BOOKS[book - 1]; var st = SM.State.get(), kid = SM.State.isKid(); H = H || 2300; cv.width = W; cv.height = H; var g = cv.getContext('2d');
    var isl = SM.ISLANDS.filter(function (i) { return i.book === book; }); var N = isl.length;
    var ids = Object.keys(SM.CARDS).filter(function (id) { return (SM.CARDS[id].book || 1) === book; });
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, book === 2 ? '#070b12' : '#0b1024'); bg.addColorStop(1, '#05070f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 500; i++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * .6 + .1) + ')'; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    if (book === 2) { for (var t = 0; t < 60; t++) { var tx = Math.random() * W, th = 60 + Math.random() * 140; g.fillStyle = 'rgba(8,12,20,.9)'; g.beginPath(); g.moveTo(tx, H); g.lineTo(tx - 18 - Math.random() * 20, H); g.lineTo(tx - 9, H - th); g.closePath(); g.fill(); } }
    g.fillStyle = '#fff'; g.font = 'bold 64px ' + FONT; g.textAlign = 'left'; g.fillText('我的《' + B.short + '》阅读地图', 80, 110);
    g.font = '24px ' + FONT; g.fillStyle = '#aab2d6'; g.fillText(B.name + ' · ' + (kid ? '小学生模式' : '读者模式') + ' · ' + new Date().toLocaleDateString('zh-CN') + ' · 已走过 ' + SM.State.doneCount(book) + ' / ' + N + ' 站 · 线索卡 ' + ids.filter(SM.State.hasCard).length + ' / ' + ids.length, 80, 152);
    g.fillStyle = '#5e6690'; g.font = '18px ' + FONT; g.textAlign = 'right'; g.fillText('三体·阅读地图 · 根据刘慈欣《三体》情节自写转述', W - 80, 110); g.textAlign = 'left';

    /* 一、三条线 */
    var y0 = 230; g.fillStyle = '#ffd36b'; g.font = 'bold 30px ' + FONT; g.fillText('一、三条故事线是怎样交织的', 80, y0);
    var rows = {}; B.lines.forEach(function (l, i) { rows[l] = y0 + 110 + i * 140; }); var midLine = B.lines[1]; var x0 = 340, x1 = W - 120;
    B.lines.forEach(function (l) { var y = rows[l]; g.strokeStyle = SM.LINES[l].css; g.lineWidth = 10; g.globalAlpha = .35; g.beginPath(); g.moveTo(x0 - 40, y); g.lineTo(x1, y); g.stroke(); g.globalAlpha = 1; g.fillStyle = SM.LINES[l].css; g.font = 'bold 22px ' + FONT; g.textAlign = 'right'; g.fillText(SM.LINES[l].short + '线', x0 - 60, y + 8); g.font = '15px ' + FONT; g.fillStyle = '#aab2d6'; g.fillText(SM.LINES[l].desc, x0 - 60, y + 32); g.textAlign = 'left'; });
    g.strokeStyle = '#f4f1ff'; g.lineWidth = 10; g.globalAlpha = .35; g.beginPath(); g.moveTo(x1 - 60, rows[B.lines[0]]); g.lineTo(x1 + 10, rows[midLine]); g.moveTo(x1 - 60, rows[B.lines[2]]); g.lineTo(x1 + 10, rows[midLine]); g.stroke(); g.globalAlpha = 1;
    var pts = isl.map(function (it, i) { var x = x0 + (x1 - x0 - 40) * (i / (N - 1)); var y = it.line === 'merge' ? rows[midLine] : rows[it.line]; return { x: x, y: y, isl: it, i: i }; });
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }); g.stroke(); g.setLineDash([]);
    pts.forEach(function (p) { var done = st.done[p.isl.id]; var c = SM.LINES[p.isl.line].css; g.beginPath(); g.arc(p.x, p.y, 16, 0, 7); g.fillStyle = done ? c : '#1c2236'; g.fill(); g.lineWidth = 3; g.strokeStyle = c; g.stroke(); g.fillStyle = done ? '#0b0e1a' : '#666'; g.font = 'bold 16px ' + FONT; g.textAlign = 'center'; g.fillText(p.i + 1, p.x, p.y + 6);
      var up = (p.i % 2 === 0); g.fillStyle = done ? '#fff' : '#6a7090'; g.font = '16px ' + FONT; g.fillText(p.isl.title.replace('三体游戏：', ''), p.x, up ? p.y - 34 : p.y + 46); g.fillStyle = '#8a92b8'; g.font = '13px ' + FONT; g.fillText(p.isl.year, p.x, up ? p.y - 54 : p.y + 66); g.textAlign = 'left'; });
    g.fillStyle = '#aab2d6'; g.font = '17px ' + FONT; g.fillText('虚线是你在书中读到它们的顺序：三条线来回切换，最后汇合。看懂这张图，就看懂了这一部的结构。', 80, y0 + 500);

    /* 二、人物关系 */
    var y1 = y0 + 580; g.fillStyle = '#ffd36b'; g.font = 'bold 30px ' + FONT; g.fillText('二、主要人物与他们的关系', 80, y1);
    var PP = PEOPLE[book] || PEOPLE[1]; var P = {}; Object.keys(PP.nodes).forEach(function (k) { P[k] = [PP.nodes[k][0], y1 + PP.nodes[k][1]]; });
    g.lineWidth = 2; PP.rel.forEach(function (r) { var a = P[r[0]], b = P[r[1]]; if (!a || !b) return; g.strokeStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.font = '14px ' + FONT; g.textAlign = 'center'; var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; var tw = g.measureText(r[2]).width; g.fillStyle = 'rgba(5,7,15,.8)'; g.fillRect(mx - tw / 2 - 6, my - 12, tw + 12, 22); g.fillStyle = '#9fb4ff'; g.fillText(r[2], mx, my + 4); g.textAlign = 'left'; });
    Object.keys(P).forEach(function (id) { var c = SM.CARDS[id]; if (!c) return; var p = P[id], has = SM.State.hasCard(id); var w = 150, h = 58; rr(g, p[0] - w / 2, p[1] - h / 2, w, h, 12); g.fillStyle = has ? (c.type === 'person' ? '#2a2450' : '#3a2e14') : '#141826'; g.fill(); g.strokeStyle = has ? (c.type === 'person' ? '#ff9f7a' : '#ffd36b') : '#333a55'; g.lineWidth = 2; g.stroke(); g.fillStyle = has ? '#fff' : '#5a6080'; g.font = 'bold 20px ' + FONT; g.textAlign = 'center'; g.fillText(has ? c.name : '？', p[0], p[1] - 2); g.font = '12px ' + FONT; g.fillStyle = '#aab2d6'; if (has) g.fillText(c.sub.length > 14 ? c.sub.slice(0, 13) + '…' : c.sub, p[0], p[1] + 20); g.textAlign = 'left'; });

    /* 三、线索卡 */
    var y2 = y1 + 440; g.fillStyle = '#ffd36b'; g.font = 'bold 30px ' + FONT; g.fillText('三、我收集的线索卡', 80, y2);
    var cw = 260, ch = 74, perRow = 6, gap = 16; var TN = SM.State.TYPE_NAME || { person: '人物', event: '事件', concept: '概念', era: '纪元' };
    ids.forEach(function (id, i) { var c = SM.CARDS[id], has = SM.State.hasCard(id); var x = 80 + (i % perRow) * (cw + gap), y = y2 + 30 + Math.floor(i / perRow) * (ch + gap); rr(g, x, y, cw, ch, 10); g.fillStyle = has ? '#161b33' : '#0e1120'; g.fill(); g.strokeStyle = has ? { person: '#ff9f7a', event: '#7fb8ff', concept: '#ffd36b', era: '#cfd6ff' }[c.type] : '#2a3050'; g.lineWidth = 2; g.stroke(); g.fillStyle = has ? '#fff' : '#3e465e'; g.font = 'bold 19px ' + FONT; g.fillText(has ? c.name : '？？？', x + 14, y + 30); g.fillStyle = '#8a92b8'; g.font = '12px ' + FONT; g.fillText(TN[c.type] + (has ? ' · ' + (c.sub.length > 16 ? c.sub.slice(0, 15) + '…' : c.sub) : ''), x + 14, y + 54); });

    /* 四、选择与想法 */
    var y3 = y2 + 30 + Math.ceil(ids.length / perRow) * (ch + gap) + 50; g.fillStyle = '#ffd36b'; g.font = 'bold 30px ' + FONT; g.fillText('四、我在路上做的选择', 80, y3);
    var lines = [];
    isl.forEach(function (it) { var ch2 = st.choices[it.id]; if (ch2 === undefined || ch2 === null || ch2 === true) return;
      if (it.id === 'noanswer') lines.push('面对"不要回答"的警告，我选择了：' + ch2 + '。（叶文洁选择了回答。）');
      else if (it.id === 'eras') { var es = String(ch2).split(','); lines.push('在乱纪元的三个回合里，我的决定是：' + es.map(function (e, i) { return '第' + (i + 1) + '回合' + (e === 'dehy' ? '脱水' : '继续发展'); }).join('、') + '。'); }
      else if (it.id === 'flicker') lines.push('宇宙闪烁那晚，我数到了 ' + ch2 + ' 次。');
      else if (it.id === 'countdown') return;
      else lines.push('在「' + it.title + '」，我的选择是：' + ch2 + '。'); });
    if (!lines.length) lines.push('（还没有做过选择）');
    g.fillStyle = '#e8ecff'; g.font = '19px ' + FONT; var cy = y3 + 44; lines.forEach(function (l) { cy = wrap(g, '· ' + l, 80, cy, W - 160, 30); });
    var notes = isl.filter(function (it) { return st.notes[it.id]; });
    if (notes.length) { cy += 10; g.fillStyle = '#ffd36b'; g.font = 'bold 24px ' + FONT; g.fillText('我的想法', 80, cy); cy += 34; g.fillStyle = '#e8ecff'; g.font = '18px ' + FONT; notes.forEach(function (it) { cy = wrap(g, '【' + it.title + '】' + st.notes[it.id], 80, cy, W - 160, 28) + 6; }); }
    if (MIRROR[book]) { cy += 10; g.fillStyle = '#9fb4ff'; g.font = '17px ' + FONT; cy = wrap(g, MIRROR[book], 80, cy, W - 160, 28); }
    g.fillStyle = '#aab2d6'; g.font = '20px ' + FONT; g.textAlign = 'center'; g.fillText(ENDING[book] || '', W / 2, H - 60); g.textAlign = 'left';
    return cy + 140;
  }
  var curBook = 1;
  function show(book) {
    curBook = book || 1; var cv = document.getElementById('sumCanvas'); var need = draw(cv, null, curBook); draw(cv, Math.max(1400, need), curBook);
    document.getElementById('summary').classList.remove('hidden');
    var tabs = document.getElementById('sumTabs'); tabs.innerHTML = '';
    SM.BOOKS.forEach(function (B) { var b = document.createElement('button'); b.className = 'bigbtn small' + (B.n === curBook ? ' on' : ''); b.textContent = B.name; b.onclick = function () { show(B.n); }; tabs.appendChild(b); });
    var url = cv.toDataURL('image/png');
    document.getElementById('dlBtn').onclick = function () { if (SM.SANDBOX) { showImage(url); return; } var a = document.createElement('a'); a.download = '我的' + SM.BOOKS[curBook - 1].short + '阅读地图.png'; a.href = url; document.body.appendChild(a); a.click(); a.remove(); };
    document.getElementById('printBtn').onclick = function () { if (SM.SANDBOX) { showImage(url); return; } var w = window.open(''); if (!w) { showImage(url); return; } w.document.write('<title>我的阅读地图</title><img src="' + url + '" style="width:100%">'); w.document.close(); setTimeout(function () { w.print(); }, 500); };
  }
  function showImage(url) {
    var ov = document.getElementById('imgOverlay');
    if (!ov) { ov = document.createElement('div'); ov.id = 'imgOverlay'; ov.style.cssText = 'position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.92);overflow:auto;padding:60px 30px 30px;text-align:center;'; document.body.appendChild(ov); }
    ov.innerHTML = '<div style="position:fixed;top:16px;left:0;right:0;text-align:center;color:#fff;font-size:15px">在图片上<b>右键 → 存储图像</b>（手机/平板：长按图片保存）。　<button class="bigbtn small" onclick="document.getElementById(\'imgOverlay\').remove()">关闭</button></div><img src="' + url + '" style="max-width:100%;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.6)">';
    ov.classList.remove('hidden');
  }
  return { show: show, draw: draw };
})();
