/* ============================================================
   Navegação entre telas e integração dos módulos
   ============================================================ */

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function show(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    var target = $(id);
    if (target) target.classList.add('active');
    else console.warn('Tela não encontrada:', id);
  }

  function refreshRankings() {
    window.Scoreboard.render($('hall-list'));
    window.Scoreboard.render($('scoreboard-list'));
  }

  var pendingShip = null;
  var briefingOrigin = 'screen-builder';

  function openBriefing(origin) {
    if (!window.ShipBuilder.hasPixels()) {
      alert('Pinte pelo menos um pixel na nave antes de jogar!');
      return false;
    }
    pendingShip = window.ShipBuilder.getShipData();
    briefingOrigin = origin || 'screen-builder';
    show('screen-briefing');
    return true;
  }

  function startGame() {
    if (!pendingShip) return;
    // evita que o ESPAÇO reative o botão que ainda está em foco
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    show('screen-game');
    window.Game.start(pendingShip);
  }

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------- MENU ---------- */

    $('btn-create').addEventListener('click', function () {
      window.ShipBuilder.clear();
      show('screen-builder');
    });

    $('btn-hall').addEventListener('click', function () {
      refreshRankings();
      show('screen-hall');
    });

    /* ---------- CONSTRUTOR ---------- */

    $('btn-builder-lab').addEventListener('click', function () {
      if (!window.ShipBuilder.hasPixels()) {
        alert('Pinte pelo menos um pixel na nave antes de ver a animação!');
        return;
      }
      window.AnimLab.setShip(window.ShipBuilder.getShipData());
      window.AnimLab.start();
      show('screen-lab');
    });

    $('btn-builder-play').addEventListener('click', function () {
      openBriefing('screen-builder');
    });

    /* ---------- LABORATÓRIO ---------- */

    $('btn-lab-back').addEventListener('click', function () {
      window.AnimLab.stop();
      show('screen-builder');
    });

    $('btn-lab-play').addEventListener('click', function () {
      window.AnimLab.stop();
      openBriefing('screen-lab');
    });

    /* ---------- BRIEFING ---------- */

    $('btn-briefing-start').addEventListener('click', startGame);

    $('btn-briefing-back').addEventListener('click', function () {
      if (briefingOrigin === 'screen-lab' && pendingShip) {
        window.AnimLab.setShip(pendingShip);
        window.AnimLab.start();
      }
      show(briefingOrigin);
    });

    /* ---------- GAME OVER ---------- */

    window.addEventListener('gameover', function (e) {
      var detail = e.detail || {};
      $('final-score').textContent = detail.score || 0;

      var title = $('gameover-title');
      title.textContent = detail.reason === 'time' ? 'TEMPO ESGOTADO' : 'GAME OVER';

      refreshRankings();
      show('screen-gameover');
    });

    $('btn-save-score').addEventListener('click', function () {
      var name = ($('player-name').value || 'JOGADOR').trim();
      var score = parseInt($('final-score').textContent, 10) || 0;
      window.Scoreboard.save(name, score);
      refreshRankings();
      $('player-name').value = 'JOGADOR';
      show('screen-hall');
    });

    $('btn-retry').addEventListener('click', function () {
      openBriefing('screen-gameover');
    });

    $('btn-gameover-menu').addEventListener('click', function () {
      show('screen-menu');
    });

    /* ---------- HALL ---------- */

    $('btn-hall-back').addEventListener('click', function () {
      show('screen-menu');
    });

    /* ---------- Init ---------- */

    refreshRankings();
    show('screen-menu');
  });
})();
