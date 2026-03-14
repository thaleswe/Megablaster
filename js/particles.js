/* ============================================
   particles.js – Particle Effects System
   ============================================ */

const Particles = (() => {
  const systems = [];

  // Simple particle system class
  class ParticleSystem {
    constructor(options) {
      this.count = options.count || 50;
      this.lifetime = options.lifetime || 1.0;
      this.speed = options.speed || 2.0;
      this.size = options.size || 0.3;
      this.color = options.color || new THREE.Color(1, 0.5, 0);
      this.endColor = options.endColor || new THREE.Color(1, 0, 0);
      this.gravity = options.gravity || 0;
      this.spread = options.spread || 1;
      this.position = options.position || new THREE.Vector3();
      this.direction = options.direction || null;
      this.loop = options.loop || false;
      this.active = true;
      this.elapsed = 0;

      // Particle data
      this.ages = new Float32Array(this.count);
      this.velocities = [];
      this.positions3 = new Float32Array(this.count * 3);
      this.colors3 = new Float32Array(this.count * 3);
      this.sizes = new Float32Array(this.count);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.positions3, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(this.colors3, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

      const mat = new THREE.PointsMaterial({
        size: this.size,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      this.mesh = new THREE.Points(geo, mat);

      // Initialize particles
      for (let i = 0; i < this.count; i++) {
        this.resetParticle(i);
      }
    }

    resetParticle(i) {
      this.ages[i] = this.loop ? Math.random() * this.lifetime : 0;

      this.positions3[i * 3] = this.position.x + (Math.random() - 0.5) * this.spread * 0.3;
      this.positions3[i * 3 + 1] = this.position.y + (Math.random() - 0.5) * this.spread * 0.3;
      this.positions3[i * 3 + 2] = this.position.z + (Math.random() - 0.5) * this.spread * 0.3;

      if (this.direction) {
        const dir = this.direction.clone().normalize();
        this.velocities[i] = new THREE.Vector3(
          dir.x + (Math.random() - 0.5) * this.spread,
          dir.y + (Math.random() - 0.5) * this.spread,
          dir.z + (Math.random() - 0.5) * this.spread
        ).multiplyScalar(this.speed * (0.5 + Math.random() * 0.5));
      } else {
        this.velocities[i] = new THREE.Vector3(
          (Math.random() - 0.5) * this.spread,
          Math.random() * this.spread,
          (Math.random() - 0.5) * this.spread
        ).multiplyScalar(this.speed * (0.3 + Math.random() * 0.7));
      }
    }

    update(dt) {
      if (!this.active) return false;

      this.elapsed += dt;
      let allDead = true;

      for (let i = 0; i < this.count; i++) {
        this.ages[i] += dt;

        if (this.ages[i] >= this.lifetime) {
          if (this.loop) {
            this.resetParticle(i);
          } else {
            this.sizes[i] = 0;
            continue;
          }
        }

        allDead = false;
        const t = this.ages[i] / this.lifetime;

        // Update position
        const vel = this.velocities[i];
        this.positions3[i * 3] += vel.x * dt;
        this.positions3[i * 3 + 1] += vel.y * dt + this.gravity * dt;
        this.positions3[i * 3 + 2] += vel.z * dt;

        // Color interpolation
        const c = new THREE.Color().lerpColors(this.color, this.endColor, t);
        this.colors3[i * 3] = c.r;
        this.colors3[i * 3 + 1] = c.g;
        this.colors3[i * 3 + 2] = c.b;

        // Size fade out
        this.sizes[i] = this.size * (1 - t * 0.8);
      }

      this.mesh.geometry.attributes.position.needsUpdate = true;
      this.mesh.geometry.attributes.color.needsUpdate = true;
      this.mesh.geometry.attributes.size.needsUpdate = true;

      if (!this.loop && allDead) {
        this.active = false;
      }
      return this.active;
    }

    dispose(scene) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }

  function createExplosion(scene, position, color1, color2, count, speed, lifetime) {
    const ps = new ParticleSystem({
      count: count || 40,
      lifetime: lifetime || 0.8,
      speed: speed || 4,
      size: 0.3,
      color: color1 || new THREE.Color(1, 0.6, 0),
      endColor: color2 || new THREE.Color(1, 0, 0),
      spread: 2,
      gravity: -2,
      position: position.clone(),
      loop: false,
    });
    scene.add(ps.mesh);
    systems.push(ps);
    return ps;
  }

  function createTrail(scene, position, direction, color1, color2) {
    const ps = new ParticleSystem({
      count: 20,
      lifetime: 0.5,
      speed: 1,
      size: 0.2,
      color: color1 || new THREE.Color(1, 0.6, 0),
      endColor: color2 || new THREE.Color(0.5, 0, 0),
      spread: 0.5,
      gravity: -1,
      position: position.clone(),
      direction: direction,
      loop: true,
    });
    scene.add(ps.mesh);
    systems.push(ps);
    return ps;
  }

  function createHitSparks(scene, position) {
    return createExplosion(
      scene, position,
      new THREE.Color(1, 1, 0.8),
      new THREE.Color(1, 0.5, 0),
      30, 6, 0.5
    );
  }

  function createFireball(scene, position) {
    return createExplosion(
      scene, position,
      new THREE.Color(1, 0.4, 0),
      new THREE.Color(0.5, 0, 0),
      25, 3, 0.6
    );
  }

  function createWindBurst(scene, position) {
    return createExplosion(
      scene, position,
      new THREE.Color(0.5, 0.9, 1),
      new THREE.Color(0, 0.3, 0.8),
      30, 5, 0.7
    );
  }

  function createMageDeathExplosion(scene, position) {
    // Big dramatic explosion
    createExplosion(scene, position, new THREE.Color(1, 0.3, 0), new THREE.Color(0.5, 0, 0.5), 80, 8, 1.5);
    createExplosion(scene, position.clone().add(new THREE.Vector3(0, 1, 0)),
      new THREE.Color(1, 1, 0.5), new THREE.Color(0.8, 0, 0), 50, 6, 1.2);
  }

  function update(dt) {
    for (let i = systems.length - 1; i >= 0; i--) {
      const alive = systems[i].update(dt);
      if (!alive) {
        systems[i].dispose(GameScene.scene);
        systems.splice(i, 1);
      }
    }
  }

  function clearAll() {
    for (const ps of systems) {
      ps.dispose(GameScene.scene);
    }
    systems.length = 0;
  }

  return {
    update,
    clearAll,
    createExplosion,
    createTrail,
    createHitSparks,
    createFireball,
    createWindBurst,
    createMageDeathExplosion,
    ParticleSystem,
  };
})();
