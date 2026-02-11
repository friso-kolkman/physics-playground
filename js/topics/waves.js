/* Physics Playground - Waves & Resonance Simulation */

function fullSketch(p) {
  // --- Mode ---
  var mode = 'superposition'; // 'superposition' or 'resonance'
  var paused = false;
  var time = 0;
  var dt = 1 / 60;

  // --- Superposition state ---
  var freq1 = 1.0;
  var amp1 = 50;
  var freq2 = 1.5;
  var amp2 = 50;
  var showIndividual = true;

  // --- Resonance state ---
  var omega0 = 2.0 * 2 * Math.PI; // natural freq in rad/s (2 Hz)
  var driveFreq = 0.5;
  var driveAmp = 5;
  var damping = 0.05;

  // Driven oscillator state (numerically integrated)
  var massX = 0;       // displacement
  var massV = 0;       // velocity
  var platformY = 0;   // platform position for visual

  // Spring-mass visual constants
  var springRestLen = 0;
  var massSize = 0;
  var springTop = 0;
  var springBottom = 0;

  // --- Colors ---
  var COL_BG = [13, 17, 23];
  var COL_WAVE1 = [57, 211, 83];     // accent #39d353
  var COL_WAVE2 = [88, 166, 255];    // blue #58a6ff
  var COL_COMBINED = [230, 237, 243]; // white #e6edf3
  var COL_GRID = [33, 38, 45];       // #21262d
  var COL_BORDER = [48, 54, 61];     // #30363d
  var COL_TEXT = [139, 148, 158];     // #8b949e
  var COL_ACCENT = [57, 211, 83];

  p.setup = function () {
    p.createCanvas(p.width || 100, p.height || 100);
    resizeToContainer();
    p.frameRate(60);
    bindControls();
    resetResonance();
  };

  function resizeToContainer() {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  }

  function resetResonance() {
    massX = 0;
    massV = 0;
    time = 0;
    platformY = 0;
  }

  function bindControls() {
    // Superposition sliders
    PhysicsUtils.bindSlider('freq1-slider', 'freq1-value', function (v) { freq1 = v; });
    PhysicsUtils.bindSlider('amp1-slider', 'amp1-value', function (v) { amp1 = v; });
    PhysicsUtils.bindSlider('freq2-slider', 'freq2-value', function (v) { freq2 = v; });
    PhysicsUtils.bindSlider('amp2-slider', 'amp2-value', function (v) { amp2 = v; });

    // Show individual toggle
    var showToggle = document.getElementById('show-individual');
    if (showToggle) {
      showToggle.addEventListener('change', function () {
        showIndividual = showToggle.checked;
      });
    }

    // Resonance sliders
    PhysicsUtils.bindSlider('drive-freq-slider', 'drive-freq-value', function (v) { driveFreq = v; });
    PhysicsUtils.bindSlider('drive-amp-slider', 'drive-amp-value', function (v) { driveAmp = v; });
    PhysicsUtils.bindSlider('damping-slider', 'damping-value', function (v) { damping = v; });

    // Mode toggle
    var modeRadios = document.querySelectorAll('#mode-toggle input[type="radio"]');
    for (var i = 0; i < modeRadios.length; i++) {
      modeRadios[i].addEventListener('change', function () {
        mode = this.value;
        var supControls = document.getElementById('superposition-controls');
        var resControls = document.getElementById('resonance-controls');
        if (supControls) supControls.style.display = mode === 'superposition' ? 'block' : 'none';
        if (resControls) resControls.style.display = mode === 'resonance' ? 'block' : 'none';
        if (mode === 'resonance') {
          resetResonance();
        }
      });
    }

    // Reset button
    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        time = 0;
        resetResonance();
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

    // Update natural frequency display
    updateNaturalFreqDisplay();
  }

  function updateNaturalFreqDisplay() {
    var el = document.getElementById('natural-freq');
    if (el) {
      el.textContent = (omega0 / (2 * Math.PI)).toFixed(2) + ' Hz';
    }
  }

  p.draw = function () {
    p.background(COL_BG[0], COL_BG[1], COL_BG[2]);

    if (!paused) {
      time += dt;
    }

    if (mode === 'superposition') {
      drawSuperposition();
    } else {
      updateResonancePhysics();
      drawResonance();
    }
  };

  // ========================================
  // SUPERPOSITION MODE
  // ========================================
  function drawSuperposition() {
    var w = p.width;
    var h = p.height;

    if (showIndividual) {
      // Top 60%: individual waves, bottom 40%: combined
      var topH = h * 0.6;
      var botH = h * 0.4;
      var wave1Center = topH * 0.33;
      var wave2Center = topH * 0.67;
      var combinedCenter = topH + botH / 2;

      // Divider line
      p.stroke(COL_BORDER[0], COL_BORDER[1], COL_BORDER[2]);
      p.strokeWeight(1);
      p.line(0, topH, w, topH);

      // Grid lines for wave 1
      drawZeroLine(wave1Center, w);
      // Grid lines for wave 2
      drawZeroLine(wave2Center, w);
      // Grid line for combined
      drawZeroLine(combinedCenter, w);

      // Wave 1
      drawWave(freq1, amp1 * 0.5, wave1Center, w, COL_WAVE1, 2.5);
      drawWaveLabel('Wave 1', 10, wave1Center - amp1 * 0.5 - 14, COL_WAVE1);

      // Wave 2
      drawWave(freq2, amp2 * 0.5, wave2Center, w, COL_WAVE2, 2.5);
      drawWaveLabel('Wave 2', 10, wave2Center - amp2 * 0.5 - 14, COL_WAVE2);

      // Combined wave
      drawCombinedWave(combinedCenter, w, botH * 0.4);
      drawWaveLabel('Combined', 10, combinedCenter - (amp1 + amp2) * 0.25 - 14, COL_COMBINED);

      // Beat frequency display
      var beatFreq = Math.abs(freq1 - freq2);
      if (beatFreq > 0.01 && beatFreq < 4) {
        p.noStroke();
        p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
        p.textFont('monospace');
        p.textSize(10);
        p.textAlign(p.RIGHT);
        p.text('Beat: ' + beatFreq.toFixed(2) + ' Hz', w - 10, combinedCenter - (amp1 + amp2) * 0.25 - 6);
      }
    } else {
      // Full canvas: combined wave only
      var center = h / 2;
      drawZeroLine(center, w);
      drawCombinedWave(center, w, h * 0.4);
      drawWaveLabel('Combined', 10, center - (amp1 + amp2) * 0.4 - 14, COL_COMBINED);

      // Also show component waves as faint ghosts
      drawWave(freq1, amp1 * 0.8, center, w, COL_WAVE1, 1, 60);
      drawWave(freq2, amp2 * 0.8, center, w, COL_WAVE2, 1, 60);

      var beatFreq = Math.abs(freq1 - freq2);
      if (beatFreq > 0.01 && beatFreq < 4) {
        p.noStroke();
        p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
        p.textFont('monospace');
        p.textSize(11);
        p.textAlign(p.RIGHT);
        p.text('Beat frequency: ' + beatFreq.toFixed(2) + ' Hz', w - 10, 20);
      }
    }
  }

  function drawZeroLine(y, w) {
    p.stroke(COL_GRID[0], COL_GRID[1], COL_GRID[2]);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([4, 4]);
    p.line(0, y, w, y);
    p.drawingContext.setLineDash([]);
  }

  function drawWave(freq, amplitude, centerY, width, color, weight, alpha) {
    var a = alpha !== undefined ? alpha : 255;
    p.noFill();
    p.stroke(color[0], color[1], color[2], a);
    p.strokeWeight(weight || 2);
    p.beginShape();
    for (var x = 0; x < width; x += 2) {
      var phase = (x / width) * freq * 4 * Math.PI - time * freq * 2 * Math.PI;
      var y = centerY + amplitude * Math.sin(phase);
      p.vertex(x, y);
    }
    p.endShape();
  }

  function drawCombinedWave(centerY, width, maxAmp) {
    p.noFill();
    p.stroke(COL_COMBINED[0], COL_COMBINED[1], COL_COMBINED[2]);
    p.strokeWeight(3);
    p.beginShape();
    for (var x = 0; x < width; x += 2) {
      var phase1 = (x / width) * freq1 * 4 * Math.PI - time * freq1 * 2 * Math.PI;
      var phase2 = (x / width) * freq2 * 4 * Math.PI - time * freq2 * 2 * Math.PI;
      var y1 = amp1 * 0.5 * Math.sin(phase1);
      var y2 = amp2 * 0.5 * Math.sin(phase2);
      var combined = y1 + y2;
      // Soft clamp to maxAmp
      combined = PhysicsUtils.clamp(combined, -maxAmp, maxAmp);
      p.vertex(x, centerY + combined);
    }
    p.endShape();
  }

  function drawWaveLabel(label, x, y, color) {
    p.noStroke();
    p.fill(color[0], color[1], color[2], 180);
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.LEFT);
    p.text(label, x, y);
  }

  // ========================================
  // RESONANCE MODE
  // ========================================
  function updateResonancePhysics() {
    if (paused) return;

    var omega = driveFreq * 2 * Math.PI;
    var gamma = damping;

    // Driving force: F = F0 * cos(omega * t)
    var F = driveAmp * Math.cos(omega * time);

    // Equation of motion: x'' + 2*gamma*x' + omega0^2*x = F
    var acc = F - 2 * gamma * massV - (omega0 * omega0 / (4 * Math.PI * Math.PI)) * massX;

    // Semi-implicit Euler
    massV += acc * dt;
    massX += massV * dt;

    // Platform visual position
    platformY = driveAmp * 2 * Math.cos(omega * time);
  }

  function drawResonance() {
    var w = p.width;
    var h = p.height;

    // Left 60%: spring-mass animation
    var leftW = w * 0.6;
    // Right 40%: response curve
    var rightX = leftW;
    var rightW = w - leftW;

    // Divider
    p.stroke(COL_BORDER[0], COL_BORDER[1], COL_BORDER[2]);
    p.strokeWeight(1);
    p.line(leftW, 0, leftW, h);

    drawSpringMass(leftW, h);
    drawResponseCurve(rightX, rightW, h);
  }

  function drawSpringMass(areaW, areaH) {
    var cx = areaW / 2;

    // Fixed ceiling
    var ceilingY = 30;
    p.stroke(COL_BORDER[0], COL_BORDER[1], COL_BORDER[2]);
    p.strokeWeight(3);
    p.line(cx - 50, ceilingY, cx + 50, ceilingY);

    // Hatching on ceiling
    p.strokeWeight(1);
    for (var i = -50; i < 50; i += 8) {
      p.line(cx + i, ceilingY, cx + i - 6, ceilingY - 8);
    }

    // Mass dimensions
    massSize = Math.min(50, areaW * 0.12);
    var equilibriumY = areaH * 0.45;

    // Mass position (displacement from equilibrium)
    var massDisplayY = equilibriumY + massX * 3; // scale for visibility
    massDisplayY = PhysicsUtils.clamp(massDisplayY, ceilingY + 40, areaH - 80);

    // Platform (driven shaker at bottom)
    var platformBaseY = areaH - 40;
    var platVisY = platformBaseY + platformY * 0.5;

    // Draw spring (zigzag from ceiling to mass)
    drawSpring(cx, ceilingY, cx, massDisplayY - massSize / 2, 12, 14);

    // Mass rectangle
    p.fill(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2]);
    p.stroke(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2], 180);
    p.strokeWeight(1);
    p.rectMode(p.CENTER);
    p.rect(cx, massDisplayY, massSize, massSize, 4);
    p.rectMode(p.CORNER);

    // Mass glow based on amplitude
    var absDisp = Math.abs(massX);
    var glowAlpha = p.map(absDisp, 0, 50, 0, 100, true);
    if (glowAlpha > 5) {
      p.noStroke();
      p.fill(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2], glowAlpha);
      p.rectMode(p.CENTER);
      p.rect(cx, massDisplayY, massSize + 20, massSize + 20, 8);
      p.rectMode(p.CORNER);
    }

    // Mass label
    p.noStroke();
    p.fill(COL_BG[0], COL_BG[1], COL_BG[2]);
    p.textFont('monospace');
    p.textSize(Math.max(9, massSize * 0.24));
    p.textAlign(p.CENTER, p.CENTER);
    p.text('m', cx, massDisplayY);

    // Platform (shaking base)
    p.stroke(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
    p.strokeWeight(4);
    p.line(cx - 40, platVisY, cx + 40, platVisY);

    // Platform oscillation indicator arrows
    p.strokeWeight(1);
    p.stroke(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2], 100);
    p.line(cx - 50, platVisY - 8, cx - 50, platVisY + 8);
    p.line(cx - 53, platVisY - 5, cx - 50, platVisY - 8);
    p.line(cx - 47, platVisY - 5, cx - 50, platVisY - 8);
    p.line(cx - 53, platVisY + 5, cx - 50, platVisY + 8);
    p.line(cx - 47, platVisY + 5, cx - 50, platVisY + 8);

    // Labels
    p.noStroke();
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
    p.textFont('monospace');
    p.textSize(9);
    p.textAlign(p.LEFT);
    p.text('Driver: ' + driveFreq.toFixed(2) + ' Hz', 10, areaH - 14);

    // Equilibrium line (dashed)
    p.stroke(COL_GRID[0], COL_GRID[1], COL_GRID[2]);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([3, 3]);
    p.line(cx - 35, equilibriumY, cx + 35, equilibriumY);
    p.drawingContext.setLineDash([]);

    // Displacement readout
    p.noStroke();
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
    p.textSize(10);
    p.textAlign(p.LEFT);
    p.text('x = ' + massX.toFixed(1), 10, 20);
  }

  function drawSpring(x1, y1, x2, y2, coils, amplitude) {
    var len = p.dist(x1, y1, x2, y2);
    if (len < 10) return;

    p.stroke(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
    p.strokeWeight(1.5);
    p.noFill();

    var dx = x2 - x1;
    var dy = y2 - y1;

    // Straight lead-in
    var leadFrac = 0.05;
    var startX = x1 + dx * leadFrac;
    var startY = y1 + dy * leadFrac;
    var endX = x1 + dx * (1 - leadFrac);
    var endY = y1 + dy * (1 - leadFrac);

    p.line(x1, y1, startX, startY);

    // Zigzag section
    var zigLen = len * (1 - 2 * leadFrac);
    var segDx = (endX - startX) / (coils * 2);
    var segDy = (endY - startY) / (coils * 2);

    // Perpendicular direction
    var perpX = -dy / len;
    var perpY = dx / len;

    // Adjust amplitude based on stretch
    var restLen = 150;
    var ampScale = PhysicsUtils.clamp(restLen / Math.max(len, 1), 0.3, 2.0);
    var drawAmp = amplitude * ampScale;

    p.beginShape();
    p.vertex(startX, startY);
    for (var i = 0; i < coils * 2; i++) {
      var px = startX + segDx * (i + 0.5);
      var py = startY + segDy * (i + 0.5);
      var side = (i % 2 === 0) ? 1 : -1;
      p.vertex(px + perpX * drawAmp * side, py + perpY * drawAmp * side);
    }
    p.vertex(endX, endY);
    p.endShape();

    p.line(endX, endY, x2, y2);
  }

  function drawResponseCurve(startX, areaW, areaH) {
    var padding = 30;
    var plotX = startX + padding;
    var plotW = areaW - padding * 2;
    var plotY = padding + 10;
    var plotH = areaH - padding * 2 - 20;

    // Title
    p.noStroke();
    p.fill(COL_COMBINED[0], COL_COMBINED[1], COL_COMBINED[2]);
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.CENTER);
    p.text('Amplitude Response', startX + areaW / 2, 18);

    // Axes
    p.stroke(COL_BORDER[0], COL_BORDER[1], COL_BORDER[2]);
    p.strokeWeight(1);
    p.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH); // x-axis
    p.line(plotX, plotY, plotX, plotY + plotH); // y-axis

    // X-axis labels
    p.noStroke();
    p.fill(COL_TEXT[0], COL_TEXT[1], COL_TEXT[2]);
    p.textSize(8);
    p.textAlign(p.CENTER, p.TOP);
    var maxFreqDisplay = 5;
    for (var f = 0; f <= maxFreqDisplay; f += 1) {
      var fx = plotX + (f / maxFreqDisplay) * plotW;
      p.text(f + '', fx, plotY + plotH + 4);

      // Tick
      p.stroke(COL_BORDER[0], COL_BORDER[1], COL_BORDER[2]);
      p.strokeWeight(1);
      p.line(fx, plotY + plotH, fx, plotY + plotH + 3);
      p.noStroke();
    }

    // X-axis title
    p.textSize(8);
    p.textAlign(p.CENTER);
    p.text('Driving Freq (Hz)', startX + areaW / 2, plotY + plotH + 16);

    // Y-axis label
    p.push();
    p.translate(plotX - 14, plotY + plotH / 2);
    p.rotate(-p.HALF_PI);
    p.textAlign(p.CENTER);
    p.textSize(8);
    p.text('Amplitude', 0, 0);
    p.pop();

    // Natural frequency line (dashed vertical)
    var natFreqHz = omega0 / (2 * Math.PI);
    var natX = plotX + (natFreqHz / maxFreqDisplay) * plotW;
    p.stroke(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2], 100);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([4, 4]);
    p.line(natX, plotY, natX, plotY + plotH);
    p.drawingContext.setLineDash([]);

    // Natural freq label
    p.noStroke();
    p.fill(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2], 150);
    p.textSize(8);
    p.textAlign(p.CENTER);
    p.text('f\u2080', natX, plotY - 4);

    // Draw resonance curve: A(omega) = 1 / sqrt((omega0^2 - omega^2)^2 + (2*gamma*omega)^2)
    var gamma = damping;
    var w0 = omega0;

    // Find max amplitude for normalization
    var maxA = 0;
    for (var fi = 0.1; fi <= maxFreqDisplay; fi += 0.05) {
      var w = fi * 2 * Math.PI;
      var denom = Math.sqrt(Math.pow(w0 * w0 - w * w, 2) + Math.pow(2 * gamma * w, 2));
      var A = denom > 0.001 ? 1 / denom : 1000;
      if (A > maxA) maxA = A;
    }
    if (maxA < 0.001) maxA = 1;

    // Draw the curve
    p.noFill();
    p.stroke(COL_WAVE2[0], COL_WAVE2[1], COL_WAVE2[2]);
    p.strokeWeight(2);
    p.beginShape();
    for (var fi = 0.1; fi <= maxFreqDisplay; fi += 0.05) {
      var w = fi * 2 * Math.PI;
      var denom = Math.sqrt(Math.pow(w0 * w0 - w * w, 2) + Math.pow(2 * gamma * w, 2));
      var A = denom > 0.001 ? 1 / denom : 1000;
      var normA = A / maxA;
      var px = plotX + (fi / maxFreqDisplay) * plotW;
      var py = plotY + plotH - normA * plotH * 0.9;
      p.vertex(px, py);
    }
    p.endShape();

    // Current driving frequency dot
    var currentW = driveFreq * 2 * Math.PI;
    var currentDenom = Math.sqrt(Math.pow(w0 * w0 - currentW * currentW, 2) + Math.pow(2 * gamma * currentW, 2));
    var currentA = currentDenom > 0.001 ? 1 / currentDenom : 1000;
    var normCurrentA = currentA / maxA;
    var dotX = plotX + (driveFreq / maxFreqDisplay) * plotW;
    var dotY = plotY + plotH - normCurrentA * plotH * 0.9;

    // Dot glow
    p.noStroke();
    p.fill(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2], 40);
    p.ellipse(dotX, dotY, 20);
    // Dot
    p.fill(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2]);
    p.ellipse(dotX, dotY, 8);

    // Vertical line from dot to x-axis
    p.stroke(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2], 60);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([2, 2]);
    p.line(dotX, dotY + 6, dotX, plotY + plotH);
    p.drawingContext.setLineDash([]);

    // Drive freq label near dot
    p.noStroke();
    p.fill(COL_ACCENT[0], COL_ACCENT[1], COL_ACCENT[2]);
    p.textSize(8);
    p.textAlign(p.LEFT);
    p.text(driveFreq.toFixed(2) + ' Hz', dotX + 6, dotY - 2);
  }

  // ========================================
  // RESIZE
  // ========================================
  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  };
}


// ========================================
// PREVIEW SKETCH (landing page card)
// ========================================
function previewSketch(p) {
  var time = 0;

  p.setup = function () {
    var container = p.canvas.parentElement;
    p.createCanvas(container.clientWidth, container.clientHeight);
    p.frameRate(60);
  };

  p.draw = function () {
    p.background(13, 17, 23);
    time += 1 / 60;

    var w = p.width;
    var h = p.height;
    var centerY = h / 2;

    // Wave 1: accent green
    p.noFill();
    p.stroke(57, 211, 83, 160);
    p.strokeWeight(1.5);
    p.beginShape();
    for (var x = 0; x < w; x += 2) {
      var phase1 = (x / w) * 3 * Math.PI - time * 1.2 * 2 * Math.PI;
      var y = centerY + h * 0.2 * Math.sin(phase1);
      p.vertex(x, y);
    }
    p.endShape();

    // Wave 2: blue, slightly different freq
    p.stroke(88, 166, 255, 140);
    p.strokeWeight(1.5);
    p.beginShape();
    for (var x = 0; x < w; x += 2) {
      var phase2 = (x / w) * 3.6 * Math.PI - time * 1.4 * 2 * Math.PI;
      var y = centerY + h * 0.18 * Math.sin(phase2);
      p.vertex(x, y);
    }
    p.endShape();

    // Combined wave: white, thicker
    p.stroke(230, 237, 243, 200);
    p.strokeWeight(2);
    p.beginShape();
    for (var x = 0; x < w; x += 2) {
      var p1 = (x / w) * 3 * Math.PI - time * 1.2 * 2 * Math.PI;
      var p2 = (x / w) * 3.6 * Math.PI - time * 1.4 * 2 * Math.PI;
      var y = centerY + h * 0.2 * Math.sin(p1) + h * 0.18 * Math.sin(p2);
      p.vertex(x, y);
    }
    p.endShape();

    // Subtle center line
    p.stroke(33, 38, 45);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([3, 3]);
    p.line(0, centerY, w, centerY);
    p.drawingContext.setLineDash([]);
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  };
}
