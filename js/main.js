/* ============================================
   main.js – Game Loop & State Machine
   ============================================ */

const Game = (() => {
  // States
  const STATE = {
    MENU: 'menu',
    LOADING: 'loading',
    PLAYING: 'playing',
    RESULTS: 'results',
  };

  let currentState = STATE.MENU;
  let lastTime = 0;
  let fpsCounter = 0;
  let fpsTimer = 0;
  let currentFPS = 0;

  // Current stage
  let currentStageId = 'arena-das-chamas';

  // Track if player dealt damage (for 0-star detection)
  let playerDealtDamage = false;

  // Match timer
  let matchTimer = 0;

  // Stage icon mapping
  const STAGE_ICONS = {
    'arena-das-chamas': '🔥',
    'arena-congelante': '❄️',
  };

  // DOM elements
  let startScreen, resultsScreen;
  let resultsButton;
  let resultsTitle, resultsStageName;
  let star1, star2, star3;
  let resultsCoinsAmount, resultsTotalCoins;
  let playerCoinsAmount;
  let stageListEl;

  function init() {
    // Load saved progress
    Progress.load();

    // Get DOM elements
    startScreen = document.getElementById('startScreen');
    resultsScreen = document.getElementById('resultsScreen');
    resultsButton = document.getElementById('resultsButton');
    resultsTitle = document.getElementById('resultsTitle');
    resultsStageName = document.getElementById('resultsStageName');
    star1 = document.getElementById('star1');
    star2 = document.getElementById('star2');
    star3 = document.getElementById('star3');
    resultsCoinsAmount = document.getElementById('resultsCoinsAmount');
    resultsTotalCoins = document.getElementById('resultsTotalCoins');
    playerCoinsAmount = document.getElementById('playerCoinsAmount');
    stageListEl = document.getElementById('stageList');

    // Initialize scene
    GameScene.init();
    GameCamera.init();
    Enemy.init(GameScene.scene);
    HUD.init();
    Crosshair.init();

    // Button handlers
    resultsButton.addEventListener('click', returnToMenu);

    // Render the start screen stage cards
    renderStartScreen();

    // Start render loop (renders menu background too)
    requestAnimationFrame(gameLoop);

    console.log('[Game] Initialized');
  }

  function renderStartScreen() {
    // Update coins
    playerCoinsAmount.textContent = Progress.getCoins();

    // Build stage cards
    stageListEl.innerHTML = '';
    const stages = Stages.getAllStages();

    stages.forEach(stage => {
      const isUnlocked = Progress.isStageUnlocked(stage.id);
      const stars = Progress.getStageStars(stage.id);
      const timePlayed = Progress.getStageTimePlayed(stage.id);
      const icon = STAGE_ICONS[stage.id] || '⚔️';

      const card = document.createElement('div');
      card.className = 'stage-card' + (isUnlocked ? '' : ' locked');

      // Stars HTML
      let starsHtml = '';
      for (let i = 0; i < 3; i++) {
        if (i < stars) {
          starsHtml += '<span class="star-filled">★</span>';
        } else {
          starsHtml += '<span class="star-empty">☆</span>';
        }
      }

      // Time played formatted
      const timeStr = formatTime(timePlayed);

      if (isUnlocked) {
        card.innerHTML = `
          <span class="stage-card-icon">${icon}</span>
          <div class="stage-card-name">${stage.name}</div>
          <div class="stage-card-desc">${stage.description}</div>
          <div class="stage-card-stars">${starsHtml}</div>
          <div class="stage-card-time">${timePlayed > 0 ? '⏱ ' + timeStr : ''}</div>
          <button class="stage-card-btn" data-stage-id="${stage.id}">PLAY</button>
        `;
      } else {
        card.innerHTML = `
          <span class="stage-card-icon">🔒</span>
          <div class="stage-card-name">${stage.name}</div>
          <div class="stage-card-desc">${stage.description}</div>
          <span class="stage-card-lock">LOCKED</span>
        `;
      }

      stageListEl.appendChild(card);
    });

    // Bind play buttons
    stageListEl.querySelectorAll('.stage-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stageId = e.target.dataset.stageId;
        currentStageId = stageId;
        startGame(e.target);
      });
    });
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function startGame(buttonEl) {
    if (currentState !== STATE.MENU) return;
    currentState = STATE.LOADING;

    // Show loading on the clicked button
    if (buttonEl) {
      buttonEl.textContent = 'LOADING...';
      buttonEl.disabled = true;
    }

    // Initialize webcam tracking (only first time)
    if (!Tracking.isInitialized) {
      await Tracking.init();
    }

    // Hide start screen, show HUD
    startScreen.style.display = 'none';
    HUD.show();

    // Reset game state
    resetGameState();

    currentState = STATE.PLAYING;
    console.log(`[Game] Started stage: ${currentStageId}`);
  }

  function resetGameState() {
    Player.reset();
    Enemy.resetState();
    GameCamera.reset();
    Controls.reset();
    Projectiles.clearAll(GameScene.scene);
    Particles.clearAll();
    playerDealtDamage = false;
    matchTimer = 0;
  }

  function returnToMenu() {
    resultsScreen.style.display = 'none';
    HUD.hide();
    startScreen.style.display = 'flex';
    currentState = STATE.MENU;

    // Re-render start screen with updated progress
    renderStartScreen();
  }

  function endMatch(isVictory) {
    currentState = STATE.RESULTS;
    HUD.hide();

    // Save time played
    Progress.addStageTimePlayed(currentStageId, matchTimer);

    const stage = Stages.getStage(currentStageId);
    const enemyHealthPct = Enemy.health / Enemy.maxHealth;

    // Calculate stars
    const stars = Stages.calculateStars(
      Player.isDead,
      Enemy.isDead,
      enemyHealthPct,
      playerDealtDamage
    );

    // Update progress (only upgrades, returns delta coins)
    const coinsEarned = Progress.updateStage(currentStageId, stars, stage);
    // If no upgrade happened, still show what they'd earn for this run
    const displayCoins = coinsEarned > 0
      ? coinsEarned
      : Stages.calculateCoins(stars, stage);

    // Show results screen
    showResults(isVictory, stage, stars, displayCoins, coinsEarned > 0);
  }

  function showResults(isVictory, stage, stars, displayCoins, isNewRecord) {
    // Title
    resultsTitle.textContent = isVictory ? 'VICTORY!' : 'DEFEATED';
    resultsTitle.className = isVictory ? 'victory' : 'defeat';

    // Stage name
    resultsStageName.textContent = stage.name;

    // Reset stars
    const starEls = [star1, star2, star3];
    starEls.forEach(el => {
      el.textContent = '☆';
      el.classList.remove('filled');
    });

    // Fill stars with sequential animation
    for (let i = 0; i < stars; i++) {
      setTimeout(() => {
        starEls[i].textContent = '★';
        starEls[i].classList.add('filled');
      }, 400 + i * 350);
    }

    // Coins
    resultsCoinsAmount.textContent = `+${displayCoins}`;
    const totalCoins = Progress.getCoins();
    resultsTotalCoins.textContent = `Total: ${totalCoins} moedas`;

    // Show screen
    resultsScreen.style.display = 'flex';
  }

  // Called externally when player damages enemy
  function notifyPlayerDealtDamage() {
    playerDealtDamage = true;
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
      case STATE.RESULTS:
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
    // Track match time
    matchTimer += dt;

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
      endMatch(false);
    }

    if (Enemy.isDead) {
      // Small delay before showing results (let death animation play)
      currentState = STATE.RESULTS;
      HUD.hide();
      // Save time played even before the delay
      Progress.addStageTimePlayed(currentStageId, matchTimer);
      matchTimer = 0; // Prevent double-save in endMatch
      setTimeout(() => {
        playerDealtDamage = true; // Enemy is dead, player definitely dealt damage
        const stage = Stages.getStage(currentStageId);
        const stars = Stages.calculateStars(false, true, 0, true);
        const coinsEarned = Progress.updateStage(currentStageId, stars, stage);
        const displayCoins = coinsEarned > 0 ? coinsEarned : Stages.calculateCoins(stars, stage);
        showResults(true, stage, stars, displayCoins, coinsEarned > 0);
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
    notifyPlayerDealtDamage,
  };
})();
