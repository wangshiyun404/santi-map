/* 旁白：优先播放预生成的人声（audio/manifest.js 索引：键 = 声线_djb2哈希(文本)），全部走 WebAudio 解码播放
 * （data: 内嵌 → base64 解码；文件 → fetch），不依赖 <audio> 的逐句自动播放许可与沙箱 CSP；
 * WebAudio 不可用或 fetch 失败（file://）时退回 <audio>；都没有才退回浏览器语音合成。
 * 任何"被跳过/被新句取代"的旧句都不会再出声（playGen 代际守卫）。 */
SM.Narr = (function () {
  var synth = window.speechSynthesis;
  var muted = (function () { try { return localStorage.getItem('sm_mute') === '1'; } catch (e) { return false; } })();
  var voice = null, onEndCb = null, timer = null, cur = null, playGen = 0, speaking = false, curVoice = null;
  var BASE = SM.AUDIO_BASE || 'audio/';

  /* 与 tools/gen_audio.py 相同的 djb2 哈希（文案请勿用 emoji 等非 BMP 字符，两端算法会不一致） */
  function hash(s) { var v = 5381; for (var i = 0; i < s.length; i++) v = ((v * 33) ^ s.charCodeAt(i)) >>> 0; return v.toString(16); }
  function findClip(text, voiceKey) {
    var man = SM.AUDIO_MANIFEST; if (!man) return null; var h = hash(text.trim());
    var order = voiceKey === 'guide' ? ['guide', 'kid', 'reader'] : voiceKey === 'kid' ? ['kid', 'reader', 'guide'] : ['reader', 'kid', 'guide'];
    for (var i = 0; i < order.length; i++) { var k = order[i] + '_' + h; if (man[k]) return { key: k, file: man[k][0], dur: man[k][1] }; }
    return null;
  }

  function pickVoice() {
    if (!synth) return; var vs = synth.getVoices(); if (!vs.length) return;
    var zh = vs.filter(function (v) { return /zh|cmn|chinese/i.test(v.lang) || /中文|普通话|Tingting|Ting-Ting|Meijia|Sinji/i.test(v.name); });
    voice = zh.find(function (v) { return /zh[-_]CN|cmn[-_]Hans|Tingting|Ting-Ting|Meijia/i.test(v.lang + v.name); }) || zh[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function stop() {
    playGen++; speaking = false; curVoice = null;
    if (timer) { clearTimeout(timer); timer = null; }
    if (cur) { var a = cur; cur = null; try { a.stop(); } catch (e) {} }
    if (synth) synth.cancel();
    onEndCb = null; if (SM.Audio) SM.Audio.duck(false);
  }
  function fin() { var cb = onEndCb; onEndCb = null; cur = null; speaking = false; curVoice = null; if (timer) { clearTimeout(timer); timer = null; } if (SM.Audio) SM.Audio.duck(false); cb && cb(); }

  /* 朗读；结束后回调。opt.voice = 'guide' 用向导声线 */
  function say(text, onEnd, opt) {
    stop(); opt = opt || {}; onEndCb = onEnd || null;
    var kid = document.body.classList.contains('kid'); var vk = opt.voice === 'guide' ? 'guide' : (kid ? 'kid' : 'reader');
    var est = Math.max(1500, text.length * (kid ? 230 : 170));
    if (muted) { timer = setTimeout(fin, est); return; }
    var clip = findClip(text, vk);
    if (!clip) { if (window.console) console.warn('[Narr] no clip, TTS fallback:', text.slice(0, 30)); speakTTS(text, kid, est); return; }
    speaking = true; curVoice = vk;
    var ctx = SM.Audio && SM.Audio.ctx && SM.Audio.ctx();
    if (ctx) playBuffer(ctx, clip, text, kid, est); else playElement(clip, text, kid, est);
  }

  /* ---- WebAudio 路径（首选）：解码后用 AudioBufferSourceNode 播放；只缓存最近 3 条（重听用） ---- */
  var lru = [];
  function cacheGet(k) { for (var i = 0; i < lru.length; i++) if (lru[i].k === k) return lru[i].b; return null; }
  function cachePut(k, b) { lru = lru.filter(function (x) { return x.k !== k; }); lru.push({ k: k, b: b }); if (lru.length > 3) lru.shift(); }
  function b64ToBuf(uri) { var b = atob(uri.split(',')[1]); var arr = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i); return arr.buffer; }
  function playBuffer(ctx, clip, text, kid, est) {
    var gen = playGen; if (ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} }
    var start = function (buffer) {
      if (gen !== playGen) return; // 期间被 stop/新句取代
      var src = ctx.createBufferSource(); src.buffer = buffer; src.connect(SM.Audio.voiceBus());
      cur = { stop: function () { try { src.onended = null; src.stop(); } catch (e) {} } };
      var done = false; var finish = function () { if (done || gen !== playGen) return; done = true; fin(); };
      src.onended = finish; timer = setTimeout(finish, (buffer.duration || clip.dur || est / 1000) * 1000 + 1500);
      if (SM.Audio) SM.Audio.duck(true); try { src.start(); } catch (e) { finish(); }
    };
    var hit = cacheGet(clip.key); if (hit) { start(hit); return; }
    var onData = function (ab) { if (gen !== playGen) return; ctx.decodeAudioData(ab, function (buffer) { cachePut(clip.key, buffer); start(buffer); }, function () { if (gen === playGen) playElement(clip, text, kid, est); }); };
    try {
      if (clip.file.indexOf('data:') === 0) onData(b64ToBuf(clip.file));
      else fetch(BASE + clip.file).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(onData).catch(function () { if (gen === playGen) playElement(clip, text, kid, est); });
    } catch (e) { if (gen === playGen) playElement(clip, text, kid, est); }
  }

  /* ---- <audio> 路径（WebAudio 不可用 / file:// fetch 失败时）---- */
  function playElement(clip, text, kid, est) {
    var gen = playGen;
    try {
      var a = new Audio(clip.file.indexOf('data:') === 0 ? clip.file : BASE + clip.file); a.preload = 'auto';
      cur = { stop: function () { try { a.onended = null; a.onerror = null; a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {} } };
      var done = false;
      var finish = function () { if (done || gen !== playGen) return; done = true; fin(); };
      var fail = function (err) {
        if (done || gen !== playGen) return;
        if (err && err.name === 'NotAllowedError') { // 自动播放被拒：等下一次点击再试，不退回合成器
          var retry = function () { document.removeEventListener('pointerdown', retry, true); document.removeEventListener('keydown', retry, true); if (gen !== playGen || done) return; var p2 = a.play(); if (p2 && p2.catch) p2.catch(function () { if (!done && gen === playGen) { done = true; speakTTS(text, kid, est); } }); };
          document.addEventListener('pointerdown', retry, true); document.addEventListener('keydown', retry, true); return;
        }
        done = true; speakTTS(text, kid, est);
      };
      a.onended = finish; a.onerror = function () { fail(null); };
      if (SM.Audio) SM.Audio.duck(true);
      a.onplaying = function () { if (gen !== playGen) return; if (timer) clearTimeout(timer); timer = setTimeout(finish, (clip.dur || est / 1000) * 1000 + 1500); };
      var p = a.play(); if (p && p.catch) p.catch(fail);
    } catch (e) { speakTTS(text, kid, est); }
  }

  function speakTTS(text, kid, est) {
    if (!synth || !voice) { timer = setTimeout(fin, est); return; }
    var gen = playGen; var done = false; var finish = function () { if (done || gen !== playGen) return; done = true; fin(); };
    // 长句分段朗读（Chrome 远程声对长句会中途静音）
    var parts = text.split(/(?<=[。！？；])/).filter(function (p) { return p.trim(); }); if (!parts.length) parts = [text];
    var idx = 0; var next = function () { if (gen !== playGen) return; if (idx >= parts.length) { finish(); return; } var u = new SpeechSynthesisUtterance(parts[idx++]); u.voice = voice; u.lang = voice.lang || 'zh-CN'; u.rate = kid ? 0.9 : 1.0; u.onend = next; u.onerror = next; synth.speak(u); };
    timer = setTimeout(finish, est * 1.6 + 2000); if (SM.Audio) SM.Audio.duck(true); next();
  }
  function setMuted(m) { muted = !!m; try { localStorage.setItem('sm_mute', muted ? '1' : '0'); } catch (e) {} if (muted) stop(); }
  function isMuted() { return muted; }
  function warm() { if (synth && !muted && !hasClips()) { try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {} } }
  function hasClips() { return !!(SM.AUDIO_MANIFEST && Object.keys(SM.AUDIO_MANIFEST).length); }
  return { say: say, stop: stop, setMuted: setMuted, isMuted: isMuted, warm: warm, hash: hash, hasClips: hasClips, isSpeaking: function () { return speaking; }, currentVoice: function () { return curVoice; } };
})();
