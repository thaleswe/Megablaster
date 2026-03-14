/* ============================================
   powers.js – Fire, Wind, Invisibility Logic
   ============================================ */

const Powers = (() => {
  // Minimum charge to fire (prevent accidental shots)
  const MIN_CHARGE_TO_FIRE = 0.15;

  function update(dt) {
    const ctrl = Controls.state;

    // ---- FIRE POWER (right hand) ----
    if (ctrl.rightHandClosed && !Player.fireCharging) {
      Player.startFireCharge();
    }
    if (ctrl.rightJustOpened && Player.fireCharging) {
      const charge = Player.releaseFireCharge();
      if (charge >= MIN_CHARGE_TO_FIRE) {
        fireFire(charge);
        Enemy.tryActivateShield(); // Try to shield when player fires
      }
    }
    // Strategic shield activation when holding high charge
    if (Player.fireCharging && Player.fireCharge > 0.8) {
      Enemy.tryActivateShield();
    }

    // ---- WIND POWER (left hand) ----
    if (ctrl.leftHandClosed && !Player.windCharging) {
      Player.startWindCharge();
    }
    if (ctrl.leftJustOpened && Player.windCharging) {
      const charge = Player.releaseWindCharge();
      if (charge >= MIN_CHARGE_TO_FIRE) {
        fireWind(charge);
        Enemy.tryActivateShield(); // Try to shield when player fires
      }
    }
    if (Player.windCharging && Player.windCharge > 0.8) {
      Enemy.tryActivateShield();
    }

    // ---- INVISIBILITY (both hands raised) ----
    if (ctrl.bothJustRaised) {
      const activated = Player.activateInvisibility();
      if (activated) {
        // Visual feedback
        HUD.showInvisibility();
      }
    }
  }

  function fireFire(chargeLevel) {
    const playerPos = GameCamera.getPlayerWorldPosition();
    const enemyPos = new THREE.Vector3(0, 1.5, 0);

    // Apply crosshair accuracy
    const accuracy = Crosshair.getAccuracy();
    const target = enemyPos.clone();

    // Add inaccuracy based on crosshair position at release
    if (accuracy < 0.8) {
      const offset = (1 - accuracy) * 2;
      target.x += (Math.random() - 0.5) * offset;
      target.y += (Math.random() - 0.5) * offset * 0.5;
      target.z += (Math.random() - 0.5) * offset;
    }

    Projectiles.spawnPlayerFire(GameScene.scene, playerPos, target, chargeLevel);
  }

  function fireWind(chargeLevel) {
    const playerPos = GameCamera.getPlayerWorldPosition();
    const enemyPos = new THREE.Vector3(0, 1.5, 0);

    const accuracy = Crosshair.getAccuracy();
    const target = enemyPos.clone();

    if (accuracy < 0.8) {
      const offset = (1 - accuracy) * 1.5;
      target.x += (Math.random() - 0.5) * offset;
      target.z += (Math.random() - 0.5) * offset;
    }

    Projectiles.spawnPlayerWind(GameScene.scene, playerPos, target, chargeLevel);
  }

  return {
    update,
  };
})();
