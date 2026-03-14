/* ============================================
   crosshair.js – Dynamic Aiming Reticle
   ============================================ */

const Crosshair = (() => {
  let element, innerEl, dotEl;
  let visible = false;
  let time = 0;
  let offsetX = 0; // Current pixel offset
  let offsetY = 0;
  let activeType = null; // 'fire' or 'wind'

  // Oscillation params
  const BASE_AMPLITUDE = 25;  // Max pixel movement
  const FREQ_X = 2.3;
  const FREQ_Y = 1.7;

  function init() {
    element = document.getElementById('crosshair');
    innerEl = document.getElementById('crosshairInner');
    dotEl = document.getElementById('crosshairDot');
  }

  function update(dt) {
    const isCharging = Player.fireCharging || Player.windCharging;

    if (isCharging && !visible) {
      show();
    } else if (!isCharging && visible) {
      hide();
    }

    if (!visible) return;

    time += dt;

    // Determine active power type
    if (Player.fireCharging) {
      activeType = 'fire';
      innerEl.className = 'fire';
    } else if (Player.windCharging) {
      activeType = 'wind';
      innerEl.className = 'wind';
    }

    // Get charge level (higher charge = more stable)
    const charge = Player.fireCharging ? Player.fireCharge : Player.windCharge;
    const stability = 0.3 + charge * 0.7; // 0.3 at start, 1.0 at full charge
    const amplitude = BASE_AMPLITUDE * (1 - stability * 0.8);

    // Lissajous pattern oscillation
    offsetX = Math.sin(time * FREQ_X * Math.PI * 2) * amplitude;
    offsetY = Math.sin(time * FREQ_Y * Math.PI * 2 + 0.5) * amplitude;

    // Apply position with transform
    element.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;

    // Size changes with charge
    const size = 40 + (1 - charge) * 20; // Shrinks as it charges
    innerEl.style.width = size + 'px';
    innerEl.style.height = size + 'px';
  }

  function show() {
    visible = true;
    element.style.display = 'block';
    time = Math.random() * 10; // Random start phase
  }

  function hide() {
    visible = false;
    element.style.display = 'none';
    innerEl.className = '';
    offsetX = 0;
    offsetY = 0;
  }

  function getAccuracy() {
    // Returns 0-1 based on how close crosshair is to center at this moment
    const maxDist = BASE_AMPLITUDE * 1.5;
    const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    return Math.max(0, 1 - dist / maxDist);
  }

  return {
    init,
    update,
    getAccuracy,
    get visible() { return visible; },
    get activeType() { return activeType; },
  };
})();
