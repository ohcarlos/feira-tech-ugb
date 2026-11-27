/* ============================================================
   Scoreboard — localStorage (offline, sem servidor)
   Expõe: window.Scoreboard
   ============================================================ */

(function () {
  'use strict';

  var KEY = 'feira_tech_ugb_scores_v2';
  var MAX = 10;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr
        .filter(function (s) {
          return s && typeof s.score === 'number' && typeof s.name === 'string';
        })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, MAX);
    } catch (err) {
      console.error('Scoreboard: erro ao ler', err);
      return [];
    }
  }

  function save(name, score) {
    var list = load();
    list.push({
      name: String(name || 'JOGADOR').trim().toUpperCase().slice(0, 10) || 'JOGADOR',
      score: Math.max(0, Math.floor(score)),
      date: Date.now(),
    });
    list.sort(function (a, b) { return b.score - a.score; });
    var top = list.slice(0, MAX);
    try {
      localStorage.setItem(KEY, JSON.stringify(top));
    } catch (err) {
      console.error('Scoreboard: erro ao salvar', err);
    }
    return top;
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(el, list) {
    if (!el) return;
    var data = list || load();
    el.innerHTML = '';

    if (!data.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'Nenhum recorde ainda. Seja o primeiro!';
      el.appendChild(empty);
      return;
    }

    data.forEach(function (item, i) {
      var li = document.createElement('li');
      var pos = i + 1;
      var medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : (pos + '.');
      li.innerHTML =
        '<span class="pos">' + medal + '</span>' +
        '<span class="name">' + escapeHtml(item.name) + '</span>' +
        '<span class="pts">' + item.score + '</span>';
      el.appendChild(li);
    });
  }

  window.Scoreboard = {
    load: load,
    save: save,
    clear: clear,
    render: render,
  };
})();
