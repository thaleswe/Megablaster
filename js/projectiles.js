/* ============================================
   projectiles.js – Projectile Management
   ============================================ */

const Projectiles = (() => {
  const active = [];

  class Projectile {
    constructor(options) {
      this.type = options.type; // 'enemy_fireball', 'player_fire', 'player_wind'
      this.damage = options.damage || 15;
      this.speed = options.speed || 5;
      this.origin = options.origin.clone();
      this.target = options.target.clone();
      this.position = this.origin.clone();
      this.lifetime = options.lifetime || 5;
      this.age = 0;
      this.alive = true;
      this.radius = options.radius || 0.5;

      // Calculate direction
      this.direction = new THREE.Vector3()
        .subVectors(this.target, this.origin)
        .normalize();

      // Create mesh
      this.createMesh(options);

      // Trail particle system
      this.trail = null;
    }

    createMesh(options) {
      let color, emissive, size;

      switch (this.type) {
        case 'enemy_fireball':
          color = 0xff4400;
          emissive = 0xff2200;
          size = 0.3;
          break;
        case 'player_fire':
          color = 0xff6600;
          emissive = 0xff4400;
          size = 0.25;
          break;
        case 'player_wind':
          color = 0x22ccff;
          emissive = 0x1199dd;
          size = 0.35;
          break;
        default:
          color = 0xffffff;
          emissive = 0xcccccc;
          size = 0.2;
      }

      const geo = new THREE.SphereGeometry(size, 12, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
      });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.position.copy(this.position);

      // Add glow light
      this.light = new THREE.PointLight(emissive, 1.5, 8);
      this.light.position.copy(this.position);

      // Outer glow sphere
      const glowGeo = new THREE.SphereGeometry(size * 2.5, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
      });
      this.glow = new THREE.Mesh(glowGeo, glowMat);
      this.mesh.add(this.glow);
    }

    addToScene(scene) {
      scene.add(this.mesh);
      scene.add(this.light);
    }

    removeFromScene(scene) {
      scene.remove(this.mesh);
      scene.remove(this.light);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.glow.geometry.dispose();
      this.glow.material.dispose();
    }

    update(dt) {
      if (!this.alive) return;

      this.age += dt;

      // Move
      this.position.addScaledVector(this.direction, this.speed * dt);
      this.mesh.position.copy(this.position);
      this.light.position.copy(this.position);

      // Pulse effect
      const pulse = 1 + Math.sin(this.age * 10) * 0.15;
      this.mesh.scale.setScalar(pulse);

      // Check lifetime
      if (this.age > this.lifetime) {
        this.alive = false;
      }

      // Check out of bounds (below floor or too far)
      if (this.position.y < -1 || this.position.length() > 25) {
        this.alive = false;
      }
    }
  }

  function spawnEnemyFireball(scene, origin, target) {
    const proj = new Projectile({
      type: 'enemy_fireball',
      origin: origin,
      target: target,
      speed: Enemy.isRaging ? 10 : 5, // ~1 sec to reach player in rage, normally 2 sec
      damage: Enemy.isRaging ? 22 : 15, // 1.5x damage in rage mode
      lifetime: 5,
      radius: 0.5,
    });
    proj.addToScene(scene);
    active.push(proj);
    return proj;
  }

  function spawnPlayerFire(scene, origin, target, chargeLevel) {
    const damage = Math.round(5 + chargeLevel * 35); // 5-40 damage, proportional to charge
    const proj = new Projectile({
      type: 'player_fire',
      origin: origin,
      target: target,
      speed: 15,
      damage: damage,
      lifetime: 3,
      radius: 0.4,
    });
    proj.addToScene(scene);
    active.push(proj);

    // Fire burst particles at origin
    Particles.createFireball(scene, origin);
    return proj;
  }

  function spawnPlayerWind(scene, origin, target, chargeLevel) {
    const damage = Math.round(3 + chargeLevel * 22); // 3-25 damage, proportional to charge
    const proj = new Projectile({
      type: 'player_wind',
      origin: origin,
      target: target,
      speed: 12,
      damage: damage,
      lifetime: 3,
      radius: 0.6,
    });
    proj.addToScene(scene);
    active.push(proj);

    Particles.createWindBurst(scene, origin);
    return proj;
  }

  function update(dt, scene, playerPos, enemyPos) {
    for (let i = active.length - 1; i >= 0; i--) {
      const proj = active[i];
      proj.update(dt);

      if (!proj.alive) {
        proj.removeFromScene(scene);
        active.splice(i, 1);
        continue;
      }

      // Collision checks
      if (proj.type === 'enemy_fireball') {
        // Check hit on player
        const distToPlayer = proj.position.distanceTo(playerPos);
        if (distToPlayer < proj.radius + 0.8) {
          // Hit player
          proj.alive = false;
          proj.removeFromScene(scene);
          active.splice(i, 1);
          Particles.createHitSparks(scene, proj.position);
          Player.takeDamage(proj.damage);
          HUD.showDamageFlash();
        }
      } else if (proj.type === 'player_fire' || proj.type === 'player_wind') {
        // Check hit on enemy
        const distToEnemy = proj.position.distanceTo(enemyPos);
        if (distToEnemy < proj.radius + 1.0) {
          // Hit enemy
          proj.alive = false;
          proj.removeFromScene(scene);
          active.splice(i, 1);
          Particles.createHitSparks(scene, proj.position);
          Enemy.takeDamage(proj.damage);
        }
      }
    }
  }

  function clearAll(scene) {
    for (const proj of active) {
      proj.removeFromScene(scene);
    }
    active.length = 0;
  }

  return {
    spawnEnemyFireball,
    spawnPlayerFire,
    spawnPlayerWind,
    update,
    clearAll,
  };
})();
