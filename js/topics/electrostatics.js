/* Physics Playground - Electrostatics & Fields Simulation */

function fullSketch(p) {
  // --- State ---
  var charges = [];
  var paused = false;
  var fieldMode = 'arrows'; // 'arrows', 'lines', 'none'
  var showPotential = false;
  var lockCharges = false;
  var chargePolarity = 1; // +1 or -1
  var chargeMagnitude = 5;
  var dragging = -1; // index of dragged charge, -1 = none

  // --- Colors ---
  var BG = [13, 17, 23];
  var ACCENT = [227, 179, 65];
  var POS_COLOR = [255, 80, 80];
  var NEG_COLOR = [80, 130, 255];
  var COL_TEXT = [139, 148, 158];
  var COL_BORDER = [48, 54, 61];

  // --- Physics constants (scaled for pixel space) ---
  var k = 500;
  var SOFTENING = 400;
  var DAMPING = 0.98;

  // --- Field grid ---
  var gridCols = 30;
  var gridRows = 20;
  var gridStepX, gridStepY;

  // --- Potential heatmap buffer ---
  var potentialStep = 4; // sample every Nth pixel

  p.setup = function () {
    p.createCanvas(p.width || 100, p.height || 100);
    resizeToContainer();
    p.frameRate(60);
    p.textFont('monospace');
    computeGridSteps();
    bindControls();
  };

  function resizeToContainer() {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  }

  function computeGridSteps() {
    gridStepX = p.width / gridCols;
    gridStepY = p.height / gridRows;
  }

  // ========================================
  // ELECTRIC FIELD COMPUTATION
  // ========================================
  function computeField(px, py) {
    var ex = 0;
    var ey = 0;
    for (var i = 0; i < charges.length; i++) {
      var c = charges[i];
      var dx = px - c.x;
      var dy = py - c.y;
      var r2 = dx * dx + dy * dy + SOFTENING;
      var r = Math.sqrt(r2);
      var r3 = r2 * r;
      ex += k * c.q * dx / r3;
      ey += k * c.q * dy / r3;
    }
    return { x: ex, y: ey };
  }

  function computePotential(px, py) {
    var v = 0;
    for (var i = 0; i < charges.length; i++) {
      var c = charges[i];
      var dx = px - c.x;
      var dy = py - c.y;
      var r = Math.sqrt(dx * dx + dy * dy + SOFTENING);
      v += k * c.q / r;
    }
    return v;
  }

  // ========================================
  // MOUSE INTERACTION
  // ========================================
  p.mousePressed = function () {
    var mx = p.mouseX;
    var my = p.mouseY;

    // Check bounds
    if (mx < 0 || mx > p.width || my < 0 || my > p.height) return;

    // Try to grab existing charge
    if (!lockCharges) {
      for (var i = 0; i < charges.length; i++) {
        var c = charges[i];
        var d = p.dist(mx, my, c.x, c.y);
        var radius = chargeRadius(c.q);
        if (d < radius + 8) {
          dragging = i;
          return;
        }
      }
    }

    // Add new charge
    charges.push({
      x: mx,
      y: my,
      q: chargePolarity * chargeMagnitude,
      vx: 0,
      vy: 0
    });
  };

  p.mouseDragged = function () {
    if (dragging >= 0 && !lockCharges && dragging < charges.length) {
      charges[dragging].x = PhysicsUtils.clamp(p.mouseX, 0, p.width);
      charges[dragging].y = PhysicsUtils.clamp(p.mouseY, 0, p.height);
      charges[dragging].vx = 0;
      charges[dragging].vy = 0;
    }
  };

  p.mouseReleased = function () {
    dragging = -1;
  };

  function chargeRadius(q) {
    return PhysicsUtils.clamp(Math.abs(q) * 2.2 + 8, 10, 30);
  }

  // ========================================
  // DRAWING
  // ========================================
  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    if (charges.length === 0) {
      drawEmptyHint();
      return;
    }

    // 1. Potential heatmap (behind everything)
    if (showPotential) {
      drawPotentialHeatmap();
    }

    // 2. Field visualization
    if (fieldMode === 'arrows') {
      drawFieldArrows();
    } else if (fieldMode === 'lines') {
      drawFieldLines();
    }

    // 3. Draw charges
    drawCharges();

    // 4. Physics update (Coulomb forces between charges)
    if (!paused && !lockCharges) {
      updatePhysics();
    }

    // 5. Info overlay
    drawInfo();
  };

  function drawEmptyHint() {
    p.noStroke();
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2], 120);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(14);
    p.text('Click to place charges', p.width / 2, p.height / 2);
    p.textSize(11);
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2], 80);
    p.text('or use a preset below', p.width / 2, p.height / 2 + 24);
  }

  // ----------------------------------------
  // POTENTIAL HEATMAP
  // ----------------------------------------
  function drawPotentialHeatmap() {
    p.loadPixels();
    var d = p.pixelDensity();
    var w = p.width;
    var h = p.height;
    var fullW = w * d;
    var fullH = h * d;

    for (var py = 0; py < h; py += potentialStep) {
      for (var px = 0; px < w; px += potentialStep) {
        var v = computePotential(px, py);

        // Map potential to color: positive = red, negative = blue, zero = black
        var intensity = PhysicsUtils.clamp(Math.abs(v) * 0.15, 0, 1);
        var r, g, b;
        if (v > 0) {
          r = Math.floor(intensity * 200);
          g = Math.floor(intensity * 40);
          b = Math.floor(intensity * 40);
        } else {
          r = Math.floor(intensity * 40);
          g = Math.floor(intensity * 60);
          b = Math.floor(intensity * 200);
        }

        // Fill the potentialStep x potentialStep block
        for (var sy = 0; sy < potentialStep && py + sy < h; sy++) {
          for (var sx = 0; sx < potentialStep && px + sx < w; sx++) {
            for (var dd = 0; dd < d; dd++) {
              for (var de = 0; de < d; de++) {
                var idx = 4 * (((py + sy) * d + dd) * fullW + ((px + sx) * d + de));
                p.pixels[idx] = r;
                p.pixels[idx + 1] = g;
                p.pixels[idx + 2] = b;
                p.pixels[idx + 3] = 160;
              }
            }
          }
        }
      }
    }
    p.updatePixels();
  }

  // ----------------------------------------
  // FIELD ARROWS
  // ----------------------------------------
  function drawFieldArrows() {
    for (var col = 0; col < gridCols; col++) {
      for (var row = 0; row < gridRows; row++) {
        var px = (col + 0.5) * gridStepX;
        var py = (row + 0.5) * gridStepY;

        var e = computeField(px, py);
        var mag = Math.sqrt(e.x * e.x + e.y * e.y);

        if (mag < 0.001) continue;

        // Normalize
        var nx = e.x / mag;
        var ny = e.y / mag;

        // Arrow length: proportional to field magnitude, clamped
        var arrowLen = PhysicsUtils.clamp(mag * 0.08, 2, 15);
        var alpha = PhysicsUtils.clamp(mag * 0.3, 30, 200);

        p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], alpha);
        p.strokeWeight(1.2);

        var endX = px + nx * arrowLen;
        var endY = py + ny * arrowLen;
        p.line(px, py, endX, endY);

        // Arrowhead
        var headLen = arrowLen * 0.4;
        var headAngle = 0.5;
        p.line(
          endX,
          endY,
          endX - headLen * Math.cos(Math.atan2(ny, nx) - headAngle),
          endY - headLen * Math.sin(Math.atan2(ny, nx) - headAngle)
        );
        p.line(
          endX,
          endY,
          endX - headLen * Math.cos(Math.atan2(ny, nx) + headAngle),
          endY - headLen * Math.sin(Math.atan2(ny, nx) + headAngle)
        );
      }
    }
  }

  // ----------------------------------------
  // FIELD LINES (streamlines from positive charges)
  // ----------------------------------------
  function drawFieldLines() {
    var numRays = 10;
    var stepSize = 3;
    var maxSteps = 200;

    for (var i = 0; i < charges.length; i++) {
      var c = charges[i];
      if (c.q <= 0) continue; // Only emit from positive charges

      for (var ray = 0; ray < numRays; ray++) {
        var angle = (ray / numRays) * p.TWO_PI;
        var startR = chargeRadius(c.q) + 4;
        var lx = c.x + Math.cos(angle) * startR;
        var ly = c.y + Math.sin(angle) * startR;

        p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 120);
        p.strokeWeight(1.2);
        p.noFill();

        for (var s = 0; s < maxSteps; s++) {
          var e = computeField(lx, ly);
          var mag = Math.sqrt(e.x * e.x + e.y * e.y);
          if (mag < 0.01) break;

          var nx = e.x / mag;
          var ny = e.y / mag;

          var newX = lx + nx * stepSize;
          var newY = ly + ny * stepSize;

          // Fade alpha along the line
          var alpha = PhysicsUtils.clamp(150 - s * 0.5, 20, 150);
          p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], alpha);
          p.line(lx, ly, newX, newY);

          lx = newX;
          ly = newY;

          // Stop if out of bounds
          if (lx < -10 || lx > p.width + 10 || ly < -10 || ly > p.height + 10) break;

          // Stop if near a negative charge
          var hitNeg = false;
          for (var j = 0; j < charges.length; j++) {
            if (charges[j].q < 0) {
              var dd = p.dist(lx, ly, charges[j].x, charges[j].y);
              if (dd < chargeRadius(charges[j].q) + 2) {
                hitNeg = true;
                break;
              }
            }
          }
          if (hitNeg) break;
        }
      }
    }
  }

  // ----------------------------------------
  // CHARGES
  // ----------------------------------------
  function drawCharges() {
    for (var i = 0; i < charges.length; i++) {
      var c = charges[i];
      var r = chargeRadius(c.q);
      var col = c.q > 0 ? POS_COLOR : NEG_COLOR;

      // Glow
      p.noStroke();
      p.fill(col[0], col[1], col[2], 30);
      p.ellipse(c.x, c.y, r * 3, r * 3);

      // Body
      p.fill(col[0], col[1], col[2]);
      p.stroke(col[0], col[1], col[2], 180);
      p.strokeWeight(1);
      p.ellipse(c.x, c.y, r * 2, r * 2);

      // Symbol
      p.noStroke();
      p.fill(255, 255, 255, 230);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(Math.max(12, r * 0.9));
      p.text(c.q > 0 ? '+' : '\u2212', c.x, c.y - 1);
    }
  }

  // ----------------------------------------
  // PHYSICS UPDATE
  // ----------------------------------------
  function updatePhysics() {
    if (charges.length < 2) return;

    // Compute Coulomb forces between all pairs
    for (var i = 0; i < charges.length; i++) {
      if (i === dragging) continue; // Don't move dragged charge

      var fx = 0;
      var fy = 0;

      for (var j = 0; j < charges.length; j++) {
        if (i === j) continue;

        var dx = charges[i].x - charges[j].x;
        var dy = charges[i].y - charges[j].y;
        var r2 = dx * dx + dy * dy + SOFTENING;
        var r = Math.sqrt(r2);

        // F = k * q1 * q2 / r^2, direction along r_hat
        var forceMag = k * charges[i].q * charges[j].q / r2;
        fx += forceMag * (dx / r);
        fy += forceMag * (dy / r);
      }

      // Acceleration (mass = 1)
      charges[i].vx += fx * 0.016; // dt ~ 1/60
      charges[i].vy += fy * 0.016;

      // Damping
      charges[i].vx *= DAMPING;
      charges[i].vy *= DAMPING;

      // Update position
      charges[i].x += charges[i].vx * 0.016;
      charges[i].y += charges[i].vy * 0.016;

      // Clamp to canvas
      charges[i].x = PhysicsUtils.clamp(charges[i].x, 5, p.width - 5);
      charges[i].y = PhysicsUtils.clamp(charges[i].y, 5, p.height - 5);

      // Bounce off walls
      if (charges[i].x <= 5 || charges[i].x >= p.width - 5) charges[i].vx *= -0.5;
      if (charges[i].y <= 5 || charges[i].y >= p.height - 5) charges[i].vy *= -0.5;
    }
  }

  // ----------------------------------------
  // INFO OVERLAY
  // ----------------------------------------
  function drawInfo() {
    p.noStroke();
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2], 120);
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(10);
    p.text('Charges: ' + charges.length, 8, 8);
    if (paused) {
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 180);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(12);
      p.text('PAUSED', p.width / 2, 8);
    }
  }

  // ========================================
  // PRESETS
  // ========================================
  function presetDipole() {
    charges = [];
    var w = p.width;
    var h = p.height;
    charges.push({ x: w * 0.35, y: h * 0.5, q: 5, vx: 0, vy: 0 });
    charges.push({ x: w * 0.65, y: h * 0.5, q: -5, vx: 0, vy: 0 });
  }

  function presetQuadrupole() {
    charges = [];
    var w = p.width;
    var h = p.height;
    var cx = w * 0.5;
    var cy = h * 0.5;
    var spread = Math.min(w, h) * 0.2;
    charges.push({ x: cx - spread, y: cy - spread, q: 5, vx: 0, vy: 0 });
    charges.push({ x: cx + spread, y: cy - spread, q: -5, vx: 0, vy: 0 });
    charges.push({ x: cx - spread, y: cy + spread, q: -5, vx: 0, vy: 0 });
    charges.push({ x: cx + spread, y: cy + spread, q: 5, vx: 0, vy: 0 });
  }

  function presetParallelPlates() {
    charges = [];
    var w = p.width;
    var h = p.height;
    var plateX1 = w * 0.25;
    var plateX2 = w * 0.75;
    var numCharges = 6;
    var spacing = (h * 0.6) / (numCharges - 1);
    var startY = h * 0.2;

    for (var i = 0; i < numCharges; i++) {
      var y = startY + i * spacing;
      charges.push({ x: plateX1, y: y, q: 5, vx: 0, vy: 0 });
      charges.push({ x: plateX2, y: y, q: -5, vx: 0, vy: 0 });
    }
  }

  // ========================================
  // CONTROLS BINDING
  // ========================================
  function bindControls() {
    // Charge magnitude slider
    PhysicsUtils.bindSlider('magnitude-slider', 'magnitude-value', function (v) {
      chargeMagnitude = v;
    });

    // Polarity toggle
    var polarityRadios = document.querySelectorAll('#polarity-toggle input[type="radio"]');
    for (var i = 0; i < polarityRadios.length; i++) {
      polarityRadios[i].addEventListener('change', function () {
        chargePolarity = this.value === 'positive' ? 1 : -1;
      });
    }

    // Field mode toggle
    var fieldRadios = document.querySelectorAll('#field-mode-toggle input[type="radio"]');
    for (var i = 0; i < fieldRadios.length; i++) {
      fieldRadios[i].addEventListener('change', function () {
        fieldMode = this.value;
      });
    }

    // Show potential toggle
    var potentialToggle = document.getElementById('show-potential');
    if (potentialToggle) {
      potentialToggle.addEventListener('change', function () {
        showPotential = potentialToggle.checked;
      });
    }

    // Lock charges toggle
    var lockToggle = document.getElementById('lock-charges');
    if (lockToggle) {
      lockToggle.addEventListener('change', function () {
        lockCharges = lockToggle.checked;
        // Zero out velocities when locking
        if (lockCharges) {
          for (var i = 0; i < charges.length; i++) {
            charges[i].vx = 0;
            charges[i].vy = 0;
          }
        }
      });
    }

    // Clear All button
    var clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        charges = [];
        dragging = -1;
      });
    }

    // Reset button
    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        charges = [];
        dragging = -1;
        paused = false;
        var pb = document.getElementById('pause-btn');
        if (pb) pb.textContent = 'Pause';
        p.loop();
      });
    }

    // Pause button
    var pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.textContent = paused ? 'Play' : 'Pause';
        if (paused) {
          p.noLoop();
        } else {
          p.loop();
        }
      });
    }

    // Preset buttons
    var dipoleBtn = document.getElementById('preset-dipole');
    if (dipoleBtn) {
      dipoleBtn.addEventListener('click', function () {
        presetDipole();
        resumeIfPaused();
      });
    }

    var quadBtn = document.getElementById('preset-quadrupole');
    if (quadBtn) {
      quadBtn.addEventListener('click', function () {
        presetQuadrupole();
        resumeIfPaused();
      });
    }

    var platesBtn = document.getElementById('preset-plates');
    if (platesBtn) {
      platesBtn.addEventListener('click', function () {
        presetParallelPlates();
        resumeIfPaused();
      });
    }
  }

  function resumeIfPaused() {
    if (paused) {
      paused = false;
      var pb = document.getElementById('pause-btn');
      if (pb) pb.textContent = 'Pause';
      p.loop();
    }
  }

  // ========================================
  // RESIZE
  // ========================================
  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      computeGridSteps();
    }
  };
}


// ========================================
// PREVIEW SKETCH (landing page card)
// ========================================
function previewSketch(p) {
  var time = 0;

  // Two charges for dipole preview
  var posX, posY, negX, negY;

  p.setup = function () {
    var container = p.canvas.parentElement;
    p.createCanvas(container.clientWidth, container.clientHeight);
    p.frameRate(60);
    posX = p.width * 0.35;
    posY = p.height * 0.5;
    negX = p.width * 0.65;
    negY = p.height * 0.5;
  };

  p.draw = function () {
    p.background(13, 17, 23);
    time += 1 / 60;

    var w = p.width;
    var h = p.height;

    // Draw a few field arrows
    var gridCols = 12;
    var gridRows = 8;
    var stepX = w / gridCols;
    var stepY = h / gridRows;
    var kk = 500;
    var soft = 400;

    for (var col = 0; col < gridCols; col++) {
      for (var row = 0; row < gridRows; row++) {
        var px = (col + 0.5) * stepX;
        var py = (row + 0.5) * stepY;

        // E from positive charge
        var dx1 = px - posX;
        var dy1 = py - posY;
        var r1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + soft);
        var r1_3 = (dx1 * dx1 + dy1 * dy1 + soft) * r1;

        // E from negative charge
        var dx2 = px - negX;
        var dy2 = py - negY;
        var r2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + soft);
        var r2_3 = (dx2 * dx2 + dy2 * dy2 + soft) * r2;

        var ex = kk * 5 * dx1 / r1_3 + kk * (-5) * dx2 / r2_3;
        var ey = kk * 5 * dy1 / r1_3 + kk * (-5) * dy2 / r2_3;
        var mag = Math.sqrt(ex * ex + ey * ey);

        if (mag < 0.001) continue;

        var nx = ex / mag;
        var ny = ey / mag;
        var arrowLen = Math.min(mag * 0.06, 10);
        var alpha = Math.min(mag * 0.25, 160);

        p.stroke(227, 179, 65, alpha);
        p.strokeWeight(1);
        p.line(px, py, px + nx * arrowLen, py + ny * arrowLen);
      }
    }

    // Positive charge
    p.noStroke();
    p.fill(255, 80, 80, 40);
    p.ellipse(posX, posY, 30);
    p.fill(255, 80, 80);
    p.ellipse(posX, posY, 16);
    p.fill(255, 255, 255, 220);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(10);
    p.text('+', posX, posY - 1);

    // Negative charge
    p.fill(80, 130, 255, 40);
    p.ellipse(negX, negY, 30);
    p.fill(80, 130, 255);
    p.ellipse(negX, negY, 16);
    p.fill(255, 255, 255, 220);
    p.text('\u2212', negX, negY - 1);
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      posX = p.width * 0.35;
      posY = p.height * 0.5;
      negX = p.width * 0.65;
      negY = p.height * 0.5;
    }
  };
}
