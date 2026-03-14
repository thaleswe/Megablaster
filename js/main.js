/* ============================================
   main.js – Game Loop & State Machine
   ============================================ */

const Game = (() => {
  // States
  const STATE = {
    MENU: 'menu',
    LOADING: 'loading',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    VICTORY: 'victory',
  };

  let currentState = STATE.MENU;
  let lastTime = 0;
  let fpsCounter = 0;
  let fpsTimer = 0;
  let currentFPS = 0;

  // DOM elements
  let startScreen, gameOverScreen, victoryScreen;
  let startButton, retryButton, playAgainButton;

  function init() {
    // Get DOM elements
    startScreen = document.getElementById('startScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    victoryScreen = document.getElementById('victoryScreen');
    startButton = document.getElementById('startButton');
    retryButton = document.getElementById('retryButton');
    playAgainButton = document.getElementById('playAgainButton');

    // Initialize scene
    GameScene.init();
    GameCamera.init();
    Enemy.init(GameScene.scene);
    HUD.init();
    Crosshair.init();

    // Button handlers
    startButton.addEventListener('click', startGame);
    retryButton.addEventListener('click', restartGame);
    playAgainButton.addEventListener('click', restartGame);

    // Start render loop (renders menu background too)
    requestAnimationFrame(gameLoop);

    console.log('[Game] Initialized');
  }

  async function startGame() {
    if (currentState !== STATE.MENU) return;
    currentState = STATE.LOADING;
    startButton.textContent = 'LOADING...';
    startButton.disabled = true;

    // Initialize webcam tracking
    await Tracking.init();

    // Hide start screen, show HUD
    startScreen.style.display = 'none';
    HUD.show();

    // Reset game state
    resetGameState();

    currentState = STATE.PLAYING;
    console.log('[Game] Started!');
  }

  function resetGameState() {
    Player.reset();
    Enemy.resetState();
    GameCamera.reset();
    Controls.reset();
    Projectiles.clearAll(GameScene.scene);
    Particles.clearAll();
  }

  function restartGame() {
    gameOverScreen.style.display = 'none';
    victoryScreen.style.display = 'none';
    HUD.show();
    resetGameState();
    currentState = STATE.PLAYING;
  }

  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    // Delta time
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = timestamp;

    // FPS counter
    fpsCounter++;
    fpsTimer += dt;
    if (fpsTimer >= 1) {
      currentFPS = fpsCounter;
      fpsCounter = 0;
      fpsTimer = 0;
    }

    // State-based update
    switch (currentState) {
      case STATE.MENU:
      case STATE.LOADING:
        updateMenu(dt);
        break;
      case STATE.PLAYING:
        updatePlaying(dt);
        break;
      case STATE.GAME_OVER:
      case STATE.VICTORY:
        // Still render the scene for background
        updatePassive(dt);
        break;
    }

    // Always render
    GameScene.render(GameCamera.camera);
  }

  function updateMenu(dt) {
    // Slow rotate camera around arena for menu background
    const time = lastTime * 0.0001;
    if (GameCamera.camera) {
      GameCamera.camera.position.set(
        Math.cos(time) * 12,
        5,
        Math.sin(time) * 12
      );
      GameCamera.camera.lookAt(0, 1.5, 0);
    }
  }

  function updatePlaying(dt) {
    // 1. Process tracking → controls
    Controls.update(dt);

    // 2. Update player state (health, powers, invisibility)
    Player.update(dt);

    // 3. Update camera/orbit from controls
    GameCamera.update(
      dt,
      Controls.state.leanAmount,
      Controls.state.headTiltX,
      Controls.state.headTiltY
    );

    // 4. Get positions
    const playerPos = GameCamera.getPlayerWorldPosition();
    const enemyPos = new THREE.Vector3(0, 1.5, 0);

    // 5. Update enemy AI
    const enemyAction = Enemy.update(dt, playerPos, Player.invisible);
    if (enemyAction && enemyAction.type === 'fireball') {
      // Spawn enemy fireball from staff tip toward player
      const staffTip = Enemy.getStaffTip();
      Projectiles.spawnEnemyFireball(GameScene.scene, staffTip, enemyAction.target);
    }

    // 6. Update projectiles (movement + collision)
    Projectiles.update(dt, GameScene.scene, playerPos, enemyPos);

    // 7. Update powers (reads controls, triggers actions)
    Powers.update(dt);

    // 8. Update crosshair
    Crosshair.update(dt);

    // 9. Update particles
    Particles.update(dt);

    // 10. Update HUD
    HUD.update(dt);
    HUD.updateDebug(
      currentFPS,
      Controls.state.leanAmount,
      Controls.state.rightHandClosed,
      Controls.state.leftHandClosed
    );

    // 11. Invisibility visual effect on scene
    updateInvisibilityVisual();

    // 12. Check win/lose conditions
    if (Player.isDead) {
      currentState = STATE.GAME_OVER;
      HUD.hide();
      gameOverScreen.style.display = 'flex';
    }

    if (Enemy.isDead) {
      currentState = STATE.VICTORY;
      HUD.hide();
      // Small delay before showing victory
      setTimeout(() => {
        victoryScreen.style.display = 'flex';
      }, 1500);
    }
  }

  function updatePassive(dt) {
    // Keep particles and projectiles animating
    Particles.update(dt);
    Enemy.update(dt, GameCamera.getPlayerWorldPosition(), false);
  }

  function updateInvisibilityVisual() {
    // Dim scene slightly when invisible
    if (Player.invisible) {
      GameScene.scene.fog.density = 0.05;
      if (GameScene.pointLight) {
        GameScene.pointLight.intensity = 0.5;
      }
    } else {
      GameScene.scene.fog.density = 0.025;
      if (GameScene.pointLight) {
        GameScene.pointLight.intensity = 1.5;
      }
    }
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    get state() { return currentState; },
  };
})();
