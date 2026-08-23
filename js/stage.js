/* 岛内舞台引擎：独立场景 + 旁白/互动/收卡/想一想 的流程 */
SM.Stage = (function () {
  var renderer, scene, camera, active = null, gen = 0, onClose = null, clock = new THREE.Clock();
  var $ = function (id) { return document.getElementById(id); };
  var ABORT = { abort: true };

  /* ---- 通用几何 ---- */
  var H = {
    mat: function (c, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {})); },
    basic: function (c, o) { return new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {})); },
    box: function (w, h, d, c, x, y, z, o) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), H.mat(c, o)); m.position.set(x || 0, y || 0, z || 0); return m; },
    cyl: function (rt, rb, h, c, x, y, z, seg, o) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), H.mat(c, o)); m.position.set(x || 0, y || 0, z || 0); return m; },
    cone: function (r, h, c, x, y, z, seg) { return H.cyl(0, r, h, c, x, y, z, seg || 6); },
    sph: function (r, c, x, y, z, emis) { var m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), emis ? H.basic(c) : H.mat(c)); m.position.set(x || 0, y || 0, z || 0); return m; },
    glow: function (r, c, x, y, z, op) { var m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), H.basic(c, { transparent: true, opacity: (op === undefined ? .3 : op), blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(x, y, z); return m; },
    plane: function (w, h, c, x, y, z, o) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), H.mat(c, Object.assign({ side: THREE.DoubleSide }, o || {}))); m.rotation.x = -Math.PI / 2; m.position.set(x || 0, y || 0, z || 0); return m; },
    dish: function (s) { var d = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.5, .06), new THREE.Vector2(1, .25), new THREE.Vector2(1.5, .6), new THREE.Vector2(1.9, 1.05)], 20), H.mat(0xe2e6ee, { side: THREE.DoubleSide })); var rim = new THREE.Mesh(new THREE.TorusGeometry(1.9, .07, 8, 28), H.mat(0x9aa3b4)); rim.rotation.x = Math.PI / 2; rim.position.y = 1.05; d.add(rim); d.scale.setScalar(s || 1); return d; },
    ground: function (c, size) { var g = H.plane(size || 200, size || 200, c, 0, 0, 0); return g; },
    stars: function (n, spread, y0) { var p = new Float32Array(n * 3); for (var i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * spread; p[i * 3 + 1] = (y0 || 20) + Math.random() * spread * .5; p[i * 3 + 2] = (Math.random() - .5) * spread; } var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: .5, transparent: true, opacity: .85 })); },
    label: function (text, color, scale, font) { var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; var g = cv.getContext('2d'); g.font = (font || 'bold 90px') + ' "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 14; g.fillStyle = color; g.fillText(text, 512, 128); var tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set((scale || 1) * 8, (scale || 1) * 2, 1); return sp; },
    human: function (c, x, z, scale) { var g = new THREE.Group(); var s = scale || 1; g.add(H.cyl(.22 * s, .28 * s, .9 * s, c, 0, .45 * s, 0)); g.add(H.sph(.2 * s, 0xf1d9c0, 0, 1.1 * s, 0)); g.position.set(x || 0, 0, z || 0); return g; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    ease: function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  };

  /* ---- 补间：在 update 里推进 ---- */
  var tweens = [];
  function tween(dur, fn, easeFn) { return new Promise(function (res) { tweens.push({ t: 0, dur: dur, fn: fn, ease: easeFn || H.ease, res: res }); }); }
  function stepTweens(dt) {
    for (var i = tweens.length - 1; i >= 0; i--) { var tw = tweens[i]; tw.t += dt; var k = Math.min(1, tw.t / tw.dur); tw.fn(tw.ease(k)); if (k >= 1) { tweens.splice(i, 1); tw.res(); } }
  }

  /* ---- 流程 API ---- */
  function guard(g) { if (g !== gen) throw ABORT; }
  function wait(ms) { var g = gen; return new Promise(function (res, rej) { setTimeout(function () { if (g !== gen) rej(ABORT); else res(); }, ms); }); }

  function say(text, opt) {
    var g = gen; opt = opt || {};
    return new Promise(function (res, rej) {
      var box = $('subtitle'); box.classList.remove('hidden'); $('subTxt').textContent = text; $('subL').textContent = opt.label || '旁白';
      var done = false, holdT = null;
      function finish() { if (done) return; done = true; if (holdT) clearTimeout(holdT); if (g !== gen) { rej(ABORT); return; } SM.Narr.stop(); $('nextBtn').onclick = null; $('replayBtn').onclick = null; res(); }
      var onEnd = function () { if (holdT) clearTimeout(holdT); holdT = setTimeout(finish, opt.hold || 900); };
      $('nextBtn').onclick = finish;
      $('replayBtn').onclick = function () { if (done) return; if (holdT) { clearTimeout(holdT); holdT = null; } SM.Narr.say(text, onEnd); };
      SM.Narr.say(text, onEnd);
    });
  }
  function hideSub() { $('subtitle').classList.add('hidden'); }

  /* 互动：setup(els, finish) 由各岛自定义；finish(result) 结束 */
  function interact(prompt, setup) {
    var g = gen;
    return new Promise(function (res, rej) {
      var box = $('interact'); box.classList.remove('hidden');
      box.innerHTML = '<div class="prompt" id="intPrompt"></div><div class="body" id="intBody"></div><div class="note" id="intNote"></div><div class="opts" id="intOpts"></div>';
      var els = { prompt: box.children[0], body: box.children[1], note: box.children[2], opts: box.children[3] };
      els.prompt.textContent = prompt;
      var done = false;
      function finish(result) { if (done) return; done = true; if (g !== gen) { rej(ABORT); return; } box.classList.add('hidden'); res(result); }
      setup(els, finish);
    });
  }
  function btn(text, primary, cls) { var b = document.createElement('button'); b.className = 'bigbtn' + (primary ? ' primary' : '') + (cls ? ' ' + cls : ''); b.textContent = text; return b; }

  function showCards(ids) {
    var g = gen;
    return new Promise(function (res, rej) {
      var pop = $('cardPop'); pop.classList.remove('hidden'); pop.innerHTML = '';
      ids.forEach(function (id, i) { var d = document.createElement('div'); d.innerHTML = SM.State.cardHTML(id, false); var c = d.firstChild; c.style.animationDelay = (i * .15) + 's'; pop.appendChild(c); });
      var okw = document.createElement('div'); okw.className = 'ok'; var ok = btn('收进地图册 ▶', true); okw.appendChild(ok); pop.appendChild(okw); if (SM.Audio) SM.Audio.sfx('card');
      SM.Narr.say(ids.length > 1 ? '你收到了' + ids.length + '张线索卡。' : '你收到了一张线索卡。', null);
      ok.onclick = function () { pop.classList.add('hidden'); if (g !== gen) rej(ABORT); else res(); };
    });
  }
  function think(isl) {
    var g = gen;
    return new Promise(function (res, rej) {
      var box = $('thinkBox'); box.classList.remove('hidden'); $('thinkQ').textContent = isl.think; if (SM.Audio) SM.Audio.sfx('chime');
      $('thinkRef').textContent = SM.State.isKid() ? '' : isl.ref; $('thinkAns').value = SM.State.get().notes[isl.id] || '';
      $('thinkAns').style.display = SM.State.isKid() ? 'none' : '';
      function fin(note) { box.classList.add('hidden'); if (g !== gen) rej(ABORT); else res(note); }
      $('thinkSkip').onclick = function () { fin(null); };
      $('thinkOk').onclick = function () { fin($('thinkAns').value.trim() || null); };
    });
  }

  /* ---- 打开 / 关闭 ---- */
  function open(isl, cb) {
    onClose = cb; gen++; var g = gen; active = isl; tweens = [];
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070f);
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000); camera.position.set(0, 6, 16); camera.lookAt(0, 2, 0);
    var idx = SM.ISLANDS.filter(function (i) { return i.book === isl.book; }).indexOf(isl);
    $('stN').textContent = (SM.BOOKS && SM.BOOKS.length > 1 ? SM.BOOKS[isl.book - 1].short + ' · ' : '') + (idx + 1); $('stTitle').textContent = isl.title; $('stYear').textContent = isl.year + ' · ' + SM.LINES[isl.line].name; $('stDot').style.background = SM.LINES[isl.line].css;
    $('stageUI').classList.remove('hidden'); hideSub(); $('interact').classList.add('hidden'); $('cardPop').classList.add('hidden'); $('thinkBox').classList.add('hidden');
    var api = { scene: scene, camera: camera, H: H, say: say, hideSub: hideSub, interact: interact, btn: btn, wait: wait, tween: tween, isKid: SM.State.isKid, txt: SM.State.txt, island: isl, kid: SM.State.isKid(), sfx: function (n) { if (g === gen && SM.Audio) SM.Audio.sfx(n); } };
    var builder = SM.Islands[isl.id]; var inst = builder(api); active.inst = inst;
    $('exitBtn').onclick = function () { close(false); };
    var mb = $('stMute'); if (mb) { mb.textContent = SM.Narr.isMuted() ? '🔇 旁白关' : '🔊 旁白'; mb.onclick = function () { SM.Narr.setMuted(!SM.Narr.isMuted()); mb.textContent = SM.Narr.isMuted() ? '🔇 旁白关' : '🔊 旁白'; if (SM.updateMute) SM.updateMute(); }; }
    (async function () {
      try {
        await inst.run();
        guard(g); hideSub();
        var choice = inst.result;
        var fresh = SM.State.addCards(isl.cards);
        await showCards(isl.cards);
        var note = await think(isl);
        SM.State.markDone(isl.id, { choice: choice, note: note });
        close(true);
      } catch (e) { if (e !== ABORT) { console.error(e); close(false); } }
    })();
  }
  function close(completed) {
    gen++; tweens = []; SM.Narr.stop(); $('stageUI').classList.add('hidden'); hideSub(); $('interact').classList.add('hidden');
    var cb = onClose; onClose = null; var isl = active; active = null;
    if (scene) { scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); scene = null; }
    if (cb) cb(isl, completed);
  }
  function update(dt) { if (!active) return; stepTweens(dt); if (active.inst && active.inst.update) active.inst.update(dt, clock.getElapsedTime()); }
  function render(r) { if (scene) r.render(scene, camera); }
  function resize() { if (camera) { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); } }

  return { open: open, close: close, update: update, render: render, resize: resize, isActive: function () { return !!active; }, H: H, setRenderer: function (r) { renderer = r; } };
})();
