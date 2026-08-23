/* 音效引擎：WebAudio 实时合成——分河段的环境声 + 生成式音乐垫 + 动效音。零素材、零外网。
 * SM.Audio.init() 需在用户首次点击后调用；setTheme('stars'|'forest'|'space')；sfx(name)；duck(on) 给旁白让路 */
SM.Audio = (function () {
  var ctx = null, master, duckG, musicBus, ambBus, sfxBus, ready = false, theme = null;
  var enabled = (function () { try { return localStorage.getItem('sm_sfx') !== '0'; } catch (e) { return true; } })();
  var noiseBuf = null, layers = {}, pad = null, sched = { next: 0 }, chordIdx = 0, chordT = 0;
  var THEMES = {
    stars:  { pad: [[57, 64, 69, 72], [53, 60, 65, 69], [55, 62, 67, 71], [52, 59, 64, 67]], padCut: 700, padGain: .22, wind: { type: 'bandpass', f: 2600, q: 2.2, g: .05 }, sub: { f: 0, g: 0 }, pings: { rate: 2.5, notes: [81, 84, 88, 91, 93, 96], type: 'sine', dur: 2.2, g: .05 }, crickets: 0 },
    forest: { pad: [[50, 57, 60, 65], [48, 55, 58, 62], [53, 60, 63, 67], [46, 53, 58, 62]], padCut: 420, padGain: .18, wind: { type: 'lowpass', f: 380, q: .7, g: .16 }, sub: { f: 0, g: 0 }, pings: { rate: 9, notes: [74, 76, 79], type: 'triangle', dur: 1.2, g: .025 }, crickets: 1 },
    space:  { pad: [[40, 52, 59, 64], [38, 50, 57, 62], [43, 55, 62, 66], [36, 48, 55, 60]], padCut: 520, padGain: .2, wind: { type: 'highpass', f: 3800, q: .8, g: .03 }, sub: { f: 41, g: .18 }, pings: { rate: 5, notes: [76, 83, 88, 95], type: 'sine', dur: 3.5, g: .04 }, crickets: 0 }
  };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function now() { return ctx.currentTime; }
  function gain(v, dest) { var g = ctx.createGain(); g.gain.value = v; g.connect(dest); return g; }
  function noise() { if (!noiseBuf) { var len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; noiseBuf = b; } var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
  function env(g, t0, a, peak, d, sustain, r) { // 简单包络
    g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a); g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t0 + a + d); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d + r);
  }

  function init() {
    if (ready) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = gain(enabled ? .9 : 0, ctx.destination); duckG = gain(1, master); musicBus = gain(.5, duckG); ambBus = gain(.7, duckG); sfxBus = gain(.8, master);
    // 和声垫：三个振荡器 → 低通 → 增益
    pad = { oscs: [], filt: ctx.createBiquadFilter(), g: gain(0, musicBus) }; pad.filt.type = 'lowpass'; pad.filt.frequency.value = 600; pad.filt.Q.value = .6; pad.filt.connect(pad.g);
    for (var i = 0; i < 4; i++) { var o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth'; var og = gain(i % 2 ? .5 : .18, pad.filt); o.detune.value = (i - 1.5) * 6; o.frequency.value = 110; o.start(); pad.oscs.push({ o: o, g: og }); }
    var lfo = ctx.createOscillator(); lfo.frequency.value = .07; var lg = gain(160, pad.filt.frequency); lfo.connect(lg); lfo.start();
    // 风/气流：噪声 → 滤波 → 增益（带慢 LFO）
    var wn = noise(); var wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 2600; wf.Q.value = 2; var wg = gain(0, ambBus); wn.connect(wf); wf.connect(wg); wn.start();
    var wl = ctx.createOscillator(); wl.frequency.value = .11; var wlg = gain(.02, wg.gain); wl.connect(wlg); wl.start();
    layers.wind = { src: wn, f: wf, g: wg };
    // 低频嗡鸣（太空）
    var so = ctx.createOscillator(); so.type = 'sine'; so.frequency.value = 41; var so2 = ctx.createOscillator(); so2.type = 'sine'; so2.frequency.value = 41.6; var sg = gain(0, ambBus); so.connect(sg); so2.connect(sg); so.start(); so2.start(); layers.sub = { g: sg, o: so, o2: so2 };
    ready = true; if (theme) setTheme(theme, true);
  }

  function setTheme(name, instant) {
    theme = name; if (!ready) return; var T = THEMES[name] || THEMES.stars; var t = now(), tc = instant ? .01 : 3;
    pad.filt.frequency.setTargetAtTime(T.padCut, t, tc); pad.g.gain.setTargetAtTime(T.padGain, t, tc);
    layers.wind.f.type = T.wind.type; layers.wind.f.frequency.setTargetAtTime(T.wind.f, t, tc); layers.wind.f.Q.setTargetAtTime(T.wind.q, t, tc); layers.wind.g.gain.setTargetAtTime(T.wind.g, t, tc);
    layers.sub.g.gain.setTargetAtTime(T.sub.g, t, tc); if (T.sub.f) { layers.sub.o.frequency.setTargetAtTime(T.sub.f, t, tc); layers.sub.o2.frequency.setTargetAtTime(T.sub.f + .6, t, tc); }
    chordIdx = 0; chordT = 0; applyChord(T, instant ? .05 : 4);
  }
  function applyChord(T, glide) {
    var ch = T.pad[chordIdx % T.pad.length]; var t = now();
    pad.oscs.forEach(function (p, i) { p.o.frequency.setTargetAtTime(mtof(ch[i % ch.length]) / (i === 0 ? 2 : 1), t, glide); });
  }
  // 随机事件：星河叮声 / 森林虫鸣 / 太空回声
  function ping(T) {
    var P = T.pings; var o = ctx.createOscillator(); o.type = P.type; o.frequency.value = mtof(P.notes[Math.floor(Math.random() * P.notes.length)]);
    var g = gain(0, musicBus); o.connect(g); var t = now(); env(g, t, .02, P.g, P.dur * .3, P.g * .3, P.dur * .7); o.start(t); o.stop(t + P.dur + .1);
    if (theme === 'space') { var d = ctx.createDelay(); d.delayTime.value = .42; var dg = gain(.4, musicBus); g.connect(d); d.connect(dg); }
  }
  function cricket() {
    var n = 2 + Math.floor(Math.random() * 4); for (var i = 0; i < n; i++) { var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 4200 + Math.random() * 900; var g = gain(0, ambBus); o.connect(g); var t = now() + i * .09 + Math.random() * .02; env(g, t, .005, .012, .03, .004, .04); o.start(t); o.stop(t + .12); }
  }
  function crackle() { var s = noise(); var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 2500; f.Q.value = 1; var g = gain(0, ambBus); s.connect(f); f.connect(g); var t = now(); env(g, t, .003, .03 + Math.random() * .03, .02, .005, .05); s.start(t); s.stop(t + .12); }
  var nearFire = false;
  function update(dt) {
    if (!ready || !enabled) return; var T = THEMES[theme] || THEMES.stars; var t = now();
    chordT += dt; if (chordT > 13) { chordT = 0; chordIdx++; applyChord(T, 2.5); }
    if (t > sched.next) { sched.next = t + (Math.random() * T.pings.rate + T.pings.rate * .4); ping(T); }
    if (T.crickets && Math.random() < dt * 1.4) cricket();
    if (nearFire && Math.random() < dt * 10) crackle();
  }
  function setNearFire(b) { nearFire = !!b; }

  /* ---- 动效音 ---- */
  var SFX = {
    click: function (t) { var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(700, t + .05); var g = gain(0, sfxBus); o.connect(g); env(g, t, .003, .18, .03, .02, .06); o.start(t); o.stop(t + .12); },
    enter: function (t) { var s = noise(); var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(2600, t + .9); var g = gain(0, sfxBus); s.connect(f); f.connect(g); env(g, t, .25, .35, .4, .1, .5); s.start(t); s.stop(t + 1.4); var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 1.2); var og = gain(0, sfxBus); o.connect(og); env(og, t + .1, .02, .5, .6, .1, .7); o.start(t); o.stop(t + 1.6); },
    exit: function (t) { var s = noise(); var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(160, t + .8); var g = gain(0, sfxBus); s.connect(f); f.connect(g); env(g, t, .05, .3, .4, .08, .4); s.start(t); s.stop(t + 1.2); },
    card: function (t) { [[880, 0], [1320, 0], [1760, .0], [1108, .16], [1661, .16]].forEach(function (p) { var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = p[0]; var g = gain(0, sfxBus); o.connect(g); env(g, t + p[1], .005, .22 / (p[0] / 880), .25, .08, 1.4); o.start(t + p[1]); o.stop(t + p[1] + 1.8); }); },
    chime: function (t) { [660, 990].forEach(function (f, i) { var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; var g = gain(0, sfxBus); o.connect(g); env(g, t + i * .12, .01, .18, .3, .05, 1.2); o.start(t); o.stop(t + 1.8); }); },
    fanfare: function (t) { [60, 64, 67, 72, 76].forEach(function (m, i) { var o = ctx.createOscillator(); o.type = i < 2 ? 'triangle' : 'sine'; o.frequency.value = mtof(m + 12); var g = gain(0, sfxBus); o.connect(g); env(g, t + i * .13, .02, .22, .5, .12, 2.2); o.start(t); o.stop(t + 3.5); }); var pg = pad.g.gain; pg.setTargetAtTime((THEMES[theme] || THEMES.stars).padGain * 1.8, t, .5); pg.setTargetAtTime((THEMES[theme] || THEMES.stars).padGain, t + 3, 1.5); },
    sweep: function (t) { var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(1400, t + 1.3); var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(4000, t + 1.3); var g = gain(0, sfxBus); o.connect(f); f.connect(g); env(g, t, .1, .25, .8, .1, .8); o.start(t); o.stop(t + 2.2); var s = noise(); var nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 3000; var ng = gain(0, sfxBus); s.connect(nf); nf.connect(ng); env(ng, t + .3, .5, .12, .5, .03, .6); s.start(t); s.stop(t + 2); },
    boom: function (t) { var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.6); var g = gain(0, sfxBus); o.connect(g); env(g, t, .01, .9, .5, .2, 1.4); o.start(t); o.stop(t + 2.2); var s = noise(); var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(120, t + .8); var ng = gain(0, sfxBus); s.connect(f); f.connect(ng); env(ng, t, .01, .5, .3, .05, .8); s.start(t); s.stop(t + 1.4); },
    softboom: function (t) { var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2); var g = gain(0, sfxBus); o.connect(g); env(g, t, .02, .4, .4, .1, 1); o.start(t); o.stop(t + 1.8); },
    alarm: function (t) { for (var i = 0; i < 3; i++) { var o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 740; var g = gain(0, sfxBus); var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; o.connect(f); f.connect(g); env(g, t + i * .34, .01, .09, .12, .06, .12); o.start(t + i * .34); o.stop(t + i * .34 + .32); } },
    tick: function (t) { var o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1500; var g = gain(0, sfxBus); o.connect(g); env(g, t, .002, .08, .02, .01, .03); o.start(t); o.stop(t + .08); },
    whoosh: function (t) { var s = noise(); var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(3500, t + .5); f.frequency.exponentialRampToValueAtTime(300, t + 1.1); var g = gain(0, sfxBus); s.connect(f); f.connect(g); env(g, t, .15, .28, .4, .05, .5); s.start(t); s.stop(t + 1.3); },
    flatten: function (t) { for (var i = 0; i < 7; i++) { var o = ctx.createOscillator(); o.type = 'sine'; var f0 = 2200 / (i + 1); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 / 14, t + 5); var g = gain(0, sfxBus); o.connect(g); env(g, t + i * .1, .6, .09, 2.5, .04, 2.5); o.start(t); o.stop(t + 6); } var s = noise(); var nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.setValueAtTime(5000, t); nf.frequency.exponentialRampToValueAtTime(200, t + 5); var ng = gain(0, sfxBus); s.connect(nf); nf.connect(ng); env(ng, t, 1, .12, 2, .05, 2.5); s.start(t); s.stop(t + 6); },
    resolve: function (t) { [57, 64, 69, 73, 76].forEach(function (m, i) { var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); var g = gain(0, sfxBus); o.connect(g); env(g, t + i * .08, .6, .12, 1.5, .08, 3); o.start(t); o.stop(t + 5.5); }); },
    flutter: function (t) { for (var i = 0; i < 14; i++) { var s = noise(); var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 2200; f.Q.value = 3; var g = gain(0, sfxBus); s.connect(f); f.connect(g); var tt = t + Math.random() * 2.2; env(g, tt, .02, .05, .06, .01, .1); s.start(tt); s.stop(tt + .25); } },
    pop: function (t) { var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(260, t + .08); var g = gain(0, sfxBus); o.connect(g); env(g, t, .003, .16, .04, .02, .08); o.start(t); o.stop(t + .16); }
  };
  function sfx(name) { if (!ready || !enabled || !SFX[name]) return; try { SFX[name](now() + .01); } catch (e) {} }
  function duck(on) { if (!ready) return; duckG.gain.setTargetAtTime(on ? .28 : 1, now(), on ? .25 : .8); }
  function setEnabled(b) { enabled = !!b; try { localStorage.setItem('sm_sfx', enabled ? '1' : '0'); } catch (e) {} if (ready) master.gain.setTargetAtTime(enabled ? .9 : 0, now(), .1); }
  function isEnabled() { return enabled; }
  return { init: init, setTheme: setTheme, update: update, sfx: sfx, duck: duck, setEnabled: setEnabled, isEnabled: isEnabled, setNearFire: setNearFire, isReady: function () { return ready; } };
})();
