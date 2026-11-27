/* ============================================================
   Construtor de nave 16×16 — cor RGB e desenho pixel por pixel
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
    eraser: document.getElementById('btn-eraser'),
    clear: document.getElementById('btn-clear'),
  };

  var grid = [];
  var color = { r: 0, g: 255, b: 0 };
  var eraserOn = false;
  var painting = false;

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

  function paint(evt) {
    var p = cellAt(evt);
    if (p.x < 0 || p.x >= SIZE || p.y < 0 || p.y >= SIZE) return;
    grid[p.y][p.x] = eraserOn ? null : { r: color.r, g: color.g, b: color.b };
    draw();
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

  // ---- Eventos de pintura (mouse + toque via pointer events) ----
  canvas.addEventListener('pointerdown', function (evt) {
    evt.preventDefault();
    painting = true;
    if (canvas.setPointerCapture) canvas.setPointerCapture(evt.pointerId);
    paint(evt);
  });

  canvas.addEventListener('pointermove', function (evt) {
    if (!painting) return;
    evt.preventDefault();
    paint(evt);
  });

  window.addEventListener('pointerup', function () { painting = false; });
  window.addEventListener('pointercancel', function () { painting = false; });

  // ---- Controles ----
  els.r.addEventListener('input', syncColor);
  els.g.addEventListener('input', syncColor);
  els.b.addEventListener('input', syncColor);

  els.eraser.addEventListener('click', function () {
    eraserOn = !eraserOn;
    els.eraser.classList.toggle('active', eraserOn);
    els.eraser.textContent = eraserOn ? 'BORRACHA: ON' : 'BORRACHA';
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
  draw();

  // ---- API ----
  window.ShipBuilder = {
    getShipData: getShipData,
    hasPixels: hasPixels,
    clear: clearAll,
  };
})();
