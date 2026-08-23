/* 第二部《黑暗森林》14 座岛的舞台场景与互动 */
(function () {
  var PI = Math.PI;
  function skyColor(api, hex, dur) { var from = api.scene.background.clone(), to = new THREE.Color(hex); return api.tween(dur || 2, function (k) { api.scene.background.copy(from).lerp(to, k); if (api.scene.fog) api.scene.fog.color.copy(api.scene.background); }); }
  function lights(api, amb, dir, dirPos) { var a = new THREE.HemisphereLight(0xbfd0ff, 0x2a2030, amb || .8); api.scene.add(a); var d = new THREE.DirectionalLight(0xffffff, dir || .7); d.position.set.apply(d.position, dirPos || [10, 20, 10]); api.scene.add(d); return { amb: a, dir: d }; }
  function rangeInput(min, max, val) { var r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.value = val; return r; }
  /* 黑暗森林通用布景：暗树 + 篝火 */
  function forestSet(api, n, radius, fire) {
    var H = api.H, S = api.scene;
    for (var i = 0; i < n; i++) { var a = Math.random() * PI * 2, r = radius * (.5 + Math.random() * .8); S.add(H.cone(1 + Math.random() * 2, 6 + Math.random() * 10, 0x0a0f18, Math.cos(a) * r, 4, Math.sin(a) * r - 6, 6)); }
    if (fire) { var pl = new THREE.PointLight(0xff9a4a, 1.6, 40); pl.position.set(fire[0], fire[1] + 1.2, fire[2]); S.add(pl); var g = H.glow(.9, 0xff8a3a, fire[0], fire[1] + .5, fire[2], .55); S.add(g); S.add(H.cyl(.6, .8, .3, 0x3a2a1a, fire[0], fire[1], fire[2], 6)); return { light: pl, glow: g }; }
    return null;
  }
  /* 选择型互动：按钮 → 揭示文案 → 继续 */
  function pickInteract(api, prompt, options, reveal) {
    return api.interact(prompt, function (els, finish) {
      options.forEach(function (op, i) { var b = api.btn(op, i === 0); els.opts.appendChild(b); b.onclick = function () { els.opts.innerHTML = ''; els.note.textContent = typeof reveal === 'function' ? reveal(op, i) : reveal; var c = api.btn('继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(op); }; }; });
    });
  }

  /* 1 墓前的两条公理：词块拼接 */
  SM.Islands.b2_axioms = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x1a1c2a); S.fog = new THREE.Fog(0x1a1c2a, 30, 110);
    lights(api, .6, .35, [-10, 20, 10]);
    S.add(H.ground(0x2a2f3a, 300));
    for (var i = 0; i < 40; i++) { var x = (Math.random() - .5) * 60, z = -8 - Math.random() * 50; if (Math.abs(x) < 4 && z > -12) continue; S.add(H.box(1.1, 1.6 + Math.random() * .8, .25, 0x5a5f6e, x, .9, z)); }
    S.add(H.box(1.6, 2.4, .3, 0x6a6f7e, 0, 1.2, -6)); S.add(H.box(2.4, .3, 1.4, 0x4a4f5e, 0, .15, -5.6));
    var ye = H.human(0x7a7a8a, -1.6, -3, .95); S.add(ye); var luo = H.human(0x8a7aa8, 1.5, -2.4, 1); S.add(luo);
    for (var t = 0; t < 14; t++) { S.add(H.cone(1.5 + Math.random(), 5 + Math.random() * 5, 0x1a2a1a, (Math.random() - .5) * 90, 3, -30 - Math.random() * 50, 6)); }
    var ember = H.glow(1.6, 0xff5a3c, 0, 1.3, -6, .18); S.add(ember); var emberL = new THREE.PointLight(0xff5a3c, .8, 20); emberL.position.set(0, 2, -5); S.add(emberL);
    api.camera.position.set(0, 3.2, 6); api.camera.lookAt(0, 1.4, -5);
    return {
      update: function (dt, t) { ember.material.opacity = .12 + .08 * Math.sin(t * 2); emberL.intensity = .6 + .3 * Math.sin(t * 2); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var ax = api.kid ? [['活下去', '是文明最要紧的事'], ['东西是有限的', '可文明一直在长大']] : [['生存', '是文明的', '第一需要'], ['文明不断增长和扩张', '但宇宙中的物质总量', '保持不变']];
        for (var n = 0; n < 2; n++) {
          var blocks = ax[n];
          await api.interact('第' + (n + 1) + '条公理：' + api.island.interact.prompt, function (els, finish) {
            var pool = blocks.map(function (b, i) { return { t: b, i: i }; }).sort(function () { return Math.random() - .5; }); var next = 0;
            var line = document.createElement('div'); line.style.cssText = 'min-height:44px;font-size:22px;color:#ffd36b;margin-bottom:12px;letter-spacing:.05em'; els.body.appendChild(line);
            var wrap = document.createElement('div'); wrap.className = 'opts'; els.body.appendChild(wrap);
            pool.forEach(function (p) { var b = api.btn(p.t); wrap.appendChild(b); b.onclick = function () { if (p.i !== next) { els.note.textContent = '这一块好像不是下一句，再想想。'; b.style.transform = 'translateX(4px)'; setTimeout(function () { b.style.transform = ''; }, 150); return; } next++; b.disabled = true; b.style.opacity = .35; line.textContent += (line.textContent ? '，' : '') + p.t; els.note.textContent = ''; if (next === blocks.length) { line.textContent += '。'; els.note.textContent = '第' + (n + 1) + '条公理拼好了。'; setTimeout(function () { finish(true); }, 1300); } }; });
          });
        }
        await api.say(api.kid ? '叶文洁说完就走了。罗辑把这两句话记在心里，一记就是很多年。' : '"好好想想。"叶文洁转身离开，没有再解释一个字。两条公理、两个概念，罗辑要用八年加两百年才把它们想通。');
      }
    };
  };

  /* 2 面壁计划：选谁能成功 */
  SM.Islands.b2_wallfacer = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x0e1526);
    lights(api, .9, .6, [0, 20, 10]);
    S.add(H.ground(0x1a2340, 120)); S.add(H.box(40, .3, 30, 0x10182c, 0, 9, -10));
    S.add(H.box(18, .8, 6, 0x2a3550, 0, .4, -6)); S.add(H.box(20, 6, .4, 0x162040, 0, 3.8, -9.2));
    var glb = H.sph(1.6, 0x2f5fa8, 0, 5.2, -9); S.add(glb); S.add(H.glow(2.2, 0x3f7fe0, 0, 5.2, -9, .15));
    var cols = [0x8a8aa0, 0x7a6a5a, 0x6a7a8a, 0xb57bff], names = ['泰勒', '雷迪亚兹', '希恩斯', '罗辑'], people = [];
    names.forEach(function (nm, i) { var x = -5.4 + i * 3.6; var h = H.human(cols[i], x, -5, 1.15); S.add(h); people.push(h); var lb = H.label(nm, '#dfe4ff', .5, 'bold 80px'); lb.position.set(x, 3.2, -5); S.add(lb); S.add(H.box(1.2, 1.1, .7, 0x3a4560, x, 1.35, -3.6)); });
    for (var r = 0; r < 6; r++) for (var c = 0; c < 14; c++) { S.add(H.human(0x2a3350, -13 + c * 2, 2 + r * 2.2, .8)); }
    api.camera.position.set(0, 4.5, 12); api.camera.lookAt(0, 2.2, -6);
    var chosen = -1;
    return {
      update: function (dt, t) { people.forEach(function (p, i) { p.position.y = (i === chosen) ? Math.abs(Math.sin(t * 3)) * .3 : 0; }); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var r = await pickInteract(api, api.island.interact.prompt, api.island.interact.options, function (op, i) { chosen = i; return '你押在了' + op + '身上。记住这个选择——四个人的结局会一个个揭晓。' });
        this.result = r;
        await api.say(api.kid ? '罗辑被选中时自己都吓了一跳：我？我什么计划都没有啊！他不知道，三体人最怕的就是他。' : '罗辑被宣布为面壁者时完全懵了——他没有任何计划，也不想有。而三体世界对他的反应，比对前三位加起来还要紧张：他们下令"消灭他"。');
      }
    };
  };

  /* 3 罗辑的逃避与庄颜：窗上画人 */
  SM.Islands.b2_luoji = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x9fb4cc); S.fog = new THREE.Fog(0x9fb4cc, 40, 160);
    lights(api, 1, .7, [-20, 30, 10]);
    S.add(H.ground(0xeef2f8, 400)); var lake = H.plane(70, 50, 0x6a93c8, 20, .05, -50); S.add(lake);
    S.add(H.box(7, 4, 6, 0x6a4a3a, -6, 2, -10)); S.add(H.cone(5.6, 3, 0x8a3a2a, -6, 5.5, -10, 4)); S.add(H.box(1.4, 1.4, .1, 0xffd27a, -6, 2.4, -6.9)); S.add(H.box(.6, 1.8, .1, 0x3a2a1a, -3.6, 1, -6.9));
    for (var i = 0; i < 30; i++) { S.add(H.cone(1.5 + Math.random() * 1.5, 6 + Math.random() * 6, 0x2e4a3a, (Math.random() - .5) * 140, 4, -30 - Math.random() * 100, 6)); }
    var snow = H.stars(1500, 120, -10); snow.material.size = .25; snow.position.y = 30; S.add(snow);
    S.add(H.human(0xb57bff, -1, -4, 1));
    api.camera.position.set(2, 3, 6); api.camera.lookAt(-5, 2.5, -10);
    return {
      update: function (dt, t) { snow.position.y = 30 - (t * 1.2 % 40); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var cv = document.createElement('canvas'); cv.width = 420; cv.height = 260; cv.style.cssText = 'background:linear-gradient(180deg,#cfe0f2,#9fb8d6);border-radius:10px;cursor:crosshair;max-width:100%'; els.body.appendChild(cv); var g = cv.getContext('2d');
          var pts = [[150, 60], [230, 50], [275, 120], [250, 200], [160, 210], [120, 130]]; var k = 0;
          function draw() { g.clearRect(0, 0, 420, 260); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.lineCap = 'round'; if (k > 1) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < k; i++) g.lineTo(pts[i][0], pts[i][1]); if (k === pts.length) g.closePath(); g.stroke(); } pts.forEach(function (p, i) { g.beginPath(); g.arc(p[0], p[1], i === k ? 9 : 5, 0, 7); g.fillStyle = i < k ? 'rgba(255,255,255,.9)' : (i === k ? '#ffd36b' : 'rgba(255,255,255,.35)'); g.fill(); }); if (k === pts.length) { g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(185, 120, 5, 0, 7); g.fill(); g.beginPath(); g.arc(235, 118, 5, 0, 7); g.fill(); g.beginPath(); g.arc(210, 160, 14, .2, PI - .2); g.stroke(); } }
          draw(); els.note.textContent = '点亮那个亮一点的点。';
          cv.onclick = function (e) { var r = cv.getBoundingClientRect(); var x = (e.clientX - r.left) * 420 / r.width, y = (e.clientY - r.top) * 260 / r.height; var p = pts[k]; if (p && Math.hypot(x - p[0], y - p[1]) < 26) { k++; draw(); if (k === pts.length) { els.note.textContent = '窗上的雾气里，有一个笑着的人。罗辑给她取名——庄颜。'; var b = api.btn(api.island.interact.btn, true); els.opts.appendChild(b); b.onclick = function () { finish(true); }; } } };
        });
        await api.say(api.kid ? '后来，庄颜和孩子被送去冬眠。罗辑一个人坐在雪地里，第一次认真地想起叶文洁的两句话。' : '庄颜与女儿进入冬眠，是联合国对罗辑的最后通牒："想见她们，先拿出计划。"他终于回到那两条公理前。');
      }
    };
  };

  /* 4 破壁人：三组配对 */
  SM.Islands.b2_wallbreaker = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x07070c);
    lights(api, .5, .4, [0, 10, 8]);
    S.add(H.ground(0x101018, 80));
    var masks = []; [[-4, 0], [0, .5], [4, 0]].forEach(function (a, i) { var m = H.sph(1.3, [0x8a8aa0, 0x7a6a5a, 0x6a7a8a][i], a[0], 2.2, a[1] - 4); S.add(m); masks.push(m); var crack = H.box(.1, 1.8, .1, 0xffc94a, a[0], 2.2, a[1] - 2.7); crack.rotation.z = .3; crack.visible = false; S.add(crack); m.userData.crack = crack; S.add(H.cyl(.4, .6, 1.6, 0x2a2a36, a[0], .8, a[1] - 4, 8)); });
    var spot = new THREE.SpotLight(0xffc94a, 1.2, 40, .6, .5); spot.position.set(0, 12, 2); S.add(spot);
    api.camera.position.set(0, 3.5, 7); api.camera.lookAt(0, 2, -4);
    return {
      update: function (dt, t) { masks.forEach(function (m, i) { m.rotation.y = Math.sin(t * .6 + i) * .3; }); },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var I = api.island.interact;
        await api.interact(I.prompt, function (els, finish) {
          var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:26px;justify-content:center;align-items:flex-start'; els.body.appendChild(row);
          var L = document.createElement('div'), R = document.createElement('div'); [L, R].forEach(function (c) { c.style.cssText = 'display:flex;flex-direction:column;gap:10px'; row.appendChild(c); });
          var selL = -1, matched = 0, lb = [], rb = [];
          I.left.forEach(function (t, i) { var b = api.btn(t); b.style.minWidth = '130px'; L.appendChild(b); lb.push(b); b.onclick = function () { if (b.disabled) return; lb.forEach(function (x) { x.classList.remove('primary'); }); b.classList.add('primary'); selL = i; els.note.textContent = '再点右边他真正的计划。'; }; });
          I.right.forEach(function (t, j) { var b = api.btn(t); b.style.cssText = 'min-width:300px;text-align:left;font-size:16px'; R.appendChild(b); rb.push(b); b.onclick = function () { if (selL < 0 || b.disabled) { els.note.textContent = '先点左边的面壁者。'; return; } if (I.answer[selL] === j) { lb[selL].disabled = true; lb[selL].classList.remove('primary'); lb[selL].style.opacity = .4; b.disabled = true; b.style.opacity = .4; masks[selL].userData.crack.visible = true; matched++; els.note.textContent = ['泰勒的破壁人说：你要的根本不是胜利，是一支敢去送死的舰队。', '雷迪亚兹的破壁人说：你那些氢弹根本不是对三体的，是对着太阳系自己的。', '希恩斯的破壁人是他的妻子——"钢印上真正的字是：逃跑。"'][selL]; selL = -1; if (matched === 3) { var c = api.btn('继续 ▶', true); els.opts.appendChild(c); c.onclick = function () { finish(true); }; } } else { els.note.textContent = '不是这个。再想想他表面上在做什么、背后又在怕什么。'; } }; });
        });
        await api.say(api.kid ? '三面墙都被打破了。只剩下罗辑——可他连计划都没有，怎么破？' : '三位面壁者全部出局。三体世界对罗辑的态度却始终如一：不猜、不破，只想让他消失。这本身就是一条线索。');
      }
    };
  };

  /* 5 章北海与太空军：选路线 */
  SM.Islands.b2_zhang = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x03050c);
    lights(api, .6, .8, [30, 20, 10]);
    S.add(H.stars(1800, 500, -100));
    var earth = H.sph(16, 0x2f6fb8, -30, -6, -70); S.add(earth); S.add(H.glow(18, 0x5fa0ff, -30, -6, -70, .12));
    var rocketA = new THREE.Group(); rocketA.add(H.cyl(1, 1.2, 8, 0xcfd4dc, 0, 0, 0, 10)); rocketA.add(H.cone(1, 2.2, 0xff7a5a, 0, 5.1, 0)); var flameA = H.glow(1.6, 0xffa040, 0, -5, 0, 0); rocketA.add(flameA); rocketA.position.set(-7, 0, -20); S.add(rocketA);
    var shipB = new THREE.Group(); shipB.add(H.box(3, 1.2, 6, 0x8a95a8, 0, 0, 0)); shipB.add(H.cyl(.9, .9, 1.4, 0x4a5468, 0, 0, 3.6, 8)); var flameB = H.glow(1.8, 0x6ac0ff, 0, 0, 5, 0); shipB.add(flameB); shipB.position.set(7, 0, -20); S.add(shipB);
    var man = H.human(0x2fd1c0, 0, -6, 1); S.add(man);
    api.camera.position.set(0, 2, 4); api.camera.lookAt(0, 0, -20);
    var chosenB = null, tm = 0;
    return {
      update: function (dt, t) { if (chosenB !== null) { tm += dt; if (chosenB === 0) { rocketA.position.y += dt * 4; flameA.material.opacity = .6; if (rocketA.position.y > 20) { rocketA.position.y = 20; } } else { shipB.position.z -= dt * (6 + tm * 6); flameB.material.opacity = .7; } } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var I = api.island.interact;
        var r = await pickInteract(api, I.prompt, I.options, function (op, i) { chosenB = i; return i === 0 ? '火箭很可靠——但它只能在太阳系里打转。章北海想要的是右边那条路。' : '这正是章北海不惜一切要选的路：飞出太阳系，才有活路。'; });
        this.result = r;
        await api.say(api.kid ? '路线定下来了。章北海申请冬眠——他要去两百年后的太空军，继续他一个人的计划。' : '路线之争以辐射推进胜出告终——代价书里写得很清楚。章北海随即以"增援未来"的名义进入冬眠，把自己也变成了一枚射向两百年后的子弹。');
      }
    };
  };

  /* 6 咒语：用太阳发射坐标 */
  SM.Islands.b2_spell = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x0a0c1a); S.fog = new THREE.Fog(0x0a0c1a, 60, 220);
    lights(api, .7, .5, [30, 40, 10]);
    S.add(H.stars(800, 300, 30));
    S.add(H.cone(40, 30, 0x2a3040, 0, 0, -30, 7)); S.add(H.cone(26, 18, 0x222a38, -45, -2, -40, 7)); S.add(H.cyl(9, 11, 2, 0x4a5068, 0, 15.5, -30, 10)); S.add(H.cyl(.25, .35, 4, 0x999, 0, 18.5, -30));
    var dishG = new THREE.Group(); dishG.position.set(0, 20.5, -30); var dish = H.dish(1.7); dish.rotation.x = -0.45; dishG.add(dish); dishG.rotation.y = -.3; S.add(dishG);
    var sunPos = new THREE.Vector3(22, 52, -120); S.add(H.sph(6, 0xfff1b0, sunPos.x, sunPos.y, sunPos.z, true)); var sunGlow = H.glow(9, 0xffe8a0, sunPos.x, sunPos.y, sunPos.z, .22); S.add(sunGlow);
    var star = H.sph(.5, 0xffffff, -120, 110, -260, true); S.add(star); var starL = H.label('187J3X1', '#b57bff', .6, 'bold 70px'); starL.position.set(-120, 118, -260); S.add(starL);
    var waves = []; for (var i = 0; i < 6; i++) { var w = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 8, 32), H.basic(0xb57bff, { transparent: true, opacity: 0 })); w.position.copy(dishG.position); w.lookAt(sunPos); S.add(w); waves.push(w); }
    var beam = H.cyl(.3, 2, 300, 0xb57bff, 0, 0, 0, 8); beam.material = H.basic(0xb57bff, { transparent: true, opacity: 0 }); beam.position.copy(sunPos).lerp(star.position, .5); beam.lookAt(star.position); beam.rotateX(PI / 2); S.add(beam);
    api.camera.position.set(16, 28, -2); api.camera.lookAt(4, 30, -70);
    var fired = false, ft = 0;
    return {
      update: function (dt, t) { if (fired) { ft += dt; waves.forEach(function (w, i) { var p = ((ft * .35 + i * .16) % 1); w.position.lerpVectors(dishG.position, sunPos, p); w.scale.setScalar(1 + p * 10); w.material.opacity = p < .9 ? .9 - p * .8 : 0; }); if (ft > 2.5) { beam.material.opacity = Math.min(.5, (ft - 2.5) * .3); sunGlow.scale.setScalar(1 + Math.min(1, (ft - 2.5) * .4)); } } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); b.style.fontSize = '26px'; b.style.padding = '18px 50px'; els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; fired = true; api.sfx('sweep'); els.note.textContent = '坐标飞向太阳……'; setTimeout(function () { els.note.textContent = '太阳把它放大，送向宇宙。现在，等一百多年。'; }, 2800); setTimeout(function () { finish(true); }, 5400); };
        });
        await api.say(api.kid ? '罗辑去冬眠了。他留下一句话：咒语应验的时候，叫醒我。' : '"如果那颗星出了事，就叫醒我。"——这是罗辑作为面壁者留下的全部遗言。然后他沉睡了一百八十五年。');
      }
    };
  };

  /* 7 大低谷与第二次启蒙：电梯上升 */
  SM.Islands.b2_ravine = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x05070c); S.fog = new THREE.Fog(0x05070c, 30, 200);
    var Lt = lights(api, .5, .4, [0, 40, 10]);
    // 地下：竖井
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 120, 16, 1, true), H.mat(0x1a2030, { side: THREE.BackSide })); shaft.position.y = 40; S.add(shaft);
    for (var y = -6; y < 100; y += 6) { var ring = new THREE.Mesh(new THREE.TorusGeometry(6, .15, 6, 24), H.basic(0x3fa9ff, { transparent: true, opacity: .35 })); ring.rotation.x = PI / 2; ring.position.y = y; S.add(ring); }
    var cab = new THREE.Group(); cab.add(H.cyl(3, 3, .3, 0x4a5068, 0, 0, 0, 12)); cab.add(H.human(0xb57bff, -.8, 0, 1)); cab.add(H.human(0x2fd1c0, .8, .4, 1)); S.add(cab);
    // 地面：树形城市（在 y=100 以上）
    var city = new THREE.Group(); city.position.y = 100;
    for (var i = 0; i < 7; i++) { var x = -60 + i * 20 + (Math.random() - .5) * 8, z = -40 - Math.random() * 60; city.add(H.cyl(1.2, 2, 60, 0x3a2f2a, x, 30, z, 8)); for (var j = 0; j < 10; j++) { var ang = Math.random() * 6.28, rr = 3 + Math.random() * 6, yy = 12 + Math.random() * 44; city.add(H.box(2 + Math.random() * 2, 1.2, 2 + Math.random() * 2, 0x6fd0a0, x + Math.cos(ang) * rr, yy, z + Math.sin(ang) * rr)); city.add(H.box(.08, 3, .08, 0x8a7a6a, x + Math.cos(ang) * rr / 2, yy + 2, z + Math.sin(ang) * rr / 2)); } }
    city.add(H.plane(600, 600, 0x2a3a30, 0, 0, 0)); S.add(city);
    var cityLight = new THREE.PointLight(0xbfffe0, 0, 120); cityLight.position.set(0, 140, -40); S.add(cityLight);
    api.camera.position.set(0, 2.5, 9); api.camera.lookAt(0, 2, 0);
    var rising = false, yv = 0;
    return {
      update: function (dt, t) { if (rising) { yv = Math.min(yv + dt * 3, 28); cab.position.y += yv * dt; api.camera.position.y = cab.position.y + 2.5; api.camera.lookAt(0, cab.position.y + 2 + (cab.position.y > 85 ? (cab.position.y - 85) * .6 : 0), -20); if (cab.position.y > 100) { rising = false; cab.position.y = 100.2; } } if (cab.position.y > 60) { var k = Math.min(1, (cab.position.y - 60) / 40); S.background.setRGB(.05 + k * .45, .07 + k * .6, .12 + k * .5); S.fog.color.copy(S.background); cityLight.intensity = k * 1.2; Lt.dir.intensity = .4 + k * .6; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); b.style.fontSize = '26px'; els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; rising = true; api.sfx('whoosh'); els.note.textContent = '电梯在上升……井壁上的灯一圈圈掠过。'; setTimeout(function () { els.note.textContent = '到地面了。这是危机纪元 205 年的城市：房子像叶子一样挂在大树上。'; }, 5200); setTimeout(function () { finish(true); }, 8200); };
        });
        await api.say(api.kid ? '这里的人对罗辑很客气，但谁也不再把面壁者当回事。他们说：我们现在有两千艘战舰，三体人不够看。' : '人们告诉罗辑：面壁计划早已是历史笑话，人类舰队足以"在太阳系外迎击三体"。他听出来的只有一件事——没人再相信黑暗森林这种东西。');
      }
    };
  };

  /* 8 自然选择号·前进四 */
  SM.Islands.b2_ns = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x02030a);
    lights(api, .5, .6, [20, 20, 20]);
    var starPts = H.stars(2500, 600, -200); S.add(starPts); var arr = starPts.geometry.attributes.position.array;
    var ship = new THREE.Group(); ship.add(H.box(4, 1.1, 10, 0x8a95a8, 0, 0, 0)); ship.add(H.box(1.6, 1.6, 3, 0x6a7488, 0, .9, -2)); [[-1.6, 0], [1.6, 0], [0, .9]].forEach(function (a) { ship.add(H.cyl(.5, .5, 1.4, 0x4a5468, a[0], a[1], 5.4, 8)); }); var ex = H.glow(1.4, 0x2fd1c0, 0, .3, 7, .25); ship.add(ex); ship.position.set(0, 0, -8); S.add(ship);
    var fleet = []; for (var i = 0; i < 60; i++) { var s = H.sph(.08, 0x9fc0ff, (Math.random() - .5) * 80, (Math.random() - .5) * 30, -80 - Math.random() * 80, true); S.add(s); fleet.push(s); }
    api.camera.position.set(-9, 4, 4); api.camera.lookAt(0, 0, -12);
    var go = false, v = 0;
    return {
      update: function (dt, t) { if (go) { v = Math.min(v + dt * 30, 90); for (var i = 0; i < arr.length; i += 3) { arr[i + 2] += v * dt * .8; if (arr[i + 2] > 20) arr[i + 2] -= 700; } starPts.geometry.attributes.position.needsUpdate = true; fleet.forEach(function (f) { f.position.z += v * dt * .6; }); ex.scale.setScalar(1 + v / 30); ex.material.opacity = .25 + v / 200; api.camera.position.x += (-6 - api.camera.position.x) * dt; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var b = api.btn(api.island.interact.btn, true); b.style.cssText = 'font-size:30px;padding:20px 56px;letter-spacing:.2em'; els.opts.appendChild(b);
          b.onclick = function () { b.disabled = true; go = true; api.sfx('sweep'); els.note.textContent = '"前进四。"——全舰所有人都被加速压进了深海状态。'; setTimeout(function () { els.note.textContent = '自然选择号脱离了舰队，向着太阳系外飞去。'; }, 3500); setTimeout(function () { finish(true); }, 6500); };
        });
        await api.say(api.kid ? '几艘飞船追了上去。可谁也没想到，真正的灾难马上就要在他们身后发生。' : '四艘战舰奉命追击。正是这次"叛逃"和追击，让这几艘船恰好远离了舰队——成为末日之战后仅存的人类火种。');
      }
    };
  };

  /* 9 末日之战·水滴 */
  SM.Islands.b2_droplet = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x02030a);
    lights(api, .5, .9, [20, 20, 20]);
    S.add(H.stars(1500, 600, -200));
    var dm = new THREE.MeshPhongMaterial({ color: 0xe8eef6, shininess: 200, specular: 0xffffff }); var drop = new THREE.Group(); var ds = new THREE.Mesh(new THREE.SphereGeometry(1.2, 28, 22), dm); drop.add(ds); var dc = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.6, 28), dm); dc.rotation.z = PI / 2; dc.position.x = 1.8; drop.add(dc); drop.position.set(0, 0, -10); S.add(drop);
    var key = new THREE.PointLight(0xffffff, 1.2, 60); key.position.set(6, 8, 0); S.add(key);
    var n = 400, fleetPos = [], fleet = new THREE.InstancedMesh(new THREE.BoxGeometry(.5, .15, 1), H.mat(0x9fc0ff), n); var o = new THREE.Object3D(); var col = new THREE.Color();
    for (var i = 0; i < n; i++) { var x = (i % 20 - 9.5) * 5, y = (Math.floor(i / 20) % 5 - 2) * 3.5, z = -40 - Math.floor(i / 100) * 14; o.position.set(x, y, z); o.updateMatrix(); fleet.setMatrixAt(i, o.matrix); fleet.setColorAt(i, col.set(0x9fc0ff)); fleetPos.push([x, y, z]); } S.add(fleet);
    var lightsP = new Float32Array(n * 3); for (var j = 0; j < n; j++) { lightsP[j * 3] = fleetPos[j][0]; lightsP[j * 3 + 1] = fleetPos[j][1] + .2; lightsP[j * 3 + 2] = fleetPos[j][2] + .6; } var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lightsP, 3)); var lpts = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffffff, size: .5, transparent: true, opacity: .95 })); S.add(lpts);
    api.camera.position.set(4, 2.5, -2); api.camera.lookAt(0, 0, -10);
    var zoom = 0, released = false, rt = 0, dead = 0, deadFlags = new Uint8Array(n);
    return {
      update: function (dt, t) {
        drop.rotation.y = Math.sin(t * .3) * .2;
        if (!released) { var d = 8 - zoom * 5.5; api.camera.position.set(Math.sin(t * .2) * d * .4 + 2, 1.5 + zoom, -10 + d); api.camera.lookAt(drop.position); }
        else { rt += dt; drop.position.z -= dt * 22; drop.position.x = Math.sin(rt * 3) * 30; drop.position.y = Math.cos(rt * 2.2) * 6; api.camera.position.set(30, 14, -8); api.camera.lookAt(0, 0, -60);
          for (var i = 0; i < n; i++) { if (deadFlags[i]) continue; var p = fleetPos[i]; if (Math.hypot(p[0] - drop.position.x, p[1] - drop.position.y, p[2] - drop.position.z) < 7 || (rt > 4 && Math.random() < dt * 1.2)) { deadFlags[i] = 1; dead++; fleet.setColorAt(i, col.set(0x1a1a22)); fleet.instanceColor.needsUpdate = true; lg.attributes.position.array[i * 3 + 1] = -999; lg.attributes.position.needsUpdate = true; } } }
      },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var r = rangeInput(0, 100, 0); els.body.appendChild(r); var b = api.btn(api.island.interact.btn, true); b.disabled = true; els.opts.appendChild(b);
          els.note.textContent = '拖动滑块，把放大镜推到最大。';
          r.oninput = function () { zoom = r.value / 100; els.note.textContent = zoom < .4 ? '表面像镜子一样。' : zoom < .8 ? '放大一百倍……还是一点痕迹也没有。' : '放到最大：绝对光滑。丁仪说：它根本不是"造"出来的，它是一个完整的东西。'; if (zoom > .95) b.disabled = false; };
          b.onclick = function () { b.disabled = true; r.disabled = true; released = true; api.sfx('boom'); els.note.textContent = '水滴动了。'; setTimeout(function () { els.note.textContent = '它像一颗子弹，在舰队里穿来穿去。灯一盏盏灭掉。'; }, 3000); setTimeout(function () { els.note.textContent = '三十分钟。两千艘战舰。'; }, 7000); setTimeout(function () { finish(true); }, 9500); };
        });
        await api.say(api.kid ? '人类一下子就输光了。而在远处，几艘逃出去的飞船收到了这个消息……' : '末日之战的幸存者只有几艘在边缘或已出逃的飞船。人类同时明白了两件事：三体的技术高到什么程度，以及，太阳系里再没有能打的力量。');
      }
    };
  };

  /* 10 黑暗战役：两难 */
  SM.Islands.b2_darkbattle = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x000004);
    lights(api, .25, .3, [0, 10, 10]);
    S.add(H.stars(1800, 700, -300));
    var shipA = new THREE.Group(); shipA.add(H.box(3, .7, 7, 0x3a4050, 0, 0, 0)); var lA = H.sph(.3, 0x2fd1c0, 0, .7, -2, true); shipA.add(lA); shipA.position.set(-7, 0, -20); S.add(shipA); var gA = H.glow(1, 0x2fd1c0, -7, .7, -22, .3); S.add(gA);
    var shipB = new THREE.Group(); shipB.add(H.box(3, .7, 7, 0x3a4050, 0, 0, 0)); var lB = H.sph(.3, 0x2fd1c0, 0, .7, -2, true); shipB.add(lB); shipB.position.set(9, 1, -30); S.add(shipB); var gB = H.glow(1, 0x2fd1c0, 9, 1.7, -32, .3); S.add(gB);
    api.camera.position.set(0, 3, 0); api.camera.lookAt(0, 0, -25);
    var outcome = null;
    return {
      update: function (dt, t) { gA.material.opacity = .25 + .1 * Math.sin(t * 3); gB.material.opacity = .25 + .1 * Math.sin(t * 3 + 1); if (outcome === 'fire') { lB.material.color.setHex(0x111111); gB.material.opacity = 0; } if (outcome === 'trust') { lA.material.color.setHex(0x111111); gA.material.opacity = 0; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        var I = api.island.interact;
        var r = await pickInteract(api, I.prompt, I.options, function (op, i) { outcome = i === 0 ? 'fire' : 'trust'; return i === 0 ? (api.kid ? '对面的灯灭了。你的船活了下来——可船上的人，从此再也没有说过话。' : '你先开了火。对面的灯灭了。你的船拿到了足够的燃料和零件——以及一种永远洗不掉的东西。') : (api.kid ? '你没有动手。可对面的人和你想的不一样……你的灯灭了。' : '你选择相信。对面的舰长也想过相信——但他不敢赌你也在想同一件事。你的灯灭了。'); });
        this.result = r;
        await api.say(api.kid ? '不管你怎么选，都很难过，对吗？这就是为什么后来人们说：宇宙是一片黑暗森林。' : '无论你怎样选，结局都令人窒息。这正是黑暗战役的意义：没有坏人，只有猜疑链。人类在远离地球的深空里，率先活成了黑暗森林中的猎人。');
      }
    };
  };

  /* 11 咒语应验：望远镜 */
  SM.Islands.b2_spellhit = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x02030a);
    lights(api, .4, .3, [0, 10, 10]);
    S.add(H.ground(0x0a0d18, 300)); S.add(H.cyl(3, 3.4, 3, 0x3a4050, -10, 1.5, -20, 12)); S.add(H.sph(3.2, 0x4a5060, -10, 3.2, -20));
    S.add(H.stars(2500, 500, 5));
    var targetAz = .35; var star = H.sph(.6, 0xffe8a0, Math.sin(targetAz) * 180, 60, -Math.cos(targetAz) * 180, true); S.add(star); var sg = H.glow(1.6, 0xffe8a0, star.position.x, star.position.y, star.position.z, .35); S.add(sg);
    var tel = new THREE.Group(); tel.add(H.cyl(.4, .6, 5, 0x8a92a8, 0, 0, 0, 10)); tel.children[0].rotation.x = -1.1; tel.position.set(0, 2.4, 0); S.add(tel); S.add(H.cyl(.15, .15, 2.4, 0x555, 0, 1.2, 0));
    var ring = new THREE.Mesh(new THREE.RingGeometry(.12, .14, 32), H.basic(0xb57bff, { transparent: true, opacity: .8, side: THREE.DoubleSide })); ring.position.set(0, 0, -1.5); api.camera.add(ring); S.add(api.camera);
    api.camera.position.set(0, 3, 6); api.camera.lookAt(Math.sin(-.6) * 180, 60, -Math.cos(-.6) * 180);
    var az = -.6, found = false, gone = false, ft = 0;
    return {
      update: function (dt, t) { api.camera.lookAt(Math.sin(az) * 180, 60, -Math.cos(az) * 180); if (gone) { ft += dt; if (ft < .4) { star.scale.setScalar(1 + ft * 30); sg.scale.setScalar(1 + ft * 30); } else { star.visible = false; sg.visible = false; } } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var r = rangeInput(-100, 100, -80); els.body.appendChild(r); var b = api.btn(api.island.interact.btn, true); b.disabled = true; els.opts.appendChild(b);
          r.oninput = function () { az = r.value / 100 * .9; var d = Math.abs(az - targetAz); if (d < .05 && !found) { found = true; b.disabled = false; els.note.textContent = '找到了：187J3X1，就在取景圈里。'; } else if (!found) els.note.textContent = d < .2 ? '很近了……' : '继续找。'; };
          b.onclick = function () { b.disabled = true; r.disabled = true; gone = true; api.sfx('softboom'); els.note.textContent = '它忽然亮了一下——然后，没有了。'; setTimeout(function () { els.note.textContent = '两百年前的咒语，应验了。'; }, 2500); setTimeout(function () { finish(true); }, 4500); };
        });
        await api.say(api.kid ? '人们赶紧把罗辑叫醒。可这时候，人类已经没有舰队了。' : '人类终于明白罗辑当年做了什么——一个无辜的恒星系因为一串坐标被毁灭。可理解来得太晚：舰队刚刚覆灭，水滴正朝着太阳飞去。');
      }
    };
  };

  /* 12 黑暗森林法则：三步推理 */
  SM.Islands.b2_law = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x020306); S.fog = new THREE.Fog(0x020306, 20, 90);
    lights(api, .25, .1, [0, 10, 0]);
    S.add(H.ground(0x070a10, 300));
    var f = forestSet(api, 90, 40, [0, 0, -3]);
    var me = H.human(0xb57bff, -1.2, -1, 1); S.add(me); var shi = H.human(0x5a6070, 1.4, -1.5, 1.1); S.add(shi);
    var far = H.glow(1.2, 0xffc94a, 26, 2, -60, 0); S.add(far); var farL = new THREE.PointLight(0xffc94a, 0, 40); farL.position.set(26, 3, -60); S.add(farL);
    api.camera.position.set(0, 3, 6); api.camera.lookAt(2, 1.5, -12);
    var showFar = false, myLight = false, ended = null;
    return {
      update: function (dt, t) { f.light.intensity = 1.4 + .3 * Math.sin(t * 9); if (showFar) { far.material.opacity = .35 + .15 * Math.sin(t * 2); farL.intensity = .8; } if (ended === 'dead') { f.light.intensity = 0; f.glow.material.opacity = 0; } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub(); showFar = true;
        var log = [];
        var a1 = await pickInteract(api, '远处出现了另一个文明的灯火。你能知道它是善良的还是危险的吗？', ['能，看它怎么做就知道', '不能'], function (op, i) { return i === 1 ? '对——你不知道它是善是恶；就算它是善的，它也不知道你是不是；你也不知道它知不知道……这条链子断不了，叫"猜疑链"。' : '可惜星星之间隔着几十上百光年，等你"看它怎么做"，几百年都过去了。你其实不能。这条永远断不了的链子，叫"猜疑链"。'; }); log.push(a1);
        var a2 = await pickInteract(api, '它现在看起来很弱小。放过它，安全吗？', ['安全，它那么弱', '不安全'], function (op, i) { return i === 1 ? '对——今天弱小的文明，几百年后可能远远超过你。人类几百年就从马车到了飞船。这叫"技术爆炸"。' : '人类几百年就从马车到了飞船。今天弱小的它，几百年后可能远远超过你——这叫"技术爆炸"。所以"它现在弱"不是放过它的理由。'; }); log.push(a2);
        var a3 = await pickInteract(api, '那么，你会怎么做？', ['亮起灯，打个招呼', '保持沉默', '开火'], function (op, i) { ended = i === 0 ? 'dead' : 'ok'; myLight = i === 0; return i === 0 ? (api.kid ? '你亮了灯。远处的灯火沉默了一会儿……然后，你的火熄灭了。森林里，暴露自己的人最先消失。' : '你亮了灯。对方面对的是同一条猜疑链和同一个技术爆炸——对它而言，消灭你是代价最低的选择。你的火熄灭了。') : i === 1 ? '你选择沉默。这是森林里大多数猎人的选择——所以宇宙这么安静。' : '你开了火。这是森林里"最安全"的选择——这就是为什么 187J3X1 会被毁灭。'; }); log.push(a3);
        this.result = log.join(' / ');
        await api.say(api.kid ? '这就是罗辑想明白的事：宇宙是一片黑暗森林。每个文明都小心地不出声；谁暴露了自己，谁就会被消灭。叶文洁说出地球的位置，就是在森林里点了一堆火。' : '宇宙是一座黑暗森林：每个文明都是猎人，都在悄无声息地潜行，因为它知道林中还有无数同样的猎人，谁先出声谁先消失。这就是罗辑的答案——也是宇宙为何如此寂静的答案。而叶文洁在 1979 年做的事，是在这片森林里点燃了篝火。');
      }
    };
  };

  /* 13 雪地工程：布一圈核弹 */
  SM.Islands.b2_snow = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x02030a);
    lights(api, .6, .8, [0, 0, 30]);
    S.add(H.stars(1500, 600, -200));
    var sun = H.sph(6, 0xffb347, 0, 0, -40, true); S.add(sun); S.add(H.glow(10, 0xffb347, 0, 0, -40, .25));
    var ringR = 16, N = 10, bombs = [], slots = []; for (var i = 0; i < N; i++) { var a = i / N * PI * 2; var p = new THREE.Vector3(Math.cos(a) * ringR, Math.sin(a) * ringR * .35, -40 + Math.sin(a) * 4); var s = H.glow(.5, 0xffffff, p.x, p.y, p.z, .25); S.add(s); slots.push(s); var b = H.sph(.45, 0xffffff, p.x, p.y, p.z, true); b.visible = false; S.add(b); bombs.push(b); }
    var orbit = new THREE.Mesh(new THREE.TorusGeometry(ringR, .04, 6, 64), H.basic(0xffffff, { transparent: true, opacity: .25 })); orbit.position.set(0, 0, -40); orbit.scale.y = .35; S.add(orbit);
    var film = H.glow(.1, 0xfff1b0, 0, 0, -40, 0); S.add(film);
    api.camera.position.set(0, 6, 0); api.camera.lookAt(0, 0, -40);
    var placed = 0, filmOn = false, ft = 0;
    return {
      update: function (dt, t) { slots.forEach(function (s, i) { s.material.opacity = bombs[i].visible ? 0 : .15 + .15 * Math.sin(t * 4 + i); }); if (filmOn) { ft += dt; film.scale.setScalar(1 + ft * 60); film.material.opacity = Math.max(0, .35 - ft * .08); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center'; els.body.appendChild(wrap); var ok = api.btn(api.island.interact.btn, true); ok.disabled = true; els.opts.appendChild(ok);
          bombs.forEach(function (b, i) { var bt = api.btn('轨道 ' + (i + 1)); bt.className = 'bigbtn small'; wrap.appendChild(bt); bt.onclick = function () { if (b.visible) return; b.visible = true; bt.disabled = true; bt.style.opacity = .4; placed++; els.note.textContent = placed < N ? '已布下 ' + placed + ' / ' + N + ' 枚（书里是三千多枚）。' : '核弹链布好了。每一枚外面都裹着一层油膜。'; if (placed === N) ok.disabled = false; }; });
          ok.onclick = function () { ok.disabled = true; filmOn = true; api.sfx('whoosh'); els.note.textContent = '一旦引爆，油膜散开——太阳就会对全宇宙喊出三体的名字。'; setTimeout(function () { finish(true); }, 3800); };
        });
        await api.say(api.kid ? '这套东西只有一个开关，握在罗辑手里。' : '三千多枚核弹、一个开关——黑暗森林威慑的全部硬件就这么多。剩下的，是一个人站出来的勇气。');
      }
    };
  };

  /* 14 威慑·执剑人：握住不松手 */
  SM.Islands.b2_deterrence = function (api) {
    var H = api.H, S = api.scene; S.background = new THREE.Color(0x9aa4b8); S.fog = new THREE.Fog(0x9aa4b8, 30, 160);
    var Lt = lights(api, 1, .5, [-20, 30, 10]);
    S.add(H.ground(0xeef2f8, 400)); var snow = H.stars(1500, 140, -10); snow.material.size = .25; snow.position.y = 30; S.add(snow);
    for (var i = 0; i < 20; i++) { S.add(H.cone(1.5 + Math.random() * 1.5, 5 + Math.random() * 6, 0x2e3a3a, (Math.random() - .5) * 160, 3, -40 - Math.random() * 100, 6)); }
    var man = H.human(0x3a3f55, 0, -4, 1.1); S.add(man); var sw = H.sph(.22, 0xff3b3b, .5, 1.1, -3.7, true); S.add(sw); var swG = H.glow(.6, 0xff3b3b, .5, 1.1, -3.7, .3); S.add(swG);
    var shi = H.human(0x5a6070, -3, -6, 1.1); S.add(shi);
    var dm = new THREE.MeshPhongMaterial({ color: 0xe8eef6, shininess: 200, specular: 0xffffff }); var drop = new THREE.Group(); var ds = new THREE.Mesh(new THREE.SphereGeometry(.9, 24, 18), dm); drop.add(ds); var dc = new THREE.Mesh(new THREE.ConeGeometry(.9, 2.6, 24), dm); dc.rotation.z = -PI / 2; dc.position.x = -1.3; drop.add(dc); drop.position.set(6, 9, -30); S.add(drop);
    api.camera.position.set(3, 3, 5); api.camera.lookAt(0, 2, -12);
    var holding = false, yielded = false, yt = 0;
    return {
      update: function (dt, t) { snow.position.y = 30 - (t * 1.2 % 40); swG.material.opacity = holding ? .5 + .3 * Math.sin(t * 12) : .2 + .1 * Math.sin(t * 3); if (yielded) { yt += dt; drop.position.z -= dt * 25; drop.position.y += dt * 8; S.background.lerp(new THREE.Color(0xcfe0f2), dt * .5); S.fog.color.copy(S.background); } },
      run: async function () {
        await api.say(api.txt(api.island.say)); api.hideSub();
        await api.interact(api.island.interact.prompt, function (els, finish) {
          var hb = document.createElement('button'); hb.className = 'holdbtn'; hb.innerHTML = '<i></i><span>' + api.island.interact.btn + '</span>'; els.body.appendChild(hb); var fill = hb.querySelector('i'); var t0 = 0, timer = null, done = false;
          function start(e) { e.preventDefault(); if (done) return; holding = true; t0 = Date.now(); timer = setInterval(function () { var k = Math.min(1, (Date.now() - t0) / 3000); fill.style.height = (k * 100) + '%'; els.note.textContent = k < 1 ? '握住…… ' + Math.ceil(3 - k * 3) + '（别松手）' : ''; if (k >= 1) { clearInterval(timer); done = true; yielded = true; api.sfx('resolve'); els.note.textContent = '三体世界让步了。水滴掉头，舰队转向。威慑建立。'; setTimeout(function () { finish(true); }, 3600); } }, 50); }
          function end() { if (done) return; holding = false; clearInterval(timer); fill.style.height = '0%'; els.note.textContent = '你松手了——在书里，松手就是同归于尽。再来一次：威慑就是一直握着。'; }
          hb.onmousedown = start; hb.ontouchstart = start; hb.onmouseup = end; hb.onmouseleave = end; hb.ontouchend = end;
        });
        await api.say(api.kid ? '从这一天起，罗辑成了"执剑人"。他一个人握着开关，守了五十四年。第二部讲完了。' : '威慑纪元开始。罗辑从面壁者变成执剑人，在接下来的五十四年里独自维持着这个平衡——直到人类决定把剑交给另一个人。《黑暗森林》到此为止，《死神永生》从那次交接开始。');
      }
    };
  };
})();
