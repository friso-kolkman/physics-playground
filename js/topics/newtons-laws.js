/* Physics Playground - Newton's Laws Simulation */

// Full simulation sketch (topic page)
function fullSketch(p) {
  var block = {};
  var trail = [];
  var maxTrail = 40;
  var forceTimer = 0;
  var forceDuration = 30; // frames (~0.5s at 60fps)
  var activeForceDir = 0; // -1, 0, 1
  var paused = false;
  var floorY;
  var blockSize;
  var markers;

  // Physics constants
  var dt = 1 / 60;
  var mu = 0.3;
  var g = 9.81;
  var maxVelocity = 500;

  // Read controls
  function getMass() {
    var el = document.getElementById('mass-slider');
    return el ? parseFloat(el.value) : 5;
  }

  function getForce() {
    var el = document.getElementById('force-slider');
    return el ? parseFloat(el.value) : 30;
  }

  function hasFriction() {
    var el = document.getElementById('friction-toggle');
    return el ? el.checked : false;
  }

  function resetBlock() {
    block.x = p.width / 2;
    block.v = 0;
    block.a = 0;
    forceTimer = 0;
    activeForceDir = 0;
    trail = [];
  }

  p.setup = function () {
    p.createCanvas(p.width || 100, p.height || 100);
    resizeToContainer();
    p.frameRate(60);

    floorY = p.height * 0.78;
    blockSize = Math.max(30, p.height * 0.12);
    markers = buildMarkers();

    resetBlock();
    bindControls();
  };

  function resizeToContainer() {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      floorY = p.height * 0.78;
      blockSize = Math.max(30, p.height * 0.12);
      markers = buildMarkers();
    }
  }

  function buildMarkers() {
    var arr = [];
    var spacing = Math.max(40, p.width / 20);
    for (var x = 0; x < p.width; x += spacing) {
      arr.push(x);
    }
    return arr;
  }

  function bindControls() {
    // Slider displays
    PhysicsUtils.bindSlider('mass-slider', 'mass-value');
    PhysicsUtils.bindSlider('force-slider', 'force-value');

    // Buttons
    var applyRight = document.getElementById('apply-right');
    var applyLeft = document.getElementById('apply-left');
    var resetBtn = document.getElementById('reset-btn');
    var pauseBtn = document.getElementById('pause-btn');

    if (applyRight) {
      applyRight.addEventListener('click', function () {
        activeForceDir = 1;
        forceTimer = forceDuration;
      });
    }
    if (applyLeft) {
      applyLeft.addEventListener('click', function () {
        activeForceDir = -1;
        forceTimer = forceDuration;
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetBlock();
      });
    }
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

  p.windowResized = function () {
    resizeToContainer();
  };

  p.draw = function () {
    p.background(13, 17, 23);

    drawFloor();
    drawMarkers();

    if (!paused) {
      updatePhysics();
    }

    drawTrail();
    drawBlock();
    drawForceArrow();
    drawVelocityArrow();
    drawReadout();
  };

  function updatePhysics() {
    var mass = getMass();
    var force = getForce();
    var fNet = 0;

    // Applied force
    if (forceTimer > 0) {
      fNet += activeForceDir * force;
      forceTimer--;
      if (forceTimer <= 0) {
        activeForceDir = 0;
      }
    }

    // Friction
    if (hasFriction() && Math.abs(block.v) > 0.01) {
      var frictionForce = mu * mass * g;
      if (Math.abs(block.v) < frictionForce * dt / mass) {
        // Friction would reverse velocity - just stop
        block.v = 0;
      } else {
        fNet -= Math.sign(block.v) * frictionForce;
      }
    }

    // F = ma
    block.a = fNet / mass;
    block.v += block.a * dt;

    // Clamp velocity
    block.v = PhysicsUtils.clamp(block.v, -maxVelocity, maxVelocity);

    // Update position
    block.x += block.v * dt;

    // Bounce off edges
    var halfBlock = blockSize / 2;
    if (block.x - halfBlock < 0) {
      block.x = halfBlock;
      block.v = -block.v * 0.7;
    }
    if (block.x + halfBlock > p.width) {
      block.x = p.width - halfBlock;
      block.v = -block.v * 0.7;
    }

    // Trail
    if (p.frameCount % 3 === 0) {
      trail.push({ x: block.x, y: floorY - blockSize / 2 });
      if (trail.length > maxTrail) trail.shift();
    }
  }

  function drawFloor() {
    p.stroke(48, 54, 61);
    p.strokeWeight(2);
    p.line(0, floorY, p.width, floorY);

    // Subtle surface texture
    p.strokeWeight(1);
    p.stroke(48, 54, 61, 80);
    for (var i = 0; i < p.width; i += 6) {
      var h = p.random(1, 3);
      p.line(i, floorY, i, floorY + h);
    }
  }

  function drawMarkers() {
    if (!markers) return;
    p.textFont('monospace');
    p.textSize(9);
    p.textAlign(p.CENTER);
    p.noStroke();
    p.fill(110, 118, 129, 150);

    for (var i = 0; i < markers.length; i++) {
      var mx = markers[i];
      p.stroke(48, 54, 61, 60);
      p.strokeWeight(1);
      p.line(mx, floorY - 4, mx, floorY + 4);
      p.noStroke();
      p.text(Math.round(mx), mx, floorY + 16);
    }
  }

  function drawTrail() {
    for (var i = 0; i < trail.length; i++) {
      var alpha = p.map(i, 0, trail.length - 1, 20, 120);
      var size = p.map(i, 0, trail.length - 1, 3, 6);
      p.noStroke();
      p.fill(88, 166, 255, alpha);
      p.ellipse(trail[i].x, trail[i].y, size, size);
    }
  }

  function drawBlock() {
    var bx = block.x;
    var by = floorY - blockSize;

    // Glow
    p.noStroke();
    for (var gi = 3; gi >= 1; gi--) {
      p.fill(88, 166, 255, 8 * gi);
      p.rect(bx - blockSize / 2 - gi * 3, by - gi * 3, blockSize + gi * 6, blockSize + gi * 6, 8);
    }

    // Block
    p.fill(88, 166, 255);
    p.stroke(120, 190, 255);
    p.strokeWeight(1);
    p.rect(bx - blockSize / 2, by, blockSize, blockSize, 6);

    // Mass label
    p.noStroke();
    p.fill(13, 17, 23);
    p.textFont('monospace');
    p.textSize(Math.max(10, blockSize * 0.28));
    p.textAlign(p.CENTER, p.CENTER);
    p.text(getMass() + 'kg', bx, by + blockSize / 2);
  }

  function drawForceArrow() {
    if (forceTimer <= 0) return;

    var force = getForce();
    var dir = activeForceDir;
    var bx = block.x;
    var by = floorY - blockSize / 2;

    var arrowLen = p.map(force, 0, 100, 20, 120);
    var startX = bx + dir * (blockSize / 2 + 4);
    var endX = startX + dir * arrowLen;

    // Pulsing opacity
    var pulse = p.map(Math.sin(p.frameCount * 0.3), -1, 1, 180, 255);

    p.stroke(255, 140, 50, pulse);
    p.strokeWeight(3);
    p.line(startX, by, endX, by);

    // Arrowhead
    p.fill(255, 140, 50, pulse);
    p.noStroke();
    p.triangle(
      endX, by,
      endX - dir * 10, by - 6,
      endX - dir * 10, by + 6
    );

    // Force label
    p.fill(255, 140, 50);
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.CENTER);
    p.text(force + 'N', (startX + endX) / 2, by - 12);
  }

  function drawVelocityArrow() {
    if (Math.abs(block.v) < 0.5) return;

    var bx = block.x;
    var by = floorY - blockSize - 14;
    var dir = Math.sign(block.v);
    var arrowLen = p.map(Math.abs(block.v), 0, maxVelocity, 8, 80);

    var startX = bx;
    var endX = bx + dir * arrowLen;

    p.stroke(63, 185, 80, 200);
    p.strokeWeight(2);
    p.line(startX, by, endX, by);

    // Arrowhead
    p.fill(63, 185, 80, 200);
    p.noStroke();
    p.triangle(
      endX, by,
      endX - dir * 7, by - 4,
      endX - dir * 7, by + 4
    );

    // Velocity label
    p.fill(63, 185, 80);
    p.textFont('monospace');
    p.textSize(9);
    p.textAlign(p.CENTER);
    p.text(PhysicsUtils.formatNum(block.v, 1) + ' m/s', (startX + endX) / 2, by - 8);
  }

  function drawReadout() {
    var x = 12;
    var y = 20;
    var lineH = 16;

    p.noStroke();
    p.fill(13, 17, 23, 180);
    p.rect(x - 4, y - 14, 190, lineH * 5 + 8, 4);

    p.fill(230, 237, 243);
    p.textFont('monospace');
    p.textSize(11);
    p.textAlign(p.LEFT);

    p.text('Position:     ' + PhysicsUtils.formatNum(block.x, 1) + ' px', x, y);
    p.text('Velocity:     ' + PhysicsUtils.formatNum(block.v, 2) + ' m/s', x, y + lineH);
    p.text('Acceleration: ' + PhysicsUtils.formatNum(block.a, 2) + ' m/s\u00B2', x, y + lineH * 2);
    p.text('Mass:         ' + getMass() + ' kg', x, y + lineH * 3);

    var frictionStr = hasFriction() ? 'ON (\u03BC=' + mu + ')' : 'OFF';
    p.text('Friction:     ' + frictionStr, x, y + lineH * 4);
  }
}


// Preview sketch for landing page card
function previewSketch(p) {
  var block = {};
  var floorY;
  var blockSize;
  var forceTimer = 0;
  var forceDir = 1;
  var nextForce;

  p.setup = function () {
    var container = p.canvas.parentElement;
    p.createCanvas(container.clientWidth, container.clientHeight);
    p.frameRate(60);

    floorY = p.height * 0.78;
    blockSize = Math.max(16, p.height * 0.14);

    block.x = p.width / 2;
    block.v = 0;
    block.a = 0;

    nextForce = p.random(60, 180);
  };

  p.draw = function () {
    p.background(13, 17, 23);

    // Floor
    p.stroke(48, 54, 61);
    p.strokeWeight(1);
    p.line(0, floorY, p.width, floorY);

    // Auto-apply force periodically
    if (forceTimer <= 0 && p.frameCount % Math.floor(nextForce) === 0) {
      forceDir = p.random() > 0.5 ? 1 : -1;
      forceTimer = 20;
      nextForce = p.random(80, 200);
    }

    // Physics
    var fNet = 0;
    var mass = 5;
    var appliedForce = 40;

    if (forceTimer > 0) {
      fNet += forceDir * appliedForce;
      forceTimer--;
    }

    // Light friction
    if (Math.abs(block.v) > 0.1) {
      fNet -= Math.sign(block.v) * 0.3 * mass * 9.81 * 0.3;
    }

    block.a = fNet / mass;
    block.v += block.a * (1 / 60);
    block.v = Math.max(-200, Math.min(200, block.v));
    block.x += block.v * (1 / 60);

    // Bounce
    var half = blockSize / 2;
    if (block.x - half < 0) { block.x = half; block.v *= -0.6; }
    if (block.x + half > p.width) { block.x = p.width - half; block.v *= -0.6; }

    // Block
    p.noStroke();
    p.fill(88, 166, 255);
    p.rect(block.x - half, floorY - blockSize, blockSize, blockSize, 4);

    // Force arrow
    if (forceTimer > 0) {
      var arrowLen = 30;
      var sx = block.x + forceDir * (half + 2);
      var ex = sx + forceDir * arrowLen;
      var by = floorY - blockSize / 2;

      p.stroke(255, 140, 50);
      p.strokeWeight(2);
      p.line(sx, by, ex, by);

      p.fill(255, 140, 50);
      p.noStroke();
      p.triangle(ex, by, ex - forceDir * 6, by - 3, ex - forceDir * 6, by + 3);
    }

    // Velocity arrow
    if (Math.abs(block.v) > 2) {
      var vDir = Math.sign(block.v);
      var vLen = p.map(Math.abs(block.v), 0, 200, 4, 40);
      var vsx = block.x;
      var vex = block.x + vDir * vLen;
      var vy = floorY - blockSize - 8;

      p.stroke(63, 185, 80, 180);
      p.strokeWeight(1.5);
      p.line(vsx, vy, vex, vy);

      p.fill(63, 185, 80, 180);
      p.noStroke();
      p.triangle(vex, vy, vex - vDir * 5, vy - 3, vex - vDir * 5, vy + 3);
    }
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      floorY = p.height * 0.78;
      blockSize = Math.max(16, p.height * 0.14);
    }
  };
}
