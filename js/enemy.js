/* ============================================
   enemy.js – Mage Enemy
   ============================================ */

const Enemy = (() => {
  let group;
  let health = 200;
  const MAX_HEALTH = 200;
  let attackTimer = 0;
  let castAnimTimer = 0;
  let isCasting = false;
  let isDead = false;
  let isRaging = false;
  let rageTriggered = false;
  let deathTimer = 0;
  
  // Shield
  let shieldActive = false;
  let shieldCooldown = 15; // Set to 15s initial
  const SHIELD_DURATION = 5;
  const SHIELD_NORMAL_COOLDOWN = 20;
  const SHIELD_RAGE_COOLDOWN = 15;
  let shieldMesh;

  let currentStage = 'arena-das-chamas';

  let staffOrb, staffOrbLight;
  let bodyMesh, headMesh, hatMesh, brim, staffMesh;
  let hoverOffset = 0;
  let lastKnownPlayerPos = null; // Frozen position when player goes invisible

  function init(scene) {
    group = new THREE.Group();

    // Body - cone (robe)
    const bodyGeo = new THREE.ConeGeometry(0.8, 2.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x330044,
      roughness: 0.7,
      metalness: 0.3,
    });
    bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 1.2;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Head - sphere
    const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x664488,
      roughness: 0.5,
      metalness: 0.2,
    });
    headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 2.6;
    headMesh.castShadow = true;
    group.add(headMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 2.65, 0.28);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 2.65, 0.28);
    group.add(rightEye);

    // Hat - cone
    const hatGeo = new THREE.ConeGeometry(0.5, 1.2, 8);
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x220033,
      roughness: 0.6,
      metalness: 0.3,
    });
    hatMesh = new THREE.Mesh(hatGeo, hatMat);
    hatMesh.position.y = 3.4;
    hatMesh.rotation.z = 0.15;
    hatMesh.castShadow = true;
    group.add(hatMesh);

    // Hat brim
    const brimGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16);
    const brimMat = new THREE.MeshStandardMaterial({
      color: 0x220033,
      roughness: 0.6,
    });
    brim = new THREE.Mesh(brimGeo, brimMat);
    brim.position.y = 2.85;
    group.add(brim);

    // Staff
    const staffGeo = new THREE.CylinderGeometry(0.05, 0.06, 3, 8);
    const staffMat = new THREE.MeshStandardMaterial({
      color: 0x553311,
      roughness: 0.8,
    });
    staffMesh = new THREE.Mesh(staffGeo, staffMat);
    staffMesh.position.set(0.7, 1.5, 0);
    staffMesh.rotation.z = -0.15;
    staffMesh.castShadow = true;
    group.add(staffMesh);

    // Staff orb
    const orbGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.9,
    });
    staffOrb = new THREE.Mesh(orbGeo, orbMat);
    staffOrb.position.set(0.65, 3.1, 0);
    group.add(staffOrb);

    // Staff orb light
    staffOrbLight = new THREE.PointLight(0xff4400, 0.5, 6);
    staffOrbLight.position.copy(staffOrb.position);
    group.add(staffOrbLight);

    // Reflector Shield (hidden by default)
    // Clean, minimalist protective bubble
    const shieldGeo = new THREE.SphereGeometry(2.1, 32, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff, // Soft cyan
      transparent: true,
      opacity: 0.1, // Very subtle
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide // Shows only back layer giving it a rim-lit bubble look from inside
    });
    shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.y = 1.8;
    shieldMesh.visible = false;
    group.add(shieldMesh);

    group.position.set(0, 0, 0);
    scene.add(group);

    resetState();
    return group;
  }

  function resetState(stageId = 'arena-das-chamas') {
    currentStage = stageId;
    const isIce = currentStage === 'arena-congelante';

    health = MAX_HEALTH;
    attackTimer = 3;
    castAnimTimer = 0;
    isCasting = false;
    isDead = false;
    isRaging = false;
    rageTriggered = false;
    deathTimer = 0;
    shieldActive = false;
    shieldTimer = 0;
    shieldCooldown = 15;
    hoverOffset = 0;
    lastKnownPlayerPos = null;
    if (shieldMesh) shieldMesh.visible = false;
    if (group) {
      group.visible = true;
      group.scale.set(1, 1, 1);
      group.position.y = 0;
    }

    if (isIce) {
      if (bodyMesh) bodyMesh.material.color.setHex(0x1a4466); 
      if (headMesh) headMesh.material.color.setHex(0x5599bb); 
      if (hatMesh) hatMesh.material.color.setHex(0x0f3355);
      if (brim) brim.material.color.setHex(0x0f3355);
      if (staffOrb) staffOrb.material.color.setHex(0x22ccff);
      if (staffOrbLight) staffOrbLight.color.setHex(0x22ccff);
    } else {
      if (bodyMesh) bodyMesh.material.color.setHex(0x330044);
      if (headMesh) headMesh.material.color.setHex(0x664488);
      if (hatMesh) hatMesh.material.color.setHex(0x220033);
      if (brim) brim.material.color.setHex(0x220033);
      if (staffOrb) staffOrb.material.color.setHex(0xff4400);
      if (staffOrbLight) staffOrbLight.color.setHex(0xff4400);
    }
  }

  function update(dt, playerPos, playerInvisible) {
    if (isDead) {
      deathTimer += dt;
      // Sink and fade
      group.position.y -= dt * 0.5;
      group.scale.multiplyScalar(1 - dt * 0.3);
      return null;
    }

    // Face player (or last known position if invisible)
    if (playerInvisible) {
      // Freeze: keep looking at the last known position
      if (!lastKnownPlayerPos && playerPos) {
        lastKnownPlayerPos = playerPos.clone();
      }
      if (lastKnownPlayerPos) {
        const lookTarget = lastKnownPlayerPos.clone();
        lookTarget.y = 0;
        group.lookAt(lookTarget);
      }
    } else {
      // Normal: track the player and clear frozen position
      lastKnownPlayerPos = null;
      if (playerPos) {
        const lookTarget = playerPos.clone();
        lookTarget.y = 0;
        group.lookAt(lookTarget);
      }
    }

    // Shield timers
    if (shieldActive) {
      shieldTimer -= dt;
      // Elegant, subtle pulse
      shieldMesh.material.opacity = 0.08 + Math.sin(shieldTimer * 5) * 0.04;
      
      if (shieldTimer <= 0) {
        shieldActive = false;
        shieldMesh.visible = false;
        shieldCooldown = isRaging ? SHIELD_RAGE_COOLDOWN : SHIELD_NORMAL_COOLDOWN;
      }
    } else if (shieldCooldown > 0) {
      shieldCooldown -= dt;
    }

    // Hover animation
    hoverOffset += dt * (isRaging ? 4 : 2);
    group.position.y = Math.sin(hoverOffset) * (isRaging ? 0.2 : 0.1);

    const isIce = currentStage === 'arena-congelante';

    // Check rage mode trigger
    if (!isRaging && health <= MAX_HEALTH * 0.4) {
      isRaging = true;
      rageTriggered = true; // one-time flag for HUD notification
      // Visual: change body color
      if (bodyMesh) bodyMesh.material.color.setHex(isIce ? 0x0055ff : 0x660022);
    }

    // Rage visual: pulsing red glow
    if (isRaging) {
      const ragePulse = 0.5 + Math.sin(hoverOffset * 2) * 0.5;
      staffOrb.material.color.setHex(isIce ? 0x00ffff : 0xff0000);
      staffOrbLight.color.setHex(isIce ? 0x00ffff : 0xff0000);
      staffOrbLight.intensity = 1.0 + ragePulse * 2;
    } else {
      // Staff orb glow pulsing (normal)
      const orbPulse = 0.7 + Math.sin(hoverOffset * 3) * 0.3;
      staffOrb.material.opacity = orbPulse;
      staffOrbLight.intensity = 0.3 + orbPulse * 0.5;
    }

    // Casting animation
    if (isCasting) {
      castAnimTimer += dt;
      // Orb grows brighter during cast
      const castProgress = castAnimTimer / 1.0; // 1 sec cast time
      staffOrb.scale.setScalar(1 + castProgress * 1.5);
      staffOrbLight.intensity = 1 + castProgress * 3;
      staffOrb.material.color.setHex(isIce ? 0x88ffff : 0xff6600);

      if (castAnimTimer >= 1.0) {
        // Fire!
        isCasting = false;
        castAnimTimer = 0;
        staffOrb.scale.setScalar(1);
        staffOrb.material.color.setHex(isIce ? 0x00aaff : 0xff4400);

        // Return fire command with target position
        if (!playerInvisible) {
          return { type: 'projectile', target: playerPos.clone() };
        } else {
          // When invisible, fire in a random direction
          const randomAngle = Math.random() * Math.PI * 2;
          const randomTarget = new THREE.Vector3(
            Math.cos(randomAngle) * 10,
            1.5,
            Math.sin(randomAngle) * 10
          );
          return { type: 'projectile', target: randomTarget };
        }
      }
      return null;
    }

    // Attack timer (faster in rage mode)
    attackTimer -= dt;
    if (attackTimer <= 0) {
      isCasting = true;
      castAnimTimer = 0;
      if (isRaging) {
        attackTimer = 1.0 + Math.random() * 1.5; // 1.0-2.5 sec in rage (avg ~1.75)
      } else {
        attackTimer = 3 + Math.random() * 2; // 3-5 sec normal
      }
    }

    return null;
  }

  function takeDamage(amount) {
    if (isDead) return;
    health -= amount;
    // Flash red or white
    if (bodyMesh) {
      const originalColor = bodyMesh.material.color.getHex();
      const isIce = currentStage === 'arena-congelante';
      bodyMesh.material.color.setHex(isIce ? 0xffffff : 0xff0000);
      setTimeout(() => {
        if (bodyMesh) bodyMesh.material.color.setHex(originalColor);
      }, 150);
    }
    if (health <= 0) {
      health = 0;
      isDead = true;
      Particles.createMageDeathExplosion(GameScene.scene, new THREE.Vector3(0, 2, 0), currentStage);
    }
  }

  function getStaffTip() {
    // World position of staff orb
    const worldPos = new THREE.Vector3();
    staffOrb.getWorldPosition(worldPos);
    return worldPos;
  }

  function tryActivateShield() {
    if (!shieldActive && shieldCooldown <= 0 && !isDead) {
      shieldActive = true;
      shieldTimer = SHIELD_DURATION;
      shieldMesh.visible = true;
      return true;
    }
    return false;
  }

  return {
    init,
    update,
    resetState,
    takeDamage,
    getStaffTip,
    get health() { return health; },
    get maxHealth() { return MAX_HEALTH; },
    get isDead() { return isDead; },
    get isRaging() { return isRaging; },
    get rageTriggered() { return rageTriggered; },
    get shieldActive() { return shieldActive; },
    consumeRageTrigger() { rageTriggered = false; },
    tryActivateShield,
    get group() { return group; },
  };
})();
