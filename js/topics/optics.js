/* Physics Playground - Optics & Light Simulation */

function fullSketch(p) {
  var paused = false;

  // --- State ---
  var opticType = 'convex-lens';
  var focalLength = 100;
  var lightMode = 'parallel';
  var rayCount = 5;
  var showPrincipal = true;

  // Object (draggable arrow on left side)
  var objectX, objectY, objectH;
  var draggingObject = false;
  var dragOffsetX = 0;

  // Optic position
  var lensX;
  var centerY;

  // Colors
  var BG = [13, 17, 23];
  var ACCENT = [86, 212, 221];
  var BORDER = [48, 54, 61];
  var GRID = [33, 38, 45];
  var TEXT_COL = [139, 148, 158];
  var RAY_COLOR = [86, 212, 221, 180];
  var VIRTUAL_COLOR = [86, 212, 221, 80];
  var PRINCIPAL_COLORS = [
    [255, 100, 100],   // Ray 1: red
    [100, 255, 100],   // Ray 2: green
    [100, 150, 255]    // Ray 3: blue
  ];
  var OBJECT_COLOR = [230, 237, 243];
  var IMAGE_REAL_COLOR = [86, 212, 221];
  var IMAGE_VIRTUAL_COLOR = [86, 212, 221, 120];

  // --- Setup ---
  p.setup = function () {
    var container = p.canvas ? p.canvas.parentElement : p._userNode;
    var w = container.offsetWidth;
    var h = container.offsetHeight;
    p.createCanvas(w, h);
    p.frameRate(60);

    centerY = h / 2;
    lensX = Math.round(w * 0.45);
    objectX = lensX - focalLength * 1.5;
    objectY = centerY;
    objectH = h * 0.25;

    bindControls();
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (!container) return;
    var w = container.offsetWidth;
    var h = container.offsetHeight;
    if (w < 10 || h < 10) return;
    p.resizeCanvas(w, h);
    centerY = h / 2;
    lensX = Math.round(w * 0.45);
    objectH = h * 0.25;
  };

  // --- Controls ---
  function bindControls() {
    // Focal length slider
    PhysicsUtils.bindSlider('focal-slider', 'focal-value', function (v) {
      focalLength = v;
    });

    // Ray count slider
    PhysicsUtils.bindSlider('ray-slider', 'ray-value', function (v) {
      rayCount = Math.round(v);
    });

    // Optic type radios (spans two mode-switch rows)
    var opticRadios = document.querySelectorAll('input[name="optic-type"]');
    for (var i = 0; i < opticRadios.length; i++) {
      opticRadios[i].addEventListener('change', function () {
        opticType = this.value;
      });
    }

    // Light mode radios
    var lightRadios = document.querySelectorAll('input[name="light-mode"]');
    for (var i = 0; i < lightRadios.length; i++) {
      lightRadios[i].addEventListener('change', function () {
        lightMode = this.value;
      });
    }

    // Principal rays toggle
    var principalToggle = document.getElementById('principal-toggle');
    if (principalToggle) {
      principalToggle.addEventListener('change', function () {
        showPrincipal = principalToggle.checked;
      });
    }

    // Reset button
    var resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        objectX = lensX - focalLength * 1.5;
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
  }

  // --- Mouse interaction (drag object) ---
  p.mousePressed = function () {
    var mx = p.mouseX;
    var my = p.mouseY;
    // Check if near the object arrow
    var objTop = centerY - objectH;
    if (mx > objectX - 20 && mx < objectX + 20 &&
        my > objTop - 10 && my < centerY + 10) {
      draggingObject = true;
      dragOffsetX = mx - objectX;
    }
  };

  p.mouseDragged = function () {
    if (draggingObject) {
      var newX = p.mouseX - dragOffsetX;
      // Clamp: object must stay left of optic (with margin)
      var minX = 30;
      var maxX = lensX - 20;
      objectX = PhysicsUtils.clamp(newX, minX, maxX);
    }
  };

  p.mouseReleased = function () {
    draggingObject = false;
  };

  // --- Helpers ---
  function isLens() {
    return opticType === 'convex-lens' || opticType === 'concave-lens';
  }

  function isMirror() {
    return opticType === 'concave-mirror' || opticType === 'convex-mirror';
  }

  function getSignedF() {
    // Sign convention: convex lens & concave mirror = positive f
    if (opticType === 'convex-lens' || opticType === 'concave-mirror') return focalLength;
    return -focalLength;
  }

  function drawDashedLine(x1, y1, x2, y2, dashLen, gapLen) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    var ux = dx / dist;
    var uy = dy / dist;
    var drawn = 0;
    var drawing = true;
    while (drawn < dist) {
      var segLen = drawing ? dashLen : gapLen;
      segLen = Math.min(segLen, dist - drawn);
      if (drawing) {
        p.line(
          x1 + ux * drawn, y1 + uy * drawn,
          x1 + ux * (drawn + segLen), y1 + uy * (drawn + segLen)
        );
      }
      drawn += segLen;
      drawing = !drawing;
    }
  }

  function drawArrow(x, baseY, tipY, col, dashed) {
    var headSize = 8;
    var dir = tipY < baseY ? -1 : 1;

    p.stroke(col[0], col[1], col[2], col[3] !== undefined ? col[3] : 255);
    p.strokeWeight(2.5);

    if (dashed) {
      drawDashedLine(x, baseY, x, tipY, 6, 4);
    } else {
      p.line(x, baseY, x, tipY);
    }

    // Arrowhead
    p.fill(col[0], col[1], col[2], col[3] !== undefined ? col[3] : 255);
    p.noStroke();
    p.triangle(
      x, tipY,
      x - headSize * 0.5, tipY - dir * headSize,
      x + headSize * 0.5, tipY - dir * headSize
    );
  }

  // --- Draw functions ---

  function drawOpticalAxis() {
    p.stroke(GRID[0], GRID[1], GRID[2]);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([6, 4]);
    p.line(0, centerY, p.width, centerY);
    p.drawingContext.setLineDash([]);
  }

  function drawOpticElement() {
    var h = p.height * 0.7;
    var topY = centerY - h / 2;
    var botY = centerY + h / 2;
    var curveDepth = 12;

    p.noFill();
    p.strokeWeight(2.5);
    p.stroke(ACCENT[0], ACCENT[1], ACCENT[2]);

    if (opticType === 'convex-lens') {
      // Two outward-bulging arcs
      p.beginShape();
      for (var t = 0; t <= 1; t += 0.02) {
        var y = topY + t * h;
        var bulge = curveDepth * Math.sin(t * Math.PI);
        p.vertex(lensX - bulge, y);
      }
      p.endShape();
      p.beginShape();
      for (var t = 0; t <= 1; t += 0.02) {
        var y = topY + t * h;
        var bulge = curveDepth * Math.sin(t * Math.PI);
        p.vertex(lensX + bulge, y);
      }
      p.endShape();
      // Vertical center line
      p.strokeWeight(1);
      p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 60);
      p.line(lensX, topY, lensX, botY);

    } else if (opticType === 'concave-lens') {
      // Two inward-caving arcs
      p.beginShape();
      for (var t = 0; t <= 1; t += 0.02) {
        var y = topY + t * h;
        var bulge = curveDepth * Math.sin(t * Math.PI);
        p.vertex(lensX + bulge, y);  // left edge caves inward (to right)
      }
      p.endShape();
      p.beginShape();
      for (var t = 0; t <= 1; t += 0.02) {
        var y = topY + t * h;
        var bulge = curveDepth * Math.sin(t * Math.PI);
        p.vertex(lensX - bulge, y);  // right edge caves inward (to left)
      }
      p.endShape();
      // Top and bottom caps
      p.strokeWeight(2);
      p.stroke(ACCENT[0], ACCENT[1], ACCENT[2]);
      p.line(lensX + curveDepth * 0, topY, lensX - curveDepth * 0, topY);
      p.line(lensX, topY - 4, lensX, topY);
      p.line(lensX, botY, lensX, botY + 4);

    } else if (opticType === 'concave-mirror') {
      // Curved line opening to the left (reflecting surface on left)
      p.beginShape();
      for (var t = 0; t <= 1; t += 0.02) {
        var y = topY + t * h;
        var curve = curveDepth * 1.5 * Math.sin(t * Math.PI);
        p.vertex(lensX + curve, y);
      }
      p.endShape();
      // Hatching on right side (non-reflecting)
      p.strokeWeight(1);
      p.stroke(BORDER[0], BORDER[1], BORDER[2]);
      for (var t = 0.05; t < 1; t += 0.06) {
        var y = topY + t * h;
        var curve = curveDepth * 1.5 * Math.sin(t * Math.PI);
        p.line(lensX + curve, y, lensX + curve + 6, y - 4);
      }

    } else if (opticType === 'convex-mirror') {
      // Curved line opening to the right (reflecting surface on left)
      p.beginShape();
      for (var t = 0; t <= 1; t += 0.02) {
        var y = topY + t * h;
        var curve = curveDepth * 1.5 * Math.sin(t * Math.PI);
        p.vertex(lensX - curve, y);
      }
      p.endShape();
      // Hatching on right side
      p.strokeWeight(1);
      p.stroke(BORDER[0], BORDER[1], BORDER[2]);
      for (var t = 0.05; t < 1; t += 0.06) {
        var y = topY + t * h;
        var curve = curveDepth * 1.5 * Math.sin(t * Math.PI);
        p.line(lensX - curve, y, lensX - curve + 6, y - 4);
      }
    }
  }

  function drawFocalPoints() {
    var f = focalLength;
    var dotR = 5;
    var smallR = 3;

    p.noStroke();
    p.textFont('monospace');
    p.textSize(11);
    p.textAlign(p.CENTER, p.TOP);

    if (isLens()) {
      // F on both sides
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 180);
      p.ellipse(lensX - f, centerY, dotR * 2);
      p.ellipse(lensX + f, centerY, dotR * 2);
      p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2]);
      p.text('F', lensX - f, centerY + 8);
      p.text('F', lensX + f, centerY + 8);

      // 2F on both sides
      if (lensX - 2 * f > 10) {
        p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 100);
        p.ellipse(lensX - 2 * f, centerY, smallR * 2);
        p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2], 150);
        p.text('2F', lensX - 2 * f, centerY + 8);
      }
      if (lensX + 2 * f < p.width - 10) {
        p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 100);
        p.ellipse(lensX + 2 * f, centerY, smallR * 2);
        p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2], 150);
        p.text('2F', lensX + 2 * f, centerY + 8);
      }
    } else {
      // Mirrors: F and C (2F) on object side only
      // Concave mirror: F in front (to the left)
      // Convex mirror: F behind (to the right)
      if (opticType === 'concave-mirror') {
        p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 180);
        p.ellipse(lensX - f, centerY, dotR * 2);
        p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2]);
        p.text('F', lensX - f, centerY + 8);

        if (lensX - 2 * f > 10) {
          p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 100);
          p.ellipse(lensX - 2 * f, centerY, smallR * 2);
          p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2], 150);
          p.text('C', lensX - 2 * f, centerY + 8);
        }
      } else {
        // Convex mirror: virtual F behind mirror
        p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 100);
        p.ellipse(lensX + f, centerY, dotR * 2);
        p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2], 100);
        p.text('F', lensX + f, centerY + 8);

        if (lensX + 2 * f < p.width - 10) {
          p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 60);
          p.ellipse(lensX + 2 * f, centerY, smallR * 2);
          p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2], 80);
          p.text('C', lensX + 2 * f, centerY + 8);
        }
      }
    }
  }

  function drawObjectArrow() {
    var tipY = centerY - objectH;
    drawArrow(objectX, centerY, tipY, OBJECT_COLOR, false);

    // Label
    p.noStroke();
    p.fill(OBJECT_COLOR[0], OBJECT_COLOR[1], OBJECT_COLOR[2], 180);
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text('Object', objectX, tipY - 6);

    // Drag hint
    if (!draggingObject) {
      p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2], 80);
      p.textSize(9);
      p.textAlign(p.CENTER, p.TOP);
      p.text('drag', objectX, centerY + 6);
    }
  }

  function computeImage() {
    var dObj = lensX - objectX; // object distance (always positive)
    var f = getSignedF();

    if (Math.abs(dObj) < 1) dObj = 1;

    // 1/f = 1/do + 1/di  =>  di = 1/(1/f - 1/do)
    var invDi = (1 / f) - (1 / dObj);
    var dImg;
    if (Math.abs(invDi) < 0.00001) {
      dImg = 99999; // image at infinity
    } else {
      dImg = 1 / invDi;
    }

    var mag = -dImg / dObj;

    // Image position
    var imgX;
    if (isLens()) {
      imgX = lensX + dImg;
    } else {
      // Mirrors: image on same side if di > 0 (real)
      imgX = lensX - dImg;
    }

    var isReal = dImg > 0;
    var imgH = objectH * Math.abs(mag);
    // Clamp image height for display
    imgH = Math.min(imgH, p.height * 0.8);

    return {
      dObj: dObj,
      dImg: dImg,
      mag: mag,
      imgX: imgX,
      imgH: imgH,
      isReal: isReal
    };
  }

  function drawImageArrow(img) {
    if (Math.abs(img.dImg) > 5000) return; // image at infinity

    var tipY;
    if (img.mag < 0) {
      // Inverted: arrow points down
      tipY = centerY + img.imgH;
    } else {
      // Upright: arrow points up
      tipY = centerY - img.imgH;
    }

    var col = img.isReal ? IMAGE_REAL_COLOR : IMAGE_VIRTUAL_COLOR;
    drawArrow(img.imgX, centerY, tipY, col, !img.isReal);

    // Label
    p.noStroke();
    p.fill(col[0], col[1], col[2], col[3] !== undefined ? col[3] : 200);
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.CENTER);
    if (img.mag < 0) {
      p.text('Image', img.imgX, centerY + img.imgH + 16);
    } else {
      p.text('Image', img.imgX, centerY - img.imgH - 10);
    }
  }

  // --- Ray tracing ---

  function drawRayLine(x1, y1, x2, y2, col, isVirtual) {
    p.stroke(col[0], col[1], col[2], isVirtual ? 70 : (col[3] !== undefined ? col[3] : 180));
    p.strokeWeight(isVirtual ? 1 : 1.5);
    if (isVirtual) {
      p.drawingContext.setLineDash([4, 4]);
    }
    p.line(x1, y1, x2, y2);
    if (isVirtual) {
      p.drawingContext.setLineDash([]);
    }
  }

  function clipToCanvas(x1, y1, x2, y2) {
    // Extend line from (x1,y1) in direction of (x2,y2) to canvas edge
    var dx = x2 - x1;
    var dy = y2 - y1;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: x2, y: y2 };

    var tMax = 10000;
    // Clip to right edge
    if (dx > 0) tMax = Math.min(tMax, (p.width - x1) / dx);
    // Clip to left edge
    if (dx < 0) tMax = Math.min(tMax, -x1 / dx);
    // Clip to bottom
    if (dy > 0) tMax = Math.min(tMax, (p.height - y1) / dy);
    // Clip to top
    if (dy < 0) tMax = Math.min(tMax, -y1 / dy);

    if (tMax < 0) tMax = 0;
    return { x: x1 + dx * tMax, y: y1 + dy * tMax };
  }

  function traceParallelRaysLens(img) {
    var f = getSignedF();

    for (var i = 0; i < rayCount; i++) {
      // Distribute rays evenly across lens height
      var frac = (i + 0.5) / rayCount;
      var h = (frac - 0.5) * p.height * 0.6;
      var hitY = centerY + h;

      // Incoming: horizontal from left
      drawRayLine(0, hitY, lensX, hitY, RAY_COLOR, false);

      // Outgoing: deflected by lens
      // A parallel ray at height h converges to focal point
      // After lens, ray goes from (lensX, hitY) toward (lensX + f, centerY) for convex
      // For concave lens (f < 0), ray diverges as if from (lensX + f, centerY) behind lens
      if (f > 0) {
        // Converging: aim at focal point on right
        var targetX = lensX + f;
        var targetY = centerY;
        var end = clipToCanvas(lensX, hitY, targetX, targetY);
        drawRayLine(lensX, hitY, end.x, end.y, RAY_COLOR, false);
      } else {
        // Diverging: ray goes as if coming from virtual focal point on left
        var vfX = lensX + f; // negative, so left of lens
        var vfY = centerY;
        // Direction from virtual focus to hit point
        var dx = lensX - vfX;
        var dy = hitY - vfY;
        var outX = lensX + dx;
        var outY = hitY + dy;
        var end = clipToCanvas(lensX, hitY, outX, outY);
        drawRayLine(lensX, hitY, end.x, end.y, RAY_COLOR, false);

        // Virtual extension backward to virtual focal point
        drawRayLine(lensX, hitY, vfX, vfY, VIRTUAL_COLOR, true);
      }
    }
  }

  function traceParallelRaysMirror(img) {
    var f = getSignedF();

    for (var i = 0; i < rayCount; i++) {
      var frac = (i + 0.5) / rayCount;
      var h = (frac - 0.5) * p.height * 0.6;
      var hitY = centerY + h;

      // Incoming: horizontal from left to mirror
      drawRayLine(0, hitY, lensX, hitY, RAY_COLOR, false);

      if (opticType === 'concave-mirror') {
        // Reflects through focal point (left side)
        var focalX = lensX - f;
        var dx = focalX - lensX;
        var dy = centerY - hitY;
        var end = clipToCanvas(lensX, hitY, focalX, centerY);
        drawRayLine(lensX, hitY, end.x, end.y, RAY_COLOR, false);
      } else {
        // Convex mirror: reflects as if from virtual focal point behind mirror
        var vfX = lensX - f; // f is negative, so vfX = lensX + |f| (behind mirror)
        // Reflected ray direction: as if coming from virtual focus
        var dx = lensX - vfX;
        var dy = hitY - centerY;
        var outX = lensX + dx;
        var outY = hitY + dy;
        var end = clipToCanvas(lensX, hitY, outX, outY);
        drawRayLine(lensX, hitY, end.x, end.y, RAY_COLOR, false);

        // Virtual extension behind mirror
        drawRayLine(lensX, hitY, vfX, centerY, VIRTUAL_COLOR, true);
      }
    }
  }

  function tracePointRaysLens(img) {
    var f = getSignedF();
    var objTipX = objectX;
    var objTipY = centerY - objectH;

    for (var i = 0; i < rayCount; i++) {
      var frac = (i + 0.5) / rayCount;
      var hitY = centerY + (frac - 0.5) * p.height * 0.6;

      // Incoming: from object tip to lens at hitY
      drawRayLine(objTipX, objTipY, lensX, hitY, RAY_COLOR, false);

      // Refraction through thin lens:
      // Incoming slope
      var inDx = lensX - objTipX;
      var inDy = hitY - objTipY;

      // Thin lens: outgoing ray satisfies the lens equation
      // At height h from axis, deflection = -h/f
      var h = hitY - centerY;
      // Outgoing slope: the ray is deflected such that
      // outgoing_angle = incoming_angle - h/f (paraxial approximation)
      // More precisely: out_dy/out_dx = in_dy/in_dx - h/(f * 1) for unit dx
      // We compute outgoing direction
      var outSlope = (inDy / inDx) - (h / f);

      if (img.isReal && img.dImg > 0 && Math.abs(img.dImg) < 5000) {
        // Draw to image point
        var imgTipY = (img.mag < 0) ? centerY + img.imgH : centerY - img.imgH;
        drawRayLine(lensX, hitY, img.imgX, imgTipY, RAY_COLOR, false);
      } else if (!img.isReal) {
        // Diverging: draw outgoing ray to canvas edge
        var outDx = 100;
        var outDy = outSlope * 100;
        var end = clipToCanvas(lensX, hitY, lensX + outDx, hitY + outDy);
        drawRayLine(lensX, hitY, end.x, end.y, RAY_COLOR, false);

        // Virtual extension backward to virtual image
        if (Math.abs(img.dImg) < 5000) {
          var imgTipY = (img.mag < 0) ? centerY + img.imgH : centerY - img.imgH;
          drawRayLine(lensX, hitY, img.imgX, imgTipY, VIRTUAL_COLOR, true);
        }
      } else {
        // Image at infinity
        var outDx = 100;
        var outDy = outSlope * 100;
        var end = clipToCanvas(lensX, hitY, lensX + outDx, hitY + outDy);
        drawRayLine(lensX, hitY, end.x, end.y, RAY_COLOR, false);
      }
    }
  }

  function tracePointRaysMirror(img) {
    var f = getSignedF();
    var objTipX = objectX;
    var objTipY = centerY - objectH;

    for (var i = 0; i < rayCount; i++) {
      var frac = (i + 0.5) / rayCount;
      var hitY = centerY + (frac - 0.5) * p.height * 0.6;

      // Incoming ray from object tip to mirror
      drawRayLine(objTipX, objTipY, lensX, hitY, RAY_COLOR, false);

      var h = hitY - centerY;
      var inDx = lensX - objTipX;
      var inDy = hitY - objTipY;

      // Mirror reflection with thin-mirror equation
      // Reflected ray slope changes by 2h/R = h/f
      var outSlope = -(inDy / inDx) - (h / f);

      if (img.isReal && Math.abs(img.dImg) < 5000) {
        var imgTipY = (img.mag < 0) ? centerY + img.imgH : centerY - img.imgH;
        drawRayLine(lensX, hitY, img.imgX, imgTipY, RAY_COLOR, false);
      } else if (!img.isReal) {
        // Diverging reflected ray
        var outDx = -100; // reflects back to left
        var outDy = outSlope * 100;
        var end = clipToCanvas(lensX, hitY, lensX + outDx, hitY + outDy);
        drawRayLine(lensX, hitY, end.x, end.y, RAY_COLOR, false);

        // Virtual extension behind mirror
        if (Math.abs(img.dImg) < 5000) {
          var imgTipY = (img.mag < 0) ? centerY + img.imgH : centerY - img.imgH;
          drawRayLine(lensX, hitY, img.imgX, imgTipY, VIRTUAL_COLOR, true);
        }
      }
    }
  }

  function drawPrincipalRaysLens(img) {
    var f = getSignedF();
    var objTipX = objectX;
    var objTipY = centerY - objectH;
    var imgTipY;
    if (Math.abs(img.dImg) < 5000) {
      imgTipY = (img.mag < 0) ? centerY + img.imgH : centerY - img.imgH;
    }

    // Ray 1 (red): Parallel to axis -> through F after lens
    var col1 = PRINCIPAL_COLORS[0];
    p.strokeWeight(2);

    // Incoming: horizontal from object tip to lens
    drawRayLine(objTipX, objTipY, lensX, objTipY, col1, false);

    if (f > 0) {
      // Converging: after lens, toward focal point and beyond
      var focalPtX = lensX + f;
      var focalPtY = centerY;
      // Calculate slope from (lensX, objTipY) to (focalPtX, focalPtY)
      if (img.isReal && Math.abs(img.dImg) < 5000) {
        var end = clipToCanvas(lensX, objTipY, focalPtX, focalPtY);
        drawRayLine(lensX, objTipY, end.x, end.y, col1, false);
      } else {
        var end = clipToCanvas(lensX, objTipY, focalPtX, focalPtY);
        drawRayLine(lensX, objTipY, end.x, end.y, col1, false);
      }
    } else {
      // Diverging: outward, as if from virtual focus
      var vfX = lensX + f; // behind lens
      var vfY = centerY;
      var dx = lensX - vfX;
      var dy = objTipY - vfY;
      var end = clipToCanvas(lensX, objTipY, lensX + dx, objTipY + dy);
      drawRayLine(lensX, objTipY, end.x, end.y, col1, false);
      // Virtual extension
      drawRayLine(lensX, objTipY, vfX, vfY, [col1[0], col1[1], col1[2], 70], true);
    }

    // Ray 2 (green): Through center of lens -> continues straight
    var col2 = PRINCIPAL_COLORS[1];
    var dx = lensX - objTipX;
    var dy = (centerY - objTipY) * (lensX - objTipX) / (lensX - objTipX); // just centerY since passing through center
    // Ray goes from object tip through lens center
    var slopeCenter = (centerY - objTipY) / (lensX - objTipX);
    // Actually it goes through (lensX, centerY + slope * 0) -- no, through the center of the lens
    // The center ray passes through (lensX, hitY) where hitY is the intersection
    // For a thin lens, the center ray is undeviated
    // Slope from objTip to lens center:
    var hitY_center = objTipY + (lensX - objTipX) * ((centerY - objTipY) / (lensX - objTipX));
    // Hmm, that's just centerY if the ray aims at the center. Let me simplify:
    // The ray goes from objTip through the center of the lens at (lensX, centerY)
    // Wait -- for a thin lens, the "center ray" passes through the optical center.
    // The optical center is at (lensX, centerY). The ray hits at that point.
    // But objTipY != centerY, so the ray has a slope.
    var slope2 = (centerY - objTipY) / (lensX - objTipX);
    drawRayLine(objTipX, objTipY, lensX, centerY, col2, false);
    // Continues straight through
    var endX2 = lensX + 500;
    var endY2 = centerY + slope2 * 500;
    var end2 = clipToCanvas(lensX, centerY, endX2, endY2);
    drawRayLine(lensX, centerY, end2.x, end2.y, col2, false);

    // Ray 3 (blue): Through focal point on object side -> parallel after lens
    var col3 = PRINCIPAL_COLORS[2];
    if (f > 0) {
      // Converging lens: ray from object tip aimed toward F on object side
      var fObjX = lensX - f;
      var fObjY = centerY;
      // Slope from object tip toward F
      var slope3 = (fObjY - objTipY) / (fObjX - objTipX);
      // Where does this ray hit the lens?
      var hitY3 = objTipY + slope3 * (lensX - objTipX);
      drawRayLine(objTipX, objTipY, lensX, hitY3, col3, false);
      // After lens: exits parallel to axis
      var end3 = clipToCanvas(lensX, hitY3, lensX + 500, hitY3);
      drawRayLine(lensX, hitY3, end3.x, end3.y, col3, false);
    } else {
      // Diverging lens: ray aimed toward virtual F on far side
      var fFarX = lensX - f; // f is negative, so this is lensX + |f| (far side)
      var fFarY = centerY;
      var slope3 = (fFarY - objTipY) / (fFarX - objTipX);
      var hitY3 = objTipY + slope3 * (lensX - objTipX);
      drawRayLine(objTipX, objTipY, lensX, hitY3, col3, false);
      // After lens: exits parallel
      var end3 = clipToCanvas(lensX, hitY3, lensX + 500, hitY3);
      drawRayLine(lensX, hitY3, end3.x, end3.y, col3, false);
      // Virtual extension toward virtual focus
      drawRayLine(lensX, hitY3, fFarX, fFarY, [col3[0], col3[1], col3[2], 70], true);
    }
  }

  function drawPrincipalRaysMirror(img) {
    var f = getSignedF();
    var objTipX = objectX;
    var objTipY = centerY - objectH;

    // Ray 1 (red): Parallel to axis -> reflects through F (concave) or as if from F (convex)
    var col1 = PRINCIPAL_COLORS[0];
    drawRayLine(objTipX, objTipY, lensX, objTipY, col1, false);

    if (opticType === 'concave-mirror') {
      var fX = lensX - f;
      var end = clipToCanvas(lensX, objTipY, fX, centerY);
      drawRayLine(lensX, objTipY, end.x, end.y, col1, false);
    } else {
      // Convex: diverges as if from virtual F behind mirror
      var vfX = lensX + Math.abs(f);
      var dx = lensX - vfX;
      var dy = objTipY - centerY;
      var end = clipToCanvas(lensX, objTipY, lensX + dx, objTipY + dy);
      drawRayLine(lensX, objTipY, end.x, end.y, col1, false);
      drawRayLine(lensX, objTipY, vfX, centerY, [col1[0], col1[1], col1[2], 70], true);
    }

    // Ray 2 (green): Toward center of curvature -> reflects back on itself
    var col2 = PRINCIPAL_COLORS[1];
    var cX = (opticType === 'concave-mirror') ? lensX - 2 * f : lensX + 2 * Math.abs(f);

    if (opticType === 'concave-mirror') {
      // Aim at center C
      var slope = (centerY - objTipY) / (cX - objTipX);
      var hitY = objTipY + slope * (lensX - objTipX);
      drawRayLine(objTipX, objTipY, lensX, hitY, col2, false);
      // Reflects back on same path
      var end2 = clipToCanvas(lensX, hitY, objTipX, objTipY);
      drawRayLine(lensX, hitY, end2.x, end2.y, col2, false);
    } else {
      // Convex mirror: aim at virtual center behind mirror
      var slope = (centerY - objTipY) / (cX - objTipX);
      var hitY = objTipY + slope * (lensX - objTipX);
      drawRayLine(objTipX, objTipY, lensX, hitY, col2, false);
      // Reflects back
      var end2 = clipToCanvas(lensX, hitY, lensX - 100, hitY - slope * 100);
      drawRayLine(lensX, hitY, end2.x, end2.y, col2, false);
      drawRayLine(lensX, hitY, cX, centerY, [col2[0], col2[1], col2[2], 70], true);
    }

    // Ray 3 (blue): Through F -> reflects parallel
    var col3 = PRINCIPAL_COLORS[2];
    if (opticType === 'concave-mirror') {
      var fX = lensX - f;
      var slope = (centerY - objTipY) / (fX - objTipX);
      var hitY = objTipY + slope * (lensX - objTipX);
      drawRayLine(objTipX, objTipY, lensX, hitY, col3, false);
      // Reflects parallel to axis
      var end3 = clipToCanvas(lensX, hitY, lensX - 500, hitY);
      drawRayLine(lensX, hitY, end3.x, end3.y, col3, false);
    } else {
      // Convex mirror: aimed toward virtual F, reflects parallel
      var vfX = lensX + Math.abs(f);
      var slope = (centerY - objTipY) / (vfX - objTipX);
      var hitY = objTipY + slope * (lensX - objTipX);
      drawRayLine(objTipX, objTipY, lensX, hitY, col3, false);
      // Reflects parallel
      var end3 = clipToCanvas(lensX, hitY, lensX - 500, hitY);
      drawRayLine(lensX, hitY, end3.x, end3.y, col3, false);
      drawRayLine(lensX, hitY, vfX, centerY, [col3[0], col3[1], col3[2], 70], true);
    }
  }

  function updateReadouts(img) {
    var doEl = document.getElementById('do-val');
    var diEl = document.getElementById('di-val');
    var magEl = document.getElementById('mag-val');
    var typeEl = document.getElementById('image-type-val');

    if (doEl) doEl.textContent = img.dObj.toFixed(0) + ' px';

    if (Math.abs(img.dImg) > 5000) {
      if (diEl) diEl.textContent = '\u221E';
      if (magEl) magEl.textContent = '\u221E';
      if (typeEl) typeEl.textContent = 'at infinity';
    } else {
      if (diEl) diEl.textContent = img.dImg.toFixed(0) + ' px';
      if (magEl) magEl.textContent = img.mag.toFixed(2) + '\u00D7';
      if (typeEl) {
        var type = img.isReal ? 'Real' : 'Virtual';
        type += img.mag < 0 ? ', inverted' : ', upright';
        if (Math.abs(img.mag) > 1) {
          type += ', magnified';
        } else {
          type += ', diminished';
        }
        typeEl.textContent = type;
      }
    }
  }

  // --- Main draw ---
  p.draw = function () {
    p.background(BG[0], BG[1], BG[2]);

    drawOpticalAxis();
    drawFocalPoints();
    drawOpticElement();

    var img = computeImage();

    // Draw rays
    if (lightMode === 'parallel') {
      if (isLens()) {
        traceParallelRaysLens(img);
      } else {
        traceParallelRaysMirror(img);
      }
    } else {
      // Point source mode
      if (isLens()) {
        tracePointRaysLens(img);
      } else {
        tracePointRaysMirror(img);
      }

      // Principal rays
      if (showPrincipal) {
        if (isLens()) {
          drawPrincipalRaysLens(img);
        } else {
          drawPrincipalRaysMirror(img);
        }
      }

      // Draw image arrow
      drawImageArrow(img);
    }

    // Always draw object arrow (on top)
    drawObjectArrow();

    // Update readouts (only meaningful in point source mode)
    if (lightMode === 'point') {
      updateReadouts(img);
    } else {
      var doEl = document.getElementById('do-val');
      var diEl = document.getElementById('di-val');
      var magEl = document.getElementById('mag-val');
      var typeEl = document.getElementById('image-type-val');
      if (doEl) doEl.textContent = '\u2014';
      if (diEl) diEl.textContent = '\u2014';
      if (magEl) magEl.textContent = '\u2014';
      if (typeEl) typeEl.textContent = '\u2014';
    }

    // Optic type label
    p.noStroke();
    p.fill(TEXT_COL[0], TEXT_COL[1], TEXT_COL[2], 120);
    p.textFont('monospace');
    p.textSize(10);
    p.textAlign(p.LEFT, p.TOP);
    var typeLabel = opticType.replace('-', ' ');
    typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
    typeLabel = typeLabel.replace(' l', ' L').replace(' m', ' M');
    p.text(typeLabel, 8, 8);
  };
}


// ========================================
// PREVIEW SKETCH (landing page card)
// ========================================
function previewSketch(p) {
  var time = 0;

  p.setup = function () {
    var container = p.canvas ? p.canvas.parentElement : p._userNode;
    p.createCanvas(container.clientWidth, container.clientHeight);
    p.frameRate(60);
  };

  p.draw = function () {
    p.background(13, 17, 23);
    time += 1 / 60;

    var w = p.width;
    var h = p.height;
    var cx = w * 0.45;
    var cy = h / 2;
    var lensH = h * 0.7;
    var f = w * 0.2;

    // Draw lens
    p.noFill();
    p.stroke(86, 212, 221, 120);
    p.strokeWeight(2);
    var topY = cy - lensH / 2;
    p.beginShape();
    for (var t = 0; t <= 1; t += 0.03) {
      var y = topY + t * lensH;
      var bulge = 8 * Math.sin(t * Math.PI);
      p.vertex(cx - bulge, y);
    }
    p.endShape();
    p.beginShape();
    for (var t = 0; t <= 1; t += 0.03) {
      var y = topY + t * lensH;
      var bulge = 8 * Math.sin(t * Math.PI);
      p.vertex(cx + bulge, y);
    }
    p.endShape();

    // Optical axis
    p.stroke(33, 38, 45);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([3, 3]);
    p.line(0, cy, w, cy);
    p.drawingContext.setLineDash([]);

    // Animated rays: oscillating object distance
    var objDist = f * 1.5 + f * 0.8 * Math.sin(time * 0.5);
    var objX = cx - objDist;
    var raySpread = h * 0.25;

    for (var i = 0; i < 5; i++) {
      var frac = (i + 0.5) / 5;
      var startY = cy + (frac - 0.5) * raySpread;

      // Ray from object to lens
      p.stroke(86, 212, 221, 140);
      p.strokeWeight(1.2);
      p.line(objX, cy - h * 0.12, cx, startY);

      // After lens: converge toward image
      var di = 1 / (1 / f - 1 / objDist);
      if (di > 0 && di < w) {
        var imgX = cx + di;
        var mag = -di / objDist;
        var imgTipY = cy + h * 0.12 * mag;
        p.stroke(86, 212, 221, 100);
        p.line(cx, startY, Math.min(imgX, w), startY + (imgTipY - startY) * Math.min(1, (w - cx) / di));
      }
    }

    // Focal point dots
    p.noStroke();
    p.fill(86, 212, 221, 140);
    p.ellipse(cx - f, cy, 4);
    p.ellipse(cx + f, cy, 4);
  };

  p.windowResized = function () {
    var container = p.canvas.parentElement;
    if (container) {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    }
  };
}
