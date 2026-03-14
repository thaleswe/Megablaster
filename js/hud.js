/* ============================================
   hud.js – Health Bars, Indicators, Feedback
   ============================================ */

const HUD = (() => {
  let hudEl;
  let playerHealthFill, enemyHealthFill;
  let fireRingFill, windRingFill;
  let damageFlashEl;
  let invisIndicatorEl, invisCooldownEl;
  let rageModeEl;
  let frozenIndicatorEl, freezeOverlayEl;
  let debugInfoEl, debugLeanEl, debugHandsEl, debugFPSEl;

  const RING_CIRCUMFERENCE = 2 * Math.PI * 45; // Match SVG circle radius=45

  function init() {
    hudEl = document.getElementById('hud');
    playerHealthFill = document.getElementById('playerHealthFill');
    enemyHealthFill = document.getElementById('enemyHealthFill');
    fireRingFill = document.getElementById('fireRingFill');
    windRingFill = document.getElementById('windRingFill');
    damageFlashEl = document.getElementById('damageFlash');
    invisIndicatorEl = document.getElementById('invisIndicator');
    invisCooldownEl = document.getElementById('invisCooldown');
    rageModeEl = document.getElementById('rageMode');
    frozenIndicatorEl = document.getElementById('frozenIndicator');
    freezeOverlayEl = document.getElementById('freezeOverlay');
    debugInfoEl = document.getElementById('debugInfo');
    debugLeanEl = document.getElementById('debugLean');
    debugHandsEl = document.getElementById('debugHands');
    debugFPSEl = document.getElementById('debugFPS');
  }

  function show() {
    hudEl.style.display = 'block';
  }

  function hide() {
    hudEl.style.display = 'none';
  }

  function update(dt) {
    // Player health
    const playerPct = (Player.health / Player.maxHealth) * 100;
    playerHealthFill.style.width = playerPct + '%';

    playerHealthFill.classList.remove('warning', 'critical');
    if (playerPct <= 25) {
      playerHealthFill.classList.add('critical');
    } else if (playerPct <= 50) {
      playerHealthFill.classList.add('warning');
    }

    // Enemy health
    const enemyPct = (Enemy.health / Enemy.maxHealth) * 100;
    enemyHealthFill.style.width = enemyPct + '%';

    // Power rings
    const fireOffset = RING_CIRCUMFERENCE * (1 - Player.fireCharge);
    fireRingFill.style.strokeDashoffset = fireOffset;

    const windOffset = RING_CIRCUMFERENCE * (1 - Player.windCharge);
    windRingFill.style.strokeDashoffset = windOffset;

    // Invisibility
    if (Player.invisible) {
      invisIndicatorEl.style.display = 'block';
      invisCooldownEl.style.display = 'none';
    } else {
      invisIndicatorEl.style.display = 'none';
      if (Player.invisCooldown > 0) {
        invisCooldownEl.style.display = 'block';
        invisCooldownEl.querySelector('span').textContent =
          `👻 COOLDOWN ${Player.invisCooldown.toFixed(1)}s`;
      } else {
        invisCooldownEl.style.display = 'none';
      }
    }

    // Rage mode notification
    if (Enemy.rageTriggered) {
      Enemy.consumeRageTrigger();
      showRageMode();
    }

    // Freeze indicator
    if (frozenIndicatorEl) {
      if (Player.frozen) {
        frozenIndicatorEl.style.display = 'block';
        frozenIndicatorEl.querySelector('span').textContent =
          `❄️ FROZEN ${Player.frozenTimer.toFixed(1)}s`;
      } else {
        frozenIndicatorEl.style.display = 'none';
      }
    }

    // Freeze overlay
    if (freezeOverlayEl) {
      if (Player.frozen) {
        freezeOverlayEl.classList.add('active');
      } else {
        freezeOverlayEl.classList.remove('active');
      }
    }
  }

  function showDamageFlash() {
    damageFlashEl.classList.remove('active');
    // Force reflow to restart animation
    void damageFlashEl.offsetWidth;
    damageFlashEl.classList.add('active');
  }

  function showInvisibility() {
    // Extra visual flash for activation
    invisIndicatorEl.style.display = 'block';
  }

  function updateDebug(fps, lean, rightHand, leftHand) {
    if (debugInfoEl.style.display === 'none') return;
    debugFPSEl.textContent = `FPS: ${fps}`;
    debugLeanEl.textContent = `Lean: ${lean.toFixed(2)}`;
    debugHandsEl.textContent = `R:${rightHand ? 'CLOSED' : 'open'} L:${leftHand ? 'CLOSED' : 'open'}`;
  }

  function showRageMode() {
    // Big centered announcement
    rageModeEl.style.display = 'block';
    rageModeEl.classList.add('rage-announce');
    // After animation, switch to persistent small indicator
    setTimeout(() => {
      rageModeEl.classList.remove('rage-announce');
    }, 2000);
  }

  return {
    init,
    show,
    hide,
    update,
    showDamageFlash,
    showInvisibility,
    updateDebug,
  };
})();
