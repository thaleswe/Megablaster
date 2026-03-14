/* ============================================
   stages.js – Stage Registry & Star/Coin Logic
   ============================================ */

const Stages = (() => {
  // ---- Stage Definitions ----
  // Add new stages here as plain config objects
  const STAGES = [
    {
      id: 'arena-das-chamas',
      name: 'Arena das Chamas',
      description: 'Derrote o mago no centro da arena',
      order: 1,
      boss: { name: 'Mage', maxHealth: 200 },
      rewards: { coinsPerStar: 100 },
      unlocked: true, // Stage 1 always unlocked
    },
    {
      id: 'arena-congelante',
      name: 'Arena Congelante',
      description: 'Derrote o mago do gelo no centro da arena',
      order: 2,
      boss: { name: 'Mago do Gelo', maxHealth: 250 },
      rewards: { coinsPerStar: 150 },
      unlocked: true,
    },
  ];

  function getStage(id) {
    return STAGES.find(s => s.id === id) || null;
  }

  function getAllStages() {
    return [...STAGES].sort((a, b) => a.order - b.order);
  }

  /**
   * Calculate stars earned based on match outcome.
   * @param {boolean} playerDead  - Did the player die?
   * @param {boolean} enemyDead   - Did the enemy die?
   * @param {number}  enemyHealthPct - Enemy health as 0-1 fraction (0 = dead, 1 = full)
   * @param {boolean} dealtDamage - Did the player deal any damage?
   * @returns {number} 0-3 stars
   */
  function calculateStars(playerDead, enemyDead, enemyHealthPct, dealtDamage) {
    if (enemyDead) return 3;
    if (!dealtDamage) return 0;
    if (playerDead && enemyHealthPct <= 0.5) return 2;
    if (playerDead && enemyHealthPct > 0.5) return 1;
    return 0;
  }

  /**
   * Calculate coins earned for a given star count.
   * @param {number} stars   - Stars earned (0-3)
   * @param {object} stage   - Stage config object
   * @returns {number} coins
   */
  function calculateCoins(stars, stage) {
    return stars * stage.rewards.coinsPerStar;
  }

  return {
    getStage,
    getAllStages,
    calculateStars,
    calculateCoins,
  };
})();
