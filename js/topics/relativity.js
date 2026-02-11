/* Special Relativity - Lorentz Factor, Length Contraction, Time Dilation, Twin Paradox */

function fullSketch(p) {
  var paused = false;

  // State
  var velocity = 0;       // fraction of c (0 to 0.99)
  var showLength = true;
  var showTime = true;
  var tripDistance = 10;   // light-years

  // Twin paradox animation
  var twinRunning = false;
  var twinComplete = false;
  var twinProgress = 0;    // 0 to 1
  var twinDuration = 300;  // frames (~5 sec at 60fps)
  var shipTimeFinal = 0;
  var groundTimeFinal = 0;

  // Star field
  var stars = [];
  var NUM_STARS = 150;

  // Clocks
  var shipClockAngle = 0;
  var groundClockAngle = 0;
  var clockSpeed = 0.02;   // base radians per frame

  // Colors
  var BG = [13, 17, 23];
  var ACCENT = [137, 87, 229];
  var BORDER = [48, 54, 61];
  var TEXT_DIM = [139, 148, 158];
  var TEXT_BRIGHT = [230, 237, 243];
  var SHIP_GLOW = [137, 87, 229, 40];

  // Canvas dimensions
  var W, H;

  function gamma(v) {
    if (v >= 1) return Infinity;
    return 1 / Math.sqrt(1 - v * v);
  }

  function initStars() {
    stars = [];
    for (var i = 0; i < NUM_STARS; i++) {
      stars.push({
        x: p.random(0, W),
        y: p.random(0, H),
        size: p.random(0.5, 2.5),
        alpha: p.random(80, 220)
      });
    }
  }

  function bindControls() {
    // Velocity slider
    PhysicsUtils.bindSlider('velocity-slider', 'velocity-value', function (val) {
      velocity = val;
      updateReadouts();
    });

    // Distance slider
    PhysicsUtils.bindSlider('distance-slider', 'distance-value', function (val) {
      tripDistance = Math.round(val);
    });

    // Length contraction toggle
    var lengthToggle = document.getElementById('length-toggle');
    if (lengthToggle) {
      lengthToggle.addEventListener('change', function () {
        showLength = this.checked;
      });
    }

    // Time dilation toggle
    var timeToggle = document.getElementById('time-toggle');
    if (timeToggle) {
      timeToggle.addEventListener('change', function () {
        showTime = this.checked;
      });
    }

    // Twin paradox button
    var twinBtn = document.getElementById('twin-btn');
    if (twinBtn) {
      twinBtn.addEventListener('click', function () {
        if (velocity <= 0) return;
        twinRunning = true;
        twinComplete = false;
        twinProgress = 0;
        groundTimeFinal = 2 * tripDistance / velocity;
        shipTimeFinal = groundTimeFinal / gamma(velocity);
        twinBtn.textContent = 'Running...';
        twinBtn.disabled = true;
        twinBtn.classList.remove('primary');
      });
    }

    // Reset button
    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetSim();
      });
    }

    // Pause button
    var pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.textContent = paused ? 'Play' : 'Pause';
      });
    }
  }

  function resetSim() {
    twinRunning = false;
    twinComplete = false;
    twinProgress = 0;
    shipClockAngle = 0;
    groundClockAngle = 0;
    shipTimeFinal = 0;
    groundTimeFinal = 0;

    var twinBtn = document.getElementById('twin-btn');
    if (twinBtn) {
      twinBtn.textContent = 'Run Twin Paradox';
      twinBtn.disabled = false;
      twinBtn.classList.add('primary');
    }

    updateReadouts();
  }

  function updateReadouts() {
    var g = gamma(velocity);
    var vcEl = document.getElementById('vc-val');
    var gammaEl = document.getElementById('gamma-val');
    var shipEl = document.getElementById('ship-time-val');
    var groundEl = document.getElementById('ground-time-val');
    var diffEl = document.getElementById('age-diff-val');

    if (vcEl) vcEl.textContent = velocity.toFixed(2);
    if (gammaEl) gammaEl.textContent = g.toFixed(2);

    if (twinComplete) {
      if (shipEl) shipEl.textContent = shipTimeFinal.toFixed(1) + ' yr';
      if (groundEl) groundEl.textContent = groundTimeFinal.toFixed(1) + ' yr';
      if (diffEl) diffEl.textContent = (groundTimeFinal - shipTimeFinal).toFixed(1) + ' yr';
    } else if (twinRunning) {
      var currentGround = groundTimeFinal * twinProgress;
      var currentShip = shipTimeFinal * twinProgress;
      if (shipEl) shipEl.textContent = currentShip.toFixed(1) + ' yr';
      if (groundEl) groundEl.textContent = currentGround.toFixed(1) + ' yr';
      if (diffEl) diffEl.textContent = (currentGround - currentShip).toFixed(1) + ' yr';
    } else {
      if (shipEl) shipEl.textContent = '\u2014';
      if (groundEl) groundEl.textContent = '\u2014';
      if (diffEl) diffEl.textContent = '\u2014';
    }
  }

  p.setup = function () {
    var container = p.canvas ? p.canvas.parentElement : p._userNode;
    W = container.offsetWidth;
    H = container.offsetHeight;
    p.createCanvas(W, H);
    p.textFont('monospace');
    initStars();
    bindControls();
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    var w = container.offsetWidth;
    var h = container.offsetHeight;
    if (w < 10 || h < 10) return;
    W = w;
    H = h;
    p.resizeCanvas(W, H);
    initStars();
  };

  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    var g = gamma(velocity);

    // Panel dimensions
    var panelLeft = 0;
    var panelLeftW = Math.floor(W * 0.40);
    var panelCenterX = panelLeftW;
    var panelCenterW = Math.floor(W * 0.30);
    var panelRightX = panelLeftW + panelCenterW;
    var panelRightW = W - panelRightX;

    // Draw panel separators
    p.stroke(BORDER[0], BORDER[1], BORDER[2], 120);
    p.strokeWeight(1);
    p.line(panelCenterX, 0, panelCenterX, H);
    p.line(panelRightX, 0, panelRightX, H);

    // ============================================================
    // LEFT PANEL: Spaceship + star field + clocks
    // ============================================================
    drawSpaceshipPanel(panelLeft, 0, panelLeftW, H, g);

    // ============================================================
    // CENTER PANEL: Gamma curve
    // ============================================================
    drawGammaCurve(panelCenterX, 0, panelCenterW, H, g);

    // ============================================================
    // RIGHT PANEL: Twin paradox timelines
    // ============================================================
    drawTwinPanel(panelRightX, 0, panelRightW, H, g);

    // Update twin paradox animation
    if (!paused && twinRunning && !twinComplete) {
      twinProgress += 1 / twinDuration;
      if (twinProgress >= 1) {
        twinProgress = 1;
        twinComplete = true;
        twinRunning = false;
        var twinBtn = document.getElementById('twin-btn');
        if (twinBtn) {
          twinBtn.textContent = 'Run Twin Paradox';
          twinBtn.disabled = false;
          twinBtn.classList.add('primary');
        }
      }
      updateReadouts();
    }

    // Update clocks
    if (!paused) {
      groundClockAngle += clockSpeed;
      var shipRate = showTime ? clockSpeed / g : clockSpeed;
      shipClockAngle += shipRate;
      groundClockAngle %= (Math.PI * 2);
      shipClockAngle %= (Math.PI * 2);
    }
  };

  // ----------------------------------------------------------------
  // LEFT PANEL: Spaceship visualization
  // ----------------------------------------------------------------
  function drawSpaceshipPanel(px, py, pw, ph, g) {
    p.push();
    // Clip region
    // p5.js doesn't have clip, so we just draw within bounds

    // Panel label
    p.noStroke();
    p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 120);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(Math.max(9, pw * 0.032));
    p.text('SPACESHIP VIEW', px + pw / 2, py + 8);

    // Star field
    var maxStreakLen = pw * 0.15;
    var maxStarSpeed = pw * 0.03;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];

      // Only draw stars in this panel
      if (s.x > px && s.x < px + pw && s.y < ph * 0.62) {
        var streak = velocity * maxStreakLen;
        p.stroke(255, 255, 255, s.alpha * (0.4 + velocity * 0.6));
        p.strokeWeight(s.size * 0.7);
        if (streak > 1) {
          p.line(s.x, s.y, s.x + streak, s.y);
        } else {
          p.point(s.x, s.y);
        }
      }

      // Move stars
      if (!paused) {
        s.x -= velocity * maxStarSpeed;
        if (s.x < px) {
          s.x = px + pw;
          s.y = p.random(py + 20, ph * 0.62);
          s.alpha = p.random(80, 220);
        }
      }
    }

    // Spaceship
    var shipCenterX = px + pw * 0.45;
    var shipCenterY = py + ph * 0.32;
    var shipBaseW = Math.max(30, pw * 0.18);
    var shipH = Math.max(16, shipBaseW * 0.4);
    var shipW = showLength ? shipBaseW / g : shipBaseW;

    // Ship glow
    p.noStroke();
    for (var gl = 3; gl >= 1; gl--) {
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 8 * gl);
      p.ellipse(shipCenterX, shipCenterY, shipW + gl * 12, shipH + gl * 10);
    }

    // Ship body - triangle pointing right
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 220);
    p.noStroke();
    p.beginShape();
    p.vertex(shipCenterX + shipW / 2, shipCenterY);                         // nose
    p.vertex(shipCenterX - shipW / 2, shipCenterY - shipH / 2);             // top-left
    p.vertex(shipCenterX - shipW / 2 + shipW * 0.1, shipCenterY);           // indent
    p.vertex(shipCenterX - shipW / 2, shipCenterY + shipH / 2);             // bottom-left
    p.endShape(p.CLOSE);

    // Engine glow when moving
    if (velocity > 0.01) {
      var glowIntensity = velocity * 200;
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], glowIntensity * 0.3);
      p.ellipse(shipCenterX - shipW / 2 - velocity * 10, shipCenterY, velocity * 20, shipH * 0.4);
      p.fill(200, 150, 255, glowIntensity * 0.5);
      p.ellipse(shipCenterX - shipW / 2 - velocity * 5, shipCenterY, velocity * 10, shipH * 0.2);
    }

    // Ship dimension label
    if (showLength && velocity > 0.01) {
      var pct = (100 / g).toFixed(0);
      p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 180);
      p.textSize(Math.max(8, pw * 0.028));
      p.textAlign(p.CENTER, p.TOP);
      p.text(pct + '% rest length', shipCenterX, shipCenterY + shipH / 2 + 8);
    }

    // ---- Clocks ----
    var clockY = py + ph * 0.72;
    var clockR = Math.min(pw * 0.13, ph * 0.12, 45);
    var clockSpacing = pw * 0.25;

    // Ship clock
    var shipClockX = px + pw / 2 - clockSpacing;
    drawClock(shipClockX, clockY, clockR, shipClockAngle, ACCENT, 'Ship Clock');

    // Ground clock
    var groundClockX = px + pw / 2 + clockSpacing;
    drawClock(groundClockX, clockY, clockR, groundClockAngle, TEXT_DIM, 'Ground Clock');

    // Speed indicator between clocks
    if (showTime && velocity > 0.01) {
      p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 140);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(Math.max(8, pw * 0.026));
      var ratio = (1 / g).toFixed(2);
      p.text(ratio + 'x', px + pw / 2, clockY);
    }

    p.pop();
  }

  function drawClock(cx, cy, r, angle, color, label) {
    // Clock face
    p.noFill();
    p.stroke(BORDER[0], BORDER[1], BORDER[2], 180);
    p.strokeWeight(1.5);
    p.circle(cx, cy, r * 2);

    // Tick marks (12)
    for (var i = 0; i < 12; i++) {
      var tickAngle = (i / 12) * p.TWO_PI - p.HALF_PI;
      var innerR = r * 0.82;
      var outerR = r * 0.95;
      if (i % 3 === 0) {
        innerR = r * 0.75;
        p.strokeWeight(2);
      } else {
        p.strokeWeight(1);
      }
      p.stroke(BORDER[0], BORDER[1], BORDER[2], 200);
      p.line(
        cx + Math.cos(tickAngle) * innerR,
        cy + Math.sin(tickAngle) * innerR,
        cx + Math.cos(tickAngle) * outerR,
        cy + Math.sin(tickAngle) * outerR
      );
    }

    // Hand
    var handAngle = angle - p.HALF_PI;
    p.stroke(color[0], color[1], color[2], 240);
    p.strokeWeight(2);
    p.line(cx, cy, cx + Math.cos(handAngle) * r * 0.7, cy + Math.sin(handAngle) * r * 0.7);

    // Center dot
    p.noStroke();
    p.fill(color[0], color[1], color[2], 255);
    p.circle(cx, cy, 4);

    // Label
    p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 180);
    p.noStroke();
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(Math.max(8, r * 0.35));
    p.text(label, cx, cy + r + 8);
  }

  // ----------------------------------------------------------------
  // CENTER PANEL: Gamma curve
  // ----------------------------------------------------------------
  function drawGammaCurve(px, py, pw, ph, g) {
    p.push();

    // Panel label
    p.noStroke();
    p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 120);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(Math.max(9, pw * 0.042));
    p.text('LORENTZ FACTOR', px + pw / 2, py + 8);

    // Graph area with padding
    var padL = pw * 0.18;
    var padR = pw * 0.08;
    var padT = ph * 0.10;
    var padB = ph * 0.14;
    var gx = px + padL;
    var gy = py + padT;
    var gw = pw - padL - padR;
    var gh = ph - padT - padB;

    // Y axis range
    var yMax = 8;

    // Grid lines
    p.stroke(BORDER[0], BORDER[1], BORDER[2], 60);
    p.strokeWeight(0.5);

    // Vertical grid (v/c at 0.2 intervals)
    for (var vg = 0.2; vg <= 0.8; vg += 0.2) {
      var xg = gx + (vg / 1.0) * gw;
      p.line(xg, gy, xg, gy + gh);
    }

    // Horizontal grid (gamma at integer intervals)
    for (var yg = 1; yg <= 7; yg++) {
      var yPos = gy + gh - ((yg - 1) / (yMax - 1)) * gh;
      p.line(gx, yPos, gx + gw, yPos);
    }

    // Axes
    p.stroke(BORDER[0], BORDER[1], BORDER[2], 200);
    p.strokeWeight(1.5);
    p.line(gx, gy, gx, gy + gh);           // Y axis
    p.line(gx, gy + gh, gx + gw, gy + gh); // X axis

    // Axis labels
    p.noStroke();
    p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 180);
    p.textSize(Math.max(8, pw * 0.036));

    // X axis labels
    p.textAlign(p.CENTER, p.TOP);
    for (var xl = 0; xl <= 1.0; xl += 0.2) {
      var xLabelPos = gx + (xl / 1.0) * gw;
      p.text(xl.toFixed(1), xLabelPos, gy + gh + 4);
    }
    p.textSize(Math.max(8, pw * 0.034));
    p.text('v/c', gx + gw / 2, gy + gh + 18);

    // Y axis labels
    p.textAlign(p.RIGHT, p.CENTER);
    p.textSize(Math.max(8, pw * 0.036));
    for (var yl = 1; yl <= 7; yl += 1) {
      var yLabelPos = gy + gh - ((yl - 1) / (yMax - 1)) * gh;
      p.text(yl, gx - 5, yLabelPos);
    }
    p.textAlign(p.CENTER, p.BOTTOM);
    p.textSize(Math.max(8, pw * 0.034));
    p.push();
    p.translate(px + 8, gy + gh / 2);
    p.rotate(-p.HALF_PI);
    p.text('\u03B3', 0, 0);
    p.pop();

    // Filled area under curve (very faint)
    p.noStroke();
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 15);
    p.beginShape();
    p.vertex(gx, gy + gh);
    var steps = 100;
    for (var i = 0; i <= steps; i++) {
      var v = (i / steps) * 0.995;
      var gVal = gamma(v);
      var cx = gx + (v / 1.0) * gw;
      var cy = gy + gh - ((gVal - 1) / (yMax - 1)) * gh;
      cy = Math.max(gy, cy);
      p.vertex(cx, cy);
    }
    p.vertex(gx + (0.995 / 1.0) * gw, gy + gh);
    p.endShape(p.CLOSE);

    // Gamma curve line
    p.noFill();
    p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 230);
    p.strokeWeight(2);
    p.beginShape();
    for (var j = 0; j <= steps; j++) {
      var v2 = (j / steps) * 0.995;
      var gVal2 = gamma(v2);
      var cx2 = gx + (v2 / 1.0) * gw;
      var cy2 = gy + gh - ((gVal2 - 1) / (yMax - 1)) * gh;
      cy2 = Math.max(gy, cy2);
      p.vertex(cx2, cy2);
    }
    p.endShape();

    // Current position dot
    if (velocity > 0.001) {
      var dotX = gx + (velocity / 1.0) * gw;
      var dotY = gy + gh - ((g - 1) / (yMax - 1)) * gh;
      dotY = Math.max(gy, dotY);

      // Dashed lines to axes
      p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 80);
      p.strokeWeight(1);
      drawDashedLine(dotX, dotY, dotX, gy + gh, 4, 4);
      drawDashedLine(dotX, dotY, gx, dotY, 4, 4);

      // Dot
      p.noStroke();
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 60);
      p.circle(dotX, dotY, 16);
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 255);
      p.circle(dotX, dotY, 8);

      // Gamma label on dot
      p.fill(TEXT_BRIGHT[0], TEXT_BRIGHT[1], TEXT_BRIGHT[2]);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.textSize(Math.max(9, pw * 0.04));
      var labelText = '\u03B3=' + g.toFixed(2);
      var labelX = dotX + 8;
      var labelY = dotY - 6;
      // If too far right, put label on left
      if (labelX + 50 > px + pw) {
        p.textAlign(p.RIGHT, p.BOTTOM);
        labelX = dotX - 8;
      }
      // If too far up, put label below
      if (labelY < gy + 10) {
        labelY = dotY + 16;
      }
      p.text(labelText, labelX, labelY);
    }

    p.pop();
  }

  function drawDashedLine(x1, y1, x2, y2, dashLen, gapLen) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    var dashes = dist / (dashLen + gapLen);
    var ux = dx / dist;
    var uy = dy / dist;

    for (var i = 0; i < dashes; i++) {
      var startD = i * (dashLen + gapLen);
      var endD = Math.min(startD + dashLen, dist);
      p.line(
        x1 + ux * startD, y1 + uy * startD,
        x1 + ux * endD, y1 + uy * endD
      );
    }
  }

  // ----------------------------------------------------------------
  // RIGHT PANEL: Twin paradox timelines
  // ----------------------------------------------------------------
  function drawTwinPanel(px, py, pw, ph, g) {
    p.push();

    // Panel label
    p.noStroke();
    p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 120);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(Math.max(9, pw * 0.042));
    p.text('TWIN PARADOX', px + pw / 2, py + 8);

    // Timeline bars area
    var barPadT = ph * 0.10;
    var barPadB = ph * 0.18;
    var barPadSide = pw * 0.15;
    var barMaxH = ph - barPadT - barPadB;
    var barW = Math.min(pw * 0.2, 30);
    var barSpacing = pw * 0.14;

    // Earth twin bar position
    var earthBarX = px + pw / 2 - barSpacing - barW / 2;
    var shipBarX = px + pw / 2 + barSpacing - barW / 2;
    var barTopY = py + barPadT;

    // If no twin paradox running or complete, show empty state
    if (!twinRunning && !twinComplete) {
      // Empty bar outlines
      p.noFill();
      p.stroke(BORDER[0], BORDER[1], BORDER[2], 120);
      p.strokeWeight(1);
      p.rect(earthBarX, barTopY, barW, barMaxH, 3);
      p.rect(shipBarX, barTopY, barW, barMaxH, 3);

      // Labels
      p.noStroke();
      p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 150);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(Math.max(8, pw * 0.036));
      p.text('Earth', earthBarX + barW / 2, barTopY + barMaxH + 6);
      p.text('Ship', shipBarX + barW / 2, barTopY + barMaxH + 6);

      // Prompt
      p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 100);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(Math.max(8, pw * 0.032));
      if (velocity <= 0) {
        p.text('Set velocity > 0', px + pw / 2, barTopY + barMaxH / 2);
        p.text('then Run', px + pw / 2, barTopY + barMaxH / 2 + 16);
      } else {
        p.text('Press Run', px + pw / 2, barTopY + barMaxH / 2);
        p.text('Twin Paradox', px + pw / 2, barTopY + barMaxH / 2 + 16);
      }

      p.pop();
      return;
    }

    // Calculate fill amounts
    var progress = twinProgress;
    var earthFill = progress;
    var shipFill = progress * (shipTimeFinal / groundTimeFinal);

    // Earth twin bar (muted color)
    // Background
    p.noStroke();
    p.fill(BORDER[0], BORDER[1], BORDER[2], 60);
    p.rect(earthBarX, barTopY, barW, barMaxH, 3);
    // Filled portion (from bottom)
    var earthFillH = earthFill * barMaxH;
    p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 160);
    p.rect(earthBarX, barTopY + barMaxH - earthFillH, barW, earthFillH, 0, 0, 3, 3);
    // Border
    p.noFill();
    p.stroke(BORDER[0], BORDER[1], BORDER[2], 120);
    p.strokeWeight(1);
    p.rect(earthBarX, barTopY, barW, barMaxH, 3);

    // Ship twin bar (accent color)
    // Background
    p.noStroke();
    p.fill(BORDER[0], BORDER[1], BORDER[2], 60);
    p.rect(shipBarX, barTopY, barW, barMaxH, 3);
    // Filled portion (from bottom)
    var shipFillH = shipFill * barMaxH;
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 180);
    p.rect(shipBarX, barTopY + barMaxH - shipFillH, barW, shipFillH, 0, 0, 3, 3);
    // Border
    p.noFill();
    p.stroke(BORDER[0], BORDER[1], BORDER[2], 120);
    p.strokeWeight(1);
    p.rect(shipBarX, barTopY, barW, barMaxH, 3);

    // Labels below bars
    p.noStroke();
    p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 180);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(Math.max(8, pw * 0.036));
    p.text('Earth', earthBarX + barW / 2, barTopY + barMaxH + 6);
    p.text('Ship', shipBarX + barW / 2, barTopY + barMaxH + 6);

    // Age labels next to bars
    var earthAge = groundTimeFinal * progress;
    var shipAge = shipTimeFinal * progress;

    p.fill(TEXT_BRIGHT[0], TEXT_BRIGHT[1], TEXT_BRIGHT[2], 200);
    p.textSize(Math.max(8, pw * 0.038));

    // Earth age - to the left of the earth bar
    p.textAlign(p.RIGHT, p.CENTER);
    var earthLabelY = barTopY + barMaxH - earthFillH - 2;
    earthLabelY = Math.max(barTopY + 6, Math.min(earthLabelY, barTopY + barMaxH - 6));
    p.text(earthAge.toFixed(1), earthBarX - 4, earthLabelY);

    // Ship age - to the right of the ship bar
    p.textAlign(p.LEFT, p.CENTER);
    var shipLabelY = barTopY + barMaxH - shipFillH - 2;
    shipLabelY = Math.max(barTopY + 6, Math.min(shipLabelY, barTopY + barMaxH - 6));
    p.text(shipAge.toFixed(1), shipBarX + barW + 4, shipLabelY);

    // Age difference display at bottom
    if (twinComplete) {
      var diff = groundTimeFinal - shipTimeFinal;
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 255);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(Math.max(9, pw * 0.04));
      var diffY = barTopY + barMaxH + 24;
      p.text('\u0394 ' + diff.toFixed(1) + ' years', px + pw / 2, diffY);

      p.fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 140);
      p.textSize(Math.max(8, pw * 0.032));
      p.text('Ship twin is younger', px + pw / 2, diffY + 16);
    }

    p.pop();
  }
}

/* Preview sketch for index card */
function previewSketch(p) {
  var stars = [];
  var NUM_STARS = 60;
  var velocity = 0;
  var increasing = true;
  var W, H;

  var BG = [13, 17, 23];
  var ACCENT = [137, 87, 229];
  var BORDER = [48, 54, 61];

  function gamma(v) {
    return 1 / Math.sqrt(1 - v * v);
  }

  p.setup = function () {
    var container = p.canvas ? p.canvas.parentElement : p._userNode;
    W = container.offsetWidth;
    H = container.offsetHeight;
    p.createCanvas(W, H);

    for (var i = 0; i < NUM_STARS; i++) {
      stars.push({
        x: p.random(0, W),
        y: p.random(0, H * 0.55),
        size: p.random(0.5, 2),
        alpha: p.random(80, 200)
      });
    }
  };

  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    // Oscillate velocity
    if (increasing) {
      velocity += 0.003;
      if (velocity >= 0.95) increasing = false;
    } else {
      velocity -= 0.003;
      if (velocity <= 0.05) increasing = true;
    }

    var g = gamma(velocity);

    // Stars
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var streak = velocity * W * 0.08;
      p.stroke(255, 255, 255, s.alpha * (0.4 + velocity * 0.6));
      p.strokeWeight(s.size * 0.7);
      if (streak > 1) {
        p.line(s.x, s.y, s.x + streak, s.y);
      } else {
        p.point(s.x, s.y);
      }
      s.x -= velocity * W * 0.015;
      if (s.x < 0) {
        s.x = W;
        s.y = p.random(0, H * 0.55);
      }
    }

    // Ship
    var shipX = W * 0.4;
    var shipY = H * 0.3;
    var shipW = 30 / g;
    var shipH = 12;

    p.noStroke();
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 200);
    p.triangle(
      shipX + shipW / 2, shipY,
      shipX - shipW / 2, shipY - shipH / 2,
      shipX - shipW / 2, shipY + shipH / 2
    );

    // Gamma curve in lower half
    var gx = W * 0.1;
    var gy = H * 0.6;
    var gw = W * 0.8;
    var gh = H * 0.3;

    p.stroke(BORDER[0], BORDER[1], BORDER[2], 100);
    p.strokeWeight(0.5);
    p.line(gx, gy + gh, gx + gw, gy + gh);

    p.noFill();
    p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 180);
    p.strokeWeight(1.5);
    p.beginShape();
    for (var j = 0; j <= 50; j++) {
      var v = (j / 50) * 0.99;
      var gv = gamma(v);
      var cx = gx + v * gw;
      var cy = gy + gh - ((gv - 1) / 6) * gh;
      cy = Math.max(gy, cy);
      p.vertex(cx, cy);
    }
    p.endShape();

    // Current dot
    var dotX = gx + velocity * gw;
    var dotY = gy + gh - ((g - 1) / 6) * gh;
    dotY = Math.max(gy, dotY);
    p.noStroke();
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 255);
    p.circle(dotX, dotY, 6);
  };
}
