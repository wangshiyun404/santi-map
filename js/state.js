/* 进度与收藏：本地存储 + 地图册界面 */
SM.State = (function () {
  var KEY = 'sm_state_v1';
  var mem = {};
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] === undefined ? null : mem[k]; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } } };
  SM.LS = LS;
  var s = load();

  function blank() {
    return { mode: null, station: 0, done: {}, cards: [], choices: {}, notes: {}, count: {} };
  }
  function load() {
    try { var o = JSON.parse(LS.get(KEY)); if (o && o.done) return Object.assign(blank(), o); } catch (e) {}
    return blank();
  }
  function save() { LS.set(KEY, JSON.stringify(s)); }
  function reset() { s = blank(); save(); }

  function setMode(m) { s.mode = m; document.body.classList.toggle('kid', m === 'kid'); save(); }
  function isKid() { return s.mode === 'kid'; }
  function txt(obj) { return isKid() ? obj.kid : obj.reader; } // 取当前模式的文本

  function addCards(ids) {
    var fresh = [];
    ids.forEach(function (id) { if (s.cards.indexOf(id) < 0) { s.cards.push(id); fresh.push(id); } });
    save(); return fresh;
  }
  function hasCard(id) { return s.cards.indexOf(id) >= 0; }
  function markDone(id, extra) {
    s.done[id] = true;
    if (extra) { if (extra.choice !== undefined) s.choices[id] = extra.choice; if (extra.note) s.notes[id] = extra.note; }
    save();
  }
  function isDone(id) { return !!s.done[id]; }
  function doneCount(book) { return SM.ISLANDS.filter(function (i) { return s.done[i.id] && (!book || i.book === book); }).length; }
  function bookDone(book) { return SM.ISLANDS.filter(function (i) { return i.book === book; }).every(function (i) { return s.done[i.id]; }); }
  function lineProgress(line, book) {
    var all = SM.ISLANDS.filter(function (i) { return i.line === line && (!book || i.book === book); });
    var d = all.filter(function (i) { return s.done[i.id]; });
    return { total: all.length, done: d.length };
  }
  function setStation(i) { s.station = i; save(); }

  /* 地图册渲染 */
  var TYPE_NAME = { person: '人物', event: '事件', concept: '概念', era: '纪元' };
  function cardHTML(id, locked) {
    var c = SM.CARDS[id]; var tname = TYPE_NAME[c.type];
    return '<div class="card ' + c.type + (locked ? ' locked' : '') + '"><div class="t">' + tname + '</div><div class="n">' + c.name + '</div><div class="s">' + c.sub + '</div><div class="d">' + c.text + '</div></div>';
  }
  function renderAlbum() {
    var body = document.getElementById('albumBody'); var ids = Object.keys(SM.CARDS); var html = '';
    (SM.BOOKS || [{ n: 1, name: '第一部 三体' }]).forEach(function (B) {
      var bids = ids.filter(function (id) { return (SM.CARDS[id].book || 1) === B.n; }); if (!bids.length) return;
      var got = bids.filter(hasCard).length;
      html += '<h3 class="book">' + B.name + ' <small>' + got + ' / ' + bids.length + '</small></h3>';
      Object.keys(TYPE_NAME).forEach(function (g) {
        var gids = bids.filter(function (id) { return SM.CARDS[id].type === g; }); if (!gids.length) return;
        html += '<div class="sec">' + TYPE_NAME[g] + '</div><div class="grid">';
        gids.forEach(function (id) { html += cardHTML(id, !hasCard(id)); }); html += '</div>';
      });
    });
    body.innerHTML = html;
    document.getElementById('albumCount').textContent = s.cards.length;
    document.getElementById('albumTotal').textContent = ids.length;
    document.getElementById('albumBadge').textContent = s.cards.length;
  }

  return { get: function () { return s; }, save: save, reset: reset, setMode: setMode, isKid: isKid, txt: txt,
    addCards: addCards, hasCard: hasCard, markDone: markDone, isDone: isDone, doneCount: doneCount, bookDone: bookDone, lineProgress: lineProgress, TYPE_NAME: TYPE_NAME,
    setStation: setStation, cardHTML: cardHTML, renderAlbum: renderAlbum };
})();
