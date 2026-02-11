/* Physics Playground - Circuits & Electricity Simulation */

function fullSketch(p) {
  var paused = false;

  // --- State ---
  var voltage = 12;
  var resistors = [10, 20, 30];
  var circuitMode = 'series';
  var numResistors = 3;
  var showDots = true;

  // --- Computed ---
  var rTotal = 0;
  var iTotal = 0;
  var rData = []; // per-resistor: { v, i, p }

  // --- Dot animation ---
  var dots = [];
  var numDots = 40;
  var speedScale = 12;

  // --- Colors ---
  var BG = [13, 17, 23];
  var ACCENT = [212, 167, 44];
  var BORDER = [48, 54, 61];
  var WIRE_COLOR = [100, 110, 120];
  var GLOW_COLOR = [255, 160, 50];
  var COL_TEXT = [139, 148, 158];
  var RESISTOR_BODY = [70, 80, 90];
  var BATTERY_POS = [255, 100, 100];
  var BATTERY_NEG = [100, 140, 255];

  // --- Wire paths (computed on layout) ---
  var wirePaths = []; // array of paths; each path = array of {x, y}
  var branchMap = []; // maps dot branch index to wirePaths index

  // --- Layout constants ---
  var margin = 0;
  var battX = 0, battY1 = 0, battY2 = 0;

  p.setup = function () {
    p.createCanvas(p.width || 100, p.height || 100);
    resizeToContainer();
    p.frameRate(60);
    p.textFont('monospace');
    recalculate();
    bindControls();
  };

  function resizeToContainer() {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  }

  // ========================================
  // RECALCULATE
  // ========================================
  function recalculate() {
    var activeR = resistors.slice(0, numResistors);

    if (circuitMode === 'series') {
      rTotal = 0;
      for (var i = 0; i < activeR.length; i++) rTotal += activeR[i];
      iTotal = voltage / rTotal;
      rData = [];
      for (var i = 0; i < activeR.length; i++) {
        var v = iTotal * activeR[i];
        rData.push({ v: v, i: iTotal, p: v * iTotal });
      }
    } else {
      var invR = 0;
      for (var i = 0; i < activeR.length; i++) invR += 1 / activeR[i];
      rTotal = 1 / invR;
      iTotal = voltage / rTotal;
      rData = [];
      for (var i = 0; i < activeR.length; i++) {
        var branchI = voltage / activeR[i];
        rData.push({ v: voltage, i: branchI, p: voltage * branchI });
      }
    }

    updateReadouts();
    computeLayout();
    initDots();
  }

  // ========================================
  // READOUT UPDATE
  // ========================================
  function updateReadouts() {
    setVal('rtotal-val', rTotal.toFixed(1) + '\u03A9');
    setVal('itotal-val', iTotal.toFixed(3) + 'A');

    for (var i = 0; i < 3; i++) {
      var row = document.getElementById('readout-r' + (i + 1));
      if (row) row.style.display = (i < numResistors) ? '' : 'none';

      if (i < rData.length) {
        setVal('v' + (i + 1) + '-val', rData[i].v.toFixed(2) + 'V');
        setVal('i' + (i + 1) + '-val', rData[i].i.toFixed(3) + 'A');
        setVal('p' + (i + 1) + '-val', rData[i].p.toFixed(2) + 'W');
      } else {
        setVal('v' + (i + 1) + '-val', '-');
        setVal('i' + (i + 1) + '-val', '-');
        setVal('p' + (i + 1) + '-val', '-');
      }
    }
  }

  function setVal(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  // ========================================
  // LAYOUT COMPUTATION
  // ========================================
  function computeLayout() {
    var w = p.width;
    var h = p.height;
    margin = Math.min(w, h) * 0.1;
    var innerW = w - margin * 2;
    var innerH = h - margin * 2;

    wirePaths = [];
    branchMap = [];

    // Battery position: left side, centered vertically
    battX = margin;
    var midY = h / 2;
    battY1 = midY - innerH * 0.15; // + terminal (top)
    battY2 = midY + innerH * 0.15; // - terminal (bottom)

    var topY = margin + 10;
    var botY = h - margin - 10;
    var leftX = margin;
    var rightX = w - margin;

    if (circuitMode === 'series') {
      // Single loop: battery left side, resistors along top wire
      // Path: battery+ -> top-left -> across top (with resistors) -> top-right -> down right -> bottom-right -> across bottom -> bottom-left -> battery-
      var path = [];

      // Battery + terminal to top-left corner
      path.push({ x: leftX, y: battY1 });
      path.push({ x: leftX, y: topY });
      path.push({ x: leftX + 20, y: topY });

      // Place resistors along top
      var resistorRegionStart = leftX + 30;
      var resistorRegionEnd = rightX - 30;
      var resistorRegionW = resistorRegionEnd - resistorRegionStart;
      var spacing = resistorRegionW / numResistors;

      for (var i = 0; i < numResistors; i++) {
        var rx1 = resistorRegionStart + i * spacing + spacing * 0.15;
        var rx2 = resistorRegionStart + (i + 1) * spacing - spacing * 0.15;
        path.push({ x: rx1, y: topY, resistor: i, rStart: true });
        path.push({ x: rx2, y: topY, resistor: i, rEnd: true });
      }

      // Continue around the loop
      path.push({ x: rightX - 20, y: topY });
      path.push({ x: rightX, y: topY });
      path.push({ x: rightX, y: botY });
      path.push({ x: leftX, y: botY });
      path.push({ x: leftX, y: battY2 });

      wirePaths.push(path);
      branchMap.push(0);

    } else {
      // Parallel: battery on left, branches spread vertically
      // Each branch is a separate path for dot animation purposes
      // But we also need the shared wires (top bus, bottom bus)

      var branchSpacing = innerH / (numResistors + 1);
      var splitX = leftX + innerW * 0.2;
      var mergeX = rightX - innerW * 0.2;

      for (var i = 0; i < numResistors; i++) {
        var branchY = margin + branchSpacing * (i + 1);
        var path = [];

        // From battery+ up to top, across to split point
        path.push({ x: leftX, y: battY1 });
        path.push({ x: leftX, y: topY });
        path.push({ x: splitX, y: topY });

        // Down to branch height
        path.push({ x: splitX, y: branchY });

        // Resistor in this branch
        var rx1 = splitX + (mergeX - splitX) * 0.2;
        var rx2 = splitX + (mergeX - splitX) * 0.8;
        path.push({ x: rx1, y: branchY, resistor: i, rStart: true });
        path.push({ x: rx2, y: branchY, resistor: i, rEnd: true });

        // To merge point
        path.push({ x: mergeX, y: branchY });

        // Down to bottom, back to battery
        path.push({ x: mergeX, y: botY });
        path.push({ x: leftX, y: botY });
        path.push({ x: leftX, y: battY2 });

        wirePaths.push(path);
        branchMap.push(i);
      }
    }
  }

  // ========================================
  // DOT INITIALIZATION
  // ========================================
  function initDots() {
    dots = [];

    if (circuitMode === 'series') {
      for (var i = 0; i < numDots; i++) {
        dots.push({
          t: i / numDots,
          pathIdx: 0
        });
      }
    } else {
      // Distribute dots across branches proportionally to current
      var totalI = 0;
      for (var b = 0; b < numResistors; b++) {
        totalI += (b < rData.length) ? rData[b].i : 0;
      }

      for (var b = 0; b < numResistors; b++) {
        var branchI = (b < rData.length) ? rData[b].i : 0;
        var branchDots = (totalI > 0) ? Math.max(3, Math.round((branchI / totalI) * numDots)) : Math.round(numDots / numResistors);

        for (var i = 0; i < branchDots; i++) {
          dots.push({
            t: i / branchDots,
            pathIdx: b
          });
        }
      }
    }
  }

  // ========================================
  // PATH UTILITIES
  // ========================================
  function getPathLength(path) {
    var len = 0;
    for (var i = 1; i < path.length; i++) {
      var dx = path[i].x - path[i - 1].x;
      var dy = path[i].y - path[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  function getPositionAlongPath(path, t) {
    var totalLen = getPathLength(path);
    var targetDist = t * totalLen;
    var traveled = 0;

    for (var i = 1; i < path.length; i++) {
      var dx = path[i].x - path[i - 1].x;
      var dy = path[i].y - path[i - 1].y;
      var segLen = Math.sqrt(dx * dx + dy * dy);

      if (traveled + segLen >= targetDist) {
        var frac = (segLen > 0) ? (targetDist - traveled) / segLen : 0;
        return {
          x: path[i - 1].x + dx * frac,
          y: path[i - 1].y + dy * frac
        };
      }
      traveled += segLen;
    }

    // Fallback: end of path
    return { x: path[path.length - 1].x, y: path[path.length - 1].y };
  }

  // ========================================
  // DRAWING
  // ========================================
  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    if (!paused) {
      updateDots();
    }

    drawWires();
    drawResistors();
    drawBattery();

    if (showDots) {
      drawDots();
    }

    drawLabels();

    if (paused) {
      p.noStroke();
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 180);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(12);
      p.text('PAUSED', p.width / 2, 8);
    }
  };

  // ========================================
  // UPDATE DOTS
  // ========================================
  function updateDots() {
    var dt = 1 / 60;

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      var pathIdx = dot.pathIdx;

      if (pathIdx >= wirePaths.length) continue;

      var path = wirePaths[pathIdx];
      var pathLen = getPathLength(path);
      if (pathLen <= 0) continue;

      // Speed: proportional to current in this branch
      var current;
      if (circuitMode === 'series') {
        current = iTotal;
      } else {
        current = (pathIdx < rData.length) ? rData[pathIdx].i : 0;
      }

      var pixelsPerSecond = current * speedScale;
      var tStep = (pixelsPerSecond * dt) / pathLen;

      dot.t += tStep;
      if (dot.t > 1) dot.t -= 1;
      if (dot.t < 0) dot.t += 1;
    }
  }

  // ========================================
  // DRAW WIRES
  // ========================================
  function drawWires() {
    p.stroke(WIRE_COLOR[0], WIRE_COLOR[1], WIRE_COLOR[2]);
    p.strokeWeight(2);
    p.noFill();

    for (var pi = 0; pi < wirePaths.length; pi++) {
      var path = wirePaths[pi];

      for (var i = 1; i < path.length; i++) {
        var prev = path[i - 1];
        var curr = path[i];

        // Skip resistor segments (rStart to rEnd) -- drawn separately as zigzags
        if (prev.rStart && curr.rEnd) continue;

        p.stroke(WIRE_COLOR[0], WIRE_COLOR[1], WIRE_COLOR[2]);
        p.strokeWeight(2);
        p.line(prev.x, prev.y, curr.x, curr.y);
      }
    }

    // Draw parallel junction nodes if in parallel mode
    if (circuitMode === 'parallel' && numResistors > 1 && wirePaths.length > 0) {
      var firstPath = wirePaths[0];
      var splitPt = firstPath[2]; // top of split
      var mergePt = firstPath[firstPath.length - 3]; // merge point

      p.noStroke();
      p.fill(WIRE_COLOR[0], WIRE_COLOR[1], WIRE_COLOR[2]);
      p.ellipse(splitPt.x, splitPt.y, 6, 6);
      p.ellipse(mergePt.x, mergePt.y, 6, 6);
    }
  }

  // ========================================
  // DRAW RESISTORS
  // ========================================
  function drawResistors() {
    // Find resistor start/end in the paths
    for (var pi = 0; pi < wirePaths.length; pi++) {
      var path = wirePaths[pi];

      for (var i = 1; i < path.length; i++) {
        if (path[i - 1].rStart && path[i].rEnd) {
          var rIdx = path[i - 1].resistor;
          var x1 = path[i - 1].x;
          var y1 = path[i - 1].y;
          var x2 = path[i].x;
          var y2 = path[i].y;

          drawResistorSymbol(x1, y1, x2, y2, rIdx);
        }
      }
    }
  }

  function drawResistorSymbol(x1, y1, x2, y2, rIdx) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;

    // Direction vectors
    var nx = dx / len;
    var ny = dy / len;
    var px = -ny; // perpendicular
    var py = nx;

    var numZigs = 6;
    var amplitude = Math.min(10, len * 0.12);

    // Compute power for glow
    var power = (rIdx < rData.length) ? rData[rIdx].p : 0;
    var maxPower = voltage * voltage / 1; // max possible (1 ohm)
    var glowAlpha = PhysicsUtils.clamp(PhysicsUtils.mapRange(power, 0, maxPower * 0.3, 10, 140), 10, 140);

    // Glow layer
    p.noFill();
    p.stroke(GLOW_COLOR[0], GLOW_COLOR[1], GLOW_COLOR[2], glowAlpha);
    p.strokeWeight(12);
    p.beginShape();
    p.vertex(x1, y1);
    for (var z = 0; z < numZigs; z++) {
      var frac = (z + 0.5) / numZigs;
      var mx = x1 + dx * frac;
      var my = y1 + dy * frac;
      var side = (z % 2 === 0) ? 1 : -1;
      p.vertex(mx + px * amplitude * side, my + py * amplitude * side);
    }
    p.vertex(x2, y2);
    p.endShape();

    // Solid zigzag
    p.stroke(ACCENT[0], ACCENT[1], ACCENT[2]);
    p.strokeWeight(2.5);
    p.beginShape();
    p.vertex(x1, y1);
    for (var z = 0; z < numZigs; z++) {
      var frac = (z + 0.5) / numZigs;
      var mx = x1 + dx * frac;
      var my = y1 + dy * frac;
      var side = (z % 2 === 0) ? 1 : -1;
      p.vertex(mx + px * amplitude * side, my + py * amplitude * side);
    }
    p.vertex(x2, y2);
    p.endShape();

    // Resistor label
    var midX = (x1 + x2) / 2;
    var midY = (y1 + y2) / 2;
    p.noStroke();
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2], 200);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(Math.max(9, Math.min(11, len * 0.08)));
    var labelOffsetX = px * (amplitude + 14);
    var labelOffsetY = py * (amplitude + 14);
    p.text('R' + (rIdx + 1), midX + labelOffsetX, midY + labelOffsetY);

    // Value label
    p.textSize(Math.max(8, Math.min(9, len * 0.06)));
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2], 140);
    p.text(resistors[rIdx] + '\u03A9', midX + labelOffsetX, midY + labelOffsetY + 12);
  }

  // ========================================
  // DRAW BATTERY
  // ========================================
  function drawBattery() {
    var bx = battX;
    var by1 = battY1;
    var by2 = battY2;
    var midY = (by1 + by2) / 2;

    var longLineW = 18;
    var shortLineW = 10;
    var gap = 5;

    // Positive plate (longer, thinner line at top)
    p.stroke(BATTERY_POS[0], BATTERY_POS[1], BATTERY_POS[2]);
    p.strokeWeight(2.5);
    p.line(bx - longLineW / 2, midY - gap, bx + longLineW / 2, midY - gap);

    // Negative plate (shorter, thicker line at bottom)
    p.stroke(BATTERY_NEG[0], BATTERY_NEG[1], BATTERY_NEG[2]);
    p.strokeWeight(4);
    p.line(bx - shortLineW / 2, midY + gap, bx + shortLineW / 2, midY + gap);

    // Wire from + terminal up
    p.stroke(WIRE_COLOR[0], WIRE_COLOR[1], WIRE_COLOR[2]);
    p.strokeWeight(2);
    p.line(bx, by1, bx, midY - gap);

    // Wire from - terminal down
    p.line(bx, midY + gap, bx, by2);

    // + and - labels
    p.noStroke();
    p.fill(BATTERY_POS[0], BATTERY_POS[1], BATTERY_POS[2], 200);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(10);
    p.text('+', bx - longLineW / 2 - 10, midY - gap);

    p.fill(BATTERY_NEG[0], BATTERY_NEG[1], BATTERY_NEG[2], 200);
    p.text('\u2212', bx - shortLineW / 2 - 10, midY + gap);

    // Voltage label
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2], 200);
    p.textSize(10);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(voltage + 'V', bx - 2, midY + gap + 22);
  }

  // ========================================
  // DRAW DOTS
  // ========================================
  function drawDots() {
    p.noStroke();

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      var pathIdx = dot.pathIdx;

      if (pathIdx >= wirePaths.length) continue;

      var path = wirePaths[pathIdx];
      var pos = getPositionAlongPath(path, dot.t);

      // Glow
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 50);
      p.ellipse(pos.x, pos.y, 10, 10);

      // Dot body
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 230);
      p.ellipse(pos.x, pos.y, 5, 5);
    }
  }

  // ========================================
  // DRAW LABELS
  // ========================================
  function drawLabels() {
    p.noStroke();
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2], 120);
    p.textAlign(p.RIGHT, p.TOP);
    p.textSize(10);

    var modeLabel = circuitMode === 'series' ? 'Series' : 'Parallel';
    p.text(modeLabel + ' \u00B7 ' + numResistors + ' resistor' + (numResistors > 1 ? 's' : ''), p.width - 10, 10);

    // Total current
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 160);
    p.textSize(10);
    p.text('I = ' + iTotal.toFixed(3) + 'A', p.width - 10, p.height - 10);
  }

  // ========================================
  // CONTROLS BINDING
  // ========================================
  function bindControls() {
    PhysicsUtils.bindSlider('voltage-slider', 'voltage-value', function (v) {
      voltage = v;
      recalculate();
    });

    PhysicsUtils.bindSlider('r1-slider', 'r1-value', function (v) {
      resistors[0] = v;
      recalculate();
    });

    PhysicsUtils.bindSlider('r2-slider', 'r2-value', function (v) {
      resistors[1] = v;
      recalculate();
    });

    PhysicsUtils.bindSlider('r3-slider', 'r3-value', function (v) {
      resistors[2] = v;
      recalculate();
    });

    // Circuit mode toggle
    var modeRadios = document.querySelectorAll('#mode-toggle input[type="radio"]');
    for (var i = 0; i < modeRadios.length; i++) {
      modeRadios[i].addEventListener('change', function () {
        circuitMode = this.value;
        recalculate();
      });
    }

    // Number of resistors toggle
    var numRadios = document.querySelectorAll('#num-toggle input[type="radio"]');
    for (var i = 0; i < numRadios.length; i++) {
      numRadios[i].addEventListener('change', function () {
        numResistors = parseInt(this.value);
        recalculate();
      });
    }

    // Show dots toggle
    var dotsToggle = document.getElementById('dots-toggle');
    if (dotsToggle) {
      dotsToggle.addEventListener('change', function () {
        showDots = dotsToggle.checked;
      });
    }

    // Reset button
    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        voltage = 12;
        resistors = [10, 20, 30];
        circuitMode = 'series';
        numResistors = 3;
        showDots = true;
        paused = false;
        var pb = document.getElementById('pause-btn');
        if (pb) pb.textContent = 'Pause';

        // Reset slider values
        setSlider('voltage-slider', 'voltage-value', 12);
        setSlider('r1-slider', 'r1-value', 10);
        setSlider('r2-slider', 'r2-value', 20);
        setSlider('r3-slider', 'r3-value', 30);

        // Reset radio buttons
        var seriesRadio = document.getElementById('mode-series');
        if (seriesRadio) seriesRadio.checked = true;
        var num3Radio = document.getElementById('num-3');
        if (num3Radio) num3Radio.checked = true;

        // Reset toggle
        var dt = document.getElementById('dots-toggle');
        if (dt) dt.checked = true;

        recalculate();
        p.loop();
      });
    }

    // Pause button
    var pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      });
    }
  }

  function setSlider(sliderId, valueId, val) {
    var slider = document.getElementById(sliderId);
    var display = document.getElementById(valueId);
    if (slider) slider.value = val;
    if (display) display.textContent = val;
  }

  // ========================================
  // RESIZE
  // ========================================
  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      computeLayout();
    }
  };
}


// ========================================
// PREVIEW SKETCH (landing page card)
// ========================================
function previewSketch(p) {
  var time = 0;
  var dots = [];

  p.setup = function () {
    var container = p.canvas.parentElement;
    p.createCanvas(container.clientWidth, container.clientHeight);
    p.frameRate(60);

    // Create some dots along a circuit path
    for (var i = 0; i < 20; i++) {
      dots.push({ t: i / 20 });
    }
  };

  p.draw = function () {
    p.background(13, 17, 23);
    time += 1 / 60;

    var w = p.width;
    var h = p.height;
    var mx = w * 0.12;
    var my = h * 0.2;
    var rw = w - mx * 2;
    var rh = h - my * 2;

    // Draw circuit loop
    p.stroke(100, 110, 120);
    p.strokeWeight(2);
    p.noFill();

    // Top wire
    p.line(mx, my, mx + rw, my);
    // Right wire
    p.line(mx + rw, my, mx + rw, my + rh);
    // Bottom wire
    p.line(mx + rw, my + rh, mx, my + rh);
    // Left wire (battery gap)
    p.line(mx, my + rh, mx, h * 0.58);
    p.line(mx, h * 0.42, mx, my);

    // Battery
    p.stroke(255, 100, 100);
    p.strokeWeight(2.5);
    p.line(mx - 8, h * 0.42, mx + 8, h * 0.42);
    p.stroke(100, 140, 255);
    p.strokeWeight(3.5);
    p.line(mx - 5, h * 0.58, mx + 5, h * 0.58);

    // Resistors (zigzag) along top
    var rSpacing = rw / 3;
    for (var r = 0; r < 3; r++) {
      var rx1 = mx + rSpacing * r + rSpacing * 0.2;
      var rx2 = mx + rSpacing * (r + 1) - rSpacing * 0.2;
      var segW = (rx2 - rx1) / 6;
      var amp = 6;

      // Glow
      p.noFill();
      p.stroke(255, 160, 50, 30 + r * 20);
      p.strokeWeight(8);
      p.beginShape();
      p.vertex(rx1, my);
      for (var z = 0; z < 6; z++) {
        var zx = rx1 + segW * (z + 0.5);
        var side = (z % 2 === 0) ? -1 : 1;
        p.vertex(zx, my + amp * side);
      }
      p.vertex(rx2, my);
      p.endShape();

      // Solid
      p.stroke(212, 167, 44);
      p.strokeWeight(2);
      p.beginShape();
      p.vertex(rx1, my);
      for (var z = 0; z < 6; z++) {
        var zx = rx1 + segW * (z + 0.5);
        var side = (z % 2 === 0) ? -1 : 1;
        p.vertex(zx, my + amp * side);
      }
      p.vertex(rx2, my);
      p.endShape();
    }

    // Animated dots
    var pathPoints = [
      { x: mx, y: h * 0.42 },
      { x: mx, y: my },
      { x: mx + rw, y: my },
      { x: mx + rw, y: my + rh },
      { x: mx, y: my + rh },
      { x: mx, y: h * 0.58 }
    ];

    var totalLen = 0;
    for (var i = 1; i < pathPoints.length; i++) {
      var ddx = pathPoints[i].x - pathPoints[i - 1].x;
      var ddy = pathPoints[i].y - pathPoints[i - 1].y;
      totalLen += Math.sqrt(ddx * ddx + ddy * ddy);
    }

    p.noStroke();
    for (var d = 0; d < dots.length; d++) {
      dots[d].t += (0.4 / totalLen);
      if (dots[d].t > 1) dots[d].t -= 1;

      var target = dots[d].t * totalLen;
      var traveled = 0;
      var px = pathPoints[0].x;
      var py = pathPoints[0].y;

      for (var i = 1; i < pathPoints.length; i++) {
        var ddx = pathPoints[i].x - pathPoints[i - 1].x;
        var ddy = pathPoints[i].y - pathPoints[i - 1].y;
        var segLen = Math.sqrt(ddx * ddx + ddy * ddy);
        if (traveled + segLen >= target) {
          var frac = (target - traveled) / segLen;
          px = pathPoints[i - 1].x + ddx * frac;
          py = pathPoints[i - 1].y + ddy * frac;
          break;
        }
        traveled += segLen;
      }

      p.fill(212, 167, 44, 40);
      p.ellipse(px, py, 8, 8);
      p.fill(212, 167, 44);
      p.ellipse(px, py, 4, 4);
    }
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  };
}
