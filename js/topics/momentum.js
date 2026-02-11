/* Physics Playground - Momentum & Collisions Simulation */

// Full simulation sketch (topic page)
function fullSketch(p) {
  // State machine
  var SETUP = 0;
  var RUNNING = 1;
  var COLLIDED = 2;
  var state = SETUP;

  var ballA = {};
  var ballB = {};
  var paused = false;
  var trackY;
  var collisionType = 'elastic';

  // Pre-collision values for readout
  var pBefore = 0;
  var keBefore = 0;
  var pAfter = null;
  var keAfter = null;

  // Collision flash effect
  var flashTimer = 0;
  var flashX = 0;
  var flashY = 0;
  var energyLost = 0;
  var heatParticles = [];

  var dt = 1 / 60;
  var pxPerMeter = 40; // pixels per m/s for velocity

  function getMassA() {
    var el = document.getElementById('mass-a-slider');
    return el ? parseFloat(el.value) : 5;
  }

  function getVelA() {
    var el = document.getElementById('vel-a-slider');
    return el ? parseFloat(el.value) : 3;
  }

  function getMassB() {
    var el = document.getElementById('mass-b-slider');
    return el ? parseFloat(el.value) : 5;
  }

  function getVelB() {
    var el = document.getElementById('vel-b-slider');
    return el ? parseFloat(el.value) : -3;
  }

  function ballRadius(mass) {
    return Math.sqrt(mass) * 8;
  }

  function resetSim() {
    state = SETUP;
    paused = false;

    var rA = ballRadius(getMassA());
    var rB = ballRadius(getMassB());

    ballA.x = p.width * 0.2;
    ballA.y = trackY;
    ballA.v = 0;
    ballA.mass = getMassA();
    ballA.r = rA;

    ballB.x = p.width * 0.8;
    ballB.y = trackY;
    ballB.v = 0;
    ballB.mass = getMassB();
    ballB.r = rB;

    pBefore = 0;
    keBefore = 0;
    pAfter = null;
    keAfter = null;
    flashTimer = 0;
    energyLost = 0;
    heatParticles = [];

    updateReadout();

    var pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.textContent = 'Pause';
  }

  function launchBalls() {
    if (state !== SETUP) return;

    ballA.mass = getMassA();
    ballA.v = getVelA();
    ballA.r = ballRadius(ballA.mass);

    ballB.mass = getMassB();
    ballB.v = getVelB();
    ballB.r = ballRadius(ballB.mass);

    pBefore = ballA.mass * ballA.v + ballB.mass * ballB.v;
    keBefore = 0.5 * ballA.mass * ballA.v * ballA.v + 0.5 * ballB.mass * ballB.v * ballB.v;
    pAfter = null;
    keAfter = null;

    state = RUNNING;
    updateReadout();
  }

  function updateReadout() {
    var elPB = document.getElementById('total-p-before');
    var elPA = document.getElementById('total-p-after');
    var elKEB = document.getElementById('total-ke-before');
    var elKEA = document.getElementById('total-ke-after');

    if (elPB) elPB.textContent = state === SETUP ? '--' : PhysicsUtils.formatNum(pBefore, 1) + ' kg\u00B7m/s';
    if (elPA) elPA.textContent = pAfter !== null ? PhysicsUtils.formatNum(pAfter, 1) + ' kg\u00B7m/s' : '--';
    if (elKEB) elKEB.textContent = state === SETUP ? '--' : PhysicsUtils.formatNum(keBefore, 1) + ' J';
    if (elKEA) elKEA.textContent = keAfter !== null ? PhysicsUtils.formatNum(keAfter, 1) + ' J' : '--';
  }

  function handleCollision() {
    var m1 = ballA.mass;
    var m2 = ballB.mass;
    var v1 = ballA.v;
    var v2 = ballB.v;

    if (collisionType === 'elastic') {
      ballA.v = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
      ballB.v = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
    } else {
      // Perfectly inelastic - stick together
      var vf = (m1 * v1 + m2 * v2) / (m1 + m2);
      ballA.v = vf;
      ballB.v = vf;
    }

    // Record after values
    pAfter = ballA.mass * ballA.v + ballB.mass * ballB.v;
    keAfter = 0.5 * ballA.mass * ballA.v * ballA.v + 0.5 * ballB.mass * ballB.v * ballB.v;
    energyLost = keBefore - keAfter;

    // Flash effect at collision point
    flashX = (ballA.x + ballB.x) / 2;
    flashY = trackY;
    flashTimer = 30;

    // Heat particles for inelastic
    if (collisionType === 'inelastic' && energyLost > 0) {
      for (var i = 0; i < 20; i++) {
        heatParticles.push({
          x: flashX,
          y: flashY,
          vx: p.random(-3, 3),
          vy: p.random(-4, -0.5),
          life: p.random(20, 50),
          maxLife: 50,
          size: p.random(2, 5)
        });
      }
    }

    state = COLLIDED;
    updateReadout();
  }

  p.setup = function () {
    p.createCanvas(p.width || 100, p.height || 100);
    resizeToContainer();
    p.frameRate(60);

    trackY = p.height * 0.5;
    resetSim();
    bindControls();
  };

  function resizeToContainer() {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      trackY = p.height * 0.5;
    }
  }

  function bindControls() {
    PhysicsUtils.bindSlider('mass-a-slider', 'mass-a-value', function () { if (state === SETUP) resetSim(); });
    PhysicsUtils.bindSlider('vel-a-slider', 'vel-a-value');
    PhysicsUtils.bindSlider('mass-b-slider', 'mass-b-value', function () { if (state === SETUP) resetSim(); });
    PhysicsUtils.bindSlider('vel-b-slider', 'vel-b-value');

    // Collision type toggle
    var toggleWrap = document.getElementById('collision-type');
    if (toggleWrap) {
      var btns = toggleWrap.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
          for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
          this.classList.add('active');
          collisionType = this.getAttribute('data-type');
        });
      }
    }

    var launchBtn = document.getElementById('launch-btn');
    var resetBtn = document.getElementById('reset-btn');
    var pauseBtn = document.getElementById('pause-btn');

    if (launchBtn) {
      launchBtn.addEventListener('click', function () {
        launchBalls();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetSim();
        if (paused) {
          paused = false;
          p.loop();
        }
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

    drawTrack();

    if (!paused) {
      updatePhysics();
    }

    drawMomentumVectors();
    drawTotalMomentum();
    drawKEBars();
    drawBall(ballA, 248, 81, 73, 'A');   // #f85149
    drawBall(ballB, 88, 166, 255, 'B');   // #58a6ff
    drawVelocityLabels();
    drawCollisionFlash();
    drawHeatParticles();

    // Inelastic: visually stick balls together
    if (state === COLLIDED && collisionType === 'inelastic') {
      drawStuckIndicator();
    }
  };

  function updatePhysics() {
    if (state === RUNNING || state === COLLIDED) {
      ballA.x += ballA.v * pxPerMeter * dt;
      ballB.x += ballB.v * pxPerMeter * dt;

      // Check collision (only in RUNNING state)
      if (state === RUNNING) {
        var dist = Math.abs(ballA.x - ballB.x);
        var minDist = ballA.r + ballB.r;
        if (dist <= minDist) {
          // Separate balls to avoid overlap
          var overlap = minDist - dist;
          var dir = ballA.x < ballB.x ? -1 : 1;
          ballA.x += dir * overlap / 2;
          ballB.x -= dir * overlap / 2;
          handleCollision();
        }
      }

      // For inelastic, keep balls together
      if (state === COLLIDED && collisionType === 'inelastic') {
        var cx = (ballA.x * ballA.mass + ballB.x * ballB.mass) / (ballA.mass + ballB.mass);
        var dir2 = ballA.x < ballB.x ? -1 : 1;
        ballA.x = cx + dir2 * ballA.r * 0.5;
        ballB.x = cx - dir2 * ballB.r * 0.5;
      }
    }

    // Update heat particles
    for (var i = heatParticles.length - 1; i >= 0; i--) {
      var hp = heatParticles[i];
      hp.x += hp.vx;
      hp.y += hp.vy;
      hp.vy += 0.08; // slight gravity
      hp.life--;
      if (hp.life <= 0) {
        heatParticles.splice(i, 1);
      }
    }

    // Decay flash
    if (flashTimer > 0) flashTimer--;
  }

  function drawTrack() {
    // Main track line
    p.stroke(48, 54, 61);
    p.strokeWeight(2);
    p.line(20, trackY, p.width - 20, trackY);

    // Tick marks
    p.strokeWeight(1);
    p.stroke(48, 54, 61, 100);
    var spacing = Math.max(30, p.width / 25);
    for (var x = 20; x < p.width - 20; x += spacing) {
      p.line(x, trackY - 4, x, trackY + 4);
    }
  }

  function drawBall(ball, r, g, b, label) {
    var radius = ball.r;

    // Glow
    p.noStroke();
    for (var i = 3; i >= 1; i--) {
      p.fill(r, g, b, 10 * i);
      p.ellipse(ball.x, ball.y, (radius + i * 4) * 2, (radius + i * 4) * 2);
    }

    // Ball
    p.fill(r, g, b);
    p.stroke(r + 30 > 255 ? 255 : r + 30, g + 30 > 255 ? 255 : g + 30, b + 30 > 255 ? 255 : b + 30);
    p.strokeWeight(1);
    p.ellipse(ball.x, ball.y, radius * 2, radius * 2);

    // Mass label
    p.noStroke();
    p.fill(13, 17, 23);
    p.textFont('monospace');
    p.textSize(Math.max(9, radius * 0.6));
    p.textAlign(p.CENTER, p.CENTER);
    p.text(ball.mass + 'kg', ball.x, ball.y);
  }

  function drawMomentumVectors() {
    if (state === SETUP) return;

    var arrowY = trackY + 50;
    var scale = 2; // pixels per unit momentum

    // Ball A momentum arrow
    var pA = ballA.mass * ballA.v;
    if (Math.abs(pA) > 0.1) {
      drawArrow(ballA.x, arrowY, pA * scale, 248, 81, 73, 180);
    }

    // Ball B momentum arrow
    var pB = ballB.mass * ballB.v;
    if (Math.abs(pB) > 0.1) {
      drawArrow(ballB.x, arrowY, pB * scale, 88, 166, 255, 180);
    }
  }

  function drawTotalMomentum() {
    if (state === SETUP) return;

    var totalP = ballA.mass * ballA.v + ballB.mass * ballB.v;
    var arrowY = trackY + 80;
    var cx = p.width / 2;
    var scale = 2;

    // Label
    p.noStroke();
    p.fill(230, 237, 243, 150);
    p.textFont('monospace');
    p.textSize(9);
    p.textAlign(p.CENTER);
    p.text('total p', cx, arrowY - 10);

    if (Math.abs(totalP) > 0.1) {
      drawArrow(cx, arrowY, totalP * scale, 230, 237, 243, 220);
    } else {
      // Draw a dot for zero momentum
      p.fill(230, 237, 243, 150);
      p.noStroke();
      p.ellipse(cx, arrowY, 6, 6);
    }
  }

  function drawArrow(x, y, length, r, g, b, alpha) {
    if (Math.abs(length) < 1) return;

    var dir = Math.sign(length);
    var len = Math.min(Math.abs(length), p.width * 0.35);
    var endX = x + dir * len;

    p.stroke(r, g, b, alpha);
    p.strokeWeight(2);
    p.line(x, y, endX, y);

    // Arrowhead
    p.fill(r, g, b, alpha);
    p.noStroke();
    p.triangle(
      endX, y,
      endX - dir * 8, y - 4,
      endX - dir * 8, y + 4
    );
  }

  function drawVelocityLabels() {
    if (state === SETUP) return;

    p.noStroke();
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.CENTER);

    // Ball A
    var labelA = state === COLLIDED ? "v\u2081'=" : 'v\u2081=';
    p.fill(248, 81, 73);
    p.text(labelA + PhysicsUtils.formatNum(ballA.v, 1) + ' m/s', ballA.x, ballA.y - ballA.r - 14);

    // Ball B
    var labelB = state === COLLIDED ? "v\u2082'=" : 'v\u2082=';
    p.fill(88, 166, 255);
    p.text(labelB + PhysicsUtils.formatNum(ballB.v, 1) + ' m/s', ballB.x, ballB.y - ballB.r - 14);
  }

  function drawKEBars() {
    if (state === SETUP) return;

    var barW = 80;
    var barH = 10;
    var x = p.width - barW - 20;
    var y = 20;
    var maxKE = Math.max(keBefore, 1);

    // KE Before
    p.noStroke();
    p.fill(230, 237, 243, 100);
    p.textFont('monospace');
    p.textSize(9);
    p.textAlign(p.LEFT);
    p.text('KE before', x, y);

    p.fill(48, 54, 61);
    p.rect(x, y + 4, barW, barH, 3);
    p.fill(88, 166, 255);
    var wBefore = (keBefore / maxKE) * barW;
    p.rect(x, y + 4, wBefore, barH, 3);

    // KE After
    if (keAfter !== null) {
      p.fill(230, 237, 243, 100);
      p.text('KE after', x, y + 28);

      p.fill(48, 54, 61);
      p.rect(x, y + 32, barW, barH, 3);

      var afterColor = collisionType === 'elastic' ? [88, 166, 255] : [248, 81, 73];
      p.fill(afterColor[0], afterColor[1], afterColor[2]);
      var wAfter = (keAfter / maxKE) * barW;
      p.rect(x, y + 32, wAfter, barH, 3);

      if (energyLost > 0.1) {
        p.fill(248, 81, 73, 150);
        p.textSize(8);
        p.text('-' + PhysicsUtils.formatNum(energyLost, 1) + 'J lost', x, y + 56);
      }
    }
  }

  function drawCollisionFlash() {
    if (flashTimer <= 0) return;

    var alpha = p.map(flashTimer, 0, 30, 0, 255);
    var size = p.map(flashTimer, 30, 0, 10, 60);

    p.noStroke();
    p.fill(255, 255, 255, alpha * 0.3);
    p.ellipse(flashX, flashY, size, size);
    p.fill(255, 220, 100, alpha * 0.5);
    p.ellipse(flashX, flashY, size * 0.6, size * 0.6);
  }

  function drawHeatParticles() {
    for (var i = 0; i < heatParticles.length; i++) {
      var hp = heatParticles[i];
      var alpha = p.map(hp.life, 0, hp.maxLife, 0, 255);
      p.noStroke();
      p.fill(255, 160, 50, alpha);
      p.ellipse(hp.x, hp.y, hp.size, hp.size);
    }
  }

  function drawStuckIndicator() {
    // Draw a small link between the balls
    var cx = (ballA.x + ballB.x) / 2;
    var cy = trackY;
    p.stroke(230, 237, 243, 120);
    p.strokeWeight(2);
    p.line(ballA.x + ballA.r * 0.8, cy, ballB.x - ballB.r * 0.8, cy);
  }
}


// Preview sketch for landing page card
function previewSketch(p) {
  var ballA = {};
  var ballB = {};
  var trackY;
  var state = 'moving'; // moving, collided, reset-wait
  var waitTimer = 0;
  var pxPerMeter = 35;
  var dt = 1 / 60;
  var flashTimer = 0;
  var flashX = 0;

  function resetBalls() {
    var massA = 5;
    var massB = 5;
    var rA = Math.sqrt(massA) * 6;
    var rB = Math.sqrt(massB) * 6;

    ballA.x = p.width * 0.2;
    ballA.y = trackY;
    ballA.v = p.random(2, 5);
    ballA.mass = massA;
    ballA.r = rA;

    ballB.x = p.width * 0.8;
    ballB.y = trackY;
    ballB.v = -p.random(2, 5);
    ballB.mass = massB;
    ballB.r = rB;

    state = 'moving';
    flashTimer = 0;
  }

  p.setup = function () {
    var container = p.canvas.parentElement;
    p.createCanvas(container.clientWidth, container.clientHeight);
    p.frameRate(60);

    trackY = p.height * 0.5;
    resetBalls();
  };

  p.draw = function () {
    p.background(13, 17, 23);

    // Track
    p.stroke(48, 54, 61);
    p.strokeWeight(1);
    p.line(10, trackY, p.width - 10, trackY);

    if (state === 'moving') {
      ballA.x += ballA.v * pxPerMeter * dt;
      ballB.x += ballB.v * pxPerMeter * dt;

      // Check collision
      var dist = Math.abs(ballA.x - ballB.x);
      if (dist <= ballA.r + ballB.r) {
        // Elastic collision
        var m1 = ballA.mass;
        var m2 = ballB.mass;
        var v1 = ballA.v;
        var v2 = ballB.v;
        ballA.v = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
        ballB.v = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);

        flashX = (ballA.x + ballB.x) / 2;
        flashTimer = 15;
        state = 'collided';
      }
    } else if (state === 'collided') {
      ballA.x += ballA.v * pxPerMeter * dt;
      ballB.x += ballB.v * pxPerMeter * dt;

      // Wait until both balls leave canvas area
      if (ballA.x < -ballA.r || ballA.x > p.width + ballA.r ||
          ballB.x < -ballB.r || ballB.x > p.width + ballB.r) {
        waitTimer = 40;
        state = 'reset-wait';
      }
    } else if (state === 'reset-wait') {
      waitTimer--;
      if (waitTimer <= 0) {
        resetBalls();
      }
    }

    // Flash
    if (flashTimer > 0) {
      var alpha = p.map(flashTimer, 0, 15, 0, 200);
      var size = p.map(flashTimer, 15, 0, 8, 40);
      p.noStroke();
      p.fill(255, 255, 255, alpha * 0.4);
      p.ellipse(flashX, trackY, size, size);
      flashTimer--;
    }

    // Ball A
    p.noStroke();
    p.fill(248, 81, 73);
    p.ellipse(ballA.x, ballA.y, ballA.r * 2, ballA.r * 2);

    // Ball B
    p.fill(88, 166, 255);
    p.ellipse(ballB.x, ballB.y, ballB.r * 2, ballB.r * 2);
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
      trackY = p.height * 0.5;
    }
  };
}
