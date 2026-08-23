/* 旁白：浏览器离线语音合成 + 字幕 */
SM.Narr = (function () {
  var synth = window.speechSynthesis;
  var muted = (function () { try { return localStorage.getItem('sm_mute') === '1'; } catch (e) { return false; } })();
  var voice = null, current = null, onEndCb = null, timer = null;

  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices();
    if (!vs.length) return;
    var zh = vs.filter(function (v) { return /zh|cmn|chinese/i.test(v.lang) || /中文|普通话|Tingting|Ting-Ting|Meijia|Sinji/i.test(v.name); });
    // 优先普通话
    voice = zh.find(function (v) { return /zh[-_]CN|cmn[-_]Hans|Tingting|Ting-Ting|Meijia/i.test(v.lang + v.name); }) || zh[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (synth) synth.cancel();
    current = null; onEndCb = null;
  }

  /* 朗读文本；结束后回调。静音或无语音时，按字数估算时长回调 */
  function say(text, onEnd, rate) {
    stop();
    onEndCb = onEnd || null;
    var kid = document.body.classList.contains('kid');
    var est = Math.max(1500, text.length * (kid ? 230 : 170));
    if (muted || !synth || !voice) {
      timer = setTimeout(function () { timer = null; var cb = onEndCb; onEndCb = null; cb && cb(); }, est);
      return;
    }
    var u = new SpeechSynthesisUtterance(text);
    u.voice = voice; u.lang = voice.lang || 'zh-CN';
    u.rate = rate || (kid ? 0.9 : 1.0); u.pitch = 1.0;
    current = u;
    var done = false;
    var finish = function () { if (done) return; done = true; if (timer) { clearTimeout(timer); timer = null; } var cb = onEndCb; onEndCb = null; current = null; cb && cb(); };
    u.onend = finish; u.onerror = finish;
    // 兜底：某些浏览器不触发 onend
    timer = setTimeout(finish, est * 1.6 + 2000);
    synth.speak(u);
  }

  function setMuted(m) { muted = !!m; try { localStorage.setItem('sm_mute', muted ? '1' : '0'); } catch (e) {} if (muted && synth) synth.cancel(); }
  function isMuted() { return muted; }
  // 用户点击后预热（部分浏览器要求用户手势后才允许发声）
  function warm() { if (synth && !muted) { try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {} } }

  return { say: say, stop: stop, setMuted: setMuted, isMuted: isMuted, warm: warm };
})();
