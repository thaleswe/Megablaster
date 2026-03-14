/* ============================================
   player.js – Player State
   ============================================ */

const Player = (() => {
  let health = 100;
  const MAX_HEALTH = 100;

  // Invisibility
  let invisible = false;
  let invisTimer = 0;
  const INVIS_DURATION = 3;
  let invisCooldown = 0;
  const INVIS_COOLDOWN_TIME = 10;

  // Power charge states
  let fireCharge = 0;      // 0 to 1
  let windCharge = 0;      // 0 to 1
  let fireCharging = false;
  let windCharging = false;
  const CHARGE_SPEED = 0.5; // Full charge in 2 sec

  // Freeze debuff (ice mage special)
  let frozen = false;
  let frozenTimer = 0;
  const FREEZE_DURATION = 6;

  function reset() {
    health = MAX_HEALTH;
    invisible = false;
    invisTimer = 0;
    invisCooldown = 0;
    fireCharge = 0;
    windCharge = 0;
    fireCharging = false;
    windCharging = false;
    frozen = false;
    frozenTimer = 0;
  }

  function update(dt) {
    // Invisibility timer
    if (invisible) {
      invisTimer -= dt;
      if (invisTimer <= 0) {
        invisible = false;
        invisTimer = 0;
        invisCooldown = INVIS_COOLDOWN_TIME;
      }
    }

    // Invisibility cooldown
    if (invisCooldown > 0) {
      invisCooldown -= dt;
      if (invisCooldown < 0) invisCooldown = 0;
    }

    // Freeze timer
    if (frozen) {
      frozenTimer -= dt;
      if (frozenTimer <= 0) {
        frozen = false;
        frozenTimer = 0;
      }
    }

    // Charge speed modifier (halved when frozen)
    const chargeSpeed = frozen ? CHARGE_SPEED * 0.5 : CHARGE_SPEED;

    // Fire charge
    if (fireCharging) {
      fireCharge = Math.min(1, fireCharge + chargeSpeed * dt);
    }

    // Wind charge
    if (windCharging) {
      windCharge = Math.min(1, windCharge + chargeSpeed * dt);
    }
  }

  function takeDamage(amount) {
    if (invisible) return; // Can't take damage while invisible
    health -= amount;
    if (health < 0) health = 0;
  }

  function activateInvisibility() {
    if (invisCooldown > 0 || invisible) return false;
    invisible = true;
    invisTimer = INVIS_DURATION;
    return true;
  }

  function startFireCharge() {
    fireCharging = true;
  }

  function releaseFireCharge() {
    const charge = fireCharge;
    fireCharging = false;
    fireCharge = 0;
    return charge;
  }

  function startWindCharge() {
    windCharging = true;
  }

  function releaseWindCharge() {
    const charge = windCharge;
    windCharging = false;
    windCharge = 0;
    return charge;
  }

  return {
    reset,
    update,
    takeDamage,
    activateInvisibility,
    startFireCharge,
    releaseFireCharge,
    startWindCharge,
    releaseWindCharge,
    get health() { return health; },
    get maxHealth() { return MAX_HEALTH; },
    get isDead() { return health <= 0; },
    get invisible() { return invisible; },
    get invisTimer() { return invisTimer; },
    get invisCooldown() { return invisCooldown; },
    get fireCharge() { return fireCharge; },
    get windCharge() { return windCharge; },
    get fireCharging() { return fireCharging; },
    get windCharging() { return windCharging; },
    get frozen() { return frozen; },
    get frozenTimer() { return frozenTimer; },
    applyFreeze() {
      frozen = true;
      frozenTimer = FREEZE_DURATION;
    },
    INVIS_DURATION,
    INVIS_COOLDOWN_TIME,
    FREEZE_DURATION,
  };
})();
