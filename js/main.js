/* 总控：首页、HUD、主循环、岛的进出、站点目录、按部的总图 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  // 在 claude.ai Artifact 等沙箱 iframe 中：localStorage/下载/弹窗不可用
  SM.SANDBOX = (function () { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return window.top !== window.self; } catch (e) { return true; } })();
  var renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(window.innerWidth, window.innerHeight);
  SM.Stage.setRenderer(renderer);
  var started = false, nearIsl = null, lastT = performance.now(), guideTimer = null, curBook = 1;
  var state = SM.State.get(); var NB = SM.BOOKS.length;

  /* ---------- 首页 ---------- */
  function showTitle() { $('title').classList.remove('hidden'); $('hud').classList.add('hidden'); SM.Narr.stop(); if (state.mode && SM.State.doneCount() > 0) { $('contRow').classList.remove('hidden'); $('contN').textContent = nextStationLabel(); } }
  function nextStationLabel() { var next = SM.ISLANDS.find(function (i) { return !SM.State.isDone(i.id); }); if (!next) return '终点'; var li = SM.ISLANDS.filter(function (i) { return i.book === next.book; }).indexOf(next); return SM.BOOKS[next.book - 1].short + '第 ' + (li + 1) + ' 站'; }
  document.querySelectorAll('.modebtn').forEach(function (b) { b.onclick = function () { SM.Audio.init(); SM.Narr.warm(); SM.State.setMode(b.dataset.mode); start(false); }; });
  $('contBtn').onclick = function () { SM.Audio.init(); SM.Narr.warm(); SM.State.setMode(state.mode); start(true); };
  // 所有按钮统一点击音
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button'); if (b && SM.Audio.isReady()) SM.Audio.sfx('click'); }, true);
  $('resetBtn').onclick = function () { var b = $('resetBtn'); if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = '再点一次确认清空进度'; setTimeout(function () { b.dataset.arm = '0'; b.textContent = '重新开始'; }, 4000); return; } SM.State.reset(); state = SM.State.get(); b.textContent = '已清空'; $('contRow').classList.add('hidden'); document.body.classList.remove('kid'); };
  if (state.mode && SM.State.doneCount() > 0) { $('contRow').classList.remove('hidden'); $('contN').textContent = nextStationLabel(); }
  document.body.classList.toggle('kid', state.mode === 'kid');

  function start(cont) {
    $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
    if (!started) { SM.World.init(renderer); started = true; bindHUD(); }
    curBook = 1; buildProgress(1); updateProgress();
    if (cont) { var next = SM.ISLANDS.find(function (i) { return !SM.State.isDone(i.id); }); SM.World.jumpTo(next ? next.u - 0.03 / NB : 1 - 0.05 / NB); }
    else SM.World.jumpTo(0.02 / NB);
    guideSay(SM.State.txt(SM.GUIDE.intro), true);
    updateMute(); SM.Audio.setTheme(SM.BOOKS[SM.World.bookOf(SM.World.getT())].theme || 'stars', true);
  }

  /* ---------- HUD ---------- */
  function buildProgress(book) {
    var rows = $('progress').querySelector('.rows'); rows.innerHTML = ''; var B = SM.BOOKS[book - 1];
    B.lines.forEach(function (l) {
      var L = SM.LINES[l]; var isl = SM.ISLANDS.filter(function (i) { return i.line === l && i.book === book; });
      var r = document.createElement('div'); r.className = 'row'; r.dataset.line = l;
      r.innerHTML = '<span class="lab">' + L.name + '</span><span class="bar"><i style="background:' + L.css + '"></i></span><span class="dots">' + isl.map(function (i) { return '<b data-id="' + i.id + '" style="color:' + L.css + '" title="' + i.title + '"></b>'; }).join('') + '</span>';
      rows.appendChild(r);
    });
    $('bookName').textContent = B.name;
  }
  function updateProgress() {
    var B = SM.BOOKS[curBook - 1];
    B.lines.forEach(function (l) { var p = SM.State.lineProgress(l, curBook); var row = $('progress').querySelector('[data-line=' + l + ']'); if (!row) return; row.querySelector('.bar i').style.width = (p.done / p.total * 100) + '%'; row.querySelectorAll('.dots b').forEach(function (b) { var on = SM.State.isDone(b.dataset.id); b.classList.toggle('on', on); b.style.background = on ? SM.LINES[l].css : ''; }); });
    $('albumBadge').textContent = SM.State.get().cards.length;
    var all = SM.State.bookDone(curBook);
    $('finishBtn').classList.toggle('hidden', !all); $('finishBtn').textContent = '生成《' + B.short + '》阅读地图';
  }
  function guideSay(text, speak) { $('guideTxt').textContent = text; $('guide').style.opacity = 1; if (speak && !SM.Stage.isActive()) SM.Narr.say(text, null, { voice: 'guide' }); clearTimeout(guideTimer); }
  function updateMute() { $('muteBtn').textContent = SM.Narr.isMuted() ? '🔇 旁白关' : '🔊 旁白'; $('sfxBtn').textContent = SM.Audio.isEnabled() ? '🎵 音效' : '🔕 音效关'; }

  /* 站点目录 / 快速旅行 */
  function renderDir() {
    var body = $('dirBody'); var html = ''; var t = SM.World.getT();
    SM.BOOKS.forEach(function (B) {
      var isl = SM.ISLANDS.filter(function (i) { return i.book === B.n; }); var done = isl.filter(function (i) { return SM.State.isDone(i.id); }).length;
      html += '<h3 class="book">' + B.name + ' <small>' + done + ' / ' + isl.length + '</small><button class="bigbtn small" data-u="' + SM.World.uOf(B.n - 1, 0.02) + '">去这一部的起点</button></h3><div class="dirgrid">';
      isl.forEach(function (i) { var d = SM.State.isDone(i.id); var cur = Math.abs(i.u - t) < 0.012 / NB; html += '<button class="dirst' + (d ? ' done' : '') + (cur ? ' cur' : '') + '" data-u="' + i.u + '"><i style="background:' + SM.LINES[i.line].css + '"></i><b>' + (i.localIndex + 1) + '</b><span>' + i.title + '</span><small>' + i.year + '</small>' + (d ? '<em>✓</em>' : '') + '</button>'; });
      html += '</div>';
    });
    body.innerHTML = html;
    body.querySelectorAll('[data-u]').forEach(function (b) { b.onclick = function () { var u = parseFloat(b.dataset.u); $('dir').classList.add('hidden'); SM.World.jumpTo(Math.max(0.005 / NB, u - 0.006 / NB)); SM.World.travelTo(u); }; });
  }

  function bindHUD() {
    var hold = function (btn, d) { btn.onmousedown = btn.ontouchstart = function (e) { e.preventDefault(); SM.World.setHold(d); }; btn.onmouseup = btn.onmouseleave = btn.ontouchend = function () { SM.World.setHold(0); }; };
    hold($('fwdBtn'), 1); hold($('backBtn'), -1);
    $('enterBtn').onclick = function () { if (nearIsl) enterIsland(nearIsl); };
    $('finishBtn').onclick = function () { SM.Narr.stop(); SM.Summary.show(curBook); };
    $('sumClose').onclick = function () { $('summary').classList.add('hidden'); };
    $('albumBtn').onclick = function () { SM.State.renderAlbum(); $('album').classList.remove('hidden'); };
    $('albumClose').onclick = function () { $('album').classList.add('hidden'); };
    $('dirBtn').onclick = function () { renderDir(); $('dir').classList.remove('hidden'); };
    $('dirClose').onclick = function () { $('dir').classList.add('hidden'); };
    $('muteBtn').onclick = function () { SM.Narr.setMuted(!SM.Narr.isMuted()); updateMute(); };
    $('sfxBtn').onclick = function () { SM.Audio.setEnabled(!SM.Audio.isEnabled()); updateMute(); };
    $('finishBtn').addEventListener('click', function () { SM.Audio.sfx('fanfare'); });
    $('modeBtn').onclick = function () { var m = SM.State.isKid() ? 'reader' : 'kid'; SM.State.setMode(m); guideSay(m === 'kid' ? '已切换到小学生模式：字少一点，讲慢一点。' : '已切换到读者模式：旁白更完整，每站附"想一想"。', true); };
    $('homeBtn').onclick = function () { showTitle(); };
    SM.World.onNear(function (isl) {
      if (isl === nearIsl) return; nearIsl = isl; SM.Audio.setNearFire(!!(isl && isl.book === 2));
      $('enterBtn').classList.toggle('hidden', !isl); if (isl && !SM.State.isDone(isl.id)) SM.Audio.sfx('pop');
      if (isl) { $('stationNo').textContent = isl.localIndex + 1; $('stationTotal').textContent = SM.ISLANDS.filter(function (i) { return i.book === isl.book; }).length; $('stationName').textContent = isl.title; SM.State.setStation(SM.ISLANDS.indexOf(isl));
        guideSay((SM.State.isDone(isl.id) ? '这座岛你已经走过了，想再看一遍也可以。' : SM.GUIDE.nearIsland[isl.localIndex % SM.GUIDE.nearIsland.length]), false); }
    });
    SM.World.onLineChange(function (line) { if (SM.GUIDE.lineChange[line]) guideSay(SM.GUIDE.lineChange[line], true); });
    SM.World.onBookChange(function (b, prev) {
      curBook = b + 1; buildProgress(curBook); updateProgress(); SM.Audio.setTheme(SM.BOOKS[b].theme || 'stars');
      if (prev !== null && prev >= 0) { var intro = SM.GUIDE['book' + curBook]; if (b > prev && intro) guideSay(SM.State.txt(intro) + (curBook === 3 && SM.State.isKid() && SM.GUIDE.kidWarn ? ' ' + SM.GUIDE.kidWarn : ''), true); else if (b < prev) guideSay('回到了' + SM.BOOKS[b].name + '。', false); }
    });
    window.addEventListener('keydown', function (e) { if (e.key === 'Enter' && nearIsl && !SM.Stage.isActive() && $('hud').offsetParent !== null && $('album').classList.contains('hidden') && $('summary').classList.contains('hidden') && $('dir').classList.contains('hidden')) enterIsland(nearIsl); });
  }

  /* ---------- 进出岛 ---------- */
  function enterIsland(isl) {
    SM.Narr.stop(); SM.World.setFrozen(true); $('hud').classList.add('hidden'); SM.Audio.sfx('enter');
    $('fade').classList.add('on');
    setTimeout(function () {
      SM.Stage.open(isl, function (isl2, completed) {
        $('fade').classList.add('on'); SM.Audio.sfx('exit');
        setTimeout(function () {
          $('hud').classList.remove('hidden'); SM.World.setFrozen(false); updateProgress(); $('fade').classList.remove('on');
          var idx = SM.ISLANDS.indexOf(isl2);
          if (completed) {
            if (SM.State.bookDone(isl2.book)) guideSay(isl2.book === 1 ? SM.GUIDE.end : (SM.GUIDE['book' + isl2.book + 'end'] || SM.GUIDE.end), true);
            else if (idx < SM.ISLANDS.length - 1) { guideSay('收好了！继续沿河往前走，下一站是"' + SM.ISLANDS[idx + 1].title + '"。', true); SM.World.travelTo(isl2.u + 0.006 / NB); }
          } else guideSay('没关系，随时可以再进去。', false);
        }, 600);
      });
      setTimeout(function () { $('fade').classList.remove('on'); }, 200);
    }, 650);
  }

  /* ---------- 主循环 ---------- */
  function step(dt) { if (!started) return; SM.Audio.update(dt); if (SM.Stage.isActive()) SM.Stage.update(dt); else SM.World.update(dt); }
  function draw() { if (!started) return; if (SM.Stage.isActive()) SM.Stage.render(renderer); else SM.World.render(); }
  SM.step = step; SM.draw = draw;
  function loop() { requestAnimationFrame(loop); if (document.hidden) return; var now = performance.now(), dt = (now - lastT) / 1000; lastT = now; step(dt); draw(); }
  loop();
  // 页面不可见时 rAF 会停、定时器被节流：按真实流逝时间分多步追赶
  setInterval(function () { if (!document.hidden) return; var now = performance.now(), el = (now - lastT) / 1000; lastT = now; var n = Math.min(90, Math.ceil(el / (1 / 30))); for (var i = 0; i < n; i++) step(el / n); draw(); }, 40);
  window.addEventListener('resize', function () { renderer.setSize(window.innerWidth, window.innerHeight); SM.World.resize && started && SM.World.resize(); SM.Stage.resize(); });
})();
