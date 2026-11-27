/* ============================================================
   Construtor de nave 16×16 — cor RGB, ferramentas e simetria
   Expõe: window.ShipBuilder
   ============================================================ */

(function () {
  'use strict';

  var SIZE = 16;
  var CELL = 16; // 16 × 16 = canvas 256×256

  var canvas = document.getElementById('canvas-builder');
  var ctx = canvas.getContext('2d');

  var els = {
    r: document.getElementById('rgb-r'),
    g: document.getElementById('rgb-g'),
    b: document.getElementById('rgb-b'),
    rv: document.getElementById('rgb-r-val'),
    gv: document.getElementById('rgb-g-val'),
    bv: document.getElementById('rgb-b-val'),
    swatch: document.getElementById('color-swatch'),
    pencil: document.getElementById('btn-pencil'),
    eraser: document.getElementById('btn-eraser'),
    bucket: document.getElementById('btn-bucket'),
    symmetry: document.getElementById('btn-symmetry'),
    clear: document.getElementById('btn-clear'),
  };

  var grid = [];
  var color = { r: 0, g: 255, b: 0 };
  var tool = 'pencil';       // 'pencil' | 'eraser' | 'bucket'
  var symmetryOn = false;    // espelha no eixo vertical (esquerda/direita)
  var painting = false;
  var paintMode = 'paint';   // 'paint' | 'erase' (botão direito)

  function initGrid() {
    grid = [];
    for (var y = 0; y < SIZE; y++) {
      var row = [];
      for (var x = 0; x < SIZE; x++) row.push(null);
      grid.push(row);
    }
  }

  function draw() {
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var c = grid[y][x];
        ctx.fillStyle = c ? 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')' : '#070a12';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);

        ctx.strokeStyle = 'rgba(255,255,255,0.045)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL - 1, CELL - 1);
      }
    }

    // guia do eixo de simetria
    if (symmetryOn) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 233, 74, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo((SIZE * CELL) / 2, 0);
      ctx.lineTo((SIZE * CELL) / 2, SIZE * CELL);
      ctx.stroke();
      ctx.restore();
    }
  }

  function syncColor() {
    color = {
      r: parseInt(els.r.value, 10),
      g: parseInt(els.g.value, 10),
      b: parseInt(els.b.value, 10),
    };
    els.rv.textContent = color.r;
    els.gv.textContent = color.g;
    els.bv.textContent = color.b;
    els.swatch.style.background = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
  }

  function cellAt(evt) {
    var rect = canvas.getBoundingClientRect();
    var x = Math.floor(((evt.clientX - rect.left) / rect.width) * SIZE);
    var y = Math.floor(((evt.clientY - rect.top) / rect.height) * SIZE);
    return { x: x, y: y };
  }

  function sameColor(a, b) {
    if (!a || !b) return a === b; // ambos vazios = iguais
    return a.r === b.r && a.g === b.g && a.b === b.b;
  }

  function setCell(x, y, cell) {
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
    grid[y][x] = cell ? { r: cell.r, g: cell.g, b: cell.b } : null;

    if (symmetryOn) {
      var mx = SIZE - 1 - x;
      grid[y][mx] = cell ? { r: cell.r, g: cell.g, b: cell.b } : null;
    }
  }

  /* Preenche a região contígua (mesmo vazio ou mesma cor) com a cor atual. */
  function bucketFill(sx, sy) {
    var start = grid[sy][sx];
    var target = { r: color.r, g: color.g, b: color.b };
    if (sameColor(start, target)) return;

    var stack = [[sx, sy]];
    var seen = {};
    var changed = [];

    while (stack.length) {
      var p = stack.pop();
      var x = p[0];
      var y = p[1];
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) continue;

      var key = x + ',' + y;
      if (seen[key]) continue;
      seen[key] = true;

      if (!sameColor(grid[y][x], start)) continue;

      grid[y][x] = { r: target.r, g: target.g, b: target.b };
      changed.push(p);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    // espelha todo o preenchimento de uma vez
    if (symmetryOn) {
      for (var i = 0; i < changed.length; i++) {
        var cx = changed[i][0];
        var cy = changed[i][1];
        grid[cy][SIZE - 1 - cx] = { r: target.r, g: target.g, b: target.b };
      }
    }
  }

  function paint(evt, erase) {
    var p = cellAt(evt);
    if (p.x < 0 || p.x >= SIZE || p.y < 0 || p.y >= SIZE) return;

    if (tool === 'bucket' && !erase) {
      bucketFill(p.x, p.y);
      draw();
      return;
    }

    var cell = (erase || tool === 'eraser')
      ? null
      : { r: color.r, g: color.g, b: color.b };

    setCell(p.x, p.y, cell);
    draw();
  }

  function selectTool(name) {
    tool = name;
    els.pencil.classList.toggle('active', name === 'pencil');
    els.eraser.classList.toggle('active', name === 'eraser');
    els.bucket.classList.toggle('active', name === 'bucket');
    canvas.classList.toggle('bucket-mode', name === 'bucket');
  }

  function clearAll() {
    initGrid();
    draw();
  }

  function getShipData() {
    return grid.map(function (row) {
      return row.map(function (cell) {
        return cell ? { r: cell.r, g: cell.g, b: cell.b } : null;
      });
    });
  }

  function hasPixels() {
    return grid.some(function (row) {
      return row.some(function (cell) { return cell !== null; });
    });
  }

  // ---- Eventos de pintura (mouse via pointer events) ----
  canvas.addEventListener('pointerdown', function (evt) {
    evt.preventDefault();

    if (evt.button === 2) {
      // botão direito apaga, independente da ferramenta ativa
      paintMode = 'erase';
      painting = true;
    } else {
      paintMode = 'paint';
      if (tool === 'bucket') {
        paint(evt, false);
        painting = false;
        return;
      }
      painting = true;
    }

    if (canvas.setPointerCapture) canvas.setPointerCapture(evt.pointerId);
    paint(evt, paintMode === 'erase');
  });

  canvas.addEventListener('pointermove', function (evt) {
    if (!painting) return;
    evt.preventDefault();
    paint(evt, paintMode === 'erase');
  });

  window.addEventListener('pointerup', function () { painting = false; });
  window.addEventListener('pointercancel', function () { painting = false; });

  // impede o menu de contexto somente no canvas do construtor
  canvas.addEventListener('contextmenu', function (evt) {
    evt.preventDefault();
  });

  // ---- Controles ----
  els.r.addEventListener('input', syncColor);
  els.g.addEventListener('input', syncColor);
  els.b.addEventListener('input', syncColor);

  els.pencil.addEventListener('click', function () { selectTool('pencil'); });
  els.eraser.addEventListener('click', function () { selectTool('eraser'); });
  els.bucket.addEventListener('click', function () { selectTool('bucket'); });

  els.symmetry.addEventListener('click', function () {
    symmetryOn = !symmetryOn;
    els.symmetry.classList.toggle('active', symmetryOn);
    els.symmetry.textContent = symmetryOn ? 'SIMETRIA: ON' : 'SIMETRIA: OFF';
    draw();
  });

  els.clear.addEventListener('click', clearAll);

  // Paleta rápida
  var quick = document.querySelectorAll('.swatch-btn');
  Array.prototype.forEach.call(quick, function (btn) {
    btn.addEventListener('click', function () {
      els.r.value = btn.getAttribute('data-r');
      els.g.value = btn.getAttribute('data-g');
      els.b.value = btn.getAttribute('data-b');
      syncColor();
    });
  });

  // ---- Init ----
  initGrid();
  syncColor();
  selectTool('pencil');
  draw();

  // ---- API ----
  window.ShipBuilder = {
    getShipData: getShipData,
    hasPixels: hasPixels,
    clear: clearAll,
  };
})();
