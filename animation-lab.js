/* ============================================================
   Laboratório de animação — frames por segundo
   Expõe: window.AnimLab
   ============================================================ */

(function () {
  'use strict';

  var SIZE = 16;
  var PX = 7; // escala de cada pixel da nave no canvas do lab

  var canvas = document.getElementById('canvas-lab');
  var ctx = canvas.getContext('2d');
  var slider = document.getElementById('slider-fps');
  var fpsLabel = document.getElementById('fps-label');
  var fpsLive = document.getElementById('fps-live');

  var ship = null;
  var running = false;
  var rafId = null;

  var shipX = 0;
  var shipY = 0;
  var dir = 1;
  var targetFps = 30;

  var lastTime = 0;
  var accumulator = 0;
  var framesDrawn = 0;

  var stars = [];

  function initStars() {
    stars = [];
    for (var i = 0; i < 46; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 14 + Math.random() * 46,
        size: Math.random() < 0.82 ? 1 : 2,
      });
    }
  }

  function setShip(data) {
    ship = data;
    shipX = canvas.width / 2 - (SIZE * PX) / 2;
    shipY = canvas.height / 2 - (SIZE * PX) / 2 + 10;
    dir = 1;
    accumulator = 0;
    framesDrawn = 0;
    fpsLive.textContent = '0';
  }

  function drawBackground(dt) {
    ctx.fillStyle = '#04060e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // estrelas em movimento (dá a sensação de deslocamento)
    ctx.fillStyle = 'rgba(180, 210, 255, 0.5)';
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y += s.speed * dt;
      if (s.y > canvas.height) {
        s.y = -2;
        s.x = Math.random() * canvas.width;
      }
      ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
    }

    // grade de coordenadas
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.055)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= canvas.width; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, canvas.height);
      ctx.stroke();
    }
    for (var gy = 0; gy <= canvas.height; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(canvas.width, gy + 0.5);
      ctx.stroke();
    }
  }

  function drawShip() {
    if (!ship) return;
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var c = ship[y][x];
        if (!c) continue;
        ctx.fillStyle = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
        ctx.fillRect(
          Math.round(shipX + x * PX),
          Math.round(shipY + y * PX),
          PX,
          PX
        );
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          Math.round(shipX + x * PX) + 0.5,
          Math.round(shipY + y * PX) + 0.5,
          PX - 1,
          PX - 1
        );
      }
    }
  }

  function drawOverlay() {
    ctx.fillStyle = 'rgba(0, 242, 255, 0.5)';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText('1 frame = 1 desenho completo da imagem', 12, 22);
    ctx.fillText('Muitos frames por segundo = movimento', 12, 40);
  }

  function drawFrame(dt) {
    drawBackground(dt);
    drawShip();
    drawOverlay();

    framesDrawn++;
    fpsLive.textContent = framesDrawn;
  }

  function loop(now) {
    if (!running) return;

    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1; // evita saltos ao trocar de aba

    accumulator += dt;
    var interval = 1 / Math.max(1, targetFps);

    // Só avança e redesenha quando o "frame" vence — demonstra o FPS
    if (accumulator >= interval) {
      accumulator = 0;

      var speed = 120; // px por segundo
      shipX += dir * speed * interval;

      var w = SIZE * PX;
      if (shipX <= 0) {
        shipX = 0;
        dir = 1;
      } else if (shipX + w >= canvas.width) {
        shipX = canvas.width - w;
        dir = -1;
      }

      // Um frame completo = um desenho inteiro da cena
      drawFrame(interval);
    }

    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    accumulator = 0;
    initStars();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  slider.addEventListener('input', function () {
    targetFps = parseInt(slider.value, 10);
    fpsLabel.textContent = targetFps;
  });

  // Init
  initStars();
  targetFps = parseInt(slider.value, 10);
  fpsLabel.textContent = targetFps;

  // ---- API ----
  window.AnimLab = {
    setShip: setShip,
    start: start,
    stop: stop,
  };
})();
