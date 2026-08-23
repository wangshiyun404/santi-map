/* 13 座岛的舞台场景与互动。每个 builder(api) 返回 { update(dt,t), run: async, result } */
SM.Islands = {};
(function () {
  var PI = Math.PI;
  function skyColor(api, hex, dur) { var from = api.scene.background.clone(), to = new THREE.Color(hex); return api.tween(dur || 2, function (k) { api.scene.background.copy(from).lerp(to, k); }); }
  function lights(api, amb, dir, dirPos) {
    var a = new THREE.HemisphereLight(0xbfd0ff, 0x2a2030, amb || .8); api.scene.add(a);
    var d = new THREE.DirectionalLight(0xffffff, dir || .7); d.position.set.apply(d.position, dirPos || [10, 20, 10]); api.scene.add(d); return { amb: a, dir: d };
  }
  function rangeInput(min, max, val) { var r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.value = val; return r; }

  /* 1 清华园 */
  SM.Islands.qinghua = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x3a2f4a); S.fog = new THREE.Fog(0x3a2f4a, 30, 90);
    var L = lights(api, .7, .5, [-10, 15, 5]);
    S.add(H.ground(0x55504a, 200));
    S.add(H.box(14, 1.2, 6, 0x6b5a4a, 0, .6, -6)); // 台子
    S.add(H.box(16, 2.2, .2, 0x8a2a2a, 0, 3.4, -9)); // 横幅
    [-6, 6].forEach(function (x) { S.add(H.cyl(.08, .08, 4.6, 0x333, x, 2.3, -9)); });
    // 台下人群（背影、暗色）
    for (var i = 0; i < 60; i++) { var c = [0x3b3f4a, 0x4a4438, 0x333a44][i % 3]; var gx = (Math.random() - .5) * 22, gz = -1.5 + Math.random() * 8; if (Math.abs(gx) < 1.6 && gz < 3) gx += 3; S.add(H.human(c, gx, gz, .9 + Math.random() * .2)); }
    var girl = H.human(0x7a8aa8, -2.8, 0, .85); S.add(girl);
    // 台上：讲台与一个倒下的影子（象征：只用一副眼镜）
    S.add(H.box(1.2, 1.2, .8, 0x4a3a30, 3, 1.8, -6));
    var glasses = new THREE.Group();
    var rm = new THREE.Mesh(new THREE.TorusGeometry(.35, .05, 8, 20), H.basic(0xdddddd)); rm.rotation.x = PI / 2; rm.position.x = -.42; glasses.add(rm);
    var rm2 = rm.clone(); rm2.position.x = .42; glasses.add(rm2);
    var bridge = H.box(.25, .05, .05, 0xdddddd, 0, 0, 0); glasses.add(bridge);
    var lens = new THREE.Mesh(new THREE.CircleGeometry(.33, 12), H.basic(0xbfd8ff, { transparent: true, opacity: .35, side: THREE.DoubleSide })); lens.rotation.x = -PI / 2; lens.position.x = .42; glasses.add(lens);
    glasses.position.set(0, 1.25, -4.2); glasses.rotation.z = .3; S.add(glasses);
    var gl = H.glow(.9, 0xbfd8ff, 0, 1.25, -4.2, .25); S.add(gl);
    api.camera.position.set(0, 4.5, 15); api.camera.lookAt(0, 1.5, -4);
    return {
      update: function (dt, t) { gl.material.opacity = .2 + .15 * Math.sin(t * 3); api.camera.position.z = Math.max(10, 15 - t * .25); api.camera.lookAt(0, 1.5, -4); },
      run: async function () {
        skyColor(api, 0x1a1522, 10);
        await api.say(api.txt(api.island.say));
        api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); els.opts.appendChild(b);
          b.onclick = function () {
            b.disabled = true;
            api.tween(1.6, function (k) { glasses.position.y = 1.25 + k * 2.2; glasses.position.z = -4.2 + k * 6; glasses.rotation.z = .3 - k * .3; glasses.rotation.y = k * 2; gl.position.copy(glasses.position); }).then(function () {
              els.note.textContent = api.kid ? '这副眼镜，叶文洁记了一辈子。' : '叶文洁在台下捡起了父亲的眼镜。那一天，她的世界碎了。';
              setTimeout(function () { finish(true); }, 2200);
            });
          };
        });
      }
    };
  };

  /* 2 红岸基地：转动天线对准太阳 */
  SM.Islands.hongan = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x101a33); S.fog = new THREE.Fog(0x101a33, 40, 140);
    lights(api, .9, .5, [-20, 30, 10]);
    S.add(H.stars(600, 260, 10));
    S.add(H.cone(40, 30, 0x3a4a5c, 0, 0, -30, 7)); S.add(H.cone(26, 18, 0x2e3c4c, -45, -2, -40, 7)); S.add(H.cone(30, 22, 0x2e3c4c, 48, -3, -50, 7));
    S.add(H.cyl(9, 11, 2, 0x4a5668, 0, 15.5, -30, 10)); // 峰顶平台
    S.add(H.box(4, 2, 3, 0x6b7688, 4, 17.5, -28)); S.add(H.box(3, 1.6, 2.4, 0x5a6478, -4.5, 17.3, -31));
    var pole = H.cyl(.25, .35, 4, 0xaaaaaa, 0, 18.5, -30); S.add(pole);
    var dishG = new THREE.Group(); dishG.position.set(0, 20.5, -30); var dish = H.dish(1.7); dish.rotation.x = -0.35; dishG.add(dish);
    var feed = H.cyl(.05, .05, 2.2, 0xcccccc, 0, 1.2, -0.4); feed.rotation.x = -0.35; dishG.add(feed); S.add(dishG);
    var sunAz = .25; // 太阳方位角（弧度）
    var sun = H.sph(2.6, 0xffb347, Math.sin(sunAz) * 90, 32, -Math.cos(sunAz) * 90 - 30, true); S.add(sun); S.add(H.glow(4.5, 0xffb347, sun.position.x, sun.position.y, sun.position.z, .3));
    var moon = H.sph(1.6, 0xdfe6f5, -50, 40, -60, true); S.add(moon);
    var ringGlow = H.glow(2.6, 0xffc94a, 0, 21, -30, 0); S.add(ringGlow);
    api.camera.position.set(14, 29, -4); api.camera.lookAt(0, 21, -34);
    var aimed = false;
    return {
      update: function (dt, t) { if (aimed) ringGlow.material.opacity = .25 + .15 * Math.sin(t * 5); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var r = rangeInput(-100, 100, -80); els.body.appendChild(r); var b = api.btn(api.island.interact.btn, true); b.disabled = true; els.opts.appendChild(b);
          els.note.textContent = '左右拖动，天线会跟着转。';
          r.oninput = function () { var az = (r.value / 100) * 1.3; dishG.rotation.y = -az; var d = Math.abs(az - sunAz); if (d < .1) { aimed = true; b.disabled = false; els.note.textContent = '对准太阳了！天线在发光。'; } else { aimed = false; ringGlow.material.opacity = 0; b.disabled = true; els.note.textContent = d < .3 ? '很接近了……' : '继续找太阳的方向。'; } };
          b.onclick = function () { finish(true); };
        });
        await api.say(api.kid ? '这口大锅，不只是在听宇宙，也能对着宇宙说话。' : '这座天线既能接收，也能发射。叶文洁很快会发现，它还有一个谁也没想到的用法。');
      }
    };
  };

  /* 3 发射：按下发射键 */
  SM.Islands.launch = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x6aa0d8); S.fog = new THREE.Fog(0x6aa0d8, 60, 180);
    lights(api, 1.1, .9, [30, 40, 10]);
    S.add(H.cone(40, 30, 0x4a6a4a, 0, 0, -30, 7)); S.add(H.cone(26, 18, 0x3c5a3c, -45, -2, -40, 7)); S.add(H.cone(30, 22, 0x3c5a3c, 48, -3, -50, 7));
    S.add(H.cyl(9, 11, 2, 0x6a7688, 0, 15.5, -30, 10)); S.add(H.box(4, 2, 3, 0x8b96a8, 4, 17.5, -28)); S.add(H.cyl(.25, .35, 4, 0xaaaaaa, 0, 18.5, -30));
    var dishG = new THREE.Group(); dishG.position.set(0, 20.5, -30); var dish = H.dish(1.7); dish.rotation.x = -0.45; dishG.add(dish); dishG.rotation.y = -.3; S.add(dishG);
    var sunPos = new THREE.Vector3(22, 52, -120); var sun = H.sph(6, 0xfff1b0, sunPos.x, sunPos.y, sunPos.z, true); S.add(sun); var sunGlow = H.glow(9, 0xffe8a0, sunPos.x, sunPos.y, sunPos.z, .22); S.add(sunGlow);
    var waves = []; for (var i = 0; i < 6; i++) { var w = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 8, 32), H.basic(0x7fe0ff, { transparent: true, opacity: 0 })); w.position.copy(dishG.position); w.lookAt(sunPos); S.add(w); waves.push(w); }
    var rays = new THREE.Group(); for (var k = 0; k < 24; k++) { var ray = H.box(.3, .3, 40, 0xfff1b0, 0, 0, 20); ray.material = H.basic(0xfff1b0, { transparent: true, opacity: 0 }); var gg = new THREE.Group(); gg.add(ray); gg.rotation.set(Math.random() * PI * 2, Math.random() * PI * 2, 0); rays.add(gg); } rays.position.copy(sunPos); S.add(rays);
    api.camera.position.set(16, 28, -2); api.camera.lookAt(4, 27, -60);
    for (var ci = 0; ci < 9; ci++) { var cl = new THREE.Group(); for (var cj = 0; cj < 4; cj++) { cl.add(H.sph(3 + Math.random() * 3, 0xffffff, cj * 4 - 6, Math.random(), (Math.random() - .5) * 3)); } cl.scale.y = .45; cl.position.set((Math.random() - .5) * 220, 30 + Math.random() * 18, -70 - Math.random() * 90); S.add(cl); }
    var fired = false, ft = 0;
    return {
      update: function (dt, t) { if (fired) { ft += dt; waves.forEach(function (w, i) { var p = ((ft * .35 + i * .16) % 1); w.position.lerpVectors(dishG.position, sunPos, p); w.scale.setScalar(1 + p * 10); w.material.opacity = p < .9 ? .9 - p * .8 : 0; }); if (ft > 2.5) { rays.rotation.z += dt * .3; rays.children.forEach(function (g) { g.children[0].material.opacity = Math.min(.7, (ft - 2.5) * .4); }); sunGlow.scale.setScalar(1 + Math.min(1.2, (ft - 2.5) * .5)); } } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); b.style.fontSize = '28px'; b.style.padding = '20px 60px'; els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; fired = true; api.sfx('sweep'); els.note.textContent = '电波飞向太阳……'; setTimeout(function () { els.note.textContent = '太阳把它放大了亿万倍，送向整个银河系。'; }, 2600); setTimeout(function () { finish(true); }, 5200); };
        });
        await api.say(api.kid ? '信号飞走了。叶文洁不知道，八年后，会有人回答她。' : '信号以光速离开太阳系。四年后它抵达最近的恒星系；又过了四年，回音到达红岸。');
      }
    };
  };

  /* 4 倒计时：城市夜景 + 相机 */
  SM.Islands.countdown = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x0a0e1f); S.fog = new THREE.Fog(0x0a0e1f, 60, 200);
    lights(api, .5, .3, [10, 30, 10]);
    S.add(H.ground(0x0c1020, 400));
    var im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), H.mat(0x26305a), 160); var o = new THREE.Object3D();
    var winPos = [];
    for (var i = 0; i < 160; i++) { var x = (Math.random() - .5) * 160, z = -20 - Math.random() * 140, h = 6 + Math.random() * 30, w = 4 + Math.random() * 5; o.position.set(x, h / 2, z); o.scale.set(w, h, w); o.updateMatrix(); im.setMatrixAt(i, o.matrix); for (var j = 0; j < 12; j++) { winPos.push(x + (Math.random() - .5) * w * 1.02, Math.random() * h, z + w / 2 + .1); } }
    S.add(im);
    var wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(winPos, 3)); S.add(new THREE.Points(wg, new THREE.PointsMaterial({ color: 0xffe2a0, size: .5, transparent: true, opacity: .9 })));
    S.add(H.stars(400, 300, 40));
    var wang = H.human(0x8a95b8, -1.5, -2, 1); S.add(wang); var shi = H.human(0x5a6070, 1.2, -1.5, 1.1); S.add(shi);
    var cam3 = H.box(.5, .35, .4, 0x222, -1.5, 1.2, -2.4); S.add(cam3);
    var numLabel = H.label('1194:16:37', '#ff4b4b', 2.2, 'bold 110px'); numLabel.position.set(0, 14, -40); numLabel.material.opacity = 0; S.add(numLabel);
    api.camera.position.set(0, 5, 10); api.camera.lookAt(0, 9, -40);
    var cnt = 1194 * 3600 + 16 * 60 + 37, showing = false;
    function fmt(s) { var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0'); }
    return {
      update: function (dt, t) { if (showing) { numLabel.material.opacity = .6 + .4 * Math.sin(t * 6); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var cam = document.createElement('div'); cam.className = 'camera'; cam.innerHTML = '<div class="photo"></div><div class="num"></div><span style="color:#666">📷 取景器</span>'; els.body.appendChild(cam);
          var photo = cam.querySelector('.photo'), num = cam.querySelector('.num'); var shots = 0;
          var b = api.btn(api.island.interact.btn, true); els.opts.appendChild(b); var done = api.btn('继续 ▶', false); done.disabled = true; els.opts.appendChild(done);
          b.onclick = function () { shots++; cnt -= 5 * 60 + 13; api.sfx('tick'); photo.classList.add('on'); num.textContent = fmt(cnt); num.classList.remove('on'); void num.offsetWidth; num.classList.add('on'); showing = true;
            els.note.textContent = shots === 1 ? '照片上有一串数字……' : shots === 2 ? '又拍一张，数字变小了——它在倒数！' : '不管拍什么，数字都在。再过几天，它会出现在汪淼的眼睛里。';
            if (shots >= 2) done.disabled = false; };
          done.onclick = function () { finish(shots); };
        });
        await api.say(api.kid ? '倒计时的意思是：停下你的研究。汪淼不知道，这是来自四光年外的威胁。' : '倒计时的条件只有一个：停止纳米材料研究。汪淼此时还不知道，这个数字来自四光年之外。');
      }
    };
  };

  /* 5 宇宙闪烁：数闪烁次数 */
  SM.Islands.flicker = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x02030a);
    lights(api, .3, .2, [0, 10, 10]);
    S.add(H.ground(0x0a0d18, 300));
    S.add(H.cyl(3, 3.4, 3, 0x3a4050, -10, 1.5, -20, 12)); S.add(H.sph(3.2, 0x4a5060, -10, 3.2, -20));
    var starPts = H.stars(2500, 500, 5); S.add(starPts);
    var big = []; for (var i = 0; i < 40; i++) { var s = H.sph(.35 + Math.random() * .3, 0xffffff, (Math.random() - .5) * 160, 20 + Math.random() * 60, -60 - Math.random() * 80, true); S.add(s); big.push(s); }
    S.add(H.human(0x8a95b8, 0, 2, 1)); S.add(H.human(0x5a6070, 1.8, 2.5, 1));
    api.camera.position.set(0, 3, 10); api.camera.lookAt(0, 30, -80);
    var target = api.kid ? 5 : 7, seq = [], running = false, tStart = 0, nowT = 0;
    function setBright(on) { starPts.material.opacity = on ? .85 : .06; big.forEach(function (b) { b.visible = on; }); }
    return {
      update: function (dt, t) { nowT = t; if (running) { var e = t - tStart; var on = true; for (var i = 0; i < seq.length; i++) { if (e > seq[i] && e < seq[i] + .35) on = false; } setBright(on); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var result = 0;
        await api.interact(api.island.interact.prompt, function (els, finish) {
          els.note.textContent = '准备好了就点"开始观测"，然后数一数。';
          var go = api.btn('开始观测', true); els.opts.appendChild(go);
          go.onclick = function () {
            go.remove(); seq = []; var acc = 1; for (var i = 0; i < target; i++) { acc += .8 + Math.random() * .9; seq.push(acc); }
            running = true; tStart = nowT; els.note.textContent = '看天上……';
            setTimeout(function () {
              running = false; setBright(true); els.note.textContent = '闪完了。一共闪了几次？';
              [target - 1, target, target + 1].sort(function () { return Math.random() - .5; }).forEach(function (n) { var b = api.btn(n + ' 次'); els.opts.appendChild(b); b.onclick = function () { result = n; els.opts.innerHTML = ''; els.note.textContent = (n === target ? '答对了！一共 ' + target + ' 次。' : '其实是 ' + target + ' 次——没关系，重要的是：') + '宇宙真的在按节奏闪烁，像有人在操纵它。'; var c = api.btn('继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(n); }; }; });
            }, (acc + 1.5) * 1000);
          };
        });
        this.result = result;
        await api.say(api.kid ? '从这一天起，汪淼知道：有一个看不见的力量在盯着地球。' : '三体世界用智子让宇宙背景辐射"闪烁"，目的只有一个：让人类科学家相信物理学已死。');
      }
    };
  };

  /* 6 乱纪元：三回合决策 */
  SM.Islands.eras = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0xd8b070); S.fog = new THREE.Fog(0xd8b070, 60, 220);
    var L = lights(api, .9, .9, [20, 30, 10]);
    S.add(H.ground(0xb8915a, 400));
    for (var i = 0; i < 30; i++) { S.add(H.cone(2 + Math.random() * 5, 3 + Math.random() * 9, 0x9a7a4a, (Math.random() - .5) * 200, 0, -30 - Math.random() * 150, 5)); }
    // 村落
    for (var k = 0; k < 12; k++) { S.add(H.box(2, 1.6, 2, 0x7a5a3a, -14 + (k % 6) * 5, .8, -10 - Math.floor(k / 6) * 5)); S.add(H.cone(1.7, 1.2, 0x5a3a2a, -14 + (k % 6) * 5, 2.2, -10 - Math.floor(k / 6) * 5, 4)); }
    var people = []; for (var p = 0; p < 14; p++) { var hm = H.human(0xc9a070, -12 + Math.random() * 24, 4 + Math.random() * 5, .9); S.add(hm); people.push(hm); }
    var suns = [H.sph(5, 0xffd070, 60, 45, -140, true), H.sph(3.5, 0xffd070, -120, 70, -180, true), H.sph(3, 0xffd070, 140, 90, -200, true)]; suns.forEach(function (s) { S.add(s); });
    var glows = suns.map(function (s) { var g = H.glow(s.geometry.parameters.radius * 2.2, 0xffd070, s.position.x, s.position.y, s.position.z, .3); S.add(g); return g; });
    var flyStars = [H.sph(.5, 0xffffff, -40, 60, -150, true), H.sph(.5, 0xffffff, 30, 75, -160, true), H.sph(.5, 0xffffff, 90, 55, -150, true)]; flyStars.forEach(function (s) { s.visible = false; S.add(s); });
    api.camera.position.set(0, 6, 24); api.camera.lookAt(0, 6, -60);
    var civ = 137; var phases = [
      { sky: '天边出现一颗"飞星"——一颗特别小、跑得很快的星。老人们说，这是乱纪元要来的征兆。', disaster: 'cold', right: 'dehy', kidSky: '天边出现了一颗飞星（小小的亮点）。老人说：乱纪元要来了。' },
      { sky: '太阳已经规规矩矩升落了很久，田里的庄稼长得很好。', disaster: 'none', right: 'grow', kidSky: '太阳每天按时升起落下，庄稼长得很好。' },
      { sky: '三颗飞星同时出现在天上！这在历史上只发生过一次……', disaster: 'hot', right: 'dehy', kidSky: '天上同时出现了三颗飞星！从来没有过这样的事。' }
    ];
    function setPeople(dehy) { people.forEach(function (h) { h.scale.y = dehy ? .08 : 1; h.position.y = 0; }); }
    function skyTo(hex, dur) { return skyColor(api, hex, dur); }
    return {
      update: function (dt, t) { suns[0].position.x = 60 + Math.sin(t * .2) * 10; },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var choices = [];
        for (var r = 0; r < 3; r++) {
          var ph = phases[r];
          flyStars.forEach(function (s, i) { s.visible = (r === 0 && i === 1) || r === 2; });
          var choice = await api.interact('第 ' + (r + 1) + ' 回合 · 文明第 ' + civ + ' 号', function (els, finish) {
            var bd = document.createElement('div'); bd.className = 'eraBoard'; bd.innerHTML = '<div class="sky">☀ ' + (api.kid ? ph.kidSky : ph.sky) + '</div>'; els.body.appendChild(bd);
            var b1 = api.btn('全民脱水', true), b2 = api.btn('继续发展'); els.opts.appendChild(b1); els.opts.appendChild(b2);
            b1.onclick = function () { finish('dehy'); }; b2.onclick = function () { finish('grow'); };
          });
          choices.push(choice);
          setPeople(choice === 'dehy');
          var msg = '';
          if (ph.disaster === 'cold') { api.sfx('softboom'); await skyTo(0x1a2a4a, 2); S.fog.color.set(0x1a2a4a); L.dir.intensity = .2; msg = choice === 'dehy' ? '极寒降临，大地冻成了冰。脱水的人们卷在仓库里，安然无恙。你判断对了！' : '极寒降临，大地冻成了冰。没有脱水的人们都冻住了……这一号文明毁灭了。'; if (choice !== 'dehy') civ++; }
          else if (ph.disaster === 'hot') { api.sfx('boom'); await skyTo(0xfff1d0, 2); S.fog.color.set(0xfff1d0); L.dir.intensity = 2; suns.forEach(function (s, i) { s.position.set(-40 + i * 40, 60, -120); }); glows.forEach(function (g, i) { g.position.copy(suns[i].position); g.scale.setScalar(2); }); msg = choice === 'dehy' ? '三日凌空！烈焰烤焦了大地。但脱水的人们躲在深深的地下仓库里，文明保住了！' : '三日凌空！烈焰烤焦了一切……这一号文明在烈焰中毁灭。'; if (choice !== 'dehy') civ++; }
          else { msg = choice === 'dehy' ? '这其实是恒纪元——你脱水了，错过了一段发展的好时光。没关系，下一回合再看。' : '你判断对了！恒纪元里人们盖了新房子，文明前进了一步。'; }
          await api.say(msg, { label: '结果' });
          if (ph.disaster !== 'none') { await skyTo(0xd8b070, 1.5); S.fog.color.set(0xd8b070); L.dir.intensity = .9; suns.forEach(function (s, i) { s.position.set([60, -120, 140][i], [45, 70, 90][i], [-140, -180, -200][i]); }); glows.forEach(function (g, i) { g.position.copy(suns[i].position); g.scale.setScalar(1); }); }
          setPeople(false); api.hideSub();
        }
        this.result = choices.join(',');
        await api.say(api.kid ? '三体世界就是这样：永远猜不准明天。每一局游戏的结尾，都写着"文明在某次灾难中毁灭"。' : '这就是三体文明的常态：在两百多次轮回里，每一个文明都毁灭于某次不可预测的天象。游戏的结尾总是同一句话——文明的种子仍在，它将重新启动。');
      }
    };
  };

  /* 7 人列计算机：与门 */
  SM.Islands.computer = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0xcfd6e6); S.fog = new THREE.Fog(0xcfd6e6, 80, 300);
    lights(api, 1, .8, [20, 40, 10]);
    S.add(H.ground(0x9a8a6a, 600));
    var n = 70, im = new THREE.InstancedMesh(new THREE.BoxGeometry(.6, 1.6, .6), H.mat(0xe6e6e6), n * n); var o = new THREE.Object3D(), col = new THREE.Color();
    for (var x = 0; x < n; x++) for (var z = 0; z < n; z++) { var i = x * n + z; o.position.set((x - n / 2) * 1.4, .8, -(z) * 1.4 - 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(((x * 3 + z * 5) % 7 < 2) ? 0x1a1a1a : 0xf2f2f2)); }
    S.add(im);
    var sol = [0, 1, 2].map(function (i) { var g = H.human(0x8a4a3a, (i - 1) * 3, 4, 1.3); var flag = H.plane(1.1, .8, 0xf2f2f2, .5, 2.2, 0); flag.rotation.set(0, 0, 0); g.add(H.cyl(.04, .04, 2.4, 0x6a4a2a, .4, 1.6, 0)); g.add(flag); g.userData.flag = flag; S.add(g); return g; });
    var t1 = H.label('输入 A', '#333', .5, 'bold 70px'); t1.position.set(-3, 3.6, 4); S.add(t1); var t2 = H.label('输入 B', '#333', .5, 'bold 70px'); t2.position.set(0, 3.6, 4); S.add(t2); var t3 = H.label('输出（与门）', '#333', .6, 'bold 70px'); t3.position.set(3, 3.6, 4); S.add(t3);
    api.camera.position.set(0, 60, 70); api.camera.lookAt(0, 0, -40);
    var camT = 0, zoom = false;
    return {
      update: function (dt, t) { if (zoom && camT < 1) { camT = Math.min(1, camT + dt * .35); var k = H.ease(camT); api.camera.position.set(0, 60 - k * 56, 70 - k * 58); api.camera.lookAt(0, 1.5 * k, -40 + k * 44); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        zoom = true; await api.wait(2500);
        var a = 0, b = 0, flips = 0;
        function setFlag(g, v) { g.userData.flag.material.color.set(v ? 0xf2f2f2 : 0x111111); }
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var gate = document.createElement('div'); gate.className = 'gate';
          gate.innerHTML = '<div class="sol"><div class="flag black" id="fA"></div><small>输入 A<br>点我切换</small></div><div class="op">∧</div><div class="sol"><div class="flag black" id="fB"></div><small>输入 B<br>点我切换</small></div><div class="op">=</div><div class="sol"><div class="flag black" id="fO"></div><small>输出<br>（两个都白才白）</small></div>';
          els.body.appendChild(gate);
          var fA = gate.querySelector('#fA'), fB = gate.querySelector('#fB'), fO = gate.querySelector('#fO');
          var ok = api.btn(api.island.interact.btn, true); ok.disabled = true; els.opts.appendChild(ok);
          function refresh() { var out = a & b; fA.className = 'flag ' + (a ? 'white' : 'black'); fB.className = 'flag ' + (b ? 'white' : 'black'); fO.className = 'flag ' + (out ? 'white' : 'black'); setFlag(sol[0], a); setFlag(sol[1], b); setFlag(sol[2], out); els.note.textContent = '黑旗 = 0，白旗 = 1。现在：' + a + ' 与 ' + b + ' = ' + out + (out ? ' ——两个都是1，输出才是1！' : ''); if (flips >= 3) ok.disabled = false; }
          fA.onclick = function () { a ^= 1; flips++; refresh(); }; fB.onclick = function () { b ^= 1; flips++; refresh(); };
          els.note.textContent = '点旗子试试。'; ok.onclick = function () { finish(true); };
        });
        await api.say(api.kid ? '无数个这样的"门"连起来，三千万士兵就成了一台电脑。秦始皇用它计算太阳——可惜，算出的结果还是错了。' : '与门、或门、非门、触发器……三千万士兵组成的阵列运行了整整十六个月，算出了一个恒纪元。但它没有来——三日凌空降临，又一个文明在烈焰中终结。三体问题，本来就没有解。');
      }
    };
  };

  /* 8 不要回答：选择 */
  SM.Islands.noanswer = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x06080f);
    lights(api, .35, .2, [0, 10, 5]);
    S.add(H.ground(0x14161f, 60)); S.add(H.box(30, .2, 30, 0x1a1d28, 0, 8, 0));
    for (var i = 0; i < 6; i++) { S.add(H.box(2.2, 1.2, 1, 0x2a2f40, -7 + i * 2.8, .6, 2)); S.add(H.box(2, .3, .8, 0x3a4260, -7 + i * 2.8, 1.3, 2)); }
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; var g = cv.getContext('2d');
    var tex = new THREE.CanvasTexture(cv); var screen = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), H.basic(0xffffff, { map: tex })); screen.position.set(0, 4.2, -6); S.add(screen);
    var red = new THREE.PointLight(0xff3b3b, 0, 30); red.position.set(0, 4, -2); S.add(red);
    var ye = H.human(0x7a8aa8, 0, 0, 1); S.add(ye);
    function draw(lines, blink) { g.fillStyle = '#05110a'; g.fillRect(0, 0, 1024, 512); g.fillStyle = '#2a5a3a'; for (var y = 0; y < 512; y += 24) g.fillRect(0, y, 1024, 1); g.font = 'bold 86px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'; g.textAlign = 'center'; g.fillStyle = blink ? '#ff3b3b' : '#ff7b6b'; g.shadowColor = '#ff0000'; g.shadowBlur = 30; lines.forEach(function (l, i) { g.fillText(l, 512, 150 + i * 130); }); tex.needsUpdate = true; }
    draw(['', '……', ''], false);
    api.camera.position.set(0, 3.2, 7); api.camera.lookAt(0, 3.5, -6);
    var warning = false;
    return {
      update: function (dt, t) { if (warning) { var bl = Math.sin(t * 6) > 0; draw(['不要回答！', '不要回答！', '不要回答！'], bl); red.intensity = bl ? 2.2 : 1.2; } },
      run: async function () {
        await api.say(api.kid ? '八年过去了。一个深夜，叶文洁一个人值班。屏幕忽然亮了。' : '1979年的一个深夜，叶文洁独自值班。沉寂了八年的接收系统，忽然亮了。', { label: '旁白' });
        warning = true; api.sfx('alarm'); await api.wait(1800);
        await api.say(api.txt(api.island.say)); api.hideSub();
        var res = await api.interact(api.island.interact.prompt, function (els, finish) {
          api.island.interact.options.forEach(function (op, i) { var b = api.btn(op, i === 0); els.opts.appendChild(b); b.onclick = function () { els.opts.innerHTML = ''; els.note.textContent = (i === 0 ? '你选择了回答。' : '你选择了沉默。') + ' 那么叶文洁呢？——她的答案，在下一座红岸岛上。'; var c = api.btn('继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(op); }; }; });
        });
        this.result = res;
        await api.say(api.kid ? '发这条警告的人，是三体世界里一个普通的监听员。他不想让自己的世界去伤害别人。' : '发出警告的是三体世界一名普通的监听员，编号1379。他厌倦了自己那个永远不可预测的世界，却不愿看到另一个世界遭受同样的命运。');
      }
    };
  };

  /* 9 三颗太阳的真相 */
  SM.Islands.truth = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x1a2238); S.fog = new THREE.Fog(0x1a2238, 60, 260);
    var L = lights(api, .6, .4, [20, 30, 10]);
    var gL = H.plane(200, 400, 0x6a5a4a, -50.5, 0, 0), gR = H.plane(200, 400, 0x6a5a4a, 50.5, 0, 0); S.add(gL); S.add(gR);
    for (var i = 0; i < 20; i++) { var side = i % 2 ? gL : gR; var c = H.cone(3 + Math.random() * 5, 4 + Math.random() * 10, 0x5a4a3a, (Math.random() - .5) * 160, 3, -40 - Math.random() * 140, 5); side.attach(c); }
    var suns = [], glows = []; [[-70, 80, -200], [0, 95, -220], [70, 80, -200]].forEach(function (p) { var s = H.sph(9, 0xffd070, p[0], p[1] + 200, p[2], true); S.add(s); suns.push(s); var g = H.glow(18, 0xffd070, s.position.x, s.position.y, s.position.z, .3); S.add(g); glows.push(g); });
    var flash = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), H.basic(0xffffff, { transparent: true, opacity: 0, depthTest: false })); flash.position.set(0, 0, -1.2); api.camera.add(flash); S.add(api.camera);
    S.add(H.stars(800, 400, 30));
    api.camera.position.set(0, 8, 30); api.camera.lookAt(0, 40, -200);
    var up = 0, shake = 0;
    return {
      update: function (dt, t) { if (shake > 0) { shake -= dt; api.camera.position.x = Math.sin(t * 40) * shake * .8; api.camera.position.y = 8 + Math.cos(t * 37) * shake * .5; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var wrap = document.createElement('div'); wrap.className = 'sunbtns'; els.body.appendChild(wrap); var bs = [];
          var notes = ['一颗太阳升起来了。今天是个好天气。', '两颗太阳！大地开始发烫……', '三日凌空！！'];
          [0, 1, 2].forEach(function (i) { var b = api.btn('第' + ['一', '二', '三'][i] + '颗太阳'); wrap.appendChild(b); bs.push(b); b.onclick = function () { if (i !== up) return; up++; b.classList.add('on'); b.disabled = true; els.note.textContent = notes[i]; var s = suns[i], g = glows[i], y0 = s.position.y; api.tween(1.6, function (k) { s.position.y = y0 - 200 * k; g.position.y = s.position.y; }); skyColor(api, [0x7a9ac8, 0xe8c890, 0xfff6e0][i], 1.6); S.fog.color.set([0x7a9ac8, 0xe8c890, 0xfff6e0][i]); L.dir.intensity = .4 + i * .8; L.amb.intensity = .6 + i * .5;
            if (i === 2) { setTimeout(function () { api.sfx('boom'); api.tween(1.2, function (k) { flash.material.opacity = k; }).then(function () { els.note.textContent = '三颗太阳排成了一条线——三日连珠。行星被巨大的引力撕开了！'; shake = 2.5; suns.forEach(function (s2, j) { s2.position.set(-30 + j * 30, 90, -220); glows[j].position.copy(s2.position); }); api.tween(2.5, function (k) { flash.material.opacity = 1 - k; gL.position.x = -50.5 - k * 40; gR.position.x = 50.5 + k * 40; gL.rotation.z = k * .25; gR.rotation.z = -k * .25; }).then(function () { var c = api.btn('继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(true); }; }); }); }, 1800); }
          }; });
        });
        await api.say(api.kid ? '三颗太阳的世界，永远算不准明天。所以三体人决定：离开家园，去四光年外那颗蓝色的星球——地球。' : '三体问题无解，意味着这个文明的毁灭只是时间问题。于是三体世界做出决定：全体迁徙，目标是四光年外那颗气候温和、规律可期的蓝色行星。而此时，地球上有一个人已经发出了邀请。');
      }
    };
  };

  /* 10 叶文洁的回答：按住三秒 */
  SM.Islands.answer = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x140c14); S.fog = new THREE.Fog(0x140c14, 40, 160);
    lights(api, .6, .3, [-20, 30, 10]);
    S.add(H.stars(700, 300, 10));
    S.add(H.cone(40, 30, 0x3a2f3c, 0, 0, -30, 7)); S.add(H.cone(26, 18, 0x2e262f, -45, -2, -40, 7)); S.add(H.cone(30, 22, 0x2e262f, 48, -3, -50, 7));
    S.add(H.cyl(9, 11, 2, 0x4a4050, 0, 15.5, -30, 10)); S.add(H.box(4, 2, 3, 0x6b5a70, 4, 17.5, -28)); S.add(H.cyl(.25, .35, 4, 0x888888, 0, 18.5, -30));
    var dishG = new THREE.Group(); dishG.position.set(0, 20.5, -30); var dish = H.dish(1.7); dish.rotation.x = -0.3; dishG.add(dish); S.add(dishG);
    var beam = H.cyl(.2, 1.4, 120, 0xff5a3c, 0, 60, 0, 8); beam.material = H.basic(0xff5a3c, { transparent: true, opacity: 0 }); dishG.add(beam);
    var redL = new THREE.PointLight(0xff3b3b, 0, 60); redL.position.set(0, 22, -28); S.add(redL);
    api.camera.position.set(14, 29, -4); api.camera.lookAt(0, 22, -34);
    var sent = false;
    return {
      update: function (dt, t) { if (sent) { beam.material.opacity = .5 + .3 * Math.sin(t * 8); redL.intensity = 2 + Math.sin(t * 8); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var hb = document.createElement('button'); hb.className = 'holdbtn'; hb.innerHTML = '<i></i><span>' + api.island.interact.btn + '</span>'; els.body.appendChild(hb); var fill = hb.querySelector('i');
          var t0 = 0, timer = null, done = false;
          function start(e) { e.preventDefault(); if (done) return; t0 = Date.now(); timer = setInterval(function () { var k = Math.min(1, (Date.now() - t0) / 3000); fill.style.height = (k * 100) + '%'; els.note.textContent = k < 1 ? '按住…… ' + Math.ceil(3 - k * 3) : ''; if (k >= 1) { clearInterval(timer); done = true; sent = true; api.sfx('sweep'); skyColor(api, 0x3a0a0a, 3); els.note.textContent = '信号发出去了。没有回头路了。'; setTimeout(function () { finish(true); }, 3200); } }, 50); }
          function end() { if (done) return; clearInterval(timer); fill.style.height = '0%'; els.note.textContent = '松开了——这个决定，需要按满三秒。'; }
          hb.onmousedown = start; hb.ontouchstart = start; hb.onmouseup = end; hb.onmouseleave = end; hb.ontouchend = end;
        });
        await api.say(api.kid ? '三体人收到了地球的位置。他们的舰队出发了——四百年后，会到达地球。' : '坐标发出的瞬间，人类的命运被改写：三体舰队启航，预计四百多年后抵达太阳系。叶文洁后来说，她并不后悔——这正是这个人物最令人不安的地方。');
      }
    };
  };

  /* 11 审判日号：点亮数据节点 */
  SM.Islands.judgment = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x0b1020);
    lights(api, .5, .3, [5, 10, 5]);
    S.add(H.ground(0x0a0c14, 80)); S.add(H.box(40, .2, 40, 0x11141f, 0, 6, 0));
    for (var i = 0; i < 8; i++) { [-5, 5].forEach(function (x) { var r = H.box(1.6, 4.5, 2.2, 0x1e2438, x, 2.25, -i * 3); S.add(r); for (var j = 0; j < 5; j++) { S.add(H.box(1.2, .12, .1, 0x1a3a1a, x, .6 + j * .8, -i * 3 + 1.12)); } }); }
    var nodes = [[-5, 2.4, -3], [5, 3.1, -9], [-5, 1.4, -15]].map(function (p) { var n = H.sph(.45, 0x3fa9ff, p[0], p[1], p[2] + 1.3, true); n.material.transparent = true; n.material.opacity = .25; S.add(n); var g = H.glow(1.2, 0x3fa9ff, n.position.x, n.position.y, n.position.z, 0); S.add(g); return { m: n, g: g, on: false }; });
    var evans = H.human(0xd8d0c0, 0, -22, 1.1); S.add(evans); [[0, 4, -2], [0, 4, -12], [0, 4, -20]].forEach(function (p) { var pl = new THREE.PointLight(0x5a8aff, .8, 30); pl.position.set(p[0], p[1], p[2]); S.add(pl); });
    api.camera.position.set(0, 3.2, 8); api.camera.lookAt(0, 2.5, -14);
    return {
      update: function (dt, t) { nodes.forEach(function (n, i) { if (n.on) { n.g.material.opacity = .3 + .2 * Math.sin(t * 4 + i); } }); api.camera.position.z = Math.max(2, 8 - t * .3); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var lit = 0; var ok = api.btn(api.island.interact.btn, true); ok.disabled = true;
          nodes.forEach(function (n, i) { var b = api.btn('节点 ' + (i + 1)); els.opts.appendChild(b); b.onclick = function () { if (n.on) return; n.on = true; n.m.material.opacity = 1; b.classList.add('primary'); b.disabled = true; lit++; els.note.textContent = ['这里存着三体世界发来的第一批信息……', '这里是三体舰队的航行数据……', '这里——是"智子"的秘密。'][i]; if (lit === 3) { ok.disabled = false; els.note.textContent += ' 三处都亮了。但船上的人随时可能销毁它们。'; } }; });
          els.opts.appendChild(ok); ok.onclick = function () { finish(true); };
        });
        await api.say(api.kid ? '人类必须拿到这些秘密，又不能让船上的人发现。史强想到了一个谁也想不到的办法。' : '作战中心必须在船员察觉之前夺取这些数据——任何常规攻击都会给对方销毁的时间。史强提出了一个被所有人认为疯狂的方案。');
      }
    };
  };

  /* 12 古筝行动：拉线 */
  SM.Islands.zither = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x8fb8d8); S.fog = new THREE.Fog(0x8fb8d8, 80, 300);
    lights(api, 1, .9, [20, 40, -10]);
    var water = H.plane(60, 400, 0x2a5a7a, 0, 0, -100); S.add(water);
    S.add(H.box(120, 4, 400, 0x4a6a3a, -90, 2, -100)); S.add(H.box(120, 4, 400, 0x4a6a3a, 90, 2, -100));
    for (var i = 0; i < 40; i++) { S.add(H.cone(2 + Math.random() * 2, 5 + Math.random() * 6, 0x2f5a2f, (i % 2 ? 1 : -1) * (34 + Math.random() * 40), 4, -200 + Math.random() * 250, 6)); }
    var pL = H.cyl(.5, .6, 30, 0xcfd4dc, -30.5, 19, -40); S.add(pL); var pR = H.cyl(.5, .6, 30, 0xcfd4dc, 30.5, 19, -40); S.add(pR);
    var wires = []; for (var y = 5; y < 33; y += 1.1) { var w = H.box(61, .06, .06, 0xccffff, -30.5 + 30.5, y, -40); w.material = H.basic(0xccffff, { transparent: true, opacity: .55 }); w.scale.x = 0; w.position.x = -30.5; wires.push(w); S.add(w); }
    // 船：由 24 片组成
    var ship = new THREE.Group(); var slabs = []; for (var k = 0; k < 24; k++) { var sl = H.box(16, 9, 2.9, 0x3a3f55, 0, 4.5, -k * 3 + 34); ship.add(sl); slabs.push(sl); } ship.add(H.box(5, 6, 8, 0xb9c0d0, 3, 12, 20)); ship.position.set(0, 0, -240); S.add(ship);
    api.camera.position.set(-48, 26, 10); api.camera.lookAt(0, 8, -60);
    var moving = false, cutStart = false;
    return {
      update: function (dt, t) { if (moving) { ship.position.z += dt * 14; slabs.forEach(function (sl, k) { var wz = ship.position.z + sl.position.z; if (wz > -40) { var d = Math.min(1, (wz + 40) / 40); sl.position.y = 4.5 - d * (0.8 + (k % 5) * .35); sl.rotation.z = d * ((k % 3) - 1) * .05; } }); if (ship.position.z > 120) moving = false; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var r = rangeInput(0, 100, 0); els.body.appendChild(r); var ok = api.btn(api.island.interact.btn, true); ok.disabled = true; els.opts.appendChild(ok);
          r.oninput = function () { var k = r.value / 100; wires.forEach(function (w) { w.scale.x = Math.max(.001, k); w.position.x = -30.5 + 30.5 * k; }); els.note.textContent = k < 1 ? '细丝在延伸……几乎看不见。' : '拉好了。五十根"飞刃"，像一架竖起来的古筝。'; ok.disabled = k < 1; };
          ok.onclick = function () { ok.disabled = true; moving = true; api.sfx('whoosh'); els.note.textContent = '审判日号来了……'; setTimeout(function () { els.note.textContent = '船无声地穿过了琴弦。船上没有人来得及销毁任何东西。'; }, 7000); setTimeout(function () { finish(true); }, 10500); };
        });
        await api.say(api.kid ? '人类拿到了三体人全部的秘密。但这些秘密，比所有人想的都可怕。' : '人类夺取了三体世界的全部信息。接下来要读到的内容，比战斗本身更令人绝望。');
      }
    };
  };

  /* 13 汇合：麦田与蝗虫 */
  SM.Islands.bugs = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0xf2c97a); S.fog = new THREE.Fog(0xf2c97a, 60, 260);
    lights(api, 1, 1, [30, 30, -20]);
    S.add(H.ground(0xc9a84a, 600));
    var n = 4000, wf = new THREE.InstancedMesh(new THREE.ConeGeometry(.18, 2, 4), H.mat(0xe2c66a), n); var o = new THREE.Object3D();
    for (var i = 0; i < n; i++) { o.position.set((Math.random() - .5) * 160, 1, -Math.random() * 200 + 10); o.rotation.z = (Math.random() - .5) * .2; o.updateMatrix(); wf.setMatrixAt(i, o.matrix); } S.add(wf);
    var m = 3000, lp = new Float32Array(m * 3), vel = []; for (var j = 0; j < m; j++) { lp[j * 3] = (Math.random() - .5) * 120; lp[j * 3 + 1] = 1.5 + Math.random() * .6; lp[j * 3 + 2] = -Math.random() * 120 - 5; vel.push(Math.random()); }
    var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); var locust = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0x3a2a10, size: .35 })); S.add(locust);
    S.add(H.human(0x8a95b8, -1.5, 6, 1)); S.add(H.human(0x5a6070, 0.3, 5.5, 1.1)); S.add(H.human(0x6a5a80, 2, 6.2, 1));
    var sunG = H.glow(30, 0xffe8b0, 80, 40, -220, .5); S.add(sunG);
    api.camera.position.set(0, 3.5, 14); api.camera.lookAt(0, 4, -40);
    var fly = false, ft = 0;
    return {
      update: function (dt, t) { if (fly) { ft += dt; var arr = lg.attributes.position.array; for (var i = 0; i < m; i++) { var v = vel[i]; var rise = Math.min(1, ft / (2 + v * 3)); arr[i * 3 + 1] = 1.5 + rise * (6 + v * 30) + Math.sin(t * 3 + i) * .4; arr[i * 3] += Math.sin(t * 2 + i) * dt * 3; arr[i * 3 + 2] += dt * (1 + v * 2) * (rise > .5 ? 1 : 0); } lg.attributes.position.needsUpdate = true; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); b.style.fontSize = '26px'; els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; fly = true; api.sfx('flutter'); els.note.textContent = '蝗虫飞起来了，遮住了半个天空。'; setTimeout(function () { els.note.textContent = '"虫子从来没有被战胜过。"'; }, 3500); setTimeout(function () { finish(true); }, 6000); };
        });
        await api.say(api.kid ? '三条线在这里汇合，《三体》第一部的故事讲完了。人类知道了敌人是谁，也知道了：虫子，从来没有被战胜过。' : '《三体》第一部在这里结束。人类知道了敌人是谁、何时到来、用什么方式锁死了我们。而真正的回答——人类将如何面对——留给了第二部《黑暗森林》。');
      }
    };
  };
})();
