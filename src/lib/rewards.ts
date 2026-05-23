// Central reward economy. Adjust here to retune the whole game.
//
// Coins are the spendable currency (plant trees, water trees).
// Tree XP is the visible reward — it grows the newest non-ancient tree.
//
// NOTE: Challenge rewards are intentionally large and vary by difficulty level.
// Template challenges (dopamine-detox, spiritual-recharge, etc.) use per-level
// values defined in src/data/challengeTemplates.ts.  The values below are the
// fallback for legacy / custom challenges only.

export const REWARDS = {
  task_complete: { coins: 3, xp: 2 },
  workout_logged: { coins: 8, xp: 6 },
  // Custom / legacy challenge defaults — templates override these
  challenge_daily: { coins: 10, xp: 5 },
  challenge_complete_bonus: { coins: 150, xp: 50 },
  // Study room: per 5 minutes of the room's configured duration
  study_room_per_5min: { coins: 1, xp: 1 },
} as const

// Water action — turns coins into XP at a fixed exchange rate.
export const WATER_COST_COINS = 5
export const WATER_XP_GAIN = 10
