/* ============================================
   scene.js – Three.js Scene Setup
   ============================================ */

const GameScene = (() => {
  let scene, renderer, ambientLight, dirLight, pointLight;
  let envGroup;

  function init() {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.025);

    // Renderer
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(0.75);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Lighting
    ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0x8888cc, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Point light in center (mage area)
    pointLight = new THREE.PointLight(0xff4400, 1.5, 30);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // Initial build
    buildEnvironment('arena-das-chamas');

    // Window resize
    window.addEventListener('resize', onResize);

    return { scene, renderer };
  }

  function buildEnvironment(stageId) {
    if (envGroup) {
      scene.remove(envGroup);
      // Ideally dispose geometries/materials here for memory, but will skip for simplicity
    }
    envGroup = new THREE.Group();
    scene.add(envGroup);

    const isIce = stageId === 'arena-congelante';

    if (isIce) {
      scene.fog.color.setHex(0x0a1020);
      scene.fog.density = 0.025;
      scene.background = new THREE.Color(0x0a1020); // Dark icy night
      ambientLight.color.setHex(0x334466);
      ambientLight.intensity = 0.6;
      dirLight.color.setHex(0x6688bb);
      pointLight.color.setHex(0x22bbff);
      pointLight.intensity = 1.8;
    } else {
      scene.fog.color.setHex(0x0a0a1a);
      scene.fog.density = 0.025;
      scene.background = new THREE.Color(0x0a0a1a); // Night sky
      ambientLight.color.setHex(0x334466);
      ambientLight.intensity = 0.6;
      dirLight.color.setHex(0x8888cc);
      pointLight.color.setHex(0xff4400);
    }

    createArena(stageId, isIce);
    createBackground(stageId, isIce);
  }

  function createArena(stageId, isIce) {
    // Main arena floor - circular
    const floorRadius = 18;
    const floorGeo = new THREE.CircleGeometry(floorRadius, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isIce ? 0xb0c8e0 : 0x1a1a2e,
      roughness: isIce ? 0.35 : 0.8,
      metalness: isIce ? 0.45 : 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    envGroup.add(floor);

    // Rune circles on floor
    const runeRadii = [5, 10, 15];
    runeRadii.forEach((r, i) => {
      const ringGeo = new THREE.RingGeometry(r - 0.05, r + 0.05, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isIce ? (i === 0 ? 0x11ccff : 0x6699cc) : (i === 0 ? 0xff4400 : 0x333366),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3 + (i === 0 ? 0.3 : 0),
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01 + i * 0.005;
      envGroup.add(ring);
    });

    // Rune marks (small glowing markers on inner circle)
    const markerCount = 12;
    for (let i = 0; i < markerCount; i++) {
      const ang = (i / markerCount) * Math.PI * 2;
      const markerGeo = new THREE.PlaneGeometry(0.3, 0.3);
      const markerMat = new THREE.MeshBasicMaterial({
        color: isIce ? 0x00ccff : 0xff6622,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(Math.cos(ang) * 5, 0.02, Math.sin(ang) * 5);
      marker.rotation.x = -Math.PI / 2;
      marker.rotation.z = ang;
      envGroup.add(marker);
    }

    // Arena boundary pillars
    const pillarCount = 8;
    for (let i = 0; i < pillarCount; i++) {
      const ang = (i / pillarCount) * Math.PI * 2;
      const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: isIce ? 0x7aaabb : 0x222244,
        roughness: isIce ? 0.3 : 0.6,
        metalness: isIce ? 0.6 : 0.4,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(Math.cos(ang) * 16, 2, Math.sin(ang) * 16);
      pillar.castShadow = true;
      envGroup.add(pillar);

      // Glowing top
      const topGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const topMat = new THREE.MeshBasicMaterial({ color: isIce ? 0x00ffff : 0x6644ff });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(Math.cos(ang) * 16, 4.2, Math.sin(ang) * 16);
      envGroup.add(top);
    }
  }

  function createBackground(stageId, isIce) {
    // Background particles (Stars or Snow)
    const mapGeo = new THREE.BufferGeometry();
    const mapCount = 2000;
    const positions = new Float32Array(mapCount * 3);
    const colors = new Float32Array(mapCount * 3);

    for (let i = 0; i < mapCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = 80 + Math.random() * 40;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 10;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      if (isIce) {
        // Snowflakes: white to light blue
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1.0;
      } else {
        // Stars
        const brightness = 0.3 + Math.random() * 0.7;
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness * (0.8 + Math.random() * 0.2);
      }
    }

    mapGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    mapGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mapMat = new THREE.PointsMaterial({
      size: isIce ? 0.9 : 0.5,
      vertexColors: true,
      transparent: true,
      opacity: isIce ? 0.75 : 0.8,
    });

    const mapPoints = new THREE.Points(mapGeo, mapMat);
    envGroup.add(mapPoints);
  }

  function onResize() {
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (GameCamera && GameCamera.camera) {
      GameCamera.camera.aspect = window.innerWidth / window.innerHeight;
      GameCamera.camera.updateProjectionMatrix();
    }
  }

  function render(camera) {
    renderer.render(scene, camera);
  }

  return {
    init,
    buildEnvironment,
    render,
    get scene() { return scene; },
    get renderer() { return renderer; },
    get pointLight() { return pointLight; },
  };
})();
