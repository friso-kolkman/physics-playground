/* Entropy - Particle Box Simulation */

function fullSketch(p) {
  var particles = [];
  var partitionExists = true;
  var paused = false;
  var partitionFlash = 0;

  // Config
  var particleCount = 80;
  var baseSpeed = 4;
  var particleRadius = 4;

  // Box dimensions (computed in setup)
  var boxX, boxY, boxW, boxH;
  var midX;

  // Colors
  var BG = [13, 17, 23];
  var BORDER = [48, 54, 61];
  var PARTITION_COLOR = [139, 148, 158];
  var ACCENT = [188, 140, 255];
  var ACCENT_RIGHT = [150, 120, 220];

  function createParticle(index) {
    var speed = baseSpeed * (0.6 + p.random() * 0.8);
    var angle = p.random(p.TWO_PI);
    return {
      x: boxX + p.random(particleRadius, boxW / 2 - particleRadius - 4),
      y: boxY + p.random(particleRadius, boxH - particleRadius),
      vx: p.cos(angle) * speed,
      vy: p.sin(angle) * speed,
      startedLeft: true
    };
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < particleCount; i++) {
      particles.push(createParticle(i));
    }
  }

  function resetSim() {
    partitionExists = true;
    partitionFlash = 0;
    var btn = document.getElementById('remove-partition-btn');
    if (btn) {
      btn.textContent = 'Remove Partition';
      btn.disabled = false;
      btn.classList.add('primary');
    }
    initParticles();
  }

  p.setup = function () {
    var container = p.canvas ? p.canvas.parentElement : p._userNode;
    var w = container.offsetWidth;
    var h = container.offsetHeight;
    p.createCanvas(w, h);

    // Box with padding
    var pad = Math.min(w, h) * 0.06;
    boxX = pad;
    boxY = pad;
    boxW = w - pad * 2;
    boxH = h - pad * 2;
    midX = boxX + boxW / 2;

    initParticles();
    bindControls();
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    var w = container.offsetWidth;
    var h = container.offsetHeight;
    if (w < 10 || h < 10) return;
    p.resizeCanvas(w, h);

    var pad = Math.min(w, h) * 0.06;
    boxX = pad;
    boxY = pad;
    boxW = w - pad * 2;
    boxH = h - pad * 2;
    midX = boxX + boxW / 2;
  };

  function bindControls() {
    // Particle count slider
    PhysicsUtils.bindSlider('particle-slider', 'particle-value', function (val) {
      particleCount = Math.round(val);
      resetSim();
    });

    // Speed slider
    PhysicsUtils.bindSlider('speed-slider', 'speed-value', function (val) {
      baseSpeed = val;
      // Scale existing particle velocities
      for (var i = 0; i < particles.length; i++) {
        var sp = p.sqrt(particles[i].vx * particles[i].vx + particles[i].vy * particles[i].vy);
        if (sp > 0.001) {
          var newSpeed = baseSpeed * (0.6 + p.random() * 0.8);
          var scale = newSpeed / sp;
          particles[i].vx *= scale;
          particles[i].vy *= scale;
        }
      }
    });

    // Remove partition button
    var removeBtn = document.getElementById('remove-partition-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        if (partitionExists) {
          partitionExists = false;
          partitionFlash = 20;
          removeBtn.textContent = 'Partition Removed';
          removeBtn.disabled = true;
          removeBtn.classList.remove('primary');
        }
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

  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    // Draw box border
    p.noFill();
    p.stroke(BORDER[0], BORDER[1], BORDER[2]);
    p.strokeWeight(2);
    p.rect(boxX, boxY, boxW, boxH, 4);

    // Draw L and R labels
    p.noStroke();
    p.fill(BORDER[0], BORDER[1], BORDER[2], 80);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(Math.min(boxH * 0.15, 40));
    p.textStyle(p.BOLD);
    p.text('L', boxX + boxW * 0.25, boxY + boxH * 0.5);
    p.text('R', boxX + boxW * 0.75, boxY + boxH * 0.5);
    p.textStyle(p.NORMAL);

    // Draw partition or flash
    if (partitionExists) {
      p.stroke(PARTITION_COLOR[0], PARTITION_COLOR[1], PARTITION_COLOR[2]);
      p.strokeWeight(3);
      // Dashed line effect
      var dashLen = 8;
      var gapLen = 6;
      var yStart = boxY;
      var yEnd = boxY + boxH;
      var yPos = yStart;
      while (yPos < yEnd) {
        var segEnd = Math.min(yPos + dashLen, yEnd);
        p.line(midX, yPos, midX, segEnd);
        yPos = segEnd + gapLen;
      }
      // Glow effect
      p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 40);
      p.strokeWeight(8);
      p.line(midX, boxY, midX, boxY + boxH);
    } else if (partitionFlash > 0) {
      // Flash animation when partition removed
      var alpha = p.map(partitionFlash, 0, 20, 0, 200);
      p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], alpha);
      p.strokeWeight(p.map(partitionFlash, 0, 20, 1, 12));
      p.line(midX, boxY, midX, boxY + boxH);
      if (!paused) partitionFlash--;
    }

    // Update and draw particles
    var leftCount = 0;
    var rightCount = 0;

    for (var i = 0; i < particles.length; i++) {
      var pt = particles[i];

      if (!paused) {
        pt.x += pt.vx;
        pt.y += pt.vy;

        // Wall collisions - left
        if (pt.x - particleRadius < boxX) {
          pt.x = boxX + particleRadius;
          pt.vx *= -1;
        }
        // Wall collisions - right
        if (pt.x + particleRadius > boxX + boxW) {
          pt.x = boxX + boxW - particleRadius;
          pt.vx *= -1;
        }
        // Wall collisions - top
        if (pt.y - particleRadius < boxY) {
          pt.y = boxY + particleRadius;
          pt.vy *= -1;
        }
        // Wall collisions - bottom
        if (pt.y + particleRadius > boxY + boxH) {
          pt.y = boxY + boxH - particleRadius;
          pt.vy *= -1;
        }

        // Clamp to box bounds (prevent tunneling through walls)
        pt.x = Math.max(boxX + particleRadius, Math.min(pt.x, boxX + boxW - particleRadius));
        pt.y = Math.max(boxY + particleRadius, Math.min(pt.y, boxY + boxH - particleRadius));

        // Partition collision — clamp to correct side to prevent tunneling
        if (partitionExists) {
          var wasLeft = pt.startedLeft;
          if (wasLeft) {
            // Should stay on left side
            if (pt.x + particleRadius > midX) {
              pt.x = midX - particleRadius;
              pt.vx = -Math.abs(pt.vx);
            }
          } else {
            // Should stay on right side (shouldn't happen with current init, but defensive)
            if (pt.x - particleRadius < midX) {
              pt.x = midX + particleRadius;
              pt.vx = Math.abs(pt.vx);
            }
          }
        }
      }

      // Count sides
      var onLeft = pt.x < midX;
      if (onLeft) {
        leftCount++;
      } else {
        rightCount++;
      }

      // Draw particle - brighter if still on starting side, slightly different shade if crossed
      p.noStroke();
      if (onLeft) {
        p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 210);
      } else {
        p.fill(ACCENT_RIGHT[0], ACCENT_RIGHT[1], ACCENT_RIGHT[2], 190);
      }
      p.circle(pt.x, pt.y, particleRadius * 2);
    }

    // Calculate entropy: S = -sum(p_i * ln(p_i)), normalized to 0-1
    var N = particles.length;
    var entropy = 0;
    if (N > 0) {
      var pLeft = leftCount / N;
      var pRight = rightCount / N;
      if (pLeft > 0 && pRight > 0) {
        entropy = -(pLeft * Math.log(pLeft) + pRight * Math.log(pRight));
      }
      // Normalize: max entropy = ln(2) when p=0.5 each
      entropy = entropy / Math.log(2);
    }

    // Update HTML stats
    var leftEl = document.getElementById('left-count');
    var rightEl = document.getElementById('right-count');
    var entropyEl = document.getElementById('entropy-value');
    if (leftEl) leftEl.textContent = leftCount;
    if (rightEl) rightEl.textContent = rightCount;
    if (entropyEl) entropyEl.textContent = entropy.toFixed(3);

    // Draw entropy bar on canvas
    var barX = boxX;
    var barY = boxY + boxH + 12;
    var barW = boxW;
    var barH = 6;
    if (barY + barH < p.height) {
      p.noStroke();
      p.fill(BORDER[0], BORDER[1], BORDER[2], 100);
      p.rect(barX, barY, barW, barH, 3);
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 180);
      p.rect(barX, barY, barW * entropy, barH, 3);

      // Label
      p.fill(PARTITION_COLOR[0], PARTITION_COLOR[1], PARTITION_COLOR[2]);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(10);
      p.text('Entropy: ' + entropy.toFixed(3), barX, barY + barH + 4);
    }
  };
}

/* Preview sketch for index card */
function previewSketch(p) {
  var particles = [];
  var partitionExists = true;
  var removeTimer = 120; // ~2 seconds at 60fps
  var loopTimer = 0;
  var loopDuration = 480; // ~8 seconds total loop

  var boxX, boxY, boxW, boxH, midX;
  var particleCount = 40;
  var baseSpeed = 3;
  var particleRadius = 3;

  var BG = [13, 17, 23];
  var BORDER = [48, 54, 61];
  var PARTITION_COLOR = [139, 148, 158];
  var ACCENT = [188, 140, 255];
  var ACCENT_RIGHT = [150, 120, 220];

  function createParticle() {
    var speed = baseSpeed * (0.6 + p.random() * 0.8);
    var angle = p.random(p.TWO_PI);
    return {
      x: boxX + p.random(particleRadius, boxW / 2 - particleRadius - 4),
      y: boxY + p.random(particleRadius, boxH - particleRadius),
      vx: p.cos(angle) * speed,
      vy: p.sin(angle) * speed
    };
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }
  }

  p.setup = function () {
    var container = p.canvas ? p.canvas.parentElement : p._userNode;
    var w = container.offsetWidth;
    var h = container.offsetHeight;
    p.createCanvas(w, h);

    var pad = Math.min(w, h) * 0.08;
    boxX = pad;
    boxY = pad;
    boxW = w - pad * 2;
    boxH = h - pad * 2;
    midX = boxX + boxW / 2;

    initParticles();
  };

  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    loopTimer++;

    // Auto-remove partition after 2 seconds
    if (loopTimer === removeTimer) {
      partitionExists = false;
    }

    // Reset loop
    if (loopTimer > loopDuration) {
      loopTimer = 0;
      partitionExists = true;
      initParticles();
    }

    // Draw box
    p.noFill();
    p.stroke(BORDER[0], BORDER[1], BORDER[2]);
    p.strokeWeight(1);
    p.rect(boxX, boxY, boxW, boxH, 3);

    // Draw partition
    if (partitionExists) {
      p.stroke(PARTITION_COLOR[0], PARTITION_COLOR[1], PARTITION_COLOR[2], 180);
      p.strokeWeight(2);
      p.line(midX, boxY, midX, boxY + boxH);
    }

    // Update and draw particles
    for (var i = 0; i < particles.length; i++) {
      var pt = particles[i];

      pt.x += pt.vx;
      pt.y += pt.vy;

      // Wall bounces
      if (pt.x - particleRadius < boxX) { pt.x = boxX + particleRadius; pt.vx *= -1; }
      if (pt.x + particleRadius > boxX + boxW) { pt.x = boxX + boxW - particleRadius; pt.vx *= -1; }
      if (pt.y - particleRadius < boxY) { pt.y = boxY + particleRadius; pt.vy *= -1; }
      if (pt.y + particleRadius > boxY + boxH) { pt.y = boxY + boxH - particleRadius; pt.vy *= -1; }

      // Partition bounce
      if (partitionExists) {
        if (pt.x + particleRadius > midX && pt.vx > 0 && pt.x - particleRadius < midX) {
          pt.x = midX - particleRadius;
          pt.vx *= -1;
        }
      }

      var onLeft = pt.x < midX;
      p.noStroke();
      if (onLeft) {
        p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 200);
      } else {
        p.fill(ACCENT_RIGHT[0], ACCENT_RIGHT[1], ACCENT_RIGHT[2], 180);
      }
      p.circle(pt.x, pt.y, particleRadius * 2);
    }
  };
}
