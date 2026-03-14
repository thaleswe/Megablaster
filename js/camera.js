/* ============================================
   camera.js – Orbital Camera Controller
   ============================================ */

const GameCamera = (() => {
  let camera;
  let orbitAngle = 0;       // Current angle on orbit (radians)
  let targetAngle = 0;      // Target angle (for smooth lerp)
  let lookOffsetX = 0;      // Head-tilt horizontal offset
  let lookOffsetY = 0;      // Head-tilt vertical offset

  const ORBIT_RADIUS = 10;
  const CAMERA_HEIGHT = 3.5;
  const LOOK_TARGET_HEIGHT = 1.5;
  const LERP_SPEED = 4.0;
  const ORBIT_SPEED = 1.8;

  function init() {
    camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    updatePosition();
    return camera;
  }

  function updatePosition() {
    if (!camera) return;
    const x = Math.cos(orbitAngle) * ORBIT_RADIUS;
    const z = Math.sin(orbitAngle) * ORBIT_RADIUS;
    camera.position.set(x, CAMERA_HEIGHT, z);

    // Look at center with slight offsets for head tilt
    const lookX = lookOffsetX * 2;
    const lookY = LOOK_TARGET_HEIGHT + lookOffsetY * 1.5;
    camera.lookAt(lookX, lookY, 0);
  }

  function update(dt, leanAmount, headTiltX, headTiltY) {
    // leanAmount: -1 (left) to +1 (right), 0 = no lean
    // headTiltX/Y: small camera look offsets

    // Update orbit angle based on body lean
    targetAngle += leanAmount * ORBIT_SPEED * dt;

    // Smooth interpolation
    orbitAngle += (targetAngle - orbitAngle) * Math.min(1, LERP_SPEED * dt);

    // Head tilt offsets (smoothed)
    lookOffsetX += (headTiltX - lookOffsetX) * Math.min(1, 5 * dt);
    lookOffsetY += (headTiltY - lookOffsetY) * Math.min(1, 5 * dt);

    updatePosition();
  }

  function getPlayerWorldPosition() {
    const x = Math.cos(orbitAngle) * ORBIT_RADIUS;
    const z = Math.sin(orbitAngle) * ORBIT_RADIUS;
    return new THREE.Vector3(x, CAMERA_HEIGHT * 0.6, z);
  }

  function getOrbitAngle() {
    return orbitAngle;
  }

  function reset() {
    orbitAngle = 0;
    targetAngle = 0;
    lookOffsetX = 0;
    lookOffsetY = 0;
    updatePosition();
  }

  return {
    init,
    update,
    reset,
    getPlayerWorldPosition,
    getOrbitAngle,
    get camera() { return camera; },
    ORBIT_RADIUS,
  };
})();
