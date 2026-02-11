/* Physics Playground - Gravity & Orbits Simulation */

// Full simulation sketch (topic page)
function fullSketch(p) {
  var bodies = [];
  var paused = false;
  var showTrails = true;
  var G_BASE = 800;     // base gravitational constant (scaled for pixels)
  var G_MULT = 1.0;     // user-controlled multiplier
  var SOFTENING = 8;    // softening to prevent singularity
  var MAX_TRAIL = 120;
  var MERGE_DIST = 4;   // merge when surfaces overlap
  var dt = 0.016;       // ~60fps timestep

  // Interaction state
  var dragging = false;
  var dragStart = null;
  var dragCurrent = null;
  var placingMass = false;  // true when "Add Body" mode

  // Colors
  var BG = [13, 17, 23];
  var ACCENT = [63, 185, 80];

  // --- Helpers ---
  function getNewMass() {
    var el = document.getElementById('mass-slider');
    return el ? parseFloat(el.value) : 10;
  }

  function getTrails() {
    var el = document.getElementById('trails-toggle');
    return el ? el.checked : true;
  }

  function getGMult() {
    var el = document.getElementById('g-slider');
    return el ? parseFloat(el.value) : 1.0;
  }

  function bodyRadius(mass) {
    return Math.max(4, Math.sqrt(mass) * 3);
  }

  function bodyColor(mass) {
    // Brighter / more saturated for heavier masses
    var t = PhysicsUtils.clamp(mass / 50, 0, 1);
    var r = Math.round(PhysicsUtils.lerp(ACCENT[0], 200, t));
    var g = Math.round(PhysicsUtils.lerp(ACCENT[1], 255, t));
    var b = Math.round(PhysicsUtils.lerp(ACCENT[2], 140, t));
    return [r, g, b];
  }

  function createBody(x, y, vx, vy, mass) {
    return {
      x: x, y: y,
      vx: vx, vy: vy,
      ax: 0, ay: 0,
      mass: mass,
      radius: bodyRadius(mass),
      color: bodyColor(mass),
      trail: []
    };
  }

  function distSq(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    return dx * dx + dy * dy;
  }

  // --- Acceleration from gravity ---
  function computeAccelerations() {
    // Reset accelerations
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].ax = 0;
      bodies[i].ay = 0;
    }
    // O(n^2) pairwise
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        var a = bodies[i];
        var b = bodies[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var r2 = dx * dx + dy * dy + SOFTENING * SOFTENING;
        var r = Math.sqrt(r2);
        var F = (G_BASE * G_MULT * a.mass * b.mass) / r2;
        var fx = F * dx / r;
        var fy = F * dy / r;
        a.ax += fx / a.mass;
        a.ay += fy / a.mass;
        b.ax -= fx / b.mass;
        b.ay -= fy / b.mass;
      }
    }
  }

  // --- Velocity Verlet integration ---
  function integrate() {
    // Step 1: update positions using current velocity and acceleration
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      b.x += b.vx * dt + 0.5 * b.ax * dt * dt;
      b.y += b.vy * dt + 0.5 * b.ay * dt * dt;
      // Store old acceleration
      b._axOld = b.ax;
      b._ayOld = b.ay;
    }

    // Step 2: compute new accelerations from new positions
    computeAccelerations();

    // Step 3: update velocities using average of old and new acceleration
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      b.vx += 0.5 * (b._axOld + b.ax) * dt;
      b.vy += 0.5 * (b._ayOld + b.ay) * dt;
    }
  }

  // --- Merge overlapping bodies ---
  function mergeBodies() {
    var merged = true;
    while (merged) {
      merged = false;
      for (var i = 0; i < bodies.length && !merged; i++) {
        for (var j = i + 1; j < bodies.length && !merged; j++) {
          var a = bodies[i];
          var b = bodies[j];
          var d = Math.sqrt(distSq(a, b));
          if (d < a.radius + b.radius - MERGE_DIST) {
            // Conservation of momentum
            var totalMass = a.mass + b.mass;
            a.vx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
            a.vy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
            // Weighted center of mass position
            a.x = (a.x * a.mass + b.x * b.mass) / totalMass;
            a.y = (a.y * a.mass + b.y * b.mass) / totalMass;
            a.mass = totalMass;
            a.radius = bodyRadius(a.mass);
            a.color = bodyColor(a.mass);
            bodies.splice(j, 1);
            merged = true;
          }
        }
      }
    }
  }

  // --- Update trails ---
  function updateTrails() {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > MAX_TRAIL) b.trail.shift();
    }
  }

  // --- Presets ---
  function presetBinary() {
    bodies = [];
    var cx = p.width / 2;
    var cy = p.height / 2;
    var mass = 20;
    var sep = 100;
    // Circular orbit velocity for equal masses: v = sqrt(G*M / (4*r))
    var v = Math.sqrt(G_BASE * G_MULT * mass / (4 * sep));
    bodies.push(createBody(cx - sep / 2, cy, 0, -v, mass));
    bodies.push(createBody(cx + sep / 2, cy, 0, v, mass));
    computeAccelerations();
  }

  function presetSolarSystem() {
    bodies = [];
    var cx = p.width / 2;
    var cy = p.height / 2;
    var sunMass = 50;
    bodies.push(createBody(cx, cy, 0, 0, sunMass));

    var planets = [
      { r: 80,  m: 3 },
      { r: 130, m: 5 },
      { r: 190, m: 4 },
      { r: 260, m: 2 }
    ];

    for (var i = 0; i < planets.length; i++) {
      var pl = planets[i];
      // Circular orbit: v = sqrt(G * M_sun / r)
      var v = Math.sqrt(G_BASE * G_MULT * sunMass / pl.r);
      var angle = (Math.PI * 2 * i) / planets.length;
      var px = cx + Math.cos(angle) * pl.r;
      var py = cy + Math.sin(angle) * pl.r;
      // Velocity perpendicular to radius
      var vx = -Math.sin(angle) * v;
      var vy = Math.cos(angle) * v;
      bodies.push(createBody(px, py, vx, vy, pl.m));
    }
    computeAccelerations();
  }

  function presetFigure8() {
    bodies = [];
    var cx = p.width / 2;
    var cy = p.height / 2;
    var mass = 15;

    // Scaled figure-8 initial conditions (Chenciner & Montgomery)
    var scale = 120;
    var vScale = 180;

    var p1x = 0.97000436;
    var p1y = -0.24308753;
    var v3x = -0.93240737;
    var v3y = -0.86473146;

    bodies.push(createBody(
      cx + p1x * scale, cy + p1y * scale,
      -v3x * vScale * 0.5, -v3y * vScale * 0.5,
      mass
    ));
    bodies.push(createBody(
      cx - p1x * scale, cy - p1y * scale,
      -v3x * vScale * 0.5, -v3y * vScale * 0.5,
      mass
    ));
    bodies.push(createBody(
      cx, cy,
      v3x * vScale, v3y * vScale,
      mass
    ));
    computeAccelerations();
  }

  // --- Default demo ---
  function resetDemo() {
    presetBinary();
  }

  // --- Drawing ---
  function drawBody(b) {
    var r = b.radius;
    var c = b.color;

    // Glow
    p.noStroke();
    for (var g = 3; g >= 1; g--) {
      p.fill(c[0], c[1], c[2], 10 * g);
      p.ellipse(b.x, b.y, (r + g * 5) * 2, (r + g * 5) * 2);
    }

    // Body
    p.fill(c[0], c[1], c[2]);
    p.stroke(c[0], c[1], c[2], 180);
    p.strokeWeight(1);
    p.ellipse(b.x, b.y, r * 2, r * 2);

    // Mass label for larger bodies
    if (r > 8) {
      p.noStroke();
      p.fill(BG[0], BG[1], BG[2]);
      p.textFont('monospace');
      p.textSize(Math.max(8, r * 0.7));
      p.textAlign(p.CENTER, p.CENTER);
      p.text(Math.round(b.mass), b.x, b.y);
    }
  }

  function drawTrail(b) {
    if (!showTrails || b.trail.length < 2) return;
    p.noFill();
    for (var i = 1; i < b.trail.length; i++) {
      var alpha = p.map(i, 0, b.trail.length - 1, 5, 100);
      var weight = p.map(i, 0, b.trail.length - 1, 0.5, 2);
      p.stroke(b.color[0], b.color[1], b.color[2], alpha);
      p.strokeWeight(weight);
      p.line(b.trail[i - 1].x, b.trail[i - 1].y, b.trail[i].x, b.trail[i].y);
    }
  }

  function drawVelocityVector(b) {
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (speed < 1) return;
    var maxArrow = 40;
    var len = PhysicsUtils.clamp(speed * 0.15, 4, maxArrow);
    var angle = Math.atan2(b.vy, b.vx);
    var endX = b.x + Math.cos(angle) * (b.radius + len + 4);
    var endY = b.y + Math.sin(angle) * (b.radius + len + 4);
    var startX = b.x + Math.cos(angle) * (b.radius + 4);
    var startY = b.y + Math.sin(angle) * (b.radius + 4);

    p.stroke(200, 200, 200, 120);
    p.strokeWeight(1.5);
    p.line(startX, startY, endX, endY);

    // Arrowhead
    p.fill(200, 200, 200, 120);
    p.noStroke();
    var headLen = 5;
    p.triangle(
      endX, endY,
      endX - Math.cos(angle - 0.4) * headLen,
      endY - Math.sin(angle - 0.4) * headLen,
      endX - Math.cos(angle + 0.4) * headLen,
      endY - Math.sin(angle + 0.4) * headLen
    );
  }

  function drawDragArrow() {
    if (!dragging || !dragStart || !dragCurrent) return;
    var dx = dragCurrent.x - dragStart.x;
    var dy = dragCurrent.y - dragStart.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 3) return;

    // Arrow from placement point in the velocity direction
    var angle = Math.atan2(dy, dx);
    var endX = dragStart.x + dx;
    var endY = dragStart.y + dy;

    p.stroke(255, 200, 50, 200);
    p.strokeWeight(2);
    p.line(dragStart.x, dragStart.y, endX, endY);

    // Arrowhead
    p.fill(255, 200, 50, 200);
    p.noStroke();
    var hl = 8;
    p.triangle(
      endX, endY,
      endX - Math.cos(angle - 0.35) * hl,
      endY - Math.sin(angle - 0.35) * hl,
      endX - Math.cos(angle + 0.35) * hl,
      endY - Math.sin(angle + 0.35) * hl
    );

    // Speed label
    var speed = len * 2; // velocity scaling
    p.fill(255, 200, 50);
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.CENTER);
    p.text(PhysicsUtils.formatNum(speed, 0) + ' v', (dragStart.x + endX) / 2, (dragStart.y + endY) / 2 - 10);

    // Preview body at drag start
    p.noStroke();
    p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 100);
    var r = bodyRadius(getNewMass());
    p.ellipse(dragStart.x, dragStart.y, r * 2, r * 2);
  }

  function drawReadout() {
    var x = 12;
    var y = 20;
    var lineH = 14;

    p.noStroke();
    p.fill(BG[0], BG[1], BG[2], 180);
    p.rect(x - 4, y - 12, 160, lineH * 3 + 8, 4);

    p.fill(230, 237, 243);
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.LEFT);

    p.text('Bodies:  ' + bodies.length, x, y);
    p.text('G mult:  ' + PhysicsUtils.formatNum(G_MULT, 1) + 'x', x, y + lineH);

    var totalE = computeTotalEnergy();
    p.text('Energy:  ' + PhysicsUtils.formatNum(totalE, 0), x, y + lineH * 2);
  }

  function computeTotalEnergy() {
    var ke = 0;
    var pe = 0;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      ke += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
      for (var j = i + 1; j < bodies.length; j++) {
        var other = bodies[j];
        var d = Math.sqrt(distSq(b, other) + SOFTENING * SOFTENING);
        pe -= G_BASE * G_MULT * b.mass * other.mass / d;
      }
    }
    return ke + pe;
  }

  // --- Controls binding ---
  function bindControls() {
    PhysicsUtils.bindSlider('mass-slider', 'mass-value');
    PhysicsUtils.bindSlider('g-slider', 'g-value', function (val) {
      G_MULT = val;
    });

    var trailsToggle = document.getElementById('trails-toggle');
    if (trailsToggle) {
      trailsToggle.addEventListener('change', function () {
        showTrails = trailsToggle.checked;
        if (!showTrails) {
          for (var i = 0; i < bodies.length; i++) {
            bodies[i].trail = [];
          }
        }
      });
    }

    var addBtn = document.getElementById('add-body-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        // Place a body at random location with zero velocity
        var margin = 60;
        var x = p.random(margin, p.width - margin);
        var y = p.random(margin, p.height - margin);
        bodies.push(createBody(x, y, 0, 0, getNewMass()));
      });
    }

    var clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        bodies = [];
      });
    }

    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetDemo();
      });
    }

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

    // Presets
    var presetBinaryBtn = document.getElementById('preset-binary');
    if (presetBinaryBtn) {
      presetBinaryBtn.addEventListener('click', function () { presetBinary(); });
    }

    var presetSolarBtn = document.getElementById('preset-solar');
    if (presetSolarBtn) {
      presetSolarBtn.addEventListener('click', function () { presetSolarSystem(); });
    }

    var presetFig8Btn = document.getElementById('preset-figure8');
    if (presetFig8Btn) {
      presetFig8Btn.addEventListener('click', function () { presetFigure8(); });
    }
  }

  // --- p5.js lifecycle ---
  p.setup = function () {
    p.createCanvas(p.width || 100, p.height || 100);
    resizeToContainer();
    p.frameRate(60);
    bindControls();
    resetDemo();
  };

  function resizeToContainer() {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  }

  p.windowResized = function () {
    resizeToContainer();
  };

  // --- Mouse interaction ---
  p.mousePressed = function () {
    if (!isInsideCanvas()) return;
    dragStart = { x: p.mouseX, y: p.mouseY };
    dragCurrent = { x: p.mouseX, y: p.mouseY };
    dragging = true;
  };

  p.mouseDragged = function () {
    if (dragging) {
      dragCurrent = { x: p.mouseX, y: p.mouseY };
    }
  };

  p.mouseReleased = function () {
    if (!dragging || !dragStart) {
      dragging = false;
      return;
    }

    var dx = (dragCurrent ? dragCurrent.x : p.mouseX) - dragStart.x;
    var dy = (dragCurrent ? dragCurrent.y : p.mouseY) - dragStart.y;
    var vScale = 2.0; // pixels of drag to velocity units

    // Check if click was on an existing body (right-click delete alternative: just single click on body removes it)
    var clickedBody = -1;
    var dragLen = Math.sqrt(dx * dx + dy * dy);
    if (dragLen < 3) {
      // This was a click, not a drag. Check for body under cursor.
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var bDist = Math.sqrt((dragStart.x - b.x) * (dragStart.x - b.x) + (dragStart.y - b.y) * (dragStart.y - b.y));
        if (bDist < b.radius + 5) {
          clickedBody = i;
          break;
        }
      }
    }

    if (clickedBody >= 0 && dragLen < 3) {
      // Clicked on existing body: remove it
      bodies.splice(clickedBody, 1);
    } else if (isInsideCanvas()) {
      // Place new body with velocity from drag
      var vx = dx * vScale;
      var vy = dy * vScale;
      bodies.push(createBody(dragStart.x, dragStart.y, vx, vy, getNewMass()));
    }

    dragging = false;
    dragStart = null;
    dragCurrent = null;
  };

  function isInsideCanvas() {
    return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
  }

  // --- Draw loop ---
  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    // Update G_MULT from slider each frame
    G_MULT = getGMult();
    showTrails = getTrails();

    if (!paused && bodies.length > 0) {
      // Sub-stepping for stability
      var subSteps = 4;
      var subDt = dt / subSteps;
      var originalDt = dt;
      dt = subDt;
      for (var s = 0; s < subSteps; s++) {
        integrate();
        mergeBodies();
      }
      dt = originalDt;
      updateTrails();
    }

    // Draw trails first
    for (var i = 0; i < bodies.length; i++) {
      drawTrail(bodies[i]);
    }

    // Draw bodies
    for (var i = 0; i < bodies.length; i++) {
      drawBody(bodies[i]);
      drawVelocityVector(bodies[i]);
    }

    // Draw drag arrow (placing new body)
    drawDragArrow();

    // HUD
    drawReadout();

    // Pause indicator
    if (paused) {
      p.fill(230, 237, 243, 60);
      p.textFont('monospace');
      p.textSize(14);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('PAUSED', p.width / 2, p.height - 20);
    }
  };
}


// Preview sketch for landing page card
function previewSketch(p) {
  var bodies = [];
  var G = 800;
  var SOFTENING = 8;
  var dt = 0.016;
  var BG = [13, 17, 23];
  var ACCENT = [63, 185, 80];

  function bodyRadius(mass) {
    return Math.max(3, Math.sqrt(mass) * 2.5);
  }

  function createBody(x, y, vx, vy, mass) {
    return { x: x, y: y, vx: vx, vy: vy, ax: 0, ay: 0, mass: mass, trail: [] };
  }

  function computeAccel() {
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].ax = 0;
      bodies[i].ay = 0;
    }
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        var a = bodies[i];
        var b = bodies[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var r2 = dx * dx + dy * dy + SOFTENING * SOFTENING;
        var r = Math.sqrt(r2);
        var F = G * a.mass * b.mass / r2;
        var fx = F * dx / r;
        var fy = F * dy / r;
        a.ax += fx / a.mass;
        a.ay += fy / a.mass;
        b.ax -= fx / b.mass;
        b.ay -= fy / b.mass;
      }
    }
  }

  function integrate() {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      b.x += b.vx * dt + 0.5 * b.ax * dt * dt;
      b.y += b.vy * dt + 0.5 * b.ay * dt * dt;
      b._axOld = b.ax;
      b._ayOld = b.ay;
    }
    computeAccel();
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      b.vx += 0.5 * (b._axOld + b.ax) * dt;
      b.vy += 0.5 * (b._ayOld + b.ay) * dt;
    }
  }

  function setupBodies() {
    bodies = [];
    var cx = p.width / 2;
    var cy = p.height / 2;
    var mass = 15;
    var sep = Math.min(p.width, p.height) * 0.25;
    var v = Math.sqrt(G * mass / (4 * sep));

    // Three bodies in a triangle orbit
    var angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    for (var i = 0; i < 3; i++) {
      var a = angles[i];
      var px = cx + Math.cos(a) * sep * 0.6;
      var py = cy + Math.sin(a) * sep * 0.6;
      // Velocity perpendicular to radius
      var vx = -Math.sin(a) * v * 0.7;
      var vy = Math.cos(a) * v * 0.7;
      bodies.push(createBody(px, py, vx, vy, mass));
    }
    computeAccel();
  }

  p.setup = function () {
    var container = p.canvas.parentElement;
    p.createCanvas(container.clientWidth, container.clientHeight);
    p.frameRate(60);
    setupBodies();
  };

  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    // Sub-step
    var subSteps = 3;
    var sDt = dt / subSteps;
    var oDt = dt;
    dt = sDt;
    for (var s = 0; s < subSteps; s++) {
      integrate();
    }
    dt = oDt;

    // Trails
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 60) b.trail.shift();
    }

    // Draw trails
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.trail.length < 2) continue;
      p.noFill();
      for (var j = 1; j < b.trail.length; j++) {
        var alpha = p.map(j, 0, b.trail.length - 1, 5, 80);
        p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], alpha);
        p.strokeWeight(1);
        p.line(b.trail[j - 1].x, b.trail[j - 1].y, b.trail[j].x, b.trail[j].y);
      }
    }

    // Draw bodies
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      var r = bodyRadius(b.mass);

      // Glow
      p.noStroke();
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 15);
      p.ellipse(b.x, b.y, (r + 6) * 2, (r + 6) * 2);

      p.fill(ACCENT[0], ACCENT[1], ACCENT[2]);
      p.noStroke();
      p.ellipse(b.x, b.y, r * 2, r * 2);
    }

    // Reset if bodies escape too far
    var cx = p.width / 2;
    var cy = p.height / 2;
    var maxDist = Math.max(p.width, p.height) * 2;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      var d = Math.sqrt((b.x - cx) * (b.x - cx) + (b.y - cy) * (b.y - cy));
      if (d > maxDist) {
        setupBodies();
        break;
      }
    }
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      setupBodies();
    }
  };
}
