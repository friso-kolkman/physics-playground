/* Conservation of Energy - Pendulum Simulation */

function fullSketch(p) {
  // --- State ---
  var angle = p.PI / 4;       // current angle (radians from vertical)
  var angVel = 0;              // angular velocity
  var angAcc = 0;              // angular acceleration

  var gravity = 9.8;           // m/s^2 (scaled for sim)
  var rodLength = 120;         // pixels
  var dampingOn = false;
  var dampingCoeff = 0.002;

  var pivotX, pivotY;
  var dragging = false;
  var paused = false;

  var trail = [];              // recent bob positions for trail effect
  var maxTrail = 25;

  var w, h;
  var mass = 1;                // normalized mass for energy calcs
  var gravScale = 0.001;       // scale gravity to make sim behave well

  // Energy values (updated each frame)
  var KE = 0, PE = 0, totalE = 0, maxE = 1;

  // --- Setup ---
  p.setup = function () {
    var container = p.canvas ? p.canvas.parentElement : p._userNode;
    w = container ? container.offsetWidth : 400;
    h = container ? container.offsetHeight : 400;
    p.createCanvas(w, h);
    p.pixelDensity(1);

    pivotX = w / 2;
    pivotY = h * 0.12;

    // Bind controls
    PhysicsUtils.bindSlider('gravity-slider', 'gravity-value', function (val) {
      gravity = val;
    });
    PhysicsUtils.bindSlider('length-slider', 'length-value', function (val) {
      rodLength = val;
    });

    var dampToggle = document.getElementById('damping-toggle');
    if (dampToggle) {
      dampToggle.addEventListener('change', function () {
        dampingOn = dampToggle.checked;
      });
    }

    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        angle = p.PI / 4;
        angVel = 0;
        trail = [];
        paused = false;
        var pb = document.getElementById('pause-btn');
        if (pb) pb.textContent = 'Pause';
      });
    }

    var pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.textContent = paused ? 'Play' : 'Pause';
      });
    }

    // Calculate initial max energy for bar normalization
    recalcMaxEnergy();
  };

  // --- Helpers ---
  function getBobPos() {
    var bx = pivotX + rodLength * p.sin(angle);
    var by = pivotY + rodLength * p.cos(angle);
    return { x: bx, y: by };
  }

  function recalcMaxEnergy() {
    // Max PE = mgh where h = rodLength (bob at horizontal = 90 degrees)
    // We normalize so that current total energy = maxE
    var h = rodLength - rodLength * p.cos(angle);
    var v = angVel * rodLength;
    KE = 0.5 * mass * v * v;
    PE = mass * gravity * gravScale * h * 100; // scale factor for visible bars
    totalE = KE + PE;
    maxE = Math.max(totalE, 0.001);
  }

  // --- Draw ---
  p.draw = function () {
    w = p.width;
    h = p.height;
    pivotX = w / 2;
    pivotY = h * 0.12;

    p.background(13, 17, 23);

    // --- Physics update ---
    if (!paused && !dragging) {
      var gScaled = gravity * gravScale;
      angAcc = (-gScaled / (rodLength * 0.01)) * p.sin(angle);
      if (dampingOn) {
        angAcc -= dampingCoeff * angVel;
      }
      var dt = 1/60;
      angVel += angAcc * dt;
      angle += angVel * dt;
    }

    var bob = getBobPos();

    // --- Energy calculations ---
    var heightFromBottom = rodLength - rodLength * p.cos(angle);
    var linearVel = angVel * rodLength;
    KE = 0.5 * mass * linearVel * linearVel;
    PE = mass * gravity * gravScale * heightFromBottom * 100;
    totalE = KE + PE;

    // Update max energy on first frame or after reset
    if (maxE < totalE) maxE = totalE;
    if (maxE < 0.001) maxE = 0.001;

    // --- Trail ---
    if (!paused && !dragging) {
      trail.push({ x: bob.x, y: bob.y });
      if (trail.length > maxTrail) trail.shift();
    }

    // Draw trail
    p.noStroke();
    for (var i = 0; i < trail.length; i++) {
      var alpha = p.map(i, 0, trail.length - 1, 10, 60);
      var sz = p.map(i, 0, trail.length - 1, 4, 12);
      p.fill(240, 136, 62, alpha);
      p.ellipse(trail[i].x, trail[i].y, sz);
    }

    // --- Floor reference line ---
    var floorY = pivotY + rodLength + 30;
    if (floorY < h - 10) {
      p.stroke(48, 54, 61);
      p.strokeWeight(1);
      p.drawingContext.setLineDash([4, 4]);
      p.line(pivotX - rodLength - 40, floorY, pivotX + rodLength + 40, floorY);
      p.drawingContext.setLineDash([]);

      // PE = 0 label
      p.noStroke();
      p.fill(139, 148, 158);
      p.textSize(10);
      p.textAlign(p.LEFT, p.TOP);
      p.text('PE = 0', pivotX + rodLength + 46, floorY - 5);
    }

    // --- Rod ---
    p.stroke(88, 98, 110);
    p.strokeWeight(2);
    p.line(pivotX, pivotY, bob.x, bob.y);

    // --- Pivot ---
    p.noStroke();
    p.fill(139, 148, 158);
    p.ellipse(pivotX, pivotY, 8);

    // --- Bob ---
    // Glow
    p.noStroke();
    var speed = p.abs(angVel);
    var glowAlpha = p.map(speed, 0, 0.15, 0, 80, true);
    if (glowAlpha > 5) {
      p.fill(240, 136, 62, glowAlpha);
      p.ellipse(bob.x, bob.y, 44);
    }
    // Main bob
    p.fill(240, 136, 62);
    p.ellipse(bob.x, bob.y, 22);
    // Highlight
    p.fill(255, 255, 255, 50);
    p.ellipse(bob.x - 3, bob.y - 3, 8);

    // --- Velocity vector arrow ---
    if (!dragging && !paused && p.abs(angVel) > 0.001) {
      // Tangential velocity direction
      var vScale = 60;
      var tangentX = p.cos(angle);
      var tangentY = -p.sin(angle);
      var vx = angVel * rodLength * tangentX * 0.05;
      var vy = angVel * rodLength * tangentY * 0.05;
      var mag = p.sqrt(vx * vx + vy * vy);
      if (mag > 2) {
        var arrowLen = p.min(mag * 8, 60);
        var nx = vx / mag;
        var ny = vy / mag;
        var ax = bob.x + nx * arrowLen;
        var ay = bob.y + ny * arrowLen;

        p.stroke(240, 136, 62, 180);
        p.strokeWeight(2);
        p.line(bob.x, bob.y, ax, ay);

        // Arrowhead
        var headLen = 6;
        var headAngle = p.atan2(ny, nx);
        p.line(ax, ay,
          ax - headLen * p.cos(headAngle - 0.4),
          ay - headLen * p.sin(headAngle - 0.4));
        p.line(ax, ay,
          ax - headLen * p.cos(headAngle + 0.4),
          ay - headLen * p.sin(headAngle + 0.4));
      }
    }

    // --- Angle readout while dragging ---
    if (dragging) {
      var deg = p.degrees(angle);
      p.noStroke();
      p.fill(139, 148, 158);
      p.textSize(12);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(PhysicsUtils.formatNum(deg, 1) + '\u00B0', bob.x, bob.y - 20);

      // Faint arc showing trajectory
      p.noFill();
      p.stroke(240, 136, 62, 40);
      p.strokeWeight(1);
      p.arc(pivotX, pivotY, rodLength * 2, rodLength * 2,
        p.HALF_PI - p.abs(angle), p.HALF_PI + p.abs(angle));
    }

    // --- On-canvas energy bars (right side) ---
    var barX = w - 60;
    var barW = 16;
    var barMaxH = h * 0.5;
    var barBottom = h - 30;

    // Labels
    p.noStroke();
    p.textSize(9);
    p.textAlign(p.CENTER, p.TOP);

    // KE bar
    var keH = maxE > 0 ? (KE / maxE) * barMaxH : 0;
    p.fill(240, 136, 62, 30);
    p.rect(barX - barW - 10, barBottom - barMaxH, barW, barMaxH, 3);
    p.fill(240, 136, 62);
    p.rect(barX - barW - 10, barBottom - keH, barW, keH, 3);
    p.fill(240, 136, 62);
    p.text('KE', barX - barW - 10 + barW / 2, barBottom + 4);

    // PE bar
    var peH = maxE > 0 ? (PE / maxE) * barMaxH : 0;
    p.fill(88, 166, 255, 30);
    p.rect(barX + 10, barBottom - barMaxH, barW, barMaxH, 3);
    p.fill(88, 166, 255);
    p.rect(barX + 10, barBottom - peH, barW, peH, 3);
    p.fill(88, 166, 255);
    p.text('PE', barX + 10 + barW / 2, barBottom + 4);

    // Total line
    var totalH = maxE > 0 ? (totalE / maxE) * barMaxH : 0;
    p.stroke(230, 237, 243, 60);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([3, 3]);
    p.line(barX - barW - 16, barBottom - totalH, barX + barW + 16, barBottom - totalH);
    p.drawingContext.setLineDash([]);

    p.noStroke();
    p.fill(230, 237, 243, 100);
    p.textSize(8);
    p.text('Total', barX, barBottom - totalH - 8);

    // --- Update HTML energy bars ---
    var keFill = document.getElementById('ke-bar-fill');
    var peFill = document.getElementById('pe-bar-fill');
    var totalFill = document.getElementById('total-bar-fill');
    var keVal = document.getElementById('ke-value');
    var peVal = document.getElementById('pe-value');
    var totalVal = document.getElementById('total-value');

    var kePct = maxE > 0 ? (KE / maxE) * 100 : 0;
    var pePct = maxE > 0 ? (PE / maxE) * 100 : 0;
    var totalPct = maxE > 0 ? (totalE / maxE) * 100 : 0;

    if (keFill) keFill.style.width = kePct + '%';
    if (peFill) peFill.style.width = pePct + '%';
    if (totalFill) totalFill.style.width = totalPct + '%';
    if (keVal) keVal.textContent = PhysicsUtils.formatNum(kePct, 1) + '%';
    if (peVal) peVal.textContent = PhysicsUtils.formatNum(pePct, 1) + '%';
    if (totalVal) totalVal.textContent = PhysicsUtils.formatNum(totalPct, 1) + '%';
  };

  // --- Mouse interaction ---
  p.mousePressed = function () {
    var bob = getBobPos();
    var d = p.dist(p.mouseX, p.mouseY, bob.x, bob.y);
    if (d < 30) {
      dragging = true;
      angVel = 0;
      trail = [];
    }
  };

  p.mouseDragged = function () {
    if (!dragging) return;
    var dx = p.mouseX - pivotX;
    var dy = p.mouseY - pivotY;
    angle = p.atan2(dx, dy);
    angle = PhysicsUtils.clamp(angle, -p.PI * 0.85, p.PI * 0.85);
    angVel = 0;
    recalcMaxEnergy();
  };

  p.mouseReleased = function () {
    if (dragging) {
      dragging = false;
      recalcMaxEnergy();
    }
  };

  // --- Touch support ---
  p.touchStarted = function () {
    if (p.touches.length > 0) {
      var bob = getBobPos();
      var tx = p.touches[0].x;
      var ty = p.touches[0].y;
      var d = p.dist(tx, ty, bob.x, bob.y);
      if (d < 40) {
        dragging = true;
        angVel = 0;
        trail = [];
        return false; // prevent default
      }
    }
  };

  p.touchMoved = function () {
    if (!dragging || p.touches.length === 0) return;
    var tx = p.touches[0].x;
    var ty = p.touches[0].y;
    var dx = tx - pivotX;
    var dy = ty - pivotY;
    angle = p.atan2(dx, dy);
    angle = PhysicsUtils.clamp(angle, -p.PI * 0.85, p.PI * 0.85);
    angVel = 0;
    recalcMaxEnergy();
    return false;
  };

  p.touchEnded = function () {
    if (dragging) {
      dragging = false;
      recalcMaxEnergy();
    }
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      w = container.offsetWidth;
      h = container.offsetHeight;
      if (w > 10 && h > 10) {
        p.resizeCanvas(w, h);
        pivotX = w / 2;
        pivotY = h * 0.12;
      }
    }
  };
}

/* Preview sketch for landing page card */
var previewSketch = (function () {
  var angle, aVel, length;
  return {
    setup: function (p, w, h) {
      angle = p.PI / 4;
      aVel = 0;
      length = h * 0.55;
    },
    draw: function (p, w, h) {
      length = h * 0.55;
      var originX = w / 2;
      var originY = h * 0.1;
      var grav = 0.4;

      var aAcc = (-grav / length) * p.sin(angle);
      aVel += aAcc;
      aVel *= 0.999;
      angle += aVel;

      var bobX = originX + length * p.sin(angle);
      var bobY = originY + length * p.cos(angle);

      // Rod
      p.stroke(58, 68, 80);
      p.strokeWeight(1);
      p.line(originX, originY, bobX, bobY);

      // Pivot
      p.noStroke();
      p.fill(139, 148, 158);
      p.ellipse(originX, originY, 5);

      // Bob - color shifts with speed
      var speed = p.abs(aVel);
      var r = p.map(speed, 0, 0.1, 50, 240);
      var g = p.map(speed, 0, 0.1, 136, 100);
      var b = p.map(speed, 0, 0.1, 62, 30);
      p.fill(r, g, b);
      p.ellipse(bobX, bobY, 14);
    }
  };
})();
