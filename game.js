/* ============================================================
   Fliperama — nave do visitante, tiros, obstáculos e colisão
   Expõe: window.Game
   ============================================================ */

(function () {
  'use strict';

  var W = 400;
  var H = 600;

  var canvas = document.getElementById('canvas-game');
  var ctx = canvas.getContext('2d');
  var hudScore = document.getElementById('hud-score');
  var hudLives = document.getElementById('hud-lives');
  var hudTime = document.getElementById('hud-time');

  var PX = 4;               // nave 16×16 → 64×64
  var SHIP_W = 16 * PX;
  var SHIP_H = 16 * PX;

  var GAME_TIME = 60;       // duração da partida em segundos
  var COUNTDOWN = 3;        // 3-2-1 antes de liberar o timer

  var running = false;
  var rafId = null;
  var lastTime = 0;

  var ship = null;          // dados 16×16 vindos do construtor
  var score = 0;
  var lives = 3;
  var timeLeft = GAME_TIME;
  var countdown = COUNTDOWN;
  var phase = 'countdown';  // 'countdown' | 'playing'
  var fireQueued = false;   // um tiro por pressionamento

  var player = {
    x: W / 2 - SHIP_W / 2,
    y: H - 92,
    speed: 330,
    invuln: 0,
    cooldown: 0,
  };

  var bullets = [];
  var enemies = [];
  var particles = [];
  var stars = [];

  var spawnTimer = 0;
  var spawnInterval = 0.85;
  var shake = 0;

  var keys = { left: false, right: false };

  /* ---------------- Input ---------------- */

  function onKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space' && running) {
      e.preventDefault();
      // e.repeat ignora o auto-repeat do teclado: segurar não dispara sozinho
      if (!e.repeat && phase === 'playing') fireQueued = true;
    }
  }

  function onKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // evita que a nave continue andando se a janela perder o foco
  window.addEventListener('blur', function () {
    keys.left = false;
    keys.right = false;
  });

  /* ---------------- Helpers ---------------- */

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function aabb(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function updateHud() {
    hudScore.textContent = score;
    hudLives.textContent = lives;
    hudTime.textContent = Math.max(0, Math.ceil(timeLeft));
    hudTime.classList.toggle('low', phase === 'playing' && timeLeft <= 10);
  }

  /* ---------------- Estrelas de fundo ---------------- */

  function initStars() {
    stars = [];
    for (var i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: rand(16, 90),
        size: Math.random() < 0.8 ? 1 : 2,
      });
    }
  }

  /* ---------------- Entidades ---------------- */

  function reset() {
    score = 0;
    lives = 3;
    timeLeft = GAME_TIME;
    countdown = COUNTDOWN;
    phase = 'countdown';
    fireQueued = false;
    keys.left = false;
    keys.right = false;
    bullets = [];
    enemies = [];
    particles = [];
    spawnTimer = 0;
    spawnInterval = 0.85;
    shake = 0;
    player.x = W / 2 - SHIP_W / 2;
    player.y = H - 92;
    player.invuln = 0;
    player.cooldown = 0;
    initStars();
    updateHud();
  }

  function spawnEnemy() {
    var types = [
      { w: 30, h: 20, color: '#ff2bd6', vy: 115, points: 100 },
      { w: 40, h: 24, color: '#25ff6e', vy: 85, points: 70 },
      { w: 24, h: 16, color: '#ffe94a', vy: 150, points: 150 },
    ];
    var t = types[(Math.random() * types.length) | 0];

    enemies.push({
      x: rand(4, W - t.w - 4),
      y: -t.h - 4,
      w: t.w,
      h: t.h,
      vx: rand(-24, 24),
      vy: t.vy,
      color: t.color,
      points: t.points,
    });
  }

  function spawnExplosion(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = rand(40, 230);
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        decay: rand(1.6, 3.2),
        color: color,
        size: Math.random() < 0.7 ? 2 : 3,
      });
    }
  }

  /* ---------------- Update ---------------- */

  function update(dt) {
    // estrelas
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      st.y += st.speed * dt;
      if (st.y > H) {
        st.y = -2;
        st.x = Math.random() * W;
      }
    }

    // contagem regressiva: 3-2-1 antes de liberar o timer
    if (phase === 'countdown') {
      countdown -= dt;
      if (countdown <= 0) {
        countdown = 0;
        phase = 'playing';
      }
      updateHud();
      return;
    }

    // tempo de partida
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHud();
      endGame('time');
      return;
    }

    // player
    var move = 0;
    if (keys.left) move -= 1;
    if (keys.right) move += 1;
    player.x += move * player.speed * dt;
    player.x = Math.max(0, Math.min(W - SHIP_W, player.x));

    if (player.invuln > 0) player.invuln -= dt;
    if (player.cooldown > 0) player.cooldown -= dt;

    // tiro: um disparo por pressionamento (sem auto-repeat)
    if (fireQueued && player.cooldown <= 0) {
      bullets.push({
        x: player.x + SHIP_W / 2 - 2,
        y: player.y + 6,
        w: 4,
        h: 14,
        vy: -520,
      });
      player.cooldown = 0.16;
      fireQueued = false;
    }

    // balas
    for (var b = bullets.length - 1; b >= 0; b--) {
      bullets[b].y += bullets[b].vy * dt;
      if (bullets[b].y + bullets[b].h < 0) bullets.splice(b, 1);
    }

    // spawn
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnEnemy();
      if (spawnInterval > 0.42) spawnInterval -= 0.012;
    }

    // inimigos
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (e.x <= 0 || e.x + e.w >= W) {
        e.vx *= -1;
        e.x = Math.max(0, Math.min(W - e.w, e.x));
      }

      if (e.y > H + 20) {
        enemies.splice(i, 1);
        continue;
      }

      // tiro × inimigo
      var destroyed = false;
      for (var j = bullets.length - 1; j >= 0; j--) {
        if (aabb(e, bullets[j])) {
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 12);
          bullets.splice(j, 1);
          enemies.splice(i, 1);
          score += e.points;
          updateHud();
          destroyed = true;
          break;
        }
      }
      if (destroyed) continue;

      // inimigo × nave
      if (player.invuln <= 0 && aabb(e, {
        x: player.x + 10,
        y: player.y + 10,
        w: SHIP_W - 20,
        h: SHIP_H - 20,
      })) {
        spawnExplosion(player.x + SHIP_W / 2, player.y + SHIP_H / 2, '#ff3355', 22);
        enemies.splice(i, 1);
        lives -= 1;
        shake = 0.32;
        player.invuln = 1.6;
        updateHud();

        if (lives <= 0) {
          endGame('lives');
          return;
        }
      }
    }

    // partículas
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
      pt.life -= pt.decay * dt;
      if (pt.life <= 0) particles.splice(p, 1);
    }

    // tremor
    if (shake > 0) shake -= dt;

    updateHud();
  }

  /* ---------------- Draw ---------------- */

  function drawShipPixels(x, y, data) {
    if (!data) return;
    for (var yy = 0; yy < 16; yy++) {
      for (var xx = 0; xx < 16; xx++) {
        var c = data[yy][xx];
        if (!c) continue;
        ctx.fillStyle = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
        ctx.fillRect(
          Math.round(x + xx * PX),
          Math.round(y + yy * PX),
          PX,
          PX
        );
      }
    }
  }

  function draw() {
    ctx.save();

    if (shake > 0) {
      var intensity = 7 * (shake / 0.32);
      ctx.translate(rand(-intensity, intensity), rand(-intensity, intensity));
    }

    // fundo
    ctx.fillStyle = '#04060e';
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // estrelas
    ctx.fillStyle = 'rgba(170, 200, 255, 0.55)';
    for (var s = 0; s < stars.length; s++) {
      ctx.fillRect(stars[s].x | 0, stars[s].y | 0, stars[s].size, stars[s].size);
    }

    // grade sutil
    ctx.strokeStyle = 'rgba(35, 44, 74, 0.35)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
      ctx.stroke();
    }
    for (var gy = 0; gy <= H; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
      ctx.stroke();
    }

    // nave do jogador (pisca durante invulnerabilidade)
    if (player.invuln <= 0 || Math.floor(player.invuln * 12) % 2 === 0) {
      ctx.save();
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 14;
      drawShipPixels(player.x, player.y, ship);
      ctx.restore();
    }

    // balas
    ctx.save();
    ctx.shadowColor = '#00f2ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#9ffcff';
    for (var b = 0; b < bullets.length; b++) {
      var bl = bullets[b];
      ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
    }
    ctx.restore();

    // inimigos
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      ctx.save();
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = e.color;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), e.w, e.h);

      // "olhos" estilo arcade
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0a0e1c';
      ctx.fillRect(Math.round(e.x + 5), Math.round(e.y + 5), 5, 5);
      ctx.fillRect(Math.round(e.x + e.w - 10), Math.round(e.y + 5), 5, 5);
      ctx.restore();
    }

    // partículas
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x | 0, pt.y | 0, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // flash vermelho ao levar dano
    if (shake > 0) {
      ctx.fillStyle = 'rgba(255, 51, 85, ' + (0.18 * (shake / 0.32)) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------------- Contagem regressiva ---------------- */

  function drawCountdown() {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 14, 0.66)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#e9edf8';
    ctx.shadowColor = '#00f2ff';
    ctx.shadowBlur = 24;
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillText('PREPARE-SE', W / 2, H / 2 - 100);

    ctx.font = 'bold 120px "Courier New", monospace';
    ctx.fillStyle = '#00f2ff';
    ctx.shadowBlur = 40;
    ctx.fillText(String(Math.max(1, Math.ceil(countdown))), W / 2, H / 2 + 10);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(127, 138, 176, 0.95)';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('Faça o máximo de pontos!', W / 2, H / 2 + 105);

    ctx.restore();
  }

  /* ---------------- Loop ---------------- */

  function loop(now) {
    if (!running) return;

    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.05) dt = 0.05;

    update(dt);
    if (!running) return; // pode ter terminado no update
    draw();
    if (phase === 'countdown') drawCountdown();

    rafId = requestAnimationFrame(loop);
  }

  /* ---------------- Controle de partida ---------------- */

  function start(data) {
    ship = data || null;
    reset();
    running = true;
    lastTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function endGame(reason) {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    window.dispatchEvent(new CustomEvent('gameover', {
      detail: {
        score: score,
        reason: reason || 'lives',
        timeLeft: Math.max(0, Math.ceil(timeLeft)),
      },
    }));
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* ---------------- Init ---------------- */

  initStars();
  draw();

  // ---- API ----
  window.Game = {
    start: start,
    stop: stop,
  };
})();
