/* 第三部《死神永生》14 座岛的舞台场景与互动 */
(function () {
  var PI = Math.PI;
  function lights(api, amb, dir, dirPos) { var a = new THREE.HemisphereLight(0xbfd0ff, 0x2a2030, amb || .8); api.scene.add(a); var d = new THREE.DirectionalLight(0xffffff, dir || .7); d.position.set.apply(d.position, dirPos || [10, 20, 10]); api.scene.add(d); return { amb: a, dir: d }; }
  function rangeInput(min, max, val) { var r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.value = val; return r; }
  function pickInteract(api, prompt, options, reveal) {
    return api.interact(prompt, function (els, finish) {
      options.forEach(function (op, i) { var b = api.btn(op, i === 0); b.style.cssText = 'min-width:200px;text-align:left;font-size:17px'; els.opts.appendChild(b); b.onclick = function () { els.opts.innerHTML = ''; els.note.textContent = typeof reveal === 'function' ? reveal(op, i) : reveal; var c = api.btn('继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(op); }; }; });
    });
  }
  function spaceBase(api, n) { api.scene.background = new THREE.Color(0x02030a); api.scene.add(api.H.stars(n || 2000, 700, -300)); }

  /* 1 云天明的星星：星图点选 */
  SM.Islands.b3_star = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 2500); lights(api, .5, .3, [0, 10, 10]);
    S.add(H.ground(0x0a0d18, 300)); S.add(H.box(2.4, 1.2, 1.2, 0x2a3350, 0, .6, -4)); S.add(H.human(0xff7aa8, -1.2, -1, 1)); S.add(H.human(0x5a5a6a, 1.3, -1.5, 1));
    var target = H.sph(.9, 0xffb6d0, 60, 70, -220, true); target.material.transparent = true; target.material.opacity = .45; S.add(target); var tg = H.glow(2.4, 0xffb6d0, 60, 70, -220, 0); S.add(tg);
    var lb = H.label('DX3906', '#ffb6d0', 1, 'bold 80px'); lb.position.set(60, 80, -220); lb.material.opacity = 0; S.add(lb);
    api.camera.position.set(0, 3, 8); api.camera.lookAt(10, 30, -120);
    var found = false;
    return {
      update: function (dt, t) { if (found) { tg.material.opacity = .3 + .15 * Math.sin(t * 3); target.material.opacity = 1; lb.material.opacity = Math.min(1, lb.material.opacity + dt); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var cv = document.createElement('canvas'); cv.width = 560; cv.height = 300; cv.style.cssText = 'background:#05070f;border-radius:10px;max-width:100%;cursor:crosshair'; els.body.appendChild(cv); var g = cv.getContext('2d');
          var stars = []; for (var i = 0; i < 70; i++) stars.push([20 + Math.random() * 520, 20 + Math.random() * 260, 1 + Math.random() * 1.6]); var T = [380 + Math.random() * 100, 80 + Math.random() * 120];
          var done = false;
          function draw(tm) { g.fillStyle = '#05070f'; g.fillRect(0, 0, 560, 300); stars.forEach(function (s) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(s[0], s[1], s[2], 0, 7); g.fill(); }); g.fillStyle = done ? '#ffb6d0' : 'rgba(255,182,208,.85)'; g.beginPath(); g.arc(T[0], T[1], done ? 5 : 2.2, 0, 7); g.fill(); if (done) { g.strokeStyle = '#ffb6d0'; g.lineWidth = 2; g.beginPath(); g.arc(T[0], T[1], 14 + 4 * Math.sin(tm / 300), 0, 7); g.stroke(); g.fillStyle = '#ffb6d0'; g.font = '16px sans-serif'; g.fillText('DX3906 · 286 光年', T[0] + 20, T[1] + 5); } }
          var anim = setInterval(function () { draw(Date.now()); }, 100); draw(0);
          cv.onclick = function (e) { if (done) return; var r = cv.getBoundingClientRect(); var x = (e.clientX - r.left) * 560 / r.width, y = (e.clientY - r.top) * 300 / r.height; if (Math.hypot(x - T[0], y - T[1]) < 24) { done = true; found = true; els.note.textContent = '就是它。一颗没有人署名的礼物。'; var b = api.btn(api.island.interact.btn, true); els.opts.appendChild(b); b.onclick = function () { clearInterval(anim); finish(true); }; } else { els.note.textContent = '不是这颗。它比别的星微微发粉，在右边一点。'; } };
        });
        await api.say(api.kid ? '程心那时并不知道这颗星会有什么用。她只是常常抬头找它。' : '在三部曲的时间尺度上，这颗星是为数不多"从头到尾都在"的东西。程心后来飞了 286 光年去见它。');
      }
    };
  };

  /* 2 阶梯计划：引爆核弹推帆 */
  SM.Islands.b3_staircase = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 2000); lights(api, .6, .9, [-20, 10, 20]);
    var sail = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), H.basic(0xdfe6f5, { side: THREE.DoubleSide, transparent: true, opacity: .85 })); sail.position.set(0, 0, -10); S.add(sail);
    var cap = H.sph(.35, 0xffb6d0, 0, 0, -13, true); S.add(cap); for (var i = 0; i < 4; i++) { var ln = H.box(.03, .03, 3, 0xffffff, (i % 2 ? 2.8 : -2.8), (i < 2 ? 2.8 : -2.8), -11.5); S.add(ln); }
    var bombs = []; for (var k = 0; k < 8; k++) { var b = H.sph(.2, 0xffffff, (Math.random() - .5) * 3, (Math.random() - .5) * 3, 4 + k * 10, true); S.add(b); bombs.push(b); }
    var flash = H.glow(.5, 0xfff1b0, 0, 0, 0, 0); S.add(flash);
    var earth = H.sph(14, 0x2f6fb8, 0, -20, 60); S.add(earth);
    api.camera.position.set(12, 4, 6); api.camera.lookAt(0, 0, -10);
    var v = 0, exploded = 0, ft = 0;
    return {
      update: function (dt, t) { sail.position.z -= v * dt; cap.position.z = sail.position.z - 3; if (ft > 0) { ft -= dt; flash.material.opacity = Math.max(0, ft * 1.5); flash.scale.setScalar(1 + (1 - ft) * 12); } api.camera.position.z = sail.position.z + 16; api.camera.position.x = 12; api.camera.lookAt(0, 0, sail.position.z); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); b.style.cssText = 'font-size:26px;padding:18px 50px'; els.opts.appendChild(b);
          b.onclick = function () { exploded++; v += 6; ft = .6; flash.position.set(0, 0, sail.position.z + 3); els.note.textContent = exploded < 5 ? '第 ' + exploded + ' 级：光帆又快了一些。' : '第五级。探测器飞向了三体舰队的方向——上面只有一个人的大脑。'; if (exploded >= 5) { b.disabled = true; setTimeout(function () { finish(true); }, 3500); } };
        });
        await api.say(api.kid ? '后来出了意外，探测器飞歪了，谁也不知道它去了哪里。程心去冬眠，等着也许永远不会来的消息。' : '第四级核弹引爆后帆索断裂，探测器偏离航线失联。程心作为联络人进入冬眠——这一等，就是两百多年。');
      }
    };
  };

  /* 3 执剑人交接：选人 */
  SM.Islands.b3_sword = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x101a2a); S.fog = new THREE.Fog(0x101a2a, 30, 140);
    lights(api, .9, .6, [-10, 20, 10]);
    S.add(H.ground(0x1a2538, 300)); S.add(H.cyl(2, 2.4, 1.2, 0x3a4560, 0, .6, -6, 12)); var sw = H.sph(.35, 0xff3b3b, 0, 1.6, -6, true); S.add(sw); S.add(H.glow(.9, 0xff3b3b, 0, 1.6, -6, .25));
    S.add(H.human(0x5a6070, -4, -4, 1.1)); S.add(H.human(0xff7aa8, 4, -4, 1)); S.add(H.human(0x8a8aa0, 0, -3, 1.1));
    var l1 = H.label('维德', '#cfd6ff', .5, 'bold 80px'); l1.position.set(-4, 2.6, -4); S.add(l1); var l2 = H.label('程心', '#ffb6d0', .5, 'bold 80px'); l2.position.set(4, 2.6, -4); S.add(l2); var l3 = H.label('罗辑', '#b57bff', .5, 'bold 80px'); l3.position.set(0, 2.6, -3); S.add(l3);
    for (var r = 0; r < 5; r++) for (var c = 0; c < 16; c++) S.add(H.human(0x2a3350, -15 + c * 2, 3 + r * 2, .8));
    api.camera.position.set(0, 4, 11); api.camera.lookAt(0, 1.5, -6);
    return {
      update: function (dt, t) { sw.material.color.setHex(Math.sin(t * 4) > 0 ? 0xff3b3b : 0x7a1a1a); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var r = await pickInteract(api, api.island.interact.prompt, api.island.interact.options, function (op, i) { return i === 0 ? '你选了维德。在书里，人类选了程心——大家不愿意再被一个"随时会按下去"的人保护。' : '你和书里的人类一样，选了程心。三体世界一直在等这一刻。'; });
        this.result = r;
        await api.say(api.kid ? '罗辑把开关交给了程心。他守了五十四年，终于可以休息了。可是十几分钟后——' : '罗辑交出开关，结束了 54 年的执剑生涯。交接仪式结束后不到一刻钟，三体世界的水滴动了。');
      }
    };
  };

  /* 4 威慑失败：十秒倒计时 */
  SM.Islands.b3_fail = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 1500); lights(api, .6, .6, [10, 20, 10]);
    S.add(H.ground(0x1a1f2c, 300)); var tower = H.cyl(.8, 1.2, 14, 0x8a95a8, 0, 7, -30, 8); S.add(tower); S.add(H.cyl(2.4, 2.4, .6, 0x6a7488, 0, 14.3, -30, 8));
    var dm = new THREE.MeshPhongMaterial({ color: 0xe8eef6, shininess: 200, specular: 0xffffff }); var drops = []; for (var i = 0; i < 3; i++) { var d = new THREE.Group(); var ds = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 16), dm); d.add(ds); var dc = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.5, 20), dm); dc.rotation.z = PI / 2; dc.position.x = .8; d.add(dc); d.position.set(60 + i * 15, 18 + i * 6, -60 - i * 20); d.lookAt(0, 14, -30); S.add(d); drops.push(d); }
    S.add(H.human(0xff7aa8, 0, -2, 1)); var sw = H.sph(.25, 0xff3b3b, .5, 1.2, -1.8, true); S.add(sw);
    var waves = []; for (var w = 0; w < 4; w++) { var rg = new THREE.Mesh(new THREE.TorusGeometry(1, .1, 8, 40), H.basic(0x9fc0ff, { transparent: true, opacity: 0 })); rg.position.set(0, 14.3, -30); rg.rotation.x = PI / 2; S.add(rg); waves.push(rg); }
    api.camera.position.set(6, 4, 8); api.camera.lookAt(0, 8, -30);
    var moving = false, pressed = null, wt = 0, fallen = false;
    return {
      update: function (dt, t) {
        if (moving) drops.forEach(function (d) { d.position.lerp(new THREE.Vector3(0, 14.3, -30), dt * .5); });
        if (pressed === true) { wt += dt; waves.forEach(function (w, i) { var p = ((wt * .4 + i * .25) % 1); w.scale.setScalar(1 + p * 40); w.material.opacity = .8 - p * .8; }); }
        if (pressed === false && !fallen) { tower.rotation.z += dt * .6; tower.position.y -= dt * 2; if (tower.position.y < -4) fallen = true; }
      },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var I = api.island.interact; var res = await api.interact(I.prompt, function (els, finish) {
          var big = document.createElement('div'); big.style.cssText = 'font-size:64px;font-family:"Courier New",monospace;color:#ff4b4b;text-shadow:0 0 18px #f00;margin:4px 0 10px'; big.textContent = '10.0'; els.body.appendChild(big); moving = true;
          var t0 = Date.now(), timer = setInterval(function () { var left = Math.max(0, 10 - (Date.now() - t0) / 1000); big.textContent = left.toFixed(1); if (left <= 0) { clearInterval(timer); decide(false, true); } }, 100);
          function decide(press, timeout) { clearInterval(timer); els.opts.innerHTML = ''; pressed = press; els.note.textContent = press ? '你按下去了——引力波广播发出，三体与地球一起暴露。在书里，程心没有按。' : (timeout ? '时间到了。你没有按——程心也没有。' : '你没有按。程心也没有。') + ' 水滴撞毁了发射台，威慑结束了。'; var c = api.btn('继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(press ? '按下去' : '不按'); }; }
          I.options.forEach(function (op, i) { var b = api.btn(op, i === 0); els.opts.appendChild(b); b.onclick = function () { decide(i === 0, false); }; });
        });
        this.result = res;
        await api.say(api.kid ? '程心后来一直在想：那一刻她是对是错？这个问题，书里没有给答案。' : '三体世界用十几分钟证明了他们对程心的判断。之后是大移民、澳大利亚——人类最黑暗的几年。而程心是否"错了"，全书始终没有给出一个简单的答案。');
      }
    };
  };

  /* 5 万有引力号·四维碎块 */
  SM.Islands.b3_4d = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 2500); lights(api, .7, .8, [10, 10, 10]);
    var cubeG = new THREE.Group(); var shell = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), H.mat(0x8a95a8, { transparent: true, opacity: 1 })); cubeG.add(shell);
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3, 3, 3)), new THREE.LineBasicMaterial({ color: 0xffffff })); cubeG.add(edges);
    var core = H.sph(.6, 0xffc94a, 0, 0, 0, true); core.material.transparent = true; core.material.opacity = 0; cubeG.add(core); var inner = H.box(1.2, .6, 1.2, 0x2fd1c0, 0, -.9, 0); inner.material.transparent = true; inner.material.opacity = 0; cubeG.add(inner);
    cubeG.position.set(0, 0, -6); S.add(cubeG);
    var ship = new THREE.Group(); ship.add(H.box(3, .6, 8, 0x8a95a8, 0, 0, 0)); ship.add(H.cyl(1.2, 1.2, .2, 0xcfd6ff, 0, 1.2, -2, 16)); ship.position.set(-12, -3, -30); S.add(ship);
    var waves = []; for (var w = 0; w < 4; w++) { var rg = new THREE.Mesh(new THREE.TorusGeometry(1, .1, 8, 40), H.basic(0x9fc0ff, { transparent: true, opacity: 0 })); rg.position.copy(ship.position); S.add(rg); waves.push(rg); }
    // 四维感：漂浮的彩色碎块
    var shards = []; for (var i = 0; i < 40; i++) { var s = H.box(.4 + Math.random(), .2, .4 + Math.random(), [0xff7aa8, 0xffc94a, 0x2fd1c0, 0x9fc0ff][i % 4], (Math.random() - .5) * 50, (Math.random() - .5) * 30, -20 - Math.random() * 50); s.material.transparent = true; s.material.opacity = 0; S.add(s); shards.push(s); }
    api.camera.position.set(0, 2, 2); api.camera.lookAt(0, 0, -6);
    var k4 = 0, bc = false, wt = 0;
    return {
      update: function (dt, t) { cubeG.rotation.y += dt * .4; cubeG.rotation.x = Math.sin(t * .3) * .3; shell.material.opacity = 1 - k4 * .85; core.material.opacity = k4; inner.material.opacity = k4; shards.forEach(function (s, i) { s.material.opacity = k4 * .8; s.rotation.x += dt * .3; s.position.y += Math.sin(t + i) * dt * .2; }); if (bc) { wt += dt; waves.forEach(function (w, i) { var p = ((wt * .4 + i * .25) % 1); w.scale.setScalar(1 + p * 60); w.material.opacity = .8 - p * .8; }); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var r = rangeInput(0, 100, 0); els.body.appendChild(r); var b = api.btn(api.island.interact.btn, true); b.disabled = true; els.opts.appendChild(b);
          els.note.textContent = '拖动滑块，像书里的人一样"从第四个方向"看它。';
          r.oninput = function () { k4 = r.value / 100; els.note.textContent = k4 < .3 ? '普通的立方体。' : k4 < .7 ? '边开始透明了……你看见了里面的东西。' : '里面、外面，同时看见——这就是四维空间里的三维物体。'; if (k4 > .9) b.disabled = false; };
          b.onclick = function () { b.disabled = true; bc = true; els.note.textContent = '引力波天线启动。三体世界的坐标，传向全宇宙。'; setTimeout(function () { finish(true); }, 4200); };
        });
        await api.say(api.kid ? '广播发出去了。三体人知道自己完了，他们的舰队开始逃跑。地球上的人，从澳大利亚回家了。' : '广播纪元开始。三体舰队放弃太阳系，人类从澳大利亚返回家园。但所有人都明白：地球的位置同样暴露了，打击迟早会来。');
      }
    };
  };

  /* 6 三体世界的毁灭：观测 */
  SM.Islands.b3_triend = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 2500); lights(api, .5, .4, [0, 10, 10]);
    S.add(H.ground(0x0a0d18, 300)); S.add(H.cyl(3, 3.4, 3, 0x3a4050, -10, 1.5, -20, 12)); S.add(H.sph(3.2, 0x4a5060, -10, 3.2, -20));
    var star = H.sph(2, 0xffd070, 40, 50, -160, true); S.add(star); var sg = H.glow(4, 0xffd070, 40, 50, -160, .3); S.add(sg);
    var pho = H.sph(.3, 0xffffff, -200, 120, -300, true); pho.visible = false; S.add(pho); var trail = H.glow(.6, 0xffffff, 0, 0, 0, 0); S.add(trail);
    var sophon = H.human(0xf1d9c0, 1.5, -2, 1); S.add(sophon); S.add(H.human(0xff7aa8, -1, -1.5, 1));
    api.camera.position.set(0, 3, 8); api.camera.lookAt(20, 30, -120);
    var phase = 0, pt = 0;
    return {
      update: function (dt, t) { if (phase === 1) { pt += dt; pho.visible = true; pho.position.lerpVectors(new THREE.Vector3(-200, 120, -300), star.position, Math.min(1, pt / 2.2)); trail.position.copy(pho.position); trail.material.opacity = .5; if (pt > 2.2) { phase = 2; pt = 0; } } else if (phase === 2) { pt += dt; pho.visible = false; trail.material.opacity = 0; var k = Math.min(1, pt / 3); star.scale.setScalar(1 + k * 12); sg.scale.setScalar(1 + k * 10); star.material.opacity = 1 - k; star.material.transparent = true; sg.material.opacity = .3 * (1 - k); if (k >= 1) { star.visible = false; sg.visible = false; } } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; phase = 1; els.note.textContent = '一粒光粒，从宇宙深处来。'; setTimeout(function () { els.note.textContent = '三体的太阳爆发了。三体世界，没有了。'; }, 3000); setTimeout(function () { els.note.textContent = '智子对人类说：再见。你们的结局，不会比我们好多少。'; }, 6000); setTimeout(function () { finish(true); }, 9000); };
        });
        await api.say(api.kid ? '人类从这件事里学到了打击的样子：光粒打太阳。他们开始准备。可是——还有一个人要见程心。' : '人类第一次亲眼看见黑暗森林打击的形态，并据此准备掩体计划。与此同时，三体方面传来消息：有人要见程心。');
      }
    };
  };

  /* 7 云天明的三个童话：三幕配对 */
  SM.Islands.b3_tales = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x15121f); S.fog = new THREE.Fog(0x15121f, 30, 120);
    var Lt = lights(api, .9, .6, [-10, 20, 10]);
    S.add(H.ground(0x221d33, 300));
    // 三个微缩舞台：画师、海与帆、水下王子
    var st1 = new THREE.Group(); st1.add(H.box(2.2, 2.8, .15, 0xf4f1ea, 0, 1.6, 0)); st1.add(H.box(.12, 2.4, .12, 0x6a4a2a, -1.2, 1.2, .3)); st1.add(H.human(0x8a6a9a, 1.6, 1, .9)); var painted = H.human(0xc9a0d0, 0, 0, .8); painted.position.set(0, .5, .2); painted.scale.z = .05; st1.add(painted); st1.position.set(-9, 0, -8); S.add(st1);
    var st2 = new THREE.Group(); st2.add(H.plane(7, 5, 0x2a4a8a, 0, .05, 0)); var sail = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), H.basic(0xffffff, { side: THREE.DoubleSide })); sail.position.set(0, 2.6, 0); st2.add(sail); st2.add(H.box(.08, 2.6, .08, 0x6a4a2a, -.8, 2.2, 0)); st2.add(H.box(1.6, .3, .6, 0x6a4a2a, 0, 1.3, 0)); st2.position.set(0, 0, -8); S.add(st2);
    var st3 = new THREE.Group(); var water = H.box(5, 3, 3, 0x2a6a9a, 0, 1.5, 0); water.material.transparent = true; water.material.opacity = .45; st3.add(water); st3.add(H.human(0xf1e1b0, 0, 0, 1)); var crown = H.cyl(.25, .3, .25, 0xffd36b, 0, 1.45, 0, 6); st3.add(crown); st3.position.set(9, 0, -8); S.add(st3);
    var spots = [st1, st2, st3].map(function (g) { var sp = new THREE.PointLight(0xffe8b0, 0, 18); sp.position.set(g.position.x, 5, g.position.z + 3); S.add(sp); return sp; });
    api.camera.position.set(0, 4, 8); api.camera.lookAt(0, 1.5, -8);
    var act = -1;
    return {
      update: function (dt, t) { spots.forEach(function (sp, i) { sp.intensity += ((i === act ? 2.2 : .25) - sp.intensity) * dt * 3; }); [st1, st2, st3].forEach(function (g, i) { g.position.y = i === act ? Math.sin(t * 2) * .08 : 0; }); if (act === 1) sail.rotation.y = Math.sin(t) * .3; },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var acts = [
          { title: '第一个童话：王国的新画师', text: api.kid ? '国王的新画师有一种神奇的画法：他把谁画进画里，谁就真的变成了画——只剩薄薄的一张。' : '一位新来的画师用一种特殊的纸与笔作画：被画进画里的人，本人就会消失，只留在平面的画中。', ans: 0, hint: '"变成一张画"——是变薄、变平。' },
          { title: '第二个童话：饕餮海与空中之帆', text: api.kid ? '海里有吃掉一切的怪鱼，谁也过不去。可是有一种神奇的肥皂，把它抹在帆上，船就能在空中滑过去，比什么都快。' : '一片无法横渡的海。主角得到一种来自远方的肥皂，涂在船帆上，船便悬浮、滑行，速度极快——但船后会留下一道痕迹。', ans: 1, hint: '"抹在帆上就能飞快滑行"——是一种新的"推进"。' },
          { title: '第三个童话：深水王子', text: api.kid ? '有一位王子，不管离他多远看他，他都一样大，一点也不会变小——就像在水底一样。' : '一位王子无论远近看上去都不会变形、不会缩小——光在他周围的行为变了。', ans: 2, hint: '"光变得不一样了"——把光速改掉。' }
        ];
        var opts = ['二维化——把人和世界压成平面', '光速飞船——曲率驱动', '黑域——降低光速'];
        var log = [];
        for (var a = 0; a < 3; a++) { act = a; var A = acts[a];
          await api.say(A.text, { label: A.title });
          api.hideSub();
          await api.interact(A.title + '——它在暗示什么？', function (els, finish) {
            opts.forEach(function (op, i) { var b = api.btn(op); b.style.cssText = 'min-width:220px;font-size:16px'; els.opts.appendChild(b); b.onclick = function () { if (i === A.ans) { els.opts.innerHTML = ''; els.note.textContent = ['对。人类后来才明白：这是在说"二维化"——降维打击。', '对。肥皂和空中之帆说的是曲率驱动的光速飞船——船后的痕迹就是航迹。', '对。在光速被降低的区域里，光的行为会变——这是"黑域"：把自己关进安全的笼子。'][i]; log.push(op); var c = api.btn(a < 2 ? '下一个童话 ▶' : '继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(true); }; } else { els.note.textContent = '再想想。' + A.hint; } }; });
          });
        }
        act = -1; this.result = '三个童话都猜对了';
        await api.say(api.kid ? '三个秘密都藏在童话里。人类猜出了一些，也猜错了一些。最先被相信的，是"光粒打太阳"那一种。' : '人类破译出二维化、光速飞船、黑域三条线索，却把防御重心押在"光粒打击"上——因为那是他们亲眼见过的方式。');
      }
    };
  };

  /* 8 掩体计划：摆太空城 */
  SM.Islands.b3_bunker = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 2000); lights(api, .5, .2, [0, 30, 0]);
    var sun = H.sph(3, 0xffb347, 0, 0, 0, true); S.add(sun); S.add(H.glow(6, 0xffb347, 0, 0, 0, .25)); var sl = new THREE.PointLight(0xffd080, 1.5, 200); S.add(sl);
    var planets = [[14, 1.6, 0xc9a06a], [22, 1.4, 0xe0c890], [30, 1, 0x8fd0e0], [38, 1, 0x4a6ad0]].map(function (p, i) { var ang = .4 + i * .5; var m = H.sph(p[1], p[2], Math.cos(ang) * p[0], 0, -Math.sin(ang) * p[0]); S.add(m); var orb = new THREE.Mesh(new THREE.TorusGeometry(p[0], .03, 6, 90), H.basic(0xffffff, { transparent: true, opacity: .2 })); orb.rotation.x = PI / 2; S.add(orb); return m; });
    var cities = []; planets.forEach(function (pl) { var g = new THREE.Group(); for (var k = 0; k < 6; k++) g.add(H.box(.35, .35, .9, 0xcfd6ff, (Math.random() - .5) * 2.4, (Math.random() - .5) * 2, (Math.random() - .5) * 2.4)); var dir = pl.position.clone().normalize(); g.position.copy(pl.position).addScaledVector(dir, 2.8); g.visible = false; S.add(g); cities.push(g); });
    api.camera.position.set(0, 34, 36); api.camera.lookAt(0, 0, -6);
    return {
      update: function (dt, t) { cities.forEach(function (c) { if (c.visible) c.rotation.y += dt * .3; }); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var I = api.island.interact; var placed = 0;
        await api.interact(I.prompt, function (els, finish) {
          I.options.forEach(function (op, i) { var b = api.btn(op); els.opts.appendChild(b); b.onclick = function () { b.disabled = true; b.style.opacity = .4; cities[i].visible = true; placed++; els.note.textContent = placed < 4 ? '太空城进入了' + op.replace('背后', '') + '的影子。' : '几十座太空城，全人类都搬了进去。掩体纪元开始。'; if (placed === 4) { var c = api.btn('继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(true); }; } }; });
        });
        await api.say(api.kid ? '掩体纪元里，有一个人不相信躲起来就安全。他叫维德。' : '掩体纪元是一个安静而紧张的时代。光速飞船被禁止——只有一个人还在坚持造它：维德。');
      }
    };
  };

  /* 9 光速飞船与维德：选择 */
  SM.Islands.b3_wade = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 2000); lights(api, .6, .8, [20, 20, 10]);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(8, 1.4, 12, 48), H.mat(0x8a95a8)); ring.position.set(0, 0, -30); S.add(ring); var hub = H.cyl(1.5, 1.5, 3, 0x6a7488, 0, 0, -30, 12); hub.rotation.x = PI / 2; S.add(hub);
    for (var i = 0; i < 8; i++) { S.add(H.box(1.4, .4, 3, 0x3a4050, -24 + i * 7, -8 + (i % 2) * 3, -70)); }
    var lab1 = H.label('星环城（维德）', '#ffb6d0', .6, 'bold 70px'); lab1.position.set(0, 11, -30); S.add(lab1); var lab2 = H.label('联邦舰队', '#cfd6ff', .5, 'bold 70px'); lab2.position.set(0, -4, -68); S.add(lab2);
    S.add(H.human(0x5a6070, -1.2, -3, 1)); S.add(H.human(0xff7aa8, 1.2, -3, 1));
    api.camera.position.set(0, 3, 8); api.camera.lookAt(0, 0, -40);
    return {
      update: function (dt, t) { ring.rotation.z += dt * .15; },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var r = await pickInteract(api, api.island.interact.prompt, api.island.interact.options, function (op, i) { return i === 0 ? '你让他打下去。在书里，程心没有——她让维德停下，维德真的停下了。' : '你和程心做了同样的选择。维德放下了武器，被带走，后来被处决。光速飞船停了。'; });
        this.result = r;
        await api.say(api.kid ? '很多年以后，程心才明白：那一天她停下的，是人类唯一能逃出去的路。' : '多年后程心才完全理解那个决定的分量：她停下的不只是一场战争，还有人类离开太阳系的唯一方式。而维德的团队，在被关停前悄悄造出了一艘——星环号。');
      }
    };
  };

  /* 10 歌者与二向箔 */
  SM.Islands.b3_singer = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 3000); lights(api, .3, .2, [0, 10, 10]);
    var singer = H.glow(1.4, 0xcfd3de, -3, 1, -8, .45); S.add(singer); var sl = new THREE.PointLight(0xcfd3de, 1, 40); sl.position.set(-3, 2, -6); S.add(sl);
    var box = H.box(1.6, .8, 1, 0x2a2f3a, 1.5, .4, -6); S.add(box);
    var foil = new THREE.Mesh(new THREE.PlaneGeometry(.8, .5), H.basic(0xffffff, { side: THREE.DoubleSide })); foil.position.set(1.5, 1.2, -6); foil.visible = false; S.add(foil);
    var sunFar = H.sph(.25, 0xffd070, 40, 20, -160, true); S.add(sunFar); S.add(H.glow(.8, 0xffd070, 40, 20, -160, .3));
    api.camera.position.set(0, 2.5, 2); api.camera.lookAt(2, 1, -20);
    var thrown = false, ft = 0;
    return {
      update: function (dt, t) { singer.material.opacity = .35 + .15 * Math.sin(t * 2.5) + .1 * Math.sin(t * 7); sl.intensity = .8 + .3 * Math.sin(t * 2.5); if (thrown) { ft += dt; foil.position.lerpVectors(new THREE.Vector3(1.5, 1.2, -6), sunFar.position, Math.min(1, ft / 5)); foil.rotation.x += dt * 3; foil.rotation.y += dt * 2; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var song = ['🎵 我看见一粒尘埃，在黑暗里发着光——', '🎵 它喊出了自己的名字，又喊出了邻居的名字——', '🎵 那就睡吧，小尘埃，睡成一张薄薄的画。'];
          var b = api.btn(api.island.interact.btn, true); b.disabled = true; els.opts.appendChild(b);
          song.forEach(function (l, i) { setTimeout(function () { els.note.textContent = l; if (i === song.length - 1) { foil.visible = true; b.disabled = false; } }, 600 + i * 2600); });
          b.onclick = function () { b.disabled = true; thrown = true; els.note.textContent = '纸片飘向那个发光的小点。歌者继续哼它的歌。'; setTimeout(function () { finish(true); }, 5200); };
        });
        await api.say(api.kid ? '没有人知道灾难已经在路上。太阳系里的人还在太空城里过着普通的日子。' : '二向箔以光速飞向太阳系。没有人知道它正在来。掩体纪元 67 年的太阳系，正在准备迎接又一个普通的早晨。');
      }
    };
  };

  /* 11 太阳系二维化：世界压成一幅画 */
  SM.Islands.b3_flat = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 2500); lights(api, .6, .4, [0, 30, 0]);
    var world = new THREE.Group(); S.add(world);
    var sun = H.sph(3.5, 0xffb347, 0, 0, 0, true); world.add(sun); world.add(H.glow(6, 0xffb347, 0, 0, 0, .2)); var sl = new THREE.PointLight(0xffd080, 1.5, 200); S.add(sl);
    [[9, .7, 0xa08a6a], [13, .9, 0xe0c890], [17, 1, 0x2f6fb8], [22, .8, 0xc06a4a], [30, 2.2, 0xc9a06a], [38, 1.9, 0xe0c890], [45, 1.3, 0x8fd0e0], [52, 1.3, 0x4a6ad0]].forEach(function (p, i) { var ang = i * 1.1; world.add(H.sph(p[1], p[2], Math.cos(ang) * p[0], 0, -Math.sin(ang) * p[0])); var orb = new THREE.Mesh(new THREE.TorusGeometry(p[0], .03, 6, 100), H.basic(0xffffff, { transparent: true, opacity: .15 })); orb.rotation.x = PI / 2; world.add(orb); if (i >= 4) for (var k = 0; k < 5; k++) world.add(H.box(.4, .4, 1, 0xcfd6ff, Math.cos(ang) * (p[0] + 3) + (Math.random() - .5) * 2, (Math.random() - .5) * 2, -Math.sin(ang) * (p[0] + 3) + (Math.random() - .5) * 2)); });
    var ship = new THREE.Group(); ship.add(H.box(.8, .4, 2.4, 0xffb6d0, 0, 0, 0)); var shipG = H.glow(1, 0xffb6d0, 0, 0, 1.6, 0); ship.add(shipG); ship.position.set(-20, 2, 10); S.add(ship);
    // 油画平面（梵高式漩涡），压扁后浮现
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024; var g = cv.getContext('2d'); g.fillStyle = '#0b1a4a'; g.fillRect(0, 0, 1024, 1024);
    for (var i = 0; i < 900; i++) { var cx = Math.random() * 1024, cy = Math.random() * 1024, r = 8 + Math.random() * 60, a0 = Math.random() * 6.28, len = 1 + Math.random() * 2.5; g.strokeStyle = ['#1e3f8a', '#2f6fb8', '#8fb8e8', '#ffd36b', '#ffe8a0', '#0b1a4a', '#5a8ad0'][i % 7]; g.lineWidth = 3 + Math.random() * 6; g.beginPath(); g.arc(cx, cy, r, a0, a0 + len); g.stroke(); }
    for (var s2 = 0; s2 < 18; s2++) { var sx = Math.random() * 1024, sy = Math.random() * 1024; g.fillStyle = 'rgba(255,230,140,.85)'; g.beginPath(); g.arc(sx, sy, 10 + Math.random() * 20, 0, 7); g.fill(); for (var q = 0; q < 6; q++) { g.strokeStyle = 'rgba(255,230,140,.6)'; g.lineWidth = 4; g.beginPath(); g.arc(sx, sy, 28 + q * 9, q, q + 2.5); g.stroke(); } }
    g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(512, 512, 44, 0, 7); g.fill(); for (var q2 = 0; q2 < 12; q2++) { g.strokeStyle = 'rgba(255,211,107,.7)'; g.lineWidth = 6; g.beginPath(); g.arc(512, 512, 60 + q2 * 18, q2 * .5, q2 * .5 + 3); g.stroke(); }
    var tex = new THREE.CanvasTexture(cv); var painting = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), H.basic(0xffffff, { map: tex, transparent: true, opacity: 0, side: THREE.DoubleSide })); painting.rotation.x = -PI / 2; painting.position.y = -.3; S.add(painting);
    var camFrom = new THREE.Vector3(30, 26, 60), camTo = new THREE.Vector3(0, 95, 0.01); api.camera.position.copy(camFrom); api.camera.lookAt(0, 0, 0);
    var phase = 0, pt = 0;
    return {
      update: function (dt, t) { if (phase === 1) { pt += dt; ship.position.z -= dt * (20 + pt * 40); ship.position.x += dt * 6; shipG.material.opacity = .6; if (pt > 2) { phase = 2; pt = 0; } } else if (phase === 2) { pt += dt; var k = Math.min(1, pt / 6); var e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k; world.scale.y = Math.max(0.001, 1 - e); painting.material.opacity = Math.max(0, e - .5) * 2; api.camera.position.lerpVectors(camFrom, camTo, e); api.camera.lookAt(0, 0, 0); if (k >= 1) phase = 3; } else if (phase === 3) { painting.rotation.z += dt * .01; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); b.style.cssText = 'font-size:26px;padding:18px 50px'; els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; phase = 1; els.note.textContent = '星环号出发了。'; setTimeout(function () { els.note.textContent = '回头看——太阳系正在变成一幅画。'; }, 2200); setTimeout(function () { els.note.textContent = '行星、太空城、太阳……全都在里面了。书里说，它像梵高的《星空》。'; }, 6500); setTimeout(function () { finish(true); }, 10500); };
        });
        await api.say(api.kid ? '星环号上只有两个人：程心和艾AA。她们要去的地方，是云天明送的那颗星。' : '星环号上只有程心和艾AA两个人，目的地是 286 光年外的 DX3906——云天明送的那颗星。太阳系的人类文明，留在了身后那幅画里。');
      }
    };
  };

  /* 12 蓝星与死线 */
  SM.Islands.b3_blue = function (api) {
    var H = api.H, S = api.scene; spaceBase(api, 2500); lights(api, .6, .8, [20, 10, 10]);
    var blue = H.sph(10, 0x3f8fd8, -22, -6, -50); S.add(blue); S.add(H.glow(12, 0x6fb0ff, -22, -6, -50, .12));
    var grey = H.sph(6, 0x8a8f98, 30, 4, -90); S.add(grey);
    var line = H.box(.08, .08, 120, 0xffffff, 30, 8, -120); line.material = H.basic(0xffffff, { transparent: true, opacity: .3 }); line.rotation.y = .4; S.add(line);
    var ship = new THREE.Group(); ship.add(H.box(.8, .4, 2.4, 0xffb6d0, 0, 0, 0)); ship.position.set(-10, -2, -20); S.add(ship);
    S.add(H.human(0xff7aa8, -1, -3, 1)); S.add(H.human(0x6a7a9a, 1, -3, 1));
    api.camera.position.set(0, 2, 4); api.camera.lookAt(5, 0, -60);
    var go = false, gt = 0;
    return {
      update: function (dt, t) { if (go) { gt += dt; ship.position.lerp(new THREE.Vector3(26, 6, -80), dt * .25); line.material.opacity = .3 + .3 * Math.sin(t * 6); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; go = true; var big = document.createElement('div'); big.style.cssText = 'font-size:30px;margin:8px 0;color:#cfd6ff;font-family:"Courier New",monospace'; els.body.appendChild(big);
            var steps = ['外面过去了 1 秒', '外面过去了 1 年', '外面过去了 100 年', '外面过去了 10000 年', '外面过去了 100 万年', '外面过去了 1890 万年']; steps.forEach(function (s, i) { setTimeout(function () { big.textContent = s; els.note.textContent = i < 2 ? '你们感觉只是一会儿……' : i < 5 ? '船里的钟几乎没动。' : '等你们回到蓝星，艾AA和云天明已经在那里度过了一生。'; }, 1500 + i * 1300); });
            setTimeout(function () { finish(true); }, 1500 + 6 * 1300 + 2500); };
        });
        await api.say(api.kid ? '程心又一次错过了。但蓝星上，有人给她留下了东西。' : '程心再一次错过了——这一次是 1890 万年。但蓝星的岩石上，有人给她留下了字。');
      }
    };
  };

  /* 13 石头上的字与小宇宙 647 */
  SM.Islands.b3_647 = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x6a8ab8); S.fog = new THREE.Fog(0x6a8ab8, 40, 160);
    lights(api, 1, .8, [-20, 30, 10]);
    S.add(H.ground(0x7a8a7a, 400)); for (var i = 0; i < 30; i++) S.add(H.cone(1.5 + Math.random() * 2, 3 + Math.random() * 6, 0x5a6a5a, (Math.random() - .5) * 160, 2, -30 - Math.random() * 100, 5));
    var stone = H.box(6, 3.2, 1.2, 0x6a6a6a, 0, 1.6, -6); S.add(stone);
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; var g = cv.getContext('2d'); var tex = new THREE.CanvasTexture(cv);
    var face = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.8), H.basic(0xffffff, { map: tex, transparent: true })); face.position.set(0, 1.6, -5.38); S.add(face);
    var lines = api.kid ? ['我们来过这里。', '我们等过你，也在这里过了一辈子。', '门后面是一个小宇宙，送给你。——云天明 艾AA'] : ['我们来过，等过。', '后来我们在这里住下，度过了一生。', '门后是小宇宙 647，这是最后一件礼物。', '——云天明、艾AA'];
    function drawStone(n) { g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, 1024, 512); g.fillStyle = '#8a8a80'; for (var i = 0; i < 400; i++) g.fillRect(Math.random() * 1024, Math.random() * 512, 3, 3); g.font = 'bold 58px "PingFang SC","Hiragino Sans GB",sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f4f1ea'; g.shadowColor = '#000'; g.shadowBlur = 6; lines.forEach(function (l, i) { if (i < n) g.fillText(l, 512, 120 + i * 100); }); tex.needsUpdate = true; }
    drawStone(0);
    var door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4), H.basic(0xffffff, { transparent: true, opacity: 0, side: THREE.DoubleSide })); door.position.set(7, 2, -10); S.add(door); var doorL = new THREE.PointLight(0xffffff, 0, 30); doorL.position.set(7, 2, -8); S.add(doorL);
    S.add(H.human(0xff7aa8, -1.5, -1, 1)); S.add(H.human(0x6a7a9a, 1.5, -1.5, 1));
    api.camera.position.set(0, 3, 5); api.camera.lookAt(1, 1.8, -6);
    var revealed = 0, doorOn = false;
    return {
      update: function (dt, t) { if (doorOn) { door.material.opacity = Math.min(.9, door.material.opacity + dt * .4); doorL.intensity = Math.min(2, doorL.intensity + dt); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var wipe = api.btn('擦一下'); els.opts.appendChild(wipe); var b = api.btn(api.island.interact.btn, true); b.disabled = true; els.opts.appendChild(b);
          wipe.onclick = function () { revealed++; drawStone(revealed); els.note.textContent = lines.slice(0, revealed).join(' / '); if (revealed >= lines.length) { wipe.disabled = true; b.disabled = false; doorOn = true; } };
          b.onclick = function () { finish(true); };
        });
        await api.say(api.kid ? '门后面很安静，有田地，有房子。程心和关一帆在里面住了下来。' : '小宇宙 647 是一片安静的田园。程心和关一帆在那里生活、等待——直到收到一条发给全宇宙的广播。');
      }
    };
  };

  /* 14 归零者与生态球 */
  SM.Islands.b3_end = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0xcfe0ea); S.fog = new THREE.Fog(0xcfe0ea, 40, 140);
    lights(api, 1.1, .8, [20, 30, 10]);
    S.add(H.ground(0x7fb86a, 300)); for (var i = 0; i < 200; i++) S.add(H.cone(.12, .8, 0xa8d090, (Math.random() - .5) * 60, .4, -5 - Math.random() * 40, 4));
    S.add(H.box(4, 2.4, 3, 0xe8e0d0, -8, 1.2, -12)); S.add(H.cone(3.2, 1.6, 0x9a5a4a, -8, 3.2, -12, 4));
    var door = new THREE.Group(); door.add(H.box(.3, 4.4, .3, 0x3a3a4a, -1.2, 2.2, 0)); door.add(H.box(.3, 4.4, .3, 0x3a3a4a, 1.2, 2.2, 0)); door.add(H.box(2.7, .3, .3, 0x3a3a4a, 0, 4.4, 0)); var portal = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 4.1), H.basic(0x05070f, { side: THREE.DoubleSide })); portal.position.set(0, 2.1, 0); door.add(portal); door.position.set(3, 0, -8); S.add(door);
    var ball = H.sph(.45, 0x7fd0ff, 0, .45, -3); ball.material.transparent = true; ball.material.opacity = .75; ball.visible = false; S.add(ball); var bg = H.glow(.9, 0x9fe0ff, 0, .45, -3, 0); S.add(bg);
    var cx = H.human(0xff7aa8, -1.2, -1, 1); S.add(cx); var gf = H.human(0x6a7a9a, 1.4, -1.4, 1); S.add(gf);
    api.camera.position.set(0, 2.8, 5); api.camera.lookAt(1, 1.5, -8);
    var placed = false, leaving = false;
    return {
      update: function (dt, t) { if (placed) bg.material.opacity = .25 + .15 * Math.sin(t * 2); if (leaving) { cx.position.lerp(new THREE.Vector3(3, 0, -8), dt * .4); gf.position.lerp(new THREE.Vector3(3.4, 0, -8.2), dt * .4); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; ball.visible = true; placed = true; els.note.textContent = '一条小鱼，一点水，一点光。五公斤。'; setTimeout(function () { leaving = true; els.note.textContent = '他们走出了门。小宇宙的质量回到了大宇宙。'; }, 3000); setTimeout(function () { finish(true); }, 7500); };
        });
        await api.say(api.kid ? '故事讲完了。从清华园的一副眼镜，到一个小小的生态球——这就是《三体》。现在，去翻开书吧。' : '三部曲到此结束。从 1967 年清华园的一副眼镜，到时间之外的一个生态球。把字刻在石头上——然后，去读原著。');
      }
    };
  };
})();
