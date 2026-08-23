/* 星河世界：多河段（每部一段）、三色河道、岛、纪元之门、冬眠隧道、玩家与向导、相机 */
SM.World = (function () {
  var scene, camera, renderer, clock;
  var NB = SM.BOOKS.length, SEG_LEN = 520, L = SEG_LEN * NB, SAMPLES = 800 * NB;
  var curve, samplePts = [], sampleTans = [], sampleLats = [];
  var flows = [], riverBed, islands = [], gates = [], eraGates = [], tunnels = [];
  var player, guide, playerT = 0.02 / NB, targetT = 0.02 / NB, SPEED = 0.028 / NB; // 每秒前进的 u
  var camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  var raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
  var UP = new THREE.Vector3(0, 1, 0), keys = {}, holdDir = 0;
  var onNear = null, curLine = null, onLineChange = null, curBook = -1, onBookChange = null, frozen = false;
  var THEMES = { stars: { bg: new THREE.Color(0x05070f), fog: 0.0065 }, forest: { bg: new THREE.Color(0x020308), fog: 0.012 }, space: { bg: new THREE.Color(0x03030c), fog: 0.0035 } };
  var themeBg = new THREE.Color(0x05070f), themeFog = 0.0065;

  /* ---------- 几何小工具 ---------- */
  function mat(c, opt) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, opt || {})); }
  function box(w, h, d, c, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x || 0, y || 0, z || 0); return m; }
  function cyl(rt, rb, h, c, x, y, z, seg) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 8), mat(c)); m.position.set(x || 0, y || 0, z || 0); return m; }
  function sph(r, c, x, y, z, emis) { var m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(c, emis ? { emissive: c, emissiveIntensity: 1 } : {})); m.position.set(x || 0, y || 0, z || 0); return m; }
  function cone(r, h, c, x, y, z) { return cyl(0, r, h, c, x, y, z, 6); }
  function glow(r, c, x, y, z, op) { var m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: (op === undefined ? .35 : op), blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(x, y, z); return m; }
  function label(text, color, scale, sub) {
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = sub ? 256 : 192; var g = cv.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 16; g.fillStyle = color;
    g.font = 'bold 72px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'; g.fillText(text, 512, sub ? 80 : 96);
    if (sub) { g.font = '40px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'; g.fillStyle = '#cfd6ff'; g.fillText(sub, 512, 180); }
    var tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set((scale || 1) * 16, (scale || 1) * (sub ? 4 : 3), 1); return sp;
  }

  /* ---------- 参数工具：u 全河 [0,1]；book 段内 s ---------- */
  function bookOf(u) { return Math.min(NB - 1, Math.max(0, Math.floor(u * NB))); }
  function sOf(u) { return u * NB - bookOf(u); }
  function uOf(b, s) { return (b + s) / NB; }

  /* ---------- 河道 ---------- */
  function ribbonOffset(line, u) {
    var b = bookOf(u), s = sOf(u), lines = SM.BOOKS[b].lines;
    var idx = lines.indexOf(line); if (idx < 0 && line !== 'past') return 0;
    if (line === 'past' && b > 0) idx = 0; // 余烬沿第一条线
    var conv = s > 0.87 ? Math.max(0, (1 - s) / 0.13) : 1;
    var start = b > 0 ? Math.min(1, s / 0.06) : 1;
    var a = 4.2 * conv * start; var ph = [0.3, 2.4, 4.5][idx];
    return a * Math.sin(s * 19 + ph);
  }
  function buildCurve() {
    var pts = []; var n = 14 * NB;
    for (var i = 0; i <= n; i++) { var f = i / n; pts.push(new THREE.Vector3(f * L, 0, Math.sin(f * 7.3 * NB) * 22 + Math.cos(f * 3.1 * NB) * 14)); }
    curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    for (var k = 0; k <= SAMPLES; k++) {
      var u = k / SAMPLES; var p = curve.getPointAt(u); var t = curve.getTangentAt(u).normalize();
      samplePts.push(p); sampleTans.push(t); sampleLats.push(new THREE.Vector3().crossVectors(UP, t).normalize());
    }
  }
  function posOn(u, lateral, y) {
    u = Math.max(0, Math.min(1, u)); var k = u * SAMPLES, i = Math.floor(k), f = k - i; if (i >= SAMPLES) { i = SAMPLES - 1; f = 1; }
    var p = samplePts[i].clone().lerp(samplePts[i + 1], f); var lat = sampleLats[i].clone().lerp(sampleLats[i + 1], f).normalize();
    return p.addScaledVector(lat, lateral || 0).setY(y || 0);
  }
  function latAt(u) { return sampleLats[Math.max(0, Math.min(SAMPLES - 1, Math.floor(u * SAMPLES)))]; }
  function tanAt(u) { return sampleTans[Math.max(0, Math.min(SAMPLES - 1, Math.floor(u * SAMPLES)))]; }

  /* 一段河道：line 在 [u0,u1] 上，fadeFn(s)→0..1 */
  function buildRibbon(line, color, width, u0, u1, fadeFn, flowN) {
    var segs = 600, pos = [], idx = [], col = [];
    for (var i = 0; i <= segs; i++) {
      var u = u0 + (u1 - u0) * i / segs; var s = (i / segs); var off = ribbonOffset(line, u); var c = posOn(u, off, 0.02); var lat = latAt(u);
      var a = c.clone().addScaledVector(lat, width / 2), b = c.clone().addScaledVector(lat, -width / 2);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      var fade = fadeFn(s); col.push(fade, fade, fade, fade, fade, fade);
      if (i < segs) { var o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: color, vertexColors: true, transparent: true, opacity: .55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })));
    var g2 = g.clone(); var pos2 = g2.attributes.position.array;
    for (var j = 0; j < pos2.length; j += 6) { var ax = pos2[j], az = pos2[j + 2], bx = pos2[j + 3], bz = pos2[j + 5]; var mx = (ax + bx) / 2, mz = (az + bz) / 2; pos2[j] = mx + (ax - mx) * 2.6; pos2[j + 2] = mz + (az - mz) * 2.6; pos2[j + 3] = mx + (bx - mx) * 2.6; pos2[j + 5] = mz + (bz - mz) * 2.6; }
    scene.add(new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ color: color, vertexColors: true, transparent: true, opacity: .14, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })));
    if (flowN) {
      var fp = new Float32Array(flowN * 3), us = []; for (var q = 0; q < flowN; q++) us.push(Math.random());
      var fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
      var fm = new THREE.Points(fg, new THREE.PointsMaterial({ color: color, size: .45, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene.add(fm); flows.push({ line: line, us: us, geo: fg, u0: u0, u1: u1, fadeFn: fadeFn });
    }
  }
  function buildRibbons() {
    for (var b = 0; b < NB; b++) {
      var u0 = b / NB, u1 = (b + 1) / NB, B = SM.BOOKS[b];
      B.lines.forEach(function (ln) { buildRibbon(ln, SM.LINES[ln].color, 1.5, u0, u1, function (s) { return s > 0.9 ? Math.max(0, (1 - s) / 0.1) : 1; }, 160); });
      // 汇合白河：段尾汇合；下一段开头再分开
      buildRibbon('merge', SM.LINES.merge.color, 2.2, u0, u1, function (s) { var tail = Math.min(1, Math.max(0, (s - 0.86) / 0.08)); var head = b > 0 ? Math.max(0, 1 - s / 0.06) : 0; return Math.max(tail, head); }, 120);
      // 红线余烬：第二部开头沿第一条线淡出
      if (b > 0) buildRibbon('past', SM.LINES.past.color, 1.2, u0, u0 + 0.12 / NB, function (s) { return Math.max(0, 1 - s); }, 0);
    }
  }
  function updateFlows(dt) {
    flows.forEach(function (f) {
      var arr = f.geo.attributes.position.array;
      for (var i = 0; i < f.us.length; i++) {
        f.us[i] += dt * 0.012; if (f.us[i] > 1) f.us[i] -= 1;
        var s = f.us[i]; if (f.fadeFn(s) < 0.05) { s = (s + 0.5) % 1; if (f.fadeFn(s) < 0.05) { arr[i * 3 + 1] = -50; continue; } }
        var u = f.u0 + (f.u1 - f.u0) * s;
        var p = posOn(u, ribbonOffset(f.line, u) + (Math.sin(i * 7.1) * 0.5), 0.25 + Math.sin(i + s * 50) * .15);
        arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
      }
      f.geo.attributes.position.needsUpdate = true;
    });
  }
  function buildRiverBed() {
    var segs = 300 * NB, pos = [], idx = [];
    for (var i = 0; i <= segs; i++) {
      var u = i / segs; var c = posOn(u, 0, -0.05); var lat = latAt(u);
      var a = c.clone().addScaledVector(lat, 11), b = c.clone().addScaledVector(lat, -11);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); if (i < segs) { var o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    riverBed = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x101634, transparent: true, opacity: .55, side: THREE.DoubleSide }));
    scene.add(riverBed);
  }

  /* ---------- 星空 / 森林 ---------- */
  function buildStars() {
    var n = 6000, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var r = 600 + Math.random() * 1000, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      p[i * 3] = L / 2 + r * Math.sin(ph) * Math.cos(th) * 1.4; p[i * 3 + 1] = r * Math.cos(ph) * .6; p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      var b = .5 + Math.random() * .5, tint = Math.random(); c[i * 3] = b * (tint < .2 ? 1 : .85); c[i * 3 + 1] = b * .9; c[i * 3 + 2] = b * (tint > .8 ? 1 : .95);
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: .9 })));
    [[0x2a3a8a, 90, 180, -60, 220], [0x6a2a7a, 70, 420, 40, -260], [0x1d5a6a, 60, 300, -30, 300]].forEach(function (a) { scene.add(glow(a[1], a[0], a[2], a[3], a[4], .08)); });
  }
  function buildForest(b) {
    var u0 = b / NB, u1 = (b + 1) / NB, n = 1500;
    var im = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), mat(0x0d1320), n); var o = new THREE.Object3D();
    for (var i = 0; i < n; i++) {
      var u = u0 + Math.random() * (u1 - u0); var side = Math.random() < .5 ? -1 : 1; var lat = side * (17 + Math.random() * 40);
      var h = 9 + Math.random() * 18, r = 1.6 + Math.random() * 2.6; var p = posOn(u, lat, h / 2 - 1);
      o.position.copy(p); o.scale.set(r, h, r); o.rotation.y = Math.random() * 6.28; o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    }
    scene.add(im);
    // 萤火
    var m = 400, fp = new Float32Array(m * 3); for (var j = 0; j < m; j++) { var uu = u0 + Math.random() * (u1 - u0); var pp = posOn(uu, (Math.random() - .5) * 70, 1 + Math.random() * 6); fp[j * 3] = pp.x; fp[j * 3 + 1] = pp.y; fp[j * 3 + 2] = pp.z; }
    var fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    var ff = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0x9fe0a0, size: .35, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(ff); forestFire = ff;
  }
  var forestFire = null;
  /* 第三部：河升入太空——两岸星云、远处掩体太空城、脚下虚空星尘 */
  function buildSpace(b) {
    var u0 = b / NB, u1 = (b + 1) / NB;
    for (var i = 0; i < 14; i++) { var u = u0 + Math.random() * (u1 - u0); var side = i % 2 ? 1 : -1; var p = posOn(u, side * (60 + Math.random() * 60), 20 + Math.random() * 40); scene.add(glow(30 + Math.random() * 40, [0x3a2a7a, 0x1d4a6a, 0x6a2a5a, 0x2a3a8a][i % 4], p.x, p.y, p.z, .07)); }
    for (var k = 0; k < 10; k++) { var uu = u0 + (k + .5) / 10 * (u1 - u0); var sd = k % 2 ? 1 : -1; var g = new THREE.Group(); var c = posOn(uu, sd * (28 + Math.random() * 16), 6 + Math.random() * 10); g.position.copy(c);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(3 + Math.random() * 2, .5, 8, 24), mat(0x3a4258)); ring.rotation.x = Math.random(); ring.rotation.y = Math.random(); g.add(ring); g.add(cyl(.5, .5, 2, 0x4a5268, 0, 0, 0, 8)); g.userData.spin = .1 + Math.random() * .2; scene.add(g); spaceCities.push(g); }
    var m = 1500, fp = new Float32Array(m * 3); for (var j = 0; j < m; j++) { var uj = u0 + Math.random() * (u1 - u0); var pp = posOn(uj, (Math.random() - .5) * 140, -4 - Math.random() * 60); fp[j * 3] = pp.x; fp[j * 3 + 1] = pp.y; fp[j * 3 + 2] = pp.z; }
    var fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    scene.add(new THREE.Points(fg, new THREE.PointsMaterial({ color: 0x9fb4ff, size: .5, transparent: true, opacity: .6 })));
  }
  var spaceCities = [];

  /* ---------- 岛屿微缩景观 ---------- */
  function dishMesh() { return new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.8, .12), new THREE.Vector2(1.5, .5), new THREE.Vector2(1.9, .95)], 16), mat(0xdedede, { side: THREE.DoubleSide })); }
  function humanMini(c, x, z, s) { var g = new THREE.Group(); s = s || 1; g.add(cyl(.22 * s, .28 * s, .9 * s, c, 0, .45 * s, 0)); g.add(sph(.2 * s, 0xf1d9c0, 0, 1.1 * s, 0)); g.position.set(x, 0, z); return g; }
  function diorama(id) {
    var g = new THREE.Group();
    switch (id) {
      /* ---- 第一部 ---- */
      case 'qinghua': g.add(box(3.2, 1.6, 2, 0x6b5545, 0, .8, 0)); g.add(box(3.6, .3, 2.4, 0x4a3a30, 0, 1.75, 0)); g.add(cyl(.06, .06, 3.2, 0xcccccc, 2.2, 1.6, .6)); g.add(box(.9, .55, .05, 0xd33, 2.65, 2.9, .6)); g.add(cone(.9, 2, 0x2f4a2f, -2.4, 1.5, -.4)); g.add(cyl(.12, .14, .7, 0x4a3a30, -2.4, .35, -.4)); break;
      case 'hongan': g.add(cone(3, 3.2, 0x4b5a6b, 0, 1.6, 0)); g.add(cone(1.8, 2, 0x5c6e80, 1.8, 1, 1.2)); g.add(cyl(.15, .2, 1.4, 0x999, 0, 3.8, 0)); var d = dishMesh(); d.position.set(0, 4.5, 0); d.rotation.x = -0.6; g.add(d); break;
      case 'launch': g.add(cone(2.6, 2.6, 0x4b5a6b, 0, 1.3, 0)); g.add(cyl(.15, .2, 1.2, 0x999, 0, 3.2, 0)); var d2 = dishMesh(); d2.position.set(0, 3.8, 0); d2.rotation.x = -1.1; g.add(d2); g.add(sph(1.1, 0xffb347, 2.8, 6, -2.2, true)); g.add(glow(2, 0xffb347, 2.8, 6, -2.2, .3)); break;
      case 'countdown': [[-1.6, 2.2], [-.4, 3.4], [.8, 2.8], [2, 1.8], [-2.6, 1.4]].forEach(function (a) { g.add(box(1, a[1], 1, 0x2a3350, a[0], a[1] / 2, 0)); }); var lb = label('1187:27:06', '#ff4b4b', .45); lb.position.set(0, 4.6, 0); g.add(lb); break;
      case 'flicker': g.add(cyl(1.2, 1.4, 1.2, 0x8a92a8, 0, .6, 0)); g.add(sph(1.25, 0xb8c0d8, 0, 1.3, 0)); g.add(cyl(.25, .25, 2.2, 0x666, .5, 2.3, 0)); for (var i = 0; i < 8; i++) { var s = sph(.12, 0xffffff, Math.cos(i) * 2.5, 3.5 + Math.sin(i * 2) * 1.2, Math.sin(i) * 2.5, true); g.add(s); } g.userData.stars = g.children.slice(3); break;
      case 'eras': g.add(cyl(3.4, 3.6, .3, 0xb08a55, 0, .15, 0, 10)); g.add(cone(.9, 1.2, 0x9a7a4a, -1.5, .9, .8)); g.add(cone(.6, .8, 0x9a7a4a, 1.6, .7, -.6)); [[-1.4, 3.6, -1], [0.4, 4.4, 1.2], [2, 3.4, 0]].forEach(function (a, i) { g.add(sph(.45 + i * .1, 0xffb347, a[0], a[1], a[2], true)); }); g.add(box(.3, 1, .5, 0x6a4a2a, 0, .8, 1.6)); break;
      case 'computer': var im = new THREE.InstancedMesh(new THREE.BoxGeometry(.22, .5, .22), mat(0xcfcfcf), 400); var dm = new THREE.Object3D(), k = 0; for (var x = 0; x < 20; x++) for (var z = 0; z < 20; z++) { dm.position.set((x - 9.5) * .3, .25 + ((x + z) % 3 === 0 ? .2 : 0), (z - 9.5) * .3); dm.updateMatrix(); im.setMatrixAt(k, dm.matrix); im.setColorAt(k, new THREE.Color((x * 7 + z * 3) % 5 === 0 ? 0x222222 : 0xeeeeee)); k++; } g.add(im); g.add(box(6.4, .2, 6.4, 0x5a4a30, 0, -.1, 0)); break;
      case 'noanswer': g.add(box(3.4, 2.2, .3, 0x222a44, 0, 1.6, 0)); g.add(box(3, 1.8, .1, 0x102030, 0, 1.6, .18)); var w = label('不要回答！', '#ff3b3b', .32); w.position.set(0, 1.75, .4); g.add(w); var w2 = label('不要回答！不要回答！', '#ff3b3b', .2); w2.position.set(0, 1.1, .4); g.add(w2); g.add(box(.4, .5, .4, 0x334, 0, .25, .9)); break;
      case 'truth': [[-2.2, 3.2, 0], [0, 3.2, 0], [2.2, 3.2, 0]].forEach(function (a) { g.add(sph(.7, 0xffb347, a[0], a[1], a[2], true)); g.add(glow(1.2, 0xffb347, a[0], a[1], a[2], .25)); }); g.add(sph(1.1, 0x8a5a3a, 0, .9, 1.2)); g.add(box(2.3, .08, .25, 0x1a0a05, 0, .9, 2.2)); break;
      case 'answer': g.add(cone(2.6, 2.4, 0x4b3a3a, 0, 1.2, 0)); g.add(cyl(.15, .2, 1.2, 0x999, 0, 3, 0)); var d3 = dishMesh(); d3.position.set(0, 3.6, 0); d3.rotation.x = -1.3; g.add(d3); var beam = cyl(.08, .4, 7, 0xff5a3c, 0, 7.3, 0, 6); beam.material = new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: .6 }); g.add(beam); break;
      case 'judgment': g.add(box(6.5, .9, 1.8, 0x3a3f55, 0, .5, 0)); g.add(box(1.6, 1.2, 1.4, 0xb9c0d0, 1.8, 1.5, 0)); g.add(box(.3, 1, .3, 0x444, 2.4, 2.6, 0)); g.add(box(4.8, .15, 1.9, 0x555a70, -.4, 1, 0)); var wt = box(9, .05, 5, 0x1d3a5a, 0, 0, 0); wt.material.transparent = true; wt.material.opacity = .8; g.add(wt); break;
      case 'zither': g.add(box(9, .05, 5, 0x1d3a5a, 0, 0, 0)); g.add(box(2, .6, 5, 0x4a5a3a, -3.5, .3, 0)); g.add(box(2, .6, 5, 0x4a5a3a, 3.5, .3, 0)); g.add(cyl(.15, .2, 3, 0xbbb, -2.6, 2, 0)); g.add(cyl(.15, .2, 3, 0xbbb, 2.6, 2, 0)); for (var y = .9; y < 3.4; y += .35) { var ln = box(5.2, .02, .02, 0xaaffff, 0, y, 0); ln.material = new THREE.MeshBasicMaterial({ color: 0xaaffff, transparent: true, opacity: .5 }); g.add(ln); } g.add(box(2.2, .5, .9, 0x3a3f55, 0, .45, 1.4)); break;
      case 'bugs': g.add(cyl(3.6, 3.8, .3, 0xc9a84a, 0, .15, 0, 10)); var wf = new THREE.InstancedMesh(new THREE.ConeGeometry(.08, .9, 4), mat(0xe2c66a), 300); var o = new THREE.Object3D(); for (var q = 0; q < 300; q++) { var r = Math.random() * 3.2, a2 = Math.random() * 6.28; o.position.set(Math.cos(a2) * r, .75, Math.sin(a2) * r); o.updateMatrix(); wf.setMatrixAt(q, o.matrix); } g.add(wf); var lp = new Float32Array(240 * 3); for (var j = 0; j < 240; j++) { lp[j * 3] = (Math.random() - .5) * 6; lp[j * 3 + 1] = 1.5 + Math.random() * 3; lp[j * 3 + 2] = (Math.random() - .5) * 6; } var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); var lpts = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0x3a2a10, size: .16 })); g.add(lpts); g.userData.locust = lpts; break;
      /* ---- 第二部 ---- */
      case 'b2_axioms': g.add(box(1.6, 2.2, .3, 0x5a5f6e, 0, 1.1, -.5)); g.add(box(2.2, .3, 1.2, 0x4a4f5e, 0, .15, -.2)); g.add(humanMini(0x8a7aa8, -1.6, 1.2, .9)); g.add(humanMini(0x6a6a7a, 1.4, 1.4, .8)); var emb = glow(1.2, 0xff5a3c, 0, 1.2, -.5, .2); g.add(emb); g.userData.ember = emb; g.add(cone(1, 2.6, 0x1a2a1a, -2.8, 1.5, -1.5)); g.add(cone(.8, 2, 0x1a2a1a, 2.8, 1.2, -1.8)); break;
      case 'b2_wallfacer': g.add(box(6, .6, 3, 0x2a3550, 0, .3, 0)); g.add(box(6.4, 3, .3, 0x1c2440, 0, 2.1, -1.5)); [-2.1, -.7, .7, 2.1].forEach(function (x, i) { g.add(humanMini([0x8a8aa0, 0x7a6a5a, 0x6a7a8a, 0xb57bff][i], x, .3, .85)); g.add(box(.6, .7, .4, 0x3a4560, x, .95, 1)); }); var ul = label('面 壁 者', '#9fc0ff', .3); ul.position.set(0, 3.2, -1.2); g.add(ul); break;
      case 'b2_luoji': g.add(cyl(3.8, 4, .2, 0xe8ecf4, 0, .1, 0, 10)); var lake = cyl(2, 2, .1, 0x3a6aa8, 1.8, .16, 1.2, 14); g.add(lake); g.add(box(1.8, 1.3, 1.6, 0x6a4a3a, -1.6, .75, -.6)); g.add(cone(1.5, 1, 0x8a3a2a, -1.6, 1.9, -.6)); g.add(box(.3, .3, .05, 0xffd27a, -1.6, .9, .22)); g.add(cone(.8, 2.4, 0x2a3a2a, -3, 1.3, 1.5)); g.add(cone(.6, 1.8, 0x2a3a2a, 1, 1, -2.4)); break;
      case 'b2_wallbreaker': [[-1.6, 0], [0, .6], [1.6, 0]].forEach(function (a, i) { var m = sph(.6, [0x8a8aa0, 0x7a6a5a, 0x6a7a8a][i], a[0], 1.2, a[1]); g.add(m); var crack = box(.06, .9, .06, 0xffc94a, a[0], 1.2, a[1] + .58); crack.rotation.z = .3; g.add(crack); }); g.add(cyl(2.6, 2.8, .2, 0x2a2a36, 0, .1, 0, 10)); var ml = label('破壁人', '#ffc94a', .3); ml.position.set(0, 2.6, 0); g.add(ml); break;
      case 'b2_zhang': g.add(cyl(.5, .6, 3.2, 0xcfd4dc, 0, 1.8, 0, 10)); g.add(cone(.5, 1, 0xff7a5a, 0, 3.9, 0)); [0, 1, 2, 3].forEach(function (i) { var f = box(.15, 1, .6, 0x8a95a8, Math.cos(i * 1.57) * .6, .6, Math.sin(i * 1.57) * .6); f.rotation.y = -i * 1.57; g.add(f); }); var ex = glow(.8, 0x6ac0ff, 0, .0, 0, .35); g.add(ex); g.add(sph(.7, 0x5a4a3a, 2.4, 1.4, -1.2)); g.add(humanMini(0x2fd1c0, -1.8, 1.2, .9)); break;
      case 'b2_spell': g.add(cone(2.4, 2.2, 0x3a3a4a, 0, 1.1, 0)); g.add(cyl(.15, .2, 1.2, 0x999, 0, 2.8, 0)); var d4 = dishMesh(); d4.position.set(0, 3.4, 0); d4.rotation.x = -1.2; g.add(d4); g.add(sph(1, 0xffb347, 2.6, 5.6, -2.2, true)); var pb = cyl(.06, .3, 5, 0xb57bff, 1.3, 4.8, -1.1, 6); pb.material = new THREE.MeshBasicMaterial({ color: 0xb57bff, transparent: true, opacity: .6 }); pb.lookAt(2.6, 5.6, -2.2); pb.rotateX(Math.PI / 2); g.add(pb); break;
      case 'b2_ravine': g.add(cyl(.6, .9, 5.5, 0x3a2f2a, 0, 2.7, 0, 8)); [[1.2, 3.2, .4], [-1.3, 4, -.3], [.9, 4.8, -.9], [-1, 2.4, .9], [1.5, 4.2, 1.1]].forEach(function (a) { g.add(box(.8, .5, .8, 0x6fd0a0, a[0], a[1], a[2])); g.add(box(.06, .6, .06, 0x8a7a6a, a[0] / 2, a[1] + .5, a[2] / 2)); }); g.add(cyl(3, 3.2, .3, 0x2a3a30, 0, .15, 0, 10)); break;
      case 'b2_ns': var sh = box(5, .9, 1.4, 0x8a95a8, 0, 1.2, 0); g.add(sh); g.add(box(1.2, 1.4, 1.8, 0x6a7488, -1.4, 1.3, 0)); g.add(cyl(.5, .5, 1, 0x4a5468, 2.8, 1.2, 0, 8)); var ex2 = glow(1.1, 0x2fd1c0, 3.6, 1.2, 0, .45); g.add(ex2); g.userData.exhaust = ex2; break;
      case 'b2_droplet': var dr = new THREE.Group(); var dm2 = new THREE.MeshPhongMaterial({ color: 0xdfe6f0, shininess: 160, specular: 0xffffff }); var ds = new THREE.Mesh(new THREE.SphereGeometry(.7, 20, 16), dm2); dr.add(ds); var dc = new THREE.Mesh(new THREE.ConeGeometry(.7, 2, 20), dm2); dc.rotation.z = Math.PI / 2; dc.position.x = 1; dr.add(dc); dr.position.set(0, 2.4, 0); g.add(dr); for (var q2 = 0; q2 < 40; q2++) { g.add(sph(.07, 0x9fc0ff, -3.5 + (q2 % 8) * 1, 1 + Math.floor(q2 / 8) * .45, -2 + ((q2 * 7) % 5) * .8, true)); } break;
      case 'b2_darkbattle': [[-2, 1], [2.2, -1]].forEach(function (a, i) { g.add(box(2.2, .5, .8, 0x3a4050, a[0], 1, a[1])); var lt = sph(.18, i ? 0x222 : 0x2fd1c0, a[0] + (i ? -1.2 : 1.2), 1.1, a[1], true); g.add(lt); }); g.add(cyl(3, 3.2, .15, 0x0b0d16, 0, .05, 0, 10)); break;
      case 'b2_spellhit': g.add(cyl(1.2, 1.4, 1.2, 0x7a8298, 0, .6, 0)); g.add(sph(1.25, 0x9aa2b8, 0, 1.3, 0)); g.add(cyl(.22, .22, 2.4, 0x555, .6, 2.5, 0)); var st = sph(.45, 0xffe8a0, 2.2, 4.6, -1.2, true); g.add(st); g.userData.star = st; var sg = glow(1, 0xffe8a0, 2.2, 4.6, -1.2, .3); g.add(sg); g.userData.starGlow = sg; break;
      case 'b2_law': for (var tI = 0; tI < 9; tI++) { var ang = tI / 9 * 6.28; g.add(cone(.9 + Math.random() * .5, 3.5 + Math.random() * 2, 0x0b1018, Math.cos(ang) * 3.2, 2, Math.sin(ang) * 3.2)); } g.add(cyl(.5, .7, .3, 0x3a2a1a, 0, .15, 0, 6)); var fire = glow(.7, 0xff8a3a, 0, .7, 0, .6); g.add(fire); g.userData.fire = fire; var hm = humanMini(0xb57bff, -.9, .9, .8); g.add(hm); break;
      case 'b2_snow': g.add(sph(1.1, 0xffb347, 0, 2.6, 0, true)); g.add(glow(1.9, 0xffb347, 0, 2.6, 0, .25)); for (var rI = 0; rI < 14; rI++) { var an = rI / 14 * 6.28; g.add(sph(.14, 0xffffff, Math.cos(an) * 2.6, 2.6, Math.sin(an) * 2.6, true)); } var rg = new THREE.Mesh(new THREE.TorusGeometry(2.6, .03, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .4 })); rg.rotation.x = Math.PI / 2; rg.position.y = 2.6; g.add(rg); break;
      /* ---- 第三部 ---- */
      case 'b3_star': g.add(humanMini(0xff7aa8, -.8, .6, .9)); g.add(sph(.5, 0xffb6d0, 1.6, 4.2, -1.2, true)); g.add(glow(1.1, 0xffb6d0, 1.6, 4.2, -1.2, .3)); for (var si = 0; si < 12; si++) g.add(sph(.08, 0xffffff, (Math.random() - .5) * 6, 2 + Math.random() * 4, (Math.random() - .5) * 6, true)); break;
      case 'b3_staircase': var sl2 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ color: 0xdfe6f5, side: THREE.DoubleSide, transparent: true, opacity: .85 })); sl2.position.set(0, 2.6, 0); sl2.rotation.y = .4; g.add(sl2); g.add(sph(.18, 0xffb6d0, 0, 2.6, -.8, true)); for (var bi = 0; bi < 4; bi++) g.add(sph(.12, 0xfff1b0, -1.2 - bi * .9, 1.2 + bi * .3, 1.5 + bi * .6, true)); break;
      case 'b3_sword': g.add(cyl(1.2, 1.4, .8, 0x3a4560, 0, .4, 0, 10)); g.add(sph(.28, 0xff3b3b, 0, 1.1, 0, true)); g.add(glow(.7, 0xff3b3b, 0, 1.1, 0, .25)); g.add(humanMini(0xb57bff, -1.6, 1, .9)); g.add(humanMini(0xff7aa8, 1.6, 1, .9)); break;
      case 'b3_fail': g.add(cyl(.25, .4, 4, 0x8a95a8, 0, 2, 0, 8)); g.add(cyl(.9, .9, .25, 0x6a7488, 0, 4.1, 0, 8)); var dr3 = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), new THREE.MeshPhongMaterial({ color: 0xdfe6f0, shininess: 160, specular: 0xffffff })); dr3.position.set(2.2, 3.6, -1); g.add(dr3); g.add(humanMini(0xff7aa8, -1.4, 1.4, .9)); break;
      case 'b3_4d': var cb = box(1.6, 1.6, 1.6, 0x8a95a8, 0, 2, 0); cb.material.transparent = true; cb.material.opacity = .35; g.add(cb); g.add(sph(.35, 0xffc94a, 0, 2, 0, true)); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 1.6, 1.6)), new THREE.LineBasicMaterial({ color: 0xffffff }))); g.children[g.children.length - 1].position.set(0, 2, 0); for (var fi = 0; fi < 8; fi++) { var sh = box(.5, .15, .5, [0xff7aa8, 0x2fd1c0, 0x9fc0ff, 0xffc94a][fi % 4], (Math.random() - .5) * 5, 1 + Math.random() * 3, (Math.random() - .5) * 5); sh.rotation.set(Math.random(), Math.random(), 0); g.add(sh); } break;
      case 'b3_triend': g.add(cyl(1.2, 1.4, 1.2, 0x7a8298, 0, .6, 0)); g.add(sph(1.25, 0x9aa2b8, 0, 1.3, 0)); var st3 = sph(.6, 0xffd070, 2.2, 4.6, -1.2, true); g.add(st3); g.userData.star = st3; var sg3 = glow(1.3, 0xffd070, 2.2, 4.6, -1.2, .3); g.add(sg3); g.userData.starGlow = sg3; break;
      case 'b3_tales': g.add(box(2.4, .15, 1.8, 0xf4f1ea, -.7, 1, 0)); g.add(box(2.4, .15, 1.8, 0xf4f1ea, .7, 1.05, 0)); g.children[g.children.length - 2].rotation.z = .18; g.children[g.children.length - 1].rotation.z = -.18; g.add(cyl(.3, .4, 1, 0x6a4a2a, 0, .5, 0, 6)); g.add(sph(.2, 0xffd36b, -.6, 1.6, .2, true)); g.add(sph(.2, 0x7fd0ff, .2, 1.8, -.2, true)); g.add(sph(.2, 0xc9a0d0, .9, 1.5, .3, true)); break;
      case 'b3_bunker': g.add(sph(.6, 0xffb347, 0, 2, 0, true)); [[2.2, .45, 0xc9a06a], [3.1, .35, 0xe0c890]].forEach(function (p, i) { var ang = .6 + i * 1.4; var pl = sph(p[1], p[2], Math.cos(ang) * p[0], 2, Math.sin(ang) * p[0]); g.add(pl); for (var ci = 0; ci < 3; ci++) g.add(box(.12, .12, .3, 0xcfd6ff, Math.cos(ang) * (p[0] + .8) + (Math.random() - .5) * .5, 2 + (Math.random() - .5) * .5, Math.sin(ang) * (p[0] + .8) + (Math.random() - .5) * .5)); }); break;
      case 'b3_wade': var rng = new THREE.Mesh(new THREE.TorusGeometry(1.8, .35, 8, 28), mat(0x8a95a8)); rng.position.y = 2.2; rng.rotation.x = .5; g.add(rng); g.add(cyl(.35, .35, .8, 0x6a7488, 0, 2.2, 0, 8)); g.add(humanMini(0x5a6070, -1.6, 1.6, .9)); break;
      case 'b3_singer': var sg4 = glow(1, 0xcfd3de, -1, 2, 0, .45); g.add(sg4); g.userData.singer = sg4; var fl = new THREE.Mesh(new THREE.PlaneGeometry(.6, .4), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); fl.position.set(1.2, 2.4, .5); fl.rotation.y = .6; g.add(fl); break;
      case 'b3_flat': var pcv = document.createElement('canvas'); pcv.width = 256; pcv.height = 256; var pg = pcv.getContext('2d'); pg.fillStyle = '#0b1a4a'; pg.fillRect(0, 0, 256, 256); for (var pi = 0; pi < 160; pi++) { pg.strokeStyle = ['#2f6fb8', '#8fb8e8', '#ffd36b', '#1e3f8a'][pi % 4]; pg.lineWidth = 2 + Math.random() * 3; var a0 = Math.random() * 6.28; pg.beginPath(); pg.arc(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 20, a0, a0 + 2); pg.stroke(); } pg.fillStyle = '#ffd36b'; pg.beginPath(); pg.arc(128, 128, 14, 0, 7); pg.fill(); var ptex = new THREE.CanvasTexture(pcv); var pm = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), new THREE.MeshBasicMaterial({ map: ptex, side: THREE.DoubleSide })); pm.rotation.x = -Math.PI / 2; pm.position.y = .08; g.add(pm); var shp = box(.3, .15, .8, 0xffb6d0, 2.6, 1.2, 2.6); g.add(shp); break;
      case 'b3_blue': g.add(sph(1.4, 0x3f8fd8, -1.4, 1.8, 0)); g.add(sph(.7, 0x8a8f98, 2, 1.4, -1)); var dl = box(.04, .04, 5, 0xffffff, 2.6, 2.6, 0); dl.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5 }); dl.rotation.y = .5; g.add(dl); break;
      case 'b3_647': g.add(box(2.6, 1.4, .6, 0x6a6a6a, -.8, .7, 0)); var dr4 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, side: THREE.DoubleSide })); dr4.position.set(1.8, .95, 0); g.add(dr4); g.add(box(.1, 2, .1, 0x3a3a4a, 1.25, 1, 0)); g.add(box(.1, 2, .1, 0x3a3a4a, 2.35, 1, 0)); break;
      case 'b3_end': g.add(cyl(3.4, 3.6, .3, 0x7fb86a, 0, .15, 0, 10)); g.add(box(1.4, .9, 1.1, 0xe8e0d0, -1.6, .75, -.6)); g.add(cone(1.1, .6, 0x9a5a4a, -1.6, 1.5, -.6)); var eb = sph(.3, 0x7fd0ff, .8, .6, .8); eb.material.transparent = true; eb.material.opacity = .8; g.add(eb); g.add(glow(.6, 0x9fe0ff, .8, .6, .8, .3)); g.add(box(.08, 1.8, .08, 0x3a3a4a, 2, .9, -.6)); g.add(box(.08, 1.8, .08, 0x3a3a4a, 2.8, .9, -.6)); g.add(box(.9, .08, .08, 0x3a3a4a, 2.4, 1.8, -.6)); break;
      case 'b2_deterrence': g.add(cyl(3.6, 3.8, .2, 0xe8ecf4, 0, .1, 0, 10)); var man = humanMini(0x3a3f55, 0, .4, 1.1); g.add(man); var sw = sph(.16, 0xff3b3b, .35, 1.0, .3, true); g.add(sw); g.userData.sw = sw; var dsm = new THREE.MeshPhongMaterial({ color: 0xdfe6f0, shininess: 160, specular: 0xffffff }); var dd = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 12), dsm); dd.position.set(1.8, 4.2, -1.5); g.add(dd); g.add(cone(.7, 2, 0x1a2a2a, -2.6, 1.1, -1.2)); g.add(cone(.6, 1.6, 0x1a2a2a, 2.4, .9, 1.6)); break;
    }
    return g;
  }
  function buildIslands() {
    var counts = {}; SM.ISLANDS.forEach(function (i) { counts[i.book] = (counts[i.book] || 0) + 1; }); var local = {};
    SM.ISLANDS.forEach(function (isl, i) {
      var b = isl.book - 1; local[b] = (local[b] || 0); var li = local[b]++; var n = counts[isl.book];
      var s = (li + 1) / (n + 1) * 0.95 + 0.02; var u = uOf(b, s); isl.u = u; isl.s = s; isl.localIndex = li;
      var off = ribbonOffset(isl.line === 'merge' ? SM.BOOKS[b].lines[0] : isl.line, u); if (isl.line === 'merge') off = 0;
      var side = isl.line === 'merge' ? (li % 2 ? 1 : -1) : (off >= 0 ? 1 : -1);
      var lateral = off + side * 7.5; isl.lateral = lateral; isl.side = side;
      var pos = posOn(u, lateral, 0); var g = new THREE.Group(); g.position.copy(pos);
      var plat = cyl(4.2, 3.2, 1.4, b === 0 ? 0x1c2236 : b === 1 ? 0x141a22 : 0x1a1e34, 0, -.7, 0, 9); g.add(plat);
      g.add(cyl(2.4, .4, 2.4, 0x141a2c, 0, -2.6, 0, 7));
      var ringC = SM.LINES[isl.line].color;
      var rg = new THREE.Mesh(new THREE.TorusGeometry(4.5, .09, 8, 48), new THREE.MeshBasicMaterial({ color: ringC, transparent: true, opacity: .85 })); rg.rotation.x = Math.PI / 2; rg.position.y = .05; g.add(rg); isl.ring = rg;
      var d = diorama(isl.id); g.add(d); isl.dio = d;
      if (b === 1) { var pl = new THREE.PointLight(0xff9a4a, 1.2, 16); pl.position.set(0, 2, 0); g.add(pl); isl.fireLight = pl; var fg = glow(.5, 0xff9a4a, 2.6, .5, 2.2, .5); g.add(fg); isl.fireGlow = fg; g.add(cyl(.35, .5, .25, 0x3a2a1a, 2.6, .12, 2.2, 6)); }
      var lb = label('第' + (li + 1) + '站 · ' + isl.title, SM.LINES[isl.line].css, .7); lb.position.set(0, 7.6, 0); g.add(lb); isl.label = lb;
      var br = box(Math.abs(side * 7.5) - 3.6, .06, 1.2, ringC, 0, 0, 0); br.material = new THREE.MeshBasicMaterial({ color: ringC, transparent: true, opacity: .35 });
      var lat = latAt(u); var mid = posOn(u, off + side * (3.6 + (7.5 - 3.6) / 2), 0.03);
      br.position.copy(mid); br.lookAt(mid.clone().add(lat)); br.rotation.y += Math.PI / 2; scene.add(br);
      var mk = glow(.9, ringC, 0, 0, 0, .5); mk.position.copy(posOn(u, 0, .3)); scene.add(mk); isl.marker = mk;
      g.userData.floatPhase = i; isl.group = g; scene.add(g); islands.push(isl);
    });
  }
  /* 每部结尾的门 */
  function buildGates() {
    SM.BOOKS.forEach(function (B, b) {
      var u = uOf(b, 0.995); var gate = new THREE.Group(); var gp = posOn(u, 0, 0); gate.position.copy(gp); var t = tanAt(u); gate.lookAt(gp.clone().add(t));
      gate.add(box(1.2, 9, 1.2, 0x0d1020, -3.2, 4.5, 0)); gate.add(box(1.2, 9, 1.2, 0x0d1020, 3.2, 4.5, 0)); gate.add(box(8.2, 1, 1.2, 0x0d1020, 0, 9.3, 0));
      var portal = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 8), new THREE.MeshBasicMaterial({ color: b === 0 ? 0x05040c : 0x0a0a14, transparent: true, opacity: b < NB - 1 ? .35 : .95, side: THREE.DoubleSide })); portal.position.set(0, 4.5, 0); gate.add(portal);
      var gl = label(B.gate, '#c9c4ff', .75, B.gateSub || undefined); gl.position.set(0, 11.8, 0); gate.add(gl);
      for (var k = 0; k < 14; k++) { var ang = (k / 14) * Math.PI * 2, rr = 9 + Math.random() * 8; gate.add(cone(1.2 + Math.random(), 5 + Math.random() * 5, 0x0b0f1a, Math.cos(ang) * rr, 3, Math.sin(ang) * rr - 6)); }
      scene.add(gate); gates.push(gate);
    });
    // 纪元之门
    (SM.ERAS || []).forEach(function (E) {
      var u = uOf(E.book - 1, E.s); var g = new THREE.Group(); var p = posOn(u, 0, 0); g.position.copy(p); g.lookAt(p.clone().add(tanAt(u)));
      g.add(cyl(.5, .7, 7, 0x3a3f55, -5.5, 3.5, 0, 8)); g.add(cyl(.5, .7, 7, 0x3a3f55, 5.5, 3.5, 0, 8)); var lintel = box(12.4, .7, 1, 0x2a2f45, 0, 7.2, 0); g.add(lintel);
      var bar = box(11, .08, .2, 0xffffff, 0, 6.75, .55); bar.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .6 }); g.add(bar);
      var lb = label(E.name, '#fff', .8, E.year); lb.position.set(0, 9.4, 0); g.add(lb);
      scene.add(g); eraGates.push({ u: u, group: g, era: E });
    });
    // 冬眠隧道
    (SM.TUNNELS || []).forEach(function (T) {
      var u0 = uOf(T.book - 1, T.s0), u1 = uOf(T.book - 1, T.s1); var pts = []; for (var i = 0; i <= 24; i++) pts.push(posOn(u0 + (u1 - u0) * i / 24, 0, 3.2));
      var c = new THREE.CatmullRomCurve3(pts); var tube = new THREE.Mesh(new THREE.TubeGeometry(c, 48, 7.5, 12, false), new THREE.MeshLambertMaterial({ color: 0x0a0d16, side: THREE.BackSide })); scene.add(tube);
      // 洞口环
      [u0, u1].forEach(function (uu) { var ring = new THREE.Mesh(new THREE.TorusGeometry(7.6, .5, 8, 24), mat(0x1a2030)); var p = posOn(uu, 0, 3.2); ring.position.copy(p); ring.lookAt(p.clone().add(tanAt(uu))); scene.add(ring); });
      T.texts.forEach(function (tx, i) { var uu = u0 + (u1 - u0) * (i + 1) / (T.texts.length + 1); var sp = label(tx, '#cfd6ff', .55); var side = i % 2 ? 1 : -1; sp.position.copy(posOn(uu, side * 4.5, 4.2)); scene.add(sp); });
      tunnels.push({ u0: u0, u1: u1 });
    });
  }

  /* ---------- 玩家 / 向导 ---------- */
  function buildPlayer() {
    player = new THREE.Group();
    player.add(cyl(.35, .45, 1.1, 0xe8ecff, 0, .75, 0, 10)); player.add(sph(.36, 0xfff2e0, 0, 1.65, 0)); player.add(glow(.9, 0x9fc0ff, 0, 1, 0, .18));
    var pl = new THREE.PointLight(0x9fc0ff, .9, 18); pl.position.set(0, 2.5, 0); player.add(pl); scene.add(player);
    guide = new THREE.Group(); guide.add(sph(.32, 0xbfd4ff, 0, 0, 0, true)); guide.add(glow(.7, 0x9fc0ff, 0, 0, 0, .35));
    var rg = new THREE.Mesh(new THREE.TorusGeometry(.55, .04, 8, 32), new THREE.MeshBasicMaterial({ color: 0xdfe8ff })); rg.rotation.x = 1.2; guide.add(rg); guide.userData.ring = rg; scene.add(guide);
  }

  /* ---------- 初始化 ---------- */
  function init(r) {
    renderer = r; clock = new THREE.Clock();
    scene = new THREE.Scene(); scene.background = themeBg; scene.fog = new THREE.FogExp2(0x05070f, themeFog);
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    scene.add(new THREE.HemisphereLight(0x8ea0ff, 0x1a1020, .9));
    var sun = new THREE.DirectionalLight(0xffffff, .55); sun.position.set(80, 120, -60); scene.add(sun);
    buildCurve(); buildStars(); buildRiverBed(); buildRibbons();
    SM.BOOKS.forEach(function (B, b) { if (B.theme === 'forest') buildForest(b); if (B.theme === 'space') buildSpace(b); });
    buildIslands(); buildGates(); buildPlayer();
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
    var best = 0, bd = 1e9; for (var k = 0; k <= SAMPLES; k += 2) { var d = samplePts[k].distanceToSquared(p); if (d < bd) { bd = d; best = k; } }
    travelTo(best / SAMPLES);
  }

  /* ---------- 每帧 ---------- */
  function nearestIsland() { var best = null, bd = 1e9; islands.forEach(function (i) { var d = Math.abs(i.u - playerT); if (d < bd) { bd = d; best = i; } }); return { isl: best, d: bd }; }
  var TMIN = 0.01 / NB, TMAX = 1 - 0.012 / NB;
  function update(dt) {
    dt = Math.min(dt, 0.05);
    var dir = holdDir; if (keys['w'] || keys['arrowup']) dir = 1; if (keys['s'] || keys['arrowdown']) dir = -1;
    if (!frozen && dir !== 0) targetT = Math.max(TMIN, Math.min(TMAX, playerT + dir * SPEED * dt + dir * 0.0015 / NB));
    var nr = nearestIsland();
    if (!frozen && dir > 0 && nr.isl && !SM.State.isDone(nr.isl.id) && playerT < nr.isl.u && targetT > nr.isl.u) targetT = nr.isl.u;
    var dT = targetT - playerT; var step = SPEED * dt; if (Math.abs(dT) > step) playerT += Math.sign(dT) * step; else playerT = targetT;
    playerT = Math.max(TMIN, Math.min(TMAX, playerT));
    var p = posOn(playerT, 0, 0), t = tanAt(playerT);
    player.position.copy(p); player.lookAt(p.clone().add(t)); player.position.y = Math.sin(clock.elapsedTime * 3) * .1;
    var lat = new THREE.Vector3().crossVectors(UP, t).normalize();
    var gp = p.clone().addScaledVector(lat, 1.6).addScaledVector(t, -.6); gp.y = 2.2 + Math.sin(clock.elapsedTime * 2.2) * .2;
    guide.position.lerp(gp, 0.08); guide.userData.ring.rotation.z += dt * 1.5; guide.userData.ring.rotation.x = 1.2 + Math.sin(clock.elapsedTime) * .3;
    // 相机
    var nearK = Math.max(0, 1 - nr.d / (0.03 / NB));
    var inTunnel = tunnels.some(function (T) { return playerT > T.u0 - 0.004 / NB && playerT < T.u1; });
    var want = p.clone().addScaledVector(t, inTunnel ? -8 : -13).addScaledVector(lat, -2.5 - nearK * nr.isl.side * -3); want.y = inTunnel ? 3.2 : 8 + nearK * 2;
    camPos.lerp(want, 1 - Math.pow(0.02, dt)); var lookW = p.clone().addScaledVector(t, 8); lookW.y = inTunnel ? 2.5 : 1.2;
    if (nearK > 0) lookW.lerp(nr.isl.group.position.clone().setY(2.5), nearK * .6);
    camLook.lerp(lookW, 1 - Math.pow(0.02, dt)); camera.position.copy(camPos); camera.lookAt(camLook);
    // 主题（按所在河段）
    var b = bookOf(playerT), s = sOf(playerT), th = THEMES[SM.BOOKS[b].theme] || THEMES.stars; var th2 = th;
    if (s > 0.94 && b < NB - 1) th2 = THEMES[SM.BOOKS[b + 1].theme] || th; if (s < 0.06 && b > 0) th2 = THEMES[SM.BOOKS[b - 1].theme] || th;
    var k2 = (s > 0.94 && b < NB - 1) ? (s - 0.94) / 0.06 : (s < 0.06 && b > 0) ? 1 - s / 0.06 : 0;
    var wantBg = th.bg.clone().lerp(th2.bg, k2 * .5), wantFog = th.fog + (th2.fog - th.fog) * k2 * .5; if (inTunnel) { wantBg.set(0x000000); wantFog = 0.03; }
    themeBg.lerp(wantBg, 1 - Math.pow(0.1, dt)); themeFog += (wantFog - themeFog) * (1 - Math.pow(0.1, dt)); scene.background = themeBg; scene.fog.color.copy(themeBg); scene.fog.density = themeFog;
    // 岛屿动画
    var T = clock.elapsedTime;
    islands.forEach(function (i) { i.group.position.y = Math.sin(T * .8 + i.group.userData.floatPhase) * .25; i.ring.material.opacity = .5 + .4 * Math.sin(T * 2 + i.group.userData.floatPhase); if (SM.State.isDone(i.id)) { i.marker.material.opacity = .15; }
      var dl = i.group.position.distanceTo(p); i.label.material.opacity = Math.max(0, Math.min(1, (dl - 10) / 14));
      if (i.fireLight) { i.fireLight.intensity = 1 + Math.sin(T * 9 + i.group.userData.floatPhase) * .25 + Math.sin(T * 23) * .1; i.fireGlow.material.opacity = .35 + .2 * Math.sin(T * 11 + i.group.userData.floatPhase); }
      var ud = i.dio.userData;
      if (ud.stars) ud.stars.forEach(function (s2, k) { s2.visible = Math.sin(T * 4 + k) > -0.2; });
      if (ud.locust) ud.locust.rotation.y += dt * .6;
      if (ud.ember) ud.ember.material.opacity = .12 + .1 * Math.sin(T * 2);
      if (ud.fire) ud.fire.material.opacity = .45 + .2 * Math.sin(T * 10);
      if (ud.exhaust) ud.exhaust.material.opacity = .3 + .2 * Math.sin(T * 14);
      if (ud.star) { var on = Math.sin(T * .7) > -0.6; ud.star.visible = on; ud.starGlow.visible = on; }
      if (ud.sw) ud.sw.material.color.setHex(Math.sin(T * 6) > 0 ? 0xff3b3b : 0x5a1010);
      if (ud.singer) ud.singer.material.opacity = .3 + .15 * Math.sin(T * 2.5) + .1 * Math.sin(T * 7); });
    if (forestFire) forestFire.material.opacity = .45 + .25 * Math.sin(T * 1.7);
    spaceCities.forEach(function (g) { g.rotation.y += dt * g.userData.spin; });
    updateFlows(dt);
    var near = (nr.d < 0.012 / NB) ? nr.isl : null; if (onNear) onNear(near);
    var ahead = islands.filter(function (i) { return i.u >= playerT - 0.012 / NB; })[0]; var line = ahead ? ahead.line : 'merge';
    if (line !== curLine) { var prev = curLine; curLine = line; if (prev && onLineChange) onLineChange(line); }
    if (b !== curBook) { var pb = curBook; curBook = b; if (onBookChange) onBookChange(b, pb); }
  }
  function render() { renderer.render(scene, camera); }
  function resize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); }
  function travelTo(u) { targetT = Math.max(TMIN, Math.min(TMAX, u)); }
  function jumpTo(u) { playerT = targetT = Math.max(TMIN, Math.min(TMAX, u)); var p = posOn(playerT, 0, 0), t = tanAt(playerT); camPos.copy(p).addScaledVector(t, -13).setY(8); camLook.copy(p); }

  return { init: init, update: update, render: render, resize: resize, travelTo: travelTo, jumpTo: jumpTo,
    setHold: function (d) { holdDir = d; }, setFrozen: function (f) { frozen = f; keys = {}; holdDir = 0; }, onNear: function (f) { onNear = f; }, onLineChange: function (f) { onLineChange = f; }, onBookChange: function (f) { onBookChange = f; },
    getT: function () { return playerT; }, bookOf: bookOf, uOf: uOf, NB: NB, islands: function () { return islands; }, camera: function () { return camera; } };
})();
