/* 星河世界：三色河道、13 座岛、玩家与向导、相机 */
SM.World = (function () {
  var scene, camera, renderer, clock;
  var curve, SAMPLES = 800, samplePts = [], sampleTans = [], sampleLats = [];
  var ribbons = {}, flows = [], riverBed, islands = [], gate;
  var player, guide, playerT = 0.02, targetT = 0.02, SPEED = 0.028; // 每秒前进的 u
  var camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  var raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
  var UP = new THREE.Vector3(0, 1, 0), keys = {}, holdDir = 0;
  var onNear = null, curLine = null, onLineChange = null, frozen = false;
  var N = SM.ISLANDS.length;

  /* ---------- 几何小工具 ---------- */
  function mat(c, opt) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, opt || {})); }
  function box(w, h, d, c, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x || 0, y || 0, z || 0); return m; }
  function cyl(rt, rb, h, c, x, y, z, seg) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 8), mat(c)); m.position.set(x || 0, y || 0, z || 0); return m; }
  function sph(r, c, x, y, z, emis) { var m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(c, emis ? { emissive: c, emissiveIntensity: 1 } : {})); m.position.set(x || 0, y || 0, z || 0); return m; }
  function cone(r, h, c, x, y, z) { return cyl(0, r, h, c, x, y, z, 6); }
  function glow(r, c, x, y, z, op) { var m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: (op === undefined ? .35 : op), blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(x, y, z); return m; }
  function label(text, color, scale) {
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 192; var g = cv.getContext('2d');
    g.font = 'bold 72px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 16; g.fillStyle = color; g.fillText(text, 512, 96);
    var tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set((scale || 1) * 16, (scale || 1) * 3, 1); return sp;
  }

  /* ---------- 河道 ---------- */
  function ribbonOffset(line, u) {
    // 三条线横向摆动交织，u>0.87 后收束汇合
    var conv = u > 0.87 ? Math.max(0, (1 - u) / 0.13) : 1;
    var a = 4.2 * conv;
    if (line === 'past') return a * Math.sin(u * 19 + 0.3);
    if (line === 'now') return a * Math.sin(u * 19 + 2.4);
    if (line === 'game') return a * Math.sin(u * 19 + 4.5);
    return 0;
  }
  function buildCurve() {
    var pts = []; var L = 520;
    for (var i = 0; i <= 14; i++) { var f = i / 14; pts.push(new THREE.Vector3(f * L, 0, Math.sin(f * 7.3) * 22 + Math.cos(f * 3.1) * 14)); }
    curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    for (var k = 0; k <= SAMPLES; k++) {
      var u = k / SAMPLES; var p = curve.getPointAt(u); var t = curve.getTangentAt(u).normalize();
      samplePts.push(p); sampleTans.push(t); sampleLats.push(new THREE.Vector3().crossVectors(UP, t).normalize());
    }
  }
  function posOn(u, lateral, y) { // 河道参数 → 世界坐标
    u = Math.max(0, Math.min(1, u)); var k = u * SAMPLES, i = Math.floor(k), f = k - i; if (i >= SAMPLES) { i = SAMPLES - 1; f = 1; }
    var p = samplePts[i].clone().lerp(samplePts[i + 1], f); var lat = sampleLats[i].clone().lerp(sampleLats[i + 1], f).normalize();
    return p.addScaledVector(lat, lateral || 0).setY(y || 0);
  }
  function tanAt(u) { var k = Math.max(0, Math.min(SAMPLES - 1, Math.floor(u * SAMPLES))); return sampleTans[k]; }

  function buildRibbon(line, color, width) {
    var segs = 600, pos = [], idx = [], col = [];
    for (var i = 0; i <= segs; i++) {
      var u = i / segs; var off = ribbonOffset(line, u); var c = posOn(u, off, 0.02);
      var lat = sampleLats[Math.min(SAMPLES - 1, Math.floor(u * SAMPLES))];
      var a = c.clone().addScaledVector(lat, width / 2), b = c.clone().addScaledVector(lat, -width / 2);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      var fade = line === 'merge' ? Math.min(1, Math.max(0, (u - 0.86) / 0.08)) : (line !== 'merge' && u > 0.9 ? Math.max(0, (1 - u) / 0.1) : 1);
      col.push(fade, fade, fade, fade, fade, fade);
      if (i < segs) { var o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: color, vertexColors: true, transparent: true, opacity: .55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(m);
    // 外发光：一条更宽更淡的
    var g2 = g.clone(); var pos2 = g2.attributes.position.array;
    for (var j = 0; j < pos2.length; j += 6) { var ax = pos2[j], az = pos2[j + 2], bx = pos2[j + 3], bz = pos2[j + 5]; var mx = (ax + bx) / 2, mz = (az + bz) / 2; pos2[j] = mx + (ax - mx) * 2.6; pos2[j + 2] = mz + (az - mz) * 2.6; pos2[j + 3] = mx + (bx - mx) * 2.6; pos2[j + 5] = mz + (bz - mz) * 2.6; }
    var m2 = new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ color: color, vertexColors: true, transparent: true, opacity: .14, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(m2); ribbons[line] = m;
    // 流动粒子
    var n = 160, fp = new Float32Array(n * 3), us = [];
    for (var q = 0; q < n; q++) { us.push(Math.random()); }
    var fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    var fm = new THREE.Points(fg, new THREE.PointsMaterial({ color: color, size: .45, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(fm); flows.push({ line: line, us: us, geo: fg, pts: fm });
  }
  function updateFlows(dt) {
    flows.forEach(function (f) {
      var arr = f.geo.attributes.position.array;
      for (var i = 0; i < f.us.length; i++) {
        f.us[i] += dt * 0.012; if (f.us[i] > 1) f.us[i] -= 1;
        var u = f.us[i]; if (f.line === 'merge' && u < 0.87) { u = 0.87 + (u % 0.13); }
        var p = posOn(u, ribbonOffset(f.line, u) + (Math.sin(i * 7.1) * 0.5), 0.25 + Math.sin(i + u * 50) * .15);
        arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
      }
      f.geo.attributes.position.needsUpdate = true;
    });
  }
  function buildRiverBed() {
    var segs = 300, pos = [], idx = [];
    for (var i = 0; i <= segs; i++) {
      var u = i / segs; var c = posOn(u, 0, -0.05); var lat = sampleLats[Math.min(SAMPLES - 1, Math.floor(u * SAMPLES))];
      var a = c.clone().addScaledVector(lat, 11), b = c.clone().addScaledVector(lat, -11);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); if (i < segs) { var o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    riverBed = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x101634, transparent: true, opacity: .55, side: THREE.DoubleSide }));
    scene.add(riverBed);
  }

  /* ---------- 星空 ---------- */
  function buildStars() {
    var n = 5000, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var r = 600 + Math.random() * 900, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      p[i * 3] = 260 + r * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = r * Math.cos(ph) * .6; p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      var b = .5 + Math.random() * .5, tint = Math.random(); c[i * 3] = b * (tint < .2 ? 1 : .85); c[i * 3 + 1] = b * .9; c[i * 3 + 2] = b * (tint > .8 ? 1 : .95);
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: .9 })));
    // 星云色块
    [[0x2a3a8a, 90, 180, -60, 220], [0x6a2a7a, 70, 420, 40, -260], [0x1d5a6a, 60, 300, -30, 300]].forEach(function (a) {
      var m = glow(a[1], a[0], a[2], a[3], a[4], .08); scene.add(m);
    });
  }

  /* ---------- 岛屿微缩景观 ---------- */
  function diorama(id) {
    var g = new THREE.Group();
    switch (id) {
      case 'qinghua': g.add(box(3.2, 1.6, 2, 0x6b5545, 0, .8, 0)); g.add(box(3.6, .3, 2.4, 0x4a3a30, 0, 1.75, 0)); g.add(cyl(.06, .06, 3.2, 0xcccccc, 2.2, 1.6, .6)); g.add(box(.9, .55, .05, 0xd33, 2.65, 2.9, .6)); var tr = cone(.9, 2, 0x2f4a2f, -2.4, 1.5, -.4); g.add(tr); g.add(cyl(.12, .14, .7, 0x4a3a30, -2.4, .35, -.4)); break;
      case 'hongan': g.add(cone(3, 3.2, 0x4b5a6b, 0, 1.6, 0)); g.add(cone(1.8, 2, 0x5c6e80, 1.8, 1, 1.2)); g.add(cyl(.15, .2, 1.4, 0x999, 0, 3.8, 0)); var d = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.8, .12), new THREE.Vector2(1.5, .5), new THREE.Vector2(1.9, .95)], 16), mat(0xdedede, { side: THREE.DoubleSide })); d.position.set(0, 4.5, 0); d.rotation.x = -0.6; g.add(d); break;
      case 'launch': g.add(cone(2.6, 2.6, 0x4b5a6b, 0, 1.3, 0)); g.add(cyl(.15, .2, 1.2, 0x999, 0, 3.2, 0)); var d2 = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.8, .12), new THREE.Vector2(1.5, .5), new THREE.Vector2(1.9, .95)], 16), mat(0xdedede, { side: THREE.DoubleSide })); d2.position.set(0, 3.8, 0); d2.rotation.x = -1.1; g.add(d2); g.add(sph(1.1, 0xffb347, 2.8, 6, -2.2, true)); g.add(glow(2, 0xffb347, 2.8, 6, -2.2, .3)); break;
      case 'countdown': [[-1.6, 2.2], [-.4, 3.4], [.8, 2.8], [2, 1.8], [-2.6, 1.4]].forEach(function (a) { g.add(box(1, a[1], 1, 0x2a3350, a[0], a[1] / 2, 0)); }); var lb = label('1187:27:06', '#ff4b4b', .45); lb.position.set(0, 4.6, 0); g.add(lb); break;
      case 'flicker': g.add(cyl(1.2, 1.4, 1.2, 0x8a92a8, 0, .6, 0)); g.add(sph(1.25, 0xb8c0d8, 0, 1.3, 0)); g.add(cyl(.25, .25, 2.2, 0x666, .5, 2.3, 0)); for (var i = 0; i < 8; i++) { var s = sph(.12, 0xffffff, Math.cos(i) * 2.5, 3.5 + Math.sin(i * 2) * 1.2, Math.sin(i) * 2.5, true); s.userData.tw = i; g.add(s); } g.userData.stars = g.children.slice(3); break;
      case 'eras': g.add(cyl(3.4, 3.6, .3, 0xb08a55, 0, .15, 0, 10)); g.add(cone(.9, 1.2, 0x9a7a4a, -1.5, .9, .8)); g.add(cone(.6, .8, 0x9a7a4a, 1.6, .7, -.6)); [[-1.4, 3.6, -1], [0.4, 4.4, 1.2], [2, 3.4, 0]].forEach(function (a, i) { g.add(sph(.45 + i * .1, 0xffb347, a[0], a[1], a[2], true)); }); g.add(box(.3, 1, .5, 0x6a4a2a, 0, .8, 1.6)); break;
      case 'computer': var im = new THREE.InstancedMesh(new THREE.BoxGeometry(.22, .5, .22), mat(0xcfcfcf), 400); var dm = new THREE.Object3D(), k = 0; for (var x = 0; x < 20; x++) for (var z = 0; z < 20; z++) { dm.position.set((x - 9.5) * .3, .25 + ((x + z) % 3 === 0 ? .2 : 0), (z - 9.5) * .3); dm.updateMatrix(); im.setMatrixAt(k, dm.matrix); im.setColorAt(k, new THREE.Color((x * 7 + z * 3) % 5 === 0 ? 0x222222 : 0xeeeeee)); k++; } g.add(im); g.add(box(6.4, .2, 6.4, 0x5a4a30, 0, -.1, 0)); break;
      case 'noanswer': g.add(box(3.4, 2.2, .3, 0x222a44, 0, 1.6, 0)); g.add(box(3, 1.8, .1, 0x102030, 0, 1.6, .18)); var w = label('不要回答！', '#ff3b3b', .32); w.position.set(0, 1.75, .4); g.add(w); var w2 = label('不要回答！不要回答！', '#ff3b3b', .2); w2.position.set(0, 1.1, .4); g.add(w2); g.add(box(.4, .5, .4, 0x334, 0, .25, .9)); break;
      case 'truth': [[-2.2, 3.2, 0], [0, 3.2, 0], [2.2, 3.2, 0]].forEach(function (a) { g.add(sph(.7, 0xffb347, a[0], a[1], a[2], true)); g.add(glow(1.2, 0xffb347, a[0], a[1], a[2], .25)); }); var pl = sph(1.1, 0x8a5a3a, 0, .9, 1.2); g.add(pl); g.add(box(2.3, .08, .25, 0x1a0a05, 0, .9, 2.2)); break;
      case 'answer': g.add(cone(2.6, 2.4, 0x4b3a3a, 0, 1.2, 0)); g.add(cyl(.15, .2, 1.2, 0x999, 0, 3, 0)); var d3 = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.8, .12), new THREE.Vector2(1.5, .5), new THREE.Vector2(1.9, .95)], 16), mat(0xdedede, { side: THREE.DoubleSide })); d3.position.set(0, 3.6, 0); d3.rotation.x = -1.3; g.add(d3); var beam = cyl(.08, .4, 7, 0xff5a3c, 0, 7.3, 0, 6); beam.material = new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: .6 }); g.add(beam); break;
      case 'judgment': g.add(box(6.5, .9, 1.8, 0x3a3f55, 0, .5, 0)); g.add(box(1.6, 1.2, 1.4, 0xb9c0d0, 1.8, 1.5, 0)); g.add(box(.3, 1, .3, 0x444, 2.4, 2.6, 0)); g.add(box(4.8, .15, 1.9, 0x555a70, -.4, 1, 0)); var wt = box(9, .05, 5, 0x1d3a5a, 0, 0, 0); wt.material.transparent = true; wt.material.opacity = .8; g.add(wt); break;
      case 'zither': g.add(box(9, .05, 5, 0x1d3a5a, 0, 0, 0)); g.add(box(2, .6, 5, 0x4a5a3a, -3.5, .3, 0)); g.add(box(2, .6, 5, 0x4a5a3a, 3.5, .3, 0)); g.add(cyl(.15, .2, 3, 0xbbb, -2.6, 2, 0)); g.add(cyl(.15, .2, 3, 0xbbb, 2.6, 2, 0)); for (var y = .9; y < 3.4; y += .35) { var ln = box(5.2, .02, .02, 0xaaffff, 0, y, 0); ln.material = new THREE.MeshBasicMaterial({ color: 0xaaffff, transparent: true, opacity: .5 }); g.add(ln); } g.add(box(2.2, .5, .9, 0x3a3f55, 0, .45, 1.4)); break;
      case 'bugs': g.add(cyl(3.6, 3.8, .3, 0xc9a84a, 0, .15, 0, 10)); var wf = new THREE.InstancedMesh(new THREE.ConeGeometry(.08, .9, 4), mat(0xe2c66a), 300); var o = new THREE.Object3D(); for (var q = 0; q < 300; q++) { var r = Math.random() * 3.2, a2 = Math.random() * 6.28; o.position.set(Math.cos(a2) * r, .75, Math.sin(a2) * r); o.updateMatrix(); wf.setMatrixAt(q, o.matrix); } g.add(wf); var lp = new Float32Array(240 * 3); for (var j = 0; j < 240; j++) { lp[j * 3] = (Math.random() - .5) * 6; lp[j * 3 + 1] = 1.5 + Math.random() * 3; lp[j * 3 + 2] = (Math.random() - .5) * 6; } var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); var lpts = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0x3a2a10, size: .16 })); g.add(lpts); g.userData.locust = lpts; break;
    }
    return g;
  }
  function buildIslands() {
    var ring = { past: 0xff5a3c, now: 0x3fa9ff, game: 0xffc94a, merge: 0xf4f1ff };
    SM.ISLANDS.forEach(function (isl, i) {
      var u = (i + 1) / (N + 1) * 0.95 + 0.02; isl.u = u;
      var off = ribbonOffset(isl.line, u); var side = isl.line === 'merge' ? (i % 2 ? 1 : -1) : (off >= 0 ? 1 : -1);
      var lateral = off + side * 7.5; isl.lateral = lateral; isl.side = side;
      var pos = posOn(u, lateral, 0); var g = new THREE.Group(); g.position.copy(pos);
      var plat = cyl(4.2, 3.2, 1.4, 0x1c2236, 0, -.7, 0, 9); g.add(plat);
      var rock = cyl(2.4, .4, 2.4, 0x141a2c, 0, -2.6, 0, 7); g.add(rock);
      var rg = new THREE.Mesh(new THREE.TorusGeometry(4.5, .09, 8, 48), new THREE.MeshBasicMaterial({ color: ring[isl.line], transparent: true, opacity: .85 })); rg.rotation.x = Math.PI / 2; rg.position.y = .05; g.add(rg); isl.ring = rg;
      var d = diorama(isl.id); g.add(d); isl.dio = d;
      var lb = label('第' + (i + 1) + '站 · ' + isl.title, SM.LINES[isl.line].css, .7); lb.position.set(0, 7.6, 0); g.add(lb); isl.label = lb;
      // 岛与河道之间的小桥（光带）
      var br = box(Math.abs(side * 7.5) - 3.6, .06, 1.2, ring[isl.line], 0, 0, 0); br.material = new THREE.MeshBasicMaterial({ color: ring[isl.line], transparent: true, opacity: .35 });
      var lat = sampleLats[Math.min(SAMPLES - 1, Math.floor(u * SAMPLES))]; var mid = posOn(u, off + side * (3.6 + (7.5 - 3.6) / 2 - 0.0), 0.03);
      br.position.copy(mid); br.lookAt(mid.clone().add(lat)); br.rotation.y += Math.PI / 2; scene.add(br);
      // 站点标记：河道上的光点
      var mk = glow(.9, ring[isl.line], 0, 0, 0, .5); mk.position.copy(posOn(u, 0, .3)); scene.add(mk); isl.marker = mk;
      g.userData.floatPhase = i; isl.group = g; scene.add(g); islands.push(isl);
    });
    // 终点：黑暗森林之门
    gate = new THREE.Group(); var gp = posOn(0.995, 0, 0); gate.position.copy(gp); var t = tanAt(0.99); gate.lookAt(gp.clone().add(t)); gate.rotation.y += 0;
    gate.add(box(1.2, 9, 1.2, 0x0d1020, -3.2, 4.5, 0)); gate.add(box(1.2, 9, 1.2, 0x0d1020, 3.2, 4.5, 0)); gate.add(box(8.2, 1, 1.2, 0x0d1020, 0, 9.3, 0));
    var portal = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 8), new THREE.MeshBasicMaterial({ color: 0x05040c, transparent: true, opacity: .95, side: THREE.DoubleSide })); portal.position.set(0, 4.5, 0); gate.add(portal);
    var gl = label('黑暗森林之门 · 第二部（敬请期待）', '#c9c4ff', .75); gl.position.set(0, 11.5, 0); gate.add(gl);
    // 门周围的幽暗树影
    for (var k = 0; k < 14; k++) { var ang = (k / 14) * Math.PI * 2, rr = 9 + Math.random() * 8; var tr = cone(1.2 + Math.random(), 5 + Math.random() * 5, 0x0b0f1a, Math.cos(ang) * rr, 3, Math.sin(ang) * rr - 6); gate.add(tr); }
    scene.add(gate);
  }

  /* ---------- 玩家 / 向导 ---------- */
  function buildPlayer() {
    player = new THREE.Group();
    var body = cyl(.35, .45, 1.1, 0xe8ecff, 0, .75, 0, 10); player.add(body);
    var head = sph(.36, 0xfff2e0, 0, 1.65, 0); player.add(head);
    var hl = glow(.9, 0x9fc0ff, 0, 1, 0, .18); player.add(hl);
    var pl = new THREE.PointLight(0x9fc0ff, .9, 18); pl.position.set(0, 2.5, 0); player.add(pl);
    scene.add(player);
    guide = new THREE.Group();
    guide.add(sph(.32, 0xbfd4ff, 0, 0, 0, true)); guide.add(glow(.7, 0x9fc0ff, 0, 0, 0, .35));
    var rg = new THREE.Mesh(new THREE.TorusGeometry(.55, .04, 8, 32), new THREE.MeshBasicMaterial({ color: 0xdfe8ff })); rg.rotation.x = 1.2; guide.add(rg); guide.userData.ring = rg;
    scene.add(guide);
  }

  /* ---------- 初始化 ---------- */
  function init(r) {
    renderer = r; clock = new THREE.Clock();
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070f); scene.fog = new THREE.FogExp2(0x05070f, 0.0065);
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    scene.add(new THREE.HemisphereLight(0x8ea0ff, 0x1a1020, .9));
    var sun = new THREE.DirectionalLight(0xffffff, .55); sun.position.set(80, 120, -60); scene.add(sun);
    buildCurve(); buildStars(); buildRiverBed();
    buildRibbon('past', SM.LINES.past.color, 1.5); buildRibbon('now', SM.LINES.now.color, 1.5); buildRibbon('game', SM.LINES.game.color, 1.5); buildRibbon('merge', SM.LINES.merge.color, 2.2);
    buildIslands(); buildPlayer();
    var p0 = posOn(playerT, 0, 0); camPos.copy(p0).add(new THREE.Vector3(-10, 6, 0)); camLook.copy(p0);
    window.addEventListener('keydown', function (e) { keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
    renderer.domElement.addEventListener('click', onClick);
  }
  function onClick(e) {
    if (frozen || !riverBed) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var hits = raycaster.intersectObjects([riverBed].concat(islands.map(function (i) { return i.group.children[0]; })), false);
    if (!hits.length) return; var p = hits[0].point;
    // 找最近的 u
    var best = 0, bd = 1e9; for (var k = 0; k <= SAMPLES; k += 2) { var d = samplePts[k].distanceToSquared(p); if (d < bd) { bd = d; best = k; } }
    targetT = best / SAMPLES;
  }

  /* ---------- 每帧 ---------- */
  function nearestIsland() {
    var best = null, bd = 1e9; islands.forEach(function (i) { var d = Math.abs(i.u - playerT); if (d < bd) { bd = d; best = i; } });
    return { isl: best, d: bd };
  }
  function update(dt) {
    dt = Math.min(dt, 0.05);
    // 输入
    var dir = holdDir; if (keys['w'] || keys['arrowup']) dir = 1; if (keys['s'] || keys['arrowdown']) dir = -1;
    if (!frozen && dir !== 0) targetT = Math.max(0.01, Math.min(0.985, playerT + dir * SPEED * dt * 1.0 + (dir * 0.0015)));
    // 到未完成的岛自动停靠
    var nr = nearestIsland();
    if (!frozen && dir > 0 && nr.isl && !SM.State.isDone(nr.isl.id) && playerT < nr.isl.u && targetT > nr.isl.u) targetT = nr.isl.u;
    // 移动
    var dT = targetT - playerT; var step = SPEED * dt; if (Math.abs(dT) > step) playerT += Math.sign(dT) * step; else playerT = targetT;
    playerT = Math.max(0.01, Math.min(0.985, playerT));
    var p = posOn(playerT, 0, 0), t = tanAt(playerT);
    player.position.copy(p); player.lookAt(p.clone().add(t));
    var bob = Math.sin(clock.elapsedTime * 3) * .1; player.position.y = bob;
    // 向导在玩家左后上方
    var lat = new THREE.Vector3().crossVectors(UP, t).normalize();
    var gp = p.clone().addScaledVector(lat, 1.6).addScaledVector(t, -.6); gp.y = 2.2 + Math.sin(clock.elapsedTime * 2.2) * .2;
    guide.position.lerp(gp, 0.08); guide.userData.ring.rotation.z += dt * 1.5; guide.userData.ring.rotation.x = 1.2 + Math.sin(clock.elapsedTime) * .3;
    // 相机：靠近岛时把视线偏向岛
    var nearK = Math.max(0, 1 - nr.d / 0.03);
    var want = p.clone().addScaledVector(t, -13).addScaledVector(lat, -2.5 - nearK * nr.isl.side * -3); want.y = 8 + nearK * 2;
    camPos.lerp(want, 1 - Math.pow(0.02, dt)); var lookW = p.clone().addScaledVector(t, 8); lookW.y = 1.2;
    if (nearK > 0) lookW.lerp(nr.isl.group.position.clone().setY(2.5), nearK * .6);
    camLook.lerp(lookW, 1 - Math.pow(0.02, dt));
    camera.position.copy(camPos); camera.lookAt(camLook);
    // 岛屿浮动 / 标记呼吸 / 标签近了就淡出
    islands.forEach(function (i) { i.group.position.y = Math.sin(clock.elapsedTime * .8 + i.group.userData.floatPhase) * .25; i.ring.material.opacity = .5 + .4 * Math.sin(clock.elapsedTime * 2 + i.group.userData.floatPhase); if (SM.State.isDone(i.id)) { i.marker.material.opacity = .15; }
      var dl = i.group.position.distanceTo(p); i.label.material.opacity = Math.max(0, Math.min(1, (dl - 10) / 14));
      if (i.dio.userData.stars) i.dio.userData.stars.forEach(function (s, k) { s.visible = Math.sin(clock.elapsedTime * 4 + k) > -0.2; });
      if (i.dio.userData.locust) { i.dio.userData.locust.rotation.y += dt * .6; } });
    updateFlows(dt);
    // 靠近岛提示
    var near = (nr.d < 0.012) ? nr.isl : null; if (onNear) onNear(near);
    // 线段变化
    var ahead = islands.filter(function (i) { return i.u >= playerT - 0.012; })[0]; var line = ahead ? ahead.line : 'merge';
    if (line !== curLine) { var prev = curLine; curLine = line; if (prev && onLineChange) onLineChange(line); }
  }
  function render() { renderer.render(scene, camera); }
  function resize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); }
  function travelTo(u) { targetT = Math.max(0.01, Math.min(0.985, u)); }
  function jumpTo(u) { playerT = targetT = Math.max(0.01, Math.min(0.985, u)); var p = posOn(playerT, 0, 0), t = tanAt(playerT); camPos.copy(p).addScaledVector(t, -11).setY(6.5); camLook.copy(p); }

  return { init: init, update: update, render: render, resize: resize, travelTo: travelTo, jumpTo: jumpTo,
    setHold: function (d) { holdDir = d; }, setFrozen: function (f) { frozen = f; keys = {}; holdDir = 0; }, onNear: function (f) { onNear = f; }, onLineChange: function (f) { onLineChange = f; },
    getT: function () { return playerT; }, islands: function () { return islands; }, camera: function () { return camera; } };
})();
