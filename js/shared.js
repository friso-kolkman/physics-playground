/* Physics Playground - Shared Utilities */
(function () {
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function mapRange(val, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMin;
    return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + (alpha !== undefined ? alpha : 1) + ")";
  }

  function bindSlider(sliderId, valueId, callback) {
    var slider = document.getElementById(sliderId);
    var display = document.getElementById(valueId);
    if (!slider) return;

    function update() {
      var val = parseFloat(slider.value);
      if (display) display.textContent = val;
      if (callback) callback(val);
    }

    slider.addEventListener("input", update);
    update(); // set initial value
  }

  function createSim(containerId, sketchFn) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.error("createSim: container #" + containerId + " not found");
      return null;
    }
    return new p5(sketchFn, container);
  }

  function formatNum(n, decimals) {
    if (decimals === undefined) decimals = 1;
    return Number(n).toFixed(decimals);
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, ms);
    };
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  window.PhysicsUtils = {
    clamp: clamp,
    lerp: lerp,
    mapRange: mapRange,
    hexToRgba: hexToRgba,
    bindSlider: bindSlider,
    createSim: createSim,
    formatNum: formatNum,
    debounce: debounce,
    isMobile: isMobile,
  };
})();
