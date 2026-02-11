/* Thermodynamics - Ideal Gas Simulation */

function fullSketch(p) {
  var paused = false;

  // State
  var particles = [];
  var particleCount = 50;
  var temperature = 300; // Kelvin
  var pistonLocked = false;
  var showSpeedColors = true;

  // Chamber dimensions (left ~58% of canvas)
  var chamberX, chamberY, chamberW, chamberH;
  var pistonX; // right edge of chamber, draggable
  var minPistonX, maxPistonX;
  var initialChamberW; // for reset

  // PV diagram (right ~38% of canvas)
  var pvX, pvY, pvW, pvH;
  var pvPoints = []; // {pressure, volume} history
  var pvMaxPoints = 500;

  // Physics
  var pressureSmooth = 0;
  var wallHits = 0;
  var pressureBuffer = [];
  var pressureBufferSize = 30;
  var prevPistonX = 0; // for piston velocity
  var pistonVel = 0;

  // Colors
  var BG = [13, 17, 23];
  var ACCENT = [218, 91, 13];
  var BORDER = [48, 54, 61];

  // Dragging
  var draggingPiston = false;

  // Preset animation
  var presetAnim = null; // { type, frame, totalFrames, startPiston, endPiston, startTemp, endTemp, phase }

  var w, h;

  function speedFromTemp(T) {
    return Math.sqrt(T / 300) * 3;
  }

  function createParticle() {
    var speed = speedFromTemp(temperature) * (0.5 + p.random() * 1.0);
    var angle = p.random(p.TWO_PI);
    var margin = 6;
    return {
      x: chamberX + margin + p.random() * Math.max(pistonX - chamberX - margin * 2, 10),
      y: chamberY + margin + p.random() * Math.max(chamberH - margin * 2, 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 3
    };
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }
  }

  function rescaleVelocities(newTemp) {
    if (temperature < 1) temperature = 1;
    var ratio = Math.sqrt(newTemp / temperature);
    for (var i = 0; i < particles.length; i++) {
      particles[i].vx *= ratio;
      particles[i].vy *= ratio;
    }
    temperature = newTemp;
  }

  function resetSim() {
    paused = false;
    presetAnim = null;
    temperature = 300;
    particleCount = 50;
    pistonX = chamberX + initialChamberW;
    pvPoints = [];
    pressureBuffer = [];
    pressureSmooth = 0;

    // Reset slider values
    var tempSlider = document.getElementById('temp-slider');
    var countSlider = document.getElementById('count-slider');
    var tempValEl = document.getElementById('temp-value');
    var countValEl = document.getElementById('count-value');
    if (tempSlider) { tempSlider.value = 300; }
    if (countSlider) { countSlider.value = 50; }
    if (tempValEl) { tempValEl.textContent = '300'; }
    if (countValEl) { countValEl.textContent = '50'; }

    var lockEl = document.getElementById('lock-piston');
    if (lockEl) { lockEl.checked = false; }
    pistonLocked = false;

    var pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) { pauseBtn.textContent = 'Pause'; }

    initParticles();
  }

  p.setup = function () {
    var container = p.canvas ? p.canvas.parentElement : p._userNode;
    w = container.offsetWidth;
    h = container.offsetHeight;
    p.createCanvas(w, h);

    // Chamber: left 58%
    var pad = Math.min(w, h) * 0.04;
    chamberX = pad;
    chamberY = pad;
    chamberW = w * 0.55 - pad;
    chamberH = h - pad * 2;
    pistonX = chamberX + chamberW;
    initialChamberW = chamberW;
    minPistonX = chamberX + 40;
    maxPistonX = chamberX + chamberW;
    prevPistonX = pistonX;

    // PV diagram: right 38%
    pvX = w * 0.62;
    pvY = pad + 20;
    pvW = w - pvX - pad;
    pvH = h - pad * 2 - 20;

    initParticles();
    bindControls();
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    var newW = container.offsetWidth;
    var newH = container.offsetHeight;
    if (newW < 10 || newH < 10) return;

    // Recalculate layout proportionally
    var pistonFrac = (pistonX - chamberX) / (maxPistonX - chamberX);

    w = newW;
    h = newH;
    p.resizeCanvas(w, h);

    var pad = Math.min(w, h) * 0.04;
    chamberX = pad;
    chamberY = pad;
    chamberW = w * 0.55 - pad;
    chamberH = h - pad * 2;
    initialChamberW = chamberW;
    maxPistonX = chamberX + chamberW;
    minPistonX = chamberX + 40;
    pistonX = chamberX + pistonFrac * (maxPistonX - chamberX);
    pistonX = PhysicsUtils.clamp(pistonX, minPistonX, maxPistonX);

    pvX = w * 0.62;
    pvY = pad + 20;
    pvW = w - pvX - pad;
    pvH = h - pad * 2 - 20;
  };

  function bindControls() {
    // Temperature slider
    PhysicsUtils.bindSlider('temp-slider', 'temp-value', function (val) {
      var newTemp = Math.round(val);
      rescaleVelocities(newTemp);
    });

    // Particle count slider
    PhysicsUtils.bindSlider('count-slider', 'count-value', function (val) {
      particleCount = Math.round(val);
      initParticles();
    });

    // Lock piston toggle
    var lockEl = document.getElementById('lock-piston');
    if (lockEl) {
      lockEl.addEventListener('change', function () {
        pistonLocked = lockEl.checked;
      });
    }

    // Speed colors toggle
    var colorsEl = document.getElementById('speed-colors');
    if (colorsEl) {
      showSpeedColors = colorsEl.checked;
      colorsEl.addEventListener('change', function () {
        showSpeedColors = colorsEl.checked;
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

    // Preset: Isothermal Compression
    var isoBtn = document.getElementById('preset-isothermal');
    if (isoBtn) {
      isoBtn.addEventListener('click', function () {
        pistonLocked = false;
        var lockCb = document.getElementById('lock-piston');
        if (lockCb) lockCb.checked = false;
        presetAnim = {
          type: 'isothermal',
          frame: 0,
          totalFrames: 120,
          startPiston: pistonX,
          endPiston: chamberX + (pistonX - chamberX) * 0.4,
          startTemp: temperature,
          endTemp: temperature,
          phase: 'compress'
        };
        paused = false;
        var pb = document.getElementById('pause-btn');
        if (pb) pb.textContent = 'Pause';
      });
    }

    // Preset: Isobaric Expansion
    var isobarBtn = document.getElementById('preset-isobaric');
    if (isobarBtn) {
      isobarBtn.addEventListener('click', function () {
        presetAnim = {
          type: 'isobaric',
          frame: 0,
          totalFrames: 90,
          startPiston: pistonX,
          endPiston: maxPistonX,
          startTemp: temperature,
          endTemp: Math.min(temperature * 2, 1000),
          phase: 'heat'
        };
        // Lock piston during heat phase
        pistonLocked = true;
        var lockCb = document.getElementById('lock-piston');
        if (lockCb) lockCb.checked = true;
        paused = false;
        var pb = document.getElementById('pause-btn');
        if (pb) pb.textContent = 'Pause';
      });
    }
  }

  // --- Mouse interaction for piston ---
  p.mousePressed = function () {
    if (pistonLocked) return;
    var mx = p.mouseX;
    var my = p.mouseY;
    if (Math.abs(mx - pistonX) < 14 && my > chamberY && my < chamberY + chamberH) {
      draggingPiston = true;
      presetAnim = null; // cancel any running preset
    }
  };

  p.mouseDragged = function () {
    if (!draggingPiston) return;
    var newX = PhysicsUtils.clamp(p.mouseX, minPistonX, maxPistonX);
    pistonX = Math.max(newX, chamberX + 30);

    // Push particles that are now outside the chamber
    for (var i = 0; i < particles.length; i++) {
      if (particles[i].x + particles[i].r > pistonX) {
        particles[i].x = pistonX - particles[i].r - 1;
        particles[i].vx = -Math.abs(particles[i].vx);
      }
    }
  };

  p.mouseReleased = function () {
    draggingPiston = false;
  };

  // --- Touch support ---
  p.touchStarted = function () {
    if (pistonLocked || p.touches.length === 0) return;
    var tx = p.touches[0].x;
    var ty = p.touches[0].y;
    if (Math.abs(tx - pistonX) < 20 && ty > chamberY && ty < chamberY + chamberH) {
      draggingPiston = true;
      presetAnim = null;
      return false;
    }
  };

  p.touchMoved = function () {
    if (!draggingPiston || p.touches.length === 0) return;
    var newX = PhysicsUtils.clamp(p.touches[0].x, minPistonX, maxPistonX);
    pistonX = Math.max(newX, chamberX + 30);
    for (var i = 0; i < particles.length; i++) {
      if (particles[i].x + particles[i].r > pistonX) {
        particles[i].x = pistonX - particles[i].r - 1;
        particles[i].vx = -Math.abs(particles[i].vx);
      }
    }
    return false;
  };

  p.touchEnded = function () {
    draggingPiston = false;
  };

  // --- Speed-to-color mapping ---
  function speedColor(speed) {
    // Map speed 0..8 through blue -> white -> red
    var t = PhysicsUtils.clamp(speed / 8, 0, 1);
    var r, g, b;
    if (t < 0.5) {
      // Blue to white
      var s = t * 2; // 0..1
      r = PhysicsUtils.lerp(80, 255, s);
      g = PhysicsUtils.lerp(120, 255, s);
      b = PhysicsUtils.lerp(255, 255, s);
    } else {
      // White to red
      var s = (t - 0.5) * 2; // 0..1
      r = PhysicsUtils.lerp(255, 255, s);
      g = PhysicsUtils.lerp(255, 80, s);
      b = PhysicsUtils.lerp(255, 60, s);
    }
    return [r, g, b];
  }

  // --- Main draw loop ---
  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    // Track piston velocity
    pistonVel = pistonX - prevPistonX;
    prevPistonX = pistonX;

    // --- Preset animation ---
    if (presetAnim && !paused) {
      var anim = presetAnim;
      anim.frame++;

      if (anim.type === 'isothermal') {
        // Smoothly move piston, temperature stays constant
        var t = anim.frame / anim.totalFrames;
        t = t * t * (3 - 2 * t); // smoothstep
        var targetX = PhysicsUtils.lerp(anim.startPiston, anim.endPiston, t);
        targetX = PhysicsUtils.clamp(targetX, minPistonX, maxPistonX);
        pistonX = targetX;

        // Push particles
        for (var i = 0; i < particles.length; i++) {
          if (particles[i].x + particles[i].r > pistonX) {
            particles[i].x = pistonX - particles[i].r - 1;
            particles[i].vx = -Math.abs(particles[i].vx);
          }
        }

        if (anim.frame >= anim.totalFrames) {
          presetAnim = null;
        }
      } else if (anim.type === 'isobaric') {
        if (anim.phase === 'heat') {
          // Phase 1: heat with piston locked
          var t = anim.frame / anim.totalFrames;
          var newTemp = PhysicsUtils.lerp(anim.startTemp, anim.endTemp, t);
          rescaleVelocities(newTemp);

          // Update slider display
          var tempSlider = document.getElementById('temp-slider');
          var tempValEl = document.getElementById('temp-value');
          if (tempSlider) tempSlider.value = Math.round(temperature);
          if (tempValEl) tempValEl.textContent = Math.round(temperature);

          if (anim.frame >= anim.totalFrames) {
            // Phase 2: unlock piston and let it expand
            anim.phase = 'expand';
            anim.frame = 0;
            anim.totalFrames = 90;
            anim.startPiston = pistonX;
            pistonLocked = false;
            var lockCb = document.getElementById('lock-piston');
            if (lockCb) lockCb.checked = false;
          }
        } else if (anim.phase === 'expand') {
          // Smoothly move piston outward
          var t = anim.frame / anim.totalFrames;
          t = t * t * (3 - 2 * t);
          var targetX = PhysicsUtils.lerp(anim.startPiston, anim.endPiston, t);
          targetX = PhysicsUtils.clamp(targetX, minPistonX, maxPistonX);
          pistonX = targetX;

          if (anim.frame >= anim.totalFrames) {
            presetAnim = null;
          }
        }
      }
    }

    // === DRAW CHAMBER ===
    p.stroke(BORDER[0], BORDER[1], BORDER[2]);
    p.strokeWeight(2);
    p.noFill();

    // Left wall
    p.line(chamberX, chamberY, chamberX, chamberY + chamberH);
    // Top wall
    p.line(chamberX, chamberY, pistonX, chamberY);
    // Bottom wall
    p.line(chamberX, chamberY + chamberH, pistonX, chamberY + chamberH);

    // === DRAW PISTON ===
    var pistonW = 10;
    // Piston body
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], pistonLocked ? 120 : 220);
    p.noStroke();
    p.rect(pistonX - pistonW / 2, chamberY, pistonW, chamberH);

    // Grip lines on piston
    p.stroke(255, 255, 255, pistonLocked ? 30 : 60);
    p.strokeWeight(1);
    var gripSpacing = 12;
    var gripStart = chamberY + 20;
    var gripEnd = chamberY + chamberH - 20;
    for (var gy = gripStart; gy < gripEnd; gy += gripSpacing) {
      p.line(pistonX - 3, gy, pistonX + 3, gy);
    }

    // Piston handle (small triangle/tab)
    p.noStroke();
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], pistonLocked ? 80 : 180);
    var handleY = chamberY + chamberH / 2;
    p.triangle(
      pistonX + pistonW / 2, handleY - 8,
      pistonX + pistonW / 2 + 10, handleY,
      pistonX + pistonW / 2, handleY + 8
    );

    // === UPDATE PARTICLES ===
    wallHits = 0;

    if (!paused) {
      for (var i = 0; i < particles.length; i++) {
        var pt = particles[i];

        // Move
        pt.x += pt.vx;
        pt.y += pt.vy;

        // Left wall
        if (pt.x - pt.r < chamberX) {
          pt.x = chamberX + pt.r;
          pt.vx = Math.abs(pt.vx);
        }

        // Top wall
        if (pt.y - pt.r < chamberY) {
          pt.y = chamberY + pt.r;
          pt.vy = Math.abs(pt.vy);
        }

        // Bottom wall
        if (pt.y + pt.r > chamberY + chamberH) {
          pt.y = chamberY + chamberH - pt.r;
          pt.vy = -Math.abs(pt.vy);
        }

        // Piston (right wall)
        if (pt.x + pt.r > pistonX) {
          pt.x = pistonX - pt.r;
          pt.vx = -Math.abs(pt.vx);
          wallHits++;

          // Energy transfer from moving piston
          if (Math.abs(pistonVel) > 0.1) {
            pt.vx -= pistonVel * 0.3;
          }
        }

        // Clamp inside chamber
        pt.x = PhysicsUtils.clamp(pt.x, chamberX + pt.r, pistonX - pt.r);
        pt.y = PhysicsUtils.clamp(pt.y, chamberY + pt.r, chamberY + chamberH - pt.r);
      }
    }

    // === DRAW PARTICLES ===
    p.noStroke();
    for (var i = 0; i < particles.length; i++) {
      var pt = particles[i];
      var spd = Math.sqrt(pt.vx * pt.vx + pt.vy * pt.vy);

      if (showSpeedColors) {
        var col = speedColor(spd);
        p.fill(col[0], col[1], col[2], 210);
      } else {
        p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 210);
      }
      p.circle(pt.x, pt.y, pt.r * 2);
    }

    // === PRESSURE CALCULATION ===
    // Average speed of all particles
    var avgSpeed = 0;
    for (var i = 0; i < particles.length; i++) {
      var pt = particles[i];
      avgSpeed += Math.sqrt(pt.vx * pt.vx + pt.vy * pt.vy);
    }
    avgSpeed = particles.length > 0 ? avgSpeed / particles.length : 0;

    // Pressure proportional to hits * avg_speed / chamber width
    var chamberWidth = Math.max(pistonX - chamberX, 1);
    var instantPressure = wallHits * avgSpeed / (chamberWidth * 0.01);

    pressureBuffer.push(instantPressure);
    if (pressureBuffer.length > pressureBufferSize) {
      pressureBuffer.shift();
    }

    // Smooth pressure
    var sum = 0;
    for (var i = 0; i < pressureBuffer.length; i++) {
      sum += pressureBuffer[i];
    }
    pressureSmooth = pressureBuffer.length > 0 ? sum / pressureBuffer.length : 0;

    // Volume (proportional to chamber width)
    var volume = chamberWidth;

    // === PV DIAGRAM ===
    // Store point every 2 frames
    if (p.frameCount % 2 === 0 && !paused) {
      pvPoints.push({ pressure: pressureSmooth, volume: volume });
      if (pvPoints.length > pvMaxPoints) {
        pvPoints.shift();
      }
    }

    // Draw PV diagram background
    p.fill(BG[0] + 4, BG[1] + 4, BG[2] + 4);
    p.stroke(BORDER[0], BORDER[1], BORDER[2]);
    p.strokeWeight(1);
    p.rect(pvX, pvY, pvW, pvH, 4);

    // Axes labels
    p.noStroke();
    p.fill(139, 148, 158);
    p.textSize(11);
    p.textStyle(p.BOLD);

    // P label (vertical axis)
    p.push();
    p.translate(pvX - 4, pvY + pvH / 2);
    p.rotate(-p.HALF_PI);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text('P', 0, 0);
    p.pop();

    // V label (horizontal axis)
    p.textAlign(p.CENTER, p.TOP);
    p.text('V', pvX + pvW / 2, pvY + pvH + 6);
    p.textStyle(p.NORMAL);

    // Axis lines
    p.stroke(BORDER[0], BORDER[1], BORDER[2]);
    p.strokeWeight(1);
    var axisMargin = 10;
    p.line(pvX + axisMargin, pvY + pvH - axisMargin, pvX + pvW - 4, pvY + pvH - axisMargin); // horizontal
    p.line(pvX + axisMargin, pvY + pvH - axisMargin, pvX + axisMargin, pvY + 4); // vertical

    // Determine PV plot ranges
    var vMin = 30;
    var vMax = initialChamberW + 10;
    var pMax = 0;

    // Find pressure max from stored points
    for (var i = 0; i < pvPoints.length; i++) {
      if (pvPoints[i].pressure > pMax) pMax = pvPoints[i].pressure;
    }
    // Ensure pMax has a reasonable minimum
    pMax = Math.max(pMax, pressureSmooth * 1.2, 50);

    // Draw faint isothermal curve for current temperature: P = const / V
    // Use current nRT product: PV = nRT → P = nRT/V
    var nrt = pressureSmooth * volume;
    if (nrt > 10) {
      p.noFill();
      p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 30);
      p.strokeWeight(1);
      p.drawingContext.setLineDash([4, 4]);
      p.beginShape();
      for (var vi = vMin; vi <= vMax; vi += 2) {
        var pi = nrt / vi;
        var sx = pvX + axisMargin + PhysicsUtils.mapRange(vi, vMin, vMax, 0, pvW - axisMargin - 4);
        var sy = pvY + pvH - axisMargin - PhysicsUtils.mapRange(pi, 0, pMax, 0, pvH - axisMargin - 4);
        sy = PhysicsUtils.clamp(sy, pvY + 4, pvY + pvH - axisMargin);
        p.vertex(sx, sy);
      }
      p.endShape();
      p.drawingContext.setLineDash([]);
    }

    // Draw PV trace
    if (pvPoints.length > 1) {
      p.noFill();
      p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 160);
      p.strokeWeight(1.5);
      p.beginShape();
      for (var i = 0; i < pvPoints.length; i++) {
        var pt = pvPoints[i];
        var sx = pvX + axisMargin + PhysicsUtils.mapRange(pt.volume, vMin, vMax, 0, pvW - axisMargin - 4);
        var sy = pvY + pvH - axisMargin - PhysicsUtils.mapRange(pt.pressure, 0, pMax, 0, pvH - axisMargin - 4);
        sx = PhysicsUtils.clamp(sx, pvX + axisMargin, pvX + pvW - 4);
        sy = PhysicsUtils.clamp(sy, pvY + 4, pvY + pvH - axisMargin);
        p.vertex(sx, sy);
      }
      p.endShape();
    }

    // Current state dot
    if (pvPoints.length > 0) {
      var last = pvPoints[pvPoints.length - 1];
      var dotX = pvX + axisMargin + PhysicsUtils.mapRange(last.volume, vMin, vMax, 0, pvW - axisMargin - 4);
      var dotY = pvY + pvH - axisMargin - PhysicsUtils.mapRange(last.pressure, 0, pMax, 0, pvH - axisMargin - 4);
      dotX = PhysicsUtils.clamp(dotX, pvX + axisMargin, pvX + pvW - 4);
      dotY = PhysicsUtils.clamp(dotY, pvY + 4, pvY + pvH - axisMargin);

      // Glow
      p.noStroke();
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 50);
      p.circle(dotX, dotY, 16);
      // Dot
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2]);
      p.circle(dotX, dotY, 7);
    }

    // PV diagram title
    p.noStroke();
    p.fill(139, 148, 158);
    p.textSize(10);
    p.textAlign(p.LEFT, p.TOP);
    p.text('PV Diagram', pvX + 8, pvY + 6);

    // === UPDATE HTML READOUTS ===
    var pressureEl = document.getElementById('pressure-val');
    var volumeEl = document.getElementById('volume-val');
    var tempEl = document.getElementById('temp-val');
    var nEl = document.getElementById('n-val');

    if (pressureEl) pressureEl.textContent = PhysicsUtils.formatNum(pressureSmooth, 1);
    if (volumeEl) volumeEl.textContent = PhysicsUtils.formatNum(volume, 0);
    if (tempEl) tempEl.textContent = Math.round(temperature);
    if (nEl) nEl.textContent = particles.length;
  };
}
