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
  let deathTimer = 0;
  let staffOrb, staffOrbLight;
  let bodyMesh, headMesh, hatMesh, staffMesh;
  let hoverOffset = 0;

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
    const brim = new THREE.Mesh(brimGeo, brimMat);
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

    group.position.set(0, 0, 0);
    scene.add(group);

    resetState();
    return group;
  }

  function resetState() {
    health = MAX_HEALTH;
    attackTimer = 3;
    castAnimTimer = 0;
    isCasting = false;
    isDead = false;
    deathTimer = 0;
    hoverOffset = 0;
    if (group) {
      group.visible = true;
      group.scale.set(1, 1, 1);
      group.position.y = 0;
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

    // Face player
    if (playerPos) {
      const lookTarget = playerPos.clone();
      lookTarget.y = 0;
      group.lookAt(lookTarget);
    }

    // Hover animation
    hoverOffset += dt * 2;
    group.position.y = Math.sin(hoverOffset) * 0.1;

    // Staff orb glow pulsing
    const orbPulse = 0.7 + Math.sin(hoverOffset * 3) * 0.3;
    staffOrb.material.opacity = orbPulse;
    staffOrbLight.intensity = 0.3 + orbPulse * 0.5;

    // Casting animation
    if (isCasting) {
      castAnimTimer += dt;
      // Orb grows brighter during cast
      const castProgress = castAnimTimer / 1.0; // 1 sec cast time
      staffOrb.scale.setScalar(1 + castProgress * 1.5);
      staffOrbLight.intensity = 1 + castProgress * 3;
      staffOrb.material.color.setHex(0xff6600);

      if (castAnimTimer >= 1.0) {
        // Fire!
        isCasting = false;
        castAnimTimer = 0;
        staffOrb.scale.setScalar(1);
        staffOrb.material.color.setHex(0xff4400);

        // Return fire command with target position
        if (!playerInvisible) {
          return { type: 'fireball', target: playerPos.clone() };
        } else {
          // When invisible, fire in a random direction
          const randomAngle = Math.random() * Math.PI * 2;
          const randomTarget = new THREE.Vector3(
            Math.cos(randomAngle) * 10,
            1.5,
            Math.sin(randomAngle) * 10
          );
          return { type: 'fireball', target: randomTarget };
        }
      }
      return null;
    }

    // Attack timer
    attackTimer -= dt;
    if (attackTimer <= 0) {
      isCasting = true;
      castAnimTimer = 0;
      attackTimer = 3 + Math.random() * 2; // 3-5 sec between attacks
    }

    return null;
  }

  function takeDamage(amount) {
    if (isDead) return;
    health -= amount;
    // Flash red
    if (bodyMesh) {
      const originalColor = bodyMesh.material.color.getHex();
      bodyMesh.material.color.setHex(0xff0000);
      setTimeout(() => {
        if (bodyMesh) bodyMesh.material.color.setHex(originalColor);
      }, 150);
    }
    if (health <= 0) {
      health = 0;
      isDead = true;
      Particles.createMageDeathExplosion(GameScene.scene, new THREE.Vector3(0, 2, 0));
    }
  }

  function getStaffTip() {
    // World position of staff orb
    const worldPos = new THREE.Vector3();
    staffOrb.getWorldPosition(worldPos);
    return worldPos;
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
    get group() { return group; },
  };
})();
