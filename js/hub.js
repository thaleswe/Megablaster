/* ============================================
   hub.js – Stage Hub / Start Screen Logic
   ============================================ */

const Hub = (() => {
  // Stage icon mapping
  const STAGE_ICONS = {
    'arena-das-chamas': '🔥',
    'arena-congelante': '❄️',
  };

  let playerCoinsAmount, stageListEl;

  function init() {
    // Load saved progress
    Progress.load();

    // DOM refs
    playerCoinsAmount = document.getElementById('playerCoinsAmount');
    stageListEl = document.getElementById('stageList');

    // Render
    renderStageCards();

    console.log('[Hub] Initialized');
  }

  function renderStageCards() {
    // Update coins
    playerCoinsAmount.textContent = Progress.getCoins();

    // Build stage cards
    stageListEl.innerHTML = '';
    const stages = Stages.getAllStages();

    stages.forEach(stage => {
      const isUnlocked = Progress.isStageUnlocked(stage.id) || stage.unlocked;
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

    // Bind play buttons → navigate to game page
    stageListEl.querySelectorAll('.stage-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stageId = e.target.dataset.stageId;
        window.location.href = `game.html?stage=${stageId}`;
      });
    });
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();
