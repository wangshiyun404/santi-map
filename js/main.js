/* 总控：首页、HUD、主循环、岛的进出、终点 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  // 在 claude.ai Artifact 等沙箱 iframe 中：localStorage/下载/弹窗不可用
  SM.SANDBOX = (function () { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return window.top !== window.self; } catch (e) { return true; } })();
  var renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(window.innerWidth, window.innerHeight);
  SM.Stage.setRenderer(renderer);
  var started = false, nearIsl = null, lastT = performance.now(), guideTimer = null, mode = null;
  var state = SM.State.get();

  /* ---------- 首页 ---------- */
  function showTitle() { $('title').classList.remove('hidden'); $('hud').classList.add('hidden'); SM.Narr.stop(); if (state.mode && SM.State.doneCount() > 0) { $('contRow').classList.remove('hidden'); $('contN').textContent = Math.min(13, SM.State.doneCount() + 1); } }
  document.querySelectorAll('.modebtn').forEach(function (b) { b.onclick = function () { SM.Narr.warm(); SM.State.setMode(b.dataset.mode); start(false); }; });
  $('contBtn').onclick = function () { SM.Narr.warm(); SM.State.setMode(state.mode); start(true); };
  $('resetBtn').onclick = function () { var b = $('resetBtn'); if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = '再点一次确认清空进度'; setTimeout(function () { b.dataset.arm = '0'; b.textContent = '重新开始'; }, 4000); return; } SM.State.reset(); state = SM.State.get(); b.textContent = '已清空'; $('contRow').classList.add('hidden'); document.body.classList.remove('kid'); };
  if (state.mode) { $('contRow').classList.toggle('hidden', SM.State.doneCount() === 0); $('contN').textContent = Math.min(13, SM.State.doneCount() + 1); }
  document.body.classList.toggle('kid', state.mode === 'kid');

  function start(cont) {
    $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
    if (!started) { SM.World.init(renderer); started = true; bindHUD(); }
    buildProgress(); updateProgress();
    // 继续：跳到下一座未完成的岛前
    if (cont) { var next = SM.ISLANDS.find(function (i) { return !SM.State.isDone(i.id); }); SM.World.jumpTo(next ? next.u - 0.03 : 0.95); }
    else SM.World.jumpTo(0.02);
    guideSay(SM.State.txt(SM.GUIDE.intro), true);
    updateMute();
  }

  /* ---------- HUD ---------- */
  function buildProgress() {
    var rows = $('progress').querySelector('.rows'); rows.innerHTML = '';
    ['past', 'now', 'game'].forEach(function (l) {
      var L = SM.LINES[l]; var isl = SM.ISLANDS.filter(function (i) { return i.line === l; });
      var r = document.createElement('div'); r.className = 'row'; r.dataset.line = l;
      r.innerHTML = '<span class="lab">' + L.name + '</span><span class="bar"><i style="background:' + L.css + '"></i></span><span class="dots">' + isl.map(function (i) { return '<b data-id="' + i.id + '" style="color:' + L.css + '" title="' + i.title + '"></b>'; }).join('') + '</span>';
      rows.appendChild(r);
    });
  }
  function updateProgress() {
    ['past', 'now', 'game'].forEach(function (l) { var p = SM.State.lineProgress(l); var row = $('progress').querySelector('[data-line=' + l + ']'); row.querySelector('.bar i').style.width = (p.done / p.total * 100) + '%'; row.querySelectorAll('.dots b').forEach(function (b) { var on = SM.State.isDone(b.dataset.id); b.classList.toggle('on', on); b.style.background = on ? SM.LINES[l].css : ''; }); });
    $('albumBadge').textContent = SM.State.get().cards.length;
    var all = SM.ISLANDS.every(function (i) { return SM.State.isDone(i.id); });
    $('finishBtn').classList.toggle('hidden', !all);
  }
  function guideSay(text, speak) {
    $('guideTxt').textContent = text; $('guide').style.opacity = 1;
    if (speak && !SM.Stage.isActive()) SM.Narr.say(text, null);
    clearTimeout(guideTimer);
  }
  function updateMute() { $('muteBtn').textContent = SM.Narr.isMuted() ? '🔇 旁白关' : '🔊 旁白'; }

  function bindHUD() {
    var hold = function (btn, d) { btn.onmousedown = btn.ontouchstart = function (e) { e.preventDefault(); SM.World.setHold(d); }; btn.onmouseup = btn.onmouseleave = btn.ontouchend = function () { SM.World.setHold(0); }; };
    hold($('fwdBtn'), 1); hold($('backBtn'), -1);
    $('enterBtn').onclick = function () { if (nearIsl) enterIsland(nearIsl); };
    $('finishBtn').onclick = function () { SM.Narr.stop(); SM.Summary.show(); };
    $('sumClose').onclick = function () { $('summary').classList.add('hidden'); };
    $('albumBtn').onclick = function () { SM.State.renderAlbum(); $('album').classList.remove('hidden'); };
    $('albumClose').onclick = function () { $('album').classList.add('hidden'); };
    $('muteBtn').onclick = function () { SM.Narr.setMuted(!SM.Narr.isMuted()); updateMute(); };
    $('modeBtn').onclick = function () { var m = SM.State.isKid() ? 'reader' : 'kid'; SM.State.setMode(m); guideSay(m === 'kid' ? '已切换到小学生模式：字少一点，讲慢一点。' : '已切换到读者模式：旁白更完整，每站附"想一想"。', true); };
    $('homeBtn').onclick = function () { showTitle(); };
    SM.World.onNear(function (isl) {
      if (isl === nearIsl) return; nearIsl = isl;
      $('enterBtn').classList.toggle('hidden', !isl);
      if (isl) { var idx = SM.ISLANDS.indexOf(isl); $('stationNo').textContent = idx + 1; $('stationName').textContent = isl.title; SM.State.setStation(idx);
        guideSay((SM.State.isDone(isl.id) ? '这座岛你已经走过了，想再看一遍也可以。' : SM.GUIDE.nearIsland[idx % SM.GUIDE.nearIsland.length]), false); }
    });
    SM.World.onLineChange(function (line) { guideSay(SM.GUIDE.lineChange[line], true); });
    // 快捷键：回车进入
    window.addEventListener('keydown', function (e) { if (e.key === 'Enter' && nearIsl && !SM.Stage.isActive() && $('hud').offsetParent !== null && $('album').classList.contains('hidden') && $('summary').classList.contains('hidden')) enterIsland(nearIsl); });
  }

  /* ---------- 进出岛 ---------- */
  function enterIsland(isl) {
    SM.Narr.stop(); SM.World.setFrozen(true); $('hud').classList.add('hidden');
    $('fade').classList.add('on');
    setTimeout(function () {
      SM.Stage.open(isl, function (isl2, completed) {
        $('fade').classList.add('on');
        setTimeout(function () {
          $('hud').classList.remove('hidden'); SM.World.setFrozen(false); updateProgress(); $('fade').classList.remove('on');
          var idx = SM.ISLANDS.indexOf(isl2);
          if (completed) {
            var all = SM.ISLANDS.every(function (i) { return SM.State.isDone(i.id); });
            if (all) guideSay(SM.GUIDE.end, true);
            else if (idx < SM.ISLANDS.length - 1) { guideSay('收好了！继续沿河往前走，下一站是"' + SM.ISLANDS[idx + 1].title + '"。', true); SM.World.travelTo(isl2.u + 0.006); }
          } else guideSay('没关系，随时可以再进去。', false);
        }, 600);
      });
      setTimeout(function () { $('fade').classList.remove('on'); }, 200);
    }, 650);
  }

  /* ---------- 主循环 ---------- */
  function step(dt) {
    if (!started) return;
    if (SM.Stage.isActive()) { SM.Stage.update(dt); }
    else { SM.World.update(dt); }
  }
  function draw() { if (!started) return; if (SM.Stage.isActive()) SM.Stage.render(renderer); else SM.World.render(); }
  SM.step = step; SM.draw = draw;
  function loop() { requestAnimationFrame(loop); if (document.hidden) return; var now = performance.now(), dt = (now - lastT) / 1000; lastT = now; step(dt); draw(); }
  loop();
  // 页面不可见时 rAF 会停、定时器被节流：按真实流逝时间分多步追赶，保证旁白/动画流程不卡住
  setInterval(function () { if (!document.hidden) return; var now = performance.now(), el = (now - lastT) / 1000; lastT = now; var n = Math.min(90, Math.ceil(el / (1 / 30))); for (var i = 0; i < n; i++) step(el / n); draw(); }, 40);
  window.addEventListener('resize', function () { renderer.setSize(window.innerWidth, window.innerHeight); SM.World.resize && started && SM.World.resize(); SM.Stage.resize(); });
})();
