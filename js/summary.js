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
         rel: [['yewenjie', 'luoji', '墓前的两条公理'], ['zhuangyan', 'luoji', '梦中情人 · 冬眠'], ['shiqiang', 'luoji', '老友 · 守护'], ['hines', 'luoji', '同为面壁者'], ['tyler', 'luoji', '同为面壁者'], ['reydiaz', 'zhangbeihai', '（同一时代）'], ['zhangbeihai', 'droplet', '末日之战前逃离'], ['luoji', 'droplet', '雪地对峙 · 威慑']] },
    3: { nodes: { chengxin: [560, 190], yuntianming: [200, 80], wade: [200, 330], aiaa: [560, 370], luoji: [920, 80], guanyifan: [920, 330], sophonbot: [1280, 100], singer: [1280, 330], zeroer: [1560, 200] },
         rel: [['yuntianming', 'chengxin', '一颗星 · 三个童话 · 小宇宙'], ['wade', 'chengxin', '两次被她拦下'], ['aiaa', 'chengxin', '朋友 · 星环号'], ['luoji', 'chengxin', '执剑人交接'], ['guanyifan', 'chengxin', '死线 · 小宇宙 647'], ['sophonbot', 'chengxin', '威慑失败 · 告别'], ['singer', 'aiaa', '二向箔（无意的毁灭）'], ['zeroer', 'guanyifan', '回归运动']] }
  };
  var ENDING = { 1: '"虫子从来没有被战胜过。" —— 走完这张地图，去翻开原著吧。第二部《黑暗森林》的大门就在前方。', 2: '"给岁月以文明，而不是给文明以岁月。" —— 第二部走完了。前面那道门后，是《死神永生》。', 3: '把字刻在石头上。—— 三部曲走完了。从清华园的一副眼镜，到时间之外的一个生态球。现在，去读原著吧。' };
  var MIRROR = { 2: '镜像：第一部叶文洁"按住三秒，发出坐标" ↔ 第二部罗辑"握住三秒，不松手"；第一部"发射" ↔ 第二部"咒语"。', 3: '镜像：第一部"不要回答"的选择 ↔ 第三部程心"按不按"的选择；第一部叶文洁"发出" ↔ 第三部万有引力号"广播"；三部曲从一副眼镜开始，到一个生态球结束。' };

  function draw(cv, H, book) {
    book = book || 1; var B = SM.BOOKS[book - 1]; var st = SM.State.get(), kid = SM.State.isKid(); H = H || 2300; cv.width = W; cv.height = H; var g = cv.getContext('2d');
    var isl = SM.ISLANDS.filter(function (i) { return i.book === book; }); var N = isl.length;
    var ids = Object.keys(SM.CARDS).filter(function (id) { return (SM.CARDS[id].book || 1) === book; });
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, book === 2 ? '#070b12' : book === 3 ? '#06061a' : '#0b1024'); bg.addColorStop(1, '#05070f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
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
  /* 三部曲总览：对数时间轴（从 1967 年到时间之外）*/
  var YEARS = { qinghua: 1967, hongan: 1969, launch: 1971, countdown: 2007, flicker: 2007.2, eras: 2007.4, computer: 2007.6, noanswer: 1979, truth: 2007.8, answer: 1979.5, judgment: 2007.9, zither: 2008, bugs: 2008.2,
    b2_axioms: 2010, b2_wallfacer: 2011, b2_luoji: 2013, b2_wallbreaker: 2020, b2_zhang: 2024, b2_spell: 2016, b2_ravine: 2212, b2_ns: 2215, b2_droplet: 2215.3, b2_darkbattle: 2215.6, b2_spellhit: 2215.8, b2_law: 2216, b2_snow: 2216.3, b2_deterrence: 2216.6,
    b3_star: 2010.5, b3_staircase: 2012, b3_sword: 2277, b3_fail: 2278, b3_4d: 2279, b3_triend: 2286, b3_tales: 2286.5, b3_bunker: 2300, b3_wade: 2306, b3_singer: 2360, b3_flat: 2362, b3_blue: 2650, b3_647: 19000000, b3_end: 1e10 };
  var ERA_BANDS = [['公元', 1967, 2008], ['危机纪元', 2008, 2216], ['威慑纪元', 2216, 2278], ['广播纪元', 2278, 2295], ['掩体纪元', 2295, 2362], ['银河纪元', 2362, 19000000], ['时间之外', 19000000, 1e10]];
  function drawTrilogy(cv, H) {
    var st = SM.State.get(); H = H || 1500; cv.width = W; cv.height = H; var g = cv.getContext('2d');
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1024'); bg.addColorStop(.5, '#070b12'); bg.addColorStop(1, '#06061a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 500; i++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * .6 + .1) + ')'; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    g.fillStyle = '#fff'; g.font = 'bold 64px ' + FONT; g.fillText('《三体》三部曲总览', 80, 110); g.font = '24px ' + FONT; g.fillStyle = '#aab2d6'; g.fillText('一条河、41 座岛、从 1967 年到时间之外 · 时间轴越往右越"压缩" · 已走过 ' + SM.State.doneCount() + ' / ' + SM.ISLANDS.length + ' 站', 80, 152);
    var x0 = 110, x1 = W - 110, yAxis = 760;
    // 分段时间轴：左边几十年占一大块，右边几百万年只占一小块
    var BP = [[1967, 0], [1980, .08], [2007, .16], [2030, .34], [2210, .46], [2230, .6], [2290, .72], [2370, .82], [2650, .88], [1.9e7, .95], [1e10, 1]];
    var X = function (y) { if (y <= BP[0][0]) return x0; for (var k = 1; k < BP.length; k++) { if (y <= BP[k][0]) { var a = BP[k - 1], b = BP[k]; var f = (Math.log(y - a[0] + 1)) / (Math.log(b[0] - a[0] + 1)); if (b[0] - a[0] < 400) f = (y - a[0]) / (b[0] - a[0]); return x0 + (x1 - x0) * (a[1] + (b[1] - a[1]) * f); } } return x1; };
    ERA_BANDS.forEach(function (e, i) { var a = X(e[1]), b = X(e[2]); g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.07)'; g.fillRect(a, yAxis - 400, b - a, 800); g.fillStyle = '#cfd6ff'; g.font = 'bold 16px ' + FONT; g.textAlign = 'center'; g.fillText(e[0], (a + b) / 2, yAxis - 415); g.textAlign = 'left'; });
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, yAxis); g.lineTo(x1, yAxis); g.stroke();
    [[1967, '1967'], [1979, '1979'], [2007, '2007'], [2030, '2030'], [2216, '危机纪元 208'], [2278, '威慑纪元 62'], [2362, '掩体纪元 67'], [2650, '银河纪元'], [1.9e7, '1890 万年后'], [1e10, '时间之外']].forEach(function (t) { var x = X(t[0]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, yAxis - 8); g.lineTo(x, yAxis + 8); g.stroke(); g.fillStyle = '#8a92b8'; g.font = '13px ' + FONT; g.textAlign = 'center'; g.fillText(t[1], x, yAxis + 26); g.textAlign = 'left'; });
    var bookCol = { 1: '#3fa9ff', 2: '#b57bff', 3: '#ff7aa8' }; var sideOf = { 1: -1, 2: 1, 3: -1 };
    var pts = SM.ISLANDS.map(function (it) { return { it: it, x: X(YEARS[it.id] || 2007), side: sideOf[it.book] }; }).sort(function (a, b) { return a.x - b.x; });
    [-1, 1].forEach(function (sd) { var lastEnd = -1e9, lane = 0; pts.filter(function (p) { return p.side === sd; }).forEach(function (p) { g.font = '13px ' + FONT; var w = g.measureText(p.it.title.replace('三体游戏：', '')).width + 22; if (p.x < lastEnd) { lane = (lane + 1) % 7; } else lane = 0; p.lane = lane; lastEnd = Math.max(lastEnd - 0, p.x + w); if (lane === 0) lastEnd = p.x + w; }); });
    pts.forEach(function (p) { var ly = yAxis + p.side * (50 + p.lane * 36); var done = st.done[p.it.id]; var c = bookCol[p.it.book];
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, yAxis); g.lineTo(p.x, ly); g.stroke();
      g.beginPath(); g.arc(p.x, ly, 8, 0, 7); g.fillStyle = done ? c : '#1c2236'; g.fill(); g.strokeStyle = c; g.lineWidth = 2; g.stroke();
      g.fillStyle = done ? '#e8ecff' : '#6a7090'; g.font = '13px ' + FONT; g.fillText(p.it.title.replace('三体游戏：', ''), p.x + 12, ly + 4); });
    var ly0 = yAxis + 330; SM.BOOKS.forEach(function (B, i) { g.fillStyle = bookCol[B.n]; g.fillRect(80 + i * 280, ly0, 26, 10); g.fillStyle = '#e8ecff'; g.font = '17px ' + FONT; g.fillText(B.name + '（' + SM.State.doneCount(B.n) + '/' + SM.ISLANDS.filter(function (it) { return it.book === B.n; }).length + '）', 116 + i * 280, ly0 + 11); });
    g.fillStyle = '#aab2d6'; g.font = '17px ' + FONT; var cy = ly0 + 60;
    cy = wrap(g, '时间轴是分段压缩的：最左边一格只有几年，最右边一格是几百万年。第一部挤在四十年里；第二部跨两百年；第三部从威慑纪元一路走到宇宙尽头。三部曲越往后，时间尺度越大，人越小。', 80, cy, W - 160, 30);
    cy = wrap(g, '三处镜像：叶文洁"按住三秒发出" ↔ 罗辑"握住三秒不松手"；"不要回答"的选择 ↔ 程心"按不按"的选择；第一部"发射" ↔ 第二部"咒语" ↔ 第三部万有引力号"广播"。', 80, cy + 6, W - 160, 30);
    g.fillStyle = '#aab2d6'; g.font = '20px ' + FONT; g.textAlign = 'center'; g.fillText('从清华园的一副眼镜，到时间之外的一个生态球。—— 把字刻在石头上。', W / 2, H - 60); g.textAlign = 'left';
    return cy + 140;
  }
  var curBook = 1;
  function show(book) {
    if (book === 0) { var cv0 = document.getElementById('sumCanvas'); var need0 = drawTrilogy(cv0); drawTrilogy(cv0, Math.max(1500, need0)); return finishShow(0, cv0); }
    curBook = book || 1; var cv = document.getElementById('sumCanvas'); var need = draw(cv, null, curBook); draw(cv, Math.max(1400, need), curBook);
    finishShow(curBook, cv);
  }
  function finishShow(book, cv) {
    curBook = book;
    document.getElementById('summary').classList.remove('hidden');
    var tabs = document.getElementById('sumTabs'); tabs.innerHTML = '';
    SM.BOOKS.forEach(function (B) { var b = document.createElement('button'); b.className = 'bigbtn small' + (B.n === curBook ? ' on' : ''); b.textContent = B.name; b.onclick = function () { show(B.n); }; tabs.appendChild(b); });
    if (SM.BOOKS.length > 1) { var bt = document.createElement('button'); bt.className = 'bigbtn small' + (curBook === 0 ? ' on' : ''); bt.textContent = '三部曲总览'; bt.onclick = function () { show(0); }; tabs.appendChild(bt); }
    var url = cv.toDataURL('image/png');
    document.getElementById('dlBtn').onclick = function () { if (SM.SANDBOX) { showImage(url); return; } var a = document.createElement('a'); a.download = curBook === 0 ? '三体三部曲总览.png' : '我的' + SM.BOOKS[curBook - 1].short + '阅读地图.png'; a.href = url; document.body.appendChild(a); a.click(); a.remove(); };
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
