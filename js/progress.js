/* ============================================
   progress.js – Player Progress Persistence
   ============================================ */

const Progress = (() => {
  const STORAGE_KEY = 'megablaster_progress';

  // In-memory state
  let data = null;

  function getDefaultData() {
    // Build default progress from stage registry
    const stages = {};
    Stages.getAllStages().forEach(stage => {
      stages[stage.id] = {
        stars: 0,
        timePlayed: 0, // seconds
        unlocked: stage.unlocked || false,
      };
    });
    return { coins: 0, stages };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        data = JSON.parse(raw);
        // Ensure any new stages are present in saved data
        Stages.getAllStages().forEach(stage => {
          if (!data.stages[stage.id]) {
            data.stages[stage.id] = {
              stars: 0,
              timePlayed: 0,
              unlocked: stage.unlocked || false,
            };
          }
          // Ensure timePlayed exists for old saves
          if (data.stages[stage.id].timePlayed === undefined) {
            data.stages[stage.id].timePlayed = 0;
          }
        });
      } else {
        data = getDefaultData();
      }
    } catch (e) {
      console.warn('[Progress] Failed to load, resetting:', e);
      data = getDefaultData();
    }
    console.log('[Progress] Loaded:', data);
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Progress] Failed to save:', e);
    }
  }

  function getCoins() {
    return data ? data.coins : 0;
  }

  function addCoins(amount) {
    if (!data) return;
    data.coins += amount;
    save();
  }

  function getStageStars(stageId) {
    if (!data || !data.stages[stageId]) return 0;
    return data.stages[stageId].stars;
  }

  function getStageTimePlayed(stageId) {
    if (!data || !data.stages[stageId]) return 0;
    return data.stages[stageId].timePlayed || 0;
  }

  function addStageTimePlayed(stageId, seconds) {
    if (!data || !data.stages[stageId]) return;
    data.stages[stageId].timePlayed += seconds;
    save();
  }

  /**
   * Update a stage's progress after a match.
   * Only upgrades stars (never downgrades).
   * Returns the NEW coins earned (delta coins, not total).
   */
  function updateStage(stageId, newStars, stage) {
    if (!data) return 0;

    const saved = data.stages[stageId];
    if (!saved) return 0;

    const oldStars = saved.stars;
    if (newStars <= oldStars) return 0; // No upgrade

    // Calculate delta coins: only pay the difference
    const oldCoins = Stages.calculateCoins(oldStars, stage);
    const newCoins = Stages.calculateCoins(newStars, stage);
    const deltaCoins = newCoins - oldCoins;

    saved.stars = newStars;
    data.coins += deltaCoins;
    save();

    return deltaCoins;
  }

  function isStageUnlocked(stageId) {
    if (!data || !data.stages[stageId]) return false;
    return data.stages[stageId].unlocked;
  }

  function unlockStage(stageId) {
    if (!data) return;
    if (!data.stages[stageId]) {
      data.stages[stageId] = { stars: 0, timePlayed: 0, unlocked: true };
    } else {
      data.stages[stageId].unlocked = true;
    }
    save();
  }

  function getData() {
    return data;
  }

  function reset() {
    data = getDefaultData();
    save();
    console.log('[Progress] Reset to defaults');
  }

  return {
    load,
    save,
    getCoins,
    addCoins,
    getStageStars,
    getStageTimePlayed,
    addStageTimePlayed,
    updateStage,
    isStageUnlocked,
    unlockStage,
    getData,
    reset,
  };
})();
