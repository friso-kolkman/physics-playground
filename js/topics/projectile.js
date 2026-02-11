/* Physics Playground - Projectile Motion Simulation */

function fullSketch(p) {
  var paused = false;

  // Launch parameters
  var launchAngle = 45;    // degrees
  var launchVelocity = 25; // m/s
  var gravity = 9.8;
  var airResistance = false;
  var dragCoeff = 0.1;
  var showComponents = false;

  // Simulation state
  var projectile = null;   // {x, y, vx, vy, trail: [{x,y}], active, maxY, time, stepCount}
  var ghostTrails = [];    // up to 10 previous trails
  var cannonX, cannonY;    // bottom-left cannon position
  var scale;               // pixels per meter

  // Timing
  var dt = 0.05;           // simulation timestep (seconds)
  var stepsPerFrame = 2;   // steps per draw frame for smooth motion

  // Colors
  var BG = [13, 17, 23];
  var ACCENT = [247, 120, 186];
  var GROUND_COLOR = [48, 54, 61];
  var GHOST_COLORS = [
    [247, 120, 186, 50],
    [200, 100, 160, 45],
    [180, 90, 150, 40],
    [160, 80, 140, 35],
    [140, 70, 130, 30],
    [120, 60, 120, 25],
    [100, 50, 110, 22],
    [90, 45, 100, 18],
    [80, 40, 90, 15],
    [70, 35, 80, 12]
  ];
  var TEXT_COLOR = [139, 148, 158];
  var GREEN = [57, 211, 83];
  var RED = [248, 81, 73];

  p.setup = function () {
    p.createCanvas(p.width || 100, p.height || 100);
    resizeToContainer();
    p.frameRate(60);
    computeLayout();
    bindControls();
  };

  function resizeToContainer() {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  }

  function computeLayout() {
    cannonX = 60;
    cannonY = p.height - 40;
    // Scale so max theoretical range at 45deg fits ~80% of canvas width
    var maxRange = (launchVelocity * launchVelocity) / gravity; // v^2/g at sin(90)=1
    scale = (p.width - 100) / Math.max(maxRange, 50);
    // Clamp scale to reasonable bounds
    scale = PhysicsUtils.clamp(scale, 1, 12);
  }

  function bindControls() {
    PhysicsUtils.bindSlider('angle-slider', 'angle-value', function (v) {
      launchAngle = v;
    });
    PhysicsUtils.bindSlider('velocity-slider', 'velocity-value', function (v) {
      launchVelocity = v;
      computeLayout();
    });
    PhysicsUtils.bindSlider('drag-slider', 'drag-value', function (v) {
      dragCoeff = v;
    });

    // Air resistance toggle
    var dragToggle = document.getElementById('drag-toggle');
    if (dragToggle) {
      dragToggle.addEventListener('change', function () {
        airResistance = dragToggle.checked;
        var dragControls = document.getElementById('drag-controls');
        if (dragControls) {
          dragControls.style.display = airResistance ? 'block' : 'none';
        }
      });
    }

    // Show components toggle
    var compToggle = document.getElementById('components-toggle');
    if (compToggle) {
      compToggle.addEventListener('change', function () {
        showComponents = compToggle.checked;
      });
    }

    // Fire button
    var fireBtn = document.getElementById('fire-btn');
    if (fireBtn) {
      fireBtn.addEventListener('click', function () {
        fireProjectile();
      });
    }

    // Clear button
    var clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        ghostTrails = [];
        projectile = null;
        updateReadout(null);
      });
    }

    // Reset button
    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        ghostTrails = [];
        projectile = null;
        paused = false;

        // Reset sliders to defaults
        setSlider('angle-slider', 'angle-value', 45);
        setSlider('velocity-slider', 'velocity-value', 25);
        setSlider('drag-slider', 'drag-value', 0.1);

        launchAngle = 45;
        launchVelocity = 25;
        dragCoeff = 0.1;
        airResistance = false;
        showComponents = false;

        var dragToggleEl = document.getElementById('drag-toggle');
        if (dragToggleEl) dragToggleEl.checked = false;
        var compToggleEl = document.getElementById('components-toggle');
        if (compToggleEl) compToggleEl.checked = false;
        var dragControlsEl = document.getElementById('drag-controls');
        if (dragControlsEl) dragControlsEl.style.display = 'none';

        computeLayout();
        updateReadout(null);

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
  }

  function setSlider(sliderId, valueId, val) {
    var slider = document.getElementById(sliderId);
    var display = document.getElementById(valueId);
    if (slider) slider.value = val;
    if (display) display.textContent = val;
  }

  function fireProjectile() {
    // Save current trail as ghost
    if (projectile && projectile.trail.length > 1) {
      ghostTrails.push(projectile.trail.slice());
      if (ghostTrails.length > 10) {
        ghostTrails.shift();
      }
    }

    var angleRad = launchAngle * Math.PI / 180;
    projectile = {
      x: 0,
      y: 0,
      vx: launchVelocity * Math.cos(angleRad),
      vy: launchVelocity * Math.sin(angleRad),
      trail: [],
      active: true,
      maxY: 0,
      time: 0,
      stepCount: 0
    };

    // Recompute scale for this velocity
    computeLayout();

    // Show analytical readout immediately (no drag)
    if (!airResistance) {
      updateAnalyticalReadout();
    } else {
      updateReadout({ range: '...', height: '...', time: '...' });
    }

    // Unpause if paused
    if (paused) {
      paused = false;
      var pb = document.getElementById('pause-btn');
      if (pb) pb.textContent = 'Pause';
      p.loop();
    }
  }

  function updateAnalyticalReadout() {
    var angleRad = launchAngle * Math.PI / 180;
    var v = launchVelocity;
    var R = (v * v * Math.sin(2 * angleRad)) / gravity;
    var H = (v * v * Math.sin(angleRad) * Math.sin(angleRad)) / (2 * gravity);
    var T = (2 * v * Math.sin(angleRad)) / gravity;
    updateReadout({
      range: PhysicsUtils.formatNum(R, 1) + ' m',
      height: PhysicsUtils.formatNum(H, 1) + ' m',
      time: PhysicsUtils.formatNum(T, 2) + ' s'
    });
  }

  function updateReadout(data) {
    var rangeEl = document.getElementById('range-val');
    var heightEl = document.getElementById('height-val');
    var timeEl = document.getElementById('time-val');
    if (!data) {
      if (rangeEl) rangeEl.textContent = '--';
      if (heightEl) heightEl.textContent = '--';
      if (timeEl) timeEl.textContent = '--';
      return;
    }
    if (rangeEl) rangeEl.textContent = data.range;
    if (heightEl) heightEl.textContent = data.height;
    if (timeEl) timeEl.textContent = data.time;
  }

  function simToCanvas(sx, sy) {
    return {
      cx: cannonX + sx * scale,
      cy: cannonY - sy * scale
    };
  }

  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    drawGround();
    drawScaleMarkers();
    drawCannon();
    drawGhostTrails();

    if (projectile && projectile.active && !paused) {
      for (var s = 0; s < stepsPerFrame; s++) {
        stepSimulation();
      }
    }

    if (projectile) {
      drawTrail(projectile.trail, ACCENT, 255);
      drawProjectile();

      if (showComponents && projectile.active) {
        drawComponentArrows();
      }
    }
  };

  function stepSimulation() {
    if (!projectile || !projectile.active) return;

    var proj = projectile;

    if (airResistance) {
      // Exponential decay for drag (stable at high drag + velocity)
      var speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
      var dragFactor = Math.exp(-dragCoeff * speed * dt);
      proj.vx *= dragFactor;
      proj.vy *= dragFactor;

      // Apply gravity after drag
      proj.vy -= gravity * dt;
    } else {
      // No drag: only gravity on y
      proj.vy -= gravity * dt;
    }

    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.time += dt;
    proj.stepCount++;

    if (proj.y > proj.maxY) {
      proj.maxY = proj.y;
    }

    // Record trail point every 4 steps (~0.2s sim time)
    if (proj.stepCount % 4 === 0) {
      proj.trail.push({ x: proj.x, y: proj.y });
    }

    // Check if hit ground
    if (proj.y <= 0 && proj.time > dt * 2) {
      // Interpolate to ground
      proj.y = 0;
      proj.active = false;

      // Add final point
      proj.trail.push({ x: proj.x, y: 0 });

      // Update readout with actual values
      updateReadout({
        range: PhysicsUtils.formatNum(proj.x, 1) + ' m',
        height: PhysicsUtils.formatNum(proj.maxY, 1) + ' m',
        time: PhysicsUtils.formatNum(proj.time, 2) + ' s'
      });
    }
  }

  function drawGround() {
    // Ground line
    p.stroke(GROUND_COLOR[0], GROUND_COLOR[1], GROUND_COLOR[2]);
    p.strokeWeight(2);
    p.line(20, cannonY, p.width - 20, cannonY);

    // Hash marks
    p.strokeWeight(1);
    p.stroke(GROUND_COLOR[0], GROUND_COLOR[1], GROUND_COLOR[2], 100);
    var spacing = 15;
    for (var x = 20; x < p.width - 20; x += spacing) {
      p.line(x, cannonY, x - 5, cannonY + 8);
    }
  }

  function drawScaleMarkers() {
    // Distance markers along ground
    p.textFont('monospace');
    p.textSize(8);
    p.textAlign(p.CENTER, p.TOP);
    p.noStroke();
    p.fill(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2], 120);

    var maxMeters = (p.width - cannonX - 40) / scale;
    var step = 10;
    if (maxMeters > 200) step = 50;
    else if (maxMeters > 100) step = 25;
    else if (maxMeters > 50) step = 10;
    else step = 5;

    for (var m = step; m < maxMeters; m += step) {
      var cx = cannonX + m * scale;
      if (cx > p.width - 30) break;

      // Tick
      p.stroke(GROUND_COLOR[0], GROUND_COLOR[1], GROUND_COLOR[2], 80);
      p.strokeWeight(1);
      p.line(cx, cannonY - 3, cx, cannonY + 3);

      // Label
      p.noStroke();
      p.fill(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2], 100);
      p.text(m + 'm', cx, cannonY + 10);
    }
  }

  function drawCannon() {
    var angleRad = launchAngle * Math.PI / 180;
    var barrelLen = 30;

    // Cannon base (circle)
    p.fill(GROUND_COLOR[0], GROUND_COLOR[1], GROUND_COLOR[2]);
    p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 120);
    p.strokeWeight(1);
    p.ellipse(cannonX, cannonY, 18, 18);

    // Barrel (rotated thick line)
    p.push();
    p.translate(cannonX, cannonY);
    p.rotate(-angleRad);
    p.stroke(ACCENT[0], ACCENT[1], ACCENT[2]);
    p.strokeWeight(6);
    p.strokeCap(p.ROUND);
    p.line(0, 0, barrelLen, 0);

    // Barrel tip accent
    p.strokeWeight(3);
    p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 200);
    p.line(barrelLen - 2, -3, barrelLen - 2, 3);
    p.pop();

    // Angle label
    p.noStroke();
    p.fill(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    p.textFont('monospace');
    p.textSize(9);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(launchAngle + '\u00B0', cannonX + 36, cannonY - 6);
  }

  function drawGhostTrails() {
    for (var g = 0; g < ghostTrails.length; g++) {
      var trail = ghostTrails[g];
      var colorIdx = Math.min(g, GHOST_COLORS.length - 1);
      // Older trails are more faded (reverse index)
      var fadeIdx = ghostTrails.length - 1 - g;
      var col = GHOST_COLORS[Math.min(fadeIdx, GHOST_COLORS.length - 1)];

      // Draw as connected line
      p.noFill();
      p.stroke(col[0], col[1], col[2], col[3]);
      p.strokeWeight(1);
      p.beginShape();
      for (var i = 0; i < trail.length; i++) {
        var pt = simToCanvas(trail[i].x, trail[i].y);
        p.vertex(pt.cx, pt.cy);
      }
      p.endShape();

      // Draw dots
      p.noStroke();
      for (var i = 0; i < trail.length; i++) {
        var pt = simToCanvas(trail[i].x, trail[i].y);
        p.fill(col[0], col[1], col[2], col[3] * 1.5);
        p.ellipse(pt.cx, pt.cy, 3, 3);
      }
    }
  }

  function drawTrail(trail, color, alpha) {
    if (trail.length < 2) return;

    // Connected line
    p.noFill();
    p.stroke(color[0], color[1], color[2], alpha * 0.5);
    p.strokeWeight(1.5);
    p.beginShape();
    for (var i = 0; i < trail.length; i++) {
      var pt = simToCanvas(trail[i].x, trail[i].y);
      p.vertex(pt.cx, pt.cy);
    }
    p.endShape();

    // Dots at each trail point
    p.noStroke();
    for (var i = 0; i < trail.length; i++) {
      var pt = simToCanvas(trail[i].x, trail[i].y);
      p.fill(color[0], color[1], color[2], alpha);
      p.ellipse(pt.cx, pt.cy, 4, 4);
    }
  }

  function drawProjectile() {
    if (!projectile) return;

    var pt = simToCanvas(projectile.x, projectile.y);

    // Glow
    p.noStroke();
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 30);
    p.ellipse(pt.cx, pt.cy, 24, 24);
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 60);
    p.ellipse(pt.cx, pt.cy, 16, 16);

    // Main circle
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2]);
    p.stroke(255, 255, 255, 60);
    p.strokeWeight(1);
    p.ellipse(pt.cx, pt.cy, 10, 10);

    // Height indicator (dashed line to ground)
    if (projectile.active && projectile.y > 1) {
      p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 40);
      p.strokeWeight(1);
      p.drawingContext.setLineDash([3, 3]);
      p.line(pt.cx, pt.cy + 7, pt.cx, cannonY);
      p.drawingContext.setLineDash([]);
    }

    // Readout near projectile during flight
    if (projectile.active) {
      p.noStroke();
      p.fill(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
      p.textFont('monospace');
      p.textSize(9);
      p.textAlign(p.LEFT, p.BOTTOM);
      var label = PhysicsUtils.formatNum(projectile.y, 1) + 'm';
      p.text(label, pt.cx + 10, pt.cy - 4);

      // Update readout in real-time for drag case
      if (airResistance) {
        updateReadout({
          range: PhysicsUtils.formatNum(projectile.x, 1) + ' m',
          height: PhysicsUtils.formatNum(projectile.maxY, 1) + ' m',
          time: PhysicsUtils.formatNum(projectile.time, 2) + ' s'
        });
      }
    }
  }

  function drawComponentArrows() {
    if (!projectile || !projectile.active) return;

    var pt = simToCanvas(projectile.x, projectile.y);
    var arrowScale = 2.5; // pixels per m/s

    var vx = projectile.vx;
    var vy = projectile.vy;

    // Vx arrow (horizontal, green)
    if (Math.abs(vx) > 0.5) {
      var endX = pt.cx + vx * arrowScale;
      p.stroke(GREEN[0], GREEN[1], GREEN[2], 200);
      p.strokeWeight(2);
      p.line(pt.cx, pt.cy, endX, pt.cy);

      // Arrowhead
      var dir = Math.sign(vx);
      p.fill(GREEN[0], GREEN[1], GREEN[2], 200);
      p.noStroke();
      p.triangle(
        endX, pt.cy,
        endX - dir * 7, pt.cy - 3,
        endX - dir * 7, pt.cy + 3
      );

      // Label
      p.textFont('monospace');
      p.textSize(8);
      p.textAlign(p.CENTER, p.TOP);
      p.fill(GREEN[0], GREEN[1], GREEN[2]);
      p.text('Vx=' + PhysicsUtils.formatNum(vx, 1), (pt.cx + endX) / 2, pt.cy + 6);
    }

    // Vy arrow (vertical, red) - note: canvas y is flipped
    if (Math.abs(vy) > 0.5) {
      var endY = pt.cy - vy * arrowScale; // negative because canvas y is down
      p.stroke(RED[0], RED[1], RED[2], 200);
      p.strokeWeight(2);
      p.line(pt.cx, pt.cy, pt.cx, endY);

      // Arrowhead
      var dirY = vy > 0 ? -1 : 1; // canvas direction
      p.fill(RED[0], RED[1], RED[2], 200);
      p.noStroke();
      p.triangle(
        pt.cx, endY,
        pt.cx - 3, endY - dirY * 7,
        pt.cx + 3, endY - dirY * 7
      );

      // Label
      p.textFont('monospace');
      p.textSize(8);
      p.textAlign(p.LEFT, p.CENTER);
      p.fill(RED[0], RED[1], RED[2]);
      p.text('Vy=' + PhysicsUtils.formatNum(vy, 1), pt.cx + 8, (pt.cy + endY) / 2);
    }
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
  var trails = [];
  var currentTrail = [];
  var projX = 0;
  var projY = 0;
  var vx = 0;
  var vy = 0;
  var active = false;
  var timer = 0;
  var gravity = 9.8;
  var dt = 0.05;
  var cannonX, cannonY, pxScale;
  var trailIdx = 0;
  var angles = [30, 45, 60, 40, 55];

  p.setup = function () {
    var container = p.canvas.parentElement;
    p.createCanvas(container.clientWidth, container.clientHeight);
    p.frameRate(60);

    cannonX = 20;
    cannonY = p.height - 15;
    pxScale = (p.width - 40) / 80;

    launchNext();
  };

  function launchNext() {
    if (currentTrail.length > 1) {
      trails.push(currentTrail.slice());
      if (trails.length > 4) trails.shift();
    }
    currentTrail = [];

    var angle = angles[trailIdx % angles.length];
    trailIdx++;
    var angleRad = angle * Math.PI / 180;
    var vel = 22;

    projX = 0;
    projY = 0;
    vx = vel * Math.cos(angleRad);
    vy = vel * Math.sin(angleRad);
    active = true;
    timer = 0;
  }

  p.draw = function () {
    p.background(13, 17, 23);

    // Ground
    p.stroke(48, 54, 61);
    p.strokeWeight(1);
    p.line(10, cannonY, p.width - 10, cannonY);

    // Ghost trails
    for (var g = 0; g < trails.length; g++) {
      var alpha = 20 + g * 8;
      p.noFill();
      p.stroke(247, 120, 186, alpha);
      p.strokeWeight(1);
      p.beginShape();
      for (var i = 0; i < trails[g].length; i++) {
        p.vertex(
          cannonX + trails[g][i].x * pxScale,
          cannonY - trails[g][i].y * pxScale
        );
      }
      p.endShape();
    }

    if (active) {
      vy -= gravity * dt;
      projX += vx * dt;
      projY += vy * dt;
      timer += dt;

      if (timer > 0.1 && Math.floor(timer / 0.15) > currentTrail.length) {
        currentTrail.push({ x: projX, y: projY });
      }

      if (projY <= 0 && timer > 0.1) {
        projY = 0;
        active = false;
        currentTrail.push({ x: projX, y: 0 });
        setTimeout(function () { launchNext(); }, 800);
      }

      // Current trail
      p.noFill();
      p.stroke(247, 120, 186, 120);
      p.strokeWeight(1);
      p.beginShape();
      for (var i = 0; i < currentTrail.length; i++) {
        p.vertex(
          cannonX + currentTrail[i].x * pxScale,
          cannonY - currentTrail[i].y * pxScale
        );
      }
      p.endShape();

      // Projectile dot
      var cx = cannonX + projX * pxScale;
      var cy = cannonY - projY * pxScale;
      p.noStroke();
      p.fill(247, 120, 186, 50);
      p.ellipse(cx, cy, 12, 12);
      p.fill(247, 120, 186);
      p.ellipse(cx, cy, 6, 6);
    }
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      cannonY = p.height - 15;
      pxScale = (p.width - 40) / 80;
    }
  };
}
