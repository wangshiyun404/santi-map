/* 旁白：优先播放预生成的神经网络人声（audio/manifest.js 索引），没有对应音频时退回浏览器语音合成 */
SM.Narr = (function () {
  var synth = window.speechSynthesis;
  var muted = (function () { try { return localStorage.getItem('sm_mute') === '1'; } catch (e) { return false; } })();
  var voice = null, onEndCb = null, timer = null, cur = null;
  var BASE = SM.AUDIO_BASE || 'audio/';

  /* 与 tools/gen_audio.py 相同的 djb2 哈希 */
  function hash(s) { var v = 5381; for (var i = 0; i < s.length; i++) v = ((v * 33) ^ s.charCodeAt(i)) >>> 0; return v.toString(16); }
  function findClip(text, voiceKey) {
    var man = SM.AUDIO_MANIFEST; if (!man) return null; var h = hash(text.trim());
    var order = voiceKey === 'guide' ? ['guide', 'kid', 'reader'] : voiceKey === 'kid' ? ['kid', 'reader', 'guide'] : ['reader', 'kid', 'guide'];
    for (var i = 0; i < order.length; i++) { var e = man[order[i] + '_' + h]; if (e) return e; }
    return null;
  }

  function pickVoice() {
    if (!synth) return; var vs = synth.getVoices(); if (!vs.length) return;
    var zh = vs.filter(function (v) { return /zh|cmn|chinese/i.test(v.lang) || /中文|普通话|Tingting|Ting-Ting|Meijia|Sinji/i.test(v.name); });
    voice = zh.find(function (v) { return /zh[-_]CN|cmn[-_]Hans|Tingting|Ting-Ting|Meijia/i.test(v.lang + v.name); }) || zh[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (cur) { try { cur.pause(); cur.src = ''; } catch (e) {} cur = null; }
    if (synth) synth.cancel();
    onEndCb = null; if (SM.Audio) SM.Audio.duck(false);
  }
  function fin() { var cb = onEndCb; onEndCb = null; cur = null; if (timer) { clearTimeout(timer); timer = null; } if (SM.Audio) SM.Audio.duck(false); cb && cb(); }

  /* 朗读；结束后回调。opt.voice = 'guide' 用向导声线 */
  function say(text, onEnd, opt) {
    stop(); opt = opt || {}; onEndCb = onEnd || null;
    var kid = document.body.classList.contains('kid');
    var est = Math.max(1500, text.length * (kid ? 230 : 170));
    if (muted) { timer = setTimeout(fin, est); return; }
    var clip = findClip(text, opt.voice === 'guide' ? 'guide' : (kid ? 'kid' : 'reader'));
    if (clip) {
      try {
        var a = new Audio(clip[0].indexOf('data:') === 0 ? clip[0] : BASE + clip[0]); cur = a; a.preload = 'auto';
        var done = false; var finish = function () { if (done) return; done = true; if (cur === a) fin(); };
        a.onended = finish; a.onerror = function () { if (done) return; done = true; cur = null; speakTTS(text, kid, est); };
        if (SM.Audio) SM.Audio.duck(true);
        timer = setTimeout(finish, (clip[1] || est / 1000) * 1000 + 2500); // 兜底
        var p = a.play(); if (p && p.catch) p.catch(function () { if (done) return; done = true; cur = null; speakTTS(text, kid, est); });
        return;
      } catch (e) { cur = null; }
    }
    speakTTS(text, kid, est);
  }
  function speakTTS(text, kid, est) {
    if (!synth || !voice) { timer = setTimeout(fin, est); return; }
    var u = new SpeechSynthesisUtterance(text); u.voice = voice; u.lang = voice.lang || 'zh-CN'; u.rate = kid ? 0.9 : 1.0; u.pitch = 1.0;
    var done = false; var finish = function () { if (done) return; done = true; fin(); };
    u.onend = finish; u.onerror = finish; timer = setTimeout(finish, est * 1.6 + 2000);
    if (SM.Audio) SM.Audio.duck(true); synth.speak(u);
  }
  function setMuted(m) { muted = !!m; try { localStorage.setItem('sm_mute', muted ? '1' : '0'); } catch (e) {} if (muted) stop(); }
  function isMuted() { return muted; }
  function warm() { if (synth && !muted) { try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {} } }
  function hasClips() { return !!(SM.AUDIO_MANIFEST && Object.keys(SM.AUDIO_MANIFEST).length); }
  return { say: say, stop: stop, setMuted: setMuted, isMuted: isMuted, warm: warm, hash: hash, hasClips: hasClips };
})();
